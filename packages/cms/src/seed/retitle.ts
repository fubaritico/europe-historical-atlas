import { getPayload } from 'payload'

import { retitleSheets } from '../collections/retitleSheets'
import config from '../payload.config'

/**
 * Give every city sheet its title (`pnpm --filter @europe-historical-atlas/cms retitle`) — once, for the sheets saved
 * before the title existed; every save writes it since. Through Payload's Local API, so each sheet passes the same
 * rules as the form, and a sheet they refuse stops the run, named.
 */
const payload = await getPayload({ config })
const count = await retitleSheets(payload, {})
console.warn(`[CMS] place-periods: ${String(count)} given their title`)
process.exit(0)
