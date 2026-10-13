"""Masmorra: o salão de pedra do segundo andar da Cripta.

Perspectiva de um ponto, vista um pouco de cima. Dois climas de luz contam a
cena: o fogo quente das tochas nas paredes (perto) e a luz fria e azul que
entra pela grade de ferro no fundo (longe). O chão de lajes tem poças que
refletem as duas. Camadas:
  fundo   parede do fundo com a grade de ferro e a luz azul, arcos da abóbada
  meio    paredes laterais de blocos, tochas, chão de lajes com poças, musgo
  frente  arco escuro em primeiro plano e correntes penduradas
  luz     tochas, luz da grade, reflexos nas poças
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa, ruido, voronoi  # noqa: E402

PEDRA = rampa(['#09080c', '#121118', '#1b1a22', '#25242d', '#302f39', '#3e3c47', '#4f4c57', '#646070'])
PEDRA_QUENTE = rampa(['#120b08', '#1f140e', '#2e1e14', '#43301e', '#5e4228', '#7c5a34'])
MUSGO = rampa(['#0a140c', '#122216', '#1c3320', '#28462a'])
FERRO = rampa(['#050608', '#0e1116', '#1a1f28', '#2a313c', '#45505e'])
FOGO = rampa(['#7a1a06', '#d0480e', '#ff8a1a', '#ffc24a', '#fff2b0'])
AZUL = '#7ab8ff'


def suave(a, b, v):
    t = np.clip((v - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


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
    jl, jr = (W * 0.24, W * 0.76) if retrato else (W * 0.33, W * 0.67)     # parede do fundo
    fundo_y0, fundo_y1 = H * 0.12, H * (0.56 if retrato else 0.6)
    t0 = Tela(W, H); x, y = t0.x, t0.y

    # ---------------------------------------------------------------- fundo
    f = Tela(W, H)
    # blocos de pedra (aparelho em fiadas), luz azul vinda da grade
    fy = np.floor(y / 7).astype(np.int64)
    fx = np.floor((x + (fy % 2) * 6) / 12).astype(np.int64)
    junta = ((y % 7) < 0.9) | (((x + (fy % 2) * 6) % 12) < 0.9)
    azul = np.exp(-(((x - cx) / (W * 0.16)) ** 2 + ((y - (fundo_y0 + fundo_y1) / 2) / (H * 0.25)) ** 2))
    lp = 0.12 + 0.1 * hv(fx, fy, 1) + 0.1 * fbm(x / 5, y / 5, 2, 2) + 0.35 * azul - 0.14 * junta
    f.tingir(np.ones((H, W), bool), np.clip(lp, 0, 0.999), PEDRA, 0.6)
    # portal com grade de ferro, luz fria atrás
    pw = (jr - jl) * 0.34
    ptopo, pbase = fundo_y0 + (fundo_y1 - fundo_y0) * 0.18, fundo_y1
    pr = pw / 2
    portal = (np.abs(x - cx) < pr) & (y < pbase) & ((y > ptopo + pr) | (np.hypot(x - cx, y - (ptopo + pr)) < pr))
    batente = (np.abs(x - cx) < pr + 4) & (y < pbase) & ((y > ptopo + pr) | (np.hypot(x - cx, y - (ptopo + pr)) < pr + 4)) & ~portal
    # aduelas do arco: blocos radiais
    ang = np.arctan2(y - (ptopo + pr), x - cx)
    aduela = (np.abs(((ang * 7 / np.pi) % 1) - 0.5) > 0.44) & (y < ptopo + pr)
    f.tingir(batente, np.clip(0.4 + 0.3 * azul - 0.25 * aduela, 0, 0.999), PEDRA[2:], 0.5)
    prof = np.clip((y - ptopo) / (pbase - ptopo), 0, 1)
    f.rgb[portal] = (np.array(hexrgb('#0c1a30'), F) * 0.5 + np.array(hexrgb('#4a8ad8'), F) * (0.5 + 0.5 * np.exp(-((x - cx) / pr) ** 2))[..., None] * (1 - 0.4 * prof[..., None]))[portal]
    # escada que desce lá dentro (degraus escuros)
    degrau = portal & (y > pbase - pw * 0.55) & ((np.floor((y - (pbase - pw * 0.55)) / 3) % 2) == 0)
    f.rgb[degrau] *= 0.55
    grade_v = portal & ((np.abs(((x - cx) % 5) - 2.5) > 2.0))
    grade_h = portal & ((np.abs(((y - ptopo) % 9) - 4.5) > 3.9))
    f.tingir(grade_v | grade_h, np.clip(0.2 + 0.3 * np.exp(-((x - cx) / pr) ** 2), 0, 0.999), FERRO, 0.4)
    # arcos da abóbada que recuam até a parede do fundo (faixas de pedra no teto)
    for k_, u in enumerate((0.0, 0.35, 0.62, 0.82)):
        xl = jl * u; xr = W - (W - jr) * u
        yt = fundo_y0 * u - H * 0.06 * (1 - u)
        larg = 6 * (1 - u) + 2
        r_ = (xr - xl) / 2
        arco = (np.abs(np.hypot((x - cx) / r_, (y - (yt + r_ * 0.55)) / (r_ * 0.55)) - 1) < larg / r_) & (y < yt + r_ * 0.55)
        f.tingir(arco, np.clip(0.2 + 0.2 * u + 0.2 * azul, 0, 0.999), PEDRA[1:], 0.5)
    f.velar(0.22 * azul, '#9ac8ff')
    f.salvar(saida / f'{nome}-fundo.png')

    # ---------------------------------------------------------------- meio
    m = Tela(W, H)
    luzes = []
    # chão de lajes em perspectiva
    chao = y >= fundo_y1
    zz = (H * 0.9) / np.maximum(y - vy, 1)
    wx = (x - cx) * zz / 40
    wz = zz * 2.2
    lx = np.floor(wx + (np.floor(wz) % 2) * 0.5)
    lz = np.floor(wz)
    jun = (np.abs(((wx + (np.floor(wz) % 2) * 0.5) % 1) - 0.5) > 0.47) | (np.abs((wz % 1) - 0.5) > 0.44)
    tocha_luz = np.zeros((H, W), F)
    lpiso = 0.12 + 0.12 * hv(lx.astype(np.int64), lz.astype(np.int64), 3) + 0.1 * fbm(wx * 2, wz, 2, 5) - 0.12 * jun
    lpiso = lpiso + 0.22 * np.exp(-(((x - cx) / (W * 0.25)) ** 2 + ((y - fundo_y1) / (H * 0.18)) ** 2))  # luz azul do portal no chão
    m.tingir(chao, np.clip(lpiso, 0, 0.999), PEDRA, 0.6)
    musgo = chao & jun & (fbm(wx * 3, wz * 2, 2, 7) > 0.6)
    m.tingir(musgo, np.clip(0.3 + 0.2 * fbm(x, y, 2, 8), 0, 0.999), MUSGO, 0.4)
    # poças: refletem a luz azul do fundo e o fogo das tochas
    for fx_, fy_, rx_, s in (((0.42, 0.74, 22, 1), (0.63, 0.86, 30, 2), (0.24, 0.92, 18, 3)) if not retrato else ((0.36, 0.7, 20, 1), (0.66, 0.84, 24, 2))):
        bx, by = W * fx_, H * fy_
        poca = chao & (np.hypot((x - bx) / rx_, (y - by) / (rx_ * 0.28)) < 1 - 0.2 * fbm(x / 4, y / 3, 2, s))
        reflexo = 0.25 + 0.5 * np.exp(-((x - cx) / (W * 0.08)) ** 2) + 0.15 * np.sin(y * 1.6)
        m.rgb[poca] = (m.rgb[poca] * 0.35 + np.array(hexrgb('#2a4a78'), F) * 0.35 + np.array(hexrgb(AZUL), F) * reflexo[poca][..., None] * 0.35)
        borda_p = poca & ~(np.hypot((x - bx) / (rx_ - 2), (y - by) / (rx_ * 0.28 - 1)) < 1 - 0.2 * fbm(x / 4, y / 3, 2, s))
        m.rgb[borda_p] = m.rgb[borda_p] * 0.6 + np.array(hexrgb('#9ac8ff'), F) * 0.4
    # paredes laterais em perspectiva
    for lado in (-1, 1):
        borda_x = 0 if lado < 0 else W
        far_x = jl if lado < 0 else jr
        lo, hi = min(borda_x, far_x), max(borda_x, far_x)
        u = np.clip((x - borda_x) / (far_x - borda_x), 0, 1)
        topo = -H * 0.2 * (1 - u) + fundo_y0 * u
        base = H * 1.08 * (1 - u) + fundo_y1 * u
        mm = (x >= lo) & (x <= hi) & (y >= topo) & (y <= base)
        v = (y - topo) / np.maximum(base - topo, 1)
        d_ = u / (1 - 0.75 * u) * 7
        fy2 = np.floor(v * 14).astype(np.int64)
        fx2 = np.floor(d_ + (fy2 % 2) * 0.5).astype(np.int64)
        jj = (np.abs(((v * 14) % 1) - 0.5) > 0.42) | (np.abs(((d_ + (fy2 % 2) * 0.5) % 1) - 0.5) > 0.46)
        lw = 0.08 + 0.3 * u + 0.1 * hv(fx2, fy2, 9 + lado) + 0.08 * fbm(x / 4, y / 4, 2, 10) - 0.13 * jj
        m.tingir(mm, np.clip(lw, 0, 0.999), PEDRA, 0.6)
        # tochas nas paredes, em suportes de ferro
        for uu in (0.2, 0.55):
            px_ = borda_x + (far_x - borda_x) * uu
            topo_k = -H * 0.2 * (1 - uu) + fundo_y0 * uu; base_k = H * 1.08 * (1 - uu) + fundo_y1 * uu
            py_ = topo_k + (base_k - topo_k) * 0.42
            tam = (1 - uu) * 2.2 + 0.8
            # parede aquecida pela tocha: queda suave em degraus (nada de disco de borda dura)
            q = np.clip(1 - np.hypot(x - px_, (y - py_) * 0.8) / (tam * 14), 0, 1) ** 1.6
            q = np.floor(q * 5 + (m.bayer - 0.5) * 0.9) / 5
            k_ = (q * 0.55 * mm)[..., None]
            m.rgb = m.rgb * (1 - k_) + np.array(hexrgb('#8a5a30'), F) * k_
            suporte = (np.abs(x - px_) < tam * 0.8) & (y > py_) & (y < py_ + tam * 5)
            m.tingir(suporte, np.full((H, W), 0.4, F), FERRO, 0.3)
            cabo = (np.abs(x - px_) < tam * 0.9) & (y > py_ - tam * 2.5) & (y <= py_)
            m.tingir(cabo, np.full((H, W), 0.5, F), PEDRA_QUENTE, 0.3)
            ch = np.hypot((x - px_) / (tam * 1.1), (y - (py_ - tam * 4)) / (tam * 2.2)) < 1
            m.tingir(ch, np.clip(1 - np.hypot(x - px_, (y - (py_ - tam * 4)) * 0.6) / (tam * 2.2), 0, 0.999), FOGO, 0.3)
            luzes.append((px_, py_ - tam * 4, 10 + tam * 7))
    # ralo no chão, perto do centro
    rx0, ry0 = cx + W * 0.2, H * 0.97 if not retrato else H * 0.95
    ralo = chao & (np.abs(x - rx0) < 9) & (np.abs(y - ry0) < 3.4)
    m.tingir(ralo, np.full((H, W), 0.3, F), FERRO, 0.3)
    m.rgb[ralo & ((x - rx0) % 3 < 1.2)] *= 0.3
    m.salvar(saida / f'{nome}-meio.png')

    # ---------------------------------------------------------------- frente
    fr = Tela(W, H)
    # arco de pedra em primeiro plano (moldura escura)
    r_ = W * 0.62
    arco = (np.hypot((x - cx) / r_, (y - H * 0.62) / (H * 0.66)) > 1) & (y < H * 0.62)
    lados = (np.minimum(x, W - x) < W * 0.035) & (y >= H * 0.62)
    fr.tingir(arco | lados, np.clip(0.06 + 0.12 * fbm(x / 6, y / 6, 2, 50), 0, 0.999), PEDRA, 0.5)
    # correntes penduradas
    for fx_, comp, s in ((0.17, 0.34, 1), (0.83, 0.28, 2), (0.3, 0.16, 3)):
        bx = W * fx_
        elo = np.floor(y / 4)
        ex = bx + 0.8 * np.sin(y / 20 + s)
        c_ = (y < H * comp) & (((elo % 2 == 0) & (np.abs(np.abs(x - ex) - 1.2) < 0.7)) | ((elo % 2 == 1) & (np.abs(x - ex) < 0.6)))
        fr.tingir(c_, np.clip(0.3 + 0.4 * ((y % 4) < 1.5), 0, 0.999), FERRO, 0.3)
    fr.rgb *= 0.8
    fr.salvar(saida / f'{nome}-frente.png')

    # ---------------------------------------------------------------- luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    brilho += (np.exp(-(((x - cx) / (pr * 1.6)) ** 2 + ((y - (ptopo + pbase) / 2) / ((pbase - ptopo) * 0.8)) ** 2)) * 0.45)[..., None] * np.array(hexrgb('#6aa8ff'), F)
    for bx, by, r in luzes:
        g = np.exp(-((x - bx) ** 2 + ((y - by) * 1.1) ** 2) / (r ** 2)) * 0.55
        brilho += g[..., None] * np.array(hexrgb('#ff9a40'), F)
    a = np.clip(brilho.max(-1) / 255, 0, 1)
    lz.rgb = np.where(a[..., None] > 0, brilho / np.maximum(a[..., None], 1e-3), 0); lz.a = a
    lz.salvar(saida / f'{nome}-luz.png')


if __name__ == '__main__':
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'cenarios'
    saida.mkdir(parents=True, exist_ok=True)
    so = sys.argv[2] if len(sys.argv) > 2 else 'ambos'
    if so in ('ambos', 'paisagem'):
        pintar(520, 330, saida, 'masmorra-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'masmorra-retrato')
    print('ok', saida)
