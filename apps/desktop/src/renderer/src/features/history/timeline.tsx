import { Button, Spinner } from '@heroui/react'
import { RestoreIcon } from '../editor/icons'
import { formatAbsoluteTime, formatRelativeTime } from './relative-time'
import type { HistoryEntry, TimelineSelection } from './history.types'

type TimelineProps = {
  entries: HistoryEntry[]
  loading: boolean
  /** Show the leading "未保存的修改" row (only when there are unsaved edits). */
  hasDraft: boolean
  selection: TimelineSelection
  onSelect: (selection: TimelineSelection) => void
  /** Restore a stored version back into the file. */
  onRestore: (id: string) => void
}

/**
 * VS Code-style Timeline: a vertical list of file versions, newest first, with
 * an optional leading entry for unsaved edits. Selecting a row drives the diff
 * view; each stored version offers an inline restore action.
 */
export function Timeline({
  entries,
  loading,
  hasDraft,
  selection,
  onSelect,
  onRestore
}: TimelineProps): React.JSX.Element {
  return (
    <div className="flex h-full w-60 shrink-0 flex-col">
      <div className="px-3 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        时间线
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {hasDraft && (
          <Row
            title="未保存的修改"
            subtitle="与已保存内容对比"
            isSelected={selection.kind === 'draft'}
            onSelect={() => onSelect({ kind: 'draft' })}
          />
        )}

        {loading && entries.length === 0 ? (
          <div className="flex justify-center py-6">
            <Spinner size="sm" />
          </div>
        ) : entries.length === 0 && !hasDraft ? (
          <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
            暂无历史版本，保存后会自动记录
          </p>
        ) : (
          entries.map((entry, index) => (
            <Row
              key={entry.id}
              title={formatRelativeTime(entry.timestamp)}
              subtitle={index === 0 ? '最新保存' : formatAbsoluteTime(entry.timestamp)}
              tooltip={formatAbsoluteTime(entry.timestamp)}
              isSelected={selection.kind === 'version' && selection.id === entry.id}
              onSelect={() => onSelect({ kind: 'version', id: entry.id })}
              onRestore={index === 0 ? undefined : () => onRestore(entry.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

type RowProps = {
  title: string
  subtitle: string
  tooltip?: string
  isSelected: boolean
  onSelect: () => void
  onRestore?: () => void
}

function Row({
  title,
  subtitle,
  tooltip,
  isSelected,
  onSelect,
  onRestore
}: RowProps): React.JSX.Element {
  return (
    <div
      role="button"
      tabIndex={0}
      title={tooltip}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={[
        'group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors',
        isSelected
          ? 'bg-accent text-accent-foreground'
          : 'text-sidebar-foreground hover:bg-accent/60'
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
      </div>
      {onRestore && (
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label="恢复此版本"
          onPress={onRestore}
          className="h-7 w-7 min-w-0 shrink-0 bg-transparent text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
        >
          <RestoreIcon size={15} />
        </Button>
      )}
    </div>
  )
}
