# Glossaire

> Les termes en anglais, parce que ce sont ceux qu'on voit dans le code et les docs. Définitions en
> français. Une ligne chacun.
>
> **Règle de travail, posée par le dev le 2026-09-22 : tout mot nouveau atterrit ici, tout de suite.**
> Ce document est ce qui permet qu'on se comprenne. Un terme employé en réponse et absent d'ici est une
> dette — l'ajouter fait partie de la réponse, pas d'un rangement ultérieur.
>
> **Ce qui entre, précisé par le dev le 2026-09-24 :** de la **cartographie** et du **logiciel lui-même**
> — ses objets, ses gestes, ses écrans, ses formats. Rien d'autre. Le vocabulaire d'outillage général
> (build, paquets, cache, CI) **n'y a pas sa place** : il est connu, il ne nous est pas propre, et le
> noyer dedans ferait perdre au glossaire ce qui le rend lisible. Dans le doute : _est-ce qu'un
> développeur qui arrive comprendrait ce mot sans nous ?_ Si oui, il n'entre pas.

## Les sources de données

| terme                       | ce que c'est                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| **OHM** / OpenHistoricalMap | Wiki cartographique historique, sur le modèle d'OpenStreetMap. Notre source de frontières.       |
| **historical-basemaps**     | Un dépôt GitHub de cartes historiques, 21 siècles. Complet mais sous licence GPL.                |
| **Natural Earth**           | Jeu de données géographiques libre : côtes, fleuves, lacs, villes. Notre source physique.        |
| **Euratlas**                | Atlas historique commercial, 21 siècles. Très précis, sous droits. Référence seulement.          |
| **Duby**                    | _Atlas historique mondial_ dirigé par Georges Duby (Larousse). Sous droits. Référence seulement. |
| **Wikidata**                | Base de faits libre. Chaque chose a un identifiant `Q…` stable. 94 % des polities OHM en ont un. |
| **Overpass**                | L'API qui sert à interroger OSM et OHM.                                                          |

## Les licences

| terme              | ce que ça veut dire pour nous                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| **CC0**            | Domaine public volontaire. On prend, on modifie, on publie, sans condition. **OHM est en CC0.** |
| **domaine public** | Pas de droits. Natural Earth, les vieilles cartes d'avant ~1930.                                |
| **GPL-3.0**        | Si on publie une œuvre qui en dérive, tout tombe sous GPL. **historical-basemaps est en GPL.**  |
| **œuvre dérivée**  | Ce qu'on obtient en modifiant une œuvre protégée. Éditer une géométrie GPL en crée une.         |
| **fait**           | Où passait une frontière, qui existait, quand. **Personne ne possède un fait.** Toujours libre. |

## Les formats et la géométrie

| terme                     | ce que c'est                                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GeoJSON**               | Format standard pour de la géométrie géographique. Le format d'origine de nos deux sources.                                                        |
| **RegionPayload**         | **Notre** format. Les deux sources y sont converties. `{source, year, bbox, regions[]}`.                                                           |
| **claim** / revendication | Ce qu'un pays tient une année donnée, sous forme d'anneaux fermés.                                                                                 |
| **index d'ancre**         | La place d'un point dans la table commune des points. Un anneau est une liste d'index, pas de coordonnées — c'est ce qui rend le partage possible. |
| **bout partagé**          | Une suite d'ancres que deux tracés ont en commun. **C'est la frontière entre leurs deux pays**, trouvée en comptant combien de tracés tiennent chaque ancre. Tenue par 2 tracés, la paire est nommée sans autre question. Tenue par **1 seul**, il faut encore demander qui tient le sol de l'autre côté — voir **inclusion**. |
| **dériver**               | Obtenir sans l'avoir dessiné. On dessine des **contours de pays** ; les **frontières** sont ensuite calculées à partir d'eux. C'est pour ça qu'aucune frontière n'est stockée : elle serait alors une seconde version de ce que les contours disent déjà, et les deux finiraient par se contredire. |
| **inclusion**             | **« Est-ce que ce contour est à l'intérieur de celui-là ? »** Rien de plus. Ça sert deux fois : décider si un anneau est un trou ou un second morceau, et trouver le voisin d'un bout tenu par un seul tracé. C'est ce qui rend sa frontière au vassal dessiné dans son suzerain : ses points sont à lui seul, donc le comptage dit « rien de l'autre côté » — et l'inclusion répond « la France ». _(Le code disait `containment`, renommé le 28/09 parce que le mot ne se lisait pas.)_ |
| **table des frontières**  | Le tableau qui dit ce qu'est chaque frontière : son type (convenue, de fait, contestée, indéterminée), sa **main**, sa source, une note. Une ligne par couple de pays. **Aucune coordonnée** — le bout partagé se désigne déjà tout seul. |
| **registry.json**         | Le fichier des identités **d'une année** — `years/<année>/registry.json`. Rien n'est partagé entre années. Voir `cartographer/format.md`.          |
| **ring** / anneau         | Une ligne fermée. Un pays = un ou plusieurs anneaux (ses morceaux et ses trous).                                                                   |
| **stretch** / tronçon     | Un bout de frontière entre deux sommets. Porte sa propre provenance.                                                                               |
| **vertex** / sommet       | Un point d'une ligne. C'est ce qu'on ajoute, déplace, supprime.                                                                                    |
| **bbox**                  | Le rectangle géographique couvert. Le nôtre : O −45 / S 11,18 / E 78,75 / N 76,84.                                                                 |
| **lon/lat**               | Longitude, latitude. Les coordonnées du monde réel.                                                                                                |
| **(u, v)**                | Nos coordonnées internes, de 0 à 1 sur le cadre. `u`=0 à l'ouest, `v`=0 au nord.                                                                   |
| **Mercator**              | La projection qui transforme lon/lat en (u,v). Étire le nord — le Groenland paraît énorme.                                                         |
| **graticule**             | Le quadrillage des **méridiens et des parallèles** tracé sur la carte — une ligne tous les 5° ou 10°, par exemple. Sert à lire la position d'un coup d'œil. Une couche de `{Layers}` dans la maquette, pas encore dessinée. |
| **even-odd**              | La règle de remplissage : un anneau dans un anneau fait un trou. Évite de déclarer les trous.                                                      |

