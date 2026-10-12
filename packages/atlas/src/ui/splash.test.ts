// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MAP_TYPEFACE } from '@europe-historical-atlas/core/utils/lettering'

import {
  buildSplashFigure,
  buildSplashLine,
  buildSplashPanel,
  createSplash,
  withLambdaForA,
} from './splash'

import type { SplashSilhouette } from './splash'

/** A two-triangle stand-in, so a test never depends on the real coastline. */
const SHAPE: SplashSilhouette = { path: 'M0 0L10 0L10 10Z', width: 10, height: 20 }

/**
 * What the eye is given, per line: the glyph spans joined back into a word.
 * @param host - the element the splash was mounted into
 * @returns one lettered string per line, in document order
 */
function eyeLines(host: HTMLElement): string[] {
  // An empty glyph is the word gap, read back as the space it draws.
  return [...host.querySelectorAll('p')].map((line) =>
    [...line.querySelectorAll('span[aria-hidden]')]
      .map((s) => (s.textContent === '' ? ' ' : s.textContent))
      .join('')
  )
}

/**
 * What a screen reader is given, per line.
 * @param host - the element the splash was mounted into
 * @returns one plain string per line, in document order
 */
function spokenLines(host: HTMLElement): string[] {
  return [...host.querySelectorAll('p')].map(
    (line) => line.querySelector('span:not([aria-hidden])')?.textContent ?? ''
  )
}

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
    it('mounts a filled outline between its two lines', () => {
      const { host } = mount()
      const path = host.querySelector('path')
      expect(path?.getAttribute('d')).toBe(SHAPE.path)
      expect(eyeLines(host)).toEqual(['EUROPE', 'HISTORICΛL ΛTLΛS'])
    })

    it('puts the subject above the outline and the title below it', () => {
      const { host } = mount()
      const panel = host.firstElementChild
      expect([...(panel?.children ?? [])].map((c) => c.tagName)).toEqual(['P', 'svg', 'P'])
    })

    it('gives all three blocks one measure', () => {
      // The whole point of the layout: the two lines are tracked out to the width the outline is drawn
      // at, so the block reads as a single rectangle.
      const { host } = mount({ size: 264 })
      for (const line of host.querySelectorAll('p')) expect(line.style.width).toBe('264px')
      expect(host.querySelector('svg')?.getAttribute('width')).toBe('264')
    })

    it('announces the plain words, not the glyph game', () => {
      const { host } = mount()
      // A screen reader spelling out "HISTORICΛL" would be worse than no lettering at all.
      expect(spokenLines(host)).toEqual(['Europe', 'Historical atlas'])
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
      expect(eyeLines(host)[1]).toBe('ΛTLΛS')
      expect(spokenLines(host)[1]).toBe('Atlas')
    })

    it('takes a different subject', () => {
      const { host } = mount({ subject: 'Asia' })
      expect(eyeLines(host)[0]).toBe('ΛSIΛ')
      expect(spokenLines(host)[0]).toBe('Asia')
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

describe('buildSplashPanel', () => {
  describe('happy path', () => {
    it('announces itself politely rather than interrupting', () => {
      const panel = buildSplashPanel('#efe6d2', 420)
      expect(panel.getAttribute('role')).toBe('status')
      expect(panel.getAttribute('aria-live')).toBe('polite')
    })

    it('paints itself in the page colour it was given', () => {
      // jsdom normalises a hex literal to its rgb() form, so read the parsed property, not the text.
      expect(buildSplashPanel('#123456', 420).style.backgroundColor).toBe('rgb(18, 52, 86)')
    })
  })

  describe('variants', () => {
    it('carries the fade duration it was given', () => {
      expect(buildSplashPanel('#efe6d2', 420).style.cssText).toContain('420ms')
    })

    it('takes a zero fade without dropping the transition declaration', () => {
      // Reduced motion is expressed as a duration of zero, not as an absent transition — otherwise the
      // element's opacity jump would be unstyled rather than deliberately instant.
      expect(buildSplashPanel('#efe6d2', 0).style.cssText).toContain('0ms')
    })
  })

  // L3 (managed errors): N/A — it builds an element from two values and handles no failure of its own.

  describe('unmanaged errors', () => {
    it('cannot have a declaration smuggled in through the colour', () => {
      // The colour is interpolated into a style string, so a value carrying a `;` looks like an
      // injection. The CSS parser rejects the whole malformed declaration instead of honouring it:
      // the panel keeps its own stacking order. Asserted because the interpolation is still there.
      expect(buildSplashPanel('red;z-index:9999', 0).style.zIndex).toBe('20')
    })
  })

  describe('edge cases', () => {
    it('is not mounted by building it', () => {
      expect(buildSplashPanel('#efe6d2', 420).parentElement).toBeNull()
    })
  })
})

describe('buildSplashFigure', () => {
  describe('happy path', () => {
    it('draws the path it was given', () => {
      expect(
        buildSplashFigure(SHAPE, 100, '#5c3a2e').querySelector('path')?.getAttribute('d')
      ).toBe(SHAPE.path)
    })

    it('hides itself from assistive technology, the caption naming it instead', () => {
      expect(buildSplashFigure(SHAPE, 100, '#5c3a2e').getAttribute('aria-hidden')).toBe('true')
    })
  })

  describe('variants', () => {
    it('keeps the outline aspect instead of stretching it to the asked width', () => {
      // SHAPE is 10 wide by 20 tall, so 100 across must come out 200 down.
      const figure = buildSplashFigure(SHAPE, 100, '#5c3a2e')
      expect(figure.getAttribute('width')).toBe('100')
      expect(figure.getAttribute('height')).toBe('200')
    })

    it('fills in the ink it was given', () => {
      expect(
        buildSplashFigure(SHAPE, 100, '#abcdef').querySelector('path')?.getAttribute('fill')
      ).toBe('#abcdef')
    })

    it('reads an inland sea as a hole, not as filled land', () => {
      expect(
        buildSplashFigure(SHAPE, 100, '#5c3a2e').querySelector('path')?.getAttribute('fill-rule')
      ).toBe('evenodd')
    })
  })

  // L3 (managed errors): N/A — no failure is handled; a degenerate outline is covered below.

  describe('unmanaged errors', () => {
    it('carries a zero-width outline through as a non-finite height rather than guessing one', () => {
      const figure = buildSplashFigure({ path: 'M0 0Z', width: 0, height: 20 }, 100, '#000')
      expect(figure.getAttribute('height')).toBe('Infinity')
    })
  })

  describe('edge cases', () => {
    it('rounds the height to a whole pixel', () => {
      expect(
        buildSplashFigure({ path: 'M0 0Z', width: 3, height: 7 }, 10, '#000').getAttribute('height')
      ).toBe('23')
    })
  })
})

/** What the eye gets: the glyph spans, joined back into a word. */
const lettered = (line: HTMLElement): string =>
  [...line.querySelectorAll('span[aria-hidden]')].map((s) => s.textContent).join('')

/** What a screen reader gets: the one span that is read but not seen. */
const spoken = (line: HTMLElement): string =>
  line.querySelector('span:not([aria-hidden])')?.textContent ?? ''

// Pinned to the constant rather than to a font name: `scene/mapTitle` asserts the same thing
// against the same constant, which is what keeps the two screens from drifting apart.
// Compared stripped of quotes and spaces: jsdom renormalises a family list the way it
// renormalises a hex colour into `rgb()`, so the raw strings never match.
const bare = (list: string): string => list.replace(/['" ]/g, '')

describe('buildSplashLine', () => {
  describe('happy path', () => {
    it('letters the title for the eye', () => {
      expect(lettered(buildSplashLine('Atlas', '#5c3a2e', 300, 15))).toBe('ΛTLΛS')
    })

    it('sets it in the shared face, the one the map title uses', () => {
      const line = buildSplashLine('Atlas', '#5c3a2e', 300, 15)
      expect(bare(line.style.fontFamily)).toBe(bare(MAP_TYPEFACE))
    })

    it('names it in plain words for a screen reader', () => {
      // In the element, not on it: `aria-label` on a `<p>` has no role to attach to, and the glyph
      // spans on their own would be spelled out letter by letter.
      expect(spoken(buildSplashLine('Atlas', '#5c3a2e', 300, 15))).toBe('Atlas')
    })
  })

  describe('variants', () => {
    it('takes the ink it was given', () => {
      expect(buildSplashLine('Atlas', '#abcdef', 300, 15).style.color).toBe('rgb(171, 205, 239)')
    })

    it('fills exactly the measure it was given, so every block shares one', () => {
      const line = buildSplashLine('Atlas', '#5c3a2e', 264, 15)
      expect(line.style.width).toBe('264px')
      expect(line.style.justifyContent).toBe('space-between')
    })

    it('takes the cap size it was given', () => {
      expect(buildSplashLine('Europe', '#000', 300, 42).style.fontSize).toBe('42px')
    })

    it('spends a space on an empty item, buying two gaps where there was one', () => {
      // `space-between` puts an equal gap between every pair, so a wider item would do nothing; an
      // extra one is what separates the words.
      const line = buildSplashLine('Ab c', '#000', 300, 15)
      const glyphs = [...line.querySelectorAll('span[aria-hidden]')]
      expect(glyphs).toHaveLength(4)
      expect(glyphs[2]?.textContent).toBe('')
    })

    it('keeps the glyphs away from assistive technology', () => {
      const line = buildSplashLine('Atlas', '#000', 300, 15)
      for (const glyph of line.querySelectorAll('span[aria-hidden]'))
        expect(glyph.getAttribute('aria-hidden')).toBe('true')
    })
  })

  // L3 (managed errors): N/A — it formats a string and handles no failure.

  describe('unmanaged errors', () => {
    it('keeps the accessible name even when the lettering swallows every letter', () => {
      expect(spoken(buildSplashLine('aaa', '#000', 300, 15))).toBe('aaa')
    })

    it('keeps the hidden name out of the layout, so it takes no share of the tracking', () => {
      const line = buildSplashLine('Atlas', '#000', 300, 15)
      expect(line.querySelector<HTMLElement>('span:not([aria-hidden])')?.style.position).toBe(
        'absolute'
      )
    })
  })

  describe('edge cases', () => {
    it('survives an empty title without losing its accessible name', () => {
      const line = buildSplashLine('', '#000', 300, 15)
      expect(lettered(line)).toBe('')
      expect(spoken(line)).toBe('')
    })

    it('sets a single letter without it going anywhere', () => {
      expect(lettered(buildSplashLine('E', '#000', 300, 42))).toBe('E')
    })
  })
})
