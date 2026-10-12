import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from '../state/openEmptyYear'
import { createPolityColourSource } from '../state/polityColourSource'
import { createCartographerStore } from '../state/store'
import { UNFRAMED } from '../view/viewport'

import { PolitiesPanel } from './PolitiesPanel'

/** One colour source for the mounts below, over the shipped palette. */
const COLOURS = createPolityColourSource(AUTOMATIC_PALETTE)

function mount() {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  const results: (string | null)[] = []
  render(
    <PolitiesPanel
      store={store}
      colours={COLOURS}
      onResult={(message) => {
        results.push(message)
      }}
    />
  )
  return { store, results, user: userEvent.setup() }
}

/** The dialogue element, open or not — the design system's Modal is a native `<dialog>`. */
const dialog = () => document.querySelector('dialog')

/**
 * Add a polity to the store's year, as the form does.
 * @param store - the store
 * @param id - its id
 * @param name - its name
 */
function create(store: ReturnType<typeof mount>['store'], id: string, name: string) {
  act(() => {
    store.getState().createPolity(
      {
        id,
        name,
        rank: 'kingdom',
        status: null,
        suzerain: null,
        existsFrom: 987,
        existsTo: null,
        colour: null,
        wikidata: null,
      },
      { kind: 'create-polity', label: `create ${name}` }
    )
  })
}

describe('PolitiesPanel', () => {
  describe('happy path', () => {
    it('opens the form on [+ New polity]', async () => {
      const { user } = mount()
      expect(dialog()?.hasAttribute('open')).toBe(false)
      await user.click(screen.getByRole('button', { name: 'New polity' }))
      expect(dialog()?.hasAttribute('open')).toBe(true)
    })
  })

  describe('variants', () => {
    // The dialogue opens ready to type: the cursor in Name, not on the close cross that comes first.
    it('opens with the focus in Name', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('button', { name: 'New polity' }))
      expect(document.activeElement).toBe(screen.getByLabelText('Name'))
    })

    it('closes it again on Cancel', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('button', { name: 'New polity' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(dialog()?.hasAttribute('open')).toBe(false)
    })

    it('closes it once the polity is created', async () => {
      const { store, user } = mount()
      await user.click(screen.getByRole('button', { name: 'New polity' }))
      await user.type(screen.getByLabelText('Name'), 'France')
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(dialog()?.hasAttribute('open')).toBe(false)
      expect(store.getState().document.polities).toHaveLength(1)
    })
  })

  // L3: N/A — the panel only opens and closes; refusals are the dialogue's, tested there.
  // L4: N/A — no input of its own.

  describe('edge cases', () => {
    it('names its region, so a screen reader can reach it', () => {
      mount()
      expect(screen.getByRole('region', { name: 'Polities' })).toBeTruthy()
    })
  })

  describe('the list', () => {
    it('says the year is empty while it holds no polity', () => {
      mount()
      expect(screen.getByText('No polity in this year yet.')).toBeDefined()
      expect(screen.getByText('Drawn at 1100')).toBeDefined()
    })

    // s02 — a polity created from the form "appears in {Polities} marked 'no territory'".
    it('lists a polity as soon as it is created, marked no territory', () => {
      const { store } = mount()
      create(store, 'fr', 'Reaume de France')
      const option = screen.getByRole('option', { name: /Reaume de France/ })
      expect(option.textContent).toContain('no territory')
      expect(option.textContent).toContain('kingdom')
      expect(option.textContent).toContain('987–')
    })

    it('sorts the polities by name, and counts them', () => {
      const { store } = mount()
      create(store, 'z', 'Zirids')
      create(store, 'a', 'Abbasids')
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        expect.stringContaining('Abbasids'),
        expect.stringContaining('Zirids'),
      ])
      expect(document.querySelector('.polities__count')?.textContent).toBe('2')
    })

    // next.md, the dev's decision of 2026-10-08: choosing a polity in the list designates it.
    it('aims at the polity clicked, leaving the tool in hand', async () => {
      const { store, user } = mount()
      create(store, 'fr', 'Reaume de France')
      act(() => {
        store.getState().selectTool('edit')
      })
      await user.click(screen.getByRole('option', { name: /Reaume de France/ }))
      expect(store.getState().target).toBe('fr')
      expect(store.getState().tool).toBe('edit')
    })

    it('marks the polity aimed at as the selected option', () => {
      const { store } = mount()
      create(store, 'fr', 'Reaume de France')
      create(store, 'hr', 'Hungary')
      act(() => {
        store.getState().chooseTarget('fr')
      })
      expect(
        screen.getByRole('option', { name: /Reaume de France/ }).getAttribute('aria-selected')
      ).toBe('true')
      expect(screen.getByRole('option', { name: /Hungary/ }).getAttribute('aria-selected')).toBe(
        'false'
      )
    })

    it('aims with the keyboard: arrows move, Enter chooses', async () => {
      const { store, user } = mount()
      create(store, 'b', 'Bohemia')
      create(store, 'a', 'Aragon')
      screen.getByRole('listbox', { name: 'Polities' }).focus()
      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
      expect(store.getState().target).toBe('b')
    })

    // QUAL-003: the keys' cursor follows a polity, not a position — a row sorted in above it does not
    // move Enter onto another polity.
    it('keeps the keys on the same polity when another is added above it', async () => {
      const { store, user } = mount()
      create(store, 'm', 'Moravia')
      screen.getByRole('listbox', { name: 'Polities' }).focus()
      await user.keyboard('{ArrowDown}')
      create(store, 'a', 'Aragon')
      screen.getByRole('listbox', { name: 'Polities' }).focus()
      await user.keyboard('{Enter}')
      expect(store.getState().target).toBe('m')
    })

    // The target is an id: undoing the polity's creation takes it out of the list and unmarks it.
    it('drops a polity from the list when its creation is undone', () => {
      const { store } = mount()
      create(store, 'fr', 'Reaume de France')
      act(() => {
        store.getState().undo()
      })
      expect(screen.queryByRole('option')).toBeNull()
    })
  })
})

