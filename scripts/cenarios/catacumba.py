#!/usr/bin/env python3
"""Catacumba das Velas: onde vagam o espectro e o necromante (14/10/2026).

Cripta subterrânea em perspectiva de um ponto, mas sem nenhum osso ou caveira (regra dos enfeites em
docs/flashcards/README.md): corredor de arcos baixos de pedra, nichos com urnas e velas na parede,
sarcófagos de pedra com tampas esculpidas, teias nos cantos, um portão de ferro no fundo com luz
fantasmagórica esverdeada atrás e névoa rasteira no chão. Luz quente das velas contra o verde frio
do fundo. Camadas:
  fundo   parede do fundo com portão e luz espectral, arcos que recuam
  meio    paredes com nichos, urnas e velas, chão de lajes, sarcófagos
  frente  arco escuro em primeiro plano, teias e velas grandes nos cantos
  luz     velas, luz do portão, névoa

    python3 scripts/cenarios/catacumba.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa  # noqa: E402

PEDRA = rampa(['#0c0a0c', '#161214', '#201a1c', '#2c2426', '#3a3032', '#4a3e40', '#5c4e4e', '#706060'])
PEDRA_SARC = rampa(['#24201c', '#363028', '#4a4238', '#605648', '#786c5c', '#928674', '#aca08c'])
FERRO = rampa(['#050606', '#0e1010', '#1a1e1e', '#2a3030', '#40484a'])
CERA = rampa(['#8a7a5a', '#b0a07a', '#d4c8a0', '#efe6c8'])
URNA = rampa(['#2a1408', '#4a2610', '#6e3c1a', '#94562a', '#b8763e'])
VERDE = '#7ae0a0'


def hv(*arrs):
    v = np.zeros(np.broadcast(*arrs).shape, np.int64)
    for i, a in enumerate(arrs):
        v = (v * 1000003 + np.asarray(a, np.int64) * (7919 + i * 104729)) & 0xFFFFFFFF
    v = (v ^ (v >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65535.0


def vela(t: Tela, x, y, cx, base, alt, larg, luzes, k=0.5):
    corpo = (np.abs(x - cx) < larg) & (y > base - alt) & (y < base)
    t.tingir(corpo, np.clip(0.75 - (x - cx) / (larg * 3), 0, 0.999), CERA, 0.3)
    pingo = (np.abs(x - cx - larg * 0.6) < 0.7) & (y > base - alt) & (y < base - alt * 0.6)
    t.tingir(pingo, np.full(x.shape, 0.9, F), CERA, 0.2)
    chama = np.hypot((x - cx) / max(1.0, larg * 0.7), (y - (base - alt - larg * 1.3)) / max(1.6, larg * 1.3)) < 1
    t.cor(chama, '#ffb040')
    t.cor(chama & (np.hypot(x - cx, y - (base - alt - larg * 0.9)) < max(0.8, larg * 0.4)), '#fff2c0')
    luzes.append((cx, base - alt - larg, larg * 9, '#ffa040', k))


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    cx = W / 2
    vy = H * (0.42 if retrato else 0.44)
    jl, jr = (W * 0.26, W * 0.74) if retrato else (W * 0.34, W * 0.66)
    fundo_y0, fundo_y1 = H * 0.16, H * (0.56 if retrato else 0.6)
    t0 = Tela(W, H); x, y = t0.x, t0.y
    luzes = []

    # ================================================================ fundo
    f = Tela(W, H)
    fy = np.floor(y / 6).astype(np.int64)
    fx = np.floor((x + (fy % 2) * 5) / 11).astype(np.int64)
    junta = ((y % 6) < 0.9) | (((x + (fy % 2) * 5) % 11) < 0.9)
    pw = (jr - jl) * 0.42; pr = pw / 2
    ptopo, pbase = fundo_y0 + (fundo_y1 - fundo_y0) * 0.12, fundo_y1
    verde = np.exp(-(((x - cx) / (W * 0.15)) ** 2 + ((y - (ptopo + pbase) / 2) / (H * 0.22)) ** 2))
    lp = 0.14 + 0.1 * hv(fx, fy, 1) + 0.08 * fbm(x / 5, y / 5, 2, 2) + 0.28 * verde - 0.14 * junta
    f.tingir(np.ones((H, W), bool), np.clip(lp, 0, 0.999), PEDRA, 0.6)
    f.velar(0.3 * verde, '#2a5a44')
    portal = (np.abs(x - cx) < pr) & (y < pbase) & ((y > ptopo + pr) | (np.hypot(x - cx, y - (ptopo + pr)) < pr))
    prof = np.clip((y - ptopo) / (pbase - ptopo), 0, 1)
    f.rgb[portal] = (np.array(hexrgb('#0a1a14'), F) * 0.5 + np.array(hexrgb('#5ac890'), F) * (0.45 + 0.55 * np.exp(-((x - cx) / pr) ** 2))[..., None] * (1 - 0.5 * prof[..., None]))[portal]
    # névoa saindo do portal
    nev = portal & (fbm(x / 6, y / 3, 3, 9) > 0.5)
    f.cor(nev, '#bff0d0', 0.35)
    barras = portal & (np.abs(((x - cx) % 6) - 3) > 2.3)
    trave = portal & (np.abs(((y - ptopo) % 12) - 6) > 5.2)
    f.tingir(barras | trave, np.clip(0.25 + 0.3 * np.exp(-((x - cx) / pr) ** 2), 0, 0.999), FERRO, 0.4)
    batente = (np.abs(x - cx) < pr + 4) & (y < pbase) & ((y > ptopo + pr) | (np.hypot(x - cx, y - (ptopo + pr)) < pr + 4)) & ~portal
    f.tingir(batente, np.clip(0.42 + 0.3 * verde, 0, 0.999), PEDRA[2:], 0.5)
    # arcos baixos que recuam
    for u in (0.0, 0.3, 0.56, 0.78):
        xl = jl * u; xr = W - (W - jr) * u
        yt = fundo_y0 * u - H * 0.04 * (1 - u)
        larg = 7 * (1 - u) + 2
        r_ = (xr - xl) / 2
        arco = (np.abs(np.hypot((x - cx) / r_, (y - (yt + r_ * 0.45)) / (r_ * 0.45)) - 1) < larg / r_) & (y < yt + r_ * 0.45)
        f.tingir(arco, np.clip(0.18 + 0.18 * u + 0.2 * verde, 0, 0.999), PEDRA[1:], 0.5)
    luzes.append((cx, (ptopo + pbase) / 2, pw * 1.2, VERDE, 0.5))
    f.salvar(saida / f'{nome}-fundo.png')

    # ================================================================ meio
    m = Tela(W, H)
    chao = y >= fundo_y1
    zz = (H * 0.9) / np.maximum(y - vy, 1)
    wx = (x - cx) * zz / 40
    wz = zz * 2.2
    lx = np.floor(wx + (np.floor(wz) % 2) * 0.5)
    lz = np.floor(wz)
    jun = (np.abs(((wx + (np.floor(wz) % 2) * 0.5) % 1) - 0.5) > 0.46) | (np.abs((wz % 1) - 0.5) > 0.44)
    lpiso = 0.14 + 0.12 * hv(lx.astype(np.int64), lz.astype(np.int64), 3) + 0.08 * fbm(wx * 2, wz, 2, 5) - 0.12 * jun
    lpiso += 0.2 * np.exp(-(((x - cx) / (W * 0.2)) ** 2 + ((y - fundo_y1) / (H * 0.16)) ** 2))
    m.tingir(chao, np.clip(lpiso, 0, 0.999), PEDRA, 0.6)
    # paredes laterais com nichos (urnas e velas)
    for lado in (-1, 1):
        borda_x = 0 if lado < 0 else W
        far_x = jl if lado < 0 else jr
        lo, hi = min(borda_x, far_x), max(borda_x, far_x)
        u = np.clip((x - borda_x) / (far_x - borda_x), 0, 1)
        topo = -H * 0.15 * (1 - u) + fundo_y0 * u
        base = H * 1.05 * (1 - u) + fundo_y1 * u
        mm = (x >= lo) & (x <= hi) & (y >= topo) & (y <= base)
        v = (y - topo) / np.maximum(base - topo, 1)
        d_ = u / (1 - 0.75 * u) * 6
        fy2 = np.floor(v * 12).astype(np.int64)
        fx2 = np.floor(d_ + (fy2 % 2) * 0.5).astype(np.int64)
        jj = (np.abs(((v * 12) % 1) - 0.5) > 0.42) | (np.abs(((d_ + (fy2 % 2) * 0.5) % 1) - 0.5) > 0.46)
        lw = 0.08 + 0.26 * u + 0.1 * hv(fx2, fy2, 9 + lado) + 0.07 * fbm(x / 4, y / 4, 2, 10) - 0.12 * jj
        m.tingir(mm, np.clip(lw, 0, 0.999), PEDRA, 0.6)
        for uu, vv in ((0.18, 0.35), (0.18, 0.62), (0.5, 0.4), (0.5, 0.66)):
            px_ = borda_x + (far_x - borda_x) * uu
            topo_k = -H * 0.15 * (1 - uu) + fundo_y0 * uu; base_k = H * 1.05 * (1 - uu) + fundo_y1 * uu
            ny_ = topo_k + (base_k - topo_k) * vv
            tam = (1 - uu) * 2.4 + 0.9
            nicho = (np.abs(x - px_) < tam * 4.5) & (y > ny_ - tam * 6) & (y < ny_) & ((y > ny_ - tam * 4.5) | (np.hypot(x - px_, y - (ny_ - tam * 4.5)) < tam * 4.5))
            m.tingir(nicho, np.clip(0.06 + 0.08 * (y > ny_ - tam), 0, 0.999), PEDRA, 0.3)
            if vv < 0.5:
                urna = (np.hypot((x - px_) / (tam * 2.2), (y - (ny_ - tam * 2)) / (tam * 1.9)) < 1) | ((np.abs(x - px_) < tam * 1.1) & (y > ny_ - tam * 4.4) & (y < ny_ - tam * 3.4))
                m.tingir(urna, np.clip(0.6 - (x - px_) / (tam * 5), 0, 0.999), URNA, 0.3)
            vela(m, x, y, px_ + (tam * 2.6 if vv < 0.5 else 0), ny_ - 0.2, tam * 2.4, tam * 0.65, luzes, 0.45)
            q = np.clip(1 - np.hypot(x - px_, (y - ny_) * 0.8) / (tam * 12), 0, 1) ** 1.6
            q = np.floor(q * 5 + (m.bayer - 0.5) * 0.9) / 5
            k_ = (q * 0.4 * mm)[..., None]
            m.rgb = m.rgb * (1 - k_) + np.array(hexrgb('#7a5030'), F) * k_
    # sarcófagos de pedra no chão, alinhados ao corredor
    for lado in (-1, 1):
        for zf in ((0.72, 1.0), (0.86, 1.35)) if not retrato else ((0.74, 1.0),):
            fy_, esc = zf
            by = H * fy_
            bx = cx + lado * W * (0.26 if not retrato else 0.3) * (0.7 + 0.3 * esc)
            lw_, lh = 40 * esc * (W / 520 if not retrato else W / 300), 14 * esc * (W / 520 if not retrato else W / 300)
            caixa = (np.abs(x - bx) < lw_) & (y > by - lh) & (y < by + lh * 0.6)
            m.tingir(caixa, np.clip(0.35 + 0.15 * (y < by - lh * 0.5) - 0.1 * (x - bx) / lw_ * lado, 0, 0.999), PEDRA_SARC, 0.4)
            tampa = (np.abs(x - bx) < lw_ * 1.06) & (y > by - lh * 1.35) & (y <= by - lh)
            m.tingir(tampa, np.full((H, W), 0.65, F), PEDRA_SARC, 0.3)
            # cruz gravada na tampa e friso
            m.tingir(caixa & (np.abs(y - (by - lh * 0.2)) < 0.6), np.full((H, W), 0.2, F), PEDRA_SARC, 0.2)
            cz = ((np.abs(x - bx) < 0.8) & (np.abs(y - (by - lh * 1.17)) < lh * 0.15)) | ((np.abs(y - (by - lh * 1.17)) < 0.6) & (np.abs(x - bx) < lw_ * 0.25))
            m.tingir(cz, np.full((H, W), 0.25, F), PEDRA_SARC, 0.2)
            vela(m, x, y, bx + lado * lw_ * 0.7, by - lh * 1.35, 7 * esc, 1.6 * esc, luzes, 0.5)
    # névoa rasteira no chão
    n_ = np.clip((fbm(x / 26, y / 9, 3, 21) - 0.42) * 2.2, 0, 1) * np.clip((y - fundo_y1) / (H * 0.25), 0, 1)
    m.velar(chao * np.floor(n_ * 4 + (m.bayer - 0.5) * 0.8) / 4 * 0.22, '#a8d8c0')
    m.salvar(saida / f'{nome}-meio.png')

    # ================================================================ frente
    fr = Tela(W, H)
    r_ = W * 0.6
    arco = (np.hypot((x - cx) / r_, (y - H * 0.6) / (H * 0.62)) > 1) & (y < H * 0.6)
    lados = (np.minimum(x, W - x) < W * 0.03) & (y >= H * 0.6)
    fr.tingir(arco | lados, np.clip(0.05 + 0.12 * fbm(x / 6, y / 6, 2, 50), 0, 0.999), PEDRA, 0.5)
    # teias nos dois cantos de cima
    for lado in (-1, 1):
        ox = 0 if lado < 0 else W
        dx, dy = np.abs(x - ox), y
        ang = np.arctan2(dy, dx); rr = np.hypot(dx, dy)
        tam = W * (0.16 if not retrato else 0.24)
        raios = (np.abs(np.sin(ang * 5)) < 0.05) & (rr < tam)
        aneis = (np.abs((rr % 9) - 4.5) < 0.4) & (rr < tam) & (rr > 6)
        fr.cor((raios | aneis), '#c8c4bc', 0.45)
    # velas grandes nos cantos de baixo
    for lado in (-1, 1):
        vx = W * (0.06 if lado < 0 else 0.94)
        vela(fr, x, y, vx, H, H * 0.13, W * 0.012 + 2, luzes, 0.6)
    fr.rgb *= 0.85
    fr.salvar(saida / f'{nome}-frente.png')

    # ================================================================ luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    for bx, by, r, cor, kk in luzes:
        g = np.exp(-((x - bx) ** 2 + ((y - by) * 1.1) ** 2) / (r ** 2)) * kk
        brilho += g[..., None] * np.array(hexrgb(cor), F)
    brilho += (np.clip((fbm(x / 26, y / 9, 3, 21) - 0.42) * 2.2, 0, 1) * 0.12 * (y > fundo_y1))[..., None] * np.array(hexrgb('#8ae0b0'), F)
    a = np.clip(brilho.max(-1) / 255, 0, 1)
    lz.rgb = np.where(a[..., None] > 0, brilho / np.maximum(a[..., None], 1e-3), 0); lz.a = a
    lz.salvar(saida / f'{nome}-luz.png')


if __name__ == '__main__':
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'cenarios'
    saida.mkdir(parents=True, exist_ok=True)
    so = sys.argv[2] if len(sys.argv) > 2 else 'ambos'
    if so in ('ambos', 'paisagem'):
        pintar(520, 330, saida, 'catacumba-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'catacumba-retrato')
    print('ok', saida)
