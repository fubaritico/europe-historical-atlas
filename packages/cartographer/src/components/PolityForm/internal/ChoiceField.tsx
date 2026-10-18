import { Dropdown } from '@fubaritico/react/Dropdown'

import type { DraftOption } from '../../shared/polityDraft'

/** The value standing for "none" in a list — the design system's Dropdown selects strings only. */
const NONE = ''

/** A list laid out like a field: the label left, the choice right, "none" first. */
export function ChoiceField({
  label,
  options,
  value,
  onSelect,
}: {
  label: string
  options: readonly DraftOption[]
  value: string | null
  onSelect: (value: string | null) => void
}) {
  // Handlers
  const handleSelect = (selected: string) => {
    onSelect(selected === NONE ? null : selected)
  }

  // Render
  return (
    <div className="ui-field">
      {/* Visual only: the trigger carries the same name as its `aria-label`. */}
      <span className="ui-field__label" aria-hidden="true">
        {label}
      </span>
      <Dropdown
        aria-label={label}
        selectedValue={value ?? NONE}
        onSelect={handleSelect}
        options={[{ value: NONE, label: 'none' }, ...options]}
      />
    </div>
  )
}
