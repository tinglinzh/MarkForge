import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Feather } from 'nucleo-glass-icons/react'
import { EditorContent } from '@tiptap/react'
import { Button, Spinner } from '@heroui/react'
import { useMarkdownEditor } from './use-markdown-editor'
import { EditorToolbar } from './editor-toolbar'
import { ScrollArea } from '@markForge/ui/components/ui/scroll-area'
import { HistoryIcon } from './icons'
import { useFileHistory } from '../history/use-file-history'
import { Timeline } from '../history/timeline'
import type { TimelineSelection } from '../history/history.types'
import { SaveIcon } from '../workspace/icons'
import type { ActiveDocument, DocumentStatus } from '../workspace/workspace.types'

// Lazy so the diff renderer (and its Shiki highlighter) stays out of the
// initial bundle — it only loads the first time the user opens the timeline.
const FileDiffView = lazy(() =>
  import('../diff/file-diff-view').then((m) => ({ default: m.FileDiffView }))
)

type EditorPanelProps = {
  document: ActiveDocument | null
  activePath: string | null
  status: DocumentStatus
  onSave: (content: string) => Promise<void>
  /** Restore a stored version; rewrites the file and reflects it in the editor. */
  onRestoreVersion: (id: string) => Promise<void>
}

/** Right pane: the Tiptap toolbar + writing surface for the active document. */
export function EditorPanel({
  document,
  activePath,
  status,
  onSave,
  onRestoreVersion
}: EditorPanelProps): React.JSX.Element {
  const [isDirty, setIsDirty] = useState(false)
  const [mode, setMode] = useState<'edit' | 'diff'>('edit')
  // Draft captured when opening the timeline, so the diff is a static snapshot
  // and typing never re-renders this panel (timeline mode is read-only anyway).
  const [diffDraft, setDiffDraft] = useState('')
  const [selection, setSelection] = useState<TimelineSelection>({ kind: 'draft' })
  const [loadedVersion, setLoadedVersion] = useState<{ id: string; content: string } | null>(null)
  const draftRef = useRef<string>('')

  const handleChange = useCallback(
    (markdown: string) => {
      draftRef.current = markdown
      setIsDirty(markdown !== (document?.content ?? ''))
    },
    [document?.content]
  )

  const editor = useMarkdownEditor({ content: document?.content ?? null, onChange: handleChange })
  const hasDocument = status === 'ready' && document !== null
  const fileName = activePath?.split('/').at(-1) ?? null
  const baseline = document?.content ?? ''
  const hasDraft = mode === 'diff' && diffDraft !== baseline

  // Local History entries for the active file; refreshed after save / restore.
  const { entries, loading, readVersion } = useFileHistory({
    root: document?.root ?? null,
    path: document?.path ?? null,
    enabled: mode === 'diff',
    refreshKey: baseline
  })
  // Loading a new document resets the dirty baseline and returns to edit mode.
  useEffect(() => {
    draftRef.current = document?.content ?? ''
    setIsDirty(false)
    setMode('edit')
  }, [document?.path, document?.root, document?.content])

  const toggleMode = useCallback(() => {
    if (mode === 'diff') {
      setMode('edit')
      return
    }
    setDiffDraft(draftRef.current)
    setSelection({ kind: 'draft' })
    setMode('diff')
  }, [mode])

  // The selection actually shown: with no unsaved edits and a "draft" selection,
  // fall back to comparing the newest stored version. Derived so changing files
  // or saving never leaves a stale selection behind.
  const effectiveSelection: TimelineSelection =
    selection.kind === 'draft' && !hasDraft && entries[0]
      ? { kind: 'version', id: entries[0].id }
      : selection
  const selectedVersionId = effectiveSelection.kind === 'version' ? effectiveSelection.id : null

  // Fetch the selected version's content for the diff's "old" side.
  useEffect(() => {
    if (selectedVersionId == null) return
    let cancelled = false
    void readVersion(selectedVersionId).then((content) => {
      if (!cancelled) setLoadedVersion({ id: selectedVersionId, content })
    })
    return () => {
      cancelled = true
    }
  }, [selectedVersionId, readVersion])

  // Only treat the loaded content as current once it matches the selection.
  const versionContent =
    selectedVersionId != null && loadedVersion?.id === selectedVersionId
      ? loadedVersion.content
      : null

  const save = useCallback(async () => {
    if (!hasDocument || !isDirty) return
    await onSave(draftRef.current)
    setIsDirty(false)
  }, [hasDocument, isDirty, onSave])

  // Restore a stored version. The write + fresh snapshot happen in the main
  // process; the resulting document change returns the panel to edit mode.
  const restore = useCallback((id: string) => onRestoreVersion(id), [onRestoreVersion])

  // ⌘S / Ctrl+S to save the active document.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [save])

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col rounded-2xl bg-card/70 shadow-panel backdrop-blur-md">
      <header className="drag-region flex h-14 shrink-0 items-center justify-between gap-4 px-5">
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-foreground">
            {fileName ?? ''}
            {isDirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />}
          </span>
          {activePath && (
            <span className="truncate text-[11px] text-muted-foreground" title={activePath}>
              {activePath}
            </span>
          )}
        </div>
        {hasDocument && editor && (
          <div className="no-drag flex items-center gap-2">
            {mode === 'edit' && <EditorToolbar editor={editor} />}
            <span className="h-4 w-px bg-border" aria-hidden />
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label={mode === 'edit' ? '查看时间线与版本对比' : '返回编辑'}
              aria-pressed={mode === 'diff'}
              onPress={toggleMode}
              className={[
                'h-8 w-8 min-w-0 bg-transparent text-muted-foreground',
                'hover:bg-accent hover:text-accent-foreground',
                mode === 'diff' ? 'bg-accent text-accent-foreground' : ''
              ].join(' ')}
            >
              <HistoryIcon size={16} />
            </Button>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="保存 (⌘S)"
              isDisabled={!isDirty}
              onPress={() => void save()}
              className="h-8 w-8 min-w-0 bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <SaveIcon size={16} />
            </Button>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {!activePath ? (
          <CenteredHint
            icon={<Feather size={44} />}
            text="从左侧选择或新建一个 Markdown 文件，开始阅读与创作"
          />
        ) : status === 'loading' ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="sm" />
          </div>
        ) : status === 'error' ? (
          <CenteredHint text="无法读取该文件" />
        ) : mode === 'diff' ? (
          <div className="flex h-full gap-1 pl-2">
            <Timeline
              entries={entries}
              loading={loading}
              hasDraft={hasDraft}
              selection={effectiveSelection}
              onSelect={setSelection}
              onRestore={(id) => void restore(id)}
            />
            <ScrollArea className="min-w-0 flex-1">
              <div className="px-4 pb-12 pt-2">
                <DiffArea
                  fileName={fileName ?? 'document.md'}
                  selection={effectiveSelection}
                  hasDraft={hasDraft}
                  baseline={baseline}
                  diffDraft={diffDraft}
                  versionContent={versionContent}
                />
              </div>
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="px-6 pb-16 pt-2">
              <EditorContent editor={editor} />
            </div>
          </ScrollArea>
        )}
      </div>
    </section>
  )
}

