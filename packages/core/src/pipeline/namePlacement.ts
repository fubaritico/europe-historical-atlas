/**
 * Where each country's name is written, and how large (ATLAS-301, `files/plans/atlas/country-names.md`): once in each
 * of its realms (`nameRealm` — its land with the narrow seas inside it), along one line, its letters as tall as the
 * realm is thick and spaced to cover its length (`nameConstruction`). Rebuilt on 2026-10-29 from « The gap to the
 * reference »: one construction, no competition between candidates, one line.
 *
 * **Worked on a grid, not on outlines** (the dev's call, 2026-10-28). One distance field answers all of it: the
 * realm's thickness is a distance, the line follows its cells, and a name fits when the box its letters fill keeps off
 * the neighbours and the names already written (`nameFit`). The precision is a cell — a few kilometres.
 *
 * **No name over another**: each name written marks its cells (`nameOccupancy`), and the next keep off them, the
 * largest realms first.
 *
 * **The text is measured by whoever calls**: `core` has no canvas, so the advances of the letters come
 * through {@link MeasureName} — `CanvasRenderingContext2D.measureText` in the atlas, fixed widths in tests.
 */

import { readAt } from '../utils/math'

import { constructName } from './nameConstruction'
import { fittingOf, lineLength, pointAlong } from './nameFit'
import { occupy, pieceTag, withOccupied } from './nameOccupancy'
import { OFFSET_REACH, offsetName } from './nameOffset'
import { ownerRealms } from './nameRealm'
import { widenedSpace } from './nameSpace'

import type { Construction, ConstructionOptions } from './nameConstruction'
import type { NameOccupancy } from './nameOccupancy'
import type { NameSpace, OwnerGrid } from './nameSpace'

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

/** What every name keeps to: how it is set, and where. */
export interface NamePlacementOptions extends ConstructionOptions {
  /**
   * How far a name may bite into a neighbour's cells, in cells (the dev, 2026-10-29: *« faudrait quand même que ça puisse
   * chevaucher un petit peu entre voisins »*); never into another name. `0` keeps it off them.
   */
  readonly neighbourBite: number
  /** The smallest size a name with a shorter one is written at; under it, the shorter one is written instead. */
  readonly longMinSize: number
  /**
   * The largest size an offset label is written at, beside a realm too small for its name (`nameOffset`, ATLAS-315):
   * smaller than the names written inside their land (the dev, 2026-10-29: *« réduis la taille de ces textes »*).
   */
  readonly offsetSize: number
  /** The widest strait a realm spans, in cells: a country's pieces parted by less are named once. */
  readonly strait: number
  /** The smallest far realm named, as a share of the country's largest. */
  readonly farShare: number
  /** A far realm of this many land cells is named whatever its share. */
  readonly farCells: number
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
  /** Which of the owner's realms it is written in, `0` the largest — the same numbering for every name of the owner. */
  readonly piece: number
  /** The font size, in cells. */
  readonly size: number
  /** Each letter's place, one per code point of the text, in reading order, along one line. */
  readonly glyphs: readonly PlacedGlyph[]
}

/** The names of one display level. */
export interface NamePlacement {
  /** The names written, one per piece they fit in, largest first. */
  readonly placed: readonly PlacedName[]
  /** The owners whose name fits in none of their realms at `minSize` — left for a closer zoom. */
  readonly tooSmall: readonly number[]
  /**
   * The owners asked for with no cell on the grid: not shown at this level — a vassal seen from afar — or an
   * owner the caller got wrong. Returned rather than logged, since the first is ordinary at every zoom: the
   * caller, which knows which owners it expects, tells the two apart.
   */
  readonly absent: readonly number[]
}

/** How far a realm's crop runs past its land and straits, in cells: where a name's letters may reach over the sea. */
export const REALM_RING = 4

/**
 * The construction's settings as « The gap to the reference » proposes them (29/10, Claude's starts, to judge on the
 * map; the atlas's panel starts from these): letters six tenths of the country's thickness, three quarters of its
 * length covered, at most 0.6 em between letters; straits of twelve cells (~100 km on the atlas's grid), a far piece
 * named from a fifth of the largest or 2 000 cells (Norway's mainland under 1100's Greenland); a bite of three cells
 * into a neighbour (the dev, 2026-10-29: *« faudrait quand même que ça puisse chevaucher un petit peu entre voisins »*
 * — one cell at first, which crossed neighbours whole until the bite was bounded the same afternoon; bounded, one cell
 * left Aquitaine, Valencia and Strathclyde unnamed, three leave only Gwynedd among its vassals, measured on all of
 * 1100 by `files/spikes/name-fixture/year.ts`); the full name from 4 cells, the short one under it, nothing under 1.5;
 * an offset label beside a realm too small for its name at 2.5 cells at most (4 at first, *« réduis la taille »*).
 */
export const DEFAULT_NAME_PLACEMENT: NamePlacementOptions = {
  heightShare: 0.6,
  cover: 0.75,
  trackingMost: 0.6,
  minSize: 1.5,
  maxSize: 80,
  longMinSize: 4,
  offsetSize: 2.5,
  neighbourBite: 3,
  strait: 12,
  farShare: 0.2,
  farCells: 2000,
}

