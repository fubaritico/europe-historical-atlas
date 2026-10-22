import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { POLITY_MESSAGES } from '../i18n/polity'
import { TOOL_MESSAGES } from '../i18n/tools'

import { CANVAS_MESSAGES } from './i18n'

import type { CanvasMessageKey } from './i18n'
import type { PolityMessageKey } from '../i18n/polity'
import type { ToolMessageKey } from '../i18n/tools'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'
import type { Locale } from '@europe-historical-atlas/core/i18n/locale'

/**
 * Everything the canvas says, in the page's language (ATLAS-159): its own sentences, the tools' names (which
 * the rail shares) and a polity's vocabulary. **Injected** into the controller, never read from the page,
 * so a gesture's words can be tested in either language with a literal.
 */
export interface CanvasWords {
  /** The canvas's sentences. */
  t: Translate<CanvasMessageKey>
  /** The tools' and the Pen modes' names. */
  tools: Translate<ToolMessageKey>
  /** A polity's rank and status. */
  polity: Translate<PolityMessageKey>
  /** The page's language — how a distance is written (*12.3 km*, *12,3 km*). */
  locale: Locale
}

/**
 * The canvas's words in one language.
 * @param locale - the page's language
 * @returns the translators
 */
export function canvasWords(locale: Locale): CanvasWords {
  return {
    t: createTranslator(CANVAS_MESSAGES, locale),
    tools: createTranslator(TOOL_MESSAGES, locale),
    polity: createTranslator(POLITY_MESSAGES, locale),
    locale,
  }
}
