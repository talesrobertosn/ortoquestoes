#!/usr/bin/env python3
"""Conta quanto cada área e cada assunto aparece nas provas oficiais do acervo.

A página "Temas que mais caem" e o Cronograma usam esta contagem, e não uma
lista montada à mão: entram só as questões de prova oficial (TEOT, TARO,
TECOC, ENARE), sem cópias, sem anuladas e sem as questões autorais do site.
Rode de novo sempre que o acervo ou a classificação mudar:

    python3 scripts/gerar_incidencia.py
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIR_TEMAS = RAIZ / "public" / "acervo" / "temas"
TAXONOMIA = RAIZ / "src" / "dados" / "taxonomia.json"
SAIDA = RAIZ / "src" / "dados" / "incidencia.json"

# Quantos assuntos entram na lista dos campeões, somando todas as áreas.
TOP = 20


def conta(questao: dict) -> bool:
    return not questao.get("duplicataDe") and not questao.get("anulada") and not questao.get("simulado")


def nivel_por_posicao(posicao: int, total: int) -> int:
    """Quartis dentro da área: o primeiro quarto é "cai muito" (4), o último "cai pouco" (1)."""
    return 4 - min(3, (posicao * 4) // max(1, total))


def principal() -> int:
    taxonomia = json.loads(TAXONOMIA.read_text(encoding="utf-8"))
    areas = []
    for tema in taxonomia["temas"]:
        arquivo = DIR_TEMAS / f"{tema['slug']}.json"
        if not arquivo.exists():
            continue
        questoes = [q for q in json.loads(arquivo.read_text(encoding="utf-8"))["questoes"] if conta(q)]
        if not questoes:
            continue
        por_assunto = Counter(s for q in questoes for s in dict.fromkeys(q.get("subtemas") or []))
        # Os assuntos "Outros temas de..." ficam no fim, sem disputar o ranking.
        ordenados = sorted(
            (s for s in tema["subtemas"] if por_assunto[s]),
            key=lambda s: (s.startswith("Outros"), -por_assunto[s], s),
        )
        reais = [s for s in ordenados if not s.startswith("Outros")]
        focos = [
            {"nome": s, "nivel": nivel_por_posicao(reais.index(s), len(reais)) if s in reais else 1, "n": por_assunto[s]}
            for s in ordenados
        ]
        areas.append({"id": tema["slug"], "nome": tema["nome"], "slug": tema["slug"], "n": len(questoes), "focos": focos})

    areas.sort(key=lambda a: -a["n"])
    maior = areas[0]["n"]
    total = sum(a["n"] for a in areas)
    for area in areas:
        area["peso"] = max(1, round(10 * area["n"] / maior))
        area["pct"] = round(100 * area["n"] / total, 1)

    campeoes = sorted(
        ({"area": a["id"], "nome": f["nome"], "n": f["n"]} for a in areas for f in a["focos"] if not f["nome"].startswith("Outros")),
        key=lambda t: -t["n"],
    )[:TOP]

    SAIDA.write_text(
        json.dumps({"geradoEm": date.today().isoformat(), "base": total, "areas": areas, "top": campeoes}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{SAIDA.relative_to(RAIZ)}: {len(areas)} áreas, {total} questões de prova contadas")
    for i, area in enumerate(areas, 1):
        print(f"  {i:2}. {area['nome']:<34} {area['n']:4}  ({area['pct']}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
