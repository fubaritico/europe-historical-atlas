import { CitiesPanel } from '../../CitiesPanel'
import { LayersPanel } from '../../LayersPanel'
import { LinePanel } from '../../LinePanel'
import { OverridesPanel } from '../../OverridesPanel'
import { PolitiesPanel } from '../../PolitiesPanel'

import type { PanelId } from '../../../../state/panelsSlice'
import type { PolityColourSource } from '../../../../state/polityColourSource'
import type { CartographerStoreHook } from '../../../../state/store'
import type { WikidataSource } from '../../../../wikidata/wikidataSource'

/** What the panels need, between them. */
export interface PanelDeps {
  /** The store. */
  store: CartographerStoreHook
  /** The polities' colours. */
  colours: PolityColourSource
  /** The status bar's result zone, for what `{Polities}` did. */
  onResult: (message: string | null) => void
  /** Where the polity form reads Wikidata from. */
  wikidata: WikidataSource
}

/**
 * The panel a frame holds, by its id.
 * @param props - the panel's id, and what the panels need
 * @param props.id - the panel
 * @returns the panel
 */
export function DockedPanel({ id, ...deps }: PanelDeps & { id: PanelId }) {
  switch (id) {
    case 'polities':
      return <PolitiesPanel {...deps} />
    case 'line':
      return <LinePanel store={deps.store} />
    case 'overrides':
      return <OverridesPanel store={deps.store} />
    case 'layers':
      return <LayersPanel store={deps.store} />
    case 'cities':
      return <CitiesPanel store={deps.store} />
  }
}
