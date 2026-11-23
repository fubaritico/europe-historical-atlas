# Next — the historian's resume point

> Read **in addition** to `next.md` when a session starts as the historian (`/start-session`, _« en tant
> qu'historien »_); written by `/end-session` in that role. Not imported by `CLAUDE.md`: the code instance never loads
> it. The tasks are the board (`/jira`); this file holds where the historian stopped. Its readings are the team's,
> never attributed to a person (memory `a-reading-is-never-attributed-to-the-dev`).

**À faire dès qu'il a fini ses retouches de 1100** (sa demande, 13/11 : _« il ne faut pas qu'on se retrouve pollué par
plein de trucs »_) : effacer `/Volumes/Acer/atlas-historien/1100/toutes-zones/travail/1100-retouches.md`, son document de lecture des sept retouches. Les notes
de `/Volumes/Acer/atlas-historien/1100/` (kosovo, france-empire, lusatia) restent : ce sont la trace des sources.

## ▶ ON REPREND ICI — 23/11, 16 h 36 : l'Anatolie de 1100, la confrontation fiche par fiche

**Arrêt à 16 h 36** (lu avec `date`). Il ferme le terminal et le relance. **Au démarrage** : `/find-sources` en
entier (168 lignes d'ordres, lues avant toute recherche) ; `archive.py check` ; le journal se suit par
`tail -f /Volumes/Acer/atlas-historien/journal.log`. **Rien de moi sur le Mac**, pas même le dossier temporaire de
session : tout est sur Acer (`/find-sources`, « The archive »). Ne lui poser aucune question qu'il n'a pas à trancher.

**L'Anatolie** (`/Volumes/Acer/atlas-historien/1100/anatolie/`) : ses six axes et ses vingt-six points de contexte dans
la note (`resultats/note-de-region.md`) ; le contexte de 1071 à 1101 écrit à partir de quatre livres rangés dans
`ouvrages/` (Kaldellis, Angold, Setton I avec Cahen, l'Alexiade de Sewter) ; ses points comparés aux livres (Larissa
1083, Plaisance 1095, Nicée 18/06/1097, Smyrne rendue sans siège). **La suite, dans l'ordre** : (1) les 138 fiches de
1100 de la zone (`count_sheets.py 1100 26 36 45 42.2` : 106 citent un ouvrage à relire, 16 recopiées de la carte, 16 sur
Wikipédia seule) confrontées aux livres, « A region already researched » ; (2) relire les 106 citations dans leur texte ;
(3) le Palgrave de Byzance et ses cartes de 1100 ; (4) Gallica, puis la BnF et JSTOR — **vérifier avec lui qu'il y est
connecté avant d'y arriver** ; (5) l'index et la bibliographie de chaque livre.
**En retard** : les numéros de page de l'Angold (texte sans pages) ; *A Short History of Byzantium* de Norwich trouvé
sur archive.org, pas encore ouvert ; le Birkenmeier introuvable ; **`archive.py` ne range pas encore un texte page par
page** — à faire avant le prochain livre (REPO-501 en dépend).

**Ouvert** : mes trois tests de pertinence d'un ouvrage attendent son mot ; Danichmend deux fois dans les personnes
(9 et 179) ; quatre fiches de moi à retirer (palais de Rhodes 5123, Karlóvasi 4987, Kattavia 4755, Samosate = Samsat) ;
les citations latines d'Albert d'Aix à lire sur l'image. **Sa 1100 est à lui** : `polities.json` et `registry.json`
non commités, jamais touchés par moi ; ma copie d'avant mon dessin est dans `cartes/1100/` sur Acer.

## Avant — 22/11, 18 h 30 : la 1100 est à lui ; l'essai de lecture d'une carte, s'il le veut

**Arrêt à 18 h 30** (lu avec `date` ; la plage du journal : 22/11 16:01 → 18:29, 2 h 28, partagée avec le codeur).
`main` est à `8d7e57de`, rien n'est poussé. L'arbre `historian` est à `81ca7158` : à avancer au début de la session.

**Non commité, exprès** : `packages/atlas/public/years/1100/polities.json` et `registry.json` — mon dessin de l'est de
l'Anatolie, **qu'il a refusé** (_« c'est juste calamiteux comment c'est dessiné »_, _« je t'avais dit de t'appliquer »_).
**Sa 1100 est à lui** : il la retouche lui-même, peut-être depuis la carte d'Armenica ; je ne la commite pas, je n'y
dessine plus, je ne la restaure pas non plus sans son mot. Le retour arrière : `years/1100.before-claude-2026-11-22`, copié le 23/11 dans `/Volumes/Acer/atlas-historien/cartes/1100/`
(ignorée par git, gardée jusqu'à son mot). **Non commités aussi, à moi** : ce fichier et
`.claude/skills/use-cartographer/references/decide.md` — à commiter quand il le dit.

**Ce qui est dans la carte, non commité** (le journal local de `/use-cartographer`, section du 22/11 après-midi) : sept
entités reliées à leur territoire du CMS, sans dates — `saltukids` (387), `emirate-of-kars` (392), `shaddadids-of-ani`
(391), `shah-armens` (388), `mengujekids` (393), vassales de `great-seljuk-empire` ; `principality-of-sasun` (394) et
`lordship-of-melitene` (395), souveraines ; les Danichmendides reculés autour de Divriği et Kemah, Byzance autour de
Malatya. Mesuré : 46 alertes, aucun chevauchement ni pointe nouveaux. **Le défaut** : des ovales de points libres entre
les villes témoins, sans le relief ni la carte de référence.

**Sa piste pour que je sache lire une carte** (dite à voix haute le 22/11, pas une commande) : _« regarder la forme
d'un pays, lire les dates, confronter les dates que tu lis dans la carte et la forme du pays, reporter la forme du
pays »_. **Ma proposition, en attente de son mot** : un essai sur un seul pays, les Shah-Armens — caler
`files/resources/maps-to-be-derived/1100/Shaddadid.gif` sur nos villes (`/draw-from-plate`), relever le contour et les
dates de la légende, lui montrer le contour posé sur sa carte **avant** tout trait. **Avant cela** : la carte
(Armenica.org, CC BY-SA 3.0, source 5573, des XIᵉ–XIIᵉ siècles et non de 1100) passe par `/create-data-mention` — une
dette — qui dit si un contour peut en être décalqué.

**Fait le 22/11 après-midi** :

- **Le lot an-17 saisi** (16 h 45, après la fusion du codeur et la relance du CMS) : sources 5574–5579, personnes
  525–528, territoires 393–396, titres 418 (Mengüjek Gazi), 419 (Chordvanel, souverain), 420 (Gabriel de Mélitène,
  souverain), 421 (Mehmed bey Çubukoğlu), liens 297–298 (→ le sultan), lieux 13717 (Kharpout) et 13718 (Kemah), fiches
  13735–13737 ; Erzincan et Divriği passent à Mengüjek, Sason à Chordvanel ; des lignes en plus à Césarée de Cappadoce,
  Trébizonde, Ardahan. Export commité par le codeur (`a38abeda`), base contrôlée par lui.
- **Fragile** : le lien de Mengüjek au sultan tient sur une phrase (Wikipedia de, « eines Vasalls der Seldschuken »)
  quand Cahen écrit que rien n'est connu de ces relations et ne l'atteste qu'en 1118 — à renforcer.

**À faire, dans cet ordre, sans toucher la carte** :

1. **Danichmend existe deux fois** dans les personnes (9, Q714771 ; 179, Q20473921, celle du titre 262) : lire les deux
   sur Wikidata, lui dire laquelle garder (je ne supprime pas une personne).
2. **Quatre fiches de moi à retirer ou fusionner** (saisies les 17 et 19/11) : le palais des grands maîtres de Rhodes
   (lieu 5104, fiche 5123 : n'existait pas en 1100), Karlóvasi (4970 / 4987) et Kattavia (4739 / 4755) sans attestation ;
   Samosate (13651) et Samsat (2540) sont le même lieu.
3. **Les citations latines d'Albert d'Aix** (VIII, 8 : Ancras, Gangara) à lire sur l'image des pages avant de les saisir.
4. **Le rattrapage des noms anglais** (sa décision du 22/11 : un champ de traduction ne reste jamais vide) : ma part
   est ce que Wikidata ne nomme pas, les 58 territoires sans identifiant, et la relecture des noms de pays venus de
   Wikidata. **Ne rien commencer avant la liste du codeur** (pas prête : sa lecture est à 8 040 sur 14 055, l'état est
   sur CMS-495). Un lieu : `name` en langue « en » ; un territoire : `otherNames`. Ensuite chaque création portera les
   deux langues.
5. **Les noms d'époque** (collection `period-names`) : quatorze d'Anatolie (Gangra, Sozopolis, Heraclea, Sis, Kaysun,
   Turbessel, Kerasous, Amisos, Oinaion, Lopadion, Prousa, Attaleia, Heraclea Pontica, Manzikert), plus Mélitène,
   Kharpert, Kamakh ; ceux des 26 lieux slaves ; le tri des 132 de `noms-a-trier.md` **quand il le demande**.

**La 1100, en alerte exprès** : Kastamonu, Aksaray, Bayburt, Alanya, Korkuteli, Ermenek, Payas, Düziçi, Siverek (témoins
trop faibles pour bouger une frontière) ; Mopsueste et Gerger sont solides ; Kaysun (Kogh Vasil) est à dessiner ; Cizre
et Mardin sont rouges à juste titre. **Pas dessinés** : Çubukoğulları (Kharpout), Dilmaç (Bitlis), Artukides de Mardin,
Hisn Kayfa, Mossoul, Damas. **Mesuré dans Cliopatria** : Roum y garde un seul contour de 1099 à 1138.

**Avec le codeur** : REPO-496 (mes défauts d'outil, cinq à ce jour), REPO-500 (`cities:alerts` muet sur un vassal direct
non dessiné quand son souverain est sous la ville). Le disque : le dossier des textes d'Anatolie n'existe plus.

## Avant le 22/11

Les points de reprise du 19/11 et du 20/11 sont dans `.claude/archive/next-history.md`, section « Moved out of
`next-historian.md` on 2026-11-23 », mot pour mot.

## Les cartes — l'épique CARTO-400 (les vingt cartes de base)

| année      | où                                                                      | état                          | ce qui lui reste (le détail sur son ticket)                                              |
| ---------- | ----------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| 1000       | worktree `years/1000` (+ une copie non commitée dans l'arbre de `main`) | générée, build OK — CARTO-403 | Grande-Bretagne, Irlande, Sardaigne ; Bouyides et Danemark (grosses reprises) ; 6 côtes  |
| 1100, 1200 | `main`, publiées                                                        | les siennes                   | —                                                                                        |
| 1300       | `main`, publiée (`3c9e335`)                                             | retouchée par lui             | provenance ATLAS-408 : version Cliopatria v0.2.1 et article (Bennett et al. 2025) donnés |
| 1400       | worktree `years/1400`                                                   | générée, build OK — CARTO-404 | 6 îles partagées ; 5 grosses reprises ; 7 côtes                                          |
| 1500       | worktree `years/1500`                                                   | générée, build OK — CARTO-405 | Grande-Bretagne ; khanat de Crimée ; Naples, Raguse                                      |
| 1600       | worktree `years/1600`                                                   | générée, build OK — CARTO-406 | Grande-Bretagne et Irlande ; Danemark-Norvège, Crimée ; 53 pays seulement avec Wikidata  |

**Sa décision (09/11)** : 1000, 1400, 1500, 1600 (et 1700) **ne se commitent pas** tant que lui et moi ne les avons pas
finies de nettoyer ; aucune ne se copie dans `main` avant son mot. L'index du worktree liste les sept (pour le build),
jamais commité.

**La course d'une carte** (≈ 25–40 min de gestes) : l'import (`files/spikes/cliopatria-import/` : `resolve.py` puis
`convert.ts`), puis les six passes de `/use-cartographer` (« The order of work »). **Le chef d'orchestre des passes**
est `files/maps/pipeline/plan.mjs` + `plan.sh` dans le worktree (git-ignorés) — **une dette** : à faire entrer dans la
skill, avec ses tests. Les plans et registres de chaque année : `files/maps/<année>/` du worktree. Il faut recréer à
chaque session : les bibliothèques Python `shapely`, `pypdf`, `pillow` dans `/Volumes/Acer/atlas-historien/outils/python/`
(une fois, `pip install --target`, lancées par `outils/py`), et la base de Cliopatria
dézippée depuis `opensrc/repos/github.com/Seshat-Global-History-Databank/cliopatria/cliopatria.geojson.zip`.

**1700 et après** : OpenHistoricalMap (CC0), `files/spikes/fetch-ohm/fetch-ohm.mjs` — pas encore au format d'une année
du Cartographe.

## Les sources

- **La méthode** : `/use-cartographer` `references/layers.md` (la couche de base, les calques de vérification, les
  villes, la mention) ; `/find-sources` (neutre — toutes les hypothèses suivies ; l'index des livres, récursif, sur
  archive.org, JSTOR, la BnF).
- **Les scans d'atlas** : la recette est `find-sources/references/scanning.md` (VueScan, 300 dpi, feuille noire). Il
  scanne sur un disque externe en **exFAT** (nom à me donner) ; le premier atlas, _Les Balkans, atlas historique_
  (Hupchick, Cox), a 12 pages dans `/Volumes/mùùùmù/ATLAS-BOOKS/2026-11-10-0001.pdf`. Plusieurs séances = plusieurs
  PDF, que j'assemble avec `pypdf` (les originaux gardés).
- **Shepherd** (1911/1923) est un calque comme Cliopatria (sa décision, ATLAS-153).

## Ouvert, à sa décision

- **La règle d'arrêt de la recherche récursive** (ma proposition, « à confirmer » dans `/find-sources`).
- **Le registre des couleurs** tiré de sa 1100 (un pays garde sa couleur ; un vassal prend celle de son suzerain ; un
  successeur hérite) — proposé, pas lancé.
- **Les lacs partagés entre un pays et une terre sans maître** : le geste des lacs coupés, pas celui de l'île.
- **ATLAS-410** (dans Idées) : les frontières de chaque année publiées en traits, sous CC BY-SA.
