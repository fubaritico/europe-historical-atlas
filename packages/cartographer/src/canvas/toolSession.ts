import { normaliseRect } from '../geometry/marquee'
import { isClosingOffered } from '../geometry/ringClosure'

import type { LineVertex } from '../geometry/lineSnap'
import type { Rect } from '../geometry/marquee'
import type { EditorTool } from '../state/toolSlice'
import type { Point } from '../view/viewport'
import type { Provenance } from '@europe-historical-atlas/core/editor/documentEdits'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/** A point of the outline in progress: where, and what it was taken from. */
export interface SessionPoint {
  /** `[longitude, latitude]`. */
  at: [number, number]
  /** Reported by eye, or snapped onto the coast or a river. */
  provenance: Provenance
  /**
   * The anchor of the document this point **is**, when the Pen snapped onto one — a neighbour's, met
   * along a shared border. Closing the ring reuses it by index; `null` for a new point.
   */
  anchor: number | null
}

/**
 * What the two tools hold between two clicks — the session's half of a gesture, never the document's.
 *
 * **None of this enters the undo line**, and it is the same rule as the active tool's (`s99`): the outline
 * in progress is not yet anything a year contains — ‹escape› throws it away, ‹backspace› takes back a
 * point, and only closing it writes to the document, as one step. The selection and a drag in progress are
 * pointers into the document, not facts of it.
 *
 * **Pure, and everything here is exercised with literals**: the controller holds one of these and asks
 * these functions what a gesture means; it never decides anything itself.
 */
export interface ToolSession {
  /** The Pen's outline in progress, in the order placed, each point with its provenance. */
  outline: SessionPoint[]
  /**
   * The anchors the white arrow has selected, in the order taken — a click takes one, ‹shift›+click adds
   * or drops one, the marquee takes those it covers (`s03`). Empty when nothing is selected.
   */
  selected: number[]
  /**
   * A press of the white arrow off any handle and any stretch, not yet decided (the dev, 2026-10-12):
   * released where it began, it is a click — choose the polity under it, or deselect; dragged, it is a
   * marquee. Deciding on release is what lets a marquee start on the sea without deselecting first.
   */
  pending: { at: [number, number]; shift: boolean } | null
  /** The marquee being dragged, corner to corner, in screen pixels — `null` when none is. */
  marquee: { from: [number, number]; to: [number, number] } | null
  /** The anchor under the button while it is held — what a drag would move. `null` once released. */
  grabbed: number | null
  /** The anchor being dragged and where it would land, in degrees — `null` when nothing is moving. */
  moving: { index: number; to: [number, number] } | null
  /**
   * The points an undo put back in hand when it reopened a closed outline — `null` otherwise. A redo
   * closes the ring again only while the outline in hand is still exactly these; once the author has
   * changed it, the outline is theirs and a redo does not overwrite it.
   */
  reopened: SessionPoint[] | null
  /**
   * The layer vertex the last snapped click landed on — where the next snapped click's stretch starts.
   * `null` once a point was placed any other way, or the outline changed under it.
   */
  snap: SnapVertex | null
  /**
   * The stretches the Pencil laid, one per drag, oldest first — what lets ‹ctrl+Z› take a whole stroke
   * back, as Illustrator does. Held by the points themselves, not by positions, so an outline changed by
   * any other gesture simply stops matching and the stroke is forgotten (`takeBackStroke`).
   */
  strokes: PencilStroke[]
  /** The Pencil's drag in progress: when and where it last placed a point — `null` between drags. */
  drawing: PencilSample | null
}

/** A stretch of the outline laid by one Pencil drag: its first and its last point, by identity. */
export interface PencilStroke {
  /** The point the drag began with. */
  first: SessionPoint
  /** The last point it placed. */
  last: SessionPoint
}

/** The Pencil's last sample: when, and where on screen. */
export interface PencilSample {
  /** The event's time stamp, in milliseconds. */
  time: number
  /** The pointer, in screen pixels. */
  at: [number, number]
  /** How many samples fell off the map during this drag — said once, at its end. */
  offMap: number
  /** The stroke this drag is laying — `null` until its first point lands on the map. */
  stroke: PencilStroke | null
}

