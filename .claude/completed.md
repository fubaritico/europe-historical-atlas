## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-28 soir → 29/10 nuit — les noms des pays, les frontières, le flou : un rendu de jeu vidéo (ATLAS-303)

Plage au journal : **28/10 19:24 → 29/10 02:35** (7 h 10, une seule plage) ; le chantier ouvert le 05/10 totalise **138 h 21
sur 25 plages**. **Poussé** : `ff2cc69`, `6a6cc21`, `f158f73` (noms, étapes 1 à 3a), `fd1ab77` (les noms posés sur la carte),
`5202f7f` (frontières, flou, filigrane). Tout est consigné dans **ATLAS-303** (rendu au plus près d'un jeu vidéo), qui renvoie
à ATLAS-301, ATLAS-145 et ATLAS-302.

- **Les noms** (ATLAS-301) : Fondamento, multiply 75 % ; un nom par morceau, le complet s'il tient, sinon le court —
  *« Kingdom of France → K. of France »* ; placement ~30 s → ~5 s ; débordement sur la mer et un peu sur les voisins, jamais
  sur un autre nom ; *« je veux des noms, qu'on lit, qu'on comprend »* (aucune abréviation) ; *« dès que les vassaux ils
  apparaissent, tout apparaît »* (aucune apparition progressive). Leçon pour la contribution : un nom d'usage court dès la
  saisie, comme Crusader Kings.
- **La séance des frontières** (ATLAS-145) : parchemin fin de loin ; brun + filet clair de près ; la frontière non revendiquée
  en brun fin, parchemin côté non revendiqué, parchemin à 50 % au-delà ; vassaux en pointillés blancs.
- **Le flou** (ATLAS-302) : un flou d'image sur les frontières, l'encre des noms et les icônes 3D, chacun son réglage, ombres
  nettes (*« le marron, le blanc et le marron, ils se fondent un petit peu […] sans être plus épais »*) ; le filigrane des
  noms à 40 % au zoom maximal, pour les villes.
- **Mes fautes** : l'empilement de règles qui l'a perdu (abréviations « DAN », vagues, seuil de lisibilité) — *« j'ai
  l'impression qu'on ne peut pas y arriver »* ; deux chiffres devinés dans des tests ; un `cd` ; une demande répétée après
  un refus prise pour une nouvelle (*« pas again »*) ; un dégradé posé dans chaque trait alors qu'il voulait un flou d'image.

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
  « rendu à la demande » entre au glossaire.
- **Mes fautes** : deux sondes empilées dans un onglet (leurs chronomètres GPU se brisent, résultats nuls) ;
  `delete window.innerWidth` ; une série de mesures de 37 s sous un outil qui coupe à 45 ; le zoom écrit dans
  `sessionStorage` écrasé par la sauvegarde au déchargement.

> Older sessions (2026-09-12 → 2026-10-27 nuit) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
