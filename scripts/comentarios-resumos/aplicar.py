#!/usr/bin/env python3
"""Aplica lote revisado individualmente, com fonte e proteção contra concorrência.

flock /tmp/claude-0/acervo.lock -c 'python3 scripts/comentarios-resumos/aplicar.py lote.json [--conferir]'
"""
import argparse
import copy
import datetime
import json
import sys
from pathlib import Path
from catalogo import RAIZ, dados, fonte, sha, fingerprint_questao, fingerprint_comentario, gravar_catalogo
sys.path.insert(0, str(RAIZ / 'scripts'))
from aplicar_comentarios import conferir


def preparar(lote, qs, cs, caps):
    novos = {}
    for qid, item in lote.items():
        if qid not in qs:
            raise ValueError(f'{qid}: questão inexistente')
        tema, q = qs[qid]
        anterior = cs.get(qid, {})
        if q.get('duplicataDe') or anterior.get('conferido'):
            raise ValueError(f'{qid}: duplicata ou revisão médica protegida')
        if item.get('questaoSha256') != fingerprint_questao(q) or item.get('comentarioAnteriorSha256') != sha(anterior):
            raise ValueError(f'{qid}: questão ou comentário mudou desde a leitura; revisar antes de aplicar')
        if q.get('figuraPendente'):
            raise ValueError(f'{qid}: figura indispensável ausente')
        if set(item.get('imagensConferidas', [])) != {x['arquivo'] for x in q.get('imagens', [])}:
            raise ValueError(f'{qid}: imagens precisam de inspeção individual registrada')
        raiz_imagens = (RAIZ / 'public/imagens').resolve()
        for img in q.get('imagens', []):
            caminho_imagem = (raiz_imagens / img['arquivo']).resolve()
            if not caminho_imagem.is_relative_to(raiz_imagens) or not caminho_imagem.is_file():
                raise ValueError(f'{qid}: arquivo da imagem ausente ou inválido')
        c = copy.deepcopy(item['comentario'])
        c.pop('baseResumo', None)
        if c.get('conferido'):
            raise ValueError(f'{qid}: este fluxo não atribui revisão médica')
        fontes = item.get('fontes', [])
        if not fontes:
            raise ValueError(f'{qid}: falta fonte')
        for f in fontes:
            atual = fonte(f['resumo'], f['blocos'], caps)
            if atual != f:
                raise ValueError(f'{qid}: fonte mudou ou metadados incorretos')
        if not c.get('conceito','').strip() or not c.get('referencias'):
            raise ValueError(f'{qid}: falta aula ou referência')
        letras = {a['letra'] for a in q.get('alternativas', [])}
        if q.get('tipo') != 'dissertativa':
            resposta = q.get('gabarito') or q.get('gabaritoBibliografia') or c.get('provavel')
            esperadas = letras if q.get('anulada') else letras - {resposta}
            if set(c.get('incorretas', {})) != esperadas:
                raise ValueError(f'{qid}: é preciso analisar cada alternativa')
        if anterior.get('alerta') and not c.get('alerta') and not item.get('justificativaRemocaoAlerta','').strip():
            raise ValueError(f'{qid}: explicar a retirada do alerta anterior')
        erros = conferir(qid, c, q)
        if erros:
            raise ValueError('\n'.join(erros))
        c['conferido'] = False
        c['geradoEm'] = datetime.date.today().isoformat()
        c['baseResumo'] = {'tipo':'resumo', 'versao':1, 'fontes':fontes,
                           'questaoSha256':fingerprint_questao(q),
                           'comentarioSha256':fingerprint_comentario(c)}
        novos.setdefault(tema, {})[qid] = c
    return novos


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('lote',type=Path); ap.add_argument('--conferir',action='store_true')
    a=ap.parse_args()
    qs,cs,bib,caps,mapa=dados()
    try:
        novos=preparar(json.loads(a.lote.read_text()),qs,cs,caps)
    except (ValueError,KeyError) as e:
        print(str(e),file=sys.stderr); return 1
    if not a.conferir:
        for tema,comentarios in novos.items():
            p=RAIZ/f'public/acervo/comentarios/{tema}.json'
            atual=json.loads(p.read_text()) if p.exists() else {}
            atual.update(comentarios)
            p.write_text(json.dumps(dict(sorted(atual.items())),ensure_ascii=False,indent=1)+'\n')
        gravar_catalogo()
    print(f'{sum(map(len,novos.values()))} comentários ' + ('validados; nada gravado.' if a.conferir else 'aplicados.'))
    return 0

if __name__=='__main__': raise SystemExit(main())
