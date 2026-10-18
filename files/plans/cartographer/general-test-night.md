# The general test — the night of 2026-10-14, drawn alone

> The dev, 2026-10-14 ~00:40, before going to sleep: *"tu dessines tout ce que tu peux dessiner, vassaux,
> sous-vassaux, etc. Il faut qu'il y ait tout ce qu'il y a sur la carte pour qu'on ait quelque chose de
> réellement exhaustif. Et que les couleurs soient correctes."* Meeting at 9:30–10:00. If this context is
> compacted, **read this file first** — it is the state of the night.

## How the page is driven (re-do after any reload)

- His Cartographer, `http://localhost:5174/`, tab of the MCP group. **Never start a server.**
- Inject: `page-helpers.js` (skill), **then** `.claude/skills/draw-from-plate/scripts/night-helpers-ext.js` (MessageChannel ticks — a hidden tab
  gets no `requestAnimationFrame` and timers throttled to one per minute; plus `freeStep`, `seq`, `draw`, `back`).
- Zoom: `__d.zoomAt(lon,lat,n)`; work at ≥ 885 % (C ≈ 180+ css px per degree).
- Scripts in scratchpad: `near.py` (neighbour anchors in a plate box, overlay coords = 2×crop), `steps.py`
  (`polity:idx` or plate `x,y` → lon/lat), `idx.py` (ring index nearest a point). Venv: `scratchpad/venv`.
- **Method that works**: compose by hand. Anchor clicks to follow a neighbour (cut a follow into short
  chunks when the shorter way would go round the wrong side); coast with `c` steps (`__d.coast`); free
  points nudged off water. Check with `check.py` + `overlay.py`, look at the overlay.
- A neighbour anchor that came from water (coast, river) is taken by the water click: no follow — click its
  neighbours one by one. Backspace takes back one vertex, not an insertion: use Escape and redraw.
- Colours, ranks and suzerains: **at the end**, written into `registry.json` from the plate colours, after
  the last ‹ctrl+S›, then the page reloaded.

## Backups (local, never committed)

`years/1100.euratlas-16` (start of the night) · `years/1100.euratlas-19` (Zaragoza, Lérida, Tortosa) · `years/1100.euratlas-30` (Iberia and the Maghreb).

## Done tonight

Zaragoza, Lérida, Tortosa, Albarracín, Alpuente, Valencia, Almoravids (Iberia + Africa, cut at the plate's
bottom 32.3°N), Balearics (4 islands), Hammadids (Béjaïa), Zirids (Ifriqiya + Djerba), Banu Hilal, Mzab,
Banu Jami, Banu Sulaym. Then (00:52) Papal States, Capua, Naples, Amalfi, Apulia-Calabria, Sicily (+Malta,
Gozo), Pisa (Corsica, Sardinia, mainland strip OVER the Empire), Venice (OVER the Empire), Provence, Genoa,
Elba (a ring of the Empire), Croatia, Bosnia, Raška, Zachlumia, Ragusa, Travunia, Duklja, Byzantium's Balkan
ring + 26 islands (Crete, Cyprus, Rhodes, Aegean, Ionian). 48 polities, backup `1100.euratlas-48`.
Meta (rank/status/suzerain/colour) applied for the first 30; Italy's 10 written in `meta-1100.json`, not
applied yet — run `apply-meta.py` after a ‹ctrl+S› and reload. Still to add to meta: Croatia…Byzantium.

## Scope — the 138 entities of Euratlas 1100

`files/resources/euratlas/euratlas-1100-entities.json` (gitignored, private): title, rank, `dependsOn` for each
(S sovereign, D dependency, P people). The plates' grey italic names are subdivisions, not entities.
**Euratlas swaps the empires**: entity pages call the HRE "Empire of the Romans" and Byzantium "Roman
Empire"; the plates label the opposite. Plates win for names (our `roman-empire` = HRE, Byzantium drawn as
"Empire of the Romans"); suzerainty follows geography. Normandy is not an entity of 1100 — drawn yesterday
as a vassal of the Franks, flag it.

