import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { TOOL_KEYS } from '../canvas/navigation'
import { openEmptyYear } from '../state/openEmptyYear'
import { createPolityColourSource } from '../state/polityColourSource'
import { createCartographerStore } from '../state/store'
import { PEN_MODES } from '../state/toolSlice'
import { UNFRAMED } from '../view/viewport'

import { HOLD_TO_OPEN_MS, PEN_VARIANTS, RAIL_TOOLS } from './railTools'
import { ToolRail } from './ToolRail'
import { ToolRailPanel } from './ToolRailPanel'

import type { RailTool } from './railTools'
import type { ToolRailProps } from './ToolRail'

/** One colour source for the mounts below, over the shipped palette. */
const COLOURS = createPolityColourSource(AUTOMATIC_PALETTE)

afterEach(() => {
  vi.useRealTimers()
})

/**
 * Mount the rail on literals.
 * @param overrides - what this test cares about
 * @returns the select spy and a user
 */
function mount(overrides: Partial<ToolRailProps> = {}) {
  const onSelect = vi.fn()
  const onPenMode = vi.fn()
  render(
    <ToolRail
      tool="navigate"
      onSelect={onSelect}
      swatch={null}
      penMode="free"
      onPenMode={onPenMode}
      {...overrides}
    />
  )
  return { onSelect, onPenMode, user: userEvent.setup() }
}

const tool = (name: string) => screen.getByRole('button', { name })

/** The Pen alone, its group holding one row that is not available — what a rung in progress lists. */
const WITH_A_DISABLED_ROW: readonly RailTool[] = [
  {
    tool: 'draw',
    label: 'Pen',
    key: 'P',
    icon: 'draw',
    variants: [
      { id: 'free', label: 'Pen', shortcut: 'P', icon: 'draw', enabled: true },
      { id: 'river', label: 'Pen — follow a river', shortcut: null, icon: 'draw', enabled: false },
    ],
  },
]

