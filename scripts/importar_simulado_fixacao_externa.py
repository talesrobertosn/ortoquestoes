#!/usr/bin/env python3
"""Valida o lote do capítulo 11; grava somente com --aplicar.

Uso:
  python scripts/importar_simulado_fixacao_externa.py
  python scripts/importar_simulado_fixacao_externa.py --aplicar

A importação é uma etapa explícita: abrir/mesclar este PR não publica o lote.
"""
from __future__ import annotations
import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOT = ROOT / "docs/simulados/fixacao-externa-cap11.json"
THEME = ROOT / "public/acervo/temas/conceitos-basicos.json"
COMMENTS = ROOT / "public/acervo/comentarios/conceitos-basicos.json"
INDEX_FILES = [ROOT / "public/acervo" / name for name in ("indice.json", "busca.json", "progresso.json")]

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

def write_atomic(path, text):
    fd, temporary = tempfile.mkstemp(prefix=".importacao-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(text)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

def validate(lot, theme, comments):
    new = lot["questoes"]
    existing = {q["id"] for q in theme["questoes"]}
    ids = [q["id"] for q in new]
    if len(ids) != len(set(ids)) or set(ids) & existing or set(ids) & set(comments):
        raise ValueError("IDs repetidos ou já existentes. Revisar a numeração antes de importar.")
    if set(ids) != set(lot["comentarios"]):
        raise ValueError("Cobertura de comentários diferente da cobertura de questões.")
    tax = read(ROOT / "src/dados/taxonomia.json")
    subs = {s for t in tax["temas"] for s in t["subtemas"]}
    for q in new:
        if not (q.get("simulado") is True and q.get("prova") is None and q.get("ano") is None and "area" not in q):
            raise ValueError(f"Metadados de simulado inválidos: {q['id']}")
        if q.get("tema") != "Conceitos básicos" or q.get("imagens"):
            raise ValueError(f"Tema ou imagens inesperados: {q['id']}")
        if not set(q.get("subtemas", [])) <= subs:
            raise ValueError(f"Subtema inválido: {q['id']}")
        if [a["letra"] for a in q["alternativas"]] != list("ABCD") or q["gabarito"] not in "ABCD":
            raise ValueError(f"Alternativas ou gabarito inválidos: {q['id']}")
        if not q.get("enunciado") or any(not a.get("texto") for a in q["alternativas"]):
            raise ValueError(f"Texto vazio: {q['id']}")
        c = lot["comentarios"][q["id"]]
        if set(c["incorretas"]) != set("ABCD") - {q["gabarito"]}:
            raise ValueError(f"Alternativa sem análise: {q['id']}")
        if not c.get("conceito") or not c.get("correta") or not c.get("referencias") or any(not t for t in c["incorretas"].values()):
            raise ValueError(f"Comentário incompleto: {q['id']}")
        if c.get("conferido") is not False or q.get("revisado") is not False:
            raise ValueError(f"Não atribuir revisão humana não realizada: {q['id']}")
        raw = json.dumps(c, ensure_ascii=False)
        if any(m in raw for m in ("bytes omitted", "chars omitted", "characters omitted", "lines omitted")):
            raise ValueError(f"Truncamento: {q['id']}")
    return new

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--aplicar", action="store_true", help="aplica após validar e regenera o índice pelo pipeline existente")
    args = parser.parse_args()
    lot, theme, comments = read(LOT), read(THEME), read(COMMENTS)
    new = validate(lot, theme, comments)
    print(f"Lote válido: {len(new)} questões; {new[0]['id']} a {new[-1]['id']}.")
    if not args.aplicar:
        print("Validação sem alterações. Para importar, use --aplicar.")
        return 0
    paths = [THEME, COMMENTS, *INDEX_FILES]
    original = {p: p.read_bytes() if p.exists() else None for p in paths}
    theme["questoes"].extend(new)
    comments.update(lot["comentarios"])
    try:
        write_atomic(THEME, json.dumps(theme, ensure_ascii=False, indent=2) + "\n")
        write_atomic(COMMENTS, json.dumps(comments, ensure_ascii=False, indent=1) + "\n")
        subprocess.run([sys.executable, str(ROOT / "scripts/gerar_indice.py")], cwd=ROOT, check=True)
        subprocess.run([sys.executable, str(ROOT / "scripts/validar_acervo.py")], cwd=ROOT, check=True)
    except BaseException:
        for path, data in original.items():
            if data is None:
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(data)
        raise
    print("Importação concluída. Arquivos existentes preservados e índice regenerado.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
