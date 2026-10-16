#!/usr/bin/env python3
"""Cavaleiros inimigos em pixel art (15/10/2026): Cavaleiro da Tala, Sentinela da Fíbula e
Guardião da Artrodese.

Um corpo de cavaleiro adulto (mais alto e mais pesado que o nosso herói chibi), elmo fechado de
viseira em fenda com olhos acesos, pluma, capa, tabardo e ombreiras com friso de ouro. Cada um
tem arma e cor próprias, como no desenho antigo:

- base (Cavaleiro da Tala): tabardo vermelho, maça de flanges e talas de gesso enfaixadas no
  antebraço e na canela; escudo pipa vermelho;
- fibula (Sentinela da Fíbula): tabardo verde, lança longa e fina (a fíbula) e escudo pipa verde;
  o golpe é uma estocada;
- artrodese (Guardião da Artrodese): armadura de pedra cinzenta, tabardo roxo, joelhos travados
  por uma barra de ferro (a articulação fundida) e escudo-torre de pedra com cruz de ouro; o golpe
  é uma pancada de escudo seguida da maça.

Estilo das folhas novas (goblin, esqueleto, raptor): ferramentas do cavaleiro chibi, rampas com
desvio de matiz, contorno seletivo, luz do alto à esquerda. Olha para a esquerda (para o herói).
Fantasia, sem anatomia.

    python3 scripts/sprites/cavaleiro.py                         # grava as três folhas
    python3 scripts/sprites/cavaleiro.py --variante fibula       # só uma (base, fibula ou artrodese)
    python3 scripts/sprites/cavaleiro.py --previa x.png          # prévia (--anim parado,golpe --escala 4)
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

# 'aco' e 'vermelho' mantêm o nome para ganhar a luz de recorte fria do Quadro
BASE = {
    'aco': ['#14181f', '#252b36', '#3a4250', '#56606f', '#7a8596', '#a3aebd', '#cdd6e2', '#f0f4fa'],
    'aco_t': ['#101319', '#1c212b', '#2c333f', '#414a58', '#5b6575', '#7a8494'],
    'vermelho': ['#24060c', '#440c16', '#701520', '#9e2128', '#c83632', '#e85c42', '#ff9466'],
    'tab_t': ['#1a0509', '#300a10', '#4c1018', '#6a1820'],
    'pluma_c': ['#2a0608', '#560e10', '#8a1a18', '#bc3022', '#e65432', '#ff8a5a'],
    'olho_k': ['#3a0402', '#8a1206', '#e0401a', '#ffa050', '#fff0c8'],
}
VARIANTES = {
    'fibula': {
        'vermelho': ['#04160c', '#082a16', '#0e4422', '#16622e', '#22843c', '#3aa852', '#78d880'],
        'tab_t': ['#03100a', '#061c10', '#0a2c18', '#103e20'],
        'pluma_c': ['#06200e', '#0c3a18', '#165a24', '#228032', '#38a848', '#78d880'],
        'olho_k': ['#04302a', '#0a6a5a', '#20c0a0', '#7affe0', '#e8fff8'],
    },
    'artrodese': {
        'aco': ['#17161a', '#2a282e', '#424048', '#5e5b63', '#7f7b82', '#a29ea3', '#c6c2c4', '#e6e2e0'],
        'aco_t': ['#121115', '#201f24', '#323036', '#47444b', '#605c63', '#7b777c'],
        'vermelho': ['#14081e', '#261034', '#3c1a52', '#562872', '#723a94', '#9058b6', '#b88ad8'],
        'tab_t': ['#0e0616', '#1a0c28', '#28123c', '#381a50'],
        'pluma_c': ['#14081e', '#2c1240', '#4a1e68', '#6c2e90', '#9048b8', '#c08ae0'],
        'olho_k': ['#20063a', '#4a0e7a', '#9a3ae0', '#d8a0ff', '#f8eaff'],
    },
}
FIXAS = {
    'gesso': ['#4a463e', '#78736a', '#a6a094', '#cdc7ba', '#e9e5da', '#fbf9f2'],
    'ferro': ['#0e1014', '#1c2028', '#2e343e', '#464e5a', '#646e7c'],
    'oco': ['#05060a', '#0c0e14', '#16181f'],
}


def usar_paleta(variante: str | None):
    """Põe as rampas (base ou variante) nas ferramentas do cavaleiro chibi."""
    rampas = {**BASE, **(VARIANTES[variante] if variante else {}), **FIXAS}
    for k, v in rampas.items():
        cc.RAMPAS[k] = np.array([cc.hx(c) for c in v], np.uint8)
    cc.NOMES = list(cc.RAMPAS)
    cc.TOPO = np.array([len(cc.RAMPAS[n]) - 1 for n in cc.NOMES])
    cc.CONTORNO = {k: (np.array(v[0], float) * 0.6).astype(np.uint8) for k, v in cc.RAMPAS.items()}


usar_paleta(None)
VARIANTE: str | None = None

from cavaleiro_chibi import (  # noqa: E402
    Quadro, cheio, estrela, m_capsula, m_curva, m_elipse, m_poli, mistura, n_capsula, n_esfera, n_plano, ponto, suave, tons,
)

W, H = 168, 124
X0, PE = 86, 108
ANCORA = (X0, PE)
cc.W, cc.H = W, H
cc.YY, cc.XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
cc.DITHER = cc.BAYER[(cc.YY.astype(int)) % 2, (cc.XX.astype(int)) % 2]
XX, YY = cc.XX, cc.YY

DESTINO = cc.DESTINO


def P(dx, y):
    return np.array([X0 + dx, y], float)


def junta(a, b, l1, l2, lado):
    """Articulação entre a e b (dois segmentos), dobrando para um lado."""
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


def placa(q, a, b, r0, r1, z, mat='aco', grupo=None):
    """Segmento de armadura (capsula metálica)."""
    g = q.novo_grupo() if grupo is None else grupo
    q.peca(m_capsula(a, b, r0, r1), mat, tons(n_capsula(a, b, r0 + 0.4, r1 + 0.4), mat, metal=True, base=0.1), z, g)
    return g


def talas(q, a, b, r, z, g, n=2):
    """Faixas de gesso enroladas no segmento a-b (o Cavaleiro da Tala)."""
    d = (b - a) / max(np.linalg.norm(b - a), 1e-3)
    nn = np.array([-d[1], d[0]])
    for i in range(n):
        c = a + (b - a) * (0.3 + 0.4 * i / max(n - 1, 1))
        faixa = m_poli([c - nn * (r + 0.8) - d * 1.4, c + nn * (r + 0.8) - d * 0.6, c + nn * (r + 0.8) + d * 1.2, c - nn * (r + 0.8) + d * 0.4])
        q.peca(faixa, 'gesso', tons(n_capsula(a, b, r + 1.0), 'gesso', base=0.06), z, g)


def quadro(t: dict) -> np.ndarray:
    k = t.get
    v = VARIANTE
    q = Quadro()
    dx, dy = k('x', 0), k('y', 0)
    bob = k('bob', 0)
    inc = k('inclina', 0)              # <0 inclina para a frente (esquerda)
    aj = k('ajoelha', 0.0)             # derrota: 0 de pé, 1 de joelhos com a cabeça baixa

    quad = P(dx + 1 + inc * 0.3, 70 + dy + bob * 0.4 + aj * 16)
    tor = P(dx + 1 + inc * 0.8, 52 + dy + bob * 0.7 + aj * 18)
    cab = P(dx - 1 + inc * 1.8 + aj * -4, 31 + dy + bob + aj * 24)

    # ================= capa (atrás de tudo), cai até a canela
    gc = q.novo_grupo()
    onda = k('capa', 0.0)
    capa = m_poli([tor + (-8, -9), tor + (11, -9), quad + (17 + onda * 3, 26 - aj * 8), quad + (8, 30 - aj * 10), quad + (-2, 27 - aj * 10), quad + (-9, 24 - aj * 8)])
    q.peca(capa, 'tab_t', tons(n_esfera(tor + (2, 8), 22, 30, 0.6), 'tab_t', pano=True), 0.3, gc)
    for xs in (3, 9):   # dobras
        q.peca(capa & (np.abs(XX - (quad[0] + xs + (YY - quad[1]) * 0.25)) < 0.6) & (YY > tor[1]), 'tab_t', cheio(0), 0.31, gc, enfeite=True)

    # ================= braço de trás (arma), à direita
    omb_t = tor + (9, -6)
    mao = omb_t + np.array(k('mao', (5, 15)))
    cot = junta(omb_t, mao, 9, 9, 1)
    ang = k('arma', -1.4)
    d = np.array([math.cos(ang), math.sin(ang)])
    n = np.array([-d[1], d[0]])
    za = k('arma_z', 1.0)
    ga = q.novo_grupo()
    if v == 'fibula':
        # lança longa e fina: haste de madeira, ponta de aço em folha, flâmula verde
        cabo, ponta = mao - d * 16, mao + d * 44
        q.peca(m_capsula(cabo, ponta, 1.0), 'madeira', tons(n_capsula(cabo, ponta, 1.3), 'madeira'), za, ga)
        folha = m_poli([ponta - n * 2.6, ponta + d * 10, ponta + n * 2.6, ponta - d * 2])
        q.peca(folha, 'aco', np.where(((XX - ponta[0]) * n[0] + (YY - ponta[1]) * n[1]) < 0, 6, 4).astype(np.int16), za + 0.02, ga)
        q.peca(m_capsula(ponta - d * 3, ponta - d * 0.5, 1.6), 'ouro', cheio(4), za + 0.03, ga)
        fl = ponta - d * 6
        flamula = m_poli([fl, fl - d * 7, fl - d * 6 + n * 6 + d * 1.5 * k('vento', 0), fl - d * 2 + n * 4])
        q.peca(flamula, 'vermelho', tons(n_plano(-0.3, -0.4), 'vermelho', pano=True), za + 0.01, ga)
        q.peca(m_elipse(cabo, 1.6, 1.6), 'ferro', cheio(3), za + 0.02, ga)
    else:
        # maça de flanges: cabo de madeira, cabeça de ferro com seis lâminas e ponta
        cabo_a, cabo_b = mao - d * 4, mao + d * 15
        q.peca(m_capsula(cabo_a, cabo_b, 1.3), 'madeira', tons(n_capsula(cabo_a, cabo_b, 1.6), 'madeira'), za, ga)
        q.peca(m_capsula(mao + d * 3, mao + d * 7, 1.6), 'couro', cheio(3), za + 0.01, ga)
        cm = mao + d * 19
        for i in range(6):
            aa = ang + i * math.pi / 3 + 0.3
            u = np.array([math.cos(aa), math.sin(aa)])
            fl = m_poli([cm + u * 2 - d * 4, cm + u * 7.5 - d * 2.5, cm + u * 7.5 + d * 2.5, cm + u * 2 + d * 4])
            q.peca(fl, 'aco', tons(n_esfera(cm + (-2, -2), 8, 8, 0.8), 'aco', metal=True, base=0.1), za + 0.02, ga)
        q.peca(m_elipse(cm, 4.2, 4.2), 'ferro', tons(n_esfera(cm + (-1.5, -1.5), 4.6, 4.6), 'ferro'), za + 0.03, ga)
        q.peca(m_poli([cm + d * 4 - n * 1.5, cm + d * 8.5, cm + d * 4 + n * 1.5]), 'aco', cheio(5), za + 0.03, ga)
    zb = za + 0.1
    gb = q.novo_grupo()
    placa(q, omb_t, cot, 2.8, 2.5, zb, 'aco_t', gb)
    placa(q, cot, mao, 2.5, 2.2, zb + 0.02, 'aco_t', gb)
    if v is None:
        talas(q, cot, mao, 2.2, zb + 0.03, gb)
    q.peca(m_elipse(mao, 3.2, 3.0), 'ferro', tons(n_esfera(mao + (-1, -1), 3.4, 3.2), 'ferro'), zb + 0.05, gb)

    # ================= pernas: coxote, joelheira, grevas e escarpes
    for lado, z0 in ((1, 1.6), (-1, 3.6)):
        mat = 'aco' if lado < 0 else 'aco_t'
        anca = quad + (lado * 5, 0)
        pe = P(dx + 1 + lado * 7, PE + dy) + np.array(k('pe_f' if lado < 0 else 'pe_t', (0, 0)))
        if aj > 0:
            # de joelhos: o joelho da frente fica no chão, o pé de trás fica para trás
            pe = pe + np.array([lado * 5 * aj + (6 * aj if lado > 0 else -2 * aj), 0])
        joelho = junta(anca, pe + (0, -2), 17, 17, -1)
        if aj > 0.5 and lado < 0:
            joelho = np.array([joelho[0] - 6 * aj, min(joelho[1] + 8 * aj, PE + dy - 3)])
        g = placa(q, anca, joelho, 3.8, 3.2, z0, mat)
        placa(q, joelho, pe + (0, -3), 3.0, 2.6, z0 + 0.02, mat, g)
        if v is None and lado < 0:
            talas(q, joelho, pe + (0, -3), 2.6, z0 + 0.03, g)
        if v == 'artrodese':
            # a articulação fundida: barra de ferro presa da coxa à canela, com dois parafusos
            a_, b_ = anca + (joelho - anca) * 0.35 + (-3.5, 0), joelho + (pe - joelho) * 0.6 + (-3.5, 0)
            q.peca(m_capsula(a_, b_, 1.2), 'ferro', tons(n_capsula(a_, b_, 1.5), 'ferro'), z0 + 0.04, g)
            for c in (a_, b_):
                q.peca(m_elipse(c, 1.3, 1.3), 'ouro', cheio(4), z0 + 0.05, g, enfeite=True)
        q.peca(m_elipse(joelho + (-0.6, 0), 3.8, 3.4), mat, tons(n_esfera(joelho + (-1.6, -1.4), 3.8, 3.4), mat, metal=True, base=0.1), z0 + 0.06, g)
        q.peca(ponto(*(joelho + (-1.6, -1.2))), mat, cheio(7 if mat == 'aco' else 5), z0 + 0.07, g, enfeite=True)
        escarpe = m_poli([pe + (-9, 0.5), pe + (-8, -3), pe + (-3, -5), pe + (3, -5), pe + (4, 0.5)])
        q.peca(escarpe, mat, tons(n_esfera(pe + (-3, -4), 8, 5, 0.7), mat, metal=True, base=0.1), z0 + 0.05, g)

    # ================= tronco: peitoral, fraldão e tabardo
    gt = q.novo_grupo()
    peito = m_poli([tor + (-11, -10), tor + (11, -10), tor + (10, 6), quad + (8, -3), quad + (-8, -3), tor + (-10, 6)])
    q.peca(peito, 'aco', tons(n_esfera(tor + (-4, -6), 15, 18, 0.7), 'aco', metal=True, base=0.1), 4.0, gt)
    fraldao = m_poli([quad + (-10, -4), quad + (10, -4), quad + (12, 6), quad + (-12, 6)])
    q.peca(fraldao, 'aco_t', tons(n_esfera(quad + (-3, -2), 14, 9, 0.6), 'aco_t', metal=True, base=0.1), 4.05, gt)
    for i in range(2):
        q.peca(fraldao & (np.abs(YY - (quad[1] - 1 + i * 3.5)) < 0.5), 'aco_t', cheio(0), 4.06, gt, enfeite=True)
    tab = m_poli([tor + (-6, -8), tor + (6, -8), tor + (7, 4), quad + (7, 14 - aj * 4), quad + (1, 17 - aj * 4), quad + (-6, 14 - aj * 4), tor + (-7, 4)])
    q.peca(tab, 'vermelho', tons(n_esfera(tor + (-3, 0), 12, 26, 0.55), 'vermelho', pano=True), 4.2, gt)
    # emblema no tabardo: osso estilizado em ouro (base), ponta de lança (fíbula), cruz (artrodese)
    em = tor + (0, -1)
    if v == 'fibula':
        sim = m_poli([em + (0, -5), em + (3, 1), em + (0, 4), em + (-3, 1)])
    elif v == 'artrodese':
        sim = m_poli([em + (-1, -5), em + (1, -5), em + (1, 5), em + (-1, 5)]) | m_poli([em + (-4, -2), em + (4, -2), em + (4, 0), em + (-4, 0)])
    else:
        sim = m_capsula(em + (-2.5, -3.5), em + (2.5, 3.5), 0.9) | m_elipse(em + (-3, -3.6), 1.5, 1.5) | m_elipse(em + (-1.6, -4.4), 1.4, 1.4) \
            | m_elipse(em + (3, 3.6), 1.5, 1.5) | m_elipse(em + (1.6, 4.4), 1.4, 1.4)
    q.peca(sim & tab, 'ouro', tons(n_esfera(em + (-1, -2), 6, 6), 'ouro', metal=True, base=0.1), 4.25, gt, enfeite=True)
    # cinto com fivela
    cinto = m_poli([quad + (-10, -6), quad + (10, -6), quad + (10, -3), quad + (-10, -3)])
    q.peca(cinto, 'couro', tons(n_esfera(quad + (-3, -6), 12, 4, 0.5), 'couro'), 4.3, gt)
    q.peca(m_elipse(quad + (-1, -4.5), 2.2, 1.8), 'ouro', tons(n_esfera(quad + (-2, -5.5), 2.4, 2.0), 'ouro', metal=True, base=0.1), 4.31, gt)
    # gorjal
    q.peca(m_elipse(tor + (0, -10), 7.5, 3.2), 'aco_t', tons(n_esfera(tor + (-2, -12), 8, 4), 'aco_t', metal=True, base=0.1), 4.4, gt)

    # ================= ombreiras com friso de ouro
    for lado, z in ((1, 4.5), (-1, 9.2)):
        c = tor + (lado * 11, -7)
        go = q.novo_grupo()
        om = m_elipse(c, 7.5, 6) & (YY < c[1] + 3)
        q.peca(om, 'aco' if lado < 0 else 'aco_t', tons(n_esfera(c + (-2, -3), 8, 7), 'aco' if lado < 0 else 'aco_t', metal=True, base=0.1), z, go)
        friso = om & ~m_elipse(c + (0, -1), 6.2, 4.8)
        q.peca(friso & (YY > c[1] - 1), 'ouro', tons(n_esfera(c + (-2, -3), 8, 7), 'ouro', metal=True, base=0.1), z + 0.01, go, enfeite=True)
        q.peca(m_elipse(c + (0, 3), 7.0, 2.2) & (YY > c[1] + 2), 'aco_t', cheio(2), z - 0.01, go)

    # ================= elmo fechado: grande elmo com viseira em fenda e pluma
    cx, cy = cab
    gh = q.novo_grupo()
    elmo = m_elipse((cx, cy - 3), 9, 9) | m_poli([(cx - 9, cy - 3), (cx + 9, cy - 3), (cx + 8.5, cy + 9), (cx - 9.5, cy + 9)])
    q.peca(elmo, 'aco', tons(n_esfera((cx - 3, cy - 4), 11, 13, 0.75), 'aco', metal=True, base=0.1), 8.0, gh)
    # crista de reforço e frisos
    q.peca(elmo & (np.abs(XX - (cx - 2)) < 0.8) & (YY < cy - 3), 'aco', cheio(6), 8.02, gh, enfeite=True)
    q.peca(elmo & (np.abs(YY - (cy + 8)) < 0.7), 'ouro', cheio(3), 8.03, gh, enfeite=True)
    fenda = m_poli([(cx - 9.5, cy - 0.5), (cx + 5, cy - 0.5), (cx + 5, cy + 1.8), (cx - 9.5, cy + 1.8)])
    q.peca(fenda & elmo, 'oco', cheio(0), 8.1, gh, enfeite=True)
    q.peca(m_poli([(cx - 3, cy + 1.8), (cx - 1.6, cy + 1.8), (cx - 1.6, cy + 8.5), (cx - 3, cy + 8.5)]) & elmo, 'aco_t', cheio(1), 8.1, gh, enfeite=True)
    for i in range(3):   # respiros
        for j in range(2):
            q.peca(ponto(cx - 7.5 + j * 2, cy + 4 + i * 1.6) & elmo, 'oco', cheio(1), 8.11, gh, enfeite=True)
    olhos = [(cx - 6.5, cy + 0.6), (cx - 1.0, cy + 0.6)]
    # pluma: penas que saem do alto do elmo e caem para trás (direita)
    gp = q.novo_grupo()
    ven = k('pluma', 0.0)
    base_p = np.array([cx + 1, cy - 11])
    for i in range(5):
        pts = [base_p + (i * 0.8, 0), base_p + (5 + i * 1.6, -4 + i * 0.6), base_p + (11 + i * 1.8 + ven * 2, 1 + i * 1.6), base_p + (15 + i * 1.4 + ven * 3, 8 + i * 2.2)]
        q.peca(m_curva(pts, 3.6, 1.0), 'pluma_c', tons(n_esfera(base_p + (4, -2), 14, 12, 0.6), 'pluma_c', base=-0.05 * i), 7.6 + 0.01 * i, gp)
    q.peca(m_elipse(base_p + (0.5, 1), 2.2, 1.6), 'ouro', cheio(4), 8.05, gh)

    # ================= braço da frente e escudo
    omb = tor + (-11, -6)
    mao_e = omb + np.array(k('mao_e', (-3, 15)))
    cot_e = junta(omb, mao_e, 9, 9, -1)
    gbe = q.novo_grupo()
    placa(q, omb, cot_e, 2.9, 2.6, 9.0, 'aco', gbe)
    placa(q, cot_e, mao_e, 2.6, 2.3, 9.02, 'aco', gbe)
    ec = mao_e + np.array([-4, -1]) + np.array(k('escudo', (0, 0)))
    gs = q.novo_grupo()
    if v == 'artrodese':
        # escudo-torre de pedra: retângulo alto com cruz de ouro e cravos
        w2, h1, h2 = 9.5, 19, 15
        torre = m_poli([ec + (-w2, -h1 + 2), ec + (-w2 + 2, -h1), ec + (w2 - 2, -h1), ec + (w2, -h1 + 2), ec + (w2, h2), ec + (-w2, h2)])
        Ns = n_esfera(ec + (-4, -8), w2 * 2.2, h1 * 2.0, 0.5)
        blocos = (((YY - ec[1] + 40) // 6 % 2 == 0) & ((XX - ec[0] + 40) // 9 % 2 == 0)).astype(np.int16)
        q.peca(torre, 'aco', tons(Ns, 'aco') - blocos, 9.4, gs)
        q.peca(torre & ~(m_poli([ec + (-w2 + 1.6, -h1 + 3), ec + (w2 - 1.6, -h1 + 3), ec + (w2 - 1.6, h2 - 1.6), ec + (-w2 + 1.6, h2 - 1.6)])), 'aco_t', tons(Ns, 'aco_t', metal=True, base=0.1), 9.42, gs, enfeite=True)
        cruz = m_poli([ec + (-1.6, -h1 + 5), ec + (1.6, -h1 + 5), ec + (1.6, h2 - 4), ec + (-1.6, h2 - 4)]) | m_poli([ec + (-w2 + 3.5, -6), ec + (w2 - 3.5, -6), ec + (w2 - 3.5, -3), ec + (-w2 + 3.5, -3)])
        q.peca(cruz, 'ouro', tons(n_esfera(ec + (-3, -6), 10, 16, 0.6), 'ouro', metal=True, base=0.1), 9.45, gs)
        for c in ((-w2 + 2.2, -h1 + 4), (w2 - 2.2, -h1 + 4), (-w2 + 2.2, h2 - 2.5), (w2 - 2.2, h2 - 2.5)):
            q.peca(m_elipse(ec + c, 1.1, 1.1), 'ferro', cheio(4), 9.46, gs, enfeite=True)
    else:
        # escudo pipa na cor do tabardo, borda de aço e faixa de ouro
        R = 1.0
        pipa = m_poli([ec + (-8.5, -11), ec + (8.5, -11), ec + (8.5, 0), ec + (5, 8), ec + (0, 14), ec + (-5, 8), ec + (-8.5, 0)])
        Ns = n_esfera(ec + (-3, -5), 13 * R, 18 * R, 0.55)
        q.peca(pipa, 'vermelho', tons(Ns, 'vermelho'), 9.4, gs)
        borda = pipa & ~m_poli([ec + (-6.8, -9.4), ec + (6.8, -9.4), ec + (6.8, -0.4), ec + (3.8, 6.8), ec + (0, 11.8), ec + (-3.8, 6.8), ec + (-6.8, -0.4)])
        q.peca(borda, 'aco', tons(Ns, 'aco', metal=True, base=0.1), 9.42, gs, enfeite=True)
        faixa = pipa & (np.abs((XX - ec[0]) - (YY - ec[1]) * 0.0) < 1.6) & ~borda
        q.peca(faixa, 'ouro', tons(Ns, 'ouro', metal=True, base=0.1), 9.43, gs, enfeite=True)
        q.peca(m_elipse(ec + (0, -3), 2.6, 2.6), 'ouro', tons(n_esfera(ec + (-1, -4), 2.8, 2.8), 'ouro', metal=True, base=0.1), 9.44, gs)
        # marcas de golpes no escudo
        for (vx, vy) in ((-4, 3), (4, -6)):
            q.escurece((ponto(ec[0] + vx, ec[1] + vy) | ponto(ec[0] + vx + 1, ec[1] + vy + 1)) & pipa, 2)
    q.peca(m_elipse(mao_e, 3.0, 2.8), 'ferro', tons(n_esfera(mao_e + (-1, -1), 3.2, 3.0), 'ferro'), 9.1, gbe)

    # ================= montar e efeitos
    rgba = q.final()
    brilho = k('olhos', 1.0)
    rg = cc.RAMPAS['olho_k']
    for (ox, oy) in olhos:
        if brilho <= 0:
            continue
        mistura(rgba, m_elipse((ox, oy), 3.0, 2.0) & (rgba[..., 3] > 0), rg[2], min(1.0, 0.18 * brilho))
        mistura(rgba, m_elipse((ox, oy), 1.4, 0.8), rg[3], min(1.0, 0.95 * brilho))
        mistura(rgba, ponto(ox - 0.4, oy - 0.2), rg[4], min(1.0, brilho))
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
        cor = tuple(int(c) for c in cc.RAMPAS['olho_k'][3])
        mistura(rgba, arco & espessura, cor, 0.3)
        mistura(rgba, arco & espessura & (prog > 0.5), (255, 245, 230), 0.6)
        mistura(rgba, arco & (rr > raio - 1.2) & (prog > 0.2), (255, 255, 255), 0.95)
    if k('estocada'):
        # rastro reto da lança, da mão até além da ponta
        ini, fim = mao + d * 10, mao + d * 62
        linha = m_capsula(ini, fim, 1.2) & (rgba[..., 3] == 0)
        mistura(rgba, linha, (220, 255, 235), 0.7)
        mistura(rgba, m_capsula(ini + n * 3, fim - d * 12 + n * 3, 0.5) & (rgba[..., 3] == 0), (220, 255, 235), 0.45)
        mistura(rgba, m_capsula(ini - n * 3, fim - d * 12 - n * 3, 0.5) & (rgba[..., 3] == 0), (220, 255, 235), 0.45)
    for (fx_, fy_) in (k('faiscas') or []):
        estrela(rgba, ec + (fx_, fy_), 2, (255, 230, 170), 1.0)
    for (fx_, fy_, tm) in (k('cintilas') or []):
        estrela(rgba, (fx_, fy_), tm, (255, 236, 170), 1.0)
    for (fx_, fy_) in (k('poeira') or []):
        mistura(rgba, m_elipse((fx_, fy_), 4, 1.6) & (rgba[..., 3] == 0), (160, 150, 132), 0.55)
    return rgba


def poses():
    a = {}
    lanca = VARIANTE == 'fibula'
    torre = VARIANTE == 'artrodese'
    arma0 = -1.5 if lanca else -1.35
    a['parado'] = [
        {'bob': 0, 'arma': arma0},
        {'bob': 0.5, 'arma': arma0 + 0.02, 'capa': 0.3, 'pluma': 0.3},
        {'bob': 1, 'arma': arma0 + 0.04, 'capa': 0.6, 'pluma': 0.6, 'olhos': 0.6},
        {'bob': 0.5, 'arma': arma0 + 0.02, 'capa': 0.3, 'pluma': 0.3},
    ]
    if lanca:
        # recolhe a lança na altura do ombro, ponta para o herói
        a['preparo'] = [{'mao': (suave(5, 8, f), suave(15, 2, f)), 'arma': suave(-1.5, -2.95, f), 'inclina': 1.5 * f, 'x': 3 * f,
                         'olhos': 1 + 0.5 * f, 'capa': 0.5 * f} for f in (0.35, 0.7, 1.0)]
        g = []
        for i, f in enumerate((0.0, 0.35, 0.7, 1.0, 0.8, 0.5)):
            s = min(1.0, f / 0.7)
            g.append({'mao': (suave(8, -14, s), suave(2, 4, s)), 'arma': suave(-2.95, -3.08, s), 'x': suave(3, -14, s), 'inclina': suave(1.5, -3, s),
                      'pe_f': (-6 * s, 0), 'olhos': 1.6, 'capa': s, 'pluma': s, 'estocada': i in (2, 3), 'vento': 1,
                      'arma_z': 9.6 if s > 0.3 else 1.0, 'poeira': [(X0 - 20, PE - 1)] if i in (3, 4) else None})
        a['golpe'] = g
    else:
        a['preparo'] = [{'mao': (suave(5, 6, f), suave(15, -9, f)), 'arma': suave(-1.35, -0.3, f), 'inclina': 1.5 * f,
                         'olhos': 1 + 0.5 * f, 'capa': 0.5 * f, 'mao_e': (-3 - 3 * f * torre, 15 - 2 * f)} for f in (0.35, 0.7, 1.0)]
        g = []
        for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.6)):
            s = min(1.0, f / 0.6)
            g.append({'mao': (suave(6, -15, s), suave(-9, 4, s)), 'arma': suave(-0.3, 2.5, s), 'x': -9 * s, 'inclina': suave(1.5, -3, s),
                      'pe_f': (-4 * s, 0), 'olhos': 1.6, 'capa': s, 'pluma': s,
                      'mao_e': (suave(-3, -9, s), suave(15, 13, s)) if torre else (suave(-3, 4, s), suave(15, 19, s)),
                      'arma_z': 9.6 if s > 0.3 else 1.0, 'rastro': (-1.1, 2.7 - 2 * math.pi, 30) if i in (2, 3) else None,
                      'poeira': [(X0 - 22, PE - 1)] if i in (3, 4) else None})
        a['golpe'] = g
    a['dano'] = [{'x': 5 * f, 'inclina': 2.5 * f, 'olhos': 0.3 + (1 - f), 'escudo': (1 * f, -1 * f), 'arma': arma0 + 0.3 * f, 'capa': -0.4 * f,
                  'faiscas': [(-6, -8), (-8, 2), (-3, 9)] if f == 1.0 else None} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'ajoelha': f, 'olhos': max(0.0, 1 - 1.4 * f), 'mao': (5 + 6 * f, 15 + 4 * f), 'arma': arma0 + (1.4 if lanca else 1.7) * f,
                     'mao_e': (-3 - 4 * f, 15 + 2 * f), 'escudo': (-2 * f, 3 * f), 'inclina': -1.5 * f,
                     'poeira': [(X0 - 12, PE - 1), (X0 + 14, PE - 1)] if f > 0.6 else None} for f in (0.15, 0.38, 0.62, 0.85, 1.0)]
    v = []
    for f, cint in ((0.5, None), (1.0, [(X0 + 22, 18, 2)]), (0.8, [(X0 + 24, 12, 3), (X0 - 24, 22, 2)]), (0.3, [(X0 - 20, 16, 2)])):
        v.append({'mao': (suave(5, 6, f), suave(15, -13, f)), 'arma': suave(arma0, -1.6, f), 'olhos': 1.4, 'bob': -1.5 * f, 'pluma': f,
                  'capa': f * 0.6, 'cintilas': cint})
    a['vitoria'] = v
    return a


TEMPOS = {'parado': 260, 'preparo': 95, 'golpe': 70, 'dano': 90, 'derrota': 130, 'vitoria': 150}


def principal() -> int:
    global VARIANTE
    ap = argparse.ArgumentParser()
    ap.add_argument('--previa')
    ap.add_argument('--anim', default='parado')
    ap.add_argument('--escala', type=int, default=4)
    ap.add_argument('--fundo', default='#3a4048')
    ap.add_argument('--variante', help='base, fibula ou artrodese (sem ela, grava as três)')
    a = ap.parse_args()
    lista = [a.variante] if a.variante else ['base', 'fibula', 'artrodese']
    if a.previa:
        nomes = a.anim.split(',')
        cols = 6
        img = Image.new('RGBA', (W * cols, H * len(nomes) * len(lista)), cc.hx(a.fundo) + (255,))
        for vi, v in enumerate(lista):
            VARIANTE = None if v == 'base' else v
            usar_paleta(VARIANTE)
            P_ = poses()
            for nj, nm in enumerate(nomes):
                for ci, pz in enumerate(P_[nm]):
                    img.alpha_composite(Image.fromarray(quadro(pz), 'RGBA'), (ci * W, (vi * len(nomes) + nj) * H))
        img.resize((img.width * a.escala, img.height * a.escala), Image.NEAREST).save(a.previa)
        print('prévia:', a.previa)
        return 0
    for v in lista:
        VARIANTE = None if v == 'base' else v
        usar_paleta(VARIANTE)
        nome = 'cavaleiro' if VARIANTE is None else f'cavaleiro-{VARIANTE}'
        quadros = {anim: [quadro(p) for p in ps] for anim, ps in poses().items()}
        _, meta = gravar_folha(nome, quadros, TEMPOS, DESTINO, ANCORA)
        print('gravado', nome, meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
