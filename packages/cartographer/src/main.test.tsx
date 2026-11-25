import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CMS_SESSION_ROUTE } from './devServer/cmsSessionRoute'

import type { Root } from 'react-dom/client'

/**
 * Every React root the entry creates, so each is unmounted after its test. Left mounted, an application stays on the
 * page after its test, and the design system's toaster keeps watching the page (`useTopModalDialog`): its observer
 * then fires once the environment is torn down and prints `Element is not defined` (2026-11-06, a debt the dev named).
 */
const roots = vi.hoisted((): Root[] => [])

vi.mock('react-dom/client', async (original) => {
  const actual = await original<typeof import('react-dom/client')>()
  return {
    ...actual,
    createRoot: (...args: Parameters<typeof actual.createRoot>) => {
      const root = actual.createRoot(...args)
      roots.push(root)
      return root
    },
  }
})

/**
 * The entry point's own suite.
 *
 * `main.tsx` does its work at module scope, so importing it *is* running it — which is why these tests import
 * it dynamically, after arranging the document, and reset the module registry between them. It is also why
 * this exists at all: the harness suite next door renders its own component and proves the toolchain, while
 * nothing exercised the file a browser actually loads.
 */
/**
 * Each test imports the whole application afresh, ~1 s alone and past Vitest's 5 s when the five packages run at once
 * (REPO-260: three refused commits on 2026-11-02, the machine's load at 110) — so this file is given 20 s.
 */
const ENTRY_TIMEOUT_MS = 20_000

/**
 * Stand in for `fetch`: the dev server's session route answers with the user given (`null` for nobody), anything else
 * never settles.
 * @param user - who is signed in, or `null`
 */
function answerSession(user: { id: number; email: string } | null): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: unknown) =>
      typeof input === 'string' && input.startsWith(CMS_SESSION_ROUTE)
        ? Promise.resolve(new Response(JSON.stringify({ user }), { status: 200 }))
        : new Promise(() => undefined)
    )
  )
}

/**
 * Run the entry, and let the session's answer reach the screen.
 */
async function runEntry(): Promise<void> {
  await act(async () => {
    await import('./main')
  })
  await act(async () => {
    await Promise.resolve()
  })
}

describe('the application entry', { timeout: ENTRY_TIMEOUT_MS }, () => {
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
    // The session's route answers someone signed in (CARTO-535), so the editor opens; every other asset is a promise
    // that never settles, so the canvas area stays in its waiting state for the whole test rather than racing to a
    // failure on a microtask. Determinism, not optimism.
    answerSession({ id: 1, email: 'author@example.org' })
  })

  afterEach(() => {
    act(() => {
      for (const root of roots.splice(0)) root.unmount()
    })
    vi.unstubAllGlobals()
  })

  describe('happy path', () => {
    it('mounts into #root and renders something a reader can see', async () => {
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await runEntry()

      expect(root.querySelector('h1')?.textContent).toBe('Cartographer — year 1100')
    })

    it('mounts the canvas area, which waits for its backdrop before drawing', async () => {
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await runEntry()

      // The entry no longer mounts a canvas straight away, and that is the point of 4d-3: the frame
      // everything projects against comes from the DEM's own metadata, so there is nothing to draw on
      // until the relief has landed. What a reader gets meanwhile is a `status` — announced, not blank.
      const waiting = root.querySelector('[role="status"]')

      expect(waiting?.textContent).toContain('Preparing the backdrop')
      expect(root.querySelector('canvas')).toBeNull()
    })

    it('asks for the relief and the mask, at the shared public paths', async () => {
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await runEntry()

      // Only the string calls: `fetch` also accepts a `Request` or a `URL`, and stringifying one of
      // those would read as `[object Object]` — which is what the typed lint objects to, correctly.
      const asked = vi
        .mocked(fetch)
        .mock.calls.map((call) => call[0])
        .filter((url): url is string => typeof url === 'string')

      // Both live in the atlas's `public/`, which the Cartographer's `publicDir` now *is* — so these
      // are the bytes the published map renders rather than a second copy of them.
      expect(asked).toContain('/heightmaps/europe-dem-z6-1920.json')
      expect(asked).toContain('/masks/europe-land.json')
    })

    it('keeps the heading in the accessibility tree while the canvas takes the surface', async () => {
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await runEntry()

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

      await runEntry()

      expect(root.querySelector('main > h1')).not.toBeNull()
    })

    it('with nobody signed in, shows the sign-in form where the map would be, and asks for no backdrop', async () => {
      answerSession(null)
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await runEntry()

      const asked = vi
        .mocked(fetch)
        .mock.calls.map((call) => call[0])
        .filter((url): url is string => typeof url === 'string')
      expect(root.querySelector('form.sign-in-form')).not.toBeNull()
      expect(root.querySelector('[data-testid="map-area"], canvas')).toBeNull()
      expect(asked).toContain(`${CMS_SESSION_ROUTE}/`)
      expect(asked).not.toContain('/heightmaps/europe-dem-z6-1920.json')
      expect(asked).not.toContain('/masks/europe-land.json')
    })
  })

  describe('managed errors', () => {
    it('an answer of the session it cannot read opens the error dialogue, and the form says it too', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.stubGlobal(
        'fetch',
        vi.fn((input: unknown) =>
          typeof input === 'string' && input.startsWith(CMS_SESSION_ROUTE)
            ? Promise.resolve(new Response('{}', { status: 200 }))
            : new Promise(() => undefined)
        )
      )
      const root = document.createElement('div')
      root.id = 'root'
      document.body.append(root)

      await runEntry()

      await vi.waitFor(() => {
        const dialogues = [...document.querySelectorAll('dialog')].map(
          (dialog) => dialog.textContent
        )
        expect(dialogues.some((text) => text?.includes('The session could not be read'))).toBe(true)
      })
      expect(root.querySelector('.sign-in-form [role="alert"]')?.textContent).toContain(
        'cannot read'
      )
      expect(error).toHaveBeenCalledWith(expect.stringContaining('answered 200 with {}'))
      error.mockRestore()
    })

    it('refuses to start when #root is absent, rather than mounting nowhere', async () => {
      await expect(import('./main')).rejects.toThrow(/#root is missing/)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — the module awaits nothing and catches nothing; the session it starts settles every request itself
    // (`persistence/sessionClient.test.ts`). The one failure it can have is the absent container above.
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

      await runEntry()

      expect(decoy.childElementCount).toBe(0)
      expect(root.querySelector('h1')).not.toBeNull()
    })
  })
})
