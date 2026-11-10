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

### 2026-11-10 — l'historien : les livres hors ligne, 1000 retouchée, l'Italie de 1100 saisie, le lot géographique

Une plage, **10/11 12:06 → 17:02** (4 h 55) ; le chantier ouvert le 05/10 totalise **253 h 29 sur 43 plages**. Session
« historien ». **Sur `main`, non poussé** : `ec03d92`, `91fdede`, `ad6b915`, `90f22bd`, `b284805`, `ec9adc6`, `e0ddd40`,
`c467259`.

- **Ses livres** : aucun sur JSTOR ni Gallica (vérifié dans son Chrome) ; cinq empruntables sur archive.org (Duby, Chambers,
  De Vos–Geivers, Nicolle et la Russie en anglais), huit à scanner (`files/plans/sources/bibliotheque.md`).
- **1000 retouchée par le pilote** (CARTO-403) : les Hébrides (Skye à la Norvège, détroit de Kyle Rhea comblé par le masque),
  Ardnamurchan, le Dornoch Firth, la reprise du Danemark (14 510 km²) et des Bouyides à Ormuz ; huit côtes refusées par le
  pilote lui-même (journal de la skill). Ramenée dans l'arbre de `main` à sa demande, non commitée — il la finit.
- **L'Italie de 1100** : 508 communes de plus de 20 000 habitants, dix lots, 1 579 citations revérifiées ; 357 villes et
  272 sources saisies par le MCP, 63 désaccords avec la carte (`files/plans/sources/1100-italy.md`).
- **CMS-414, le lot géographique** (sa demande : *« le pays d'aujourd'hui, c'est d'où on vient et vers où on va »*) : pays et
  région lus dans Wikidata, une liste quand il y en a plusieurs (sa règle) ; essayé par lui sur Ortona. **Le rattrapage
  attend une session neuve** : l'outil MCP de celle-ci ne voyait pas les champs (`next-historian.md`).
- **Tickets créés à sa demande** : CARTO-413 (une ville à moins de 5 km de son pays, rattachée — mesuré : 18 villes),
  CMS-414.
- **Mes fautes** : Aoste mise dans le lot de la Sardaigne (région déduite de la longitude) ; un `heredoc` non protégé a envoyé
  six mots entre accents graves au shell (rien n'a tourné, fichier réparé) ; une règle de date ajoutée en cours de saisie,
  qui a laissé 25 fiches de Campanie sans ligne (corrigées) et quatre du nord-ouest à reprendre ; une première lecture
  Wikidata qui prenait les pays disparus (corrigée, `e0ddd40`).

> Older sessions (2026-09-12 → 2026-11-10 nuit) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
