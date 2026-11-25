## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

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

### 2026-11-25, soir — le codeur : le Cartographe derrière le compte du CMS, l'essai sur une copie sans le dev

Session **25/11 18:10 → 20:43** (2 h 33 ; la plage du jour au journal, 12:26 → 20:42, est partagée avec la session de
l'après-midi) ; le chantier totalise **419 h 39 sur 64 plages**. Rien n'est poussé (le dev : à la fin de tout).

- **CARTO-535 Fait**, fusionné (`9a6965d0`, `aeb83af1`) : la connexion, le chrome grisé, la session prolongée, expirée,
  le CMS éteint, la réponse illisible (ses deux décisions du soir) ; puis, le ticket rouvert, le relief préparé derrière
  l'écran de connexion, la sauvegarde automatique qui suit la session, « Enregistrer d'abord ? » avant de se
  déconnecter. Deux revues ; essayé à la main sur une copie de la base ; scénario `s23` (`a983f0d5`).
- **REPO-542 À valider** : `pnpm trial:start` / `trial:stop`, un CMS sur une copie avec un compte jetable ; commité sur
  sa branche (`9a3ef960`), pas fusionné ; attend ses deux règles de permission.
- **Mes fautes** : CARTO-535 fermé sans avoir relu son tableau des états (rouvert, complété le soir même) ; l'essai sur
  `localhost` a remplacé puis effacé sa session de l'admin du CMS (d'où la règle `127.0.0.1`) ; un `cd` ; un titre de
  commit trop long.
