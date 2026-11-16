import { Typeahead } from '@fubaritico/react/Typeahead'
import { useRef, useState } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_FORM_MESSAGES } from '../i18n'
import { MAX_SUGGESTIONS, matchingOptions } from '../utils/suzerainSearch'

import { HeldSuzerain } from './HeldSuzerain'

import type { DraftOption } from '../../../utils/polityDraft'

/**
 * The CMS territory a polity is tied to (CARTO-450, the dev's rule of 2026-11-16: *« s'il n'y a pas Wikidata, c'est l'ID
 * pour aller chercher la province »*): a city's chain finds the polity by it where the polity has no Wikidata id — the
 * Thuringia of 1100. Chosen by typing, as the suzerain is: the territory held above the field with its cross, the
 * design system's `Typeahead` under it. With no territory read — an export older than CARTO-450 — the field says to
 * export again.
 * @param props - the territories, the one held, and where the choice goes
 * @param props.options - the CMS's territories, as value (number) and label
 * @param props.value - the territory held now, or `null`
 * @param props.onSelect - called with the chosen number, or `null` to remove it
 * @returns the field
 */
export function TerritoryField({
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
  // A number the export does not list (a territory deleted since) is shown as itself: the file keeps it
  const held =
    value === null ? null : (options.find((option) => option.value === value)?.label ?? value)
  const matches = matchingOptions(options, query, MAX_SUGGESTIONS)

  // Handlers
  const handleSelect = (selected: string) => {
    onSelect(selected)
    setQuery('')
  }
  const handleRemove = () => {
    onSelect(null)
    // The cross unmounts with the territory: the focus goes to the field rather than to the dialogue
    field.current?.querySelector('input')?.focus()
  }

  // Render
  return (
    <div ref={field} className="ui-field suzerain-field">
      {/* Visual only: the field carries the same name as its `aria-label`. */}
      <span className="ui-field__label" aria-hidden="true">
        {t('territory')}
      </span>
      <HeldSuzerain held={held} removeKey="removeTerritory" onRemove={handleRemove} />
      <Typeahead minChars={1} onSearch={setQuery} onSelect={handleSelect}>
        <Typeahead.Input aria-label={t('territory')} placeholder={t('territoryPlaceholder')} />
        <Typeahead.Menu aria-label={t('territoryList')}>
          {matches.map((option, index) => (
            <Typeahead.Item key={option.value} value={option.value} index={index}>
              <Typeahead.Highlight>{option.label}</Typeahead.Highlight>
            </Typeahead.Item>
          ))}
          {matches.length === 0 && (
            <Typeahead.Empty>
              {options.length === 0 ? t('noTerritories') : t('noTerritoryMatch')}
            </Typeahead.Empty>
          )}
        </Typeahead.Menu>
      </Typeahead>
      <p className="ui-field__message">{t('territoryHelp')}</p>
    </div>
  )
}
