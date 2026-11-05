## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

### 2026-11-05 — les trois collages tranchés, la frise d'après Peters, la v2 de Claude Design

Plage **05/11 12:48 → 14:20** (1 h 32) ; le chantier ouvert le 05/10 totalise **200 h 40 sur 36 plages**. Aucun code :
des décisions, écrites dans les plans, et le commit de clôture, **non poussé**.

- **CARTO-345, ses décisions** (plan `copy-paste-between-maps.md`, scénarios `s22` réécrits) : un nom déjà dans la carte
  est refusé par une boîte de dialogue ; **pas de remplacement de tracé** — on supprime, on colle (*« restons simple dans
  la mécanique : on colle, il n'y a rien, ça remplace ; il y a quelque chose, on soude »*) ; une partie de tracé se fond
  dans le tracé (*« il faut un merge, une fusion »*), un tracé entier se superpose à l'ancien ; on colle des points, pas
  leur rôle. **Tous les collages dans `core` avant l'interface** (son ordre).
- **ATLAS-358, la frise** : son scan reconnu — Arno Peters, *Synchronoptische Weltgeschichte* ; **cinq couches**, un nom et
  des dates, jamais de texte, les mêmes événements que la carte (*« c'est ce que j'attendais »*). Le texte pour Claude
  Design donné ; la v2 rangée dans `files/resources/claude-design/` (sa décision), la v1 à la corbeille. Ses prompts du
  logo par époque notés dans `ornament-by-era.md` ; les ornements, il les dessine.
- **Mes fautes** : « tronçon » et « bouts » l'ont perdu deux fois (*« je ne sais pas ce qu'est un morceau de
  frontière »*) — l'exemple de sa Pologne a fait comprendre ; j'avais gardé mon idée du 03/11, le tronçon qui remplace,
  contre sa règle du jour.

### 2026-11-04 soir → 05/11 nuit — la barre de menus fusionnée, Playwright en épopée, l'interface de l'atlas par Claude Design

Deux plages, **04/11 18:57 → 21:31** et **23:07 → 00:40** (4 h 06) ; le chantier ouvert le 05/10 totalise **198 h 52 sur
35 plages**. **Sur `main`**, la fusion `cc242a0` (`carto-345`, étapes 1 et 2 du copier-coller) et le commit de clôture,
**non poussés**.

- **CMS-335 fait** (*« validé et testé, l'information est affichée dans le Cartographe »*). **CARTO-345** : la branche
  fusionnée à sa demande, contrôles verts (6 142 tests) ; son essai : copier sans coller ne lui donne rien à faire —
  *« si on ne peut pas coller, c'est pas fini »* ; l'ordre inversé, le pays entier d'abord.
- **Playwright** (sa demande) : l'épopée REPO-346, l'installation REPO-347 et dix lots en Backlog, le plan
  `files/plans/e2e/playwright.md` ; le piège trouvé : le dossier des cartes en dur, un test écrirait sa 1100.
- **L'interface de l'atlas** : la recherche des ornements par époque (`ornament-by-era.md`, par un agent) ; la maquette
  d'ambiance de Claude Design, bureau puis tablette et téléphone, mes retours écran par écran ; ses décisions —
  l'atlas jusqu'à 1900, un habillage par époque, la frise synchronoptique (ATLAS-358), le nom des mers (ATLAS-359).
  Ses mots : *« j'ai hâte de voir ça sur un grand écran. Très hâte. »*
- **Mes fautes** : lui donner à essayer une étape qui ne finissait aucun geste (copier sans coller), puis expliquer au
  lieu d'écouter — *« tu me fais chier, en fait »* (mémoire `ship-a-whole-gesture`) ; une première réponse sur la
  rosace hors de son propos (*« des éléments décoratifs, tu comprends ça ? »*) ; juger le contenu inventé d'une maquette
  d'ambiance.

> Older sessions (2026-09-12 → 2026-11-03) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
