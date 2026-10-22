import { describeDrawingTarget } from '../../../state/drawingTarget'
import { useTranslation } from '../../hooks/useTranslation'
import { polityRows } from '../../utils/polityRows'
import { Panel } from '../Panel'
import { PolityList } from '../PolityList'

import { useArrangeMenu } from './hooks/useArrangeMenu'
import { usePolityForm } from './hooks/usePolityForm'
import { POLITIES_PANEL_MESSAGES } from './i18n'
import { EditDialog } from './internal/EditDialog'
import { PolitiesFoot } from './internal/PolitiesFoot'
import { PolityArrangeMenu } from './internal/PolityArrangeMenu'

import type { PolityColourSource } from '../../../state/polityColourSource'
import type { CartographerStoreHook } from '../../../state/store'
import type { WikidataSource } from '../../../wikidata/wikidataSource'

/** What the panel needs: the store, the colours its rows show, and where to say what a command did. */
export interface PolitiesPanelProps {
  /** The store polities are created in. */
  store: CartographerStoreHook
  /** Where the polities' colours come from — the canvas reads the same source. */
  colours: PolityColourSource
  /** Say what a command did, in the status bar's result zone — the one live region (A11Y-003). */
  onResult: (message: string | null) => void
  /** Where the polity form reads Wikidata from (CARTO-243). */
  wikidata: WikidataSource
}

/**
 * `{Polities}` as it stands today: its title bar, the tree, and the action bar at its foot (`s07`, *The
 * panel's action bar*) — `[+]` and the trash.
 *
 * **The list follows the document**: every polity of the year as the tree of groups, front first
 * (`s16`), the one aimed at marked, those with nothing drawn marked *"no territory"* (`s02`). Choosing a
 * row aims at it and leaves the tool in hand — `next.md`'s *"we pick who, then act"*.
 * @param props - the store, the colour source and the result sink
 * @param props.store - the store the polities are read from and created in
 * @param props.colours - where the rows' colours come from, the source the canvas reads too
 * @param props.onResult - says what a command did, in the status bar's result zone
 * @param props.wikidata - where the polity form reads Wikidata from
 * @returns the panel's head, the tree, the stacking menu when open, and the dialogue it opens
 */
export function PolitiesPanel({ store, colours, onResult, wikidata }: PolitiesPanelProps) {
  // Store
  const target = store((state) => state.target)
  // The document is mutated in place: the version is what changes when a polity is added or drawn.
  const version = store((state) => state.version)

  // Store actions
  const chooseTarget = store((state) => state.chooseTarget)

  // Context
  const t = useTranslation(POLITIES_PANEL_MESSAGES)

  // State
  const { arranging, openMenu, closeMenu, panel } = useArrangeMenu()
  const form = usePolityForm(store)

  // Derived
  const { document } = store.getState()

  // Handlers
  // A dialogue unmounted rather than closed gives the focus back to nothing: it is handed to the list.
  const focusList = () => {
    panel.current?.querySelector<HTMLElement>('.polities__list')?.focus()
  }
  const handleEdited = () => {
    form.close()
    focusList()
  }

  // Render
  return (
    // Its actions sit in the bar at the foot (`PolitiesActions`), not in the head — the dev's request,
    // 2026-10-12.
    <Panel
      ref={panel}
      title={t('title')}
      fill
      foot={
        <PolitiesFoot store={store} onResult={onResult} onDone={focusList} wikidata={wikidata} />
      }
    >
      <PolityList
        year={document.year}
        rows={polityRows(document, colours.coloursOf(document, version))}
        targetId={describeDrawingTarget(document, target)?.id ?? null}
        onChoose={chooseTarget}
        onMenu={openMenu}
        onEdit={form.open}
      />
      {arranging === null ? null : (
        <PolityArrangeMenu
          store={store}
          request={arranging}
          onClose={closeMenu}
          onResult={onResult}
          onEdit={form.open}
        />
      )}
      <EditDialog store={store} edited={form.edited} onEdited={handleEdited} wikidata={wikidata} />
    </Panel>
  )
}
