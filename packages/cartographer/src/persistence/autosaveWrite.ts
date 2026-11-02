import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * What the automatic save writes at each pause (the dev, 2026-11-02: *"you keep everything — as in any software, as in
 * IntelliJ, it saves as you go"*): the copy `<map>.autosave.<date>` first, then the map open itself, silently — one
 * port for the keeper, so the order lives here and is tested, not in the composition root (review QUAL-001).
 */

/** The two writes. */
export interface AutosaveWrites {
  /**
   * Write the page as the autosave copy, over whatever an earlier pause left there.
   * @param document - the page
   * @param map - the copy's name
   * @returns once written
   */
  saveCopy: (document: YearDocument, map: string) => Promise<unknown>
  /**
   * Write the page over the map open, saying nothing when it works (`yearSession.saveSilently`).
   * @returns once written, or skipped while a save runs
   */
  saveMap: () => Promise<void>
}

/**
 * The automatic save's write: the copy, then the map. Either failing rejects — the keeper says it once, and the next
 * pause tries both again.
 * @param writes - the two writes
 * @returns the keeper's `write`
 */
export function writeCopyThenMap(
  writes: AutosaveWrites
): (document: YearDocument, map: string) => Promise<void> {
  return async (document, map) => {
    await writes.saveCopy(document, map)
    await writes.saveMap()
  }
}
