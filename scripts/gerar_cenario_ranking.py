"""Cenário em pixel art do pódio do ranking: céu noturno, montanhas, castelo e tochas.

Gera public/ranking/arena.png (paisagem 160x80 ampliada 4x) e
public/ranking/tocha.png (12x24 ampliada 4x). Uso: python3 scripts/gerar_cenario_ranking.py
"""
from __future__ import annotations

import math
import random
import struct
import zlib
from pathlib import Path

PASTA = Path(__file__).resolve().parents[1] / "public" / "ranking"


def hexa(c: str, a: int = 255) -> tuple[int, int, int, int]:
    return int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), a


def gravar(caminho: Path, px: list[list[tuple[int, int, int, int]]], escala: int = 4) -> None:
    dados = bytearray()
    for linha in px:
        bruta = b"".join(bytes(p) * escala for p in linha)
        for _ in range(escala):
            dados += b"\x00" + bruta

    def bloco(tipo: bytes, conteudo: bytes) -> bytes:
        return struct.pack(">I", len(conteudo)) + tipo + conteudo + struct.pack(">I", zlib.crc32(tipo + conteudo) & 0xFFFFFFFF)

    w, h = len(px[0]) * escala, len(px) * escala
    png = b"\x89PNG\r\n\x1a\n" + bloco(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    caminho.write_bytes(png + bloco(b"IDAT", zlib.compress(bytes(dados), 9)) + bloco(b"IEND", b""))


def arena() -> None:
    W, H = 160, 80
    random.seed(7)
    ceu = ["#04110f", "#061a17", "#08231f", "#0b2e29", "#0d3a34", "#104640"]
    px = [[hexa("#000000")] * W for _ in range(H)]
    for y in range(H):
        banda = min(len(ceu) - 1, y * len(ceu) // 52)
        for x in range(W):
            # Pontilhado entre faixas, como nos jogos antigos.
            prox = min(len(ceu) - 1, banda + 1)
            frac = (y * len(ceu) / 52) - banda
            c = ceu[prox] if (x + y) % 2 == 0 and frac > 0.6 else ceu[banda]
            px[y][x] = hexa(c)
    for _ in range(70):
        x, y = random.randrange(W), random.randrange(40)
        px[y][x] = hexa(random.choice(["#fff4cf", "#d2fbef", "#ffffff", "#8fb8b0"]))
    for (x, y) in ((22, 9), (131, 14), (88, 6)):
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            px[y + dy][x + dx] = hexa("#fff4cf")
    # Lua com crateras.
    for y in range(4, 20):
        for x in range(132, 150):
            d = math.hypot(x - 141, y - 12)
            if d <= 7.5:
                px[y][x] = hexa("#f5e9c4" if d < 6.5 else "#d9c99a")
    for (x, y) in ((139, 10), (144, 14), (138, 15)):
        px[y][x] = hexa("#d9c99a")

    def montanha(base: int, pico: int, cx: int, larg: int, cor: str, neve: bool) -> None:
        for x in range(cx - larg, cx + larg + 1):
            if 0 <= x < W:
                topo = pico + abs(x - cx) * (base - pico) // larg
                for y in range(max(0, topo), H):
                    px[y][x] = hexa(cor)
                if neve and topo < pico + 4:
                    for y in range(topo, min(H, topo + 2)):
                        px[y][x] = hexa("#cfe6e0")

    for cx, pico, larg in ((20, 30, 34), (70, 24, 40), (120, 28, 36), (160, 34, 30)):
        montanha(64, pico, cx, larg, "#123d37", True)
    for cx, pico, larg in ((0, 44, 30), (50, 40, 34), (105, 42, 32), (150, 46, 26)):
        montanha(70, pico, cx, larg, "#0a2b27", False)
    # Castelo ao fundo, no centro.
    def ret(x0: int, y0: int, x1: int, y1: int, cor: str) -> None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if 0 <= x < W and 0 <= y < H:
                    px[y][x] = hexa(cor)
    muro = "#071f1c"
    ret(64, 40, 96, 60, muro)
    for x0 in (60, 76, 92):
        ret(x0, 30 if x0 != 76 else 24, x0 + 8, 60, muro)
        for xa in range(x0, x0 + 9, 2):
            ret(xa, (28 if x0 != 76 else 22), xa, (29 if x0 != 76 else 23), muro)
    for (x, y) in ((63, 36), (79, 30), (95, 36), (70, 46), (88, 46)):
        ret(x, y, x + 1, y + 2, "#f4cf7c")
    # Bandeiras douradas no alto das torres.
    for x, y in ((64, 22), (80, 16), (96, 22)):
        ret(x, y, x, y + 7, "#5c3415")
        ret(x + 1, y, x + 4, y + 2, "#e8b34f")
    # Chão de pedra.
    for y in range(66, H):
        for x in range(W):
            tijolo = (y - 66) % 5 == 0 or (x + (8 if ((y - 66) // 5) % 2 else 0)) % 16 == 0
            px[y][x] = hexa("#24302e" if tijolo else "#3a4744")
    PASTA.mkdir(parents=True, exist_ok=True)
    gravar(PASTA / "arena.png", px)


def tocha() -> None:
    W, H = 12, 24
    vazio = (0, 0, 0, 0)
    px = [[vazio] * W for _ in range(H)]

    def p(x: int, y: int, c: str) -> None:
        if 0 <= x < W and 0 <= y < H:
            px[y][x] = hexa(c)

    chama = [
        "....#.......",
        "....##......",
        "...###......",
        "...#oo#.....",
        "..#oooo#....",
        "..#oyyo##...",
        ".#ooyyyo#...",
        ".#oyyyyo#...",
        "..#oyyo#....",
        "...####.....",
    ]
    cores = {"#": "#c2410c", "o": "#f97316", "y": "#fde68a"}
    for j, linha in enumerate(chama):
        for i, ch in enumerate(linha):
            if ch in cores:
                p(i + 1, j, cores[ch])
    for y in range(10, 12):
        for x in range(2, 10):
            p(x, y, "#94a3b8" if y == 10 else "#475569")
    for y in range(12, 24):
        for x in range(5, 7):
            p(x, y, "#8a5226" if x == 5 else "#5c3415")
    for x in range(3, 9):
        p(x, 16, "#475569")
    gravar(PASTA / "tocha.png", px)


if __name__ == "__main__":
    arena()
    tocha()
    print("cenário gerado")
