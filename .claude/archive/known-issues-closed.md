# Known issues — closed

Entries closed and moved out of `known-issues.md`. Kept for the lessons they carry.

- **Les années enregistrées en local ne sont jamais commitées, et `years/index.json` est en `skip-worktree`
  sur la machine du dev — clos le 16/10** (1100 publié, `skip-worktree` levé ; archivé le 21/10). Sa décision, 12/10 : *« ils sont pour nous pour travailler »* — retrouver ses
  tracés, déboguer les outils, maîtriser le format. Les dossiers `packages/atlas/public/years/<année>/` sont
  dans `.gitignore`. Le manifeste, lui, est **suivi** (commité avec `"years": []`, l'atlas en ligne le lit) et
  une sauvegarde y ajoute l'année : d'où `git update-index --skip-worktree packages/atlas/public/years/index.json`,
  pour que git ignore cette modification locale. **Trois conséquences** : (1) `git status` ne montre plus ce
  fichier, même modifié — `git ls-files -v` l'affiche avec un `S` ; (2) **en local, l'atlas lit l'année
  dessinée** pour 1100 au lieu du payload GPL, puisque le manifeste local la liste — voulu, c'est ce qui
  permet de vérifier le format ; (3) le jour où une année doit vraiment être publiée, il faut d'abord
  `git update-index --no-skip-worktree` sur ce fichier, sinon il ne partira pas. Réglage **par clone** :
  une autre machine ne l'a pas. **Sévérité : à savoir.**
- **Le contour de l'étendue et les frontières dérivées coûtaient des secondes sur la Norvège — réglé le 17/10** (CARTO-240).
  Ses 16 235 points (fjords, Islande, Groenland) faisaient marcher chaque test « ce point est-il dans ce pays ? » sur
  tous ses sommets : 4,6 s pour l'étendue, 4,8 s pour les frontières, à chaque geste. Remède : `indexRings` /
  `pointInIndexedRings` (`core/geo/pointInRing.ts`), les arêtes rangées par bandes de latitude, construit une fois par
  calcul — **55 ms et 118 ms**, sortie identique à l'octet sur les 137 pays (vérifié contre l'ancien code). L'index
  spatial que cette entrée annonçait le 15/10 est celui-là. **À surveiller** : le seul calcul encore en `n` par
  geste est la sérialisation du brouillon (~20 ms). **Fermé le 17/10** : testé par le dev (« Bravo, félicitations, c'est parfait »), commit `218910a`.
- **Les fleuves sont vérifiés contre la boîte du relief dans les deux applications — fermé le 12/10.**
  Le Cartographe depuis le 11/10 (`loadVectorLayers`), l'atlas depuis le 12/10 (`settleRivers`, quand
  le second des deux arrive) : des fleuves recadrés autrement sont refusés en `semantic`, la carte vient
  sans eux et le dit — la réponse déjà prise pour le masque.
- ~~**`CLAUDE.md` dit « No React, no monorepo, no design system »**~~ — **CORRIGÉ 2026-10-01** (`7f75624`),
  au moment où React est entré dans le dépôt. `rules/architecture.md` et `rules/troubleshooting.md` ont été
  corrigés dans le même commit : le premier affirmait encore « No Turbo and no Lerna », le second disait
  « Plain three.js (no React/R3F) » **une section au-dessus** de l'édition Turbo qui venait d'y être faite.
  **La leçon de procédure** : la revue a trouvé que `CLAUDE.md` et `architecture.md` affirmaient que `core`
  est interdit de React **par ESLint** alors que la garde ne connaissait que `three`. Écrire la doc avant la
  garde produit la pire des deux situations — **une promesse qu'aucun outil ne tient.** Ne jamais décrire une
  garde au présent avant de l'avoir cassée exprès.
