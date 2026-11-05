import { Checkbox } from '@fubaritico/react/Checkbox'

import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import type { ChangeEvent } from 'react'

/** What the two boxes heading the city list show and report. */
export interface CityBoxesProps {
  /** How many cities the filter lets through, when one is typed; `null` with none. */
  found: number | null
  /** The year open, named on the first box. */
  year: number
  /** Whether every city listed is shown. */
  allShown: boolean
  /** The first box was ticked or not. */
  onAll: () => void
  /** Whether the cities shown are drawn as points. */
  asPoints: boolean
  /** The second box was ticked or not. */
  onAsPoints: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * The two boxes heading `{Cities}`' list (the dev, 2026-11-05): « Afficher toutes les villes » — those the filter lets
 * through, when one is typed — and « Afficher comme des points ».
 * @param props - what they show and report
 * @param props.found - how many cities the filter lets through, `null` with none typed
 * @param props.year - the year open
 * @param props.allShown - whether every city listed is shown
 * @param props.onAll - the first box was ticked or not
 * @param props.asPoints - whether the cities shown are drawn as points
 * @param props.onAsPoints - the second box was ticked or not
 * @returns the boxes
 */
export function CityBoxes({ found, year, allShown, onAll, asPoints, onAsPoints }: CityBoxesProps) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const label =
    found === null ? t('showAll', { year: String(year) }) : t('showFound', { count: found })

  // Render
  return (
    <div className="city-boxes">
      <Checkbox size="sm" label={label} checked={allShown} onChange={onAll} />
      <Checkbox size="sm" label={t('asPoints')} checked={asPoints} onChange={onAsPoints} />
    </div>
  )
}
