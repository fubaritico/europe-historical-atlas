/**
 * The degrees written in the margin, beside the graduation that names them.
 *
 * Made the way the compass rose is: an SVG, rasterised to a texture. That is the dev's call, and it is
 * the right one — the alternative for text is a font atlas or signed-distance glyphs, neither of which
 * this project needs for twenty numbers.
 *
 * **One atlas, not one texture per label.** The map carries about forty placements of some twenty
 * distinct numbers, and a texture each would be forty draw calls for forty numbers. They are laid out
 * in a grid instead, and every quad points at its own cell.
 *
 * The letters are French — N, S, E, O — because the only other text the reader ever sees is, and a map
 * that says `30°W` beside a panel that says `Chargement de l'année` is speaking two languages.
 */

import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial } from 'three'

import { graduations, labelLane } from './graticuleFrame'

import type { GraticuleFrameOptions } from './graticuleFrame'
import type { Object3D, Texture } from 'three'

/** How many cells the atlas holds across. */
const ATLAS_COLUMNS = 4

/** A cell's pixel size. Twice as wide as tall, which is the shape of `120°O`. */
const CELL_WIDTH = 256
const CELL_HEIGHT = 128

/** Where one number is written, and which one it is. */
export interface LabelPlacement {
  /** Centre on X, in world units. */
  x: number
  /** Centre on Z. */
  z: number
  /** Which entry of the atlas to show. */
  cell: number
}

/** The numbers a frame carries, and where each is written. */
export interface FrameLabelLayout {
  /** The distinct texts, in atlas order. */
  texts: string[]
  /** Every place one of them appears. */
  placements: LabelPlacement[]
}

/**
 * A degree as a reader of charts expects it: the distance from the origin, then the hemisphere.
 *
 * Never a minus sign. `-30°` is arithmetic; `30°O` is a place.
 * @param degrees - the signed degree
 * @param axis - `x` for longitude, `z` for latitude
 * @returns the label
 */
export function degreeLabel(degrees: number, axis: 'x' | 'z'): string {
  const rounded = Math.round(degrees * 100) / 100
  if (rounded === 0) return '0°'
  const hemisphere = axis === 'x' ? (rounded > 0 ? 'E' : 'O') : rounded > 0 ? 'N' : 'S'
  return `${String(Math.abs(rounded))}°${hemisphere}`
}

/**
 * Every number the frame carries, and the four margins they are written in.
 *
 * Each longitude appears twice, north and south, and each latitude twice, east and west — as on a
 * chart, where the reader meets the graduation from whichever side they are working.
 * @param options - the frame's settings
 * @param stepDeg - degrees between numbers
 * @returns the distinct texts and their placements
 */
export function frameLabelLayout(
  options: GraticuleFrameOptions,
  stepDeg: number
): FrameLabelLayout {
  const lane = labelLane(options)
  const midX = (lane.fromX + lane.toX) / 2
  const midZ = (lane.fromZ + lane.toZ) / 2
  const texts: string[] = []
  const placements: LabelPlacement[] = []

  /**
   * Intern a text, so the atlas holds each distinct number once.
   * @param text - the label as printed
   * @returns its cell in the atlas, the existing one when the same text was met before
   */
  const cellOf = (text: string): number => {
    const found = texts.indexOf(text)
    if (found >= 0) return found
    texts.push(text)
    return texts.length - 1
  }

  for (const mark of graduations(options, 'x', stepDeg)) {
    const cell = cellOf(degreeLabel(mark.index * stepDeg, 'x'))
    placements.push({ x: mark.at, z: -midZ, cell }, { x: mark.at, z: midZ, cell })
  }
  for (const mark of graduations(options, 'z', stepDeg)) {
    const cell = cellOf(degreeLabel(mark.index * stepDeg, 'z'))
    placements.push({ x: -midX, z: mark.at, cell }, { x: midX, z: mark.at, cell })
  }
  return { texts, placements }
}

/**
 * Lay the numbers out in a grid and draw them as one SVG.
 *
 * The roughness is the browser's own turbulence, displacing each glyph's outline by a pixel or so. A
 * number printed with a clean vector edge sits ON the vellum; one whose edge is eaten a little settles
 * INTO it, which is the difference between a label and an impression.
 * @param texts - the distinct numbers, in atlas order
 * @param ink - the colour to write them in
 * @param roughness - how far the outline is displaced, in atlas pixels; zero leaves it clean
 * @returns the markup, and the grid it was laid out on
 */
