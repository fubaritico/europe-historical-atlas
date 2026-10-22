import { Component } from 'react'

import { ErrorFallback } from './internal/ErrorFallback'

import type { ErrorInfo, ReactNode } from 'react'

/** How a zone is guarded. */
export interface ErrorBoundaryProps {
  /** Which zone, for the console line — "the tool rail", "the Polities panel". */
  zone: string
  /**
   * Whether its fallback offers « Retry », remounting the zone — the canvas. A remount reloads and re-bakes
   * the backdrop (a couple of seconds) and redraws the document, which lives in the store: nothing drawn is lost.
   */
  retry?: boolean
  /**
   * Close the zone — a menu's own close. A menu carries its dismissal (‹escape›, a press outside) in the
   * component that failed, so without this its fallback could not be closed at all.
   */
  onDismiss?: () => void
  /** One line instead of a centred block — for the bars, 24 to 30 px high, where the block would overflow. */
  compact?: boolean
  /** The zone. */
  children: ReactNode
}

/** Whether the zone failed, and with what. */
interface ErrorBoundaryState {
  /** The error that took the zone down, or `null` while it stands. */
  error: Error | null
}

/**
 * One zone of the Cartographer, kept from taking the rest down (the dev's call, 2026-10-21): where it fails,
 * its place shows the error, centred, and the other zones carry on. One per zone — each panel through
 * `Panel`, the bars, the rail, the menus, the canvas — and one at the root (`rules/error-handling.md`).
 *
 * **A class, because React has no hook for this**: `getDerivedStateFromError` and `componentDidCatch` exist
 * only on a class component, in React 19 as before.
 *
 * **What it does not see**: an error thrown in an event handler, a `requestAnimationFrame` or a timer — where
 * the canvas does nearly all its work. Those never reach a boundary.
 *
 * **Never silent**: what it catches is written to the console with the zone's name, then shown. A zone stays
 * failed until it is retried, closed, or the page reloads — only the canvas is retried, by decision.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /** Standing, until something below it throws. */
  override state: ErrorBoundaryState = { error: null }

  /**
   * Take the zone down for what was thrown.
   * @param error - whatever a render below threw
   * @returns the state showing the fallback
   */
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  /**
   * Say it, with the zone's name and where in the tree it happened.
   * @param error - what was thrown
   * @param info - the component stack React gives
   */
  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(`[Cartographer] ${this.props.zone} failed`, error, info.componentStack)
  }

  /**
   * The zone, or its fallback.
   * @returns what to show
   */
  override render(): ReactNode {
    const { error } = this.state
    const { retry, onDismiss, compact } = this.props
    if (error === null) return this.props.children
    const handleRetry = () => {
      this.setState({ error: null })
    }
    return (
      <ErrorFallback
        message={error.message}
        compact={compact === true}
        {...(retry === true ? { onRetry: handleRetry } : {})}
        {...(onDismiss === undefined ? {} : { onDismiss })}
      />
    )
  }
}