describe('ToolRail', () => {
  describe('happy path', () => {
    // The dev, 2026-10-11: the tools one under the other, in Illustrator's order.
    it('lists the three tools top to bottom, the one in hand pressed', () => {
      mount({ tool: 'draw' })
      const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))
      expect(names).toEqual(['Direct Selection', 'Pen', 'Hand'])
      expect(tool('Pen').getAttribute('aria-pressed')).toBe('true')
      expect(tool('Hand').getAttribute('aria-pressed')).toBe('false')
    })

    it('takes a tool on a click', async () => {
      const { onSelect, user } = mount()
      await user.click(tool('Direct Selection'))
      expect(onSelect).toHaveBeenCalledWith('edit')
    })
  })

  describe('variants', () => {
    // Illustrator's hidden tools: a right click opens the group beside the button.
    it('opens the Pen’s group on a right click, the Pen marked and the rest listed', async () => {
      const { user } = mount({ tool: 'draw' })
      await user.pointer({ keys: '[MouseRight]', target: tool('Pen') })
      const items = screen.getAllByRole('menuitemradio')
      expect(items.map((item) => item.textContent)).toEqual([
        'Pen(P)',
        'Pen — follow the coast',
        'Pen — follow a river',
        'Pencil — freehand',
      ])
      expect(items[0]?.getAttribute('aria-checked')).toBe('true')
      expect(items[1]?.getAttribute('aria-disabled')).toBe('false')
      expect(items[2]?.getAttribute('aria-disabled')).toBe('false')
    })

    // As Illustrator's button shows the Pencil once it is chosen.
    it('shows the Pencil glyph on the group head when the Pencil is in use', () => {
      mount({ tool: 'draw', penMode: 'pencil' })
      const head = tool('Pencil — freehand')
      const paths = [...head.querySelectorAll('path')].map((path) => path.getAttribute('d'))
      expect(paths).toContain('M10 4.5l3.5 3.5')
    })

    // A11Y-005: the keys reach assistive tech, not only the tooltip — → opens the Pen's group.
    it('declares each tool’s key, and → on the group head', () => {
      mount()
      expect(tool('Direct Selection').getAttribute('aria-keyshortcuts')).toBe('A')
      expect(tool('Pen').getAttribute('aria-keyshortcuts')).toBe('P ArrowRight')
    })

    // ARCH-002: a mode added to the store and not to the rail would be reached by ‹P› and shown nowhere.
    it('lists one row per Pen mode, in the store’s order', () => {
      expect(PEN_VARIANTS.map((variant) => variant.id)).toEqual([...PEN_MODES])
    })

    it('reports the river Pen when its row is chosen', async () => {
      const { onPenMode, user } = mount()
      await user.pointer({ keys: '[MouseRight]', target: tool('Pen') })
      await user.click(screen.getByRole('menuitemradio', { name: /follow a river/ }))
      expect(onPenMode).toHaveBeenCalledWith('river')
    })

    it('opens the group on a press held long enough, and that press takes no tool', () => {
      vi.useFakeTimers()
      const onSelect = vi.fn()
      render(
        <ToolRail
          tool="navigate"
          onSelect={onSelect}
          swatch={null}
          penMode="free"
          onPenMode={vi.fn()}
        />
      )
      fireEvent.pointerDown(tool('Pen'), { button: 0 })
      act(() => {
        vi.advanceTimersByTime(HOLD_TO_OPEN_MS)
      })
      fireEvent.pointerUp(tool('Pen'))
      fireEvent.click(tool('Pen'))
      expect(screen.getByRole('menu')).toBeDefined()
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('takes the tool on a press released before the hold', () => {
      vi.useFakeTimers()
      const onSelect = vi.fn()
      render(
        <ToolRail
          tool="navigate"
          onSelect={onSelect}
          swatch={null}
          penMode="free"
          onPenMode={vi.fn()}
        />
      )
      fireEvent.pointerDown(tool('Pen'), { button: 0 })
      act(() => {
        vi.advanceTimersByTime(HOLD_TO_OPEN_MS - 100)
      })
      fireEvent.pointerUp(tool('Pen'))
      fireEvent.click(tool('Pen'))
      // Past the deadline: the release must have cancelled the timer, not merely beaten it (QUAL-002).
      act(() => {
        vi.advanceTimersByTime(HOLD_TO_OPEN_MS)
      })
      expect(screen.queryByRole('menu')).toBeNull()
      expect(onSelect).toHaveBeenCalledWith('draw')
    })

    it('cancels the hold when the pointer leaves the button', () => {
      vi.useFakeTimers()
      render(
        <ToolRail
          tool="navigate"
          onSelect={vi.fn()}
          swatch={null}
          penMode="free"
          onPenMode={vi.fn()}
        />
      )
      fireEvent.pointerDown(tool('Pen'), { button: 0 })
      fireEvent.pointerLeave(tool('Pen'))
      act(() => {
        vi.advanceTimersByTime(HOLD_TO_OPEN_MS * 2)
      })
      expect(screen.queryByRole('menu')).toBeNull()
    })

    // A11Y-002, closed: the row marked is the mode in use, and choosing a row reports it.
    it('marks the Pen’s mode in use, and reports the one chosen', async () => {
      const { onPenMode, user } = mount({ tool: 'draw', penMode: 'coast' })
      // A11Y-002: the head is named after the variant in use.
      expect(tool('Pen — follow the coast').getAttribute('title')).toBe(
        'Pen — follow the coast (P)'
      )
      await user.pointer({ keys: '[MouseRight]', target: tool('Pen — follow the coast') })
      expect(
        screen.getByRole('menuitemradio', { name: /follow the coast/ }).getAttribute('aria-checked')
      ).toBe('true')
      await user.click(screen.getByRole('menuitemradio', { name: /^Pen\(P\)$/ }))
      expect(onPenMode).toHaveBeenCalledWith('free')
    })

    it('shows the aimed-at polity’s colour at the foot', () => {
      mount({ swatch: { name: 'Reaume de France', colour: '#54719b' } })
      const swatch = screen.getByRole('img', { name: 'Active polity — Reaume de France' })
      expect(swatch.getAttribute('style')).toContain('background')
    })
  })

  describe('managed errors', () => {
    // A disabled variant stays listed, so the group's shape shows, and cannot be chosen.
    it('ignores a click on a variant that is disabled', async () => {
      const { onSelect, onPenMode, user } = mount({ tools: WITH_A_DISABLED_ROW })
      await user.pointer({ keys: '[MouseRight]', target: tool('Pen') })
      await user.click(screen.getByRole('menuitemradio', { name: /follow a river/ }))
      expect(onSelect).not.toHaveBeenCalled()
      expect(onPenMode).not.toHaveBeenCalled()
      expect(screen.getByRole('menu')).toBeDefined()
    })

    it('says when nobody is aimed at', () => {
      mount()
      const swatch = screen.getByRole('img', { name: 'Active polity — none selected' })
      expect(swatch.getAttribute('data-empty')).toBe('true')
    })
  })

  describe('unmanaged errors', () => {
    // A press anywhere outside closes the flyout, as any flyout does.
    it('closes the group on a press outside it', async () => {
      const { user } = mount()
      await user.pointer({ keys: '[MouseRight]', target: tool('Pen') })
      await user.click(document.body)
      expect(screen.queryByRole('menu')).toBeNull()
    })
  })

  describe('edge cases', () => {
    // The keyboard has its way in and out: → opens, ↑ ↓ move, Enter chooses, Escape returns.
    it('opens on →, chooses with Enter, and gives the focus back to the tool', async () => {
      const { onPenMode, user } = mount({ tool: 'draw' })
      tool('Pen').focus()
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement?.getAttribute('role')).toBe('menuitemradio')
      await user.keyboard('{Enter}')
      expect(onPenMode).toHaveBeenCalledWith('free')
      expect(screen.queryByRole('menu')).toBeNull()
      expect(document.activeElement).toBe(tool('Pen'))
    })

    it('closes on Escape without choosing', async () => {
      const { onSelect, user } = mount({ tool: 'draw' })
      tool('Pen').focus()
      await user.keyboard('{ArrowRight}{Escape}')
      expect(screen.queryByRole('menu')).toBeNull()
      expect(onSelect).not.toHaveBeenCalled()
    })

    // One Tab stop, the tool in hand; ↑ ↓ walk the toolbar, wrapping.
    it('walks the toolbar with the arrows, and is one Tab stop', async () => {
      const { user } = mount({ tool: 'edit' })
      expect(tool('Direct Selection').tabIndex).toBe(0)
      expect(tool('Pen').tabIndex).toBe(-1)
      tool('Direct Selection').focus()
      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(tool('Pen'))
      await user.keyboard('{ArrowUp}{ArrowUp}')
      expect(document.activeElement).toBe(tool('Hand'))
    })
  })
})

