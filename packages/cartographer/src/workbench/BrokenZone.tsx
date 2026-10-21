import type { ReactNode } from 'react'

/**
 * A zone that always fails to render — what the workbench puts behind an `ErrorBoundary` to show its fallback,
 * which nothing in the application reaches on purpose.
 * @returns never: it throws
 */
export function BrokenZone(): ReactNode {
  // Render
  throw new Error('the value "name" is missing, at 0 in "{name} was saved"')
}
