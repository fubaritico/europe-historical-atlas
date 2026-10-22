import type { RefObject } from 'react'

/**
 * The status bar's three zones, each written imperatively through its ref.
 *
 * No `aria-live` on the row, and that is the accessibility decision rather than an omission: the action and
 * the position change on every pointer sample, so announcing them would make a screen reader unusable — the
 * very failure `role="status"` exists to avoid elsewhere. A keyboard reader gets nothing from them today,
 * which is honest; what will serve them is the anchor list of step 5, not a firehose.
 * @param props - the three zones' refs
 * @param props.action - what is being done, and to whom
 * @param props.result - what a gesture did
 * @param props.position - where the pointer is
 * @param props.feature - what is under it — a border, or a polity
 * @returns the row
 */
export function StatusRow({
  action,
  result,
  position,
  feature,
}: {
  action: RefObject<HTMLElement | null>
  result: RefObject<HTMLElement | null>
  position: RefObject<HTMLElement | null>
  feature: RefObject<HTMLElement | null>
}) {
  // Render
  return (
    <p className="shell__status">
      <span className="shell__action" ref={action} />
      {/* The one zone that speaks: a result is rare and discrete, unlike the action and the position,
          which change on every pointer sample and would drown a screen reader (A11Y-001). */}
      <span className="shell__result" ref={result} role="status" />
      <span className="shell__position" ref={position} />
      {/* What is under the pointer, beside where it is — the mockup's "Holy Roman Empire · empire". */}
      <span className="shell__feature" ref={feature} />
    </p>
  )
}
