import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three'

import { hashInts } from '../utils/hash'

import type { CoastlineSegment } from '../data/coastlineSource'

/** Fixed-point scale for hashing normalized `[0, 1]` coordinates: two shared endpoints must quantize to
 * the same integer key so their jitter matches (welds); 1e5 ≈ 5 decimals is finer than the DEM grid. */
const HASH_QUANTIZATION = 100000

/**
 * Options for building the coastline line layer.
 */
export interface CoastlineLayerOptions {
  /**
   * Project a normalized grid coordinate to a world position. Inject the same mapping the relief mesh
   * uses so the coastline aligns with the terrain.
   * @param u - horizontal coordinate `[0, 1]` (0 = west)
   * @param v - vertical coordinate `[0, 1]` (0 = north)
   * @returns the world position `[x, y, z]`
   */
  project(u: number, v: number): [number, number, number]
  /** Line colour (vintage brown coastline). */
  color: string
  /**
   * Per-stroke opacity `[0, 1]` (default 1). Keep it low with `strokes > 1`: the overlaid, slightly
   * offset passes build up into a soft pencil band (a cheap blur via overdraw).
   */
  opacity?: number
  /**
   * Hand-drawn wobble amplitude in world units (default 0 = crisp). Keep it LIGHT — each endpoint is
   * nudged by a deterministic offset keyed on its grid coordinate, so points shared between adjacent
   * segments move together (no gaps) while the line trembles like a pencil. Large values scribble.
   */
  jitter?: number
  /**
   * Number of overlaid strokes (default 1). Values > 1 redraw the coastline with independent jitter per
   * pass — a sketchy pencil overdraw. Combine with a low `opacity`.
   */
  strokes?: number
}

/** A renderable coastline layer plus its teardown. */
export interface CoastlineLayer {
  /** The renderable object to add to the scene. */
  readonly object: LineSegments<BufferGeometry, LineBasicMaterial>
  /** Free the GPU resources (geometry + material). */
  dispose(): void
}

/**
 * Build a {@link CoastlineLayer} from coastline segments, drawn as draped 3D line segments (crisp at any
 * zoom, unlike a rasterised line). Endpoints are projected via the injected `project`, optionally nudged
 * by a light deterministic `jitter` and redrawn over `strokes` passes for a soft pencil look. The same
 * layer accepts any {@link CoastlineSource} output (DEM-derived now, vector later).
 *
 * The material is transparent with `depthWrite` off so the overlaid strokes blend into a soft band while
 * the terrain still occludes them (`depthTest` on). Note: `LineBasicMaterial.linewidth` is 1px on most
 * platforms (a WebGL limitation) — for thicker strokes, swap in fat lines (`Line2`) later.
 * @param segments - the coastline segments (normalized grid coordinates)
 * @param options - projection + styling
 * @returns the coastline layer handle
 */
export function createCoastlineLayer(
  segments: readonly CoastlineSegment[],
  options: CoastlineLayerOptions
): CoastlineLayer {
  const jitter = options.jitter ?? 0
  const strokes = Math.max(1, Math.round(options.strokes ?? 1))
  const opacity = options.opacity ?? 1
  // Nudge an endpoint by a deterministic offset keyed on its grid coordinate + stroke → shared points
  // move together within a pass (welded, no gaps); each pass wobbles differently (overdraw → soft band).
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
    for (const seg of segments) {
      const [a, b] = seg
      const pa = options.project(a.u, a.v)
      const pb = options.project(b.u, b.v)
      nudge(a.u, a.v, pass, pa)
      nudge(b.u, b.v, pass, pb)
      positions[o] = pa[0]
      positions[o + 1] = pa[1]
      positions[o + 2] = pa[2]
      positions[o + 3] = pb[0]
      positions[o + 4] = pb[1]
      positions[o + 5] = pb[2]
      o += 6
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  const material = new LineBasicMaterial({
    color: options.color,
    transparent: true,
    opacity,
    depthWrite: false, // let the overlaid strokes blend into a soft band
  })
  const object = new LineSegments(geometry, material)

  return {
    object,
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
