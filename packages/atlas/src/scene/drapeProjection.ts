import { meshVertexGrid, meshWorldDepth, reliefWorldY } from './reliefMesh'

import type { GridFrame, ReliefOptions } from './reliefMesh'

/**
 * The slice of an elevation grid a draped projection reads.
 *
 * Declared structurally rather than importing `Heightmap`: only two members are needed, and a test
 * should be able to satisfy this with a literal instead of building a real grid.
 */
export interface DrapeSource {
  /** Grid dimensions, which give the map plane its aspect ratio. */
  readonly meta: GridFrame
  /**
   * Bilinearly sampled elevation, in metres.
   * @param u - west→east, 0..1
   * @param v - north→south, 0..1
   * @returns the elevation in metres
   */
  sample(u: number, v: number): number
}

/** The relief's height remap — the same curve the mesh applies to its own vertices. */
export type HeightCurve = Pick<ReliefOptions, 'plainsCeiling' | 'peakTarget'>

/** A point in world space, as the line layers expect it. */
export type WorldPoint = [number, number, number]

/**
 * Height of the relief *surface* at a grid coordinate, in world units before exaggeration.
 *
 * Deliberately not `reliefWorldY(source.sample(u, v))`. The mesh is a subdivided plane whose vertices
 * need not fall on the DEM's samples — at 512 segments against a 1280-wide grid its triangles cut
 * straight across some 17 km of terrain — so a point placed at its true DEM elevation can sit *below*
 * the drawn valley floor and be occluded by it. This evaluates the
 * curve on the mesh's own vertex grid and interpolates bilinearly between those nodes, which is the
 * very surface being drawn.
 * @param u - west→east, 0..1
 * @param v - north→south, 0..1
 * @param source - the elevation grid the mesh was built from
 * @param segments - the mesh's subdivision count on X
 * @param curve - the height remap the mesh applies
 * @returns the surface height in world units, before the live `scale.y` exaggeration
 */
export function meshSurfaceY(
  u: number,
  v: number,
  source: DrapeSource,
  segments: number,
  curve: HeightCurve
): number {
  // Asked of the mesh rather than recomputed here: the vertex layout is the mesh's to decide, and a
  // second copy of that arithmetic is how an overlay keeps an old subdivision after the mesh changes.
  const { segX, segY } = meshVertexGrid(source.meta, segments)
  const fx = Math.min(segX, Math.max(0, u * segX))
  const fy = Math.min(segY, Math.max(0, v * segY))
  const x0 = Math.min(segX - 1, Math.floor(fx))
  const y0 = Math.min(segY - 1, Math.floor(fy))
  const tx = fx - x0
  const ty = fy - y0
  const nodeY = (col: number, row: number): number =>
    reliefWorldY(source.sample(col / segX, row / segY), curve)
  const top = nodeY(x0, y0) * (1 - tx) + nodeY(x0 + 1, y0) * tx
  const bottom = nodeY(x0, y0 + 1) * (1 - tx) + nodeY(x0 + 1, y0 + 1) * tx
  return top * (1 - ty) + bottom * ty
}

/**
 * What a projection reads from the composition root.
 *
 * Accessors rather than values, because every one of them is retuned live: the grid is reloaded, the
 * height curve is dragged in the dev panel, the shoreline lift has its own slider. A projection built
 * from a snapshot would silently stop matching the terrain the moment any of them moved.
 */
export interface DrapeProjectionDeps {
  /** World-space width of the map plane on X. */
  readonly worldWidth: number
  /** The relief mesh's subdivision count on X — read live, the dev panel tunes it. */
  segments: () => number
  /**
   * The grid that gives the plane its aspect ratio, or `null` before the elevation has loaded.
   *
   * Kept apart from {@link DrapeProjectionDeps.source} on purpose: the XZ mapping belongs to the raw
   * grid the mesh was sized from, while the height is read off the possibly-smoothed one.
   */
  frame: () => { readonly width: number; readonly height: number } | null
  /** The grid draped overlays sample for height, or `null` before it has been derived. */
  source: () => DrapeSource | null
  /** The live height curve. */
  curve: () => HeightCurve
  /** Lift applied to a flat projection — the rhumbs sit just above a flat sea. */
  flatLift: () => number
  /** Lift of the shoreline above the relief, before the exaggeration the coastline is scaled by. */
  shoreLift: () => number
  /** Lift applied to a draped point before the exaggeration scale, so it clears the terrain. */
  readonly drapedLift: number
}

/**
 * The two mappings every overlay needs to place a normalized grid coordinate in the scene.
 *
 * Declared as function-typed properties rather than methods on purpose: every consumer takes one as a
 * `project` callback, detached from this object, and a method shorthand would promise a `this` that
 * neither implementation has.
 */
export interface DrapeProjection {
  /**
   * Place a grid coordinate on the flat sea surface.
   * @param u - west→east, 0..1
   * @param v - north→south, 0..1
   * @returns the world position
   */
  toWorld: (u: number, v: number) => WorldPoint
  /**
   * Place a grid coordinate on the relief surface.
   * @param u - west→east, 0..1
   * @param v - north→south, 0..1
   * @returns the world position
   */
  draped: (u: number, v: number) => WorldPoint
  /**
   * Place a shoreline point on the relief surface, raised by the shore lift.
   *
   * The coastline used to be laid flat just above the sea, and wherever the DEM still stands above the
   * land mask's coast it ran inside the cliff and vanished (2026-10-16). On the surface it is never cut.
   * What keeps the relief from hiding it is a depth bias toward the camera; the lift is only a look — a
   * lifted line slides up the screen at an oblique angle, which is what the dev saw at 0.009.
   * @param u - west→east, 0..1
   * @param v - north→south, 0..1
   * @returns the world position; at the lift above sea level before the relief has been derived
   */
  shore: (u: number, v: number) => WorldPoint
}

/**
 * Build the projections shared by every overlay drawn over the map.
 *
 * One implementation, injected everywhere, because the alternative has already cost this project once:
 * an overlay that computes its own height detaches from the relief the first time the curve is retuned,
 * which shows as nothing at all on a plain and as a line floating off a ridge in the mountains.
 * @param deps - the live values the projection reads
 * @returns the flat and draped mappings
 */
export function createDrapeProjection(deps: DrapeProjectionDeps): DrapeProjection {
  const toWorld = (u: number, v: number): WorldPoint => {
    const frame = deps.frame()
    if (!frame) return [0, deps.flatLift(), 0]
    // Asked of the mesh, for the same reason as the vertex grid: the plane's proportions are its call.
    const worldDepth = meshWorldDepth(frame, deps.worldWidth)
    return [(u - 0.5) * deps.worldWidth, deps.flatLift(), (v - 0.5) * worldDepth]
  }
  const draped = (u: number, v: number): WorldPoint => {
    const [x, , z] = toWorld(u, v)
    const source = deps.source()
    if (!source) return [x, 0, z]
    return [x, meshSurfaceY(u, v, source, deps.segments(), deps.curve()) + deps.drapedLift, z]
  }
  const shore = (u: number, v: number): WorldPoint => {
    const [x, , z] = toWorld(u, v)
    const source = deps.source()
    const surface = source ? meshSurfaceY(u, v, source, deps.segments(), deps.curve()) : 0
    return [x, surface + deps.shoreLift(), z]
  }
  return { toWorld, draped, shore }
}
