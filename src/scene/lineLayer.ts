import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'

import { hashInts } from '../utils/hash'

import type { UvPoint } from '../data/coastlineSource'

/** Fixed-point scale for hashing normalized `[0, 1]` coordinates: two shared endpoints must quantize to
 * the same integer key so their jitter matches (welds); 1e5 ≈ 5 decimals is finer than the DEM grid. */
const HASH_QUANTIZATION = 100000

/** A line segment in normalized grid coordinates (two endpoints). */
export type UvSegment = readonly [UvPoint, UvPoint]

/**
 * Options for building a draped line layer.
 */
export interface LineLayerOptions {
  /**
   * Project a normalized grid coordinate to a world position. Inject the same mapping the relief mesh
   * uses so the lines align with the terrain.
   * @param u - horizontal coordinate `[0, 1]` (0 = west)
   * @param v - vertical coordinate `[0, 1]` (0 = north)
   * @returns the world position `[x, y, z]`
   */
  project: (u: number, v: number) => [number, number, number]
  /** Line colour. */
  color: string
  /**
   * Per-stroke opacity `[0, 1]` (default 1). Keep it low with `strokes > 1`: the overlaid, slightly
   * offset passes build up into a soft pencil band (a cheap blur via overdraw).
   */
  opacity?: number
  /**
   * Hand-drawn wobble amplitude in world units (default 0 = crisp). Each endpoint is nudged by a
   * deterministic offset keyed on its grid coordinate, so points shared between adjacent segments move
   * together (no gaps) while the line trembles like a pencil. Large values scribble.
   */
  jitter?: number
  /**
   * Number of overlaid strokes (default 1). Values > 1 redraw with independent jitter per pass — a
   * sketchy pencil overdraw. Combine with a low `opacity`.
   */
  strokes?: number
  /**
   * Stroke width in CSS pixels. Setting it at all switches to three's fat-line pipeline:
   * `LineBasicMaterial.linewidth` is pinned to 1 px on virtually every platform, a WebGL limitation, so
   * any controlled width — thicker *or* thinner — has to be built from instanced quads instead. Because
   * the width is in screen pixels, it stays constant as the camera zooms. Omit it for a plain 1 px line.
   */
  width?: number
  /**
   * Depth-test the strokes against the rest of the scene (default `true`). Turn it **off** to draw the
   * line over the terrain whatever the terrain's depth: the relief is a triangulated surface while draped
   * points are placed by bilinear interpolation between the same vertices, and the two only agree on a
   * quad's edges — on a ridge the triangle rises above the interpolation and eats the line, which shows
   * up as short cuts in mountains and none on plains. The cost is honest: a line that should be hidden
   * behind a summit stays visible at an oblique angle, as on most strategy-game maps.
   */
  depthTest?: boolean
  /**
   * Draw order within the transparent pass (default 0). Worth setting whenever `depthTest` is off, since
   * depth no longer arbitrates between overlays and only this does.
   */
  renderOrder?: number
  /**
   * Break the stroke into dashes. Needs {@link width} — dashing is a fat-line feature — and is ignored
   * on the thin pipeline.
   *
   * The dash pattern runs along the buffer in the order the segments were handed over, because three
   * accumulates line distance continuously across every instance without checking that consecutive ones
   * actually touch. Feed the segments run by run and the dashes flow along each run; the only artefact is
   * that the pattern does not restart between runs, which reads as continuous rather than wrong.
   */
  dashed?: boolean
  /** Dash length in world units (default 0.02). Only read when {@link dashed} is set. */
  dashSize?: number
  /** Gap length in world units (default 0.02). Only read when {@link dashed} is set. */
  gapSize?: number
}

/**
 * A renderable line layer plus its teardown.
 *
 * The styling setters exist so callers never reach into `object.material`: a layer may be drawn with
 * either the thin or the fat pipeline, and which one it is must not leak into the code that styles it.
 */
export interface LineLayer {
  /** The renderable object to add to the scene. */
  readonly object: LineSegments<BufferGeometry, LineBasicMaterial> | LineSegments2
  /**
   * Set the stroke opacity on the live material.
   * @param value - opacity in `[0, 1]`
   * @returns nothing
   */
  setOpacity(value: number): void
  /**
   * Set the stroke colour on the live material.
   * @param color - the new colour
   * @returns nothing
   */
  setColor(color: string): void
  /**
   * Set the stroke width on the live material, in CSS pixels.
   *
   * `linewidth` is a shader uniform, so this costs nothing and needs no rebuild — which is what lets a
   * width follow the camera's zoom every frame instead of being frozen when the layer was built.
   * A no-op on the thin pipeline, where the width is 1 px by definition.
   * @param value - the width in CSS pixels
   * @returns nothing
   */
  setWidth(value: number): void
  /**
   * Tell a fat-line layer the viewport size, which its shader needs to convert a pixel width into clip
   * space. A no-op for thin lines. Call on every resize or the stroke width distorts.
   * @param width - viewport width in pixels
   * @param height - viewport height in pixels
   * @returns nothing
   */
  setResolution(width: number, height: number): void
  /** Free the GPU resources (geometry + material). */
  dispose(): void
}

