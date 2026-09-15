import { Group } from 'three'

import { createLineLayer } from './lineLayer'

import type { LineLayer, UvSegment } from './lineLayer'
import type { UvPoint } from '../data/coastlineSource'
import type { River } from '../data/riverSource'

/**
 * Options for the level-of-detail river network.
 */
export interface RiverLayerOptions {
  /**
   * Project a normalized grid coordinate (`u` west→east, `v` north→south) to a world position `[x, y,
   * z]` — inject the same mapping the relief mesh uses, sampling the terrain, so the rivers lie on the
   * ground instead of through it. Declared as a property, not a method, because it is handed straight
   * on to each per-rank line layer.
   */
  project: (u: number, v: number) => [number, number, number]
  /** Line colour. */
  color: string
  /** Opacity of a fully revealed river. */
  opacity: number
  /** Zoom `[0, 1]` at which the major rivers (rank 1) are fully drawn. */
  revealStart: number
  /** Zoom `[0, 1]` at which the minor rivers (rank 9) are fully drawn. */
  revealEnd: number
  /** Zoom span over which a rank fades in, so ranks appear gradually rather than popping. */
  fade: number
  /**
   * Draw the centrelines Natural Earth traces through lakes, not just the rivers proper. Off by
   * default now that lakes are drawn as water: a line cutting across a visible lake reads as a river
   * flowing over its surface. It was on while no lake was rendered, when the same line simply looked
   * like the river continuing.
   */
  includeLakeCenterlines: boolean
  /** Hand-drawn wobble amplitude in world units (0 = crisp). */
  jitter: number
  /** Stroke width in CSS pixels for a major river (rank 1). */
  widthMajor: number
  /** Stroke width in CSS pixels for the finest tributaries (rank 9). */
  widthMinor: number
}

/** A renderable, zoom-aware river network plus its teardown. */
export interface RiverLayer {
  /** The renderable object to add to the scene. */
  readonly object: Group
  /** The per-`scalerank` line layers, keyed by rank — exposed so the grouping can be inspected. */
  readonly ranks: ReadonlyMap<number, LineLayer>
  /**
   * Update the per-rank opacity for the current zoom. Cheap: it only touches materials, so revealing
   * detail as the camera comes in never rebuilds geometry.
   * @param zoom - the camera zoom in `[0, 1]` (0 = zoomed out, 1 = zoomed in)
   * @returns nothing
   */
  setZoom(zoom: number): void
  /**
   * Tell every rank the viewport size — the fat-line shader needs it to turn a pixel width into clip
   * space. Call on each resize or the strokes distort.
   * @param width - viewport width in pixels
   * @param height - viewport height in pixels
   * @returns nothing
   */
  setResolution(width: number, height: number): void
  /**
   * Recolour every rank on the live materials, with no rebuild.
   * @param color - the new line colour
   * @returns nothing
   */
  setColor(color: string): void
  /** Free the GPU resources of every rank. */
  dispose(): void
}

/** The `scalerank` range Natural Earth uses: 1 = major, 9 = minor. */
const MIN_RANK = 1
const MAX_RANK = 9

/**
 * The zoom at which a rank reaches full opacity. Rank 1 lands on `revealStart`, rank 9 on `revealEnd`,
 * the rest spread evenly between — so pulling the camera in progressively fills the basins with their
 * tributaries instead of switching the whole network on at once.
 * @param rank - the Natural Earth `scalerank`
 * @param options - the layer options (uses `revealStart`, `revealEnd`)
 * @returns the zoom `[0, 1]` at which this rank is fully drawn
 */
export function rankRevealZoom(
  rank: number,
  options: Pick<RiverLayerOptions, 'revealStart' | 'revealEnd'>
): number {
  const clamped = Math.min(MAX_RANK, Math.max(MIN_RANK, rank))
  const t = (clamped - MIN_RANK) / (MAX_RANK - MIN_RANK)
  return options.revealStart + (options.revealEnd - options.revealStart) * t
}

