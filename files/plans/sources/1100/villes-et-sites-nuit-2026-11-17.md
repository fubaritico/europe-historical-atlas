# 1100 — la nuit du 16 au 17/11 : 1 366 villes, forteresses et abbayes de plus

> Sa demande à la fermeture du 16/11 : *« beaucoup plus de villes »*, la France et l'Espagne d'abord (forteresses,
> lieux médiévaux), puis la Pologne, la Russie, la Grèce, la Turquie ; l'ordre, les lots et la saisie laissés à
> l'historien. Tout est dans la base (fiches 1755 → 3120), rien n'est commité, la carte n'a pas été touchée.

## Ce qui est entré

| lot | combien | la ligne de source de chaque fiche |
| --- | --- | --- |
| villes de Bosker-Buringh, France et Espagne | 205 | population 1100 (source 14, « estimation pour 1100 ») |
| villes de Bosker-Buringh, Grèce, Pologne, Rus' | 25 | idem |
| forteresses (France 147, Espagne et Catalogne 133) | 280 | raison « forteresse », la phrase de la page Wikipédia qui la date avant 1100 |
| abbayes et monastères (France 123, Espagne 43) | 166 | raison « abbaye ou monastère » (créée cette nuit, n° 9 — CMS-431), idem |
| villes et monastères de l'Est (Turquie 66, Pologne 55, Grèce 32, Ukraine 14, Biélorussie 6, Russie 3) | 176 | importance « ville » (ou raison « abbaye ou monastère »), la phrase de la page anglaise |
| communes notables (France 473 — Conques, Rocamadour, Jumièges, Saint-Émilion, Sarlat… —, Espagne 41) | 514 | importance « ville », la phrase de la page qui la date avant 1105 |

La base passe de 1 723 à **3 089 villes en 1100**. `cities:alerts --map 1100` : 57 en alerte (54 au départ) — trois
nouvelles, Mahón, Ibiza, Formentera (voir plus bas). La ligne « importance » sert de preuve d'existence faute d'un sujet
« existence » (CMS-442) : à reprendre quand il existera.

## La méthode, pour la refaire

1. **Les candidats** : Bosker-Buringh (`files/spikes/city-sources/out/buringh-2021.tsv`) ; Wikidata par QLever
   (`qlever.dev/api/wikidata` — le service de requêtes de Wikidata et son API répondaient 429 toute la nuit) : châteaux,
   abbayes, monastères, prieurés de France et d'Espagne, puis les villes notables (≥ 25 Wikipédias) de l'Est.
2. **Le QID par la position**, jamais de mémoire : communes et municipalités de Wikidata appariées par nom et distance ;
   les coordonnées de Bosker-Buringh sont souvent fausses (Montélimar placée près de La Mecque, Valognes près de
   Limerick) — d'où sept villes crues absentes et déjà dans la base (Châteauroux, Perpignan, Quimper, Thionville,
   Tournus, Valenciennes, Grenade), écartées.
3. **Attestée avant 1105** : les chiffres de Bosker-Buringh pour 1100 sont presque tous calculés (« imputed »,
   « proxied »), pas attestés (Haguenau y a 1 000 habitants en 1100 et « founded ca 1115 » sur la même ligne) ; chaque
   lieu n'entre que si une phrase de sa page le date avant 1105, jugée par un agent sur les phrases datées.
4. **Le détenteur** : le titre de 1100 du pays dessiné sous le lieu (sa lecture du 16/11 pour l'Empire de l'Ouest,
   étendue ici), le plus employé par les fiches de 1100 quand le territoire en a plusieurs (Normandie → 380, Toulouse → 12).
5. **La citation** est la phrase telle qu'on la lit sur la page (texte rendu par l'analyseur de Wikipédia), vérifiée
   dedans ; renvois de notes « [2] » et espaces invisibles retirés. Chaque saisie relue par script contre son lot :
   37 citations mal recopiées par les agents (lettre tombée, faute de frappe, renvoi de note) corrigées après coup ;
   au contrôle final, les 1 136 citations sont exactes.

## Ce qui n'est pas entré, et pourquoi

- **Trop tardives d'après leur page** (32 villes) : Bilbao, Haguenau, Mont-de-Marsan, Villefranche-sur-Saône, Vire,
  Valdepeñas, San Roque, Mondoñedo… ; à l'Est, Lviv, Vologda, Ouglitch, Arkhangelsk, Corinthe (abandonnée au VIe s.
  d'après sa page)… — et 11 forteresses ou abbayes.
- **Non tranchées** (75 villes, ~260 sites, 215 communes) : la page ne date rien avant 1105, ce qui ne veut pas dire qu'elles
  n'existaient pas — Soria, Osuna, Gijón, La Corogne, Lectoure, Medina del Campo, Calais, Chios, Patras, Nauplie… :
  **une seconde passe par `/find-sources`** (les dictionnaires topographiques, la BnF) les rattraperait.
- **Sans titre sous elles** : Bilhorod-Dnistrovskyï (Coumans), Grudziądz (Prusses), deux villes de Cilicie arménienne,
  une sur une terre sans pays — aucun titre de 1100 pour ces pays dans la base.
