# Next — the historian's resume point

> Read **in addition** to `next.md` when a session starts as the historian (`/start-session`, *« en tant
> qu'historien »*); written by `/end-session` in that role. Not imported by `CLAUDE.md`: the code instance never loads
> it. The tasks are the board (`/trello`); this file holds where the historian stopped. Its readings are the team's,
> never attributed to a person (memory `a-reading-is-never-attributed-to-the-dev`).

## ▶ ON REPREND ICI — 11/11 : finir l'Adriatique de 1100, l'arrière-pays croate et bosniaque d'abord — CARTO-417

Sa demande du 10/11 au soir : *« on reprend et on termine cette question-là »*, sur cet inventaire. Tout le travail est dans
`files/resources/adriatic-1100-research/` (git-ignoré) ; la synthèse, commitée, `files/plans/sources/1100-adriatic.md`.

**1. L'arrière-pays (Croatie et Bosnie hors de la bande côtière) — en cours, à finir.** Sa règle : *« des villes, des
villes »*, ratisser large, **par la date de création, pas par la population**. Fait : le vivier, 13 358 localités de
Croatie et de Bosnie pas encore étudiées (`inland/pool.json`) ; 424 forteresses de Wikidata (`inland/forts.json`, des
repères) ; la collecte des articles hr, bs, sh, sr de chaque localité lancée (`inland/fetch.py`, reprend où elle s'est
arrêtée : relancer `python3 -I inland/fetch.py inland`). **Reste** : extraire de chaque article la date de première
mention (« prvi put se spominje 1103 », « u XI. stoljeću ») et garder ce qui est daté **avant 1150** ou du XIIᵉ siècle et
avant ; y joindre les chefs-lieux de župa ; retirer quartiers et doublons ; lui donner le compte par région **avant** de
lancer ; puis les lots (le `BRIEF.md` de la côte, plus la župa de chaque district), la revérification, la saisie.

**2. Les écarts avec sa carte de 1100 — à lui, dans le Cartographe** (le détail par ville : la synthèse) :
- **pas de royaume de Croatie** (1097–1102, sans roi ; la Hongrie de Coloman est l'autre lecture, proche) — hachures, ou un
  pays de plus ;
- **l'Istrie au Saint-Empire, pas à Venise** : Pula, Poreč, Buje, Tar, Rovinj, Galižana ; le territoire de Piran (Lucija,
  Seča) ; Rijeka et Kastav, sur la Hongrie dans la carte ;
- **Split** (carte : Hongrie) à Venise pour Byzance de 1097 à 1105 ; **Biograd** (carte : Venise) croate ou hongroise ;
  **Mestre** (carte : Venise) au royaume d'Italie ;
- **les îles** : Brač, Hvar, Vis plutôt croates (carte : Venise) ; Korčula et Lastovo à la Zachlumie de Bodin ;
- **la Serbie de la carte** sur Vrgorac, Ploče, Grude, Vau i Dejës, Shëngjin : aucune source ;
- **la côte dessinée trop courte** : Zadar, Trogir, Murano, Bibione, Rab, Hvar, Makarska, Budva → Petrovac, Kassiopi,
  Piran, Umag, Novigrad, Rovinj ;
- **des lieux qui n'existaient pas** encore sur la carte : Pag ville (c'était Novalja), Kamen, Košute, Loreto.

**3. À commiter après son coup d'œil** : les identifiants Wikidata corrigés dans `years/1100`, `1200`, `1300`
`registry.json` (Empire byzantin Q12544 et les onze de `wikidata-1100.md`) — **1000 jamais** (sa décision) ; `1100/polities.json`
modifié est à lui (son Cartographe).

**4. Dans la base, à trancher ou compléter** : deux villes sans fiche de 1100 faute de source datée (Himarë, Biševo) ;
Massa Fiscaglia, détenteur sans ligne qui le porte ; les détenteurs hors de la carte (« Royaume de Croatie » Q858841,
« Zachlumie » Q1311704) que le Cartographe dira « à déclarer » ; les régions slovènes saisies avec le nom anglais de la
commune ; la licence « domaine public » posée par un agent sur Monticolo, Romanin, Arditi (à vérifier) ; la source 619
(Benussi) sans adresse.

**5. Les pistes à lire dans son Chrome** (refusées aux scripts) : HRČAK (Ančić 1998 et 2011, Šišić sur Coloman), Stephenson
2000, Budak 2018, Kandler, la *Tabula Imperii Byzantini* 3, Ducellier sur Persée — chaque rapport liste les siennes.

**6. Ensuite** : les îles de la mer Égée (65 listées, `islands-aegean.json` dans le scratchpad du 10/11, à refaire) ;
CMS-414, ses 41 cas ; CMS-416, un sujet de conversation (une fiche par détenteur, la taille de la base).

**L'Italie de 1100 est dans sa base** (357 villes, `1100-italy.md`), le nord-ouest corrigé (Novare et Trecate sur Savio).

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
