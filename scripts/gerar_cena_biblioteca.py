"""Cenário "HD-2D" da seção Biblioteca de Resumos na página inicial (30/10/2026, pedido do Tales).

Arte original feita por código: nada baixado nem gerado por IA, nenhum personagem de terceiros; cada pixel sai das
funções abaixo. É o salão de uma biblioteca antiga à noite, à luz de lamparina. O cenário é desenhado em pixel art
(480 x 160), camada por camada, e depois montado em 3x com a luz calculada por pixel, como nos jogos "HD-2D":
- estantes do chão ao teto, em dois andares com galeria, e centenas de lombadas desenhadas uma a uma (cores, alturas,
  espessuras e frisos dourados variados, algumas tombadas ou deitadas), escada de biblioteca no trilho de latão;
- janelão em arco com vitral e caixilhos de chumbo; o luar entra em feixes volumétricos com poeira no ar e desenha no
  chão a sombra dos caixilhos;
- a mesa de leitura com o livro aberto (linhas de texto e o desenho de um fêmur), a pilha de livros, a lupa, a xícara
  de chá fumegante e a lamparina de latão, que faz a poça de luz quente; poltrona de couro, lustre de velas, globo;
- luz em 3D simples (cada camada tem profundidade), contraluz nas bordas, brilho (bloom), correção de cor quente nas
  altas luzes e fria nas sombras, vinheta e grão de filme.
O terço esquerdo fica mais calmo e escuro (o texto da seção vai por cima); os focos são o vitral e a mesa à direita.

Saída: public/pixel/inicio/secao-biblioteca.webp (1440 x 480) e secao-biblioteca-960.webp (960 x 320).
Uso: python3 scripts/gerar_cena_biblioteca.py
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"
PASTA_PAGINAS = Path(__file__).resolve().parents[1] / "public" / "pixel" / "paginas"
W, H, ESC = 480, 160, 3
PERIODOS = ("manha", "tarde", "noite")
# Hora do dia da versão da página Resumos. None = a versão da página inicial (secao-biblioteca), intacta.
PERIODO: str | None = None
# Nas páginas, a mesa de leitura (com a lamparina e o chá) vai para debaixo da janela, deixando o tapete de x 330-380
# livre para o mascote; a luz da janela passa a vir da esquerda e pousa nesse chão livre.
DXM = -130
CHAO = 114                      # onde a parede encontra o assoalho
FUGA = (300, 40)                # ponto de fuga do assoalho
JX, JY, JR, JBASE = 300, 38, 30, 100   # janela: centro do arco, raio do vidro e base do vidro
LAMPADA = (404, 101)            # chama da lamparina
LUSTRE = (232, 0)


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


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples e uma profundidade por pixel (z: 0 = parede)."""

    def __init__(self, z: float = 0.0) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)
        self.z = np.full((H, W), z, dtype=np.float32)
        self.z_atual = z

    def p(self, x: int, y: int, cor, a: float = 1.0) -> None:
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H and a > 0:
            rgb = cor_de(cor)
            base = self.c[y, x]
            na = a + base[3] * (1 - a)
            base[:3] = (rgb * a + base[:3] * base[3] * (1 - a)) / max(na, 1e-6)
            base[3] = na
            self.z[y, x] = self.z_atual

    def mascara(self, m: np.ndarray, cor, a: float = 1.0) -> None:
        """Pinta onde a máscara (bool ou 0..1) manda, com mistura alfa."""
        m = m.astype(np.float32) * a
        if not m.any():
            return
        rgb = cor_de(cor)
        base = self.c
        na = m + base[:, :, 3] * (1 - m)
        rgb_novo = (rgb[None, None, :] * m[:, :, None] + base[:, :, :3] * base[:, :, 3:4] * (1 - m[:, :, None])) / np.maximum(na, 1e-6)[:, :, None]
        sel = m > 0
        base[sel, :3] = rgb_novo[sel]
        base[sel, 3] = na[sel]
        self.z[m > 0.5] = self.z_atual

    def ret(self, x0: int, y0: int, w: int, h: int, cor, a: float = 1.0) -> None:
        x0, y0, w, h = int(x0), int(y0), int(w), int(h)
        xa, xb, ya, yb = max(0, x0), min(W, x0 + w), max(0, y0), min(H, y0 + h)
        if xa >= xb or ya >= yb:
            return
        rgb = cor_de(cor)
        if a >= 1:
            self.c[ya:yb, xa:xb, :3] = rgb
            self.c[ya:yb, xa:xb, 3] = 1
            self.z[ya:yb, xa:xb] = self.z_atual
        else:
            for y in range(ya, yb):
                for x in range(xa, xb):
                    self.p(x, y, rgb, a)

    def poligono(self, pts, cor, a: float = 1.0) -> None:
        im = Image.new("L", (W, H), 0)
        ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
        self.mascara(np.asarray(im) > 127, cor, a)

    def elipse(self, cx: float, cy: float, rx: float, ry: float, cor, a: float = 1.0) -> None:
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x + 0.5 - cx) / max(rx, 0.1)) ** 2 + ((y + 0.5 - cy) / max(ry, 0.1)) ** 2 <= 1:
                    self.p(x, y, cor, a)

    def linha(self, x0: float, y0: float, x1: float, y1: float, cor, a: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / max(n, 1)
            self.p(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), cor, a)

    def escurecer(self, x0: int, y0: int, w: int, h: int, k: float) -> None:
        xa, xb, ya, yb = max(0, x0), min(W, x0 + w), max(0, y0), min(H, y0 + h)
        if xa < xb and ya < yb:
            self.c[ya:yb, xa:xb, :3] *= k


# ─────────────────────────────── Paletas ───────────────────────────────
MADEIRA = ("#a8723e", "#7e5030", "#5a3820", "#3c2412", "#24150a")   # luz → sombra (nogueira das estantes)
MOGNO = ("#b0583a", "#8a3e26", "#6a2c1a", "#48190e", "#2a0e08")
LATAO = ("#fff0b0", "#e8c060", "#b88a34", "#7a5620", "#4a3010")
OURO = "#e8c25a"
LIVROS = ["#8e2a2a", "#a8402e", "#6e1e24", "#9a3a3a", "#2f5e3a", "#3e6e4a", "#24483a", "#2a4470", "#34587e", "#1e3050",
          "#7a4a2a", "#8a5a34", "#5a3820", "#b88a3a", "#a87a2e", "#c8b48a", "#d6c49a", "#5a2e4e", "#2a6a6a", "#2a2420",
          "#b0602a", "#7e2e48", "#4a5a2a", "#3a3a5a", "#6a1a1a", "#1e4a5a"]
PESOS = np.array([3, 2, 2, 2, 3, 2, 2, 3, 2, 2, 3, 3, 3, 1.5, 1.5, 1.2, 1, 1.5, 1.2, 1.5, 1, 1.2, 1, 1, 2, 1.2], dtype=float)
PESOS /= PESOS.sum()

PILASTRAS = [-3, 41, 85, 129, 173, 217, 259, 336, 380, 424, 468]
CAVIDADES_ALTAS = [(8, 18), (21, 31), (34, 44)]
CAVIDADES_BAIXAS = [(55, 65), (68, 78), (81, 91), (94, 104)]


def na_janela(x: float, y: float, margem: float = 0) -> bool:
    """O vão da janela (vidro + `margem` de moldura)."""
    if y > JBASE + margem:
        return False
    if y >= JY:
        return JX - JR - margem <= x < JX + JR + margem
    return math.hypot(x + 0.5 - JX, y + 0.5 - JY) <= JR + margem


