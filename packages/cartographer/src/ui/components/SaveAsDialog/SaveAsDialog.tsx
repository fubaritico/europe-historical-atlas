import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { useTranslation } from '../../hooks/useTranslation'

import { SAVE_AS_MESSAGES } from './i18n'
import { SaveAsForm } from './internal/SaveAsForm'

import type { SaveAsFormProps } from './internal/SaveAsForm'
import type { DialogueOpener } from '../../utils/dialogueOpener'

/**
 * *Save as…* (`s19`, the dev, 2026-11-02): a name, then the map open is saved, the page is written under that name, and
 * the author goes on working on the new map. A name refused — the map's own, one that cannot be a folder's, a year the
 * map is not, a map that exists — is said under the field, and nothing is written.
 *
 * **The form mounts only while the dialogue is open**, so each opening starts with an empty field.
 */

/** What the dialogue needs: what its form needs, and the opener that opens and closes it. */
export interface SaveAsDialogProps extends Omit<SaveAsFormProps, 'close'> {
  /** Whether it is open — the top bar's *Save as…* opens it. */
  picker: DialogueOpener
}

/**
 * Render the dialogue, open while the opener is.
 * @param props - the opener, and what the form needs
 * @param props.picker - says whether the dialogue is open and closes it; the rest goes to the form
 * @returns the dialogue
 */
export function SaveAsDialog({ picker, ...form }: SaveAsDialogProps) {
  // Context
  const t = useTranslation(SAVE_AS_MESSAGES)

  // State
  const open = useSyncExternalStore(picker.subscribe, picker.isOpen)

  // Render
  return (
    <Modal isOpen={open} onClose={picker.close} aria-label={t('title')}>
      <div className="short-dialogue">
        {open ? <SaveAsForm {...form} close={picker.close} /> : null}
      </div>
    </Modal>
  )
}