describe('ToolRail — what the review found', () => {
  // ARCH-015 / A11Y-001 / QUAL-001: after one hold, the keyboard could no longer take the Pen.
  it('still takes the Pen from the keyboard after a hold opened its group', () => {
    vi.useFakeTimers()
    const onSelect = vi.fn()
    render(
      <ToolRail
        tool="navigate"
        onSelect={onSelect}
        swatch={null}
        penMode="free"
        onPenMode={vi.fn()}
      />
    )
    fireEvent.pointerDown(tool('Pen'), { button: 0 })
    act(() => {
      vi.advanceTimersByTime(HOLD_TO_OPEN_MS)
    })
    fireEvent.pointerUp(tool('Pen'))
    fireEvent.click(tool('Pen'))
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    // Enter on a button is a click with no pointerdown before it.
    fireEvent.click(tool('Pen'))
    expect(onSelect).toHaveBeenCalledWith('draw')
  })

  // ARCH-016: the tooltips name the keys the canvas really binds.
  it('names in its tooltips the keys the canvas binds', () => {
    for (const [key, bound] of Object.entries(TOOL_KEYS)) {
      const entry = RAIL_TOOLS.find((candidate) => candidate.tool === bound)
      expect(entry?.key.toLowerCase()).toBe(key)
    }
  })
})