type DiffAreaProps = {
  fileName: string
  selection: TimelineSelection
  hasDraft: boolean
  /** Current saved content (the diff's "new" side for stored versions). */
  baseline: string
  /** Snapshot of the unsaved draft. */
  diffDraft: string
  /** Loaded content of the selected stored version, or null while loading. */
  versionContent: string | null
}

/** Resolves the timeline selection into the right two sides to diff. */
function DiffArea({
  fileName,
  selection,
  hasDraft,
  baseline,
  diffDraft,
  versionContent
}: DiffAreaProps): React.JSX.Element {
  if (selection.kind === 'draft') {
    if (!hasDraft) return <CenteredHint text="当前没有未保存的修改" />
    return <DiffRenderer name={fileName} oldContent={baseline} newContent={diffDraft} />
  }

  if (versionContent === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="sm" />
      </div>
    )
  }
  if (versionContent === baseline) {
    return <CenteredHint text="该版本与当前内容一致" />
  }
  return <DiffRenderer name={fileName} oldContent={versionContent} newContent={baseline} />
}

function DiffRenderer({
  name,
  oldContent,
  newContent
}: {
  name: string
  oldContent: string
  newContent: string
}): React.JSX.Element {
  return (
    <div className="mx-auto max-w-[860px]">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <Spinner size="sm" />
          </div>
        }
      >
        <FileDiffView name={name} oldContent={oldContent} newContent={newContent} />
      </Suspense>
    </div>
  )
}

function CenteredHint({ text, icon }: { text: string; icon?: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-[13px] text-muted-foreground">
      {icon}
      {text}
    </div>
  )
}
