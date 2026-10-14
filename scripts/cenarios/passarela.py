#!/usr/bin/env python3
"""Passarela das Nuvens: a ponte alta onde voam o Corvo de Kocher e a Harpia do Manguito (14/10/2026).

Um andar a céu aberto lá no alto: uma ponte de pedra em arco sobre um abismo de nuvens, com picos de
montanha ao longe, torres com bandeirolas nas duas pontas, lanternas penduradas nos parapeitos e
pássaros distantes. Céu de fim de tarde, quente no horizonte e azul em cima. Camadas:
  fundo   céu, sol baixo, montanhas em camadas de névoa, mar de nuvens lá embaixo
  meio    o tabuleiro da ponte em perspectiva, parapeitos, torres com bandeiras, lanternas
  frente  bandeirola grande em primeiro plano e nuvens passando nos cantos
  luz     sol, brilho das lanternas e borda dourada das nuvens

    python3 scripts/cenarios/passarela.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa  # noqa: E402

PEDRA = rampa(['#3a3442', '#4c4656', '#5e586a', '#726c80', '#888296', '#a09aac', '#bab4c4'])
TELHA = rampa(['#4a1a1a', '#6a2626', '#8a3430', '#aa463a', '#c85c46'])
BANDEIRA = rampa(['#2a3a8a', '#3a52b0', '#4e6ed0', '#6a8ce6', '#92b0f4'])
OURO = rampa(['#5a3a0a', '#8a5c14', '#b8841e', '#e0ac34', '#f6d060', '#fff0a8'])
MONT = [rampa(['#7a86b8', '#8a96c4', '#9ca6d0']), rampa(['#5a6aa0', '#6a7aae', '#7c8abc']), rampa(['#3e4e84', '#4c5c92', '#5c6ca0'])]


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    t0 = Tela(W, H); x, y = t0.x, t0.y
    cx = W / 2
    hz = H * (0.52 if retrato else 0.55)       # linha do mar de nuvens
    s = (W / 520) if not retrato else (W / 280)
    luzes = []

    # ================================================================ fundo
    f = Tela(W, H)
    k = np.clip(y / hz, 0, 1)
    alto, meio, baixo = np.array(hexrgb('#4a7ad0'), F), np.array(hexrgb('#9ab4e8'), F), np.array(hexrgb('#ffcf94'), F)
    ceu = np.where(k[..., None] < 0.6, alto + (meio - alto) * (k[..., None] / 0.6), meio + (baixo - meio) * ((k[..., None] - 0.6) / 0.4))
    f.rgb[:] = ceu; f.a[:] = 1
    sol = np.array([W * (0.72 if not retrato else 0.7), hz - H * 0.3])
    f.cor(np.hypot(x - sol[0], y - sol[1]) < 16 * s, '#fff2c8')
    f.cor(np.hypot(x - sol[0], y - sol[1]) < 11 * s, '#ffffff')
    luzes.append((sol[0], sol[1], 90 * s, '#ffd090', 0.55))
    # nuvens altas em faixas
    nv = fbm(x / 50, y / 10, 4, 3) + 0.2 * np.exp(-((y - H * 0.18) / (H * 0.08)) ** 2)
    f.cor(nv > 0.7, '#ffffff', 0.85)
    f.cor((nv > 0.7) & (fbm(x / 50, (y + 2) / 10, 4, 3) + 0.2 * np.exp(-((y + 2 - H * 0.18) / (H * 0.08)) ** 2) < 0.73), '#f2c8c8', 0.7)
    # montanhas em três camadas de névoa
    for i, R in enumerate(MONT):
        base = hz - H * (0.02 - i * 0.01)
        picos = H * (0.24 - i * 0.05) * (0.5 + 0.5 * np.abs(np.sin(x / (W * (0.08 + i * 0.03)) + i * 1.9))) + H * 0.04 * fbm(x / 10, i, 3, 10 + i)
        mont = y > base - picos
        f.tingir(mont & (y < hz + 2), np.clip(0.5 + 0.35 * ((x - sol[0]) < 0) * 0 + 0.3 * (y < base - picos + 3) - 0.2 * ((y - (base - picos)) / (H * 0.2)), 0, 0.999), R, 0.5)
        neve = mont & (y < base - picos + H * 0.025) & (i < 2)
        f.cor(neve, '#f4f2ff', 0.8)
    # mar de nuvens lá embaixo, com bordas douradas
    mar = y > hz - 4 * fbm(x / 20, 1, 3, 20)
    lm = 0.55 + 0.35 * fbm(x / 22, y / 7, 4, 21) - 0.25 * np.clip((y - hz) / (H - hz), 0, 1)
    f.tingir(mar, np.clip(lm, 0, 0.999), rampa(['#a8b4dc', '#c4cce8', '#dcdff2', '#f2eef8', '#ffffff']), 0.6)
    f.cor(mar & (np.abs(y - (hz - 4 * fbm(x / 20, 1, 3, 20))) < 1.3), '#ffe0a8', 0.8)
    f.salvar(saida / f'{nome}-fundo.png')

    # ================================================================ meio
    m = Tela(W, H)
    # tabuleiro da ponte em perspectiva: some ao longe no horizonte, perto ocupa a base
    vy = hz - H * 0.06
    meia_perto = W * (0.42 if not retrato else 0.5)
    t_ = np.clip((y - vy) / (H - vy), 0, 1)
    meia = 6 * s + (meia_perto - 6 * s) * t_
    tab = (np.abs(x - cx) < meia) & (y > vy)
    zz = 1 / np.maximum(t_, 0.02)
    laje = (np.abs(((zz * 1.2) % 1) - 0.5) > 0.44) | (np.abs((((x - cx) / np.maximum(meia, 1) * 3) % 1) - 0.5) > 0.46)
    m.tingir(tab, np.clip(0.42 + 0.25 * t_ + 0.08 * fbm(x / 5, y / 3, 2, 30) - 0.14 * laje, 0, 0.999), PEDRA, 0.5)
    # passadeira azul no meio
    m.tingir(tab & (np.abs(x - cx) < meia * 0.22), np.clip(0.45 + 0.25 * t_, 0, 0.999), BANDEIRA, 0.4)
    m.tingir(tab & (np.abs(np.abs(x - cx) - meia * 0.22) < np.maximum(0.6, meia * 0.015)), np.full((H, W), 0.75, F), OURO, 0.3)
    # parapeitos com pilaretes
    for lado in (-1, 1):
        borda = cx + lado * meia
        alt = 4 * s + 26 * s * t_
        muro = (np.abs(x - borda) < np.maximum(1, 3 * s * t_ + 0.8)) & (y > vy) & (y < vy + (H - vy) * t_ + 1)
        par = (lado * (x - borda) > -np.maximum(1.5, 4 * s * t_)) & (lado * (x - borda) < np.maximum(1.5, 5 * s * t_)) & (y > vy) & (y < H)
        topo_p = y - (y - alt)
        m.tingir(par & tab.__invert__(), np.clip(0.5 + 0.2 * t_, 0, 0.999), PEDRA, 0.4)
        # pilaretes espaçados em perspectiva
        for j in range(1, 9):
            tj = (j / 9) ** 1.6
            py_ = vy + (H - vy) * tj
            px_ = cx + lado * (6 * s + (meia_perto - 6 * s) * tj)
            ph = 4 * s + 30 * s * tj
            pw = 1 + 4 * s * tj
            pil = (np.abs(x - px_) < pw) & (y > py_ - ph) & (y < py_)
            m.tingir(pil, np.clip(0.6 - (x - px_) / max(pw, 1) * 0.2 * lado, 0, 0.999), PEDRA, 0.3)
            m.tingir((np.abs(x - px_) < pw * 1.4) & (np.abs(y - (py_ - ph)) < max(1, pw * 0.5)), np.full((H, W), 0.8, F), PEDRA, 0.3)
            if j in (3, 6):
                # lanterna pendurada no pilarete
                lx_, ly_ = px_ - lado * pw * 2.2, py_ - ph * 0.8
                lan = (np.abs(x - lx_) < pw * 0.9) & (np.abs(y - ly_) < pw * 1.2)
                m.cor(lan, '#ffd27a')
                m.tingir((np.abs(x - lx_) < pw * 1.1) & (np.abs(y - (ly_ - pw * 1.3)) < max(0.6, pw * 0.25)), np.full((H, W), 0.4, F), OURO, 0.2)
                luzes.append((lx_, ly_, 16 * s * (0.4 + tj), '#ffb050', 0.5))
        # corrimão contínuo ligando os pilaretes
        corr_y = vy + (H - vy) * t_ - (4 * s + 30 * s * t_) * 0.95
        corr = (np.abs(y - corr_y) < np.maximum(0.7, 1.8 * s * t_)) & (np.abs(x - (cx + lado * meia)) < np.maximum(1.2, 3 * s * t_)) & (y > vy)
        m.tingir(corr, np.full((H, W), 0.75, F), PEDRA, 0.3)
    # torre com bandeira na ponta de longe (no centro) e uma de cada lado perto
    for (tx, ty, th, tw) in ((cx, vy, 40 * s, 10 * s),):
        torre = (np.abs(x - tx) < tw) & (y > ty - th) & (y < ty + 2)
        m.tingir(torre, np.clip(0.45 + 0.2 * ((x - tx) < 0), 0, 0.999), PEDRA, 0.4)
        tel = (np.abs(x - tx) < tw * 1.3 - (ty - th - y) * -0.0) & (y > ty - th - tw * 1.4) & (y <= ty - th) & (np.abs(x - tx) < (y - (ty - th - tw * 1.4)) * 0.95)
        m.tingir(tel, np.full((H, W), 0.55, F), TELHA, 0.3)
        mastro = (np.abs(x - tx) < 0.7) & (y > ty - th - tw * 2.6) & (y < ty - th - tw * 1.4)
        m.cor(mastro, '#3a2a1a')
        flam = (x > tx) & (x < tx + tw * 1.6) & (np.abs(y - (ty - th - tw * 2.3 + np.sin((x - tx) / 3) * 1.2)) < tw * 0.3 * (1 - (x - tx) / (tw * 1.6)))
        m.tingir(flam, np.full((H, W), 0.6, F), BANDEIRA, 0.3)
        m.cor((np.abs(x - tx) < tw * 0.3) & (np.abs(y - (ty - th * 0.5)) < tw * 0.5), '#1a1420')   # janela
        m.cor((np.abs(x - tx) < tw * 0.3) & (np.abs(y - (ty - th * 0.5)) < tw * 0.5) & (y > ty - th * 0.5), '#ffd27a', 0.6)
    # pássaros distantes (vês simples)
    for (bx, by, bs) in ((0.2, 0.22, 1.0), (0.26, 0.19, 0.8), (0.82, 0.3, 0.9)):
        px_, py_ = W * bx, H * by
        ave = (np.abs(np.abs(x - px_) - (py_ - y) * 2.2) < 0.7) & (np.abs(x - px_) < 3 * s * bs) & (y < py_ + 0.5) & (y > py_ - 2 * s * bs)
        m.cor(ave, '#3a3448')
    m.salvar(saida / f'{nome}-meio.png')

    # ================================================================ frente
    fr = Tela(W, H)
    # bandeirola grande pendurada no alto, à esquerda, balançando
    for lado, bx in ((-1, W * 0.04), (1, W * 0.96)):
        mastro = (np.abs(x - bx) < 1.3 * s) & (y < H * 0.36)
        fr.tingir(mastro, np.full((H, W), 0.5, F), OURO, 0.3)
        d = -lado * (x - bx)
        pano = (d > 0) & (d < 34 * s) & (y > H * 0.04 + np.sin(d / (7 * s)) * 2 * s) & (y < H * 0.04 + 16 * s + np.sin(d / (7 * s)) * 2 * s - d * 0.15)
        fr.tingir(pano, np.clip(0.5 + 0.2 * np.sin(d / (5 * s)), 0, 0.999), BANDEIRA if lado < 0 else TELHA, 0.4)
        fr.tingir(pano & (np.abs(y - (H * 0.04 + 8 * s + np.sin(d / (7 * s)) * 2 * s - d * 0.07)) < 1.2 * s), np.full((H, W), 0.7, F), OURO, 0.3)
    # nuvens passando nos cantos de baixo
    for lado in (-1, 1):
        bx = 0 if lado < 0 else W
        nuv = np.hypot((x - bx) / (W * 0.2), (y - H * 0.98) / (H * 0.1)) < 1 + 0.35 * fbm(x / 8, y / 6, 3, 80 + lado)
        fr.tingir(nuv, np.clip(0.6 + 0.3 * fbm(x / 6, y / 4, 2, 82), 0, 0.999), rampa(['#c4cce8', '#dcdff2', '#f2eef8', '#ffffff']), 0.5)
    fr.salvar(saida / f'{nome}-frente.png')

    # ================================================================ luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    for bx, by, r, cor, kk in luzes:
        g = np.exp(-((x - bx) ** 2 + ((y - by) * 1.1) ** 2) / (r ** 2)) * kk
        brilho += g[..., None] * np.array(hexrgb(cor), F)
    brilho += (np.exp(-((y - hz) / (H * 0.05)) ** 2) * 0.25)[..., None] * np.array(hexrgb('#ffd8a0'), F)
    a = np.clip(brilho.max(-1) / 255, 0, 1)
    lz.rgb = np.where(a[..., None] > 0, brilho / np.maximum(a[..., None], 1e-3), 0); lz.a = a
    lz.salvar(saida / f'{nome}-luz.png')


if __name__ == '__main__':
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'cenarios'
    saida.mkdir(parents=True, exist_ok=True)
    so = sys.argv[2] if len(sys.argv) > 2 else 'ambos'
    if so in ('ambos', 'paisagem'):
        pintar(520, 330, saida, 'passarela-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'passarela-retrato')
    print('ok', saida)
