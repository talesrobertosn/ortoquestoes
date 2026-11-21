"""O fim da página inicial no modo Natal (21/11/2026): o boneco de neve, a caneca de chocolate quente e a lanterna.

Pedido do Tales: equilíbrio (não tudo em cima) e conforto: "chocolate quente, friozinho, aconchego". A peça fica de
pé na borda entre o último cartão e o rodapé. Tudo original, na técnica das cenas (pontilhado, luz calculada):
- o monte de neve com sombra azul e brilho quente do lado da lanterna, pegadinhas e cristais;
- o boneco em três bolas com volume (oclusão onde uma encosta na outra), botões e olhos de carvão, nariz de cenoura,
  gorro de tricô vermelho com barra e pompom, cachecol verde-azulado do site com listras creme e franja, braços de
  galho com a forquilha;
- a caneca de cerâmica vermelha com a faixa de flocos, o chocolate com marshmallows (o vapor sobe no CSS);
- a lanterna de ferro com a vela acesa, que ilumina a neve, o boneco e a caneca.
Saídas: boneco.png, boneco-luz.png, boneco-vapor.png. Uso: python3 scripts/natal/boneco.py
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

from hd2d import ESC, H, W, Camada, camada_de_luz, desfocar, hexa, h01, iluminar, luz_pontual, pal, salvar_rgba, tom

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gerar_cena_inicio import XA, YA, poli, pontilhar, ruido  # noqa: E402

NEVE = pal("#3a4868", "#566688", "#7888aa", "#9cacc8", "#bccae0", "#d8e2f0", "#eef3fa", "#ffffff")
VERMELHO = pal("#2c0608", "#4a0c10", "#6e1418", "#941e22", "#b82c2c", "#d8443a", "#f06a54", "#ff9a7c")
VERDETE = pal("#03241f", "#063a32", "#0a5044", "#00806f", "#1a9a86", "#46b8a4", "#86d8c8")
CREME = pal("#8a7a5a", "#b8a682", "#d8c8a4", "#f2e8cc", "#fff8e6")
MADEIRA = pal("#1e120a", "#30200f", "#463018", "#5e4222", "#7a582e", "#94703c", "#ae8a4e", "#c8a468")
CENOURA = pal("#6a2a06", "#a8480e", "#e07018", "#ff9a3a", "#ffc070")
CARVAO = pal("#08080a", "#16161a", "#2a2a30", "#44444c")
FERRO = pal("#16181c", "#262a30", "#3a3f46", "#566068", "#7c868c", "#a8b0b4")
CHOCOLATE = pal("#1e0c06", "#3a1a0c", "#5a2c14", "#7a4222", "#9a5a34")

CX, CHAO = 120, 150            # o meio do boneco e a linha do chão (topo do monte de neve na frente)
LANTERNA = (CX + 21, CHAO - 2)  # a base da lanterna
CANECA = (CX - 22, CHAO - 1)    # a base da caneca


def bola(c: Camada, cx, cy, r, textura, luz_lampada) -> np.ndarray:
    """Bola de neve com volume: luz de cima à esquerda, sombra azul embaixo à direita, borda de luz quente do lado da
    lanterna, cristais que brilham e um contorno irregular (neve socada à mão)."""
    ang = np.arctan2(YA - cy, XA - cx)
    rr = r * (1 + 0.05 * np.sin(ang * 5 + r) + 0.03 * (textura - 0.5))
    d = np.hypot(XA - cx, YA - cy)
    m = d <= rr
    nx, ny = (XA - cx) / r, (YA - cy) / r
    nz = np.sqrt(np.clip(1 - nx ** 2 - ny ** 2, 0, 1))
    lam = np.clip(-0.55 * nx - 0.6 * ny + 0.6 * nz, 0, 1)
    v = 0.2 + 0.7 * lam + (textura - 0.5) * 0.12
    c.mascara(m, NEVE[pontilhar(np.clip(v, 0, 1), len(NEVE), 0.8)])
    return m


def main() -> None:
    c, e = Camada(), Camada()
    textura = ruido(91, 2.5) * 0.6 + ruido(92, 6) * 0.4
    pts = []

    # ── o monte de neve (largo, baixo, com a frente arredondada)
    monte = ((XA - CX) / 40) ** 2 + ((YA - (CHAO + 3)) / 6.5) ** 2 <= 1
    monte &= YA <= CHAO + 7
    v = 0.58 - (YA - CHAO) * 0.05 + (textura - 0.5) * 0.16 - np.clip((XA - CX) / 80, -0.1, 0.2)
    c.mascara(monte, NEVE[pontilhar(np.clip(v, 0, 1), len(NEVE), 0.8)])
    for x in range(CX - 38, CX + 39):                                                     # a quina de cima, mais clara
        for y in range(CHAO - 4, CHAO + 8):
            if monte[y, x]:
                c.p(x, y, tom(NEVE, 0.82 - abs(x - CX) * 0.004)); break
    for (px, py) in ((CX - 30, CHAO + 3), (CX - 26, CHAO + 5), (CX + 30, CHAO + 4)):       # pegadinhas
        c.p(px, py, tom(NEVE, 0.3)); c.p(px + 1, py, tom(NEVE, 0.4))

    # ── o boneco: três bolas, de baixo para cima
    b1 = bola(c, CX, CHAO - 9, 10.5, textura, None)
    b2 = bola(c, CX + 0.5, CHAO - 24, 7.6, textura, None)
    # oclusão onde a bola de cima encosta na de baixo
    enc = b1 & (np.hypot(XA - (CX + 0.5), YA - (CHAO - 24)) < 9.2) & ~b2
    c.c[enc, :3] *= 0.7
    b3 = bola(c, CX + 1, CHAO - 35.5, 5.6, textura, None)
    enc = b2 & (np.hypot(XA - (CX + 1), YA - (CHAO - 35.5)) < 7.0) & ~b3
    c.c[enc, :3] *= 0.72
    # cristais
    for _ in range(40):
        x, y = CX - 10 + h01(_, 1) * 20, CHAO - 42 + h01(_, 2) * 40
        if c.c[int(y), int(x), 3] > 0 and h01(_, 3) < 0.5:
            c.p(x, y, "#ffffff")

    # ── rosto: olhos de carvão, nariz de cenoura apontando para a lanterna, boquinha de carvão
    hx, hy = CX + 1, CHAO - 35.5
    for (dx, dy) in ((-2, -1), (2, -1)):
        c.p(hx + dx, hy + dy, CARVAO[0]); c.p(hx + dx - 1, hy + dy, CARVAO[0]); c.p(hx + dx, hy + dy + 1, CARVAO[1]); c.p(hx + dx - 1, hy + dy + 1, CARVAO[0])
        c.p(hx + dx - 1, hy + dy, CARVAO[3])
    for k in range(5):
        c.p(hx + 1 + k, hy + 1, tom(CENOURA, 0.85 - k * 0.15));
        if k < 3:
            c.p(hx + 1 + k, hy + 2, tom(CENOURA, 0.4 - k * 0.1))
    for (dx, dy) in ((-2, 3), (-1, 4), (0, 4), (1, 4)):
        c.p(hx + dx, hy + dy, CARVAO[2])
    # botões de carvão
    for dy in (-27, -22, -17):
        c.p(CX, CHAO + dy, CARVAO[1]); c.p(CX - 1, CHAO + dy, CARVAO[2]); c.p(CX - 1, CHAO + dy - 1, CARVAO[3])

    # ── braços de galho: um aberto para cima (acenando), o outro para baixo, segurando o ar perto da caneca
    for (x0, y0, x1, y1, galhos) in ((CX - 7, CHAO - 26, CX - 17, CHAO - 36, ((0.6, -1, -4), (0.85, -3, 1))),
                                      (CX + 7, CHAO - 25, CX + 17, CHAO - 21, ((0.7, 2, -3), (0.9, 3, 2)))):
        n = 24
        for i in range(n + 1):
            t = i / n
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + math.sin(t * 3) * 0.8
            c.p(x, y, tom(MADEIRA, 0.5 - t * 0.2)); c.p(x, y + 1, tom(MADEIRA, 0.15), 0.8)
        for (t, dx, dy) in galhos:
            bx, by = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for k in range(4):
                c.p(bx + dx * k / 3, by + dy * k / 3, tom(MADEIRA, 0.45 - k * 0.05))

    # ── cachecol de tricô verde-azulado do site, com listras creme, nó e a ponta caindo com franja
    for x in range(int(hx - 6), int(hx + 7)):
        for y in (int(hy + 5), int(hy + 6), int(hy + 7)):
            u = (x - hx) / 6
            if abs(u) > 1:
                continue
            listra = (x - int(hx)) % 4 == 0
            pal_ = CREME if listra else VERDETE
            c.p(x, y + int(abs(u) * 0.8), tom(pal_, 0.75 - 0.35 * u - (y - hy - 5) * 0.12))
    for k in range(7):
        x, y = hx - 6 - k * 0.35 + math.sin(k * 0.6) * 0.4, hy + 8 + k
        for j in range(3):
            listra = k % 4 == 1
            c.p(x + j, y, tom(CREME if listra else VERDETE, 0.7 - j * 0.18))
    for j in range(4):
        c.p(hx - 8.5 + j * 0.9, hy + 15 + (j % 2), tom(CREME, 0.6))

    # ── gorro de tricô vermelho com a barra dobrada creme e o pompom
    for y in range(int(hy - 11), int(hy - 3)):
        t = max(0.0, (y - (hy - 11)) / 8)
        meia = 1.5 + 5 * t ** 0.8
        cx_ = hx - 1.5 * (1 - t)                                                           # a ponta tomba para a esquerda
        for x in range(int(cx_ - meia), int(cx_ + meia) + 1):
            u = (x - cx_) / (meia + 0.5)
            canelado = (x % 2 == 0)
            c.p(x, y, tom(VERMELHO, 0.62 - 0.32 * u + (0.06 if canelado else -0.04) - t * 0.08))
    for x in range(int(hx - 6), int(hx + 7)):
        u = (x - hx) / 6
        c.p(x, hy - 4, tom(CREME, 0.85 - 0.4 * u)); c.p(x, hy - 3, tom(CREME, 0.55 - 0.35 * u))
    px_, py_ = int(hx - 3), int(hy - 13)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            if dx * dx + dy * dy <= 5 and h01(dx, dy, 77) > 0.12:
                c.p(px_ + dx, py_ + dy, tom(CREME, 0.85 - dx * 0.12 - dy * 0.12))
    c.p(px_ - 1, py_ - 1, tom(CREME, 0.99))

    # ── a caneca de chocolate quente: cerâmica vermelha, faixa creme com flocos, alça, chocolate e marshmallows
    mx, my = CANECA
    for y in range(my - 9, my + 1):
        for x in range(mx - 4, mx + 5):
            u = (x - mx) / 4.5
            faixa = my - 6 <= y <= my - 4
            if faixa:
                cor = tom(CREME, 0.8 - 0.4 * u)
                if (x - mx) % 3 == 0 and y == my - 5:
                    cor = tom(VERMELHO, 0.6)
            else:
                cor = tom(VERMELHO, 0.62 - 0.38 * u - (0.1 if y == my else 0))
            c.p(x, y, cor)
    for y in range(my - 8, my - 2):                                                       # a alça
        c.p(mx + 5 + (1 if my - 7 <= y <= my - 3 else 0), y, tom(VERMELHO, 0.35))
    c.p(mx + 5, my - 8, tom(VERMELHO, 0.45)); c.p(mx + 5, my - 3, tom(VERMELHO, 0.3))
    for x in range(mx - 4, mx + 5):                                                       # a boca e o chocolate
        c.p(x, my - 10, tom(VERMELHO, 0.78 - 0.04 * abs(x - mx)))
        if mx - 3 <= x <= mx + 3:
            c.p(x, my - 9, tom(CHOCOLATE, 0.55 - 0.05 * (x - mx)))
    for (dx, dy) in ((-2, -10), (-1, -11), (1, -10), (2, -11), (0, -11)):                 # marshmallows
        c.p(mx + dx, my + dy, tom(CREME, 0.95 if dx < 1 else 0.7))

    # ── a lanterna: telhadinho, argola, vidros com a vela acesa, base
    lx, ly = LANTERNA
    for x in range(lx - 3, lx + 4):
        c.p(x, ly - 13, tom(FERRO, 0.55 - 0.08 * (x - lx))); c.p(x, ly, tom(FERRO, 0.45 - 0.06 * (x - lx)))
    for x in range(lx - 2, lx + 3):
        c.p(x, ly - 14, tom(FERRO, 0.6 - 0.1 * (x - lx)))
    c.p(lx, ly - 15, tom(FERRO, 0.7)); c.p(lx - 1, ly - 16, tom(FERRO, 0.5)); c.p(lx + 1, ly - 16, tom(FERRO, 0.4)); c.p(lx, ly - 17, tom(FERRO, 0.6))
    for y in range(ly - 12, ly):
        c.p(lx - 3, y, tom(FERRO, 0.5)); c.p(lx + 3, y, tom(FERRO, 0.25))
        for x in range(lx - 2, lx + 3):
            c.p(x, y, "#7a5a30", 0.75)                                                     # o vidro, quente da vela
        c.p(lx - 3, y, tom(FERRO, 0.6)); c.p(lx + 3, y, tom(FERRO, 0.3))
    for x in range(lx - 2, lx + 3):
        c.p(x, ly - 9, tom(FERRO, 0.4))                                                    # a travessa do meio
    for y in range(ly - 12, ly):
        pass
    for y in range(ly - 5, ly - 1):                                                        # a vela
        c.p(lx, y, tom(CREME, 0.8)); c.p(lx + 1, y, tom(CREME, 0.5))
    for (dy, cor) in ((-6, "#ffd27a"), (-7, "#ffe9a6"), (-8, "#fff4c8")):                 # a chama
        c.p(lx, ly + dy, cor); e.p(lx, ly + dy, cor)
    c.p(lx + 1, ly - 7, "#ffb04a"); e.p(lx + 1, ly - 7, "#ffb04a")
    pts.append((lx, ly - 7, "#ffcf7a"))

    # Luz: céu de inverno frio e baixo, a lanterna quente (forte, de perto) e um pouco de luz de cima.
    rgb, alfa, emi = iluminar(c, e, [], amb="#d2dcf0", amb_k=1.0, raio_lamp=4,
                              extra=[(lx, ly - 7, 28, "#ffb860", 1.1, 0.8), (lx, ly - 7, 10, "#ffe0a0", 1.0, 1.0),
                                     (CX - 20, CHAO - 50, 50, "#e6ecff", 0.25, 1.0)])
    # a estrelinha da chama
    X, Y = int(lx * ESC + 1), int((ly - 7) * ESC + 1)
    for d in range(-5, 6):
        k = (1 - abs(d) / 6) ** 2 * 0.5
        rgb[Y + d, X] += hexa("#ffd890") * k; rgb[Y, X + d] += hexa("#ffd890") * k
    rgb = np.clip(rgb, 0, 1)
    x0, x1, y0, y1 = (CX - 42) * ESC, (CX + 43) * ESC, (CHAO - 54) * ESC, (CHAO + 10) * ESC
    salvar_rgba("boneco.png", rgb[y0:y1, x0:x1], alfa[y0:y1, x0:x1])
    luz = desfocar(emi, 4) * 1.6 + desfocar(emi, 14) * 1.5 + luz_pontual(lx, ly - 7, 30, 0.7)[:, :, None] * hexa("#ffb860") * 0.35
    m = 20 * ESC
    cor, a = camada_de_luz(luz[y0 - m:y1 + m, x0 - m:x1 + m])
    salvar_rgba("boneco-luz.png", cor, a)
    # o vapor da caneca: três fios ondulados, claros e transparentes (sobem e somem no CSS)
    vw, vh = 14 * ESC, 16 * ESC
    vap = np.zeros((vh, vw), np.float32)
    for fio in range(3):
        for i in range(200):
            t = i / 200
            x = (4 + fio * 3 + math.sin(t * 7 + fio * 2) * 1.6) * ESC
            y = (15 - t * 14) * ESC
            if 0 <= int(y) < vh and 0 <= int(x) < vw - 2:
                vap[int(y), int(x):int(x) + 2] += (1 - t) * 0.5 * math.sin(t * math.pi) + 0.1
    vap = desfocar(vap[:, :, None], 2.6)[:, :, 0]
    salvar_rgba("boneco-vapor.png", np.ones((vh, vw, 3)) * hexa("#ffffff"), np.clip(vap * 1.3, 0, 0.5))
    print("boneco: caneca no x", (mx - (CX - 42)) * ESC, "y", (my - 10 - (CHAO - 54)) * ESC)


if __name__ == "__main__":
    main()
