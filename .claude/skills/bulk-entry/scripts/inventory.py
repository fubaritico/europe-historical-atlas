"""What a research leaves to clean (`/find-sources`, step 24), measured and said in the journal: every
`<year>/<zone>/travail/` folder of the archive (the downloads and lots of a research, emptied at its end), and anything
of the historian's still on the internal disk (files/resources/historien/, which no longer holds research since
2026-11-23: the archive disk is the research's workspace). It deletes nothing: the list is shown to the dev, who
grants each deletion. Usage: python3 -I inventory.py"""
import datetime
import pathlib
import sys

ARCHIVE = pathlib.Path('/Volumes/Acer/atlas-historien')
INTERNAL = pathlib.Path('/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/files/resources/historien')
STAYS = {'outils', 'LISEZ-MOI.md'}  # the local launchers stay on the internal disk


def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from research_log.py)."""
    line = '%s  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), message)
    print(line, flush=True)
    with (ARCHIVE / 'journal.log').open('a', encoding='utf-8') as out:
        out.write(line + '\n')


def size(path):
    """The bytes of a file, or of every file under a folder."""
    if path.is_file():
        return path.stat().st_size
    return sum(p.stat().st_size for p in path.rglob('*') if p.is_file())


mb = lambda b: '%.0f Mo' % (b / 1e6) if b >= 1e6 else '%.0f Ko' % (b / 1e3)
if not ARCHIVE.is_dir():
    sys.exit('DISQUE ABSENT — %s introuvable : branche le disque Acer.' % ARCHIVE)
rows = [('archive', str(p.relative_to(ARCHIVE)), size(p)) for p in sorted(ARCHIVE.glob('*/*/travail'))
        if any(p.iterdir())]
if INTERNAL.is_dir():
    rows += [('disque interne', str(p.relative_to(INTERNAL.parent)), size(p)) for p in sorted(INTERNAL.iterdir())
             if p.name not in STAYS]
lines = ['# Ce qui reste à nettoyer', '', '> Écrit par `inventory.py` le %s, mesuré. Rien n\'est supprimé sans '
         'l\'accord du dev.' % datetime.date.today().isoformat(), '', '| où | élément | taille |', '| --- | --- | --- |']
lines += ['| %s | `%s` | %s |' % (where, name, mb(s)) for where, name, s in rows]
lines += ['| **total** | | **%s** |' % mb(sum(s for _, _, s in rows)), '']
(ARCHIVE / 'a-nettoyer.md').write_text('\n'.join(lines), encoding='utf-8')
say('nettoyage : %d éléments, %s en tout — la liste est dans atlas-historien/a-nettoyer.md'
    % (len(rows), mb(sum(s for _, _, s in rows))))
