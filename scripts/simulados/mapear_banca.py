"""Lista as questões oficiais do acervo sobre um assunto e faz a engenharia reversa (passo 1 do fluxo).

Uso:
  python3 scripts/simulados/mapear_banca.py --regex 'bankart|hill.?sachs|latarjet' \
      --subtema 'Instabilidade anterior do ombro' [--tema ombro-cotovelo] [--excluir id1,id2] \
      [--todas-as-provas] > oficiais.txt

Por padrão só TEOT e TARO (as provas que os simulados imitam); --todas-as-provas inclui CET-PR,
ENARE, TECOC e outras. Casa o regex no enunciado e nas alternativas ou o subtema (parcial, sem
diferenciar maiúsculas). --tema restringe aos temas do acervo indicados (evita ruído como "Perthes"
casando "Legg-Calvé-Perthes"); --excluir tira ids que o regex pegou por engano.

Na saída de erro sai o resumo da engenharia reversa (medidas de formato, gabarito, aberturas, pares,
epônimos e fatos repetidos entre anos) e os simulados que já existem no recorte. O roteiro de leitura
desse resumo está em docs/padrao-questoes-simulado-teot-taro.md, seção "Engenharia reversa por tema".
"""
import argparse
import difflib
import glob
import json
import re
import statistics
import sys
from collections import Counter
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("--regex", default="")
ap.add_argument("--subtema", action="append", default=[])
ap.add_argument("--tema", action="append", default=[])
ap.add_argument("--excluir", default="")
ap.add_argument("--todas-as-provas", action="store_true")
a = ap.parse_args()
padrao = re.compile(a.regex, re.I) if a.regex else None
subs = [s.lower() for s in a.subtema]
excluir = {x.strip() for x in a.excluir.split(",") if x.strip()}

oficiais, simulados = [], []
for arq in sorted(glob.glob("public/acervo/temas/*.json")):
    if a.tema and Path(arq).stem not in a.tema:
        continue
    for q in json.load(open(arq))["questoes"]:
        if q["id"] in excluir:
            continue
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


def err(*x):
    print(*x, file=sys.stderr)


# Engenharia reversa: só TEOT e TARO entram nas medidas (são as provas imitadas).
tt = [q for q in oficiais if re.search(r"TEOT|TARO", q.get("prova") or "") and len(q["alternativas"]) == 4]
err(f"{len(oficiais)} oficiais no recorte; {len(tt)} de TEOT/TARO com 4 alternativas entram nas medidas")
if tt:
    caso = re.compile(r"^(Paciente|Homem|Mulher|Menino|Menina|Criança|Adolescente|Atleta)\b|\d+ anos", re.I)
    en = [len(q["enunciado"]) for q in tt if not caso.search(q["enunciado"])]
    al = [len(x["texto"]) for q in tt for x in q["alternativas"]]
    fim = Counter(("dois-pontos" if e.endswith(":") else "ponto" if e.endswith(".") else
                   "interrogação" if e.endswith("?") else "palavra") for e in (q["enunciado"].rstrip() for q in tt))
    anos = Counter(q.get("ano") for q in tt)
    gab = Counter(q.get("gabarito") for q in tt if q.get("gabarito"))
    pares = sum(1 for q in tt if all(re.search(r"[;,]| e ", x["texto"]) for x in q["alternativas"]))
    eps = Counter(m for q in tt for m in re.findall(r"\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ'-]{3,}\b",
                                                      q["enunciado"] + " " + " ".join(x["texto"] for x in q["alternativas"])))
    err("\n== Engenharia reversa (TEOT e TARO) ==")
    err(f"anos: {dict(sorted(anos.items(), key=lambda k: (k[0] is None, k[0] or 0)))}")
    err(f"enunciado mediano {statistics.median(en) if en else 0:.0f} caracteres (sem casos clínicos); alternativa mediana {statistics.median(al):.0f}")
    err(f"termina em: {dict(fim)}; caso clínico: {sum(1 for q in tt if caso.search(q['enunciado']))}; "
        f"com imagem: {sum(1 for q in tt if q.get('imagens'))}; 'respectivamente': {sum(1 for q in tt if 'respectiv' in q['enunciado'])}; "
        f"alternativas em par (2 por 2 ou conduta + justificativa): {pares}")
    err(f"gabarito: {dict(sorted(gab.items()))}")
    err(f"aberturas: {Counter(' '.join(q['enunciado'].split()[:2]) for q in tt).most_common(8)}")
    err(f"epônimos e siglas em caixa alta: {[k for k, _ in eps.most_common(15)]}")
    # Fatos repetidos: enunciados muito parecidos em provas ou anos diferentes.
    norm = lambda t: re.sub(r"[^a-záéíóúâêôãõç0-9 ]", "", t.lower())
    rep = []
    for i, q1 in enumerate(tt):
        for q2 in tt[i + 1:]:
            if difflib.SequenceMatcher(None, norm(q1["enunciado"]), norm(q2["enunciado"])).ratio() > 0.75:
                rep.append(f"{q1['id']} ({q1['prova']} {q1['ano']}) ~ {q2['id']} ({q2['prova']} {q2['ano']}): {q1['enunciado'][:70]}")
    err(f"enunciados repetidos ({len(rep)}):")
    for r in rep:
        err("  " + r)
    sem = [q["id"] for q in oficiais if not q.get("gabarito")]
    if sem:
        err(f"sem gabarito no acervo: {sem}")

err(f"\n{len(simulados)} simulados já existentes nesse recorte")
for q in simulados:
    err(f"  simulado {q['id']}: {q['enunciado'][:90]}")
