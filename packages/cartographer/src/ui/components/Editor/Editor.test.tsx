import { act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'

import { createHistoryRelay } from '../../../canvas/history/historyRelay'
import { CHROME_PAINT_STYLE } from '../../../canvas/paint/style'
import { createResultRelay } from '../../../persistence/resultRelay'
import { openEmptyYear } from '../../../state/openEmptyYear'
import { createPolityColourSource } from '../../../state/polityColourSource'
import { createSessionStore } from '../../../state/sessionStore'
import { createCartographerStore } from '../../../state/store'
import { UNFRAMED } from '../../../viewport/viewport'
import { renderInEnglish } from '../../testing/renderInEnglish'
import { createMapNameStore } from '../../utils/mapNameSource'

import { Editor } from './Editor'

import type { SessionState } from '../../../state/sessionStore'
import type { MapAreaProps } from '../MapArea'
import type { SessionHandle } from './editorProps'

/** A Wikidata source that knows nothing — the form's panel stays quiet (CARTO-243). */
const NO_WIKIDATA = { read: () => Promise.resolve({ found: new Map(), unknown: [] }) }

/** One colour source for the mounts below, over the shipped palette. */
const COLOURS = createPolityColourSource(AUTOMATIC_PALETTE)

/**
 * What the stand-in `MapArea` was handed, last time it rendered.
 *
 * **The area is replaced rather than mounted, and that is the point of this suite.** What `Editor` does
 * is decide which zone takes what and hold **one** ref across two of them; mounting the real area would
 * drag in a backdrop, a bake and a 2D context, and the assertion would be about none of those. The area
 * itself is covered by `MapArea.test.tsx`.
 */
let handed: MapAreaProps | null = null

vi.mock('../MapArea', () => ({
  MapArea: (props: MapAreaProps) => {
    handed = props
    return <div data-testid="map-area" />
  },
}))

/** A keeper that records its gestures and answers at once. */
function stubKeeper() {
  return {
    check: vi.fn(() => Promise.resolve()),
    signIn: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => Promise.resolve()),
    lost: vi.fn(),
  }
}

/**
 * A session standing where a test puts it.
 * @param state - where it stands; someone signed in by default
 * @returns the session's store and a stub keeper
 */
function sessionAt(
  state: SessionState = { kind: 'signedIn', user: { id: 1, email: 'author@example.org' } }
) {
  const store = createSessionStore()
  store.getState().setSession(state)
  return { store, keeper: stubKeeper() }
}

/** The start screen's gestures and reading, as the entry hands them (CARTO-536). */
const start = {
  maps: {
    listDatedMaps: vi.fn(() =>
      Promise.resolve([{ name: '1100', changedAt: Date.UTC(2026, 10, 25, 19, 41) }])
    ),
  },
  now: () => new Date(Date.UTC(2026, 10, 25, 20, 0)),
  onOpenMap: vi.fn(),
}
const onNewMap = vi.fn()
const onOpen = vi.fn()

/**
 * The editor, mounted with everything the entry gives it.
 * @param results - the relay the year session says into; a fresh one by default
 * @param session - the session; someone signed in by default
 * @param map - the map open; `null` for the start screen (CARTO-536)
 */
function mount(
  results = createResultRelay(),
  session: SessionHandle = sessionAt(),
  map: string | null = '1100'
): void {
  handed = null
  renderInEnglish(
    <Editor
      store={createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })}
      load={() => new Promise(() => undefined)}
      style={CHROME_PAINT_STYLE}
      heading={<h1>Cartographer — year 1100</h1>}
      onOpen={onOpen}
      onSave={() => undefined}
      onSaveAs={() => undefined}
      onSaveCopy={() => undefined}
      onNewMap={onNewMap}
      onCloseMap={() => undefined}
      start={start}
      onCopy={() => undefined}
      onPaste={() => undefined}
      onSelectAll={() => undefined}
      onCopySheet={() => undefined}
      mapName={createMapNameStore(map)}
      history={createHistoryRelay()}
      colours={COLOURS}
      results={results}
      wikidata={NO_WIKIDATA}
      session={session}
      onSignOut={onSignOut}
    />
  )
}

/** « Se déconnecter », as the entry hands it. */
const onSignOut = vi.fn()

