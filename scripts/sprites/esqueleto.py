#!/usr/bin/env python3
"""Esqueleto do Metacarpo em pixel art, estilo sóbrio e terroso (14/10/2026).

Referência do Tales: os quatro inimigos pequenos de paleta terrosa (docs/flashcards/MONSTROS-NOVOS.md,
ref. 5), aqui o esqueleto com escudo redondo de madeira e espada curta. Fantasia, sem anatomia
realista. O toque ortopédico: uma placa com parafusos no fêmur, a mão da espada com os cinco
metacarpos bem marcados e o punho da espada feito de osso.

Usa as ferramentas do cavaleiro chibi, como o goblin, com rampas próprias e menos saturadas.
Olha para a esquerda (para o herói).

    python3 scripts/sprites/esqueleto.py                    # grava esqueleto em public/flashcards/sprites/
    python3 scripts/sprites/esqueleto.py --previa x.png     # prévia ampliada (--anim golpe, --escala 5)
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
    'osso': ['#231c14', '#3f3426', '#62553f', '#8a7a5d', '#b0a07f', '#cfc2a2', '#e8dec4', '#f7f1e0'],
    'osso_t': ['#1d1812', '#352c21', '#524634', '#73654d', '#948466', '#b2a385'],
    'oco': ['#0a0806', '#16110c', '#221a12'],
    'brasa': ['#0c2a2a', '#1f6664', '#46b0a8', '#9be8dc', '#eafffa'],
    'ferrugem': ['#1e1410', '#3a2618', '#5e3c22', '#7e5530', '#9a7048', '#b89068', '#d8b894'],
    'pano': ['#1a120c', '#2e2016', '#463222', '#5e4630', '#7a5e42'],
    'placa': ['#1a1d22', '#323842', '#4f5866', '#76808f', '#a5aebb', '#d8dee6'],
}
for _k, _v in NOVAS.items():
    cc.RAMPAS[_k] = np.array([cc.hx(c) for c in _v], np.uint8)
cc.NOMES = list(cc.RAMPAS)
cc.TOPO = np.array([len(cc.RAMPAS[n]) - 1 for n in cc.NOMES])
cc.CONTORNO = {k: (np.array(v[0], float) * 0.6).astype(np.uint8) for k, v in cc.RAMPAS.items()}

from cavaleiro_chibi import (  # noqa: E402
    Quadro, bezier, cheio, desloca, estrela, m_capsula, m_curva, m_elipse, m_poli,
    mistura, n_capsula, n_esfera, n_plano, ponto, suave, tons,
)

# tela com folga dos lados e embaixo (a arma e a derrota não encostam na borda da folha);
# as ferramentas de cc leem W, H, XX e YY na hora
W, H = 152, 116
X0, PE = 76, 101
ANCORA = (X0, PE)
cc.W, cc.H = W, H
cc.YY, cc.XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
cc.DITHER = cc.BAYER[(cc.YY.astype(int)) % 2, (cc.XX.astype(int)) % 2]
XX, YY = cc.XX, cc.YY

DESTINO = cc.DESTINO


def P(dx, y):
    return np.array([X0 + dx, y], float)


def osso(q, a, b, r0, r1, z, mat='osso', grupo=None, nos=True):
    """Osso longo: haste fina com as duas pontas mais grossas."""
    g = q.novo_grupo() if grupo is None else grupo
    q.peca(m_capsula(a, b, r0, r1), mat, tons(n_capsula(a, b, r0, r1), mat), z, g)
    if nos:
        for c, r in ((a, r0 + 1.2), (b, r1 + 1.2)):
            q.peca(m_elipse(c, r, r * 0.9), mat, tons(n_esfera(c + (-0.6, -0.6), r, r), mat, base=0.04), z + 0.01, g)
    return g


def quadro(t: dict) -> np.ndarray:
    k = t.get
    q = Quadro()
    dx, dy = k('x', 0), k('y', 0)
    bob = k('bob', 0)
    inc = k('inclina', 0)
    cai = k('desaba', 0.0)           # 0 de pé, 1 virou um monte de ossos

    cab = P(dx + inc * 1.6 + cai * 12, 46 + dy + bob + cai * 40)
    tor = P(dx + 1 + inc * 0.7 + cai * 4, 70 + dy + bob * 0.6 + cai * 22)
    pelve = P(dx + 1 + inc * 0.3 + cai * 2, 84 + dy + bob * 0.3 + cai * 8)

    # ================= braço da espada (o de trás, à direita)
    omb_t = tor + (9, -6)
    mao = omb_t + np.array(k('mao', (4, 14)))
    cot = (omb_t + mao) / 2 + np.array(k('cotovelo', (3, 0)))
    ang = k('espada', -1.35)
    d = np.array([math.cos(ang), math.sin(ang)])
    n = np.array([-d[1], d[0]])
    ze = k('espada_z', 1.0)
    ge = q.novo_grupo()
    guarda = mao + d * 3
    ponta = guarda + d * 21
    lamina = m_poli([guarda + n * 2.2, guarda - n * 2.2, ponta - d * 5 - n * 2.0, ponta, ponta - d * 5 + n * 2.0])
    lado_luz = ((XX - guarda[0]) * n[0] + (YY - guarda[1]) * n[1]) < 0
    q.peca(lamina, 'placa', np.where(lado_luz, 4, 2).astype(np.int16), ze, ge)
    q.peca(m_capsula(guarda + d * 1, guarda + d * 14, 0.5) & lamina, 'placa', cheio(1), ze + 0.01, ge, enfeite=True)
    q.peca(m_capsula(guarda - n * 1.8, ponta - d * 5 - n * 1.6, 0.5) & lamina, 'placa', cheio(5), ze + 0.01, ge, enfeite=True)
    for f, dn in ((0.3, 1.0), (0.55, -0.6), (0.75, 0.8)):   # manchas de ferrugem
        c = guarda + d * 21 * f + n * dn
        q.peca((ponto(*c) | ponto(*(c + d))) & lamina, 'ferrugem', cheio(3), ze + 0.02, ge, enfeite=True)
    q.peca(m_capsula(guarda - n * 5, guarda + n * 5, 1.3), 'osso', tons(n_capsula(guarda - n * 5, guarda + n * 5, 1.4), 'osso'), ze + 0.03, ge)
    pomo = mao - d * 5
    q.peca(m_capsula(pomo, guarda, 1.4), 'pano', np.where((((XX - pomo[0]) * d[0] + (YY - pomo[1]) * d[1]).astype(int) % 2) == 0, 3, 2).astype(np.int16), ze + 0.02, ge)
    q.peca(m_elipse(pomo, 2.2, 2.2), 'osso', tons(n_esfera(pomo + (-0.6, -0.6), 2.2, 2.2), 'osso'), ze + 0.04, ge)
    zb = ze + 0.1
    osso(q, omb_t, cot, 1.5, 1.4, zb, 'osso_t')
    osso(q, cot, mao, 1.3, 1.2, zb + 0.02, 'osso_t', nos=False)
    # a mão: cinco metacarpos e dedos fechados no punho
    gm = q.novo_grupo()
    q.peca(m_elipse(mao, 3.4, 3.0), 'osso_t', tons(n_esfera(mao + (-1, -1), 3.6, 3.2), 'osso_t'), zb + 0.05, gm)
    for i in range(4):
        c = mao + d * (-1.8 + i * 1.2) + n * 2.6
        q.peca(m_elipse(c, 0.9, 0.9), 'osso_t', cheio(4), zb + 0.06, gm, enfeite=True)
        q.peca(ponto(*(c + n * 0.9)), 'oco', cheio(1), zb + 0.061, gm, enfeite=True)

    # ================= pernas: fêmur com placa e parafusos, tíbia e pé
    for lado, z0 in ((1, 1.6), (-1, 3.6)):
        mat = 'osso' if lado < 0 else 'osso_t'
        quad = pelve + (lado * 4.5, 2)
        pe = P(dx + 1 + lado * 6 + cai * lado * 5, PE + dy) + np.array(k('pe_f' if lado < 0 else 'pe_t', (0, 0)))
        joelho = (quad + pe) / 2 + np.array([-2 + cai * lado * 8, -cai * 4])
        g = osso(q, quad, joelho, 1.7, 1.6, z0, mat)
        if lado < 0:   # placa de osteossíntese na lateral do fêmur
            a_, b_ = quad + (joelho - quad) * 0.22, quad + (joelho - quad) * 0.8
            q.peca(m_capsula(a_, b_, 1.6), 'placa', tons(n_capsula(a_, b_, 1.8), 'placa', metal=True), z0 + 0.03, g)
            for f in (0.12, 0.5, 0.88):
                c = a_ + (b_ - a_) * f
                q.peca(m_elipse(c, 0.8, 0.8), 'placa', cheio(5), z0 + 0.035, g, enfeite=True)
        osso(q, joelho, pe + (0, -2.5), 1.5, 1.3, z0 + 0.02, mat, grupo=g)
        q.peca(m_elipse(joelho + (-0.8, 0), 2.6, 2.3), mat, tons(n_esfera(joelho + (-1.5, -1), 2.6, 2.3), mat, base=0.06), z0 + 0.04, g)
        pe_m = m_poli([pe + (-7, -0.5), pe + (-5, -3.5), pe + (2, -4), pe + (3, 0.5), pe + (-7, 0.5)])
        q.peca(pe_m, mat, tons(n_esfera(pe + (-2, -2), 6, 4, 0.7), mat), z0 + 0.05, g)
        for i in range(3):
            q.peca(ponto(pe[0] - 6 + i * 2.2, pe[1] - 0.6), 'oco', cheio(2), z0 + 0.06, g, enfeite=True)

    # ================= pelve e coluna
    gp = q.novo_grupo()
    asa = m_elipse(pelve + (-4, -1), 5.5, 3.6) | m_elipse(pelve + (4, -1), 5.5, 3.6)
    q.peca(asa, 'osso', tons(n_esfera(pelve + (-2, -3), 9, 5, 0.75), 'osso'), 3.0, gp)
    q.peca(m_elipse(pelve + (0, 0.6), 2.0, 1.8), 'oco', cheio(1), 3.01, gp, enfeite=True)
    # pano esfarrapado preso na cintura
    gt = q.novo_grupo()
    tanga = m_poli([pelve + (-8, -3.5), pelve + (8, -3.5), pelve + (7, 3), pelve + (4, 7), pelve + (1, 4), pelve + (-2, 8.5), pelve + (-5, 4.5), pelve + (-8, 6)])
    q.peca(tanga, 'pano', tons(n_esfera(pelve + (-3, -1), 11, 8, 0.7), 'pano', pano=True), 3.2, gt)
    q.peca(tanga & (np.abs(XX - (pelve[0] + 2)) < 0.5) & (YY > pelve[1]), 'pano', cheio(0), 3.21, gt, enfeite=True)
    q.peca(m_capsula(pelve + (-8.5, -3.5), pelve + (8.5, -3.5), 1.2), 'ferrugem', cheio(3), 3.25, gt)
    gv = q.novo_grupo()
    for i in range(5):
        c = tor + (0.3 * i, -2 + i * 2.6)
        q.peca(m_elipse(c, 2.0, 1.2), 'osso', tons(n_esfera(c + (-0.5, -0.5), 2.0, 1.4), 'osso'), 2.6, gv)

    # ================= caixa torácica: esterno e costelas em arco
    gr = q.novo_grupo()
    est = tor + (-1.5, -6)
    q.peca(m_capsula(est, est + (0.5, 7.5), 1.3, 1.0), 'osso', tons(n_capsula(est, est + (0.5, 7.5), 1.4), 'osso', base=0.05), 3.6, gr)
    for i in range(4):
        y0 = tor[1] - 7 + i * 3.2
        w = 9.5 - abs(i - 1.2) * 0.9
        for lado in (-1, 1):
            mat = 'osso' if lado < 0 else 'osso_t'
            pts = bezier((tor[0] + 0.5, y0 - 1), (tor[0] + lado * (w + 2), y0 - 1.5), (tor[0] + lado * (w - 1.5), y0 + 3.2), 8)
            pts = [np.array(p) for p in pts] + [np.array([est[0] + lado * 0.5, y0 + 2.2])]
            q.peca(m_curva(pts, 1.8, 1.2), mat, tons(n_esfera(tor + (-3, -4), 13, 11, 0.7), mat), 3.5 + (0.02 if lado < 0 else -0.6), gr)
    # clavículas
    q.peca(m_capsula(tor + (-10, -9), tor + (9, -9.5), 1.2), 'osso', tons(n_capsula(tor + (-10, -9), tor + (9, -9.5), 1.3), 'osso'), 3.65, gr)
    # pescoço
    q.peca(m_capsula(tor + (0, -10), cab + (2, 9), 1.6), 'osso_t', cheio(3), 3.4, gr)

    # ================= crânio grande, mandíbula solta
    cx, cy = cab
    gh = q.novo_grupo()
    abre = k('boca', 0.0)
    cranio = m_elipse((cx, cy - 2), 13, 11.5) | m_elipse((cx - 3, cy + 4), 9.5, 6.5)
    q.peca(cranio, 'osso', tons(n_esfera((cx - 4, cy - 6), 14, 13, 0.8), 'osso', base=0.06), 8.0, gh)
    # rachadura na calota (a fratura antiga)
    trinca = m_curva([(cx + 2, cy - 13), (cx + 4, cy - 9), (cx + 3, cy - 7), (cx + 6, cy - 5)], 0.9, 0.7) & cranio
    q.peca(trinca, 'osso', cheio(1), 8.05, gh, enfeite=True)
    fx = cx - 3.5
    olhos = []
    for ox, rx_, ry_ in ((fx - 5, 3.0, 3.4), (fx + 4.5, 3.8, 3.8)):
        orb = m_elipse((ox, cy + 0.5), rx_, ry_)
        q.peca(orb & cranio, 'oco', cheio(0), 8.2, gh, enfeite=True)
        q.peca(orb & desloca(~orb, 1, 0) & cranio, 'oco', cheio(2), 8.21, gh, enfeite=True)
        olhos.append((ox - 0.6, cy + 1.2, rx_))
    # buraco do nariz
    q.peca(m_poli([(fx - 0.5, cy + 4), (fx + 1.5, cy + 7), (fx - 2.5, cy + 7)]) & cranio, 'oco', cheio(0), 8.22, gh, enfeite=True)
    # dentes de cima
    for i in range(5):
        xd = fx - 6 + i * 2.6
        q.peca(m_poli([(xd, cy + 8.5), (xd + 2, cy + 8.5), (xd + 1.8, cy + 10.5), (xd + 0.2, cy + 10.5)]) & cranio, 'osso', cheio(6), 8.25, gh, enfeite=True)
        q.peca(ponto(xd + 2.2, cy + 9.5) & cranio, 'oco', cheio(1), 8.26, gh, enfeite=True)
    # mandíbula
    gj = q.novo_grupo()
    jy = cy + 11 + abre * 3.5
    mand = m_poli([(fx - 8, jy - 1), (fx + 6, jy - 1.5), (cx + 7, jy - 4 - abre), (cx + 8, jy - 1), (fx + 5, jy + 3), (fx - 6, jy + 3.2)])
    q.peca(mand, 'osso', tons(n_esfera((fx - 2, jy - 1), 10, 5, 0.7), 'osso', base=0.02), 8.1, gj)
    for i in range(5):
        xd = fx - 6 + i * 2.6
        q.peca(m_poli([(xd + 0.2, jy - 1), (xd + 1.8, jy - 1), (xd + 2, jy + 0.6), (xd, jy + 0.6)]) & mand, 'osso', cheio(6), 8.12, gj, enfeite=True)
        q.peca(ponto(xd + 2.1, jy) & mand, 'oco', cheio(1), 8.13, gj, enfeite=True)

    # ================= escudo redondo de madeira, no braço da frente
    omb = tor + (-9, -6)
    mao_e = omb + np.array(k('mao_e', (-4, 11)))
    osso(q, omb, (omb + mao_e) / 2 + (-1.5, 0), 1.5, 1.4, 9.0)
    osso(q, (omb + mao_e) / 2 + (-1.5, 0), mao_e, 1.3, 1.2, 9.02, nos=False)
    ec = mao_e + np.array([-3, 0]) + np.array(k('escudo', (0, 0)))
    gs = q.novo_grupo()
    R = 11.5
    disco = m_elipse(ec, R * 0.82, R)
    Ns = n_esfera(ec + (-3, -4), R * 1.2, R * 1.4, 0.55)
    tabua = ((YY - ec[1] + 30) // 4.5 % 2 == 0).astype(np.int16)
    q.peca(disco, 'madeira', tons(Ns, 'madeira') - tabua, 9.3, gs)
    aro = disco & ~m_elipse(ec, R * 0.82 - 1.8, R - 1.8)
    q.peca(aro, 'ferrugem', tons(Ns, 'ferrugem', metal=True), 9.35, gs, enfeite=True)
    q.peca(m_elipse(ec + (-0.5, -0.5), 3.2, 3.6), 'ferrugem', tons(n_esfera(ec + (-1.5, -1.5), 3.2, 3.6), 'ferrugem', metal=True, base=0.06), 9.4, gs)
    for a in np.linspace(0, 2 * math.pi, 9)[:-1]:
        c = ec + np.array([math.cos(a) * (R * 0.82 - 0.9), math.sin(a) * (R - 0.9)])
        q.peca(ponto(*c), 'ferrugem', cheio(6), 9.36, gs, enfeite=True)
    # marcas de golpes na madeira
    for (vx, vy) in ((-4, 4), (3, -6), (4, 5)):
        q.escurece((ponto(ec[0] + vx, ec[1] + vy) | ponto(ec[0] + vx + 1, ec[1] + vy + 1) | ponto(ec[0] + vx + 2, ec[1] + vy + 1)) & disco, 2)

    # ================= montar e efeitos
    rgba = q.final()
    brilho = k('olhos', 1.0)
    rg = cc.RAMPAS['brasa']
    for (ox, oy, rx_) in olhos:
        if brilho <= 0:
            continue
        mistura(rgba, m_elipse((ox, oy), rx_ + 2, rx_ + 2) & (rgba[..., 3] > 0), rg[2], min(1.0, 0.12 * brilho))
        mistura(rgba, m_elipse((ox, oy), 1.4, 1.6), rg[2], min(1.0, 0.85 * brilho))
        mistura(rgba, ponto(ox - 0.4, oy - 0.6), rg[4], min(1.0, brilho))
    if k('rastro'):
        a0, a1, raio = k('rastro')
        cen = omb_t + (0, 2)
        ang_p = np.arctan2(YY - cen[1], XX - cen[0])
        rr = np.hypot(XX - cen[0], YY - cen[1])
        lo, hi = min(a0, a1), max(a0, a1)
        if lo < -math.pi:
            ang_p = np.where(ang_p > 0, ang_p - 2 * math.pi, ang_p)
        arco = (rr > raio - 8) & (rr < raio + 2) & (ang_p > lo) & (ang_p < hi)
        prog = np.clip((hi - ang_p) / max(hi - lo, 1e-3), 0, 1)
        espessura = rr > raio - 1 - 7 * prog
        mistura(rgba, arco & espessura, (150, 230, 220), 0.3)
        mistura(rgba, arco & espessura & (prog > 0.5), (220, 255, 245), 0.6)
        mistura(rgba, arco & (rr > raio - 1.2) & (prog > 0.2), (255, 255, 255), 0.95)
    for (fx_, fy_) in (k('faiscas') or []):
        estrela(rgba, ec + (fx_, fy_), 2, (255, 230, 170), 1.0)
    for (fx_, fy_, tm) in (k('cintilas') or []):
        estrela(rgba, (fx_, fy_), tm, (170, 255, 240), 1.0)
    for (fx_, fy_) in (k('poeira') or []):
        mistura(rgba, m_elipse((fx_, fy_), 3.5, 1.6) & (rgba[..., 3] == 0), (170, 156, 128), 0.55)
    return rgba


def poses():
    a = {}
    a['parado'] = [
        {'bob': 0, 'boca': 0},
        {'bob': 0.5, 'boca': 0.1, 'espada': -1.33},
        {'bob': 1, 'boca': 0.3, 'espada': -1.3, 'olhos': 0.55},
        {'bob': 0.5, 'boca': 0.1, 'espada': -1.33},
    ]
    a['preparo'] = [{'mao': (suave(4, 4, f), suave(14, -6, f)), 'espada': suave(-1.35, -0.25, f), 'cotovelo': (suave(3, 5, f), suave(0, 2, f)),
                     'inclina': 1.5 * f, 'boca': 0.6 * f, 'olhos': 1.0 + 0.5 * f, 'mao_e': (-5, 9)} for f in (0.35, 0.7, 1.0)]
    g = []
    for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.6)):
        s = min(1.0, f / 0.6)
        g.append({'mao': (suave(4, -16, s), suave(-6, 2, s)), 'espada': suave(-0.25, 2.45, s), 'cotovelo': (suave(5, -2, s), suave(2, -3, s)),
                  'x': -8 * s, 'inclina': suave(1.5, -3, s), 'pe_f': (-4 * s, 0), 'boca': 1.0, 'olhos': 1.6, 'mao_e': (suave(-5, 5, s), suave(9, 15, s)),
                  'espada_z': 9.6 if s > 0.3 else 1.0, 'rastro': (-1.0, 2.7 - 2 * math.pi, 26) if i in (2, 3) else None,
                  'poeira': [(X0 - 22, PE - 1)] if i in (3, 4) else None})
    a['golpe'] = g
    a['dano'] = [{'x': 4 * f, 'inclina': 2.5 * f, 'boca': 0.8 * f, 'olhos': 0.3 + (1 - f), 'escudo': (1 * f, -1 * f),
                  'faiscas': [(-6, -8), (-8, 2), (-3, 9)] if f == 1.0 else None} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'desaba': f, 'boca': 0.7 + 0.3 * f, 'olhos': max(0.0, 1 - 1.4 * f), 'mao': (4 + 10 * f, 14 + 6 * f), 'espada': -1.35 + 1.6 * f,
                     'mao_e': (-4 - 6 * f, 11 + 3 * f), 'poeira': [(X0 - 10, PE - 1), (X0 + 14, PE - 1)] if f > 0.6 else None}
                    for f in (0.15, 0.38, 0.62, 0.85, 1.0)]
    v = []
    for f, cint in ((0.5, None), (1.0, [(X0 + 18, 26, 2)]), (0.8, [(X0 + 20, 22, 3), (X0 - 22, 30, 2)]), (0.3, [(X0 - 18, 24, 2)])):
        v.append({'mao': (suave(4, 6, f), suave(14, -14, f)), 'espada': suave(-1.35, -1.6, f), 'cotovelo': (4, 0), 'boca': 0.4 + 0.6 * (f > 0.7),
                  'olhos': 1.4, 'bob': -1.5 * f, 'cintilas': cint})
    a['vitoria'] = v
    return a


TEMPOS = {'parado': 260, 'preparo': 95, 'golpe': 70, 'dano': 90, 'derrota': 130, 'vitoria': 150}


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
    _, meta = gravar_folha('esqueleto', quadros, TEMPOS, DESTINO, ANCORA)
    print('gravado esqueleto', meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
