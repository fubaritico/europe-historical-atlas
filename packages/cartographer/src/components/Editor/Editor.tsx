import { useRef } from 'react'

import { MapArea } from '../MapArea'
import { writeResult } from '../shared/statusBar'
import { ToolRailPanel } from '../ToolRailPanel'

import { useRelayedResults } from './hooks/useRelayedResults'
import { AppBarPanel } from './internal/AppBarPanel'
import { DocBarPanel } from './internal/DocBarPanel'
import { Dock } from './internal/Dock'
import { Shell } from './internal/Shell'
import { StatusRow } from './internal/StatusRow'

import type { HistoryRelay } from '../../canvas/history/historyRelay'
import type { PaintStyle } from '../../canvas/paint/painter'
import type { ResultRelay } from '../../persistence/resultRelay'
import type { PolityColourSource } from '../../state/polityColourSource'
import type { CartographerStoreHook } from '../../state/store'
import type { WikidataSource } from '../../wikidata/wikidataSource'
import type { BackdropLoad } from '../MapArea'
import type { ReactNode } from 'react'

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
  /** Open the *Open snapshot* dialogue — the top bar's `[Open snapshot…]` (CARTO-238, rung 2b). */
  onOpenSnapshot: () => void
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
 * @param props.store - the store the canvas draws from and every panel reads
 * @param props.load - how to fetch and bake the backdrop, handed to the map
 * @param props.style - the colours and sizes the painter reads
 * @param props.label - what a screen reader is told the drawing surface is
 * @param props.heading - the page's `<h1>`, placed by the shell inside the canvas landmark
 * @param props.name - the application's name, written in the top bar
 * @param props.onSave - saves the open year, called by the top bar's `[Save]`
 * @param props.onOpenSnapshot - opens the *Open snapshot* dialogue, called by the top bar
 * @param props.history - the canvas's undo and redo, for the document bar's buttons
 * @param props.colours - where the polities' colours come from, for the canvas and the panels
 * @param props.wikidata - where the polity form reads Wikidata from
 * @param props.results - messages from outside React, written into the result zone
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
  onOpenSnapshot,
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
      appbar={
        <AppBarPanel store={store} name={name} onSave={onSave} onOpenSnapshot={onOpenSnapshot} />
      }
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
