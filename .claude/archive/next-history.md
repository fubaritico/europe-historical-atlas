# Next — archive

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

