import { focusMarked } from './focusMarked'
import { menuAlong } from './menuAlong'
import { titleKey } from './titleKey'

import type { MenuDefinition } from '../menuBarProps'
import type { KeyboardEvent } from 'react'

/** What answering a title's key reads and does — the bar's, handed in. */
export interface TitleKeyDeps {
  /** The bar's menus. */
  menus: readonly MenuDefinition[]
  /** The menu open, or `null`. */
  open: string | null
  /** The bar's element, where the titles are focused. */
  root: HTMLElement | null
  /** Open a menu, the focus on its first or its last command. */
  openMenu: (id: string, start: 'first' | 'last') => void
  /** Close the menu open. */
  close: () => void
}

/**
 * Answer a key pressed on a title of the bar (`titleKey`): along the titles, into its menu, or out of it — the key
 * taken from the browser only when it does something.
 * @param event - the key, on the title
 * @param deps - the bar's menus, what is open, and what to do
 */
export function answerTitleKey(event: KeyboardEvent<HTMLButtonElement>, deps: TitleKeyDeps): void {
  const id = event.currentTarget.dataset.menu ?? null
  const action = titleKey(event.key)
  if (id === null || action === null || (action.kind === 'close' && deps.open === null)) return
  event.preventDefault()
  if (action.kind === 'along')
    focusMarked(deps.root, 'menu', menuAlong(deps.menus, id, action.move))
  else if (action.kind === 'open') deps.openMenu(id, action.start)
  else deps.close()
}
