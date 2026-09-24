/*
 * Cartographer — the chrome's two shared behaviours.
 *
 * `mountShell` fills the four parts that are identical on every screen (application bar,
 * document tab bar, tool rail, status bar), so they exist once rather than three times.
 * `initDocks` gives every panel dock its collapse and its resize.
 *
 * Plain ES2020, no framework: the editor itself will be vanilla TypeScript, so what is
 * written here ports across as-is. Only the mock data around it is throwaway.
 */
;(() => {
  'use strict'

  /** Line icons, 18×18 on a common grid. Stroke is `currentColor` so a button colours its own glyph. */
  const ICONS = {
    navigate:
      '<path d="M7 11V4.5a1.2 1.2 0 0 1 2.4 0V9.5M9.4 9V3.4a1.2 1.2 0 0 1 2.4 0V9.5M11.8 9.5V5a1.2 1.2 0 0 1 2.4 0v6c0 3-2 5-5 5H9c-2 0-3-1-4-2.5L3 10.6a1.2 1.2 0 0 1 2-1.3L7 11"/>',
    draw: '<path d="M9 2l5 7-3.5 7h-3L4 9z"/><path d="M9 2v7"/><circle cx="9" cy="10.5" r="1.2"/>',
    edit: '<path d="M4.5 2v13l3.4-3.4 2.4 5 2-1-2.4-5H14.5z"/>',
    undo: '<path d="M6 4L2.5 7.5 6 11"/><path d="M2.5 7.5H11a4 4 0 0 1 0 8H8"/>',
    redo: '<path d="M12 4l3.5 3.5L12 11"/><path d="M15.5 7.5H7a4 4 0 0 0 0 8h3"/>',
    plus: '<path d="M9 3.5v11M3.5 9h11"/>',
    minus: '<path d="M3.5 9h11"/>',
    fit: '<path d="M3 7V3h4M11 3h4v4M15 11v4h-4M7 15H3v-4"/>',
    eyeOpen:
      '<path d="M1.5 9C4 4.6 14 4.6 16.5 9 14 13.4 4 13.4 1.5 9z"/><circle cx="9" cy="9" r="2.2"/>',
    eyeShut: '<path d="M1.5 9C4 4.6 14 4.6 16.5 9 14 13.4 4 13.4 1.5 9z"/><path d="M3 15L15 3"/>',
    close: '<path d="M3 3l12 12M15 3L3 15"/>',
    chevron: '<path d="M4 7l5 5 5-5"/>',
  }

  /**
   * Wrap an icon path in an `<svg>`.
   * @param {string} name key of `ICONS`
   * @param {number} [size] rendered edge in pixels
   * @returns {string} the markup, always `aria-hidden` — the button carries the name
   */
  const icon = (name, size = 18) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`

  /** @param {string} value @returns {string} the value, safe to interpolate into markup */
  const escape = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const TOOLS = [
    { key: 'navigate', label: 'Navigate', hint: 'Space' },
    { key: 'draw', label: 'Draw', hint: 'P' },
    { key: 'edit', label: 'Edit', hint: 'A' },
  ]

  /**
   * Fill the four `[data-shell]` placeholders of a screen.
   *
   * Nothing here is optional by accident: an absent `undo` means *nothing to undo*, which is a
   * state the button must state rather than hide, since the history is the editor's safety net.
   *
   * @param {object} config
   * @param {string} config.file        the open file's name
   * @param {number} config.year        the year being drawn
   * @param {string} config.zoom        the zoom as written in the document tab, e.g. `48 %`
   * @param {boolean} [config.modified] unsaved changes exist
   * @param {string} [config.tool]      key of the pressed tool; defaults to `navigate`
   * @param {string|null} [config.swatch] the active polity's colour, or `null` for none
   * @param {string|null} [config.undo] what undo would revert, or `null`
   * @param {string|null} [config.redo] what redo would replay, or `null`
   * @param {string} config.coords      the pointer's position, already formatted
   * @param {string} config.holder      who holds the ground under the pointer
   * @param {string} config.scale       the ground resolution, e.g. `6.1 km/px`
   * @param {string} config.totals      the right-hand figures of the status bar
   * @param {string} config.zoomStatus  the zoom as written in the status bar
   * @returns {void}
   */
  function mountShell(config) {
    const slot = (name) => document.querySelector(`[data-shell="${name}"]`)
    const tool = config.tool ?? 'navigate'

    const appbar = slot('appbar')
    if (appbar) {
      appbar.innerHTML = `
        <div class="brand">
          <span style="font-weight:600">Cartographer</span>
          <span class="sep">·</span>
          <span class="dim">${escape(config.file)}</span>
          ${config.modified ? '<span class="modified" title="Modified since last save">modified</span>' : ''}
        </div>
        <div class="actions">
          ${['Open…', 'Save', 'Save as…', 'Export for the atlas…', 'Registry']
            .map((label) => `<button class="hoverable">${label}</button>`)
            .join('')}
        </div>`
    }

    const docbar = slot('docbar')
    if (docbar) {
      const historyButton = (kind, what) => {
        const verb = kind === 'undo' ? 'Undo' : 'Redo'
        const keys = kind === 'undo' ? '⌘Z' : '⌘⇧Z'
        const name = what ? `${verb} ${what}` : `${verb} — nothing to ${kind}`
        return `<button class="icon-btn hoverable" ${what ? '' : 'disabled'} aria-label="${escape(name)}" title="${escape(`${name} (${keys})`)}">${icon(kind, 14)}</button>`
      }
      docbar.innerHTML = `
        <div class="doctab">
          <button class="icon-btn hoverable" style="width:24px;height:24px" aria-label="${escape(`Close ${config.file}`)}" title="${escape(`Close ${config.file}`)}">${icon('close', 9)}</button>
          <span style="font-weight:500">${escape(config.file)}</span>
          <span class="mono dim">@ ${escape(config.zoom)} (${config.year} / editorial zone)</span>
        </div>
        <div class="actions">
          ${historyButton('undo', config.undo ?? null)}
          ${historyButton('redo', config.redo ?? null)}
          <button class="primary">Check this year</button>
        </div>`
    }

    const rail = slot('rail')
    if (rail) {
      const empty = config.swatch == null
      rail.innerHTML = `
        <div class="tools" role="toolbar" aria-orientation="vertical" aria-label="Tools">
          ${TOOLS.map(
            (t) =>
              `<button class="tool hoverable" aria-pressed="${t.key === tool}" aria-label="${t.label}" title="${t.label} (${t.hint})">${icon(t.key)}</button>`
          ).join('')}
        </div>
        <div class="foot">
          <hr>
          <span class="swatch-active" role="img" data-empty="${empty}"
                style="${empty ? '' : `background:${escape(config.swatch)}`}"
                aria-label="${empty ? 'Active polity — none selected' : `Active polity — ${escape(config.swatch)}`}"
                title="${empty ? 'Active polity — none selected' : 'Active polity'}"></span>
        </div>`
    }

    const status = slot('status')
    if (status) {
      status.innerHTML = `
        <button class="zoom hoverable" aria-haspopup="listbox" aria-label="Zoom level — ${escape(config.zoomStatus)}" title="Zoom level">
          <span class="mono" style="color:var(--ink)">${escape(config.zoomStatus)}</span>
          ${icon('chevron', 8)}
        </button>
        <div class="reads">
          <span class="mono" style="min-width:126px">${escape(config.coords)}</span>
          <span style="min-width:190px">${escape(config.holder)}</span>
          <span class="mono dim">${escape(config.scale)}</span>
        </div>
        <div class="totals mono">${escape(config.totals)}</div>`
    }
  }

  // --------------------------------------------------------------- the dock --

  const TAB = 24 // a collapsed group is exactly its tab strip
  const MIN_LEAD = 80 // the upper group never shrinks below a few rows
  const SPLITTER = 5

  /**
   * Give every `.dock` its collapse buttons and, when it holds two groups, its splitter.
   *
   * Collapsing is deliberately **not** a second mechanism: a collapsed group is this same
   * resize at its lower bound. One number drives both, so they cannot disagree.
   *
   * @param {ParentNode} [scope] where to look for docks; defaults to the document
   * @returns {void}
   */
  function initDocks(scope = document) {
    for (const dock of scope.querySelectorAll('.dock')) {
      const groups = [...dock.querySelectorAll(':scope > .group')]
      const splitter = dock.querySelector(':scope > .splitter')
      const spacer = dock.querySelector(':scope > .dock-spacer')
      const [lead, trail] = groups
      const state = { height: trail ? parseInt(trail.dataset.height ?? '216', 10) : 0, restore: 0 }
      state.restore = state.height

      const collapsed = (group) => group?.dataset.collapsed === 'true'
      const maxTrail = () => Math.max(TAB, dock.clientHeight - SPLITTER - MIN_LEAD)

      /** Push the state onto the DOM: flex bases, ARIA, and whether the splitter may be dragged. */
      function apply() {
        if (!trail) return
        const leadOut = collapsed(lead)
        const trailOut = collapsed(trail)
        lead.style.flex = leadOut ? `0 0 ${TAB}px` : '1 1 auto'
        trail.style.flex = trailOut
          ? `0 0 ${TAB}px`
          : leadOut
            ? '1 1 auto'
            : `0 0 ${state.height}px`
        if (spacer) spacer.style.display = leadOut && trailOut ? 'block' : 'none'
        if (!splitter) return
        // Dragging a collapsed group would silently un-collapse it — refuse instead.
        splitter.setAttribute('aria-disabled', String(leadOut || trailOut))
        splitter.setAttribute('aria-valuenow', String(Math.round(state.height)))
        splitter.setAttribute('aria-valuemax', String(Math.round(maxTrail())))
      }

      /** Clamp the trailing group's height into what the dock can actually give, then repaint. */
      function setHeight(px) {
        state.height = Math.min(maxTrail(), Math.max(TAB, px))
        apply()
      }

      for (const button of dock.querySelectorAll('.collapse')) {
        button.addEventListener('click', () => {
          const group = button.closest('.group')
          const next = !collapsed(group)
          // Remember the height being folded away, so unfolding lands where it was.
          if (group === trail && next) state.restore = state.height
          group.dataset.collapsed = String(next)
          if (group === trail && !next) state.height = state.restore
          button.setAttribute('aria-expanded', String(!next))
          const name = group.dataset.panelName ?? 'panel'
          button.setAttribute('aria-label', `${next ? 'Expand' : 'Collapse'} the ${name} panel`)
          button.title = button.getAttribute('aria-label')
          apply()
        })
      }

      if (splitter) {
        splitter.addEventListener('pointerdown', (event) => {
          if (splitter.getAttribute('aria-disabled') === 'true') return
          const startY = event.clientY
          const startHeight = state.height
          splitter.setPointerCapture(event.pointerId)
          document.body.classList.add('resizing')
          const move = (e) => setHeight(startHeight - (e.clientY - startY))
          const up = () => {
            splitter.removeEventListener('pointermove', move)
            splitter.removeEventListener('pointerup', up)
            document.body.classList.remove('resizing')
          }
          splitter.addEventListener('pointermove', move)
          splitter.addEventListener('pointerup', up)
        })

        // A splitter reachable only by pointer is a function a keyboard user simply loses.
        splitter.addEventListener('keydown', (event) => {
          if (splitter.getAttribute('aria-disabled') === 'true') return
          const step = event.shiftKey ? 48 : 16
          const moves = {
            ArrowUp: () => setHeight(state.height + step),
            ArrowDown: () => setHeight(state.height - step),
            Home: () => setHeight(maxTrail()),
            End: () => setHeight(TAB),
          }
          const move = moves[event.key]
          if (!move) return
          event.preventDefault()
          move()
        })
      }

      // A window resize can make the stored height illegal; re-clamp rather than overflow.
      window.addEventListener('resize', () => setHeight(state.height))
      apply()
    }
  }

  window.Chrome = { ICONS, icon, escape, mountShell, initDocks }
})()
