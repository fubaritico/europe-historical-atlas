/**
 * What the pipeline is handed by its host, and the world every one of its steps reads: the compute, the gates that let
 * only the newest result write back, the ports, the rivers waiting for the relief.
 */

import type { MapAssetSources } from './assets'
import type { MapUi } from '../app/mapUi'
import type { AtlasMessageKey } from '../i18n'
import type { MapLayers } from '../scene/layers/mapLayers'
import type { MapSources } from '../sources/mapSources'
import type { DevState } from '../tunables/devState'
import type { RiverSet } from '@europe-historical-atlas/core/data/riverSource'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'
import type { MapCompute } from '@europe-historical-atlas/core/pipeline/mapCompute'
import type { ComputeWorkerHandle } from '@europe-historical-atlas/core/pipeline/workerCompute'
import type { LatestOnly } from '@europe-historical-atlas/core/utils/latestOnly'

/** What the pipeline needs from its host. */
export interface MapPipelineDeps {
  /** The live tunables. */
  dev: DevState
  /** What has been loaded, written here as it arrives. */
  sources: MapSources
  /** What the results are hung on. */
  layers: MapLayers
  /** Where progress is shown and failures are told. */
  ui: MapUi
  /** The atlas's messages in the reader's language, for the progress captions. */
  translate: Translate<AtlasMessageKey>
  /**
   * Create the compute worker. Injected because naming a worker module is bundler-specific, and a module
   * that carries one can neither be unit-tested nor moved to another bundler.
   * @returns the worker
   */
  spawn: () => ComputeWorkerHandle
  /**
   * Whether the app has been torn down.
   * @returns `true` once teardown has run
   */
  isDisposed: () => boolean
  /**
   * Where the payloads come from. Each port has a working default, so a test can replace one at a time
   * — which is the only way the two-stage startup and the freshness gates can be driven at all.
   */
  assets?: Partial<MapAssetSources>
}

/** Everything a pipeline call reads, including the compute it may have had to replace. */
export interface PipelineContext extends MapPipelineDeps {
  /**
   * The computes, held in a box because a dying worker is replaced by the inline implementation: the map's, and
   * the names' own (ATLAS-301) — placing a year's names holds a worker for seconds, and a bake asked meanwhile must
   * not wait behind them.
   */
  box: { compute: MapCompute; names: MapCompute }
  /** The names' face, loading or loaded — asked once for the pipeline's life. */
  nameFace: Promise<void> | null
  /** Only the newest bake may write back. */
  bakeGate: LatestOnly
  /** Only the newest year may write back — its own gate, or a bake would needlessly cancel a year. */
  politicalGate: LatestOnly
  /** Only the newest names may write back — asked by a year, or again by the panel. */
  namesGate: LatestOnly
  /** The five payload ports, defaults filled in. */
  assets: MapAssetSources
  /** The rivers once loaded, held until the relief is there to check their ground against. */
  pendingRivers: { set: RiverSet | null }
}
