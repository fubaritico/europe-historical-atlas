/** A zone with nothing in it yet, carrying its own name so the layout reads. */
export function Placeholder({ name }: { name: string }) {
  // Render
  return <div className="empty-zone">{name}</div>
}
