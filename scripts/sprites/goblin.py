#!/usr/bin/env python3
"""Goblin da Fratura em pixel art chibi (14/10/2026).

Referência do Tales: o goblin minimalista de verde-limão chapado, olhos semicerrados, orelhas
pontudas, tanga marrom e porrete com cravos (docs/flashcards/MONSTROS-NOVOS.md, ref. 3), com o
carisma do cavaleiro chibi. O toque ortopédico: os cravos do porrete são parafusos de osso, a
testa tem uma faixa de gesso e o braço de trás, uma tala.

Usa as ferramentas do cavaleiro chibi (máscaras, normais, rampas com desvio de matiz, contorno
seletivo e luz de recorte), com rampas próprias. Olha para a esquerda (para o herói).

    python3 scripts/sprites/goblin.py                    # grava goblin em public/flashcards/sprites/
    python3 scripts/sprites/goblin.py --previa x.png     # prévia ampliada (--anim golpe, --escala 5)
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

# rampas do goblin, somadas às do cavaleiro (as funções de cc leem estes nomes na hora)
NOVAS = {
    'pele': ['#0e2a12', '#1d4a17', '#33701c', '#52981f', '#7cbf26', '#a6dc3a', '#cdf06a', '#f0ffb0'],
    'pele_t': ['#0b2010', '#173c16', '#285c1b', '#40801e', '#62a424', '#88c632'],
    'orelha': ['#3a1a22', '#6a2e32', '#9c4a40', '#c87058'],
    'olho_g': ['#3a2600', '#8a5a00', '#e0a81a', '#ffe14a', '#fff8c0'],
    'boca': ['#14060a', '#2c0e14', '#4a1820', '#6e2a2a'],
    'dente': ['#6a5c46', '#a8987a', '#e2d8bc', '#fffbea'],
    'gesso': ['#5c5a58', '#8e8a84', '#bdb8ae', '#e2ddd2', '#f7f4ec', '#ffffff'],
    'corda': ['#2a1a0a', '#55361a', '#86592c', '#b4864a', '#d8b070'],
    'parafuso': ['#1a1e26', '#353c49', '#59637a', '#8793aa', '#bcc6d6', '#eef3fa'],
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
W, H = 168, 116
X0, PE = 88, 101
ANCORA = (X0, PE)
cc.W, cc.H = W, H
cc.YY, cc.XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
cc.DITHER = cc.BAYER[(cc.YY.astype(int)) % 2, (cc.XX.astype(int)) % 2]
XX, YY = cc.XX, cc.YY

DESTINO = cc.DESTINO


def P(dx, y):
    return np.array([X0 + dx, y], float)


def quadro(t: dict) -> np.ndarray:
    k = t.get
    q = Quadro()
    dx, dy = k('x', 0), k('y', 0)
    bob = k('bob', 0)
    inc = k('inclina', 0)          # <0 inclina para a frente (esquerda)
    achata = k('achata', 0)        # agacha antes do pulo

    cab = P(dx + inc * 1.6, 52 + dy + bob + achata * 2)
    tor = P(dx + 2 + inc * 0.6, 80 + dy + bob * 0.6 + achata)

    # ================= orelha de trás (direita), atrás de tudo
    ob = k('orelha', 0)
    def orelha(base, lado, z, mat):
        pon = base + np.array([lado * 22, -9 - ob * 2.5])
        meio = base + np.array([lado * 12, -6 - ob])
        pts = [base + (0, -5), meio + (lado * 1, -3.5), pon, meio + (lado * 2, 3.2), base + (0, 5)]
        m = m_poli(pts)
        g = q.novo_grupo()
        q.peca(m, mat, tons(n_esfera(base + (lado * 8, -4), 16, 9, 0.7), mat, base=0.02 if mat == 'pele' else 0), z, g)
        dentro = m_poli([base + (lado * 3, -2.5), meio + (lado * 1, -1.2), pon - np.array([lado * 4, -1.0]), meio + (lado * 1, 1.6), base + (lado * 3, 2.5)]) & m
        q.peca(dentro, 'orelha', tons(n_esfera(base + (lado * 9, -1), 12, 5, 0.6), 'orelha'), z + 0.01, g, enfeite=True)
        # pequeno talho na orelha (briga antiga)
        q.peca(m_poli([pon - np.array([lado * 7, 2.6]), pon - np.array([lado * 5.2, 2.6]), pon - np.array([lado * 6, 0.4])]) & m, 'pele', cheio(0), z + 0.02, g, enfeite=True)

    orelha(cab + (13, -1), 1, 1.0, 'pele_t')

    # ================= braço de trás (com tala de gesso)
    omb_t = tor + (8, -8)
    mao_t = omb_t + np.array(k('mao_t', (5, 12)))
    gb = q.novo_grupo()
    q.peca(m_capsula(omb_t, mao_t, 3.0, 2.6), 'pele_t', tons(n_capsula(omb_t, mao_t, 3.0, 2.6), 'pele_t'), 1.5, gb)
    tala_a, tala_b = omb_t + (mao_t - omb_t) * 0.35, omb_t + (mao_t - omb_t) * 0.85
    q.peca(m_capsula(tala_a, tala_b, 3.6), 'gesso', tons(n_capsula(tala_a, tala_b, 3.6), 'gesso', pano=True, base=-0.05), 1.55, gb)
    d_ = (tala_b - tala_a) / max(np.linalg.norm(tala_b - tala_a), 1e-3)
    for f in (0.3, 0.65):
        c = tala_a + (tala_b - tala_a) * f
        n_ = np.array([-d_[1], d_[0]])
        q.peca(m_capsula(c - n_ * 4, c + n_ * 4, 0.5) & m_capsula(tala_a, tala_b, 3.6), 'gesso', cheio(1), 1.56, gb, enfeite=True)
    q.peca(m_elipse(mao_t, 3.2, 3.0), 'pele_t', tons(n_esfera(mao_t + (-1, -1), 3.4, 3.2), 'pele_t'), 1.6, gb)

    # ================= pernas curtas e pés grandes
    for lado, z0 in ((1, 1.8), (-1, 3.7)):
        mat = 'pele' if lado < 0 else 'pele_t'
        q0 = tor + (lado * 5, 8)
        pe = P(dx + 2 + lado * 6, PE + dy) + np.array(k('pe_f' if lado < 0 else 'pe_t', (0, 0)))
        joelho = (q0 + pe) / 2 + (-1.5, 0)
        g = q.novo_grupo()
        q.peca(m_capsula(q0, joelho, 3.8, 3.2), mat, tons(n_capsula(q0, joelho, 3.8, 3.2), mat), z0, g)
        q.peca(m_capsula(joelho, pe + (0, -3), 3.2, 2.8), mat, tons(n_capsula(joelho, pe + (0, -3), 3.2, 2.8), mat), z0 + 0.01, g)
        pe_m = m_poli([pe + (-9, -1), pe + (-7, -5), pe + (2, -5.5), pe + (4.5, -2), pe + (4, 0.5), pe + (-9.5, 0.5)])
        q.peca(pe_m, mat, tons(n_esfera(pe + (-2, -2), 9, 5, 0.75), mat), z0 + 0.02, g)
        for i in range(3):   # dedos
            xd = pe[0] - 8.5 + i * 3
            q.peca(ponto(xd + 2.2, pe[1] - 1) | ponto(xd + 2.2, pe[1]), mat, cheio(1), z0 + 0.03, g, enfeite=True)
            q.peca(ponto(xd + 0.5, pe[1] - 1.5), 'dente', cheio(2), z0 + 0.03, g, enfeite=True)

    # ================= tronco: barriguinha em pera
    g = q.novo_grupo()
    corpo = m_elipse(tor + (0, 1), 11.5, 11) | m_elipse(tor + (0, -6), 9, 7)
    q.peca(corpo, 'pele', tons(n_esfera(tor + (-3, -3), 13, 13, 0.85), 'pele', base=0.03), 3.0, g)
    q.peca(m_elipse(tor + (-3, 3), 4.6, 4.2) & corpo, 'pele', tons(n_esfera(tor + (-4, 2), 6, 6), 'pele', base=0.12), 3.01, g, enfeite=True)
    q.peca(ponto(tor[0] - 3, tor[1] + 3) | ponto(tor[0] - 2, tor[1] + 3), 'pele', cheio(1), 3.02, g, enfeite=True)   # umbigo
    # tanga de couro com cinto de corda
    gt = q.novo_grupo()
    tanga = m_poli([tor + (-12, 6), tor + (12, 6), tor + (11, 13), tor + (6, 16.5), tor + (2, 13.5), tor + (-3, 17.5), tor + (-8, 14), tor + (-12, 15)])
    q.peca(tanga, 'couro', tons(n_esfera(tor + (-3, 8), 14, 10, 0.7), 'couro', pano=True), 3.5, gt)
    q.peca(tanga & (np.abs(XX - (tor[0] + 2)) < 0.5) & (YY > tor[1] + 8), 'couro', cheio(1), 3.51, gt, enfeite=True)
    q.peca(tanga & (np.abs(XX - (tor[0] - 6)) < 0.5) & (YY > tor[1] + 9), 'couro', cheio(1), 3.51, gt, enfeite=True)
    corda = m_capsula(tor + (-12, 6.5), tor + (12, 6.5), 1.4)
    q.peca(corda, 'corda', np.where(((XX + YY).astype(int) % 3) == 0, 1, 3).astype(np.int16), 3.55, gt)
    q.peca(m_elipse(tor + (-6, 7), 2.0, 1.6), 'corda', cheio(3), 3.56, gt)          # nó
    q.peca(m_capsula(tor + (-6, 8), tor + (-7.5, 13), 0.7), 'corda', cheio(2), 3.56, gt)
    # bolsinha de moedas (o goblin foge com o ouro)
    bolsa_c = tor + (8, 10)
    q.peca(m_elipse(bolsa_c, 3.6, 3.4), 'couro', tons(n_esfera(bolsa_c + (-1, -1), 3.6, 3.4), 'couro', base=0.05), 3.6, gt)
    q.peca(ponto(bolsa_c[0] - 1, bolsa_c[1] - 3) | ponto(bolsa_c[0], bolsa_c[1] - 3), 'ouro', cheio(5), 3.61, gt, enfeite=True)

    # ================= cabeça grande (chibi): crânio largo, queixo pontudo
    cx, cy = cab
    gh = q.novo_grupo()
    cabeca = m_elipse((cx, cy - 1), 16, 13.5) | m_poli([(cx - 13, cy + 3), (cx + 12, cy + 3), (cx + 3, cy + 13), (cx - 5, cy + 13.5)])
    q.peca(cabeca, 'pele', tons(n_esfera((cx - 4, cy - 4), 17, 15, 0.8), 'pele', base=0.04), 8.0, gh)
    fx = cx - 4                                       # centro do rosto (3/4 para a esquerda)
    # sobrancelha pesada (sombra em cima dos olhos)
    testa = cabeca & (YY > cy - 3.5) & (YY < cy - 1.5) & (np.abs(XX - fx) < 12)
    q.escurece(testa, 1)
    # faixa de gesso na testa, na diagonal, com a pontinha solta
    fg = m_curva([(cx - 13, cy - 8), (cx - 2, cy - 10.5), (cx + 9, cy - 9), (cx + 15, cy - 6)], 3.4, 3.0) & m_elipse((cx, cy - 1), 16.5, 14)
    q.peca(fg, 'gesso', tons(n_esfera((cx - 4, cy - 10), 16, 6, 0.7), 'gesso', pano=True), 8.1, gh, enfeite=True)
    q.peca(fg & (np.abs(XX - (cx - 1)) < 0.5), 'gesso', cheio(1), 8.11, gh, enfeite=True)
    q.peca(fg & (np.abs(XX - (cx + 6)) < 0.5), 'gesso', cheio(1), 8.11, gh, enfeite=True)
    ponta = m_poli([(cx + 13, cy - 8), (cx + 19, cy - 13 - k('orelha', 0)), (cx + 20, cy - 10), (cx + 15, cy - 6)])
    q.peca(ponta, 'gesso', cheio(3), 7.9, gh)
    # tufo de cabelo espetado
    for i, (bx, ax, ay) in enumerate(((-4, -7, -10), (0, -1, -12), (4, 5, -10))):
        b0 = np.array([cx + bx, cy - 12])
        q.peca(m_poli([b0 + (-2, 1), b0 + (2, 1), b0 + (ax * 0.5, ay * 0.6)]), 'pele_t', cheio(1 + i % 2), 7.95, gh)
    # olhos semicerrados: esclera amarela, pálpebra pesada e pupila virada para o herói
    fechado = k('fechado', False)
    olhos = []
    for ox, rx_ in ((fx - 6.4, 2.9), (fx + 5.2, 3.7)):
        oy = cy + 1
        olho = m_elipse((ox, oy), rx_, 3.3)
        if fechado:
            q.peca(m_capsula((ox - rx_, oy - 0.5), (ox, oy + 1), 0.6) | m_capsula((ox, oy + 1), (ox + rx_, oy - 0.5), 0.6), 'boca', cheio(0), 8.3, gh, enfeite=True)
            continue
        q.peca(olho, 'olho_g', np.where(YY < oy, 3, 2).astype(np.int16), 8.2, gh, enfeite=True)
        corte = k('palpebra', 0.45)
        palp = olho & (YY < oy - 3.3 + 6.6 * corte)
        q.peca(palp, 'pele', cheio(3), 8.25, gh, enfeite=True)
        q.peca(olho & ~palp & desloca(palp, 1, 0), 'boca', cheio(0), 8.26, gh, enfeite=True)   # linha da pálpebra
        px = ox - rx_ * 0.35
        q.peca((ponto(px, oy) | ponto(px, oy + 1) | ponto(px + 1, oy + 1)) & olho & ~palp, 'boca', cheio(0), 8.27, gh, enfeite=True)
        olhos.append((px + 1, oy + 0.5))
    # nariz comprido e pontudo, para a esquerda
    nb = (fx + 0.5, cy + 3)
    nariz = m_poli([(nb[0] + 2.5, nb[1] - 3), (nb[0] - 7.5, nb[1] + 2.5), (nb[0] + 1.5, nb[1] + 3.5)])
    q.peca(nariz, 'pele', tons(n_plano(-0.35, -0.5), 'pele', base=0.1), 8.4, gh)
    q.peca(m_capsula((nb[0] - 6.5, nb[1] + 2.6), (nb[0] + 1.5, nb[1] + 3.6), 0.6) & ~nariz, 'pele', cheio(1), 8.39, gh, enfeite=True)
    q.peca(ponto(nb[0] - 1, nb[1] + 2), 'pele', cheio(1), 8.41, gh, enfeite=True)
    # sorriso largo de canto, com dentes tortos
    abre = k('boca', 0.0)
    m0, m1 = (fx - 9, cy + 7.5), (fx + 8, cy + 6.5)
    curva = bezier(m0, (fx - 1, cy + 11 + abre * 2), m1, 10)
    boca = m_curva(curva, 1.6 + abre * 2.2, 1.4 + abre * 1.2)
    q.peca(boca & cabeca, 'boca', np.where(YY > cy + 9, 1, 0).astype(np.int16), 8.3, gh, enfeite=True)
    if abre > 0.3:
        q.peca(m_elipse((fx - 1, cy + 10.5 + abre), 3.2, 1.2) & boca, 'boca', cheio(3), 8.31, gh, enfeite=True)   # língua
    for (tx, ty, cima) in ((fx - 5, cy + 8.2, True), (fx + 3, cy + 8.3, True), (fx - 1, cy + 10.6 + abre * 2, False)):
        dente = m_poli([(tx - 1.2, ty), (tx + 1.2, ty), (tx, ty + 2.4)]) if cima else m_poli([(tx - 1.1, ty), (tx + 1.1, ty), (tx, ty - 2.4)])
        q.peca(dente, 'dente', cheio(2 if cima else 3), 8.35, gh, enfeite=True)
    q.peca(ponto(m1[0] + 1, m1[1] - 1), 'pele', cheio(2), 8.31, gh, enfeite=True)   # covinha
    # bochecha corada
    mistura_boch = m_elipse((fx + 8, cy + 4), 2.6, 1.5) & cabeca

    # ================= orelha da frente (esquerda)
    orelha(cab + (-14, 0), -1, 8.5, 'pele')

    # ================= braço da frente e porrete de parafusos
    omb = tor + (-8, -7)
    mao = omb + np.array(k('mao', (-7, 11)))
    ang = k('porrete', -2.35)
    d = np.array([math.cos(ang), math.sin(ang)])
    n = np.array([-d[1], d[0]])
    frente = bool(k('porrete_frente', True))
    zp = 9.2 if frente else 2.4
    gp = q.novo_grupo()
    cabo0, cabo1 = mao - d * 4, mao + d * 26
    q.peca(m_capsula(cabo0, cabo1, 1.9, 5.2), 'madeira', tons(n_capsula(cabo0, cabo1, 2.0, 5.2), 'madeira'), zp, gp)
    veio = m_capsula(cabo0 + d * 8, cabo1 - d * 2, 0.45)
    q.peca(veio & m_capsula(cabo0, cabo1, 1.9, 5.2), 'madeira', cheio(1), zp + 0.01, gp, enfeite=True)
    q.peca(m_elipse(cabo0 + d * 18 + n * 1.5, 1.1, 1.1), 'madeira', cheio(0), zp + 0.01, gp, enfeite=True)   # nó da madeira
    # parafusos de osso cravados (cabeça sextavada e rosca)
    for f, lado in ((0.62, 1), (0.78, -1), (0.92, 1), (1.0, -0.2)):
        c = cabo0 + (cabo1 - cabo0) * f
        r = 2.0 + 3.2 * f
        sd = n * lado if lado != -0.2 else d
        base_p = c + sd * (r - 0.5)
        ponta = base_p + sd * 5.5
        rosca = m_capsula(base_p, ponta, 1.1, 0.4)
        q.peca(rosca, 'parafuso', tons(n_capsula(base_p, ponta, 1.1, 0.4), 'parafuso', metal=True), zp + 0.03, gp)
        for s in (0.3, 0.6):
            q.peca(ponto(*(base_p + sd * 5.5 * s)) & rosca, 'parafuso', cheio(1), zp + 0.035, gp, enfeite=True)
        q.peca(m_elipse(base_p, 1.6, 1.6), 'parafuso', cheio(4), zp + 0.04, gp)
    # faixa de couro na empunhadura
    q.peca(m_capsula(mao - d * 3, mao + d * 3, 2.3), 'couro', np.where(((XX * d[0] + YY * d[1]).astype(int) % 2) == 0, 3, 2).astype(np.int16), zp + 0.05, gp)
    # braço
    cot = (omb + mao) / 2 + np.array(k('cotovelo', (-2, 1)))
    ga = q.novo_grupo()
    zb = zp + 0.1 if frente else 8.9
    q.peca(m_capsula(omb, cot, 3.2, 2.8), 'pele', tons(n_capsula(omb, cot, 3.2, 2.8), 'pele'), zb, ga)
    q.peca(m_capsula(cot, mao, 2.8, 2.6), 'pele', tons(n_capsula(cot, mao, 2.8, 2.6), 'pele'), zb + 0.01, ga)
    q.peca(m_elipse(mao, 3.6, 3.3), 'pele', tons(n_esfera(mao + (-1, -1), 3.8, 3.5), 'pele', base=0.04), zb + 0.02, ga)
    q.peca(m_capsula(mao + n * 1.2 - d * 2, mao + n * 1.2 + d * 2, 0.4) & m_elipse(mao, 3.6, 3.3), 'pele', cheio(2), zb + 0.03, ga, enfeite=True)
    # pulseira de corda
    q.peca(m_capsula(cot + (mao - cot) * 0.7 - n * 3, cot + (mao - cot) * 0.7 + n * 3, 1.0), 'corda', cheio(3), zb + 0.025, ga, enfeite=True)

    # ================= montar e efeitos
    rgba = q.final()
    mistura(rgba, mistura_boch & (rgba[..., 3] > 0), (255, 120, 110), 0.28)
    if not fechado:
        for (ox, oy) in olhos:
            mistura(rgba, ponto(ox, oy - 0.5), (255, 255, 230), 0.9)
    if k('rastro'):
        a0, a1, raio = k('rastro')
        cen = omb + (2, 0)
        ang_p = np.arctan2(YY - cen[1], XX - cen[0])
        rr = np.hypot(XX - cen[0], YY - cen[1])
        lo, hi = min(a0, a1), max(a0, a1)
        if lo < -math.pi:            # o arco passa por cima da cabeça, de trás para a frente
            ang_p = np.where(ang_p > 0, ang_p - 2 * math.pi, ang_p)
        arco = (rr > raio - 9) & (rr < raio + 2) & (ang_p > lo) & (ang_p < hi)
        prog = np.clip((hi - ang_p) / max(hi - lo, 1e-3), 0, 1)
        espessura = rr > raio - 1 - 8 * prog
        mistura(rgba, arco & espessura, (210, 255, 150), 0.32)
        mistura(rgba, arco & espessura & (prog > 0.5), (240, 255, 210), 0.6)
        mistura(rgba, arco & (rr > raio - 1.2) & (prog > 0.2), (255, 255, 255), 0.95)
    for (fx_, fy_, tm) in (k('cintilas') or []):
        estrela(rgba, (fx_, fy_), tm, (255, 236, 150), 1.0)
    for (fx_, fy_) in (k('poeira') or []):
        mistura(rgba, m_elipse((fx_, fy_), 3, 1.6) & (rgba[..., 3] == 0), (200, 186, 150), 0.55)
    if k('estrelas_tonto'):
        fase = k('estrelas_tonto')
        for i in range(3):
            a = fase + i * 2.1
            estrela(rgba, (cx + math.cos(a) * 12, cy - 15 + math.sin(a) * 3), 2, (255, 240, 120), 1.0)
    out = rgba
    queda = k('queda', 0)
    if queda:
        im = Image.fromarray(out, 'RGBA').rotate(queda, resample=Image.NEAREST, center=(ANCORA[0], ANCORA[1] - 1),
                                                 translate=(k('queda_x', 0), k('queda_y', 0)))
        out = np.asarray(im).copy()
        linhas = np.where(out[..., 3].any(axis=1))[0]
        if len(linhas):   # deitado no chão: o ponto mais baixo encosta na linha dos pés
            out = desloca(out, int(PE + 1 - linhas.max()), 0)
    return out


def poses():
    a = {}
    a['parado'] = [
        {'bob': 0, 'orelha': 0},
        {'bob': 0.6, 'orelha': 0.5, 'mao': (-7, 11.5), 'porrete': -2.32},
        {'bob': 1, 'orelha': 1, 'mao': (-7, 12), 'porrete': -2.3, 'palpebra': 0.62},
        {'bob': 0.6, 'orelha': 0.5, 'mao': (-7, 11.5), 'porrete': -2.32},
    ]
    a['preparo'] = [{'mao': (suave(-7, 6, f), suave(11, -10, f)), 'porrete': suave(-2.35, -0.15, f), 'cotovelo': (suave(-2, 3, f), suave(1, -2, f)),
                     'inclina': 2 * f, 'achata': f, 'orelha': -1.5 * f, 'boca': 0.4 * f, 'palpebra': 0.3,
                     'porrete_frente': False} for f in (0.35, 0.7, 1.0)]
    g = []
    for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.6)):
        s = min(1.0, f / 0.6)
        g.append({'mao': (suave(6, -16, s), suave(-10, 8, s)), 'porrete': suave(-0.15, 2.55, s), 'cotovelo': (suave(3, -3, s), suave(-2, 2, s)),
                  'x': -9 * s, 'inclina': suave(2, -3.5, s), 'pe_f': (-5 * s, 0), 'orelha': suave(-1.5, 2.5, s), 'boca': 1.0, 'palpebra': 0.25,
                  'porrete_frente': s > 0.2, 'rastro': (-1.1, 2.55 - 2 * math.pi, 31) if i in (2, 3) else None,
                  'poeira': [(X0 - 20, PE - 1), (X0 - 30, PE - 2)] if i in (3, 4) else None})
    a['golpe'] = g
    a['dano'] = [{'x': 5 * f, 'inclina': 3 * f, 'orelha': -2.5 * f, 'fechado': f > 0.5, 'boca': 0.7 * f, 'mao': (-5, 11 - 2 * f), 'porrete': -2.5 - 0.3 * f}
                 for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'inclina': 2 * f, 'orelha': -2 * f, 'fechado': f > 0.3, 'boca': 0.6, 'mao': (-5 + 6 * f, 11 - 4 * f), 'porrete': -2.35 + 0.8 * f,
                     'queda': -84 * f, 'queda_x': -2 * f, 'queda_y': 0, 'estrelas_tonto': (f * 6) if f > 0.6 else None}
                    for f in (0.15, 0.4, 0.7, 0.92, 1.0)]
    v = []
    for f, cint in ((0.5, None), (1.0, [(X0 + 22, 24, 2)]), (0.7, [(X0 + 24, 20, 3), (X0 - 26, 30, 2)]), (0.2, [(X0 - 22, 26, 2)])):
        v.append({'y': -6 * f, 'mao': (suave(-7, -13, f), suave(11, -12, f)), 'porrete': suave(-2.35, -2.0, f), 'cotovelo': (-3, -1),
                  'orelha': 2.5 * f, 'boca': 1.0, 'palpebra': 0.2, 'mao_t': (6, suave(12, -6, f)), 'cintilas': cint})
    a['vitoria'] = v
    return a


TEMPOS = {'parado': 240, 'preparo': 95, 'golpe': 70, 'dano': 90, 'derrota': 140, 'vitoria': 150}


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
    _, meta = gravar_folha('goblin', quadros, TEMPOS, DESTINO, ANCORA)
    print('gravado goblin', meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
