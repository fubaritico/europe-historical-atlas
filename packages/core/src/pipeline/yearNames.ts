/**
 * A year's country names, placed at every display level at once (ATLAS-301, step 3 of
 * `files/plans/atlas/country-names.md`): what the atlas asks its compute for once per year, never on a zoom —
 * a level takes about two seconds on 1100 (measured 2026-10-28), so the zoom only fades between levels
 * already placed.
 *
 * **One name a piece, the full one where it fits** (the dev, 2026-10-29: *« Kingdom of France → France, et ça pour
 * tout »*): each piece is given the polity's full name where it reaches the long name's smallest size, its short one
 * otherwise. No abbreviation, and nothing comes in progressively: a level shows all its names at once.
 *
 * **Worker-safe**: the request is plain data. The letters are measured by the page, which has the face
 * loaded, into a table — one width and reach per character — and the placement reads that table; a worker
 * would have to load the face again to measure, and a different load could measure differently.
 */

import { rasteriseRegions } from '../data/regionRaster'

import { createOccupancy } from './nameOccupancy'
import { placeNames } from './namePlacement'
import { ownerGrid } from './ownerGrid'

import type {
  MeasureName,
  NamePlacement,
  NamePlacementOptions,
  NameRequest,
  PlacedGlyph,
} from './namePlacement'
import type { Region } from '../data/regionSource'

/** One character measured at a font size of one. */
export interface GlyphMetric {
  /** Its advance: its width, plus the spacing after it. */
  readonly advance: number
  /** How far it reaches above the baseline. */
  readonly ascent: number
  /** How far below. */
  readonly descent: number
}

/** A year's names to place, in plain data a worker can be handed. */
export interface YearNamesRequest {
  /** The year's regions, in normalized grid coordinates — the ones the fills are drawn from. */
  readonly regions: readonly Region[]
  /**
   * For each display level, `0` to the deepest, the polity each region's colour belongs to, in the regions'
   * order (`editor/regionBearers`).
   */
  readonly bearersByLevel: readonly (readonly string[])[]
  /** Each polity's name, by id — the short one; a polity absent here carries no name. */
  readonly names: Readonly<Record<string, string>>
  /**
   * Each polity's full name, by id, written in a piece where it reaches the long name's smallest size — the short one
   * otherwise; a polity absent here, or whose full name is its short one, has only the short one.
   */
  readonly fullNames: Readonly<Record<string, string>>
  /** Every character of the names, measured in the face they are drawn in. */
  readonly glyphs: Readonly<Record<string, GlyphMetric>>
  /** The names' grid, in cells across; its height keeps the map's proportions. */
  readonly gridWidth: number
  /** The names' grid, in cells down. */
  readonly gridHeight: number
  /** The margin, the smallest size and the two gains. */
  readonly options: NamePlacementOptions
}

/** One form of a polity's name: the full one (« Kingdom of France »), or the short one (« France »). */
export type NameForm = 'short' | 'full'

/** One name placed in one piece, by polity. */
export interface PlacedYearName {
  /** The polity named. */
  readonly polity: string
  /** The name. */
  readonly text: string
  /** Which form of the polity's name it is. */
  readonly form: NameForm
  /** Which of the polity's pieces it is written in, `0` the largest. */
  readonly piece: number
  /** The font size, in cells of the names' grid. */
  readonly size: number
  /** Each letter's place, in cells of the names' grid, on its baseline. */
  readonly glyphs: readonly PlacedGlyph[]
}

/** The names of one display level. */
export interface LevelNames {
  /** The names written, largest first: one per piece, its full name where it fits, its short one otherwise. */
  readonly placed: readonly PlacedYearName[]
  /** The polities shown at this level neither of whose names fits anywhere at the smallest size. */
  readonly tooSmall: readonly string[]
}

/** A year's names, every level placed. */
export interface YearNames {
  /** One entry per display level, `0` to the deepest. */
  readonly levels: readonly LevelNames[]
  /** The grid the places are in, in cells across — a cell's centre at its integer index. */
  readonly gridWidth: number
  /** In cells down. */
  readonly gridHeight: number
  /** The polities with no name in the request: shown, named nowhere — for the caller to say once. */
  readonly unnamed: readonly string[]
}

