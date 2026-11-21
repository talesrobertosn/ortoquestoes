"""A árvore de Natal da página inicial (modo Natal, docs/design/MODO-NATAL.md), refeita em 21/11/2026.

Pedido do Tales: "a arte precisa ser perfeita, em tudo". A primeira versão (enfeites.py) parecia adesivo: ruído em vez
de galho, verdes lavados, neve demais. Esta usa exatamente a técnica das cenas aprovadas do topo (o pinheiro da Praça,
scripts/cenarios/inicio_praca.py): pintura em pixel art na grade de 480 x 200 com as paletas escuras e ricas do site,
montagem em 3x com a luz calculada por pixel (cada lâmpada ilumina os galhos em volta), brilho em três raios, curva de
tom e correção de cor quente/fria. Nada baixado, nada de IA; as referências do Tales só deram o clima.

O que tem, de cima para baixo:
- a estrela facetada de cinco pontas, com núcleo branco, raios finos e luz que desce pela copa;
- sete saias de galhos pendentes (agulha por agulha, veio diagonal, ponta clara de broto novo, sombra funda debaixo de
  cada saia, um pouco de neve só nas pontas de cima, do lado da luz);
- o fio de lâmpadas em espiral (cinco cores), cada lâmpada com o próprio pixel aceso e a luz batendo no galho;
- o cordão de contas douradas em barrigas, bolas de vidro com reflexo e gancho, laços de veludo vermelho;
- o tronco, o balde de madeira com aros de ferro e rebites, a saia xadrez;
- quatro presentes (papel com estampa, tampa, fita com dobra, laço e etiqueta), um deles entreaberto com brilho;
- a sombra de contato no chão.

Saídas em public/pixel/natal/ (3 px por pixel da arte, o mesmo das cenas):
  arvore.png      a árvore (RGBA)
  arvore-luz.png  a luz que ela joga em volta (RGBA para mix-blend-mode: screen), com margem para a luz morrer suave
  arvore-estrela.png  o brilho da estrela, que pulsa no CSS
Uso: python3 scripts/natal/arvore.py
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
from gerar_cena_inicio import ESC, GXa, GYa, H, W, XA, YA, Camada, ampliar, desfocar, hexa, luz_pontual, pal, poli, pontilhar, ruido  # noqa: E402

SAIDA = RAIZ / "public" / "pixel" / "natal"

# As paletas das cenas aprovadas (inicio_praca.py), com o verde do pinheiro estendido para o broto claro.
PINHO = pal("#050f0b", "#081a12", "#0d2418", "#12301e", "#183c24", "#1f4a2a", "#285a30", "#336c36", "#43803e", "#5a9648")
MADEIRA = pal("#1e120a", "#30200f", "#463018", "#5e4222", "#7a582e", "#94703c", "#ae8a4e", "#c8a468")
FERRO = pal("#16181c", "#262a30", "#3a3f46", "#566068", "#7c868c", "#a8b0b4")
OURO = pal("#4a2c08", "#6e4612", "#94641c", "#b8862a", "#d8a83c", "#f0c85a", "#ffe28a", "#fff4c8")
VERMELHO = pal("#2c0608", "#4a0c10", "#6e1418", "#941e22", "#b82c2c", "#d8443a", "#f06a54", "#ff9a7c")
NEVE = pal("#5a6a8a", "#7c8cac", "#a2b0cc", "#c8d2e6", "#e6ecf6", "#ffffff")
XADREZ = ("#7a1418", "#a82024", "#f2e8cc", "#1c3a26")

# Lâmpadas do fio: cor do vidro aceso e da luz.
LUZES = ("#ffd27a", "#ff6a56", "#ffe9a6", "#6ab8ff", "#ffb04a", "#8af0b8")

CX, YB = 120, 140            # o pé do tronco (onde o balde encosta no chão), na grade 480 x 200
ALT = 92                    # da ponta da estrela ao chão


def h01(*v) -> float:
    n = 0
    for i, x in enumerate(v):
        n = (n * 73856093) ^ (int(x) * 19349663 + i * 83492791)
    n = (n ^ (n >> 13)) * 1274126177
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535


def tom(paleta: np.ndarray, v: float) -> np.ndarray:
    return paleta[int(np.clip(v, 0, 0.999) * len(paleta))]


# ───────────────────────────────────────────── a copa
SAIAS = 7
TOPO_COPA = YB - ALT + 9      # onde começa o galho mais alto (logo abaixo da estrela)
BASE_COPA = YB - 17           # a última saia termina acima do balde


def saia(i: int) -> tuple[float, float, float]:
    """(y de cima, y de baixo, meia largura no fim) da saia i, de cima (0) para baixo."""
    passo = (BASE_COPA - TOPO_COPA) / SAIAS
    y1 = TOPO_COPA + passo * (i + 1) + 1
    y0 = TOPO_COPA + passo * i - passo * 0.7 * (i > 0) - 1
    meia = 4.5 + 25 * ((i + 1) / SAIAS) ** 0.92
    return y0, y1, meia


def pontas(i: int) -> list[tuple[float, float]]:
    """As pontas dos galhos da saia i (x, y): mais pontas nas saias de baixo; as de fora caem mais (galho pesado)."""
    y0, y1, meia = saia(i)
    n = 3 + i
    pts = []
    for j in range(n + 1):
        t = j / n
        u = -1 + 2 * t
        x = CX + u * meia + (h01(i, j, 3) - 0.5) * 1.6 * (0 < j < n)
        y = y1 + abs(u) ** 1.6 * 2.4 + (h01(i, j, 4) - 0.5) * 1.2
        pts.append((x, y))
    return pts


MASCARA_COPA = np.zeros((H, W), bool)


def pintar_copa(c: Camada) -> None:
    """Cada saia é um leque de galhos: um polígono do ponto de cima até as pontas, com vales entre elas. Tom por galho
    (crista clara, vão escuro), luz de cima à esquerda, pontilhado ordenado como nas cenas, e as saias pintadas de baixo
    para cima, cada uma jogando a sombra dela na de baixo."""
    global MASCARA_COPA
    textura = ruido(71, 2.2) * 0.6 + ruido(72, 5) * 0.4
    for i in reversed(range(SAIAS)):
        y0, y1, meia = saia(i)
        pts = pontas(i)
        contorno = [(CX, y0)]
        for j, (x, y) in enumerate(pts):
            contorno.append((x, y))
            if j < len(pts) - 1:
                xn, yn = pts[j + 1]
                contorno.append(((x + xn) / 2, min(y, yn) - 2.2 - h01(i, j, 8)))   # o vão entre dois galhos
        m = poli(contorno)
        # tom: altura na saia, lado, crista do galho mais próximo e textura de agulha
        k = np.clip((YA - y0) / max(1, y1 - y0), 0, 1)
        u = np.clip((XA - CX) / meia, -1.2, 1.2)
        angs = [math.atan2(x - CX, y - y0) for x, y in pts]
        ang = np.arctan2(XA - CX, YA - y0)
        dist = np.min(np.stack([np.abs(ang - a) for a in angs]), 0)
        passo = (max(angs) - min(angs)) / max(1, len(angs) - 1)
        crista = 1 - np.clip(dist / (passo * 0.5 + 1e-3), 0, 1)          # 1 no meio do galho, 0 no vão
        v = 0.5 + 0.22 * (1 - k) - 0.24 * u + 0.16 * (crista - 0.5) - 0.12 * k * (1 - crista)
        v = v + (textura - 0.5) * 0.22 + 0.05 * np.sin(XA * 1.3 - YA * 0.9)
        c.mascara(m, PINHO[pontilhar(np.clip(v * 0.94, 0, 1), len(PINHO), 0.85)])
        # a quina de luz: o pixel de cima à esquerda de cada borda um tom acima
        borda = m & ~np.roll(m, 1, 1) & (XA < CX + meia * 0.2)
        c.mascara(borda, PINHO[7])
        # brotos claros nas pontas e a ponta caída um pixel abaixo
        for x, y in pts:
            c.p(x, y - 1, PINHO[8 if x < CX else 6]); c.p(x, y, PINHO[7 if x < CX else 5])
        # a sombra desta saia na de baixo (pintada antes): uma faixa escura logo abaixo da franja
        abaixo = np.roll(m, 2, 0) & ~m & MASCARA_COPA
        c.c[abaixo, :3] *= 0.42
        abaixo2 = np.roll(m, 3, 0) & ~np.roll(m, 2, 0) & ~m & MASCARA_COPA
        c.c[abaixo2, :3] *= 0.7
        MASCARA_COPA = MASCARA_COPA | m


def dentro(x, y, margem=1) -> bool:
    x, y = int(x), int(y)
    return bool(MASCARA_COPA[y - margem:y + margem + 1, x - margem:x + margem + 1].all())


# ───────────────────────────────────────────── os enfeites
def fio_de_luzes(c: Camada, e: Camada) -> list:
    """O fio em espiral: desce em voltas pela frente da copa; uma lâmpada a cada 4 px, cores em rodízio."""
    pontos = []
    j = 0
    voltas = 5
    for v in range(voltas):
        ya = TOPO_COPA + 7 + v * (BASE_COPA - TOPO_COPA - 10) / voltas
        yb = ya + (BASE_COPA - TOPO_COPA - 10) / voltas * 0.75
        _, _, meia_a = saia(int((ya - TOPO_COPA) / (BASE_COPA - TOPO_COPA) * SAIAS))
        meia = meia_a * 0.86
        da_esq = v % 2 == 0
        n = int(meia * 2)
        for s in range(n + 1):
            t = s / max(n, 1)
            x = CX - meia + 2 * meia * (t if da_esq else 1 - t)
            y = ya + (yb - ya) * t + math.sin(t * math.pi) * 2.6
            if not dentro(x, y + 1, 0):
                continue
            c.p(x, y, "#0a140e", 0.75)
            if s % 4 == 2 and dentro(x, y + 2, 1):
                cor = LUZES[j % len(LUZES)]; j += 1
                c.p(x, y + 1, cor); e.p(x, y + 1, cor)
                c.p(x, y + 2, hexa(cor) * 0.55)
                pontos.append((x, y + 1.5, cor))
    return pontos


def contas_douradas(c: Camada) -> None:
    """O cordão de contas: barrigas curtas de um lado a outro de cada saia, conta sim, conta não com brilho."""
    for i in (1, 3, 5):
        y0, y1, meia = saia(i)
        yy = y0 + (y1 - y0) * 0.62
        w = meia * 0.78
        for s in range(int(w * 2) + 1):
            t = s / (w * 2)
            x = CX - w + s
            y = yy + math.sin(t * math.pi) * 3.2 - t * 1.5
            if s % 2 == 0 and dentro(x, y + 1, 0):
                c.p(x, y, tom(OURO, 0.75 if s % 4 == 0 else 0.55))
                c.p(x, y + 1, tom(OURO, 0.22))


CORES_BOLAS = ("#c8262c", "#2a5ac8", "#d8a028", "#b8c4d0", "#c8262c", "#d8a028", "#2a8a60")


def bolas(c: Camada) -> list:
    """Bolas de vidro penduradas nas pontas dos galhos (como numa árvore de verdade): gancho, tampinha dourada, corpo
    em quatro tons, reflexo em cima à esquerda e borda escura embaixo à direita. Algumas no meio da saia."""
    pontos = []
    n = 0
    for i in range(1, SAIAS - 1):
        for j, (tx, ty) in enumerate(pontas(i)):
            if h01(i, j, 40) > 0.42 or j in (0, len(pontas(i)) - 1):
                continue
            x, y = tx, ty + 2.6
            n += 1
            cor = CORES_BOLAS[(i * 3 + j) % len(CORES_BOLAS)]
            pontos.append(bola(c, x, y, cor, 1.5 + 0.35 * (i > 3)))
            c.p(tx, ty + 0.6, tom(FERRO, 0.5), 0.8)
    for i, dx, k in ((2, -6, 0.62), (4, 9, 0.55), (5, -12, 0.6), (6, 4, 0.5), (3, 3, 0.45)):
        y0, y1, meia = saia(i)
        x, y = CX + dx, y0 + (y1 - y0) * k
        if dentro(x, y, 2):
            pontos.append(bola(c, x, y, CORES_BOLAS[i % len(CORES_BOLAS)], 1.6))
    return pontos


def bola(c: Camada, x, y, cor, r) -> tuple:
    base = hexa(cor)
    for yy in range(int(y - r - 1), int(y + r + 2)):
        for xx in range(int(x - r - 1), int(x + r + 2)):
            d = math.hypot(xx + 0.5 - x, yy + 0.5 - y)
            if d > r + 0.2:
                continue
            luz = -(xx + 0.5 - x) * 0.34 - (yy + 0.5 - y) * 0.38
            fator = 0.5 + 0.38 * luz - 0.22 * (d / r) ** 2
            c.p(xx, yy, np.clip(base * (0.72 + fator), 0, 1))
    c.p(x - 1, y - 1, "#ffffff", 0.85)
    c.p(x + 1, y + 1, base * 0.32)
    c.p(x, y - r - 0.6, tom(OURO, 0.8))
    return (x, y, cor)


def lacos(c: Camada) -> None:
    """Laços de veludo nas pontas de algumas saias: duas alças, nó e duas caudas curtas."""
    for dx, i, kk in ((-8, 2, 0.5), (11, 4, 0.45), (-15, 5, 0.5), (4, 1, 0.55), (16, 6, 0.4)):
        y0, y1, meia = saia(i)
        x, y = CX + dx, int(y0 + (y1 - y0) * kk)
        if not dentro(x, y, 2):
            continue
        for (ax, ay, v) in ((-2, -1, 0.75), (-1, -1, 0.85), (-2, 0, 0.55), (-1, 0, 0.6), (1, -1, 0.65), (2, -1, 0.55), (1, 0, 0.45), (2, 0, 0.35),
                            (0, 0, 0.9), (-1, 1, 0.5), (-1, 2, 0.35), (1, 1, 0.4), (2, 2, 0.25)):
            c.p(x + ax, y + ay, tom(VERMELHO, v))


def estrela(c: Camada, e: Camada) -> tuple:
    """Estrela de cinco pontas de 9 px, facetada: cada ponta com a metade da luz clara e a outra mais escura."""
    ex, ey = CX, YB - ALT + 5
    raio, interno = 4.6, 1.9
    for yy in range(ey - 6, ey + 6):
        for xx in range(ex - 6, ex + 7):
            ang = math.atan2(yy - ey, xx - ex) + math.pi / 2
            setor = (ang % (2 * math.pi / 5)) / (2 * math.pi / 5)
            lim = interno + (raio - interno) * (1 - abs(setor - 0.5) * 2) ** 1.3
            d = math.hypot(xx - ex, yy - ey)
            if d <= lim + 0.25:
                lado = setor < 0.5
                v = 0.78 - d / raio * 0.3 + (0.14 if lado else -0.12) - (yy - ey) * 0.03
                c.p(xx, yy, tom(OURO, v))
                if d < 2.2:
                    e.p(xx, yy, tom(OURO, 0.92))
    c.p(ex, ey, "#ffffff"); c.p(ex - 1, ey - 1, tom(OURO, 0.99)); e.p(ex, ey, "#fff4c8")
    c.p(ex, ey + 5, tom(OURO, 0.3)); c.p(ex, ey + 6, tom(OURO, 0.2))   # a ponteira que encaixa no galho
    return ex, ey


# ───────────────────────────────────────────── o pé
def tronco_e_balde(c: Camada) -> None:
    for y in range(BASE_COPA - 2, YB - 9):
        for x in range(CX - 2, CX + 3):
            c.p(x, y, tom(MADEIRA, 0.28 + 0.2 * (x == CX - 1) - 0.14 * (x == CX + 2) + 0.06 * math.sin(y * 1.3)))
    # o balde: madeira em ripas verticais, um pouco cônico, com dois aros de ferro rebitados e a borda de cima
    topo, base = YB - 10, YB
    for y in range(topo, base + 1):
        t = (y - topo) / (base - topo)
        meia = 7 - 1.4 * t
        for x in range(int(CX - meia), int(CX + meia) + 1):
            u = (x - CX) / meia
            ripa = (x - int(CX - meia)) % 3 == 0
            v = 0.55 - 0.35 * u - 0.12 * t + (0.0 if not ripa else -0.14) + (h01(x, y, 61) - 0.5) * 0.08
            c.p(x, y, tom(MADEIRA, v))
        if y in (topo + 2, base - 2):
            for x in range(int(CX - meia), int(CX + meia) + 1):
                u = (x - CX) / meia
                c.p(x, y, tom(FERRO, 0.55 - 0.4 * u))
            c.p(int(CX - meia) + 2, y, tom(FERRO, 0.95)); c.p(int(CX + meia) - 2, y, tom(FERRO, 0.4))
    for x in range(CX - 8, CX + 9):
        c.p(x, topo - 1, tom(MADEIRA, 0.7 - 0.04 * abs(x - CX))); c.p(x, topo, tom(MADEIRA, 0.3))
    # a fita de veludo vermelho em volta do balde, com o laço na frente
    yf = topo + 5
    for x in range(CX - 7, CX + 8):
        u = (x - CX) / 7
        c.p(x, yf, tom(VERMELHO, 0.62 - 0.3 * u)); c.p(x, yf + 1, tom(VERMELHO, 0.4 - 0.25 * u))
    for (ax, ay, v) in ((-3, -1, 0.8), (-2, -2, 0.9), (-2, -1, 0.7), (-1, -1, 0.6), (1, -1, 0.5), (2, -2, 0.7), (2, -1, 0.5), (3, -1, 0.4),
                        (0, -1, 0.95), (0, 0, 0.85), (-1, 2, 0.5), (-1, 3, 0.35), (1, 2, 0.4), (1, 3, 0.25)):
        c.p(CX + ax, yf + ay, tom(VERMELHO, v))
    # terra escura com agulhas caídas na boca do balde
    for x in range(CX - 6, CX + 7):
        c.p(x, topo - 1, "#1a120c" if (x + topo) % 3 else tom(PINHO, 0.3))


PRESENTES = [  # x (esquerda), largura, altura, papel, fita, estampa
    (CX - 27, 13, 9, ("#4a0c12", "#7a1418", "#a82024", "#c83a34", "#e86a54"), "#f0c85a", "bolinhas"),
    (CX - 15, 8, 6, ("#0c2a3a", "#164a62", "#226a86", "#3a8aa6", "#6ab0c8"), "#f2e8cc", "listras"),
    (CX + 9, 12, 8, ("#14301c", "#1e4a2a", "#2a6a3a", "#3e8a4c", "#62a868"), "#e8304a", "xadrez"),
    (CX + 20, 9, 11, ("#5a3a08", "#8a5c12", "#b8862a", "#d8a83c", "#f0c85a"), "#b82c2c", "estrelas"),
]


def presentes(c: Camada, e: Camada) -> list:
    pontos = []
    for n, (px, pw, ph, papel, fita, estampa) in enumerate(PRESENTES):
        py = YB + 1 - ph
        for y in range(py, YB + 1):
            for x in range(px, px + pw):
                u = (x - px) / (pw - 1)
                v = 0.62 - 0.42 * u - (0.12 if y == YB else 0)
                cor = papel[int(np.clip(v, 0, 0.99) * 5)]
                if estampa == "bolinhas" and (x + 2 * y) % 4 == 0 and y % 2 == 0:
                    cor = hexa("#f0c85a") * (0.6 + 0.4 * (1 - u))
                elif estampa == "listras" and (x + y) % 4 == 0:
                    cor = hexa("#f2e8cc") * (0.55 + 0.4 * (1 - u))
                elif estampa == "xadrez" and (x % 3 == 0 or y % 3 == 0):
                    cor = hexa(papel[1]) if x % 3 else hexa(papel[3])
                elif estampa == "estrelas" and (x * 5 + y * 3) % 11 == 0:
                    cor = hexa("#fff4c8")
                c.p(x, y, cor)
        # tampa: um pixel mais larga dos dois lados, topo claro
        for x in range(px - 1, px + pw + 1):
            c.p(x, py - 1, papel[4] if x < px + pw * 0.6 else papel[3]); c.p(x, py, papel[2] if x < px + pw * 0.5 else papel[1])
        # fita em cruz com a dobra (um pixel claro na beira de luz)
        mx = px + pw // 2
        for y in range(py - 1, YB + 1):
            c.p(mx - 1, y, hexa(fita)); c.p(mx, y, hexa(fita) * 0.72)
        for x in range(px - 1, px + pw + 1):
            c.p(x, py + ph // 2, hexa(fita) * (0.95 if x < mx else 0.7))
        # laço: duas alças em gota e as pontas
        for (ax, ay, k) in ((-3, -2, 1.0), (-2, -3, 1.0), (-2, -2, 0.85), (-1, -2, 0.7), (1, -2, 0.7), (2, -3, 0.85), (2, -2, 0.75), (3, -2, 0.6),
                            (0, -2, 1.1), (-1, -1, 0.8), (1, -1, 0.6)):
            c.p(mx + ax - 1, py + ay, np.clip(hexa(fita) * k, 0, 1))
        if n == 0:                                                   # a etiqueta de papel com o barbante
            c.p(px + pw - 2, py + 2, "#f2e8cc"); c.p(px + pw - 1, py + 2, "#d4c8ae"); c.p(px + pw - 2, py + 3, "#d4c8ae"); c.p(px + pw - 3, py + 1, "#8a7a5a")
        if n == 3:                                                   # o entreaberto: a tampa levantada e o brilho saindo
            for x in range(px - 1, px + pw + 1):
                c.p(x, py - 3, papel[4]); c.p(x, py - 2, papel[2])
            for x in range(px + 1, px + pw - 1):
                c.p(x, py - 1, "#fff0b0"); e.p(x, py - 1, "#ffd88a")
            pontos.append((px + pw / 2, py - 1, "#ffd88a"))
    return pontos


def sombra_no_chao(c: Camada) -> None:
    """A sombra de contato no chão: mais escura colada no balde e nos presentes, abrindo e clareando para os lados."""
    for x in range(CX - 36, CX + 37):
        u = (x - CX) / 36
        a = 0.62 * (1 - u * u) ** 0.8
        c.p(x, YB + 1, "#05080a", a); c.p(x, YB + 2, "#05080a", a * 0.5); c.p(x, YB + 3, "#05080a", a * 0.22)


# ───────────────────────────────────────────── montagem
def montar():
    c, e = Camada(), Camada()
    pintar_copa(c)
    contas_douradas(c)
    pts = fio_de_luzes(c, e)
    pts_bolas = bolas(c)
    lacos(c)
    ex, ey = estrela(c, e)
    tronco_e_balde(c)
    pts += presentes(c, e)
    sombra_no_chao(c)

    a = ampliar(c.c)
    # A luz que chega nos galhos: ambiente fria e baixa, a estrela de cima, e cada lâmpada acesa em volta dela.
    amb = hexa("#8a9ab8") * 0.62
    luz = np.zeros((H * ESC, W * ESC, 3), np.float32) + amb
    luz += luz_pontual(ex, ey + 6, 22, 1.2)[:, :, None] * hexa("#ffd890") * 0.9
    luz += luz_pontual(CX - 12, YB - 60, 60, 1.4)[:, :, None] * hexa("#fff0d6") * 0.35       # luz de cima à esquerda
    for (x, y, cor) in pts:
        luz += luz_pontual(x, y, 5.5)[:, :, None] * hexa(cor) * 1.05
    luz += luz_pontual(CX, YB - 12, 30, 0.5)[:, :, None] * hexa("#ffc070") * 0.55            # a luz da árvore nos presentes
    for (x, y, cor) in pts_bolas:                                                          # o reflexo das lâmpadas no vidro
        luz += luz_pontual(x - 0.6, y - 0.6, 1.4)[:, :, None] * 0.5
    rgb = a[:, :, :3] * luz
    emi = ampliar(e.c)
    emi_rgb = emi[:, :, :3] * emi[:, :, 3:4]
    # o pixel aceso, com um brilho curto que fica dentro da silhueta
    rgb = rgb + emi_rgb * 1.1 + desfocar(emi_rgb, 2.5) * 0.7 * a[:, :, 3:4]
    # a estrelinha em cruz de cada lâmpada e da estrela (como na Praça)
    for (x, y, cor) in pts + [(ex, ey, "#fff4c8")] * 2:
        X, Y = int(x * ESC + 1), int(y * ESC + 1)
        for d in range(-4, 5):
            k = (1 - abs(d) / 5) ** 2 * 0.5
            rgb[Y + d, X] += hexa(cor) * k
            rgb[Y, X + d] += hexa(cor) * k
    # curva de tom e cor (as mesmas das cenas)
    joelho = 0.72
    rgb = np.where(rgb < joelho, rgb, joelho + (1 - joelho) * (1 - np.exp(-(rgb - joelho) / (1 - joelho))))
    lum = np.clip(rgb.mean(2, keepdims=True), 0, 1)
    q, f = hexa("#ffcf8a"), hexa("#16204a")
    rgb = rgb * (0.8 + 0.2 * (lum * q + (1 - lum) * (f * 0.5 + 0.5)))
    rgb = np.clip((rgb - 0.48) * 1.1 + 0.48, 0, 1)

    # recorte da árvore: x CX-36..CX+36, y da estrela ao chão
    x0, x1, y0, y1 = (CX - 36) * ESC, (CX + 37) * ESC, (YB - ALT - 2) * ESC, (YB + 4) * ESC
    arvore = np.concatenate([rgb, a[:, :, 3:4]], 2)[y0:y1, x0:x1]
    Image.fromarray((np.clip(arvore, 0, 1) * 255).astype(np.uint8)).save(SAIDA / "arvore.png", optimize=True)

    # A luz que a árvore joga em volta: halo das lâmpadas e da estrela, largo e suave, morrendo antes da borda.
    halo = desfocar(emi_rgb, 6) * 1.2 + desfocar(emi_rgb, 18) * 1.6 + desfocar(emi_rgb, 40) * 1.4
    halo += luz_pontual(CX, YB - 40, 46, 1.3)[:, :, None] * hexa("#ffb860") * 0.16
    m = 40
    lx0, lx1, ly0, ly1 = x0 - m * ESC, x1 + m * ESC, max(0, y0 - m * ESC), y1 + 12 * ESC
    hl = halo[ly0:ly1, lx0:lx1]
    hh, ww = hl.shape[:2]
    jy = np.clip(np.minimum(np.arange(hh), hh - 1 - np.arange(hh)) / (hh * 0.25), 0, 1)[:, None] ** 1.5
    jx = np.clip(np.minimum(np.arange(ww), ww - 1 - np.arange(ww)) / (ww * 0.25), 0, 1)[None, :] ** 1.5
    hl = hl * (jy * jx)[:, :, None]
    lumh = hl.max(2)
    alfa = np.clip(lumh * 1.3, 0, 0.9)
    cor = np.where(lumh[:, :, None] > 1e-4, hl / np.maximum(lumh[:, :, None], 1e-4), 0)
    Image.fromarray((np.dstack([np.clip(cor, 0, 1), alfa]) * 255).astype(np.uint8)).save(SAIDA / "arvore-luz.png", optimize=True)

    # O pisca: metade das lâmpadas com um brilho a mais, numa camada que acende e apaga no CSS.
    pc = Camada()
    for n, (x, y, cor) in enumerate(pts):
        if n % 2 == 0:
            pc.p(x, y, cor)
    pe = ampliar(pc.c)
    pe = pe[:, :, :3] * pe[:, :, 3:4]
    pisca = pe * 1.4 + desfocar(pe, 2.5) * 1.6 + desfocar(pe, 7) * 1.1
    pisca = pisca[y0:y1, x0:x1]
    lp = pisca.max(2)
    corp = np.where(lp[:, :, None] > 1e-4, pisca / np.maximum(lp[:, :, None], 1e-4), 0)
    Image.fromarray((np.dstack([np.clip(corp, 0, 1), np.clip(lp, 0, 1)]) * 255).astype(np.uint8)).save(SAIDA / "arvore-pisca.png", optimize=True)

    # O brilho da estrela (pulsa no CSS): núcleo, cruz de raios finos e halo.
    tam = 22 * ESC
    gy, gx = np.mgrid[0:tam, 0:tam].astype(np.float32) - tam / 2
    r = np.hypot(gx, gy) / ESC
    k = np.exp(-r ** 2 / 6) * 0.9 + np.exp(-r ** 2 / 40) * 0.35
    raios = (np.exp(-np.abs(gx) / 1.2) * np.exp(-np.abs(gy) / (ESC * 7)) + np.exp(-np.abs(gy) / 1.2) * np.exp(-np.abs(gx) / (ESC * 7))) * 0.55
    k = np.clip(k + raios, 0, 1)
    cor = np.ones((tam, tam, 3)) * hexa("#fff0b8")
    Image.fromarray((np.dstack([cor, k * 0.95]) * 255).astype(np.uint8)).save(SAIDA / "arvore-estrela.png", optimize=True)
    print("árvore:", arvore.shape[1], "x", arvore.shape[0], "| luz:", ww, "x", hh, "| recorte da luz começa em", (x0 - lx0) // 1, (y0 - ly0) // 1)


if __name__ == "__main__":
    SAIDA.mkdir(parents=True, exist_ok=True)
    montar()
