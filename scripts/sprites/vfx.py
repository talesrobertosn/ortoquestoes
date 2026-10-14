#!/usr/bin/env python3
"""Efeitos de golpe em pixel art (autorais), pintados quadro a quadro.

Referência de direção: o pixel art quente do Stardew Valley — formas gordas e
legíveis, poucas cores por efeito, contorno colorido (nunca preto puro),
brilho branco só no miolo e quadros de "esfregão" (smear) nos golpes rápidos.

Cada efeito vira uma tira horizontal em public/flashcards/vfx/<nome>.png e o
índice em src/flashcards/efeitos/vfxIndice.ts (largura, altura, quadros, ms,
âncora). O palco desenha em escala inteira, sem suavização.

    python3 scripts/sprites/vfx.py            # gera tudo
    python3 scripts/sprites/vfx.py --previa   # folha de contato em docs/flashcards/conceitos/
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
DESTINO = RAIZ / 'public' / 'flashcards' / 'vfx'
INDICE = RAIZ / 'src' / 'flashcards' / 'efeitos' / 'vfxIndice.ts'
PREVIA = RAIZ / 'docs' / 'flashcards' / 'conceitos'

AL = np.random.default_rng(14)


def cor(h: str):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


class Q:
    """Um quadro: RGBA uint8 e utilitários de pintura por máscara."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), np.uint8)
        self.y, self.x = np.mgrid[0:h, 0:w].astype(np.float32) + 0.5

    def pinta(self, m, c):
        self.a[m] = cor(c) if isinstance(c, str) else c

    def sob(self, m, c):
        """Pinta só onde ainda está vazio."""
        self.pinta(m & (self.a[..., 3] == 0), c)

    def cheio(self):
        return self.a[..., 3] > 0

    def contorno(self, c, diagonais=False, so=None):
        """Contorno colorido de 1 px por fora (estilo Stardew: tom escuro da própria cor)."""
        f = self.cheio() if so is None else so
        v = np.zeros_like(f)
        v[1:] |= f[:-1]; v[:-1] |= f[1:]; v[:, 1:] |= f[:, :-1]; v[:, :-1] |= f[:, 1:]
        if diagonais:
            v[1:, 1:] |= f[:-1, :-1]; v[1:, :-1] |= f[:-1, 1:]; v[:-1, 1:] |= f[1:, :-1]; v[:-1, :-1] |= f[1:, 1:]
        self.pinta(v & ~self.cheio(), c)

    def miolo(self):
        """Pixels internos (os 4 vizinhos cheios)."""
        f = self.cheio()
        m = f.copy()
        m[1:] &= f[:-1]; m[:-1] &= f[1:]; m[:, 1:] &= f[:, :-1]; m[:, :-1] &= f[:, 1:]
        m[0] = m[-1] = False; m[:, 0] = m[:, -1] = False
        return m

    def borda(self):
        return self.cheio() & ~self.miolo()

    def apaga(self, m):
        self.a[m] = 0

    def girar(self, ang, centro=None):
        """Rotação por vizinho mais próximo (mantém o pixel duro)."""
        cx, cy = centro or (self.w / 2, self.h / 2)
        c, s = math.cos(-ang), math.sin(-ang)
        xs = (self.x - cx) * c - (self.y - cy) * s + cx
        ys = (self.x - cx) * s + (self.y - cy) * c + cy
        xi, yi = np.floor(xs).astype(int), np.floor(ys).astype(int)
        ok = (xi >= 0) & (xi < self.w) & (yi >= 0) & (yi < self.h)
        n = np.zeros_like(self.a)
        n[ok] = self.a[yi[ok], xi[ok]]
        self.a = n
        return self


def bayer(n=4):
    m = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16
    return m


def dither(q: Q, limiar: float):
    """Máscara que some aos poucos (dissolve em padrão de Bayer, sem ruído sujo)."""
    b = bayer()
    yi, xi = q.y.astype(int) % 4, q.x.astype(int) % 4
    return b[yi, xi] < limiar


def ruido2(x, y, s=1.0, semente=0):
    """Ruído de valor suave e barato (para línguas de fogo e bordas irregulares)."""
    def h(ix, iy):
        v = np.sin(ix * 127.1 + iy * 311.7 + semente * 74.7) * 43758.5453
        return v - np.floor(v)
    x, y = x * s, y * s
    ix, iy = np.floor(x), np.floor(y)
    fx, fy = x - ix, y - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b, c, d = h(ix, iy), h(ix + 1, iy), h(ix, iy + 1), h(ix + 1, iy + 1)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


def nivel(t, rampa):
    """Escolhe a cor da rampa (0 = miolo claro, 1 = borda escura) por faixa."""
    i = np.clip((t * len(rampa)).astype(int), 0, len(rampa) - 1)
    return i


def pinta_rampa(q: Q, mascara, t, rampa):
    i = nivel(t, rampa)
    for k, c in enumerate(rampa):
        q.pinta(mascara & (i == k), c)


# ------------------------------------------------------------------ paletas
# miolo -> borda; a última cor é o contorno colorido
PAL = {
    'azul': ['#ffffff', '#dff6ff', '#8fd3ff', '#4a8fe0', '#2f4fa8'],
    'ouro': ['#ffffff', '#fff4b8', '#ffcf4a', '#ec8a1c', '#9a3c12'],
    'fogo': ['#ffffff', '#ffe6a0', '#ffa23c', '#e04a1e', '#7a1e14'],
    'arcano': ['#ffffff', '#f2e0ff', '#c88cff', '#8048d8', '#40208a'],
    'sangue': ['#ffffff', '#ffd8c8', '#ff6a4a', '#c8241e', '#5e0e14'],
    'fatuo': ['#ffffff', '#e4fdff', '#7fe6ff', '#2a92d8', '#1a3a86'],
    'escarlate': ['#ffffff', '#fff0a0', '#ffb43c', '#f0501e', '#7a1a10'],
    'ancestral': ['#ffffff', '#fbe4ff', '#d88cff', '#9a3ad0', '#46147a'],
    'veneno': ['#f6ffd8', '#c8ff7a', '#7ae04a', '#2f9a3a', '#16502e'],
    'eletrico': ['#ffffff', '#fffbc0', '#ffe94a', '#5fb0ff', '#26408e'],
    'gosma': ['#f2fff4', '#b8f7c8', '#6fdc94', '#2f9a6a', '#175040'],
    'acida': ['#fbffe0', '#e6f77a', '#b6d83a', '#6e9a24', '#384e14'],
    'rainha': ['#fff0fb', '#ffc0e6', '#f27ac2', '#b03a8e', '#5a1a52'],
}


