#!/usr/bin/env python3
"""Registra lacunas de fonte (`pendencia`) no catálogo a partir de um JSON {id: texto} (27/10/2026).

Cada texto diz o que falta no resumo para sustentar a resposta. O item passa a `pendente-fonte`
na próxima atualização; não grava nada em questões já revisadas.

    python3 scripts/comentarios-resumos/pendencias.py lacunas.json
"""
import json
import sys
from pathlib import Path

from catalogo import DOC, gravar_catalogo


def main() -> int:
    lacunas = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    cat = json.loads((DOC/'catalogo.json').read_text(encoding='utf-8'))
    for qid, texto in lacunas.items():
        item = cat['questoes'][qid]
        if item['estado'] == 'revisada':
            raise SystemExit(f'{qid} já está revisada; não registrar lacuna por cima')
        item['pendencia'] = texto
    (DOC/'catalogo.json').write_text(json.dumps(cat, ensure_ascii=False, indent=1)+'\n')
    gravar_catalogo()
    print(f'{len(lacunas)} lacunas registradas')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
