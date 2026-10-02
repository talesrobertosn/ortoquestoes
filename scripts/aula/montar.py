# Converte um lote em texto simples para o JSON de comentários e aplica.
# A forma é livre (diretriz do dono, 02/10/2026): cada comentário é escrito do jeito que a questão pede.
# Formato do lote:
#   @@ id-da-questao
#   ## alerta            (opcional; só quando o gabarito oficial é duvidoso)
#   ## sem-alerta        (opcional; retira um alerta antigo após confirmar a resposta)
#   ## referencias       (opcional; uma referência por linha, substitui as antigas)
#   texto
#   ## conceito
#   **Título.** parágrafo...
#
#   **Na prova:** ...      (opcional, apenas quando acrescentar algo)
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
lote = {}; erros = []; sem_alerta = set()
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
        elif nome == 'sem-alerta': sem_alerta.add(qid)
        elif nome == 'referencias': c['referencias'] = [l.strip() for l in corpo.splitlines() if l.strip()]
        else: c['incorretas'][nome] = corpo
    con = c.get('conceito', '')
    if not con.strip(): erros.append(f'{qid}: conceito vazio')
    todo = json.dumps(c, ensure_ascii=False)
    if '—' in todo or '–' in todo: erros.append(f'{qid}: tem travessão (proibido)')
    if not c.get('correta', '').strip(): erros.append(f'{qid}: correta vazia')
    for l, t in c['incorretas'].items():
        if not t.strip(): erros.append(f'{qid}/{l}: alternativa vazia')
    lote[qid] = c
    print(f'{qid}: conceito {len(con)} | correta {len(c.get("correta", ""))} | ' +
          ' '.join(f'{l}:{len(t)}' for l, t in c['incorretas'].items()))
if erros:
    print('\n'.join(erros)); sys.exit(1)
# Preserva alerta, referências e a resposta pela bibliografia que já existiam, se o lote não trouxer.
for qid, c in lote.items():
    tema = re.sub(r'-\d+$', '', qid)
    ant = json.load(open(os.path.join(R, 'comentarios', f'{tema}.json'), encoding='utf-8')).get(qid, {})
    for k in ('alerta', 'referencias', 'provavel'):
        if k == 'alerta' and qid in sem_alerta: continue
        if k not in c and ant.get(k): c[k] = ant[k]
saida = arq.rsplit('.', 1)[0] + '.json'
json.dump(lote, open(saida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
args = [sys.executable, os.path.join(RAIZ, 'scripts', 'aplicar_comentarios.py'), saida] + (['--seco'] if seco else [])
codigo = subprocess.call(args)
if codigo == 0 and not seco:
    # Registra o lote no checkpoint com os fingerprints do que foi gravado.
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import estado as E, datetime
    cp = E.CHECKPOINT; d = json.loads(cp.read_text())
    for qid in lote:
        tema = re.sub(r'-\d+$', '', qid)
        q = next(x for x in json.load(open(os.path.join(R, 'temas', f'{tema}.json'), encoding='utf-8'))['questoes'] if x['id'] == qid)
        c = json.load(open(os.path.join(R, 'comentarios', f'{tema}.json'), encoding='utf-8'))[qid]
        d.setdefault('concluidos', {})[qid] = {'questaoSha256': E.questao_fingerprint(q), 'comentarioSha256': E.fingerprint(c),
                                               'estado': 'na_branch', 'data': datetime.date.today().isoformat(), 'fontes': c.get('referencias', [])}
    cp.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
sys.exit(codigo)
