/**
 * A zone with nothing in it yet, carrying its own name so the layout reads.
 * @param props - the zone's name
 * @param props.name - what the zone is called, written inside it — *"app bar"*, *"panels"*
 * @returns the empty zone, showing its name
 */
export function Placeholder({ name }: { name: string }) {
  // Render
  return <div className="empty-zone">{name}</div>
}
