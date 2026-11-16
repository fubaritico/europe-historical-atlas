import { useEffect, useRef } from 'react'

/**
 * Runs a gesture once a value changes — and once at the first draw — whatever the gesture's own identity, made anew
 * at each render (2026-11-16: the block's lines cleared when another holder is chosen).
 * @param value - the value watched
 * @param act - what to do once it changes
 */
export function useOnChange(value: unknown, act: () => void): void {
  const latest = useRef(act)
  latest.current = act
  useEffect(() => {
    latest.current()
  }, [value])
}