/**
 * The vector layer the Pen follows when it snaps: the shore, or the rivers (`s02`'s ⟨snap to coast⟩,
 * ⟨snap to river⟩) — two of `s00`'s {Layers}.
 */
export type SnapLayer = 'coast' | 'river'

/**
 * A vertex of a layer: which layer, which of its lines, which point. The layer is part of it so a stretch
 * is only ever run along the line the last click landed on — a coast contour and a river share indices.
 */
export interface SnapVertex extends LineVertex {
  /** The layer the line belongs to. */
  layer: SnapLayer
}

/**
 * A session with nothing in hand — what every tool change and every change of target returns to.
 * @returns an empty session
 */
export function idleSession(): ToolSession {
  return {
    outline: [],
    selected: [],
    pending: null,
    marquee: null,
    grabbed: null,
    moving: null,
    reopened: null,
    snap: null,
    strokes: [],
    drawing: null,
  }
}

/**
 * A document's anchor as a point of the outline in progress: its coordinates, the provenance it was
 * recorded under, and its index — so closing the ring reuses it rather than copying it.
 *
 * The one conversion, for joining a neighbour's anchor and for reopening a closed ring alike (ARCH-102 /
 * QUAL-001). `null` when the document cannot describe it — no such anchor, or a source it does not
 * declare; the caller says so, never a made-up provenance.
 * @param document - the year
 * @param index - the anchor
 * @returns the session point, or `null`
 */
export function sessionPointOf(document: YearDocument, index: number): SessionPoint | null {
  const at = document.anchors[index]
  const source = document.sources.find((declared) => declared.id === document.anchorSource[index])
  if (at === undefined || source === undefined) return null
  return {
    at: [at[0], at[1]],
    provenance: { name: source.name, licence: source.licence },
    anchor: index,
  }
}

/**
 * Take back the last Pencil stroke whole, when the outline ends on it — ‹ctrl+Z› after a drag removes
 * the drag, not its last point (the dev, 2026-10-11, as Illustrator does).
 *
 * **The newest stroke is only looked at, not dropped, when points sit on top of it** (QUAL-001): a Pen
 * click after a stroke is taken back by itself, and the next ‹ctrl+Z› still takes the stroke whole. A
 * stroke is forgotten only once its points are gone — ‹backspace› ate into it, the outline was emptied —
 * and the caller then takes one point. A drag still laying onto a stroke taken back starts a new one.
 * @param session - the session, mutated in place
 * @returns `true` when a stroke was taken back
 */
export function takeBackStroke(session: ToolSession): boolean {
  for (let stroke = session.strokes.at(-1); stroke !== undefined; stroke = session.strokes.at(-1)) {
    const start = session.outline.indexOf(stroke.first)
    if (start < 0 || !session.outline.includes(stroke.last)) {
      session.strokes.pop()
      continue
    }
    if (session.outline.at(-1) !== stroke.last) return false
    session.outline.splice(start)
    session.strokes.pop()
    session.snap = null
    if (session.drawing?.stroke === stroke) session.drawing.stroke = null
    return true
  }
  return false
}

/**
 * Empty the outline in hand — closed into the document, or let go with ‹escape› — and everything that
 * only meant something about it: the snap it ended on, the strokes it was laid in, the outline an undo
 * reopened. A Pencil drag still under the button goes on, into a new stroke.
 * @param session - the session, mutated in place
 */
export function clearOutline(session: ToolSession): void {
  session.outline = []
  session.reopened = null
  session.snap = null
  session.strokes = []
  if (session.drawing !== null) session.drawing.stroke = null
}

/**
 * Drop the gesture in progress — the outline being drawn, the anchor being dragged — and keep the
 * selection, which is a pointer the author chose and not a gesture.
 *
 * **One place for "the gesture in progress"** (ARCH-001, found in review): the undo and the redo both
 * start here, so neither can rewind the document under a half-done gesture that would then be written on
 * top of it.
 * @param session - the session, mutated in place
 * @returns `true` when there was a gesture in progress to drop
 */
export function abandonGesture(session: ToolSession): boolean {
  const busy = session.outline.length > 0 || dropDrag(session)
  session.outline = []
  session.reopened = null
  session.snap = null
  session.strokes = []
  session.drawing = null
  return busy
}

