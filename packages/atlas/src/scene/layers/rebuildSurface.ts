/**
 * The one order the relief and everything laid on it are rebuilt in, so they stay on its surface.
 */

import { rebuildEvents } from '../events/mapEventLayer'
import { rebuildBorders } from '../political/borders/mapBorderLayer'
import { rebuildFills } from '../political/fills/mapFillLayer'
import { rebuildRelief } from '../relief/mapReliefLayer'
import { rebuildCoastline } from '../waters/mapCoastLayer'
import { rebuildRivers } from '../waters/mapRiverLayer'

import type { LayerContext } from './layerContext'

/**
 * Rebuild the relief, then everything laid on it, in the one order that keeps them on its surface.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildSurface(context: LayerContext): void {
  // The relief first, since every layer after it is laid on its new surface.
  rebuildRelief(context)
  rebuildCoastline(context)
  rebuildRivers(context)
  rebuildBorders(context)
  rebuildFills(context)
  rebuildEvents(context)
}
