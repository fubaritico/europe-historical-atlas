import { IconButton } from '@fubaritico/react/IconButton'
import { useCallback, useRef, useState } from 'react'

import { describeDrawingTarget } from '../state/drawingTarget'

import { PolityArrangeMenu } from './PolityArrangeMenu'
import { PolityDialog } from './PolityDialog'
import { PolityList } from './PolityList'
import { polityRows } from './polityRows'

import type { ArrangeRequest } from './PolityArrangeMenu'
import type { PolityColourSource } from '../state/polityColourSource'
import type { CartographerStoreHook } from '../state/store'
import type { ViewportPoint } from '../view/viewport'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

/** What the panel needs: the store, the colours its rows show, and where to say what a command did. */
export interface PolitiesPanelProps {
  /** The store polities are created in. */
  store: CartographerStoreHook
  /** Where the polities' colours come from — the canvas reads the same source. */
  colours: PolityColourSource
  /** Say what a command did, in the status bar's result zone — the one live region (A11Y-003). */
  onResult: (message: string | null) => void
}

/**
 * The open stacking menu of `{Polities}`: which row, where, and how it closes — the focus going back to
 * this panel's list, where the menu was asked for, so the keys carry on there.
 * @returns the request, its open and close, and the panel's ref
 */
function useArrangeMenu() {
  // Refs
  const panel = useRef<HTMLElement | null>(null)

  // State
  const [arranging, setArranging] = useState<ArrangeRequest | null>(null)

  // Handlers
  const openMenu = useCallback((id: string, at: ViewportPoint) => {
    setArranging({ id, at })
  }, [])
  const closeMenu = useCallback(() => {
    setArranging(null)
    panel.current?.querySelector<HTMLElement>('.polities__list')?.focus()
  }, [])

  // Return
  return { arranging, openMenu, closeMenu, panel }
}

/**
 * The panel's title bar and `[+ New polity]`, where `design/03` puts it — the `+` at the end of the
 * panel's tab strip.
 * @param props - what `+` does
 * @param props.onNew - open the creation dialogue
 * @returns the head
 */
function PolitiesHead({ onNew }: { onNew: () => void }) {
  // Render
  return (
    <header className="polities__head">
      <h2 className="polities__title">Polities</h2>
      <IconButton icon="Plus" aria-label="New polity" onClick={onNew} />
    </header>
  )
}

/**
 * The panel's two dialogues: `[+ New polity]`'s, and the one editing a polity — mounted per polity, so
 * the form opens filled with that polity's values (`s07`).
 * @param props - the store, whether creating, the polity edited, and how each closes
 * @returns the dialogues
 */
function PolityDialogs({
  store,
  creating,
  edited,
  onCreated,
  onEdited,
}: {
  store: CartographerStoreHook
  creating: boolean
  edited: YearPolity | null
  onCreated: () => void
  onEdited: () => void
}) {
  // Render
  return (
    <>
      {edited === null ? null : (
        <PolityDialog key={edited.id} store={store} editing={edited} isOpen onClose={onEdited} />
      )}
      <PolityDialog store={store} editing={null} isOpen={creating} onClose={onCreated} />
    </>
  )
}

/**
 * `{Polities}` as it stands today: its title bar and `[+ New polity]`, where `design/03` puts it — the
 * `+` at the end of the panel's tab strip.
 *
 * **The list follows the document**: every polity of the year as the tree of groups, front first
 * (`s16`), the one aimed at marked, those with nothing drawn marked *"no territory"* (`s02`). Choosing a
 * row aims at it and leaves the tool in hand — `next.md`'s *"we pick who, then act"*.
 * @param props - the store, the colour source and the result sink
 * @returns the panel's head, the tree, the stacking menu when open, and the dialogue it opens
 */
export function PolitiesPanel({ store, colours, onResult }: PolitiesPanelProps) {
  // Store
  const target = store((state) => state.target)
  // The document is mutated in place: the version is what changes when a polity is added or drawn.
  const version = store((state) => state.version)

  // Store actions
  const chooseTarget = store((state) => state.chooseTarget)

  // State
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const { arranging, openMenu, closeMenu, panel } = useArrangeMenu()

  // Derived
  const { document } = store.getState()
  // Resolved each render: an undo can take the polity away while its dialogue is open, and then there
  // is nothing to edit — the dialogue is not shown.
  const edited = document.polities.find((polity) => polity.id === editing)

  // Render
  return (
    <section ref={panel} className="polities" aria-label="Polities">
      <PolitiesHead
        onNew={() => {
          setCreating(true)
        }}
      />
      <PolityList
        year={document.year}
        rows={polityRows(document, colours.coloursOf(document, version))}
        targetId={describeDrawingTarget(document, target)?.id ?? null}
        onChoose={chooseTarget}
        onMenu={openMenu}
        onEdit={setEditing}
      />
      {arranging === null ? null : (
        <PolityArrangeMenu
          store={store}
          request={arranging}
          onClose={closeMenu}
          onResult={onResult}
          onEdit={setEditing}
        />
      )}
      <PolityDialogs
        store={store}
        creating={creating}
        edited={edited ?? null}
        onCreated={() => {
          setCreating(false)
        }}
        onEdited={() => {
          setEditing(null)
          // The dialogue is unmounted, not closed: the focus is handed back to the list by hand.
          panel.current?.querySelector<HTMLElement>('.polities__list')?.focus()
        }}
      />
    </section>
  )
}
