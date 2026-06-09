import { useEffect, useRef } from 'react'
import { ListBox, ListBoxItem } from '@heroui/react'
import type { TreeNodeKind } from './tree-model'

export type MenuTarget = {
  /** Position in viewport coordinates. */
  x: number
  y: number
  path: string
  kind: TreeNodeKind
}

type Action = 'new-file' | 'new-folder' | 'rename' | 'delete'

type TreeContextMenuProps = {
  target: MenuTarget
  onClose: () => void
  onNewFile: (dir: string) => void
  onNewFolder: (dir: string) => void
  onRename: (path: string) => void
  onDelete: (path: string) => void
}

/** Custom right-click menu for a tree node, positioned at the cursor. */
export function TreeContextMenu({
  target,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete
}: TreeContextMenuProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const isDirectory = target.kind === 'dir'

  // Close on outside click / Escape.
  useEffect(() => {
    function onPointerDown(event: PointerEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  function handle(action: Action): void {
    onClose()
    if (action === 'new-file') onNewFile(target.path)
    else if (action === 'new-folder') onNewFolder(target.path)
    else if (action === 'rename') onRename(target.path)
    else onDelete(target.path)
  }

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top: target.y, left: target.x }}
      className="z-[100] min-w-40 rounded-xl bg-card/95 p-1 shadow-popover backdrop-blur-md"
    >
      <ListBox
        aria-label="文件操作"
        selectionMode="none"
        onAction={(key) => handle(key as Action)}
        className="gap-0.5 text-[13px] text-foreground"
      >
        {isDirectory ? (
          <>
            <ListBoxItem id="new-file" className="rounded-lg">
              新建 Markdown
            </ListBoxItem>
            <ListBoxItem id="new-folder" className="rounded-lg">
              新建文件夹
            </ListBoxItem>
            <ListBoxItem id="rename" className="rounded-lg">
              重命名
            </ListBoxItem>
            <ListBoxItem id="delete" className="rounded-lg">
              删除
            </ListBoxItem>
          </>
        ) : (
          <>
            <ListBoxItem id="rename" className="rounded-lg">
              重命名
            </ListBoxItem>
            <ListBoxItem id="delete" className="rounded-lg">
              删除
            </ListBoxItem>
          </>
        )}
      </ListBox>
    </div>
  )
}
