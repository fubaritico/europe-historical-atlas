## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

### 2026-11-03 — la clé du CMS, le copier-coller entre cartes (étapes 1 et 2), l'interface de l'atlas pour Claude Design

Plage **03/11 12:22 → 18:49** (6 h 26) ; le chantier ouvert le 05/10 totalise **194 h 39 sur 33 plages**. **Sur `main`**, sept
commits **non poussés** (`49a623d` → le commit de clôture) ; **sur la branche `carto-345`** (copie `europe-map-copypaste`),
cinq commits, **non fusionnés** : le dev les essaie d'abord.

- **Le CMS par le MCP** : la clé créée et branchée (`claude mcp add`, la clé dans `.env.local`) ; la skill `/enter-in-cms` porte
  toute la méthode de l'historien (sa demande : *« la première fois ça va ; si ce n'est pas englobé dans une skill, vous
  finissez par oublier »*) ; la clé lit aussi les raisons d'importance (`49a623d`). Le serveur s'est figé sur un index déjà
  créé : mesuré sur une copie de la base, rien à réécrire, relancé ; README du CMS et tableau des pannes (`534871e`).
- **CARTO-345, le copier-coller** : le plan, ses décisions une à une (collage en place, sans aperçu — *« tu colles, c'est
  tout ; si problème, ctrl+Z »* —, la carte d'arrivée garde son terrain, les dates ignorées, soudure à 2 km, plusieurs
  entités dans `{Polities}` jamais éditées ensemble), la barre de menus (CARTO-239) et le convertisseur de raccourcis
  (`390e543`). Construit : le presse-papier et ‹cmd+C› (`d231fdb`), une table de touches pour tout (`bea262b`), la barre
  Fichier / Édition (`3e1eadc`), essayée par moi dans mon propre Cartographe (`2714cb0`). Trois revues, tous les constats
  traités ou laissés ouverts par décision dite.
- **L'interface de l'atlas pour Claude Design** (ATLAS-329) : la consigne et ses six lots d'images, le ton (camaïeu, boutons
  bruns, ornement, légers dégradés), la recherche sur l'ornement du XVIIᵉ siècle (`files/plans/atlas/ornament-17th-century.md`).
  Ses mots : il tombe dans *« le design XVIIᵉ, Versailles, Louis XIV »* qu'il voulait éviter — d'où son idée de designs par époque.
- **Mes fautes** : un `cd` (deux fois) ; une étape du ticket cochée par erreur, décochée (verbe `uncheck` ajouté) ; le texte à
  coller donné en citation, ses barres partant avec la copie ; une cause du blocage du CMS affirmée avant d'être mesurée,
  corrigée ; deux messages de commit trop longs.

### 2026-11-02 soir → 03/11 nuit — le panneau Villes, les panneaux déplaçables, la bande des tribus

La plage du **02/11 15:03 → 03/11 00:41** (9 h 37) compte aussi l’après-midi, raconté dans l’archive ; le chantier ouvert le
05/10 totalise **187 h 58 sur 32 plages**. **Onze commits poussés** jusqu'à `09f7829`, dont quatre de l'historien
(`27edaad`, `6fdc022`, `ecd33d8` CMS-335, `3001afc` le MCP) ; `116415d` poussé le 03/11 au matin. CI verte, Sonar compris.

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


> Older sessions (2026-09-12 → 2026-11-02 afternoon) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
