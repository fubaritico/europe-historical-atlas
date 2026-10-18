import type { LineScope } from '../lineScope'

/**
 * One scope choice.
 * @param props - the value, the scope chosen, whether the border is on offer, and the callback
 * @param props.value - this choice
 * @param props.scope - the scope chosen
 * @param props.canDressBorder - whether the whole border is on offer
 * @param props.onScope - the scope was changed
 * @returns the radio
 */
export function ScopeButton({
  value,
  scope,
  canDressBorder,
  onScope,
}: {
  value: LineScope
  scope: LineScope
  canDressBorder: boolean
  onScope: (scope: LineScope) => void
}) {
  // Derived
  const unavailable = value === 'border' && !canDressBorder

  // Handlers
  const handleClick = () => {
    if (unavailable) {
      console.warn(
        '[Cartographer] whole border refused: the stretch runs against more than one neighbour, or none.'
      )
      return
    }
    onScope(value)
  }

  // Render
  return (
    <button
      type="button"
      role="radio"
      className="line-panel__choice"
      aria-checked={scope === value}
      aria-disabled={unavailable ? 'true' : undefined}
      title={unavailable ? 'The stretch runs against more than one neighbour, or none' : undefined}
      onClick={handleClick}
    >
      {value === 'stretch' ? 'This stretch' : 'Whole border'}
    </button>
  )
}
