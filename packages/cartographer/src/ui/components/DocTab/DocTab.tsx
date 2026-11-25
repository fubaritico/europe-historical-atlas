import { useTranslation } from '../../hooks/useTranslation'
import { ChromeIcon } from '../../icons/chromeIcons'

import { DOC_TAB_MESSAGES } from './i18n'

import type { DocTabProps } from './docTabProps'

/**
 * The tab of a map open, in the document bar (CARTO-556), as Illustrator's: its cross, which closes the map, then the
 * map's name and — on the tab shown — its zoom, written outside React. **A component of its own, made for a list**: the
 * document bar holds the tabs of the maps open — one today; several maps open at once, each its tab, is to be built.
 * The tab is a `role="tab"` button beside its cross — never a button holding another, which no one can reach.
 * @param props - the map, whether it is shown, where the zoom goes, and the two gestures
 * @param props.id - the map
 * @param props.name - the map's name
 * @param props.active - whether it is the map shown
 * @param props.zoomRef - where the zoom is written, the active tab's only
 * @param props.onActivate - show this map
 * @param props.onClose - close this map
 * @returns the tab
 */
export function DocTab({ id, name, active, zoomRef, onActivate, onClose }: DocTabProps) {
  // Context
  const t = useTranslation(DOC_TAB_MESSAGES)

  // Handlers
  const handleClose = (): void => {
    onClose(id)
  }
  const handleActivate = (): void => {
    onActivate(id)
  }

  // Render
  return (
    <div className="doc-tab" data-active={active}>
      <button
        type="button"
        className="bar-button bar-button--icon doc-tab__close"
        aria-label={t('close', { name })}
        title={t('close', { name })}
        onClick={handleClose}
      >
        <ChromeIcon name="close" size={9} />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active}
        className="doc-tab__tab"
        onClick={handleActivate}
      >
        <span className="doc-tab__name">{name}</span>
        {/* A space between the two, or the tab is read « 1100-essai@ 58 % »: the gap is the eye's alone. */}
        {zoomRef === undefined ? null : ' '}
        {zoomRef === undefined ? null : (
          <span className="doc-tab__meta">
            @ <span ref={zoomRef}>—</span>
          </span>
        )}
      </button>
    </div>
  )
}
