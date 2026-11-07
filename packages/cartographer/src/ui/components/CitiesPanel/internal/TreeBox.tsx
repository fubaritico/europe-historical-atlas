import { Checkbox } from '@fubaritico/react/Checkbox'

import { treeBoxState } from '../utils/holderTree'

/**
 * A polity's box in the advanced filters (CARTO-388): it stands for the polity **and its whole descent**. Checked when
 * all of them are ticked, in the design system's mixed state (a dash) when some are; a click ticks them all, or unticks
 * them all when all are.
 * @param props - the keys it stands for, its label, the holders ticked and the callback
 * @param props.keys - the polity's key and its descent's (`treeKeys`)
 * @param props.label - its label, its count in it
 * @param props.ticked - the holders ticked
 * @param props.onTickHolders - its keys were ticked or unticked, all at once
 * @returns the box
 */
export function TreeBox({
  keys,
  label,
  ticked,
  onTickHolders,
}: {
  keys: readonly string[]
  label: string
  ticked: ReadonlySet<string>
  onTickHolders: (keys: readonly string[], ticked: boolean) => void
}) {
  // Derived
  const state = treeBoxState(keys, ticked)

  // Handlers
  const handleChange = () => {
    // From mixed, a click ticks the whole descent: the box is then what its label says.
    onTickHolders(keys, state !== 'checked')
  }

  // Render
  return (
    <Checkbox
      size="sm"
      label={label}
      checked={state === 'checked'}
      indeterminate={state === 'mixed'}
      onChange={handleChange}
    />
  )
}
