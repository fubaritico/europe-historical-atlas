import { LayersPanel } from '../../LayersPanel'
import { LinePanel } from '../../LinePanel'
import { OverridesPanel } from '../../OverridesPanel'
import { PolitiesPanel } from '../../PolitiesPanel'

import type { PolityColourSource } from '../../../../state/polityColourSource'
import type { CartographerStoreHook } from '../../../../state/store'
import type { WikidataSource } from '../../../../wikidata/wikidataSource'

/**
 * The dock's panels, top to bottom: `{Polities}`, `{Line}` — the selected stretch's style — `{Overrides}`, then `{Layers}`.
 * @param props - what the panels need
 * @param props.store - the store
 * @param props.colours - the polities' colours
 * @param props.onResult - the status bar's result zone, for what `{Polities}` did
 * @param props.wikidata - where the polity form reads Wikidata from
 * @returns the dock's content
 */
export function Dock({
  store,
  colours,
  onResult,
  wikidata,
}: {
  store: CartographerStoreHook
  colours: PolityColourSource
  onResult: (message: string | null) => void
  wikidata: WikidataSource
}) {
  // Render
  return (
    <div className="dock-stack">
      <PolitiesPanel store={store} colours={colours} onResult={onResult} wikidata={wikidata} />
      <LinePanel store={store} />
      <OverridesPanel store={store} />
      <LayersPanel store={store} />
    </div>
  )
}
