/**
 * The graduated border that tells the reader they are looking at a map.
 *
 * The alternating band of old charts: one dark block per degree, closed by a fine rule either side. It
 * is not decoration for its own sake — it is the one element that says *this is a projection of the
 * world, and here is its scale*, which nothing else on the map says.
 *
 * Proportions taken from Ortelius, *Galliae Veteris Typus*, 1594: the band is **thin**, its blocks two
 * or three times wider than it is thick, and **nothing protrudes from it**. The first attempt here had
 * that backwards — blocks taller than wide, with separate ticks hanging off the outside — and read as a
 * zebra crossing rather than as a chart. The checker *is* the graduation; a tick beside it says the
 * same thing twice.
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
  /** Thickness of the checkered band, in world units. */
  bandWidth: number
  /** Degrees per alternation. */
  bandStepDeg: number
  /** Thickness of the fine rules that close the band on both sides; zero draws none. */
  ruleWidth: number
  /** Width of the lane beyond the band where the degree labels sit. */
  labelLaneWidth: number
  /** The band's dark ink, as a hex string. */
  ink: string
  /** How opaque the dark blocks are. Below one the vellum reads through them, softening the band. */
  bandOpacity: number
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
 *
 * **Sorted by position, not by degree.** North is `v = 0`, so ascending latitudes come out descending
 * in Z — and a band cut from marks running backwards is not cut at all: it comes out as two enormous
 * segments spanning the whole side, which is exactly what the east and west borders did until this
 * sort existed. The longitudes never showed it, because they happen to ascend both ways.
 * @param options - the frame's settings
 * @param axis - `x` reads longitudes across the map, `z` reads latitudes down it
 * @param step - the spacing in degrees
 * @returns the positions, ascending, paired with the degree index that produced them
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
  return degreeIndices(from, to, step)
    .map((index) => {
      const degrees = index * step
      const t = alongX
        ? longitudeToHorizontal(degrees, bounds)
        : latitudeToVertical(degrees, bounds)
      return { at: (t - 0.5) * span, index }
    })
    .sort((a, b) => a.at - b.at)
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
  const rule = Math.max(0, options.ruleWidth)
  // Outward from the map: a fine rule, the checkered band, a second fine rule, then the label lane.
  const bandFromX = halfWidth + rule
  const bandToX = bandFromX + options.bandWidth
  const bandFromZ = halfDepth + rule
  const bandToZ = bandFromZ + options.bandWidth
  const outerX = bandToX + rule
  const outerZ = bandToZ + rule
  // Beyond the numbers, a last rule closing the whole margin — the outermost line of the reference.
  const edgeFromX = outerX + options.labelLaneWidth
  const edgeFromZ = outerZ + options.labelLaneWidth
  const quads: FrameQuad[] = []

  // A closed rectangular ring. The map is not square, so X and Z carry their own extents — taking one
  // for the other would put the side rules in the sea.
  const ring = (fromX: number, toX: number, fromZ: number, toZ: number): void => {
    // The horizontal runs carry the corners, so no corner is ever left empty.
    quads.push({ x0: -toX, x1: toX, z0: -toZ, z1: -fromZ, ink: true })
    quads.push({ x0: -toX, x1: toX, z0: fromZ, z1: toZ, ink: true })
    quads.push({ x0: -toX, x1: -fromX, z0: -fromZ, z1: fromZ, ink: true })
    quads.push({ x0: fromX, x1: toX, z0: -fromZ, z1: fromZ, ink: true })
  }

  if (rule > 0) {
    ring(halfWidth, bandFromX, halfDepth, bandFromZ)
    ring(bandToX, outerX, bandToZ, outerZ)
    ring(edgeFromX, edgeFromX + rule, edgeFromZ, edgeFromZ + rule)
  }

  // North and south bands run the full width, corners included.
  for (const segment of segmentsBetween(
    graduations(options, 'x', options.bandStepDeg),
    -bandToX,
    bandToX
  )) {
    const { from, to, ink } = segment
    quads.push({ x0: from, x1: to, z0: -bandToZ, z1: -bandFromZ, ink })
    quads.push({ x0: from, x1: to, z0: bandFromZ, z1: bandToZ, ink })
  }
  // East and west bands run only between them.
  for (const segment of segmentsBetween(
    graduations(options, 'z', options.bandStepDeg),
    -bandFromZ,
    bandFromZ
  )) {
    const { from, to, ink } = segment
    quads.push({ x0: -bandToX, x1: -bandFromX, z0: from, z1: to, ink })
    quads.push({ x0: bandFromX, x1: bandToX, z0: from, z1: to, ink })
  }
  return quads
}

/**
 * Where the degree labels belong, in world units from the map's centre.
 *
 * Outside the band and its outer rule, in a lane of their own — as on Ortelius, where the numbers sit
 * in the margin rather than on the graduation they name.
 * @param options - the frame's settings
 * @returns the lane's inner and outer edges on each axis
 */
export function labelLane(options: GraticuleFrameOptions): {
  fromX: number
  toX: number
  fromZ: number
  toZ: number
} {
  const rule = Math.max(0, options.ruleWidth)
  const fromX = options.worldWidth / 2 + rule * 2 + options.bandWidth
  const fromZ = options.worldDepth / 2 + rule * 2 + options.bandWidth
  return {
    fromX,
    toX: fromX + options.labelLaneWidth,
    fromZ,
    toZ: fromZ + options.labelLaneWidth,
  }
}

/**
 * Draw order of the frame, above the terrain and its cut edge.
 *
 * The frame is printed on the sheet: nothing belonging to the map is ever meant to cover it, and its
 * appearing or not must not depend on which queue an opacity slider happens to put it in.
 */
export const FRAME_RENDER_ORDER = 5

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
  // Only the inked blocks are drawn. The light ones are the paper itself, left to show through — which
  // is both fewer triangles and the only way they can carry exactly the sheet's own fibre.
  const quads = buildFrameQuads(options).filter((quad) => quad.ink)
  const ink = hexToRgb(options.ink)
  const positions = new Float32Array(quads.length * 6 * 3)
  const colors = new Float32Array(quads.length * 6 * 3)
  let o = 0
  for (const quad of quads) {
    const tone = ink
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
  // Transparent by intent, not by accident: below one the vellum reads through the dark blocks and the
  // band settles into the paper instead of sitting on it.
  const material = new MeshBasicMaterial({
    vertexColors: true,
    transparent: options.bandOpacity < 1,
    opacity: options.bandOpacity,
    depthWrite: false,
  })
  const mesh = new Mesh(geometry, material)
  // **Drawn after the map's own solids, explicitly.** The frame writes no depth (it would z-fight with
  // the sheet a few thousandths below it), so anything drawn *after* it and passing the depth test
  // paints straight over it. At `bandOpacity` 1 the material stops being transparent, the mesh moves
  // into the opaque queue — which three sorts front-to-back — and the map's cut edge, being further
  // away, was drawn afterwards and erased the whole band. Nothing said so: the band simply was not
  // there, while the degree labels, still transparent at 0.88, survived. Found on screen 2026-09-18.
  mesh.renderOrder = FRAME_RENDER_ORDER
  return {
    object: mesh,
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
