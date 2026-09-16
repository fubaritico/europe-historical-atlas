// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { createProgressOverlay } from './progressOverlay'

import type { ProgressOverlay } from './progressOverlay'

let mounted: ProgressOverlay | null = null

/** Mount a panel into a fresh host, and remember it so each test tears its own down. */
function mount(): { overlay: ProgressOverlay; host: HTMLElement } {
  const host = document.createElement('div')
  document.body.append(host)
  const overlay = createProgressOverlay({ host })
  mounted = overlay
  return { overlay, host }
}

/** The bar element, which carries both the width and the accessible value. */
function bar(overlay: ProgressOverlay): HTMLElement {
  const element = overlay.element.querySelector('[role="progressbar"]')
  if (!(element instanceof HTMLElement)) throw new Error('no progressbar in the panel')
  return element
}

afterEach(() => {
  mounted?.dispose()
  mounted = null
  document.body.replaceChildren()
})

describe('progressOverlay', () => {
  describe('happy path', () => {
    it('stays hidden until there is something to report', () => {
      const { overlay } = mount()
      expect(overlay.element.hidden).toBe(true)
    })

    it('shows itself and names the work when a run begins', () => {
      const { overlay } = mount()
      overlay.begin('Chargement…')
      expect(overlay.element.hidden).toBe(false)
      expect(overlay.element.textContent).toContain('Chargement…')
    })

    it('moves the bar and its accessible value together', () => {
      const { overlay } = mount()
      overlay.begin('start')
      overlay.report(0.42)
      const track = bar(overlay)
      expect(track.getAttribute('aria-valuenow')).toBe('42')
      expect((track.firstElementChild as HTMLElement).style.width).toBe('42%')
    })

    it('hides again when the run ends', () => {
      const { overlay } = mount()
      overlay.begin('start')
      overlay.end()
      expect(overlay.element.hidden).toBe(true)
    })
  })

  describe('variants', () => {
    it('renames the step without being told a new fraction', () => {
      const { overlay } = mount()
      overlay.begin('first')
      overlay.report(0.5, 'second')
      expect(overlay.element.textContent).toContain('second')
      expect(bar(overlay).getAttribute('aria-valuenow')).toBe('50')
    })

    it('keeps the label when none is given', () => {
      const { overlay } = mount()
      overlay.begin('only label')
      overlay.report(0.8)
      expect(overlay.element.textContent).toContain('only label')
    })

    it('takes the ink and background it is given', () => {
      const host = document.createElement('div')
      document.body.append(host)
      const overlay = createProgressOverlay({ host, ink: '#123456', background: '#abcdef' })
      mounted = overlay
      expect(overlay.element.style.color).toBe('rgb(18, 52, 86)')
      expect(overlay.element.style.background).toContain('rgb(171, 205, 239)')
    })
  })

  describe('managed errors', () => {
    it('clamps a fraction above one', () => {
      const { overlay } = mount()
      overlay.begin('start')
      overlay.report(4)
      expect(bar(overlay).getAttribute('aria-valuenow')).toBe('100')
    })

    it('clamps a fraction below zero', () => {
      const { overlay } = mount()
      overlay.begin('start')
      overlay.report(-2)
      expect(bar(overlay).getAttribute('aria-valuenow')).toBe('0')
    })

    it('ends quietly when it was never begun', () => {
      const { overlay } = mount()
      expect(() => {
        overlay.end()
      }).not.toThrow()
      expect(overlay.element.hidden).toBe(true)
    })
  })

  describe('unmanaged errors', () => {
    it('treats a NaN fraction as no progress rather than writing NaN into the DOM', () => {
      // A NaN width is silently dropped by the browser and a NaN aria value is read aloud as garbage;
      // neither throws, so nothing would flag it.
      const { overlay } = mount()
      overlay.begin('start')
      overlay.report(Number.NaN)
      expect(bar(overlay).getAttribute('aria-valuenow')).toBe('0')
    })

    it('treats an infinite fraction as no information, not as complete', () => {
      // One rule for every non-finite value: it means the caller does not know where it is, which is
      // nearer to nothing done than to everything done. Announcing 100 % on garbage would be a lie.
      const { overlay } = mount()
      overlay.begin('start')
      overlay.report(Number.POSITIVE_INFINITY)
      expect(bar(overlay).getAttribute('aria-valuenow')).toBe('0')
    })
  })

  describe('edge cases', () => {
    it('announces itself politely, being information rather than a problem', () => {
      const { overlay } = mount()
      expect(overlay.element.getAttribute('role')).toBe('status')
      expect(overlay.element.getAttribute('aria-live')).toBe('polite')
    })

    it('carries a real progressbar with its bounds, not a decorative div', () => {
      // The canvas has no DOM equivalent, so this panel is the only thing a screen reader can be told
      // about while the map is busy.
      const track = bar(mount().overlay)
      expect(track.getAttribute('aria-valuemin')).toBe('0')
      expect(track.getAttribute('aria-valuemax')).toBe('100')
    })

    it('names the bar after the step, so the value is not announced bare', () => {
      const { overlay } = mount()
      overlay.begin('Extension jusqu’aux côtes…')
      expect(bar(overlay).getAttribute('aria-label')).toBe('Extension jusqu’aux côtes…')
    })

    it('resets to zero on end, so the next run does not start full', () => {
      const { overlay } = mount()
      overlay.begin('start')
      overlay.report(1)
      overlay.end()
      expect(bar(overlay).getAttribute('aria-valuenow')).toBe('0')
    })

    it('leaves nothing behind on dispose', () => {
      const { overlay, host } = mount()
      overlay.dispose()
      mounted = null
      expect(host.children).toHaveLength(0)
    })

    it('lets the pointer through, being an indicator and not a dialog', () => {
      expect(mount().overlay.element.style.pointerEvents).toBe('none')
    })
  })
})
