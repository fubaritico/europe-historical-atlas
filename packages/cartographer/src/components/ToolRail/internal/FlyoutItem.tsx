import { ToolIcon } from '../../ToolIcon'

import type { ToolIconName } from '../../ToolIcon'
import type { KeyboardEvent } from 'react'

/** One variant of a tool group, as the flyout lists it. */
export interface ToolVariant {
  /** Stable id, what a choice reports. */
  id: string
  /** What the row reads. */
  label: string
  /** The key that takes it, shown in brackets as Illustrator does — `null` when it has none. */
  shortcut: string | null
  /** Its glyph. */
  icon: ToolIconName
  /** Whether it can be chosen today. A disabled row stays listed, so the group's shape is visible. */
  enabled: boolean
}

/**
 * One row: the square that marks the variant in use, its glyph, its name, its key.
 * @param props - the variant, whether it is current, and the choice
 * @param props.variant - the variant the row shows: its name, glyph, key and whether it can be chosen
 * @param props.checked - whether it is the variant in use, marked by the square
 * @param props.onChoose - takes the variant, given its id; never called for a disabled row
 * @returns the menu item
 */
export function FlyoutItem({
  variant,
  checked,
  onChoose,
}: {
  variant: ToolVariant
  checked: boolean
  onChoose: (id: string) => void
}) {
  // Handlers
  const handleClick = () => {
    if (variant.enabled) onChoose(variant.id)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if ((event.key === 'Enter' || event.key === ' ') && variant.enabled) {
      event.preventDefault()
      onChoose(variant.id)
    }
  }

  // Render
  return (
    <li
      role="menuitemradio"
      aria-checked={checked}
      aria-disabled={!variant.enabled}
      tabIndex={-1}
      className="tool-rail__item"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span className="tool-rail__mark" aria-hidden="true" />
      <ToolIcon name={variant.icon} />
      <span>{variant.label}</span>
      <span className="tool-rail__key">
        {variant.shortcut === null ? '' : `(${variant.shortcut})`}
      </span>
    </li>
  )
}
