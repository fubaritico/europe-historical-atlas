/**
 * The gestures, as operations on a {@link YearDocument}. Pure arithmetic over arrays — no canvas, no DOM,
 * exercisable with literals.
 *
 * Every one of them respects the document's invariant: **the anchor table only grows.** Moving a point
 * writes into it, deleting a ring or a polity writes only to the lists of indices, and the renumbering
 * happens once at save.
 */

import { vassalsOf } from '../data/paintOrder'

import { MIN_RING_ANCHORS, referencedAnchors } from './yearDocument'

import type { YearDocument } from './yearDocument'
import type { YearPolity, YearProvenance } from '../data/yearFormat'

/** What removing a polity touched, in the terms the status bar reports. */
export interface RemovalReport {
  /** How many rings the polity held. */
  rings: number
  /** Anchors still held by someone else — untouched, and the reason nothing moved. */
  anchorsKept: number
  /** Anchors nothing points at any more. They leave the file at save, not now. */
  anchorsOrphaned: number
  /** Pair borders that named it and went with it. */
  bordersDropped: number
}

/**
 * Add a point to the table and return its id, which is its index.
 * @param doc - the document to edit
 * @param point - the `[longitude, latitude]` pair
 * @param sourceId - which declared provenance it came from
 * @returns the new anchor's index
 */
export function addAnchor(doc: YearDocument, point: [number, number], sourceId: number): number {
  doc.anchors.push([point[0], point[1]])
  doc.anchorSource.push(sourceId)
  return doc.anchors.length - 1
}

/**
 * Move a point.
 *
 * Every ring holding this index follows, in this one write — which is the whole purpose of storing indices
 * rather than coordinates. Two outlines over the same run cannot come apart, because there is nothing to
 * come apart.
 * @param doc - the document to edit
 * @param index - the anchor to move
 * @param point - where to put it
 * @returns `true` when the anchor existed
 */
export function moveAnchor(doc: YearDocument, index: number, point: [number, number]): boolean {
  if (index < 0 || index >= doc.anchors.length) return false
  doc.anchors[index] = [point[0], point[1]]
  return true
}

/**
 * How many paths hold an anchor.
 *
 * What the status bar reports and what a delete confirmation needs: "96 anchors · 2 paths" is this count,
 * and it is the difference between removing a line and moving someone else's border.
 * @param doc - the document
 * @param index - the anchor to count
 * @returns the number of rings, declared gaps and dressed runs holding it
 */
export function pathsHolding(doc: YearDocument, index: number): number {
  let held = 0
  for (const claim of doc.claims)
    for (const ring of claim.rings) if (ring.includes(index)) held += 1
  for (const gap of doc.deliberateGaps) if (gap.ring.includes(index)) held += 1
  for (const run of doc.runs) if (run.run.includes(index)) held += 1
  return held
}

/**
 * Add a polity to the year's registry, with no territory.
 *
 * Territory-less is the normal starting state, not a transient one: at 1100 OHM gives the Kingdom of France
 * its identity and no geometry at all.
 * @param doc - the document to edit
 * @param polity - the identity to add
 * @returns `false` when the id is already taken, which is refused rather than merged
 */
export function addPolity(doc: YearDocument, polity: YearPolity): boolean {
  if (doc.polities.some((existing) => existing.id === polity.id)) return false
  doc.polities.push({ ...polity })
  return true
}

/**
 * Whether making `suzerain` the lord of `polityId` would close a loop of homage — the polity itself, or
 * one of its own vassals, at any depth.
 * @param doc - the document
 * @param polityId - the polity whose suzerain changes
 * @param suzerain - the suzerain proposed, or `null`
 * @returns `true` when `suzerain` is the polity itself or one of its vassals (`vassalsOf`)
 */
export function wouldLoopHomage(
  doc: YearDocument,
  polityId: string,
  suzerain: string | null
): boolean {
  if (suzerain === null) return false
  return suzerain === polityId || vassalsOf(doc.polities, polityId).has(suzerain)
}

