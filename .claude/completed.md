## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

### 2026-11-10 soir — l'historien : l'Adriatique de 1100, Novare sur un témoin de 1100, le lot géographique saisi

La session ouverte à 17:05, dans la plage du journal **10/11 12:06 → 20:59** (8 h 53, partagée avec l'instance du code) ;
le chantier ouvert le 05/10 totalise **257 h 26 sur 43 plages**. **Sur `main`, non poussé** : `5a4859c`, `3462c6c`.

- **CMS-414, rattrapage fait** : 699 lieux sur 706 ont leur pays, 665 leur région ; 41 cas à lui (ticket en À valider).
- **Le nord-ouest de l'Italie corrigé** (règle de date) : Alba sans sa ligne de 1179, Novare et Trecate sur **Savio 1898,
  p. 266-267** (l'évêque Anselme en 1099-1100) ; deux sources orphelines supprimées par lui dans l'admin.
- **CARTO-401, Fait** (1300, son « très satisfaisant » du 09/11).
- **L'Adriatique de 1100** (sa demande : *« toutes les villes que Venise tenait en 1100 »*) : candidates lues dans Wikidata
  (30 km de la mer, ≥ 1 000 hab., le Monténégro entier, une ville par île), 26 lots, 393 lieux, **74 existaient** ;
  2 231 citations revérifiées ; **saisis** : 70 lieux, 69 fiches, 90 sources ; exportés (`3462c6c`). Les écarts avec sa
  carte : `files/plans/sources/1100-adriatic.md`.
- **Ses décisions** : la règle de date (*« pour l'instant, à moins qu'on trouve d'autres sources »* — une tenure commencée
  avant et courant en 1100 compte), écrite dans `/enter-in-cms` ; les îles de la mer Égée plus tard ; ratisser large dans
  l'arrière-pays, par la date et non la population (*« des villes, des villes, des villes »*).
- **Les identifiants Wikidata des cartes corrigés** sur sa demande (1000, 1100, 1200, 1300 ; Empire byzantin Q12544 et les
  onze de l'audit `wikidata-1100.md`) — **non commités**, après son coup d'œil.
- **Tickets** : CMS-416 en Idées (une fiche par détenteur, la taille de la base).
- **Mes fautes** : un `cd` dans une commande Python ; un premier filtre des quartiers qui jetait Rijeka et Herceg Novi
  (repris) ; un message de commit trop long refusé par le contrôle ; deux agents qui ont mis un `cd`.

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
