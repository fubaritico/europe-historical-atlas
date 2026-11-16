import type { ChainReading } from '../utils/readVassalChain'
import type { Say } from '../utils/say'

/**
 * One line « Vassal de » per link of a reading already entered (CMS-422) — entered once, it shows on every city under
 * that title.
 * @param props - the reading and the translator
 * @param props.reading - the reading
 * @param props.say - the translator
 * @returns its lines
 */
export function ChainLinks({ reading, say }: { reading: ChainReading; say: Say }) {
  return (
    <ul className="city-sheet__chain-links">
      {reading.titles.slice(1).map((suzerain) => (
        <li key={String(suzerain.id)} className="city-sheet__chain-link">
          <span className="city-sheet__label">{say('vassalOf')}</span>
          <span className="city-sheet__chain-suzerain">{suzerain.name}</span>
        </li>
      ))}
    </ul>
  )
}
