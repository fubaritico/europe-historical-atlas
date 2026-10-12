import { useSyncExternalStore } from 'react'

import './workbench.css'

import type { ReactNode } from 'react'

/** One plate of the workbench: a piece of the chrome, mounted alone on literal data. */
export interface WorkbenchEntry {
  /** Stable, URL-safe: it is the page's hash, so a reload lands back on the same plate. */
  id: string
  /** What the plate shows, as listed on the left. */
  title: string
  /** Why the plate exists, or what to look at on it. Optional. */
  note?: string
  /**
   * The stage's width in CSS pixels. Defaults to the dock's (`--dock-w`), since that is where most of the
   * chrome lives — a control judged at another width is judged out of context.
   */
  width?: number
  /** The plate's content. Called at render, so each plate holds its own state. */
  render: () => ReactNode
}

/** What the workbench is handed: its plates, in the order they are listed. */
export interface WorkbenchProps {
  /** Every plate, in display order. */
  entries: readonly WorkbenchEntry[]
}

/** Re-render on every hash change: the hash is the selected plate. */
function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
  }
}

/** The current hash, without its `#`. */
function readHash(): string {
  return window.location.hash.slice(1)
}

/**
 * The workbench: a list of plates on the left, the selected one on a stage the colour of a panel.
 *
 * **The selection is the URL's hash**, not React state, so a reload — which Vite's hot reload sometimes
 * forces — lands back on the plate being worked on. An unknown or empty hash shows the first plate.
 * @param props - the plates
 * @returns the workbench page
 */
export function Workbench({ entries }: WorkbenchProps) {
  // State
  const hash = useSyncExternalStore(subscribeToHash, readHash)

  // Derived
  const selected = entries.find((entry) => entry.id === hash) ?? entries[0]

  // Render
  return (
    <div className="workbench">
      <nav className="workbench__nav" aria-label="Plates">
        <h1 className="workbench__title">Workbench</h1>
        <ul className="workbench__list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <a
                className="workbench__link"
                href={`#${entry.id}`}
                aria-current={entry === selected ? 'page' : undefined}
              >
                {entry.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <main className="workbench__main">
        {selected === undefined ? (
          <p className="workbench__note">No plate yet.</p>
        ) : (
          <>
            <h2 className="workbench__heading">{selected.title}</h2>
            {selected.note === undefined ? null : (
              <p className="workbench__note">{selected.note}</p>
            )}
            <div
              className="workbench__stage"
              style={selected.width === undefined ? undefined : { width: selected.width }}
            >
              {selected.render()}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
