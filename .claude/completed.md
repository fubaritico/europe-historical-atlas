## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

### 2026-11-08 — l'historien au laboratoire : la Catalogne de 1100 finie et publiée, le retracé libéré, 1200 en ligne

Une plage, **08/11 14:03 → 19:13** (5 h 09) ; le chantier ouvert le 05/10 totalise **231 h 56 sur 40 plages**. Instance
historien, worktree `historian` (branche `historian-1108`, synchronisée sur `main`). **Sur `main`, poussé, CI verte, site
vérifié** (`196eed5`).

- **La Catalogne de 1100, finie** : Lérida creusée autour d'Almenar, la lame de Pilzán soudée, Balaguer à Lérida ; **lui** a
  passé Sidamon, Torregrossa, L'Espluga et Barberà à Barcelone, puis Camarasa en enclave (son arbitrage, `sources/1100.md`).
  Restent Tamarit (dans la mer, une source) et Tarragone (vide) : rien dessiné, par la règle. Publiée (`3a33012`).
- **Sa méthode, après une heure à se battre avec l'outil** : *le pays qui subit d'abord, puis le pays visé, sur les mêmes
  points* — un seul pays par geste (skill `gestures.md`, mémoire `collateral-polity-first`).
- **Le retracé libéré** (`5b8c0c0`), à sa demande (*« faut rien interdire »*, *« tu bascules de mode au clic sur un point »*) :
  plus de refus « repasse par une ancre que garde… » (les boucles parasites coupées, `core/editor/strayLoops.ts`) ; le point
  sous le pointeur prime sur la côte ; un clic sur la frontière du pays visé fait avancer le départ. Revue : 10 constats, 8
  corrigés, 2 ouverts (`known-issues/cartographer.md`).
- **`/use-cartographer` 2.0** (`11f7267`) : mesurer → décider → dessiner, sept scripts `.mjs` (74 tests), la table des
  décisions ; glossaire, plan des frontières.
- **1200 publiée** (`196eed5`, sa décision : *« rien de bloquant dans le fait d'ajouter des années »*) ; les règles qui
  l'interdisaient réécrites, `.gitignore` dit comment publier une année.
- **Le pilote par script** (à sa question *« qu'est-ce qui t'empêche d'aller vite ? »*) : les clics envoyés au canevas depuis
  la page, la barre lue après chacun — l'Islande (1 170 points) et Bornholm redessinées en secondes. **Puis ma série
  automatique a abîmé 1200** (Skye : toute la Grande-Bretagne donnée à Mann ; restes de contours aux Lofoten ; Samsø effacée) —
  stoppée par moi, puis par lui ; rien de commité, la copie d'avant intacte.
- **Ce qu'il a vu en arrêtant** : 1200 superpose des pays de plusieurs années (Mann, Alba, Norvège) — à nettoyer d'abord.
- **Mes fautes** : neuf corrections au coup par coup qui déplaçaient le piège au lieu de l'ôter ; la barre de statut
  proposée comme signal alors qu'il ne la lit jamais ; une série lancée sans vérifier « closed » ni l'emprise de l'île.

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


> Older sessions (2026-09-12 → 2026-11-07) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
