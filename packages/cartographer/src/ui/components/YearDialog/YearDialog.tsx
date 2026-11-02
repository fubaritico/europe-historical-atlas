import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { useTranslation } from '../../hooks/useTranslation'

import { YEAR_DIALOG_MESSAGES } from './i18n'
import { YearChooser } from './internal/YearChooser'

import type { YearChooserProps } from './internal/YearChooser'
import type { DialogueOpener } from '../../utils/dialogueOpener'

/**
 * *Open…* (the dev, 2026-11-02: « on fait Open, 1100, 1200 »): the years saved, each but the open one a button, and a
 * warning that says what happens — the editor reloads on the year, the page kept first as a snapshot. It says what is
 * possible, never where a file lies.
 *
 * **The content mounts only while the dialogue is open**, so each opening reads the list afresh — a year saved a minute
 * ago is in it. Its opener is a dialogue opener, one per dialogue (`ui/utils/dialogueOpener.ts`).
 */

/** What the dialogue needs: what its content needs, and the picker that opens and closes it. */
export interface YearDialogProps extends Omit<YearChooserProps, 'close'> {
  /** Whether it is open — the top bar's *Open…* opens it. */
  picker: DialogueOpener
}

/**
 * Render the dialogue, open while the picker is.
 * @param props - the picker, the source, the year open, what opening does
 * @param props.picker - says whether the dialogue is open and closes it; the rest goes to the chooser
 * @returns the dialogue
 */
export function YearDialog({ picker, ...chooser }: YearDialogProps) {
  // Context
  const t = useTranslation(YEAR_DIALOG_MESSAGES)

  // State
  const open = useSyncExternalStore(picker.subscribe, picker.isOpen)

  // Render
  return (
    <Modal isOpen={open} onClose={picker.close} aria-label={t('title')}>
      <div className="short-dialogue">
        {open ? <YearChooser {...chooser} close={picker.close} /> : null}
      </div>
    </Modal>
  )
}
