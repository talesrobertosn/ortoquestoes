#!/usr/bin/env python3
"""
Lê as etiquetas de assunto que o PDF já traz e atualiza a taxonomia com elas.

A etiqueta que veio da fonte vale mais do que qualquer lista que eu inventasse:
é o vocabulário que quem montou o banco usa. Este script só descobre e grava —
a importação continua sendo um passo separado.

    python3 scripts/etiquetas_do_pdf.py --tema quadril pdfs/quadril.pdf
    python3 scripts/etiquetas_do_pdf.py --tema trauma --nome "Trauma adulto" \\
        --apelido "Trauma" pdfs/trauma-a.pdf pdfs/trauma-b.pdf
    python3 scripts/etiquetas_do_pdf.py --tema quadril --seco pdfs/quadril.pdf
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import pymupdf
except ImportError:  # pragma: no cover
    import fitz as pymupdf  # type: ignore

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import CAMINHO_TAXONOMIA, normalizar  # noqa: E402
from texto_pdf import extrair_linhas_visuais  # noqa: E402

PADRAO_CABECALHO = re.compile(r"^\s*Quest[ãa]o\s*(?:n?[º°.]?\s*)?(\d{1,4})\s*[).:\-–—]?\s*$", re.IGNORECASE)


def etiquetas_do_arquivo(caminho: Path) -> tuple[dict[str, int], dict[str, int]]:
    """Devolve (rótulos de área, etiquetas), com quantas questões usam cada um."""
    documento = pymupdf.open(caminho)
    areas: dict[str, int] = {}
    etiquetas: dict[str, int] = {}
    for linha in extrair_linhas_visuais(documento):
        if not PADRAO_CABECALHO.match(linha.primeiro):
            continue
        pedacos = [b.texto.strip() for b in linha.blocos[1:] if b.texto.strip()]
        if not pedacos:
            continue
        areas[pedacos[0]] = areas.get(pedacos[0], 0) + 1
        for pedaco in pedacos[1:]:
            etiquetas[pedaco] = etiquetas.get(pedaco, 0) + 1
    return areas, etiquetas


def principal() -> int:
    analisador = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    analisador.add_argument("pdfs", nargs="+", type=Path)
    analisador.add_argument("--tema", required=True, help="slug do tema na taxonomia")
    analisador.add_argument("--nome", default=None, help="renomeia o tema")
    analisador.add_argument(
        "--apelido", action="append", default=[],
        help="rótulo de área do PDF que significa o próprio tema, não um subtema",
    )
    analisador.add_argument("--seco", action="store_true", help="só mostra, não grava")
    argumentos = analisador.parse_args()

    taxonomia = json.loads(CAMINHO_TAXONOMIA.read_text(encoding="utf-8"))
    tema = next((t for t in taxonomia["temas"] if t["slug"] == argumentos.tema), None)
    if tema is None:
        print(
            f"Tema '{argumentos.tema}' não existe na taxonomia. Acrescente-o primeiro em "
            f"{CAMINHO_TAXONOMIA.relative_to(Path.cwd()) if CAMINHO_TAXONOMIA.is_relative_to(Path.cwd()) else CAMINHO_TAXONOMIA}.",
            file=sys.stderr,
        )
        return 2

    if argumentos.nome:
        tema["nome"] = argumentos.nome
    if argumentos.apelido:
        tema["apelidos"] = sorted({*tema.get("apelidos", []), *argumentos.apelido})

    proprios = {normalizar(tema["nome"])} | {normalizar(a) for a in tema.get("apelidos", [])}

    areas: dict[str, int] = {}
    etiquetas: dict[str, int] = {}
    for caminho in argumentos.pdfs:
        if not caminho.exists():
            print(f"PDF não encontrado: {caminho}", file=sys.stderr)
            return 2
        a, e = etiquetas_do_arquivo(caminho)
        for chave, quantas in a.items():
            areas[chave] = areas.get(chave, 0) + quantas
        for chave, quantas in e.items():
            etiquetas[chave] = etiquetas.get(chave, 0) + quantas

    # A área também é assunto quando não é o próprio tema ("Joelho" numa questão
    # de quadril). Etiqueta cortada na diagramação entra sem as reticências.
    def limpar(rotulo: str) -> str:
        return rotulo.rstrip(" .…") if rotulo.endswith(("...", "…")) else rotulo

    vocabulario: dict[str, int] = {}
    for chave, quantas in {**areas, **etiquetas}.items():
        if normalizar(chave) in proprios:
            continue
        vocabulario[limpar(chave)] = vocabulario.get(limpar(chave), 0) + quantas

    antes = set(tema["subtemas"])
    novos = sorted(set(vocabulario) - antes, key=str.lower)
    saindo = sorted(antes - set(vocabulario), key=str.lower)
    tema["subtemas"] = sorted(set(vocabulario), key=str.lower)

    print(f"Tema: {tema['nome']} ({tema['slug']})")
    if tema.get("apelidos"):
        print(f"Apelidos: {', '.join(tema['apelidos'])}")
    print(f"Área predominante nos PDFs: {max(areas, key=areas.get) if areas else '—'}")
    print(f"\n{len(tema['subtemas'])} etiquetas ({len(novos)} novas):\n")
    for etiqueta in tema["subtemas"]:
        marca = "novo" if etiqueta in novos else "    "
        print(f"  {marca}  {vocabulario[etiqueta]:>4}  {etiqueta}")
    if saindo:
        print(f"\nSaíram da lista ({len(saindo)}): {', '.join(saindo)}")

    if argumentos.seco:
        print("\n(modo seco: taxonomia não gravada)")
        return 0

    CAMINHO_TAXONOMIA.write_text(
        json.dumps(taxonomia, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\nTaxonomia atualizada. Agora rode a importação.")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
