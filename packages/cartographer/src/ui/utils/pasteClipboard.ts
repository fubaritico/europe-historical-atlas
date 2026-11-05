import { isPolityPasteRefusal } from '@europe-historical-atlas/core/editor/paste'
import { isPointsPasteRefusal } from '@europe-historical-atlas/core/editor/pastePoints'

import { refusalReason } from '../../canvas/tools/retrace'

import { firstName } from './copySelection'

import type { ClipboardWords } from './copySelection'
import type { EditionActions } from '../../state/editionSlice'
import type { Carving, CarvingHeld } from '@europe-historical-atlas/core/editor/carve'
import type {
  ClipboardContent,
  CopiedPoints,
  CopiedPolity,
} from '@europe-historical-atlas/core/editor/clipboard'
import type { PolityPasteRefusal, PolityPasted } from '@europe-historical-atlas/core/editor/paste'
import type { PointsPasted } from '@europe-historical-atlas/core/editor/pastePoints'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * ‹cmd+V› — Édition › Coller les entités (CARTO-345, `s22`): the polities the clipboard holds are pasted into the map
 * open, in place, welded to their neighbours at 2 km, in **one step** of the history; the last one pasted is
 * selected, and the status bar says what was done — or why nothing was.
 *
 * **Points on the clipboard are pasted onto the polity selected** (`open-outlines.md`), one step: each whole outline
 * added, each piece merged into its outline by the nearest points or left open when nothing is drawn — a piece
 * ⟨retracer⟩ refuses is named in its words.
 */

