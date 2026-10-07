import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { assetError } from '@europe-historical-atlas/core/data/assetError'
import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { CHROME_PAINT_STYLE } from '../canvas/style'
import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { TEST_BACKDROP_FRAME } from '../view/testFrame'
import { UNFRAMED } from '../view/viewport'

import { BackdropFailure, BackdropWaiting, MapArea } from './MapArea'

import type { BackdropLoad } from './MapArea'
import type { Backdrop } from '../backdropSource'
import type { ProgressReport } from '@europe-historical-atlas/core/pipeline/mapCompute'

/**
 * A ready backdrop.
 *
 * The frame is the real fixture, because the canvas below it does real arithmetic with it — a 1×1 frame
 * would make the first framing degenerate and prove nothing about the wiring.
 * @returns a drawable backdrop
 */
function readyBackdrop(): Backdrop {
  return { frame: TEST_BACKDROP_FRAME, image: document.createElement('canvas') }
}

/**
 * A store on an empty year, as the entry builds one.
 * @returns the store
 */
function store() {
  return createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
}

/**
 * Mount the area with a given loader.
 * @param load - how the area gets its backdrop
 * @param strict - whether to wrap in `StrictMode`, as the entry does
 * @returns nothing; assertions go through the screen
 */
function mount(load: BackdropLoad, strict = false): void {
  const area = (
    <MapArea
      store={store()}
      load={load}
      style={CHROME_PAINT_STYLE}
      zoneLabel="zone"
      label="la carte"
    />
  )
  render(strict ? <StrictMode>{area}</StrictMode> : area)
}

/** A loader that never settles, so the waiting state can be inspected. */
const pending: BackdropLoad = () => new Promise(() => undefined)

/**
 * Run something inside `act`, then let the pending microtasks run before asserting.
 *
 * The `await` is the point, not ceremony: the loader settles on a microtask, and its `.then` has to run
 * *inside* this `act` or React warns that the state update escaped one. Writing `act(async () => fn())`
 * without it is an async function with nothing to await — which the typed lint rejects, and which would
 * read as if it were waiting for something it is not.
 * @param fn - what to do inside the act
 * @returns once the queue is drained
 */
async function inAct(fn: () => void): Promise<void> {
  await act(async () => {
    fn()
    await Promise.resolve()
  })
}

describe('BackdropWaiting', () => {
  describe('happy path', () => {
    it('announces the wait politely, with its progress', () => {
      render(<BackdropWaiting fraction={0.4} phase="bake" />)

      const status = screen.getByRole('status')

      // `status` and not `alert`: nothing has gone wrong, so a screen reader must not be interrupted.
      expect(status.textContent).toContain('Préparation du fond de carte')
      expect(screen.getByRole('progressbar').getAttribute('value')).toBe('0.4')
    })

    it('names what the bar measures, and keeps that name in step with the phase', () => {
      // A `<progress>` exposes its own value natively, so what a reader lacks is what is progressing.
      // Found in review; the atlas's own progress overlay already does this.
      render(<BackdropWaiting fraction={0.4} phase="bake" />)

      expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe(
        'composition du relief'
      )

      render(<BackdropWaiting fraction={0} phase={null} />)

      // Before the first announcement there is no phase, and the label must not read `undefined`.
      expect(screen.getAllByRole('progressbar').at(-1)?.getAttribute('aria-label')).toBe(
        'Préparation du fond de carte'
      )
    })
  })

  describe('variants', () => {
    it('names the phase in French, and says nothing before the first announcement', () => {
      render(<BackdropWaiting fraction={0} phase={null} />)

      expect(screen.getByRole('status').textContent).not.toContain('composition')

      render(<BackdropWaiting fraction={0.1} phase="bake" />)

      expect(screen.getAllByRole('status').at(-1)?.textContent).toContain('composition du relief')
    })
  })

  describe('edge cases', () => {
    it('shows a complete bar at 1 without claiming to be done', () => {
      render(<BackdropWaiting fraction={1} phase="bake" />)

      expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1')
      expect(screen.getByRole('status').textContent).toContain('Préparation')
    })
  })

  // L3/L4: N/A — it renders two numbers and a label, and takes no action that can fail.
})

