/**
 * Pasting into a map what the clipboard holds (CARTO-345, `files/plans/cartographer/copy-paste-between-maps.md`,
 * scenarios in `scenarii/s22-copy-paste.md`).
 *
 * **In place** (the dev, 2026-11-03): every point arrives at its own coordinates — the two maps share one backdrop,
 * so an outline falls where it was. **No preview, no validation**: the paste is written at once, and a paste that
 * cannot be made writes nothing and says why. One gesture, so one step of the history: the caller takes the
 * snapshot around the call.
 */

import { addOutline, addPolity } from './documentEdits'
import { weldPastedRings } from './pasteWeld'
import { MIN_RING_ANCHORS } from './yearDocument'

import type { CopiedPolity } from './clipboard'
import type { YearDocument } from './yearDocument'

/** What pasting a polity did, in the terms the status bar reports. */
export interface PolityPasted {
  /** The pasted polity's id in the target map — the copied one, or the first free one after it. */
  id: string
  /** How many points it brought, every ring together. */
  points: number
  /** How many of them took a point of the map — welded onto a point, or onto a stretch (`pasteWeld.ts`). */
  welded: number
  /**
   * The name of its suzerain when the target map does not hold it, and it was therefore pasted sovereign;
   * `null` when it was pasted as it was copied.
   */
  sovereignWithout: string | null
}

/**
 * Why a polity was not pasted — nothing was written.
 *
 * `'name-taken'`: a polity of the target map bears the same name — two polities cannot (the dev, 2026-11-05);
 * `'homage'`: its suzerain is in the map, but seating it there would go deeper than a map allows, or close a loop.
 */
export interface PolityPasteRefusal {
  /** Which refusal. */
  refused: 'name-taken' | 'homage'
}

/**
 * Whether a paste's answer is a refusal.
 * @param result - what {@link pastePolity} returned
 * @returns `true` when nothing was written
 */
export function isPolityPasteRefusal(
  result: PolityPasted | PolityPasteRefusal
): result is PolityPasteRefusal {
  return 'refused' in result
}

/**
 * The copied id when the map does not use it, else the first `<id>-<n>` it does not, counting from 2.
 *
 * Ids are a map's own: 122 of the backup's 144 are absent from `1100` (measured 2026-11-03), so a polity is never
 * matched across maps by its id, and an id already taken is another polity's, not this one.
 * @param id - the copied polity's id
 * @param taken - the ids of the target map
 * @returns a free id
 */
function freeId(id: string, taken: ReadonlySet<string>): string {
  if (!taken.has(id)) return id
  // Terminates: `taken` is finite, so some suffix is free.
  let suffix = 2
  while (taken.has(`${id}-${String(suffix)}`)) suffix += 1
  return `${id}-${String(suffix)}`
}

/**
 * Check that a copied polity is one a map could have given — the clipboard's reader refuses anything else, so what
 * fails here is a defect.
 * @param copied - the polity from the clipboard
 * @throws when a ring holds fewer than {@link MIN_RING_ANCHORS} points, or a vassal comes without its suzerain's name
 */
function assertPastable(copied: CopiedPolity): void {
  const { name, suzerain } = copied.polity
  if (copied.rings.some((ring) => ring.length < MIN_RING_ANCHORS)) {
    throw new Error(
      `[Cartographer] "${name}" cannot be pasted: a ring of fewer than ${String(MIN_RING_ANCHORS)} points.`
    )
  }
  if (suzerain !== null && copied.suzerainName === null) {
    throw new Error(
      `[Cartographer] "${name}" cannot be pasted: it owes "${suzerain}", copied without its name.`
    )
  }
}

/**
 * Paste a polity, sheet and outline, into a map — at the end of its list, so at the top of `{Polities}` (the dev,
 * 2026-11-04), every point in place under its own source, declared in the map if the map did not have it.
 *
 * Its suzerain is found in the map **by its name**, never its id (the dev, 2026-11-05: of the backup's 56 vassals
 * pasted into `1100`, 9 find their suzerain by id, 29 by name — the 20 others hold it under Cliopatria's id). Found,
 * the polity is that one's vassal; not found, it is pasted sovereign and the suzerain's name is said back (`s22`).
 *
 * **Welded onto the map** (`pasteWeld.ts`): a point within `weldKm` of the map's takes it, and the map's neighbours
 * gain the points put on their stretches.
 * @param doc - the target map, edited in place
 * @param copied - the polity from the clipboard
 * @param weldKm - the weld distance, `PASTE_WELD_KM` in the application
 * @returns what was pasted, or why nothing was
 * @throws as {@link assertPastable} does, before anything is written; and, once the sheet is in, on a defect the weld
 *   meets (a point of the map with no source, a stretch in no ring, a point that is no number) or a ring the document
 *   refuses — none of which a paste reaches today. Those leave the map **partly written**, the sheet in and points
 *   perhaps put on the neighbours' stretches: the caller puts back the snapshot it took before the gesture
 */
export function pastePolity(
  doc: YearDocument,
  copied: CopiedPolity,
  weldKm: number
): PolityPasted | PolityPasteRefusal {
  assertPastable(copied)
  if (doc.polities.some((polity) => polity.name === copied.polity.name)) {
    return { refused: 'name-taken' }
  }

  const id = freeId(copied.polity.id, new Set(doc.polities.map((polity) => polity.id)))
  const { suzerainName } = copied
  const suzerain =
    suzerainName === null ? undefined : doc.polities.find((polity) => polity.name === suzerainName)
  const sovereignWithout = suzerain === undefined ? suzerainName : null
  const sheet = { ...copied.polity, id, suzerain: suzerain?.id ?? null }
  if (!addPolity(doc, sheet)) return { refused: 'homage' }

  // Every ring welded onto the map before any enters it, so the pasted rings never weld onto one another.
  const rings = weldPastedRings(doc, copied.rings, weldKm)
  for (const ring of rings) {
    // The polity was just added, the ring is long enough and its anchors are the map's: a refusal is a defect.
    if (!addOutline(doc, id, ring.points)) {
      throw new Error(`[Cartographer] the document refused a ring of "${copied.polity.name}".`)
    }
  }
  const points = copied.rings.reduce((sum, ring) => sum + ring.length, 0)
  const welded = rings.reduce((sum, ring) => sum + ring.welded, 0)
  return { id, points, welded, sovereignWithout }
}