/**
 * A measure of names read from a table of characters: a text's advances are its characters', its reach the
 * furthest of theirs either side of the baseline.
 * @param glyphs - every character measured
 * @returns the measure `placeNames` takes
 * @throws when a text holds a character the table lacks — the page measures every character of the names, so
 *   a miss is a defect, and a guessed width would set the name off its line
 */
export function tableMeasure(glyphs: Readonly<Record<string, GlyphMetric>>): MeasureName {
  return (text) => {
    const metrics = Array.from(text, (character) => {
      const metric = glyphs[character]
      if (metric === undefined)
        throw new Error(`[atlas] "${character}" of "${text}" was not measured`)
      return metric
    })
    return {
      advances: metrics.map(({ advance }) => advance),
      ascent: Math.max(0, ...metrics.map(({ ascent }) => ascent)),
      descent: Math.max(0, ...metrics.map(({ descent }) => descent)),
    }
  }
}

/**
 * The polity an owner of a level's grid stands for.
 * @param ids - the level's polities, by owner
 * @param owner - the owner
 * @returns its polity
 * @throws when the owner stands for none — every owner `placeNames` returns is one it was asked about, an index into
 *   `ids`
 */
function polityOf(ids: readonly string[], owner: number): string {
  const id = ids[owner]
  if (id === undefined) throw new Error(`[atlas] owner ${String(owner)} stands for no polity`)
  return id
}

/**
 * One level's names: each polity's full name in every piece it fits in, its short one where it does not (the dev,
 * 2026-10-29: *« Kingdom of France → France, et ça pour tout »*). No abbreviation is ever written: *« je veux des noms,
 * qu'on lit, qu'on comprend »*.
 * @param request - the year's request, for the full names
 * @param ids - the polity of each owner of the level's grid
 * @param asked - the short names, by owner
 * @param place - places names on the level's grid
 * @returns the level's names, and the polities neither of whose names is written
 */
function levelNames(
  request: YearNamesRequest,
  ids: readonly string[],
  asked: readonly NameRequest[],
  place: (wanted: readonly NameRequest[]) => NamePlacement
): LevelNames {
  const shortOf = new Map(asked.map(({ owner, text }) => [owner, text]))
  const placement = place(
    asked.map(({ owner, text }) => {
      const full = request.fullNames[polityOf(ids, owner)]
      return full === undefined || full === text
        ? { owner, text }
        : { owner, text: full, shorter: text }
    })
  )
  return {
    placed: placement.placed.map(({ owner, text, piece, size, glyphs }) => ({
      polity: polityOf(ids, owner),
      text,
      form: text === shortOf.get(owner) ? ('short' as const) : ('full' as const),
      piece,
      size,
      glyphs,
    })),
    tooSmall: placement.tooSmall.map((owner) => polityOf(ids, owner)),
  }
}

/**
 * Place a year's names at every display level.
 * @param request - the regions, the bearers by level, the short and full names, the measured characters and the options
 * @returns the names of each level, and the polities with no name
 * @throws when a level's bearers are not one per region, or a name holds a character not measured
 */
export function placeYearNames(request: YearNamesRequest): YearNames {
  const { regions, gridWidth, gridHeight, names, options } = request
  const cells = rasteriseRegions(regions, gridWidth, gridHeight).cells
  const measure = tableMeasure(request.glyphs)
  const unnamed = new Set<string>()
  const levels = request.bearersByLevel.map((bearers): LevelNames => {
    if (bearers.length !== regions.length)
      throw new Error(
        `[atlas] ${String(bearers.length)} bearers for ${String(regions.length)} regions`
      )
    const { owners, ids } = ownerGrid(cells, bearers)
    const asked = ids.flatMap((id, owner) => {
      const text = names[id]
      if (text === undefined) unnamed.add(id)
      return text === undefined ? [] : [{ owner, text }]
    })
    // One level's names share the cells they cover: none is written over another piece's.
    const occupancy = createOccupancy(gridWidth, gridHeight)
    return levelNames(request, ids, asked, (wanted) =>
      placeNames(owners, gridWidth, gridHeight, wanted, measure, options, occupancy)
    )
  })
  return { levels, gridWidth, gridHeight, unnamed: [...unnamed] }
}
