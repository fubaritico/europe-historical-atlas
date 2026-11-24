// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ExportButton } from './ExportButton'

import type { ExportAnswer } from './exportClient'
import type { ReactNode } from 'react'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const runExport = vi.hoisted(() => vi.fn<() => Promise<ExportAnswer>>())

vi.mock('@payloadcms/ui', () => ({
  toast,
  // Payload's button, reduced to what this one hands it
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
vi.mock('./exportClient', () => ({ runExport }))

/**
 * An answer the test lets go of when it says.
 * @returns the promise, and how to settle it
 */
function pending() {
  let settle: (answer: ExportAnswer) => void = () => undefined
  const promise = new Promise<ExportAnswer>((resolve) => {
    settle = resolve
  })
  return { promise, settle }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('ExportButton', () => {
  describe('happy path', () => {
    it('says what the export wrote, in a success toast', async () => {
      runExport.mockResolvedValue({ ok: true, message: 'Base exportée : 11 événements.' })
      render(<ExportButton />)
      await userEvent.click(screen.getByRole('button', { name: 'Exporter la base' }))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Base exportée : 11 événements.')
      })
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('is greyed and says so while the export runs, then comes back', async () => {
      const answer = pending()
      runExport.mockReturnValue(answer.promise)
      render(<ExportButton />)
      await userEvent.click(screen.getByRole('button', { name: 'Exporter la base' }))
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Export en cours…' }).disabled
      ).toBe(true)
      answer.settle({ ok: true, message: 'Base exportée.' })
      const back = await screen.findByRole<HTMLButtonElement>('button', {
        name: 'Exporter la base',
      })
      expect(back.disabled).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('says a refused export in an error toast', async () => {
      runExport.mockResolvedValue({
        ok: false,
        message: 'L’export est refusé, aucun fichier n’est écrit : x',
      })
      render(<ExportButton />)
      await userEvent.click(screen.getByRole('button', { name: 'Exporter la base' }))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'L’export est refusé, aucun fichier n’est écrit : x'
        )
      })
      expect(toast.success).not.toHaveBeenCalled()
    })
  })

  // L4: N/A — `runExport` never rejects: every failure is turned into its answer (`exportClient.test.ts`).

  describe('edge cases', () => {
    it('starts one export for two clicks made before the screen greys the button', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const answer = pending()
      runExport.mockReturnValue(answer.promise)
      render(<ExportButton />)
      const button = screen.getByRole('button', { name: 'Exporter la base' })
      // Two clicks in one go, before React re-renders: the native handler is called twice.
      button.click()
      button.click()
      expect(runExport).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(
        '[CMS] « Exporter la base » clicked while an export runs: ignored'
      )
      answer.settle({ ok: true, message: 'Base exportée.' })
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledTimes(1)
      })
    })
  })
})
