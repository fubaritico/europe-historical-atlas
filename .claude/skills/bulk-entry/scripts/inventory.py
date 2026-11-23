"""The list of the tear down (`/find-sources`, steps 23–24): everything still under files/resources/historien/ on
the internal disk, with its size measured, written in French to historien/LISEZ-MOI.md and said in the journal. Each
item is to be filed in the archive on the external disk (archive.py) and then deleted on the dev's word. What stays
is the working set: `outils/`, the journal he follows, `registre/` (the attempts the gate reads). It deletes nothing.
Usage: python3 -I inventory.py"""
import datetime
import os

H = '/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/files/resources/historien'
STAYS = {'outils', 'journal.log', 'LISEZ-MOI.md', 'registre'}


def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from log.py)."""
    line = '%s  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), message)
    print(line, flush=True)
    with open(H + '/journal.log', 'a', encoding='utf-8') as out:
        out.write(line + '\n')


def size(path):
    """The bytes of a file, or of every file under a folder."""
    if os.path.isfile(path):
        return os.path.getsize(path)
    return sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(path) for f in fs
               if os.path.isfile(os.path.join(r, f)))


def entries():
    """The items of the list: a year's folders two levels down (group, lot), anything else at the top."""
    for top in sorted(os.listdir(H)):
        p = os.path.join(H, top)
        if top in STAYS:
            continue
        if not (top.isdigit() and os.path.isdir(p)):
            yield top + ('/' if os.path.isdir(p) else ''), p
            continue
        for group in sorted(os.listdir(p)):
            gp = os.path.join(p, group)
            if not os.path.isdir(gp):
                yield '%s/%s' % (top, group), gp
                continue
            for lot in sorted(os.listdir(gp)):
                lp = os.path.join(gp, lot)
                yield '%s/%s/%s%s' % (top, group, lot, '/' if os.path.isdir(lp) else ''), lp


mb = lambda b: '%.0f Mo' % (b / 1e6) if b >= 1e6 else '%.0f Ko' % (b / 1e3)
rows = [(name, size(path)) for name, path in entries()]
total = sum(s for _, s in rows)
out = ['# historien/ — ce qui reste sur le disque interne', '',
       '> Écrit par `.claude/skills/bulk-entry/scripts/inventory.py` le %s, mesuré sur le disque. Le disque interne '
       'est prêté : le matériel de recherche va dans l\'archive du disque Acer (`/Volumes/Acer/atlas-historien/`, '
       '`archive.py`), puis il est supprimé ici (`/find-sources`, étapes 23–24).' % datetime.date.today().isoformat(), '',
       '**Reste ici** : `outils/`, `journal.log` (le journal suivi par `tail -f`), `registre/` (les essais que le '
       'contrôle de région lit). Le résultat est dans la base et dans la note de la région (`files/plans/sources/`).', '',
       '**À ranger dans l\'archive, puis à supprimer** sur l\'accord du dev :', '', '| élément | taille |', '| --- | --- |']
out += ['| `%s` | %s |' % (n, mb(s)) for n, s in rows]
out += ['| **total** | **%s** |' % mb(total), '']
open(H + '/LISEZ-MOI.md', 'w', encoding='utf-8').write('\n'.join(out))
say('démontage : %d éléments à ranger dans l\'archive puis à supprimer, %s en tout — la liste est dans '
    'historien/LISEZ-MOI.md' % (len(rows), mb(total)))
