"""Cenário "HD-2D" do topo da página Minha conta: o quarto do residente no sótão da torre (30/10/2026).

Arte original feita por código: nada baixado nem gerado por IA, nenhum personagem de terceiros; cada pixel sai das
funções abaixo. É o quartinho do residente lá no alto de uma torre da vila, debaixo do telhado:
- teto em água-furtada (caibros, ripas e a viga do beiral), parede de reboco caiado com pedras aparecendo onde o
  reboco caiu, lambri de tábuas embaixo e assoalho em perspectiva;
- à esquerda, mais calma e escura (o texto da página vai por cima): a cama simples encaixada sob o telhado, com
  colcha de retalhos, travesseiro, livro esquecido e chinelos, e o pôster do esqueleto de anatomia na parede;
- o cabideiro com o jaleco branco (bolsos, botões, caneta) e o estetoscópio pendurado, e a mochila encostada;
- no centro, a janela grande em arco com caixilhos, postigos de madeira abertos e o peitoril com vaso e despertador;
  por ela se vê a vila lá embaixo e o céu da hora (manhã, pôr do sol ou noite de lua). Uma radiografia de mão está
  presa com fita no vidro, contra a luz. A luz entra em feixe volumétrico com poeira e desenha no chão a mancha com a
  sombra dos caixilhos;
- o quadro com três mini-pinturas (sol, pôr do sol e lua), onde a pessoa escolhe a "Aparência" do site; a plaquinha
  da pintura da hora acende;
- à direita: a escrivaninha com a vela no castiçal, a pilha de anotações, o crânio de estudo, o martelo de reflexo,
  o tinteiro e o quadro de cortiça com o cronograma; a estante com os livros grossos de ortopedia, um gesso e um fêmur;
- a lamparina pendurada na viga, o tapete trançado oval no meio do chão (onde o mascote fica em pé, x 330–380).

Montagem em 3x com luz calculada por pixel (como no HD-2D): profundidade por camada, sol/luar entrando pela janela,
vela e lamparina com luz quente (acesas à tarde/noite), contraluz, bloom, mapeamento de tom, correção de cor,
lado esquerdo mais calmo, vinheta e grão. As três horas usam a mesma composição; muda só a luz.

Saída: public/pixel/paginas/quarto-{manha,tarde,noite}.webp (1440 x 480) e quarto-{...}-960.webp (960 x 320).
Uso: python3 scripts/gerar_cena_quarto.py [manha] [tarde] [noite]   (sem argumentos, gera as três)
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "paginas"
W, H, ESC = 480, 160, 3
CHAO = 118                       # onde a parede encontra o assoalho
FUGA = (290, 40)                 # ponto de fuga do assoalho
JX, JY, JR, JBASE = 252, 36, 26, 96   # janela: centro do arco, meia largura do vidro, base do vidro
VELA = (441, 93)                 # chama da vela na escrivaninha
LANTERNA = (306, 31)             # chama da lamparina pendurada


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

    def ret(self, x0, y0, w, h, cor, a: float = 1.0) -> None:
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
        xa, xb, ya, yb = max(0, int(x0)), min(W, int(x0 + w)), max(0, int(y0)), min(H, int(y0 + h))
        if xa < xb and ya < yb:
            self.c[ya:yb, xa:xb, :3] *= k


# ─────────────────────────────── Paletas ───────────────────────────────
PINHO = ("#b88a56", "#94683e", "#6e4a2a", "#4a3018", "#2a1a0c")      # luz → sombra (madeira do telhado e móveis)
NOGUEIRA = ("#a8723e", "#7e5030", "#5a3820", "#3c2412", "#24150a")
REBOCO = ("#d8ccb4", "#c4b69c", "#a89a80", "#8a7c64", "#6a5e4a")
PEDRA = ("#a49c94", "#847c76", "#645c58", "#443e3c")
LATAO = ("#fff0b0", "#e8c060", "#b88a34", "#7a5620", "#4a3010")
FERRO = ("#8a8a90", "#5a5a62", "#3a3a42", "#1e1e24")
OURO = "#e8c25a"
OSSO = ("#f0e6cc", "#d8c8a4", "#b0a07c", "#7a6c50")
LIVROS = ["#8e2a2a", "#a8402e", "#6e1e24", "#2f5e3a", "#3e6e4a", "#24483a", "#2a4470", "#34587e", "#1e3050",
          "#7a4a2a", "#5a3820", "#b88a3a", "#c8b48a", "#5a2e4e", "#2a6a6a", "#2a2420", "#b0602a", "#4a5a2a"]

PERIODOS = ("manha", "tarde", "noite")


def inclinacao(x: float) -> float:
    """Altura (y) da água-furtada: acima desta linha é o telhado visto por baixo."""
    return 74 - x * 0.5


def na_janela(x: float, y: float, margem: float = 0) -> bool:
    if y > JBASE + margem:
        return False
    if y >= JY:
        return JX - JR - margem <= x < JX + JR + margem
    return math.hypot(x + 0.5 - JX, y + 0.5 - JY) <= JR + margem


# ─────────────────────────────── Parede, telhado e lambri ───────────────────────────────
def paredes() -> Camada:
    c = Camada(0.0)
    g = np.random.default_rng(3)
    rn = ruido(11, 3)
    rn2 = ruido(12, 9)
    # Reboco caiado: pinceladas horizontais de cal, manchas de umidade grandes e grão fino, quantizado em tons.
    gg = np.random.default_rng(13)
    pinc = np.asarray(Image.fromarray((gg.random((H // 2 + 2, W // 14 + 2)) * 255).astype(np.uint8))
                      .resize((W + 28, H + 4), Image.BILINEAR), dtype=np.float32)[:H, :W] / 255
    grao = gg.random((H, W)).astype(np.float32)
    umid = ruido(15, 26)
    for y in range(0, CHAO):
        for x in range(W):
            v = 0.5 + (pinc[y, x] - 0.5) * 0.55 + (rn2[y, x] - 0.5) * 0.5 + (grao[y, x] - 0.5) * 0.22
            k = 0 if v > 0.78 else 1 if v > 0.5 else 2 if v > 0.26 else 3
            cor = cor_de(REBOCO[k])
            if 0.5 < v < 0.56 and (x + y) % 2 == 0:
                cor = mistura(REBOCO[1], REBOCO[2], 0.5)
            mu = max(0.0, umid[y, x] - 0.62) * 2.2 + max(0.0, (16 - y) / 16) * 0.25
            cor = cor * (1 - min(0.3, mu)) + hexa("#7a6a4a") * min(0.3, mu)
            c.c[y, x, :3] = cor
            c.c[y, x, 3] = 1
    # Pedras aparecendo onde o reboco caiu: fiadas irregulares, cada pedra com luz em cima e sombra embaixo.
    for (cx, cy, rx, ry, sem) in ((60, 92, 22, 8, 1), (304, 90, 14, 7, 2), (160, 32, 13, 7, 3), (432, 44, 11, 6, 4),
                                  (376, 78, 9, 5, 5), (124, 50, 9, 5, 6)):
        gg = np.random.default_rng(40 + sem)
        borda = ruido(50 + sem, 2, 64, 32)
        cortes = {}
        for fila in range(-6, 8):
            xs_, x = [], cx - rx - 12 + int(gg.integers(0, 6))
            while x < cx + rx + 12:
                xs_.append(x)
                x += 6 + int(gg.integers(0, 6))
            cortes[fila] = xs_
        tons = gg.random((20, 40))
        for y in range(cy - ry - 2, cy + ry + 3):
            for x in range(cx - rx - 3, cx + rx + 4):
                if not (0 <= x < W and 0 <= y < H):
                    continue
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (borda[(y - cy) % 32, (x - cx) % 64] - 0.5) * 0.9
                if d < 1:
                    fila = (y - cy + 40) // 5 - 8
                    yy = (y - cy + 40) % 5
                    xs_ = cortes.get(fila, [cx])
                    junta = yy == 0 or x in xs_
                    if junta:
                        c.c[y, x, :3] = hexa("#4a4038")
                    else:
                        idx = sum(1 for q in xs_ if q < x)
                        t_ = tons[(fila + 10) % 20, idx % 40]
                        base = mistura("#9a9086", "#a89478", t_) * (0.86 + t_ * 0.18)
                        if yy == 1:
                            base = base * 1.16
                        elif yy == 4:
                            base = base * 0.72
                        if x - 1 in xs_:
                            base = base * 1.08
                        c.c[y, x, :3] = np.clip(base, 0, 1)
                elif d < 1.5:
                    # Borda do reboco: espessura clara em cima/esquerda, sombra embaixo/direita.
                    lado = (y - cy) / ry + (x - cx) / rx * 0.3
                    c.c[y, x, :3] = cor_de(REBOCO[0]) if lado < 0 and d < 1.25 else cor_de(REBOCO[3]) if d < 1.25 else c.c[y, x, :3]
    # Rachaduras finas.
    for (x0, y0, passos, sem) in ((196, 60, 16, 1), (420, 30, 12, 2), (34, 84, 10, 3), (360, 100, 9, 4)):
        gg = np.random.default_rng(70 + sem)
        x, y = x0, y0
        for _ in range(passos):
            c.p(x, y, REBOCO[4])
            x += int(gg.integers(-1, 2))
            y += 1
    # Água-furtada: o telhado visto por baixo (ripas na diagonal, caibros grossos, viga do beiral).
    for y in range(0, 75):
        for x in range(0, 150):
            ys = inclinacao(x)
            if y < ys:
                u = (x * 0.5 + y)            # distância ao longo da queda do telhado
                ripa = int(u / 4)
                k = 3 if (u % 4) < 0.9 else 2 if ripa % 3 else 1
                if (y - ys) > -1.5:
                    k = 4
                c.c[y, x, :3] = cor_de(PINHO[k]) * (0.85 + 0.15 * rn[y, (x + ripa * 7) % W])
                c.c[y, x, 3] = 1
    for x0 in (22, 66, 110):                 # caibros descendo a água (perpendiculares às ripas)
        for j in range(-3, 0):
            pass
        for y in range(0, 75):
            xc = x0 + y * 0.1 - 6
            for dx in range(5):
                x = int(xc + dx)
                if 0 <= x < 150 and y < inclinacao(x) - 1:
                    c.c[y, x, :3] = cor_de(PINHO[(1, 0, 1, 2, 3)[dx]])
    for x in range(0, 152):                  # viga do beiral, grossa, acompanhando a linha da água
        ys = inclinacao(x)
        for dy, k in ((-1, 0), (0, 1), (1, 2), (2, 2), (3, 3), (4, 4)):
            y = int(round(ys + dy))
            if 0 <= y < H:
                c.c[y, x, :3] = cor_de(NOGUEIRA[k])
        if x % 26 == 8:                      # cavilhas
            y = int(round(ys + 1))
            c.p(x, y, NOGUEIRA[0])
    # Linha da cumeeira e a linha (tirante) de madeira no alto.
    c.ret(0, 0, W, 3, PINHO[3])
    c.ret(0, 3, W, 1, PINHO[1])
    c.ret(0, 4, W, 1, PINHO[4])
    for x in range(0, W, 2):
        c.p(x, 1, PINHO[2] if (x // 2) % 3 else PINHO[4])
    # Esteio de madeira (pilar) entre a cama e a janela, e outro no canto direito, com mãos-francesas.
    for (px, larg) in ((198, 6), (446, 5)):
        for i in range(larg):
            k = (2, 1, 0, 1, 2, 3)[i] if larg == 6 else (2, 0, 1, 2, 3)[i]
            c.ret(px + i, 4, 1, CHAO - 4, PINHO[k])
        for y in range(8, CHAO, 11):
            c.p(px + 1 + (y % 3), y, PINHO[3])
        for j in range(10):                  # mão-francesa
            c.ret(px - 1 - j, 5 + j, 2, 1, PINHO[1] if j % 2 else PINHO[2])
            c.ret(px + larg - 1 + j, 5 + j, 2, 1, PINHO[2])
        c.ret(px - 1, 4, larg + 2, 1, PINHO[0])
    # Lambri: tábuas verticais com o rodameio, e o rodapé.
    for x in range(W):
        tab = x // 7
        k = 1 if x % 7 == 0 else 3 if x % 7 == 6 else 2
        tint = 0.92 + ((tab * 37) % 7) * 0.025
        for y in range(99, CHAO):
            c.c[y, x, :3] = cor_de(PINHO[k]) * tint * (0.94 + 0.08 * rn[y, (x * 5) % W])
        c.c[99, x, :3] = cor_de(PINHO[0])
        c.c[100, x, :3] = cor_de(PINHO[1])
        c.c[101, x, :3] = cor_de(PINHO[4])
        if x % 7 == 3 and (tab % 4) == 1:
            c.c[110, x, :3] = cor_de(PINHO[4])   # nó da madeira
        c.c[CHAO - 2, x, :3] = cor_de(PINHO[3])
        c.c[CHAO - 1, x, :3] = cor_de(PINHO[4])
    # Pôster do esqueleto de anatomia (calmo, à esquerda) e a prateleirinha sobre a cama.
    px0, py0 = 70, 48
    c.ret(px0, py0, 24, 36, "#d8ccaa")
    c.ret(px0, py0, 24, 1, "#efe4c4")
    c.ret(px0 + 23, py0, 1, 36, "#a89a78")
    c.ret(px0, py0 + 35, 24, 1, "#a89a78")
    for (dx, dy) in ((1, 1), (22, 1), (1, 34), (22, 34)):
        c.p(px0 + dx, py0 + dy, "#a03028")
    c.ret(px0 + 3, py0 + 2, 18, 2, "#7a2a20")             # título
    sx = px0 + 12
    esq = "#5a4a38"
    c.elipse(sx, py0 + 8, 2.2, 2.4, esq)                  # crânio
    c.p(sx - 1, py0 + 8, "#d8ccaa")
    c.p(sx + 1, py0 + 8, "#d8ccaa")
    c.ret(sx, py0 + 11, 1, 12, esq)                       # coluna
    for k in range(4):                                     # costelas
        c.ret(sx - 3, py0 + 13 + k * 2, 7, 1, esq, 0.75)
    c.linha(sx - 4, py0 + 12, sx - 6, py0 + 21, esq)      # braços
    c.linha(sx + 4, py0 + 12, sx + 6, py0 + 21, esq)
    c.ret(sx - 3, py0 + 22, 7, 2, esq)                    # pelve
    c.linha(sx - 2, py0 + 24, sx - 3, py0 + 32, esq)      # pernas
    c.linha(sx + 2, py0 + 24, sx + 3, py0 + 32, esq)
    c.ret(sx - 5, py0 + 33, 3, 1, esq)
    c.ret(sx + 3, py0 + 33, 3, 1, esq)
    for k in range(3):
        c.ret(px0 + 2, py0 + 14 + k * 4, 3, 1, "#8a7a5a", 0.7)
        c.ret(px0 + 19, py0 + 16 + k * 4, 3, 1, "#8a7a5a", 0.7)
    # Prateleirinha com livros, um pote e uma vela apagada.
    c.ret(106, 72, 36, 2, PINHO[1])
    c.ret(106, 72, 36, 1, PINHO[0])
    c.ret(106, 74, 36, 1, PINHO[4])
    for bx in (110, 136):
        c.linha(bx, 75, bx + 3, 79, FERRO[1])
    x = 108
    for (w_, h_, cor) in ((3, 10, "#2a4470"), (4, 12, "#8e2a2a"), (3, 9, "#2f5e3a"), (3, 11, "#7a4a2a"), (4, 10, "#5a2e4e")):
        c.ret(x, 72 - h_, w_, h_, cor)
        c.ret(x, 72 - h_, 1, h_, tom(cor, 1.3))
        c.ret(x, 72 - h_ + 2, w_, 1, tom(OURO, 0.8))
        x += w_
    c.linha(x + 1, 71, x + 6, 63, "#6a3a2a")
    c.linha(x + 2, 71, x + 7, 63, "#8a4a32")
    c.ret(130, 66, 5, 6, "#5a8a7a", 0.75)
    c.ret(130, 65, 5, 1, LATAO[2])
    c.ret(137, 66, 2, 6, "#ece2c8")
    c.ret(136, 71, 4, 1, LATAO[2])
    # Quadro de cortiça sobre a escrivaninha, com o cronograma e bilhetes presos por alfinetes.
    qx, qy = 398, 52
    c.ret(qx, qy, 40, 28, NOGUEIRA[2])
    c.ret(qx, qy, 40, 1, NOGUEIRA[0])
    c.ret(qx + 1, qy + 1, 38, 26, "#a8784a")
    cort = ruido(77, 1, 40, 28)
    for yy in range(26):
        for xx in range(38):
            if cort[yy, xx] > 0.62:
                c.p(qx + 1 + xx, qy + 1 + yy, "#8a5e36")
            elif cort[yy, xx] < 0.3:
                c.p(qx + 1 + xx, qy + 1 + yy, "#b88a58")
    c.ret(qx + 3, qy + 3, 18, 21, "#efe8d6")             # cronograma: grade com dias riscados
    c.ret(qx + 3, qy + 3, 18, 2, "#2a4470")
    for yy in range(qy + 7, qy + 23, 3):
        c.ret(qx + 4, yy, 16, 1, "#c8c0b0")
        for xx in range(qx + 4, qx + 20, 3):
            c.p(xx, yy - 1, "#c8c0b0")
    for (xx, yy) in ((5, 8), (8, 8), (11, 8), (14, 8), (17, 8), (5, 11), (8, 11), (11, 11)):
        c.p(qx + xx, qy + yy, "#3a8a4a")
        c.p(qx + xx + 1, qy + yy - 1, "#3a8a4a")
    c.p(qx + 12, qy + 3, "#d83a3a")
    c.ret(qx + 23, qy + 4, 12, 9, "#f0d870")             # bilhete amarelo
    for yy in (qy + 6, qy + 8, qy + 10):
        c.ret(qx + 24, yy, 9, 1, "#8a7a3a", 0.8)
    c.p(qx + 29, qy + 4, "#3a6ad0")
    c.ret(qx + 24, qy + 15, 13, 10, "#e8e0f0")           # bilhete com um desenho de osso (fêmur)
    c.linha(qx + 26, qy + 23, qx + 34, qy + 17, "#8a7a6a")
    c.elipse(qx + 34.5, qy + 17, 1.2, 1.2, "#8a7a6a")
    c.ret(qx + 25, qy + 22, 2, 2, "#8a7a6a")
    c.p(qx + 30, qy + 15, "#d83a3a")
    return c


# ─────────────────────────────── Céu e janela ───────────────────────────────
def gradiente(paradas, t: float) -> np.ndarray:
    for (t0, c0), (t1, c1) in zip(paradas, paradas[1:]):
        if t <= t1:
            return mistura(c0, c1, (t - t0) / max(t1 - t0, 1e-6))
    return cor_de(paradas[-1][1])


def ceu(per: str) -> np.ndarray:
    """O que se vê pela janela, por hora: céu, nuvens, sol/lua/estrelas, serras ao longe e os telhados da vila."""
    e = np.zeros((H, W, 3), dtype=np.float32)
    g = np.random.default_rng(21)
    nuv = ruido(5, 7) * 0.6 + ruido(6, 3) * 0.4
    if per == "manha":
        paradas = [(0, "#3466c0"), (0.45, "#6e9ee0"), (0.8, "#b8d4ec"), (1, "#f0ead8")]
        astro, r_astro, cor_astro, halo_astro = (236, 22), 4.2, "#fffcec", "#ffe8b0"
    elif per == "tarde":
        paradas = [(0, "#2e2462"), (0.32, "#8a3e6a"), (0.62, "#e8704a"), (0.85, "#ffb060"), (1, "#ffd890")]
        astro, r_astro, cor_astro, halo_astro = (238, 74), 5.5, "#fff0b0", "#ff9040"
    else:
        paradas = [(0, "#040820"), (0.55, "#0e1a44"), (1, "#24346a")]
        astro, r_astro, cor_astro, halo_astro = (266, 24), 4.6, "#f4f6ff", "#8aa0e0"
    x0, x1 = JX - JR - 1, JX + JR + 1
    for y in range(0, JBASE + 1):
        t = y / JBASE
        base = gradiente(paradas, t)
        for x in range(x0, x1):
            v = base.copy()
            n = nuv[y, x] - 0.52 - abs(y - 46) / 110
            if n > 0:
                m = min(1, n * 6)
                if per == "manha":
                    cn = mistura("#ffffff", "#c8d4ec", min(1, max(0, (y - 30) / 30)))
                elif per == "tarde":
                    cn = mistura("#ffc890", "#b04a6a", min(1, max(0, (40 - y) / 30))) if y < 60 else hexa("#ffd8a0")
                else:
                    cn = hexa("#2a3a6a")
                v = v * (1 - m * 0.75) + cn * m * 0.75
            d = math.hypot(x - astro[0], y - astro[1])
            v = v + hexa(halo_astro) * math.exp(-d / (12 if per != "tarde" else 16)) * (0.55 if per != "noite" else 0.4)
            e[y, x] = v
    if per == "noite":
        for _ in range(55):
            x, y = x0 + int(g.random() * (x1 - x0)), int(g.random() * 72)
            e[y, x] += 0.3 + g.random() * 0.6
    # Sol ou lua (a lua é crescente; o sol da tarde é grande e achatado no horizonte).
    ax, ay = astro
    for y in range(int(ay - 8), int(ay + 9)):
        for x in range(int(ax - 8), int(ax + 9)):
            d = math.hypot((x + 0.5 - ax), (y + 0.5 - ay) * (1.15 if per == "tarde" else 1))
            if d < r_astro:
                if per == "noite":
                    if math.hypot(x + 0.5 - ax - 2.2, y + 0.5 - ay + 1.2) < r_astro * 0.85:
                        continue
                    e[y, x] = hexa(cor_astro)
                else:
                    e[y, x] = hexa(cor_astro) * (1.3 if per == "manha" else 1.15)
    # Serra ao longe.
    serra = {"manha": "#8ea8cc", "tarde": "#9a5a7a", "noite": "#18224a"}[per]
    morro = {"manha": "#5e8a6a", "tarde": "#6a4050", "noite": "#121a3a"}[per]
    for x in range(x0, x1):
        hs = 74 - int(5 * math.sin(x / 9.0) + 3 * math.sin(x / 3.7 + 1))
        for y in range(hs, JBASE + 1):
            e[y, x] = mistura(serra, morro, min(1, (y - hs) / 10)) if y < 80 else hexa(morro)
        if per == "tarde" and hs <= 74:
            e[hs, x] = mistura(serra, "#ffb070", 0.6)
    # A torre do relógio da vila, ao fundo (as fileiras da frente cobrem o pé dela).
    tcor = {"manha": ("#c8ccd4", "#9aa0ae", "#6a5aa0"), "tarde": ("#f0a88a", "#a86a62", "#7a3a4a"),
            "noite": ("#2a3054", "#1c2040", "#141830")}[per]
    tx = 270
    for y in range(60, 92):
        for xx in range(tx - 2, tx + 3):
            e[y, xx] = hexa(tcor[0] if xx <= tx else tcor[1])
    for y in range(53, 60):
        w_ = (y - 53) // 2
        for xx in range(tx - w_, tx + w_ + 1):
            e[y, xx] = hexa(tcor[2])
    e[52, tx] = hexa(tcor[2])
    e[63, tx] = hexa("#ffe8a0") * (1.7 if per == "noite" else 1.0)
    e[63, tx - 1] = hexa("#ffe8a0") * (0.6 if per == "noite" else 0.5)
    # Telhados da vila lá embaixo (vista do alto da torre): fileiras de casinhas pequenas, as de trás na névoa.
    telha = {"manha": ("#a4584a", "#74402e"), "tarde": ("#d8764a", "#8a4430"), "noite": ("#262a4c", "#181c36")}[per]
    muro = {"manha": ("#d8d2c4", "#a8a49c"), "tarde": ("#f0b48a", "#b07a60"), "noite": ("#262c4a", "#1a1e38")}[per]
    nevoa = {"manha": "#b8cce0", "tarde": "#e89a7a", "noite": "#1a2448"}[per]
    filas = ((82, 3, 0.55), (86, 3, 0.4), (90, 4, 0.25), (94, 4, 0.12), (99, 5, 0.0))
    for fila, (yb, alt, nev) in enumerate(filas):
        x = x0 - int(g.random() * 6)
        while x < x1:
            larg = 4 + int(g.random() * 4) + fila // 2
            meio = x + larg / 2
            for xx in range(x, x + larg):
                if not (x0 <= xx < x1):
                    continue
                topo = yb - alt + int(abs(xx + 0.5 - meio) * alt / (larg / 2) * 0.8)
                for y in range(topo, min(JBASE + 1, yb + 3)):
                    if y < yb:
                        cor = hexa(telha[0] if xx < meio else telha[1])
                        if (y - topo) % 2 == 1 and per != "noite":
                            cor = cor * 0.88
                    else:
                        cor = hexa(muro[0] if xx < meio else muro[1])
                    e[y, xx] = cor * (1 - nev) + hexa(nevoa) * nev
            if g.random() < 0.4 and x0 <= x + 1 < x1 and yb - alt - 1 >= 0:        # chaminé
                e[yb - alt - 1, x + 1] = hexa(muro[1]) * (1 - nev) + hexa(nevoa) * nev
                e[yb - alt, x + 1] = hexa(muro[1]) * (1 - nev) + hexa(nevoa) * nev
            wx, wy = x + 1 + int(g.random() * max(1, larg - 2)), yb + 1
            if x0 <= wx < x1 and wy <= JBASE:
                e[wy, wx] = hexa("#ffc860") * (1.5 - nev) if per == "noite" else hexa("#4a4a5a") * (1 - nev) + hexa(nevoa) * nev
            x += larg + (1 if g.random() < 0.3 else 0)
    return e


def janela(c: Camada, per: str) -> tuple[np.ndarray, np.ndarray]:
    """Vidro (emissivo), caixilhos, derrame de pedra, peitoril e a radiografia presa no vidro.
    Devolve (emissivo HxWx3, transmissão da luz HxW)."""
    vista = ceu(per)
    emis = np.zeros((H, W, 3), dtype=np.float32)
    trans = np.zeros((H, W), dtype=np.float32)
    g = np.random.default_rng(9)
    # Derrame (vão) de pedra em volta, com aduelas no arco.
    for y in range(0, JBASE + 4):
        for x in range(JX - JR - 7, JX + JR + 7):
            if na_janela(x, y, 6) and not na_janela(x, y, 0):
                d_in = next((m for m in range(1, 7) if na_janela(x, y, m)), 6)
                k = 0 if d_in <= 1 else 1 if d_in <= 3 else 2
                if y < JY:
                    ang = math.atan2(y + 0.5 - JY, x + 0.5 - JX)
                    if int((ang + math.pi) / (math.pi / 9)) % 2 == 0 and k > 0:
                        k = min(3, k + 1)
                    if abs(((ang + math.pi) / (math.pi / 9)) % 1) < 0.12:
                        k = 3
                elif (y // 7) % 2 == 0 and d_in > 3:
                    k = 2
                elif y % 7 == 0 and d_in > 2:
                    k = 3
                c.p(x, y, PEDRA[k])
    # Caixilho de madeira e vidro.
    madeira_j = ("#e8d8b8", "#b89a70", "#7a5e40", "#4a3824")
    for y in range(0, JBASE + 1):
        for x in range(JX - JR - 1, JX + JR + 1):
            if not na_janela(x, y):
                continue
            borda = not na_janela(x, y, -2)
            r_ = math.hypot(x + 0.5 - JX, y + 0.5 - JY)
            vert = x in (JX - 1, JX, JX + 1) or (y >= JY and x in (JX - 14, JX + 13))
            horiz = y in (63, 64, 65) or y in (49, 80) or y == JY
            raio = y < JY and (13.6 <= r_ < 14.7 or (r_ >= 14.7 and abs(abs(x + 0.5 - JX) - abs(y + 0.5 - JY)) < 0.75))
            if borda:
                c.p(x, y, madeira_j[1] if (x < JX) else madeira_j[2])
                continue
            if vert or horiz or raio:
                lado = madeira_j[0] if (x in (JX - 1, JX - 14) or y in (63, 49, 80)) else madeira_j[2] if (x in (JX + 1,) or y == 65) else madeira_j[1]
                c.p(x, y, lado)
                continue
            vidro = vista[y, x] * (0.94 + 0.08 * g.random())
            # Reflexo leve em diagonal (vidro antigo, levemente ondulado).
            if ((x + y * 0.6) % 19) < 1.4:
                vidro = vidro * 1.1 + 0.04
            emis[y, x] = vidro
            trans[y, x] = 0.4 + 1.0 * float(vista[y, x].mean())
    # Radiografia de mão presa com fita no vidro, contra a luz (ossos claros sobre o filme escuro).
    rx0, ry0 = 254, 66
    desenho = [".....#.....",
               "...#.#.#...",
               "...#.#.#.#.",
               "...+.+.+.#.",
               "...#.#.#.+.",
               "...#.#.#.#.",
               "...#.#.#.#.",
               ".#.#.#.#.#.",
               ".#.#.#.#.#.",
               "..#+.+.+.+.",
               "...#####+..",
               "...+###+...",
               "....#.#....",
               "....#.#...."]
    rh, rw = len(desenho), len(desenho[0])
    for yy, linha_ in enumerate(desenho):
        for xx, ch in enumerate(linha_):
            x, y = rx0 + xx, ry0 + yy
            ossos = 1.0 if ch == "#" else 0.55 if ch == "+" else 0.0
            if trans[y, x] > 0:
                filme = vista[y, x].mean() * hexa("#6a86a8") * 0.28 + hexa("#0e1622") * 0.1
                emis[y, x] = filme + hexa("#dceaff") * ossos * (0.85 if per != "noite" else 0.32)
                trans[y, x] *= 0.25 + ossos * 0.5
            else:
                c.p(x, y, "#2a3440")
    for (dx, dy) in ((0, 0), (rw - 2, 0), (0, rh - 1), (rw - 2, rh - 1)):
        c.p(rx0 + dx, ry0 + dy, "#e8dca8", 0.9)
        c.p(rx0 + dx + 1, ry0 + dy, "#e8dca8", 0.9)
        trans[ry0 + dy, rx0 + dx] = 0
        trans[ry0 + dy, rx0 + dx + 1] = 0
    # Peitoril de pedra com vaso de planta e um despertador de latão (ponteiros na hora da cena).
    c.ret(JX - JR - 8, JBASE + 1, JR * 2 + 16, 2, PEDRA[0])
    c.ret(JX - JR - 8, JBASE + 3, JR * 2 + 16, 1, PEDRA[2])
    c.ret(JX - JR - 7, JBASE + 4, JR * 2 + 14, 1, PEDRA[3])
    vx = 232
    c.ret(vx - 3, 91, 7, 6, "#a8583a")
    c.ret(vx - 4, 90, 9, 2, "#c06a46")
    c.ret(vx - 3, 91, 1, 6, "#c87a56")
    c.ret(vx + 3, 92, 1, 5, "#7a3a26")
    for (dx, dy, cor) in ((0, -2, "#3a7a3a"), (-2, -4, "#4a8a3a"), (2, -5, "#2e6a32"), (-1, -7, "#5a9a46"), (1, -9, "#3a7a3a"),
                          (-3, -6, "#2e6a32"), (3, -3, "#4a8a3a"), (0, -5, "#5aa04a"), (-2, -9, "#4a8a3a"), (2, -8, "#5a9a46")):
        c.ret(vx + dx, 90 + dy, 2, 2, cor)
    c.p(vx - 1, 80, "#e86a8a")
    c.p(vx + 2, 82, "#f4d060")
    rlx, rly = 272, 92
    c.elipse(rlx, rly, 3.2, 3.2, LATAO[2])
    c.elipse(rlx, rly, 2.3, 2.3, "#f4ecd8")
    c.p(rlx - 3, rly - 4, LATAO[1])
    c.p(rlx + 2, rly - 4, LATAO[1])
    c.ret(rlx - 3, rly - 4, 2, 1, LATAO[1])
    c.ret(rlx + 2, rly - 4, 2, 1, LATAO[1])
    c.p(rlx - 2, rly + 3, LATAO[3])
    c.p(rlx + 2, rly + 3, LATAO[3])
    hora = {"manha": 7, "tarde": 6, "noite": 11}[per]
    ang = hora / 12 * math.tau
    c.p(rlx, rly, "#1a1410")
    c.p(round(rlx + math.sin(ang) * 1.3), round(rly - math.cos(ang) * 1.3), "#1a1410")
    c.p(rlx, rly - 2, "#1a1410")
    return emis, trans


def postigos(c: Camada) -> None:
    """Postigos de madeira abertos contra a parede, dos dois lados da janela, com dobradiças de ferro."""
    c.z_atual = 0.04
    for (xa, larg, sombra) in ((209, 10, False), (286, 10, True)):
        for y in range(14, 98):
            for i in range(larg):
                tab = i // 3
                k = 1 if i % 3 == 0 else 3 if i % 3 == 2 else 2
                if (sombra and i == larg - 1) or (not sombra and i == 0):
                    k = 4
                c.p(xa + i, y, tom(PINHO[k], 0.95 + 0.05 * (tab % 2)))
        for y in (14, 55, 97):
            c.ret(xa, y, larg, 2, PINHO[1])
            c.ret(xa, y + 1, larg, 1, PINHO[3])
        c.linha(xa + 1, 54, xa + larg - 2, 17, PINHO[1])     # travessa em diagonal
        c.linha(xa + 1, 95, xa + larg - 2, 58, PINHO[1])
        for y in (22, 88):
            hx = xa + (larg - 1 if not sombra else 0)
            c.ret(min(hx, xa + larg - 4) if not sombra else hx, y, 4, 2, FERRO[2])
            c.p(hx, y, FERRO[0])
        # sombra do postigo na parede
        if not sombra:
            c.ret(xa - 2, 16, 2, 82, "#000000", 0.25)
        else:
            c.ret(xa + larg, 16, 3, 82, "#000000", 0.28)


def quadro(c: Camada, e: np.ndarray, per: str) -> tuple[int, int, int, int]:
    """Moldura dourada com três mini-pinturas (sol, pôr do sol, lua): é a "Aparência" do site.
    A plaquinha da pintura da hora atual brilha. Devolve o retângulo da moldura."""
    c.z_atual = 0.06
    x0, y0, lw, lh, gap, bd = 324, 22, 18, 22, 3, 4
    larg = bd * 2 + lw * 3 + gap * 2
    alt = bd * 2 + lh + 5
    ouro = ("#fff0b8", "#e8c060", "#c0903a", "#8a6024", "#4a3010")
    c.ret(x0 + 2, y0 + 2, larg, alt, "#000000", 0.35)     # sombra na parede
    c.ret(x0, y0, larg, alt, ouro[2])
    c.ret(x0, y0, larg, 1, ouro[0])
    c.ret(x0, y0 + 1, larg, 1, ouro[1])
    c.ret(x0, y0, 1, alt, ouro[1])
    c.ret(x0 + larg - 1, y0, 1, alt, ouro[3])
    c.ret(x0, y0 + alt - 1, larg, 1, ouro[4])
    c.ret(x0 + 1, y0 + alt - 2, larg - 2, 1, ouro[3])
    for x in range(x0 + 2, x0 + larg - 2, 3):               # friso de contas
        c.p(x, y0 + 2, ouro[0])
        c.p(x + 1, y0 + alt - 3, ouro[1])
    for (cx, cy) in ((x0, y0), (x0 + larg - 3, y0), (x0, y0 + alt - 3), (x0 + larg - 3, y0 + alt - 3)):
        c.ret(cx, cy, 3, 3, ouro[1])
        c.p(cx + 1, cy + 1, ouro[0])
    c.ret(x0 + larg // 2 - 3, y0 - 2, 7, 2, ouro[1])        # florão do alto
    c.p(x0 + larg // 2, y0 - 3, ouro[0])
    # Prego e cordão.
    c.linha(x0 + 8, y0, x0 + larg // 2, y0 - 7, "#6a5a3a")
    c.linha(x0 + larg - 9, y0, x0 + larg // 2, y0 - 7, "#6a5a3a")
    c.p(x0 + larg // 2, y0 - 8, FERRO[0])
    ativo = PERIODOS.index(per)
    for i in range(3):
        px = x0 + bd + i * (lw + gap)
        py = y0 + bd
        # Divisória dourada entre as telas.
        if i:
            c.ret(px - gap, py, gap, lh, ouro[2])
            c.ret(px - gap + 1, py, 1, lh, ouro[0])
        c.ret(px - 1, py - 1, lw + 2, 1, ouro[4])
        c.ret(px - 1, py, 1, lh, ouro[4])
        for yy in range(lh):
            for xx in range(lw):
                t = yy / lh
                if i == 0:      # manhã: céu azul, sol, nuvem, morro verde e uma casinha
                    cor = mistura("#4a86d0", "#bcdcf0", t)
                    if math.hypot(xx - 12.5, yy - 6.5) < 3.2:
                        cor = hexa("#ffe060") if math.hypot(xx - 12, yy - 6) > 1.4 else hexa("#fff8c0")
                    elif math.hypot(xx - 12.5, yy - 6.5) < 4.6 and (xx + yy) % 2 == 0:
                        cor = hexa("#ffe890")
                    if 2 <= xx <= 8 and yy in (4, 5) and not (xx in (2, 8) and yy == 4):
                        cor = hexa("#ffffff")
                    if yy > 14 - 2 * math.sin(xx / 5.0):
                        cor = hexa("#5aa04a") if yy < 17 else hexa("#3e8040")
                    if 4 <= xx <= 6 and 13 <= yy <= 15:
                        cor = hexa("#f0e8d8") if yy > 13 else hexa("#c0503a")
                elif i == 1:    # pôr do sol: faixas quentes, sol metade no mar
                    cor = gradiente([(0, "#4a2a6a"), (0.35, "#c04a5a"), (0.6, "#f8904a"), (0.7, "#ffd070"), (1, "#2a3a6a")], t)
                    d_ = math.hypot(xx - 8.5, (yy - 15) * 1.1)
                    if d_ < 4.5 and yy < 15:
                        cor = hexa("#fff0a0") if d_ < 2.5 else hexa("#ffc050")
                    if yy >= 15:
                        cor = mistura("#3a3a6a", "#1e2a4a", (yy - 15) / 7)
                        if abs(xx - 8.5) < 4.5 - (yy - 15) * 0.5 and yy % 2 == 0:
                            cor = hexa("#ffb050")
                    if yy in (5, 9) and 1 <= xx <= 15 and (xx + yy) % 5 < 3:
                        cor = hexa("#ff9a7a")
                else:           # lua: noite azul, crescente, estrelas, pinheiros
                    cor = mistura("#0a1230", "#24346a", t)
                    d_ = math.hypot(xx - 10.5, yy - 7)
                    if d_ < 3.6 and math.hypot(xx - 12.2, yy - 6) >= 3.0:
                        cor = hexa("#f4f2dc")
                    if (xx * 7 + yy * 13) % 23 == 0 and yy < 12:
                        cor = hexa("#e8ecff")
                    if yy > 15 + abs((xx % 6) - 3) * -1 + (2 if xx % 6 in (2, 3) else 0) * -1:
                        cor = hexa("#0e1a20")
                    if yy > 19:
                        cor = hexa("#0a1418")
                # Pinceladas: leve variação.
                cor = np.clip(cor_de(cor) * (0.93 + 0.1 * (((xx * 5 + yy * 3 + i * 7) % 7) / 6)), 0, 1)
                c.p(px + xx, py + yy, cor)
        # Plaquinha embaixo de cada tela; a da hora atual acende.
        pqx, pqy = px + lw // 2 - 3, y0 + bd + lh + 1
        if i == ativo:
            c.ret(pqx, pqy, 7, 3, "#fff4c8")
            c.ret(pqx + 1, pqy + 1, 5, 1, "#e8a030")
            for xx in range(pqx, pqx + 7):
                for yy in range(pqy, pqy + 3):
                    e[yy, xx] += hexa("#ffd890") * (0.55 if per != "manha" else 0.35)
        else:
            c.ret(pqx, pqy, 7, 3, ouro[3])
            c.ret(pqx + 1, pqy + 1, 5, 1, ouro[4])
    return x0, y0, larg, alt


# ─────────────────────────────── Objetos do meio ───────────────────────────────
def lamparina(c: Camada, e: np.ndarray, acesa: float) -> None:
    """Lamparina de ferro e vidro pendurada da linha por uma corrente."""
    c.z_atual = 0.35
    lx, ly = LANTERNA
    for y in range(5, ly - 8):
        c.p(lx, y, FERRO[1] if y % 2 else FERRO[0])
        if y % 2 == 0:
            c.p(lx + 1, y, FERRO[2])
    c.ret(lx - 2, ly - 9, 5, 1, FERRO[1])
    c.poligono([(lx - 4, ly - 5), (lx + 4, ly - 5), (lx + 1, ly - 9), (lx - 1, ly - 9)], FERRO[2])
    c.linha(lx - 4, ly - 5, lx - 1, ly - 9, FERRO[0])
    c.ret(lx - 5, ly - 5, 11, 1, FERRO[1])
    c.ret(lx - 5, ly + 7, 11, 2, FERRO[2])
    c.ret(lx - 5, ly + 7, 11, 1, FERRO[1])
    c.ret(lx - 2, ly + 9, 5, 1, FERRO[3])
    for (x, cor) in ((lx - 5, FERRO[1]), (lx + 5, FERRO[3]), (lx, FERRO[2])):
        c.ret(x, ly - 4, 1, 11, cor)
    for y in range(ly - 4, ly + 7):
        for x in (lx - 4, lx - 3, lx - 2, lx - 1, lx + 1, lx + 2, lx + 3, lx + 4):
            if acesa > 0:
                d = math.hypot(x - lx, (y - ly) * 0.8)
                e[y, x] += hexa("#ffcc80") * (0.5 / (1 + d * 0.5)) * acesa
                c.p(x, y, "#d8b890", 0.25)
            else:
                c.p(x, y, "#5a6a7a", 0.55)
                if x == lx - 3 and y < ly + 2:
                    c.p(x, y, "#b8c8d8", 0.7)
    c.ret(lx - 1, ly + 3, 3, 3, "#e8e0c8")               # pavio/vela dentro
    if acesa > 0:
        for (dx, dy, cor, k) in ((0, 0, "#ffffff", 1.5), (0, 1, "#fff0b0", 1.3), (0, -1, "#ffd070", 1.0), (0, 2, "#ffc060", 0.9),
                                 (-1, 1, "#ff9a30", 0.6), (1, 1, "#ff9a30", 0.5), (0, -2, "#ff8a20", 0.5)):
            e[ly + dy, lx + dx] += hexa(cor) * k * acesa


def cama(c: Camada) -> None:
    """Cama simples de madeira sob o telhado: cabeceira de tábuas, colchão, travesseiro, colcha de retalhos que cai pela
    frente, um livro aberto em cima, um caixote embaixo e os chinelos no chão."""
    c.z_atual = 0.5
    # Cabeceira e pés de trás.
    for (x, h_) in ((12, 50), (19, 50)):
        c.ret(x, 140 - h_, 4, h_, NOGUEIRA[2])
        c.ret(x, 140 - h_, 1, h_, NOGUEIRA[1])
        c.ret(x - 1, 140 - h_ - 2, 6, 2, NOGUEIRA[1])
        c.ret(x - 1, 140 - h_ - 2, 6, 1, NOGUEIRA[0])
    for y in range(94, 110, 4):
        c.ret(16, y, 3, 3, NOGUEIRA[3])
        c.ret(16, y, 3, 1, NOGUEIRA[1])
    c.ret(148, 106, 4, 34, NOGUEIRA[2])                  # pé da cama
    c.ret(148, 106, 1, 34, NOGUEIRA[1])
    c.ret(147, 104, 6, 2, NOGUEIRA[1])
    # Estrado (lateral).
    c.ret(22, 120, 128, 6, NOGUEIRA[2])
    c.ret(22, 120, 128, 1, NOGUEIRA[1])
    c.ret(22, 125, 128, 1, NOGUEIRA[4])
    for x in range(26, 146, 15):
        c.p(x, 122, NOGUEIRA[3])
    for x in (22, 144):
        c.ret(x, 126, 4, 16, NOGUEIRA[3])
        c.ret(x, 126, 1, 16, NOGUEIRA[2])
    # Caixote embaixo da cama (com uma ponta de pano).
    c.ret(54, 128, 34, 12, "#3a2414")
    c.ret(54, 128, 34, 1, "#5a3820")
    c.ret(60, 131, 22, 1, "#2a180c")
    c.ret(84, 130, 6, 3, "#8a2a2a")
    # Colchão.
    c.ret(22, 108, 126, 12, "#e4dcc8")
    c.ret(22, 108, 126, 1, "#f4ecd8")
    for x in range(24, 146, 6):
        c.p(x, 113, "#c8bca4")
    # Travesseiro.
    c.elipse(34, 104, 12, 5, "#f0eadc")
    c.elipse(33, 103, 9, 3, "#fffaf0")
    c.ret(24, 108, 22, 1, "#c8bca8")
    c.p(44, 103, "#d8d0c0")
    # Colcha de retalhos: cobre do travesseiro até o pé e cai pela frente com uma barra.
    retalhos = ["#9a3a34", "#d8c49a", "#2e4670", "#5e7e5a", "#b8744a", "#e4d8bc", "#3e5e7a", "#a8884a"]
    g = np.random.default_rng(14)
    grade = g.integers(0, len(retalhos), size=(10, 30))
    for y in range(106, 134):
        topo = 106 + (2 if (y < 108) else 0)
        for x in range(46, 148):
            dobra = 1.4 * math.sin((x - 46) / 7.0)
            if y < 106 + dobra * 0.4 + (0.5 if x < 50 else 0):
                continue
            ybaixo = 130 + 2 * math.sin(x / 5.0) + (1 if x % 11 == 0 else 0)
            if y > ybaixo:
                continue
            u, v = (x - 46) // 9, (y - 106) // 6
            cor = cor_de(retalhos[grade[v % 10, u % 30]])
            # Pontinhos de costura nas emendas e o padrão dentro de cada retalho.
            emenda = (x - 46) % 9 == 0 or (y - 106) % 6 == 0
            if emenda:
                cor = cor * 0.72
                if (x + y) % 2 == 0:
                    cor = hexa("#f0e4c8") * 0.85
            elif grade[v % 10, u % 30] % 3 == 0 and (x + y) % 3 == 0:
                cor = cor * 1.18
            elif grade[v % 10, u % 30] % 3 == 1 and (x - 46) % 9 == 4 and (y - 106) % 6 == 3:
                cor = hexa("#f4ecd8")
            # Volume: a parte de cima (sobre o colchão) é clara; a que cai pela frente, mais escura; dobras.
            k = 1.08 if y < 119 else 0.78
            k *= 0.9 + 0.12 * (math.cos((x - 46) / 7.0 + y * 0.05) * 0.5 + 0.5)
            if y == 119 or y == 120:
                k *= 0.85
            c.p(x, y, np.clip(cor * k, 0, 1))
        # Barra da colcha.
    for x in range(46, 148):
        yb = int(130 + 2 * math.sin(x / 5.0) + (1 if x % 11 == 0 else 0))
        c.p(x, yb, "#5a1e1e")
        c.p(x, yb + 1, "#3a1010", 0.7)
    c.linha(46, 107, 46, 130, "#8a2a2a")                   # borda dobrada junto ao travesseiro
    c.linha(47, 107, 47, 129, "#c85a4a")
    # Livro aberto na colcha (um atlas) e um lápis.
    c.poligono([(96, 108), (104, 105), (112, 108), (104, 110)], "#f0e6c8")
    c.linha(104, 105, 104, 110, "#a89870")
    c.ret(97, 110, 15, 1, "#2a4470")
    for x in range(98, 103):
        c.p(x, 107, "#5a4a3a", 0.6)
    c.linha(106, 107, 110, 108, "#8a6a4a", 0.7)
    c.linha(116, 110, 124, 108, "#e8b040")
    c.p(124, 108, "#3a2a1a")
    # Chinelos no chão.
    for (sx, sy) in ((118, 145), (128, 147)):
        c.elipse(sx, sy, 5, 1.8, "#6a3a5a")
        c.elipse(sx + 1, sy - 0.5, 3, 1, "#8a4a7a")
        c.ret(sx - 2, sy - 1, 4, 1, "#c8a8b8")


def cabideiro(c: Camada) -> None:
    """Cabideiro de madeira com o jaleco branco (lapelas, bolsos, botões, caneta) e o estetoscópio pendurado no
    gancho; a mochila de lona encostada no pé."""
    c.z_atual = 0.55
    px = 178
    # Tripé.
    c.linha(px, 132, px - 12, 143, PINHO[2])
    c.linha(px + 1, 132, px + 12, 143, PINHO[3])
    c.linha(px, 132, px + 3, 140, PINHO[3])
    for (x, y) in ((px - 12, 143), (px + 12, 143), (px + 3, 140)):
        c.ret(x - 1, y, 3, 1, PINHO[4])
    # Haste torneada.
    for y in range(30, 134):
        c.p(px - 1, y, PINHO[1])
        c.p(px, y, PINHO[2])
        c.p(px + 1, y, PINHO[3])
    for y in (30, 31, 70, 71, 120):
        c.ret(px - 2, y, 5, 1, PINHO[0] if y % 2 == 0 else PINHO[2])
    c.elipse(px, 28, 2, 2, PINHO[0])
    c.p(px - 1, 27, "#e8c898")
    # Ganchos.
    for (dx, dy) in ((-6, 36), (6, 36), (-5, 44), (5, 44)):
        c.linha(px, dy - 4, px + dx, dy, FERRO[1])
        c.p(px + dx, dy - 1, FERRO[0])
    # Jaleco: ombros no gancho, corpo largo descendo, mangas penduradas, lapela, bolsos e botões.
    branco = ("#eeeeec", "#dcdee2", "#c0c4cc", "#959ba8", "#666c7a")
    for y in range(40, 112):
        t = (y - 40) / 72
        meia = 6 + min(1, (y - 40) / 8) * 7 + t * 2.5
        xl, xr = px - meia, px + meia
        for x in range(int(xl), int(xr) + 1):
            u = (x - xl) / max(1, xr - xl)
            k = 1 if u < 0.15 else 0 if u < 0.42 else 1 if u < 0.62 else 2 if u < 0.85 else 3
            # Pregas verticais.
            if (x - px) % 5 == 2 and y > 70:
                k = min(4, k + 1)
            c.p(x, y, branco[k])
        if y == 111:
            c.ret(int(xl), y, int(xr - xl) + 1, 1, branco[3])
    for y in range(42, 98):                               # mangas (penduradas dos lados)
        for (x0, larg, lado) in ((px - 15, 4, 0), (px + 12, 4, 1)):
            off = int((y - 42) * 0.05) * (-1 if lado == 0 else 1)
            for i in range(larg):
                k = 1 if i == 0 else 2 if i < larg - 1 else 3
                if lado == 1:
                    k = 2 if i == 0 else 3 if i < larg - 1 else 4
                c.p(x0 + off + i, y, branco[k])
        if y == 97:
            for (x0, lado) in ((px - 15, 0), (px + 12, 1)):
                off = int((y - 42) * 0.05) * (-1 if lado == 0 else 1)
                c.ret(x0 + off, 96, 4, 2, branco[3])
    # Gola e lapelas (abertura em V até o primeiro botão).
    for j in range(16):
        c.p(px - 1 - j // 3, 42 + j, branco[3])
        c.p(px + 1 + j // 3, 42 + j, branco[4])
        c.p(px - j // 3, 42 + j, "#c8ccd4")
        c.p(px + j // 3, 42 + j, "#c8ccd4")
    c.ret(px - 6, 40, 13, 2, branco[1])
    c.ret(px - 6, 41, 13, 1, branco[3])
    c.ret(px, 58, 1, 52, branco[3])                       # abotoamento
    for y in range(62, 108, 9):
        c.p(px + 1, y, "#b8bcc8")
        c.p(px + 1, y + 1, branco[4])
    for (bx, by) in ((px - 10, 84), (px + 3, 84)):        # bolsos
        c.ret(bx, by, 8, 1, branco[4])
        c.ret(bx, by + 1, 8, 7, branco[2])
        c.ret(bx, by + 1, 1, 7, branco[3])
    c.ret(px - 9, 62, 6, 1, branco[4])                    # bolso do peito com caneta
    c.ret(px - 7, 59, 1, 4, "#2a4a9a")
    c.p(px - 7, 59, "#e8e8f0")
    c.ret(px - 5, 60, 1, 3, "#c83a3a")
    # Crachá preso no bolso do peito.
    c.ret(px + 3, 63, 6, 8, "#f8f8ff")
    c.ret(px + 3, 63, 6, 2, "#2a6a8a")
    c.ret(px + 4, 67, 4, 1, "#8a9098")
    c.ret(px + 4, 69, 3, 1, "#8a9098")
    # Estetoscópio: olivas no gancho, tubos descendo, o Y e a campânula prateada.
    est = ("#3a3a44", "#22222a", "#5a5a6a")
    c.p(px - 5, 34, FERRO[0])
    c.p(px + 5, 34, FERRO[0])
    c.linha(px - 5, 35, px - 7, 46, est[2])
    c.linha(px + 5, 35, px + 6, 46, est[2])
    for y in range(46, 74):
        c.p(px - 7 - (1 if 52 < y < 66 else 0), y, est[0])
        c.p(px + 6 + (1 if 52 < y < 66 else 0), y, est[1])
    c.linha(px - 7, 74, px - 1, 80, est[0])
    c.linha(px + 6, 74, px, 80, est[1])
    c.linha(px - 1, 80, px - 2, 90, est[0])
    c.ret(px - 3, 76, 3, 1, FERRO[0])
    c.elipse(px - 3, 92, 2.6, 2.4, "#c8ccd8")
    c.elipse(px - 3.5, 91.5, 1.3, 1.1, "#ffffff")
    c.p(px - 1, 93, "#6a6e7a")
    # Mochila de lona encostada no pé do cabideiro.
    mx, my = 188, 118
    lona = ("#a0703e", "#7e5430", "#5e3c20", "#3c2614")
    c.ret(mx, my + 2, 18, 22, lona[1])
    c.ret(mx, my + 2, 2, 22, lona[0])
    c.ret(mx + 15, my + 2, 3, 22, lona[2])
    c.elipse(mx + 9, my + 3, 9, 3, lona[1])
    c.elipse(mx + 8, my + 2, 6, 1.5, lona[0])
    c.ret(mx + 1, my + 2, 16, 10, lona[2])                # aba
    c.ret(mx + 1, my + 2, 16, 1, lona[0])
    c.ret(mx + 1, my + 11, 16, 1, lona[3])
    for bx in (mx + 4, mx + 12):                          # correias com fivela
        c.ret(bx, my + 6, 2, 10, "#5a3018")
        c.ret(bx - 1, my + 14, 4, 2, LATAO[2])
        c.p(bx, my + 14, LATAO[0])
    c.ret(mx + 3, my + 16, 12, 6, lona[1])                # bolso da frente
    c.ret(mx + 3, my + 16, 12, 1, lona[0])
    c.ret(mx + 3, my + 21, 12, 1, lona[3])
    c.ret(mx, my + 23, 18, 1, lona[3])
    c.linha(mx + 9, my, mx + 9, my - 3, "#5a3018")        # alça de mão
    c.linha(mx + 5, my, mx + 9, my - 3, "#5a3018")
    c.linha(mx + 13, my, mx + 9, my - 3, "#5a3018")
    # Rolo de atadura e um livro saindo da mochila.
    c.ret(mx + 13, my - 1, 4, 4, "#f4f0e8")
    c.p(mx + 14, my, "#c8c4bc")
    c.ret(mx + 2, my - 2, 8, 3, "#8e2a2a")
    c.ret(mx + 2, my - 2, 8, 1, "#b84a3a")
    c.ret(mx + 9, my - 2, 1, 3, "#e8dcb8")


def estante(c: Camada) -> None:
    """Estante alta encostada à direita: livros grossos de ortopedia (lombadas largas com faixas e etiquetas), um gesso
    de perna, um fêmur de estudo, um pote e caixas de lâminas."""
    c.z_atual = 0.4
    x0, x1, yt, yb = 452, 480, 10, 146
    g = np.random.default_rng(31)
    c.ret(x0, yt, x1 - x0, yb - yt, NOGUEIRA[4])
    c.ret(x0, yt, 4, yb - yt, NOGUEIRA[1])
    c.ret(x0, yt, 1, yb - yt, NOGUEIRA[0])
    c.ret(x0 + 3, yt, 1, yb - yt, NOGUEIRA[3])
    c.ret(x0 - 1, yt - 2, x1 - x0 + 1, 3, NOGUEIRA[1])
    c.ret(x0 - 1, yt - 2, x1 - x0 + 1, 1, NOGUEIRA[0])
    prateleiras = [(14, 36), (39, 62), (65, 88), (91, 116), (119, 144)]
    for idx, (pt, pb) in enumerate(prateleiras):
        c.ret(x0 + 4, pt, x1 - x0 - 4, pb - pt, NOGUEIRA[4])
        x = x0 + 5
        if idx == 0:   # gesso de perna (bota) em pé e um fêmur de estudo deitado
            gx = x + 13
            for yy in range(pt + 4, pb - 4):
                c.ret(gx, yy, 6, 1, "#ece6da")
                c.p(gx, yy, "#ffffff")
                c.p(gx + 5, yy, "#c8c0b0")
                if yy % 3 == 0:
                    c.ret(gx + 1, yy, 4, 1, "#dcd4c4")
            c.ret(gx - 1, pt + 3, 8, 2, "#f4f0e8")              # borda acolchoada
            c.ret(gx - 1, pt + 4, 8, 1, "#d8d0c0")
            c.ret(gx - 4, pb - 5, 11, 5, "#ece6da")              # pé
            c.ret(gx - 4, pb - 5, 11, 1, "#ffffff")
            c.ret(gx - 4, pb - 1, 11, 1, "#b8b0a0")
            c.ret(gx - 5, pb - 4, 1, 3, "#f0d8c0")               # dedinhos de fora
            c.ret(gx + 1, pt + 9, 3, 1, "#3a6ad0", 0.7)          # assinaturas
            c.ret(gx + 2, pt + 13, 3, 1, "#d83a3a", 0.7)
            c.linha(x, pb - 2, x + 9, pb - 4, OSSO[1])          # fêmur
            c.linha(x, pb - 1, x + 9, pb - 3, OSSO[2])
            c.elipse(x + 9.5, pb - 4.5, 1.4, 1.4, OSSO[0])
            c.ret(x - 1, pb - 2, 2, 2, OSSO[1])
            continue
        if idx == 3:   # pote com vértebras e uma caixa de lâminas
            c.ret(x, pb - 10, 7, 10, "#6a9a8a", 0.65)
            c.ret(x, pb - 11, 7, 1, LATAO[2])
            for yy in (pb - 8, pb - 5, pb - 2):
                c.ret(x + 2, yy, 3, 2, OSSO[1])
            c.p(x, pb - 9, "#e0f0e8")
            x += 8
        while x < x1:
            w_ = int(g.choice([4, 5, 5, 6, 6, 7]))
            alt = (pb - pt) - int(g.random() * 4) - 1
            cor = cor_de(LIVROS[int(g.integers(0, len(LIVROS)))]) * (0.85 + g.random() * 0.25)
            topo = pb - alt
            for j in range(w_):
                k = 1.3 if j == 0 else 0.6 if j == w_ - 1 else 1.0
                c.ret(x + j, topo, 1, alt, np.clip(cor * k, 0, 1))
            c.ret(x + 1, topo + 2, w_ - 2, 1, tom(OURO, 0.9))
            c.ret(x + 1, topo + 4, w_ - 2, 1, tom(OURO, 0.7))
            c.ret(x + 1, pb - 4, w_ - 2, 1, tom(OURO, 0.85))
            if g.random() < 0.6:
                c.ret(x + 1, topo + 7, w_ - 2, 3, "#e8dcb8" if g.random() < 0.5 else "#1a1410")
            x += w_
        c.escurecer(x0 + 4, pt, x1 - x0 - 4, 1, 0.45)
        c.escurecer(x0 + 4, pt + 1, x1 - x0 - 4, 1, 0.7)
        c.ret(x0 + 4, pb, x1 - x0 - 4, 1, NOGUEIRA[0])
        c.ret(x0 + 4, pb + 1, x1 - x0 - 4, 2, NOGUEIRA[2])
    c.ret(x0, yb, x1 - x0, 2, NOGUEIRA[3])


def escrivaninha(c: Camada, e: np.ndarray, vela_acesa: float) -> None:
    """Escrivaninha com gavetas, castiçal com vela, pilha de anotações, crânio de estudo, livro aberto, tinteiro e pena,
    martelo de reflexo e o banquinho embaixo."""
    c.z_atual = 0.65
    tx0, tx1, ty = 388, 452, 106
    # Pés de trás e tampo em perspectiva.
    for x in (392, 446):
        c.ret(x, 114, 3, 24, NOGUEIRA[3])
    c.poligono([(tx0 + 4, ty - 4), (tx1 - 2, ty - 4), (tx1 + 2, ty + 2), (tx0, ty + 2)], NOGUEIRA[1])
    c.linha(tx0 + 4, ty - 4, tx1 - 2, ty - 4, NOGUEIRA[2])
    g = np.random.default_rng(55)
    for _ in range(60):
        c.p(tx0 + 2 + int(g.random() * 60), ty - 3 + int(g.random() * 5), NOGUEIRA[0], 0.4)
    c.ret(tx0 - 1, ty + 2, tx1 - tx0 + 4, 2, NOGUEIRA[0])
    c.ret(tx0 - 1, ty + 4, tx1 - tx0 + 4, 1, NOGUEIRA[3])
    # Saia com gaveta e puxador; gaveteiro à direita.
    c.ret(tx0, ty + 5, tx1 - tx0 + 2, 6, NOGUEIRA[2])
    c.ret(tx0 + 4, ty + 6, 28, 4, NOGUEIRA[1])
    c.ret(tx0 + 4, ty + 6, 28, 1, NOGUEIRA[0])
    c.ret(tx0 + 17, ty + 8, 3, 1, LATAO[1])
    c.ret(tx1 - 20, ty + 5, 22, 34, NOGUEIRA[2])
    c.ret(tx1 - 20, ty + 5, 1, 34, NOGUEIRA[1])
    for k in range(3):
        gy = ty + 7 + k * 11
        c.ret(tx1 - 18, gy, 18, 9, NOGUEIRA[1])
        c.ret(tx1 - 18, gy, 18, 1, NOGUEIRA[0])
        c.ret(tx1 - 18, gy + 8, 18, 1, NOGUEIRA[3])
        c.ret(tx1 - 10, gy + 4, 3, 1, LATAO[1])
        c.p(tx1 - 9, gy + 4, LATAO[0])
    c.ret(tx1 - 20, ty + 39, 22, 1, NOGUEIRA[4])
    # Perna da frente esquerda, torneada.
    for j, lw in enumerate([4, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3]):
        y = ty + 11 + j
        c.ret(tx0 + 1, y, lw, 1, NOGUEIRA[2])
        c.p(tx0 + 1, y, NOGUEIRA[0])
        c.p(tx0 + lw, y, NOGUEIRA[4])
    # Banquinho meio enfiado embaixo.
    c.ret(408, 124, 18, 3, PINHO[1])
    c.ret(408, 124, 18, 1, PINHO[0])
    for x in (410, 422):
        c.ret(x, 127, 2, 14, PINHO[2])
    c.ret(411, 135, 12, 1, PINHO[3])
    # Pilha de anotações e cadernos (folhas soltas, um pouco desalinhadas, com post-its).
    y = ty - 1
    for (dx, larg, esp, cor) in ((0, 20, 2, "#2a4470"), (1, 19, 1, "#efe8d6"), (-1, 20, 1, "#e4dcc4"), (2, 18, 2, "#8e2a2a"),
                                 (0, 19, 1, "#f4eedc"), (1, 18, 1, "#e8e0cc"), (-1, 19, 1, "#f0e8d4"), (0, 18, 2, "#3e6e4a"),
                                 (2, 17, 1, "#f4eedc"), (0, 18, 1, "#ece4d0")):
        x = 396 + dx
        c.ret(x, y - esp + 1, larg, esp, cor)
        if esp == 1:
            c.p(x + larg - 1, y, tom(cor, 0.8))
        else:
            c.ret(x, y - esp + 1, larg, 1, tom(cor, 1.25))
            c.ret(x + larg - 2, y - esp + 1, 2, esp, "#e8dcb8")
        y -= esp
    c.ret(398, y + 1, 5, 2, "#f0d870")                    # post-its
    c.ret(410, y + 3, 4, 2, "#f08aa0")
    c.ret(397, y, 18, 1, "#f8f4e8")
    for xx in range(398, 413, 2):
        c.p(xx, y, "#9a9aa8", 0.6)
    # Crânio de estudo (com a mandíbula articulada) ao lado da pilha.
    kx, ky = 424, 96
    c.elipse(kx, ky, 5.2, 4.8, OSSO[1])
    c.elipse(kx - 1, ky - 1, 4, 3.6, OSSO[0])
    c.p(kx - 3, ky - 3, "#fffaf0")
    c.ret(kx - 3, ky + 3, 7, 3, OSSO[1])
    c.ret(kx - 4, ky, 3, 3, "#2a1a10")                    # órbitas
    c.ret(kx + 1, ky, 3, 3, "#2a1a10")
    c.p(kx - 4, ky, OSSO[2])
    c.p(kx + 3, ky + 2, OSSO[2])
    c.ret(kx - 1, ky + 3, 2, 2, "#3a2414")                # abertura nasal
    c.ret(kx - 3, ky + 6, 7, 1, OSSO[2])                  # dentes
    for xx in range(kx - 3, kx + 4, 2):
        c.p(xx, ky + 6, OSSO[0])
    c.ret(kx - 3, ky + 7, 7, 2, OSSO[1])                  # mandíbula
    c.ret(kx - 2, ky + 9, 5, 1, OSSO[2])
    c.linha(kx + 1, ky - 4, kx + 3, ky - 2, OSSO[2])      # sutura
    c.p(kx + 5, ky + 1, OSSO[3])
    # Livro aberto e o martelo de reflexo (Taylor: cabeça triangular de borracha vermelha) na frente.
    c.poligono([(404, 106), (412, 104), (420, 106), (412, 107)], "#f0e6c8")
    c.linha(412, 104, 412, 107, "#a89870")
    c.ret(405, 107, 15, 1, "#6a2a1a")
    c.linha(426, 107, 436, 105, "#c8ccd4")
    c.linha(426, 108, 436, 106, "#8a8e98")
    c.poligono([(434, 102), (440, 104), (436, 108)], "#c8382e")
    c.p(435, 103, "#e86050")
    # Tinteiro e pena.
    c.ret(447, 99, 4, 4, "#1a2030")
    c.ret(448, 98, 2, 1, "#3a4050")
    c.p(447, 99, "#5a6a8a")
    c.linha(449, 98, 454, 87, "#e8e4dc")
    c.linha(450, 97, 455, 88, "#b8b4ac")
    # Castiçal de latão com a vela (pingos de cera escorrendo).
    vx, vy = VELA
    c.elipse(vx, 103, 4.5, 1.3, LATAO[2])
    c.ret(vx - 4, 102, 9, 1, LATAO[1])
    c.ret(vx - 1, 99, 3, 3, LATAO[2])
    c.p(vx - 1, 99, LATAO[0])
    c.ret(vx - 2, 98, 5, 1, LATAO[1])
    c.linha(vx + 4, 102, vx + 6, 99, LATAO[2])            # alça
    c.p(vx + 6, 98, LATAO[1])
    c.ret(vx - 1, vy + 2, 3, 98 - vy - 2, "#f0e6cc")
    c.ret(vx - 1, vy + 2, 1, 98 - vy - 2, "#fff8e8")
    c.ret(vx + 1, vy + 2, 1, 98 - vy - 2, "#c8b890")
    c.p(vx - 1, vy + 5, "#fff8e8")
    c.p(vx + 1, vy + 4, "#e8dcc0")
    c.p(vx + 2, vy + 5, "#e8dcc0")
    c.p(vx, vy + 1, "#2a1a10")                            # pavio
    if vela_acesa > 0:
        for (dx, dy, cor, k) in ((0, 0, "#ffffff", 1.5), (0, -1, "#fff4c0", 1.3), (0, -2, "#ffd070", 1.0), (0, -3, "#ff9a30", 0.6),
                                 (-1, 0, "#ffb040", 0.6), (1, 0, "#ffb040", 0.5), (0, 1, "#80a0ff", 0.45), (-1, -1, "#ff9030", 0.3)):
            e[vy + dy, vx + dx] += hexa(cor) * k * vela_acesa


def sombras_de_contato(c: Camada) -> None:
    c.z_atual = 0.5
    for (cx, cy, rx, ry, a) in ((84, 142, 72, 4, 0.7), (84, 141, 56, 3, 0.4), (178, 143, 14, 2, 0.6), (197, 142, 12, 2, 0.7),
                                 (420, 140, 38, 3.5, 0.65), (466, 147, 18, 2.5, 0.6), (124, 147, 12, 1.6, 0.5)):
        for k in range(4):
            c.elipse(cx, cy, rx * (1 - k * 0.18), ry * (1 - k * 0.18), "#05040a", a * 0.3)


# ─────────────────────────────── Assoalho e tapete trançado ───────────────────────────────
def chao_e_tapete() -> Camada:
    c = Camada(0.0)
    fx, fy = FUGA
    g = np.random.default_rng(17)
    veio = ruido(19, 2, 400, 200)
    tabuas = ["#7a5230", "#86603a", "#6e4828", "#805836", "#744c2e"]
    desloc = g.random(200) * 30
    K = 74
    for y in range(CHAO, H):
        d = y - fy
        c.z[y, :] = (y - CHAO) / (H - CHAO)
        for x in range(W):
            X = (x + 0.5 - fx) * K / d
            Zw = K * K / d
            b = int(math.floor(X / 8)) + 100
            costura = int(math.floor((x - 0.5 - fx) * K / d / 8)) + 100 != b
            emenda = int((Zw + desloc[b % 200]) / 24) != int((K * K / (d - 1) + desloc[b % 200]) / 24)
            base = hexa(tabuas[(b * 7) % 5])
            v = veio[int((Zw * 6) % 200), int((X * 1.7) % 400)]
            k = 0.84 + v * 0.3
            if costura or emenda:
                k = 0.45
            elif emenda is False and ((int(Zw * 3) + b) % 37 == 0) and (x % 3 == 0):
                k = 0.6                                         # prego
            c.c[y, x, :3] = np.clip(base * k, 0, 1)
            c.c[y, x, 3] = 1
    for x in range(W):
        c.c[CHAO, x, :3] *= 0.5
        c.c[CHAO + 1, x, :3] *= 0.72
    # Tapete trançado oval (anéis de trança em cores alternadas), em perspectiva, no meio do quarto.
    Xc, Zc, RX, RZ = 30.0, 55.0, 74.0, 9.6
    aneis = ["#6e2626", "#b0925e", "#2e4258", "#c4b48e", "#7a2e2a", "#56664a", "#b0925e", "#34485e", "#c4b48e", "#6a3440",
             "#b0925e", "#2e4258", "#7a2a2a"]
    for y in range(CHAO + 2, H):
        d = y - fy
        Zw = K * K / d
        for x in range(W):
            X = (x + 0.5 - fx) * K / d
            r = math.hypot((X - Xc) / RX, (Zw - Zc) / RZ)
            if r > 1.0:
                continue
            anel = int((1 - r) * 12.5)
            cor = hexa(aneis[min(anel, len(aneis) - 1)])
            ang = math.atan2((Zw - Zc) / RZ, (X - Xc) / RX)
            # Textura de trança: "espigas" alternadas ao longo do anel.
            fase = (ang * (40 + anel * 3) + anel * 1.7) % 2
            frac = ((1 - r) * 12.5) % 1
            k = 1.12 if fase < 1 else 0.84
            if frac < 0.18 or frac > 0.86:
                k *= 0.72
            if r > 0.965:
                k *= 0.6
            c.c[y, x, :3] = np.clip(cor * k * (0.94 + g.random() * 0.1), 0, 1)
    return c


# ─────────────────────────────── Primeiro plano ───────────────────────────────
def primeiro_plano() -> Camada:
    """Perto da câmera (vai desfocado): a quina de um baú no canto de baixo à esquerda e uma hera pendendo à direita."""
    c = Camada(1.0)
    for y in range(138, H):
        for x in range(0, 54 - (y - 138) // 3):
            k = 2 if (x // 9) % 2 else 1
            if y in (138, 139):
                k = 0
            if y % 8 == 3:
                k = 3
            c.p(x, y, NOGUEIRA[k])
    for x in range(0, 50, 12):
        c.ret(x, 138, 3, 22, FERRO[2])
    c.ret(22, 146, 6, 5, LATAO[2])
    g = np.random.default_rng(81)
    for ramo in range(6):
        x = 452 + ramo * 5 + int(g.random() * 4)
        comp = 12 + int(g.random() * 18)
        for j in range(comp):
            xx = x + int(2 * math.sin(j / 3.0 + ramo))
            c.p(xx, j, "#2a4a26")
            if j % 3 == 0:
                c.ret(xx - 1, j, 3, 2, "#3a6a32" if j % 2 else "#2e5a2a")
    return c


# ─────────────────────────────── Montagem com luz ───────────────────────────────
def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
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


YS, XS = (m / ESC for m in np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32))


def luz3d(cx, cy, cz, raio, z, prof: float = 80.0, achatar: float = 1.0) -> np.ndarray:
    d2 = ((XS - cx) ** 2 + ((YS - cy) / achatar) ** 2 + ((z - cz) * prof) ** 2) / raio ** 2
    return np.exp(-d2 * 2.2) * 0.7 + 0.3 / (1 + d2 * 6)


def contraluz(alfa: np.ndarray, dx: int, dy: int) -> np.ndarray:
    viz = np.roll(np.roll(alfa, -dy, 0), -dx, 1)
    return ((alfa > 0.5) & (viz < 0.5)).astype(np.float32)


# Luz de cada hora: ambiente, luz da janela, cor do feixe e da mancha, desvio do feixe, vela e lamparina.
LUZ = {
    "manha": dict(amb=("#7a88b0", 0.72), janela=("#e8eeff", 0.95), sol="#fff0c8", mancha=1.9, feixe=0.75,
                  desvio=(64, 6), alvo=(158, 121), vela=0.0, lamp=0.0, poeira="#fff4d8",
                  quente="#ffe8c0", fria="#28304a", contraste=1.06, exposicao=1.0),
    "tarde": dict(amb=("#6a4058", 0.62), janela=("#ffa070", 0.95), sol="#ffa04a", mancha=2.1, feixe=1.0,
                  desvio=(112, 30), alvo=(152, 123), vela=0.7, lamp=0.0, poeira="#ffc880",
                  quente="#ffc890", fria="#3a2040", contraste=1.08, exposicao=1.0),
    "noite": dict(amb=("#1e2a58", 0.62), janela=("#5a78d0", 0.5), sol="#a8c0ff", mancha=1.0, feixe=0.6,
                  desvio=(-72, -6), alvo=(156, 121), vela=1.0, lamp=1.0, poeira="#c8d8ff",
                  quente="#ffd9a0", fria="#121a40", contraste=1.1, exposicao=1.0),
}


def feixes(trans: np.ndarray, opacos: np.ndarray, desvio, alvo) -> tuple[np.ndarray, np.ndarray]:
    """Projeta cada pedacinho de vidro até o chão: o caminho vira o feixe volumétrico e o fim vira a mancha de luz
    (com a sombra dos caixilhos e da radiografia)."""
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
    topo = JY - JR
    th = np.clip((wy - topo) / (JBASE - topo), 0, 1)
    y_perto, y_longe = alvo
    destino_y = y_perto - th * (y_perto - y_longe)
    escala = 1.0 + (1 - th) * 0.45
    destino_x = JX + (wx - JX) * escala + (1 - th) * desvio[0] + desvio[1]
    g = np.random.default_rng(93)
    faixas = np.repeat(g.random(64), 4)
    faixas = np.convolve(faixas, np.ones(3) / 3, mode="same")
    idx = np.clip(((wx - (JX - JR)) * 1.6 + (wy - topo) * 0.25).astype(int), 0, len(faixas) - 1)
    raio_peso = pw * (0.15 + 1.6 * faixas[idx] ** 2)
    passos = 90
    ruido_feixe = ampliar(ruido(91, 6)[:, :, None])[:, :, 0]
    for i in range(passos + 1):
        t = i / passos
        px = ((wx + (destino_x - wx) * t) * ESC).astype(np.int32)
        py = ((wy + (destino_y - wy) * t) * ESC).astype(np.int32)
        ok = (px >= 0) & (px < ww) & (py >= 0) & (py < hh)
        if i == passos:
            np.add.at(mancha, (py[ok], px[ok]), pw[ok])
        else:
            perto = min(1.0, max(0.0, (t - 0.05) / 0.3))
            np.add.at(feixe, (py[ok], px[ok]), raio_peso[ok] * perto * perto * (1 - 0.5 * t ** 3))
    feixe = desfocar(feixe[:, :, None], 3)[:, :, 0]
    feixe *= 0.6 + 0.8 * ruido_feixe
    feixe *= 1 - opacos
    mancha = desfocar(mancha[:, :, None], 1.6)[:, :, 0]
    mancha = mancha / max(np.percentile(mancha[mancha > 0], 90), 1e-6)
    return feixe / max(np.percentile(feixe, 99.7), 1e-6), np.clip(mancha, 0, 1.3)


def fumaca(x0: int, y0: int, comp: int, seed: float) -> np.ndarray:
    """Fiapo de fumaça (vela apagada de manhã), desenhado direto em 3x."""
    v = np.zeros((H * ESC, W * ESC), dtype=np.float32)
    for j in range(comp):
        y = y0 * ESC - j
        x = x0 * ESC + (2 + j * 0.1) * math.sin(j / 8.0 + seed) + j * 0.08
        a = (1 - j / comp) * min(1, j / 5) * 0.5
        for dx in (-1, 0, 1):
            xi = int(x) + dx
            if 0 <= xi < W * ESC and 0 <= y < H * ESC:
                v[y, xi] += a * (1 if dx == 0 else 0.4)
    return desfocar(v[:, :, None], 1.2)[:, :, 0]


def montar(per: str) -> Image.Image:
    L = LUZ[per]
    emis1 = np.zeros((H, W, 3), dtype=np.float32)
    parede = paredes()
    emis_jan, trans = janela(parede, per)
    emis1 += emis_jan
    postigos(parede)
    quadro(parede, emis1, per)
    meio = Camada(0.35)
    lamparina(meio, emis1, L["lamp"])
    estante(meio)
    chao = chao_e_tapete()
    sombras = Camada(0.5)
    sombras_de_contato(sombras)
    frente = Camada(0.6)
    cama(frente)
    cabideiro(frente)
    escrivaninha(frente, emis1, L["vela"])
    fg = primeiro_plano()

    alb = np.zeros((H, W, 3), dtype=np.float32)
    z = np.zeros((H, W), dtype=np.float32)
    eh_chao = np.zeros((H, W), dtype=np.float32)
    for cam, chao_ in ((parede, 0), (chao, 1), (meio, 0), (sombras, -1), (frente, 0)):
        a = cam.c[:, :, 3:4]
        alb = alb * (1 - a) + cam.c[:, :, :3] * a
        if chao_ >= 0:
            sel = cam.c[:, :, 3] > 0.5
            z[sel] = cam.z[sel]
            eh_chao[sel] = chao_
    # Vidro: onde a janela mostra o céu (as fitas da radiografia e os caixilhos ficam opacos).
    vidro = ((trans > 0) & (emis_jan.sum(2) > 0)).astype(np.float32)

    # Contraluz: janela (bordas voltadas para ela) e vela.
    ys1, xs1 = np.mgrid[0:H, 0:W]
    rim_jan = np.zeros((H, W), dtype=np.float32)
    rim_vela = np.zeros((H, W), dtype=np.float32)
    for cam in (meio, frente):
        al = cam.c[:, :, 3]
        for (fonte, alvo_) in (((JX, 60), rim_jan), (VELA, rim_vela)):
            ddx = np.sign(fonte[0] - xs1).astype(int)
            ddy = np.sign(fonte[1] - ys1).astype(int)
            for sx in (-1, 0, 1):
                for sy in (-1, 0, 1):
                    if sx == 0 and sy == 0:
                        continue
                    m = contraluz(al, sx, sy) * ((ddx == sx) & (ddy == sy))
                    np.maximum(alvo_, m, out=alvo_)

    alb3, z3, chao3 = ampliar(alb), ampliar(z[:, :, None])[:, :, 0], ampliar(eh_chao[:, :, None])[:, :, 0]
    z3 = desfocar(z3[:, :, None], 1.0)[:, :, 0]
    emis3 = ampliar(emis1)
    vidro3 = ampliar(vidro[:, :, None])[:, :, 0]
    zero = np.zeros_like(z3)

    # Luz: ambiente + luz difusa da janela + vela + lamparina.
    luz = np.zeros_like(alb3) + hexa(L["amb"][0]) * L["amb"][1]
    jan = luz3d(JX, 64, -0.1, 120, z3, achatar=1.3) * 0.75 + luz3d(JX + 30, 110, 0.4, 230, z3, achatar=0.8) * 0.45
    luz += jan[:, :, None] * hexa(L["janela"][0]) * L["janela"][1]
    # A lateral esquerda (cama, sob o telhado) fica na penumbra: menos luz da janela lá.
    penumbra = np.clip((XS - 40) / 160, 0.35, 1)[:, :, None]
    luz = luz * (0.55 + 0.45 * penumbra)
    vx, vy = VELA
    if L["vela"] > 0:
        vela = luz3d(vx, vy, 0.65, 150, z3, prof=110, achatar=0.85) + luz3d(vx, vy, 0.65, 40, z3, prof=60) * 0.8
        sob = ((XS > 386) & (XS < 454) & (YS > 112)).astype(np.float32)
        vela *= 1 - desfocar(sob[:, :, None], 4)[:, :, 0] * 0.7
        luz += vela[:, :, None] * hexa("#ffb46c") * 1.3 * L["vela"]
    if L["lamp"] > 0:
        lx, ly = LANTERNA
        lam = luz3d(lx, ly, 0.35, 170, z3, prof=90, achatar=0.9) + luz3d(lx, ly, 0.35, 36, z3, prof=60) * 0.6
        luz += lam[:, :, None] * hexa("#ffaa60") * 0.95 * L["lamp"]

    # Feixe e mancha da janela no chão.
    opacos = ampliar(((frente.c[:, :, 3] > 0.5)).astype(np.float32)[:, :, None])[:, :, 0]
    feixe, mancha = feixes(trans, opacos, L["desvio"], L["alvo"])
    luz += (mancha * chao3)[:, :, None] * hexa(L["sol"]) * L["mancha"]

    img = alb3 * luz
    rj = desfocar(ampliar(rim_jan[:, :, None]), 0.6)[:, :, 0] * np.clip(luz3d(JX, 60, 0.0, 200, zero) * 1.5, 0, 1)
    img += (rj * 0.4)[:, :, None] * hexa(L["janela"][0]) * L["janela"][1]
    if L["vela"] > 0:
        rv = desfocar(ampliar(rim_vela[:, :, None]), 0.6)[:, :, 0] * np.clip(luz3d(vx, vy, 0, 90, zero) * 1.6, 0, 1)
        img += (rv * 0.4 * L["vela"])[:, :, None] * hexa("#ffc880")
    img = img * (1 - vidro3[:, :, None]) + emis3 * vidro3[:, :, None]
    img += emis3 * (1 - vidro3[:, :, None])

    # Feixe volumétrico com poeira.
    img += feixe[:, :, None] * hexa(L["sol"]) * L["feixe"]
    g = np.random.default_rng(5)
    poeira = np.zeros(feixe.shape, dtype=np.float32)
    for _ in range(3200):
        x, y = int(g.random() * W * ESC), int(g.random() * H * ESC)
        if feixe[y, x] > 0.15 and g.random() < feixe[y, x]:
            poeira[y, x] = 0.4 + g.random() * 0.8
            if g.random() < 0.3 and x + 1 < W * ESC:
                poeira[y, x + 1] = poeira[y, x] * 0.5
    img += poeira[:, :, None] * hexa(L["poeira"]) * 0.5
    if L["vela"] > 0:
        poe2 = np.zeros(feixe.shape, dtype=np.float32)
        for _ in range(90):
            ang, r = g.random() * math.tau, g.random() ** 0.6 * 30
            x, y = int((vx + math.cos(ang) * r) * ESC), int((vy - 6 + math.sin(ang) * r * 0.7) * ESC)
            if 0 <= x < W * ESC and 0 <= y < H * ESC:
                poe2[y, x] = 0.3 + g.random() * 0.6
        img += poe2[:, :, None] * hexa("#ffd890") * 0.6 * L["vela"]
    else:
        img += fumaca(vx, vy, 40, 1.3)[:, :, None] * hexa("#d8d8e0") * 0.5

    # Halos das chamas.
    halo = np.zeros_like(z3)
    if L["vela"] > 0:
        halo += (luz3d(vx, vy - 1, 0, 24, zero) * 0.3 + luz3d(vx, vy, 0, 6, zero) * 0.7) * L["vela"]
    if L["lamp"] > 0:
        lx, ly = LANTERNA
        halo += (luz3d(lx, ly + 1, 0, 22, zero) * 0.3 + luz3d(lx, ly, 0, 7, zero) * 0.6) * L["lamp"]
    img += halo[:, :, None] * hexa("#ffb860")

    # Primeiro plano desfocado e escuro.
    fg3 = desfocar_rgba(ampliar(fg.c), 6)
    tfg = hexa(L["amb"][0]) * 0.45
    if L["vela"] > 0:
        tfg = tfg + luz3d(vx, vy, 1.0, 220, np.ones_like(z3))[:, :, None] * hexa("#ffa850") * 0.3 * L["vela"]
    fgc = fg3[:, :, :3] * tfg
    img = img * (1 - fg3[:, :, 3:4]) + fgc * fg3[:, :, 3:4]

    # Bloom.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.62) * 3, 0, 1), 0, 2)
    img += desfocar(claro, 14) * 0.5 + desfocar(claro, 4) * 0.35

    # Mapeamento de tons.
    img *= L["exposicao"]
    lum = img.mean(2, keepdims=True)
    comp = np.where(lum > 0.6, 0.6 + (lum - 0.6) / (1 + (lum - 0.6) * 1.6), lum) / np.maximum(lum, 1e-4)
    img = img * comp
    lum2 = img.mean(2, keepdims=True)
    img = img + (lum2 - img) * np.clip((lum2 - 0.7) * 0.8, 0, 0.35)

    # Correção de cor por hora: altas luzes quentes, sombras frias; contraste.
    quente, fria = hexa(L["quente"]), hexa(L["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * quente + (1 - lum) * (fria * 0.6 + 0.4)))
    img = np.clip((img - 0.45) * L["contraste"] + 0.45, 0, 1.4)

    # Lado esquerdo mais calmo.
    calma = np.clip((0.47 - XS / W) / 0.17, 0, 1)[:, :, None]
    media = img.mean(2, keepdims=True)
    suave = (media + (img - media) * 0.72) * 0.86 + hexa("#0c1228") * 0.05
    img = img * (1 - calma) + suave * calma

    # Vinheta e grão.
    v = ((XS / W - 0.6) ** 2 * 1.2 + (YS / H - 0.55) ** 2 * 1.6)
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.0)[:, :, None]
    g = np.random.default_rng(99)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.018
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    pedidos = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for per in pedidos:
        img = montar(per)
        grande, peq = PASTA / f"quarto-{per}.webp", PASTA / f"quarto-{per}-960.webp"
        img.save(grande, quality=84, method=6)
        img.resize((960, 320), Image.LANCZOS).save(peq, quality=84, method=6)
        for f in (grande, peq):
            print(f.name, f.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
