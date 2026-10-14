import { describe, expect, it } from 'vitest'

import { sheetRule } from '../styles/sheetRule'

import shell from './shell.css?raw'

const rule = (selector: string): string => sheetRule(shell, 'shell.css', selector)

// jsdom computes no grid, so the sheet is read as text. The heights were measured in the browser on 1100
// (137 polities, 2026-10-14): the body's row was 3 646px before, the window's height minus 80px after.
describe('shell.css — the rows hold the window', () => {
  describe('happy path', () => {
    it('bounds the body row of the shell to what the bars leave', () => {
      expect(rule('.shell')).toContain('grid-template-rows: 30px 26px minmax(0, 1fr) 24px;')
    })
  })

  describe('variants', () => {
    it('declares the body its own bounded row, so a long dock cannot stretch the canvas cell', () => {
      expect(rule('.shell__body')).toContain('grid-template-rows: minmax(0, 1fr);')
    })

    it('bounds the body columns, so the canvas cannot widen the grid', () => {
      expect(rule('.shell__body')).toContain(
        'grid-template-columns: var(--rail) minmax(0, 1fr) var(--dock-w);'
      )
    })
  })

  describe('managed errors', () => {
    it('names a selector the sheet does not hold', () => {
      expect(() => rule('.shell__nowhere')).toThrow('.shell__nowhere is not in shell.css')
    })
  })

  // L4: N/A — a static sheet read at build time, nothing asynchronous or optional.
  // L5: N/A — three rules, no boundary.
})
