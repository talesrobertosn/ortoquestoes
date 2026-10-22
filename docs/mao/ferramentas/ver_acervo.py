"""Mostra enunciado, alternativas, gabarito e o comentário publicado de uma faixa de ids.
Uso: python -X utf8 ver_acervo.py mao 2098 2102     (ou: ombro-cotovelo 664 669)
"""
import json, sys
from pathlib import Path

R = Path.home() / "ortoquestoes/public/acervo"
tema, ini, fim = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
T = {q["id"]: q for q in json.load(open(R / f"temas/{tema}.json", encoding="utf8"))["questoes"]}
C = json.load(open(R / f"comentarios/{tema}.json", encoding="utf8"))
C = C.get("comentarios", C)
for i in range(ini, fim + 1):
    qid = f"{tema}-{i:04d}"
    if qid not in T:
        continue
    q, c = T[qid], C.get(qid, {})
    print("#####", qid, "num", q["origem"].get("pagina"), "GAB", q["gabarito"], q["subtemas"])
    print(q["enunciado"])
    for a in q["alternativas"]:
        print(a["letra"], ")", a["texto"])
    print(c.get("conceito", ""))
    print("CORRETA:", c.get("correta"))
    for k, v in (c.get("incorretas") or {}).items():
        print(k, ":", v)
    print()
