import { createYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/**
 * The window the author draws in — **not** the frame the atlas renders.
 *
 * Decided 2026-09-22: 45 polities of 1100 fall inside it and 6 outside, the Fatimids, Abbasids and Zirids
 * among those inside, which is right for the Crusades. The render frame is the DEM's (W −45 / S 11 /
 * E 78.75 / N 76.84) and the two must never be confused — projecting against one while painting the other
 * slides everything with no error anywhere (see `known-issues.md`, "two geographic boxes").
 *
 * **It is dated, and this constant is not**: the zone widens from the 18th century on. The day a second zone
 * exists this becomes a table keyed by year, in `core` beside the format rather than here.
 *
 * **`FIXTURE_ZONE` in `core/editor/documentFixtures.ts` carries these same four numbers, and that is not a
 * second copy of this value — the two must stay apart.** Raised in review (ARCH-013) as a duplication to be
 * unified later, and it is the opposite: the fixture's box exists only to contain two squares at lon 0–4 /
 * lat 46–48 so its geometric assertions read, and widening the editorial zone must **not** move it. The
 * numbers coincide because whoever wrote the fixture borrowed a real one. Unifying them would tie a test's
 * readability to an editorial decision, and neither import direction is even available: the fixture is
 * test-only by its own contract, and `core` may not read an application package.
 */
export const EDITORIAL_ZONE: GeoBounds = { west: -45, south: 20, east: 60, north: 76 }

/**
 * A year with nothing drawn in it yet — what authoring from scratch starts from.
 *
 * A module rather than a literal at the composition root, for the reason `rules/modular-architecture.md`
 * names: the zone is an editorial decision, and a decision written inside `bootstrap()` is a module that was
 * not written. The chrome's "new year" dialogue (step 5) calls this same function.
 *
 * No provenance is declared: nothing has been reported from anything yet, and an empty list is the honest
 * answer rather than a placeholder source no anchor points at.
 * @param year - the year being drawn
 * @returns a fresh document, safe to mutate
 */
export function openEmptyYear(year: number): YearDocument {
  return createYearDocument(year, EDITORIAL_ZONE)
}
