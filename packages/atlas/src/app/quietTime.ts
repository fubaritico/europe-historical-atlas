/**
 * The page's two waits for the maps prepared in the background (ATLAS-333): **quiet** — the reader has not acted on the
 * map for a moment and the page is idle — so preparing never freezes a drag or a zoom; and **a sleep the network
 * shortens** — a map that failed for the network is tried again as soon as the browser says it is back online.
 *
 * The window is handed in, the slice it reads named, so both run under a test with a stand-in.
 */

/** How long after the reader's last gesture the map counts as quiet. */
export const QUIET_AFTER_MS = 800

/**
 * The gestures that hold a map's laying off — the dev, 2026-11-10: a press of the mouse, a click, the wheel and the
 * keyboard; **not the mouse moving**, which would put off every preparation while the reader only goes to a button
 * (ATLAS-396). **A press counts on the map alone** (the dev, same day: _"target the event"_): a drag of the map is a press
 * that lasts, never quiet while the button is down; a press on the interface — the frieze's slider dragged, a button —
 * holds nothing off, so the maps keep being laid aside while the slider moves. Heard on the map: the press.
 */
const MAP_PRESS = 'pointerdown'

/** Heard on the window: the release, wherever it happens, the wheel and the keyboard. */
const GESTURES = ['pointerup', 'pointercancel', 'wheel', 'keydown'] as const

/**
 * What lets every press go at once: the window losing the focus, or a context menu opening — either can swallow the
 * release, which would leave the map busy for good (reviews ARCH-002, QUAL-005).
 */
const LETS_GO = ['blur', 'contextmenu'] as const

/** What the waits read of an event: its kind, and for a pointer which one — several can be down at once. */
export interface Gesture {
  /** The event's type. */
  readonly type: string
  /** The pointer, for a pointer event. */
  readonly pointerId?: number
}

/** The slice of the map's element the waits read: where a press is heard. */
export interface QuietMap {
  addEventListener: (
    type: string,
    listener: (event?: Gesture) => void,
    options?: { passive?: boolean }
  ) => void
  removeEventListener: (type: string, listener: (event?: Gesture) => void) => void
}

/** The slice of `window` the waits read. */
export interface QuietWindow {
  addEventListener: (
    type: string,
    listener: (event?: Gesture) => void,
    options?: { passive?: boolean }
  ) => void
  removeEventListener: (type: string, listener: (event?: Gesture) => void) => void
  setTimeout: (handler: () => void, ms: number) => number
  clearTimeout: (id: number) => void
  /** Absent in some browsers (Safari): a short timeout stands in for it, the page's idle time then unknown. */
  requestIdleCallback?: (callback: () => void) => number
}

/** The two waits, and their teardown. */
export interface QuietTime {
  /** Resolves once the reader has not acted for {@link QUIET_AFTER_MS} and the page is idle. */
  whenQuiet: () => Promise<void>
  /**
   * Resolves after `ms`, or as soon as the browser says the network is back.
   * @param ms - the wait
   */
  sleep: (ms: number) => Promise<void>
  /** Stop listening to the reader's gestures. */
  dispose: () => void
}

/** What the reader is doing: when they last acted, and whether a pointer is down. */
interface ReaderState {
  /** Hear a gesture. */
  readonly mark: (event?: Gesture) => void
  /** Let every press go — a release the page may never hear. */
  readonly letGo: () => void
  /** When the reader last acted. */
  readonly lastGesture: () => number
  /** Whether a pointer is down now. */
  readonly pressed: () => boolean
}

/**
 * Follow the reader's gestures: the last one's time, and the pointers down, each by its id — a drag of two fingers is not
 * let go when the first lifts.
 * @param now - the clock, in milliseconds
 * @returns the state
 */
function createReaderState(now: () => number): ReaderState {
  let last = Number.NEGATIVE_INFINITY
  const down = new Set<number>()
  return {
    mark(event) {
      last = now()
      const id = event?.pointerId ?? 0
      if (event?.type === MAP_PRESS) down.add(id)
      else if (event?.type === 'pointerup' || event?.type === 'pointercancel') down.delete(id)
    },
    letGo() {
      down.clear()
    },
    lastGesture: () => last,
    pressed: () => down.size > 0,
  }
}

/**
 * Build the waits over a window and the map's element.
 * @param win - the window
 * @param map - the map's element — the canvas: a press counts there only
 * @param now - the clock, in milliseconds
 * @returns the waits
 */
export function createQuietTime(win: QuietWindow, map: QuietMap, now: () => number): QuietTime {
  let disposed = false
  const reader = createReaderState(now)
  map.addEventListener(MAP_PRESS, reader.mark, { passive: true })
  for (const type of GESTURES) win.addEventListener(type, reader.mark, { passive: true })
  for (const type of LETS_GO) win.addEventListener(type, reader.letGo, { passive: true })
  const idle = (callback: () => void): void => {
    if (win.requestIdleCallback) win.requestIdleCallback(callback)
    else win.setTimeout(callback, 50)
  }
  return {
    whenQuiet() {
      return new Promise((resolve) => {
        const check = (): void => {
          // Torn down: resolved, so the waiting preparation ends on its own check of the map gone.
          if (disposed) {
            resolve()
            return
          }
          // A button held keeps the map busy however long: checked again after the quiet's length.
          const left = reader.pressed()
            ? QUIET_AFTER_MS
            : reader.lastGesture() + QUIET_AFTER_MS - now()
          if (left > 0) win.setTimeout(check, left)
          else idle(resolve)
        }
        check()
      })
    },
    sleep(ms) {
      return new Promise((resolve) => {
        const done = (): void => {
          win.clearTimeout(timer)
          win.removeEventListener('online', done)
          resolve()
        }
        const timer = win.setTimeout(done, ms)
        win.addEventListener('online', done)
      })
    },
    dispose() {
      disposed = true
      map.removeEventListener(MAP_PRESS, reader.mark)
      for (const type of GESTURES) win.removeEventListener(type, reader.mark)
      for (const type of LETS_GO) win.removeEventListener(type, reader.letGo)
    },
  }
}
