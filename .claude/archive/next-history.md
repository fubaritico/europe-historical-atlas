# Next — archive


## Archivé de next-historian.md le 18/11 (historien) — les sections du 16/11 au 10/11

### ▶ 16/11, 23:30 : plus de villes (sa demande à la fermeture)

**Sa demande pour la session suivante** : un travail de sources pour **plus de villes en France, en Pologne, en Russie si
possible, en Grèce et en Turquie** — il donnera aussi d'autres villes à rechercher. Même méthode qu'au soir du 16/11 :
une liste par l'importance (Bosker-Buringh, `files/spikes/city-sources/out/buringh-2021.tsv`, villes absentes du CMS,
attestées avant 1105), QID vérifiés sur Wikidata **par la position** (jamais de mémoire : la moitié étaient faux le 16/11),
saisie par un agent, puis `pnpm cities:alerts --map 1100` pour vérifier. Aussi en attente : dessiner la **vicomté de
Carcassonne** (Carcassonne, Agde en rouge) quand il lâche la carte ; la passe sièges, abbayes, forteresses de l'Empire de
l'Ouest ; les maillons 91 (Carcassonne → Barcelone, faux) et 83 à supprimer par lui.
**Commits, depuis le 16/11 (REPO-460)** : la première ligne finit par son ticket, « … [CARTO-457] », ou par « [no-ticket] »
pour des données ou une note qu'aucun ticket ne sert ; commitlint refuse sinon, et le ticket compte dans les 100 caractères.

### ▶ 16/11, soir : les alertes de la carte 1100, de 399 à 54

**L'outil** : `pnpm cities:alerts --map 1100 [--box=…]` (CARTO-456), lancé depuis l'arbre de `main` — il juge chaque ville
comme l'écran. Un pays sans QID se reconnaît par le numéro de son territoire du CMS (CARTO-450, champ `territory` du pays).
**La lecture choisie par le dev** : une ville suit le duché ou le comté dessiné sous elle quand sa chaîne le saute
(Lorraine, Carinthie, Franconie, Thuringe, Frise, Romagne : titres créés, tenus par le duc ou par Henri IV). Les clercs
hors des chaînes, sauf Cologne, Trèves et Mayence (dessinés sur la carte comme archevêchés, à retoucher par lui).
**Les 101 villes de l'Empire de l'Ouest** (fiches 1654–1754, Bosker-Buringh ≥ 2 000 hab. en 1100, attestées avant 1105) :
validées par lui, toutes bien placées dans leur duché. Leur détenteur vient du duché dessiné, pas d'une source.
**Sa décision, 16/11 ~22:00 (par le codeur)** : l'Allemagne de l'Ouest jusqu'à au moins 200 points — les villes de plus de
20 000 habitants attestées avant 1105, les sièges épiscopaux et grandes abbayes, **les forteresses** ; vivier
`files/resources/historien/1100/regions/germany-west-1100-research/`. Reste : la passe des sièges, abbayes et forteresses ; 8 villes sans QID sûr
(Quedlinburg, Courtrai, Nivelles, Tirlemont, Saint-Trond, Tiel, Zutphen, Kempten) ; Lübeck, Brandebourg, Burg (terres
slaves sans pays). **Carcassonne tranché par les sources** : vicomté souveraine (titre 251), Albi et Castres sous
Toulouse (titre 393).

### ▶ ON REPREND ICI — 16/11, 16:24 : tout reprendre depuis le début

**D'abord, lire ce qu'il a changé à la main** (16/11, 16:25) : **Mons et le duché de Basse-Lorraine**, qu'il crée lui-même
dans la base — rien d'autre. Ne pas écraser ses fiches : chercher le territoire et le titre qu'il a créés avant tout geste.

**Sa demande** : reprendre toutes les chaînes de 1100 depuis le début, région par région (la Lotharingie d'abord), avec
**son critère** : le suzerain est **celui qui gouverne au-dessus** — un hommage, une génuflexion, un tribut, la prière du
vendredi, une dignité ne font pas un suzerain ; un clerc n'entre que là où il gouverne la terre. Seul **son texte**
fait foi (`files/plans/contribution/vassals/saisie-et-exploitation-des-chaines-de-vassalité.md`, en tête), jamais le
tableau du débat dessous. Entrer les niveaux manquants (les duchés : la Haute-Lorraine porte un nom tronqué, « Duchy of »,
territoire 270), corriger les maillons, trancher et finir dans la base. **Contrôle** : les planches **politiques** de
Shepherd sur Commons (`File:Europe mediterranean 1097.jpg` ; « Germany and Italy 919–1125 » à chercher) — Shepherd
sépare la carte religieuse de la politique ; le PDF de Google est illisible. Vérification de toute la base :
`files/resources/historien/1100/chaines/chains-1100-verify/verify.py` (lecture seule).

**Ce qui est en cours** :

- **Les citations copiées du code wiki** (« [[…|…]] », « {{s-|XI|e}} ») : **bloquant, pour maintenant** (sa décision) —
  une citation est la phrase lue sur la page. 1 546 lignes. `files/resources/historien/1100/chaines/chains-1100-verify/render_quotes.py` produit
  `rendered.json` (la phrase de la page, vérifiée dessus ; à 650/1 546 au départ, 615 retrouvées) ; à finir, puis la
  liste vérifiée au **codeur, qui l'applique d'un coup** sur une copie de sa base ; les « not-found » se reprennent à la main.
  Wikipédia et Wikidata refusent plus d'une demande par seconde (429).
- **Les souverains cochés au critère** : comtés catalans, Apulie, Pologne, Rascie, Dioclée, Venise, Écosse, taïfas
  tributaires, Zirides, Médine, Jérusalem, Antioche ; Champagne, Rethel, Amiens, Corbeil, Montlhéry sous le roi. À revoir
  dans la reprise comme le reste.
- **CMS-454** (supprimer moi-même titres et maillons) : codé par le codeur, puis la case « delete » sur ma clé et son CMS
  relancé ; d'ici là, **jamais de suppression**. Alors : les maillons 103 (Soissons → évêque), 221 et 165 (Godefroy,
  Bohémond → patriarche).
- **Une mise à jour groupée** qui touche les deux bouts d'un maillon le réécrit deux fois (Payload, en parallèle) : un par un.

**Ensuite** : 26 QID de territoires désignent une entité d'une autre époque (diocèses modernes, principautés plus tardives —
`badqid` à refaire par script, Wikidata P571/P576) : les retirer (le numéro du CMS sert d'identifiant) ou trouver le bon ;
les noms de diocèses modernes (Modène-Nonantola, Plaisance-Bobbio…) au nom de 1100 ; 7 maillons et 4 maisons sans source.
**Sa décision attendue** : l'ancien champ texte du détenteur (holderName/holderQid) tiré du titre, proposition du codeur.

### ▶ 16/11, 11:45 : les chaînes de 1100 presque toutes fermées

**Fait** (détail : `completed.md`) : 1 529 villes de 1100 sur 1 622 ont une chaîne fermée jusqu'à un souverain. Ses
règles, toutes dans le tableau de `../files/plans/contribution/vassals/vassal-chain.md` : pas de diocèse dans une chaîne, pas de
comte sous un évêque, les rois sous l'Empire (Italie 359, Arles 356, Germanie 360), la chaîne complète, **une année sans
mois = le 1ᵉʳ janvier**. Travail : `files/resources/historien/1100/chaines/chains-1100-review/` (rapports par lot, sources, scripts ;
`work-dupes.sh` = la requête des doublons, à relancer après chaque passe).

**Reste, dans l'ordre** :

1. **Quand le codeur aura les deux types** (« Diocèse », « Seigneurie ecclésiastique ») : retyper les 117 territoires
   d'après `classement-religieux.md` (72 seigneuries, 40 diocèses, 5 sans réponse) — et les 6 créés depuis (345, 348,
   351, 353, 354 : seigneuries).
2. **32 villes à chaîne ouverte** : leur titre n'a pas de suzerain trouvé après deux recherches (Längwitzgau, Tortosa,
   Luni, Bologne, Beichlingen, Foix, Comminges, Molina, Ariano, Grandpré, Mottola, Dießen, Wettin, Médine, Inalides…) —
   une troisième recherche, autres bibliothèques (BnF, Gallica, MGH), ou les holders faux d'abord (`holders-to-fix.md`).
3. **61 villes sans titre** : rivaux (Cambrai, Côme, Concordia, Chalon, Sorrente, Sarno, Labourd), lieux sans seigneur
   nommé (Lomello, Sondrio, Carmagnola, Bizerte, Béja, Azov, Acerra, Gênes, Bâgé, Novi Ligure, Treviglio, Verbania, Massa,
   Trieste, Termonde, Rehehausen, Vaucouleurs, Molfetta, Terlizzi, Poreč, Plötzkau, Domersleben…), Toropets.
4. **Détenteurs faux** (`holders-to-fix.md`) : Verceil, Vérone, Ceneda (un évêque de 1152), Albenga, Sienne, Gubbio,
   Valence (Henri), le palatin de Saxe (Sommerschenburg), Wettin, les Cadolingi (Ugolino).

**À lui, sans urgence** : supprimer les titres que plus rien ne cite (24, 43, 45, 61, 99, 137, 327, 328) et le territoire
308 ; les doublons Saint-Siège 176 / États pontificaux 1, Adria 222 / 60, Passau 220 / 94 ; les Zirides gardent un maillon
« nominal » vers le calife quand Almoravides, Seldjoukides, Hammadides sont souverains — à harmoniser.

**Ma règle à moi, apprise le 16/11** : finir dans la base, ne pas rendre de comptes rendus en fichiers ni de listes de
questions ; trancher d'après les sources, dire en une ligne ce que j'ai tranché.

### ▶ 15/11 : la nuit des chaînes de vassalité (compte rendu : `files/plans/sources/1100/compte-rendu-nuit-2026-11-15.md`)

