import { ListboxList } from '@fubaritico/react/Listbox'
import { useEffect } from 'react'

import { useTranslation } from '../../hooks/useTranslation'
import { ListFilter } from '../ListFilter'

import { useListCursor } from './hooks/useListCursor'
import { useRowFilter } from './hooks/useRowFilter'
import { POLITY_LIST_MESSAGES } from './i18n'
import { PolitiesSubhead } from './internal/PolitiesSubhead'
import { PolityOption } from './internal/PolityOption'
import { optionId } from './utils/optionId'
import { showRow } from './utils/showRow'

import type { ViewportPoint } from '../../../viewport/viewport'
import type { PolityRow } from '../../utils/polityRows'

/** What the list shows and reports. Never the store: `PolitiesPanel` reads it and hands rows. */
export interface PolityListProps {
  /** The year being drawn, for the subhead — `design/01`'s *"Drawn at 1100"*. */
  year: number
  /** The rows, already sorted. */
  rows: readonly PolityRow[]
  /** The id of the polity the tools act on, or `null`. */
  targetId: string | null
  /** A row was chosen — a click, or ‹enter› on the one the keys are on. */
  onChoose: (id: string) => void
  /**
   * A row's menu was asked for — a right-click, or ‹shift+F10› / the menu key on the row the keys are
   * on (or the target) — with where to open it, in viewport pixels (`s16`).
   */
  onMenu: (id: string, at: ViewportPoint) => void
  /** A row was double-clicked — its polity's dialogue, as a layer's options in Illustrator (`s07`). */
  onEdit: (id: string) => void
}

/**
 * `{Polities}`' list: every polity of the year, the target marked, a click or ‹enter› aiming at one —
 * `s02`'s *"selecting the target is a gesture of `{Polities}`"*.
 *
 * **A listbox, focus on the list**, the design system's own shape: ↑ ↓ Home End move the keyboard's
 * cursor through `aria-activedescendant`, ‹enter› or ‹space› chooses. The target is the selected option
 * — the persistent state — and the keys' cursor is the active one, two states kept apart as the design
 * system keeps them.
 *
 * **A filter at its head** (CARTO-360): the rows whose name holds what is typed, each under its suzerains, greyed
 * when they do not answer themselves (`filterRows`). The keys' cursor walks the rows shown. What is typed is the
 * list's own — one writer, one reader, no slice — so it empties when the panel is docked or floated (CARTO-342).
 * @param props - the rows, the target and the choice
 * @param props.year - the year being drawn, written in the subhead
 * @param props.rows - the rows to show, already sorted
 * @param props.targetId - the id of the polity the tools act on, marked as selected, or `null`
 * @param props.onChoose - aims at a polity, given its id — a click, or ‹enter› on the active row
 * @param props.onMenu - opens a row's menu, given its id and where to open it in viewport pixels
 * @param props.onEdit - opens a polity's dialogue, given its id — a double-click, or ‹enter› on the polity chosen
 * @returns the filter, the subhead and the list — or a line saying the year is empty, or that nothing answers
 */
export function PolityList({ year, rows, targetId, onChoose, onMenu, onEdit }: PolityListProps) {
  // Context
  const t = useTranslation(POLITY_LIST_MESSAGES)

  // State
  const { query, setQuery, filtered, keysTarget } = useRowFilter(rows, targetId)
  const cursor = useListCursor(filtered.rows, keysTarget, onChoose, onMenu, onEdit)

  // Effects
  useEffect(() => {
    if (targetId !== null) showRow(targetId)
  }, [targetId])

  // Render
  return (
    <>
      {rows.length === 0 ? null : (
        <ListFilter value={query} onChange={setQuery} label={t('filter')} />
      )}
      <PolitiesSubhead year={year} count={filtered.found} total={rows.length} />
      {rows.length === 0 ? (
        <p className="polities__empty">{t('empty')}</p>
      ) : filtered.rows.length === 0 ? (
        <p className="polities__empty">{t('noMatch', { query: query.trim() })}</p>
      ) : (
        <ListboxList
          variant="dark"
          className="polities__list"
          // The design system's list is a bare <ul>: the role is the consumer's to declare, and options
          // with no listbox around them are not read as a list at all.
          role="listbox"
          aria-label={t('label')}
          tabIndex={0}
          {...(cursor.activeId === null || cursor.active < 0
            ? {}
            : { 'aria-activedescendant': optionId(cursor.activeId) })}
          onKeyDown={cursor.onKeyDown}
        >
          {filtered.rows.map((row) => (
            <PolityOption
              key={row.id}
              row={row}
              id={optionId(row.id)}
              selected={row.id === targetId}
              active={row.id === cursor.activeId}
              dimmed={filtered.dimmed.has(row.id)}
              onChoose={onChoose}
              onMenu={onMenu}
              onEdit={onEdit}
            />
          ))}
        </ListboxList>
      )}
    </>
  )
}
