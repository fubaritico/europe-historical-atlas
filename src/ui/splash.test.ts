// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSplash, withLambdaForA } from './splash'

import type { SplashSilhouette } from './splash'

/** A two-triangle stand-in, so a test never depends on the real coastline. */
const SHAPE: SplashSilhouette = { path: 'M0 0L10 0L10 10Z', width: 10, height: 20 }

/** Mount a splash into a fresh host. */
function mount(overrides: Partial<Parameters<typeof createSplash>[0]> = {}): {
  host: HTMLElement
  splash: ReturnType<typeof createSplash>
} {
  const host = document.createElement('div')
  document.body.appendChild(host)
  return { host, splash: createSplash({ host, silhouette: SHAPE, ...overrides }) }
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('withLambdaForA', () => {
  describe('happy path', () => {
    it('swaps every A for a capital lambda', () => {
      expect(withLambdaForA('Historical atlas')).toBe('HistoricΛl ΛtlΛs')
    })
  })

  describe('variants', () => {
    it('takes lower case as well as upper', () => {
      expect(withLambdaForA('aA')).toBe('ΛΛ')
    })

    it('leaves a title with no A alone', () => {
      expect(withLambdaForA('Europe')).toBe('Europe')
    })
  })

  // L3/L4: N/A — a total string replacement with nothing to validate and nothing to throw.

  describe('edge cases', () => {
    it('handles an empty title', () => {
      expect(withLambdaForA('')).toBe('')
    })
  })
})

describe('createSplash', () => {
  describe('happy path', () => {
    it('mounts a filled outline and a title', () => {
      const { host } = mount()
      const path = host.querySelector('path')
      expect(path?.getAttribute('d')).toBe(SHAPE.path)
      expect(host.querySelector('p')?.textContent).toBe('HISTORICΛL ΛTLΛS')
    })

    it('announces the plain words, not the glyph game', () => {
      const { host } = mount()
      // A screen reader spelling out "HISTORICΛL" would be worse than no lettering at all.
      expect(host.querySelector('p')?.getAttribute('aria-label')).toBe('Historical atlas')
      expect(host.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    })

    it('is a polite live region, so the wait is announced once', () => {
      const { splash } = mount()
      expect(splash.element.getAttribute('role')).toBe('status')
      expect(splash.element.getAttribute('aria-live')).toBe('polite')
    })
  })

  describe('variants', () => {
    it('keeps the outline’s own aspect rather than stretching it to the width', () => {
      const { host } = mount({ size: 300 })
      const svg = host.querySelector('svg')
      expect(svg?.getAttribute('width')).toBe('300')
      expect(svg?.getAttribute('height')).toBe('600') // 10 wide by 20 tall, doubled
      expect(svg?.getAttribute('viewBox')).toBe('0 0 10 20')
    })

    it('takes the ink and the background it is given', () => {
      const { host, splash } = mount({ ink: '#123456', background: '#abcdef' })
      expect(host.querySelector('path')?.getAttribute('fill')).toBe('#123456')
      expect(splash.element.style.background).toContain('rgb(171, 205, 239)')
    })

    it('takes a different title', () => {
      const { host } = mount({ title: 'Atlas' })
      expect(host.querySelector('p')?.textContent).toBe('ΛTLΛS')
      expect(host.querySelector('p')?.getAttribute('aria-label')).toBe('Atlas')
    })

    it('fills even-odd, so an inland sea reads as a hole', () => {
      const { host } = mount()
      expect(host.querySelector('path')?.getAttribute('fill-rule')).toBe('evenodd')
    })
  })

  describe('managed errors', () => {
    it('unmounts at once under prefers-reduced-motion, with no fade to wait through', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }))
      const { host, splash } = mount()
      splash.dismiss()
      expect(host.querySelector('svg')).toBeNull()
    })

    it('survives a second dismiss without resurrecting itself', () => {
      vi.useFakeTimers()
      const { host, splash } = mount()
      splash.dismiss()
      splash.dismiss()
      vi.runAllTimers()
      expect(host.querySelector('svg')).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('mounts without a matchMedia to consult', () => {
      vi.stubGlobal('matchMedia', undefined)
      expect(() => mount()).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('stays on screen until the fade has run', () => {
      vi.useFakeTimers()
      const { host, splash } = mount()
      splash.dismiss()
      expect(splash.element.style.opacity).toBe('0')
      expect(host.querySelector('svg')).not.toBeNull() // still fading
      vi.runAllTimers()
      expect(host.querySelector('svg')).toBeNull()
    })

    it('drops a pending fade on dispose rather than firing into a torn-down page', () => {
      vi.useFakeTimers()
      const { host, splash } = mount()
      splash.dismiss()
      splash.dispose()
      expect(host.querySelector('svg')).toBeNull()
      expect(() => {
        vi.runAllTimers()
      }).not.toThrow()
    })

    it('handles an outline with no path at all', () => {
      const { host } = mount({ silhouette: { path: '', width: 1, height: 1 } })
      expect(host.querySelector('path')?.getAttribute('d')).toBe('')
    })
  })
})
