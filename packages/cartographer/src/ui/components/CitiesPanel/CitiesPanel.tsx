import { useTranslation } from '../../hooks/useTranslation'
import { Panel } from '../Panel'

import { useCitiesView } from './hooks/useCitiesView'
import { useCityFilters } from './hooks/useCityFilters'
import { useHolderDots } from './hooks/useHolderDots'
import { CITIES_PANEL_MESSAGES } from './i18n'
import { CityDialog } from './internal/CityDialog'
import { CityList } from './internal/CityList'
import { citiesStatus } from './utils/citiesStatus'

import type { PolityColourSource } from '../../../state/polityColourSource'
import type { CartographerStoreHook } from '../../../state/store'

/**
 * `{Cities}` (CARTO-193, the dev, 2026-11-02) — the contribution's cities of the year open, as guides for the
 * borders: each shown or hidden by its own eye, none at opening; a double-click says who holds it, by the sources and on
 * the map; a city the map puts elsewhere, or whose holder the map lacks, is marked in yellow in the list, a city with
 * no holder entered in red (CARTO-386).
 *
 * The shell/view/binding split (`react-canvas-and-panels`): {@link CityList} and {@link CityDialog} take values,
 * {@link CitiesPanel} is the one place that knows there is a store. Which city is chosen and which one's box is open
 * are the store's (CARTO-384): the white arrow writes them from the canvas, a click on the point or a double-click.
 */

/** What `{Cities}` is handed. */
export interface CitiesPanelProps {
  /** The store the cities and the document live in. */
  store: CartographerStoreHook
  /** The polities' colours, for the advanced filters' swatches and the rows' dots — the canvas reads the same source. */
  colours: PolityColourSource
}

/**
 * `{Cities}`, bound to the store.
 * @param props - the store and the polities' colours
 * @param props.store - the store the cities and the document live in
 * @param props.colours - where the polities' colours come from, for the advanced filters' swatches — the canvas reads
 *   the same source
 * @returns the panel
 */
export function CitiesPanel({ store, colours }: CitiesPanelProps) {
  // Store
  const all = store((state) => state.cities)
  const load = store((state) => state.citiesLoad)
  const shown = store((state) => state.shownCities)
  const asPoints = store((state) => state.citiesAsPoints)
  const document = store((state) => state.document)
  const selected = store((state) => state.selectedCity)
  const opened = store((state) => state.openedCity)
  // Rendered again on each version: the document is mutated in place, so its identity does not say it changed.
  store((state) => state.version)

  // Store actions
  const setCityShown = store((state) => state.setCityShown)
  const setCitiesShown = store((state) => state.setCitiesShown)
  const setCitiesAsPoints = store((state) => state.setCitiesAsPoints)
  const selectCity = store((state) => state.selectCity)
  const openCity = store((state) => state.openCity)
  const closeCity = store((state) => state.closeCity)

  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const { cities, verdicts, openedCity, openedVerdict } = useCitiesView(all, document, opened)
  const status = citiesStatus(load, cities.length, document.year)
  const filters = useCityFilters(store, colours, cities, verdicts)
  const dotOf = useHolderDots(store, colours)

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
            selected={selected}
            opened={opened}
            verdicts={verdicts}
            dotOf={dotOf}
            onShown={setCityShown}
            onAllShown={setCitiesShown}
            asPoints={asPoints}
            onAsPoints={setCitiesAsPoints}
            onSelect={selectCity}
            onOpen={openCity}
            filters={filters}
          />
          <p className="panel__hint">{t('hint')}</p>
          <CityDialog openedCity={openedCity} openedVerdict={openedVerdict} onClose={closeCity} />
        </>
      )}
    </Panel>
  )
}
