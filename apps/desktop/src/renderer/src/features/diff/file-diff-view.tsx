import { useMemo } from 'react'
import type { FileDiffOptions } from '@pierre/diffs'
import { FileDiff } from '@pierre/diffs/react'
import { useFileDiff } from './use-file-diff'

type FileDiffViewProps = {
  /** Filename for the diff header / language inference. */
  name: string
  /** Baseline side — the last saved content. */
  oldContent: string
  /** Current side — the unsaved draft. */
  newContent: string
}

/**
 * Local Diff surface: renders a Git-style comparison between two versions of a
 * file using `@pierre/diffs`. The underlying web component styles itself inside
 * a shadow DOM, so it stays isolated from the app's Tailwind / HeroUI styles;
 * we only pick the pierre theme pair so it tracks the OS light / dark mode and
 * matches markforge's black / white / gray language.
 */
export function FileDiffView({
  name,
  oldContent,
  newContent
}: FileDiffViewProps): React.JSX.Element {
  const fileDiff = useFileDiff({ name, oldContent, newContent })

  const options = useMemo<FileDiffOptions<undefined>>(
    () => ({
      theme: { light: 'pierre-light', dark: 'pierre-dark' },
      diffStyle: 'unified',
      overflow: 'wrap',
      expandUnchanged: false
    }),
    []
  )

  return (
    <FileDiff
      fileDiff={fileDiff}
      options={options}
      disableWorkerPool
      className="block text-[13px]"
    />
  )
}
