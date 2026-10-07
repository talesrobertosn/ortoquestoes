"""Lista as questões oficiais do acervo sobre um assunto (passo 0 do fluxo de simulados).

Uso:
  python3 scripts/simulados/mapear_banca.py --regex 'acromioclavic|esternoclavic' \
      --subtema 'Luxação acromioclavicular' [--todas-as-provas] > oficiais.txt

Por padrão só TEOT e TARO (as provas que os simulados imitam); --todas-as-provas inclui CET-PR,
ENARE, TECOC e outras. Casa o regex no enunciado e nas alternativas ou o subtema (parcial, sem
diferenciar maiúsculas). No fim, informa quantos OrtoQuestões Simulados já existem nesses
subtemas, para evitar repetir o mesmo fato.
"""
import argparse
import glob
import json
import re
import sys

ap = argparse.ArgumentParser()
ap.add_argument("--regex", default="")
ap.add_argument("--subtema", action="append", default=[])
ap.add_argument("--todas-as-provas", action="store_true")
a = ap.parse_args()
padrao = re.compile(a.regex, re.I) if a.regex else None
subs = [s.lower() for s in a.subtema]

oficiais, simulados = [], []
for arq in sorted(glob.glob("public/acervo/temas/*.json")):
    for q in json.load(open(arq))["questoes"]:
        texto = q["enunciado"] + " " + " ".join(x["texto"] for x in q["alternativas"])
        sq = " ".join(q.get("subtemas") or []).lower()
        casa = (padrao and padrao.search(texto)) or any(s in sq for s in subs)
        if not casa:
            continue
        if q.get("simulado"):
            simulados.append(q)
        elif q.get("prova") and (a.todas_as_provas or re.search(r"TEOT|TARO", q["prova"])):
            oficiais.append(q)

oficiais.sort(key=lambda q: (q.get("ano") or 0), reverse=True)
for q in oficiais:
    print(f"## {q['id']} [{q['prova']} {q['ano']}] gab={q['gabarito']} img={len(q.get('imagens') or [])} sub={q.get('subtemas')}")
    print(q["enunciado"])
    print(" | ".join(f"{x['letra']}) {x['texto']}" for x in q["alternativas"]))
    print()
print(f"{len(oficiais)} oficiais; {len(simulados)} simulados já existentes nesse recorte", file=sys.stderr)
for q in simulados:
    print(f"  simulado {q['id']}: {q['enunciado'][:90]}", file=sys.stderr)
