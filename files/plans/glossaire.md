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
| **registry.json**         | Le fichier des identités, partagé par toutes les années. Voir `cartographer/format.md`.                                                            |
| **ring** / anneau         | Une ligne fermée. Un pays = un ou plusieurs anneaux (ses morceaux et ses trous).                                                                   |
| **stretch** / tronçon     | Un bout de frontière entre deux sommets. Porte sa propre provenance.                                                                               |
| **vertex** / sommet       | Un point d'une ligne. C'est ce qu'on ajoute, déplace, supprime.                                                                                    |
| **bbox**                  | Le rectangle géographique couvert. Le nôtre : O −45 / S 11,18 / E 78,75 / N 76,84.                                                                 |
| **lon/lat**               | Longitude, latitude. Les coordonnées du monde réel.                                                                                                |
| **(u, v)**                | Nos coordonnées internes, de 0 à 1 sur le cadre. `u`=0 à l'ouest, `v`=0 au nord.                                                                   |
| **Mercator**              | La projection qui transforme lon/lat en (u,v). Étire le nord — le Groenland paraît énorme.                                                         |
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
| **derived border**      | La frontière **calculée** comme le bord des aplats. Jamais dessinée à part.               |
| **worker**              | Un second fil d'exécution. Le calcul lourd y va, pour que l'écran ne gèle pas.            |
| **drape** / draper      | Poser une ligne plate sur le relief pour qu'elle épouse les montagnes.                    |

## Les mots du contenu

| terme                   | ce que c'est                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **polity**              | Une entité politique : royaume, duché, empire, république. Un titre = une polity.                                                                                                                      |
| **rank** / rang         | Sa dignité : empire, royaume, duché, comté… OHM l'appelle `border_type`.                                                                                                                               |
| **suzerain**            | Celui dont une polity relève. Dans le code : `subjectTo`.                                                                                                                                              |
| **vassal**              | L'inverse. Aura sa propre main de frontière (pointillé).                                                                                                                                               |
| **union personnelle**   | Deux couronnes sur une même tête, sans subordination. Castille + Aragon.                                                                                                                               |
| **condominium**         | Deux souverains sur un même territoire, sans hiérarchie. Rare, et inexprimable aujourd'hui.                                                                                                            |
| **registry** / registre | La liste des polities avec leur identité. Séparée de leur géographie.                                                                                                                                  |
| **ville-témoin**        | Une ville dont on sait à qui elle appartenait cette année-là. Sert à vérifier une frontière : la ville doit tomber du bon côté. Une vingtaine suffit par carte.                                        |
| **main** / hand         | La façon dont un trait de frontière est dessiné : plein, pointillé, double, gras. Éditoriale, jamais déduite de la géométrie.                                                                          |
| **lieu** / place        | Un point nommé sur la carte : ville, abbaye, champ de bataille. Porte une position, une icône, et un modèle 3D quand c'est une ville.                                                                  |
| **événement** / event   | Ce qui s'est passé à une date et un lieu : bataille, décision, invention. Porte un texte, ses conséquences et ses acteurs. C'est la matière de M2.                                                     |
| **Payload**             | CMS headless sous Next, envisagé pour contribuer lieux et événements. **Jamais appelé « Studio »** : ce nom était une invention de nos documents, pas du dev.                                          |
| **requête spatiale**    | Poser une question au raster politique plutôt que rapatrier la grille : `regionAt(u, v)` → **la liste** des polities tenant ce point. Une liste, car un vassal et son suzerain y sont tous deux vrais. |

## Les gestes de l'éditeur

> Vocabulaire arrêté le 2026-09-22, à partir d'Illustrator : le Cartographe n'a que **deux outils**.

