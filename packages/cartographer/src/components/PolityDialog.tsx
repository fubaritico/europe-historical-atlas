import { Modal } from '@fubaritico/react/Modal'
import { useState } from 'react'

import {
  DRAFT_ERRORS,
  EMPTY_DRAFT,
  draftOf,
  rankChoices,
  readDraft,
  suzerainChoices,
  withId,
  withName,
} from './polityDraft'
import { PolityForm } from './PolityForm'

import type { DraftField, PolityDraft } from './polityDraft'
import type { PolityFormField } from './PolityForm'
import type { CartographerStoreHook } from '../state/store'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { HsvaColor } from '@fubaritico/behaviors'

/** What the dialogue needs from its caller. */
export interface PolityDialogProps {
  /** The store the polity is created or changed in, and the Pen aimed through. */
  store: CartographerStoreHook
  /**
   * The polity to change — `s07`'s *[Edit properties…]* — or `null` for `[+ New polity]`. Read when the
   * dialogue mounts: the caller mounts one per polity edited.
   */
  editing: YearPolity | null
  /** Whether the dialogue is shown. The caller owns it — the design system's Modal is controlled. */
  isOpen: boolean
  /** Called once the dialogue is done, validated or cancelled. */
  onClose: () => void
}

/**
 * Validate the form against the document: create, then aim — or change, keeping the target.
 *
 * **Create, then aim, in that order and only on success.** `createPolity` refuses an id the year already
 * holds by returning `false`; the form checked first, and this second line stays because the document is
 * the authority, not the form's copy of its ids. A change keeps the polity's id and so its target.
 *
 * **A new polity is created just in front of the one selected** (CARTO-242): the target when `[+]` was
 * pressed, so it appears right above it in `{Polities}` — when the two owe the same suzerain; otherwise, and
 * with nothing selected, at the top of its own group as before (`addPolity`).
 * @param store - the store
 * @param polity - the form, read
 * @param editing - whether it changes an existing polity
 * @returns the error to show beside a field, or `null` when the document took it
 */
function commit(
  store: CartographerStoreHook,
  polity: YearPolity,
  editing: boolean
): Partial<Record<DraftField, string>> | null {
  const { createPolity, editPolity, aimAt, target } = store.getState()
  if (editing) {
    // The suzerain list offers no loop: a refusal here is a defect, said loudly.
    if (editPolity(polity, { kind: 'edit-polity', label: `edit ${polity.name}` })) return null
    console.error(`[Cartographer] the document refused the change to "${polity.id}".`)
    return {}
  }
  if (!createPolity(polity, { kind: 'create-polity', label: `create ${polity.name}` }, target)) {
    return { id: DRAFT_ERRORS.idTaken }
  }
  aimAt(polity.id)
  return null
}

/**
 * A click on the backdrop does nothing — deliberately: a dialogue holding typed work must not lose it to a
 * stray click (the design system's own warning). Escape, Cancel and the cross close it.
 */
function ignoreOverlayClick(): void {
  // Deliberately nothing.
}

/**
 * The draft the dialogue opens on: empty for a new polity, the polity's own values when editing one.
 * @param editing - the polity edited, or `null` when creating
 * @returns the opening draft
 */
function openingOf(editing: YearPolity | null): PolityDraft {
  return editing === null ? EMPTY_DRAFT : draftOf(editing)
}

/**
 * The draft, its errors, and the gestures that change them — the dialogue's state, kept apart from its
 * markup so each reads alone.
 *
 * **The draft is component state, not a slice**: one writer and one reader, both the dialogue — the
 * lightest sufficient tier. It is thrown away on close either way.
 */
function usePolityDraft(
  store: CartographerStoreHook,
  editing: YearPolity | null,
  onClose: () => void
) {
  // Store
  // The document is mutated in place, so the version is what changes; reading it re-renders the
  // dialogue when a polity is added or undone, which the suzerain list and the taken ids depend on.
  store((state) => state.version)

  // State
  const [draft, setDraft] = useState<PolityDraft>(() => openingOf(editing))
  const [errors, setErrors] = useState<Partial<Record<DraftField, string>>>({})

  // Derived
  const polities = store.getState().document.polities
  // Its own id is not "taken" by the polity being edited.
  const taken = new Set(polities.map((polity) => polity.id).filter((id) => id !== editing?.id))
  const suzerains = suzerainChoices(polities, editing?.id ?? null)
  const ranks = rankChoices(polities)

  // Handlers
  const close = () => {
    setDraft(openingOf(editing))
    setErrors({})
    onClose()
  }

  const onField = (field: PolityFormField, value: string | null) => {
    setDraft((current) => {
      if (field === 'name') return withName(current, value ?? '', taken)
      if (field === 'id') return withId(current, value ?? '')
      return { ...current, [field]: value }
    })
  }

  const onColour = (colour: HsvaColor | null) => {
    setDraft((current) => ({ ...current, colour }))
  }

  const onSubmit = () => {
    const reading = readDraft(draft, taken)
    if (!reading.ok) {
      setErrors(reading.errors)
      return
    }
    const refused = commit(store, reading.polity, editing !== null)
    if (refused === null) close()
    else setErrors(refused)
  }

  // Return
  return { draft, errors, suzerains, ranks, close, onField, onColour, onSubmit }
}

/**
 * The polity's dialogue — `[+ New polity]` (`s02`'s *"create a polity from nothing"*, *"validating the
 * form hands me the Pen"*) and *[Edit properties…]* (`s07`'s *"the same form as creation opens, filled
 * with its current values"*, the id kept). The binding of the shell/view/binding split: the only place
 * that knows there is a store.
 *
 * **A click on the backdrop does not close it**: the design system's own warning — a dialogue holding
 * typed work must not lose it to a stray click. Escape, Cancel and the cross do.
 * @param props - the store, the polity edited if any, and the open state the caller owns
 * @returns the dialogue
 */
export function PolityDialog({ store, editing, isOpen, onClose }: PolityDialogProps) {
  // State
  const { draft, errors, suzerains, ranks, close, onField, onColour, onSubmit } = usePolityDraft(
    store,
    editing,
    onClose
  )

  // Derived
  const title = editing === null ? 'New polity' : 'Edit polity'

  // Render
  return (
    <Modal isOpen={isOpen} onClose={close} onOverlayClick={ignoreOverlayClick} aria-label={title}>
      <PolityForm
        title={title}
        draft={draft}
        errors={errors}
        suzerains={suzerains}
        ranks={ranks}
        idLocked={editing !== null}
        onField={onField}
        onColour={onColour}
        onSubmit={onSubmit}
        onCancel={close}
      />
    </Modal>
  )
}
