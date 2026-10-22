import { Typeahead } from '@fubaritico/react/Typeahead'
import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_FORM_MESSAGES } from '../i18n'
import { MAX_SUGGESTIONS, matchingOptions } from '../utils/suzerainSearch'

import { HeldSuzerain } from './HeldSuzerain'

import type { DraftOption } from '../../../utils/polityDraft'

/**
 * The suzerain, chosen by typing (CARTO-241): about 150 polities in 1100 were too many to scroll in a list.
 *
 * The polity held now is shown above the field, with a cross to remove it; the field is the design system's
 * `Typeahead`: it searches from the first letter, offers the matches (prefixes first, accents ignored,
 * `suzerainSearch.ts`) with the typed part in bold, and brings the keyboard and the combobox pattern. The
 * options are the ones the binding already cleared of every polity that would make a loop of homage.
 * @param props - the options, the polity held, and where the choice goes
 * @param props.options - the polities that may be chosen
 * @param props.value - the suzerain held now, or `null`
 * @param props.onSelect - called with the chosen id, or `null` to remove the suzerain
 * @returns the field
 */
export function SuzerainField({
  options,
  value,
  onSelect,
}: {
  options: readonly DraftOption[]
  value: string | null
  onSelect: (value: string | null) => void
}) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)

  // Refs
  const field = useRef<HTMLDivElement>(null)

  // State
  const [query, setQuery] = useState('')

  // Derived
  const known = options.find((option) => option.value === value)
  // A held id the list does not offer (a loop of homage already in the file) is shown as itself, and said.
  const held = value === null ? null : (known?.label ?? value)
  const matches = matchingOptions(options, query, MAX_SUGGESTIONS)

  // Handlers
  const handleSelect = (selected: string) => {
    onSelect(selected)
    setQuery('')
  }
  const handleRemove = () => {
    onSelect(null)
    // The cross unmounts with the suzerain: the focus goes to the field rather than to the dialogue (A11Y-001).
    field.current?.querySelector('input')?.focus()
  }

  // Effects
  useEffect(() => {
    if (value !== null && known === undefined)
      console.warn(
        `[Cartographer] the suzerain "${value}" is not among the polities offered — shown as its id`
      )
  }, [value, known])

  // Render
  return (
    <div ref={field} className="ui-field suzerain-field">
      {/* Visual only: the field carries the same name as its `aria-label`. */}
      <span className="ui-field__label" aria-hidden="true">
        {t('suzerain')}
      </span>
      <HeldSuzerain held={held} onRemove={handleRemove} />
      <Typeahead minChars={1} onSearch={setQuery} onSelect={handleSelect}>
        <Typeahead.Input aria-label={t('suzerain')} placeholder={t('suzerainPlaceholder')} />
        <Typeahead.Menu aria-label={t('suzerainList')}>
          {matches.map((option, index) => (
            <Typeahead.Item key={option.value} value={option.value} index={index}>
              <Typeahead.Highlight>{option.label}</Typeahead.Highlight>
            </Typeahead.Item>
          ))}
          {matches.length === 0 && <Typeahead.Empty>{t('noSuzerainMatch')}</Typeahead.Empty>}
        </Typeahead.Menu>
      </Typeahead>
    </div>
  )
}
