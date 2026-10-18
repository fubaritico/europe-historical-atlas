import { riverRankWidth, wholeRiverRank } from '@europe-historical-atlas/core/data/riverDisplay'

import { boxesOverlap, detailThresholdSquared, visibleBox } from '../../viewport/culling'

import type { Rect } from '../../geometry/marquee'
import type { LayerSetting, LayerSettings } from '../../state/layersSlice'
import type { Box } from '../../viewport/culling'
import type { PixelSize, Point } from '../../viewport/viewport'
import type { BorderHand } from '@europe-historical-atlas/core/editor/borderHands'

/**
 * The painter — it draws, and it decides nothing.
 *
 * **"Zéro décision"** is the plan's own word for this layer, and it is what makes the rest testable: every
 * position handed in is already in screen pixels, every colour comes from the style object, and nothing
 * here reads a document, a store or a viewport. Give it the same scene twice and it paints the same
 * pixels; that is the whole contract.
 *
 * **It takes a structural context, not `CanvasRenderingContext2D`.** Declaring the handful of members it
 * actually uses is what `rules/modular-architecture.md` asks for — the unit declares what it needs — and
 * it is what lets these tests run with a recording fake instead of a real canvas. jsdom has no 2D
 * context, so the alternative would have been not to test the painter at all.
 *
 * **Why 2D and not WebGL** (decided 2026-09-22, memory `editor-canvas-is-2d`): a 2D context gives the
 * compositing mode the atlas's bake already uses, `overlay`, for free, where WebGL would need a shader —
 * and three.js in this package would be a second renderer in the repository. ESLint forbids it.
 */

/**
 * The slice of a 2D context this painter uses.
 *
 * Narrow on purpose: every member added here is a member a fake has to grow, so the list is the painter's
 * real dependency surface, visible at a glance.
 */
export interface Painter2D {
  /** Erase a rectangle. */
  clearRect: (x: number, y: number, width: number, height: number) => void
  /** Fill a rectangle with the current `fillStyle`. */
  fillRect: (x: number, y: number, width: number, height: number) => void
  /** Outline a rectangle with the current `strokeStyle`. */
  strokeRect: (x: number, y: number, width: number, height: number) => void
  /** Start a new path. */
  beginPath: () => void
  /** Move the pen without drawing. */
  moveTo: (x: number, y: number) => void
  /** Draw to a point. */
  lineTo: (x: number, y: number) => void
  /** Join the path back to its start. */
  closePath: () => void
  /** Add a circular arc — the handles. */
  arc: (x: number, y: number, radius: number, start: number, end: number) => void
  /** Stroke the current path. */
  stroke: () => void
  /**
   * Fill the current path. It takes the fill rule because a polity's fill with a hole is `evenodd`;
   * optional, so every other call reads as before.
   */
  fill: (fillRule?: 'nonzero' | 'evenodd') => void
  /** Draw an image, scaled into a destination rectangle — the backdrop. */
  drawImage: (
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number
  ) => void
  /**
   * The current fill colour.
   *
   * Typed as lib.dom's own union rather than `string`, and that is forced: a **mutable** property is
   * invariant, so a narrower type here makes a real `CanvasRenderingContext2D` unassignable to this
   * interface. The painter only ever writes strings into it.
   */
  fillStyle: string | CanvasGradient | CanvasPattern
  /** The current stroke colour. Same union, for the same reason. */
  strokeStyle: string | CanvasGradient | CanvasPattern
  /** The current stroke width, in the units the context is scaled to. */
  lineWidth: number
  /** How what is drawn next combines with what is already there — the fills' `overlay`. */
  globalCompositeOperation: GlobalCompositeOperation
  /** How opaque what is drawn next is, 0 to 1 — a layer's opacity in `{Layers}`. */
  globalAlpha: number
  /**
   * Replace the transform — used for the two layers that are **not** handed over in screen pixels.
   *
   * See {@link CanvasScene.vectors}: the coastline is 95 233 points, and letting the engine apply the
   * affine costs nothing where doing it in JavaScript would allocate a fresh array of that size on every
   * `pointermove` of a pan.
   */
  setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void
  /** The dash pattern of what is stroked next — the dotted and dashed hands of a border. */
  setLineDash: (segments: number[]) => void
  /** How a stroke ends — round, so a dotted hand reads as dots. */
  lineCap: CanvasLineCap
}

