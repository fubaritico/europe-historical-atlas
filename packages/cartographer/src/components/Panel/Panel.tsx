import { useId } from 'react'

import type { ReactNode, Ref } from 'react'

/** What every panel of the dock is made of. */
export interface PanelProps {
  /** Its name — the tab in its head, and what assistive tech calls the region. */
  title: string
  /**
   * Whether it takes the height the dock has left, its body scrolling inside it — `{Polities}`, the one
   * long list. Without it, the panel is as tall as what it holds.
   */
  fill?: boolean
  /** A bar pinned at its foot, under the body however long — `{Polities}`' actions. */
  foot?: ReactNode
  /** The view the panel holds. */
  children: ReactNode
  /** The panel's element, for a binding that hands the focus back into it. */
  ref?: Ref<HTMLElement>
}

/**
 * A panel of the dock: a head with its name as a tab, a body, and an optional foot — the shell, holding no
 * knowledge of what is inside it (`react-canvas-and-panels`: *"the shell knows nothing, the view takes data,
 * and a thin binding reads the slice"*).
 *
 * **One shell for the four panels, decided by the dev on 2026-10-14.** Each used to build its own head and
 * borrow `{Polities}`' class for it; the two height defects of that day struck only `{Polities}`, the one
 * that took the rest of the dock, because each panel held its height its own way.
 *
 * **Presentational, and it stays so**: it is named by its visible heading (`aria-labelledby`, so the two
 * cannot drift apart), and it holds no state and reaches no storage.
 * @param props - the name, whether it fills the dock, the foot and the view
 * @param props.title - its name, written as the tab in its head and naming the region
 * @param props.fill - whether it takes the height the dock has left, its body scrolling; `false` by default
 * @param props.foot - a bar pinned at its foot, under the body
 * @param props.children - the view the panel holds
 * @param props.ref - the panel's element, for a binding that hands the focus back into it
 * @returns the panel
 */
export function Panel({ title, fill = false, foot, children, ref }: PanelProps) {
  // Ids
  const heading = useId()

  // Render
  return (
    <section ref={ref} className={fill ? 'panel panel--fill' : 'panel'} aria-labelledby={heading}>
      <header className="panel__head">
        <h2 id={heading} className="panel__title">
          {title}
        </h2>
      </header>
      <div className="panel__body">{children}</div>
      {foot}
    </section>
  )
}
