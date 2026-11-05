/**
 * The clipboard of the Cartographer — what ‹cmd+C› keeps, to be pasted into another map (CARTO-345,
 * `files/plans/cartographer/copy-paste-between-maps.md`, the dev, 2026-11-03).
 *
 * **Coordinates, never anchor indices.** An index means something in one anchor table only; the map a copy is pasted
 * into has its own. So what is copied is resolved: every point at its `[longitude, latitude]`, with the provenance it
 * was recorded under — a point keeps its source wherever it goes. Pasting (`paste.ts`) puts each point **in place**,
 * at those coordinates, as a new anchor of the target map: it shares none with the map's own.
 *
 * **What it holds is either polities or points** — one pastes what one selected: a polity whole, sheet and outline,
 * or several from `{Polities}`; or **any points**, whatever they make (the dev, 2026-11-05: *"it's the points we
 * want … that they make one or several outlines is not my business"*). The points are sorted into **pieces** along
 * the outlines they lie on — a whole closed outline, or a run of points that follow one another
 * (`files/plans/cartographer/open-outlines.md`).
 */

import { z } from 'zod/mini'

import { yearPolitySchema } from '../data/yearFormat'

import { everyOutline, isRingOpen, outlineFloor } from './outlines'
import { MIN_OPEN_ANCHORS } from './yearDocument'

import type { Provenance } from './documentEdits'
import type { OutlineOf } from './outlines'
import type { YearDocument } from './yearDocument'
import type { YearPolity } from '../data/yearFormat'

/** One copied point: where it is, and what it was taken from. */
export interface ClipboardPoint {
  /** `[longitude, latitude]`. */
  at: [number, number]
  /** Its source and licence, as the map it came from recorded them. */
  provenance: Provenance
}

/** One copied polity: its sheet, and its rings resolved into points. */
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
  /** The positions in {@link rings} of its open outlines, as the claim holds them; absent when every one is closed. */
  open?: number[] | undefined
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

/** One piece of the points copied: a whole closed outline, or points that follow one another along one. */
export interface CopiedPiece {
  /**
   * Whether it is a whole closed outline, closure implied. Pasted, it is added as one more outline; a piece that is
   * not closed is merged into the polity's outline, or left open when nothing is drawn.
   */
  closed: boolean
  /** The points, in the outline's order — two at least, three when closed. */
  points: ClipboardPoint[]
}

/** Points copied from a map, sorted into pieces along the outlines they lie on. */
export interface CopiedPoints {
  /** What the clipboard holds. */
  kind: 'points'
  /** The map they were copied from. */
  map: string
  /** The name of the polity the points were copied from — the one aimed at, said back in the status bar. */
  polity: string
  /** The pieces, the polity aimed at's first. */
  pieces: CopiedPiece[]
}

/** What the clipboard holds. */
export type ClipboardContent = CopiedPolities | CopiedPoints

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
        ...(claim?.open === undefined ? {} : { open: [...claim.open] }),
      }
    })
  return polities.length === 0 ? null : { kind: 'polities', map, polities }
}

/**
 * The runs of selected anchors along one outline: positions that follow one another, each run as long as it goes —
 * across the closing segment of a closed ring, never past an open outline's ends. A whole closed ring is one run,
 * starting at its first anchor.
 * @param outline - the outline
 * @param selected - the anchors still to place
 * @returns each run's positions, in the outline's order, and whether it is the whole closed ring
 */
function runsAlong(
  outline: OutlineOf,
  selected: ReadonlySet<number>
): { positions: number[]; whole: boolean }[] {
  const { ring, open } = outline
  const inside = ring.map((index) => selected.has(index))
  const count = ring.length
  if (inside.every(Boolean)) {
    return [{ positions: ring.map((_index, at) => at), whole: !open }]
  }
  const before = (at: number): boolean =>
    open ? (inside[at - 1] ?? false) : (inside[(at - 1 + count) % count] ?? false)
  const runs: { positions: number[]; whole: boolean }[] = []
  for (let start = 0; start < count; start += 1) {
    if (!inside[start] || before(start)) continue
    const positions: number[] = []
    for (let at = start; positions.length < count; at += 1) {
      const wrapped = open ? at : at % count
      if (wrapped >= count || !inside[wrapped]) break
      positions.push(wrapped)
    }
    runs.push({ positions, whole: false })
  }
  return runs
}

