import type { Payload } from 'payload'

/** One record to rename once: its id, the name it must still bear, and its new name. */
export interface Rename {
  /** The record's id. */
  id: number
  /** Its name in the base, which must still be its name for anything to change. */
  was: string
  /** Its new name. */
  now: string
}

/** The collections whose « Nom » is a plain French text, renamed by these one-shot scripts. */
export type RenamedCollection = 'territories' | 'people'

/** What Payload is asked: a record by its id, and an update — the two calls a rename makes. */
export type RenamePort = Pick<Payload, 'findByID' | 'update'>

/**
 * Rename records one at a time, through Payload's Local API, so each record passes the same rules as the form and its
 * hooks rename what cites it (CMS-495). A record that no longer bears its old name is left as it is and said on the
 * console; a refusal of Payload, or a record deleted since, stops the run with Payload's own error — the renames
 * before it stay done, and a second run skips them by their old name.
 * @param payload - Payload, or a stand-in for its two calls
 * @param collection - the collection renamed
 * @param renames - the records and their names
 * @returns how many records were renamed
 */
export async function renameRecords(
  payload: RenamePort,
  collection: RenamedCollection,
  renames: readonly Rename[]
): Promise<number> {
  let done = 0
  for (const rename of renames) {
    const record = await payload.findByID({ collection, id: rename.id, depth: 0 })
    if (record.name !== rename.was) {
      console.warn(`[CMS] ${collection} ${String(rename.id)} « ${record.name} »: left as it is`)
      continue
    }
    await payload.update({ collection, id: rename.id, data: { name: rename.now } })
    done += 1
  }
  return done
}
