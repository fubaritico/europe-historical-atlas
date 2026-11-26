/**
 * Whether the author made a gesture since the last time it was asked (CARTO-567) — what keeps the CMS's session alive:
 * the keeper prolongs it only after a gesture, so two hours without one and the author signs in again (the dev's rule of
 * 2026-11-26). A gesture is a press of the pointer, a key or the wheel, anywhere on the page; a pointer only moved over
 * the map is not one.
 */

/** The events that count as a gesture. */
export const GESTURE_EVENTS = ['pointerdown', 'keydown', 'wheel'] as const

/** Where the gestures are heard — the window, or a literal in a test. */
export interface GestureTarget {
  /**
   * Listen to an event.
   * @param type - the event's name
   * @param listener - what to run
   * @param options - heard at capture and passive, so no handler of the page can hide a gesture from it
   */
  addEventListener: (
    type: string,
    listener: () => void,
    options: { capture: boolean; passive: boolean }
  ) => void
}

/** The watch's one question. */
export interface GestureWatch {
  /**
   * Whether a gesture was made since the last call — the call starts the count over.
   * @returns `true` when one was
   */
  gestured: () => boolean
}

/**
 * Watch the gestures on a target. **The first answer is `true`**: signing in is itself a gesture, so the first beat
 * after it prolongs. Listened to for the page's whole life — there is one, made once by the composition root.
 * @param target - where to listen
 * @returns the watch
 */
export function createGestureWatch(target: GestureTarget): GestureWatch {
  let made = true
  const mark = () => {
    made = true
  }
  for (const type of GESTURE_EVENTS)
    target.addEventListener(type, mark, { capture: true, passive: true })
  return {
    gestured: () => {
      const answer = made
      made = false
      return answer
    },
  }
}
