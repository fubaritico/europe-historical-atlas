/**
 * The graduated border that tells the reader they are looking at a map.
 *
 * The alternating band of old charts and Ordnance Survey sheets: one dark segment per degree, ticks
 * every few. It is not decoration for its own sake — it is the one element that says *this is a
 * projection of the world, and here is its scale*, which nothing else on the map says.
 *
 * The graduations fall on **real degrees**, which is why the side bands are not evenly spaced: Web
 * Mercator stretches latitude toward the poles, so a degree takes steadily *more* room as it goes north
 * — measured on this map, 0.10 world units at 15°N against 0.39 at 75°N, against a flat 0.097 per
 * degree of longitude everywhere. Spacing them evenly would have been easier and would have looked
 * wrong to anyone who has held a chart.
 */

import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial } from 'three'

import { latitudeToVertical, longitudeToHorizontal } from '../geo/mercator'
import { hexToRgb } from '../utils/color'

import type { GeoBounds } from '../geo/mercator'
import type { RgbColor } from '../utils/color'
import type { Object3D } from 'three'

/** One rectangle of the frame, in world XZ. */
export interface FrameQuad {
  /** West edge. */
  x0: number
  /** East edge. */
  x1: number
  /** North edge. */
  z0: number
  /** South edge. */
  z1: number
  /** Whether it is inked, or left as paper. */
  ink: boolean
}

/** How the frame is drawn. */
export interface GraticuleFrameOptions {
  /** The map's geographic bounds, which the graduations are read from. */
  bounds: GeoBounds
  /** World-space width of the map on X. */
  worldWidth: number
  /** World-space depth on Z. */
  worldDepth: number
  /** Width of the band, in world units. */
  bandWidth: number
  /** Degrees per alternation. */
  bandStepDeg: number
  /** Length of a graduation tick beyond the band; zero draws none. */
  tickLength: number
  /** Degrees between ticks. */
  tickStepDeg: number
  /** The band's dark ink, as a hex string. */
  ink: string
  /**
   * The paper between the dark segments.
   *
   * The sea's own tone, read from the terrain options rather than tuned apart: the margin continues the
   * water it abuts, so the reader sees one sheet with a map drawn on it rather than two surfaces.
   */
  paper: RgbColor
  /** How far above the sea the frame sits. */
  lift: number
}

/**
 * Every multiple of `step` inside a range, as its degree index.
 *
 * The index, not the value, because the alternation must be anchored to the degrees themselves: a band
 * whose parity depended on where the map happened to be cropped would flip colour for no reason.
 * @param from - the range's start in degrees
 * @param to - its end
 * @param step - the spacing in degrees
 * @returns the indices, ascending
 */
export function degreeIndices(from: number, to: number, step: number): number[] {
  const safeStep = Math.max(1e-6, step)
  const first = Math.ceil(Math.min(from, to) / safeStep)
  const last = Math.floor(Math.max(from, to) / safeStep)
  const out: number[] = []
  for (let i = first; i <= last; i++) out.push(i)
  return out
}

/**
 * Where each graduation of one axis falls, in world units along it.
 * @param options - the frame's settings
 * @param axis - `x` reads longitudes across the map, `z` reads latitudes down it
 * @param step - the spacing in degrees
 * @returns the positions, paired with the degree index that produced them
 */
export function graduations(
  options: GraticuleFrameOptions,
  axis: 'x' | 'z',
  step: number
): { at: number; index: number }[] {
  const { bounds } = options
  const alongX = axis === 'x'
  const from = alongX ? bounds.west : bounds.south
  const to = alongX ? bounds.east : bounds.north
  const span = alongX ? options.worldWidth : options.worldDepth
  return degreeIndices(from, to, step).map((index) => {
    const degrees = index * step
    const t = alongX ? longitudeToHorizontal(degrees, bounds) : latitudeToVertical(degrees, bounds)
    return { at: (t - 0.5) * span, index }
  })
}

/**
 * The alternating segments of one band, from the graduations that divide it.
 * @param marks - the graduation positions along the band
 * @param start - where the band begins
 * @param end - where it ends
 * @returns the segments, each with the parity of the degree that opens it
 */
function segmentsBetween(
  marks: { at: number; index: number }[],
  start: number,
  end: number
): { from: number; to: number; ink: boolean }[] {
  const out: { from: number; to: number; ink: boolean }[] = []
  let previous = start
  // The first segment runs from the band's start to the first graduation, and carries the parity of
  // the degree *before* it — so the alternation stays anchored to degrees out into the corners.
  let parity = ((marks[0]?.index ?? 0) - 1) % 2 !== 0
  for (const mark of marks) {
    if (mark.at > previous) out.push({ from: previous, to: mark.at, ink: parity })
    previous = mark.at
    parity = mark.index % 2 !== 0
  }
  if (end > previous) out.push({ from: previous, to: end, ink: parity })
  return out
}

