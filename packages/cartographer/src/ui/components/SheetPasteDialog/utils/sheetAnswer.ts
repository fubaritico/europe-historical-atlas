import type { PasteActions } from '../../../../state/pasteActions'
import type { SheetPasteMessageKey } from '../i18n'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { CopiedSheet } from '@europe-historical-atlas/core/editor/clipboard'
import type { SheetField, SheetPasteRefusal } from '@europe-historical-atlas/core/editor/pasteSheet'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/** Each refusal of a sheet's paste, and the sentence that says it. */
const REFUSALS: Record<SheetPasteRefusal, SheetPasteMessageKey> = {
  'name-taken': 'nameTaken',
  homage: 'homage',
  'no-polity': 'noPolity',
}

/**
 * The status bar's sentence after a sheet's paste: what was taken, or why nothing was.
 * @param answer - what the paste answered
 * @param name - the polity pasted onto
 * @param count - how many fields were chosen
 * @param t - the dialogue's words
 * @returns the sentence
 */
export function sheetAnswer(
  answer: true | SheetPasteRefusal,
  name: string,
  count: number,
  t: Translate<SheetPasteMessageKey>
): string {
  return answer === true ? t('pasted', { name, count }) : t(REFUSALS[answer], { name })
}

/**
 * Paste the fields chosen, one step, and say it: what was taken, why nothing was, or that nothing was ticked.
 * @param view - the open dialogue's sheet and polity
 * @param view.copied - the sheet copied
 * @param view.polity - the polity of the map
 * @param fields - the fields ticked
 * @param pasteSheet - the store's paste
 * @param t - the dialogue's words
 * @returns the status bar's sentence
 */
export function pasteChosen(
  view: { copied: CopiedSheet; polity: YearPolity },
  fields: readonly SheetField[],
  pasteSheet: PasteActions['pasteSheet'],
  t: Translate<SheetPasteMessageKey>
): string {
  if (fields.length === 0) return t('nothingChosen')
  const name = view.polity.name
  const answer = pasteSheet(view.copied, view.polity.id, fields, {
    kind: 'paste-sheet',
    label: t('step', { name }),
  })
  if (answer !== true) console.warn(`[Cartographer] sheet paste refused: ${answer}.`)
  return sheetAnswer(answer, name, fields.length, t)
}