/** What a paste needs: the clipboard, the map and its selection, the store's pastes, the status bar, the words. */
export interface PasteDeps {
  /** What the clipboard holds, or `null`. */
  content: ClipboardContent | null
  /** The map open — the polity selected is named from it. */
  document: YearDocument
  /** The polity selected, which points are pasted onto, or `null`. */
  target: string | null
  /** The store's paste of polities, one recorded step. */
  pastePolities: EditionActions['pastePolities']
  /** The store's paste of points, one recorded step. */
  pastePoints: EditionActions['pastePoints']
  /** Select a polity — the one pasted last. */
  chooseTarget: (polityId: string | null) => void
  /** Raise a warning in the warning dialogue — a vassal refused over a suzerain still open (the dev, 2026-11-05). */
  raiseWarning: (text: string) => void
  /** Open the sheet's paste dialogue onto a polity — what ‹cmd+V› does with a sheet on the clipboard. */
  askSheetPaste: (polityId: string) => void
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
 * The names of the neighbours whose outline took a piece too.
 * @param ids - their ids
 * @param document - the map
 * @returns their names
 * @throws when an id names no polity of the map — a ring's holder is a polity of the registry, the map cross-checked
 */
function neighbourNames(ids: readonly string[], document: YearDocument): string[] {
  return ids.map((id) => {
    const neighbour = document.polities.find((polity) => polity.id === id)
    if (neighbour === undefined) {
      throw new Error(`[Cartographer] the neighbour "${id}" is not in the map.`)
    }
    return neighbour.name
  })
}

/**
 * The sentence a paste of points says: how many points, the outlines added, the pieces merged or left open, the
 * neighbours that followed, and every piece left out in ⟨retracer⟩'s words.
 * @param done - what was done
 * @param name - the polity it was pasted onto
 * @param deps - the map, for the neighbours' names and ⟨retracer⟩'s words, and the words
 * @returns the sentence
 */
function pointsSentence(
  done: PointsPasted,
  name: string,
  deps: Pick<PasteDeps, 'document' | 'words'>
): string {
  const { clipboard, canvas } = deps.words
  const put = done.outlines + done.open + done.merged > 0
  const head = put
    ? clipboard('pastedPoints', { name, count: done.points, welded: done.welded })
    : clipboard('nothingPasted', { name })
  const counts = [
    ...(done.outlines > 0 ? [clipboard('pastedOutlines', { count: done.outlines })] : []),
    ...(done.merged > 0 ? [clipboard('pastedMerged', { count: done.merged })] : []),
    ...(done.open > 0 ? [clipboard('pastedOpen', { count: done.open })] : []),
  ]
  const names = neighbourNames(done.neighbours, deps.document)
  const followed = names.length > 0 ? [clipboard('followed', { names: names.join(', ') })] : []
  const leftOut = done.leftOut.flatMap((why) =>
    why.kind === 'suzerain-open'
      ? []
      : [clipboard('pieceLeftOut', { reason: refusalReason(why, deps.document, name, canvas) })]
  )
  return [[head, ...counts].join(' — '), ...followed, ...leftOut].join(' · ')
}

/**
 * What a piece that closed a vassal's open outline did to its suzerain: carved, said in the status bar; held back,
 * its outline open, said in the warning dialogue (the dev, 2026-11-05) — as the Pen's closing says it.
 * @param carving - what the carving answered
 * @param name - the vassal's name
 * @param deps - the map, the words and the dialogue
 * @returns the status bar's sentence, or none when the dialogue says it
 */
function carvingSentence(
  carving: Carving | CarvingHeld,
  name: string,
  deps: Pick<PasteDeps, 'document' | 'words' | 'raiseWarning'>
): string[] {
  const suzerain = neighbourNames([carving.suzerain], deps.document).join('')
  if ('held' in carving) {
    console.warn(`[Cartographer] "${carving.suzerain}" was not carved: its outline is open.`)
    deps.raiseWarning(deps.words.canvas('carveHeld', { name, suzerain }))
    return []
  }
  return [deps.words.canvas('carved', { name: suzerain, crossings: carving.crossings })]
}

/**
 * Paste points onto the polity selected, and say it.
 * @param copied - the points the clipboard holds
 * @param deps - the map, its selection, the store's paste, the status bar, the words
 * @returns the polity they were pasted onto, alone — empty when nothing was put down, which is said
 */
function pasteThePoints(copied: CopiedPoints, deps: PasteDeps): string[] {
  const { target, words } = deps
  const name = deps.document.polities.find((polity) => polity.id === target)?.name
  if (target === null || name === undefined) {
    console.warn('[Cartographer] paste refused: points need a polity selected.')
    deps.say(words.clipboard('pointsNoTarget', { paste: words.paste }))
    return []
  }
  const answer = deps.pastePoints(copied, target, {
    kind: 'paste-points',
    label: words.clipboard('pastePointsStep', { name }),
  })
  if (isPointsPasteRefusal(answer)) {
    console.warn(`[Cartographer] points paste refused: ${answer.refused}.`)
    deps.say(words.clipboard('pointsNoTarget', { paste: words.paste }))
    return []
  }
  // A piece that would have closed a vassal over a suzerain still open is said in the warning dialogue (2026-11-05).
  for (const why of answer.leftOut) {
    if (why.kind !== 'suzerain-open') continue
    const suzerain = neighbourNames([why.suzerain], deps.document).join('')
    deps.raiseWarning(words.canvas('pasteOverOpenSuzerain', { name, suzerain }))
  }
  if (answer.leftOut.length > 0) {
    console.warn(
      `[Cartographer] paste left out ${String(answer.leftOut.length)} pieces: ${answer.leftOut.map((why) => why.kind).join(', ')}.`
    )
  }
  const carved = answer.carved.flatMap((carving) => carvingSentence(carving, name, deps))
  deps.say([pointsSentence(answer, name, deps), ...carved].join(' · '))
  return answer.outlines + answer.open + answer.merged > 0 ? [target] : []
}

/**
 * A sheet on the clipboard: its dialogue onto the polity selected, field by field (`s22` « # 3 ») — or, with none
 * selected, the status bar says which to select.
 * @param deps - the map's selection, the dialogue, the status bar, the words
 * @returns nothing pasted yet — the dialogue does it
 */
function pasteTheSheet(deps: PasteDeps): string[] {
  const { target, words } = deps
  if (target === null || !deps.document.polities.some((polity) => polity.id === target)) {
    console.warn('[Cartographer] sheet paste refused: no polity selected.')
    deps.say(words.clipboard('sheetNoTarget', { paste: words.paste }))
    return []
  }
  deps.askSheetPaste(target)
  return []
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
  if (content.kind === 'points') return pasteThePoints(content, deps)
  if (content.kind === 'sheet') return pasteTheSheet(deps)
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
