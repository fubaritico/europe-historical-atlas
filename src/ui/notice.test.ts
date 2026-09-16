// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { createNoticeBoard } from './notice'

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
