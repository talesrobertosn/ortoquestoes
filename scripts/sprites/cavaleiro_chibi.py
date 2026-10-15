#!/usr/bin/env python3
"""Herói do Orto Questões em pixel art chibi, versão rica (14/10/2026).

Pedido do Tales: chibi como a 3ª referência (elmo grande, redondo e fechado com viseira, pluma e
capa vermelhas, aço com contorno), e depois "mais rica em detalhes, mais bonita, mais efeitos,
incrível, carismática, que possa ser usada como personagem no futuro".

Como desenha (tudo aqui, em resolução nativa: 1 pixel = 1 pixel do jogo):
  - cada peça é uma máscara com normais (esfera, cápsula ou plano, com dobras no tecido);
  - a luz vem de cima e da esquerda; o tom sai de uma rampa de cores com desvio de matiz
    (sombra fria, brilho quente), com pontilhado 2×2 só nas passagens de tom do tecido;
  - metal tem brilho especular e faixa escura de reflexo do horizonte;
  - depois de empilhar as peças: contorno seletivo (a cor da borda vem do material), linha de
    separação onde uma peça cobre outra e luz de recorte fria do lado de trás;
  - efeitos por cima, sem contorno: olhos acesos na viseira, brilho da lâmina, rastro do golpe,
    faíscas, cintilações da vitória e partículas da lenda.
Olha para a direita (para o adversário).

    python3 scripts/sprites/cavaleiro_chibi.py                  # grava heroi-1..6 em public/flashcards/sprites/
    python3 scripts/sprites/cavaleiro_chibi.py --previa x.png   # prévia ampliada
    python3 scripts/sprites/cavaleiro_chibi.py --mascote        # mascote grande em public/mascote/
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from motor import gravar_folha  # noqa: E402

RAIZ = AQUI.parents[1]
DESTINO = RAIZ / 'public' / 'flashcards' / 'sprites'

W, H = 136, 108
X0 = 60                 # eixo do corpo
PE = 101                # linha dos pés
ANCORA = (X0, PE)


def hx(c):
    c = c.lstrip('#')
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))


RAMPAS = {
    'aco': ['#161b26', '#272f3e', '#3d4759', '#5a6679', '#7f8ca1', '#a9b6c9', '#d3dde9', '#f4f8fc'],
    'aco_t': ['#12161f', '#1f2531', '#313949', '#47515f', '#626e80', '#828fa2', '#a3afc0'],
    'perola': ['#3f362f', '#62584e', '#8b8173', '#b4ab9b', '#d6cfc0', '#ece7dc', '#faf7f0', '#ffffff'],
    'ouro': ['#3a210d', '#663b12', '#9c6119', '#cf9128', '#eebd47', '#fbe07c', '#fff6c4'],
    'vermelho': ['#26060e', '#4a0c18', '#7a1621', '#ab232a', '#d23b36', '#ef6447', '#ff9a6a'],
    'forro': ['#1b0811', '#300d1a', '#4a1424', '#651c2d'],
    'azul': ['#0b1230', '#152457', '#203a87', '#2d53b4', '#4673d4', '#73a0ec', '#a8c9fa'],
    'couro': ['#1f110a', '#3a2112', '#5a341b', '#7d4c27', '#a06836', '#c38a4f', '#dfae74'],
    'madeira': ['#2a170b', '#4a2b14', '#6e421e', '#93592a', '#b5753a', '#d29654'],
    'malha': ['#151a23', '#2a313f', '#465062', '#68748a', '#909db2'],
    'visor': ['#05070b', '#0c1017', '#151b25', '#202837'],
    'olho': ['#073142', '#0e6f8f', '#29b9e0', '#8beeff', '#e9fdff'],
    'olho_dano': ['#3a0a06', '#8c2210', '#e2541f', '#ffae5c', '#fff1cf'],
    'lamina': ['#2c4a70', '#4f78a8', '#86b2e0', '#c2e2fb', '#eef9ff', '#ffffff'],
    'gema': ['#0b1a4a', '#1d3f9c', '#3f7bea', '#9cc9ff', '#ffffff'],
}
RAMPAS = {k: np.array([hx(c) for c in v], np.uint8) for k, v in RAMPAS.items()}
NOMES = list(RAMPAS)
TOPO = np.array([len(RAMPAS[n]) - 1 for n in NOMES])
CONTORNO = {k: (np.array(v[0], float) * 0.55).astype(np.uint8) for k, v in RAMPAS.items()}

L = np.array([-0.52, -0.66, 0.54]); L /= np.linalg.norm(L)
HV = L + np.array([0, 0, 1.0]); HV /= np.linalg.norm(HV)
BAYER = (np.array([[0, 2], [3, 1]]) / 4.0 - 0.375)

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
DITHER = BAYER[(YY.astype(int)) % 2, (XX.astype(int)) % 2]


def P(dx, y):
    return np.array([X0 + dx, y], float)


def cheio(v):
    return np.full((H, W), v, np.int16)


# ------------------------------------------------------------------ formas
def m_poli(pts):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
    return np.asarray(im) > 0


def m_elipse(c, rx, ry):
    return ((XX - c[0]) / rx) ** 2 + ((YY - c[1]) / ry) ** 2 <= 1.0


def proj_seg(p0, p1):
    p0, p1 = np.array(p0, float), np.array(p1, float)
    d = p1 - p0
    L2 = max(float(d @ d), 1e-6)
    t = np.clip(((XX - p0[0]) * d[0] + (YY - p0[1]) * d[1]) / L2, 0, 1)
    px, py = p0[0] + t * d[0], p0[1] + t * d[1]
    return t, XX - px, YY - py


def m_capsula(p0, p1, r0, r1=None):
    r1 = r0 if r1 is None else r1
    t, ex, ey = proj_seg(p0, p1)
    r = r0 + (r1 - r0) * t
    return ex * ex + ey * ey <= r * r


def m_curva(pts, larg0, larg1):
    """Faixa ao longo de uma polilinha, afinando de larg0 a larg1."""
    m = np.zeros((H, W), bool)
    n = len(pts) - 1
    for i in range(n):
        a = larg0 + (larg1 - larg0) * i / n
        b = larg0 + (larg1 - larg0) * (i + 1) / n
        m |= m_capsula(pts[i], pts[i + 1], a / 2, b / 2)
    return m


def bezier(p0, p1, p2, n=10):
    p0, p1, p2 = (np.array(p, float) for p in (p0, p1, p2))
    return [(1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2 for t in np.linspace(0, 1, n)]


def ponto(x, y):
    m = np.zeros((H, W), bool)
    xi, yi = int(x), int(y)
    if 0 <= xi < W and 0 <= yi < H:
        m[yi, xi] = True
    return m


# ------------------------------------------------------------------ normais
def n_esfera(c, rx, ry, chato=1.0):
    nx, ny = (XX - c[0]) / rx * chato, (YY - c[1]) / ry * chato
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0.02, 1))
    k = np.sqrt(nx * nx + ny * ny + nz * nz)
    return nx / k, ny / k, nz / k


def n_capsula(p0, p1, r0, r1=None):
    r1 = r0 if r1 is None else r1
    t, ex, ey = proj_seg(p0, p1)
    r = np.maximum(r0 + (r1 - r0) * t, 0.5)
    nx, ny = np.clip(ex / r, -0.98, 0.98), np.clip(ey / r, -0.98, 0.98)
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0.03, 1))
    return nx, ny, nz


def n_plano(nx, ny):
    nz = math.sqrt(max(0.05, 1 - nx * nx - ny * ny))
    return np.full((H, W), nx, np.float32), np.full((H, W), ny, np.float32), np.full((H, W), nz, np.float32)


# ------------------------------------------------------------------ tons
def tons(N, rampa, metal=False, pano=False, base=0.0, brilho=1.0):
    nx, ny, nz = N
    n = len(RAMPAS[rampa])
    dif = nx * L[0] + ny * L[1] + nz * L[2]
    if metal:
        spec = np.clip(nx * HV[0] + ny * HV[1] + nz * HV[2], 0, 1) ** 26
        v = 0.12 + 0.62 * np.clip(dif * 0.5 + 0.5, 0, 1) ** 1.45 + 0.55 * spec * brilho
        v -= 0.11 * np.exp(-((ny - 0.18) / 0.11) ** 2) * (nz > 0.35)
    else:
        v = 0.08 + 0.84 * np.clip(dif * 0.55 + 0.45, 0, 1)
    v = v + base
    f = v * (n - 0.001) + (DITHER * 0.45 if pano else 0)
    return np.clip(np.floor(f), 0, n - 1).astype(np.int16)


def desloca(m, dy, dx, vazio=None):
    out = np.zeros_like(m) if vazio is None else np.full_like(m, vazio)
    h, w = m.shape[:2]
    ys = slice(max(dy, 0), h + min(dy, 0)); ys0 = slice(max(-dy, 0), h + min(-dy, 0))
    xs = slice(max(dx, 0), w + min(dx, 0)); xs0 = slice(max(-dx, 0), w + min(-dx, 0))
    out[ys, xs] = m[ys0, xs0]
    return out


class Quadro:
    def __init__(self):
        self.idx = np.full((H, W), -1, np.int16)
        self.ramp = np.zeros((H, W), np.int16)
        self.z = np.full((H, W), -1e9, np.float32)
        self.grp = np.zeros((H, W), np.int32)
        self.semc = np.zeros((H, W), bool)      # enfeites: não provocam separação nas peças de trás
        self._g = 0

    def novo_grupo(self):
        self._g += 1
        return self._g

    def peca(self, m, rampa, t, z, grupo=None, enfeite=False):
        if not m.any():
            return
        if grupo is None:
            grupo = self.novo_grupo()
        sel = m & (z >= self.z)
        self.idx[sel] = (t[sel] if isinstance(t, np.ndarray) else t)
        self.idx[sel] = np.clip(self.idx[sel], 0, TOPO[NOMES.index(rampa)])
        self.ramp[sel] = NOMES.index(rampa)
        self.z[sel] = z
        self.grp[sel] = grupo
        self.semc[sel] = enfeite

    def escurece(self, m, q=1):
        sel = m & (self.idx >= 0)
        self.idx[sel] = np.maximum(self.idx[sel] - q, 0)

    def clareia(self, m, q=1):
        sel = m & (self.idx >= 0)
        self.idx[sel] = np.minimum(self.idx[sel] + q, TOPO[self.ramp[sel]])

    def final(self):
        a = self.idx >= 0
        cor = np.zeros((H, W, 3), np.uint8)
        for i, nome in enumerate(NOMES):
            sel = a & (self.ramp == i)
            if sel.any():
                cor[sel] = RAMPAS[nome][self.idx[sel]]
        # separação: o pixel coberto por uma peça mais à frente escurece
        sep = np.zeros_like(a)
        for dy, dx in ((-1, 0), (0, -1), (0, 1), (1, 0)):
            zn = desloca(self.z, dy, dx, -1e9)
            gn = desloca(self.grp, dy, dx)
            an = desloca(a, dy, dx)
            en = desloca(self.semc, dy, dx)
            sep |= a & an & (zn > self.z + 0.3) & (gn != self.grp) & ~en & ~self.semc
        for i, nome in enumerate(NOMES):
            sel = sep & (self.ramp == i)
            if sel.any():
                cor[sel] = RAMPAS[nome][np.maximum(self.idx[sel] - 3, 0)]
        # luz de recorte fria na borda de trás (direita)
        borda_d = a & ~desloca(a, 0, -1)
        rec_i = [NOMES.index(n) for n in ('aco', 'perola', 'ouro', 'azul', 'vermelho')]
        rim = borda_d & np.isin(self.ramp, rec_i) & ~self.semc
        cor[rim] = np.clip(cor[rim].astype(int) * 0.55 + np.array([150, 190, 235]) * 0.45, 0, 255).astype(np.uint8)
        # contorno seletivo de fora
        rgba = np.zeros((H, W, 4), np.uint8)
        rgba[..., :3] = cor
        rgba[..., 3] = np.where(a, 255, 0)
        dono = np.full((H, W), -1, np.int16)
        for dy, dx in ((1, 0), (0, 1), (0, -1), (-1, 0)):
            an = desloca(a, dy, dx)
            rn = desloca(self.ramp, dy, dx)
            novo = an & ~a & (dono < 0)
            dono[novo] = rn[novo]
        for i, nome in enumerate(NOMES):
            sel = dono == i
            if sel.any():
                rgba[sel, :3] = CONTORNO[nome]
                rgba[sel, 3] = 255
        return rgba


# ------------------------------------------------------------------ efeitos (sem contorno)
def mistura(rgba, m, cor, alfa):
    if not m.any():
        return
    c = np.array(cor, float)
    base = rgba[m, :3].astype(float)
    a0 = rgba[m, 3:4].astype(float) / 255
    na = a0 + (1 - a0) * alfa
    out = (base * a0 * (1 - alfa) + c * alfa) / np.maximum(na, 1e-3)
    rgba[m, :3] = np.clip(out, 0, 255).astype(np.uint8)
    rgba[m, 3] = np.clip(na[:, 0] * 255, 0, 255).astype(np.uint8)


def estrela(rgba, c, tam, cor=(255, 255, 255), alfa=1.0):
    x, y = int(c[0]), int(c[1])
    for d in range(-tam, tam + 1):
        a = alfa * (1 - abs(d) / (tam + 1))
        mistura(rgba, ponto(x + d, y) | ponto(x, y + d), cor, a)


# ------------------------------------------------------------------ estágios
ESTAGIOS = {
    1: dict(metal='aco', capa=0, pluma=1, escudo='madeira', friso=False, tabardo=False, cinto='couro', lamina=24, ombreira=1),
    2: dict(metal='aco', capa=0, pluma=2, escudo='cruz', friso=False, tabardo=False, cinto='vermelho', lamina=27, ombreira=1),
    3: dict(metal='aco', capa=1, pluma=2, escudo='cruz', friso=False, tabardo=True, cinto='vermelho', lamina=29, ombreira=2),
    4: dict(metal='aco', capa=2, pluma=3, escudo='brasao', friso=True, tabardo=True, cinto='vermelho', lamina=31, ombreira=2),
    5: dict(metal='aco', capa=2, pluma=3, escudo='brasao', friso=True, tabardo=True, cinto='vermelho', lamina=33, ombreira=3, ouro2=True),
    6: dict(metal='perola', capa=2, pluma=3, escudo='brasao', friso=True, tabardo=True, cinto='vermelho', lamina=34, ombreira=3, ouro2=True, lenda=True, escala_escudo=0.84),
}


def quadro(e: int, t: dict) -> np.ndarray:
    E = ESTAGIOS[e]
    k = t.get
    q = Quadro()
    met = E['metal']
    met_t = 'aco_t' if met == 'aco' else 'perola'
    ouro = 'ouro'
    dx, dy = k('x', 0), k('y', 0)
    bob = k('bob', 0)
    inc = k('inclina', 0)

    cab = P(dx + inc * 1.5, 38 + dy + bob)            # centro do elmo
    tor = P(dx + inc * 0.7, 69 + dy + bob * 0.6)        # centro do tronco
    quad = P(dx, 81 + dy + bob * 0.3)

    # ================= capa (atrás de tudo)
    if E['capa']:
        sw = k('capa', 0)
        comp = 28 if E['capa'] == 1 else 33
        abre = 17 if E['capa'] == 1 else 22
        top = tor + (-1, -9)
        bx = [(-abre + sw * 1.5, comp), (-abre * 0.55 + sw * 1.3, comp + 2.5), (-1 + sw, comp + 0.5), (abre * 0.4 + sw * 0.8, comp + 2.5), (abre - 2 + sw * 0.5, comp)]
        pts = [top + (-11, 0), top + (11, 0), top + (abre * 0.75 + sw * 0.3, comp * 0.55)] + [top + b for b in reversed(bx)] + [top + (-abre * 0.8 + sw * 0.6, comp * 0.5)]
        m = m_poli(pts)
        rel = (YY - top[1]) / comp
        dob = np.sin((XX - top[0] - sw * rel * 3) * 0.62) * (0.25 + 0.55 * np.clip(rel, 0, 1))
        N = (np.clip(-0.15 + dob, -0.9, 0.9), np.full((H, W), -0.15), np.sqrt(np.clip(1 - dob ** 2, 0.1, 1)))
        g = q.novo_grupo()
        q.peca(m, 'vermelho', tons(N, 'vermelho', pano=True, base=-0.08), 0.0, g)
        forro = m & (YY > top[1] + comp - 3 + np.sin(XX * 0.5) * 1.2) & (XX < top[0] - 4)
        q.peca(forro, 'forro', cheio(2), 0.05, g)

    # ================= pernas
    pe_t = P(dx - 6, PE + dy) + np.array(k('pe_t', (0, 0)))
    pe_f = P(dx + 6, PE + dy) + np.array(k('pe_f', (0, 0)))
    for lado, pe, z0 in (('t', pe_t, 1.0), ('f', pe_f, 2.0)):
        mm = met if lado == 'f' else met_t
        q0 = quad + ((-5.5 if lado == 't' else 5.5), 0)
        j = (q0 + pe) / 2 + (1.2, -1)
        g = q.novo_grupo()
        q.peca(m_capsula(q0, j, 4.6, 4.2), 'malha', tons(n_capsula(q0, j, 4.6, 4.2), 'malha', base=-0.05), z0, g)
        cn = pe + (0, -3)
        q.peca(m_capsula(j, cn, 4.4, 3.8), mm, tons(n_capsula(j, cn, 4.4, 3.8), mm, metal=True), z0 + 0.05, g)
        jm = ouro if E.get('ouro2') else mm
        q.peca(m_elipse(j, 3.8, 3.3), jm, tons(n_esfera(j, 3.8, 3.3), jm, metal=True), z0 + 0.1, g)
        q.peca(m_poli([j + (3, -1.5), j + (6, 0.5), j + (3, 1.5)]), jm, tons(n_plano(0.5, -0.2), jm, metal=True), z0 + 0.09, g)
        bota = m_poli([pe + (-5, -5), pe + (2, -5.5), pe + (6.5, -2.5), pe + (8, 0.5), pe + (-5.5, 0.5)])
        q.peca(bota, mm, tons(n_esfera(pe + (0, -1), 9, 6, 0.8), mm, metal=True), z0 + 0.12, g)
        for i in range(3):   # lâminas da bota
            xl = pe[0] - 1 + i * 2.6
            q.peca(m_poli([(xl, pe[1] - 5 + i * 0.9), (xl + 0.9, pe[1] - 5 + i * 0.9), (xl + 1.6, pe[1] + 0.4), (xl + 0.7, pe[1] + 0.4)]) & bota, mm,
                   cheio(1), z0 + 0.13, g, enfeite=True)
        q.peca(m_poli([pe + (-5.5, -0.6), pe + (8, -0.6), pe + (8, 0.6), pe + (-5.5, 0.6)]), 'couro', cheio(1), z0 + 0.14, g, enfeite=True)

    # ================= braço do escudo (atrás do tronco)
    omb_e = tor + (13, -6)
    mao_e = omb_e + np.array(k('mao_e', (3, 12)))
    q.peca(m_capsula(omb_e, mao_e, 3.6, 3.4), met_t, tons(n_capsula(omb_e, mao_e, 3.6, 3.4), met_t, metal=True), 2.5)

    # ================= tronco
    g = q.novo_grupo()
    corpo = m_poli([tor + (-14, -10), tor + (14, -10), tor + (15, 0), tor + (13, 9), tor + (-13, 9), tor + (-15, 0)])
    q.peca(corpo, met, tons(n_esfera(tor + (-3, -4), 18, 16, 0.8), met, metal=True, base=0.05), 3.0, g)
    q.peca(m_capsula(tor + (2, -9), tor + (2, 6), 0.6), met, cheio(6), 3.05, g, enfeite=True)
    q.peca(m_capsula(tor + (3.2, -9), tor + (3.2, 6), 0.5), met, cheio(2), 3.05, g, enfeite=True)
    if E['tabardo']:
        tab = m_poli([tor + (-9, -9.5), tor + (9, -9.5), tor + (10, 9), tor + (-10, 9)])
        gt = q.novo_grupo()
        q.peca(tab, 'azul', tons(n_esfera(tor + (-3, -3), 17, 16, 0.75), 'azul', pano=True), 3.2, gt)
        bar = tab & ~m_poli([tor + (-7.6, -8.2), tor + (7.6, -8.2), tor + (8.6, 9), tor + (-8.6, 9)])
        q.peca(bar, ouro, tons(n_esfera(tor + (-3, -3), 17, 16, 0.75), ouro, metal=True), 3.25, gt, enfeite=True)
        cz = tor + (0.5, -1.5)
        cruz = m_poli([cz + (-1.2, -5), cz + (1.2, -5), cz + (1.2, 4.5), cz + (-1.2, 4.5)]) | m_poli([cz + (-4, -2.2), cz + (4, -2.2), cz + (4, -0.2), cz + (-4, -0.2)])
        q.peca(cruz, ouro, np.where(XX < cz[0], 5, 4).astype(np.int16), 3.3, gt, enfeite=True)
    gc = q.novo_grupo()
    cinto = m_poli([tor + (-14, 7), tor + (14, 7), tor + (14, 11), tor + (-14, 11)])
    q.peca(cinto, E['cinto'], tons(n_capsula(tor + (-14, 9), tor + (14, 9), 2.3), E['cinto'], pano=True), 3.5, gc)
    fiv = m_poli([tor + (-2.5, 6.5), tor + (2.5, 6.5), tor + (2.5, 11.5), tor + (-2.5, 11.5)])
    q.peca(fiv, ouro, tons(n_esfera(tor + (-1, 8), 4, 4), ouro, metal=True), 3.55, gc)
    q.peca(m_poli([tor + (-1, 8), tor + (1, 8), tor + (1, 10), tor + (-1, 10)]), E['cinto'], cheio(1), 3.56, gc, enfeite=True)
    bolsa = m_poli([tor + (6, 10.5), tor + (12, 10.5), tor + (12.5, 16), tor + (6.5, 16.5)])
    q.peca(bolsa, 'couro', tons(n_esfera(tor + (8, 12), 6, 6), 'couro'), 3.52, gc)
    q.peca(m_poli([tor + (6, 10.5), tor + (12, 10.5), tor + (12, 12.5), tor + (9, 13.5), tor + (6, 12.5)]), 'couro', cheio(4), 3.53, gc, enfeite=True)
    for sx in (-1, 1):   # tassets
        ts = m_poli([tor + (sx * 3, 11), tor + (sx * 14, 11), tor + (sx * 15.5, 17), tor + (sx * 4, 17.5)])
        q.peca(ts, met, tons(n_esfera(tor + (sx * 9 - 3, 9), 11, 9, 0.7), met, metal=True), 3.4)
        q.peca(ts & (np.abs(YY - (tor[1] + 14)) < 0.6), met, cheio(2), 3.41, enfeite=True)
    if E['tabardo']:
        aba = m_poli([tor + (-5, 10.5), tor + (5, 10.5), tor + (5.5, 21), tor + (0, 23), tor + (-5.5, 21)])
        ga = q.novo_grupo()
        q.peca(aba, 'azul', tons(n_capsula(tor + (0, 10), tor + (0, 22), 5.5), 'azul'), 3.45, ga)
        q.peca(aba & ~m_poli([tor + (-3.8, 10.5), tor + (3.8, 10.5), tor + (4.2, 20), tor + (0, 21.6), tor + (-4.2, 20)]), ouro, cheio(4), 3.46, ga, enfeite=True)

    # ================= gola de malha
    gola = m_elipse(tor + (0, -10), 13, 4.2)
    q.peca(gola, 'malha', tons(n_esfera(tor + (-2, -11), 13, 5), 'malha') + ((XX.astype(int) + YY.astype(int)) % 2).astype(np.int16) - 1, 3.6)

    # ================= escudo
    ec = mao_e + np.array([3, -1]) + np.array(k('escudo', (0, 0)))
    # a lenda (estágio 6) usa um escudo menor: com as asas, a auréola e a armadura de pérola, o escudo
    # do mesmo tamanho do estágio 5 pesava demais na silhueta (pendência de 14/10, refeita em 15/10)
    s_ = 0.88 if E['escudo'] == 'madeira' else E.get('escala_escudo', 1.0)

    def esc(pp):
        return [ec + np.array(v) * s_ for v in pp]
    mf = m_poli(esc([(-11, -13), (11, -13), (11.5, 0), (8, 9), (0, 16), (-8, 9), (-11.5, 0)]))
    mm_ = m_poli(esc([(-9, -11), (9, -11), (9.5, 0), (6.4, 7.8), (0, 13.6), (-6.4, 7.8), (-9.5, 0)]))
    Ns = n_esfera(ec + (-4, -5), 20, 24, 0.55)
    ge = q.novo_grupo()
    if E['escudo'] == 'madeira':
        tabua = ((XX - ec[0] + 20) // 5 % 2 == 0)
        q.peca(mf, 'madeira', tons(Ns, 'madeira') - tabua.astype(np.int16), 7.0, ge)
        q.peca(m_capsula(ec + (-10, -7), ec + (10, -7), 0.9) & mf, met_t, cheio(3), 7.05, ge, enfeite=True)
        q.peca(m_capsula(ec + (-10, 4), ec + (9, 4), 0.9) & mf, met_t, cheio(3), 7.05, ge, enfeite=True)
        q.peca(m_elipse(ec + (0, -1), 3.4, 3.4), met, tons(n_esfera(ec + (-1, -2), 3.4, 3.4), met, metal=True), 7.1, ge)
    else:
        aro = ouro if E['escudo'] == 'brasao' else met
        q.peca(mf, aro, tons(Ns, aro, metal=True), 7.0, ge)
        campo = 'azul' if E['escudo'] == 'brasao' else met
        q.peca(mm_, campo, tons(Ns, campo, metal=campo != 'azul', base=0.02), 7.05, ge)
        q.clareia(mm_ & (np.abs((XX - ec[0]) + (YY - ec[1]) * 0.8 + 4) < 1.6), 1)
        cz = ec + (0, -1)
        cruz = m_poli([cz + np.array(v) * s_ for v in ((-1.8, -9), (1.8, -9), (1.8, 9), (-1.8, 9))]) | m_poli([cz + np.array(v) * s_ for v in ((-7, -4), (7, -4), (7, -0.6), (-7, -0.6))])
        if E['escudo'] == 'brasao':
            q.peca(cruz & mm_, ouro, tons(n_plano(-0.3, -0.4), ouro, metal=True) + np.where(XX < cz[0], 1, 0).astype(np.int16), 7.1, ge, enfeite=True)
            q.peca(m_elipse(cz + (0, -2.3), 2.0, 2.0), 'gema', tons(n_esfera(cz + (-0.6, -3), 2, 2), 'gema'), 7.15, ge, enfeite=True)
        else:
            q.peca(cruz & mm_, 'vermelho', np.where(XX < cz[0], 4, 3).astype(np.int16), 7.1, ge, enfeite=True)
        for (vx, vy) in ((-10, -12), (0, -12), (10, -12), (10.5, -2), (7, 8), (0, 14.5), (-7, 8), (-10.5, -2)):
            c = ec + np.array([vx, vy]) * s_
            q.peca(m_elipse(c, 0.9, 0.9), ouro if aro == met else met, cheio(5), 7.2, ge, enfeite=True)
        for (vx, vy) in ((-5, 3), (4, -7), (5, 5)):
            q.escurece((ponto(ec[0] + vx, ec[1] + vy) | ponto(ec[0] + vx + 1, ec[1] + vy + 1)) & mm_, 2)

    def ombreira(c, lado, z):
        go = q.novo_grupo()
        lam = E['ombreira']
        for i in range(lam, -1, -1):
            cc = c + np.array([lado * 0.6 * i, 3.2 * i])
            rx, ry = 7.8 - 0.7 * i, 6.0 - 0.6 * i
            m = m_elipse(cc, rx, ry) & (YY < cc[1] + ry * 0.55)
            mm = ouro if (E.get('ouro2') and i == lam) else met
            q.peca(m, mm, tons(n_esfera(cc + (-2, -2), rx + 1, ry + 1), mm, metal=True, base=0.06), z + 0.01 * (lam - i), go)
            if E['friso'] and i == 0:
                q.peca(m & (YY > cc[1] + ry * 0.2), ouro, cheio(4), z + 0.02, go, enfeite=True)
        q.peca(m_elipse(c + (lado * -3.5, -1), 1.1, 1.1), ouro if E['friso'] else met, cheio(5), z + 0.05, go, enfeite=True)

    ombreira(omb_e + (1, 0), 1, 7.3)

    # ================= elmo (formato da referência: domo em ogiva, laterais retas, base plana e larga)
    cx, cy = cab
    rx, ry = 19.5, 19.0
    topo_y, base_y = cy - ry, cy + ry - 1
    ge = q.novo_grupo()
    t_ = np.clip((YY - topo_y) / (base_y - topo_y), 0, 1)
    meia = rx * np.sin(np.clip(t_ * 1.5, 0, 1) * math.pi / 2) ** 0.55 * (1 + 0.04 * np.clip((t_ - 0.75) / 0.25, 0, 1))
    meia = np.maximum(meia, 1.5)
    dom = (YY >= topo_y) & (YY <= base_y) & (np.abs(XX - cx) <= meia)
    nxh = np.clip((XX - cx) / meia, -0.97, 0.97)
    nyh = -np.clip(1 - t_ * 1.5, 0, 1) * 0.85
    nzh = np.sqrt(np.clip(1 - nxh ** 2 - nyh ** 2, 0.03, 1))
    q.peca(dom, met, tons((nxh, nyh, nzh), met, metal=True), 8.0, ge)
    crx = cx + 4                                     # crista vertical (3/4: um pouco à direita)
    fm = ouro if E['friso'] else met
    # aro da base, plano e largo
    aro = dom & (YY > base_y - 3.5)
    q.peca(aro, met, np.where(XX < cx - 4, 4, np.where(XX < cx + 8, 3, 2)).astype(np.int16), 8.02, ge)
    q.peca(dom & (np.abs(YY - (base_y - 3.5)) < 0.6), met, cheio(6), 8.03, ge, enfeite=True)
    if E['friso']:
        q.peca(dom & (np.abs(YY - (base_y - 1.6)) < 0.7), ouro, np.where(XX < cx, 5, 3).astype(np.int16), 8.04, ge, enfeite=True)
    # o "T" da frente: faixa da testa (horizontal) e crista (vertical), claros, com sombra embaixo/à direita
    testa_y = cy - 3
    testa = dom & (np.abs(YY - testa_y) < 1.0) & (XX > cx - 11)
    q.peca(testa, fm, cheio(6 if fm == met else 5), 8.1, ge, enfeite=True)
    q.peca(dom & (np.abs(YY - (testa_y + 1.5)) < 0.5) & (XX > cx - 11), met, cheio(2), 8.09, ge, enfeite=True)
    crista = dom & (np.abs(XX - crx) < 1.2) & (YY < base_y - 3.5)
    q.peca(crista, fm, cheio(6 if fm == met else 5), 8.11, ge, enfeite=True)
    q.peca(dom & (np.abs(XX - (crx + 1.8)) < 0.5) & (YY > testa_y) & (YY < base_y - 3.5), met, cheio(2), 8.1, ge, enfeite=True)
    # fendas dos olhos verticais, dos dois lados da crista (a de longe mais estreita)
    olhos_pos = []
    for ox, larg_f in ((crx - 5.5, 1.6), (crx + 6.0, 1.2)):
        fenda = dom & (np.abs(XX - ox) < larg_f) & (YY > testa_y + 2) & (YY < testa_y + 10)
        q.peca(fenda, 'visor', cheio(0), 8.2, ge, enfeite=True)
        olhos_pos.append((ox, testa_y + 4.5, larg_f))
    # respiros embaixo, do lado da frente
    for i in range(2):
        for j in range(3):
            q.peca(ponto(crx + 3 + j * 2, testa_y + 12 + i * 2) & dom, 'visor', cheio(1), 8.2, ge, enfeite=True)
    # rebites na faixa e amassadinho
    for xr in range(int(cx - 9), int(crx - 2), 4):
        q.peca(ponto(xr, testa_y) & dom, fm, cheio(len(RAMPAS[fm]) - 1), 8.12, ge, enfeite=True)
    q.escurece((ponto(cx - 8, cy - 11) | ponto(cx - 7, cy - 10)) & dom, 2)

    # ================= pluma em penas
    if E['pluma']:
        sw = k('pluma', 0)
        alt = {1: 0.55, 2: 0.8, 3: 1.0}[E['pluma']]
        base = np.array([cx + 1, topo_y + 2.5])
        gp = q.novo_grupo()
        penas = [(-6, -16, -15, -2), (-2, -19, -21, 2), (2, -20, -26, 7), (3, -17, -28, 12), (1, -12, -24, 16), (4, -10, -14, 12)]
        for i, (c1x, c1y, ex, ey) in enumerate(penas):
            ctrl = base + np.array([c1x * alt + sw * 2, c1y * alt])
            fim = base + np.array([ex * alt + sw * 4, ey * alt * 0.7 - 14 * alt + abs(sw) * 1.2])
            pts = bezier(base + (i - 2, 1), ctrl, fim, 9)
            m = m_curva(pts, 5.0 * alt + 1.2, 1.5)
            # cada pena: corpo vermelho, borda de cima clara (luz), borda de baixo escura
            tn = cheio(3 if i % 2 else 4)
            q.peca(m, 'vermelho', tn, 7.6 + 0.01 * i, gp)
            cima = m & ~desloca(m, -1, 0) | (m & ~desloca(m, 0, 1) & (YY < base[1] - 4))
            baixo = m & ~desloca(m, 1, 0)
            q.peca(cima, 'vermelho', cheio(5), 7.605 + 0.01 * i, gp, enfeite=True)
            q.peca(baixo, 'vermelho', cheio(2), 7.605 + 0.01 * i, gp, enfeite=True)
            q.peca(m_curva(pts[2:-2], 0.7, 0.5) & m, 'vermelho', cheio(6 if i in (2, 3) else 5), 7.65 + 0.01 * i, gp, enfeite=True)
        q.peca(m_elipse(base + (0, 1.5), 3.2, 2.2), fm, tons(n_esfera(base, 3.2, 2.2), fm, metal=True), 8.12, ge)

    # ================= braço da espada e espada
    omb_d = tor + (-14, -6)
    mao = omb_d + np.array(k('mao', (-3, 13)))
    ang = k('espada', 2.45)
    d = np.array([math.cos(ang), math.sin(ang)])
    n = np.array([-d[1], d[0]])
    Lb = E['lamina']
    pomo = mao - d * 6.5
    guarda = mao + d * 4
    base_l = guarda + d * 1.2
    ponta = base_l + d * Lb
    frente = bool(k('espada_frente', False))
    zf = 9.4 if frente else k('espada_z', 2.2)
    gs = q.novo_grupo()
    lam = 'lamina' if E.get('lenda') else met
    lamina = m_poli([base_l + n * 2.4, base_l - n * 2.4, ponta - d * 6 - n * 2.0, ponta, ponta - d * 6 + n * 2.0])
    lado_luz = ((XX - base_l[0]) * n[0] + (YY - base_l[1]) * n[1]) < 0
    q.peca(lamina, lam, np.where(lado_luz, 5, 3).astype(np.int16), zf, gs)
    q.peca(m_capsula(base_l + d * 1, base_l + d * Lb * 0.66, 0.6) & lamina, lam, cheio(2), zf + 0.01, gs, enfeite=True)
    q.peca(m_capsula(base_l - n * 2.0, ponta - d * 6 - n * 1.6, 0.5) & lamina, lam, cheio(7), zf + 0.01, gs, enfeite=True)
    gm = ouro if e >= 2 else met
    q.peca(m_capsula(guarda - n * 7, guarda + n * 7, 1.6, 1.6) | m_elipse(guarda - n * 7.5, 1.9, 1.9) | m_elipse(guarda + n * 7.5, 1.9, 1.9), gm,
           tons(n_capsula(guarda - n * 7, guarda + n * 7, 1.8), gm, metal=True), zf + 0.05, gs)
    trama = (((XX - pomo[0]) * d[0] + (YY - pomo[1]) * d[1]).astype(int) % 2 == 0)
    q.peca(m_capsula(pomo, guarda, 1.6), 'couro', np.where(trama, 3, 2).astype(np.int16), zf + 0.03, gs)
    q.peca(m_elipse(pomo, 2.4, 2.4), gm, tons(n_esfera(pomo + (-0.7, -0.7), 2.4, 2.4), gm, metal=True), zf + 0.04, gs)
    if e >= 4:
        q.peca(m_elipse(pomo, 1.1, 1.1), 'gema', cheio(3), zf + 0.045, gs, enfeite=True)
    cot = (omb_d + mao) / 2 + np.array(k('cotovelo', (-2.5, 0)))
    gb = q.novo_grupo()
    zb = 9.5 if frente else 6.0
    q.peca(m_capsula(omb_d, cot, 3.8, 3.4), met, tons(n_capsula(omb_d, cot, 3.8, 3.4), met, metal=True), zb, gb)
    q.peca(m_capsula(cot, mao, 3.6, 3.4), met, tons(n_capsula(cot, mao, 3.6, 3.4), met, metal=True), zb + 0.02, gb)
    cm = ouro if E.get('ouro2') else met
    q.peca(m_elipse(cot, 3.3, 3.0), cm, tons(n_esfera(cot, 3.3, 3.0), cm, metal=True), zb + 0.04, gb)
    q.peca(m_elipse(mao, 4.0, 3.8), met, tons(n_esfera(mao + (-1, -1), 4.2, 4.0), met, metal=True), zb + 0.06, gb)
    for i in (-1.2, 0.9):
        q.peca(m_capsula(mao + n * i - d * 2.5, mao + n * i + d * 2.5, 0.45) & m_elipse(mao, 4.0, 3.8), met, cheio(2), zb + 0.07, gb, enfeite=True)
    ombreira(omb_d + (-1, 0), -1, zb + 0.1)

    # ================= montar e efeitos
    rgba = q.final()
    rg = RAMPAS['olho_dano' if k('dano') else 'olho']
    bo = k('olhos', 1.0)
    if bo > 0:
        for (ox, oy, lf) in olhos_pos:
            m = m_elipse((ox, oy), max(lf - 0.4, 0.7), 1.9)
            mistura(rgba, m_elipse((ox, oy), lf + 1.8, 3.6) & ~m & (rgba[..., 3] > 0), rg[3], min(1.0, 0.14 * bo))
            mistura(rgba, m, rg[2], min(1.0, 0.8 * bo))
            mistura(rgba, ponto(ox, oy - 1) | ponto(ox - 0.6, oy - 1), rg[4], min(1.0, bo))
    if k('cintila_elmo'):
        estrela(rgba, cab + (-8, -9), 2, (255, 255, 255), 0.95)
    if k('brilho_lamina') is not None:
        estrela(rgba, base_l + d * Lb * k('brilho_lamina'), 3, (255, 255, 240), 1.0)
    if k('rastro'):
        a0, a1, raio = k('rastro')
        cen = omb_d + (2, 2)
        ang_p = np.arctan2(YY - cen[1], XX - cen[0])
        rr = np.hypot(XX - cen[0], YY - cen[1])
        lo, hi = min(a0, a1), max(a0, a1)
        arco = (rr > raio - 8) & (rr < raio + 2) & (ang_p > lo) & (ang_p < hi)
        prog = np.clip((ang_p - lo) / max(hi - lo, 1e-3), 0, 1)
        espessura = rr > raio - 1 - 7 * prog
        mistura(rgba, arco & espessura, (170, 225, 255), 0.3)
        mistura(rgba, arco & espessura & (prog > 0.5), (230, 248, 255), 0.6)
        mistura(rgba, arco & (rr > raio - 1.2) & (prog > 0.2), (255, 255, 255), 0.95)
    for (fx, fy) in (k('faiscas') or []):
        estrela(rgba, ec + (fx, fy), 2, (255, 230, 150), 1.0)
    for (fx, fy, tm) in (k('cintilas') or []):
        estrela(rgba, (fx, fy), tm, (255, 246, 200), 1.0)
    if E.get('lenda'):
        rgba = aura(rgba, k('fase_aura', 0))
    out = rgba
    queda = k('queda', 0)
    if queda:
        im = Image.fromarray(out, 'RGBA').rotate(queda, resample=Image.NEAREST, center=(ANCORA[0], ANCORA[1] - 1),
                                                 translate=(k('queda_x', 0), k('queda_y', 0)))
        out = np.asarray(im).copy()
    return out


def aura(rgba, fase=0):
    a = rgba[..., 3] > 0
    halo = np.zeros(a.shape, bool)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        halo |= desloca(a, dy, dx)
    halo &= ~a
    out = rgba.copy()
    out[halo, :3] = (255, 220, 130)
    out[halo, 3] = 110
    rng = np.random.default_rng(7)
    pts = rng.uniform([X0 - 34, 12], [X0 + 34, PE - 4], size=(14, 2))
    for i, (px, py) in enumerate(pts):
        py = (py - fase * 6 - i * 3) % (PE - 12) + 10
        if a[int(py), int(px)]:
            continue
        estrela(out, (px, py), 1 if i % 3 else 2, (255, 228, 140), 0.85)
    return out


# ------------------------------------------------------------------ poses
def suave(a, b, f):
    f = max(0.0, min(1.0, f))
    f = f * f * (3 - 2 * f)
    return a + (b - a) * f


def poses():
    a = {}
    a['parado'] = [
        {'bob': 0, 'pluma': 0, 'capa': 0, 'brilho_lamina': 0.25, 'fase_aura': 0},
        {'bob': 0.5, 'pluma': 0.4, 'capa': 0.5, 'brilho_lamina': 0.5, 'fase_aura': 1},
        {'bob': 1, 'pluma': 0.8, 'capa': 1, 'cintila_elmo': True, 'olhos': 0.25, 'fase_aura': 2},
        {'bob': 0.5, 'pluma': 0.4, 'capa': 0.5, 'brilho_lamina': 0.8, 'fase_aura': 3},
    ]
    a['preparo'] = [{'mao': (suave(-3, 2, f), suave(13, -12, f)), 'espada': suave(2.45, -1.2, f), 'cotovelo': (suave(-2.5, -5, f), 0),
                     'inclina': -1.5 * f, 'pluma': 1.2 * f, 'capa': 0.6 * f, 'olhos': 1.0 + 0.3 * f, 'espada_z': 7.95 if f > 0.5 else 2.2} for f in (0.35, 0.7, 1.0)]
    g = []
    for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.6)):
        s = min(1.0, f / 0.6)
        g.append({'mao': (suave(2, 22, s), suave(-12, 6, s)), 'espada': suave(-1.2, 0.35, s), 'cotovelo': (suave(-5, 3, s), suave(0, -3, s)),
                  'x': 7 * s, 'inclina': suave(-1.5, 3, s), 'pe_f': (5 * s, 0), 'pluma': suave(1.2, -2.2, s), 'capa': -2 * s,
                  'espada_frente': s > 0.25, 'rastro': (-1.9, 0.5, 40) if i in (2, 3) else None})
    a['golpe'] = g
    a['dano'] = [{'x': -4 * f, 'inclina': -3 * f, 'pluma': 2 * f, 'capa': 2 * f, 'mao_e': (3, 12 - 2 * f), 'escudo': (-1 * f, -1 * f),
                  'dano': f > 0.5, 'faiscas': [(-12, -6), (-13, 2), (-9, -12)] if f == 1.0 else None, 'olhos': 1.2} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'inclina': -2 * f, 'mao': (-3 - 4 * f, 13 - 5 * f), 'espada': 2.45 + 0.8 * f, 'pluma': -f, 'capa': -1 * f,
                     'olhos': max(0.0, 1 - f * 1.3), 'queda': 84 * f, 'queda_x': 16 * f, 'queda_y': -16 * f} for f in (0.15, 0.4, 0.7, 0.92, 1.0)]
    v = []
    for f, cint in ((0.4, None), (0.8, [(X0 - 30, 18, 2)]), (1.0, [(X0 - 30, 18, 3), (X0 - 40, 30, 2), (X0 - 18, 8, 2)]), (0.95, [(X0 - 34, 12, 2), (X0 - 22, 26, 3)])):
        v.append({'mao': (suave(-3, 2, f), suave(13, -16, f)), 'espada': suave(2.45, -1.7, f), 'cotovelo': (suave(-2.5, -4, f), 0), 'bob': -1.5 * f,
                  'pluma': 0.8 * f, 'capa': 1.2 * f, 'espada_frente': f > 0.5, 'cintilas': cint, 'olhos': 1.3, 'brilho_lamina': 0.95 if f >= 1 else None})
    a['vitoria'] = v
    return a


TEMPOS = {'parado': 260, 'preparo': 95, 'golpe': 70, 'dano': 90, 'derrota': 140, 'vitoria': 160}


def principal() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--previa')
    ap.add_argument('--anim', default='parado')
    ap.add_argument('--escala', type=int, default=4)
    ap.add_argument('--estagios', default='1,2,3,4,5,6')
    ap.add_argument('--so', type=int)
    ap.add_argument('--fundo', default='#3a4048')
    ap.add_argument('--mascote', action='store_true')
    a = ap.parse_args()
    est = [int(x) for x in a.estagios.split(',')]
    if a.previa:
        nomes = a.anim.split(',')
        P_ = poses()
        cols = 1 if a.so is not None else max(len(P_[nm]) for nm in nomes)
        img = Image.new('RGBA', (W * cols, H * len(est) * len(nomes)), hx(a.fundo) + (255,))
        for li, e in enumerate(est):
            for nj, nm in enumerate(nomes):
                lista = [P_[nm][a.so]] if a.so is not None else P_[nm]
                for ci, pz in enumerate(lista):
                    img.alpha_composite(Image.fromarray(quadro(e, pz), 'RGBA'), (ci * W, (li * len(nomes) + nj) * H))
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
