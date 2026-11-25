import { getPayload } from 'payload'

import config from '../payload.config'

import { isTrialDatabase } from './trialPlan'
import { TRIAL } from './trialSystem'

/**
 * The throwaway account of a trial (REPO-542), run by `trial:start` with the copy's `DATABASE_URL` and the account in
 * `TRIAL_EMAIL` / `TRIAL_PASSWORD`. **It refuses any base outside the trial's folder** — the dev's above all — before
 * Payload opens it. A failure exits 1, so `trial:start` stops and removes the trial.
 */
try {
  if (!isTrialDatabase(process.env.DATABASE_URL, TRIAL.folder))
    throw new Error(
      `refused: ${String(process.env.DATABASE_URL)} is not the trial's copy (${TRIAL.folder})`
    )
  const email = process.env.TRIAL_EMAIL
  const password = process.env.TRIAL_PASSWORD
  if (email === undefined || password === undefined)
    throw new Error('TRIAL_EMAIL and TRIAL_PASSWORD are needed')
  const payload = await getPayload({ config })
  const user = await payload.create({ collection: 'users', data: { email, password } })
  console.warn(`[CMS] trial account ${String(user.id)} created in the copy`)
  process.exit(0)
} catch (error: unknown) {
  console.error('[CMS] the trial account could not be made:', error)
  process.exit(1)
}
