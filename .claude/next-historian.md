# Next — the historian's resume point

> Read **in addition** to `next.md` when a session starts as the historian (`/start-session`, *« en tant
> qu'historien »*); written by `/end-session` in that role. Not imported by `CLAUDE.md`: the code instance never loads
> it. The tasks are the board (`/trello`); this file holds where the historian stopped. Its readings are the team's,
> never attributed to a person (memory `a-reading-is-never-attributed-to-the-dev`).

## ▶ D'ABORD — le rattrapage du lot géographique (CMS-414), prêt, à lancer dans une session neuve

Le pays et la région d'aujourd'hui de chaque lieu (`ec9adc6`, `e0ddd40`) : les champs, le bouton et la lecture sont
commités et essayés par le dev sur Ortona. **Le rattrapage n'est pas écrit** : la session du 10/11 gardait l'outil
`updatePlaces` d'avant les champs (même après `/mcp` et la relance de son CMS — le serveur, lui, les connaît). Tout est
prêt dans `files/resources/lot-backfill/` (ignoré par git) : `BRIEF.md`, quatre paquets `updates-1..4.json` (699 lieux,
665 avec leur région, lus dans Wikidata « aujourd'hui seulement »), `to-decide.json` (41 cas pour le dev : plusieurs
pays — Jérusalem, Prizren, Lipljan, Rome, Derbent, Arnedo —, aucun pays, plusieurs ou aucune région). D'abord vérifier
que `updatePlaces` a bien `country` et `region` ; puis un agent par paquet ; relire la base en lecture seule ; le
ticket CMS-414 à « À valider » avec la liste des 41.

**L'Italie de 1100 est dans sa base** (357 villes, 272 sources, `files/plans/sources/1100-italy.md`) ; à corriger : quatre
lignes du nord-ouest saisies avant la règle de date (Turin, Rivalta, Novare, Alba).

## ▶ ON REPREND ICI — 10/11, après la nuit des sept cartes

**Où je travaille** : le worktree `.claude/worktrees/historian`, branche `historian-1109`, **jamais l'arbre de `main`**
(sa préférence, 09/11) — sauf pour lui livrer une carte quand il dit qu'elle est prête. **Le resynchroniser sur `main`**
dès que `main` bouge et à chaque carte finie (`git merge --ff-only main`, ou `git rebase --autostash main` quand un
commit à moi y a été reporté ; mémoire `resync-worktree-with-main`). Mon serveur du Cartographe : port **5180**, lancé
depuis le worktree (`pnpm -C <worktree>/packages/cartographer exec vite --port 5180 --strictPort`).

**Mes commits en attente de fusion** : `7cc7251` (la recette de numérisation) — l'instance principale fusionne mes
commits sur `main` en avance rapide ; vérifier qu'il y est (`git log main`).

## Les cartes — l'épique CARTO-400 (les vingt cartes de base)

| année | où | état | ce qui lui reste (le détail sur son ticket) |
| --- | --- | --- | --- |
| 1000 | worktree `years/1000` (+ une copie non commitée dans l'arbre de `main`) | générée, build OK — CARTO-403 | Grande-Bretagne, Irlande, Sardaigne ; Bouyides et Danemark (grosses reprises) ; 6 côtes |
| 1100, 1200 | `main`, publiées | les siennes | — |
| 1300 | `main`, publiée (`3c9e335`) | retouchée par lui | provenance ATLAS-408 : version Cliopatria v0.2.1 et article (Bennett et al. 2025) donnés |
| 1400 | worktree `years/1400` | générée, build OK — CARTO-404 | 6 îles partagées ; 5 grosses reprises ; 7 côtes |
| 1500 | worktree `years/1500` | générée, build OK — CARTO-405 | Grande-Bretagne ; khanat de Crimée ; Naples, Raguse |
| 1600 | worktree `years/1600` | générée, build OK — CARTO-406 | Grande-Bretagne et Irlande ; Danemark-Norvège, Crimée ; 53 pays seulement avec Wikidata |

**Sa décision (09/11)** : 1000, 1400, 1500, 1600 (et 1700) **ne se commitent pas** tant que lui et moi ne les avons pas
finies de nettoyer ; aucune ne se copie dans `main` avant son mot. L'index du worktree liste les sept (pour le build),
jamais commité.

**La course d'une carte** (≈ 25–40 min de gestes) : l'import (`files/spikes/cliopatria-import/` : `resolve.py` puis
`convert.ts`), puis les six passes de `/use-cartographer` (« The order of work »). **Le chef d'orchestre des passes**
est `files/maps/pipeline/plan.mjs` + `plan.sh` dans le worktree (git-ignorés) — **une dette** : à faire entrer dans la
skill, avec ses tests. Les plans et registres de chaque année : `files/maps/<année>/` du worktree. Il faut recréer à
chaque session : un venv Python avec `shapely`, `pypdf`, `pillow` dans le scratchpad, et la base de Cliopatria
dézippée depuis `opensrc/repos/github.com/Seshat-Global-History-Databank/cliopatria/cliopatria.geojson.zip`.

**1700 et après** : OpenHistoricalMap (CC0), `files/spikes/fetch-ohm/fetch-ohm.mjs` — pas encore au format d'une année
du Cartographe.

## Les sources

- **La méthode** : `/use-cartographer` `references/layers.md` (la couche de base, les calques de vérification, les
  villes, la mention) ; `/find-sources` (neutre — toutes les hypothèses suivies ; l'index des livres, récursif, sur
  archive.org, JSTOR, la BnF).
- **Les scans d'atlas** : la recette est `find-sources/references/scanning.md` (VueScan, 300 dpi, feuille noire). Il
  scanne sur un disque externe en **exFAT** (nom à me donner) ; le premier atlas, *Les Balkans, atlas historique*
  (Hupchick, Cox), a 12 pages dans `/Volumes/mùùùmù/ATLAS-BOOKS/2026-11-10-0001.pdf`. Plusieurs séances = plusieurs
  PDF, que j'assemble avec `pypdf` (les originaux gardés).
- **Shepherd** (1911/1923) est un calque comme Cliopatria (sa décision, ATLAS-153).

## Ouvert, à sa décision

- **La règle d'arrêt de la recherche récursive** (ma proposition, « à confirmer » dans `/find-sources`).
- **Le registre des couleurs** tiré de sa 1100 (un pays garde sa couleur ; un vassal prend celle de son suzerain ; un
  successeur hérite) — proposé, pas lancé.
- **Les lacs partagés entre un pays et une terre sans maître** : le geste des lacs coupés, pas celui de l'île.
- **ATLAS-410** (dans Idées) : les frontières de chaque année publiées en traits, sous CC BY-SA.
