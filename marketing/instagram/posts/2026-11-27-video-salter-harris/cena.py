"""Cenário do vídeo Salter-Harris (27/11/2026): sala de laudos à noite, pintada pixel a pixel e montada com luz.

Pixel art em 360 x 640, ampliada 3x para 1080 x 1920. O negatoscópio é a fonte de luz principal (fria); o abajur da
mesa dá a luz quente; a janela, o luar. O conteúdo do filme (o osso) é pintado à parte em filme.py, quadro a quadro.

    python3 cena.py   -> grava arte/fundo.png (já iluminado) e arte/previa.png
"""
from __future__ import annotations

import math
import os
from functools import lru_cache

import numpy as np
from PIL import Image, ImageFilter

W, H = 360, 640
ESC = 3
AQUI = os.path.dirname(os.path.abspath(__file__))

# Geometria (pixels da arte pequena)
CAIXA = (12, 146, 302, 384)       # negatoscópio: moldura inteira (x0, y0, x1, y1)
FILME = (20, 155, 294, 376)       # área de luz/filme dentro da moldura
PLACA = (84, 28, 276, 72)         # placa de madeira do título
LADRILHOS_Y = (76, 140)          # faixa dos ladrilhos S A L T R
MESA_Y = 404                      # tampo da mesa
JANELA = (6, 14, 54, 118)
ABAJUR = (330, 364)               # ponto da lâmpada do abajur


@lru_cache(maxsize=None)
def _hexa(c: str) -> tuple:
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def hexa(c) -> np.ndarray:
    if not isinstance(c, str):
        return np.asarray(c, dtype=np.float32)
    return np.array(_hexa(c), dtype=np.float32)


def mistura(a, b, t: float) -> np.ndarray:
    return hexa(a) * (1 - t) + hexa(b) * t


def hash01(x, y, s: int = 0):
    """Ruído de valor por pixel, determinístico (aceita arrays)."""
    x = np.asarray(x, dtype=np.int64)
    y = np.asarray(y, dtype=np.int64)
    h = (x * 374761393 + y * 668265263 + s * 2147483647) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 65535.0


def ruido(seed: int, escala: float, w: int = W, h: int = H) -> np.ndarray:
    g = np.random.default_rng(seed)
    pw, ph = max(2, int(w / escala) + 2), max(2, int(h / escala) + 2)
    base = Image.fromarray((g.random((ph, pw)) * 255).astype(np.uint8))
    return np.asarray(base.resize((w, h), Image.BICUBIC), dtype=np.float32) / 255


YY, XX = np.mgrid[0:H, 0:W]


class Camada:
    """Camada RGBA float com pincéis vetorizados (máscaras)."""

    def __init__(self, w: int = W, h: int = H) -> None:
        self.w, self.h = w, h
        self.c = np.zeros((h, w, 4), dtype=np.float32)
        self.yy, self.xx = np.mgrid[0:h, 0:w]

    def pintar(self, mascara, cor, a: float = 1.0) -> None:
        m = mascara.astype(np.float32) * a if mascara.dtype == bool else np.clip(mascara, 0, 1) * a
        rgb = hexa(cor) if (isinstance(cor, str) or np.ndim(cor) == 1) else cor
        base = self.c
        na = m + base[..., 3] * (1 - m)
        seguro = np.maximum(na, 1e-6)
        if np.ndim(rgb) == 1:
            rgb = rgb[None, None, :]
        base[..., :3] = (rgb * m[..., None] + base[..., :3] * (base[..., 3] * (1 - m))[..., None]) / seguro[..., None]
        base[..., 3] = na

    def ret(self, x0, y0, x1, y1, cor, a: float = 1.0) -> None:
        m = (self.xx >= x0) & (self.xx < x1) & (self.yy >= y0) & (self.yy < y1)
        self.pintar(m, cor, a)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            rgb = hexa(cor)
            px = self.c[y, x]
            na = a + px[3] * (1 - a)
            px[:3] = (rgb * a + px[:3] * px[3] * (1 - a)) / max(na, 1e-6)
            px[3] = na

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        vistos = set()
        for i in range(n + 1):
            t = i / max(n, 1)
            q = (int(round(x0 + (x1 - x0) * t)), int(round(y0 + (y1 - y0) * t)))
            if q not in vistos:
                vistos.add(q)
                self.p(q[0], q[1], cor, a)

    def elipse(self, cx, cy, rx, ry, cor, a: float = 1.0):
        m = ((self.xx - cx) / rx) ** 2 + ((self.yy - cy) / ry) ** 2 <= 1
        self.pintar(m, cor, a)
        return m

    def poligono(self, pts, cor, a: float = 1.0):
        from PIL import ImageDraw

        im = Image.new("L", (self.w, self.h), 0)
        ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
        dentro = np.asarray(im) > 127
        self.pintar(dentro, cor, a)
        return dentro

    def contornar(self, cor, a: float = 1.0) -> None:
        alfa = self.c[..., 3] > 0.5
        viz = np.zeros_like(alfa)
        viz[1:] |= alfa[:-1]
        viz[:-1] |= alfa[1:]
        viz[:, 1:] |= alfa[:, :-1]
        viz[:, :-1] |= alfa[:, 1:]
        self.pintar(viz & ~alfa, cor, a)


