/**
 * The country names of one display level as geometry over the relief (ATLAS-301): each letter a tile cut from the
 * names' sheet, set on its baseline place and turned with its line.
 *
 * **Each name is a flat sheet, at the median height of the ground under it** (the dev, 2026-10-28). Draped on the
 * relief, a name followed every slope and over hills it bent past reading — Hungary, the Empire of the Romans:
 * *« des fois, ça l'est tellement qu'en fait, c'est illisible »*. Flat, it never bends. Held first at its highest
 * ground, it rose with the mountains, and a sheet lifted that high slides up the screen under a tilted camera — the
 * Roman Empire held at the Alps' height, Norway above its fjords: *« on dirait que tout est ramené légèrement vers le
 * haut »*. At its median, it stays over its country; the hills that rise through it are not drawn over it, the layer
 * drawing over the relief (`nameLayer`).
 */

import { BufferGeometry, Float32BufferAttribute } from 'three'

import { HALO_FIELD_EM, SHEET_PAD } from './glyphSheet'

import type { NameSheet } from '../../../sources/mapSources'
import type { WorldPoint } from '../../relief/drapeProjection'
import type { PlacedYearName } from '@europe-historical-atlas/core/pipeline/yearNames'

/** The fewest steps a tile is cut into on each side — a small letter's. */
export const MIN_TILE_STEPS = 3

/** The most — a letter of the largest names, kept to a few thousand vertices. */
export const MAX_TILE_STEPS = 48

/**
 * Steps a tile is cut into per unit of the name's size, on each side: about one vertex per cell of the relief, which
 * has some 1.07 cells per cell of the names' grid (1280 segments to 1200 cells) and a tile some 1.4 sizes tall.
 * Cut coarser, the relief rises between a tile's vertices and covers its lower part: the tails of Fondamento's « g »
 * and « y » vanished under the plain of Hungary at three steps a tile (seen on the atlas, 2026-10-28).
 */
const STEPS_PER_SIZE = 1.5

/**
 * How many steps a letter's tile is cut into on each side, so its vertices follow the ground as the relief's do.
 * @param size - the name's size, in cells of the names' grid
 * @returns the steps
 */
export function tileSteps(size: number): number {
  return Math.min(MAX_TILE_STEPS, Math.max(MIN_TILE_STEPS, Math.ceil(size * STEPS_PER_SIZE)))
}

/** What a level's geometry is built from. */
export interface NameGeometryInput {
  /** The names of the level, placed in the names' grid. */
  readonly names: readonly PlacedYearName[]
  /** The sheet the letters are cut from. */
  readonly sheet: Pick<NameSheet, 'cells' | 'ascent' | 'descent'>
  /** The names' grid, in cells — a cell's centre at its integer index. */
  readonly grid: { readonly width: number; readonly height: number }
  /**
   * A grid coordinate on the relief's surface, before its exaggeration.
   * @param u - west→east, `0..1`
   * @param v - north→south, `0..1`
   * @returns the world position
   */
  readonly draped: (u: number, v: number) => WorldPoint
  /** The letters' white edge, in cells of the names' grid — the same on the map for every name. */
  readonly haloCells: number
}

/**
 * The widest white edge a letter is given, in ems of its name: inside the tile's pad and the edge field's reach, with a
 * tenth to spare. A wider edge — the map's fixed width around a small name — fills the whole tile, and the name sits in
 * a white box (seen on the atlas, 2026-10-28, the Aegean islands' « ROMANS »). Past it, a small name's edge is
 * narrower on the map than a large one's.
 */
export const HALO_MAX_EM = 0.9 * Math.min(SHEET_PAD, HALO_FIELD_EM)

/** The buffers a level's tiles are written into. */
interface Buffers {
  readonly positions: number[]
  readonly uvs: number[]
  /** Each vertex's edge width, in ems of its own name: the map's fixed width over the name's size. */
  readonly halos: number[]
  readonly indices: number[]
}

