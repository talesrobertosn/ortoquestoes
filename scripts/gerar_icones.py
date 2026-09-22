#!/usr/bin/env python3
"""Gera o conjunto de ícones do site a partir de public/favicon.svg.

O SVG sozinho não basta. Safari ignora favicon em SVG, navegadores antigos
também, e o apple-touch-icon precisa ser PNG opaco — com transparência, o iOS
pinta os cantos de preto. Sem essas alternativas o navegador cai no ícone
padrão, e foi isso que aconteceu.

Este script mantém uma única fonte de verdade: o desenho vive no SVG, e todos
os formatos derivados saem daqui. Mudou a marca, roda de novo.

Uso:
    python3 scripts/gerar_icones.py
"""

from __future__ import annotations

import struct
import sys
from pathlib import Path

import pymupdf

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "public"
ORIGEM = PUBLICO / "favicon.svg"

# A mesma cor do retângulo do SVG. O apple-touch-icon é composto sobre ela para
# ficar quadrado e opaco — o iOS arredonda os cantos por conta própria.
FUNDO = (0x14, 0x65, 0x5E)

# Tamanhos que entram no .ico. Os três cobrem aba, favoritos e atalho de área
# de trabalho no Windows.
TAMANHOS_ICO = (16, 32, 48)

# Ícone "maskable" do aplicativo instalado: o Android recorta em círculo,
# gota ou quadrado, então o fundo ocupa tudo e o desenho fica dentro da zona
# segura central (80%). Mesmo desenho do favicon, reduzido.
MASCARAVEL = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" fill="#14655E"/>
  <g fill="none" transform="translate(16 16) scale(0.66) translate(-15 -15)">
    <circle cx="13.6" cy="13.6" r="7.9" stroke="#FFFFFF" stroke-width="3.4"/>
    <path d="M13.9 16.4 16.2 14.1 22.9 20.8 24.4 24.4 20.8 22.9Z" fill="#FFFFFF"/>
  </g>
</svg>""".encode()


def renderizar(lado: int, opaco: bool = False, svg: bytes | None = None) -> bytes:
    """Rasteriza o SVG em PNG, com ou sem transparência."""
    documento = pymupdf.open(stream=svg, filetype="svg") if svg else pymupdf.open(ORIGEM)
    pagina = documento[0]
    escala = lado / pagina.rect.width
    pixmap = pagina.get_pixmap(matrix=pymupdf.Matrix(escala, escala), alpha=True)
    if opaco:
        # tint_with não serve: precisamos do fundo ATRÁS do desenho, e não de
        # um filtro sobre ele. Compor sobre um pixmap de cor sólida resolve.
        fundo = pymupdf.Pixmap(pymupdf.csRGB, pixmap.irect, False)
        fundo.set_rect(fundo.irect, FUNDO)
        fundo = pymupdf.Pixmap(fundo, 1)  # acrescenta canal alfa para compor
        fundo.copy(fundo, fundo.irect)
        composto = pymupdf.Pixmap(pymupdf.csRGB, pixmap.irect, True)
        composto.set_rect(composto.irect, (*FUNDO, 255))
        composto = _sobrepor(composto, pixmap)
        composto = pymupdf.Pixmap(composto, 0)  # descarta o alfa
        return composto.tobytes("png")
    return pixmap.tobytes("png")


def _sobrepor(base: pymupdf.Pixmap, topo: pymupdf.Pixmap) -> pymupdf.Pixmap:
    """Compõe topo sobre base pelo canal alfa, pixel a pixel."""
    largura, altura = base.width, base.height
    amostras_base = bytearray(base.samples)
    amostras_topo = topo.samples
    for i in range(largura * altura):
        alfa = amostras_topo[i * 4 + 3]
        if alfa == 0:
            continue
        for c in range(3):
            frente = amostras_topo[i * 4 + c]
            fundo = amostras_base[i * 4 + c]
            amostras_base[i * 4 + c] = (frente * alfa + fundo * (255 - alfa)) // 255
    return pymupdf.Pixmap(base.colorspace, largura, altura, bytes(amostras_base), True)


def montar_ico(pngs: dict[int, bytes]) -> bytes:
    """Empacota PNGs num .ico. Todo navegador atual aceita PNG dentro de ICO."""
    entradas = sorted(pngs.items())
    cabecalho = struct.pack("<HHH", 0, 1, len(entradas))
    deslocamento = len(cabecalho) + 16 * len(entradas)
    diretorio, corpo = b"", b""
    for lado, dados in entradas:
        diretorio += struct.pack(
            "<BBBBHHII",
            lado if lado < 256 else 0,
            lado if lado < 256 else 0,
            0,  # paleta: nenhuma
            0,  # reservado
            1,  # planos
            32,  # bits por pixel
            len(dados),
            deslocamento,
        )
        corpo += dados
        deslocamento += len(dados)
    return cabecalho + diretorio + corpo


def main() -> int:
    if not ORIGEM.exists():
        print(f"Não encontrei {ORIGEM}", file=sys.stderr)
        return 1

    gerados: list[tuple[Path, int]] = []

    pngs_ico = {lado: renderizar(lado) for lado in TAMANHOS_ICO}
    for lado in (16, 32):
        caminho = PUBLICO / f"favicon-{lado}.png"
        caminho.write_bytes(pngs_ico[lado])
        gerados.append((caminho, len(pngs_ico[lado])))

    ico = montar_ico(pngs_ico)
    (PUBLICO / "favicon.ico").write_bytes(ico)
    gerados.append((PUBLICO / "favicon.ico", len(ico)))

    apple = renderizar(180, opaco=True)
    (PUBLICO / "apple-touch-icon.png").write_bytes(apple)
    gerados.append((PUBLICO / "apple-touch-icon.png", len(apple)))

    # Ícones do aplicativo instalado (manifest.webmanifest).
    for nome, dados in (
        ("icone-192.png", renderizar(192)),
        ("icone-512.png", renderizar(512)),
        ("icone-mascaravel-512.png", renderizar(512, opaco=True, svg=MASCARAVEL)),
    ):
        (PUBLICO / nome).write_bytes(dados)
        gerados.append((PUBLICO / nome, len(dados)))

    for caminho, tamanho in gerados:
        print(f"{caminho.relative_to(RAIZ)}  {tamanho / 1024:.1f} kB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