/**
 * Every colour and size the painter uses, injected.
 *
 * **The values come from `design/chrome.css`, never from taste** — the plan says so of the chrome and it
 * holds here. Passing them in rather than importing them keeps the painter indifferent to the theme, and
 * is what lets a test assert a colour without knowing which one the design chose this week.
 */
export interface PaintStyle {
  /** The canvas behind everything. `#d9ccad` in the design — the vellum the backdrop sits on. */
  background: string
  /** The edit stroke: thin, crisp, blue, no casing (decided 2026-09-22). */
  pathStroke: string
  /** How wide that stroke is, in screen pixels. */
  pathWidth: number
  /** An unselected handle's interior — white. */
  anchorFill: string
  /** A handle's outline, and a selected handle's interior. The reserved selection blue, `#5b93d6`. */
  anchorStroke: string
  /** A handle's radius in screen pixels. `s02` wants about 8 across, at any zoom. */
  anchorRadius: number
  /** A snap dot's radius in screen pixels: small enough never to be taken for a handle. */
  snapAnchorRadius: number
  /** The stretch ⟨retrace⟩ would replace, dashed — the palette's alert ink, `--warn`. */
  replacedStroke: string
  /** A border's light core — the atlas's. */
  borderCore: string
  /** A border's dark casing, and the frontier's one stroke — the atlas's. */
  borderEdge: string
  /** The core's width in screen pixels. */
  borderWidth: number
  /** The casing's width in screen pixels, wider than the core so it shows either side. */
  borderEdgeWidth: number
  /** The frontier's width, against ground nobody claims, in screen pixels. */
  frontierWidth: number
  /**
   * How a polity's fill combines with the relief under it: `overlay`, at full strength — the atlas's own
   * `politicalMode` (`core/pipeline/terrainOptions.ts`), whose formula in `terrainCompose.ts` is the
   * standard overlay the 2D context implements natively. The dev's call, 2026-10-11, over `02 Drawing`'s
   * 70 % layer: the editor shows the tint the atlas will publish.
   */
  fillBlend: GlobalCompositeOperation
  /** The shoreline's ink. Darker than the terrain's own edge, so it reads over land and over sea. */
  coastStroke: string
  /** The shoreline's width in **screen** pixels, held constant as the view zooms. */
  coastWidth: number
  /** A river's ink — the atlas's, with its opacity (`core/data/riverDisplay.ts`). */
  riverStroke: string
  /** A major river's width (rank 1) in screen pixels. */
  riverWidthMajor: number
  /** The finest tributary's width (rank 9) in screen pixels; the ranks between are interpolated. */
  riverWidthMinor: number
}

/**
 * One run of a vector layer: its points in **backdrop** pixels, and the box they occupy.
 *
 * The box travels with the run rather than being derived here, because deriving it means the traversal
 * that carrying it exists to skip. Declared structurally — the painter never imports the module that
 * produces these.
 */
export interface VectorRun {
  /** `[x, y]` pairs in the backdrop's own pixel grid. */
  points: readonly (readonly [number, number])[]
  /** Whether the run closes on itself. */
  closed?: boolean
  /** The box it occupies, in the same units. */
  bounds: Box
}

/** A river's run: a vector run that knows its Natural Earth rank, which decides its width. */
export interface RiverRun extends VectorRun {
  /** Natural Earth's `scalerank`, 1 (major) to 9 (minor). */
  rank: number
}

