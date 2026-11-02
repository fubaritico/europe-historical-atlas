import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'

import { testStore } from '../../../../canvas/testGestureContext'
import { createPolityColourSource } from '../../../../state/polityColourSource'
import { renderInEnglish } from '../../../testing/renderInEnglish'

import { Dock } from './Dock'

/*
 * The panels moved by their head (CARTO-342), driven by pointer events on the real frames, with the page's boxes
 * stood in: jsdom lays nothing out. The column sits at x 920–1200 of a 1200 × 800 window; each docked frame is 100 px
 * tall, in its order.
 */

const NO_WIKIDATA = { read: () => Promise.resolve({ found: new Map(), unknown: [] }) }
const COLOURS = createPolityColourSource(AUTOMATIC_PALETTE)

/**
 * A box as `getBoundingClientRect` returns it.
 * @param left - its left
 * @param top - its top
 * @param width - its width
 * @param height - its height
 * @returns the box
 */
function box(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('dock-stack')) return box(920, 0, 280, 800)
    if (this instanceof HTMLElement && this.classList.contains('panel-frame')) {
      if (this.dataset.place === 'floating') return box(400, 200, 280, 200)
      const index = [...(this.parentElement?.children ?? [])].indexOf(this)
      return box(920, index * 100, 280, 100)
    }
    return box(0, 0, 0, 0)
  })
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  Element.prototype.setPointerCapture = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Mount the dock over a real store.
 * @returns the store
 */
function mount() {
  const store = testStore()
  renderInEnglish(
    <Dock store={store} colours={COLOURS} onResult={() => undefined} wikidata={NO_WIKIDATA} />
  )
  return store
}

/**
 * A docked panel's foot, its resize handle.
 * @param title - the panel's title
 * @returns the handle
 */
function footOf(title: string): Element {
  const foot = screen
    .getByRole('heading', { name: title })
    .closest('.panel-frame')
    ?.querySelector('.panel-frame__resize--bottom')
  if (!foot) throw new Error(`no foot for ${title}`)
  return foot
}

/**
 * Drag a panel by its head's title from one point to another.
 * @param title - the panel's title
 * @param from - where the press is
 * @param to - where the release is
 */
function drag(title: string, from: [number, number], to: [number, number]): void {
  const head = screen.getByRole('heading', { name: title })
  const frame = head.closest('.panel-frame')
  if (frame === null) throw new Error(`no frame for ${title}`)
  act(() => {
    fireEvent.pointerDown(head, { button: 0, clientX: from[0], clientY: from[1], pointerId: 1 })
    fireEvent.pointerMove(frame, {
      clientX: (from[0] + to[0]) / 2,
      clientY: (from[1] + to[1]) / 2,
      pointerId: 1,
    })
    fireEvent.pointerMove(frame, { clientX: to[0], clientY: to[1], pointerId: 1 })
    fireEvent.pointerUp(frame, { clientX: to[0], clientY: to[1], pointerId: 1 })
  })
}

