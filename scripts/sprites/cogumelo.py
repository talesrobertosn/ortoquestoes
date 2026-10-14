#!/usr/bin/env python3
"""Cogumelo da Necrose em pixel art chibi (14/10/2026), monstro novo do Jardim Suspenso.

Referências do Tales (docs/flashcards/MONSTROS-NOVOS.md): o cogumelo de olhos vermelhos e corpo
bege (ref. 5) e o chapéu vermelho com pintas dos ícones de 32 px (ref. 4), no estilo chibi do
goblin (ref. 3). É quase fofo: anda aos pulinhos. O toque ortopédico: o chapéu vinho tem bordas
murchas e manchas pálidas, como a necrose, uma das pintas é um ossinho, e ele solta esporos.

Usa as ferramentas do cavaleiro chibi, como o goblin. Olha para a esquerda (para o herói).

    python3 scripts/sprites/cogumelo.py                    # grava cogumelo em public/flashcards/sprites/
    python3 scripts/sprites/cogumelo.py --previa x.png     # prévia ampliada (--anim golpe, --escala 5)
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
    'chapeu': ['#1e060c', '#3a0c16', '#5e1420', '#86202a', '#ac3434', '#cc5442', '#e47c5a', '#f4a87c'],
    'chapeu_t': ['#18050a', '#2e0a12', '#4a101a', '#6a1822', '#88262c'],
    'pinta': ['#5c4a3c', '#9a8a74', '#cfc2a6', '#ece2c8', '#fbf6ea'],
    'caule': ['#2c2018', '#4e3c2c', '#76604a', '#9e886a', '#c4b090', '#e0d0b0', '#f2e8d2'],
    'lamela': ['#2a1612', '#4a2a20', '#6c4232', '#8c5c44'],
    'olho_v': ['#2a0204', '#6a0a0c', '#c8201a', '#ff6a3a', '#ffd8b0'],
    'oco': ['#080404', '#140a08', '#22120e'],
    'esporo': ['#3a3a1a', '#7a7a3a', '#b8b86a', '#e0e09a', '#fafad2'],
}
for _k, _v in NOVAS.items():
    cc.RAMPAS[_k] = np.array([cc.hx(c) for c in _v], np.uint8)
cc.NOMES = list(cc.RAMPAS)
cc.TOPO = np.array([len(cc.RAMPAS[n]) - 1 for n in cc.NOMES])
cc.CONTORNO = {k: (np.array(v[0], float) * 0.6).astype(np.uint8) for k, v in cc.RAMPAS.items()}

from cavaleiro_chibi import (  # noqa: E402
    Quadro, cheio, desloca, estrela, m_capsula, m_curva, m_elipse, m_poli, mistura,
    n_capsula, n_esfera, ponto, suave, tons,
)

# tela com folga dos lados e embaixo (a arma e a derrota não encostam na borda da folha);
# as ferramentas de cc leem W, H, XX e YY na hora
W, H = 156, 112
X0, PE = 80, 101
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
    estica = k('estica', 0.0)        # >0 estica (pulo), <0 achata (pouso)
    inc = k('inclina', 0)
    sy = 1 + estica * 0.18
    sx = 1 - estica * 0.12

    pe_y = PE + dy
    base = P(dx, pe_y)
    # ================= pezinhos
    for lado, z0 in ((1, 1.0), (-1, 3.5)):
        mat = 'caule'
        pe = base + (lado * 6 * sx, 0) + np.array(k('pe_f' if lado < 0 else 'pe_t', (0, 0)))
        g = q.novo_grupo()
        q.peca(m_capsula(pe + (0, -6 * sy), pe + (0, -2), 2.6, 2.4), mat, tons(n_capsula(pe + (0, -6), pe + (0, -2), 2.6), mat, base=-0.08 if lado > 0 else 0), z0, g)
        q.peca(m_elipse(pe + (-1.5, -1), 4.2, 2.3), mat, tons(n_esfera(pe + (-2.5, -2), 4.2, 2.6), mat, base=-0.08 if lado > 0 else 0), z0 + 0.01, g)

    # ================= caule gordinho (o corpo), com o rosto
    cc_ = base + (inc * 0.6, -17 * sy)
    g = q.novo_grupo()
    corpo = m_elipse(cc_, 11.5 * sx, 12.5 * sy) | m_elipse(cc_ + (0, 6 * sy), 12.5 * sx, 8 * sy)
    corpo &= YY < pe_y - 3
    q.peca(corpo, 'caule', tons(n_esfera(cc_ + (-4, -5), 14 * sx, 15 * sy, 0.8), 'caule', base=0.04), 2.0, g)
    # manchinhas de fibra no caule
    for (vx, vy) in ((-5, 6), (6, 3), (3, 9), (-8, -1)):
        q.peca(ponto(cc_[0] + vx * sx, cc_[1] + vy * sy) & corpo, 'caule', cheio(2), 2.01, g, enfeite=True)
    fx = cc_[0] - 3
    fy = cc_[1] - 1 * sy
    fechado = k('fechado', False)
    olhos = []
    braveza = k('brava', 0.6)
    for ox, rx_ in ((fx - 5, 2.4), (fx + 4.5, 3.0)):
        oc = np.array([ox, fy])
        if fechado:
            q.peca(m_capsula(oc + (-rx_, 0.5), oc + (rx_, -0.5), 0.6), 'oco', cheio(0), 2.3, g, enfeite=True)
            continue
        olho = m_elipse(oc, rx_, 3.0 * sy)
        q.peca(olho, 'oco', cheio(0), 2.2, g, enfeite=True)
        iris = m_elipse(oc + (-0.5, 0.6), rx_ * 0.7, 2.0 * sy) & olho
        q.peca(iris, 'olho_v', np.where(YY < oc[1] + 0.5, 3, 2).astype(np.int16), 2.21, g, enfeite=True)
        # sobrancelha brava: corta o canto de dentro do olho
        lado = 1 if ox < fx else -1
        corte = olho & ((YY - oc[1]) < -1.6 + lado * (XX - oc[0]) * 0.55 * braveza - 0.8)
        q.peca(corte, 'caule', cheio(3), 2.25, g, enfeite=True)
        olhos.append(oc + (-1.0, -0.6))
    # boquinha: risquinho com um dente, abre no golpe
    abre = k('boca', 0.0)
    bc = np.array([fx - 0.5, fy + 5.5 * sy])
    boca = m_elipse(bc, 2.6 + abre, 0.7 + abre * 1.6)
    q.peca(boca, 'oco', cheio(1), 2.3, g, enfeite=True)
    q.peca(m_poli([bc + (0.4, -0.7 - abre * 1.2), bc + (2.0, -0.7 - abre * 1.2), bc + (1.2, 0.8)]), 'pinta', cheio(4), 2.31, g, enfeite=True)
    # bochechas
    boch = (m_elipse((fx - 8, fy + 3.5 * sy), 2.0, 1.2) | m_elipse((fx + 8.5, fy + 3.5 * sy), 2.2, 1.2)) & corpo

    # ================= braçinhos curtos
    for lado, z0 in ((1, 1.5), (-1, 3.0)):
        omb = cc_ + (lado * 10 * sx, 2)
        mao = omb + np.array(k('mao_f' if lado < 0 else 'mao_t', (lado * 4, 5)))
        gb = q.novo_grupo()
        q.peca(m_capsula(omb, mao, 2.2, 2.0), 'caule', tons(n_capsula(omb, mao, 2.2, 2.0), 'caule', base=-0.06 if lado > 0 else 0), z0, gb)
        q.peca(m_elipse(mao, 2.4, 2.2), 'caule', tons(n_esfera(mao + (-1, -1), 2.4, 2.2), 'caule'), z0 + 0.01, gb)

    # ================= chapéu: cúpula larga, borda murcha, lamelas por baixo
    ch = cc_ + (inc * 1.6, -17 * sy + k('chapeu_y', 0))
    rxc, ryc = 22 * sx + k('abre_chapeu', 0), 13 * sy
    gc = q.novo_grupo()
    borda_y = ch[1] + 5
    murcha = np.sin((XX - ch[0]) * 0.55 + k('fase', 0)) * 1.4 + np.sin((XX - ch[0]) * 1.3) * 0.6
    copa = m_elipse(ch, rxc, ryc) & (YY < borda_y + murcha)
    q.peca(copa, 'chapeu', tons(n_esfera(ch + (-6, -6), rxc + 2, ryc + 4, 0.85), 'chapeu', base=0.03), 6.0, gc)
    # lamelas (a parte de baixo, vista um pouco de frente)
    lam = m_elipse((ch[0], borda_y + 1), rxc * 0.86, 3.4) & ~copa & (YY > borda_y - 1)
    riscas = (np.abs(np.sin((XX - ch[0]) * 0.9)) > 0.55)
    q.peca(lam, 'lamela', np.where(riscas, 1, 2).astype(np.int16), 5.9, gc)
    # pintas pálidas (necrose), uma delas um ossinho
    pintas = [(-12, -3, 3.2, 2.6), (-2, -8, 3.8, 2.8), (10, -5, 3.0, 2.4), (15, 1, 2.2, 1.8), (-17, 2, 2.0, 1.6), (3, 0, 2.4, 1.8)]
    for (px, py, rx_, ry_) in pintas:
        c = ch + (px * sx, py * sy)
        m = m_elipse(c, rx_, ry_) & copa
        q.peca(m, 'pinta', np.where(YY < c[1], 3, 2).astype(np.int16), 6.1, gc, enfeite=True)
        q.peca(ponto(c[0] - rx_ * 0.4, c[1] - ry_ * 0.4) & m, 'pinta', cheio(4), 6.11, gc, enfeite=True)
    # o ossinho (fêmur de desenho animado)
    oc_ = ch + (-6 * sx, 3 * sy)
    osso = (m_capsula(oc_ + (-3.5, 0), oc_ + (3.5, 0), 0.9) | m_elipse(oc_ + (-3.8, -0.9), 1.2, 1.1) | m_elipse(oc_ + (-3.8, 0.9), 1.2, 1.1)
            | m_elipse(oc_ + (3.8, -0.9), 1.2, 1.1) | m_elipse(oc_ + (3.8, 0.9), 1.2, 1.1)) & copa
    q.peca(osso, 'pinta', cheio(3), 6.12, gc, enfeite=True)
    # brilho do chapéu
    q.peca(m_curva([ch + (-15 * sx, -4 * sy), ch + (-10 * sx, -9 * sy), ch + (-3 * sx, -11 * sy)], 1.4, 0.8) & copa, 'chapeu', cheio(7), 6.13, gc, enfeite=True)
    # broto mofado no topo
    topo = ch + (4, -ryc + 1)
    q.peca(m_capsula(topo, topo + (2, -4), 0.8), 'caule', cheio(3), 5.95, gc)
    q.peca(m_elipse(topo + (2.5, -4.5), 1.6, 1.4), 'esporo', cheio(3), 5.96, gc)

    # ================= montar e efeitos
    rgba = q.final()
    mistura(rgba, boch & (rgba[..., 3] > 0), (255, 120, 110), 0.32)
    for oc in olhos:
        mistura(rgba, ponto(*oc), (255, 255, 240), 1.0)
    for i, (sx_, sy_, r) in enumerate(k('esporos') or []):
        cor = (230, 230, 150) if i % 2 else (200, 210, 120)
        m = m_elipse((sx_, sy_), r, r)
        mistura(rgba, m, cor, 0.5)
        mistura(rgba, m_elipse((sx_ - r * 0.3, sy_ - r * 0.3), r * 0.45, r * 0.45), (255, 255, 210), 0.7)
    for (px_, py_) in (k('pontinhos') or []):
        mistura(rgba, ponto(px_, py_) | ponto(px_ + 1, py_), (240, 240, 170), 0.9)
    for (fx_, fy_, tm) in (k('cintilas') or []):
        estrela(rgba, (fx_, fy_), tm, (255, 240, 170), 1.0)
    for (fx_, fy_) in (k('poeira') or []):
        mistura(rgba, m_elipse((fx_, fy_), 3.5, 1.4) & (rgba[..., 3] == 0), (190, 176, 140), 0.55)
    out = rgba
    queda = k('queda', 0)
    if queda:
        im = Image.fromarray(out, 'RGBA').rotate(queda, resample=Image.NEAREST, center=(ANCORA[0], ANCORA[1] - 1),
                                                 translate=(k('queda_x', 0), k('queda_y', 0)))
        out = np.asarray(im).copy()
    return out


def nuvem(cx, cy, n, raio, semente):
    rng = np.random.default_rng(semente)
    return [(cx + rng.uniform(-raio, raio), cy + rng.uniform(-raio * 0.6, raio * 0.6), rng.uniform(2.0, 4.2)) for _ in range(n)]


def poses():
    a = {}
    # parado: pulinhos com estica e achata (o "saltitante")
    a['parado'] = [
        {'estica': -0.5, 'fase': 0},
        {'estica': 0.6, 'y': -5, 'fase': 0.6, 'mao_f': (-5, 2), 'mao_t': (5, 2)},
        {'estica': 0.2, 'y': -7, 'fase': 1.2, 'mao_f': (-5, 1), 'mao_t': (5, 1), 'pontinhos': [(X0 + 16, 50)]},
        {'estica': -0.2, 'y': -2, 'fase': 1.8, 'pontinhos': [(X0 + 18, 44)]},
    ]
    a['preparo'] = [{'estica': -0.9 * f, 'inclina': 2 * f, 'brava': 0.6 + 0.4 * f, 'boca': 0.3 * f, 'mao_f': (-4, 5 - 3 * f), 'mao_t': (4, 5 - 3 * f),
                     'abre_chapeu': 1.5 * f, 'esporos': nuvem(X0 + 4, 44, 2, 10, 3) if f == 1.0 else None} for f in (0.35, 0.7, 1.0)]
    g = []
    for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.6)):
        s = min(1.0, f / 0.6)
        g.append({'x': -14 * s, 'y': -10 * math.sin(s * math.pi) if i < 3 else 0, 'estica': suave(0.8, -0.6, s) if i >= 2 else 0.8,
                  'inclina': suave(2, -4, s), 'boca': 1.0, 'brava': 1.0, 'mao_f': (-6, -1), 'mao_t': (6, -1), 'abre_chapeu': 2,
                  'esporos': nuvem(X0 - 46, 82, 8, 13, 7 + i) if i in (3, 4) else (nuvem(X0 - 42, 84, 4, 9, 11) if i == 5 else None),
                  'poeira': [(X0 - 22, PE - 1), (X0 - 6, PE - 1)] if i == 3 else None})
    a['golpe'] = g
    a['dano'] = [{'x': 4 * f, 'estica': -0.6 * f, 'inclina': 3 * f, 'fechado': f > 0.5, 'boca': 0.6 * f, 'chapeu_y': -3 * f,
                  'pontinhos': [(X0 - 14, 40), (X0 + 18, 36), (X0 + 2, 30)] if f == 1.0 else None} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'estica': -1.0 * f, 'fechado': f > 0.3, 'boca': 0.5, 'chapeu_y': 9 * f, 'abre_chapeu': 4 * f, 'y': 0, 'esporos': nuvem(X0, 60, int(3 + 6 * f), 16, 21) if f > 0.3 else None}
                    for f in (0.15, 0.4, 0.65, 0.88, 1.0)]
    v = []
    for f, cint in ((0.5, None), (1.0, [(X0 + 24, 26, 2)]), (0.6, [(X0 + 26, 22, 3), (X0 - 24, 30, 2)]), (0.0, [(X0 - 20, 24, 2)])):
        v.append({'y': -9 * f, 'estica': 0.7 * f - 0.3 * (1 - f), 'boca': 0.8, 'brava': 0.0, 'mao_f': (-6, -7 * f), 'mao_t': (6, -7 * f), 'cintilas': cint,
                  'pontinhos': [(X0 - 16 + 30 * f, 40), (X0 + 10, 30 + 6 * f)]})
    a['vitoria'] = v
    return a


TEMPOS = {'parado': 170, 'preparo': 95, 'golpe': 70, 'dano': 90, 'derrota': 130, 'vitoria': 140}


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
    _, meta = gravar_folha('cogumelo', quadros, TEMPOS, DESTINO, ANCORA)
    print('gravado cogumelo', meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
