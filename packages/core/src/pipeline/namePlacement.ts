/**
 * Where each country's name is written, and how large (ATLAS-301, `files/plans/atlas/country-names.md`):
 * inside the space it occupies, **as large as that space allows**, with a margin to its borders, along a
 * line across it or along its shape — in every separate piece of it the name fits in, and over two lines when
 * they make it larger enough.
 *
 * **Worked on a grid, not on outlines** (the dev's call, 2026-10-28). One distance field answers all of it:
 * the margin is a distance to keep, the most inner point is the farthest cell, and a name fits when the box
 * its letters fill keeps the margin (`nameFit`). The precision is a cell — a few kilometres, invisible at a
 * country's scale.
 *
 * **No two names can overlap, by construction**: each stays inside its own piece, and no cell has two owners
 * or lies in two pieces. The collision pass the plan planned has nothing to do.
 *
 * **The text is measured by whoever calls**: `core` has no canvas, so the advances of the letters come
 * through {@link MeasureName} — `CanvasRenderingContext2D.measureText` in the atlas, fixed widths in tests.
 */

import { breakInTwo } from './nameBreak'
import { fittingOf, horizontalFit, lineLength, pointAlong, ridgeFit } from './nameFit'
import { ownerPieces } from './nameSpace'

import type { NameBreak } from './nameBreak'
import type { Fitting, LineFit } from './nameFit'
import type { NameLine } from './nameLine'
import type { NameSpace } from './nameSpace'

/** A text's letters measured at a font size of one, in whatever unit the grid's cells are drawn at. */
export interface NameMetrics {
  /** Each letter's advance — its width plus the spacing after it — in the order of the text's code points. */
  readonly advances: readonly number[]
  /** How far the text's letters reach above the baseline. */
  readonly ascent: number
  /** How far they reach below it — `0` for a text with no descender. */
  readonly descent: number
}

/**
 * Measure a name at a font size of one.
 * @param text - the name, as it will be written
 * @returns its letters' advances, ascent and descent
 */
export type MeasureName = (text: string) => NameMetrics

/** One name to place: the owner whose space it goes in, and its text. */
export interface NameRequest {
  /** The owner, as the grid writes it. */
  readonly owner: number
  /** The name, as it will be written. */
  readonly text: string
}

/** What every name keeps to, in cells of the grid. */
export interface NamePlacementOptions {
  /** The least room between a letter and its space's edge — a border, the coast or the map's frame. */
  readonly margin: number
  /** The smallest font size worth writing; a name that only fits smaller is left for a closer zoom. */
  readonly minSize: number
  /**
   * How much larger two horizontal lines must make a name for them to be chosen over one, as a share of its
   * size: `0.3` takes them when they make it 30 % larger.
   */
  readonly twoLineGain: number
  /**
   * How much larger following the space's shape must make a name for it to be chosen over the horizontal, as
   * a share of its size — the price of the last resort, set above `twoLineGain` so that it stays the last.
   */
  readonly followShapeGain: number
}

/** One letter placed: the middle of its foot on the baseline, and the direction of its line there. */
export interface PlacedGlyph {
  /** Column of the grid, a cell's centre at its integer index — the letter drawn centred on it. */
  readonly x: number
  /** Row of the grid, `y` downward — the letter's baseline. */
  readonly y: number
  /** The line's direction under the letter, radians from `+x` towards `+y`. */
  readonly angle: number
}

/** A name written in one piece: its owner, its size and every letter's place. */
export interface PlacedName {
  /** Whose name it is. */
  readonly owner: number
  /** The name. */
  readonly text: string
  /** The font size, in cells. */
  readonly size: number
  /**
   * Each letter's place, one per code point of the text, in reading order. Over two lines, the space broken
   * at keeps a place, at the end of the first line, and draws nothing.
   */
  readonly glyphs: readonly PlacedGlyph[]
}

/** The names of one display level. */
export interface NamePlacement {
  /** The names written, one per piece they fit in, largest first. */
  readonly placed: readonly PlacedName[]
  /** The owners whose name fits in none of their pieces at `minSize` — left for a closer zoom. */
  readonly tooSmall: readonly number[]
  /**
   * The owners asked for with no cell on the grid: not shown at this level — a vassal seen from afar — or an
   * owner the caller got wrong. Returned rather than logged, since the first is ordinary at every zoom: the
   * caller, which knows which owners it expects, tells the two apart.
   */
  readonly absent: readonly number[]
}

/**
 * The room between two lines of one name — from the lowest point of the first to the highest of the second — as a
 * share of the whole name's height. 0.3 at first, Claude's; tightened by the dev on sight, 2026-10-28 (*« réduis un
 * petit peu l'interlignage »*). Measured line by line since that evening: a first line with no descender
 * (« Roman ») no longer leaves the descender of the whole name (« Empire ») as an empty band under it.
 */
export const LINE_GAP = 0.15