# ================================================================== golpes do herói

def corte(pal, n=7, R=26, T=11, W=64):
    """Meia-lua de corte (smear): nasce gorda, varre e se desfaz em pixels."""
    quadros = []
    cabeca = [0.30, 0.72, 1.0, 1.0, 1.0, 1.0, 1.0]
    cauda = [0.0, 0.0, 0.04, 0.22, 0.42, 0.60, 0.76]
    grossura = [0.9, 1.15, 1.1, 0.88, 0.62, 0.44, 0.3]
    a0, a1 = math.radians(-160), math.radians(40)
    for k in range(n):
        q = Q(W, W)
        cx, cy = W / 2, W / 2 + 4
        dx, dy = q.x - cx, q.y - cy
        r = np.hypot(dx, dy)
        th = np.arctan2(dy, dx)
        u = (th - a0) / (a1 - a0)
        dentro = (u >= cauda[k]) & (u <= cabeca[k])
        # a lâmina é mais grossa perto da cabeça (de onde a espada está passando)
        rel = np.clip((u - cauda[k]) / max(0.05, cabeca[k] - cauda[k]), 0, 1)
        t = T * grossura[k] * (0.25 + 0.75 * np.sin(np.clip(rel, 0, 1) * math.pi * 0.62) ** 0.8)
        m = dentro & (r <= R) & (r >= R - t)
        prof = (R - r) / np.maximum(t, 1)
        if k >= 5:
            m &= ~dither(q, (k - 4) * 0.3) | (prof < 0.35)
        pinta_rampa(q, m, prof * 0.98, pal[:4])
        # fio de luz: a borda de fora é branca contínua
        q.pinta(m & (prof < 0.16), pal[0])
        q.contorno(pal[4])
        # linhas de velocidade por dentro do arco (o vento da espada)
        if 1 <= k <= 4:
            for off, ini, fim in ((4, 0.25, 0.85), (8, 0.45, 0.8)):
                rr = R - T * grossura[k] - off + 2
                ln = (np.abs(r - rr) <= 0.55) & (u >= max(cauda[k], cabeca[k] - ini)) & (u <= cabeca[k] - (1 - fim) * 0.3)
                q.sob(ln & dither(q, 0.75 if off == 4 else 0.5), pal[2])
        # fagulhas que escapam da cabeça
        if 1 <= k <= 4:
            ang = a0 + (a1 - a0) * cabeca[k]
            for j in range(3 + k):
                rr = R + 2 + AL.integers(0, 6)
                aa = ang - AL.random() * 0.9
                px, py = int(cx + rr * math.cos(aa)), int(cy + rr * math.sin(aa))
                if 0 <= px < W - 1 and 0 <= py < W - 1:
                    q.a[py, px] = cor(pal[1] if j % 2 else pal[0])
        quadros.append(q.a)
    return quadros


def lamina_voo(pal, n=4, W=36, H=30):
    """A meia-lua de energia que voa do herói até o adversário (aponta para a direita)."""
    quadros = []
    for k in range(n):
        q = Q(W, H)
        cx, cy = 18, H / 2
        R = 13 + (k % 2) * 0.6
        fora = np.hypot((q.x - cx) / 0.85, q.y - cy) <= R
        dentro = np.hypot((q.x - (cx - 8)) / 0.85, q.y - cy) <= R + 1.5
        m = fora & ~dentro & (q.x > 10)
        prof = np.clip((q.x - (cx - 6) - np.sqrt(np.maximum(0, (R + 1) ** 2 - (q.y - cy) ** 2)) * 0.85) / 7, 0, 1)
        pinta_rampa(q, m, 1 - prof, pal[:4])
        q.pinta(m & (prof > 0.72), pal[0])
        q.contorno(pal[4])
        # rastro: tracinhos de vento atrás
        for j, (yy, comp) in enumerate(((cy - 7, 8), (cy, 11), (cy + 7, 8))):
            x0 = 4 - (k * 2 + j * 3) % 5
            yi = int(yy)
            q.a[yi, max(0, x0):x0 + comp] = np.where(q.a[yi, max(0, x0):x0 + comp, 3:4] > 0, q.a[yi, max(0, x0):x0 + comp], cor(pal[2]))
            q.a[yi, max(0, x0):x0 + 3] = cor(pal[1])
        quadros.append(q.a)
    return quadros


def brilhinho(q: Q, x, y, tam, pal):
    """Estrelinha em cruz (a cintilância clássica: miolo branco, braços coloridos)."""
    x, y = int(x), int(y)
    for d in range(-tam, tam + 1):
        for (px, py) in ((x + d, y), (x, y + d)):
            if 0 <= px < q.w and 0 <= py < q.h:
                q.a[py, px] = cor(pal[0] if abs(d) == 0 else pal[1] if abs(d) < tam else pal[2])


def faisca(pal, n=6, W=56):
    """Estrela de impacto: losango, estrela de 4 pontas com raios longos, anel
    fino que abre e cintilas que voam (sem roda nem alvo)."""
    quadros = []
    for k in range(n):
        q = Q(W, W)
        c = W / 2
        dx, dy = np.abs(q.x - c), np.abs(q.y - c)
        if k == 0:
            m = dx + dy <= 6
            q.pinta(m, pal[1]); q.pinta(dx + dy <= 3.5, pal[0])
        elif k <= 2:
            R = [0, 22, 26][k]
            s = np.sqrt(dx / R) + np.sqrt(dy / R)
            m = s <= 1
            pinta_rampa(q, m, s ** 1.4, pal[:4])
            # estrela menor a 45 graus
            ex, ey = np.abs((q.x - c) + (q.y - c)) / 1.414, np.abs((q.x - c) - (q.y - c)) / 1.414
            R2 = R * 0.48
            s2 = np.sqrt(ex / R2) + np.sqrt(ey / R2)
            q.sob(s2 <= 1, pal[2])
            q.sob((s2 <= 0.75), pal[1])
        else:
            # raios se soltam do centro e viram cintilas
            R = 26
            s = np.sqrt(dx / R) + np.sqrt(dy / R)
            r = np.hypot(q.x - c, q.y - c)
            m = (s <= 1) & (r >= 6 + (k - 3) * 6) & (r <= 26 - (k - 3) * 3)
            pinta_rampa(q, m, np.clip(s, 0, 0.999), pal[1:4])
            d = [0, 0, 0, 14, 18, 21][k]
            for sx in (-1, 1):
                for sy in (-1, 1):
                    brilhinho(q, c + sx * d * 0.72, c + sy * d * 0.72, 2 if k < 5 else 1, pal)
        q.contorno(pal[4])
        # anel fino que abre (desenhado por cima, sem contorno, para não virar roda)
        if k in (2, 3):
            r = np.hypot(q.x - c, q.y - c)
            anel = np.abs(r - (15 if k == 2 else 21)) <= 0.55
            if k == 3:
                anel &= dither(q, 0.5)
            q.sob(anel, pal[1] if k == 2 else pal[2])
        quadros.append(q.a)
    return quadros


