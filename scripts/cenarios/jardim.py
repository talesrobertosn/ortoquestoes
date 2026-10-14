#!/usr/bin/env python3
"""Jardim Suspenso: o andar a céu aberto DENTRO da cripta (14/10/2026).

Pedido do Tales: cenários mais felizes, como os do Stardew Valley, e andares
que ficam dentro da cripta mas têm céu aberto (como em Sword Art Online). Aqui,
o teto do salão desabou há séculos: as paredes de pedra com arcos continuam de
pé nas laterais, a hera tomou conta, uma cachoeira desce por uma brecha da
parede até um lago com vitórias-régias, e uma cerejeira floresce no gramado.

Mesmo formato dos outros cenários pintados: camadas fundo, meio, frente e luz,
em paisagem (520×330) e retrato (250×470), em public/flashcards/cenarios/.

    python3 scripts/cenarios/jardim.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa, ruido, voronoi  # noqa: E402
from floresta import Objetos, capim, sombra_contato, suave  # noqa: E402

PEDRA = rampa(['#3a3442', '#4a4454', '#5c5668', '#706a7c', '#878294', '#a29eae', '#bdb9c6'])
HERA = rampa(['#1e4a2a', '#2a6034', '#3a7a3e', '#4e944a', '#6aae56', '#8cc864'])
GRAMA = rampa(['#2e6a34', '#3a7e3a', '#4a9440', '#5eaa48', '#76be52', '#92d05e', '#b0e070'])
AGUA = rampa(['#1e5a8a', '#2a72a6', '#3a8cc0', '#56a8d6', '#7cc4e6', '#b0e0f4'])
FLOR_CEREJA = rampa(['#b04a7a', '#d0689a', '#e88ab4', '#f6b0cc', '#ffd4e4', '#fff0f6'])
CASCA = rampa(['#3a2418', '#4e3020', '#64402a', '#7c5236', '#946644'])
NEVOA = '#fff4e0'


def fundo(t: Tela, hz, retrato):
    W, H, x, y = t.W, t.H, t.x, t.y
    chao_y = H * hz
    # céu de manhã de primavera
    k = np.clip(y / chao_y, 0, 1)
    alto, baixo = np.array(hexrgb('#62b4ee'), F), np.array(hexrgb('#fff2d6'), F)
    t.rgb[:] = alto * (1 - k[..., None] ** 1.2) + baixo * (k[..., None] ** 1.2); t.a[:] = 1
    nuv = fbm(x / 40, y / 13, 4, 17) + 0.3 * np.exp(-((y - H * 0.14) / (H * 0.1)) ** 2) - 0.25 * k
    corpo = nuv > 0.66
    t.cor(corpo, '#ffffff', 0.95)
    t.cor(corpo & (fbm(x / 40, (y - 3) / 13, 4, 17) + 0.3 * np.exp(-((y - 3 - H * 0.14) / (H * 0.1)) ** 2) - 0.25 * k < 0.7), '#f2dcec', 0.85)
    # morros verdes e macios ao longe, com a torre em ruína no meio
    for i, (base, amp, cores) in enumerate(((chao_y * 0.93, H * 0.07, ['#8cc2a4', '#9ccfb0', '#b0dabc']), (chao_y * 1.0, H * 0.05, ['#6aae78', '#7cbc80', '#94cc8c']))):
        topo = base - amp * (0.5 + 0.5 * np.sin(x / (W * 0.11) + i * 2.3)) - amp * 0.5 * fbm(x / 20, i, 3, 5 + i)
        t.tingir(y >= topo, 0.75 - (y - topo) / (H * 0.2), rampa(cores), 0.5)
    tx = W * (0.62 if not retrato else 0.66)
    torre = (np.abs(x - tx) < W * 0.018) & (y > chao_y * 0.62) & (y < chao_y * 0.95)
    torre &= ~((y < chao_y * 0.66) & (((x - tx) // 2) % 2 == 0))
    t.tingir(torre, 0.6 - (x - tx) / (W * 0.04), rampa(['#8a9ab0', '#a2b0c2', '#b8c4d2']), 0)
    # chão distante
    t.tingir(y > chao_y, np.clip(0.6 + 0.2 * fbm(x / 26, y / 8, 3, 9), 0, 0.999), GRAMA[3:])
    t.velar(np.clip(1 - (y - chao_y * 0.7) / (H * 0.3), 0, 1) * 0.25 * (y > chao_y * 0.7), NEVOA)
    # paredes da cripta nas laterais, com arcos abertos e o alto quebrado
    paredes(t, hz, retrato)


def paredes(t: Tela, hz, retrato):
    W, H, x, y = t.W, t.H, t.x, t.y
    larg = W * (0.21 if not retrato else 0.17)
    for lado in (-1, 1):
        borda_in = (W / 2 + lado * (W / 2 - larg)) + lado * 4 * (fbm(y / 9, lado, 3, 21) - 0.5)
        dentro = (x * lado > borda_in * lado)
        # o alto da parede desaba em degraus irregulares, mais baixo perto do meio
        dist = np.abs(x - (W / 2 + lado * W / 2)) / larg
        topo = H * (-0.02 + 0.12 * dist ** 2.2) + H * 0.05 * (fbm(x / 6, 0.5, 3, 31 + lado) - 0.5)
        m = dentro & (y > topo) & (y < H * (hz + 0.1))
        # blocos de pedra (voronoi alongado) com luz vinda do céu, do lado de dentro
        borda, idc = voronoi(x / 9, y / 5, 40 + lado)
        tom = (idc % 7) / 7
        luz = 0.32 + 0.22 * tom + 0.25 * np.clip(1 - dist, 0, 1) - 0.3 * (borda < 0.08)
        t.tingir(m, np.clip(luz, 0, 0.999), PEDRA, 0.5)
        # arco aberto na parede, mostrando o céu e a mata de fora
        ax = W / 2 + lado * (W / 2 - larg * 0.48)
        aw, ay0 = larg * 0.22, H * 0.2
        arco = m & (np.abs(x - ax) < aw) & ((y > ay0 + aw) | (np.hypot(x - ax, y - ay0 - aw) < aw)) & (y < H * (hz - 0.02))
        kk = np.clip((y - ay0) / (H * (hz - 0.02) - ay0), 0, 1)
        t.rgb[arco] = (np.array(hexrgb('#9cd4f2'), F) * (1 - kk[..., None]) + np.array(hexrgb('#7cbc80'), F) * kk[..., None])[arco]
        aro = m & ~arco & (np.abs(np.hypot(x - ax, y - ay0 - aw) - aw - 1.5) < 1.6) & (y < ay0 + aw)
        aro |= m & ~arco & (np.abs(np.abs(x - ax) - aw - 1.5) < 1.6) & (y >= ay0 + aw) & (y < H * (hz - 0.02))
        t.tingir(aro, np.full(x.shape, 0.85, F), PEDRA, 0)
        # hera: manchas que descem do alto e cobrem a pedra
        hera = m & ~arco & (fbm(x / 7, y / 10, 3, 60 + lado) + 0.25 * np.clip(1 - (y - topo) / (H * 0.25), 0, 1) > 0.62)
        t.tingir(hera, np.clip(0.3 + 0.5 * ruido(x * 0.7, y * 0.7, 61) + 0.2 * np.clip(1 - dist, 0, 1), 0, 0.999), HERA, 0.7)
        # cipós pendurados
        for j in range(4):
            cx_ = borda_in[0, 0] if hasattr(borda_in, 'shape') else borda_in
            px_ = W / 2 + lado * (W / 2 - larg * (0.15 + 0.22 * j))
            alto_c = H * (0.12 + 0.08 * ((j * 37) % 5))
            curva = px_ + np.sin((y - topo) / 7 + j) * 1.4
            cipo = (np.abs(x - curva) < 0.8) & (y > H * 0.05 + j * 3) & (y < H * 0.05 + alto_c)
            t.tingir(cipo & (ruido(x, y, 70 + j) > 0.2), np.full(x.shape, 0.55, F), HERA, 0)
    # a abóbada que caiu: um arco enorme de pedra, partido no meio, ligando as duas paredes
    R = W * (0.36 if not retrato else 0.44)
    ccx, ccy = W / 2, H * (0.6 if not retrato else 0.42)
    d = np.hypot(x - ccx, y - ccy)
    ang = np.arctan2(-(y - ccy), np.abs(x - ccx))       # 0 no pé do arco, pi/2 no alto
    for lado in (-1, 1):
        quebra = 1.02 if lado < 0 else 0.86               # cada metade quebra num ponto
        rib = (np.abs(d - R) < (4.5 if not retrato else 3.5)) & (y < ccy) & (ang < quebra) & ((x - ccx) * lado > 0)
        aduela = (((ang * 30).astype(int)) % 4) == 0
        luz = 0.42 + 0.35 * ((d - R) < -1) - 0.22 * aduela
        t.tingir(rib, np.clip(luz, 0, 0.999), PEDRA, 0.4)
        t.tingir(rib & (fbm(x / 5, y / 5, 2, 99 + lado) > 0.6), np.clip(0.4 + 0.4 * ruido(x, y, 98), 0, 0.999), HERA, 0.5)
        # cipó pendurado na ponta quebrada
        px_ = ccx + lado * R * np.cos(quebra); py_ = ccy - R * np.sin(quebra)
        cip = (np.abs(x - px_ - np.sin((y - py_) / 5) * 1.2) < 0.8) & (y > py_) & (y < py_ + H * 0.09)
        t.tingir(cip, np.full(x.shape, 0.6, F), HERA, 0)
    # cachoeira saindo de uma bica de pedra da parede esquerda até o lago
    cx = W * (0.215 if not retrato else 0.2)
    top_c, fim = H * 0.24, H * (hz + 0.02)
    bica = (np.abs(x - cx) < 6) & (np.abs(y - top_c) < 2.5)
    t.tingir(bica, np.full(x.shape, 0.75, F) - (y > top_c) * 0.3, PEDRA, 0)
    t.cor((np.abs(x - cx) < 3) & (np.abs(y - top_c + 4) < 3) & (np.hypot(x - cx, y - top_c + 4) < 3.2), '#2a2432')
    queda = (np.abs(x - cx - (y - top_c) * 0.02) < 3.2 + (y - top_c) / H * 6) & (y > top_c) & (y < fim)
    listras = ((x * 1.0 + y * 0.15) % 3) < 1.1
    t.tingir(queda, np.where(listras, 0.92, 0.7) - 0.1 * ruido(x, y / 3, 80), AGUA, 0.3)
    t.cor(queda & (np.abs(x - cx) < 0.8), '#ffffff', 0.7)
    espuma = (np.hypot((x - cx) / 9, (y - fim) / 2.6) < 1) & (ruido(x * 0.9, y * 0.9, 81) > 0.35)
    t.cor(espuma, '#f4fbff')


def chao(t: Tela, hz, retrato):
    W, H, x, y = t.W, t.H, t.x, t.y
    m = y >= H * hz + 2 * (fbm(x / 7, 0.3, 3, 77) - 0.5)
    prof = np.clip((y - H * hz) / (H * (1 - hz)), 0, 1)
    esc = 0.35 + 0.65 * prof
    X, Y = (x - W / 2) / esc, (y - H * hz) / esc
    base = fbm(X / 24, Y / 12, 4, 3)
    clar = np.exp(-(((x - W / 2) / (W * 0.36)) ** 2 + ((y - H * 0.62) / (H * 0.32)) ** 2))
    faixas = (np.floor((Y + 3 * fbm(X / 12, 0, 2, 4)) / 9) % 2) * 0.06   # faixas de grama aparada, bem Stardew
    luz = 0.32 + 0.22 * base + 0.25 * clar + faixas
    t.tingir(m, np.clip(luz, 0, 0.999), GRAMA, 0.7)
    t.velar(np.clip(1 - prof / 0.25, 0, 1) * 0.2 * m, NEVOA)


def lago(t: Tela, hz, retrato):
    W, H, x, y = t.W, t.H, t.x, t.y
    cx, cy = W * (0.27 if not retrato else 0.24), H * (hz + 0.06)
    rx, ry = W * (0.15 if not retrato else 0.2), H * 0.05
    d = np.hypot((x - cx) / rx, (y - cy) / ry) + 0.08 * (fbm(x / 5, y / 5, 2, 90) - 0.5)
    m = d < 1
    margem = (d >= 1) & (d < 1.18)
    t.tingir(margem, np.clip(0.4 + 0.4 * ruido(x * 0.6, y * 0.6, 91), 0, 0.999), PEDRA[2:], 0.5)
    luz = 0.35 + 0.35 * (1 - (y - cy + ry) / (2 * ry)) + 0.2 * (((x + y * 3) % 11) < 1) * (ruido(x / 3, y, 92) > 0.5)
    t.tingir(m, np.clip(luz, 0, 0.999), AGUA, 0.5)
    # reflexo do céu e brilhinhos
    t.cor(m & (np.abs(y - (cy - ry * 0.3)) < 0.6) & (ruido(x / 2, 1, 93) > 0.55), '#e8f8ff')
    # vitórias-régias com florzinhas rosadas
    rng = np.random.default_rng(94)
    for i in range(6):
        px_, py_ = cx + rng.uniform(-0.75, 0.75) * rx, cy + rng.uniform(-0.5, 0.6) * ry
        r = 2.2 + rng.uniform(0, 1.5)
        folha = (np.hypot((x - px_) / (r * 1.4), (y - py_) / r) < 1) & ~((np.abs(y - py_) < 0.6) & (x > px_))
        t.tingir(folha & m, np.clip(0.5 + (py_ - y) / r * 0.3, 0, 0.999), HERA[2:], 0)
        if i % 2 == 0:
            t.cor((np.abs(x - px_) < 1) & (np.abs(y - py_ + 1) < 1), '#ffb0d0')
            t.cor((np.abs(x - px_) < 0.5) & (np.abs(y - py_ + 1) < 0.5), '#fff0a0')
    return cx, cy, rx, ry


def cerejeira(o: Objetos, cx, base, h, s):
    t = o.t; x, y = t.x, t.y
    # tronco torto que se abre em dois galhos
    k = np.clip((base - y) / h, 0, 1)
    centro = cx + np.sin(k * 2.2 + s) * h * 0.05
    meia = h * 0.06 * (1 - k * 0.5) + h * 0.04 * suave(0.15, 0, k)
    tronco = (np.abs(x - centro) < meia) & (y <= base) & (y > base - h * 0.62)
    t.tingir(tronco, np.clip(0.35 + 0.5 * np.clip(-(x - centro) / np.maximum(meia, 1), 0, 1) + 0.15 * ruido(x, y / 3, s), 0, 0.999), CASCA, 0.5)
    for lado in (-1, 1):
        gx = centro + lado * (base - h * 0.45 - y) * 0.6
        galho = (np.abs(x - gx) < h * 0.025) & (y < base - h * 0.42) & (y > base - h * 0.7)
        t.tingir(galho, np.full(x.shape, 0.4, F), CASCA, 0)
    # copa em nuvens de flores (bolhas com luz no alto à esquerda)
    rng = np.random.default_rng(s)
    for i in range(16):
        bx = cx + rng.uniform(-0.55, 0.55) * h * 0.75
        by = base - h * (0.72 + rng.uniform(-0.18, 0.2))
        r = h * rng.uniform(0.14, 0.22)
        dd = np.hypot(x - bx, (y - by) * 1.15) / r
        m = dd < 1 - 0.25 * fbm(x / 2.5, y / 2.5, 2, s + i)
        luz = 0.3 + 0.45 * np.clip(-(x - bx) / r * 0.4 - (y - by) / r * 0.6, 0, 1) + 0.25 * np.sqrt(np.clip(1 - dd ** 2, 0, 1))
        t.tingir(m, np.clip(luz, 0, 0.999), FLOR_CEREJA, 0.7)


def canteiro(t: Tela, cx, cy, n, s, cores):
    """Fileira de tulipas e margaridas (canteiro do Stardew)."""
    rng = np.random.default_rng(s)
    for i in range(n):
        fx = int(cx + (i - n / 2) * 3 + rng.integers(-1, 2)); fy = int(cy + rng.integers(-1, 2))
        cor = cores[i % len(cores)]
        for h in range(3):
            if 0 <= fy - h < t.H and 0 <= fx < t.W:
                t.rgb[fy - h, fx] = hexrgb('#3a7e3a'); t.a[fy - h, fx] = 1
        for (dx, dy, c) in ((0, -4, cor), (-1, -4, cor), (1, -4, cor), (0, -5, cor), (-1, -5, '#ffffff' if cor == '#ffe46a' else cor), (1, -5, cor)):
            X, Y = fx + dx, fy + dy
            if 0 <= Y < t.H and 0 <= X < t.W:
                t.rgb[Y, X] = hexrgb(c); t.a[Y, X] = 1
        if 0 <= fy - 3 < t.H and fx + 1 < t.W:
            t.rgb[fy - 2, fx + 1] = hexrgb('#4e944a')


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    hz = 0.42 if not retrato else 0.34
    # ---------------- fundo
    f = Tela(W, H)
    fundo(f, hz, retrato)
    f.salvar(saida / f'{nome}-fundo.png')
    # ---------------- meio
    m = Tela(W, H)
    chao(m, hz, retrato)
    capim(m, hz, 0.0022, s=5)
    lago(m, hz, retrato)
    # caminho de pedras do primeiro plano até o fundo
    for i in range(7):
        k = i / 6
        px_ = W / 2 + np.sin(k * 3) * W * 0.04
        py_ = H * (0.98 - k * (0.98 - hz - 0.06))
        r = (5 - 3.4 * k) * (1 if not retrato else 0.8)
        pedra = np.hypot((m.x - px_) / (r * 1.5), (m.y - py_) / r) < 1
        m.tingir(pedra, np.clip(0.55 + (py_ - m.y) / r * 0.3, 0, 0.999), PEDRA[1:], 0.4)
    # canteiros de flores nas laterais
    flores = [['#ff6a6a', '#ffe46a', '#ff9ac0'], ['#ffffff', '#ffe46a'], ['#b08aff', '#ff9ac0', '#ffffff']]
    lugares = [(0.14, 0.72, 12), (0.17, 0.76, 10), (0.86, 0.78, 12), (0.33, 0.56, 7), (0.66, 0.55, 7), (0.08, 0.86, 10), (0.92, 0.9, 10), (0.24, 0.92, 8), (0.76, 0.94, 8), (0.42, 0.5, 5), (0.6, 0.5, 5)] if not retrato else [(0.2, 0.62, 7), (0.8, 0.63, 7), (0.15, 0.82, 8), (0.85, 0.84, 8), (0.3, 0.95, 6), (0.7, 0.96, 6)]
    for i, (fx, fy, n) in enumerate(lugares):
        canteiro(m, W * fx, H * fy, n, 200 + i, flores[i % 3])
    o = Objetos(W, H)
    ctx, cbase, ch = (W * 0.84, H * 0.66, H * 0.42) if not retrato else (W * 0.88, H * 0.56, H * 0.3)
    sombra_contato(m, ctx, cbase, ch * 0.45, ch * 0.08, 0.45)
    cerejeira(o, ctx, cbase, ch, 7)
    # coluna quebrada à esquerda
    colx, colb = (W * 0.12, H * 0.68) if not retrato else (W * 0.1, H * 0.6)
    coluna = (np.abs(o.t.x - colx) < W * 0.022) & (o.t.y <= colb) & (o.t.y > colb - H * 0.2 + 3 * (ruido(o.t.x, 1, 5) - 0.5))
    o.t.tingir(coluna, np.clip(0.35 + 0.55 * np.clip(-(o.t.x - colx) / (W * 0.022), 0, 1) + 0.2 * (((o.t.x - colx) % 4) < 1), 0, 0.999), PEDRA, 0.4)
    ctop = colb - H * 0.2
    capitel = (np.abs(o.t.x - colx) < W * 0.03) & (np.abs(o.t.y - ctop - 2) < 2.5)
    o.t.tingir(capitel, np.full(o.t.x.shape, 0.7, F) - (o.t.y > ctop + 2) * 0.25, PEDRA, 0)
    base_c = (np.abs(o.t.x - colx) < W * 0.03) & (np.abs(o.t.y - colb + 2) < 2.5)
    o.t.tingir(base_c, np.full(o.t.x.shape, 0.55, F), PEDRA, 0)
    hera_c = coluna & (fbm(o.t.x / 3, o.t.y / 4, 2, 77) > 0.56)
    o.t.tingir(hera_c, np.clip(0.4 + 0.4 * ruido(o.t.x, o.t.y, 76), 0, 0.999), HERA, 0.5)
    sombra_contato(m, colx, colb, W * 0.04, H * 0.012, 0.5)
    o.sobre(m, '#4a2a3a')
    # pétalas caídas no gramado
    rng = np.random.default_rng(300)
    for _ in range(int(W * H * 0.0012)):
        px_, py_ = int(rng.uniform(0, W)), int(rng.uniform(H * (hz + 0.04), H - 1))
        if abs(px_ - W / 2) < W * 0.15 and rng.uniform() < 0.7:
            continue
        m.rgb[py_, px_] = hexrgb(['#ffd4e4', '#f6b0cc', '#ffffff'][int(rng.integers(0, 3))])
    m.salvar(saida / f'{nome}-meio.png')
    # ---------------- frente: arbustos floridos nos cantos de baixo (claros, nada de moldura escura)
    fr = Objetos(W, H)
    for (cx, cy, r, s) in [(-6, H + 4, H * 0.16, 11), (W + 6, H + 4, H * 0.17, 13)]:
        for i in range(9):
            rr = np.random.default_rng(s + i)
            bx, by, rb = cx + rr.uniform(-1, 1) * r, cy - rr.uniform(0, 1) * r * 0.9, r * rr.uniform(0.35, 0.55)
            dd = np.hypot(fr.t.x - bx, (fr.t.y - by) * 1.1) / rb
            mm = dd < 1 - 0.25 * fbm(fr.t.x / 2.4, fr.t.y / 2.4, 2, s + i)
            fr.t.tingir(mm, np.clip(0.25 + 0.5 * np.clip(-(fr.t.y - by) / rb, 0, 1) + 0.2 * ruido(fr.t.x, fr.t.y, s), 0, 0.999), HERA, 0.6)
        flor = (fr.t.a > 0) & (ruido(fr.t.x * 0.35, fr.t.y * 0.35, s + 50) > 0.8)
        fr.t.cor(flor, '#ffd4e4' if s == 11 else '#fff6d8')
        fr.t.cor(flor & (ruido(fr.t.x * 0.35 + 0.5, fr.t.y * 0.35 + 0.5, s + 50) > 0.83), '#ffe46a')
    fr.t.salvar(saida / f'{nome}-frente.png')
    # ---------------- luz: feixes de sol entrando pelo teto aberto e o brilho do lago
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    for i, (fx, ang, larg_f, forca) in enumerate([(0.42, -0.35, 9, 0.5), (0.58, -0.3, 6, 0.4), (0.5, -0.33, 14, 0.28)]):
        d = np.abs((lz.x - W * fx) - lz.y * np.tan(ang))
        feixe = np.exp(-(d / larg_f) ** 2) * np.clip(1 - lz.y / (H * 0.9), 0, 1) ** 1.3 * (0.6 + 0.4 * fbm(lz.y / 30, i, 2, 3)) * forca
        brilho += feixe[..., None] * np.array(hexrgb('#fff0c0'), F)
    lx, ly = W * (0.27 if not retrato else 0.24), H * (hz + 0.06)
    g = np.exp(-(((lz.x - lx) / (W * 0.12)) ** 2 + ((lz.y - ly) / (H * 0.04)) ** 2)) * 0.35
    brilho += g[..., None] * np.array(hexrgb('#c8f0ff'), F)
    a = np.clip(brilho.max(-1) / 255, 0, 1)
    lz.rgb = np.where(a[..., None] > 0, brilho / np.maximum(a[..., None], 1e-3), 0); lz.a = a
    lz.salvar(saida / f'{nome}-luz.png')


if __name__ == '__main__':
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'cenarios'
    saida.mkdir(parents=True, exist_ok=True)
    pintar(520, 330, saida, 'jardim-paisagem')
    pintar(250, 470, saida, 'jardim-retrato')
    print('ok', saida)
