import { writeAction, writeFeature, writePosition, writeResult } from '../shared/statusBar'

import { FILL } from './areaStyle'
import { useEditorAssets } from './hooks/useEditorAssets'
import { BackdropFailure } from './internal/BackdropFailure'
import { BackdropWaiting } from './internal/BackdropWaiting'
import { MapCanvas } from './internal/MapCanvas'

import type { BackdropLoad } from './editorAssets'
import type { HistoryRelay } from '../../canvas/historyRelay'
import type { PaintStyle } from '../../canvas/painter'
import type { PolityColourSource } from '../../state/polityColourSource'
import type { CartographerStoreHook } from '../../state/store'
import type { RefObject } from 'react'

/**
 * The canvas area, and the three states it can be in: waiting for its backdrop, unable to get one, or
 * drawing.
 *
 * **Why the area and not the application.** The dev's call, 2026-10-07: a missing backdrop must not stop
 * the window from opening. The other regions appear in their resting state — which `s00`'s Background
 * already specifies (*"no file is loaded"*, `{Polities}` empty, Undo and Redo disabled) and which owes
 * nothing to the terrain. What is blocked is **this area and what depends on it**: without the DEM there
 * is no coordinate system, so a year has nothing to project against. The order is the one he stated —
 * the backdrop is baked, *then* a year is laid on it.
 *
 * **There is no partial success.** Either asset failing is a failure, and the elevation-threshold
 * fallback the atlas keeps is deliberately not wired (see `backdropSource.ts`): a shoreline that is
 * quietly wrong would be read for the rest of a year's life as the author's own bad tracing.
 */

/** What {@link MapArea} needs. */
export interface MapAreaProps {
  /** The store the canvas draws from and navigates. */
  store: CartographerStoreHook
  /** How to get the backdrop. */
  load: BackdropLoad
  /** The colours and sizes, from `design/chrome.css`. */
  style: PaintStyle
  /** What a screen reader is told the drawing surface is. */
  label: string
  /**
   * The status bar's node, owned by the shell and written into on every pointer sample.
   *
   * **Handed in rather than created here, because the bar is a row of the shell and not an overlay on
   * the map** (2026-10-08, when the grid landed). It stays a ref rather than becoming state for the
   * reason the whole area is imperative: a pointer emits a move per device sample, and reconciling at
   * that rate is what kills canvas applications.
   */
  statusRef: RefObject<HTMLElement | null>
  /** The status bar's action zone, beside the position — same reasons, same ownership. */
  actionRef: RefObject<HTMLElement | null>
  /** The status bar's result zone, beside the action. */
  resultRef: RefObject<HTMLElement | null>
  /** The status bar's zone naming what is under the pointer — a border or a polity. */
  featureRef: RefObject<HTMLElement | null>
  /** Where the polities' colours come from — shared with the panels. */
  colours: PolityColourSource
  /** Where the canvas installs its undo and redo, for the document bar's buttons. */
  history: HistoryRelay
}

/**
 * The area: wait for the backdrop, then draw.
 * @param props - the store, how to load, and the names
 * @param props.store - the store the canvas draws from and navigates
 * @param props.load - how to fetch and bake the backdrop
 * @param props.style - the colours and sizes the painter reads
 * @param props.label - what a screen reader is told the drawing surface is
 * @param props.statusRef - the status bar's position zone, written on every pointer sample
 * @param props.actionRef - the status bar's action zone
 * @param props.resultRef - the status bar's result zone
 * @param props.featureRef - the status bar's zone naming what is under the pointer
 * @param props.colours - where the polities' colours come from, shared with the panels
 * @param props.history - where the canvas installs its undo and redo
 * @returns the waiting notice, the failure notice, or the canvas
 */
export function MapArea({
  store,
  load,
  style,
  label,
  statusRef,
  actionRef,
  resultRef,
  featureRef,
  colours,
  history,
}: MapAreaProps) {
  // State
  const { assets, error, fraction, phase } = useEditorAssets(load)

  // Handlers
  const handleHover = (lonLat: [number, number] | null) => {
    writePosition(statusRef.current, lonLat)
  }
  const handleAction = (sentence: string | null) => {
    writeAction(actionRef.current, sentence)
  }
  const handleResult = (message: string | null) => {
    writeResult(resultRef.current, message)
  }
  const handleFeature = (feature: string | null) => {
    writeFeature(featureRef.current, feature)
  }

  // Render
  if (error !== null) return <BackdropFailure error={error} />
  if (assets === null) return <BackdropWaiting fraction={fraction} phase={phase} />
  return (
    <div style={FILL}>
      <MapCanvas
        store={store}
        frame={assets.backdrop.frame}
        backdropImage={assets.backdrop.image}
        vectorLayers={assets.vectors}
        onHover={handleHover}
        onAction={handleAction}
        onResult={handleResult}
        onFeature={handleFeature}
        style={style}
        label={label}
        colours={colours}
        history={history}
        landMask={assets.backdrop.mask}
      />
    </div>
  )
}
