/**
 * The clipboard of the Cartographer — what ‹cmd+C› keeps, to be pasted into another map (CARTO-345,
 * `files/plans/cartographer/copy-paste-between-maps.md`, the dev, 2026-11-03).
 *
 * **Coordinates, never anchor indices.** An index means something in one anchor table only; the map a copy is pasted
 * into has its own. So what is copied is resolved: every point at its `[longitude, latitude]`, with the provenance it
 * was recorded under — a point keeps its source wherever it goes. Pasting (`paste.ts`) puts each point **in place**,
 * at those coordinates, as a new anchor of the target map: it shares none with the map's own.
 *
 * **What it holds is either polities or a stretch** — one pastes what one selected: a polity whole, sheet and
 * outline, or several from `{Polities}`; or a run of anchors that follow one another on one ring.
 */

import { z } from 'zod/mini'

import { yearPolitySchema } from '../data/yearFormat'

import { MIN_RING_ANCHORS } from './yearDocument'

import type { Provenance } from './documentEdits'
import type { YearDocument } from './yearDocument'
import type { YearPolity } from '../data/yearFormat'

/** One copied point: where it is, and what it was taken from. */
export interface ClipboardPoint {
  /** `[longitude, latitude]`. */
  at: [number, number]
  /** Its source and licence, as the map it came from recorded them. */
  provenance: Provenance
}

/** One copied polity: its sheet, and its rings resolved into points, closure implied. */
export interface CopiedPolity {
  /** The sheet, copied — id included, though a paste never trusts it to be free. */
  polity: YearPolity
  /**
   * Its suzerain's name in the map it was copied from, or `null` when it is sovereign — said back when the target
   * map does not hold that suzerain, since only its id travels in the sheet.
   */
  suzerainName: string | null
  /** Every ring of its claim, each point in place; empty for a polity with no territory. */
  rings: ClipboardPoint[][]
}

/** Polities copied from a map — one, or several selected in `{Polities}`. */
export interface CopiedPolities {
  /** What the clipboard holds. */
  kind: 'polities'
  /** The map they were copied from — its folder's name, said back when pasting. */
  map: string
  /** The polities, in the order the map lists them. */
  polities: CopiedPolity[]
}

/** A stretch copied from a map: anchors that follow one another on one ring. */
export interface CopiedStretch {
  /** What the clipboard holds. */
  kind: 'stretch'
  /** The map it was copied from. */
  map: string
  /** The name of the polity whose ring it was copied from, said back in the status bar. */
  polity: string
  /**
   * Whether it is a whole ring, closure implied — copied as a stretch since 2026-11-05 (the dev: there is no outline
   * replacement; a whole outline is a stretch like any other). A whole ring pasted onto a polity becomes one more ring
   * of it; an open stretch is merged into the polity's outline.
   */
  closed: boolean
  /** The points, in the ring's order — two at least, three at least when closed. */
  points: ClipboardPoint[]
}

/** What the clipboard holds. */
export type ClipboardContent = CopiedPolities | CopiedStretch

/** The fewest points a stretch has: its two ends. */
const MIN_STRETCH_POINTS = 2

/** Why a selection of anchors is not a stretch that can be copied. */
export type StretchRefusal =
  /** Fewer than two anchors. */
  | 'too-few'
  /** The anchors do not follow one another on any single ring. */
  | 'not-a-run'

/**
 * A point of the document, resolved with its provenance.
 * @param doc - the document
 * @param index - the anchor
 * @returns the point, in place
 * @throws when the anchor or its source is not in the document — a document opened is cross-checked, so this is a
 *   defect said loudly, never a point copied without its source
 */
function pointOf(doc: YearDocument, index: number): ClipboardPoint {
  const at = doc.anchors[index]
  const sourceId = doc.anchorSource[index]
  const source = doc.sources.find((each) => each.id === sourceId)
  if (at === undefined || source === undefined) {
    throw new Error(
      `[Cartographer] anchor ${String(index)} cannot be copied: it or its source is not in the document.`
    )
  }
  return { at: [at[0], at[1]], provenance: { name: source.name, licence: source.licence } }
}

/**
 * A polity's name, by its id.
 * @param doc - the map
 * @param id - the polity's id, or `null`
 * @returns its name, or `null` when the id is `null`
 * @throws when the id names no polity of the map — a suzerain the registry lacks is refused when a map opens, so
 *   this is a defect said loudly, never a name made up
 */
function nameOf(doc: YearDocument, id: string | null): string | null {
  if (id === null) return null
  const found = doc.polities.find((polity) => polity.id === id)
  if (found === undefined) {
    throw new Error(`[Cartographer] the suzerain "${id}" names no polity of the map.`)
  }
  return found.name
}

/**
 * Copy polities, sheet and outline, resolved into points.
 * @param doc - the map being copied from
 * @param polityIds - the polities selected
 * @param map - the map's name
 * @returns the copy, in the map's order; `null` when none of the ids names a polity of the map
 */
