import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { catalogueMismatches } from '@europe-historical-atlas/core/i18n/catalogue'

import { createLocaleStore } from '../../i18n/localeStore'
import { LocaleProvider } from '../LocaleProvider'

import { ErrorBoundary } from './ErrorBoundary'
import { ERROR_BOUNDARY_MESSAGES } from './i18n'

import type { Locale } from '@europe-historical-atlas/core/i18n/locale'
import type { ReactNode } from 'react'

/** A zone whose render throws while `broken.now` is true. */
const broken = { now: true }
function Fragile(): ReactNode {
  // Guards
  if (broken.now) throw new Error('the value "name" is missing')

  // Render
  return <p>the map</p>
}

/** A zone that throws something that is not an Error. */
function Odd(): ReactNode {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- the case under test
  throw 'a bare string'
}

/** Render a boundary in a language, with the console's error kept quiet and observable. */
function mount(
  children: ReactNode,
  options: { retry?: boolean; compact?: boolean; onDismiss?: () => void; locale?: Locale } = {}
) {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const view = render(
    <LocaleProvider store={createLocaleStore(options.locale ?? 'en')}>
      <ErrorBoundary
        zone="the map"
        {...(options.retry === true ? { retry: true } : {})}
        {...(options.compact === true ? { compact: true } : {})}
        {...(options.onDismiss === undefined ? {} : { onDismiss: options.onDismiss })}
      >
        {children}
      </ErrorBoundary>
    </LocaleProvider>
  )
  return { ...view, error }
}

afterEach(() => {
  broken.now = true
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  describe('happy path', () => {
    it('shows its zone while nothing fails', () => {
      mount(<p>the map</p>)
      expect(screen.getByText('the map').tagName).toBe('P')
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('shows, in place of a zone that failed, what failed and the error’s words', () => {
      mount(<Fragile />)
      const alert = screen.getByRole('alert')
      expect(alert.textContent).toContain('This area could not be shown.')
      expect(alert.textContent).toContain('the value "name" is missing')
    })
  })

  describe('variants', () => {
    // A menu's own dismissal lived in the component that failed: without this, its fallback stays for good.
    it('offers « Close » to a menu that failed, and closes it', async () => {
      const close = vi.fn()
      mount(<Fragile />, { onDismiss: close })
      await userEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(close).toHaveBeenCalledTimes(1)
    })

    it('takes one line in a bar', () => {
      mount(<Fragile />, { compact: true })
      expect(screen.getByRole('alert').classList.contains('error-zone--bar')).toBe(true)
    })

    it('says it in French to a French page', () => {
      mount(<Fragile />, { locale: 'fr' })
      expect(screen.getByRole('alert').textContent).toContain('Cette zone n’a pas pu s’afficher.')
    })

    it('offers no retry unless the zone allows it', () => {
      mount(<Fragile />)
      expect(screen.queryByRole('button')).toBeNull()
    })

    it('remounts the zone on « Retry », and shows it once it stands', async () => {
      mount(<Fragile />, { retry: true })
      broken.now = false
      await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
      expect(screen.getByText('the map').tagName).toBe('P')
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('writes what it caught to the console, with the zone’s name', () => {
      const { error } = mount(<Fragile />)
      expect(error).toHaveBeenCalledWith(
        '[Cartographer] the map failed',
        expect.any(Error),
        expect.any(String)
      )
    })

    it('shows the fallback again when a retried zone fails again', async () => {
      mount(<Fragile />, { retry: true })
      await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
      expect(screen.getByRole('alert').textContent).toContain('This area could not be shown.')
    })
  })

  describe('unmanaged errors', () => {
    it('shows something thrown that is not an Error, by its text', () => {
      mount(<Odd />)
      expect(screen.getByRole('alert').textContent).toContain('a bare string')
    })
  })

  describe('edge cases', () => {
    it('marks the error’s own words as English, whatever the page’s language', () => {
      mount(<Fragile />, { locale: 'fr' })
      expect(screen.getByText('the value "name" is missing').getAttribute('lang')).toBe('en')
    })

    it('takes the same values in French and English', () => {
      expect(catalogueMismatches(ERROR_BOUNDARY_MESSAGES)).toEqual([])
    })
  })
})
