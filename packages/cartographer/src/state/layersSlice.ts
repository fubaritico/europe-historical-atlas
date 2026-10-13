import type { CartographerStore } from './store'
import type { StateCreator } from 'zustand'

/**
 * What the canvas shows, layer by layer — `{Layers}`, the mockup's panel (`design/`, the dev's call D4 of
 * 2026-10-13, `files/plans/borders/plan.md`): an eye and an opacity per layer.
 *
 * **Out of the undo line, like the view**: hiding the rivers changes what the author sees, never the year.
 * An undo must not bring a layer back.
 */

/**
 * The layers the Cartographer draws, in painting order. The mockup's graticule and cities are left out
 * until there is something to draw for them — a row that shows and hides nothing would be a control
 * that lies.
 */
export const LAYER_IDS = [
  'backdrop',
  'fills',
  'coastline',
  'rivers',
  'borders',
  'unclaimed',
] as const

/** One of {@link LAYER_IDS}. */
export type LayerId = (typeof LAYER_IDS)[number]

/** How one layer is shown. */
export interface LayerSetting {
  /** Whether it is drawn at all. */
  visible: boolean
  /** How opaque, from 0 to 100. */
  opacity: number
}

/** Every layer's setting. */
export type LayerSettings = Readonly<Record<LayerId, LayerSetting>>

/**
 * The layers at opening: all shown, all opaque.
 *
 * **Two departures from the mockup, both on purpose**: the fills at 100 % rather than 70 % — the dev's
 * call of 2026-10-11, the atlas's tint at full strength — and *unclaimed* shown rather than hidden, since
 * the frontier against ground nobody claims is what the borders work of 2026-10-13 draws.
 */
export const DEFAULT_LAYERS: LayerSettings = {
  backdrop: { visible: true, opacity: 100 },
  fills: { visible: true, opacity: 100 },
  coastline: { visible: true, opacity: 100 },
  rivers: { visible: true, opacity: 100 },
  borders: { visible: true, opacity: 100 },
  unclaimed: { visible: true, opacity: 100 },
}

/** The layers' state. */
export interface LayersState {
  /** Every layer's setting. */
  layers: LayerSettings
}

/** What may be done to the layers. */
export interface LayersActions {
  /**
   * Show or hide a layer.
   * @param id - the layer
   * @param visible - whether it is drawn
   */
  setLayerVisible: (id: LayerId, visible: boolean) => void
  /**
   * Set a layer's opacity, clamped to 0–100. A non-number is refused and said.
   * @param id - the layer
   * @param opacity - from 0 to 100
   */
  setLayerOpacity: (id: LayerId, opacity: number) => void
}

/** The slice: the layers' settings, and the two ways to change them. */
export type LayersSlice = LayersState & LayersActions

/**
 * Open a layers slice, every layer shown and opaque.
 * @param set - the store's setter
 * @param get - the store's getter
 * @returns the slice
 */
export const createLayersSlice: StateCreator<
  CartographerStore,
  [['zustand/subscribeWithSelector', never]],
  [],
  LayersSlice
> = (set, get) => ({
  layers: DEFAULT_LAYERS,
  setLayerVisible: (id, visible): void => {
    set({ layers: { ...get().layers, [id]: { ...get().layers[id], visible } } })
  },
  setLayerOpacity: (id, opacity): void => {
    // A slider never produces a non-number: reaching it is a defect, said, and the setting left as it was
    // rather than replaced by a plausible 100 (`rules/error-handling.md`).
    if (!Number.isFinite(opacity)) {
      console.error(
        `[Cartographer] the ${id} layer was given the opacity ${String(opacity)}; kept as it was.`
      )
      return
    }
    const clamped = Math.min(100, Math.max(0, opacity))
    set({ layers: { ...get().layers, [id]: { ...get().layers[id], opacity: clamped } } })
  },
})
