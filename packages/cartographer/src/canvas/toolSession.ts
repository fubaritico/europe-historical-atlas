import { isClosingOffered } from '../geometry/ringClosure'

import type { CoastVertex } from '../geometry/coastSnap'
import type { EditorTool } from '../state/toolSlice'
import type { Point } from '../view/viewport'
import type { Provenance } from '@europe-historical-atlas/core/editor/documentEdits'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/** A point of the outline in progress: where, and what it was taken from. */
export interface SessionPoint {
  /** `[longitude, latitude]`. */
  at: [number, number]
  /** Reported by eye, or snapped onto the coast. */
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
  /** The anchor the white arrow has selected, or `null`. */
  selected: number | null
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
   * The coast vertex the last snapped click landed on — where the next snapped click's stretch starts.
   * `null` once a point was placed any other way, or the outline changed under it.
   */
  snap: CoastVertex | null
}

/**
 * A session with nothing in hand — what every tool change and every change of target returns to.
 * @returns an empty session
 */
export function idleSession(): ToolSession {
  return { outline: [], selected: null, grabbed: null, moving: null, reopened: null, snap: null }
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
  const busy = session.outline.length > 0 || session.moving !== null || session.grabbed !== null
  session.outline = []
  session.moving = null
  session.grabbed = null
  session.reopened = null
  session.snap = null
  return busy
}

/**
 * Drop an anchor drag in progress, and nothing else.
 * @param session - the session, mutated in place
 * @returns `true` when a drag was in progress
 */
export function dropDrag(session: ToolSession): boolean {
  const busy = session.moving !== null || session.grabbed !== null
  session.moving = null
  session.grabbed = null
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
  /** Whether the Pen, following the coast, has the coastline within reach. */
  snapping: boolean
  /** Whether the Pen is following the coast at all — out of reach, its click places a free point. */
  following: boolean
  /** The sentence for an existing anchor the Pen is over — `s02`'s branching line — or `null`. */
  joining: string | null
  /** The session. */
  session: ToolSession
}

/**
 * What the Pen is doing, for the polity it draws in.
 * @param inputs - whether closing, snapping or following the coast
 * @param targetName - the polity's name, verbatim
 * @returns the sentence
 */
function penSentence(inputs: ActionInputs, targetName: string): string {
  if (inputs.closing) return `Closing the outline of ${targetName}`
  if (inputs.joining !== null) return inputs.joining
  // s02 — "Following the coastline for Kingdom of France".
  if (inputs.snapping) return `Following the coastline for ${targetName}`
  // s02's "place points freely", for the coast and before the click (QUAL-110). The polity is kept:
  // the bar always names whom the action is for.
  return inputs.following
    ? `Drawing in ${targetName} — no coastline within reach, placing points freely`
    : `Drawing in ${targetName}`
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
  return session.selected === null ? null : `Selecting path from ${targetName}`
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
  /** The coast vertex the Pen would snap onto — emphasised before the click. */
  snapTarget: Point | null
  /** The stretch of coast a click would insert, from the last snapped anchor — the preview. */
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
  /** The coast vertex under the pointer, on screen — `null` when not following the coast or out of reach. */
  snapTarget: Point | null
  /** The coast stretch a click would insert, on screen — `null` when the click would only place a point. */
  snapPreview: readonly Point[] | null
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
  // runs to the coast vertex the click would snap onto, not to the pointer beside it.
  const bandEnd = inputs.snapTarget ?? pointer
  return {
    outline: drawing ? outline : [],
    rubberTo: outline.length > 0 && inputs.snapPreview === null ? bandEnd : null,
    snapTarget: drawing ? inputs.snapTarget : null,
    snapPreview: drawing ? inputs.snapPreview : null,
    closing: pointer !== null && isClosingOffered(outline, pointer, inputs.closeRadius),
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
