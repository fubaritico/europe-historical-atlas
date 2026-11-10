import type { NamedItem } from '../../../wikidata/placeLot'
import type { LotField } from '../hooks/useWikidataLookup'
import type { ChangeEvent } from 'react'

/** What one list of the lot needs. */
interface LotChoiceProps {
  /** `country` or `region`. */
  field: LotField
  /** The items Wikidata gave for it — two or more. */
  items: NamedItem[]
  /**
   * Fill the field from the item chosen.
   * @param field - the field
   * @param item - the item
   * @returns nothing
   */
  onChoose: (field: LotField, item: NamedItem) => void
}

/** What each list is called. */
const LABEL: Readonly<Record<LotField, string>> = {
  country: 'Plusieurs pays dans Wikidata — choisissez',
  region: 'Plusieurs régions dans Wikidata — choisissez',
}

/**
 * The list offering the countries, or the regions, Wikidata gave for one place — nothing is filled until one is chosen
 * (the dev, 2026-11-10: *"s'il y a plusieurs pays, ne rien mettre, mais … un menu déroulant"*).
 * @param props - the field, its items and what choosing does
 * @param props.field
 * @param props.items
 * @param props.onChoose
 * @returns the labelled list
 */
export function LotChoice({ field, items, onChoose }: LotChoiceProps) {
  const id = `wikidata-lookup-${field}`

  // Handlers
  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const item = items.find((each) => each.wikidata === event.target.value)
    if (item !== undefined) onChoose(field, item)
  }

  return (
    <p className="wikidata-lookup__lot">
      <label htmlFor={id}>{LABEL[field]}</label>
      <select id={id} defaultValue="" onChange={handleChange}>
        <option value="" disabled>
          —
        </option>
        {items.map((item) => (
          <option key={item.wikidata} value={item.wikidata}>
            {item.name} ({item.wikidata})
          </option>
        ))}
      </select>
    </p>
  )
}
