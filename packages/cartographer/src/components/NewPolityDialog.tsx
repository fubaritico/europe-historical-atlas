import { Modal } from '@fubaritico/react/Modal'
import { useState } from 'react'

import { DRAFT_ERRORS, EMPTY_DRAFT, readDraft, withId, withName } from './polityDraft'
import { PolityForm } from './PolityForm'

import type { DraftField, PolityDraft } from './polityDraft'
import type { PolityFormField } from './PolityForm'
import type { CartographerStoreHook } from '../state/store'

/** What the dialogue needs from its caller. */
export interface NewPolityDialogProps {
  /** The store the polity is created in and the Pen aimed through. */
  store: CartographerStoreHook
  /** Whether the dialogue is shown. The caller owns it — the design system's Modal is controlled. */
  isOpen: boolean
  /** Called once the dialogue is done, created or cancelled. */
  onClose: () => void
}

/** The dialogue's title, and the accessible name the Modal requires. */
const TITLE = 'New polity'

/**
 * The draft, its errors, and the two gestures that change them — the dialogue's state, kept apart from its
 * markup so each reads alone.
 *
 * **The draft is component state, not a slice**: one writer and one reader, both the dialogue — the
 * lightest sufficient tier. It is thrown away on close either way.
 */
function usePolityDraft(store: CartographerStoreHook, onClose: () => void) {
  const [draft, setDraft] = useState<PolityDraft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<Partial<Record<DraftField, string>>>({})
  // The document is mutated in place, so the version is what changes; reading it re-renders the
  // dialogue when a polity is added or undone, which the suzerain list and the taken ids depend on.
  store((state) => state.version)
  const polities = store.getState().document.polities
  const taken = new Set(polities.map((polity) => polity.id))

  const close = () => {
    setDraft(EMPTY_DRAFT)
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

  // OK creates, then aims — in that order and only on success. `createPolity` refuses an id the year
  // already holds by returning `false`; the form checked first, and this second line stays because the
  // document is the authority, not the form's copy of its ids.
  const onSubmit = () => {
    const reading = readDraft(draft, taken)
    if (!reading.ok) {
      setErrors(reading.errors)
      return
    }
    const { createPolity, aimAt } = store.getState()
    const step = { kind: 'create-polity', label: `create ${reading.polity.name}` }
    if (!createPolity(reading.polity, step)) {
      setErrors({ id: DRAFT_ERRORS.idTaken })
      return
    }
    aimAt(reading.polity.id)
    close()
  }

  return { draft, errors, polities, close, onField, onSubmit }
}

/**
 * `[+ New polity]`'s dialogue — `s02`'s *"create a polity from nothing"* and *"validating the form hands
 * me the Pen"*. The binding of the shell/view/binding split: the only place that knows there is a store.
 *
 * **A click on the backdrop does not close it**: the design system's own warning — a dialogue holding
 * typed work must not lose it to a stray click. Escape, Cancel and the cross do.
 * @param props - the store, and the open state the caller owns
 * @returns the dialogue
 */
export function NewPolityDialog({ store, isOpen, onClose }: NewPolityDialogProps) {
  const { draft, errors, polities, close, onField, onSubmit } = usePolityDraft(store, onClose)
  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      onOverlayClick={() => {
        // Deliberately nothing — see the header.
      }}
      aria-label={TITLE}
    >
      <PolityForm
        title={TITLE}
        draft={draft}
        errors={errors}
        suzerains={polities.map((polity) => ({ value: polity.id, label: polity.name }))}
        onField={onField}
        onSubmit={onSubmit}
        onCancel={close}
      />
    </Modal>
  )
}
