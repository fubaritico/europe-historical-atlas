import { use } from 'react'

import { CmsChannelContext } from '../utils/cmsChannel'

import type { CmsChannel } from '../utils/cmsChannel'

/**
 * How the chrome reaches the CMS (CARTO-498).
 * @returns the channel the composition root provided
 * @throws {Error} when no provider is above — a wiring fault, said loudly
 */
export function useCmsChannel(): CmsChannel {
  // Context
  const channel = use(CmsChannelContext)

  // Guards
  if (channel === null)
    throw new Error('[Cartographer] no CmsChannelContext above this component — a wiring fault')

  // Return
  return channel
}
