import { useEffect, useRef } from 'react'

import { HOLD_TO_OPEN_MS } from '../railTools'

import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * Illustrator's press-and-hold: a press kept down for {@link HOLD_TO_OPEN_MS} opens the group, and that
 * press is then not also a click on the tool.
 *
 * **The "it opened" flag is consumed by the click that follows the hold, once** (ARCH-015 / A11Y-001 /
 * QUAL-001, found in review): left set, it swallowed every later activation that comes with no
 * pointerdown — Enter or Space on the button — so after one hold the keyboard could no longer take the
 * Pen. The timer is cleared on release, on leave, on cancel and on unmount.
 * @param enabled - whether the button heads a group at all
 * @param open - what to do when the hold completes
 * @returns the pointer handlers, and `consumeHold`, which tells the click whether it ends a hold
 */
export function useHoldToOpen(enabled: boolean, open: () => void) {
  // Refs
  const hold = useRef<{ timer: number; opened: boolean } | null>(null)

  // Handlers
  const stop = () => {
    if (hold.current !== null) window.clearTimeout(hold.current.timer)
  }

  // Effects
  useEffect(() => stop, [])

  // Return
  return {
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!enabled || event.button !== 0) return
      stop()
      const state = { timer: 0, opened: false }
      state.timer = window.setTimeout(() => {
        state.opened = true
        open()
      }, HOLD_TO_OPEN_MS)
      hold.current = state
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    consumeHold: () => {
      const opened = hold.current?.opened === true
      hold.current = null
      return opened
    },
  }
}
