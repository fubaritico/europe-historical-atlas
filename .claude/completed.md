## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

### 2026-11-02 soir → 03/11 nuit — le panneau Villes, les panneaux déplaçables, la bande des tribus

La plage du **02/11 15:03 → 03/11 00:41** (9 h 37) compte aussi l'après-midi déjà raconté ci-dessous ; le chantier ouvert le
05/10 totalise **187 h 58 sur 32 plages**. **Onze commits poussés** jusqu'à `09f7829`, dont quatre de l'historien
(`27edaad`, `6fdc022`, `ecd33d8` CMS-335, `3001afc` le MCP) ; **`116415d` commité, non poussé**. CI verte, Sonar compris.

- **L'atlas** : les noms gardés par année, les boutons des années provisoires, le panneau de réglages caché derrière ‹H›,
  une année n'affiche que ses événements (`c4b0352`, `ee03156`, `eb15874`, ATLAS-333).
- **Le Cartographe** (`a316444`) : le panneau Villes et son verdict par identifiant Wikidata (CARTO-193) ; la carte
  enregistrée d'elle-même, en plus de la copie `.autosave` ; les panneaux déplaçables, aimantés, redimensionnables
  (CARTO-342 — *« ça marche très bien »*), le chrome non sélectionnable.
- **La mesure** : à 25 471 points, passer à 1100 prenait 5,5 s — la tribu Kimek-Kipchak seule, 5,1 s, mesurant tous ses
  voisins. **La bande intérieure** (son idée, le décalage d'Illustrator, puis irrégulière) la ramène à 0,34 s
  (`116415d`, ATLAS-344). Ses mots : *« c'est super beau »*, *« on a créé un langage cartographique, la notion
  d'incertitude, elle est bien représentée »*.
- **Deux revues** : la première, lancée sur cinquante fichiers, n'a rien lu ; refaite par lots, elle a trouvé un vrai
  défaut (les événements d'une année ratée revenaient sur l'ancienne carte), corrigé.
- **Mes fautes** : un `cd` ; le dossier `Editor/utils` supprimé avec mon fichier, restauré de git ; une commande refusée
  crue sans effet alors qu'elle avait agi ; mon onglet ouvert sur son Cartographe, le port ayant changé (rien écrit) ; la
  première revue trop grosse ; deux messages de commit trop longs.

### 2026-11-02 après-midi — la vitesse d'un changement d'année, une carte est un dossier

Plage **02/11 15:03 → 19:44** (4 h 40) ; le chantier ouvert le 05/10 totalise **183 h 02 sur 32 plages**. **Neuf commits
poussés**, de `9359e29` à `55d7a23`. Deux instances : moi le code, l'historien sur `files/plans/sources/`.

- **La vitesse** (ATLAS-333, étape 1, `9359e29`) : mesuré qu'un changement d'année recuisait le terrain nu et calculait une
  grille inutile (~6 s) ; sauté pour une année du Cartographe. Ses mots : *« ça charge plus vite »*. L'étape 2 (le cache des
  noms) est écrite, **non commitée**. Le plan : `files/plans/atlas/year-switch-speed.md`.
- **Le Cartographe, à sa demande pendant qu'il redessine les côtes** : ‹Q› / ‹W› doublent ‹P› / ‹R› ; le zoom monte à 128 ;
  Cliopatria réexporté **avec ses propres côtes** (5 489 points au lieu de 57 229 : *« on ne peut pas corriger des tracés avec
  50 000 points, c'est injouable »*).
- **Une carte est un dossier** (CARTO-340, `5b823d5`, scénario `s19`) : « Ouvrir… » liste les dossiers dans un cadre
  sélectionnable avec icônes, sa question avant d'ouvrir, la vue gardée ; « Enregistrer sous… », « Enregistrer une copie » ;
  l'enregistrement automatique `<carte>.autosave.<date>` dans `years/`, gardé ; instantanés et brouillon retirés. Revue : une
  haute corrigée (« Ouvrir… » n'aurait rien listé). Ses mots : *« voilà, ça c'est bien »*.
- **Mes fautes** : le plan des deux instances pointait un fichier inexistant ; les côtes de Natural Earth imposées la nuit
  d'avant, injouables à retoucher ; un commit qui a emporté d'autres fichiers (défait aussitôt, rien poussé) ; ma question
  noyée sous les rapports — *« QUEL RÉPONSE »*.

> Older sessions (2026-09-12 → 2026-11-02 morning) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
