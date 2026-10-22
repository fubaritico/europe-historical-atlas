import { useTranslation } from '../../hooks/useTranslation'
import { APP_MESSAGES } from '../../i18n/app'

import type { CartographerStoreHook } from '../../state/store'

/** Off-screen but in the accessibility tree — the heading has nothing to show visually. */
const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

/**
 * The page's `<h1>`, hidden: what a screen reader is told the page is — the Cartographer and the year open,
 * in the page's language (ATLAS-159). The shell places it inside the canvas landmark.
 * @param props - the store
 * @param props.store - the store the open year is read from
 * @returns the heading
 */
export function PageHeading({ store }: { store: CartographerStoreHook }) {
  // Store
  const year = store((state) => state.document.year)

  // Context
  const app = useTranslation(APP_MESSAGES)

  // Render
  return <h1 style={VISUALLY_HIDDEN}>{app('heading', { year: String(year) })}</h1>
}
