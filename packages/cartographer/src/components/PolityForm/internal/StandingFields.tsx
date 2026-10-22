import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_MESSAGES } from '../../../i18n/polity'
import { STATUSES } from '../../../utils/polityDraft'
import { POLITY_FORM_MESSAGES } from '../i18n'

import { ChoiceField } from './ChoiceField'

/**
 * The rank and the status: two lists of stored values, each named in the page's language (`polityMessages`) —
 * a value the form does not know, read from a file, is shown as it is stored.
 * @param props - the ranks offered, the values chosen, and the callback
 * @param props.ranks - the ranks offered, as stored (`rankChoices`)
 * @param props.rank - the rank chosen, or `null`
 * @param props.status - the status chosen, or `null`
 * @param props.onField - reports a choice, `null` for none
 * @returns the two fields
 */
export function StandingFields({
  ranks,
  rank,
  status,
  onField,
}: {
  ranks: readonly string[]
  rank: string | null
  status: string | null
  onField: (field: 'rank' | 'status', value: string | null) => void
}) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)
  const polity = useTranslation(POLITY_MESSAGES)

  // Derived
  const rankOptions = ranks.map((value) => ({ value, label: polity('rankName', { rank: value }) }))
  const statusOptions = STATUSES.map((value) => ({
    value,
    label: polity('statusName', { status: value }),
  }))

  // Handlers
  const handleRank = (value: string | null) => {
    onField('rank', value)
  }
  const handleStatus = (value: string | null) => {
    onField('status', value)
  }

  // Render
  return (
    <>
      <ChoiceField label={t('rank')} options={rankOptions} value={rank} onSelect={handleRank} />
      <ChoiceField
        label={t('status')}
        options={statusOptions}
        value={status}
        onSelect={handleStatus}
      />
    </>
  )
}
