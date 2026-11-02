import { describe, expect, it } from 'vitest'

import { grabsPanel } from './grabbable'

/**
 * A panel's head holding its title and a button.
 * @returns the title and the button
 */
function head() {
  const panel = document.createElement('section')
  panel.innerHTML =
    '<div class="panel__head"><h2>Cities</h2><button type="button">x</button></div><div class="panel__body"><p>body</p></div>'
  document.body.replaceChildren(panel)
  const find = (tag: string): Element | null => panel.querySelector(tag)
  return { title: find('h2'), button: find('button'), body: find('p') }
}

describe('grabsPanel', () => {
  describe('happy path', () => {
    it('grabs the panel from its title in the head', () => {
      expect(grabsPanel(head().title)).toBe(true)
    })
  })

  describe('variants', () => {
    it('leaves a press on a button of the head to the button, and a press in the body to the body', () => {
      const { button, body } = head()
      expect([grabsPanel(button), grabsPanel(body)]).toEqual([false, false])
    })
  })

  // L3, L4: N/A — a DOM query.

  describe('edge cases', () => {
    it('grabs nothing from a target that is no element', () => {
      expect([grabsPanel(null), grabsPanel(window)]).toEqual([false, false])
    })
  })
})
