/** One stored version of a file in Local History. */
export type HistoryEntry = {
  /** Unique, sortable id. */
  id: string
  /** Epoch milliseconds the snapshot was taken. */
  timestamp: number
  /** Byte length of the snapshot content. */
  size: number
}

/** Which timeline item the diff view is currently showing. */
export type TimelineSelection =
  /** The unsaved draft compared against the last saved content. */
  | { kind: 'draft' }
  /** A stored version compared against the current content. */
  | { kind: 'version'; id: string }
