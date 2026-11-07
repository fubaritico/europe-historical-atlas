import { Checkbox } from '@fubaritico/react/Checkbox'

import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { TreeBox } from './TreeBox'

import type { MapHolderChoice } from '../utils/holderChoices'
import type { CSSProperties } from 'react'

/**
 * One polity of the map in the advanced filters: a dot of its colour, its box, indented as {Polities} indents it; greyed
 * without a Wikidata id, and greyed too when the filter keeps it only to hold a vassal found under it. Its box stands for
 * it and its whole descent (CARTO-388): ticking France ticks Champagne and Normandy under it.
 * @param props - the polity, whether it is kept only for the tree, its keys, the holders ticked and the callback
 * @param props.choice - the polity
 * @param props.dimmed - whether it is kept only to hold a vassal found under it
 * @param props.keys - its key and its descent's
 * @param props.ticked - the holders ticked
 * @param props.onTickHolders - its keys were ticked or unticked, all at once
 * @returns the row
 */
export function MapHolderRow({
  choice,
  dimmed,
  keys,
  ticked,
  onTickHolders,
}: {
  choice: MapHolderChoice
  dimmed: boolean
  keys: readonly string[]
  ticked: ReadonlySet<string>
  onTickHolders: (keys: readonly string[], ticked: boolean) => void
}) {
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
        <TreeBox
          keys={keys}
          label={t('holderCount', { name: choice.name, count: String(choice.count) })}
          ticked={ticked}
          onTickHolders={onTickHolders}
        />
      )}
    </li>
  )
}