/**
 * A polity with only an id and a name, owing nobody.
 * @param id - its id
 * @param name - its name
 * @returns the polity
 */
const polity = (id: string, name: string) => ({
  id,
  name,
  rank: null,
  status: null,
  suzerain: null,
  existsFrom: null,
  existsTo: null,
  colour: null,
  wikidata: null,
})

/** Two groups, France at the back and the Empire in front — the list shows the Empire first. */
function mountTwo() {
  const mounted = mount()
  act(() => {
    mounted.store
      .getState()
      .createPolity(polity('fr', 'Reaume de France'), { kind: 'c', label: 'c' })
    mounted.store
      .getState()
      .createPolity(polity('hre', 'Sacrum Imperium'), { kind: 'c', label: 'c' })
  })
  return mounted
}

const order = (store: ReturnType<typeof mount>['store']) =>
  store.getState().document.polities.map((held) => held.id)

describe('PolitiesPanel — the stacking menu (s16)', () => {
  describe('happy path', () => {
    // s16 — "When I right-click … and choose [Bring to Front] / Then France is painted over the Empire".
    it('brings France to the front from its row’s menu, as one named step', async () => {
      const { store, results, user } = mountTwo()
      await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Reaume de France') })
      await user.click(screen.getByRole('option', { name: 'Bring to Front' }))
      expect(order(store)).toEqual(['hre', 'fr'])
      expect(store.getState().undoLabel).toBe('bring to front — Reaume de France')
      // A11Y-003: the focus goes back to the list, so the move is said in the result zone.
      expect(results).toEqual(['Bring to Front — Reaume de France'])
      expect(screen.queryByRole('listbox', { name: 'Actions for Reaume de France' })).toBeNull()
    })
  })

  describe('variants', () => {
    // s16 — "a command that would change nothing is disabled".
    it('disables the moves that would change nothing', async () => {
      const { user } = mountTwo()
      await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Sacrum Imperium') })
      const disabled = screen
        .getAllByRole('option')
        .filter((option) => option.getAttribute('aria-disabled') === 'true')
        .map((option) => option.textContent)
      expect(disabled).toEqual(['Bring to Front', 'Bring Forward'])
    })

    // The tree's depth on each row, for the separators (s16).
    it('gives each row its depth in the tree', () => {
      const { store } = mountTwo()
      act(() => {
        store
          .getState()
          .createPolity(
            { ...polity('normandy', 'Normandie'), suzerain: 'fr' },
            { kind: 'c', label: 'c' }
          )
      })
      const levels = screen
        .getAllByRole('option')
        .map((option) => [
          option.querySelector('.polity-row__name')?.textContent,
          option.getAttribute('data-depth'),
        ])
      expect(levels).toEqual([
        ['Sacrum Imperium', '0'],
        ['Reaume de France', '0'],
        ['Normandie', '1'],
      ])
      // A11Y-002: the hierarchy is in the row's text for assistive tech, hidden from the eye.
      expect(
        screen.getByRole('option', { name: /Normandie, vassal of Reaume de France/ })
      ).toBeDefined()
    })

    it('opens the target’s menu with shift+F10, and focuses it', async () => {
      const { store, user } = mountTwo()
      act(() => {
        store.getState().chooseTarget('fr')
      })
      screen.getByRole('listbox', { name: 'Polities' }).focus()
      await user.keyboard('{Shift>}{F10}{/Shift}')
      const menu = screen.getByRole('listbox', { name: 'Actions for Reaume de France' })
      expect(document.activeElement).toBe(menu)
    })
  })

  describe('managed errors', () => {
    it('opens the target’s menu with the menu key too', async () => {
      const { store, user } = mountTwo()
      act(() => {
        store.getState().chooseTarget('hre')
      })
      screen.getByRole('listbox', { name: 'Polities' }).focus()
      await user.keyboard('{ContextMenu}')
      expect(screen.getByRole('listbox', { name: 'Actions for Sacrum Imperium' })).toBeDefined()
    })

    it('closes on escape, the order unchanged, the focus back on the list', async () => {
      const { store, user } = mountTwo()
      await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Reaume de France') })
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('listbox', { name: 'Actions for Reaume de France' })).toBeNull()
      expect(order(store)).toEqual(['fr', 'hre'])
      expect(document.activeElement).toBe(screen.getByRole('listbox', { name: 'Polities' }))
    })

    it('closes when Tab takes the focus out of it', async () => {
      const { user } = mountTwo()
      await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Reaume de France') })
      await user.tab()
      expect(screen.queryByRole('listbox', { name: 'Actions for Reaume de France' })).toBeNull()
    })

    it('closes on a press outside it', async () => {
      const { user } = mountTwo()
      await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Reaume de France') })
      await user.click(document.body)
      expect(screen.queryByRole('listbox', { name: 'Actions for Reaume de France' })).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    // An undo can take the polity away while its menu is open: nothing to arrange, and said.
    it('shows no menu for a polity an undo took away, and says so', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store, user } = mountTwo()
      await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Sacrum Imperium') })
      act(() => {
        store.getState().undo()
      })
      expect(screen.queryByRole('listbox', { name: 'Actions for Sacrum Imperium' })).toBeNull()
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"hre" is gone'))
      expect(document.activeElement).toBe(screen.getByRole('listbox', { name: 'Polities' }))
      // A redo brings the Empire back; its menu does not reopen by itself (ARCH-002).
      act(() => {
        store.getState().redo()
      })
      expect(screen.queryByRole('listbox', { name: 'Actions for Sacrum Imperium' })).toBeNull()
      warn.mockRestore()
    })
  })

  describe('edge cases', () => {
    it('warns, and opens nothing, with shift+F10 and no row to arrange', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { user } = mountTwo()
      screen.getByRole('listbox', { name: 'Polities' }).focus()
      await user.keyboard('{Shift>}{F10}{/Shift}')
      expect(screen.queryAllByRole('listbox')).toHaveLength(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no polity to arrange'))
      warn.mockRestore()
    })
  })
})

