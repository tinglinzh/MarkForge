/** Distinguishes the managed playground from user-opened folders. */
export type WorkspaceKind = 'playground' | 'folder'

/** A folder the user has opened (or the default playground) as a workspace. */
export type WorkspaceFolder = {
  /** Absolute path of the folder; also used as the workspace id. */
  root: string
  /** Display name (folder basename, or "Playground"). */
  name: string
  kind: WorkspaceKind
  /** Markdown file paths, relative to `root`, using forward slashes. */
  files: string[]
  /** Directory paths (incl. empty ones), relative to `root`, forward slashes. */
  dirs: string[]
}

/** Loading lifecycle for the currently open document. */
export type DocumentStatus = 'idle' | 'loading' | 'ready' | 'error'

/** The document currently shown in the editor pane. */
export type ActiveDocument = {
  /** Workspace root the document belongs to. */
  root: string
  /** Path relative to the workspace root. */
  path: string
  /** Raw markdown content as last loaded or saved. */
  content: string
}
