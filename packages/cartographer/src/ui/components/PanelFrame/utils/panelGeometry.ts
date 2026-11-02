import type { PanelRect } from '../../../../state/panelsSlice'

/**
 * The arithmetic of moving and resizing a panel (CARTO-342) — pure, in CSS pixels of the window, tested with literals.
 * The component only reads rectangles off the page and writes the answer back.
 */

/** A box on the page, as `getBoundingClientRect` gives it. */
export interface PageBox {
  /** Its left edge. */
  readonly left: number
  /** Its top edge. */
  readonly top: number
  /** Its right edge. */
  readonly right: number
  /** Its bottom edge. */
  readonly bottom: number
}

/** How far from the column a panel is caught by it — Illustrator's magnet. */
export const DOCK_MAGNET_PX = 24

/** The smallest a floating panel may be made. */
export const MIN_PANEL_SIZE = { width: 180, height: 80 } as const

/** How much of a floating panel's head stays inside the window, so it can always be grabbed again. */
export const KEEP_VISIBLE_PX = 48

/** Where a panel lands when released. */
export type DropTarget =
  /** In the column, at a place among the other docked panels, from 0. */
  | { readonly kind: 'dock'; readonly index: number }
  /** Over the window, at a rectangle. */
  | { readonly kind: 'float'; readonly rect: PanelRect }

/** What a drop is decided from. */
export interface DropInputs {
  /** The pointer. */
  readonly pointer: { readonly x: number; readonly y: number }
  /** The column, or `null` when it is hidden — no panel left in it. */
  readonly dock: PageBox | null
  /** The other docked panels' boxes, top to bottom — the dragged one left out. */
  readonly slots: readonly PageBox[]
  /** The window's width: an empty column catches a panel at the window's right edge. */
  readonly windowWidth: number
  /** Where the panel would float. */
  readonly floatRect: PanelRect
}

/**
 * Where a released panel lands: in the column when the pointer is over it or within the magnet's reach of its left
 * edge — at the place whose middle the pointer is above — or, the column hidden, at the window's right edge; otherwise
 * floating where it was dropped.
 * @param inputs - the pointer, the column, the other docked panels, the window, the floating rectangle
 * @returns the drop
 */
export function dropTarget(inputs: DropInputs): DropTarget {
  const { pointer, dock, slots } = inputs
  const edge = dock === null ? inputs.windowWidth : dock.left
  if (pointer.x < edge - DOCK_MAGNET_PX) return { kind: 'float', rect: inputs.floatRect }
  const index = slots.filter((slot) => (slot.top + slot.bottom) / 2 < pointer.y).length
  return { kind: 'dock', index }
}

/**
 * Where the insertion line is drawn for a place in the column: between two panels, above the first or below the last.
 * @param slots - the other docked panels' boxes, top to bottom
 * @param index - the place
 * @param dock - the column
 * @returns the line's height from the window's top
 */
export function insertionY(slots: readonly PageBox[], index: number, dock: PageBox): number {
  const above = slots[index - 1]
  const below = slots[index]
  if (above === undefined) return below?.top ?? dock.top
  return below === undefined ? above.bottom : (above.bottom + below.top) / 2
}

/**
 * A rectangle moved by the pointer, its head kept within the window so it can be grabbed again.
 * @param start - where it was when the drag began
 * @param dx - how far the pointer moved across
 * @param dy - how far down
 * @param window - the window's size
 * @param window.width - its width
 * @param window.height - its height
 * @returns where it is now
 */
export function movedRect(
  start: PanelRect,
  dx: number,
  dy: number,
  window: { readonly width: number; readonly height: number }
): PanelRect {
  const x = Math.min(
    window.width - KEEP_VISIBLE_PX,
    Math.max(KEEP_VISIBLE_PX - start.width, start.x + dx)
  )
  const y = Math.min(window.height - KEEP_VISIBLE_PX, Math.max(0, start.y + dy))
  return { ...start, x, y }
}

/** The edges a resize moves. */
export interface ResizeEdges {
  /** The left edge. */
  readonly left?: boolean
  /** The right edge. */
  readonly right?: boolean
  /** The top edge. */
  readonly top?: boolean
  /** The bottom edge. */
  readonly bottom?: boolean
}

/**
 * A rectangle resized by its edges, never smaller than {@link MIN_PANEL_SIZE}: a left or top edge stops where the
 * opposite one would make it too small, so the far side never moves.
 * @param start - where it was when the resize began
 * @param edges - the edges held
 * @param dx - how far the pointer moved across
 * @param dy - how far down
 * @returns the rectangle now
 */
export function resizedRect(
  start: PanelRect,
  edges: ResizeEdges,
  dx: number,
  dy: number
): PanelRect {
  const right = start.x + start.width
  const bottom = start.y + start.height
  const x = edges.left === true ? Math.min(start.x + dx, right - MIN_PANEL_SIZE.width) : start.x
  const y = edges.top === true ? Math.min(start.y + dy, bottom - MIN_PANEL_SIZE.height) : start.y
  const width = edges.right === true ? Math.max(MIN_PANEL_SIZE.width, start.width + dx) : right - x
  const height =
    edges.bottom === true ? Math.max(MIN_PANEL_SIZE.height, start.height + dy) : bottom - y
  return { x, y, width, height }
}
