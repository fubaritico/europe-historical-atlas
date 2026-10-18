import { ToolFlyout } from './ToolFlyout'

import type { ToolVariant } from './FlyoutItem'

/**
 * A group's flyout, wired to close once a row is chosen.
 * @param props - the group's name, its rows, the one in use, the choice and the close
 * @param props.label - the group's name, from which the flyout's accessible name is made
 * @param props.variants - the group's rows, in order
 * @param props.current - the id of the variant in use
 * @param props.onVariant - takes a variant, given its id; the flyout closes after it
 * @param props.close - closes the flyout, after a choice or on dismissal
 * @returns the flyout
 */
export function GroupFlyout({
  label,
  variants,
  current,
  onVariant,
  close,
}: {
  label: string
  variants: readonly ToolVariant[]
  current: string
  onVariant: (id: string) => void
  close: () => void
}) {
  // Handlers
  const handleChoose = (id: string) => {
    onVariant(id)
    close()
  }

  // Render
  return (
    <ToolFlyout
      label={`${label} tools`}
      variants={variants}
      current={current}
      onChoose={handleChoose}
      onDismiss={close}
    />
  )
}
