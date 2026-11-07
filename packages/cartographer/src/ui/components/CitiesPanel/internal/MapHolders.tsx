import { useTranslation } from '../../../hooks/useTranslation'
import { filterRows } from '../../../utils/filterRows'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { MapHolderRow } from './MapHolderRow'

import type { CityFiltersProps } from '../cityFiltersProps'

/**
 * « Par pays, selon les sources » (CARTO-370): the polities of the map as {Polities} lists them — a dot of its colour,
 * the tree, and how many cities the sources give each. Under the dialogue's filter, as in {Polities} (CARTO-360): the
 * polities whose name answers, each under its suzerains, greyed (the dev, 2026-11-07: a long list wants its filter).
 * @param props - the choices, what is typed, the holders ticked and the callback
 * @param props.choices - what the dialogue offers
 * @param props.query - what is typed in the dialogue's filter
 * @param props.ticked - the holders ticked
 * @param props.onTick - a box was ticked or unticked
 * @returns the section
 */
export function MapHolders({
  choices,
  query,
  ticked,
  onTick,
}: Pick<CityFiltersProps, 'choices' | 'ticked' | 'onTick'> & { query: string }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const { rows, dimmed } = filterRows(choices.onMap, query)

  // Render
  return (
    <section className="city-filters__section" aria-label={t('byHolder')}>
      <h3 className="city-filters__heading">{t('byHolder')}</h3>
      <p className="short-dialogue__text">{t('byHolderHint')}</p>
      {rows.length === 0 ? (
        <p className="short-dialogue__text">{t('noHolderMatch', { query: query.trim() })}</p>
      ) : (
        <ul className="city-filters__list">
          {rows.map((choice) => (
            <MapHolderRow
              key={choice.id}
              choice={choice}
              dimmed={dimmed.has(choice.id)}
              ticked={ticked}
              onTick={onTick}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
