import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { CHROME_PAINT_STYLE } from '../canvas/style'
import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { UNFRAMED } from '../view/viewport'

import { Editor } from './Editor'

import type { MapAreaProps } from './MapArea'

/**
 * What the stand-in `MapArea` was handed, last time it rendered.
 *
 * **The area is replaced rather than mounted, and that is the point of this suite.** What `Editor` does
 * is decide which zone takes what and hold **one** ref across two of them; mounting the real area would
 * drag in a backdrop, a bake and a 2D context, and the assertion would be about none of those. The area
 * itself is covered by `MapArea.test.tsx`.
 */
let handed: MapAreaProps | null = null

vi.mock('./MapArea', () => ({
  MapArea: (props: MapAreaProps) => {
    handed = props
    return <div data-testid="map-area" />
  },
}))

/** The editor, mounted with everything the entry gives it. */
function mount(): void {
  handed = null
  render(
    <Editor
      store={createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })}
      load={() => new Promise(() => undefined)}
      style={CHROME_PAINT_STYLE}
      zoneLabel="editorial zone — 1100"
      label="Map of the year 1100, being edited"
      heading={<h1>Cartographer — year 1100</h1>}
    />
  )
}

describe('Editor', () => {
  describe('happy path', () => {
    it('puts the map in the canvas zone, {Polities} in the dock, and leaves the rest named and empty', () => {
      mount()

      expect(document.querySelector('.shell__canvas [data-testid="map-area"]')).not.toBeNull()
      expect(document.querySelector('.shell__dock .polities')).not.toBeNull()
      expect([...document.querySelectorAll('.empty-zone')].map((n) => n.textContent)).toEqual([
        'app bar',
        'document bar',
        'tools',
      ])
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

      const bar = document.querySelector('p.shell__status')
      expect(bar).not.toBeNull()
      expect(handed?.statusRef.current).toBe(bar)
    })

    it('forwards the heading, which the shell puts inside the landmark', () => {
      mount()

      expect(document.querySelector('main.shell__canvas > h1')?.textContent).toBe(
        'Cartographer — year 1100'
      )
    })

    it('passes the area the names and the style it needs, unchanged', () => {
      mount()

      expect(handed?.zoneLabel).toBe('editorial zone — 1100')
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
