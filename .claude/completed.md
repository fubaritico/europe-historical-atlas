## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

### 2026-11-07 → 08 nuit — l'historien : Castille, Almoravides et Serbie ; les villes sur la carte ; la barre d'ouverture

La même plage que l'entrée suivante, prolongée : **07/11 18:57 → 08/11 04:29** (9 h 32) ; le chantier ouvert le 05/10 totalise
**226 h 34 sur 39 plages**. Deux instances en parallèle : celle du code (la suite de l'épique des villes, CARTO-367 à 388) et
moi, historien puis code. **Sur `main`, poussé jusqu'à `bfe560a`.** **Non commité** : CARTO-393, dans le worktree `city-status-ring`.

- **Mes tickets, essayés et validés par lui** : CARTO-384 (cliquer le point d'une ville, ‹entrée› ouvre sa boîte),
  CARTO-368 (les coordonnées), CARTO-389 (l'anneau de statut sur le point — sa légende : *« couleur, trait blanc, trait de
  statut épais, trait noir »* ; une ville où tout va bien ne change pas), CARTO-390 (les filtres de la liste filtrent la
  carte), CMS-391 (la case « Afficher la ville dans l'atlas », décochée par défaut, en tête de la fiche ; les 113 villes
  d'origine cochées par SQL avec son accord, sa base sauvegardée dans `cms.before-cms-391.db` — à lui de la supprimer).
- **L'historien** : soixante villes entre la Castille et les Almoravides, et la Serbie (`files/plans/sources/1100.md`),
  saisies dans sa base ; Lisbonne par la *Historia Compostelana*, trouvée en remontant les notes de Reilly. Ses règles :
  *« tu saisis tout ce que tu chopes »* (mémoire `collect-every-sourced-city`) ; **la BnF dans chaque lot** (*« je paye
  quand même pour cet abonnement »*) ; remonter des notes et des index d'un livre aux suivants (`/find-sources`).
- **CARTO-393, la barre d'ouverture** (à valider) : mesurée d'abord — le calcul, pas le téléchargement, fait l'attente,
  donc pas de flux ; quatre étapes pesées, le relief dit ses lignes. Revue : deux constats corrigés.
- **ATLAS-333** (l'instance du code, worktree `baked-years`) : les noms des pays cuits au build (`1dbb65e`) ; une année
  quittée mise de côté entière et revenue en une image (`d24b9e0`, essayé par lui : *« le cache fonctionne mieux, aucun
  problème »*) ; non commité : les découpes dans le worker et les mesures — une première visite de 1200 fige encore la page
  1 à 1,4 s, un retour coûte ~1 ms plus une image. Sa règle de la réglette : *une carte reste tant qu'on n'a pas atteint une
  autre date* ; ATLAS-392 créé (comment l'interface React et la carte se parlent).
- **L'audit des instructions du 08/11** : ses constats appliqués avec son accord (les tables de `/scenarii-to-code`, `years/1100`
  tel qu'il est, `next.md` sans copie du tableau, la règle des serveurs, une vingtaine de faits d'une ligne).
- **Mes fautes** : des métadonnées de sources écrites de mémoire (l'éditeur de l'*Alexiade*, un titre de Crnčić), des URL de
  Reilly non lues, un éditeur déduit d'un domaine — toutes corrigées depuis les textes ; un sabotage resté en place après
  une commande interrompue ; CMS-391 livré d'abord sans le formulaire maison de la fiche (vu par la revue) ; annoncé 11 s
  d'ouverture sur une machine chargée avant de mesurer 3,4 s au calme ; ma page de mesure prise par lui pour l'appli cassée.

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

> Older sessions (2026-09-12 → 2026-11-06) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
