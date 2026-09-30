# Lista as próximas questões cujo comentário ainda não está no formato "aula".
# Uso: python3 scripts/aula/fila.py TEMA [N] [PULAR] [--topicos]
#   sem opção:   comentários "crus" (texto curto ou com listas de tópicos simples)  -> prioridade 1
#   --topicos:   formato antigo com títulos "###" e tabelas                          -> prioridade 2
#   --corrido:   texto corrido antigo, sem o parágrafo final "**Na prova:**"         -> prioridade 3
# O total restante sai na saída de erro ("# restantes N").
import json, sys, re, os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
R = os.path.join(RAIZ, 'public', 'acervo')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
tema = args[0]
n = int(args[1]) if len(args) > 1 else 6
pular = int(args[2]) if len(args) > 2 else 0
C = json.load(open(os.path.join(R, 'comentarios', f'{tema}.json'), encoding='utf-8'))
T = json.load(open(os.path.join(R, 'temas', f'{tema}.json'), encoding='utf-8'))
Q = T.get('questoes', T)
QD = {q['id']: q for q in Q}

def classe(v):
    con = v.get('conceito') or ''
    if '###' in con:
        return 'topicos'
    if con.count('\n\n') >= 2 and '**' in con and not re.search(r'^\s*- ', con, re.M):
        return 'aula' if '**Na prova' in con else 'corrido'
    return 'cru'

alvo = 'topicos' if '--topicos' in sys.argv else 'corrido' if '--corrido' in sys.argv else 'cru'
fila = [k for k, v in sorted(C.items())
        if k in QD and not QD[k].get('anulada') and not QD[k].get('duplicataDe')
        and QD[k].get('gabarito') and classe(v) == alvo]
print('# restantes', len(fila), file=sys.stderr)
for k in fila[pular:pular + n]:
    q = QD[k]; v = C[k]
    imgs = [i['arquivo'] for i in (q.get('imagens') or [])]
    print('=' * 10, k, '|', q.get('prova'), q.get('ano'), '|', q.get('subtemas'), '| gab', q['gabarito'],
          ('| IMAGENS: ' + ', '.join('public/imagens/' + a for a in imgs)) if imgs else '')
    if v.get('alerta'):
        print('ALERTA:', v['alerta'])
    print(q['enunciado'])
    for a in q['alternativas']:
        print(' ', a['letra'] + ')', a['texto'])
    print('-- conceito atual:', (v.get('conceito') or '').replace('\n', ' '))
    print('-- correta atual:', (v.get('correta') or '').replace('\n', ' '))
    for l, t in (v.get('incorretas') or {}).items():
        print('--', l, ':', t.replace('\n', ' '))
