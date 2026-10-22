import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { BrandMark } from '../../../icons/brandMark'
import { EDITOR_MESSAGES } from '../i18n'

import { BarButton } from './BarButton'

/**
 * The top bar: the mark, the application's name and the open year on the left; the file's actions on the
 * right — after the design's `appbar` (`design/chrome.js`), 2026-10-13.
 *
 * **Its buttons are all on screen, built or not** — the dev's call: the layout is in place and each
 * unbuilt one says which scenario it waits for. **No `[Export for the atlas…]`**, which the design has: the
 * atlas reads the editor's format since step 1, and `[Save]` writes into its folder since 2026-10-12, so an
 * export would redo by hand what the atlas does on load (`s04`, dropped the same day).
 *
 * The year stands where the design writes `europe-1100.json`: a year is a folder of three files, not one.
 * No "modified" mark yet — it needs the saved version tracked, a feature of its own.
 */

/** What the bar shows and does. */
export interface AppBarProps {
  /** The application's name, written beside the mark. */
  name: string
  /** The open year. */
  year: number
  /** Save the open year — what ‹ctrl+S› does. */
  onSave: () => void
  /** Open the *Open snapshot* dialogue (CARTO-238, rung 2b). */
  onOpenSnapshot: () => void
}

/**
 * Render the top bar.
 * @param props - what to show and what saving does
 * @param props.name - the application's name
 * @param props.year - the open year
 * @param props.onSave - save the open year
 * @param props.onOpenSnapshot - open the snapshot dialogue
 * @returns the brand and the actions, the two ends of the bar
 */
export function AppBar({ name, year, onSave, onOpenSnapshot }: AppBarProps) {
  // Context
  const t = useTranslation(EDITOR_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // Render
  return (
    <>
      <div className="app-brand">
        <BrandMark />
        <span className="app-brand__name">{name}</span>
        <span className="app-brand__sep" aria-hidden="true">
          ·
        </span>
        <span className="app-brand__year">{year}</span>
      </div>
      <div className="bar-actions">
        <BarButton label={action('open')} unavailable={t('notBuilt', { scenarios: 's01' })} />
        <BarButton
          label={action('openSnapshot')}
          onPress={onOpenSnapshot}
          hint={t('openSnapshotHint')}
        />
        <BarButton label={action('save')} onPress={onSave} hint={t('saveHint')} />
        <BarButton
          label={action('saveAs')}
          unavailable={t('notBuilt', { scenarios: 's04, s05' })}
        />
        <BarButton label={t('registry')} unavailable={t('notBuilt', { scenarios: 's07' })} />
      </div>
    </>
  )
}
