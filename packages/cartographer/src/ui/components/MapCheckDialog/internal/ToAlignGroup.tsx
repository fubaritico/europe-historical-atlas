import { Button } from '@fubaritico/react/Button'

import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_CHECK_MESSAGES } from '../i18n'
import { cmsSide } from '../utils/cmsSide'

import { CheckGroup } from './CheckGroup'
import { CheckRow } from './CheckRow'

import type { TiedPolity } from '@europe-historical-atlas/core/data/cmsAlignment'

/**
 * « Different from the CMS »: the polities tied by number whose name or a date differs — aligned all at once.
 * @param props - the rows and the actions
 * @param props.rows - the polities
 * @param props.onAlignAll - aligns them all, as one step
 * @param props.onOpen - opens a polity's form
 * @returns the group, or nothing when no polity is in it
 */
export function ToAlignGroup({
  rows,
  onAlignAll,
  onOpen,
}: {
  rows: readonly TiedPolity[]
  onAlignAll: () => void
  onOpen: (id: string) => void
}) {
  // Context
  const t = useTranslation(MAP_CHECK_MESSAGES)

  // Render
  if (rows.length === 0) return null

  return (
    <CheckGroup
      heading={t('toAlign', { count: rows.length })}
      help={t('toAlignHelp')}
      action={
        <Button type="button" variant="secondary" onClick={onAlignAll}>
          {t('alignAll')}
        </Button>
      }
    >
      {rows.map((row) => (
        <CheckRow
          key={row.id}
          id={row.id}
          name={row.name}
          detail={cmsSide(row, t)}
          onOpen={onOpen}
        />
      ))}
    </CheckGroup>
  )
}