def espada(n=4):
    """A espada gigante do crítico (a mesma do cavaleiro: aço, guarda de ouro e gema).
    Aponta para a direita; o brilho corre pela lâmina quadro a quadro."""
    W, H = 132, 30
    aco = ['#ffffff', '#e4edf8', '#b7c5da', '#7c8ca8', '#46506e']
    ouro = ['#fff4c0', '#ffd25a', '#e0901e', '#9a4e12']
    couro = ['#c0844a', '#8a5226', '#5a3016']
    quadros = []
    for k in range(n):
        q = Q(W, H)
        cy = H / 2
        # lâmina: de x=34 até a ponta em x=128, afinando nos últimos 18 px
        x0, x1 = 34, 128
        meia = np.where(q.x < x1 - 18, 5.5, 5.5 * np.clip((x1 - q.x) / 18, 0, 1) ** 0.9)
        lam = (q.x >= x0) & (q.x <= x1) & (np.abs(q.y - cy) <= meia)
        sup = lam & (q.y < cy)
        q.pinta(lam, aco[2])
        q.pinta(sup, aco[1])
        q.pinta(lam & (q.y >= cy + meia - 1.5), aco[3])
        q.pinta(lam & (q.y < cy - meia + 1.6), aco[0])
        # sulco central
        sulco = (q.x >= x0 + 2) & (q.x <= x1 - 24) & (np.abs(q.y - cy) < 1)
        q.pinta(sulco, aco[3])
        q.pinta(sulco & (q.y < cy), '#5c6c8c')
        # guarda (cruz) de ouro
        guarda = (q.x >= 28) & (q.x < 34) & (np.abs(q.y - cy) <= 12)
        q.pinta(guarda, ouro[1])
        q.pinta(guarda & (q.x < 30), ouro[0])
        q.pinta(guarda & (q.x >= 32), ouro[2])
        q.pinta(guarda & (np.abs(q.y - cy) >= 11), ouro[2])
        # pontas da guarda em gota
        for sy in (-1, 1):
            m = np.hypot(q.x - 31, q.y - (cy + sy * 12)) <= 2.6
            q.pinta(m, ouro[1]); q.pinta(m & (q.x < 31) & (q.y * sy < (cy + sy * 12) * sy), ouro[0])
        # punho trançado
        punho = (q.x >= 12) & (q.x < 28) & (np.abs(q.y - cy) <= 3)
        q.pinta(punho, couro[1])
        q.pinta(punho & (((q.x.astype(int) + (q.y.astype(int))) % 4) < 2), couro[0])
        q.pinta(punho & (q.y >= cy + 2), couro[2])
        # pomo com gema vermelha
        pomo = np.hypot(q.x - 8, q.y - cy) <= 5
        q.pinta(pomo, ouro[1])
        q.pinta(pomo & (q.x + q.y < 8 + cy - 2), ouro[0])
        gema = np.hypot(q.x - 8, q.y - cy) <= 2.6
        q.pinta(gema, '#d8283a'); q.pinta(gema & (q.x < 8) & (q.y < cy), '#ff9aa8')
        q.contorno('#2a2440')
        # brilho correndo: faixa diagonal branca
        bx = x0 + (k / max(1, n - 1)) * (x1 - x0 - 8)
        faixa = lam & (np.abs((q.x - bx) + (q.y - cy) * 0.8) < 2.2)
        q.pinta(faixa, aco[0])
        if k == n - 1:
            # estrelinha na ponta
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2)):
                px, py = x1 - 3 + dx, int(cy) + dy
                if 0 <= px < W and 0 <= py < H:
                    q.a[py, px] = cor('#ffffff' if abs(dx) + abs(dy) < 2 else '#fff4b8')
        quadros.append(q.a)
    return quadros


# ================================================================== golpes dos adversários

def bola_fogo(pal, n=4, W=44, H=30):
    """Bola de fogo em gota (cabeça à direita) com línguas que tremulam."""
    quadros = []
    for k in range(n):
        q = Q(W, H)
        cx, cy = 31, H / 2
        dx, dy = q.x - cx, q.y - cy
        # campo: círculo + cauda que afina à esquerda, com ruído nas bordas
        cauda = np.clip(-dx / 28, 0, 1)
        raio = 9.5 * (1 - cauda) ** 0.8 + 0.5
        onda = (ruido2(q.x + k * 7, q.y, 0.35, semente=k) - 0.5) * 6 * (0.3 + cauda)
        d = np.hypot(np.maximum(dx, 0) * 1.0, dy + onda * 0.6) - raio
        d = np.where(dx < 0, np.abs(dy + onda) - raio, d)
        m = (d <= 0) & (q.x > 2)
        prof = np.clip(1 + d / 9, 0, 1) * 0.55 + cauda * 0.55
        pinta_rampa(q, m, prof, pal[:4])
        q.contorno(pal[4])
        # brasas soltas atrás
        for j in range(4):
            px = int(4 + AL.integers(0, 14)); py = int(cy + AL.integers(-8, 9))
            q.a[py, px] = cor(pal[2] if j % 2 else pal[1])
        quadros.append(q.a)
    return quadros