- ~~**Deux défauts de `@fubaritico/react@0.2.0`**~~ — **TRAITÉS le 09/10**, par la `0.2.1` et un réglage.
  1. **Les imports sans `.js` : corrigés côté DS** (`0.2.1`, 636 chemins complétés, et leur build charge
     désormais les 33 points d'entrée sous Node). Le contournement `server.deps.inline` est retiré, et
     `Button` se charge sous Node pur.
  2. **Le registre GitHub perd `peerDependenciesMeta`**, et c'est une limite du registre, confirmée par
     le DS : republier n'y peut rien. **Remède chez nous : `autoInstallPeers: false` dans
     `pnpm-workspace.yaml`** — pas dans `.npmrc`, qui est ignoré par git et n'atteindrait pas la CI.
     Next et React Router sont sortis du lockfile.
  **Ce que ce réglage a coûté, et c'est le piège à retenir** : deux peers que pnpm installait tout seul
  ont disparu du lockfile avec eux — `@testing-library/dom` (exigé par `@testing-library/react`) et
  `@types/node` (exigé par le chargeur de config de commitlint). **En local rien ne cassait**, ils
  restaient sur le disque ; une install neuve en CI aurait fait tomber tous les tests de composants.
  Déclarés explicitement, au catalogue. **Tout peer exigé doit désormais être déclaré par le paquet qui
  en a besoin** — un nouvel avertissement « missing peer » à l'install est à traiter, pas à ignorer.
  **Plus tard, côté DS** : les adaptateurs Next et React Router sortiront de `@fubaritico/react`, ou les
  paquets passeront sur npmjs. **Sévérité : à savoir.**
- ~~**Zustand détecte un changement par identité de référence, et notre document est muté en place.**~~ —
  **FERMÉ 2026-10-05** par `packages/cartographer/src/state/editionSlice.ts`, et l'entrée ne connaissait que
  **la moitié** du problème. La moitié écrite : le document est muté en place (`yearDocument.ts`, « Mutable on
  purpose »), donc après une édition l'objet a la même référence et un sélecteur `s => s.document` ne voit
  rien. Remède, le compteur de version — en place, incrémenté par **chaque** action.
  **La moitié qui manquait, et elle casse dans l'autre sens** : le côté lecture de `History` est fait de
  **getters sur une cellule mutable**, et `rows`/`markers` appellent `.map()` à chaque lecture — donc un
  tableau **neuf** à chaque fois. Un sélecteur dessus fait que `getSnapshot` rend une valeur neuve à chaque
  rendu, ce que React refuse ; `useShallow` ne sauve pas, les rangs étant eux aussi des objets neufs. Et
  `History` lui-même est une référence **stable**, donc un sélecteur dessus ne se déclenche jamais.
  **Les deux moitiés échouent** : d'où l'instantané plat pris à chaque action, la ligne vivant dans la
  fermeture de la fabrique et non dans l'état.
  **Le piège dans le piège, à ne pas re-découvrir** : `Object.assign` et le spread **évaluent les getters et
  en copient la valeur**. Donc mettre des getters dans l'état *marche par accident*, et le sabotage qui le
  fait ne casse **aucun test** — l'aplatissement se fait en aval de `snapshot`. Ce qui fait tomber la garde
  (9 tests) est un `publish` qui n'incrémente que le compteur sans relire la ligne.
- ~~**`4d-3` est à moitié livré : où vivent les assets partagés ?**~~ — **FERMÉ 2026-10-07**, et l'entrée
  contenait une **affirmation fausse qu'il faut avoir lue une fois** : elle disqualifiait le `publicDir`
  partagé au motif qu'il « publierait du GPL ». **Faux**, et `completed.md` portait déjà la correction du
  05/10 sans que cette entrée soit reprise : les 21 payloads sont **gitignorés**, donc ils n'atteignent
  jamais le checkout de la CI et aucun build CI ne peut les copier. Ce que le raccourci fait réellement,
  c'est **étendre une surface que la garde ne couvrait pas** — et le remède tient en une ligne.
  **La leçon de procédure, qui vaut plus que le fait** : une entrée de `known-issues.md` qui a été
  corrigée ailleurs est pire qu'une entrée absente, parce que ce fichier est relu à chaque session et
  qu'elle fait re-trancher une décision déjà prise. Quand une correction atterrit dans `completed.md`,
  **rouvrir l'entrée correspondante dans le même pas.**
  **Ce qui est en place** : `publicDir: '../atlas/public'` dans `packages/cartographer/vite.config.ts` —
  zéro octet dupliqué, Vite servant ce dossier en dev et le recopiant dans `dist` au build ; et la garde
  GPL de `build.yml` **élargie à `packages/*/dist`** plutôt qu'au seul atlas. Prouvée en la faisant tirer :
  localement, où les fichiers GPL existent, elle trouve **les deux** `dist/borders`.
  **Mesuré** : Cartographe 219,65 → **240,74 ko / 76,30 ko gzip** (+7,67 ko pour tout le fond), et son
  chunk worker sort à **13 490 o avec le même hash que celui de l'atlas** — donc littéralement le même
  code, toujours sans three.js.
- ~~**`RENDER_FRAME` déclare les métadonnées du DEM à la main**~~ — **FERMÉ 2026-10-07 (ARCH-102)**, au
  déclencheur nommé, qui était `4d-3`. L'application prend désormais la taille de la grille et la bbox du
  `.json` du DEM, par le lecteur qui le parse déjà : `frameFromHeightmap(dem.meta)` dans
  `backdropSource.ts` — trois champs, aucun littéral.
  **La question de `node:fs` ne s'est jamais posée**, et c'est le point à retenir : l'entrée disait qu'il
  faudrait lire le fichier depuis le disque, donc `@types/node` dans un paquet navigateur, donc rompre le
  contrat de la scission. **Faux cadrage.** Le fichier est déjà lu — par `fetch`, au démarrage, par le
  port. Il n'y avait rien à ouvrir, seulement à ne pas re-déclarer ce que le port rapportait.
  **Le littéral survit comme fixture de test** (`view/testFrame.ts`, `TEST_BACKDROP_FRAME`) : six suites
  ont besoin du *vrai* repère pour que leurs assertions de projection veuillent dire quelque chose, et
  les laisser le redéclarer est ce qu'ARCH-102 avait corrigé en premier. **Un test interdit à la
  production de l'importer** — `backdropSource.test.ts`, par `import.meta.glob` sur les sources, avec un
  second test qui vérifie que le glob voit bien les modules (sinon la garde passerait à vide, défaut de
  tous les tests qui parcourent un arbre).
  **Et `boundsMatch` est branché**, enfin : `boundsDisagreement` refuse un masque qui ne couvre pas le
  même sol que le relief, en `semantic`, avant toute cuisson. C'était le remède écrit depuis le 17/09 et
  jamais appelé.
- ~~**`favicon.svg` existe en deux exemplaires**~~ — **FERMÉ 2026-10-07**, et par l'inverse exact de
  l'argument qui l'avait justifié. L'entrée disait : *« Vite ne sert qu'un seul `publicDir` par paquet, et
  celui de l'atlas porte aussi le DEM — pointer le Cartographe dessus lui ferait servir les assets de
  l'atlas »*. Le raisonnement était juste et **la conclusion est devenue fausse le jour où le Cartographe
  a eu besoin de ces assets-là** : `4d-3` lui demande précisément le DEM, le masque et les fleuves, donc
  ce qui était un couplage à éviter est devenu le câblage voulu. Un seul `publicDir`, donc un seul favicon,
  et la copie du 05/10 est supprimée.
  **La leçon, qui se répète dans ce fichier** : un arbitrage est daté par ses contraintes, pas par sa
  qualité. Celui-ci a tenu deux jours et il était bon les deux jours.
  **Le piège qui reste vrai, lui, et qui n'a rien à voir** : **Vite ne retire pas les commentaires HTML.**
  Une première version de l'explication, écrite dans `index.html` à la densité habituelle du dépôt,
  faisait passer le fichier servi de 0,35 à **1,12 ko** — 770 octets de raisonnement livrés à chaque
  visiteur. Le raisonnement vit ici, le HTML garde une ligne.
- ~~**Le Cartographe n'a aucune ligne dans la table des frontières ESLint.**~~ — **FERMÉ 2026-10-05** à
  l'étape 4b, et la fermeture a trouvé **une cause plus grosse que le trou**.
  **Un `files` de la config racine est résolu contre le répertoire de la config CHARGÉE, pas contre le
  fichier où il est écrit.** Donc une ligne écrite dans `eslint.config.js` pour
  `packages/cartographer/src/view` matche depuis la racine et **matche rien** depuis le paquet — qui est
  exactement d'où son `lint` tourne. Mesuré à `--print-config`, pas déduit : avec la config racine seule et
  `basePath` = le paquet, la règle est **absente**. C'est la sœur de « flat config n'a aucune cascade », un
  cran plus loin : **une ligne de frontière ne se partage pas avec un paquet qui possède sa config.**
  **Et une config morte est pire que pas de config, parce qu'elle a l'air d'une garde.** La première version
  de cette ligne a été écrite dans la table racine et n'a **rien** attrapé — trouvé en la cassant, pas en la
  relisant.
  **Remède en place** : `eslint.config.js` **exporte** `layerBoundary` et `LAYER` ; le Cartographe compose
  ses propres lignes avec des globs **relatifs au paquet**. Et chacune **recompose l'interdit `three`**,
  parce que `no-restricted-imports` est une règle unique — un bloc paquet-large posé après les lignes de
  répertoire les effacerait en silence, ce qui était **déjà le cas** avant cette correction.
  Prouvé en cassant : `view/` → `state/`, `state/` → `main`, `three` dans `main.ts`, et `three` **dans**
  `view/` — ce dernier étant la preuve que la composition tient. Le lint vert prouve l'autre moitié :
  `view/` lit toujours `core/geo`, dont `resolution.ts` a besoin.
  **Une direction a été relâchée après revue, et la faute est nommable** : ma première ligne interdisait
  aussi `state/` → `view/`, soit **une symétrie là où le principe est une direction**. `view/` est une
  **feuille** d'arithmétique pure, lue d'en haut exactement comme `geo/` et `utils/` le sont par `data/`
  dans `core` ; et `4d` met le viewport **arrêté** dans une slice, que le canevas statique relit. La ligne
  symétrique aurait bloqué le cas voulu, et l'aurait fait découvrir à `4d`. Ce qui tient le pan et le zoom
  **par frame** hors du store est une règle sur *quand* on appelle `set` (`rules/troubleshooting.md`), pas
  un interdit d'import — un interdit bloquerait aussi la valeur commitée.
  **Les cinq couches ont leur ligne** : `view/` et `state/` (4b), `geometry/` (4c), `canvas/` et
  `components/` (4d-1) — la phrase qui disait *« reste `canvas/`, à ajouter quand le répertoire naîtra »*
  était périmée dès le 05/10 au soir.
  **Les chargeurs de la racine ont la leur depuis le 07/10**, et mon arbitrage de deux heures plus tôt
  était faible : j'avais écrit qu'ils s'en passaient « comme les neuf modules de composition de l'atlas ».
  La revue a nommé ce qui rend la comparaison fausse — **l'atlas n'a pas de `boundaries.test.ts`**, et ce
  paquet en a un justement pour qu'une ligne manquante ne redevienne pas silencieuse. Et
  `backdropSource.ts` / `vectorLayers.ts` ne sont pas du câblage : ils portent de la logique et des tests.
  Ligne posée (`forbid: ['state', 'canvas', 'components', 'main']`), prouvée en important le peintre dedans.
  **Et la pose a révélé un défaut du test lui-même, plus grave que le trou.** `components` n'existait pas
  dans la table `LAYER` racine, donc le `group` contenait un `null` et la config devenait **invalide** —
  sur quoi `boundaries.test.ts` a affiché **13 tests “skipped”**, pas un échec. *Une garde qui se tait
  quand elle casse* est exactement la forme contre laquelle elle est écrite. Fermé par un test qui assère
  que la config a chargé et que chaque couche a bien été résolue ; vérifié en remettant une couche inconnue
  dans un `forbid` — quatre tests tombent au lieu de se sauter.
  **Et la preuve manuelle n'est plus la seule** : `packages/cartographer/src/boundaries.test.ts` interroge
  la **résolution** de la config (`calculateConfigForFile`) sur un fichier réel de chaque couche et assère
  les options auxquelles `no-restricted-imports` aboutit. C'est le bon niveau, parce que ce qui s'est cassé
  n'était pas que la règle ne tirait pas — c'était qu'elle **ne s'appliquait pas**, résolue sans aucun
  `patterns`. Vérifié en reproduisant l'état du soir : la ligne `view/` retirée du paquet fait tomber
  **4 tests** là où la gate était verte, et le retour de `LAYER.main` à `'**/main.ts'` en fait tomber un.
  **Deux approches écartées, et pourquoi** : `lintText` sur un chemin virtuel échoue avant la règle
  (*« was not found by the project service »*, le lint typé refusant un fichier hors tsconfig) ; écrire des
  fichiers jetables dans `src/` marcherait et a été refusé, parce qu'un run interrompu les laisserait là et
  le `lint` suivant échouerait sur un fichier que personne n'a écrit.
  **À savoir pour la suite** : `calculateConfigForFile` rend **`undefined`** pour un chemin ignoré, pas un
  objet sans règles. « Aucune config » et « la règle est absente » sont deux faits différents.
- ~~**Le quota Sonar de l'organisation est presque plein, et le Cartographe le fera déborder.**~~ —
  **ARRIVÉ le 2026-10-06**, exactement comme prédit, au push qui a livré l'étape 4 du Cartographe
  (~1 317 lignes de code hors tests). Le message de SonarCloud, mot pour mot : *« **Number of lines
  exceeded** — Your analysis failed because the total number of lines of code in **your organization**
  exceeds your current subscription limit. »*
  **Ce que ça ne fait pas : ça ne bloque rien.** La CI a été écrite pour ce cas le 24/09 et le dit
  elle-même dans `validate.yml` — *« Sonar did not complete. That is an availability problem (quota,
  token, service), not a verdict on the code, so it does not stop the release. »* Le déploiement passe ;
  ce qui est perdu, c'est l'analyse.
  **Le piège de diagnostic, et c'est la partie qui vaut d'être relue.** La page d'onboarding affiche en
  premier un message **visible, plausible et faux comme cause** : *« Automatic analysis… the last attempt
  wasn't successful because this project didn't meet the **compatibility criteria** »* — ce qui ressemble
  à un monorepo pnpm que l'analyse automatique ne sait pas lire. **J'ai affirmé cette cause.** La vraie
  est derrière le bouton *View details*, et c'est le quota. **Deux messages, deux sujets : celui qu'on
  voit d'abord n'est pas celui qui bloque.** Aller chercher *View details* / *Background Tasks* avant de
  conclure.
  **Le levier n'est pas ce projet.** Le message dit *« your organization »* : mesuré le 24/09, les autres
  projets de `fubaritico` consomment **42 666 lignes** des 50 000 du palier gratuit, celui-ci **~7 500**.
  Réduire ce dépôt ne rendrait presque rien.
  **Les trois issues, inchangées** : délier un vieux projet privé de l'organisation (deux clics, et c'est
  là qu'est la place) · **rendre ce dépôt public**, ce qui le sort entièrement du compteur — gratuit et
  illimité pour le public, et c'est déjà la direction annoncée · payer.
  **Et une seconde chose à faire, qui ne rendra aucune ligne** : l'« Automatic analysis » du projet est
  sur **ON**, et SonarCloud demande de la couper avant une analyse par CI (*« Turn off automatic analysis
  before configuring this project for CI-based analysis »*). À faire, mais ne pas en attendre le
  déblocage.
  **Sévérité : à savoir, non bloquant.** La *quality gate* avait été corrigée le 24/09 précisément pour
  qu'un problème de quota ne soit jamais un verdict sur le code.
- **L'historique de l'entrée précédente, gardé parce qu'il porte la mesure d'origine.** Le palier
  gratuit couvre **50 000 lignes de code privé par organisation**. Mesuré le 24/09 : **42 666 lignes**
  consommées par les autres projets de `fubaritico`, **~7 500** par celui-ci une fois les données
  générées exclues — soit **~50 200 au total**, sur le fil.
  **Ce que ça veut dire** : chaque millier de lignes du Cartographe rapproche du mur, et l'échec prend la
  forme d'un `403` au scan, pas d'un message clair.
  **Trois issues, aucune urgente** : délier un vieux projet privé de l'organisation (deux clics, libère
  largement) · rendre ce dépôt public, ce qui le sort entièrement du compteur (gratuit et illimité pour
  le public) · payer. **Sévérité : à savoir, pas bloquant** — la *quality gate* a été corrigée le 24/09
  pour que Sonar ne bloque plus une mise en ligne, un problème de quota n'étant pas un verdict sur le
  code.
