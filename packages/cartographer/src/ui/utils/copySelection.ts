import { copyPoints, copyPolities, copySheet } from '@europe-historical-atlas/core/editor/clipboard'
import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { CANVAS_MESSAGES } from '../../canvas/i18n'
import { CLIPBOARD_MESSAGES } from '../i18n/clipboard'

import type { CanvasMessageKey } from '../../canvas/i18n'
import type { ClipboardMessageKey } from '../i18n/clipboard'
import type { ClipboardContent, CopiedPolity } from '@europe-historical-atlas/core/editor/clipboard'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'
import type { Locale } from '@europe-historical-atlas/core/i18n/locale'

/**
 * ‹cmd+C› — Édition › Copier (CARTO-345, `files/plans/cartographer/copy-paste-between-maps.md`): **one copies what one
 * selected**. Points selected with the white arrow, two or more, are copied whatever they make (the dev, 2026-11-05,
 * `open-outlines.md`); otherwise the polity selected is copied whole, sheet and outline. Nothing in the map changes,
 * and the history gains no step.
 */

/** What a copy reads of the store: the map, the polity selected, the anchors selected. */
export interface CopySelection {
  /** The map open. */
  document: YearDocument
  /** The polity selected, or `null` — it may name one the document no longer holds (an undo). */
  target: string | null
  /** The anchors the white arrow has selected. */
  selectedAnchors: readonly number[]
}

/** The words copying speaks, in the page's language. */
export interface ClipboardWords {
  /** The sentences. */
  clipboard: Translate<ClipboardMessageKey>
  /** The paste shortcut, as the system writes it — ⌘V, or Ctrl+V. */
  paste: string
  /** The canvas's sentences — ⟨retracer⟩'s refusals, which a paste of points says in its words. */
  canvas: Translate<CanvasMessageKey>
}

/**
 * The words in one language.
 * @param locale - the page's language
 * @param paste - the paste shortcut as the system writes it
 * @returns the words
 */
export function clipboardWords(locale: Locale, paste: string): ClipboardWords {
  return {
    clipboard: createTranslator(CLIPBOARD_MESSAGES, locale),
    paste,
    canvas: createTranslator(CANVAS_MESSAGES, locale),
  }
}

/** Where a copy goes and is said — injected, so a test hands in a map and a list of sentences. */
export interface CopyDeps {
  /** The map's name, said with what was copied. */
  map: string
  /** Keep the copy in the tab; `false` when the storage refused it. */
  keep: (content: ClipboardContent) => boolean
  /** Say a sentence in the status bar's result zone. */
  say: (message: string) => void
  /** The words. */
  words: ClipboardWords
}

/**
 * The first copied polity's name — the one a sentence names when one was copied or pasted.
 * @param polities - polities copied
 * @returns its name
 * @throws when there is none, which a copy's schema forbids
 */
export function firstName(polities: readonly CopiedPolity[]): string {
  const first = polities[0]
  if (first === undefined) throw new Error('[Cartographer] a copy of polities holds none.')
  return first.polity.name
}

/**
 * The sentence a copy says: what it holds, and how to paste it.
 * @param content - what was copied
 * @param words - the words
 * @returns the sentence
 */
export function copiedSentence(content: ClipboardContent, words: ClipboardWords): string {
  if (content.kind === 'sheet') {
    return words.clipboard('copiedSheet', {
      name: content.polity.name,
      map: content.map,
      paste: words.paste,
    })
  }
  if (content.kind === 'points') {
    return words.clipboard('copiedPoints', {
      name: content.polity,
      count: content.pieces.reduce((sum, piece) => sum + piece.points.length, 0),
      map: content.map,
      paste: words.paste,
    })
  }
  return words.clipboard('copiedPolities', {
    count: content.polities.length,
    name: firstName(content.polities),
    map: content.map,
    paste: words.paste,
  })
}

/**
 * The sentence an opened map says when the clipboard holds something — so the author sees what ‹cmd+V› will paste.
 * @param content - what the clipboard holds
 * @param words - the words
 * @returns the sentence
 */
export function heldSentence(content: ClipboardContent, words: ClipboardWords): string {
  if (content.kind === 'points') {
    return words.clipboard('heldPoints', { name: content.polity, map: content.map })
  }
  if (content.kind === 'sheet') {
    return words.clipboard('heldSheet', { name: content.polity.name, map: content.map })
  }
  return words.clipboard('heldPolities', {
    count: content.polities.length,
    name: firstName(content.polities),
    map: content.map,
  })
}

/** What the selection copies, and the points it left out alone. */
interface CopyOf {
  /** The copy, or the message saying why there is none. */
  copy: ClipboardContent | ClipboardMessageKey
  /** Points selected left out: none of their neighbours along an outline was selected. */
  alone: number
}

/**
 * What the selection copies: the points when two or more are selected, otherwise the polity selected.
 * @param selection - the map and what is selected
 * @param map - the map's name
 * @returns the copy, or the message saying why there is none, and the points left out
 */
function copyOf(selection: CopySelection, map: string): CopyOf {
  const { document, target, selectedAnchors } = selection
  if (selectedAnchors.length >= 2) {
    const points = copyPoints(document, selectedAnchors, map, target)
    return { copy: points.copy ?? 'pointsAlone', alone: points.alone }
  }
  const polities = target === null ? null : copyPolities(document, [target], map)
  return { copy: polities ?? 'nothingSelected', alone: 0 }
}

/**
 * Copy what is selected, keep it in the tab, and say it.
 * @param selection - the map and what is selected
 * @param deps - the map's name, the keeper, the status bar, the words
 * @returns what was copied, or `null` when nothing was — said, either way
 */
export function copySelection(selection: CopySelection, deps: CopyDeps): ClipboardContent | null {
  const { copy, alone } = copyOf(selection, deps.map)
  if (typeof copy === 'string') {
    console.warn(`[Cartographer] copy refused: ${copy}.`)
    deps.say(deps.words.clipboard(copy))
    return null
  }
  if (!deps.keep(copy)) {
    deps.say(deps.words.clipboard('notKept'))
    return null
  }
  if (alone > 0) console.warn(`[Cartographer] copy left ${String(alone)} points out, alone.`)
  const left = alone > 0 ? [deps.words.clipboard('copiedAlone', { count: alone })] : []
  deps.say([copiedSentence(copy, deps.words), ...left].join(' · '))
  return copy
}

/**
 * ‹shift+cmd+C› — « Copier la fiche » (the dev, 2026-11-05): the polity selected's sheet alone, its outline left
 * behind, kept in the tab and said.
 * @param selection - the map and the polity selected
 * @param deps - the map's name, the keeper, the status bar, the words
 * @returns what was copied, or `null` when nothing was — said, either way
 */
export function copySheetOfSelection(
  selection: Pick<CopySelection, 'document' | 'target'>,
  deps: CopyDeps
): ClipboardContent | null {
  const copy =
    selection.target === null ? null : copySheet(selection.document, selection.target, deps.map)
  if (copy === null) {
    console.warn('[Cartographer] sheet copy refused: no polity selected.')
    deps.say(deps.words.clipboard('nothingSelected'))
    return null
  }
  if (!deps.keep(copy)) {
    deps.say(deps.words.clipboard('notKept'))
    return null
  }
  deps.say(copiedSentence(copy, deps.words))
  return copy
}
