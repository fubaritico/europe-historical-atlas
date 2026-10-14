import { useCallback, useEffect, useRef, useState } from 'react'

import { describeDrawingTarget } from '../state/drawingTarget'

import { Panel } from './Panel'
import { PolitiesActions } from './PolitiesActions'
import { PolityArrangeMenu } from './PolityArrangeMenu'
import { PolityDeleteDialog } from './PolityDeleteDialog'
import { deletionResult, pendingDeletion } from './polityDeletion'
import { PolityDialog } from './PolityDialog'
import { PolityList } from './PolityList'
import { polityRows } from './polityRows'

import type { ArrangeRequest } from './PolityArrangeMenu'
import type { PendingDeletion } from './polityDeletion'
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
 * The dialogue editing a polity — mounted per polity, so the form opens filled with that polity's values
 * (`s07`). None while nothing is edited.
 * @param props - the store, the polity edited, and how the dialogue closes
 * @param props.store - the store holding the document
 * @param props.edited - the polity edited, or `null`
 * @param props.onEdited - close it
 * @returns the dialogue, or nothing
 */
function EditDialog({
  store,
  edited,
  onEdited,
}: {
  store: CartographerStoreHook
  edited: YearPolity | null
  onEdited: () => void
}) {
  // Render
  return edited === null ? null : (
    <PolityDialog key={edited.id} store={store} editing={edited} isOpen onClose={onEdited} />
  )
}

/**
 * Deleting the selected polity: ask first (D2), then delete as one undoable step and say what went.
 *
 * **A refusal is said, never silent**: a polity gone between the question and the answer (an undo in
 * between) is reported in the result zone and logged as an error — the panel and the document disagreed.
 * @param store - the store holding the document
 * @param onResult - the status bar's result zone
 * @param onDone - give the focus back to the list, once the dialogue has closed
 * @returns the polity awaiting confirmation, and the three gestures
 */
function usePolityDeletion(
  store: CartographerStoreHook,
  onResult: (message: string | null) => void,
  onDone: () => void
) {
  // Store actions
  const deletePolity = store((state) => state.deletePolity)

  // Refs
  const answered = useRef(false)

  // State
  const [pending, setPending] = useState<PendingDeletion | null>(null)

  // Handlers
  const askToDelete = () => {
    const { document, target } = store.getState()
    const resolved = describeDrawingTarget(document, target)
    setPending(resolved === null ? null : pendingDeletion(document, resolved.id))
  }
  const cancelDeletion = () => {
    answered.current = true
    setPending(null)
  }
  const confirmDeletion = () => {
    if (pending !== null) {
      const report = deletePolity(pending.id, {
        kind: 'delete-polity',
        label: `delete ${pending.name}`,
      })
      if (report === null) {
        console.error(
          `[Cartographer] "${pending.name}" was no longer in the year; nothing was deleted.`
        )
        onResult(`nothing deleted: ${pending.name} is no longer in the year`)
      } else onResult(deletionResult(pending, report))
    }
    answered.current = true
    setPending(null)
  }

  // Effects
  // The focus goes back to the list only once the dialogue has closed. Closing hands it to the trash that
  // opened it — disabled by then, after a deletion, so the focus would fall to the body. The design
  // system's Modal closes in its own effect, and a child's effects run before its parent's: this one comes
  // after, and has the last word.
  useEffect(() => {
    if (pending === null && answered.current) {
      answered.current = false
      onDone()
    }
  }, [pending, onDone])

  // Return
  return { pending, askToDelete, cancelDeletion, confirmDeletion }
}

/**
 * The panel's foot: the action bar, the new-polity dialogue its `[+]` opens and the confirmation its
 * trash opens. The trash deletes the polity aimed at (D3), and is disabled when none resolves — an undo
 * that takes the target away disables it too.
 * @param props - the store, the result sink and the focus hand-back
 * @param props.store - the store holding the document
 * @param props.onResult - the status bar's result zone
 * @param props.onDone - give the focus back to the list once the confirmation closes
 * @returns the bar and the two dialogues it opens
 */
function PolitiesFoot({
  store,
  onResult,
  onDone,
}: {
  store: CartographerStoreHook
  onResult: (message: string | null) => void
  onDone: () => void
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
      <PolityDialog store={store} editing={null} isOpen={creating} onClose={handleCreated} />
      <PolityDeleteDialog pending={pending} onConfirm={confirmDeletion} onCancel={cancelDeletion} />
    </>
  )
}

/**
 * `{Polities}` as it stands today: its title bar, the tree, and the action bar at its foot (`s07`, *The
 * panel's action bar*) — `[+]` and the trash.
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
  const [editing, setEditing] = useState<string | null>(null)
  const { arranging, openMenu, closeMenu, panel } = useArrangeMenu()

  // Derived
  const { document } = store.getState()
  // Resolved each render: an undo can take the polity away while its dialogue is open, and then there
  // is nothing to edit — the dialogue is not shown.
  const edited = document.polities.find((polity) => polity.id === editing)

  // Handlers
  // A dialogue unmounted rather than closed gives the focus back to nothing: it is handed to the list.
  const focusList = () => {
    panel.current?.querySelector<HTMLElement>('.polities__list')?.focus()
  }
  const handleEdited = () => {
    setEditing(null)
    focusList()
  }

  // Render
  return (
    // Its actions sit in the bar at the foot (`PolitiesActions`), not in the head — the dev's request,
    // 2026-10-12.
    <Panel
      ref={panel}
      title="Polities"
      fill
      foot={<PolitiesFoot store={store} onResult={onResult} onDone={focusList} />}
    >
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
      <EditDialog store={store} edited={edited ?? null} onEdited={handleEdited} />
    </Panel>
  )
}
