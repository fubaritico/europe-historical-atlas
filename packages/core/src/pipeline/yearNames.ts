/**
 * A year's country names, placed at every display level at once (ATLAS-301, step 3 of
 * `files/plans/atlas/country-names.md`): what the atlas asks its compute for once per year, never on a zoom —
 * a level takes about two seconds on 1100 (measured 2026-10-28), so the zoom only fades between levels
 * already placed.
 *
 * **Worker-safe**: the request is plain data. The letters are measured by the page, which has the face
 * loaded, into a table — one width and reach per character — and the placement reads that table; a worker
 * would have to load the face again to measure, and a different load could measure differently.
 */

import { rasteriseRegions } from '../data/regionRaster'

import { placeNames } from './namePlacement'
import { ownerGrid } from './ownerGrid'

import type { MeasureName, NamePlacementOptions, PlacedGlyph } from './namePlacement'
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
  /** Each polity's name, by id; a polity absent here carries no name. */
  readonly names: Readonly<Record<string, string>>
  /** Every character of the names, measured in the face they are drawn in. */
  readonly glyphs: Readonly<Record<string, GlyphMetric>>
  /** The names' grid, in cells across; its height keeps the map's proportions. */
  readonly gridWidth: number
  /** The names' grid, in cells down. */
  readonly gridHeight: number
  /** The margin, the smallest size and the two gains. */
  readonly options: NamePlacementOptions
}

/** One name placed in one piece, by polity. */
export interface PlacedYearName {
  /** The polity named. */
  readonly polity: string
  /** The name. */
  readonly text: string
  /** The font size, in cells of the names' grid. */
  readonly size: number
  /** Each letter's place, in cells of the names' grid, on its baseline. */
  readonly glyphs: readonly PlacedGlyph[]
}

/** The names of one display level. */
export interface LevelNames {
  /** The names written, largest first. */
  readonly placed: readonly PlacedYearName[]
  /** The polities shown at this level whose name fits nowhere at the smallest size. */
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
 * Place a year's names at every display level.
 * @param request - the regions, the bearers by level, the names, the measured characters and the options
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
    const placement = placeNames(owners, gridWidth, gridHeight, asked, measure, options)
    const polity = (owner: number): string => {
      const id = ids[owner]
      // Every owner `placeNames` returns is one it was asked about, an index into `ids`.
      if (id === undefined) throw new Error(`[atlas] owner ${String(owner)} stands for no polity`)
      return id
    }
    return {
      placed: placement.placed.map(({ owner, text, size, glyphs }) => ({
        polity: polity(owner),
        text,
        size,
        glyphs,
      })),
      tooSmall: placement.tooSmall.map(polity),
    }
  })
  return { levels, gridWidth, gridHeight, unnamed: [...unnamed] }
}
