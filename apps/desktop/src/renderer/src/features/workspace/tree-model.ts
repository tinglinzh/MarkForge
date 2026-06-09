import { posixBasename } from './path-utils'

/** Whether a pending new-entry draft creates a file or a folder. */
export type CreateMode = 'file' | 'folder'

export type TreeNodeKind = 'file' | 'dir'

export type TreeNode = {
  /** Workspace-relative posix path. */
  path: string
  /** Last path segment (display label). */
  name: string
  kind: TreeNodeKind
  /** Child nodes (directories first, then files). Empty for files. */
  children: TreeNode[]
}

/**
 * Build a nested tree from flat markdown file paths and directory paths.
 * Directories come from both `dirs` (incl. empty) and any file ancestors, so
 * empty folders still appear.
 */
export function buildTree(files: string[], dirs: string[]): TreeNode[] {
  const root: TreeNode = { path: '', name: '', kind: 'dir', children: [] }
  const dirNodes = new Map<string, TreeNode>([['', root]])

  function ensureDir(path: string): TreeNode {
    const existing = dirNodes.get(path)
    if (existing) return existing
    const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
    const parent = ensureDir(parentPath)
    const node: TreeNode = { path, name: posixBasename(path), kind: 'dir', children: [] }
    dirNodes.set(path, node)
    parent.children.push(node)
    return node
  }

  for (const dir of dirs) ensureDir(dir)

  for (const file of files) {
    const parentPath = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : ''
    const parent = ensureDir(parentPath)
    parent.children.push({ path: file, name: posixBasename(file), kind: 'file', children: [] })
  }

  sortChildren(root)
  return root.children
}

/** Directories first, then files; each group alphabetical (locale-aware). */
function sortChildren(node: TreeNode): void {
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const child of node.children) {
    if (child.kind === 'dir') sortChildren(child)
  }
}