describe('BackdropFailure', () => {
  describe('happy path', () => {
    it('interrupts, and names which asset broke and how', () => {
      render(
        <BackdropFailure
          error={assetError('heightmap', 'transport', '/heightmaps/europe-dem-z5', 'HTTP 404')}
        />
      )

      const alert = screen.getByRole('alert')

      // `alert` and not `status`: this one is blocking, there is nothing behind it to go back to.
      expect(alert.textContent).toContain('heightmap')
      expect(alert.textContent).toContain('transport')
      expect(alert.textContent).toContain('HTTP 404')
    })

    it('says why no year can be opened, which is the part that is not obvious', () => {
      render(<BackdropFailure error={new Error('whatever')} />)

      expect(screen.getByRole('alert').textContent).toContain('le repère géographique')
    })
  })

  describe('variants', () => {
    it('falls back to the message of a plain error', () => {
      render(<BackdropFailure error={new Error('the worker died')} />)

      expect(screen.getByRole('alert').textContent).toContain('the worker died')
    })
  })

  describe('unmanaged errors', () => {
    it('shows something for a thrown non-error rather than rendering blank', () => {
      render(<BackdropFailure error="a bare string" />)

      expect(screen.getByRole('alert').textContent).toContain('a bare string')
    })

    it('shows something for a thrown undefined', () => {
      render(<BackdropFailure error={undefined} />)

      expect(screen.getByRole('alert').textContent).toContain('undefined')
    })

    it('shows something for a thrown null', () => {
      // The case the previous test's name promised and did not exercise, found in review. `String()`
      // treats the two the same, so this hid no defect — but a test name that overstates its coverage is
      // how coverage gets believed instead of read.
      render(<BackdropFailure error={null} />)

      expect(screen.getByRole('alert').textContent).toContain('null')
    })
  })

  describe('edge cases', () => {
    it('offers no way to dismiss it — there is nothing behind it', () => {
      render(<BackdropFailure error={new Error('x')} />)

      expect(screen.queryByRole('button')).toBeNull()
    })
  })
})

