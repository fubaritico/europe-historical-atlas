---
name: timeline
description: Interroger le journal d'activité du projet — temps réellement passé, plages de travail, chantiers étalés sur plusieurs jours, fichiers les plus touchés, écart depuis la dernière session. Use when the user asks "combien de temps", "depuis quand", "on a passé combien sur X", "timeline", "historique", "quand est-ce qu'on a travaillé sur", how long something took, when work happened, or how much time went into a file or a component.
allowed-tools: Bash Read
metadata:
  author: fubaritico-ds
  version: '1.0'
---

# Timeline — interroger le journal d'activité

Répond aux questions de **temps réel de travail** à partir de `files/session-log.jsonl` (gitignoré),
alimenté par les hooks d'horodatage (`~/.claude/hooks/session-log.sh`).

## Modèle temporel (à ne pas confondre)

| Notion                | Définition                                               | Fiable ? |
| --------------------- | -------------------------------------------------------- | -------- |
| **Session technique** | Le process Claude Code (`session_start` → `session_end`) | **NON**  |
| **Plage d'activité**  | Actions espacées de < 90 min — le travail réel           | **OUI**  |
| **Chantier**          | Plages espacées de < 48 h — peut couvrir plusieurs jours | **OUI**  |

**Ne JAMAIS répondre une durée basée sur la session technique.** Un terminal laissé ouvert la nuit
donnerait « 14 h de travail » pour 40 min réelles, et trois `/clear` dans la journée donneraient trois
sessions pour une seule journée de travail. Les plages sont **dérivées des timestamps d'actions** —
c'est la seule mesure honnête. Quand tu cites un chiffre, dis de quelle notion il vient.

## Commande de base

```bash
~/.claude/hooks/session-log.sh report "$PWD" 30   # 30 = fenêtre en jours
```

Sort : l'état du chantier (en cours / interrompu, depuis quand, cumul), les plages une par une, et les
fichiers les plus touchés. Ça couvre la majorité des questions — commence toujours par là.

## Recettes pour les questions plus précises

Le journal est du JSONL : `{ts, epoch, ev, f?, cmd?}` avec `ev ∈ edit|bash|session_start|session_end`.
Toujours parser avec `fromjson?` pour ignorer une éventuelle ligne corrompue.

**Temps passé sur un fichier / un composant** (plages ne contenant QUE des actions le concernant) :

```bash
jq -Rrn --arg pat 'DataTable' '
  [inputs | fromjson? | select(.ev=="edit" and (.f // "" | test($pat)))]
  | sort_by(.epoch)
  | reduce .[] as $e ([]; if (length==0) or ($e.epoch - .[-1].end > 5400)
      then . + [{start:$e.epoch,end:$e.epoch,n:1}]
      else .[:-1] + [{start:.[-1].start,end:$e.epoch,n:(.[-1].n+1)}] end)
  | "\(length) plages, \((map(.end-.start)|add)/3600*10|round/10) h, \(map(.n)|add) éditions"
' files/session-log.jsonl
```

**Activité par jour** :

```bash
jq -Rrn '[inputs | fromjson? | select(.ev=="edit")] | group_by(.ts[0:10])
  | map("\(.[0].ts[0:10]) — \(length) éditions")[]' files/session-log.jsonl
```

**Quand a-t-on touché ce fichier pour la dernière fois ?**

```bash
jq -Rrn --arg f 'next.md' '[inputs | fromjson? | select(.ev=="edit" and (.f//""|test($f)))]
  | last | .ts' files/session-log.jsonl
```

## Compléter avec git

Le journal ne couvre que les sessions **depuis l'installation des hooks**. Pour l'historique antérieur,
croise avec git — qui horodate tout ce qui a été commité :

```bash
git log --format='%ad %s' --date=format:'%Y-%m-%d %H:%M' -- <path>
```

Le journal et git sont **complémentaires** : git connaît le passé profond mais rate les sessions sans
commit ; le journal capte tout le travail, commité ou non, mais seulement depuis son installation.

## Gotchas

- **Le journal peut ne pas exister** (`files/session-log.jsonl` absent = hooks jamais déclenchés dans
  ce projet). Le dire franchement plutôt que de répondre un chiffre inventé, et basculer sur git.
- **Il est gitignoré** (dossier `files`) : local à la machine, jamais partagé, jamais commité.
- **Les lectures ne sont pas journalisées** — seuls `Edit`/`Write` et `Bash` le sont. Donc une session
  passée à lire du code apparaît vide : ne pas conclure « rien n'a été fait », dire « aucune
  modification enregistrée sur cette plage ».
- **Les seuils (90 min / 48 h) sont des constantes** du script (`SPAN_GAP`, `STREAK_GAP`). Si un
  résultat semble absurde, vérifie-les avant de conclure.