/** A name's measure, checked, with what the construction and the layout read of it. */
interface Measured {
  /** Each code point's advance, at a size of one. */
  readonly advances: readonly number[]
  /** Their sum. */
  readonly length: number
  /** How far the letters reach above the baseline. */
  readonly ascent: number
  /** How far below. */
  readonly descent: number
  /** Its height, ascent and descent together. */
  readonly height: number
  /** How many code points. */
  readonly letters: number
}

/**
 * A text's measure, checked: one advance per code point, a positive height and a positive length.
 * @param text - the text
 * @param owner - whose name it is, for the message
 * @param measure - the measure
 * @returns its measure
 * @throws when the measure does not describe the text — a defect of the caller, said rather than drawn wrong
 */
function measured(text: string, owner: number, measure: MeasureName): Measured {
  const letters = Array.from(text).length
  if (letters === 0) throw new Error(`[atlas] owner ${String(owner)} has an empty name to place`)
  const { advances, ascent, descent } = measure(text)
  if (advances.length !== letters)
    throw new Error(
      `[atlas] "${text}" has ${String(letters)} letters and was measured with ${String(advances.length)} advances`
    )
  const length = advances.reduce((sum, advance) => sum + advance, 0)
  if (!(length > 0) || !(ascent + descent > 0))
    throw new Error(`[atlas] "${text}" was measured with no length or no height`)
  return { advances, length, ascent, descent, height: ascent + descent, letters }
}

/**
 * A name's advances once spaced: the spacing after every letter but the last.
 * @param name - the name's measure
 * @param tracking - the spacing, in ems
 * @returns the advances, at a size of one
 */
function spacedAdvances(name: Measured, tracking: number): number[] {
  return name.advances.map((advance, at) => (at < name.letters - 1 ? advance + tracking : advance))
}

/**
 * Each letter's place in its realm, in the grid's cells: one row, its box centred on the line.
 * @param set - the line, the size and the spacing
 * @param name - the name's measure
 * @param space - the realm, whose crop's offset brings the places back to the grid
 * @returns one place per code point, in reading order
 */
function layOut(set: Construction, name: Measured, space: NameSpace): PlacedGlyph[] {
  const { line, size, tracking } = set
  const advances = spacedAdvances(name, tracking)
  const length = advances.reduce((sum, advance) => sum + advance, 0)
  // The box centred on the line: the baseline below its middle by half the difference of its reach either side.
  const shift = -((name.ascent - name.descent) * size) / 2
  let walked = (lineLength(line) - length * size) / 2
  return advances.map((advance, at) => {
    // Each letter centred on its own width; the spacing comes after it, before the next.
    const centre = pointAlong(line, walked + (readAt(name.advances, at) * size) / 2)
    walked += advance * size
    // The letters' up: the line's direction turned a quarter towards the top of the page.
    return {
      x: centre.x + shift * Math.sin(centre.angle) + space.left,
      y: centre.y - shift * Math.cos(centre.angle) + space.top,
      angle: centre.angle,
    }
  })
}

/** One text tried in a realm, measured, with the smallest size it is written at. */
interface Try {
  /** The text. */
  readonly text: string
  /** Its measure. */
  readonly name: Measured
  /** The smallest size it is written at. */
  readonly minSize: number
}

/**
 * The texts a request tries in each realm, in order: its name — at the long name's smallest size when it has a shorter
 * one — then the shorter one.
 * @param request - the request
 * @param measure - the measure
 * @param options - the smallest sizes
 * @returns the tries
 * @throws when the measure does not describe a text
 */
function choices(request: NameRequest, measure: MeasureName, options: NamePlacementOptions): Try[] {
  const { owner, text, shorter } = request
  const name = measured(text, owner, measure)
  if (shorter === undefined || shorter === text) return [{ text, name, minSize: options.minSize }]
  return [
    { text, name, minSize: options.longMinSize },
    { text: shorter, name: measured(shorter, owner, measure), minSize: options.minSize },
  ]
}

/** One realm of one owner to name, and the texts it tries. */
interface Task {
  /** The owner. */
  readonly owner: number
  /** The texts, in order. */
  readonly tries: readonly Try[]
  /** The realm. */
  readonly space: NameSpace
  /** Which of the owner's realms it is, `0` the largest. */
  readonly piece: number
}

/**
 * Every realm of every name, the largest first: where names would cover each other, the larger realm keeps its own.
 * @param names - the names asked for
 * @param realms - each owner's realms
 * @param measure - the measure
 * @param options - the smallest sizes
 * @returns the tasks
 */
function tasksOf(
  names: readonly NameRequest[],
  realms: ReadonlyMap<number, readonly NameSpace[]>,
  measure: MeasureName,
  options: NamePlacementOptions
): Task[] {
  return names
    .flatMap((request) => {
      const tries = choices(request, measure, options)
      return (realms.get(request.owner) ?? []).map((space, piece) => ({
        owner: request.owner,
        tries,
        space,
        piece,
      }))
    })
    .sort((a, b) => b.space.cells - a.space.cells)
}

