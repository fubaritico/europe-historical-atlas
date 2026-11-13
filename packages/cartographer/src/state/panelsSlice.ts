import type { StateCreator } from 'zustand'

/**
 * Where the panels are — CARTO-342 (the dev, 2026-11-02: *"draggable, resizable, magnetised to the right column, like
 * in Illustrator"*; `files/plans/cartographer/panels-dock.md`): which are docked in the right column and in what order,
 * which float over the window and where, how wide the column is, how tall a docked panel is.
 *
 * **Out of the undo line, like the layers**: moving a panel changes what the author sees, never the year. **Written on
 * release only**: a drag in progress moves the panel by its style, never through the store (`rules/troubleshooting.md`).
 */

/** The panels of the dock, in their opening order. */
export const PANEL_IDS = ['polities', 'line', 'overrides', 'layers', 'cities'] as const

/** One of {@link PANEL_IDS}. */
export type PanelId = (typeof PANEL_IDS)[number]

/** A rectangle in CSS pixels of the window. */
export interface PanelRect {
  /** From the window's left edge. */
  readonly x: number
  /** From the window's top edge. */
  readonly y: number
  /** Its width. */
  readonly width: number
  /** Its height. */
  readonly height: number
}

/** How the panels are laid out. */
export interface PanelLayout {
  /** The panels docked in the column, top to bottom. A panel not listed here floats. */
  readonly docked: readonly PanelId[]
  /** Each floating panel's rectangle. */
  readonly floating: Readonly<Partial<Record<PanelId, PanelRect>>>
  /** The column's width, in CSS pixels. */
  readonly dockWidth: number
  /** A docked panel's height when the author set one; otherwise it takes its content's, `{Polities}` what is left. */
  readonly heights: Readonly<Partial<Record<PanelId, number>>>
}

/** The column's width at opening — the design's `--dock-w`. */
export const DEFAULT_DOCK_WIDTH = 280

/** The narrowest and widest the column may be made. */
export const DOCK_WIDTH_RANGE = { min: 200, max: 640 } as const

/**
 * A column width kept within {@link DOCK_WIDTH_RANGE}, in whole pixels — one rule for the drag, the store and a kept
 * layout (review ARCH-004).
 * @param width - in CSS pixels
 * @returns the width the column takes
 */
export function clampDockWidth(width: number): number {
  return Math.round(Math.min(DOCK_WIDTH_RANGE.max, Math.max(DOCK_WIDTH_RANGE.min, width)))
}

/** Every panel docked, in the opening order, at the design's width. */
export const DEFAULT_PANEL_LAYOUT: PanelLayout = {
  docked: PANEL_IDS,
  floating: {},
  dockWidth: DEFAULT_DOCK_WIDTH,
  heights: {},
}

/** The lists whose filter text the store holds — `{Polities}`' and `{Cities}`'. */
export type FilteredList = 'polities' | 'cities'

/** The panels' state. */
export interface PanelsState {
  /** Where the panels are. */
  panelLayout: PanelLayout
  /**
   * What is typed in each list's filter — held here rather than in the list (CARTO-427, the dev, 2026-11-13: *"when I
   * reload the Cartographer, it remembers the zoom, the position, the filters"*), so the page's storage can keep it.
   */
  listQueries: Readonly<Record<FilteredList, string>>
}

/** What may be done to the panels. */
export interface PanelsActions {
  /**
   * Take a panel out of the column, or move it while it floats.
   * @param id - the panel
   * @param rect - where it floats
   */
  floatPanel: (id: PanelId, rect: PanelRect) => void
  /**
   * Dock a panel in the column, at a place — from the column itself (a move in the stack) or from the window.
   * @param id - the panel
   * @param index - its place among the docked panels once docked, from 0
   */
  dockPanel: (id: PanelId, index: number) => void
  /**
   * Set the column's width, kept within {@link DOCK_WIDTH_RANGE}.
   * @param width - in CSS pixels
   */
  setDockWidth: (width: number) => void
  /**
   * Set a docked panel's height.
   * @param id - the panel
   * @param height - in CSS pixels
   */
  setPanelHeight: (id: PanelId, height: number) => void
  /**
   * Install a whole layout — the one kept from the last session.
   * @param layout - the layout
   */
  setPanelLayout: (layout: PanelLayout) => void
  /**
   * Set what is typed in a list's filter.
   * @param list - the list
   * @param query - the text
   */
  setListQuery: (list: FilteredList, query: string) => void
}

/** The slice: the layout, and the ways to change it. */
export type PanelsSlice = PanelsState & PanelsActions

/**
 * A layout with a panel docked at a place, wherever it was.
 * @param layout - the layout before
 * @param id - the panel
 * @param index - its place once docked
 * @returns the layout after
 */
export function withPanelDocked(layout: PanelLayout, id: PanelId, index: number): PanelLayout {
  const others = layout.docked.filter((docked) => docked !== id)
  const at = Math.max(0, Math.min(others.length, Math.round(index)))
  const floating = Object.fromEntries(
    Object.entries(layout.floating).filter(([floated]) => floated !== id)
  ) as PanelLayout['floating']
  return { ...layout, docked: [...others.slice(0, at), id, ...others.slice(at)], floating }
}

/**
 * A layout with a panel floating at a rectangle, wherever it was.
 * @param layout - the layout before
 * @param id - the panel
 * @param rect - where it floats
 * @returns the layout after
 */
export function withPanelFloating(layout: PanelLayout, id: PanelId, rect: PanelRect): PanelLayout {
  return {
    ...layout,
    docked: layout.docked.filter((docked) => docked !== id),
    floating: { ...layout.floating, [id]: rect },
  }
}

/**
 * Open a panels slice: every panel docked, at the design's width.
 * @param set - the store's setter
 * @param get - the store's getter
 * @returns the slice
 */
export const createPanelsSlice: StateCreator<
  PanelsSlice,
  [['zustand/subscribeWithSelector', never]],
  [],
  PanelsSlice
> = (set, get) => ({
  panelLayout: DEFAULT_PANEL_LAYOUT,
  listQueries: { polities: '', cities: '' },
  setListQuery: (list, query): void => {
    set({ listQueries: { ...get().listQueries, [list]: query } })
  },
  floatPanel: (id, rect): void => {
    set({ panelLayout: withPanelFloating(get().panelLayout, id, rect) })
  },
  dockPanel: (id, index): void => {
    set({ panelLayout: withPanelDocked(get().panelLayout, id, index) })
  },
  setDockWidth: (width): void => {
    // A drag never produces a non-number: reaching it is a defect, said, and the width left as it was.
    if (!Number.isFinite(width)) {
      console.error(
        `[Cartographer] the column was given the width ${String(width)}; kept as it was.`
      )
      return
    }
    const dockWidth = clampDockWidth(width)
    set({ panelLayout: { ...get().panelLayout, dockWidth } })
  },
  setPanelHeight: (id, height): void => {
    if (!Number.isFinite(height) || height <= 0) {
      console.error(
        `[Cartographer] the ${id} panel was given the height ${String(height)}; kept as it was.`
      )
      return
    }
    const layout = get().panelLayout
    set({ panelLayout: { ...layout, heights: { ...layout.heights, [id]: Math.round(height) } } })
  },
  setPanelLayout: (panelLayout): void => {
    const dockWidth = clampDockWidth(panelLayout.dockWidth)
    set({ panelLayout: { ...panelLayout, dockWidth } })
  },
})
