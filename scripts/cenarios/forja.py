#!/usr/bin/env python3
"""Forja dos Implantes: onde trabalham o Cavaleiro da Tala e o Goblin da Fratura (14/10/2026).

Oficina de ferreiro de pedra escura: uma fornalha grande ardendo no fundo, bigorna com uma placa de
osteossíntese em brasa sendo forjada, parede de ferramentas (martelos, tenazes, uma serra), prateleira
com placas e parafusos prontos, barril d'água fumegando, fole de couro e fagulhas no ar. O laranja
do fogo contra o azul frio da janela. Só ferramentas e implantes, sem anatomia nos enfeites.
Camadas:
  fundo   parede de pedra, fornalha com a boca em brasa, janela azul, parede de ferramentas
  meio    piso de pedra, bigorna com a placa em brasa, barril, fole, prateleira de implantes
  frente  correntes, ganchos e fagulhas em primeiro plano
  luz     boca da fornalha, placa em brasa, fagulhas, vapor do barril

    python3 scripts/cenarios/forja.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa  # noqa: E402

PEDRA = rampa(['#100c0c', '#1a1414', '#241c1a', '#302622', '#3e322c', '#4e4038', '#605046'])
TIJOLO = rampa(['#2a1210', '#3e1a14', '#56241a', '#6e3020', '#8a3e28', '#a85030'])
FERRO = rampa(['#08080a', '#141418', '#22222a', '#34343e', '#4a4a56', '#6a6a78', '#9a9aa8'])
MADEIRA = rampa(['#1e120a', '#2e1c10', '#422a18', '#583a22', '#704c2e'])
BRASA = rampa(['#4a0a02', '#8a1a04', '#d0400a', '#ff7a1a', '#ffb43a', '#ffe68a', '#fffbe0'])
COURO = rampa(['#2a160a', '#42240e', '#5e3416', '#7c4822', '#9a5e30'])
INOX = rampa(['#2a303a', '#46505e', '#6a7686', '#96a2b2', '#c8d2de', '#eef3fa'])


def ret(x, y, x0, y0, x1, y1):
    return (x >= x0) & (x < x1) & (y >= y0) & (y < y1)


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    t0 = Tela(W, H); x, y = t0.x, t0.y
    cx = W / 2
    s = (W / 520) * 1.5 if not retrato else (W / 250) * 1.05
    piso_y = H * (0.66 if retrato else 0.7)
    luzes = []

    # ================================================================ fundo
    f = Tela(W, H)
    fy = np.floor(y / 7).astype(np.int64)
    junta = ((y % 7) < 0.9) | (((x + (fy % 2) * 6) % 13) < 0.9)
    fc = np.array([cx + (0 if retrato else W * 0.05), piso_y])          # fornalha
    quente = np.exp(-(((x - fc[0]) / (W * 0.35)) ** 2 + ((y - fc[1] + 30 * s) / (H * 0.4)) ** 2))
    lp = 0.22 + 0.1 * fbm(x / 6, y / 6, 3, 2) - 0.16 * junta + 0.25 * quente
    f.tingir(y < piso_y, np.clip(lp, 0, 0.999), PEDRA, 0.6)
    f.velar((y < piso_y) * quente * 0.3, '#a04818')
    # janela fria com grade, no alto à esquerda
    jx, jy, jw, jh = W * (0.12 if not retrato else 0.08), H * 0.14, 22 * s, 26 * s
    jan = ret(x, y, jx, jy, jx + jw, jy + jh)
    f.cor(jan, '#3a5a9a')
    f.cor(jan & (fbm(x / 4, y / 4, 2, 5) > 0.7), '#9ab8e8')
    f.cor(jan & ((((x - jx) % (jw / 3)) < 1) | (((y - jy) % (jh / 3)) < 1)), '#141418')
    f.tingir(ret(x, y, jx - 2, jy - 2, jx + jw + 2, jy + jh + 2) & ~jan, np.full((H, W), 0.5, F), PEDRA, 0.3)
    luzes.append((jx + jw / 2, jy + jh / 2, 26 * s, '#7a9ae0', 0.3))
    # fornalha de tijolo com chaminé e boca em brasa
    fw, fh = 46 * s, 50 * s
    corpo = (np.abs(x - fc[0]) < fw) & (y > piso_y - fh) & (y < piso_y)
    f.tingir(corpo, np.clip(0.35 + 0.25 * quente + 0.08 * fbm(x / 4, y / 4, 2, 6) - 0.15 * (((y % 6) < 1) | ((x + (np.floor(y / 6) % 2) * 5) % 10 < 1)), 0, 0.999), TIJOLO, 0.5)
    chamine = (np.abs(x - fc[0]) < fw * 0.32 + np.clip(y - (piso_y - fh - 26 * s), 0, None) * 0.9) & (y < piso_y - fh) & (y > 0)
    f.tingir(chamine, np.clip(0.25 + 0.15 * quente, 0, 0.999), TIJOLO, 0.4)
    boca = (np.abs(x - fc[0]) < fw * 0.55) & (y > piso_y - fh * 0.62) & (y < piso_y - 6 * s) & ((y > piso_y - fh * 0.62 + fw * 0.55) | (np.hypot(x - fc[0], y - (piso_y - fh * 0.62 + fw * 0.55)) < fw * 0.55))
    fogo = np.clip(0.55 + 0.4 * (y - (piso_y - fh * 0.6)) / (fh * 0.6) + 0.25 * fbm(x / 3, y / 2, 3, 7) - 0.3 * np.abs(x - fc[0]) / fw, 0, 0.999)
    f.tingir(boca, fogo, BRASA, 0.6)
    luzes.append((fc[0], piso_y - fh * 0.35, 70 * s, '#ff7a20', 0.7))
    # parede de ferramentas penduradas à direita
    px0 = W * (0.66 if not retrato else 0.6)
    tabua = ret(x, y, px0, H * 0.18, px0 + 54 * s, H * 0.18 + 30 * s)
    f.tingir(tabua, np.clip(0.4 + 0.1 * fbm(x / 3, y / 8, 2, 8), 0, 0.999), MADEIRA, 0.4)
    for i, tipo in enumerate(('martelo', 'tenaz', 'martelo', 'serra', 'formao')):
        tx = px0 + (6 + i * 10) * s; ty = H * 0.18 + 3 * s
        f.cor(np.hypot(x - tx, y - ty) < 1.2 * s, '#4a4a56')            # prego
        if tipo == 'martelo':
            f.tingir(ret(x, y, tx - 0.9 * s, ty, tx + 0.9 * s, ty + 22 * s), np.full((H, W), 0.6, F), MADEIRA, 0.2)
            f.tingir(ret(x, y, tx - 4 * s, ty + 18 * s, tx + 4 * s, ty + 24 * s), np.full((H, W), 0.55, F), FERRO, 0.3)
        elif tipo == 'tenaz':
            for d in (-1, 1):
                bra = (np.abs(x - (tx + d * (y - ty) * 0.12)) < 0.9 * s) & (y > ty) & (y < ty + 24 * s)
                f.tingir(bra, np.full((H, W), 0.55, F), FERRO, 0.2)
        elif tipo == 'serra':
            lam = ret(x, y, tx - 1.5 * s, ty + 4 * s, tx + 4 * s, ty + 24 * s)
            f.tingir(lam, np.full((H, W), 0.7, F), INOX, 0.2)
            f.tingir(lam & ((((y - ty) % (2 * s)) < 0.8)) & (x > tx + 3 * s), np.full((H, W), 0.3, F), INOX, 0.2)
            f.tingir(ret(x, y, tx - 2 * s, ty, tx + 4 * s, ty + 5 * s), np.full((H, W), 0.5, F), MADEIRA, 0.2)
        else:
            f.tingir(ret(x, y, tx - 0.9 * s, ty, tx + 0.9 * s, ty + 12 * s), np.full((H, W), 0.55, F), MADEIRA, 0.2)
            f.tingir(ret(x, y, tx - 1.2 * s, ty + 12 * s, tx + 1.2 * s, ty + 24 * s), np.full((H, W), 0.75, F), INOX, 0.2)
    f.tingir(y >= piso_y, np.full((H, W), 0.25, F), PEDRA, 0.4)
    f.salvar(saida / f'{nome}-fundo.png')

    # ================================================================ meio
    m = Tela(W, H)
    piso = y >= piso_y
    zz = np.clip((y - piso_y) / (H - piso_y), 0, 1)
    lajes = (np.abs((((x - cx) / (18 * s * (0.6 + zz))) % 1) - 0.5) > 0.46) | (np.abs((((y - piso_y) / (7 * s * (0.6 + zz))) % 1) - 0.5) > 0.44)
    brilho_piso = 0.3 * np.exp(-(((x - fc[0]) / (W * 0.28)) ** 2 + ((y - piso_y) / (H * 0.2)) ** 2))
    m.tingir(piso, np.clip(0.2 + 0.18 * zz + brilho_piso + 0.08 * fbm(x / 5, y / 3, 2, 30) - 0.12 * lajes, 0, 0.999), PEDRA, 0.5)
    m.velar(piso * brilho_piso * 0.8, '#c05a20')
    # bigorna com a placa em brasa
    bc = np.array([W * (0.28 if not retrato else 0.3), piso_y + (H - piso_y) * 0.5])
    s0 = s; s = s * 1.5
    topo_b = ret(x, y, bc[0] - 20 * s, bc[1] - 16 * s, bc[0] + 16 * s, bc[1] - 10 * s)
    chifre = (x < bc[0] - 20 * s) & (x > bc[0] - 32 * s) & (np.abs(y - (bc[1] - 14 * s)) < (x - (bc[0] - 32 * s)) / (12 * s) * 3 * s)
    cintura = ret(x, y, bc[0] - 8 * s, bc[1] - 10 * s, bc[0] + 6 * s, bc[1] - 2 * s)
    pe_b = ret(x, y, bc[0] - 14 * s, bc[1] - 2 * s, bc[0] + 12 * s, bc[1] + 4 * s)
    m.tingir(topo_b | chifre, np.clip(0.55 - (y - (bc[1] - 16 * s)) / (12 * s), 0, 0.999), FERRO, 0.4)
    m.tingir(cintura | pe_b, np.full((H, W), 0.3, F), FERRO, 0.4)
    placa = ret(x, y, bc[0] - 12 * s, bc[1] - 19 * s, bc[0] + 8 * s, bc[1] - 16 * s)
    m.tingir(placa, np.clip(0.75 + 0.2 * np.sin((x - bc[0]) / (2 * s)), 0, 0.999), BRASA, 0.3)
    for k in range(4):
        m.cor(np.hypot(x - (bc[0] - 9 * s + k * 5 * s), y - (bc[1] - 17.5 * s)) < 0.9 * s, '#8a1a04')
    luzes.append((bc[0] - 2 * s, bc[1] - 18 * s, 24 * s, '#ff9a30', 0.55))
    # sombra sob a bigorna
    m.cor((np.hypot((x - bc[0]) / (18 * s), (y - bc[1] - 4 * s) / (2.5 * s)) < 1) & ~pe_b, '#0c0808', 0.5)
    # martelo apoiado na bigorna
    m.tingir(ret(x, y, bc[0] + 8 * s, bc[1] - 30 * s, bc[0] + 10 * s, bc[1] - 16 * s), np.full((H, W), 0.55, F), MADEIRA, 0.2)
    m.tingir(ret(x, y, bc[0] + 5 * s, bc[1] - 34 * s, bc[0] + 14 * s, bc[1] - 28 * s), np.full((H, W), 0.5, F), FERRO, 0.3)
    s = s0
    # barril d'água com vapor
    rc = np.array([W * (0.78 if not retrato else 0.74), piso_y + (H - piso_y) * 0.38])
    barril = (np.abs(x - rc[0]) < 13 * s - np.abs(y - (rc[1] - 10 * s)) * 0.12) & (y > rc[1] - 22 * s) & (y < rc[1])
    m.tingir(barril, np.clip(0.45 - (x - rc[0]) / (40 * s) + 0.1 * np.cos((x - rc[0]) / (3 * s)), 0, 0.999), MADEIRA, 0.4)
    for yy in (rc[1] - 18 * s, rc[1] - 6 * s):
        m.tingir(barril & (np.abs(y - yy) < 1.1 * s), np.full((H, W), 0.45, F), FERRO, 0.2)
    m.cor((np.abs(x - rc[0]) < 11.5 * s) & (np.abs(y - (rc[1] - 22 * s)) < 1.6 * s), '#2a4a6a')
    vapor = (np.hypot((x - rc[0]) / (14 * s), (y - (rc[1] - 34 * s)) / (12 * s)) < 1) & (fbm(x / 4, y / 4, 3, 33) > 0.48)
    m.cor(vapor, '#d8d4cc', 0.3)
    # fole de couro perto da fornalha
    fo = np.array([fc[0] - fw - 10 * s, piso_y - 6 * s])
    fole = (np.abs(x - fo[0]) < 12 * s - np.abs(y - fo[1]) * 0.8) & (np.abs(y - fo[1]) < 6 * s)
    m.tingir(fole, np.clip(0.5 + 0.2 * np.sin((x - fo[0]) / (2 * s)), 0, 0.999), COURO, 0.4)
    m.tingir(ret(x, y, fo[0] + 10 * s, fo[1] - 1 * s, fo[0] + 18 * s, fo[1] + 1 * s), np.full((H, W), 0.5, F), FERRO, 0.2)
    for d in (-7, 6):                                                     # cavalete de madeira
        m.tingir(ret(x, y, fo[0] + d * s, fo[1] + 4 * s, fo[0] + (d + 1.5) * s, piso_y + 4 * s), np.full((H, W), 0.45, F), MADEIRA, 0.2)
    # prateleira de implantes prontos (placas e parafusos de inox)
    sx0 = W * (0.62 if not retrato else 0.56); sy = piso_y - 30 * s
    m.tingir(ret(x, y, sx0, sy, sx0 + 40 * s, sy + 2.5 * s), np.full((H, W), 0.5, F), MADEIRA, 0.3)
    for i in range(4):
        px_ = sx0 + (3 + i * 9) * s
        pl = ret(x, y, px_, sy - 10 * s, px_ + 3 * s, sy)
        m.tingir(pl, np.clip(0.6 + 0.2 * (x < px_ + 1.2 * s), 0, 0.999), INOX, 0.2)
        for k in range(3):
            m.cor(np.hypot(x - (px_ + 1.5 * s), y - (sy - 8 * s + k * 3 * s)) < 0.6 * s, '#2a303a')
    m.salvar(saida / f'{nome}-meio.png')

    # ================================================================ frente
    fr = Tela(W, H)
    for fx_, comp in ((0.08, 0.3), (0.92, 0.24)):
        bx = W * fx_
        elo = np.floor(y / (4 * s))
        c_ = (y < H * comp) & (((elo % 2 == 0) & (np.abs(np.abs(x - bx) - 1.4 * s) < 0.7 * s)) | ((elo % 2 == 1) & (np.abs(x - bx) < 0.6 * s)))
        fr.tingir(c_, np.clip(0.3 + 0.4 * ((y % (4 * s)) < 1.5 * s), 0, 0.999), FERRO, 0.3)
        gancho = (np.abs(np.hypot(x - bx - 2 * s, y - H * comp) - 2.5 * s) < 0.8 * s) & (y > H * comp)
        fr.tingir(gancho, np.full((H, W), 0.5, F), FERRO, 0.2)
    # fagulhas soltas no ar, saindo da fornalha
    rng = np.random.default_rng(5)
    for _ in range(40):
        px_ = fc[0] + rng.normal(0, W * 0.15); py_ = piso_y - rng.uniform(10, H * 0.6)
        fr.cor(np.hypot(x - px_, y - py_) < rng.uniform(0.5, 1.2), '#ffd06a' if rng.random() > 0.4 else '#ff8a2a')
    fr.salvar(saida / f'{nome}-frente.png')

    # ================================================================ luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
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
        pintar(520, 330, saida, 'forja-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'forja-retrato')
    print('ok', saida)
