"""Pixel art da página inicial (16/10/2026), feita do zero por este script.

Nada baixado nem gerado por IA: cada pixel sai das funções abaixo. Gera, em public/pixel/inicio/:
- fogueira.png: 4 quadros de 24x28 lado a lado (a chama tremula com steps() no CSS);
- fogueira-apagada.png: 24x28, lenha com brasa fria e fumaça (sequência zerada);
- dias.png: 4 ícones de 12x12 lado a lado (feito, hoje aceso, hoje esperando, dia sem estudo);
- prova.png: 26x30, bandeira de chegada no pódio de pedra (o fim da trilha do cronograma).
O CSS amplia com image-rendering: pixelated, então os arquivos ficam minúsculos.
Uso: python3 scripts/gerar_pixel_inicio.py
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"

# Paletas
LENHA = {"contorno": "#2a160a", "escura": "#5a3418", "media": "#8a5228", "clara": "#b9783c", "anel": "#e0a868"}
PEDRA = {"contorno": "#23282b", "escura": "#4e575c", "media": "#7a858b", "clara": "#a9b4b9"}
FOGO = ["#b8321f", "#e2462b", "#f28c28", "#ffc23d", "#fff1a8"]  # borda → miolo
FUMACA = ["#5f676b", "#8a9296"]
OURO = {"contorno": "#5b3d06", "escura": "#a8761a", "media": "#e3b453", "clara": "#ffe3a3"}
VERDE = {"contorno": "#062a24", "escura": "#0d5247", "media": "#14655e", "clara": "#4fb3a5"}


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


def tora(t: Tela, x0: int, y0: int, comprimento: int, subindo: bool) -> None:
    """Tora inclinada de 3 px de espessura, com anel na ponta da frente."""
    for i in range(comprimento):
        x = x0 + i
        y = y0 - (i // 3 if subindo else -(i // 3))
        t.p(x, y, LENHA["clara"])
        t.p(x, y + 1, LENHA["media"])
        t.p(x, y + 2, LENHA["escura"])
    # ponta cortada (anel)
    xf = x0 if not subindo else x0 + comprimento - 1
    yf = y0 - ((comprimento - 1) // 3 if subindo else -((comprimento - 1) // 3)) if subindo else y0
    for dy in range(3):
        t.p(xf, yf + dy, LENHA["anel"] if dy == 1 else LENHA["clara"])


def lenha(t: Tela, brasa: bool) -> None:
    base = Tela(t.l, t.a)
    tora(base, 2, 22, 14, subindo=True)
    tora(base, 8, 18, 14, subindo=False)
    contornar(base, LENHA["contorno"])
    # pedras em volta
    pedras = Tela(t.l, t.a)
    for (x, y, w) in ((1, 25, 4), (7, 26, 4), (13, 26, 4), (19, 25, 4)):
        for dx in range(w):
            pedras.p(x + dx, y, PEDRA["clara"] if dx < w - 1 else PEDRA["media"])
            pedras.p(x + dx, y + 1, PEDRA["media"] if dx < w - 1 else PEDRA["escura"])
    contornar(pedras, PEDRA["contorno"])
    t.colar(pedras, 0, 0)
    t.colar(base, 0, 0)
    if brasa:
        for (x, y) in ((9, 21), (11, 22), (13, 21), (15, 22), (10, 22), (14, 22)):
            t.p(x, y, FOGO[3] if (x + y) % 3 else FOGO[4])


def chama(t: Tela, quadro: int) -> None:
    """Chama em camadas (borda vermelha → miolo quase branco), balançando de um quadro para o outro."""
    altura = [17, 18, 16, 18][quadro]
    balanco = [0.0, 1.0, 0.3, -0.9][quadro]
    base_y, centro = 21, 11.5
    for y in range(base_y, base_y - altura, -1):
        h = (base_y - y) / altura  # 0 na base, 1 no topo
        meia = 6.4 * math.sin(math.pi * min(1.0, 0.18 + h * 0.95)) ** 0.9 * (1 - h) ** 0.35
        cx = centro + balanco * h * h * 2.2 + math.sin(h * 6 + quadro * 1.7) * 0.6 * h
        for x in range(24):
            d = abs(x + 0.5 - cx) / max(meia, 0.01)
            if d > 1:
                continue
            if d < 0.38 and h < 0.42:
                c = FOGO[4]
            elif d < 0.62 and h < 0.66:
                c = FOGO[3]
            elif d < 0.86 and h < 0.86:
                c = FOGO[2]
            elif d < 0.97:
                c = FOGO[1]
            else:
                c = FOGO[0]
            t.p(x, y, c)
    # línguas soltas e faíscas, diferentes em cada quadro
    linguas = [((7, 9), (16, 7)), ((6, 8), (15, 10)), ((8, 7), (15, 8)), ((7, 10), (17, 9))][quadro]
    for (x, y) in linguas:
        t.p(x, y, FOGO[1]); t.p(x, y - 1, FOGO[0])
    faiscas = [((5, 4), (18, 2)), ((17, 4), (8, 1)), ((4, 2), (19, 5)), ((15, 1), (6, 5))][quadro]
    for (x, y) in faiscas:
        t.p(x, y, FOGO[3])


def fogueira(quadro: int) -> Tela:
    t = Tela(24, 28)
    lenha(t, brasa=True)
    fogo = Tela(24, 28)
    chama(fogo, quadro)
    t.colar(fogo, 0, 0)
    return t


def fogueira_apagada() -> Tela:
    t = Tela(24, 28)
    lenha(t, brasa=False)
    for (x, y) in ((10, 21), (13, 22)):
        t.p(x, y, "#c0562a")
    for i, (x, y) in enumerate(((12, 18), (11, 16), (12, 14), (13, 12), (12, 10), (11, 8))):
        t.p(x, y, FUMACA[i % 2], 200 - i * 25)
        t.p(x + 1, y, FUMACA[(i + 1) % 2], 150 - i * 20)
    return t


def chama_pequena(t: Tela, ox: int, oy: int, forte: bool) -> None:
    desenho = [
        "....1.......",
        "...121......",
        "...1221.....",
        "..122321....",
        "..1233321...",
        ".12334321...",
        ".12344321...",
        ".12344321...",
        "..123321....",
        "...1111.....",
    ]
    paleta = {"1": FOGO[0] if forte else "#9a3b20", "2": FOGO[1], "3": FOGO[2] if forte else FOGO[1], "4": FOGO[4] if forte else FOGO[3]}
    for y, linha_ in enumerate(desenho):
        for x, ch in enumerate(linha_):
            if ch in paleta:
                t.p(ox + x + 1, oy + y + 1, paleta[ch])


def dias() -> Image.Image:
    folha = Tela(48, 12)
    # 0: dia feito (chama firme)
    chama_pequena(folha, 0, 0, forte=True)
    # 1: hoje aceso (chama com brilho)
    chama_pequena(folha, 12, 0, forte=True)
    for (x, y) in ((13, 2), (22, 3), (21, 0)):
        folha.p(x, y, OURO["clara"])
    # 2: hoje esperando (brasa)
    for (x, y, c) in ((16, 8, FOGO[1]), (17, 8, FOGO[2]), (18, 8, FOGO[1]), (17, 7, FOGO[3]), (15, 9, LENHA["media"]), (16, 9, LENHA["clara"]),
                      (17, 9, LENHA["media"]), (18, 9, LENHA["clara"]), (19, 9, LENHA["media"])):
        folha.p(x + 12 - 12 + 12, y, c) if False else folha.p(x + 12, y, c)
    # 3: dia sem estudo (cinza fria)
    for (x, y, c) in ((40, 8, "#7a858b"), (41, 8, "#a9b4b9"), (42, 8, "#7a858b"), (39, 9, "#4e575c"), (40, 9, "#7a858b"), (41, 9, "#4e575c"),
                      (42, 9, "#7a858b"), (43, 9, "#4e575c"), (41, 6, "#8a9296"), (42, 4, "#8a9296")):
        folha.p(x, y, c)
    return folha.img


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
    folha = Image.new("RGBA", (24 * 4, 28), (0, 0, 0, 0))
    for q in range(4):
        folha.alpha_composite(fogueira(q).img, (24 * q, 0))
    folha.save(PASTA / "fogueira.png", optimize=True)
    fogueira_apagada().img.save(PASTA / "fogueira-apagada.png", optimize=True)
    dias().save(PASTA / "dias.png", optimize=True)
    prova().img.save(PASTA / "prova.png", optimize=True)
    for nome in sorted(PASTA.glob("*.png")):
        print(nome.relative_to(PASTA.parents[2]), Image.open(nome).size, f"{nome.stat().st_size} bytes")


if __name__ == "__main__":
    main()
