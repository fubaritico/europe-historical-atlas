import { useState } from 'react'

import { describeDrawingTarget } from '../../../../state/drawingTarget'
import { usePolityDeletion } from '../hooks/usePolityDeletion'

import { PolitiesActions } from './PolitiesActions'
import { PolityDeleteDialog } from './PolityDeleteDialog'
import { PolityDialog } from './PolityDialog'

import type { CartographerStoreHook } from '../../../../state/store'
import type { WikidataSource } from '../../../../wikidata/wikidataSource'

/**
 * The panel's foot: the action bar, the new-polity dialogue its `[+]` opens and the confirmation its
 * trash opens. The trash deletes the polity aimed at (D3), and is disabled when none resolves — an undo
 * that takes the target away disables it too.
 * @param props - the store, the result sink and the focus hand-back
 * @param props.store - the store holding the document
 * @param props.onResult - the status bar's result zone
 * @param props.onDone - give the focus back to the list once the confirmation closes
 * @param props.wikidata - where the new-polity form reads Wikidata from
 * @returns the bar and the two dialogues it opens
 */
export function PolitiesFoot({
  store,
  onResult,
  onDone,
  wikidata,
}: {
  store: CartographerStoreHook
  onResult: (message: string | null) => void
  onDone: () => void
  wikidata: WikidataSource
}) {
  // Store
  const target = store((state) => state.target)
  // Read so an undo that removes or restores the target re-renders the bar. Today the panel's own
  // re-render carries the foot along too, so no test can tell this line is missing; it is what keeps the
  // foot right on its own, the day it is memoised.
  store((state) => state.version)

  // State
  const [creating, setCreating] = useState(false)
  const { pending, askToDelete, cancelDeletion, confirmDeletion } = usePolityDeletion(
    store,
    onResult,
    onDone
  )

  // Derived
  const canDelete = describeDrawingTarget(store.getState().document, target) !== null

  // Handlers
  const handleNew = () => {
    setCreating(true)
  }
  const handleCreated = () => {
    setCreating(false)
  }

  // Render
  return (
    <>
      <PolitiesActions onNew={handleNew} onDelete={askToDelete} canDelete={canDelete} />
      <PolityDialog
        store={store}
        editing={null}
        isOpen={creating}
        onClose={handleCreated}
        wikidata={wikidata}
      />
      <PolityDeleteDialog pending={pending} onConfirm={confirmDeletion} onCancel={cancelDeletion} />
    </>
  )
}
