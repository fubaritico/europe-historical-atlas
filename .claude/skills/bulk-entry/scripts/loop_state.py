"""The state of the research loop between two rounds (`/find-sources`, « The loop »): from the deliverable
(`resultats/saisie.json`, built by build_saisie.py) the open questions — a sheet with no holder, an existence unknown, a
divergence, a holder on one fragile witness — and from the book queue (`travail/a-lire.jsonl`) the books that can answer
them, those already filed in the archive set apart. Says in the journal whether the loop goes on, and why it stops.
Writes travail/etat-boucle.json, the next round's input.

  python3 -I loop_state.py <year> <zone> <round done>
"""
import datetime
import json
import pathlib
import sys

YEAR, ZONE, ROUND = int(sys.argv[1]), sys.argv[2], int(sys.argv[3])
ARCH = pathlib.Path('/Volumes/Acer/atlas-historien/%d/%s' % (YEAR, ZONE))
MAX_ROUNDS = 3


def say(message):
    """Print one dated line and append it to the research journal (copied from research_log.py)."""
    line = '%s  [%s]  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), __import__('os').environ.get('ATLAS_WHO', 'historien'), message)
    print(line, flush=True)
    with open('/Volumes/Acer/atlas-historien/journal.log', 'a', encoding='utf-8') as out:
        out.write(line + '\n')


saisie = json.load(open(ARCH / 'resultats/saisie.json'))
open_q = []
for s in saisie:
    if s['action'] in ('supprimer', 'fusionner'):
        continue
    holder_lines = [l for l in s.get('lines', []) if l['subject'] == 'holder']
    # A divergence kept beside a most probable reading is a result, not an open question.
    why = ('no holder' if not s.get('holder') else
           'existence unknown' if s.get('existed') == 'unknown' else
           'one fragile witness' if s.get('fragile') and len({l.get('work') for l in holder_lines}) < 2 else None)
    if why:
        open_q.append({'qid': s['qid'], 'name': s['name'], 'why': why})
asked = {q['qid'] for q in open_q}

queue = []
path = ARCH / 'travail/a-lire.jsonl'
if path.exists():
    for raw in path.read_text(encoding='utf-8').splitlines():
        try:
            queue.append(json.loads(raw))
        except ValueError:
            say('boucle : une ligne illisible dans a-lire.jsonl, ignorée : %s' % raw[:80])
filed = (pathlib.Path('/Volumes/Acer/atlas-historien/ouvrages/index.md').read_text(encoding='utf-8').lower()
         if pathlib.Path('/Volumes/Acer/atlas-historien/ouvrages/index.md').exists() else '')
books = {}
for b in queue:
    if b.get('qid') not in asked:
        continue  # its question is answered: the book leaves the queue
    key = (b.get('title') or '').lower().strip()
    entry = books.setdefault(key, {'title': b.get('title'), 'author': b.get('author'), 'where': b.get('where'),
                                   'id': b.get('id'), 'questions': [], 'filed': key[:30] in filed if key else False})
    entry['questions'].append({'qid': b.get('qid'), 'question': b.get('question')})
can_read = [b for b in books.values() if b['where'] == 'free' or b['filed']]
by_him = [b for b in books.values() if b['where'] in ('loan', 'bnf', 'jstor', 'gallica') and not b['filed']]

previous = ARCH / 'travail/etat-boucle.json'
before = json.load(open(previous)) if previous.exists() and ROUND > 1 else None
progress = before is None or len(open_q) < len(before.get('open', []))
with_book = {q['qid'] for b in can_read + by_him for q in b['questions']}
to_dig = [q for q in open_q if q['qid'] not in with_book]  # no book queued: a researcher climbs the ladder on it alone
stop = ('aucune question ouverte' if not open_q else
        'trois tours faits' if ROUND >= MAX_ROUNDS else
        'le dernier tour n\'a fait avancer aucune question' if not progress else None)
state = {'round': ROUND, 'open': open_q, 'toRead': can_read, 'inHisBrowser': by_him, 'toDig': to_dig, 'stop': stop}
(ARCH / 'travail/etat-boucle.json').write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding='utf-8')
say('boucle %s %d, tour %d fait : %d questions ouvertes — %d livres pour les lecteurs, %d dans son navigateur, %d à creuser par un chercheur — %s'
    % (ZONE, YEAR, ROUND, len(open_q), len(can_read), len(by_him), len(to_dig),
       ('ARRÊT : %s' % stop) if stop else 'tour %d à lancer' % (ROUND + 1)))
