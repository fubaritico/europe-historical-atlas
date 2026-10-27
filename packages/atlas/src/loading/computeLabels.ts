/**
 * Which message names each compute phase in the progress panel.
 *
 * It lives in `loading/`, beside the compute it names, rather than in `ui/` or core's `pipeline/`, and that
 * is the whole point: the panel must not know what is being computed, and the compute must not hold a
 * panel's wording — least of all its language. The loading is where both meet. The words are in
 * `messages.ts`, in French and English (ATLAS-159).
 *
 * Typed as a total `Record`, so a phase added to the protocol without a message fails type-check instead of
 * reaching a user as a blank step.
 */

import type { AtlasMessageKey } from '../i18n'
import type { ComputePhase } from '@europe-historical-atlas/core/pipeline/mapCompute'

/** The message shown while each phase runs. Written as what the map is *about to* spend time on. */
export const COMPUTE_PHASE_MESSAGES: Record<ComputePhase, AtlasMessageKey> = {
  rasterise: 'phaseRasterise',
  expand: 'phaseExpand',
  colours: 'phaseColours',
  bake: 'phaseBake',
  borders: 'phaseBorders',
}
