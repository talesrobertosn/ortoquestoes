#!/usr/bin/env python3
"""
Gera public/sitemap.xml e public/robots.txt.

O roteamento do site é por hash, então para o buscador existe uma única URL —
a raiz. Listar os endereços internos (#/treinar, #/sobre) não é erro: o Google
descarta o fragmento e trata todos como a raiz, mas outros indexadores e o
próprio painel do Search Console mostram a intenção. O que realmente importa
aqui é declarar a raiz com uma data de modificação verdadeira, que é a data do
acervo publicado.
"""

from __future__ import annotations

import datetime as dt
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import CAMINHO_INDICE, DIR_PUBLICO  # noqa: E402

SITE = "https://ortoquestoes.com.br/"

# Endereço, prioridade e frequência. Só entram páginas de conteúdo estável —
# sessão, resumo e favoritas dependem do estado do navegador e não têm o que
# indexar.
PAGINAS = [
    ("", "1.0", "weekly"),
    ("#/sobre", "0.8", "monthly"),
    ("#/treinar", "0.6", "weekly"),
    ("#/contato", "0.3", "yearly"),
]

ROBOTS = f"""User-agent: *
Allow: /

Sitemap: {SITE}sitemap.xml
"""


def principal() -> int:
    # A data de modificação do índice é a data em que o acervo mudou pela
    # última vez — mais honesta que a data de hoje.
    if CAMINHO_INDICE.exists():
        carimbo = dt.datetime.fromtimestamp(CAMINHO_INDICE.stat().st_mtime)
    else:
        carimbo = dt.datetime.now()
    data = carimbo.date().isoformat()

    linhas = ['<?xml version="1.0" encoding="UTF-8"?>']
    linhas.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for caminho, prioridade, frequencia in PAGINAS:
        linhas.append("  <url>")
        linhas.append(f"    <loc>{SITE}{caminho}</loc>")
        linhas.append(f"    <lastmod>{data}</lastmod>")
        linhas.append(f"    <changefreq>{frequencia}</changefreq>")
        linhas.append(f"    <priority>{prioridade}</priority>")
        linhas.append("  </url>")
    linhas.append("</urlset>")

    destino = DIR_PUBLICO / "sitemap.xml"
    destino.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    (DIR_PUBLICO / "robots.txt").write_text(ROBOTS, encoding="utf-8")

    print(f"sitemap.xml: {len(PAGINAS)} endereços, lastmod {data}")
    print("robots.txt: gravado")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
