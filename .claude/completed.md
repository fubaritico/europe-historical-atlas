## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-09-17 (nuit) — Le calcul dans un worker, l'écran d'attente, SEC-001, le raster 4×

Une seule plage : **23:55 → 01:55, 2 h 00, 277 actions, 14 commits** `0027343`..`4f14b69`.
**351 → 482 tests**, gate verte à chaque pas, build de production vérifié à chaque étape.

- **Le pipeline politique tourne dans un worker** — le gel à 70 % traité à sa cause : la cuisson de
  texture n'était pas *découpable*, elle devait quitter le thread. **Deux ports et non un**, contre le
  plan consigné : la cuisson a cinq appelants et le politique n'en est qu'un ; un port unique aurait
  laissé une seconde cuisson pour les quatre autres. Bénéfice non prévu — **les curseurs de texture ont
  cessé de geler l'onglet**.
- **L'extraction du compositeur était nécessaire, pas cosmétique.** Une frontière de worker est aussi une
  frontière de *bundle* : `composeTerrainRgba` était pure mais sous un en-tête important `three`. Nouvelle
  couche `pipeline/`, dont la règle ESLint **refuse `three`** — vérifiée en la faisant échouer exprès.
  Chunk worker : **12,6 ko, zéro three.js**, contre 648 ko côté principal.
- **Démarrage en deux temps voulus** au lieu de trois subis. La grille marron était **ma régression** :
  `rebuildTexture` devenu asynchrone, `rebuildRelief` ne l'attendait plus et le maillage naissait sans
  carte. Les deux autres étapes étaient du travail jeté — trois cuissons de 1,5 M pixels, deux écrasées.
- **Écran d'attente** (`ui/splash`) — silhouette d'Europe **tracée depuis notre propre masque** par un
  générateur de spike, jamais dessinée à la main. Relue avant livraison en **redessinant le chemin émis**
  en ASCII. Cadrage trouvé au troisième essai (Mercator étire le nord : 300×384, puis 454, puis 299).
  `HISTORICΛL ΛTLΛS`, nom accessible en clair. +4,3 ko gzippés.
- **SEC-001 fermé, ses deux moitiés** (chapitre 07). Taxonomie porteuse — `transport | schema |
  consistency | semantic` en **champs**, pas en chaîne — gardes écrites à la main, `boundsMatch` comme
  contrôle sémantique inter-assets, politique de mode dégradé **déclarée** (le relief est la carte),
  `role="alert"` bloquant / `role="status"` dégradé.
- **Raster politique à 4× par défaut** — 1,9 km au lieu de 3,8. Écarté jusque-là pour 825 ms de blocage,
  qui ne sont plus payés par le thread principal. Coût mesuré : ~136 Mo de pic. Le piège des unités en
  cellules est **tenu par construction** — la multiplication se fait une fois, dans le calcul.
- **Chemin ring supprimé** avec son toggle, et avec lui l'aller-retour du raster : **45 Mo par changement
  d'année** que plus rien ne lisait.
- **Revue à 4 dimensions** : sécurité et accessibilité vierges ; QUAL-101 (high) réel et de moi — j'avais
  donné une garde de fraîcheur à `rebuildTexture` et **pas** à `rebuildPolitical`, que les palettes
  déclenchent en continu. Corrigé par `utils/latestOnly`, avec la subtilité qui la rendait vicieuse :
  garder la seule écriture d'état ne suffit pas.
- **Établi sur le DS voisin** : `fubaritico-ds/packages/variants` rend des **chaînes de classes BEM** et
  `packages/styles` livre le CSS — consommable en TS vanille, sans React. Le blocage est la publication.

### 2026-09-16 (midi + soirée) — Frontières dérivées du raster, types de frontières, doctrine de revue, overlay

18 commits `df3390d`..`b8eeaa8`, **245 → 351 tests**, gate verte à chaque pas. Deux plages : une à midi
(1 commit), une de **21:14 à 23:53 — 2 h 40, 17 commits**, coupure de 8 h 28 entre les deux. *Durées
tirées de git : le journal d'activité a été installé en fin de session et ne la couvre pas.*

- **Cause racine des frontières interrompues** (`df3390d`) — ni la taille des polities, ni le relief, ni
  le diagnostic consigné la veille. `separatesRegions` sondait **2 cellules** de part et d'autre d'un ring
  pendant que `snapToCoast` faisait croître chaque revendication de **5 à 12**. Le vrai défaut : **deux
  sources de vérité pour un seul objet** — aplats venant du raster, traits venant des rings.
- **`extractRegionBorders`** — arêtes partagées entre cellules d'indices différents, chaînées sur un
  **treillis d'entiers doublés** (les coins coïncident exactement, aucun epsilon), puis lissées par
  Chaikin. **Sans trou par construction.** Mesuré à 1700 : 6 960 segments bruts, 28 329 après deux tours,
  7–30 ms, contre ~42 661 sommets pour l'ancien chemin.
