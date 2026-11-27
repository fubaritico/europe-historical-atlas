## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-26/27 — l'historien : les empreintes finies, le Maghreb et les chaînes de 1200, sept zones de 1300

Session **26/11 14:08 → 27/11 17:35** (plages 13 h 09, 29 min, 14 min, au journal ; partagées avec le codeur). Le
détail est sur les tickets et dans `next-historian.md`.

- **REPO-540 Fait** : 573 906 empreintes, toute la bibliothèque ; puis deux réindexations (25 508 et 146 572 passages).
  REPO-569 créé (indexer chaque livre au fil de la recherche).
- **1200** : CARTO-570 (le Maghreb, 57 fiches) et CARTO-571 (18 liens de vassalité, la page des vassaux directs) Fait.
- **1300** (épique CARTO-572, sa demande) : CARTO-573 à 579 Fait — 4 809 fiches sur sept zones (Ibérie, Italie, îles
  Britanniques, France, Empire ouest et est, Hongrie-Pologne), Albert Ier souverain. CARTO-582, 583 au Backlog (après
  le 2/12) ; la retouche des cartes : CARTO-580 (1200), CARTO-581 (1300), « À faire », ensemble.
- **Outillage** : la ligne d'état suit l'arbre (`EnterWorktree`) et note le contexte de la session ; le journal refuse
  une tentative fautive à l'écriture ; `pnpm oracle:start|stop` ; le dev a posé la règle `mcp__cms`.
- **Mes fautes** : un push qui a emporté CARTO-498/567 du codeur avant son essai ; une citation retapée (« tiranìa »),
  rattrapée par la comparaison ; deux fausses alertes de ma veille ; « arrête la case à cocher » mal compris.

### 2026-11-27 — le codeur : les six fusions de doublons du CMS

Deux plages courtes (13:55 → 14:25, partagée avec l'historien ; 17:20 → 17:35), au journal. Rien de code.

- **CARTO-571 et CARTO-575** : la source Fournier 1891 (5856 garde 49) et cinq territoires de 1300 (Eu, Rethel,
  Sancerre, Montpellier, Laval) fusionnés par `pnpm cms:merge` sur l'ordre du dev, le sens lu sur ses commandes du
  ticket ; 13 fiches reportées, une copie de la base avant chaque fusion. Les deux noms anglais divergents tranchés par
  l'historien, son export poussé (`3c1d8a28`).
- **Mes fautes** : la boucle lancée sous zsh passait les trois arguments en un seul — refusée par la commande, rien
  d'écrit.
