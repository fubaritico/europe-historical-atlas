import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { ColorField } from '@fubaritico/react/ColorField'
import { ColorPicker } from '@fubaritico/react/ColorPicker'
import { IconButton } from '@fubaritico/react/IconButton'
import { Input } from '@fubaritico/react/Input'

import { DRAFT_ERRORS, EMPTY_DRAFT } from '../components/polityDraft'
import { PolityForm } from '../components/PolityForm'
import { PolityList } from '../components/PolityList'
import { PolityStackMenu } from '../components/PolityStackMenu'
import { ToolRail } from '../components/ToolRail'

import type { WorkbenchEntry } from './Workbench'
import type { PolityRow } from '../components/polityRows'

/** Polities a new one could owe homage to, as the suzerain list offers them. */
const SUZERAINS = [
  { value: 'hre', label: 'Holy Roman Empire' },
  { value: 'byzantium', label: 'Byzantine Empire' },
]

/** A chosen colour for the colour plates — a mid blue, far from both the accent and the warning ink. */
const BLUE = { h: 214, s: 62, v: 68, a: 1 }

/** The form's callbacks, inert: a plate is looked at, not submitted. */
const INERT = {
  onField: () => undefined,
  onColour: () => undefined,
  onSubmit: () => undefined,
  onCancel: () => undefined,
}

/**
 * Every plate on the workbench, in the order they are listed.
 *
 * A plate mounts one piece of the chrome on literal data — never the store, never the backdrop — so it
 * can be looked at the second it is saved. Add one whenever a piece of the chrome has a state worth
 * judging on its own: an empty form, a filled one, an error.
 */
