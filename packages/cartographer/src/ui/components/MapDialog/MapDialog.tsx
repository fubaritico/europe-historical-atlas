import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { useTranslation } from '../../hooks/useTranslation'

import { MAP_DIALOG_MESSAGES } from './i18n'
import { MapChooser } from './internal/MapChooser'

import type { MapChooserProps } from './internal/MapChooser'
import type { DialogueOpener } from '../../utils/dialogueOpener'

/**
 * *Open…* (`s19`, the dev, 2026-11-02: *"when I click Open, I should have as many maps as there are folders"*): every
 * map of `years/`, each but the open one a button. Choosing one asks first whether to save the map open, when it holds
 * changes (`SaveFirstDialog`), then the editor reloads on the map chosen, the view kept.
 *
 * **The content mounts only while the dialogue is open**, so each opening reads the list afresh — a map saved a minute
 * ago is in it. Its opener is a dialogue opener, one per dialogue (`ui/utils/dialogueOpener.ts`).
 */

/** What the dialogue needs: what its content needs, and the picker that opens and closes it. */
export interface MapDialogProps extends Omit<MapChooserProps, 'close'> {
  /** Whether it is open — the top bar's *Open…* opens it. */
  picker: DialogueOpener
}

/**
 * Render the dialogue, open while the picker is.
 * @param props - the picker, the source, the map open, what opening does
 * @param props.picker - says whether the dialogue is open and closes it; the rest goes to the chooser
 * @returns the dialogue
 */
export function MapDialog({ picker, ...chooser }: MapDialogProps) {
  // Context
  const t = useTranslation(MAP_DIALOG_MESSAGES)

  // State
  const open = useSyncExternalStore(picker.subscribe, picker.isOpen)

  // Render
  return (
    <Modal isOpen={open} onClose={picker.close} aria-label={t('title')}>
      <div className="short-dialogue short-dialogue--wide">
        {open ? <MapChooser {...chooser} close={picker.close} /> : null}
      </div>
    </Modal>
  )
}
