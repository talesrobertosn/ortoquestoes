#!/usr/bin/env python3
"""Inventário e fila de comentários baseados em resumos. Não produz revisão clínica automática."""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DOC = RAIZ / 'docs/comentarios-resumos'

def ler(p):
    return json.loads(p.read_text(encoding='utf-8'))

def sha(obj):
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def dados():
    qs, cs = {}, {}
    for p in sorted((RAIZ / 'public/acervo/temas').glob('*.json')):
        d = ler(p)
        for q in d['questoes'] if isinstance(d, dict) else d:
            qs[q['id']] = (p.stem, q)
    for p in sorted((RAIZ / 'public/acervo/comentarios').glob('*.json')):
        cs.update(ler(p))
    bib = ler(RAIZ / 'public/biblioteca/indice.json')['capitulos']
    caps = {c['id']: ler(RAIZ / f'public/biblioteca/capitulos/{c["id"]}.json') for c in bib}
    return qs, cs, bib, caps, ler(RAIZ / 'public/biblioteca/questoes.json')

def fingerprint_questao(q):
    return sha({k: q.get(k) for k in ('enunciado','alternativas','gabarito','gabaritoBibliografia','imagens','anulada','tipo','respostaEsperada')})

def fingerprint_comentario(c):
    return sha({k:v for k,v in c.items() if k != 'baseResumo'})

def fonte(cid, blocos, caps):
    c = caps[cid]
    por_bloco = {b['id']: (s, b) for s in c['secoes'] for b in s['blocos']}
    if not blocos or any(b not in por_bloco for b in blocos):
        raise ValueError(f'{cid}: bloco ausente/inválido')
    return {'resumo': cid, 'titulo': c['titulo'], 'livro': c['livro'], 'edicao': c['edicao'],
            'capitulo': c['capitulo'], 'secoes': list(dict.fromkeys(por_bloco[b][0]['titulo'] for b in blocos)),
            'blocos': blocos, 'sha256': sha(c), 'trechosSha256': sha([por_bloco[b][1] for b in blocos])}

def inventario():
    qs, cs, bib, caps, mapa = dados()
    anteriores = ler(DOC / 'catalogo.json') if (DOC / 'catalogo.json').exists() else {}
    anotacoes = anteriores.get('questoes', {})
    saida = {}
    for qid, (tema, q) in qs.items():
        diretas = mapa.get(qid, [])
        candidatas = sorted({d['c'] for d in diretas} | {c['id'] for c in bib if set(c.get('subtemas', [])) & set(q.get('subtemas', []))})
        if not candidatas:
            continue
        c = cs.get(qid, {})
        base = c.get('baseResumo')
        estado, motivo = 'pendente', ''
        if q.get('duplicataDe'):
            estado, motivo = 'duplicada', q['duplicataDe']
        elif c.get('conferido'):
            estado, motivo = 'preservar-revisao-medica', 'Não sobrescrever revisão médica.'
        elif base:
            try:
                atuais = [fonte(f['resumo'], f['blocos'], caps) for f in base['fontes']]
                fontes_iguais = all(a['sha256']==b['sha256'] for a,b in zip(atuais,base['fontes']))
                atual = base['questaoSha256']==fingerprint_questao(q) and base['comentarioSha256']==fingerprint_comentario(c) and fontes_iguais
                estado = 'revisada' if atual else 'revalidar'
            except (KeyError, ValueError):
                estado, motivo = 'revalidar', 'Fonte ou metadados alterados.'
        elif q.get('anulada'):
            estado, motivo = 'pendente-anulada', 'Requer análise da anulação sem eleger gabarito.'
        elif q.get('figuraPendente'):
            estado, motivo = 'pendente-figura-ausente', 'Não concluir sem a figura indispensável.'
        elif q.get('imagens'):
            estado, motivo = 'pendente-inspecao-imagem', 'Abrir imagens antes da revisão.'
        if estado.startswith('pendente') and anotacoes.get(qid, {}).get('pendencia'):
            estado = 'pendente-fonte'
            motivo = anotacoes[qid]['pendencia']
        item = {'tema': tema, 'subtemas': q.get('subtemas', []), 'prova': q.get('prova'), 'ano': q.get('ano'),
                'estado': estado, 'motivo': motivo, 'temComentario': bool(c), 'citacoes': diretas,
                'resumosCandidatos': candidatas, 'questaoSha256': fingerprint_questao(q)}
        if base:
            item['baseResumo'] = base
        if anotacoes.get(qid, {}).get('pendencia'):
            item['pendencia'] = anotacoes[qid]['pendencia']
        saida[qid] = item
    contagem = dict(sorted(Counter(x['estado'] for x in saida.values()).items()))
    return {'versao':1, 'criterio':'Citação direta OU subtema em comum; candidato não significa cobertura bibliográfica suficiente.',
            'estados':contagem, 'resumos':{c['id']:{'titulo':c['titulo'],'sha256':sha(caps[c['id']]),
                'estados':dict(sorted(Counter(x['estado'] for x in saida.values() if c['id'] in x['resumosCandidatos']).items()))} for c in bib},
            'questoes': dict(sorted(saida.items()))}

