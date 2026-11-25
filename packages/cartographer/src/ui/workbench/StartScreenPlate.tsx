import { StartScreen } from '../components/StartScreen'

/** The maps the plate lists: three maps and an automatic save, which the start screen leaves to Open…. */
const START_MAPS = {
  listDatedMaps: () =>
    Promise.resolve([
      { name: '1100', changedAt: new Date(2026, 10, 25, 21, 41).getTime() },
      {
        name: '1100.autosave.2026-11-25T21-05-12',
        changedAt: new Date(2026, 10, 25, 21, 50).getTime(),
      },
      { name: '1200', changedAt: new Date(2026, 10, 24, 9, 5).getTime() },
      { name: '1300', changedAt: new Date(2026, 10, 18, 16, 30).getTime() },
    ]),
}

/**
 * The plate's gestures, inert: it shows the screen, it opens nothing.
 * @returns nothing
 */
const inert = (): void => undefined

/**
 * The start screen (CARTO-536) on literal maps, in a cell of the map's height — its glyphs and its layout judged
 * without signing in to the CMS.
 * @returns the plate
 */
export function StartScreenPlate() {
  // Render
  return (
    <div className="workbench__start">
      <StartScreen
        maps={START_MAPS}
        now={() => new Date(2026, 10, 25, 22, 0)}
        onNewMap={inert}
        onOpen={inert}
        onOpenMap={inert}
      />
    </div>
  )
}
