import { ToolFlyout } from './ToolFlyout'

import type { ToolVariant } from './FlyoutItem'

/**
 * A group's flyout, wired to close once a row is chosen.
 * @param props - the group's name, its rows, the one in use, the choice and the close
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
