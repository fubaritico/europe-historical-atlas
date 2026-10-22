## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-22, le soir — `ui/` mergé, `?break=`, « entité politique », les sources, Payload vérifié

Plage au journal **22/10 16:53 → 19:43 (2 h 49, 151 actions)** ; le chantier ouvert le 05/10 totalise **106 h 08 sur
19 plages**. **7 commits** `403a72a`..`2e26931`, **non poussés**. La seconde moitié s'est faite **à distance** (Remote
Control) : le dev l'a jugée *« ingérable »* et a fermé la session.

- **CARTO-267** testé, commité, mergé, worktree supprimé avec sa permission → Fait. **ATLAS-159** testé en cinq gestes
  écrits pour lui (la première consigne, floue, l'a fâché : *« faut surtout pas être précis »*) → Fait.
- **`?break=<zone>`** (sa demande) : chaque boundary a une zone typée et stable ; en développement seulement, vérifié dans
  le build. Idée des feature flags → CARTO-268.
- **« entité politique »** remplace « pays » dans le Cartographe — sa décision ; le rang `country` et l'atlas gardent
  « pays », mon choix, noté comme tel au glossaire.
- **Les sources** : sa règle, *« on ne peut pas fermer la porte derrière nous »* — chaque année cite toutes ses sources ;
  liste sur ATLAS-152, skill `/create-data-mention` (sa demande), bibliothèque de ses atlas `files/plans/sources/`. La
  carte des Chaddadides (CC BY-SA) se déclare redessinée de Hewsen 2001 → référence, pas calque.
- **Planification** (sa demande, à distance) : palier 2 de DESIGN-262 conçu → CORE-270 (Backlog), barème des sources
  tranché par lui ; **CONTRIB-218** Payload vérifié dans le code → À valider.
- **Mes fautes** : un `git add` de tout ce qui était modifié a embarqué ses données de 1100 dans un commit (défait par
  `reset --soft`) ; « litiges » pour une guerre d'édition ; un éditeur écrit de mémoire dans une mention ; des réponses
  qui renvoyaient à « un document » alors qu'il était loin de son écran.

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

> Older sessions (2026-09-12 → 2026-10-22, the morning) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
