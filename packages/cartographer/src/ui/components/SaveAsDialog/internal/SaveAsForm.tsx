import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Input } from '@fubaritico/react/Input'
import { useState } from 'react'

import { autofocusOnOpen } from '../../../hooks/autofocusOnOpen'
import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { SAVE_AS_MESSAGES } from '../i18n'

import type { SaveAsOutcome } from '../../../../persistence/yearSession'
import type { ChangeEvent, SubmitEvent } from 'react'

/** What the form needs. */
export interface SaveAsFormProps {
  /**
   * Save the map open, then write it as the map named — the session's *Save as…*.
   * @param name - the name typed
   * @returns done, or the refusal to show under the field
   */
  saveAs: (name: string) => Promise<SaveAsOutcome>
  /** Close the dialogue. */
  close: () => void
}

/**
 * The dialogue's form, mounted for one opening: the name, then [Save] or [Cancel].
 * @param props - what saving and closing do
 * @param props.saveAs - the session's *Save as…*
 * @param props.close - close the dialogue
 * @returns the card
 */
export function SaveAsForm({ saveAs, close }: SaveAsFormProps) {
  // Context
  const t = useTranslation(SAVE_AS_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // State
  const [name, setName] = useState('')
  const [refusal, setRefusal] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Handlers
  const handleName = (event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.target.value)
    setRefusal(null)
  }
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    void saveAs(name.trim()).then((outcome) => {
      setSaving(false)
      // A refusal the session said elsewhere (the save of the map open failed: its alarm is up) closes the form too.
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
          <Input
            ref={autofocusOnOpen}
            label={t('name')}
            value={name}
            onChange={handleName}
            message={refusal ?? t('hint')}
            messageType={refusal === null ? 'info' : 'error'}
          />
        </Card.Body>
        <Card.Footer align="end">
          <Button type="button" variant="secondary" onClick={close}>
            {action('cancel')}
          </Button>
          <Button type="submit" disabled={saving || name.trim() === ''}>
            {saving ? t('saving') : action('save')}
          </Button>
        </Card.Footer>
      </Card>
    </form>
  )
}