- ~~**The activity-log hook writes to a _relative_ path, so a `cd` splits the journal in two.**~~ —
  **FIXED 2026-09-24**, and it had cost more than the one stranded line this entry knew about.
  `~/.claude/hooks/session-log.sh` built its path from the payload's `cwd`, so any session working in a
  subdirectory started a second journal there. **Five** had accumulated, holding **68 actions** between
  them — `files/plans/files/` alone held 62.
  **What it actually cost, measured**: the evening of 2026-09-22 was logged as **99 actions** and is in
  truth **166**. Durations were right (the span's endpoints had been captured either way), the volume of
  work was not. `/timeline` and `/start-session` read these figures, so the project's own record of
  itself was wrong by a third on that span.
  **The fix** walks up from `cwd` to the nearest directory holding `.git` and logs there; outside a git
  repository the old behaviour is kept. The report's title was reading the same wrong variable, so it
  announced `cartographer-design` as the project. Both verified by running the report from the offending
  subdirectory. The strays were merged back, deduplicated (exactly **one** duplicate — the line this
  entry says was merged by hand), and removed; a backup sits at `/tmp/session-log.backup.jsonl`.
  **Residue, cosmetic**: the recovered lines carry paths relative to the _old_ working directory, so the
  "most touched files" list shows `scenarii/s99-holes.md` and `files/plans/cartographer/scenarii/s99-holes.md` as two
  entries for one file. Counts and durations are unaffected. Rewriting those paths would mean editing
  history for a ranking nobody decides anything on — left alone deliberately.
- ~~**Political borders are interrupted where states are small**~~ — **FIXED**, and the recorded cause was
  wrong. It was never about polity size: `separatesRegions` probes **2** DEM cells either side of a ring,
  while `snapToCoast` lets `expandRegionsOverLand` grow every claim by up to **its own value** (5–12).
  Wherever the expansion moved the frontier further than the probe reaches, both samples land in the same
  polity and the stretch is discarded — structural, and guaranteed, not a tuning matter. The real defect
  was having **two sources of truth for one object**: fills from the raster, borders from the rings.
  `extractRegionBorders` derives the line from the raster itself, so it _is_ the boundary of the
  fills — gapless by construction. **The ring path and its `border source` toggle were deleted on
  2026-09-17**, the comparison having been settled on screen. With them went `separatesRegions` and, more
  usefully, the political grid's trip back to the main thread: nothing on this side read it any more, and
  at the 4× raster that copy cost **45 MB a year**.
- ~~**The texture bake is one indivisible synchronous block, and it is where the tab still freezes**~~ —
  **FIXED 2026-09-17** by moving the whole compute into a worker (`src/pipeline/`). The bake was never
  splittable; it had to leave the thread. Two ports rather than one, because **the bake is not political**
  — it is what the relief load, the mask load and the texture tunables trigger, and folding it into a
  political port would have left a second bake behind for the other four callers. Consequence worth
  keeping: **the texture sliders stopped freezing the tab too.**
  The enabling fact was that `composeTerrainRgba` is pure — extracting it out of `scene/` into a
  three-free `pipeline/` layer is what keeps the worker chunk at **12.6 kB with no three.js in it**
  (measured on `pnpm build`; without the split, three ships twice).
  **Still true**: scrubbing centuries _smoothly_ is a separate problem, needing a second transparent
  surface above the relief at the cost of `overlay` and `softLight`, which only exist in the CPU
  compositor. And **4× is no longer ruled out** — it was rejected for blocking 825 ms, which is no longer
  this thread's problem. Not yet tried.
- ~~**`devPanel.ts` has no tests** (it imports lil-gui and would need a DOM)~~ — **WRONG, and fixed
  2026-09-17.** The claim was never checked. lil-gui runs under jsdom; the only thing missing is
  `window.matchMedia`, which is three lines to stub. Two sets of sliders were lost to a file that was
  testable all along.
  What now guards it: **every one of the 117 controls is moved and must trigger at least one callback**,
  against an allow-list of the ones that are deliberately inert because the render loop reads them every
  frame. Verified by breaking a wiring on purpose — the test named `revealStart`, the exact shape of
  both past failures. The subtlety it cost: most controls bind `onFinishChange`, not `onChange`, since a
  rebuild must not run on every drag frame — a test that fires only the first finds the panel inert and
  is itself the thing that is wrong.
  The dispatches are covered too: a border paint redraws, border smoothing re-traces, a change of year
  rebuilds in full, and the sea level rebuilds the coastline and the rhumbs that share it.
  **Still true**: the widths and reveal thresholds are captured when a layer is built, so every river
  tunable needs a rebuild and only the colour has a live setter.
- ~~**`composeTerrainRgba` is long**~~ — **FIXED 2026-09-17**. Split into a row compositor over
  `snowLineDropByRow`, `createShadeSampler`, `seaColorInto` and `writeTerrainPixel`; the declaration half
  of the file moved to `pipeline/terrainOptions.ts`, re-exported so no call site changed.
  **A real defect surfaced in the split**: `createShadeSampler` clamped the indices it read but not the
  interpolation weight, so a position outside the field extrapolated away from it instead of stopping at
  the edge. It looked like a guard and was not. No caller ever passes one, and the fix is bit-identical
  inside the field — `meshSurfaceY` already got this right, which is how the contrast showed.
- ~~**No asset payload is validated, and no failure reaches the user**~~ (SEC-001) — **DONE 2026-09-17**,
  following `files/plans/atlas/07-robustness.md`. All four payloads now go through hand-written readers
  (`data/assetError.ts`) behind one shared helper, as the chapter recommended over a schema library. The
  taxonomy it asked for is real and load-bearing: `transport | schema | consistency | semantic`, carried
  on the error as fields rather than only in a string.
  **What the chapter left open, and how it was settled**: a missing relief is **blocking** — its own
  degraded-mode policy already said "relief missing → there is no map", so the splash stays up and the
  message lands on it. Validation runs **always**, not only in dev, on the chapter's own argument that
  production is when a corrupt asset most deserves a message.
  **Still open from chapter 07**: nothing validates the compass SVG; the contribution tooling (chapter 06) will need the same readers pointed at hand-imported files, which is the case the chapter says
  justifies revisiting the schema-library question.
- **Une tribu n'a pas de remplissage dans le Cartographe, mais l'atlas la remplit encore** (15/10) — **fermé le
  16/10** : l'atlas lit les tribus comme le Cartographe (`exactBordersOf` écarte leurs frontières et rend leurs
  contours, `settleYearBorders` retire leur teinte, `tribeStrokes` les trace en tirets dans leur couleur). Reste
  le rendu par grille du panneau, qui les teint encore (`known-issues-atlas.md`).
