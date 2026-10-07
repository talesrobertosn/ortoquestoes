"""Acrescenta texto a comentários de simulados já aplicados, sem mudar ids, gabarito ou enunciado.

Uso: python3 scripts/simulados/enriquecer.py <arquivo_acrescimos.py> [--conferir]

O módulo define ACRESCIMOS = {"trauma-1237": {"conceito": "...", "correta": "...", "A": "...", ...}}.
O texto de "conceito" entra como parágrafo novo antes da linha "> **Na prova:**" (ou no fim);
"correta" e as letras são acrescentadas ao fim do parágrafo correspondente. A letra do gabarito
não pode receber acréscimo em "incorretas" (use "correta"). Mantém conferido como estava.
"""
import importlib.util
import json
import re
import statistics
import sys
from collections import defaultdict

arq, conferir = sys.argv[1], "--conferir" in sys.argv
sp = importlib.util.spec_from_file_location("acr", arq)
m = importlib.util.module_from_spec(sp)
sp.loader.exec_module(m)

por_tema = defaultdict(dict)
for qid, partes in m.ACRESCIMOS.items():
    por_tema[qid.rsplit("-", 1)[0]][qid] = partes

erros, antes, depois = [], [], []
for tema, itens in por_tema.items():
    cp = f"public/acervo/comentarios/{tema}.json"
    C = json.load(open(cp))
    gabs = {q["id"]: q["gabarito"] for q in json.load(open(f"public/acervo/temas/{tema}.json"))["questoes"]}
    for qid, partes in itens.items():
        c = C.get(qid)
        if not c:
            erros.append(f"{qid}: sem comentário")
            continue
        tam = lambda x: len(x["conceito"]) + len(x["correta"]) + sum(len(v) for v in x["incorretas"].values())
        antes.append(tam(c))
        for chave, texto in partes.items():
            if "—" in texto or "–" in texto or "==" in texto or re.search(r"(?<!\*)\*(?!\*)[^*\n]+\*(?!\*)", texto):
                erros.append(f"{qid}/{chave}: caractere proibido")
            if chave == "conceito":
                marca = "\n\n> **Na prova:**"
                if marca in c["conceito"]:
                    c["conceito"] = c["conceito"].replace(marca, "\n\n" + texto.strip() + marca, 1)
                else:
                    c["conceito"] += "\n\n" + texto.strip()
            elif chave == "correta":
                c["correta"] = c["correta"].rstrip() + " " + texto.strip()
            elif chave in "ABCD" and len(chave) == 1:
                if chave == gabs.get(qid) or chave not in c["incorretas"]:
                    erros.append(f"{qid}: letra {chave} não é incorreta")
                    continue
                c["incorretas"][chave] = c["incorretas"][chave].rstrip() + " " + texto.strip()
            else:
                erros.append(f"{qid}: chave desconhecida {chave}")
        depois.append(tam(c))
    if not conferir and not erros:
        json.dump(C, open(cp, "w"), ensure_ascii=False, indent=1)
        open(cp, "a").write("\n")

for e in erros:
    print("ERRO:", e)
if antes:
    print(f"{len(antes)} comentários | mediana {statistics.median(antes):.0f} -> {statistics.median(depois):.0f} | mínimo depois {min(depois)}")
sys.exit(1 if erros else 0)
