import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

    it('mounts the drawing surface, named for a screen reader', async () => {
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await act(async () => {
        await import('./main')
      })

      const canvas = root.querySelector('main > canvas')

      expect(canvas).not.toBeNull()
      expect(canvas?.getAttribute('aria-label')).toBe("Carte de l'année 1100, en cours d'édition")
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
