#!/usr/bin/env python3
"""Herói do Orto Questões em pixel art chibi (14/10/2026).

Pedido do Tales, com referência anexada na conversa ("Chibi como a 3ª"): cavaleiro chibi de elmo
grande e redondo, fechado, com viseira, pluma vermelha curta, capa vermelha, armadura de aço em
poucos tons, contorno escuro e corpo pequeno. Olha para a direita (para o adversário).

Tudo é desenhado em resolução nativa (1 pixel = 1 pixel do jogo): cada peça é uma forma simples
pintada em faixas de tom (luz de cima e da esquerda) e ganha o próprio contorno; as peças são
empilhadas de trás para a frente. Nada de imagem baixada ou gerada.

    python3 scripts/sprites/cavaleiro_chibi.py                  # grava heroi-1..6 em public/flashcards/sprites/
    python3 scripts/sprites/cavaleiro_chibi.py --previa x.png   # prévia ampliada (estágios × quadros)
    python3 scripts/sprites/cavaleiro_chibi.py --mascote        # mascote grande em public/mascote/
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from motor import gravar_folha  # noqa: E402

RAIZ = AQUI.parents[1]
DESTINO = RAIZ / 'public' / 'flashcards' / 'sprites'

W, H = 64, 64          # tela de desenho
WQ, MARGEM = 80, 8     # quadro gravado: mais largo, para caber o herói caído
ANCORA = (31 + MARGEM, 60)


def hx(c):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


# paletas curtas, do escuro ao claro (estilo da referência: 4 a 5 tons por material)
PAL = {
    'aco': ['#262b36', '#465061', '#77839a', '#adb8c8', '#e4eaf1'],
    'aco_esc': ['#1f242e', '#3a414e', '#5e6878', '#8a95a5', '#b6c0cc'],
    'perola': ['#5d5850', '#958f84', '#cbc5b8', '#ece8df', '#ffffff'],
    'vermelho': ['#3e0a10', '#76141c', '#ad2229', '#d9403d', '#f2735e'],
    'ouro': ['#5a3708', '#94621a', '#cf9a32', '#f2cd5c', '#fff0b0'],
    'couro': ['#2a170c', '#4d2d17', '#734424', '#986136', '#b98250'],
    'madeira': ['#331d0d', '#5a3519', '#835227', '#a86f38', '#c58f52'],
    'visor': ['#0c0e14', '#171b24', '#262c38', '#262c38', '#262c38'],
    'lamina': ['#4f6d93', '#8fb3d8', '#cfe6fa', '#f0f8ff', '#ffffff'],
}
PAL = {k: [hx(c) for c in v] for k, v in PAL.items()}
CONTORNO = hx('#161821')
CONTORNO_VERM = hx('#2a0609')


def desloca(m, dy, dx):
    out = np.zeros_like(m)
    h, w = m.shape[:2]
    ys = slice(max(dy, 0), h + min(dy, 0)); ys0 = slice(max(-dy, 0), h + min(-dy, 0))
    xs = slice(max(dx, 0), w + min(dx, 0)); xs0 = slice(max(-dx, 0), w + min(-dx, 0))
    out[ys, xs] = m[ys0, xs0]
    return out


class Tela:
    def __init__(self):
        self.cor = np.zeros((H, W, 3), np.uint8)
        self.a = np.zeros((H, W), bool)

    def colar(self, peca: 'Peca', contorno=True):
        m, c = peca.m, peca.c
        if contorno:
            borda = np.zeros_like(m)
            for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                borda |= desloca(m, dy, dx)
            borda &= ~m
            self.cor[borda] = peca.contorno
            self.a |= borda
        self.cor[m] = c[m]
        self.a |= m

    def rgba(self):
        out = np.zeros((H, W, 4), np.uint8)
        out[..., :3] = self.cor
        out[..., 3] = np.where(self.a, 255, 0)
        return out


class Peca:
    def __init__(self, contorno=CONTORNO):
        self.m = np.zeros((H, W), bool)
        self.c = np.zeros((H, W, 3), np.uint8)
        self.contorno = contorno

    def pinta(self, mascara, pal, tons):
        """tons: matriz de índices (0..4) já calculados para cada pixel."""
        p = np.array(PAL[pal], np.uint8)
        t = np.clip(tons, 0, len(PAL[pal]) - 1).astype(int)
        self.c[mascara] = p[t][mascara]
        self.m |= mascara
        return self


YY, XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5


def poli(pts):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon([(x, y) for x, y in pts], fill=255)
    return np.asarray(im) > 0


def linha(p0, p1, larg):
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).line([tuple(p0), tuple(p1)], fill=255, width=larg)
    return np.asarray(im) > 0


def elipse_m(cx, cy, rx, ry):
    return ((XX - cx) / rx) ** 2 + ((YY - cy) / ry) ** 2 <= 1.0


def faixas_esfera(cx, cy, rx, ry, base=0.0):
    """Tons em faixas de uma esfera iluminada de cima-esquerda: 0 sombra … 4 brilho."""
    nx, ny = (XX - cx) / rx, (YY - cy) / ry
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    l = (-0.55 * nx - 0.6 * ny + 0.58 * nz) + base
    t = np.select([l > 1.02, l > 0.62, l > 0.18, l > -0.3], [4, 3, 2, 1], 0)
    return t


def faixas_plano(y0, y1, x0, x1, base=2):
    """Bloco: borda de cima clara, lado direito escuro."""
    t = np.full((H, W), base)
    t = np.where(YY - y0 < 1.5, base + 1, t)
    t = np.where(XX > x1 - 2, base - 1, t)
    return t


# ------------------------------------------------------------------ estágios
ESTAGIOS = {
    1: dict(metal='aco', capa=0, pluma=1, escudo='madeira', ouro=False, cinto='couro', lamina=13),
    2: dict(metal='aco', capa=0, pluma=2, escudo='aco', ouro=False, cinto='vermelho', lamina=15),
    3: dict(metal='aco', capa=1, pluma=2, escudo='aco', ouro=False, cinto='vermelho', lamina=16),
    4: dict(metal='aco', capa=2, pluma=3, escudo='aco', ouro=True, cinto='vermelho', lamina=17),
    5: dict(metal='aco', capa=2, pluma=3, escudo='ouro', ouro=True, cinto='vermelho', lamina=18, ouro2=True),
    6: dict(metal='perola', capa=2, pluma=3, escudo='ouro', ouro=True, cinto='vermelho', lamina=19, lenda=True, ouro2=True),
}


def R(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s], [s, c]])


def quadro(e: int, t: dict) -> np.ndarray:
    E = ESTAGIOS[e]
    k = t.get
    met = E['metal']
    tela = Tela()
    dx, dy = k('x', 0), k('y', 0)           # corpo inteiro
    bob = k('bob', 0)                        # respiração (só tronco e cabeça)
    inc = k('inclina', 0)                    # cabeça/tronco para a frente (+) ou para trás (-)

    # pontos-chave (repouso), corpo voltado para a direita
    quad = np.array([31 + dx, 47 + dy + bob * 0.5])
    ombro_t = np.array([35 + dx + inc, 37 + dy + bob])      # ombro do escudo (lado direito)
    ombro_f = np.array([24 + dx + inc, 37 + dy + bob])      # ombro da espada (lado esquerdo da imagem)
    cabeca = np.array([31 + dx + inc * 1.6, 23 + dy + bob])

    # ---- capa (atrás de tudo)
    if E['capa']:
        sw = k('capa', 0)
        comp = 16 if E['capa'] == 1 else 21
        top = np.array([cabeca[0] - 0.5, cabeca[1] + 13])
        abre = 11 if E['capa'] == 1 else 14
        pts = [top + (-9, -1), top + (9, -1), top + (abre - 1 + sw * 0.4, comp - 2), top + (abre - 3 + sw, comp),
               top + (2 + sw, comp - 1.5), top + (-3 + sw, comp + 0.5), top + (-abre + sw * 1.2, comp - 1), top + (-abre + 1 + sw * 0.8, comp - 3)]
        m = poli([tuple(p) for p in pts])
        tn = np.where(XX < top[0] - 3 + sw * 0.5, 1, 2) + np.where(YY - top[1] < 2.5, 1, 0)
        dobra = (np.abs(((XX - top[0] - sw * (YY - top[1]) / comp) % 5) - 2.5) < 0.6) & (YY - top[1] > 4)
        tn = np.where(dobra, tn - 1, tn)
        tela.colar(Peca(CONTORNO_VERM).pinta(m, 'vermelho', tn))

    # ---- braço de trás e escudo (o escudo fica na frente do corpo, mas o braço atrás)
    mao_t = ombro_t + np.array(k('mao_t', (2, 7)))
    braco_t = Peca().pinta(linha(ombro_t, mao_t, 4), 'aco_esc' if met == 'aco' else met, np.full((H, W), 2))

    # ---- pernas
    pe_t = np.array([27 + dx, 59 + dy]) + np.array(k('pe_t', (0, 0)))
    pe_f = np.array([35 + dx, 59 + dy]) + np.array(k('pe_f', (0, 0)))
    for qx, pe, nome in ((-2.5, pe_t, 't'), (2.5, pe_f, 'f')):
        q = quad + (qx, 0)
        perna = linha(q, pe + (0, -2), 5)
        pp = Peca().pinta(perna, 'aco_esc' if nome == 't' else met, faixas_plano(q[1], pe[1], pe[0] - 2, pe[0] + 3, 2 if nome == 'f' else 1))
        # bota: biqueira para a direita
        bota = poli([tuple(pe + (-3, -3)), tuple(pe + (2, -3)), tuple(pe + (4.5, -1)), tuple(pe + (4.5, 0.5)), tuple(pe + (-3, 0.5))])
        pp.pinta(bota, 'aco_esc' if nome == 't' else met, np.where(YY < pe[1] - 1.5, 2, 1))
        # joelheira
        jo = (q + pe) / 2 + (0.5, 0)
        pp.pinta(elipse_m(jo[0], jo[1], 2.2, 1.8), 'ouro' if E.get('ouro2') else met, faixas_esfera(jo[0], jo[1], 2.2, 1.8) if nome == 'f' else np.full((H, W), 2))
        tela.colar(pp)

    tela.colar(braco_t)

    # ---- tronco: peitoral, cinto, saiote
    tx, ty = cabeca[0] - 0.5, 36 + dy + bob
    tronco = Peca()
    corpo = poli([(tx - 7, ty), (tx + 7, ty), (tx + 7.5, ty + 7), (tx + 6, ty + 11), (tx - 6, ty + 11), (tx - 7.5, ty + 7)])
    tronco.pinta(corpo, met, faixas_esfera(tx - 1, ty + 4, 9, 8, 0.15))
    saiote = poli([(tx - 6.5, ty + 10), (tx + 6.5, ty + 10), (tx + 7.5, ty + 13.5), (tx - 7.5, ty + 13.5)])
    tronco.pinta(saiote, met, np.where(XX > tx + 3, 1, 2))
    cinto = (YY >= ty + 9) & (YY < ty + 11) & corpo
    tronco.pinta(cinto, E['cinto'], np.where(XX < tx - 2, 3, 2))
    if E['ouro']:
        fivela = (np.abs(XX - tx) < 1.2) & (YY >= ty + 9) & (YY < ty + 11)
        tronco.pinta(fivela, 'ouro', np.full((H, W), 3))
    tela.colar(tronco)

    # ---- escudo (na frente do corpo, do lado do adversário)
    ec = mao_t + np.array([3, 0]) + np.array(k('escudo', (0, 0)))
    tam = 1.0 if E['escudo'] != 'madeira' else 0.86
    sx, sy = 6.0 * tam, 8.0 * tam
    forma = poli([tuple(ec + (-sx, -sy)), tuple(ec + (sx, -sy)), tuple(ec + (sx, sy * 0.25)), tuple(ec + (0, sy * 1.15)), tuple(ec + (-sx, sy * 0.25))])
    esc = Peca()
    if E['escudo'] == 'madeira':
        tn = 2 + ((XX - ec[0]) // 3 % 2 == 0)
        esc.pinta(forma, 'madeira', np.where(XX > ec[0] + sx - 2, 1, tn))
    else:
        borda = forma & ~poli([tuple(ec + (-sx + 1.2, -sy + 1.2)), tuple(ec + (sx - 1.2, -sy + 1.2)), tuple(ec + (sx - 1.2, sy * 0.2)), tuple(ec + (0, sy * 1.15 - 1.6)), tuple(ec + (-sx + 1.2, sy * 0.2))])
        campo = forma & ~borda
        esc.pinta(campo, met if E['escudo'] != 'ouro' else met, np.where(XX < ec[0] - 1, 3, 2) - (YY > ec[1] + 3))
        esc.pinta(borda, 'ouro' if E['escudo'] == 'ouro' or E['ouro'] else 'aco_esc', np.where(YY < ec[1] - sy + 1.5, 4, 2))
        if E['ouro']:
            cruz = ((np.abs(XX - ec[0]) < 1.0) & (np.abs(YY - ec[1] + 0.5) < sy * 0.7)) | ((np.abs(YY - ec[1] + 2) < 1.0) & (np.abs(XX - ec[0]) < sx * 0.6))
            esc.pinta(cruz & campo, 'ouro', np.where(XX < ec[0], 4, 3))
        else:
            cruz = ((np.abs(XX - ec[0]) < 1.0) & (np.abs(YY - ec[1] + 0.5) < sy * 0.7)) | ((np.abs(YY - ec[1] + 2) < 1.0) & (np.abs(XX - ec[0]) < sx * 0.6))
            esc.pinta(cruz & campo, 'vermelho', np.full((H, W), 2))
    tela.colar(esc)

    # ---- cabeça: elmo grande e redondo, fechado, com viseira
    cx, cy = cabeca
    rx, ry = 11.5, 11.0
    elmo = Peca()
    dom = elipse_m(cx, cy, rx, ry)
    elmo.pinta(dom, met, faixas_esfera(cx, cy, rx, ry))
    # friso central (crista) do elmo, de cima até a viseira, deslocado para a direita (3/4)
    friso = (np.abs(XX - (cx + 3.5)) < 0.9) & (YY < cy + 1) & dom
    elmo.pinta(friso, 'ouro' if E['ouro'] else met, np.full((H, W), 3 if E['ouro'] else 4))
    # viseira: placa da frente (lado direito), com fenda dos olhos e respiros
    placa = elipse_m(cx + 4.5, cy + 3.2, 6.6, 6.2) & dom
    elmo.pinta(placa, met, faixas_esfera(cx + 4, cy + 2, 7.5, 7.5, -0.05))
    miolo = elipse_m(cx + 4.5, cy + 3.2, 5.6, 5.2)
    elmo.pinta(placa & ~miolo & (XX < cx + rx - 1.2), met, np.full((H, W), 1))
    fenda = (YY >= cy + 0.5) & (YY < cy + 2.5) & (XX > cx - 0.5) & (XX < cx + rx - 0.5) & dom
    elmo.pinta(fenda, 'visor', np.full((H, W), 0))
    fenda_v = (np.abs(XX - (cx + 3.5)) < 0.9) & (YY >= cy + 2.5) & (YY < cy + 7.5) & dom
    elmo.pinta(fenda_v, 'visor', np.full((H, W), 1))
    for i in range(3):   # respiros
        elmo.pinta((np.abs(XX - (cx + 6.5 + i * 1.6)) < 0.5) & (np.abs(YY - (cy + 5.5)) < 0.5) & dom, 'visor', np.full((H, W), 1))
    # gola (gorjal) embaixo do elmo
    gola = elipse_m(cx, cy + ry - 0.5, 6, 2.2) & ~dom
    elmo.pinta(gola, met, np.full((H, W), 1))
    if E['ouro']:
        aba = (np.abs(YY - (cy + ry - 2.6)) < 0.8) & dom
        elmo.pinta(aba, 'ouro', np.where(XX < cx, 4, 2))

    # pluma vermelha curta, para trás
    if E['pluma']:
        sw = k('pluma', 0)
        alt = {1: 4, 2: 6, 3: 8}[E['pluma']]
        base_p = np.array([cx + 1, cy - ry + 1])
        pts = [base_p + (-1, 1), base_p + (2, 0), base_p + (1, -alt * 0.6), base_p + (-2 + sw * 0.4, -alt),
               base_p + (-6 + sw, -alt + 1), base_p + (-8 + sw, -alt * 0.45), base_p + (-5 + sw * 0.5, -alt * 0.5), base_p + (-3, -1)]
        m = poli([tuple(p) for p in pts])
        tn = np.where(YY < base_p[1] - alt * 0.6, 3, 2) + np.where(XX > base_p[0] - 1, 1, 0)
        pl = Peca(CONTORNO_VERM).pinta(m, 'vermelho', tn)
        tela.colar(pl)
    tela.colar(elmo)

    # ---- braço da frente e espada
    mao_f = ombro_f + np.array(k('mao_f', (-1, 8)))
    ang = k('espada', 2.15)      # direção da lâmina (radianos, 0 = para a direita, cresce para baixo)
    d = np.array([math.cos(ang), math.sin(ang)])
    n = np.array([-d[1], d[0]])
    L = E['lamina']
    pomo = mao_f - d * 3
    base = mao_f + d * 2
    ponta = base + d * L
    espada = Peca()
    lam = 'lamina' if E.get('lenda') else 'aco'
    espada.pinta(linha(base, ponta, 3), lam, np.full((H, W), 3))
    espada.pinta(linha(base + n * 0.6, ponta + n * 0.6, 1), lam, np.full((H, W), 4))
    espada.pinta(linha(mao_f - n * 3.5 + d * 1.5, mao_f + n * 3.5 + d * 1.5, 2), 'ouro' if E['ouro'] else 'couro', np.full((H, W), 3))
    espada.pinta(linha(pomo, base, 2), 'couro', np.full((H, W), 2))
    espada.pinta(elipse_m(pomo[0], pomo[1], 1.3, 1.3), 'ouro' if E['ouro'] else 'aco_esc', np.full((H, W), 3))
    frente_espada = k('espada_frente', False)
    braco_f = Peca().pinta(linha(ombro_f, mao_f, 4), met, np.full((H, W), 2))
    braco_f.pinta(elipse_m(ombro_f[0], ombro_f[1], 3.2, 2.8), met, faixas_esfera(ombro_f[0], ombro_f[1], 3.2, 2.8))   # ombreira
    if E.get('ouro2'):
        braco_f.pinta(elipse_m(ombro_f[0], ombro_f[1], 3.2, 2.8) & (YY > ombro_f[1] + 1.2), 'ouro', np.full((H, W), 3))
    braco_f.pinta(elipse_m(mao_f[0], mao_f[1], 2.0, 2.0), met, np.full((H, W), 3))  # manopla
    if frente_espada:
        tela.colar(braco_f)
        tela.colar(espada)
    else:
        tela.colar(espada)
        tela.colar(braco_f)

    out = np.zeros((H, WQ, 4), np.uint8)
    out[:, MARGEM:MARGEM + W] = tela.rgba()
    queda = k('queda', 0)
    if queda:   # tomba para trás girando em torno dos pés
        im = Image.fromarray(out, 'RGBA').rotate(queda, resample=Image.NEAREST, center=(ANCORA[0], ANCORA[1] - 1),
                                                 translate=(k('queda_x', 0), k('queda_y', 0)))
        out = np.asarray(im).copy()
    if E.get('lenda'):
        out = aura(out)
    return out


def aura(rgba):
    a = rgba[..., 3] > 0
    halo = np.zeros(a.shape, bool)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if abs(dy) + abs(dx) <= 1:
                halo |= desloca(a, dy, dx)
    halo &= ~a
    out = rgba.copy()
    out[halo, :3] = (255, 214, 120)
    out[halo, 3] = 90
    return out


# ------------------------------------------------------------------ poses
def poses():
    a = {}
    a['parado'] = [{'bob': b, 'pluma': p, 'capa': c} for b, p, c in ((0, 0, 0), (0, 0.5, 0.5), (1, 1, 1), (1, 0.5, 0.5))]
    # preparo: ergue a espada por cima do ombro
    a['preparo'] = [{'mao_f': (-1 + 0 * f, 8 - 15 * f), 'espada': 2.15 - 3.6 * f, 'inclina': -1 * f, 'pluma': f, 'capa': 0.5 * f} for f in (0.35, 0.7, 1.0)]
    g = []
    for f in (0.0, 0.3, 0.6, 1.0, 0.85, 0.6):
        s = min(1.0, f / 0.6)
        g.append({'mao_f': (-1 + 14 * s, -7 + 13 * s), 'espada': -1.45 + 2.0 * s, 'x': 5 * s, 'inclina': -1 + 3 * s,
                  'pe_f': (4 * s, 0), 'pluma': 1 - 2.2 * s, 'capa': -1.5 * s, 'espada_frente': True})
    a['golpe'] = g
    a['dano'] = [{'x': -3 * f, 'inclina': -2 * f, 'pluma': 1.5 * f, 'capa': 1.5 * f, 'mao_t': (2, 7 - 2 * f), 'escudo': (-1 * f, -1 * f), 'mao_f': (-2 * f, 8)} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'inclina': -1.5 * f, 'mao_f': (-1 - 3 * f, 8 - 4 * f), 'espada': 2.15 + 0.9 * f, 'pluma': -f, 'capa': -0.8 * f,
                     'queda': 84 * f, 'queda_x': 10 * f, 'queda_y': -11 * f} for f in (0.15, 0.4, 0.7, 0.92, 1.0)]
    a['vitoria'] = [{'mao_f': (1, 8 - 19 * f), 'espada': 2.15 - (2.15 + 1.6) * f, 'bob': -1 * f, 'pluma': 0.6 * f, 'capa': 1 * f, 'espada_frente': True} for f in (0.4, 0.8, 1.0, 0.9)]
    return a


TEMPOS = {'parado': 260, 'preparo': 95, 'golpe': 70, 'dano': 90, 'derrota': 140, 'vitoria': 160}


def principal() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--previa')
    ap.add_argument('--anim', default='parado')
    ap.add_argument('--escala', type=int, default=6)
    ap.add_argument('--estagios', default='1,2,3,4,5,6')
    ap.add_argument('--so', type=int)
    ap.add_argument('--mascote', action='store_true')
    a = ap.parse_args()
    est = [int(x) for x in a.estagios.split(',')]
    if a.previa:
        nomes = a.anim.split(',')
        lin = [(e, nm, p) for e in est for nm in nomes for p in ([poses()[nm][a.so]] if a.so is not None else poses()[nm])]
        colunas = max(len(poses()[nm]) for nm in nomes) if a.so is None else 1
        linhas = len(est) * len(nomes)
        img = Image.new('RGBA', (WQ * colunas, H * linhas), (140, 140, 140, 255))
        i = 0
        for li, e in enumerate(est):
            for nj, nm in enumerate(nomes):
                lista = [poses()[nm][a.so]] if a.so is not None else poses()[nm]
                for ci, pz in enumerate(lista):
                    img.alpha_composite(Image.fromarray(quadro(e, pz), 'RGBA'), (ci * WQ, (li * len(nomes) + nj) * H))
        img.resize((img.width * a.escala, img.height * a.escala), Image.NEAREST).save(a.previa)
        print('prévia:', a.previa)
        return 0
    if a.mascote:
        dest = RAIZ / 'public' / 'mascote'
        dest.mkdir(parents=True, exist_ok=True)
        for e in (4, 6):
            q = Image.fromarray(quadro(e, poses()['parado'][0]), 'RGBA')
            q = q.crop(q.getbbox())
            q.resize((q.width * 8, q.height * 8), Image.NEAREST).save(dest / f'heroi-{e}.png', optimize=True)
        print('mascote em', dest)
        return 0
    for e in est:
        quadros = {nome: [quadro(e, p) for p in v] for nome, v in poses().items()}
        _, meta = gravar_folha(f'heroi-{e}', quadros, TEMPOS, DESTINO, ANCORA)
        print('gravado heroi-%d' % e, meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
