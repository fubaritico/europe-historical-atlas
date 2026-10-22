import type { SnapshotEntry } from '../../persistence/draft/draftStore'

/** The list as it stands: being read, read, or not readable — why is in the console, English whatever the page. */
export type Listing =
  { state: 'reading' } | { state: 'read'; entries: SnapshotEntry[] } | { state: 'failed' }
