import { createYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * A year with nothing drawn in it yet — what authoring from scratch starts from.
 *
 * A module rather than a literal at the composition root, for the reason `rules/modular-architecture.md`
 * names: what a new year holds is a decision, and a decision written inside `bootstrap()` is a module that
 * was not written. The chrome's "new year" dialogue (step 5) calls this same function.
 *
 * No provenance is declared: nothing has been reported from anything yet, and an empty list is the honest
 * answer rather than a placeholder source no anchor points at.
 * @param year - the year being drawn
 * @returns a fresh document, safe to mutate
 */
export function openEmptyYear(year: number): YearDocument {
  return createYearDocument(year)
}
