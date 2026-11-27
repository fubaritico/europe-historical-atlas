import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_FORM_MESSAGES } from '../i18n'

import type { CmsHeld } from '../polityFieldsProps'

/**
 * « Modifier dans le CMS », under the dates of a polity aligned on the CMS (CARTO-568): its territory's page, where the
 * name and the dates held here read-only are changed. Nothing when nothing is held, or online.
 * @param props - what the CMS holds
 * @param props.cmsHeld - what the CMS holds, absent when nothing
 * @returns the link, or nothing
 */
export function CmsHeldLink({ cmsHeld }: { cmsHeld: CmsHeld | undefined }) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)

  // Render
  if (cmsHeld?.page === undefined || cmsHeld.page === null) return null

  // Derived
  const { name, existsFrom, existsTo } = cmsHeld.locks

  // Render
  if (!name && !existsFrom && !existsTo) return null

  return (
    <a href={cmsHeld.page} target="_blank" rel="noopener noreferrer">
      {t('editInCms')}
    </a>
  )
}
