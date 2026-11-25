import { Button } from '@fubaritico/react/Button'

import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { StartIcon } from '../../../icons/startIcons'
import { START_SCREEN_MESSAGES } from '../i18n'

/** What the column does. */
export interface StartSideProps {
  /** « Nouvelle carte… ». */
  onNewMap: () => void
  /** « Ouvrir… ». */
  onOpen: () => void
}

/**
 * The start screen's column, Illustrator's (CARTO-536): « Nouvelle carte… », the main button, « Ouvrir… », a hairline,
 * and « Accueil », the page shown.
 * @param props - what the two buttons do
 * @param props.onNewMap - « Nouvelle carte… »
 * @param props.onOpen - « Ouvrir… »
 * @returns the column
 */
export function StartSide({ onNewMap, onOpen }: StartSideProps) {
  // Context
  const t = useTranslation(START_SCREEN_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // Render
  return (
    <div className="start-screen__side" role="group" aria-label={t('start')}>
      <Button type="button" className="start-screen__action" onClick={onNewMap}>
        <StartIcon kind="newMap" />
        {action('newMap')}
      </Button>
      <Button type="button" variant="ghost" className="start-screen__action" onClick={onOpen}>
        <StartIcon kind="open" />
        {action('open')}
      </Button>
      <span className="start-screen__rule" aria-hidden="true" />
      <span className="start-screen__home" aria-current="page">
        <StartIcon kind="home" />
        {t('home')}
      </span>
    </div>
  )
}
