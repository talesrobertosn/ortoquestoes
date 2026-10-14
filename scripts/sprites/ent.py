#!/usr/bin/env python3
"""Guardião da Fise (sprite 'ent'), chefe do Jardim Suspenso, em pixel art "brutamontes" (14/10/2026).

Referências do Tales (docs/flashcards/MONSTROS-NOVOS.md): o toco de árvore de um olho só com galhos
como garras (ref. 5) e a massa pesada do brutamontes verde (ref. 2): muito peso em cima, base
larga de raízes e braços longos. O toque ortopédico: a "placa de crescimento" brilha como uma
faixa de seiva atravessando o tronco (a fise), e no topo do toco cortado aparecem os anéis.

Usa as ferramentas do cavaleiro chibi numa tela maior (chefe), com rampas próprias.
Olha para a esquerda (para o herói).

    python3 scripts/sprites/ent.py                    # grava ent em public/flashcards/sprites/
    python3 scripts/sprites/ent.py --previa x.png     # prévia ampliada (--anim golpe, --escala 4)
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

# tela de chefe: as ferramentas de cc leem W, H, XX, YY e DITHER na hora
W, H = 196, 150
X0, PE = 106, 142
ANCORA = (X0, PE)
cc.W, cc.H = W, H
cc.YY, cc.XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
cc.DITHER = cc.BAYER[(cc.YY.astype(int)) % 2, (cc.XX.astype(int)) % 2]
XX, YY = cc.XX, cc.YY

NOVAS = {
    'casca': ['#140d08', '#24170e', '#382416', '#4e3420', '#66452b', '#7f5a39', '#9a744d', '#b89266'],
    'casca_t': ['#110b07', '#1e140c', '#2f1f13', '#42301d', '#574028', '#6c5235'],
    'cerne': ['#3a2614', '#6a4a26', '#9c7240', '#c89c62', '#e6c58c', '#f6e2b4'],
    'musgo': ['#0c1e0c', '#173416', '#244e1e', '#346a26', '#4a8a30', '#66aa3c', '#8ccc52', '#b8e878'],
    'seiva': ['#0c2e16', '#1f7034', '#4cc04c', '#a6f070', '#e8ffc4', '#ffffff'],
    'olho_e': ['#2a2400', '#6a5c08', '#c8b020', '#f4e45a', '#fffbd0'],
    'oco': ['#060403', '#100a06', '#1c120a'],
    'flor': ['#4a1838', '#8c2c5c', '#d24c84', '#f48cb4', '#ffd2e4'],
    'cogu': ['#3a0e0a', '#7a1e16', '#c03a28', '#ea6a4a', '#ffd8c0'],
}
for _k, _v in NOVAS.items():
    cc.RAMPAS[_k] = np.array([cc.hx(c) for c in _v], np.uint8)
cc.NOMES = list(cc.RAMPAS)
cc.TOPO = np.array([len(cc.RAMPAS[n]) - 1 for n in cc.NOMES])
cc.CONTORNO = {k: (np.array(v[0], float) * 0.6).astype(np.uint8) for k, v in cc.RAMPAS.items()}

from cavaleiro_chibi import (  # noqa: E402
    Quadro, bezier, cheio, desloca, estrela, m_capsula, m_curva, m_elipse, m_poli, mistura, n_capsula, n_esfera, n_plano,
    ponto, suave, tons,
)

DESTINO = cc.DESTINO


def P(dx, y):
    return np.array([X0 + dx, y], float)


def galho(q, pts, l0, l1, z, mat='casca', g=None):
    g = q.novo_grupo() if g is None else g
    m = np.zeros((H, W), bool)
    n_ = len(pts) - 1
    for i in range(n_):   # cada trecho com as próprias normais: o galho fica roliço, não chapado
        r0 = (l0 + (l1 - l0) * i / n_) / 2
        r1 = (l0 + (l1 - l0) * (i + 1) / n_) / 2
        mi = m_capsula(pts[i], pts[i + 1], r0, r1)
        q.peca(mi & ~m, mat, tons(n_capsula(pts[i], pts[i + 1], r0 + 0.3, r1 + 0.3), mat), z, g)
        m |= mi
    return m, g


def quadro(t: dict) -> np.ndarray:
    k = t.get
    q = Quadro()
    dx, dy = k('x', 0), k('y', 0)
    bob = k('bob', 0)
    inc = k('inclina', 0)
    fase2 = k('estirao', 0.0)

    base = P(dx, PE + dy)
    topo = P(dx + inc * 3, 50 + dy + bob)          # borda de cima do toco
    eixo = lambda f: base + (topo - base) * f        # noqa: E731

    # ================= braço de trás (direita)
    omb_t = eixo(0.62) + (22, 0)
    gt = k('garra_t', (40, 10))
    mt = omb_t + np.array(gt)
    meio_t = (omb_t + mt) / 2 + np.array([4, -10])
    m_bt, g_bt = galho(q, bezier(omb_t, meio_t, mt, 9), 14, 7, 1.0, 'casca_t')
    for i, (ax, ay) in enumerate(((10, -6), (12, 2), (8, 9))):
        ponta = mt + np.array([ax, ay])
        galho(q, bezier(mt, (mt + ponta) / 2 + (2, -3), ponta, 5), 4.2, 1.2, 1.05 + 0.01 * i, 'casca_t', g_bt)

    # ================= raízes espalhadas no chão
    for i, (rx, ry, lado) in enumerate(((-40, 1, -1), (-26, 3, -1), (-12, 4, -1), (14, 4, 1), (28, 3, 1), (40, 1, 1))):
        a = base + (rx * 0.35, -10)
        c = base + (rx, ry - 2)
        mat = 'casca' if lado < 0 else 'casca_t'
        galho(q, bezier(a, a + (rx * 0.4, 6), c, 7), 9, 2.5, 2.0 + (0.1 if lado < 0 else 0), mat)

    # ================= tronco largo (toco), cintura leve e topo quebrado
    g = q.novo_grupo()
    larg = lambda f: 30 - 7 * math.sin(f * math.pi * 0.9) + 4 * f   # noqa: E731
    lados = []
    for f in np.linspace(0, 1, 9):
        c = eixo(f)
        lados.append((c, larg(f) + fase2 * 2))
    esq = [c + (-w, 0) for c, w in lados]
    dir_ = [c + (w, 0) for c, w in reversed(lados)]
    # topo serrilhado (lascas do tronco quebrado)
    lascas = []
    w_top = lados[-1][1]
    for i, (fx, fy) in enumerate(((-1.0, 0), (-0.75, -9), (-0.5, -2), (-0.25, -13), (0.05, -4), (0.3, -10), (0.55, -1), (0.8, -7), (1.0, 0))):
        lascas.append(topo + (fx * w_top, fy - fase2 * 4))
    tronco = m_poli(esq + lascas + dir_)
    Nt = n_esfera(eixo(0.55) + (-12, -10), 40, 70, 0.75)
    q.peca(tronco, 'casca', tons(Nt, 'casca', base=0.04), 3.0, g)
    # sulcos verticais da casca
    for i in range(-4, 5):
        xs = [eixo(f)[0] + i * larg(f) / 5 + math.sin(f * 9 + i) * 1.2 for f in np.linspace(0.04, 0.96, 8)]
        ys = [eixo(f)[1] for f in np.linspace(0.04, 0.96, 8)]
        sulco = m_curva(list(zip(xs, ys)), 1.2, 0.8) & tronco
        q.peca(sulco, 'casca', np.maximum(tons(Nt, 'casca') - 2, 0), 3.05, g, enfeite=True)
    # cerne nos anéis do topo
    tc = topo + (0, 3)
    tampo = m_elipse(tc, w_top * 0.82, 6) & tronco
    q.peca(tampo, 'cerne', cheio(3), 3.1, g, enfeite=True)
    for r in (0.25, 0.5, 0.75):
        anel = m_elipse(tc, w_top * 0.82 * r + 0.6, 6 * r + 0.6) & ~m_elipse(tc, w_top * 0.82 * r - 0.4, 6 * r - 0.4) & tampo
        q.peca(anel, 'cerne', cheio(1), 3.11, g, enfeite=True)

    # ================= a fise: faixa de seiva que brilha atravessando o tronco
    pulso = k('pulso', 0.5)
    fy = eixo(0.27)[1]
    fise = tronco & (np.abs(YY - (fy + np.sin((XX - X0) * 0.18) * 1.6)) < 1.6 + fase2)
    q.peca(fise, 'seiva', cheio(2 + int(pulso * 2)), 3.2, g, enfeite=True)
    q.peca(fise & (np.abs(YY - (fy + np.sin((XX - X0) * 0.18) * 1.6)) < 0.6), 'seiva', cheio(4 + int(pulso)), 3.21, g, enfeite=True)

    # ================= musgo pendurado nos ombros e na base
    gm = q.novo_grupo()
    for (cx_, cy_, rx, ry) in ((-18, 0.86, 16, 6), (14, 0.88, 14, 5), (-26, 0.08, 10, 4), (22, 0.1, 9, 3.5)):
        c = eixo(cy_) + (cx_, 0)
        mm = m_elipse(c, rx, ry)
        franja = mm | (m_elipse(c + (0, ry), rx * 0.9, ry * 0.9) & (np.sin(XX * 1.3) > -0.2))
        q.peca(franja & (tronco | desloca(tronco, 2, 0)), 'musgo', tons(n_esfera(c + (-3, -3), rx + 2, ry + 3), 'musgo', pano=True), 3.4, gm)
    # cogumelos na lateral
    for (cx_, cf, s) in ((-29, 0.16, 1.2), (-31, 0.11, 0.8)):
        c = eixo(cf) + (cx_, 0)
        q.peca(m_capsula(c, c + (2.5 * s, 0), 1.0), 'cerne', cheio(4), 3.5, gm)
        chap = m_elipse(c + (-1 * s, -1.5 * s), 4 * s, 2.4 * s) & (YY < c[1] - 0.5 * s)
        q.peca(chap, 'cogu', tons(n_esfera(c + (-2, -3), 4 * s, 3 * s), 'cogu'), 3.55, gm)
        q.peca(ponto(c[0] - 2 * s, c[1] - 2.5 * s), 'cogu', cheio(4), 3.56, gm, enfeite=True)
    # broto no topo, que cresce no Estirão
    gb = q.novo_grupo()
    br = topo + (6, -6)
    alt = 10 + fase2 * 10 + k('broto', 0)
    q.peca(m_capsula(br, br + (-2, -alt), 1.3, 0.9), 'musgo', cheio(4), 3.6, gb)
    for (fx_, fy_, lado) in ((0.6, 0, -1), (0.9, 0, 1)):
        c = br + (-2 * fx_, -alt * fx_)
        folha = m_elipse(c + (lado * 3.5, -1), 3.8, 1.8)
        q.peca(folha, 'musgo', tons(n_esfera(c + (lado * 2, -2), 4, 2.5), 'musgo'), 3.61, gb)
    flor_c = br + (-2, -alt - 1.5)
    if fase2 > 0 or k('flor'):
        q.peca(m_elipse(flor_c, 3.2, 2.6), 'flor', tons(n_esfera(flor_c + (-1, -1), 3.2, 2.6), 'flor'), 3.62, gb)
        q.peca(ponto(*flor_c), 'olho_e', cheio(4), 3.63, gb, enfeite=True)

    # ================= o olho único, num nó da madeira, e a boca rachada
    oc = eixo(0.62) + (-8, 0)
    abre_o = k('olho', 1.0)
    no = m_elipse(oc, 11, 9)
    q.peca(no, 'casca', tons(n_esfera(oc + (-3, -3), 12, 10), 'casca', base=0.1), 3.7, g)
    q.peca(no & ~m_elipse(oc + (0.5, 0.5), 9, 7.2), 'casca', cheio(6), 3.71, g, enfeite=True)
    vao = m_elipse(oc + (0.5, 0.5), 8, 6.4 * max(abre_o, 0.12))
    q.peca(vao, 'oco', cheio(0), 3.72, g, enfeite=True)
    olho_pos = None
    if abre_o > 0.2:
        iris_c = oc + (-2 + k('mira', 0), 0.8)
        iris = m_elipse(iris_c, 4.2, 4.2 * abre_o) & vao
        q.peca(iris, 'olho_e', np.where(YY < iris_c[1], 3, 2).astype(np.int16), 3.73, g, enfeite=True)
        pup = m_elipse(iris_c + (-0.6, 0), 1.3, 2.6 * abre_o) & iris
        q.peca(pup, 'oco', cheio(0), 3.74, g, enfeite=True)
        olho_pos = iris_c
    # pálpebra de casca, pesada
    palp = m_elipse(oc + (0.5, -6.4 * abre_o - 1.5), 9.5, 5.5) & no
    q.peca(palp, 'casca', tons(n_esfera(oc + (-2, -9), 10, 6), 'casca', base=0.08), 3.75, g)
    bc = eixo(0.42) + (-6, 0)
    abre = k('boca', 0.0)
    boca = m_poli([bc + (-12, -1), bc + (-7, -3 - abre), bc + (-2, -1), bc + (3, -3.5 - abre), bc + (9, -1), bc + (6, 2 + abre * 3), bc + (-1, 3.5 + abre * 3.5), bc + (-9, 2.5 + abre * 2)])
    q.peca(boca & tronco, 'oco', np.where(YY > bc[1] + 1, 1, 0).astype(np.int16), 3.7, g, enfeite=True)
    for (tx, cima) in ((-9, True), (-3, False), (2, True), (6, False)):
        tc_ = bc + (tx, -1.5 if cima else 2 + abre * 2.5)
        dente = m_poli([tc_ + (-1.4, 0), tc_ + (1.4, 0), tc_ + (0, 3 if cima else -3)])
        q.peca(dente & boca, 'cerne', cheio(3 if cima else 2), 3.71, g, enfeite=True)

    # ================= braço da frente (esquerda), galho grosso com garras
    omb = eixo(0.5) + (-24, 0)
    gf = k('garra', (-30, 26))
    mf = omb + np.array(gf)
    meio = (omb + mf) / 2 + np.array(k('curva', (-4, -12)))
    m_b, g_b = galho(q, bezier(omb, meio, mf, 10), 13, 7, 6.0)
    nervura = m_curva([p_ + np.array([0, 1.5]) for p_ in bezier(omb, meio, mf, 10)][1:-1], 0.9, 0.6) & m_b
    q.peca(nervura, 'casca', cheio(2), 6.01, g_b, enfeite=True)
    # musgo no cotovelo
    q.peca(m_elipse(meio + (0, -3), 7, 3.6) & desloca(m_b, 2, 0), 'musgo', tons(n_esfera(meio + (-2, -5), 8, 4), 'musgo'), 6.05, g_b)
    dirc = (mf - meio) / max(np.linalg.norm(mf - meio), 1e-3)
    nrm = np.array([-dirc[1], dirc[0]])
    abre_g = k('abre_garra', 0.6)
    for i, s in enumerate((-1, 0, 1)):
        ang = s * (0.5 + 0.35 * abre_g)
        d2 = dirc * math.cos(ang) + nrm * math.sin(ang)
        ponta = mf + d2 * 20
        dobra = mf + d2 * 10 + nrm * (3 * s - 2)
        galho(q, [mf, dobra, ponta], 6.5, 1.0, 6.1 + 0.01 * i, 'casca', g_b)
        q.peca(m_elipse(ponta - d2 * 1.5, 1.2, 1.2), 'cerne', cheio(4), 6.15, g_b, enfeite=True)
    # folhinhas presas no braço
    for (f, lado) in ((0.35, -1), (0.6, 1)):
        c = omb + (mf - omb) * f + np.array([0, -6 * lado])
        q.peca(m_elipse(c, 3, 1.6), 'musgo', cheio(5), 6.2, g_b)

    # ================= montar e efeitos
    rgba = q.final()
    if olho_pos is not None:
        mistura(rgba, m_elipse(olho_pos, 7, 6) & (rgba[..., 3] > 0) & ~m_elipse(olho_pos, 4.2, 4.2), (230, 220, 90), 0.12 * k('brilho', 1.0))
        mistura(rgba, ponto(olho_pos[0] - 1.6, olho_pos[1] - 2), (255, 255, 240), 1.0)
    # brilho da fise sobre o contorno
    mistura(rgba, desloca(fise, 1, 0) | desloca(fise, -1, 0), (150, 255, 140), 0.2 + 0.25 * pulso)
    if k('rastro'):
        a0, a1, raio = k('rastro')
        cen = omb
        ang_p = np.arctan2(YY - cen[1], XX - cen[0])
        rr = np.hypot(XX - cen[0], YY - cen[1])
        lo, hi = min(a0, a1), max(a0, a1)
        if lo < -math.pi:
            ang_p = np.where(ang_p > 0, ang_p - 2 * math.pi, ang_p)
        arco = (rr > raio - 12) & (rr < raio + 3) & (ang_p > lo) & (ang_p < hi)
        prog = np.clip((hi - ang_p) / max(hi - lo, 1e-3), 0, 1)
        espessura = rr > raio - 2 - 10 * prog
        mistura(rgba, arco & espessura, (190, 255, 150), 0.32)
        mistura(rgba, arco & espessura & (prog > 0.5), (235, 255, 210), 0.6)
        mistura(rgba, arco & (rr > raio - 1.5) & (prog > 0.2), (255, 255, 255), 0.95)
    for (fx_, fy_) in (k('poeira') or []):
        mistura(rgba, m_elipse((fx_, fy_), 6, 2.4) & (rgba[..., 3] == 0), (176, 160, 120), 0.6)
    for (fx_, fy_, tm) in (k('cintilas') or []):
        estrela(rgba, (fx_, fy_), tm, (210, 255, 160), 1.0)
    for (fx_, fy_) in (k('lascas') or []):
        mistura(rgba, m_elipse((fx_, fy_), 1.6, 1.0), (122, 88, 56), 1.0)
    for i, (fx_, fy_) in enumerate(k('folhas') or []):
        mistura(rgba, m_elipse((fx_, fy_), 2.0, 1.0), (110, 170, 60) if i % 2 else (150, 200, 80), 1.0)
    out = rgba
    queda = k('queda', 0)
    if queda:
        im = Image.fromarray(out, 'RGBA').rotate(queda, resample=Image.NEAREST, center=(ANCORA[0] + 20, ANCORA[1] - 1),
                                                 translate=(k('queda_x', 0), k('queda_y', 0)))
        out = np.asarray(im).copy()
    afunda = int(round(k('afunda', 0)))
    if afunda:   # derrota: o toco tomba e afunda no chão do Jardim (o que passa da linha dos pés some)
        out = desloca(out, afunda, 0)
        out[PE + 1:] = 0
        poe = m_elipse((X0, PE - 1), 40, 3) & (out[..., 3] == 0)
        mistura(out, poe, (160, 140, 100), min(0.6, afunda / 40))
    return out


def poses():
    a = {}
    a['parado'] = [
        {'bob': 0, 'pulso': 0.2, 'folhas': [(X0 - 40, 70)]},
        {'bob': 0.6, 'pulso': 0.6, 'garra': (-30, 27), 'garra_t': (40, 11), 'folhas': [(X0 - 42, 84)]},
        {'bob': 1.2, 'pulso': 1.0, 'garra': (-30, 28), 'garra_t': (40, 12), 'olho': 0.3, 'folhas': [(X0 - 39, 98)]},
        {'bob': 0.6, 'pulso': 0.6, 'garra': (-30, 27), 'garra_t': (40, 11), 'folhas': [(X0 - 43, 112)]},
    ]
    a['preparo'] = [{'garra': (suave(-30, -6, f), suave(26, -40, f)), 'curva': (suave(-4, -14, f), suave(-12, -4, f)), 'garra_t': (40, suave(10, -6, f)),
                     'inclina': 2 * f, 'boca': 0.5 * f, 'abre_garra': 0.6 + 0.6 * f, 'pulso': 0.6 + 0.4 * f, 'olho': 1.0, 'mira': -0.5 * f} for f in (0.35, 0.7, 1.0)]
    g = []
    for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.6)):
        s = min(1.0, f / 0.6)
        g.append({'garra': (suave(-6, -56, s), suave(-40, 24, s)), 'curva': (suave(-14, -8, s), suave(-4, -16, s)), 'garra_t': (40, 4),
                  'x': -6 * s, 'inclina': suave(2, -4, s), 'boca': 1.0, 'abre_garra': suave(1.2, 0.2, s), 'pulso': 1.0, 'mira': -1.2,
                  'rastro': (-1.4, 2.2 - 2 * math.pi, 46) if i in (2, 3) else None,
                  'poeira': [(X0 - 60, PE - 2), (X0 - 48, PE - 1), (X0 - 72, PE - 3)] if i in (3, 4) else None,
                  'lascas': [(X0 - 64, PE - 12), (X0 - 54, PE - 18)] if i == 3 else None})
    a['golpe'] = g
    a['dano'] = [{'x': 5 * f, 'inclina': 3 * f, 'olho': 0.12 if f > 0.5 else 0.6, 'boca': 0.8 * f, 'garra': (-26, 24 - 4 * f), 'pulso': 0.1,
                  'lascas': [(X0 - 30, 70), (X0 - 36, 60), (X0 - 24, 54)] if f == 1.0 else None,
                  'folhas': [(X0 - 20, 40), (X0 + 10, 34), (X0 - 2, 30)] if f > 0.5 else None} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'inclina': 2 * f, 'olho': max(0.12, 1 - 1.2 * f), 'boca': 0.7, 'garra': (-26 + 10 * f, 26 + 10 * f), 'garra_t': (40, 10 + 14 * f),
                     'pulso': max(0.0, 0.5 - f), 'queda': -24 * f, 'queda_x': 4 * f, 'queda_y': 0, 'afunda': 40 * f * f,
                     'folhas': [(X0 - 30 + 40 * f, 40 + 60 * f), (X0 + 20, 30 + 80 * f), (X0 - 10, 50 + 70 * f)] if f > 0.3 else None}
                    for f in (0.12, 0.35, 0.6, 0.85, 1.0)]
    v = []
    for f, cint in ((0.5, None), (1.0, [(X0 - 50, 40, 3), (X0 + 40, 30, 2)]), (0.8, [(X0 - 44, 26, 2), (X0 + 46, 42, 3), (X0 + 6, 20, 2)]), (0.3, [(X0 + 30, 24, 2)])):
        v.append({'garra': (suave(-30, -22, f), suave(26, -40, f)), 'curva': (-12, -6), 'garra_t': (suave(40, 32, f), suave(10, -32, f)), 'boca': 0.6 * f,
                  'abre_garra': 1.2, 'pulso': 1.0, 'flor': True, 'broto': 4 * f, 'bob': -2 * f, 'cintilas': cint})
    a['vitoria'] = v
    return a


TEMPOS = {'parado': 300, 'preparo': 110, 'golpe': 80, 'dano': 95, 'derrota': 150, 'vitoria': 170}


def principal() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--previa')
    ap.add_argument('--anim', default='parado')
    ap.add_argument('--escala', type=int, default=3)
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
    _, meta = gravar_folha('ent', quadros, TEMPOS, DESTINO, ANCORA)
    print('gravado ent', meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
