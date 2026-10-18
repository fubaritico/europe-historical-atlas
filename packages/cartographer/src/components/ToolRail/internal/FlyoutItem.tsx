import { ToolIcon } from '../../ToolIcon'

import type { ToolVariant } from './ToolFlyout'
import type { KeyboardEvent } from 'react'

/**
 * One row: the square that marks the variant in use, its glyph, its name, its key.
 * @param props - the variant, whether it is current, and the choice
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
