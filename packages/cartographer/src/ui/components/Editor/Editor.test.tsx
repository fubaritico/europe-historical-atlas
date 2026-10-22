import { act, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { createHistoryRelay } from '../../../canvas/history/historyRelay'
import { CHROME_PAINT_STYLE } from '../../../canvas/paint/style'
import { createResultRelay } from '../../../persistence/resultRelay'
import { openEmptyYear } from '../../../state/openEmptyYear'
import { createPolityColourSource } from '../../../state/polityColourSource'
import { createCartographerStore } from '../../../state/store'
import { UNFRAMED } from '../../../viewport/viewport'
import { renderInEnglish } from '../../testing/renderInEnglish'

import { Editor } from './Editor'

import type { MapAreaProps } from '../MapArea'

/** A Wikidata source that knows nothing — the form's panel stays quiet (CARTO-243). */
const NO_WIKIDATA = { read: () => Promise.resolve({ found: new Map(), unknown: [] }) }

/** One colour source for the mounts below, over the shipped palette. */
const COLOURS = createPolityColourSource(AUTOMATIC_PALETTE)

/**
 * What the stand-in `MapArea` was handed, last time it rendered.
 *
 * **The area is replaced rather than mounted, and that is the point of this suite.** What `Editor` does
 * is decide which zone takes what and hold **one** ref across two of them; mounting the real area would
 * drag in a backdrop, a bake and a 2D context, and the assertion would be about none of those. The area
 * itself is covered by `MapArea.test.tsx`.
 */
let handed: MapAreaProps | null = null

vi.mock('../MapArea', () => ({
  MapArea: (props: MapAreaProps) => {
    handed = props
    return <div data-testid="map-area" />
  },
}))

/**
 * The editor, mounted with everything the entry gives it.
 * @param results - the relay the year session says into; a fresh one by default
 */
function mount(results = createResultRelay()): void {
  handed = null
  renderInEnglish(
    <Editor
      store={createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })}
      load={() => new Promise(() => undefined)}
      style={CHROME_PAINT_STYLE}
      heading={<h1>Cartographer — year 1100</h1>}
      onSave={() => undefined}
      onOpenSnapshot={() => undefined}
      history={createHistoryRelay()}
      colours={COLOURS}
      results={results}
      wikidata={NO_WIKIDATA}
    />
  )
}

/** The text in the status bar's result zone. */
function resultText(): string | null | undefined {
  return document.querySelector('.shell__result')?.textContent
}

describe('Editor', () => {
  describe('happy path', () => {
    it('puts the map in the canvas zone, the tools in the rail, {Polities} in the dock, the bars on top, and leaves no zone empty', () => {
      mount()

      expect(document.querySelector('.shell__canvas [data-testid="map-area"]')).not.toBeNull()
      expect(document.querySelector('.shell__rail [role="toolbar"]')).not.toBeNull()
      const dock = document.querySelector<HTMLElement>('.shell__dock')
      expect(
        dock === null ? null : within(dock).queryByRole('region', { name: 'Polities' })
      ).not.toBeNull()
      expect(document.querySelector('.shell__appbar .app-brand__name')?.textContent).toBe(
        'Europe Historical Atlas Cartographer'
      )
      expect(document.querySelector('.shell__docbar .doc-tab')).not.toBeNull()
      expect(document.querySelectorAll('.empty-zone')).toHaveLength(0)
    })
  })

  describe('messages from outside React', () => {
    it('shows a message said before the page mounted, once it has', () => {
      const results = createResultRelay()
      results.say('opened 1100 · 2 polities · 8 vertices')

      mount(results)

      expect(resultText()).toBe('opened 1100 · 2 polities · 8 vertices')
    })

    it('shows a message said after the page mounted', () => {
      const results = createResultRelay()
      mount(results)

      act(() => {
        results.say('saved 1100 · 2 polities · 8 vertices')
      })

      expect(resultText()).toBe('saved 1100 · 2 polities · 8 vertices')
    })
  })

  describe('variants', () => {
    /*
     * THE guard of this component, and the only defect it can really have.
     *
     * The plausible version creates a ref for the `<p>` and lets `MapArea` create its own — which
     * compiles, renders, and looks right: there is a status bar, and the map is on screen. Every pointer
     * sample then writes into an element that is attached to nothing, so the bar simply never updates.
     * Nothing throws and no other test can see it, because the two halves are in different files.
     */
    it('hands the map the very node the shell rendered, not a second ref', () => {
      mount()

      // Asserted on the node rather than on the timing: the `<p>` comes after the canvas in tree order,
      // so a reader wonders whether the ref is filled yet. It is — refs are attached during the commit,
      // and the first pointer sample is many frames later. A separate test for that was written and
      // removed: it failed on exactly this defect and guarded nothing of its own.

      const position = document.querySelector('p.shell__status > .shell__position')
      const action = document.querySelector('p.shell__status > .shell__action')
      expect(position).not.toBeNull()
      expect(action).not.toBeNull()
      expect(handed?.statusRef.current).toBe(position)
      expect(handed?.actionRef.current).toBe(action)
      // A11Y-001: only the result zone speaks; the action and the position change per pointer sample.
      const result = document.querySelector('p.shell__status > .shell__result')
      expect(handed?.resultRef.current).toBe(result)
      expect(result?.getAttribute('role')).toBe('status')
      expect(action?.getAttribute('role')).toBeNull()
      expect(position?.getAttribute('role')).toBeNull()
    })

    it('forwards the heading, which the shell puts inside the landmark', () => {
      mount()

      expect(document.querySelector('main.shell__canvas > h1')?.textContent).toBe(
        'Cartographer — year 1100'
      )
    })

    it('passes the area its label and the style it needs, unchanged', () => {
      mount()

      expect(handed?.label).toBe('Map of the year 1100, being edited')
      expect(handed?.style).toBe(CHROME_PAINT_STYLE)
    })
  })

  describe('managed errors', () => {
    // The loader here never settles, which is the state the editor spends its first seconds in. The
    // shell must be fully laid out before the backdrop arrives — otherwise the window would appear to
    // build itself in two stages, and the dev's reason for the grid was precisely to stop that.
    it('lays out every zone while the backdrop is still loading', () => {
      mount()

      for (const zone of ['shell__appbar', 'shell__docbar', 'shell__rail', 'shell__dock'])
        expect(document.querySelector(`.${zone}`)).not.toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('renders exactly one status row, so nothing can write into the wrong one', () => {
      mount()

      expect(document.querySelectorAll('.shell__status')).toHaveLength(1)
    })
  })
})
