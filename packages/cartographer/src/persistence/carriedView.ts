import type { Viewport } from '../viewport/viewport'

/**
 * The view carried from one map to the next (`s19`, the dev, 2026-11-02: *"the map I want to open opens with the same
 * point of view and zoom as the previous map"*), and across a reload (CARTO-427, the dev, 2026-11-13: *"when I reload
 * the Cartographer, it remembers the zoom, the position"*). The view is written to the tab's own storage at every
 * change (`state/keepView.ts`) and read when the page starts, in place of the opening framing. Every map is drawn over
 * the same backdrop, so a view of one is the same ground on the next.
 */

/** Where in the tab's storage the view waits. */
export const CARRIED_VIEW_KEY = 'cartographer:carried-view'

/** The tab's storage, reduced to what this reads and writes — `sessionStorage` in the page, a map in a test. */
export interface ViewStorage {
  /**
   * @param key - the key
   * @returns the value, or `null`
   */
  getItem: (key: string) => string | null
  /**
   * @param key - the key
   * @param value - the value
   */
  setItem: (key: string, value: string) => void
}

/**
 * Keep the view for the page the next map opens in.
 * @param storage - the tab's storage
 * @param view - the view now on screen
 */
export function carryView(storage: ViewStorage, view: Viewport): void {
  storage.setItem(CARRIED_VIEW_KEY, JSON.stringify(view))
}

/**
 * Whether a parsed value is a view a map can open on: three finite numbers, a scale above nought.
 * @param value - what was read
 * @returns `true` for a view
 */
function isView(value: unknown): value is Viewport {
  if (value === null || typeof value !== 'object') return false
  const { scale, originX, originY } = value as Record<string, unknown>
  return (
    typeof scale === 'number' &&
    typeof originX === 'number' &&
    typeof originY === 'number' &&
    Number.isFinite(scale) &&
    Number.isFinite(originX) &&
    Number.isFinite(originY) &&
    scale > 0
  )
}

/**
 * Read the view kept in the tab: the last one on screen — kept, not removed, so a reload opens on it too (CARTO-427).
 *
 * **A carried view that cannot be read opens on the opening framing, and says so in the console** — the view is a
 * comfort, not the map: the map opens whole either way, and the author sees the whole backdrop rather than a corner.
 * @param storage - the tab's storage
 * @returns the view, or `null` when none was carried or it could not be read
 */
export function takeCarriedView(storage: ViewStorage): Viewport | null {
  const text = storage.getItem(CARRIED_VIEW_KEY)
  if (text === null) return null
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    value = undefined
  }
  if (isView(value)) return { scale: value.scale, originX: value.originX, originY: value.originY }
  console.warn(
    '[Cartographer] the view kept from last time could not be read — opening on the whole map'
  )
  return null
}