- **Le canevas du Cartographe a deux boîtes géographiques et une seule image.** La **bbox de rendu** (celle
  du DEM : W −45 / S 11 / E 78,75 / N 76,84) est ce à quoi la texture cuite est géoréférencée ; la **zone
  éditoriale** déclarée par le document est lon −45…60, lat 20…76. Elles ne coïncident pas. Projeter contre
  l'une en dessinant le fond contre l'autre fait **tout glisser, sans erreur nulle part** — même famille que
  le manifeste dont la bbox n'est vérifiée par personne (entrée ci-dessous).
  **Décidé le 29/09, avant d'écrire une ligne** : le repère du canevas est celui **du fond**, seul
  géoréférencé par construction ; la zone éditoriale est un **cadre dessiné par-dessus**, ce que le glossaire
  dit déjà d'elle (« la planche, nommée au-dessus de son cadre ») et ce que `s12` sépare.
  **Sévérité : bloquant si oublié, réglé si appliqué.** À relire au début de `4b`.
  **Fermé le 18/10** : la zone éditoriale est supprimée (décision du dev, `s12`) — il ne reste qu'une boîte, celle du fond.

- **Deux gênes du Cartographe relevées par le dev le 16/10 au soir, à déboguer** — CARTO-233, CARTO-235 (*« ça fait peur pour l'expérience
  utilisateur »*). (1) **Les outils s'activent trop tard au zoom** : il faut trop se rapprocher avant de pouvoir
  sélectionner ou dessiner (seuil de `s17`, « les outils attendent le zoom ») — l'abaisser. (2) **‹P› et ‹A› ne
  répondent pas sur un pays neuf ou vide** : il faut cliquer l'outil dans la barre. **Le dev donnera le cas exact** ;
  le reproduire avant de toucher au code. **17/10** : (1) seuil passé à 20 km, non commité, le dev le jugera sur un très grand pays. **18/10** : (2) fermé — le dev : *« le P et le A s'activent bien maintenant au raccourci clavier »*, sans code écrit (CARTO-235, Fait). Reste (1). **Sévérité : gênant.**
  **Fermée le 18/10** : (1) commité à 20 km à la demande du dev (`8921dc4`, CARTO-233) ; (2) fermée le 18/10 sans code (CARTO-235).