/** One letter's tile: where it stands, how it is turned, how large, and its cell on the sheet. */
interface Tile {
  /** Its baseline place, in the names' grid. */
  readonly x: number
  /** Its baseline place, `y` downward. */
  readonly y: number
  /** Its line's direction, radians from `+x` towards `+y`. */
  readonly angle: number
  /** The name's size, in cells. */
  readonly size: number
  /** Its cell on the sheet. */
  readonly cell: { u0: number; u1: number; v0: number; v1: number; advance: number }
}

/**
 * Write one letter's tile: a grid of {@link tileSteps} steps a side, from its foot to its top across its line,
 * from its left pad to its right along it.
 * @param tile - the letter
 * @param input - the sheet's reach, the grid and the projection
 * @param out - the buffers, extended
 */
function writeTile(tile: Tile, input: NameGeometryInput, out: Buffers): void {
  const { x, y, angle, size, cell } = tile
  const half = (cell.advance / 2 + SHEET_PAD) * size
  const foot = -input.sheet.descent * size
  const top = input.sheet.ascent * size
  // Along the line, and the letters' up: the line turned a quarter towards the top of the page.
  const [dx, dy] = [Math.cos(angle), Math.sin(angle)]
  const [ux, uy] = [Math.sin(angle), -Math.cos(angle)]
  const first = out.positions.length / 3
  const steps = tileSteps(size)
  for (let row = 0; row <= steps; row += 1) {
    const t = row / steps
    const across = foot + (top - foot) * t
    for (let column = 0; column <= steps; column += 1) {
      const s = column / steps
      const along = -half + 2 * half * s
      const gx = x + along * dx + across * ux
      const gy = y + along * dy + across * uy
      out.positions.push(...input.draped(gx / (input.grid.width - 1), gy / (input.grid.height - 1)))
      // The sheet is uploaded flipped (three's default): its top row is at the texture's top, `1`.
      out.uvs.push(cell.u0 + (cell.u1 - cell.u0) * s, 1 - (cell.v1 + (cell.v0 - cell.v1) * t))
      out.halos.push(Math.min(HALO_MAX_EM, input.haloCells / size))
    }
  }
  const side = steps + 1
  for (let row = 0; row < steps; row += 1)
    for (let column = 0; column < steps; column += 1) {
      const at = first + row * side + column
      out.indices.push(at, at + 1, at + side, at + 1, at + side + 1, at + side)
    }
}

/**
 * Lay a name's vertices flat at the median of their heights — the ground's, where its tiles were sampled densely
 * enough to follow it.
 * @param positions - every vertex's `x, y, z`, the name's from `first` on — changed in place
 * @param first - where the name's vertices start, in the array
 */
function flatten(positions: number[], first: number): void {
  const heights: number[] = []
  for (let at = first + 1; at < positions.length; at += 3) heights.push(positions[at] ?? Number.NaN)
  heights.sort((a, b) => a - b)
  const median = heights[Math.floor(heights.length / 2)] ?? Number.NaN
  for (let at = first + 1; at < positions.length; at += 3) positions[at] = median
}

/**
 * The geometry of one display level's names.
 * @param input - the names, the sheet, the grid and the projection
 * @returns the tiles: positions, texture coordinates and each vertex's edge width
 * @throws when a letter has no cell on the sheet — the sheet is drawn from the very names placed, so a miss is a
 *   defect, and a tile cut from the wrong cell would write another letter
 */
export function nameGeometry(input: NameGeometryInput): BufferGeometry {
  const out: Buffers = { positions: [], uvs: [], halos: [], indices: [] }
  for (const name of input.names) {
    const first = out.positions.length
    Array.from(name.text).forEach((character, at) => {
      if (character === ' ') return
      const cell = input.sheet.cells.get(character)
      const place = name.glyphs[at]
      if (cell === undefined)
        throw new Error(`[atlas] "${character}" of "${name.text}" has no cell on the names' sheet`)
      if (place === undefined)
        throw new Error(`[atlas] "${name.text}" has no place for its letter ${String(at)}`)
      writeTile({ ...place, size: name.size, cell }, input, out)
    })
    flatten(out.positions, first)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(out.positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(out.uvs, 2))
  geometry.setAttribute('haloEm', new Float32BufferAttribute(out.halos, 1))
  geometry.setIndex(out.indices)
  return geometry
}
