## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

### 2026-11-11 — l'instance du code, sans rôle : les rôles des sessions, l'identifiant byzantin, les plans d'automatisation

Réveillée par le message de l'historien le **10/11 à 19:17**, puis une plage **11/11 20:57 → 23:45** (2 h 47) ; le
chantier ouvert le 05/10 totalise **261 h 44 sur 44 plages**. Pas de `/start-session`, aucun rôle : la session a fait du
management toute la journée (sa remarque). **Poussé** : `main` = `43e73f7`. **Sur `main`, non poussé** : `70d4760`,
`8e4a7be`, `eb81084`, `a467cc7` ; les deux plans réécrits et le glossaire, **non commités**.

- **L'Adriatique de l'historien vérifiée** en lecture seule dans le CMS : 70 lieux, 69 fiches, sources 579–669, 171 lignes
  toutes citées ; Himarë sans fiche, voulu ; sa note dit 90 sources, la base en a 91.
- **L'Empire byzantin porte `Q12544`** (vérifié sur Wikidata ; c'était `Q112039853`, ses relations extérieures) : en 1200 et
  1300, **corrigé par lui** avec d'autres identifiants de l'audit, commité `43e73f7` ; en 1100, **corrigé par lui** dans sa 1100
  en cours (la Croatie ajoutée), non commitée — ma correction `03d9f19` sur `coder` tombera d'elle-même.
- **Les arbres renommés** : `baked-years` → `coder`, sa branche aussi (`70d4760`).
- **Les rôles** (REPO-419 pour la suite) : `.claude/agents/{coder,historian}.md` (texte vide, `/start-session <rôle>`),
  `.claude/roles/<rôle>.md`, le codeur par défaut ; **un rôle se prend aussi par une phrase** (« commence une session en
  tant qu'historien », « prends le rôle du codeur »), noté par arbre dans `.claude/state/role` ; le garde-fou de l'historien
  (aucune écriture sous `packages/`), le rôle rendu après `/clear`, la ligne d'état rôle · arbre · branche ; le contrôle du
  commit lance les 74 tests de `.claude/` (`8e4a7be`, `eb81084`). Revue : neuf constats, le tableau donné.
- **L'automatisation** (REPO-418) : `files/plans/automation.md` (les briques, où tourne une exécution, l'inventaire) et
  `files/plans/automation-online.md` (l'agent contributeur, la chaîne des villes, les canaux, la validation). **Ses
  décisions** : l'agent passe par la même porte qu'un contributeur ; une affirmation sans concurrente, à deux sources
  indépendantes, passe « attestée, non arbitrée ». Trois termes au glossaire.
- **Expliqué à sa demande** : le modèle, le harness, le provider, l'open-weight, OpenCode ; ce que coûte une requête et un
  sous-agent ; les agents dans le cloud.
- **Mes fautes** : des choses encore désignées par un numéro dans les deux plans (« stage 2 », « rung 2 », « row 6 »),
  réécrits avec des noms ; des pages de la documentation de Claude Code citées comme des fichiers du dépôt ; une commande de
  test fausse (`node --test` sur un dossier, sous Node 24) écrite avant d'être essayée ; un message de commit trop long.

> Older sessions (2026-09-12 → 2026-11-10, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-12 — le codeur : le rôle par session, la sécurité, la coupe par la terre (CORE-421), trois cartes reconstruites

Plage **12/11 13:36 → 21:34** (7 h 57) ; le chantier ouvert le 05/10 totalise **269 h 43 sur 45 plages**. **Poussé** : `main` =
`b867422`. **Sur `main`, non poussé** : `fc72157`. **Non commité** : la Croatie sortie de la Hongrie dans la 1100.

- **Les rôles** : une note par session au lieu d'une par arbre — ses deux consoles se volaient le rôle ; le pourcentage du
  contexte dans la ligne d'état (60/75/85/95) ; `idleCompaction` coupé, par lui (`40f4e01`). Vérifié par lui côte à côte.
- **La sécurité** : une faille ouverte n'est jamais écrite dans un fichier publié ; `SECURITY.md` ; le signalement privé de
  GitHub activé, sur son accord (`a1d4b1e`). Le dépôt : un produit, plus un portfolio (mémoire corrigée).
- **ATLAS-396, Fait** : la pose mesurée en ligne, 327 ms, qu'il ne sent pas ; la pose en morceaux en ATLAS-420 (Backlog).
- **CORE-421** : la mesure des côtes ; la coupe par la terre dans les deux applications, une seule côte (`a1a7ea9`) ; 1100,
  1200, 1300 reconstruites — îles nettoyées et réattribuées, surfaces en mer de 15 km, union, lamelles retirées, cinq fois
  moins de points (`6638a30`) ; les scripts (`809d629`). Revue à cinq agents, tableau donné. Ses mots : *« on a frôlé le
  rabbit hole »*, puis *« ton script fonctionne bien, je valide 1200 »*.
- **L'historien vérifié** en lecture seule : l'arrière-pays croate (CARTO-417) et le premier lot de 1100 — propres.
- **Le soir** : la Bohême et la Croatie creusées par script dans leurs suzerains ; CARTO-424 et CARTO-425 en À faire. Ses
  mots : *« ton outil de merde »*, *« il commence à me prendre la tête »*.
- **Mes fautes** : ATLAS-396 mesuré alors qu'il ne sentait rien ; deux `cd` ; une première fusion par « couture » qui
  perdait 1,5 million de cases, mon contrôle ne mesurant la perte que sur les îles ; deux scripts qui sautaient Byzance et
  Venise (le champ `open` mal lu) ; le masquage lancé dans mon Cartographe sans le prévenir ; le creusement écrit pendant que
  sa page était ouverte (écrasé à la première tentative).

