# 23 — The Cartographer behind the CMS's account

> [Index](s00-index.md) · CARTO-535 · its decisions are the ticket's (the table of the four states; the CMS stopped,
> no drawing; `?map=` in development only) and the dev's two calls of 2026-11-25, below.
>
> **Since CARTO-536 (2026-11-25, evening)**: signing in opens the start screen when no map is open in the tab
> ([s24](s24-start-screen.md)), the map otherwise; the address names no map any more — « `?map=` in development only »
> below is replaced by the dev's « je veux plus de variables d'URL ».
>
> **Built 2026-11-25 (`93d8b923`, merged `9a6965d0`, CARTO-535).** **Walked by me the same evening**, on a copy of the
> base with a throwaway account, my own CMS (3110) and Cartographer (5199): the sign-in screen, a wrong password, the
> sign-in, a reload, the sign-out, the CMS stopped — each as written below. **Not walked, tested only**: the expired
> session's dialogue and the unreadable answer. **Not walked by the dev.**
>
> **Completed the same evening, the ticket reopened (my fault: closed before its table was read)**: the relief prepared
> behind the sign-in screen, the automatic save following the session, « save first? » before signing out — tested,
> not walked yet. **Not in this ticket**: the start screen and its signed-in states, « Fermer la carte » (CARTO-536);
> « Ajouter au CMS » refused until signed in again (CARTO-498).
>
> **The session is the CMS's own** — Payload's cookie, which the Cartographer's dev server relays and the page never
> holds; signing in here signs in the CMS's admin too, on the same host (`localhost`). A trial is browsed on
> `127.0.0.1`, never `localhost`, or it replaces the dev's own session (REPO-542).

```gherkin
Feature: the Cartographer behind the CMS's account

Scenario: nobody signed in — the form where the map would be
  Given nobody is signed in to the CMS
  When I open the Cartographer
  Then I read « Vérification de la session… » while the CMS is asked
  And then the form « Connexion » — « Connectez-vous avec votre compte du CMS. », « Adresse », « Mot de passe »,
    « Se connecter » — stands where the map would be
  And there is no tool rail, no panel, no status bar
  And the top bar's four file buttons and every command of « Fichier » and « Édition » are greyed, never hidden,
    each saying « — connectez-vous d’abord »

Scenario: « Se connecter » waits for both fields
  Given the form is empty
  Then « Se connecter » is greyed
  And ‹enter› in a field sends nothing until an address and a password are typed

Scenario: a wrong password
  When I sign in with a wrong password
  Then the form reads « Le CMS a refusé : <the CMS's own sentence> »
  And the address stays, the password is emptied

Scenario: signing in opens the editor
  When I sign in with my account of the CMS
  Then the editor opens on the map
  And the top bar's right end reads « Connecté : <my address> » beside « Se déconnecter »

Scenario: the session is kept across a reload
  Given I am signed in
  When I reload the page
  Then the editor opens without the form

Scenario: the session is prolonged while I draw
  Given I am signed in
  Then every thirty minutes the session is prolonged, unseen

Scenario: the relief is prepared behind the sign-in screen
  Given nobody is signed in
  When I open the Cartographer
  Then the relief is baked while the form waits
  And signing in, then out and in again, finds it ready — its seconds never added after signing in

Scenario: signing out
  Given I am signed in, every change saved
  When I press « Se déconnecter »
  Then the form comes back, the chrome greyed, the map kept for the next sign-in
  And the automatic save stops until someone signs in again — then it writes to the same folder

Scenario: signing out with a change not saved
  Given I am signed in and the map holds a change not saved yet
  When I press « Se déconnecter »
  Then the dialogue « Se déconnecter » asks « Vous allez vous déconnecter. Voulez-vous enregistrer la carte en cours ? »
  And [Oui] saves, then signs out — a save that fails keeps me signed in, its own alarm saying why
  And [Non] signs out, the change unsaved
  And ‹escape› signs nothing out

Scenario: the CMS not started
  Given the CMS does not answer, or not within ten seconds
  When I sign in, or the Cartographer asks who is signed in
  Then the form reads « Le CMS ne répond pas : lancez-le, puis réessayez. » with « Réessayer »
  And « Réessayer » asks the CMS again

Scenario: the session expires while I draw
  Given I am signed in and the CMS no longer knows my session
  When the session is next prolonged
  Then the map stays, nothing drawn lost
  And a dialogue « Session expirée » over it reads « Votre session a expiré : reconnectez-vous. Rien de votre dessin
    n’est perdu. », my address kept
  And ‹escape› and a click beside it do not close it
  And the top bar names me, without « Se déconnecter »
  And the automatic save goes on, nothing lost
  And signing in again closes it and the editor goes on

Scenario: an answer the Cartographer cannot read — a defect of the Cartographer
  Given the Cartographer's own server answers with nothing it can read
  Then the error dialogue « La session » reads « La session n’a pas pu être lue : le serveur du Cartographe a envoyé une
    réponse illisible. C’est un défaut du Cartographe ; le détail est dans la console. »
  And the form reads « Le serveur du Cartographe a envoyé une réponse illisible : c’est un défaut du Cartographe (détail
    dans la console). » with « Réessayer »
  And a fault of the CMS is never read as nobody signed in
```

> **The dev's two calls, 2026-11-25.** (1) A request that gets no answer — the dev server stopped, or nothing within the
> delay — reads as the CMS not answering, « Réessayer » recovering it. (2) An answer that cannot be read is a defect, and
> *« l'utilisateur (moi ou un tiers) doit avoir un feedback »*: the console says more, the screen says it — the error
> dialogue and the form's line both.
>
> **My calls, the same evening (the dev: « tu es libre »), open to his word** — `rules/known-issues/cartographer.md`:
> a sign-out the CMS could not close shows nobody signed in, the refusal said in the form; the « La session » alarm is
> never withdrawn by a later good answer, the author dismisses it; the account gate is the page's alone, the dev
> server's write routes taking any request from this machine.
