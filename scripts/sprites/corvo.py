#!/usr/bin/env python3
"""Corvo de Kocher em pixel art detalhada (15/10/2026).

"Belisca e não solta." Estilo detalhado de muitos tons (docs/flashcards/MONSTROS-NOVOS.md, refs. 1 e 4):
penas negro-azuladas com reflexo violeta, olho vermelho aceso e um bico de aço que é uma pinça de
Kocher (serrilha na mordida, dentinho na ponta e a cremalheira dourada na base). Pousado, de asas
fechadas; abre as asas no preparo, dá a bicada no golpe e cai de costas soltando penas na derrota.
Fantasia, sem anatomia.

Usa as ferramentas do cavaleiro chibi (como a aranha e o goblin). Olha para a esquerda (para o herói).

    python3 scripts/sprites/corvo.py                    # grava corvo em public/flashcards/sprites/
    python3 scripts/sprites/corvo.py --previa x.png     # prévia ampliada (--anim golpe, --escala 4)
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
    'pluma': ['#06070c', '#0b0e19', '#121728', '#1a2238', '#242f4c', '#334263', '#4b5f86', '#7a90b6'],
    'pluma_t': ['#05060c', '#0b0e1a', '#131929', '#1c243a', '#28324e', '#364464'],
    'reflexo': ['#2a1a4a', '#4a2e7a', '#6e4aa8', '#9a78d0'],
    'bico': ['#161b26', '#2b3342', '#47515f', '#6b7789', '#97a3b5', '#c6d0de', '#f0f5fb'],
    'cremalheira': ['#3a210d', '#663b12', '#9c6119', '#cf9128', '#eebd47', '#fff0a0'],
    'pata': ['#1a140e', '#33281c', '#54442e', '#7a6648', '#a08a66', '#c8b48e'],
    'olho_c': ['#3a0204', '#7a0a0a', '#d0201a', '#ff5a3c', '#ffd0b8'],
    'oco': ['#060308', '#120a16', '#1e1224'],
}
for _k, _v in NOVAS.items():
    cc.RAMPAS[_k] = np.array([cc.hx(c) for c in _v], np.uint8)
cc.NOMES = list(cc.RAMPAS)
cc.TOPO = np.array([len(cc.RAMPAS[n]) - 1 for n in cc.NOMES])
cc.CONTORNO = {k: (np.array(v[0], float) * 0.6).astype(np.uint8) for k, v in cc.RAMPAS.items()}
# contorno das penas um pouco azulado (nunca preto puro)
cc.CONTORNO['pluma'] = np.array((10, 12, 30), np.uint8)
cc.CONTORNO['pluma_t'] = np.array((8, 10, 24), np.uint8)

from cavaleiro_chibi import (  # noqa: E402
    Quadro, cheio, estrela, m_capsula, m_elipse, m_poli, mistura, n_capsula, n_esfera, ponto, suave, tons,
)

W, H = 156, 116
X0, PE = 80, 101
ANCORA = (X0, PE)
cc.W, cc.H = W, H
cc.YY, cc.XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
cc.DITHER = cc.BAYER[(cc.YY.astype(int)) % 2, (cc.XX.astype(int)) % 2]
XX, YY = cc.XX, cc.YY

DESTINO = cc.DESTINO


def rot(v, a):
    c, s = math.cos(a), math.sin(a)
    return np.array([v[0] * c - v[1] * s, v[0] * s + v[1] * c])


def quadro(t: dict) -> np.ndarray:
    k = t.get
    q = Quadro()
    dx, dy = k('x', 0), k('y', 0)
    bob = k('bob', 0)
    tomba = k('tomba', 0.0)          # derrota: cai de costas
    inc = k('inclina', 0.0)          # inclina o corpo para a frente (bicada)

    corpo_c = np.array([X0 + dx + 2, 76 + dy + bob + tomba * 14])
    cab = corpo_c + rot(np.array([-12, -21]), inc - tomba * 1.3) + np.array(k('cab', (0, 0)))
    omb = corpo_c + rot(np.array([2, -10]), inc - tomba * 1.0)

    # ================= asa (leque de penas que sai do ombro)
    def asa(abre, z, mat, lado):
        g = q.novo_grupo()
        base_ang = suave(1.05, -1.25, abre) - tomba * 1.2 + inc * 0.5   # fechada: para trás e para baixo
        abertura = suave(0.07, 0.3, abre)
        o = omb + (np.array([4, -2]) if lado < 0 else np.array([0, 0]))
        penas = []
        for i in range(7):
            ang = base_ang + abertura * (i - 3) * (1 if abre > 0.3 else 0.6)
            comp = (30 - abs(i - 4) * 2.4) * (1 if lado > 0 else 0.92) * (1 + 0.4 * max(0.0, abre - 0.3))
            d = np.array([math.cos(ang), math.sin(ang)])
            pt = o + d * comp
            penas.append((o, pt, ang))
        # cobertura (a parte de cima da asa, mais redonda)
        cob_c = o + np.array([math.cos(base_ang), math.sin(base_ang)]) * 9
        for i, (a_, b_, ang) in enumerate(penas):
            r0 = 4.2 if abre > 0.3 else 3.4
            q.peca(m_capsula(a_ + (b_ - a_) * 0.3, b_, r0, 1.3), mat, tons(n_capsula(a_, b_, r0 + 1, 1.6), mat, base=-0.02 + 0.03 * (i % 2)), z + i * 0.002, g)
            # haste clara da pena
            q.peca(m_capsula(a_ + (b_ - a_) * 0.45, b_ - (b_ - a_) * 0.08, 0.45), mat, cheio(5 if lado > 0 else 3), z + i * 0.002 + 0.001, g, enfeite=True)
        q.peca(m_elipse(cob_c, 10, 8.5), mat, tons(n_esfera(cob_c + (-3, -4), 11, 10, 0.8), mat, base=0.04), z + 0.02, g)
        if lado > 0:
            # reflexo violeta e escamas de penas na cobertura
            q.peca(m_elipse(cob_c + (-3, -3), 5, 2.4) & m_elipse(cob_c, 10, 8.5), 'reflexo', cheio(2), z + 0.03, g, enfeite=True)
            for (vx, vy) in ((-2, 2), (3, 0), (1, 5), (5, 4)):
                c = cob_c + (vx, vy)
                q.peca(m_capsula(c + (-2, 0), c + (2, 1.2), 0.5), mat, cheio(2), z + 0.031, g, enfeite=True)

    asa(k('asa', 0.0), 1.0, 'pluma_t', -1)

    # ================= cauda em leque
    gt = q.novo_grupo()
    rab = corpo_c + rot(np.array([12, 10]), -tomba * 0.9)
    for i in range(5):
        ang = 0.55 + (i - 2) * 0.13 + k('cauda', 0) * 0.1 - tomba * 0.9
        pt = rab + np.array([math.cos(ang), math.sin(ang)]) * (20 - abs(i - 2) * 1.5)
        q.peca(m_capsula(rab, pt, 3.0, 2.4), 'pluma', tons(n_capsula(rab, pt, 3.4, 2.6), 'pluma', base=-0.05 + 0.04 * (i % 2)), 1.5 + i * 0.002, gt)
        q.peca(m_capsula(rab + (pt - rab) * 0.4, pt, 0.4), 'pluma', cheio(4), 1.5 + i * 0.002 + 0.001, gt, enfeite=True)

    # ================= patas (escamosas, três dedos à frente)
    if tomba < 0.5:
        for lado, z in ((1, 2.0), (-1, 6.0)):
            g = q.novo_grupo()
            top = corpo_c + (-2 + lado * 3.5, 12)
            pe = np.array([X0 + dx - 1 + lado * 4, PE + dy])
            q.peca(m_capsula(top, pe + (0, -2), 1.6, 1.2), 'pata', tons(n_capsula(top, pe, 1.8, 1.4), 'pata'), z, g)
            for j, dd in enumerate(((-6, 0.5), (-4, 1), (3, 0.5))):
                q.peca(m_capsula(pe + (0, -1), pe + dd, 1.1, 0.7), 'pata', cheio(3 - (lado < 0)), z + 0.01, g)
                q.peca(ponto(*(pe + dd + (-0.8 if dd[0] < 0 else 0.8, 0.4))), 'bico', cheio(1), z + 0.02, g, enfeite=True)
            for j in range(3):   # escamas
                c = top + (pe - top) * (0.35 + j * 0.2)
                q.peca(ponto(c[0] - 0.5, c[1]), 'pata', cheio(1), z + 0.02, g, enfeite=True)
    else:
        for lado in (1, -1):   # patas para cima, encolhidas
            g = q.novo_grupo()
            top = corpo_c + (lado * 3.5, -6)
            pe = top + (lado * 2 - 2, -9)
            q.peca(m_capsula(top, pe, 1.6, 1.2), 'pata', cheio(3), 6.0, g)
            for dd in ((-3, -2), (0, -3.5), (3, -2)):
                q.peca(m_capsula(pe, pe + dd, 0.9, 0.6), 'pata', cheio(3), 6.01, g)

    # ================= corpo
    gc = q.novo_grupo()
    corpo = m_elipse(corpo_c, 16, 16.5) | m_elipse(corpo_c + rot(np.array([-6, -10]), inc - tomba * 1.2), 10, 10)
    q.peca(corpo, 'pluma', tons(n_esfera(corpo_c + (-5, -6), 15, 17, 0.85), 'pluma', base=0.05), 3.0, gc)
    # peito com penas em escama (meia-luas claras)
    for j in range(4):
        for i in range(3):
            c = corpo_c + rot(np.array([-9 + i * 3.5 + (j % 2) * 1.6, -4 + j * 4.2]), -tomba * 1.2)
            m = m_elipse(c, 2.2, 1.6) & ~m_elipse(c + (0, -0.9), 2.2, 1.6) & corpo
            q.peca(m, 'pluma', cheio(5 - (j > 1)), 3.01, gc, enfeite=True)
    q.peca(m_elipse(corpo_c + (-6, -8), 4, 2.2) & corpo, 'reflexo', cheio(3), 3.02, gc, enfeite=True)

    # ================= cabeça, bico de pinça e olho
    gh = q.novo_grupo()
    cab_m = m_elipse(cab, 10.5, 9.5)
    q.peca(cab_m, 'pluma', tons(n_esfera(cab + (-3, -4), 10, 9, 0.8), 'pluma', base=0.07), 4.0, gh)
    # topete arrepiado
    for j, (ax, ay) in enumerate(((4, -12), (8, -10), (10, -6))):
        b0 = cab + (2 + j, -6)
        q.peca(m_poli([b0 + (-2, 1), cab + (ax, ay), b0 + (2, 1.5)]), 'pluma', cheio(4 + (j == 0)), 3.99, gh)
    q.peca(m_elipse(cab + (-2, -5), 3.5, 1.6) & cab_m, 'reflexo', cheio(3), 4.01, gh, enfeite=True)
    # bico: duas mandíbulas de aço (pinça de Kocher), abrem no golpe
    abre = k('boca', 0.1)
    raiz = cab + (-7, 1)
    ang_b = -0.05 - inc * 0.3 + tomba * 0.4
    sup_p = raiz + rot(np.array([-19, 0]), ang_b - abre * 0.18)
    inf_p = raiz + rot(np.array([-17, 0]), ang_b + abre * 0.22)
    sup = m_poli([raiz + (1, -4.2), sup_p + (0.5, -0.5), sup_p + (1, 1.2), raiz + (1, 0.6)])
    inf = m_poli([raiz + (1, 1.0), inf_p + (1, -0.8), inf_p + (0.5, 0.6), raiz + (1, 4.0)])
    gb = q.novo_grupo()
    q.peca(inf, 'bico', tons(n_esfera(raiz + (-8, 3), 14, 5, 0.6), 'bico', metal=True, base=-0.05), 4.1, gb)
    q.peca(sup, 'bico', tons(n_esfera(raiz + (-8, -3), 14, 6, 0.6), 'bico', metal=True), 4.2, gb)
    # serrilha da mordida e dentinho na ponta (o "dente de Kocher")
    for j in range(5):
        c = raiz + (sup_p - raiz) * (0.25 + j * 0.13)
        q.peca(ponto(c[0], c[1] + 0.3), 'bico', cheio(1), 4.21, gb, enfeite=True)
    q.peca(m_poli([sup_p + (0.5, 0.5), sup_p + (1.8, 0.6), sup_p + (1.2, 2.6)]), 'bico', cheio(5), 4.22, gb)
    # cremalheira dourada na base do bico
    q.peca(m_capsula(raiz + (1, -3.6), raiz + (1, 3.4), 1.6), 'cremalheira', tons(n_capsula(raiz + (0, -3), raiz + (1, 3), 1.8), 'cremalheira', metal=True), 4.25, gb)
    for j in range(3):
        q.peca(ponto(raiz[0] + 1, raiz[1] - 2 + j * 2), 'cremalheira', cheio(1), 4.26, gb, enfeite=True)
    # olho
    oc = cab + (-2.5, -1.5)
    olhos = []
    if k('olhos_x'):
        q.peca(m_capsula(oc + (-1.6, -1.6), oc + (1.6, 1.6), 0.6) | m_capsula(oc + (-1.6, 1.6), oc + (1.6, -1.6), 0.6), 'oco', cheio(0), 4.3, gh, enfeite=True)
    elif k('fecha'):
        q.peca(m_capsula(oc + (-2, 0.4), oc + (2, -0.2), 0.6), 'oco', cheio(0), 4.3, gh, enfeite=True)
    else:
        olho = m_elipse(oc, 2.3, 2.3)
        q.peca(olho, 'olho_c', np.where(YY < oc[1], 3, 2).astype(np.int16), 4.3, gh, enfeite=True)
        q.peca(ponto(oc[0] - 0.5, oc[1]) & olho, 'oco', cheio(0), 4.31, gh, enfeite=True)
        q.peca(m_capsula(oc + (-3, -2.6), oc + (2.6, -3.2), 0.8), 'pluma', cheio(1), 4.32, gh, enfeite=True)   # sobrancelha brava
        olhos.append(oc)

    asa(k('asa', 0.0), 5.0, 'pluma', 1)

    rgba = q.final()
    brilho = k('brilho', 1.0)
    for c in olhos:
        mistura(rgba, m_elipse(c, 4, 4) & (rgba[..., 3] > 0) & ~m_elipse(c, 2.3, 2.3), (255, 70, 50), 0.2 * brilho)
        mistura(rgba, ponto(c[0] - 1, c[1] - 1), (255, 255, 240), 1.0)
    # rastro da bicada
    if k('rastro'):
        x0, y0, comp = k('rastro')
        for j in range(3):
            m = m_capsula((x0, y0 + j * 3 - 3), (x0 + comp - j * 4, y0 + j * 3 - 3), 0.7) & (rgba[..., 3] == 0)
            mistura(rgba, m, (230, 240, 255), 0.75 - j * 0.2)
    # penas soltas
    for (fx_, fy_, ang) in (k('penas') or []):
        a_, b_ = np.array([fx_, fy_]), np.array([fx_, fy_]) + np.array([math.cos(ang), math.sin(ang)]) * 6
        mistura(rgba, m_capsula(a_, b_, 1.4, 0.6), tuple(int(c) for c in cc.RAMPAS['pluma'][4]), 1.0)
        mistura(rgba, m_capsula(a_, b_, 0.4), tuple(int(c) for c in cc.RAMPAS['pluma'][6]), 1.0)
    for (fx_, fy_, tm) in (k('cintilas') or []):
        estrela(rgba, (fx_, fy_), tm, (255, 150, 130), 1.0)
    return rgba


def poses():
    a = {}
    a['parado'] = [
        {'bob': 0, 'boca': 0.05},
        {'bob': 0.5, 'boca': 0.1, 'cab': (0, 0.5), 'cauda': 0.5},
        {'bob': 1.0, 'boca': 0.05, 'cab': (-1, 1), 'brilho': 0.6, 'cauda': 1},
        {'bob': 0.5, 'boca': 0.25, 'cab': (0, 0.5), 'cauda': 0.5},
    ]
    a['preparo'] = [{'asa': 0.6 * f, 'inclina': -0.15 * f, 'boca': 0.3 + 0.5 * f, 'x': 3 * f, 'cab': (2 * f, -1 * f), 'brilho': 1 + 0.4 * f} for f in (0.4, 0.75, 1.0)]
    g = []
    for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.55)):
        s = min(1.0, f / 0.6)
        g.append({'asa': suave(0.7, 1.0, s) if i < 4 else 0.4, 'inclina': suave(-0.1, 0.45, s), 'x': -16 * s, 'y': -4 * math.sin(s * math.pi),
                  'boca': 1.0 if i in (1, 2) else 0.0 if i in (3, 4) else 0.3, 'cab': (-4 * s, 2 * s), 'brilho': 1.4,
                  'rastro': (X0 - 66, 54, 22) if i in (3, 4) else None,
                  'penas': [(X0 + 30, 40, 0.6)] if i == 2 else None})
    a['golpe'] = g
    a['dano'] = [{'x': 5 * f, 'asa': 0.5 * f, 'inclina': -0.25 * f, 'boca': 0.6, 'fecha': f > 0.5, 'brilho': 0.3,
                  'penas': [(X0 + 14 + 6 * f, 46 - 10 * f, 0.4), (X0 - 4, 40 - 8 * f, 2.2)] if f > 0.5 else None} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'tomba': f, 'asa': 0.3 * f, 'boca': 0.4, 'olhos_x': f > 0.5, 'brilho': 0.2,
                     'penas': [(X0 - 20 + 30 * f, 50 - 20 * f, 0.7 + f), (X0 + 18, 40 - 26 * f, 2.4)] if f < 0.95 else None} for f in (0.15, 0.4, 0.7, 0.92, 1.0)]
    v = []
    for f, cint in ((0.5, None), (1.0, [(X0 - 40, 26, 2)]), (0.85, [(X0 - 44, 20, 3), (X0 + 26, 18, 2)]), (0.5, [(X0 + 22, 24, 2)])):
        v.append({'asa': f, 'boca': 0.4 + 0.6 * f, 'inclina': -0.12 * f, 'bob': -2 * f, 'brilho': 1.3, 'cintilas': cint, 'cauda': f})
    a['vitoria'] = v
    return a


TEMPOS = {'parado': 230, 'preparo': 95, 'golpe': 65, 'dano': 85, 'derrota': 130, 'vitoria': 150}


def principal() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--previa')
    ap.add_argument('--anim', default='parado')
    ap.add_argument('--escala', type=int, default=4)
    ap.add_argument('--fundo', default='#7a8494')
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
    _, meta = gravar_folha('corvo', quadros, TEMPOS, DESTINO, ANCORA)
    print('gravado corvo', meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
