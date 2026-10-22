import { availableMoves } from '@europe-historical-atlas/core/editor/stacking'
import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { ACTION_MESSAGES } from '../i18n/actions'
import { ARRANGE_MESSAGES } from '../i18n/arrange'

import type { CartographerStore } from '../../state/store'
import type { ActionMessageKey } from '../i18n/actions'
import type { ArrangeMessageKey } from '../i18n/arrange'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'
import type { Locale } from '@europe-historical-atlas/core/i18n/locale'

/** Record a move as one step; `false` when the document refuses it — the store's `restackPolity`. */
export type Restack = CartographerStore['restackPolity']

/**
 * The words a stacking command speaks, in the page's language (ATLAS-159): the command's label from the
 * shared actions, the sentences from its own catalogue. Passed in, so this module stays out of React.
 */
export interface ArrangeWords {
  /** The page's language — the case of a label inside a sentence follows it. */
  locale: Locale
  /** The shared actions — the four commands' labels. */
  actions: Translate<ActionMessageKey>
  /** What a command says it did. */
  arrange: Translate<ArrangeMessageKey>
}

/**
 * The stacking commands' words in one language — built once here, for the keys at the root and the menu alike.
 * @param locale - the page's language
 * @returns the words
 */
export function arrangeWords(locale: Locale): ArrangeWords {
  return {
    locale,
    actions: createTranslator(ACTION_MESSAGES, locale),
    arrange: createTranslator(ARRANGE_MESSAGES, locale),
  }
}

/**
 * Move a polity in the stacking order as one step named as `s16` names it — *"bring to front — Duchy of
 * Normandy"* — and say what was done. The menu and the keys both go through here.
 * @param restack - the store's action
 * @param polity - the polity moved
 * @param move - the command
 * @param onResult - where to say what was done
 * @param words - the command's words, in the page's language
 * @returns `true` when the document moved it
 */
export function arrangePolity(
  restack: Restack,
  polity: Pick<YearPolity, 'id' | 'name'>,
  move: StackingMove,
  onResult: (message: string) => void,
  words: ArrangeWords
): boolean {
  const label = words.actions(move)
  const step = words.arrange('moved', {
    move: label.toLocaleLowerCase(words.locale),
    name: polity.name,
  })
  if (restack(polity.id, move, { kind: 'restack', label: step })) {
    onResult(words.arrange('moved', { move: label, name: polity.name }))
    return true
  }
  // Both callers offer only the moves that change something: a refusal here is a defect.
  console.error(`[Cartographer] the document refused the move "${move}" of ${polity.name}.`)
  return false
}

/**
 * Move the selected polity — the stacking keys' command. Nothing selected, or a polity already at the
 * end it is pushed toward: said in the result zone and the console, and nothing recorded.
 * @param state - the store's state, read when the key is pressed
 * @param move - the command
 * @param onResult - where to say what was done, or why nothing was
 * @param words - the command's words, in the page's language
 * @returns nothing
 */
export function arrangeSelected(
  state: Pick<CartographerStore, 'document' | 'target' | 'restackPolity'>,
  move: StackingMove,
  onResult: (message: string) => void,
  words: ArrangeWords
): void {
  const polity = state.document.polities.find((held) => held.id === state.target)
  const label = words.actions(move)
  if (polity === undefined) {
    console.warn(`[Cartographer] the move "${move}": no polity is selected.`)
    onResult(words.arrange('needsPolity', { move: label.toLocaleLowerCase(words.locale) }))
    return
  }
  if (!availableMoves(state.document, polity.id)[move]) {
    console.warn(`[Cartographer] the move "${move}" of ${polity.name}: already in place.`)
    onResult(words.arrange('alreadyInPlace', { move: label, name: polity.name }))
    return
  }
  arrangePolity(state.restackPolity, polity, move, onResult, words)
}
