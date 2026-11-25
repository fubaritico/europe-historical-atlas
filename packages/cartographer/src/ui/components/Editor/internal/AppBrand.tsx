/**
 * The middle of the top bar (CARTO-555): the application's name, then the map open — none on the start screen
 * (CARTO-536). The mark stays at the left end, with the menus.
 * @param props - the name and the map
 * @param props.name - the application's name
 * @param props.map - the map open's name, or `null` when none is
 * @returns the name
 */
export function AppBrand({ name, map }: { name: string; map: string | null }) {
  // Render
  return (
    <div className="app-brand">
      <span className="app-brand__name">{name}</span>
      {map === null ? null : (
        <>
          <span className="app-brand__sep" aria-hidden="true">
            ·
          </span>
          <span className="app-brand__year">{map}</span>
        </>
      )}
    </div>
  )
}
