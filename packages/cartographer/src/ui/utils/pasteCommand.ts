import type { HeldSummary } from '../../state/clipboardSlice'
import type { ActionMessageKey } from '../i18n/actions'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * The one paste command, named after what the clipboard holds (the dev, 2026-11-05: *"the Edit menu adapts to what is
 * on the clipboard"*) — Édition's and a polity's menu's alike, under ‹cmd+V›: « Coller les entités », « Coller les
 * points de Venise sur Venise », « Coller la fiche de Venise sur Venise… », « Coller » greyed when it holds nothing.
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
 * @param onto - the polity a paste of points or of a sheet goes onto — its name — or `null` when none is selected
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
  const name = onto ?? action('theSelection')
  const key = held.kind === 'points' ? 'pastePoints' : 'pasteSheet'
  return { label: action(key, { from: held.polity, name }), enabled: onto !== null }
}
