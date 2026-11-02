import { describe, expect, it } from 'vitest'

import { movedSelection } from './movedSelection'

const CHOICES = ['1100-backup', '1200', '1300']

describe('movedSelection', () => {
  it('selects the first map on ‹↓› when none is selected', () => {
    expect(movedSelection(CHOICES, null, 'ArrowDown')).toBe('1100-backup')
  })

  it('moves one row down and up, and stops at either end', () => {
    expect([
      movedSelection(CHOICES, '1200', 'ArrowDown'),
      movedSelection(CHOICES, '1300', 'ArrowDown'),
      movedSelection(CHOICES, '1200', 'ArrowUp'),
      movedSelection(CHOICES, '1100-backup', 'ArrowUp'),
    ]).toEqual(['1300', '1300', '1100-backup', '1100-backup'])
  })

  it('goes to the first and the last on ‹Home› and ‹End›', () => {
    expect([
      movedSelection(CHOICES, '1200', 'Home'),
      movedSelection(CHOICES, '1200', 'End'),
    ]).toEqual(['1100-backup', '1300'])
  })

  it('moves nothing on another key, nor in an empty list', () => {
    expect([movedSelection(CHOICES, '1200', 'a'), movedSelection([], null, 'ArrowDown')]).toEqual([
      null,
      null,
    ])
  })
})
