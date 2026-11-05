import { useState } from 'react'

import { useTranslation } from '../../hooks/useTranslation'
import { Panel } from '../Panel'

import { useCitiesView } from './hooks/useCitiesView'
import { CITIES_PANEL_MESSAGES } from './i18n'
import { CityDetail } from './internal/CityDetail'
import { CityList } from './internal/CityList'
import { citiesStatus } from './utils/citiesStatus'

import type { CartographerStoreHook } from '../../../state/store'

/**
 * `{Cities}` (CARTO-193, the dev, 2026-11-02) — the contribution's cities of the year open, as guides for the
 * borders: each shown or hidden by its own eye, none at opening; a double-click says who holds it, by the sources and on
 * the map; a city the map puts elsewhere, or whose holder the map lacks, is marked in the list.
 *
 * The shell/view/binding split (`react-canvas-and-panels`): {@link CityList} and {@link CityDetail} take values,
 * {@link CitiesPanel} is the one place that knows there is a store. Which city's detail is open is the panel's own:
 * one writer, one reader, no slice.
 */

/**
 * `{Cities}`, bound to the store.
 * @param props - the store
 * @param props.store - the store the cities and the document live in
 * @returns the panel
 */
export function CitiesPanel({ store }: { store: CartographerStoreHook }) {
  // Store
  const all = store((state) => state.cities)
  const load = store((state) => state.citiesLoad)
  const shown = store((state) => state.shownCities)
  const asPoints = store((state) => state.citiesAsPoints)
  const document = store((state) => state.document)
  // Rendered again on each version: the document is mutated in place, so its identity does not say it changed.
  store((state) => state.version)

  // Store actions
  const setCityShown = store((state) => state.setCityShown)
  const setCitiesShown = store((state) => state.setCitiesShown)
  const setCitiesAsPoints = store((state) => state.setCitiesAsPoints)

  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // State
  const [opened, setOpened] = useState<string | null>(null)

  // Derived
  const { cities, verdicts, openedCity, openedVerdict } = useCitiesView(all, document, opened)
  const status = citiesStatus(load, cities.length, document.year)

  // Handlers
  const handleClose = () => {
    setOpened(null)
  }

  // Render
  return (
    <Panel title={t('title')} zone="cities-panel">
      {status !== null ? (
        <p className="panel__hint">{t(status.key, status.values)}</p>
      ) : (
        <>
          <CityList
            year={document.year}
            cities={cities}
            shown={shown}
            opened={opened}
            verdicts={verdicts}
            onShown={setCityShown}
            onAllShown={setCitiesShown}
            asPoints={asPoints}
            onAsPoints={setCitiesAsPoints}
            onOpen={setOpened}
          />
          {openedCity === null || openedVerdict === undefined ? (
            <p className="panel__hint">{t('hint')}</p>
          ) : (
            <CityDetail
              name={openedCity.name}
              verdict={openedVerdict}
              sources={openedCity.holderSources}
              onClose={handleClose}
            />
          )}
        </>
      )}
    </Panel>
  )
}