/** Points copied, and how many selected points stood alone — no neighbour selected along any outline. */
export interface PointsCopy {
  /** The copy, or `null` when no two selected points follow one another anywhere. */
  copy: CopiedPoints | null
  /** The selected points left out, alone on every outline they lie on: a single point is no piece. */
  alone: number
}

/**
 * Copy any points selected, sorted into pieces along the outlines they lie on — the polity aimed at's outlines first,
 * so a border two polities share is copied as the one aimed at runs it. A point shared by two outlines goes into the
 * first piece that takes it.
 * @param doc - the map being copied from
 * @param anchors - the anchors selected
 * @param map - the map's name
 * @param aimedAt - the polity selected, whose outlines are read first, or `null`
 * @returns the copy and the points left out
 */
export function copyPoints(
  doc: YearDocument,
  anchors: readonly number[],
  map: string,
  aimedAt: string | null
): PointsCopy {
  const remaining = new Set(anchors)
  const outlines = everyOutline(doc.claims).sort(
    (a, b) => Number(b.polity === aimedAt) - Number(a.polity === aimedAt)
  )
  const pieces: CopiedPiece[] = []
  let owner: string | null = null
  for (const outline of outlines) {
    for (const run of runsAlong(outline, remaining)) {
      if (run.positions.length < MIN_OPEN_ANCHORS) continue
      const indices = run.positions.flatMap((at) => outline.ring.slice(at, at + 1))
      pieces.push({ closed: run.whole, points: indices.map((index) => pointOf(doc, index)) })
      for (const index of indices) remaining.delete(index)
      owner ??= outline.polity
    }
  }
  const name = owner === null ? null : nameOf(doc, owner)
  const copy = name === null ? null : { kind: 'points' as const, map, polity: name, pieces }
  return { copy, alone: remaining.size }
}

/**
 * Whether a copied polity's open positions name rings it has, ascending and each once, and every ring holds its
 * floor — the year file's rule (`claimHoldsTogether`), on rings of points rather than of indices.
 * @param rings - the copied rings
 * @param open - their open positions, or none
 * @returns `true` when they hold together
 */
function openPositionsHold(
  rings: readonly unknown[][],
  open: readonly number[] | undefined
): boolean {
  const positions = open ?? []
  const named = positions.every(
    (at, i) => at < rings.length && (i === 0 || at > (positions[i - 1] ?? -1))
  )
  return named && rings.every((ring, at) => ring.length >= outlineFloor(isRingOpen({ open }, at)))
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

/** {@link CopiedPiece}: a closed piece is a ring of three points at least, an open one a line of two. */
const pieceSchema = z
  .strictObject({ closed: z.boolean(), points: z.array(pointSchema) })
  .check(z.refine((piece) => piece.points.length >= outlineFloor(!piece.closed)))

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
            // An open outline stands on two points, a closed ring on three; the claim's own rule says which is which.
            rings: z.array(z.array(pointSchema).check(z.minLength(MIN_OPEN_ANCHORS))),
            open: z.optional(z.array(z.int().check(z.nonnegative())).check(z.minLength(1))),
          })
          // A vassal is copied with its suzerain's name, a sovereign with none.
          .check(
            z.refine(
              (copied) => (copied.polity.suzerain === null) === (copied.suzerainName === null)
            )
          )
          // The open positions as the year file holds them: rings it has, ascending, each ring over its floor (review
          // SEC-001, 2026-11-05).
          .check(z.refine((copied) => openPositionsHold(copied.rings, copied.open)))
      )
      .check(z.minLength(1)),
  }),
  z.strictObject({
    kind: z.literal('points'),
    map: z.string(),
    polity: z.string(),
    pieces: z.array(pieceSchema).check(z.minLength(1)),
  }),
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
