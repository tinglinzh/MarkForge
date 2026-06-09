import { app, dialog, ipcMain, BrowserWindow } from 'electron'
import { mkdir, readFile, readdir, writeFile, access, rename, rm } from 'fs/promises'
import type { Dirent } from 'fs'
import { basename, dirname, join, relative, sep } from 'path'
import { recordHistory, readHistoryVersion, moveHistory, dropHistory } from './history'

/**
 * Local Workspace IPC.
 *
 * Owns privileged filesystem access for the local workspace feature: opening
 * folders, the managed "Playground" scratch workspace, walking for Markdown
 * files and directories, and reading / creating / renaming / moving / deleting
 * entries. The renderer never touches `fs` directly — it talks to these
 * channels via `window.api.workspace`.
 */

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdx'])
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'out',
  '.cache',
  '.turbo'
])
const MAX_ENTRIES = 5000

export type WorkspaceKind = 'playground' | 'folder'

export type WorkspaceEntries = {
  /** Markdown file paths, relative to `root`, using forward slashes. */
  files: string[]
  /** Directory paths (incl. empty ones), relative to `root`, forward slashes. */
  dirs: string[]
}

export type WorkspaceFolder = WorkspaceEntries & {
  /** Absolute path of the folder; also used as the workspace id. */
  root: string
  /** Display name (folder basename, or "Playground"). */
  name: string
  /** Whether this is the managed playground or a user-opened folder. */
  kind: WorkspaceKind
}

function toPosix(value: string): string {
  return sep === '/' ? value : value.split(sep).join('/')
}

function hasMarkdownExtension(name: string): boolean {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return false
  return MARKDOWN_EXTENSIONS.has(name.slice(dot).toLowerCase())
}

/**
 * Walk the workspace for markdown files only. Directories are derived as the
 * ancestor folders of those files, so unrelated / empty directories are not
 * shown — the tree reflects the markdown files under the folder, nothing else.
 */
async function collectEntries(root: string): Promise<WorkspaceEntries> {
  const files: string[] = []

  async function walk(dir: string): Promise<void> {
    if (files.length >= MAX_ENTRIES) return
    let entries: Dirent[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (files.length >= MAX_ENTRIES) return
      if (entry.name.startsWith('.') && entry.isDirectory()) continue

      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue
        await walk(fullPath)
      } else if (entry.isFile() && hasMarkdownExtension(entry.name)) {
        files.push(toPosix(relative(root, fullPath)))
      }
    }
  }

  await walk(root)

  // Derive the folders that lead to a markdown file.
  const dirSet = new Set<string>()
  for (const file of files) {
    let slash = file.lastIndexOf('/')
    while (slash > 0) {
      dirSet.add(file.slice(0, slash))
      slash = file.lastIndexOf('/', slash - 1)
    }
  }

  return {
    files: files.sort((a, b) => a.localeCompare(b)),
    dirs: [...dirSet].sort((a, b) => a.localeCompare(b))
  }
}

/** Resolve a posix-style `relativePath` under `root`, refusing escapes. */
function resolveInsideRoot(root: string, relativePath: string): string {
  const native = sep === '/' ? relativePath : relativePath.split('/').join(sep)
  const target = join(root, native)
  const rel = relative(root, target)
  if (rel.startsWith('..') || rel.includes(`..${sep}`)) {
    throw new Error('Refusing to access a file outside the workspace root')
  }
  return target
}

function playgroundRoot(): string {
  return join(app.getPath('userData'), 'playground')
}

async function buildFolder(
  root: string,
  kind: WorkspaceKind,
  name?: string
): Promise<WorkspaceFolder> {
  const { files, dirs } = await collectEntries(root)
  const displayName = name ?? root.split(sep).filter(Boolean).pop() ?? root
  return { root, name: displayName, kind, files, dirs }
}

async function getPlayground(): Promise<WorkspaceFolder> {
  const root = playgroundRoot()
  await mkdir(root, { recursive: true })
  return buildFolder(root, 'playground', 'Playground')
}

