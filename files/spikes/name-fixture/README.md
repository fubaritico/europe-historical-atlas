# name-fixture — nine countries of 1100, and the whole year, to judge the names' placement by

**What it probes**: whether a change of the names' construction (ATLAS-301) makes the names better or worse, measured
on the same six shapes every time — the lesson of 28–29/10, when every retouch of a seven-weight score moved names
elsewhere on the map (`files/plans/atlas/country-names.md`, « The gap to the reference »).

- `build-fixture.ts` builds 1100's owner grid as the atlas does (the same regions, bearers and 1200-cell grid), crops
  Byzantium, the Cumans, France, Norway, Hungary, the Holy Roman Empire, England, Novgorod (the sovereigns' level) and Brittany (its vassals') with their
  neighbours, and writes them run-length encoded into `packages/core/src/pipeline/testing/names1100.json`. Rerun it
  when 1100's borders change; the core test `namePlacement.fixture.test.ts` reads it.
- `year.ts` places every name of 1100 at every level as the atlas does, writes them to a JSON file, and compares two
  such files (`--diff`): what a change does to the hundred countries no test looks at.
- `measure.ts` places each country's name with the core defaults and prints its size, cover, turn, lines and places.

Run from the repository root, under Node 24:

```
packages/core/node_modules/.bin/tsx files/spikes/name-fixture/build-fixture.ts
packages/core/node_modules/.bin/tsx files/spikes/name-fixture/measure.ts
packages/core/node_modules/.bin/tsx files/spikes/name-fixture/year.ts <out.json>
packages/core/node_modules/.bin/tsx files/spikes/name-fixture/year.ts --diff <before.json> <after.json>
```

**Concluded (29/10)**: the single construction names Byzantium once instead of five times, covers 0.68 to 0.87 of each
country's length on one line, and names Norway on three realms instead of 55 islets — the table is in the plan.
