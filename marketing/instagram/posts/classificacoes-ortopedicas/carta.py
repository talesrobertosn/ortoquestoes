"""Carta colecionável da série Classificações Ortopédicas (pixel art 194 x 270, ampliada 3x = 582 x 810).

Moldura de ouro chanfrada com cantos arredondados, corpo na cor do grupo com treliça de losangos, placa do título
com gema facetada, janela em arco para a imagem (radiografia real ou esquema) e placa de pergaminho para o texto.
O verso tem o ladrilho da marca. Os textos e a imagem entram por cima, na resolução final (montar.py).
"""
from __future__ import annotations

import os
import sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "../2026-11-27-video-salter-harris"))
from cena import Camada, hash01, hexa, quantizar, rampa  # noqa: E402

CW, CH = 194, 270
ESC = 3
JANELA = (12, 36, 182, 178)      # janela da imagem (x0, y0, x1, y1), topo em arco
PLACA_TXT = (12, 186, 182, 260)  # placa de pergaminho
OURO = ["#3a2508", "#6b4510", "#9c6a1c", "#c99634", "#f4cf7c", "#fff0c4"]
GRUPOS = {
    "lat": {"corpo": ["#06211e", "#0b3a35", "#14655E", "#1f8a80"], "gema": ["#0b3a35", "#14655E", "#3fb3a3", "#a7f0e2", "#ffffff"]},
    "med": {"corpo": ["#2a1a05", "#4a2f0b", "#6b4510", "#8c5d18"], "gema": ["#6b4510", "#c99634", "#f4cf7c", "#fff0c4", "#ffffff"]},
    "dois": {"corpo": ["#2a0710", "#4a0f1c", "#6e1a2a", "#8f2a3a"], "gema": ["#4a0f1c", "#a3243a", "#e0546a", "#ffb3bd", "#ffffff"]},
    "marca": {"corpo": ["#06211e", "#0b3a35", "#14655E", "#1f8a80"], "gema": ["#6b4510", "#c99634", "#f4cf7c", "#fff0c4", "#ffffff"]},
}


def _arredondado(c: Camada, x0, y0, x1, y1, r):
    yy, xx = c.yy, c.xx
    m = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    for cx, cy in ((x0 + r, y0 + r), (x1 - 1 - r, y0 + r), (x0 + r, y1 - 1 - r), (x1 - 1 - r, y1 - 1 - r)):
        quad = (np.sign(xx - cx) == np.sign(cx - (x0 + x1) / 2) * -1 * -1) if False else None
    for cx, cy, sx, sy in ((x0 + r, y0 + r, -1, -1), (x1 - 1 - r, y0 + r, 1, -1), (x0 + r, y1 - 1 - r, -1, 1), (x1 - 1 - r, y1 - 1 - r, 1, 1)):
        canto = ((xx - cx) * sx > 0) & ((yy - cy) * sy > 0)
        m &= ~(canto & ((xx - cx) ** 2 + (yy - cy) ** 2 > r * r))
    return m


def _janela_mascara(c: Camada):
    x0, y0, x1, y1 = JANELA
    yy, xx = c.yy, c.xx
    cx = (x0 + x1) / 2
    r = (x1 - x0) / 2
    arco_y = y0 + 26
    m = (xx >= x0) & (xx < x1) & (yy < y1)
    topo = arco_y - np.sqrt(np.clip(1 - ((xx - cx) / r) ** 2, 0, 1)) * 26
    return m & (yy >= topo)