/** How far a text's letters reach either side of its baseline, at a size of one. */
interface Extent {
  /** Above. */
  readonly ascent: number
  /** Below. */
  readonly descent: number
}

/** A name's measure, checked, with what the fit and the layout read of it. */
interface Measured extends Extent {
  /** Each code point's advance, at a size of one. */
  readonly advances: readonly number[]
  /** Their sum. */
  readonly length: number
  /** Its height, ascent and descent together. */
  readonly height: number
  /** Where it breaks over two lines, and each line's own extent; `null` for a name of one word. */
  readonly twoLines: {
    readonly at: NameBreak
    readonly first: Extent
    readonly second: Extent
  } | null
}

/**
 * A text's measure, checked: one advance per code point, a positive height and a positive length.
 * @param text - the text
 * @param owner - whose name it is, for the message
 * @param measure - the measure
 * @returns its metrics
 * @throws when the measure does not describe the text — a defect of the caller, said rather than drawn wrong
 */
function checked(text: string, owner: number, measure: MeasureName): NameMetrics {
  const letters = Array.from(text).length
  if (letters === 0) throw new Error(`[atlas] owner ${String(owner)} has an empty name to place`)
  const metrics = measure(text)
  if (metrics.advances.length !== letters)
    throw new Error(
      `[atlas] "${text}" has ${String(letters)} letters and was measured with ${String(metrics.advances.length)} advances`
    )
  const length = metrics.advances.reduce((sum, advance) => sum + advance, 0)
  if (!(length > 0) || !(metrics.ascent + metrics.descent > 0))
    throw new Error(`[atlas] "${text}" was measured with no length or no height`)
  return metrics
}

/**
 * A name's measure, and its two lines' when it has a space to break at.
 * @param request - the name
 * @param measure - the measure
 * @returns what the fit and the layout read
 * @throws when the measure does not describe the text
 */
function measured(request: NameRequest, measure: MeasureName): Measured {
  const { text, owner } = request
  const { advances, ascent, descent } = checked(text, owner, measure)
  const at = breakInTwo(text, advances)
  const letters = Array.from(text)
  const twoLines =
    at === null
      ? null
      : {
          at,
          first: checked(letters.slice(0, at.at).join(''), owner, measure),
          second: checked(letters.slice(at.at + 1).join(''), owner, measure),
        }
  const length = advances.reduce((sum, advance) => sum + advance, 0)
  return { advances, length, ascent, descent, height: ascent + descent, twoLines }
}

/** How a name is set in a piece: on its line, at its size, on one line or over two. */
interface Setting {
  /** The line it is written along. */
  readonly line: NameLine
  /** Its size, in cells. */
  readonly size: number
  /** Whether it is broken over two lines. */
  readonly broken: boolean
}

/**
 * The height of a name's two lines as one block: each line's own, and the gap between them.
 * @param name - the name's measure, with its two lines
 * @param twoLines - its two lines
 * @returns the block's height, at a size of one
 */
function blockHeight(name: Measured, twoLines: NonNullable<Measured['twoLines']>): number {
  const { first, second } = twoLines
  return first.ascent + first.descent + LINE_GAP * name.height + second.ascent + second.descent
}

/**
 * The best setting of a name in a piece, chosen in the dev's order (2026-10-28): **straight across on one
 * line**; **straight across on two**, when they make it larger by `twoLineGain`; **along the space's shape, on
 * one line**, when it makes it larger by `followShapeGain` — the last resort. Along the shape on two lines is
 * never tried: a large name set slanting over two lines reads as neither. A setting under `minSize` is out,
 * so when straight across fits nowhere, the shape is taken whatever its price.
 *
 * Each step down the list is paid for by its gain: a setting's size is divided by the gains of the steps it
 * took, and the best of what is left wins — the first in the order on a tie.
 * @param fitting - the piece and its distances
 * @param name - the name's measure
 * @param options - the margin, the smallest size and the two gains
 * @returns the setting, or `null` when nothing fits at `minSize`
 */
function setIn(fitting: Fitting, name: Measured, options: NamePlacementOptions): Setting | null {
  const { margin, minSize, twoLineGain, followShapeGain } = options
  const candidates: { fit: LineFit | null; broken: boolean; price: number }[] = [
    { fit: horizontalFit(fitting, name, margin), broken: false, price: 1 },
    {
      fit:
        name.twoLines === null
          ? null
          : horizontalFit(
              fitting,
              {
                length: Math.max(name.twoLines.at.first, name.twoLines.at.second),
                height: blockHeight(name, name.twoLines),
              },
              margin
            ),
      broken: true,
      price: 1 + twoLineGain,
    },
    { fit: ridgeFit(fitting, name, margin), broken: false, price: 1 + followShapeGain },
  ]
  let chosen: Setting | null = null
  let score = 0
  for (const { fit, broken, price } of candidates) {
    if (fit === null || fit.size < minSize || fit.size <= 0 || fit.size / price <= score) continue
    chosen = { line: fit.line, size: fit.size, broken }
    score = fit.size / price
  }
  return chosen
}

