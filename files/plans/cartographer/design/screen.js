/*
 * One call that turns a screen's markup into a working screen.
 *
 * The icon-only controls are left empty in the HTML and filled from here, so a glyph exists in
 * exactly one place. Their accessible names stay in the markup, next to what they act on — that
 * is the half a regeneration keeps losing.
 */
;(() => {
  'use strict'

  /**
   * Fill the icon-only controls, mount the shared shell, and wire every dock.
   * @param {object} config passed straight to `Chrome.mountShell` — see its JSDoc
   * @returns {void}
   */
  function build(config) {
    for (const button of document.querySelectorAll('.collapse:empty')) {
      button.innerHTML = Chrome.icon('chevron', 9)
    }
    for (const button of document.querySelectorAll('.tab-action:empty')) {
      button.innerHTML = Chrome.icon('plus', 12)
    }
    for (const box of document.querySelectorAll('[data-zoombox]:empty')) {
      box.innerHTML = [
        ['plus', 'Zoom in', 'Zoom in (+ or PageUp)'],
        ['minus', 'Zoom out', 'Zoom out (− or PageDown)'],
        ['fit', 'Fit to frame', 'Fit to frame'],
      ]
        .map(
          ([name, label, title]) =>
            `<button class="hoverable" aria-label="${label}" title="${title}">${Chrome.icon(name)}</button>`
        )
        .join('')
    }
    Chrome.mountShell(config)
    Chrome.initDocks()
  }

  window.Screen = { build }
})()
