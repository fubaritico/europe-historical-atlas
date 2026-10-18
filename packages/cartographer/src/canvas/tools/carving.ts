import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { Carving } from '@europe-historical-atlas/core/editor/carve'

/**
 * What the status bar says of a carving (`s08`, 2026-10-15) — *"carved out of Kingdom of France's own
 * domain, 2 anchors placed where the limits cross"*.
 * @param polities - the year's polities, for the suzerain's name
 * @param carving - what the carving did
 * @returns the sentence
 */
export function carvedReport(polities: readonly YearPolity[], carving: Carving): string {
  // The suzerain comes from a vassal's `suzerain` field, which the readers check against the registry:
  // the id is shown only if that check was bypassed, and showing it beats showing nothing.
  const name = polities.find((polity) => polity.id === carving.suzerain)?.name ?? carving.suzerain
  if (carving.crossings === 0) return `carved out of ${name}'s own domain`
  const anchors = carving.crossings === 1 ? 'anchor' : 'anchors'
  return `carved out of ${name}'s own domain, ${String(carving.crossings)} ${anchors} placed where the limits cross`
}
