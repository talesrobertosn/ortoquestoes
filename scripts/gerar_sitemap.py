#!/usr/bin/env python3
"""
Gera public/sitemap.xml e public/robots.txt.

O aplicativo roda por hash (#/treinar, #/sobre) e o Google descarta o
fragmento: para ele tudo isso é a raiz. O conteúdo que o buscador consegue
ler e indexar está nas páginas estáticas de public/questoes/, geradas por
gerar_paginas_seo.py — uma por assunto e uma por questão. Rode aquele script
antes deste; no deploy os dois rodam em sequência.
"""

from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import CAMINHO_INDICE, DIR_PUBLICO  # noqa: E402

SITE = "https://ortoquestoes.com.br/"
DIR_QUESTOES = DIR_PUBLICO / "questoes"
DIR_GUIAS = DIR_PUBLICO / "guias"
ARQUIVO_GUIAS = DIR_GUIAS / "_seo.json"

ROBOTS = f"""User-agent: *
Allow: /

Sitemap: {SITE}sitemap.xml
"""


def data_do_acervo() -> str:
    """Data em que o acervo foi gerado. A data do arquivo não serve: no deploy
    todo arquivo acabou de ser baixado e teria a data de hoje."""
    try:
        gerado = json.loads(CAMINHO_INDICE.read_text(encoding="utf-8")).get("geradoEm", "")
        return dt.datetime.fromisoformat(gerado).date().isoformat()
    except (OSError, ValueError, AttributeError):
        return dt.date.today().isoformat()


def entrada(endereco: str, data: str, frequencia: str, prioridade: str) -> str:
    return (
        f"  <url><loc>{endereco}</loc><lastmod>{data}</lastmod>"
        f"<changefreq>{frequencia}</changefreq><priority>{prioridade}</priority></url>"
    )


def principal() -> int:
    data = data_do_acervo()
    urls = [entrada(SITE, data, "weekly", "1.0")]

    if DIR_QUESTOES.is_dir():
        urls.append(entrada(f"{SITE}questoes/", data, "weekly", "0.9"))
        for assunto in sorted(DIR_QUESTOES.glob("*.html")):
            if assunto.stem != "index":
                urls.append(entrada(f"{SITE}questoes/{assunto.name}", data, "weekly", "0.8"))
        for pasta in sorted(p for p in DIR_QUESTOES.iterdir() if p.is_dir()):
            for questao in sorted(pasta.glob("*.html")):
                urls.append(entrada(f"{SITE}questoes/{pasta.name}/{questao.name}", data, "monthly", "0.6"))
    else:
        print("aviso: public/questoes/ não existe — rode gerar_paginas_seo.py antes", file=sys.stderr)

    # Guias editoriais com propósito próprio entram somente depois de gerados;
    # assim uma execução parcial nunca anuncia páginas 404 no sitemap.
    if DIR_GUIAS.is_dir():
        try:
            guias = json.loads(ARQUIVO_GUIAS.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            guias = []
        if guias:
            # A página de índice declara /guias/ como canônica — nunca
            # anunciamos /guias/index.html, que seria uma duplicata.
            indice_data = max(g["atualizado_em"] for g in guias)
            urls.append(entrada(f"{SITE}guias/", indice_data, "monthly", "0.7"))
            for guia in guias:
                urls.append(entrada(f"{SITE}guias/{guia['arquivo']}", guia["atualizado_em"], "monthly", "0.7"))
        else:
            print("aviso: manifesto dos guias não existe — rode gerar_guias_seo.py antes", file=sys.stderr)

    xml = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', *urls, "</urlset>"]
    (DIR_PUBLICO / "sitemap.xml").write_text("\n".join(xml) + "\n", encoding="utf-8")
    (DIR_PUBLICO / "robots.txt").write_text(ROBOTS, encoding="utf-8")

    print(f"sitemap.xml: {len(urls)} endereços, lastmod {data}")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
