#!/usr/bin/env python3
"""Cobertura do convite "Leia o resumo" no fim das questões (pedido do Tales, 19/10/2026).

O convite aparece quando a questão é citada num resumo (public/biblioteca/questoes.json) ou quando um
subtema dela está na linha `subtemas:` de um resumo. Este script mostra, para cada resumo, os subtemas
que ficaram de fora da linha `subtemas:` mas que o próprio resumo já cobre de verdade: pelo menos 30% das
questões daquele subtema (e no mínimo 3) estão citadas nele. Acrescentar esses subtemas na linha
`subtemas:` faz o convite aparecer também nas questões irmãs que o resumo não cita.

Uso (depois de `node scripts/biblioteca/gerar.mjs`):
    python3 scripts/biblioteca/cobertura.py            # relatório
    python3 scripts/biblioteca/cobertura.py --minimo 0.3 --citadas 3
"""
import argparse
import collections
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--minimo', type=float, default=0.3, help='parte mínima das questões do subtema citadas no resumo')
    ap.add_argument('--citadas', type=int, default=3, help='número mínimo de questões citadas do subtema')
    a = ap.parse_args()

    ix = json.loads((RAIZ / 'public/acervo/indice.json').read_text())
    bib = json.loads((RAIZ / 'public/biblioteca/indice.json').read_text())
    por_questao = json.loads((RAIZ / 'public/biblioteca/questoes.json').read_text())
    nomes = ix['subtemas']
    questoes = [q for q in ix['questoes'] if not q.get('dup')]
    total_sub = collections.Counter(s for q in questoes for s in q.get('s', []))
    sub_de = {q['id']: q.get('s', []) for q in questoes}

    cobertos = set()
    for c in bib['capitulos']:
        cobertos |= set(c.get('subtemas') or [])
    com_convite = sum(1 for q in questoes if q['id'] in por_questao or any(nomes[s] in cobertos for s in q.get('s', [])))
    print(f'Questões com convite para um resumo: {com_convite} (citadas diretamente: {sum(1 for q in questoes if q["id"] in por_questao)})\n')

    sugestoes = 0
    for c in bib['capitulos']:
        tem = set(c.get('subtemas') or [])
        citadas = [i for i, lista in por_questao.items() if any(d['c'] == c['id'] and d['p'] != 'treino' for d in lista)]
        conta = collections.Counter(s for i in citadas for s in sub_de.get(i, []))
        faltam = [(nomes[s], n, total_sub[s]) for s, n in conta.most_common()
                  if nomes[s] not in tem and n >= a.citadas and n / max(1, total_sub[s]) >= a.minimo]
        if faltam:
            sugestoes += len(faltam)
            print(f'{c["id"]}  (subtemas: {"; ".join(sorted(tem)) or "nenhum"})')
            for nome, n, t in faltam:
                print(f'    + {nome}  ({n} de {t} questões já citadas neste resumo)')
    print(f'\n{sugestoes} subtema(s) para acrescentar na linha `subtemas:` dos resumos.' if sugestoes else 'Nada a acrescentar: a linha `subtemas:` de todos os resumos já cobre os subtemas que eles ensinam.')


if __name__ == '__main__':
    main()
