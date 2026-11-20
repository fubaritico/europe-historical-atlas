## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-20 (fin d'après-midi) — le codeur : le tableau passe de Trello à Jira, en deux heures

Plage **20/11 16:12 → 18:12** (2 h, dans la plage 12:31 → 18:12 du journal, après la session du début d'après-midi) ;
le chantier totalise **378 h 04 sur 59 plages**. Tout est commité et poussé.

- **Fermés** : REPO-492 (les 492 tickets dans Jira — numéros, dates et 676 commentaires gardés, contrôlés ticket par
  ticket ; la skill `/jira` et le MCP d'Atlassian à la place de `/trello` et de son script), REPO-493 (Trello supprimé,
  le site sur l'offre gratuite : ses deux gestes).
- **Ses décisions** : _« pas d'essai on s'en fout, tu vas travailler avec le MCP d'Atlassian »_ ; le site
  `europehistoricalatlas` ; **le Backlog est une page, pas une colonne** (_« attends, le backlog n'est pas une colonne,
  c'est une page »_) ; quatre onglets sur le tableau (_« je veux juste les liens dont j'ai besoin »_) ; deux comptes,
  « Claude Coder » et « Claude Historian », pour dire qui tient un ticket ; Trello **supprimé** et non fermé
  (_« efface »_) ; « Fait » du plus récent au plus ancien (_« je vois que l'ordre dans Fait est bon, je valide »_).
- **Ce que l'import a vraiment demandé**, absent de la page d'Atlassian : un projet créé avant, les anciens noms de
  champs, des statuts globaux nommés par leur vrai nom — le récit dans `files/plans/jira-migration.md`. Les petits
  imports de diagnostic, qu'il avait écartés puis permis (_« ok si ça peut te faire comprendre »_), ont trouvé les
  deux causes.
- **Sa leçon** (mémoire `no-unmeasured-durations`) : j'avais annoncé « un jour et demi » ; _« tu vas vite, non ? y en
  a pour une heure max »_, puis _« ben tu vois, ça a mis une heure et quelque »_.
- **Les arbres** `coder` et `historian` sont à jour de `main` : la prochaine session de l'historien lit `/jira`.
- **Une courte session ensuite, 18:28 → 18:40** (la plage du journal devient 12:31 → 18:33, 378 h 25 au total) : à sa
  demande, `/start-session` vérifie à chaque session que le MCP d'Atlassian répond et le dit (_« ça devrait être un
  réflexe »_) ; il a relancé le codeur et l'historien pour voir qu'ils démarrent bien après la migration. **Ma faute** :
  j'ai proposé CMS-441 comme suite alors que le sujet en cours était les icônes des événements — `next.md` le dit maintenant.
- **Mes fautes** : une durée additionnée de tête, fausse d'un facteur dix ; trois heures écrites de tête dans des
  fichiers et un commentaire ; un `cd` ; des accents graves entre guillemets dans le shell ; « Backlog est dans la
  barre » affirmé depuis un écran plus large que le sien ; « fermé et lisible » écrit pour Trello sans l'avoir vu ; un
  nom de site avec des tirets, que Jira refuse.

### 2026-11-20 — le codeur : l'oriflamme de la conquête, les rangs et leurs scores, la décision de migrer vers Jira

Plage **20/11 12:31 → 16:00** (3 h 27 au journal, avec l'historien dans une autre session) ; le chantier totalise
**375 h 49 sur 59 plages**. Tout est commité et poussé.

- **Fermés** : ATLAS-477 (l'oriflamme : le modèle 3D « A », l'image plate « H2 » redessinée dans son cadre, plantée
  par son mât ; le sol sali à sa demande ; l'icône posée par moi sur le type « Conquest », base copiée avant —
  _« Le rendu est très très bon »_), CARTO-487 (une seule liste de rangs, lue par le Cartographe et le CMS ; le rang
  « peuple »), CORE-489 (un score par rang, un vassal mieux classé que son suzerain est dit, jamais bloqué ; **la
  marche à 3**, sa décision de 15 h 20), CARTO-488 (un CMS ID propose le nom, le rang et les années), CARTO-491 (créé
  à sa demande : la fenêtre d'une ville dit le maillon incohérent).
- **Sa règle du jour** (mémoire `one-gesture-to-validate`) : _« je n'ai pas à intervenir dans la validation d'une
  fonctionnalité, elle DOIT être testée, et s'il y a un truc on le verra quand on s'en sert »_ — je teste et je clos ;
  ne va à lui que ce qui se juge à l'œil ou se décide, en un seul geste.
- **Le tableau migre vers Jira** (sa décision) : la colonne « Fait » à 261 tickets, et le besoin d'une hiérarchie
  claire épique → story → tâche → correctif. La référence d'un ticket reste `[CARTO-67]` : _« une pratique qu'on
  gardera pour pas que vous soyez chamboulés avec l'historien »_. À faire dans une nouvelle session.
- **Avec l'historien** : son arbre resynchronisé (52 commits de retard) ; 27 sortes de territoire corrigées par lui
  (les califats, les taïfas en émirats, cinq républiques, les Coumans) ; quatre exports contrôlés et commités. Il
  reste trois maillons signalés, voulus : les duchés de Naples et de Gaète.
- **Trouvé en route** : le contrôle du commit rejouait les tests du Cartographe quand `core` changeait — `test`
  dépend maintenant de `^test` dans Turbo (`rules/troubleshooting.md`).
- **ATLAS-448** commencé : l'inventaire des textes de l'atlas et de leur langue (`files/plans/atlas/one-language.md`).
- **Mes fautes** : un push pendant qu'une CI déployait (son run annulé, le suivant a tout porté) ; quatre tickets
  « à valider » avec des listes de cas à essayer ; CARTO-488 et CARTO-491 clos sans les avoir regardés dans le
  navigateur ; « state » annoncé inutilisé par le ticket, vérifié seulement en codant.
