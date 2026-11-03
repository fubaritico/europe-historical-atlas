import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { ChromeIcon } from '../../../icons/chromeIcons'
import { EDITOR_MESSAGES } from '../i18n'

import { BarButton } from './BarButton'

import type { Ref } from 'react'

/** What the tab shows. */
export interface DocTabProps {
  /** The open year. */
  year: number
  /** Where the zoom is written, outside React. */
  zoomRef: Ref<HTMLSpanElement>
}

/**
 * The open year's tab, at the left of the document bar: its close button, not built yet (`s04`), the year, and the
 * zoom written into the node handed back through `zoomRef`.
 * @param props - the year and where the zoom goes
 * @param props.year - the open year
 * @param props.zoomRef - where the zoom is written
 * @returns the tab
 */
export function DocTab({ year, zoomRef }: DocTabProps) {
  // Context
  const t = useTranslation(EDITOR_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // Render
  return (
    <div className="doc-tab">
      <BarButton
        label={t('closeYear', { close: action('close'), year: String(year) })}
        unavailable={t('notBuilt', { scenarios: 's04' })}
        icon={<ChromeIcon name="close" size={9} />}
        variant="icon"
      />
      <span className="doc-tab__name">{year}</span>
      <span className="doc-tab__meta">
        @ <span ref={zoomRef}>—</span>
      </span>
    </div>
  )
}
