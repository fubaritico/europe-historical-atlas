import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_CHECK_MESSAGES } from '../i18n'
import { cmsSide } from '../utils/cmsSide'

import { AlignButton } from './AlignButton'
import { CheckGroup } from './CheckGroup'
import { CheckRow } from './CheckRow'

import type { TiedPolity } from '@europe-historical-atlas/core/data/cmsAlignment'

/**
 * « To confirm »: the polities tied by their Wikidata item only — each aligned on the author's click, the two names side
 * by side, Cliopatria's items being sometimes wrong (the dev, 2026-11-27).
 * @param props - the rows and the actions
 * @param props.rows - the polities
 * @param props.onAlign - aligns one polity
 * @param props.onOpen - opens a polity's form
 * @returns the group — its tab is made only when a polity is in it
 */
export function ToConfirmGroup({
  rows,
  onAlign,
  onOpen,
}: {
  rows: readonly TiedPolity[]
  onAlign: (id: string) => void
  onOpen: (id: string) => void
}) {
  // Context
  const t = useTranslation(MAP_CHECK_MESSAGES)

  // Render
  return (
    <CheckGroup help={t('toConfirmHelp')}>
      {rows.map((row) => (
        <CheckRow key={row.id} id={row.id} name={row.name} detail={cmsSide(row, t)} onOpen={onOpen}>
          <AlignButton id={row.id} name={row.name} onAlign={onAlign} />
        </CheckRow>
      ))}
    </CheckGroup>
  )
}