/** The text in the status bar's result zone. */
function resultText(): string | null | undefined {
  return document.querySelector('.shell__result')?.textContent
}

describe('Editor', () => {
  describe('happy path', () => {
    it('puts the map in the canvas zone, the tools in the rail, {Polities} in the dock, the bars on top, and leaves no zone empty', () => {
      mount()

      expect(document.querySelector('.shell__canvas [data-testid="map-area"]')).not.toBeNull()
      expect(document.querySelector('.shell__rail [role="toolbar"]')).not.toBeNull()
      const dock = document.querySelector<HTMLElement>('.shell__dock')
      expect(
        dock === null ? null : within(dock).queryByRole('region', { name: 'Polities' })
      ).not.toBeNull()
      expect(document.querySelector('.shell__appbar .app-brand__name')?.textContent).toBe(
        'Europe Historical Atlas Cartographer'
      )
      expect(document.querySelector('.shell__docbar .doc-tab')).not.toBeNull()
      expect(document.querySelectorAll('.empty-zone')).toHaveLength(0)
    })
  })

  describe('messages from outside React', () => {
    it('shows a message said before the page mounted, once it has', () => {
      const results = createResultRelay()
      results.say('opened 1100 · 2 polities · 8 vertices')

      mount(results)

      expect(resultText()).toBe('opened 1100 · 2 polities · 8 vertices')
    })

    it('shows a message said after the page mounted', () => {
      const results = createResultRelay()
      mount(results)

      act(() => {
        results.say('saved 1100 · 2 polities · 8 vertices')
      })

      expect(resultText()).toBe('saved 1100 · 2 polities · 8 vertices')
    })
  })

  describe('variants', () => {
    /*
     * THE guard of this component, and the only defect it can really have.
     *
     * The plausible version creates a ref for the `<p>` and lets `MapArea` create its own — which
     * compiles, renders, and looks right: there is a status bar, and the map is on screen. Every pointer
     * sample then writes into an element that is attached to nothing, so the bar simply never updates.
     * Nothing throws and no other test can see it, because the two halves are in different files.
     */
    it('hands the map the very node the shell rendered, not a second ref', () => {
      mount()

      // Asserted on the node rather than on the timing: the `<p>` comes after the canvas in tree order,
      // so a reader wonders whether the ref is filled yet. It is — refs are attached during the commit,
      // and the first pointer sample is many frames later. A separate test for that was written and
      // removed: it failed on exactly this defect and guarded nothing of its own.

      const position = document.querySelector('p.shell__status > .shell__position')
      const action = document.querySelector('p.shell__status > .shell__action')
      expect(position).not.toBeNull()
      expect(action).not.toBeNull()
      expect(handed?.statusRef.current).toBe(position)
      expect(handed?.actionRef.current).toBe(action)
      // A11Y-001: only the result zone speaks; the action and the position change per pointer sample.
      const result = document.querySelector('p.shell__status > .shell__result')
      expect(handed?.resultRef.current).toBe(result)
      expect(result?.getAttribute('role')).toBe('status')
      expect(action?.getAttribute('role')).toBeNull()
      expect(position?.getAttribute('role')).toBeNull()
    })

    it('forwards the heading, which the shell puts inside the landmark', () => {
      mount()

      expect(document.querySelector('main.shell__canvas > h1')?.textContent).toBe(
        'Cartographer — year 1100'
      )
    })

    it('passes the area its label and the style it needs, unchanged', () => {
      mount()

      expect(handed?.label).toBe('Map of the year 1100, being edited')
      expect(handed?.style).toBe(CHROME_PAINT_STYLE)
    })
  })

  describe('managed errors', () => {
    // The loader here never settles, which is the state the editor spends its first seconds in. The
    // shell must be fully laid out before the backdrop arrives — otherwise the window would appear to
    // build itself in two stages, and the dev's reason for the grid was precisely to stop that.
    it('lays out every zone while the backdrop is still loading', () => {
      mount()

      for (const zone of ['shell__appbar', 'shell__docbar', 'shell__rail', 'shell__dock'])
        expect(document.querySelector(`.${zone}`)).not.toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('renders exactly one status row, so nothing can write into the wrong one', () => {
      mount()

      expect(document.querySelectorAll('.shell__status')).toHaveLength(1)
    })
  })

  describe('the session (CARTO-535)', () => {
    const USER = { id: 1, email: 'author@example.org' }

    it('with nobody signed in, puts the form where the map would be, and no tool nor panel', () => {
      mount(undefined, sessionAt({ kind: 'signedOut', problem: null }))

      expect(document.querySelector('.shell__canvas form.sign-in-form')).not.toBeNull()
      expect(document.querySelector('[data-testid="map-area"]')).toBeNull()
      expect(document.querySelector('.shell__rail [role="toolbar"]')).toBeNull()
      expect(handed).toBeNull()
    })

    // CARTO-555: the menus Fichier and Édition greyed whole, never hidden; no file button on the bar any more.
    it('with nobody signed in, greys the menus Fichier and Édition themselves, and they do not open', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      mount(undefined, sessionAt({ kind: 'signedOut', problem: null }))
      const user = userEvent.setup()
      const bar = within(document.querySelector<HTMLElement>('.shell__appbar') ?? document.body)

      const file = bar.getByRole('menuitem', { name: 'File' })
      const edit = bar.getByRole('menuitem', { name: 'Edit' })
      expect([file, edit].map((title) => title.getAttribute('aria-disabled'))).toEqual([
        'true',
        'true',
      ])
      await user.click(file)
      expect(document.querySelector('[role="menu"]')).toBeNull()
      expect(bar.queryByRole('button', { name: 'Open…' })).toBeNull()
      warn.mockRestore()
    })

    it('with nobody signed in, the form signs in through the keeper', async () => {
      const session = sessionAt({ kind: 'signedOut', problem: null })
      mount(undefined, session)
      const user = userEvent.setup()

      await user.type(within(document.body).getByLabelText('Address'), 'author@example.org')
      await user.type(within(document.body).getByLabelText('Password'), 'secret')
      await user.click(within(document.body).getByRole('button', { name: 'Sign in' }))

      expect(session.keeper.signIn).toHaveBeenCalledWith('author@example.org', 'secret')
    })

    it('with nobody signed in after a problem, the form says it', () => {
      mount(undefined, sessionAt({ kind: 'signedOut', problem: { kind: 'offline' } }))

      expect(document.querySelector('.sign-in-form [role="alert"]')?.textContent).toContain(
        'The CMS does not answer'
      )
    })

    it('the expired dialogue refuses to close, said on the console', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      mount(undefined, sessionAt({ kind: 'expired', user: USER, problem: null }))
      const dialog = document.querySelector('dialog form.sign-in-form')?.closest('dialog')

      act(() => {
        // Escape closes a native dialog and fires `close`, which the design system's Modal hands to `onClose`
        dialog?.dispatchEvent(new Event('close'))
      })

      expect(document.querySelector('dialog form.sign-in-form')).not.toBeNull()
      expect(dialog?.getAttribute('aria-label')).toBe('Session expired')
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('the session dialogue stays'))
      warn.mockRestore()
    })

    // The dev, 2026-11-25: the form flashed, empty, at each map opened — the page reloads and the CMS is asked again.
    it('while the CMS is asked, shows an empty screen, never the form', () => {
      mount(undefined, sessionAt({ kind: 'checking' }))

      expect(document.querySelector('.sign-in-screen')?.getAttribute('aria-busy')).toBe('true')
      expect(document.querySelector('form.sign-in-form')).toBeNull()
    })

    it('signed in, names who at the bar’s end, and « Sign out » signs out', async () => {
      const session = sessionAt()
      mount(undefined, session)

      expect(document.querySelector('.app-account')?.textContent).toBe(
        'Signed in: author@example.org'
      )
      const signOut = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent === 'Sign out'
      )
      await act(async () => {
        signOut?.click()
        await Promise.resolve()
      })

      expect(onSignOut).toHaveBeenCalledTimes(1)
    })

    it('while a session expired, names who without « Sign out » — the dialogue asks to sign in again', () => {
      mount(undefined, sessionAt({ kind: 'expired', user: USER, problem: null }))

      expect(document.querySelector('.app-account')?.textContent).toBe(
        'Signed in: author@example.org'
      )
      const bar = document.querySelector<HTMLElement>('.shell__appbar') ?? document.body
      expect(
        within(bar)
          .queryAllByRole('button')
          .some((button) => button.textContent === 'Sign out')
      ).toBe(false)
    })

    it('an expired session keeps the map under a dialogue that asks to sign in again', () => {
      mount(undefined, sessionAt({ kind: 'expired', user: USER, problem: null }))

      expect(document.querySelector('[data-testid="map-area"]')).not.toBeNull()
      expect(document.querySelector('dialog form.sign-in-form')).not.toBeNull()
    })

    it('« Try again » in the expired dialogue asks the CMS again', async () => {
      const session = sessionAt({ kind: 'expired', user: USER, problem: { kind: 'offline' } })
      mount(undefined, session)

      const retry = [...document.querySelectorAll<HTMLButtonElement>('dialog button')].find(
        (button) => button.textContent === 'Try again'
      )
      await act(async () => {
        retry?.click()
        await Promise.resolve()
      })

      expect(session.keeper.check).toHaveBeenCalledTimes(1)
    })

    it('signing in opens the editor without remounting the page', () => {
      const session = sessionAt({ kind: 'signedOut', problem: null })
      mount(undefined, session)

      act(() => {
        session.store.getState().setSession({ kind: 'signedIn', user: USER })
      })

      expect(document.querySelector('[data-testid="map-area"]')).not.toBeNull()
      expect(document.querySelector('form.sign-in-form')).toBeNull()
    })
  })

  // CARTO-536 — signed in, no map open: the start screen, after Illustrator's.
  describe('the start screen (CARTO-536)', () => {
    it('signed in with no map open, shows the start screen where the map would be, no tool nor panel', async () => {
      mount(undefined, sessionAt(), null)

      const screen = within(document.querySelector<HTMLElement>('.shell__canvas') ?? document.body)
      expect(screen.getByRole('heading', { name: 'Welcome to the Cartographer' })).toBeDefined()
      expect(await screen.findByRole('button', { name: /^1100/ })).toBeDefined()
      expect(document.querySelector('[data-testid="map-area"]')).toBeNull()
      expect(document.querySelector('.shell__rail [role="toolbar"]')).toBeNull()
    })

    it('opens a map of the list, and « New map… » and « Open… » through their gestures', async () => {
      onNewMap.mockClear()
      onOpen.mockClear()
      start.onOpenMap.mockClear()
      mount(undefined, sessionAt(), null)
      const user = userEvent.setup()
      const screen = within(document.querySelector<HTMLElement>('.shell__canvas') ?? document.body)

      await user.click(await screen.findByRole('button', { name: /^1100/ }))
      await user.click(screen.getByRole('button', { name: 'New map…' }))
      await user.click(screen.getByRole('button', { name: 'Open…' }))

      expect(start.onOpenMap).toHaveBeenCalledWith('1100')
      expect([onNewMap.mock.calls.length, onOpen.mock.calls.length]).toEqual([1, 1])
    })

    it('leaves Fichier open and greys Édition whole, and names who is signed in with « Sign out »', () => {
      mount(undefined, sessionAt(), null)

      const bar = document.querySelector<HTMLElement>('.shell__appbar') ?? document.body
      expect(
        ['File', 'Edit'].map((name) =>
          within(bar).getByRole('menuitem', { name }).getAttribute('aria-disabled')
        )
      ).toEqual([null, 'true'])
      expect(
        within(bar).getByRole('button', { name: 'Sign out' }).querySelector('svg')
      ).not.toBeNull()
      expect(bar.querySelector('.app-brand')?.textContent).toBe(
        'Europe Historical Atlas Cartographer'
      )
    })

    it('with nobody signed in and no map open, still shows the sign-in form first', () => {
      mount(undefined, sessionAt({ kind: 'signedOut', problem: null }), null)

      expect(document.querySelector('.shell__canvas form.sign-in-form')).not.toBeNull()
      expect(document.querySelector('.start-screen')).toBeNull()
    })

    it('keeps the start screen under the expired dialogue', () => {
      mount(
        undefined,
        sessionAt({ kind: 'expired', user: { id: 1, email: 'author@example.org' }, problem: null }),
        null
      )

      expect(document.querySelector('.start-screen')).not.toBeNull()
      expect(document.querySelector('form.sign-in-form')).not.toBeNull()
    })
  })
})
