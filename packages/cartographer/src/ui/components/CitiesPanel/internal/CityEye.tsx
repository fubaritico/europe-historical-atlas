import { useTranslation } from '../../../hooks/useTranslation'
import { ChromeIcon } from '../../../icons/chromeIcons'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import type { CityMark } from '../../../../state/citiesSlice'

/**
 * A city's eye in `{Cities}`: shows or hides the city on the canvas, and says which in its name.
 * @param props - the city, whether it is shown, and the callback
 * @param props.city - the city
 * @param props.visible - whether it is shown on the canvas
 * @param props.onShown - the eye was toggled
 * @returns the eye
 */
export function CityEye({
  city,
  visible,
  onShown,
}: {
  city: CityMark
  visible: boolean
  onShown: (id: string, shown: boolean) => void
}) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const eye = t(visible ? 'hide' : 'show', { city: city.name })

  // Handlers
  const handleEye = () => {
    onShown(city.id, !visible)
  }

  // Render
  return (
    <button
      type="button"
      className="layer-row__eye"
      aria-pressed={visible}
      aria-label={eye}
      title={eye}
      onClick={handleEye}
    >
      <ChromeIcon name={visible ? 'eyeOpen' : 'eyeShut'} size={15} />
    </button>
  )
}
