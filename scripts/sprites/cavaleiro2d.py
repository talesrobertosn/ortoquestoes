#!/usr/bin/env python3
"""Herói do Orto Questões, refeito do zero em 14/10/2026 (pedido do Tales: "abandone o rosto
redondo, infantilizado"; direção de arte: o conceito em docs/flashcards/conceitos/heroi-adulto-proposta.png).

Cavaleiro ADULTO em pixel art com recorte 2D (peças articuladas, como um boneco de papel):
elmo aberto de aço com pluma azul, rosto de adulto, cachecol azul, peitoral e ombreiras de aço,
cota de malha, tabardo azul com borda dourada, cinto e correia de couro, capa vermelha,
escudo em gota azul com cruz dourada e espada longa. Olha para a direita (para o adversário).

Nada é copiado do conceito: tudo é desenhado aqui por polígonos, com luz de cima e da
esquerda, metal com brilho especular, paletas com variação de matiz e contorno escuro.

    python3 scripts/sprites/cavaleiro2d.py                 # grava heroi-1..6 em public/flashcards/sprites/
    python3 scripts/sprites/cavaleiro2d.py --previa x.png  # prévia ampliada (estágios lado a lado, quadro parado)
    python3 scripts/sprites/cavaleiro2d.py --mascote       # mascote grande do site em public/mascote/
"""
from __future__ import annotations

import argparse
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from motor import gravar_folha  # noqa: E402

RAIZ = AQUI.parents[1]
DESTINO = RAIZ / 'public' / 'flashcards' / 'sprites'

W, H = 120, 132          # quadro
ANCORA = (56, 126)       # pés
SS = 4                   # superamostragem das máscaras

# ------------------------------------------------------------------ paletas (escuro → claro)


def hx(c: str):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


PAL = {
    'aco': ['#1b2030', '#323a4e', '#4f5a72', '#76829a', '#a3aec2', '#cfd6e2', '#f2f5fa'],
    'ouro': ['#3a2206', '#6b420e', '#a06c1a', '#cf9b32', '#efc65e', '#fbe7a4'],
    'azul': ['#0f1838', '#19295a', '#253f86', '#3354a6', '#4a6ec4', '#6f90da'],
    'vermelho': ['#36080e', '#5c1118', '#871c20', '#b22c28', '#d44b36', '#ea7450'],
    'couro': ['#25130a', '#422413', '#61381f', '#84502b', '#a66e3c', '#c38d55'],
    'pele': ['#4e2a1a', '#7c4830', '#a76848', '#c98a62', '#e2ad84', '#f2cba4'],
    'malha': ['#1c2029', '#343b4a', '#555e70', '#7c8698', '#a7b0c0'],
    'madeira': ['#2a170a', '#4a2b14', '#6c411f', '#8f5b2c', '#ad7840'],
    'pluma': ['#0c1c4a', '#163684', '#2052be', '#3876dc', '#64a0f0', '#a6cbf8'],
    'cabelo': ['#1a0f08', '#331f11', '#4e321b', '#6a4626'],
    'perola': ['#3e352d', '#6f655a', '#a0968a', '#c9c1b4', '#e6e0d4', '#faf7f0'],
    'roxo': ['#1c0a34', '#30145a', '#4a2088', '#6532b0', '#8650d2', '#a878e8'],
    'lamina': ['#3d78c0', '#6aa8e6', '#a4d2f8', '#d8f0ff', '#ffffff'],
    'branco': ['#3c4252', '#6c7488', '#a2aabb', '#d0d6e2', '#f2f5fa'],
    'escuro': ['#0c0a10', '#1a1620'],
}
PAL = {k: [hx(c) for c in v] for k, v in PAL.items()}
CONTORNO = {k: tuple(int(c * 0.45) for c in v[0]) for k, v in PAL.items()}

LUZ = np.array([-0.55, -0.62, 0.56])
LUZ = LUZ / np.linalg.norm(LUZ)
MEIO = LUZ + np.array([0, 0, 1.0])
MEIO = MEIO / np.linalg.norm(MEIO)
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16


def R(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s], [s, c]])


@dataclass
class Osso:
    o: np.ndarray
    a: float = 0.0

    def p(self, x, y):
        return self.o + R(self.a) @ np.array([x, y], float)

    def filho(self, x, y, da=0.0):
        return Osso(self.p(x, y), self.a + da)

    def pts(self, lista):
        return [tuple(self.p(x, y)) for x, y in lista]


@dataclass
class Peca:
    poly: list            # pontos no mundo
    mat: str
    z: float
    luz: tuple            # ('cil', o, eixo, L, w0, w1) | ('esf', c, rx, ry) | ('plano', nx, ny, gradiente)
    metal: bool = False
    grupo: str = ''
    detalhe: bool = False  # não desenha contorno interno nas peças de trás
    textura: str = ''
    emissivo: bool = False


