#!/usr/bin/env python3
"""Figuras dos livros nos comentários: localizar, ver, recortar e anexar (Tales, 30/10/2026).

O Tales autorizou figuras recortadas dos livros nos comentários, com a fonte na legenda.
Este script deixa o caminho curto e repetível. Os livros nunca vão para o git: só o
recorte otimizado, em public/imagens/<tema>/.

Uso:
  # 1. Em que página do PDF está a figura? (procura a legenda no texto extraído)
  python3 scripts/figuras_livro.py localizar LIVRO.pdf "FIG. 16.1"
  # 2. Prévia da página a 110 dpi, para escolher a caixa do recorte olhando a imagem
  python3 scripts/figuras_livro.py previa LIVRO.pdf 719 --saida PASTA
  # 3. Recorte a 220 dpi (caixa nas coordenadas da prévia), largura máxima 1200 px, JPEG 85
  python3 scripts/figuras_livro.py recortar LIVRO.pdf 719 530,80,828,412 --tema pediatria \
      --nome tach-16-1 --legenda "Fonte: Tachdjian's ..., cap. 16, Fig. 16.1, p. 617. ..." --registro REG.json
  # 4. Anexar figuras do registro aos comentários ({"pediatria-0085": ["tach-16-1"]}), via aplicar_comentarios
  python3 scripts/figuras_livro.py anexar MAPA.json --registro REG.json [--seco]

A página impressa (p. 617) só entra na legenda quando aparece na própria página do PDF.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DPI_PREVIA, DPI_RECORTE, LARGURA_MAX = 110, 220, 1200


def texto_paginas(pdf: Path) -> list[str]:
    """Texto do PDF por página, com cache em %TEMP%/oqlivros (o pdftotext do livro inteiro demora)."""
    pasta = Path(tempfile.gettempdir()) / "oqlivros"
    pasta.mkdir(exist_ok=True)
    cache = pasta / f"pag-{hashlib.sha1(str(pdf.resolve()).encode()).hexdigest()[:12]}.txt"
    if not cache.exists():
        subprocess.run(["pdftotext", "-enc", "UTF-8", "-layout", str(pdf), str(cache)], check=True)
    return cache.read_text(encoding="utf-8", errors="ignore").split("\f")


def renderizar(pdf: Path, pagina: int, dpi: int) -> Path:
    destino = Path(tempfile.mkdtemp(prefix="oqfig-")) / "p"
    subprocess.run(["pdftoppm", "-f", str(pagina), "-l", str(pagina), "-r", str(dpi), "-png", str(pdf), str(destino)],
                   check=True, stderr=subprocess.DEVNULL)
    return next(destino.parent.glob("p*.png"))


def localizar(a) -> int:
    alvo = " ".join(a.texto.lower().split())
    for i, pag in enumerate(texto_paginas(Path(a.livro)), start=1):
        plano = " ".join(pag.split())  # o -layout separa as palavras com vários espaços
        pos = plano.lower().find(alvo)
        if pos >= 0:
            print(f"página do PDF {i}: {plano[pos:pos + 220]}")
    return 0


def previa(a) -> int:
    from PIL import Image
    png = renderizar(Path(a.livro), a.pagina, DPI_PREVIA)
    saida = Path(a.saida) / f"previa-p{a.pagina}.png"
    saida.parent.mkdir(parents=True, exist_ok=True)
    Image.open(png).save(saida)
    print(saida)
    return 0


def recortar(a) -> int:
    from PIL import Image
    caixa = [float(v) for v in a.caixa.split(",")]
    k = DPI_RECORTE / DPI_PREVIA
    im = Image.open(renderizar(Path(a.livro), a.pagina, DPI_RECORTE)).convert("RGB")
    im = im.crop(tuple(int(v * k) for v in caixa))
    if im.width > LARGURA_MAX:
        im = im.resize((LARGURA_MAX, round(im.height * LARGURA_MAX / im.width)), Image.LANCZOS)
    arquivo = f"{a.tema}/{a.nome}.jpeg"
    destino = RAIZ / "public/imagens" / arquivo
    destino.parent.mkdir(parents=True, exist_ok=True)
    im.save(destino, quality=85, optimize=True, progressive=True)
    reg = Path(a.registro)
    dados = json.loads(reg.read_text(encoding="utf-8")) if reg.exists() else {}
    dados[a.nome] = {"arquivo": arquivo, "legenda": a.legenda, "largura": im.width, "altura": im.height}
    reg.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{destino} {im.width}x{im.height} {os.path.getsize(destino) // 1024} KB")
    return 0


def anexar(a) -> int:
    figuras = json.loads(Path(a.registro).read_text(encoding="utf-8"))
    mapa = json.loads(Path(a.mapa).read_text(encoding="utf-8"))
    lote, atuais = {}, {}
    for qid, nomes in mapa.items():
        tema = qid.rsplit("-", 1)[0]
        if tema not in atuais:
            atuais[tema] = json.loads((RAIZ / f"public/acervo/comentarios/{tema}.json").read_text(encoding="utf-8"))
        if qid not in atuais[tema]:
            sys.exit(f"{qid}: sem comentário para receber a figura")
        c = dict(atuais[tema][qid])
        c.pop("geradoEm", None)
        faltam = [n for n in nomes if n not in figuras]
        if faltam:
            sys.exit(f"{qid}: figura fora do registro: {faltam}")
        c["imagens"] = [figuras[n] for n in nomes]
        lote[qid] = c
    saida = Path(tempfile.gettempdir()) / "oq-figuras-lote.json"
    saida.write_text(json.dumps(lote, ensure_ascii=False), encoding="utf-8")
    cmd = [sys.executable, str(RAIZ / "scripts/aplicar_comentarios.py"), str(saida)] + (["--seco"] if a.seco else [])
    return subprocess.run(cmd).returncode


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest="cmd", required=True)
    x = s.add_parser("localizar"); x.add_argument("livro"); x.add_argument("texto"); x.set_defaults(f=localizar)
    x = s.add_parser("previa"); x.add_argument("livro"); x.add_argument("pagina", type=int); x.add_argument("--saida", default=tempfile.gettempdir()); x.set_defaults(f=previa)
    x = s.add_parser("recortar"); x.add_argument("livro"); x.add_argument("pagina", type=int); x.add_argument("caixa")
    x.add_argument("--tema", required=True); x.add_argument("--nome", required=True); x.add_argument("--legenda", required=True)
    x.add_argument("--registro", required=True); x.set_defaults(f=recortar)
    x = s.add_parser("anexar"); x.add_argument("mapa"); x.add_argument("--registro", required=True); x.add_argument("--seco", action="store_true"); x.set_defaults(f=anexar)
    a = p.parse_args()
    return a.f(a)


if __name__ == "__main__":
    raise SystemExit(main())