## Notre pipeline

| terme                   | ce que c'est                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **DEM**                 | _Digital Elevation Model_ — la grille d'altitudes. Notre relief vient de là.              |
| **heightmap**           | Même chose, vu comme une image.                                                           |
| **land mask** / masque  | Une grille de « terre ou eau ». Sépare mer et terre, ce que l'altitude ne sait pas faire. |
| **raster** / rastériser | Transformer des lignes en grille de cases. Chaque case retient qui la possède.            |
| **cell** / cellule      | Une case de cette grille. La nôtre fait 1,9 km de côté.                                   |
| **texture**             | L'image peinte qu'on pose sur le relief : parchemin, altitudes, ombrage, grain.           |
| **bake** / cuisson      | Calculer cette image, pixel par pixel. ~1,5 million de pixels.                            |
| **tint**                | La couleur d'un pays, appliquée dans la texture.                                          |
| **derived border**      | La frontière **calculée**, jamais dessinée à part. Calculée depuis le **bout partagé** entre deux tracés — exacte, au lieu d'une marche de 1,9 km. **Décidé le 13/10 (D1, `borders/plan.md`)** : l'atlas aussi la prend là pour une année dessinée, pour que styles et surcharges lui parviennent ; le bord des aplats du raster ne sert plus que pour les siècles encore lus dans les fichiers GPL. Les **couleurs**, elles, restent sur le raster. |
| **worker**              | Un second fil d'exécution. Le calcul lourd y va, pour que l'écran ne gèle pas.            |
| **drape** / draper      | Poser une ligne plate sur le relief pour qu'elle épouse les montagnes.                    |
| **rampe de rivage** / shore ramp | La bande, le long de la côte du **masque terre/mer**, où le relief redescend en douceur jusqu'au niveau de la mer (`shoreRamp`, en km, 16/10). Sans elle, le DEM est encore à des centaines de mètres là où le masque dit « côte » : chaque côte devient une falaise qui porte la couleur du pays dans la mer et cache le trait de côte. |
| **biais de profondeur** / depth bias | Ce qui garde le trait de côte visible sur le relief (16/10) : chaque point du trait est rapproché de la caméra **le long de sa ligne de visée**, donc il passe devant la terre sans bouger d'un pixel à l'écran. À distinguer du **lift**, qui soulève le trait vers le ciel : vu en biais, un trait soulevé glisse vers le haut de l'écran. Le lift est un effet voulu (le trait « posé » au-dessus du bord), le biais une garantie. |
| **parité éditeur–atlas** | La promesse que ce que le Cartographe montre est ce que l'atlas publie. Tenue en partageant la géométrie et les décisions dans `core` (frontières, ordre, couleurs, fond), chaque application ne gardant que sa façon de dessiner. L'état réel — ce qui est commun, ce qui diffère encore — est tenu dans `.claude/rules/architecture.md`, section « Editor–atlas parity » (16/10). |
| **backdrop** / fond     | La texture cuite, posée **sous** le canevas du Cartographe. Le seul objet géoréférencé **par construction** — c'est littéralement l'image de sortie de l'atlas, donc zéro calage et erreur nulle. Son repère est celui du **DEM**, le seul repère du canevas. |
| **repère**              | La paire *(taille de la grille, boîte géographique)* contre laquelle une position se calcule — on dit « projeter dans le repère du fond ». **Il se lit, il ne se déclare pas** (07/10) : les quatre coordonnées et les deux dimensions viennent du `.json` du DEM, parce qu'un repère écrit à la main est une seconde source de vérité dont l'erreur est **muette** — tout glisse, et rien ne proteste. C'est le mot derrière la phrase « sans le relief, il n'y a rien contre quoi projeter ». |
| **viewport**            | Quelle part du fond est à l'écran, et à quelle taille — **trois nombres** (`scale`, `originX`, `originY`), pas un objet vivant. Une seule échelle suffit : les pixels du fond sont carrés dans l'espace projeté à **0,031 %** près, mesuré. L'unité est le **pixel de périphérique** du canevas, pas le pixel CSS. |
| **km par pixel écran**  | Ce que la barre d'état affiche. Dépend de **où** on mesure, le fond étant en Mercator : 7,6 km/px à 45°N au zoom propre du fond, 10,8 à l'équateur. Le fond « lâche » quand `scale > 1` — un pixel de fond couvrant plus d'un pixel écran. **Ce n'est pas un seuil à régler.** |

