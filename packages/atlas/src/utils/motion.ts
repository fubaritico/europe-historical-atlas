/**
 * Whether the reader has asked their system to reduce motion.
 *
 * One implementation rather than a two-line check repeated wherever something animates: the guards
 * matter (`matchMedia` is absent under a bare jsdom, and `window` itself is absent in a worker), and a
 * copy that forgets one of them throws in exactly the environment the copy was made for.
 * @returns `true` when the OS setting asks for reduced motion
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
