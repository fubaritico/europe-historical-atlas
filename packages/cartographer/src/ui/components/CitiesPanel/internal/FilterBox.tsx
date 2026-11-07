import { Checkbox } from '@fubaritico/react/Checkbox'

/**
 * One box of the advanced filters — a holder (CARTO-370) or a state (CARTO-369), ticked by its key in its own set.
 * @param props - its key, its label, the keys ticked of its kind and the callback
 * @param props.boxKey - its key in the filter: a holder's (`holderKey`) or a state's
 * @param props.label - its label, its count in it
 * @param props.ticked - the keys ticked of its kind
 * @param props.onTick - it was ticked or unticked
 * @returns the box
 */
export function FilterBox({
  boxKey,
  label,
  ticked,
  onTick,
}: {
  boxKey: string
  label: string
  ticked: ReadonlySet<string>
  onTick: (key: string, ticked: boolean) => void
}) {
  // Derived
  const checked = ticked.has(boxKey)

  // Handlers
  const handleChange = () => {
    onTick(boxKey, !checked)
  }

  // Render
  return <Checkbox size="sm" label={label} checked={checked} onChange={handleChange} />
}
