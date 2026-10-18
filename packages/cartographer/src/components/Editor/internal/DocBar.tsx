import { ChromeIcon } from '../../../icons/chromeIcons'

import { BarButton } from './BarButton'

import type { Ref } from 'react'

/**
 * The document bar: the open year's tab on the left, the history and the check on the right — after the
 * design's `docbar` (`design/chrome.js`), 2026-10-13.
 *
 * **The zoom is not a prop.** It changes on every wheel notch, and a value that changes per frame never goes
 * through a component (`react-canvas-and-panels`); the binding writes it into the node this view hands
 * back through `zoomRef`, as the status bar is written.
 */

/** What the bar shows and does. */
export interface DocBarProps {
  /** The open year. */
  year: number
  /** The gesture an undo would take back, or `null` when there is nothing to undo. */
  undoLabel: string | null
  /** The gesture a redo would apply again, or `null`. */
  redoLabel: string | null
  /** Undo, the gesture in progress first. */
  onUndo: () => void
  /** Redo. */
  onRedo: () => void
  /** Where the zoom is written, outside React. */
  zoomRef: Ref<HTMLSpanElement>
}

/**
 * Render the document bar.
 * @param props - the year, the history's state, its two actions and where the zoom goes
 * @param props.year - the open year
 * @param props.undoLabel - what an undo would take back
 * @param props.redoLabel - what a redo would apply again
 * @param props.onUndo - undo
 * @param props.onRedo - redo
 * @param props.zoomRef - where the zoom is written
 * @returns the tab and the actions, the two ends of the bar
 */
export function DocBar({ year, undoLabel, redoLabel, onUndo, onRedo, zoomRef }: DocBarProps) {
  // Render
  return (
    <>
      <div className="doc-tab">
        <BarButton
          label={`Close ${String(year)}`}
          unavailable="not built yet (s04)"
          icon={<ChromeIcon name="close" size={9} />}
          variant="icon"
        />
        <span className="doc-tab__name">{year}</span>
        <span className="doc-tab__meta">
          @ <span ref={zoomRef}>—</span>
        </span>
      </div>
      <div className="bar-actions">
        {/* Named after what it would revert, as the design has it; "nothing to undo" when there is none. */}
        <BarButton
          icon={<ChromeIcon name="undo" size={14} />}
          variant="icon"
          {...(undoLabel === null
            ? { label: 'Undo', unavailable: 'nothing to undo' }
            : {
                label: `Undo ${undoLabel}`,
                onPress: onUndo,
                hint: `Undo ${undoLabel} (⌘Z / ctrl+Z)`,
              })}
        />
        <BarButton
          icon={<ChromeIcon name="redo" size={14} />}
          variant="icon"
          {...(redoLabel === null
            ? { label: 'Redo', unavailable: 'nothing to redo' }
            : {
                label: `Redo ${redoLabel}`,
                onPress: onRedo,
                hint: `Redo ${redoLabel} (⌘⇧Z / ctrl+shift+Z)`,
              })}
        />
        <BarButton label="Check this year" unavailable="not built yet (s10)" variant="primary" />
      </div>
    </>
  )
}
