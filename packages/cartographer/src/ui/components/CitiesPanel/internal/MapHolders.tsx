import { useTranslation } from '../../../hooks/useTranslation'
import { filterRows } from '../../../utils/filterRows'
import { CITIES_PANEL_MESSAGES } from '../i18n'
import { keysOf, treeKeys } from '../utils/holderTree'

import { MapHolderRow } from './MapHolderRow'

import type { CityFiltersProps } from '../cityFiltersProps'

/**
 * « Par pays, selon les sources » (CARTO-370): the polities of the map as {Polities} lists them — a dot of its colour,
 * the tree, and how many cities the sources give each. Under the dialogue's filter, as in {Polities} (CARTO-360): the
 * polities whose name answers, each under its suzerains, greyed (the dev, 2026-11-07: a long list wants its filter).
 * A polity's box stands for it and its whole descent (CARTO-388), ticked or unticked in one change.
 * @param props - the choices, what is typed, the holders ticked and the callback
 * @param props.choices - what the dialogue offers
 * @param props.query - what is typed in the dialogue's filter
 * @param props.ticked - the holders ticked
 * @param props.onTickHolders - a polity's box was ticked or unticked: its keys and its descent's
 * @returns the section
 */
export function MapHolders({
  choices,
  query,
  ticked,
  onTickHolders,
}: Pick<CityFiltersProps, 'choices' | 'ticked' | 'onTickHolders'> & { query: string }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const { rows, dimmed } = filterRows(choices.onMap, query)
  // Built over the whole list, never the rows the filter kept: a vassal hidden by what is typed is still under its suzerain.
  const keys = treeKeys(choices.onMap)

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
              keys={keysOf(keys, choice.id)}
              ticked={ticked}
              onTickHolders={onTickHolders}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
