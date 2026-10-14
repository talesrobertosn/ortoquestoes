#!/usr/bin/env python3
"""Laboratório do Alquimista: onde trabalham o Slime Sinovial, a Mão dos Tendões e o Arconte (14/10/2026).

Sala de pedra com teto de vigas: prateleiras cheias de frascos coloridos, uma bancada com alambique
e balões borbulhando, um caldeirão verde ao fundo e um lustre de velas. O toque ortopédico: na
parede, um negatoscópio aceso com a radiografia de um fêmur com placa, e um esqueleto de estudo
pendurado num suporte. Luz verde-água das poções contra o amarelo das velas. Camadas:
  fundo   parede de pedra, janela redonda com noite, prateleiras e o negatoscópio
  meio    piso de tábuas, bancada com vidraria, caldeirão, esqueleto de estudo
  frente  vigas do teto, lustre, livros e frascos em primeiro plano
  luz     poções, caldeirão, negatoscópio, velas

    python3 scripts/cenarios/laboratorio.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa  # noqa: E402

PEDRA = rampa(['#16141a', '#221e24', '#2e2830', '#3c343a', '#4a4046', '#5a4e52', '#6c5e60'])
MADEIRA = rampa(['#1e120a', '#2e1c10', '#422a18', '#583a22', '#704c2e', '#8a603c'])
VIGA = rampa(['#120a06', '#1e120a', '#2c1c10', '#3e2a18', '#523822'])
VIDRO = ['#3ad8b0', '#e04a8a', '#f2c040', '#5a8af0', '#9a5ae0', '#7ae05a']
OSSO_RX = rampa(['#0a1a2a', '#16304a', '#2a5478', '#5a8ab0', '#a8d0ec', '#e8f6ff'])
OSSO = rampa(['#6a5e4c', '#968a72', '#c0b498', '#e2d8c0', '#f6f0e0'])
METAL = rampa(['#1a1a20', '#2e2e38', '#4a4a58', '#707080', '#a0a0b0', '#d0d0dc'])
VERDE = rampa(['#0a3a2a', '#14604a', '#22906a', '#40c890', '#90f0c0', '#e0fff0'])


def ret(x, y, x0, y0, x1, y1):
    return (x >= x0) & (x < x1) & (y >= y0) & (y < y1)


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    t0 = Tela(W, H); x, y = t0.x, t0.y
    piso_y = H * (0.66 if retrato else 0.7)
    luzes = []
    s = (W / 520) * 1.7 if not retrato else (W / 250) * 1.15   # escala dos objetos

    # ================================================================ fundo
    f = Tela(W, H)
    fy = np.floor(y / 7).astype(np.int64)
    junta = ((y % 7) < 0.9) | (((x + (fy % 2) * 6) % 13) < 0.9)
    lp = 0.3 + 0.12 * fbm(x / 6, y / 6, 3, 2) - 0.18 * junta + 0.15 * np.exp(-((x - W / 2) / (W * 0.4)) ** 2)
    f.tingir(y < piso_y, np.clip(lp, 0, 0.999), PEDRA, 0.6)
    # janela redonda com céu de noite e lua
    jc = np.array([W * (0.5 if retrato else 0.5), H * 0.2]); jr = 22 * s
    dj = np.hypot(x - jc[0], y - jc[1])
    janela = dj < jr
    f.cor(janela, '#1a2a50')
    f.cor(janela & (fbm(x / 5, y / 5, 2, 4) > 0.8), '#e8eeff')
    f.cor(janela & (np.hypot(x - jc[0] - jr * 0.35, y - jc[1] + jr * 0.3) < jr * 0.28), '#fff6d0')
    f.cor(janela & ((np.abs(x - jc[0]) < 0.8) | (np.abs(y - jc[1]) < 0.8)), '#1a120a')
    f.tingir((dj >= jr) & (dj < jr + 3), np.full((H, W), 0.5, F), MADEIRA, 0.3)
    # prateleiras com frascos (duas de cada lado)
    for lado in (-1, 1):
        x0 = W * (0.05 if lado < 0 else 0.68) if not retrato else W * (0.03 if lado < 0 else 0.62)
        larg = W * (0.27 if not retrato else 0.35)
        for k, py in enumerate((0.24, 0.42)):
            yp = H * py
            tab = ret(x, y, x0, yp, x0 + larg, yp + 3 * s)
            f.tingir(tab, np.clip(0.5 + 0.25 * ((y - yp) < 1), 0, 0.999), MADEIRA, 0.3)
            n = int(larg / (9 * s))
            for i in range(n):
                cx_ = x0 + (i + 0.5) * larg / n
                alt = (8 + 6 * ((i * 7 + k * 3) % 3)) * s
                lr = (2.5 + ((i + k) % 2) * 1.2) * s
                cor = VIDRO[(i * 3 + k * 2 + (lado > 0)) % len(VIDRO)]
                corpo = (np.abs(x - cx_) < lr) & (y > yp - alt) & (y < yp)
                gargalo = (np.abs(x - cx_) < lr * 0.4) & (y > yp - alt - 3 * s) & (y <= yp - alt)
                f.cor(corpo, cor)
                f.rgb[corpo & (y < yp - alt * 0.6)] *= 0.55   # parte vazia do frasco
                f.cor(corpo & (np.abs(x - cx_ + lr * 0.5) < 0.7), '#ffffff', 0.7)
                f.cor(gargalo, '#a0b0c0')
                f.cor((np.abs(x - cx_) < lr * 0.5) & (np.abs(y - (yp - alt - 3.5 * s)) < 1), '#704c2e')
                if (i + k) % 3 == 0:
                    luzes.append((cx_, yp - alt * 0.3, 10 * s, cor, 0.35))
    # negatoscópio com a radiografia de um fêmur com placa e parafusos
    nx0 = W * (0.36 if not retrato else 0.3); nw, nh = 30 * s, 40 * s
    ny0 = H * 0.34
    caixa = ret(x, y, nx0, ny0, nx0 + nw, ny0 + nh)
    f.tingir(caixa, np.full((H, W), 0.4, F), METAL, 0.3)
    tela = ret(x, y, nx0 + 2 * s, ny0 + 2 * s, nx0 + nw - 2 * s, ny0 + nh - 2 * s)
    f.cor(tela, '#cfe6f4')
    fx_ = nx0 + nw / 2 + np.sin((y - ny0) / nh * 2.2) * 2 * s
    femur = tela & (np.abs(x - fx_) < 3.2 * s) & (y > ny0 + 8 * s)
    cabeca = tela & (np.hypot(x - (nx0 + nw / 2 - 4 * s), y - (ny0 + 7 * s)) < 4.5 * s)
    colo = tela & (np.abs((x - (nx0 + nw / 2 - 2 * s)) * 0.7 + (y - (ny0 + 9 * s)) * 0.7) < 2.4 * s) & (y < ny0 + 12 * s) & (y > ny0 + 5 * s)
    f.tingir(femur | cabeca | colo, np.clip(0.55 + 0.25 * np.exp(-((x - fx_) / (2 * s)) ** 2), 0, 0.999), OSSO_RX, 0.3)
    placa = tela & (np.abs(x - (fx_ + 3.6 * s)) < 1.1 * s) & (y > ny0 + 14 * s) & (y < ny0 + nh - 6 * s)
    f.cor(placa, '#ffffff')
    for k in range(4):
        py_ = ny0 + 16 * s + k * 5 * s
        f.cor(tela & (np.abs(y - py_) < 0.7) & (np.abs(x - fx_) < 4.5 * s), '#ffffff')
    luzes.append((nx0 + nw / 2, ny0 + nh / 2, 26 * s, '#cfe6ff', 0.45))
    # a parede esquenta perto do lustre e esfria nos cantos
    f.velar(np.clip(0.28 * np.exp(-(((x - W / 2) / (W * 0.35)) ** 2 + ((y - H * 0.18) / (H * 0.45)) ** 2)), 0, 1) * (y < piso_y), '#c08850')
    f.velar(np.clip(0.18 * (np.abs(x - W / 2) / (W / 2)) ** 2, 0, 1) * (y < piso_y), '#203a40')
    # piso distante
    f.tingir(y >= piso_y, np.full((H, W), 0.3, F), MADEIRA, 0.4)
    f.salvar(saida / f'{nome}-fundo.png')

    # ================================================================ meio
    m = Tela(W, H)
    # piso de tábuas
    piso = y >= piso_y
    zz = np.clip((y - piso_y) / (H - piso_y), 0, 1)
    tabua = np.floor((x - W / 2) / (14 * s * (0.6 + zz)) + 100).astype(np.int64)
    jt = np.abs((((x - W / 2) / (14 * s * (0.6 + zz))) % 1) - 0.5) > 0.45
    lpi = 0.28 + 0.2 * zz + 0.08 * fbm(x / 3, y / 12, 2, 7) + 0.06 * ((tabua % 3) == 0) - 0.18 * jt
    m.tingir(piso, np.clip(lpi, 0, 0.999), MADEIRA, 0.5)
    m.tingir(piso & (np.abs(y - piso_y) < 1.2), np.full((H, W), 0.15, F), MADEIRA, 0.3)
    # bancada com alambique, balões borbulhando e um caderno
    bx0 = W * (0.06 if not retrato else 0.04); bw = W * (0.36 if not retrato else 0.5)
    by0 = piso_y - 16 * s
    tampo = ret(x, y, bx0, by0, bx0 + bw, by0 + 4 * s)
    m.tingir(tampo, np.clip(0.55 + 0.2 * ((y - by0) < 1.2), 0, 0.999), MADEIRA, 0.4)
    for px_ in (bx0 + 3 * s, bx0 + bw - 6 * s):
        m.tingir(ret(x, y, px_, by0 + 4 * s, px_ + 3 * s, piso_y + 8 * s), np.full((H, W), 0.35, F), MADEIRA, 0.3)
    # balão redondo verde sobre um bico de chama
    bc = np.array([bx0 + bw * 0.3, by0 - 10 * s])
    balao = np.hypot(x - bc[0], y - bc[1]) < 7 * s
    m.tingir(balao, np.clip(0.55 + 0.3 * np.exp(-((x - bc[0] + 2 * s) ** 2 + (y - bc[1] + 2 * s) ** 2) / (16 * s * s)), 0, 0.999), VERDE, 0.4)
    m.rgb[balao & (y < bc[1] - 2 * s)] *= 0.6
    m.cor(ret(x, y, bc[0] - 1.6 * s, bc[1] - 15 * s, bc[0] + 1.6 * s, bc[1] - 6 * s), '#a8c0c8')
    m.cor(np.hypot(x - bc[0] + 3 * s, y - bc[1] + 3 * s) < 1.4 * s, '#ffffff', 0.8)
    luzes.append((bc[0], bc[1], 18 * s, '#40c890', 0.55))
    chama = np.hypot((x - bc[0]) / (2 * s), (y - (by0 - 1.5 * s)) / (2.4 * s)) < 1
    m.cor(chama, '#5ab0ff')
    # alambique de cobre com serpentina até um frasco rosa
    ac = np.array([bx0 + bw * 0.7, by0 - 8 * s])
    m.tingir(np.hypot((x - ac[0]) / (6 * s), (y - ac[1]) / (7 * s)) < 1, np.clip(0.55 - (x - ac[0]) / (14 * s), 0, 0.999), rampa(['#4a1e0a', '#7a3a16', '#a85a24', '#d07a36', '#f0a058']), 0.4)
    tubo = np.zeros((H, W), bool)
    for t in np.linspace(0, 1, 30):
        px_, py_ = ac[0] + 6 * s + t * 12 * s, ac[1] - 6 * s + t * t * 12 * s
        tubo |= np.hypot(x - px_, y - py_) < 0.9 * s
    m.cor(tubo, '#c88a4a')
    fc = np.array([ac[0] + 18 * s, by0 - 5 * s])
    frasco = (np.abs(x - fc[0]) < 3 * s + (y - (fc[1] - 6 * s)) * 0.35) & (y > fc[1] - 6 * s) & (y < by0)
    m.cor(frasco, '#e04a8a')
    luzes.append((fc[0], fc[1], 12 * s, '#e04a8a', 0.4))
    # caldeirão grande borbulhando
    kc = np.array([W * (0.72 if not retrato else 0.68), piso_y + 10 * s])
    caldeirao = (np.hypot((x - kc[0]) / (18 * s), (y - kc[1]) / (13 * s)) < 1) & (y > kc[1] - 8 * s)
    m.tingir(caldeirao, np.clip(0.4 - (x - kc[0]) / (40 * s) + 0.15 * (y < kc[1] - 4 * s), 0, 0.999), METAL, 0.4)
    borda = np.hypot((x - kc[0]) / (17 * s), (y - (kc[1] - 8 * s)) / (4 * s)) < 1
    m.tingir(borda, np.full((H, W), 0.5, F), METAL, 0.3)
    caldo = np.hypot((x - kc[0]) / (14.5 * s), (y - (kc[1] - 8 * s)) / (3 * s)) < 1
    m.tingir(caldo, np.clip(0.6 + 0.3 * np.sin(x / (2 * s)), 0, 0.999), VERDE, 0.4)
    for i, (dx, r) in enumerate(((-6, 2.2), (2, 1.6), (7, 2.6), (-1, 1.2))):
        bol = np.hypot(x - (kc[0] + dx * s), y - (kc[1] - 11 * s - i * 3 * s)) < r * s
        m.tingir(bol, np.full((H, W), 0.85, F), VERDE, 0.3)
    luzes.append((kc[0], kc[1] - 10 * s, 34 * s, '#40c890', 0.6))
    # fogo sob o caldeirão
    for dx in (-8, 0, 8):
        fogo = np.hypot((x - kc[0] - dx * s) / (3 * s), (y - (kc[1] + 13 * s)) / (4 * s)) < 1
        m.cor(fogo, '#ff8a1a')
    luzes.append((kc[0], kc[1] + 13 * s, 16 * s, '#ff8a40', 0.5))
    # esqueleto de estudo num suporte (fantasia, simples)
    ec = np.array([W * (0.9 if not retrato else 0.88), piso_y - 2 * s])
    m.tingir(ret(x, y, ec[0] - 0.8 * s, ec[1] - 52 * s, ec[0] + 0.8 * s, ec[1] + 6 * s), np.full((H, W), 0.5, F), METAL, 0.2)
    m.tingir(ret(x, y, ec[0] - 8 * s, ec[1] + 5 * s, ec[0] + 8 * s, ec[1] + 7 * s), np.full((H, W), 0.4, F), METAL, 0.2)
    cr = np.hypot((x - ec[0]) / (4.5 * s), (y - (ec[1] - 44 * s)) / (5 * s)) < 1
    m.tingir(cr, np.clip(0.75 - (x - ec[0]) / (12 * s), 0, 0.999), OSSO, 0.3)
    for ox in (-1.6, 1.6):
        m.cor(np.hypot(x - ec[0] - ox * s, y - (ec[1] - 44 * s)) < 1.2 * s, '#2a2018')
    coluna = (np.abs(x - ec[0]) < 1.1 * s) & (y > ec[1] - 39 * s) & (y < ec[1] - 16 * s) & ((np.floor((y) / (2 * s)) % 2) == 0)
    m.tingir(coluna, np.full((H, W), 0.7, F), OSSO, 0.2)
    for k in range(4):
        cy_ = ec[1] - 34 * s + k * 3.6 * s
        costela = (np.abs(np.hypot((x - ec[0]) / (6 * s - k * 0.4 * s), (y - cy_ - 3 * s) / (4 * s)) - 1) < 0.18) & (y < cy_ + 3 * s)
        m.tingir(costela, np.full((H, W), 0.7, F), OSSO, 0.2)
    pel = np.hypot((x - ec[0]) / (5 * s), (y - (ec[1] - 15 * s)) / (2.6 * s)) < 1
    m.tingir(pel, np.full((H, W), 0.7, F), OSSO, 0.2)
    for lado in (-1, 1):
        for (a, b) in (((ec[0] + lado * 3 * s, ec[1] - 14 * s), (ec[0] + lado * 3.6 * s, ec[1] - 2 * s)),
                       ((ec[0] + lado * 5 * s, ec[1] - 36 * s), (ec[0] + lado * 8 * s, ec[1] - 22 * s))):
            dxs, dys = b[0] - a[0], b[1] - a[1]; L2 = dxs * dxs + dys * dys
            tt = np.clip(((x - a[0]) * dxs + (y - a[1]) * dys) / L2, 0, 1)
            osso_l = np.hypot(x - (a[0] + tt * dxs), y - (a[1] + tt * dys)) < 1.1 * s
            m.tingir(osso_l, np.full((H, W), 0.7, F), OSSO, 0.2)
    m.salvar(saida / f'{nome}-meio.png')

    # ================================================================ frente
    fr = Tela(W, H)
    # vigas do teto
    for k, (vy, alt) in enumerate(((0.0, 10), (0.06, 7))):
        viga = ret(x, y, 0, H * vy, W, H * vy + alt * s)
        fr.tingir(viga, np.clip(0.35 + 0.2 * ((y - H * vy) < 2 * s) + 0.08 * fbm(x / 6, y, 2, 30 + k), 0, 0.999), VIGA, 0.4)
    # lustre de ferro com velas, pendurado no meio
    lc = np.array([W * 0.5, H * 0.13])
    fr.tingir((np.abs(x - lc[0]) < 0.7) & (y > H * 0.06) & (y < lc[1]), np.full((H, W), 0.4, F), METAL, 0.2)
    aro = np.abs(np.hypot((x - lc[0]) / (20 * s), (y - lc[1]) / (3 * s)) - 1) < 0.18
    fr.tingir(aro, np.full((H, W), 0.45, F), METAL, 0.3)
    for k in range(5):
        vx = lc[0] + (k - 2) * 9 * s
        fr.cor(ret(x, y, vx - 1.2 * s, lc[1] - 6 * s, vx + 1.2 * s, lc[1]), '#f0e6c8')
        fr.cor(np.hypot((x - vx) / (1.1 * s), (y - (lc[1] - 8 * s)) / (2 * s)) < 1, '#ffc24a')
        luzes.append((vx, lc[1] - 8 * s, 14 * s, '#ffb050', 0.4))
    # pilha de livros e um crânio de cera no canto de baixo
    lb0 = W * (0.02 if not retrato else 0.0)
    for k, (cor, h_) in enumerate((('#7a1e1e', 5), ('#1e4a7a', 4), ('#3a6a2a', 6))):
        yy = H - (k + 1) * 6 * s
        fr.cor(ret(x, y, lb0 + k * 2 * s, yy, lb0 + 34 * s - k * 3 * s, yy + h_ * s), cor)
        fr.cor(ret(x, y, lb0 + k * 2 * s, yy, lb0 + 34 * s - k * 3 * s, yy + 1), '#f0e0b0', 0.8)
    fr.rgb *= 0.85
    fr.salvar(saida / f'{nome}-frente.png')

    # ================================================================ luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    brilho += (np.exp(-(((x - jc[0]) / (jr * 1.6)) ** 2 + ((y - jc[1]) / (jr * 1.6)) ** 2)) * 0.25)[..., None] * np.array(hexrgb('#9ab8ff'), F)
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
        pintar(520, 330, saida, 'laboratorio-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'laboratorio-retrato')
    print('ok', saida)
