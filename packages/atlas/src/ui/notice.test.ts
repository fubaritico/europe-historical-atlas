// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildDismissButton,
  buildNoticeBoardElement,
  buildNoticePanel,
  createNoticeBoard,
} from './notice'

/** Mount a board into a fresh host. */
function mount(): { host: HTMLElement; board: ReturnType<typeof createNoticeBoard> } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  return { host, board: createNoticeBoard({ host }) }
}

/** Every posted panel, in document order. */
function panels(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>('[role]')]
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('createNoticeBoard', () => {
  describe('happy path', () => {
    it('posts a notice with its headline', () => {
      const { host, board } = mount()
      board.show({ severity: 'degraded', title: 'Les fleuves sont absents.' })
      expect(host.textContent).toContain('Les fleuves sont absents.')
    })

    it('shows the detail beside the headline, for someone who can act on it', () => {
      const { host, board } = mount()
      board.show({
        severity: 'degraded',
        title: 'Les fleuves sont absents.',
        detail: '/rivers/europe-rivers.json : HTTP 404',
      })
      expect(host.textContent).toContain('HTTP 404')
    })
  })

  describe('variants', () => {
    it('interrupts for a blocking failure and waits for a pause on a degraded one', () => {
      // Getting this the wrong way round either shouts about a missing river or stays silent about a
      // missing map.
      const { host, board } = mount()
      board.show({ severity: 'blocking', title: 'Pas de relief' })
      board.show({ severity: 'degraded', title: 'Pas de fleuves' })
      const roles = panels(host).map((panel) => panel.getAttribute('role'))
      expect(roles).toContain('alert')
      expect(roles).toContain('status')
    })

    it('puts a blocking failure first, whatever order they arrived in', () => {
      const { host, board } = mount()
      board.show({ severity: 'degraded', title: 'Pas de fleuves' })
      board.show({ severity: 'blocking', title: 'Pas de relief' })
      expect(panels(host)[0]?.textContent).toContain('Pas de relief')
    })

    it('lets a degraded notice be dismissed, and names the button for a screen reader', () => {
      const { host, board } = mount()
      board.show({ severity: 'degraded', title: 'Pas de fleuves' })
      const close = host.querySelector('button')
      expect(close?.getAttribute('aria-label')).toBe('Fermer')
      close?.click()
      expect(host.textContent).not.toContain('Pas de fleuves')
    })

    it('offers no way to dismiss a blocking failure', () => {
      // There is nothing behind it to go back to, and a close button would promise otherwise.
      const { host, board } = mount()
      board.show({ severity: 'blocking', title: 'Pas de relief' })
      expect(host.querySelector('button')).toBeNull()
    })

    it('takes the wording of the dismiss button it is given', () => {
      const host = document.createElement('div')
      document.body.appendChild(host)
      const board = createNoticeBoard({ host, dismissLabel: 'Close' })
      board.show({ severity: 'degraded', title: 'x' })
      expect(host.querySelector('button')?.getAttribute('aria-label')).toBe('Close')
    })
  })

  describe('managed errors', () => {
    it('replaces a notice about the same thing rather than nagging twice', () => {
      const { host, board } = mount()
      board.show({ severity: 'degraded', title: 'Pas de fleuves', detail: 'première fois' })
      board.show({ severity: 'degraded', title: 'Pas de fleuves', detail: 'deuxième fois' })
      expect(panels(host)).toHaveLength(1)
      expect(host.textContent).toContain('deuxième fois')
      expect(host.textContent).not.toContain('première fois')
    })

    it('stacks notices about different things', () => {
      const { host, board } = mount()
      board.show({ severity: 'degraded', title: 'Pas de fleuves' })
      board.show({ severity: 'degraded', title: 'Pas de frontières' })
      expect(panels(host)).toHaveLength(2)
    })
  })

  describe('unmanaged errors', () => {
    it('posts a notice with no detail at all', () => {
      const { host, board } = mount()
      expect(() => {
        board.show({ severity: 'degraded', title: 'Seul' })
      }).not.toThrow()
      expect(host.querySelectorAll('p')).toHaveLength(1)
    })

    it('treats an empty detail as no detail', () => {
      const { host, board } = mount()
      board.show({ severity: 'degraded', title: 'Seul', detail: '' })
      expect(host.querySelectorAll('p')).toHaveLength(1)
    })
  })

  describe('edge cases', () => {
    it('clears everything at once', () => {
      const { host, board } = mount()
      board.show({ severity: 'blocking', title: 'a' })
      board.show({ severity: 'degraded', title: 'b' })
      board.clear()
      expect(panels(host)).toHaveLength(0)
    })

    it('posts again after a clear', () => {
      const { host, board } = mount()
      board.show({ severity: 'degraded', title: 'a' })
      board.clear()
      board.show({ severity: 'degraded', title: 'a' })
      expect(panels(host)).toHaveLength(1)
    })

    it('unmounts on dispose', () => {
      const { host, board } = mount()
      board.show({ severity: 'degraded', title: 'a' })
      board.dispose()
      expect(host.childElementCount).toBe(0)
    })

    it('dismissing a notice already cleared does not resurrect the board', () => {
      const { host, board } = mount()
      board.show({ severity: 'degraded', title: 'a' })
      const close = host.querySelector('button')
      board.clear()
      expect(() => close?.click()).not.toThrow()
      expect(panels(host)).toHaveLength(0)
    })
  })
})

