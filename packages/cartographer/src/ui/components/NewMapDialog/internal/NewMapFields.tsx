import { Input } from '@fubaritico/react/Input'

import { autofocusOnOpen } from '../../../hooks/autofocusOnOpen'
import { useTranslation } from '../../../hooks/useTranslation'
import { NEW_MAP_MESSAGES } from '../i18n'

import type { NewMapRefusal } from '../../../../persistence/newMap'
import type { ChangeEvent } from 'react'

/** What the two fields show and do. */
export interface NewMapFieldsProps {
  /** The year, as typed. */
  year: string
  /** The name, as typed. */
  name: string
  /** The refusal of the last try, said under its field — or `null`. */
  refusal: NewMapRefusal | null
  /**
   * A field typed in — named `year` or `name`, as the form reads it.
   * @param event - the field's change
   */
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * « Nouvelle carte »'s two fields: the year, focused at the opening, then the name — each with its hint, or the refusal
 * that concerns it (CARTO-536).
 * @param props - the values, the refusal and the change
 * @param props.year - the year typed
 * @param props.name - the name typed
 * @param props.refusal - the refusal, said under its field
 * @param props.onChange - a field typed in
 * @returns the fields
 */
export function NewMapFields({ year, name, refusal, onChange }: NewMapFieldsProps) {
  // Context
  const t = useTranslation(NEW_MAP_MESSAGES)

  // Derived
  const yearRefused = refusal?.field === 'year' ? refusal.text : null
  const nameRefused = refusal?.field === 'name' ? refusal.text : null

  // Render
  return (
    <>
      <Input
        ref={autofocusOnOpen}
        label={t('year')}
        name="year"
        inputMode="numeric"
        value={year}
        onChange={onChange}
        message={yearRefused ?? t('yearHint')}
        messageType={yearRefused === null ? 'info' : 'error'}
      />
      <Input
        label={t('name')}
        name="name"
        value={name}
        onChange={onChange}
        message={nameRefused ?? t('nameHint')}
        messageType={nameRefused === null ? 'info' : 'error'}
      />
    </>
  )
}
