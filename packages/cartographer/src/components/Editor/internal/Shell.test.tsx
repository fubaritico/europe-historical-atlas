import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createLocaleStore } from '../../../i18n/localeStore'
import { renderInEnglish } from '../../../testing/renderInEnglish'
import { LocaleProvider } from '../../LocaleProvider'

import { Shell } from './Shell'

import type { ReactNode } from 'react'

/** A zone whose render throws. */
function FailingZone(): ReactNode {
  // Render
  throw new Error('the zone broke')
}

describe('Shell', () => {
  describe('happy path', () => {
    it('lays out the five zones and puts the canvas in its own', () => {
      renderInEnglish(<Shell canvas={<div data-testid="map" />} />)

      const shell = document.querySelector('.shell')
      expect(shell).not.toBeNull()
      for (const zone of [
        'shell__appbar',
        'shell__docbar',
        'shell__body',
        'shell__rail',
        'shell__canvas',
        'shell__dock',
      ])
        expect(document.querySelector(`.${zone}`)).not.toBeNull()

      expect(document.querySelector('.shell__canvas [data-testid="map"]')).not.toBeNull()
    })
  })

  describe('variants', () => {
    it('shows what a zone is given instead of its placeholder', () => {
      renderInEnglish(
        <Shell
          appbar={<span>the file</span>}
          docbar={<span>1100</span>}
          rail={<span>tools here</span>}
          canvas={<div />}
          dock={<span>panels here</span>}
          status={<p className="shell__status">ready</p>}
        />
      )

      expect(document.querySelectorAll('.empty-zone')).toHaveLength(0)
      expect(screen.getByText('the file')).not.toBeNull()
      expect(screen.getByText('panels here')).not.toBeNull()
    })

    // Guarded here as well as in `main.test.tsx`, because this is the component that decides it: a
    // heading loose in the body is reached by no landmark, and a screen reader navigates by landmarks.
    it('puts the heading inside the canvas landmark', () => {
      renderInEnglish(<Shell heading={<h1>Cartographer</h1>} canvas={<div />} />)

      expect(document.querySelector('main.shell__canvas > h1')).not.toBeNull()
    })
  })

  describe('managed errors', () => {
    // THE guard, and it is the dev's own requirement of 2026-10-08: "prévoir des emplacements vides pour
    // les zones vides pas encore faites". The plausible component renders `{appbar}` with no fallback,
    // so an unbuilt zone is invisible and the layout reads as a styling failure rather than as progress.
    it('names a zone nobody has built yet, rather than rendering nothing', () => {
      renderInEnglish(<Shell canvas={<div />} />)

      const named = [...document.querySelectorAll('.empty-zone')].map((n) => n.textContent)
      expect(named).toEqual(['app bar', 'document bar', 'tools', 'panels'])
    })

    // One zone per boundary (the dev's call, 2026-10-21): the dock failing must not take the map down.
    it('keeps the map standing when the dock fails', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      renderInEnglish(
        <LocaleProvider store={createLocaleStore('en')}>
          <Shell canvas={<div data-testid="map" />} dock={<FailingZone />} />
        </LocaleProvider>
      )
      expect(screen.getByTestId('map')).toBeDefined()
      expect(document.querySelector('.shell__dock [role="alert"]')).not.toBeNull()
      vi.restoreAllMocks()
    })

    it('offers « Retry » where the map failed, and nowhere else', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      renderInEnglish(
        <LocaleProvider store={createLocaleStore('en')}>
          <Shell canvas={<FailingZone />} dock={<FailingZone />} />
        </LocaleProvider>
      )
      expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(1)
      expect(document.querySelector('.shell__canvas button')).not.toBeNull()
      vi.restoreAllMocks()
    })

    it('leaves the status row present but empty when nothing is passed for it', () => {
      renderInEnglish(<Shell canvas={<div />} />)

      const bar = document.querySelector('.shell__status')
      expect(bar).not.toBeNull()
      expect(bar?.textContent).toBe('')
    })
  })

  describe('unmanaged errors', () => {
    it('treats an explicit null for a zone as an unfilled one', () => {
      renderInEnglish(<Shell appbar={null} rail={null} canvas={<div />} />)

      const named = [...document.querySelectorAll('.empty-zone')].map((n) => n.textContent)
      expect(named).toContain('app bar')
      expect(named).toContain('tools')
    })

    it('renders with nothing but a canvas, which is the state the editor opens in', () => {
      expect(() => {
        renderInEnglish(<Shell canvas={null} />)
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('declares exactly one landmark, so the main content is unambiguous', () => {
      renderInEnglish(<Shell canvas={<div />} />)

      expect(document.querySelectorAll('main')).toHaveLength(1)
    })
  })
})
