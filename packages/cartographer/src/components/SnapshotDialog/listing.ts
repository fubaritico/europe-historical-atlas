import type { SnapshotEntry } from '../../persistence/draft/draftStore'

/** The list as it stands: being read, read, or not readable. */
export type Listing =
  | { state: 'reading' }
  | { state: 'read'; entries: SnapshotEntry[] }
  | { state: 'failed'; reason: string }
