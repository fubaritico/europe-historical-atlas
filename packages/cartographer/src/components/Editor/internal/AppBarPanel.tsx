import { AppBar } from './AppBar'

import type { CartographerStoreHook } from '../../../state/store'

/**
 * The top bar's binding: the one place it knows there is a store (`react-canvas-and-panels`). `AppBar` takes
 * values; this reads the slices and hands them over.
 */

/** What the top bar's binding needs. */
export interface AppBarPanelProps {
  /** The store the open year is read from. */
  store: CartographerStoreHook
  /** The application's name. */
  name: string
  /** Save the open year — the same call as ‹ctrl+S›, from the composition root. */
  onSave: () => void
  /** Open the *Open snapshot* dialogue. */
  onOpenSnapshot: () => void
}

/**
 * The top bar, bound to the store.
 * @param props - the store, the name, and what saving does
 * @param props.store - the store
 * @param props.name - the application's name
 * @param props.onSave - save the open year
 * @param props.onOpenSnapshot - open the snapshot dialogue
 * @returns the top bar
 */
export function AppBarPanel({ store, name, onSave, onOpenSnapshot }: AppBarPanelProps) {
  // Store
  const year = store((state) => state.document.year)

  // Render
  return <AppBar name={name} year={year} onSave={onSave} onOpenSnapshot={onOpenSnapshot} />
}
