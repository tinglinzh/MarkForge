import type { WorkspaceFolder } from './workspace.types'
import { SparkleIcon, FolderIcon } from './icons'

type WorkspaceSwitcherProps = {
  workspaces: WorkspaceFolder[]
  activeRoot: string | null
  onSelect: (root: string) => void
}

/** Vertical list of open workspaces; the playground is pinned visually. */
export function WorkspaceSwitcher({
  workspaces,
  activeRoot,
  onSelect
}: WorkspaceSwitcherProps): React.JSX.Element {
  return (
    <ul className="flex flex-col gap-0.5 px-2">
      {workspaces.map((workspace) => {
        const isActive = workspace.root === activeRoot
        return (
          <li key={workspace.root}>
            <button
              type="button"
              onClick={() => onSelect(workspace.root)}
              title={workspace.root}
              className={[
                'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-accent/60'
              ].join(' ')}
            >
              <span className="shrink-0 text-muted-foreground">
                {workspace.kind === 'playground' ? (
                  <SparkleIcon size={15} />
                ) : (
                  <FolderIcon size={15} />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                {workspace.name}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {workspace.files.length}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