- **Groupées par couple de polities et rendues en chaînes** (`61fbd52`) — pas en segments : un pointillé
  doit courir *le long* d'une frontière, un décalage parallèle a besoin des voisins de chaque sommet.
- **Types de frontière** — `data/borderStyles` (`solid | dashed | double`), table éditoriale à côté des
  couleurs. Piège attrapé sur données réelles : `Poland-Lithuania` satisfait **les deux moitiés** de sa
  propre règle, donc deux fragments homonymes auraient été séparés d'un pointillé absurde.
- **`scene/composedLineLayer`** — rôles `edge`/`inlay`/`pattern`/`frontier`, poignée unique (un `Group`)
  au lieu d'une liste itérée au redimensionnement, à la frame et au teardown.
- **Coupures en montagne diagnostiquées** (`7d96cb0`) — le relief est **triangulé** alors que les points
  drapés sont posés par interpolation **bilinéaire** entre les mêmes sommets : sur une crête la surface
  passe au-dessus de la ligne et le test de profondeur la mange. D'où `depthTest` désactivé.
- **Frontière contre les terres non revendiquées** — `isLand` injecté. Éteinte à tort après une
  régression côtière, **rallumée après mesure** : 3 429 points inland contre 109 côtiers, 97 % inland.
- **Liaison au zoom** — largeur, opacité, apparition de l'inlay, et une rampe propre au trait à motif.
  **Le brun est la constante, le crème le raffinement**, ce qui résout au passage le finding de contraste
  (crème seul sur l'or espagnol ≈ 1,6:1 ; brun ≈ 4,9:1) sans toucher à la palette.
- **Résolution du raster politique réglable, défaut 2×** (`bafb315`) — marche 7,6 → 3,8 km. Le seul levier
  sans contrepartie : aplats et traits sortent de la même grille. Simplifier la ligne seule a été essayé
  **et rejeté à l'œil** — elle quitte le pays qu'elle borde. Tableau de coûts mesuré dans known-issues.
- **Doctrine de revue reconstruite depuis ses propres échecs** (`db2f304`) — rayon d'explosion, sévérités
  ancrées, constat séparé du remède avec `what_breaks_if_fixed_naively`, résultat nul crédible. Plus la
  règle qui manquait : **`bootstrap()` est le puits de modularité** de cette base (ARCH-012).
- **Overlay de progression + pipeline séquencé** (`b8eeaa8`) — nouvelle couche `src/ui` avec sa frontière
  ESLint, accessible dès la première ligne. Un drapeau levé avant un bloc synchrone est un drapeau que
  personne ne voit.
- **OpenHistoricalMap est CC0** (et non ODbL), exploitable dès ~1700 — mesuré en couverture de surface,
  pas en nombre de polities. Chapitres de roadmap **06** (outils de contribution) et **07** (robustesse)
  écrits.

### 2026-09-16 — Sense of time: activity log + work spans (ported from fubaritico-ds)

Tooling only — **no project code touched**. Ported so this repo gets the same temporal awareness.
Done from the fubaritico-ds session; the four changed `.claude/` files below are **uncommitted**.

- **Why** — sessions here are weeks apart. Without this, the agent has no idea whether you are
  continuing yesterday's work or coming back after two months, so it reopens everything from scratch.
- **Hooks** (in the gitignored `.claude/settings.local.json`, existing hooks untouched): `SessionStart`
  injects a temporal bearing straight into the agent's context **before it speaks**; `SessionEnd`,
  plus `PostToolUse` on `Edit|Write` and `Bash` (all async), feed the log.
- **Log** — `files/session-log.jsonl`, one JSON line per event (`files/` is already gitignored here).
  Local to this machine, never committed. Script is global: `~/.claude/hooks/session-log.sh`.
- **Temporal model** — the technical session (process start/end) is logged but **measures nothing**
  (a terminal left open overnight would read as 14 h of work). Real figures come from **spans**
  (actions < 90 min apart) grouped into **chantiers** (spans < 48 h apart, so a chantier can run
  across several days). Both are derived from action timestamps.
- **Skills** — `/start-session` (v1.1) situates itself in time first and opens differently for a
  continuation vs a long interruption; `/end-session` (v1.1) must write **real** durations into this
  file instead of guessing; new **`/timeline`** answers "how long / since when / how much time on X",
  and falls back to `git log` for history predating the hooks.
- **Caveat** — the log only knows what happened since tonight. Anything earlier lives in git only.

### 2026-09-12 — Genesis: fubaritico-ds → europe-map, Phase 0 + Milestone 1.1

Repurposed the repo from the old `fubaritico-ds` design system into a **3D historical atlas of Europe**
(TypeScript + three.js + Vite). Commits `9dea60e`..`1580921` on `master`. All under a full quality gate.

- **`.claude/` cleanup** — rewrote CLAUDE.md + rules for the three.js project; archived DS/React/Stencil
  skills + agents (and stale `financial-app`/micro-frontend leftovers) to `files/claude-archive/`;
  retooled `/review` to 4 dimensions. `grep fubaritico` → only intentional reminders remain.
- **Quality tooling** (`9dea60e`) — ESLint 9 flat (typed, no React) + Prettier + commitlint + husky
  (lint-staged + type-check + test) + lint-staged. Pinned ESLint 9 / TS 5.7 / tseslint 8.
- **Plans** — roadmap split into `files/plans/roadmap/` chapters; spikes cataloged in `files/spikes/`.
- **DEM spike** (`files/spikes/fetch-dem`) — georeferenced heightmap from AWS Terrarium tiles (no key,
  Web Mercator); emits Int16-metres `.bin` + `.json`.
- **Phase 0.1** (`0934783`) — Vite + three.js bootstrap (renderer/scene/camera/loop/resize, Stats + lil-gui).
  Vendored three source via `opensrc`; fixed `Clock`→`Timer`.
- **Phase 0.2** (`a2d67aa`) — camera viewpoint persisted across reload/HMR (`CameraStateStore`,
  sessionStorage, restore-before-first-render, HMR self-accept + teardown). Vitest + jsdom wired.
- **Milestone 1.1** (`1580921`) — Europe relief from the DEM: `heightmap` port + `reliefMesh` (CPU
  displacement). Height **easing** (plains 1:1, peaks eased toward a target — sharp, NOT blur) → game-map
  look. lil-gui defaults: exag 1.0, ceiling 575, peak-target 1900, smoothing 0. 29 tests.

### 2026-09-13 — Euratlas data decision, import boundaries, DEM widening, Milestone 1.3 (grand-strategy camera)

Big camera session. Commits `3dea0d6`..`7d1b20f` on `master`, full gate (type-check/lint/test/husky), **63 tests**.

- **Euratlas research + decision** (memory [[euratlas-data-and-licensing]]) — the local
  `files/resources/euratlas` samples ARE real vector shapefiles (21 centuries) but geographically cropped
  to the Alps; the Simple License forbids redistributing the vectors / reconstituting an atlas → for the
  published portfolio demo, M2 geometry = free **historical-basemaps** (CC-BY), Euratlas kept as a
  **private toponymy reference** (facts, de minimis, never the geometry). No regen needed.
- **Import boundaries** (`3dea0d6`) — ESLint `no-restricted-imports` per layer (data leaf; scene→data;
  camera independent; controls→camera; main root). Modularity enforced without splitting packages.
- **DEM widened** (`be5ebf2`) — regenerated to a Total-War **hors-champ frame** (bbox W−45/S11/E78.75/N76.84,
  1280×1164, ~3 MB); no code change (data-driven mesh). See `next.md` for the regen command.
- **EU4 map camera** (`b2142ad`, `9a32fa6`) — new pluggable `controls/mapControls` replacing OrbitControls:
  arrow pan, wheel zoom, yaw locked north, zoom-linked distance + tilt. **Frustum-aware clamp**: the target
  is bounded so the frustum's ground footprint (raycast of the 4 corners onto `y=0`) stays within a world
  `extent` → pannable area grows when zoomed in, re-centres when out, **adapts to resize**. **Drag-pan +
  edge-scroll**. **Inertia** = velocity + ease-out decay (snappy start, gliding release), factored into
  exported `easeOutDecay`/`driveOrGlide`. Debug overlay `scene/debugRect` (extent + live footprint).
  Persistence `{target, zoom}` on `europe-map:map-camera`.
- **Zoom-linked exaggeration** (`7d1b20f`) — relief flattens as you zoom in (× `exaggZoomIn`, default 0.5),
  cheap `scale.y` transform (no geometry rebuild).
- Multi-agent `/review` each step. A11y deferred to the **M2 HTML-overlay backlog** (window-scoped key
  capture, canvas role/semantics) — keyboard zoom (`+/-/PageUp/Down`), `prefers-reduced-motion`, and
  ctrl+wheel passthrough are already handled.

### 2026-09-15 — Milestone 1.2 (parchment terrain + drawn coastline), dev-panel extraction, portolan decor

Long render-craft session. Commits `50485c0`..`fb50948` on `master`, full gate each step, **120 tests**.
See memory [[portolan-decor-and-line-rendering]] + [[next-render-backlog]].

- **M1.2 terrain** (`50485c0`) — `scene/terrainTexture`: pure compositor (parchment × hypsometric tint ×
  DEM hillshade × **vellum fBm grain**) baked into a `DataTexture` on an **unlit** `MeshBasicMaterial`
  (painted "old map" look, camera-independent). Scene lights removed. `data/coastlineSource`
  (marching-squares 0 m contour → normalized `(u,v)` segments). Coastline drawn as **draped 3D lines** with
  light jitter + overdraw + zoom-linked opacity. `utils/hash` shared. Dev-tuned defaults baked via a
  `⤓ log ALL settings` button.
- **Coastline reversal** (hard-won) — first baked the shoreline INTO the texture; too blurry
  (DataTexture 1280px + LinearFilter resolution ceiling) → reverted to 3D lines. Don't re-try baked lines.
- **Dev-panel extraction** (`44cf533`) — all lil-gui wiring → `src/devPanel.ts` (`createDevPanel(deps)`,
  root-level because it imports controls+scene types the `scene/` boundary forbids). Added
  **`↺ reset to defaults`** (snapshots defaults at build, one rebuild per system — not lil-gui's
  per-controller `reset()` storm).
- **Portolan decor** (`fb50948`) — generalized `coastlineLayer` → **`scene/lineLayer`** (shared uv→3D
  lines). **`scene/rhumbNetwork`**: multi-centre portolan web, each line **walked over the DEM, kept only
  over water** (stops at the coast). **Compass rose D** (`scene/compassRose` + pure `scene/compassRoseSvg`,
  hex-validated) as an SVG→texture quad on the Atlantic, **portolan colour code** (principal ink,
  half-winds green, quarter-winds red). `utils/math` (clamp/lerp) + `disposeHandle` de-dup. Multi-agent
  `/review`: fixed SEC/ARCH/QUAL; **deferred** QUAL-007 (split `createDevPanel` per-folder, extract
  `scene/portolanDecor.ts`).

### 2026-09-16 — Rivers, land mask, fat lines, declarative tunables, political overlay (WIP)

Long session, **120 → 245 tests**, commits `8783364`..`beb24fc` on `master`, full gate each step.

- **Declarative tunables** (`4b9c95a`, `81f32e7`) — `utils/controlSpec.ts` + `devParams.ts`: every option's
  range/step/label declared beside its default, mapped over `keyof T` so an undescribed option fails
  type-check (**verified**: it raises two errors). `devPanel` renders the declaration; `main.ts` seeds
  from the defaults. Tests assert defaults sit inside their own slider and groups cover the table.
  Texture folder split into 7 numbered sub-folders mirroring the compositing order.
- **Fat lines** (`8783364`) — `LineBasicMaterial.linewidth` is pinned to 1 px by WebGL, so any controlled
  width needs `LineSegments2` + `LineMaterial`. Chosen by the caller _asking_ for a width (a `> 1`
  threshold silently ignored sub-pixel values). `setOpacity`/`setColor`/`setResolution` replace callers
  reaching into `object.material`.
- **Rivers** (`f6e3921`) — Natural Earth 10m, 591 polylines / 537 KB, simplified to 500 m (just under a
  screen pixel at max zoom). One layer per `scalerank`; reveal + width interpolate across ranks, opacity
  only, never a geometry rebuild. `extendRiversToSea` bridges mouths (NE stops at the estuary head);
  only _free_ endpoints extend — a tip another polyline passes is a confluence (129 → 96 extensions).
- **Land mask** (`462bed2`, `d6dead5`) — **the session's key correction**: a DEM answers "how high", not
  "wet or dry". Measured: connectivity flood-fill does _not_ rescue the Netherlands (dikes are narrower
  than a cell) and turns the Caspian/Dead Sea into plains. Asset = `ne_10m_land` minus `ne_10m_lakes`
  (the land layer carves no lakes), baked at 4× the DEM, 2.9 MB raw / 152 KB gzipped. 16/16 spot checks.
  Killed `coastCoverage` + `gradientAt`: the mask's bilinear coverage supersedes them.
- **Draping** (`8c584f4`, `50731ac`) — `reliefWorldY` exported from `reliefMesh`; overlays sample the
  _mesh's_ vertex grid (512 segments vs a 1280 DEM), else a river read at its true elevation sits below
  the drawn valley floor. Every draped layer must track `relief.scale.y` or it floats by the
  exaggeration ratio — invisible on a plain, glaring on a crest.
- **Political overlay, WIP** (`beb24fc`) — `historical-basemaps`, 20 centuries, **GPL-3.0 so git-ignored**.
  Rings rasterised in-browser into an index grid; tint is a terrain-bake layer between ground colour and
  hillshade. Claims grow over land the schematic outlines missed; borders keep only stretches separating
  two polities. Colours pinned per power by name pattern, rest from an editable palette, no two
  neighbours alike.
