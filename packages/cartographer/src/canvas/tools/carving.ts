import { openSuzerainOf } from '@europe-historical-atlas/core/editor/carve'

import { TAG } from './consoleTag'
import { clearOutline } from './toolSession'

import type { CanvasWords } from '../canvasWords'
import type { CanvasMessageKey } from '../i18n'
import type { LayerHitContext } from './layerHits'
import type { ToolSession } from './toolSession'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { Carving, CarvingHeld } from '@europe-historical-atlas/core/editor/carve'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * What the status bar says of a carving (`s08`, 2026-10-15) — *"carved out of Kingdom of France's own
 * domain, 2 anchors placed where the limits cross"*.
 * @param polities - the year's polities, for the suzerain's name
 * @param carving - what the carving did
 * @param t - the canvas's messages
 * @returns the sentence
 */
export function carvedReport(
  polities: readonly YearPolity[],
  carving: Carving,
  t: Translate<CanvasMessageKey>
): string {
  // The suzerain comes from a vassal's `suzerain` field, which the readers check against the registry:
  // the id is shown only if that check was bypassed, and showing it beats showing nothing.
  const nameOf = (id: string): string => polities.find((polity) => polity.id === id)?.name ?? id
  // Closed in front (‹alt›): whose ground the outline took, every one of them.
  if (carving.taken !== undefined) {
    return t('carvedFront', {
      names: carving.taken.map(nameOf).join(', '),
      crossings: carving.crossings,
    })
  }
  return t('carved', { name: nameOf(carving.suzerain), crossings: carving.crossings })
}

/**
 * What a closing's carving is answered with: a carving done, its sentence kept for the status bar; one held back
 * because the suzerain's outline is open, the warning dialogue (the dev, 2026-11-05 — `open-outlines.md`).
 * @param context - the store and the canvas's words
 * @param context.store - the store, whose warning the dialogue shows
 * @param context.words - the canvas's words
 * @param name - the vassal's name
 * @param carved - the status bar's sentences, added to
 * @returns the answer to hand the store's closing
 */
export function carvingAnswer(
  context: Pick<LayerHitContext, 'store'> & { words: CanvasWords },
  name: string,
  carved: string[]
): (carving: Carving | CarvingHeld) => void {
  const { t } = context.words
  return (carving) => {
    const { polities } = context.store.getState().document
    if ('held' in carving) {
      const suzerain =
        polities.find((polity) => polity.id === carving.suzerain)?.name ?? carving.suzerain
      console.warn(`${TAG} "${carving.suzerain}" was not carved: its outline is open.`)
      context.store.getState().raiseWarning(t('carveHeld', { name, suzerain }))
      return
    }
    carved.push(carvedReport(polities, carving, t))
  }
}

/**
 * Refuse to close a vassal whose suzerain's outline is still open: nothing is written, the outline in hand is erased,
 * and the warning dialogue says why and what to do (the dev, 2026-11-05 — `open-outlines.md`): a vassal is carved
 * only out of a closed outline, and the closing is the only moment it is.
 * @param context - the session and the store
 * @param target - the vassal being closed
 * @param target.id - its id
 * @param target.name - its name
 * @returns `true` when the closing was refused
 */
export function refusedOverOpenSuzerain(
  context: Pick<LayerHitContext, 'store'> & { session: ToolSession; words: CanvasWords },
  target: { id: string; name: string }
): boolean {
  const { document } = context.store.getState()
  const suzerainId = openSuzerainOf(document, target.id)
  if (suzerainId === null) return false
  const suzerain = document.polities.find((polity) => polity.id === suzerainId)?.name ?? suzerainId
  console.warn(`${TAG} "${target.id}" not closed: its suzerain "${suzerainId}" is still open.`)
  clearOutline(context.session)
  context.store
    .getState()
    .raiseWarning(context.words.t('closeOverOpenSuzerain', { name: target.name, suzerain }))
  return true
}
