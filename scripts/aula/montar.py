# Converte um lote em texto simples para o JSON de comentários, valida o formato "aula" e aplica.
# Formato do lote:
#   @@ id-da-questao
#   ## alerta            (opcional; só quando o gabarito oficial é duvidoso)
#   texto
#   ## conceito
#   **Título.** parágrafo...
#
#   **Na prova:** ...
#   ## correta
#   **Frase em negrito.** explicação
#   ## A
#   **Frase em negrito.** explicação   (uma seção por alternativa ERRADA)
# Uso: python3 scripts/aula/montar.py lote.txt [--seco]
import json, re, sys, subprocess, os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
R = os.path.join(RAIZ, 'public', 'acervo')
arq = sys.argv[1]; seco = '--seco' in sys.argv
txt = open(arq, encoding='utf-8').read()
lote = {}; erros = []
for bloco in re.split(r'^@@\s*', txt, flags=re.M)[1:]:
    qid, resto = bloco.split('\n', 1)
    qid = qid.strip()
    partes = re.split(r'^##\s*(\S+)\s*$', resto, flags=re.M)
    c = {'incorretas': {}}
    for nome, corpo in zip(partes[1::2], partes[2::2]):
        corpo = corpo.strip()
        if nome == 'conceito': c['conceito'] = corpo
        elif nome == 'correta': c['correta'] = corpo
        elif nome == 'alerta': c['alerta'] = corpo
        else: c['incorretas'][nome] = corpo
    con = c.get('conceito', '')
    pars = [p for p in con.split('\n\n') if p.strip()]
    if len(pars) < 3: erros.append(f'{qid}: conceito com {len(pars)} parágrafos (mínimo 3)')
    for p in pars:
        if not p.startswith('**'): erros.append(f'{qid}: parágrafo sem título em negrito: {p[:50]}')
    if '**Na prova' not in con: erros.append(f'{qid}: falta o parágrafo **Na prova:**')
    todo = json.dumps(c, ensure_ascii=False)
    if '—' in todo or '–' in todo: erros.append(f'{qid}: tem travessão (proibido)')
    if '###' in con: erros.append(f'{qid}: tem título ### (proibido)')
    if re.search(r'^\s*[-*] ', con, re.M): erros.append(f'{qid}: marcador de lista no conceito (proibido)')
    if not c.get('correta', '').startswith('**'): erros.append(f'{qid}: correta sem abertura em negrito')
    for l, t in c['incorretas'].items():
        if not t.startswith('**'): erros.append(f'{qid}/{l}: alternativa sem abertura em negrito')
    lote[qid] = c
    print(f'{qid}: conceito {len(con)} | correta {len(c.get("correta", ""))} | ' +
          ' '.join(f'{l}:{len(t)}' for l, t in c['incorretas'].items()))
if erros:
    print('\n'.join(erros)); sys.exit(1)
# Preserva alerta e referências que já existiam, se o lote não trouxer.
for qid, c in lote.items():
    tema = re.sub(r'-\d+$', '', qid)
    ant = json.load(open(os.path.join(R, 'comentarios', f'{tema}.json'), encoding='utf-8')).get(qid, {})
    for k in ('alerta', 'referencias'):
        if k not in c and ant.get(k): c[k] = ant[k]
saida = arq.rsplit('.', 1)[0] + '.json'
json.dump(lote, open(saida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
args = [sys.executable, os.path.join(RAIZ, 'scripts', 'aplicar_comentarios.py'), saida] + (['--seco'] if seco else [])
sys.exit(subprocess.call(args))
