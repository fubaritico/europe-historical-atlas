import type { ReactNode } from 'react'

/** One group of [Check this year]'s list: its heading, what it means, its rows. */
export interface CheckGroupProps {
  /** The heading, its count in it. */
  heading: string
  /** What the group means and what settles it. */
  help: string
  /** The group's own action, beside its heading — « Tout aligner ». */
  action?: ReactNode
  /** The rows, as list items. */
  children: ReactNode
}

/**
 * Render a group — a section named by its heading, so a screen reader can move from one to the next.
 * @param props - the heading, the help, the action and the rows
 * @param props.heading - the heading
 * @param props.help - what the group means
 * @param props.action - the group's own action, if any
 * @param props.children - the rows
 * @returns the group
 */
export function CheckGroup({ heading, help, action, children }: CheckGroupProps) {
  // Render
  return (
    <section className="map-check__group" aria-label={heading}>
      <div className="map-check__heading">
        <h3 className="map-check__title">{heading}</h3>
        {action}
      </div>
      <p className="map-check__help">{help}</p>
      <ul className="map-check__rows">{children}</ul>
    </section>
  )
}
