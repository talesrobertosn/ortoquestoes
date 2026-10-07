"""Registro dos OrtoQuestões Simulados por arquivo de origem (capítulo), lido do próprio acervo.

Uso: python3 scripts/simulados/registro.py [--markdown]

Mostra, para cada capítulo de origem: tema, faixa de ids, número de questões, figuras, distribuição
do gabarito e mediana do comentário. Serve para saber o que já foi feito antes de começar um
capítulo novo e para conferir o equilíbrio do gabarito e o tamanho dos comentários.
"""
import glob
import json
import statistics
import sys
from collections import Counter, defaultdict

md = "--markdown" in sys.argv
grupos = defaultdict(list)
for arq in sorted(glob.glob("public/acervo/temas/*.json")):
    slug = arq.rsplit("/", 1)[1][:-5]
    com = json.load(open(f"public/acervo/comentarios/{slug}.json"))
    for q in json.load(open(arq))["questoes"]:
        if not q.get("simulado") or q.get("prova"):
            continue
        origem = (q.get("origem") or {}).get("arquivo") or "sem origem"
        c = com.get(q["id"]) or {}
        tam = len(c.get("conceito", "")) + len(c.get("correta", "")) + sum(len(v) for v in (c.get("incorretas") or {}).values())
        grupos[origem].append((slug, q, tam))

linhas = []
for origem, itens in sorted(grupos.items(), key=lambda x: x[1][0][1]["id"]):
    por_tema = defaultdict(list)
    for slug, q, _ in itens:
        por_tema[slug].append(q["id"])
    faixas = "; ".join(f"{s} {min(ids)[-4:]} a {max(ids)[-4:]} ({len(ids)})" for s, ids in por_tema.items())
    gab = Counter(q["gabarito"] for _, q, _ in itens)
    figs = sum(1 for _, q, _ in itens if q.get("imagens"))
    med = statistics.median(t for *_, t in itens)
    linhas.append((origem, len(itens), faixas, figs, "".join(f"{k}{gab[k]}" for k in "ABCD"), med))

if md:
    print("| Origem | Questões | Temas e ids | Figuras | Gabarito | Comentário (mediana) |")
    print("|---|---|---|---|---|---|")
    for o, n, f, fi, g, m in linhas:
        print(f"| {o} | {n} | {f} | {fi} | {g} | {m:.0f} |")
else:
    for o, n, f, fi, g, m in linhas:
        print(f"{n:3d}  {o}\n     {f} | figuras {fi} | gabarito {g} | comentário {m:.0f}")
print(f"\nTotal: {sum(l[1] for l in linhas)} simulados em {len(linhas)} arquivos de origem", file=sys.stderr)