- **Légères à vérifier** : Słupsk (1015 « selon plusieurs sources », 1227 pour d'autres) est entrée ; Tarnów, Gomel,
  Chełmno (charte « prétendue ») ne le sont pas.

## Le 17/11, matin et après-midi — l'Angleterre du Domesday (8 359 lieux)

Sa règle du matin : *« la population, c'est pas forcément un critère ; notre critère, c'est la durée dans le temps »* —
tous les lieux que le Domesday Book (1086) nomme, villages compris. Candidats : les éléments de Wikidata portant un
identifiant Open Domesday (P3118) et des coordonnées ; la citation est la première phrase de la page du lieu sur
opendomesday.org (source 3260, CC BY-SA), `where` son adresse ; détenteur = Guillaume le Roux, royaume d'Angleterre
(titre 122). 5 729 saisis le matin (session coupée), 2 609 l'après-midi, contrôlés par script contre leurs lots (une
citation corrigée). La base : **11 600 villes en 1100**. Laissés : ~1 400 éléments « … Manor » sans coordonnées.

**La frontière galloise — où les sources contredisent la carte.** 21 villages que le Domesday range sous le Cheshire
(hundreds d'Ati's Cross, Exestan, Duddeston) et un sous le Shropshire (Forden) sont dessinés sous le Gwynedd (Rhuddlan,
Bodfari, Prestatyn, Mostyn, Caerwys, Tremeirchion, Whitford, Brynford, Dyserth, Gronant, Meliden, Trelawnyd) et le Powys
(Hawarden, Hope, Gresford, Dodleston, Pulford, Broughton, Halkyn, Ysceifiog, Forden). Lecture retenue, sur un témoin
(Lloyd, *A History of Wales*, II, 1912 — source 3413, citations lues sur l'image des pages) : en 1100 le Tegeingl est
resté normand après la révolte (p. 411 : « the Normans showed no disposition to relax their hold upon such regions as
[…] Tegeingl and Rhos »), sous le comte de Chester Hugues d'Avranches, mort en 1101 (p. 386, 463), qui tient du roi
(p. 386, d'après le Domesday) ; Forden sous le comte de Shrewsbury Robert de Bellême (1098–1102, p. 412). Titres 394 et
395, maillons 280 et 281. L'autre hypothèse — le Gwynedd de Gruffudd ap Cynan — n'a pas de témoin pour 1100 à l'est de
la Conwy (Lloyd, p. 463 : maître « of the country west of the Conway » en 1100–1114) ; le Powys de Cadwgan pour
Hawarden–Gresford : non cherchée au-delà de Lloyd. Sur la carte, ces 21 sont en alerte.

**Second témoin, indépendant de Lloyd** (cherché le 17/11 au soir) : le cartulaire de l'abbaye Sainte-Werburge de
Chester (*The Chartulary or Register of the Abbey of St. Werburgh, Chester*, éd. James Tait, Chetham Society n. s. 79,
1920, archive.org `chartularyorregi791manc` — citations lues sur l'image des pages). Deux chartes encadrent 1100 :
- **1093**, charte n° 3 du comte Hugues, résumée par Tait p. 14 : « of the tithe of their demesne manors Eaton,
  Frodsham, Weaverham, Leek, Rocester, Hawarden, Coleshill, Bistre, Upton, [Chipping] Campden, and Eastham, and the
  tithe of the fisheries of Frodsham, Rhuddlan, Anglesey, Eaton, and the Dee » — Hawarden est un manoir du domaine du
  comte, la pêcherie de Rhuddlan est à lui.
- **1119**, charte n° 5 du comte Richard, p. 41 : « Willelmus de Punterleya dedit Butauari cum omnibus appendiciis
  suis, id est ecclesiam et totum manerium solutum et quietum, et siluam Lectone ad rogum faciendum, et ad communem
  usum domestici operis, concessu et testimonio Hereberti filii sui et Aluredi domini sui et Ricardi comitis. » — le
  manoir de Bodfari, au cœur du Tegeingl, est donné par un homme du comte, avec son accord ; même page : « Burel dedit
  ecclesiam de Haliwella » (Holywell).
Les notices du *Dictionary of Welsh Biography* (Edwin, Owain ab Edwin) citent Lloyd : même témoin, pas un troisième.
La page Wikipédia de Robert de Rhuddlan dit que la révolte de 1094 fit perdre « most of this territory » — ses terres
du Gwynedd, à l'ouest de la Clwyd ; elle ne dit rien du Tegeingl. Saisi le 17/11 : source 3414, deux lignes de plus sur le titre 394.

## Pour la carte (sa décision, la carte est la sienne)

- **Les Baléares** sont dessinées « Taifa of Dénia » (Q252323), la base les donne à la taïfa de Majorque (titre 7,
  Mubashshir — fiche de Palma) : Mahón, Ibiza et Formentera (fiches 1981, 2904, 2885) sont en alerte pour ça. Soit le pays dessiné change de nom et de QID,
  soit on ajoute la taïfa de Dénia au registre — à lui.
- Les 1 366 fiches portent le pays dessiné sous elles ; elles ne disent rien de neuf sur les frontières, sauf les Baléares.
- **Aucune n'est cochée « afficher dans l'atlas »** (le MCP ne le peut pas, c'est à lui) : sur la carte du Cartographe
  elles sont toutes là ; dans l'atlas publié, rien ne change tant qu'il ne coche pas.
