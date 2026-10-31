"""Cenário "HD-2D" do topo da Biblioteca de Resumos: o salão de leitura (31/10/2026, redesenho da página).

Arte original feita por código: nada baixado nem gerado por IA, nenhum personagem de terceiros; cada pixel sai das
funções abaixo. Diferente de `gerar_cena_biblioteca.py` (parede chapada de frente), aqui o salão é uma sala de verdade
em perspectiva de um ponto: o chão, as duas paredes laterais de estantes e os móveis maiores são caixas 3D traçadas
por raio (cada pixel sabe onde está no espaço e para onde olha), e os objetos pequenos são pintados à mão por cima, na
grade de pixel art de 480 x 180. Depois tudo é montado em 3x com a luz calculada por pixel:
- o janelão gótico em arco quebrado, com rosácea de folhas, duas lancetas, travessa e losangos de chumbo;
- a luz da janela é traçada de volta até o vidro: cada ponto do chão (e do ar) olha na direção do sol/lua e vê se
  chega no vidro, por qual cor de vidro e se algum móvel está no caminho. Daí saem, coerentes entre si, a mancha no
  assoalho com a sombra dos caixilhos, os fachos volumétricos com poeira e a sombra da esfera armilar;
- estantes do chão ao teto à esquerda (na sombra, calmas, onde vai o título e a busca) e à direita (com a cornija e o
  pináculo entalhado onde pousa a coruja do site), centenas de lombadas em perspectiva, escada de rodinhas;
- a mesa de leitura com velas, livro aberto, pena, lamparina de latão, ampulheta, lupa e um livro raro que brilha;
- a pilha de livros no chão (a cama do gato do site), o lugar do relógio e os ganchos das duas arandelas (a chama e o
  relógio são do site, por cima, para poderem acender e apagar);
- profundidade de campo, brilho (bloom), mapeamento de tons, altas luzes quentes e sombras frias, vinheta e grão.

Saída: public/pixel/biblioteca/salao-{manha,tarde,noite}.webp (1440 x 540) e -960 (960 x 360), mais as texturas
estante-fundo.png (48 x 48), estante-tabua.png (48 x 7) e estante-coluna.png (10 x 48) para as estantes em CSS.
Uso: python3 scripts/gerar_cena_salao.py [manha|tarde|noite] [--texturas] [--marcas PASTA]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "biblioteca"
W, H, ESC = 480, 180, 3
SS = 3                                   # subamostras por lado no traçado de raios (antisserrilhado das caixas)
PERIODOS = ("manha", "tarde", "noite")
PERIODO = "noite"

# ─────────────────────────────── Câmera e sala ───────────────────────────────
# Mundo: X para a direita, Y para cima (chão em Y = 0), Z da parede do fundo (Z = 0) para a câmera.
# Na parede do fundo 1 unidade = 1 pixel de arte; o chão encontra a parede do fundo em y = 120.
VX, VY = 285.0, 70.0                     # ponto de fuga (altura do olho)
DIST = 200.0                             # distância da câmera à parede do fundo (= distância focal)
OLHO = 50.0                              # altura do olho
CHAO = 120
XE, XD = -160.0, 115.0                   # paredes laterais (esquerda e direita)
# Janela: vidro de x 255 a 321, arco quebrado (dois círculos de raio JR) com nascença em y JMOLA e topo em y ~10.
JX0, JX1, JMOLA, JR, JBASE = 255, 321, 53, 45, 112
JXC = (JX0 + JX1) / 2
ROSA = (JXC, 28.0, 10.5)                 # rosácea: centro e raio
# Âncoras para a interface (o site põe por cima: coruja, gato, relógio, arandelas).
RELOGIO = (360, 40, 10)
ARANDELAS = ((240, 66), (335, 66))


def proj(X: float, Y: float, Z: float) -> tuple[float, float]:
    s = DIST / (DIST - Z)
    return VX + X * s, VY - (Y - OLHO) * s


def desproj(x, y, Z):
    s = DIST / (DIST - Z)
    return (x - VX) / s, OLHO - (y - VY) / s


def hexa(c: str) -> np.ndarray:
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def cor_de(cor) -> np.ndarray:
    return hexa(cor) if isinstance(cor, str) else np.asarray(cor, dtype=np.float32)


def mistura(a, b, t: float) -> np.ndarray:
    return cor_de(a) * (1 - t) + cor_de(b) * t


def tom(cor, k: float) -> np.ndarray:
    return np.clip(cor_de(cor) * k, 0, 1)


def ruido(seed: int, escala: int, w: int = W, h: int = H) -> np.ndarray:
    """Ruído suave 0..1 (valores aleatórios ampliados com interpolação)."""
    g = np.random.default_rng(seed)
    pequeno = g.random((h // escala + 2, w // escala + 2)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize((w + escala * 2, h + escala * 2), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32)[:h, :w] / 255


def amostra(tab: np.ndarray, u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """Lê uma tabela 2D com coordenadas que dão a volta (textura repetida)."""
    h, w = tab.shape[:2]
    return tab[np.mod(v.astype(np.int64), h), np.mod(u.astype(np.int64), w)]


class Camada:
    """Pixel art RGBA (float 0..1) com pincéis simples e a profundidade Z (do mundo) de cada pixel."""

    def __init__(self, z: float = 0.0) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)
        self.z = np.full((H, W), z, dtype=np.float32)
        self.z_atual = z

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H and a > 0:
            rgb = cor_de(cor)
            base = self.c[y, x]
            na = a + base[3] * (1 - a)
            base[:3] = (rgb * a + base[:3] * base[3] * (1 - a)) / max(na, 1e-6)
            base[3] = na
            self.z[y, x] = self.z_atual

    def mascara(self, m: np.ndarray, cor, a: float = 1.0) -> None:
        m = m.astype(np.float32) * a
        if not m.any():
            return
        rgb = cor_de(cor)
        base = self.c
        na = m + base[:, :, 3] * (1 - m)
        novo = (rgb[None, None, :] * m[:, :, None] + base[:, :, :3] * base[:, :, 3:4] * (1 - m[:, :, None])) / np.maximum(na, 1e-6)[:, :, None]
        sel = m > 0
        base[sel, :3] = novo[sel]
        base[sel, 3] = na[sel]
        self.z[m > 0.5] = self.z_atual

    def ret(self, x0, y0, w, h, cor, a: float = 1.0) -> None:
        x0, y0, w, h = int(x0), int(y0), int(w), int(h)
        xa, xb, ya, yb = max(0, x0), min(W, x0 + w), max(0, y0), min(H, y0 + h)
        if xa >= xb or ya >= yb:
            return
        if a >= 1:
            self.c[ya:yb, xa:xb, :3] = cor_de(cor)
            self.c[ya:yb, xa:xb, 3] = 1
            self.z[ya:yb, xa:xb] = self.z_atual
        else:
            m = np.zeros((H, W), bool)
            m[ya:yb, xa:xb] = True
            self.mascara(m, cor, a)

    def poligono(self, pts, cor, a: float = 1.0) -> None:
        im = Image.new("L", (W, H), 0)
        ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
        self.mascara(np.asarray(im) > 127, cor, a)

    def elipse(self, cx, cy, rx, ry, cor, a: float = 1.0) -> None:
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x + 0.5 - cx) / max(rx, 0.1)) ** 2 + ((y + 0.5 - cy) / max(ry, 0.1)) ** 2 <= 1:
                    self.p(x, y, cor, a)

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / max(n, 1)
            self.p(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), cor, a)

    def escurecer(self, x0, y0, w, h, k: float) -> None:
        xa, xb, ya, yb = max(0, x0), min(W, x0 + w), max(0, y0), min(H, y0 + h)
        if xa < xb and ya < yb:
            self.c[ya:yb, xa:xb, :3] *= k


# ─────────────────────────────── Paletas ───────────────────────────────
MADEIRA = ("#a8723e", "#7e5030", "#5a3820", "#3c2412", "#24150a")   # luz → sombra (a mesma das texturas CSS)
MOGNO = ("#b0583a", "#8a3e26", "#6a2c1a", "#48190e", "#2a0e08")
LATAO = ("#fff0b0", "#e8c060", "#b88a34", "#7a5620", "#4a3010")
FERRO = ("#7a7a86", "#4e4e5a", "#2e2e38", "#18181e")
PEDRA = ("#b4a898", "#93877a", "#74695e", "#564d44", "#3a332c")
OURO = "#e8c25a"
OSSO = ("#f4ead2", "#dccfae", "#b0a07e", "#6e6048", "#2a2218")
LIVROS = ["#8e2a2a", "#a8402e", "#6e1e24", "#9a3a3a", "#2f5e3a", "#3e6e4a", "#24483a", "#2a4470", "#34587e", "#1e3050",
          "#7a4a2a", "#8a5a34", "#5a3820", "#b88a3a", "#a87a2e", "#c8b48a", "#d6c49a", "#5a2e4e", "#2a6a6a", "#2a2420",
          "#b0602a", "#7e2e48", "#4a5a2a", "#3a3a5a", "#6a1a1a", "#1e4a5a"]
PESOS = np.array([3, 2, 2, 2, 3, 2, 2, 3, 2, 2, 3, 3, 3, 1.5, 1.5, 1.2, 1, 1.5, 1.2, 1.5, 1, 1.2, 1, 1, 2, 1.2], dtype=float)
PESOS /= PESOS.sum()
LIVROS_RGB = np.array([hexa(c) for c in LIVROS], dtype=np.float32)

# Alturas (Y) das cavidades das estantes altas (esquerda e fundo) e das da direita (mais baixas, com o pináculo).
CAV_E = [(8, 19), (21, 32), (34, 45), (47, 58), (60, 71), (73, 84), (86, 97)]
CORNIJA_E = (97, 104)
CAV_D = [(7, 19), (21, 33), (35, 47), (49, 61)]
CORNIJA_D = (61, 70)
POSTES_E = [-1, 25, 51, 77, 103, 129]
POSTES_D = [-1, 23, 46.5, 71, 95]
POLEIRO_Z = 48.25                          # o pináculo da coruja fica em cima do poste de Z 46.5–50
CRANIO_CAV, CRANIO_Z = 1, (62.0, 69.0)     # o crânio fica na 2.ª cavidade da direita, nessa faixa de Z


# ─────────────────────────────── Livros pintados de frente (parede do fundo) ───────────────────────────────
def lombada(c: Camada, x: int, w: int, yt: int, yb: int, g, cor=None) -> None:
    """Um livro em pé visto de frente: lombada com volume, frisos dourados, etiqueta e desgaste."""
    cor = cor if cor is not None else LIVROS[g.choice(len(LIVROS), p=PESOS)]
    base = cor_de(cor) * (0.82 + g.random() * 0.32)
    h = yb - yt + 1
    for j in range(w):
        k = 1.28 if j == 0 and w > 1 else 0.58 if j == w - 1 and w > 1 else 1.1 if j == 1 and w > 3 else 1.0
        c.ret(x + j, yt, 1, h, np.clip(base * k, 0, 1))
    c.ret(x, yt, w, 1, np.clip(base * 0.75, 0, 1))
    ouro = tom(OURO, 0.85 + g.random() * 0.25)
    ini, fim = (x + 1, x + w - 1) if w > 2 else (x, x + w)
    if g.random() < 0.72 and h > 4:
        tipo = g.random()
        bandas = [yt + 1, yb - 1] if tipo < 0.4 else [yt + 1, yt + 3, yb - 1] if tipo < 0.7 else [yt + 2, yb - 2] if tipo < 0.9 else [yt + 1, yt + 2, yb - 2, yb - 1]
        for by in bandas:
            if yt <= by <= yb:
                c.ret(ini, by, fim - ini, 1, ouro)
    if w >= 3 and h > 6 and g.random() < 0.42:
        rot = LIVROS[g.choice(len(LIVROS), p=PESOS)] if g.random() < 0.5 else "#1a1410"
        ly = yt + 3 + int(g.random() * max(1, h // 3))
        c.ret(ini, ly, fim - ini, 2, tom(rot, 0.8))
        c.p(ini + (fim - ini) // 2, ly, ouro)
    elif w >= 2 and g.random() < 0.5:
        for ty in range(yt + 3, yb - 2, 2):
            if g.random() < 0.55:
                c.p(x + w // 2, ty, ouro, 0.8)
    if g.random() < 0.3:
        c.p(x + int(g.random() * w), yb, np.clip(base * 1.3, 0, 1))


def livro_tombado(c: Camada, x: int, folga: int, w: int, yt: int, yb: int, g) -> int:
    """Livro inclinado apoiado no vizinho da direita; devolve onde o próximo livro começa."""
    cor = cor_de(LIVROS[g.choice(len(LIVROS), p=PESOS)]) * (0.85 + g.random() * 0.25)
    alt = int((yb - yt + 1) * 0.92)
    for j in range(alt):
        dx = round(folga * j / max(alt - 1, 1))
        for i in range(w):
            k = 1.28 if i == 0 else 0.6 if i == w - 1 else 1.0
            c.p(x + dx + i, yb - j, np.clip(cor * k, 0, 1))
        if j in (2, alt - 3):
            c.ret(x + dx + 1, yb - j, max(1, w - 2), 1, tom(OURO, 0.9))
    return x + folga + w


def pilha_deitada(c: Camada, x: int, larg: int, yb: int, g, max_alt: int) -> None:
    y = yb
    for _ in range(2 + int(g.random() * 3)):
        esp = 2 + int(g.random() * 2)
        if yb - y + esp > max_alt:
            break
        dx = int(g.random() * 3) - 1
        lw = larg - int(g.random() * 3)
        cor = cor_de(LIVROS[g.choice(len(LIVROS), p=PESOS)]) * (0.85 + g.random() * 0.25)
        c.ret(x + dx, y - esp + 1, lw, esp, cor)
        c.ret(x + dx, y - esp + 1, lw, 1, np.clip(cor * 1.3, 0, 1))
        c.ret(x + dx, y, lw, 1, np.clip(cor * 0.6, 0, 1))
        c.p(x + dx + lw - 1, y - esp + 1, "#e8dcb8")
        y -= esp


def prateleira(c: Camada, x0: int, x1: int, yt: int, yb: int, g, calmo: bool = True) -> None:
    """Enche uma cavidade com livros, deixando aqui e ali uma folga, livro tombado ou pilha deitada."""
    c.ret(x0, yt, x1 - x0, yb - yt + 1, MADEIRA[4])
    c.ret(x0, yt, x1 - x0, 1, "#140a04")
    altura = yb - yt + 1
    x = x0 + int(g.random() * 2)
    while x < x1 - 1:
        r = g.random()
        resta = x1 - x
        if r < 0.05 and resta > 12:
            larg = 9 + int(g.random() * 4)
            pilha_deitada(c, x + 1, larg, yb, g, altura - 2)
            x += larg + 2
        elif r < 0.10 and resta > 10:
            x = livro_tombado(c, x, 2 + int(g.random() * 3), 2 + int(g.random() * 2), yt, yb, g)
        elif r < 0.13:
            x += 1 + int(g.random() * 2)
        else:
            w = min(int(g.choice([2, 3, 3, 3, 4, 4, 5])), x1 - x)
            topo = yt + 1 + (0 if g.random() < 0.18 else int(g.random() * 4))
            lombada(c, x, w, topo, yb, g)
            x += w
    c.escurecer(x0, yt, x1 - x0, 1, 0.45)
    c.escurecer(x0, yt + 1, x1 - x0, 1, 0.62)
    c.escurecer(x0, yt + 2, x1 - x0, 1, 0.82)
    c.escurecer(x0, yt, 1, altura, 0.6)
    c.escurecer(x1 - 1, yt, 1, altura, 0.7)


def tabua(c: Camada, x0: int, x1: int, y: int) -> None:
    c.ret(x0, y, x1 - x0, 1, MADEIRA[0])
    c.ret(x0, y + 1, x1 - x0, 1, MADEIRA[2])
    for x in range(x0, x1, 9):
        c.p(x + 4, y + 1, MADEIRA[3])


def pilastra(c: Camada, x0: int, ya: int, yb: int) -> None:
    """Pilastra canelada de madeira, com capitel e base entalhados."""
    tons = (MADEIRA[3], MADEIRA[1], MADEIRA[0], MADEIRA[2], MADEIRA[4])
    for i, t in enumerate(tons):
        c.ret(x0 + i, ya, 1, yb - ya, t)
    for y in range(ya + 4, yb - 4):
        if y % 6:
            c.p(x0 + 1, y, MADEIRA[2])
            c.p(x0 + 3, y, MADEIRA[3])
    for (y, k) in ((ya, 0), (ya + 1, 1), (ya + 2, 3), (yb - 3, 1), (yb - 2, 0), (yb - 1, 3)):
        c.ret(x0 - 1, y, 7, 1, MADEIRA[k])
    c.p(x0 + 2, ya + 2, LATAO[1])


def yp(Y: float) -> int:
    """Altura Y (mundo) → linha na parede do fundo."""
    return int(round(CHAO - Y))


# ─────────────────────────────── Parede do fundo (pintada de frente, Z = 0) ───────────────────────────────
def na_janela(x: float, y: float, m: float = 0.0) -> bool:
    """O vão envidraçado (com `m` de margem para fora), em arco quebrado."""
    if y > JBASE + m:
        return False
    if y >= JMOLA:
        return JX0 - m <= x < JX1 + m
    return (math.hypot(x - (JX0 + JR), y - JMOLA) <= JR + m) and (math.hypot(x - (JX1 - JR), y - JMOLA) <= JR + m)


def bloco_de_pedra(c: Camada, x0: int, x1: int, y0: int, y1: int, g, fora=None, k_luz: float = 1.0) -> None:
    """Cantaria: blocos aparelhados em fiadas desencontradas, cada bloco com o seu tom, arestas e lascas."""
    alt = 6
    for y in range(y0, y1):
        fiada = (y - y0) // alt
        off = 5 if fiada % 2 else 0
        for x in range(x0, x1):
            if fora is not None and fora(x, y):
                continue
            bx = (x - x0 + off) // 10
            semente = (bx * 73 + fiada * 31) % 97
            base = mistura(PEDRA[2], PEDRA[1], (semente % 7) / 9) * k_luz
            yy, xx = (y - y0) % alt, (x - x0 + off) % 10
            if yy == 0 or xx == 0:
                cor = tom(PEDRA[4], k_luz)
            elif yy == 1 or xx == 1:
                cor = np.clip(base * 1.16, 0, 1)
            elif yy == alt - 1 or xx == 9:
                cor = np.clip(base * 0.78, 0, 1)
            else:
                cor = base
                if (x * 7 + y * 13 + semente) % 23 == 0:
                    cor = base * 0.86
            c.p(x, y, cor)


def parede_fundo() -> Camada:
    c = Camada(0.0)
    g = np.random.default_rng(1)
    c.ret(0, 0, W, CHAO, MADEIRA[4])
    # Viga do alto e friso entalhado (corre por toda a parede).
    c.ret(0, 0, W, 6, "#1a1008")
    for x in range(0, W, 16):
        c.ret(x, 0, 2, 6, "#2c1c0e")
        c.p(x + 8, 2, LATAO[3])
    c.ret(0, 6, W, 1, MADEIRA[2])
    c.ret(0, 7, W, 1, MADEIRA[3])
    for x in range(W):
        if x % 6 in (1, 2, 4):
            c.p(x, 8, MADEIRA[2] if x % 6 != 4 else MADEIRA[1])
    c.ret(0, 9, W, 1, MADEIRA[4])

    # Estante alta do fundo, à esquerda (na sombra; é a área do título).
    ex0, ex1 = 118, 230
    yc0, yc1 = yp(CORNIJA_E[1]), yp(CORNIJA_E[0])
    # Painel entalhado acima da cornija: arcaria cega gótica.
    for x in range(ex0, ex1):
        for y in range(10, yc0):
            u = (x - ex0) % 14
            dentro = (y - 10) > 1 and (y - 10) >= (abs(u - 7) * 0.8) and 1 < u < 13
            c.p(x, y, MADEIRA[3] if dentro else MADEIRA[2])
            if dentro and (y - 10) == round(abs(u - 7) * 0.8) + 0:
                c.p(x, y, MADEIRA[1])
            if u == 0:
                c.p(x, y, MADEIRA[1])
    c.ret(ex0, yc0, ex1 - ex0, yc1 - yc0, MADEIRA[2])
    c.ret(ex0, yc0, ex1 - ex0, 1, MADEIRA[0])
    c.ret(ex0, yc0 + 1, ex1 - ex0, 1, MADEIRA[1])
    for x in range(ex0, ex1, 3):
        c.ret(x, yc0 + 3, 2, 2, MADEIRA[1])
        c.p(x, yc0 + 5, MADEIRA[4])
    c.ret(ex0, yc1 - 1, ex1 - ex0, 1, MADEIRA[4])
    vaos = [(ex0, 152), (157, 192), (197, 226)]
    for (xa, xb) in vaos:
        for (Yb, Yt) in CAV_E:
            prateleira(c, xa, xb, yp(Yt), yp(Yb) - 1, g)
            tabua(c, xa, xb, yp(Yb))
    for px in (152, 192, 226):
        pilastra(c, px, yc1, yp(8))
    # Rodapé (armário) da estante.
    c.ret(ex0, yp(8), ex1 - ex0, CHAO - yp(8), MADEIRA[2])
    c.ret(ex0, yp(8), ex1 - ex0, 1, MADEIRA[0])
    for (xa, xb) in vaos:
        for (pa, pb) in ((xa + 2, (xa + xb) // 2 - 1), ((xa + xb) // 2 + 1, xb - 2)):
            c.ret(pa, yp(8) + 2, pb - pa, 4, MADEIRA[1])
            c.ret(pa, yp(8) + 2, pb - pa, 1, MADEIRA[0])
            c.ret(pa, yp(8) + 5, pb - pa, 1, MADEIRA[3])
    c.ret(ex0, CHAO - 1, ex1 - ex0, 1, MADEIRA[4])

    # O vão de pedra da janela, entre as duas pilastras.
    def fora_pedra(x, y):
        return na_janela(x, y, 1)
    bloco_de_pedra(c, 230, 344, 10, CHAO, g, fora=fora_pedra, k_luz=0.82)
    # Pilastras de pedra (com o lugar liso das arandelas) — capitel, fuste liso, base.
    for (cx, _) in ARANDELAS:
        x0, x1 = cx - 8, cx + 8
        for x in range(x0, x1):
            u = (x - x0) / (x1 - x0)
            k = 3 if u < 0.08 else 1 if u < 0.25 else 2 if u < 0.8 else 3
            c.ret(x, 10, 1, CHAO - 10, PEDRA[k])
        for y in range(14, CHAO - 8, 7):
            c.ret(x0 + 1, y, x1 - x0 - 2, 1, PEDRA[3])
        # capitel com folhagem e base com toro
        for (y, k, dx) in ((40, 0, 2), (41, 1, 2), (42, 2, 1), (43, 1, 1), (44, 3, 0), (CHAO - 8, 0, 1), (CHAO - 7, 1, 2),
                           (CHAO - 6, 2, 2), (CHAO - 3, 1, 2), (CHAO - 2, 3, 2)):
            c.ret(x0 - dx, y, x1 - x0 + 2 * dx, 1, PEDRA[k])
        for x in range(x0, x1, 3):
            c.p(x, 42, PEDRA[0])
            c.p(x + 1, 43, PEDRA[3])
        # Liso em volta do gancho (a lamparina do site fica pendurada aqui).
        c.ret(x0 + 2, 52, x1 - x0 - 4, 30, PEDRA[2])
        c.ret(x0 + 2, 52, 1, 30, PEDRA[1])
        c.ret(x1 - 3, 52, 1, 30, PEDRA[3])
    # Moldura da janela: derrame (ombreira chanfrada) e o arco de pingadeira com mísulas de folha.
    for y in range(4, JBASE + 4):
        for x in range(JX0 - 9, JX1 + 9):
            if na_janela(x, y, 0):
                continue
            for m, cor in ((1.5, PEDRA[0]), (3.0, PEDRA[1]), (4.5, PEDRA[2])):
                if na_janela(x, y, m):
                    c.p(x, y, cor)
                    break
            else:
                if na_janela(x, y, 7.2) and not na_janela(x, y, 5.6):
                    c.p(x, y, PEDRA[0] if not na_janela(x, y, 6.6) else PEDRA[2])
    for xm in (JX0 - 7, JX1 + 6):
        c.ret(xm - 1, JMOLA - 1, 3, 3, PEDRA[1])
        c.p(xm, JMOLA + 2, PEDRA[0])
        c.p(xm - 1, JMOLA + 1, "#5a6a3a")
        c.p(xm + 1, JMOLA + 1, "#4a5a30")
    # Peitoril de pedra e lambri embaixo.
    c.ret(JX0 - 6, JBASE + 1, JX1 - JX0 + 12, 1, PEDRA[0])
    c.ret(JX0 - 6, JBASE + 2, JX1 - JX0 + 12, 1, PEDRA[1])
    c.ret(JX0 - 7, JBASE + 3, JX1 - JX0 + 14, 1, PEDRA[3])
    c.ret(JX0 - 5, JBASE + 4, JX1 - JX0 + 10, CHAO - JBASE - 4, MADEIRA[2])
    for x in range(JX0 - 3, JX1 + 3, 11):
        c.ret(x, JBASE + 5, 9, 2, MADEIRA[1])
        c.ret(x, JBASE + 5, 9, 1, MADEIRA[0])
    c.ret(JX0 - 5, CHAO - 1, JX1 - JX0 + 10, 1, MADEIRA[4])
    # Ganchos de ferro das arandelas (sem a chama: a lamparina é do site).
    for (ax, ay) in ARANDELAS:
        c.ret(ax - 2, ay - 9, 5, 6, FERRO[2])                   # chapa presa na pedra
        c.ret(ax - 2, ay - 9, 5, 1, FERRO[1])
        c.p(ax - 1, ay - 8, FERRO[0])
        c.p(ax + 1, ay - 5, FERRO[0])
        c.ret(ax - 2, ay - 4, 5, 1, FERRO[3])
        c.p(ax, ay - 3, FERRO[1])                               # haste que desce
        c.p(ax, ay - 2, FERRO[2])
        c.p(ax + 1, ay - 2, FERRO[2])                           # voluta
        c.p(ax + 2, ay - 3, FERRO[1])
        c.p(ax + 2, ay - 4, FERRO[2])
        c.p(ax - 1, ay - 1, FERRO[1])                           # argola do gancho
        c.p(ax + 1, ay - 1, FERRO[2])
        c.p(ax, ay, FERRO[1])

    # Trecho da direita (atrás da mesa): lambri com o lugar do relógio, a prancha anatômica e um armário baixo.
    rx0, rx1 = 344, 404
    for x in range(rx0, rx1):
        for y in range(10, 84):
            u = (x - rx0) % 20
            cor = MADEIRA[3] if u in (0, 19) else MADEIRA[2] if u in (1, 18) else "#33200f"
            if y in (10, 11) or y in (64, 65):
                cor = MADEIRA[2] if y in (10, 64) else MADEIRA[4]
            c.p(x, y, cor)
    for x in range(rx0, rx1, 2):
        c.p(x, 66, MADEIRA[2])
    # Placa redonda escura (o relógio do site vai por cima).
    rcx, rcy, rr = RELOGIO
    for y in range(rcy - rr - 3, rcy + rr + 4):
        for x in range(rcx - rr - 3, rcx + rr + 4):
            d = math.hypot(x + 0.5 - rcx, y + 0.5 - rcy)
            if d <= rr + 2.2:
                ang = math.atan2(y + 0.5 - rcy, x + 0.5 - rcx)
                if d > rr + 0.8:
                    cor = MADEIRA[1] if math.sin(ang - 0.8) < 0 else MADEIRA[3]
                    if int((ang + math.pi) * 12 / math.pi) % 2 == 0:
                        cor = tom(cor, 0.85)
                elif d > rr:
                    cor = MADEIRA[4]
                else:
                    cor = mistura("#2a1a0c", "#3a2412", max(0, -math.sin(ang - 0.8)) * 0.5)
                c.p(x, y, cor)
    c.p(rcx, rcy - rr - 5, LATAO[2])
    c.p(rcx, rcy - rr - 4, LATAO[3])
    # Prancha anatômica emoldurada: mão (ossos do carpo, metacarpos e falanges) a sépia, com legenda em traços.
    fx0, fy0, fw, fh = 382, 24, 16, 30
    c.ret(fx0, fy0, fw, fh, LATAO[3])
    c.ret(fx0, fy0, fw, 1, LATAO[1])
    c.ret(fx0, fy0, 1, fh, LATAO[2])
    c.ret(fx0 + fw - 1, fy0, 1, fh, LATAO[4])
    c.ret(fx0, fy0 + fh - 1, fw, 1, LATAO[4])
    c.ret(fx0 + 2, fy0 + 2, fw - 4, fh - 4, "#d8c8a0")
    c.ret(fx0 + 2, fy0 + 2, fw - 4, 1, "#b8a882")
    sep, sep2 = "#6a4a2a", "#9a7a50"
    hx = fx0 + fw // 2
    c.ret(hx - 2, fy0 + 19, 5, 3, sep2)                         # carpo
    c.p(hx - 1, fy0 + 20, sep)
    c.p(hx + 1, fy0 + 20, sep)
    for i, (dx, comp) in enumerate(((-3, 9), (-1, 11), (1, 11), (3, 9))):
        for j in range(comp):
            c.p(hx + dx, fy0 + 18 - j, sep if j in (4, 7, 9) else sep2)
    c.linha(hx - 3, fy0 + 19, hx - 6, fy0 + 14, sep2)            # polegar
    c.p(hx - 6, fy0 + 13, sep)
    c.ret(hx - 1, fy0 + 22, 3, 2, sep2)                         # rádio e ulna
    for x in range(fx0 + 3, fx0 + fw - 3):
        if x % 3:
            c.p(x, fy0 + fh - 4, "#7a6a50", 0.7)
    # Armário baixo com duas prateleiras de livros.
    c.ret(rx0, 84, rx1 - rx0, 3, MADEIRA[1])
    c.ret(rx0, 84, rx1 - rx0, 1, MADEIRA[0])
    c.ret(rx0, 86, rx1 - rx0, 1, MADEIRA[3])
    for (yt, yb) in ((88, 98), (101, 110)):
        prateleira(c, rx0 + 2, rx1 - 2, yt, yb, g)
        tabua(c, rx0 + 2, rx1 - 2, yb + 1)
    c.ret(rx0, 87, 2, 33, MADEIRA[2])
    c.ret(rx1 - 2, 87, 2, 33, MADEIRA[3])
    c.ret(rx0, 112, rx1 - rx0, 8, MADEIRA[2])
    c.ret(rx0 + 2, 113, rx1 - rx0 - 4, 1, MADEIRA[0])
    for xa in range(rx0 + 3, rx1 - 6, 14):
        c.ret(xa, 114, 12, 4, MADEIRA[1])
        c.ret(xa, 117, 12, 1, MADEIRA[3])
        c.p(xa + 6, 115, LATAO[1])
    c.ret(rx0, CHAO - 1, rx1 - rx0, 1, MADEIRA[4])
    return c


# ─────────────────────────────── Céu e janela ───────────────────────────────
def ceu() -> np.ndarray:
    """O que se vê pelo vidro (emissivo, HxWx3): céu, nuvens, astro fora do quadro (à direita, alto) e a silhueta
    de copas e torres ao longe."""
    e = np.zeros((H, W, 3), dtype=np.float32)
    P = PERIODO
    nuv = ruido(5, 9) * 0.6 + ruido(6, 4) * 0.4
    g = np.random.default_rng(7)
    if P == "manha":
        topo, meio, baixo, brilho, cor_nuv = hexa("#5a96dc"), hexa("#9cc6ec"), hexa("#ffe8c0"), hexa("#fff2c8"), hexa("#ffffff")
    elif P == "tarde":
        topo, meio, baixo, brilho, cor_nuv = hexa("#6a2e5a"), hexa("#ff7a30"), hexa("#ffcc58"), hexa("#ffe0a0"), hexa("#ffa860")
    else:
        topo, meio, baixo, brilho, cor_nuv = hexa("#060c26"), hexa("#16285a"), hexa("#30447e"), hexa("#9ab4ff"), hexa("#7a8ac0")
    for y in range(0, JBASE + 1):
        t = y / JBASE
        cor = topo * (1 - t / 0.55) + meio * (t / 0.55) if t < 0.55 else meio * (1 - (t - 0.55) / 0.45) + baixo * ((t - 0.55) / 0.45)
        for x in range(JX0 - 2, JX1 + 2):
            v = cor.copy()
            # brilho do astro que está fora do quadro, no alto à direita
            d = math.hypot(x - 340, (y + 10) * 0.9)
            v = v + brilho * math.exp(-d / (26 if P != "tarde" else 32)) * (0.55 if P != "noite" else 0.4)
            n = nuv[y, x] - 0.52 - abs(y - 42) / 110
            if n > 0:
                k = min(1, n * 6) * (0.65 if P != "noite" else 0.45)
                lado = 1 + 0.35 * max(0, (x - 280) / 40)
                v = v * (1 - k) + cor_nuv * k * lado
            e[y, x] = v
    if P == "noite":
        for _ in range(55):
            x, y = JX0 + int(g.random() * (JX1 - JX0)), int(5 + g.random() * 80)
            e[y, x] += 0.3 + g.random() * 0.6
    # Silhueta: colinas, copas redondas e duas torres com coruchéu.
    for x in range(JX0 - 2, JX1 + 2):
        h = 98 + int(2.5 * math.sin(x / 7.0)) - int(3 * max(0, math.sin(x / 3.1 + 1)))
        if 266 <= x <= 270:
            h = 84 if x in (267, 268, 269) else 88
            if x == 268:
                h = 78
        if 304 <= x <= 309:
            h = 80 if 305 <= x <= 308 else 86
            if x in (306, 307):
                h = 74
        for y in range(h, JBASE + 1):
            prof = (y - h) / 14
            if P == "manha":
                e[y, x] = mistura("#6a8a8a", "#3e5a5e", min(1, prof)) * (1.0 + 0.12 * ((x // 3) % 2))
            elif P == "tarde":
                e[y, x] = mistura("#4a1e2a", "#2a0e18", min(1, prof))
            else:
                e[y, x] = mistura("#121a3a", "#0a0e22", min(1, prof))
    if P != "manha":
        for (wx, wy) in ((267, 90), (306, 84), (283, 104), (296, 103)):
            e[wy, wx] = hexa("#ffc860") * (1.0 if P == "noite" else 0.8)
    return e


VITRAL = {"verm": "#c0304a", "azul": "#2e5ec8", "ouro": "#e8b040", "verde": "#3a9a5a", "folha": "#6ab04a",
          "ambar": "#e88a2a", "turq": "#2aa0a0"}


def janela(c: Camada) -> tuple[np.ndarray, np.ndarray]:
    """Vidro (emissivo) e a tracería de pedra: mainel central, duas lancetas com arco próprio, rosácea de folhas,
    travessa, borda colorida e losangos de chumbo. Devolve (emissivo HxWx3, transmissão RGB HxWx3)."""
    fundo = ceu()
    emis = np.zeros((H, W, 3), dtype=np.float32)
    trans = np.zeros((H, W, 3), dtype=np.float32)
    g = np.random.default_rng(9)
    tint = g.random((60, 60)) * 0.22 + 0.86
    rcx, rcy, rr = ROSA
    lanc = ((JX0, 287), (289, JX1))           # cada lanceta: [x0, x1)
    LM, LR = 57, 22                           # nascença e raio do arco das lancetas
    pedra_t = (hexa(PEDRA[0]), hexa(PEDRA[1]), hexa(PEDRA[2]), hexa(PEDRA[3]))
    chumbo = hexa("#18141c")

    def na_lanceta(x, y, i, m=0.0):
        a, b = lanc[i]
        if y >= LM:
            return a + m <= x + 0.5 <= b - m
        return (math.hypot(x + 0.5 - (a + LR), y + 0.5 - LM) <= LR - m) and (math.hypot(x + 0.5 - (b - LR), y + 0.5 - LM) <= LR - m) and a + m <= x + 0.5 <= b - m

    for y in range(0, JBASE + 1):
        for x in range(JX0 - 1, JX1 + 1):
            if not na_janela(x + 0.5, y + 0.5):
                continue
            borda_jan = not na_janela(x + 0.5, y + 0.5, -1.2)
            dr = math.hypot(x + 0.5 - rcx, y + 0.5 - rcy)
            em_lanc = [na_lanceta(x, y, i) for i in (0, 1)]
            # Pedra da tracería: aro da rosácea, mainel, lancetas e travessa.
            if rr <= dr < rr + 1.6:
                c.p(x, y, pedra_t[1] if (y + 0.5 - rcy) < 0 else pedra_t[2])
                continue
            if dr < rr:
                # Rosácea: oito folhas verdes com nervura dourada em volta de um miolo de ouro, fundo azul.
                ang = math.atan2(y + 0.5 - rcy, x + 0.5 - rcx)
                fol = (ang + math.pi) / (math.tau / 8)
                f = fol % 1 - 0.5
                largura = 0.42 * math.sin(min(1, dr / (rr * 0.92)) * math.pi)
                if dr < 2.4:
                    cor = hexa(VITRAL["ouro"]) * 1.15
                elif dr < 3.3:
                    c.p(x, y, chumbo)
                    continue
                elif abs(f) < largura and dr < rr - 0.8:
                    cor = hexa(VITRAL["folha"]) if abs(f) > 0.07 else hexa(VITRAL["ouro"])
                    if abs(abs(f) - largura) < 0.06:
                        c.p(x, y, chumbo)
                        continue
                elif dr > rr - 1.4:
                    cor = hexa(VITRAL["verm"])
                else:
                    cor = hexa(VITRAL["azul"])
                emis[y, x] = cor * (0.8 + 0.2 * ((x * 7 + y * 3) % 5) / 4) * (0.6 + 0.6 * float(fundo[y, x].mean()))
                trans[y, x] = cor * 0.62
                continue
            if not any(em_lanc):
                # Cabeça da janela, entre o arco grande, as lancetas e a rosácea: pedra fina em volta de vidros
                # em gota (âmbar e rubi), que dão o fogo do alto do vitral.
                perto_lanc = any(na_lanceta(x, y, i, -1.4) for i in (0, 1))
                if perto_lanc or not na_janela(x + 0.5, y + 0.5, -1.4) or rr + 1.6 <= dr < rr + 2.8 or abs(x + 0.5 - JXC) < 1.0:
                    c.p(x, y, pedra_t[1] if (x + 2 * y) % 7 else pedra_t[2])
                    continue
                u_, v_ = (x - y) % 5, (x + y) % 5
                if u_ == 0 or v_ == 0:
                    c.p(x, y, chumbo)
                    continue
                cel = ((x - y) // 5 * 3 + (x + y) // 5) % 7
                cor = hexa(VITRAL["verm"]) if cel == 0 else hexa(VITRAL["ouro"]) if cel in (3, 5) else mistura(VITRAL["ambar"], "#f0d8a0", 0.45)
                emis[y, x] = cor * (0.45 + 0.5 * float(fundo[y, x].mean())) * (1.1 if u_ == 1 or v_ == 1 else 1)
                trans[y, x] = cor * 0.5
                continue
            i = 0 if em_lanc[0] else 1
            a, b = lanc[i]
            # Travessa e a borda de pedra fina de cada lanceta.
            if y in (85, 86):
                c.p(x, y, pedra_t[0] if y == 85 else pedra_t[2])
                continue
            if not na_lanceta(x, y, i, 1.0):
                c.p(x, y, pedra_t[1] if x < (a + b) / 2 else pedra_t[2])
                continue
            # Borda colorida (dois px) com pérolas de vidro.
            if not na_lanceta(x, y, i, 2.6):
                passo = (y // 4) if y >= LM else int(math.atan2(y - LM, x - (a + b) / 2) * 6)
                if y % 4 == 0 and y >= LM:
                    c.p(x, y, chumbo)
                    continue
                cor = hexa((VITRAL["verm"], VITRAL["ouro"], VITRAL["azul"], VITRAL["ouro"])[passo % 4])
                emis[y, x] = cor * 0.75 * (0.6 + 0.6 * float(fundo[y, x].mean()))
                trans[y, x] = cor * 0.5
                continue
            # Medalhões: um losango de folha em cada lanceta (e um menor embaixo), que tingem a luz no chão.
            mx = (a + b) / 2
            med = None
            for (my, mr) in ((70, 6.2), (100, 4.6)):
                dd = abs(x + 0.5 - mx) + abs(y + 0.5 - my)
                if dd < mr:
                    med = (dd, mr, my)
            if med is not None:
                dd, mr, my = med
                if mr - dd < 0.9:
                    c.p(x, y, chumbo)
                    continue
                cor = hexa(VITRAL["turq"] if i == 0 else VITRAL["verm"]) if dd > mr * 0.5 else hexa(VITRAL["ouro"])
                if abs(x + 0.5 - mx) < 0.6 and dd < mr * 0.5:
                    cor = hexa(VITRAL["folha"])
                emis[y, x] = cor * (0.6 + 0.6 * float(fundo[y, x].mean()))
                trans[y, x] = cor * 0.6
                continue
            # Losangos de chumbo (vidro antigo, cada losango num tom levemente diferente).
            u_, v_ = (x - y) % 7, (x + y) % 7
            if u_ == 0 or v_ == 0:
                c.p(x, y, chumbo)
                trans[y, x] = 0.42
                continue
            cel = tint[((x - y) // 7) % 60, ((x + y) // 7) % 60]
            vidro = fundo[y, x] * 0.9 * cel + 0.02
            if u_ == 1 or v_ == 1:
                vidro = vidro * 1.1 + 0.02
            if borda_jan:
                vidro = vidro * 0.8
            emis[y, x] = vidro
            trans[y, x] = np.full(3, 0.95 * cel, np.float32)
    # Mainel central (pedra, de alto a baixo nas lancetas).
    for y in range(LM - 18, JBASE + 1):
        for x in (287, 288):
            if na_janela(x + 0.5, y + 0.5) and math.hypot(x + 0.5 - rcx, y + 0.5 - rcy) >= rr + 1.6:
                c.p(x, y, pedra_t[0] if x == 287 else pedra_t[2])
                emis[y, x] = 0
                trans[y, x] = 0
    return emis, trans


# ─────────────────────────────── Traçado de raios: paredes laterais, chão e móveis grandes ───────────────────────────────
class Caixa:
    def __init__(self, x0, x1, y0, y1, z0, z1, mat: str, **dados) -> None:
        self.b = np.array([[x0, y0, z0], [x1, y1, z1]], dtype=np.float64)
        self.mat = mat
        self.dados = dados


def caixas_da_sala() -> list[Caixa]:
    cx: list[Caixa] = []
    # Estante da parede esquerda: rodapé, plano das lombadas, prateleiras, postes, cornija, friso e trilho da escada.
    cx.append(Caixa(XE, -151.5, 0, 8, -2, 200, "rodape", lado=1))
    cx.append(Caixa(XE, -156, 8, CORNIJA_E[0], -2, 200, "livros", lado=1, tab="E"))
    for (Yb, Yt) in CAV_E[1:]:
        cx.append(Caixa(XE, -153, Yb - 2, Yb, -2, 200, "tabua", lado=1))
    for z in POSTES_E:
        cx.append(Caixa(XE, -151, 0, CORNIJA_E[0], z, z + 3.4, "poste", lado=1))
    cx.append(Caixa(XE, -148, CORNIJA_E[0], CORNIJA_E[1], -2, 200, "cornija", lado=1))
    cx.append(Caixa(XE, -157, CORNIJA_E[1], 113, -2, 200, "friso", lado=1))
    cx.append(Caixa(-150.6, -149.6, 91.6, 92.6, -2, 200, "latao", lado=1))
    # Estante da parede direita (mais baixa, com a cornija onde fica o pináculo da coruja).
    cx.append(Caixa(105.5, XD, 0, 7, -2, 200, "rodape", lado=-1))
    cx.append(Caixa(109, XD, 7, CORNIJA_D[0], -2, 200, "livros", lado=-1, tab="D"))
    for (Yb, Yt) in CAV_D[1:]:
        cx.append(Caixa(106, XD, Yb - 2, Yb, -2, 200, "tabua", lado=-1))
    for z in POSTES_D:
        cx.append(Caixa(105.6, XD, 0, CORNIJA_D[0], z, z + 3.5, "poste", lado=-1))
    cx.append(Caixa(103.5, XD, CORNIJA_D[0], CORNIJA_D[1], -2, 200, "cornija", lado=-1))
    # Mesa de leitura (tampo com couro, saia com gaveta e quatro pés).
    cx.append(Caixa(28, 72, 12.5, 14, 66, 80, "tampo"))
    cx.append(Caixa(29.5, 70.5, 9.5, 12.5, 67, 78.5, "saia"))
    for (x0, z0) in ((29.6, 67.2), (68, 67.2), (29.6, 76), (68, 76)):
        cx.append(Caixa(x0, x0 + 2.4, 0, 9.5, z0, z0 + 2.3, "pe"))
    cx.append(Caixa(31, 69, 2.2, 3.2, 76.6, 77.6, "pe"))          # travessa entre os pés da frente
    # A pilha de livros do gato (a de cima é larga e plana).
    for (x0, x1, y0, y1, z0, z1, cor, frente) in ((7.4, 24.6, 0, 2.2, 87.4, 95.0, "#2a4470", "lombada"),
                                                   (8.6, 23.2, 2.2, 4.0, 88.0, 94.4, "#8e2a2a", "folhas"),
                                                   (7.8, 24.2, 4.0, 5.9, 87.6, 95.1, "#2f5e3a", "lombada"),
                                                   (8.0, 23.8, 5.9, 8.0, 88.0, 95.0, "#7a4a2a", "lombada")):
        cx.append(Caixa(x0, x1, y0, y1, z0, z1, "livro", cor=cor, frente=frente))
    return cx


def tabela_livros(seed: int, cavs, zmax: float = 210, vazios=()) -> list[dict]:
    """Lombadas de cada cavidade ao longo de Z: limites, cor, altura, estilo dos frisos e livros deitados."""
    g = np.random.default_rng(seed)
    tabs = []
    for k, (Yb, Yt) in enumerate(cavs):
        lim, cor, alt, est, tipo = [-3.0], [], [], [], []
        z = -3.0
        while z < zmax:
            r = g.random()
            forcado = any(k == vk and va - 1 <= z < vb for (vk, va, vb) in vazios)
            if forcado:
                vk, va, vb = next(v for v in vazios if v[0] == k and v[1] - 1 <= z < v[2])
                w, t = vb - z, 2
            elif r < 0.045:
                w, t = 5.5 + g.random() * 3, 1
            elif r < 0.085:
                w, t = 0.8 + g.random() * 1.6, 2
            else:
                w, t = float(g.choice([1.3, 1.6, 1.9, 2.2, 2.2, 2.6, 3.0, 3.5])), 0
            z += w
            lim.append(z)
            cor.append(LIVROS_RGB[g.choice(len(LIVROS), p=PESOS)] * (0.8 + g.random() * 0.34))
            alt.append((Yt - Yb) * (0.97 if g.random() < 0.2 else 0.62 + g.random() * 0.3))
            est.append(int(g.random() * 6))
            tipo.append(t)
        tabs.append({"lim": np.array(lim), "cor": np.array(cor), "alt": np.array(alt), "est": np.array(est),
                     "tipo": np.array(tipo), "Yb": Yb, "Yt": Yt, "seed": seed * 31 + k})
    return tabs


TAB_E = tabela_livros(21, CAV_E)
TAB_D = tabela_livros(22, CAV_D, vazios=((CRANIO_CAV, CRANIO_Z[0], CRANIO_Z[1]),))


def mat_livros(P: np.ndarray, tabs) -> np.ndarray:
    """Lombadas em perspectiva: cada livro é uma faixa de Z com cor, altura, frisos dourados e etiqueta."""
    Z, Y = P[:, 2], P[:, 1]
    out = np.tile(hexa(MADEIRA[4]) * 0.55, (len(Z), 1))
    ouro = hexa(OURO)
    for tb in tabs:
        m = (Y >= tb["Yb"]) & (Y < tb["Yt"])
        if not m.any():
            continue
        z, v = Z[m], Y[m] - tb["Yb"]
        i = np.clip(np.searchsorted(tb["lim"], z, side="right") - 1, 0, len(tb["cor"]) - 1)
        w = tb["lim"][i + 1] - tb["lim"][i]
        u = (z - tb["lim"][i]) / w
        h = tb["alt"][i]
        base = tb["cor"][i]
        k = np.where(u < 0.14, 0.62, np.where(u < 0.32, 1.22, np.where(u > 0.86, 0.7, 1.0)))
        cor = base * k[:, None]
        est = tb["est"][i]
        topo = h - v
        banda = (((est % 3 == 0) & ((np.abs(v - 1.0) < 0.42) | (np.abs(topo - 1.1) < 0.42)))
                 | ((est % 3 == 1) & ((np.abs(v - 1.0) < 0.35) | (np.abs(topo - 1.0) < 0.35) | (np.abs(topo - 2.0) < 0.35)))
                 | ((est == 2) & (np.abs(v - h * 0.55) < 0.5)))
        cor = np.where(banda[:, None], ouro * (0.75 + 0.3 * k[:, None]), cor)
        etiq = (est == 5) & (np.abs(v - h * 0.62) < 0.9) & (u > 0.2) & (u < 0.8)
        cor = np.where(etiq[:, None], cor * 0.45, cor)
        cor = np.where((topo < 0.45)[:, None], cor * 0.7, cor)
        # Livros deitados: fatias horizontais com folhas aparecendo.
        dt = tb["tipo"][i] == 1
        if dt.any():
            fat = np.floor(v / 1.9).astype(int)
            g_ = (fat * 7 + i * 3) % len(LIVROS)
            cor_d = LIVROS_RGB[g_] * 0.95
            cor_d = np.where((np.mod(v, 1.9) < 0.35)[:, None], cor_d * 1.3, cor_d)
            cor_d = np.where((u > 0.88)[:, None], hexa("#e0d4b0") * 0.9, cor_d)
            alto = v < 1.9 * (2 + (i % 3))
            cor = np.where((dt & alto)[:, None], cor_d, cor)
            h = np.where(dt, 1.9 * (2 + (i % 3)), h)
        vazio = (tb["tipo"][i] == 2) | (v > h)
        fundo = hexa(MADEIRA[4]) * (0.35 + 0.25 * np.clip((tb["Yt"] - tb["Yb"] - (v)) / 6, 0, 1))[:, None]
        cor = np.where(vazio[:, None], fundo, cor)
        out[m] = np.clip(cor, 0, 1)
    return out


def textura_madeira(seed: int, n: int = 256) -> np.ndarray:
    """Veio de madeira 0..1 esticado (para tábuas e móveis em coordenadas do mundo)."""
    return ruido(seed, 3, n, n) * 0.6 + ruido(seed + 1, 9, n, n) * 0.4


VEIO = textura_madeira(40)


def mat_madeira(P, N, paleta, eixo_veio: int, escuro: float = 1.0) -> np.ndarray:
    """Madeira com veio ao longo de um eixo do mundo e tom por face (topo claro, base escura)."""
    coords = [P[:, 0], P[:, 1], P[:, 2]]
    ao_longo = coords[eixo_veio] * 1.4
    trans = (coords[(eixo_veio + 1) % 3] + coords[(eixo_veio + 2) % 3]) * 5
    v = amostra(VEIO, ao_longo, trans)
    t = np.clip(1.6 + (v - 0.5) * 2.2, 0, 4)
    face = np.where(N[:, 1] > 0.5, -0.9, np.where(N[:, 1] < -0.5, 1.4, 0.0))
    t = np.clip(t + face, 0, 4)
    pal = np.array([hexa(c) for c in paleta])
    i0 = np.floor(t).astype(int)
    i1 = np.minimum(i0 + 1, 4)
    f = (t - i0)[:, None]
    f = np.round(f * 2) / 2                       # dois degraus entre tons (sem gradiente liso)
    return (pal[i0] * (1 - f) + pal[i1] * f) * escuro


def material(cx: Caixa | None, kind: str, P: np.ndarray, N: np.ndarray) -> np.ndarray:
    X, Y, Z = P[:, 0], P[:, 1], P[:, 2]
    n = len(X)
    if kind == "chao":
        return mat_chao(P)
    if kind == "parede_e":
        # Lambri escuro acima do friso: montantes a cada 18 de Z e uma travessa.
        cor = np.tile(hexa("#2c1a0c"), (n, 1))
        mont = np.mod(Z + 3, 18) < 1.6
        cor[mont] = hexa(MADEIRA[3])
        trav = np.abs(Y - 128) < 1.2
        cor[trav] = hexa(MADEIRA[3])
        return cor
    if kind == "parede_d":
        # Parede lisa de reboco escuro acima da estante (o espaço da coruja), com um rodatejo de madeira.
        v = amostra(VEIO, Z * 0.7, Y * 0.7)
        cor = np.tile(hexa("#30241c"), (n, 1)) * (0.92 + 0.12 * v[:, None])
        # lambri de tábuas largas e baixo contraste (sem nada que dispute com a coruja)
        cor[np.mod(Z + 4, 15) < 0.7] *= 0.72
        cor[(np.mod(Z + 4, 15) >= 0.7) & (np.mod(Z + 4, 15) < 1.3)] *= 1.12
        cor[np.abs(Y - 112) < 1.0] = hexa(MADEIRA[3])
        cor[np.abs(Y - 113.4) < 0.5] = hexa(MADEIRA[2])
        return cor
    m = cx.mat
    lado = cx.dados.get("lado", 1)
    if m == "livros":
        return mat_livros(P, TAB_E if cx.dados["tab"] == "E" else TAB_D)
    if m == "tabua":
        cor = mat_madeira(P, N, MADEIRA, 2)
        frente = np.abs(N[:, 0]) > 0.5
        topo_frente = frente & (Y > cx.b[1, 1] - 0.55)
        cor[topo_frente] = hexa(MADEIRA[0])
        base_frente = frente & (Y < cx.b[0, 1] + 0.5)
        cor[base_frente] = hexa(MADEIRA[3])
        return cor
    if m == "rodape":
        cor = mat_madeira(P, N, MADEIRA, 2, 0.9)
        frente = np.abs(N[:, 0]) > 0.5
        alt = cx.b[1, 1]
        almof = frente & (np.mod(Z + 2, 13) > 1.5) & (np.mod(Z + 2, 13) < 11.5) & (Y > 1.6) & (Y < alt - 1.6)
        cor[almof] = cor[almof] * 0.82
        borda = frente & (np.abs(Y - (alt - 1.6)) < 0.35) & (np.mod(Z + 2, 13) > 1.5) & (np.mod(Z + 2, 13) < 11.5)
        cor[borda] = hexa(MADEIRA[0])
        topo = frente & (Y > alt - 0.5)
        cor[topo] = hexa(MADEIRA[1])
        return cor
    if m == "poste":
        cor = mat_madeira(P, N, MADEIRA, 1)
        frente = np.abs(N[:, 0]) > 0.5
        u = (Z - cx.b[0, 2]) / (cx.b[1, 2] - cx.b[0, 2])
        canelura = frente & ((np.abs(u - 0.33) < 0.09) | (np.abs(u - 0.67) < 0.09)) & (Y > 4) & (Y < cx.b[1, 1] - 4)
        cor[canelura] = hexa(MADEIRA[3])
        aresta = frente & ((u < 0.12) if lado > 0 else (u > 0.88))
        cor[aresta] = hexa(MADEIRA[0])
        cap = frente & ((Y > cx.b[1, 1] - 3) | (Y < 3))
        cor[cap] = np.where((np.mod(Y, 1.5) < 0.75)[cap][:, None], hexa(MADEIRA[1]), hexa(MADEIRA[2]))
        return cor
    if m == "cornija":
        cor = mat_madeira(P, N, MADEIRA, 2)
        y0, y1 = cx.b[0, 1], cx.b[1, 1]
        r = (Y - y0) / (y1 - y0)
        frente = np.abs(N[:, 0]) > 0.5
        dent = frente & (r < 0.3) & (np.mod(Z, 2.2) < 1.1)
        cor[dent] = hexa(MADEIRA[1])
        cor[frente & (r < 0.3) & ~dent] = hexa(MADEIRA[4])
        cor[frente & (np.abs(r - 0.42) < 0.06)] = hexa(LATAO[3])
        cor[frente & (r > 0.86)] = hexa(MADEIRA[0])
        cor[frente & (np.abs(r - 0.62) < 0.07)] = hexa(MADEIRA[3])
        return cor
    if m == "friso":
        cor = np.tile(hexa(MADEIRA[3]), (n, 1))
        ros = (np.mod(Z, 9) - 4.5) ** 2 + ((Y - (CORNIJA_E[1] + 4.5)) * 1.3) ** 2 < 5
        cor[ros] = hexa(MADEIRA[1])
        cor[np.abs(Y - CORNIJA_E[1] - 0.4) < 0.4] = hexa(MADEIRA[2])
        return cor
    if m == "latao":
        cor = np.tile(hexa(LATAO[2]), (n, 1))
        cor[Y > 92.2] = hexa(LATAO[1])
        return cor
    if m == "tampo":
        cor = mat_madeira(P, N, MOGNO, 0)
        topo = N[:, 1] > 0.5
        dentro = topo & (X > 30.5) & (X < 69.5) & (Z > 67.5) & (Z < 78.5)
        couro = hexa("#2c4a34") * (0.86 + 0.24 * amostra(VEIO, X * 3, Z * 3))[:, None]
        cor[dentro] = couro[dentro]
        filete = topo & (((np.abs(X - 30.9) < 0.3) | (np.abs(X - 69.1) < 0.3)) & (Z > 67.5) & (Z < 78.5)
                         | ((np.abs(Z - 67.9) < 0.3) | (np.abs(Z - 78.1) < 0.3)) & (X > 30.5) & (X < 69.5))
        cor[filete] = hexa("#b8963a")
        frente = N[:, 2] > 0.5
        cor[frente] = hexa(MOGNO[1])
        cor[frente & (Y > 13.5)] = hexa(MOGNO[0])
        return cor
    if m == "saia":
        cor = mat_madeira(P, N, MOGNO, 0)
        frente = N[:, 2] > 0.5
        gav = frente & (np.abs(X - 50) < 9) & (Y > 10.1) & (Y < 11.9)
        cor[gav] = hexa(MOGNO[1])
        cor[frente & (np.abs(X - 50) < 9) & (np.abs(Y - 11.9) < 0.25)] = hexa(MOGNO[0])
        puxa = frente & (np.abs(X - 50) < 0.7) & (np.abs(Y - 11) < 0.5)
        cor[puxa] = hexa(LATAO[1])
        cor[frente & (Y < 9.9)] = hexa(MOGNO[3])
        return cor
    if m == "pe":
        cor = mat_madeira(P, N, MOGNO, 1)
        anel = np.isin(np.floor(Y * 1.1).astype(int), (1, 6, 9))
        cor[anel] = hexa(MOGNO[0])
        return cor
    if m == "livro":
        base = hexa(cx.dados["cor"])
        y0, y1 = cx.b[0, 1], cx.b[1, 1]
        x0, x1 = cx.b[0, 0], cx.b[1, 0]
        cor = np.tile(base, (n, 1))
        frente = N[:, 2] > 0.5
        topo = N[:, 1] > 0.5
        lado_ = np.abs(N[:, 0]) > 0.5
        r = (Y - y0) / (y1 - y0)
        if cx.dados["frente"] == "lombada":
            cor[frente] = base * 1.0
            cor[frente & (r > 0.72)] = base * 1.25
            cor[frente & (r < 0.2)] = base * 0.6
            fr = frente & ((np.abs(X - (x0 + 2.0)) < 0.35) | (np.abs(X - (x1 - 2.0)) < 0.35))
            cor[fr] = hexa(OURO) * 0.9
            et = frente & (np.abs(X - (x0 + x1) / 2) < 2.2) & (np.abs(r - 0.5) < 0.22)
            cor[et] = base * 0.55
        else:
            cor[frente] = hexa("#e8dcb8")
            cor[frente & (np.mod(Y * 3.1, 1) < 0.35)] = hexa("#c8b890")
            cor[frente & ((r > 0.85) | (r < 0.15))] = base
        cor[lado_] = hexa("#d8cca4")
        cor[lado_ & ((r > 0.85) | (r < 0.15))] = base * 0.8
        cor[topo] = base * 1.12
        canto = topo & ((np.abs(X - x0) < 1.2) | (np.abs(X - x1) < 1.2)) & ((np.abs(Z - cx.b[0, 2]) < 1.2) | (np.abs(Z - cx.b[1, 2]) < 1.2))
        cor[canto] = hexa(LATAO[2])
        return np.clip(cor, 0, 1)
    return np.tile(hexa("#ff00ff"), (n, 1))


TABUAS = [hexa(c) for c in ("#6a4226", "#7a4e2c", "#5e3a20", "#704830", "#664028", "#5a3a22")]


def mat_chao(P: np.ndarray) -> np.ndarray:
    """Assoalho de tábuas corridas em direção à parede do fundo, emendas desencontradas, veio, e a passadeira."""
    X, Z = P[:, 0], P[:, 2]
    larg = 6.0
    b = np.floor((X + 600) / larg).astype(int)
    off = (b * 37 % 23) * 2.1
    comp = 30 + (b * 13 % 5) * 4
    seg = np.floor((Z + off) / comp).astype(int)
    idx = (b * 7 + seg * 3) % len(TABUAS)
    cor = np.array(TABUAS)[idx]
    v = amostra(VEIO, Z * 2.0 + b * 17, X * 6)
    cor = cor * (0.82 + 0.34 * v)[:, None]
    fx = np.mod(X + 600, larg)
    costura = (fx < 0.32) | (fx > larg - 0.12)
    emenda = np.mod(Z + off, comp) < 0.45
    cor[costura | emenda] *= 0.42
    prego = (np.abs(fx - 1.0) < 0.3) & (np.abs(np.mod(Z + off, comp) - 1.2) < 0.3)
    cor[prego] = hexa("#2a1a10")
    # Passadeira (tapete comprido) no corredor da luz, com franja nas pontas.
    ra, rb, rz0, rz1 = -98.0, -60.0, 8.0, 104.0
    u = X - ra
    w_ = rb - ra
    dentro = (X >= ra) & (X <= rb) & (Z >= rz0) & (Z <= rz1)
    franja = (X >= ra + 1) & (X <= rb - 1) & (((Z > rz1) & (Z < rz1 + 2.2)) | ((Z < rz0) & (Z > rz0 - 2.2))) & (np.mod(X, 1.2) < 0.6)
    marinho, verm, verm2, marfim, ouro, verde = (hexa(k) for k in ("#1a2a4a", "#8a2228", "#5e141a", "#e0d0a8", "#c8963a", "#1e5a50"))
    vv = np.minimum(Z - rz0, rz1 - Z)
    du = np.minimum(u, w_ - u)
    borda = np.minimum(du, vv)
    tc = np.tile(verm, (len(X), 1))
    tc[borda < 1.0] = marinho * 0.7
    faixa = (borda >= 1.0) & (borda < 6.0)
    tc[faixa] = marinho
    q = (np.floor(np.where(du < vv, Z, X) / 2.4).astype(int)) % 3
    tc[faixa & (borda > 2.2) & (borda < 4.8) & (q == 0)] = ouro
    tc[faixa & (borda > 2.2) & (borda < 4.8) & (q == 1)] = verde
    tc[(borda >= 6.0) & (borda < 7.0)] = ouro
    tc[(borda >= 7.0) & (borda < 8.0)] = verm2
    # Campo: losangos em cadeia com uma flor de oito pétalas em cada.
    cu = u - w_ / 2
    cv = np.mod(Z - rz0, 22) - 11
    rm = np.abs(cu) / 11 + np.abs(cv) / 10
    campo = borda >= 8.0
    tc[campo & (rm < 1) & (rm > 0.86)] = ouro
    tc[campo & (rm <= 0.86) & (rm > 0.6)] = marinho
    tc[campo & (rm <= 0.6) & (rm > 0.5)] = verde
    tc[campo & (rm <= 0.5) & (rm > 0.2)] = verm2
    tc[campo & (rm <= 0.2)] = marfim
    pont = campo & (rm >= 1) & ((np.mod(cu + cv * 1.3, 6) < 0.8) | (np.mod(cu - cv * 1.3, 6) < 0.8))
    tc[pont] = ouro * 0.8
    ga = np.random.default_rng(3).random(len(X)).astype(np.float32)
    tc = tc * (0.9 + 0.14 * ga)[:, None]
    cor[dentro] = tc[dentro]
    cor[franja] = marfim * 0.85
    return np.clip(cor, 0, 1)


def tracar(caixas: list[Caixa]):
    """Traça um raio por subamostra: devolve, em resolução de arte, albedo, Z, normal e o tipo do que foi atingido
    (−1 parede do fundo pintada, 0 chão, 1 parede/estante lateral, 2 móvel)."""
    hs, ws = H * SS, W * SS
    ys, xs = np.mgrid[0:hs, 0:ws]
    px = (xs + 0.5) / SS
    py = (ys + 0.5) / SS
    dx = (px - VX).astype(np.float64)
    dy = (VY - py).astype(np.float64)
    dz = -DIST
    t = np.ones((hs, ws))
    alvo = np.full((hs, ws), -1, np.int32)              # −1 parede do fundo, −2 chão, −3 parede esq., −4 parede dir.
    eixo = np.full((hs, ws), 2, np.int8)
    sinal = np.ones((hs, ws), np.int8)
    with np.errstate(divide="ignore", invalid="ignore"):
        tc = np.where(dy < 0, -OLHO / dy, np.inf)
        te = np.where(dx < 0, XE / dx, np.inf)
        td = np.where(dx > 0, XD / dx, np.inf)
    for (tt, ident, ax, sg) in ((tc, -2, 1, 1), (te, -3, 0, 1), (td, -4, 0, -1)):
        m = tt < t
        t[m], alvo[m], eixo[m], sinal[m] = tt[m], ident, ax, sg
    for i, c in enumerate(caixas):
        # recorte pela caixa projetada (só testa os raios que podem acertá-la)
        cantos = [proj(c.b[a, 0], c.b[b_, 1], min(c.b[d, 2], DIST - 60)) for a in (0, 1) for b_ in (0, 1) for d in (0, 1)]
        xa = max(0, int(min(p[0] for p in cantos) * SS) - 2)
        xb = min(ws, int(max(p[0] for p in cantos) * SS) + 3)
        ya = max(0, int(min(p[1] for p in cantos) * SS) - 2)
        yb = min(hs, int(max(p[1] for p in cantos) * SS) + 3)
        if c.b[1, 2] > DIST - 60:
            if c.b[0, 0] < 0:
                xa = 0
            else:
                xb = ws
            ya, yb = 0, hs
        if xa >= xb or ya >= yb:
            continue
        sx, sy = dx[ya:yb, xa:xb], dy[ya:yb, xa:xb]
        with np.errstate(divide="ignore", invalid="ignore"):
            t1x, t2x = c.b[0, 0] / sx, c.b[1, 0] / sx
            t1y, t2y = (c.b[0, 1] - OLHO) / sy, (c.b[1, 1] - OLHO) / sy
        t1z, t2z = (c.b[0, 2] - DIST) / dz, (c.b[1, 2] - DIST) / dz
        mnx, mxx = np.minimum(t1x, t2x), np.maximum(t1x, t2x)
        mny, mxy = np.minimum(t1y, t2y), np.maximum(t1y, t2y)
        mnz, mxz = min(t1z, t2z), max(t1z, t2z)
        tn = np.maximum(np.maximum(mnx, mny), mnz)
        tf = np.minimum(np.minimum(mxx, mxy), mxz)
        sub_t = t[ya:yb, xa:xb]
        hit = (tn <= tf) & (tn > 1e-6) & (tn < sub_t)
        if not hit.any():
            continue
        ax = np.where(mnx >= np.maximum(mny, mnz), 0, np.where(mny >= mnz, 1, 2)).astype(np.int8)
        dir_ax = np.where(ax == 0, sx, np.where(ax == 1, sy, dz))
        sub_t[hit] = tn[hit]
        alvo[ya:yb, xa:xb][hit] = i
        eixo[ya:yb, xa:xb][hit] = ax[hit]
        sinal[ya:yb, xa:xb][hit] = np.where(dir_ax[hit] > 0, -1, 1)
    P = np.stack([dx * t, OLHO + dy * t, DIST + dz * t], -1)
    N = np.zeros((hs, ws, 3))
    for a in range(3):
        N[..., a] = np.where(eixo == a, sinal, 0)
    alb = np.zeros((hs, ws, 3), np.float32)
    tipo = np.zeros((hs, ws), np.int8)
    for ident, kind, tp in ((-2, "chao", 0), (-3, "parede_e", 1), (-4, "parede_d", 1)):
        m = alvo == ident
        alb[m] = material(None, kind, P[m], N[m])
        tipo[m] = tp
    for i, c in enumerate(caixas):
        m = alvo == i
        if m.any():
            alb[m] = material(c, "", P[m], N[m])
            tipo[m] = 1 if c.mat in ("livros", "tabua", "rodape", "poste", "cornija", "friso", "latao") else 2
    tipo[alvo == -1] = -1
    # Reduz para a grade de arte: cor média das subamostras; Z e normal da subamostra central.
    alb1 = alb.reshape(H, SS, W, SS, 3).mean((1, 3))
    fundo = (alvo == -1).reshape(H, SS, W, SS).mean((1, 3))
    meio = SS // 2
    Z1 = P[meio::SS, meio::SS, 2].astype(np.float32)
    N1 = N[meio::SS, meio::SS].astype(np.float32)
    tipo1 = tipo[meio::SS, meio::SS]
    return alb1, fundo, Z1, N1, tipo1


# ─────────────────────────────── Objetos pintados à mão ───────────────────────────────
def esfera_armilar(c: Camada, e: np.ndarray) -> tuple:
    """Esfera armilar de latão num pé torneado, diante da janela (faz sombra na luz do chão). Devolve o oclusor."""
    Xc, Zc = -27.0, 40.0
    c.z_atual = Zc
    cx, cy = proj(Xc, 17.0, Zc)
    _, ybase = proj(Xc, 0, Zc)
    s = DIST / (DIST - Zc)
    r = 5.0 * s
    cx, cy = round(cx), round(cy)
    # Pé: base em cruz, coluna torneada, colar.
    yb = round(ybase)
    c.elipse(cx, yb - 0.5, 6, 1.6, MADEIRA[3])
    c.ret(cx - 5, yb - 2, 11, 1, MADEIRA[1])
    c.ret(cx - 3, yb - 3, 7, 1, MADEIRA[2])
    for y in range(round(cy + r) + 1, yb - 3):
        lw = 1 if (y - cy) % 5 in (1, 2) else 2
        c.ret(cx - lw // 2 - (1 if lw == 2 else 0) + (1 if lw == 1 else 0) - 1, y, lw + 1, 1, MADEIRA[2])
        c.p(cx - 1, y, MADEIRA[1])
    c.ret(cx - 2, round(cy + r) + 1, 5, 1, LATAO[2])
    # Anéis: meridiano, equador, eclíptica inclinada e o pequeno globo dentro.
    for k in range(80):
        a = k / 80 * math.tau
        for (rx, ry, rot, cor) in ((r, r, 0, LATAO[1]), (r, r * 0.32, 0, LATAO[2]), (r * 0.98, r * 0.36, 0.45, LATAO[1]),
                                    (r * 0.3, r, 0, LATAO[3])):
            x = rx * math.cos(a)
            y = ry * math.sin(a)
            xr, yr = x * math.cos(rot) - y * math.sin(rot), x * math.sin(rot) + y * math.cos(rot)
            frente = math.sin(a) > 0 if ry < r else True
            c.p(round(cx + xr), round(cy + yr), cor if frente else LATAO[3])
    c.elipse(cx, cy, 1.6, 1.6, "#3a6a8a")
    c.p(cx - 1, cy - 1, "#8ac0d8")
    c.ret(cx, round(cy - r - 2), 1, 2, LATAO[2])
    c.p(cx, round(cy - r - 3), LATAO[0])
    return ("esfera", np.array([Xc, 17.0, Zc]), 5.0), ("caixa", np.array([[Xc - 0.7, 0, Zc - 0.7], [Xc + 0.7, 12.4, Zc + 0.7]])), \
        ("caixa", np.array([[Xc - 3.5, 0, Zc - 3.5], [Xc + 3.5, 1.2, Zc + 3.5]]))


def escada(c: Camada) -> None:
    """Escada de biblioteca com rodinhas, presa no trilho de latão da estante da esquerda (na penumbra)."""
    pernas = []
    for zt, zb in ((38.0, 44.0), (46.5, 52.5)):
        pernas.append((proj(-150.0, 92.0, zt), proj(-137.0, 0.0, zb)))
    c.z_atual = 45
    # degraus
    for Y in range(6, 90, 8):
        t = 1 - Y / 92
        pts = []
        for (a, b) in pernas:
            pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
        (x0, y0), (x1, y1) = pts
        c.linha(x1 + 1, y1, x0 - 1, y0, MADEIRA[1])
        c.linha(x1 + 1, y1 + 1, x0 - 1, y0 + 1, MADEIRA[3])
    for k, (a, b) in enumerate(pernas):
        n = int(b[1] - a[1])
        for j in range(n + 1):
            x = a[0] + (b[0] - a[0]) * j / n
            y = a[1] + j
            c.p(round(x), round(y), MADEIRA[0] if k == 0 else MADEIRA[1])
            c.p(round(x) + 1, round(y), MADEIRA[2] if k == 0 else MADEIRA[3])
        c.ret(round(a[0]) - 1, round(a[1]) - 2, 3, 2, LATAO[2])
        c.p(round(a[0]), round(a[1]) - 2, LATAO[0])
        c.elipse(round(b[0]) + 0.5, round(b[1]) + 1, 1.8, 1.8, "#2a2a30")
        c.p(round(b[0]), round(b[1]) + 1, LATAO[2])


def poleiro(c: Camada) -> tuple[int, int]:
    """Pináculo entalhado em cima da cornija da direita: plinto com folhas de acanto, pescoço torneado com anel de
    latão e um prato largo e plano onde a coruja do site pousa. Devolve o ponto dos pés (centro do prato, em cima)."""
    Z = POLEIRO_Z
    c.z_atual = Z
    xb, yb = proj(107.0, CORNIJA_D[1], Z)
    xb, yb = round(xb), round(yb) + 1
    m0, m1, m2, m3, m4 = MADEIRA
    # Plinto (apoiado na cornija), com as quinas claras do lado da mesa.
    c.ret(xb - 5, yb - 4, 11, 4, m2)
    c.ret(xb - 5, yb - 4, 11, 1, m0)
    c.ret(xb - 5, yb - 3, 1, 3, m1)
    c.ret(xb + 5, yb - 3, 1, 3, m3)
    c.ret(xb - 3, yb - 2, 7, 1, m3)
    c.p(xb, yb - 2, LATAO[2])
    # Folhas de acanto enroladas nos dois lados.
    for (dx, dy, k) in ((-7, -1, m1), (-6, -2, m1), (-6, -1, m2), (-7, 0, m3), (7, -1, m2), (6, -2, m2), (6, -1, m3), (7, 0, m4)):
        c.p(xb + dx, yb + dy, k)
    # Pescoço torneado: bolacha, anel de latão, cintura e o colarinho embaixo do prato.
    for (j, lw, k) in ((5, 5, m1), (6, 3, m2), (7, 3, m2), (8, 5, None), (9, 3, m2), (10, 5, m1)):
        y = yb - j
        if k is None:
            c.ret(xb - 2, y, 5, 1, LATAO[2])
            c.p(xb - 2, y, LATAO[0])
            continue
        c.ret(xb - lw // 2, y, lw, 1, k)
        c.p(xb - lw // 2, y, m0)
        c.p(xb + lw // 2, y, m4)
    # Prato do poleiro (15 px): borda de cima clara, face entalhada e a sombra embaixo; pinhas de latão nas pontas.
    yt = yb - 13
    c.ret(xb - 8, yt, 17, 1, m0)
    c.ret(xb - 8, yt + 1, 17, 1, m1)
    c.ret(xb - 7, yt + 2, 15, 1, m2)
    for x in range(xb - 6, xb + 7, 2):
        c.p(x, yt + 1, m2)
    c.ret(xb - 6, yt + 3, 13, 1, m4)
    for sx in (-1, 1):
        x = xb + sx * 9
        c.p(x, yt - 1, LATAO[1])
        c.p(x, yt, LATAO[2])
        c.p(x, yt + 1, LATAO[3])
    return xb, yt


def cranio(c: Camada) -> tuple[int, int, int, int]:
    """Um crânio de estudo na prateleira da direita, em três-quartos, com a mandíbula e um livrinho embaixo.
    Devolve a caixa (x0, y0, x1, y1) em pixels de arte."""
    Yb = CAV_D[CRANIO_CAV][0]
    Z = (CRANIO_Z[0] + CRANIO_Z[1]) / 2
    c.z_atual = Z
    x, y = proj(106.0, Yb, Z)
    x, y = round(x), round(y)
    o0, o1, o2, o3, o4 = OSSO
    # livrinho deitado embaixo
    c.ret(x - 5, y - 2, 11, 2, "#6a1e24")
    c.ret(x - 5, y - 2, 11, 1, "#8e2a2a")
    c.ret(x + 5, y - 2, 1, 2, "#e0d4b0")
    y -= 2
    # calota
    for (dy, x0, x1) in ((-9, -2, 2), (-8, -3, 3), (-7, -4, 4), (-6, -4, 4), (-5, -4, 4), (-4, -4, 3), (-3, -3, 3), (-2, -2, 2), (-1, -2, 1)):
        for dx in range(x0, x1 + 1):
            k = o0 if dx <= -1 and dy <= -6 else o1 if dx <= 1 else o2
            c.p(x + dx, y + dy, k)
    c.p(x - 2, y - 9, "#fffaf0")
    c.p(x - 3, y - 7, "#fffaf0")
    # órbitas, nariz e dentes
    c.ret(x - 3, y - 5, 2, 2, o4)
    c.ret(x + 1, y - 5, 2, 2, o4)
    c.p(x - 1, y - 3, o3)
    c.p(x, y - 3, o4)
    c.p(x + 3, y - 4, o3)                  # malar na sombra
    for dx in (-2, -1, 0, 1):
        c.p(x + dx, y - 1, o1 if dx % 2 else o2)
    c.ret(x - 2, y, 4, 1, o3)
    c.p(x + 4, y - 6, o3)                  # contorno da calota no lado escuro
    return x - 5, y - 10, x + 6, y + 2


def mesa_objetos(c: Camada, e: np.ndarray, acesas: bool) -> dict:
    """Tudo o que está em cima da mesa. Devolve a posição das chamas e do livro raro (pixels de arte)."""
    c.z_atual = 72
    g = np.random.default_rng(34)
    luzes = {}
    # Duas velas em castiçais de latão (a da frente mais baixa), com cera escorrida.
    velas = []
    for (vx, vb, alt) in ((333, 125, 8), (338, 127, 5)):
        c.ret(vx - 2, vb, 5, 1, LATAO[2])
        c.ret(vx - 3, vb + 1, 7, 1, LATAO[3])
        c.p(vx - 2, vb, LATAO[0])
        c.ret(vx - 1, vb - 1, 3, 1, LATAO[1])
        c.ret(vx - 1, vb - 1 - alt, 2, alt, "#f0e6cc")
        c.ret(vx + 1, vb - 1 - alt, 1, alt, "#c8b890")
        c.p(vx - 1, vb - 1 - alt + 2, "#fff8e8")
        c.p(vx + 1, vb - 2 - alt + 3, "#f0e6cc")          # pingo de cera
        c.p(vx, vb - 1 - alt - 1, "#3a2a1a")              # pavio
        fy = vb - alt - 3
        if acesas:
            for (dx, dy, cor, k) in ((0, 0, "#ffffff", 1.3), (0, 1, "#fff0b0", 1.2), (0, -1, "#ffc860", 0.9),
                                     (0, -2, "#ff9a30", 0.45), (-1, 1, "#ffb040", 0.4), (0, 2, "#80a0ff", 0.35)):
                e[fy + dy, vx + dx] += hexa(cor) * k
        velas.append((vx, fy))
    luzes["velas"] = velas
    # Livro grande aberto: capa, bloco de folhas, páginas curvas, texto e uma prancha do joelho.
    esq, dirx, gx_, top_, bot_ = 344, 366, 355, 120, 127
    c.poligono([(esq - 2, bot_ + 1), (dirx + 2, bot_ + 1), (dirx + 1, top_ + 2), (esq - 1, top_ + 2)], "#4a2414")
    c.ret(esq - 1, bot_ + 1, dirx - esq + 3, 1, "#c8b890")
    for x in range(esq, dirx + 1):
        dist = abs(x + 0.5 - gx_)
        meia = (gx_ - esq) if x < gx_ else (dirx - gx_)
        t = min(1, dist / meia)
        ytop = top_ + 2.2 - 2.2 * math.sin(t * math.pi * 0.75) + 1.0 * t * t
        for y in range(int(round(ytop)), bot_ + 1):
            sombra = 0.64 + 0.36 * min(1, dist / 4)
            c.p(x, y, np.clip(hexa("#f0e6c8") * sombra * (0.94 if x < gx_ else 1), 0, 1))
        c.p(x, int(round(ytop)), np.clip(hexa("#fff8e4") * (0.75 + 0.25 * min(1, dist / 4)), 0, 1))
    c.ret(gx_, top_ + 2, 1, bot_ - top_ - 1, "#8a7a5a")
    c.ret(346, 122, 3, 2, "#9a2a20")
    for y in (122, 124, 126):
        x = 350 if y == 122 else 346
        while x < gx_ - 1:
            n = 1 + int(g.random() * 3)
            for i in range(n):
                if x + i < gx_ - 1:
                    c.p(x + i, y, "#4a3a2a", 0.8)
            x += n + 1
    sep, sep2 = "#5a3a1e", "#8a6038"
    c.linha(358, 124, 362, 121, sep2)
    c.p(363, 120, sep)
    c.p(357, 125, sep)
    for x in range(358, 365):
        if x % 2:
            c.p(x, 126, "#4a3a2a", 0.7)
    c.ret(351, bot_ + 2, 1, 4, "#a02020")                 # fitinha marcadora
    # Tinteiro com pena.
    c.ret(368, 121, 4, 4, "#1a2030")
    c.ret(369, 120, 2, 1, "#2a3040")
    c.p(368, 121, "#5a6a8a")
    c.linha(370, 120, 375, 110, "#e8e4dc")
    c.linha(371, 120, 376, 111, "#b8b4ac")
    c.p(376, 109, "#f8f4ec")
    # Lamparina de latão com manga de vidro.
    bx, by = 382, 125
    c.elipse(bx, by - 0.5, 4, 1.2, LATAO[2])
    c.ret(bx - 3, by - 1, 7, 1, LATAO[1])
    c.ret(bx - 1, by - 4, 3, 3, LATAO[2])
    c.p(bx - 1, by - 4, LATAO[0])
    c.elipse(bx, by - 6, 3.5, 2.2, LATAO[2])
    c.p(bx - 2, by - 7, LATAO[0])
    c.p(bx + 2, by - 5, LATAO[3])
    for k in range(4):
        c.p(bx + 4 + (1 if 0 < k < 3 else 0), by - 7 + k, LATAO[2])
    c.ret(bx - 2, by - 9, 5, 1, LATAO[1])
    for y in range(by - 17, by - 9):
        j = y - (by - 17)
        larg = 1 if j < 2 else 2
        for x in range(bx - larg, bx + larg + 1):
            borda = abs(x - bx) == larg
            if acesas:
                e[y, x] += hexa("#ffd8a0") * (0.45 if borda else 0.14)
            else:
                c.p(x, y, "#c8d0d8", 0.45 if borda else 0.2)
    c.ret(bx - 1, by - 18, 3, 1, LATAO[3])
    chama = (bx, by - 12)
    if acesas:
        for (dx, dy, cor, k) in ((0, 0, "#ffffff", 1.5), (0, 1, "#fff4c0", 1.3), (0, -1, "#ffd070", 1.0), (0, 2, "#ff9a30", 0.6),
                                 (0, -2, "#ff9030", 0.4)):
            e[chama[1] + dy, chama[0] + dx] += hexa(cor) * k
    luzes["lamparina"] = chama
    # Ampulheta.
    hx, hb = 390, 126
    c.ret(hx - 2, hb, 5, 1, MADEIRA[1])
    c.ret(hx - 2, hb - 8, 5, 1, MADEIRA[1])
    for j in range(7):
        larg = abs(j - 3) * 0.6 + 0.6
        c.ret(round(hx + 0.5 - larg), hb - 7 + j, max(1, round(larg * 2)), 1, "#c8d8e0", 0.55)
    c.ret(hx - 1, hb - 2, 3, 2, "#e8c070")
    c.p(hx, hb - 3, "#e8c070")
    c.p(hx, hb - 5, "#e8c070", 0.7)
    c.ret(hx - 2, hb - 7, 1, 7, MADEIRA[2])
    c.ret(hx + 2, hb - 7, 1, 7, MADEIRA[3])
    # Lupa deitada diante do livro.
    lx, ly = 370, 129
    for y in range(ly - 2, ly + 2):
        for x in range(lx - 3, lx + 4):
            r = ((x + 0.5 - lx) / 3.4) ** 2 + ((y + 0.5 - ly) / 1.9) ** 2
            if r <= 1:
                c.p(x, y, (LATAO[1] if y < ly else LATAO[2]) if r > 0.55 else "#b8d0d0")
    c.p(lx - 1, ly - 1, "#ffffff")
    c.linha(lx + 4, ly, lx + 8, ly + 1, "#3a1e10")
    c.p(lx + 3, ly, LATAO[0])
    # O livro raro: fechado, capa verde-escura com cantoneiras e fecho de ouro, brilhando de leve (emissivo).
    rx, ry = 398, 128
    c.ret(rx - 5, ry - 2, 10, 3, "#14403c")
    c.ret(rx - 5, ry - 2, 10, 1, "#2a6a62")
    c.ret(rx - 5, ry + 1, 10, 1, "#0a2a26")
    c.ret(rx + 5, ry - 1, 1, 2, "#e8dcb8")
    for (dx, dy) in ((-5, -2), (4, -2), (-5, 0), (4, 0)):
        c.p(rx + dx, ry + dy, LATAO[1])
    c.ret(rx - 1, ry - 1, 2, 1, "#e8c25a")
    c.p(rx + 5, ry, LATAO[1])                                 # fecho
    for (dx, dy, cor, k) in ((-1, -1, "#ffe7a0", 0.8), (0, -1, "#ffe7a0", 0.9), (-3, -2, "#5af0d8", 0.35), (2, -2, "#5af0d8", 0.35),
                             (-4, -1, "#3ad0c0", 0.25), (3, 0, "#3ad0c0", 0.25), (0, 0, "#5af0d8", 0.3)):
        e[ry + dy, rx + dx] += hexa(cor) * k
    luzes["raro"] = (rx, ry - 1)
    return luzes


def pergaminho_no_chao(c: Camada) -> None:
    """Um rolo de pergaminho caído no assoalho, na luz da janela: o rolo enrolado (cilindro com as espirais nas pontas),
    a língua de papel desenrolada com linhas de texto e o selo de cera vermelha."""
    c.z_atual = 62
    x, y = (round(v) for v in proj(-12.0, 0.0, 62.0))
    # língua desenrolada (sai do rolo para a esquerda e para a frente)
    lingua = [(x - 1, y - 1), (x + 9, y - 1), (x + 7, y + 3), (x - 4, y + 3)]
    c.poligono(lingua, "#e8dab4")
    c.linha(x - 4, y + 3, x + 7, y + 3, "#b8a47a")
    for (dy, xa, xb) in ((0, x, x + 7), (1, x - 1, x + 6), (2, x - 2, x + 5)):
        for xx in range(xa, xb):
            if (xx * 5 + dy * 3) % 4:
                c.p(xx, y + dy, "#6a5a40", 0.55)
    # rolo: cilindro deitado ao longo de X, com realce em cima e as espirais nas pontas
    c.ret(x - 2, y - 3, 13, 2, "#dccb9c")
    c.ret(x - 2, y - 3, 13, 1, "#f6ecd2")
    c.ret(x - 2, y - 1, 13, 1, "#a8946a")
    for xx in (x - 3, x + 11):
        c.p(xx, y - 3, "#c8b48a")
        c.p(xx, y - 2, "#8a7650")
        c.p(xx, y - 1, "#c8b48a")
    # fita e selo
    c.ret(x + 4, y - 3, 1, 3, "#8e2a2a")
    c.ret(x + 4, y, 2, 2, "#a02020")
    c.p(x + 4, y, "#d04040")


def primeiro_plano() -> Camada:
    """Perto da câmera (vai desfocado): a viga do teto atravessando o alto e uma lanterna de ferro apagada pendurada
    à esquerda, sobre a área do título."""
    c = Camada(150.0)
    for x in range(W):
        h = 4 + int(1.2 * math.sin(x / 23.0))
        c.ret(x, 0, 1, h, "#120a04")
        c.p(x, h, "#2a1a0c")
    for x in range(0, W, 60):
        c.ret(x, 0, 3, 7, "#1e1208")
    # Lanterna: corrente, chapéu, gaiola com vidros escuros e uma vela apagada.
    lx = 58
    for y in range(4, 24):
        c.p(lx + (1 if y % 3 == 0 else 0), y, FERRO[2])
    c.poligono([(lx - 6, 30), (lx + 7, 30), (lx + 3, 24), (lx - 2, 24)], FERRO[2])
    c.ret(lx - 5, 31, 12, 14, FERRO[3])
    c.ret(lx - 4, 32, 4, 12, "#2a3040")
    c.ret(lx + 2, 32, 4, 12, "#262a38")
    c.ret(lx, 31, 2, 14, FERRO[2])
    c.ret(lx - 6, 45, 14, 2, FERRO[2])
    c.ret(lx - 1, 47, 4, 2, FERRO[3])
    return c


# ─────────────────────────────── Montagem com luz ───────────────────────────────
def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    """Desfoque gaussiano separável em float (sem perder as luzes acima de 1)."""
    if raio <= 0:
        return arr
    n = int(raio * 3) + 1
    k = np.exp(-(np.arange(-n, n + 1, dtype=np.float32) ** 2) / (2 * raio * raio))
    k /= k.sum()
    out = np.pad(arr.astype(np.float32), ((n, n), (0, 0), (0, 0)), mode="edge")
    out = sum(out[i:i + arr.shape[0]] * k[i] for i in range(2 * n + 1))
    out = np.pad(out, ((0, 0), (n, n), (0, 0)), mode="edge")
    return sum(out[:, i:i + arr.shape[1]] * k[i] for i in range(2 * n + 1)).astype(np.float32)


def desfocar_rgba(arr: np.ndarray, raio: float) -> np.ndarray:
    pm = arr.copy()
    pm[:, :, :3] *= pm[:, :, 3:4]
    d = desfocar(pm, raio)
    a = np.maximum(d[:, :, 3:4], 1e-4)
    d[:, :, :3] = d[:, :, :3] / a
    return d


def contraluz(alfa: np.ndarray, dx: int, dy: int) -> np.ndarray:
    viz = np.roll(np.roll(alfa, -dy, 0), -dx, 1)
    return ((alfa > 0.5) & (viz < 0.5)).astype(np.float32)


def dir_luz() -> np.ndarray:
    """Direção em que a luz do sol/lua viaja (entra pela janela, desce, vem para a câmera e para a esquerda)."""
    v = {"manha": (-0.40, -0.78, 1.0), "tarde": (-0.44, -0.52, 1.0), "noite": (-0.40, -0.66, 1.0)}[PERIODO]
    return np.array(v, dtype=np.float64)


def ocluido(P: np.ndarray, L: np.ndarray, tmax: np.ndarray, oclusores) -> np.ndarray:
    """O segmento de P na direção −L (até tmax) bate em algum oclusor (caixa ou esfera)?"""
    d = -L
    bate = np.zeros(len(P), bool)
    for oc in oclusores:
        if oc[0] == "caixa":
            b = oc[1]
            with np.errstate(divide="ignore", invalid="ignore"):
                t1 = (b[0] - P) / d
                t2 = (b[1] - P) / d
            tn = np.minimum(t1, t2).max(1)
            tf = np.maximum(t1, t2).min(1)
            bate |= (tn <= tf) & (tf > 0) & (tn < tmax)
        else:
            c, r = oc[1], oc[2]
            oc_ = P - c
            dd = d / np.linalg.norm(d)
            b_ = (oc_ * dd).sum(1)
            cc = (oc_ * oc_).sum(1) - r * r
            disc = b_ * b_ - cc
            tq = -b_ - np.sqrt(np.maximum(disc, 0))
            bate |= (disc > 0) & (tq > 0) & (tq < tmax * np.linalg.norm(d))
    return bate


def luz_da_janela(P: np.ndarray, L: np.ndarray, trans3: np.ndarray, oclusores) -> np.ndarray:
    """Traça cada ponto de volta até a parede da janela na direção da luz: devolve a cor transmitida (RGB),
    já com a sombra dos caixilhos e dos móveis."""
    tt = P[:, 2] / L[2]
    Xw = P[:, 0] - tt * L[0]
    Yw = P[:, 1] - tt * L[1]
    xw = (VX + Xw) * ESC
    yw = (CHAO - Yw) * ESC
    ok = (P[:, 2] > 0.5) & (xw >= 0) & (xw < W * ESC) & (yw >= 0) & (yw < H * ESC)
    out = np.zeros((len(P), 3), np.float32)
    if ok.any():
        out[ok] = trans3[yw[ok].astype(int), xw[ok].astype(int)]
        bate = ocluido(P[ok], L, tt[ok], oclusores)
        out[np.flatnonzero(ok)[bate]] = 0
    return out


def montar() -> Image.Image:
    P_ = PERIODO
    noite, tarde, manha = P_ == "noite", P_ == "tarde", P_ == "manha"
    acesas = not manha
    k_vela = {"manha": 0.0, "tarde": 0.6, "noite": 1.0}[P_]
    cor_sol = hexa({"manha": "#ffe2a8", "tarde": "#ff9448", "noite": "#a8c0ff"}[P_])
    k_sol = {"manha": 2.2, "tarde": 2.3, "noite": 2.0}[P_]

    emis1 = np.zeros((H, W, 3), dtype=np.float32)
    fundo = parede_fundo()
    emis_jan, trans = janela(fundo)
    emis1 += emis_jan * {"manha": 0.92, "tarde": 1.05, "noite": 0.95}[P_]

    caixas = caixas_da_sala()
    alb_rt, frac_fundo, Z1, N1, tipo1 = tracar(caixas)
    alb = alb_rt * (1 - frac_fundo[:, :, None]) + fundo.c[:, :, :3] * frac_fundo[:, :, None]
    Z = np.where(frac_fundo > 0.5, 0.0, Z1).astype(np.float32)
    N = N1.copy()
    N[frac_fundo > 0.5] = (0, 0, 1)

    # Objetos pintados à mão por cima (cada um com o seu Z).
    obj = Camada(0)
    oclus = list(esfera_armilar(obj, emis1))
    escada(obj)
    pe_coruja = poleiro(obj)
    caixa_cranio = cranio(obj)
    pergaminho_no_chao(obj)
    emis_mesa = np.zeros((H, W, 3), dtype=np.float32)
    luzes = mesa_objetos(obj, emis_mesa, acesas)
    emis1 += emis_mesa * np.where(np.arange(W)[None, :, None] >= 393, 1.0, k_vela if acesas else 0)
    a = obj.c[:, :, 3:4]
    alb = alb * (1 - a) + obj.c[:, :, :3] * a
    sel = obj.c[:, :, 3] > 0.5
    Z[sel] = obj.z[sel]
    N[sel] = (0, 0.25, 0.97)
    eh_obj = sel
    oclus += [("caixa", c.b) for c in caixas if c.mat in ("tampo", "saia", "livro")]

    # Ampliação 3x: posição de cada pixel no mundo (chão e paredes laterais exatos; o resto pelo Z do pixel).
    hs, ws = H * ESC, W * ESC
    YS, XS = (m.astype(np.float32) / ESC for m in np.mgrid[0:hs, 0:ws])
    alb3 = ampliar(alb)
    Z3 = ampliar(Z[:, :, None])[:, :, 0]
    N3 = ampliar(N)
    tipo3 = ampliar(tipo1[:, :, None])[:, :, 0]
    obj3 = ampliar(eh_obj[:, :, None].astype(np.float32))[:, :, 0] > 0.5
    chao3 = (tipo3 == 0) & ~obj3 & (YS > VY)
    with np.errstate(divide="ignore"):
        Zc = DIST - DIST * OLHO / np.maximum(YS - VY, 1e-3)
    Z3 = np.where(chao3, Zc, Z3)
    s3 = DIST / (DIST - Z3)
    P3 = np.stack([(XS - VX) / s3, OLHO - (YS - VY) / s3, Z3], -1).reshape(-1, 3).astype(np.float64)
    Nf = N3.reshape(-1, 3).astype(np.float64)
    Nf /= np.maximum(np.linalg.norm(Nf, axis=1, keepdims=True), 1e-6)

    trans3 = ampliar(trans)
    L = dir_luz()
    Ln = L / np.linalg.norm(L)

    # 1) Luz direta da janela (sol/lua) em cada superfície, com caixilhos e sombras.
    direta = luz_da_janela(P3, L, trans3, oclus)
    lamb = np.clip((Nf * -Ln).sum(1), 0, 1)
    direta *= lamb[:, None]
    direta = direta.reshape(hs, ws, 3)
    direta = desfocar(direta, 1.3)

    # 2) Ambiente: frio do alto, quente rebatido do chão, e a claridade difusa da janela (área de luz).
    amb_cor, k_amb = {"manha": ("#7a7e98", 0.7), "tarde": ("#5e4462", 0.68), "noite": ("#2c3a6a", 0.98)}[P_]
    luz = np.zeros((hs * ws, 3), np.float32) + hexa(amb_cor) * k_amb
    ceu_med = emis_jan[10:112, 255:321].reshape(-1, 3).mean(0) / max(emis_jan[10:112, 255:321].reshape(-1, 3).mean(), 1e-3)
    for (wx, wy) in ((270, 40), (305, 40), (270, 95), (305, 95), (288, 20)):
        Xw, Yw = desproj(wx, wy, 0.0)
        wv = np.array([Xw, Yw, 3.0]) - P3
        d = np.linalg.norm(wv, axis=1)
        wn = wv / np.maximum(d[:, None], 1e-6)
        cos_s = np.clip((Nf * wn).sum(1) * 0.75 + 0.25, 0, 1)
        cos_j = np.clip(-wn[:, 2], 0, 1)
        k = {"manha": 0.9, "tarde": 0.75, "noite": 0.5}[P_]
        luz += ((cos_s * cos_j / (1 + (d / 85) ** 2)) * k / 5 * 2.2)[:, None] * (ceu_med * 0.5 + cor_sol * 0.5)
    # O chão iluminado rebate luz quente/fria para cima (bounce).
    for (Xb, Zb) in ((-22.0, 30.0), (-35.0, 55.0)):
        bv = np.array([Xb, 2.0, Zb]) - P3
        d = np.linalg.norm(bv, axis=1)
        luz += ((np.clip((Nf * (bv / np.maximum(d[:, None], 1e-6))).sum(1) * 0.6 + 0.4, 0, 1)) / (1 + (d / 45) ** 2) * 0.22 * k_sol)[:, None] * cor_sol

    # 3) Velas, lamparina e o brilho do livro raro (luzes pontuais com sombra da mesa no chão).
    pontos = []
    for (vx, vy) in luzes["velas"]:
        pontos.append((vx, vy, "#ffb860", 0.55 * k_vela, 30))
    lx_, ly_ = luzes["lamparina"]
    pontos.append((lx_, ly_, "#ffb46c", 1.15 * k_vela, 46))
    rx_, ry_ = luzes["raro"]
    pontos.append((rx_, ry_, "#4ae0c8", 0.32 + 0.25 * (P_ == "noite"), 14))
    tampo = [("caixa", c.b) for c in caixas if c.mat == "tampo"]
    for (px, py, cor, k, r) in pontos:
        if k <= 0:
            continue
        Zl = 30.0 if py < 30 else 72.0
        Xl, Yl = desproj(px, py, Zl)
        lv = np.array([Xl, Yl, Zl]) - P3
        d = np.linalg.norm(lv, axis=1)
        ln = lv / np.maximum(d[:, None], 1e-6)
        cs = np.clip((Nf * ln).sum(1) * 0.7 + 0.3, 0, 1)
        I = cs / (1 + (d / r) ** 2) * k
        # sombra: o tampo da mesa tapa o chão embaixo dela
        baixo = P3[:, 1] < 12.4
        idx = np.flatnonzero(baixo & (I > 0.01))
        if len(idx):
            Pl = P3[idx]
            dl = np.array([Xl, Yl, Zl]) - Pl
            # o segmento até a luz cruza o tampo?
            b = tampo[0][1]
            with np.errstate(divide="ignore", invalid="ignore"):
                t1 = (b[0] - Pl) / dl
                t2 = (b[1] - Pl) / dl
            tn = np.minimum(t1, t2).max(1)
            tf = np.maximum(t1, t2).min(1)
            sombra = (tn <= tf) & (tf > 0) & (tn < 1)
            msk = np.zeros(len(I), np.float32)
            msk[idx[sombra]] = 1
            msk = desfocar(msk.reshape(hs, ws)[:, :, None], 7)[:, :, 0].reshape(-1)
            I *= 1 - 0.82 * msk
        luz += I[:, None] * hexa(cor)
    # Preenchimento quente e largo do canto de leitura (rebate das velas nas estantes e no chão).
    for (pos, raio, k, cor) in (((60.0, 20.0, 82.0), 34, 0.45 * k_vela, "#ff9a50"),
                                ((30.0, 14.0, 112.0), 30, 0.55 * k_vela + 0.25, "#ffa868" if acesas else "#c8b8a0")):
        fv = np.array(pos) - P3
        d = np.linalg.norm(fv, axis=1)
        luz += ((np.clip((Nf * fv / np.maximum(d[:, None], 1e-6)).sum(1) * 0.5 + 0.5, 0, 1)) / (1 + (d / raio) ** 2) * k)[:, None] * hexa(cor)
    luz = luz.reshape(hs, ws, 3)

    # Oclusão de ambiente simples: cantos junto das paredes e do chão, embaixo da mesa e em volta da pilha.
    Pg = P3.reshape(hs, ws, 3)
    ao = np.ones((hs, ws), np.float32)
    perto_chao = np.exp(-np.maximum(Pg[..., 1], 0) / 3.0)
    ao *= 1 - 0.35 * perto_chao * np.exp(-np.maximum(Pg[..., 0] - (-151.5), 0) / 5)
    ao *= 1 - 0.35 * perto_chao * np.exp(-np.maximum(105.5 - Pg[..., 0], 0) / 5)
    ao *= 1 - 0.3 * perto_chao * np.exp(-np.maximum(Pg[..., 2], 0) / 4)
    for (Xa, Xb, Za, Zb, k) in ((28, 72, 66, 80, 0.55), (7.5, 24.5, 87.5, 95, 0.6), (-31, -23, 36, 44, 0.35)):
        dxs = np.maximum(np.maximum(Xa - Pg[..., 0], Pg[..., 0] - Xb), 0)
        dzs = np.maximum(np.maximum(Za - Pg[..., 2], Pg[..., 2] - Zb), 0)
        dd = np.sqrt(dxs ** 2 + dzs ** 2)
        ao *= 1 - k * chao3 * np.exp(-dd / 2.2)
    ao = desfocar(ao[:, :, None], 1.5)[:, :, 0]

    img = alb3 * (luz * ao[:, :, None] + direta * cor_sol * k_sol)

    # Contraluz do sol nas bordas dos objetos que estão na luz (a esfera armilar, a escada, a pilha).
    rim = np.zeros((H, W), np.float32)
    for (dx, dy) in ((1, 0), (0, -1), (1, -1)):
        rim = np.maximum(rim, contraluz(obj.c[:, :, 3], dx, dy))
    rim3 = desfocar(ampliar(rim[:, :, None]), 0.6)[:, :, 0]
    vis = luz_da_janela(P3, L, trans3, []).reshape(hs, ws, 3)
    img += (rim3[:, :, None] * vis * 0.45 * k_sol) * cor_sol

    # Emissivos (vidro, chamas, livro raro).
    vidro3 = ampliar((emis_jan.sum(2) > 0)[:, :, None].astype(np.float32))[:, :, 0]
    emis3 = ampliar(emis1)
    img = img * (1 - vidro3[:, :, None]) + emis3 * vidro3[:, :, None] + emis3 * (1 - vidro3[:, :, None])

    # 4) Fachos volumétricos: cada raio da câmera atravessa o ar até a superfície e soma a luz que chega da janela.
    res = 1.5
    hv, wv = int(H * res), int(W * res)
    yv, xv = np.mgrid[0:hv, 0:wv]
    pxv, pyv = (xv + 0.5) / res, (yv + 0.5) / res
    Zs = Z3[(pyv * ESC).astype(int), (pxv * ESC).astype(int)]
    Zs = np.where(chao3[(pyv * ESC).astype(int), (pxv * ESC).astype(int)],
                  DIST - DIST * OLHO / np.maximum(pyv - VY, 1e-3), Zs)
    Zs = np.clip(Zs, 0, 118).reshape(-1)
    pxv, pyv = pxv.reshape(-1).astype(np.float64), pyv.reshape(-1).astype(np.float64)
    zperto = 118.0
    npas = 56
    acc = np.zeros((len(pxv), 3), np.float32)
    gf = np.random.default_rng(93)
    nos = gf.random(80)
    nos[nos < 0.35] *= 0.25
    nz = ruido(91, 5, 240, 240)
    g = np.random.default_rng(12)
    for i in range(npas):
        f = (i + g.random(len(pxv))) / npas
        Zk = Zs + (zperto - Zs) * f
        sk = DIST / (DIST - Zk)
        Pk = np.stack([(pxv - VX) / sk, OLHO - (pyv - VY) / sk, Zk], -1)
        dentro = (Pk[:, 0] > -150) & (Pk[:, 0] < 105) & (Pk[:, 1] > 0) & (zperto > Zs)
        if not dentro.any():
            continue
        idx = np.flatnonzero(dentro)
        Pi = Pk[idx]
        tr = luz_da_janela(Pi, L, trans3, oclus)
        tt = Pi[:, 2] / L[2]
        Xw = Pi[:, 0] - tt * L[0]
        Yw = Pi[:, 1] - tt * L[1]
        q = (Xw + 40) * 0.42 + Yw * 0.1
        q0 = np.clip(np.floor(q).astype(int), 0, 78)
        fq = np.clip(q - q0, 0, 1)
        fq = fq * fq * (3 - 2 * fq)
        dens = 0.05 + 2.4 * (nos[q0] * (1 - fq) + nos[q0 + 1] * fq) ** 2.5
        dens *= 0.6 + 0.8 * amostra(nz, Xw * 1.3 + Pi[:, 2] * 0.15, Yw * 1.3)
        dens *= (1 - 0.6 * np.clip(Pi[:, 2] / 115, 0, 1) ** 2) * np.clip(Pi[:, 2] / 6, 0, 1) * np.clip(Pi[:, 1] / 14, 0.2, 1)
        acc[idx] += tr * dens[:, None] * ((zperto - Zs[idx]) / npas)[:, None]
    acc = acc.reshape(hv, wv, 3)
    feixe = np.stack([np.asarray(Image.fromarray(acc[:, :, k]).resize((ws, hs), Image.BICUBIC)) for k in range(3)], -1)
    feixe = desfocar(np.maximum(feixe, 0), 2.0)
    fm = feixe.mean(2)
    feixe /= max(float(np.percentile(fm[fm > 0.02 * fm.max()], 97)), 1e-6)
    k_feixe = {"manha": 0.6, "tarde": 0.7, "noite": 0.75}[P_]
    img += feixe * cor_sol * k_feixe

    # Poeira dentro dos fachos (pontos no espaço, iluminados pela janela, escondidos atrás dos móveis).
    g = np.random.default_rng(5)
    n = 9000
    Pp = np.stack([g.uniform(-110, 60, n), g.uniform(9, 100, n), g.uniform(2, 100, n)], -1)
    tr = luz_da_janela(Pp, L, trans3, oclus).mean(1)
    xs_, ys_ = proj(Pp[:, 0], Pp[:, 1], Pp[:, 2])
    xi, yi = (xs_ * ESC).astype(int), (ys_ * ESC).astype(int)
    ok = (tr > 0.05) & (xi >= 0) & (xi < ws - 1) & (yi >= 0) & (yi < hs - 1)
    ok &= Z3[np.clip(yi, 0, hs - 1), np.clip(xi, 0, ws - 1)] <= Pp[:, 2] + 0.5
    poeira = np.zeros((hs, ws), np.float32)
    brilho = tr * (0.35 + g.random(n) * 0.9)
    for j in np.flatnonzero(ok)[:700]:
        poeira[yi[j], xi[j]] += brilho[j]
        if g.random() < 0.35:
            poeira[yi[j], xi[j] + 1] += brilho[j] * 0.45
    img += np.clip(poeira, 0, 1.5)[:, :, None] * cor_sol * 0.7
    # Faíscas mágicas em volta do livro raro (verde-água e ouro).
    rx_, ry_ = luzes["raro"]
    for _ in range(26):
        ang, r = g.random() * math.tau, 1.5 + g.random() ** 0.7 * 7
        x, y = int((rx_ + math.cos(ang) * r) * ESC), int((ry_ - 3 - abs(math.sin(ang)) * r * 0.9) * ESC)
        if 0 <= x < ws and 0 <= y < hs:
            img[y, x] += (hexa("#7af8e0") if g.random() < 0.6 else hexa("#ffe7a0")) * (0.25 + g.random() * 0.5)

    # Halos das chamas e do livro raro.
    def halo(px, py, r):
        return np.exp(-(((XS - px) ** 2 + (YS - py) ** 2) / (r * r)))
    if acesas:
        h = halo(lx_, ly_, 16) * 0.22 + halo(lx_, ly_, 4) * 0.6
        for (vx, vy) in luzes["velas"]:
            h += halo(vx, vy, 9) * 0.18 + halo(vx, vy, 2.5) * 0.4
        img += (h * k_vela)[:, :, None] * hexa("#ffb860")
    img += (halo(rx_, ry_, 9) * (0.16 + 0.1 * noite))[:, :, None] * hexa("#3ad8c0")

    # Profundidade de campo: fundo levemente desfocado, meio nítido.
    fundo_m = np.clip((14 - Z3) / 14, 0, 1)[:, :, None] * (1 - vidro3[:, :, None] * 0.6)
    img = img * (1 - fundo_m) + desfocar(img, 0.9) * fundo_m

    # Primeiro plano desfocado e escuro (viga e lanterna).
    fg = primeiro_plano()
    fg3 = desfocar_rgba(ampliar(fg.c), 6)
    fgc = fg3[:, :, :3] * (hexa(amb_cor) * 0.55)
    img = img * (1 - fg3[:, :, 3:4]) + fgc * fg3[:, :, 3:4]

    # Brilho (bloom) das luzes fortes.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.62) * 3, 0, 1), 0, 2)
    img += desfocar(claro, 16) * 0.45 + desfocar(claro, 4) * 0.32

    # Mapeamento de tons: as luzes fortes encostam no branco sem estourar em chapado.
    lum = img.mean(2, keepdims=True)
    comp = np.where(lum > 0.6, 0.6 + (lum - 0.6) / (1 + (lum - 0.6) * 1.6), lum) / np.maximum(lum, 1e-4)
    img = img * comp
    lum2 = img.mean(2, keepdims=True)
    img = img + (lum2 - img) * np.clip((lum2 - 0.72) * 0.8, 0, 0.35)

    # Correção de cor: altas luzes quentes, sombras frias; contraste.
    quente, fria = (hexa(c_) for c_ in {"manha": ("#fff0d8", "#24366a"), "tarde": ("#ffcf98", "#2e1a48"),
                                         "noite": ("#ffd9a0", "#16204a")}[P_])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * quente + (1 - lum) * (fria * 0.6 + 0.4)))
    img = np.clip((img - 0.45) * 1.1 + 0.45, 0, 1.4)

    # Lado esquerdo mais calmo (título e busca): menos contraste e mais escuro, mas com os detalhes.
    calma = np.clip((0.47 - XS / W) / 0.17, 0, 1)[:, :, None]
    media = img.mean(2, keepdims=True)
    suave = (media + (img - media) * 0.75) * 0.86 + hexa("#0c1228") * 0.05
    img = img * (1 - calma) + suave * calma

    # Vinheta e grão.
    vv = ((XS / W - 0.6) ** 2 * 1.1 + (YS / H - 0.52) ** 2 * 1.5)
    img *= (1 - np.clip(vv - 0.1, 0, 1) * 0.95)[:, :, None]
    g = np.random.default_rng(99)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.016
    final = Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))

    ANCORAS.update({"coruja_pes": pe_coruja, "cranio": caixa_cranio, "raro": luzes["raro"]})
    return final


ANCORAS: dict = {}


def pilha_topo() -> tuple[float, float, float, float]:
    """Topo da pilha do gato (x0, x1, y da borda de trás, y da borda da frente) em pixels de arte."""
    x0, yf = proj(8.0, 8.0, 95.0)
    x1, _ = proj(23.8, 8.0, 95.0)
    _, yt = proj(8.0, 8.0, 88.0)
    return x0, x1, yt, yf


def com_marcas(img: Image.Image) -> Image.Image:
    """Cópia da cena com marcadores coloridos nas âncoras (para conferir)."""
    im = img.convert("RGB").copy()
    d = ImageDraw.Draw(im)

    def P(x, y):
        return x * ESC, y * ESC
    cx, cy = ANCORAS["coruja_pes"]
    d.rectangle([P(cx - 8, cy - 19), P(cx + 8, cy)], outline=(255, 0, 255), width=2)
    d.ellipse([P(cx - 1, cy - 1), P(cx + 1, cy + 1)], fill=(255, 0, 255))
    x0, x1, yt, yf = pilha_topo()
    xm = (x0 + x1) / 2
    d.rectangle([P(xm - 10.5, yf - 13), P(xm + 10.5, yf)], outline=(0, 255, 0), width=2)
    d.line([P(x0, yf), P(x1, yf)], fill=(0, 255, 0), width=2)
    rx, ry, rr = RELOGIO
    d.ellipse([P(rx - rr, ry - rr), P(rx + rr, ry + rr)], outline=(0, 200, 255), width=2)
    for (ax, ay) in ARANDELAS:
        d.rectangle([P(ax - 3, ay), P(ax + 3, ay + 10)], outline=(255, 160, 0), width=2)
    d.rectangle([P(JX0, 10), P(JX1, JBASE)], outline=(255, 255, 255), width=1)
    rx, ry = ANCORAS["raro"]
    d.ellipse([P(rx - 2, ry - 2), P(rx + 2, ry + 2)], outline=(0, 255, 200), width=2)
    a, b, c_, e_ = ANCORAS["cranio"]
    d.rectangle([P(a, b), P(c_, e_)], outline=(255, 60, 60), width=2)
    d.rectangle([P(326, 123), P(406, 153)], outline=(255, 255, 0), width=1)
    for x in (12, 466):
        d.rectangle([P(x - 8, 160), P(x + 8, 180)], outline=(120, 120, 255), width=1)
    d.line([P(216, 0), P(216, 180)], fill=(255, 255, 255), width=1)
    return im


# ─────────────────────────────── Texturas das estantes em CSS ───────────────────────────────
def texturas() -> None:
    """Fundo de estante (48x48, repete nos dois sentidos), frente da tábua (48x7, repete na horizontal) e a coluna
    entalhada (10x48, repete na vertical), na mesma paleta de nogueira da cena."""
    pal = [hexa(c) for c in MADEIRA]
    # Fundo: tábuas verticais de 12 px com veio fino e frisos escuros; escuro e calmo (os livros ficam na frente).
    g = np.random.default_rng(61)
    veio = np.zeros((48, 48), np.float32)
    for x in range(48):
        fase = g.random() * 6
        for y in range(48):
            veio[y, x] = 0.5 + 0.5 * math.sin((y / 48) * math.tau * 2 + fase + 0.6 * math.sin(x * 0.9))
    f = np.zeros((48, 48, 4), np.uint8)
    for y in range(48):
        for x in range(48):
            u = x % 12
            tabua = x // 12
            base = pal[4] * (0.92 + 0.1 * ((tabua * 5) % 3) / 2)
            cor = base * (0.94 + 0.12 * veio[y, x])
            if u == 0:
                cor = pal[4] * 0.62
            elif u == 1:
                cor = mistura(pal[4], pal[3], 0.55)
            elif u == 11:
                cor = pal[4] * 0.8
            if (x * 7 + y * 3 + tabua) % 41 == 0 and u not in (0, 1, 11):
                cor = mistura(pal[4], pal[3], 0.4)
            # nó discreto
            if math.hypot((x - 30) * 1.4, y - 20) < 1.6:
                cor = pal[4] * 0.75
            f[y, x, :3] = np.clip(cor * 255, 0, 255).astype(np.uint8)
            f[y, x, 3] = 255
    Image.fromarray(f, "RGBA").save(PASTA / "estante-fundo.png", optimize=True)
    # Tábua: realce em cima, face com veio e a linha de sombra embaixo (transparente abaixo da sombra).
    t = np.zeros((7, 48, 4), np.uint8)
    linhas = [pal[0], pal[1], pal[1], pal[2], pal[2], pal[3], np.array([0.08, 0.04, 0.02])]
    alfa = [255, 255, 255, 255, 255, 255, 150]
    for y in range(7):
        for x in range(48):
            cor = linhas[y].copy()
            if 1 <= y <= 4:
                cor = cor * (0.93 + 0.12 * (0.5 + 0.5 * math.sin(x * 0.55 + y * 1.7 + math.sin(x * 0.21) * 2)))
            if y == 0 and x % 16 == 7:
                cor = mistura(pal[0], "#e8c070", 0.4)
            if y in (2, 3) and x % 24 == 11:
                cor = pal[3]
            t[y, x, :3] = np.clip(cor * 255, 0, 255).astype(np.uint8)
            t[y, x, 3] = alfa[y]
    Image.fromarray(t, "RGBA").save(PASTA / "estante-tabua.png", optimize=True)
    # Coluna: pilastra canelada com contas entalhadas a cada 16 px (repete na vertical sem emenda).
    col = np.zeros((48, 10, 4), np.uint8)
    perfil = [4, 2, 1, 0, 1, 2, 1, 0, 2, 4]
    for y in range(48):
        for x in range(10):
            k = perfil[x]
            if x in (3, 6) and y % 16 not in (0, 1, 15):
                k = 3                                           # caneluras
            if y % 16 in (0, 15):
                k = 1 if x not in (0, 9) else 3                 # anel
            if y % 16 == 1:
                k = 3 if x not in (0, 9) else 4
            if y % 16 == 8 and x in (4, 5):
                k = 0                                           # conta no meio de cada trecho
            cor = pal[k]
            if y % 16 == 8 and x in (4, 5):
                cor = mistura(pal[0], "#e8c070", 0.35)
            col[y, x, :3] = np.clip(cor * 255, 0, 255).astype(np.uint8)
            col[y, x, 3] = 255
    Image.fromarray(col, "RGBA").save(PASTA / "estante-coluna.png", optimize=True)
    for nome in ("estante-fundo.png", "estante-tabua.png", "estante-coluna.png"):
        print(nome, (PASTA / nome).stat().st_size, "bytes")


def main() -> None:
    global PERIODO
    args = sys.argv[1:]
    PASTA.mkdir(parents=True, exist_ok=True)
    marcas = None
    if "--marcas" in args:
        marcas = Path(args[args.index("--marcas") + 1])
        marcas.mkdir(parents=True, exist_ok=True)
    if "--texturas" in args:
        texturas()
        if not any(a in PERIODOS for a in args):
            return
    for p in [a for a in args if a in PERIODOS] or list(PERIODOS):
        PERIODO = p
        img = montar()
        nome = f"salao-{p}"
        img.save(PASTA / f"{nome}.webp", quality=83, method=6)
        img.resize((960, 360), Image.LANCZOS).save(PASTA / f"{nome}-960.webp", quality=83, method=6)
        print(nome, (PASTA / f"{nome}.webp").stat().st_size // 1024, "KB,",
              (PASTA / f"{nome}-960.webp").stat().st_size // 1024, "KB (960)")
        if marcas is not None:
            img.save(marcas / f"{nome}.png")
            com_marcas(img).save(marcas / f"{nome}-marcas.png")
            img.crop((240 * ESC, 0, W * ESC, H * ESC)).save(marcas / f"{nome}-celular.png")
    x0, x1, yt, yf = pilha_topo()
    print("âncoras:", {k: v for k, v in ANCORAS.items()}, "pilha:", (round(x0, 1), round(x1, 1), round(yt, 1), round(yf, 1)))


if __name__ == "__main__":
    main()