def sobre(base: np.ndarray, cam: np.ndarray) -> np.ndarray:
    a = cam[..., 3:4]
    out = base.copy()
    out[..., :3] = cam[..., :3] * a + base[..., :3] * (1 - a)
    if base.shape[-1] == 4:
        out[..., 3:4] = a + base[..., 3:4] * (1 - a)
    return out


def quantizar(m: np.ndarray, tons: int, dither: float = 0.5) -> np.ndarray:
    """Valor 0..1 em `tons` degraus com pontilhado ordenado (Bayer 4x4)."""
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16 - 0.47
    h, w = m.shape
    b = np.tile(bayer, (h // 4 + 1, w // 4 + 1))[:h, :w]
    return np.clip(np.floor(m * (tons - 1) + 0.5 + b * dither), 0, tons - 1) / (tons - 1)


def rampa(cores: list[str], v: np.ndarray) -> np.ndarray:
    """Mapeia 0..1 numa rampa de cores (paleta discreta)."""
    pal = np.stack([hexa(c) for c in cores])
    i = np.clip(np.round(v * (len(cores) - 1)).astype(int), 0, len(cores) - 1)
    return pal[i]


# ----------------------------------------------------------------------------------------------- paredes e sala

PAPEL = ["#08130f", "#0b1a16", "#0f2420", "#132d27", "#18372f"]
MADEIRA = ["#1a0d07", "#2a160b", "#3b2010", "#4f2c16", "#663a1d", "#7f4b26", "#9a5f33"]
OURO = ["#3a2508", "#6b4510", "#9c6a1c", "#c99634", "#f4cf7c", "#fff0c4"]
ACO = ["#0b0e10", "#151a1d", "#20272b", "#2d363b", "#3f4a50", "#5a676d", "#83939a"]


def parede() -> Camada:
    c = Camada()
    # papel de parede: losangos de damasco em dois tons, com veio de envelhecimento
    n = ruido(11, 40)
    manchas = ruido(12, 9)
    u = (XX + (YY // 22) * 11) % 22
    v = YY % 22
    losango = (np.abs(u - 11) + np.abs(v - 11)) <= 7
    miolo = (np.abs(u - 11) + np.abs(v - 11)) <= 3
    flor = ((u - 11) ** 2 + (v - 11) ** 2 <= 2) | ((np.abs(u - 11) <= 0) & (np.abs(v - 11) <= 6)) | ((np.abs(v - 11) <= 0) & (np.abs(u - 11) <= 6))
    base = 0.45 + 0.35 * n + (manchas - 0.5) * 0.25
    tom = base + losango * 0.18 - miolo * 0.22 + flor * 0.28
    tom += (hash01(XX, YY, 3) - 0.5) * 0.16
    c.pintar(np.ones((H, W), bool), rampa(PAPEL, quantizar(np.clip(tom, 0, 1), 5, 0.8)))
    # listras verticais finas do papel
    listra = (XX % 22 == 0)
    c.pintar(listra, "#0a1714", 0.55)

    # cornija no alto
    c.ret(0, 0, W, 10, MADEIRA[1])
    c.ret(0, 10, W, 13, MADEIRA[4])
    c.ret(0, 13, W, 14, MADEIRA[6])
    c.ret(0, 14, W, 18, MADEIRA[3])
    for x in range(0, W, 6):  # dentículos
        c.ret(x, 18, x + 3, 21, MADEIRA[2])
        c.p(x, 18, MADEIRA[5])
    c.ret(0, 21, W, 22, "#050302", 0.6)

    # lambri (painéis de madeira) abaixo da mesa
    y0 = 380
    c.ret(0, y0, W, H, MADEIRA[2])
    veio = ruido(21, 3, W, H) * 0.5 + ruido(22, 12, W, H) * 0.5
    tom = 0.35 + (veio - 0.5) * 0.5 + (hash01(XX, YY // 2, 9) - 0.5) * 0.1
    m = YY >= y0
    c.pintar(m, rampa(MADEIRA[1:6], quantizar(np.clip(tom, 0, 1), 5, 0.6)))
    c.ret(0, y0, W, y0 + 3, MADEIRA[5])
    c.ret(0, y0 + 3, W, y0 + 4, MADEIRA[1])
    for px in range(4, W, 58):  # molduras dos painéis
        c.ret(px, y0 + 10, px + 50, y0 + 11, MADEIRA[1])
        c.ret(px, y0 + 10, px + 1, H, MADEIRA[1])
        c.ret(px + 1, y0 + 11, px + 50, y0 + 12, MADEIRA[5])
        c.ret(px + 1, y0 + 11, px + 2, H, MADEIRA[5])
    return c


def janela() -> Camada:
    c = Camada()
    x0, y0, x1, y1 = JANELA
    # vão em arco
    cx = (x0 + x1) / 2
    r = (x1 - x0) / 2
    dentro = ((XX >= x0) & (XX < x1) & (YY >= y0 + r) & (YY < y1)) | (((XX - cx) ** 2 + (YY - (y0 + r)) ** 2) <= r * r)
    # céu noturno em degradê com estrelas
    t = np.clip((YY - y0) / (y1 - y0), 0, 1)
    ceu = mistura("#0a1430", "#1d3566", 1) * 0 + (hexa("#081129")[None, None] * (1 - t[..., None]) + hexa("#1b2f5c")[None, None] * t[..., None])
    c.pintar(dentro, ceu)
    est = dentro & (hash01(XX, YY, 77) > 0.985)
    c.pintar(est, "#cfe0ff", 0.9)
    # lua
    lx, ly = x0 + 15, y0 + 26
    lua = c.elipse(lx, ly, 7, 7, "#e9eef5")
    c.pintar(lua & ((XX - lx) + (YY - ly) > 3), "#b9c4d6")
    c.pintar(lua & (hash01(XX, YY, 5) > 0.8), "#c6cfdc")
    # telhados e torre ao longe (silhueta)
    perfil = y1 - 22 + 6 * np.sin(XX * 0.35) * (XX % 9 < 6) - ((XX - 38) ** 2 < 9) * 14
    c.pintar(dentro & (YY > perfil), "#070b16")
    luzinhas = dentro & (YY > perfil + 3) & (hash01(XX // 2, YY // 2, 8) > 0.93)
    c.pintar(luzinhas, "#f2b75c", 0.9)
    # caixilho em cruz
    c.pintar(dentro & (np.abs(XX - cx) < 1.2), MADEIRA[2])
    c.pintar(dentro & (np.abs(YY - (y0 + r + 18)) < 1.2), MADEIRA[2])
    c.pintar(dentro & (np.abs(XX - cx) < 0.6), MADEIRA[4])
    # moldura em volta
    borda = np.zeros((H, W), bool)
    for d in (1, 2, 3):
        fora = ((XX >= x0 - d) & (XX < x1 + d) & (YY >= y0 + r) & (YY < y1 + d)) | (((XX - cx) ** 2 + (YY - (y0 + r)) ** 2) <= (r + d) ** 2)
        borda |= fora & ~dentro
    c.pintar(borda, MADEIRA[3])
    c.pintar(borda & ((XX < cx) & (YY < y0 + r + 4)), MADEIRA[5])
    # parapeito
    c.ret(x0 - 5, y1, x1 + 5, y1 + 4, MADEIRA[4])
    c.ret(x0 - 5, y1, x1 + 5, y1 + 1, MADEIRA[6])
    c.ret(x0 - 4, y1 + 4, x1 + 4, y1 + 6, MADEIRA[1])
    # vaso com planta no parapeito
    c.ret(x1 - 14, y1 - 8, x1 - 5, y1, "#7a3b22")
    c.ret(x1 - 14, y1 - 8, x1 - 5, y1 - 7, "#a5583a")
    c.ret(x1 - 6, y1 - 7, x1 - 5, y1, "#4e2414")
    for i, (dx, dy) in enumerate([(-3, -6), (0, -10), (3, -7), (-1, -13), (2, -12), (5, -10), (-4, -10)]):
        c.elipse(x1 - 10 + dx, y1 - 9 + dy, 2.2, 1.4, ["#1f4a2c", "#2d6a3c", "#3f8a4c"][i % 3])
    return c


def placa_titulo() -> Camada:
    """Placa de madeira pendurada por correntes, com filete de ouro (o título entra por cima no vídeo)."""
    c = Camada()
    x0, y0, x1, y1 = PLACA
    # correntes
    for cx in (x0 + 18, x1 - 18):
        for y in range(22, y0, 3):
            if (y // 3) % 2:
                c.ret(cx - 1, y, cx + 2, y + 2, ACO[4])
                c.p(cx - 1, y, ACO[6])
            else:
                c.ret(cx, y, cx + 1, y + 3, ACO[3])
        c.ret(cx - 2, 20, cx + 3, 23, OURO[2])  # gancho
    # tábua com veio horizontal
    veio = ruido(31, 2.5, W, H) * 0.6 + ruido(32, 14, W, H) * 0.4
    tom = 0.4 + (veio - 0.5) * 0.55 + np.sin(YY * 1.3 + veio * 6) * 0.07
    m = (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)
    # cantos chanfrados
    m &= ~(((XX - x0) + (YY - y0) < 4) | ((x1 - 1 - XX) + (YY - y0) < 4) | ((XX - x0) + (y1 - 1 - YY) < 4) | ((x1 - 1 - XX) + (y1 - 1 - YY) < 4))
    c.pintar(m, rampa(MADEIRA[0:5], quantizar(np.clip(tom, 0, 1), 5, 0.6)))
    # filete de ouro por dentro
    fil = m & ~((XX >= x0 + 4) & (XX < x1 - 4) & (YY >= y0 + 4) & (YY < y1 - 4)) & ((XX >= x0 + 3) & (XX < x1 - 3) & (YY >= y0 + 3) & (YY < y1 - 3))
    c.pintar(fil, OURO[3])
    c.pintar(fil & ((YY == y0 + 3) | (XX == x0 + 3)), OURO[4])
    c.pintar(fil & ((YY == y1 - 4) | (XX == x1 - 4)), OURO[1])
    # losangos nos cantos
    for (lx, ly) in ((x0 + 3, y0 + 3), (x1 - 4, y0 + 3), (x0 + 3, y1 - 4), (x1 - 4, y1 - 4)):
        lo = (np.abs(XX - lx) + np.abs(YY - ly)) <= 3
        c.pintar(lo, OURO[3])
        c.pintar(lo & ((XX - lx) + (YY - ly) < -1), OURO[5])
        c.pintar((np.abs(XX - lx) + np.abs(YY - ly)) == 0, OURO[5])
    # quina de luz em cima, sombra embaixo
    c.pintar(m & (YY == y0), MADEIRA[6])
    c.pintar(m & (YY >= y1 - 2), MADEIRA[0])
    # pregos
    for (px, py) in ((x0 + 18, y0 + 2), (x1 - 18, y0 + 2)):
        c.ret(px - 1, py - 1, px + 2, py + 2, ACO[5])
        c.p(px - 1, py - 1, ACO[6])
    # sombra da placa na parede
    return c


def negatoscopio() -> tuple[Camada, np.ndarray]:
    """Moldura de aço do negatoscópio, com rebites, presilhas, chave e plaqueta. Devolve a camada e a máscara do filme."""
    c = Camada()
    x0, y0, x1, y1 = CAIXA
    fx0, fy0, fx1, fy1 = FILME
    caixa = (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)
    filme = (XX >= fx0) & (XX < fx1) & (YY >= fy0) & (YY < fy1)
    aro = caixa & ~filme
    # aço escovado: listras horizontais finas + variação
    esc = ruido(41, 1.5, W, H) * 0.3 + hash01(XX // 3, YY, 4) * 0.2
    tom = 0.42 + (esc - 0.25) * 0.5
    # bisel: claro em cima/esquerda, escuro embaixo/direita
    de = np.minimum.reduce([XX - x0, YY - y0, x1 - 1 - XX, y1 - 1 - YY]).astype(np.float32)
    di = np.minimum.reduce([fx0 - 1 - XX, fy0 - 1 - YY, XX - fx1, YY - fy1]).astype(np.float32)
    tom += np.where((YY - y0 < 3) | (XX - x0 < 3), 0.25, 0) - np.where((y1 - 1 - YY < 3) | (x1 - 1 - XX < 3), 0.25, 0)
    c.pintar(aro, rampa(ACO, quantizar(np.clip(tom, 0, 1), 7, 0.5)))
    c.pintar(aro & (de == 0), ACO[0])
    c.pintar(aro & (de == 1) & ((YY - y0 == 1) | (XX - x0 == 1)), ACO[6])
    # canaleta interna escura em volta do filme (o filme fica rebaixado)
    canal = caixa & ~filme & (XX >= fx0 - 2) & (XX < fx1 + 2) & (YY >= fy0 - 2) & (YY < fy1 + 2)
    c.pintar(canal, ACO[0])
    c.pintar(canal & ((YY == fy1 + 1) | (XX == fx1 + 1)), ACO[3])
    # rebites
    for rx in list(range(x0 + 6, x1 - 3, 26)):
        for ry in (y0 + 4, y1 - 5):
            c.elipse(rx, ry, 1.6, 1.6, ACO[4])
            c.p(rx - 1, ry - 1, ACO[6])
            c.p(rx + 1, ry + 1, ACO[1])
    for ry in range(y0 + 16, y1 - 8, 26):
        for rx in (x0 + 4, x1 - 5):
            c.elipse(rx, ry, 1.6, 1.6, ACO[4])
            c.p(rx - 1, ry - 1, ACO[6])
            c.p(rx + 1, ry + 1, ACO[1])
    # presilhas de mola no alto (seguram o filme)
    for px in (fx0 + 70, fx1 - 70):
        c.ret(px - 7, fy0 - 7, px + 7, fy0 + 3, ACO[5])
        c.ret(px - 7, fy0 - 7, px + 7, fy0 - 6, ACO[6])
        c.ret(px - 7, fy0 + 2, px + 7, fy0 + 3, ACO[2])
        c.ret(px - 5, fy0 - 4, px + 5, fy0 - 2, ACO[3])
        c.ret(px - 1, fy0 - 9, px + 1, fy0 - 7, ACO[2])
    # plaqueta de latão embaixo, ao centro
    cx = (x0 + x1) // 2
    c.ret(cx - 16, y1 - 8, cx + 16, y1 - 2, OURO[2])
    c.ret(cx - 16, y1 - 8, cx + 16, y1 - 7, OURO[4])
    c.ret(cx - 13, y1 - 6, cx + 13, y1 - 5, OURO[1])
    c.ret(cx - 10, y1 - 4, cx + 10, y1 - 3, OURO[1])
    # chave de liga com LED verde à direita
    c.ret(x1 - 14, y1 - 9, x1 - 6, y1 - 3, ACO[1])
    c.ret(x1 - 13, y1 - 8, x1 - 9, y1 - 4, ACO[5])
    c.p(x1 - 8, y1 - 7, "#5dfc9b")
    # cabo descendo até a mesa
    for y in range(y1, MESA_Y):
        c.p(x1 - 10 + int(2 * math.sin(y * 0.3)), y, "#0b0b0b")
    return c, filme


def ladrilhos_base() -> Camada:
    """Suporte dos ladrilhos S A L T R: uma régua de madeira presa na parede (os ladrilhos vêm por cima no vídeo)."""
    c = Camada()
    y0, y1 = LADRILHOS_Y
    c.ret(36, y1 - 3, 324, y1 + 2, MADEIRA[3])
    c.ret(36, y1 - 3, 324, y1 - 2, MADEIRA[6])
    c.ret(36, y1 + 2, 324, y1 + 3, MADEIRA[0])
    for bx in (44, 316):  # mãos-francesas
        c.ret(bx - 2, y1 + 2, bx + 2, y1 + 8, MADEIRA[2])
        c.p(bx - 2, y1 + 2, MADEIRA[5])
    return c


def mesa() -> Camada:
    c = Camada()
    y = MESA_Y
    # tampo
    veio = ruido(51, 2.2, W, H) * 0.6 + ruido(52, 20, W, H) * 0.4
    tom = 0.55 + (veio - 0.5) * 0.5 + np.sin(XX * 0.12 + veio * 5) * 0.06
    tampo = (YY >= y) & (YY < y + 12)
    c.pintar(tampo, rampa(MADEIRA[2:7], quantizar(np.clip(tom, 0, 1), 5, 0.6)))
    c.ret(0, y, W, y + 1, MADEIRA[6])
    c.ret(0, y + 12, W, y + 16, MADEIRA[4])
    c.ret(0, y + 12, W, y + 13, MADEIRA[6])
    c.ret(0, y + 16, W, y + 17, MADEIRA[0])
    # frente com gavetas
    frente = (YY >= y + 17) & (YY < y + 62)
    c.pintar(frente, rampa(MADEIRA[1:5], quantizar(np.clip(tom - 0.15, 0, 1), 4, 0.6)))
    for gx0, gx1 in ((14, 110), (128, 232), (250, 346)):
        c.ret(gx0, y + 22, gx1, y + 52, MADEIRA[2])
        c.ret(gx0, y + 22, gx1, y + 23, MADEIRA[0])
        c.ret(gx0, y + 51, gx1, y + 52, MADEIRA[5])
        c.ret(gx0, y + 22, gx0 + 1, y + 52, MADEIRA[0])
        c.ret(gx1 - 1, y + 22, gx1, y + 52, MADEIRA[5])
        mx = (gx0 + gx1) // 2
        c.ret(mx - 8, y + 34, mx + 8, y + 38, OURO[2])  # puxador de latão
        c.ret(mx - 8, y + 34, mx + 8, y + 35, OURO[4])
        c.ret(mx - 6, y + 37, mx + 6, y + 38, OURO[1])
        c.ret(mx - 3, y + 28, mx + 3, y + 31, OURO[1])  # porta-etiqueta
        c.ret(mx - 2, y + 29, mx + 2, y + 30, "#e8dcc0")
    c.ret(0, y + 62, W, y + 64, MADEIRA[0])
    return c


def objetos_mesa() -> Camada:
    c = Camada()
    y = MESA_Y
    # pilha de livros (direita do centro)
    livros = [(226, 64, 8, "#6d1f1f", "#8f2c2a"), (230, 58, 7, "#1f3f5e", "#2c587f"), (224, 62, 6, "#24452d", "#316040")]
    topo = y
    for (lx, lw, lh, c1, c2) in livros:
        c.ret(lx, topo - lh, lx + lw, topo, c1)
        c.ret(lx, topo - lh, lx + lw, topo - lh + 1, c2)
        c.ret(lx + lw - 3, topo - lh + 1, lx + lw, topo - 1, "#e9dfc4")  # páginas
        for k in range(lx + lw - 3, lx + lw):
            for yy in range(topo - lh + 1, topo - 1):
                if (yy + k) % 2:
                    c.p(k, yy, "#cbbf9f")
        c.ret(lx + 6, topo - lh + 2, lx + 14, topo - lh + 3, OURO[3])  # letras douradas da lombada
        c.ret(lx, topo - 1, lx + lw, topo, "#120808", 0.6)
        topo -= lh
    # caneca de café
    mx = 200
    c.ret(mx, y - 13, mx + 11, y, "#d9d2c4")
    c.ret(mx, y - 13, mx + 11, y - 12, "#f3eee3")
    c.ret(mx + 8, y - 12, mx + 11, y, "#a79f90")
    c.ret(mx + 1, y - 12, mx + 10, y - 11, "#3a2213")
    c.ret(mx + 11, y - 10, mx + 14, y - 9, "#d9d2c4")
    c.ret(mx + 13, y - 9, mx + 14, y - 4, "#d9d2c4")
    c.ret(mx + 11, y - 4, mx + 14, y - 3, "#a79f90")
    c.ret(mx + 3, y - 8, mx + 8, y - 5, "#14655E")  # ladrilho verdete na caneca
    c.p(mx + 4, y - 7, "#f4cf7c")
    # radiografias soltas, empilhadas em cima da mesa
    c.poligono([(110, y + 1), (178, y - 3), (184, y + 4), (116, y + 8)], "#0f1a20")
    c.poligono([(114, y + 2), (176, y - 1), (179, y + 3), (118, y + 6)], "#1b2a33")
    c.linha(130, y + 2, 158, y + 1, "#5a7280")
    c.linha(140, y + 3, 166, y + 2, "#41555f")
    # régua (goniômetro) de metal
    c.ret(80, y + 3, 108, y + 5, ACO[5])
    c.ret(80, y + 3, 108, y + 4, ACO[6])
    for k in range(81, 108, 3):
        c.p(k, y + 4, ACO[2])
    # abajur de latão com cúpula verde (banker's lamp)
    ax, ay = ABAJUR
    c.ret(ax - 10, y - 4, ax + 11, y, OURO[2])
    c.ret(ax - 10, y - 4, ax + 11, y - 3, OURO[4])
    c.ret(ax - 1, ay + 6, ax + 2, y - 4, OURO[3])
    c.ret(ax - 1, ay + 6, ax, y - 4, OURO[5])
    cup = [(ax - 17, ay + 7), (ax - 11, ay - 4), (ax + 11, ay - 4), (ax + 17, ay + 7)]
    c.poligono(cup, "#1f5a3a")
    c.poligono([(ax - 11, ay - 4), (ax + 11, ay - 4), (ax + 13, ay - 1), (ax - 13, ay - 1)], "#3f8f5c")
    c.ret(ax - 17, ay + 6, ax + 18, ay + 8, OURO[3])
    c.ret(ax - 17, ay + 6, ax + 18, ay + 7, OURO[5])
    c.ret(ax - 1, ay - 7, ax + 2, ay - 4, OURO[3])
    # corrente de puxar
    for k in range(ay + 8, ay + 22, 2):
        c.p(ax + 10, k, OURO[4])
    c.ret(ax + 9, ay + 22, ax + 12, ay + 25, OURO[3])
    # castiçal com vela à esquerda (luz secundária quente perto do mascote? não: fica no canto esquerdo)
    return c


def estante_direita() -> Camada:
    """Recorte de estante de livros na borda direita (fica desfocada, dá profundidade)."""
    c = Camada()
    x0 = 350
    c.ret(x0, 22, W, MESA_Y, MADEIRA[1])
    c.ret(x0, 22, x0 + 2, MESA_Y, MADEIRA[4])
    for py in range(60, MESA_Y, 54):
        c.ret(x0, py, W, py + 4, MADEIRA[4])
        c.ret(x0, py, W, py + 1, MADEIRA[6])
        lx = x0 + 3
        k = 0
        while lx < W:
            lw = 3 + int(hash01(lx, py, 7) * 3)
            lh = 30 + int(hash01(lx, py, 8) * 16)
            cor = ["#5c1b1b", "#1d3a55", "#2c4f33", "#6a4a1c", "#3b2445"][k % 5]
            c.ret(lx, py - lh, lx + lw, py, cor)
            c.ret(lx, py - lh, lx + 1, py, "#ffffff", 0.12)
            c.ret(lx, py - lh + 4, lx + lw, py - lh + 5, OURO[3], 0.8)
            lx += lw + 1
            k += 1
    return c


def estante_esquerda() -> Camada:
    """Prateleira baixa à esquerda, debaixo da janela: um crânio de estudo e frascos."""
    c = Camada()
    y = 136
    c.ret(0, y, 18, y + 3, MADEIRA[4])
    c.ret(0, y, 18, y + 1, MADEIRA[6])
    c.ret(12, y + 3, 16, y + 9, MADEIRA[2])
    # frasco âmbar
    c.ret(3, y - 10, 10, y, "#7a4a14")
    c.ret(3, y - 10, 10, y - 9, "#c98a32")
    c.ret(4, y - 13, 9, y - 10, "#2b2b2b")
    c.ret(4, y - 8, 6, y - 2, "#e7b56a", 0.7)
    return c


PLACA_SITE = (10, 474, 350, 514)   # placa fixa do site, abaixo das legendas


def placa_site() -> Camada:
    """Placa de madeira escura com filete de ouro e rebites: o endereço do site fica nela o vídeo inteiro."""
    c = Camada()
    x0, y0, x1, y1 = PLACA_SITE
    m = (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)
    m &= ~(((XX - x0) + (YY - y0) < 3) | ((x1 - 1 - XX) + (YY - y0) < 3) | ((XX - x0) + (y1 - 1 - YY) < 3) | ((x1 - 1 - XX) + (y1 - 1 - YY) < 3))
    veio = ruido(71, 2.5, W, H) * 0.6 + ruido(72, 16, W, H) * 0.4
    tom = 0.3 + (veio - 0.5) * 0.4 + np.sin(YY * 1.1 + veio * 6) * 0.05
    c.pintar(m, rampa(["#0d0604", "#170b06", "#21110a", "#2e180d"], quantizar(np.clip(tom, 0, 1), 4, 0.6)))
    fil = m & ~((XX >= x0 + 4) & (XX < x1 - 4) & (YY >= y0 + 4) & (YY < y1 - 4)) & ((XX >= x0 + 3) & (XX < x1 - 3) & (YY >= y0 + 3) & (YY < y1 - 3))
    c.pintar(fil, OURO[3])
    c.pintar(fil & ((YY == y0 + 3) | (XX == x0 + 3)), OURO[4])
    c.pintar(fil & ((YY == y1 - 4) | (XX == x1 - 4)), OURO[1])
    for (lx, ly) in ((x0 + 3, y0 + 3), (x1 - 4, y0 + 3), (x0 + 3, y1 - 4), (x1 - 4, y1 - 4)):
        lo = (np.abs(XX - lx) + np.abs(YY - ly)) <= 3
        c.pintar(lo, OURO[3])
        c.pintar(lo & ((XX - lx) + (YY - ly) < -1), OURO[5])
    c.pintar(m & (YY == y0), "#5a3a22")
    c.pintar(m & (YY >= y1 - 2), "#050201")
    # sombra projetada embaixo
    c.pintar((XX >= x0 + 2) & (XX < x1 + 2) & (YY >= y1) & (YY < y1 + 3), "#000000", 0.55)
    return c


def tapete_chao() -> Camada:
    c = Camada()
    y = MESA_Y + 64
    tom = 0.4 + (ruido(61, 2, W, H) - 0.5) * 0.5
    chao = YY >= y
    c.pintar(chao, rampa(MADEIRA[0:4], quantizar(np.clip(tom, 0, 1), 4, 0.6)))
    for k in range(y, H, 9):
        c.ret(0, k, W, k + 1, MADEIRA[0])
    # tapete vermelho com barra
    tap = (YY >= y + 18) & (XX >= 20) & (XX < 340)
    pad = ((np.abs((XX - 180) % 24 - 12) + np.abs((YY - y) % 24 - 12)) <= 6)
    c.pintar(tap, "#4a1414")
    c.pintar(tap & pad, "#6b1f1c")
    c.pintar(tap & ((YY - y - 18) % 60 < 3), "#a1762f")
    c.pintar(tap & ((XX - 20 < 3) | (339 - XX < 3)), "#a1762f")
    return c


# ----------------------------------------------------------------------------------------------- luz e montagem


def ampliar(arr: np.ndarray, f: int = ESC) -> np.ndarray:
    return np.repeat(np.repeat(arr, f, axis=0), f, axis=1)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    from scipy.ndimage import gaussian_filter

    if raio <= 0:
        return arr
    return gaussian_filter(arr.astype(np.float32), sigma=(raio, raio, 0)[: arr.ndim])


def luz_retangular(x0, y0, x1, y1, alcance: float, w=W * ESC, h=H * ESC) -> np.ndarray:
    """Luz emitida por uma superfície retangular (o painel do negatoscópio), caindo com a distância."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = np.maximum(0, np.maximum(x0 - xx, xx - x1))
    dy = np.maximum(0, np.maximum(y0 - yy, yy - y1))
    d = np.sqrt(dx * dx + dy * dy)
    return 1.0 / (1.0 + (d / alcance) ** 2)


def luz_pontual(cx, cy, raio, achatar=1.0, w=W * ESC, h=H * ESC) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + ((yy - cy) / achatar) ** 2)
    return np.exp(-(d / raio) ** 2)


def faixas(luz: np.ndarray, n: int = 6) -> np.ndarray:
    """Borda da luz em faixas (o degrau típico da pixel art)."""
    return np.floor(luz * n + 0.35) / n * 0.7 + luz * 0.3


def montar() -> dict:
    """Pinta as camadas, ilumina e devolve o fundo final (float 1080 x 1920) e máscaras úteis."""
    cam_parede = parede()
    cam_jan = janela()
    cam_est = estante_direita()
    cam_esq = estante_esquerda()
    cam_placa = placa_titulo()
    cam_neg, mfilme = negatoscopio()
    cam_lad = ladrilhos_base()
    cam_mesa = mesa()
    cam_obj = objetos_mesa()
    cam_chao = tapete_chao()

    base = np.zeros((H, W, 3), dtype=np.float32)
    for cam in (cam_parede, cam_jan, cam_esq, cam_placa, cam_lad, cam_neg):
        base = sobre(base, cam.c)
    # estante à direita fica um pouco desfocada (mais perto da câmera)
    fundo_big = ampliar(base)
    est_big = desfocar(ampliar(cam_est.c), 2.2)
    fundo_big = sobre(fundo_big, est_big)
    meio = np.zeros((H, W, 4), dtype=np.float32)
    for cam in (cam_chao, cam_mesa, cam_obj):
        meio = sobre(meio, cam.c)
    meio_big = ampliar(meio)
    # chão e frente da mesa levemente desfocados (primeiro plano)
    frente = meio_big.copy()
    frente_des = desfocar(meio_big, 1.6)
    yy = np.arange(H * ESC)[:, None, None]
    peso = np.clip((yy - (MESA_Y + 20) * ESC) / 120, 0, 1)
    meio_big = frente * (1 - peso) + frente_des * peso
    cor = sobre(fundo_big, meio_big)

    # ---- luz
    fx0, fy0, fx1, fy1 = [v * ESC for v in FILME]
    amb = 0.16
    painel = luz_retangular(fx0, fy0, fx1, fy1, 330)
    painel_perto = luz_retangular(fx0, fy0, fx1, fy1, 70)
    fria = hexa("#bcd6ff")
    quente = hexa("#ffb86a")
    ax, ay = ABAJUR[0] * ESC, (ABAJUR[1] + 9) * ESC
    # cone do abajur para baixo
    yy2, xx2 = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)
    cone = np.clip(1 - np.abs(xx2 - ax) / (40 + np.maximum(0, yy2 - ay) * 1.15), 0, 1) * (yy2 > ay - 6)
    abajur = cone * np.exp(-np.maximum(0, yy2 - ay) / 260) * 1.25 + luz_pontual(ax, ay, 70, 0.6) * 0.8
    lua = luz_pontual(30 * ESC, 70 * ESC, 160, 1.3) * 0.45
    iluminacao = (amb + faixas(np.clip(painel * 0.95 + painel_perto * 0.4, 0, 1.4))[..., None] * fria * 1.05
                  + faixas(np.clip(abajur, 0, 1.3))[..., None] * quente * 0.95 + lua[..., None] * hexa("#7f9fe0"))
    # sombra da cúpula do abajur sobre a parede acima dela
    acesa = cor * iluminacao
    # a cúpula verde translúcida brilha por dentro
    brilho_cupula = luz_pontual(ax, ay - 6, 26, 0.45)[..., None] * hexa("#7dffb0") * 0.35
    acesa += brilho_cupula
    # o painel do negatoscópio é a própria luz (o filme entra por cima)
    mf = ampliar(mfilme.astype(np.float32)[..., None])
    acesa = acesa * (1 - mf) + hexa("#e9f2ff") * mf
    return {"rgb": acesa, "mascara_filme": mf[..., 0] > 0.5}


def bloom_tonemap(img: np.ndarray, seed: int = 0, grao: float = 0.025) -> np.ndarray:
    """Bloom, mapeamento de tom, correção de cor (altas quentes, sombras frias), vinheta e grão."""
    lum = img.mean(axis=-1, keepdims=True)
    alto = np.clip(img - 0.78, 0, None)
    pequeno = Image.fromarray(np.clip(alto * 255 / 2, 0, 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
    bl = np.asarray(pequeno.filter(ImageFilter.GaussianBlur(10)), dtype=np.float32) / 255 * 2
    bl = np.asarray(Image.fromarray(np.clip(bl * 127, 0, 255).astype(np.uint8)).resize((W * ESC, H * ESC), Image.BILINEAR), dtype=np.float32) / 127
    img = img + bl * 0.55
    img = img / (1 + img * 0.18)  # tom suave
    lum = img.mean(axis=-1, keepdims=True)
    sombra = np.clip(1 - lum * 2.2, 0, 1)
    img = img + sombra * hexa("#0a1830") * 0.12
    yy, xx = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)
    vx = (xx / (W * ESC) - 0.5) * 1.25
    vy = (yy / (H * ESC) - 0.48) * 0.95
    vin = np.clip(1 - (vx * vx + vy * vy) * 0.85, 0.35, 1)[..., None]
    img = img * vin
    if grao:
        g = np.random.default_rng(seed).normal(0, grao, img.shape[:2]).astype(np.float32)[..., None]
        img = img + g
    return np.clip(img, 0, 1)


def main() -> None:
    os.makedirs(os.path.join(AQUI, "arte"), exist_ok=True)
    r = montar()
    np.save(os.path.join(AQUI, "arte", "fundo.npy"), r["rgb"].astype(np.float16))
    # placa do site como camada à parte (aparece só no começo e no fim do vídeo), com a luz quente do abajur
    pl = ampliar(placa_site().c)
    pl[..., :3] *= hexa("#ffe2bc") * 1.05
    np.save(os.path.join(AQUI, "arte", "placa-site.npy"), pl.astype(np.float16))
    final = bloom_tonemap(r["rgb"].copy())
    Image.fromarray((final * 255).astype(np.uint8)).save(os.path.join(AQUI, "arte", "previa-fundo.png"))
    print("ok")


if __name__ == "__main__":
    main()
