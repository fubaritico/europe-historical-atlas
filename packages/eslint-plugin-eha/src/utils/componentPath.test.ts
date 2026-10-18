import { describe, expect, it } from 'vitest'

import { componentPathOf } from './componentPath.js'

const DIR = 'src/components'

describe('componentPathOf', () => {
  describe('happy path', () => {
    it('reads the folder, the subfolders and the file', () => {
      expect(componentPathOf('/r/src/components/Panel/hooks/useForm.ts', DIR)).toEqual({
        folder: 'Panel',
        inner: ['hooks'],
        file: 'useForm.ts',
      })
    })
  })

  describe('variants', () => {
    it('reads a file at the folder’s root, with no subfolder', () => {
      expect(componentPathOf('/r/src/components/Panel/Panel.tsx', DIR)?.inner).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('answers null for a flat file at the components’ root, and outside them', () => {
      expect(componentPathOf('/r/src/components/PolityList.tsx', DIR)).toBeNull()
      expect(componentPathOf('/r/src/state/store.ts', DIR)).toBeNull()
    })
  })

  // L4: N/A — string work, nothing thrown.

  describe('edge cases', () => {
    it('reads the last components folder of a path that holds two', () => {
      expect(componentPathOf('/r/src/components/x/src/components/Panel/P.tsx', DIR)?.folder).toBe(
        'Panel'
      )
    })
  })
})
