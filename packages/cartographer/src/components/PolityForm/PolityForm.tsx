import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { IconButton } from '@fubaritico/react/IconButton'

import { PolityFields } from './internal/PolityFields'

import type { PolityFieldsProps } from './internal/PolityFields'
import type { SubmitEvent } from 'react'

/**
 * What the polity form shows and what it reports: what its fields render and report, plus the title and the
 * two ways out. Never the store: the binding, `PolityDialog`, reads the store and hands this view literals.
 */
export interface PolityFormProps extends PolityFieldsProps {
  /** The dialogue's title. */
  title: string
  /** [OK] or ‹enter›: read the form. */
  onSubmit: () => void
  /** [Cancel] or the close cross: leave without creating anything. */
  onCancel: () => void
}

/**
 * The polity form: `s02`'s eight fields plus the id, as a dialogue — a `Card` with a title bar, the
 * fields, and Cancel/OK. The view of the shell/view/binding split: literals in, events out.
 *
 * **Every button but OK is `type="button"`**, the close cross included: inside a `<form>` a button
 * submits by default, so a forgotten type would turn "close" into "create".
 * @param props - the values and the callbacks
 * @returns the form
 */
export function PolityForm(props: PolityFormProps) {
  // Derived
  const { title, onSubmit, onCancel } = props

  // Handlers
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  // Render
  return (
    <form className="polity-form" noValidate onSubmit={handleSubmit}>
      <Card>
        <Card.Header>
          {title}
          <IconButton type="button" icon="XMark" aria-label="Close" onClick={onCancel} />
        </Card.Header>
        <Card.Body>
          <PolityFields {...props} />
        </Card.Body>
        <Card.Footer align="end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">OK</Button>
        </Card.Footer>
      </Card>
    </form>
  )
}