/**
 * The places of a run of letters along a line, centred on it and shifted across it.
 * @param line - the line, in the piece's crop
 * @param advances - the run's advances, at a size of one
 * @param centred - the length the run is centred by, at a size of one — a trailing break space left out
 * @param size - the size
 * @param shift - how far across the line the run's baseline lies, towards the letters' top, in cells
 * @returns one place per letter, in the crop's cells
 */
function row(
  line: NameLine,
  advances: readonly number[],
  centred: number,
  size: number,
  shift: number
): PlacedGlyph[] {
  let walked = (lineLength(line) - centred * size) / 2
  return advances.map((advance) => {
    const centre = pointAlong(line, walked + (advance * size) / 2)
    walked += advance * size
    // The letters' up: the line's direction turned a quarter towards the top of the page.
    return {
      x: centre.x + shift * Math.sin(centre.angle),
      y: centre.y - shift * Math.cos(centre.angle),
      angle: centre.angle,
    }
  })
}

/**
 * Where a box's baseline lies, from the box's middle: below it by half the difference of its reach either side.
 * @param extent - the box's ascent and descent, at a size of one
 * @param middle - where the box's middle lies across the line, in cells
 * @param size - the size
 * @returns the baseline's shift across the line, in cells
 */
function baseline(extent: Extent, middle: number, size: number): number {
  return middle - ((extent.ascent - extent.descent) * size) / 2
}

/**
 * Each letter's place in its piece, in the grid's cells: one row whose box is centred on the line, or two
 * rows whose block is.
 * @param setting - the line, the size and whether it is broken
 * @param name - the name's measure
 * @param space - the piece, whose crop's offset brings the places back to the grid
 * @returns one place per code point, in reading order
 */
function layOut(setting: Setting, name: Measured, space: NameSpace): PlacedGlyph[] {
  const { line, size, broken } = setting
  let glyphs: PlacedGlyph[]
  if (!broken || name.twoLines === null) {
    glyphs = row(line, name.advances, name.length, size, baseline(name, 0, size))
  } else {
    const { at, first, second } = name.twoLines
    const half = (blockHeight(name, name.twoLines) * size) / 2
    const top = half - ((first.ascent + first.descent) * size) / 2
    const bottom = -half + ((second.ascent + second.descent) * size) / 2
    glyphs = [
      ...row(line, name.advances.slice(0, at.at + 1), at.first, size, baseline(first, top, size)),
      ...row(line, name.advances.slice(at.at + 1), at.second, size, baseline(second, bottom, size)),
    ]
  }
  return glyphs.map(({ x, y, angle }) => ({ x: x + space.left, y: y + space.top, angle }))
}

/**
 * Refuse an owner asked for twice: its two names would be laid on each other.
 * @param names - the names asked for
 * @throws on the first owner repeated
 */
function refuseRepeats(names: readonly NameRequest[]): void {
  const asked = new Set<number>()
  for (const { owner } of names) {
    if (asked.has(owner))
      throw new Error(`[atlas] owner ${String(owner)} is asked for twice; one name per space`)
    asked.add(owner)
  }
}

/**
 * Place the names of one display level on a grid of owners.
 * @param owners - row-major, the owner of each cell at this level, any negative value for none
 * @param width - the grid's width in cells
 * @param height - the grid's height in cells
 * @param names - the names to place, one per owner at most
 * @param measure - measures a name at a font size of one
 * @param options - the margin, the smallest size and the gain two lines must bring
 * @returns the names written, one per piece they fit in, largest first; the owners left for a closer zoom;
 *   the owners with no cell
 * @throws when the grid's size is not `width × height`, an owner is asked for twice — two names in one
 *   space would be laid on each other — or a name's measure does not describe its text
 */
export function placeNames(
  owners: ArrayLike<number>,
  width: number,
  height: number,
  names: readonly NameRequest[],
  measure: MeasureName,
  options: NamePlacementOptions
): NamePlacement {
  refuseRepeats(names)
  const pieces = ownerPieces(owners, width, height)
  const placed: PlacedName[] = []
  const tooSmall: number[] = []
  const absent: number[] = []

  for (const request of names) {
    const held = pieces.get(request.owner)
    if (held === undefined) {
      absent.push(request.owner)
      continue
    }
    const name = measured(request, measure)
    let any = false
    for (const space of held) {
      const setting = setIn(fittingOf(space), name, options)
      if (setting === null) continue
      const glyphs = layOut(setting, name, space)
      placed.push({ owner: request.owner, text: request.text, size: setting.size, glyphs })
      any = true
    }
    if (!any) tooSmall.push(request.owner)
  }

  placed.sort((a, b) => b.size - a.size)
  return { placed, tooSmall, absent }
}
