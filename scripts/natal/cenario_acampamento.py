"""O Natal do Acampamento (modo Natal, etapa 3, 21/11/2026): a mesma pintura do topo, com o Natal pintado dentro dela.

Pedido do Tales: o Natal dentro da cena, na mesma grade de pixel e com a luz da hora, nunca adesivo; pouca coisa e muito
bem feita; tudo o que acende ilumina em volta. As peças ficam no que a pintura deixa livre (o fogo, o esqueleto, os
pontos do gato e da coruja e o lado do texto ficam limpos):
- um fio de lâmpadas da ponta da barraca até o galho do lampião, alto, por cima da fogueira e da cabeça do esqueleto;
- uma guirlanda pequena na frente da barraca, em cima da porta, e um laço vermelho no lampião;
- dois presentes ao lado dos caixotes;
- um pinheirinho enfeitado no gramado da direita, com estrela e luzinhas, jogando luz na grama.
Cada peça é pintada na grade de 480 x 200 (a da cena), ampliada 3x e iluminada como os objetos da cena: céu e sol da hora
(PERIODOS de gerar_cena_inicio.py), a luz da fogueira de lado e, por cima, o brilho das lâmpadas, que também clareia a
pintura em volta delas.
Saídas: public/pixel/inicio/cena-natal-{manha,tarde,noite}[-960].webp. Uso: python3 scripts/natal/cenario_acampamento.py
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
from gerar_cena_inicio import (  # noqa: E402
    ESC, GXa, GYa, H, PERIODOS, W, XA, YA, Camada, ampliar, desfocar, hexa, luz_em_degraus, luz_pontual, pal, poli, pontilhar, ruido)

PASTA = RAIZ / "public" / "pixel" / "inicio"
FOGO = (240, 146)

PINHO = pal("#050f0b", "#081a12", "#0d2418", "#12301e", "#183c24", "#1f4a2a", "#285a30", "#336c36", "#43803e", "#5a9648")
VERMELHO = pal("#2c0608", "#4a0c10", "#6e1418", "#941e22", "#b82c2c", "#d8443a", "#f06a54", "#ff9a7c")
OURO = pal("#4a2c08", "#6e4612", "#94641c", "#b8862a", "#d8a83c", "#f0c85a", "#ffe28a", "#fff4c8")
VERDETE = pal("#03241f", "#063a32", "#0a5044", "#00806f", "#1a9a86", "#46b8a4")
CREME = pal("#8a7a5a", "#b8a682", "#d8c8a4", "#f2e8cc", "#fff8e6")
COBRE = pal("#1a0e08", "#3a1e10", "#62341a", "#8a5028", "#b07038")
LUZES = ("#ff6a50", "#ffc050", "#60f0b0", "#70a8ff", "#ffe0a0")


def tom(paleta, v):
    return paleta[int(np.clip(v, 0, 0.999) * len(paleta))]


def h01(*v) -> float:
    n = 0
    for i, x in enumerate(v):
        n = (n * 73856093) ^ (int(x) * 19349663 + i * 83492791)
    n = (n ^ (n >> 13)) * 1274126177
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535


# ─────────────────────────────── as peças
def fio(c: Camada, e: Camada) -> list:
    """O fio de cobre da ponta da barraca ao galho do lampião, numa curva com barriga, e uma lâmpada a cada 6 px."""
    a, b = (198.0, 106.0), (317.0, 64.0)
    pts = []
    n = 400
    for i in range(n + 1):
        t = i / n
        x = a[0] + (b[0] - a[0]) * t
        y = a[1] + (b[1] - a[1]) * t + 9.0 * math.sin(math.pi * t)
        c.p(x, y, tom(COBRE, 0.55 if int(x) % 3 == 0 else 0.3))
    k = 0
    x = a[0] + 6
    while x < b[0] - 4:
        t = (x - a[0]) / (b[0] - a[0])
        y = a[1] + (b[1] - a[1]) * t + 9.0 * math.sin(math.pi * t)
        cor = LUZES[k % len(LUZES)]
        c.p(x, y + 1, "#0c2216")                                                        # soquete
        c.p(x, y + 2, cor); c.p(x, y + 3, hexa(cor) * 0.7)
        e.p(x, y + 2, cor); e.p(x, y + 3, cor, 0.6)
        pts.append((x, y + 2.5, cor, k % 2))
        k += 1
        x += 6
    return pts


def guirlanda(c: Camada, e: Camada, cx: int, cy: int) -> list:
    """Coroa de 9 px: anel de pinho pontilhado com luz de cima à esquerda, frutinhas e o laço embaixo."""
    pts = []
    for y in range(cy - 5, cy + 6):
        for x in range(cx - 5, cx + 6):
            d = math.hypot(x - cx, y - cy)
            if 2.2 <= d <= 4.8:
                v = 0.5 - (x - cx) * 0.05 - (y - cy) * 0.06 + (h01(x, y, 3) - 0.5) * 0.3
                c.p(x, y, tom(PINHO, v))
    for (dx, dy) in ((-3, -2), (3, -1), (-1, -4)):
        c.p(cx + dx, cy + dy, tom(VERMELHO, 0.8))
    for (dx, dy, v) in ((-2, 4, 0.7), (-1, 4, 0.6), (0, 4, 0.85), (1, 4, 0.5), (2, 4, 0.45), (-1, 5, 0.4), (1, 5, 0.3), (-2, 6, 0.35), (2, 6, 0.25)):
        c.p(cx + dx, cy + dy, tom(VERMELHO, v))
    for (dx, dy, cor) in ((2, -3, "#ffd27a"), (-4, 1, "#ffe9a6"), (4, 2, "#ffb04a")):
        c.p(cx + dx, cy + dy, cor); e.p(cx + dx, cy + dy, cor, 0.8)
        pts.append((cx + dx, cy + dy, cor, 0))
    return pts


def laco(c: Camada, cx: int, cy: int) -> None:
    for (dx, dy, v) in ((-2, -1, 0.75), (-1, -1, 0.6), (-2, 0, 0.5), (1, -1, 0.55), (2, -1, 0.45), (2, 0, 0.35), (0, 0, 0.85),
                        (-1, 1, 0.45), (-1, 2, 0.35), (1, 1, 0.35), (1, 2, 0.25)):
        c.p(cx + dx, cy + dy, tom(VERMELHO, v))


def presentes(c: Camada) -> None:
    """Dois presentes encostados nos caixotes: papel com estampa, tampa, fita em cruz e laço."""
    for (px, pw, ph, papel, fita, est) in ((141, 9, 7, VERMELHO, OURO, "bolas"), (150, 6, 5, VERDETE, CREME, "listras")):
        base = 150
        py = base - ph
        for y in range(py, base):
            for x in range(px, px + pw):
                u = (x - px) / (pw - 1)
                v = 0.62 - 0.4 * u
                cor = tom(papel, v)
                if est == "bolas" and (x + 2 * y) % 4 == 0 and y % 2 == 0:
                    cor = tom(OURO, 0.75 - 0.3 * u)
                if est == "listras" and (x + y) % 3 == 0:
                    cor = tom(CREME, 0.7 - 0.3 * u)
                c.p(x, y, cor)
        for x in range(px - 1, px + pw + 1):
            c.p(x, py - 1, tom(papel, 0.85 if x < px + pw / 2 else 0.6))
        mx = px + pw // 2
        for y in range(py - 1, base):
            c.p(mx, y, tom(fita, 0.7))
        for x in range(px - 1, px + pw + 1):
            c.p(x, py + ph // 2, tom(fita, 0.6 if x < mx else 0.45))
        for (dx, dy, v) in ((-2, -2, 0.85), (-1, -3, 0.9), (1, -3, 0.7), (2, -2, 0.6), (0, -2, 0.95)):
            c.p(mx + dx, py + dy, tom(fita, v))
        for x in range(px - 1, px + pw + 1):                                            # sombra de contato
            c.p(x, base, "#0a0806", 0.45)


def pinheirinho(c: Camada, e: Camada, cx: int, yb: int, alt: int) -> list:
    """Pinheiro pequeno em quatro saias de galhos pendentes (polígono por saia, pontilhado, sombra da saia de cima),
    estrela, luzinhas em espiral, algumas bolas e o tronquinho."""
    pts = []
    textura = ruido(301, 2.0) * 0.6 + ruido(302, 4.0) * 0.4
    topo = yb - alt
    saias = 5
    for i in reversed(range(saias)):
        y0 = topo + 3 + (alt - 8) * i / saias - 2
        y1 = topo + 3 + (alt - 8) * (i + 1) / saias + 1
        meia = 3 + 12 * ((i + 1) / saias) ** 0.9
        pontas = []
        n = 3 + i
        for j in range(n + 1):
            u = -1 + 2 * j / n
            pontas.append((cx + u * meia, y1 + abs(u) ** 1.6 * 1.5))
        contorno = [(cx, y0)]
        for j, (x, y) in enumerate(pontas):
            contorno.append((x, y))
            if j < n:
                contorno.append(((x + pontas[j + 1][0]) / 2, min(y, pontas[j + 1][1]) - 1.4))
        m = poli(contorno)
        k = np.clip((YA - y0) / max(1, y1 - y0), 0, 1)
        u = np.clip((XA - cx) / meia, -1.2, 1.2)
        v = 0.54 + 0.2 * (1 - k) - 0.26 * u + (textura - 0.5) * 0.28
        antes = c.c[:, :, 3] > 0
        c.mascara(m, PINHO[pontilhar(np.clip(v * 1.02 + 0.04, 0, 1), len(PINHO), 0.85)])
        sombra = np.roll(m, 1, 0) & ~m & antes & (YA > y0)
        c.c[sombra, :3] *= 0.45
    for y in range(yb - 4, yb + 1):                                                     # tronquinho
        c.p(cx, y, "#4a3018"); c.p(cx + 1, y, "#2e1c0e")
    # luzinhas em espiral (só na frente)
    for s in range(60):
        t = s / 60
        y = topo + 5 + t * (alt - 10)
        larg = 2 + (y - topo) / alt * 9
        fase = t * math.tau * 2.4
        if math.cos(fase) < 0.1:
            continue
        x = cx + math.sin(fase) * larg * 0.85
        if s % 3 == 0:
            cor = LUZES[(s // 3) % len(LUZES)]
            c.p(x, y, cor); e.p(x, y, cor)
            pts.append((x, y, cor, s % 2))
    for (dx, dy, cor) in ((-4, 13, "#c8262c"), (4, 19, "#d8a028"), (-7, 26, "#2a5ac8"), (6, 30, "#c8262c"), (-2, 33, "#d8a028"), (1, 9, "#2a5ac8")):
        x, y = cx + dx, topo + dy
        c.p(x, y, cor); c.p(x + 1, y, hexa(cor) * 0.6); c.p(x, y + 1, hexa(cor) * 0.55); c.p(x, y - 1 + 0, hexa(cor) * 1.2 if False else cor)
        c.p(x, y, np.clip(hexa(cor) * 1.25, 0, 255))
    # estrela
    sx, sy = cx, topo + 1
    for (dx, dy, v) in ((0, -2, 0.85), (0, -1, 0.95), (-1, 0, 0.9), (0, 0, 1.0), (1, 0, 0.7), (-2, 0, 0.75), (2, 0, 0.55), (-1, 1, 0.7), (1, 1, 0.5),
                        (0, 1, 0.8), (-1, 2, 0.5), (1, 2, 0.4)):
        c.p(sx + dx, sy + dy, tom(OURO, v)); e.p(sx + dx, sy + dy, tom(OURO, v), 0.9)
    pts.append((sx, sy, "#ffe08a", 0)); pts.append((sx, sy, "#ffe08a", 1))
    for x in range(cx - 13, cx + 14):                                                   # sombra no chão
        u = (x - cx) / 13
        c.p(x, yb + 1, "#06100a", 0.5 * (1 - u * u))
    return pts


# ─────────────────────────────── montagem
def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    base = np.asarray(Image.open(PASTA / f"cena-{nome}.webp").convert("RGB"), np.float32) / 255
    c, e = Camada(), Camada()
    pts = fio(c, e)
    pts += guirlanda(c, e, 200, 122)
    laco(c, 322, 67)
    presentes(c)
    pts += pinheirinho(c, e, 396, 162, 44)

    amb, sol = hexa(per["amb"]) * per["amb_k"], hexa(per["sol"]) * per["sol_k"]
    a = ampliar(c.c)
    lado = np.clip(1 - np.hypot(GXa - FOGO[0], (GYa - FOGO[1] + 10) * 1.3) / 150, 0, 1) ** 1.6 * per["fogo_k"]
    luz = (amb + sol * 0.85)[None, None, :] + lado[:, :, None] * hexa("#ffa850") * 0.6
    k_l = {"manha": 0.55, "tarde": 0.85, "noite": 1.3}[nome]
    for (x, y, cor, _) in pts:
        luz = luz + luz_pontual(x, y, 4.0)[:, :, None] * hexa(cor) * 0.6 * k_l
    rgb = a[:, :, :3] * luz
    img = base * (1 - a[:, :, 3:4]) + rgb * a[:, :, 3:4]
    # a luz das lâmpadas na pintura em volta: halos pequenos e uma poça larga e fraca no gramado embaixo do pinheiro
    poca = luz_em_degraus(396, 164, 30, 0.38, 11) * 0.5 + luz_em_degraus(258, 98, 40, 0.5, 12) * 0.18
    img = img + poca[:, :, None] * hexa("#ffcf80") * 0.35 * k_l
    for (x, y, cor, _) in pts:
        img = img + luz_pontual(x, y + 2, 7.5)[:, :, None] * hexa(cor) * 0.18 * k_l
    emi = ampliar(e.c)
    emi_rgb = emi[:, :, :3] * emi[:, :, 3:4]
    img = img + (emi_rgb * 0.9 + desfocar(emi_rgb, 3) * 0.9 + desfocar(emi_rgb, 10) * 0.55) * k_l
    for (x, y, cor, _) in pts:                                                          # estrelinha em cruz
        X, Y = int(x * ESC + 1), int(y * ESC + 1)
        for d in range(-3, 4):
            kk = (1 - abs(d) / 4) ** 2 * 0.35 * k_l
            if 0 <= Y + d < H * ESC and 0 <= X + d < W * ESC:
                img[Y + d, X] += hexa(cor) * kk
                img[Y, X + d] += hexa(cor) * kk
    joelho = 0.8
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    return Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))


def main() -> None:
    for nome in sys.argv[1:] or ["manha", "tarde", "noite"]:
        im = montar(nome)
        im.save(PASTA / f"cena-natal-{nome}.webp", quality=84, method=6)
        im.resize((960, 400), Image.LANCZOS).save(PASTA / f"cena-natal-{nome}-960.webp", quality=84, method=6)
        print(nome, (PASTA / f"cena-natal-{nome}.webp").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
