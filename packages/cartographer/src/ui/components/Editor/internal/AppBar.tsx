import { useShortcut } from '../../../hooks/useShortcut'
import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { BrandMark } from '../../../icons/brandMark'
import { EDITOR_MESSAGES } from '../i18n'

import { BarButton } from './BarButton'

import type { ReactNode } from 'react'

/**
 * The top bar: the mark, the application's name and the open year on the left; the file's actions on the
 * right — after the design's `appbar` (`design/chrome.js`), 2026-10-13.
 *
 * **Its buttons are all on screen, built or not** — the dev's call: the layout is in place and each
 * unbuilt one says which scenario it waits for. **No `[Export for the atlas…]`**, which the design has: the
 * atlas reads the editor's format since step 1, and `[Save]` writes into its folder since 2026-10-12, so an
 * export would redo by hand what the atlas does on load (`s04`, dropped the same day).
 *
 * The map's name stands where the design writes `europe-1100.json`: a map is a folder of three files, and its name is
 * the folder's (`s19`). No "modified" mark yet.
 */

/** What the bar shows and does. */
export interface AppBarProps {
  /** The application's name, written beside the mark. */
  name: string
  /** The map open — its folder's name (`s19`). */
  map: string
  /** *Open…*: the maps of `years/`, one to open. */
  onOpen: () => void
  /** *Save*: the map open, as ‹ctrl+S›. */
  onSave: () => void
  /** *Save as…*: a name, then the map saved and written under it, the page going on as the new map. */
  onSaveAs: () => void
  /** *Save a copy*: the map written as `<map>.copy.<date and time>`, the page staying the map it is. */
  onSaveCopy: () => void
  /** The menu bar, beside the name (CARTO-345) — built by its binding, which knows the store. */
  menus?: ReactNode
}

/**
 * Render the top bar.
 * @param props - what to show and what the four gestures do
 * @param props.name - the application's name
 * @param props.map - the map open
 * @param props.onOpen - open the dialogue of the maps
 * @param props.onSave - save the map open
 * @param props.onSaveAs - open the dialogue of *Save as…*
 * @param props.onSaveCopy - save a copy
 * @param props.menus - the menu bar, beside the name
 * @returns the brand and the actions, the two ends of the bar
 */
export function AppBar({ name, map, onOpen, onSave, onSaveAs, onSaveCopy, menus }: AppBarProps) {
  // Context
  const t = useTranslation(EDITOR_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)
  const shortcut = useShortcut()

  // Render
  return (
    <>
      <div className="app-start">
        <div className="app-brand">
          <BrandMark />
          <span className="app-brand__name">{name}</span>
          <span className="app-brand__sep" aria-hidden="true">
            ·
          </span>
          <span className="app-brand__year">{map}</span>
        </div>
        {menus}
      </div>
      <div className="bar-actions">
        <BarButton
          label={action('open')}
          onPress={onOpen}
          hint={t('openHint', { keys: shortcut('open').shown })}
        />
        <BarButton
          label={action('save')}
          onPress={onSave}
          hint={t('saveHint', { keys: shortcut('save').shown })}
        />
        <BarButton
          label={action('saveAs')}
          onPress={onSaveAs}
          hint={t('saveAsHint', { keys: shortcut('saveAs').shown })}
        />
        <BarButton label={action('saveCopy')} onPress={onSaveCopy} hint={t('saveCopyHint')} />
        <BarButton label={t('registry')} unavailable={t('notBuilt', { scenarios: 's07' })} />
      </div>
    </>
  )
}
