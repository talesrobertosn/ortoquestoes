"""Salão dos Campeões: top 3 do ranking das questões em HD-2D (14/10/2026).

Inspirado na linguagem visual do Octopath Traveler II: pixel art nítida em
camadas de profundidade, e por cima (no navegador) luz cinematográfica,
desfoque de profundidade, brilho e micromovimentos. Este script só pinta as
camadas; a luz, o desfoque e a animação ficam no CSS (Ranking.css, .sc).

Camadas (320×240, gravadas em public/ranking/salao/):
  fundo.png        parede, vitral, colunas, piso de mármore, tapete e pedestais
  vitral-luz.png   só o vitral, para o brilho (bloom) pulsar por cima
  estandarte-*.png estandartes que balançam
  trofeu-{1,2,3}.png  troféus que flutuam
  fogo-{0,1,2}.png quadros da chama dos braseiros
  frente.png       colunas e velas em primeiro plano (desfocadas no CSS)

Os nomes, as posições e os totais entram em HTML, nas placas dos pedestais.
Nada baixado ou gerado por IA.

    python3 scripts/cenarios/salao_campeoes.py
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, contorno, fbm, hexrgb, rampa, ruido  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]
SAI = RAIZ / 'public' / 'ranking' / 'salao'
W, H = 320, 240
CHAO = 172          # onde a parede encontra o piso
HORIZONTE = 96      # ponto de fuga do piso
JANELA = (160, 52)  # centro da rosácea

PEDRA = rampa(['#0b0d1a', '#131729', '#1c2139', '#262c4a', '#333b5e', '#444e76', '#5a6590'])
MARMORE = rampa(['#0c0d1c', '#16182c', '#22253e', '#313552', '#44496c', '#5d6388', '#8087ae'])
TAPETE = rampa(['#24050d', '#3f0a17', '#621222', '#8a1c2e', '#b02a3a', '#d4444c'])
OURO = rampa(['#2e1a04', '#5a380c', '#8e5c16', '#c48a24', '#e8b440', '#f8da70', '#fff4c0', '#ffffff'])
PRATA = rampa(['#1a1f2a', '#353e4e', '#5a6578', '#8592a6', '#b2bdcf', '#d8e0ec', '#f2f6fc', '#ffffff'])
BRONZE = rampa(['#240e04', '#4a220e', '#763a18', '#a45828', '#cc7c40', '#e8a466', '#f8d0a4', '#fff2e2'])
METAL = {1: OURO, 2: PRATA, 3: BRONZE}
MARFIM = rampa(['#241e1c', '#3e3530', '#5c5048', '#82735f', '#a8977c', '#cbbb9c', '#e8dcc0', '#fbf4e2'])
VIDRO = ['#d02840', '#2858e0', '#f0c040', '#24a060', '#8040d0', '#e06a20', '#30a8d8']

# pedestais (posição: x0, x1, topo); a base é BASE_PED. Ordem visual 2º, 1º, 3º.
BASE_PED = 200
PEDESTAIS = {2: (64, 124, 128), 1: (130, 190, 108), 3: (196, 256, 140)}


def salvar(t: Tela, nome: str):
    SAI.mkdir(parents=True, exist_ok=True)
    t.salvar(SAI / nome)
    print('gravado', (SAI / nome).relative_to(RAIZ))


def arco(t: Tela, cx, x_meia, topo, base):
    """Máscara de uma janela em arco ogival (gótico)."""
    r = x_meia * 1.6
    dx = np.abs(t.x - cx)
    ogiva = ((t.x - (cx - x_meia + r)) ** 2 + (t.y - (topo + r * 0.92)) ** 2 <= r * r) & \
            ((t.x - (cx + x_meia - r)) ** 2 + (t.y - (topo + r * 0.92)) ** 2 <= r * r)
    reto = (dx <= x_meia) & (t.y >= topo + r * 0.92) & (t.y < base)
    return ((ogiva & (t.y < topo + r * 0.92) & (t.y >= topo)) | reto)


def vidro(t: Tela, m, cx, cy, celula=6, s=0, brilho=1.0):
    """Vitral: painéis coloridos com chumbo, mais claros perto do centro."""
    # losangos (vidraça em diamante), como nos vitrais góticos
    a, b = (t.x - cx) + (t.y - cy) * 0.6, (t.x - cx) - (t.y - cy) * 0.6
    gx, gy = np.floor(a / celula), np.floor(b / celula)
    idc = (np.abs(gx * 3 + gy * 5 + s + np.floor((t.y - cy) / 24) * 2) % len(VIDRO)).astype(int)
    chumbo = (a % celula < 0.9) | (b % celula < 0.9)
    dist = np.hypot(t.x - cx, (t.y - cy) * 0.7) / 60
    luz = np.clip(1.15 - dist * 0.7 + (ruido(t.x * 0.3, t.y * 0.3, s) - 0.5) * 0.25, 0.25, 1.2) * brilho
    for k, c in enumerate(VIDRO):
        mk = m & ~chumbo & (idc == k)
        base = np.array(hexrgb(c), F)
        cor = np.clip(base[None, :] * luz[mk][:, None] + 70 * np.clip(luz[mk] - 0.85, 0, 1)[:, None] * 3, 0, 255)
        t.rgb[mk] = cor; t.a[mk] = 1
    t.cor(m & chumbo, '#0a0a16')


def rosacea(t: Tela, cx, cy, r, brilho=1.0):
    d = np.hypot(t.x - cx, t.y - cy)
    ang = np.arctan2(t.y - cy, t.x - cx)
    m = d <= r
    setor = np.floor((ang + math.pi) / (2 * math.pi) * 12).astype(int)
    anel = np.floor(d / (r / 3)).astype(int)
    cores = np.array([hexrgb(c) for c in VIDRO], F)
    idc = (setor * 3 + anel * 5) % len(VIDRO)
    luz = np.clip(1.25 - d / r * 0.6, 0.5, 1.3) * brilho
    cor = np.clip(cores[idc] * luz[..., None] + 90 * np.clip(luz - 1.0, 0, 1)[..., None] * 3, 0, 255)
    t.rgb[m] = cor[m]; t.a[m] = 1
    raio_chumbo = (np.abs(((ang + math.pi) / (2 * math.pi) * 12) % 1 - 0.5) > 0.5 - 0.6 / np.maximum(d, 1) * 2.2)
    aneis = (np.abs(d - r / 3) < 0.7) | (np.abs(d - 2 * r / 3) < 0.7)
    t.cor(m & (raio_chumbo | aneis) & (d > 4), '#0a0a16')
    miolo = d <= 4.5
    t.cor(miolo, '#fff6c8')
    moldura = (d > r) & (d <= r + 3)
    t.tingir(moldura, 0.55 - (t.y - cy) / r * 0.15, PEDRA, 0.3)


# ---------------------------------------------------------------- fundo
def fundo() -> tuple[Tela, Tela]:
    t = Tela(W, H)
    luz_vitral = Tela(W, H)
    jx, jy = JANELA
    # parede de blocos, iluminada pelo vitral
    fiada = np.floor(t.y / 8)
    junta = ((t.y % 8) < 1) | (((t.x + (fiada % 2) * 7) % 14) < 1)
    brilho = np.exp(-(((t.x - jx) / 95) ** 2 + ((t.y - jy - 30) / 120) ** 2))
    luz = 0.12 + brilho * 0.62 + (ruido(np.floor((t.x + (fiada % 2) * 7) / 14) * 2.3, fiada * 1.9, 3) - 0.5) * 0.18 + (fbm(t.x * 0.08, t.y * 0.08, 3, 4) - 0.5) * 0.12
    parede = t.y < CHAO
    t.tingir(parede & ~junta, luz, PEDRA, 0.7)
    t.tingir(parede & junta, luz * 0.45, PEDRA, 0.2)

    # nicho em arco atrás da janela grande e janelas laterais
    nicho = arco(t, jx, 50, 2, CHAO - 34)
    t.tingir(nicho, 0.22 + brilho * 0.25, PEDRA, 0.6)
    grande = arco(t, jx, 42, 8, CHAO - 40)
    for alvo in (t, luz_vitral):
        vidro(alvo, grande & (t.y > jy + 30), jx, jy + 30, 7, 1)
        rosacea(alvo, jx, jy, 30)
        # mainéis de pedra dividindo as lancetas
        mainel = grande & (t.y > jy + 32) & ((np.abs(t.x - (jx - 14)) < 1.5) | (np.abs(t.x - (jx + 14)) < 1.5))
        alvo.tingir(mainel, 0.6 - (t.y - jy) / 200, PEDRA, 0.2)
    # arcos menores das lancetas e moldura da janela
    borda = arco(t, jx, 45, 5, CHAO - 37) & ~grande
    t.tingir(borda, 0.62 - (t.y / H) * 0.3 + (np.abs(t.x - jx) < 44) * 0.05, PEDRA, 0.4)
    peitoril = (np.abs(t.x - jx) <= 52) & (t.y >= CHAO - 40) & (t.y < CHAO - 34)
    t.tingir(peitoril, 0.75 - (t.y - (CHAO - 40)) / 6 * 0.4, PEDRA, 0.3)
    for cx in (46, 274):
        m = arco(t, cx, 13, 34, CHAO - 50)
        b = arco(t, cx, 16, 31, CHAO - 47) & ~m
        t.tingir(b, 0.42, PEDRA, 0.4)
        for alvo in (t, luz_vitral):
            vidro(alvo, m, cx, 70, 5, cx, 0.75)

    # colunas com capitel e base, cilindro iluminado do lado do vitral
    for cx in (96, 224):
        lado = 1 if cx < jx else -1
        m = (np.abs(t.x - cx) <= 8) & (t.y < CHAO)
        u = (t.x - cx) / 8
        luz = 0.25 + np.clip(u * lado, -1, 1) * 0.28 + (1 - u * u) * 0.25 + (fbm(t.x * 0.4, t.y * 0.05, 2, cx) - 0.5) * 0.1
        t.tingir(m, luz, PEDRA, 0.6)
        canelura = m & ((np.floor(t.x - cx + 8) % 4) == 0) & (t.y > 18) & (t.y < CHAO - 12)
        t.tingir(canelura, luz * 0.6, PEDRA, 0.2)
        for (y0, y1, larg) in ((8, 13, 12), (13, 18, 10), (CHAO - 12, CHAO - 6, 10), (CHAO - 6, CHAO, 12)):
            mc = (np.abs(t.x - cx) <= larg) & (t.y >= y0) & (t.y < y1)
            t.tingir(mc, 0.45 + (t.x - cx) / larg * 0.2 * lado + (y0 < 20) * 0.1 - (t.y - y0) / (y1 - y0) * 0.2, PEDRA, 0.4)
    # friso no alto da parede
    friso = (t.y >= 0) & (t.y < 6)
    t.tingir(friso, 0.25 + brilho * 0.3, PEDRA, 0.4)
    # rodapé
    rodape = (t.y >= CHAO - 4) & (t.y < CHAO)
    t.tingir(rodape, 0.35 + brilho * 0.35 - (t.y - CHAO + 4) * 0.05, PEDRA, 0.4)

    # piso de mármore em perspectiva, polido, refletindo o vitral
    piso = t.y >= CHAO
    prof = 1500 / np.maximum(t.y - HORIZONTE, 1)
    u = (t.x - jx) / np.maximum(t.y - HORIZONTE, 1) * 4.2
    v = prof
    xadrez = ((np.floor(u) + np.floor(v * 0.12)) % 2).astype(F)
    veio = fbm(u * 1.6, v * 0.25, 3, 21)
    reflexo = np.exp(-((t.x - jx) / np.maximum(18 + (t.y - CHAO) * 0.5, 1)) ** 2) * np.clip(1 - (t.y - CHAO) / 90, 0, 1)
    luzp = 0.2 + xadrez * 0.22 + (veio - 0.5) * 0.2 + reflexo * 0.45 + np.exp(-(((t.x - jx) / 120) ** 2)) * 0.12
    juntap = (np.abs(u - np.round(u)) < 0.035 * (t.y - HORIZONTE) / 20) | (np.abs(v * 0.12 - np.round(v * 0.12)) < 0.04)
    t.tingir(piso & ~juntap, luzp, MARMORE, 0.8)
    t.tingir(piso & juntap, luzp * 0.6, MARMORE, 0.3)
    # reflexo colorido do vitral no piso
    refl_cor = piso & (np.abs(t.x - jx) < 14 + (t.y - CHAO) * 0.4) & (t.y < CHAO + 40)
    cores = np.array([hexrgb(c) for c in VIDRO], F)
    idc = (np.floor((t.x - jx) / 6).astype(int) % len(VIDRO))
    alfa = (0.22 * (1 - (t.y - CHAO) / 40))[refl_cor][:, None]
    t.rgb[refl_cor] = t.rgb[refl_cor] * (1 - alfa) + cores[idc[refl_cor]] * alfa

    # tapete vermelho do primeiro plano até o pedestal do campeão
    meia = 16 + (t.y - CHAO) * 0.62
    tap = piso & (np.abs(t.x - jx) <= meia)
    luz_t = 0.45 + reflexo * 0.3 + (ruido(t.x * 0.8, t.y * 0.8, 33) - 0.5) * 0.15 - (np.abs(t.x - jx) / meia) * 0.15
    t.tingir(tap, luz_t, TAPETE, 0.8)
    borda_t = piso & (np.abs(np.abs(t.x - jx) - (meia - 2.5)) < 1.0)
    t.tingir(borda_t, 0.7 + reflexo * 0.2, OURO, 0.3)

    # degraus do estrado
    for i, (y0, y1) in enumerate(((BASE_PED - 2, BASE_PED + 4), (BASE_PED + 4, BASE_PED + 10))):
        larg = 140 + i * 14
        tampo = (np.abs(t.x - jx) <= larg) & (t.y >= y0) & (t.y < y0 + 2)
        frente = (np.abs(t.x - jx) <= larg) & (t.y >= y0 + 2) & (t.y < y1)
        t.tingir(tampo, 0.62 + reflexo * 0.2, MARMORE, 0.3)
        t.tingir(frente & ~tap, 0.3 + reflexo * 0.2 - (t.y - y0) * 0.02, MARMORE, 0.4)
        t.tingir(frente & tap, 0.3, TAPETE, 0.3)
        t.tingir(tampo & tap, 0.6, TAPETE, 0.3)

    for p in (2, 3, 1):
        pedestal(t, p)
    for cx in (34, 286):
        braseiro(t, cx)
    return t, luz_vitral


def pedestal(t: Tela, pos: int):
    x0, x1, topo = PEDESTAIS[pos]
    met = METAL[pos]
    lado = 6  # face lateral (3/4)
    larg = x1 - x0
    # sombra no piso
    sombra = (t.x >= x0 - 4) & (t.x < x1 + lado + 8) & (t.y >= BASE_PED - 1) & (t.y < BASE_PED + 5)
    t.velar(np.where(sombra, 0.5, 0), '#05060e')
    # frente de mármore escuro
    frente = (t.x >= x0) & (t.x < x1) & (t.y >= topo + 5) & (t.y < BASE_PED)
    u = (t.x - x0) / larg
    luz = 0.42 - u * 0.12 + (fbm(t.x * 0.15, t.y * 0.15, 3, pos * 9) - 0.5) * 0.18 + (topo + 5 - t.y) * -0.0
    t.tingir(frente, luz + 0.18, MARFIM, 0.6)
    # face lateral, à direita, mais escura
    lat = (t.x >= x1) & (t.x < x1 + lado) & (t.y >= topo + 5 - (t.x - x1) * 0.5) & (t.y < BASE_PED - (t.x - x1) * 0.5)
    t.tingir(lat, 0.22, MARFIM, 0.4)
    # tampo
    tampo = (t.y >= topo) & (t.y < topo + 5) & (t.x >= x0 - 2 + (topo + 5 - t.y) * 0.0) & (t.x < x1 + lado - (t.y - topo) * 1.2 + 2)
    t.tingir(tampo, 0.92 - (t.y - topo) / 5 * 0.3, MARFIM, 0.3)
    # frisos de metal (ouro, prata, bronze) no alto e embaixo
    for (y0, y1) in ((topo + 5, topo + 9), (BASE_PED - 5, BASE_PED - 2)):
        f = (t.x >= x0 - 1) & (t.x < x1 + 1) & (t.y >= y0) & (t.y < y1)
        t.tingir(f, 0.88 - (t.y - y0) / (y1 - y0) * 0.45 - u * 0.25, met, 0.4)
        fl = (t.x >= x1 + 1) & (t.x < x1 + lado) & (t.y >= y0 - (t.x - x1) * 0.5) & (t.y < y1 - (t.x - x1) * 0.5)
        t.tingir(fl, 0.35, met, 0.3)
    # placa recuada onde o nome entra (HTML)
    py0, py1 = topo + 13, BASE_PED - 9
    placa = (t.x >= x0 + 4) & (t.x < x1 - 4) & (t.y >= py0) & (t.y < py1)
    t.tingir(placa, 0.12 + (t.y - py0) / max(py1 - py0, 1) * 0.08, PEDRA, 0.3)
    moldura = placa & ((t.x < x0 + 5) | (t.x >= x1 - 5) | (t.y < py0 + 1) | (t.y >= py1 - 1))
    t.tingir(moldura, 0.7 - u * 0.3, met, 0.3)
    # rebites nos cantos
    for (rx, ry) in ((x0 + 2, topo + 11), (x1 - 3, topo + 11), (x0 + 2, BASE_PED - 8), (x1 - 3, BASE_PED - 8)):
        t.tingir((np.abs(t.x - rx) < 1) & (np.abs(t.y - ry) < 1), 0.9, met, 0)


def braseiro(t: Tela, cx: int):
    """Braseiro de ferro com bacia; a chama é animada à parte."""
    base = CHAO + 26
    haste = (np.abs(t.x - cx) <= 1) & (t.y >= base - 22) & (t.y < base)
    t.tingir(haste, 0.4 + (t.x - cx) * 0.1, PEDRA, 0.2)
    pes = (np.abs(t.x - cx) <= 6 - (base - t.y) * 0.8) & (t.y >= base - 4) & (t.y < base)
    t.tingir(pes, 0.35, PEDRA, 0.2)
    bacia = ((t.x - cx) ** 2 / 100 + (t.y - (base - 24)) ** 2 / 25 <= 1) & (t.y >= base - 24)
    t.tingir(bacia, 0.55 - (t.y - base + 24) * 0.06 + (t.x - cx) * -0.02, OURO, 0.4)
    borda = (np.abs(t.x - cx) <= 10) & (t.y >= base - 25) & (t.y < base - 23)
    t.tingir(borda, 0.85, OURO, 0.2)


# ---------------------------------------------------------------- sprites
def estandarte(cor: str, emblema: str, nome: str):
    """Estandarte com bastão de ouro, borda, emblema e barra em cauda de andorinha."""
    w, h = 24, 74
    t = Tela(w, h)
    pano = rampa([misturar_hex(cor, '#000000', 0.7), misturar_hex(cor, '#000000', 0.45), misturar_hex(cor, '#000000', 0.2), cor, misturar_hex(cor, '#ffffff', 0.25)])
    cauda = h - 10 + np.abs(t.x - w / 2) * 0.9
    m = (t.x >= 2) & (t.x < w - 2) & (t.y >= 4) & (t.y < cauda)
    dobra = np.sin((t.x - 2) / (w - 4) * math.pi * 2) * 0.18
    t.tingir(m, 0.55 + dobra - t.y / h * 0.2, pano, 0.6)
    borda = m & ((t.x < 4) | (t.x >= w - 4) | (t.y < 6) | (t.y >= cauda - 2))
    t.tingir(borda, 0.75 + dobra, OURO, 0.4)
    # emblema: louro e estrela, ou cálice
    cx, cy = w / 2, 30
    if emblema == 'estrela':
        ang = np.arctan2(t.y - cy, t.x - cx); d = np.hypot(t.x - cx, t.y - cy)
        r = 4 + 3.5 * (0.5 + 0.5 * np.cos(ang * 5 + math.pi / 2))
        t.tingir(m & (d <= r), 0.9 - d / 9 * 0.3, OURO, 0.3)
    else:
        calice = m & ((((t.x - cx) ** 2 / 36 + (t.y - (cy - 4)) ** 2 / 25) <= 1) & (t.y >= cy - 4) | ((np.abs(t.x - cx) <= 1) & (t.y >= cy) & (t.y < cy + 7)) | ((np.abs(t.x - cx) <= 4) & (t.y >= cy + 7) & (t.y < cy + 9)))
        t.tingir(calice, 0.9 - (t.x - cx) * 0.04, OURO, 0.3)
    for k in range(3):
        y = 48 + k * 4
        t.tingir(m & (np.abs(t.y - y) < 0.6) & (np.abs(t.x - cx) < 6), 0.7, OURO, 0)
    bastao = (t.y >= 1) & (t.y < 4)
    t.tingir(bastao, 0.95 - (t.y - 1) * 0.2, OURO, 0.2)
    for x in (0, w - 1):
        t.tingir((np.abs(t.x - x) < 1.5) & (t.y >= 0) & (t.y < 5), 0.95, OURO, 0)
    contorno(t, '#07060c')
    salvar(t, nome)


def misturar_hex(a: str, b: str, k: float) -> str:
    ra, rb = np.array(hexrgb(a), F), np.array(hexrgb(b), F)
    c = (ra + (rb - ra) * k).astype(int)
    return '#%02x%02x%02x' % tuple(c)


def trofeu(pos: int):
    """Taça com alças, haste e base, metal com reflexo especular."""
    esc = {1: 1.0, 2: 0.8, 3: 0.8}[pos]
    w, h = int(44 * esc) + 2, int(52 * esc) + 2
    t = Tela(w, h)
    met = METAL[pos]
    cx = (w - 1) / 2
    s = esc
    # bacia
    by, br, bh = 6 * s, 15 * s, 20 * s
    bacia = ((t.x - cx) ** 2 / br ** 2 + ((t.y - by) / bh) ** 2 <= 1) & (t.y >= by)
    boca = (np.abs(t.x - cx) <= br) & (t.y >= by - 2 * s) & (t.y < by + 1)
    u = (t.x - cx) / br
    luz = 0.55 - u * 0.35 + (1 - u * u) * 0.2 - (t.y - by) / bh * 0.15
    t.tingir(bacia, luz, met, 0.6)
    t.tingir(boca, 0.85 - u * 0.2, met, 0.3)
    interior = (np.abs(t.x - cx) <= br - 2) & (t.y >= by - 1 * s) & (t.y < by + 0.5)
    t.tingir(interior, 0.2, met, 0)
    # reflexo especular
    esp = bacia & (np.abs(t.x - (cx - br * 0.45)) < 1.2 * s) & (t.y > by + 3 * s) & (t.y < by + bh * 0.7)
    t.cor(esp, '#ffffff')
    # alças
    for lado in (-1, 1):
        ax, ay = cx + lado * (br + 2 * s), by + 7 * s
        d = np.hypot(t.x - ax, (t.y - ay) * 0.9)
        alca = (d <= 6 * s) & (d >= 3.6 * s) & ((t.x - cx) * lado > br - 2 * s)
        t.tingir(alca, 0.6 - lado * 0.2 - (t.y - ay) * 0.03, met, 0.3)
    # haste e nó
    hy0, hy1 = by + bh * 0.95, by + bh + 12 * s
    haste = (np.abs(t.x - cx) <= 2.2 * s + np.clip(hy0 + 3 * s - t.y, 0, 9) * 0.8) & (t.y >= hy0 - 1) & (t.y < hy1)
    t.tingir(haste, 0.55 - (t.x - cx) / (3 * s) * 0.3, met, 0.4)
    no = ((t.x - cx) ** 2 / (4.5 * s) ** 2 + (t.y - (hy0 + 6 * s)) ** 2 / (2.2 * s) ** 2) <= 1
    t.tingir(no, 0.75 - (t.x - cx) / (5 * s) * 0.35, met, 0.3)
    # base em dois degraus
    for (y0, y1, meia) in ((hy1, hy1 + 4 * s, 9 * s), (hy1 + 4 * s, hy1 + 9 * s, 12 * s)):
        b = (np.abs(t.x - cx) <= meia) & (t.y >= y0) & (t.y < y1)
        t.tingir(b, 0.7 - (t.x - cx) / meia * 0.35 - (t.y - y0) / (y1 - y0) * 0.2, met, 0.4)
    # pedra preciosa na bacia
    gx, gy = cx, by + bh * 0.42
    gema = np.hypot(t.x - gx, t.y - gy) <= 2.6 * s
    t.cor(gema, {1: '#e02848', 2: '#2a6ae8', 3: '#2aa868'}[pos])
    t.cor(np.hypot(t.x - gx + 0.8, t.y - gy + 0.8) <= 0.9, '#ffffff')
    contorno(t, '#0a0608')
    salvar(t, f'trofeu-{pos}.png')


def fogo(k: int):
    """Chama em gota: base redonda, línguas no alto, miolo claro; três quadros."""
    w, h = 22, 30
    t = Tela(w, h)
    cx = w / 2
    cores = rampa(['#8a1a08', '#c83a10', '#f07a1c', '#ffb43a', '#ffe68a', '#fffbe6'])
    fase = k * 2.1
    alt = np.clip((h - 2 - t.y) / (h - 4), 0, 1)          # 0 na base, 1 no topo
    larg = 8.0 * np.clip(alt * 3.2, 0, 1) ** 0.5 * (1 - alt) ** 0.9
    desloc = np.sin(alt * 5 + fase) * alt * 2.4
    d = np.abs(t.x - cx - desloc) / np.maximum(larg, 0.01)
    corte = ruido(t.x * 0.45, t.y * 0.3 + fase * 2.5, 70 + k)
    m = (d <= 1) & (alt > 0) & ((alt < 0.45) | (corte > 0.25 + (alt - 0.45) * 0.9))
    luz = np.clip((1 - d) * 0.8 + (1 - alt) * 0.35, 0, 1)
    t.tingir(m, luz, cores, 0.5)
    salvar(t, f'fogo-{k}.png')


def frente():
    """Primeiro plano: bases de colunas e candelabros (desfocados no CSS)."""
    t = Tela(W, H)
    for cx, lado in ((-6, 1), (W + 6, -1)):
        m = np.abs(t.x - cx) <= 22
        u = (t.x - cx) / 22
        luz = 0.12 + np.clip(u * lado, 0, 1) * 0.35
        t.tingir(m, luz, PEDRA, 0.5)
        base = (np.abs(t.x - cx) <= 28) & (t.y >= H - 34)
        t.tingir(base, 0.2 + np.clip(u * lado, 0, 1) * 0.3, PEDRA, 0.4)
    # velas no chão, à frente
    for vx, alt in ((40, 22), (50, 15), (276, 18), (285, 26)):
        vela = (np.abs(t.x - vx) <= 2) & (t.y >= H - 6 - alt) & (t.y < H - 6)
        t.tingir(vela, 0.8 - (t.x - vx) * 0.12, rampa(['#6a5a40', '#a89060', '#e0cc98', '#fff4d8']), 0.3)
        chama = ((t.x - vx) ** 2 / 2.2 + (t.y - (H - 6 - alt - 4)) ** 2 / 9) <= 1
        t.cor(chama, '#ffd060'); t.cor(((t.x - vx) ** 2 + (t.y - (H - 6 - alt - 3)) ** 2) <= 1, '#ffffff')
    salvar(t, 'frente.png')


def main():
    t, luz = fundo()
    salvar(t, 'fundo.png')
    # palco nítido por cima do fundo desfocado: piso, degraus, pedestais e braseiros
    palco = Tela(W, H)
    m = t.y >= CHAO - 6
    for (x0, x1, topo) in PEDESTAIS.values():
        m |= (t.x >= x0 - 3) & (t.x < x1 + 9) & (t.y >= topo) & (t.y < BASE_PED + 6)
    palco.rgb[m] = t.rgb[m]; palco.a[m] = t.a[m]
    salvar(palco, 'palco.png')
    salvar(luz, 'vitral-luz.png')
    estandarte('#2a3a9a', 'estrela', 'estandarte-esq.png')
    estandarte('#9a1a2a', 'calice', 'estandarte-dir.png')
    for p in (1, 2, 3):
        trofeu(p)
    for k in range(3):
        fogo(k)
    frente()


if __name__ == '__main__':
    main()