export function buildLabelAtlasSvg(
  texts: readonly string[],
  ink: string,
  roughness = 0
): { svg: string; columns: number; rows: number } {
  const columns = ATLAS_COLUMNS
  const rows = Math.max(1, Math.ceil(texts.length / columns))
  const width = columns * CELL_WIDTH
  const height = rows * CELL_HEIGHT
  const cells = texts
    .map((text, index) => {
      const x = (index % columns) * CELL_WIDTH + CELL_WIDTH / 2
      const y = Math.floor(index / columns) * CELL_HEIGHT + CELL_HEIGHT / 2
      return `<text x="${String(x)}" y="${String(y)}" font-family="Georgia, 'Times New Roman', serif" font-size="66" fill="${ink}" text-anchor="middle" dominant-baseline="central">${text}</text>`
    })
    .join('')
  const rough =
    roughness > 0
      ? `<filter id="grain" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${String(roughness)}" xChannelSelector="R" yChannelSelector="G"/></filter>`
      : ''
  const body = roughness > 0 ? `<g filter="url(#grain)">${cells}</g>` : cells
  // Explicit width and height, not just a viewBox: loaded as an `<img>` for a texture, a viewBox-only
  // SVG rasterises to 0x0 and the whole atlas comes out blank.
  const svg = `<svg width="${String(width)}" height="${String(height)}" viewBox="0 0 ${String(width)} ${String(height)}" xmlns="http://www.w3.org/2000/svg">${rough}${body}</svg>`
  return { svg, columns, rows }
}

/** How the numbers are drawn. */
export interface FrameLabelsOptions extends GraticuleFrameOptions {
  /** Degrees between numbers. */
  labelStepDeg: number
  /** The numbers' own ink — browner than the band's, which is nearly black. */
  labelInk: string
  /** How far the glyph outlines are eaten, in atlas pixels. Zero prints them clean. */
  labelRoughness: number
  /** How opaque the numbers are. */
  labelOpacity: number
  /**
   * Turn the atlas markup into a texture. Injected so a test needs no `Image` and no decoder.
   * @param svg - the markup
   * @returns the texture
   */
  loadTexture: (svg: string) => Texture
}

/** The numbers, mounted. */
export interface FrameLabels {
  /** The mesh, to add to a scene. */
  object: Object3D
  /** Free its GPU resources. */
  dispose: () => void
}

/**
 * Turn the placements into a buffer of quads, each pointing at its own cell of the atlas.
 * @param layout - the numbers and where they are written
 * @param atlas - the grid they were laid out on
 * @param atlas.columns - how many cells the atlas has across
 * @param atlas.rows - how many cells it has down
 * @param size - half the width and half the height of one number, in world units
 * @param size.halfW - half a number's width, in world units
 * @param size.halfH - half a number's height, in world units
 * @param lift - how far above the sea they sit
 * @returns the geometry
 */
function buildLabelGeometry(
  layout: FrameLabelLayout,
  atlas: { columns: number; rows: number },
  size: { halfW: number; halfH: number },
  lift: number
): BufferGeometry {
  const positions = new Float32Array(layout.placements.length * 6 * 3)
  const uvs = new Float32Array(layout.placements.length * 6 * 2)
  let p = 0
  let t = 0
  for (const placement of layout.placements) {
    const column = placement.cell % atlas.columns
    const row = Math.floor(placement.cell / atlas.columns)
    const u0 = column / atlas.columns
    const u1 = (column + 1) / atlas.columns
    // The atlas is decoded as an image, so its first row is the TOP and v = 1 goes with it.
    const v1 = 1 - row / atlas.rows
    const v0 = 1 - (row + 1) / atlas.rows
    const corners = [
      [-size.halfW, -size.halfH, u0, v1],
      [size.halfW, size.halfH, u1, v0],
      [size.halfW, -size.halfH, u1, v1],
      [-size.halfW, -size.halfH, u0, v1],
      [-size.halfW, size.halfH, u0, v0],
      [size.halfW, size.halfH, u1, v0],
    ] as const
    for (const [dx, dz, u, v] of corners) {
      positions[p] = placement.x + dx
      positions[p + 1] = lift
      positions[p + 2] = placement.z + dz
      uvs[t] = u
      uvs[t + 1] = v
      p += 3
      t += 2
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  return geometry
}

/**
 * Write the degrees into the margin.
 * @param options - the frame's settings, the spacing, and how to rasterise
 * @returns the mounted numbers, or `null` when the frame carries none
 */
export function createFrameLabels(options: FrameLabelsOptions): FrameLabels | null {
  const layout = frameLabelLayout(options, options.labelStepDeg)
  if (layout.placements.length === 0) return null
  const atlas = buildLabelAtlasSvg(layout.texts, options.labelInk, options.labelRoughness)
  const height = options.labelLaneWidth * 0.72
  const geometry = buildLabelGeometry(
    layout,
    atlas,
    { halfH: height / 2, halfW: (height * CELL_WIDTH) / CELL_HEIGHT / 2 },
    options.lift
  )
  const texture = options.loadTexture(atlas.svg)
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: options.labelOpacity,
    depthWrite: false,
  })
  return {
    object: new Mesh(geometry, material),
    dispose(): void {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}
