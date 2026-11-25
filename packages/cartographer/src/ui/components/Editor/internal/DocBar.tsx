import { useShortcut } from '../../../hooks/useShortcut'
import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { ChromeIcon } from '../../../icons/chromeIcons'
import { DocTabs } from '../../DocTabs'
import { EDITOR_MESSAGES } from '../i18n'

import { BarButton } from './BarButton'

import type { DocTabsProps } from '../../DocTabs'

/**
 * The document bar: the tabs of the maps open on the left (CARTO-556), the history and the check on the right — after the
 * design's `docbar` (`design/chrome.js`), 2026-10-13.
 *
 * **The zoom is not a prop.** It changes on every wheel notch, and a value that changes per frame never goes
 * through a component (`react-canvas-and-panels`); the binding writes it into the node this view hands
 * back through `zoomRef`, as the status bar is written.
 */

/** What the bar shows and does: the tabs of the maps open (CARTO-556), and the history. */
export interface DocBarProps extends DocTabsProps {
  /** The gesture an undo would take back, or `null` when there is nothing to undo. */
  undoLabel: string | null
  /** The gesture a redo would apply again, or `null`. */
  redoLabel: string | null
  /** Undo, the gesture in progress first. */
  onUndo: () => void
  /** Redo. */
  onRedo: () => void
}

/**
 * Render the document bar.
 * @param props - the tabs, the history's state, its two actions and where the zoom goes
 * @param props.tabs - the maps open, each its tab
 * @param props.onActivate - show a map
 * @param props.onClose - close a map
 * @param props.undoLabel - what an undo would take back
 * @param props.redoLabel - what a redo would apply again
 * @param props.onUndo - undo
 * @param props.onRedo - redo
 * @param props.zoomRef - where the zoom is written
 * @returns the tab and the actions, the two ends of the bar
 */
export function DocBar({ undoLabel, redoLabel, onUndo, onRedo, ...tabsProps }: DocBarProps) {
  // Context
  const t = useTranslation(EDITOR_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)
  const shortcut = useShortcut()

  // Derived
  const undo = undoLabel === null ? null : action('undoStep', { step: undoLabel })
  const redo = redoLabel === null ? null : action('redoStep', { step: redoLabel })

  // Render
  return (
    <>
      <DocTabs {...tabsProps} />
      <div className="bar-actions">
        {/* Named after what it would revert, as the design has it; "nothing to undo" when there is none. */}
        <BarButton
          icon={<ChromeIcon name="undo" size={14} />}
          variant="icon"
          {...(undo === null
            ? { label: action('undo'), unavailable: t('nothingToUndo') }
            : {
                label: undo,
                onPress: onUndo,
                hint: t('undoHint', { label: undo, keys: shortcut('undo').shown }),
              })}
        />
        <BarButton
          icon={<ChromeIcon name="redo" size={14} />}
          variant="icon"
          {...(redo === null
            ? { label: action('redo'), unavailable: t('nothingToRedo') }
            : {
                label: redo,
                onPress: onRedo,
                hint: t('redoHint', { label: redo, keys: shortcut('redo').shown }),
              })}
        />
        <BarButton
          label={t('checkYear')}
          unavailable={t('notBuilt', { scenarios: 's10' })}
          variant="primary"
        />
      </div>
    </>
  )
}
