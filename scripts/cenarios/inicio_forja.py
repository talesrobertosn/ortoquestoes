#!/usr/bin/env python3
"""A forja do ferreiro: cenário "HD-2D" do topo da página inicial (01/11/2026), no mesmo jeito do acampamento.

Nada baixado nem gerado por IA: cada pixel sai das funções abaixo. O cenário é pintado em pixel art (480 x 200),
camada por camada, e montado em 3x com a luz calculada por pixel, como em scripts/gerar_cena_inicio.py (de onde vêm
os pincéis básicos, as copas das árvores e as funções de luz: Camada, copa, luz_em_degraus, projetar_sombra...).

O que se vê:
- uma oficina de pedra e madeira, semiaberta à direita para a mata (por ali e pela janela gradeada a hora do dia
  aparece); teto de tábuas com uma viga grossa, paredes de pedra aparelhada, piso de lajes em perspectiva;
- a fornalha de tijolo no centro, com o arco de pedra, a coifa enegrecida de fuligem e a chaminé subindo pelo teto.
  A boca fica exatamente onde o fogo animado do site entra (x 220-260, y 104-152): lá dentro só o leito de carvão em
  brasa e o fundo incandescente, sem chama pintada;
- o fole de couro pendurado em correntes com o bico entrando na fornalha, o caixote e os sacos de carvão;
- a bigorna num toco com uma placa em brasa e o martelo, o barril de têmpera com água e vapor, o balde;
- o painel de peças de ortopedia em ferro (placas com furos, parafusos, haste, fios e uma placa em T), a prateleira
  de caixas de parafusos, as barras encostadas, o banco de trabalho com a morsa e o porta-ferramentas (martelos e
  tenazes), tudo só metal e madeira, sem anatomia;
- luz: a fornalha é a fonte principal (poça em degraus, leque de luz pela boca no chão, sombras projetadas a partir
  dela, recorte laranja nas bordas viradas para o fogo, reflexo no ferro e na água), o sol entrando pela janela com as
  sombras das grades no chão e o feixe com poeira (manhã), o sol baixo entrando pela lateral aberta com sombras longas
  (tarde), luar frio e o lampião aceso (noite); faíscas pintadas discretas, fumaça na coifa, brilho (bloom), curva de
  tom, correção de cor, área calma à esquerda para o texto, vinheta e grão.

O fogo, o esqueleto, o gato e a coruja entram por cima (componentes/inicio/cena/CenaDiorama.tsx). As âncoras ficam em
scripts/cenarios/cena-forja.json (lido por src/componentes/inicio/cena/cenarios.ts); LIVRE abaixo guarda as caixas que a pintura deixa abertas.

Saídas em public/pixel/inicio/: cena-forja-{manha,tarde,noite}.webp (1440 x 600) e -960 (960 x 400).
Uso: python3 scripts/cenarios/inicio_forja.py            (as três)
     python3 scripts/cenarios/inicio_forja.py noite      (só uma)
"""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
from gerar_cena_inicio import (  # noqa: E402  (pincéis e luz do acampamento, sem modificar o script)
    BAYER_HW, ESC, FOLHA_ARBUSTO, FOLHA_DOSSEL, FOLHA_MEIO, GX, GXa, GY, GYa, H, W, XA, YA, CASCA, Camada,
    ampliar, copa, desfocar, desfocar_rgba, elipse, hexa, luz_em_degraus, luz_pontual, pal, poli, projetar_sombra,
    ruido, ruido_ret, sobre, suave, tronco,
)

PASTA = RAIZ / "public" / "pixel" / "inicio"
FOGO = (240, 146)                     # centro da base da chama (o sprite animado ocupa x 220-260, y 104-152)
LIVRE = {"fogo": (220, 104, 260, 152), "esqueleto": (262, 96, 308, 163)}
CHAO_Y = 132                          # onde a parede do fundo encontra o piso
ABERTO_X = 398                        # daqui para a direita a parede do fundo é aberta para a mata
HORIZONTE = 60                        # altura dos olhos (perspectiva do piso)
JANELA = (314, 352, 21, 80)           # vão da janela (x0, x1, y_topo_do_arco, y_peitoril)
LAMPIAO = (381, 47)

PERIODOS = {
    "manha": dict(
        ceu=("#5f9ad6", "#a8d0ec", "#f4ecd2"), amb="#8ea6c8", amb_k=0.5, ceu_k=0.55, sol="#ffe2a8", sol_k=1.5,
        fogo_k=0.95, em_k=1.0, lamp_k=0.0, fora_k=(1.0, 1.0, 1.0), luz_fora=(-0.6, -0.8), nevoa="#cfe0e4",
        quente="#ffe8c0", fria="#28466a"),
    "tarde": dict(
        ceu=("#4c4f92", "#e2906c", "#ffd690"), amb="#a088b8", amb_k=0.42, ceu_k=0.5, sol="#ffaa5a", sol_k=1.65,
        fogo_k=1.05, em_k=1.1, lamp_k=0.35, fora_k=(1.08, 0.9, 0.74), luz_fora=(0.9, -0.42), nevoa="#f2b88e",
        quente="#ffd49a", fria="#36285a"),
    "noite": dict(
        ceu=("#03081a", "#0c1838", "#1f2d5a"), amb="#3a4c94", amb_k=0.15, ceu_k=0.35, sol="#8aa6ff", sol_k=0.55,
        fogo_k=1.45, em_k=1.5, lamp_k=1.0, fora_k=(0.3, 0.38, 0.68), luz_fora=(0.25, -0.95), nevoa="#1a2850",
        quente="#ffcf8a", fria="#0a1532"),
}

# Paletas (escuro -> claro). A luz entra depois, na montagem.
PEDRA_P = pal("#1c1916", "#2a2520", "#3a332b", "#4a4136", "#5b5042", "#6d604f", "#80725e", "#958670")
PEDRA_ARCO = pal("#2a2622", "#3e3830", "#554c40", "#6c6050", "#857660", "#9e8e74", "#b6a688")
TIJOLO = pal("#24120c", "#3a1c12", "#542818", "#6e3420", "#88432a", "#a05434", "#b86a42")
REBOCO = pal("#1c1712", "#2a231b", "#3a3026", "#4c4032", "#5e5040", "#72624e", "#86745c")
MADEIRA = pal("#1a100a", "#2a1a10", "#3c2616", "#50341e", "#664428", "#7e5634", "#986a42", "#b08050")
FERRO = pal("#0c0d10", "#16181d", "#22252c", "#30343d", "#424752", "#5a606c", "#7a808c", "#a4aab4", "#d4d8de")
ACO = pal("#1e2228", "#343a44", "#4e5662", "#6c7682", "#909aa6", "#b8c0ca", "#e2e8ee")
COURO = pal("#1e100a", "#30190e", "#462514", "#5e331c", "#784426", "#925634", "#a86a42")
SACO = pal("#2a2016", "#3c2e1e", "#504028", "#665234", "#7c6642", "#927a52", "#a88e64")
CARVAO = pal("#0c0b0b", "#151313", "#1e1b1a", "#282423", "#34302e", "#423d3a")
GRAMA = pal("#14281a", "#1c3a1e", "#284e24", "#36602a", "#467230", "#588436", "#6c963e", "#84a846")


def h2(*v: int) -> float:
    """Hash determinístico 0..1 de inteiros (para tons de bloco, tijolo, laje)."""
    n = 0x9E3779B1
    for k in v:
        n = (n ^ (int(k) * 0x85EBCA6B + 0x632BE5AB)) * 0xC2B2AE35 & 0xFFFFFFFF
        n ^= n >> 15
    return (n & 0xFFFF) / 65535


def hmap(a: np.ndarray, b: np.ndarray, s: int = 0) -> np.ndarray:
    """Hash vetorizado 0..1 de duas grades inteiras."""
    n = (a.astype(np.int64) * 73856093) ^ (b.astype(np.int64) * 19349663) ^ (s * 83492791)
    n = (n ^ (n >> 13)) * 1274126177
    n = n ^ (n >> 16)
    return (n & 0xFFFF).astype(np.float32) / 65535


def tom(paleta: np.ndarray, v) -> np.ndarray:
    return paleta[np.clip(np.floor(v).astype(int), 0, len(paleta) - 1)]


def ret(x0, y0, x1, y1) -> np.ndarray:
    return (XA >= x0) & (XA < x1) & (YA >= y0) & (YA < y1)


# ─────────────────────────────── Lá fora: céu, mata e chão ───────────────────────────────
def pintar_fora(nome: str, per: dict) -> tuple[np.ndarray, Camada]:
    """O que se vê pela janela e pela lateral aberta (sai desfocado: é o fundo)."""
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    t = np.clip(YA / 96, 0, 1)[:, :, None]
    ceu = np.where(t < 0.5, topo * (1 - t * 2) + meio * t * 2, meio * (2 - t * 2) + horiz * (t * 2 - 1)).astype(np.float32)
    nuvem = ruido_ret(7, 26, 5) * 0.65 + ruido_ret(8, 8, 3) * 0.35
    faixa = np.exp(-((YA - 40) / 18) ** 2)
    v = (nuvem - 0.5) * 2.2 * faixa
    k = np.clip(v * 3, 0, 0.8)[:, :, None]
    cn = {"manha": "#ffffff", "tarde": "#ffd0a0", "noite": "#2a3a6a"}[nome]
    cs = {"manha": "#c0d4ea", "tarde": "#a86a88", "noite": "#121c3c"}[nome]
    sombra_n = (np.roll(nuvem, -2, axis=0) - 0.5) * 2.2 * faixa < v - 0.04
    ceu = ceu * (1 - k) + np.where(sombra_n[:, :, None], hexa(cn), hexa(cs)) * k
    if nome == "manha":
        d = np.hypot(XA - 470, YA + 40)
        ceu += (np.exp(-d / 120) * 0.5)[:, :, None] * hexa("#fff4d8")
    elif nome == "tarde":
        d = np.hypot(XA - 428, (YA - 88) * 1.2)
        ceu += (np.exp(-d / 60) * 1.0 + np.exp(-d / 6) * 2.2)[:, :, None] * hexa("#ffd890")
    else:
        g = np.random.default_rng(3)
        for _ in range(170):
            x, y = int(g.random() * W), int(g.random() * 96)
            ceu[y, x] += (0.3 + g.random() ** 2 * 0.9) * hexa("#e8eeff")
        ax, ay = 340, 44
        for y in range(ay - 7, ay + 8):
            for x in range(ax - 7, ax + 8):
                dd = math.hypot(x - ax, y - ay)
                if dd < 5.6:
                    cr = (x - ax + 2) ** 2 + (y - ay + 1) ** 2 < 3 or (x - ax - 1) ** 2 + (y - ay - 2) ** 2 < 2
                    ceu[y, x] = hexa("#c8d2f0") if cr or dd > 4.8 else hexa("#f4f6ff")
        d = np.hypot(XA - ax, YA - ay)
        ceu += (np.exp(-d / 16) * 0.35)[:, :, None] * hexa("#9ab0f0")

    c = Camada()
    luz = per["luz_fora"]
    noite = nome == "noite"
    # morros longe
    n = ruido(51, 20)[0] * 8 + ruido(52, 6)[0] * 3
    for x in range(W):
        y1 = int(70 + 5 * math.sin(x / 37) + n[x])
        c.ret(x, y1, 1, H - y1, "#7f98b8" if not noite else "#18244a")
        c.p(x, y1, "#a8bcd6" if not noite else "#24345e")
    # chão da clareira lá fora (perspectiva: sobe até a mata)
    chao = (YA > 92)
    gv = ruido(55, 3) * 0.6 + ruido(56, 9) * 0.4
    prof = np.clip((YA - 92) / 40, 0, 1)
    c.mascara(chao, tom(GRAMA, 2 + prof * 3 + (gv - 0.5) * 2.4 + BAYER_HW * 0.6))
    # trilha de terra saindo da porta
    trilha = chao & (np.abs(XA - (440 - (132 - YA) * 0.9)) < 4 + (YA - 92) * 0.35)
    c.mascara(trilha, tom(pal("#3a2a1c", "#584030", "#74583e", "#8e6e4c", "#a8865c"), 1.5 + gv * 2.5 + BAYER_HW * 0.5))
    # mata: fileira de copas e troncos
    for i, (cx, cy, r) in enumerate(((300, 72, 18), (330, 66, 20), (356, 74, 16), (384, 64, 22), (402, 74, 12),
                                     (458, 66, 18), (482, 60, 22), (266, 78, 14))):
        tronco(c, cx + 2, cy, 98, 3, luz, seed=300 + i, musgo=0.3, raizes=2, paleta=CASCA[:6])
        copa(c, cx, cy, r, FOLHA_MEIO, luz, seed=310 + i, dens=0.7, brilho=0.05 if not noite else -0.25)
    for i, (cx, cy, r) in enumerate(((404, 98, 8), (452, 100, 10), (474, 96, 11), (330, 94, 9), (360, 98, 10))):
        copa(c, cx, cy, r, FOLHA_ARBUSTO, luz, seed=330 + i, dens=0.75, achatar=0.6, escuro=0.1 if not noite else 0.5)
    # uma árvore grande perto, à direita da abertura
    tronco(c, 466, 20, 126, 8, luz, seed=341, musgo=0.6, raizes=3)
    copa(c, 466, 10, 28, FOLHA_DOSSEL, luz, seed=342, dens=0.65)
    copa(c, 420, 4, 20, FOLHA_DOSSEL, luz, seed=343, dens=0.65)
    # flores no capim lá fora
    g = np.random.default_rng(57)
    for _ in range(40):
        x, y = 400 + g.random() * 80, 104 + g.random() * 28
        c.p(x, y, ["#f0e6c8", "#e8c040", "#b8c8f0", "#e07a6a"][int(g.random() * 4)])
    return ceu, c


