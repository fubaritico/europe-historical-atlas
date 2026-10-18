import { refusalReason } from './yearArchive'

/**
 * Where the editor keeps its draft — the work since the last ‹ctrl+S› (CARTO-238).
 *
 * **A port**, like `YearArchive`: today the dev server keeps the draft on disk (`devServer/draftEndpoint.ts`);
 * the browser's own storage, for when that server is down, is a second implementation behind the same four
 * calls. Every module that drives a draft talks to this interface, and every test to a stub in memory.
 */

/** A draft as it is kept: the year, when it was written, and the three files a save would write. */
export interface Draft {
  /** The year it is a draft of. */
  year: number
  /** When it was written, as an ISO string — what the author is asked about (*"the draft of 15:42"*). */
  savedAt: string
  /**
   * The three files, exactly as ‹ctrl+S› would send them (`YearFiles`). Held as `unknown` because a draft
   * read back is checked only when it is reopened, by the readers a year goes through (`documentFromFiles`).
   */
  files: unknown
}

/** The drafts, as the editor reaches them. Every call rejects with the reason when it fails. */
export interface DraftStore {
  /**
   * Keep a draft, replacing the previous one of its year.
   * @param draft - the draft
   */
  write: (draft: Draft) => Promise<void>
  /**
   * The draft of a year.
   * @param year - the year
   * @returns the draft, or `null` when there is none
   */
  read: (year: number) => Promise<Draft | null>
  /**
   * Remove the draft of a year — after a save, which holds everything it held. Nothing to remove is fine.
   * @param year - the year
   */
  remove: (year: number) => Promise<void>
  /**
   * Keep the draft of a year under a dated name, out of the way of the next one — what *not resuming* does.
   * @param year - the year
   */
  setAside: (year: number) => Promise<void>
}

/**
 * Where the hourly snapshots go (CARTO-238, rung 2a) — write only: a snapshot is never read back, removed or
 * set aside by the keeper, so it is a port of its own rather than a fifth call on {@link DraftStore}.
 */
export interface SnapshotSink {
  /**
   * Keep a document as a snapshot, under its own dated name — every one is kept.
   * @param draft - the document, shaped as a draft
   */
  snapshot: (draft: Draft) => Promise<void>
}

/** One kept snapshot, as the list offers it. */
export interface SnapshotEntry {
  /** Its name, to ask for it. */
  name: string
  /** When it was taken, as an ISO string. */
  takenAt: string
}

/** Where the snapshots are read back from (CARTO-238, rung 2b). */
export interface SnapshotSource {
  /**
   * The snapshots of a year, newest first.
   * @param year - the year
   * @returns the list, empty when none was kept
   */
  listSnapshots: (year: number) => Promise<SnapshotEntry[]>
  /**
   * One snapshot, read as a draft — checked when it is opened, by the readers a year goes through.
   * @param year - the year
   * @param name - its name, from the list
   * @returns the snapshot
   */
  readSnapshot: (year: number, name: string) => Promise<Draft>
}

/**
 * Read the snapshot list a server answered, refusing what is not one.
 * @param value - the parsed body
 * @param year - the year asked for
 * @returns the entries
 * @throws an `Error` saying the answer is not a list of snapshots
 */
function readSnapshotList(value: unknown, year: number): SnapshotEntry[] {
  const list =
    value !== null && typeof value === 'object' && 'snapshots' in value
      ? value.snapshots
      : undefined
  if (
    !Array.isArray(list) ||
    !list.every(
      (entry: unknown) =>
        entry !== null &&
        typeof entry === 'object' &&
        'name' in entry &&
        'takenAt' in entry &&
        typeof entry.name === 'string' &&
        typeof entry.takenAt === 'string'
    )
  )
    throw new Error(`the snapshots of ${String(year)} could not be read — the answer is not a list`)
  return (list as SnapshotEntry[]).map(({ name, takenAt }) => ({ name, takenAt }))
}

/** What the dev-server draft store needs. */
export interface DevServerDraftStoreDeps {
  /** The fetch to use — the window's in the application, a stub in tests. */
  fetch: typeof fetch
  /** Where the endpoint is mounted — `DRAFT_ROUTE`. */
  route: string
}

/**
 * Read a kept draft, refusing one that does not even say its year and its time.
 * @param value - the parsed body
 * @param year - the year asked for
 * @returns the draft
 * @throws an `Error` naming what is missing
 */
function readDraft(value: unknown, year: number): Draft {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('year' in value) ||
    !('savedAt' in value) ||
    !('files' in value) ||
    typeof value.savedAt !== 'string'
  )
    throw new Error(
      `the draft of ${String(year)} is not a draft — it lacks its year, its time or its files`
    )
  if (value.year !== year)
    throw new Error(`the draft of ${String(year)} says it is of year ${String(value.year)}`)
  return { year, savedAt: value.savedAt, files: value.files }
}

/**
 * A draft store kept by the Cartographer's dev server — and the sink of its snapshots, the same endpoint.
 * @param deps - the fetch and the route
 * @returns the store
 */
export function createDevServerDraftStore(
  deps: DevServerDraftStoreDeps
): DraftStore & SnapshotSink & SnapshotSource {
  const at = (year: number, suffix = ''): string => `${deps.route}/${String(year)}${suffix}`
  const send = async (url: string, init: RequestInit): Promise<Response> => {
    const response = await deps.fetch(url, init)
    if (!response.ok) throw new Error(await refusalReason(response))
    return response
  }
  return {
    write: async (draft) => {
      await send(at(draft.year), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      })
    },
    read: async (year) => {
      // `no-store`: a draft is read right after one was written over it, and a cached copy would offer
      // the author the previous one.
      const response = await deps.fetch(at(year), { cache: 'no-store' })
      if (response.status === 404) return null
      if (!response.ok) throw new Error(await refusalReason(response))
      return readDraft(await response.json(), year)
    },
    remove: async (year) => {
      await send(at(year), { method: 'DELETE' })
    },
    setAside: async (year) => {
      await send(at(year, '/set-aside'), { method: 'POST' })
    },
    listSnapshots: async (year) => {
      const response = await deps.fetch(at(year, '/snapshots'), { cache: 'no-store' })
      if (!response.ok) throw new Error(await refusalReason(response))
      return readSnapshotList(await response.json(), year)
    },
    readSnapshot: async (year, name) => {
      const response = await deps.fetch(at(year, `/snapshots/${encodeURIComponent(name)}`), {
        cache: 'no-store',
      })
      if (!response.ok) throw new Error(await refusalReason(response))
      return readDraft(await response.json(), year)
    },
    snapshot: async (draft) => {
      await send(at(draft.year, '/snapshot'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      })
    },
  }
}