def labareda(pal, n=7, W=36):
    """Um tufo do sopro: nasce claro e pequeno, cresce, escurece e vira fumaça."""
    quadros = []
    tam = [4, 8, 11, 13, 13, 12, 10]
    for k in range(n):
        q = Q(W, W)
        c = W / 2
        dx, dy = q.x - c, q.y - c - 1
        ang = np.arctan2(dy, dx)
        # bolha de fogo: borda irregular por ruído e línguas que sobem
        borda = 1 + 0.35 * (ruido2(q.x * 0.9, q.y + k * 4, 0.32, semente=3 + k) - 0.5) + 0.1 * np.sin(ang * 3 + k)
        sobe = np.where(dy < 0, 0.62 + 0.25 * ruido2(q.x, q.y, 0.5, semente=11 + k), 1.0)
        r = np.hypot(dx, dy * sobe) / (tam[k] * borda)
        m = r <= 1
        if k >= 4:
            m &= ~dither(q, (k - 3) * 0.2) | (r < 0.4)
        velho = min(1.0, k / 6)
        t = np.clip(r * 0.75 + velho * 0.45, 0, 0.999)
        if k >= 5:
            pinta_rampa(q, m, t, [pal[2], pal[3], '#6a5a6a', '#4a3e4e'])
        else:
            pinta_rampa(q, m, t, pal[:4])
        q.contorno(pal[4] if k < 5 else '#3a2e3e')
        quadros.append(q.a)
    return quadros


def chama_viva(pal, n=6, W=24, H=32):
    """Chama de tocha que dança em laço (o nome em chamas da Biblioteca): base
    redonda e cheia, corpo que afina numa ponta que balança, uma língua menor
    ao lado e o miolo branco-amarelo embaixo, como as fogueiras do Stardew."""
    quadros = []
    for k in range(n):
        q = Q(W, H)
        fase = k / n * 2 * math.pi
        bx, by, br = W / 2, H - 8.5, 6.8
        base = np.hypot(q.x - bx, (q.y - by) * 1.05) <= br
        # corpo: de by para cima, afinando até a ponta; o eixo balança mais em cima
        alto = H - 10
        t = np.clip((by - q.y) / alto, 0, 1)
        eixo = bx + math.sin(fase) * 2.6 * t ** 1.5 + math.sin(fase * 2 + 1) * 0.8 * t
        meia = br * (1 - t) ** 1.25 + 0.3
        corpo = (q.y <= by) & (np.abs(q.x - eixo) <= meia) & (t < 0.97)
        # língua menor que nasce do lado e sobe
        lado = -1 if k % 2 else 1
        tl = np.clip((by - 3 - q.y) / (alto * 0.55), 0, 1)
        eixo2 = bx + lado * (4.2 + 1.5 * tl) + math.sin(fase + 2) * 1.2 * tl
        lingua = (q.y <= by - 2) & (np.abs(q.x - eixo2) <= 2.6 * (1 - tl) ** 1.2) & (tl < 0.95) & (tl > 0)
        m = base | corpo | lingua
        # tons: miolo claro embaixo no centro, escurece para fora e para cima
        d = np.hypot((q.x - bx) / 5.5, (q.y - (by - 2)) / 9.0)
        prof = np.clip(d * 0.62 + t * 0.35, 0, 0.999)
        pinta_rampa(q, m, prof, pal[:4])
        q.contorno(pal[4])
        fy = int(H - 6 - ((k / n) * (H - 6)) % (H - 7)) - 3
        fx = int(bx + math.sin(fase * 2) * 6)
        if 0 <= fy < H and 0 <= fx < W and q.a[fy, fx, 3] == 0:
            q.a[fy, fx] = cor(pal[1])
        quadros.append(q.a)
    return quadros


def pedra(n=4, W=22, base=None):
    """Pedra facetada girando (luz no alto à esquerda, como o resto do jogo)."""
    p = base or ['#f2e6c8', '#cdbb94', '#a08a68', '#6e5c46', '#3e3228']
    quadros = []
    pts = []
    for j in range(8):
        a = j / 8 * 2 * math.pi
        rr = 8.5 + AL.random() * 2.2
        pts.append((rr * math.cos(a), rr * math.sin(a)))
    for k in range(n):
        q = Q(W, W)
        ang = k * math.pi / 2 / n * 1.0 + k * 0.4
        ca, sa = math.cos(ang), math.sin(ang)
        poly = [(x * ca - y * sa + W / 2, x * sa + y * ca + W / 2) for x, y in pts]
        m = dentro_poligono(q, poly)
        # facetas: normal aproximada pela posição relativa à luz
        lx = (q.x - W / 2) / 9; ly = (q.y - W / 2) / 9
        luz = -(lx * 0.7 + ly * 0.7)
        t = np.clip(0.5 - luz * 0.55, 0, 0.999)
        t = np.round(t * 3) / 3 * 0.99
        pinta_rampa(q, m, t, p[:4])
        # riscos e um tufo de musgo (o golem é da floresta)
        q.pinta(m & (np.abs((q.x - W / 2) * sa - (q.y - W / 2) * ca + 1) < 0.6) & (np.abs(q.x - W / 2) < 4), p[3])
        musgo = m & (np.hypot(q.x - (W / 2 - 3 * ca), q.y - (W / 2 - 4)) < 3)
        q.pinta(musgo, '#7ab84a'); q.pinta(musgo & (q.y < W / 2 - 5), '#b6e06a')
        q.contorno(p[4])
        quadros.append(q.a)
    return quadros


def pedregulho(n=4, W=64):
    """O pedregulho do crítico do golem: maior, com rachaduras, musgo e flores."""
    p = ['#f2e6c8', '#cdbb94', '#a08a68', '#6e5c46', '#3e3228']
    pts = []
    for j in range(11):
        a = j / 11 * 2 * math.pi
        rr = 24 + AL.random() * 5
        pts.append((rr * math.cos(a), rr * math.sin(a) * 0.92))
    quadros = []
    for k in range(n):
        q = Q(W, W)
        ang = k * 0.32
        ca, sa = math.cos(ang), math.sin(ang)
        poly = [(x * ca - y * sa + W / 2, x * sa + y * ca + W / 2) for x, y in pts]
        m = dentro_poligono(q, poly)
        lx, ly = (q.x - W / 2) / 26, (q.y - W / 2) / 26
        n2 = np.sqrt(np.clip(1 - lx * lx - ly * ly, 0, 1))
        luz = -0.6 * lx - 0.6 * ly + 0.5 * n2
        fac = ruido2(q.x * ca + q.y * sa, q.y * ca - q.x * sa, 0.18, semente=9) * 0.35
        t = np.clip(0.75 - luz * 0.7 + fac - 0.15, 0, 0.999)
        t = np.floor(t * 4) / 4
        pinta_rampa(q, m, t, p[:4])
        # rachaduras
        for (ax, ay, bx, by) in ((-6, -10, 4, 2), (4, 2, 2, 12), (4, 2, 14, 6), (-14, 4, -6, 8)):
            linha(q, rot(ax, ay, ca, sa, W), rot(bx, by, ca, sa, W), p[4], m)
        # musgo no topo (em relação à pedra), com florzinhas
        topo = m & (((q.x - W / 2) * sa - (q.y - W / 2) * ca) > 14 - 3 * ruido2(q.x, q.y, 0.5, semente=2))
        q.pinta(topo, '#5e9a3a')
        q.pinta(topo & (((q.x - W / 2) * sa - (q.y - W / 2) * ca) > 18), '#8cc84e')
        for fx, fy, fc in ((-6, -20, '#ffe46a'), (5, -21, '#ffffff'), (12, -16, '#ff9ac0')):
            x, y = rot(fx, fy, ca, sa, W)
            x, y = int(x), int(y)
            if m[y, x]:
                q.a[y, x] = cor(fc)
        q.contorno(p[4])
        quadros.append(q.a)
    return quadros