describe('buildNoticeBoardElement', () => {
  describe('happy path', () => {
    it('stacks its notices in a column', () => {
      expect(buildNoticeBoardElement().style.flexDirection).toBe('column')
    })
  })

  describe('variants', () => {
    it('sits above the splash, which a blocking notice has to be readable on', () => {
      expect(buildNoticeBoardElement().style.zIndex).toBe('30')
    })

    it('passes clicks through, being a container and not a surface', () => {
      expect(buildNoticeBoardElement().style.pointerEvents).toBe('none')
    })
  })

  // L3 (managed errors) and L4 (unmanaged errors): N/A — it takes no argument and reads no state.

  describe('edge cases', () => {
    it('is not mounted by building it', () => {
      expect(buildNoticeBoardElement().parentElement).toBeNull()
    })
  })
})

describe('buildNoticePanel', () => {
  describe('happy path', () => {
    it('carries the headline', () => {
      const panel = buildNoticePanel(
        { severity: 'degraded', title: 'Rivers missing' },
        '#000',
        '#fff'
      )
      expect(panel.textContent).toContain('Rivers missing')
    })
  })

  describe('variants', () => {
    it('interrupts for a blocking failure', () => {
      // Severity is declared per asset, never inferred: an alert about a missing river would shout.
      const panel = buildNoticePanel({ severity: 'blocking', title: 'No map' }, '#000', '#fff')
      expect(panel.getAttribute('role')).toBe('alert')
    })

    it('waits for a pause on a degraded one', () => {
      const panel = buildNoticePanel({ severity: 'degraded', title: 'No rivers' }, '#000', '#fff')
      expect(panel.getAttribute('role')).toBe('status')
    })

    it('shows the detail when there is one', () => {
      const panel = buildNoticePanel(
        { severity: 'degraded', title: 'No rivers', detail: '/rivers/europe.json' },
        '#000',
        '#fff'
      )
      expect(panel.textContent).toContain('/rivers/europe.json')
    })

    it('takes the colours it was given', () => {
      const panel = buildNoticePanel({ severity: 'degraded', title: 'x' }, '#abcdef', '#123456')
      expect(panel.style.color).toBe('rgb(171, 205, 239)')
      expect(panel.style.backgroundColor).toBe('rgb(18, 52, 86)')
    })
  })

  describe('managed errors', () => {
    it('leaves out the detail paragraph rather than printing an empty one', () => {
      const panel = buildNoticePanel(
        { severity: 'degraded', title: 'x', detail: '' },
        '#000',
        '#fff'
      )
      expect(panel.querySelectorAll('p')).toHaveLength(1)
    })
  })

  describe('unmanaged errors', () => {
    it('sets the words as text, so markup in a message cannot become markup', () => {
      const panel = buildNoticePanel(
        { severity: 'degraded', title: '<img src=x onerror=alert(1)>' },
        '#000',
        '#fff'
      )
      expect(panel.querySelector('img')).toBeNull()
      expect(panel.textContent).toContain('<img src=x onerror=alert(1)>')
    })
  })

  describe('edge cases', () => {
    it('builds no dismiss button of its own, whatever the severity', () => {
      // Whether a notice can be dismissed is the board's business, since only it knows what to forget.
      expect(
        buildNoticePanel({ severity: 'degraded', title: 'x' }, '#000', '#fff').querySelector(
          'button'
        )
      ).toBeNull()
    })
  })
})

describe('buildDismissButton', () => {
  describe('happy path', () => {
    it('calls back when pressed', () => {
      const onDismiss = vi.fn()
      buildDismissButton('#4a3424', 'Fermer', onDismiss).click()
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('is named in words, the glyph being unreadable aloud', () => {
      expect(buildDismissButton('#4a3424', 'Fermer', vi.fn()).getAttribute('aria-label')).toBe(
        'Fermer'
      )
    })
  })

  describe('variants', () => {
    it('takes the accessible name in the reader language it is given', () => {
      expect(buildDismissButton('#4a3424', 'Close', vi.fn()).getAttribute('aria-label')).toBe(
        'Close'
      )
    })

    it('does not submit anything, being a control and not a form', () => {
      expect(buildDismissButton('#4a3424', 'Fermer', vi.fn()).type).toBe('button')
    })
  })

  describe('managed errors', () => {
    it('clears a WCAG 2.5.8 target of 24 by 24', () => {
      // A11Y-201, found in review on 2026-09-17: the box used to be sized to the glyph, ~19 by 23.
      // Guarded here so a later restyle cannot quietly shrink it back.
      const close = buildDismissButton('#4a3424', 'Fermer', vi.fn())
      expect(Number.parseInt(close.style.minWidth, 10)).toBeGreaterThanOrEqual(24)
      expect(Number.parseInt(close.style.minHeight, 10)).toBeGreaterThanOrEqual(24)
    })

    it('draws the glyph in full ink, with no alpha to erode its contrast', () => {
      // A11Y-202: at opacity 0.65 the glyph composited to ~3.71:1, under the 4.5:1 floor. Full ink
      // means it reads exactly as well as the notice title above it, whatever ink a caller passes.
      const close = buildDismissButton('#4a3424', 'Fermer', vi.fn())
      expect(close.style.opacity).toBe('')
      expect(close.style.color).toBe('rgb(74, 52, 36)')
    })
  })

  describe('unmanaged errors', () => {
    it('does not take itself down, whatever its callback does', () => {
      // The button cannot know whether dismissing worked: a DOM listener's outcome never reaches the
      // caller. So it must not remove anything on its own, or a failed dismissal would look successful.
      const close = buildDismissButton('#4a3424', 'Fermer', () => undefined)
      const host = document.createElement('div')
      host.appendChild(close)
      close.click()
      close.click()
      expect(close.parentElement).toBe(host)
    })
  })

  describe('edge cases', () => {
    it('centres the glyph inside a box larger than it', () => {
      const close = buildDismissButton('#4a3424', 'Fermer', vi.fn())
      expect(close.style.alignItems).toBe('center')
      expect(close.style.justifyContent).toBe('center')
    })
  })
})
