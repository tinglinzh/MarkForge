import { app, ipcMain } from 'electron'
import { mkdir, readFile, writeFile, rename, rm } from 'fs/promises'
import { createHash } from 'crypto'
import { join } from 'path'

/**
 * Local History (Timeline).
 *
 * Mirrors VS Code's "Local History": every save snapshots the file's content
 * into the app's userData directory, keyed by workspace root + relative path.
 * The renderer can list versions, read a version's content, and restore one.
 *
 * Snapshots live outside the workspace so they never pollute the user's folder:
 *   userData/local-history/<sha1(root)>/<sha1(relPath)>/
 *     ├─ entries.json          index (newest first) + the source path
 *     └─ <id>.snapshot         raw content for each version
 *
 * This module exposes its recording helper so the workspace IPC can snapshot on
 * every write, and migrate / drop history when files are renamed or deleted.
 */

const HISTORY_DIRNAME = 'local-history'
/** Keep at most this many versions per file; oldest are pruned. */
const MAX_ENTRIES_PER_FILE = 60
/**
 * Coalesce window (ms). A save landing within this long after the newest
 * version updates that version in place instead of adding a new one, so a burst
 * of saves during one writing session collapses into a single entry. VS Code's
 * `localHistory.mergeWindow` does the same (its default is 10s); we use a longer
 * window because writers hit ⌘S far more often than they want versions. Set to
 * 0 to record every distinct save.
 */
const MERGE_WINDOW_MS = 5 * 60 * 1000

export type HistoryEntry = {
  /** Unique, sortable id (`<timestamp>-<counter>`). */
  id: string
  /** Epoch milliseconds the snapshot was taken. */
  timestamp: number
  /** Byte length of the snapshot content. */
  size: number
}

type HistoryIndex = {
  /** Workspace root the file belongs to (for debugging / recovery). */
  root: string
  /** Path relative to the root, posix style. */
  path: string
  /** Versions, newest first. */
  entries: HistoryEntry[]
}

function sha1(value: string): string {
  return createHash('sha1').update(value).digest('hex')
}

function historyRoot(): string {
  return join(app.getPath('userData'), HISTORY_DIRNAME)
}

/** Directory holding one file's version history. */
function fileHistoryDir(root: string, relativePath: string): string {
  return join(historyRoot(), sha1(root), sha1(relativePath))
}

function indexPath(dir: string): string {
  return join(dir, 'entries.json')
}

async function readIndex(dir: string): Promise<HistoryIndex | null> {
  try {
    const parsed = JSON.parse(await readFile(indexPath(dir), 'utf-8'))
    if (!parsed || !Array.isArray(parsed.entries)) return null
    return parsed as HistoryIndex
  } catch {
    return null
  }
}

async function writeIndex(dir: string, index: HistoryIndex): Promise<void> {
  await writeFile(indexPath(dir), JSON.stringify(index, null, 2), 'utf-8')
}

/**
 * Record a snapshot of `content` for a file. No-op when the content is
 * identical to the most recent version (dedup). Saves within
 * {@link MERGE_WINDOW_MS} of the newest version overwrite it in place rather
 * than adding a new entry (coalescing a burst of saves). Prunes the oldest
 * versions beyond {@link MAX_ENTRIES_PER_FILE}. Failures are swallowed —
 * history must never block or break a save.
 */
export async function recordHistory(
  root: string,
  relativePath: string,
  content: string,
  options: { merge?: boolean } = {}
): Promise<void> {
  const { merge = true } = options
  try {
    const dir = fileHistoryDir(root, relativePath)
    await mkdir(dir, { recursive: true })
    const index = (await readIndex(dir)) ?? { root, path: relativePath, entries: [] }
    index.root = root
    index.path = relativePath

    const timestamp = Date.now()
    const newest = index.entries[0]

    // Dedup: skip if the newest version already holds this exact content.
    if (newest) {
      const previous = await readSnapshot(dir, newest.id).catch(() => null)
      if (previous === content) return

      // Merge window: keep refreshing the newest entry until it settles.
      if (merge && timestamp - newest.timestamp < MERGE_WINDOW_MS) {
        await writeFile(join(dir, `${newest.id}.snapshot`), content, 'utf-8')
        newest.timestamp = timestamp
        newest.size = Buffer.byteLength(content, 'utf-8')
        await writeIndex(dir, index)
        return
      }
    }

    const id = `${timestamp}-${index.entries.length}`
    await writeFile(join(dir, `${id}.snapshot`), content, 'utf-8')
    index.entries.unshift({ id, timestamp, size: Buffer.byteLength(content, 'utf-8') })

    // Prune oldest snapshots beyond the cap.
    const pruned = index.entries.splice(MAX_ENTRIES_PER_FILE)
    await Promise.all(pruned.map((entry) => rm(join(dir, `${entry.id}.snapshot`), { force: true })))

    await writeIndex(dir, index)
  } catch {
    // Best-effort: never surface history failures to the caller.
  }
}

async function readSnapshot(dir: string, id: string): Promise<string> {
  return readFile(join(dir, `${id}.snapshot`), 'utf-8')
}

async function listHistory(root: string, relativePath: string): Promise<HistoryEntry[]> {
  const index = await readIndex(fileHistoryDir(root, relativePath))
  return index?.entries ?? []
}

export async function readHistoryVersion(
  root: string,
  relativePath: string,
  id: string
): Promise<string> {
  return readSnapshot(fileHistoryDir(root, relativePath), id)
}

/** Move a file's history alongside a rename / move. Best-effort. */
export async function moveHistory(root: string, fromRel: string, toRel: string): Promise<void> {
  if (fromRel === toRel) return
  try {
    const fromDir = fileHistoryDir(root, fromRel)
    const toDir = fileHistoryDir(root, toRel)
    const index = await readIndex(fromDir)
    if (!index) return
    await rm(toDir, { recursive: true, force: true })
    await rename(fromDir, toDir)
    index.path = toRel
    await writeIndex(toDir, index)
  } catch {
    // Best-effort.
  }
}

/** Drop a file's history when it is deleted. Best-effort. */
export async function dropHistory(root: string, relativePath: string): Promise<void> {
  try {
    await rm(fileHistoryDir(root, relativePath), { recursive: true, force: true })
  } catch {
    // Best-effort.
  }
}

export function registerHistoryIpc(): void {
  ipcMain.handle('history:list', (_event, root: string, relativePath: string) =>
    listHistory(root, relativePath)
  )
  ipcMain.handle('history:read', (_event, root: string, relativePath: string, id: string) =>
    readHistoryVersion(root, relativePath, id)
  )
}
