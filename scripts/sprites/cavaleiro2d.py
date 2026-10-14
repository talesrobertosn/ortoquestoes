#!/usr/bin/env python3
"""Herói do Orto Questões (e mascote do site), refeito do zero em 14/10/2026.

Pedido do Tales: abandonar o rosto redondo e infantil e seguir o conceito
docs/flashcards/conceitos/heroi-adulto-proposta.png: cavaleiro adulto, heroico, de pernas longas e
cabeça pequena, elmo aberto com pluma azul e frisos dourados, cachecol azul, ombreiras em lâminas,
peitoral, cota de malha, tabardo azul com borda dourada, cintos de couro, capa vermelha, escudo
azul com cruz dourada, espada longa, joelheiras, grevas e botas.

O conceito serve só de direção: as medidas foram tomadas dele (1 pixel aqui = ~10 do conceito) e
tudo é desenhado aqui, peça por peça, por polígonos em ossos 2D, com luz de cima e da esquerda,
metal com brilho especular, tecido em faixas de tom, contorno escuro e retoques pixel a pixel no
rosto. Olha para a direita (para o adversário).

    python3 scripts/sprites/cavaleiro2d.py                 # grava heroi-1..6 em public/flashcards/sprites/
    python3 scripts/sprites/cavaleiro2d.py --previa x.png  # prévia ampliada (estágios × quadros)
    python3 scripts/sprites/cavaleiro2d.py --mascote       # mascote grande do site em public/mascote/
"""
from __future__ import annotations

import argparse
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from motor import gravar_folha  # noqa: E402

RAIZ = AQUI.parents[1]
DESTINO = RAIZ / 'public' / 'flashcards' / 'sprites'

W, H = 136, 170          # quadro (folga em cima para a espada erguida)
OX, OY = 4, 14           # deslocamento das medidas de repouso dentro do quadro
ANCORA = (64 + OX, 150 + OY)
SS = 4                   # superamostragem das máscaras

# ------------------------------------------------------------------ paletas (escuro → claro)


def hx(c: str):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


PAL = {
    'aco': ['#141821', '#252b38', '#394152', '#535d71', '#76829a', '#a1adc0', '#ced7e4', '#f6f9fc'],
    'ouro': ['#3b2306', '#6d440f', '#a46e1c', '#d29d35', '#f0c862', '#fde9a8'],
    'azul': ['#0d1431', '#172656', '#203a84', '#2c4fa8', '#4268c4', '#6a8cdc'],
    'marinho': ['#0b1020', '#141d38', '#1e2c52', '#2a3d6c', '#3b5186'],
    'vermelho': ['#2e070c', '#541018', '#801b20', '#a8292a', '#cc4434', '#e46a4a'],
    'couro': ['#1d0f08', '#372010', '#56321b', '#784a28', '#9a6536', '#bb8550'],
    'pele': ['#45231a', '#74412c', '#a06244', '#c4865e', '#ddaa80', '#f0cba2'],
    'malha': ['#161920', '#2a303d', '#474f61', '#6c778b', '#98a3b6'],
    'madeira': ['#28160a', '#472912', '#6a401e', '#8d5a2b', '#ab773f'],
    'pluma': ['#0a1840', '#13307a', '#1d4cb4', '#3270d6', '#5e9aee', '#a2c8f8'],
    'cabelo': ['#160d07', '#2c1a0e', '#452b17', '#5e3e22'],
    'perola': ['#3a332d', '#625a50', '#8f877b', '#bab3a6', '#dcd7cc', '#f4f1ea', '#ffffff'],
    'lamina': ['#3d78c0', '#6aa8e6', '#a4d2f8', '#d8f0ff', '#ffffff'],
    'branco': ['#3c4252', '#6c7488', '#a2aabb', '#d0d6e2', '#f2f5fa'],
    'escuro': ['#0c0a10', '#1d1820'],
}
PAL = {k: [hx(c) for c in v] for k, v in PAL.items()}
CONTORNO = {k: tuple(int(c * 0.5) for c in v[0]) for k, v in PAL.items()}
CONTORNO['pele'] = (40, 18, 14)

LUZ = np.array([-0.5, -0.6, 0.62])
LUZ = LUZ / np.linalg.norm(LUZ)
MEIO = LUZ + np.array([0, 0, 1.0])
MEIO = MEIO / np.linalg.norm(MEIO)


def R(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s], [s, c]])


def ang_de(v):
    """Ângulo de osso (0 = apontando para baixo) de um vetor."""
    return math.atan2(-v[0], v[1])


@dataclass
class Peca:
    poly: list            # pontos no mundo (já posados)
    mat: str
    z: float
    luz: tuple            # ('cil', o, ang, L, w0, w1) | ('esf', c, rx, ry) | ('plano', nx, ny, g) | ('lisa', i)
    metal: bool = False
    grupo: str = ''
    detalhe: bool = False  # peça de enfeite: não provoca contorno nas de trás
    textura: str = ''
    emissivo: bool = False


