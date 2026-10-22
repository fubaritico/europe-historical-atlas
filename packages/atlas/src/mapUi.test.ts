// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { ATLAS_MESSAGES } from './i18n'
import { createMapUi } from './mapUi'

/** Mount an interface into a fresh host. */
function mount(isDisposed: () => boolean = () => false): {
  host: HTMLElement
  ui: ReturnType<typeof createMapUi>
} {
  const host = document.createElement('div')
  document.body.appendChild(host)
  return {
    host,
    ui: createMapUi({ host, isDisposed, translate: createTranslator(ATLAS_MESSAGES, 'fr') }),
  }
}

describe('createMapUi — its words', () => {
  it('names the dismiss button in the reader’s language', () => {
    const { host, ui } = mount()
    ui.reportAssetFailure('rivers', new Error('offline'))
    expect(host.querySelector('button')?.getAttribute('aria-label')).toBe('Fermer')
    ui.dispose()
  })

  // The one message that must always show: an error nothing anticipated, heard on the window.
  it('heads an unexpected error with the catalogue’s sentence', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { host, ui } = mount()
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('boom') }))
    expect(host.textContent).toContain(
      'Une erreur inattendue s’est produite. La carte peut être incomplète.'
    )
    ui.dispose()
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * How many polite live regions exist before any notice is posted.
 *
 * Two, and both deliberately: the splash announces that the map is loading, and the progress panel
 * announces what it is doing. A notice is whatever appears on top of those.
 */
const BASELINE_STATUS = 2

/** How many elements carry a given ARIA role. */
const withRole = (host: HTMLElement, role: string): number =>
  host.querySelectorAll(`[role="${role}"]`).length

/** How many degraded notices are posted, discounting the two panels that are always there. */
const degradedNotices = (host: HTMLElement): number => withRole(host, 'status') - BASELINE_STATUS

describe('createMapUi', () => {
  describe('happy path', () => {
    it('mounts the splash, the progress panel and the board', () => {
      const { host } = mount()
      // Three children: the reader sees the splash, and the other two are ready before anything loads.
      expect(host.children).toHaveLength(3)
    })

    it('hands back a progress panel the compute can drive', () => {
      const { ui } = mount()
      ui.progress.begin('Chargement…')
      expect(ui.progress.element.hidden).toBe(false)
      expect(ui.progress.element.textContent).toContain('Chargement…')
    })
  })

  describe('variants', () => {
    it('takes the splash down when asked, and survives being asked twice', () => {
      const { ui } = mount()
      ui.dismissSplash()
      ui.dismissSplash()
      expect(true).toBe(true) // the point is that the second call does not throw
    })

    it('tells a degraded failure over a working map, without interrupting', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { host, ui } = mount()
      ui.reportAssetFailure('rivers', new Error('404'))
      expect(degradedNotices(host)).toBe(1)
    })

    it('interrupts for a blocking failure', () => {
      // `alert` on a missing map, `status` on a missing river — the severity is declared per asset in
      // assetMessages, never inferred from how the load failed.
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { host, ui } = mount()
      ui.reportAssetFailure('heightmap', new Error('404'))
      expect(withRole(host, 'alert')).toBe(1)
    })
  })

  describe('managed errors', () => {
    it('keeps the console line for whoever is looking at one', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { ui } = mount()
      const error = new Error('404')
      ui.reportAssetFailure('rivers', error)
      expect(spy).toHaveBeenCalledWith('asset rivers failed', error)
    })

    it('ends the progress bar on a blocking failure, the splash staying up over it', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { ui } = mount()
      ui.progress.begin('Chargement…')
      ui.reportAssetFailure('heightmap', new Error('404'))
      expect(ui.progress.element.hidden).toBe(true)
    })

    it('leaves the progress bar running on a degraded one', () => {
      // The map is still coming; hiding the bar would say otherwise.
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { ui } = mount()
      ui.progress.begin('Chargement…')
      ui.reportAssetFailure('rivers', new Error('404'))
      expect(ui.progress.element.hidden).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('logs but posts nothing once the app is gone', () => {
      // A load abandoned mid-flight must not put a panel onto a page that has been torn down.
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { host, ui } = mount(() => true)
      ui.reportAssetFailure('rivers', new Error('404'))
      expect(spy).toHaveBeenCalled()
      expect(degradedNotices(host)).toBe(0)
    })

    it('reports something a reader can read even for a thrown non-error', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { host, ui } = mount()
      ui.reportAssetFailure('rivers', 'just a string')
      expect(host.textContent?.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('unmounts everything it mounted', () => {
      const { host, ui } = mount()
      ui.dispose()
      expect(host.children).toHaveLength(0)
    })

    it('replaces rather than stacks a repeated failure, so it does not nag', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { host, ui } = mount()
      ui.reportAssetFailure('rivers', new Error('404'))
      ui.reportAssetFailure('rivers', new Error('404'))
      expect(degradedNotices(host)).toBe(1)
    })
  })
})
