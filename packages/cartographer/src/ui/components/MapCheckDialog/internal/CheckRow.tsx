import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_CHECK_MESSAGES } from '../i18n'

import type { ReactNode } from 'react'

/** One polity in a group of [Check this year]. */
export interface CheckRowProps {
  /** The polity's id on the map. */
  id: string
  /** The polity's name on the map — what the row is named after. */
  name: string
  /** What the row says beyond the name — the CMS's name and dates, why it is tied to nothing. */
  detail: string | null
  /**
   * Open a polity's form.
   * @param id - the polity's id
   */
  onOpen: (id: string) => void
  /** The row's own action — « Aligner », « Modifier dans le CMS ». */
  children?: ReactNode
}

/**
 * Render a row: the polity's name, a button that opens its form, then what the row says and its action.
 * @param props - the polity, the detail, the opening and the action
 * @param props.id - the polity's id
 * @param props.name - the polity's name on the map
 * @param props.detail - what the row says beyond the name
 * @param props.onOpen - opens the polity's form
 * @param props.children - the row's own action, if any
 * @returns the row, a list item
 */
export function CheckRow({ id, name, detail, onOpen, children }: CheckRowProps) {
  // Context
  const t = useTranslation(MAP_CHECK_MESSAGES)

  // Handlers
  const handleOpen = (): void => {
    onOpen(id)
  }

  // Render
  return (
    <li className="map-check__row">
      <button
        type="button"
        className="map-check__polity"
        aria-label={t('openPolity', { name })}
        onClick={handleOpen}
      >
        {name}
      </button>
      {detail !== null && <span className="map-check__detail">{detail}</span>}
      {children}
    </li>
  )
}