// The dev, 2026-11-02: "draggable, resizable, magnetised to the right column, like in Illustrator".
describe('Dock', () => {
  describe('happy path', () => {
    it('floats {Cities} dragged over the canvas, where it is dropped, out of the column', () => {
      const store = mount()
      drag('Cities', [1000, 410], [500, 300])
      const { docked, floating } = store.getState().panelLayout
      expect(docked).not.toContain('cities')
      // The fifth frame, 400–500 px, moved by the pointer's −500, −110.
      expect(floating.cities).toEqual({ x: 420, y: 290, width: 280, height: 100 })
    })

    it('docks a floating {Cities} dragged back onto the column, at the place shown, and the line hides', () => {
      const store = mount()
      act(() => {
        store.getState().floatPanel('cities', { x: 400, y: 200, width: 280, height: 200 })
      })
      drag('Cities', [450, 210], [1000, 120])
      expect(store.getState().panelLayout.docked).toEqual([
        'polities',
        'cities',
        'line',
        'overrides',
        'layers',
      ])
      expect(document.querySelector<HTMLElement>('.dock-insert')?.hidden).toBe(true)
    })
  })

  describe('variants', () => {
    it('docks a panel dropped within the magnet’s reach left of the column', () => {
      const store = mount()
      act(() => {
        store.getState().floatPanel('cities', { x: 400, y: 200, width: 280, height: 200 })
      })
      drag('Cities', [450, 210], [905, 30])
      expect(store.getState().panelLayout.docked[0]).toBe('cities')
    })

    it('moves a docked panel within the column', () => {
      const store = mount()
      drag('Layers', [1000, 310], [1000, 20])
      expect(store.getState().panelLayout.docked).toEqual([
        'layers',
        'polities',
        'line',
        'overrides',
        'cities',
      ])
    })

    it('gives a docked panel the height its foot is dragged to', () => {
      const store = mount()
      const foot = footOf('Layers')
      act(() => {
        fireEvent.pointerDown(foot, { button: 0, clientX: 1000, clientY: 400, pointerId: 1 })
        fireEvent.pointerMove(foot, { clientX: 1000, clientY: 460, pointerId: 1 })
        fireEvent.pointerUp(foot, { clientX: 1000, clientY: 460, pointerId: 1 })
      })
      expect(store.getState().panelLayout.heights.layers).toBe(160)
    })
    it('widens a floating panel by its right edge', () => {
      const store = mount()
      act(() => {
        store.getState().floatPanel('cities', { x: 400, y: 200, width: 280, height: 200 })
      })
      const edge = screen
        .getByRole('heading', { name: 'Cities' })
        .closest('.panel-frame')
        ?.querySelector('.panel-frame__resize--right')
      if (!edge) throw new Error('no right edge')
      act(() => {
        fireEvent.pointerDown(edge, { button: 0, clientX: 680, clientY: 300, pointerId: 1 })
        fireEvent.pointerMove(edge, { clientX: 740, clientY: 300, pointerId: 1 })
        fireEvent.pointerUp(edge, { clientX: 740, clientY: 300, pointerId: 1 })
      })
      expect(store.getState().panelLayout.floating.cities).toEqual({
        x: 400,
        y: 200,
        width: 340,
        height: 200,
      })
    })
  })

  // L3, L4: the store refuses a width or a height that is no number — panelsSlice.test.ts.

  describe('edge cases', () => {
    it('moves nothing on a click on a head, the pointer still', () => {
      const store = mount()
      const before = store.getState().panelLayout
      drag('Cities', [1000, 410], [1001, 411])
      expect(store.getState().panelLayout).toBe(before)
    })

    it('moves nothing from a press on a control of a panel, dragged far over the canvas', () => {
      const store = mount()
      const before = store.getState().panelLayout
      const eye = screen.getByRole('button', { name: 'Hide borders' })
      const frame = eye.closest('.panel-frame')
      if (!frame) throw new Error('no frame round the eye')
      act(() => {
        fireEvent.pointerDown(eye, { button: 0, clientX: 1000, clientY: 330, pointerId: 1 })
        fireEvent.pointerMove(frame, { clientX: 500, clientY: 300, pointerId: 1 })
        fireEvent.pointerUp(frame, { clientX: 500, clientY: 300, pointerId: 1 })
      })
      expect(store.getState().panelLayout).toBe(before)
    })

    // Review QUAL-002: a click on a foot pinned the panel at its content's height, kept for good.
    it('pins no height on a click on a docked panel’s foot', () => {
      const store = mount()
      const foot = footOf('Layers')
      act(() => {
        fireEvent.pointerDown(foot, { button: 0, clientX: 1000, clientY: 400, pointerId: 1 })
        fireEvent.pointerUp(foot, { clientX: 1000, clientY: 401, pointerId: 1 })
      })
      expect(store.getState().panelLayout.heights).toEqual({})
    })

    // Review QUAL-001: a gesture the browser cancels decides nothing.
    it('leaves a panel where it was when the browser cancels its drag, its own style back', () => {
      const store = mount()
      const before = store.getState().panelLayout
      const head = screen.getByRole('heading', { name: 'Cities' })
      const frame = head.closest<HTMLElement>('.panel-frame')
      if (!frame) throw new Error('no frame')
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      act(() => {
        fireEvent.pointerDown(head, { button: 0, clientX: 1000, clientY: 410, pointerId: 1 })
        fireEvent.pointerMove(frame, { clientX: 500, clientY: 300, pointerId: 1 })
        fireEvent.pointerCancel(frame, { pointerId: 1 })
      })
      expect([store.getState().panelLayout, frame.style.position, warn.mock.calls.length]).toEqual([
        before,
        '',
        1,
      ])
    })
  })
})
