"""Ferramentas de pintura de cenário em pixel art (numpy).

Cada camada é uma imagem RGBA pequena (a resolução da arte), pintada uma vez,
offline. A luz é calculada em ponto flutuante e depois convertida em degraus de
uma rampa de cores (com pontilhado ordenado), como numa pixel art feita à mão.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

F = np.float32
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], F) + 0.5) / 16


def hexrgb(h: str):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rampa(cores: list[str]) -> np.ndarray:
    return np.array([hexrgb(c) for c in cores], F)


def misturar(a, b, t):
    a, b = np.array(hexrgb(a) if isinstance(a, str) else a, F), np.array(hexrgb(b) if isinstance(b, str) else b, F)
    return a + (b - a) * t


# ---------------------------------------------------------------- ruído
def _hash(ix, iy, s):
    h = (ix * 374761393 + iy * 668265263 + s * 2147483647) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 65535.0


def ruido(x, y, s=0):
    x = np.asarray(x, F); y = np.asarray(y, F)
    ix, iy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    fx, fy = x - ix, y - iy
    ux, uy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = _hash(ix, iy, s), _hash(ix + 1, iy, s)
    c, d = _hash(ix, iy + 1, s), _hash(ix + 1, iy + 1, s)
    return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy).astype(F)


def fbm(x, y, oit=4, s=0):
    tot, amp, nor = 0, 1.0, 0
    for o in range(oit):
        tot = tot + ruido(x * 2 ** o, y * 2 ** o, s + o * 31) * amp
        nor += amp; amp *= 0.5
    return (tot / nor).astype(F)


def voronoi(x, y, s=0):
    """Distância à borda da célula e id da célula (lajes, escamas)."""
    ix, iy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    d1 = np.full(x.shape, 9, F); d2 = np.full(x.shape, 9, F); idc = np.zeros(x.shape, np.int64)
    for j in (-1, 0, 1):
        for i in (-1, 0, 1):
            cx, cy = ix + i, iy + j
            px = cx + 0.15 + 0.7 * _hash(cx, cy, s); py = cy + 0.15 + 0.7 * _hash(cx, cy, s + 7)
            d = np.hypot(x - px, y - py).astype(F)
            menor = d < d1
            d2 = np.where(menor, d1, np.minimum(d2, d)); idc = np.where(menor, cx * 977 + cy, idc); d1 = np.where(menor, d, d1)
    return (d2 - d1).astype(F), idc


# ---------------------------------------------------------------- tela
class Tela:
    def __init__(self, W: int, H: int):
        self.W, self.H = W, H
        self.rgb = np.zeros((H, W, 3), F)
        self.a = np.zeros((H, W), F)
        self.y, self.x = np.mgrid[0:H, 0:W].astype(F)
        self.bayer = np.tile(BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W]

    def tingir(self, mascara, luz, cores: np.ndarray, pont=0.5):
        """Pinta onde mascara>0 escolhendo o degrau da rampa pela luz (0..1)."""
        n = len(cores)
        k = np.clip(np.floor(luz * n + (self.bayer - 0.5) * pont), 0, n - 1).astype(int)
        m = mascara > 0
        self.rgb[m] = cores[k[m]]
        self.a[m] = 1

    def cor(self, mascara, cor, alfa=1.0):
        c = np.array(hexrgb(cor) if isinstance(cor, str) else cor, F)
        m = mascara > 0
        if alfa >= 1:
            self.rgb[m] = c; self.a[m] = 1
        else:
            self.rgb[m] = self.rgb[m] * (1 - alfa) + c * alfa; self.a[m] = np.maximum(self.a[m], alfa)

    def velar(self, fator, cor):
        """Mistura uma cor por cima (névoa, perspectiva atmosférica) onde já há pintura."""
        c = np.array(hexrgb(cor), F); f = np.clip(fator, 0, 1)[..., None]
        self.rgb = self.rgb * (1 - f) + c * f

    def salvar(self, caminho):
        img = np.dstack([np.clip(self.rgb, 0, 255), self.a * 255]).astype(np.uint8)
        Image.fromarray(img, 'RGBA').save(caminho, optimize=True)


def contorno(t: Tela, cor='#0c0a08', so_externo=True):
    """Contorno de 1 px em volta do que foi pintado (lê melhor na escala pequena)."""
    a = t.a > 0.5
    viz = np.zeros_like(a)
    viz[1:] |= a[:-1]; viz[:-1] |= a[1:]; viz[:, 1:] |= a[:, :-1]; viz[:, :-1] |= a[:, 1:]
    borda = viz & ~a
    t.cor(borda, cor)
