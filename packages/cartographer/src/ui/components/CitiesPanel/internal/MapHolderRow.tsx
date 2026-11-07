import { Checkbox } from '@fubaritico/react/Checkbox'

import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { HolderBox } from './HolderBox'

import type { CityFiltersProps } from '../cityFiltersProps'
import type { MapHolderChoice } from '../utils/holderChoices'
import type { CSSProperties } from 'react'

/**
 * One polity of the map in the advanced filters: a dot of its colour, its box, indented as {Polities} indents it; greyed
 * without a Wikidata id, and greyed too when the filter keeps it only to hold a vassal found under it.
 * @param props - the polity, whether it is kept only for the tree, the holders ticked and the callback
 * @param props.choice - the polity
 * @param props.dimmed - whether it is kept only to hold a vassal found under it
 * @param props.ticked - the holders ticked
 * @param props.onTick - its box was ticked or unticked
 * @returns the row
 */
export function MapHolderRow({
  choice,
  dimmed,
  ticked,
  onTick,
}: Pick<CityFiltersProps, 'ticked' | 'onTick'> & { choice: MapHolderChoice; dimmed: boolean }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Render
  return (
    <li
      className="city-filters__box"
      data-dimmed={dimmed}
      // The tree's indent, as {Polities} draws it — the width is the stylesheet's.
      style={{ '--polity-depth': choice.depth } as CSSProperties}
    >
      <span
        className="polity-row__swatch"
        data-empty={choice.colour === null}
        style={choice.colour === null ? undefined : { background: choice.colour }}
        aria-hidden="true"
      />
      {choice.key === null ? (
        <Checkbox
          size="sm"
          label={t('noWikidata', { name: choice.name })}
          checked={false}
          disabled
          readOnly
        />
      ) : (
        <HolderBox
          holderKey={choice.key}
          label={t('holderCount', { name: choice.name, count: String(choice.count) })}
          ticked={ticked}
          onTick={onTick}
        />
      )}
    </li>
  )
}
