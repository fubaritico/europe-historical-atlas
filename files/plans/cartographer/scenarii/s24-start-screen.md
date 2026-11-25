# 24 — The start screen: a map chosen, never opened by itself

> [Index](s00-index.md) · CARTO-536 · after Illustrator's start screen (the dev's capture of 2026-11-25,
> `~/Desktop/Screenshot 2026-11-25 at 17.28.20.png`), and the table of the four states of CARTO-535.
>
> **The dev, 2026-11-25, evening**: *« il manque le panneau à la Illustrator. Moi, je veux pas de fichier par défaut. Je
> veux pas le 1100 par défaut. Je vais pouvoir ouvrir celui que je veux ouvrir. […] les Open Recently, la liste des
> cartes, créer une nouvelle carte »* — and *« je veux plus de variables d'URL »*, which replaces the ticket's « `?map=`
> in development only ».
>
> **Built 2026-11-25 (CARTO-536). Walked by me the same evening**, on a copy of the base with a throwaway account, my own
> CMS (3110) and Cartographer (5199): the sign-in centred, the start screen after it, 1200 opened from the list (the
> address unchanged, the tab keeping it), « Fermer la carte », « Nouvelle carte » refusing « 1200 » for the year 1110
> under its field, then making « 1110-essai » — an empty 1110 on the relief, reopened by a reload, at the top of the
> list once closed. **Not walked**: the question before closing a modified map, the list failing. **Not walked by the
> dev.**
>
> **The dev's look the same evening**: *« comme Illustrator »* — the content centred under the title; the two buttons
> with their glyphs, chosen on the workbench among three each: « Nouvelle carte… », a sheet with a dog-ear and a plus;
> « Ouvrir… », an open folder — drawn as 1 px lines on half pixels, after the first drawing (squares) came out blurred
> and jagged. A thumbnail of each map: CARTO-554.
>
> **The coder's calls, said to the dev the same evening, open to his word**: the map open is kept in the tab (a reload
> reopens it, a new tab starts on this screen); the last maps are ordered by when they were last written — a map opened
> and left unchanged does not climb — and leave the automatic saves to *Open…*, where they stay; a name kept in the tab
> that cannot be a map's opens this screen, said in the console. `?slow=save` and `?break=…` stay, development-only
> switches of the tests, which open no map.

```gherkin
Feature: the start screen

Scenario: signed in, no map opens by itself
  Given I am signed in, in a new tab
  When the Cartographer opens
  Then the start screen stands where the map would be: « Nouvelle carte… » and « Ouvrir… » on the left, « Bienvenue dans
    le Cartographe » and « Cartes récentes » in the middle
  And there is no tool rail, no panel, no status bar, and no map's name in the top bar
  And no relief is prepared

Scenario: the last maps, newest first
  Given the maps 1100, written today at 19:41, and 1200, written on 20 November
  And the automatic save 1100.autosave.2026-11-25T19-05-12, written at 20:00
  Then « Cartes récentes » lists « 1100 — modifiée aujourd’hui à 19:41 », then « 1200 — modifiée le 20 novembre 2026 à
    09:05 »
  And the automatic save is not listed — Open… lists it
  And at most twelve maps are listed

Scenario: a map opened with one click
  When I click « 1200 » in « Cartes récentes »
  Then the Cartographer opens 1200, its name in the top bar
  And the address does not change

Scenario: the menus and the bar on the start screen
  Then Fichier offers « Nouvelle carte… » and « Ouvrir… »
  And « Fermer la carte », « Enregistrer », « Enregistrer sous… » and « Enregistrer une copie » are greyed, never hidden
  And every command of Édition is greyed
  And the bar's « Enregistrer », « Enregistrer sous… » and « Enregistrer une copie » are greyed, each saying
    « — ouvrez d’abord une carte », « Ouvrir… » acting
  And ‹cmd+O› opens « Ouvrir une carte », where every map is a choice; every other key is declined in the console
  And the top bar's right end reads « Connecté : <my address> » beside « Se déconnecter »

Scenario: the maps cannot be listed
  Given the Cartographer's server refuses the list
  Then the start screen reads « Les cartes n’ont pas pu être listées (détail dans la console). » with « Réessayer »
  And « Réessayer » reads them again

Scenario: no map yet
  Given years/ holds no map, or only automatic saves
  Then the start screen reads « Aucune carte pour l’instant : créez-en une avec « Nouvelle carte ». »
```

## The map kept, and closed

```gherkin
Scenario: a reload reopens the map open
  Given I opened 1200 from the start screen
  When I reload the page
  Then 1200 opens again, at the view where I left it

Scenario: « Fermer la carte »
  Given 1200 is open, every change saved
  When I choose Fichier › Fermer la carte
  Then the start screen comes back, 1200 at the top of « Cartes récentes »

Scenario: « Fermer la carte » with a change not saved
  Given 1200 is open and modified
  When I choose Fichier › Fermer la carte
  Then the dialogue « Fermer la carte » asks « Vous allez fermer la carte. Voulez-vous enregistrer la carte en cours ? »
  And [Oui] saves, then closes — a save that fails keeps the map open, its own alarm saying why
  And [Non] closes, the change unsaved
  And ‹escape› keeps the map open

Scenario: an address naming a map opens nothing of it
  Given the address reads ?map=1200
  Then the address is not read: the map kept in the tab opens, or the start screen
```

## Nouvelle carte

```gherkin
Scenario: a new map of a year
  When I press « Nouvelle carte… », on the start screen or in Fichier
  Then the dialogue « Nouvelle carte » asks « Année » (focused) and « Nom de la carte »
  When I type 1110 and « 1110-essai », then press « Créer »
  Then years/1110-essai/ is written, an empty map of the year 1110
  And the Cartographer opens it on the bare relief, its name in the top bar

Scenario: from a map open and modified, the question first
  Given 1100 is open and modified
  When I create the map « 1110 »
  Then « Vous allez ouvrir 1110. Voulez-vous enregistrer la carte en cours ? » is asked before anything is written
  And dismissing it creates nothing

Scenario: refusals, said under their field
  When I type « mil » as the year
  Then under « Année »: « L’année s’écrit en chiffres, précédée de « - » avant notre ère : 1110, -50 »
  When I type 1110 and name the map « 1200 »
  Then under « Nom de la carte »: « Une carte nommée 1200 est la carte de l’année 1200, que l’atlas publie — cette carte
    est 1110. Choisissez un autre nom »
  When I name it as a map that exists
  Then under « Nom de la carte »: « Une carte nommée <name> existe déjà — choisissez un autre nom », nothing written over
  And a refusal clears as its own field is typed in again
```

> **Not in this rung**: the view of each map kept across tabs (a map opened in a new tab opens on the whole relief);
> « Nouvelle carte » and « Fermer la carte » have no key (‹cmd+N› and ‹cmd+W› are the browser's).
