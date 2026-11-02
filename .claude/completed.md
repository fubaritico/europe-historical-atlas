## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

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

### 2026-11-01 soir → 02/11 matin — l'audit, les concurrents, Cliopatria, « Open… », deux instances pour demain

Plage **01/11 19:14 → 02/11 04:50** (9 h 36) ; le chantier ouvert le 05/10 totalise **178 h 12 sur 31 plages**. **Neuf commits
poussés**, de `6580917` à `40baea1` ; `years/` (Cliopatria 1100 et 1200) volontairement hors commit.

- **L'audit des instructions** (`/doctor prompt-audit`) appliqué retour par retour ; `/repo-version-manager` créé ; `/opensrc` écrit pour
  la vraie commande de la 0.6 (sans `path`).
- **Les concurrents** (YearMaps, Borders of Time, HistorIQly…) : il a failli arrêter — *« ce n'est pas une démo, ce sera publié, j'ai
  dépensé de l'argent »*. Ce qui l'a retenu : sur Cliopatria importé, **la pose des villes et des noms marche**. Sa décision : la
  vitesse et de vraies cartes d'abord (ATLAS-333, CARTO-334, CMS-335, CARTO-193, CARTO-336, CORE-337), l'interface en pause (s11 → s15).
- **Cliopatria** (CC BY 4.0) importé : sa règle *« le plus récent l'emporte »*, trouvée sur YearMaps, a supprimé tout chevauchement ;
  côtes de Natural Earth ; 1100 et 1200 sur le disque pour son nettoyage, sa 1100 d'avant archivée.
- **« Open… »** construit, revu (une haute corrigée), commité ; **les domaines** achetés et branchés, la page d'attente en ligne ; le
  gestionnaire de sources écrit (CMS-332), *« tout tel qu'écrit, c'est toi qui le construis »* ; deux instances pour demain
  (`files/plans/maps-1100-1200-code-and-historian.md`).
- **Mes fautes** : **le certificat cassé** en lui faisant retirer un domaine qui marchait, pour un détail ; Mourom-Riazan déclaré
  anachronique sur une seule source ; le budget zéro opposé à un achat qu'il voulait ; Chronas et les concurrents montrés six
  semaines trop tard ; passé à l'anglais sans m'en rendre compte ; deux `cd` ; des messages de commit trop longs envoyés malgré le contrôle.

> Older sessions (2026-09-12 → 2026-11-01 night) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
