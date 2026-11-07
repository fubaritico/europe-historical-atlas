import type { KeyboardEvent } from 'react'

/** What a city's name is handed: the city, whether it is chosen, and the two callbacks. */
export interface CityNameProps {
  /** The city's id, handed back to the callbacks. */
  id: string
  /** Its name, the button's text. */
  name: string
  /** Whether it is the city chosen. */
  chosen: boolean
  /** The name was clicked: the city is chosen. */
  onSelect: (id: string) => void
  /** The name was double-clicked, or ‹enter› pressed on it: its information box opens. */
  onOpen: (id: string) => void
}

/**
 * A city's name in `{Cities}`: a click chooses the city, a double-click or ‹enter› opens its information box
 * (CARTO-384). A button, so ‹enter› opens the box as the double-click does (review A11Y-003). **‹enter› keeps the
 * button's own click from following** (the dev, 2026-11-07, in his Chrome: the box did not open): the box takes the
 * focus as it opens, so the browser's click for the key landed on its « Fermer » and closed it at once.
 * @param props - the city, whether it is chosen, and the callbacks
 * @param props.id - the city's id
 * @param props.name - its name
 * @param props.chosen - whether it is the city chosen
 * @param props.onSelect - the name was clicked
 * @param props.onOpen - the name was double-clicked, or ‹enter› pressed on it
 * @returns the button
 */
export function CityName({ id, name, chosen, onSelect, onOpen }: CityNameProps) {
  // Handlers
  const handleSelect = () => {
    onSelect(id)
  }
  const handleOpen = () => {
    onOpen(id)
  }
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onOpen(id)
  }

  // Render
  return (
    <button
      type="button"
      className="layer-row__name city-row__name"
      aria-current={chosen ? 'true' : undefined}
      onClick={handleSelect}
      onDoubleClick={handleOpen}
      onKeyDown={handleKey}
    >
      {name}
    </button>
  )
}
