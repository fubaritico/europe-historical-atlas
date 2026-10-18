/**
 * One pattern choice.
 * @param props - the pattern, whether it is the one in force, and the callback
 * @param props.pattern - this pattern
 * @param props.chosen - whether it is the hand in force
 * @param props.onHand - a pattern was chosen
 * @returns the button
 */
export function PatternButton({
  pattern,
  chosen,
  onHand,
}: {
  pattern: { hand: string | null; label: string }
  chosen: boolean
  onHand: (hand: string | null) => void
}) {
  // Handlers
  const handleClick = () => {
    onHand(pattern.hand)
  }

  // Render
  return (
    <button
      type="button"
      className="line-panel__choice"
      aria-pressed={chosen}
      onClick={handleClick}
    >
      {pattern.label}
    </button>
  )
}