def frente(grupo: str) -> np.ndarray:
    c = Camada(CW, CH)
    yy, xx = c.yy, c.xx
    g = GRUPOS[grupo]
    corpo = _arredondado(c, 0, 0, CW, CH, 12)
    # moldura de ouro chanfrada (5 px): luz em cima/esquerda, sombra embaixo/direita
    dist = np.minimum.reduce([xx, yy, CW - 1 - xx, CH - 1 - yy]).astype(np.float32)
    aro = corpo & ~_arredondado(c, 5, 5, CW - 5, CH - 5, 8)
    luz = np.where((xx + yy) < (CW + CH) * 0.5, 0.75, 0.3) - dist * 0.06 + (hash01(xx, yy, 5) - 0.5) * 0.15
    c.pintar(aro, rampa(OURO, quantizar(np.clip(luz, 0, 1), 6, 0.5)))
    # corpo com treliça de losangos
    dentro = _arredondado(c, 5, 5, CW - 5, CH - 5, 8)
    u, v = (xx + yy) % 14, (xx - yy) % 14
    trelica = (u == 0) | (v == 0)
    tom = 0.45 + 0.25 * (1 - yy / CH) + (hash01(xx // 2, yy // 2, 8) - 0.5) * 0.1
    c.pintar(dentro, rampa(g["corpo"], quantizar(np.clip(tom, 0, 1), 4, 0.6)))
    c.pintar(dentro & trelica, g["corpo"][3], 0.55)
    c.pintar(dentro & ~_arredondado(c, 6, 6, CW - 6, CH - 6, 7), OURO[1])
    # placa do título (faixa escura com filete de ouro) e gema à direita
    tit = _arredondado(c, 10, 9, CW - 10, 32, 4)
    c.pintar(tit, "#120c06", 0.85)
    c.pintar(tit & ~_arredondado(c, 11, 10, CW - 11, 31, 3), OURO[3])
    gx, gy, gr = CW - 24, 20, 8
    d = np.hypot(xx - gx, yy - gy)
    gem = d <= gr
    face = np.arctan2(yy - gy, xx - gx)
    tom_g = 0.5 + 0.35 * np.cos(face + 2.3) - d / gr * 0.25
    c.pintar(gem, rampa(g["gema"], quantizar(np.clip(tom_g, 0, 1), 5, 0.3)))
    c.pintar((d <= gr + 1.3) & ~gem, OURO[4])
    c.pintar(np.hypot(xx - gx + 3, yy - gy + 3) <= 1.6, "#ffffff")
    # janela da imagem com moldura dupla de ouro
    jan = _janela_mascara(c)
    viz = np.zeros_like(jan)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2)):
        viz |= np.roll(np.roll(jan, dy, 0), dx, 1)
    c.pintar(viz & ~jan, OURO[4])
    c.pintar(jan, "#05090d")
    # ornamentos: losangos de ouro nos cantos da janela
    for ox, oy in ((JANELA[0] - 1, JANELA[3] + 1), (JANELA[2], JANELA[3] + 1)):
        lo = (np.abs(xx - ox) + np.abs(yy - oy)) <= 4
        c.pintar(lo, OURO[3])
        c.pintar(lo & ((xx - ox) + (yy - oy) < -1), OURO[5])
    # placa de pergaminho
    px0, py0, px1, py1 = PLACA_TXT
    perg = _arredondado(c, px0, py0, px1, py1, 5)
    tom_p = 0.6 + (hash01(xx // 2, yy // 2, 21) - 0.5) * 0.2 - 0.25 * ((yy - py0) / (py1 - py0))
    c.pintar(perg, rampa(["#b89a62", "#d4bb85", "#ead6a8", "#f6ead0"], quantizar(np.clip(tom_p, 0, 1), 4, 0.6)))
    c.pintar(perg & ~_arredondado(c, px0 + 1, py0 + 1, px1 - 1, py1 - 1, 4), "#7a5a2a")
    # contorno escuro de tudo
    c.contornar("#140c04")
    return np.repeat(np.repeat(c.c, ESC, 0), ESC, 1)


def verso() -> np.ndarray:
    c = Camada(CW, CH)
    yy, xx = c.yy, c.xx
    corpo = _arredondado(c, 0, 0, CW, CH, 12)
    aro = corpo & ~_arredondado(c, 5, 5, CW - 5, CH - 5, 8)
    luz = np.where((xx + yy) < (CW + CH) * 0.5, 0.75, 0.3) + (hash01(xx, yy, 5) - 0.5) * 0.15
    c.pintar(aro, rampa(OURO, quantizar(np.clip(luz, 0, 1), 6, 0.5)))
    dentro = _arredondado(c, 5, 5, CW - 5, CH - 5, 8)
    c.pintar(dentro, "#0b3a35")
    u, v = (xx + yy) % 12, (xx - yy) % 12
    c.pintar(dentro & ((u == 0) | (v == 0)), "#14655E")
    c.pintar(dentro & ((u == 6) & (v == 6)), OURO[3])
    # medalhão central
    d = np.hypot(xx - CW / 2, yy - CH / 2)
    c.pintar(d <= 46, "#06211e")
    c.pintar((d <= 48) & (d > 44), OURO[4])
    c.pintar((d <= 44) & (d > 42), OURO[2])
    c.contornar("#140c04")
    return np.repeat(np.repeat(c.c, ESC, 0), ESC, 1)


def janela_px() -> tuple:
    """Janela da imagem em pixels da carta ampliada (x0, y0, x1, y1) e a máscara do arco."""
    c = Camada(CW, CH)
    m = _janela_mascara(c)
    return tuple(v * ESC for v in JANELA), np.repeat(np.repeat(m, ESC, 0), ESC, 1)


if __name__ == "__main__":
    from PIL import Image

    linha = np.concatenate([frente("lat"), frente("med"), frente("dois"), verso()], axis=1)
    fundo = np.zeros(linha.shape[:2] + (3,), np.float32) + hexa("#4a2368")
    a = linha[..., 3:4]
    out = linha[..., :3] * a + fundo * (1 - a)
    os.makedirs(os.path.join(AQUI, "arte"), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(AQUI, "arte", "previa-cartas.png"))
    print("ok")
