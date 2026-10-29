## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-29 (nuit, suite) — le diagnostic de performance de l'atlas (ATLAS-303 → ATLAS-304)

Même plage au journal que l'entrée du 28/10 : **28/10 19:24 → 29/10 03:56** (8 h 32, le diagnostic de **02:39 à 03:56**) ; le
chantier ouvert le 05/10 totalise **139 h 43 sur 25 plages**. Rien de poussé (`5202f7f` reste la tête) ; notes, plan, glossaire
et script Trello à commiter. Sur Fable, effort maximal.

- **Le point performance**, mesuré dans mon onglet sur son serveur avec le chronomètre GPU du pilote : les trois flous
  **ensemble** (≈ 1 ms seuls, 9 à 18 ms ensemble, allumés dès que le zoom quitte 0), la boucle qui dessine à chaque
  rafraîchissement (8 ms de GPU au repos — la chauffe), les ombres des icônes sur le CPU (10–14 ms, 13 fois/s, hors champ
  comprises), la géométrie entière à chaque image (≈ 5,5 ms fixes), 2,2 s de fil principal bloqué au démarrage. Tout dans
  `files/plans/atlas/performance.md` (mesures, hypothèses marquées, remèdes non décidés, la recette de la sonde) et, en
  français, dans **ATLAS-304**, créé en tête d'À faire à sa demande pour commencer par là le 30/10 — *« un ticket de fixe
  […] en résonance avec ton MD »*.
- **Le script Trello** envoie description et commentaires dans le corps de la requête (9 ko dans l'URL : 414 de CloudFront) ;
  un verbe `attachments` lit et enregistre les captures d'un ticket ; « rendu à la demande » entre au glossaire.
- **Les noms des pays (ATLAS-301), à 4 h, à sa demande** — *« Opus tournait en rond, chaque retouche avec des effets de
  bord »* : les deux captures du ticket, l'atlas et l'algorithme lus côte à côte ; cinq écarts de construction (longueur
  enchaînée à la taille, l'espace = la terre et non l'enveloppe, la comparaison à sept poids, deux lignes, courbure et pente
  pénalisées) et six axes, dans le plan des noms et en commentaire sur le ticket. Rien de codé.
- **Mes fautes** : deux sondes empilées dans un onglet (leurs chronomètres GPU se brisent, résultats nuls) ;
  `delete window.innerWidth` ; une série de mesures de 37 s sous un outil qui coupe à 45 ; le zoom écrit dans
  `sessionStorage` écrasé par la sauvegarde au déchargement.

### 2026-10-29 (jour) — les noms des pays jusqu'au bout, le démarrage, le panneau en développement seulement

Plages au journal : **11:43 → 14:06** et **15:42 → 21:35** (8 h 16) ; le chantier ouvert le 05/10 totalise **148 h 22 sur 27
plages**. **Poussé**, de `2f60766` à `47d6fd4`, CI verte, le site déployé avec tout `main`.

- **Les noms** : la construction unique (ATLAS-301), puis ATLAS-308 (sous les icônes 3D), 309 (Venise), 310 (les pays sans
  place, dits en console) ; le nom court saisi dans le Cartographe (CARTO-307) ; un nom coupé qui se décale sur la terre
  libre (ATLAS-314) ; l'étiquette déportée sur la mer, ou sur un voisin avec sa ligne de points (ATLAS-315) ; les tribus en
  blanc sur liseré brun, gardé très fin de près (*« là c'est parfait »*) ; la case « Toujours le nom court » (CARTO-318).
- **Le reste** : le flou derrière un contrat (ATLAS-304/305) ; le halo des épingles (ATLAS-306) ; aucune frontière le long du
  bord (CORE-313) ; ‹Entrée› ouvre la fiche (CARTO-312) ; le relief d'abord puis tout en fondu (ATLAS-316) ; le panneau et le
  compteur sous `pnpm dev` seulement (ATLAS-317) ; le relief à 0,2 de près, son réglage ; le commentaire de clôture d'un
  ticket (comment, où, avant → après) dans la skill Trello ; une poussée annule la CI en cours (`concurrency`).
- **Mes fautes** : sa demande sur le démarrage mal lue (*« c'est épuisant de devoir répéter »*) ; trois `cd` ; un remède
  faux pour les Obotrites (le nom court ne s'écrit que là où le complet ne tient pas — je ne l'avais pas relu) ; *« c'est
  exactement ce que je veux »* pris pour l'option que j'écartais ; deux poussées à 15 s d'écart, l'ancienne déployée par-dessus
  la nouvelle. La revue à plusieurs agents sautée le soir, à sa demande.

> Older sessions (2026-09-12 → 2026-10-29 nuit, first half) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
