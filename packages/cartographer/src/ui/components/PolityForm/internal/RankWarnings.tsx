import { POLITY_MESSAGES } from '../../../../i18n/polity'
import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_FORM_MESSAGES } from '../i18n'

import type { RankWarning } from '../../../utils/rankWarnings'

/**
 * What the ranks contradict, under the suzerain (CORE-489, the dev, 2026-11-20): one sentence per vassal that ranks
 * higher than its suzerain, the two named with their ranks. **A warning**: nothing is refused, the form saves.
 * @param props - the steps at fault
 * @param props.warnings - each vassal and its suzerain, with their ranks as stored
 * @returns the sentences, or nothing when the ranks agree
 */
export function RankWarnings({ warnings }: { warnings: readonly RankWarning[] }) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)
  const polity = useTranslation(POLITY_MESSAGES)

  // Render
  return (
    <>
      {warnings.map((warning, index) => (
        // By its place: two polities may bear one name, and a name is being typed.
        <p key={index} className="ui-field__message" role="status">
          {t('rankWarning', {
            vassal: warning.vassal,
            vassalRank: polity('rankName', { rank: warning.vassalRank }),
            suzerain: warning.suzerain,
            suzerainRank: polity('rankName', { rank: warning.suzerainRank }),
          })}
        </p>
      ))}
    </>
  )
}
