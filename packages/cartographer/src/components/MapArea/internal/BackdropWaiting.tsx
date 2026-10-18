import { NOTICE } from '../areaStyle'

import type { ComputePhase } from '@europe-historical-atlas/core/pipeline/mapCompute'

/** What each phase of a bake is called, for the waiting line. */
const PHASE_LABELS: Record<ComputePhase, string> = {
  rasterise: 'tracing the territories',
  expand: 'expanding to the coasts',
  colours: 'assigning the colours',
  bake: 'compositing the relief',
  borders: 'deriving the borders',
}

/** What the waiting state shows. */
export interface BackdropWaitingProps {
  /** Progress through the bake, in `[0, 1]`. */
  fraction: number
  /** The phase about to run, or `null` before the first announcement. */
  phase: ComputePhase | null
}

/**
 * The wait.
 *
 * **`role="status"` and not `"alert"`**: nothing has gone wrong, so this must not interrupt a screen
 * reader — the same split the atlas's notices already make, where the severity is declared rather than
 * inferred from which code path spoke.
 *
 * **It carries a real fraction, from the bake's own announcements.** The compute port reports each phase
 * before running it, so the number is measured rather than animated. A bar that moved on a timer would
 * be the kind of progress indicator that lies when the machine is slow — which is exactly when someone
 * reads it.
 * @param props - the progress so far and the phase about to run
 * @returns the waiting notice
 */
export function BackdropWaiting({ fraction, phase }: BackdropWaitingProps) {
  // Derived
  const percent = Math.round(fraction * 100)
  // What the bar measures, named for a screen reader. A `<progress>` exposes its own value natively, so
  // this must say what is progressing and not repeat the number. Derived per render rather than fixed:
  // a hard-coded phase would go stale, which is the same gap as no label, just later. Same pattern as
  // the atlas's own progress overlay, which keeps the `aria-label` in step with its caption.
  const measuring = phase === null ? 'Preparing the backdrop' : PHASE_LABELS[phase]

  // Render
  return (
    <div style={NOTICE} role="status">
      <p>Preparing the backdrop…</p>
      <progress value={fraction} max={1} aria-label={measuring}>
        {percent} %
      </progress>
      {phase === null ? null : <p>{PHASE_LABELS[phase]}</p>}
    </div>
  )
}
