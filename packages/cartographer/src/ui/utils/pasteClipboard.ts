import { isPolityPasteRefusal } from '@europe-historical-atlas/core/editor/paste'
import { isStretchPasteRefusal } from '@europe-historical-atlas/core/editor/pasteStretch'

import { refusalReason } from '../../canvas/tools/retrace'

import { firstName } from './copySelection'

import type { ClipboardWords } from './copySelection'
import type { EditionActions } from '../../state/editionSlice'
import type {
  ClipboardContent,
  CopiedPolity,
  CopiedStretch,
} from '@europe-historical-atlas/core/editor/clipboard'
import type { PolityPasteRefusal, PolityPasted } from '@europe-historical-atlas/core/editor/paste'
import type {
  StretchPasteRefusal,
  StretchPasted,
} from '@europe-historical-atlas/core/editor/pasteStretch'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * ‹cmd+V› — Édition › Coller les entités (CARTO-345, `s22`): the polities the clipboard holds are pasted into the map
 * open, in place, welded to their neighbours at 2 km, in **one step** of the history; the last one pasted is
 * selected, and the status bar says what was done — or why nothing was.
 *
 * **A stretch on the clipboard is pasted onto the polity selected** (`s22` « # 2 »), one step: a whole outline as one
 * more ring of it, a part of an outline merged into its outline as ⟨retracer⟩ does — refused in ⟨retracer⟩'s words.
 */

/** What a paste needs: the clipboard, the map and its selection, the store's pastes, the status bar, the words. */
export interface PasteDeps {
  /** What the clipboard holds, or `null`. */
  content: ClipboardContent | null
  /** The map open — the polity selected is named from it. */
  document: YearDocument
  /** The polity selected, which a stretch is pasted onto, or `null`. */
  target: string | null
  /** The store's paste of polities, one recorded step. */
  pastePolities: EditionActions['pastePolities']
  /** The store's paste of a stretch, one recorded step. */
  pasteStretch: EditionActions['pasteStretch']
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
 * The sentence a refused stretch says.
 * @param refusal - why it was refused
 * @param name - the polity it was pasted onto
 * @param deps - the map, for ⟨retracer⟩'s words, and the words
 * @returns the sentence
 */
function stretchRefusal(
  refusal: StretchPasteRefusal,
  name: string,
  deps: Pick<PasteDeps, 'document' | 'words'>
): string {
  const { clipboard, canvas, paste } = deps.words
  switch (refusal.refused) {
    case 'no-polity':
      return clipboard('stretchNoTarget', { paste })
    case 'no-outline':
      return clipboard('stretchNoOutline', { name })
    case 'too-far':
      return clipboard('stretchTooFar', { name, km: Math.round(refusal.km * 10) / 10 })
    case 'same-end':
      return clipboard('stretchSameEnd', { name })
    case 'retrace':
      return clipboard('stretchRefused', {
        reason: refusalReason(refusal.why, deps.document, name, canvas),
      })
  }
}

/**
 * The sentence a pasted stretch says.
 * @param done - what was done
 * @param name - the polity it was pasted onto
 * @param deps - the map, for the neighbours' names, and the words
 * @returns the sentence
 */
function stretchSentence(
  done: StretchPasted,
  name: string,
  deps: Pick<PasteDeps, 'document' | 'words'>
): string {
  const { clipboard } = deps.words
  if (done.kind === 'ring') {
    return clipboard('pastedOutline', { name, count: done.points, welded: done.welded })
  }
  const names = done.neighbours.map((id) => {
    const neighbour = deps.document.polities.find((polity) => polity.id === id)
    // A ring's holder is a polity of the registry: the map is cross-checked when it opens.
    if (neighbour === undefined)
      throw new Error(`[Cartographer] the neighbour "${id}" is not in the map.`)
    return neighbour.name
  })
  const pasted = clipboard('pastedStretch', { name, count: done.points })
  return names.length === 0
    ? pasted
    : `${pasted} — ${clipboard('stretchFollowed', { names: names.join(', ') })}`
}

/**
 * Paste a stretch onto the polity selected, and say it.
 * @param stretch - the stretch the clipboard holds
 * @param deps - the map, its selection, the store's paste, the status bar, the words
 * @returns the polity it was pasted onto, alone — empty when nothing was pasted, which is said
 */
function pasteTheStretch(stretch: CopiedStretch, deps: PasteDeps): string[] {
  const { target, words } = deps
  const name = deps.document.polities.find((polity) => polity.id === target)?.name
  if (target === null || name === undefined) {
    console.warn('[Cartographer] paste refused: a stretch needs a polity selected.')
    deps.say(words.clipboard('stretchNoTarget', { paste: words.paste }))
    return []
  }
  const answer = deps.pasteStretch(stretch, target, {
    kind: 'paste-stretch',
    label: words.clipboard('pasteStretchStep', { name }),
  })
  if (isStretchPasteRefusal(answer)) {
    console.warn(`[Cartographer] stretch paste refused: ${answer.refused}.`)
    deps.say(stretchRefusal(answer, name, deps))
    return []
  }
  deps.say(stretchSentence(answer, name, deps))
  return [target]
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
  if (content.kind === 'stretch') return pasteTheStretch(content, deps)
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
