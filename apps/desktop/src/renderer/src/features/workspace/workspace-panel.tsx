import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { FileTreeView, type CreateDraft } from './file-tree'
import { WorkspaceSwitcher } from './workspace-switcher'
import { FolderOpenIcon, FolderPlusIcon, FilePlusIcon, SidebarIcon } from './icons'
import type { CreateMode } from './tree-model'
import type { WorkspaceFolder } from './workspace.types'
import type { TreeSelection } from './use-workspace'

type WorkspacePanelProps = {
  workspaces: WorkspaceFolder[]
  activeWorkspace: WorkspaceFolder | null
  activePath: string | null
  isOpeningFolder: boolean
  /** Directory new entries go into when created from the header buttons. */
  targetDir: string
  onSelectWorkspace: (root: string) => void
  onAddWorkspace: () => void
  onSelectFile: (path: string) => void
  onSelectionChange: (selection: TreeSelection) => void
  onCreateFile: (name: string, dir: string) => void
  onCreateFolder: (name: string, dir: string) => void
  onRenamePath: (fromRel: string, toRel: string) => void
  onMovePaths: (paths: string[], toDir: string) => void
  onDeletePath: (path: string) => void
  /** Collapse (hide) the sidebar. */
  onCollapse: () => void
}

/**
 * Left pane: the local workspaces. Lists open workspaces (incl. the default
 * Playground), opens more folders, and browses / creates / renames / moves /
 * deletes the active workspace's markdown files and folders.
 */
export function WorkspacePanel({
  workspaces,
  activeWorkspace,
  activePath,
  isOpeningFolder,
  targetDir,
  onSelectWorkspace,
  onAddWorkspace,
  onSelectFile,
  onSelectionChange,
  onCreateFile,
  onCreateFolder,
  onRenamePath,
  onMovePaths,
  onDeletePath,
  onCollapse
}: WorkspacePanelProps): React.JSX.Element {
  const [draft, setDraft] = useState<CreateDraft | null>(null)

  // Drop any pending draft when the active workspace changes.
  useEffect(() => {
    setDraft(null)
  }, [activeWorkspace?.root])

  function openCreate(mode: CreateMode, dir: string): void {
    setDraft({ mode, dir })
  }

  function handleDraftSubmit(name: string): void {
    if (!draft) return
    const { mode, dir } = draft
    setDraft(null)
    if (mode === 'folder') onCreateFolder(name, dir)
    else onCreateFile(name, dir)
  }

  const hasEntries =
    !!activeWorkspace && (activeWorkspace.files.length > 0 || activeWorkspace.dirs.length > 0)

  return (
    <aside className="flex h-full w-67 shrink-0 flex-col ">
      <header className="drag-region flex items-center justify-between px-4 pb-2 pt-9">
        <span className="text-[13px] font-semibold text-sidebar-foreground">工作区</span>
        <div className="flex items-center gap-0.5">
          <IconButton label="打开文件夹" onPress={onAddWorkspace} isDisabled={isOpeningFolder}>
            <FolderOpenIcon size={16} />
          </IconButton>
          <IconButton label="隐藏侧边栏" onPress={onCollapse}>
            <SidebarIcon size={16} />
          </IconButton>
        </div>
      </header>

      <WorkspaceSwitcher
        workspaces={workspaces}
        activeRoot={activeWorkspace?.root ?? null}
        onSelect={onSelectWorkspace}
      />

      {activeWorkspace && (
        <>
          <div className="mt-4 flex items-center justify-between px-4 pb-1.5">
            <span className="truncate text-[13px] font-medium tracking-wide text-muted-foreground">
              {activeWorkspace.name}
            </span>
            <div className="flex items-center gap-0.5">
              <IconButton label="新建 Markdown" onPress={() => openCreate('file', targetDir)}>
                <FilePlusIcon size={16} />
              </IconButton>
              <IconButton label="新建文件夹" onPress={() => openCreate('folder', targetDir)}>
                <FolderPlusIcon size={16} />
              </IconButton>
            </div>
          </div>

          <div className="min-h-0 flex-1 px-2 pb-3">
            {hasEntries || draft ? (
              <FileTreeView
                key={activeWorkspace.root}
                files={activeWorkspace.files}
                dirs={activeWorkspace.dirs}
                activePath={activePath}
                draft={draft}
                onSelectFile={onSelectFile}
                onSelectionChange={onSelectionChange}
                onRenamePath={onRenamePath}
                onMovePaths={onMovePaths}
                onDeletePath={onDeletePath}
                onCreateInDir={(dir) => openCreate('file', dir)}
                onCreateFolderInDir={(dir) => openCreate('folder', dir)}
                onDraftSubmit={handleDraftSubmit}
                onDraftCancel={() => setDraft(null)}
              />
            ) : (
              <EmptyHint
                text={
                  activeWorkspace.kind === 'playground'
                    ? '还没有文件，点击右上角 + 新建一个 Markdown'
                    : '该文件夹下没有 Markdown 文件'
                }
              />
            )}
          </div>
        </>
      )}
    </aside>
  )
}

type IconButtonProps = {
  label: string
  onPress: () => void
  isDisabled?: boolean
  children: React.ReactNode
}

function IconButton({
  label,
  onPress,
  isDisabled = false,
  children
}: IconButtonProps): React.JSX.Element {
  return (
    <Button
      isIconOnly
      variant="ghost"
      size="sm"
      aria-label={label}
      isDisabled={isDisabled}
      onPress={onPress}
      className="no-drag h-7 w-7 min-w-0 bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </Button>
  )
}

function EmptyHint({ text }: { text: string }): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-[12px] leading-relaxed text-muted-foreground">
      {text}
    </div>
  )
}
