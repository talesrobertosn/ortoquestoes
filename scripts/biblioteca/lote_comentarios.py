#!/usr/bin/env python3
"""Converte um lote de comentários escrito em Python para o JSON do aplicar_comentarios.py, conferindo antes.

Criado em 30/10/2026 para a refação dos comentários curtos. O lote é um arquivo .py (fora do git, em
~/OrtoQuestoes-Biblioteca/lotes/...) com um dicionário COMENTARIOS = {id: {...}}, escrito com strings longas,
que são mais fáceis de revisar que JSON. Cada comentário tem conceito, correta, incorretas, referencias e,
quando houver, alerta, provavel e figuras (nomes do registro de figuras, viram o campo imagens).

O conversor recusa o lote quando:
  - a letra da correta não é o gabarito do acervo (ou o provavel, sem gabarito);
  - as incorretas não são exatamente as outras letras;
  - algum comentário fica abaixo do piso de 800 caracteres (o tamanho certo é proporcional à questão);
  - há travessão no texto;
  - um parágrafo longo (mais de 200 caracteres) se repete em dois comentários do lote: cada comentário conta
    com as próprias palavras, sem blocos copiados (Tales, 31/10/2026);
  - questão de prova real traz o fecho "Por que esta questão foi criada", que é só dos OrtoQuestões Simulados;
  - simulado sem esse fecho (todo simulado explica por que foi criado).
Avisa, sem recusar, quando todos os comentários do lote têm o mesmo esqueleto ou o mesmo fecho "Na prova".

Uso:
  python3 scripts/biblioteca/lote_comentarios.py LOTE.py SAIDA.json [--registro REG.json]
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "biblioteca"))
from medir_profundidade import MIN_COMENTARIO, tamanho_comentario  # noqa: E402

REGISTRO = Path.home() / "OrtoQuestoes-Biblioteca/figuras/registro.json"


def questoes() -> dict:
    qs = {}
    for p in (RAIZ / "public/acervo/temas").glob("*.json"):
        d = json.loads(p.read_text(encoding="utf-8"))
        for q in d["questoes"] if isinstance(d, dict) else d:
            qs[q["id"]] = q
    return qs


def letras(q: dict) -> list[str]:
    alt = q.get("alternativas") or {}
    return [a["letra"] for a in alt] if isinstance(alt, list) else list(alt)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("lote")
    ap.add_argument("saida")
    ap.add_argument("--registro", default=str(REGISTRO))
    a = ap.parse_args()
    spec = importlib.util.spec_from_file_location("lote", a.lote)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    reg = json.loads(Path(a.registro).read_text(encoding="utf-8"))
    qs = questoes()
    saida, erros = {}, []
    vistos: dict[str, list[str]] = {}
    esqueletos: list[tuple] = []
    for qid, c in mod.COMENTARIOS.items():
        q = qs.get(qid)
        if not q:
            erros.append(f"{qid}: não existe"); continue
        gab = q.get("gabarito") or c.get("provavel")
        m = re.match(r"\*\*([A-Z])\b", c["correta"])
        if not m or m.group(1) != gab:
            erros.append(f"{qid}: a correta começa com {m.group(1) if m else '?'}, gabarito {gab}")
        if sorted(c["incorretas"]) != sorted(l for l in letras(q) if l != gab):
            erros.append(f"{qid}: incorretas {sorted(c['incorretas'])} não batem com {letras(q)} sem {gab}")
        texto = json.dumps(c, ensure_ascii=False)
        if "—" in texto or "–" in texto:
            erros.append(f"{qid}: tem travessão")
        n = tamanho_comentario(c)
        print(f"{'OK   ' if n >= MIN_COMENTARIO else 'CURTO'} {n:6d}  {qid}")
        if n < MIN_COMENTARIO:
            erros.append(f"{qid}: {n} caracteres")
        if "Por que esta questão foi criada" in texto and not q.get("simulado"):
            erros.append(f"{qid}: 'Por que esta questão foi criada' é só para OrtoQuestões Simulados")
        if q.get("simulado") and "Por que esta questão foi criada" not in texto:
            erros.append(f"{qid}: simulado sem 'Por que esta questão foi criada' (Tales, 31/10/2026)")
        for par in re.split(r"\n\s*\n", "\n\n".join([c.get("conceito", ""), c.get("correta", ""), *c.get("incorretas", {}).values()])):
            par = par.strip()
            if len(par) > 200:
                vistos.setdefault(par, []).append(qid)
        esqueletos.append(("Na prova" in texto, "foi criada" in texto or "banca quis testar" in texto, c.get("conceito", "").count("\n\n")))
        novo = {k: v for k, v in c.items() if k != "figuras"}
        if c.get("figuras"):
            faltam = [f for f in c["figuras"] if f not in reg]
            if faltam:
                erros.append(f"{qid}: figura fora do registro {faltam}")
            novo["imagens"] = [reg[f] for f in c["figuras"] if f in reg]
        saida[qid] = novo
    for par, ids in vistos.items():
        if len(set(ids)) > 1:
            erros.append(f"parágrafo repetido em {sorted(set(ids))}: {par[:70]}...")
    if len(esqueletos) >= 6:
        if all(e[0] for e in esqueletos):
            print("AVISO: todos os comentários do lote têm 'Na prova'; use só onde houver uma frase de memória que valha.")
        if len({e[2] for e in esqueletos}) == 1:
            print("AVISO: todos os conceitos têm o mesmo número de parágrafos; varie a forma conforme a questão.")
    if erros:
        print("RECUSADO:\n  " + "\n  ".join(erros))
        return 1
    Path(a.saida).write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(saida)} comentário(s) em {a.saida}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