def elipse(c, rx, ry, n=28, a0=0.0, a1=2 * math.pi):
    return [(c[0] + rx * math.cos(a0 + (a1 - a0) * i / n), c[1] + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


# ------------------------------------------------------------------ esqueleto
# Cada peça é desenhada nas medidas de repouso (em pixels do quadro, antes de OX/OY) e presa a um
# osso. Ao posar, o osso leva a peça: p' = J' + R(θ' − θ)(p − J).


class Osso:
    def __init__(self, J, th, Jp=None, thp=None):
        self.J = np.array(J, float)
        self.th = th
        self.Jp = self.J.copy() if Jp is None else np.array(Jp, float)
        self.thp = th if thp is None else thp

    def tf(self, p):
        return self.Jp + R(self.thp - self.th) @ (np.array(p, float) - self.J)

    def pts(self, lista):
        return [tuple(self.tf(p)) for p in lista]

    def luz(self, l):
        if l[0] == 'cil':
            _, o, a, L, w0, w1 = l
            return ('cil', self.tf(o), a + self.thp - self.th, L, w0, w1)
        if l[0] == 'esf':
            _, c, rx, ry = l
            return ('esf', self.tf(c), rx, ry)
        return l


def ik(Hq, A, L1, L2, joelho_repouso, Hr, Ar):
    """Joelho de duas peças: quadril Hq, tornozelo A; dobra para o mesmo lado do repouso."""
    d = A - Hq
    n = np.linalg.norm(d)
    n2 = min(max(n, 1e-3), L1 + L2 - 0.05)
    ca = (L1 * L1 + n2 * n2 - L2 * L2) / (2 * L1 * n2)
    a = math.acos(max(-1, min(1, ca)))
    dr, kr = Ar - Hr, joelho_repouso - Hr
    lado = 1 if (dr[0] * kr[1] - dr[1] * kr[0]) > 0 else -1
    u = d / max(n, 1e-3)
    return Hq + (R(-lado * a) @ u) * L1


# ------------------------------------------------------------------ rasterização e luz


def mascara(poly):
    im = Image.new('L', (W * SS, H * SS), 0)
    ImageDraw.Draw(im).polygon([(x * SS, y * SS) for x, y in poly], fill=255)
    a = np.asarray(im, np.float32).reshape(H, SS, W, SS).mean(axis=(1, 3)) / 255
    return a >= 0.5


YY, XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5


def normais(p: Peca):
    k = p.luz[0]
    if k == 'cil':
        _, o, ang, L, w0, w1 = p.luz
        ax = np.array([-math.sin(ang), math.cos(ang)])
        d = np.array([math.cos(ang), math.sin(ang)])
        rx, ry = XX - o[0], YY - o[1]
        t = np.clip((rx * ax[0] + ry * ax[1]) / max(L, 1e-3), 0, 1)
        w = (w0 + (w1 - w0) * t) / 2
        u = np.clip((rx * d[0] + ry * d[1]) / np.maximum(w, 0.5), -0.97, 0.97)
        nz = np.sqrt(1 - u * u)
        return u * d[0], u * d[1], nz
    if k == 'esf':
        _, c, rx, ry = p.luz
        ex, ey = (XX - c[0]) / rx, (YY - c[1]) / ry
        r2 = np.clip(ex * ex + ey * ey, 0, 0.95)
        return ex, ey, np.sqrt(1 - r2)
    if k == 'lisa':
        return None
    _, nx, ny, g = p.luz
    ys = np.array([y for _, y in p.poly])
    y0, y1 = ys.min(), ys.max()
    t = (YY - y0) / max(y1 - y0, 1)
    ny2 = ny + g * (t - 0.5)
    nz = np.sqrt(np.clip(1 - nx * nx - ny2 * ny2, 0.05, 1))
    return np.full_like(XX, nx), ny2, nz


def tons(p: Peca):
    pal = PAL[p.mat]
    n = len(pal)
    N = normais(p)
    if N is None:
        return np.broadcast_to(np.array(pal[min(p.luz[1], n - 1)], np.uint8), (H, W, 3))
    nx, ny, nz = N
    dif = nx * LUZ[0] + ny * LUZ[1] + nz * LUZ[2]
    if p.emissivo:
        s = 0.5 + 0.5 * np.clip(dif, 0, 1)
    elif p.metal:
        spec = np.clip(nx * MEIO[0] + ny * MEIO[1] + nz * MEIO[2], 0, 1) ** 22
        s = 0.2 + 0.52 * np.clip(dif * 0.55 + 0.45, 0, 1) ** 1.3 + 0.4 * spec
        s -= 0.13 * np.exp(-((ny + 0.1) / 0.13) ** 2) * (nz > 0.5)   # reflexo escuro do horizonte
        s += 0.3 * np.clip(nx - 0.55, 0, 1)                            # luz de recorte à direita
    else:
        s = 0.08 + 0.86 * np.clip(dif * 0.62 + 0.38, 0, 1)
    if p.textura == 'malha':
        xi, yi = XX.astype(int), YY.astype(int)
        s = s + np.where((xi + yi) % 2 == 0, 0.1, -0.08) - np.where(yi % 2 == 0, 0.04, 0)
    idx = np.clip(np.floor(np.clip(s, 0, 0.999) * n), 0, n - 1).astype(int)
    return np.array(pal, np.uint8)[idx]


def carimbo_raster(p: Peca):
    """Carimbo desenhado à mão: amostra o desenho de origem pelo inverso do giro do osso (sem buracos)."""
    _, grade, origem, piv_rep, piv_mundo, ang = p.luz
    m = np.zeros((H, W), bool)
    cor = np.zeros((H, W, 3), np.uint8)
    mats = np.full((H, W), '', object)
    hs, ws = len(grade), max(len(r) for r in grade)
    ca, sa = math.cos(-ang), math.sin(-ang)
    raio = hs + ws
    cx, cy = piv_mundo
    for y in range(max(0, int(cy - raio)), min(H, int(cy + raio))):
        for x in range(max(0, int(cx - raio)), min(W, int(cx + raio))):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            sx = piv_rep[0] + ca * dx - sa * dy - origem[0]
            sy = piv_rep[1] + sa * dx + ca * dy - origem[1]
            r, c = int(math.floor(sy)), int(math.floor(sx))
            if 0 <= r < hs and 0 <= c < len(grade[r]):
                cod = grade[r][c]
                if cod is not None:
                    mat, i = cod
                    m[y, x] = True
                    cor[y, x] = PAL[mat][i]
                    mats[y, x] = mat
    return m, cor, mats


def render(pecas: list[Peca], retoques=()):
    cor = np.zeros((H, W, 3), np.uint8)
    alfa = np.zeros((H, W), bool)
    zb = np.full((H, W), -1e9, np.float32)
    mat = np.full((H, W), '', object)
    grp = np.full((H, W), '', object)
    det = np.zeros((H, W), bool)
    mao = np.zeros((H, W), bool)   # pixels desenhados à mão: a limpeza não mexe neles
    for p in sorted(pecas, key=lambda q: q.z):
        if p.luz[0] == 'carimbo':
            m, c, mats = carimbo_raster(p)
            if not m.any():
                continue
            cor[m] = c[m]
            alfa |= m
            zb[m] = p.z
            mat[m] = mats[m]
            grp[m] = p.grupo
            det[m] = p.detalhe
            mao[m] = True
            continue
        m = mascara(p.poly)
        if not m.any():
            continue
        c = tons(p)
        cor[m] = c[m]
        alfa |= m
        zb[m] = p.z
        mat[m] = p.mat
        grp[m] = p.grupo or str(id(p))
        det[m] = p.detalhe
        mao[m] = False
    # limpeza: pixel isolado de um tom (nenhum vizinho igual na mesma peça) vira o tom vizinho
    viz = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    nova = cor.copy()
    ys, xs = np.where(alfa & ~det & ~mao)
    for y, x in zip(ys, xs):
        if y == 0 or x == 0 or y == H - 1 or x == W - 1:
            continue
        iguais, outros = 0, []
        for dy, dx in viz:
            yy, xx = y + dy, x + dx
            if alfa[yy, xx] and grp[yy, xx] == grp[y, x]:
                if (cor[yy, xx] == cor[y, x]).all():
                    iguais += 1
                else:
                    outros.append(tuple(cor[yy, xx]))
        if iguais == 0 and len(outros) >= 3:
            nova[y, x] = max(set(outros), key=outros.count)
    cor = nova
    # retoques à mão (rosto etc.): (x, y, rgb, z) só onde nada mais à frente cobre
    for x, y, c, z in retoques:
        xi, yi = int(math.floor(x)), int(math.floor(y))
        if 0 <= xi < W and 0 <= yi < H and alfa[yi, xi] and zb[yi, xi] <= z:
            cor[yi, xi] = c
    saida = cor.copy()
    borda = np.zeros_like(alfa)
    for dy, dx in viz:
        borda |= alfa & ~np.roll(np.roll(alfa, dy, 0), dx, 1)
    sel = np.zeros_like(alfa)
    for dy, dx in viz:
        zn = np.roll(np.roll(zb, dy, 0), dx, 1)
        gn = np.roll(np.roll(grp, dy, 0), dx, 1)
        dn = np.roll(np.roll(det, dy, 0), dx, 1)
        an = np.roll(np.roll(alfa, dy, 0), dx, 1)
        sel |= alfa & an & (zn > zb + 0.25) & (gn != grp) & ~dn
    for y, x in zip(*np.where(sel & ~borda)):
        pal = PAL[mat[y, x]]
        saida[y, x] = pal[0] if mat[y, x] not in ('aco', 'perola', 'pele') else pal[1]
    for y, x in zip(*np.where(borda)):
        saida[y, x] = CONTORNO[mat[y, x]]
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., :3] = saida
    rgba[..., 3] = np.where(alfa, 255, 0)
    return rgba


# ------------------------------------------------------------------ estágios

ESTAGIOS = {
    1: dict(tam=0.94, armadura='aco', peitoral=False, ombreira='couro', malha=False, grevas=False, joelheira=False, capa=None,
            espada=30, escudo='madeira', campo='azul', cruz='branco', ouro=False, pluma=0, elmo_ouro=False),
    2: dict(tam=0.96, armadura='aco', peitoral=False, ombreira='couro', malha=True, grevas=False, joelheira=True, capa=None,
            espada=34, escudo='aco', campo='azul', cruz='branco', ouro=False, pluma=1, elmo_ouro=False),
    3: dict(tam=0.98, armadura='aco', peitoral=True, ombreira='aco', malha=True, grevas=False, joelheira=True, capa='vermelho',
            espada=38, escudo='aco', campo='azul', cruz='ouro', ouro=False, pluma=1, elmo_ouro=True),
    4: dict(tam=1.00, armadura='aco', peitoral=True, ombreira='aco', malha=True, grevas=True, joelheira=True, capa='vermelho',
            espada=41, escudo='aco', campo='azul', cruz='ouro', ouro=False, pluma=2, elmo_ouro=True),
    5: dict(tam=1.02, armadura='aco', peitoral=True, ombreira='aco', malha=True, grevas=True, joelheira=True, capa='vermelho',
            espada=43, escudo='ouro', campo='azul', cruz='ouro', ouro=True, pluma=2, elmo_ouro=True),
    6: dict(tam=1.04, armadura='perola', peitoral=True, ombreira='perola', malha=True, grevas=True, joelheira=True, capa='vermelho',
            espada=44, escudo='ouro', campo='azul', cruz='ouro', ouro=True, pluma=3, elmo_ouro=True, lenda=True),
}

# medidas de repouso (pixels do quadro, antes de OX/OY), tiradas do conceito
QUADRIL = (64.0, 86.0)
OMBRO_E, COTOVELO_E, PUNHO_E = (50.5, 68.0), (45.8, 81.0), (44.2, 89.6)
OMBRO_D, COTOVELO_D = (79.0, 68.0), (82.0, 81.0)
PESCOCO = (64.5, 63.0)
POMO = (45.6, 88.0)
DIR_ESP = np.array([-22.5, 49.0]) / np.linalg.norm([-22.5, 49.0])
PERNAS = {
    'e': dict(q=(59.0, 88.0), j=(52.5, 118.5), t=(50.0, 140.0)),
    'd': dict(q=(68.5, 88.0), j=(74.5, 118.5), t=(81.0, 140.0)),
}


def membro(o: Osso, A, B, w0, w1, mat, z, metal=False, grupo='', textura=''):
    """Segmento afinado de A a B (repouso) com pontas arredondadas, preso ao osso o."""
    A, B = np.array(A, float), np.array(B, float)
    L = np.linalg.norm(B - A)
    a = ang_de(B - A)
    pts = []
    n = 6
    for i in range(n + 1):
        t = math.pi + math.pi * i / n
        pts.append((w0 / 2 * math.cos(t), w0 / 2 * math.sin(t) * 0.7))
    for i in range(n + 1):
        t = math.pi * i / n
        pts.append((w1 / 2 * math.cos(t), L + w1 / 2 * math.sin(t) * 0.7))
    mundo = [tuple(A + R(a) @ np.array(p)) for p in pts]
    return Peca(o.pts(mundo), mat, z, o.luz(('cil', A, a, L, w0, w1)), metal, grupo, textura=textura)


# ------------------------------------------------------------------ cabeça (desenho à mão)
# Legenda: aço 1-7, ouro a-e (1-5), pele o p q r s t (0-5), cabelo g h (1, 2), olho e (escuro) e
# Q (branco do olho), pluma T U V X Y Z (0-5), contorno K. Coordenadas: coluna 0 = x 54, linha 0 = y 37.
LEGENDA = {**{str(i): ('aco', i) for i in range(1, 8)}, 'a': ('ouro', 1), 'b': ('ouro', 2), 'c': ('ouro', 3), 'd': ('ouro', 4), 'e': ('ouro', 5),
           'o': ('pele', 0), 'p': ('pele', 1), 'q': ('pele', 2), 'r': ('pele', 3), 's': ('pele', 4), 't': ('pele', 5),
           'g': ('cabelo', 1), 'h': ('cabelo', 2), 'E': ('escuro', 0), 'Q': ('branco', 3), 'K': ('escuro', 0),
           'T': ('pluma', 0), 'U': ('pluma', 1), 'V': ('pluma', 2), 'X': ('pluma', 3), 'Y': ('pluma', 4), 'Z': ('pluma', 5)}
CAB_X0, CAB_Y0 = 54, 37

ROSTO = {   # linha: (coluna inicial, pixels)
    17: (5, '5664qrrqqqqqq32'),
    18: (5, '5d63rghrrrghq3'),
    19: (5, '4653sQEsstEsr3'),
    20: (5, '4553sssstrttq2'),
    21: (5, '3442rssrrqrsp2'),
    22: (6, '343rsssqqrsp'),
    23: (6, '332rsrpppqo'),
    24: (7, '22qrssrqo'),
    25: (9, 'qrsrqo'),
    26: (10, 'qrq'),
}

PLUMA = {   # tufo de penas (origem x 52, y 33): sobe da crista, abre para trás e cai atrás do elmo
    0: (8, 'VXYYX'),
    1: (5, 'UVXYZZYXV'),
    2: (3, 'UVXXYZZYXXV'),
    3: (2, 'UVXVXYYYXXVXV'),
    4: (1, 'UVXVVXXYXXVVXV'),
    5: (0, 'UVVUVVXXXXVUVXV'),
    6: (0, 'UVUTUVVXXVVUUVXV'),
    7: (0, 'VVT.TUVVVVUT.TVXV'),
    8: (0, 'VXV..TUUVUT...TVX'),
    9: (0, 'VXVU..TTUT....TUVX'),
    10: (0, 'UVXVU.........TUV'),
    11: (0, 'UVXVUT........TUV'),
    12: (1, 'UVVUT.........TU'),
    13: (1, 'TUVUT'),
    14: (2, 'TUVT'),
    15: (2, 'TUU'),
    16: (3, 'TU'),
    17: (3, 'T'),
}
PLUMA_X0, PLUMA_Y0 = 52, 33


def grade_de(linhas, alt):
    g = [[None] * 24 for _ in range(alt)]
    for r, (c0, txt) in linhas.items():
        for i, ch in enumerate(txt):
            if ch != '.':
                g[r][c0 + i] = LEGENDA[ch]
    return g


def domo_elmo(g, ouro_elmo, lenda):
    """Domo de aço alto e redondo (linhas 9 a 15), aba dourada fina (16) e sombra da aba (17 só nos lados)."""
    metal = 'perola' if lenda else 'aco'
    cx, topo, base = 11.6, 8.6, 16.2
    for r in range(8, 16):
        y = r + 0.5
        t = (y - topo) / (base - topo)
        meia = 7.4 * math.sqrt(max(0.0, 1 - (1 - t) ** 2 * 1.0)) + 0.25
        for c in range(24):
            x = c + 0.5
            if abs(x - cx) > meia:
                continue
            nx = (x - cx) / max(meia, 1)
            ny = -(1 - t)
            v = 0.52 - 0.34 * nx - 0.3 * ny * 0.7 + 0.1
            v += 0.5 * math.exp(-(((nx + 0.42) / 0.2) ** 2 + ((t - 0.32) / 0.18) ** 2))   # brilho alto à esquerda
            v -= 0.18 * math.exp(-((t - 0.78) / 0.12) ** 2)                              # faixa escura do reflexo
            if abs(x - cx) > meia - 0.9:
                v -= 0.18                                                                  # borda escurece
            i = int(min(7, max(1, round(v * 7))))
            g[r][c] = (metal, min(i, len(PAL[metal]) - 1))
    # crista (friso) no meio, um pouco para a direita por causa do 3/4
    for r in range(8, 16):
        cr = 12
        g[r][cr] = ('ouro', 5 if r < 11 else 4) if ouro_elmo else (metal, 7)
        g[r][cr + 1] = ('ouro', 3) if ouro_elmo else (metal, 4)
    # aba fina: uma linha dourada e, embaixo, a sombra
    aba = 'ouro' if ouro_elmo else metal
    for c in range(3, 21):
        x = c + 0.5
        g[16][c] = (aba, 5 if 5 <= c <= 8 else (4 if c < 13 else 3)) if aba == 'ouro' else (aba, 6 if c < 9 else 4)
    g[16][3] = (aba, 2)
    g[16][20] = (aba, 2)
    if ouro_elmo:
        g[12][5] = ('ouro', 4)   # rebite dourado do lado
    return g


def cabeca_desenho(cab, E, k, P, zc):
    lenda = bool(E.get('lenda'))
    g = grade_de(ROSTO, 28)
    g = domo_elmo(g, E['elmo_ouro'], lenda)
    if lenda:   # protetores de face em pérola
        for r in range(17, 25):
            for c in range(24):
                if g[r][c] and g[r][c][0] == 'aco':
                    g[r][c] = ('perola', min(6, g[r][c][1] + 1))
    piv = PESCOCO
    P.append(Peca([], 'aco', zc, ('carimbo', g, (CAB_X0, CAB_Y0), piv, cab.tf(piv), cab.thp - cab.th), grupo='cabeca'))
    if E['pluma']:
        gp = grade_de(PLUMA, 18)
        if E['pluma'] == 1:   # pluma curta do escudeiro: só a metade de baixo
            gp = [[None] * 24 for _ in range(6)] + gp[6:]
        sw = k('pluma', 0)
        # a pluma balança: gira em torno da base, no alto do elmo
        base = (CAB_X0 + 10.5, CAB_Y0 + 9.5)
        Jb = cab.tf(base)
        osso_p = Osso(base, 0.0, Jb, (cab.thp - cab.th) - 0.06 * sw)
        P.append(Peca([], 'pluma', zc - 0.05, ('carimbo', gp, (PLUMA_X0, PLUMA_Y0), base, osso_p.tf(base), osso_p.thp), grupo='pluma'))



def montar(e: int, t: dict):
    E = ESTAGIOS[e]
    k = t.get
    P: list[Peca] = []
    RT: list = []
    ar = E['armadura']
    ouro = E['ouro']

    def add(osso, poly, mat, z, luz, **kw):
        P.append(Peca(osso.pts(poly), mat, z, osso.luz(luz), **kw))

    def px(osso, x, y, mat, i, z):
        q = osso.tf((x, y))
        RT.append((q[0], q[1], PAL[mat][i], z))

    # ---------------- ossos
    Q = np.array(QUADRIL)
    Qp = Q + np.array([k('x', 0), k('agacha', 0) + k('resp', 0)])
    tronco = Osso(Q, 0.0, Qp, k('tronco', 0))
    cab = Osso(PESCOCO, 0.0, tronco.tf(PESCOCO), k('tronco', 0) + k('cabeca', 0))

    def braco(ombro, cot, chave, th_b_rep, th_a_rep):
        Jo = tronco.tf(ombro)
        thb = k(chave + '_b', th_b_rep + k('tronco', 0))
        Lb = np.linalg.norm(np.array(cot) - np.array(ombro))
        sup = Osso(ombro, th_b_rep, Jo, thb)
        Jc = Jo + R(thb) @ np.array([0, Lb])
        tha = k(chave + '_a', th_a_rep + (thb - th_b_rep))
        ante = Osso(cot, th_a_rep, Jc, tha)
        return sup, ante

    thb_e = ang_de(np.array(COTOVELO_E) - OMBRO_E)
    tha_e = ang_de(np.array(PUNHO_E) - COTOVELO_E)
    sup_e, ante_e = braco(OMBRO_E, COTOVELO_E, 'be', thb_e, tha_e)
    th_esp = ang_de(DIR_ESP)
    mao_e = np.array(POMO) + DIR_ESP * 4.6
    esp = Osso(mao_e, th_esp, ante_e.tf(mao_e), k('esp', th_esp + (ante_e.thp - ante_e.th)))
    thb_d = ang_de(np.array(COTOVELO_D) - OMBRO_D)
    sup_d, ante_d = braco(OMBRO_D, COTOVELO_D, 'bd', thb_d, 0.0)

    pernas = {}
    for lado, M in PERNAS.items():
        q, j, tt = (np.array(M[c]) for c in 'qjt')
        L1, L2 = np.linalg.norm(j - q), np.linalg.norm(tt - j)
        qp = q + (Qp - Q)  # o quadril acompanha a bacia, não o giro do tronco
        tp = tt + np.array(k('pe_' + lado, (0, 0)))
        jp = ik(qp, tp, L1, L2, j, q, tt)
        coxa = Osso(q, ang_de(j - q), qp, ang_de(jp - qp))
        canela = Osso(j, ang_de(tt - j), jp, ang_de(tp - jp))
        pe = Osso(tt, 0.0, tp, k('pe_ang_' + lado, 0.0))
        pernas[lado] = (coxa, canela, pe)

    # ---------------- capa (atrás de tudo, aparece à direita do escudo)
    if E['capa']:
        sw = k('capa', 0)
        cm = E['capa']
        add(tronco, [(70, 62), (81, 61.5), (88, 64.5), (92.5, 74), (94.5 + sw * 0.5, 88), (96.5 + sw, 104), (98 + sw * 1.6, 120), (94 + sw * 1.5, 124),
                     (90 + sw, 120), (86, 124), (80, 118), (75, 104), (72, 88)], cm, 0.5, ('plano', 0.35, -0.1, 0.8), grupo='capa')
        for x0 in (89.0, 93.0):   # dobras
            add(tronco, [(x0, 72), (x0 + 1.0, 72), (x0 + 3.0 + sw, 118), (x0 + 2.0 + sw, 118)], cm, 0.55, ('lisa', 1), grupo='capa', detalhe=True)

    # ---------------- pernas (a de trás, esquerda da imagem, primeiro)
    for lado, z in (('e', 2.0), ('d', 2.3)):
        coxa, canela, pe = pernas[lado]
        M = PERNAS[lado]
        q, j, tt = M['q'], M['j'], M['t']
        g = 'perna_' + lado
        fora = -1 if lado == 'e' else 1
        # calça bufante azul-marinho
        P.append(membro(coxa, q, j, 11.5, 8.6, 'marinho', z, grupo=g))
        mid = (np.array(q) + np.array(j)) / 2
        add(coxa, [(mid[0] + fora * 5.6, mid[1] - 3), (mid[0] + fora * 6.3, mid[1] + 3), (mid[0] + fora * 4.2, mid[1] + 6), (mid[0] + fora * 3.8, mid[1] - 2)],
            'marinho', z + 0.01, ('plano', 0.4 * fora, 0.1, 0.4), grupo=g)
        for dy in (-4, 2, 7):  # dobras da calça
            add(coxa, [(mid[0] - 3, mid[1] + dy), (mid[0] + 2.5, mid[1] + dy + 1.6 * fora), (mid[0] + 2.5, mid[1] + dy + 1.6 * fora + 0.9), (mid[0] - 3, mid[1] + dy + 0.9)],
                'marinho', z + 0.02, ('lisa', 1), grupo=g, detalhe=True)
        # canela: bota de couro inteira, greva de aço na frente
        P.append(membro(canela, j, tt, 8.4, 7.2, 'couro', z + 0.05, grupo=g + 'b'))
        jj, ta = np.array(j), np.array(tt)
        if E['grevas']:
            dentro = np.array([-fora * 0.9, 0])
            P.append(membro(canela, jj + dentro + (0, 2.5), ta + dentro + (0, -3.5), 7.4, 5.8, ar, z + 0.1, metal=True, grupo=g + 'g'))
            a0, a1 = jj + dentro + (0.4, 4), ta + dentro + (0.2, -5)
            add(canela, [tuple(a0 + (-0.5, 0)), tuple(a0 + (0.5, 0)), tuple(a1 + (0.5, 0)), tuple(a1 + (-0.5, 0))], ar, z + 0.12, ('lisa', 6 if lado == 'e' else 5), metal=True, grupo=g + 'g', detalhe=True)
            if ouro:
                add(canela, [tuple(jj + dentro + (-3.6, 2.6)), tuple(jj + dentro + (3.6, 2.6)), tuple(jj + dentro + (3.4, 3.8)), tuple(jj + dentro + (-3.4, 3.8))],
                    'ouro', z + 0.13, ('plano', -0.2, -0.3, 0), metal=True, grupo=g + 'g', detalhe=True)
        else:
            for dy in (6, 12):
                c0 = jj + (0, dy)
                add(canela, [tuple(c0 + (-4, 0)), tuple(c0 + (4, 0.6)), tuple(c0 + (4, 1.4)), tuple(c0 + (-4, 0.8))], 'couro', z + 0.06, ('lisa', 1), grupo=g + 'b', detalhe=True)
        # cano da bota dobrado
        add(canela, [(tt[0] - 4.8, tt[1] - 4.2), (tt[0] + 4.8, tt[1] - 4.2), (tt[0] + 4.4, tt[1] + 0.6), (tt[0] - 4.4, tt[1] + 0.6)], 'couro', z + 0.14,
            ('cil', (tt[0] - 4.8, tt[1] - 2), -math.pi / 2, 9.6, 4.8, 4.8), grupo=g + 'c')
        # joelheira
        if E['joelheira']:
            jm = ar if e >= 3 else 'couro'
            add(canela, elipse(j, 4.8, 4.2), jm, z + 0.2, ('esf', j, 4.8, 4.6), metal=jm != 'couro', grupo=g + 'j')
            add(canela, [(j[0] + fora * 3.0, j[1] - 2.4), (j[0] + fora * 7.0, j[1] - 1.0), (j[0] + fora * 6.4, j[1] + 2.6), (j[0] + fora * 3.2, j[1] + 2.2)],
                jm, z + 0.19, ('plano', 0.5 * fora, -0.1, 0.3), metal=jm != 'couro', grupo=g + 'j')
            if e >= 3:
                add(canela, elipse((j[0] + 0.3, j[1] - 0.2), 1.4, 1.3, 10), 'ouro', z + 0.22, ('esf', (j[0] + 0.3, j[1] - 0.2), 1.4, 1.3), metal=True, grupo=g + 'j', detalhe=True)
                add(canela, [(j[0] - 4.4, j[1] + 2.6), (j[0] + 4.4, j[1] + 2.6), (j[0] + 3.4, j[1] + 4.0), (j[0] - 3.4, j[1] + 4.0)], 'ouro', z + 0.21,
                    ('plano', 0, 0.3, 0.2), metal=True, grupo=g + 'j', detalhe=True)
        # pé: sapato de couro com biqueira de aço em lâminas
        if lado == 'e':
            sola = [(39.0, 148.5), (40.5, 145.2), (44.5, 142.6), (49.5, 140.8), (54.6, 142.0), (55.8, 146.5), (55.2, 150.2), (39.6, 150.6)]
            cobre = [(40.0, 147.6), (41.2, 144.8), (45.0, 142.4), (50.0, 141.0), (51.5, 144.0), (47.0, 146.6)]
        else:
            sola = [(77.8, 146.0), (79.0, 141.6), (83.6, 140.6), (87.0, 143.4), (90.4, 147.2), (90.8, 150.6), (78.4, 150.4)]
            cobre = [(80.4, 142.2), (83.6, 141.0), (87.2, 143.6), (90.0, 147.2), (85.6, 147.6), (81.6, 145.6)]
        add(pe, sola, 'couro', z + 0.15, ('plano', 0.0, -0.4, 0.9), grupo=g + 'p')
        xs_ = [x for x, _ in sola]
        add(pe, [(min(xs_), 149.0), (max(xs_), 149.0), (max(xs_), 150.8), (min(xs_), 150.8)], 'couro', z + 0.16, ('lisa', 0), grupo=g + 'p', detalhe=True)
        if E['grevas']:
            add(pe, cobre, ar, z + 0.17, ('lisa', 3), grupo=g + 'pa')
            add(pe, cobre[:4], ar, z + 0.175, ('lisa', 5), grupo=g + 'pa', detalhe=True)   # borda de cima pega a luz

    # ---------------- saia de malha, tabardo
    sk = 'malha' if E['malha'] else 'azul'
    add(tronco, [(55.0, 84), (73.8, 84), (76.4, 95), (77.2, 105), (71, 106.6), (64.5, 105.2), (58, 106.6), (51.6, 105), (52.6, 95)], sk, 3.0,
        ('plano', 0.0, 0.1, 0.6), grupo='saia', textura='malha' if E['malha'] else '')
    tab = [(58.4, 84), (70.2, 84), (71.0, 97), (72.0, 110.4), (64.6, 112.0), (57.2, 110.6), (57.8, 97)]
    add(tronco, tab, 'ouro' if e >= 2 else 'couro', 3.4, ('plano', 0.0, 0.0, 0.4), metal=e >= 2, grupo='tabardo')
    tab_i = [(59.6, 84), (69.0, 84), (69.8, 97), (70.6, 109.2), (64.6, 110.6), (58.6, 109.4), (59.0, 97)]
    add(tronco, tab_i, 'azul', 3.5, ('cil', (59.2, 97), -math.pi / 2, 11, 30, 30), grupo='tabardo', detalhe=True)
    for xs in (62.0, 67.2):  # pregas verticais
        add(tronco, [(xs, 88), (xs + 0.9, 88), (xs + 1.2, 108.6), (xs + 0.3, 108.8)], 'azul', 3.52, ('lisa', 1), grupo='tabardo', detalhe=True)
    if e >= 3:  # flor dourada perto da barra
        for x, y in ((64, 105), (63, 106), (65, 106), (64, 106), (64, 107)):
            px(tronco, x + 0.5, y + 0.5, 'ouro', 4 if (x, y) == (64, 105) else 3, 3.6)

    # ---------------- tronco
    add(tronco, [(52, 63), (76.5, 62.5), (77.5, 71), (75, 80), (73.6, 86), (55.2, 86), (53.6, 80), (51.4, 71)], sk, 4.0,
        ('esf', (63, 72), 15, 16), grupo='corpo', textura='malha' if E['malha'] else '')
    add(tronco, [(54.6, 64.5), (74.6, 64), (75.0, 74), (73.4, 85), (55.6, 85), (54.6, 74)], 'azul', 4.1, ('esf', (62, 70), 14, 16), grupo='tunica')
    if E['peitoral']:
        pei = [(58.4, 65.0), (74.0, 64.4), (75.6, 71.5), (73.2, 79.2), (66.0, 82.2), (59.6, 79.8), (57.4, 72)]
        add(tronco, pei, ar, 4.3, ('esf', (63.5, 69.5), 11.5, 11), metal=True, grupo='peitoral')
        add(tronco, [(65.6, 65.4), (66.6, 65.2), (66.6, 81.2), (65.8, 81.4)], ar, 4.32, ('lisa', 5), metal=True, grupo='peitoral', detalhe=True)
        add(tronco, [(66.6, 65.2), (67.4, 65.2), (67.4, 81.0), (66.6, 81.2)], ar, 4.32, ('lisa', 2), metal=True, grupo='peitoral', detalhe=True)
        if ouro:
            add(tronco, [(58.4, 65.0), (74.0, 64.4), (74.2, 65.6), (58.6, 66.2)], 'ouro', 4.34, ('plano', 0, -0.4, 0), metal=True, grupo='peitoral', detalhe=True)
    # correia diagonal com fivela
    add(tronco, [(54.6, 63.2), (57.6, 63.0), (74.6, 82.6), (71.8, 84.0)], 'couro', 4.4, ('plano', 0.1, -0.2, 0.4), grupo='correia')
    add(tronco, [(59.6, 69.2), (62.8, 68.8), (63.6, 72.4), (60.4, 72.8)], 'ouro', 4.42, ('plano', -0.3, -0.4, 0.3), metal=True, grupo='correia', detalhe=True)
    add(tronco, [(60.6, 70.0), (62.0, 69.8), (62.4, 71.6), (61.0, 71.8)], 'couro', 4.43, ('lisa', 0), grupo='correia', detalhe=True)
    # cinto, fivela, bolsa
    add(tronco, [(54.4, 82.6), (74.2, 82.4), (74.4, 86.4), (54.6, 86.6)], 'couro', 4.5, ('cil', (54.4, 84.5), -math.pi / 2, 20, 4, 4), grupo='cinto')
    add(tronco, [(59.0, 82.2), (63.0, 82.2), (63.0, 87.0), (59.0, 87.0)], 'ouro', 4.52, ('plano', -0.3, -0.3, 0.3), metal=True, grupo='fivela')
    add(tronco, [(60.2, 83.4), (61.8, 83.4), (61.8, 85.8), (60.2, 85.8)], 'couro', 4.53, ('lisa', 0), grupo='fivela', detalhe=True)
    add(tronco, [(67.6, 86.0), (72.6, 85.8), (73.0, 92.0), (67.8, 92.4)], 'couro', 4.55, ('plano', 0.2, -0.2, 0.6), grupo='bolsa')
    add(tronco, [(67.4, 85.6), (72.8, 85.4), (72.8, 88.4), (70.2, 89.4), (67.4, 88.4)], 'couro', 4.56, ('plano', -0.2, -0.6, 0.2), grupo='bolsa', detalhe=True)
    add(tronco, [(69.6, 87.6), (70.8, 87.6), (70.8, 88.8), (69.6, 88.8)], 'ouro', 4.57, ('lisa', 4), grupo='bolsa', detalhe=True)

    # ---------------- braço da espada (direita do cavaleiro, à esquerda da imagem)
    zb = k('z_be', 4.8)
    P.append(membro(sup_e, OMBRO_E, COTOVELO_E, 7.4, 6.4, sk, zb, grupo='braco_e', textura='malha' if E['malha'] else ''))
    if E['peitoral']:
        P.append(membro(sup_e, (49.6, 71.5), (46.4, 79), 6.8, 6.0, ar, zb + 0.02, metal=True, grupo='braco_e'))
    P.append(membro(ante_e, COTOVELO_E, PUNHO_E, 6.6, 5.6, ar if E['grevas'] else 'couro', zb + 0.04, metal=E['grevas'], grupo='ante_e'))
    if e >= 2:
        add(ante_e, elipse(COTOVELO_E, 3.6, 3.3), ar, zb + 0.06, ('esf', COTOVELO_E, 3.6, 3.4), metal=True, grupo='cot_e')
        if e >= 3:
            add(ante_e, elipse((COTOVELO_E[0] - 0.6, COTOVELO_E[1] - 0.4), 1.0, 1.0, 8), 'ouro', zb + 0.07, ('lisa', 4), grupo='cot_e', detalhe=True)
    # espada
    Lb = E['espada']
    lam = 'lamina' if E.get('lenda') else ar
    d = DIR_ESP
    nrm = np.array([d[1], -d[0]])
    base = np.array(POMO) + d * 12.4
    ponta = base + d * Lb
    w0, w1 = 1.8, 1.4
    lamina = [base - nrm * w0, base + nrm * w0, ponta - d * 5 + nrm * w1, ponta, ponta - d * 5 - nrm * w1]
    zs = k('espada_frente') if k('espada_frente') is not None else zb - 0.1
    if E.get('lenda'):
        add(esp, [tuple(p) for p in lamina], lam, zs, ('cil', tuple(base), ang_de(d), Lb, 3.6, 2.8), grupo='espada', emissivo=True)
    else:
        add(esp, [tuple(p) for p in lamina], lam, zs, ('lisa', 4), grupo='espada')
        metade = [base + nrm * 0.1, base + nrm * w0, ponta - d * 5 + nrm * w1, ponta]   # lado de cima pega a luz
        add(esp, [tuple(p) for p in metade], lam, zs + 0.005, ('lisa', 6), grupo='espada', detalhe=True)
        fio = [base + nrm * (w0 - 0.5), base + nrm * w0, ponta - d * 5 + nrm * w1, ponta - d * 5 + nrm * (w1 - 0.5)]
        add(esp, [tuple(p) for p in fio], lam, zs + 0.006, ('lisa', 7), grupo='espada', detalhe=True)
    sulco = [base + d * 1.5 - nrm * 0.35, base + d * 1.5 + nrm * 0.35, base + d * (Lb * 0.6) + nrm * 0.3, base + d * (Lb * 0.6) - nrm * 0.3]
    add(esp, [tuple(p) for p in sulco], lam, zs + 0.01, ('lisa', 2 if E.get('lenda') else 3), grupo='espada', detalhe=True)
    gm = 'ouro' if e >= 3 else ('aco' if e == 2 else 'couro')
    g0 = np.array(POMO) + d * 11.4
    guarda = [g0 - nrm * 6.4 + d * 1.4, g0 - nrm * 5.6 - d * 0.4, g0 + nrm * 5.6 - d * 0.4, g0 + nrm * 6.4 + d * 1.4, g0 + nrm * 5.0 + d * 1.6, g0 - nrm * 5.0 + d * 1.6]
    zg = max(zb, zs) + 0.12
    add(esp, [tuple(p) for p in guarda], gm, zg, ('cil', tuple(g0 - nrm * 6), ang_de(nrm), 12.8, 2.0, 2.0), metal=gm != 'couro', grupo='guarda')
    punho = [np.array(POMO) + d * 1.4 - nrm * 1.1, np.array(POMO) + d * 1.4 + nrm * 1.1, g0 + nrm * 1.1, g0 - nrm * 1.1]
    add(esp, [tuple(p) for p in punho], 'couro', zg - 0.02, ('cil', tuple(np.array(POMO) + d * 1.4), ang_de(d), 10, 2.2, 2.2), grupo='punho')
    add(esp, elipse(POMO, 2.0, 2.0, 12), gm, zg - 0.01, ('esf', POMO, 2.0, 2.0), metal=gm != 'couro', grupo='pomo')
    # mão (luva de couro) fechada no punho
    mao = np.array(POMO) + d * 4.8
    add(esp, elipse(mao, 3.0, 3.3), 'couro', zg + 0.03, ('esf', tuple(mao), 3.0, 3.3), grupo='mao_e')
    add(esp, [tuple(mao + (-2.8, -0.8)), tuple(mao + (2.4, -1.4)), tuple(mao + (2.6, -0.6)), tuple(mao + (-2.8, 0.0))], 'couro', zg + 0.04, ('lisa', 1), grupo='mao_e', detalhe=True)
    add(esp, [tuple(mao + (-2.9, 0.9)), tuple(mao + (2.5, 0.3)), tuple(mao + (2.6, 1.0)), tuple(mao + (-2.9, 1.6))], 'couro', zg + 0.04, ('lisa', 1), grupo='mao_e', detalhe=True)

    # ---------------- cachecol, gorjal e cabeça
    zc = 6.0
    add(cab, [(60.2, 61.4), (68.8, 61.4), (68.6, 66.4), (60.4, 66.4)], ar, 5.0, ('cil', (60.2, 64), -math.pi / 2, 8.6, 5, 5), metal=True, grupo='gorjal')
    cach = [(55.0, 62.0), (57.6, 60.0), (60.6, 61.8), (63.4, 64.4), (68.4, 64.6), (71.0, 61.6), (73.4, 62.4), (73.0, 65.6), (70.2, 68.2), (64.0, 69.2), (58.4, 68.4), (55.6, 66.0)]
    add(tronco, cach, 'azul', 5.6, ('esf', (62.5, 64.5), 11, 7.5), grupo='cachecol')
    for a0, a1 in (((57.5, 64.6), (63.2, 69.2)), ((65.6, 67.6), (70.6, 66.0)), ((55.6, 66.8), (58.8, 69.6))):
        a0, a1 = np.array(a0), np.array(a1)
        n_ = np.array([-(a1 - a0)[1], (a1 - a0)[0]])
        n_ = n_ / np.linalg.norm(n_) * 0.5
        add(tronco, [tuple(a0 - n_), tuple(a0 + n_), tuple(a1 + n_), tuple(a1 - n_)], 'azul', 5.62, ('lisa', 1), grupo='cachecol', detalhe=True)
    add(tronco, [(55.0, 63.6), (57.4, 64.6), (57.4, 70.4), (55.8, 71.6), (54.6, 68.6)], 'azul', 5.58, ('plano', -0.3, 0.0, 0.6), grupo='cachecol')

    # cabeça desenhada à mão, pixel a pixel (rodada 3, 14/10): elmo alto e redondo de aço com aba fina
    # dourada e crista, protetores de face dos dois lados, rosto adulto de 3/4 (sobrancelha, olho,
    # nariz reto, boca e queixo marcado) e pluma em tufo de penas. Preso ao osso da cabeça.
    cabeca_desenho(cab, E, k, P, zc)

    # ---------------- ombreiras em lâminas
    om = E['ombreira']
    mtl = om != 'couro'

    def ombreira(c, rx, ry, z, grupo, cravo):
        c = np.array(c)
        for i, (dy, fx, fy) in enumerate(((5.6, 0.86, 0.6), (3.0, 0.94, 0.7), (0.0, 1.0, 1.0))):
            cc = c + np.array([(-0.4 if c[0] < 64 else 0.4) * (2 - i), dy])
            add(tronco, elipse(cc, rx * fx, ry * fy, 24, math.pi * 0.95, 2.05 * math.pi) + [tuple(cc + (rx * fx, ry * fy * 0.25)), tuple(cc + (-rx * fx, ry * fy * 0.25))],
                om, z + 0.01 * i, ('esf', tuple(cc), rx * fx, ry * fy * 1.3), metal=mtl, grupo=grupo + str(i))
            if ouro and i == 0:
                add(tronco, [tuple(cc + (-rx * fx, ry * fy * 0.1)), tuple(cc + (rx * fx, ry * fy * 0.1)), tuple(cc + (rx * fx, ry * fy * 0.25 + 0.9)), tuple(cc + (-rx * fx, ry * fy * 0.25 + 0.9))],
                    'ouro', z + 0.005, ('plano', 0, 0.2, 0.2), metal=True, grupo=grupo + str(i), detalhe=True)
        if mtl:
            add(tronco, elipse(cravo, 1.5, 1.5, 12), 'ouro', z + 0.05, ('esf', cravo, 1.5, 1.5), metal=True, grupo=grupo, detalhe=True)

    ombreira((52.4, 65.2), 4.9, 4.6, 5.5, 'omb_e', (55.4, 64.6))

    # ---------------- braço do escudo e escudo (à direita da imagem, na frente)
    P.append(membro(sup_d, OMBRO_D, COTOVELO_D, 7.4, 6.4, sk, 6.5, grupo='braco_d', textura='malha' if E['malha'] else ''))
    if E['peitoral']:
        P.append(membro(sup_d, (79.6, 71.5), (81.4, 79), 6.8, 6.0, ar, 6.52, metal=True, grupo='braco_d'))
    ombreira((76.8, 64.0), 7.0, 5.6, 7.0, 'omb_d', (71.2, 64.6))

    esc = Osso((81.0, 86.0), 0.0, ante_d.tf((81.0, 86.0)) + np.array([k('escudo_x', 0), k('escudo_y', 0)]), ante_d.thp - ante_d.th + k('escudo', 0))
    s = {1: 0.84, 2: 0.9, 3: 0.94, 4: 1.0, 5: 1.0, 6: 1.02}[e]

    def S(lista):
        c = np.array([81.0, 86.0])
        return [tuple(c + (np.array(p) - c) * s) for p in lista]

    forma = [(70.4, 73.6), (80.0, 72.2), (90.2, 71.6), (91.4, 78.0), (90.6, 88.4), (88.0, 98.0), (84.6, 106.6), (78.2, 101.0), (73.2, 92.4), (70.6, 81.6)]
    campo = [(72.0, 75.0), (80.2, 73.8), (88.8, 73.2), (89.8, 78.4), (89.0, 88.2), (86.6, 97.0), (84.4, 103.4), (79.2, 99.2), (74.6, 91.6), (72.2, 81.4)]
    aro = E['escudo']
    add(esc, S(forma), aro, 7.5, ('cil', (70.4, 86), -math.pi / 2, 21, 30, 30), metal=aro != 'madeira', grupo='escudo')
    add(esc, S(campo), E['campo'], 7.6, ('cil', (72.0, 86), -math.pi / 2, 18, 22, 22), grupo='escudo', detalhe=True)
    cz = E['cruz']
    vert = [(79.6, 75.6), (82.2, 75.4), (81.8, 77.6), (82.8, 96.6), (84.0, 99.6), (81.6, 99.8), (80.6, 96.8), (80.4, 77.6)]
    hori = [(73.8, 82.6), (76.4, 82.2), (78.0, 82.0), (86.0, 81.2), (88.2, 80.4), (88.4, 82.8), (86.2, 83.6), (78.2, 84.4), (76.2, 84.8), (74.0, 84.8)]
    add(esc, S(vert), cz, 7.7, ('cil', (80, 87), -math.pi / 2, 2.6, 40, 40), metal=cz != 'branco', grupo='cruz', detalhe=True)
    add(esc, S(hori), cz, 7.7, ('plano', -0.1, -0.5, 0.6), metal=cz != 'branco', grupo='cruz', detalhe=True)
    if aro != 'madeira':
        for x, y in ((72.0, 74.4), (80.0, 72.9), (89.4, 72.6), (90.6, 80.0), (89.4, 91.0), (71.8, 82.0), (74.6, 93.2), (84.6, 105.0)):
            c = S([(x, y)])[0]
            add(esc, elipse(c, 0.8, 0.8, 8), 'ouro', 7.8, ('lisa', 4), metal=True, grupo='rebite', detalhe=True)
    else:
        for xx in (76.0, 81.0, 86.0):
            add(esc, S([(xx, 73.5), (xx + 0.8, 73.4), (xx + 0.8, 100.0), (xx, 100.0)]), 'madeira', 7.55, ('lisa', 1), grupo='escudo', detalhe=True)
    for x, y in ((76, 89), (77, 90), (86, 92), (75, 78), (87, 76)):  # marcas de uso
        c = S([(x + 0.5, y + 0.5)])[0]
        px(esc, c[0], c[1], E['campo'], 1, 7.65)

    # ---------------- escala do estágio (em volta dos pés) e posição no quadro
    tam = E['tam']
    ax, ay = 64.0, 150.0

    def mv(x, y):
        return (ax + (x - ax) * tam + OX, ay + (y - ay) * tam + OY)

    for p in P:
        p.poly = [mv(x, y) for x, y in p.poly]
        if p.luz[0] == 'carimbo':
            _, g, o, pr, pm, an = p.luz
            p.luz = ('carimbo', g, o, pr, np.array(mv(*pm)), an)
            continue
        if p.luz[0] == 'cil':
            _, o, a, L, w0, w1 = p.luz
            p.luz = ('cil', np.array(mv(*o)), a, L * tam, w0 * tam, w1 * tam)
        elif p.luz[0] == 'esf':
            _, c, rx, ry = p.luz
            p.luz = ('esf', np.array(mv(*c)), rx * tam, ry * tam)
    RT = [(*mv(x, y), c, z) for x, y, c, z in RT]
    return P, RT


def aura(rgba: np.ndarray) -> np.ndarray:
    """Lenda: brilho dourado suave em volta da silhueta."""
    a = rgba[..., 3] > 0
    halo = np.zeros(a.shape, np.float32)
    for r in (1, 2, 3):
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dy * dy + dx * dx <= r * r:
                    halo = np.maximum(halo, np.roll(np.roll(a, dy, 0), dx, 1) * (1 - r / 4))
    halo[a] = 0
    out = rgba.copy()
    m = halo > 0.2
    out[m, :3] = np.array([255, 214, 120], np.uint8)
    out[m, 3] = (halo[m] * 150).astype(np.uint8)
    return out


# ------------------------------------------------------------------ poses


def suave(a, b, f):
    f = max(0.0, min(1.0, f))
    f = f * f * (3 - 2 * f)
    return a + (b - a) * f


def poses():
    a = {}
    a['parado'] = [{'resp': r, 'pluma': p, 'capa': c} for r, p, c in ((0, 0, 0), (0.5, 0.5, 0.4), (1, 1.0, 0.8), (0.5, 0.5, 0.4))]
    a['preparo'] = [{'be_b': suave(0.35, 2.55, f), 'be_a': suave(0.18, 3.3, f), 'esp': suave(0.43, 2.2, f), 'tronco': -0.07 * f, 'agacha': 2 * f, 'pluma': f, 'cabeca': 0.04 * f}
                    for f in (0.35, 0.7, 1.0)]
    g = []
    for f in (0.0, 0.3, 0.6, 1.0, 0.85, 0.6):
        golpe = min(1.0, f / 0.6)
        g.append({'be_b': suave(2.55, -1.2, golpe), 'be_a': suave(3.3, -1.45, golpe), 'esp': suave(2.2, -1.25, golpe), 'tronco': suave(-0.07, 0.14, golpe),
                  'x': suave(0, 7, golpe), 'agacha': suave(2, 4.5, golpe), 'pluma': suave(1.0, -1.2, golpe), 'capa': suave(0, -2, golpe),
                  'pe_d': (suave(0, 9, golpe), 0), 'z_be': 7.9 if golpe > 0.5 else 4.8, 'espada_frente': 7.85 if golpe > 0.5 else None})
    a['golpe'] = g
    a['dano'] = [{'tronco': -0.16 * f, 'x': -4 * f, 'cabeca': -0.12 * f, 'be_b': 0.35 + 0.35 * f, 'be_a': 0.18 + 0.5 * f, 'escudo': -0.12 * f, 'escudo_y': -2 * f,
                  'pluma': 1.4 * f, 'capa': 1.4 * f} for f in (1.0, 0.6, 0.25)]
    d = []
    for f in (0.25, 0.5, 0.75, 0.95, 1.0):
        d.append({'agacha': 17 * f, 'x': -2 * f, 'tronco': 0.3 * f, 'cabeca': 0.28 * f, 'pe_d': (2 * f, 0), 'pe_e': (-2 * f, 0),
                  'be_b': suave(0.35, -0.15, f), 'be_a': suave(0.18, -0.3, f), 'esp': suave(0.43, -0.12, f), 'pluma': -f, 'capa': -0.6 * f, 'escudo_y': 3 * f})
    a['derrota'] = d
    a['vitoria'] = [{'be_b': suave(0.35, 3.05, f), 'be_a': suave(0.18, 3.1, f), 'esp': suave(0.43, 3.18, f), 'tronco': -0.03 * f, 'cabeca': -0.06 * f,
                     'pluma': 0.6 * f, 'capa': 0.9 * f, 'resp': -1 * f} for f in (0.4, 0.8, 1.0, 0.9)]
    return a


TEMPOS = {'parado': 260, 'preparo': 95, 'golpe': 70, 'dano': 90, 'derrota': 140, 'vitoria': 160}


def quadro(e, pose):
    P, RT = montar(e, pose)
    q = render(P, RT)
    return aura(q) if ESTAGIOS[e].get('lenda') else q


def principal() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--previa')
    ap.add_argument('--anim', default='parado')
    ap.add_argument('--escala', type=int, default=4)
    ap.add_argument('--estagios', default='1,2,3,4,5,6')
    ap.add_argument('--so', type=int, help='só este quadro da animação')
    ap.add_argument('--mascote', action='store_true')
    a = ap.parse_args()
    est = [int(x) for x in a.estagios.split(',')]
    if a.previa:
        lista = poses()[a.anim]
        if a.so is not None:
            lista = [lista[a.so]]
        img = Image.new('RGBA', (W * len(lista), H * len(est)), (70, 64, 58, 255))
        for li, e in enumerate(est):
            for ci, pz in enumerate(lista):
                img.alpha_composite(Image.fromarray(quadro(e, pz), 'RGBA'), (ci * W, li * H))
        img.resize((img.width * a.escala, img.height * a.escala), Image.NEAREST).save(a.previa)
        print('prévia:', a.previa)
        return 0
    if a.mascote:
        dest = RAIZ / 'public' / 'mascote'
        dest.mkdir(parents=True, exist_ok=True)
        for e in (4, 6):
            q = Image.fromarray(quadro(e, poses()['parado'][0]), 'RGBA')
            q = q.crop(q.getbbox())
            q.resize((q.width * 6, q.height * 6), Image.NEAREST).save(dest / f'heroi-{e}.png', optimize=True)
        print('mascote em', dest)
        return 0
    for e in est:
        quadros = {nome: [quadro(e, p) for p in v] for nome, v in poses().items()}
        _, meta = gravar_folha(f'heroi-{e}', quadros, TEMPOS, DESTINO, ANCORA)
        print('gravado heroi-%d' % e, meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
