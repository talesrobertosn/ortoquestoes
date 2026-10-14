#!/usr/bin/env python3
"""Mímico do Arsenal em pixel art detalhada (14/10/2026).

"A caixa de instrumentais sorriu." Referência do Tales: os objetos de muitos tons por material
(docs/flashcards/MONSTROS-NOVOS.md, ref. 1). É uma caixa de instrumentais de aço escovado, com
cantoneiras de latão e correias de couro, que abre a tampa e mostra dentes (alguns são lâminas de
bisturi), uma língua comprida e dois olhos acesos lá no fundo. Da boca aparecem as argolas de uma
pinça. Anda em quatro patinhas. Rouba cargas dos poderes, por isso cospe moedas quando apanha.

Usa as ferramentas do cavaleiro chibi, numa tela com folga, com rampas próprias.
Olha para a esquerda (para o herói): a língua e o bote vão para a esquerda.

    python3 scripts/sprites/mimico.py                    # grava mimico em public/flashcards/sprites/
    python3 scripts/sprites/mimico.py --previa x.png     # prévia ampliada (--anim golpe, --escala 4)
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
    'inox': ['#141820', '#262c38', '#3c4454', '#58627a', '#7a869e', '#a2adc2', '#c8d1e0', '#eef3fa'],
    'inox_t': ['#10131a', '#1e232d', '#2f3542', '#454e60', '#5e687e'],
    'latao': ['#2e1c08', '#5a3a12', '#8c6022', '#bc8a36', '#e2b456', '#f6da8a', '#fff4c8'],
    'correia': ['#1c0e08', '#36200f', '#55331a', '#764a28', '#986638'],
    'goela': ['#120408', '#24080e', '#3a0e16', '#561620', '#74222a'],
    'lingua': ['#3a0814', '#6a1424', '#a02a3a', '#d04c5a', '#f08088', '#ffbcc0'],
    'dente': ['#4a463e', '#8a8478', '#c8c2b2', '#ece8dc', '#ffffff'],
    'brasa_m': ['#2a1400', '#7a4000', '#e09a1a', '#ffd84a', '#fff8d0'],
    'moeda': ['#3a2404', '#7a5410', '#c89a2a', '#f2cc4e', '#fff2a8'],
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

# tela com folga (a língua e o bote vão longe para a esquerda)
W, H = 176, 112
X0, PE = 104, 101
ANCORA = (X0, PE)
cc.W, cc.H = W, H
cc.YY, cc.XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
cc.DITHER = cc.BAYER[(cc.YY.astype(int)) % 2, (cc.XX.astype(int)) % 2]
XX, YY = cc.XX, cc.YY

DESTINO = cc.DESTINO


def P(dx, y):
    return np.array([X0 + dx, y], float)


def ret(x0, y0, x1, y1):
    return (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)


def quadro(t: dict) -> np.ndarray:
    k = t.get
    q = Quadro()
    dx, dy = k('x', 0), k('y', 0)
    abre = k('abre', 0.1)            # 0 fechada, 1 escancarada
    inc = k('inclina', 0)            # a caixa se inclina para a frente (esquerda) no bote
    achata = k('achata', 0)

    cx = X0 + dx
    aro = PE + dy - 22 + achata * 2   # borda de cima do corpo (onde a tampa encaixa)
    fundo = PE + dy - 5
    L = 23
    sk = inc * 0.15                   # cisalhamento: a frente da caixa inclina

    # ================= patinhas (quatro, de bicho), atrás do corpo
    for i, (px, z0) in enumerate(((-17, 1.0), (-6, 1.1), (6, 1.1), (17, 1.0))):
        passo = k('passo', 0) * (1 if i % 2 else -1)
        joe = np.array([cx + px + passo * 2 - 2, fundo + 2])
        pe = np.array([cx + px + passo * 3 - 4, PE + dy])
        g = q.novo_grupo()
        q.peca(m_capsula((cx + px, fundo - 1), joe, 2.6, 2.2), 'inox_t', tons(n_capsula((cx + px, fundo - 1), joe, 2.6, 2.2), 'inox_t'), z0, g)
        q.peca(m_capsula(joe, pe, 2.2, 1.6), 'inox_t', tons(n_capsula(joe, pe, 2.2, 1.6), 'inox_t'), z0 + 0.01, g)
        for gx in (-2.2, 0, 2.2):   # garrinhas
            q.peca(m_capsula(pe, pe + (gx - 1.5, 1.2), 0.7), 'dente', cheio(2), z0 + 0.02, g)

    # ================= corpo da caixa: aço escovado, lateral direita mais escura
    g = q.novo_grupo()
    corpo = m_poli([(cx - L + sk * 6, aro), (cx + L + sk * 6, aro), (cx + L, fundo), (cx - L, fundo)])
    lado = m_poli([(cx + L + sk * 6, aro), (cx + L + 7 + sk * 6, aro - 4), (cx + L + 7, fundo - 4), (cx + L, fundo)])
    Nf = n_esfera((cx - 8, aro + 2), 40, 26, 0.45)
    escov = (np.sin(YY * 2.1 + np.sin(XX * 0.13) * 1.5) > 0.6).astype(np.int16)
    q.peca(corpo, 'inox', tons(Nf, 'inox', metal=True, base=0.02) - escov, 3.0, g)
    q.peca(lado, 'inox_t', tons(n_plano(0.75, -0.1), 'inox_t', metal=True) - escov, 2.9, g)
    # cantoneiras de latão nos quatro cantos da frente
    for (ax, ay, sx, sy) in ((cx - L + sk * 6, aro, 1, 1), (cx + L + sk * 6, aro, -1, 1), (cx - L, fundo, 1, -1), (cx + L, fundo, -1, -1)):
        cant = m_poli([(ax, ay), (ax + sx * 7, ay), (ax, ay + sy * 7)]) & corpo
        q.peca(cant, 'latao', tons(n_esfera((ax + sx * 2 - 1, ay + sy * 2 - 1), 6, 6), 'latao', metal=True), 3.1, g)
        q.peca(ponto(ax + sx * 2, ay + sy * 2) & cant, 'latao', cheio(6), 3.11, g, enfeite=True)
    # correias de couro com fivela
    for fx in (-12, 12):
        xa = cx + fx + sk * 3
        cor = ret(xa - 2.5, aro, xa + 2.5, fundo) & corpo
        q.peca(cor, 'correia', np.where(XX < xa, 3, 2).astype(np.int16), 3.2, g)
        q.peca(cor & (np.abs(XX - xa) < 0.5) & ((YY.astype(int) % 3) == 0), 'correia', cheio(4), 3.21, g, enfeite=True)
        fiv = ret(xa - 3.2, fundo - 9, xa + 3.2, fundo - 5) & ~ret(xa - 1.6, fundo - 8, xa + 1.6, fundo - 6)
        q.peca(fiv, 'latao', cheio(4), 3.25, g, enfeite=True)
    # fechadura do meio (salta quando a tampa abre)
    fc = np.array([cx + sk * 3, aro + 4])
    q.peca(m_poli([fc + (-4, -1), fc + (4, -1), fc + (4, 5), fc + (0, 8), fc + (-4, 5)]), 'latao', tons(n_esfera(fc + (-1.5, 0), 6, 7), 'latao', metal=True), 3.3, g)
    q.peca(m_capsula(fc + (0, 1.5), fc + (0, 4), 0.7) | m_elipse(fc + (0, 1.3), 1.2, 1.2), 'goela', cheio(0), 3.31, g, enfeite=True)
    # etiqueta "CX" pregada (só um retângulo de papel com dois riscos)
    et = ret(cx - 19, fundo - 9, cx - 14, fundo - 5) & corpo
    q.peca(et, 'dente', cheio(3), 3.22, g, enfeite=True)
    q.peca(et & ((YY.astype(int) - int(fundo - 9)) % 2 == 1) & (XX < cx - 15), 'inox_t', cheio(1), 3.23, g, enfeite=True)

    # ================= boca: goela escura entre o aro e a tampa, com dentes e olhos
    ab_px = abre * 22
    tampa_baixo = aro - ab_px
    if abre > 0.04:
        gb = q.novo_grupo()
        goela = m_poli([(cx - L + 2 + sk * 6, aro + 0.5), (cx + L - 1 + sk * 6, aro + 0.5), (cx + L + 4, tampa_baixo + 2), (cx - L + 3 + sk * 8, tampa_baixo + 1)])
        q.peca(goela, 'goela', np.where(YY > (aro + tampa_baixo) / 2, 2, 1).astype(np.int16), 3.4, gb)
        # dentes de baixo, no aro (alguns são lâminas de bisturi de aço)
        for i in range(9):
            tx = cx - L + 4 + i * 5.2 + sk * 6
            alto = 3.2 + (i % 3 == 1) * 1.5
            bist = i in (2, 6)
            dente = m_poli([(tx - 1.8, aro + 0.6), (tx + 1.8, aro + 0.6), (tx + (0.8 if bist else 0), aro - alto)]) & goela
            q.peca(dente, 'inox' if bist else 'dente', cheio(6 if bist else 3), 3.5, gb, enfeite=True)
        # dentes de cima, na borda da tampa
        for i in range(8):
            tx = cx - L + 6.5 + i * 5.6 + sk * 7
            dente = m_poli([(tx - 1.9, tampa_baixo + 0.4), (tx + 1.9, tampa_baixo + 0.4), (tx, tampa_baixo + 3.6 + (i % 2) * 1.2)]) & goela
            q.peca(dente, 'dente', cheio(2), 3.5, gb, enfeite=True)
        # pinça saindo de dentro (argolas de latão)
        if abre > 0.35:
            pc = np.array([cx + 14, tampa_baixo + 3])
            for ox in (-2.2, 2.2):
                anel = m_elipse(pc + (ox, -4), 2.2, 2.2) & ~m_elipse(pc + (ox, -4), 1.0, 1.0)
                q.peca(anel, 'inox', cheio(5), 3.45, gb)
            q.peca(m_capsula(pc + (-1, -2), pc + (-3, 6), 0.7) | m_capsula(pc + (1, -2), pc + (-1, 6), 0.7), 'inox', cheio(4), 3.45, gb)
    olhos = []
    if abre > 0.18:
        oy = (aro + tampa_baixo) / 2 - 1
        for ox, r in ((cx - 8, 2.4), (cx + 3, 2.9)):
            olhos.append((ox + sk * 5, oy, r))

    # ================= língua comprida (sai pela frente e lambe para a esquerda)
    lg = k('lingua', 0.3) * (1 if abre > 0.12 else 0)
    if lg > 0:
        gl = q.novo_grupo()
        base_l = np.array([cx - 4 + sk * 6, aro - 1])
        ponta = base_l + np.array([-10 - 40 * lg, 6 + 10 * lg + k('lingua_y', 0)])
        ctrl = base_l + np.array([-14 * lg, -8 - 4 * lg])
        pts = bezier(base_l, ctrl, ponta, 12)
        ml = m_curva(pts, 6.0, 3.4)
        q.peca(ml, 'lingua', tons(n_capsula(pts[0], pts[-1], 3.0, 1.7), 'lingua', base=0.06), 9.0, gl)
        sulco = m_curva(pts[1:-1], 0.8, 0.6) & ml
        q.peca(sulco, 'lingua', cheio(2), 9.01, gl, enfeite=True)
        q.peca(m_elipse(ponta + (-1, 0), 3.0, 2.0), 'lingua', tons(n_esfera(ponta + (-2, -1), 3.0, 2.0), 'lingua', base=0.1), 9.02, gl)

    # ================= tampa curva (abre girando para trás: fica mais baixa e mostra o forro)
    gt = q.novo_grupo()
    alt_t = 12 * math.cos(abre * 1.15) + 1.5
    curva = 5 * math.cos(abre * 1.15)
    tl = cx - L - 1 + sk * 8
    tr = cx + L + 1 + sk * 8
    pts = [(tl, tampa_baixo), (tr, tampa_baixo), (tr, tampa_baixo - alt_t)]
    for f in np.linspace(1, 0, 9):
        x = tl + (tr - tl) * f
        pts.append((x, tampa_baixo - alt_t - curva * math.sin(f * math.pi)))
    tampa = m_poli(pts)
    lado_t = m_poli([(tr, tampa_baixo), (tr + 7, tampa_baixo - 4), (tr + 7, tampa_baixo - alt_t - 4 - curva * 0.3), (tr, tampa_baixo - alt_t)])
    Nt = n_esfera(((tl + tr) / 2 - 8, tampa_baixo - alt_t - 2), 38, 14 + curva * 2, 0.5)
    q.peca(tampa, 'inox', tons(Nt, 'inox', metal=True, base=0.06) - (np.sin(YY * 2.1 + XX * 0.05) > 0.7).astype(np.int16), 6.0, gt)
    q.peca(lado_t, 'inox_t', tons(n_plano(0.75, -0.3), 'inox_t', metal=True), 5.95, gt)
    # faixa de latão na borda da tampa e alça
    q.peca(tampa & (YY > tampa_baixo - 2.2), 'latao', tons(n_capsula((tl, tampa_baixo - 1), (tr, tampa_baixo - 1), 1.2), 'latao', metal=True), 6.05, gt, enfeite=True)
    al = np.array([(tl + tr) / 2, tampa_baixo - alt_t - curva - 1])
    alca = m_elipse(al, 6, 3.4) & ~m_elipse(al, 4.2, 2.0) & (YY < al[1])
    q.peca(alca, 'latao', tons(n_esfera(al + (-2, -2), 6, 4), 'latao', metal=True), 5.9, gt)
    for (vx, vy) in ((tl + 4, tampa_baixo - alt_t * 0.5), (tr - 4, tampa_baixo - alt_t * 0.5)):
        q.peca(m_elipse((vx, vy), 1.0, 1.0) & tampa, 'latao', cheio(5), 6.06, gt, enfeite=True)
    # marcas de esterilização na tampa (três riscos de fita indicadora)
    for i in range(3):
        xr = tl + 12 + i * 4
        q.peca(ret(xr, tampa_baixo - alt_t * 0.75, xr + 2, tampa_baixo - alt_t * 0.75 + 1.2) & tampa, 'correia', cheio(1), 6.07, gt, enfeite=True)

    # ================= montar e efeitos
    rgba = q.final()
    rg = cc.RAMPAS['brasa_m']
    for (ox, oy, r) in olhos:
        brilho = k('olhos', 1.0)
        mistura(rgba, m_elipse((ox, oy), r + 2.4, r + 1.6) & (rgba[..., 3] > 0), rg[1], 0.25 * brilho)
        mistura(rgba, m_elipse((ox, oy), r, r * 0.8), rg[3], 0.95 * brilho)
        mistura(rgba, m_elipse((ox - 0.4, oy), r * 0.35, r * 0.7), (40, 10, 0), 0.9 * brilho)
        mistura(rgba, ponto(ox - r * 0.5, oy - r * 0.4), (255, 255, 240), brilho)
    for (mx, my, fase) in (k('moedas') or []):
        larg = abs(math.cos(fase)) * 2.6 + 0.6
        m = m_elipse((mx, my), larg, 2.6)
        mistura(rgba, m, tuple(cc.RAMPAS['moeda'][3]), 1.0)
        mistura(rgba, m & ~desloca(m, 1, 0), tuple(cc.RAMPAS['moeda'][1]), 1.0)
        mistura(rgba, ponto(mx - larg * 0.4, my - 1), tuple(cc.RAMPAS['moeda'][4]), 1.0)
    if k('rastro'):
        for i, (rx, ry) in enumerate(k('rastro')):
            mistura(rgba, m_elipse((rx, ry), 6 - i, 1.2) & (rgba[..., 3] == 0), (255, 220, 230), 0.4 - 0.08 * i)
    for (fx_, fy_, tm) in (k('cintilas') or []):
        estrela(rgba, (fx_, fy_), tm, (255, 238, 160), 1.0)
    for (fx_, fy_) in (k('poeira') or []):
        mistura(rgba, m_elipse((fx_, fy_), 4, 1.5) & (rgba[..., 3] == 0), (170, 160, 140), 0.55)
    for (fx_, fy_) in (k('faiscas') or []):
        estrela(rgba, (fx_, fy_), 2, (255, 240, 200), 1.0)
    return rgba


def poses():
    a = {}
    a['parado'] = [
        {'abre': 0.06, 'lingua': 0},
        {'abre': 0.16, 'lingua': 0.12, 'passo': 0.5, 'olhos': 0.6},
        {'abre': 0.24, 'lingua': 0.22, 'passo': 0, 'olhos': 1.0},
        {'abre': 0.14, 'lingua': 0.1, 'passo': -0.5, 'olhos': 0.6},
    ]
    a['preparo'] = [{'abre': suave(0.2, 0.95, f), 'lingua': 0.15 + 0.2 * f, 'achata': f, 'inclina': -4 * f, 'x': 3 * f, 'olhos': 1.0 + 0.4 * f,
                     'lingua_y': -6 * f} for f in (0.35, 0.7, 1.0)]
    g = []
    # a tampa escancara no salto, a língua chicoteia e a caixa fecha com tudo no impacto
    abres = (0.95, 1.0, 0.85, 0.12, 0.3, 0.45)
    linguas = (0.4, 0.8, 1.0, 0.0, 0.3, 0.35)
    for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.6)):
        s = min(1.0, f / 0.6)
        g.append({'x': -18 * s, 'y': -7 * math.sin(s * math.pi) if i < 3 else 0, 'abre': abres[i], 'inclina': suave(-4, 4, s),
                  'lingua': linguas[i], 'lingua_y': -4 if i < 2 else 4, 'olhos': 1.4, 'passo': 1 if i % 2 else -1,
                  'rastro': [(X0 - 66 - j * 6, 88 + j) for j in range(4)] if i == 2 else None,
                  'faiscas': [(X0 - 40, 78), (X0 - 30, 74)] if i == 3 else None,
                  'poeira': [(X0 - 36, PE - 1), (X0 - 12, PE - 1)] if i == 3 else None})
    a['golpe'] = g
    a['dano'] = [{'x': 5 * f, 'abre': 0.02 + 0.3 * (1 - f), 'inclina': 4 * f, 'lingua': 0, 'faiscas': [(X0 - 22, 84), (X0 - 10, 76)] if f == 1.0 else None,
                  'moedas': [(X0 - 30, 70 - 10 * f, 0.3), (X0 + 26, 64 - 8 * f, 1.4)] if f > 0.5 else None} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'abre': suave(0.3, 1.0, f), 'lingua': 0.6 * f, 'lingua_y': 10 * f, 'olhos': max(0.0, 1 - 1.4 * f), 'achata': 2 * f, 'inclina': 2 * f,
                     'moedas': [(X0 - 34 + i * 14, 84 + (i % 2) * 6 - 24 * (1 - f), i * 0.9) for i in range(int(1 + 4 * f))]} for f in (0.15, 0.4, 0.65, 0.88, 1.0)]
    v = []
    for f, cint in ((0.5, None), (1.0, [(X0 - 30, 46, 2)]), (0.7, [(X0 - 34, 40, 3), (X0 + 34, 50, 2)]), (0.2, [(X0 + 30, 44, 2)])):
        v.append({'y': -8 * f, 'abre': 0.25 + 0.6 * f, 'lingua': 0.4 * f, 'lingua_y': -10 * f, 'olhos': 1.3, 'passo': 1 if f > 0.6 else -1, 'cintilas': cint,
                  'moedas': [(X0 - 6, 60 - 16 * f, f * 3), (X0 + 10, 56 - 20 * f, f * 2)]})
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
    _, meta = gravar_folha('mimico', quadros, TEMPOS, DESTINO, ANCORA)
    print('gravado mimico', meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
