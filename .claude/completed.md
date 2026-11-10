## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

### 2026-11-10 — l'instance du code : les bandes cuites, les cartes suivantes tout de suite, la carte qui s'arrête, une icône

Une plage, **10/11 12:06 → 19:00** (6 h 54, partagée avec la session de l'historien) ; le chantier ouvert le 05/10 totalise
**255 h 27 sur 43 plages**. Worktree `baked-years`, branche `atlas-396-speed`. **Sur `main`, poussé, CI verte, site déployé**
(`622b77f`).

- **ATLAS-407, Fait** (`763ad97`) : mesuré — l'ondulation ne coûte rien, la distance de chaque point à sa frontière
  0,8–1,2 s ; les distances calculées à la publication (`bands.bin`, compressé : l'hébergeur ne compresse pas un `.bin`,
  ATLAS-411). **Pas de secours** (sa question : _« pourquoi le fichier manquerait ? »_). À son test, Chrome et Node
  arrondissent la projection autrement : **contrôle pays par pays** (8 pays sur 106 recalculés dans Chrome) ; et
  **CORE-412**, une projection identique partout (_« ça veut dire qu'on maîtrise vraiment tout »_).
- **ATLAS-396** (`d83dbb8`, `f0e32e5`, reste En cours) : sa remarque — _« ça fait tout depuis le début »_. Le registre des
  préparations en cours, le clic qui reprend la préparation, le calcul tout de suite, son modèle d'un objet _« qui se met
  en pause, qui reprend »_ ; seule la pose attend le calme : un appui **sur la carte**, la molette, une touche (_« cibler
  l'événement »_, la réglette se fera glisser bouton tenu). La pose en morceaux, à mesurer d'abord. _« Ça marche très
  bien »_.
- **ATLAS-326, Fait** (`c4f957a`) : la carte s'arrête quand le pointeur sort de la page ou la fenêtre perd la main —
  _« ça soulage »_.
- **REPO-415, Fait** (`f70b725`, `442dacf`, `2628809`) : une seule icône d'onglet, celle du CMS, dessinée par `core` ; et
  dans le titre du README.
- **Publié sur sa demande** : sa 1100 (`2ccd7d1`), l'export du CMS (`622b77f`), le style d'un bouton du CMS (`86798e4`).
  Vérifié en lecture seule : l'Italie de 1100 et le lot géographique saisis par l'historien.
- **Sa décision** : moi l'atlas, l'historien les recherches et le Cartographe (mémoire `roles-atlas-vs-historian`).
- **Mes fautes** : 6–12 s mesurés dans mon onglet au démarrage présentés comme la durée d'une préparation (il vit 2,5 s,
  corrigé sur le ticket) ; un secours proposé pour un fichier qui ne manque jamais (mémoire `real-problems-only`) ; le
  gain d'ATLAS-407 surestimé d'après Node (Chrome : 1,5 → 1 s, pas 0,4) ; trois tests qui ne prouvaient rien (un espion
  posé après la fermeture, deux que le bord du monde faisait passer), corrigés ; un commit tenté avant son test de l'appui
  ciblé, arrêté par lui ; un `cd`.

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

> Older sessions (2026-09-12 → 2026-11-10 nuit) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