# ─────────────────────────────── Teto, parede e janela ───────────────────────────────
def mascara_janela() -> np.ndarray:
    x0, x1, yt, yb = JANELA
    r = (x1 - x0) / 2
    cx, cy = (x0 + x1) / 2, yt + r
    return (ret(x0, cy, x1, yb)) | (((XA + 0.5 - cx) ** 2 + (YA + 0.5 - cy) ** 2 <= r * r) & (YA < cy))


def grades_janela() -> np.ndarray:
    """As barras de ferro da janela (só verticais e uma travessa baixa)."""
    m = (np.abs(XA - 326.5) < 1) | (np.abs(XA - 339.5) < 1) | (np.abs(YA - 66.5) < 1)
    return m & mascara_janela()


def blocos_parede(x0: int, x1: int, y0: int, y1: int, seed: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Mapa de blocos de pedra aparelhada: id do bloco, posição relativa no bloco (u, v) e argamassa."""
    g = np.random.default_rng(seed)
    bid = np.full((H, W), -1, np.int32)
    u = np.zeros((H, W), np.float32)
    v = np.zeros((H, W), np.float32)
    y = y0
    k = 0
    while y < y1:
        hh = int(g.integers(6, 10))
        x = x0 - int(g.integers(0, 12))
        while x < x1:
            ww = int(g.integers(9, 19))
            xa, xb, ya, yb = max(x, x0), min(x + ww, x1), y, min(y + hh, y1)
            if xb > xa:
                bid[ya:yb, xa:xb] = k
                u[ya:yb, xa:xb] = (np.arange(xa, xb) - x)[None, :] / ww
                v[ya:yb, xa:xb] = (np.arange(ya, yb) - y)[:, None] / hh
            x += ww
            k += 1
        y += hh
    arg = np.zeros((H, W), bool)
    arg[1:, :] |= bid[1:, :] != bid[:-1, :]
    arg[:, 1:] |= bid[:, 1:] != bid[:, :-1]
    return bid, u, v, arg


def pintar_parede(nome: str) -> Camada:
    c = Camada()
    # parede de pedra
    bid, u, v, arg = blocos_parede(0, ABERTO_X, 18, CHAO_Y, 11)
    area = ret(0, 18, ABERTO_X, CHAO_Y) & ~mascara_janela()
    ht = hmap(bid, bid * 7 + 3, 1)
    tex = ruido(21, 2.2) * 0.6 + ruido(22, 6) * 0.4
    tv = 2.6 + ht * 2.2 + (tex - 0.5) * 1.6
    tv += np.where(v < 0.2, 0.9, 0) + np.where(u < 0.12, 0.4, 0) - np.where(v > 0.8, 0.9, 0) - np.where(u > 0.9, 0.5, 0)
    lasca = (ruido(23, 1.3) > 0.82) & (ht > 0.5)
    tv = np.where(lasca, tv - 1.4, tv)
    # fuligem: mais escura no alto e em volta da coifa
    fuligem = np.exp(-((XA - 240) / 46) ** 2) * suave(110, 30, YA) * 1.8 + suave(70, 18, YA) * 0.9
    tv -= fuligem
    c.mascara(area, tom(PEDRA_P, tv + BAYER_HW * 0.5))
    c.mascara(area & arg, tom(PEDRA_P, 0.6 + ht * 0.6 - fuligem * 0.3))
    # reboco antigo que ainda cobre partes da parede (bordas irregulares mostrando a pedra)
    rb = (ruido(28, 16) * 0.7 + ruido(29, 4) * 0.3)
    reb = area & (rb > 0.6) & (YA < 112) & (np.abs(XA - 240) > 34)
    viz = reb & np.roll(reb, 1, 0) & np.roll(reb, -1, 0) & np.roll(reb, 1, 1) & np.roll(reb, -1, 1)
    c.mascara(reb, tom(REBOCO, 3.6 + (tex - 0.5) * 1.6 + (rb - 0.6) * 4 - fuligem * 1.2 + BAYER_HW * 0.5))
    c.mascara(reb & ~viz, REBOCO[1])
    c.mascara(reb & ~np.roll(reb, -1, 0) & viz, REBOCO[0])
    # rodapé de pedras maiores, mais escuras, e umidade
    rod = ret(0, CHAO_Y - 5, ABERTO_X, CHAO_Y)
    c.mascara(rod & ~arg, tom(PEDRA_P, 1.6 + tex * 1.6 + BAYER_HW * 0.5))
    # rachaduras
    g = np.random.default_rng(24)
    for _ in range(14):
        x, y = g.random() * 380, 30 + g.random() * 90
        for s in range(int(4 + g.random() * 7)):
            x += g.integers(-1, 2)
            y += 1
            c.p(x, y, PEDRA_P[0])
    # janela: moldura de pedra (aduelas), peitoril e vão
    x0, x1, yt, yb = JANELA
    r = (x1 - x0) / 2
    cx, cy = (x0 + x1) / 2, yt + r
    d = np.hypot(XA + 0.5 - cx, YA + 0.5 - cy)
    aro = (d > r) & (d <= r + 4) & (YA < cy)
    ombro = ((XA >= x0 - 4) & (XA < x0) | (XA >= x1) & (XA < x1 + 4)) & (YA >= cy) & (YA < yb)
    ang = np.arctan2(YA + 0.5 - cy, XA + 0.5 - cx)
    adu = np.floor((ang + math.pi) / (math.pi / 9)).astype(int)
    juntas_a = aro & (np.abs(((ang + math.pi) / (math.pi / 9)) % 1) < 0.12)
    c.mascara(aro, tom(PEDRA_ARCO, 3 + hmap(adu, adu, 4) * 2 + (d - r) * 0.4 + BAYER_HW * 0.4))
    c.mascara(juntas_a, PEDRA_ARCO[0])
    oy = np.floor((YA - cy) / 7).astype(int)
    c.mascara(ombro, tom(PEDRA_ARCO, 3 + hmap(oy, (XA > cx).astype(int), 5) * 2 - (XA >= x1) * 0.8 + BAYER_HW * 0.4))
    c.mascara(ombro & ((YA - cy) % 7 < 0.9), PEDRA_ARCO[0])
    # peitoril que sai da parede
    c.ret(x0 - 6, yb, x1 - x0 + 12, 1, PEDRA_ARCO[6])
    c.ret(x0 - 6, yb + 1, x1 - x0 + 12, 2, PEDRA_ARCO[3])
    c.ret(x0 - 5, yb + 3, x1 - x0 + 10, 1, PEDRA_ARCO[0])
    # espessura da parede no vão (lado esquerdo iluminado pelo céu)
    m = mascara_janela()
    esp = m & ((XA < x0 + 2) | (YA > yb - 2))
    c.mascara(esp, PEDRA_ARCO[2])
    # barras de ferro
    gr = grades_janela()
    c.mascara(gr, FERRO[2])
    c.mascara(gr & ((XA == 326) | (XA == 339) | (YA == 66)), FERRO[4])
    # postigo de madeira aberto à direita (em perspectiva)
    for x in range(x1 + 4, x1 + 13):
        tt = (x - x1 - 4) / 9
        ya, yb2 = cy - 6 + tt * -4, yb + 2 + tt * 3
        for y in range(int(ya), int(yb2)):
            tabua = (x - x1 - 4) % 3 == 0
            c.p(x, y, MADEIRA[2 if tabua else 4 - (y % 9 == 0)])
        c.p(x, ya, MADEIRA[6])
    for yy in (cy + 2, yb - 6):
        c.ret(x1 + 4, yy, 9, 1, FERRO[3])
    # teto: tábuas e caibros
    tet = ret(0, 0, W, 11)
    tab = np.floor(XA / 14 + np.floor(YA / 4) * 0.37)
    c.mascara(tet, tom(MADEIRA, 1.2 + hmap(tab, np.floor(YA / 4), 6) * 1.2 + ruido_ret(25, 8, 1) * 0.8 + BAYER_HW * 0.4))
    c.mascara(tet & ((YA % 4) < 0.7), MADEIRA[0])
    for xc in range(-10, W + 20, 46):
        for y in range(0, 11):
            for dx in range(5):
                c.p(xc + dx, y, MADEIRA[[1, 3, 3, 2, 1][dx]])
    # viga grossa com veios e pregos
    vig = ret(0, 10, W, 19)
    veio = ruido_ret(26, 18, 1.2)
    vy = YA - 10
    c.mascara(vig, tom(MADEIRA, 3.2 + (veio - 0.5) * 2.4 + np.where(vy < 1.5, 1.6, 0) - np.where(vy > 7, 1.6, 0) + BAYER_HW * 0.5))
    for x in range(14, W, 38):
        c.p(x, 13, FERRO[5])
        c.p(x, 16, FERRO[3])
    # esteios de madeira: um à esquerda e o da abertura à direita
    for (xa, larg) in ((104, 6), (ABERTO_X - 8, 8)):
        for y in range(18, CHAO_Y + 2):
            for dx in range(larg):
                uu = dx / (larg - 1)
                vv = veio[y, (xa + dx * 3) % W]
                c.p(xa + dx, y, tom(MADEIRA, 2.5 + (0.6 - abs(uu - 0.35)) * 3 + (vv - 0.5) * 2))
        c.ret(xa - 1, 18, larg + 2, 2, MADEIRA[1])
        # mão-francesa
        for s in range(10):
            c.p(xa + larg + s, 19 + s, MADEIRA[3])
            c.p(xa + larg + s, 20 + s, MADEIRA[2])
            c.p(xa - 1 - s, 19 + s, MADEIRA[3])
            c.p(xa - 1 - s, 20 + s, MADEIRA[2])
    # beiral do telhado visto por dentro, sobre a abertura, e uma trepadeira caindo
    for x in range(ABERTO_X - 2, W):
        for y in range(18, 25 + (x % 7 == 0)):
            c.p(x, y, MADEIRA[1 if y > 21 else 2])
        c.p(x, 18, MADEIRA[4])
    g = np.random.default_rng(29)
    for k in range(9):
        x = ABERTO_X + 6 + k * 9 + g.integers(-2, 3)
        comp = 6 + int(g.random() * 16)
        for j in range(comp):
            xx = x + int(math.sin(j * 0.5 + k) * 1.2)
            c.p(xx, 24 + j, ["#1e3a1a", "#2c5224", "#3e6e2c", "#5a8a38"][int(g.random() * 4)])
            if j % 3 == 0:
                c.p(xx + 1, 24 + j, "#4a7a30")
    # ganchos com tenazes e argolas pendurados no beiral (silhueta contra o céu)
    for (x, comp, tipo) in ((408, 22, 0), (418, 14, 1), (431, 26, 0), (444, 10, 1)):
        for y in range(24, 24 + comp):
            c.p(x, y, FERRO[3] if y % 3 else FERRO[1])
        if tipo == 0:
            c.linha(x - 1, 24 + comp, x - 3, 24 + comp + 12, FERRO[2])
            c.linha(x + 1, 24 + comp, x + 3, 24 + comp + 12, FERRO[1])
            c.p(x, 24 + comp, FERRO[4])
        else:
            for a in range(16):
                ang = a / 16 * math.tau
                c.p(x + round(math.cos(ang) * 3), 27 + comp + round(math.sin(ang) * 3), FERRO[2])
    # soleira da abertura
    c.ret(ABERTO_X, CHAO_Y - 2, W - ABERTO_X, 2, MADEIRA[4])
    c.ret(ABERTO_X, CHAO_Y, W - ABERTO_X, 1, MADEIRA[1])
    return c


# ─────────────────────────────── Objetos da parede ───────────────────────────────
def painel_implantes(c: Camada) -> None:
    """Tábua com pinos e as peças de ortopedia em ferro penduradas (placas, parafusos, haste, fios, placa em T)."""
    x0, y0, x1, y1 = 270, 34, 305, 90
    for y in range(y0, y1):
        for x in range(x0, x1):
            tab = (x - x0) // 7
            vv = ruido_ret(27, 1.5, 9)[y, x * 2 % W]
            c.p(x, y, MADEIRA[int(np.clip(3 + (vv - 0.5) * 2.4 + (1 if (x - x0) % 7 == 0 else 0) * -1.5, 1, 5))])
    c.ret(x0 - 1, y0 - 1, x1 - x0 + 2, 2, MADEIRA[5])
    c.ret(x0 - 1, y1 - 1, x1 - x0 + 2, 2, MADEIRA[1])
    c.ret(x0 - 1, y0, 1, y1 - y0, MADEIRA[5])
    c.ret(x1, y0, 1, y1 - y0, MADEIRA[1])

    def metal(x, y, n, borda_esq=True):
        c.p(x, y, ACO[n])

    # duas placas retas com furos
    for (px, comp) in ((274, 30), (279, 24)):
        c.p(px + 1, 38, FERRO[6])
        for y in range(40, 40 + comp):
            c.p(px, y, ACO[5])
            c.p(px + 1, y, ACO[4])
            c.p(px + 2, y, ACO[2])
            if (y - 42) % 4 == 0 and 42 <= y < 38 + comp:
                c.p(px + 1, y, FERRO[0])
                c.p(px + 1, y - 1, ACO[1])
        c.p(px, 40, ACO[6])
    # haste longa com a ponta curva
    for y in range(38, 86):
        c.p(285, y, ACO[5])
        c.p(286, y, ACO[3])
        c.p(287, y, ACO[1])
    c.p(285, 37, FERRO[6])
    for i, (dx, dy) in enumerate(((1, 86), (2, 87), (2, 88))):
        c.p(285 + dx, dy, ACO[3])
    c.p(286, 50, FERRO[0])
    c.p(286, 76, FERRO[0])
    # parafusos (cabeça e rosca)
    for i, px in enumerate((291, 295, 299)):
        comp = 11 - i * 2
        c.p(px, 40, FERRO[6])
        c.ret(px - 1, 41, 3, 2, ACO[5])
        c.p(px + 1, 42, ACO[2])
        c.p(px, 41, FERRO[1])
        for y in range(43, 43 + comp):
            c.p(px, y, ACO[4] if y % 2 else ACO[2])
            c.p(px - 1 if y % 2 else px + 1, y, ACO[3])
        c.p(px, 43 + comp, ACO[1])
    # feixe de fios finos
    for i in range(5):
        c.linha(290 + i, 60, 289 + i * 2, 86, ACO[5 - (i % 3)])
    c.ret(289, 61, 7, 1, "#8a3a20")
    # placa em T
    for y in range(58, 82):
        for x in range(297, 300):
            c.p(x, y, ACO[[5, 4, 2][x - 297]])
    for x in range(293, 304):
        for y in range(58, 61):
            c.p(x, y, ACO[[6, 4, 2][y - 58]])
    for (x, y) in ((295, 59), (298, 59), (301, 59), (298, 65), (298, 70), (298, 75)):
        c.p(x, y, FERRO[0])
    # pinos de madeira
    for (x, y) in ((275, 37), (280, 37), (286, 36), (291, 39), (295, 39), (299, 39), (292, 59), (298, 56)):
        c.p(x, y, MADEIRA[6])


def porta_ferramentas(c: Camada) -> None:
    """Ripa com martelos e tenazes pendurados, do lado do texto (fica escuro e calmo)."""
    c.ret(114, 46, 50, 3, MADEIRA[4])
    c.ret(114, 46, 50, 1, MADEIRA[6])
    c.ret(114, 48, 50, 1, MADEIRA[1])
    # martelos (cabo para cima)
    for (x, comp, cab) in ((118, 26, 5), (128, 20, 4), (160, 24, 5)):
        c.ret(x, 47, 1, comp, MADEIRA[5])
        c.ret(x + 1, 47, 1, comp, MADEIRA[3])
        c.ret(x - cab // 2 - 1, 47 + comp, cab + 3, 4, FERRO[4])
        c.ret(x - cab // 2 - 1, 47 + comp, cab + 3, 1, FERRO[6])
        c.ret(x - cab // 2 - 1, 50 + comp, cab + 3, 1, FERRO[2])
    # tenazes (duas hastes que se cruzam e o bico)
    for (x, comp) in ((138, 40), (148, 36)):
        c.linha(x, 49, x + 3, 49 + comp * 0.7, FERRO[5])
        c.linha(x + 4, 49, x + 1, 49 + comp * 0.7, FERRO[3])
        c.p(x + 2, 49 + comp * 0.48, FERRO[6])
        c.linha(x + 3, 49 + comp * 0.7, x + 3, 49 + comp, FERRO[4])
        c.linha(x + 1, 49 + comp * 0.7, x, 49 + comp, FERRO[3])
    for x in (118, 128, 140, 150, 161):
        c.p(x, 45, FERRO[6])


def prateleira(c: Camada) -> None:
    """Prateleira à direita da janela: caixas de parafusos, um pote e placas empilhadas."""
    c.ret(360, 98, 30, 2, MADEIRA[5])
    c.ret(360, 100, 30, 1, MADEIRA[1])
    for x in (363, 386):
        c.linha(x, 101, x, 106, FERRO[3])
        c.linha(x, 106, x - 3, 101, FERRO[2])
    # caixa de madeira com parafusos brilhando
    c.ret(362, 91, 10, 7, MADEIRA[4])
    c.ret(362, 91, 10, 1, MADEIRA[6])
    c.ret(362, 94, 10, 1, MADEIRA[2])
    for x in range(363, 371, 2):
        c.p(x, 90, ACO[5])
    # pote de barro
    for y in range(89, 98):
        w = 3 + (1 if 91 < y < 96 else 0)
        for x in range(376 - w, 376 + w):
            c.p(x, y, pal("#3a2014", "#5a3420", "#7a4a2c", "#9a6038")[int(np.clip(3 - (x - 376 + w) * 0.5 + (y < 91), 0, 3))])
    c.ret(374, 88, 4, 1, "#2a160c")
    # placas empilhadas
    for i in range(4):
        c.ret(380 + (i % 2), 97 - i, 9, 1, ACO[2 + i])


# ─────────────────────────────── Objetos do chão ───────────────────────────────
class Objetos:
    """Objetos numa camada, guardando a linha do chão de cada um (para as sombras projetadas)."""

    def __init__(self) -> None:
        self.cam = Camada()
        self.base = np.full((H, W), -1, dtype=np.float32)

    def add(self, base: float, fn, *args) -> None:
        t = Camada()
        fn(t, *args)
        self.cam.juntar(t)
        self.base[t.c[:, :, 3] > 0.4] = base


def fornalha(c: Camada, e: Camada) -> None:
    """A fornalha de tijolo com o arco de pedra, a coifa, a chaminé e o leito de brasas (sem chama)."""
    fx, fy = FOGO
    # coifa (trapézio de reboco e pedra) e chaminé
    coifa = poli([(186, 93), (278, 93), (266, 50), (214, 50)])
    chamine = ret(216, 0, 264, 51)
    tex = ruido(31, 2) * 0.6 + ruido(32, 7) * 0.4
    lado = (XA - 240) / 46
    fuligem = np.exp(-((XA - 240) / 16) ** 2) * suave(96, 56, YA)
    tv = 4.0 + (tex - 0.5) * 1.6 - np.maximum(lado, 0) * 1.4 + np.minimum(lado, 0) * 0.3 - fuligem * 2.0 \
        - suave(60, 10, YA) * 0.8 + suave(70, 92, YA) * 0.6
    c.mascara(coifa | chamine, tom(REBOCO, tv + BAYER_HW * 0.5))
    # chaminé de tijolo (fuligem por cima) e as arestas da coifa em pedra
    lc = np.floor(YA / 4).astype(int)
    oc = (lc % 2) * 4
    cc = np.floor((XA - 216 + oc) / 8).astype(int)
    ac = (YA % 4 < 1) | ((XA - 216 + oc) % 8 < 1)
    tc = 2.6 + hmap(lc, cc, 3) * 1.8 - np.abs(XA - 236) / 30 - suave(20, 0, YA) * 0.8
    c.mascara(chamine & ~ac, tom(TIJOLO, tc + BAYER_HW * 0.5))
    c.mascara(chamine & ac, tom(REBOCO, 0.8 + hmap(lc, cc, 4)))
    for (xa, sinal) in ((216, 1), (262, -1)):
        c.ret(xa, 0, 2, 51, PEDRA_ARCO[4 if sinal > 0 else 1])
    # placas de reboco caídas mostrando tijolo na coifa
    for (bx, by, bw, bh) in ((224, 62, 9, 5), (252, 70, 7, 4), (204, 80, 8, 4)):
        for y in range(by, by + bh):
            for x in range(bx, bx + bw):
                if coifa[y, x] and h2(x, y) > 0.15:
                    c.p(x, y, REBOCO[1] if (y % 3 == 0 or (x + (y // 3) * 3) % 6 == 0) else TIJOLO[2])
        c.ret(bx, by - 1, bw, 1, REBOCO[6])
    # cinta de ferro com rebites na chaminé e beirais
    c.ret(214, 30, 52, 3, FERRO[3])
    c.ret(214, 30, 52, 1, FERRO[5])
    for x in range(218, 264, 6):
        c.p(x, 31, FERRO[7])
    c.ret(212, 49, 56, 2, PEDRA_ARCO[4])
    c.ret(212, 51, 56, 1, PEDRA_ARCO[1])
    # bordas da coifa (arestas)
    c.linha(186, 93, 214, 50, REBOCO[5])
    c.linha(278, 93, 266, 50, REBOCO[1])
    # verga de madeira grossa embaixo da coifa, com cintas de ferro e cravos
    vg = ret(183, 86, 281, 95)
    vv = ruido_ret(36, 16, 1.1)
    c.mascara(vg, tom(MADEIRA, 3.4 + (vv - 0.5) * 2.4 + (YA < 87.5) * 1.8 - (YA > 92.5) * 1.8 + BAYER_HW * 0.5))
    c.ret(183, 86, 98, 1, MADEIRA[7])
    c.ret(183, 94, 98, 1, MADEIRA[0])
    for x in (192, 238, 270):
        c.ret(x, 86, 3, 9, FERRO[3])
        c.ret(x, 86, 1, 9, FERRO[5])
        c.p(x + 1, 88, FERRO[7])
        c.p(x + 1, 92, FERRO[7])
    # o que fica em cima da verga: tenaz, um rolo de arame e duas placas prontas
    c.linha(196, 85, 214, 83, FERRO[4])
    c.linha(196, 84, 214, 84, FERRO[2])
    for k in range(5):
        c.p(256 + k, 85 - (k % 2), ACO[3])
        c.p(256 + k, 83 + (k % 2), ACO[5])
    c.ret(268, 84, 8, 2, ACO[4])
    c.ret(268, 84, 8, 1, ACO[6])
    c.p(271, 85, FERRO[0])
    # corpo de tijolo
    corpo = ret(196, 95, 268, 151)
    tx = XA - 196
    lin = np.floor((YA - 95) / 4).astype(int)
    off = (lin % 2) * 4
    col = np.floor((tx + off) / 8).astype(int)
    arg = ((YA - 95) % 4 < 1) | ((tx + off) % 8 < 1)
    tb = hmap(lin, col, 7)
    tvb = 3.0 + tb * 2.0 + (ruido(35, 1.6) - 0.5) * 1.4 + (((YA - 95) % 4) < 2) * 0.6
    tvb -= np.abs(XA - 232) / 36 * 0.8 + suave(120, 95, YA) * 1.2
    c.mascara(corpo & ~arg, tom(TIJOLO, tvb + BAYER_HW * 0.5))
    c.mascara(corpo & arg, tom(REBOCO, 1.2 + tb))
    # quinas de pedra do corpo
    for (xa, xb) in ((196, 200), (264, 268)):
        for k in range(14):
            ya = 95 + k * 4
            w = 4 if k % 2 == 0 else 3
            xx = xa if xa == 196 else xb - w
            c.ret(xx, ya, w, 4, PEDRA_ARCO[3 + (k % 2)])
            c.ret(xx, ya, w, 1, PEDRA_ARCO[5])
            c.ret(xx, ya + 3, w, 1, PEDRA_ARCO[1])
    # boca: arco de pedra (aduelas) com fecho
    cx, cy, rx, ry = 240, 113, 22, 16
    dn = np.sqrt(((XA + 0.5 - cx) / rx) ** 2 + ((YA + 0.5 - cy) / ry) ** 2)
    boca = ((dn <= 1) & (YA < cy)) | ret(cx - rx, cy, cx + rx, 151)
    anel = (dn > 1) & (dn <= 1.28) & (YA < cy + 1)
    ang = np.arctan2(YA + 0.5 - cy, (XA + 0.5 - cx) * ry / rx)
    adu = np.floor((ang + math.pi) / (math.pi / 11)).astype(int)
    jun = anel & (np.abs(((ang + math.pi) / (math.pi / 11)) % 1) < 0.1)
    c.mascara(anel, tom(PEDRA_ARCO, 3.2 + hmap(adu, adu, 8) * 1.6 + (1.28 - dn) * 3 + BAYER_HW * 0.4))
    c.mascara(jun, PEDRA_ARCO[0])
    fecho = anel & (np.abs(XA - cx) < 3)
    c.mascara(fecho, tom(PEDRA_ARCO, 5 - (dn - 1) * 6 + BAYER_HW * 0.3))
    # ombreiras (pedras grandes dos lados da boca)
    for (xa, xb) in ((cx - rx - 4, cx - rx), (cx + rx, cx + rx + 4)):
        for k in range(5):
            ya = cy + k * 8
            c.ret(xa, ya, 4, 8, PEDRA_ARCO[3 + (k % 2)])
            c.ret(xa, ya, 4, 1, PEDRA_ARCO[5])
            c.ret(xa, ya + 7, 4, 1, PEDRA_ARCO[0])
            c.p(xa + (1 if xa < cx else 2), ya + 3, PEDRA_ARCO[2])
    # interior da boca: paredes laterais em perspectiva e fundo incandescente
    prof = np.clip((np.abs(XA + 0.5 - cx) - (rx - 5)) / 5, 0, 1)
    fundo = boca & (prof <= 0)
    lados = boca & (prof > 0)
    lin2 = np.floor((YA - 100) / 3).astype(int)
    off2 = (lin2 % 2) * 3
    tij = ((YA - 100) % 3 < 0.8) | ((XA + off2) % 6 < 0.8)
    c.mascara(fundo, tom(TIJOLO, 1.4 + hmap(lin2, np.floor((XA + off2) / 6).astype(int), 9) * 1.2 - tij * 1.0))
    c.mascara(lados, tom(TIJOLO, 2.2 + prof * 1.6 - ((YA % 3) < 0.8) * 1.0))
    c.mascara(boca & (YA < 104) & (dn > 0.75), CARVAO[1])        # fuligem no intradorso
    calor = boca * np.clip((YA - 100) / 50, 0, 1) ** 1.6 * (1 - 0.35 * prof)
    e.mascara(boca & (calor > 0.05), np.stack([calor * 1.0, calor * 0.42, calor * 0.12], -1).astype(np.float32),
              0.5)
    # leito de carvão em brasa (onde a chama nasce, y 143-151)
    g = np.random.default_rng(37)
    for _ in range(260):
        x = cx + (g.random() - 0.5) * 2 * (rx - 1)
        alt = 4 + 5 * math.exp(-((x - cx) / 13) ** 2)
        y = 151 - g.random() * alt
        k = int(g.random() * 4)
        tam = 1 + (g.random() < 0.5)
        for dx in range(tam):
            for dy in range(tam):
                c.p(x + dx, y + dy, CARVAO[min(5, k + (dy == 0) * 2)])
        quente = math.exp(-((x - cx) / 15) ** 2) * (0.4 + 0.6 * g.random())
        if g.random() < 0.55:
            cor = "#ffe08a" if quente > 0.75 else "#ffa030" if quente > 0.45 else "#e8501a"
            e.p(x, y + tam - 1, cor, min(1, 0.4 + quente))
    # soleira de pedra (a base onde a chama nasce) e cinza caída
    c.ret(214, 151, 52, 2, PEDRA_ARCO[6])
    c.ret(214, 153, 52, 3, PEDRA_ARCO[3])
    c.ret(214, 156, 52, 1, PEDRA_ARCO[0])
    for x in range(214, 266, 9):
        c.ret(x, 153, 1, 3, PEDRA_ARCO[1])
    for x in range(219, 262):
        if h2(x, 5) < 0.6:
            e.p(x, 151, "#ff7a2a", 0.25 + 0.5 * math.exp(-((x - cx) / 14) ** 2))
    # base de pedra do corpo (dos lados da soleira)
    for (xa, xb) in ((194, 214), (266, 270)):
        c.ret(xa, 151, xb - xa, 6, PEDRA_P[4])
        c.ret(xa, 151, xb - xa, 1, PEDRA_P[6])
        c.ret(xa, 156, xb - xa, 1, PEDRA_P[1])
    # pedaços de carvão e cinza no chão em frente
    for _ in range(26):
        x, y = 214 + g.random() * 52, 157 + g.random() * 3
        c.p(x, y, CARVAO[int(g.random() * 4)] if g.random() < 0.7 else "#5a524c")
    # ganchos com uma tenaz pendurada na coifa
    c.linha(204, 72, 204, 75, FERRO[5])
    c.linha(203, 75, 207, 88, FERRO[4])
    c.linha(206, 75, 202, 88, FERRO[2])


def fole(c: Camada) -> None:
    """Fole de ferreiro visto de lado: duas tábuas em cunha unidas no bico, o couro sanfonado entre elas com as dobras
    saindo do bico, o bico de ferro entrando na fornalha, a alavanca e as correntes que o seguram na viga."""
    bx, by = 196, 103                       # dobradiça (onde as tábuas se encontram, junto do bico)
    xl = 150
    topo_y = lambda x: by - (bx - x) / (bx - xl) * 13       # tábua de cima sobe para a esquerda
    base_y = lambda x: by + (bx - x) / (bx - xl) * 6        # tábua de baixo desce menos
    # couro entre as tábuas, com dobras em leque saindo da dobradiça
    for x in range(xl + 2, bx):
        y0, y1 = int(round(topo_y(x))) + 2, int(round(base_y(x))) - 1
        for y in range(y0, y1 + 1):
            ang = math.atan2(y - by, bx - x)
            f = (ang * 9) % 1.0
            k = 3.2 if f < 0.35 else 4.4 if f < 0.55 else 1.6
            k -= (x - xl) / (bx - xl) * 0.8
            c.p(x, y, tom(COURO, k))
        c.p(x, y1 + 1, COURO[0])
    # tábuas (3 px), a de cima com a ponta larga arredondada e veio
    for x in range(xl - 4, bx + 1):
        for k, (fy, cores) in enumerate(((topo_y, (6, 4, 2)), (base_y, (4, 3, 1)))):
            yb = topo_y(max(x, xl)) if k == 0 else base_y(max(x, xl))
            if x < xl:
                yb += (xl - x) ** 2 * (0.25 if k == 0 else -0.25)
            for t in range(3):
                c.p(x, round(yb) + t, MADEIRA[cores[t] - (1 if (x * 7) % 11 == 0 and t == 1 else 0)])
    for x in range(xl + 2, bx - 6, 6):
        c.p(x, round(topo_y(x)), "#d8b060")
    # alavanca presa na ponta larga, subindo para a esquerda
    c.linha(xl - 2, round(topo_y(xl)) - 1, 134, 80, MADEIRA[5])
    c.linha(xl - 2, round(topo_y(xl)), 134, 81, MADEIRA[2])
    c.ret(131, 78, 4, 3, MADEIRA[4])
    # bico de ferro até a lateral da fornalha
    c.ret(bx - 1, by - 2, 4, 5, FERRO[3])
    c.ret(bx - 1, by - 2, 4, 1, FERRO[6])
    c.linha(bx + 2, by, 206, 117, FERRO[6])
    c.linha(bx + 3, by, 207, 117, FERRO[4])
    c.linha(bx + 3, by + 1, 207, 118, FERRO[1])
    # correntes até a viga
    for (x, yb) in ((160, int(topo_y(160))), (184, int(topo_y(184)))):
        for y in range(19, yb):
            if y % 3 != 2:
                c.p(x, y, FERRO[5] if y % 3 == 0 else FERRO[3])
            else:
                c.p(x, y, FERRO[1])


def caixote_e_sacos(c: Camada) -> None:
    """Caixote (poleiro baixo da coruja) e os sacos de carvão encostados do lado do texto."""
    # caixote
    x0, y0, x1, y1 = 157, 140, 187, 155
    for y in range(y0, y1):
        for x in range(x0, x1):
            tab = (y - y0) // 5
            vv = ruido_ret(41, 9, 1.4)[y, x]
            c.p(x, y, MADEIRA[int(np.clip(3.4 + (vv - 0.5) * 2 - ((y - y0) % 5 == 4) * 1.8 + (tab == 0) * 0.5, 0, 7))])
    c.ret(x0, y0, x1 - x0, 1, MADEIRA[6])
    for x in (x0, x1 - 3):
        c.ret(x, y0, 3, y1 - y0, MADEIRA[2])
        c.ret(x, y0, 1, y1 - y0, MADEIRA[4])
    c.linha(x0 + 3, y1 - 2, x1 - 4, y0 + 1, MADEIRA[2])
    for (x, y) in ((x0 + 1, y0 + 1), (x1 - 2, y0 + 1), (x0 + 1, y1 - 2), (x1 - 2, y1 - 2)):
        c.p(x, y, FERRO[6])
    # sacos de juta com carvão: corpo arriado, boca amarrada (ou aberta com o carvão), vincos e trama
    trama = ((XA + YA) % 2 == 0)
    for (cx, by, rx, alt, s_, aberto) in ((132, 161, 13, 24, 1, False), (151, 163, 11, 17, 2, True),
                                         (116, 163, 9, 14, 3, False)):
        tex = ruido(42 + s_, 1.6)
        g = np.random.default_rng(42 + s_)
        for y in range(by - alt, by):
            t = (by - y) / alt                       # 0 embaixo, 1 na boca
            if aberto:
                ww = rx * (1.0 - 0.15 * t ** 2)
            else:
                ww = rx * (1.05 - 0.2 * t) if t < 0.78 else rx * max(0.18, (1 - t) * 1.8)
            ww *= 1 + 0.06 * math.sin(y * 1.7 + s_)
            for x in range(int(cx - ww), int(cx + ww) + 1):
                uu = (x - cx) / max(ww, 1)
                k = 3.4 + uu * 1.4 - abs(uu) ** 4 * 1.4 + (tex[y, x] - 0.5) * 1.6 - (t < 0.12) * 1.0
                k -= 0.5 if trama[y, x] else 0
                c.p(x, y, tom(SACO, k))
        # vincos
        for v in range(3):
            x0 = cx + (g.random() - 0.5) * rx
            for j in range(int(alt * 0.5)):
                c.p(x0 + j * (0.3 - g.random() * 0.6), by - 3 - j, SACO[1])
        if aberto:
            for x in range(int(cx - rx * 0.85), int(cx + rx * 0.85) + 1):
                hh = 2 + int(2 * math.cos((x - cx) / rx * 1.4))
                for j in range(hh):
                    c.p(x, by - alt - j + 1, CARVAO[min(5, 1 + (x * 3 + j) % 4 + (j == hh - 1))])
            c.ret(cx - rx, by - alt + 1, rx * 2 + 1, 1, SACO[5])
        else:
            nx, ny = cx + 1, by - alt
            c.ret(nx - 2, ny - 3, 4, 4, SACO[4])
            c.ret(nx - 2, ny - 3, 1, 4, SACO[2])
            c.ret(nx - 3, ny, 7, 1, "#4a2a16")
            c.p(nx + 3, ny + 1, "#4a2a16")
            c.p(nx + 4, ny + 2, "#4a2a16")
    # carvão espalhado
    g = np.random.default_rng(45)
    for _ in range(40):
        x, y = 104 + g.random() * 56, 160 + g.random() * 6
        c.p(x, y, CARVAO[int(g.random() * 5)])


def bigorna(c: Camada, e: Camada) -> None:
    """Bigorna num toco cintado, com uma placa em brasa e o martelo apoiado."""
    # toco
    for y in range(152, 169):
        for x in range(314, 345):
            uu = (x - 329.5) / 15.5
            if abs(uu) > 1:
                continue
            vv = ruido_ret(46, 1.4, 6)[y, x * 3 % W]
            c.p(x, y, tom(MADEIRA, 3.0 - uu * 1.8 + (vv - 0.5) * 2.2 - abs(uu) ** 5 * 1.2))
    for y in (157, 165):
        for x in range(314, 345):
            c.p(x, y, FERRO[3 if x < 330 else 2])
    for x in range(313, 346):
        c.p(x, 168, MADEIRA[0])
    # pés, cintura, corpo e mesa
    for y in range(150, 153):
        c.ret(316, y, 28, 1, FERRO[3 + (y == 150)])
    for y in range(145, 150):
        w = 6 + (y - 145)
        c.ret(330 - w, y, w * 2, 1, FERRO[3])
        c.p(330 - w, y, FERRO[5])
    c.ret(314, 139, 31, 6, FERRO[3])
    c.ret(314, 139, 31, 1, FERRO[8])
    c.ret(314, 140, 31, 1, FERRO[6])
    c.ret(314, 144, 31, 1, FERRO[1])
    c.ret(344, 139, 1, 6, FERRO[1])
    # chifre para a direita (afinando)
    for x in range(345, 354):
        t = (x - 345) / 9
        y0 = 140 + t * 1.5
        y1 = 144 - t * 1.5
        for y in range(int(y0), int(round(y1)) + 1):
            c.p(x, y, FERRO[6] if y == int(y0) else FERRO[3] if y < y1 - 1 else FERRO[1])
    c.p(354, 142, FERRO[3])
    # furo quadrado e calço
    c.p(318, 139, FERRO[0])
    c.p(317, 139, FERRO[0])
    # placa em brasa (vista quase de lado, com furos escuros)
    for x in range(320, 335):
        e.p(x, 138, "#ffb040" if 322 < x < 333 else "#ff7a2a", 1.0)
        c.p(x, 138, "#3a1a0a")
        e.p(x, 137, "#ff6a1a", 0.6 if (x % 3) else 0.0)
    for x in (323, 327, 331):
        e.p(x, 138, "#c8401a", 1.0)
    # martelo encostado no toco
    c.linha(347, 167, 341, 152, MADEIRA[5])
    c.linha(348, 167, 342, 152, MADEIRA[3])
    c.ret(338, 148, 7, 4, FERRO[4])
    c.ret(338, 148, 7, 1, FERRO[7])
    c.ret(344, 148, 1, 4, FERRO[2])


def barril(c: Camada, e: Camada) -> None:
    """Barril de têmpera com água, tampa de meia lua (poleiro) e uma barra mergulhada."""
    cx, x0, x1, yt, yb = 360, 349, 372, 134, 161
    tex = ruido_ret(47, 1.3, 8)
    for y in range(yt, yb):
        t = (y - yt) / (yb - yt)
        bojo = 1 + 0.08 * math.sin(t * math.pi)
        for x in range(int(cx - 11.5 * bojo), int(cx + 11.5 * bojo) + 1):
            uu = (x - cx) / (11.5 * bojo)
            aduela = (x - x0) % 4 == 0
            k = 3.2 - uu * 1.6 + (tex[y, x] - 0.5) * 2 - aduela * 1.2 - abs(uu) ** 6 * 1.5
            c.p(x, y, tom(MADEIRA, k))
    for yy in (137, 147, 157):
        t = (yy - yt) / (yb - yt)
        bojo = 1 + 0.08 * math.sin(t * math.pi)
        for x in range(int(cx - 11.5 * bojo), int(cx + 11.5 * bojo) + 1):
            uu = (x - cx) / (11.5 * bojo)
            c.p(x, yy, FERRO[int(np.clip(4 - uu * 2, 1, 6))])
            c.p(x, yy + 1, FERRO[1])
    # boca: aro, água (reflete o fogo) e meia tampa de madeira
    for y in range(yt - 3, yt + 2):
        for x in range(x0, x1 + 1):
            d = ((x - cx) / 11.8) ** 2 + ((y - yt + 0.5) / 2.6) ** 2
            if d <= 1:
                if d > 0.62:
                    c.p(x, y, MADEIRA[5] if y < yt - 0.5 else MADEIRA[2])
                elif x < cx:
                    c.p(x, y, "#1a2a2e")
                    if (x + y) % 3 == 0:
                        e.p(x, y, "#ff8a3a", 0.35)
                else:
                    c.p(x, y, MADEIRA[6 if y < yt - 1 else 4])
    c.linha(cx, yt - 3, cx, yt + 1, MADEIRA[1])


def balde_e_barras(c: Camada) -> None:
    """Balde de ferro e barras encostadas no esteio."""
    for y in range(154, 165):
        w = 6 - (y - 154) * 0.15
        for x in range(int(384 - w), int(384 + w) + 1):
            uu = (x - 384) / w
            c.p(x, y, FERRO[int(np.clip(4 - uu * 2.2, 1, 6))])
    c.ret(378, 154, 13, 1, FERRO[7])
    c.ret(378, 159, 13, 1, FERRO[2])
    c.linha(379, 154, 384, 149, FERRO[4])
    c.linha(384, 149, 389, 154, FERRO[4])
    # barras de ferro encostadas
    for i, (xb, xt) in enumerate(((380, 388), (383, 390), (386, 392), (377, 386))):
        c.linha(xb, 152, xt, 102 + i * 3, FERRO[5 - (i % 2)])
        c.linha(xb + 1, 152, xt + 1, 102 + i * 3, FERRO[2])


def banco(c: Camada) -> None:
    """Banco de trabalho com morsa, lima e rolo de arame (lado do texto)."""
    c.ret(14, 116, 86, 3, MADEIRA[5])
    c.ret(14, 116, 86, 1, MADEIRA[6])
    c.ret(14, 119, 86, 2, MADEIRA[2])
    for x in (18, 92):
        c.ret(x, 121, 4, 33, MADEIRA[3])
        c.ret(x, 121, 1, 33, MADEIRA[4])
    c.ret(20, 140, 74, 2, MADEIRA[2])
    # morsa
    c.ret(84, 108, 10, 8, FERRO[3])
    c.ret(84, 108, 10, 1, FERRO[6])
    c.ret(88, 104, 2, 4, FERRO[4])
    c.linha(80, 110, 97, 110, FERRO[5])
    # lima e arame
    c.linha(30, 115, 46, 114, FERRO[5])
    c.ret(46, 113, 4, 2, MADEIRA[4])
    for k in range(6):
        c.p(60 + k, 113 - (k % 2), ACO[3])
        c.p(60 + k, 115, ACO[2])
    c.ret(59, 113, 1, 3, ACO[4])
    c.ret(66, 113, 1, 3, ACO[4])
    # caixa de barras embaixo do banco
    c.ret(28, 142, 30, 12, MADEIRA[2])
    c.ret(28, 142, 30, 1, MADEIRA[4])
    for x in range(30, 56, 3):
        c.linha(x, 141, x + 2, 132, FERRO[3 + (x % 2)])


def lampiao(c: Camada, e: Camada) -> None:
    """Lampião pendurado na viga (aceso à noite)."""
    x, y = LAMPIAO
    for yy in range(19, y - 7):
        if yy % 3 != 2:
            c.p(x, yy, FERRO[4])
    c.ret(x - 2, y - 8, 5, 1, FERRO[5])
    c.ret(x - 3, y - 7, 7, 2, FERRO[3])
    c.ret(x - 3, y - 5, 7, 9, FERRO[1])
    c.ret(x - 2, y - 5, 5, 8, "#4a3a20")
    e.ret(x - 2, y - 5, 5, 8, "#ffd27a")
    e.ret(x - 1, y - 3, 3, 4, "#fff2c0")
    c.ret(x - 3, y + 4, 7, 2, FERRO[3])
    c.ret(x - 3, y + 4, 7, 1, FERRO[5])
    for xx in (x - 3, x + 3):
        c.ret(xx, y - 5, 1, 9, FERRO[3])


def avental(c: Camada) -> None:
    """Avental de couro pendurado num pino debaixo da janela."""
    c.p(318, 86, MADEIRA[6])
    c.p(318, 87, MADEIRA[3])
    c.linha(318, 87, 314, 92, COURO[1])
    c.linha(318, 87, 322, 92, COURO[1])
    for y in range(92, 119):
        t = (y - 92) / 26
        w = 5 + t * 2.5
        for x in range(int(318 - w), int(318 + w) + 1):
            uu = (x - 318) / w
            dobra = math.sin(uu * 5 + t * 2) * 0.6
            c.p(x, y, tom(COURO, 3.3 - uu * 1.1 + dobra - t * 0.6))
    for x in range(311, 326):
        c.p(x, 119, COURO[0])
    c.ret(312, 104, 13, 1, COURO[1])
    c.linha(312, 104, 309, 110, COURO[2])


def prateleira_esq(c: Camada) -> None:
    """Prateleira alta do lado do texto: potes, uma caixinha e argolas de ferro (fica na penumbra)."""
    c.ret(22, 70, 74, 2, MADEIRA[5])
    c.ret(22, 72, 74, 1, MADEIRA[1])
    for x in (28, 88):
        c.linha(x, 73, x, 79, FERRO[3])
        c.linha(x, 79, x - 4, 73, FERRO[2])
    for (x, h, cor) in ((28, 8, 0), (36, 6, 1), (43, 9, 0)):
        pot = pal("#2a1810", "#46281a", "#643a24", "#7e4e30") if cor == 0 else pal("#1e2a26", "#2e4038", "#40564a", "#567060")
        for y in range(70 - h, 70):
            w = 2 + (1 if 70 - h + 2 < y < 69 else 0)
            for xx in range(x - w, x + w + 1):
                c.p(xx, y, pot[int(np.clip(3 - (xx - x + w) * 0.6, 0, 3))])
        c.ret(x - 1, 69 - h, 3, 1, pot[0])
    c.ret(54, 63, 14, 7, MADEIRA[3])
    c.ret(54, 63, 14, 1, MADEIRA[5])
    c.p(60, 66, "#b89040")
    for k in range(3):
        for a in range(14):
            ang = a / 14 * math.tau
            c.p(78 + k * 5 + round(math.cos(ang) * 2.5), 66 + round(math.sin(ang) * 3), FERRO[3 + (a < 7)])


def rebolo(c: Camada) -> None:
    """Rebolo de amolar (roda de pedra de frente, num cavalete) perto da abertura, em silhueta contra a mata."""
    cx, cy, r = 424, 128, 11
    # cavalete atrás da roda
    for (x0, x1) in ((cx - 6, cx - 14), (cx + 6, cx + 14)):
        c.linha(x0, cy - 2, x1, 154, MADEIRA[4])
        c.linha(x0 + 1, cy - 2, x1 + 1, 154, MADEIRA[2])
    c.ret(cx - 15, 146, 31, 2, MADEIRA[3])
    c.ret(cx - 15, 146, 31, 1, MADEIRA[5])
    # roda: disco com anéis de desgaste e o eixo
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = math.hypot(x - cx, y - cy)
            if d > r + 0.3:
                continue
            k = 3.6 - (x - cx) / r * 0.8 - (y - cy) / r * 0.8 + math.sin(d * 1.9) * 0.4
            if d > r - 1.2:
                k -= 1.4
            c.p(x, y, tom(PEDRA_ARCO, k + h2(x, y) * 0.6))
    c.ret(cx - 1, cy - 1, 3, 3, FERRO[2])
    c.p(cx, cy, FERRO[6])
    c.ret(cx - 13, cy - 1, 26, 2, FERRO[3])
    c.ret(cx - 13, cy - 1, 26, 1, FERRO[5])
    # manivela e cocho de água embaixo
    c.linha(cx + 13, cy, cx + 13, cy + 7, FERRO[4])
    c.ret(cx + 12, cy + 7, 4, 2, MADEIRA[5])
    c.ret(cx - 9, 139, 18, 6, MADEIRA[3])
    c.ret(cx - 9, 139, 18, 1, MADEIRA[5])
    c.ret(cx - 7, 140, 14, 1, "#2a4048")


def pintar_objetos() -> tuple[Objetos, Camada, Camada, Camada]:
    o = Objetos()
    e = Camada()
    f = Camada()
    fornalha(f, e)
    o.add(155, caixote_e_sacos)
    o.add(152, balde_e_barras)
    o.add(161, barril, e)
    o.add(168, bigorna, e)
    o.add(154, banco)
    o.add(154, rebolo)
    o.cam.contornar("#0c0806", 0.55)
    pend = Camada()           # objetos pendurados (sem sombra no chão)
    fole(pend)
    lampiao(pend, e)
    pend.contornar("#0c0806", 0.5)
    return o, f, pend, e


def pintar_parede_obj() -> Camada:
    c = Camada()
    painel_implantes(c)
    avental(c)
    prateleira_esq(c)
    porta_ferramentas(c)
    prateleira(c)
    c.contornar("#0c0806", 0.45)
    return c


# ─────────────────────────────── Piso em perspectiva ───────────────────────────────
def pintar_piso() -> Camada:
    c = Camada()
    yy = np.maximum(YA - HORIZONTE, 1)
    z = 1500 / yy
    uu = (XA - 240) * z / 80
    linha = np.floor(z / 2.4).astype(int)
    off = hmap(linha, linha, 11) * 5
    larg = 3.6 + hmap(linha, linha, 12) * 1.4
    colu = np.floor((uu + off) / larg).astype(int)
    lid = linha * 1000 + colu
    junta = np.zeros((H, W), bool)
    junta[1:, :] |= lid[1:, :] != lid[:-1, :]
    junta[:, 1:] |= lid[:, 1:] != lid[:, :-1]
    piso = YA >= CHAO_Y
    ht = hmap(linha, colu, 13)
    tex = ruido(61, 2) * 0.6 + ruido(62, 6) * 0.4
    acima = np.zeros((H, W), bool)
    acima[1:, :] = junta[:-1, :]
    esq = np.zeros((H, W), bool)
    esq[:, 1:] = junta[:, :-1]
    tv = 2.4 + ht * 2.0 + (tex - 0.5) * 1.6 + acima * 0.9 + esq * 0.4
    # caminho gasto entre a fornalha e a bigorna (mais liso e claro)
    gasto = np.exp(-((YA - 168) / 12) ** 2) * suave(180, 230, XA) * suave(380, 330, XA)
    tv += gasto * 0.7
    # pó de carvão perto dos sacos e da fornalha
    pó = np.exp(-(((XA - 140) / 40) ** 2 + ((YA - 162) / 10) ** 2)) * 1.6 + np.exp(-(((XA - 240) / 30) ** 2 + ((YA - 160) / 6) ** 2)) * 1.4
    tv -= pó * (0.6 + tex)
    rach = (ruido(63, 1.2) > 0.86) & (ht > 0.6)
    tv = np.where(rach, tv - 1.2, tv)
    c.mascara(piso & ~junta, tom(PEDRA_P, tv + BAYER_HW * 0.5))
    c.mascara(piso & junta, tom(PEDRA_P, 0.4 + ht * 0.6))
    # palha e lascas de ferro espalhadas
    g = np.random.default_rng(64)
    for _ in range(70):
        x, y = g.random() * W, CHAO_Y + 2 + g.random() * 66
        if any(x0 - 2 <= x <= x1 + 2 and y0 - 2 <= y <= y1 + 4 for (x0, y0, x1, y1) in LIVRE.values()):
            continue
        if g.random() < 0.5 and x > 330:
            c.linha(x, y, x + 2 + g.random() * 2, y - g.random() * 1.5, "#a8904a")
        else:
            c.p(x, y, ["#141210", "#3a3632", "#6a5a4a"][int(g.random() * 3)])
    return c


# ─────────────────────────────── Primeiro plano ───────────────────────────────
def pintar_frente() -> Camada:
    """Coisas muito perto da câmera nas bordas (saem bem desfocadas e escuras, dão a profundidade): uma viga no alto,
    o esteio da direita, correntes com gancho, um caixote com barras à esquerda e o cepo com a marreta à direita."""
    c = Camada()
    veio = ruido_ret(91, 14, 1.3)
    # viga bem perto da câmera, cruzando o alto
    for x in range(W):
        yb = 7 + int(1.5 * math.sin(x / 60))
        for y in range(0, yb):
            c.p(x, y, tom(MADEIRA, 2.2 + (veio[y, x] - 0.5) * 2 + (y == yb - 1) * 1.4))
    # esteio grosso na borda direita
    for y in range(H):
        for x in range(468, W):
            u = (x - 468) / 12
            c.p(x, y, tom(MADEIRA, 1.4 + (0.5 - abs(u - 0.3)) * 3 + (veio[y, (x * 5) % W] - 0.5) * 2))
    # correntes com gancho
    for (x, y1) in ((30, 64), (452, 46)):
        for y in range(5, y1):
            k = (y // 3) % 2
            c.ret(x - 1 + k, y, 2 + (1 - k), 1, FERRO[3 if k else 5])
        c.linha(x, y1, x, y1 + 6, FERRO[4])
        c.linha(x, y1 + 6, x + 4, y1 + 4, FERRO[4])
    # caixote com barras no canto inferior esquerdo
    for y in range(176, H):
        for x in range(0, 58):
            c.p(x, y, tom(MADEIRA, 2.6 + (veio[y, x * 3 % W] - 0.5) * 2 - ((y - 176) % 8 == 7) * 1.6))
    c.ret(0, 176, 58, 1, MADEIRA[5])
    c.ret(54, 176, 4, 24, MADEIRA[1])
    for i in range(6):
        c.linha(4 + i * 7, 177, 14 + i * 9, 158 + (i % 3) * 3, FERRO[3 + (i % 3)])
        c.linha(5 + i * 7, 177, 15 + i * 9, 158 + (i % 3) * 3, FERRO[1])
    # cepo com a marreta no canto direito
    for y in range(176, H):
        for x in range(412, 468):
            c.p(x, y, tom(MADEIRA, 2.4 + (veio[y, x] - 0.5) * 2.2 + (y < 178) * 1.6))
    c.ret(424, 168, 18, 8, FERRO[3])
    c.ret(424, 168, 18, 2, FERRO[6])
    c.linha(442, 172, 468, 160, MADEIRA[5])
    c.linha(442, 173, 468, 161, MADEIRA[3])
    return c


# ─────────────────────────────── Luz ───────────────────────────────
def mancha_janela(nome: str) -> tuple[np.ndarray, list]:
    """A forma da janela projetada pelo sol no chão (com as barras) e os raios janela -> chão para o feixe.

    Cada pixel do chão volta pelo raio de sol até o plano da janela: se cai no vão (e não numa barra), está aceso.
    O topo do vão cai mais longe da parede (mais embaixo na tela) que o peitoril."""
    ab = mascara_janela() & ~grades_janela()
    x0, x1, yt, yb = JANELA
    # (y do chão do topo do vão, y do chão do peitoril, deriva x por linha da janela, largura, deslocamento x)
    a, b, shx, sx, dxx = {"manha": (196, 166, 0.3, 1.25, -44), "tarde": (180, 152, 0.9, 1.4, -70),
                          "noite": (190, 166, 0.2, 1.15, -30)}[nome]
    t = (YA - a) / (b - a)                     # 0 no topo do vão, 1 no peitoril
    wy = yt + t * (yb - yt)
    wx = 333 + (XA - 333 - dxx - (yb - wy) * shx) / sx
    ok = (t >= 0) & (t <= 1) & (YA >= CHAO_Y)
    wyi = np.clip(np.round(wy).astype(int), 0, H - 1)
    wxi = np.clip(np.round(wx).astype(int), 0, W - 1)
    out = (ok & ab[wyi, wxi]).astype(np.float32)
    raios = []
    for wyy in range(int(yt), int(yb)):
        tt = (wyy - yt) / (yb - yt)
        fy = a + (b - a) * tt
        for wxx in range(x0, x1):
            if ab[wyy, wxx]:
                fx = 333 + dxx + (wxx - 333) * sx + (yb - wyy) * shx
                raios.append((wxx + 0.5, wyy + 0.5, fx, fy))
    return out, raios


def feixe_de_raios(raios: list, passo: int = 2) -> np.ndarray:
    """Volume do feixe: soma de segmentos janela -> chão (em 3x), cada um mais fraco perto do chão."""
    acc = np.zeros((H * ESC, W * ESC), np.float32)
    for i, (wx, wy, fx, fy) in enumerate(raios):
        if i % passo:
            continue
        n = int(max(abs(fx - wx), abs(fy - wy)) * ESC)
        ts = np.linspace(0, 1, n)
        X = np.clip((wx + (fx - wx) * ts) * ESC, 0, W * ESC - 1).astype(int)
        Y = np.clip((wy + (fy - wy) * ts) * ESC, 0, H * ESC - 1).astype(int)
        acc[Y, X] += 1 - ts * 0.4
    return acc


def feixe_dir(x0, y0, x1, y1, w0, w1) -> np.ndarray:
    """Feixe reto entre dois pontos (em pixels da arte), com largura variando."""
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy
    t = ((GXa - x0) * dx + (GYa - y0) * dy) / L2
    px, py = x0 + dx * t, y0 + dy * t
    d = np.hypot(GXa - px, GYa - py)
    w = w0 + (w1 - w0) * np.clip(t, 0, 1)
    return np.exp(-(d / np.maximum(w, 0.5)) ** 2 * 2.2) * ((t > 0) & (t < 1.05))


def recorte(alfa: np.ndarray, centro, dist: float = 2) -> np.ndarray:
    """Borda de luz: pixels do objeto cujo vizinho na direção da luz está vazio."""
    ys, xs = np.nonzero(alfa > 0.5)
    out = np.zeros((H, W), np.float32)
    if callable(centro):
        vx, vy = centro(xs, ys)
    else:
        vx = centro[0] - xs
        vy = centro[1] - ys
    n = np.maximum(np.hypot(vx, vy), 1e-3)
    tx = np.clip(np.round(xs + vx / n * dist).astype(int), 0, W - 1)
    ty = np.clip(np.round(ys + vy / n * dist).astype(int), 0, H - 1)
    livre = alfa[ty, tx] < 0.5
    out[ys[livre], xs[livre]] = 1
    return out


def faiscas(img: np.ndarray, nome: str, k: float) -> None:
    """Faíscas pintadas: pontinhos com rastro curto saindo da bigorna e subindo da fornalha (fora da caixa do fogo)."""
    g = np.random.default_rng(71)
    pts = []
    for _ in range(16):     # da bigorna: leque para cima
        a = -math.pi / 2 + (g.random() - 0.5) * 2.2
        r = 4 + g.random() * 18
        pts.append((328 + math.cos(a) * r, 136 + math.sin(a) * r * 0.8, math.cos(a), math.sin(a), 0.6 + g.random() * 0.6))
    for _ in range(7):      # da fornalha: sobem pela coifa, em curva
        pts.append((224 + g.random() * 32, 62 + g.random() * 34, (g.random() - 0.5) * 2.2, -1, 0.3 + g.random() * 0.5))
    for _ in range(6):      # soltas no ar
        pts.append((268 + g.random() * 40, 70 + g.random() * 24, (g.random() - 0.3), -0.8, 0.3 + g.random() * 0.4))
    camada = np.zeros((H * ESC, W * ESC), np.float32)
    for (x, y, vx, vy, b) in pts:
        if any(x0 - 1 <= x <= x1 + 1 and y0 - 1 <= y <= y1 + 1 for (x0, y0, x1, y1) in LIVRE.values()):
            continue
        X, Y = int(x * ESC), int(y * ESC)
        n = math.hypot(vx, vy) or 1
        for s in range(7):
            xx, yy = int(X - vx / n * s * 1.5), int(Y - vy / n * s * 1.5)
            if 0 <= yy < H * ESC - 2 and 0 <= xx < W * ESC - 2:
                camada[yy:yy + 2, xx:xx + 2] += b * (1 - s / 7) ** 1.5
    img += camada[:, :, None] * hexa("#ffd070") * 1.6 * k
    img += desfocar(camada[:, :, None], 4) * hexa("#ff7a20") * 2.2 * k


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    fx, fy = FOGO
    ceu, fora = pintar_fora(nome, per)
    parede = pintar_parede(nome)
    parede_obj = pintar_parede_obj()
    piso = pintar_piso()
    obj, forja, pend, emiss = pintar_objetos()
    frente = pintar_frente()

    # ── albedo com profundidade de campo; mapas de quanto cada plano recebe de cada luz
    planos = [  # (camada, desfoque, é interior, recebe fogo, recebe sol)
        (fora.c, 1.5, 0.0, 0.0, 0.0),
        (parede.c, 0.0, 1.0, 0.55, 0.5),
        (parede_obj.c, 0.0, 1.0, 0.7, 0.6),
        (piso.c, 0.0, 1.0, 1.0, 1.0),
        (forja.c, 0.0, 1.0, 0.75, 0.6),
        (obj.cam.c, 0.0, 1.0, 1.0, 1.0),
        (pend.c, 0.0, 1.0, 0.85, 0.6),
    ]
    img = ampliar(ceu)
    interior = np.zeros(img.shape[:2], np.float32)
    m_fogo = np.zeros_like(interior)
    m_sol = np.zeros_like(interior)
    alfas = []
    for cam, r, inte, fo, so in planos:
        a = desfocar_rgba(ampliar(cam), r)
        alfas.append(a[:, :, 3])
        al = a[:, :, 3]
        img = sobre(img, a)
        interior = interior * (1 - al) + inte * al
        m_fogo = m_fogo * (1 - al) + fo * al
        m_sol = m_sol * (1 - al) + so * al
    piso_a = ampliar((piso.c[:, :, 3] > 0.5).astype(np.float32)[:, :, None])[:, :, 0] * (1 - alfas[5]) * (1 - alfas[4])

    # ── sombras projetadas a partir da fornalha (chão) e sombras das peças na parede
    alfa_obj = obj.cam.c[:, :, 3]

    def do_fogo(xs, b):
        vx, vy = xs - fx, b - fy
        n = np.maximum(np.hypot(vx, vy * 2.4), 1)
        k = np.clip(n / 30, 0.5, 2.6)
        return vx / n * k, vy / n * k * 0.4

    s_fogo = projetar_sombra(alfa_obj, obj.base, do_fogo) * (YA >= CHAO_Y) * (alfa_obj < 0.5)
    s_fogo = desfocar(ampliar(s_fogo[:, :, None]), 3)[:, :, 0]
    # peças da parede: sombra deslocada para longe da fornalha
    pa = parede_obj.c[:, :, 3] > 0.5
    pa = pa | (pend.c[:, :, 3] > 0.5) & (YA < CHAO_Y)
    s_par = np.zeros((H, W), np.float32)
    ys, xs = np.nonzero(pa)
    dx = np.sign(xs - fx) * np.clip(np.abs(xs - fx) / 30, 1, 3)
    tx = np.clip(np.round(xs + dx).astype(int), 0, W - 1)
    ty = np.clip(ys + 2, 0, H - 1)
    s_par[ty, tx] = 1
    s_par *= ~pa & (parede.c[:, :, 3] > 0.5) & ~mascara_janela()
    s_par = desfocar(ampliar(s_par[:, :, None]), 1.5)[:, :, 0]
    # oclusão de contato: pé da parede, pés dos objetos, em volta da fornalha
    ao = np.zeros((H, W), np.float32)
    ao = np.maximum(ao, suave(CHAO_Y + 7, CHAO_Y, YA) * (YA >= CHAO_Y - 4) * 0.9)
    pe = (alfa_obj > 0.4) & (obj.base >= 0) & (np.abs(YA - obj.base) < 2.5)
    ao = np.maximum(ao, pe.astype(np.float32))
    ao = np.maximum(ao, ret(190, 150, 274, 160) * 0.7)
    ao = desfocar(ampliar(ao[:, :, None]), 4)[:, :, 0] * (1 - alfas[5] * 0.7)

    # ── luz do dia: céu pelas aberturas, a janela e (à tarde) o sol baixo pela lateral aberta
    abertura = (luz_pontual(450, 100, 190, 0.9) * 1.0 + luz_pontual(333, 60, 90, 1.0) * 0.6)
    amb = hexa(per["amb"]) * per["amb_k"]
    luz = amb * (0.5 + abertura[:, :, None] * 1.4 * per["ceu_k"] / 0.5)
    luz = luz * (1 - ao[:, :, None] * 0.6) * (1 - s_par[:, :, None] * 0.5)
    mj, raios = mancha_janela(nome)
    mj = desfocar(ampliar(mj[:, :, None]), 0.7)[:, :, 0]
    sol_k = per["sol_k"]
    luz += hexa(per["sol"]) * (mj * sol_k * {"manha": 0.95, "tarde": 0.6, "noite": 0.75}[nome] * m_sol)[:, :, None]
    if nome == "tarde":
        # sol baixo entrando pela lateral aberta: faixa no chão e na parede, sombras longas para a esquerda
        s_tarde = projetar_sombra(alfa_obj, obj.base, (-2.8, 0.22))
        s_tarde = np.maximum(s_tarde, projetar_sombra(forja.c[:, :, 3], np.where(forja.c[:, :, 3] > 0.4, 157, -1).astype(np.float32), (-2.8, 0.22)))
        # sombra do esteio da abertura
        s_tarde = np.maximum(s_tarde, ((YA >= CHAO_Y) & (np.abs(YA - (CHAO_Y + 2 + (ABERTO_X - XA) * 0.2)) < 3) & (XA < ABERTO_X)).astype(np.float32))
        s_tarde = desfocar(ampliar(s_tarde[:, :, None]), 2)[:, :, 0]
        faixa = suave(150, 400, GXa) * (GYa > CHAO_Y - 1) * (0.55 + 0.45 * suave(200, 140, GYa))
        parede_sol = suave(280, ABERTO_X - 8, GXa) * (GYa < CHAO_Y) * (GYa > 60) * 0.55
        luz += hexa("#ffb060") * ((faixa * (1 - s_tarde * 0.92) + parede_sol) * 1.3 * m_sol * (1 - piso_a * 0) )[:, :, None]

    # ── a fornalha: poça em degraus, leque pela boca e sombras
    fk = per["fogo_k"]
    poca = luz_em_degraus(fx, fy - 4, 205, 0.62, 21, 7)
    leque = np.where(GYa > 150, suave(10, -4, np.abs(GXa - fx) - (20 + (GYa - 150) * 2.1)), 0) * piso_a
    lado_leque = 1 - 0.6 * piso_a * (1 - leque)
    fogo = poca[:, :, None] * hexa("#ff7a2a") * 1.35 * lado_leque[:, :, None]
    fogo += luz_pontual(fx, fy - 4, 52, 0.8)[:, :, None] * hexa("#ffcc78") * 1.1
    fogo += leque[:, :, None] * luz_pontual(fx, 160, 60, 0.6)[:, :, None] * hexa("#ffb050") * 0.8
    # a frente da fornalha só recebe luz rasante perto da boca
    frente_forja = alfas[4] * (1 - alfas[5])
    perto_boca = luz_pontual(fx, 128, 34, 1.2)
    coifa_baixo = suave(46, 92, GYa) * (GYa < 96) * 1.2
    fogo *= (1 - frente_forja * (1 - np.maximum(perto_boca, coifa_baixo * 0.7)) * 0.6)[:, :, None]
    fogo *= (1 - s_fogo * 0.85)[:, :, None]
    luz += fogo * fk * m_fogo[:, :, None]
    # intradorso e ombreiras da boca: a pedra que encosta no vão recebe a brasa em cheio
    dn = np.sqrt(((XA + 0.5 - 240) / 22) ** 2 + ((YA + 0.5 - 113) / 16) ** 2)
    bm = ((dn <= 1) & (YA < 113)) | ret(218, 113, 262, 151)
    viz = np.zeros((H, W), np.float32)
    for d in (1, 2, 3):
        for (ddx, ddy) in ((d, 0), (-d, 0), (0, -d), (d, -d), (-d, -d)):
            viz = np.maximum(viz, np.roll(np.roll(bm, ddy, 0), ddx, 1) * (1 - (d - 1) * 0.35))
    viz *= ~bm * (forja.c[:, :, 3] > 0.5) * np.clip((YA - 92) / 50, 0.25, 1)
    luz += ampliar(viz[:, :, None])[:, :, 0][:, :, None] * hexa("#ff9040") * 1.6 * fk
    # luz rebatida: o laranja da fornalha enche a sala inteira, bem fraco (o "ray tracing" barato)
    luz += luz_pontual(fx, 120, 330, 0.75)[:, :, None] * hexa("#ff9a50") * 0.2 * fk
    luz += (luz_pontual(fx, 14, 150, 0.35) * suave(30, 16, GYa) * (1 - alfas[4]))[:, :, None] * hexa("#ff9a50") * 0.55 * fk
    # claridade do céu entrando pela lateral aberta e pela janela, no chão e nas coisas perto
    cor_ceu = hexa(per["ceu"][1]) if nome != "noite" else hexa("#5a78d0")
    luz += cor_ceu * (luz_pontual(456, 150, 170, 0.6) * 1.1 + luz_pontual(333, 100, 60, 1.2) * 0.3)[:, :, None] \
        * {"manha": 1.0, "tarde": 0.6, "noite": 0.55}[nome] * m_sol[:, :, None]
    # lampião
    lk = per["lamp_k"]
    if lk > 0:
        lx, ly = LAMPIAO
        luz += luz_em_degraus(lx, ly + 2, 90, 0.9, 31, 5)[:, :, None] * hexa("#ffc870") * 1.5 * lk
        luz += luz_pontual(lx, ly + 2, 22, 1.0)[:, :, None] * hexa("#ffe0a0") * 1.2 * lk * m_fogo[:, :, None]
    sol_ = interior[:, :, None]
    # brilho especular: o ferro polido (tons claros e sem cor) devolve mais da luz que recebe
    alb = img
    sat = alb.max(2) - alb.min(2)
    lum_a = alb.mean(2)
    metal = (suave(0.14, 0.04, sat) * suave(0.42, 0.7, lum_a) * interior)[:, :, None]
    img = img * (1 - sol_) + img * luz * sol_ + metal * np.clip(luz - 0.25, 0, 3) * 0.55
    # lá fora: exposição da hora (o céu e a mata não recebem a luz do interior)
    img = img * (1 - sol_) * np.array(per["fora_k"], np.float32) + img * sol_
    # névoa clara lá fora (profundidade)
    nev = hexa(per["nevoa"])
    fora_a = (1 - interior) * (GYa > 40)
    kn = {"manha": 0.3, "tarde": 0.22, "noite": 0.12}[nome]
    img = img * (1 - fora_a[:, :, None] * kn) + nev * fora_a[:, :, None] * kn

    # ── recortes: bordas viradas para o fogo acendem laranja; à tarde, as viradas para a abertura acendem dourado
    alvo = np.maximum(alfa_obj, pend.c[:, :, 3])
    rec = recorte(alvo, (fx, fy - 6), 1)
    dist = np.hypot(XA - fx, (YA - fy) * 1.3)
    rec *= np.exp(-dist / 75)
    rec_a = ampliar(rec[:, :, None])[:, :, 0]
    img += rec_a[:, :, None] * img * hexa("#ffb060") * 1.6 * fk
    if nome == "tarde":
        rt = recorte(alvo, lambda xs, ys: (np.ones_like(xs) * 1.0, np.ones_like(xs) * -0.1), 2) * suave(150, 380, XA)
        img += ampliar(rt[:, :, None]) * img * hexa("#ffc070") * 1.2
    # ferro polido: a mesa da bigorna e a água refletem a fornalha
    # ── emissivos: boca, brasas, placa, lampião
    em = ampliar(emiss.c)
    k_em = per["em_k"]
    lamp_mask = ampliar(ret(LAMPIAO[0] - 3, LAMPIAO[1] - 6, LAMPIAO[0] + 4, LAMPIAO[1] + 4)[:, :, None].astype(np.float32))
    k_mapa = k_em * (1 - lamp_mask) + lamp_mask * max(lk * 1.6, 0.15)
    em_rgb = em[:, :, :3] * em[:, :, 3:4] * k_mapa
    img = img * (1 - em[:, :, 3:4] * np.clip(k_mapa, 0, 1) * 0.8) + em_rgb
    img += desfocar(em_rgb, 6) * 0.6 + desfocar(em_rgb, 22) * 0.7

    # ── reflexo da boca nas lajes gastas logo à frente (faixas verticais, como em pedra polida)
    estrias = ampliar(ruido_ret(75, 1.2, 9)[:, :, None])[:, :, 0]
    refl = np.exp(-((GXa - fx) / 13) ** 2) * np.exp(-np.maximum(GYa - 157, 0) / 9) * (GYa > 157) * piso_a
    img += (refl * (0.35 + 0.65 * estrias))[:, :, None] * hexa("#ff9a48") * 0.5 * fk
    # ── névoa quente e fumaça na frente da coifa
    fum = ruido_ret(73, 6, 10) * 0.6 + ruido(74, 4) * 0.4
    fum = ampliar(fum[:, :, None])[:, :, 0]
    coluna = np.exp(-((GXa - fx) / (14 + (110 - GYa) * 0.12)) ** 2) * suave(112, 80, GYa) * suave(10, 50, GYa)
    img *= (1 - coluna * (0.25 + 0.3 * fum) * 0.6)[:, :, None]
    calor = luz_pontual(fx, 130, 46, 1.0) * (0.6 + 0.4 * fum)
    img += calor[:, :, None] * hexa("#ff7a30") * 0.12 * fk

    # ── feixe de luz pela janela, com poeira
    vol = feixe_de_raios(raios)
    vol = desfocar(vol[:, :, None], 4)[:, :, 0]
    vol = vol / max(vol.max(), 1e-6)
    poe = ampliar(ruido(81, 4)[:, :, None])[:, :, 0]
    kv = {"manha": 0.55, "tarde": 0.28, "noite": 0.16}[nome]
    cor_v = {"manha": "#ffe6b0", "tarde": "#ffb070", "noite": "#90a8ff"}[nome]
    vol_k = vol * (0.6 + 0.6 * poe) * kv
    img += vol_k[:, :, None] * hexa(cor_v)
    peso_poeira = vol * 1.6
    if nome == "tarde":
        ft = (feixe_dir(428, 90, 250, 172, 5, 30) + feixe_dir(428, 90, 300, 140, 4, 16) * 0.6) \
            * suave(ABERTO_X + 6, ABERTO_X - 30, GXa) * (0.55 + 0.6 * poe)
        ft = desfocar(ft[:, :, None], 3)[:, :, 0]
        img += ft[:, :, None] * hexa("#ffb468") * 0.4
        peso_poeira = peso_poeira + ft * 1.5
    g = np.random.default_rng(83)
    rgbp = hexa({"manha": "#fff4d0", "tarde": "#ffd8a0", "noite": "#c8d8ff"}[nome])
    for _ in range(1600):
        X, Y = int(g.random() * (W * ESC - 4)), int(g.random() * (H * ESC - 4))
        k = peso_poeira[Y, X] * (0.3 + g.random() * 0.8)
        if k > 0.06:
            tam = 2 if g.random() < 0.7 else 3
            img[Y:Y + tam, X:X + tam] += rgbp * k * 0.8
    # vapor do barril
    vap = np.zeros((H * ESC, W * ESC), np.float32)
    for k in range(70):
        t = k / 70
        x = 362 + math.sin(t * 8) * (1 + t * 4) + t * 6
        y = 132 - t * 34
        X, Y = int(x * ESC), int(y * ESC)
        vap[Y - 3:Y + 4, X - 4:X + 5] += (1 - t) * t * 4 * 0.3
    vap = desfocar(vap[:, :, None], 7)[:, :, 0]
    img = img + vap[:, :, None] * (hexa("#e0d8cc") * 0.7 - img * 0.3) * {"manha": 0.45, "tarde": 0.4, "noite": 0.3}[nome]
    faiscas(img, nome, {"manha": 0.8, "tarde": 0.9, "noite": 1.2}[nome])

    # ── primeiro plano desfocado e escuro
    fr = desfocar_rgba(ampliar(frente.c), 8)
    k_fr = {"manha": 0.5, "tarde": 0.48, "noite": 0.34}[nome]
    fr_cor = fr.copy()
    fr_cor[:, :, :3] *= k_fr
    fr_cor[:, :, :3] *= 1 + luz_pontual(fx, fy, 300, 0.7)[:, :, None] * hexa("#ff9a50") * 0.9 * fk
    img = sobre(img, fr_cor)

    # ── acabamento: brilho, curva de tom, cor, área calma, vinheta e grão
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.8) * 4, 0, 1), 0, 3)
    img = img + desfocar(claro, 12) * 0.45 + desfocar(claro, 40) * 0.35
    joelho = 0.7
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, fr_ = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (fr_ * 0.5 + 0.5)))
    img = np.clip((img - 0.48) * 1.08 + 0.48, 0, 1.2)
    xn, yn = GX / (W * ESC), GY / (H * ESC)
    calma = (1 - suave(0.28, 0.44, xn))[:, :, None]
    media = desfocar(np.clip(img, 0, 1.2), 16)
    img = media + (img - media) * (1 - 0.35 * calma)
    img *= 1 - 0.18 * calma
    v = (xn - 0.52) ** 2 * 1.3 + (yn - 0.6) ** 2 * 1.6
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.1)[:, :, None]
    gg = np.random.default_rng(99)
    img += (gg.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.014
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


ANCORAS = {
    "gato": [
        {"x": 204, "y": 154, "pose": "fogueira"},
        {"x": 166, "y": 166, "pose": "repouso"},
        {"x": 232, "y": 172, "pose": "sentado"},
        {"x": 274, "y": 166, "pose": "observando"},
        {"x": 316, "y": 172, "pose": "repouso"},
        {"x": 190, "y": 178, "pose": "sentado"},
    ],
    "coruja": [
        {"x": 172, "y": 140},
        {"x": 326, "y": 139},
        {"x": 360, "y": 132},
        {"x": 208, "y": 184},
        {"x": 300, "y": 192},
    ],
    "particulas": "faiscas",
}


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    nomes = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in nomes:
        t0 = time.time()
        img = montar(nome)
        img.save(PASTA / f"cena-forja-{nome}.webp", quality=84, method=6)
        img.resize((960, 400), Image.LANCZOS).save(PASTA / f"cena-forja-{nome}-960.webp", quality=82, method=6)
        print(nome, (PASTA / f"cena-forja-{nome}.webp").stat().st_size // 1024, "KB",
              (PASTA / f"cena-forja-{nome}-960.webp").stat().st_size // 1024, "KB", f"{time.time() - t0:.1f}s")
    (Path(__file__).resolve().parent / "cena-forja.json").write_text(json.dumps(ANCORAS, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
