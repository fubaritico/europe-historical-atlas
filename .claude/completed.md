## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

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

### 2026-11-12 nuit — le codeur : ses retours de dessin, les outils débloqués, la 1100 des Balkans poussée

Plage **12/11 21:36 → 13/11 02:24** (4 h 48, dans la plage du journal 13:36 → 02:19) ; le chantier ouvert le 05/10 totalise
**274 h 29 sur 45 plages**. **Poussé** : `main` = `3e5d00c` (huit commits).

- **La soudure** qui replie une épine au lieu de refuser (`b0baf3f`, CARTO-425) ; **le creusement par différence de
  surfaces**, au suzerain et à ses co-vassaux (`dad8373`, CORE-426) — la Zachlumie, la Bosnie creusées ; **la fermeture
  avec ⌥** qui prend la terre de la famille (`33fe68b`) ; **la retouche** qui finit au clic, un voisin effondré qui garde
  ses points (`4e563cb`) ; **la vue et les filtres gardés au rechargement** (`c0bec21`, CARTO-427, Fait). Ses mots :
  *« ça fonctionne, même entre fichiers… vraiment très pratique »*, puis *« l'Atlas fonctionne… félicitations »*.
- **Revue à six agents** : constats moyens corrigés (un contour ouvert pris pour voisin, le stockage de l'onglet non
  protégé, un échec des villes qui effaçait la sélection, la transaction du creusement copiée) ; bas ouverts, notés.
- **La 1100** : la Croatie, la Bosnie, la Zachlumie, la Dioclée sous Byzance, les exclaves hongroises (`81c7d8f`) — elle
  cassait l'atlas (un coin d'exclave à 40 m hors de la Croatie, le trou débordant) ; corrigée de 60 m (`3e5d00c`).
  Tickets : CORE-428 (diagnostic des cartes dans la CI), CORE-429 (simplifier les points), ATLAS-430 (la côte à la publication).
- **Sa règle** : *« moi ce que je veux c'est la liberté de manipulation »*, et l'outil choisi reste choisi.
- **Mes fautes** : des règles de ses anciennes remarques expliquées comme « ses règles » ; des hypothèses données sans
  reproduire (la côte, le focus) avant de refaire son geste au bon endroit ; une bascule d'outil ajoutée sans qu'il la
  demande, retirée ; la carte de 1100 commitée et poussée sans la vérifier dans l'atlas ; un `rm -rf` glissé dans une
  commande (refusé) ; *« ton outil de merde »*, *« c'est super fatiguant »*.

