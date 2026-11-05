import { Modal } from '@fubaritico/react/Modal'
import { useEffect, useSyncExternalStore } from 'react'

import { useTranslation } from '../../hooks/useTranslation'

import { SHEET_PASTE_MESSAGES } from './i18n'
import { SheetChoice } from './internal/SheetChoice'
import { pasteChosen } from './utils/sheetAnswer'
import { sheetPasteView } from './utils/sheetPasteView'

import type { HeldClipboard } from '../../../state/heldClipboard'
import type { CartographerStoreHook } from '../../../state/store'
import type { SheetField } from '@europe-historical-atlas/core/editor/pasteSheet'

/**
 * « Coller la fiche… » (CARTO-345, `s22` « # 3 », the dev, 2026-11-05): the fields of the sheet on the clipboard —
 * copied alone with ‹shift+cmd+C› — onto the polity chosen, by ‹cmd+V›, Édition's paste or its menu in `{Polities}`.
 * Each field that differs is a line, ticked; the id is never offered, a suzerain the map lacks is shown and greyed.
 * One step of the history; the outline is untouched. Two sheets the same open nothing: the status bar says so.
 */

/** What the dialogue needs. */
export interface SheetPasteDialogProps {
  /** The store: which polity the dialogue is open for, the map, the paste. */
  store: CartographerStoreHook
  /** What the clipboard holds. */
  clipboard: HeldClipboard
  /** Say a sentence in the status bar's result zone. */
  say: (message: string) => void
}

/**
 * Render the sheet's paste, open while a polity is asked for and the clipboard holds a sheet.
 * @param props - the store, the clipboard and the status bar
 * @param props.store - the store
 * @param props.clipboard - what the clipboard holds
 * @param props.say - the status bar's result zone
 * @returns the dialogue
 */
export function SheetPasteDialog({ store, clipboard, say }: SheetPasteDialogProps) {
  // Store
  const target = store((state) => state.sheetPasteFor)
  store((state) => state.version)

  // Store actions
  const closeSheetPaste = store((state) => state.closeSheetPaste)
  const pasteSheet = store((state) => state.pasteSheet)

  // Context
  const t = useTranslation(SHEET_PASTE_MESSAGES)

  // State
  const content = useSyncExternalStore(clipboard.subscribe, clipboard.get)

  // Derived
  const view = sheetPasteView(store.getState().document, content, target)
  const same = view.open ? null : view.same
  const title = view.open
    ? t('title', { from: view.copied.polity.name, name: view.polity.name })
    : ''

  // Handlers
  const handlePaste = (fields: readonly SheetField[]): void => {
    closeSheetPaste()
    if (view.open) say(pasteChosen(view, fields, pasteSheet, t))
  }

  // Effects
  // Asked with nothing to show — the sheets the same, no sheet copied, the polity gone: said, and closed.
  useEffect(() => {
    if (target === null || view.open) return
    if (same === null)
      console.warn(`[Cartographer] the sheet's paste onto "${target}" has nothing to show.`)
    else say(t('same', same))
    closeSheetPaste()
  }, [target, view.open, same, say, t, closeSheetPaste])

  // Render
  return (
    <Modal isOpen={view.open} onClose={closeSheetPaste} aria-label={title}>
      <div className="short-dialogue short-dialogue--wide">
        {view.open ? (
          <SheetChoice
            key={view.polity.id}
            from={view.copied.polity.name}
            name={view.polity.name}
            map={view.copied.map}
            lines={view.lines}
            onPaste={handlePaste}
            onCancel={closeSheetPaste}
          />
        ) : null}
      </div>
    </Modal>
  )
}
