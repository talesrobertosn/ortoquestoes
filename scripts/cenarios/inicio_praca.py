"""Cenário "HD-2D" do topo da página inicial: a Praça do Pinheiro (10/11/2026).

Pedido do Tales: uma arte nova para a capa, com a fogueira, lugar para os mascotes, três horas do dia, luz quente e
"um toque de Natal, só um toque". Nada baixado nem gerado por IA: cada pixel sai das funções abaixo, com os pincéis
básicos, o desfoque e as luzes de scripts/gerar_cena_inicio.py.

A cena (pixel art de 480 x 200, montada em 3x com a luz calculada por pixel):
- o céu da hora, duas serras com neve só nos cumes, a mata de pinheiros ao longe e a névoa do vale;
- a praça de pedra de uma vila: três casas de enxaimel com telhado de telha por telha, chaminés soltando fumaça,
  janelas de vidraça com a luz de dentro, floreiras, e a porta da casa grande com uma guirlanda;
- o pinheiro da praça, galho por galho, com um fio de luzinhas, poucas bolas e uma estrela no alto, e três presentes
  ao pé (o toque de Natal); um varal de lampadinhas de uma casa à outra;
- a fogueira num anel de pedras exatamente na âncora do fogo (a chama animada entra por cima), o banco de madeira, o
  poste com o lampião, o poço de pedra com o balde, barril, caixotes, a pilha de lenha e o carrinho de mão;
- o calçamento em perspectiva, pedra por pedra, com junta, quina de luz, musgo e as pedras gastas do caminho.
- Montagem: névoa por distância, sombras projetadas do sol (ou da fogueira, à noite), oclusão de contato, poças de
  luz da fogueira, das janelas, do lampião e do pinheiro, feixes de luz com poeira, fumaça, profundidade de campo,
  brilho, curva de tom, correção de cor e vinheta.

Saídas em public/pixel/inicio/: cena-praca-{manha,tarde,noite}.webp (1440 x 600) e -960, mais cena-praca.json com os
pontos do gato, da coruja e do pouso do dragão. O fogo (x 220-260, y 104-152, base em 240,146), o esqueleto
(x 262-308, y 96-163), o gato, a coruja e o dragão entram por cima (CenaDiorama.tsx); as áreas deles ficam livres.
Uso: python3 scripts/cenarios/inicio_praca.py [manha|tarde|noite]
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
from gerar_cena_inicio import (  # noqa: E402
    ESC, GX, GXa, GY, GYa, H, W, XA, YA, Camada, ampliar, desfocar, desfocar_rgba, elipse, facho, hexa,
    luz_em_degraus, luz_pontual, pal, poli, pontilhar, projetar_sombra, raios_de_luz, ruido, ruido_ret, sobre, suave)

PASTA = RAIZ / "public" / "pixel" / "inicio"
FOGO = (240, 146)
CHAO = 116                      # onde o calçamento encontra o pé das casas
PINHEIRO = (378, 158)           # o pé do pinheiro da praça
POSTE = (322, 150)
POCO = (166, 150)

PERIODOS = {
    "manha": dict(ceu=("#3f7cc8", "#8fc0ea", "#f6ead0"), astro=(430, 22), amb="#8aa8d6", amb_k=0.52, sol="#ffdca0", sol_k=1.0,
                  sombra=(-1.3, 0.34), nevoa="#cfe0ee", nevoa_k=0.9, fogo_k=0.25, jan_k=0.25, luzes_k=0.35, quente="#fff0d6", fria="#26436e", fumaca="#eef2f8"),
    "tarde": dict(ceu=("#3a3478", "#c8788c", "#ffcf8e"), astro=(96, 62), amb="#9c82b8", amb_k=0.46, sol="#ffae6c", sol_k=1.1,
                  sombra=(1.9, 0.42), nevoa="#f0b89a", nevoa_k=1.0, fogo_k=0.55, jan_k=0.85, luzes_k=0.8, quente="#ffd49c", fria="#33285c", fumaca="#f4d2c8"),
    "noite": dict(ceu=("#03071a", "#0b1638", "#1c2a58"), astro=(196, 26), amb="#40529c", amb_k=0.3, sol="#8aa6ff", sol_k=0.4,
                  sombra=None, nevoa="#18264e", nevoa_k=0.85, fogo_k=1.3, jan_k=1.25, luzes_k=1.25, quente="#ffcf8a", fria="#0a1432", fumaca="#7f8cc0"),
}

PEDRA = pal("#221f26", "#35313a", "#4b464e", "#635d62", "#7e7672", "#9a9084", "#b8ac98", "#d4c8ae")
MADEIRA = pal("#1e120a", "#30200f", "#463018", "#5e4222", "#7a582e", "#94703c", "#ae8a4e", "#c8a468")
REBOCO = pal("#6a5a48", "#86745c", "#a28e70", "#bca886", "#d2c09c", "#e4d6b4", "#f2e8cc")
TELHA = pal("#2c1210", "#461a14", "#62241a", "#7e3220", "#9a4428", "#b45a34", "#cc7444")
PINHO = pal("#06140e", "#0b2016", "#112c1c", "#183a22", "#224a2a", "#2e5c32", "#3e703a", "#548644")
SERRA = pal("#2a3350", "#3a4666", "#4e5c7e", "#687898", "#8896b2", "#aab6cc", "#d2dae8", "#f2f4f8")


def h01(*v) -> float:
    n = 0
    for i, x in enumerate(v):
        n = (n * 73856093) ^ (int(x) * 19349663 + i * 83492791)
    n = (n ^ (n >> 13)) * 1274126177
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535


def pintar(c: Camada, m: np.ndarray, paleta: np.ndarray, v: np.ndarray, forca: float = 0.9) -> None:
    """Pinta a máscara com a paleta, escolhendo o tom por v (0..1) com pontilhado ordenado."""
    c.mascara(m, paleta[pontilhar(np.clip(v, 0, 1), len(paleta), forca)])


# ─────────────────────────────── céu e longe ───────────────────────────────
def pintar_ceu(nome: str, per: dict) -> np.ndarray:
    a, b, c_ = (hexa(x) for x in per["ceu"])
    t = np.clip(YA / 118, 0, 1)[:, :, None]
    ceu = np.where(t < 0.55, a + (b - a) * (t / 0.55), b + (c_ - b) * ((t - 0.55) / 0.45))
    faixa = np.floor(t * 22 + (ruido(3, 28) - 0.5)[:, :, None] * 1.6) / 22          # o degradê em faixas de pixel art
    ceu = np.where(faixa < 0.55, a + (b - a) * (faixa / 0.55), b + (c_ - b) * ((faixa - 0.55) / 0.45)) * 0.6 + ceu * 0.4
    nuv = ruido_ret(11, 46, 9) * 0.6 + ruido_ret(12, 18, 5) * 0.4
    forma = np.clip((nuv - 0.56) * 5, 0, 1) * np.clip(1 - np.abs(YA - 46) / 40, 0, 1)
    cor = {"manha": "#ffffff", "tarde": "#ffb894", "noite": "#2a3a6e"}[nome]
    ceu = ceu + (hexa(cor) - ceu) * (np.floor(forma * 4) / 4 * 0.5)[:, :, None]
    if nome == "noite":
        g = np.random.default_rng(5)
        for _ in range(230):
            x, y = int(g.random() * W), int(g.random() ** 1.5 * 104)
            k = 0.35 + g.random() * 0.65
            ceu[y, x] = np.clip(ceu[y, x] + hexa(("#ffffff", "#cfe0ff", "#ffe8c0")[int(g.random() * 3)]) * k, 0, 1.4)
            if k > 0.9:                                                                # estrela grande, em cruz
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= y + dy < H and 0 <= x + dx < W:
                        ceu[y + dy, x + dx] += 0.35
    return ceu.astype(np.float32)


def pintar_serras(nome: str) -> Camada:
    c = Camada()
    for (seed, base, amp, tom, neve) in ((21, 74, 30, 0.34, 0.5), (22, 92, 24, 0.2, 0.22)):
        crista = base - amp * (0.55 * ruido(seed, 70)[0] + 0.3 * ruido(seed + 1, 26)[0] + 0.15 * ruido(seed + 2, 9)[0])
        crista = crista + 5 * np.abs(np.sin(np.arange(W) / 23.0 + seed))
        m = YA >= crista[None, :]
        prof = (YA - crista[None, :]) / 40
        face = ruido_ret(seed + 5, 7, 20) * 0.5 + ruido(seed + 6, 5) * 0.2                # ravinas que descem
        v = tom + 0.3 * face - prof * 0.12 + np.where(prof < neve * (0.55 + 0.6 * ruido(seed + 7, 10)), 0.42, 0.0)
        pintar(c, m & (YA < 122), SERRA, v)
    return c


def pinheirinho(c: Camada, cx: float, yb: float, alt: float, seed: int, tom: float = 0.0) -> None:
    """Pinheiro pequeno da mata: saias de galhos em degraus, mais claro em cima de cada saia."""
    n = max(3, int(alt / 5))
    for i in range(n):
        y1 = yb - alt * i / n
        y0 = y1 - alt / n * 1.5
        meia = (alt * 0.3) * (1 - i / n) + 1
        for y in range(int(y0), int(y1) + 1):
            k = (y - y0) / max(1, y1 - y0)
            w = meia * k
            for x in range(int(cx - w), int(cx + w) + 1):
                v = tom + 0.25 + 0.3 * (1 - k) - 0.18 * ((x - cx) / (w + 1)) + (h01(x, y, seed) - 0.5) * 0.2
                c.p(x, y, PINHO[int(np.clip(v, 0, 0.99) * len(PINHO))])
    c.ret(cx - 0.5, yb, 1, 2, MADEIRA[1])


def pintar_mata() -> Camada:
    c = Camada()
    g = np.random.default_rng(31)
    for fila, (yb, alt, tom) in enumerate(((104, 14, -0.12), (110, 19, -0.04), (116, 24, 0.04))):
        x = -6.0
        while x < W + 6:
            pinheirinho(c, x, yb + g.random() * 3, alt * (0.7 + g.random() * 0.6), int(x) * 7 + fila, tom)
            x += 5 + g.random() * 8
    return c


# ─────────────────────────────── as casas ───────────────────────────────
def casa(c: Camada, e: Camada, x0: int, x1: int, y_beiral: int, cume: int, seed: int, porta: bool, per: dict, guirlanda: bool = False) -> list:
    """Casa de enxaimel: sapata de pedra, reboco com vigas, telhado de duas águas com telha por telha, chaminé,
    janelas de vidraça (a luz de dentro vai para `e`) e a porta. Devolve as janelas acesas (x, y) para as poças de luz."""
    luzes = []
    larg = x1 - x0
    meio = (x0 + x1) / 2
    # parede
    for y in range(y_beiral, CHAO + 1):
        for x in range(x0, x1):
            if y > CHAO - 9:                                                             # sapata de pedra
                bx, by = (x + ((y // 4) % 2) * 4) // 8, y // 4
                v = 0.3 + 0.4 * h01(bx, by, seed) + (0.14 if y % 4 == 1 else -0.12 if y % 4 == 3 else 0)
                c.p(x, y, PEDRA[int(np.clip(v, 0, 0.99) * len(PEDRA))] if (x + ((y // 4) % 2) * 4) % 8 and y % 4 else PEDRA[0])
            else:
                v = 0.62 + 0.2 * h01(x // 3, y // 3, seed) - 0.25 * (y - y_beiral < 4) + (h01(x, y, seed + 1) - 0.5) * 0.12
                c.p(x, y, REBOCO[int(np.clip(v, 0, 0.99) * len(REBOCO))])
    # vigas do enxaimel: montantes, travessas e as cruzes de Santo André
    travessa = (y_beiral + CHAO - 9) // 2
    for vx in range(x0, x1 + 1, max(14, larg // max(2, larg // 16))):
        c.ret(min(vx, x1 - 2), y_beiral, 2, CHAO - 9 - y_beiral, MADEIRA[2]); c.ret(min(vx, x1 - 2), y_beiral, 1, CHAO - 9 - y_beiral, MADEIRA[4])
    for vy in (y_beiral, travessa, CHAO - 10):
        c.ret(x0, vy, larg, 2, MADEIRA[2]); c.ret(x0, vy, larg, 1, MADEIRA[4])
    passo = max(14, larg // max(2, larg // 16))
    for i, vx in enumerate(range(x0, x1 - passo + 1, passo)):
        if i % 2 == seed % 2:
            for k in range(passo - 2):
                yy = travessa + 2 + k * (CHAO - 12 - travessa) / (passo - 2)
                c.p(vx + 2 + k, yy, MADEIRA[3]); c.p(vx + passo - 1 - k, yy, MADEIRA[2])
    # janelas (duas fileiras) e a porta
    jan_w, jan_h = 9, 11
    vagas = [vx + (passo - jan_w) // 2 + 1 for vx in range(x0, x1 - passo + 1, passo)]
    for fila, jy in enumerate((y_beiral + 5, travessa + 5)):
        for i, jx in enumerate(vagas):
            if fila == 1 and porta and i == len(vagas) // 2:
                continue
            if fila == 1 and (i + seed) % 2 == 0 and not porta:
                continue
            acesa = h01(jx, jy, seed) < 0.72
            c.ret(jx - 1, jy - 1, jan_w + 2, jan_h + 2, MADEIRA[1]); c.ret(jx - 1, jy - 1, jan_w + 2, 1, MADEIRA[5])
            for yy in range(jan_h):
                for xx in range(jan_w):
                    grade = xx == jan_w // 2 or yy == jan_h // 2
                    cortina = acesa and (xx < 2 - yy // 4 or xx > jan_w - 3 + yy // 4)
                    vidro = "#1a2438" if not acesa else "#c8703a" if cortina else ("#ffd27a", "#ffbe5c", "#ffe9a6")[int(h01(xx // 2, yy // 2, jx) * 3)]
                    c.p(jx + xx, jy + yy, MADEIRA[2] if grade else vidro)
                    if acesa and not grade:
                        e.p(jx + xx, jy + yy, vidro, per["jan_k"] * 0.42)
            if acesa:
                luzes.append((jx + jan_w / 2, jy + jan_h / 2))
                c.ret(jx + 1, jy + 6, 3, 4, "#7a4a1e", 0.55)                              # um vulto de móvel lá dentro
            c.ret(jx - 2, jy + jan_h + 1, jan_w + 4, 2, MADEIRA[3]); c.ret(jx - 2, jy + jan_h + 1, jan_w + 4, 1, MADEIRA[6])   # peitoril
            if fila == 0 and (i + seed) % 2:                                             # floreira
                for xx in range(jan_w + 2):
                    c.p(jx - 1 + xx, jy + jan_h, ("#c8404a", "#e8a0a8", "#3e703a", "#548644")[int(h01(xx, jx, 9) * 4)])
            for lado in (-3, jan_w + 1):                                                 # folhas da veneziana
                c.ret(jx + lado, jy, 2, jan_h, "#28503c"); c.ret(jx + lado, jy, 1, jan_h, "#3c6e50")
    if porta:
        px, pw = vagas[len(vagas) // 2] - 1, 11
        c.ret(px - 1, CHAO - 22, pw + 2, 22, MADEIRA[1])
        for xx in range(pw):
            for yy in range(20):
                c.p(px + xx, CHAO - 20 + yy, MADEIRA[3 + (xx // 3) % 2] if yy % 7 else MADEIRA[1])
        c.ret(px, CHAO - 21, pw, 1, MADEIRA[6]); c.p(px + pw - 3, CHAO - 10, "#f4c64a"); c.p(px + pw - 3, CHAO - 9, "#a8661a")
        c.ret(px - 2, CHAO, pw + 4, 2, PEDRA[5]); c.ret(px - 2, CHAO, pw + 4, 1, PEDRA[7])   # soleira
        if guirlanda:                                                                    # o toque de Natal: guirlanda com laço
            gx, gy = px + pw // 2, CHAO - 15
            for a in range(0, 360, 20):
                rx, ry = gx + round(math.cos(math.radians(a)) * 3.4), gy + round(math.sin(math.radians(a)) * 3.4)
                c.p(rx, ry, PINHO[4 + (a // 20) % 3]); c.p(rx, ry - 1 if a % 40 else ry, PINHO[6])
            for (dx, dy) in ((-3, 0), (3, 1), (0, -3)):
                c.p(gx + dx, gy + dy, "#e8304a"); e.p(gx + dx, gy + dy, "#ff5a6a", 0.25 * per["luzes_k"])
            c.p(gx - 1, gy + 4, "#c81e34"); c.p(gx + 1, gy + 4, "#c81e34"); c.p(gx, gy + 3, "#ff6a7a"); c.p(gx - 1, gy + 5, "#8a1424"); c.p(gx + 1, gy + 5, "#8a1424")
        # lanterna ao lado da porta
        c.ret(px + pw + 3, CHAO - 19, 3, 4, "#2a2a30"); c.p(px + pw + 4, CHAO - 18, "#ffd27a"); e.p(px + pw + 4, CHAO - 18, "#ffc860", per["jan_k"])
        luzes.append((px + pw + 4, CHAO - 14))
    # telhado: duas águas com as fiadas de telha em escama
    for y in range(cume, y_beiral + 3):
        k = (y - cume) / max(1, y_beiral + 2 - cume)
        meia = 3 + (larg / 2 + 4) * k
        for x in range(int(meia * -1 + meio), int(meio + meia) + 1):
            fiada = (y - cume) // 3
            col = (x + (fiada % 2) * 2) // 4
            dentro = (y - cume) % 3
            v = 0.42 + 0.3 * h01(col, fiada, seed + 3) - 0.16 * dentro + 0.1 * (x < meio) - 0.1 * k
            c.p(x, y, TELHA[int(np.clip(v, 0, 0.99) * len(TELHA))] if (x + (fiada % 2) * 2) % 4 else TELHA[0])
        c.p(meio - meia, y, TELHA[6]); c.p(meio + meia, y, TELHA[0])
    c.ret(meio - 2, cume - 1, 5, 2, TELHA[5]); c.ret(meio - 2, cume - 1, 5, 1, TELHA[6])
    c.ret(x0 - 5, y_beiral + 2, larg + 10, 1, MADEIRA[0])                                 # sombra do beiral
    # chaminé de pedra
    chx = int(meio + larg * 0.22)
    for y in range(cume - 9, cume + 8):
        for x in range(chx, chx + 7):
            v = 0.35 + 0.4 * h01(x // 3, y // 3, seed + 5) + (0.12 if x == chx else -0.12 if x == chx + 6 else 0)
            c.p(x, y, PEDRA[int(np.clip(v, 0, 0.99) * len(PEDRA))])
    c.ret(chx - 1, cume - 10, 9, 2, PEDRA[6]); c.ret(chx - 1, cume - 9, 9, 1, PEDRA[2])
    luzes.append(("fumaca", chx + 3, cume - 11))
    # hera subindo por um canto, folha por folha
    lado = x0 if seed % 2 else x1 - 1
    for k in range(int((CHAO - y_beiral) * 2.6)):
        yy = CHAO - 9 - h01(k, seed, 31) * (CHAO - 12 - y_beiral)
        xx = lado + (h01(k, seed, 32) * 9 * (1 if seed % 2 else -1)) * (1 - (CHAO - yy) / (CHAO - y_beiral + 8))
        c.p(xx, yy, PINHO[3 + int(h01(k, seed, 33) * 4)])
    if larg > 80:
        # água-furtada no telhado, com a janelinha acesa
        dx0, dy0 = int(meio - 22), cume + 12
        c.ret(dx0, dy0, 11, 9, REBOCO[4]); c.ret(dx0, dy0, 11, 1, MADEIRA[2]); c.ret(dx0 + 3, dy0 + 2, 5, 6, "#ffd27a"); c.ret(dx0 + 5, dy0 + 2, 1, 6, MADEIRA[2])
        for xx in range(3, 8):
            e.p(dx0 + xx, dy0 + 4, "#ffd27a", per["jan_k"] * 0.42)
        for k in range(8):
            c.ret(dx0 - 2 + k, dy0 - 1 - min(k, 7 - k) - 1, 8 - 0, 1, TELHA[4]) if k == 0 else None
        for k in range(-7, 8):
            c.p(dx0 + 5 + k, dy0 - 6 + abs(k) * 6 // 7, TELHA[5]); c.p(dx0 + 5 + k, dy0 - 5 + abs(k) * 6 // 7, TELHA[2])
        # festão de pinho com laços vermelhos ao longo do beiral (o toque de Natal)
        for xx in range(x0 - 3, x1 + 4):
            yy = y_beiral + 3 + round(abs(math.sin((xx - x0) / 16 * math.pi)) * 3)
            c.p(xx, yy, PINHO[4 + (xx % 3)]); c.p(xx, yy + 1, PINHO[2 + (xx % 2)])
            if (xx - x0) % 16 == 0:
                c.ret(xx - 1, yy - 1, 3, 2, "#c81e34"); c.p(xx, yy - 1, "#ff6a7a"); c.p(xx - 1, yy + 1, "#8a1424"); c.p(xx + 1, yy + 1, "#8a1424")
    else:
        # placa de ferro pendurada (a taverna), com o braço em voluta
        sx, sy = (x1 if seed % 2 else x0 - 12), y_beiral + 8
        c.ret(sx, sy, 12, 1, "#2a2a32"); c.p(sx + 2, sy + 1, "#2a2a32"); c.p(sx + 9, sy + 1, "#2a2a32")
        c.ret(sx + 1, sy + 2, 10, 8, MADEIRA[3]); c.ret(sx + 1, sy + 2, 10, 1, MADEIRA[6]); c.ret(sx + 1, sy + 9, 10, 1, MADEIRA[1])
        c.ret(sx + 4, sy + 4, 4, 4, "#f4c64a"); c.p(sx + 4, sy + 4, "#fff0b0"); c.ret(sx + 5, sy + 3, 2, 1, "#f4c64a"); c.p(sx + 8, sy + 5, "#a8661a")
    return luzes


# ─────────────────────────────── o pinheiro da praça ───────────────────────────────
def pinheiro_praca(c: Camada, e: Camada, per: dict) -> list:
    """O pinheiro grande: tronco, saias de galhos pendentes agulha por agulha, o fio de luzinhas em espiral, poucas
    bolas, a estrela no alto e três presentes ao pé. Devolve os pontos de luz."""
    cx, yb = PINHEIRO
    alt = 104
    pontos = []
    c.ret(cx - 3, yb - 12, 6, 12, MADEIRA[2]); c.ret(cx - 3, yb - 12, 2, 12, MADEIRA[4]); c.ret(cx + 2, yb - 12, 1, 12, MADEIRA[0])
    n = 9
    for i in range(n):
        y1 = yb - 8 - (alt - 12) * i / n
        y0 = y1 - (alt - 12) / n * 1.7
        meia = 34 * (1 - i / n) ** 0.85 + 3
        for y in range(int(y0), int(y1) + 1):
            k = min(1.0, max(0.0, (y - y0) / max(1, y1 - y0)))
            w = meia * k ** 0.8
            for x in range(int(cx - w), int(cx + w) + 1):
                u = (x - cx) / (w + 1)
                franja = k > 0.82 and h01(x, i, 4) < 0.45                                # pontas dos galhos, irregulares
                if franja and h01(x, y, 5) < 0.5:
                    continue
                v = 0.3 + 0.34 * (1 - k) - 0.2 * u + (h01(x, y, 6) - 0.5) * 0.24 + 0.1 * math.sin(x * 0.9 + i)
                c.p(x, y, PINHO[int(np.clip(v, 0, 0.99) * len(PINHO))])
        c.ret(cx - meia * 0.9, y1 + 1, meia * 1.8, 1, PINHO[0], 0.55)                      # sombra debaixo da saia
    # fio de luzinhas: quatro voltas descendo, uma lâmpada a cada 5 px
    cores = ("#ffe9a6", "#ffd27a", "#ff7a6a", "#ffe9a6", "#8ad0ff", "#ffd27a")
    j = 0
    for volta in range(5):
        ya = yb - alt + 20 + volta * 16
        meia = 9 + volta * 6.2
        for s in range(0, int(meia * 2), 1):
            x = cx - meia + s
            y = ya + 7 * (s / (meia * 2)) + math.sin(s / (meia * 2) * math.pi) * 2
            c.p(x, y, "#16241a", 0.6)
            if s % 5 == 2:
                cor = cores[j % len(cores)]; j += 1
                c.p(x, y + 1, cor); e.p(x, y + 1, cor, per["luzes_k"]); pontos.append((x, y + 1, cor))
    for (dx, dy, cor) in ((-12, -48, "#e8304a"), (9, -62, "#f4c64a"), (-20, -28, "#f4c64a"), (17, -36, "#e8304a"), (4, -22, "#3a7aff"), (-6, -74, "#e8304a")):
        x, y = cx + dx, yb + dy
        c.ret(x - 1, y - 1, 3, 3, cor); c.p(x - 1, y - 1, "#ffffff"); c.p(x + 1, y + 1, "#3a0a12", 0.5); c.p(x, y - 2, "#c8a468")
    # a estrela do alto
    ex, ey = cx, yb - alt + 1
    for (dx, dy) in ((0, -3), (0, -2), (-1, -1), (0, -1), (1, -1), (-3, 0), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (3, 0), (-1, 1), (0, 1), (1, 1), (-2, 2), (2, 2), (0, 2)):
        c.p(ex + dx, ey + dy, "#ffe27a"); e.p(ex + dx, ey + dy, "#fff0b0", per["luzes_k"])
    c.p(ex, ey, "#ffffff"); pontos.append((ex, ey, "#fff0b0")); pontos.append((ex, ey, "#fff0b0"))
    # presentes: caixa, tampa, fita em cruz e laço
    for (px, pw, ph, cor, fita) in ((cx - 30, 13, 10, "#b0242c", "#f4c64a"), (cx - 15, 10, 8, "#28607a", "#f2e8cc"), (cx + 12, 12, 11, "#2e6a3a", "#e8304a")):
        py = yb + 3 - ph
        c.ret(px, py, pw, ph, cor); c.ret(px, py, pw, 2, hexa(cor) * 1.35); c.ret(px + pw - 2, py + 2, 2, ph - 2, hexa(cor) * 0.6); c.ret(px, py + ph - 1, pw, 1, hexa(cor) * 0.5)
        c.ret(px + pw // 2 - 1, py, 2, ph, fita); c.ret(px, py + 3, pw, 1, fita)
        c.p(px + pw // 2 - 2, py - 1, fita); c.p(px + pw // 2 + 1, py - 1, fita); c.p(px + pw // 2 - 3, py - 2, fita); c.p(px + pw // 2 + 2, py - 2, fita)
    return pontos


# ─────────────────────────────── o chão e os objetos ───────────────────────────────
def pintar_chao() -> Camada:
    """Calçamento em perspectiva: fiadas que crescem para a frente e pedras de largura desigual, cada uma com tom e
    matiz próprios (umas mais quentes, outras azuladas), topo claro, junta funda com terra e musgo, cantos
    arredondados, e o caminho de pedras gastas que vai da fogueira até a frente. Em volta da fogueira, a fuligem."""
    c = Camada()
    y, fiada = CHAO, 0
    while y < H:
        alt = max(2, int(2 + (y - CHAO) * 0.06))
        x = -h01(fiada, 1) * 9
        n = 0
        while x < W:
            larg = max(3.0, (3.6 + (y - CHAO) * 0.085) * (0.6 + 0.9 * h01(fiada, n, 2)))
            tom = 0.3 + 0.3 * h01(fiada, n, 3)
            matiz = h01(fiada, n, 4)
            tinta = np.array([1.07, 1.0, 0.9]) if matiz < 0.3 else np.array([0.92, 0.97, 1.07]) if matiz > 0.75 else np.array([1.0, 1.0, 1.0])
            x0, x1 = int(round(x)), int(round(x + larg))
            for yy in range(y, min(H, y + alt)):
                for xx in range(max(0, x0), min(W, x1)):
                    caminho = math.exp(-((xx - (240 + (yy - 146) * 0.25)) / (28 + (yy - CHAO) * 0.5)) ** 2)
                    fuligem = math.exp(-(((xx - FOGO[0]) / 30) ** 2 + ((yy - FOGO[1] - 3) / 10) ** 2))
                    t = tom + 0.12 * caminho - 0.2 * fuligem
                    ultima_l, ultima_c = yy == y + alt - 1, xx == x1 - 1
                    canto = (yy == y and xx == x0) and alt > 2
                    if ultima_l or ultima_c or canto:
                        junta = h01(xx, yy, 7)
                        cor = hexa("#243c1c") if junta > 0.9 else hexa("#2a2018") if junta > 0.6 else PEDRA[1]
                    else:
                        if yy == y:
                            t += 0.13
                        elif xx == x0:
                            t += 0.07
                        elif yy == y + alt - 2 and alt > 3:
                            t -= 0.1
                        cor = PEDRA[int(np.clip(t + (h01(xx, yy, 3) - 0.5) * 0.12, 0, 0.99) * len(PEDRA))] * tinta
                    c.p(xx, yy, np.clip(cor, 0, 1))
            x += larg
            n += 1
        y += alt
        fiada += 1
    g = np.random.default_rng(41)
    for _ in range(90):                                                                 # folhas secas, pedrinhas e tufos de capim nas juntas
        x, yy = int(g.random() * W), int(CHAO + 6 + g.random() * (H - CHAO - 8))
        if 210 < x < 270 and 130 < yy < 158:
            continue
        if g.random() < 0.35:
            for k in range(3):
                c.p(x + k - 1, yy - (k == 1), PINHO[4 + k % 3])
        else:
            cor = ("#a8661a", "#7a4a1e", "#c8922a", "#58422e")[int(g.random() * 4)]
            c.p(x, yy, cor); c.p(x + 1, yy, hexa(cor) * 0.7)
    for (px, py, rw) in ((286, 182, 13), (204, 190, 10), (360, 176, 9)):                 # poças rasas que espelham o céu
        for yy in range(py - 2, py + 3):
            for xx in range(px - rw, px + rw + 1):
                if ((xx - px) / rw) ** 2 + ((yy - py) / 2.4) ** 2 < 1 - 0.3 * h01(xx, yy, 21):
                    c.p(xx, yy, "#3a4a66", 0.75)
        c.ret(px - rw // 2, py - 1, rw // 2, 1, "#9ab0d0", 0.6)
    return c


def fogueira(c: Camada, e: Camada) -> None:
    """Anel de pedras grandes (as de trás, mais escuras; as da frente, com a face para a câmera), lenha cruzada,
    cinza e brasas. A chama animada entra por cima, na âncora."""
    fx, fy = FOGO
    c.mascara(elipse(fx, fy + 2, 17, 5), "#1a1210")                                       # o leito de cinza
    for a in sorted(range(0, 360, 20), key=lambda a: math.sin(math.radians(a))):
        x, y = fx + math.cos(math.radians(a)) * 19, fy + 2 + math.sin(math.radians(a)) * 6.4
        tras = math.sin(math.radians(a)) < -0.2
        rw, rh = 4 + (a // 20) % 2, 3 + (a // 40) % 2
        for dy in range(-rh, 3):
            for dx in range(-rw, rw + 1):
                if (dx / (rw + 0.4)) ** 2 + (dy / (rh + 0.6)) ** 2 < 1:
                    borda = (dx / (rw + 0.4)) ** 2 + (dy / (rh + 0.6)) ** 2 > 0.62 and dy > -rh + 1
                    v = 0.3 + 0.16 * h01(a, 1) - 0.1 * dy - 0.07 * dx / rw - (0.14 if tras else 0) + (h01(x + dx, y + dy, 8) - 0.5) * 0.1 - (0.16 if borda else 0)
                    quente = (0.07 if dx * math.cos(math.radians(a)) < 0 else 0)             # a face virada para as brasas
                    cor = PEDRA[int(np.clip(v, 0, 0.99) * len(PEDRA))] * 0.82 + np.array([quente, quente * 0.45, 0])
                    c.p(x + dx, y + dy, np.clip(cor, 0, 1))
        c.p(x - rw, y + 2, PEDRA[0]); c.p(x + rw, y + 2, PEDRA[0])
    for (x0, y0, x1, y1) in ((fx - 12, fy + 2, fx + 9, fy - 5), (fx + 12, fy + 2, fx - 9, fy - 4), (fx - 5, fy + 4, fx + 7, fy - 6), (fx + 4, fy + 4, fx - 8, fy - 5)):
        for k in range(24):
            t = k / 23
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            c.ret(x, y - 1, 2, 3, MADEIRA[2]); c.p(x, y - 1, MADEIRA[5]); c.p(x + 1, y + 1, "#2a0c04")
            if k % 5 == 0:
                c.p(x, y, "#f06018"); e.p(x, y, "#ff8a30", 0.6)
        c.ret(x0 - 1, y0 - 1, 2, 3, MADEIRA[6]); c.p(x0, y0, MADEIRA[3])
    for k in range(22):
        x, y = fx - 9 + h01(k, 3) * 18, fy + h01(k, 4) * 4
        cor = ("#fff0b0", "#ffb040", "#f06018", "#a82808")[int(h01(k, 5) * 4)]
        c.p(x, y, cor); e.p(x, y, cor, 0.9)


def banco(c: Camada, x0: int, yb: int) -> None:
    for (dx, alt) in ((1, 7), (26, 7)):
        c.ret(x0 + dx, yb - alt, 3, alt, MADEIRA[2]); c.ret(x0 + dx, yb - alt, 1, alt, MADEIRA[4])
    for k in range(3):                                                                  # encosto de três ripas
        c.ret(x0, yb - 20 + k * 4, 30, 3, MADEIRA[4 - k % 2]); c.ret(x0, yb - 20 + k * 4, 30, 1, MADEIRA[6]); c.ret(x0, yb - 18 + k * 4, 30, 1, MADEIRA[1])
    c.ret(x0 - 1, yb - 9, 32, 3, MADEIRA[5]); c.ret(x0 - 1, yb - 9, 32, 1, MADEIRA[7]); c.ret(x0 - 1, yb - 7, 32, 1, MADEIRA[1])
    for dx in (4, 14, 24):
        c.p(x0 + dx, yb - 8, MADEIRA[1])
    c.ret(x0 + 8, yb - 12, 9, 3, "#8a1a2a"); c.ret(x0 + 8, yb - 12, 9, 1, "#c84a4a"); c.ret(x0 + 11, yb - 12, 1, 3, "#f2e8cc")   # manta dobrada


def poste(c: Camada, e: Camada, per: dict) -> None:
    x, yb = POSTE
    c.ret(x - 3, yb - 3, 7, 3, PEDRA[3]); c.ret(x - 3, yb - 3, 7, 1, PEDRA[6])
    for y in range(yb - 62, yb - 3):
        c.p(x - 1, y, "#3a3a44"); c.p(x, y, "#22222a"); c.p(x + 1, y, "#101016")
        if y % 13 == 0:
            c.ret(x - 2, y, 5, 1, "#4a4a56")
    for k in range(9):                                                                  # braço em voluta
        c.p(x + 1 + k, yb - 62 - round(math.sin(k / 8 * math.pi) * 3), "#2a2a32")
    lx, ly = x + 10, yb - 60
    c.ret(lx - 3, ly - 1, 7, 1, "#16161c"); c.ret(lx - 2, ly, 5, 8, "#2a2a32"); c.ret(lx - 3, ly + 8, 7, 1, "#16161c"); c.p(lx, ly - 2, "#16161c")
    for yy in range(1, 7):
        for xx in (-1, 0, 1):
            cor = ("#fff0b0", "#ffd27a", "#ffb850")[abs(xx) + (yy > 4)]
            c.p(lx + xx, ly + yy, cor); e.p(lx + xx, ly + yy, cor, per["jan_k"])
    c.ret(x - 6, yb - 46, 5, 6, PINHO[4]); c.p(x - 4, yb - 44, "#e8304a"); c.p(x - 5, yb - 47, PINHO[6])   # raminho com fita no poste


def poco(c: Camada) -> None:
    x, yb = POCO
    for y in range(yb - 14, yb + 1):                                                    # mureta redonda de pedra
        for dx in range(-14, 15):
            if abs(dx) <= 14 - (1 if y in (yb - 14, yb) else 0):
                bx = (dx + 14 + ((y // 4) % 2) * 3) // 6
                v = 0.3 + 0.36 * h01(bx, y // 4, 12) + 0.24 * math.cos(dx / 14 * 1.4) - 0.2 + (0.12 if y % 4 == 1 else 0)
                c.p(x + dx, y, PEDRA[0] if y % 4 == 0 or (dx + 14 + ((y // 4) % 2) * 3) % 6 == 0 else PEDRA[int(np.clip(v, 0, 0.99) * len(PEDRA))])
    c.ret(x - 15, yb - 16, 31, 2, PEDRA[6]); c.ret(x - 15, yb - 16, 31, 1, PEDRA[7]); c.ret(x - 11, yb - 15, 22, 1, "#0a0e18")
    for lado in (-13, 12):
        c.ret(x + lado, yb - 40, 2, 25, MADEIRA[3]); c.p(x + lado, yb - 40, MADEIRA[6])
    for k in range(-17, 18):                                                            # telhadinho de tábuas
        alt = 6 - abs(k) * 6 // 18
        c.ret(x + k, yb - 42 - alt, 1, alt + 2, TELHA[3 + (k // 3) % 2]); c.p(x + k, yb - 42 - alt, TELHA[6])
    c.ret(x - 12, yb - 34, 25, 2, MADEIRA[2]); c.ret(x - 12, yb - 34, 25, 1, MADEIRA[5])
    for y in range(yb - 32, yb - 22):
        c.p(x + 2, y, "#c8b48a" if y % 2 else "#8a7650")                                 # corda
    c.ret(x - 1, yb - 22, 7, 6, MADEIRA[4]); c.ret(x - 1, yb - 22, 7, 1, MADEIRA[7]); c.ret(x - 1, yb - 19, 7, 1, "#4a4a56"); c.ret(x + 5, yb - 21, 1, 5, MADEIRA[1])


def miudezas(c: Camada) -> None:
    # barril e caixotes ao lado da casa da esquerda
    bx, by = 196, 132
    for y in range(by - 14, by + 1):
        w = 5 + round(1.4 * math.sin((y - by + 14) / 14 * math.pi))
        for dx in range(-w, w + 1):
            v = 0.45 + 0.3 * math.cos(dx / w * 1.3) - 0.25 + 0.1 * ((dx + 9) // 3 % 2)
            c.p(bx + dx, y, "#3a3a44" if y in (by - 11, by - 3) else MADEIRA[int(np.clip(v + 0.3, 0, 0.99) * len(MADEIRA))])
    c.ret(bx - 5, by - 15, 11, 1, MADEIRA[7])
    for (x, y, s) in ((206, 132, 10), (209, 122, 8)):
        c.ret(x, y - s, s, s, MADEIRA[4]); c.ret(x, y - s, s, 1, MADEIRA[7]); c.ret(x + s - 1, y - s, 1, s, MADEIRA[1]); c.ret(x, y - 1, s, 1, MADEIRA[1])
        c.linha(x + 1, y - s + 1, x + s - 2, y - 2, MADEIRA[2]); c.ret(x, y - s // 2, s, 1, MADEIRA[2])
    # pilha de lenha com as pontas à mostra
    for i in range(4):
        for j in range(4 - i):
            x, y = 300 + j * 5 + i * 2.5, 178 - i * 4
            c.ret(x, y - 3, 4, 4, MADEIRA[3]); c.p(x + 1, y - 2, MADEIRA[7]); c.p(x + 2, y - 1, MADEIRA[6]); c.p(x, y - 3, MADEIRA[1]); c.p(x + 3, y, MADEIRA[0])
    # carrinho de mão com abóboras e um saco
    x, y = 428, 150
    c.ret(x, y - 8, 22, 6, MADEIRA[4]); c.ret(x, y - 8, 22, 1, MADEIRA[7]); c.ret(x, y - 3, 22, 1, MADEIRA[1])
    for dx in range(0, 22, 4):
        c.ret(x + dx, y - 8, 1, 6, MADEIRA[2])
    c.linha(x + 22, y - 6, x + 31, y - 10, MADEIRA[3]); c.ret(x + 3, y - 2, 2, 4, MADEIRA[2])
    for a in range(0, 360, 30):
        c.p(x + 17 + round(math.cos(math.radians(a)) * 3), y + round(math.sin(math.radians(a)) * 3), "#2a2a32")
    c.p(x + 17, y, MADEIRA[6])
    for (dx, cor) in ((3, "#e07a20"), (9, "#c85a14")):
        c.ret(x + dx, y - 12, 5, 4, cor); c.p(x + dx + 1, y - 12, "#ffb060"); c.p(x + dx + 2, y - 13, "#3e703a"); c.p(x + dx + 4, y - 9, hexa(cor) * 0.6)
    c.ret(x + 14, y - 13, 6, 5, "#b8a886"); c.ret(x + 14, y - 13, 6, 1, "#e8dcbc"); c.p(x + 17, y - 14, "#7a6a50")


def varal(c: Camada, e: Camada, per: dict, x0: float, y0: float, x1: float, y1: float) -> list:
    """Varal de lampadinhas de uma casa à outra, em catenária."""
    pts = []
    n = int(x1 - x0)
    cores = ("#ffe9a6", "#ff8a6a", "#ffd27a", "#8ad0ff", "#ffe9a6", "#9be08a")
    for i in range(n + 1):
        t = i / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + math.sin(t * math.pi) * 11
        c.p(x, y, "#141a22", 0.7)
        if i % 7 == 3:
            cor = cores[(i // 7) % len(cores)]
            c.p(x, y + 1, cor); c.p(x, y + 2, cor); e.p(x, y + 1, cor, per["luzes_k"]); e.p(x, y + 2, cor, per["luzes_k"] * 0.8)
            pts.append((x, y + 2, cor))
    return pts


def pintar_frente() -> Camada:
    """Primeiro plano (fica desfocado e escuro): um galho de pinheiro no canto de cima, com uma fita, e moitas embaixo."""
    c = Camada()
    for k in range(60):
        x0, y0 = -4 + k * 2.3, 4 + k * 0.42 + math.sin(k * 0.5) * 2
        for j in range(9):
            c.p(x0 + j * 0.5, y0 + j * 1.3, PINHO[1 + (k + j) % 3]); c.p(x0 - j * 0.3, y0 + j * 1.5, PINHO[(k + j) % 3])
    c.ret(96, 44, 4, 4, "#8a1424"); c.p(97, 43, "#c8a468")
    g = np.random.default_rng(9)
    for (cx, larg, alt) in ((30, 60, 26), (452, 70, 30), (120, 40, 12)):
        for _ in range(int(larg * alt * 0.7)):
            u = g.random() * 2 - 1
            y = H - g.random() * alt * (1 - u * u)
            c.p(cx + u * larg / 2, y, PINHO[int(g.random() * 3)])
    return c


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    ceu = pintar_ceu(nome, per)
    serras, mata = pintar_serras(nome), pintar_mata()
    casas, obj, em = Camada(), Camada(), Camada()
    luzes = []
    luzes += casa(casas, em, 132, 214, 70, 44, 3, False, per)
    luzes += casa(casas, em, 330, 426, 60, 30, 8, True, per, guirlanda=True)
    luzes += casa(casas, em, 434, 492, 74, 50, 5, False, per)
    # muro baixo entre as casas, com um portão aberto para o vale
    for x in range(214, 330):
        if 252 <= x <= 292:
            continue
        for y in range(106, CHAO + 1):
            v = 0.3 + 0.36 * h01((x + ((y // 3) % 2) * 3) // 7, y // 3, 14) + (0.14 if y % 3 == 1 else 0)
            casas.p(x, y, PEDRA[0] if y % 3 == 0 else PEDRA[int(np.clip(v, 0, 0.99) * len(PEDRA))])
        casas.p(x, 105, PEDRA[6]); casas.p(x, 104, PEDRA[4] if x % 5 else PEDRA[1])
    for px in (249, 293):
        casas.ret(px, 98, 4, 19, PEDRA[4]); casas.ret(px, 98, 1, 19, PEDRA[6]); casas.ret(px - 1, 96, 6, 2, PEDRA[6]); casas.ret(px + 1, 93, 2, 3, PEDRA[5])
    for x in range(0, 132):                                                             # mureta que fecha a praça à esquerda
        for y in range(108, CHAO + 1):
            v = 0.26 + 0.34 * h01((x + ((y // 3) % 2) * 3) // 7, y // 3, 15) + (0.12 if y % 3 == 1 else 0)
            casas.p(x, y, PEDRA[0] if y % 3 == 0 else PEDRA[int(np.clip(v, 0, 0.99) * len(PEDRA))])
        casas.p(x, 107, PEDRA[5]); casas.p(x, 106, PEDRA[3] if x % 6 else PEDRA[1])
    # o carvalho velho da praça: tronco torto com casca em veios, galhos e a copa em tufos
    for y in range(34, CHAO + 1):
        t = (CHAO - y) / (CHAO - 34)
        cx_ = 58 + math.sin(t * 2.6) * 7
        meia = 7.5 - 4.5 * t
        for x in range(int(cx_ - meia), int(cx_ + meia) + 1):
            u = (x - cx_) / (meia + 0.5)
            v = 0.42 - 0.3 * u + 0.16 * math.sin(x * 1.7 + y * 0.35) + (h01(x, y, 51) - 0.5) * 0.16
            casas.p(x, y, MADEIRA[int(np.clip(v, 0, 0.99) * 6)])
    for (bx, by, ex, ey) in ((60, 62, 92, 40), (56, 56, 24, 34), (62, 46, 78, 20), (58, 44, 44, 16)):
        for k in range(40):
            t = k / 39
            x, y = bx + (ex - bx) * t, by + (ey - by) * t - math.sin(t * math.pi) * 4
            casas.ret(x, y, max(1, 3 - int(t * 3)), max(1, 3 - int(t * 2.5)), MADEIRA[2 + (k % 2)])
    g2 = np.random.default_rng(61)
    for (tx, ty, tr) in ((92, 36, 17), (24, 30, 16), (78, 16, 15), (44, 12, 16), (60, 26, 15), (8, 44, 12), (108, 22, 11)):
        for _ in range(int(tr * tr * 2.2)):
            a_, r_ = g2.random() * 6.283, tr * g2.random() ** 0.6
            x, y = tx + math.cos(a_) * r_, ty + math.sin(a_) * r_ * 0.72
            v = 0.34 - 0.3 * math.sin(a_) * (r_ / tr) + (g2.random() - 0.5) * 0.3
            casas.p(x, y, PINHO[int(np.clip(v, 0, 0.99) * len(PINHO))])
    pts_varal = varal(casas, em, per, 212, 66, 332, 62)
    chao = pintar_chao()
    poco(obj); miudezas(obj); banco(obj, 176, 170); poste(obj, em, per)
    pts_pinheiro = pinheiro_praca(obj, em, per)
    fogueira(obj, em)
    frente = pintar_frente()

    amb, sol = hexa(per["amb"]) * per["amb_k"], hexa(per["sol"]) * per["sol_k"]
    nev = hexa(per["nevoa"])
    img = ampliar(ceu)
    # o astro e o halo dele
    ax, ay = per["astro"]
    halo = luz_pontual(ax, ay, 46)[:, :, None]
    img = img + halo * hexa(per["sol"]) * (0.55 if nome != "noite" else 0.3)
    disco = (np.hypot(GXa - ax, GYa - ay) < (7 if nome != "noite" else 6))[:, :, None]
    if nome == "noite":
        crateras = ampliar((ruido(8, 2.6) > 0.56)[:, :, None].astype(np.float32))
        img = np.where(disco, hexa("#eef2ff") * (0.95 - 0.2 * crateras) * (1 - 0.25 * np.clip((GXa - ax + GYa - ay) / 12, 0, 1))[:, :, None], img)
    else:
        img = np.where(disco, hexa("#fffbe8"), img)

    def luz_de(camada: Camada, k_sol: float, nevoa: float, desf: float = 0.0) -> np.ndarray:
        a = ampliar(camada.c)
        if desf:
            a = desfocar_rgba(a, desf)
        rgb = a[:, :, :3] * (amb + sol * k_sol)
        rgb = rgb + (nev * (0.5 + 0.5 * per["amb_k"]) - rgb) * nevoa * per["nevoa_k"]
        return np.concatenate([rgb, a[:, :, 3:4]], 2)

    img = sobre(img, luz_de(serras, 0.7, 0.62, 1.6))
    img = sobre(img, luz_de(mata, 0.45, 0.42, 1.0))
    vis_ceu = 1 - np.clip(ampliar(serras.c[:, :, 3:4]) + ampliar(mata.c[:, :, 3:4]) + ampliar(casas.c[:, :, 3:4]) + ampliar(obj.c[:, :, 3:4]), 0, 1)[:, :, 0]
    # névoa do vale atrás do muro
    banda = np.exp(-((GYa - 108) / 9) ** 2) * (0.5 + 0.5 * ampliar(ruido_ret(17, 60, 6)[:, :, None])[:, :, 0])
    img = img + (nev - img) * (banda * 0.55 * per["nevoa_k"])[:, :, None]

    # ── o chão: luz ambiente e do sol, sombras projetadas, oclusão de contato e as poças de luz
    alfa_obj = np.maximum(obj.c[:, :, 3], casas.c[:, :, 3])
    base = np.full((H, W), -1, np.float32)
    for (x0, x1, yb) in ((132, 214, CHAO), (330, 426, CHAO), (434, 480, CHAO), (214, 330, CHAO), (PINHEIRO[0] - 36, PINHEIRO[0] + 36, PINHEIRO[1]), (POSTE[0] - 3, POSTE[0] + 14, POSTE[1]),
                         (POCO[0] - 18, POCO[0] + 18, POCO[1]), (176, 207, 170), (188, 220, 132), (298, 322, 178), (426, 462, 152)):
        m = (XA >= x0) & (XA < x1) & (YA <= yb) & (alfa_obj > 0.4) & (base < 0)
        base[m] = yb
    if per["sombra"]:
        somb = projetar_sombra(alfa_obj, base, per["sombra"])
    else:
        def do_fogo(xs, b):
            dx, dy = xs - FOGO[0], b - FOGO[1]
            d = np.maximum(np.hypot(dx, dy * 2.2), 1)
            return dx / d * 1.5, np.clip(dy * 2.2 / d, -1, 1) * 0.5
        somb = projetar_sombra(alfa_obj, base, do_fogo)
    somb = desfocar(ampliar(somb[:, :, None]), 2.4)[:, :, 0] * (YA.repeat(ESC, 0).repeat(ESC, 1) > CHAO)
    contato = desfocar(ampliar(np.roll(alfa_obj, 2, 0)[:, :, None]), 3)[:, :, 0]
    ch = ampliar(chao.c)
    prof = np.clip((GYa - CHAO) / (H - CHAO), 0, 1)
    luz_chao = amb[None, None, :] * (0.8 + 0.3 * prof[:, :, None]) + sol[None, None, :] * (0.75 * (1 - 0.72 * somb))[:, :, None]
    luz_chao = luz_chao * (1 - 0.42 * contato)[:, :, None]
    fogo_l = luz_em_degraus(FOGO[0], FOGO[1] + 4, 96, 0.36, 7) * per["fogo_k"]
    luz_chao = luz_chao + fogo_l[:, :, None] * hexa("#ffa040") * 1.5 * (1 - 0.5 * somb * (nome == "noite"))[:, :, None]
    jan = np.zeros_like(fogo_l)
    fumacas = []
    for l in luzes:
        if l[0] == "fumaca":
            fumacas.append(l[1:]); continue
        jan += luz_em_degraus(l[0], CHAO + 12 + (l[1] - 70) * 0.2, 26, 0.42, int(l[0])) * 0.5
    jan += luz_em_degraus(POSTE[0] + 10, POSTE[1] + 4, 44, 0.4, 3) * 0.9
    luz_chao = luz_chao + jan[:, :, None] * hexa("#ffc468") * per["jan_k"] * 0.9
    pin = luz_em_degraus(PINHEIRO[0], PINHEIRO[1] + 6, 58, 0.36, 5)
    luz_chao = luz_chao + pin[:, :, None] * hexa("#ffd890") * per["luzes_k"] * 0.42
    img = sobre(img, np.concatenate([ch[:, :, :3] * luz_chao, ch[:, :, 3:4]], 2))

    # ── casas e objetos: a mesma luz, com o fogo e as luzes batendo de lado
    for camada, k_sol, nevoa in ((casas, 0.8, 0.1), (obj, 0.9, 0.0)):
        a = ampliar(camada.c)
        lado = np.clip(1 - np.hypot(GXa - FOGO[0], (GYa - FOGO[1] + 10) * 1.3) / 150, 0, 1) ** 1.6 * per["fogo_k"]
        luz = (amb + sol * k_sol)[None, None, :] + lado[:, :, None] * hexa("#ffa850") * 0.6
        luz = luz + luz_pontual(POSTE[0] + 10, POSTE[1] - 56, 34)[:, :, None] * hexa("#ffc468") * per["jan_k"] * 0.9
        luz = luz + luz_pontual(PINHEIRO[0], PINHEIRO[1] - 52, 46, 1.5)[:, :, None] * hexa("#ffd890") * per["luzes_k"] * 0.5
        rgb = a[:, :, :3] * luz
        rgb = rgb + (nev - rgb) * nevoa * per["nevoa_k"]
        img = sobre(img, np.concatenate([rgb, a[:, :, 3:4]], 2))

    # ── emissivos: janelas, lampadinhas, brasas (o próprio pixel e o halo)
    emi = ampliar(em.c)
    emi_rgb = emi[:, :, :3] * emi[:, :, 3:4]
    img = img + emi_rgb * 0.8 + desfocar(emi_rgb, 4) * 0.9 + desfocar(emi_rgb, 14) * 0.7
    for (x, y, cor) in pts_varal + pts_pinheiro:                                         # estrelinha de cada lâmpada
        X, Y = int(x * ESC + 1), int(y * ESC + 1)
        for d in range(-4, 5):
            k = (1 - abs(d) / 5) ** 2 * 0.55 * per["luzes_k"]
            if 0 <= Y + d < H * ESC and 0 <= X + d < W * ESC:
                img[Y + d, X] += hexa(cor) * k; img[Y, X + d] += hexa(cor) * k

    # ── fumaça das chaminés e feixes de luz com poeira
    fum = np.zeros((H * ESC, W * ESC), np.float32)
    for (fx, fy) in fumacas:
        for k in range(70):
            t = k / 70
            x, y = fx + math.sin(t * 7 + fx) * (1 + t * 5) + t * 14, fy - t * 42
            X, Y = int(x * ESC), int(y * ESC)
            if 4 < Y < H * ESC - 6 and 6 < X < W * ESC - 8:
                fum[Y - 3:Y + 4, X - 4:X + 5] += (1 - t) * (0.3 + t) * 0.5
    fum = desfocar(fum[:, :, None], 7)[:, :, 0]
    img = img + (hexa(per["fumaca"]) - img) * np.clip(fum * 0.5, 0, 0.7)[:, :, None]
    poe = ampliar(ruido(19, 14)[:, :, None])[:, :, 0]
    if nome != "noite":
        brilho = np.exp(-np.hypot(GXa - ax, (GYa - ay) * 1.2) / 7)
        raios = raios_de_luz((vis_ceu * (0.35 + brilho * 3)).astype(np.float32), (ax, ay), passos=80, alcance=0.96, queda=0.972)
        raios = desfocar(raios[:, :, None], 4)[:, :, 0]
        img += raios[:, :, None] * hexa(per["sol"]) * (1.5 if nome == "tarde" else 1.0)
        peso = raios * 2.2 * (0.5 + poe) * np.clip((GYa - 70) / 40, 0, 1)
    else:
        f = facho(ax, ay, 232, 150, 8, 40, 1.2) * (0.5 + 0.5 * poe) * 0.9
        f = desfocar(f[:, :, None], 4)[:, :, 0]
        img += f[:, :, None] * hexa("#7a9ae8") * 0.2
        peso = f + fogo_l * 0.5
    g = np.random.default_rng(83)
    cor_p = hexa({"manha": "#fff4d0", "tarde": "#ffd8a0", "noite": "#ffd8a0"}[nome])
    for _ in range(1300):
        X, Y = int(g.random() * (W * ESC - 4)), int(g.random() * (H * ESC - 4))
        k = peso[Y, X] * (0.3 + g.random() * 0.8)
        if k > 0.05:
            tam = 2 if g.random() < 0.7 else 3
            img[Y:Y + tam, X:X + tam] += cor_p * k

    # ── primeiro plano desfocado e escuro, e o acabamento (o mesmo do acampamento)
    fr = desfocar_rgba(ampliar(frente.c), 5)
    k_fr = {"manha": 0.5, "tarde": 0.4, "noite": 0.3}[nome]
    img = sobre(img, fr * np.array([k_fr, k_fr, k_fr * 1.05, 1], dtype=np.float32))
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.85) * 5, 0, 1), 0, 2)
    img = img + desfocar(claro, 12) * 0.4 + desfocar(claro, 36) * 0.3
    joelho = 0.72
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, fr_ = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (fr_ * 0.5 + 0.5)))
    img = np.clip((img - 0.48) * 1.08 + 0.48, 0, 1.2)
    xn, yn = GX / (W * ESC), GY / (H * ESC)
    calma = ((1 - suave(0.26, 0.46, xn)) * (1 - suave(0.42, 0.62, yn)))[:, :, None]      # a área do título
    media = desfocar(np.clip(img, 0, 1.2), 16)
    img = media + (img - media) * (1 - 0.4 * calma)
    img *= 1 - 0.2 * calma
    v = (xn - 0.5) ** 2 * 1.3 + (yn - 0.6) ** 2 * 1.6
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.1)[:, :, None]
    gg = np.random.default_rng(99)
    img += (gg.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.014
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


ANCORAS = {
    # gato: canto de cima à esquerda da caixa de 36 x 22 px (arte), sempre em chão livre ou em cima de algo firme
    "gato": [{"x": 222, "y": 153, "pose": "fogueira"}, {"x": 174, "y": 139, "pose": "sentado"}, {"x": 262, "y": 170, "pose": "repouso"},
             {"x": 330, "y": 164, "pose": "observando"}, {"x": 204, "y": 174, "pose": "repouso"}],
    # coruja: o ponto dos pés: o telhadinho do poço, o encosto do banco, o caixote, o presente e a pilha de lenha
    "coruja": [{"x": 166, "y": 102}, {"x": 198, "y": 150}, {"x": 213, "y": 114}, {"x": 396, "y": 150}, {"x": 308, "y": 162}],
    # dragão: o ponto dos pés, no calçamento livre da frente, à direita (ele olha para a fogueira)
    "dragao": {"x": 392, "y": 174},
    "particulas": "vagalumes",
}


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    nomes = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in nomes:
        t0 = time.time()
        img = montar(nome)
        img.save(PASTA / f"cena-praca-{nome}.webp", quality=84, method=6)
        img.resize((960, 400), Image.LANCZOS).save(PASTA / f"cena-praca-{nome}-960.webp", quality=82, method=6)
        print(nome, (PASTA / f"cena-praca-{nome}.webp").stat().st_size // 1024, "KB", f"{time.time() - t0:.1f}s")
    (Path(__file__).resolve().parent / "cena-praca.json").write_text(json.dumps(ANCORAS, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