| terme                                       | ce que c'est                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pen** / plume (‹P›)                       | L'outil qui pose des points. Chez nous il ne fait que des segments droits.                                                                    |
| **Direct Selection** / flèche blanche (‹A›) | L'outil qui sélectionne un point, le déplace, le supprime.                                                                                    |
| **anchor** / point d'ancrage                | Un point d'un tracé. Même chose qu'un **vertex** : « anchor » pour le geste, « vertex » pour la donnée.                                       |
| **handle** / poignée                        | Le petit carré dessiné à l'écran pour viser un point. **Ni** un bras de Bézier, **ni** un coin de boîte de transformation.                    |
| **transform box** / boîte de transformation | Le cadre à 8 poignées d'Illustrator, qui fait tourner et redimensionner. **Refusé.**                                                          |
| **marquee**                                 | Le rectangle qu'on trace pour sélectionner plusieurs points d'un coup. Il disparaît au relâchement : aucun cadre ne subsiste.                 |
| **selection blue**                          | Le bleu de sélection. Une encre **réservée** : jamais servie à un pays. Point sélectionné = bleu plein ; non sélectionné = blanc à bord bleu. |
| **rubber band** / élastique                 | Le segment provisoire qui suit le curseur depuis le dernier point posé.                                                                       |
| **Bézier**                                  | Les courbes à poignées. **Refusées** : le format ne stocke que des points, et Chaikin arrondit au rendu.                                      |
| **path** / tracé                            | Une **liste ordonnée de références** vers des points. Il possède son ordre, pas ses points.                                                   |
| **tracés concomitants**                     | Deux tracés qui passent par les mêmes points. Bouger un point les bouge tous les deux.                                                        |
| **dupliquer un tracé**                      | Recopier la **liste**, jamais les points. Recopier les points ferait revenir le liseré.                                                       |
| **sliver** / liseré                         | La bande de terre sans propriétaire qui apparaît quand deux pays ont chacun leur copie d'une frontière. Le défaut qu'on interdit.             |
| **hit-test**                                | Décider quel point ou quel segment se trouve sous le curseur.                                                                                 |
| **cible de dessin** / drawing target        | Le pays dans lequel les points vont atterrir. Affichée en permanence tant que la plume est active ; sans elle, la plume refuse de dessiner.   |
| **sans territoire**                         | L'état d'un pays qui a une identité mais aucune géométrie. Normal : c'est ce qu'OHM donne pour la France en 1100.                             |
| **history manager**                         | Le module qui tient la pile d'annulation. Undo ‹ctrl+z›, redo ‹ctrl+shift+z›, plus les deux flèches.                                          |
| **snapshot**                                | Copier l'état entier à chaque pas d'historique. Notre choix : ~265 Ko le pas, aucun risque de corruption silencieuse.                         |
| **command pattern**                         | L'autre façon : chaque opération sait se défaire. Moins de mémoire, mais une erreur corrompt l'historique sans prévenir. **Écarté.**          |

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
| **document tab bar**                 | La ligne sous l'en-tête, qui porte l'année ouverte, son zoom et sa zone. `europe-1100.json @ 48 % (1100 / editorial zone)`.                                    |
| **status bar** / barre d'état        | La ligne du bas. Zoom tout à gauche (convention Illustrator), puis coordonnées, détenteur, échelle ; les totaux à droite.                                      |
| **artboard** / planche               | Chez Illustrator, la page. Chez nous, la **zone éditoriale** (lon −45…60, lat 20…76), nommée au-dessus de son cadre.                                           |
| **hairline** / filet                 | La séparation de 1 px (`#45403a`). C'est **la** séparation : jamais de gouttière, jamais d'ombre, jamais de carte arrondie.                                    |
| **rayon zéro**                       | Aucun `border-radius` dans tout le chrome. La règle qui à elle seule fait basculer l'écran du « web app » vers le logiciel de dessin.                          |
| **active polity swatch**             | La pastille au pied du rail, qui montre l'encre que la plume va poser. Reprend la place du fill/stroke d'Illustrator. Barrée de rouge quand rien n'est choisi. |
| **splitter** / poignée de séparation | La bande de 5 px entre deux groupes du dock. On la tire pour redistribuer la hauteur. `role="separator"`, donc manœuvrable aussi aux flèches.                  |
| **collapse** / repli                 | Replier un groupe sur sa seule barre d'onglets. **Pas un second mécanisme** : c'est la borne basse du redimensionnement, le même nombre.                       |

## Les outils et la méthode

| terme                | ce que c'est                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **spike**            | Un petit programme jetable pour répondre à une question. Les nôtres sont dans `files/spikes/`. |
| **payload**          | Le contenu d'un fichier de données, une fois chargé.                                           |
| **round trip**       | Ouvrir → modifier → enregistrer → rouvrir **à l'identique**. Le test d'un vrai éditeur.        |
| **Gherkin**          | La façon d'écrire un scénario : _Étant donné… Quand… Alors…_. Lisible sans être programmeur.   |
| **snap** / accrocher | Poser un point exactement sur un fleuve ou une côte qu'on possède déjà.                        |
| **georeferencing**   | Caler une image scannée sur de vraies coordonnées. **Abandonné** — on reporte à vue.           |
| **TPS**              | _Thin-plate spline_, la déformation élastique qui sert à ça. Abandonné avec.                   |
| **Chaikin**          | L'algorithme qui arrondit les angles d'une ligne en escalier.                                  |
| **scalerank**        | Le classement d'importance d'un fleuve chez Natural Earth. Décide lesquels on garde.           |
| **provenance**       | D'où vient un tronçon et sous quelle licence. Attaché au tronçon, pas au fichier.              |
