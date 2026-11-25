import { existsSync, readFileSync, rmSync } from 'node:fs'

import { readTrialState, stopTrial } from './trialPlan'
import { SYSTEM_STOP, TRIAL } from './trialSystem'

/**
 * `pnpm trial:stop` (REPO-542): the trial CMS stopped, with its children, and its folder — the copy, the account in it,
 * the log — removed. The folder is computed from this file's place (`trialSystem.TRIAL`), never taken from input. Says
 * what it did; a trial already gone is said, not refused. **A process that is not the trial's server is never stopped**
 * — a pid the system gave to another process since a reboot or a crash — and the stale folder is removed all the same,
 * said (review SEC-001, 2026-11-25).
 */
if (!existsSync(TRIAL.folder)) {
  console.warn('[CMS] no trial to stop')
} else {
  if (existsSync(TRIAL.state)) {
    const state = readTrialState(readFileSync(TRIAL.state, 'utf8'))
    const outcome = await stopTrial(state, SYSTEM_STOP)
    console.warn(
      {
        stopped: `[CMS] trial CMS stopped (port ${String(state.port)})`,
        gone: '[CMS] the trial CMS had already stopped',
        notOurs: `[CMS] process ${String(state.pid)} is no longer the trial's server: left alone`,
      }[outcome]
    )
  } else console.warn('[CMS] the trial left no state: no server to stop')
  rmSync(TRIAL.folder, { recursive: true, force: true })
  console.warn(`[CMS] trial removed: ${TRIAL.folder}`)
}
