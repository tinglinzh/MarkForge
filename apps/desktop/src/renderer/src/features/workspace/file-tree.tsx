import { useEffect, useMemo, useState } from 'react'
import {
  Files,
  SubFiles,
  FolderItem,
  FolderTrigger,
  FolderPanel,
  FileItem
} from '@markforge/ui/components/animate-ui/components/base/files'
import { cn } from '@markforge/ui/lib/utils'
import { buildTree, type TreeNode, type CreateMode } from './tree-model'
import { TreeContextMenu, type MenuTarget } from './tree-context-menu'
import { TreeRenameInput } from './tree-rename-input'
import { FileTextIcon, FolderIcon } from './icons'
import { posixDirname, posixJoin } from './path-utils'
import type { TreeSelection } from './use-workspace'

export type CreateDraft = { mode: CreateMode; dir: string }

type FileTreeViewProps = {
  files: string[]
  dirs: string[]
  /** Currently open file path, kept highlighted. */
  activePath: string | null
  /** Active new-file / new-folder draft, rendered inline at its target dir. */
  draft: CreateDraft | null
  onSelectFile: (path: string) => void
  onSelectionChange: (selection: TreeSelection) => void
  onRenamePath: (fromRel: string, toRel: string) => void
  /** Kept for API compatibility; drag-and-drop moving is currently disabled. */
  onMovePaths: (paths: string[], toDir: string) => void
  onDeletePath: (path: string) => void
  onCreateInDir: (dir: string) => void
  onCreateFolderInDir: (dir: string) => void
  onDraftSubmit: (name: string) => void
  onDraftCancel: () => void
}

/**
 * Workspace file tree rendered with the animate-ui `Files` component (animated
 * folder expand/collapse, hover highlight, indent guides). Each folder level is
 * its own accordion, so the top level is a `Files` (providing the shared
 * highlight) and nested levels are `SubFiles`, with open state controlled from a
 * single `collapsed` set. Supports opening files, expand/collapse, a context
 * menu, inline rename, and an inline new-entry draft; the persistent selection
 * highlight is a `bg-accent` on the selected row.
 */
