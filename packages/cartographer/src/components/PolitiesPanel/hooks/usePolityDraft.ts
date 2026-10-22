import { useState } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import {
  EMPTY_DRAFT,
  draftOf,
  rankChoices,
  readDraft,
  suzerainChoices,
  withId,
  withName,
} from '../../../utils/polityDraft'
import { POLITIES_PANEL_MESSAGES } from '../i18n'

import type { CartographerStoreHook } from '../../../state/store'
import type { DraftError, DraftField, PolityDraft } from '../../../utils/polityDraft'
import type { PolityFormField } from '../../PolityForm'
import type { PolitiesPanelMessageKey } from '../i18n'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'
import type { HsvaColor } from '@fubaritico/behaviors'

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
 * @param t - the panel's messages, for the history's name of the step
 * @returns the error to show beside a field, or `null` when the document took it
 */
function commit(
  store: CartographerStoreHook,
  polity: YearPolity,
  editing: boolean,
  t: Translate<PolitiesPanelMessageKey>
): Partial<Record<DraftField, DraftError>> | null {
  const { createPolity, editPolity, aimAt, target } = store.getState()
  if (editing) {
    // The suzerain list offers no loop and no chain too deep: a refusal here is a defect, said loudly.
    if (editPolity(polity, { kind: 'edit-polity', label: t('editStep', { name: polity.name }) }))
      return null
    console.error(`[Cartographer] the document refused the change to "${polity.id}".`)
    return {}
  }
  if (
    !createPolity(
      polity,
      { kind: 'create-polity', label: t('createStep', { name: polity.name }) },
      target
    )
  ) {
    // The form checked the id against its copy; the document holding it is the expected refusal.
    if (store.getState().document.polities.some((existing) => existing.id === polity.id))
      return { id: 'idTaken' }
    // Any other refusal — a loop, a chain too deep — the suzerain list does not offer: a defect.
    console.error(`[Cartographer] the document refused to create "${polity.id}".`)
    return {}
  }
  aimAt(polity.id)
  return null
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
 * @param store - the store the polity is created in or updated through
 * @param editing - the polity edited, or `null` when creating one
 * @param onClose - close the dialogue, after a commit or on cancel
 * @returns the draft and its errors, the suzerains and ranks to choose from, and the gestures: close, a field
 *   changed, the colour changed, submit
 */
export function usePolityDraft(
  store: CartographerStoreHook,
  editing: YearPolity | null,
  onClose: () => void
) {
  // Store
  // The document is mutated in place, so the version is what changes; reading it re-renders the
  // dialogue when a polity is added or undone, which the suzerain list and the taken ids depend on.
  store((state) => state.version)

  // Context
  const t = useTranslation(POLITIES_PANEL_MESSAGES)

  // State
  const [draft, setDraft] = useState<PolityDraft>(() => openingOf(editing))
  const [errors, setErrors] = useState<Partial<Record<DraftField, DraftError>>>({})

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
    const refused = commit(store, reading.polity, editing !== null, t)
    if (refused === null) close()
    else setErrors(refused)
  }

  // Return
  return { draft, errors, suzerains, ranks, close, onField, onColour, onSubmit }
}
