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
import { chooseLine } from './nameCandidates'
import { fittingOf, lineLength, pointAlong } from './nameFit'
import { occupy, pieceTag, withOccupied } from './nameOccupancy'
import { ownerPieces } from './nameSpace'

import type { NameBreak } from './nameBreak'
import type { NameWeights } from './nameChoice'
import type { Fitting } from './nameFit'
import type { NameLine } from './nameLine'
import type { NameOccupancy } from './nameOccupancy'
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
  /**
   * A shorter name, written in a piece where the name does not reach {@link NamePlacementOptions.longMinSize} — « France »
   * where « Kingdom of France » does not fit (the dev, 2026-10-29: *« Kingdom of France → France »*).
   */
  readonly shorter?: string
}

/** What every name keeps to, in cells of the grid. */
export interface NamePlacementOptions {
  /** The least room between a letter and its space's edge — a border, the coast or the map's frame. */
  readonly margin: number
  /**
   * How far a name may spill over its space's edge, in cells — a candidate that does pays for it in its score
   * (the dev, 2026-10-28: *« un texte peut dépasser un peu de sa zone »*); `0` keeps every name inside.
   */
  readonly overflow: number
  /**
   * How far a spilling name may bite into a neighbour's cells, in cells (the dev, 2026-10-29: *« faudrait quand même que
   * ça puisse chevaucher un petit peu entre voisins »*); never into another name. `0` keeps it off them.
   */
  readonly neighbourBite: number
  /** The smallest font size worth writing; a name that only fits smaller is left out. */
  readonly minSize: number
  /** The smallest size a name with a shorter one is written at; under it, the shorter one is written instead. */
  readonly longMinSize: number
  /** How much each criterion weighs when a name's candidates are compared (`nameChoice`). */
  readonly weights: NameWeights
  /** The largest size a name is written at, in cells — a vast space no longer makes a giant of its name. */
  readonly maxSize: number
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
  /** Which of the owner's pieces it is written in, `0` the largest — the same numbering for every name of the owner. */
  readonly piece: number
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
 * The best setting of a name in a piece, among its candidates (`nameCandidates`).
 * @param fitting - the piece and its distances
 * @param name - the name's measure
 * @param options - the margin, the overflow and the weights
 * @param minSize - the smallest size it is written at
 * @returns the setting, or `null` when nothing fits at `minSize`
 */
function setIn(
  fitting: Fitting,
  name: Measured,
  options: NamePlacementOptions,
  minSize: number
): Setting | null {
  return chooseLine(fitting, {
    one: name,
    two:
      name.twoLines === null
        ? null
        : {
            length: Math.max(name.twoLines.at.first, name.twoLines.at.second),
            height: blockHeight(name, name.twoLines),
          },
    margin: options.margin,
    overflow: options.overflow,
    minSize,
    maxSize: options.maxSize,
    weights: options.weights,
  })
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

/** One piece of one owner to name, and the texts it tries. */
interface Task {
  /** The owner. */
  readonly owner: number
  /** The texts, in order. */
  readonly tries: readonly Try[]
  /** The piece. */
  readonly space: NameSpace
  /** Which of the owner's pieces it is. */
  readonly piece: number
}

/**
 * Every piece of every name, the largest first: where names would cover each other, the larger space keeps its own.
 * @param names - the names asked for
 * @param pieces - each owner's pieces
 * @param measure - the measure
 * @param options - the smallest sizes
 * @returns the tasks
 */
function tasksOf(
  names: readonly NameRequest[],
  pieces: ReadonlyMap<number, readonly NameSpace[]>,
  measure: MeasureName,
  options: NamePlacementOptions
): Task[] {
  return names
    .flatMap((request) => {
      const tries = choices(request, measure, options)
      return (pieces.get(request.owner) ?? []).map((space, piece) => ({
        owner: request.owner,
        tries,
        space,
        piece,
      }))
    })
    .sort((a, b) => b.space.cells - a.space.cells)
}

/** One text tried in a piece, measured, with the smallest size it is written at. */
interface Try {
  /** The text. */
  readonly text: string
  /** Its measure. */
  readonly name: Measured
  /** The smallest size it is written at. */
  readonly minSize: number
}

/**
 * The texts a request tries in each piece, in order: its name — at the long name's smallest size when it has a shorter
 * one — then the shorter one.
 * @param request - the request
 * @param measure - the measure
 * @param options - the smallest sizes
 * @returns the tries
 * @throws when the measure does not describe a text
 */
function choices(request: NameRequest, measure: MeasureName, options: NamePlacementOptions): Try[] {
  const { owner, text, shorter } = request
  const name = measured(request, measure)
  if (shorter === undefined || shorter === text) return [{ text, name, minSize: options.minSize }]
  return [
    { text, name, minSize: options.longMinSize },
    { text: shorter, name: measured({ owner, text: shorter }, measure), minSize: options.minSize },
  ]
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
 * @param options - the margin, the overflow, the sizes and the weights
 * @param occupancy - the cells names already cover on this grid, shared by the calls that place one level's forms:
 *   given, every name keeps off the cells of other pieces' names and marks its own, the largest pieces first; left
 *   out, the names are placed each in its own space alone
 * @returns the names written, one per piece they fit in, largest first; the owners left for a closer zoom;
 *   the owners with no cell
 * @throws when the grid's size is not `width × height`, an owner is asked for twice — two names in one
 *   space would be laid on each other — a name's measure does not describe its text, or the overflow is below zero
 */
export function placeNames(
  owners: ArrayLike<number>,
  width: number,
  height: number,
  names: readonly NameRequest[],
  measure: MeasureName,
  options: NamePlacementOptions,
  occupancy?: NameOccupancy
): NamePlacement {
  refuseRepeats(names)
  if (!(options.overflow >= 0))
    throw new Error(`[atlas] an overflow of ${String(options.overflow)} cells: zero or more`)
  if (!(options.neighbourBite >= 0))
    throw new Error(
      `[atlas] a bite of ${String(options.neighbourBite)} cells into a neighbour: zero or more`
    )
  // The ring around each piece holds the distances outside it, as far as a name may spill over, and a cell more.
  const pieces = ownerPieces(owners, width, height, Math.ceil(options.overflow) + 2)
  const placed: PlacedName[] = []
  const absent = names.flatMap(({ owner }) => (pieces.has(owner) ? [] : [owner]))
  for (const { owner, tries, space, piece } of tasksOf(names, pieces, measure, options)) {
    const tag = pieceTag(owner, piece)
    const open = occupancy === undefined ? space : withOccupied(space, occupancy, tag)
    const fitting = fittingOf(open, options.neighbourBite)
    // The name where it reaches its size, the shorter one otherwise.
    for (const { text, name, minSize } of tries) {
      const setting = setIn(fitting, name, options, minSize)
      if (setting === null) continue
      const glyphs = layOut(setting, name, space)
      placed.push({ owner, text, piece, size: setting.size, glyphs })
      if (occupancy !== undefined)
        occupy(occupancy, tag, { ...name, text, size: setting.size, glyphs })
      break
    }
  }
  const written = new Set(placed.map(({ owner }) => owner))
  const tooSmall = names.flatMap(({ owner }) =>
    pieces.has(owner) && !written.has(owner) ? [owner] : []
  )

  placed.sort((a, b) => b.size - a.size)
  return { placed, tooSmall, absent }
}
