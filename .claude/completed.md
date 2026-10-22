## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-22, l'après-midi — tout le React du Cartographe dans `ui/` (CARTO-267)

Le journal ne compte que **13:16 → 13:56 (78 actions)** ; le travail a duré plus longtemps, une partie n'a pas été
journalisée — aucune durée inventée ici. Fait dans un **worktree** (`~/Desktop/WebstormProjects/europe-map-ui`, branche
`ui-folder`), **indexé, pas commité** : le dev testera à la reprise.

- **Sa demande** : *« pour qu'il n'y ait pas 50 dossiers à la racine du projet »*, tout ce qui est React dans `ui/`, et
  voir ce qui sert dehors. Puis, sur la fiabilité : *« si vraiment un script est fiable, tu utilises un script »* — prouvé :
  le graphe des imports (résolu par le compilateur) après le déplacement est celui d'avant passé par la table, 1 234 liens ;
  les mêmes tests par fichier ; gate verte, 4 620 tests.
- **Ses décisions** : les couches ne peuvent plus importer `ui/` (lint, gardé dans `boundaries.test.ts`) ; tout `ui/` refuse
  `main` et l'atelier ; *« les CSS, c'est de l'UI »* → `focusOrigin` dans `MapArea/utils`.
- **Mes fautes** : un premier traceur à expressions régulières qui ratait les `?raw` ; une première règle (« ce qui ne sert
  qu'à l'UI y va ») qui avalait tout `canvas/`, remplacée par « une couche reste entière » ; un `why` du lint cassé.

### 2026-10-22 — tout le Cartographe en fr/en, des catalogues JSON par portée, la langue par un provider

Une plage au journal, **22/10 10:20 → 13:14 (2 h 53, 376 actions)** ; le chantier ouvert le 05/10 totalise **102 h 25 sur
18 plages**. **1 commit, `bc0be07`, non poussé** à la demande du dev (*« tu commites, tu ne pousses pas »*). Le dev
n'a pas lancé le Cartographe : il réorganisait le dépôt du design system en parallèle.

- **ATLAS-159, 3b et 3c d'un bloc** — après une première revue, le dev : *« il ne faut pas qu'il y ait de mélange entre
  les langues […] c'est qu'il n'y a pas eu extraction de label »*. Tout texte vient d'un catalogue : panneaux,
  dialogues, barres, rail, carte, canevas, noms d'étapes, couche disque, sélecteur de couleur du DS (ses `labels` et un
  `describeColour` porté de ses seuils, testé mot pour mot contre l'original). La raison technique d'un échec va à la
  console, la phrase le dit (ma décision, présentée). Chaque `select` fermé nomme tous ses membres : le test a trouvé
  une soudure sur une frontière juste par hasard.
- **Ses quatre remarques de structure, appliquées** : pourquoi des hooks et des `useMemo` pour traduire, *« elle est où la
  locale ? »* → un `LocaleProvider` sur un store, plus de memo (`core` garde ses traducteurs) ; les fonctions à côté des
  composants → `<Composant>/utils/` ; `components/shared/` → dissous, ce qui sert à plusieurs remonte à côté de
  `components/` ; fr et en dans un même fichier → `i18n/fr.json` + `en.json` par portée, livrés tous deux. Mémoire
  `scope-everything-to-its-component`.
- **Mes fautes** : trois `cd` ; une règle de lint inventée pour imposer sa convention (*« qu'est-ce que c'est encore que ce
  truc »*) ; des `useMemo` et des mots figés dans la langue de départ ; `errorReason.ts` supprimé sans chercher dans les
  `.tsx` ; un sabotage de vérification qui modifiait les deux langues ; un exemple de couleur calculé en HSV au lieu de HSL.

> Older sessions (2026-09-12 → 2026-10-21, the evening) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
