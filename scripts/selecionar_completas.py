#!/usr/bin/env python3
"""
Escolhe as questões com imagem que ganham o comentário inteiro, aberto, na
página pública (gerar_paginas_seo.py) e grava scripts/seo_questoes_completas.json.

Critério (teste do Tales, 11/11/2026, 50 questões): só questão oficial (nada de
OrtoQuestões Simulados), com imagem, comentário sem alerta de gabarito, não
anulada; primeiro TEOT e TARO (as provas que mais trazem gente pela busca), das
edições mais novas, com o comentário mais completo; repartidas entre as áreas.
A lista fica fixa no arquivo para as páginas não mudarem a cada deploy.

Provas anteriores (Tales, 11/11/2026: "só umas 20 de cada, senão perde sentido
a pessoa pagar a assinatura"): cada edição (/provas-anteriores/taro-2026/ ...)
mostra no máximo 20 questões completas, com o comentário, e não mais a prova
inteira com o gabarito. As 20 de cada edição ficam em "por_edicao" e também
entram em "ids" (a página própria delas mostra o comentário inteiro). Escolha:
questões válidas, com comentário sem alerta, uma de cada assunto por vez, com
imagem e comentário mais completo primeiro.

    python3 scripts/selecionar_completas.py [--total 50] [--por-edicao 20]
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


def por_edicao(limite: int) -> dict[str, list[str]]:
    """As questões abertas de cada edição de /provas-anteriores/, pela mesma divisão em edições das páginas."""
    import gerar_paginas_destino as d
    from gerar_provas_anteriores import edicoes, slug

    comentarios: dict[str, dict] = {}
    for arquivo in (DIR_ACERVO / "comentarios").glob("*.json"):
        comentarios.update(ler_json(arquivo, {}) or {})
    saida: dict[str, list[str]] = {}
    for (prova, ano), qs in sorted(edicoes(d.carregar_dados()).items()):
        por_tema: dict[str, list[tuple]] = {}
        for q in qs:
            c = comentarios.get(q["id"])
            if (not c or q.get("anulada") or q.get("figuraPendente") or c.get("alerta") or not q.get("gabarito")
                    or len(c.get("incorretas") or {}) < 2):
                continue
            tamanho = len(c.get("conceito") or "") + len(c.get("correta") or "") + sum(len(t) for t in (c.get("incorretas") or {}).values())
            por_tema.setdefault(q["tema_nome"], []).append(((0 if q.get("imagens") else 1), -tamanho, q["id"]))
        for lista in por_tema.values():
            lista.sort()
        escolhidas: list[str] = []
        rodada = 0
        # Os assuntos que mais caíram primeiro em cada rodada, para as 20 terem a cara da prova.
        ordem = sorted(por_tema, key=lambda t: (-len(por_tema[t]), t))
        while len(escolhidas) < limite and any(len(por_tema[t]) > rodada for t in ordem):
            for tema in ordem:
                if len(escolhidas) < limite and len(por_tema[tema]) > rodada:
                    escolhidas.append(por_tema[tema][rodada][2])
            rodada += 1
        if escolhidas:
            saida[slug(prova, ano)] = escolhidas
    return saida


def principal() -> int:
    argumentos = argparse.ArgumentParser()
    argumentos.add_argument("--total", type=int, default=50)
    argumentos.add_argument("--por-edicao", type=int, default=20)
    opcoes = argumentos.parse_args()
    total = opcoes.total
    por_area = candidatas()
    escolhidas: list[str] = []
    # Rodízio entre as áreas: uma de cada por vez, até completar.
    rodada = 0
    while len(escolhidas) < total and any(len(l) > rodada for l in por_area.values()):
        for area in sorted(por_area):
            if len(escolhidas) < total and len(por_area[area]) > rodada:
                escolhidas.append(por_area[area][rodada][1])
        rodada += 1
    edicoes = por_edicao(opcoes.por_edicao)
    todas = sorted(set(escolhidas) | {i for ids in edicoes.values() for i in ids})
    SAIDA.write_text(json.dumps({"criterio": "oficial, com imagem, sem alerta, TEOT/TARO e edições novas primeiro, rodízio entre áreas",
                                 "com_imagem": sorted(escolhidas),
                                 "criterio_edicoes": f"até {opcoes.por_edicao} por edição, válidas, comentário sem alerta, rodízio entre assuntos",
                                 "por_edicao": edicoes,
                                 "ids": todas}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(escolhidas)} com imagem + {sum(map(len, edicoes.values()))} em {len(edicoes)} edições = {len(todas)} questões em {SAIDA.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
