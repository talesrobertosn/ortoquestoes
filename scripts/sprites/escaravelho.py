#!/usr/bin/env python3
"""Escaravelho da Cartilagem em pixel art detalhada (15/10/2026).

"Lisa por fora, dura por dentro." Estilo detalhado de muitos tons (docs/flashcards/MONSTROS-NOVOS.md,
refs. 1 e 4: manchas e carapaça): besouro-rinoceronte de élitros verde-esmeralda com reflexo
furta-cor, seis patas de ferro com espinhos e um chifre perolado. O toque ortopédico: as placas
claras e lisas da carapaça e o chifre são cartilagem (branco-azulada, brilhante como a de uma
articulação). Abre os élitros e mostra as asas no preparo e na vitória; investe de chifre no golpe;
vira de costas na derrota. Fantasia, sem anatomia.

Usa as ferramentas do cavaleiro chibi (como a aranha e o goblin). Olha para a esquerda (para o herói).

    python3 scripts/sprites/escaravelho.py                    # grava escaravelho em public/flashcards/sprites/
    python3 scripts/sprites/escaravelho.py --previa x.png     # prévia ampliada (--anim golpe, --escala 4)
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
    'elitro': ['#04140e', '#082418', '#0e3a24', '#145232', '#1c6e3e', '#2a8c4a', '#46ac58', '#7cd070', '#c0f0a0'],
    'furta': ['#0e2a4a', '#1a4a7a', '#2a72a8', '#4a9ed0'],
    'quitina_e': ['#0a0a10', '#15161e', '#222430', '#323646', '#474c60', '#646a80'],
    'cartilagem': ['#3a4a5e', '#6a7e96', '#9cb2c8', '#c8dae8', '#e6f2fa', '#ffffff'],
    'asa_e': ['#3a2a1a', '#6a5236', '#9a8058', '#c8b084', '#ecdcb4'],
    'olho_e': ['#1a3a04', '#3a7a0a', '#7ac81a', '#b0ff8a', '#f0ffd8'],
    'oco': ['#060308', '#120a16', '#1e1224'],
}
for _k, _v in NOVAS.items():
    cc.RAMPAS[_k] = np.array([cc.hx(c) for c in _v], np.uint8)
cc.NOMES = list(cc.RAMPAS)
cc.TOPO = np.array([len(cc.RAMPAS[n]) - 1 for n in cc.NOMES])
cc.CONTORNO = {k: (np.array(v[0], float) * 0.6).astype(np.uint8) for k, v in cc.RAMPAS.items()}
cc.CONTORNO['quitina_e'] = np.array((8, 10, 18), np.uint8)

from cavaleiro_chibi import (  # noqa: E402
    Quadro, bezier, cheio, estrela, m_capsula, m_curva, m_elipse, m_poli, mistura, n_capsula, n_esfera, ponto, suave, tons,
)

W, H = 164, 112
X0, PE = 86, 99
ANCORA = (X0, PE)
cc.W, cc.H = W, H
cc.YY, cc.XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
cc.DITHER = cc.BAYER[(cc.YY.astype(int)) % 2, (cc.XX.astype(int)) % 2]
XX, YY = cc.XX, cc.YY

DESTINO = cc.DESTINO


def quadro(t: dict) -> np.ndarray:
    k = t.get
    q = Quadro()
    dx, dy = k('x', 0), k('y', 0)
    bob = k('bob', 0)
    abre = k('abre', 0.0)            # élitros abertos (0 a 1)
    empina = k('empina', 0.0)        # levanta a frente
    virado = k('virado', 0.0)        # derrota: de barriga para cima

    c = np.array([X0 + dx + 4, 76 + dy + bob])

    def pata(i, lado, z):
        g = q.novo_grupo()
        mat = 'quitina_e'
        base = c + np.array([-14 + i * 11, 6 - empina * (3 - i) * 1.5])
        pe = np.array([X0 + dx - 30 + i * 22 + lado * 3 + k('passo', 0) * (1 if (i + (lado > 0)) % 2 else -1) * 2, PE + dy - (0 if lado > 0 else 2)])
        if i == 0 and empina:
            pe = pe + np.array([-4 * empina, -10 * empina])
        if virado > 0.5:   # de costas, as patas se agitam
            pe = pe + np.array([k('mexe', 0) * (1 if (i + lado) % 2 else -1) * 3, -3])
        joe = (base + pe) / 2 + np.array([(-6, 0, 6)[i], -7])
        q.peca(m_capsula(base, joe, 2.4, 1.9), mat, tons(n_capsula(base, joe, 2.4, 1.9), mat, metal=True), z, g)
        q.peca(m_capsula(joe, pe, 1.9, 1.0), mat, tons(n_capsula(joe, pe, 1.9, 1.0), mat, metal=True), z + 0.01, g)
        for f in (0.35, 0.7):   # espinhos
            e = joe + (pe - joe) * f
            q.peca(m_capsula(e, e + (2.2, -1.2), 0.6, 0.2), mat, cheio(3), z + 0.02, g, enfeite=True)
        q.peca(m_capsula(pe, pe + (-2.5, 0.6), 0.9, 0.3), mat, cheio(4), z + 0.02, g, enfeite=True)

    for i in range(3):
        pata(i, -1, 1.0 + i * 0.01)

    # ================= asas membranosas (aparecem com os élitros abertos)
    if abre > 0.2:
        g = q.novo_grupo()
        for j, comp in enumerate((44, 36)):
            raiz = c + (-2, -10)
            ang = -0.25 - abre * 0.5 - j * 0.35
            ponta = raiz + np.array([math.cos(ang), math.sin(ang)]) * comp * abre
            m = m_poli([raiz, raiz + (ponta - raiz) * 0.5 + np.array([0, -8]), ponta, raiz + (ponta - raiz) * 0.6 + np.array([0, 6])])
            q.peca(m, 'asa_e', np.where(((XX - raiz[0]) * 0.3 + YY).astype(int) % 5 == 0, 2, 3 - j).astype(np.int16), 1.5 + j * 0.01, g)
            q.peca(m_capsula(raiz, ponta, 0.5), 'asa_e', cheio(1), 1.52, g, enfeite=True)

    # ================= corpo (de baixo) e cabeça
    gc = q.novo_grupo()
    ventre = m_elipse(c + (0, 3), 22, 9)
    q.peca(ventre, 'quitina_e', tons(n_esfera(c + (-5, -2), 24, 12, 0.8), 'quitina_e', metal=True, base=0.05), 2.0, gc)
    for j in range(4):   # segmentos
        q.peca(m_capsula(c + (-10 + j * 7, 6), c + (-8 + j * 7, 11), 0.5) & ventre, 'quitina_e', cheio(0), 2.01, gc, enfeite=True)

    # pronoto (escudo do tórax) e cabeça com o chifre
    gp = q.novo_grupo()
    pro_c = c + (-18, -4 - empina * 4)
    pro = m_elipse(pro_c, 10, 9)
    q.peca(pro, 'elitro', tons(n_esfera(pro_c + (-4, -5), 11, 10, 0.75), 'elitro', metal=True, base=0.05), 3.0, gp)
    cab_c = pro_c + (-9, 4 + empina * 1)
    q.peca(m_elipse(cab_c, 6.5, 5.5), 'quitina_e', tons(n_esfera(cab_c + (-2, -3), 7, 6), 'quitina_e', metal=True, base=0.1), 3.1, gp)
    # chifre de cartilagem: curvo para cima, aponta para a frente no golpe
    ch = k('chifre', 0.0)
    pts = bezier(cab_c + (-3, -2), cab_c + (-14 - ch * 6, -6 + ch * 2), cab_c + (-12 - ch * 12, -20 + ch * 14), 8)
    q.peca(m_curva(pts, 6.0, 1.2), 'cartilagem', tons(n_capsula(pts[0], pts[-1], 3.2, 1.0), 'cartilagem', metal=True, base=0.05), 3.2, gp)
    q.peca(m_curva(pts[1:-1], 1.2, 0.6), 'cartilagem', cheio(5), 3.21, gp, enfeite=True)
    # chifre pequeno do pronoto
    q.peca(m_capsula(pro_c + (-4, -7), pro_c + (-9, -11), 2.0, 0.6), 'cartilagem', cheio(3), 2.98, gp)
    olhos = []
    oc = cab_c + (-1, -0.5)
    if k('olhos_x'):
        q.peca(m_capsula(oc + (-1.4, -1.4), oc + (1.4, 1.4), 0.5) | m_capsula(oc + (-1.4, 1.4), oc + (1.4, -1.4), 0.5), 'oco', cheio(0), 3.3, gp, enfeite=True)
    else:
        q.peca(m_elipse(oc, 1.8, 1.8), 'olho_e', np.where(YY < oc[1], 3, 2).astype(np.int16), 3.3, gp, enfeite=True)
        olhos.append(oc)
    # antenas em leque
    for s in (-1, 1):
        a0 = cab_c + (-4, 2 + s)
        a1 = a0 + (-5, 2 + s * 1.5)
        q.peca(m_capsula(a0, a1, 0.6), 'quitina_e', cheio(4), 3.25, gp, enfeite=True)
        q.peca(m_elipse(a1 + (-1, 0), 1.4, 1.0), 'quitina_e', cheio(3), 3.26, gp, enfeite=True)

    # ================= élitros (casco): fechados, uma cúpula; abertos, giram para cima
    ge = q.novo_grupo()
    el_c = c + (4, -8)
    if abre < 0.2:
        el = m_elipse(el_c, 21, 13) & (YY < c[1] + 4)
        Ne = n_esfera(el_c + (-7, -7), 22, 15, 0.8)
        q.peca(el, 'elitro', tons(Ne, 'elitro', metal=True, base=0.02), 4.0, ge)
        # sutura entre os élitros (linha de cima) e o reflexo furta-cor
        q.peca(m_curva([el_c + (-18, -4), el_c + (0, -11), el_c + (19, -2)], 0.9, 0.9) & el, 'elitro', cheio(1), 4.01, ge, enfeite=True)
        q.peca((m_elipse(el_c + (-4, -6), 12, 3.4) & ~m_elipse(el_c + (-4, -4), 11, 3.2)) & el, 'furta', cheio(3), 4.02, ge, enfeite=True)
        # estrias
        for j in range(3):
            q.peca(m_curva([el_c + (-16, 2 + j * 3), el_c + (0, -3 + j * 3.5), el_c + (17, 3 + j * 2.5)], 0.6, 0.6) & el, 'elitro', cheio(2), 4.015, ge, enfeite=True)
        # placas de cartilagem lisas e brilhantes
        for (vx, vy, rx, ry) in ((-7, -3, 5.2, 3.4), (8, -4, 4.4, 3.0), (2, 5, 3.4, 2.0)):
            pc = el_c + (vx, vy)
            m = m_elipse(pc, rx, ry) & el
            q.peca(m, 'cartilagem', tons(n_esfera(pc + (-1, -1.5), rx + 1, ry + 1), 'cartilagem', metal=True), 4.03, ge, enfeite=True)
    else:
        for j, s in enumerate((-1, 1)):
            ang = -abre * (0.9 + 0.25 * j)
            piv = el_c + (-12, -4)
            def gira(v, ang=ang):
                return piv + np.array([v[0] * math.cos(ang) - v[1] * math.sin(ang), v[0] * math.sin(ang) + v[1] * math.cos(ang)])
            contorno = [gira(np.array([math.cos(t_) * 20 + 14, math.sin(t_) * 10 - 2])) for t_ in np.linspace(math.pi, 2 * math.pi, 10)] + [gira(np.array([34, 0])), gira(np.array([0, 2]))]
            m = m_poli(contorno)
            q.peca(m, 'elitro', tons(n_esfera(gira(np.array([8, -6])), 18, 12, 0.8), 'elitro', metal=True, base=0.04 - 0.06 * j), 4.0 + j * 0.05, ge)
            pc = gira(np.array([12, -3]))
            q.peca(m_elipse(pc, 3.6, 2.6) & m, 'cartilagem', cheio(4), 4.01 + j * 0.05, ge, enfeite=True)

    for i in range(3):
        pata(i, 1, 6.0 + i * 0.01)

    rgba = q.final()
    if virado > 0.5:
        # de barriga para cima: espelha na vertical e assenta o casco no chão
        rgba = rgba[::-1].copy()
        linhas = np.where(rgba[..., 3].any(axis=1))[0]
        desce = PE + 1 - linhas[-1]
        rgba = np.roll(rgba, int(desce), axis=0)
        olhos = []
    elif virado > 0:
        rgba = np.roll(rgba, int(virado * 6), axis=0)
    for oc_ in olhos:
        mistura(rgba, m_elipse(oc_, 3.2, 3.2) & (rgba[..., 3] > 0) & ~m_elipse(oc_, 1.8, 1.8), (176, 255, 138), 0.2 * k('brilho', 1.0))
        mistura(rgba, ponto(oc_[0] - 0.6, oc_[1] - 0.8), (255, 255, 240), 1.0)
    for (fx_, fy_) in (k('poeira') or []):
        mistura(rgba, m_elipse((fx_, fy_), 5, 1.6) & (rgba[..., 3] == 0), (176, 160, 138), 0.55)
    for (fx_, fy_, tm) in (k('cintilas') or []):
        estrela(rgba, (fx_, fy_), tm, (200, 240, 255), 1.0)
    return rgba


def poses():
    a = {}
    a['parado'] = [{'bob': b, 'passo': p, 'chifre': 0.0} for b, p in ((0, 0), (0.5, 0.6), (1, 0), (0.5, -0.6))]
    a['preparo'] = [{'empina': f, 'abre': 0.55 * f if f > 0.5 else 0.0, 'x': 3 * f, 'chifre': -0.2 * f} for f in (0.35, 0.7, 1.0)]
    g = []
    for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.55)):
        s = min(1.0, f / 0.6)
        g.append({'x': -22 * s, 'empina': suave(1.0, 0.0, s), 'chifre': suave(-0.2, 1.0, s), 'passo': 1 if i % 2 else -1,
                  'poeira': [(X0 - 6, PE - 1), (X0 + 18, PE - 1)] if i in (2, 3) else None})
    a['golpe'] = g
    a['dano'] = [{'x': 5 * f, 'bob': 2 * f, 'empina': 0.3 * f, 'brilho': 0.3} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'virado': f, 'empina': 1.4 * f if f < 0.5 else 0, 'olhos_x': f > 0.5, 'mexe': (1 if i % 2 else -1) * (1 if f < 1 else 0)} for i, f in enumerate((0.2, 0.45, 0.7, 0.9, 1.0))]
    v = []
    for f, cint in ((0.5, None), (1.0, [(X0 - 40, 30, 2)]), (0.9, [(X0 - 44, 22, 3), (X0 + 30, 26, 2)]), (0.6, [(X0 + 26, 30, 2)])):
        v.append({'abre': f, 'empina': 0.4 * f, 'chifre': -0.2, 'cintilas': cint, 'brilho': 1.3})
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
    _, meta = gravar_folha('escaravelho', quadros, TEMPOS, DESTINO, ANCORA)
    print('gravado escaravelho', meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
