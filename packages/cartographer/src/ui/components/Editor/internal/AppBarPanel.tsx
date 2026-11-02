import { useSyncExternalStore } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { APP_MESSAGES } from '../../../i18n/app'

import { AppBar } from './AppBar'

import type { AppBarProps } from './AppBar'
import type { MapNameSource } from '../../../utils/mapNameSource'

/**
 * The top bar's binding: the one place it knows where the map's name comes from (`react-canvas-and-panels`). `AppBar`
 * takes values; this reads the name — which *Save as…* changes — and hands it over with the four gestures.
 */

/** What the top bar's binding needs: the four gestures, and where the map's name is read. */
export interface AppBarPanelProps extends Omit<AppBarProps, 'name' | 'map'> {
  /** The map open's name, which *Save as…* changes. */
  mapName: MapNameSource
}

/**
 * The top bar, bound to the map's name.
 * @param props - the name's source and the four gestures
 * @param props.mapName - where the map's name is read
 * @returns the top bar
 */
export function AppBarPanel({ mapName, ...gestures }: AppBarPanelProps) {
  // Context
  const app = useTranslation(APP_MESSAGES)

  // State
  const map = useSyncExternalStore(mapName.subscribe, mapName.get)

  // Render
  return <AppBar name={app('name')} map={map} {...gestures} />
}