/** What there is to draw, all of it already in screen pixels. */
export interface CanvasScene {
  /**
   * The baked terrain, and where it goes on screen — `null` until it has been baked.
   *
   * **Null is the honest state, not a placeholder.** Baking reads two assets of about three megabytes
   * each and composites 1.5 million pixels, so there is a real interval during which the editor has a
   * canvas and no terrain. Drawing the vellum alone during it says "not loaded"; inventing a flat colour
   * that looks like land would say something false.
   */
  backdrop: { image: CanvasImageSource; rect: Rect } | null
  /** The closed outlines of the open document, each a run of projected anchors. */
  rings: readonly (readonly Point[])[]
  /**
   * Each polity's territory, filled in its colour: all its rings in one path, so a ring inside another
   * is a hole by the even-odd rule — `H-07`'s *"inclusion decides"*.
   */
  fills: readonly { rings: readonly (readonly Point[])[]; colour: string }[]
  /**
   * Each tribe's colour fading at its limit (`core/editor/tribeFeather`), as an image and the rectangle it
   * covers on screen — instead of a fill, and of its borders, which {@link borders} leaves out.
   */
  tribeFeathers: readonly { image: CanvasImageSource; rect: Rect }[]
  /** Every anchor, projected, parallel to the document's own table. */
  anchors: readonly Point[]
  /**
   * The borders, each a run of projected anchors and the hand it is drawn in (`core/editor/borderHands`) —
   * derived from the shared anchors, never drawn by hand.
   */
  borders: readonly { points: readonly Point[]; hand: BorderHand; layer: 'borders' | 'unclaimed' }[]
  /** What `{Layers}` shows, and how opaque — read by the painter, decided by the author. */
  layers: LayerSettings
  /** Which anchors get a handle drawn, by index — the drawing target's, under a tool that acts on them. */
  handles: readonly number[]
  /**
   * Which anchors get a snap dot, by index — the neighbours' anchors the Pen can branch from, while it is
   * in hand and close enough to draw. Empty otherwise.
   */
  snapAnchors: readonly number[]
  /**
   * The aimed polity's **extent** outline (`core/editor/extent`), as runs of projected anchors: its own
   * domain and its vassals' as one contour, the limits between them left out (the dev, 2026-10-15). Drawn
   * over the thin outlines, twice their width, so the selection reads at a glance. Empty when nobody is aimed.
   */
  extentOutline: readonly (readonly Point[])[]
  /** Which anchors are selected, by the same index. */
  selected: ReadonlySet<number>
  /**
   * The coastline and the rivers — **in backdrop pixels, not screen pixels**, with the view to apply.
   *
   * This is the one exception to "everything arrives already projected", and it is a measured one. The
   * shoreline is 95 233 points and the rivers 29 207; `remapToScreen` would build a fresh array of
   * ~125 000 pairs on **every `pointermove` of a pan**, which is roughly 2 MB of garbage per frame. The
   * canvas's own transform does the same affine in the graphics engine, for nothing.
   *
   * It is still not a decision the painter takes: it receives the three numbers and applies them. What
   * it must remember is to divide the stroke widths by `scale`, since they are specified in screen
   * pixels and the transform would otherwise magnify them with the map.
   *
   * `null` until the layers have loaded — the same honest state as `backdrop`.
   */
  vectors: {
    /** The shoreline, chained into contours. */
    coast: readonly VectorRun[]
    /** The river centrelines, each with its rank. */
    rivers: readonly RiverRun[]
    /** Backdrop pixels to screen pixels: multiply by this. */
    scale: number
    /** Then add this horizontally. */
    originX: number
    /** And this vertically. */
    originY: number
  } | null
}

/** A full turn, for {@link Painter2D.arc}. */
const FULL_TURN = Math.PI * 2

/**
 * Stroke one closed outline.
 *
 * A ring of fewer than two points is skipped rather than stroked: a path with one point draws nothing on
 * a real context and a stray `moveTo` on a fake, which would make a test pass for the wrong reason.
 * @param ctx - the context to draw into
 * @param ring - the outline, in screen pixels
 */
