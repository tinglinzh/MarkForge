import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActiveDocument, DocumentStatus, WorkspaceFolder } from './workspace.types'
import { posixBasename, posixDirname, posixJoin } from './path-utils'

/** The node currently highlighted in the tree (file or directory). */
export type TreeSelection = { path: string; isDirectory: boolean } | null

export type WorkspaceState = {
  workspaces: WorkspaceFolder[]
  activeWorkspace: WorkspaceFolder | null
  activePath: string | null
  document: ActiveDocument | null
  status: DocumentStatus
  isOpeningFolder: boolean
  /** Directory new files should be created into, derived from selection. */
  targetDir: string
  selectActiveWorkspace: (root: string) => void
  addWorkspace: () => Promise<void>
  setSelection: (selection: TreeSelection) => void
  openFile: (path: string) => Promise<void>
  createFile: (name: string, dir: string) => Promise<void>
  createFolder: (name: string, dir: string) => Promise<void>
  renamePath: (fromRel: string, toRel: string) => Promise<void>
  movePaths: (paths: string[], toDir: string) => Promise<void>
  deletePath: (path: string) => Promise<void>
  saveFile: (content: string) => Promise<void>
  restoreVersion: (id: string) => Promise<void>
}

/**
 * Owns local-workspace state: the list of open workspaces (including the
 * default Playground), the active one, the current tree selection, and the
 * document loaded into the editor. Filesystem work is delegated to
 * `window.api.workspace`; this hook keeps the in-memory view reconciled.
 */
