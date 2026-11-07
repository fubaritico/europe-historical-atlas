import { Checkbox } from '@fubaritico/react/Checkbox'

/**
 * One holder's box.
 * @param props - its key, its label, the holders ticked and the callback
 * @param props.holderKey - its key in the filter
 * @param props.label - its label, its count in it
 * @param props.ticked - the holders ticked
 * @param props.onTick - it was ticked or unticked
 * @returns the box
 */
export function HolderBox({
  holderKey,
  label,
  ticked,
  onTick,
}: {
  holderKey: string
  label: string
  ticked: ReadonlySet<string>
  onTick: (key: string, ticked: boolean) => void
}) {
  // Derived
  const checked = ticked.has(holderKey)

  // Handlers
  const handleChange = () => {
    onTick(holderKey, !checked)
  }

  // Render
  return <Checkbox size="sm" label={label} checked={checked} onChange={handleChange} />
}
