/**
 * Where the panels were left, kept from one session to the next (CARTO-342, `files/plans/cartographer/panels-dock.md`):
 * written to the page's `localStorage` at each change, read once at opening.
 *
 * **A layout that cannot be read opens on the default, said in the console** — the same choice as the view carried
 * between maps (`carriedView.ts`): a comfort, not the map. **A panel the kept layout does not name** — one added since —
 * is docked at the bottom, said in the console too, rather than left nowhere.
 *
 * The shape is declared here structurally: persistence never imports the store (`eslint.config.js`).
 */

import type { PageStorage } from './guardedStorage'

/** Where in the page's storage the layout is kept. */
export const PANEL_LAYOUT_KEY = 'cartographer:panel-layout'

/** A rectangle in CSS pixels of the window. */
export interface StoredRect {
  /** From the window's left edge. */
  readonly x: number
  /** From the window's top edge. */
  readonly y: number
  /** Its width. */
  readonly width: number
  /** Its height. */
  readonly height: number
}

/** The layout as it is kept — the store's `PanelLayout`, by shape. */
export interface StoredPanelLayout<Id extends string> {
  /** The docked panels, top to bottom. */
  readonly docked: readonly Id[]
  /** Each floating panel's rectangle. */
  readonly floating: Readonly<Partial<Record<Id, StoredRect>>>
  /** The column's width. */
  readonly dockWidth: number
  /** A docked panel's height when set. */
  readonly heights: Readonly<Partial<Record<Id, number>>>
}

/**
 * The page's storage, reduced to what this reads and writes — the guarded `localStorage` in the page (`guardedStorage`,
 * CARTO-371: a refusal keeps nothing and is said once), a map in a test.
 */
export type LayoutStorage = PageStorage

/**
 * Whether a value is a finite number.
 * @param value - anything
 * @returns `true` for a finite number
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Whether a value is a rectangle.
 * @param value - anything
 * @returns `true` for four finite numbers, a positive size
 */
function isRect(value: unknown): value is StoredRect {
  if (typeof value !== 'object' || value === null) return false
  const { x, y, width, height } = value as Record<string, unknown>
  return (
    isNumber(x) && isNumber(y) && isNumber(width) && isNumber(height) && width > 0 && height > 0
  )
}

/**
 * Read a kept layout against the panels that exist: unknown names dropped, each panel once, the missing ones docked at
 * the bottom.
 * @param raw - the parsed value, of no known shape
 * @param ids - the panels that exist, in their opening order
 * @returns the layout, or `null` when the value is not one; and whether panels had to be added
 */
function readLayout<Id extends string>(
  raw: unknown,
  ids: readonly Id[]
): { layout: StoredPanelLayout<Id>; completed: boolean } | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { docked, floating, dockWidth, heights } = raw as Record<string, unknown>
  if (
    !Array.isArray(docked) ||
    typeof floating !== 'object' ||
    floating === null ||
    !isNumber(dockWidth)
  )
    return null
  const known = (value: unknown): value is Id => ids.includes(value as Id)
  const keptDocked = [...new Set(docked.filter(known))]
  const keptFloating = Object.fromEntries(
    Object.entries(floating).filter(
      (entry): entry is [Id, StoredRect] =>
        known(entry[0]) && !keptDocked.includes(entry[0]) && isRect(entry[1])
    )
  ) as Partial<Record<Id, StoredRect>>
  const placed = new Set<Id>([...keptDocked, ...(Object.keys(keptFloating) as Id[])])
  const missing = ids.filter((id) => !placed.has(id))
  const keptHeights: Partial<Record<Id, number>> =
    typeof heights === 'object' && heights !== null
      ? (Object.fromEntries(
          Object.entries(heights).filter(
            (entry): entry is [Id, number] => known(entry[0]) && isNumber(entry[1]) && entry[1] > 0
          )
        ) as Partial<Record<Id, number>>)
      : {}
  return {
    layout: {
      docked: [...keptDocked, ...missing],
      floating: keptFloating,
      dockWidth,
      heights: keptHeights,
    },
    completed: missing.length > 0,
  }
}

/**
 * The layout kept from the last session, or `null` — none kept, or one that cannot be read, said in the console.
 * @param storage - the page's storage
 * @param ids - the panels that exist, in their opening order
 * @returns the layout, or `null`
 */
export function readPanelLayout<Id extends string>(
  storage: LayoutStorage,
  ids: readonly Id[]
): StoredPanelLayout<Id> | null {
  const text = storage.getItem(PANEL_LAYOUT_KEY)
  if (text === null) return null
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error: unknown) {
    console.warn(
      '[Cartographer] the panels’ layout kept from last time cannot be read; they open as at first',
      error
    )
    return null
  }
  const read = readLayout(raw, ids)
  if (read === null) {
    console.warn(
      '[Cartographer] the panels’ layout kept from last time is not one; they open as at first'
    )
    return null
  }
  if (read.completed)
    console.warn('[Cartographer] panels the kept layout did not name are docked at the bottom')
  return read.layout
}

/**
 * Keep the layout for the next session.
 * @param storage - the page's storage
 * @param layout - the layout
 */
export function writePanelLayout<Id extends string>(
  storage: LayoutStorage,
  layout: StoredPanelLayout<Id>
): void {
  storage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(layout))
}
