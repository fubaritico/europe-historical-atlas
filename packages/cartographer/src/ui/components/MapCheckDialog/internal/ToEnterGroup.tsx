import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_CHECK_MESSAGES } from '../i18n'
import { missingDates } from '../utils/missingDates'

import { CheckGroup } from './CheckGroup'
import { CheckRow } from './CheckRow'

import type { TiedPolity } from '@europe-historical-atlas/core/data/cmsAlignment'

/**
 * « To enter in the CMS »: the dates the map gives and the CMS lacks — kept on the map, editable, each row linked to its
 * territory's page (the dev, 2026-11-27: nothing erased, nothing invented).
 * @param props - the rows, the CMS's pages and the opening
 * @param props.rows - the polities
 * @param props.pageOf - the address of a territory's page
 * @param props.onOpen - opens a polity's form
 * @returns the group, or nothing when no polity is in it
 */
export function ToEnterGroup({
  rows,
  pageOf,
  onOpen,
}: {
  rows: readonly TiedPolity[]
  pageOf: (id: number) => string
  onOpen: (id: string) => void
}) {
  // Context
  const t = useTranslation(MAP_CHECK_MESSAGES)

  // Render
  if (rows.length === 0) return null

  return (
    <CheckGroup heading={t('toEnter', { count: rows.length })} help={t('toEnterHelp')}>
      {rows.map((row) => (
        <CheckRow
          key={row.id}
          id={row.id}
          name={row.name}
          detail={missingDates(row, t)}
          onOpen={onOpen}
        >
          <a href={pageOf(row.cms.id)} target="_blank" rel="noopener noreferrer">
            {t('cmsPage')}
          </a>
        </CheckRow>
      ))}
    </CheckGroup>
  )
}