## Les mots du contenu

| terme                   | ce que c'est                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **polity**              | Une entité politique : royaume, duché, empire, république. Un titre = une polity.                                                                                                                      |
| **rank** / rang         | Sa dignité : empire, royaume, duché, comté… OHM l'appelle `border_type`.                                                                                                                               |
| **suzerain**            | Celui dont une polity relève. Dans le code : `subjectTo`.                                                                                                                                              |
| **vassal**              | L'inverse. Aura sa propre main de frontière (pointillé). **Depuis le 15/10 (décision du dev), un vassal est le voisin de son suzerain, jamais dessiné par-dessus** : l'Aquitaine est découpée dans la France et partage ses ancres avec elle — leur frontière commune prend la main vassale. |
| **domaine propre**      | Ce qu'un pays dessine lui-même : ses anneaux, et rien de ceux de ses vassaux. Deux domaines propres ne se chevauchent jamais. Un suzerain peut n'en avoir aucun (15/10). |
| **étendue**             | La surface d'un pays : son domaine propre **plus l'étendue de chacun de ses vassaux**, récursivement. Calculée depuis le registre, jamais dessinée. Un suzerain sans domaine propre a pour étendue celle de ses vassaux — il n'est pas « sans territoire » (décision du dev, 15/10). |
| **niveau d'hommage**    | La profondeur d'un pays dans la chaîne d'hommage : 0 ne relève de personne, 1 relève d'un pays de niveau 0, etc. (`core/editor/homageLevels`, ATLAS-253, 18/10). |
| **niveau d'affichage** / **détail** | Ce que le zoom montre de l'hommage dans l'atlas : au niveau L, un pays de niveau d porte la couleur de son ancêtre de niveau min(L, d) — de loin un vassal porte la couleur de son suzerain, un arrière-vassal passe par celle de son suzerain direct avant la sienne. Le **détail** est ce niveau rendu continu (1,5 = à mi-chemin du niveau 2), lu par les teintes et les frontières pour qu'elles arrivent ensemble (`scene/homageReveal`, 18/10). |
| **niveau de séparation** | Le premier niveau d'affichage où les deux côtés d'une frontière portent des couleurs différentes : 0 entre deux royaumes, k+1 entre deux pays dont l'ancêtre commun le plus profond est au niveau k — un vassal et son propre suzerain compris. Une frontière est cachée en dessous et apparaît en fondu à ce niveau (ATLAS-253, 18/10). |
| **tribu** / tribe        | Un peuple pas encore souverain : Prussiens, Coumans, Obotrites. Son **rang** vaut `tribe`. **Pas de remplissage ni de contour** : sa couleur est pleine au cœur de son territoire et **s'évanouit vers sa limite** (le **bord évanoui**, décision du dev du 18/10, qui remplace le contour en tirets du 15/10). Entre deux tribus, ou contre la mer et une terre sans maître, aucun trait ; contre un État, la frontière de l'État reste tracée, dans sa main (18/10). Le rang `people` posé la nuit du 14/10 a été renommé en `tribe`. |
| **bord évanoui** / vanishing edge (feather) | La façon dont une tribu est peinte : sa couleur passe du plein à rien sur une **largeur** en km au sol, selon la **distance signée** à son contour. Une seule règle dans `core/editor/tribeFeather.ts`, lue par l'atlas et le Cartographe. Défaut : **dégradé inset, 30 km** (le dev, 18/10 : « deux fois plus étalé » que les 15 km proposés). |
| **dégradé inset** / inset | Le bord évanoui placé **dedans** : couleur pleine à une largeur à l'intérieur du contour, nulle sur le contour. La couleur ne sort jamais du territoire. |
| **dégradé outset** / outset | Le bord évanoui placé **dehors** : couleur pleine sur le contour, nulle à une largeur à l'extérieur. Ce qui déborde est **coupé** sur le territoire de tout autre pays et sur la mer (le dev, 18/10 : « si ça déborde, c'est pas bon ») : il ne s'étale que sur une terre sans maître. |
| **distance signée** / signed distance | La distance au sol, en km, d'un point au contour d'un pays : **négative dedans, positive dehors** (dedans selon la règle pair-impair des remplissages). Ce que le bord évanoui lit : `core/geo/signedDistance.ts`. |
| **union personnelle**   | Deux couronnes sur une même tête, sans subordination. Castille + Aragon.                                                                                                                               |
| **condominium**         | Deux souverains sur un même territoire, sans hiérarchie. Rare, et inexprimable aujourd'hui.                                                                                                            |
| **zone contestée** / contested zone | Un terrain que l'**histoire** a vu revendiqué par deux pays ou plus. Proposée **hachurée des couleurs de chacun**, comme chez Shepherd (idée du dev, 19/10), et dessinée à la main. Un fait historique, à ne pas confondre avec une **concordance** faible. `files/plans/evidence-system.md`. |
| **affirmation** / claim | Une seule chose dite du monde à une date : « la Flandre est vassale de la France en 1400 », « ce tronçon de frontière passe ici ». Ce à quoi les témoignages s'attachent (proposé, 19/10). |
| **témoignage** / evidence | Ce qu'**une** source dit d'**une** affirmation : elle la soutient ou la contredit, à tel endroit précis (une planche, une page, une déclaration Wikidata). Une affirmation en a zéro ou plusieurs (proposé, 19/10). |
| **concordance**         | La jauge d'une affirmation, **calculée** à partir de ses témoignages, jamais saisie : à quel point elles s'accordent, pesées par leur fiabilité. Elle mesure l'**accord des sources, pas la vérité** : trois sources qui recopient la même erreur concordent (proposé, 19/10). |
| **véracité**            | Qu'une affirmation corresponde à ce qui s'est passé. **Jamais mesurée, jamais affichée** : l'horizon visé ; tout le reste n'en est qu'un indice (proposé, 19/10). |
| **fiabilité**           | Ce que mérite une source : son **genre** (document primaire, atlas d'historien, encyclopédie, base collaborative), sa distance aux faits, son **indépendance** des autres. Deux sources qui se recopient comptent pour une (proposé, 19/10). |
| **attestation**         | Combien de sources **indépendantes** soutiennent une affirmation. Un compte, à côté de la concordance (proposé, 19/10). |
| **incertitude**         | L'écart entre ce qu'on montre et la vérité, en **trois genres** qui n'ont jamais la même marque sur la carte : l'**imprécision** (la chose n'avait pas de bord net — le bord évanoui), le **litige** (l'histoire a eu plusieurs prétendants — la zone contestée, ou une frontière tenue de fait), l'**incertitude de savoir** (nous ne savons pas : les sources se contredisent — calculée, jamais saisie). **Sur la carte, la marque dit *ce qui* est incertain, le panneau dit *pourquoi*** : le **flou** pour une limite incertaine, les **hachures** pour une appartenance incertaine (proposé, 19/10, d'après le flou et les hachures du dev). |
| **territoire** / fief   | Une terre tenue d'un seul tenant : la Champagne, Blois, le Berry. L'unité stable d'une année à l'autre. Distinct de son **titulaire** et du **lien d'hommage** — notre « pays » les confond aujourd'hui (proposé, 19/10). |
| **titulaire** / holder  | La personne ou la maison qui tient un territoire : la maison de Blois-Champagne. Change à un héritage, un mariage, une confiscation, une réunion au domaine royal (proposé, 19/10). |
| **lien d'hommage** / bond | Le titulaire, **pour tel territoire**, est l'homme de tel seigneur, à telle date. Une affirmation datée comme une autre ; un titulaire peut en avoir deux (la Flandre : la France et l'Empire) (proposé, 19/10). |
| **arbitrage**           | Le choix d'un contributeur entre des affirmations concurrentes, **signé** et **justifié** par les témoignages qui l'ont décidé. Les affirmations écartées restent conservées (proposé, 19/10). |
| **registre des sources** / source register | L'endroit de la contribution qui **liste les sources**, chacune une fois, avec son genre, sa licence, son indépendance. Tout témoignage y pointe ; c'est là qu'on traite l'incertitude, et que se règle le poids de chaque genre de source (le dev, 19/10). À ne pas confondre avec le **registre** d'une année. |
| **coquille** / shell    | L'atlas vu depuis le système : ce que le lecteur **voit**, qui reçoit la contribution et en fait partie, bâti sur ce qu'il ne voit pas — la mécanique de la certitude (le dev, 19/10). |
| **traçabilité**         | De tout ce qui est affiché, un chemin jusqu'à ses sources. Ce qui n'en a pas s'affiche comme *sans source*, pas comme su (proposé, 19/10). |
| **registry** / registre | La liste des polities d'**une** année avec leur identité : nom, rang, suzerain, couleur. Séparée de leur géographie, mais dans le même dossier d'année. Un registre par année, jamais partagé.          |
| **catalogue**           | Le vivier des polities que le projet connaît, **à l'échelle du projet**. Il sert à **remplir des formulaires** — jamais à dessiner. Le perdre fait tomber l'autocomplétion, aucune carte. À ne pas confondre avec le **registre**, qui est la vérité d'une année. |
| **ville-témoin**        | Une ville dont on sait à qui elle appartenait cette année-là. Sert à vérifier une frontière : la ville doit tomber du bon côté. Une vingtaine suffit par carte.                                        |
| **main** / hand         | La façon dont un trait de frontière est dessiné : son **motif** (plein, pointillé, tirets, double, aucun), s'il a une **bordure** (âme claire dans un liseré sombre), et son **épaisseur**. Par défaut elle vient de la **relation** entre les deux pays (souverains → plein bordé, vassal/suzerain et vassaux d'un même suzerain → pointillé, le même trait (15/10), contre une terre sans maître → un trait sombre, côte → rien : `core/editor/borderHands.ts`) ; l'auteur peut la remplacer par une surcharge. Jamais déduite de la géométrie. Le mot vient de la calligraphie : « d'une autre main ». |
| **lieu** / place        | Un point nommé sur la carte : ville, abbaye, champ de bataille. Porte une position, une icône, et un modèle 3D quand c'est une ville.                                                                  |
| **événement** / event   | Ce qui s'est passé à une date et un lieu : bataille, décision, invention. Porte un texte, ses conséquences et ses acteurs. C'est la matière de M2.                                                     |
| **date historique** / historical date | Une date telle que le projet la tient : **un instant ou un intervalle**, chaque bout aussi précis qu'on le sait — une année, un mois, un jour — et marqué **« vers »** s'il est approché. Jamais un `Date` : on n'a presque jamais le jour, et un jour de 1066 est julien. Affichée en texte : « 1100 », « 1337–1453 », « vers 1100 », « 44 av. J.-C. ». `core/src/time/` (CORE-217, 21/10). |
| **vers** / circa        | La marque d'une date approchée : « vers 1100 ». L'année est la meilleure estimation, pas une borne. |
| **calendrier julien** / **grégorien** | Les deux calendriers d'une date au jour. L'Europe de 1100 est **julienne** ; le grégorien commence en 1582, et un jour grégorien d'avant est dit **proleptique** (la règle projetée en arrière). Ils ne diffèrent que par les années bissextiles : 1100 l'est en julien, pas en grégorien. Seul un jour porte son calendrier. |
| **jour julien** / Julian Day Number | Le compte des jours depuis le 1er janvier 4713 av. J.-C. (julien). Un jour est un seul nombre quel que soit le calendrier qui le nomme : c'est par lui qu'on passe de l'un à l'autre. Les Ides de mars, 15 mars 44 av. J.-C. julien, sont le 13 mars grégorien. |
| **an zéro**             | Il n'existe pas : 1 av. J.-C. est suivi de 1 apr. J.-C. Une date qui le porte est **refusée à la lecture**. Les astronomes, eux, comptent un an 0 (= 1 av. J.-C.) — le calcul passe par leur compte, l'affichage jamais. |
| **Payload**             | CMS headless sous Next, envisagé pour contribuer lieux et événements. **Jamais appelé « Studio »** : ce nom était une invention de nos documents, pas du dev.                                          |
| **requête spatiale**    | Poser une question au raster politique plutôt que rapatrier la grille : `regionAt(u, v)` → **la liste** des polities tenant ce point. Une liste, car un vassal et son suzerain y sont tous deux vrais. |
| **visionneuse**         | Ce qu'est l'application : elle **présente** des informations au clic, elle ne déduit pas la continuité historique. Le lien entre deux dates est fait par l'usager qui s'y connaît. C'est de là que vient « un registre par année » et l'absence de tout modèle inter-années. |