async function selectFolder(): Promise<WorkspaceFolder | null> {
  const focused = BrowserWindow.getFocusedWindow() ?? undefined
  const result = focused
    ? await dialog.showOpenDialog(focused, { properties: ['openDirectory'] })
    : await dialog.showOpenDialog({ properties: ['openDirectory'] })

  if (result.canceled || result.filePaths.length === 0) return null
  return buildFolder(result.filePaths[0], 'folder')
}

async function readWorkspaceFile(root: string, relativePath: string): Promise<string> {
  return readFile(resolveInsideRoot(root, relativePath), 'utf-8')
}

async function writeWorkspaceFile(
  root: string,
  relativePath: string,
  content: string
): Promise<void> {
  const target = resolveInsideRoot(root, relativePath)
  await mkdir(join(target, '..'), { recursive: true })
  await writeFile(target, content, 'utf-8')
  // Snapshot every write into Local History (deduped, best-effort).
  await recordHistory(root, relativePath, content)
}

/**
 * Restore a Local History version back into the file. Forces a distinct
 * (non-merged) snapshot so the pre-restore state is always preserved and the
 * restore stays undoable. Returns the restored content.
 */
async function restoreWorkspaceFile(
  root: string,
  relativePath: string,
  id: string
): Promise<string> {
  const content = await readHistoryVersion(root, relativePath, id)
  const target = resolveInsideRoot(root, relativePath)
  await mkdir(join(target, '..'), { recursive: true })
  await writeFile(target, content, 'utf-8')
  await recordHistory(root, relativePath, content, { merge: false })
  return content
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Sanitize a user-supplied name to a safe, single path segment. */
function sanitizeSegment(rawName: string, fallback = '未命名'): string {
  const base = (rawName || '').trim().replace(/[/\\]/g, '')
  return base.replace(/[<>:"|?*]/g, '').trim() || fallback
}

/** Sanitize to a single markdown filename stem (no extension). */
function sanitizeFileStem(rawName: string): string {
  return sanitizeSegment(rawName.replace(/\.(md|markdown|mdx)$/i, ''))
}

export type MutationResult = WorkspaceEntries & {
  /**
   * Primary affected path, relative to the workspace root (posix). For create
   * / rename it is the resulting path; for delete it is null.
   */
  path: string | null
}

/** Join a posix directory with a name, tolerating an empty directory. */
function posixJoin(dir: string, name: string): string {
  const clean = dir.replace(/^\/+|\/+$/g, '')
  return clean ? `${clean}/${name}` : name
}

/** Re-walk the workspace and wrap the result with a primary affected path. */
async function buildResult(root: string, path: string | null): Promise<MutationResult> {
  const { files, dirs } = await collectEntries(root)
  return { path, files, dirs }
}

/** Find a non-colliding path by appending `-1`, `-2`, … to the stem. */
async function uniquePath(root: string, dir: string, stem: string, ext: string): Promise<string> {
  let candidate = posixJoin(dir, `${stem}${ext}`)
  let counter = 1
  while (await exists(resolveInsideRoot(root, candidate))) {
    candidate = posixJoin(dir, `${stem}-${counter}${ext}`)
    counter += 1
  }
  return candidate
}

async function createWorkspaceFile(
  root: string,
  dir: string,
  rawName: string
): Promise<MutationResult> {
  const stem = sanitizeFileStem(rawName)
  const candidate = await uniquePath(root, dir, stem, '.md')
  await writeWorkspaceFile(root, candidate, `# ${stem}\n\n`)
  return buildResult(root, candidate)
}

async function createWorkspaceFolder(
  root: string,
  dir: string,
  rawName: string
): Promise<MutationResult> {
  const stem = sanitizeSegment(rawName, '新建文件夹')
  const candidate = await uniquePath(root, dir, stem, '')
  await mkdir(resolveInsideRoot(root, candidate), { recursive: true })
  return buildResult(root, candidate)
}

async function renameWorkspacePath(
  root: string,
  fromRel: string,
  toRel: string
): Promise<MutationResult> {
  if (fromRel === toRel) return buildResult(root, toRel)
  const source = resolveInsideRoot(root, fromRel)
  const target = resolveInsideRoot(root, toRel)
  if (await exists(target)) {
    throw new Error(`目标已存在：${toRel}`)
  }
  await mkdir(dirname(target), { recursive: true })
  await rename(source, target)
  // Keep Local History attached to the file at its new path. (Directory renames
  // only migrate the directory's own entry, not nested files' — a known limit.)
  await moveHistory(root, fromRel, toRel)
  return buildResult(root, toRel)
}

/** Move `fromRel` into the directory `toDir`, keeping its basename. */
async function moveWorkspacePath(
  root: string,
  fromRel: string,
  toDir: string
): Promise<MutationResult> {
  const name = basename(fromRel.split('/').join(sep))
  return renameWorkspacePath(root, fromRel, posixJoin(toDir, name))
}

async function deleteWorkspacePath(root: string, rel: string): Promise<MutationResult> {
  await rm(resolveInsideRoot(root, rel), { recursive: true, force: true })
  await dropHistory(root, rel)
  return buildResult(root, null)
}

/* ---- Persisted workspace list ----------------------------------------- */

type PersistedState = {
  /** Opened folder roots (the playground is always recreated, not stored). */
  folders: string[]
  /** Root of the workspace that was active last. */
  activeRoot: string | null
}

export type InitialWorkspaces = {
  workspaces: WorkspaceFolder[]
  activeRoot: string
}

function statePath(): string {
  return join(app.getPath('userData'), 'workspaces.json')
}

async function readState(): Promise<PersistedState> {
  try {
    const parsed = JSON.parse(await readFile(statePath(), 'utf-8'))
    return {
      folders: Array.isArray(parsed?.folders)
        ? parsed.folders.filter((f: unknown): f is string => typeof f === 'string')
        : [],
      activeRoot: typeof parsed?.activeRoot === 'string' ? parsed.activeRoot : null
    }
  } catch {
    return { folders: [], activeRoot: null }
  }
}

/** Build the startup workspace list: playground + remembered, still-valid folders. */
async function getInitialWorkspaces(): Promise<InitialWorkspaces> {
  const playground = await getPlayground()
  const state = await readState()

  const seen = new Set<string>([playground.root])
  const folders: WorkspaceFolder[] = []
  for (const root of state.folders) {
    if (seen.has(root)) continue
    seen.add(root)
    if (await exists(root)) folders.push(await buildFolder(root, 'folder'))
  }

  const workspaces = [playground, ...folders]
  const activeRoot =
    state.activeRoot && workspaces.some((w) => w.root === state.activeRoot)
      ? state.activeRoot
      : playground.root
  return { workspaces, activeRoot }
}

async function persistWorkspaces(folders: string[], activeRoot: string | null): Promise<void> {
  await writeFile(statePath(), JSON.stringify({ folders, activeRoot }, null, 2), 'utf-8')
}

export function registerWorkspaceIpc(): void {
  ipcMain.handle('workspace:get-initial', () => getInitialWorkspaces())
  ipcMain.handle('workspace:persist', (_event, folders: string[], activeRoot: string | null) =>
    persistWorkspaces(folders, activeRoot)
  )
  ipcMain.handle('workspace:get-playground', () => getPlayground())
  ipcMain.handle('workspace:select-folder', () => selectFolder())
  ipcMain.handle('workspace:read-file', (_event, root: string, relativePath: string) =>
    readWorkspaceFile(root, relativePath)
  )
  ipcMain.handle(
    'workspace:write-file',
    (_event, root: string, relativePath: string, content: string) =>
      writeWorkspaceFile(root, relativePath, content)
  )
  ipcMain.handle('workspace:create-file', (_event, root: string, dir: string, name: string) =>
    createWorkspaceFile(root, dir, name)
  )
  ipcMain.handle('workspace:create-folder', (_event, root: string, dir: string, name: string) =>
    createWorkspaceFolder(root, dir, name)
  )
  ipcMain.handle('workspace:rename', (_event, root: string, fromRel: string, toRel: string) =>
    renameWorkspacePath(root, fromRel, toRel)
  )
  ipcMain.handle('workspace:move', (_event, root: string, fromRel: string, toDir: string) =>
    moveWorkspacePath(root, fromRel, toDir)
  )
  ipcMain.handle('workspace:delete', (_event, root: string, rel: string) =>
    deleteWorkspacePath(root, rel)
  )
  ipcMain.handle('workspace:restore-version', (_event, root: string, rel: string, id: string) =>
    restoreWorkspaceFile(root, rel, id)
  )
}
