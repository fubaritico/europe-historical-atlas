import { IconButton } from '@fubaritico/react/IconButton'
import { useCallback, useRef, useState } from 'react'

import { describeDrawingTarget } from '../state/drawingTarget'

import { NewPolityDialog } from './NewPolityDialog'
import { PolityArrangeMenu } from './PolityArrangeMenu'
import { PolityList } from './PolityList'
import { polityRows } from './polityRows'

import type { ArrangeRequest } from './PolityArrangeMenu'
import type { PolityColourSource } from '../state/polityColourSource'
import type { CartographerStoreHook } from '../state/store'

/** What the panel needs: the store, handed on to the dialogue. */
export interface PolitiesPanelProps {
  /** The store polities are created in. */
  store: CartographerStoreHook
  /** Where the polities' colours come from — the canvas reads the same source. */
  colours: PolityColourSource
}

/**
 * `{Polities}` as it stands today: its title bar and `[+ New polity]`, where `design/03` puts it — the
 * `+` at the end of the panel's tab strip.
 *
 * **The list follows the document**: every polity of the year as the tree of groups, front first
 * (`s16`), the one aimed at marked, those with nothing drawn marked *"no territory"* (`s02`). Choosing a
 * row aims at it and leaves the tool in hand — `next.md`'s *"we pick who, then act"*.
 * @param props - the store
 * @returns the panel's head and the dialogue it opens
 */
export function PolitiesPanel({ store, colours }: PolitiesPanelProps) {
  const [creating, setCreating] = useState(false)
  const [arranging, setArranging] = useState<ArrangeRequest | null>(null)
  const chooseTarget = store((state) => state.chooseTarget)
  const target = store((state) => state.target)
  // The document is mutated in place: the version is what changes when a polity is added or drawn.
  const version = store((state) => state.version)
  const { document } = store.getState()
  const panel = useRef<HTMLElement | null>(null)
  const closeMenu = useCallback(() => {
    setArranging(null)
    // Focus goes back to this panel's list, where the menu was asked for, so the keys carry on there.
    panel.current?.querySelector<HTMLElement>('.polities__list')?.focus()
  }, [])
  return (
    <section ref={panel} className="polities" aria-label="Polities">
      <header className="polities__head">
        <h2 className="polities__title">Polities</h2>
        <IconButton
          icon="Plus"
          aria-label="New polity"
          onClick={() => {
            setCreating(true)
          }}
        />
      </header>
      <PolityList
        year={document.year}
        rows={polityRows(document, colours.coloursOf(document, version))}
        targetId={describeDrawingTarget(document, target)?.id ?? null}
        onChoose={chooseTarget}
        onMenu={(id, at) => {
          setArranging({ id, at })
        }}
      />
      {arranging === null ? null : (
        <PolityArrangeMenu store={store} request={arranging} onClose={closeMenu} />
      )}
      <NewPolityDialog
        store={store}
        isOpen={creating}
        onClose={() => {
          setCreating(false)
        }}
      />
    </section>
  )
}
