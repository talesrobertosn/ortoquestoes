# Lista as próximas questões cujo comentário ainda não está no formato "aula".
# Uso: python3 scripts/aula/fila.py TEMA [N] [PULAR] [--sem-comentario|--pendentes|--taro-breves|--topicos|--corrido] [--prova TARO]
#   --sem-comentario: questões ainda sem entrada no JSON de comentários        -> prioridade máxima
#   --pendentes: questões lançadas só com resposta provável, sem explicação    -> prioridade 1
#   --taro-breves: TARO importadas com resposta provável e conceito de até 499 caracteres
#                  (possuem texto, mas ainda não uma explicação completa)       -> prioridade 2
#   sem opção:   comentários "crus" (texto curto ou com listas de tópicos simples)  -> prioridade 2
#   --topicos:   formato antigo com títulos "###" e tabelas                          -> prioridade 3
#   --corrido:   texto corrido antigo, sem a estrutura editorial atual              -> prioridade 4
# O total restante sai na saída de erro ("# restantes N").
import json, sys, re, os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
R = os.path.join(RAIZ, 'public', 'acervo')
prova = sys.argv[sys.argv.index('--prova') + 1] if '--prova' in sys.argv else None
args = [a for i, a in enumerate(sys.argv[1:], 1)
        if not a.startswith('--') and (i == 1 or sys.argv[i - 1] != '--prova')]
tema = args[0]
n = int(args[1]) if len(args) > 1 else 6
pular = int(args[2]) if len(args) > 2 else 0
C = json.load(open(os.path.join(R, 'comentarios', f'{tema}.json'), encoding='utf-8'))
T = json.load(open(os.path.join(R, 'temas', f'{tema}.json'), encoding='utf-8'))
Q = T.get('questoes', T)
QD = {q['id']: q for q in Q}

def classe(v):
    if not (v.get('correta') or '').strip() and v.get('provavel'):
        return 'pendente'
    con = v.get('conceito') or ''
    if '###' in con:
        return 'topicos'
    partes = [p.strip() for p in con.split('\n\n') if p.strip()]
    justificativas = [v.get('correta') or '', *(v.get('incorretas') or {}).values()]
    if partes and all(p.startswith('**') for p in partes) and all(t.startswith('**') for t in justificativas):
        return 'aula'
    if con.count('\n\n') >= 2 and '**' in con and not re.search(r'^\s*- ', con, re.M):
        return 'corrido'
    return 'cru'

alvo = ('sem-comentario' if '--sem-comentario' in sys.argv else
        'pendente' if '--pendentes' in sys.argv else
        'taro-breve' if '--taro-breves' in sys.argv else
        'topicos' if '--topicos' in sys.argv else
        'corrido' if '--corrido' in sys.argv else 'cru')
fila = [k for k, q in sorted(QD.items())
        if not q.get('anulada') and not q.get('duplicataDe')
        and (q.get('gabarito') or C.get(k, {}).get('provavel'))
        and (prova is None or q.get('prova') == prova)
        and ((k not in C) if alvo == 'sem-comentario' else
             (k in C and not C[k].get('conferido') and q.get('prova') == 'TARO'
              and C[k].get('provavel') and 0 < len(C[k].get('conceito') or '') < 500
              and (C[k].get('correta') or '').strip()) if alvo == 'taro-breve' else
             (k in C and classe(C[k]) == alvo))]
print('# restantes', len(fila), file=sys.stderr)
for k in fila[pular:pular + n]:
    q = QD[k]; v = C.get(k, {})
    imgs = [i['arquivo'] for i in (q.get('imagens') or [])]
    print('=' * 10, k, '|', q.get('prova'), q.get('ano'), '|', q.get('subtemas'), '| gab', q['gabarito'] or f"{v['provavel']} (pela bibliografia, sem gabarito oficial)",
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