/**
 * Drop the white arrow's gesture in progress — an anchor dragged, a press not yet decided, a marquee —
 * and nothing else: the selection is a pointer the author chose, not a gesture.
 * @param session - the session, mutated in place
 * @returns `true` when one was in progress
 */
export function dropDrag(session: ToolSession): boolean {
  const busy =
    session.moving !== null ||
    session.grabbed !== null ||
    session.pending !== null ||
    session.marquee !== null
  session.moving = null
  session.grabbed = null
  session.pending = null
  session.marquee = null
  return busy
}

/**
 * The anchors the tools may act on: those of the drawing target's rings, each once.
 *
 * **Only the target's, and that is the dev's inversion of Illustrator** (2026-10-08): you choose *whose*
 * points first, then you act — so the arrow cannot pick up a neighbour's anchor by accident, and a shared
 * anchor is reachable because the target holds it too.
 * @param document - the document to read
 * @param target - the resolved target's id, or `null`
 * @returns anchor indices, ascending
 */
export function targetHandles(document: YearDocument, target: string | null): number[] {
  if (target === null) return []
  const held = new Set<number>()
  for (const claim of document.claims) {
    if (claim.polity !== target) continue
    for (const ring of claim.rings) for (const index of ring) held.add(index)
  }
  return [...held].sort((a, b) => a - b)
}

/**
 * The anchors on either side of one, in every ring that holds it — what a drag pulls along.
 * @param document - the document to read
 * @param index - the anchor being moved
 * @returns the neighbouring anchor indices, each once
 */
export function ringNeighbours(document: YearDocument, index: number): number[] {
  const around = new Set<number>()
  for (const claim of document.claims) {
    for (const ring of claim.rings) {
      const at = ring.indexOf(index)
      if (at < 0) continue
      const before = ring[(at - 1 + ring.length) % ring.length]
      const after = ring[(at + 1) % ring.length]
      if (before !== undefined && before !== index) around.add(before)
      if (after !== undefined && after !== index) around.add(after)
    }
  }
  return [...around]
}

/** What the status bar's action sentence is computed from. */
export interface ActionInputs {
  /** The tool in hand. */
  tool: EditorTool
  /** The target's name, verbatim — `null` when nobody is aimed at or the target no longer resolves. */
  targetName: string | null
  /** Whether the pointer is over the canvas. */
  onCanvas: boolean
  /** Whether a click would close the outline now. */
  closing: boolean
  /**
   * What the Pen has within reach and would follow — `"coastline"`, or a river's name verbatim
   * (`"Maas"`) — or `null` when nothing is.
   */
  snapping: string | null
  /**
   * The layer the Pen follows, by its noun (`"coastline"`, `"river"` — `snapLayersOf`), or `null` for
   * the free Pen and the Pencil — out of reach, a click places a free point.
   */
  following: string | null
  /** The sentence for an existing anchor the Pen is over — `s02`'s branching line — or `null`. */
  joining: string | null
  /** Whether a click here inserts an anchor on a stretch of the target — the arrow, or the idle Pen. */
  inserting: boolean
  /** The session. */
  session: ToolSession
}

/**
 * What the Pen is doing, for the polity it draws in.
 * @param inputs - whether closing, joining an anchor, inserting, snapping or following a layer
 * @param targetName - the polity's name, verbatim
 * @returns the sentence
 */
function penSentence(inputs: ActionInputs, targetName: string): string {
  if (inputs.closing) return `Closing the outline of ${targetName}`
  if (inputs.joining !== null) return inputs.joining
  if (inputs.inserting) return `Inserting a point into ${targetName}`
  // s02 — "Following the coastline for Kingdom of France", "Following the Maas for Kingdom of France".
  if (inputs.snapping !== null) return `Following the ${inputs.snapping} for ${targetName}`
  // s02's "place points freely", before the click (QUAL-110). The polity is kept: the bar always names
  // whom the action is for.
  if (inputs.following === null) return `Drawing in ${targetName}`
  return `Drawing in ${targetName} — no ${inputs.following} within reach, placing points freely`
}

/**
 * The status bar's description of the action — a verb, and the polity it acts on.
 *
 * **The dev's pattern, 2026-10-08**: present participle, the polity's name verbatim, never its id — so a
 * new gesture needs no new decision. The bar is what guards the mistake the whole drawing target exists
 * for (four hundred anchors in the wrong country), because unlike the transient notice it never leaves.
 * @param inputs - the tool, the target, and the session
 * @returns the sentence, or `null` when no action has a subject to name
 */