def rot(x, y, ca, sa, W):
    return (x * ca - y * sa + W / 2, x * sa + y * ca + W / 2)


def linha(q: Q, a, b, c, mascara=None):
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1]))) + 1
    for i in range(n + 1):
        t = i / max(1, n)
        x, y = int(a[0] + (b[0] - a[0]) * t), int(a[1] + (b[1] - a[1]) * t)
        if 0 <= x < q.w and 0 <= y < q.h and (mascara is None or mascara[y, x]):
            q.a[y, x] = cor(c)


def dentro_poligono(q: Q, poly):
    m = np.zeros((q.h, q.w), bool)
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        cond = ((y1 > q.y) != (y2 > q.y)) & (q.x < (x2 - x1) * (q.y - y1) / (y2 - y1 + 1e-9) + x1)
        m ^= cond
    return m


def poeira(n=7, W=48, H=32, pal=None):
    """Nuvem de poeira rolando no chão (terremoto, pancada, queda do pedregulho)."""
    p = pal or ['#fff6e0', '#eadcc0', '#c8b48e', '#9a8466', '#6a5a46']
    bolas = [(-10, 4, 7), (0, 0, 9), (10, 3, 7), (-4, 6, 6), (6, 7, 6)]
    quadros = []
    for k in range(n):
        q = Q(W, H)
        cresce = 0.45 + 0.6 * (1 - (1 - k / (n - 1)) ** 2)
        m = np.zeros((H, W), bool)
        luz = np.zeros((H, W), np.float32) + 9
        for bx, by, br in bolas:
            cx, cy = W / 2 + bx * (0.6 + k * 0.1), H - 9 + by * 0.5 - k * 0.7
            rr = br * cresce
            d = np.hypot(q.x - cx, q.y - cy)
            m |= d <= rr
            luz = np.minimum(luz, np.hypot(q.x - (cx - rr * 0.35), q.y - (cy - rr * 0.4)) / max(rr, 1))
        if k >= 3:
            m &= ~dither(q, (k - 2) * 0.17)
        pinta_rampa(q, m, np.clip(luz * 0.7 + k * 0.04, 0, 0.999), p[1:4] if k > 2 else p[:4])
        q.contorno(p[4] if k < 4 else p[3])
        quadros.append(q.a)
    return quadros


def rachadura(n=5, W=150, H=40):
    """Chão rachando a partir do centro (o terremoto do crítico): fendas contínuas
    de 2 px, lábio claro embaixo, placas levantadas e pedrinhas soltas."""
    rng = np.random.default_rng(7)
    ramos = []
    def ramo(x, y, ang, comp, nivel_):
        pts = [(x, y)]
        for _ in range(int(comp)):
            ang += (rng.random() - 0.5) * 0.6
            ang = max(-0.6, min(0.6, ang)) if math.cos(ang) > 0 else ang
            x += math.cos(ang) * 3; y += math.sin(ang) * 1.1
            pts.append((x, y))
            if nivel_ < 2 and rng.random() < 0.12:
                ramo(x, y, ang + (rng.random() - 0.5) * 1.6, comp * 0.4, nivel_ + 1)
        ramos.append((nivel_, pts))
    for a in (0.15, math.pi - 0.15, 0.5, math.pi - 0.45, -0.35, math.pi + 0.3):
        ramo(W / 2, H / 2, a, 20, 0)
    quadros = []
    for k in range(n):
        q = Q(W, H)
        frac = [0.25, 0.6, 1, 1, 1][k]
        cova = np.hypot((q.x - W / 2) / 2.4, q.y - H / 2) <= [4, 6, 7, 6.5, 5][k]
        q.pinta(cova, '#3a2c22')
        q.pinta(cova & (q.y < H / 2 - 1.5), '#20180f')
        for nivel_, pts in ramos:
            parte = pts[:max(2, int(len(pts) * frac))]
            for (x0, y0), (x1, y1) in zip(parte, parte[1:]):
                linha(q, (x0, y0), (x1, y1), '#20180f')
                if nivel_ == 0:
                    linha(q, (x0, y0 + 1), (x1, y1 + 1), '#3a2c22')
        f = q.cheio()
        labio = np.zeros_like(f); labio[1:] = f[:-1]
        q.pinta(labio & ~f, '#e6d4a8')
        # pedrinhas pulando nos primeiros quadros
        if k in (1, 2):
            for j in range(9):
                px = int(W / 2 + rng.integers(-40, 40)); py = int(H / 2 - 3 - k * 3 - rng.integers(0, 8))
                if 0 <= py < H - 1:
                    q.a[py, px] = cor('#cdbb94'); q.a[py + 1, px] = cor('#6e5c46')
        if k >= 3:
            q.apaga(q.cheio() & dither(q, (k - 2) * 0.33))
        quadros.append(q.a)
    return quadros


def onda_choque(n=6, W=120, H=34, pal=None):
    """Anel de choque achatado no chão (pancada do guardião): a frente brilha mais."""
    p = pal or ['#ffffff', '#fff1c2', '#ffd08a', '#c88a3a', '#7a4a1e']
    quadros = []
    for k in range(n):
        q = Q(W, H)
        rr = 8 + k * 10
        d = np.hypot((q.x - W / 2) / 3.4, (q.y - H / 2)) * 3.4
        larg = max(1.3, 6 - k * 1.0)
        m = np.abs(d - rr) <= larg
        frente = q.y > H / 2
        if k >= 3:
            m &= ~dither(q, (k - 2) * 0.22) | (frente & (np.abs(d - rr) < larg * 0.4))
        t = np.clip(np.abs(d - rr) / larg, 0, 0.999) * 0.75 + np.where(frente, 0, 0.25)
        pinta_rampa(q, m, np.clip(t + k * 0.03, 0, 0.999), p[:4])
        q.contorno(p[4])
        quadros.append(q.a)
    return quadros


