import { describe, expect, it, vi } from 'vitest'

import { createPanelCallbacks } from './devPanelCallbacks'
import { createDevState } from './devState'

import type { PanelCallbackDeps } from './devPanelCallbacks'
import type { MapLayers } from './mapLayers'

/**
 * Callbacks over stand-in layers that record the order of their rebuilds.
 * @returns the callbacks and the record
 */
function wired(): { callbacks: ReturnType<typeof createPanelCallbacks>; calls: string[] } {
  const calls: string[] = []
  const record = (name: string) => vi.fn(() => calls.push(name))
  const layers = {
    rebuildRelief: record('relief'),
    rebuildRivers: record('rivers'),
    rebuildBorders: record('borders'),
    rebuildFills: record('fills'),
    rebuildSurface: record('surface'),
    rebuildCoastline: record('coastline'),
  } as unknown as MapLayers
  const deps = {
    dev: createDevState(),
    layers,
    pipeline: {} as PanelCallbackDeps['pipeline'],
    view: {} as PanelCallbackDeps['view'],
  }
  return { callbacks: createPanelCallbacks(deps), calls }
}

describe('createPanelCallbacks', () => {
  describe('happy path', () => {
    it('rebuilds the relief with everything laid on it, in one call to the layers', () => {
      const { callbacks, calls } = wired()
      callbacks.rebuildRelief()
      expect(calls).toEqual(['surface'])
    })
  })

  describe('variants', () => {
    it('retraces the coastline alone when only the coastline changed', () => {
      const { callbacks, calls } = wired()
      callbacks.rebuildCoastline()
      expect(calls).toEqual(['coastline'])
    })
  })

  // L3 (managed errors), L4 (unmanaged errors) and L5 (edge cases): N/A for this rung — each callback
  // forwards to one collaborator and decides nothing; the layers' own suites cover what they do.
})