function strokeRing(ctx: Painter2D, ring: readonly Point[]): void {
  const first = ring[0]
  if (first === undefined || ring.length < 2) return
  ctx.beginPath()
  ctx.moveTo(first[0], first[1])
  for (let index = 1; index < ring.length; index += 1) {
    const point = ring[index]
    if (point !== undefined) ctx.lineTo(point[0], point[1])
  }
  ctx.closePath()
  ctx.stroke()
}

/**
 * Stroke the aimed polity's extent outline: open runs, each one path, in the outline's blue at twice its
 * width. A closed contour comes back from the chaining with its first anchor repeated at the end, so no
 * `closePath` is needed — and one would wrongly join the two ends of a run cut at a pinch.
 * @param ctx - the context to draw into
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
function paintExtentOutline(ctx: Painter2D, scene: CanvasScene, style: PaintStyle): void {
  if (scene.extentOutline.length === 0) return
  ctx.strokeStyle = style.pathStroke
  ctx.lineWidth = style.pathWidth * 2
  ctx.beginPath()
  for (const run of scene.extentOutline) {
    const first = run[0]
    if (first === undefined || run.length < 2) continue
    ctx.moveTo(first[0], first[1])
    for (const point of run.slice(1)) ctx.lineTo(point[0], point[1])
  }
  ctx.stroke()
  ctx.lineWidth = style.pathWidth
}

/**
 * Set the opacity of the layer about to be drawn, or say it is hidden.
 * @param ctx - the context
 * @param setting - the layer's setting in `{Layers}`
 * @returns `false` when the layer is hidden and nothing should be drawn
 */
function layerAlpha(ctx: Painter2D, setting: LayerSetting): boolean {
  if (!setting.visible) return false
  ctx.globalAlpha = setting.opacity / 100
  return true
}

/**
 * The dash pattern of a hand, scaled to the stroke it dresses.
 * @param pattern - the hand's pattern
 * @param width - the stroke's width
 * @returns the segments for `setLineDash`; empty for a continuous line
 */
function dashOf(pattern: BorderHand['pattern'], width: number): number[] {
  if (pattern === 'dotted') return [0.1, width * 2.5]
  if (pattern === 'dashed') return [width * 6, width * 3]
  return []
}

/**
 * Stroke an open run of points once.
 * @param ctx - the context
 * @param points - the run, in screen pixels
 */
function strokeRun(ctx: Painter2D, points: readonly Point[]): void {
  const first = points[0]
  if (first === undefined) return
  ctx.beginPath()
  ctx.moveTo(first[0], first[1])
  for (const point of points.slice(1)) ctx.lineTo(point[0], point[1])
  ctx.stroke()
}

/**
 * Draw each tribe's fade, composited onto the relief as a fill is — `overlay` at the fills' layer opacity —
 * so a tribe's colour is the tint the fills give, faded by the image's alpha (the dev, 2026-10-18, ATLAS-258).
 * The blend is set and reset here, as `paintFills` does.
 * @param ctx - the context to draw into
 * @param scene - what to draw
 * @param style - the blend
 */
