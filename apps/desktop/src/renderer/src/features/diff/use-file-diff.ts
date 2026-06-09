import { useMemo } from 'react'
import { parseDiffFromFile, type FileDiffMetadata } from '@pierre/diffs'

type UseFileDiffOptions = {
  /** Filename shown in the diff header and used to infer the language. */
  name: string
  /** Baseline side of the comparison (e.g. last saved content). */
  oldContent: string
  /** Current side of the comparison (e.g. the unsaved draft). */
  newContent: string
}

/**
 * Computes a {@link FileDiffMetadata} between two versions of a single file.
 * Memoized on the inputs so the (potentially expensive) parse only re-runs when
 * a side actually changes. Used by the Local Diff view to compare the saved
 * baseline against unsaved edits.
 */
export function useFileDiff({
  name,
  oldContent,
  newContent
}: UseFileDiffOptions): FileDiffMetadata {
  return useMemo(
    () => parseDiffFromFile({ name, contents: oldContent }, { name, contents: newContent }),
    [name, oldContent, newContent]
  )
}