/** The open dialogue — the creation one is mounted too, closed. */
const open = () => {
  const dialogue = document.querySelector<HTMLElement>('dialog[open]')
  if (dialogue === null) throw new Error('no open dialogue')
  return within(dialogue)
}

/**
 * A field's current value.
 * @param field - the field
 * @returns its value
 */
const valueOf = (field: HTMLElement): string =>
  field instanceof HTMLInputElement ? field.value : 'not an input'

/** France and its vassal Normandy, France aimed at. */
function mountGroup() {
  const mounted = mount()
  const base = {
    rank: null,
    status: null,
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  }
  act(() => {
    const { createPolity, chooseTarget } = mounted.store.getState()
    createPolity(
      { ...base, id: 'fr', name: 'Reaume de France', suzerain: null },
      { kind: 'c', label: 'c' }
    )
    createPolity(
      { ...base, id: 'nd', name: 'Normandie', suzerain: 'fr' },
      { kind: 'c', label: 'c' }
    )
    chooseTarget('fr')
  })
  return mounted
}

describe('PolitiesPanel — editing a polity (s07)', () => {
  describe('happy path', () => {
    // s07 — "reopen a polity's form and change it … When I validate / Then the change lands".
    it('opens the form filled on a double-click, and OK changes the polity as one step', async () => {
      const { store, user } = mountGroup()
      await user.dblClick(screen.getByText('Reaume de France'))
      const name = open().getByLabelText('Name')
      expect(valueOf(name)).toBe('Reaume de France')
      await user.clear(name)
      await user.type(name, 'Royaume de France')
      await user.click(open().getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.name).toBe('Royaume de France')
      expect(store.getState().undoLabel).toBe('edit Royaume de France')
      expect(store.getState().target).toBe('fr')
    })
  })

  describe('variants', () => {
    it('opens the same form from the row’s menu', async () => {
      const { user } = mountGroup()
      await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Normandie') })
      await user.click(screen.getByRole('option', { name: 'Edit properties…' }))
      expect(valueOf(open().getByLabelText('Name'))).toBe('Normandie')
    })

    // The wiring of the suzerain list: France's own vassal is not offered to it (review QUAL-002).
    it('offers France no suzerain among its own vassals', async () => {
      const { user } = mountGroup()
      await user.dblClick(screen.getByText('Reaume de France'))
      await user.click(open().getByRole('button', { name: /Suzerain/ }))
      const offered = screen.getAllByRole('option').map((option) => option.textContent)
      expect(offered).not.toContain('Normandie')
    })

    it('moves Normandie out of France’s group when its suzerain is cleared', async () => {
      const { store, user } = mountGroup()
      await user.dblClick(screen.getByText('Normandie'))
      await user.click(open().getByRole('button', { name: /Suzerain/ }))
      await user.click(screen.getByRole('option', { name: 'none' }))
      await user.click(open().getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[1]?.suzerain).toBeNull()
    })

    // A11Y-001: the dialogue is unmounted rather than closed, so the focus is handed back by hand.
    it('gives the focus back to the list when the dialogue closes', async () => {
      const { user } = mountGroup()
      await user.dblClick(screen.getByText('Reaume de France'))
      await user.click(open().getByRole('button', { name: 'Cancel' }))
      expect(document.activeElement).toBe(screen.getByRole('listbox', { name: 'Polities' }))
    })

    // s07 — "the same polity, with the same id".
    it('shows the id but does not let it change', async () => {
      const { user } = mountGroup()
      await user.dblClick(screen.getByText('Reaume de France'))
      expect(open().getByLabelText('Id').hasAttribute('readonly')).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('changes nothing on Cancel', async () => {
      const { store, user } = mountGroup()
      await user.dblClick(screen.getByText('Reaume de France'))
      await user.type(open().getByLabelText('Name'), ' bis')
      await user.click(open().getByRole('button', { name: 'Cancel' }))
      expect(store.getState().document.polities[0]?.name).toBe('Reaume de France')
      expect(store.getState().undoLabel).toBe('c')
    })
  })

  describe('unmanaged errors', () => {
    // An undo can take the polity away while its dialogue is open: then there is nothing to edit.
    it('closes the dialogue when an undo takes its polity away', async () => {
      const { store, user } = mountGroup()
      await user.dblClick(screen.getByText('Normandie'))
      act(() => {
        store.getState().undo()
      })
      expect(document.querySelector('dialog[open]')).toBeNull()
    })
  })

  // L5: the suzerain list without loops is suzerainChoices', tested in polityDraft.test.ts.
})

/** France with Normandie holding from it, France aimed at — the trash's subject. */
function mountFranceAimed() {
  const mounted = mount()
  act(() => {
    const { createPolity, chooseTarget } = mounted.store.getState()
    createPolity(polity('fr', 'Reaume de France'), { kind: 'c', label: 'c' })
    createPolity({ ...polity('no', 'Normandie'), suzerain: 'fr' }, { kind: 'c', label: 'c' })
    chooseTarget('fr')
  })
  return mounted
}

/** The confirmation, when it is open. */
const openDialog = () => document.querySelector<HTMLElement>('dialog[open]')

/** The confirmation, which the test expects open. */
function confirmation(): HTMLElement {
  const open = openDialog()
  if (open === null) throw new Error('no dialogue is open')
  return open
}

/** The bar's trash. */
const trash = () => screen.getByRole('button', { name: 'Delete polity' })

describe('PolitiesPanel — the action bar (s07)', () => {
  describe('happy path', () => {
    it('asks before deleting the polity aimed at, then deletes it as one step and says so', async () => {
      const { store, results, user } = mountFranceAimed()
      await user.click(screen.getByRole('button', { name: 'Delete polity' }))
      expect(confirmation().textContent).toContain(
        'Delete Reaume de France? Its 1 vassal becomes sovereign.'
      )
      await user.click(within(confirmation()).getByRole('button', { name: 'Delete' }))
      expect(order(store)).toEqual(['no'])
      expect(store.getState().rows.at(-1)?.label).toBe('delete Reaume de France')
      expect(results.at(-1)).toBe(
        'deleted Reaume de France — 0 rings, 1 vassal now sovereign · ctrl+Z brings it back'
      )
      expect(openDialog()).toBeNull()
      // The trash is disabled by now: the focus goes to the list, not to the body.
      expect(document.activeElement).toBe(screen.getByRole('listbox', { name: 'Polities' }))
    })
  })

  describe('variants', () => {
    it('holds [+] and the trash at the foot, and nothing in the head', () => {
      mount()
      const bar = screen.getByRole('toolbar', { name: 'Polity actions' })
      expect(
        within(bar)
          .getAllByRole('button')
          .map((button) => button.getAttribute('aria-label'))
      ).toEqual(['New polity', 'Delete polity'])
      expect(document.querySelector('.polities__head button')).toBeNull()
    })

    it('disables the trash while no polity is aimed at, and says why', () => {
      mount()
      expect(trash().hasAttribute('disabled')).toBe(true)
      expect(trash().getAttribute('title')).toBe('Select a polity to delete')
    })

    it('enables the trash once a polity is aimed at, and disables it again when undo takes it', () => {
      const { store } = mountFranceAimed()
      expect(trash().hasAttribute('disabled')).toBe(false)
      act(() => {
        store.getState().undo()
        store.getState().undo()
      })
      expect(trash().hasAttribute('disabled')).toBe(true)
    })

    it('gives the polity and its vassal back on undo', async () => {
      const { store, user } = mountFranceAimed()
      await user.click(screen.getByRole('button', { name: 'Delete polity' }))
      await user.click(within(confirmation()).getByRole('button', { name: 'Delete' }))
      act(() => {
        store.getState().undo()
      })
      expect(order(store)).toEqual(['fr', 'no'])
      expect(store.getState().document.polities[1]?.suzerain).toBe('fr')
      expect(trash().hasAttribute('disabled')).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('keeps the polity on Cancel, which holds the focus when the question opens', async () => {
      const { store, user } = mountFranceAimed()
      await user.click(screen.getByRole('button', { name: 'Delete polity' }))
      const cancel = within(confirmation()).getByRole('button', { name: 'Cancel' })
      expect(cancel.hasAttribute('autofocus')).toBe(true)
      await user.click(cancel)
      expect(order(store)).toEqual(['fr', 'no'])
      expect(openDialog()).toBeNull()
      expect(document.activeElement).toBe(screen.getByRole('listbox', { name: 'Polities' }))
    })
  })

  describe('unmanaged errors', () => {
    // An undo can take the polity away while the question is open: nothing is deleted, and it is said.
    it('deletes nothing when an undo took the polity away first, and says so', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { store, results, user } = mountFranceAimed()
      await user.click(screen.getByRole('button', { name: 'Delete polity' }))
      act(() => {
        store.getState().undo()
        store.getState().undo()
      })
      await user.click(within(confirmation()).getByRole('button', { name: 'Delete' }))
      expect(error).toHaveBeenCalledTimes(1)
      expect(results.at(-1)).toBe('nothing deleted: Reaume de France is no longer in the year')
      expect(store.getState().canRedo).toBe(true)
      error.mockRestore()
    })
  })

  // L5: the question's wording for no ring, no vassal, plurals — polityDeletion.test.ts.
})
