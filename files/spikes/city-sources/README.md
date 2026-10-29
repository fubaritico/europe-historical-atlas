# city-sources — the cities of a year in three open sources, side by side

**What it probes**: how large each city of a year was, as three historical-demography datasets estimate it — to inform
a city's importance on the map (ATLAS-295, `files/plans/atlas/cities.md`). **Informs, never decides**: the importance
is a judgement with its reasons (decision 4 — *« une ville peut être peu peuplée et être très importante »*); the
population is one piece of evidence.

**The sources** (the dev, 29/10: *« on prend les trois en référence et on fait l'amalgame »*):

| source | covers | licence | brings |
| --- | --- | --- | --- |
| Bosker, Buringh & van Zanden (2013), *From Baghdad to London* — [doi:10.7910/DVN/24747](https://doi.org/10.7910/DVN/24747) | Europe, Middle East, North Africa; 800–1800 by century | CC0 | the roles: capital, bishop, archbishop, Muslim holy city, university |
| Buringh (2021), *European urban population, 700–2000* — [doi:10.17026/DANS-XZY-U62Q](https://doi.org/10.17026/DANS-XZY-U62Q) | Europe, 2 262 places | CC0 | the nature of each estimate (proxied, imputed…) and its basis |
| Reba, Reitsma & Seto (2016), after Chandler (1987) — [figshare 2059494](https://figshare.com/articles/Chandler_Population_Data/2059494) | the world | **CC BY 4.0 — cite it** | a certainty grade |

Bairoch, Batou & Chèvre (1988) is not read directly: its figures belong to its authors, and Bosker et al. start from
it for Europe, updated.

**How**: the three tables are fetched once into `out/` (git-ignored). Records are joined into one city **by name first**
(synonyms included, within 50 km), **then by position** (within 15 km) — position alone let Monreale, 7 km away, take
Palermo's place. **One column a source, never averaged**; `spread` is the largest figure over the smallest, the
sources' concordance — computed, never typed. Bosker's `~` marks a figure exactly between its two neighbouring
centuries: most likely interpolated, not an estimate of its own (Paris 1100 = 65, between 20 and 110).

Run from the repository root, under Node 24:

```
node files/spikes/city-sources/merge.mjs [year]
```

Writes `out/cities-<year>.csv`; prints the sixty largest on stderr.

**Found (29/10, 1100)**: 1 552 cities on the map's extent — Bosker 136, Buringh 1 479, Chandler 54; 16 in all three.
Constantinople 200 thousand in all three; Paris 65~ (Bosker) against 25 (Buringh, from its 230 ha); Palermo 40 / 42 / 90.
Chandler reaches India and Central Asia, on the map's extent but outside its polities.