def gravar_catalogo():
    d = inventario()
    DOC.mkdir(parents=True, exist_ok=True)
    (DOC/'catalogo.json').write_text(json.dumps(d, ensure_ascii=False, indent=1)+'\n')
    linhas = ['# Andamento dos comentários baseados em resumos', '',
              'Gerado por `python3 scripts/comentarios-resumos/catalogo.py atualizar`. Contagens são do escopo desta revisão, não do acervo inteiro.', '',
              '| Estado | Questões |','| --- | ---: |']
    linhas += [f'| {k} | {v} |' for k,v in d['estados'].items()]
    linhas += ['', 'Os capítulos se sobrepõem: não somar as linhas abaixo. Só `revisada` representa leitura e revisão editorial individual com fonte registrada.', '',
               '| Resumo | Revisadas | A revalidar | Pendentes ou preservadas |', '| --- | ---: | ---: | ---: |']
    for cid,c in d['resumos'].items():
        s=c['estados']
        linhas.append(f'| {c["titulo"]} (`{cid}`) | {s.get("revisada",0)} | {s.get("revalidar",0)} | {sum(v for k,v in s.items() if k not in ("revisada","revalidar"))} |')
    linhas += ['', 'Detalhes e pendências por ID: [catalogo.json](catalogo.json). Protocolo: [README.md](README.md).', '']
    (DOC/'ANDAMENTO.md').write_text('\n'.join(linhas))
    print(json.dumps(d['estados'], ensure_ascii=False))

def exportar(a):
    qs, cs, bib, caps, mapa = dados()
    d = inventario()
    fila = [(i,x) for i,x in d['questoes'].items() if x['estado'] in ('pendente','revalidar') and (not a.capitulo or a.capitulo in x['resumosCandidatos'])]
    fila.sort(key=lambda par:(bool(cs.get(par[0])), not bool(par[1]['citacoes']), par[0]))
    itens = [{'id':i,'questao':qs[i][1],'comentarioAtual':cs.get(i),'catalogo':x} for i,x in fila[:a.limite]]
    ids = sorted({c for x in itens for c in x['catalogo']['resumosCandidatos']})
    saida = {'questoes':itens,'fontes':{c:caps[c] for c in ids}}
    a.saida.parent.mkdir(parents=True, exist_ok=True)
    a.saida.write_text(json.dumps(saida, ensure_ascii=False, indent=1)+'\n')
    print(f'{len(itens)} questões exportadas para {a.saida}')

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    sub=ap.add_subparsers(dest='acao',required=True)
    sub.add_parser('atualizar')
    exp=sub.add_parser('exportar'); exp.add_argument('--capitulo'); exp.add_argument('--limite',type=int,default=10); exp.add_argument('--saida',type=Path,required=True)
    a=ap.parse_args()
    if a.acao=='atualizar': gravar_catalogo()
    else: exportar(a)

if __name__=='__main__': main()
