"""Sprites animados do topo da página inicial (30/10/2026), feitos do zero por este script (nada baixado nem de IA).

Gera em public/pixel/inicio/:
- esqueleto.png: o esqueleto de touca cirúrgica sentado no tronco, lendo (2 quadros) e cochilando (2 quadros), 26 x 32 cada;
- fogo.png: a fogueira da sequência, 8 estágios (linhas, na ordem de estagiosFogueira.ts) x 6 quadros, 40 x 48 cada;
- tocha.png: a tocha dos dias da semana, 3 estados (acesa, fraca, apagada) x 4 quadros, 14 x 30 cada.
O CSS amplia com image-rendering: pixelated.
Uso: python3 scripts/gerar_sprites_inicio.py
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"


def cor(h: str, a: int = 255) -> tuple[int, int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


# ─────────────────────────────── Esqueleto ───────────────────────────────
PALETA_ESQ = {"k": "#1b1208", "w": "#f4ecd8", "W": "#c8bca2", "d": "#8a7e6a", "g": "#4fa08a", "G": "#7cc8b0", "r": "#8a3a2a",
              "p": "#fbf3df", "P": "#d8cdb0", "t": "#6a5a48", "z": "#2a1f14"}
CABECA = [
    "..........kkkkkkk.........",
    ".........kgGggggggk.......",
    "........kgGgggggggggk.....",
    "........kkkkkkkkkkkkk.....",
    "........kwwwwwwwwwwWk.....",
]
OLHOS_ABERTOS = [
    ".......kwwkkkwwwkkkwWk....",
    ".......kwwkzkwwwkzkwWk....",
]
OLHOS_FECHADOS = [
    ".......kwwwwwwwwwwwwWk....",
    ".......kwwkkkwwwkkkwWk....",
]
ROSTO = [
    ".......kwwwwwwkwwwwwWk....",
    "........kwwwwwwwwwwWk.....",
    "........kwkwkwkwkwkWk.....",
    ".........kkwwwwwwWkk......",
    "............kwWk..........",
    "........kkkkkwWkkkkk......",
    ".......kwwkwkwWkwkwwk.....",
    "......kwWk.kwwwWk.kWwk....",
]
LIVRO_A = [
    ".....kkkkkkkkkkkkkkkkkk...",
    ".....krppppppppkpppppprk..",
    ".....krpttpttppkptpttprk..",
    ".....krppppppppkpppppprk..",
    ".....krpttpttppkpttpttrk..",
    ".....kkkkkkkkkkkkkkkkkkk..",
]
LIVRO_B = [  # a página da direita virando
    ".....kkkkkkkkkkkkkkkk.....",
    ".....krppppppppkppppkk....",
    ".....krpttpttppkpPPPPk....",
    ".....krppppppppkpPPPPPk...",
    ".....krpttpttppkkkkkkkkk..",
    ".....kkkkkkkkkkk..........",
]
PERNAS = [
    "..........kwwwwWWk........",
    ".........kwwkkkkwwk.......",
    ".......kkwwk....kwwkk.....",
    "....kkwwwwk......kwwwwkk..",
    "....kwWkkk........kkkWwk..",
    "....kwk..............kwk..",
    "....kwk..............kwk..",
    "...kwwWk............kwwWk.",
    "...kkkkk............kkkkk.",
]


def grade_para_img(linhas: list[str], paleta: dict[str, str], largura: int, altura: int) -> Image.Image:
    img = Image.new("RGBA", (largura, altura), (0, 0, 0, 0))
    topo = altura - len(linhas)
    for y, linha in enumerate(linhas):
        for x, c in enumerate(linha[:largura]):
            if c != "." and c in paleta:
                img.putpixel((x, topo + y), cor(paleta[c]))
    return img


def esqueleto() -> Image.Image:
    quadros = [
        CABECA + OLHOS_ABERTOS + ROSTO + LIVRO_A + PERNAS,
        CABECA + OLHOS_ABERTOS + ROSTO + LIVRO_B + PERNAS,
        ["." * 26] + CABECA + OLHOS_FECHADOS + ROSTO[:-1] + LIVRO_A + PERNAS,
        CABECA + OLHOS_FECHADOS + ROSTO + LIVRO_A + PERNAS,
    ]
    w, h = 26, 32
    folha = Image.new("RGBA", (w * len(quadros), h), (0, 0, 0, 0))
    for i, q in enumerate(quadros):
        folha.alpha_composite(grade_para_img(q, PALETA_ESQ, w, h), (i * w, 0))
    return folha


# ─────────────────────────────── Fogo ───────────────────────────────
# (miolo, meio, borda, ponta) e tamanho (raio, altura) por estágio, na ordem de estagiosFogueira.ts.
ESTAGIOS = [
    ("cinzas", ("#ffb08a", "#c0503a", "#5a3a34", "#3a3a40"), (5, 4)),
    ("faisca", ("#fff2b0", "#ffb040", "#e0602a", "#a0301a"), (6, 12)),
    ("fogueira", ("#fff6c8", "#ffc048", "#f07a2a", "#c0401c"), (8, 20)),
    ("labareda", ("#fffbe0", "#ffd050", "#ff8a2a", "#d0441c"), (10, 27)),
    ("fogareu", ("#ffffff", "#ffe070", "#ff9a30", "#e05020"), (12, 34)),
    ("azul", ("#ffffff", "#bfe8ff", "#4aa0ff", "#2050c8"), (12, 34)),
    ("arcana", ("#ffffff", "#f0c8ff", "#b060f0", "#6a20b0"), (13, 36)),
    ("lendaria", ("#ffffff", "#fff2a0", "#ffc830", "#e08a10"), (14, 40)),
]


def fogo() -> Image.Image:
    w, h, n = 40, 48, 6
    folha = Image.new("RGBA", (w * n, h * len(ESTAGIOS)), (0, 0, 0, 0))
    for e, (nome, (miolo, meio, borda, ponta), (r, alt)) in enumerate(ESTAGIOS):
        for q in range(n):
            img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            rnd = random.Random(e * 100 + q)
            base_y = h - 6
            fase = q / n * math.tau
            linhas: dict[int, dict[int, str]] = {}
            for x in range(-r - 1, r + 2):
                u = x / (r + 0.5)
                if abs(u) > 1:
                    continue
                # Línguas de fogo: ondas que sobem e trocam de lugar a cada quadro.
                onda = 0.72 + 0.18 * math.sin(fase + x * 0.9) + 0.12 * math.sin(fase * 2 - x * 0.45) + rnd.random() * 0.08
                hx = alt * (1 - u * u) ** 0.65 * onda
                for dy in range(int(hx)):
                    t = dy / max(hx, 1)
                    lado = abs(u)
                    c = miolo if t < 0.38 and lado < 0.45 else meio if t < 0.66 and lado < 0.75 else borda if t < 0.9 else ponta
                    linhas.setdefault(dy, {})[x] = c
            # A chama balança: cada linha inteira anda para o lado (sem abrir buracos no meio).
            for dy, cols in linhas.items():
                desvio = int(round(math.sin(fase + dy * 0.3) * min(2.5, dy / max(alt, 1) * 3)))
                for x, c in cols.items():
                    xx, yy = w // 2 + x + desvio, base_y - dy
                    if 0 <= xx < w and 0 <= yy < h:
                        img.putpixel((xx, yy), cor(c))
            # Faíscas soltas acima da chama.
            if nome != "cinzas":
                for k in range(2 + e // 2):
                    sx = w // 2 + int(rnd.gauss(0, r * 0.5))
                    sy = base_y - alt - 2 - int(((q + k * 2) % n) / n * 8)
                    if 0 <= sx < w and 0 <= sy < h:
                        img.putpixel((sx, sy), cor(meio))
            else:
                # Brasas: só um brilho baixo e fumaça.
                for k in range(3):
                    sy = base_y - 6 - ((q + k * 2) % n) * 2
                    sx = w // 2 - 1 + k + (q % 2)
                    if 0 <= sy < h:
                        img.putpixel((sx, sy), cor("#8a8a90", 160))
            folha.alpha_composite(img, (q * w, e * h))
    return folha


# ─────────────────────────────── Tocha ───────────────────────────────
def tocha() -> Image.Image:
    w, h, n = 14, 30, 4
    folha = Image.new("RGBA", (w * n, h * 3), (0, 0, 0, 0))
    for estado in range(3):
        for q in range(n):
            img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            # Cabo de madeira e o copo de ferro.
            for y in range(16, 30):
                for x in (6, 7):
                    img.putpixel((x, y), cor("#8a5a30" if x == 6 else "#5a3418"))
                img.putpixel((5, y), cor("#1b1208"))
                img.putpixel((8, y), cor("#1b1208"))
            for x in range(3, 11):
                for y in (13, 14, 15):
                    img.putpixel((x, y), cor("#5a5a62" if y == 13 else "#3a3a42"))
            for x in range(3, 11):
                img.putpixel((x, 12), cor("#1b1208"))
            img.putpixel((2, 13), cor("#1b1208")); img.putpixel((11, 13), cor("#1b1208"))
            img.putpixel((4, 13), cor("#8a8a94"))
            if estado < 2:
                alt = (11 if estado == 0 else 6) + (q % 2)
                pal = ("#fff6c8", "#ffc048", "#ff8a2a", "#d0441c") if estado == 0 else ("#ffd8a0", "#f0903a", "#b8502a", "#7a3020")
                for dy in range(alt):
                    t = dy / alt
                    meia = max(0, int((1 - t) * 3.4 + math.sin(q * 1.6 + dy) * 0.6))
                    desvio = int(math.sin(q * 1.3 + dy * 0.5) * t * 1.5)
                    for dx in range(-meia, meia + 1):
                        c = pal[0] if t < 0.35 and abs(dx) <= 1 else pal[1] if t < 0.6 else pal[2] if t < 0.85 else pal[3]
                        x, y = 7 + dx + desvio, 12 - dy
                        if 0 <= x < w and 0 <= y < h:
                            img.putpixel((x, y), cor(c))
            else:
                img.putpixel((6, 11), cor("#4a4a50")); img.putpixel((7, 11), cor("#3a3a40")); img.putpixel((7, 10 - q % 2), cor("#6a6a70", 140))
            folha.alpha_composite(img, (q * w, estado * h))
    return folha


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    for nome, img in (("esqueleto", esqueleto()), ("fogo", fogo()), ("tocha", tocha())):
        img.save(PASTA / f"{nome}.png", optimize=True)
        print(nome, img.size, (PASTA / f"{nome}.png").stat().st_size, "bytes")


if __name__ == "__main__":
    main()
