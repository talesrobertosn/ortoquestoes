#!/usr/bin/env python3
"""Aranha dos Ligamentos em pixel art detalhada (14/10/2026).

"Tece a teia entre os seus erros." Referência do Tales: o detalhe de muitos tons por material e as
manchas da carapaça (docs/flashcards/MONSTROS-NOVOS.md, refs. 1 e 4). Quitina roxa com manchas
claras, oito patas com joelhos marcados, seis olhos vermelhos e quelíceras que pingam veneno.
O toque ortopédico: o desenho do abdome é um "X", os ligamentos cruzados, e a teia do golpe é
de fios de ligamento (há também um fio listrado opcional, `fio`, desligado na folha).

Usa as ferramentas do cavaleiro chibi, numa tela com folga, com rampas próprias.
Olha para a esquerda (para o herói).

    python3 scripts/sprites/aranha.py                    # grava aranha em public/flashcards/sprites/
    python3 scripts/sprites/aranha.py --previa x.png     # prévia ampliada (--anim golpe, --escala 4)
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import cavaleiro_chibi as cc  # noqa: E402
from motor import gravar_folha  # noqa: E402

NOVAS = {
    'quitina': ['#120a1e', '#221438', '#36205a', '#4c2e7c', '#6642a0', '#8462bc', '#a888d6', '#d0b8f0'],
    'quitina_t': ['#0e0818', '#1a102c', '#2a1a46', '#3c2662', '#50347e'],
    'mancha': ['#4a3a5a', '#7a6a8c', '#b2a4c2', '#ded4ea', '#f6f0fc'],
    'ligamento': ['#5a4a3a', '#9a8a72', '#d0c4aa', '#ece4d0', '#fffaf0'],
    'olho_a': ['#2a0206', '#6a0a14', '#c81a2a', '#ff5a5a', '#ffd0c8'],
    'presa': ['#2a1a10', '#5a3a22', '#8a6040', '#c4a078', '#eee0c8'],
    'veneno': ['#0e2a08', '#2a6a14', '#5ab02a', '#a6e84a', '#e8ffb0'],
    'oco': ['#060308', '#120a16', '#1e1224'],
}
for _k, _v in NOVAS.items():
    cc.RAMPAS[_k] = np.array([cc.hx(c) for c in _v], np.uint8)
cc.NOMES = list(cc.RAMPAS)
cc.TOPO = np.array([len(cc.RAMPAS[n]) - 1 for n in cc.NOMES])
cc.CONTORNO = {k: (np.array(v[0], float) * 0.6).astype(np.uint8) for k, v in cc.RAMPAS.items()}

from cavaleiro_chibi import (  # noqa: E402
    Quadro, bezier, cheio, desloca, estrela, m_capsula, m_curva, m_elipse, m_poli, mistura, n_capsula, n_esfera, ponto,
    suave, tons,
)

W, H = 184, 116
X0, PE = 100, 101
ANCORA = (X0, PE)
cc.W, cc.H = W, H
cc.YY, cc.XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
cc.DITHER = cc.BAYER[(cc.YY.astype(int)) % 2, (cc.XX.astype(int)) % 2]
XX, YY = cc.XX, cc.YY

DESTINO = cc.DESTINO


def P(dx, y):
    return np.array([X0 + dx, y], float)


def junta(a, b, l1, l2, lado):
    """Joelho entre a e b (cinemática de dois ossos), dobrando para cima (lado=-1) ou para baixo."""
    a, b = np.array(a, float), np.array(b, float)
    d = b - a
    dist = max(np.linalg.norm(d), 1e-3)
    if dist >= l1 + l2 - 0.01:
        return a + d * l1 / (l1 + l2)
    t = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist)
    h = math.sqrt(max(0.0, l1 * l1 - t * t))
    u = d / dist
    n = np.array([-u[1], u[0]])
    return a + u * t + n * h * lado


def quadro(t: dict) -> np.ndarray:
    k = t.get
    q = Quadro()
    dx, dy = k('x', 0), k('y', 0)
    bob = k('bob', 0)
    ergue = k('ergue', 0.0)          # empina a frente (preparo)
    encolhe = k('encolhe', 0.0)      # patas recolhidas (derrota)

    corpo_y = PE + dy - 20 + bob + encolhe * 10
    cef = np.array([X0 + dx - 12, corpo_y - ergue * 8])     # cefalotórax (frente, esquerda)
    abd = np.array([X0 + dx + 10, corpo_y - 4 + ergue * 2])  # abdome (atrás, direita)

    # ================= fio de ligamento de onde ela desceu
    if k('fio', False):   # desligado: o fio comprido aumentava a caixa do corpo e encolhia a aranha na tela
        gf = q.novo_grupo()
        topo_f = np.array([abd[0] + 4, 2])
        fim_f = abd + (4, -12)
        fio = m_capsula(topo_f, fim_f, 1.6, 1.3)
        q.peca(fio, 'ligamento', np.where(((YY.astype(int)) % 3) == 0, 1, 3).astype(np.int16), 0.5, gf)
        q.peca(fio & (XX < topo_f[0]), 'ligamento', cheio(4), 0.51, gf, enfeite=True)

    # ================= oito patas: as do lado de lá (escuras) atrás do corpo, as de cá na frente
    def pata(i, lado):
        mat = 'quitina' if lado > 0 else 'quitina_t'
        z = 2.5 + i * 0.05 if lado > 0 else 1.0 + i * 0.05
        ombro = cef + np.array([4 + i * 2.2, 3 + lado * 1.5])
        abre = (-36, -17, 12, 32)[i] + (0 if lado > 0 else 6)
        pe = np.array([X0 + dx + abre + k('passo', 0) * (2 if (i + (lado > 0)) % 2 else -2), PE + dy - (0 if lado > 0 else 3)])
        if i == 0 and ergue > 0:   # as da frente sobem no preparo e batem no golpe
            pe = pe + np.array([-4 * ergue, -26 * ergue])
        if i == 0 and k('bate', 0):
            pe = pe + np.array([-10 * k('bate'), 0])
        if encolhe:
            pe = ombro + (pe - ombro) * (1 - 0.75 * encolhe) + np.array([0, -6 * encolhe])
        l1, l2 = 22 - abs(i - 1.5) * 1.5, 25 - abs(i - 1.5) * 1.5
        j1, j2 = junta(ombro, pe, l1, l2, -1), junta(ombro, pe, l1, l2, 1)
        joe = j1 if j1[1] < j2[1] else j2   # joelho sempre para cima, como pata de aranha
        g = q.novo_grupo()
        q.peca(m_capsula(ombro, joe, 2.6, 2.0), mat, tons(n_capsula(ombro, joe, 2.6, 2.0), mat), z, g)
        q.peca(m_capsula(joe, pe, 2.0, 0.8), mat, tons(n_capsula(joe, pe, 2.0, 0.8), mat), z + 0.01, g)
        q.peca(m_elipse(joe, 2.4, 2.4), mat, tons(n_esfera(joe + (-0.8, -0.8), 2.4, 2.4), mat, base=0.08), z + 0.02, g)
        q.peca(ponto(joe[0] - 0.8, joe[1] - 1.2), 'mancha', cheio(3), z + 0.03, g, enfeite=True)
        # pelinhos nas patas
        for f in (0.35, 0.65):
            c = joe + (pe - joe) * f
            q.peca(ponto(c[0] + 1.6, c[1] - 1), mat, cheio(1), z + 0.03, g, enfeite=True)
        q.peca(m_capsula(pe, pe + (-1.2, 1.0), 0.6), 'presa', cheio(1), z + 0.04, g, enfeite=True)

    for i in range(4):
        pata(i, -1)

    # ================= abdome com o "X" dos cruzados e manchas claras
    ga = q.novo_grupo()
    ab = m_elipse(abd, 17, 13.5 - encolhe * 2)
    q.peca(ab, 'quitina', tons(n_esfera(abd + (-6, -6), 18, 15, 0.8), 'quitina', base=0.04), 2.0, ga)
    xa = abd + (2, -1)
    for s in (-1, 1):
        braço = m_capsula(xa + (-8, -6 * s), xa + (8, 6 * s), 1.9, 1.5) & ab
        q.peca(braço, 'ligamento', np.where(YY < xa[1], 3, 2).astype(np.int16), 2.1, ga, enfeite=True)
        q.peca(m_capsula(xa + (-8, -6 * s), xa + (8, 6 * s), 0.5) & ab, 'ligamento', cheio(1), 2.11, ga, enfeite=True)
    for (vx, vy, r) in ((-11, -5, 2.2), (12, -6, 2.0), (-9, 6, 1.8), (13, 5, 1.6), (0, -10, 1.8), (2, 9, 1.6)):
        m = m_elipse(abd + (vx, vy), r, r * 0.8) & ab
        q.peca(m, 'mancha', np.where(YY < abd[1] + vy, 3, 2).astype(np.int16), 2.12, ga, enfeite=True)
    q.peca(m_elipse(abd + (-7, -8), 4.5, 2) & ab, 'quitina', cheio(7), 2.13, ga, enfeite=True)   # brilho
    # fiandeiras atrás
    q.peca(m_elipse(abd + (16, 2), 2.4, 1.8), 'quitina_t', cheio(2), 1.9, ga)

    # ================= cefalotórax, olhos e quelíceras
    gc = q.novo_grupo()
    ce = m_elipse(cef, 11.5, 9 + ergue)
    q.peca(ce, 'quitina', tons(n_esfera(cef + (-4, -5), 12, 11, 0.8), 'quitina', base=0.07), 3.0, gc)
    q.peca(m_curva([cef + (-3, -7), cef + (3, -8), cef + (8, -6)], 1.0, 0.8) & ce, 'quitina', cheio(7), 3.01, gc, enfeite=True)
    olhos = []
    if not k('olhos_x'):
        for (ox, oy, r) in ((-7, -2, 1.9), (-3, -3.5, 2.3), (1.5, -3.5, 2.0), (-8.5, 1.5, 1.3), (-4.5, 0.5, 1.4), (-0.5, 0.5, 1.2)):
            c = cef + (ox, oy)
            q.peca(m_elipse(c, r, r), 'olho_a', np.where(YY < c[1], 3, 2).astype(np.int16), 3.2, gc, enfeite=True)
            olhos.append((c, r))
    else:
        for (ox, oy) in ((-6, -2), (0, -3)):
            c = cef + (ox, oy)
            q.peca(m_capsula(c + (-1.5, -1.5), c + (1.5, 1.5), 0.6) | m_capsula(c + (-1.5, 1.5), c + (1.5, -1.5), 0.6), 'oco', cheio(0), 3.2, gc, enfeite=True)
    abre_q = k('morde', 0.2)
    for s in (-1, 1):
        base_q = cef + (-8, 4 + s * 2.2)
        ponta_q = base_q + np.array([-4 - abre_q * 2, 5 + s * (1.5 + abre_q * 3)])
        q.peca(m_capsula(base_q, ponta_q, 2.0, 0.7), 'presa', tons(n_capsula(base_q, ponta_q, 2.0, 0.7), 'presa', base=0.05), 3.3 + (0.01 if s > 0 else 0), gc)
        q.peca(ponto(*(ponta_q + (0.4, -0.6))), 'presa', cheio(4), 3.32, gc, enfeite=True)
    # pedipalpos
    for s in (-1, 1):
        a_ = cef + (-6, 6 + s * 2)
        b_ = a_ + np.array([-6, 3 + s * 2])
        q.peca(m_capsula(a_, b_, 1.3, 1.0), 'quitina', cheio(4), 3.25, gc)

    for i in range(4):
        pata(i, 1)

    # ================= montar e efeitos
    rgba = q.final()
    brilho = k('brilho', 1.0)
    for (c, r) in olhos:
        mistura(rgba, m_elipse(c, r + 1.4, r + 1.4) & (rgba[..., 3] > 0) & ~m_elipse(c, r, r), (255, 80, 80), 0.18 * brilho)
        mistura(rgba, ponto(c[0] - r * 0.4, c[1] - r * 0.4), (255, 255, 240), 1.0)
    if k('pinga'):
        for i, (gx, gy) in enumerate(k('pinga')):
            m = m_elipse((gx, gy), 1.2 + 0.3 * (i % 2), 1.8)
            mistura(rgba, m, tuple(cc.RAMPAS['veneno'][3]), 1.0)
            mistura(rgba, ponto(gx - 0.4, gy - 0.8), tuple(cc.RAMPAS['veneno'][4]), 1.0)
    if k('teia'):
        cx_, cy_, r_ = k('teia')
        ang = np.arctan2(YY - cy_, XX - cx_)
        rr = np.hypot(XX - cx_, YY - cy_)
        raios = (np.abs(np.sin(ang * 4)) < 0.06) & (rr < r_)
        aneis = (np.abs((rr % 6) - 3) < 0.45) & (rr < r_)
        mistura(rgba, (raios | aneis) & (rgba[..., 3] == 0), (236, 228, 208), 0.75)
    for (fx_, fy_, tm) in (k('cintilas') or []):
        estrela(rgba, (fx_, fy_), tm, (230, 200, 255), 1.0)
    for (fx_, fy_) in (k('poeira') or []):
        mistura(rgba, m_elipse((fx_, fy_), 4, 1.5) & (rgba[..., 3] == 0), (170, 156, 150), 0.55)
    return rgba


def poses():
    a = {}
    a['parado'] = [
        {'bob': 0, 'passo': 0, 'morde': 0.2},
        {'bob': 0.6, 'passo': 0.6, 'morde': 0.5, 'pinga': [(X0 - 25, 92)]},
        {'bob': 1.0, 'passo': 0, 'morde': 0.2, 'brilho': 0.6, 'pinga': [(X0 - 25, 96)]},
        {'bob': 0.6, 'passo': -0.6, 'morde': 0.4},
    ]
    a['preparo'] = [{'ergue': f, 'x': 3 * f, 'morde': 0.2 + 0.8 * f, 'brilho': 1 + 0.5 * f, 'pinga': [(X0 - 27, 88 - 6 * f)] if f > 0.5 else None} for f in (0.35, 0.7, 1.0)]
    g = []
    for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.6)):
        s = min(1.0, f / 0.6)
        g.append({'x': -16 * s, 'ergue': suave(1.0, 0.0, s), 'bate': s, 'morde': 1.0 if i < 3 else 0.0, 'brilho': 1.5, 'passo': 1 if i % 2 else -1,
                  'pinga': [(X0 - 46, 90 + j * 4) for j in range(3)] if i in (3, 4) else None,
                  'teia': (X0 - 62, 78, 14) if i in (3, 4, 5) else None,
                  'poeira': [(X0 - 54, PE - 1), (X0 - 34, PE - 1)] if i == 3 else None})
    a['golpe'] = g
    a['dano'] = [{'x': 5 * f, 'bob': 2 * f, 'encolhe': 0.3 * f, 'morde': 0.0, 'brilho': 0.3 + (1 - f)} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'encolhe': f, 'olhos_x': f > 0.5, 'morde': 0.0, 'bob': 2 * f} for f in (0.15, 0.4, 0.65, 0.88, 1.0)]
    v = []
    for f, cint in ((0.5, None), (1.0, [(X0 - 30, 50, 2)]), (0.7, [(X0 - 34, 44, 3), (X0 + 36, 52, 2)]), (0.2, [(X0 + 32, 46, 2)])):
        v.append({'ergue': 0.8 * f, 'bob': -2 * f, 'morde': 0.8, 'brilho': 1.3, 'passo': 1 if f > 0.6 else -1, 'cintilas': cint})
    a['vitoria'] = v
    return a


TEMPOS = {'parado': 230, 'preparo': 95, 'golpe': 70, 'dano': 90, 'derrota': 130, 'vitoria': 150}


def principal() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--previa')
    ap.add_argument('--anim', default='parado')
    ap.add_argument('--escala', type=int, default=4)
    ap.add_argument('--fundo', default='#3a4048')
    a = ap.parse_args()
    if a.previa:
        nomes = a.anim.split(',')
        P_ = poses()
        cols = max(len(P_[nm]) for nm in nomes)
        img = Image.new('RGBA', (W * cols, H * len(nomes)), cc.hx(a.fundo) + (255,))
        for nj, nm in enumerate(nomes):
            for ci, pz in enumerate(P_[nm]):
                img.alpha_composite(Image.fromarray(quadro(pz), 'RGBA'), (ci * W, nj * H))
        img.resize((img.width * a.escala, img.height * a.escala), Image.NEAREST).save(a.previa)
        print('prévia:', a.previa)
        return 0
    quadros = {nome: [quadro(p) for p in v] for nome, v in poses().items()}
    _, meta = gravar_folha('aranha', quadros, TEMPOS, DESTINO, ANCORA)
    print('gravado aranha', meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