## Les gestes de l'éditeur

> Vocabulaire arrêté le 2026-09-22, à partir d'Illustrator : le Cartographe n'a que **deux outils**.

| terme                                       | ce que c'est                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pen** / plume (‹P›)                       | L'outil qui pose des points. Chez nous il ne fait que des segments droits.                                                                    |
| **Retrace** / retracer (‹R›)                | L'outil de **correction** d'un contour déjà fermé (`H-46`, 14/10) : un clic sur une ancre du pays visé, un nouveau tronçon tracé exactement comme à la plume (côte, fleuve, frontière voisine, points libres, crayon), puis un clic sur une autre ancre **du même contour** remplace ce qu'il y avait entre les deux. Le côté remplacé est **le plus petit changement** — celui qui, fermé par le nouveau tronçon, enferme la plus petite surface — montré en tirets rouges avant le clic ; ‹alt› prend l'autre. Un voisin qui partage le tronçon le suit. Refusé, avec un message, quand un troisième pays touche le tronçon (point triple) ou qu'une frontière stylée à la main le couvre. |
| **Weld** / souder (flèche blanche)          | Glisser une ancre du pays visé, seule, sur une ancre d'un voisin (elles ne font plus qu'une, tenue par les deux contours) ou sur un tronçon du voisin (son contour la gagne) — `H-37`, 14/10. Un pas d'annulation. La façon de travailler du dev : **point par point**, un pays à la fois, une chose à la fois (18/10). |
| **Origin / target** — tracé origine, tracé cible | Idée pour plus tard (CARTO-254, 18/10) : souder d'un coup un tracé **origine** sur un tracé **cible** — l'origine prend les points de la cible. Non construit. |
| **Direct Selection** / flèche blanche (‹A›) | L'outil qui sélectionne un point, le déplace, le supprime.                                                                                    |
| **anchor** / point d'ancrage                | Un point d'un tracé. Même chose qu'un **vertex** : « anchor » pour le geste, « vertex » pour la donnée.                                       |
| **handle** / poignée                        | Le petit carré dessiné à l'écran pour viser un point. **Ni** un bras de Bézier, **ni** un coin de boîte de transformation.                    |
| **transform box** / boîte de transformation | Le cadre à 8 poignées d'Illustrator, qui fait tourner et redimensionner. **Refusé.**                                                          |
| **marquee**                                 | Le rectangle qu'on trace pour sélectionner plusieurs points d'un coup. Il disparaît au relâchement : aucun cadre ne subsiste.                 |
| **selection blue**                          | Le bleu de sélection. Une encre **réservée** : jamais servie à un pays. Point sélectionné = bleu plein ; non sélectionné = blanc à bord bleu. |
| **rubber band** / élastique                 | Le segment provisoire qui suit le curseur depuis le dernier point posé.                                                                       |
| **outline in progress** / tracé en cours    | Les points posés à la plume et pas encore fermés. Ils appartiennent à la session, pas au document : ‹échap› les jette, ‹retour arrière› retire le dernier, et ils n'entrent dans l'année qu'à la fermeture, d'un seul pas d'annulation. |
| **overlay** / calque du dessus              | Le second canevas, posé sur le premier, repeint à chaque mouvement du pointeur. **À ne pas confondre avec le mode de fusion `overlay`** (ligne suivante) : le tracé en cours, l'élastique, un point qu'on déplace. Le premier n'est repeint que quand le document ou la vue change. |
| **overlay blend** / mode de fusion overlay  | Comment la couleur d'un pays se pose sur le relief : à 100 %, assombrie dans les creux, éclaircie sur les crêtes. C'est la teinte de l'atlas (`politicalMode`), et l'éditeur peint ses remplissages avec le même mode pour montrer ce qui sera publié. |
| **automatic palette** / palette automatique | Les huit teintes qu'un pays laissé sur « automatic » reçoit : la première qu'aucun voisin n'utilise. Partagée par l'atlas et le Cartographe, pour que l'éditeur montre les couleurs qui seront publiées. |
| **Bézier**                                  | Les courbes à poignées. **Refusées** : le format ne stocke que des points, et Chaikin arrondit au rendu.                                      |
| **path** / tracé                            | Une **liste ordonnée de références** vers des points. Il possède son ordre, pas ses points.                                                   |
| **tracés concomitants**                     | Deux tracés qui passent par les mêmes points. Bouger un point les bouge tous les deux.                                                        |
| **dupliquer un tracé**                      | Recopier la **liste**, jamais les points. Recopier les points ferait revenir le liseré.                                                       |
| **sliver** / liseré                         | La bande de terre sans propriétaire qui apparaît quand deux pays ont chacun leur copie d'une frontière. Le défaut qu'on interdit.             |
| **hit-test**                                | Décider quel point ou quel segment se trouve sous le curseur.                                                                                 |
| **cible de dessin** / drawing target        | **Sur qui on travaille** : le pays que la plume remplit et dont la flèche déplace les points. Choisie dans `{Polities}` — on sélectionne **qui**, puis on agit (décision du dev, 08/10), ce qui est l'inverse d'Illustrator où sélectionner un point sélectionne l'objet qui le tient. Sans cible, les deux outils refusent. |
| **description d'action** / action description | Ce que la barre d'état dit **pendant** un geste : un verbe et le pays sur qui il porte — *« Dessin dans Reaume de France »*, *« Déplacement d'un tracé de… »* (décision du dev, 08/10). C'est la garantie **continue** que les ancres atterrissent où l'auteur le croit ; l'avis de cible, lui, ne fait qu'annoncer un changement de sujet puis se retire. Au repos, la barre revient aux coordonnées et à qui tient la case. Elle est **affichée en même temps** que les messages transitoires (*« inserted 412 vertices »*), pas à leur place — deux zones côte à côte, décision du dev du 08/10. **Le texte du Cartographe est en anglais** ; celui de l'atlas reste en français. |
| **avis de cible** / drawing-target notice   | Ce qui annonce la cible quand on la choisit : une pastille de couleur et le nom. **Transitoire** — environ 5 secondes, puis il se retire (décision du dev, 08/10 : *« un petit peu comme une sting bar »*), et jamais collé au curseur. Il pourrait se réduire dans un coin du canevas plutôt que disparaître : **non tranché, non prioritaire**. Ce qui est non négociable n'est pas l'avis mais le **refus** — sans cible, la plume ne pose rien. Dessiné en bannière permanente dans l'écran `02 Drawing`, qui précède cette décision. À ne pas confondre avec la **bannière GPL** (`s01`), persistante, qui dit qu'un fichier est en lecture seule. |
| **sans territoire**                         | L'état d'un pays qui a une identité mais aucune géométrie. Normal : c'est ce qu'OHM donne pour la France en 1100.                             |
| **id de polity**                            | La clé d'un pays **dans son année** — `fr-couronne`. Lisible, et jamais un nom d'affichage : `borders.json`, un lien de vassalité et une surcharge de couleur la nomment tous, donc renommer un pays ne doit pas la changer ([s07](cartographer/scenarii/s07-manage-the-registry.md)). **Décision du dev, 08/10** : le formulaire en **propose** une, tirée du nom, et l'auteur peut la réécrire — c'est la seule des trois formes qui permet d'obtenir `fr-couronne` à partir de *« Reaume de France »*. Lue une fois, à la création, jamais re-dérivée. |
| **history manager**                         | Le module qui tient l'annulation. Undo ‹ctrl+z›, redo ‹ctrl+shift+z›, plus les deux flèches.                                                  |
| **ligne d'historique**                      | La suite des états, et un **curseur** dedans. Annuler recule le curseur et ne détruit rien — c'est ce qui permet de refaire. L'ancien futur meurt au **geste suivant qu'on enregistre**, pas à l'annulation. Linéaire : pas de branche. |
| **snapshot** / instantané                   | Copier l'état entier à chaque pas de la ligne. Notre choix : ~265 Ko le pas, aucun risque de corruption silencieuse.                          |
| **command pattern**                         | L'autre façon : chaque opération sait se défaire. Moins de mémoire, mais une erreur corrompt l'historique sans prévenir. **Écarté.**          |
| **branche** / historique en arbre           | Garder les actions abandonnées sur un rameau au lieu de les perdre : remonter puis agir donnerait deux chemins, et un moyen de sauter de l'un à l'autre. **Écarté** (dev, 29/09) : *« cela supprimera les actions se produisant après »*. La raison tient en une phrase — un rameau qu'on ne voit pas est un rameau dont personne ne se sert. Ce qui répond au besoin est le **jalon**, parce qu'il est visible et nommé. |
| **jalon**                                   | Un point marqué, gardé **hors** de la ligne, qui survit donc à la troncature et au plafond. Il gèle **la suite des pas jusqu'à lui**, pas seulement l'état (demande du dev, 29/09) : ce qui revient est une ligne qu'on peut remonter, pas une image figée. Gratuit chez nous — un pas enregistré n'est jamais muté, donc le jalon garde des références. |
| **kind** (d'un pas)                         | L'identifiant stable d'une opération (`move-anchor`), à côté de son **label** affiché. L'icône du panneau s'indexe sur le `kind`, jamais sur le libellé — sinon une chaîne d'affichage redevient une clé, ce qui avait donné 9 regex de couleur. |
| **l'édition**                               | Chez nous, un objet précis et pas une activité : ce que l'`editionSlice` possède. Aujourd'hui **le document ouvert et sa ligne d'historique** ; la **sélection** les rejoindra au même titre, parce qu'`undo` doit la rendre ([s03](cartographer/scenarii/s03-edit-existing-border.md)) — c'est la raison pour laquelle les trois tiennent dans une seule slice : la ligne les enjambe et ne peut pas être posée à côté d'eux. Ce qui n'en fera **jamais** partie : l'outil en main, le zoom, le pan — un undo ne les change pas. |
| **propriétaire d'un état**                  | Le critère de découpage du store (décision du dev, 05/10 : *« une slice par zone »*, à la Redux). Un état va avec **qui l'écrit**, pas avec le panneau qui l'affiche : le document est lu par le canevas et trois panneaux, donc aucun panneau ne le possède, tandis que l'outil en main appartient à `{Tools}` seul. |

## Le chrome de l'éditeur

> Vocabulaire arrêté le 2026-09-24, en reprenant la **forme** d'Illustrator sans sa palette : le dev
> garde la gamme chaude (`#2b2926`), seule la structure change. Voir
> `cartographer/design/chrome.css`, et les écrans `01`, `03`, `04` en `.html`.

| terme                                | ce que c'est                                                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **chrome**                           | Tout ce qui entoure le canevas : barres, rail, panneaux. Par opposition au **document**, qui est la carte.                                                     |
| **tool rail** / rail d'outils        | La colonne étroite d'icônes, collée au bord gauche. Icônes seules, aucun libellé, aucun titre de section.                                                      |
| **panel dock** / dock de panneaux    | La colonne de droite. Elle empile des **groupes de panneaux**, séparés par un filet.                                                                           |
| **panel group** / groupe de panneaux | Un bloc du dock, coiffé de sa **barre d'onglets**. Un seul onglet visible à la fois — c'est ce qui rend l'écran dense sans être chargé.                        |
| **tab strip** / barre d'onglets      | La ligne d'onglets d'un groupe. L'onglet actif prend la couleur du corps du panneau et s'y fond ; les inactifs restent sur le fond sombre.                     |
| **document tab bar**                 | La ligne sous l'en-tête, qui porte l'année ouverte et son zoom. `1100 @ 48 %`.                                    |
| **status bar** / barre d'état        | La ligne du bas. Zoom tout à gauche (convention Illustrator), puis coordonnées, détenteur, échelle ; les totaux à droite.                                      |
| **artboard** / planche               | Chez Illustrator, la page. ~~Chez nous, la **zone éditoriale** (lon −45…60, lat 20…76), nommée au-dessus de son cadre.~~ **Supprimée le 18/10** (décision du dev, une contrainte inventée) : le Cartographe n'a plus de planche, tout le fond se dessine.                                           |
| **hairline** / filet                 | La séparation de 1 px (`#45403a`). C'est **la** séparation : jamais de gouttière, jamais d'ombre, jamais de carte arrondie.                                    |
| **rayon zéro**                       | Aucun `border-radius` dans tout le chrome. La règle qui à elle seule fait basculer l'écran du « web app » vers le logiciel de dessin.                          |
| **active polity swatch**             | La pastille au pied du rail, qui montre l'encre que la plume va poser. Reprend la place du fill/stroke d'Illustrator. Barrée de rouge quand rien n'est choisi. |
| **splitter** / poignée de séparation | La bande de 5 px entre deux groupes du dock. On la tire pour redistribuer la hauteur. `role="separator"`, donc manœuvrable aussi aux flèches.                  |
| **collapse** / repli                 | Replier un groupe sur sa seule barre d'onglets. **Pas un second mécanisme** : c'est la borne basse du redimensionnement, le même nombre.                       |
| **`{History}`**                      | Le panneau qui liste la **ligne d'historique** : un rang par geste, icône et nom, le rang courant surligné, les **jalons** au-dessus. Cliquer un rang y va directement, au lieu de dix ‹ctrl+z›. Ni case à cocher, ni poubelle — [s14](cartographer/scenarii/s14-history-panel.md). |

## Les outils et la méthode

| terme                | ce que c'est                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **spike**            | Un petit programme jetable pour répondre à une question. Les nôtres sont dans `files/spikes/`. |
| **payload**          | Le contenu d'un fichier de données, une fois chargé.                                           |
| **round trip**       | Ouvrir → modifier → enregistrer → rouvrir **à l'identique**. Le test d'un vrai éditeur.        |
| **code naïf** (et **sabotage**) | La version fausse mais *plausible* d'un code — celle qu'on écrirait sans penser au piège. On la substitue un instant au vrai code : **le test écrit pour ce piège doit tomber**, lui précisément, puis on remet le vrai code. Ce n'est pas le cas nominal : c'est la preuve qu'un test garde quelque chose (règle du 27/09). |
| **manifeste des années** | `years/index.json` : la liste des années dessinées et le cadre contre lequel elles l'ont été. Une année **absente** du manifeste est un fait ; une année **listée qui échoue** est une panne — les deux ne se confondent jamais. |
| **mode local** | Le Cartographe lancé par `pnpm dev:cartographer` : son serveur de dev écrit l'année dans `packages/atlas/public/years/<année>/` (‹ctrl+S›), et l'éditeur la rouvre au démarrage. Le site publié ne peut pas enregistrer. Arrêté le 12/10. |
| **année de travail** | Une année enregistrée en mode local : la copie de travail du dev, **jamais commitée** (sa décision, 12/10) — pour retrouver ses tracés, déboguer les outils, maîtriser le format. |
| **enregistrement bloqué** | L'état où ‹ctrl+S› refuse et dit pourquoi : l'année sur disque n'a pas pu être lue, ou elle est arrivée après qu'on a commencé à dessiner. Il existe pour qu'une carte vide n'écrase jamais une année illisible. |
| **Gherkin**          | La façon d'écrire un scénario : _Étant donné… Quand… Alors…_. Lisible sans être programmeur.   |
| **snap** / accrocher | Poser un point exactement sur un fleuve ou une côte qu'on possède déjà.                        |
| **snap layer** / couche d'accroche | Ce que la plume suit quand elle s'accroche : la **côte** ou les **fleuves**, deux des couches de `{Layers}`. Un mode de la plume par couche. **Pas** le rail d'outils. |
| **Pencil** / crayon | Le mode à main levée de la plume : on appuie et on glisse, un point est posé au plus toutes les 200 ms (et seulement si la souris a bougé). Un ‹ctrl+z› reprend tout le trait. |
| **layer switch** / bascule vers la côte ou le fleuve | La plume simple et le crayon s'accrochent seuls à la côte **et aux fleuves** : un clic (ou un point du trait) à portée s'y pose, et la plume **passe en mode côte ou fleuve**. Si les deux sont à portée, le sommet le plus proche l'emporte ; d'une eau à l'autre, elle bascule directement. Au premier clic qu'aucune ne prend, elle **revient au mode d'où elle venait** — la plume, ou le crayon. **C'est le clic qui décide, jamais le survol** ; le survol ne fait qu'annoncer. Décision du dev, 12/10 (`s02`). |
| **action bar** / barre d'actions | La barre au pied de `{Polities}` qui porte les actions du panneau : **ajouter** et **supprimer** un pays aujourd'hui, et toute action de panneau à venir. L'en-tête du panneau n'en porte plus aucune. Décision du dev, 12/10 (`s07`). |
| **group** / groupe | Un pays et ses vassaux, comme un calque et ses sous-calques dans Illustrator : le suzerain au fond, ses vassaux peints par-dessus. L'empilement se change **entre frères** — entre groupes, ou entre vassaux d'un même suzerain ; un groupe bouge avec tous ses vassaux. |
| **georeferencing**   | Caler une image scannée sur de vraies coordonnées. **Abandonné** — on reporte à vue.           |
| **TPS**              | _Thin-plate spline_, la déformation élastique qui sert à ça. Abandonné avec.                   |
| **Chaikin**          | L'algorithme qui arrondit les angles d'une ligne en escalier.                                  |
| **scalerank**        | Le classement d'importance d'un fleuve chez Natural Earth. Décide lesquels on garde.           |
| **provenance**       | D'où vient un tronçon et sous quelle licence. Attaché au tronçon, pas au fichier.              |
| **workbench** / établi | Une page du Cartographe (`/workbench.html`) où l'on monte un morceau du chrome seul, sur des données écrites à la main, pour le régler et en décider. Même feuilles de style que l'application. |
| **plate** / fiche    | Une vue de l'établi : un composant dans un état donné (formulaire vide, refusé…). **Pas** la planche (supprimée le 18/10). |
