"""Reclassifica os subtemas de um tema a partir de uma especificação (regras + correções à mão).

Uso:
  python3 scripts/subtemas/reclassificar.py <tema> --ver            # mostra a proposta agrupada por subtema
  python3 scripts/subtemas/reclassificar.py <tema> --aplicar        # grava nas questões e na taxonomia

A especificação fica em scripts/subtemas/<tema>.py com:
  SUBTEMAS = [(nome, regex_ou_None), ...]   # ordem = prioridade no empate; regex sobre texto sem acento
  CORRECOES = {"0123": ["Subtema A", "Subtema B"], ...}   # sufixo do id -> subtemas finais (manda sobre a regra)
  RESTO = "Outros temas de ..."             # quando nenhuma regra casa

Pontuação de cada subtema: 3 se o regex casa no enunciado, 2 na alternativa correta, 1 nas outras
alternativas. Entra o melhor; o segundo entra junto se tiver pelo menos 3 pontos e 2/3 do melhor.
Questões que só caem no RESTO aparecem na revisão para correção à mão.
"""
import argparse
import importlib.util
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]

ap = argparse.ArgumentParser()
ap.add_argument("tema")
ap.add_argument("--ver", action="store_true")
ap.add_argument("--aplicar", action="store_true")
ap.add_argument("--so", default="", help="na revisão, mostrar só estes subtemas (separados por |)")
a = ap.parse_args()


def normalizar(t):
    return unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()


sp = importlib.util.spec_from_file_location("spec", RAIZ / "scripts" / "subtemas" / f"{a.tema}.py")
spec = importlib.util.module_from_spec(sp)
sp.loader.exec_module(spec)
regras = [(n, re.compile(r) if r else None) for n, r in spec.SUBTEMAS]
nomes = [n for n, _ in spec.SUBTEMAS]
for i, lst in spec.CORRECOES.items():
    for n in lst:
        if n not in nomes and n != spec.RESTO:
            sys.exit(f"correção {i}: subtema desconhecido '{n}'")

arq = RAIZ / "public" / "acervo" / "temas" / f"{a.tema}.json"
bruto = arq.read_text(encoding="utf-8")
dados = json.loads(bruto)
prefixo = a.tema + "-"


def classificar(q):
    suf = q["id"][len(prefixo):]
    if suf in spec.CORRECOES:
        return list(spec.CORRECOES[suf]), "manual"
    enun = normalizar(q["enunciado"])
    cert = normalizar(next((x["texto"] for x in q["alternativas"] if x["letra"] == q.get("gabarito")), ""))
    outras = normalizar(" ".join(x["texto"] for x in q["alternativas"] if x["letra"] != q.get("gabarito")))
    pontos = []
    for i, (n, r) in enumerate(regras):
        if not r:
            continue
        p = 3 * bool(r.search(enun)) + 2 * bool(r.search(cert)) + 1 * bool(r.search(outras))
        if p:
            pontos.append((p, -i, n))
    pontos.sort(reverse=True)
    if not pontos:
        return [spec.RESTO], "resto"
    sel = [pontos[0][2]]
    if len(pontos) > 1 and pontos[1][0] >= 3 and pontos[1][0] * 3 >= pontos[0][0] * 2:
        sel.append(pontos[1][2])
    return sel, "regra"


novas = {}
for q in dados["questoes"]:
    novas[q["id"]] = classificar(q)

if a.ver:
    grupos = defaultdict(list)
    for q in dados["questoes"]:
        sel, como = novas[q["id"]]
        for n in sel:
            grupos[n].append((q, como, sel))
    so = set(filter(None, a.so.split("|")))
    for n in nomes + [spec.RESTO]:
        if so and n not in so:
            continue
        lst = grupos.get(n, [])
        print(f"\n=== {n} ({len(lst)})")
        for q, como, sel in lst:
            cert = next((x["texto"] for x in q["alternativas"] if x["letra"] == q.get("gabarito")), "")
            outro = " +" + "+".join(s for s in sel if s != n) if len(sel) > 1 else ""
            marca = "*" if como == "manual" else ("?" if como == "resto" else " ")
            print(f"{marca}{q['id'][len(prefixo):]} {q['enunciado'][:95]} => {cert[:35]}{outro}".replace("\n", " "))
    c = Counter(n for sel, _ in novas.values() for n in sel)
    print("\nVazios:", [n for n in nomes if not c[n]])

if a.aplicar:
    for q in dados["questoes"]:
        q["subtemas"] = novas[q["id"]][0]
    indent = 2 if bruto.startswith("{\n  ") else 1
    arq.write_text(json.dumps(dados, ensure_ascii=False, indent=indent) + ("\n" if bruto.endswith("\n") else ""), encoding="utf-8")
    tax_arq = RAIZ / "src" / "dados" / "taxonomia.json"
    tax_bruto = tax_arq.read_text(encoding="utf-8")
    tax = json.loads(tax_bruto)
    usados = Counter(n for sel, _ in novas.values() for n in sel)
    for t in tax["temas"]:
        if t["slug"] == a.tema:
            t["subtemas"] = [n for n in nomes if usados[n]] + ([spec.RESTO] if usados[spec.RESTO] else [])
    indent = 2 if tax_bruto.startswith("{\n  ") else 1
    tax_arq.write_text(json.dumps(tax, ensure_ascii=False, indent=indent) + ("\n" if tax_bruto.endswith("\n") else ""), encoding="utf-8")
    print(f"{len(novas)} questões reclassificadas em {len([n for n in usados if usados[n]])} subtemas.")
