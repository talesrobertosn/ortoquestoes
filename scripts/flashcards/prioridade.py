#!/usr/bin/env python3
"""Prioridade de produção de flashcards (27/10/2026): o que mais cai e menos tem flashcard vem primeiro.

Para cada assunto da taxonomia, junta:
  - n: questões de prova oficial (src/dados/incidencia.json, a mesma conta de "Temas que mais caem");
  - cartas: flashcards publicados com esse assunto (principal ou secundário);
  - fontes: questões com comentário nesse assunto (de prova ou dos OrtoQuestões Simulados) e quantas
    delas ainda não deram nenhum flashcard (as lacunas que os autorais podem cobrir).

Pontuação (recalculável, roda de novo sempre que o acervo ou os flashcards mudarem):
    alvo     = max(10, 3 × n)                  quantos flashcards o assunto mereceria pela incidência
    deficit  = max(0, alvo − cartas) / alvo    de 0 (coberto) a 1 (nada)
    lacuna   = questões sem flashcard / questões com comentário
    pontos   = n × (0,2 + 0,55 × deficit + 0,25 × lacuna)
Assim um assunto muito cobrado com poucos flashcards passa à frente de um pouco cobrado já cheio.
Os assuntos "Outros..." (gaveta de questões variadas, sem um conceito central) valem 0,6 × os pontos:
rendem flashcards soltos, e a importância clínica e a organização da Biblioteca pedem os assuntos nomeados primeiro.

    python3 scripts/flashcards/prioridade.py            # tabela dos 30 primeiros
    python3 scripts/flashcards/prioridade.py --todos    # todos
Grava scripts/flashcards/prioridade.json (o registro de lotes fica em expansao.json).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fabrica as F  # noqa: E402

SAIDA = Path(__file__).resolve().parent / "prioridade.json"
REGISTRO = Path(__file__).resolve().parent / "expansao.json"


def calcular() -> list[dict]:
    inc = F.ler_json(F.INCIDENCIA, {"areas": []})
    _, questoes, comentarios = F.carregar_acervo()
    publicados = F.ler_publicados(com_autorais=True)
    cartas_por: dict[tuple[str, str], int] = {}
    questoes_com_carta: set[str] = set()
    for area, cartas in publicados.items():
        for c in cartas:
            questoes_com_carta.add(c["questao"])
            for s in {c["assunto"], *(c.get("subtemas") or [])}:
                cartas_por[(area, s)] = cartas_por.get((area, s), 0) + 1
    fontes: dict[tuple[str, str], list[str]] = {}
    for q in questoes.values():
        if q.get("anulada") or q.get("duplicataDe") or q["id"] not in comentarios:
            continue
        for s in q.get("subtemas") or []:
            fontes.setdefault((q["_area"], s), []).append(q["id"])
    concluidos = {(t["area"], t["assunto"]) for t in F.ler_json(REGISTRO, {"temas": []}).get("temas", [])}
    linhas = []
    for a in inc["areas"]:
        for foco in a["focos"]:
            chave = (a["slug"], foco["nome"])
            n, cartas = foco["n"], cartas_por.get(chave, 0)
            qs = fontes.get(chave, [])
            sem = [q for q in qs if q not in questoes_com_carta]
            alvo = max(10, 3 * n)
            deficit = max(0, alvo - cartas) / alvo
            lacuna = len(sem) / len(qs) if qs else 0
            linhas.append({
                "area": a["slug"], "assunto": foco["nome"], "nivel": foco["nivel"], "n": n,
                "cartas": cartas, "alvo": alvo, "questoes": len(qs), "semFlashcard": len(sem),
                "pontos": round(n * (0.2 + 0.55 * deficit + 0.25 * lacuna) * (0.6 if foco["nome"].startswith("Outr") else 1), 2),
                "concluido": chave in concluidos,
            })
    linhas.sort(key=lambda x: (-x["pontos"], -x["n"], x["assunto"]))
    return linhas


def principal() -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--todos", action="store_true")
    args = p.parse_args()
    linhas = calcular()
    F.gravar_json(SAIDA, {"assuntos": linhas})
    print(f"{'#':>3} {'pontos':>7} {'n':>4} {'cartas':>6} {'alvo':>5} {'sem fc':>6}  assunto")
    for i, l in enumerate(linhas if args.todos else linhas[:30], 1):
        marca = " (lote feito)" if l["concluido"] else ""
        print(f"{i:>3} {l['pontos']:>7} {l['n']:>4} {l['cartas']:>6} {l['alvo']:>5} {l['semFlashcard']:>6}  {l['area']} · {l['assunto']}{marca}")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
