import { describe, expect, it } from 'vitest'

import plugin from './index.js'

describe('eslint-plugin-eha', () => {
  describe('happy path', () => {
    it('names itself as ESLint expects a plugin to', () => {
      expect(plugin.meta.name).toBe('eslint-plugin-eha')
    })
  })

  // L2–L5: N/A at this stage — the plugin holds no rule yet; each rule's suite covers its own levels.
})