def gota(pal, n=3, W=22, H=18):
    """Gota (veneno ou gosma) voando para a direita, com a ponta esticada atrás."""
    quadros = []
    for k in range(n):
        q = Q(W, H)
        cx, cy = 13, H / 2
        dx, dy = q.x - cx, q.y - cy
        esp = 1 + 0.08 * math.sin(k * 2.1)
        r = np.where(dx > 0, np.hypot(dx / (6.5 * esp), dy / (6 / esp)), np.hypot(dx / 12, dy / (6 / esp * (1 + dx / 14))))
        m = r <= 1
        pinta_rampa(q, m, np.clip(np.hypot(q.x - (cx + 2), q.y - (cy - 2)) / 9, 0, 0.999), pal[1:4])
        q.pinta(m & (np.hypot(q.x - (cx + 2), q.y - (cy - 2.5)) < 1.6), pal[0])
        q.contorno(pal[4])
        # gotinhas atrás
        for j in range(2):
            px, py = 3 + j * 3 + k % 2, int(cy + (j * 2 - 1) * 2)
            q.a[py, px] = cor(pal[2])
        quadros.append(q.a)
    return quadros


def respingo(pal, n=7, W=56, H=44):
    """Splash: coroa de gotas que sobe e cai, poça que fica e some."""
    quadros = []
    gotas = [(math.radians(a), 12 + AL.random() * 10) for a in range(-170, 0, 22)]
    for k in range(n):
        q = Q(W, H)
        base = H - 10
        # poça
        pr = 6 + k * 2.6
        poca = np.hypot((q.x - W / 2) / 2.2, (q.y - base) / 0.9) <= pr / 2.2 * 1.2
        if k >= 4:
            poca &= ~dither(q, (k - 3) * 0.25)
        pinta_rampa(q, poca, np.clip(0.4 + (q.y - base) / 10, 0, 0.999), pal[1:4])
        # gotas em arco
        t = k / (n - 1)
        for a, v in gotas:
            x = W / 2 + math.cos(a) * v * t * 1.15
            y = base + math.sin(a) * v * t * 2.4 + 30 * t * t
            rr = max(0.8, 3.2 * (1 - t * 0.7))
            if y < H - 2:
                m = np.hypot(q.x - x, q.y - y) <= rr
                q.pinta(m, pal[2]); q.pinta(m & (np.hypot(q.x - x + 0.7, q.y - y + 0.7) < rr * 0.5), pal[0])
        # coroa
        if k <= 3:
            alt = [6, 12, 10, 5][k]
            coroa = (np.abs(q.x - W / 2) < 10 + k * 3) & (q.y < base) & (q.y > base - alt * (0.5 + 0.5 * np.abs(np.sin((q.x - W / 2) * 0.55))))
            coroa &= np.abs(q.x - W / 2) > 4 + k * 2
            q.pinta(coroa, pal[2]); q.pinta(coroa & (q.y < base - alt * 0.6), pal[1])
        q.contorno(pal[4])
        quadros.append(q.a)
    return quadros


def bolhas(pal, n=8, W=24, H=34):
    """Bolhas de veneno subindo (ícone vivo do estado Envenenado)."""
    quadros = []
    sementes = [(6, 0.0, 3), (14, 0.35, 2.4), (10, 0.62, 3.4), (18, 0.8, 2)]
    for k in range(n):
        q = Q(W, H)
        for x, fase, r in sementes:
            t = (k / n + fase) % 1
            y = H - 4 - t * (H - 8)
            xx = x + math.sin(t * 6 + x) * 1.6
            rr = r * (0.7 + 0.3 * t)
            if t > 0.9:
                continue
            m = np.hypot(q.x - xx, q.y - y) <= rr
            anel = m & (np.hypot(q.x - xx, q.y - y) > rr - 1.2)
            q.pinta(m, pal[2]); q.pinta(anel, pal[3])
            q.pinta(m & (np.hypot(q.x - xx + rr * 0.4, q.y - y + rr * 0.4) < 1), pal[0])
        q.contorno(pal[4])
        quadros.append(q.a)
    return quadros


def nuvem_veneno(pal, n=8, W=72, H=56):
    """Nuvem tóxica com caveirinha (o crítico da serpente)."""
    quadros = []
    bolas = [(-16, 6, 11), (0, 0, 15), (16, 5, 12), (-8, 12, 10), (9, 13, 10), (24, 14, 7), (-24, 14, 7)]
    for k in range(n):
        q = Q(W, H)
        cresce = min(1.0, 0.35 + k * 0.22)
        m = np.zeros((H, W), bool)
        luz = np.full((H, W), 9.0, np.float32)
        for bx, by, br in bolas:
            cx, cy = W / 2 + bx * cresce, H / 2 + by * cresce - 4 + math.sin(k + bx) * 0.8
            rr = br * cresce
            m |= np.hypot(q.x - cx, q.y - cy) <= rr
            luz = np.minimum(luz, np.hypot(q.x - (cx - rr * 0.3), q.y - (cy - rr * 0.45)) / max(rr, 1))
        if k >= 5:
            m &= ~dither(q, (k - 4) * 0.24)
        pinta_rampa(q, m, np.clip(luz * 0.8, 0, 0.999), [pal[1], pal[2], pal[3], '#5a3a7a'])
        # caveirinha no meio (aparece no quadro 2 e some no fim)
        if 2 <= k <= 5:
            cx, cy = W / 2, H / 2 - 3
            cranio = (np.hypot(q.x - cx, (q.y - cy) * 1.1) <= 6.5) | ((np.abs(q.x - cx) <= 4) & (q.y > cy) & (q.y <= cy + 8))
            q.pinta(cranio, '#f6f0e0')
            q.pinta(cranio & (q.y > cy + 4), '#cfc4ac')
            for ox in (-2.6, 2.6):
                q.pinta(np.hypot(q.x - (cx + ox), q.y - (cy + 1)) <= 1.7, '#3a1e4a')
            q.pinta((np.abs(q.x - cx) < 0.6) & (q.y > cy + 3.5) & (q.y < cy + 5.5), '#3a1e4a')
            for ox in (-2, 0, 2):
                q.pinta((np.abs(q.x - (cx + ox)) < 0.5) & (q.y > cy + 6.5) & (q.y <= cy + 8), '#8a7a6a')
        q.contorno(pal[4])
        quadros.append(q.a)
    return quadros


