# Next — the historian's resume point

> Read **in addition** to `next.md` when a session starts as the historian (`/start-session`, _« en tant
> qu'historien »_); written by `/end-session` in that role. Not imported by `CLAUDE.md`: the code instance never loads
> it. The tasks are the board (`/trello`); this file holds where the historian stopped. Its readings are the team's,
> never attributed to a person (memory `a-reading-is-never-attributed-to-the-dev`).

**À faire dès qu'il a fini ses retouches de 1100** (sa demande, 13/11 : _« il ne faut pas qu'on se retrouve pollué par
plein de trucs »_) : effacer `files/resources/historien/1100/1100-retouches.md`, son document de lecture des sept retouches. Les notes
de `files/plans/sources/1100/` (kosovo, france-empire, lusatia) restent : ce sont la trace des sources.

## ▶ ON REPREND ICI — 19/11, 23 h 45 : la Rus', le Levant et la Finlande faits ; l'export et CORE-486 attendent

**Fait** (détail : `completed.md`, et les notes de `files/plans/sources/1100/`) :

- **La Rus' en 1100** : 33 lieux (lieux 13576–13608, fiches 13594–13626, sources 5377–5409) — `rus.md`.
- **Le Levant, Chypre, la Mésopotamie en 1100** : 51 lieux (lieux 13609–13659, fiches 13627–13677, sources 5410–5460),
  six en alerte exprès — `levant.md`.
- **La Finlande de 1100** dessinée dans l'arbre principal, commitée par le codeur (`1d8be087`), validée par lui.
- Les deux lots contrôlés par script et par le codeur ; extraits et registre à jour (3 414 lectures) ; dossiers de travail
  vidés à sa demande (reste `levant-1100-research/` sans ses pages, 2,6 Mo : listes, verdicts, fichier de saisie).
- Le script de lecture de `/bulk-entry` (`fetch_rest.py`) lit le Wikipédia de l'adresse, russe et anglais compris.

**Ce qui l'attend, lui** (une question à la fois) :

1. **L'export** : les 51 lieux du Levant ne sont pas dans `content/` — c'est lui qui le lance.
2. **L'index de la mémoire** : à ranger avec lui (_« on verra ça demain »_) — 166 lignes, 20,5 Ko ; la limite de Claude
   Code est 200 lignes ou 25 Ko (le « 140 » écrit ici avant était une erreur de ma part).
3. **La côte du Levant sur sa carte** : dessinée seldjoukide, quand Acre, Sidon, Beyrouth étaient fatimides en 1100 et
   Tripoli aux Banu Ammar (non dessiné) — `levant.md`.

**CORE-486, sa demande pour plus tard** : la Carélie en hachures moitié Novgorod, moitié transparentes — le code d'abord
(le codeur), puis la carte : les Caréliens en « Aucune », Novgorod étendu sur eux, dans l'arbre principal. Elle remplace sa
décision du 18/11 « pas de hachures » : **la barrer dans `finland-topo.md` quand CORE-486 est fait.** Et, avec lui :
_« comment on peut faire une zone partiellement assurée »_.

**Ensuite, de mon côté** :

- **La Rus', seconde passe** sur la Chronique elle-même : Dorogobouj (1084), Snovsk (1068), Sosnytsia ; et Bouzhsk, que le
  congrès d'Ouvetitchi (1100) aurait donné à Davyd Igorevitch — un souvenir, à lire avant toute ligne.
- **Le Levant, seconde passe** pour la densité : Beyrouth, Sidon, Ascalon, Nicosie, Paphos, Samarra, Wasit… (aucune phrase
  datée sur leur page) ; les titres de Ridwan d'Alep, Duqaq de Damas, des Munqidhites de Shaizar à créer.

**Dessiner dans le Cartographe** : dans l'arbre principal (sa décision, 19/11), sur son serveur une fois qu'il a fermé la
carte, accordé avec le codeur (un seul auteur par carte) ; copier la carte avant (`years/<carte>.before-claude-<date>`),
la supprimer après sa validation.

## Les cartes — l'épique CARTO-400 (les vingt cartes de base)

| année      | où                                                                      | état                          | ce qui lui reste (le détail sur son ticket)                                              |
| ---------- | ----------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| 1000       | worktree `years/1000` (+ une copie non commitée dans l'arbre de `main`) | générée, build OK — CARTO-403 | Grande-Bretagne, Irlande, Sardaigne ; Bouyides et Danemark (grosses reprises) ; 6 côtes  |
| 1100, 1200 | `main`, publiées                                                        | les siennes                   | —                                                                                        |
| 1300       | `main`, publiée (`3c9e335`)                                             | retouchée par lui             | provenance ATLAS-408 : version Cliopatria v0.2.1 et article (Bennett et al. 2025) donnés |
| 1400       | worktree `years/1400`                                                   | générée, build OK — CARTO-404 | 6 îles partagées ; 5 grosses reprises ; 7 côtes                                          |
| 1500       | worktree `years/1500`                                                   | générée, build OK — CARTO-405 | Grande-Bretagne ; khanat de Crimée ; Naples, Raguse                                      |
| 1600       | worktree `years/1600`                                                   | générée, build OK — CARTO-406 | Grande-Bretagne et Irlande ; Danemark-Norvège, Crimée ; 53 pays seulement avec Wikidata  |

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
  scanne sur un disque externe en **exFAT** (nom à me donner) ; le premier atlas, _Les Balkans, atlas historique_
  (Hupchick, Cox), a 12 pages dans `/Volumes/mùùùmù/ATLAS-BOOKS/2026-11-10-0001.pdf`. Plusieurs séances = plusieurs
  PDF, que j'assemble avec `pypdf` (les originaux gardés).
- **Shepherd** (1911/1923) est un calque comme Cliopatria (sa décision, ATLAS-153).

## Ouvert, à sa décision

- **La règle d'arrêt de la recherche récursive** (ma proposition, « à confirmer » dans `/find-sources`).
- **Le registre des couleurs** tiré de sa 1100 (un pays garde sa couleur ; un vassal prend celle de son suzerain ; un
  successeur hérite) — proposé, pas lancé.
- **Les lacs partagés entre un pays et une terre sans maître** : le geste des lacs coupés, pas celui de l'île.
- **ATLAS-410** (dans Idées) : les frontières de chaque année publiées en traits, sous CC BY-SA.
