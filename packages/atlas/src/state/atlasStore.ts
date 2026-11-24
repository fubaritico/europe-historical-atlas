import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'

import type { StoreApi } from 'zustand/vanilla'

/**
 * The atlas's store (ATLAS-392, the dev, 2026-11-24) — the state the map and the interface share, outside React: the
 * map's modules subscribe to it, the React interface reads it by `useStore(store, selector)`
 * (`files/plans/atlas/interface-integration.md`, § 3).
 *
 * **Settled facts only, each written by one owner**: the map writes what it knows (the years it has, the year it shows),
 * the interface what the reader chose (the year requested). Never the camera, the zoom or the hover — per-frame state
 * goes through no store (`rules/troubleshooting.md`). What the interface asks the map to **do** goes through the map's
 * commands, never through a value written here.
 */

/**
 * A request for a year. **Numbered**, so two requests for the same year are two requests (review QUAL-001, ARCH-002):
 * asking a year again while it is drawn starts a new drawing — the dev panel's reset asks it with every political
 * tunable reset — and the older drawing cannot settle the newer request.
 */
export interface YearRequest {
  /** The year requested. */
  readonly year: number
  /** Its number, rising with each request in this store. */
  readonly serial: number
}

/** What the map and the interface share. */
export interface AtlasState {
  /** The years that have a map, in their order — written by the map once it has started; empty until then. */
  readonly years: readonly number[]
  /**
   * The year whose map is on screen — written by the map; `null` before the first. **When the first year failed**, the
   * year whose failure is said: the map leaves its events standing under its notice (`loading/stages/political.ts`,
   * `startYear`) — review ARCH-003; the error screen of ATLAS-394 will settle what the reader sees then.
   */
  readonly shownYear: number | null
  /**
   * The request the map is drawing — written by the interface (the year switch, the dev panel's slider); replaced by a
   * newer request that overtakes it, `null` once the newest is over, its year drawn or failed. Named apart from the
   * map's own `sources.askedYear`, which is the year drawn (review ARCH-001).
   */
  readonly requested: YearRequest | null
}

/** What may be done to it, each by its owner. */
export interface AtlasActions {
  /**
   * The map has started (written by the map): the years it has, and the year it laid first.
   * @param years - the years that have a map
   * @param shown - the year laid first — see {@link AtlasState.shownYear} for when it failed
   */
  started: (years: readonly number[], shown: number | null) => void
  /**
   * Request a year (written by the interface). A newer request overtakes one in flight, even for the same year: the map
   * draws the newest.
   * @param year - the year requested
   */
  requestYear: (year: number) => void
  /**
   * A request is over (written by the map): the year drawn becomes the year shown. Ignored when a newer request has
   * overtaken it — that one settles for itself.
   * @param serial - the number of the request that is over
   * @param drawn - the year now on the map: the one requested, or the one before when the request failed
   */
  yearSettled: (serial: number, drawn: number | null) => void
}

/** The store's whole state: the facts and their actions. */
export type AtlasStoreState = AtlasState & AtlasActions

/**
 * Create the atlas's store — one per page, made at the composition root and handed to both sides.
 * @returns the store: `getState`, `setState`, and `subscribe` with a selector
 */
export function createAtlasStore() {
  let serials = 0
  return createStore<AtlasStoreState>()(
    subscribeWithSelector((set, get) => ({
      years: [],
      shownYear: null,
      requested: null,
      started: (years, shown): void => {
        set({ years: [...years], shownYear: shown })
      },
      requestYear: (year): void => {
        serials += 1
        set({ requested: { year, serial: serials } })
      },
      yearSettled: (serial, drawn): void => {
        if (get().requested?.serial !== serial) return
        set({ shownYear: drawn, requested: null })
      },
    }))
  )
}

/** The store a {@link createAtlasStore} call returns, for whoever has to name it. */
export type AtlasStore = ReturnType<typeof createAtlasStore>

/**
 * The facts of the store, **typed** read-only — what `useStore(store, selector)` needs (`getState`, `getInitialState`,
 * `subscribe`), without the actions or `setState`, so a reader's code cannot write a fact that is not its own (review
 * ARCH-004). The type is the guard: at runtime it is the store itself, actions included (review QUAL-001 of ATLAS-519)
 * — a facade would have to wrap `getState` too, and one losing `getInitialState` breaks `useStore` silently.
 */
export type AtlasFacts = Pick<StoreApi<AtlasState>, 'getState' | 'getInitialState' | 'subscribe'>

/** The interface's side of the store (ATLAS-519): it reads every fact, and writes only what the reader chose. */
export interface InterfaceSide {
  /** The facts, typed read-only. */
  readonly facts: AtlasFacts
  /**
   * Request a year — the reader's choice.
   * @param year - the year
   */
  requestYear: (year: number) => void
}

/**
 * The interface's side of a store: the facts, typed read-only, and the one action the interface owns.
 * @param store - the atlas's store
 * @returns its interface side
 */
export function interfaceSideOf(store: AtlasStore): InterfaceSide {
  return {
    facts: store,
    requestYear: (year): void => {
      store.getState().requestYear(year)
    },
  }
}