/**
 * Project every segment endpoint into a flat position buffer, redrawn once per stroke.
 *
 * The jitter is deterministic and keyed on the grid coordinate, so points shared by two segments move
 * together within a pass — the line stays welded, with no gaps at the joins — while each pass wobbles
 * differently, which is what makes overdraw read as a soft pencil band rather than as a thicker line.
 * @param segments - the segments, in normalized grid coordinates
 * @param project - where a grid coordinate lands in the world
 * @param jitter - how far an endpoint may be nudged, in world units; zero disables it
 * @param strokes - how many times the whole set is redrawn
 * @returns the positions, three floats per vertex
 */
export function buildSegmentPositions(
  segments: readonly UvSegment[],
  project: (u: number, v: number) => [number, number, number],
  jitter: number,
  strokes: number
): Float32Array {
  const nudge = (u: number, v: number, pass: number, world: [number, number, number]): void => {
    if (jitter === 0) return
    const qu = Math.round(u * HASH_QUANTIZATION)
    const qv = Math.round(v * HASH_QUANTIZATION)
    world[0] += (hashInts(qu, qv, pass * 2) - 0.5) * 2 * jitter
    world[2] += (hashInts(qu, qv, pass * 2 + 1) - 0.5) * 2 * jitter
  }

  const positions = new Float32Array(segments.length * strokes * 2 * 3)
  let o = 0
  for (let pass = 0; pass < strokes; pass++) {
    for (const [a, b] of segments) {
      const pa = project(a.u, a.v)
      const pb = project(b.u, b.v)
      nudge(a.u, a.v, pass, pa)
      nudge(b.u, b.v, pass, pb)
      positions.set(pa, o)
      positions.set(pb, o + 3)
      o += 6
    }
  }
  return positions
}

/**
 * The fat-line implementation: `LineSegments2`, whose stroke weight is honoured.
 *
 * Chosen by the caller *asking* for a width, never by the value crossing a threshold — keying it on
 * `width > 1` meant a sub-pixel width silently fell back to thin lines, which are exactly 1 px, so the
 * requested value was ignored and dragging the slider across 1 produced a jump instead of a change.
 * @param positions - the projected endpoints
 * @param width - the stroke weight in CSS pixels
 * @param options - projection and styling
 * @returns the layer handle
 */
function createFatLineLayer(
  positions: Float32Array,
  width: number,
  options: LineLayerOptions
): LineLayer {
  const geometry = new LineSegmentsGeometry()
  geometry.setPositions(positions)
  const material = new LineMaterial({
    color: options.color,
    linewidth: width, // CSS pixels: `worldUnits` stays false, so the stroke holds its screen weight
    transparent: true,
    opacity: options.opacity ?? 1,
    depthWrite: false,
    depthTest: options.depthTest ?? true,
    dashed: options.dashed ?? false,
    dashSize: options.dashSize ?? 0.02,
    gapSize: options.gapSize ?? 0.02,
  })
  const object = new LineSegments2(geometry, material)
  object.renderOrder = options.renderOrder ?? 0
  // Walks the buffer accumulating each instance's length into the `instanceDistance` attribute the dash
  // shader reads. Unconditional because it is cheap and a layer can be switched to dashed later; note it
  // has nothing to do with bounding volumes, which `setPositions` already computed.
  object.computeLineDistances()
  return {
    object,
    setOpacity(value: number): void {
      material.opacity = value
    },
    setColor(color: string): void {
      material.color.set(color)
    },
    setWidth(value: number): void {
      material.linewidth = value
    },
    setResolution(viewportWidth: number, viewportHeight: number): void {
      material.resolution.set(viewportWidth, viewportHeight)
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}

/**
 * The thin-line implementation: `LineSegments`, pinned to one pixel by WebGL itself.
 * @param positions - the projected endpoints
 * @param options - projection and styling
 * @returns the layer handle
 */
function createThinLineLayer(positions: Float32Array, options: LineLayerOptions): LineLayer {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  const material = new LineBasicMaterial({
    color: options.color,
    transparent: true,
    opacity: options.opacity ?? 1,
    depthWrite: false, // let overlaid strokes blend into a soft band
    depthTest: options.depthTest ?? true,
  })
  const object = new LineSegments(geometry, material)
  object.renderOrder = options.renderOrder ?? 0

  return {
    object,
    setOpacity(value: number): void {
      material.opacity = value
    },
    setColor(color: string): void {
      material.color.set(color)
    },
    setWidth(): void {
      // Thin lines are 1 px by definition — there is no width to set.
    },
    setResolution(): void {
      // Thin lines are 1 px by definition — the viewport size does not enter into it.
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}

/**
 * Build a {@link LineLayer} from normalized-grid segments, drawn as draped 3D line segments (crisp at any
 * zoom, unlike a rasterised line). Endpoints are projected via the injected `project`, optionally nudged
 * by a light deterministic `jitter` and redrawn over `strokes` passes for a soft pencil look. Reused for
 * coastlines, rhumb lines, graticules — anything expressed as `(u, v)` segments.
 *
 * The material is transparent with `depthWrite` off so overlaid strokes blend into a soft band while the
 * terrain still occludes them (`depthTest` on).
 * @param segments - the segments (normalized grid coordinates)
 * @param options - projection + styling
 * @returns the line layer handle
 */
export function createLineLayer(
  segments: readonly UvSegment[],
  options: LineLayerOptions
): LineLayer {
  const positions = buildSegmentPositions(
    segments,
    options.project,
    options.jitter ?? 0,
    Math.max(1, Math.round(options.strokes ?? 1))
  )
  const width = options.width
  return width === undefined
    ? createThinLineLayer(positions, options)
    : createFatLineLayer(positions, width, options)
}
