import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { IconButton } from '@fubaritico/react/IconButton'
import { Input } from '@fubaritico/react/Input'

import type { WorkbenchEntry } from './Workbench'

/**
 * Every plate on the workbench, in the order they are listed.
 *
 * A plate mounts one piece of the chrome on literal data — never the store, never the backdrop — so it
 * can be looked at the second it is saved. Add one whenever a piece of the chrome has a state worth
 * judging on its own: an empty form, a filled one, an error.
 */
export const WORKBENCH_ENTRIES: readonly WorkbenchEntry[] = [
  {
    id: 'fields',
    title: 'Fields',
    note: "The design system's Input after the fineness pass (styles/editor-chrome.css): design/chrome.css's proportions — 22px fields, 12px type, labels left and dimmed, nothing rounded. Buttons are still raw: they come last.",
    render: () => (
      <div style={{ display: 'grid', gap: 12 }}>
        <Input label="Name" placeholder="Kingdom of France" />
        <Input label="Exists from" defaultValue="987" />
        <Input
          label="Id"
          defaultValue="fr-couronne"
          message="This id is already taken in 1100."
          messageType="error"
        />
        <Input label="Wikidata id" placeholder="Q…" disabled />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary">Cancel</Button>
          <Button>OK</Button>
        </div>
      </div>
    ),
  },
  {
    id: 'dialog',
    title: 'Dialog',
    note: "A dialogue as the Modal composes it — a Card with a header, a body and a footer — drawn after Illustrator's Document Setup: a title bar in the fill and ink of the fields, title centred and bold. Mounted without the Modal shell, which would take the whole window.",
    width: 360,
    render: () => (
      <Card>
        <Card.Header>
          New polity
          <IconButton icon="XMark" aria-label="Close" />
        </Card.Header>
        <Card.Body>
          <Input label="Name" placeholder="Kingdom of France" />
          <Input label="Exists from" defaultValue="987" />
          <Input label="Wikidata id" placeholder="Q…" />
        </Card.Body>
        <Card.Footer align="end">
          <Button variant="secondary">Cancel</Button>
          <Button>OK</Button>
        </Card.Footer>
      </Card>
    ),
  },
]
