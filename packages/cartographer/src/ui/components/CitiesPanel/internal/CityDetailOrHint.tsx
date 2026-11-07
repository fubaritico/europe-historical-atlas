import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { CityDetail } from './CityDetail'

import type { CitiesView } from '../hooks/useCitiesView'

/**
 * Under the list: the detail of the city opened, or the hint saying what a double-click does.
 * @param props - the city opened and its verdict, and what closing does
 * @param props.openedCity - the city whose detail is open, or `null`
 * @param props.openedVerdict - its verdict, or `undefined` with none open
 * @param props.onClose - the detail was closed
 * @returns the detail, or the hint
 */
export function CityDetailOrHint({
  openedCity,
  openedVerdict,
  onClose,
}: Pick<CitiesView, 'openedCity' | 'openedVerdict'> & { onClose: () => void }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Render
  return openedCity === null || openedVerdict === undefined ? (
    <p className="panel__hint">{t('hint')}</p>
  ) : (
    <CityDetail
      name={openedCity.name}
      verdict={openedVerdict}
      sources={openedCity.holderSources}
      onClose={onClose}
    />
  )
}