/**
 * Change a polity's properties — `s07`'s *"reopen a polity's form and change it"*. **Its id stays**:
 * claims, vassals, borders and colours point at it, and `s07` keeps *"the same polity, with the same
 * id"*. The polity keeps its place in the list, so its place in the stack (`s16`).
 *
 * **A loop of homage is refused here**, not only by the form's list: the document is the authority, and
 * a loop would leave `paintOrder` painting the polities last and `documentFaults` saying so forever.
 * @param doc - the document to edit
 * @param polity - the new properties, under the id of the polity to change
 * @returns `false` when no polity has that id, or the suzerain would close a loop — and nothing changed
 */
export function updatePolity(doc: YearDocument, polity: YearPolity): boolean {
  const at = doc.polities.findIndex((existing) => existing.id === polity.id)
  if (at < 0 || wouldLoopHomage(doc, polity.id, polity.suzerain)) return false
  doc.polities[at] = { ...polity }
  return true
}

/**
 * Close a ring for a polity, from a list of anchors already placed.
 * @param doc - the document to edit
 * @param polityId - who is drawing
 * @param ring - the anchor indices, in order, closure implied
 * @returns `false` when the polity is unknown or the ring cannot enclose an area
 */
export function closeRing(doc: YearDocument, polityId: string, ring: number[]): boolean {
  if (ring.length < MIN_RING_ANCHORS) return false
  if (!doc.polities.some((polity) => polity.id === polityId)) return false
  if (ring.some((index) => index < 0 || index >= doc.anchors.length)) return false
  const claim = doc.claims.find((existing) => existing.polity === polityId)
  if (claim) claim.rings.push([...ring])
  else doc.claims.push({ polity: polityId, rings: [[...ring]] })
  return true
}

/**
 * The id of a provenance, declaring it on first use.
 *
 * Matched on **name and licence together**: the same words under another licence are another source,
 * and folding them would put a stretch under terms it was not reported under.
 * @param doc - the document to edit
 * @param provenance - what the geometry was taken from, and under what terms
 * @returns the id anchors of that provenance carry
 */
export function declareSource(doc: YearDocument, provenance: Provenance): number {
  const known = doc.sources.find(
    (source) => source.name === provenance.name && source.licence === provenance.licence
  )
  if (known) return known.id
  const id = doc.sources.reduce((next, source) => Math.max(next, source.id + 1), 0)
  doc.sources.push({ id, name: provenance.name, licence: provenance.licence })
  return id
}

/**
 * Where geometry was taken from and under what terms — a {@link YearProvenance} before the document has
 * given it an id. What the tools carry with every point until the outline enters the document.
 */
export type Provenance = Omit<YearProvenance, 'id'>

/** One point of an outline drawn by hand, with where it was taken from. */
export interface OutlinePoint {
  /** `[longitude, latitude]`. */
  at: readonly [number, number]
  /**
   * Its provenance — a point placed by eye and a point snapped onto the coast are recorded under
   * different sources, and one ring may hold both.
   */
  provenance: Provenance
  /**
   * An anchor already in the document that this point **is** — a neighbour's, met along a shared
   * border. Reused by its index, never copied: two outlines over one anchor are one border, and a copy
   * would drift from it at the first move (`H-06`). `null` or absent for a new point.
   */
  anchor?: number | null
}

/**
 * Give a polity a closed outline drawn point by point — what the Pen commits when the ring closes.
 *
 * **The whole outline enters at once, and only when it closes** (the dev's call, 2026-10-11): until then
 * it is the session's, not the document's, so ‹escape› has nothing to take back and one `ctrl+z` removes
 * the lot — `H-10`'s *one gesture is one step*, applied to the outline. Refusals are checked **before**
 * anything is written, so a refused outline leaves no anchor and no source behind.
 * @param doc - the document to edit
 * @param polityId - who the outline is drawn for
 * @param points - each anchor, in order, closure implied, with its own provenance
 * @returns `false` when the polity is unknown, the points cannot enclose an area, or a point names an
 *   anchor the document does not hold — and nothing was written
 */