export function FileTreeView({
  files,
  dirs,
  activePath,
  draft,
  onSelectFile,
  onSelectionChange,
  onRenamePath,
  onDeletePath,
  onCreateInDir,
  onCreateFolderInDir,
  onDraftSubmit,
  onDraftCancel
}: FileTreeViewProps): React.JSX.Element {
  const tree = useMemo(() => buildTree(files, dirs), [files, dirs])

  // Directories are expanded by default; track the ones the user collapsed.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [selected, setSelected] = useState<string | null>(activePath)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuTarget | null>(null)

  useEffect(() => {
    if (activePath) setSelected(activePath)
  }, [activePath])

  // Expanded unless collapsed — but always expand the chain leading to a draft.
  function isExpanded(path: string): boolean {
    if (draft && (draft.dir === path || draft.dir.startsWith(`${path}/`))) return true
    return !collapsed.has(path)
  }

  /** Reconcile the `collapsed` set after an accordion level reports its open set. */
  function applyOpenChange(scope: string[], open: string[]): void {
    const openSet = new Set(open)
    setCollapsed((prev) => {
      const next = new Set(prev)
      for (const dir of scope) {
        if (openSet.has(dir)) next.delete(dir)
        else next.add(dir)
      }
      return next
    })
  }

  function selectFile(node: TreeNode): void {
    if (node.path === selected) return
    setSelected(node.path)
    onSelectionChange({ path: node.path, isDirectory: false })
    onSelectFile(node.path)
  }

  function selectDir(node: TreeNode): void {
    setSelected(node.path)
    onSelectionChange({ path: node.path, isDirectory: true })
  }

  function openMenu(event: React.MouseEvent, node: TreeNode): void {
    event.preventDefault()
    setSelected(node.path)
    onSelectionChange({ path: node.path, isDirectory: node.kind === 'dir' })
    setMenu({ x: event.clientX, y: event.clientY, path: node.path, kind: node.kind })
  }

  function commitRename(node: TreeNode, name: string): void {
    setRenaming(null)
    let finalName = name
    if (node.kind === 'file' && /\.md$/i.test(node.name) && !/\.[a-z0-9]+$/i.test(finalName)) {
      finalName += '.md'
    }
    onRenamePath(node.path, posixJoin(posixDirname(node.path), finalName))
  }

  /** Inline icon + text input row, used for rename and new-entry drafts. */
  function inlineRow(isFolder: boolean, input: React.ReactNode, key?: string): React.JSX.Element {
    return (
      <div key={key} className="flex h-9 items-center gap-2 px-2">
        <span className="shrink-0 text-muted-foreground">
          {isFolder ? <FolderIcon size={18} /> : <FileTextIcon size={18} />}
        </span>
        {input}
      </div>
    )
  }

  function renderDraftRow(): React.JSX.Element {
    const isFolder = draft?.mode === 'folder'
    return inlineRow(
      isFolder,
      <TreeRenameInput
        initialName=""
        placeholder={isFolder ? '文件夹名' : '文件名'}
        onSubmit={onDraftSubmit}
        onCancel={onDraftCancel}
      />,
      '__draft__'
    )
  }

  function renderFile(node: TreeNode): React.JSX.Element {
    if (renaming === node.path) {
      return inlineRow(
        false,
        <TreeRenameInput
          initialName={node.name}
          onSubmit={(name) => commitRename(node, name)}
          onCancel={() => setRenaming(null)}
        />,
        node.path
      )
    }
    return (
      <div
        key={node.path}
        onClick={() => selectFile(node)}
        onContextMenu={(event) => openMenu(event, node)}
        className={cn(
          'cursor-pointer rounded-lg',
          selected === node.path && 'bg-accent text-accent-foreground'
        )}
      >
        <FileItem>{node.name}</FileItem>
      </div>
    )
  }

  function renderFolder(node: TreeNode): React.JSX.Element {
    if (renaming === node.path) {
      return inlineRow(
        true,
        <TreeRenameInput
          initialName={node.name}
          onSubmit={(name) => commitRename(node, name)}
          onCancel={() => setRenaming(null)}
        />,
        node.path
      )
    }
    return (
      <FolderItem key={node.path} value={node.path}>
        <div
          onClick={() => selectDir(node)}
          onContextMenu={(event) => openMenu(event, node)}
          className={cn(
            'cursor-pointer rounded-lg',
            selected === node.path && 'bg-accent text-accent-foreground'
          )}
        >
          <FolderTrigger>{node.name}</FolderTrigger>
        </div>
        <FolderPanel>{renderLevel(node.children, node.path)}</FolderPanel>
      </FolderItem>
    )
  }

  /** Render one directory level as its own accordion (Files at root, else SubFiles). */
  function renderLevel(nodes: TreeNode[], dir: string): React.JSX.Element {
    const childDirs = nodes.filter((n) => n.kind === 'dir').map((n) => n.path)
    const open = childDirs.filter(isExpanded)
    const onOpenChange = (next: string[]): void => applyOpenChange(childDirs, next)

    const children = (
      <>
        {nodes.map((node) => (node.kind === 'dir' ? renderFolder(node) : renderFile(node)))}
        {draft?.dir === dir && renderDraftRow()}
      </>
    )

    return dir === '' ? (
      <Files className="h-full" open={open} onOpenChange={onOpenChange}>
        {children}
      </Files>
    ) : (
      <SubFiles open={open} onOpenChange={onOpenChange}>
        {children}
      </SubFiles>
    )
  }

  return (
    <div role="tree" className="h-full">
      {renderLevel(tree, '')}

      {menu && (
        <TreeContextMenu
          target={menu}
          onClose={() => setMenu(null)}
          onNewFile={onCreateInDir}
          onNewFolder={onCreateFolderInDir}
          onRename={(path) => setRenaming(path)}
          onDelete={onDeletePath}
        />
      )}
    </div>
  )
}
