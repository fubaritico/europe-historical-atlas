# Moving the board from Trello to Jira — what is known before the plan

> The dev's decision, 2026-11-20: the board moves from Trello to Jira — the « Fait » column holds 261 tickets with
> no clean way to archive them while keeping the history, and he needs a clear hierarchy between epic, story, task
> and bugfix. To be done in a new session. This file gathers what was checked that day and the advice he brought
> from Gemini; **it is not the plan yet** — the plan is written here first, then read by him.

## His rules for it

- **The reference of a ticket stays `[CARTO-67]`** — the application's prefix and the number — in commits, plans and
  messages (the dev, 2026-11-20: _"a practice we will keep, so that you and the historian are not thrown"_). Jira's
  own key comes second.
- He does not validate features any more: what is built is tested by me (memory `one-gesture-to-validate`).

## What I checked at Atlassian, 2026-11-20

- The free plan is enough: 10 users, unlimited projects and work items, 2 GB of files
  (https://support.atlassian.com/jira-cloud-administration/docs/explore-jira-cloud-plans/,
  https://www.atlassian.com/en/software/jira/pricing).
- A board hides by itself the tickets done for more than two weeks — fixed on a team-managed project, 1, 2 or 4
  weeks on a company-managed one; they all stay in the project, searchable
  (https://community.atlassian.com/forums/Jira-questions/Team-managed-Kanban-how-do-I-hide-older-Done-tickets/qaq-p/1997263).
- **Atlassian's own Trello importer does not import archived cards**, and the reports about comments contradict one
  another (https://support.atlassian.com/jira-software-cloud/docs/import-data-directly-from-trello-into-jira/) — so
  **nothing is archived in Trello before the move**.
- Not re-checked in the documentation: the hierarchy epic → story / task / bug → sub-task (Jira's standard model);
  whether a script creating the tickets in order can keep our numbers (our counter is one for the whole board, 1 to
  491, archived cards included).

## What I proposed to him (not yet read by him as a written plan)

One project; a script of ours that reads all of Trello through its API, archived cards included, and creates the
tickets in Jira **in the order of their numbers, so each keeps its number**; the prefix ATLAS / CARTO / CMS / CORE /
REPO / DESIGN becomes a component; the « Épiques » column and its checklists become real epics with their tickets
attached; `fonctionnalité` → story, `défaut` → bug, `dette` and `doc` → task; `critique` / `gênant` / `cosmétique`
→ the priority; the columns, the same statuses; descriptions, closing comments and attachments carried over. Then
the `/trello` skill rewritten and commitlint's ticket rule. One to two days; Trello kept read-only.

## Where Gemini's advice agrees, and where it does not

| point | Gemini | what I found, or propose |
| --- | --- | --- |
| the keys | Jira gives new sequential keys (`EHA-1`, `EHA-2`…); our old references stay in the title only | agreed that Jira numbers by itself — which is why the tickets are created **in our order**, to make the two numbers the same; to verify on a trial project first |
| the epics | the direct import makes « Épiques » a mere status; a CSV import, or a conversion by hand afterwards, makes real epics | agreed; our script creates them as epics from the start |
| the link ticket → epic | from the `épique · …` labels, into the `Parent` column | agreed — the labels and the epics' checklists say the same thing; the checklist names the tickets one by one |
| archived cards | ignored by the import (he advises excluding them, and archiving the two templates before) | **we keep them**: they are part of the history and of the counter; the two template cards are left out |
| the labels | all imported as labels, then turned into components by bulk change | types, components and priority set at creation; the rest stay labels |
| the checklists | kept in the description, or made sub-tasks, by the mode of import | to decide: an epic's checklist becomes its children; another ticket's checklist stays a list in its description |
| the route | CSV (recommended) or the native import with three clean-ups by hand | the API, for the comments, the attachments, the order and the archived cards — the CSV route is the fallback if the API refuses something |
| the Jira Power-Up on the board | links single cards, migrates nothing | nothing to add |

## The conversation with Gemini, as the dev pasted it (2026-11-20)

Votre tableau europe-historical-atlas est très structuré et compte plus de 460 cartes réparties sur 7 colonnes (Épiques, Idées, Backlog, À faire, En cours, À valider par le développeur, Fait). Sa configuration actuelle permet une migration propre, à condition de préparer quelques ajustements.

1. Préparer les colonnes avant l'import

- La colonne Fait (261 cartes) : Comme elle est tout à droite, Jira la marquera automatiquement comme « Terminé » (Done), ce qui correspond exactement à votre flux.
- La colonne Épiques (10 cartes) : Lors de l'importation directe, Jira va la traiter comme un simple statut de workflow (au même titre que Backlog ou En cours). Si vous souhaitez que ces 10 cartes deviennent de véritables Epics Jira auxquels rattacher vos autres tâches ([DESIGN-262], [CMS-285], etc.), il vaudra mieux passer par un import CSV ou les convertir manuellement en type de ticket Epic juste après l'import.
- Les cartes modèles : Les cartes Modèle - Idée et Modèle - Backlog seront importées comme des tickets classiques ; pensez à les supprimer dans Jira après la migration.

2. Gérer vos clés de tickets ([ATLAS-137], [CARTO-336], etc.)

- Jira va automatiquement générer une nouvelle clé séquentielle pour chaque carte importée (ex. EHA-1, EHA-2…).
- Vos anciens identifiants ([ATLAS-137], [CMS-441], [DESIGN-262]) resteront visibles dans le titre (Résumé) du ticket, ce qui facilitera les recherches, mais Jira ne les utilisera pas comme clés natives.

3. Conservation des étiquettes et checklists

- Étiquettes (Labels) : Toutes vos pastilles (fonctionnalité, dette, défaut, Cartographie, CMS, etc.) seront importées en tant que Labels Jira. Vous pourrez ensuite filtrer dessus ou les convertir en Composants (Components) pour Cartographie, CMS, atlas et core.
- Checklists : Les nombreuses sous-tâches visibles sur vos cartes (comme les 2/16 ou 8/26 dans la colonne Épiques) seront conservées dans la description ou converties en sous-tâches selon le mode d'importation choisi.
- Bouton Jira en bas à droite : Vous avez déjà le Power-Up Jira actif sur ce tableau ; il sert uniquement à lier des cartes ponctuelles, et non à migrer l'ensemble des 460+ cartes (l'importation depuis l'interface Jira reste la meilleure option).

### Option 1 : Préparer un fichier CSV (recommandée pour garder les vraies Epics)

Cette méthode permet de convertir votre JSON Trello en un fichier CSV propre où la colonne Épiques crée de vrais tickets de type Epic, et où vos étiquettes sont triées entre Types de tickets, Composants et Labels.

Étape 1 : Exporter le JSON depuis Trello

1. Dans Trello (europe-historical-atlas), cliquez sur le menu ... en haut à droite.
2. Allez dans Plus (ou Imprimer, exporter et partager) > Exporter au format JSON.
3. Enregistrez le fichier (ex. trello-export.json).

Étape 2 : Règles de transformation à donner à Claude

- Exclusions : Ignorer les cartes archivées ("closed": true) et les cartes modèles (Modèle - Idée, Modèle - Backlog).
- Mapping des Colonnes Trello (idList) → Statut Jira (Status) :
  - Épiques → Statut À faire (ou En cours), mais avec Issue Type = Epic.
  - Idées → Statut Idées (ou Backlog).
  - Backlog → Statut Backlog.
  - À faire → Statut À faire.
  - En cours → Statut En cours.
  - À valider par le développeur → Statut À valider par le développeur.
  - Fait → Statut Terminé.
- Mapping des Étiquettes Trello (labels) → Champs Jira :
  - Issue Type (par défaut Task, sauf si liste Épiques → Epic) : étiquette défaut → Bug ; étiquette fonctionnalité → Story (ou Task).
  - Components (Composants techniques) : conserver Cartographie, CMS, atlas, core.
  - Labels (Étiquettes libres) : conserver le reste — dette, cosmétique, gênant, outillage, décision, données, épique-cms, épique-incertitude, etc.
- Liaison automatique Epics ↔ Tickets : utiliser les étiquettes préfixées par épique- (ex. épique-cms sur [CMS-441]) pour remplir la colonne CSV Parent (ou Epic Link) en la reliant à la carte correspondante de la liste Épiques (ex. [CMS-285]).
- Nettoyage du titre et description : Summary = titre de la carte Trello ; Description = description de la carte + conversion des checklists en liste à puces Markdown (- [x] / - [ ]) en bas de description.

Étape 3 : Importer le CSV dans Jira

1. Dans Jira, allez dans Paramètres (roue dentée) > Système > Importation système externe > CSV.
2. Chargez le fichier CSV généré par Claude et sélectionnez votre projet cible.
3. Associez chaque colonne du CSV au champ Jira correspondant (Summary, Description, Status, Issue Type, Components, Labels, Parent) et cochez la case Mapper les valeurs pour les statuts et types de tickets.

### Option 2 : Importation directe native (plus rapide, retouches manuelles)

Étape 1 : Préparer le tableau dans Trello

1. Ne touchez pas à l'ordre des listes : Fait est déjà tout à droite, Jira la reconnaîtra automatiquement comme le statut final Terminé.
2. Archivez temporairement les modèles : Archivez Modèle - Idée et Modèle - Backlog avant l'import (Jira ignore les cartes archivées), puis désarchivez-les après si vous gardez Trello.

Étape 2 : Lancer l'assistant Jira

1. Dans Jira, cliquez sur + (Créer un projet / espace) > Importer des données > Trello.
2. Autorisez l'accès à votre compte Trello et sélectionnez le tableau europe-historical-atlas.
3. Associez les membres Trello à leurs comptes Jira.
4. Validez la création du projet.

Étape 3 : Nettoyage post-import dans Jira

1. Convertir les Epics : Filtrez par Status = Épiques (vos 10 cartes), ouvrez chacune d'elles et cliquez sur l'icône de type de ticket (en haut à gauche) pour changer Task → Epic, puis passez leur statut à En cours ou À faire. Supprimez ensuite la colonne Épiques des paramètres de votre tableau Jira.
2. Rattacher les tickets aux Epics : Filtrez par label (ex. labels = épique-cms), utilisez la Modification en masse (Bulk Change en haut à droite) pour attribuer en une fois le champ Parent vers l'Epic [CMS-285].
3. Transformer les domaines en Composants : Filtrez par labels = Cartographie (puis CMS, atlas, core) et utilisez la modification en masse pour ajouter le Composant correspondant.
