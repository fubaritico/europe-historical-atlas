"""The research journal the dev follows in his terminal (the dev, 2026-11-23: "I want logs — I am checking, I found
this, I do that, the date"). One line per thing done, in French, dated to the second, printed and appended to
/Volumes/Acer/atlas-historien/journal.log. He follows it with:  tail -f /Volumes/Acer/atlas-historien/journal.log

  python3 -I research_log.py say "<what I am doing or what I found>"
  python3 -I research_log.py attempt '<one attempt as JSON — the fields are region_gate.py's>'

**Every line names its writer** (the dev, 2026-11-24: several teams write at once): `[<ATLAS_WHO>]` after the date,
from the environment — `ATLAS_WHO="CARTO-505 · r39-maghreb" python3 -I research_log.py say "…"`; unset, `[historien]`.
Every script of this skill that writes the journal does the same.
**In colour**: `python3 -I research_log.py follow` follows the journal like `tail -f`, each team (its story key) in
its own colour — blue, orange, green… — the historian's own lines plain; the file itself stays plain text.

`attempt` is the only way an attempt is recorded: it appends the line to registre/attempts.jsonl (its date added) and
says it in the journal, so nothing is tried without being shown. A script of this skill that reads or fetches copies
`say` (python3 -I cannot import a neighbour) and calls it before and after each source.
"""
import datetime
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
JOURNAL = pathlib.Path('/Volumes/Acer/atlas-historien/journal.log')
ATTEMPTS = pathlib.Path('/Volumes/Acer/atlas-historien/registre/attempts.jsonl')
WORDS = {'found': 'TROUVÉ', 'nothing': 'RIEN', 'refused': 'REFUSÉ', 'not available': 'INACCESSIBLE',
         'not relevant': 'HORS SUJET'}
NEEDED = ('year', 'region', 'kind', 'where', 'words', 'result')


def say(message):
    """Print one dated line and append it to the journal; stop when the archive's disk is absent."""
    if not JOURNAL.parent.is_dir():
        sys.exit('DISQUE ABSENT — %s introuvable : branche le disque Acer, la recherche reprend ensuite.' % JOURNAL.parent)
    line = '%s  [%s]  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), __import__('os').environ.get('ATLAS_WHO', 'historien'), message)
    print(line, flush=True)
    with JOURNAL.open('a', encoding='utf-8') as out:
        out.write(line + '\n')


def attempt(raw):
    """Record one attempt in the register and say it in the journal."""
    row = json.loads(raw)
    lacking = [k for k in NEEDED if row.get(k) in (None, '')]
    if row.get('result') not in WORDS:
        lacking.append('result (one of: %s)' % ', '.join(WORDS))
    if row.get('result') == 'not relevant' and not str(row.get('reason') or '').strip():
        lacking.append('reason')
    if lacking:
        sys.exit('attempt refused, missing: ' + ', '.join(lacking))
    row = {'date': datetime.date.today().isoformat(), **row}
    with ATTEMPTS.open('a', encoding='utf-8') as out:
        out.write(json.dumps(row, ensure_ascii=False) + '\n')
    say('[%s %s] %s — %s — cherché « %s »%s → %s%s' % (
        row['region'], row['year'], row['kind'], row['where'], row['words'],
        ' pour ' + row['place'] if row.get('place') else '', WORDS[row['result']],
        ' : ' + str(row.get('reason') or row.get('note')) if row.get('reason') or row.get('note') else ''))


COLOURS = ('\033[34m', '\033[33m', '\033[32m', '\033[35m', '\033[36m', '\033[31m')  # blue, orange, green, …
RESET = '\033[0m'


def follow(lines=40):
    """Follow the journal like `tail -f`, each team in its colour (its story key picks it); the file stays plain."""
    import time
    seen = {}

    def paint(line):
        start, end = line.find('  ['), line.find(']  ')
        if start < 0 or end < 0:
            return line
        team = line[start + 3:end].split(' · ')[0]
        if team == 'historien':
            return line
        colour = seen.setdefault(team, COLOURS[len(seen) % len(COLOURS)])
        return colour + line + RESET

    with JOURNAL.open(encoding='utf-8') as journal:
        for line in journal.readlines()[-lines:]:
            print(paint(line.rstrip('\n')), flush=True)
        while True:
            line = journal.readline()
            if line:
                print(paint(line.rstrip('\n')), flush=True)
            else:
                time.sleep(0.5)


if len(sys.argv) == 2 and sys.argv[1] == 'follow':
    follow()
    sys.exit(0)
if len(sys.argv) != 3 or sys.argv[1] not in ('say', 'attempt'):
    sys.exit(__doc__)
(say if sys.argv[1] == 'say' else attempt)(sys.argv[2])
