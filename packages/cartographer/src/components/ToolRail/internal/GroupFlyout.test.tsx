import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LocaleContext } from '../../shared/localeContext'

import { GroupFlyout } from './GroupFlyout'

// The flyout itself made to fail, so what is under test is the boundary its wiring puts around it.
vi.mock('./ToolFlyout', () => ({
  ToolFlyout: () => {
    throw new Error('the flyout broke')
  },
}))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GroupFlyout', () => {
  // L1–L2: the flyout's own behaviour is ToolFlyout's tests'; here only its boundary is.

  describe('managed errors', () => {
    // A tool group's menu failing must not take the rail down with it (the dev's call, 2026-10-21).
    it('keeps its failure to its own place, beside the rail it opened from', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      render(
        <LocaleContext value="en">
          <p>the rail</p>
          <GroupFlyout
            label="Pen"
            variants={[]}
            current="pen"
            onVariant={() => undefined}
            close={() => undefined}
          />
        </LocaleContext>
      )
      expect(screen.getByText('the rail').tagName).toBe('P')
      expect(screen.getByRole('alert').textContent).toContain('the flyout broke')
    })
  })

  // L4–L5: N/A — wiring only: a choice closes the flyout, which ToolRail's tests drive.
})
