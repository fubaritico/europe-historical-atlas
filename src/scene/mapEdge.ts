/**
 * The map's thickness: a wall around its edge, cut through the land.
 *
 * Without it the terrain simply stops on a sharp arête, and the reader sees a surface rather than an
 * object. With it the map is a slab — and because the wall's top follows the **real** elevation of the
 * boundary, it reads as a section: Africa and Russia standing proud of the sheet, the Atlantic level
 * with it.
 *
 * **Two parts, because they do not move together.** The relief is scaled live — by the exaggeration,
 * and again by the zoom — so the part between sea level and the land's surface has to follow it, or the
 * wall would come away from the terrain it holds up. The part below sea level is the sheet's own
 * thickness and must not: a board does not get thinner when the mountains are flattened.
 */

import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial } from 'three'

import { hexToRgb } from '../utils/color'

import { meshVertexGrid, reliefWorldY } from './reliefMesh'

import type { DrapeSource, HeightCurve } from './drapeProjection'
import type { RgbColor } from '../utils/color'
import type { Object3D } from 'three'

/** How the edge is cut. */
export interface MapEdgeOptions {
  /** The grid the relief was built from — the wall must meet the same surface. */
  source: DrapeSource
  /** World-space width of the map on X. */
  worldWidth: number
  /** The relief mesh's subdivision on X, so the wall meets it vertex for vertex. */
  segments: number
  /** The height curve the mesh applies. */
  curve: HeightCurve
  /** How far below sea level the sheet's own thickness reaches. */
  depth: number
  /** The soil just under the surface. */
  soil: string
  /** The soil at sea level, deeper and darker. */
  deep: string
  /** The sheet's cut edge, below sea level. */
  base: string
  /** How many bands of strata show in the cut. Zero leaves a clean gradient. */
  strata: number
}

/** A mounted edge. */
export interface MapEdge {
  /** The two walls, as one thing to add to a scene. */
  object: Object3D
  /**
   * Track the relief's live vertical scale.
   *
   * Only the part above sea level follows it. Scaling about the origin leaves the waterline where it
   * is, which is exactly what is wanted: the land breathes, the board does not.
   * @param scaleY - the relief mesh's current `scale.y`
   * @returns nothing
   */
  setReliefScale: (scaleY: number) => void
  /** Free the GPU resources. */
  dispose: () => void
}

/** One point along the map's boundary: where it is, and how high the land stands there. */
export interface EdgePoint {
  /** World X. */
  x: number
  /** World Z. */
  z: number
  /** The surface height, before the live exaggeration. */
  y: number
}

/**
 * Walk the map's boundary, vertex for vertex with the relief mesh.
 *
 * On the mesh's own grid rather than the DEM's: a wall sampled more finely than the surface it meets
 * would show a saw of gaps and overlaps along the join.
 * @param options - how the edge is cut
 * @returns the boundary, anticlockwise from the north-west corner
 */
export function edgeOutline(options: MapEdgeOptions): EdgePoint[] {
  const { source, worldWidth, segments, curve } = options
  const { segX, segY, aspect } = meshVertexGrid(source.meta, segments)
  const worldDepth = worldWidth / aspect
  const at = (u: number, v: number): EdgePoint => ({
    x: (u - 0.5) * worldWidth,
    z: (v - 0.5) * worldDepth,
    y: reliefWorldY(source.sample(u, v), curve),
  })
  const points: EdgePoint[] = []
  for (let i = 0; i < segX; i++) points.push(at(i / segX, 0)) // north, west to east
  for (let i = 0; i < segY; i++) points.push(at(1, i / segY)) // east, north to south
  for (let i = segX; i > 0; i--) points.push(at(i / segX, 1)) // south, east to west
  for (let i = segY; i > 0; i--) points.push(at(0, i / segY)) // west, south to north
  return points
}

/**
 * Build one wall as a closed strip: a quad between each pair of neighbouring boundary points.
 * @param outline - the boundary, closed by wrapping
 * @param topOf - the height of a point's upper edge
 * @param bottom - the height of the lower edge, the same all the way round
 * @param toneOf - the colour at a height, between the two edges
 * @returns the geometry
 */
function buildWall(
  outline: readonly EdgePoint[],
  topOf: (point: EdgePoint) => number,
  bottom: number,
  toneOf: (point: EdgePoint, y: number) => RgbColor
): BufferGeometry {
  const positions = new Float32Array(outline.length * 6 * 3)
  const colors = new Float32Array(outline.length * 6 * 3)
  let o = 0
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]
    const b = outline[(i + 1) % outline.length]
    if (!a || !b) continue
    const corners = [
      [a, topOf(a)],
      [b, topOf(b)],
      [b, bottom],
      [a, topOf(a)],
      [b, bottom],
      [a, bottom],
    ] as const
    for (const [point, y] of corners) {
      const tone = toneOf(point, y)
      positions[o] = point.x
      positions[o + 1] = y
      positions[o + 2] = point.z
      colors[o] = tone.r / 255
      colors[o + 1] = tone.g / 255
      colors[o + 2] = tone.b / 255
      o += 3
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  return geometry
}

/**
 * Mix two tones, banded into strata.
 *
 * Banding rather than a smooth ramp because a cut through ground is never a gradient: it is layers, and
 * the eye reads layers as depth where it reads a gradient as lighting.
 * @param from - the tone at `t = 0`
 * @param to - the tone at `t = 1`
 * @param t - how far down the cut, in `[0, 1]`
 * @param bands - how many strata; zero or one leaves a clean ramp
 * @returns the tone
 */
export function strataTone(from: RgbColor, to: RgbColor, t: number, bands: number): RgbColor {
  const clamped = Math.min(1, Math.max(0, t))
  const stepped = bands > 1 ? Math.floor(clamped * bands) / Math.max(1, bands - 1) : clamped
  const mix = Math.min(1, stepped)
  return {
    r: from.r + (to.r - from.r) * mix,
    g: from.g + (to.g - from.g) * mix,
    b: from.b + (to.b - from.b) * mix,
  }
}

/**
 * Cut the map's edge.
 * @param options - how to cut it
 * @returns the mounted edge
 */
export function createMapEdge(options: MapEdgeOptions): MapEdge {
  const outline = edgeOutline(options)
  const soil = hexToRgb(options.soil)
  const deep = hexToRgb(options.deep)
  const base = hexToRgb(options.base)

  // Above the waterline: the cut through the land, banded from the surface down.
  const section = buildWall(
    outline,
    (point) => point.y,
    0,
    (point, y) => strataTone(soil, deep, point.y > 0 ? 1 - y / point.y : 1, options.strata)
  )
  // Below it: the sheet's own thickness, one tone, and never scaled.
  const board = buildWall(
    outline,
    () => 0,
    -options.depth,
    () => base
  )

  // Both sides drawn. A wall is only ever seen from outside, and four faces around a rectangle is four
  // chances to wind one of them backwards — which costs nothing to rule out and is invisible when it
  // happens, since a back-facing wall simply is not there.
  const material = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide })
  const sectionMesh = new Mesh(section, material)
  const group = new Group()
  group.add(sectionMesh, new Mesh(board, material))

  return {
    object: group,
    setReliefScale(scaleY: number): void {
      sectionMesh.scale.setY(scaleY)
    },
    dispose(): void {
      section.dispose()
      board.dispose()
      material.dispose()
    },
  }
}
