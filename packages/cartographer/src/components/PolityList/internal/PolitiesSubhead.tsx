/**
 * The list's subhead — `design/01`'s *"Drawn at 1100"* and the count.
 * @param props - the year and how many polities it holds
 * @param props.year - the year being drawn
 * @param props.count - how many polities the year holds
 * @returns the subhead
 */
export function PolitiesSubhead({ year, count }: { year: number; count: number }) {
  // Render
  return (
    <div className="polities__subhead">
      <span>Drawn at {year}</span>
      <span className="polities__count">{count}</span>
    </div>
  )
}