**À la reprise, d'abord** (sa demande, 15/11) : **confronter nos deux modèles de déclaration de la chaîne** (CMS-422). Le
mien : des _entités_ (seigneuries, charges ; QID, type, souveraine), des _tenures_ (qui tient l'entité, de quand à quand),
des _liens_ (telle entité relève de telle autre, avec lignes ; une divergence = un second lien) ; la certitude calculée,
jamais tapée ; la fiche pointe vers une entité. Dette : cette nuit les détenteurs sont tantôt des personnes, tantôt des
entités — une passe de normalisation par script une fois le modèle choisi.

**Ses décisions en attente** : le périmètre (viviers prêts : **France 15 393, Allemagne de l'Ouest 7 140** candidats ≤ 1105 —
`files/resources/{france,germany-west}-1100-research/` ; faits : les villes françaises ≥ 20 000 hab. des provinces ; restent
fr-08…14, les banlieues d'Île-de-France, mises de côté) ; la date de la carte — **réglée** : une année entière (sa décision du 30/10, `dateOverlap.ts`), un changement dans l'année donne les deux détenteurs dans l'ordre ; Lodi (la ville
moderne, pas Lodi Vecchio) ; les seigneurs sans élément Wikidata ; la liste d'attente
`files/resources/historien/1100/chaines/belonging-1100-research/pending-owner-sheets.md` (~50 fiches, la source orpheline 1595).

**Régions restantes de son plan** (`files/plans/sources/1100/night-plan-2026-11-15.md`) : les îles Britanniques, la Serbie et
l'Ukraine (seconde passe), la Turquie, le Levant, l'Irak, le Caucase.

**Les outils de la nuit** (`files/resources/historien/1100/chaines/belonging-1100-research/`) : `REGION-belonging.md`, `REGION-links.md`,
`REGION-sheets.md`, `france-1100-research/REGION-france.md` (les notes données aux agents) ; `FIX-sheets.md` (corriger une
fiche existante) et `ENTER-towns.md` (saisir une ville nouvelle) ; `work/snapshot.py` (photo de la base avant une saisie),
`work/check-fix.py --any <ids>` (aucune citation changée, une ligne au QID du détenteur, pas de « par le district » sur la
fiche), `work/register.py` (régénère `vassalage.md`). **La chaîne** : un lot de recherche (`source-researcher`, ≤ 35 tours),
puis sa saisie (general-purpose, Sonnet) pendant la recherche du suivant, puis mes contrôles par script.

### ▶ ON REPREND ICI — 14/11 : la Pologne faite, l'est de l'Allemagne en cours, un agent à la fois

**La méthode du 14/11** (validée par l'usage, sur son mot « un agent à la fois ») : un lot de recherche
(`source-researcher`), puis sa saisie confiée à un agent de saisie (general-purpose, consignes de `/enter-in-cms`), puis
ma vérification par script (citations dans leur texte, aucune source orpheline, une ligne au QID du détenteur), puis le
codeur en lecture seule. Environ 130–150 k jetons la recherche, autant la saisie. **Sa règle du 14/11** : le détenteur
d'une fiche est le seigneur le plus proche que les sources prouvent (écrite dans `/enter-in-cms`). **Jamais** une ligne
de détenteur pour une preuve d'existence (CMS-442 attend).

**Pologne, fini** : 16 villes saisies (Wrocław, Sandomierz, Kruszwica, Bardo, Kamieniec, Czerwień, Giecz, Głogów,
Kołobrzeg, Międzyrzecz, Nakło, Niemcza, Przemyśl, Santok, Wolin, Łęczyca). Les villages ne rendent rien (0 sur 12) : ce
sont les châtellenies qui rendent. **En attente de sa décision, l'archéologie seule** (question posée plusieurs fois,
sans réponse) : Bytom, Czersk, Kalisz, Kamień, Legnica, Ląd, Opole, Płońsk, Radom, Szczecin, Wizna, Wiślica, Wojnicz,
Wyszogród, Włocławek ; aussi Krosno et Lubusz (détenteur non daté). Travail : `files/resources/historien/1100/regions/central-europe-1100-research/`.

**▶ À FAIRE EN PREMIER (le dev, 14/11 au soir) — chaque lieu doit avoir une appartenance.** Ma dérive du 14/11 : les lieux
qui existaient en 1100 mais dont le rapport disait « aucun seigneur sous l'Empire » ont été laissés hors de la base (et 27 fiches
vides supprimées par lui), au lieu de remonter **au vassal du district** avec une ligne qui le prouve (règle écrite dans
`enter-in-cms`, « Every place has a belonging »). **Rattrapage** : reprendre tous ces lieux — dans les rapports
`files/resources/historien/1100/regions/germany-east-1100-research/reports/de-*.json` et `central-europe-1100-research/reports/{pl,plc,cz,czc,at}-*.json`,
les `towns` avec `existed1100 == "existed"` et sans fiche dans la base (par QID) — les 27 de la liste de
`files/plans/sources/1100/germany-east.md`, ceux de de-11 à de-13, Oedt, Assling, Tristach, Leisach, Göming (hameau), Mělník,
Stará Boleslav, Netolice, Litomyšl, Břeclav, Tetín… ; pour chacun, le vassal du district en 1100 et sa source. Puis l'Angleterre
(feu vert du dev : bourgs du Domesday, chefs-lieux de comté, **châteaux et abbayes comme lieux**, avec leur raison d'importance),
et rattraper la raison « forteresse » (CMS-431) sur les châteaux déjà saisis (Vyšehrad, Kłodzko, Dřevíč, Eckartsburg…).

**Est de l'Allemagne, fini (14/11)** : 13 lots, 125 lieux (fiches 1052–1176) ; le raisonnement, les écarts avec sa
carte, les lieux sans seigneur prouvé ; les 27 fiches vides supprimées par lui le 14/11 : `files/plans/sources/1100/germany-east.md`.
Saalfeld pour l'Orlagau et Cologne à l'archevêché Q11805 : **signés par lui le 14/11**.
Méthode retenue le 14/11 : agent de recherche sur Opus, saisie sur Sonnet, **en chaîne** (la recherche du lot N+1 pendant la
saisie du lot N), **pas de fiche sans ligne**, une question part en notification et je continue.

**Tchéquie, en cours** : `central-europe-1100-research/`, `REGION-czechia.md`, `work/mklot-cz.mjs <C> Q213 cz-NN <start> 15`
(Autriche : `Q40 at-NN`) ; 181 pistes tchèques avant 1105, 126 autrichiennes. **cz-01** : 2 fiches (Svojšice, Dřevíč ;
1177–1178) ; Přerov en attente (archéologie seule). **cz-02 : 0** — les chartes « 1043–1073 » de Břevnov, Ostrov, Rajhrad,
Opatovice sont des faux du XIIe–XIIIe s. (CDB I n° 378–386). **Pistes tchèques arrêtées** (règle d'arrêt, 14/11). **Puis les châteaux** (`REGION-czechia-castles.md`, lots czc-01–02,
Cosmas 1607/1783 et CDB I) : 12 fiches (1261–1272) — Vyšehrad, Litoměřice, Žatec, Bílina, Starý Plzenec (le Plzeň de 1100),
Hradec Králové, Chrudim, Libice, Olomouc (Svatopluk), Brno et Znojmo (Bořivoj II), Kłodzko. Pour sa carte : **Znojmo et Břeclav
moraves** (carte : Bavière). **Autriche, finie (14/11)** (`REGION-austria.md`, 8 lots, 126 pistes) : 64 fiches (1179–1242). **À lui** : le château de
Pitten (fiche 844, Saint-Empire) au comte Ekbert de Formbach ? ; Aflenz (1185) et Stolzalpe (1227) gardent une ligne « Herzog
Heinrich III. 1090—1122 » (titre de section) — je la retire ou lui ? Un hameau attesté se saisit sous son propre QID (Kröllendorf, Laabach, Tiffen, Maria Feicht, Oberthern). Pour sa carte :
Pfons et Sistrans à Brixen (carte : Bavière), Reisenberg dans la Marche d'Autriche (carte : Hongrie).

**Sa carte de 1100, retouchée par moi le 14/11 à sa demande** (« au plus simple, géométriques », lui repasse) : Normandie,
Hainaut–Cambrésis, Mâcon, Lusace–Nisan, Reims, Erfurt, Marche du Nord ; copie `years/1100.before-claude-2026-11-14` ; détail
dans `.claude/skills/use-cartographer/references/journal.md`. **Non commité.** Reste à lui : Douai, Groitzsch–Wiederau,
l'Orlagau, Lehesten–Coburg, deux angles aigus. `files/resources/1100-retouches.md` à effacer quand il a repassé dessus.
**L'archéologie seule : oui** (14/11) — les 18 saisis (fiches 1243–1260).

**Le rattrapage des QID de détenteur** (14/11) : 63 lignes sur 49 fiches ; restent 306 lignes sans QID sûr (constats,
groupes, noms vagues). Travail : `files/resources/historien/1100/passes/qid-backfill-1113/`.

**Ses tickets du 14/11** : CMS-441 (le lien qui ouvre la page de la source, le passage surligné — en tête d'À faire),
CARTO-435 (accord par le suzerain), CMS-442 (une ligne d'existence, en Idées par le codeur), l'épique DESIGN-432.

### ▶ ON REPREND ICI — 10/11, après la nuit des sept cartes

**Où je travaille** : le worktree `.claude/worktrees/historian`, branche `historian-1109`, **jamais l'arbre de `main`**
(sa préférence, 09/11) — sauf pour lui livrer une carte quand il dit qu'elle est prête. **Le resynchroniser sur `main`**
dès que `main` bouge et à chaque carte finie (`git merge --ff-only main`, ou `git rebase --autostash main` quand un
commit à moi y a été reporté ; mémoire `resync-worktree-with-main`). Mon serveur du Cartographe : port **5180**, lancé
depuis le worktree (`pnpm -C <worktree>/packages/cartographer exec vite --port 5180 --strictPort`).

**Mes commits en attente de fusion** : `7cc7251` (la recette de numérisation) — l'instance principale fusionne mes
commits sur `main` en avance rapide ; vérifier qu'il y est (`git log main`).


## Archivé de next.md le 17/11 à 14:25 (reprise du 17/11 à 00:05)

### ▶ ON REPREND ICI — le 17/11 : il valide, l'historien finit sa nuit, les icônes 3D avec le modèle Fable

Session du codeur fermée le 17/11 à 00:05 (détail dans `completed.md`). **Son usage : 26 % pour 1 jour et 6 heures.**

- **REPO-460 n'est pas poussé** : `67736ea` est dans `main` (le ticket en fin de première ligne de chaque commit, tenu par
  commitlint) — à pousser sur son mot. Tout le reste de la session est sur GitHub (`91208b0`).
- **Demain, dans son ordre** : (1) **il valide des tickets** — à valider : CMS-422 (la chaîne sur la fiche, le toast du
  maillon refusé), CMS-431, CARTO-453, REPO-460 ; (2) **le travail de nuit de l'historien** : les correspondances de cartes,
  les sources des derniers éléments ajoutés dans le Cartographe ; (3) **les icônes 3D avec le modèle Fable**, qu'il me
  donnera (ATLAS-287, ATLAS-288, épique ATLAS-132).
- **En haut d'« À faire »** : ATLAS-448, CMS-454, CMS-441, CMS-455 — et **CMS-459** (les 1 546 citations en code wiki,
  critique), créé ce soir, en bas de la colonne : c'est à lui de le placer ; je le mettrais en tête.
- **En cours** : il en reste trop qui ne bougent plus (CMS-225, ATLAS-134, ATLAS-136…) — à trier avec lui. CMS-279 : il reste
  la garde du seed (une heure), noté sur le ticket. ATLAS-461 : ses ornements en vecteur, j'attends ses premiers fragments
  SVG (le dossier et les noms).
- **1100** : 69 villes en alerte sur 1 622 (`pnpm cities:alerts --map 1100`), dont 18 du Saint-Empire listées ce soir (Vérone,
  Pitten, la Silésie…) ; la carte de `main` porte les retouches non commitées du dev et de l'historien.
- **Ses décisions en attente**, une à la fois : la case « Souverain » qui s'enregistre au clic (pas à « Enregistrer ») ; une
  personne son propre parent (revue QUAL-002) ; une chaîne divergente vérifiée sur sa première lecture souveraine
  (QUAL-003) ; six vassaux à deux suzerains en 1100 (Champagne, Anjou, Bellême, Carcassonne, Naples, Lérida).

**Sur le tableau** : À valider — **CMS-422** (la fiche de ville, les deux types à venir), **CARTO-435**, CMS-431, CMS-433.
En cours — CARTO-445 (attend le design system 0.10.0, `HANDOFF-from-fubaritico-ds.md`). Backlog — **CARTO-450** (Wikidata
d'abord, à défaut le numéro du territoire du CMS — sa règle du 16/11), CMS-451. Haut d'À faire — ATLAS-448, CMS-441.

## Archivé de next.md le 17/11 (reprise du 16/11 à 04:20)

### ▶ ON REPREND ICI — le 16/11 à 04:20, session fermée à sa demande (13:50 → 04:20, avec un /clear à 00:10)

**Ajouté vers 05:30, après la fermeture** (le codeur n'a fait que relire la base de l'historien, rien d'écrit ni de commité) ;
le dev, épuisé et en colère : _« vous vous perdez en cours de route »_. **À la reprise, une chose à la fois, la sienne d'abord.**

- **Sa règle, ~05:40 : le type d'un territoire est indicatif, jamais une règle** — _« c'est la raison d'être de la ville, c'est
  pas sa fonction ; on ne peut pas aller jusqu'à ce niveau de granularité, il faut arrêter »_. Aucun code (verdict, chaîne,
  refus du CMS) ne décide sur le type. **Retiré** : ma proposition du type dans l'export pour reconnaître un roi sous l'Empire.
- **Les règles des chaînes sont dans son document du 16/11 au matin**, seule source :
  `files/plans/contribution/vassals/saisie-et-exploitation-des-chaines-de-vassalité.md` — N-1 sous un souverain, N-2 sous un
  empire sans condition, jamais le premier maillon (ville + tenant) sauf la cité-État, toujours quelque chose à dessiner,
  aucune ville sans titre, le diocèse une raison (« siège épiscopal »), deux rangs du clergé. Codé : `7fbc120`, `e19262c`.
- **Le territoire 42 (Saint-Empire) est typé « royaume »** dans la base, pas « empire » : à corriger par l'historien avant la règle.
- **Huit titres orphelins, vérifiés cités nulle part** (seulement leurs lignes de source) : 24, 43, 45, 61, 99, 137, 327, 328 —
  à lui de les supprimer.
- **Des évêchés sont entrés dans les chaînes cette nuit** (Turin, Naumbourg, Mersebourg, Halberstadt, Novigrad, Lodi, Parme…) :
  ils attendent les deux types ; le classement de l'historien est prêt (`files/resources/historien/1100/chaines/chains-1100-review/classement-religieux.md`).
- **Six vassaux à deux suzerains en 1100** (Champagne, Anjou, Bellême, Carcassonne, Naples, Lérida) : fief annexe ou vrai lien,
  non tranché.

**D'abord, les deux types qu'il a validés à 04:10** (CMS-422) : le type de territoire « Évêché » devient **« Diocèse »**
(circonscription religieuse — **jamais dans une chaîne** : le CMS refuse un diocèse comme suzerain, vassal ou détenteur,
le dit en rouge sous le champ) et **« Seigneurie ecclésiastique »** (le pouvoir temporel d'un évêque, archevêque ou abbé :
Cologne, Liège, Strasbourg, Trente, Laon, Reims, Fulda — politique, dans la chaîne comme un comté ; au-dessus d'un comte
seulement si une source le dit : Hainaut fief de Liège en 1071, **cité de mémoire**). Pas d'« électeur » en 1100 (qualité
datée, pour plus tard). Son principe : _« un diocèse n'a jamais été plus fort qu'un comté »_. Puis le **feu vert à
l'historien**, qui a préparé cette nuit, en recherche seule, le reclassement des 88 évêchés et 29 abbayes et les
corrections des 12 maillons à suzerain religieux (Soissons 103, Paris 95 et 97, Amiens 93…), 46 à vassal religieux, 59
titres religieux détenteurs — dans `files/resources/historien/1100/chaines/chains-1100-review/`.

**Ensuite, le Cartographe ne doit jamais obliger à dessiner** (sa colère de 04:30 : *« pourquoi je dois dessiner un truc
déclaré dans le CMS ? »*, *« on ne peut pas dessiner aussi fin »*) — trois corrections proposées, **sa réponse attendue
(« maintenant ou demain »)** : ~~(1) le niveau vérifié non dessiné → le suivant dessiné~~ — **refusé** (le dev, 16/11 :
_« il y aura toujours quelque chose à dessiner »_ ; codé `455074b`, annulé `55ca4db`) : le rouge reste, le niveau se dessine ;
~~(2) une ville sans titre~~ — **il n'y en aura pas** (faute de source, l'historien en crée un) ; (3) la boîte de la ville dit
d'où vient le détenteur (« Tenue par (CMS) », ou « ancien texte : … » — l'ancien champ « Pays » n'est plus à l'écran du
CMS). **La fenêtre de la ville refaite** — la réponse en couleur en haut, la chaîne en colonne, les sources repliées
(plan montré à 04:40, sa réponse attendue : *« illisible, tout est serré, c'est moche »*).

**Fait cette session, tout dans `main` = `56d06d2`, rien de poussé** (détail dans `completed.md`) : la fiche de ville
refaite — champ de Payload (✎ ✕ +) pour « Tenue par » et les sources ; la chaîne en **blocs répétitifs**, les mêmes pour
saisir et modifier, tout part à « Enregistrer », toujours cliquable, ce qui manque dit en rouge ; source facultative ;
case « Souverain » (migration `sovereign`, il a relancé son CMS) ; père et mère dans « Personnes » ; CARTO-435 corrigé
(jaune, couleur du pays, plus d'ardoise) et la règle des niveaux.

**Tranché par lui le 16/11** : une année sans mois = le 1ᵉʳ janvier (47 fiches rattachées par l'historien).
**Ses décisions en attente**, une à la fois : la case « Souverain » s'enregistre encore au clic (pas à
« Enregistrer ») ; une personne son propre parent, un parent supprimé qui se vide chez ses enfants (revue QUAL-002) ;
une chaîne divergente n'est vérifiée par niveau que sur sa première lecture souveraine (revue QUAL-003).

**À savoir** : la revue à plusieurs agents n'a pas tourné sur `6f910fd` ni `56d06d2` (à faire avant de pousser) ;
l'outil MCP `updateTitles` ne décrit pas le champ `sovereign` (l'historien l'écrit quand même) ; trois fiches orphelines
(titre 137, territoire 308, titres 327, 328, et le titre 61) — il refuse de les supprimer, elles restent.

**L'historien** (16/11, 11:45) : 1 529 villes de 1100 sur 1 622 ont une chaîne fermée jusqu'au souverain ; 32 ouvertes, 61
sans titre ; les 117 territoires religieux classés pour tes deux types (`files/resources/historien/1100/chaines/chains-1100-review/classement-religieux.md`).
Ses règles de la nuit dans `vassal-chain.md` (dont **une année sans mois = le 1ᵉʳ janvier**). Son point de reprise : `next-historian.md`.



## Archivé de next-historian.md le 16/11 (reprises du 15–16/11)

## ▶ ON REPREND ICI — 15/11 au soir : la périphérie saisie, le registre « Personnes » rempli

**Son but, ses mots (15/11)** : *« des villes, le plus de villes possibles, les attacher à une date, les attacher à une
vassalité »*. **Fait ce soir** : 151 villes de la périphérie (fiches 1502–1652, sources 1621–1696) — Afrique du Nord,
Espagne-Portugal, Rus', Crimée-Alanie-Volga, Biélorussie, Scandinavie ; la Finlande n'a rien donné (aucun détenteur).
Travail : `files/resources/historien/1100/regions/periphery-1100-research/` (notes `REGION-*.md`, consigne `ENTER.md`, contrôle
`work/check-entry.py`, les atlas en texte `sources/atlases/`, l'atlas des Vikings lu par la reconnaissance de macOS).
**« Personnes »** : 110 maisons, 186 personnes (`files/resources/historien/1100/chaines/people-1100/`, à revoir : `review.md`) ; **à lui** :
supprimer les fiches 172 (doublon d'Humbert II, ma faute) et 178. **CMS-422** : étapes 1 et 2 du codeur faites
(territoires, titres, maillons) ; reste à moi l'étape 3 — les détenteurs des ~270 entités (Wikidata n'en donne que 30 :
recherche à faire), puis les maillons de `vassalage.md`. **Le serveur de requêtes de Wikidata** était en panne le 15/11
(une requête par minute) : les viviers larges attendent son retour. Sonnet ne fait que la saisie, la recherche reste
sur Opus (sa question du 15/11). ## ▶ ON REPREND ICI — 16/11 : la chaîne de 1100 dans le CMS

**Ce qui l'attend, à lui** (une question à la fois) : **Riazan** sur sa carte — la principauté de Riazan (Q269109) ou
Mourom-Riazan (Q549817), comme le disent les sources pour 1100 ; **la couleur des villes** dans le Cartographe — la
chaîne dans l'export et CARTO-435 sont au codeur : le lui demander ? ; **ses suppressions dans le CMS** : les titres
341, 242, 332 (doublons, plus rien ne les cite), les maillons 57, 63, 64 (sans témoin), puis la source 1954 (notre
registre, jamais une source). Passau est une histoire divisée (Ulrich grégorien / Thiemo l'impérial) : deux titres à
saisir, pas une erreur. **Ma règle de saisie** est dans `/enter-in-cms` (titres et maillons en série, un par personne,
territoire et années ; la famille comme `house` ; jamais `vassalage.md` comme source).

**Seconde vague, saisie (15/11, nuit)** : 113 titres de plus (241–353 ; titres des détenteurs qui n'en avaient pas,
`titles/reports/pt-*.json`, `assemble_pt.py`), holderTitle sur **1 291 fiches sur 1 621**, **119 maillons** (69–119 :
`assemble_links.py` → `entry-links-2.json`). **Reste** : ~330 fiches sans titre (abbayes et sièges sans titulaire connu,
détenteurs à plusieurs titres, familles), les 62 maillons de `links-review-2.md`, Passau en histoire divisée, Brno
(apanage), Empoli, Bolzano, Mansfeld, les 104 fiches sans ligne au détenteur ; au dev : supprimer les maillons 57, 63,
64 puis la source 1954 ; arbitrer Riazan (Q269109 sur sa carte, Mourom-Riazan Q549817 dans les sources) ; le code de la
couleur des villes (la chaîne dans l'export + CARTO-435) est au codeur.
**CMS-422 étape 3, première vague (15/11, nuit)** : 229 territoires (1–229), 130 personnes (315–444), 256 sources (1695–1950),
**240 titres** (1–240, 509 lignes), et **holderTitle sur 1 050 fiches** — tout contrôlé, le codeur a relu A–C. **Reste** :
holderTitle pour 126 fiches (détenteur à plusieurs titres : choisir celui sous lequel est la ville), 57 (entité qui
change de main dans l'année), 223 (personne sans titre : surtout la périphérie — créer son titre), 165 (sans titre ou
hors registre) ; 13 titres dont le témoin n'est que le registre (recherche) ; **les maillons** (vassal-links) de
`vassalage.md` ; 104 anciennes fiches sans ligne au détenteur (`titles/no-holder-line-sheets.txt`) ; au dev : supprimer
les personnes 398, 399, 407, 408, 413, 415, 432. Détail : `titles/entry-review.md`.
**Avant (15/11 au soir) — la recherche** : `files/resources/historien/1100/chaines/people-1100/titles/` — `from-base.json` (99
entités résolues depuis la base) et `reports/ti-01…13.json` (137 détenteurs nommés) ; ~230 des 273 entités ont leur
personne de 1100, 143 personnes avec QID, ~60 sans élément. **L'assembleur existe** (`titles/assemble.py` →
`entry-titles.json` + `entry-review.md`, premier passage : 233 territoires dont 29 sans nature, 121 personnes à ajouter
dont 74 sans QID, 237 titres, 83 cas mis de côté). **Avant toute saisie, trois reprises** : fondre les sources (300
« à créer » = un même ouvrage sous plusieurs libellés, beaucoup déjà dans la base — chercher par titre et url
d'abord) ; retrouver l'ouvrage des 18 lignes « registre seul » ; donner une nature aux 29 territoires (et lire la
nature sur le libellé de l'entité, pas sur celui de la ligne — Q12544 lu « Alexis Ier »). **Rien de saisi pour les
titres.** **Depuis da484d3 (15/11 au soir)** la fiche a `holderTitle` (l'id du titre, premier maillon) — après la
relance de son CMS et `/mcp` : chaque fiche reçoit son `holderTitle` une fois les titres saisis ; `holderName`/`holderQid`
restent remplis jusqu'à la fin de la reprise ; jamais de saisie pendant qu'il relance. Puis → territoires, personnes manquantes, titres, puis maillons de `vassalage.md` ; corriger en route les
erreurs listées dans `people-1100/review.md` (événement/ville/famille comme détenteur, évêché pris pour l'évêque,
Desmond, Thuringie, Nitra, Rupert de Bamberg). **Le registre de sa carte de 1100** donnait à la Norvège Q202266 (Marguerite Iʳᵉ de
Danemark) : à remplacer par Q2196956 — **demandé au codeur le 15/11 au soir, sur son « vas-y »** (il avait d'abord dit
d'attendre la fin des recherches) — détail dans `files/resources/historien/1100/chaines/people-1100/review.md`.


## Moved out of next.md on 2026-11-15 (end of session, the file past 200 lines) — verbatim

**L'épique des villes, CARTO-363** : tout ce qui était dans À faire est fait et validé (367 à 371, 382, 384 à 391) ; CMS-391
montre dans l'atlas les seules villes cochées. **Ouverts, à sa décision** : une ville choisie puis écartée par un filtre
reste choisie (revue QUAL-004 de CARTO-390) ; CARTO-387, la boîte de la ville en panneau flottant. **Puis son plan** :
reprendre la retouche des frontières dans le Cartographe.

**Ouvert par décision, à lui de trancher un jour** : les icônes animées (épées qui se balancent, trébuchet) ignorent
« réduire les animations » du système — un constat de la revue du 27/10, ATLAS-300 dans Idées.

**Dettes, à savoir** : les scénarios des hachures et des paliers du 09/11 pas écrits (`/scenarii-to-code` §7) ; la bande des
souverains absente du Cartographe (essai atlas seul) ; CARTO-365 (les rayures cuites côté Cartographe) ; le PNG du README
(`.github/brand-mark.png`) ne se régénère pas seul — à refaire si la marque change (dessiné par Core Graphics depuis
`brandMarkSvg(64)`).

## Moved out of next.md on 2026-11-11 (size), verbatim

**Les numéros des ports fixes** (REPO-383 ; ma proposition : l'atlas 5173, le Cartographe 5174).

**L'interface de l'atlas — l'épique ATLAS-329** : la maquette de Claude Design (v2, son contenu inventé, ne pas le juger)
vit dans `files/resources/claude-design/`, une seule version. Je reprends son travail en jetons et styles dans
`fubaritico-ds` ; lui dessine dans Illustrator ornements et cartouches. **Prochaine étape** : la découper en tickets, avec
lui. Ornements par époque : `files/plans/atlas/ornament-by-era.md`.

**Le gestionnaire de sources** (demandé le 30/10 : des sources pour toute saisie) : CMS-332, `files/plans/contribution/source-manager.md` — tout se construit tel qu'écrit, par
moi, boîte mail comprise, chaque mail sur son clic, et piloté à la voix par le plugin MCP de Payload.

**Les villes, où on en est** (ATLAS-295, en cours) : **113 villes de 1100** dans sa base et dans le fichier de l'atlas ; dessinées
par paliers de détail (`files/plans/atlas/detail-levels.md`, dix décisions), noms selon la distance à la caméra, un point de capitale
sur un nom de pays cède (ATLAS-323). **En attente, à lui de trancher un jour** : les sièges que ni Wikidata ni la carte de la Rus'
ne datent (Roskilde, Nidaros) ; les villes qu'aucune des trois sources n'atteste (la Géorgie — Koutaïssi, Tbilissi —, Uppsala,
Sigtuna, Ispahan) — une source de plus, ou Wikidata seul, jamais inventées.
**L'incertitude** : n'en parler que quand un algorithme existe.

## Moved from next.md on 2026-11-05 (to keep it under 200 lines), verbatim

**Des fautes de frappe dans ses données du CMS** : « pelrinage » dans « Raisons d'importance » (« évêché » corrigé le 31/10) ; le type d'événement « Polithique - Accession au trone » — à lui de les corriger.

**Pour le design system** : son menu déroulant, ouvert vers le haut, cache le champ au-dessus ; il ne peut pas relier un texte
d'aide au menu — deux demandes à transmettre à son Claude.

## Moved from next.md on 2026-11-03 (evening)

**Les domaines** : commandés et branchés le 02/11 (`.org` principal, `.com` `.eu` `.net` `.fr`), DNS chez OVH, page d'attente
sur le site Netlify `europe-historical-atlas-soon` (la page : `~/Desktop/europe-historical-atlas-soon/`). **Le certificat
ne couvre que `.org` et `www.org`, par ma faute** (j'ai fait retirer un domaine qui marchait) : le message au support de Netlify
lui a été donné ; ne plus cliquer « Renew » (5 par semaine). Boîtes Zimbra `contact@` et `demandes@` à créer.

**À regarder dans une prochaine session** : le Claude du design system modifie sa skill Trello pour que les chantiers
deviennent des **épiques** avec des tickets enfants (un système de parents) — à reprendre ici quand il le dira.

**Décidé et noté, rien à faire maintenant** : les feature flags attendent un vrai besoin, surtout dans l'atlas, décrits
d'abord en scénarios (CARTO-268) ; les Khazars sont deux entités, sans phases (une date vague = `circa` à marge large).

## Moved from next.md on 2026-11-03 (end of session)

**L'audit des instructions du 29/10** (`files/prompt-audit-2026-10-29.md`, non versionné) remplace celui du 27/10 : ses
parties A et B sont appliquées. Restent, sans urgence : les skills chargées dans tous ses projets (partie D — `supabase` se
déclenche ici sur « migrations », « React », « audit » : la désinstaller au niveau global ?) et les points de la partie C,
dont ses décisions — l'anglais des fichiers de session, `format:check` dans le contrôle local, la « phase de recherche »,
la marche d'une planche « référence », l'accessibilité de l'admin du CMS. **Une seule question à la fois, et seulement s'il
y a vraiment à trancher.**

**Sa copie de base** du 27/10 avant le seed : `packages/cms/cms-backup-2026-10-27-2300.db` (ignorée par git) — à lui
de la supprimer.

**Où parlent les messages du Cartographe** (24/10) : la barre d'état est **à l'outil** ; l'année sur le disque parle en
**toasts** (en bas au centre) et en **modale d'alarme** (`persistence/notice.ts`). Le hand-off du design system arrive à
la **racine de ce dépôt** (`HANDOFF-from-fubaritico-ds.md`) : le lire avant de brancher une version.

## next.md on 2026-11-02, 5 a.m. — the top blocks of the night, replaced by the two-instance resume point

> Moved verbatim at end-session.

## ▶ ON REPREND ICI — 02/11, 4 h : de vraies cartes, et la vitesse

**Le tournant de la nuit.** Il a vu les concurrents (YearMaps, Borders of Time, HistorIQly, Geographic History… ; la liste et
leurs données : mémoire `cliopatria-is-cc-by`) et a failli tout arrêter : *« notre projet ne peut être rattrapé que par la
qualité et la précision, sinon c'est un jouet »* — et *« ce n'est pas une démo, ce sera publié, j'ai dépensé de l'argent »*.
Ce qui l'a retenu : sur la carte Cliopatria importée, **la pose des villes et le calcul des noms marchent bien**.

**Sa décision** : on arrête l'interface de l'atlas (ATLAS-329, s11 → s15 écrits, la suite attend) ; **deux chantiers**, dans
l'ordre du tableau, en tête d'À faire :
1. **la vitesse** — ATLAS-333 : *« passer d'une année à l'autre en deux secondes »*, mesuré sur deux années aussi fines que la
   1100 (Cliopatria aux côtes calées), pas sur des côtes grossières qui tromperaient la mesure ;
2. **de vraies cartes, dans le Cartographe** — CARTO-334 (l'import Cliopatria, côtes calées sur le masque), CMS-335 (« tenue
   par », proposé par Wikidata), CARTO-193 (le panneau Villes, les villes-témoins en rouge si du mauvais côté), CARTO-336 (les
   panneaux repliables), CORE-337 (l'algorithme de vote : les cartes et les villes votent, net au-dessus de 75 %, hachuré
   dessous ; d'abord la Catalogne de 1100).

**Pourquoi trancher par vote** : il ne sait pas trancher quand deux ou trois sources diffèrent (*« la Catalogne, c'est tout
le temps différent »*) ; la méthode tranche une fois, la machine l'applique à chaque année, il n'arbitre qu'une liste courte.

**L'étude Cliopatria** : `files/spikes/cliopatria-import/` (`resolve.py` puis `convert.ts`, la fiche et ses mesures,
`dependencies.md` : 344 dépendances). Sa règle (*« le plus récent l'emporte »*, trouvée en comparant avec YearMaps) a supprimé
tout chevauchement. Cliopatria est dans `opensrc/` ; `shapely` dans un venv du dossier de travail (à recréer).

**Fait cette nuit, non commité, à tester par lui** : **« Open… »** dans le Cartographe — la liste des années enregistrées
(1100, 1200), le Cartographe se recharge sur l'année choisie (`?year=`), la page gardée d'abord ; revue faite, une haute
corrigée (un geste pendant la sauvegarde), gate du Cartographe verte (2 301 tests). Les deux cartes Cliopatria sont dans
`years/1100/` et `years/1200/`, côtes de Natural Earth (57 229 et 58 856 points) ; sa 1100 d'avant dans
`years/1100.dev-2026-11-01/`. **Ce qui compte pour lui : Open, Save, Save as** — *« les snapshots, j'en ai plus rien à
faire »* ; **Save as… demain**. Il nettoie les côtes seulement, jamais les frontières (l'algorithme des villes s'en
chargera si le test de vitesse tient).

**Un signal de vitesse, mauvais** : le test de l'atlas qui lit la 1100 publiée passe de quelques secondes à **2 minutes**
avec la 1100 Cliopatria (côtes Natural Earth, centaines d'îles) — à mesurer en premier dans ATLAS-333. Tant que cette 1100 est
sur le disque, le crochet de commit (tests) bloque tout commit : bon garde-fou, mais il faudra adapter ce test (il attend des
tribus que Cliopatria n'a pas).

⚠️ **`years/1100/` sur le disque contient l'import Cliopatria** (il l'a enregistré pour le voir) : **ne rien commiter de
`years/`** ; le remettre par `git restore packages/atlas/public/years/1100/` quand il le dit — sa copie est aussi sur son
bureau (`~/Desktop/europe-historical-atlas-1100-backup-2026-11-02/`). Il redoute que sa 1100 reprenne trop d'Euratlas
(CARTO-237).

## En vol, 01/11 au soir — rien de commité encore

- **L'audit des instructions** (`files/prompt-audit-2026-11-01.md`) : **fini**, retour par retour avec lui. Gardés par lui :
  l'agent d'accessibilité tel quel (pas de contradiction, selon lui), les exemples Python/Rust d'`/opensrc`, et
  **`/zustand-react-pattern` intact** (l'atlas aura peut-être Zustand). Créés en chemin : `/repo-version-manager`
  (contrôle mensuel des versions), REPO-330, ATLAS-331, CMS-332.
- **Les domaines** : commandés chez OVHcloud le 01/11 (n° 262643965, `.org` `.com` `.eu` `.net` `.fr`, 40,52 € TTC), « en
  cours de validation ». **Fait le soir même** : la page « en construction » (le logo de l'écran de chargement, « Atlas en
  construction », `contact@europe-historical-atlas.org` ; `~/Desktop/europe-historical-atlas-soon/`, hors du dépôt), déposée
  sur un second site Netlify **`europe-historical-atlas-soon`**, le `.org` en domaine principal, les quatre autres en alias ;
  l'atlas reste sur `europe-historical-atlas.netlify.app`. **Après la validation d'OVH** : dans la zone DNS de chaque domaine,
  un A `@` → `75.2.60.5` et un CNAME `www` → `europe-historical-atlas-soon.netlify.app` (DNS gardé chez OVH pour le
  courrier) ; les boîtes Zimbra `contact@` et `demandes@`. **Le DNS est fait (02/11, nuit)** sur les cinq zones. **Le certificat
  est cassé, par ma faute** : il ne couvre que `europe-historical-atlas.org` et son `www` ; les huit autres adresses
  (`.com` `.eu` `.net` `.fr`, avec et sans `www`) donnent une erreur HTTPS depuis que je lui ai fait retirer et rajouter un
  domaine qui marchait. « Renew certificate » ne les ajoute pas ; le message au forum de Netlify lui a été donné
  (réinitialiser l'état SSL du projet). Seule l'adresse `.org` est à donner en attendant. Le jour de l'ouverture : les domaines passent du site d'attente à celui de l'atlas, rien à changer chez OVH.
- **ATLAS-329, l'interface en scénarios** : il sépare **l'interface à plat** (boutons et fenêtres par-dessus la carte, le
  design system, pas de 3D) de **ce qui se passe dans la carte** (clic sur un pays, un événement, le focus) ; on écrit la
  première d'abord. Écrits le 02/11 : `s11` le bouton de langue (un bouton qui se déplie, chaque langue écrite dans sa
  langue), `s12` le bouton d'aide (chaque geste avec sa touche ; un diaporama ouvert seul à la première visite), `s13` le
  cadran de navigation (neuf touches au-dessus de la barre en bas à droite, deux coins contextuels), `s14` la capture
  (encadrée comme la feuille, un cartouche en bas à gauche avec l'année et les crédits), `s15` le siècle (« ‹ XIᵉ siècle › »
  en haut, une liste de vingt, **pas de frise** : *« calmos »*) ; trous A-15 → A-21 (A-15, A-16, A-18 tranchés). **Il a des défauts de navigation à me remonter.** Suite : les autres boutons de l'interface à plat.
- **Le gestionnaire de sources** : CMS-332 (Backlog), `files/plans/contribution/source-manager.md`. Il **fait confiance à
  Commons** ; chaque mail part sur son clic.
- **La Rus' de 1100** : la ligne d'ATLAS-152 dit « RÉFÉRENCE · géométrie redessinée », or ses tracés ont été reportés à la
  main (un calque, gardé sous la confiance à Commons) — **à corriger**. Mourom-Riazan en 1100 : vassal de Tchernigov ? à lui.

## ▶ ON REPREND ICI — l'interface au-dessus de la carte, en scénarios pour Claude Design (ATLAS-329, en tête d'À faire)

**01/11, fin à 3 h 06.** Les scénarios de la carte sont écrits (ATLAS-324, Fait) : `files/plans/atlas/scenarii/`, dix scénarios et
quatorze trous, commit `5202b43` **non poussé** — à pousser quand il le dira. Il a fixé la suite :

1. **La liste des fonctions de l'interface** — celles déjà promises sont dans `files/plans/atlas/interface-scenarios.md` (siècle,
   clic sur un pays, panneau d'un événement, bouton du focus, focus pays, boutons, langue, provenance, le pourquoi d'une
   incertitude) ; **la lui présenter, il choisit**, une question à la fois.
2. **Un scénario par fonction**, à la suite de s10 (`s11`…), du côté du lecteur, sans inventer de commande ; les trous dans `s99` (A-NN).
3. **L'ambiance** : ses captures de l'atlas, de vieilles cartes, d'autres captures — **jamais commitées sous droits**, dans
   `files/resources/` (ignoré) ; une carte du domaine public peut entrer, avec sa source.
4. **Ensuite, retour au code** (*« il y a encore plein de choses qui nous attendent »*) — en tête : ATLAS-326 (le défilement par les
   bords), puis la couronne ; ATLAS-327 et 328 en bas d'À faire.

**Ses citations, dans un fichier neuf, en anglais** (01/11, mémoire notée) ; les textes à l'écran et les tickets restent en français.
**À lui proposer d'abord** : taper `/doctor prompt-audit` (la skill `/scenarii-to-code` a changé le 01/11).


## The whole of next.md as it stood on 2026-10-17, before the task list moved to Trello

> Moved verbatim when the board became the list of tasks (`files/plans/trello/board-feeding.md`, step 6).
> Every task it names is a card; the cards cite this archive when they need its context.

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`).
> **The plan of record is `files/plans/plan.md`.** This file is the short pointer to it.

### Where we are

**2831 tests** (756 `core` · 787 atlas · 1206 Cartographe · 82 plugin `eslint-plugin-eha`, 12/10 au soir), gate verte sur cinq contrôles (`lint`,
`type-check`, `test`, `build`, `format:check`). Worker à **13 490 o**, toujours sans three.js — et depuis
le 07/10 le Cartographe émet **le même chunk, au même hash**, le fond étant cuit par le même port.

`git log origin/main..main` dit ce qui attend un push — **mais il lit la référence de suivi locale, qui
peut être périmée.** Le 08/10 elle annonçait neuf commits en attente qui étaient déjà en ligne depuis la
veille ; un `git push` les a rafraîchis sans rien envoyer. Pour la vraie réponse :
`git ls-remote origin main`. Le dépôt est **en ligne et déployé** :

|       |                                                                             |
| ----- | --------------------------------------------------------------------------- |
| dépôt | `fubaritico/europe-historical-atlas`, **privé**, branche `main`             |
| site  | **https://europe-historical-atlas.netlify.app**                             |
| CI    | sept jobs, tous verts — validate ×3, build, sonarqube, quality-gate, deploy |
| Sonar | opérationnel, `europe-historical-atlas` sous l'organisation `fubaritico`    |

Structure : **trois paquets**, orchestrés par **Turbo**, avec un **catalogue de versions** dans
`pnpm-workspace.yaml`.

| paquet | ce que c'est | lint | tests |
| --- | --- | --- | --- |
| `core` | pure TS, ni three.js ni DOM ni React ni zustand — **tenu par ESLint et par `tsc`**. Cinq couches : `utils`, `geo`, `data`, `pipeline`, `editor` | config racine | **`node`**, 682 |
| `atlas` | l'application 3D, three.js vanille | config racine | `jsdom`, 782 |
| `cartographer` | l'éditeur de territoires, React 19 + Vite 8. Son `publicDir` **est** celui de l'atlas | **sa propre config**, qui réimporte la racine | `jsdom` + plugin React, 886 |

**Trois faits de structure à ne pas re-découvrir** : *flat config n'a aucune cascade*, donc la config d'un
paquet **réimporte** la racine et ESLint résout **une** config depuis le **répertoire courant** — d'où un
`lint` par paquet · `core` tourne sous **`node`** parce que jsdom lui prêterait un `document` que la
production n'a jamais · la **couverture est fusionnée** par `scripts/merge-coverage.mjs`, parce que chaque
paquet écrit `SF:src/…` et que Sonar résout depuis la racine (sinon **0 % sans erreur**).

`zod/mini` est une dépendance de `core` : **+9,15 ko gzip** pour tout le format, mesuré, et **zéro octet**
dans le chunk worker (13 490 o, hash inchangé — toujours vérifié par la CI).

### ▶ P4, LE CARTOGRAPHE — les cinq étapes

> **À relire à chaque ouverture de session** — demande du dev, 27/09 : *« ça c'était clair, et tu me le
> réponds à chaque prochaine session, parce qu'avec ça je comprends bien et je me souviens bien. »*
> L'ordre est dicté par les dépendances, pas par une préférence.

| | c'est quoi | ça livre quoi | on sait que ça marche comment |
| --- | --- | --- | --- |
| **1** ✅ | Les **types** des trois fichiers + trois **lecteurs** écrits à la main, dans `packages/core/src/data/` à côté de `heightmap.ts` et `landMask.ts`, derrière `assetError.ts`. Plus l'**adaptateur** vers `RegionPayload` | **L'atlas lit une année écrite à la main et l'affiche.** Zéro ligne de `src/` modifiée | on écrit un dossier `1100/` à la main, `pnpm dev`, la carte s'affiche |
| **2** ✅ | Le **modèle de document** : les ancres une fois, les anneaux en index, et les opérations — poser, déplacer, supprimer, **dupliquer un tracé**, fermer un anneau. Plus la **dérivation des frontières** | Un document qu'on manipule dans des tests, sans écran | un aller-retour sauvegarde/chargement **conserve le partage** : on bouge une ancre après, les deux contours suivent |
| **3** ✅ | L'**historique** : un instantané par geste, plus la ligne que `{History}` lit et les **jalons** | `ctrl+z`, et cliquer un rang | même piège : restaurer doit restaurer le **partage**, pas les coordonnées |
| **4** ◀ | Le **canevas 2D**, coupé en deux : l'**arithmétique** (hit-test, marquise, élastique, écran↔monde) qui est pure, et le **dessin**, une coquille sans logique | On dessine à l'écran | l'arithmétique se teste avec des littéraux — et c'est cette coupe qui la rend testable du tout |
| **5** | Le **chrome** : `{Polities}` en arbre, les formulaires, `{Overrides}`, les trois marques d'année dérivée | L'application | les valeurs viennent de `design/chrome.css`, jamais son markup |

Les étapes **4 et 5 créent `packages/cartographer/`** — un troisième paquet, comme la taxonomie du dev
dans `architecture.md` : Payload est une app, l'atlas est une app, `core` est une ressource.

**Comment** : chaque étape se vérifie et **se commite seule**, pas d'accumulation. `core` reste sans
three.js et sans DOM, donc les étapes 1, 2 et 3 sont **entièrement pures**. Chaque garde se teste **en la
cassant exprès**. Gate à chaque fois : `pnpm type-check && pnpm lint && pnpm test`, puis `/review`, puis
`/commit`.

**La vulnérabilité bloquante est fermée** (27/09, étape 2). Une seule invariante y suffit : **le tableau
d'ancres ne perd jamais rien pendant l'édition.** Donc `removePolity` retire une *revendication*, jamais un
point — les ancres de côte d'un pays sont aussi celles de son voisin. Ce qui n'est plus référencé disparaît
à l'enregistrement, par une seule renumération. Vérifié en la cassant : 3 tests tombent.

### ▶▶▶▶ ON REPREND ICI — après le 16/10

**Tout est commité et poussé** (`5c96eaf` + l'état de session ; vérifier par `git ls-remote origin main`). Le dev
retouche l'Angleterre, puis Écosse, Irlande, Byzance — surtout des réglages de couleurs. Ordre proposé, **il tient
l'ordre** (mémoire [[do-not-start-unasked-work]]) :

00. **Passer à Trello, au début de la séance** (décision du dev, 16/10 au soir) : l'avancement suivi par **tickets**
    sur un tableau Trello. Voir avec lui si je peux agir sur le tableau (un MCP Trello ou une skill) ; puis y verser
    cette liste.
0. **Les deux gênes du 16/10 au soir** (`known-issues`) : outils actifs de plus loin ; ‹P›/‹A› muets sur un pays
   neuf ou vide — attendre son cas exact, le reproduire, puis corriger.
1. **Son retour sur l'expérience de dessin dans le Cartographe** (*« compliqué à expliquer »*) : le recueillir même en
   désordre, en faire des scénarios avant de coder.
2. **Les couleurs** : comparer et régler le mélange atlas ↔ Cartographe, capture pour capture.
3. **`H-46`** : la validation des contours qui se recoupent (19 pays listés dans
   `files/plans/atlas/2026-10-16-coasts/exact-fills.md`).
4. **Recreuser un vassal depuis l'outil** (`known-issues`).
5. **La séance sur le style des frontières** : épaisseurs par main, vrai pointillé, main de frontière (`H-45`).
6. La revue à quatre agents de la soudure (`b3f4e20`) et `H-37` partie 2 ; ⟨retracer⟩ / supprimer depuis un suzerain
   sur les bords tenus par un vassal ; le `Dock` redimensionnable et le zoom 128 ; `H-43` et la marque « modified ».
7. Le découpage des teintes dans le worker et un index pour le picking ; `boundsMatch` et la suppression de `borders/`
   (GPL) ; Playwright ; trier les copies de `years/1100*` (`rm` : sa permission) ; la nouvelle version du DS en dernier.
8. **La publication de 1100 et la licence Euratlas** (clauses 6/9) : à reprendre **quand il montre la carte finie**,
   pas avant.

### ▶▶ LE TEST GÉNÉRAL — contexte (le dessin est fait, voir le point ci-dessus)

**Le test général** : copier la planche Euratlas **AD 1100** dans le Cartographe, tout ce qui se dessine
(royaumes, duchés, comtés, vassaux), pour éprouver l'outil et rectifier les décisions prises avant l'usage
(le dev : *« s'il y a des décisions erronées, tu nommes le problème et on rectifie »*). **Ouvrir
`/draw-from-plate`** — la méthode **lente**, un pays à la fois, vérifié contre la planche avant le suivant.

- **Fait** (nuit du 14/10) : 137 pays, tout ce que les huit planches couvrent. **Reste** : le nord, l'est et le
  sud hors planches (captures Euratlas à faire), et les corrections du journal des défauts.
- **L'atlas s'ouvre sur 1500** : passer `year` à 1100 dans le panneau de dev pour voir le tracé. Proposer au
  dev qu'il s'ouvre sur l'année dessinée (une ligne, `devParams/political.ts`).
- **À la fin du test** : ranger `years/1100/` en `years/1100.test-euratlas/`, remettre
  `years/1100.avant-test-euratlas/` en `years/1100/` (voir `known-issues.md`).
- **Questions en attente du dev** : remplacer
  « main » par « style » dans le glossaire ; la séance sur le **style des frontières** (épaisseur, pointillé
  dans l'atlas) ; **l'intégration de la nouvelle version du DS en dernier** (`MIGRATION-color-roles-from-
  fubaritico-ds.md` à la racine, non lu).
- **`H-43`** (`s99`) attend une décision : nommer le pays suivi dans le message du résultat.
- **`H-44`** (`s99`), relevé par le dev dans l'atlas : un vassal dessine des **pointillés sur ses côtes** et **contre un souverain étranger** (Bohême–Pologne). Une seule cause — sur un tronçon partagé, le suzerain dont la limite coïncide compte comme l'autre côté — et un seul remède : le retirer, puis juger ce qui reste. **À faire en premier, avec son test.**
- **`H-45`** : les tirets du style vassal sont trop longs dans l'atlas — une cadence de tirets par style, dans la table des styles (`borderHands.ts`). Avec la séance sur le style des frontières.
- **Le push** : le dev pousse lui-même les commits en attente (13/10).

### ▶ ON REPREND ICI (13/10) — une nouvelle méthode, puis les « petites choses »

**La méthode, décidée par le dev le 12/10 au soir** : *« tu vas vraiment tester toi-même ce que tu codes sur
l'application […] ça fait tester l'accessibilité […] et puis je te regarderai faire. »* Chaque changement du
Cartographe se termine par **moi qui l'utilise dans son Chrome**, clavier compris, sous ses yeux, avant de
dire « fait » (mémoire [[test-it-yourself-in-the-app]]). Attendre le fond avant d'agir : les clics pendant
« Preparing the backdrop… » se perdent.

| | quoi | |
| --- | --- | --- |
| **1** | **Les « plein de petites choses qui vont pas »** — le dev a essayé l'app le 12/10 au soir et les a vues, sans les lister. **Lui demander la liste d'abord**, puis les prendre une à une avec la méthode ci-dessus | ◀ |
| **2** | **Une question à lui poser** : la barre d'actions reste active de loin, contrairement aux outils (`s17`) — ma recommandation ; une ligne s'il veut l'inverse | |
| **3** | **Nos propres frontières** — *« il faudrait qu'on puisse faire nos propres frontières, c'est dans les specs »* (12/10). Existe : la dérivation dans `core` (`derivedBorders.ts`, `borderGraph.ts`, [[borders-are-derived-not-drawn]]), la main d'une frontière déduite du registre ([[border-hand-is-not-a-relation]]), `s13` et `{Overrides}`. Manque : les afficher et les régler dans le Cartographe, et que **l'atlas les dessine depuis l'année** au lieu des 21 payloads GPL (`mapPipeline.ts` lit encore `/borders/europe-<année>.json`). **À découper avec lui** : lire `s13`, `s08` et `format.md` ensemble d'abord | |
| **4** | **Des tests end-to-end Playwright** — sa note du 12/10 : *« s'il y a un bug que tu n'as pas trouvé par JSDOM […] il peut être trouvé via le navigateur »*. Rien n'existe. Premiers cas : le `<dialog>` natif qui rendait le focus à la poubelle désactivée, ‹ctrl+z› entendu par le seul canevas. À proposer comme chantier | |

**Livré le 12/10 au soir** (détail dans `completed.md`) : enregistrer et rouvrir **en mode local** (‹ctrl+s›,
ouverture au démarrage, `H-28` tranché) · les outils attendent le zoom (`s17`) · les fleuves suivis d'un
morceau à l'autre et dessinés comme dans l'atlas · la barre d'actions de `{Polities}`, calée à droite. **Les
années enregistrées ne sont jamais commitées** ; l'année de travail est `years/1100/` (France + Bourgogne),
une trace dans `years/1100.bourgogne-v1/`.

**Un seul serveur de dev** : le dev fait tourner le sien (`pnpm dev:cartographer`, souvent sur 5174). Ne pas
en lancer un second ; lui donner l'adresse du sien.

**Les deux barres du haut sont posées (13/10)** : `[Save]`, Undo et Redo branchés (les boutons passent par
le relais du canevas, `historyRelay.ts`, jamais `store.undo()` direct — ARCH-101) ; `[Open…]`, `[Save as…]`,
`[Registry]`, le `×` de l'onglet et `[Check this year]` posés **indisponibles** (`aria-disabled`, l'infobulle
nomme le scénario). `[Export for the atlas…]` **retiré** (note dans `s04`). **Manquent** : la marque
« modified » (suivre la version enregistrée) et la promesse de `4d-3` — `[Save]` désactivé tant que le fond
n'est pas prêt.

**Noté, non prioritaire** : masquer un pays (`H-32`, besoin non prouvé — essayer d'abord un affichage contours
seuls) · les fleuves jusqu'à la mer (**remis à plus tard par le dev**) · alléger les tronçons de côte
(Douglas–Peucker) · la confirmation avant de supprimer une ancre partagée (`s03`) · tracer au clavier · le
geste « souder » deux ancres (`H-37`) · l'inspecteur `{Details}` · les noms datés de `s07` (**plus tard**).

**Poussé** : tout est en ligne au 12/10 au soir ; vérifier à l'ouverture avec `git ls-remote origin main`
contre `git log -1`.

> **Le découpage `a/b/c/d` est figé — ne plus le re-trancher.** Il a bougé deux fois le 07/10, et
> c'est ce qui a fait perdre le fil au dev. S'il paraît faux à la reprise, le dire **avant** d'y
> toucher. L'ordre a déjà changé une fois, le 08/10, pour une raison nommée : `(c2)` attendait le
> design system, donc la façade DS-indépendante de `(d)` — les touches et les curseurs — est passée
> devant. Le découpage lui-même n'a pas bougé.

### Le design system est branché — ce qu'il faut savoir pour s'en servir

**`@fubaritico/react` en `0.2.1`, `tokens`/`styles` en `0.2.0`**, depuis GitHub Packages (token en
local dans `~/.npmrc`, `github.token` en CI). Le ColorPicker arrive en **`0.3.0`** : alors monter les
plages et ajouter le champ couleur, avec son état « automatic » = `null`. Le plan
(`files/plans/cartographer/design-system-integration.md`) est **fait jusqu'au pas 4**.

1. **Une seule cascade, dans un seul module** : `styles/sheets.ts` — tokens → peau → thème → reset (dans
   `@layer ui.reset`) → shell → `editor-chrome.css`. L'app et l'établi l'importent ; un test refuse tout
   import de feuille ailleurs. **Une règle hors layer bat tout layer** : c'est ce qui fait gagner nos
   surcharges, et c'est ce qui aurait fait perdre le DS contre un reset hors layer.
2. **Les couleurs : la palette dans `theme.css`, une fois**, et les tokens du DS pointés dessus. Aucune
   couleur en dur ailleurs — vérifié le 09/10. **Les tailles viennent de `design/chrome.css`.**
3. **Régler le style dans l'établi** (`pnpm dev:cartographer` → `/workbench.html`), et **prouver par le
   style calculé dans un vrai navigateur** : jsdom n'a pas de cascade de layers.
4. **Pièges déjà payés** : jamais de `display` sur `Modal`/`Drawer` · `autoFocus` de React n'écrit pas
   l'attribut, un `<dialog>` ne le verrait pas · un bouton dans un `<form>` soumet par défaut —
   `type="button"` partout sauf OK · le `Card` coupe ce qui déborde, d'où `overflow: visible` sur la
   boîte du formulaire.

**Le ColorPicker est fait** (10/10) : `ColorField` du DS `0.5.0` dans la boîte de création, « automatic » = `null`.

**Décisions du dev du 09/10, à ne pas re-trancher** : le **contraste n'est pas une contrainte** dans
l'éditeur · le formulaire est une **boîte de dialogue**, pas le panneau `{Details}` de `design/03` · un
**établi** plutôt qu'un Storybook · secondaire sur le panneau avec le filet des champs, **primaire
rempli de la couleur du filet**, texte blanc, au survol le fond des champs.

> Les notes d'avant `(c)` et `(d)` (livrés) sont archivées dans `archive/next-history.md` — à relire si une décision de cible, de curseur ou de barre d'état est remise en cause.

### Ce que `(c1)` a livré le 08/10, et ce qu'il laisse ouvert

**Livré** : `state/toolSlice.ts` (l'outil en main + l'id de la cible, **hors de la ligne d'annulation**,
`s99` l'exigeant) · `state/drawingTarget.ts`, le seul endroit qui résout « pour qui dessine-t-on ? » ·
`createPolity` sur la slice d'édition, undoable, qui **rend `false`** sur id déjà pris au lieu de lever —
c'est l'auteur qui a tapé cet id, donc le formulaire doit pouvoir pointer le champ ·
`core/editor/polityId.ts`, le forgeage d'id tranché par le dev (**H-31**, trou non enregistré jusque-là).

**La propriété qui porte le pas, et c'est elle qu'il faut garder en tête** : la cible est un **id**, pas
un objet. Donc annuler la création d'un pays fait que la cible **cesse de résoudre** — la bannière
disparaît et la plume refuse, sans écouteur, sans nettoyage, sans rien à penser dans `undo` / `goTo` /
`restoreMarker`. Vérifié en écrivant la version qui tient l'objet : le test tombe.

**`(c2)` livré le 09/10, sauf la bannière** : `[+ New polity]` dans la tête de `{Polities}`, le
formulaire (`components/PolityForm.tsx`, la vue ; `NewPolityDialog.tsx`, le branchement ;
`polityDraft.ts`, la lecture pure qui ne refuse que ce qui casse le fichier). Le câblage est bien
`if (createPolity(p, step)) aimAt(p.id)` — et **l'ordre est gardé par un test**, viser avant de lire le
refus laisserait la plume pointée sur un pays inexistant. **Restent** : la liste `{Polities}` avec
« no territory » (s02 : *« it appears in {Polities} marked "no territory" »*) et l'avis transitoire.

**Une question que `s02` ne tranche pas, et qui n'a pas été décidée ici** : presser ‹P› **seul** doit-il
garder une cible choisie il y a longtemps, ou l'oublier ? Aujourd'hui `selectTool` ne touche pas à la
cible — ce qui rend vraie la phrase *« [Draw territory] me rend la plume, avec elle comme cible »* et
évite de perdre l'aim chaque fois qu'on attrape ‹space› pour paner. Le cas gênant est l'inverse : revenir
à la plume une heure plus tard et dessiner dans un pays qu'on avait oublié viser. **La bannière le dit**,
ce qui est précisément pourquoi `s02` l'exige — donc ce n'est pas bloquant. À reprendre à `(d)`.

### Ce que `4d-3` et `4d-2 (a)/(b)` ont livré le 07/10 — à ne pas re-découvrir

1. **`publicDir` du Cartographe → `../atlas/public`**, donc le fond est *la* texture de l'atlas et non une
   copie. Garde GPL de `build.yml` élargie à **`packages/*/dist`**, prouvée en la faisant tirer.
2. **Le fond cuit dans le worker** (`core/pipeline/computeWorker?worker`) — même chunk, **même hash**,
   13 490 o. `onProgress` donne une progression mesurée.
3. **Le terrain est nu parce que `computePolitical` n'est jamais appelé.** Rien à nettoyer.
4. **`ARCH-102` fermé** : le repère vient de `dem.meta`. `view/testFrame.ts` est une **fixture de test**,
   et un test interdit à la production de l'importer. `boundsMatch` est branché.
5. **La côte se chaîne** : 95 212 segments → **2 029 contours**, sans epsilon (le producteur est
   déterministe). Nécessaire d'abord pour `s02`, qui insère *« le sous-chemin entre les deux clics »*.
6. **Les vecteurs se dessinent sous `setTransform`**, élagués au viewport et décimés au pixel écran.

**Mesuré** : Cartographe 219,65 → **247,36 ko / 78,65 ko gzip**. **1655 → 1771 tests.**

### La promesse de `4d-3` que l'étape 5 doit tenir

**Décision du dev, 07/10 : si un asset du fond manque, les deux sont bloquants — mais l'application
s'ouvre quand même.** Seule la **zone canevas** est bloquée : pas de carte, le vélin nu, un message
`role="alert"`. Les autres zones s'affichent **à l'état de repos**, ce que le `Background` de `s00`
spécifie déjà (*« no file is loaded »*, `{Polities}` vide, Undo et Redo désactivés).

**Ce qui n'est pas fait, parce que le chrome n'existe pas encore** : *« tout ce qui dépend du fond doit
être désactivé »*. L'ordre qu'il a posé est **le fond cuit d'abord, l'année posée dessus ensuite** — sans
le repère du DEM, une frontière n'a rien contre quoi se projeter. Donc à l'étape 5 : `[Open…]`, les deux
outils et `[Save]` sont **désactivés tant que le fond n'est pas prêt**, et c'est `MapArea` qui sait s'il
l'est. Le repli par altitude (`createElevationLandMask`) reste à l'atlas et **n'entre pas** ici : une côte
discrètement fausse serait relue comme un mauvais tracé de l'auteur pendant toute la vie de l'année.

### Offline et online — tranché le 06/10, et c'est écrit

| | |
| --- | --- |
| **le geste ne change pas** | l'auteur fait ‹ctrl+s› dans les deux modes et n'a pas à savoir lequel. Seule la **destination** change — c'est ce qui fait des deux modes un choix de câblage et non deux produits |
| **offline** (aujourd'hui) | trois fichiers par année (`registry`/`polities`/`borders.json`) + le manifeste `years/index.json`. Ils vont dans `packages/atlas/public/years/<année>/`, commités, et l'atlas les lit par **URL relative** comme le DEM |
| **online** (plus tard) | une **Netlify Function** tenant le token **côté serveur** commite les fichiers ; la CI rebuild et redéploie. Plan payé, donc disponible |
| **refusé** | un *blob store* lu à l'exécution pour les années publiées — la donnée sortirait du build, donc les deux gardes CI cesseraient de la couvrir, et git garde l'historique qu'un bucket ne garde pas |
| **la coupe si autosave un jour** | brouillons dans un store, **années publiées dans git** |

Tout le flux est en **scénarios d'intégration** dans
`files/plans/cartographer/scenarii/s15-offline-and-online.md` — les deux modes, les pannes qui décident
réellement la conception, et **quatre trous neufs : H-27 à H-30**. Le plan porte le résumé (`plan.md`,
section « Offline and online » sous P5).

### Un déclencheur à ne pas perdre

`mapPipeline.ts:97` lit **encore** `/borders/europe-<année>.json` — les 21 payloads GPL-3.0, présents sur
la machine du dev (6,5 Mo, gitignorés, donc **jamais dans git ni en production**). Le jour où 1100 est
dessiné, il faut **supprimer `borders/` et son lecteur `unauthored`**. C'est le moment où le dépôt cesse
d'avoir du GPL *sur la machine*, pas seulement hors de git.

### La skill à ouvrir avant de coder

`/scenarii-to-code` (écrite le 06/10) : charger le `s00` du jeu, le scénario qui gouverne, et `s99` ;
faire de chaque `Then` **une assertion ou un manque déclaré** ; et ne jamais écrire dans un commentaire
une promesse qu'une étape ultérieure doit tenir — elle va dans `next.md` ou `known-issues.md`, les deux
seuls fichiers relus à chaque session. Elle existe parce que `4d-1` a livré une JSDoc, écrite deux étapes
plus tôt, promettant un cache que `4d-1` n'a pas construit.

### Quatre questions ouvertes, aucune bloquante

1. **Le cover force un zoom profond sur une fenêtre large.** Le fond fait 1280×1164 (ratio 1,10)
   contre une fenêtre à ~1,9 : couvrir rogne ~42 % de la hauteur, donc **aucune échelle ne montre
   plus l'Europe entière**. C'est la conséquence directe du plancher demandé le 08/10. Illustrator,
   lui, laisse dézoomer au-delà du plan de travail et montre son *pasteboard*. **À rouvrir si ça
   gêne à l'usage** — le remède est une ligne (plancher = `fitScale` au lieu de `coverScale`), plus
   le fond de l'app visible autour.
2. **Presser ‹P› seul garde une cible choisie il y a une heure.** `s02` ne tranche pas. Aujourd'hui
   `selectTool` ne touche pas à la cible, ce qui rend vraie la phrase *« [Draw territory] me rend la
   plume, avec elle comme cible »*. Le cas gênant est l'inverse, et **la barre d'état le dit** —
   donc non bloquant.
3. **L'avis de cible : disparaître, ou se réduire dans un coin ?** Sa variante « tout petit en bas »
   est la seule qui couvre le cas pour lequel l'avis a été écrit. **Non prioritaire**, dit tel quel.
4. **Un geste modifie le document avant que l'historique l'enregistre** — voir `known-issues.md`.
   Déclencheur : le jour où un copieur peut légitimement échouer.

### La suite de l'étape 4, découpée

| | quoi | on sait que ça marche comment |
| --- | --- | --- |
| **4d-3** ✅ | le fond servi, cuit dans le worker, le repère lu du DEM, l'état d'attente | le relief s'affiche |
| **4d-2 (a)** ✅ | la côte et les fleuves en vecteurs | le trait de côte épouse la limite terre/mer |
| **4d-2 (b)** ✅ | la barre d'état — *le second canevas est passé en tête de (d), voir plus haut* | la position suit le pointeur |
| **4d-2 (c1)** ✅ | l'**état** de la cible : `toolSlice` (outil + cible, hors de la ligne d'annulation), `createPolity` undoable, `describeDrawingTarget`, et le forgeage d'id dans `core/editor/polityId.ts` | annuler la création fait **évaporer la cible** toute seule |
| **4d-2 (c1b)** ✅ | les touches d'outil ‹P› ‹A› ‹space› et les curseurs — la façade de `(d)` qui ne dépend pas du DS, passée devant parce que `(c2)` attendait | le curseur refuse quand personne n'est sélectionné |
| **4d-2 (c2)** ✅ | le **design system câblé** puis `[+ New polity]` et le formulaire — **restent la liste `{Polities}` et l'avis de cible**, qui peuvent suivre `(d)` | OK donne la plume, vérifié dans l'application |
| **4d-2 (d)** ◀ | le **second canevas**, les deux outils câblés sur `documentEdits` et `history` | on dessine, `ctrl+z` défait le geste |
| **5** | le chrome : `{Polities}` en arbre, les formulaires, `{Overrides}`, **et les contrôles désactivés tant que le fond n'est pas prêt** | les valeurs viennent de `design/chrome.css` |

### Trois choses décidées pour l'étape 4, à ne pas re-trancher

1. **Le repère du canevas est celui du fond**, pas la zone éditoriale — voir `known-issues` (deux boîtes).
2. **Deux canevas** : un statique redessiné au commit, un overlay au `pointermove`. La barre d'état
   s'écrit **impérativement**. (`4d-1` n'en a qu'un : le second arrive avec l'élastique, à `4d-2`.)
3. **Le fond est cuit par le Cartographe** avec `bakeTerrainPixels(…, null)` — le `null` est l'année
   installée, donc le terrain nu, donc « tint politique retiré » sans rien à nettoyer.

### P3 — fait le 27/09, et ça a retourné le format

Le spike `files/spikes/build-registry/` a tourné. Regrouper les 2 059 relations OHM par Q-id **éclate le
Royaume de France en quatre** — OHM donne un Q-id par période. D'où la décision du dev : **un registre par
année, rien de partagé**. `format.md` réécrit, `s04`/`s05`/`s07`/`s08`/`s99`/`s00` et le glossaire corrigés,
`s13-overrides.md` créé.

### Ce qui reste de P1, et n'est pas bloquant

- **La capture d'écran du README**, différée à **P5** avec sa raison : un relief sans couche politique se
  lit comme un rendu de terrain. Elle vaudra le jour où 1100 sera dessiné.
- **`packages/core/README.md`** devra accueillir les traductions et le type de date quand ils arriveront.

### Ce qui attend le dev, quand il voudra

- ~~**e-Soleau (P0)**~~ — **fait vers le 25/09**, rapporté par le dev le 27/09. Un dépôt est scellé, on ne
  le met pas à jour : dater un état ultérieur = un nouveau dépôt, 15 €. **Sa décision : un seul de plus,
  quand tout sera terminé.** Ne pas reposer la question.
- **Sentry** — décidé pour le palier de mise en ligne de la contribution. Reste ouvert, et seulement
  ouvert : est-ce que l'atlas déjà public le justifie à lui seul ?
- **H-03, H-05b, H-08**, les trois trous du Cartographe, qui se décident en codant.

### Comment répondre, dans ce projet

- **Quand le dev nomme une convention, aller voir TOUS ses dépôts voisins, pas un.** C'est la faute du
  01/10, qui a coûté la première heure de la session et une remise à zéro complète : il a dit que la
  surcharge ESLint se met dans le paquet, j'ai ouvert **un seul** de ses sept dépôts, j'y ai vu une config
  à la racine et j'ai généralisé. Un `find` sur les sept rend **9 configs par paquet**. Les dépôts sont au
  même niveau que celui-ci, dans `~/Desktop/WebstormProjects/`.
- **Avant de mesurer ce qu'un outil fait, lire comment il est appelé.** C'est le défaut sous le défaut, le
  01/10 : j'ai mesuré correctement qu'une config ESLint imbriquée est ignorée par un `eslint .` lancé depuis
  la racine — mais j'avais vérifié **la mauvaise proposition**. La question n'était pas « une config
  imbriquée peut-elle marcher si je garde la commande de la racine ? », c'était « comment lance-t-il son
  lint ? », et la réponse tenait dans une ligne de son `apps/home/package.json` : `"lint": "eslint ./src"`.
  J'avais lu sa config, jamais les **scripts** qui la chargent. **Lire les `scripts` du `package.json`
  avant de mesurer le comportement d'un outil** — de la rigueur dirigée vers la mauvaise question coûte
  autant que pas de rigueur, et donne en plus de l'assurance.
- **Quand il a tranché, exécuter — pas argumenter la mesure.** Même soir : il a redemandé deux fois, et
  j'ai répondu par le détail technique au lieu de faire. *« Elle est où ma surcharge ? »*
- **Ne pas poser une question qui n'a pas d'arbitrage.** Trois posées le 01/10, zéro nécessaire. Son test :
  *« c'est quoi la décision qu'il y a à prendre là ? »* Si la réponse est « aucune », on fait et on le dit.
- **Tout problème arrive avec son remède et sa criticité.** Jamais une liste de risques sans décision.
- **Tout terme nouveau va dans `glossaire.md`** — mais seulement s'il relève de la **cartographie** ou du
  **logiciel lui-même**. L'outillage général (build, paquets, cache, CI) n'y entre pas.
- **Ne jamais inscrire une déduction de moi comme une décision du dev.** Le tableau de `plan.md` porte
  une colonne `by` pour ça.
- Docs et config en **anglais**, conversation en **français**. Annoncer chaque commande (cause / raison /
  action). `rm -rf` demande une permission explicite à chaque fois.

## ▶▶▶ POINT DU 14/10 À 9 h 30 — la nuit du test général

**Lire d'abord `files/plans/cartographer/general-test-night.md`** (l'état de la nuit) et
`files/plans/cartographer/general-test-defects.md` (23 défauts, chacun avec l'outil qui l'aurait corrigé).
137 pays d'Euratlas 1100 dessinés, vassaux et sous-vassaux compris, rang / statut / suzerain / couleur posés ;
la liste `{Polities}` défile (`4de406c`). Ce qui manque : ce qu'aucune planche ne couvre (nord de 60°N, est de
45°E, sud de 32°N). **La décision qui attend le dev** : l'ordre des outils de correction (`H-46` dans `s99` —
retracer un tronçon, découper, souder, accrocher au bord), puis `H-44`.


Sections moved out of `next.md` once the step they prepared had shipped. Newest first.

## Archived 2026-10-13

### Ce qu'il faut savoir avant d'écrire `(c)` et `(d)`

- **La cible de dessin est un acte séparé** (`s02`) : `[+ New polity]` crée l'identité **sans
  territoire**, valider le formulaire **donne la plume**, et **sans cible la plume refuse de poser une
  ancre**. Créer un trait ne crée **jamais** une polity — c'est la perche que le dev a tendue le 07/10, et
  `s99` en donne la raison mesurée : à 1100, OHM donne au Royaume de France son nom et **aucune
  géométrie**, donc sans territoire est l'état de départ **normal** de cette carte.

- **Trois décisions du dev du 08/10 sur la cible, à ne pas re-trancher.**
  1. **On choisit QUI, puis on agit.** La cible se prend dans `{Polities}` — sélectionner une polity, c'est
     la désigner. *« Imagine qu'avec la flèche tu sélectionnes des points. Mais tu sélectionnes les points
     de qui ? »* C'est **l'inversion délibérée d'Illustrator**, où sélectionner un point sélectionne
     l'objet qui le tient. Conséquence : **la cible gouverne ⟨edit⟩ autant que ⟨draw⟩**, là où `s02` ne
     parlait que de la plume. Il a ajouté *« peut-être que le fonctionnement changera, mais je pense que
     c'est plus sage pour l'instant »* — donc c'est une décision, pas une loi.
  2. **L'avis de cible est transitoire** : il apparaît à la sélection, reste ~5 s, se retire. Jamais collé
     au curseur. Variante ouverte : se réduire tout petit dans un coin du canevas au lieu de disparaître.
     **Non prioritaire** — et c'est la variante qui couvre le cas pour lequel l'avis a été écrit, puisque
     l'autre laisse l'écran muet dès qu'on se remet à dessiner une minute plus tard.
  3. **Tout ce qui se construit doit être substituable par un composant du design system.** Sa raison :
     ses **tokens se surchargent**, et c'est ça qui donnera l'apparence « Illustrator moderne ». Il les
     écrit en parallèle. La forme à tenir est celle de `react-canvas-and-panels` — **coquille / vue /
     branchement** : la coquille est précisément ce que ses composants remplacent, et substituer devient un
     changement d'import.
  4. **Sans cible, l'outil se prend quand même — c'est le CURSEUR qui refuse**, en `not-allowed` sur le
     canevas. Décidé le 22/09, et **réaffirmé le 08/10 après avoir repesé les deux options** : il a
     d'abord dit *« la plume et la flèche doivent être désactivées »*, puis a reconnu la décision
     antérieure et l'a gardée. La raison qui la rend meilleure : le curseur dit **où** le geste est
     refusé, un bouton grisé dit **si** l'outil existe — et la plume n'a rien d'indisponible, il lui
     manque un sujet. **Vaut pour ⟨edit⟩ autant que pour ⟨draw⟩** (son argument : les points de qui ?).
     C'est aussi le curseur **après un `ctrl+z`** qui reprend la cible : il se dérive de « la cible
     résout-elle ? », donc rien n'a à le surveiller.
  5. **Les curseurs d'outil sont ceux du canevas, jamais du chrome.** Sur `{Polities}`, un formulaire ou un
     bouton, le pointeur est celui de la plateforme — une flèche sur une ligne, un caret dans un champ.
     Ce n'est pas un détail : **le geste qui choisit la cible est un clic dans `{Polities}`**, donc le
     pointeur doit avoir l'air cliquable exactement là où le canevas le refuse. Posés sur l'élément
     canvas, jamais sur `body`.

  6. **La barre d'état nomme l'action ET sur qui elle porte** — *« Drawing in Polity »*, *« Selecting Path
     from Policy »*, *« Moving Path from Policy »*, et les déclinaisons écrites dans `s02`. Le motif, pour
     qu'un geste neuf ne demande aucune décision : **un verbe, et le pays sur qui il porte**, participe
     présent, le nom verbatim jamais l'id. Sans sujet : *« Sélectionnez un pays pour dessiner »*.
     **Et ça renverse laquelle des deux pièces porte la garantie** : l'avis de cible se retire au bout de
     5 s, la barre d'état non. Donc la faute que tout ce dispositif existe pour éviter — quatre cents
     ancres dans le mauvais pays — est gardée par la **barre**, en continu, et l'avis ne fait qu'annoncer
     le changement de sujet. C'est pour ça que son caractère transitoire ne coûte rien.
     **Un point non tranché, et c'est ma déduction** : la barre porte déjà des messages transitoires
     (*« inserted 412 vertices »*). S'ils partagent le même emplacement, un résultat écrase la description
     d'action au moment où elle compte le plus. Deux zones, ou le résultat rend la place. À décider quand
     la barre se construit — `components/statusBar.ts` existe déjà.

  7. **Qui parle quelle langue — tranché le 08/10, et consigné dans `plan.md` (P8).**
     | | langues | |
     | --- | --- | --- |
     | **atlas** | **français ET anglais**, le français d'abord | c'est le produit publié, et c'est pour **ça** que l'ICU MessageFormat a été adopté le 24/09 |
     | **Cartographe** | **anglais seulement** | outil d'auteur, un seul auteur. **Converti le 08/10** : dix chaînes, `lang="en"`, sept assertions de test — dont un test nommé *« names the phase in French »*. **Aucune table de traduction** |
     | **outil de contenu** (Payload) | **EN et FR dans le même formulaire** | les deux champs côte à côte, pour qu'une entrée ne reste pas à moitié traduite sans que ça se voie |

     **On contribuera DEUX choses** (sa décision, 08/10, tirée d'un projet précédent) : **le contenu**
     *et* **les labels de l'application**. Donc un label cesse d'être un littéral de développeur, et
     traduire l'atlas devient un acte éditorial au lieu d'une livraison. **La condition qui décide
     comment ça s'embarque est déjà écrite dans P8** : *une chaîne qui décrit une panne ne doit pas
     pouvoir échouer*. La chaîne complète, et ce n'est pas une conception mais **ce qu'il a déjà fait
     tourner** : `Payload (EN+FR dans un formulaire) → un script d'export → des fichiers JSON → la couche
     de traduction de l'application → ICU MessageFormat`. Le JSON est **généré, jamais chargé à
     l'exécution** (*« ce ne sera pas chargé au runtime »*).
     **Le script d'export est un vrai morceau de travail, et il n'avait jamais été nommé** : Payload garde
     ses données **en base**, ce que P7 consigne déjà — c'est même la raison pour laquelle tu avais choisi
     JSON (un navigateur ne peut pas interroger un SQLite par URL). Donc rien ne produit le JSON tout
     seul. Un seul script pour les deux contributions, le contenu et les labels. Et c'est **le seul
     endroit qui peut signaler une traduction manquante** : il voit toutes les clés et les deux langues à
     la fois, ce qu'aucun contrôle à l'exécution ne peut faire sans embarquer le trou qu'il cherche. Même forme que `s15` pour une année dessinée : ça atterrit dans git,
     la CI reconstruit. **Reste à décider** : ce que l'atlas affiche pour un label pas encore traduit — le
     français, ou la clé.

     **La distinction à ne pas perdre** : le chrome est en anglais, le **contenu** ne l'est pas. Le nom
     d'une polity est une donnée — *« Reaume de France »* est une graphie d'époque, et `name:fr` existe
     pour ça. Donc la barre lit `Drawing in Reaume de France` : verbe anglais, nom verbatim. Et dans
     Payload, EN/FR veut dire **deux textes rédigés**, pas la traduction de l'un par l'autre.
  8. **L'action ET le résultat s'affichent en même temps**, deux zones côte à côte — *« je ne vois pas
     pourquoi l'un prendrait la place de l'autre »*. Ça ferme la question que j'avais laissée ouverte une
     heure plus tôt, et dans le bon sens : un résultat qui écraserait l'action effacerait le sujet
     précisément quand quatre cents ancres descendent.
     ```
     Drawing in Reaume de France          inserted 412 vertices from the coastline
     ```

  9. **Les curseurs, trois frictions levées le 08/10.** *Pas d'outil de zoom* — les boutons `[+]`/`[−]`
     des maquettes suffisent, donc `s00`'s « deux outils et seulement deux » tient · *pas d'onzième
     curseur* — le refus est le `not-allowed` natif, la croix disparaît au lieu d'être marquée · *la
     flèche blanche à bord noir existe déjà* (`arrow`, d'après la flèche blanche d'Illustrator).
     **Le fait qui porte toute la séquence de zones** : `cursor` est une propriété d'**élément**, donc
     posée sur le canvas elle ne s'applique que là, et le navigateur restitue le pointeur alentour tout
     seul. « Quand je sors du canevas ça redevient la flèche » n'est **pas du code à écrire**. Et c'est
     nécessaire, pas cosmétique : le geste qui donne un sujet à la plume est un **clic dans le chrome**.
     **Le dev va vérifier le comportement d'Illustrator** avant qu'on aille plus loin.

- **Ce que (1) demande au code, et c'est petit** : `toolSlice` ne sait poser la cible qu'en donnant la
  plume dans le même geste (`aimAt`), ce qui est juste à la validation du formulaire et faux quand on
  clique un pays dans `{Polities}`. Il faut **une action qui pose la cible sans toucher à l'outil**, et
  `aimAt` devient sa composition avec `selectTool('draw')`. Une action à ajouter, pas une refonte — la
  cible étant déjà un id dans le store, l'affichage ne tient à rien.
- **Trois modules sont écrits, testés, et n'ont toujours aucun appelant** : `geometry/hitTest.ts`
  (`nearestPoint`), `geometry/ringClosure.ts` et `geometry/polylineSnap.ts`, livrés à `4c`. `(d)` est
  précisément ce qui leur en donne un — `(a)` a posé les polylignes qu'ils viseront, pas les gestes qui
  les appellent.
- **Le second canevas vient avec `(d)`, pas avant.** Il n'a rien à peindre tant qu'aucun outil n'existe,
  et le livrer seul serait l'erreur du 06/10 : du code qu'aucun appelant n'atteint, que le secouage
  d'arbre retire du bundle.
- **Un geste = un pas d'historique** (H-10), posté à la **fin** du geste. Deux clics avec ⟨snap to
  coast⟩ posent 412 ancres et `ctrl+z` les reprend toutes.


## Moved from next.md on 2026-11-08 (the audit; each trap has its memory or rule)

**Pièges, à ne pas refaire** : empiler des règles visuelles — quand il est perdu, **s'arrêter et lui donner la règle en trois
lignes** ; deviner un chiffre dans un test ; une demande répétée après un refus d'outil est **la même** demande ; « flou » =
flou d'image ; parler franglais ; deux sondes dans un même onglet ; `delete` d'une propriété de `window`. **Et ceux du
29/10 jour** : **relire le code avant de proposer un remède** (le nom court ne s'écrit que là où le complet ne tient pas) ;
**jamais de `cd`**, même pour revenir à la racine ; quand sa phrase peut désigner deux options, dire celle que je comprends
avant d'agir.

## next-historian.md — sections of 11/11 and 13/11, moved 2026-11-15

## ▶ 13/11 : la Hongrie de 1100 saisie ; l'agent de recherche, à mesurer

**La nuit du 12 au 13/11** : le royaume de Hongrie et ses voisins (Slovaquie, Roumanie, Serbie, Transcarpatie,
Burgenland, forteresses croates et bosniaques), 97 lots, 1 486 lieux ; 278 existaient en 1100. **Saisis** : lieux
839–1040, fiches 830–1031, sources 891–1137 ; vérifiés par le codeur en lecture seule (aucun double). Le rapport et
**ses décisions à prendre** : `files/plans/sources/1100/hungary.md` — Holíč et Kopčany (Morava) au Saint-Empire sur sa
carte, hongrois dans les sources ; le bloc Galicie-Volhynie sans témoin ; le nord du Spiš ; les lieux sur l'archéologie
seule ; les listes des chartes fausses ; sources 905 et 906 à supprimer par lui. Le travail : `files/resources/historien/1100/regions/hungary-1100-research/`.

**Le coût** : la nuit a pris **27 % de son crédit de la semaine** (≈ 100 agents sur Opus, ~25 M de jetons). **Sa règle,
13/11** : *c'est lui qui fixe le nombre d'agents* ; le temps ne compte pas (*« si ça met 8 heures, c'est pas grave »*) ;
il reste sur Opus (*pas de faux positifs*) ; économiser le contexte. Écrite dans `/find-sources` et `/enter-in-cms`.
**L'agent `source-researcher`** (`.claude/agents/source-researcher.md`, 13/11) : peu d'allers-retours, extraits au lieu
des livres, témoins de district repris, `maxTurns: 40`. **Premier geste** : un lot test pour mesurer son compteur contre
190–290 k jetons par lot de la nuit ; il faudra écrire une note `REGION` par région (celle de la Hongrie : son `BRIEF.md`,
à alléger de ce que l'agent porte déjà).

**Validé par lui, à faire sur Sonnet ou Opus selon son mot, estimation d'abord** : les 382 lignes de détenteur sans
QID de sa base (249 fiches, presque toutes d'avant le 12/11) ; 12 des 16 de la nuit faites (restent Dés, Kolos, la
lignée de Docibile — pas d'élément Wikidata).

**Non commités** : `hungary.md`, `first-lot.md`, les skills `find-sources` et `enter-in-cms`, l'agent — à son mot.

## 11/11 : l'Adriatique de 1100 — CARTO-417 (l'arrière-pays fait et saisi le 12/11 ; les écarts ci-dessous restent)

Sa demande du 10/11 au soir : *« on reprend et on termine cette question-là »*, sur cet inventaire. Tout le travail est dans
`files/resources/historien/1100/regions/adriatic-1100-research/` (git-ignoré) ; la synthèse, commitée, `files/plans/sources/1100/adriatic.md`.

**1. L'arrière-pays (Croatie et Bosnie hors de la bande côtière) — en cours, à finir.** Sa règle : *« des villes, des
villes »*, ratisser large, **par la date de création, pas par la population**. Fait : le vivier, 13 358 localités de
Croatie et de Bosnie pas encore étudiées (`inland/pool.json`) ; 424 forteresses de Wikidata (`inland/forts.json`, des
repères) ; la collecte des articles hr, bs, sh, sr de chaque localité lancée (`inland/fetch.py`, reprend où elle s'est
arrêtée : relancer `python3 -I inland/fetch.py inland`). **Reste** : extraire de chaque article la date de première
mention (« prvi put se spominje 1103 », « u XI. stoljeću ») et garder ce qui est daté **avant 1150** ou du XIIᵉ siècle et
avant ; y joindre les chefs-lieux de župa ; retirer quartiers et doublons ; lui donner le compte par région **avant** de
lancer ; puis les lots (le `BRIEF.md` de la côte, plus la župa de chaque district), la revérification, la saisie.

**2. Les écarts avec sa carte de 1100 — à lui, dans le Cartographe** (le détail par ville : la synthèse) :
- **pas de royaume de Croatie** (1097–1102, sans roi ; la Hongrie de Coloman est l'autre lecture, proche) — hachures, ou un
  pays de plus ;
- **l'Istrie au Saint-Empire, pas à Venise** : Pula, Poreč, Buje, Tar, Rovinj, Galižana ; le territoire de Piran (Lucija,
  Seča) ; Rijeka et Kastav, sur la Hongrie dans la carte ;
- **Split** (carte : Hongrie) à Venise pour Byzance de 1097 à 1105 ; **Biograd** (carte : Venise) croate ou hongroise ;
  **Mestre** (carte : Venise) au royaume d'Italie ;
- **les îles** : Brač, Hvar, Vis plutôt croates (carte : Venise) ; Korčula et Lastovo à la Zachlumie de Bodin ;
- **la Serbie de la carte** sur Vrgorac, Ploče, Grude, Vau i Dejës, Shëngjin : aucune source ;
- **la côte dessinée trop courte** : Zadar, Trogir, Murano, Bibione, Rab, Hvar, Makarska, Budva → Petrovac, Kassiopi,
  Piran, Umag, Novigrad, Rovinj ;
- **des lieux qui n'existaient pas** encore sur la carte : Pag ville (c'était Novalja), Kamen, Košute, Loreto.

**3. À commiter après son coup d'œil** : les identifiants Wikidata corrigés dans `years/1100`, `1200`, `1300`
`registry.json` (Empire byzantin Q12544 et les onze de `1100/wikidata.md`) — **1000 jamais** (sa décision) ; `1100/polities.json`
modifié est à lui (son Cartographe).

**4. Dans la base, à trancher ou compléter** : deux villes sans fiche de 1100 faute de source datée (Himarë, Biševo) ;
Massa Fiscaglia, détenteur sans ligne qui le porte ; les détenteurs hors de la carte (« Royaume de Croatie » Q858841,
« Zachlumie » Q1311704) que le Cartographe dira « à déclarer » ; les régions slovènes saisies avec le nom anglais de la
commune ; la licence « domaine public » posée par un agent sur Monticolo, Romanin, Arditi (à vérifier) ; la source 619
(Benussi) sans adresse.

**5. Les pistes à lire dans son Chrome** (refusées aux scripts) : HRČAK (Ančić 1998 et 2011, Šišić sur Coloman), Stephenson
2000, Budak 2018, Kandler, la *Tabula Imperii Byzantini* 3, Ducellier sur Persée — chaque rapport liste les siennes.

**6. Ensuite** : les îles de la mer Égée (65 listées, `islands-aegean.json` dans le scratchpad du 10/11, à refaire) ;
CMS-414, ses 41 cas ; CMS-416, un sujet de conversation (une fiche par détenteur, la taille de la base).

**L'Italie de 1100 est dans sa base** (357 villes, `1100/italy.md`), le nord-ouest corrigé (Novare et Trecate sur Savio).