export function copyPolities(
  doc: YearDocument,
  polityIds: readonly string[],
  map: string
): CopiedPolities | null {
  const wanted = new Set(polityIds)
  const polities = doc.polities
    .filter((polity) => wanted.has(polity.id))
    .map((polity): CopiedPolity => {
      const claim = doc.claims.find((each) => each.polity === polity.id)
      return {
        polity: structuredClone(polity),
        suzerainName: nameOf(doc, polity.suzerain),
        rings: (claim?.rings ?? []).map((ring) => ring.map((index) => pointOf(doc, index))),
      }
    })
  return polities.length === 0 ? null : { kind: 'polities', map, polities }
}

/** Where a run of anchors starts on a ring, and whether it is the whole ring. */
interface RunOnRing {
  /** The position on the ring the run starts at — the ring's first for a whole ring. */
  start: number
  /** Whether the anchors are every anchor of the ring. */
  closed: boolean
}

/**
 * Where a set of anchors runs along a ring: the position the run starts at, when the anchors follow one another.
 * @param ring - the ring's anchors
 * @param anchors - the anchors selected
 * @returns the run, or `null` when they are not one run of this ring
 */
function runOn(ring: readonly number[], anchors: ReadonlySet<number>): RunOnRing | null {
  const inside = ring.map((index) => anchors.has(index))
  const count = inside.filter(Boolean).length
  if (count !== anchors.size || new Set(ring).size !== ring.length) return null
  if (count === ring.length) return { start: 0, closed: true }
  // One run on a closed ring is one place where an outside anchor is followed by an inside one.
  const starts = inside.flatMap((isIn, at) =>
    isIn && inside[(at - 1 + ring.length) % ring.length] === false ? [at] : []
  )
  const start = starts.length === 1 ? starts[0] : undefined
  return start === undefined ? null : { start, closed: false }
}

/**
 * Copy a stretch: anchors that follow one another on one ring, in the ring's order — or every anchor of a ring, a
 * stretch closed on itself (the dev, 2026-11-05: a whole outline is a stretch like any other).
 *
 * The ring searched first is the selected polity's, so a border two polities share is copied as the one aimed at
 * runs it; any other ring holding the run answers as well.
 * @param doc - the map being copied from
 * @param anchors - the anchors selected
 * @param map - the map's name
 * @param aimedAt - the polity selected, whose rings are searched first, or `null`
 * @returns the copy, or why the anchors are not a stretch
 */
export function copyStretch(
  doc: YearDocument,
  anchors: readonly number[],
  map: string,
  aimedAt: string | null
): CopiedStretch | StretchRefusal {
  const selected = new Set(anchors)
  if (selected.size < MIN_STRETCH_POINTS) return 'too-few'
  const claims = [...doc.claims].sort(
    (a, b) => Number(b.polity === aimedAt) - Number(a.polity === aimedAt)
  )
  for (const claim of claims) {
    for (const ring of claim.rings) {
      const run = runOn(ring, selected)
      if (run === null) continue
      const ordered = [...ring.slice(run.start), ...ring.slice(0, run.start)].slice(
        0,
        selected.size
      )
      const owner = doc.polities.find((polity) => polity.id === claim.polity)
      // A claim names a polity of the registry: the document is cross-checked when it opens.
      if (owner === undefined) {
        throw new Error(`[Cartographer] the claim of "${claim.polity}" names no polity of the map.`)
      }
      return {
        kind: 'stretch',
        map,
        polity: owner.name,
        closed: run.closed,
        points: ordered.map((index) => pointOf(doc, index)),
      }
    }
  }
  return 'not-a-run'
}

/** A finite `[longitude, latitude]`. */
const position = z.tuple([z.number(), z.number()])

/** {@link ClipboardPoint}. */
const pointSchema = z.strictObject({
  at: position,
  provenance: z.strictObject({
    name: z.string().check(z.minLength(1)),
    licence: z.string().check(z.minLength(1)),
  }),
})

/** {@link ClipboardContent}, as it is read back from the tab's storage. */
const clipboardSchema: z.ZodMiniType<ClipboardContent> = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('polities'),
    map: z.string(),
    polities: z
      .array(
        z
          .strictObject({
            polity: yearPolitySchema,
            suzerainName: z.nullable(z.string()),
            // A ring of fewer points encloses nothing, and no map holds one: a clipboard carrying it is not one.
            rings: z.array(z.array(pointSchema).check(z.minLength(MIN_RING_ANCHORS))),
          })
          // A vassal is copied with its suzerain's name, a sovereign with none.
          .check(
            z.refine(
              (copied) => (copied.polity.suzerain === null) === (copied.suzerainName === null)
            )
          )
      )
      .check(z.minLength(1)),
  }),
  z
    .strictObject({
      kind: z.literal('stretch'),
      map: z.string(),
      polity: z.string(),
      closed: z.boolean(),
      points: z.array(pointSchema).check(z.minLength(MIN_STRETCH_POINTS)),
    })
    // A closed stretch is a ring, and a ring of fewer points encloses nothing.
    .check(z.refine((stretch) => !stretch.closed || stretch.points.length >= MIN_RING_ANCHORS)),
])

/**
 * Read a clipboard back.
 * @param value - what was parsed from the storage
 * @returns the content, or `null` when it is not one
 */
export function readClipboard(value: unknown): ClipboardContent | null {
  const parsed = clipboardSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
