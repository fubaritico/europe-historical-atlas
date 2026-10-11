import { useEffect, useEffectEvent, useRef } from 'react'

import { ToolIcon } from './toolIcons'

import type { ToolIconName } from './toolIcons'
import type { KeyboardEvent, RefObject } from 'react'

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

/** What the flyout needs. */
export interface ToolFlyoutProps {
  /** Its accessible name — the group's. */
  label: string
  /** The rows, in order. */
  variants: readonly ToolVariant[]
  /** The variant in use, marked by the square. */
  current: string
  /** A row was chosen. */
  onChoose: (id: string) => void
  /** Escape, or a click outside: close without choosing. */
  onDismiss: () => void
}

/**
 * The menu items a key may land on: the enabled rows, in order.
 * @param menu - the menu element
 * @returns its enabled items
 */
function enabledItems(menu: HTMLElement): HTMLElement[] {
  return [
    ...menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]:not([aria-disabled="true"])'),
  ]
}

/**
 * Move the focus among the enabled rows on ↑ and ↓, wrapping — the WAI-ARIA menu pattern.
 * @param event - the key event, on the menu
 */
function moveFocus(event: KeyboardEvent<HTMLUListElement>): void {
  const items = enabledItems(event.currentTarget)
  const at = items.findIndex((item) => item === document.activeElement)
  const step = event.key === 'ArrowDown' ? 1 : -1
  items[(at + step + items.length) % items.length]?.focus()
}

/**
 * One row: the square that marks the variant in use, its glyph, its name, its key.
 * @param props - the variant, whether it is current, and the choice
 * @returns the menu item
 */
function FlyoutItem({
  variant,
  checked,
  onChoose,
}: {
  variant: ToolVariant
  checked: boolean
  onChoose: (id: string) => void
}) {
  return (
    <li
      role="menuitemradio"
      aria-checked={checked}
      aria-disabled={!variant.enabled}
      tabIndex={-1}
      className="tool-rail__item"
      onClick={() => {
        if (variant.enabled) onChoose(variant.id)
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && variant.enabled) {
          event.preventDefault()
          onChoose(variant.id)
        }
      }}
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

/**
 * Focus the current row when the flyout opens, and close it on a press anywhere outside.
 * @param menu - the menu element
 * @param onDismiss - close without choosing
 */
function useFlyoutFocus(menu: RefObject<HTMLUListElement | null>, onDismiss: () => void): void {
  // An effect event, so a parent re-render — a new `onDismiss` each time — does not re-run the effect
  // and pull the focus back to the checked row while the author is moving through the list.
  const dismiss = useEffectEvent(onDismiss)
  useEffect(() => {
    const node = menu.current
    if (node === null) return undefined
    const checked = node.querySelector<HTMLElement>('[aria-checked="true"]')
    ;(checked ?? enabledItems(node)[0])?.focus()
    const outside = (event: PointerEvent): void => {
      if (!(event.target instanceof Node) || !node.contains(event.target)) dismiss()
    }
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)
    }
  }, [menu])
}

/**
 * A tool group's flyout — Illustrator's hidden tools, opened beside the button.
 *
 * **A menu of radio items**, because choosing one replaces the others in the group: `role="menu"`,
 * `menuitemradio` with `aria-checked`. Focus lands on the current row when it opens; ↑ ↓ move, Enter
 * or Space choose, Escape closes. A click outside closes it too, which is what any flyout does.
 *
 * **Ours rather than the design system's Popover**, for one reason: the Popover opens on a click of its
 * trigger, and here a click *selects the tool* — the flyout answers a long press, a right click or →. The
 * day the Popover takes a trigger it does not own, this becomes a change of import.
 * @param props - the rows, the current one and the two callbacks
 * @returns the menu
 */
export function ToolFlyout({ label, variants, current, onChoose, onDismiss }: ToolFlyoutProps) {
  const menu = useRef<HTMLUListElement | null>(null)
  useFlyoutFocus(menu, onDismiss)
  return (
    <ul
      ref={menu}
      role="menu"
      aria-label={label}
      className="tool-rail__flyout"
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          moveFocus(event)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          onDismiss()
        }
      }}
    >
      {variants.map((variant) => (
        <FlyoutItem
          key={variant.id}
          variant={variant}
          checked={variant.id === current}
          onChoose={onChoose}
        />
      ))}
    </ul>
  )
}
