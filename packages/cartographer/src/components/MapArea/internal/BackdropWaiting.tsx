import { useTranslation } from '../../../hooks/useTranslation'
import { NOTICE } from '../areaStyle'
import { MAP_AREA_MESSAGES } from '../i18n'

import type { ComputePhase } from '@europe-historical-atlas/core/pipeline/mapCompute'

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
 * @param props.fraction - progress through the bake, in `[0, 1]`
 * @param props.phase - the phase about to run, or `null` before the first announcement
 * @returns the waiting notice
 */
export function BackdropWaiting({ fraction, phase }: BackdropWaitingProps) {
  // Context
  const t = useTranslation(MAP_AREA_MESSAGES)

  // Derived
  const percent = Math.round(fraction * 100)
  // What the bar measures, named for a screen reader. A `<progress>` exposes its own value natively, so
  // this must say what is progressing and not repeat the number. Derived per render rather than fixed:
  // a hard-coded phase would go stale, which is the same gap as no label, just later. Same pattern as
  // the atlas's own progress overlay, which keeps the `aria-label` in step with its caption.
  const named = phase === null ? null : t('phase', { phase })
  const measuring = named ?? t('preparingLabel')

  // Render
  return (
    <div style={NOTICE} role="status">
      <p>{t('preparing')}</p>
      <progress value={fraction} max={1} aria-label={measuring}>
        {percent} %
      </progress>
      {named === null ? null : <p>{named}</p>}
    </div>
  )
}