/** {Polities}' rows for the plate: two groups and a vassal, front first (s16). */
const PLATE_ROWS: PolityRow[] = [
  {
    id: 'hre',
    name: 'Holy Roman Empire',
    rank: 'empire',
    dates: '962–1806',
    colour: '#c29646',
    hasTerritory: true,
    depth: 0,
    suzerainName: null,
  },
  {
    id: 'fr-couronne',
    name: 'Reaume de France',
    rank: 'kingdom',
    dates: '987–',
    colour: '#54719b',
    hasTerritory: true,
    depth: 0,
    suzerainName: null,
  },
  {
    id: 'aq',
    name: 'Duchy of Aquitaine',
    rank: 'duchy',
    dates: '–',
    colour: '#6f8a52',
    hasTerritory: true,
    depth: 1,
    suzerainName: 'Reaume de France',
  },
  {
    id: 'pl',
    name: 'Kingdom of Poland',
    rank: 'kingdom',
    dates: '1025–',
    colour: '#b8554a',
    hasTerritory: false,
    depth: 0,
    suzerainName: null,
  },
]

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
  {
    id: 'colour-field',
    title: 'Colour field',
    note: "The design system's ColorField alone, between two Inputs so the label column and the 22px line can be compared. Top: automatic, as the form opens. Bottom: a colour chosen.",
    width: 340,
    render: () => (
      <div style={{ display: 'grid', gap: 10 }}>
        <Input label="Name" defaultValue="Reaume de France" />
        <ColorField label="Colour" defaultValue={null} nullable density="compact" />
        <ColorField label="Colour" defaultValue={BLUE} nullable density="compact" />
        <Input label="Wikidata id" placeholder="Q…" />
      </div>
    ),
  },
  {
    id: 'colour-field-open',
    title: 'Colour field, open',
    note: 'The popover opened from the start, so the panel is judged against the field it hangs from without clicking. Escape or a click outside closes it; reload to bring it back.',
    width: 340,
    render: () => (
      <div style={{ display: 'grid', gap: 10 }}>
        <Input label="Suzerain" placeholder="none" />
        <ColorField label="Colour" defaultValue={BLUE} nullable density="compact" defaultOpen />
      </div>
    ),
  },
  {
    id: 'colour-picker',
    title: 'Colour picker, flat',
    note: "The panel the popover holds, laid flat — area, hue, the automatic toggle and the hex — to tune it without the popover's positioning in the way.",
    width: 340,
    render: () => <ColorPicker defaultValue={BLUE} nullable density="compact" />,
  },
  {
    id: 'polity-list',
    title: 'Polities list',
    note: "{Polities}' list after design/01: a subhead naming the year and the count, one 24px row per polity — swatch, name, the no-territory chip, rank and dates — as the tree of groups, front first, Aquitaine a vassal of France (s16). Reaume de France is the target. Click a row, or focus the list and use the arrows and Enter.",
    render: () => (
      <div className="workbench__panel">
        <PolityList
          year={1100}
          targetId="fr-couronne"
          onChoose={() => undefined}
          onMenu={() => undefined}
          onEdit={() => undefined}
          rows={PLATE_ROWS}
        />
      </div>
    ),
  },
  {
    id: 'polity-stack-menu',
    title: 'Stacking menu',
    note: "A {Polities} row's menu (s16), opened at a point: Edit properties… then the four Arrange commands, Bring to Front and Bring Forward disabled — the polity is already at the front among its siblings. The design system's Menu, placed by our shell.",
    width: 300,
    render: () => (
      <div className="workbench__panel" style={{ height: 140 }}>
        <PolityStackMenu
          name="Reaume de France"
          at={{ x: 40, y: 40 }}
          moves={{ front: false, forward: false, backward: true, back: true }}
          onChoose={() => undefined}
          onEdit={() => undefined}
          onClose={() => undefined}
        />
      </div>
    ),
  },
  {
    id: 'tool-rail',
    title: 'Tool rail',
    note: "Illustrator's Tools panel, narrowed to three: the white arrow, the Pen, the hand. The Pen is in hand; its corner triangle says it heads a group — hold it, right-click it, or press → on it. The swatch is the aimed-at polity's colour.",
    width: 300,
    render: () => (
      <div className="workbench__rail">
        <ToolRail
          tool="draw"
          onSelect={() => undefined}
          swatch={{ name: 'Reaume de France', colour: '#54719b' }}
          penMode="free"
          onPenMode={() => undefined}
        />
      </div>
    ),
  },
  {
    id: 'tool-rail-group',
    title: 'Tool rail, Pen group open',
    note: "The Pen's hidden tools, as Illustrator lists them: the square marks the one in use, the key in brackets. Following the coast and following a river are both there.",
    width: 300,
    render: () => (
      <div className="workbench__rail">
        <ToolRail
          tool="draw"
          onSelect={() => undefined}
          swatch={null}
          initiallyOpen="draw"
          penMode="free"
          onPenMode={() => undefined}
        />
      </div>
    ),
  },
  {
    id: 'polity-form',
    title: 'Polity form',
    note: '[+ New polity] opens this, inside the Modal. Empty: nothing typed, every list on none.',
    width: 360,
    render: () => (
      <PolityForm
        title="New polity"
        draft={EMPTY_DRAFT}
        errors={{}}
        suzerains={SUZERAINS}
        {...INERT}
      />
    ),
  },
  {
    id: 'polity-form-refused',
    title: 'Polity form, refused',
    note: 'OK pressed with an id the year already holds and a year that is not a number: each message sits under its own field.',
    width: 360,
    render: () => (
      <PolityForm
        title="New polity"
        draft={{
          ...EMPTY_DRAFT,
          name: 'Reaume de France',
          id: 'fr-couronne',
          idEdited: true,
          rank: 'kingdom',
          status: 'country',
          existsFrom: '98a',
          suzerain: null,
          wikidata: 'Q70972',
        }}
        errors={{ id: DRAFT_ERRORS.idTaken, existsFrom: DRAFT_ERRORS.notAYear }}
        suzerains={SUZERAINS}
        {...INERT}
      />
    ),
  },
  {
    id: 'polity-form-colour',
    title: 'Polity form, colour chosen',
    note: 'Colour taken off automatic: the swatch shows it and the hex reads it. Press the swatch to judge the compact popover against the fields — it opens above, as it does inside the Modal.',
    width: 360,
    render: () => (
      <PolityForm
        title="New polity"
        draft={{
          ...EMPTY_DRAFT,
          name: 'Reaume de France',
          id: 'reaume-de-france',
          colour: { h: 214, s: 62, v: 68, a: 1 },
        }}
        errors={{}}
        suzerains={SUZERAINS}
        {...INERT}
      />
    ),
  },
]
