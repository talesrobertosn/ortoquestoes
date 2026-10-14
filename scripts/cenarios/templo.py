#!/usr/bin/env python3
"""Templo do Sol: onde vivem o Basilisco e o Leviatã dos Tendões (14/10/2026).

Santuário de arenito dourado com o teto aberto para o céu (um andar feliz, como o Jardim): colunas
com trepadeiras e flores, um grande disco solar esculpido na parede do fundo, degraus que descem até
um espelho d'água com lótus e peixinhos, braseiros acesos e feixes de sol entrando pelo vão do teto.
Sem anatomia nos enfeites (regra de docs/flashcards/README.md). Camadas:
  fundo   céu com nuvens, parede do fundo com o disco solar e a porta, frontão quebrado
  meio    colunas com hera, degraus, espelho d'água com lótus, braseiros
  frente  vigas quebradas do teto com trepadeiras, folhagem nos cantos de baixo
  luz     feixes de sol, braseiros, brilho do disco e reflexo na água

    python3 scripts/cenarios/templo.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa  # noqa: E402

ARENITO = rampa(['#5a3a1e', '#7a5028', '#9a6a34', '#b88442', '#d0a056', '#e2ba70', '#f0d290', '#faeab8'])
ARENITO_E = rampa(['#3a2414', '#4e321c', '#664224', '#7e542e'])
OURO = rampa(['#5a3a0a', '#8a5c14', '#b8841e', '#e0ac34', '#f6d060', '#fff0a8'])
HERA = rampa(['#1e4a20', '#2a6228', '#3a7c30', '#4e963a', '#68b048', '#8cc85a'])
AGUA = rampa(['#1a6a8a', '#2482a2', '#3a9cba', '#5ab6d0', '#86d0e2', '#c0ecf4'])
LOTUS = rampa(['#a03a6a', '#c85a8a', '#e47ea8', '#f6a8c6', '#ffd4e4'])
FOGO = rampa(['#7a1a06', '#d0480e', '#ff8a1a', '#ffc24a', '#fff2b0'])


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    t0 = Tela(W, H); x, y = t0.x, t0.y
    cx = W / 2
    s = (W / 520) if not retrato else (W / 280)
    parede_y0, parede_y1 = H * 0.16, H * (0.56 if retrato else 0.6)
    agua_y = parede_y1 + (H - parede_y1) * 0.35
    luzes = []

    # ================================================================ fundo
    f = Tela(W, H)
    k = np.clip(y / parede_y1, 0, 1)
    alto, baixo = np.array(hexrgb('#5ab0ec'), F), np.array(hexrgb('#ffe8c0'), F)
    f.rgb[:] = alto * (1 - k[..., None] ** 1.3) + baixo * (k[..., None] ** 1.3); f.a[:] = 1
    nuv = fbm(x / 36, y / 12, 4, 31) + 0.25 * np.exp(-((y - H * 0.08) / (H * 0.08)) ** 2)
    f.cor(nuv > 0.68, '#ffffff', 0.9)
    f.cor((nuv > 0.68) & (fbm(x / 36, (y - 2) / 12, 4, 31) + 0.25 * np.exp(-((y - 2 - H * 0.08) / (H * 0.08)) ** 2) < 0.72), '#f6dcc8', 0.8)
    # parede do fundo de blocos de arenito
    fy = np.floor(y / 8).astype(np.int64)
    junta = ((y % 8) < 0.9) | (((x + (fy % 2) * 7) % 15) < 0.9)
    parede = (y > parede_y0) & (y < parede_y1)
    # topo quebrado (o teto ruiu): recorte irregular
    quebra = parede_y0 + H * 0.05 * fbm(x / 18, 3, 3, 40) + H * 0.04 * (np.abs(x - cx) < W * 0.2) * -1
    parede &= y > quebra
    lp = 0.45 + 0.12 * fbm(x / 7, y / 7, 3, 41) - 0.15 * junta + 0.12 * np.exp(-((x - cx) / (W * 0.3)) ** 2)
    f.tingir(parede, np.clip(lp, 0, 0.999), ARENITO, 0.5)
    f.velar(parede * np.clip((np.abs(x - cx) / (W / 2)) ** 1.5 * 0.35, 0, 1), '#6a4a3a')   # a parede escurece nas laterais
    # disco solar esculpido com raios e o portal embaixo
    dc = np.array([cx, parede_y0 + (parede_y1 - parede_y0) * 0.36]); dr = 24 * s
    dd = np.hypot(x - dc[0], y - dc[1]); ang = np.arctan2(y - dc[1], x - dc[0])
    raios = parede & (dd > dr * 1.1) & (dd < dr * 1.75) & (np.abs(((ang / (2 * np.pi) * 16) % 1) - 0.5) < 0.18)
    f.tingir(raios, np.clip(0.55 + 0.25 * np.cos(ang + 2.2), 0, 0.999), OURO, 0.4)
    disco = dd < dr
    f.tingir(disco, np.clip(0.55 + 0.35 * (1 - dd / dr) + 0.15 * np.cos(ang + 2.2), 0, 0.999), OURO, 0.4)
    f.tingir(disco & (np.abs(dd - dr * 0.62) < 0.8), np.full((H, W), 0.25, F), OURO, 0.2)
    luzes.append((dc[0], dc[1], dr * 2.2, '#ffd27a', 0.4))
    pw, ph = 18 * s, 34 * s
    porta = (np.abs(x - cx) < pw) & (y > parede_y1 - ph) & (y < parede_y1) & ((y > parede_y1 - ph + pw) | (np.hypot(x - cx, y - (parede_y1 - ph + pw)) < pw))
    f.cor(porta, '#2a1a10')
    f.tingir(porta & (y > parede_y1 - ph * 0.5), np.clip(0.2 + 0.2 * np.exp(-((x - cx) / pw) ** 2), 0, 0.999), ARENITO_E, 0.4)
    f.salvar(saida / f'{nome}-fundo.png')

    # ================================================================ meio
    m = Tela(W, H)
    chao = y >= parede_y1
    zz = np.clip((y - parede_y1) / (H - parede_y1), 0, 1)
    # piso de lajes de arenito, claro e quente
    tw = 16 * s * (0.6 + zz)
    lajes = (np.abs((((x - cx) / tw) % 1) - 0.5) > 0.46) | (np.abs((((y - parede_y1) / (8 * s * (0.6 + zz))) % 1) - 0.5) > 0.44)
    m.tingir(chao, np.clip(0.36 + 0.22 * zz + 0.08 * fbm(x / 6, y / 4, 2, 50) - 0.15 * lajes, 0, 0.999), ARENITO, 0.5)
    m.velar(chao * 0.18, '#c87a6a')   # lajes um pouco rosadas, para separar do muro
    # degraus que descem até o espelho d'água
    for i in range(3):
        dy0 = parede_y1 + (agua_y - parede_y1) * (i / 3)
        degrau = chao & (y >= dy0) & (y < dy0 + 3 * s) & (np.abs(x - cx) < W * (0.22 + i * 0.05))
        m.tingir(degrau, np.full((H, W), 0.75, F), ARENITO, 0.3)
    # espelho d'água retangular com borda, lótus e peixinhos
    aw = W * (0.3 if not retrato else 0.36)
    ab = H * 0.92
    agua = (np.abs(x - cx) < aw * (0.8 + 0.2 * (y - agua_y) / (ab - agua_y))) & (y > agua_y) & (y < ab)
    ref = 0.45 + 0.25 * np.exp(-((x - cx) / (aw * 0.5)) ** 2) * np.clip(1 - (y - agua_y) / (ab - agua_y), 0, 1) + 0.1 * np.sin(y * 1.2 + x * 0.06)
    m.tingir(agua, np.clip(ref, 0, 0.999), AGUA, 0.5)
    borda = (np.abs(x - cx) < aw * (0.8 + 0.2 * (y - agua_y) / (ab - agua_y)) + 3 * s) & (y > agua_y - 3 * s) & (y < ab + 3 * s) & ~agua
    m.tingir(borda, np.clip(0.7 - 0.2 * (y > ab), 0, 0.999), ARENITO, 0.3)
    for i, (gx, gy, r) in enumerate(((-0.5, 0.3, 6), (0.35, 0.45, 5), (-0.1, 0.7, 7), (0.6, 0.78, 4.5))):
        lc_ = np.array([cx + gx * aw * 0.8, agua_y + (ab - agua_y) * gy]); r *= s
        folha = np.hypot((x - lc_[0]) / r, (y - lc_[1]) / (r * 0.45)) < 1
        folha &= ~((np.abs(np.arctan2(y - lc_[1], x - lc_[0]) - 0.4) < 0.25) & folha)
        m.tingir(folha, np.clip(0.5 + 0.2 * (y < lc_[1]), 0, 0.999), HERA, 0.3)
        if i % 2 == 0:
            flor = np.hypot((x - lc_[0] - r * 0.2) / (r * 0.38), (y - lc_[1] + r * 0.25) / (r * 0.3)) < 1
            m.tingir(flor, np.clip(0.75 - (y - lc_[1] + r * 0.3) / (r * 0.6), 0, 0.999), LOTUS, 0.3)
            m.cor(np.hypot(x - lc_[0] - r * 0.2, y - lc_[1] + r * 0.28) < max(0.8, r * 0.1), '#ffe060')
    for i, (gx, gy) in enumerate(((0.15, 0.55), (-0.35, 0.62))):
        pc = np.array([cx + gx * aw, agua_y + (ab - agua_y) * gy])
        peixe = np.hypot((x - pc[0]) / (3.6 * s), (y - pc[1]) / (1.4 * s)) < 1
        cauda = (np.abs(y - pc[1]) < (x - pc[0] - 3 * s) * 0.6) & (x > pc[0] + 3 * s) & (x < pc[0] + 5.4 * s)
        m.cor(peixe | cauda, '#ff8a3a')
    # colunas com hera, em perspectiva (duas de cada lado)
    for lado in (-1, 1):
        for i, (ux, alt_f, raio) in enumerate(((0.08, 1.08, 18), (0.26, 0.82, 11))):
            px_ = cx + lado * (W / 2) * (1 - ux * 2) * (0.95 if i == 0 else 0.62)
            r_ = raio * s
            topo = H * (0.02 if i == 0 else 0.1)
            base = H * alt_f if i == 0 else parede_y1 + (H - parede_y1) * 0.25
            fuste = (np.abs(x - px_) < r_) & (y > topo) & (y < base)
            sh = np.clip(0.6 - (x - px_) / r_ * 0.35 + 0.1 * np.cos((x - px_) / r_ * 5), 0, 0.999)
            m.tingir(fuste, sh, ARENITO, 0.5)
            m.tingir(fuste & (np.abs(((x - px_) / r_ * 2.5) % 1 - 0.5) > 0.44), np.clip(sh - 0.2, 0, 0.999), ARENITO, 0.3)
            m.tingir((np.abs(x - px_) < r_ * 1.3) & (y > base - 4 * s) & (y < base), np.full((H, W), 0.55, F), ARENITO, 0.3)
            # hera subindo pela coluna, com florzinhas
            hera = fuste & (np.sin((y / (6 * s)) + (x - px_) / r_ * 2 + i) > 0.35) & (fbm(x / 3, y / 3, 2, 60 + i + lado) > 0.45) & (y > topo + (base - topo) * 0.25)
            m.tingir(hera, np.clip(0.4 + 0.4 * fbm(x / 2, y / 2, 2, 61), 0, 0.999), HERA, 0.4)
            flor = hera & (fbm(x / 1.5, y / 1.5, 2, 62) > 0.78)
            m.cor(flor, '#f6a8c6')
    # braseiros de bronze nas laterais do espelho
    for lado in (-1, 1):
        bx = cx + lado * (aw + 22 * s)
        by = agua_y + 6 * s
        s2 = s; s = s * 1.6
        taca = (np.abs(x - bx) < 7 * s - (by - y) * 0.0) & (y > by - 5 * s) & (y < by) & (np.abs(x - bx) < 7 * s - (y - (by - 5 * s)) * 0.5)
        m.tingir(taca, np.full((H, W), 0.55, F), OURO, 0.3)
        m.tingir((np.abs(x - bx) < 1.6 * s) & (y >= by) & (y < by + 14 * s), np.full((H, W), 0.45, F), OURO, 0.3)
        chama = np.hypot((x - bx) / (5 * s), (y - (by - 9 * s)) / (7 * s)) < 1
        m.tingir(chama, np.clip(1 - np.hypot((x - bx) / (5 * s), (y - (by - 9 * s)) / (7 * s)), 0, 0.999), FOGO, 0.5)
        luzes.append((bx, by - 9 * s, 30 * s, '#ff9a40', 0.5))
        s = s2
    m.salvar(saida / f'{nome}-meio.png')

    # ================================================================ frente
    fr = Tela(W, H)
    # viga quebrada do teto atravessando o alto, com trepadeiras pendendo
    viga = (y < H * 0.05 + (x / W) * H * 0.04) & (y > (x / W) * H * 0.02 - 2) & (x < W * 0.62)
    fr.tingir(viga, np.clip(0.4 + 0.2 * (y < H * 0.02 + (x / W) * H * 0.04), 0, 0.999), ARENITO, 0.4)
    for i in range(10):
        hx = W * (0.03 + i * 0.06)
        comp = H * (0.08 + 0.12 * ((i * 37) % 5) / 5)
        cipo = (np.abs(x - hx - np.sin(y / (8 * s) + i) * 2 * s) < 1.2 * s) & (y > H * 0.04) & (y < H * 0.04 + comp)
        fr.tingir(cipo, np.clip(0.45 + 0.3 * ((y % 5) < 2), 0, 0.999), HERA, 0.3)
        fr.tingir(cipo & ((y % 7) < 2), np.full((H, W), 0.85, F), HERA, 0.2)
    # folhagem nos cantos de baixo
    for lado in (-1, 1):
        bx = 0 if lado < 0 else W
        moita = np.hypot((x - bx) / (W * 0.14), (y - H) / (H * 0.12)) < 1 + 0.25 * fbm(x / 4, y / 4, 3, 70 + lado)
        fr.tingir(moita, np.clip(0.3 + 0.4 * fbm(x / 3, y / 3, 2, 72), 0, 0.999), HERA, 0.5)
        fr.cor(moita & (fbm(x / 1.6, y / 1.6, 2, 74) > 0.8), '#ffe060')
    fr.salvar(saida / f'{nome}-frente.png')

    # ================================================================ luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    for i, off in enumerate((-0.18, 0.04, 0.22)):
        eixo = cx + off * W + (y - H * 0.05) * 0.28
        feixe = np.exp(-((x - eixo) / (W * 0.035 + y * 0.03)) ** 2) * np.clip(1 - y / (H * 1.0), 0, 1) * (0.32 if i != 1 else 0.42)
        brilho += feixe[..., None] * np.array(hexrgb('#fff0c0'), F)
    brilho += (np.exp(-(((x - cx) / (aw * 0.6)) ** 2 + ((y - (agua_y + ab) / 2) / ((ab - agua_y) * 0.4)) ** 2)) * 0.22)[..., None] * np.array(hexrgb('#c8f0ff'), F)
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
        pintar(520, 330, saida, 'templo-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'templo-retrato')
    print('ok', saida)