/**
 * The stroke width of a rank, interpolated from `widthMajor` at rank 1 down to `widthMinor` at rank 9.
 * A width hierarchy is how a river network reads as a hierarchy at all: drawn at one weight, a trunk
 * and a third-order tributary are indistinguishable.
 * @param rank - the Natural Earth `scalerank`
 * @param options - the layer options (uses `widthMajor`, `widthMinor`)
 * @returns the width in CSS pixels
 */
export function rankWidth(
  rank: number,
  options: Pick<RiverLayerOptions, 'widthMajor' | 'widthMinor'>
): number {
  const clamped = Math.min(MAX_RANK, Math.max(MIN_RANK, rank))
  const t = (clamped - MIN_RANK) / (MAX_RANK - MIN_RANK)
  return options.widthMajor + (options.widthMinor - options.widthMajor) * t
}

/**
 * How visible a rank is at a given zoom: nothing until `fade` before its reveal point, then a smooth
 * ramp to the layer's full opacity.
 * @param rank - the Natural Earth `scalerank`
 * @param zoom - the camera zoom in `[0, 1]`
 * @param options - the layer options
 * @returns the opacity in `[0, options.opacity]`
 */
export function rankOpacity(
  rank: number,
  zoom: number,
  options: Pick<RiverLayerOptions, 'revealStart' | 'revealEnd' | 'fade' | 'opacity'>
): number {
  const reveal = rankRevealZoom(rank, options)
  const fade = Math.max(1e-6, options.fade)
  const t = (zoom - (reveal - fade)) / fade
  const eased = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)
  return eased * options.opacity
}

/** Split a polyline into the pairwise segments `lineLayer` consumes. */
function toSegments(points: readonly UvPoint[]): UvSegment[] {
  const segments: UvSegment[] = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a && b) segments.push([a, b])
  }
  return segments
}

/**
 * Build a level-of-detail river network: one draped line layer per `scalerank`, revealed by zoom.
 *
 * Grouping by rank is what makes the reveal cheap — the geometry is built once and only material
 * opacities change per frame. Drawing every river at once would both bury the map in tributaries when
 * zoomed out and waste fill rate on lines thinner than a pixel.
 * @param rivers - the reprojected centrelines
 * @param options - projection + styling + reveal thresholds
 * @returns the river layer handle
 */
export function createRiverLayer(rivers: readonly River[], options: RiverLayerOptions): RiverLayer {
  const object = new Group()
  const byRank = new Map<number, LineLayer>()

  const wanted = options.includeLakeCenterlines
    ? rivers
    : rivers.filter((river) => river.kind !== 'Lake Centerline')

  const segmentsByRank = new Map<number, UvSegment[]>()
  for (const river of wanted) {
    const rank = Math.min(MAX_RANK, Math.max(MIN_RANK, Math.round(river.rank)))
    const bucket = segmentsByRank.get(rank) ?? []
    bucket.push(...toSegments(river.points))
    segmentsByRank.set(rank, bucket)
  }

  for (const [rank, segments] of [...segmentsByRank.entries()].sort((a, b) => a[0] - b[0])) {
    if (segments.length === 0) continue
    const layer = createLineLayer(segments, {
      project: options.project,
      color: options.color,
      opacity: options.opacity,
      jitter: options.jitter,
      width: rankWidth(rank, options),
    })
    byRank.set(rank, layer)
    object.add(layer.object)
  }

  return {
    object,
    ranks: byRank,
    setZoom(zoom: number): void {
      for (const [rank, layer] of byRank) {
        const opacity = rankOpacity(rank, zoom, options)
        layer.setOpacity(opacity)
        layer.object.visible = opacity > 0.001
      }
    },
    setResolution(width: number, height: number): void {
      for (const layer of byRank.values()) layer.setResolution(width, height)
    },
    setColor(color: string): void {
      for (const layer of byRank.values()) layer.setColor(color)
    },
    dispose(): void {
      for (const layer of byRank.values()) {
        object.remove(layer.object)
        layer.dispose()
      }
      byRank.clear()
    },
  }
}
