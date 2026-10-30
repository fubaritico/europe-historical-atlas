import { useEffect, useRef } from 'react'

/**
 * Keeps the keyboard's place when a field swaps one control for another — the place's search for the place held, and
 * back: the control that had the focus is gone, so the focus goes to the first control of the new one rather than
 * falling to the page. Only on a change of the value, never when the form opens.
 * @param value - what the swap follows; compared by identity
 * @returns the ref of the box holding the two controls
 */
export function useFocusOnSwap(value: unknown) {
  const box = useRef<HTMLDivElement>(null)
  const previous = useRef(value)

  useEffect(() => {
    if (previous.current === value) return
    previous.current = value
    box.current?.querySelector<HTMLElement>('button, input')?.focus()
  }, [value])

  return box
}
