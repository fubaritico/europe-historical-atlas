## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

### 2026-11-07 — les filtres avancés des villes, la skill pour dessiner, les lots de l'historien vérifiés

Une plage, **07/11 18:57 → 20:19** (1 h 22) ; le chantier ouvert le 05/10 totalise **218 h 19 sur 39 plages**. **Sur `main`,
non poussé** : `c6096fe` (CARTO-370), `b6d0a2a` (la skill), et le commit de clôture ; l'historien a commité `a070c03` et
`d7b6276` (ses notes de sources).

- **CARTO-370 fait, essayé et validé par lui** (*« c'est beaucoup plus pratique comme ça »*, *« je valide le 370 »*) :
  l'entonnoir (son dessin, de son projet React Native) ouvre « Filtres avancés » ; à ma proposition, prise par lui
  (*« plus on peut visualiser les choses mieux, c'est tout l'intérêt de ce panneau »*), la rubrique « Pas encore sur la
  carte » et « Sans détenteur » ; après son essai, **le filtre en tête de la fenêtre** (*« il nous faut le quick filter
  pour les listes longues »*). Revue à cinq relecteurs, constats corrigés ; essayé par moi sur 1100 (le comté de Barcelone,
  12 villes, toutes à déclarer).
- **La skill `/use-cartographer`** (`b6d0a2a`), à sa demande (*« une skill »*, des mots déclencheurs « dessine »,
  « retouche ») : le mode d'emploi vérifié contre le code — une carte s'enregistre seule deux secondes après chaque geste,
  d'où un seul agent par carte et une copie avant d'y toucher ; le journal `drawing-as-claude.md` déplacé dans
  `references/journal.md`, **toujours local** (sa décision du 12/10).
- **Ses décisions** : l'historien **peut lire une copie en ligne** d'un livre sous droits (*« peu importe la manière, on a
  besoin de références »*), jamais liée dans la base (`/find-sources`) ; la bulle du détenteur et de son suzerain au survol
  du point (CARTO-367). Nouveaux tickets : CARTO-381 (panneau flottant hors de la fenêtre), CARTO-382 (le tri, dans
  l'épique), REPO-383 (des ports fixes).
- **L'historien** : les lots « Navarre et Aragon » et la source 286 (Monsalvo Antón) vérifiés en lecture seule ; Horta
  corrigée ; il a retouché la frontière Aragon–Saragosse dans le Cartographe (non commité, à lui).
- **Mes fautes** : un `cd` dans une commande ; tout fait dans son dépôt **au lieu d'un worktree** pendant que son
  Cartographe tournait (il l'a relevé) ; ‹échap› écrit « vérifié dans l'appli » sans l'avoir essayé — corrigé avant le
  commit.

### 2026-11-06 — le tableau remis d'aplomb, 1100 refaite depuis Cliopatria publiée

Deux plages, **06/11 11:26 → 15:24 et 17:30 → 18:22** (4 h 49) ; le chantier ouvert le 05/10 totalise **216 h 48 sur 38
plages**. **Sur `main`, poussé** : `b02ce87` (1100 depuis Cliopatria) et le commit de clôture.

- **Le tableau relu ticket par ticket avec lui** (*« le board est ta mémoire »*) : une quinzaine de tickets archivés — sans
  objet (CARTO-182, 183, 185, 186, 187, CORE-211, ATLAS-143…), doublons, faux problèmes au regard du couplage lâche
  (CARTO-173, 175, 177, 178) ; réécrits avec leurs scénarios (CARTO-188, 189, 192) ; des tickets de correction
  (ATLAS-373, CARTO-375, 377, 380, CARTO-180) ; de nouvelles épiques (ATLAS-329, ATLAS-153 « les trois couches »).
- **Ses règles du jour** : une erreur s'affiche dans une fenêtre, la console gardée (`rules/error-handling.md`) ; la fiche
  porte le détenteur le plus probable avec son QID ; la recherche continue jusqu'au nom (*« insister, insister »*,
  `/enter-in-cms`, et `/find-sources` de l'historien) ; la vérification d'une année ne bloque jamais, même la CI ;
  `/trello` compare le tableau au code et aux commits à chaque début et fin de session.
- **1100 refaite depuis Cliopatria, publiée** (`b02ce87`) — celle partie d'Euratlas reste dans l'historique, son choix.
  L'historien : lots « Catalogne » et « Navarre et Aragon » vérifiés ; JSTOR ouvert, le Pass de la BnF commandé (CMS-362).
- **Mes fautes** : CARTO-180 dit « vrai blocage » sur une mauvaise lecture de son « non » ; une explication de « moitié »
  qu'il n'a pas comprise (ATLAS-143) ; lui avoir prêté un refus d'outil ; « à toi de le passer dans Fait » pour un doublon.

> Older sessions (2026-09-12 → 2026-11-06 nuit) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
