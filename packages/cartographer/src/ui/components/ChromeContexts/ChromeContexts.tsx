import { PlatformContext } from '../../i18n/platformContext'
import { CmsChannelContext } from '../../utils/cmsChannel'

import type { CmsChannel } from '../../utils/cmsChannel'
import type { Platform } from '@europe-historical-atlas/core/i18n/shortcuts'
import type { ReactNode } from 'react'

/** What the chrome's contexts are set to. */
export interface ChromeContextsProps {
  /** The system the shortcuts are written for (CARTO-345). */
  platform: Platform
  /** How the chrome reaches the CMS (CARTO-498). */
  cms: CmsChannel
  /** The chrome. */
  children: ReactNode
}

/**
 * The contexts every part of the chrome may read, set once — by the composition root, and by the tests' wrapper: the
 * system the shortcuts are written for, and how the chrome reaches the CMS. Without them a component throws, a wiring
 * fault said loudly.
 * @param props - the values and the chrome
 * @param props.platform - the system of the shortcuts
 * @param props.cms - the channel to the CMS
 * @param props.children - the chrome
 * @returns the chrome, with its contexts
 */
export function ChromeContexts({ platform, cms, children }: ChromeContextsProps) {
  // Render
  return (
    <PlatformContext value={platform}>
      <CmsChannelContext value={cms}>{children}</CmsChannelContext>
    </PlatformContext>
  )
}
