#!/usr/bin/env python3
"""Salão do Trono: onde moram os chefes da Cripta (14/10/2026).

Perspectiva de um ponto, como a Masmorra, mas nobre e quente: um salão de pedra clara com
colunas de capitel dourado, piso de mármore xadrez, um tapete vermelho com borda de ouro que
leva ao trono sobre degraus, estandartes pendurados e um grande vitral redondo no fundo, de onde
descem feixes de luz colorida. Camadas:
  fundo   parede do fundo, vitral, trono no estrado, nervuras da abóbada
  meio    piso xadrez, tapete, colunas com tochas, estandartes
  frente  cortinas vermelhas com borlas nos cantos de cima e bases de coluna nas bordas
  luz     feixes do vitral, tochas, brilho do trono e do tapete

    python3 scripts/cenarios/salao.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa  # noqa: E402

PEDRA = rampa(['#2a2018', '#3a2e24', '#4c3e30', '#5e4e3e', '#72604c', '#88745e', '#9e8a72', '#b8a488'])
MARMORE_C = rampa(['#7a6e62', '#968a7c', '#b0a596', '#c8beae', '#dcd4c6', '#ece6da'])
MARMORE_E = rampa(['#3a2c26', '#4a3a32', '#5a4840', '#6c5a4e', '#7e6c5e', '#927e6e'])
TAPETE = rampa(['#3a0610', '#5a0c18', '#7a1420', '#9c1e28', '#be2c32', '#d84a40'])
OURO = rampa(['#4a2c08', '#7a4e12', '#a8741e', '#d4a032', '#f2c85a', '#ffe8a0', '#fff8d8'])
COLUNA = rampa(['#3a3028', '#544638', '#6e5e4a', '#88765e', '#a28e74', '#bca88a', '#d6c4a6'])
FERRO = rampa(['#0a0a0e', '#16161c', '#24242c', '#363642', '#4c4c5a'])
FOGO = rampa(['#7a1a06', '#d0480e', '#ff8a1a', '#ffc24a', '#fff2b0'])
VITRAL = ['#2a5ac8', '#d83a3a', '#f2c040', '#3aa860', '#8a4ad0', '#40b8e0']


def hv(*arrs):
    v = np.zeros(np.broadcast(*arrs).shape, np.int64)
    for i, a in enumerate(arrs):
        v = (v * 1000003 + np.asarray(a, np.int64) * (7919 + i * 104729)) & 0xFFFFFFFF
    v = (v ^ (v >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65535.0


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    cx = W / 2
    vy = H * (0.4 if retrato else 0.42)
    jl, jr = (W * 0.22, W * 0.78) if retrato else (W * 0.32, W * 0.68)
    fundo_y0, fundo_y1 = H * 0.08, H * (0.56 if retrato else 0.6)
    t0 = Tela(W, H); x, y = t0.x, t0.y
    luzes = []

    # ================================================================ fundo
    f = Tela(W, H)
    fy = np.floor(y / 6).astype(np.int64)
    fx = np.floor((x + (fy % 2) * 5) / 10).astype(np.int64)
    junta = ((y % 6) < 0.9) | (((x + (fy % 2) * 5) % 10) < 0.9)
    vit_c = np.array([cx, fundo_y0 + (fundo_y1 - fundo_y0) * 0.3])
    vit_r = (jr - jl) * 0.2
    quente = np.exp(-(((x - cx) / (W * 0.22)) ** 2 + ((y - vit_c[1]) / (H * 0.3)) ** 2))
    lp = 0.22 + 0.12 * hv(fx, fy, 1) + 0.08 * fbm(x / 5, y / 5, 2, 2) + 0.35 * quente - 0.16 * junta
    f.tingir(np.ones((H, W), bool), np.clip(lp, 0, 0.999), PEDRA, 0.6)
    # vitral redondo (rosácea): pétalas coloridas, raios de chumbo e aro de pedra
    dv = np.hypot(x - vit_c[0], y - vit_c[1])
    ang = np.arctan2(y - vit_c[1], x - vit_c[0])
    aro_v = (dv < vit_r + 3) & (dv >= vit_r)
    vidro = dv < vit_r
    setor = np.floor((ang + np.pi) / (2 * np.pi) * 12).astype(np.int64) % 12
    anel = np.floor(dv / (vit_r / 3)).astype(np.int64)
    for i, c_ in enumerate(VITRAL):
        sel = vidro & (((setor + anel * 2) % len(VITRAL)) == i)
        f.cor(sel, c_)
    f.cor(vidro & (dv < vit_r * 0.22), '#fff0b0')
    chumbo = vidro & ((np.abs(((ang + np.pi) / (2 * np.pi) * 12) % 1 - 0.5) > 0.42) | (np.abs((dv / (vit_r / 3)) % 1 - 0.5) > 0.42))
    f.cor(chumbo, '#1a1410')
    f.rgb[vidro] = f.rgb[vidro] * (0.75 + 0.35 * np.clip(1 - dv[vidro] / vit_r, 0, 1))[..., None]
    f.tingir(aro_v, np.clip(0.55 + 0.3 * np.cos(ang + 2.4), 0, 0.999), PEDRA[3:], 0.4)
    # estandartes no fundo, dos dois lados do vitral
    for lado in (-1, 1):
        bx = cx + lado * vit_r * 1.9
        top_b, bot_b = fundo_y0 + 6, vit_c[1] + vit_r * 1.5
        lb = vit_r * 0.42
        pano = (np.abs(x - bx) < lb) & (y > top_b) & (y < bot_b - np.abs(x - bx) * 0.7)
        dob = np.sin((x - bx) * 0.9) * 0.15
        f.tingir(pano, np.clip(0.55 + dob - 0.15 * (y - top_b) / (bot_b - top_b), 0, 0.999), TAPETE, 0.5)
        f.tingir(pano & (np.abs(np.abs(x - bx) - lb + 1.2) < 0.8), np.full((H, W), 0.7, F), OURO, 0.3)
        # coroa bordada
        cy_ = top_b + (bot_b - top_b) * 0.38
        coroa = (np.abs(x - bx) < lb * 0.55) & (y > cy_) & (y < cy_ + lb * 0.45)
        coroa &= ~((y < cy_ + lb * 0.25) & (np.abs(((x - bx) / (lb * 0.27)) % 1 - 0.5) < 0.25))
        f.tingir(coroa, np.full((H, W), 0.75, F), OURO, 0.3)
        f.tingir((np.abs(x - bx) < lb + 1.5) & (np.abs(y - top_b) < 1.5), np.full((H, W), 0.5, F), OURO, 0.3)
    # estrado com degraus e o trono
    est_y = fundo_y1
    for k in range(3):
        larg_e = (jr - jl) * (0.36 - k * 0.07)
        y0 = est_y - (k + 1) * 4
        deg = (np.abs(x - cx) < larg_e) & (y >= y0) & (y < y0 + 4)
        f.tingir(deg, np.clip(0.5 + 0.25 * (y - y0 < 1.2) + 0.15 * quente, 0, 0.999), PEDRA[2:], 0.4)
    tr_base = est_y - 12
    tr_w = (jr - jl) * 0.09
    encosto = (np.abs(x - cx) < tr_w) & (y > tr_base - tr_w * 3.4) & (y < tr_base)
    encosto &= ~((y < tr_base - tr_w * 3.0) & (np.abs(((x - cx) / (tr_w * 0.5)) % 1 - 0.5) < 0.22))
    f.tingir(encosto, np.clip(0.55 + 0.3 * np.exp(-((x - cx) / tr_w) ** 2) - 0.2 * (y - (tr_base - tr_w * 3.4)) / (tr_w * 3.4), 0, 0.999), OURO, 0.4)
    almofada = (np.abs(x - cx) < tr_w * 0.62) & (y > tr_base - tr_w * 2.7) & (y < tr_base - tr_w * 0.6)
    f.tingir(almofada, np.clip(0.55 + 0.25 * np.exp(-((x - cx) / (tr_w * 0.5)) ** 2), 0, 0.999), TAPETE, 0.4)
    assento = (np.abs(x - cx) < tr_w * 1.25) & (y > tr_base - tr_w * 0.8) & (y < tr_base)
    f.tingir(assento, np.full((H, W), 0.62, F), OURO, 0.4)
    gema = np.hypot(x - cx, y - (tr_base - tr_w * 3.1)) < max(1.2, tr_w * 0.22)
    f.cor(gema, '#d83a3a')
    luzes.append((cx, tr_base - tr_w * 2, tr_w * 4, '#ffd27a', 0.35))
    # nervuras da abóbada
    for u in (0.0, 0.35, 0.62, 0.82):
        xl = jl * u; xr = W - (W - jr) * u
        yt = fundo_y0 * u - H * 0.06 * (1 - u)
        larg = 5 * (1 - u) + 2
        r_ = (xr - xl) / 2
        arco = (np.abs(np.hypot((x - cx) / r_, (y - (yt + r_ * 0.55)) / (r_ * 0.55)) - 1) < larg / r_) & (y < yt + r_ * 0.55)
        f.tingir(arco, np.clip(0.3 + 0.25 * u + 0.15 * quente, 0, 0.999), PEDRA[2:], 0.5)
        f.tingir(arco & (np.abs(np.hypot((x - cx) / r_, (y - (yt + r_ * 0.55)) / (r_ * 0.55)) - 1) < 0.35 / r_), np.full((H, W), 0.6, F), OURO, 0.3)
    f.velar(0.18 * quente, '#ffe2a8')
    f.salvar(saida / f'{nome}-fundo.png')

    # ================================================================ meio
    m = Tela(W, H)
    chao = y >= fundo_y1
    zz = (H * 0.9) / np.maximum(y - vy, 1)
    wx = (x - cx) * zz / 40
    wz = zz * 2.2
    casa = (np.floor(wx * 0.8) + np.floor(wz * 0.7)) % 2 == 0
    reflexo = 0.18 * np.exp(-(((x - cx) / (W * 0.2)) ** 2)) * np.clip((y - fundo_y1) / (H * 0.4), 0, 1)
    veio = 0.08 * fbm(wx * 3, wz * 1.5, 3, 4)
    m.tingir(chao & casa, np.clip(0.45 + veio + reflexo + 0.2 * (1 - np.clip((y - fundo_y1) / (H * 0.4), 0, 1)), 0, 0.999), MARMORE_C, 0.5)
    m.tingir(chao & ~casa, np.clip(0.35 + veio + reflexo, 0, 0.999), MARMORE_E, 0.5)
    # o fundo do salão se perde numa névoa quente (o xadrez não briga com a cena)
    m.velar(chao * np.clip(1 - (y - fundo_y1) / (H * 0.22), 0, 1) * 0.45, '#d8c4a0')
    # tapete vermelho com borda de ouro até o estrado
    larg_t = np.abs(wx) < 1.15
    tap = chao & larg_t
    borda_t = tap & (np.abs(wx) > 1.0)
    m.tingir(tap, np.clip(0.4 + 0.25 * np.exp(-(wx / 0.6) ** 2) + 0.06 * np.sin(wz * 6), 0, 0.999), TAPETE, 0.5)
    m.tingir(borda_t, np.clip(0.5 + 0.2 * ((np.floor(wz * 4) % 2) == 0), 0, 0.999), OURO, 0.4)
    motivo = tap & ~borda_t & (np.abs(((wz * 1.5) % 1) - 0.5) < 0.07) & (np.abs(wx) < 0.55)
    m.tingir(motivo, np.full((H, W), 0.55, F), OURO, 0.3)
    # colunas em perspectiva (três pares), com capitel dourado, tochas e estandartes entre elas
    for lado in (-1, 1):
        borda_x = 0 if lado < 0 else W
        far_x = jl if lado < 0 else jr
        for uu in (0.12, 0.45, 0.72):
            px_ = borda_x + (far_x - borda_x) * uu
            topo_k = -H * 0.2 * (1 - uu) + fundo_y0 * uu
            base_k = H * 1.08 * (1 - uu) + fundo_y1 * uu
            raio = (1 - uu) * W * 0.05 + 3
            fuste = (np.abs(x - px_) < raio) & (y > topo_k + raio * 1.2) & (y < base_k - raio * 0.6)
            sh = np.clip(0.5 - (x - px_) / raio * 0.35 * -lado + 0.12 * np.cos((x - px_) / raio * 6), 0, 0.999)
            m.tingir(fuste, sh, COLUNA, 0.5)
            m.tingir(fuste & (np.abs(((x - px_) / raio * 3) % 1 - 0.5) > 0.44), np.clip(sh - 0.25, 0, 0.999), COLUNA, 0.3)   # caneluras
            cap = (np.abs(x - px_) < raio * 1.45) & (y > topo_k) & (y <= topo_k + raio * 1.2)
            m.tingir(cap, np.clip(0.55 - (x - px_) / raio * 0.25 * -lado, 0, 0.999), OURO, 0.4)
            base_c = (np.abs(x - px_) < raio * 1.35) & (y >= base_k - raio * 0.6) & (y < base_k)
            m.tingir(base_c, np.clip(0.5 - (x - px_) / raio * 0.25 * -lado, 0, 0.999), COLUNA[1:], 0.4)
            # tocha presa na coluna, virada para o tapete
            tx = px_ - lado * raio * 1.1
            ty = topo_k + (base_k - topo_k) * 0.42
            tam = (1 - uu) * 2.4 + 0.9
            q = np.clip(1 - np.hypot(x - px_, (y - ty) * 0.8) / (tam * 13), 0, 1) ** 1.6
            q = np.floor(q * 5 + (m.bayer - 0.5) * 0.9) / 5
            k_ = (q * 0.45 * (fuste | cap))[..., None]
            m.rgb = m.rgb * (1 - k_) + np.array(hexrgb('#ffc070'), F) * k_
            sup = (np.abs(x - tx) < tam * 0.7) & (y > ty) & (y < ty + tam * 4)
            m.tingir(sup, np.full((H, W), 0.45, F), FERRO, 0.3)
            taca = (np.abs(x - tx) < tam * 1.4 - (y - (ty - tam)) * 0.3) & (y > ty - tam) & (y <= ty)
            m.tingir(taca, np.full((H, W), 0.6, F), OURO, 0.3)
            chama = np.hypot((x - tx) / (tam * 1.1), (y - (ty - tam * 3)) / (tam * 2.2)) < 1
            m.tingir(chama, np.clip(1 - np.hypot((x - tx) / (tam * 1.1), (y - (ty - tam * 3)) / (tam * 2.2)), 0, 0.999), FOGO, 0.6)
            luzes.append((tx, ty - tam * 3, tam * 10, '#ff9a40', 0.55))
        # estandarte longo entre a 1ª e a 2ª coluna
        u1, u2 = 0.12, 0.45
        ux = (u1 + u2) / 2
        bx = borda_x + (far_x - borda_x) * ux
        topo_b = -H * 0.2 * (1 - ux) + fundo_y0 * ux + H * 0.06
        lb = (1 - ux) * W * 0.035 + 3
        comp = H * 0.32 * (1 - ux * 0.6)
        pano = (np.abs(x - bx) < lb) & (y > topo_b) & (y < topo_b + comp - np.abs(x - bx) * 0.9)
        m.tingir(pano, np.clip(0.55 + np.sin((x - bx) * 1.1) * 0.12 - 0.2 * (y - topo_b) / comp, 0, 0.999), TAPETE, 0.5)
        m.tingir(pano & (np.abs(np.abs(x - bx) - lb + 1) < 0.8), np.full((H, W), 0.7, F), OURO, 0.3)
        osso = pano & (np.abs(y - (topo_b + comp * 0.4)) < lb * 0.18) & (np.abs(x - bx) < lb * 0.5)
        osso |= pano & (np.hypot(np.abs(x - bx) - lb * 0.5, np.abs(y - (topo_b + comp * 0.4)) - lb * 0.16) < lb * 0.17)
        m.tingir(osso, np.full((H, W), 0.85, F), MARMORE_C, 0.3)
        m.tingir((np.abs(x - bx) < lb + 1.5) & (np.abs(y - topo_b) < 1.4), np.full((H, W), 0.5, F), OURO, 0.3)
    m.salvar(saida / f'{nome}-meio.png')

    # ================================================================ frente
    fr = Tela(W, H)
    for lado in (-1, 1):
        borda_x = 0 if lado < 0 else W
        dx_ = np.abs(x - borda_x)
        larg = W * (0.16 if not retrato else 0.22)
        queda = H * 0.12 + (larg - dx_) * 0.9
        cortina = (dx_ < larg) & (y < queda)
        dob = np.sin(dx_ * 0.6) * 0.2 + np.sin(dx_ * 0.21) * 0.1
        fr.tingir(cortina, np.clip(0.35 + dob - 0.25 * (y / np.maximum(queda, 1)), 0, 0.999), TAPETE, 0.5)
        fr.tingir(cortina & (np.abs(y - queda) < 1.6), np.full((H, W), 0.6, F), OURO, 0.3)
        # borla dourada
        bx = borda_x + lado * -larg * 0.92
        by = H * 0.12 + larg * 0.08
        borla = np.hypot((x - bx) / 3.2, (y - by) / 5) < 1
        fr.tingir(borla, np.clip(0.75 - (y - by) / 10, 0, 0.999), OURO, 0.4)
        fr.tingir((np.abs(x - bx) < 0.8) & (y > by - 14) & (y < by), np.full((H, W), 0.6, F), OURO, 0.3)
        # base de coluna em primeiro plano, cortada na borda
        base = (dx_ < W * 0.05) & (y > H * 0.86)
        fr.tingir(base, np.clip(0.3 + 0.2 * (dx_ / (W * 0.05)) + 0.1 * fbm(x / 4, y / 4, 2, 7), 0, 0.999), COLUNA, 0.5)
    fr.rgb *= 0.85
    fr.salvar(saida / f'{nome}-frente.png')

    # ================================================================ luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    # feixes coloridos do vitral, descendo em diagonal até o tapete
    for i, c_ in enumerate(VITRAL[:4]):
        off = (i - 1.5) * vit_r * 0.5
        eixo_x = cx + off + (y - vit_c[1]) * 0.12 * (i - 1.5)
        feixe = np.exp(-((x - eixo_x) / (vit_r * 0.35)) ** 2) * np.clip((y - vit_c[1]) / (H * 0.6), 0, 1) * (y > vit_c[1]) * 0.22
        feixe *= np.clip(1 - (y - vit_c[1]) / (H * 0.9), 0, 1)
        brilho += feixe[..., None] * np.array(hexrgb(c_), F)
    brilho += (np.exp(-(dv / (vit_r * 1.3)) ** 2) * 0.5)[..., None] * np.array(hexrgb('#ffe8b0'), F)
    for bx, by, r, cor, k in luzes:
        g = np.exp(-((x - bx) ** 2 + ((y - by) * 1.1) ** 2) / (r ** 2)) * k
        brilho += g[..., None] * np.array(hexrgb(cor), F)
    a = np.clip(brilho.max(-1) / 255, 0, 1)
    lz.rgb = np.where(a[..., None] > 0, brilho / np.maximum(a[..., None], 1e-3), 0); lz.a = a
    lz.salvar(saida / f'{nome}-luz.png')


if __name__ == '__main__':
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'cenarios'
    saida.mkdir(parents=True, exist_ok=True)
    so = sys.argv[2] if len(sys.argv) > 2 else 'ambos'
    if so in ('ambos', 'paisagem'):
        pintar(520, 330, saida, 'salao-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'salao-retrato')
    print('ok', saida)
