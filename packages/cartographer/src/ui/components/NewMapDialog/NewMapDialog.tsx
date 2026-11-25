import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { useTranslation } from '../../hooks/useTranslation'

import { NEW_MAP_MESSAGES } from './i18n'
import { NewMapForm } from './internal/NewMapForm'

import type { NewMapFormProps } from './internal/NewMapForm'
import type { DialogueOpener } from '../../utils/dialogueOpener'

/**
 * « Nouvelle carte » (CARTO-536, the dev, 2026-11-25): a year and a name, then an empty map of that year on the relief,
 * written as a new folder of `years/`, and the Cartographer reloaded on it. A year or a name refused is said under its
 * field, and nothing is written.
 *
 * **The form mounts only while the dialogue is open**, so each opening starts with empty fields.
 */

/** What the dialogue needs: what its form needs, and the opener that opens and closes it. */
export interface NewMapDialogProps extends Omit<NewMapFormProps, 'close'> {
  /** Whether it is open — the start screen's button and Fichier › Nouvelle carte… open it. */
  picker: DialogueOpener
}

/**
 * Render the dialogue, open while the opener is.
 * @param props - the opener, and what the form needs
 * @param props.picker - says whether the dialogue is open and closes it; the rest goes to the form
 * @returns the dialogue
 */
export function NewMapDialog({ picker, ...form }: NewMapDialogProps) {
  // Context
  const t = useTranslation(NEW_MAP_MESSAGES)

  // State
  const open = useSyncExternalStore(picker.subscribe, picker.isOpen)

  // Render
  return (
    <Modal isOpen={open} onClose={picker.close} aria-label={t('title')}>
      <div className="short-dialogue">
        {open ? <NewMapForm {...form} close={picker.close} /> : null}
      </div>
    </Modal>
  )
}
