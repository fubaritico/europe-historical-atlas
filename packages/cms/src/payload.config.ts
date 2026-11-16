import { buildConfig } from 'payload'

import { cmsConfig } from './cmsConfig'

/** The configuration, built — what Payload, Next and the scripts load; its content is `cmsConfig`. */
export default buildConfig(cmsConfig())
