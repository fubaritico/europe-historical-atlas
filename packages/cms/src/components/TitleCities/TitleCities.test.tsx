// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TitleCities } from './TitleCities'

import type { AttachAnswer } from './utils/attachClient'
import type { ReactNode } from 'react'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const document = vi.hoisted((): { id: number | undefined; from: number; to: number } => ({
  id: 7,
  from: 1094,
  to: 1105,
}))
const attachClient = vi.hoisted(() => vi.fn<() => Promise<AttachAnswer>>())

vi.mock('@payloadcms/ui', () => ({
  toast,
  useDocumentInfo: () => ({ id: document.id }),
  useFormFields: (select: (state: [Record<string, { value: unknown }>]) => unknown) =>
    select([
      { 'date.start.year': { value: document.from }, 'date.end.year': { value: document.to } },
    ]),
  // Payload's many-valued relation field, reduced to a box: typing ids separated by commas chooses those places
  RelationshipInput: ({
    label,
    onChange,
  }: {
    label: string
    onChange: (value: { relationTo: string; value: number }[]) => void
  }) => (
    <input
      aria-label={label}
      onChange={(event) => {
        onChange(
          event.target.value
            .split(',')
            .filter((id) => id !== '')
            .map((id) => ({ relationTo: 'places', value: Number(id) }))
        )
      }}
    />
  ),
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: ReactNode
    disabled?: boolean
    onClick?: () => void
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('./utils/attachClient', () => ({ attachClient }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  document.id = 7
})

describe('TitleCities', () => {
  describe('happy path', () => {
    it('attaches the cities chosen at the year proposed, and says what became of each', async () => {
      attachClient.mockResolvedValue({
        ok: true,
        results: [{ place: 1858, name: 'Pontevedra', result: 'created', sheet: 5 }],
      })
      render(<TitleCities />)
      expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Année' }).value).toBe('1100')
      await userEvent.type(screen.getByRole('textbox', { name: 'Villes' }), '1858')
      await userEvent.click(screen.getByRole('button', { name: 'Rattacher' }))
      await waitFor(() => {
        expect(attachClient).toHaveBeenCalledWith(7, 1100, [1858])
      })
      expect(
        await screen.findByText(
          'Pontevedra : fiche créée, tenue par ce titre, déduite de son district.'
        )
      ).toBeTruthy()
      expect(toast.success).toHaveBeenCalledWith('1 ville : 1 rattachée ou créée.')
    })
  })

  describe('variants', () => {
    it('takes a year typed in place of the one proposed', async () => {
      attachClient.mockResolvedValue({ ok: true, results: [] })
      render(<TitleCities />)
      const year = screen.getByRole('textbox', { name: 'Année' })
      await userEvent.clear(year)
      await userEvent.type(year, '1095')
      await userEvent.type(screen.getByRole('textbox', { name: 'Villes' }), '1')
      await userEvent.click(screen.getByRole('button', { name: 'Rattacher' }))
      await waitFor(() => {
        expect(attachClient).toHaveBeenCalledWith(7, 1095, [1])
      })
    })
  })

  describe('managed errors', () => {
    it('says the refusal of the whole in an error toast', async () => {
      attachClient.mockResolvedValue({
        ok: false,
        message: 'L’année 1110 sort des années du titre (1094–1105).',
      })
      render(<TitleCities />)
      await userEvent.type(screen.getByRole('textbox', { name: 'Villes' }), '1')
      await userEvent.click(screen.getByRole('button', { name: 'Rattacher' }))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'L’année 1110 sort des années du titre (1094–1105).'
        )
      })
    })

    it('asks to save the title first, before it exists', () => {
      document.id = undefined
      render(<TitleCities />)
      expect(
        screen.getByText(
          'Enregistrez d’abord le titre : ses villes se rattachent à un titre existant.'
        )
      ).toBeTruthy()
    })
  })

  // L4: N/A — `attachClient` never rejects: every failure is turned into its answer (`titleCitiesUtils.test.ts`).

  describe('edge cases', () => {
    it('says a year that is not one, and keeps « Rattacher » greyed', async () => {
      render(<TitleCities />)
      const year = screen.getByRole('textbox', { name: 'Année' })
      await userEvent.clear(year)
      await userEvent.type(year, '11a0')
      expect(screen.getByText('Tapez une année entière, par exemple 1100.')).toBeTruthy()
      expect(year.getAttribute('aria-invalid')).toBe('true')
    })

    it('keeps « Rattacher » greyed with no city chosen, or no year', async () => {
      render(<TitleCities />)
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Rattacher' }).disabled).toBe(
        true
      )
      await userEvent.type(screen.getByRole('textbox', { name: 'Villes' }), '1')
      await userEvent.clear(screen.getByRole('textbox', { name: 'Année' }))
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Rattacher' }).disabled).toBe(
        true
      )
    })
  })
})
