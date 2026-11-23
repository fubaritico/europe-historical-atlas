import { useMemo, useSyncExternalStore } from 'react'

import type { ReactNode } from 'react'

/** What the stand-in's drawer is handed — the props of Payload's `DocumentDrawer` it reads. */
interface DrawerProps {
  /** What the new record's form opens with. */
  readonly initialData?: Record<string, unknown>
  /** Called once a record is saved in the drawer. */
  readonly onSave?: (save: { doc: { id: number | string }; operation: string }) => void
}

/** The props of Payload's drawer toggler the stand-in reads. */
interface TogglerProps {
  /** The button's content. */
  readonly children?: ReactNode
  /** The button's accessible name. */
  readonly 'aria-label'?: string
  /** Called on a click, before the drawer opens. */
  readonly onClick?: () => void
}

/** The id the stand-in's drawer gives the record « saved » in it. */
export const CREATED_IN_DRAWER = 42

/**
 * One drawer and its toggler, sharing whether the drawer is open. Made once per hook call and kept: Payload's hook
 * keeps its components too, and a component remade at each render would replace the button between a press and its
 * click.
 * @returns the drawer, its toggler, and the store of whether it is open
 */
function makeDrawer() {
  let open = false
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  const isOpen = () => open
  const Drawer = ({ initialData, onSave }: DrawerProps) =>
    useSyncExternalStore(subscribe, isOpen) ? (
      <div role="dialog" aria-label="Tiroir" data-initial={JSON.stringify(initialData ?? null)}>
        <button
          type="button"
          onClick={() => onSave?.({ doc: { id: CREATED_IN_DRAWER }, operation: 'create' })}
        >
          Créer
        </button>
        <button
          type="button"
          onClick={() => onSave?.({ doc: { id: CREATED_IN_DRAWER }, operation: 'update' })}
        >
          Mettre à jour
        </button>
      </div>
    ) : null
  const Toggler = ({ children, 'aria-label': name, onClick }: TogglerProps) => (
    <button
      type="button"
      aria-label={name}
      onClick={() => {
        onClick?.()
        open = true
        listeners.forEach((listener) => {
          listener()
        })
      }}
    >
      {children}
    </button>
  )
  return { Drawer, Toggler, subscribe, isOpen }
}

/**
 * Payload's `useDocumentDrawer` for a test in jsdom, which cannot run the real one (it renders the document on the
 * server). The toggler is a button that opens the drawer; the drawer, once open, is a dialog that shows the data it
 * was handed (`data-initial`, JSON) and two buttons — « Créer » saves a new record ({@link CREATED_IN_DRAWER}),
 * « Mettre à jour » saves the same record again — each calling its `onSave` as Payload's would.
 * Mocked in by `vi.mock('@payloadcms/ui', …)` in the city sheet's tests.
 * @returns the drawer, its toggler, and its context as Payload's hook returns them
 */
export function useDocumentDrawerStandIn() {
  const { Drawer, Toggler, subscribe, isOpen } = useMemo(makeDrawer, [])
  const isDrawerOpen = useSyncExternalStore(subscribe, isOpen)
  return [Drawer, Toggler, { isDrawerOpen }] as const
}
