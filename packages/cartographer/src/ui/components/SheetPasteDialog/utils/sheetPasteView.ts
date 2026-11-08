import { sheetDifferences } from '@europe-historical-atlas/core/editor/pasteSheet'

import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { ClipboardContent, CopiedSheet } from '@europe-historical-atlas/core/editor/clipboard'
import type { SheetLine } from '@europe-historical-atlas/core/editor/pasteSheet'

/** What the sheet's paste shows, or why it shows nothing. */
export type SheetPasteView =
  /** Open: the sheet copied, the polity of the map, the fields that differ — one at least. */
  | { open: true; copied: CopiedSheet; polity: YearPolity; lines: readonly SheetLine[] }
  /** Asked, but the two sheets are the same: said in the status bar. */
  | { open: false; same: { from: string; name: string } }
  /** Not asked, or nothing to show it with — no sheet on the clipboard, the polity gone. */
  | { open: false; same: null }

/**
 * What the sheet's paste shows for a polity asked, with what the clipboard holds.
 * @param document - the map
 * @param content - what the clipboard holds
 * @param target - the polity asked for, or `null`
 * @returns the view
 */
export function sheetPasteView(
  document: YearDocument,
  content: ClipboardContent | null,
  target: string | null
): SheetPasteView {
  const copied = content?.kind === 'sheet' ? content : null
  const polity = document.polities.find((each) => each.id === target)
  if (copied === null || polity === undefined) return { open: false, same: null }
  const lines = sheetDifferences(document, copied, polity.id) ?? []
  if (lines.length === 0)
    return { open: false, same: { from: copied.polity.name, name: polity.name } }
  return { open: true, copied, polity, lines }
}
