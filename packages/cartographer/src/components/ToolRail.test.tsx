import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { TOOL_KEYS } from '../canvas/navigation'
import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { UNFRAMED } from '../view/viewport'

import { HOLD_TO_OPEN_MS, RAIL_TOOLS } from './railTools'
import { ToolRail } from './ToolRail'
import { ToolRailPanel } from './ToolRailPanel'

import type { ToolRailProps } from './ToolRail'

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
  render(<ToolRail tool="navigate" onSelect={onSelect} swatch={null} {...overrides} />)
  return { onSelect, user: userEvent.setup() }
}

const tool = (name: string) => screen.getByRole('button', { name })

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
      ])
      expect(items[0]?.getAttribute('aria-checked')).toBe('true')
      expect(items[1]?.getAttribute('aria-disabled')).toBe('true')
    })

    it('opens the group on a press held long enough, and that press takes no tool', () => {
      vi.useFakeTimers()
      const onSelect = vi.fn()
      render(<ToolRail tool="navigate" onSelect={onSelect} swatch={null} />)
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
      render(<ToolRail tool="navigate" onSelect={onSelect} swatch={null} />)
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
      render(<ToolRail tool="navigate" onSelect={vi.fn()} swatch={null} />)
      fireEvent.pointerDown(tool('Pen'), { button: 0 })
      fireEvent.pointerLeave(tool('Pen'))
      act(() => {
        vi.advanceTimersByTime(HOLD_TO_OPEN_MS * 2)
      })
      expect(screen.queryByRole('menu')).toBeNull()
    })

    it('shows the aimed-at polity’s colour at the foot', () => {
      mount({ swatch: { name: 'Reaume de France', colour: '#54719b' } })
      const swatch = screen.getByRole('img', { name: 'Active polity — Reaume de France' })
      expect(swatch.getAttribute('style')).toContain('background')
    })
  })

  describe('managed errors', () => {
    // A disabled variant stays listed, so the group's shape shows, and cannot be chosen.
    it('ignores a click on a variant that is not there yet', async () => {
      const { onSelect, user } = mount()
      await user.pointer({ keys: '[MouseRight]', target: tool('Pen') })
      await user.click(screen.getByRole('menuitemradio', { name: /follow the coast/ }))
      expect(onSelect).not.toHaveBeenCalled()
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
      const { onSelect, user } = mount({ tool: 'draw' })
      tool('Pen').focus()
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement?.getAttribute('role')).toBe('menuitemradio')
      await user.keyboard('{Enter}')
      expect(onSelect).toHaveBeenCalledWith('draw')
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
    render(<ToolRail tool="navigate" onSelect={onSelect} swatch={null} />)
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

describe('ToolRailPanel', () => {
  /** A store on an empty year. */
  function openStore() {
    return createCartographerStore({
      edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
      viewport: { viewport: UNFRAMED },
    })
  }

  describe('happy path', () => {
    it('takes the tool through the store', async () => {
      const store = openStore()
      render(<ToolRailPanel store={store} />)
      await userEvent.setup().click(tool('Pen'))
      expect(store.getState().tool).toBe('draw')
    })
  })

  describe('variants', () => {
    it('presses the tool the store holds, whoever chose it', () => {
      const store = openStore()
      render(<ToolRailPanel store={store} />)
      act(() => {
        store.getState().selectTool('edit')
      })
      expect(tool('Direct Selection').getAttribute('aria-pressed')).toBe('true')
    })
  })

  describe('managed errors', () => {
    it('shows no swatch while nobody is aimed at', () => {
      render(<ToolRailPanel store={openStore()} />)
      expect(screen.getByRole('img', { name: /none selected/ })).toBeDefined()
    })
  })

  describe('unmanaged errors', () => {
    // An undo that takes the polity away empties the swatch on its own: the target stops resolving.
    it('empties the swatch when the aimed-at polity is undone', () => {
      const store = openStore()
      render(<ToolRailPanel store={store} />)
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
      render(<ToolRailPanel store={store} />)
      expect(screen.getByRole('img', { name: /France/ }).getAttribute('style')).toContain(
        'rgb(18, 52, 86)'
      )
    })
  })
})
