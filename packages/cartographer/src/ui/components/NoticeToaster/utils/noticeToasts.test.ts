import { describe, expect, it, vi } from 'vitest'

import { noticeToasts } from './noticeToasts'

import type { ToastApi } from '@fubaritico/react/Toast'

/** The design system's API, each intent recorded. */
function recordedApi() {
  const api = Object.assign(vi.fn(), {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn(),
    dismissAll: vi.fn(),
  })
  return api satisfies ToastApi
}

describe('noticeToasts', () => {
  describe('happy path', () => {
    it.each(['success', 'info', 'warning'] as const)(
      'shows a %s notice with the intent of the same name, its topic as its id',
      (tone) => {
        const api = recordedApi()
        noticeToasts(api).show(tone, 'saved 1100', 'year')

        expect(api[tone]).toHaveBeenCalledWith('saved 1100', { id: 'year' })
      }
    )
  })

  // L2–L5: N/A — one call forwarded; the stack's behaviour is the design system's.
})
