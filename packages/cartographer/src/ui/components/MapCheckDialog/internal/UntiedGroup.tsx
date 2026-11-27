import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_CHECK_MESSAGES } from '../i18n'

import { CheckGroup } from './CheckGroup'
import { CheckRow } from './CheckRow'

import type { UntiedPolity } from '@europe-historical-atlas/core/data/cmsAlignment'

/**
 * « Tied to nothing »: the polities neither a number nor a Wikidata item ties to the CMS — and why, when the number they
 * carry is no territory's any more.
 * @param props - the rows and the opening
 * @param props.rows - the polities
 * @param props.onOpen - opens a polity's form
 * @returns the group — its tab is made only when a polity is in it
 */
export function UntiedGroup({
  rows,
  onOpen,
}: {
  rows: readonly UntiedPolity[]
  onOpen: (id: string) => void
}) {
  // Context
  const t = useTranslation(MAP_CHECK_MESSAGES)

  // Render
  return (
    <CheckGroup help={t('untiedHelp')}>
      {rows.map((row) => (
        <CheckRow
          key={row.id}
          id={row.id}
          name={row.name}
          detail={
            row.territory === undefined
              ? null
              : t('missingTerritory', { id: String(row.territory) })
          }
          onOpen={onOpen}
        />
      ))}
    </CheckGroup>
  )
}
