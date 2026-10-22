import type { CanvasMessageKey } from '../i18n'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { Carving } from '@europe-historical-atlas/core/editor/carve'
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
  const name = polities.find((polity) => polity.id === carving.suzerain)?.name ?? carving.suzerain
  return t('carved', { name, crossings: carving.crossings })
}
