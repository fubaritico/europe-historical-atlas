import { isPolityPasteRefusal } from '@europe-historical-atlas/core/editor/paste'

import { firstName } from './copySelection'

import type { ClipboardWords } from './copySelection'
import type { EditionActions } from '../../state/editionSlice'
import type { ClipboardContent, CopiedPolity } from '@europe-historical-atlas/core/editor/clipboard'
import type { PolityPasteRefusal, PolityPasted } from '@europe-historical-atlas/core/editor/paste'

/**
 * ‹cmd+V› — Édition › Coller les entités (CARTO-345, `s22`): the polities the clipboard holds are pasted into the map
 * open, in place, welded to their neighbours at 2 km, in **one step** of the history; the last one pasted is
 * selected, and the status bar says what was done — or why nothing was.
 *
 * **A stretch on the clipboard is not pasted yet**, said in the status bar: its paste is the next step of CARTO-345.
 */

/** What a paste needs: what the clipboard holds, the store's paste and selection, the status bar, the words. */
export interface PasteDeps {
  /** What the clipboard holds, or `null`. */
  content: ClipboardContent | null
  /** The store's paste, one recorded step. */
  pastePolities: EditionActions['pastePolities']
  /** Select a polity — the one pasted last. */
  chooseTarget: (polityId: string | null) => void
  /** Say a sentence in the status bar's result zone. */
  say: (message: string) => void
  /** The words. */
  words: ClipboardWords
}

/** A copied polity and what its paste answered. */
interface Answered {
  /** The copied polity. */
  copied: CopiedPolity
  /** What its paste answered. */
  answer: PolityPasted | PolityPasteRefusal
}

/** A copied polity whose paste was refused, and why. */
interface Refused {
  /** The copied polity. */
  copied: CopiedPolity
  /** Its refusal. */
  answer: PolityPasteRefusal
}

/**
 * The sentence a refused paste says.
 * @param refused - the copied polity and its refusal
 * @param refused.copied - the copied polity
 * @param refused.answer - its refusal
 * @param words - the words
 * @returns the sentence
 * @throws when a polity refused for its suzerain was copied without that suzerain's name — the clipboard's reader
 *   refuses such a copy, so this is a defect
 */
function refusalSentence({ copied, answer }: Refused, words: ClipboardWords): string {
  const name = copied.polity.name
  if (answer.refused === 'name-taken') return words.clipboard('nameTaken', { name })
  if (copied.suzerainName === null) {
    throw new Error(`[Cartographer] "${name}" was refused for a suzerain it was copied without.`)
  }
  return words.clipboard('homageTooDeep', { name, suzerain: copied.suzerainName })
}

/**
 * Split the answers into the polities pasted and those refused.
 * @param answered - each copied polity and its answer
 * @returns the two lists, in the copy's order
 */
function split(answered: readonly Answered[]): {
  pasted: { copied: CopiedPolity; answer: PolityPasted }[]
  refused: Refused[]
} {
  const pasted: { copied: CopiedPolity; answer: PolityPasted }[] = []
  const refused: Refused[] = []
  for (const { copied, answer } of answered) {
    if (isPolityPasteRefusal(answer)) refused.push({ copied, answer })
    else pasted.push({ copied, answer })
  }
  return { pasted, refused }
}

/**
 * The sentence a paste says: what was pasted, how much was welded, a suzerain left behind, a polity refused.
 * @param map - the map they came from
 * @param answered - each copied polity and its answer, one pasted at least
 * @param words - the words
 * @returns the sentence
 */
function pastedSentence(map: string, answered: readonly Answered[], words: ClipboardWords): string {
  const { pasted, refused } = split(answered)
  return [
    words.clipboard('pasted', {
      polities: pasted.length,
      name: firstName(pasted.map(({ copied }) => copied)),
      map,
      count: pasted.reduce((sum, { answer }) => sum + answer.points, 0),
      welded: pasted.reduce((sum, { answer }) => sum + answer.welded, 0),
    }),
    ...pasted.flatMap(({ answer }) =>
      answer.sovereignWithout === null
        ? []
        : [words.clipboard('pastedSovereign', { suzerain: answer.sovereignWithout })]
    ),
    ...refused.map((each) => refusalSentence(each, words)),
  ].join(' · ')
}

/**
 * Paste what the clipboard holds into the map open, select what was pasted, and say it.
 * @param deps - the clipboard, the store's paste and selection, the status bar, the words
 * @returns the polities pasted, by their id in the map — empty when nothing was, which is said
 */
export function pasteClipboard(deps: PasteDeps): string[] {
  const { content, words } = deps
  if (content === null) {
    console.warn('[Cartographer] paste refused: the clipboard is empty.')
    deps.say(words.clipboard('nothingToPaste'))
    return []
  }
  if (content.kind === 'stretch') {
    console.warn('[Cartographer] paste refused: pasting a stretch is not built yet.')
    deps.say(words.clipboard('stretchNotYet'))
    return []
  }
  const answers = deps.pastePolities(content.polities, {
    kind: 'paste-polities',
    label: words.clipboard('pasteStep', {
      count: content.polities.length,
      name: firstName(content.polities),
    }),
  })
  const answered = content.polities.map((polity, at): Answered => {
    const answer = answers[at]
    if (answer === undefined) {
      throw new Error(`[Cartographer] the paste of "${polity.polity.name}" gave no answer.`)
    }
    return { copied: polity, answer }
  })
  const { pasted, refused } = split(answered)
  const last = pasted.at(-1)
  if (last === undefined) {
    console.warn(
      `[Cartographer] paste refused: ${refused.map(({ answer }) => answer.refused).join(', ')}.`
    )
    deps.say(refused.map((each) => refusalSentence(each, words)).join(' · '))
    return []
  }
  deps.chooseTarget(last.answer.id)
  deps.say(pastedSentence(content.map, answered, words))
  return pasted.map(({ answer }) => answer.id)
}