function paintTribeFeathers(ctx: Painter2D, scene: CanvasScene, style: PaintStyle): void {
  if (scene.tribeFeathers.length === 0 || !layerAlpha(ctx, scene.layers.fills)) return
  ctx.globalCompositeOperation = style.fillBlend
  for (const { image, rect } of scene.tribeFeathers)
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/**
 * Draw the borders, each in its hand: a light core inside a dark casing, as the atlas draws them, or one
 * dark stroke for a frontier against unclaimed ground; dotted or dashed as the hand says; doubled by a thin
 * casing line down the middle of the core. A coast draws nothing — the coastline is there already.
 * @param ctx - the context to draw into
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
function paintBorders(ctx: Painter2D, scene: CanvasScene, style: PaintStyle): void {
  ctx.lineCap = 'round'
  for (const { points, hand, layer } of scene.borders) {
    if (hand.pattern === 'none' || !layerAlpha(ctx, scene.layers[layer])) continue
    if (!hand.cased) {
      const width = style.frontierWidth * hand.weight
      ctx.setLineDash(dashOf(hand.pattern, width))
      ctx.strokeStyle = style.borderEdge
      ctx.lineWidth = width
      strokeRun(ctx, points)
      continue
    }
    const edge = style.borderEdgeWidth * hand.weight
    const core = style.borderWidth * hand.weight
    ctx.setLineDash(dashOf(hand.pattern, edge))
    ctx.strokeStyle = style.borderEdge
    ctx.lineWidth = edge
    strokeRun(ctx, points)
    ctx.strokeStyle = style.borderCore
    ctx.lineWidth = core
    strokeRun(ctx, points)
    if (hand.pattern === 'double') {
      ctx.strokeStyle = style.borderEdge
      ctx.lineWidth = core / 3
      strokeRun(ctx, points)
    }
  }
  ctx.setLineDash([])
  ctx.lineCap = 'butt'
  ctx.globalAlpha = 1
}

/**
 * Draw the neighbours' anchors the Pen can branch from, as small dots in the outline's blue.
 *
 * **Filled, small and without a rim**, so they read as points *on* the line rather than as the target's
 * own handles, which are white and twice the size. Only those on screen are drawn: at the zoom where the
 * Pen acts, most of a year's anchors are off it.
 * @param ctx - the context to draw into
 * @param size - the canvas, to skip what falls outside it
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
function paintSnapAnchors(
  ctx: Painter2D,
  size: PixelSize,
  scene: CanvasScene,
  style: PaintStyle
): void {
  const reach = style.snapAnchorRadius
  ctx.fillStyle = style.pathStroke
  for (const index of scene.snapAnchors) {
    const anchor = scene.anchors[index]
    if (anchor === undefined) continue
    const [x, y] = anchor
    if (x < -reach || y < -reach || x > size.width + reach || y > size.height + reach) continue
    ctx.beginPath()
    ctx.arc(x, y, reach, 0, FULL_TURN)
    ctx.fill()
  }
}

/**
 * Draw the handles.
 *
 * **White with a blue outline, solid blue when selected** — the dev's own words, 2026-09-22, and `s02`
 * repeats them for the outline in progress. The selection blue is a reserved ink that no polity is ever
 * served, so a handle can never be mistaken for a territory.
 * @param ctx - the context to draw into
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
function paintAnchors(ctx: Painter2D, scene: CanvasScene, style: PaintStyle): void {
  ctx.lineWidth = 1
  ctx.strokeStyle = style.anchorStroke
  for (const index of scene.handles) {
    const anchor = scene.anchors[index]
    if (anchor === undefined) continue
    ctx.fillStyle = scene.selected.has(index) ? style.anchorStroke : style.anchorFill
    ctx.beginPath()
    ctx.arc(anchor[0], anchor[1], style.anchorRadius, 0, FULL_TURN)
    ctx.fill()
    ctx.stroke()
  }
}

/**
 * Fill every polity's territory in its colour, blended into the relief — the atlas's tint, previewed.
 *
 * **The blend is set and reset here**, the same discipline as the vectors' transform: an `overlay` left
 * behind would blend the coastline, the outlines and the handles drawn after it.
 * @param ctx - the context to draw into
 * @param scene - what to draw
 * @param style - the colours and the opacity
 */
function paintFills(ctx: Painter2D, scene: CanvasScene, style: PaintStyle): void {
  if (!layerAlpha(ctx, scene.layers.fills)) return
  ctx.globalCompositeOperation = style.fillBlend
  for (const fill of scene.fills) {
    ctx.fillStyle = fill.colour
    ctx.beginPath()
    for (const ring of fill.rings) addRingToPath(ctx, ring)
    ctx.fill('evenodd')
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/**
 * Add one closed ring to the current path.
 * @param ctx - the context
 * @param ring - the ring, in screen pixels
 */
function addRingToPath(ctx: Painter2D, ring: readonly Point[]): void {
  const first = ring[0]
  if (first === undefined || ring.length < 3) return
  ctx.moveTo(first[0], first[1])
  for (const point of ring.slice(1)) ctx.lineTo(point[0], point[1])
  ctx.closePath()
}

/**
 * Add one run to the current path, dropping the points too close together to be told apart.
 *
 * **The decimation is the second half of what makes this affordable, and it only bites when zoomed
 * out.** `minGapSquared` is one screen pixel expressed in backdrop units, so at the opening view the
 * largest contour's 25 629 points — drawn across about 1 200 pixels — collapse to roughly one per
 * pixel, and past scale 1 the threshold is a fraction and nothing is dropped at all. Which is right:
 * magnified is exactly when the detail starts to show.
 *
 * **The last point is always kept**, whatever its distance from the one before. Dropping it would
 * shorten an open coast by up to a pixel at every repaint and, worse, leave a closed ring's final
 * segment to be invented by `closePath` across a gap that is not there.
 * @param ctx - the context, transformed to backdrop pixels
 * @param run - the run to add
 * @param minGapSquared - the squared distance below which a point cannot move a screen pixel
 */
function addRunToPath(ctx: Painter2D, run: VectorRun, minGapSquared: number): void {
  const points = run.points
  const last = points.length - 1
  let keptX = 0
  let keptY = 0
  let first = true
  for (let i = 0; i <= last; i++) {
    const point = points[i]
    if (!point) continue
    const [x, y] = point
    if (first) {
      ctx.moveTo(x, y)
      keptX = x
      keptY = y
      first = false
      continue
    }
    const dx = x - keptX
    const dy = y - keptY
    if (i !== last && dx * dx + dy * dy < minGapSquared) continue
    ctx.lineTo(x, y)
    keptX = x
    keptY = y
  }
  if (run.closed === true) ctx.closePath()
}

/**
 * Stroke a layer: skip what is off screen, decimate what is too fine to see, stroke once.
 * @param ctx - the context, transformed to backdrop pixels
 * @param runs - the layer's runs
 * @param view - the part of the backdrop on screen, in backdrop pixels
 * @param minGapSquared - the decimation threshold
 */
function strokeLayer(
  ctx: Painter2D,
  runs: readonly VectorRun[],
  view: Box,
  minGapSquared: number
): void {
  ctx.beginPath()
  for (const run of runs) {
    // One comparison per contour instead of its whole traversal. Zoomed over France at scale 4, this
    // is what skips the Baltic, the Aegean and the Caspian — each of them otherwise traced in full
    // into a path that clips them away.
    if (!boxesOverlap(run.bounds, view)) continue
    addRunToPath(ctx, run, minGapSquared)
  }
  // One path for every run of a layer, stroked once. Two thousand contours in a single `stroke()`
  // rather than two thousand calls: a 2D context pays per stroke, not per sub-path.
  ctx.stroke()
}

/**
 * The river runs grouped by rank, the major ranks first, each with the width it is stroked at.
 *
 * Grouped at paint time and in one pass — a push into each rank's bucket, never a copy (ARCH-101): about
 * four hundred runs into at most nine buckets, against the tens of thousands of points the same repaint
 * strokes. Keyed by rank and not by width, because the widths are scaled by the pixel ratio and the rank is
 * what does not change.
 * @param rivers - the river runs
 * @param style - the two ends of the width scale, in device pixels
 * @returns each rank's width with its runs, the thickest first
 */
function riversByWidth(
  rivers: readonly RiverRun[],
  style: Pick<PaintStyle, 'riverWidthMajor' | 'riverWidthMinor'>
): [number, RiverRun[]][] {
  const byRank = new Map<number, RiverRun[]>()
  for (const run of rivers) {
    const rank = wholeRiverRank(run.rank)
    const bucket = byRank.get(rank)
    if (bucket === undefined) byRank.set(rank, [run])
    else bucket.push(run)
  }
  const widths = { widthMajor: style.riverWidthMajor, widthMinor: style.riverWidthMinor }
  return [...byRank.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rank, runs]) => [riverRankWidth(rank, widths), runs])
}

/**
 * Draw the coastline and the rivers, under the view's transform.
 *
 * **The transform is set and reset here, never left behind.** Everything else on this canvas is handed
 * over in screen pixels, so leaving the context scaled would silently magnify the handles and the
 * borders' widths — a defect that looks like a styling mistake and is not.
 * @param ctx - the context
 * @param size - the canvas size in device pixels, which bounds what is visible and so what is stroked
 * @param scene - what to draw
 * @param style - the colours and widths
 */
function paintVectors(
  ctx: Painter2D,
  size: PixelSize,
  scene: CanvasScene,
  style: PaintStyle
): void {
  const vectors = scene.vectors
  if (vectors === null || vectors.scale <= 0) return
  const viewport = { scale: vectors.scale, originX: vectors.originX, originY: vectors.originY }
  const view = visibleBox(viewport, size)
  const minGapSquared = detailThresholdSquared(viewport)
  ctx.setTransform(vectors.scale, 0, 0, vectors.scale, vectors.originX, vectors.originY)

  ctx.strokeStyle = style.riverStroke
  const { rivers, coastline } = scene.layers
  ctx.globalAlpha = rivers.visible ? rivers.opacity / 100 : 0
  // One stroke per width, the atlas's hierarchy (rank 1 thickest): at most nine strokes, never one per
  // river. Divided by the scale because the width is specified in screen pixels and the transform is about
  // to magnify everything it draws — without that, a river at zoom 8 would be eight times too thick.
  for (const [width, runs] of riversByWidth(vectors.rivers, style)) {
    ctx.lineWidth = width / vectors.scale
    strokeLayer(ctx, runs, view, minGapSquared)
  }

  ctx.strokeStyle = style.coastStroke
  ctx.lineWidth = style.coastWidth / vectors.scale
  ctx.globalAlpha = coastline.visible ? coastline.opacity / 100 : 0
  strokeLayer(ctx, vectors.coast, view, minGapSquared)

  ctx.globalAlpha = 1
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

/**
 * Paint the whole static scene, back to front.
 *
 * The order is the decision the painter *does* carry, and it is the only one: the vellum, then the baked
 * terrain, then the fills, the water and the borders, then the outlines, then the handles on top — a handle
 * under an outline could not be aimed at, and a border under the terrain could not be seen.
 * @param ctx - the context to draw into
 * @param size - the canvas, in the same pixels the scene is in
 * @param scene - what to draw
 * @param style - the colours and sizes
 * @returns nothing — the scene is drawn into `ctx`
 */
export function paintCanvas(
  ctx: Painter2D,
  size: PixelSize,
  scene: CanvasScene,
  style: PaintStyle
): void {
  ctx.clearRect(0, 0, size.width, size.height)
  ctx.fillStyle = style.background
  ctx.fillRect(0, 0, size.width, size.height)
  // The terrain goes over the vellum and under everything else: it is the ground the reader reports
  // against, and a handle beneath it could not be aimed at.
  if (scene.backdrop !== null && layerAlpha(ctx, scene.layers.backdrop)) {
    const { rect } = scene.backdrop
    ctx.drawImage(scene.backdrop.image, rect.x, rect.y, rect.width, rect.height)
    ctx.globalAlpha = 1
  }
  // The tint goes straight onto the relief and under the coastline and the rivers, as the atlas bakes it:
  // a shoreline blended into its country's colour would lose the contrast it is drawn for.
  paintFills(ctx, scene, style)
  paintTribeFeathers(ctx, scene, style)
  paintVectors(ctx, size, scene, style)
  // Over the fills and the water, under the edit outlines: the borders belong to the map, the blue
  // strokes to the tool.
  paintBorders(ctx, scene, style)
  ctx.strokeStyle = style.pathStroke
  ctx.lineWidth = style.pathWidth
  for (const ring of scene.rings) strokeRing(ctx, ring)
  paintExtentOutline(ctx, scene, style)
  paintSnapAnchors(ctx, size, scene, style)
  paintAnchors(ctx, scene, style)
}
