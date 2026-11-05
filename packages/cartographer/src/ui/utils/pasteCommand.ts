import type { HeldSummary } from '../../state/clipboardSlice'
import type { ActionMessageKey } from '../i18n/actions'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * The one paste command, named after what the clipboard holds (the dev, 2026-11-05: *"the Edit menu adapts to what is
 * on the clipboard"*) — Édition's and a polity's menu's alike, under ‹cmd+V›: « Coller les entités », « Coller les
 * points », « Coller la fiche… », « Coller » greyed when it holds nothing. Short, no name (the dev, same night:
 * *"your labels are ten times too long"*).
 */

/** The paste command as a menu shows it. */
export interface PasteCommand {
  /** Its name. */
  label: string
  /** Whether it can act. */
  enabled: boolean
}

/**
 * The paste command for what the clipboard holds, onto a polity.
 * @param held - what the clipboard holds, or `null`
 * @param onto - the polity a paste of points or of a sheet goes onto — its name — or `null` when none is selected,
 *   which greys it
 * @param action - the shared actions' labels
 * @returns the command
 */
export function pasteCommand(
  held: HeldSummary | null,
  onto: string | null,
  action: Translate<ActionMessageKey>
): PasteCommand {
  if (held === null) return { label: action('paste'), enabled: false }
  if (held.kind === 'polities') return { label: action('pastePolities'), enabled: true }
  return {
    label: action(held.kind === 'points' ? 'pastePoints' : 'pasteSheet'),
    enabled: onto !== null,
  }
}
