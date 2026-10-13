import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppBar } from './AppBar'

describe('AppBar', () => {
  describe('happy path', () => {
    it('writes the name beside the mark', () => {
      const { container } = render(<AppBar name="Europe Historical Atlas Cartographer" />)

      expect(container.querySelector('.app-brand > .brand-mark')).not.toBeNull()
      expect(container.querySelector('.app-brand__name')?.textContent).toBe(
        'Europe Historical Atlas Cartographer'
      )
    })
  })

  describe('variants', () => {
    it('writes whatever name it is given', () => {
      const { container } = render(<AppBar name="Another" />)
      expect(container.querySelector('.app-brand__name')?.textContent).toBe('Another')
    })
  })

  // L3: N/A — a view with one string, nothing to refuse.
  // L4: N/A — nothing can fail at runtime.

  describe('edge cases', () => {
    it('is not a heading: the page’s one <h1> stays in the canvas landmark', () => {
      const { container } = render(<AppBar name="Europe Historical Atlas Cartographer" />)
      expect(container.querySelector('h1, h2, [role="heading"]')).toBeNull()
    })
  })
})
