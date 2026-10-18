import { useRef } from 'react'

import { LayersPanel } from './LayersPanel'
import { LinePanel } from './LinePanel'
import { MapArea } from './MapArea'
import { OverridesPanel } from './OverridesPanel'
import { PolitiesPanel } from './PolitiesPanel'
import { Shell } from './Shell'
import { writeResult } from './statusBar'
import { ToolRailPanel } from './ToolRailPanel'
import { AppBarPanel, DocBarPanel } from './TopBars'
import { useRelayedResults } from './useRelayedResults'

import type { BackdropLoad } from './MapArea'
import type { HistoryRelay } from '../canvas/historyRelay'
import type { PaintStyle } from '../canvas/painter'
import type { ResultRelay } from '../persistence/resultRelay'
import type { PolityColourSource } from '../state/polityColourSource'
import type { CartographerStoreHook } from '../state/store'
import type { WikidataSource } from '../wikidata/wikidataSource'
import type { ReactNode, RefObject } from 'react'

/**
 * The editor as a page: the shell, with the map in its zone and the status bar in its row.
 *
 * **Why this exists as a component rather than as JSX in `main.tsx`.** The status bar's node has to be
 * reachable from two places — the shell renders it, the map writes into it — so something has to hold a
 * ref across both, and a ref needs a component. `main.tsx` cannot: it is a module, not a component, and
 * declaring one there is what Fast Refresh cannot reload (`react-refresh/only-export-components`).
 *
 * **It is the binding of the shell/view/binding split** (`react-canvas-and-panels`): it knows there is a
 * store and which zone takes what, and it holds no layout and no value of its own. Every zone is filled since
 * 2026-10-13; one left out would come back from {@link Shell} as a named placeholder, which is the dev's call of 2026-10-08: an empty zone should look deliberately
 * empty rather than broken.
 */

/**
 * The status bar's three zones, each written imperatively through its ref.
 *
 * No `aria-live` on the row, and that is the accessibility decision rather than an omission: the action and
 * the position change on every pointer sample, so announcing them would make a screen reader unusable — the
 * very failure `role="status"` exists to avoid elsewhere. A keyboard reader gets nothing from them today,
 * which is honest; what will serve them is the anchor list of step 5, not a firehose.
 * @param props - the three zones' refs
 * @param props.action - what is being done, and to whom
 * @param props.result - what a gesture did
 * @param props.position - where the pointer is
 * @param props.feature - what is under it — a border, or a polity
 * @returns the row
 */
function StatusRow({
  action,
  result,
  position,
  feature,
}: {
  action: RefObject<HTMLElement | null>
  result: RefObject<HTMLElement | null>
  position: RefObject<HTMLElement | null>
  feature: RefObject<HTMLElement | null>
}) {
  // Render
  return (
    <p className="shell__status">
      <span className="shell__action" ref={action} />
      {/* The one zone that speaks: a result is rare and discrete, unlike the action and the position,
          which change on every pointer sample and would drown a screen reader (A11Y-001). */}
      <span className="shell__result" ref={result} role="status" />
      <span className="shell__position" ref={position} />
      {/* What is under the pointer, beside where it is — the mockup's "Holy Roman Empire · empire". */}
      <span className="shell__feature" ref={feature} />
    </p>
  )
}

/**
 * The dock's panels, top to bottom: `{Polities}`, `{Line}` — the selected stretch's style — `{Overrides}`, then `{Layers}`.
 * @param props - what the panels need
 * @param props.store - the store
 * @param props.colours - the polities' colours
 * @param props.onResult - the status bar's result zone, for what `{Polities}` did
 * @param props.wikidata - where the polity form reads Wikidata from
 * @returns the dock's content
 */
function Dock({
  store,
  colours,
  onResult,
  wikidata,
}: {
  store: CartographerStoreHook
  colours: PolityColourSource
  onResult: (message: string | null) => void
  wikidata: WikidataSource
}) {
  // Render
  return (
    <div className="dock-stack">
      <PolitiesPanel store={store} colours={colours} onResult={onResult} wikidata={wikidata} />
      <LinePanel store={store} />
      <OverridesPanel store={store} />
      <LayersPanel store={store} />
    </div>
  )
}

/** What the page needs, which is what the map needs plus the store. */
export interface EditorProps {
  /** The store the canvas draws from and navigates. */
  store: CartographerStoreHook
  /** How to fetch and bake the backdrop. */
  load: BackdropLoad
  /** The colours and sizes the painter reads. */
  style: PaintStyle
  /** What a screen reader is told the drawing surface is. */
  label: string
  /** The page's `<h1>`, which {@link Shell} places inside the canvas landmark. */
  heading: ReactNode
  /** The application's name, written in the top bar beside the mark. */
  name: string
  /** Save the open year — the top bar's `[Save]`, the same call as ‹ctrl+S›. */
  onSave: () => void
  /** The canvas's undo and redo, for the document bar's buttons. */
  history: HistoryRelay
  /** Where the polities' colours come from — one source for the canvas and every panel. */
  colours: PolityColourSource
  /** Where the polity form reads Wikidata from (CARTO-243) — the public API, a stub in tests. */
  wikidata: WikidataSource
  /**
   * Messages from outside React for the result zone — what opening and saving the year say
   * (`persistence/resultRelay.ts`).
   */
  results: ResultRelay
}

/**
 * Render the editor.
 *
 * The status `<p>` is rendered **after** the canvas in tree order, so its ref is attached after the
 * canvas's. That is safe and worth stating once: nothing reads `statusRef.current` until a pointer
 * moves, which is long after the commit that fills both.
 * @param props - the store, how to load, the names, and the relay for messages from outside React
 * @returns the shell, filled where there is something to put in it
 */
export function Editor({
  store,
  load,
  style,
  label,
  heading,
  name,
  onSave,
  history,
  colours,
  wikidata,
  results,
}: EditorProps) {
  // Refs
  const status = useRef<HTMLElement | null>(null)
  const action = useRef<HTMLElement | null>(null)
  const result = useRef<HTMLElement | null>(null)
  const feature = useRef<HTMLElement | null>(null)

  // Handlers
  const handleResult = (message: string | null) => {
    writeResult(result.current, message)
  }

  // Effects
  useRelayedResults(results, result)

  // Render
  return (
    <Shell
      heading={heading}
      appbar={<AppBarPanel store={store} name={name} onSave={onSave} />}
      docbar={<DocBarPanel store={store} history={history} />}
      canvas={
        <MapArea
          store={store}
          load={load}
          style={style}
          label={label}
          statusRef={status}
          actionRef={action}
          resultRef={result}
          featureRef={feature}
          colours={colours}
          history={history}
        />
      }
      rail={<ToolRailPanel store={store} colours={colours} />}
      dock={<Dock store={store} colours={colours} onResult={handleResult} wikidata={wikidata} />}
      status={<StatusRow action={action} result={result} position={status} feature={feature} />}
    />
  )
}
