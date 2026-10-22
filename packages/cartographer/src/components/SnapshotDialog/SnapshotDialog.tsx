import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { useTranslation } from '../../hooks/useTranslation'

import { SNAPSHOT_DIALOG_MESSAGES } from './i18n'
import { SnapshotChooser } from './internal/SnapshotChooser'

import type { SnapshotChooserProps } from './internal/SnapshotChooser'
import type { SnapshotPicker } from '../../utils/snapshotPicker'

/**
 * *Open snapshot* (CARTO-238, rung 2b): the year's kept snapshots, newest first, one to choose, and a warning
 * that says what happens — the page is replaced, and kept first, to be found in this same list. It says what is
 * possible, never where a file lies (the dev, 2026-10-18).
 *
 * **The content mounts only while the dialogue is open**, so each opening reads the list afresh — a snapshot
 * kept a minute ago is in it — and starts with nothing chosen, with no state to reset by hand.
 */

/** What the dialogue needs: what its content needs, and the picker that opens and closes it. */
export interface SnapshotDialogProps extends Omit<SnapshotChooserProps, 'close'> {
  /** Whether it is open — the top bar's button opens it. */
  picker: SnapshotPicker
}

/**
 * Render the dialogue, open while the picker is.
 * @param props - the picker, the source, the year, the clock, what opening does
 * @param props.picker - says whether the dialogue is open and closes it; the rest goes to the chooser
 * @returns the dialogue
 */
export function SnapshotDialog({ picker, ...chooser }: SnapshotDialogProps) {
  // Context
  const t = useTranslation(SNAPSHOT_DIALOG_MESSAGES)

  // State
  const open = useSyncExternalStore(picker.subscribe, picker.isOpen)

  // Render
  return (
    <Modal isOpen={open} onClose={picker.close} aria-label={t('title')}>
      <div className="draft-recovery">
        {open ? <SnapshotChooser {...chooser} close={picker.close} /> : null}
      </div>
    </Modal>
  )
}
