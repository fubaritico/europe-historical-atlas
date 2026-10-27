/**
 * The contribution's events, loaded beside the map (CMS-224).
 *
 * Independent of everything else, and the same declared degraded mode as the rivers: if the file fails, the map comes
 * up without its events and a notice says so (`assetMessages`, severity `degraded`). The pins wait for the
 * relief on their own — `rebuildEvents` is a no-op until both are in, and whichever lands last draws them.
 */

import type { MapSources } from './mapSources'
import type { MapUi } from './mapUi'
import type { MapLayers } from './scene/layers/mapLayers'
import type { ContentSource } from '@europe-historical-atlas/core/data/contentSource'

/** What loading the events reads and writes. */
export interface ContentLoadDeps {
  /** Where the events are written once they land. */
  sources: Pick<MapSources, 'events'>
  /** What pins them. */
  layers: Pick<MapLayers, 'rebuildEvents'>
  /** Where a failure is told. */
  ui: Pick<MapUi, 'reportAssetFailure'>
  /**
   * Whether the app has been torn down.
   * @returns `true` once teardown has run
   */
  isDisposed: () => boolean
}

/**
 * Load the events and pin them, or say why not.
 * @param deps - the sources, the layers, the interface and the teardown flag
 * @param source - where the events come from
 * @returns once settled — it never rejects; a failure is reported
 */
export async function loadContent(deps: ContentLoadDeps, source: ContentSource): Promise<void> {
  try {
    const loaded = await source.load()
    if (deps.isDisposed()) return
    deps.sources.events = loaded.events
    deps.layers.rebuildEvents()
  } catch (error: unknown) {
    deps.ui.reportAssetFailure('content', error)
  }
}
