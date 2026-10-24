import json, sys, pathlib
p = pathlib.Path.home() / "OrtoQuestoes-Biblioteca/.oq/provas" / (sys.argv[1] + ".json")
d = json.load(open(p, encoding="utf8"))
out = []
for q in d["questoes"]:
    out.append(f"### {q['num']}\n{q['enunciado']}")
    for k, v in (q["alternativas"].items() if isinstance(q["alternativas"], dict) else enumerate(q["alternativas"])):
        out.append(f"  {k}) {v}")
    out.append("")
(p.with_suffix(".txt")).write_text("\n".join(out), encoding="utf8")
print(p.with_suffix(".txt"))
