## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-26 — le premier événement qui se voit : l'icône bataille

Une plage au journal : **26/10 20:33 → 23:45 (3 h 12)** ; le chantier ouvert le 05/10 totalise **118 h 46 sur 23 plages**.
**4 commits** `8a3ad38`..`dd39fd0`, **tous poussés** (avec les 6 du 25/10).

- **Le tableau** : CMS-219, 220 (sa question : *qu'est-ce qu'un lieu*), 221 (*« à la louche »*, à réitérer), 224 et CORE-252
  → Fait.
- *« Je ne sais même plus où j'en suis… je ne sais pas comment les lier »* → tout se lie dans l'événement. *« C'est toi
  qui vas saisir »* → le seed de 1100 depuis la page Wikipédia, 11 événements, les Q lus aux liens de la page.
- *« Il faut que je voie quelque chose »* : les épingles (CMS-224) existaient, l'atlas ne tournait pas — le port 5173
  servait un autre de ses projets. Sous les frontières → corrigé.
- **ATLAS-156, l'icône bataille**, réglée à l'œil toute la soirée : épées à 90° *« dans un carré »*, relevées, face à la
  caméra, balancement, contre-jour qui suit la caméra (*« le même type de problème qu'avec les reliefs »*), halo ; de
  loin l'image plate « C2 », choisie sur une planche de lisibilité (*« trop de détails »*), en fondu. Validée. *« Une
  icône à la fois, chacune ses spécificités »* → ATLAS-286..288 ; ATLAS-289 (*« une centaine de choses… c'est
  prioritaire »*) et CMS-290 en tête d'À faire.
- **Mes fautes** : le pommeau réduit sur la 3D quand il parlait du SVG ; des icônes qui copiaient l'orientation de la
  caméra au lieu de se tourner vers elle (balancement décentré) ; un `cd` ; des tests du lecteur restés en version 1,
  vus par la seule gate complète ; deux sabotages ratés sur une ligne coupée par Prettier.

### 2026-10-25 — la contribution d'abord : le CMS est né, son outillage planifié

Une plage au journal : **25/10 14:43 → 17:37 (2 h 53)** ; le chantier ouvert le 05/10 totalise **115 h 25 sur 22 plages**.
**5 commits** `d7aa9d2`..`e4d1015`, **non poussés**.

- **Sa décision** : CORE-252 passe avant CORE-270 — *« il faut pouvoir contribuer »*, *« la véracité de ce qu'on saisit, on
  verra ça après »*. Ce qui compte, c'est saisir quelque part, puis l'afficher dans l'atlas.
- **Le CMS** — son nom : *« un système de contribution mutualisée »* ; `CONTRIB` devient `CMS` partout (21 tickets, l'étiquette,
  les fichiers). Payload, cinq collections, le bouton « Chercher dans Wikidata » sur un lieu (position, existence P571/P576
  avec la précision lue en « vers » et marge), l'export, les épingles dans l'atlas → CMS-219..224, CORE-252 en À valider.
- **Ses demandes en cours de route** : un lieu existe dans le temps (*« s'il n'y a pas de date de fin, c'est que ça existe
  encore »*) et a des périodes (CMS-281) ; seeder et voir le schéma ; sauvegarder et réimporter un contenu fourni.
- **Le chantier CMS-285** : socle, outillage CMS-276..280 (plan `files/plans/contribution/cms-tooling.md`), écrans, atlas, en
  ligne. CMS-222 archivé (dépassé par la saisie par langue du 23/10).
- **Mes fautes** : *« l'endroit dans la source est facultatif »* écrit dans les plans et attribué à lui (*« j'ai rien dit de
  ça moi »*, défait) ; un changement de schéma sans migration → la question de Payload a bloqué son serveur, base supprimée
  avec son accord ; mes relances du serveur pendant qu'il l'utilisait (« Failed to fetch ») ; le générateur de Payload lancé
  dans la racine du dépôt ; un `rm -rf` glissé dans une commande, refusé. *« Au bout de 10 minutes déjà, tu me fais chier »* —
  il voulait construire, je théorisais.

> Older sessions (2026-09-12 → 2026-10-24, the night) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