def garras(pal, n=6, W=72):
    """Três rasgos paralelos em sequência (raptor, corvo, mímico)."""
    quadros = []
    for k in range(n):
        q = Q(W, W)
        for j in range(3):
            ini = j * 0.8
            prog = np.clip((k + 1 - ini) / 2.2, 0, 1)
            if prog <= 0:
                continue
            off = (j - 1) * 13
            # linha diagonal de cima-direita para baixo-esquerda
            ux, uy = -0.62, 0.78
            px, py = -uy, ux
            sx, sy = W / 2 + off * px + 18, W / 2 + off * py - 25
            s = (q.x - sx) * ux + (q.y - sy) * uy
            d = (q.x - sx) * px + (q.y - sy) * py
            comp = 58 * prog
            u = np.clip(s / 58, 0, 1)
            larg = 3.6 * np.sin(u * math.pi) ** 0.7 * (1 - max(0, k - 3) * 0.25)
            m = (s >= 0) & (s <= comp) & (np.abs(d) <= larg)
            if k >= 4:
                m &= ~dither(q, (k - 3) * 0.3) | (np.abs(d) < larg * 0.3)
            pinta_rampa(q, m, np.clip(np.abs(d) / np.maximum(larg, 0.5), 0, 0.999), pal[:4])
        q.contorno(pal[4])
        quadros.append(q.a)
    return quadros


def orbe(pal, n=6, W=20):
    quadros = []
    for k in range(n):
        q = Q(W, W)
        c = W / 2
        r = np.hypot(q.x - c, q.y - c)
        m = r <= 6.5
        pinta_rampa(q, m, np.clip(np.hypot(q.x - c + 2, q.y - c + 2) / 9, 0, 0.999), pal[:4])
        a = k / n * 2 * math.pi
        for dd in (0, 0.5):
            px, py = int(c + math.cos(a - dd) * 8.5), int(c + math.sin(a - dd) * 8.5)
            if 0 <= px < W and 0 <= py < W:
                q.a[py, px] = cor(pal[0] if dd == 0 else pal[2])
        q.contorno(pal[4])
        quadros.append(q.a)
    return quadros


def presa(W=30, H=64):
    """Uma presa curva com veneno escorrendo (o bote da serpente). Aponta para baixo."""
    q = Q(W, H)
    t = np.clip(q.y / (H - 4), 0, 1)
    centro = 9 + 12 * t ** 1.8
    meia = 8.5 * (1 - t) ** 0.8 + 0.4
    m = (np.abs(q.x - centro) <= meia) & (q.y < H - 4)
    q.pinta(m, '#e9e2cf')
    q.pinta(m & (q.x < centro - meia * 0.25), '#ffffff')
    q.pinta(m & (q.x > centro + meia * 0.45), '#b8ac92')
    # gengiva
    q.pinta((q.y < 6) & (np.abs(q.x - 10) <= 10), '#b0446a')
    q.pinta((q.y < 3) & (np.abs(q.x - 10) <= 10), '#7a2448')
    # veneno escorrendo
    g = (np.abs(q.x - (centro + 1)) <= 1.5) & (q.y > H * 0.55) & (q.y < H - 1)
    q.pinta(g & (q.y > H - 9), '#7ae04a')
    q.pinta((np.hypot(q.x - 21.5, q.y - (H - 3)) <= 2.2), '#7ae04a')
    q.pinta((np.hypot(q.x - 21, q.y - (H - 3.6)) <= 0.8), '#e8ffc0')
    q.contorno('#3a1e2e')
    return [q.a]


def mandibula(W=64, H=30):
    """Fileira de dentes do Mímico: tampa de madeira com friso de ouro e dentes (para cima/baixo)."""
    q = Q(W, H)
    madeira = (q.y < 14)
    q.pinta(madeira, '#8a4e26')
    q.pinta(madeira & (q.y < 3), '#b06a34')
    q.pinta(madeira & (q.x.astype(int) % 16 == 0), '#5e3218')
    friso = (q.y >= 10) & (q.y < 14)
    q.pinta(friso, '#e8b03a'); q.pinta(friso & (q.y < 11), '#fff0a0'); q.pinta(friso & (q.y >= 13), '#9a5a12')
    # rebites
    for x in range(8, W, 16):
        q.pinta(np.hypot(q.x - x, q.y - 6) <= 1.6, '#e8b03a')
    gengiva = (q.y >= 14) & (q.y < 17)
    q.pinta(gengiva, '#a8304a')
    # dentes triangulares
    for x in range(0, W, 8):
        t = (q.y - 17) / 12
        m = (q.y >= 16) & (q.y < 29) & (np.abs(q.x - (x + 4)) <= 3.8 * (1 - np.clip(t, 0, 1)))
        q.pinta(m, '#f4eedc'); q.pinta(m & (q.x < x + 3.4), '#ffffff'); q.pinta(m & (q.x > x + 5), '#c8bca0')
    q.contorno('#2e1a12')
    return [q.a]


def gota_tela(pal, n=8, W=24, H=80):
    """Gosma escorrendo da borda de cima da tela (crítico da gosma)."""
    quadros = []
    for k in range(n):
        q = Q(W, H)
        desce = [8, 18, 30, 40, 48, 54, 58, 60][k]
        haste = (np.abs(q.x - W / 2) <= 3.4 - np.clip(q.y / max(desce, 1), 0, 1) * 1.6 + 0.6 * np.sin(q.y * 0.35 + k)) & (q.y <= desce)
        topo = np.hypot((q.x - W / 2) / 11, q.y / 7) <= 1
        ponta = np.hypot(q.x - W / 2, (q.y - desce) * 0.9) <= 4.6
        m = haste | topo | ponta
        if k == n - 1:
            m &= ~dither(q, 0.35)
        pinta_rampa(q, m, np.clip(np.abs(q.x - W / 2 + 1.5) / 6, 0, 0.999), pal[1:4])
        q.pinta(m & (np.hypot(q.x - W / 2 + 1.6, q.y - desce + 1.6) < 1.3), pal[0])
        q.contorno(pal[4])
        quadros.append(q.a)
    return quadros