## Done since 00:52

Anatolia, Levant, Caucasus, Egypt, Mesopotamia: Rûm, Danishmends, Kemakh, Erzurum, Melitene, Gerger, Cilician
Armenia, Edessa, Keysun, Amida, Sason, Moks, Ahlat, Mosul, Antioch, Aleppo, Jerusalem, Damascus, Fatimids,
Baghdad, Kars, Ani, Lori, Syunik, Georgia, Sarir, Derbent, Alania; Byzantium's Anatolian ring (135 anchors
of 12 neighbours, clicked one by one) and its Crimean strip. 76 polities at 01:16, backup `1100.euratlas-76`,
meta applied to all 76.

Plans for the semi-automatic ones are in `files/resources/euratlas/ops/` (fetched by `__d.auto`/`__d.autoC`,
which exist only in the page, not in the helpers file — see the night's log).

## Next

 Levant, Egypt, Caucasus; then the North (Scandinavia, British
Isles, Ireland), the East (Rus, Baltic peoples, steppe), then remaining dependencies (France, HRE, Wales).

## Watch out

- Editing `night-helpers-ext.js` while it is served makes Vite reload the page: inject again.
- An island is closed with `__d.island` (closes on the anchor the first coast click really placed).
- No `rm -rf` without the dev: backups are only added, never removed.

## Defects

Logged in `general-test-defects.md` (`H-46`).

- **Islands are part of the job** (the dev, 00:45): every island of a nation, not only its mainland. Still
  owed: Croatia's Dalmatian islands.
- A coast click that inserts nothing leaves a straight line: use `__d.coastRun` (adaptive bisection).
- River borders shared with a neighbour: `__d.river(p,'Danube',log)` finds the water before clicking.
- A ring cannot be deleted (defect 11): never draw an island without checking its area afterwards.
- **My fault, ~02:00**: a `cd` into the skill's scripts folder in a debug command (then back to the root). The activity log may show a second file for that minute.

## Done 01:16 → 02:05

British Isles (Gwynedd + Anglesey, Powys, Deheubarth, Glamorgan, Chester, Durham, Shrewsbury, Hereford; the eight
Irish kingdoms; Moray, Scotland, Strathclyde, Galloway, Mann and the Isles + 14 Hebridean islands and Man),
Scandinavia (Denmark: Jutland, Scania, 11 islands; Sweden + Gotland, Öland; Norway), the southern Baltic
(Pomeranian Lordships, Rana, Obotrites, Liutizians, Pomerelia), the German marches (Lusatia, Meissen, Merseburg,
Zeitz), Copnic, Anjou, Aquitaine, Blois-Champagne (two rings), Roussillon, Friesland, the Rus (Kiev, Polotsk,
Smolensk, Chernigov + Tmutarakan, Pereyaslav, Novgorod, Rostov-Suzdal, Galicia-Volhynia), the nine Baltic
peoples, the steppe (Pechenegs, Oghuz, Cumans ×2 rings, Vlachs, Khazars). **137 polities at 02:02**, backup
`1100.euratlas-137`, metadata applied to all (peoples: colour automatic — Euratlas draws them as dashed
outlines with no fill).

## Declared gaps (no plate covers them)

- **North of ~60°N**: Norway, Sweden and Novgorod are cut at the plates' top edge; Finns and Chudes not drawn.
- **East of ~45°E**: Mordvins, Burtas, Cheremiss not drawn; Rostov-Suzdal, Baghdad, Khazars cut at the edge.
- **South of 32°N**: the Almoravids cut at the Iberian plate's bottom.
To finish: screenshots of Euratlas 1100's north and east.

## End of the night — 02:20

137 polities, overview rendered from the file: `files/resources/euratlas/overview-1100-night.png` (private). Nothing
committed after `4de406c`; doc changes left uncommitted for the dev (SKILL.md, s99 `H-46`, next.md, known-issues,
drawing-as-claude.md, this file and the defects journal).
