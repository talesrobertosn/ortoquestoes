#!/usr/bin/env python3
"""Monta um lote aplicável a partir de um rascunho escrito à mão (27/10/2026).

O rascunho traz, por questão, o comentário novo e os blocos do resumo que foram lidos:
    {"ombro-cotovelo-0490": {"resumo": "rockwood10-40-cotovelo-cabeca-radio",
                              "blocos": ["fratura-da-cabeca-do-radio-fe207e21", ...],
                              "imagensConferidas": [], "comentario": {...}}}
O script só calcula os metadados (hash da questão e do comentário anterior, fonte com hashes dos
trechos) a partir do estado atual dos arquivos; não escreve nem corrige texto. A referência padrão
("Conteúdo consultado no resumo …") é acrescentada quando o comentário não traz `referencias`.

    python3 scripts/comentarios-resumos/montar.py rascunho.json docs/comentarios-resumos/lotes/NNN-tema.json
"""
import argparse
import json
from pathlib import Path

from catalogo import dados, fingerprint_questao, fonte, sha


def referencia(f: dict) -> str:
    return (f'Conteúdo consultado no resumo “{f["titulo"]}”, Biblioteca do OrtoQuestões, baseado em {f["livro"]}, '
            f'{f["edicao"]}, {f["capitulo"]}. Seções: {"; ".join(f["secoes"])}.')


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('rascunho', type=Path)
    ap.add_argument('saida', type=Path)
    a = ap.parse_args()
    qs, cs, _bib, caps, _mapa = dados()
    rascunho = json.loads(a.rascunho.read_text(encoding='utf-8'))
    lote = {}
    for qid, item in rascunho.items():
        _tema, q = qs[qid]
        fontes = [fonte(r['resumo'], r['blocos'], caps) for r in item.get('fontes') or [{'resumo': item['resumo'], 'blocos': item['blocos']}]]
        comentario = dict(item['comentario'])
        comentario.setdefault('referencias', [referencia(f) for f in fontes])
        comentario.setdefault('conferido', False)
        saida = {'questaoSha256': fingerprint_questao(q), 'comentarioAnteriorSha256': sha(cs.get(qid, {})),
                 'comentario': comentario, 'fontes': fontes, 'imagensConferidas': item.get('imagensConferidas', [])}
        if item.get('justificativaRemocaoAlerta'):
            saida['justificativaRemocaoAlerta'] = item['justificativaRemocaoAlerta']
        lote[qid] = saida
    a.saida.write_text(json.dumps(lote, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(lote)} questões em {a.saida}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
