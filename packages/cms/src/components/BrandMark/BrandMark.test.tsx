import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ATLAS_NAME } from '../../atlasName'

import { BrandMark } from './BrandMark'
import { brandMarkDataUri } from './utils/brandMarkDataUri'

import type { BrandMarkNames } from './BrandMark'

/** A translator in English, as Payload hands one to a server component. */
const english = { t: () => 'Dashboard' }

/**
 * The markup the mark renders to.
 * @param side - the tile's side
 * @param names - what it is read out as
 * @returns the HTML
 */
function markup(side: number, names: BrandMarkNames): string {
  return renderToStaticMarkup(<BrandMark side={side} names={names} i18n={english} />)
}

describe('BrandMark', () => {
  describe('happy path', () => {
    it('shows the drawing of its side, as an image', () => {
      const html = markup(24, 'dashboard')

      expect(html.startsWith('<img class="brand-mark"')).toBe(true)
      expect(html).toContain('width="24" height="24"')
    })
  })

  describe('variants', () => {
    it('is read out as the dashboard, in the admin’s language, in the navigation', () => {
      expect(markup(24, 'dashboard')).toContain('alt="Dashboard"')
    })

    it('is read out as the atlas’s name on the login page, drawn at its larger side from the same drawing', () => {
      const html = markup(96, 'atlas')

      expect(html).toContain(`alt="${ATLAS_NAME}"`)
      expect(html).toContain('width="96" height="96"')
      expect(html).toContain(`src="${brandMarkDataUri(96).replaceAll("'", '&#x27;')}"`)
    })
  })

  // L3: N/A — a constant drawing, nothing refused.
  // L4: N/A — nothing can fail at render; the drawing's own NaN case is brandMarkDataUri's.
  // L5: N/A — the sides it is given are the config's two constants.
})
