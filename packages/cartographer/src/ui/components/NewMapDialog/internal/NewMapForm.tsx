import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { useState } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { NEW_MAP_MESSAGES } from '../i18n'

import { NewMapFields } from './NewMapFields'

import type { NewMapOutcome, NewMapRefusal, NewMapRequest } from '../../../../persistence/newMap'
import type { ChangeEvent, SubmitEvent } from 'react'

/** What the form needs. */
export interface NewMapFormProps {
  /**
   * Create the map and open it — `persistence/newMap`'s `createNewMap`, bound by the composition root.
   * @param request - the year and the name typed
   * @returns done, or the refusal to show under its field
   */
  create: (request: NewMapRequest) => Promise<NewMapOutcome>
  /** Close the dialogue. */
  close: () => void
}

/**
 * The dialogue's form, mounted for one opening: the year, the name, then [Créer] or [Annuler]. A refusal is said under
 * the field it concerns, and clears when that field is typed in again.
 * @param props - what creating and closing do
 * @param props.create - create the map and open it
 * @param props.close - close the dialogue
 * @returns the card
 */
export function NewMapForm({ create, close }: NewMapFormProps) {
  // Context
  const t = useTranslation(NEW_MAP_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // State
  const [year, setYear] = useState('')
  const [name, setName] = useState('')
  const [refusal, setRefusal] = useState<NewMapRefusal | null>(null)
  const [creating, setCreating] = useState(false)

  // Handlers
  // Each field carries its name: the year's or the map's, and a refusal of that field clears as it is typed in.
  const handleField = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name: field, value } = event.target
    if (field === 'year') setYear(value)
    else setName(value)
    if (refusal?.field === field) setRefusal(null)
  }
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (creating) return
    setCreating(true)
    void create({ year, name }).then((outcome) => {
      setCreating(false)
      // A refusal said elsewhere (the question dismissed, a save's alarm) closes the form too; done reloads the page.
      if (outcome.done || outcome.refusal === null) close()
      else setRefusal(outcome.refusal)
    })
  }

  // Render
  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <Card.Header>{t('title')}</Card.Header>
        <Card.Body>
          <p className="short-dialogue__text">{t('text')}</p>
          <NewMapFields year={year} name={name} refusal={refusal} onChange={handleField} />
        </Card.Body>
        <Card.Footer align="end">
          <Button type="button" variant="secondary" onClick={close}>
            {action('cancel')}
          </Button>
          <Button type="submit" disabled={creating || year.trim() === '' || name.trim() === ''}>
            {creating ? t('creating') : t('create')}
          </Button>
        </Card.Footer>
      </Card>
    </form>
  )
}