/**
 * Every rectangle the frame is made of: four bands, and their graduation ticks.
 *
 * Pure, and separate from the drawing, because this is the cartography — where a degree falls on a
 * Mercator sheet — and it should be checkable against a real chart without a renderer in the room.
 * @param options - the frame's settings
 * @returns the rectangles, in world XZ
 */
export function buildFrameQuads(options: GraticuleFrameOptions): FrameQuad[] {
  const halfWidth = options.worldWidth / 2
  const halfDepth = options.worldDepth / 2
  const outerX = halfWidth + options.bandWidth
  const outerZ = halfDepth + options.bandWidth
  const quads: FrameQuad[] = []

  // North and south bands run the full width, corners included, so the corners are never empty.
  for (const segment of segmentsBetween(
    graduations(options, 'x', options.bandStepDeg),
    -outerX,
    outerX
  )) {
    const { from, to, ink } = segment
    quads.push({ x0: from, x1: to, z0: -outerZ, z1: -halfDepth, ink })
    quads.push({ x0: from, x1: to, z0: halfDepth, z1: outerZ, ink })
  }
  // East and west bands run only between them.
  for (const segment of segmentsBetween(
    graduations(options, 'z', options.bandStepDeg),
    -halfDepth,
    halfDepth
  )) {
    const { from, to, ink } = segment
    quads.push({ x0: -outerX, x1: -halfWidth, z0: from, z1: to, ink })
    quads.push({ x0: halfWidth, x1: outerX, z0: from, z1: to, ink })
  }

  if (options.tickLength <= 0) return quads
  const tick = options.tickLength
  const thin = Math.max(1e-4, options.bandWidth * 0.06)
  for (const mark of graduations(options, 'x', options.tickStepDeg)) {
    quads.push({
      x0: mark.at - thin,
      x1: mark.at + thin,
      z0: -outerZ - tick,
      z1: -outerZ,
      ink: true,
    })
    quads.push({ x0: mark.at - thin, x1: mark.at + thin, z0: outerZ, z1: outerZ + tick, ink: true })
  }
  for (const mark of graduations(options, 'z', options.tickStepDeg)) {
    quads.push({
      x0: -outerX - tick,
      x1: -outerX,
      z0: mark.at - thin,
      z1: mark.at + thin,
      ink: true,
    })
    quads.push({ x0: outerX, x1: outerX + tick, z0: mark.at - thin, z1: mark.at + thin, ink: true })
  }
  return quads
}

/** A mounted frame. */
export interface GraticuleFrame {
  /** The mesh, to add to a scene. */
  object: Object3D
  /** Free its GPU resources. */
  dispose: () => void
}

/**
 * Build the frame as one mesh.
 *
 * One draw call for a couple of hundred rectangles: they differ only in colour, so vertex colours carry
 * that and the geometry stays a single buffer.
 * @param options - the frame's settings
 * @returns the mounted frame
 */
export function createGraticuleFrame(options: GraticuleFrameOptions): GraticuleFrame {
  const quads = buildFrameQuads(options)
  const ink = hexToRgb(options.ink)
  const paper = options.paper
  const positions = new Float32Array(quads.length * 6 * 3)
  const colors = new Float32Array(quads.length * 6 * 3)
  let o = 0
  for (const quad of quads) {
    const tone = quad.ink ? ink : paper
    // Wound so the face normal points UP. Taken the other way round the whole frame is back-facing and
    // a `FrontSide` material draws nothing at all — which is exactly what happened, and what the sheet
    // did not suffer because three winds its own `PlaneGeometry`.
    const corners = [
      [quad.x0, quad.z0],
      [quad.x1, quad.z1],
      [quad.x1, quad.z0],
      [quad.x0, quad.z0],
      [quad.x0, quad.z1],
      [quad.x1, quad.z1],
    ] as const
    for (const [x, z] of corners) {
      positions[o] = x
      positions[o + 1] = options.lift
      positions[o + 2] = z
      colors[o] = tone.r / 255
      colors[o + 1] = tone.g / 255
      colors[o + 2] = tone.b / 255
      o += 3
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  const material = new MeshBasicMaterial({ vertexColors: true })
  return {
    object: new Mesh(geometry, material),
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