def elipse(c, rx, ry, n=28, a0=0.0, a1=2 * math.pi):
    return [(c[0] + rx * math.cos(a0 + (a1 - a0) * i / n), c[1] + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def membro(o: Osso, L, w0, w1, mat, z, metal=False, grupo='', capa0=True, capa1=True):
    """Segmento afinado com pontas arredondadas, ao longo de +y do osso."""
    pts = []
    n = 6
    if capa0:
        for i in range(n + 1):
            t = math.pi + math.pi * i / n
            pts.append((w0 / 2 * math.cos(t), w0 / 2 * math.sin(t) * 0.8))
    else:
        pts += [(-w0 / 2, 0), (w0 / 2, 0)]
    if capa1:
        for i in range(n + 1):
            t = math.pi * i / n
            pts.append((w1 / 2 * math.cos(t), L + w1 / 2 * math.sin(t) * 0.8))
    else:
        pts += [(w1 / 2, L), (-w1 / 2, L)]
    return Peca(o.pts(pts), mat, z, ('cil', o.o.copy(), o.a, L, w0, w1), metal, grupo)


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
        ax = np.array([-math.sin(ang), math.cos(ang)])  # +y local no mundo
        d = np.array([math.cos(ang), math.sin(ang)])    # +x local no mundo
        rx, ry = XX - o[0], YY - o[1]
        t = np.clip((rx * ax[0] + ry * ax[1]) / max(L, 1e-3), 0, 1)
        w = (w0 + (w1 - w0) * t) / 2
        u = np.clip((rx * d[0] + ry * d[1]) / np.maximum(w, 0.5), -0.98, 0.98)
        nz = np.sqrt(1 - u * u)
        return u * d[0], u * d[1], nz
    if k == 'esf':
        _, c, rx, ry = p.luz
        ex, ey = (XX - c[0]) / rx, (YY - c[1]) / ry
        r2 = np.clip(ex * ex + ey * ey, 0, 0.96)
        return ex, ey, np.sqrt(1 - r2)
    _, nx, ny, g = p.luz  # plano
    ys = np.array([y for _, y in p.poly])
    y0, y1 = ys.min(), ys.max()
    t = (YY - y0) / max(y1 - y0, 1)
    ny2 = ny + g * (t - 0.5)
    nz = np.sqrt(np.clip(1 - nx * nx - ny2 * ny2, 0.05, 1))
    return np.full_like(XX, nx), ny2, nz


def tons(p: Peca, m):
    nx, ny, nz = normais(p)
    dif = nx * LUZ[0] + ny * LUZ[1] + nz * LUZ[2]
    pal = PAL[p.mat]
    n = len(pal)
    if p.emissivo:
        s = 0.55 + 0.45 * np.clip(dif, 0, 1)
    elif p.metal:
        spec = np.clip(nx * MEIO[0] + ny * MEIO[1] + nz * MEIO[2], 0, 1) ** 14
        s = 0.12 + 0.62 * np.clip(dif * 0.5 + 0.5, 0, 1) ** 1.4 + 0.75 * spec
        # reflexo escuro do horizonte, típico de armadura polida
        s -= 0.16 * np.exp(-((ny + 0.05) / 0.12) ** 2) * (nz > 0.5)
    else:
        s = 0.1 + 0.85 * np.clip(dif * 0.62 + 0.38, 0, 1)
    if p.textura == 'malha':
        s += np.where(((XX.astype(int) + YY.astype(int)) % 2) == 0, 0.09, -0.09) - np.where(YY.astype(int) % 3 == 0, 0.06, 0)
    elif p.textura == 'tecido':
        s += np.where(XX.astype(int) % 3 == 0, -0.03, 0.0)
    dith = 0.0 if p.metal else (BAYER[YY.astype(int) % 4, XX.astype(int) % 4] - 0.5) * 0.10
    idx = np.clip(np.floor(np.clip(s + dith, 0, 0.999) * n), 0, n - 1).astype(int)
    cor = np.array(pal)[idx]
    return cor


def render(pecas: list[Peca]):
    cor = np.zeros((H, W, 3), np.uint8)
    alfa = np.zeros((H, W), bool)
    zb = np.full((H, W), -1e9, np.float32)
    mat = np.full((H, W), '', object)
    grp = np.full((H, W), '', object)
    det = np.zeros((H, W), bool)
    for p in sorted(pecas, key=lambda q: q.z):
        m = mascara(p.poly)
        if not m.any():
            continue
        c = tons(p, m)
        cor[m] = c[m]
        alfa |= m
        zb[m] = p.z
        mat[m] = p.mat
        grp[m] = p.grupo or id(p)
        det[m] = p.detalhe
    saida = cor.copy()
    # contorno interno escuro na borda da silhueta
    viz = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    borda = np.zeros_like(alfa)
    for dy, dx in viz:
        borda |= alfa & ~np.roll(np.roll(alfa, dy, 0), dx, 1)
    # contorno entre peças: escurece a peça de trás junto da peça da frente
    sel = np.zeros_like(alfa)
    for dy, dx in viz:
        zn = np.roll(np.roll(zb, dy, 0), dx, 1)
        gn = np.roll(np.roll(grp, dy, 0), dx, 1)
        dn = np.roll(np.roll(det, dy, 0), dx, 1)
        sel |= alfa & (zn > zb + 0.25) & (gn != grp) & ~dn
    for y, x in zip(*np.where(sel & ~borda)):
        pal = PAL[mat[y, x]]
        saida[y, x] = pal[max(0, min(1, len(pal) - 1))]
    for y, x in zip(*np.where(borda)):
        saida[y, x] = CONTORNO[mat[y, x]]
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., :3] = saida
    rgba[..., 3] = np.where(alfa, 255, 0)
    return rgba


# ------------------------------------------------------------------ o cavaleiro

ESTAGIOS = {
    # tam: escala do corpo (a lenda é um pouco maior); peitoral/ombreiras/grevas aparecem por estágio
    1: dict(tam=0.93, peitoral=False, ombreira='couro', malha=False, grevas=False, capa=None, espada=31, escudo='madeira', cruz='branco', ouro=False, pluma=1),
    2: dict(tam=0.95, peitoral=False, ombreira='couro', malha=True, grevas=False, capa=None, espada=34, escudo='aco', cruz='branco', ouro=False, pluma=1),
    3: dict(tam=0.97, peitoral=True, ombreira='aco', malha=True, grevas=False, capa='vermelho', espada=37, escudo='aco', cruz='ouro', ouro=False, pluma=1),
    4: dict(tam=1.00, peitoral=True, ombreira='aco', malha=True, grevas=True, capa='vermelho', espada=40, escudo='aco', cruz='ouro', ouro=False, pluma=1),
    5: dict(tam=1.02, peitoral=True, ombreira='aco', malha=True, grevas=True, capa='vermelho', espada=43, escudo='ouro', cruz='ouro', ouro=True, pluma=2),
    6: dict(tam=1.04, peitoral=True, ombreira='perola', malha=True, grevas=True, capa='roxo', espada=45, escudo='ouro', cruz='ouro', ouro=True, pluma=2, lenda=True),
}


def montar(e: int, t: dict) -> list[Peca]:
    E = ESTAGIOS[e]
    k = t.get
    P: list[Peca] = []
    armadura = 'perola' if E.get('lenda') else 'aco'
    # quadril
    cx, cy = 56 + k('x', 0), 82 + k('agacha', 0) + k('resp', 0)
    torso = Osso(np.array([cx, cy], float), k('tronco', 0))

    # ---------------- capa (atrás de tudo)
    if E['capa']:
        sw = k('capa', 0)
        cap = torso.pts([(-10, -38), (8, -38), (13, -20), (15, 4), (18 + sw * 4, 30), (8 + sw * 3, 34), (-4 + sw * 2, 31), (-15 + sw * 3, 33), (-14, 8), (-13, -18)])
        P.append(Peca(cap, E['capa'], 0.5, ('plano', 0.25, -0.2, 0.7), grupo='capa', textura='tecido'))

    # ---------------- braço da espada (o de trás, à esquerda da imagem)
    omb_f = torso.filho(-12, -34, k('braco_f', 0.28) - torso.a)
    P.append(membro(omb_f, 13, 7.0, 6.0, 'malha' if E['malha'] else 'azul', 1.0, grupo='braco_f'))
    if E['peitoral']:
        P.append(membro(omb_f.filho(0, 4), 7, 7.4, 6.6, armadura, 1.1, metal=True, grupo='braco_f'))
    cot_f = omb_f.filho(0, 13, k('cotovelo_f', 0.18))
    P.append(membro(cot_f, 11, 6.0, 5.4, armadura if E['grevas'] else 'couro', 1.2, metal=E['grevas'], grupo='braco_f'))
    mao_f = cot_f.filho(0, 11.5, 0)
    P.append(Peca(elipse(mao_f.o, 3.2, 3.0), 'couro', 1.6, ('esf', mao_f.o.copy(), 3.2, 3.0), grupo='mao_f'))
    # espada: ângulo absoluto (0 = lâmina para baixo)
    esp = Osso(mao_f.o.copy(), k('espada', 0.62))
    Lb = E['espada']
    lam = 'lamina' if E.get('lenda') else 'aco'
    P.append(Peca(esp.pts([(-1.8, 5), (1.8, 5), (1.6, 5 + Lb - 5), (0, 5 + Lb), (-1.6, 5 + Lb - 5)]), lam, 0.8, ('plano', -0.35, -0.1, 0.4), metal=not E.get('lenda'), grupo='espada', emissivo=bool(E.get('lenda'))))
    P.append(Peca(esp.pts([(-0.35, 6), (0.35, 6), (0.35, 4 + Lb - 6), (-0.35, 4 + Lb - 6)]), lam, 0.85, ('plano', -0.55, -0.4, 0.0), metal=not E.get('lenda'), grupo='espada', detalhe=True, emissivo=bool(E.get('lenda'))))
    guarda = 'ouro' if e >= 3 else 'couro'
    P.append(Peca(esp.pts([(-6, 2.6), (6, 2.6), (6.5, 4.4), (-6.5, 4.4)]), guarda, 1.7, ('cil', esp.p(-6, 3.5), esp.a - math.pi / 2, 12, 2.2, 2.2), metal=True, grupo='guarda'))
    P.append(Peca(esp.pts([(-1.2, -4), (1.2, -4), (1.2, 2.6), (-1.2, 2.6)]), 'couro', 1.55, ('cil', esp.p(0, -4), esp.a, 6.6, 2.4, 2.4), grupo='punho'))
    P.append(Peca(elipse(esp.p(0, -5.2), 1.9, 1.9, 12), guarda, 1.56, ('esf', esp.p(0, -5.2), 1.9, 1.9), metal=True, grupo='punho'))

    # ---------------- pernas
    def perna(lado, ang_coxa, ang_canela, z):
        x0 = -5 if lado < 0 else 5
        coxa = torso.filho(x0, -2, ang_coxa - torso.a)
        nome = 'perna_f' if lado < 0 else 'perna_n'
        P.append(membro(coxa, 20, 9.2, 7.6, 'azul', z, grupo=nome))
        joe = coxa.filho(0, 20, ang_canela - ang_coxa)
        if E['grevas']:
            P.append(membro(joe, 18, 7.4, 6.4, armadura, z + 0.1, metal=True, grupo=nome))
        else:
            P.append(membro(joe, 18, 7.0, 6.6, 'couro', z + 0.1, grupo=nome))
        if e >= 3:  # joelheira
            P.append(Peca(elipse(joe.p(0, 0.5), 4.4, 3.8), armadura, z + 0.2, ('esf', joe.p(0, 0.5), 4.4, 3.8), metal=True, grupo=nome + 'j'))
            if E['ouro']:
                P.append(Peca(elipse(joe.p(0, 0.5), 1.4, 1.4, 10), 'ouro', z + 0.25, ('esf', joe.p(0, 0.5), 1.4, 1.4), metal=True, detalhe=True, grupo=nome + 'j'))
        tor = joe.filho(0, 18, -ang_canela)
        # pé: bota de couro com biqueira de aço (a ponta para a direita)
        pe = [(-3.4, -3.5), (3.0, -3.5), (5.0, -1.8), (9.0, -0.2), (9.6, 2.6), (-4.0, 2.6)]
        P.append(Peca(tor.pts(pe), armadura if E['grevas'] else 'couro', z + 0.15, ('plano', -0.2, -0.5, 0.6), metal=E['grevas'], grupo=nome + 'p'))
        P.append(Peca(tor.pts([(-4.0, 1.4), (9.6, 1.4), (9.6, 3.0), (-4.0, 3.0)]), 'couro', z + 0.16, ('plano', 0, 0.3, 0), grupo=nome + 'p', detalhe=True))
        if E['grevas']:  # cano da bota aparecendo acima da greva, como no conceito
            P.append(membro(joe.filho(0, 9), 5, 7.8, 7.6, 'couro', z + 0.12, grupo=nome + 'b'))
    perna(-1, k('coxa_f', 0.22), k('canela_f', 0.18), 2.0)
    perna(+1, k('coxa_n', -0.2), k('canela_n', -0.12), 3.0)

    # ---------------- saia de malha e tronco
    if E['malha']:
        saia = torso.pts([(-10, -8), (10, -8), (13, 10), (8, 13), (0, 11), (-8, 13), (-13, 10)])
        P.append(Peca(saia, 'malha', 3.6, ('plano', 0.0, 0.1, 0.5), grupo='saia', textura='malha'))
    corpo = torso.pts([(-12, -37), (11, -37), (13, -28), (12, -16), (10, -6), (-9, -6), (-12, -16), (-13, -28)])
    P.append(Peca(corpo, 'malha' if E['malha'] else 'azul', 4.0, ('esf', torso.p(-1, -22), 14, 18), grupo='corpo', textura='malha' if E['malha'] else 'tecido'))
    # tabardo azul com borda dourada (frente), da cintura até o meio da coxa
    tab_ext = torso.pts([(-8.5, -20), (9.5, -20), (10.5, -6), (11.0, 20), (6.5, 22), (1.5, 20), (-1.5, 22), (-6.5, 20), (-8.5, -6)])
    tab_int = torso.pts([(-7.2, -19), (8.2, -19), (9.2, -6), (9.6, 18.6), (6.4, 20.4), (1.5, 18.6), (-1.5, 20.4), (-5.4, 18.6), (-7.2, -6)])
    P.append(Peca(tab_ext, 'ouro', 4.5, ('plano', 0.05, 0.0, 0.5), metal=True, grupo='tabardo'))
    P.append(Peca(tab_int, 'azul', 4.6, ('plano', 0.05, 0.0, 0.55), grupo='tabardo', detalhe=True, textura='tecido'))
    # peitoral de aço
    if E['peitoral']:
        pei = torso.pts([(-10.5, -36), (10.5, -36), (12, -27), (10.5, -18), (5, -14), (-5, -14), (-10.5, -18), (-12, -27)])
        P.append(Peca(pei, armadura, 5.0, ('esf', torso.p(1.5, -27), 13, 12), metal=True, grupo='peitoral'))
        if E['ouro']:
            P.append(Peca(torso.pts([(-1, -35), (1, -35), (0.8, -16), (-0.8, -16)]), 'ouro', 5.1, ('plano', 0, -0.2, 0.3), metal=True, grupo='peitoral', detalhe=True))
    # cinto e correia diagonal
    P.append(Peca(torso.pts([(-10.5, -9), (11, -9), (11.4, -5), (-10.8, -5)]), 'couro', 5.4, ('cil', torso.p(-11, -7), torso.a - math.pi / 2, 22, 4, 4), grupo='cinto'))
    P.append(Peca(torso.pts([(1, -9.6), (5, -9.6), (5, -4.4), (1, -4.4)]), 'ouro', 5.5, ('plano', -0.3, -0.3, 0.2), metal=True, grupo='fivela'))
    P.append(Peca(torso.pts([(1.9, -8.4), (4.1, -8.4), (4.1, -5.6), (1.9, -5.6)]), 'couro', 5.55, ('plano', 0, 0, 0), grupo='fivela', detalhe=True))
    P.append(Peca(torso.pts([(7.5, -37), (11, -35), (-6.5, -8.5), (-10, -10)]), 'couro', 5.3, ('plano', 0.1, -0.1, 0.3), grupo='correia'))
    P.append(Peca(torso.pts([(1.2, -24), (4.4, -22.2), (3.0, -19.6), (-0.2, -21.4)]), 'ouro', 5.35, ('plano', -0.2, -0.2, 0.2), metal=True, grupo='correia', detalhe=True))
    # cachecol azul em volta do pescoço, caindo no peito
    cach = torso.pts([(-9, -40), (8, -41), (10, -36), (6, -31), (0, -29), (-6, -31), (-10, -35)])
    P.append(Peca(cach, 'azul', 5.6, ('esf', torso.p(0, -36), 11, 6), grupo='cachecol', textura='tecido'))

    # ---------------- cabeça
    pesc = torso.filho(0.5, -39, k('cabeca', 0))
    cab = Osso(pesc.o.copy(), pesc.a)
    P.append(Peca(cab.pts([(-2.5, 1), (3.5, 1), (3, -4), (-2, -4)]), 'pele', 5.5, ('cil', cab.p(-2.5, -1), cab.a - math.pi / 2, 6, 5, 5), grupo='pescoco'))
    rosto = [(-3.2, -3.2), (2.0, -2.0), (5.2, -4.0), (6.6, -7.2), (7.2, -10.0), (6.6, -11.4), (7.0, -13.5), (-4.0, -14.0), (-4.6, -8.0)]
    P.append(Peca(cab.pts(rosto), 'pele', 6.0, ('esf', cab.p(1.0, -8.5), 7.5, 7.5), grupo='rosto'))
    # cabelo castanho na nuca
    P.append(Peca(cab.pts([(-6.4, -14), (-2.4, -14), (-2.8, -6), (-5.6, -4.6), (-6.8, -9)]), 'cabelo', 6.05, ('esf', cab.p(-4.5, -10), 4, 6), grupo='cabelo'))
    # olho, sobrancelha, nariz, boca (traços de adulto: olho estreito, sobrancelha reta)
    P.append(Peca(cab.pts([(2.8, -9.4), (5.0, -9.4), (5.0, -8.3), (2.8, -8.3)]), 'escuro', 6.3, ('plano', 0, 0, 0), grupo='olho', detalhe=True))
    P.append(Peca(cab.pts([(2.2, -11.4), (5.6, -11.0), (5.6, -10.1), (2.2, -10.3)]), 'cabelo', 6.3, ('plano', 0, -0.3, 0), grupo='sobrancelha', detalhe=True))
    P.append(Peca(cab.pts([(6.6, -9.2), (8.0, -6.2), (6.4, -5.8)]), 'pele', 6.25, ('plano', -0.6, -0.2, 0.0), grupo='nariz', detalhe=True))
    P.append(Peca(cab.pts([(3.2, -4.6), (5.6, -4.8), (5.6, -4.0), (3.2, -3.9)]), 'pele', 6.3, ('plano', 0.4, 0.8, 0), grupo='boca', detalhe=True))
    # elmo aberto (chapel de aço): domo, aba, protetor da face, faixa e ornamento dourados
    ar = armadura
    domo = elipse(cab.p(0.6, -15.0), 8.4, 7.4, 30, math.pi, 2 * math.pi)
    P.append(Peca(domo + [cab.p(9.2, -13.6), cab.p(-7.8, -13.6)], ar, 6.6, ('esf', cab.p(-0.5, -16.0), 9.0, 8.5), metal=True, grupo='elmo'))
    P.append(Peca(cab.pts([(-9.6, -14.6), (9.8, -14.6), (10.8, -12.2), (-9.8, -12.2)]), ar, 6.7, ('cil', cab.p(-9.6, -13.4), cab.a - math.pi / 2, 20, 2.4, 2.4), metal=True, grupo='aba'))
    P.append(Peca(cab.pts([(-7.4, -13), (-2.2, -13), (-1.6, -6.8), (-3.4, -3.6), (-7.0, -4.6)]), ar, 6.65, ('esf', cab.p(-4.4, -9), 4.5, 6.5), metal=True, grupo='guarda_face'))
    P.append(Peca(cab.pts([(-4.6, -9.6), (-3.2, -9.6), (-3.2, -8.2), (-4.6, -8.2)]), 'ouro', 6.68, ('esf', cab.p(-3.9, -8.9), 1, 1), metal=True, grupo='guarda_face', detalhe=True))
    P.append(Peca(cab.pts([(-8.6, -16.4), (9.2, -16.4), (9.6, -14.6), (-9.4, -14.6)]), 'ouro', 6.75, ('cil', cab.p(-8.6, -15.5), cab.a - math.pi / 2, 18, 1.8, 1.8), metal=True, grupo='faixa', detalhe=True))
    P.append(Peca(cab.pts([(3.0, -16.6), (6.0, -21.4), (6.8, -16.6)]), 'ouro', 6.78, ('plano', -0.3, -0.4, 0.2), metal=True, grupo='faixa', detalhe=True))
    P.append(Peca(cab.pts([(-0.6, -22.2), (1.4, -22.4), (1.0, -16.6), (-0.8, -16.6)]), 'ouro', 6.77, ('cil', cab.p(-0.6, -22.2), cab.a, 5.6, 2.0, 2.0), metal=True, grupo='faixa', detalhe=True))
    # pluma azul: do topo do elmo para trás, ondulando
    sw = k('pluma', 0)
    base = cab.p(-0.5, -22.5)
    pts_sup, pts_inf = [], []
    for i in range(8):
        f = i / 7
        cxp = base[0] - 2 - 15 * f - sw * f * 2
        cyp = base[1] - 4 * math.sin(f * math.pi * 0.9) + 7 * f * f + sw * f
        r = (3.6 - 2.4 * f) * (1.15 if E['pluma'] == 2 else 1.0)
        pts_sup.append((cxp, cyp - r))
        pts_inf.append((cxp + 0.6, cyp + r * 0.8))
    pl = [tuple(base + np.array([1.2, 0.5]))] + pts_sup + list(reversed(pts_inf))
    P.append(Peca(pl, 'pluma', 6.4, ('plano', -0.1, -0.5, 0.9), grupo='pluma', textura='tecido'))
    if E['pluma'] == 2:
        pl2 = [(x + 1.5, y + 3.2) for x, y in pl]
        P.append(Peca(pl2, 'branco', 6.35, ('plano', -0.1, -0.4, 0.8), grupo='pluma2'))

    # ---------------- ombreiras
    def ombreira(c, rx, ry, z, grupo):
        mat = E['ombreira']
        metal = mat != 'couro'
        P.append(Peca(elipse(c, rx, ry, 24, math.pi * 0.92, 2.08 * math.pi), mat, z, ('esf', c, rx, ry * 1.2), metal=metal, grupo=grupo))
        if metal:  # lâmina de baixo da ombreira em camadas
            P.append(Peca(elipse(c + np.array([0, 3.2]), rx * 0.92, ry * 0.75, 20, math.pi * 0.95, 2.05 * math.pi), mat, z - 0.05, ('esf', c + np.array([0, 3.2]), rx, ry), metal=True, grupo=grupo + 'b'))
            P.append(Peca(elipse(c + np.array([0.5, -1.5]), 1.3, 1.3, 10), 'ouro', z + 0.05, ('esf', c + np.array([0.5, -1.5]), 1.3, 1.3), metal=True, grupo=grupo, detalhe=True))
    ombreira(torso.p(-12.5, -33.5), 6.4, 5.4, 5.7, 'omb_f')

    # ---------------- braço do escudo (o da frente)
    omb_n = torso.filho(11, -34, k('braco_n', 0.08) - torso.a)
    P.append(membro(omb_n, 12.5, 7.2, 6.2, 'malha' if E['malha'] else 'azul', 7.0, grupo='braco_n'))
    if E['peitoral']:
        P.append(membro(omb_n.filho(0, 4), 7, 7.6, 6.8, armadura, 7.05, metal=True, grupo='braco_n'))
    cot_n = omb_n.filho(0, 12.5, k('cotovelo_n', -1.25))
    P.append(membro(cot_n, 10.5, 6.4, 5.6, armadura if E['grevas'] else 'couro', 7.1, metal=E['grevas'], grupo='braco_n'))
    if e >= 3:
        P.append(Peca(elipse(cot_n.o, 3.6, 3.4), armadura, 7.15, ('esf', cot_n.o.copy(), 3.6, 3.4), metal=True, grupo='cotoveleira'))
    ombreira(torso.p(12.0, -33.0), 7.2, 5.8, 7.2, 'omb_n')
    # escudo em gota, na frente do antebraço
    esc_o = cot_n.p(0, 7.5) + np.array([5.5, 6.0]) + np.array([k('escudo_x', 0), k('escudo_y', 0)])
    esc = Osso(esc_o, k('escudo', -0.08))
    s = {1: 0.82, 2: 0.88, 3: 0.92, 4: 0.96, 5: 1.0, 6: 1.0}[e]
    forma = [(-11, -15), (-5, -17.4), (5, -17.4), (11, -15), (10.6, -1), (6.6, 10), (0, 20), (-6.6, 10), (-10.6, -1)]
    forma = [(x * s, y * s) for x, y in forma]
    aro = E['escudo']
    P.append(Peca(esc.pts(forma), aro, 8.0, ('plano', -0.25, -0.15, 0.5), metal=aro != 'madeira', grupo='escudo'))
    campo = [(x * 0.84, y * 0.86 - 0.4) for x, y in forma]
    P.append(Peca(esc.pts(campo), 'azul', 8.1, ('esf', esc.p(-2, -6), 14, 22), grupo='escudo', detalhe=True))
    cz = E['cruz']
    P.append(Peca(esc.pts([(-1.6 * s, -12.5 * s), (1.6 * s, -12.5 * s), (1.6 * s, 12.5 * s), (-1.6 * s, 12.5 * s)]), cz, 8.2, ('cil', esc.p(-1.6 * s, 0), esc.a - math.pi / 2, 3.2 * s, 30, 30), metal=cz != 'branco', grupo='cruz', detalhe=True))
    P.append(Peca(esc.pts([(-7 * s, -6.2 * s), (7 * s, -6.2 * s), (7 * s, -3.0 * s), (-7 * s, -3.0 * s)]), cz, 8.2, ('cil', esc.p(-7 * s, -4.6 * s), esc.a - math.pi / 2, 14 * s, 3.2, 3.2), metal=cz != 'branco', grupo='cruz', detalhe=True))
    if aro != 'madeira':  # rebites
        for x, y in [(-9.4, -13.6), (9.4, -13.6), (-9.4, -2), (9.2, -2), (0, 17)]:
            c = esc.p(x * s, y * s)
            P.append(Peca(elipse(c, 0.9, 0.9, 8), 'ouro', 8.25, ('esf', c, 0.9, 0.9), metal=True, grupo='rebite', detalhe=True))
    # mão por cima da borda do escudo (empunhadura)
    mao_n = cot_n.p(0, 10.5)
    P.append(Peca(elipse(mao_n, 3.0, 2.8), 'couro', 8.3, ('esf', mao_n, 3.0, 2.8), grupo='mao_n'))

    # escala do estágio, em volta dos pés
    tam = E['tam']
    if tam != 1.0:
        ax, ay = ANCORA
        for p in P:
            p.poly = [(ax + (x - ax) * tam, ay + (y - ay) * tam) for x, y in p.poly]
            if p.luz[0] == 'cil':
                _, o, a, L, w0, w1 = p.luz
                p.luz = ('cil', np.array([ax + (o[0] - ax) * tam, ay + (o[1] - ay) * tam]), a, L * tam, w0 * tam, w1 * tam)
            elif p.luz[0] == 'esf':
                _, c, rx, ry = p.luz
                p.luz = ('esf', np.array([ax + (c[0] - ax) * tam, ay + (c[1] - ay) * tam]), rx * tam, ry * tam)
    return P


def aura(rgba: np.ndarray) -> np.ndarray:
    """Lenda: brilho dourado suave em volta da silhueta (sem auréola)."""
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


# ------------------------------------------------------------------ poses (menos movimento, bem desenhado)


def suave(a, b, f):
    f = max(0.0, min(1.0, f))
    f = f * f * (3 - 2 * f)
    return a + (b - a) * f


def poses():
    a = {}
    a['parado'] = [{'resp': r, 'pluma': p, 'capa': c} for r, p, c in ((0, 0, 0), (0, 0.5, 0.3), (1, 1.0, 0.5), (0, 0.5, 0.2))]
    # preparo: ergue a espada por cima do ombro
    a['preparo'] = [{'braco_f': suave(0.28, 2.5, f), 'cotovelo_f': suave(0.18, -0.4, f), 'espada': suave(0.62, 3.6, f), 'tronco': -0.06 * f, 'agacha': 1.5 * f, 'pluma': f} for f in (0.35, 0.7, 1.0)]
    g = []
    for f in (0.0, 0.35, 0.7, 1.0, 0.75, 0.4):
        g.append({'braco_f': suave(2.5, -1.25, f), 'cotovelo_f': suave(-0.4, -0.15, f), 'espada': suave(3.6, -1.15, f), 'tronco': suave(-0.06, 0.12, f),
                  'x': 4 * f, 'agacha': suave(1.5, 2.5, f), 'pluma': suave(1.0, -1.0, f), 'capa': -0.6 * f, 'coxa_n': suave(-0.2, -0.38, f), 'canela_n': suave(-0.12, 0.05, f)})
    a['golpe'] = g
    a['dano'] = [{'tronco': -0.14 * f, 'x': -3 * f, 'cabeca': -0.15 * f, 'braco_n': 0.08 - 0.3 * f, 'escudo_y': -3 * f, 'pluma': 1.2 * f, 'capa': 0.8 * f} for f in (1.0, 0.6, 0.25)]
    d = []
    for f in (0.25, 0.5, 0.75, 0.95, 1.0):
        d.append({'agacha': 13 * f, 'tronco': 0.32 * f, 'cabeca': 0.25 * f, 'coxa_n': suave(-0.2, -1.35, f), 'canela_n': suave(-0.12, 0.35, f),
                  'coxa_f': suave(0.22, 0.65, f), 'canela_f': suave(0.18, 1.5, f), 'braco_f': suave(0.28, -0.25, f), 'espada': suave(0.62, -0.05, f), 'pluma': -f, 'capa': -0.3 * f, 'braco_n': 0.3 * f})
    a['derrota'] = d
    a['vitoria'] = [{'braco_f': suave(0.28, 2.95, f), 'cotovelo_f': suave(0.18, 0.05, f), 'espada': suave(0.62, 3.14, f), 'tronco': -0.04 * f, 'pluma': 0.6 * f, 'capa': 0.5 * f, 'resp': -1 * f} for f in (0.4, 0.8, 1.0, 0.9)]
    return a


TEMPOS = {'parado': 260, 'preparo': 95, 'golpe': 70, 'dano': 90, 'derrota': 140, 'vitoria': 160}


def quadro(e, pose):
    q = render(montar(e, pose))
    return aura(q) if ESTAGIOS[e].get('lenda') else q


def principal() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--previa')
    ap.add_argument('--anim', default='parado')
    ap.add_argument('--escala', type=int, default=4)
    ap.add_argument('--estagios', default='1,2,3,4,5,6')
    ap.add_argument('--mascote', action='store_true')
    a = ap.parse_args()
    est = [int(x) for x in a.estagios.split(',')]
    if a.previa:
        anims = poses()
        lista = anims[a.anim]
        img = Image.new('RGBA', (W * len(lista), H * len(est)), (58, 52, 46, 255))
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
            caixa = q.getbbox()
            q = q.crop(caixa)
            q.resize((q.width * 6, q.height * 6), Image.NEAREST).save(dest / f'heroi-{e}.png', optimize=True)
        print('mascote em', dest)
        return 0
    for e in est:
        quadros = {k: [quadro(e, p) for p in v] for k, v in poses().items()}
        _, meta = gravar_folha(f'heroi-{e}', quadros, TEMPOS, DESTINO, ANCORA)
        print('gravado heroi-%d' % e, meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
