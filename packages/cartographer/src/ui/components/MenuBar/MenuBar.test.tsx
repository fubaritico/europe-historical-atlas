import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'

import { MenuBar } from './MenuBar'

import type { MenuDefinition } from './menuBarProps'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Two menus: File with two commands, Edit with a greyed one between two that act.
 * @param chosen - what a choice records
 * @returns the menus
 */
function menus(chosen: (id: string) => void): MenuDefinition[] {
  const command = (id: string, enabled = true) => ({
    kind: 'command' as const,
    id,
    label: id,
    keys: id === 'open' ? { shown: '⌘O', aria: 'Meta+O Control+O' } : null,
    enabled,
    onChoose: () => {
      chosen(id)
    },
  })
  return [
    { id: 'file', label: 'File', entries: [command('open'), command('save')] },
    {
      id: 'edit',
      label: 'Edit',
      entries: [
        command('undo'),
        command('redo', false),
        { kind: 'separator', id: 'h' },
        command('copy'),
      ],
    },
  ]
}

/**
 * The bar mounted, with what its choices record.
 * @returns the user and the recorder
 */
function mount() {
  const chosen = vi.fn()
  renderInEnglish(<MenuBar label="Menus" menus={menus(chosen)} />)
  return { user: userEvent.setup(), chosen }
}

/**
 * The open menu's commands, as read.
 * @returns their names
 */
function openItems(): string[] {
  return screen
    .queryAllByRole('menuitem')
    .flatMap((item) =>
      item.closest('[role="menu"]') === null
        ? []
        : [item.querySelector('.menu-bar__label')?.textContent ?? '']
    )
}

/**
 * The bar with Edit greyed whole, File open.
 * @returns the user
 */
function mountGreyed() {
  const greyed = menus(vi.fn()).map((menu) =>
    menu.id === 'edit' ? { ...menu, enabled: false } : menu
  )
  renderInEnglish(<MenuBar label="Menus" menus={greyed} />)
  return userEvent.setup()
}

