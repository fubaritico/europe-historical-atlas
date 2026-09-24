/*
 * Mock data for the design screens — the one file here that will NOT survive into the editor.
 *
 * The figures are not invented: they are what was measured on OpenHistoricalMap at 1100
 * (51 polities assembled out of 52, 45.2 % of Europe covered, median 108 vertices), which is
 * why the screens are worth judging at all. A list of twelve pretty names would show nothing.
 */
;(() => {
  'use strict'

  /** The editable palette. Selection blue is absent on purpose: it is reserved. */
  const PALETTE = [
    '#d4b24a',
    '#c99a45',
    '#b98545',
    '#a8734c',
    '#9b6b5c',
    '#8b7a5a',
    '#7b8659',
    '#6b8a73',
    '#5f7e8b',
    '#54719b',
  ]

  /** `[name, rank, hasNoTerritory]` — France really does come back from OHM with an identity and no geometry. */
  const POLITIES = [
    ['Almoravid Emirate', 'emirate'],
    ['Byzantine Empire', 'empire'],
    ['County of Barcelona', 'county'],
    ['County of Edessa', 'county'],
    ['County of Portugal', 'county'],
    ['County of Sicily', 'county'],
    ['Duchy of Apulia and Calabria', 'duchy'],
    ['Duchy of Aquitaine', 'duchy', true],
    ['Duchy of Normandy', 'duchy'],
    ['Fatimid Caliphate', 'caliphate'],
    ['Holy Roman Empire', 'empire'],
    ['Kingdom of Aragon', 'kingdom'],
    ['Kingdom of Croatia', 'kingdom'],
    ['Kingdom of Dublin', 'kingdom'],
    ['Kingdom of England', 'kingdom'],
    ['Kingdom of France', 'kingdom', true],
    ['Kingdom of Georgia', 'kingdom'],
    ['Kingdom of Hungary', 'kingdom'],
    ['Kingdom of Jerusalem', 'kingdom'],
    ['Kingdom of Navarre', 'kingdom'],
    ['Kingdom of Norway', 'kingdom'],
    ['Kingdom of Poland', 'kingdom'],
    ['Kingdom of Scotland', 'kingdom'],
    ['Kingdom of Sweden', 'kingdom'],
    ['Principality of Antioch', 'principality'],
    ['Republic of Venice', 'republic'],
    ['Sultanate of Rum', 'sultanate'],
    ['Volga Bulgaria', 'state'],
  ]

  /** `[name, visible, opacity]` — the drawing layers, in painting order. */
  const LAYERS = [
    ['backdrop', 1, 100],
    ['coastline', 1, 100],
    ['rivers', 1, 100],
    ['graticule', 0, 60],
    ['cities', 1, 100],
    ['fills', 1, 70],
    ['borders', 1, 100],
    ['unclaimed', 0, 100],
    ['diff', 0, 100],
  ]

  /**
   * Render the polity list into a container.
   * @param {Element} host the scrolling element to fill
   * @param {object} [options]
   * @param {string} [options.selected] the polity drawn as selected
   * @returns {void}
   */
  function renderPolities(host, options = {}) {
    host.innerHTML = POLITIES.map(([name, rank, noTerritory], i) => {
      const selected = name === options.selected
      return `
        <div class="row polity" ${selected ? 'aria-selected="true"' : ''}>
          <span class="swatch" style="background:${PALETTE[(i * 3) % PALETTE.length]}"></span>
          <span class="name">${Chrome.escape(name)}</span>
          <span class="tags">${noTerritory ? '<span class="chip">no territory</span>' : ''}<span>${rank}</span></span>
        </div>`
    }).join('')
  }

  /**
   * Render the layer list into a container.
   * @param {Element} host the scrolling element to fill
   * @returns {void}
   */
  function renderLayers(host) {
    host.innerHTML = LAYERS.map(
      ([name, on, opacity]) => `
      <div class="row layer">
        <button class="eye" aria-pressed="${!!on}" aria-label="${on ? 'Hide' : 'Show'} ${name}" title="${on ? 'Hide' : 'Show'} ${name}"
                style="color:${on ? 'var(--ink)' : 'var(--ink-off)'}">${Chrome.icon(on ? 'eyeOpen' : 'eyeShut', 15)}</button>
        <span class="name">${name}</span>
        <input type="range" min="0" max="100" value="${opacity}" aria-label="${name} opacity">
        <span class="mono dim" style="font-size:10.5px;text-align:right">${opacity}%</span>
      </div>`
    ).join('')
  }

  window.Mock = { PALETTE, POLITIES, LAYERS, renderPolities, renderLayers }
})()
