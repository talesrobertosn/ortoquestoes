"""Atualiza linhas do docs/mao/PROGRESSO.md de uma prova.

Uso: python -I progresso.py "SIMÃO 2023" LOTE "num|id|green|situacao" ...
     green e situacao vazios mantêm o que está; situacao padrão "publicada".
Também recalcula a linha da prova na tabela Resumo (publicadas, pendentes, ids, gabarito vem de --gab "A 1, B 2...").
"""
import re, sys, pathlib

arq = pathlib.Path.home() / "ortoquestoes/docs/mao/PROGRESSO.md"
prova, lote, *itens = sys.argv[1:]
gab = None
if "--gab" in itens:
    i = itens.index("--gab"); gab = itens[i + 1]; del itens[i:i + 2]
txt = arq.read_text(encoding="utf8")
ini = txt.index(f"## {prova}\n")
fim = txt.find("\n## ", ini + 5)
fim = len(txt) if fim < 0 else fim
sec = txt[ini:fim].split("\n")
for item in itens:
    num, qid, green, sit = (item.split("|") + ["", "", ""])[:4]
    for k, l in enumerate(sec):
        if l.startswith(f"| {num} |"):
            c = [x.strip() for x in l.strip().strip("|").split("|")]
            # colunas: N, assunto, formato, green, tema, lote, id, situação
            if green: c[3] = green
            c[5] = lote
            c[6] = qid
            c[7] = sit or "publicada"
            sec[k] = "| " + " | ".join(c) + " |"
            break
    else:
        sys.exit(f"questão {num} não achada em {prova}")
nova = "\n".join(sec)
txt = txt[:ini] + nova + txt[fim:]
cel = [[x.strip() for x in l.strip().strip("|").split("|")] for l in nova.split("\n") if re.match(r"\| \d+ \|", l)]
ids = sorted(c[6] for c in cel if c[7].startswith("publicada") and c[6])
pend = sum(1 for c in cel if c[7].startswith("pendente"))
def num_id(x): return (x.rsplit("-", 1)[0], int(x.rsplit("-", 1)[1]))
faixa = ""
if ids:
    por = {}
    for x in ids: por.setdefault(num_id(x)[0], []).append(x)
    faixa = "; ".join(f"{min(v, key=num_id)} a {max(v, key=num_id)}" for v in por.values())
m = re.search(rf"^\| {re.escape(prova)} \|.*$", txt, re.M)
if m:
    c = m.group(0).split(" | ")
    c[3] = str(len(ids)); c[4] = str(pend); c[5] = faixa
    if gab: c[6] = gab + " |"
    txt = txt[:m.start()] + " | ".join(c) + txt[m.end():]
arq.write_text(txt, encoding="utf8", newline="\n")
print(f"{prova}: {len(ids)} publicadas, {pend} pendentes; {faixa}")
