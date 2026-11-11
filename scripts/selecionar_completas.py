#!/usr/bin/env python3
"""
Escolhe as questões com imagem que ganham o comentário inteiro, aberto, na
página pública (gerar_paginas_seo.py) e grava scripts/seo_questoes_completas.json.

Critério (teste do Tales, 11/11/2026, 50 questões): só questão oficial (nada de
OrtoQuestões Simulados), com imagem, comentário sem alerta de gabarito, não
anulada; primeiro TEOT e TARO (as provas que mais trazem gente pela busca), das
edições mais novas, com o comentário mais completo; repartidas entre as áreas.
A lista fica fixa no arquivo para as páginas não mudarem a cada deploy.

    python3 scripts/selecionar_completas.py [--total 50]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import DIR_ACERVO, DIR_TEMAS, carregar_taxonomia, ler_json  # noqa: E402

SAIDA = Path(__file__).resolve().parent / "seo_questoes_completas.json"
PROVAS_PRIMEIRO = {"TEOT": 0, "TARO": 0}


def candidatas() -> dict[str, list[tuple]]:
    por_area: dict[str, list[tuple]] = {}
    for tema in carregar_taxonomia()["temas"]:
        dados = ler_json(DIR_TEMAS / f"{tema['slug']}.json", None)
        comentarios = ler_json(DIR_ACERVO / "comentarios" / f"{tema['slug']}.json", {}) or {}
        if not dados:
            continue
        for q in dados["questoes"]:
            c = comentarios.get(q["id"])
            if (not c or not q.get("imagens") or q.get("simulado") or q.get("anulada") or q.get("figuraPendente")
                    or q.get("duplicataDe") or c.get("alerta") or not q.get("gabarito") or not q.get("prova")):
                continue
            tamanho = len(c.get("conceito") or "") + len(c.get("correta") or "") + sum(len(t) for t in (c.get("incorretas") or {}).values())
            if tamanho < 2500 or len(c.get("incorretas") or {}) < 3:
                continue
            chave = (PROVAS_PRIMEIRO.get(q["prova"], 1), -(q.get("ano") or 0), -tamanho)
            por_area.setdefault(tema["slug"], []).append((chave, q["id"]))
    for lista in por_area.values():
        lista.sort()
    return por_area


def principal() -> int:
    argumentos = argparse.ArgumentParser()
    argumentos.add_argument("--total", type=int, default=50)
    total = argumentos.parse_args().total
    por_area = candidatas()
    escolhidas: list[str] = []
    # Rodízio entre as áreas: uma de cada por vez, até completar.
    rodada = 0
    while len(escolhidas) < total and any(len(l) > rodada for l in por_area.values()):
        for area in sorted(por_area):
            if len(escolhidas) < total and len(por_area[area]) > rodada:
                escolhidas.append(por_area[area][rodada][1])
        rodada += 1
    SAIDA.write_text(json.dumps({"criterio": "oficial, com imagem, sem alerta, TEOT/TARO e edições novas primeiro, rodízio entre áreas",
                                 "ids": sorted(escolhidas)}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(escolhidas)} questões em {SAIDA.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