export function useWorkspace(): WorkspaceState {
  const [workspaces, setWorkspaces] = useState<WorkspaceFolder[]>([])
  const [activeRoot, setActiveRoot] = useState<string | null>(null)
  const [activePath, setActivePath] = useState<string | null>(null)
  const [document, setDocument] = useState<ActiveDocument | null>(null)
  const [status, setStatus] = useState<DocumentStatus>('idle')
  const [isOpeningFolder, setIsOpeningFolder] = useState(false)
  const [selection, setSelection] = useState<TreeSelection>(null)

  // Guards against a slow read resolving after the user picked another file.
  const loadTokenRef = useRef(0)
  // Becomes true once the persisted state has loaded, so we don't persist over
  // it with the empty initial state.
  const loadedRef = useRef(false)

  const activeWorkspace = workspaces.find((w) => w.root === activeRoot) ?? null

  const targetDir = !selection
    ? ''
    : selection.isDirectory
      ? selection.path
      : posixDirname(selection.path)

  // Bootstrap: load the Playground plus the remembered workspaces on mount.
  useEffect(() => {
    let cancelled = false
    void window.api.workspace.getInitial().then(({ workspaces: initial, activeRoot: root }) => {
      if (cancelled) return
      setWorkspaces(initial)
      setActiveRoot(root)
      loadedRef.current = true
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Remember the opened folders and the active workspace across restarts.
  useEffect(() => {
    if (!loadedRef.current) return
    const folders = workspaces.filter((w) => w.kind === 'folder').map((w) => w.root)
    void window.api.workspace.persist(folders, activeRoot)
  }, [workspaces, activeRoot])

  const setWorkspaceEntries = useCallback((root: string, files: string[], dirs: string[]) => {
    setWorkspaces((prev) => prev.map((w) => (w.root === root ? { ...w, files, dirs } : w)))
  }, [])

  const upsertWorkspace = useCallback((next: WorkspaceFolder) => {
    setWorkspaces((prev) => {
      const index = prev.findIndex((w) => w.root === next.root)
      if (index === -1) return [...prev, next]
      const copy = prev.slice()
      copy[index] = next
      return copy
    })
  }, [])

  const resetActiveDocument = useCallback(() => {
    loadTokenRef.current += 1
    setActivePath(null)
    setDocument(null)
    setStatus('idle')
    setSelection(null)
  }, [])

  const selectActiveWorkspace = useCallback(
    (root: string) => {
      if (root === activeRoot) return
      setActiveRoot(root)
      resetActiveDocument()
    },
    [activeRoot, resetActiveDocument]
  )

  const addWorkspace = useCallback(async () => {
    setIsOpeningFolder(true)
    try {
      const picked = await window.api.workspace.selectFolder()
      if (!picked) return
      upsertWorkspace(picked)
      setActiveRoot(picked.root)
      resetActiveDocument()
    } finally {
      setIsOpeningFolder(false)
    }
  }, [resetActiveDocument, upsertWorkspace])

  const openFile = useCallback(
    async (path: string) => {
      if (!activeRoot) return
      const root = activeRoot
      const token = ++loadTokenRef.current
      setActivePath(path)
      setStatus('loading')
      try {
        const content = await window.api.workspace.readFile(root, path)
        if (loadTokenRef.current !== token) return
        setDocument({ root, path, content })
        setStatus('ready')
      } catch {
        if (loadTokenRef.current !== token) return
        setDocument(null)
        setStatus('error')
      }
    },
    [activeRoot]
  )

  const createFile = useCallback(
    async (name: string, dir: string) => {
      if (!activeRoot) return
      const root = activeRoot
      const { path, files, dirs } = await window.api.workspace.createFile(root, dir, name)
      setWorkspaceEntries(root, files, dirs)
      if (!path) return
      loadTokenRef.current += 1
      setActivePath(path)
      setSelection({ path, isDirectory: false })
      setDocument({ root, path, content: `# ${posixBasename(path).replace(/\.md$/i, '')}\n\n` })
      setStatus('ready')
    },
    [activeRoot, setWorkspaceEntries]
  )

  const createFolder = useCallback(
    async (name: string, dir: string) => {
      if (!activeRoot) return
      const root = activeRoot
      const { path, files, dirs } = await window.api.workspace.createFolder(root, dir, name)
      setWorkspaceEntries(root, files, dirs)
      if (path) setSelection({ path, isDirectory: true })
    },
    [activeRoot, setWorkspaceEntries]
  )

  /** Move the open document / selection along when their path changes on disk. */
  const remapOpenPath = useCallback((root: string, fromRel: string, toRel: string | null) => {
    setActivePath((prev) => (prev === fromRel ? toRel : prev))
    setSelection((prev) =>
      prev && prev.path === fromRel ? (toRel ? { ...prev, path: toRel } : null) : prev
    )
    setDocument((prev) => {
      if (!prev || prev.root !== root || prev.path !== fromRel) return prev
      if (!toRel) return null
      return { ...prev, path: toRel }
    })
    if (!toRel) setStatus((prev) => (prev === 'ready' ? 'idle' : prev))
  }, [])

  const renamePath = useCallback(
    async (fromRel: string, toRel: string) => {
      if (!activeRoot || fromRel === toRel) return
      const root = activeRoot
      const { files, dirs } = await window.api.workspace.rename(root, fromRel, toRel)
      setWorkspaceEntries(root, files, dirs)
      remapOpenPath(root, fromRel, toRel)
    },
    [activeRoot, remapOpenPath, setWorkspaceEntries]
  )

  const movePaths = useCallback(
    async (paths: string[], toDir: string) => {
      if (!activeRoot || paths.length === 0) return
      const root = activeRoot
      let latest: { files: string[]; dirs: string[] } | null = null
      for (const fromRel of paths) {
        if (posixDirname(fromRel) === toDir) continue
        const { path, files, dirs } = await window.api.workspace.move(root, fromRel, toDir)
        latest = { files, dirs }
        remapOpenPath(root, fromRel, path)
      }
      if (latest) setWorkspaceEntries(root, latest.files, latest.dirs)
    },
    [activeRoot, remapOpenPath, setWorkspaceEntries]
  )

  const deletePath = useCallback(
    async (path: string) => {
      if (!activeRoot) return
      const root = activeRoot
      const { files, dirs } = await window.api.workspace.delete(root, path)
      setWorkspaceEntries(root, files, dirs)
      // Clear the open document if it (or its ancestor) was removed.
      setActivePath((prev) =>
        prev && (prev === path || prev.startsWith(`${path}/`)) ? null : prev
      )
      setDocument((prev) =>
        prev && prev.root === root && (prev.path === path || prev.path.startsWith(`${path}/`))
          ? null
          : prev
      )
      setSelection((prev) =>
        prev && (prev.path === path || prev.path.startsWith(`${path}/`)) ? null : prev
      )
    },
    [activeRoot, setWorkspaceEntries]
  )

  const saveFile = useCallback(
    async (content: string) => {
      if (!document) return
      await window.api.workspace.writeFile(document.root, document.path, content)
      setDocument((prev) => (prev ? { ...prev, content } : prev))
    },
    [document]
  )

  /** Restore a Local History version: the file is rewritten in the main
   * process; here we reflect the restored content into the open document. */
  const restoreVersion = useCallback(
    async (id: string) => {
      if (!document) return
      const { root, path } = document
      const content = await window.api.workspace.restoreVersion(root, path, id)
      setDocument((prev) =>
        prev && prev.root === root && prev.path === path ? { ...prev, content } : prev
      )
    },
    [document]
  )

  return {
    workspaces,
    activeWorkspace,
    activePath,
    document,
    status,
    isOpeningFolder,
    targetDir,
    selectActiveWorkspace,
    addWorkspace,
    setSelection,
    openFile,
    createFile,
    createFolder,
    renamePath,
    movePaths,
    deletePath,
    saveFile,
    restoreVersion
  }
}

// Re-exported for callers that build paths from the same primitives.
export { posixJoin }