describe('MapArea', () => {
  describe('happy path', () => {
    it('waits first, drawing nothing', () => {
      mount(pending)

      expect(screen.getByRole('status')).not.toBeNull()
      expect(document.querySelector('canvas')).toBeNull()
    })

    it('replaces the wait with the canvas once the backdrop is ready', async () => {
      const backdrop = readyBackdrop()

      await inAct(() => {
        mount(() => Promise.resolve(backdrop))
      })

      expect(screen.queryByRole('status')).toBeNull()
      expect(screen.getByLabelText('la carte').tagName).toBe('CANVAS')
    })
  })

  describe('variants', () => {
    it('shows the progress the loader reports, as it reports it', async () => {
      let report: ProgressReport | null = null
      const backdrop = readyBackdrop()
      let release: (() => void) | null = null
      const load: BackdropLoad = (onProgress) => {
        report = onProgress
        return new Promise((resolve) => {
          release = () => {
            resolve(backdrop)
          }
        })
      }

      await inAct(() => {
        mount(load)
      })
      await inAct(() => {
        report?.(0.75, 'bake')
      })

      expect(screen.getByRole('progressbar').getAttribute('value')).toBe('0.75')
      expect(screen.getByRole('status').textContent).toContain('composition du relief')

      await inAct(() => {
        release?.()
      })
    })

    it('hands the canvas the frame the backdrop defines, not one of its own', async () => {
      const backdrop = readyBackdrop()

      await inAct(() => {
        mount(() => Promise.resolve(backdrop))
      })

      // The canvas sizes its backing store on mount and frames the whole backdrop, which it can only do
      // from a frame it was given. A zero-width canvas would mean it never got one.
      expect(screen.getByLabelText('la carte').getAttribute('style')).toContain('width: 100%')
    })

    it('tells a keyboard reader which keys the surface answers to', async () => {
      const backdrop = readyBackdrop()

      await inAct(() => {
        mount(() => Promise.resolve(backdrop))
      })

      const canvas = screen.getByLabelText('la carte')
      const describedBy = canvas.getAttribute('aria-describedby')
      const instructions = describedBy === null ? null : document.getElementById(describedBy)

      // A focusable, named element that answers to arrow keys says nothing about them on its own —
      // found in review, once `attach.ts` had made the canvas keyboard-operable.
      expect(instructions?.textContent).toContain('Flèches')
      expect(instructions?.textContent).toContain('zoomer')
      // No `role`, deliberately: `role="application"` would put several screen readers into a mode that
      // suppresses their own navigation for the whole page. See the component's own header.
      expect(canvas.getAttribute('role')).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('shows the blocking notice when the backdrop cannot be had', async () => {
      await inAct(() => {
        mount(() => Promise.reject(assetError('landMask', 'semantic', '/masks', 'wrong box')))
      })

      expect(screen.getByRole('alert').textContent).toContain('wrong box')
      expect(screen.queryByRole('status')).toBeNull()
      expect(document.querySelector('canvas')).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    // There was a test here called 'does not write state after unmounting mid-load', and it guarded
    // **nothing** — removed on 2026-10-07 after sabotaging the `ignore` check and watching all 300 tests
    // pass. It asserted that `console.error` stayed silent, on the premise that React warns about a state
    // update on an unmounted tree; React 18 **removed that warning**, so the assertion was true whether
    // the guard existed or not.
    //
    // And there is nothing to put in its place: a `setState` on an unmounted tree is a silent no-op, so
    // the invariant is not observable from the outside. What the `ignore` flag genuinely protects is a
    // *superseded* invocation under StrictMode, and that is guarded — by the two tests under 'edge cases'
    // below, both verified by replaying the defect.
    //
    // Kept as a comment rather than deleted silently, because a decorative test is this repository's most
    // expensive failure shape: green over code nothing read.
    it('surfaces a loader that rejects with no reason at all', async () => {
      await inAct(() => {
        mount(() => Promise.reject(new Error()))
      })

      // An `Error` with an empty message still has to produce a visible, announced failure rather than an
      // alert with nothing in it — the author must learn that the backdrop is not coming.
      const alert = screen.getByRole('alert')

      expect(alert.textContent).toContain('n’a pas pu être préparé')
      expect(screen.queryByRole('status')).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('loads once under StrictMode, which mounts it twice on purpose', async () => {
      const backdrop = readyBackdrop()
      const load = vi.fn(() => Promise.resolve(backdrop))

      await inAct(() => {
        mount(load, true)
      })

      // The trap this test exists for: an effect guarded only by its dependency array runs again on
      // StrictMode's second mount, so both assets would be fetched and the terrain baked twice — ~3.6 s
      // and 12 MB for nothing. The ref survives the remount; the dependency array does not.
      expect(load).toHaveBeenCalledTimes(1)
      // And loading once is worth nothing if the answer is dropped: StrictMode runs
      // setup → cleanup → setup, so a guard that skips the second setup leaves the only `.then` bound to
      // the first invocation's already-cancelled closure. Counting the calls cannot see that.
      expect(screen.getByLabelText('la carte').tagName).toBe('CANVAS')
    })

    it('still reports progress under StrictMode, the sink being handed over only once', async () => {
      let report: ProgressReport | null = null
      const backdrop = readyBackdrop()
      let release: (() => void) | null = null
      const load: BackdropLoad = (onProgress) => {
        report = onProgress
        return new Promise((resolve) => {
          release = () => {
            resolve(backdrop)
          }
        })
      }

      await inAct(() => {
        mount(load, true)
      })
      await inAct(() => {
        report?.(0.5, 'bake')
      })

      // The same defect one level down, and the one that would have gone unnoticed: `load` receives the
      // sink once, at creation, so a sink captured by the first StrictMode invocation is silenced by that
      // invocation's cleanup — and a progress bar that never moves reads as a fast load, not as a bug.
      expect(screen.getByRole('progressbar').getAttribute('value')).toBe('0.5')

      await inAct(() => {
        release?.()
      })
    })
  })
})