def coracao(n=6, W=20):
    """Coração de cura subindo (o mesmo charme dos corações do Stardew)."""
    quadros = []
    for k in range(n):
        q = Q(W, W)
        c = W / 2
        x = (q.x - c) / 7.5; y = -(q.y - c - 1) / 7.5
        m = (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0
        pinta_rampa(q, m, np.clip(np.hypot(q.x - c + 3, q.y - c + 3) / 14, 0, 0.999), ['#ffd4dc', '#ff6a86', '#e0304e', '#a01a36'])
        q.pinta(m & (np.hypot(q.x - c + 3.5, q.y - c + 2.5) < 1.3), '#ffffff')
        if k % 3 == 1:
            q.a = np.roll(q.a, -1, axis=0)
        q.contorno('#5a0e22')
        quadros.append(q.a)
    return quadros


def pena(n=6, W=18, base=('#3a3448', '#5a5470', '#8a86a8')):
    quadros = []
    for k in range(n):
        q = Q(W, W)
        a = k / n * math.pi * 2
        ca, sa = math.cos(a), math.sin(a)
        u = (q.x - W / 2) * ca + (q.y - W / 2) * sa
        v = -(q.x - W / 2) * sa + (q.y - W / 2) * ca
        m = (np.abs(u) <= 7) & (np.abs(v) <= 2.6 * np.cos(np.clip(u / 7, -1, 1) * 1.4))
        q.pinta(m, base[1]); q.pinta(m & (v < 0), base[2]); q.pinta(m & (np.abs(v) < 0.5), base[0])
        q.contorno('#1e1a28')
        quadros.append(q.a)
    return quadros


# ================================================================== registro

def efeitos():
    E = {}
    def add(nome, quadros, ms, ancora=None, loop=False):
        h, w = quadros[0].shape[:2]
        E[nome] = dict(quadros=quadros, ms=ms, ancora=ancora or [w // 2, h // 2], loop=loop)
    for tom in ('azul', 'ouro', 'fogo', 'arcano', 'sangue'):
        add(f'corte-{tom}', corte(PAL[tom]), 45)
        add(f'faisca-{tom}', faisca(PAL[tom]), 50)
    for tom in ('azul', 'ouro', 'fogo', 'arcano'):
        add(f'lamina-{tom}', lamina_voo(PAL[tom]), 60, [24, 15], loop=True)
    add('espada', espada(), 70, [6, 15])
    for tom in ('fatuo', 'escarlate', 'ancestral'):
        add(f'bolafogo-{tom}', bola_fogo(PAL[tom]), 70, [31, 15], loop=True)
        add(f'labareda-{tom}', labareda(PAL[tom]), 60)
    # chamas que dançam sobre o nome na Biblioteca (sequência de acertos): laço curto, sem virar fumaça
    for tom in ('escarlate', 'fatuo', 'ancestral', 'ouro'):
        add(f'chama-{tom}', chama_viva(PAL[tom]), 90, [12, 30], loop=True)
    add('pedra', pedra(), 70, loop=True)
    add('pedregulho', pedregulho(), 90, loop=True)
    add('poeira', poeira(), 70, [24, 30])
    add('rachadura', rachadura(), 80)
    add('choque', onda_choque(), 55)
    for tom in ('veneno', 'eletrico', 'gosma', 'acida', 'rainha'):
        add(f'gota-{tom}', gota(PAL[tom]), 80, [13, 9], loop=True)
        add(f'respingo-{tom}', respingo(PAL[tom]), 60, [28, 34])
    add('bolhas', bolhas(PAL['veneno']), 110, loop=True)
    add('nuvem-veneno', nuvem_veneno(PAL['veneno']), 80)
    add('garras', garras(PAL['sangue']), 45)
    add('orbe', orbe(PAL['arcano']), 70, loop=True)
    add('presa', presa(), 100, [10, 0])
    add('mandibula', mandibula(), 100, [32, 0])
    for tom in ('gosma', 'acida', 'rainha'):
        add(f'escorre-{tom}', gota_tela(PAL[tom]), 90, [12, 0])
    add('coracao', coracao(), 90, loop=True)
    add('pena', pena(), 70, loop=True)
    return E


def gravar(E):
    DESTINO.mkdir(parents=True, exist_ok=True)
    meta = {}
    for nome, e in E.items():
        qs = e['quadros']
        h, w = qs[0].shape[:2]
        tira = np.concatenate(qs, axis=1)
        im = Image.fromarray(tira, 'RGBA')
        # paleta indexada quando cabe (arquivo bem menor, mesmo pixel)
        cores = len(np.unique(tira.reshape(-1, 4), axis=0))
        if cores <= 256:
            im = im.convert('P', palette=Image.ADAPTIVE, colors=256) if False else im
        im.save(DESTINO / f'{nome}.png', optimize=True)
        meta[nome] = {'w': w, 'h': h, 'n': len(qs), 'ms': e['ms'], 'ancora': e['ancora'], 'loop': e['loop']}
    linhas = [
        '/**',
        ' * Efeitos de golpe em pixel art (tiras horizontais em public/flashcards/vfx/).',
        ' * Gerado por scripts/sprites/vfx.py: não edite à mão.',
        ' */',
        'export interface MetaVfx { w: number; h: number; n: number; ms: number; ancora: [number, number]; loop: boolean }',
        f'export const VFX: Record<string, MetaVfx> = {json.dumps(meta, ensure_ascii=False)}',
        '',
    ]
    INDICE.write_text('\n'.join(linhas))
    print(f'{len(meta)} efeitos em {DESTINO.relative_to(RAIZ)}')


def previa(E, escala=4):
    """Folha de contato: cada efeito numa linha, sobre fundo escuro e claro."""
    linhas = []
    for nome, e in E.items():
        tira = np.concatenate(e['quadros'], axis=1)
        linhas.append(tira)
    W = max(t.shape[1] for t in linhas) + 4
    H = sum(t.shape[0] + 4 for t in linhas)
    for fundo, sufixo in (((40, 44, 60), 'escuro'), ((150, 196, 120), 'claro')):
        tela = Image.new('RGBA', (W * 2, H), fundo + (255,))
        y = 0
        for t in linhas:
            im = Image.fromarray(t, 'RGBA')
            tela.alpha_composite(im, (2, y))
            y += t.shape[0] + 4
        tela = tela.resize((tela.width * escala // 2, tela.height * escala // 2), Image.NEAREST)
        PREVIA.mkdir(parents=True, exist_ok=True)
        tela.save(PREVIA / f'vfx-previa-{sufixo}.png')


if __name__ == '__main__':
    E = efeitos()
    if '--previa' in sys.argv:
        previa(E)
    else:
        gravar(E)
        previa(E)
