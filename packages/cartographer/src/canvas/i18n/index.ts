import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link CANVAS_MESSAGES}: what the canvas says in the status bar — the action under the pointer,
 * what a gesture did or why it was refused, what is under the pointer — and how the history names its steps.
 *
 * **The dev's pattern for the action, 2026-10-08**: a verb, then the polity's name verbatim. `name` is always a
 * polity's name, verbatim; `names` a list of them, already joined. In French a name never follows « de » or
 * « du », which would want an elision the code cannot make (« de Aquitaine »): it follows a dash or a colon.
 * `water` names what the Pen follows: `coast`, `river` (with `river` holding its name) or `unnamed`.
 *
 * Its messages, and the values they take:
 * - `selectToDraw`, `zoomInTo`, `closing`, `inserting`, `moving`, `selecting`, `following`, `drawing`,
 *   `drawingNoWater`, `branching`, `retracing`, `retracingFollowing`, `retracingNeighbour`,
 *   `retracingToEnd`, `retracingToStart`, `retracingStartHere`, `retracingOtherOutline`,
 *   `retracingCannotEnd`, `retracingReplaces` — The action under the pointer
 * - `tooFar`, `reachWould`, `notFramed`, `insertedFromWater`, `followedBorder`, `closedAlongWater`,
 *   `carved`, `removedAnchors`, `removedRings`, `pointsTakenFrom`, `keptPoints`, `notWelded`, `welded`,
 *   `retraceStartPrompt`, `notRetraced`, `retraced`, `follows`, `keepsPoints` — What a gesture did
 * - `refusedNoRing`, `refusedDressedRun`, `refusedLoop`, `refusedTooShort`, `refusedDisagree`,
 *   `deliberateGap` — Why a retrace is refused
 * - `borderUnder`, `polityUnder` — What is under the pointer
 * - `stepInsertAnchor`, `stepDeleteAnchors`, `stepMoveAnchors`, `stepWeldAnchor`, `stepDrawOutline`,
 *   `stepRetrace` — The history's names
 */
export type CanvasMessageKey = keyof typeof en

/**
 * {@link CanvasMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const CANVAS_MESSAGES: Catalogue<CanvasMessageKey> = { fr, en }
