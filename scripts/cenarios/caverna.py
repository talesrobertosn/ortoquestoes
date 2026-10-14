#!/usr/bin/env python3
"""Caverna dos Cristais: o túnel fundo onde vivem a aranha, os morcegos e as quimeras (14/10/2026).

Gruta natural, sem perspectiva de corredor: camadas de rocha que recuam em névoa azul, estalactites
pendendo do teto, aglomerados de cristal violeta e ciano que brilham, cogumelos luminosos, um lago
subterrâneo parado que espelha os cristais e um feixe de luz do dia que entra por uma fenda no alto.
Mistura de frio (cristais, névoa) com o quente da luz da fenda. Camadas:
  fundo   rocha distante em névoa, a fenda com o céu e o feixe, estalactites ao longe
  meio    paredes laterais, chão de pedra, o lago com reflexo, cristais grandes, cogumelos
  frente  rochas escuras e estalactites em primeiro plano
  luz     feixe da fenda, brilho dos cristais e dos cogumelos, reflexo no lago

    python3 scripts/cenarios/caverna.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa  # noqa: E402

ROCHA = rampa(['#0a0a14', '#12121e', '#1a1a2a', '#242438', '#2e2e46', '#3a3a56', '#4a4a68', '#5c5c7c'])
ROCHA_LONGE = rampa(['#1a2240', '#222c50', '#2c3860', '#384672', '#465684'])
CRISTAL_V = rampa(['#2a1050', '#46207e', '#6a36b0', '#9058d8', '#b88af0', '#e2c8ff', '#ffffff'])
CRISTAL_C = rampa(['#0a3048', '#145a7a', '#2088a8', '#40b8d0', '#7ee0ec', '#c8faff', '#ffffff'])
AGUA = rampa(['#060a18', '#0c1428', '#14203c', '#1e3054', '#2a426c'])
COGU = rampa(['#103a2a', '#1e6a48', '#3aa06a', '#6ad69a', '#b0f8cc'])
MUSGO = rampa(['#0a1a14', '#12281e', '#1c3a2a', '#284e38'])


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    t0 = Tela(W, H); x, y = t0.x, t0.y
    chao_y = H * (0.66 if retrato else 0.7)
    fenda_x = W * (0.62 if not retrato else 0.58)
    luzes = []

    # ================================================================ fundo
    f = Tela(W, H)
    k = np.clip(y / H, 0, 1)
    f.tingir(np.ones((H, W), bool), np.clip(0.15 + 0.25 * fbm(x / 30, y / 18, 4, 3) + 0.25 * (1 - np.abs(x - W / 2) / W), 0, 0.999), ROCHA_LONGE, 0.6)
    # três cortinas de rocha que recuam (cada vez mais azuis e claras)
    for i, (base, amp, luz) in enumerate(((0.38, 0.16, 0.62), (0.56, 0.12, 0.38), (0.76, 0.08, 0.16))):
        perfil = H * base - H * amp * (0.5 + 0.5 * np.sin(x / (W * (0.09 + i * 0.03)) + i * 1.7)) - H * amp * 0.6 * fbm(x / 14, i * 3, 3, 10 + i)
        camada = y > perfil
        f.tingir(camada, np.clip(luz + 0.16 * fbm(x / 8, y / 8, 3, 20 + i) - 0.3 * ((y - perfil) / H), 0, 0.999), ROCHA_LONGE if i < 2 else ROCHA[1:], 0.6)
        f.tingir(camada & (y < perfil + 1.6), np.full((H, W), min(0.95, luz + 0.3), F), ROCHA_LONGE, 0.3)   # crista iluminada pela fenda
    # a fenda no teto com um pedaço de céu e o feixe de luz
    # recorte irregular, mais largo em cima: um pedaço de céu claro com nuvem
    meia_f = (W * 0.05) * np.clip(1 - y / (H * 0.16), 0, 1) ** 0.7 * (0.75 + 0.5 * fbm(y / 4, 2, 2, 7))
    fenda = (np.abs(x - fenda_x - np.sin(y / 7) * 2) < meia_f) & (y < H * 0.16)
    f.cor(fenda, '#8ec4f4')
    f.cor(fenda & (fbm(x / 6, y / 3, 2, 8) > 0.6), '#ffffff')
    f.cor(fenda & ~(np.abs(x - fenda_x - np.sin(y / 7) * 2) < meia_f - 1.2), '#cfe4ff')
    # estalactites ao longe
    for i in range(int(W / 14)):
        sx = (i + 0.5) * 14 + 6 * np.sin(i * 7.1)
        comp = H * (0.06 + 0.1 * ((i * 37) % 7) / 7)
        lt = (np.abs(x - sx) < 3.2 * np.clip(1 - y / comp, 0, 1)) & (y < comp)
        f.tingir(lt, np.clip(0.35 - y / (comp * 3), 0, 0.999), ROCHA_LONGE, 0.4)
    f.velar(np.clip(0.16 - k * 0.1, 0, 1), '#5a70b8')
    f.salvar(saida / f'{nome}-fundo.png')

    # ================================================================ meio
    m = Tela(W, H)
    # paredes laterais grossas, rugosas
    for lado in (-1, 1):
        borda = 0 if lado < 0 else W
        d = np.abs(x - borda)
        larg = W * (0.18 if not retrato else 0.2) + W * 0.06 * fbm(y / 22, lado * 5, 3, 30 + lado) + W * 0.05 * np.sin(y / (H * 0.12) + lado)
        parede = d < larg
        sombra = 0.25 + 0.25 * fbm(x / 6, y / 6, 3, 33) - 0.2 * (d / larg) * 0 + 0.15 * (d / larg)
        m.tingir(parede, np.clip(sombra, 0, 0.999), ROCHA, 0.6)
        m.tingir(parede & (np.abs(d - larg) < 1.3), np.full((H, W), 0.55, F), ROCHA, 0.4)   # aresta iluminada
        musgo = parede & (fbm(x / 5, y / 5, 2, 40 + lado) > 0.68) & (y > H * 0.3)
        m.tingir(musgo, np.full((H, W), 0.6, F), MUSGO, 0.4)
    # chão de pedra
    chao = y > chao_y + 6 * np.sin(x / (W * 0.13)) + 4 * fbm(x / 10, 1, 2, 50)
    zc = np.clip((y - chao_y) / (H - chao_y), 0, 1)
    lch = 0.25 + 0.25 * zc + 0.15 * fbm(x / 7, y / 4, 3, 51) - 0.18 * (fbm(x / 3, y / 2, 2, 52) > 0.7)
    m.tingir(chao, np.clip(lch, 0, 0.999), ROCHA, 0.6)
    # lago subterrâneo, elíptico, espelhando cristais e a luz
    lc = np.array([W * (0.42 if not retrato else 0.45), chao_y + (H - chao_y) * 0.45])
    lrx, lry = W * (0.24 if not retrato else 0.34), (H - chao_y) * 0.28
    lago = np.hypot((x - lc[0]) / lrx, (y - lc[1]) / lry) < 1 - 0.08 * fbm(x / 6, y / 4, 2, 60)
    ref = 0.38 + 0.25 * np.exp(-((x - fenda_x) / (W * 0.05)) ** 2) + 0.12 * np.sin(y * 1.4 + x * 0.05)
    m.tingir(lago, np.clip(ref, 0, 0.999), AGUA, 0.6)
    borda_l = lago & ~(np.hypot((x - lc[0]) / (lrx - 3), (y - lc[1]) / (lry - 1.5)) < 1 - 0.08 * fbm(x / 6, y / 4, 2, 60))
    m.cor(borda_l, '#7ab0e8', 0.6)
    # aglomerados de cristal (prismas com face clara e escura) e o reflexo de cada um no lago
    grupos = [(0.13, 0.72, 1.3, 'v'), (0.86, 0.7, 1.2, 'c'), (0.26, 0.64, 0.8, 'c'), (0.74, 0.63, 0.75, 'v'), (0.6, 0.86, 0.9, 'v')]
    if retrato:
        grupos = [(0.16, 0.7, 1.1, 'v'), (0.84, 0.68, 1.0, 'c'), (0.72, 0.88, 0.8, 'v')]
    for gx, gy, esc, tipo in grupos:
        bx, by = W * gx, H * gy
        R = CRISTAL_V if tipo == 'v' else CRISTAL_C
        for j, (dx, alt, inc, larg) in enumerate(((0, 26, 0.0, 6), (-7, 17, -0.35, 4.5), (7, 19, 0.3, 4.5), (-12, 10, -0.6, 3.4), (12, 11, 0.55, 3.4))):
            alt *= esc; larg *= esc
            topo = np.array([bx + dx * esc + np.sin(inc) * alt, by - alt])
            base_c = np.array([bx + dx * esc, by])
            v = topo - base_c; L = np.linalg.norm(v); u = v / L; n = np.array([-u[1], u[0]])
            rel = (x - base_c[0]) * u[0] + (y - base_c[1]) * u[1]
            lat = (x - base_c[0]) * n[0] + (y - base_c[1]) * n[1]
            meia = larg * np.clip((L - rel) / (L * 0.25), 0, 1)
            prisma = (rel > 0) & (rel < L) & (np.abs(lat) < meia)
            face = np.where(lat < 0, 0.58, 0.32) + 0.12 * (rel / L)
            m.tingir(prisma, np.clip(face, 0, 0.999), R, 0.4)
            m.tingir(prisma & (np.abs(lat + meia * 0.4) < 0.6), np.full((H, W), 0.82, F), R, 0.2)
            luzes.append((topo[0], topo[1] + alt * 0.4, alt * 1.4, '#9058d8' if tipo == 'v' else '#40b8d0', 0.28 * esc))
    # cogumelos luminosos nas bordas do lago
    for i, (gx, gy) in enumerate(((0.2, 0.83), (0.33, 0.9), (0.68, 0.82), (0.8, 0.92), (0.5, 0.95)) if not retrato else ((0.25, 0.86), (0.7, 0.8), (0.55, 0.95))):
        cx_, cy_ = W * gx, H * gy
        for j in range(3):
            ox = (j - 1) * 4.5; alt = 4 + (j % 2) * 3
            haste = (np.abs(x - cx_ - ox) < 0.9) & (y > cy_ - alt) & (y < cy_)
            m.tingir(haste, np.full((H, W), 0.7, F), COGU, 0.2)
            chapeu = (np.hypot((x - cx_ - ox) / 3.2, (y - (cy_ - alt)) / 2) < 1) & (y < cy_ - alt + 0.6)
            m.tingir(chapeu, np.clip(0.8 - (y - (cy_ - alt - 2)) / 6, 0, 0.999), COGU, 0.3)
        luzes.append((cx_, cy_ - 5, 12, '#6ad69a', 0.5))
    m.salvar(saida / f'{nome}-meio.png')

    # ================================================================ frente
    fr = Tela(W, H)
    # estalactites grandes e escuras, como moldura no topo
    for i, (sx, comp, larg) in enumerate(((0.06, 0.32, 9), (0.17, 0.2, 6), (0.3, 0.12, 4), (0.78, 0.15, 5), (0.9, 0.28, 8), (0.97, 0.4, 10))):
        cxs = W * sx
        c_ = H * comp
        lt = (np.abs(x - cxs) < larg * np.clip(1 - y / c_, 0, 1) ** 0.8) & (y < c_)
        fr.tingir(lt, np.clip(0.15 + 0.15 * (x < cxs) + 0.1 * fbm(x / 3, y / 3, 2, 70 + i), 0, 0.999), ROCHA, 0.5)
        gota = np.hypot(x - cxs, y - (c_ + 3)) < 1.2
        fr.cor(gota, '#9ad0ff', 0.9)
    teto = y < H * 0.04 + 6 * fbm(x / 9, 0, 3, 80)
    fr.tingir(teto, np.full((H, W), 0.12, F), ROCHA, 0.4)
    # rochas em primeiro plano nos cantos de baixo
    for lado in (-1, 1):
        bx = 0 if lado < 0 else W
        pedra = np.hypot((x - bx) / (W * 0.16), (y - H * 1.02) / (H * 0.14)) < 1 + 0.15 * fbm(x / 6, y / 6, 2, 90 + lado)
        fr.tingir(pedra, np.clip(0.1 + 0.15 * fbm(x / 4, y / 4, 2, 92) + 0.12 * (y < H * 0.93), 0, 0.999), ROCHA, 0.5)
    fr.salvar(saida / f'{nome}-frente.png')

    # ================================================================ luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    # feixe da fenda: desce em diagonal até o lago, com poeira de luz
    eixo = fenda_x + (y - H * 0.1) * -0.18
    feixe = np.exp(-((x - eixo) / (W * 0.045 + y * 0.06)) ** 2) * np.clip(1 - y / (H * 0.95), 0, 1) * 0.5
    poeira = (fbm(x / 2, y / 2, 2, 99) > 0.78) * feixe * 0.8
    brilho += (feixe + poeira)[..., None] * np.array(hexrgb('#fff2c8'), F)
    brilho += (np.exp(-(((x - (lc[0] + (fenda_x - lc[0]) * 0.6)) / (lrx * 0.4)) ** 2 + ((y - lc[1]) / (lry * 0.6)) ** 2)) * 0.35)[..., None] * np.array(hexrgb('#cfe8ff'), F)
    for bx, by, r, cor, kk in luzes:
        g = np.exp(-((x - bx) ** 2 + ((y - by) * 1.1) ** 2) / (r ** 2)) * kk
        brilho += g[..., None] * np.array(hexrgb(cor), F)
    a = np.clip(brilho.max(-1) / 255, 0, 1)
    lz.rgb = np.where(a[..., None] > 0, brilho / np.maximum(a[..., None], 1e-3), 0); lz.a = a
    lz.salvar(saida / f'{nome}-luz.png')


if __name__ == '__main__':
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'cenarios'
    saida.mkdir(parents=True, exist_ok=True)
    so = sys.argv[2] if len(sys.argv) > 2 else 'ambos'
    if so in ('ambos', 'paisagem'):
        pintar(520, 330, saida, 'caverna-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'caverna-retrato')
    print('ok', saida)
