import json, pathlib, re
b = pathlib.Path.home() / "OrtoQuestoes-Biblioteca"
out = b / ".oq" / "texto"
out.mkdir(exist_ok=True)
por = {}
for l in open(b / ".oq" / "paginas.jsonl", encoding="utf8"):
    r = json.loads(l)
    por.setdefault(r["arquivo"], []).append(r)
for arq, regs in por.items():
    if not arq.startswith(("livros", "resumos")):
        continue
    nome = re.sub(r"[^\w\- ]", "_", pathlib.Path(arq).stem)[:80]
    with open(out / (pathlib.Path(arq).parent.name + "__" + nome + ".txt"), "w", encoding="utf8") as f:
        for r in regs:
            f.write(f"\n===== {arq} | p. {r.get('impressa') or (str(r.get('impressa_inferida'))+'?')} | folha {r.get('pdf') or r.get('bloco')} =====\n")
            f.write(r.get("texto", ""))
print(len(por))