# ─────────────────────────────── Livros ───────────────────────────────
def lombada(c: Camada, x: int, w: int, yt: int, yb: int, g, cor=None) -> None:
    """Um livro em pé visto de frente: lombada com volume, frisos dourados, etiqueta e desgaste."""
    cor = cor if cor is not None else LIVROS[g.choice(len(LIVROS), p=PESOS)]
    base = cor_de(cor) * (0.82 + g.random() * 0.32)
    h = yb - yt + 1
    for j in range(w):
        k = 1.28 if j == 0 and w > 1 else 0.58 if j == w - 1 and w > 1 else 1.1 if j == 1 and w > 3 else 1.0
        c.ret(x + j, yt, 1, h, np.clip(base * k, 0, 1))
    c.ret(x, yt, w, 1, np.clip(base * 0.75, 0, 1))          # cabeceado
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
        for ty in range(yt + 3, yb - 2, 2):                  # título em pontinhos dourados
            if g.random() < 0.55:
                c.p(x + w // 2, ty, ouro, 0.8)
    if g.random() < 0.3:                                    # desgaste no pé
        c.p(x + int(g.random() * w), yb, np.clip(base * 1.3, 0, 1))


def livro_tombado(c: Camada, x: int, folga: int, w: int, yt: int, yb: int, g) -> int:
    """Livro inclinado apoiado no vizinho da direita; devolve onde o próximo livro começa."""
    cor = cor_de(LIVROS[g.choice(len(LIVROS), p=PESOS)]) * (0.85 + g.random() * 0.25)
    h = yb - yt + 1
    alt = int(h * 0.92)
    for j in range(alt):
        dx = round(folga * j / max(alt - 1, 1))
        y = yb - j
        for i in range(w):
            k = 1.28 if i == 0 else 0.6 if i == w - 1 else 1.0
            c.p(x + dx + i, y, np.clip(cor * k, 0, 1))
        if j in (2, alt - 3):
            c.ret(x + dx + 1, y, max(1, w - 2), 1, tom(OURO, 0.9))
    return x + folga + w


def pilha_deitada(c: Camada, x: int, larg: int, yb: int, g, max_alt: int) -> None:
    """Livros deitados empilhados: lombadas horizontais com frisos."""
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
        c.p(x + dx + lw - 1, y - esp + 1, "#e8dcb8")       # folhas aparecendo
        if esp >= 3:
            c.ret(x + dx + 2, y - 1, 1, 1, tom(OURO, 0.9))
            c.ret(x + dx + lw - 3, y - 1, 1, 1, tom(OURO, 0.9))
        y -= esp


def enfeite(c: Camada, x: int, yb: int, tipo: int, g) -> int:
    """Pequenos objetos entre os livros (caveira, ampulheta, pote, rolos de pergaminho, mão anatômica). Devolve a largura."""
    osso, osso2, osso3 = "#e8dcc0", "#b8a888", "#6a5e4a"
    if tipo == 0:   # caveira
        c.elipse(x + 3, yb - 4, 3, 3, osso)
        c.ret(x + 1, yb - 3, 4, 3, osso2)
        c.p(x + 2, yb - 4, "#1a1410")
        c.p(x + 4, yb - 4, "#1a1410")
        c.p(x + 3, yb - 2, osso3)
        c.ret(x + 2, yb, 3, 1, osso3)
        c.p(x + 1, yb - 6, "#fff4dc")
        return 7
    if tipo == 1:   # ampulheta
        c.ret(x, yb - 7, 5, 1, MADEIRA[1])
        c.ret(x, yb, 5, 1, MADEIRA[1])
        for j in range(6):
            larg = abs(j - 2.5) * 0.9 + 1
            c.ret(round(x + 2.5 - larg), yb - 6 + j, round(larg * 2), 1, "#c8d8e0", 0.6)
        c.ret(x + 1, yb - 2, 3, 2, "#e8c070")
        c.p(x + 2, yb - 3, "#e8c070")
        c.ret(x, yb - 7, 1, 8, MADEIRA[2])
        c.ret(x + 4, yb - 7, 1, 8, MADEIRA[3])
        return 6
    if tipo == 2:   # pote de vidro com algo dentro
        c.ret(x, yb - 5, 5, 6, "#5a8a7a", 0.7)
        c.ret(x + 1, yb - 3, 3, 3, "#c89a4a", 0.8)
        c.ret(x, yb - 6, 5, 1, LATAO[2])
        c.p(x, yb - 4, "#d8f0e8")
        return 6
    if tipo == 3:   # rolos de pergaminho deitados
        for k, (dx, dy) in enumerate(((0, 0), (3, 0), (1, -2))):
            c.ret(x + dx, yb - 1 + dy, 7, 2, "#d8c89a")
            c.ret(x + dx, yb + dy, 7, 1, "#a8946a")
            c.p(x + dx + 6, yb - 1 + dy, "#6a5a3a")
        c.ret(x + 3, yb - 2, 1, 3, "#8e2a2a")
        return 11
    # mão anatômica num suporte (o tema da casa)
    c.ret(x + 2, yb, 5, 1, MADEIRA[2])
    c.ret(x + 4, yb - 2, 1, 2, LATAO[2])
    c.ret(x + 3, yb - 5, 3, 3, osso)          # carpo
    for i, comp in enumerate((4, 5, 5, 4)):
        c.ret(x + 2 + i, yb - 5 - comp, 1, comp, osso if i % 2 == 0 else osso2)
        c.p(x + 2 + i, yb - 5 - comp + 2, osso3)
    c.linha(x + 2, yb - 4, x, yb - 7, osso2)  # polegar
    return 8


def prateleira(c: Camada, x0: int, x1: int, yt: int, yb: int, g, calmo: bool) -> None:
    """Enche uma cavidade da estante com livros, deixando aqui e ali uma folga, livro tombado, pilha ou enfeite."""
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
            folga = 2 + int(g.random() * 3)
            x = livro_tombado(c, x, folga, 2 + int(g.random() * 2), yt, yb, g)
        elif r < 0.125 and resta > 12 and not calmo:
            x += enfeite(c, x + 1, yb, int(g.random() * 5), g) + 1
        elif r < 0.15:
            x += 1 + int(g.random() * 2)
        else:
            w = int(g.choice([2, 3, 3, 3, 4, 4, 5]))
            w = min(w, x1 - x)
            alto = g.random() < 0.18
            topo = yt + 1 + (0 if alto else int(g.random() * 4))
            lombada(c, x, w, topo, yb, g)
            x += w
    # Sombra da tábua de cima e da lateral (oclusão).
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
    """Pilastra canelada entre os vãos da estante, com capitel e base entalhados."""
    tons = (MADEIRA[3], MADEIRA[1], MADEIRA[0], MADEIRA[2], MADEIRA[4])
    for i, t in enumerate(tons):
        c.ret(x0 + i, ya, 1, yb - ya, t)
    for y in range(ya + 4, yb - 4):
        if y % 6 not in (0,):
            c.p(x0 + 1, y, MADEIRA[2])
            c.p(x0 + 3, y, MADEIRA[3])
    for (y, k) in ((ya, 0), (ya + 1, 1), (ya + 2, 3), (yb - 3, 1), (yb - 2, 0), (yb - 1, 3)):
        c.ret(x0 - 1, y, 7, 1, MADEIRA[k])
    c.p(x0 + 2, ya + 2, LATAO[1])


def parede_e_estantes() -> Camada:
    c = Camada(0.0)
    g = np.random.default_rng(1)
    # Fundo: madeira escura (atrás de tudo, inclusive em volta da janela).
    c.ret(0, 0, W, CHAO, MADEIRA[4])
    # Teto: caixotões entre vigas, friso com folhagem dourada entalhada, cornija e dentículos.
    c.ret(0, 0, W, 5, "#1c120a")
    for x in range(0, W, 24):
        c.ret(x, 0, 3, 3, "#2e1e10")
        c.ret(x + 3, 0, 18, 2, "#140c06")
        c.p(x + 12, 1, LATAO[3])
    c.ret(0, 3, W, 1, MADEIRA[2])
    for x in range(0, W):
        if (x % 8) in (1, 2, 5, 6):
            c.p(x, 4, LATAO[3] if (x % 8) in (2, 5) else MADEIRA[1])
        if x % 8 == 0:
            c.p(x, 4, LATAO[2])
    c.ret(0, 5, W, 1, MADEIRA[1])
    for x in range(0, W, 3):
        c.p(x, 6, MADEIRA[2] if x % 2 else MADEIRA[4])
    c.ret(0, 7, W, 1, MADEIRA[4])

    # Andar de cima e andar de baixo, vão por vão.
    for i in range(len(PILASTRAS) - 1):
        xa, xb = PILASTRAS[i] + 5, PILASTRAS[i + 1]
        if xa >= 262 and xb <= 340:
            continue
        calmo = xb < 200
        for (yt, yb) in CAVIDADES_ALTAS:
            prateleira(c, xa, xb, yt, yb, g, calmo)
            tabua(c, xa, xb, yb + 1)
        for (yt, yb) in CAVIDADES_BAIXAS:
            prateleira(c, xa, xb, yt, yb, g, calmo)
            tabua(c, xa, xb, yb + 1)
    for px in PILASTRAS:
        pilastra(c, px, 8, 45)
        pilastra(c, px, 55, 107)

    # Galeria: piso em balanço com dentículos, mísulas, trilho de latão da escada e o guarda-corpo torneado.
    for (xa, xb) in ((0, 262), (338, W)):
        c.ret(xa, 45, xb - xa, 6, MADEIRA[2])
        c.ret(xa, 45, xb - xa, 1, MADEIRA[0])
        c.ret(xa, 46, xb - xa, 1, MADEIRA[1])
        for x in range(xa, xb, 3):
            c.ret(x, 48, 2, 2, MADEIRA[1])
            c.p(x, 50, MADEIRA[4])
        c.ret(xa, 51, xb - xa, 4, MADEIRA[3])
        c.ret(xa, 51, xb - xa, 1, "#120a04")
        c.ret(xa, 53, xb - xa, 1, LATAO[2])
        c.ret(xa, 52, xb - xa, 1, LATAO[3])
        for x in range(xa + 6, xb, 22):
            c.p(x, 53, LATAO[1])
        # Guarda-corpo: corrimão + balaústres torneados.
        c.ret(xa, 35, xb - xa, 2, MADEIRA[1])
        c.ret(xa, 35, xb - xa, 1, MADEIRA[0])
        c.ret(xa, 37, xb - xa, 1, MADEIRA[4])
        c.ret(xa, 43, xb - xa, 2, MADEIRA[2])
        for x in range(xa + 1, xb - 1, 4):
            perfil = (1, 2, 1, 1, 2, 2)
            for j, lw in enumerate(perfil):
                c.ret(x, 37 + j, lw, 1, MADEIRA[1] if j % 3 else MADEIRA[0])
                if lw > 1:
                    c.p(x + 1, 37 + j, MADEIRA[3])
    for px in PILASTRAS:
        if 250 < px < 340:
            continue
        c.ret(px, 33, 5, 12, MADEIRA[1])
        c.ret(px, 33, 1, 12, MADEIRA[0])
        c.ret(px + 4, 33, 1, 12, MADEIRA[3])
        c.ret(px - 1, 32, 7, 1, MADEIRA[0])
        c.ret(px + 1, 31, 3, 1, MADEIRA[1])
        c.ret(px, 51, 5, 4, MADEIRA[1])                      # mísula
        c.ret(px + 1, 54, 3, 1, MADEIRA[2])

    # Rodapé: armários com almofadas e fechaduras.
    for i in range(len(PILASTRAS) - 1):
        xa, xb = PILASTRAS[i] + 5, PILASTRAS[i + 1]
        if xa >= 262 and xb <= 340:
            continue
        c.ret(xa, 107, xb - xa, 7, MADEIRA[2])
        c.ret(xa, 107, xb - xa, 1, MADEIRA[0])
        meio = (xa + xb) // 2
        for (pa, pb) in ((xa + 2, meio - 1), (meio + 1, xb - 2)):
            if pb - pa < 4:
                continue
            c.ret(pa, 109, pb - pa, 3, MADEIRA[1])
            c.ret(pa, 109, pb - pa, 1, MADEIRA[0])
            c.ret(pa, 111, pb - pa, 1, MADEIRA[3])
        c.p(meio - 2, 110, LATAO[1])
        c.p(meio + 2, 110, LATAO[1])
        c.ret(xa, 113, xb - xa, 1, MADEIRA[4])
    return c


# ─────────────────────────────── Janela ───────────────────────────────
VITRAL = ["#c0304a", "#3a6ad0", "#e8b040", "#3a9a5a", "#8a3ab0"]


def ceu_noturno() -> np.ndarray:
    """O que se vê pela janela: céu de lua, nuvens finas e a silhueta da cidade com janelinhas acesas (emissivo)."""
    if PERIODO in ("manha", "tarde"):
        return ceu_de_dia()
    e = np.zeros((H, W, 3), dtype=np.float32)
    topo, meio, baixo = hexa("#081230"), hexa("#1a2a5a"), hexa("#3a4c86")
    nuv = ruido(5, 10) * 0.6 + ruido(6, 4) * 0.4
    g = np.random.default_rng(7)
    lx, ly = (316, 44) if PERIODO is None else (284, 40)
    for y in range(0, JBASE + 1):
        t = y / JBASE
        cor = topo * (1 - t) * 2 + meio * t * 2 if t < 0.5 else meio * (2 - 2 * t) + baixo * (2 * t - 1)
        for x in range(JX - JR - 1, JX + JR + 1):
            v = cor.copy()
            n = nuv[y, x] - 0.5 - abs(y - 60) / 90
            if n > 0:
                v = v * (1 - min(1, n * 5) * 0.5) + hexa("#6a7ab0") * min(1, n * 5) * 0.5
            d = math.hypot(x - lx, y - ly)
            v = v + hexa("#8aa0e0") * math.exp(-d / 14) * 0.5
            e[y, x] = v
    for _ in range(40):
        x, y = JX - JR + int(g.random() * JR * 2), int(g.random() * 80)
        e[y, x] += 0.35 + g.random() * 0.5
    for y in range(ly - 7, ly + 8):
        for x in range(lx - 7, lx + 8):
            d = math.hypot(x - lx, y - ly)
            if d < 5.6:
                cra = math.hypot(x - lx + 2, y - ly - 1) < 1.6 or math.hypot(x - lx - 2, y - ly + 2) < 1.1
                e[y, x] = hexa("#c8d2f0") if cra else hexa("#f4f6ff")
    # Silhueta da cidade: telhados, torre com coruchéu e árvores.
    linha_ceu = np.full(W, 200)
    for x in range(JX - JR - 1, JX + JR + 1):
        h = 92 - int(3 * math.sin(x / 5.0)) - (6 if (x // 7) % 3 == 0 else 0)
        if 276 <= x <= 282:
            h = 78 - (0 if x in (278, 279, 280) else 2)
            if x == 279:
                h = 70
        if x > 318:
            h = 88 - int(3 * abs(math.sin(x / 2.3)))
        linha_ceu[x] = h
        for y in range(h, JBASE + 1):
            e[y, x] = hexa("#0a1028") * (1 + (y - h) * 0.01)
    for (wx, wy) in ((286, 95), (292, 93), (279, 82), (300, 96), (305, 94), (297, 92)):
        if wy > linha_ceu[wx]:
            e[wy, wx] = hexa("#ffc860")
    return e


def ceu_de_dia() -> np.ndarray:
    """Pela janela, de dia: céu da manhã (azul, nuvens brancas, telhados claros) ou do poente (laranja, o sol baixo à
    esquerda, a cidade em contraluz com as primeiras janelas acesas)."""
    e = np.zeros((H, W, 3), dtype=np.float32)
    manha = PERIODO == "manha"
    topo, meio, baixo = (hexa("#3a78d0"), hexa("#7ab0e8"), hexa("#e4eef4")) if manha else \
        (hexa("#5a3c7a"), hexa("#e07a6a"), hexa("#ffd890"))
    nuv = ruido(5, 10) * 0.6 + ruido(6, 4) * 0.4
    sx, sy = (262, 20) if manha else (276, 80)
    for y in range(0, JBASE + 1):
        t = y / JBASE
        cor = topo * (1 - t) * 2 + meio * t * 2 if t < 0.5 else meio * (2 - 2 * t) + baixo * (2 * t - 1)
        for x in range(JX - JR - 1, JX + JR + 1):
            v = cor.copy()
            n = nuv[y, x] - 0.5 - abs(y - 50) / 90
            if n > 0:
                k = min(1, n * 5) * 0.7
                v = v * (1 - k) + (hexa("#ffffff") if manha else hexa("#ffd0a0")) * k
            d = math.hypot(x - sx, y - sy)
            v = v + (hexa("#fff4d0") if manha else hexa("#ffc070")) * math.exp(-d / (12 if manha else 18)) * 0.7
            if not manha and d < 5:
                v = hexa("#fffbe0")
            e[y, x] = v
    for x in range(JX - JR - 1, JX + JR + 1):
        h = 92 - int(3 * math.sin(x / 5.0)) - (6 if (x // 7) % 3 == 0 else 0)
        if 276 <= x <= 282:
            h = 78 - (0 if x in (278, 279, 280) else 2)
            if x == 279:
                h = 70
        if x > 318:
            h = 88 - int(3 * abs(math.sin(x / 2.3)))
        for y in range(h, JBASE + 1):
            if manha:
                e[y, x] = hexa("#8a9ab8") * (1 - (y - h) * 0.01) + (hexa("#ffe8c0") * 0.25 if x % 7 < 3 else 0)
            else:
                e[y, x] = hexa("#4a2a40") * (1 + (y - h) * 0.01)
    if not manha:
        for (wx, wy) in ((286, 95), (300, 96), (305, 94)):
            e[wy, wx] = hexa("#ffc860")
    return e


def janela(c: Camada) -> tuple[np.ndarray, np.ndarray]:
    """Vidro (emissivo) e a armação: moldura de pedra, mainéis, travessa, chumbo em losangos, rosácea e borda colorida.
    Devolve (emissivo HxWx3, transmissão do luar HxW)."""
    ceu = ceu_noturno()
    emis = np.zeros((H, W, 3), dtype=np.float32)
    trans = np.zeros((H, W), dtype=np.float32)
    g = np.random.default_rng(9)
    tint_cell = g.random((40, 40)) * 0.25 + 0.88
    pedra = ("#b8b0c0", "#8a8498", "#5a566a", "#3a3648")
    # Moldura/derrame de pedra (6 px) com aduelas no arco.
    for y in range(0, JBASE + 4):
        for x in range(JX - JR - 7, JX + JR + 7):
            if na_janela(x, y, 6) and not na_janela(x, y, 0):
                d_in = 0
                for m in range(1, 7):
                    if na_janela(x, y, m):
                        d_in = m
                        break
                k = 0 if d_in <= 1 else 1 if d_in <= 3 else 2
                if y < JY:
                    ang = math.atan2(y + 0.5 - JY, x + 0.5 - JX)
                    if int((ang + math.pi) / (math.pi / 11)) % 2 == 0 and k > 0:
                        k = min(3, k + 1)
                elif (y // 6) % 2 == 0 and d_in > 3:
                    k = 2
                c.p(x, y, pedra[k])
    c.ret(JX - JR - 7, JBASE + 1, JR * 2 + 14, 2, pedra[0])
    c.ret(JX - JR - 7, JBASE + 3, JR * 2 + 14, 1, pedra[3])
    # Vidro.
    for y in range(0, JBASE + 1):
        for x in range(JX - JR - 1, JX + JR + 1):
            if not na_janela(x, y):
                continue
            borda = not na_janela(x, y, -1.6)
            rosa = math.hypot(x + 0.5 - JX, y + 0.5 - 22)
            mainel = (x in (288, 289, 290, 309, 310, 311) and y > 31) or (y in (65, 66, 67))
            if mainel:
                c.p(x, y, pedra[0] if x in (290, 311) or y == 65 else pedra[2] if x in (288, 309) or y == 67 else pedra[1])
                continue
            if 8.6 < rosa < 10.2:
                c.p(x, y, "#18141c")
                continue
            if rosa < 8.6:
                ang = math.atan2(y + 0.5 - 22, x + 0.5 - JX)
                seg = int((ang + math.pi) / (math.tau / 8))
                if rosa < 2.6:
                    cor = hexa("#ffd870")
                elif abs(((ang + math.pi) % (math.tau / 8)) - 0) < 0.12 or rosa > 7.6 and rosa < 8.6:
                    c.p(x, y, "#18141c")
                    continue
                else:
                    cor = hexa(VITRAL[0] if seg % 2 else VITRAL[1]) if rosa > 5 else hexa(VITRAL[2] if seg % 2 else VITRAL[3])
                emis[y, x] = cor * (0.75 + 0.25 * ((x * 7 + y * 3) % 5) / 4)
                trans[y, x] = 0.45
                continue
            if borda:
                passo = (y // 5) if y >= JY else int((math.atan2(y + 0.5 - JY, x + 0.5 - JX) + math.pi) * 9)
                if (y % 5 == 0 and y >= JY) or (y < JY and (math.atan2(y + 0.5 - JY, x + 0.5 - JX) + math.pi) * 9 % 1 < 0.18):
                    c.p(x, y, "#18141c")
                    continue
                cor = hexa(("#c0304a", "#e8b040", "#3a6ad0", "#e8b040")[passo % 4])
                emis[y, x] = cor * 0.62
                trans[y, x] = 0.4
                continue
            # Losangos de chumbo (vidro antigo, cada losango com um tom levemente diferente).
            a_, b_ = (x - y) % 6, (x + y) % 6
            if a_ == 0 or b_ == 0:
                c.p(x, y, "#1a1820")
                continue
            cel = tint_cell[((x - y) // 6) % 40, ((x + y) // 6) % 40]
            vidro = ceu[y, x] * 0.92 * cel + hexa("#9ab0e0") * 0.08
            if a_ == 1 or b_ == 1:
                vidro = vidro * 1.12 + 0.02
            emis[y, x] = vidro
            astro = (316, 44) if PERIODO is None else (284, 40)
            trans[y, x] = 0.6 + 0.9 * float(ceu[y, x].mean()) + (0.3 if math.hypot(x - astro[0], y - astro[1]) < 9 else 0)
    return emis, trans


def cortinas_e_assento() -> Camada:
    """Cortinas de veludo presas com cordão, o varão de latão e o banco da janela com almofadas e um livro esquecido."""
    c = Camada(0.08)
    vel = ("#c04a5a", "#8a2a3a", "#5e1824", "#3a0c14")
    for (lado, xa) in ((-1, 252), (1, 332)):
        for y in range(4, CHAO + 1):
            if y < 66:
                larg = 16
                x0 = xa
            else:
                aberto = min(1, (y - 66) / 30)
                larg = int(9 + 9 * aberto)
                x0 = xa + (0 if lado < 0 else 16 - larg) if y < 70 else (xa - int(3 * aberto) if lado < 0 else xa + 16 - larg + int(3 * aberto))
            if 64 <= y <= 70:
                larg = 9
                x0 = xa if lado < 0 else xa + 7
            for i in range(larg):
                fase = (i / max(larg, 1)) * 3.3 * math.pi + (y / 40.0)
                v = math.cos(fase)
                k = 0 if v > 0.75 else 1 if v > 0 else 2 if v > -0.7 else 3
                if lado < 0 and i == larg - 1 or lado > 0 and i == 0:
                    c.p(x0 + i, y, LATAO[2])
                else:
                    c.p(x0 + i, y, vel[k])
        # Cordão e borla.
        tx = xa + (9 if lado < 0 else 7)
        c.ret(xa + (0 if lado < 0 else 7), 67, 9, 2, LATAO[1])
        c.ret(xa + (0 if lado < 0 else 7), 68, 9, 1, LATAO[3])
        c.ret(tx - 1, 69, 3, 2, LATAO[1])
        for j in range(6):
            c.ret(tx - 1 - j // 3, 71 + j, 3 + 2 * (j // 3), 1, LATAO[1] if j % 2 else LATAO[2])
        c.ret(tx - 2, 77, 5, 1, LATAO[3])
    # Varão e ponteiras.
    c.ret(248, 3, 104, 2, LATAO[2])
    c.ret(248, 3, 104, 1, LATAO[1])
    c.elipse(248, 4, 2.5, 2.5, LATAO[1])
    c.elipse(352, 4, 2.5, 2.5, LATAO[1])
    for x in range(254, 348, 4):
        c.p(x, 5, LATAO[3])
    # Banco da janela.
    c.ret(264, 105, 72, 9, MADEIRA[2])
    c.ret(264, 105, 72, 1, MADEIRA[0])
    for xa in range(267, 332, 13):
        c.ret(xa, 107, 10, 5, MADEIRA[1])
        c.ret(xa, 107, 10, 1, MADEIRA[0])
        c.ret(xa, 111, 10, 1, MADEIRA[3])
    c.ret(266, 101, 68, 4, "#2a3a6a")
    c.ret(266, 101, 68, 1, "#4a5a9a")
    for x in range(268, 334, 6):
        c.p(x, 103, "#1a2448")
    # Almofadas.
    for (ax, cor) in ((268, ("#c89a4a", "#9a7032", "#6a4a20")), (320, ("#3a7a6a", "#2a5a4e", "#1a3a32"))):
        c.elipse(ax + 6, 97, 6, 4, cor[1])
        c.elipse(ax + 5, 96, 4, 2.5, cor[0])
        c.ret(ax + 1, 100, 10, 1, cor[2])
        c.p(ax, 96, cor[2])
        c.p(ax + 12, 96, cor[2])
    # Livro aberto esquecido no banco.
    c.poligono([(292, 101), (300, 99), (308, 101), (300, 102)], "#e8dcb8")
    c.linha(300, 99, 300, 102, "#a89870")
    c.ret(293, 102, 15, 1, "#5a2a1a")
    return c


# ─────────────────────────────── Objetos do meio ───────────────────────────────
def escada(c: Camada) -> None:
    """Escada de biblioteca presa no trilho de latão, com rodinhas."""
    c.z_atual = 0.15
    topo_l, topo_r, pe_l, pe_r = (194, 51), (206, 51), (186, 120), (201, 120)
    # Sombra da escada na estante.
    for (a, b) in ((topo_l, pe_l), (topo_r, pe_r)):
        c.linha(a[0] + 3, a[1] + 2, b[0] + 4, b[1] - 8, "#000000", 0.35)
    for y in range(57, 118, 7):
        t = (y - 51) / 69
        xl = round(topo_l[0] + (pe_l[0] - topo_l[0]) * t)
        xr = round(topo_r[0] + (pe_r[0] - topo_r[0]) * t)
        c.ret(xl + 3, y + 2, xr - xl, 1, "#000000", 0.3)
    for y in range(57, 118, 7):
        t = (y - 51) / 69
        xl = round(topo_l[0] + (pe_l[0] - topo_l[0]) * t)
        xr = round(topo_r[0] + (pe_r[0] - topo_r[0]) * t)
        c.ret(xl, y, xr - xl + 1, 1, MADEIRA[0])
        c.ret(xl, y + 1, xr - xl + 1, 1, MADEIRA[2])
    for (a, b, claro) in ((topo_l, pe_l, True), (topo_r, pe_r, False)):
        n = b[1] - a[1]
        for j in range(n + 1):
            x = round(a[0] + (b[0] - a[0]) * j / n)
            c.p(x, a[1] + j, MADEIRA[0] if claro else MADEIRA[1])
            c.p(x + 1, a[1] + j, MADEIRA[2] if claro else MADEIRA[3])
    for (x, y) in (topo_l, topo_r):
        c.ret(x, y - 2, 2, 2, LATAO[1])
        c.p(x + 1, y - 2, LATAO[0])
    for (x, y) in (pe_l, pe_r):
        c.elipse(x + 1, y + 1, 2, 2, "#2a2a30")
        c.p(x + 1, y + 1, LATAO[1])


def lustre(c: Camada, e: np.ndarray) -> list[tuple[int, int]]:
    """Lustre de latão com velas em anel (as de trás menores) e pingentes de cristal. Devolve as chamas."""
    c.z_atual = 0.45
    cx = LUSTRE[0]
    for y in range(0, 12):
        c.p(cx, y, LATAO[2] if y % 2 else LATAO[3])
        if y % 2 == 0:
            c.p(cx + 1, y, LATAO[3])
    c.ret(cx - 2, 12, 5, 2, LATAO[1])
    c.ret(cx - 1, 14, 3, 8, LATAO[2])
    c.p(cx - 1, 15, LATAO[0])
    c.elipse(cx, 23, 4, 2.5, LATAO[1])
    c.elipse(cx - 1, 22, 2, 1, LATAO[0])
    c.ret(cx, 26, 1, 3, LATAO[2])
    c.elipse(cx, 29, 1.5, 1.5, "#d8f0ff")
    chamas = []
    velas = []
    for k in range(7):
        ang = k / 7 * math.tau + 0.3
        vx, vy = cx + 17 * math.cos(ang), 22 + 3.2 * math.sin(ang)
        velas.append((vy, vx, math.sin(ang) > 0))
    velas.sort()
    for (vy, vx, frente) in velas:
        vx, vy = round(vx), round(vy)
        c.linha(cx, 23, vx, vy + 2, LATAO[2] if frente else LATAO[3])
        c.ret(vx - 1, vy + 1, 3, 1, LATAO[1])
        alt = 4 if frente else 3
        c.ret(vx, vy + 1 - alt, 1, alt, "#f0e6cc")
        c.p(vx, vy + 1 - alt, "#c8b890")
        e[vy - alt, vx] += hexa("#ffd070") * 1.2
        e[vy - alt - 1, vx] += hexa("#ffb040") * 0.6
        chamas.append((vx, vy - alt))
        c.p(vx, vy + 3, "#d8f0ff", 0.8)
        e[vy + 3, vx] += hexa("#a0c0ff") * 0.25
    return chamas


def arandela(c: Camada, e: np.ndarray, x: int, y: int) -> None:
    """Arandela de latão com uma vela na pilastra."""
    c.z_atual = 0.04
    c.ret(x, y, 3, 6, LATAO[2])
    c.p(x, y, LATAO[0])
    c.ret(x + 1, y + 3, 4, 1, LATAO[1])
    c.ret(x + 3, y + 1, 3, 2, LATAO[1])
    c.ret(x + 4, y - 3, 1, 4, "#f0e6cc")
    e[y - 4, x + 4] += hexa("#ffd070") * 1.3
    e[y - 5, x + 4] += hexa("#ffa040") * 0.6


def globo(c: Camada) -> None:
    """Mesinha redonda com um globo terrestre de latão."""
    c.z_atual = 0.3
    cx, cy, r = 248, 93, 8
    c.elipse(cx, 106, 11, 2.5, MADEIRA[1])
    c.elipse(cx, 105.5, 10, 1.6, MADEIRA[0])
    c.ret(cx - 11, 107, 22, 1, MADEIRA[3])
    c.ret(cx - 1, 108, 3, 12, MADEIRA[2])
    c.p(cx - 1, 112, MADEIRA[0])
    c.elipse(cx, 113, 2.5, 1.3, MADEIRA[1])
    for (dx, dy) in ((-6, 6), (6, 6), (0, 4)):
        c.linha(cx, 117, cx + dx, 117 + dy, MADEIRA[2])
    c.ret(cx - 2, 101, 5, 3, LATAO[2])
    c.ret(cx - 1, 100, 3, 1, LATAO[1])
    terra = ruido(13, 3, 64, 64)
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            if d > r:
                continue
            u = (math.asin(max(-1, min(1, dx / math.sqrt(max(r * r - dy * dy, 0.01))))) / math.pi + 0.5) * 22
            v = (dy / r + 1) * 16
            lum = 0.55 + 0.45 * (-(dx * -0.3 + dy * -0.6) / r)
            lum = max(0.35, min(1.15, lum))
            terrestre = terra[int(v) % 64, int(u + 20) % 64] > 0.55
            base = hexa("#c8a050") if terrestre else hexa("#3a6a8a")
            if (abs(dy) < 0.6) or int(u) % 7 == 0 and not terrestre:
                base = base * 0.85
            c.p(x, y, np.clip(base * lum, 0, 1))
    for j in range(-r - 2, r + 3):
        ang = j / (r + 2) * math.pi / 2
        x = round(cx + (r + 1.5) * math.sin(ang) * 0.35 + 1)
        y = round(cy - (r + 1.5) * math.cos(ang) * (1 if j >= 0 else -1))
    for k in range(40):
        ang = k / 40 * math.pi + math.pi / 2 + 0.25
        x, y = cx + (r + 1.5) * math.cos(ang) * -1, cy - (r + 1.5) * math.sin(ang)
        c.p(round(x), round(y), LATAO[1] if k < 20 else LATAO[2])
    c.p(cx - 2, cy - r - 2, LATAO[0])


# ─────────────────────────────── Assoalho e tapete ───────────────────────────────
def chao_e_tapete() -> Camada:
    c = Camada(0.0)
    fx, fy = FUGA
    g = np.random.default_rng(17)
    veio = ruido(19, 2, 400, 200)
    tabuas = ["#6a4226", "#7a4e2c", "#5e3a20", "#704830", "#664028"]
    desloc = g.random(200) * 30
    for y in range(CHAO, H):
        d = y - fy
        zrow = (y - CHAO) / (H - CHAO)
        c.z[y, :] = zrow
        for x in range(W):
            X = (x + 0.5 - fx) * 74 / d
            Zw = 74 * 74 / d
            b = int(math.floor(X / 7)) + 100
            Xa = (x - 0.5 - fx) * 74 / d
            costura = int(math.floor(Xa / 7)) + 100 != b
            emenda = int((Zw + desloc[b % 200]) / 26) != int((74 * 74 / (d - 1) + desloc[b % 200]) / 26)
            base = hexa(tabuas[(b * 7) % 5])
            v = veio[int((Zw * 6) % 200), int((X * 1.7) % 400)]
            k = 0.86 + v * 0.28
            if costura or emenda:
                k = 0.45
            c.c[y, x, :3] = np.clip(base * k, 0, 1)
            c.c[y, x, 3] = 1
    # Rodapé e sombra junto à parede.
    for x in range(W):
        c.c[CHAO, x, :3] *= 0.5
        c.c[CHAO + 1, x, :3] *= 0.72
    # Tapete persa em perspectiva.
    xm, xM, zA = -62, 168, 66
    marinho, verm, verm2, marfim, ouro, verde = (hexa(k) for k in ("#1e2a52", "#8a2228", "#6a161c", "#e0d0a8", "#c8963a", "#2a5a52"))
    for y in range(CHAO + 2, H):
        d = y - fy
        Zw = 74 * 74 / d
        v = (zA - Zw) * 4.2
        if v < -2:
            continue
        for x in range(W):
            X = (x + 0.5 - fx) * 74 / d
            if not (xm - 1.5 <= X <= xM + 1.5):
                continue
            u = X - xm
            if v < 0:   # franja
                if int(X) % 2 == 0:
                    c.c[y, x, :3] = marfim * 0.9
                continue
            if X < xm or X > xM:
                if int(v) % 2 == 0:
                    c.c[y, x, :3] = marfim * 0.85
                continue
            du = min(u, xM - X)
            borda = min(du, v)
            if borda < 1.2:
                cor = marinho * 0.7
            elif borda < 9:
                cor = marinho
                q = (int(u / 3) + int(v / 2)) % 4 if du > v else (int(v / 3) + int(u / 2)) % 4
                if 3 < borda < 7 and q == 0:
                    cor = ouro
                elif 3 < borda < 7 and q == 2:
                    cor = verm
            elif borda < 10.5:
                cor = ouro
            elif borda < 12:
                cor = verm2
            else:
                cor = verm
                cu, cv = u - (xM - xm) / 2, v - 46
                rm = abs(cu) / 50 + abs(cv) / 28
                if rm < 1:
                    cor = marinho if rm > 0.86 else ouro if rm > 0.8 else marinho if rm > 0.62 else verde if rm > 0.56 else verm2 if rm > 0.22 else ouro if rm > 0.15 else marfim
                    if 0.62 < rm < 0.8 and (int(cu / 3) + int(cv / 2)) % 3 == 0:
                        cor = ouro * 0.8
                    if 0.22 < rm < 0.56 and ((abs(cu) + abs(cv) * 1.8) % 10) < 1.4:
                        cor = ouro * 0.8
                else:
                    a_ = (u + v * 1.4) % 14
                    b_ = (u - v * 1.4) % 14
                    if a_ < 1.2 or b_ < 1.2:
                        cor = ouro * 0.85
                    elif (abs(a_ - 7) < 1.6 and abs(b_ - 7) < 1.6):
                        cor = marfim * 0.9
                    elif (abs(a_ - 7) < 3 and abs(b_ - 7) < 3):
                        cor = verde
            k = 0.9 + g.random() * 0.16
            c.c[y, x, :3] = np.clip(cor * k, 0, 1)
    return c


# ─────────────────────────────── Primeiro plano: mesa, poltrona ───────────────────────────────
def mesa(c: Camada, e: np.ndarray) -> None:
    """Mesa de leitura com tampo de couro, gaveta, pés torneados e tudo o que está em cima dela."""
    c.z_atual = 0.75
    # Pés de trás (mais escuros), tampo em perspectiva com couro verde e filete dourado, saia com gavetas, pés da frente.
    for x in (328, 424):
        c.ret(x, 133, 3, 13, MOGNO[3])
        c.p(x, 139, MOGNO[2])
    c.poligono([(324, 112), (428, 112), (438, 127), (314, 127)], MOGNO[2])
    c.linha(324, 112, 428, 112, MOGNO[1])
    c.poligono([(329, 114), (423, 114), (431, 125), (321, 125)], "#2c4a34")
    g = np.random.default_rng(34)
    for _ in range(90):   # couro gasto
        x, y = 322 + int(g.random() * 108), 114 + int(g.random() * 11)
        c.p(x, y, "#3a5a40", 0.5)
    c.linha(330, 115, 422, 115, "#b8963a", 0.85)
    c.linha(322, 124, 430, 124, "#b8963a", 0.85)
    c.linha(330, 115, 322, 124, "#b8963a", 0.85)
    c.linha(422, 115, 430, 124, "#b8963a", 0.85)
    c.ret(314, 127, 125, 1, MOGNO[0])
    c.ret(314, 128, 125, 2, MOGNO[1])
    for x in range(316, 438, 3):
        c.p(x, 129, MOGNO[2])
    c.ret(316, 130, 121, 4, MOGNO[2])
    c.ret(316, 134, 121, 1, MOGNO[4])
    for (gx, gw) in ((330, 34), (369, 26), (400, 32)):
        c.ret(gx, 130, gw, 3, MOGNO[3])
        c.ret(gx, 130, gw, 1, MOGNO[1])
        c.ret(gx + gw // 2 - 1, 131, 3, 1, LATAO[1])
        c.p(gx + gw // 2, 131, LATAO[0])
    for x in (317, 432):
        perfil = [5, 4, 3, 3, 4, 5, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 5, 3]
        for j, lw in enumerate(perfil):
            xx = x + 2 - lw // 2
            c.ret(xx, 135 + j, lw, 1, MOGNO[2])
            c.p(xx, 135 + j, MOGNO[0])
            c.p(xx + lw - 1, 135 + j, MOGNO[4])
        c.ret(x, 155, 5, 1, MOGNO[4])

    # Pilha de livros deitados (lombadas para a frente), com óculos em cima.
    y = 123
    pilha = (("#2a4470", 19, 3), ("#8e2a2a", 21, 4), ("#2f5e3a", 18, 3), ("#c8b48a", 20, 3), ("#5a2e4e", 17, 3), ("#a8402e", 19, 4))
    for i, (cor, larg, esp) in enumerate(pilha):
        x0 = 322 + int(g.random() * 4)
        base = hexa(cor)
        c.ret(x0, y - esp + 1, larg, esp, base)
        c.ret(x0, y - esp + 1, larg, 1, np.clip(base * 1.3, 0, 1))
        c.ret(x0, y, larg, 1, np.clip(base * 0.55, 0, 1))
        c.ret(x0 + larg, y - esp + 1, 2, esp, "#e8dcb8")
        c.ret(x0 + larg + 1, y - esp + 1, 1, esp, "#b8a888")
        c.ret(x0 - 1, y - esp + 1, 1, esp, np.clip(base * 0.7, 0, 1))
        for gx in (x0 + 2, x0 + larg - 3):
            c.ret(gx, y - esp + 1, 1, esp, tom(OURO, 0.9))
        if esp >= 4:
            c.ret(x0 + 5, y - 2, larg - 10, 1, tom(OURO, 0.75))
        y -= esp
    topo = y
    c.ret(323, topo - 1, 20, 2, np.clip(hexa("#a8402e") * 1.15, 0, 1))
    c.ret(323, topo - 1, 20, 1, np.clip(hexa("#a8402e") * 1.4, 0, 1))
    c.elipse(328, topo - 2, 2, 1.4, "#c8a050")
    c.elipse(334, topo - 2, 2, 1.4, "#c8a050")
    c.p(328, topo - 2, "#a8d0f0")
    c.p(334, topo - 2, "#a8d0f0")
    c.p(331, topo - 2, "#c8a050")
    # Tinteiro com pena atrás da pilha.
    c.ret(346, 109, 5, 4, "#1a2030")
    c.ret(347, 108, 3, 1, "#2a3040")
    c.p(346, 109, "#5a6a8a")
    c.linha(349, 108, 356, 96, "#e8e4dc")
    c.linha(350, 107, 357, 97, "#c8c4bc")
    c.linha(355, 98, 358, 94, "#f8f4ec")

    # Livro grande aberto em perspectiva: capa de couro, bloco de folhas, páginas curvas, texto e uma prancha do fêmur.
    gx_, top_, bot_ = 370, 106, 121          # lombada (calha) e alturas
    esq, dirx = 346, 395
    c.poligono([(esq - 2, bot_ + 2), (dirx + 2, bot_ + 2), (dirx + 1, top_ + 2), (esq - 1, top_ + 2)], "#4a2414")
    c.ret(esq - 2, bot_ + 2, dirx - esq + 5, 1, "#2a1008")
    c.ret(esq - 1, bot_ + 1, dirx - esq + 3, 1, "#c8b890")
    c.ret(esq, bot_, dirx - esq + 1, 1, "#e0d4b0")
    for x in range(esq, dirx + 1):
        dist = abs(x + 0.5 - gx_)
        meia = (gx_ - esq) if x < gx_ else (dirx - gx_)
        t = min(1, dist / meia)
        # página sobe da calha e cai na borda (curva das folhas)
        ytop = top_ + 3.2 - 3.0 * math.sin(t * math.pi * 0.75) + 1.2 * t * t
        ybot = bot_ - 0.6 * math.sin(t * math.pi)
        for y in range(int(round(ytop)), int(round(ybot))):
            sombra = 0.62 + 0.38 * min(1, dist / 6)
            if x < gx_:
                sombra *= 0.94
            c.p(x, y, np.clip(hexa("#f0e6c8") * sombra, 0, 1))
        c.p(x, int(round(ytop)), np.clip(hexa("#fff8e4") * (0.7 + 0.3 * min(1, dist / 6)), 0, 1))
    c.ret(gx_, top_ + 3, 1, bot_ - top_ - 3, "#7a6a4a")
    # Página da esquerda: título em vermelho, capitular e linhas de texto.
    c.ret(350, 109, 9, 1, "#9a2a20")
    c.ret(350, 111, 3, 3, "#9a2a20")
    c.p(351, 112, "#e8c25a")
    for y in range(111, 120, 2):
        x = 354 if y < 114 else 350
        while x < gx_ - 2:
            n = 1 + int(g.random() * 4)
            for i in range(n):
                if x + i < gx_ - 2:
                    c.p(x + i, y, "#4a3a2a", 0.85)
            x += n + 1
    # Página da direita: prancha do fêmur (cabeça, colo, trocanter, diáfise e côndilos) e legenda.
    sepia, sepia2, osso = "#5a3a1e", "#8a6038", "#e8d6aa"
    c.linha(377, 118, 388, 110, osso)
    c.linha(377, 117, 388, 109, sepia2)
    c.linha(378, 118, 389, 110, sepia)
    c.elipse(390.5, 108.5, 1.6, 1.6, sepia2)
    c.p(390, 108, osso)
    c.p(387, 111, sepia)
    c.p(388, 112, sepia)                     # pequeno trocanter
    c.p(386, 109, sepia2)                    # grande trocanter
    c.p(385, 109, sepia)
    c.ret(374, 118, 3, 2, sepia2)            # côndilos
    c.p(375, 120, sepia)
    c.p(377, 120, sepia)
    c.p(374, 118, sepia)
    for (x, y) in ((381, 112), (380, 113)):
        c.p(x, y, "#9a2a20", 0.8)
    c.linha(379, 113, 383, 111, "#9a2a20", 0.5)
    for x in range(382, 394):
        if x % 3:
            c.p(x, 117, "#4a3a2a", 0.7)
            c.p(x, 119, "#4a3a2a", 0.6)
    c.ret(359, bot_ + 3, 1, 5, "#a02020")   # fitinha marcadora pendurada
    c.p(359, bot_ + 8, "#701010")

    # Lupa deitada na beira do livro: aro de latão, lente que aumenta o texto e cabo de madeira.
    lx, ly = 397, 121
    for y in range(ly - 3, ly + 4):
        for x in range(lx - 5, lx + 6):
            r = ((x + 0.5 - lx) / 5.2) ** 2 + ((y + 0.5 - ly) / 3.0) ** 2
            if r <= 1:
                if r > 0.6:
                    c.p(x, y, LATAO[1] if y < ly else LATAO[2])
                else:
                    c.p(x, y, "#b8d0d0")
                    if y == ly and (x % 3):
                        c.p(x, y, "#506060")
    c.p(lx - 2, ly - 1, "#ffffff")
    c.p(lx - 1, ly - 2, "#ffffff", 0.7)
    c.linha(lx + 5, ly + 1, lx + 12, ly + 4, "#3a1e10")
    c.linha(lx + 5, ly + 2, lx + 12, ly + 5, "#6a3818")
    c.p(lx + 5, ly + 1, LATAO[0])
    c.p(lx + 12, ly + 4, LATAO[2])

    # Lamparina de latão: pé, haste, reservatório, queimador com chave do pavio e manga de vidro com a chama.
    bx, by = LAMPADA[0], 120
    c.elipse(bx, by - 1, 7, 1.8, LATAO[2])
    c.ret(bx - 6, by - 2, 12, 1, LATAO[1])
    c.ret(bx - 7, by - 1, 14, 1, LATAO[3])
    c.ret(bx - 2, by - 6, 4, 4, LATAO[2])
    c.ret(bx - 2, by - 6, 1, 4, LATAO[0])
    c.ret(bx + 1, by - 6, 1, 4, LATAO[3])
    c.elipse(bx, by - 9, 5.5, 3.5, LATAO[2])
    c.elipse(bx - 2, by - 10, 2.2, 1.4, LATAO[1])
    c.p(bx - 3, by - 10, LATAO[0])
    c.p(bx + 4, by - 8, LATAO[3])
    c.ret(bx - 5, by - 8, 11, 1, LATAO[3])
    for k in range(5):   # alça
        c.p(bx + 7 + (1 if 0 < k < 4 else 0), by - 11 + k, LATAO[2])
    c.ret(bx - 3, by - 14, 7, 2, LATAO[1])
    c.ret(bx - 3, by - 14, 7, 1, LATAO[0])
    c.ret(bx + 4, by - 13, 2, 1, LATAO[2])
    c.p(bx + 6, by - 13, LATAO[0])
    fx, fy = LAMPADA
    # Manga de vidro (no emissivo, porque brilha) e a chama.
    for y in range(by - 28, by - 14):
        j = y - (by - 28)
        larg = 2 if j < 4 else 3 if j < 6 else 4 if j < 12 else 3
        for x in range(bx - larg, bx + larg):
            borda = x in (bx - larg, bx + larg - 1)
            e[y, x] += hexa("#ffd8a0") * (0.5 if borda else 0.16)
    for (dx, dy, cor, k) in ((0, 0, "#ffffff", 1.4), (0, 1, "#fff4c0", 1.3), (-1, 1, "#ffc860", 0.8), (0, 2, "#ffe080", 1.1),
                             (-1, 2, "#ff9a30", 0.7), (0, -1, "#ffd070", 0.9), (0, -2, "#ff9030", 0.5), (-1, 0, "#ffb040", 0.6),
                             (0, 3, "#80a0ff", 0.4)):
        e[fy + dy, fx + dx] += hexa(cor) * k
    c.ret(bx - 2, by - 29, 4, 1, LATAO[3], 0.8)

    # Xícara de chá no pires, com colherinha (o vapor sai no emissivo de 3x).
    xx, xy = 421, 121
    c.elipse(xx, xy, 7, 1.6, "#d8d4cc")
    c.ret(xx - 6, xy + 1, 12, 1, "#8a8680")
    for y in range(xy - 7, xy):
        meia = 4 if y < xy - 2 else 3
        for x in range(xx - meia, xx + meia + 1):
            k = 1.05 if x < xx - 1 else 0.92 if x < xx + 2 else 0.75
            cor = "#3a5aa0" if y == xy - 5 else "#f4f0e8"
            c.p(x, y, tom(cor, k))
    c.ret(xx - 3, xy - 7, 7, 1, "#6a3a14")
    c.p(xx - 1, xy - 7, "#c08040")
    c.ret(xx - 4, xy - 8, 9, 1, "#e8e4dc")
    for (dx, dy) in ((5, -6), (6, -5), (6, -4), (5, -3)):
        c.p(xx + dx, xy + dy, "#e0dcd4")
    c.linha(xx - 9, xy + 2, xx - 5, xy, "#c8c8d0")


def livros_no_chao(c: Camada) -> None:
    """Pilha de livros no tapete, ao pé da mesa, e um livro aberto virado para baixo (no caminho do luar)."""
    c.z_atual = 0.7
    y = 146
    for (x0, larg, esp, cor) in ((296, 22, 4, "#2a4470"), (298, 19, 3, "#7a4a2a"), (295, 20, 4, "#8e2a2a"), (299, 15, 3, "#2f5e3a")):
        base = hexa(cor)
        c.ret(x0, y - esp + 1, larg, esp, base)
        c.ret(x0, y - esp + 1, larg, 1, np.clip(base * 1.35, 0, 1))
        c.ret(x0, y, larg, 1, np.clip(base * 0.55, 0, 1))
        c.ret(x0 + larg, y - esp + 1, 2, esp, "#e0d4b0")
        c.ret(x0 + 2, y - esp + 1, 1, esp, tom(OURO, 0.9))
        c.ret(x0 + larg - 3, y - esp + 1, 1, esp, tom(OURO, 0.9))
        y -= esp
    # Livro aberto emborcado, como uma tendinha.
    c.poligono([(268, 152), (277, 146), (286, 152)], "#3a7a8a")
    c.linha(268, 152, 277, 146, "#6ab0c0")
    c.linha(277, 146, 286, 152, "#1e4a5a")
    c.ret(272, 150, 10, 1, tom(OURO, 0.9))
    c.ret(269, 152, 17, 1, "#e0d4b0")
    c.p(277, 147, tom(OURO, 0.9))


def poltrona(c: Camada) -> None:
    """Poltrona de couro com orelhas, em três quartos, virada para a mesa: braço enrolado, capitonê, tachas de latão
    e uma manta xadrez no encosto. Sombreada em 7 tons, com a luz vindo da lamparina (à esquerda)."""
    c.z_atual = 0.85
    couro = [hexa(k) for k in ("#d2704e", "#b2563e", "#923e2c", "#76301f", "#5a2216", "#3e160e", "#260a06")]

    def t_(i: float) -> np.ndarray:
        return couro[int(max(0, min(6, round(i))))]

    # Encosto alto com o topo arredondado (cortado na borda direita).
    for y in range(80, 128):
        x0 = 459 + max(0, int((88 - y) * 1.4)) if y < 88 else 459
        for x in range(x0, W):
            i = 1.6 + (x - x0) / 7
            if y < 88 and y <= 80 + (x - 459) * 0.6:
                i = 1
            c.p(x, y, t_(i))
    for y in range(88, 124, 6):      # capitonê: botões e vincos em losango
        for x in range(463 + ((y - 88) // 6) % 2 * 4, W, 8):
            c.linha(x, y, x + 4, y + 6, couro[5], 0.55)
            c.linha(x, y, x - 4, y + 6, couro[5], 0.55)
            c.p(x, y, couro[6])
            c.p(x, y - 1, couro[1])
    # Orelha: aba arredondada que sai do encosto em direção à mesa.
    for y in range(86, 122):
        meio = (y - 100) / 13
        xl = round(448 + 3 * meio * meio) if y > 88 else 451 - (y - 86)
        for x in range(xl, 460):
            d = (x - xl) / max(1, 460 - xl)
            i = 0.6 if x == xl else 1.6 + d * 3.4
            c.p(x, y, t_(i))
    for y in range(90, 118, 3):
        xl = round(448 + 3 * ((y - 100) / 13) ** 2)
        c.p(xl + 1, y, LATAO[1])
    # Braço enrolado: cilindro deitado da orelha até a frente, com a espiral na ponta.
    for x in range(437, 458):
        yc = 117 + (458 - x) * 3 / 21
        for dy in range(-4, 5):
            i = 1 if dy <= -3 else 2 if dy <= -1 else 3 if dy <= 1 else 4.5
            c.p(x, round(yc + dy), t_(i))
    ex, ey = 437, 120
    for y in range(ey - 5, ey + 6):
        for x in range(ex - 5, ex + 5):
            d = math.hypot(x + 0.5 - ex, (y + 0.5 - ey) * 0.95)
            if d <= 4.8:
                ang = math.atan2(y + 0.5 - ey, x + 0.5 - ex)
                i = 1.2 + (math.sin(ang) + 1) * 1.2
                if abs(d - 2.6) < 0.6:
                    i += 1.6
                c.p(x, y, t_(i))
    c.p(ex - 1, ey - 1, couro[0])
    c.p(ex, ey, couro[5])
    # Painel da frente do braço, até o chão, escurecendo para baixo.
    for y in range(124, 147):
        for x in range(433, 442):
            i = (1.2 if x == 433 else 2.4 if x < 437 else 3.2) + (y - 124) / 12
            c.p(x, y, t_(i))
    for y in range(126, 145, 2):
        c.p(434, y, LATAO[1])
    # Assento: almofada (topo e frente com vivo) e a base com fileira de tachas.
    c.poligono([(446, 124), (W, 124), (W, 129), (442, 129)], couro[2])
    c.linha(446, 124, W, 124, couro[1])
    c.ret(442, 129, 38, 1, couro[1])
    c.ret(442, 130, 38, 4, couro[3])
    c.ret(442, 133, 38, 1, couro[4])
    c.ret(442, 134, 38, 12, couro[4])
    for x in range(443, W, 2):
        c.p(x, 135, LATAO[2])
        c.p(x, 144, LATAO[3])
    for x in range(446, W, 9):
        c.ret(x, 136, 1, 8, couro[5])
    c.ret(442, 146, 38, 1, couro[6])
    # Pés torneados com rodízio de latão.
    for x in (435, 470):
        c.ret(x, 147, 3, 4, MOGNO[2])
        c.p(x, 147, MOGNO[0])
        c.ret(x, 151, 3, 1, LATAO[2])
    # Manta xadrez dobrada sobre o encosto, caindo pela lateral, com franja.
    for y in range(78, 116):
        for x in range(468, W):
            dentro = y > 79 + (x - 468) * 0.12 + (1 if x > 474 else 0) and y < 94 + (W - x) * 1.2 + 1.5 * math.sin(x / 1.7)
            if dentro:
                xad = (x // 3 + y // 3) % 2
                cor = "#2a5a3e" if xad else "#1e4430"
                if x % 6 == 0 or y % 6 == 0:
                    cor = "#a8402e"
                if x % 6 == 3 and y % 6 == 3:
                    cor = "#e8c25a"
                c.p(x, y, tom(cor, 1.15 if x < 470 else 1.0))
    for x in range(468, W, 2):
        yb = int(94 + (W - x) * 1.2 + 1.5 * math.sin(x / 1.7))
        if yb < 116:
            c.p(x, yb, "#e8c25a")
            c.p(x, yb + 1, "#a8402e")


def sombras_de_contato(c: Camada) -> None:
    """Sombras no chão sob a mesa, a poltrona, a escada e o globo."""
    c.z_atual = 0.5
    dm = DXM if PERIODO else 0
    for (cx, cy, rx, ry, a) in ((376 + dm, 152, 66, 6, 0.55), (376 + dm, 150, 48, 4, 0.35), (460, 151, 28, 4, 0.65),
                                 (194, 121, 12, 2, 0.4), (248, 123, 10, 2.2, 0.5), (300, 115, 40, 2, 0.4),
                                 (307, 147, 14, 2, 0.6), (277, 153, 10, 1.6, 0.5)):
        for k in range(4):
            c.elipse(cx, cy, rx * (1 - k * 0.18), ry * (1 - k * 0.18), "#05040a", a * 0.3)


def primeiro_plano() -> Camada:
    """Perto da câmera (vai desfocado): pilha de livros no chão à esquerda e a borda de uma cortina no alto à direita."""
    c = Camada(1.0)
    g = np.random.default_rng(71)
    y = 160
    for i in range(6):
        esp = 5 + int(g.random() * 4)
        larg = 46 + int(g.random() * 14)
        x0 = -10 + int(g.random() * 8)
        cor = LIVROS[g.choice(len(LIVROS), p=PESOS)]
        c.ret(x0, y - esp, larg, esp, tom(cor, 0.8))
        c.ret(x0, y - esp, larg, 1, tom(cor, 1.1))
        c.ret(x0 + larg, y - esp, 3, esp, "#c8bc98")
        y -= esp
    for x in range(430, W):
        for y in range(0, int(14 + (x - 430) * 0.5 + 3 * math.sin(x / 4))):
            v = math.cos(x / 3.0)
            c.p(x, y, "#5e1824" if v > 0 else "#3a0c14")
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
    """Desfoque com alfa pré-multiplicado (sem halo escuro nas bordas)."""
    pm = arr.copy()
    pm[:, :, :3] *= pm[:, :, 3:4]
    d = desfocar(pm, raio)
    a = np.maximum(d[:, :, 3:4], 1e-4)
    d[:, :, :3] = d[:, :, :3] / a
    return d


YS, XS = (m / ESC for m in np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32))


def luz3d(cx: float, cy: float, cz: float, raio: float, z: np.ndarray, prof: float = 80.0, achatar: float = 1.0) -> np.ndarray:
    """Luz pontual com profundidade: núcleo gaussiano + cauda longa (1/d²)."""
    d2 = ((XS - cx) ** 2 + ((YS - cy) / achatar) ** 2 + ((z - cz) * prof) ** 2) / raio ** 2
    return np.exp(-d2 * 2.2) * 0.7 + 0.3 / (1 + d2 * 6)


def contraluz(alfa: np.ndarray, dx: int, dy: int) -> np.ndarray:
    """Pixels de borda de um objeto do lado (dx, dy): onde o vizinho naquela direção é vazio."""
    viz = np.roll(np.roll(alfa, -dy, 0), -dx, 1)
    return ((alfa > 0.5) & (viz < 0.5)).astype(np.float32)


def feixes_do_luar(trans: np.ndarray, opacos: np.ndarray, lado: float = -1.0, alcance: float = 72.0,
                   subida: float = 39.0) -> tuple[np.ndarray, np.ndarray]:
    """Projeta cada pedacinho de vidro até o chão: o caminho vira o feixe volumétrico e o fim vira a mancha de luz
    (com a sombra dos caixilhos). O luar vem do alto à direita, então o alto da janela cai mais longe e à esquerda."""
    hh, ww = H * ESC, W * ESC
    feixe = np.zeros((hh, ww), dtype=np.float32)
    mancha = np.zeros((hh, ww), dtype=np.float32)
    ys, xs = np.nonzero(trans > 0)
    sub = 3
    pts_x, pts_y, pesos = [], [], []
    for sy in range(sub):
        for sx in range(sub):
            pts_x.append(xs + (sx + 0.5) / sub)
            pts_y.append(ys + (sy + 0.5) / sub)
            pesos.append(trans[ys, xs])
    wx, wy, pw = np.concatenate(pts_x), np.concatenate(pts_y), np.concatenate(pesos)
    th = np.clip((wy - 8) / (JBASE - 8), 0, 1)
    destino_y = 159 - th * subida
    escala = 1.0 + (1 - th) * 0.55
    destino_x = JX + (wx - JX) * escala + lado * ((1 - th) * alcance + 12)
    # Cada raio com sua densidade de poeira: é isso que separa o luar em fachos distintos.
    g = np.random.default_rng(93)
    faixas = np.repeat(g.random(64), 4)
    faixas = np.convolve(faixas, np.ones(3) / 3, mode="same")
    idx = np.clip(((wx - (JX - JR)) * 1.6 + (wy - 8) * 0.25).astype(int), 0, len(faixas) - 1)
    raio_peso = pw * (0.15 + 1.6 * faixas[idx] ** 2)
    passos = 80
    ruido_feixe = ampliar(ruido(91, 6)[:, :, None])[:, :, 0]
    for i in range(passos + 1):
        t = i / passos
        px = ((wx + (destino_x - wx) * t) * ESC).astype(np.int32)
        py = ((wy + (destino_y - wy) * t) * ESC).astype(np.int32)
        ok = (px >= 0) & (px < ww) & (py >= 0) & (py < hh)
        if i == passos:
            np.add.at(mancha, (py[ok], px[ok]), pw[ok])
        else:
            perto = min(1.0, max(0.0, (t - 0.06) / 0.3))     # junto do vidro o facho some no brilho da janela
            np.add.at(feixe, (py[ok], px[ok]), raio_peso[ok] * perto * perto * (1 - 0.55 * t ** 3))
    feixe = desfocar(feixe[:, :, None], 3)[:, :, 0]
    feixe *= 0.6 + 0.8 * ruido_feixe
    feixe *= 1 - opacos
    mancha = desfocar(mancha[:, :, None], 1.6)[:, :, 0]
    mancha = mancha / max(np.percentile(mancha[mancha > 0], 90), 1e-6)
    return feixe / max(np.percentile(feixe, 99.7), 1e-6), np.clip(mancha, 0, 1.3)


def vapor() -> np.ndarray:
    """Fiapos de vapor saindo do chá (desenhados direto em 3x, finos e translúcidos)."""
    v = np.zeros((H * ESC, W * ESC), dtype=np.float32)
    x0, y0 = (421 + (DXM if PERIODO else 0)) * ESC, 112 * ESC
    for k, fase in enumerate((0.0, 2.1, 4.0)):
        for j in range(0, 66):
            y = y0 - j
            amp = 2 + j * 0.12
            x = x0 + (k - 1) * 4 + amp * math.sin(j / 9.0 + fase) + j * 0.15
            a = (1 - j / 66) * min(1, j / 6) * 0.65
            for dx in (-1, 0, 1):
                xi = int(x) + dx
                if 0 <= xi < W * ESC and 0 <= y < H * ESC:
                    v[y, xi] += a * (1 if dx == 0 else 0.4)
    return desfocar(v[:, :, None], 1.2)[:, :, 0]


def montar() -> Image.Image:
    emis1 = np.zeros((H, W, 3), dtype=np.float32)
    parede = parede_e_estantes()
    emis_jan, trans = janela(parede)
    emis1 += emis_jan
    arandela(parede, emis1, 381, 70)
    cort = cortinas_e_assento()
    meio = Camada(0.3)
    escada(meio)
    chamas_lustre = lustre(meio, emis1)
    globo(meio)
    chao = chao_e_tapete()
    sombras = Camada(0.5)
    sombras_de_contato(sombras)
    frente = Camada(0.75)
    mesa(frente, emis1)
    livros_no_chao(frente)
    poltrona(frente)
    fg = primeiro_plano()

    # Composição do albedo e do mapa de profundidade (1x), com uma marca de qual camada está em cada pixel.
    alb = np.zeros((H, W, 3), dtype=np.float32)
    z = np.zeros((H, W), dtype=np.float32)
    eh_chao = np.zeros((H, W), dtype=np.float32)
    for cam, chao_ in ((parede, 0), (chao, 1), (cort, 0), (meio, 0), (sombras, -1), (frente, 0)):
        a = cam.c[:, :, 3:4]
        alb = alb * (1 - a) + cam.c[:, :, :3] * a
        if chao_ >= 0:
            sel = cam.c[:, :, 3] > 0.5
            z[sel] = cam.z[sel]
            eh_chao[sel] = chao_
    vidro = (trans > 0).astype(np.float32)

    # Contraluz pintada em 1x: luar (vem do alto à direita) nas bordas de cima/direita; lamparina nas bordas voltadas a ela.
    rim_lua = np.zeros((H, W), dtype=np.float32)
    rim_lamp = np.zeros((H, W), dtype=np.float32)
    for cam in (meio, cort, frente):
        al = cam.c[:, :, 3]
        rim_lua = np.maximum(rim_lua, np.maximum(contraluz(al, 1, 0), contraluz(al, 0, -1)) * al)
        ys1, xs1 = np.mgrid[0:H, 0:W]
        ddx = np.sign(LAMPADA[0] - xs1).astype(int)
        ddy = np.sign(LAMPADA[1] - ys1).astype(int)
        for sx in (-1, 0, 1):
            for sy in (-1, 0, 1):
                if sx == 0 and sy == 0:
                    continue
                m = contraluz(al, sx, sy) * ((ddx == sx) & (ddy == sy))
                rim_lamp = np.maximum(rim_lamp, m)

    alb3, z3, chao3 = ampliar(alb), ampliar(z[:, :, None])[:, :, 0], ampliar(eh_chao[:, :, None])[:, :, 0]
    z3 = desfocar(z3[:, :, None], 1.0)[:, :, 0]
    emis3 = ampliar(emis1)
    vidro3 = ampliar(vidro[:, :, None])[:, :, 0]
    fx, fy = LAMPADA

    # Luz: ambiente frio + luar perto da janela + lamparina + lustre + arandela.
    luz = np.zeros_like(alb3) + hexa("#2a3866") * 0.85
    luz += luz3d(JX, 62, -0.1, 90, z3, achatar=1.4)[:, :, None] * hexa("#7a96e0") * 0.6
    luz += luz3d(JX - 40, 90, 0.3, 260, z3, achatar=0.7)[:, :, None] * hexa("#5a72c0") * 0.35
    luz += luz3d(70, 60, 0.2, 240, z3, achatar=0.8)[:, :, None] * hexa("#4a5a9a") * 0.3   # penumbra fria à esquerda
    lamp = luz3d(fx, fy, 0.75, 140, z3, prof=110, achatar=0.85) * 1.0 + luz3d(fx, fy, 0.75, 40, z3, prof=60) * 0.8
    # A própria mesa faz sombra no chão embaixo dela.
    sob_mesa = ((XS > 312) & (XS < 440) & (YS > 128)).astype(np.float32) * chao3
    sob_mesa = desfocar(sob_mesa[:, :, None], 6)[:, :, 0]
    lamp *= 1 - sob_mesa * 0.8
    # O corpo de latão da lamparina fica abaixo da chama: recebe menos luz direta (senão vira um borrão amarelo).
    corpo = ((XS >= 396) & (XS < 414) & (YS >= 104) & (YS < 121)).astype(np.float32)
    lamp_vis = lamp * (1 - corpo * 0.6)
    luz += lamp_vis[:, :, None] * hexa("#ffb46c") * 1.35
    for (vx, vy) in chamas_lustre:
        luz += luz3d(vx, vy, 0.45, 36, z3, prof=60)[:, :, None] * hexa("#ffb860") * 0.22
    luz += luz3d(385, 66, 0.04, 30, z3, prof=60)[:, :, None] * hexa("#ffb050") * 0.7

    # Feixes e mancha de luar no chão.
    opacos = ampliar(((frente.c[:, :, 3] > 0.5)).astype(np.float32)[:, :, None])[:, :, 0]
    feixe, mancha = feixes_do_luar(trans, opacos)
    luz += (mancha * chao3)[:, :, None] * hexa("#b8ccff") * 1.7

    img = alb3 * luz
    # Contraluz (em 3x, suave).
    rl = desfocar(ampliar(rim_lua[:, :, None]), 0.6)[:, :, 0]
    rl *= np.clip(luz3d(JX, 60, 0.0, 170, np.zeros_like(z3)) * 1.4, 0, 1)
    img += (rl * 0.35)[:, :, None] * hexa("#9ab4ff") * alb3.mean(2, keepdims=True).clip(0.3, 1)
    rk = desfocar(ampliar(rim_lamp[:, :, None]), 0.6)[:, :, 0] * np.clip(lamp * 1.6, 0, 1)
    img += (rk * 0.35)[:, :, None] * hexa("#ffc880")
    img = img * (1 - vidro3[:, :, None]) + emis3 * vidro3[:, :, None]
    img += emis3 * (1 - vidro3[:, :, None])

    # Feixes volumétricos com poeira.
    img += feixe[:, :, None] * hexa("#8aa6ff") * 0.95
    g = np.random.default_rng(5)
    poeira = np.zeros(feixe.shape, dtype=np.float32)
    for _ in range(2600):
        x, y = int(g.random() * W * ESC), int(g.random() * H * ESC)
        if feixe[y, x] > 0.15 and g.random() < feixe[y, x]:
            poeira[y, x] = 0.4 + g.random() * 0.8
            if g.random() < 0.3 and x + 1 < W * ESC:
                poeira[y, x + 1] = poeira[y, x] * 0.5
    for _ in range(140):   # poeira dourada perto da lamparina
        ang, r = g.random() * math.tau, g.random() ** 0.6 * 40
        x, y = int((fx + math.cos(ang) * r) * ESC), int((fy - 6 + math.sin(ang) * r * 0.7) * ESC)
        if 0 <= x < W * ESC and 0 <= y < H * ESC:
            poeira[y, x] = -(0.3 + g.random() * 0.6)
    img += np.clip(poeira, 0, None)[:, :, None] * hexa("#c8d8ff") * 0.55
    img += np.clip(-poeira, 0, None)[:, :, None] * hexa("#ffd890") * 0.6

    # Vapor do chá, iluminado pela lamparina.
    img += vapor()[:, :, None] * hexa("#ffe4c4") * 1.5

    # Halo da chama e da manga de vidro, e um leve halo do lustre e da arandela.
    halo = luz3d(fx, fy - 1, 0, 26, np.zeros_like(z3)) * 0.3 + luz3d(fx, fy, 0, 7, np.zeros_like(z3)) * 0.7
    for (vx, vy) in chamas_lustre:
        halo += luz3d(vx, vy, 0, 6, np.zeros_like(z3)) * 0.3
    halo += luz3d(385, 66, 0, 7, np.zeros_like(z3)) * 0.35
    img += halo[:, :, None] * hexa("#ffb860")

    # Primeiro plano desfocado e escuro.
    fg3 = desfocar_rgba(ampliar(fg.c), 7)
    fgc = fg3[:, :, :3] * (hexa("#3a4060") * 0.5 + luz3d(fx, fy, 1.0, 200, np.ones_like(z3))[:, :, None] * hexa("#ffa850") * 0.4)
    img = img * (1 - fg3[:, :, 3:4]) + fgc * fg3[:, :, 3:4]

    # Brilho (bloom) das luzes fortes.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.65) * 3, 0, 1), 0, 2)
    img += desfocar(claro, 14) * 0.5 + desfocar(claro, 4) * 0.35

    # Mapeamento de tons: as luzes fortes encostam no branco sem estourar em chapado.
    lum = img.mean(2, keepdims=True)
    comp = np.where(lum > 0.6, 0.6 + (lum - 0.6) / (1 + (lum - 0.6) * 1.6), lum) / np.maximum(lum, 1e-4)
    img = img * comp
    lum2 = img.mean(2, keepdims=True)
    img = img + (lum2 - img) * np.clip((lum2 - 0.7) * 0.8, 0, 0.35)

    # Correção de cor: luzes quentes, sombras frias; contraste.
    quente, fria = hexa("#ffd9a0"), hexa("#16204a")
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * quente + (1 - lum) * (fria * 0.6 + 0.4)))
    img = np.clip((img - 0.45) * 1.1 + 0.45, 0, 1.4)

    # Lado esquerdo mais calmo (o texto vai ali): menos contraste e mais escuro, mas ainda com os detalhes.
    calma = np.clip((0.47 - XS / W) / 0.17, 0, 1)[:, :, None]
    media = img.mean(2, keepdims=True)
    suave = (media + (img - media) * 0.72) * 0.88 + hexa("#0c1228") * 0.06
    img = img * (1 - calma) + suave * calma

    # Vinheta e grão.
    v = ((XS / W - 0.58) ** 2 * 1.2 + (YS / H - 0.55) ** 2 * 1.6)
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.0)[:, :, None]
    g = np.random.default_rng(99)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.018
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def montar_hora() -> Image.Image:
    """A biblioteca numa hora do dia (página Resumos). A mesa vai para debaixo da janela (DXM); a luz entra pela
    janela vindo da esquerda e pousa no tapete livre: sol branco-dourado de manhã, poente comprido e laranja à tarde,
    luar à noite. A lamparina, o lustre e a arandela ficam apagados de manhã, acesos fraquinho à tarde e plenos à noite."""
    P = PERIODO
    k_luz = {"manha": 0.0, "tarde": 0.55, "noite": 1.0}[P]
    cor_sol = {"manha": "#fff0d4", "tarde": "#ffa860", "noite": "#b8ccff"}[P]
    cor_feixe = {"manha": "#fff2d8", "tarde": "#ffb070", "noite": "#8aa6ff"}[P]
    emis1 = np.zeros((H, W, 3), dtype=np.float32)
    parede = parede_e_estantes()
    emis_jan, trans = janela(parede)
    emis1 += emis_jan * (0.82 if P == "manha" else 1.0)
    emis_velas = np.zeros((H, W, 3), dtype=np.float32)
    arandela(parede, emis_velas, 381, 70)
    cort = cortinas_e_assento()
    meio = Camada(0.3)
    escada(meio)
    chamas_lustre = lustre(meio, emis_velas)
    emis1 += emis_velas * k_luz
    globo(meio)
    chao = chao_e_tapete()
    sombras = Camada(0.5)
    sombras_de_contato(sombras)
    # A mesa é pintada no lugar de sempre e depois arrastada para debaixo da janela (com o seu emissivo).
    frente = Camada(0.75)
    emis_mesa = np.zeros((H, W, 3), dtype=np.float32)
    mesa(frente, emis_mesa)
    frente.c = np.roll(frente.c, DXM, 1)
    frente.z = np.roll(frente.z, DXM, 1)
    emis_mesa = np.roll(emis_mesa, DXM, 1)
    if P == "manha":  # lamparina apagada: a manga vira vidro claro, sem chama
        vid = emis_mesa.sum(2) > 0
        frente.c[vid, :3] = np.clip(emis_mesa[vid] * 0.25, 0, 1) + hexa("#c8d0d8") * 0.7
        frente.c[vid, 3] = 0.75
    else:
        emis1 += emis_mesa * (0.75 if P == "tarde" else 1.0)
    livros_no_chao(frente)
    poltrona(frente)
    fg = primeiro_plano()

    # Composição do albedo e do mapa de profundidade (1x), com uma marca de qual camada está em cada pixel.
    alb = np.zeros((H, W, 3), dtype=np.float32)
    z = np.zeros((H, W), dtype=np.float32)
    eh_chao = np.zeros((H, W), dtype=np.float32)
    for cam, chao_ in ((parede, 0), (chao, 1), (cort, 0), (meio, 0), (sombras, -1), (frente, 0)):
        a = cam.c[:, :, 3:4]
        alb = alb * (1 - a) + cam.c[:, :, :3] * a
        if chao_ >= 0:
            sel = cam.c[:, :, 3] > 0.5
            z[sel] = cam.z[sel]
            eh_chao[sel] = chao_
    vidro = (trans > 0).astype(np.float32)

    # Contraluz pintada em 1x: luar (vem do alto à direita) nas bordas de cima/direita; lamparina nas bordas voltadas a ela.
    rim_lua = np.zeros((H, W), dtype=np.float32)  # aqui a luz da janela vem do alto à esquerda
    rim_lamp = np.zeros((H, W), dtype=np.float32)
    for cam in (meio, cort, frente):
        al = cam.c[:, :, 3]
        rim_lua = np.maximum(rim_lua, np.maximum(contraluz(al, -1, 0), contraluz(al, 0, -1)) * al)
        ys1, xs1 = np.mgrid[0:H, 0:W]
        ddx = np.sign(LAMPADA[0] + DXM - xs1).astype(int)
        ddy = np.sign(LAMPADA[1] - ys1).astype(int)
        for sx in (-1, 0, 1):
            for sy in (-1, 0, 1):
                if sx == 0 and sy == 0:
                    continue
                m = contraluz(al, sx, sy) * ((ddx == sx) & (ddy == sy))
                rim_lamp = np.maximum(rim_lamp, m)

    alb3, z3, chao3 = ampliar(alb), ampliar(z[:, :, None])[:, :, 0], ampliar(eh_chao[:, :, None])[:, :, 0]
    z3 = desfocar(z3[:, :, None], 1.0)[:, :, 0]
    emis3 = ampliar(emis1)
    vidro3 = ampliar(vidro[:, :, None])[:, :, 0]
    fx, fy = LAMPADA[0] + DXM, LAMPADA[1]

    # Luz: ambiente da hora + a claridade da janela + lamparina + lustre + arandela.
    amb, k_amb = {"manha": ("#8a90b4", 0.72), "tarde": ("#6a5070", 0.75), "noite": ("#2a3866", 0.85)}[P]
    luz = np.zeros_like(alb3) + hexa(amb) * k_amb
    k_jan = {"manha": 1.0, "tarde": 0.8, "noite": 0.6}[P]
    luz += luz3d(JX, 62, -0.1, 90, z3, achatar=1.4)[:, :, None] * hexa(cor_sol) * k_jan
    luz += luz3d(JX + 50, 100, 0.3, 260, z3, achatar=0.7)[:, :, None] * hexa(cor_sol) * 0.35 * k_jan
    luz += luz3d(70, 60, 0.2, 240, z3, achatar=0.8)[:, :, None] * hexa("#4a5a9a") * 0.3   # penumbra fria à esquerda
    # a luz que bate no tapete rebate na poltrona e nas estantes da direita
    luz += luz3d(410, 130, 0.8, 120, z3, prof=60, achatar=0.8)[:, :, None] * hexa(cor_sol) * {"manha": 0.35, "tarde": 0.3, "noite": 0.12}[P]
    lamp = luz3d(fx, fy, 0.75, 140, z3, prof=110, achatar=0.85) * 1.0 + luz3d(fx, fy, 0.75, 40, z3, prof=60) * 0.8
    # A própria mesa faz sombra no chão embaixo dela.
    sob_mesa = ((XS > 312 + DXM) & (XS < 440 + DXM) & (YS > 128)).astype(np.float32) * chao3
    sob_mesa = desfocar(sob_mesa[:, :, None], 6)[:, :, 0]
    lamp *= 1 - sob_mesa * 0.8
    corpo = ((XS >= 396 + DXM) & (XS < 414 + DXM) & (YS >= 104) & (YS < 121)).astype(np.float32)
    lamp_vis = lamp * (1 - corpo * 0.6)
    luz += lamp_vis[:, :, None] * hexa("#ffb46c") * 1.35 * k_luz * (0.8 if P == "tarde" else 1)
    for (vx, vy) in chamas_lustre:
        luz += luz3d(vx, vy, 0.45, 36, z3, prof=60)[:, :, None] * hexa("#ffb860") * 0.22 * k_luz
    luz += luz3d(385, 66, 0.04, 30, z3, prof=60)[:, :, None] * hexa("#ffb050") * 0.7 * k_luz

    # Feixes e mancha de luz no chão: de manhã inclinada, à tarde comprida e deitada, à noite o luar.
    opacos = ampliar(((frente.c[:, :, 3] > 0.5)).astype(np.float32)[:, :, None])[:, :, 0]
    alcance, subida = {"manha": (58, 39), "tarde": (110, 26), "noite": (50, 39)}[P]
    feixe, mancha = feixes_do_luar(trans, opacos, lado=1.0, alcance=alcance, subida=subida)
    luz += (mancha * chao3)[:, :, None] * hexa(cor_sol) * {"manha": 1.6, "tarde": 1.7, "noite": 1.7}[P]

    img = alb3 * luz
    # Contraluz (em 3x, suave).
    rl = desfocar(ampliar(rim_lua[:, :, None]), 0.6)[:, :, 0]
    rl *= np.clip(luz3d(JX, 60, 0.0, 170, np.zeros_like(z3)) * 1.4, 0, 1)
    img += (rl * 0.35)[:, :, None] * hexa(cor_sol) * alb3.mean(2, keepdims=True).clip(0.3, 1)
    rk = desfocar(ampliar(rim_lamp[:, :, None]), 0.6)[:, :, 0] * np.clip(lamp * 1.6, 0, 1) * k_luz
    img += (rk * 0.35)[:, :, None] * hexa("#ffc880")
    img = img * (1 - vidro3[:, :, None]) + emis3 * vidro3[:, :, None]
    img += emis3 * (1 - vidro3[:, :, None])

    # Feixes volumétricos com poeira.
    img += feixe[:, :, None] * hexa(cor_feixe) * {"manha": 0.75, "tarde": 0.9, "noite": 0.95}[P]
    g = np.random.default_rng(5)
    poeira = np.zeros(feixe.shape, dtype=np.float32)
    for _ in range(2600):
        x, y = int(g.random() * W * ESC), int(g.random() * H * ESC)
        if feixe[y, x] > 0.15 and g.random() < feixe[y, x]:
            poeira[y, x] = 0.4 + g.random() * 0.8
            if g.random() < 0.3 and x + 1 < W * ESC:
                poeira[y, x + 1] = poeira[y, x] * 0.5
    for _ in range(140):   # poeira dourada perto da lamparina
        ang, r = g.random() * math.tau, g.random() ** 0.6 * 40
        x, y = int((fx + math.cos(ang) * r) * ESC), int((fy - 6 + math.sin(ang) * r * 0.7) * ESC)
        if 0 <= x < W * ESC and 0 <= y < H * ESC:
            poeira[y, x] = -(0.3 + g.random() * 0.6)
    img += np.clip(poeira, 0, None)[:, :, None] * hexa(cor_feixe) * 0.55
    img += np.clip(-poeira, 0, None)[:, :, None] * hexa("#ffd890") * 0.6 * k_luz

    # Vapor do chá, iluminado pela lamparina.
    img += vapor()[:, :, None] * hexa("#ffe4c4") * (1.5 if P != "manha" else 0.9)

    # Halo da chama e da manga de vidro, e um leve halo do lustre e da arandela.
    halo = luz3d(fx, fy - 1, 0, 26, np.zeros_like(z3)) * 0.3 + luz3d(fx, fy, 0, 7, np.zeros_like(z3)) * 0.7
    for (vx, vy) in chamas_lustre:
        halo += luz3d(vx, vy, 0, 6, np.zeros_like(z3)) * 0.3
    halo += luz3d(385, 66, 0, 7, np.zeros_like(z3)) * 0.35
    img += halo[:, :, None] * hexa("#ffb860") * k_luz

    # Primeiro plano desfocado e escuro.
    fg3 = desfocar_rgba(ampliar(fg.c), 7)
    fgc = fg3[:, :, :3] * (hexa(amb) * 0.55 + luz3d(fx, fy, 1.0, 200, np.ones_like(z3))[:, :, None] * hexa("#ffa850") * 0.4 * k_luz)
    img = img * (1 - fg3[:, :, 3:4]) + fgc * fg3[:, :, 3:4]

    # Brilho (bloom) das luzes fortes.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.65) * 3, 0, 1), 0, 2)
    img += desfocar(claro, 14) * 0.5 + desfocar(claro, 4) * 0.35

    # Mapeamento de tons: as luzes fortes encostam no branco sem estourar em chapado.
    lum = img.mean(2, keepdims=True)
    comp = np.where(lum > 0.6, 0.6 + (lum - 0.6) / (1 + (lum - 0.6) * 1.6), lum) / np.maximum(lum, 1e-4)
    img = img * comp
    lum2 = img.mean(2, keepdims=True)
    img = img + (lum2 - img) * np.clip((lum2 - 0.7) * 0.8, 0, 0.35)

    # Correção de cor: luzes quentes, sombras frias; contraste.
    quente, fria = (hexa(c_) for c_ in {"manha": ("#fff0d8", "#24366a"), "tarde": ("#ffcf98", "#2e1a48"),
                                         "noite": ("#ffd9a0", "#16204a")}[P])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * quente + (1 - lum) * (fria * 0.6 + 0.4)))
    img = np.clip((img - 0.45) * 1.1 + 0.45, 0, 1.4)

    # Lado esquerdo mais calmo (o texto vai ali): menos contraste e mais escuro, mas ainda com os detalhes.
    calma = np.clip((0.47 - XS / W) / 0.17, 0, 1)[:, :, None]
    media = img.mean(2, keepdims=True)
    suave = (media + (img - media) * 0.72) * 0.88 + hexa("#0c1228") * 0.06
    img = img * (1 - calma) + suave * calma

    # Vinheta e grão.
    v = ((XS / W - 0.58) ** 2 * 1.2 + (YS / H - 0.55) ** 2 * 1.6)
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.0)[:, :, None]
    g = np.random.default_rng(99)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.018
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    """Sem argumentos: a seção da página inicial (public/pixel/inicio/secao-biblioteca).
    Com --paginas [manha|tarde|noite]: a página Resumos em public/pixel/paginas/biblioteca-<hora>(-960).webp."""
    global PERIODO
    args = sys.argv[1:]
    if "--paginas" in args:
        PASTA_PAGINAS.mkdir(parents=True, exist_ok=True)
        for p in [a for a in args if a in PERIODOS] or list(PERIODOS):
            PERIODO = p
            img = montar_hora()
            nome = f"biblioteca-{p}"
            img.save(PASTA_PAGINAS / f"{nome}.webp", quality=84, method=6)
            img.resize((960, 320), Image.LANCZOS).save(PASTA_PAGINAS / f"{nome}-960.webp", quality=84, method=6)
            print(nome, (PASTA_PAGINAS / f"{nome}.webp").stat().st_size // 1024, "KB,",
                  (PASTA_PAGINAS / f"{nome}-960.webp").stat().st_size // 1024, "KB (960)")
        PERIODO = None
        return
    PASTA.mkdir(parents=True, exist_ok=True)
    img = montar()
    img.save(PASTA / "secao-biblioteca.webp", quality=82, method=6)
    img.resize((960, 320), Image.LANCZOS).save(PASTA / "secao-biblioteca-960.webp", quality=80, method=6)
    for nome in ("secao-biblioteca.webp", "secao-biblioteca-960.webp"):
        print(nome, (PASTA / nome).stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
