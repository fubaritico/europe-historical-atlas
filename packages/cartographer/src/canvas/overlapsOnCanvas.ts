import { lonLatToBackdrop } from '../viewport/projection'

import { createOverlapCache } from './overlapCache'

import type { CanvasWords } from './canvasWords'
import type { CanvasMessageKey } from './i18n'
import type { OverlapAnswer, OverlapCache } from './overlapCache'
import type { CartographerStoreHook } from '../state/store'
import type { BackdropFrame } from '../viewport/projection'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * The sentence the error dialogue shows when the geometry refused an overlap (CARTO-364) — the dev, 2026-11-06:
 * *« toujours le point de vue utilisateur »*: the polities by their names, what the author sees, what to do.
 *
 * A refusal is said once: the cache says a refused shape, pair or cut only when it fails on shapes it had not failed
 * on, so the next gesture elsewhere does not say it again; touching the outline computes it again, and says it again
 * if it still fails.
 * @param answer - the cache's answer for this version
 * @param document - the document, for the names
 * @param t - the canvas's words
 * @returns the sentence; `null` when nothing was refused
 */
export function refusalText(
  answer: OverlapAnswer,
  document: YearDocument,
  t: Translate<CanvasMessageKey>
): string | null {
  if (answer.refused.length === 0) return null
  // A refused id is one of the document's polities (the cache reads them from it): the id stands only for a polity
  // removed between the computation and this sentence, which a single repaint does not leave room for.
  const name = (id: string): string => document.polities.find((each) => each.id === id)?.name ?? id
  const pairs = answer.refused.map(({ a, b }) =>
    b === null ? name(a) : t('overlapPair', { a: name(a), b: name(b) })
  )
  return t('overlapRefused', { pairs: pairs.join(' ; ') })
}

/**
 * The overlaps to paint at the store's version, their refusals said once.
 * @param it - the attachment: its store, its words, its cache and the last answer said
 * @param it.deps - its collaborators
 * @param it.deps.store - the store holding the document
 * @param it.deps.words - the canvas's words
 * @param it.overlaps - the cache and the last answer said
 * @returns the pieces, in backdrop pixels
 */
export function overlapsToPaint(it: {
  deps: { store: CartographerStoreHook; words: () => CanvasWords }
  overlaps: CanvasOverlaps
}): OverlapAnswer['pieces'] {
  const { document, version } = it.deps.store.getState()
  const answer = it.overlaps.cache.overlapsOf(document, version)
  sayRefusals(it, answer)
  return answer.pieces
}

/**
 * Say the refusals of a version once: the console has had each one from the cache, the dialogue gets the sentence.
 * @param it - the attachment: its store, its words, and the last answer said
 * @param it.deps - its collaborators
 * @param it.deps.store - the store the error is raised on
 * @param it.deps.words - the canvas's words, in the page's language
 * @param it.overlaps - the last answer said, so one version's refusals are said once
 * @param it.overlaps.said
 * @param answer - the cache's answer for the version painted
 */
export function sayRefusals(
  it: {
    deps: { store: CartographerStoreHook; words: () => CanvasWords }
    overlaps: { said: OverlapAnswer | null }
  },
  answer: OverlapAnswer
): void {
  if (it.overlaps.said === answer) return
  it.overlaps.said = answer
  const state = it.deps.store.getState()
  const text = refusalText(answer, state.document, it.deps.words().t)
  if (text !== null) state.raiseError(text)
}

/** The overlaps of one canvas: the cache, and the last answer whose refusals were said. */
export interface CanvasOverlaps {
  /** Where the outlines overlap, recomputed only where a gesture moved something (CARTO-364). */
  cache: OverlapCache
  /** The last answer said, so one version's refusals are said once — `null` before the first paint. */
  said: OverlapAnswer | null
}

/**
 * The overlaps a canvas paints with: a cache over the backdrop's frame, its refusals said on the console.
 * @param frame - the backdrop's frame
 * @returns the cache, nothing said yet
 */
export function canvasOverlaps(frame: BackdropFrame): CanvasOverlaps {
  const cache = createOverlapCache(
    (lonLat) => lonLatToBackdrop(lonLat, frame),
    (message) => {
      console.error(message)
    }
  )
  return { cache, said: null }
}
