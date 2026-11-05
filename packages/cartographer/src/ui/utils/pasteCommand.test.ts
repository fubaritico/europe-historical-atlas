import { describe, expect, it } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { ACTION_MESSAGES } from '../i18n/actions'

import { pasteCommand } from './pasteCommand'

// The dev, 2026-11-05: Édition — and a polity's menu — « adapts to what is on the clipboard ».

const ACTION = createTranslator(ACTION_MESSAGES, 'fr')

describe('pasteCommand', () => {
  describe('happy path', () => {
    it('names the paste of a sheet, short, lit with a polity selected', () => {
      expect(
        pasteCommand({ kind: 'sheet', polity: 'Republic of Venice', map: 'm' }, 'Venise', ACTION)
      ).toEqual({
        label: 'Coller la fiche…',
        enabled: true,
      })
    })
  })

  describe('variants', () => {
    it('names the paste of points, short', () => {
      expect(
        pasteCommand({ kind: 'points', polity: 'Republic of Venice', map: 'm' }, 'Venise', ACTION)
          .label
      ).toBe('Coller les points')
    })

    it('pastes polities as entities, with or without a polity selected', () => {
      expect(
        pasteCommand({ kind: 'polities', names: ['Livonians'], map: 'm' }, null, ACTION)
      ).toEqual({
        label: 'Coller les entités',
        enabled: true,
      })
    })
  })

  describe('managed errors', () => {
    it('greys the paste of points or of a sheet with no polity selected', () => {
      expect(
        pasteCommand({ kind: 'sheet', polity: 'Republic of Venice', map: 'm' }, null, ACTION)
      ).toEqual({
        label: 'Coller la fiche…',
        enabled: false,
      })
    })

    it('greys a bare « Coller » with an empty clipboard', () => {
      expect(pasteCommand(null, 'Venise', ACTION)).toEqual({ label: 'Coller', enabled: false })
    })
  })
})
