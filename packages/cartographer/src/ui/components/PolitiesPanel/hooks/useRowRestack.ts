import { areSiblings } from '@europe-historical-atlas/core/editor/stacking'

import { useTranslation } from '../../../hooks/useTranslation'
import { POLITIES_PANEL_MESSAGES } from '../i18n'

import type { CartographerStoreHook } from '../../../../state/store'
import type { StackingSide } from '@europe-historical-atlas/core/editor/stacking'

/**
 * A row of `{Polities}` dropped on another (CARTO-457, the dev, 2026-11-16: *« c'est un déplacement entre siblings, il
 * faut pas plus que ça »*): put in front of it or behind it when the two owe the same suzerain, as one step of the
 * history; refused otherwise — the suzerain never changes by a drag. Each outcome said in the result zone, a refusal
 * in the console too.
 * @param store - the store the polity is moved in
 * @param onResult - says what the drop did, in the status bar's result zone
 * @returns the drop's handler: the row dragged, the row it lands on, the side
 */
export function useRowRestack(
  store: CartographerStoreHook,
  onResult: (message: string | null) => void
): (id: string, besideId: string, side: StackingSide) => void {
  // Store actions
  const restackBeside = store((state) => state.restackPolityBeside)

  // Context
  const t = useTranslation(POLITIES_PANEL_MESSAGES)

  // Return
  return (id, besideId, side) => {
    const { document } = store.getState()
    const nameOf = (each: string) =>
      document.polities.find((polity) => polity.id === each)?.name ?? each
    const words = { name: nameOf(id), beside: nameOf(besideId), side }
    if (!areSiblings(document, id, besideId)) {
      console.warn(`[Cartographer] ${words.name} dropped beside ${words.beside}: not siblings.`)
      onResult(t('dropRefused', words))
      return
    }
    if (restackBeside(id, besideId, side, { kind: 'restack', label: t('dropStep', words) })) {
      onResult(t('dropped', words))
      return
    }
    console.warn(`[Cartographer] ${words.name} dropped where it already stands.`)
    onResult(t('dropInPlace', words))
  }
}
