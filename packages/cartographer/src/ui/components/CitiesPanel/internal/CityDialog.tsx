import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Modal } from '@fubaritico/react/Modal'

import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { CityDetail } from './CityDetail'

import type { CitiesView } from '../hooks/useCitiesView'

/**
 * A city's information box (CARTO-384, the dev, 2026-11-07: *"like the filters' modal, for now"*): a double-click on
 * its name in `{Cities}` or on its point on the map opens it, in place of the detail under the list. « Fermer », ‹esc›
 * or a click outside closes it; the city stays chosen. A floating panel instead is CARTO-387, its shape to define.
 * @param props - the city opened and its verdict, and what closing does
 * @param props.openedCity - the city whose box is open, or `null` with none
 * @param props.openedVerdict - its verdict, or `undefined` with none open
 * @param props.onClose - the box was closed
 * @returns the dialogue, open when a city is
 */
export function CityDialog({
  openedCity,
  openedVerdict,
  onClose,
}: Pick<CitiesView, 'openedCity' | 'openedVerdict'> & { onClose: () => void }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const open = openedCity !== null && openedVerdict !== undefined

  // Render
  return (
    <Modal isOpen={open} onClose={onClose} aria-label={openedCity?.name ?? ''}>
      {open && (
        <div className="short-dialogue">
          <Card>
            <Card.Header>{openedCity.name}</Card.Header>
            <Card.Body>
              <CityDetail
                name={openedCity.name}
                at={[openedCity.lon, openedCity.lat]}
                verdict={openedVerdict}
                sources={openedCity.holderSources}
              />
            </Card.Body>
            <Card.Footer align="end">
              <Button type="button" onClick={onClose}>
                {t('closeDetail')}
              </Button>
            </Card.Footer>
          </Card>
        </div>
      )}
    </Modal>
  )
}
