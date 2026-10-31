#!/usr/bin/env python3
"""Fila da refação pelos temas que mais caem no TEOT e no TARO (Tales, 31/10/2026).

Pedido do Tales: "foco principal nas questões do TEOT e TARO, depois o resto", e só parar quando os temas que mais
caem estiverem 100% feitos. Este script mede isso a partir do acervo, sem depender de memória:

  - tema que mais cai = subtema com pelo menos MIN_QUESTOES questões do TEOT ou do TARO;
  - questão refeita = comentário com geradoEm a partir de 2026-10-30 (início da refação, no jeito novo);
  - resumo pronto = algum resumo da biblioteca com o subtema no cabeçalho e pelo menos 45 KB;
  - subtema feito = resumo pronto e nenhuma questão TEOT/TARO pendente.

Uso:
  python3 scripts/biblioteca/fila_teot_taro.py              # fila completa, na ordem de trabalho
  python3 scripts/biblioteca/fila_teot_taro.py --proximo    # só o próximo subtema e as questões pendentes
  python3 scripts/biblioteca/fila_teot_taro.py --resumo     # números para o relatório
"""
from __future__ import annotations

import argparse
import glob
import json
import re
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
MIN_QUESTOES = 15
INICIO_REFACAO = "2026-10-30"
MIN_RESUMO = 45_000
PROVAS = ("TEOT", "TARO")


def carregar():
    com = {}
    for p in glob.glob(str(RAIZ / "public/acervo/comentarios/*.json")):
        d = json.loads(Path(p).read_text(encoding="utf-8"))
        com.update(d.get("comentarios", d))
    resumos = defaultdict(list)
    for md in glob.glob(str(RAIZ / "conteudo/biblioteca/*.md")):
        t = Path(md).read_text(encoding="utf-8")
        m = re.search(r"^subtemas: (.*)$", t, re.M)
        for s in (m.group(1).split(";") if m else []):
            resumos[s.strip()].append((Path(md).stem, len(t)))
    subtemas = defaultdict(list)
    for p in glob.glob(str(RAIZ / "public/acervo/temas/*.json")):
        for q in json.loads(Path(p).read_text(encoding="utf-8"))["questoes"]:
            if q.get("prova") in PROVAS:
                for s in q.get("subtemas") or ["(sem subtema)"]:
                    subtemas[s].append(q)
    return com, resumos, subtemas


def fila():
    com, resumos, subtemas = carregar()
    linhas = []
    for s, qs in subtemas.items():
        if len(qs) < MIN_QUESTOES:
            continue
        pend = [q["id"] for q in qs if (com.get(q["id"], {}).get("geradoEm") or "") < INICIO_REFACAO]
        rs = resumos.get(s, [])
        pronto = any(n >= MIN_RESUMO for _, n in rs)
        linhas.append({"subtema": s, "tema": qs[0]["id"].rsplit("-", 1)[0], "questoes": len(qs),
                       "pendentes": pend, "resumos": rs, "resumoPronto": pronto,
                       "feito": pronto and not pend})
    # Ordem de trabalho: mais questões pendentes primeiro; empate pelo total.
    linhas.sort(key=lambda x: (x["feito"], -len(x["pendentes"]), -x["questoes"]))
    return linhas


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--proximo", action="store_true")
    ap.add_argument("--resumo", action="store_true")
    a = ap.parse_args()
    linhas = fila()
    if a.resumo:
        feitos = [x for x in linhas if x["feito"]]
        total = sum(x["questoes"] for x in linhas)
        pend = sum(len(x["pendentes"]) for x in linhas)
        print(f"temas que mais caem (>= {MIN_QUESTOES} questões TEOT/TARO): {len(linhas)}")
        print(f"feitos: {len(feitos)} de {len(linhas)}; questões TEOT/TARO refeitas: {total - pend} de {total}")
        return 0
    if a.proximo:
        x = next((x for x in linhas if not x["feito"]), None)
        if not x:
            print("FILA CONCLUÍDA: todos os temas que mais caem estão feitos.")
            return 0
        rs = ", ".join(f"{r} ({n // 1000} KB)" for r, n in x["resumos"]) or "sem resumo: criar um"
        print(f"{x['subtema']} [{x['tema']}] {x['questoes']} questões, {len(x['pendentes'])} pendentes; resumo: {rs}")
        print(" ".join(x["pendentes"]))
        return 0
    for x in linhas:
        rs = ", ".join(f"{r}({n // 1000}k)" for r, n in x["resumos"]) or "SEM RESUMO"
        st = "FEITO" if x["feito"] else f"{len(x['pendentes']):3d} pend."
        print(f"{st:10s} {x['questoes']:3d}  {x['tema']:18s} {x['subtema'][:48]:48s} {rs[:80]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