export function addOutline(
  doc: YearDocument,
  polityId: string,
  points: readonly OutlinePoint[]
): boolean {
  if (points.length < MIN_RING_ANCHORS) return false
  if (!doc.polities.some((polity) => polity.id === polityId)) return false
  const count = doc.anchors.length
  if (
    points.some(
      (point) => typeof point.anchor === 'number' && !(point.anchor >= 0 && point.anchor < count)
    )
  ) {
    return false
  }
  const ring = points.map((point) =>
    typeof point.anchor === 'number'
      ? point.anchor
      : addAnchor(doc, [point.at[0], point.at[1]], declareSource(doc, point.provenance))
  )
  return closeRing(doc, polityId, ring)
}

/**
 * Give one polity a path running over another's anchors.
 *
 * **The list is duplicated, the anchors are not** — the dev's own mechanism, and the condition the whole
 * thing turns on. Reversed, because two owners walk their shared boundary in opposite directions. Copying
 * the points instead would put the two outlines on independent geometry and bring back the sliver that
 * deriving borders from the raster abolished at render time.
 * @param doc - the document to edit
 * @param run - the anchor indices to reuse, in the source's order
 * @param intoPolity - who gains the path
 * @returns `false` when the polity is unknown or the run cannot enclose anything
 */
export function duplicateRun(doc: YearDocument, run: number[], intoPolity: string): boolean {
  if (run.length < MIN_RING_ANCHORS) return false
  if (!doc.polities.some((polity) => polity.id === intoPolity)) return false
  if (run.some((index) => index < 0 || index >= doc.anchors.length)) return false
  return closeRing(doc, intoPolity, [...run].reverse())
}

/**
 * Split a removed claim's anchors into those someone else still holds and those nothing does.
 * @param held - the anchors the removed claim used
 * @param doc - the document, already without that claim
 * @returns how many were kept, and how many are orphaned
 */
function accountForAnchors(
  held: ReadonlySet<number>,
  doc: YearDocument
): { anchorsKept: number; anchorsOrphaned: number } {
  const stillLive = referencedAnchors(doc)
  let anchorsKept = 0
  for (const index of held) if (stillLive.has(index)) anchorsKept += 1
  return { anchorsKept, anchorsOrphaned: held.size - anchorsKept }
}

/**
 * Remove a polity from the year: its identity, its claim, and the borders that named it.
 *
 * **It never touches the anchor table, and that is the point.** A vanished polity's coastline anchors are
 * its neighbour's too; deleting them would move a border nobody edited, on screen, with no error — the
 * sliver by the back door. What goes is the *claim*: the lists of indices. Anchors nothing holds any more
 * leave at save, through the one renumbering, counted here so the author is told.
 *
 * Dressed **runs are left alone**, even when every anchor under them is now orphaned: a hand-set stroke is
 * a decision, and dropping it here would undo it silently. It shows in `{Overrides}` as orphaned.
 *
 * A vassal of the removed polity is left **sovereign rather than dangling**: an id pointing at nothing is a
 * consistency failure the file could not be reopened with.
 * @param doc - the document to edit
 * @param polityId - who to remove
 * @returns what it touched, or `null` when the polity was not there
 */
export function removePolity(doc: YearDocument, polityId: string): RemovalReport | null {
  const index = doc.polities.findIndex((polity) => polity.id === polityId)
  if (index === -1) return null

  const claim = doc.claims.find((existing) => existing.polity === polityId)
  const held = new Set<number>()
  if (claim) for (const ring of claim.rings) for (const i of ring) held.add(i)

  doc.polities.splice(index, 1)
  doc.claims = doc.claims.filter((existing) => existing.polity !== polityId)
  const before = doc.pairs.length
  doc.pairs = doc.pairs.filter((pair) => !pair.between.includes(polityId))
  for (const polity of doc.polities) if (polity.suzerain === polityId) polity.suzerain = null

  return {
    rings: claim?.rings.length ?? 0,
    ...accountForAnchors(held, doc),
    bordersDropped: before - doc.pairs.length,
  }
}