export function actionSentence(inputs: ActionInputs): string | null {
  const { tool, targetName, session } = inputs
  if (tool === 'navigate') return null
  if (targetName === null) return inputs.onCanvas ? 'Select a polity to draw in' : null
  if (tool === 'draw') return penSentence(inputs, targetName)
  if (session.moving !== null) return `Moving path from ${targetName}`
  if (inputs.inserting) return `Inserting a point into ${targetName}`
  return session.selected.length === 0 ? null : `Selecting path from ${targetName}`
}

/** What the overlay canvas paints, all of it in screen pixels. */
export interface OverlayScene {
  /** The outline in progress. */
  outline: readonly Point[]
  /** Where the rubber band runs to from the last anchor — `null` when it is not drawn. */
  rubberTo: Point | null
  /** Whether the first anchor is offering to close the ring, and should be emphasised. */
  closing: boolean
  /** An anchor being dragged: where it would land, and the anchors its stretches run from. */
  moving: { at: Point; from: readonly Point[] } | null
  /** The marquee being dragged, normalised — `null` when none is. Gone on release: no frame (`s03`). */
  marquee: Rect | null
  /** The layer vertex the Pen would snap onto — emphasised before the click. */
  snapTarget: Point | null
  /** The stretch of layer a click would insert, from the last snapped anchor — the preview. */
  snapPreview: readonly Point[] | null
}

/** Everything {@link overlayScene} reads. */
export interface OverlayInputs {
  /** The session. */
  session: ToolSession
  /** The tool in hand. */
  tool: EditorTool
  /** The pointer, in screen pixels — `null` when it is off the canvas. */
  pointer: Point | null
  /** Degrees to screen pixels, through the current view. */
  toScreen: (lonLat: readonly [number, number]) => Point
  /** The document's anchors in screen pixels, parallel to its table. */
  anchors: readonly Point[]
  /** The anchors either side of the one being moved. */
  movingFrom: readonly number[]
  /** How near the first anchor, in screen pixels, closes the ring. */
  closeRadius: number
  /** The layer vertex under the pointer, on screen — `null` when not following a layer or out of reach. */
  snapTarget: Point | null
  /** The layer stretch a click would insert, on screen — `null` when the click would only place a point. */
  snapPreview: readonly Point[] | null
}

/**
 * The marquee being dragged, as a rectangle — `null` when none is.
 * @param session - the session
 * @returns the normalised rectangle, in screen pixels
 */
function marqueeRect(session: ToolSession): Rect | null {
  const marquee = session.marquee
  return marquee === null ? null : normaliseRect(marquee.from, marquee.to)
}

/**
 * What the overlay should show for this session and this pointer.
 *
 * The rubber band runs from the last anchor to the pointer only under the Pen, and only while the pointer
 * is on the canvas — off it, a band to the last known position would point at somewhere the author is
 * not aiming.
 * @param inputs - the session, the pointer and the projections
 * @returns the overlay scene
 */
export function overlayScene(inputs: OverlayInputs): OverlayScene {
  const outline = inputs.session.outline.map((point) => inputs.toScreen(point.at))
  const drawing = inputs.tool === 'draw'
  const pointer = drawing ? inputs.pointer : null
  const moving = inputs.session.moving
  // The preview replaces the rubber band — it *is* the line the click will lay. Without one, the band
  // runs to the layer vertex the click would snap onto, not to the pointer beside it.
  const bandEnd = inputs.snapTarget ?? pointer
  return {
    outline: drawing ? outline : [],
    rubberTo: outline.length > 0 && inputs.snapPreview === null ? bandEnd : null,
    snapTarget: drawing ? inputs.snapTarget : null,
    snapPreview: drawing ? inputs.snapPreview : null,
    closing: pointer !== null && isClosingOffered(outline, pointer, inputs.closeRadius),
    marquee: marqueeRect(inputs.session),
    moving:
      moving === null
        ? null
        : {
            at: inputs.toScreen(moving.to),
            from: inputs.movingFrom
              .map((index) => inputs.anchors[index])
              .filter((point) => point !== undefined),
          },
  }
}
