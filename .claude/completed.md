## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-25/26 — l'historien : onze zones de 1200 saisies, l'oracle construit sur Qdrant, l'agent de l'atlas découpé

Session **25/11 12:26 → 26/11 01:39** (13 h 12, 7 052 actions, au journal ; plage partagée avec le codeur). Le détail :
`next-historian.md` et les notes de région sur Acer.

- **La carte de 1200** : Anatolie (526), Empire ouest (525), Empire est (528), Levant (529), Italie (534), Scandinavie
  (541), Hongrie-Pologne (543, Opole-Nysa compris), Rus' (552) saisis par des chefs de zone (5 puis 3 agents), chacun
  à 0 défaut, exporté, poussé, en Fait ; avec la France et les Balkans d'hier : **5 940 villes**, 2 283 alertes, rien
  dessiné (sa décision : toutes les villes d'abord, la correction ensemble, mémoire `all-cities-first-then-the-map-together`).
- **L'oracle** (épiques REPO-538, REPO-545) : catalogue, index FTS5, Qdrant local dans une image APFS sur Acer,
  `bge-m3` sur un Ollama à moi (11435), filtres zone/siècle/langue, MCP pour les agents, canal obligatoire de
  `/find-sources` et du portail ; il suit la session (REPO-544) ; ses PDF texte et OCR Vision (REPO-553). Reste
  REPO-540 (les empreintes, ~18 h). Agents d'équipe sans `CLAUDE.md` ; jauge de la semaine sur la ligne d'état.
- **ATLAS-557** (l'agent de l'atlas) créé et découpé en 8 tickets, le prompt pour Claude Design sur son bureau.
- **Mes fautes** : un push pendant une CI ; une réindexation qui a arrêté le calcul ; deux zones saisies malgré le
  portail ; Python avant sa demande de TypeScript ; un chef relancé tandis qu'il voulait la pause.

### 2026-11-25/26, nuit — le codeur : l'écran de départ façon Illustrator, la barre du haut, l'onglet de la carte

Session **25/11 20:45 → 26/11 00:22** (3 h 37 ; la plage du journal, 12:26 → 00:22, est partagée avec les deux
sessions d'avant) ; le chantier totalise **423 h 19 sur 64 plages**. **Tout est poussé** (le dev : « tu peux tout
pousser ») ; CI verte jusqu'au déploiement, Sonar compris (run 45717522108).

- **CARTO-536 Fait** (`a359c014`, fusion `d1ecd09d`) : l'écran de départ, refait d'après la capture d'Illustrator ;
  plus de carte par défaut ni de `?map=` (la carte retenue dans l'onglet) ; « Nouvelle carte », « Fermer la carte » ;
  ses icônes choisies par le dev sur l'établi. Revue (un défaut grave corrigé : une nouvelle carte du nom de la carte
  ouverte la remplaçait) ; essayé sur une copie de la base (`s24`). CARTO-537 couvert par lui.
- **CARTO-555 Fait** (`032fc7cd`, `0b8d34f6`) : la barre du haut — le nom au centre, les menus contre l'icône, plus de
  boutons de fichier, un menu grisé en entier ; les cartes récentes défilent ; plus de formulaire qui clignote à
  l'ouverture d'une carte ; « Se déconnecter » ferme la carte.
- **CARTO-556 Fait** (`ba40bcd1`) : la croix de l'onglet ferme la carte ; `DocTab` et `DocTabs`, prêts pour plusieurs
  cartes ouvertes ; l'onglet nomme la carte, plus son année.
- **CARTO-554 À faire** : les vignettes des cartes récentes, mises de côté par le dev.
- **Mes fautes** : « comme Illustrator » interprété au lieu d'être reproduit, trois fois, jusqu'à sa colère (mémoire
  `reproduce-the-reference`) ; des icônes dessinées en carrés, floues et crénelées ; dit à tort que l'onglet portait le
  nom de la carte ; deux titres de commit refusés.
