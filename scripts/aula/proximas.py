"""Mostra as próximas questões da fila do estado.py com enunciado, alternativas e comentário atual.

Uso: python3 scripts/aula/proximas.py [N] [PULAR] [--tema TEMA]
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import estado as E  # noqa: E402

args = [a for a in sys.argv[1:] if not a.startswith('--')]
tema = sys.argv[sys.argv.index('--tema') + 1] if '--tema' in sys.argv else None
if tema in args:
    args.remove(tema)
n = int(args[0]) if args else 3
pular = int(args[1]) if len(args) > 1 else 0
st = E.reconstruir()
fila = [q for q in (st['semComentario'] + st['melhorar']) if not tema or q.startswith(tema + '-')]
print(f'# restantes {len(fila)}', file=sys.stderr)
cache = {}
for qid in fila[pular:pular + n]:
    t = qid.rsplit('-', 1)[0]
    if t not in cache:
        cache[t] = ({q['id']: q for q in json.loads((E.ACERVO / 'temas' / f'{t}.json').read_text())['questoes']},
                    json.loads((E.ACERVO / 'comentarios' / f'{t}.json').read_text()))
    q, c = cache[t][0][qid], cache[t][1].get(qid, {})
    print(f"===== {qid} | {q.get('prova')} {q.get('ano')} | {', '.join(q.get('subtemas') or [])} | gabarito {q.get('gabarito')}")
    print(q['enunciado'])
    for a in q['alternativas']:
        print(f"{a['letra']}) {a['texto']}")
    if c.get('alerta'):
        print('--- ALERTA EXISTENTE:', c['alerta'])
    print('--- comentário atual:')
    print(c.get('conceito', ''))
    print('correta:', c.get('correta', ''))
    for l, v in (c.get('incorretas') or {}).items():
        print(f'{l}:', v.replace('\n', ' '))
    print()