/**
 * A realm's name written in it: the name where it reaches its size, the shorter one otherwise.
 * @param task - the realm and its texts
 * @param options - how a name is set, the sizes and the bite
 * @param occupancy - the cells the level's names already cover, marked with this name's when it is placed
 * @returns the name placed, or `null` when none fits
 */
function placeInRealm(
  task: Task,
  options: NamePlacementOptions,
  occupancy: NameOccupancy | undefined
): PlacedName | null {
  const { owner, tries, space, piece } = task
  const tag = pieceTag(owner, piece)
  const open = occupancy === undefined ? space : withOccupied(space, occupancy, tag)
  const fitting = fittingOf(open, options.neighbourBite)
  for (const { text, name, minSize } of tries) {
    const set = constructName(fitting, name, { ...options, minSize })
    if (set === null) continue
    const glyphs = layOut(set, name, space)
    if (occupancy !== undefined)
      occupy(occupancy, tag, {
        ...name,
        advances: spacedAdvances(name, set.tracking),
        text,
        size: set.size,
        glyphs,
      })
    return { owner, text, piece, size: set.size, glyphs }
  }
  return null
}

/**
 * A realm's name written beside it, on the open ground nearest it (`nameOffset`), when it is named in none of its
 * realms: **the shorter text first** — the full one would spread over the sea — each from the long name's smallest
 * size down to its own smallest, in a crop widened to hold the name wholly beside the realm on any side.
 * @param task - the owner's largest realm and its texts
 * @param grid - the grid, for the neighbours of the widened crop
 * @param options - the sizes and the bite
 * @param occupancy - the cells the level's names already cover, marked with this name's when it is placed
 * @returns the name placed, or `null` when it fits beside the realm at no size
 */
function placeOffset(
  task: Task,
  grid: OwnerGrid,
  options: NamePlacementOptions,
  occupancy: NameOccupancy | undefined
): PlacedName | null {
  const { owner, space, piece } = task
  const tries = [...task.tries].reverse()
  const startSize = options.offsetSize
  // Half the longest text at the start size, and the reach its middle may lie from the land.
  const extra = Math.max(
    ...tries.map(({ name }) => (name.length / 2 + OFFSET_REACH * name.height) * startSize)
  )
  const wide = widenedSpace(space, owner, grid, Math.ceil(extra) + 1)
  const tag = pieceTag(owner, piece)
  const open = occupancy === undefined ? wide : withOccupied(wide, occupancy, tag)
  const fitting = fittingOf(open, options.neighbourBite)
  for (const { text, name, minSize } of tries) {
    const set = offsetName(fitting, name, { minSize, startSize: Math.max(minSize, startSize) })
    if (set === null) continue
    const glyphs = layOut(set, name, wide)
    if (occupancy !== undefined)
      occupy(occupancy, tag, { ...name, advances: name.advances, text, size: set.size, glyphs })
    return { owner, text, piece, size: set.size, glyphs }
  }
  return null
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
 * @param options - how a name is set, how far it bites into a neighbour, the sizes, the straits and far realms
 * @param occupancy - the cells names already cover on this grid, shared by the calls that place one level's names:
 *   given, every name keeps off the cells of other realms' names and marks its own, the largest realms first; left
 *   out, the names are placed each in its own realm alone
 * @returns the names written, one per realm they fit in, largest first; the owners left for a closer zoom; the owners
 *   with no cell
 * @throws when the grid's size is not `width × height`, an owner is asked for twice — two names in one space would be
 *   laid on each other — a name's measure does not describe its text, or the bite is below zero
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
  if (!(options.neighbourBite >= 0))
    throw new Error(
      `[atlas] a bite of ${String(options.neighbourBite)} cells into a neighbour: zero or more`
    )
  const realms = ownerRealms(owners, width, height, {
    strait: options.strait,
    farShare: options.farShare,
    farCells: options.farCells,
    ring: REALM_RING,
  })
  const absent = names.flatMap(({ owner }) => (realms.has(owner) ? [] : [owner]))
  const tasks = tasksOf(names, realms, measure, options)
  const placed = tasks.flatMap((task) => placeInRealm(task, options, occupancy) ?? [])
  // Last, so it takes no one's room: the offset label of each realm named nowhere (ATLAS-315).
  const named = new Set(placed.map(({ owner }) => owner))
  const grid = { owners, width, height }
  for (const task of tasks) {
    if (task.piece !== 0 || named.has(task.owner)) continue
    const offset = placeOffset(task, grid, options, occupancy)
    if (offset !== null) placed.push(offset)
  }
  const written = new Set(placed.map(({ owner }) => owner))
  const tooSmall = names.flatMap(({ owner }) =>
    realms.has(owner) && !written.has(owner) ? [owner] : []
  )

  placed.sort((a, b) => b.size - a.size)
  return { placed, tooSmall, absent }
}
