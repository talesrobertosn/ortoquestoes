#!/usr/bin/env python3
"""Dossiê de engenharia reversa de um subtema: o que a banca cobra e onde isso está no livro.

Pedido do Tales (30/10/2026): antes de escrever simulados, resumo e comentários, conhecer todas as questões do
tema e saber qual capítulo e qual página do livro sustentam cada uma. O dossiê lista, por subtema:
  - cada questão (oficial, simulado ou prova protegida da mão), com prova, ano, gabarito e a alternativa correta;
  - o estado do comentário (tamanho e se está abaixo do padrão de 4,5 mil);
  - com --livro e --paginas, as páginas do livro em que as palavras da questão mais aparecem (sugestão de leitura).

Uso:
  python3 scripts/biblioteca/dossie_tema.py "Lesões do bíceps"
  python3 scripts/biblioteca/dossie_tema.py "Lesões do bíceps" --livro campbell21 --paginas 2641-3066 > dossie.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
sys.path.insert(0, str(RAIZ / "scripts" / "biblioteca"))
from fila_editorial import PROVAS_MAO, oficial  # noqa: E402
from medir_profundidade import MIN_COMENTARIO, tamanho_comentario  # noqa: E402

# Palavras que não ajudam a achar a página.
VAZIAS = set("""a o as os um uma de da do das dos e é em no na nos nas por para com sem que se ao à
qual quais mais menos sobre entre sua seu suas seus como pela pelo ser são foi está esta este essa esse
correto correta incorreto incorreta alternativa afirmar afirmativa segundo caso paciente anos sexo
masculino feminino tratamento diagnóstico lesão lesões indicado indicada principal principalmente""".split())


def sem_acento(s: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(ch) != "Mn")


def termos(texto: str) -> list[str]:
    palavras = re.findall(r"[A-Za-zÀ-ÿ]{5,}", texto)
    return [sem_acento(p) for p in palavras if sem_acento(p) not in VAZIAS]


def carregar() -> tuple[dict, dict]:
    qs, cs = {}, {}
    for p in sorted((RAIZ / "public/acervo/temas").glob("*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        for q in d["questoes"] if isinstance(d, dict) else d:
            qs[q["id"]] = q
    for p in sorted((RAIZ / "public/acervo/comentarios").glob("*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        cs.update(d.get("comentarios", d))
    return qs, cs


def alternativas(q: dict) -> dict[str, str]:
    alt = q.get("alternativas") or {}
    if isinstance(alt, list):
        return {a["letra"]: a["texto"] for a in alt}
    return alt


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("subtema", nargs="+", help="nome exato do subtema (pode repetir)")
    ap.add_argument("--livro", help="apelido de scripts/livros.py para sugerir páginas")
    ap.add_argument("--paginas", help="faixa de páginas do PDF, ex.: 2641-3066")
    a = ap.parse_args()

    qs, cs = carregar()
    escolhidas = [q for q in qs.values() if set(q.get("subtemas") or []) & set(a.subtema) and not q.get("duplicataDe")]
    escolhidas.sort(key=lambda q: (not oficial(q), q["id"]))

    paginas = []
    if a.livro:
        from livros import paginas as ler_paginas  # noqa: E402
        todas = ler_paginas(a.livro)
        ini, fim = (int(x) for x in (a.paginas or f"1-{len(todas)}").split("-"))
        paginas = [(n, sem_acento(todas[n - 1])) for n in range(ini, min(fim, len(todas)) + 1)]

    resumo = Counter()
    print(f"# Dossiê: {', '.join(a.subtema)}\n")
    for q in escolhidas:
        tipo = "PROTEGIDA (mão)" if q.get("prova") in PROVAS_MAO else ("oficial" if oficial(q) else "simulado")
        resumo[tipo] += 1
        c = cs.get(q["id"]) or {}
        n = tamanho_comentario(c) if c else 0
        estado = "sem comentário" if not c else ("ok" if n >= MIN_COMENTARIO else f"CURTO {n}")
        alt = alternativas(q)
        gab = q.get("gabarito")
        print(f"## {q['id']} · {q.get('prova') or 'simulado'} {q.get('ano') or ''} · {tipo} · gabarito {gab} · comentário {estado}"
              + (" · IMAGEM" if q.get("imagens") else "") + (" · ANULADA" if q.get("anulada") else ""))
        print(q.get("enunciado", "").strip())
        for letra, txt in alt.items():
            print(f"- {'**' if letra == gab else ''}{letra}) {txt}{'**' if letra == gab else ''}")
        if paginas and tipo != "PROTEGIDA (mão)":
            chave = termos(q.get("enunciado", "") + " " + alt.get(gab or "", ""))
            notas = sorted(((sum(t.count(k) for k in set(chave)), n) for n, t in paginas), reverse=True)[:4]
            print("Páginas do livro (PDF) com mais termos da questão: " + ", ".join(f"{n} ({s})" for s, n in notas if s))
        print()
    print("Total: " + ", ".join(f"{k} {v}" for k, v in resumo.items()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