describe('ToolRailPanel — the Pen’s mode', () => {
  // QUAL-108: the binding carries the mode both ways — choosing a row sets it, the store marks it.
  it('sets the Pen’s mode from its group, and marks the one the store holds', async () => {
    const store = createCartographerStore({
      edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
      viewport: { viewport: UNFRAMED },
    })
    render(<ToolRailPanel store={store} colours={COLOURS} />)
    const user = userEvent.setup()
    await user.pointer({ keys: '[MouseRight]', target: tool('Pen') })
    await user.click(screen.getByRole('menuitemradio', { name: /follow the coast/ }))
    expect(store.getState().penMode).toBe('coast')
    expect(store.getState().tool).toBe('draw')
    expect(tool('Pen — follow the coast').getAttribute('aria-pressed')).toBe('true')
  })
})

/** A store on an empty year. */
function openStore() {
  return createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
}

describe('ToolRailPanel', () => {
  describe('happy path', () => {
    it('takes the tool through the store', async () => {
      const store = openStore()
      render(<ToolRailPanel store={store} colours={COLOURS} />)
      await userEvent.setup().click(tool('Pen'))
      expect(store.getState().tool).toBe('draw')
    })
  })

  describe('variants', () => {
    it('presses the tool the store holds, whoever chose it', () => {
      const store = openStore()
      render(<ToolRailPanel store={store} colours={COLOURS} />)
      act(() => {
        store.getState().selectTool('edit')
      })
      expect(tool('Direct Selection').getAttribute('aria-pressed')).toBe('true')
    })
  })

  describe('managed errors', () => {
    it('shows no swatch while nobody is aimed at', () => {
      render(<ToolRailPanel store={openStore()} colours={COLOURS} />)
      expect(screen.getByRole('img', { name: /none selected/ })).toBeDefined()
    })
  })

  describe('unmanaged errors', () => {
    // An undo that takes the polity away empties the swatch on its own: the target stops resolving.
    it('empties the swatch when the aimed-at polity is undone', () => {
      const store = openStore()
      render(<ToolRailPanel store={store} colours={COLOURS} />)
      act(() => {
        store.getState().createPolity(
          {
            id: 'fr',
            name: 'Reaume de France',
            rank: null,
            status: null,
            suzerain: null,
            existsFrom: null,
            existsTo: null,
            colour: '#54719b',
            wikidata: null,
          },
          { kind: 'create-polity', label: 'create' }
        )
        store.getState().aimAt('fr')
      })
      expect(screen.getByRole('img', { name: 'Active polity — Reaume de France' })).toBeDefined()
      act(() => {
        store.getState().undo()
      })
      expect(screen.getByRole('img', { name: /none selected/ })).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('shows the pinned colour of the aimed-at polity', () => {
      const store = openStore()
      store.getState().createPolity(
        {
          id: 'fr',
          name: 'France',
          rank: null,
          status: null,
          suzerain: null,
          existsFrom: null,
          existsTo: null,
          colour: '#123456',
          wikidata: null,
        },
        { kind: 'create-polity', label: 'create' }
      )
      store.getState().aimAt('fr')
      render(<ToolRailPanel store={store} colours={COLOURS} />)
      expect(screen.getByRole('img', { name: /France/ }).getAttribute('style')).toContain(
        'rgb(18, 52, 86)'
      )
    })
  })
})
