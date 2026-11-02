import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link PANEL_FRAME_MESSAGES}.
 *
 * Its messages, and the values they take:
 * - `resizeDock` — The name of the column's edge, which widens or narrows it.
 */
export type PanelFrameMessageKey = keyof typeof en

/** {@link PanelFrameMessageKey}, in French and English, one JSON per language. */
export const PANEL_FRAME_MESSAGES: Catalogue<PanelFrameMessageKey> = { fr, en }
