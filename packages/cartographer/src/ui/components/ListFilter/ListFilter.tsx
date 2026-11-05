import { Input } from '@fubaritico/react/Input'

import { useTranslation } from '../../hooks/useTranslation'

import { LIST_FILTER_MESSAGES } from './i18n'

import type { ChangeEvent, KeyboardEvent } from 'react'

/** What the field shows and reports. The text typed is its owner's: the field holds nothing. */
export interface ListFilterProps {
  /** What is typed, as the owner keeps it. */
  value: string
  /** The text changed — a key typed, or ‹esc› clearing it. */
  onChange: (value: string) => void
  /** The field's accessible name — what it filters (« Filtrer les villes »). */
  label: string
}

/**
 * A panel's filter field (CARTO-360, the dev, 2026-11-05: *« ça fait gagner énormément de temps »*): the design
 * system's field with its magnifier, at the head of a long list. **‹esc› clears it** when it holds something; empty, it
 * leaves ‹esc› to whatever listens beyond it. A text field keeps its own keys (`keepsItsOwnKeys`), so a letter typed
 * here never picks a tool.
 * @param props - the text, its change and the field's name
 * @param props.value - what is typed
 * @param props.onChange - reports the new text
 * @param props.label - the field's accessible name
 * @returns the field
 */
export function ListFilter({ value, onChange, label }: ListFilterProps) {
  // Context
  const t = useTranslation(LIST_FILTER_MESSAGES)

  // Handlers
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape' || value === '') return
    event.preventDefault()
    event.stopPropagation()
    onChange('')
  }

  // Render
  return (
    <div className="list-filter">
      <Input
        type="search"
        icon="MagnifyingGlass"
        size="sm"
        aria-label={label}
        placeholder={t('placeholder')}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  )
}
