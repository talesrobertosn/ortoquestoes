#!/usr/bin/env python3
"""Mede se resumos e comentários estão no padrão de profundidade do site.

Padrão (docs/biblioteca/PILOTO-AUTOMATICO.md e Tales, 30/10/2026):
  - resumo: no mínimo o nível dos modelos rockwood10-53 e rockwood10-66 (45 KB); o roteiro sugere 60 a 90 KB;
  - comentário: miniaula de tamanho proporcional à questão (Tales, 31/10/2026). Piso de 800 caracteres só contra o
    comentário raso; fato seco pede 0,8 a 2 mil, mecanismo 3 a 5 mil, caso clínico e questão-chave 4 a 8 mil.

Uso:
  python3 scripts/biblioteca/medir_profundidade.py resumo <id> [<id> ...]
  python3 scripts/biblioteca/medir_profundidade.py comentarios <id-de-questão> [...]
  python3 scripts/biblioteca/medir_profundidade.py faixa <tema> <primeiro-id> <ultimo-id>
"""
import json
import statistics
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
MIN_RESUMO = 45_000  # o modelo rockwood10-53 tem ~48 KB; o roteiro sugere 60 a 90 KB
MIN_COMENTARIO = 800  # piso contra o raso; o tamanho certo depende da questão (docs/padrao-editorial-comentarios.md)


def tamanho_comentario(c: dict) -> int:
    inc = c.get("incorretas") or {}
    return len(c.get("conceito", "")) + len(c.get("correta", "")) + sum(len(v) for v in inc.values())


def comentarios(ids: list[str]) -> None:
    por_tema: dict[str, list[str]] = {}
    for i in ids:
        por_tema.setdefault(i.rsplit("-", 1)[0], []).append(i)
    tamanhos = []
    for tema, lista in por_tema.items():
        dados = json.loads((RAIZ / f"public/acervo/comentarios/{tema}.json").read_text(encoding="utf-8"))
        dados = dados.get("comentarios", dados)
        for i in lista:
            n = tamanho_comentario(dados[i]) if i in dados else 0
            tamanhos.append(n)
            print(f"{'OK  ' if n >= MIN_COMENTARIO else 'CURTO'} {n:6d}  {i}")
    if tamanhos:
        print(f"mediana {statistics.median(tamanhos):.0f} (piso {MIN_COMENTARIO}; tamanho proporcional à questão)")


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    modo, args = sys.argv[1], sys.argv[2:]
    if modo == "resumo":
        for i in args:
            n = len((RAIZ / f"conteudo/biblioteca/{i}.md").read_text(encoding="utf-8"))
            print(f"{'OK  ' if n >= MIN_RESUMO else 'CURTO'} {n:7d}  {i}")
    elif modo == "comentarios":
        comentarios(args)
    elif modo == "faixa":
        tema, a, b = args
        ini, fim = int(a.rsplit("-", 1)[1]), int(b.rsplit("-", 1)[1])
        comentarios([f"{tema}-{n:04d}" for n in range(ini, fim + 1)])
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
