import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The entry point's own suite.
 *
 * `main.tsx` does its work at module scope, so importing it *is* running it — which is why these tests import
 * it dynamically, after arranging the document, and reset the module registry between them. It is also why
 * this exists at all: the harness suite next door renders its own component and proves the toolchain, while
 * nothing exercised the file a browser actually loads.
 */
describe('the application entry', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.replaceChildren()

    // Two environment gaps, neither of them about this code. jsdom implements no `Worker`, and the entry
    // spawns one at module scope — where the composition root's side effects belong, exactly as the
    // atlas's entry does. And `fetch` here would reach for a relative asset URL no server is serving.
    vi.stubGlobal(
      'Worker',
      class {
        onmessage: unknown = null
        onerror: unknown = null
        postMessage(): void {
          // The entry never posts before a backdrop is asked for, and nothing here asks.
        }
        terminate(): void {
          // Nothing to stop.
        }
      }
    )
    // A promise that never settles, so the canvas area stays in its waiting state for the whole test
    // rather than racing to a failure on a microtask. Determinism, not optimism.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined))
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('happy path', () => {
    it('mounts into #root and renders something a reader can see', async () => {
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await act(async () => {
        await import('./main')
      })

      expect(root.querySelector('h1')?.textContent).toBe('Cartographe — année 1100')
    })

    it('mounts the canvas area, which waits for its backdrop before drawing', async () => {
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await act(async () => {
        await import('./main')
      })

      // The entry no longer mounts a canvas straight away, and that is the point of 4d-3: the frame
      // everything projects against comes from the DEM's own metadata, so there is nothing to draw on
      // until the relief has landed. What a reader gets meanwhile is a `status` — announced, not blank.
      const waiting = root.querySelector('[role="status"]')

      expect(waiting?.textContent).toContain('Préparation du fond de carte')
      expect(root.querySelector('canvas')).toBeNull()
    })

    it('asks for the relief and the mask, at the shared public paths', async () => {
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await act(async () => {
        await import('./main')
      })

      // Only the string calls: `fetch` also accepts a `Request` or a `URL`, and stringifying one of
      // those would read as `[object Object]` — which is what the typed lint objects to, correctly.
      const asked = vi
        .mocked(fetch)
        .mock.calls.map((call) => call[0])
        .filter((url): url is string => typeof url === 'string')

      // Both live in the atlas's `public/`, which the Cartographer's `publicDir` now *is* — so these
      // are the bytes the published map renders rather than a second copy of them.
      expect(asked).toContain('/heightmaps/europe-dem-z5.json')
      expect(asked).toContain('/masks/europe-land.json')
    })

    it('keeps the heading in the accessibility tree while the canvas takes the surface', async () => {
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await act(async () => {
        await import('./main')
      })

      const heading = root.querySelector('h1')

      // Off-screen, not `display: none` — the latter removes it from the tree, and it is the only thing
      // telling a reader what the page is. The canvas carries a name and nothing else.
      expect(heading).not.toBeNull()
      expect(heading?.getAttribute('style')).not.toContain('display: none')
      expect(heading?.getAttribute('style')).toContain('position: absolute')
    })
  })

  describe('variants', () => {
    it('puts the heading inside a landmark, not loose in the body', async () => {
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await act(async () => {
        await import('./main')
      })

      expect(root.querySelector('main > h1')).not.toBeNull()
    })
  })

  describe('managed errors', () => {
    it('refuses to start when #root is absent, rather than mounting nowhere', async () => {
      await expect(import('./main')).rejects.toThrow(/#root is missing/)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — the module awaits nothing and catches nothing, so there is no swallowed rejection and no
    // out-of-order resolution to guard. The one failure it can have is the absent container above.
    it('leaves the document untouched when it refuses', async () => {
      await expect(import('./main')).rejects.toThrow()

      expect(document.body.children).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('mounts into the element that carries the id, not the first div it finds', async () => {
      const decoy = document.createElement('div')
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(decoy, root)

      await act(async () => {
        await import('./main')
      })

      expect(decoy.childElementCount).toBe(0)
      expect(root.querySelector('h1')).not.toBeNull()
    })
  })
})
