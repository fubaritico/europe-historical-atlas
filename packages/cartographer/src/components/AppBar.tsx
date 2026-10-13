import { BrandMark } from '../icons/brandMark'

/**
 * The top bar's content: the mark and the application's name (the dev, 2026-10-13).
 *
 * A view, with nothing of the store in it. The file, its modified mark and the global actions that
 * `Shell`'s `appbar` slot also announces come with step 5, beside this.
 */

/** What the bar shows. */
export interface AppBarProps {
  /** The application's name, written beside the mark. */
  name: string
}

/**
 * Render the top bar.
 * @param props - what to show
 * @param props.name - the application's name
 * @returns the mark and the name
 */
export function AppBar({ name }: AppBarProps) {
  // Render
  return (
    <div className="app-brand">
      <BrandMark />
      <span className="app-brand__name">{name}</span>
    </div>
  )
}
