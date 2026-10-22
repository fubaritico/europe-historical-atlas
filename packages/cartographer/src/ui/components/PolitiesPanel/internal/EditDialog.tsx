import { PolityDialog } from './PolityDialog'

import type { CartographerStoreHook } from '../../../../state/store'
import type { WikidataSource } from '../../../../wikidata/wikidataSource'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

/**
 * The dialogue editing a polity — mounted per polity, so the form opens filled with that polity's values
 * (`s07`). None while nothing is edited.
 * @param props - the store, the polity edited, and how the dialogue closes
 * @param props.store - the store holding the document
 * @param props.edited - the polity edited, or `null`
 * @param props.onEdited - close it
 * @param props.wikidata - where the form reads Wikidata from
 * @returns the dialogue, or nothing
 */
export function EditDialog({
  store,
  edited,
  onEdited,
  wikidata,
}: {
  store: CartographerStoreHook
  edited: YearPolity | null
  onEdited: () => void
  wikidata: WikidataSource
}) {
  // Render
  return edited === null ? null : (
    <PolityDialog
      key={edited.id}
      store={store}
      editing={edited}
      isOpen
      onClose={onEdited}
      wikidata={wikidata}
    />
  )
}
