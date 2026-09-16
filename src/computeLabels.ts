/**
 * What each compute phase is called in the progress panel.
 *
 * It lives at the root rather than in `ui/` or `pipeline/`, and that is the whole point: the panel must
 * not know what is being computed, and the compute must not hold a panel's wording — least of all its
 * language. The composition root is the only place that legitimately knows both.
 *
 * Typed as a total `Record`, so a phase added to the protocol without a label fails type-check instead of
 * reaching a user as a blank step.
 */

import type { ComputePhase } from './pipeline/mapCompute'

/** The label shown while each phase runs. Written as what the map is *about to* spend time on. */
export const COMPUTE_PHASE_LABELS: Record<ComputePhase, string> = {
  rasterise: 'Tracé des territoires…',
  expand: 'Extension jusqu’aux côtes…',
  colours: 'Attribution des couleurs…',
  bake: 'Composition de la texture…',
  borders: 'Tracé des frontières…',
}
