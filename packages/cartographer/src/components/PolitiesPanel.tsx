import { IconButton } from '@fubaritico/react/IconButton'
import { useState } from 'react'

import { NewPolityDialog } from './NewPolityDialog'

import type { CartographerStoreHook } from '../state/store'

/** What the panel needs: the store, handed on to the dialogue. */
export interface PolitiesPanelProps {
  /** The store polities are created in. */
  store: CartographerStoreHook
}

/**
 * `{Polities}` as it stands today: its title bar and `[+ New polity]`, where `design/03` puts it — the
 * `+` at the end of the panel's tab strip.
 *
 * **The list is not here yet**, deliberately: it is step 5's, with the "no territory" marker and the
 * vassalage tree. What this rung owes is the way in to the form.
 * @param props - the store
 * @returns the panel's head and the dialogue it opens
 */
export function PolitiesPanel({ store }: PolitiesPanelProps) {
  const [creating, setCreating] = useState(false)
  return (
    <section className="polities" aria-label="Polities">
      <header className="polities__head">
        <h2 className="polities__title">Polities</h2>
        <IconButton
          icon="Plus"
          aria-label="New polity"
          onClick={() => {
            setCreating(true)
          }}
        />
      </header>
      <NewPolityDialog
        store={store}
        isOpen={creating}
        onClose={() => {
          setCreating(false)
        }}
      />
    </section>
  )
}