describe('MenuBar', () => {
  describe('happy path', () => {
    it('opens a menu on its title, its commands listed with their keys', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'File' }))

      expect(openItems()).toEqual(['open', 'save'])
      expect(document.querySelector('.menu-bar__keys')?.textContent).toBe('⌘O')
    })

    it('runs a command chosen, and closes the menu', async () => {
      const { user, chosen } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'File' }))
      await user.click(screen.getByRole('menuitem', { name: 'save' }))

      expect(chosen).toHaveBeenCalledWith('save')
      expect(screen.queryByRole('menu')).toBeNull()
    })
  })

  describe('variants', () => {
    it('opens the menu the pointer moves over while one is open', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'File' }))
      await user.hover(screen.getByRole('menuitem', { name: 'Edit' }))

      expect(openItems()).toEqual(['undo', 'redo', 'copy'])
    })

    it('opens nothing on hover while no menu is open', async () => {
      const { user } = mount()
      await user.hover(screen.getByRole('menuitem', { name: 'Edit' }))

      expect(screen.queryByRole('menu')).toBeNull()
    })

    it('closes a menu on its title pressed again', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'File' }))
      await user.click(screen.getByRole('menuitem', { name: 'File' }))

      expect(screen.queryByRole('menu')).toBeNull()
    })

    it('walks the commands with the arrows, over the greyed one, and chooses with ‹enter›', async () => {
      const { user, chosen } = mount()
      screen.getByRole('menuitem', { name: 'Edit' }).focus()
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}{Enter}')

      expect(chosen).toHaveBeenCalledWith('copy')
    })

    it('opens the menu beside with ‹→›, round the ends', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
      await user.keyboard('{ArrowRight}')

      expect(openItems()).toEqual(['open', 'save'])
    })
  })

  describe('managed errors', () => {
    // CARTO-555: a menu greyed whole — nobody signed in, or Édition with no map open.
    describe('a menu greyed whole', () => {
      it('marks its title greyed, the other title left open', () => {
        mountGreyed()

        expect(
          ['File', 'Edit'].map((name) =>
            screen.getByRole('menuitem', { name }).getAttribute('aria-disabled')
          )
        ).toEqual([null, 'true'])
      })

      it('opens nothing on a click on its title, and says so in the console', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const user = mountGreyed()
        await user.click(screen.getByRole('menuitem', { name: 'Edit' }))

        expect(screen.queryByRole('menu')).toBeNull()
        expect(warn).toHaveBeenCalledWith('[Cartographer] the menu edit is greyed: not opened')
        warn.mockRestore()
      })

      it('shuts its list when it is greyed while open', async () => {
        const chosen = vi.fn()
        const user = userEvent.setup()
        const { rerender } = renderInEnglish(<MenuBar label="Menus" menus={menus(chosen)} />)
        await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
        rerender(
          <MenuBar
            label="Menus"
            menus={menus(chosen).map((menu) => ({ ...menu, enabled: false }))}
          />
        )

        expect(screen.queryByRole('menu')).toBeNull()
        expect(screen.getByRole('menuitem', { name: 'Edit' }).getAttribute('aria-expanded')).toBe(
          'false'
        )
      })

      it('opens nothing on ‹↓› on its title, the focus staying there', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const user = mountGreyed()
        screen.getByRole('menuitem', { name: 'Edit' }).focus()
        await user.keyboard('{ArrowDown}')

        expect(screen.queryByRole('menu')).toBeNull()
        expect(document.activeElement?.textContent).toBe('Edit')
        vi.restoreAllMocks()
      })

      it('opens nothing on ‹→› from the open menu beside it, which closes', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const user = mountGreyed()
        await user.click(screen.getByRole('menuitem', { name: 'File' }))
        await user.keyboard('{ArrowRight}')

        expect(screen.queryByRole('menu')).toBeNull()
        vi.restoreAllMocks()
      })

      it('opens nothing when the pointer slides onto it from an open menu, which closes', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const user = mountGreyed()
        await user.click(screen.getByRole('menuitem', { name: 'File' }))
        await user.hover(screen.getByRole('menuitem', { name: 'Edit' }))

        expect(screen.queryByRole('menu')).toBeNull()
        vi.restoreAllMocks()
      })
    })

    it('does nothing for a greyed command clicked, and says so in the console', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { user, chosen } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
      await user.click(screen.getByRole('menuitem', { name: 'redo' }))

      expect(chosen).not.toHaveBeenCalled()
      expect(screen.queryByRole('menu')).not.toBeNull()
      expect(warn).toHaveBeenCalledOnce()
    })

    it('shows a greyed command, marked as such', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }))

      expect(screen.getByRole('menuitem', { name: 'redo' }).getAttribute('aria-disabled')).toBe(
        'true'
      )
    })
  })

  // L4: N/A — no data is read or fetched; the menus arrive as literals.

  describe('the keyboard, as the APG menubar', () => {
    it('walks up round from the first command to the last', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
      await user.keyboard('{ArrowUp}')

      expect(document.activeElement?.textContent).toBe('copy')
    })

    it('goes to the last command with ‹End› and back to the first with ‹Home›', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
      await user.keyboard('{End}')
      const last = document.activeElement?.textContent
      await user.keyboard('{Home}')

      expect([last, document.activeElement?.textContent]).toEqual(['copy', 'undo'])
    })

    it('opens the menu before with ‹←›, round from the first to the last', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'File' }))
      await user.keyboard('{ArrowLeft}')

      expect(openItems()).toEqual(['undo', 'redo', 'copy'])
    })

    it('opens a menu on its last command with ‹↑› on its title', async () => {
      const { user } = mount()
      screen.getByRole('menuitem', { name: 'File' }).focus()
      await user.keyboard('{ArrowUp}')

      expect(document.activeElement?.textContent).toBe('save')
    })

    it('walks the titles with ‹→› and ‹←›, the menus staying closed', async () => {
      const { user } = mount()
      screen.getByRole('menuitem', { name: 'File' }).focus()
      await user.keyboard('{ArrowRight}')

      expect(document.activeElement?.textContent).toBe('Edit')
      expect(screen.queryByRole('menu')).toBeNull()
    })

    it('is one ‹Tab› stop, on the title last focused', async () => {
      const { user } = mount()
      screen.getByRole('menuitem', { name: 'File' }).focus()
      await user.keyboard('{ArrowRight}')
      const tabStops = screen
        .getAllByRole('menuitem')
        .filter((title) => title.getAttribute('tabindex') === '0')
        .map((title) => title.textContent)

      expect(tabStops).toEqual(['Edit'])
    })

    it('closes the menu on ‹Tab›, the focus going on from its title', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'File' }))
      await user.keyboard('{Tab}')

      expect(screen.queryByRole('menu')).toBeNull()
    })

    it('puts the focus back on the title before the command runs', async () => {
      let focusedWhenRun: string | null | undefined
      renderInEnglish(
        <MenuBar
          label="Menus"
          menus={menus(() => {
            focusedWhenRun = document.activeElement?.textContent
          })}
        />
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('menuitem', { name: 'File' }))
      await user.keyboard('{Enter}')

      expect(focusedWhenRun).toBe('File')
    })

    it('focuses a menu where nothing can act, so ‹escape› still closes it', async () => {
      const greyed: MenuDefinition[] = [
        {
          id: 'edit',
          label: 'Edit',
          entries: [
            {
              kind: 'command',
              id: 'undo',
              label: 'undo',
              keys: null,
              enabled: false,
              onChoose: vi.fn(),
            },
          ],
        },
      ]
      renderInEnglish(<MenuBar label="Menus" menus={greyed} />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('menu')).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('closes on ‹escape›, the focus back on its title', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'File' }))
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('menu')).toBeNull()
      expect(document.activeElement?.textContent).toBe('File')
    })

    it('closes on a press outside the bar', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('menuitem', { name: 'File' }))
      await user.click(document.body)

      expect(screen.queryByRole('menu')).toBeNull()
    })

    it('says to a screen reader which title opens a menu, and whether it is open', async () => {
      const { user } = mount()
      const file = screen.getByRole('menuitem', { name: 'File' })
      await user.click(file)

      expect([file.getAttribute('aria-haspopup'), file.getAttribute('aria-expanded')]).toEqual([
        'menu',
        'true',
      ])
    })
  })
})
