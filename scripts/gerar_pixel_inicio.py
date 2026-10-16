"""Pixel art da página inicial (16/10/2026), feita do zero por este script.

Nada baixado nem gerado por IA: cada pixel sai das funções abaixo. A fogueira da sequência e os
ícones dos dias foram refeitos em scripts/gerar_fogueira_inicio.py. Este gera, em public/pixel/inicio/:
- prova.png: 26x30, bandeira de chegada no pódio de pedra (o fim da trilha do cronograma).
O CSS amplia com image-rendering: pixelated, então os arquivos ficam minúsculos.
Uso: python3 scripts/gerar_pixel_inicio.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"

# Paletas
PEDRA = {"contorno": "#23282b", "escura": "#4e575c", "media": "#7a858b", "clara": "#a9b4b9"}
OURO = {"contorno": "#5b3d06", "escura": "#a8761a", "media": "#e3b453", "clara": "#ffe3a3"}


def cor(hexa: str, alfa: int = 255) -> tuple[int, int, int, int]:
    hexa = hexa.lstrip("#")
    return (int(hexa[0:2], 16), int(hexa[2:4], 16), int(hexa[4:6], 16), alfa)


class Tela:
    def __init__(self, largura: int, altura: int) -> None:
        self.img = Image.new("RGBA", (largura, altura), (0, 0, 0, 0))
        self.l, self.a = largura, altura

    def p(self, x: int, y: int, c: str, alfa: int = 255) -> None:
        if 0 <= x < self.l and 0 <= y < self.a:
            self.img.putpixel((x, y), cor(c, alfa))

    def vazio(self, x: int, y: int) -> bool:
        return not (0 <= x < self.l and 0 <= y < self.a) or self.img.getpixel((x, y))[3] == 0

    def colar(self, outra: "Tela", dx: int, dy: int) -> None:
        self.img.alpha_composite(outra.img, (dx, dy))


def contornar(t: Tela, c: str) -> None:
    """Contorno de 1 px por fora de tudo o que já foi pintado (só nos 4 vizinhos)."""
    alvo = []
    for y in range(t.a):
        for x in range(t.l):
            if t.vazio(x, y) and any(not t.vazio(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                alvo.append((x, y))
    for x, y in alvo:
        t.p(x, y, c)


def prova() -> Tela:
    t = Tela(26, 30)
    # pódio de pedra em dois degraus
    for y in range(22, 28):
        for x in range(4, 22):
            t.p(x, y, PEDRA["clara"] if y == 22 else PEDRA["media"] if x < 20 else PEDRA["escura"])
    for y in range(18, 22):
        for x in range(8, 18):
            t.p(x, y, PEDRA["clara"] if y == 18 else PEDRA["media"] if x < 16 else PEDRA["escura"])
    contornar(t, PEDRA["contorno"])
    mastro = Tela(26, 30)
    for y in range(2, 18):
        mastro.p(12, y, "#d9dee0"); mastro.p(13, y, "#8a9296")
    mastro.p(12, 1, OURO["clara"]); mastro.p(13, 1, OURO["media"])
    # bandeira dourada ondulando
    for i, comprimento in enumerate((10, 11, 11, 10, 9, 8)):
        y = 3 + i
        for dx in range(comprimento):
            x = 14 + dx
            yy = y + (1 if 4 <= dx <= 6 else 0)
            mastro.p(x, yy, OURO["clara"] if i == 0 else OURO["media"] if dx < comprimento - 2 else OURO["escura"])
    # estrela no pano
    estrela = ("..x..", "xxxxx", ".xxx.", ".x.x.")
    for dy, linha_ in enumerate(estrela):
        for dx, ch in enumerate(linha_):
            if ch == "x":
                mastro.p(17 + dx, 4 + dy, "#ffffff")
    contornar(mastro, OURO["contorno"])
    t.colar(mastro, 0, 0)
    return t


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    prova().img.save(PASTA / "prova.png", optimize=True)
    for nome in sorted(PASTA.glob("*.png")):
        print(nome.relative_to(PASTA.parents[2]), Image.open(nome).size, f"{nome.stat().st_size} bytes")


if __name__ == "__main__":
    main()
