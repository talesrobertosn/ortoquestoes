#!/usr/bin/env python3
"""Raptor do Menisco em pixel art detalhada (15/10/2026, ideia 53).

"Corta em meia-lua." Estilo detalhado de muitos tons (docs/flashcards/MONSTROS-NOVOS.md, refs. 1 e 4):
escamas verdes com faixas escuras nas costas, ventre creme, crista de penas vermelhas, olho amarelo
de pupila em fenda e a garra-foice erguida no segundo dedo. O toque ortopédico: na coxa há uma placa
clara em meia-lua, o menisco, e o rasgo do golpe é um corte em "C". Fantasia, sem anatomia.

Usa as ferramentas do cavaleiro chibi (como a aranha e o goblin), numa tela com folga, com rampas
próprias. Olha para a esquerda (para o herói). Variantes de paleta, como as do desenho antigo:
sombrio (Raptor da Plica: escamas roxas, crista e olho verde-água) e alfa (Raptor Alfa do Cruzado:
escamas âmbar, crista dourada maior, olho vermelho e cicatrizes).

    python3 scripts/sprites/raptor.py                       # grava raptor, raptor-sombrio e raptor-alfa
    python3 scripts/sprites/raptor.py --variante alfa       # só uma (base, sombrio ou alfa)
    python3 scripts/sprites/raptor.py --previa x.png        # prévia ampliada (--anim golpe, --escala 4)
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

BASE = {
    'escama': ['#0a2012', '#13341a', '#1e4c22', '#2c682a', '#3f8632', '#5aa53c', '#7fc24c', '#b2e070'],
    'escama_t': ['#081a0e', '#102c16', '#1a421e', '#265a26', '#36762e', '#4c9236'],
    'faixa': ['#06140a', '#0c2412', '#16361a', '#22481f'],
    'ventre': ['#3e3a26', '#6a6444', '#968c66', '#c2b88c', '#e2d8b0', '#f8f2d8'],
    'crista': ['#2a0608', '#560e10', '#8a1a18', '#bc3022', '#e65432', '#ff8650', '#ffbe88'],
    'olho_r': ['#3a2200', '#8a5200', '#e09a10', '#ffd23a', '#fff4b0'],
}
VARIANTES = {
    'sombrio': {
        'escama': ['#140a24', '#22143a', '#321e52', '#46306e', '#5e448c', '#7a5eaa', '#9c80c8', '#c8b0e8'],
        'escama_t': ['#100820', '#1a1030', '#281a44', '#382858', '#4a3870', '#5e4a88'],
        'faixa': ['#08040e', '#120a1e', '#1c1230', '#281a40'],
        'ventre': ['#36304a', '#5e5478', '#8a80a4', '#b4aac8', '#d6cee4', '#f2ecfa'],
        'crista': ['#04201a', '#0a3a2e', '#106048', '#1a8a6a', '#2ab28c', '#5ad8b0', '#9ff0d8'],
        'olho_r': ['#043a2e', '#0a7a5c', '#2ac8a0', '#7fffd8', '#e0fff4'],
    },
    'alfa': {
        'escama': ['#200a02', '#3a1606', '#5a280c', '#7e3c14', '#a0501e', '#c4702e', '#e08a40', '#ffc488'],
        'escama_t': ['#1a0802', '#2e1206', '#4a200a', '#683012', '#86421a', '#a45624'],
        'faixa': ['#100402', '#200a04', '#341208', '#4a1c0c'],
        'ventre': ['#4a3a22', '#7a6440', '#a89060', '#d0b884', '#ecd8a8', '#fff4d4'],
        'crista': ['#3a2600', '#604404', '#8a6408', '#b08410', '#d8a81a', '#f2c42a', '#fff07a'],
        'olho_r': ['#3a0402', '#7a0a06', '#c42a14', '#ff5a3c', '#ffd0b8'],
    },
}
FIXAS = {
    'garra': ['#1a1410', '#342a22', '#5a4a3c', '#8a7864', '#bcac94', '#e8dcc8', '#fffaf0'],
    'menisco': ['#3a3c4e', '#6a6e86', '#9ca2bc', '#c8cee2', '#e8ecf8', '#ffffff'],
    'boca_r': ['#140306', '#2e080e', '#56141a', '#86282a', '#b04440'],
    'dente_r': ['#6a604e', '#a89c84', '#e0d8c4', '#fffcf0'],
    'oco': ['#060308', '#120a16', '#1e1224'],
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
    Quadro, bezier, cheio, estrela, m_capsula, m_curva, m_elipse, m_poli, mistura, n_capsula, n_esfera, ponto, suave, tons,
)

W, H = 176, 116
X0, PE = 92, 101
ANCORA = (X0, PE)
cc.W, cc.H = W, H
cc.YY, cc.XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
cc.DITHER = cc.BAYER[(cc.YY.astype(int)) % 2, (cc.XX.astype(int)) % 2]
XX, YY = cc.XX, cc.YY

DESTINO = cc.DESTINO


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


def quadro(t: dict) -> np.ndarray:
    k = t.get
    q = Quadro()
    alfa = VARIANTE == 'alfa'
    dx, dy = k('x', 0), k('y', 0)
    bob = k('bob', 0)
    agacha = k('agacha', 0.0)       # dobra as pernas (preparo)
    deita = k('deita', 0.0)         # derrota: o corpo vai ao chão
    ergue = k('ergue', 0.0)         # vitória: empina e ruge

    quadril = np.array([X0 + dx + 6, 62 + dy + bob + agacha * 7 + deita * 24])
    peito = quadril + np.array([-24, -5 - ergue * 7 + deita * 3])
    cab = np.array(k('cab', (-38, -26)), float) + quadril
    cab = cab + np.array([0, -ergue * 12 + deita * 26 + bob * 0.5])
    if deita:
        cab[1] = min(cab[1], PE + dy - 6)
    sobe_cauda = k('cauda', 0.0)

    # ================= cauda (atrás de tudo): longa, afinando, equilibra o corpo
    gt = q.novo_grupo()
    cauda = bezier(quadril + (6, -3), quadril + (30, -2 - sobe_cauda * 4 + deita * 6), quadril + (54, -18 - sobe_cauda * 10 + deita * 14), 12)
    n_c = len(cauda) - 1
    for i in range(n_c):
        r0 = 10.5 - 8.6 * (i / n_c) ** 0.8
        r1 = 10.5 - 8.6 * ((i + 1) / n_c) ** 0.8
        m = m_capsula(cauda[i], cauda[i + 1], r0, r1)
        q.peca(m, 'escama', tons(n_capsula(cauda[i] + (-1, -1.5), cauda[i + 1] + (-1, -1.5), r0 + 1, r1 + 1), 'escama', base=-0.02), 1.0 + i * 0.001, gt)
        if i % 2 == 0 and i < n_c - 1:   # faixas escuras atravessando a cauda
            c = (cauda[i] + cauda[i + 1]) / 2
            q.peca(m_capsula(c + (-1.5, -r0), c + (1.5, -r0 * 0.1), 1.3) & m, 'faixa', cheio(2), 1.02, gt, enfeite=True)
    # tufo de penas na ponta
    ponta = cauda[-1]
    for j, (ax, ay) in enumerate(((7, -5), (9, 0), (6, 4))):
        q.peca(m_poli([ponta + (-2, -1.5), ponta + (ax, ay), ponta + (-1, 1.8)]), 'crista', cheio(3 + (j == 0)), 0.99, gt)

    # ================= perna de trás (do lado de lá, mais escura)
    def perna(lado, pe, z):
        mat = 'escama' if lado > 0 else 'escama_t'
        q0 = quadril + (2 if lado > 0 else 5, 2 if lado > 0 else 0)
        g = q.novo_grupo()
        # coxa grossa para a frente, canela para trás (joelho à frente), pé com três dedos
        tornozelo = pe + np.array([7, -9 + deita * 4])
        joelho = junta(q0, tornozelo, 14, 14, 1)
        if joelho[0] > q0[0]:
            joelho = junta(q0, tornozelo, 14, 14, -1)
        q.peca(m_elipse(q0 + (-1, 2), 8.5, 9.5), mat, tons(n_esfera(q0 + (-5, -4), 12, 12, 0.85), mat, base=0.03), z, g)
        q.peca(m_capsula(q0, joelho, 8.5, 5.0), mat, tons(n_capsula(q0 + (-1, -1), joelho, 9, 5.5), mat), z + 0.01, g)
        q.peca(m_capsula(joelho, tornozelo, 4.2, 2.8), mat, tons(n_capsula(joelho, tornozelo, 4.2, 2.8), mat), z + 0.02, g)
        q.peca(m_capsula(tornozelo, pe + (1, -1.5), 2.8, 2.2), mat, tons(n_capsula(tornozelo, pe, 2.8, 2.2), mat), z + 0.03, g)
        # dedos para a frente e esporão
        for i, (fx, fy) in enumerate(((-9, 0.5), (-6, 1.0))):
            q.peca(m_capsula(pe + (0, -1), pe + (fx, fy), 1.7, 1.2), mat, cheio(3), z + 0.04, g)
            q.peca(m_capsula(pe + (fx, fy), pe + (fx - 2.5, fy + 0.5), 1.0, 0.4), 'garra', cheio(4), z + 0.05, g, enfeite=True)
        # a garra-foice do segundo dedo: erguida em descanso, desce no golpe
        foice = k('foice', 0.0) if lado > 0 else 0.0
        base_f = pe + (-2, -2)
        arco = [base_f + (0, 0), base_f + (-3 - 5 * foice, -5 + 3 * foice), base_f + (-8 - 6 * foice, -4 + 6 * foice)]
        q.peca(m_curva(arco, 2.6, 0.6), 'garra', tons(n_capsula(arco[0], arco[2], 1.6, 0.6), 'garra', base=0.1), z + 0.06, g)
        if lado > 0 and not k('esconde_menisco'):
            # o menisco: placa clara em meia-lua na coxa
            cm = q0 + (-2, 0)
            lua = m_elipse(cm, 5.6, 5.2) & ~m_elipse(cm + (2.6, -1.0), 4.6, 4.4)
            q.peca(lua, 'menisco', tons(n_esfera(cm + (-2, -3), 7, 7), 'menisco', base=0.05), z + 0.07, g, enfeite=True)
        return joelho

    pe_t = np.array([X0 + dx + 14, PE + dy]) + np.array(k('pe_t', (0, 0)))
    pe_f = np.array([X0 + dx - 2, PE + dy]) + np.array(k('pe_f', (0, 0)))
    perna(-1, pe_t, 1.5)

    # ================= braço de trás
    def braco(lado, z):
        mat = 'escama' if lado > 0 else 'escama_t'
        omb = peito + (2 + (lado < 0) * 3, 4)
        mao = omb + np.array(k('mao', (-7, 8))) * 1.25 + (0 if lado > 0 else np.array([2, -1]))
        cot = (omb + mao) / 2 + (2, 1)
        g = q.novo_grupo()
        q.peca(m_capsula(omb, cot, 2.8, 2.2), mat, tons(n_capsula(omb, cot, 2.8, 2.2), mat), z, g)
        q.peca(m_capsula(cot, mao, 2.2, 1.6), mat, tons(n_capsula(cot, mao, 2.2, 1.6), mat), z + 0.01, g)
        # penas no antebraço
        q.peca(m_poli([cot + (0, 0), cot + (5, 3), mao + (2, 1)]), 'crista', cheio(2 if lado < 0 else 3), z - 0.01, g)
        for j in range(3):
            c0 = mao + (-0.5 + j * 0.8, 0.5)
            q.peca(m_capsula(c0, c0 + (-2.6, 2.6 - j * 0.6), 0.9, 0.3), 'garra', cheio(4), z + 0.02, g, enfeite=True)

    braco(-1, 2.0)

    # ================= tronco: corpo horizontal, ventre claro, faixas nas costas
    gc = q.novo_grupo()
    meio = (quadril + peito) / 2
    corpo = m_elipse(meio + (0, 0), 22, 12.5) | m_elipse(peito + (0, 1), 10, 10)
    Nc = n_esfera(meio + (-7, -7), 24, 15, 0.85)
    q.peca(corpo, 'escama', tons(Nc, 'escama', base=0.04), 3.0, gc)
    ventre = corpo & (YY > meio[1] + 4 + (XX - meio[0]) * 0.12)
    q.peca(ventre, 'ventre', tons(n_esfera(meio + (-6, 0), 20, 12, 0.8), 'ventre', base=0.05), 3.01, gc, enfeite=True)
    for i in range(6):   # faixas escuras na diagonal (dorso)
        bx = meio[0] - 16 + i * 6
        f = m_capsula((bx + 2, meio[1] - 12), (bx - 1, meio[1] - 2), 1.6, 0.8) & corpo
        q.peca(f, 'faixa', cheio(1 + (i % 2)), 3.02, gc, enfeite=True)
    for (vx, vy) in ((-12, -4), (4, -5), (14, -2), (-4, -7)):   # pintas claras
        q.peca(m_elipse(meio + (vx, vy), 1.3, 1.0) & corpo, 'escama', cheio(7), 3.03, gc, enfeite=True)
    q.peca(m_elipse(meio + (-8, -8), 6, 1.6) & corpo, 'escama', cheio(7), 3.04, gc, enfeite=True)   # brilho
    if alfa:   # cicatrizes do alfa
        for (a0, a1) in (((-2, -9), (6, -1)), ((2, -10), (9, -3))):
            q.peca(m_capsula(meio + a0, meio + a1, 0.6) & corpo, 'ventre', cheio(4), 3.05, gc, enfeite=True)

    # ================= pescoço e cabeça
    gp = q.novo_grupo()
    base_p = peito + (-2, -3)
    meio_p = (base_p + cab) / 2 + (4, -2)
    pesc = bezier(base_p, meio_p, cab + (6, 3), 8)
    for i in range(len(pesc) - 1):
        r0 = 7.6 - 2.6 * i / 7
        r1 = 7.6 - 2.6 * (i + 1) / 7
        q.peca(m_capsula(pesc[i], pesc[i + 1], r0, r1), 'escama', tons(n_capsula(pesc[i] + (-1, -1), pesc[i + 1] + (-1, -1), r0 + 1, r1 + 1), 'escama', base=0.05), 4.0, gp)
        q.peca(m_capsula(pesc[i] + (1, r0 * 0.55), pesc[i + 1] + (1, r1 * 0.55), r0 * 0.45, r1 * 0.45), 'ventre', cheio(3), 4.01, gp, enfeite=True)
    # crista de penas: uma fileira pelo dorso do pescoço até a nuca, apontando para trás
    tam = 1.35 if alfa else 1.0
    tam *= 1 + 0.35 * ergue + 0.25 * agacha
    gcr = q.novo_grupo()
    for i in range(1, len(pesc) - 1):
        c = pesc[i]
        tg = pesc[i + 1] - pesc[i - 1]
        tg = tg / max(np.linalg.norm(tg), 1e-3)
        nrm = np.array([-tg[1], tg[0]])
        if nrm[0] < 0:
            nrm = -nrm
        r = 7.6 - 2.6 * i / 7
        comp = (4.0 + 1.3 * i) * tam
        b0 = c + nrm * (r - 1.5)
        ponta_p = b0 + nrm * comp * 0.75 - tg * comp * 0.65
        pena = m_poli([b0 + tg * 2.6, ponta_p, b0 - tg * 2.0])
        q.peca(pena, 'crista', tons(n_esfera(b0 + (-2, -3), 6, 7), 'crista', base=0.2 - 0.06 * (i % 2)), 3.9 - i * 0.001, gcr)
    # penacho na nuca: três penas compridas
    for j, (ax, ay) in enumerate(((13, -9), (15, -4), (11, -12))):
        b0 = cab + (6, -4)
        pena = m_poli([b0 + (-1.5, -1.5), b0 + np.array([ax, ay]) * tam, b0 + (1.5, 2)])
        q.peca(pena, 'crista', tons(n_esfera(b0 + (2, -4), 9, 8), 'crista', base=0.1 - 0.06 * j), 5.9 - j * 0.001, gcr)
    # crânio alongado
    gh = q.novo_grupo()
    abre = k('boca', 0.1)
    cr = cab
    cranio = m_elipse(cr, 10, 7.2) | m_poli([cr + (-4, -6), cr + (-19, -2), cr + (-21, 1.5), cr + (-17, 3), cr + (2, 4)])
    q.peca(cranio, 'escama', tons(n_esfera(cr + (-6, -5), 14, 9, 0.8), 'escama', base=0.06), 6.0, gh)
    # mandíbula: gira para baixo no rugido
    ang = abre * 0.55
    J = cr + (4, 2.5)
    pm = J + np.array([-21 * math.cos(ang), 21 * math.sin(ang) + 1.0])
    mand = m_poli([J + (0, -1.5), J + (1, 3), pm + (2, 1.6), pm + (-0.5, -0.6)])
    if abre > 0.2:
        boca_m = m_poli([J + (-1, -0.5), cr + (-20, 2.2), pm + (0, -0.6)])
        q.peca(boca_m, 'boca_r', tons(n_esfera(J + (-8, -3), 12, 8), 'boca_r', base=0.05), 5.9, gh)
        for j in range(5):   # dentes de baixo
            tx = pm + (J - pm) * (0.12 + j * 0.16)
            q.peca(m_poli([tx + (-0.9, 0), tx + (0.9, 0), tx + (0, -2.4)]), 'dente_r', cheio(2 + (j % 2)), 6.03, gh, enfeite=True)
    q.peca(mand, 'escama', tons(n_esfera(J + (-8, 0), 14, 6, 0.7), 'escama', base=-0.02), 6.01, gh)
    q.peca(mand & (YY > (J[1] + pm[1]) / 2 + 1.5), 'ventre', cheio(3), 6.02, gh, enfeite=True)
    for j in range(0, 6, 1 if abre > 0.2 else 2):   # dentes de cima (só as pontas com a boca fechada)
        tx = cr + (-18 + j * 3.2, 2.4 + j * 0.05)
        q.peca(m_poli([tx + (-0.8, 0), tx + (0.8, 0), tx + (0, (1.2 + 1.4 * min(1.0, abre * 2)) + 0.6 * (j % 2))]), 'dente_r', cheio(3 - (j % 2)), 6.04, gh, enfeite=True)
    # narina e arcada sobre o olho
    q.peca(ponto(cr[0] - 18, cr[1] - 0.5), 'faixa', cheio(0), 6.05, gh, enfeite=True)
    arcada = m_capsula(cr + (-6, -4.5), cr + (2, -5.5), 1.4) & cranio
    q.escurece(cranio & (YY > cr[1] - 4.5) & (YY < cr[1] - 3) & (np.abs(XX - cr[0] + 2) < 5), 1)
    q.peca(arcada, 'escama', cheio(6), 6.06, gh, enfeite=True)
    for j in range(3):   # pintas no focinho
        q.peca(ponto(cr[0] - 12 + j * 3, cr[1] - 3 + (j % 2)), 'faixa', cheio(2), 6.06, gh, enfeite=True)
    olhos = []
    oc = cr + (-2, -2.2)
    if k('olhos_x'):
        q.peca(m_capsula(oc + (-1.6, -1.6), oc + (1.6, 1.6), 0.6) | m_capsula(oc + (-1.6, 1.6), oc + (1.6, -1.6), 0.6), 'oco', cheio(0), 6.1, gh, enfeite=True)
    elif k('fecha'):
        q.peca(m_capsula(oc + (-2, 0.5), oc + (2, -0.2), 0.6), 'oco', cheio(0), 6.1, gh, enfeite=True)
    else:
        olho = m_elipse(oc, 2.6, 2.1)
        q.peca(olho, 'olho_r', np.where(YY < oc[1], 3, 2).astype(np.int16), 6.1, gh, enfeite=True)
        q.peca((ponto(oc[0] - 0.6, oc[1] - 1) | ponto(oc[0] - 0.6, oc[1]) | ponto(oc[0] - 0.6, oc[1] + 1)) & olho, 'oco', cheio(0), 6.11, gh, enfeite=True)
        olhos.append(oc)

    # ================= braço e perna da frente
    perna(1, pe_f, 7.0)
    braco(1, 7.5)

    rgba = q.final()
    brilho = k('brilho', 1.0)
    cor_olho = tuple(int(c) for c in cc.RAMPAS['olho_r'][3])
    for c in olhos:
        mistura(rgba, m_elipse(c, 4.0, 3.4) & (rgba[..., 3] > 0) & ~m_elipse(c, 2.6, 2.1), cor_olho, 0.16 * brilho)
        mistura(rgba, ponto(c[0] - 1.4, c[1] - 1.0), (255, 255, 240), 1.0)
    # rasgo em "C" (meia-lua) no golpe
    if k('rasgo'):
        cx_, cy_, r_, fase = k('rasgo')
        ang = np.arctan2(YY - cy_, XX - cx_)
        rr = np.hypot(XX - cx_, YY - cy_)
        for j, dr in enumerate((0, 5, 10)):
            arco_m = (np.abs(rr - (r_ - dr)) < 1.3 - j * 0.3) & (ang > 1.0 - fase) & (ang < 2.2 + fase * 0.6) & (rgba[..., 3] == 0)
            mistura(rgba, arco_m, (255, 250, 230), 0.9 - j * 0.2)
            mistura(rgba, (np.abs(rr - (r_ - dr)) < 2.4) & ~arco_m & (ang > 1.0 - fase) & (ang < 2.2 + fase * 0.6) & (rgba[..., 3] == 0), tuple(int(c) for c in cc.RAMPAS['crista'][5]), 0.35)
    for (fx_, fy_, tm) in (k('cintilas') or []):
        estrela(rgba, (fx_, fy_), tm, tuple(int(c) for c in cc.RAMPAS['crista'][6]), 1.0)
    for (fx_, fy_) in (k('poeira') or []):
        mistura(rgba, m_elipse((fx_, fy_), 5, 1.6) & (rgba[..., 3] == 0), (176, 160, 138), 0.55)
    return rgba


def poses():
    a = {}
    a['parado'] = [
        {'bob': 0, 'cauda': 0.0, 'boca': 0.08},
        {'bob': 0.6, 'cauda': 0.3, 'boca': 0.12, 'cab': (-38, -25)},
        {'bob': 1.0, 'cauda': 0.5, 'boca': 0.2, 'cab': (-37, -24.5), 'brilho': 0.6},
        {'bob': 0.5, 'cauda': 0.25, 'boca': 0.1, 'cab': (-38, -25)},
    ]
    a['preparo'] = [{'agacha': f, 'cab': (-32 + 4 * f, -22 + 4 * f), 'cauda': 0.6 + 0.6 * f, 'boca': 0.2 + 0.6 * f, 'foice': -0.2 * f,
                     'mao': (-6 + 2 * f, 6), 'x': 3 * f, 'brilho': 1 + 0.5 * f} for f in (0.35, 0.7, 1.0)]
    g = []
    for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.55)):
        s = min(1.0, f / 0.6)
        salto = math.sin(min(1.0, f) * math.pi) * 6 if i < 4 else 0
        g.append({'x': -22 * s, 'y': -salto, 'agacha': suave(1.0, 0.0, s) if i < 3 else 0.2, 'cab': (suave(-28, -46, s), suave(-18, -16, s)),
                  'boca': 1.0 if i in (2, 3) else 0.6, 'cauda': suave(1.2, -0.3, s), 'foice': 1.0 if i in (2, 3, 4) else 0.3,
                  'pe_f': (suave(0, -10, s) if i in (2, 3, 4) else 0, -5 if i in (2, 3) else 0), 'mao': (-10, 4) if i in (2, 3) else (-7, 8),
                  'rasgo': (X0 - 44, 60, 18, 0.4 + 0.3 * (i - 2)) if i in (3, 4) else None, 'brilho': 1.4,
                  'poeira': [(X0 - 14, PE - 1), (X0 + 10, PE - 1)] if i == 1 else None})
    a['golpe'] = g
    a['dano'] = [{'x': 6 * f, 'cab': (-34 + 6 * f, -30 - 2 * f), 'boca': 0.6, 'fecha': f > 0.5, 'cauda': -0.4 * f, 'agacha': 0.2 * f, 'brilho': 0.3} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'deita': f, 'cab': (-36 - 4 * f, -24 - 2 * f), 'boca': 0.3 * (1 - f) + 0.2, 'olhos_x': f > 0.5, 'cauda': -0.6 * f, 'agacha': min(1.0, f * 1.6),
                     'pe_f': (-4 * f, 0), 'pe_t': (4 * f, 0), 'brilho': 0.2} for f in (0.15, 0.4, 0.7, 0.92, 1.0)]
    v = []
    for f, cint in ((0.5, None), (1.0, [(X0 - 50, 20, 2)]), (0.9, [(X0 - 56, 14, 3), (X0 - 30, 10, 2)]), (0.6, [(X0 - 20, 16, 2)])):
        v.append({'ergue': f, 'cab': (-34, -28), 'boca': 0.4 + 0.6 * f, 'cauda': 0.8 * f, 'brilho': 1.3, 'cintilas': cint, 'mao': (-6, 4)})
    a['vitoria'] = v
    return a


TEMPOS = {'parado': 220, 'preparo': 90, 'golpe': 65, 'dano': 85, 'derrota': 130, 'vitoria': 150}


def principal() -> int:
    global VARIANTE
    ap = argparse.ArgumentParser()
    ap.add_argument('--previa')
    ap.add_argument('--anim', default='parado')
    ap.add_argument('--escala', type=int, default=4)
    ap.add_argument('--fundo', default='#3a4048')
    ap.add_argument('--variante', help='base, sombrio ou alfa (sem ela, grava as três)')
    a = ap.parse_args()
    lista = [a.variante] if a.variante else ['base', 'sombrio', 'alfa']
    if a.previa:
        nomes = a.anim.split(',')
        P_ = poses()
        cols = max(len(P_[nm]) for nm in nomes)
        img = Image.new('RGBA', (W * cols, H * len(nomes) * len(lista)), cc.hx(a.fundo) + (255,))
        for vi, v in enumerate(lista):
            VARIANTE = None if v == 'base' else v
            usar_paleta(VARIANTE)
            for nj, nm in enumerate(nomes):
                for ci, pz in enumerate(P_[nm]):
                    img.alpha_composite(Image.fromarray(quadro(pz), 'RGBA'), (ci * W, (vi * len(nomes) + nj) * H))
        img.resize((img.width * a.escala, img.height * a.escala), Image.NEAREST).save(a.previa)
        print('prévia:', a.previa)
        return 0
    for v in lista:
        VARIANTE = None if v == 'base' else v
        usar_paleta(VARIANTE)
        nome = 'raptor' if VARIANTE is None else f'raptor-{VARIANTE}'
        quadros = {anim: [quadro(p) for p in ps] for anim, ps in poses().items()}
        _, meta = gravar_folha(nome, quadros, TEMPOS, DESTINO, ANCORA)
        print('gravado', nome, meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
