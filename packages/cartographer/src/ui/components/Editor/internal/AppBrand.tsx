import { BrandMark } from '../../../icons/brandMark'

/**
 * The top bar's left end: the mark, the application's name, and the map open — none on the start screen (CARTO-536).
 * @param props - the name and the map
 * @param props.name - the application's name
 * @param props.map - the map open's name, or `null` when none is
 * @returns the brand
 */
export function AppBrand({ name, map }: { name: string; map: string | null }) {
  // Render
  return (
    <div className="app-brand">
      <BrandMark />
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
