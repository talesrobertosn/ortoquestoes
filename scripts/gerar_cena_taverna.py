"""Cenário "HD-2D" do topo da página Flashcards: a taverna dos cartões (30/10/2026, pedido do Tales).

Arte original feita por código: nada baixado nem gerado por IA, nenhum personagem de terceiros; cada pixel sai das
funções abaixo. É o salão de uma taverna aconchegante, onde os cartões de memorização viram cartas de jogo:
- paredes de taipa caiada com enxaimel (vigas, esteios e mãos-francesas de madeira), lambri de tábuas embaixo e o
  teto de barrotes com a viga-mestra, de onde pendem réstias de alho, ramos de ervas secas e uma lanterna;
- o balcão à esquerda (calmo e escuro, o texto da página vai por cima): prateleiras de garrafas desenhadas uma a uma
  (vidro verde, âmbar e fumê, rolhas, rótulos, reflexo), canecas penduradas, barris deitados com torneira, canecas
  de cerveja com espuma em cima do balcão e banquetas;
- a janela de vidro em rodelas (fundo de garrafa) com as folhas abertas; por ela se vê a hora do dia (céu da manhã,
  poente com o sol baixo, ou noite de lua com as janelas da vila acesas) e entra o feixe de luz volumétrico com
  poeira, que desenha no assoalho a mancha da janela com a sombra dos caixilhos e as sombras da mesa e das cadeiras;
- a mesa redonda de jogo com cartas espalhadas (cartões de estudo: uns com o verso vermelho, outros virados mostrando
  o desenho de um osso), o baralho, canecas, um toco de vela e um dado; cadeiras e uma mesinha ao fundo;
- o quadro de avisos de cortiça com cartões pregados (fêmur, mão, crânio, coluna, recados) e tachinhas;
- o lustre de roda de carroça com velas e a lareira de pedra acesa, com o caldeirão no gancho, a lenha empilhada e,
  sobre o console, o fêmur da casa pendurado como troféu;
- luz em 3D simples (cada camada tem profundidade), o fogo com a poça de luz em faixas e cintilação, sombras
  projetadas pelo sol (ou luar) e pelo fogo, contraluz nas bordas, brilho (bloom), mapeamento de tom, correção de cor
  (altas luzes quentes, sombras frias), vinheta e grão de filme.
O lado esquerdo fica mais calmo e escuro; os focos de luz são a janela, a mesa de cartas e a lareira à direita.
O chão em x 330–380 (arte de 480 x 160) fica livre para o mascote, com os pés em y≈150.

Três horas do dia em public/pixel/paginas/: taverna-manha, taverna-tarde e taverna-noite
(.webp, 1440 x 480 e -960 com 960 x 320).
Uso: python3 scripts/gerar_cena_taverna.py            (as três)
     python3 scripts/gerar_cena_taverna.py noite      (só uma)
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "paginas"
W, H, ESC = 480, 160, 3
CHAO = 112                       # onde a parede encontra o assoalho
FUGA = (300, 30)                 # ponto de fuga do assoalho
JAN = (206, 34, 246, 84)         # vidro da janela: x0, y0, x1, y1 (com a verga em arco abatido)
FOGO = (433, 106)                # coração do fogo da lareira
LUSTRE = (284, 0)


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


def suave(a: float, b: float, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


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


# ─────────────────────────────── Paletas e horas do dia ───────────────────────────────
CARVALHO = ("#b07a44", "#8a5a30", "#66401f", "#452a14", "#2a180a")    # luz → sombra
VIGA = ("#7a5232", "#5e3c22", "#432a16", "#2c1a0c", "#180d05")
PEDRA = ("#b4aa9c", "#958a7c", "#766c60", "#585046", "#3a342e", "#24201c")
REBOCO = ("#e6d8bc", "#d2c2a2", "#b8a684", "#8e7c5e")
FERRO = ("#7a7a84", "#55555e", "#38383e", "#222226")
LATAO = ("#fff0b0", "#e8c060", "#b88a34", "#7a5620", "#4a3010")
OSSO = ("#f4ead2", "#dccfb0", "#b4a484", "#7a6c52")
PAPEL = ("#f0e6cc", "#d8cca8", "#b0a280")
VERSO = ("#9a2a2e", "#6e1a1e", "#e0b050")     # verso das cartas: vermelho com filete dourado

PERIODOS = {
    "manha": dict(
        ceu=("#6aa4e0", "#a8cff0", "#f6ead0"), astro=None, amb="#9aaccc", amb_k=0.72,
        sol="#fff0d0", sol_k=1.35, desce=0.62, lado=1.5, fogo_k=0.55, velas=False, lampiao=False,
        quente="#ffe6c0", fria="#2a3c66", feixe_k=0.9, poeira="#fff4d8", jan_k=1.0),
    "tarde": dict(
        ceu=("#7a5088", "#f0905a", "#ffd890"), astro=(230, 55), amb="#8a6a78", amb_k=0.48,
        sol="#ffa456", sol_k=1.45, desce=0.95, lado=2.1, fogo_k=0.8, velas=True, lampiao=False,
        quente="#ffd08a", fria="#3a2450", feixe_k=0.85, poeira="#ffd8a0", jan_k=1.05),
    "noite": dict(
        ceu=("#040a1e", "#0e1a3e", "#22306a"), astro=(238, 46), amb="#2a3870", amb_k=0.42,
        sol="#8eaaff", sol_k=0.5, desce=0.62, lado=1.7, fogo_k=1.25, velas=True, lampiao=True,
        quente="#ffcf8a", fria="#0c1638", feixe_k=0.55, poeira="#c8d8ff", jan_k=0.85),
}


def na_janela(x: float, y: float, margem: float = 0) -> bool:
    """O vão da janela (vidro + `margem` de moldura): retângulo com a verga em arco abatido."""
    x0, y0, x1, y1 = JAN
    cx = (x0 + x1) / 2
    if not (x0 - margem <= x < x1 + margem and y < y1 + margem):
        return False
    meia = (x1 - x0) / 2 + margem
    flecha = 5.0
    topo = y0 - margem + flecha * (1 - min(1.0, ((x + 0.5 - cx) / meia) ** 2)) * -1 + flecha
    return y >= topo - flecha


# ─────────────────────────────── Parede, teto e enxaimel ───────────────────────────────
def viga_horizontal(c: Camada, x0: int, x1: int, y: int, alt: int, g) -> None:
    """Viga de madeira lavrada a enxó: face clara em cima, veios, rachas e pregos de ferro."""
    c.ret(x0, y, x1 - x0, alt, VIGA[1])
    c.ret(x0, y, x1 - x0, 1, VIGA[0])
    c.ret(x0, y + alt - 1, x1 - x0, 1, VIGA[3])
    if alt > 3:
        c.ret(x0, y + alt - 2, x1 - x0, 1, VIGA[2])
    for x in range(x0, x1):
        if g.random() < 0.18:
            c.p(x, y + 1 + int(g.random() * max(1, alt - 2)), VIGA[2])
        if g.random() < 0.03 and alt > 3:
            L = 3 + int(g.random() * 8)
            c.ret(x, y + alt // 2, L, 1, VIGA[3])
    for x in range(x0 + 6, x1 - 2, 37):
        c.p(x, y + alt // 2, FERRO[1])
        c.p(x, y + alt // 2 - 1, FERRO[0])


def viga_vertical(c: Camada, x: int, y0: int, y1: int, larg: int, g) -> None:
    c.ret(x, y0, larg, y1 - y0, VIGA[1])
    c.ret(x, y0, 1, y1 - y0, VIGA[0])
    c.ret(x + larg - 1, y0, 1, y1 - y0, VIGA[3])
    for y in range(y0, y1):
        if g.random() < 0.2:
            c.p(x + 1 + int(g.random() * max(1, larg - 2)), y, VIGA[2])
        if g.random() < 0.025:
            c.ret(x + larg // 2, y, 1, 3 + int(g.random() * 6), VIGA[3])
    for y in range(y0 + 5, y1 - 2, 23):
        c.p(x + larg // 2, y, FERRO[1])


def mao_francesa(c: Camada, xa: int, ya: int, xb: int, yb: int, larg: int = 4) -> None:
    """Escora diagonal do enxaimel."""
    n = max(abs(xb - xa), abs(yb - ya))
    for i in range(n + 1):
        t = i / n
        x = round(xa + (xb - xa) * t)
        y = round(ya + (yb - ya) * t)
        for k in range(larg):
            cor = VIGA[0] if k == 0 else VIGA[3] if k == larg - 1 else VIGA[1] if k == 1 else VIGA[2]
            c.p(x + k, y, cor)


def parede(per: dict) -> tuple[Camada, np.ndarray]:
    """Teto, viga-mestra, paredes caiadas com enxaimel e o lambri. Devolve a camada e o emissivo (vazio aqui)."""
    c = Camada(0.0)
    e = np.zeros((H, W, 3), dtype=np.float32)
    g = np.random.default_rng(3)
    # Reboco caiado com manchas de fumaça (mais escuras perto do teto e da lareira), trincas e tijolo à mostra.
    mancha = ruido(31, 9) * 0.55 + ruido(32, 3) * 0.3 + ruido(33, 1) * 0.15
    for y in range(0, CHAO):
        for x in range(W):
            v = mancha[y, x]
            fum = max(0.0, 1 - y / 40) * 0.3 + max(0.0, 1 - abs(x - 432) / 70) * max(0.0, 1 - y / 70) * 0.4
            k = 0 if v > 0.68 else 1 if v > 0.44 else 2 if v > 0.25 else 3
            base = cor_de(REBOCO[k]) * (1 - fum * 0.55) + hexa("#3a2a1e") * fum * 0.25
            c.c[y, x, :3] = np.clip(base * (0.97 + g.random() * 0.06), 0, 1)
            c.c[y, x, 3] = 1
    # Tijolinhos onde o reboco caiu.
    for (bx, by, bw, bh) in ((120, 60, 14, 8), (268, 40, 11, 7), (364, 26, 9, 6), (32, 44, 10, 6), (342, 78, 8, 5)):
        for y in range(by, by + bh):
            for x in range(bx, bx + bw):
                d = ((x - bx - bw / 2) / (bw / 2)) ** 2 + ((y - by - bh / 2) / (bh / 2)) ** 2
                if d > 1 - g.random() * 0.25:
                    continue
                fila = (y - by) // 3
                junta = (y - by) % 3 == 2 or (x - bx + fila * 3) % 7 == 0
                c.p(x, y, "#5a463a" if junta else ("#9a5a3e" if (x + y) % 5 else "#b0684a"))
        c.elipse(bx + bw / 2, by + bh / 2, bw / 2 + 1, bh / 2 + 1, "#7a6a54", 0.25)
    # Trincas finas no reboco.
    for _ in range(14):
        x, y = g.random() * W, 20 + g.random() * 60
        for _k in range(6 + int(g.random() * 10)):
            c.p(x, y, REBOCO[3], 0.7)
            x += g.random() * 2 - 0.6
            y += 1
    # Teto de tábuas com barrotes vindo em direção à câmera (as pontas aparecem como dentes).
    for y in range(0, 10):
        c.ret(0, y, W, 1, mistura("#3a2414", "#2a180c", y / 10))
    for x in range(0, W, 7):
        c.ret(x, 0, 1, 10, "#1e1208")
    for x in range(0, W, 2):
        c.p(x, int(g.random() * 9), "#4a3020")
    for x in range(-4, W, 26):
        c.ret(x, 0, 9, 10, VIGA[1])
        c.ret(x, 0, 1, 10, VIGA[0])
        c.ret(x + 7, 0, 2, 10, VIGA[3])
        c.ret(x, 8, 9, 2, VIGA[2])
        c.ret(x, 9, 9, 1, VIGA[3])
        c.p(x + 4, 6, FERRO[1])
        c.p(x + 3, 3, VIGA[2])
    # Viga-mestra e o frechal no alto da parede.
    viga_horizontal(c, 0, W, 10, 7, g)
    for x in range(0, W):
        c.p(x, 17, "#1a0e06")
        c.p(x, 18, "#3a2a1c", 0.6)
    # Esteios (verticais), travessa do meio e mãos-francesas.
    esteios = (0, 58, 188, 258, 378)
    for xe in esteios:
        viga_vertical(c, xe, 17, CHAO, 6, g)
    for (xa, xb) in ((6, 58), (64, 188), (264, 378)):
        viga_horizontal(c, xa, xb, 52, 4, g)
    mao_francesa(c, 64, 22, 100, 51)
    mao_francesa(c, 150, 51, 184, 22)
    mao_francesa(c, 264, 51, 290, 22)
    mao_francesa(c, 6, 51, 30, 22)
    # Lambri de tábuas verticais, com o rodameio e o rodapé.
    for x in range(W):
        tab = x // 7
        kk = 1 if x % 7 == 0 else 3 if x % 7 == 6 else 2
        for y in range(86, CHAO):
            cor = cor_de(CARVALHO[kk]) * (0.9 + 0.12 * mancha[y, (x * 3) % W])
            if (tab * 13 + y) % 31 == 0:
                cor = cor * 0.7
            c.c[y, x, :3] = cor
    c.ret(0, 84, W, 2, CARVALHO[0])
    c.ret(0, 85, W, 1, CARVALHO[1])
    c.ret(0, 86, W, 1, CARVALHO[4])
    c.ret(0, CHAO - 3, W, 3, CARVALHO[3])
    c.ret(0, CHAO - 3, W, 1, CARVALHO[1])
    for xe in esteios:
        viga_vertical(c, xe, 84, CHAO, 6, g)
    return c, e


# ─────────────────────────────── Janela e o que se vê por ela ───────────────────────────────
def paisagem(nome: str, per: dict) -> np.ndarray:
    """Céu da hora, morros, a vila com telhados (janelinhas acesas à noite) e uma árvore, para o vão da janela."""
    e = np.zeros((H, W, 3), dtype=np.float32)
    x0, y0, x1, y1 = JAN
    topo, meio, baixo = (hexa(k) for k in per["ceu"])
    nuv = ruido(41, 7) * 0.6 + ruido(42, 3) * 0.4
    g = np.random.default_rng(43)
    for y in range(y0 - 6, y1 + 1):
        t = np.clip((y - (y0 - 6)) / (y1 - y0 + 6), 0, 1)
        cor = topo * (1 - t / 0.55) + meio * (t / 0.55) if t < 0.55 else meio * (1 - (t - 0.55) / 0.45) + baixo * ((t - 0.55) / 0.45)
        for x in range(x0 - 1, x1 + 1):
            v = cor.copy()
            n = nuv[y, x] - 0.55
            if n > 0 and y < y0 + 30:
                k = min(1.0, n * 5)
                nc = {"manha": "#ffffff", "tarde": "#ffb88a", "noite": "#3a4a80"}[nome]
                v = v * (1 - k * 0.5) + hexa(nc) * k * 0.5
            e[y, x] = v
    if nome == "noite":
        for _ in range(26):
            x, y = x0 + int(g.random() * (x1 - x0)), y0 - 4 + int(g.random() * 30)
            e[y, x] += 0.4 + g.random() * 0.5
    if per["astro"]:
        ax, ay = per["astro"]
        for y in range(ay - 14, ay + 15):
            for x in range(ax - 14, ax + 15):
                if not (x0 - 1 <= x < x1 + 1 and 0 <= y < H):
                    continue
                d = math.hypot(x - ax, y - ay)
                if nome == "tarde":
                    e[y, x] += hexa("#ffd0a0") * math.exp(-d / 6) * 0.9
                    if d < 4.2:
                        e[y, x] = hexa("#fff4d8") * 1.4
                else:
                    e[y, x] += hexa("#8aa0e0") * math.exp(-d / 7) * 0.45
                    if d < 3.6:
                        cra = math.hypot(x - ax + 1, y - ay - 1) < 1.1
                        e[y, x] = hexa("#c8d2f0") if cra else hexa("#f4f6ff")
    # Morros ao longe, a vila (casinhas com telhado) e uma árvore à direita.
    tons = {"manha": ("#8aa6b8", "#5e7e6a", "#3e5a3e", "#7a4a3a"),
            "tarde": ("#9a6a7a", "#6a4a5a", "#3e2a3a", "#5a2e2a"),
            "noite": ("#16204a", "#0e1636", "#0a1028", "#121a3c")}[nome]
    for x in range(x0 - 1, x1 + 1):
        hm = int(64 + 4 * math.sin(x / 9.0) + 2 * math.sin(x / 3.7))
        for y in range(hm, y1 + 1):
            e[y, x] = hexa(tons[0]) * (1 - (y - hm) * 0.01)
        hp = int(73 + 3 * math.sin(x / 6.0 + 1))
        for y in range(hp, y1 + 1):
            e[y, x] = hexa(tons[1])
    casas = ((209, 70, 9, 6), (219, 72, 7, 5), (228, 69, 8, 7), (238, 73, 6, 4))
    for (cx, cy, cw, ch) in casas:
        for y in range(cy, min(y1 + 1, cy + ch + 6)):
            for x in range(cx, cx + cw):
                e[y, x] = hexa(tons[2]) * (1.25 if nome != "noite" else 1.0) if y >= cy + 3 else hexa(tons[3])
        for k in range(3):
            for x in range(cx + k, cx + cw - k):
                e[cy - k, x] = hexa(tons[3])
        if nome == "noite":
            e[cy + 4, cx + 2] = hexa("#ffc860") * 1.4
            if cw > 7:
                e[cy + 4, cx + cw - 3] = hexa("#ffb050") * 1.2
        else:
            e[cy + 4, cx + 2] = hexa(tons[2]) * 0.6
    # torre da capela
    for y in range(58, 70):
        for x in range(232, 235):
            e[y, x] = hexa(tons[2]) * 1.1
    for k in range(5):
        e[57 - k, 233] = hexa(tons[3])
    if nome == "noite":
        e[63, 233] = hexa("#ffd070") * 1.2
    # árvore
    for y in range(52, y1 + 1):
        for x in range(240, x1 + 1):
            d = math.hypot((x - 245) / 6, (y - 60) / 9)
            if d < 1 + 0.25 * math.sin(x * 1.7 + y):
                e[y, x] = hexa(tons[2]) * (0.9 + 0.2 * ((x + y) % 3 == 0))
    return e


def janela(c: Camada, nome: str, per: dict) -> tuple[np.ndarray, np.ndarray]:
    """Moldura de madeira, peitoril, folhas abertas e o vidro em rodelas (fundo de garrafa) com caixilhos de chumbo.
    Devolve (emissivo HxWx3, transmissão da luz HxW)."""
    ceu = paisagem(nome, per)
    emis = np.zeros((H, W, 3), dtype=np.float32)
    trans = np.zeros((H, W), dtype=np.float32)
    x0, y0, x1, y1 = JAN
    # Moldura (derrame de madeira grossa) e peitoril.
    for y in range(y0 - 12, y1 + 6):
        for x in range(x0 - 6, x1 + 6):
            if na_janela(x, y, 5) and not na_janela(x, y, 0):
                d_in = 5
                for m in range(1, 6):
                    if na_janela(x, y, m):
                        d_in = m
                        break
                k = 0 if d_in == 5 else 1 if d_in >= 4 else 2 if d_in >= 2 else 3
                c.p(x, y, CARVALHO[k])
    c.ret(x0 - 8, y1 + 1, x1 - x0 + 16, 3, CARVALHO[0])
    c.ret(x0 - 8, y1 + 3, x1 - x0 + 16, 1, CARVALHO[2])
    c.ret(x0 - 7, y1 + 4, x1 - x0 + 14, 2, CARVALHO[4])
    # Folhas da janela abertas (persianas de madeira com dobradiças).
    for (xa, sentido) in ((x0 - 17, -1), (x1 + 6, 1)):
        for y in range(y0 - 4, y1 + 1):
            for i in range(11):
                k = 1 if i in (0, 10) else 2 if y % 4 == 0 else 1 if (i % 3 == 1) else 2
                c.p(xa + i, y, CARVALHO[k + (1 if sentido < 0 and i > 6 else 0)])
            if y % 4 == 0:
                c.ret(xa + 1, y, 9, 1, CARVALHO[3])
        for yy in (y0 + 2, y1 - 6):
            c.ret(xa + (1 if sentido > 0 else 3), yy, 7, 2, FERRO[2])
            c.p(xa + (1 if sentido > 0 else 9), yy, FERRO[0])
        c.ret(xa, y0 - 4, 11, 1, CARVALHO[0])
        c.ret(xa + (10 if sentido < 0 else 0), y0 - 4, 1, y1 - y0 + 5, CARVALHO[3])
    # Vidro em rodelas com caixilhos: 2 folhas, travessa no meio.
    g = np.random.default_rng(47)
    cxm = (x0 + x1) // 2
    for y in range(y0 - 6, y1 + 1):
        for x in range(x0, x1):
            if not na_janela(x, y):
                continue
            if x in (cxm - 1, cxm) or y in (59, 60) or x in (x0, x1 - 1) or y == y1:
                c.p(x, y, CARVALHO[1] if x in (cxm - 1,) or y == 59 else CARVALHO[3])
                continue
            # vidraças pequenas de 7 x 6 presas no chumbo; cada uma com um tom e um reflexo diagonal
            u, v = (x - x0) % 7, (y - y0 + 6) % 6
            if u == 0 or v == 0:
                c.p(x, y, "#262426")
                continue
            pane = ((x - x0) // 7) * 13 + (y - y0 + 6) // 6
            tinta = 0.9 + 0.14 * ((pane * 37) % 7) / 6
            fonte = ceu[y, x]
            vidro = fonte * tinta + hexa("#d8ecd8") * 0.04
            if (u + v) in (4, 5) and u < 5:
                vidro = vidro * 1.12 + 0.03                      # reflexo do vidro antigo
            emis[y, x] = vidro * per["jan_k"]
            trans[y, x] = 0.4 + 0.8 * float(fonte.mean()) if nome != "noite" else 0.6 + 0.9 * float(fonte.mean())
    # Vasinho de gerânio no peitoril e uma vela apagada.
    emis[y1 - 3:y1 + 1, x0 + 2:x0 + 9] = 0
    trans[y1 - 3:y1 + 1, x0 + 2:x0 + 9] = 0
    c.ret(x0 + 2, y1 - 3, 6, 4, "#a8583a")
    c.ret(x0 + 2, y1 - 3, 6, 1, "#c8704a")
    c.ret(x0 + 7, y1 - 2, 1, 3, "#7a3a24")
    for (dx, dy, cor) in ((1, -5, "#3e7a3a"), (3, -6, "#4e8a40"), (5, -5, "#3e7a3a"), (2, -7, "#d0303a"), (4, -8, "#e84048"),
                          (6, -6, "#d0303a"), (0, -4, "#2e5a2e"), (3, -4, "#2e5a2e"), (6, -4, "#2e5a2e"), (4, -7, "#ff7070")):
        c.p(x0 + 1 + dx, y1 + dy, cor)
        emis[y1 + dy, x0 + 1 + dx] = 0
        trans[y1 + dy, x0 + 1 + dx] = 0
    # Trinco de ferro na travessa.
    c.ret(cxm - 2, 58, 4, 4, FERRO[2])
    c.p(cxm - 1, 58, FERRO[0])
    return emis, trans


# ─────────────────────────────── Balcão, garrafas e barris ───────────────────────────────
VIDROS = ["#2e6a3a", "#3e7a2e", "#7a4a1a", "#9a5a1e", "#4a2a1a", "#6a7a8a", "#3a4a6a", "#8a2a3a", "#b8b8a0", "#2a3a2a"]


def garrafa(c: Camada, x: int, yb: int, g) -> int:
    """Uma garrafa (ou frasco) de pé: corpo com reflexo, ombro, gargalo, rolha ou lacre, rótulo e nível do líquido."""
    tipo = g.random()
    cor = cor_de(VIDROS[int(g.random() * len(VIDROS))]) * (0.85 + g.random() * 0.3)
    if tipo < 0.55:          # garrafa de vinho / licor
        w, hc, hg = 4, 6 + int(g.random() * 3), 3 + int(g.random() * 2)
    elif tipo < 0.8:         # garrafa bojuda (rum)
        w, hc, hg = 5, 5, 2
    else:                    # frasco baixo / jarra de barro
        w, hc, hg = 5, 4, 1
    if tipo >= 0.9:          # jarra de barro
        cor = cor_de("#a8784a")
    for j in range(w):
        k = 1.5 if j == 1 else 0.6 if j == w - 1 else 1.0
        c.ret(x + j, yb - hc + 1, 1, hc, np.clip(cor * k, 0, 1))
    c.ret(x, yb, w, 1, np.clip(cor * 0.55, 0, 1))
    c.ret(x + 1, yb - hc, w - 2, 1, np.clip(cor * 1.1, 0, 1))
    gx = x + w // 2
    c.ret(gx, yb - hc - hg, 1, hg, np.clip(cor * 1.15, 0, 1))
    rolha = "#c8a070" if g.random() < 0.6 else "#a02a2a" if g.random() < 0.5 else "#e0c060"
    c.p(gx, yb - hc - hg - 1, rolha)
    if g.random() < 0.6 and hc >= 5:                    # rótulo de papel
        ry = yb - hc + 2 + int(g.random() * 2)
        c.ret(x + 1, ry, w - 2, 2, "#e8dcb8" if g.random() < 0.7 else "#d8b860")
        c.p(x + 1, ry, "#b8a888")
    c.p(x + 1, yb - hc + 1, "#ffffff", 0.55)           # reflexo
    return w + 1 + int(g.random() * 2)


def caneca(c: Camada, x: int, yb: int, cor="#8a6a4a", espuma: bool = False, alt: int = 5, asa_dir: bool = True) -> None:
    """Caneca de madeira com aros de ferro (ou de estanho), alça e, se cheia, espuma por cima."""
    base = cor_de(cor)
    for j in range(4):
        k = 1.25 if j == 0 else 1.05 if j == 1 else 0.85 if j == 2 else 0.6
        c.ret(x + j, yb - alt + 1, 1, alt, np.clip(base * k, 0, 1))
    c.ret(x, yb - alt + 2, 4, 1, FERRO[2])
    c.ret(x, yb - 1, 4, 1, FERRO[2])
    ax = x + 4 if asa_dir else x - 1
    c.ret(ax, yb - alt + 2, 1, alt - 2, np.clip(base * 0.7, 0, 1))
    if espuma:
        c.ret(x, yb - alt, 4, 1, "#f4ecd8")
        c.p(x + 1, yb - alt - 1, "#fff8e8")
        c.p(x + 2, yb - alt - 1, "#e8dcc0")
        c.p(x + 3, yb - alt + 1, "#f4ecd8")
    else:
        c.ret(x, yb - alt, 4, 1, np.clip(base * 0.45, 0, 1))


def barril_deitado(c: Camada, cx: int, cy: int, r: int) -> None:
    """Barril deitado de frente (o tampo redondo com aduelas, aros e torneira de latão)."""
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d > r + 0.3:
                continue
            if d > r - 1.2:
                c.p(x, y, FERRO[2] if y < cy else FERRO[3])
                continue
            tab = int((x - cx + r) / 3)
            luz = 1.15 - (y - cy) / (r * 2.5) - (x - cx) / (r * 4)
            cor = cor_de(CARVALHO[1 if tab % 2 else 2]) * luz
            if (x - cx + r) % 3 == 0:
                cor = cor_de(CARVALHO[3])
            c.p(x, y, np.clip(cor, 0, 1))
    c.elipse(cx, cy, 1.5, 1.5, CARVALHO[3])
    c.ret(cx - 1, cy + r - 3, 3, 2, LATAO[2])
    c.p(cx - 1, cy + r - 3, LATAO[0])
    c.ret(cx, cy + r - 1, 1, 2, LATAO[3])


def balcao(per: dict) -> tuple[Camada, Camada, np.ndarray]:
    """Fundo do balcão (prateleiras de garrafas, canecas penduradas, barris) e o balcão na frente com as banquetas."""
    fundo = Camada(0.04)
    frente = Camada(0.32)
    e = np.zeros((H, W, 3), dtype=np.float32)
    g = np.random.default_rng(11)
    # Prateleiras com mãos-francesas, garrafas uma a uma.
    for (ys, xa, xb) in ((40, 70, 182), (64, 70, 182), (40, 8, 52)):
        x = xa + 1
        while x < xb - 5:
            if g.random() < 0.07:
                x += 3
                continue
            x += garrafa(fundo, x, ys - 1, g)
        fundo.ret(xa - 2, ys, xb - xa + 4, 2, CARVALHO[1])
        fundo.ret(xa - 2, ys, xb - xa + 4, 1, CARVALHO[0])
        fundo.ret(xa - 2, ys + 2, xb - xa + 4, 1, "#20140a")
        for xm in (xa + 4, xb - 6):
            fundo.ret(xm, ys + 2, 2, 4, CARVALHO[2])
            fundo.p(xm + 1, ys + 5, CARVALHO[3])
    # Ganchos com canecas penduradas embaixo da prateleira de cima.
    gm = np.random.default_rng(12)
    for x in range(74, 178, 9):
        if gm.random() < 0.18:
            fundo.ret(x + 2, 42, 1, 2, FERRO[1])               # gancho vazio
            fundo.p(x + 2, 44, FERRO[0])
            continue
        alt = 4 + int(gm.random() * 3)
        cor = ("#9a7a5a", "#8a8a90", "#7a5a3a", "#a89070", "#6a7a80")[int(gm.random() * 5)]
        dx = int(gm.random() * 3) - 1
        fundo.ret(x + 2 + dx, 42, 1, 2, FERRO[1])
        caneca(fundo, x + dx, 44 + alt, cor, alt=alt, asa_dir=gm.random() < 0.5)
    # Barris na prateleira baixa à esquerda.
    for (bx, by) in ((16, 75), (40, 75)):
        barril_deitado(fundo, bx, by, 9)
    fundo.ret(4, 84, 52, 2, CARVALHO[2])
    # Quadro-negro com os preços (rabiscos de giz) e uma ferradura da sorte.
    fundo.ret(14, 20, 32, 18, CARVALHO[2])
    fundo.ret(15, 21, 30, 16, "#24302a")
    for (ly, L) in ((24, 20), (27, 14), (30, 22), (33, 11)):
        for x in range(18, 18 + L):
            if (x * 7 + ly) % 5:
                fundo.p(x, ly, "#c8d0c4", 0.75)
        fundo.p(40, ly, "#e8e0a0", 0.8)
        fundo.p(41, ly, "#e8e0a0", 0.8)
    for k in range(9):                                  # ferradura
        ang = math.pi * (k / 8)
        fundo.p(round(150 + 4 * math.cos(ang)), round(30 - 4 * math.sin(ang)), FERRO[0] if k < 4 else FERRO[1])
    fundo.p(146, 31, FERRO[1])
    fundo.p(154, 31, FERRO[1])
    # O balcão: tampo grosso e frente de tábuas almofadadas, com a calha de latão para os pés.
    TOPO = 88
    frente.z_atual = 0.32
    xb = 152
    frente.ret(0, TOPO, xb, 3, CARVALHO[0])
    frente.ret(0, TOPO, xb, 1, "#c89058")
    frente.ret(0, TOPO + 3, xb, 1, CARVALHO[3])
    for x in range(0, xb, 11):
        frente.p(x + 4, TOPO + 1, CARVALHO[1])
    for y in range(TOPO + 4, 124):
        for x in range(0, xb - 2):
            painel = (x % 22)
            k = 1 if painel in (0, 1) else 3 if painel == 21 else 2
            if 3 <= painel <= 19 and (y in (TOPO + 7, 118) or y in range(TOPO + 7, 118) and painel in (3, 19)):
                k = 3 if painel == 19 or y == 118 else 1
            frente.p(x, y, CARVALHO[k])
    frente.ret(xb - 2, TOPO + 4, 2, 120 - TOPO, CARVALHO[3])     # quina
    frente.ret(xb - 2, TOPO, 4, 4, CARVALHO[1])
    frente.ret(0, 120, xb, 1, LATAO[2])
    frente.ret(0, 121, xb, 1, LATAO[3])
    for x in range(10, xb, 30):
        frente.ret(x, 119, 1, 3, LATAO[3])
    frente.ret(0, 122, xb, 2, CARVALHO[4])
    # Em cima do balcão: canecas cheias, a torneira do barrilzinho, uma jarra e um castiçal.
    for (x, cor, esp) in ((22, "#8a6a4a", True), (30, "#8a8a90", True), (88, "#9a7a5a", False), (126, "#8a6a4a", True)):
        caneca(frente, x, TOPO - 1, cor, espuma=esp)
    barril_deitado(frente, 60, TOPO - 8, 7)
    frente.ret(52, TOPO - 1, 16, 1, CARVALHO[3])
    frente.ret(104, TOPO - 8, 6, 8, "#7a8a96")         # jarra de estanho
    frente.ret(104, TOPO - 8, 1, 8, "#a8b4bc")
    frente.ret(110, TOPO - 6, 1, 4, "#5a6670")
    frente.p(103, TOPO - 8, "#a8b4bc")
    frente.ret(140, TOPO - 2, 5, 2, LATAO[2])          # castiçal do balcão
    frente.ret(141, TOPO - 7, 3, 5, "#efe4c8")
    frente.p(141, TOPO - 7, "#d0c4a0")
    if per["velas"]:
        e[TOPO - 8, 142] += hexa("#ffd070") * 1.4
        e[TOPO - 9, 142] += hexa("#ff9a40") * 0.7
    # Banquetas (z um pouco mais perto).
    for bx in (38, 98):
        frente.z_atual = 0.42
        frente.ret(bx - 7, 110, 15, 3, CARVALHO[1])
        frente.ret(bx - 7, 110, 15, 1, CARVALHO[0])
        frente.ret(bx - 7, 113, 15, 1, CARVALHO[3])
        for (lx, ly, dx) in ((bx - 5, 114, -2), (bx + 4, 114, 2)):
            frente.linha(lx, ly, lx + dx, 130, CARVALHO[2])
            frente.linha(lx + 1, ly, lx + dx + 1, 130, CARVALHO[3])
        frente.ret(bx - 5, 123, 11, 1, CARVALHO[2])
    return fundo, frente, e


# ─────────────────────────────── Quadro de avisos ───────────────────────────────
def desenho_osso(c: Camada, x: int, y: int, tipo: int) -> None:
    """Desenhos a tinta dos cartões pregados (tinta sépia sobre papel)."""
    t1, t2 = "#5a3a22", "#8a6a4a"
    if tipo == 0:    # fêmur: cabeça, colo, trocânter, diáfise e os dois côndilos
        for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1)):
            c.p(x + dx, y + dy, t1)
        c.p(x + 2, y + 2, t1)
        c.p(x + 4, y + 1, t1)
        c.p(x + 4, y + 2, t2)
        for j in range(3, 9):
            c.p(x + 3, y + j, t1)
        c.p(x + 2, y + 9, t1)
        c.p(x + 4, y + 9, t1)
        c.p(x + 3, y + 9, t2)
        c.p(x + 2, y + 8, t2)
        c.p(x + 4, y + 8, t2)
    elif tipo == 1:  # mão: quatro dedos separados, palma e o polegar
        for i, comp in enumerate((4, 5, 5, 4)):
            c.ret(x + i * 2, y + 1 + (5 - comp), 1, comp, t1)
        c.ret(x, y + 6, 7, 3, t2)
        c.ret(x, y + 6, 7, 1, t1)
        c.p(x - 1, y + 5, t1)
        c.p(x - 1, y + 6, t1)
    elif tipo == 2:  # crânio: calota, órbitas, nariz e dentes
        c.ret(x + 1, y, 4, 1, t1)
        c.ret(x, y + 1, 6, 3, t2)
        c.p(x, y + 1, t1)
        c.p(x + 5, y + 1, t1)
        c.ret(x + 1, y + 2, 2, 2, "#2a1a10")
        c.ret(x + 4, y + 2, 1, 2, "#2a1a10")
        c.p(x + 3, y + 4, "#2a1a10")
        c.ret(x + 1, y + 4, 4, 1, t2)
        c.ret(x + 1, y + 5, 4, 1, t1)
        c.p(x + 2, y + 6, t2)
        c.p(x + 4, y + 6, t2)
    elif tipo == 3:  # coluna
        for j in range(0, 9, 2):
            c.ret(x + 2, y + j, 3, 1, t1)
            c.p(x + 1, y + j, t2)
            c.p(x + 5, y + j, t2)
    else:            # texto
        for j in range(0, 8, 2):
            c.ret(x, y + j, 5 - (j % 4 == 2) * 2, 1, t2, 0.85)


def quadro_avisos(per: dict) -> Camada:
    c = Camada(0.03)
    g = np.random.default_rng(23)
    x0, y0, x1, y1 = 300, 24, 362, 74
    c.ret(x0 + 2, y0 + 2, x1 - x0, y1 - y0, "#1a0e06", 0.4)
    c.ret(x0, y0, x1 - x0, y1 - y0, CARVALHO[2])
    c.ret(x0, y0, x1 - x0, 1, CARVALHO[0])
    c.ret(x0, y1 - 1, x1 - x0, 1, CARVALHO[4])
    c.ret(x0, y0, 1, y1 - y0, CARVALHO[1])
    c.ret(x1 - 1, y0, 1, y1 - y0, CARVALHO[4])
    cort = ruido(29, 2, 64, 60)
    for y in range(y0 + 3, y1 - 3):
        for x in range(x0 + 3, x1 - 3):
            v = cort[y - y0, x - x0]
            c.p(x, y, "#b0804a" if v > 0.62 else "#9a6a3a" if v > 0.4 else "#845a30")
    c.ret(x0 + 3, y0 + 3, x1 - x0 - 6, 1, "#5a3a1a")
    c.ret(x0 + 3, y0 + 3, 1, y1 - y0 - 6, "#6a4422")
    # Cartões pregados, levemente tortos, com tachinhas coloridas.
    cartoes = ((305, 29, 0), (317, 31, 4), (330, 28, 1), (343, 30, 2), (306, 48, 3), (319, 50, 0), (333, 47, 4),
               (346, 49, 1), (313, 64, 4))
    tach = ("#d03030", "#3060d0", "#e0b030", "#30a050")
    for i, (cx, cy, tipo) in enumerate(cartoes):
        w_, h_ = 10, 13 if cy < 60 else 7
        inc = (i % 3) - 1
        c.ret(cx + 1, cy + 1, w_, h_, "#2a1a0a", 0.45)
        for y in range(h_):
            dx = round(inc * (y - h_ / 2) / h_)
            c.ret(cx + dx, cy + y, w_, 1, PAPEL[0] if y > 0 else "#fff8e4")
            c.p(cx + dx + w_ - 1, cy + y, PAPEL[1])
        c.ret(cx, cy + h_ - 1, w_, 1, PAPEL[2])
        if (i * 5) % 3 == 0:
            c.p(cx + w_ - 1, cy + h_ - 1, PAPEL[2])                # canto dobrado
            c.p(cx + w_ - 2, cy + h_ - 2, PAPEL[1])
        if h_ > 8:
            desenho_osso(c, cx + 2, cy + 2, tipo)
        else:
            desenho_osso(c, cx + 2, cy + 1, 4)
        tc = tach[i % 4]
        c.p(cx + w_ // 2, cy, tc)
        c.p(cx + w_ // 2, cy - 1, tom(tc, 1.4))
    # Um bilhete grande "PROCURA-SE" com uma tíbia (o gaiato da taverna) e a corda do quadro.
    c.ret(326, 63, 30, 9, "#e8d8b0")
    c.ret(326, 63, 30, 1, "#f8ecd0")
    for x in range(328, 354, 2):
        c.p(x, 65, "#7a2a1a")
    for x in range(328, 345):
        c.p(x, 69, "#6a4a2a")
    c.p(328, 68, "#6a4a2a")
    c.p(328, 70, "#6a4a2a")
    c.p(344, 68, "#6a4a2a")
    c.p(344, 70, "#6a4a2a")
    c.p(348, 63, "#d03030")
    c.linha(x0 + 6, y0, 331, y0 - 6, "#8a6a40")
    c.linha(331, y0 - 6, x1 - 6, y0, "#8a6a40")
    c.p(331, y0 - 7, FERRO[0])
    return c


# ─────────────────────────────── Lareira ───────────────────────────────
def lareira(per: dict, nome: str) -> tuple[Camada, np.ndarray, Camada, Camada]:
    """Lareira de pedra: chaminé até o teto, arco com aduelas, console de madeira com o fêmur-troféu, o fogo, a lenha
    e o caldeirão. Devolve (pedra e objetos, emissivo, camada do fogo à parte)."""
    c = Camada(0.06)
    e = np.zeros((H, W, 3), dtype=np.float32)
    g = np.random.default_rng(37)
    X0, X1 = 384, W
    # Chaminé de pedra (pedras irregulares com argamassa, mais escura de fuligem perto do arco).
    linhas = []
    y = 17
    while y < CHAO + 8:
        alt = 5 + int(g.random() * 3)
        linhas.append((y, alt))
        y += alt
    for (yy, alt) in linhas:
        x = X0 - int(g.random() * 6)
        while x < X1:
            larg = 7 + int(g.random() * 9)
            k0 = int(g.random() * 3)
            tinta = mistura("#d8b898", "#98a4b4", g.random()) * 1.1
            for y in range(yy, min(yy + alt, CHAO + 10)):
                for xx in range(x, min(x + larg, X1)):
                    if xx < X0 - (0 if y < 62 else 2):
                        continue
                    borda = y == yy or xx == x
                    fundo_ = y == yy + alt - 1 or xx == x + larg - 1
                    if borda or fundo_:
                        cor = PEDRA[5] if borda else PEDRA[4]
                    else:
                        k = k0 + (1 if y > yy + alt - 3 else 0) + (1 if xx > x + larg - 3 else 0) - (1 if y == yy + 1 else 0)
                        cor = PEDRA[max(0, min(4, k + 1))]
                    canto = (y in (yy + 1, yy + alt - 2)) and (xx in (x + 1, x + larg - 2))
                    if canto:
                        cor = PEDRA[4]
                    fu = max(0.0, 1 - abs(xx - 433) / 34) * max(0.0, 1 - abs(y - 70) / 30)
                    cor_f = cor_de(cor) * (tinta if not (borda or fundo_) else 1.0)
                    if not (borda or fundo_ or canto) and g.random() < 0.08:
                        cor_f = cor_f * 0.85                     # picado da pedra
                    c.p(xx, y, np.clip(cor_f * (1 - fu * 0.45), 0, 1))
                    c.z[y, xx] = 0.06
            if g.random() < 0.35:                                     # musgo/liquens e lascas
                c.p(x + 2 + int(g.random() * (larg - 3)), yy + 1, PEDRA[0])
            x += larg
    # Abertura em arco com aduelas e o interior (fuligem, tijolo refratário que brilha embaixo).
    AX0, AX1, AY0, AY1 = 402, 464, 80, 122
    acx = (AX0 + AX1) / 2
    for y in range(AY0 - 8, AY1 + 1):
        for x in range(AX0 - 6, AX1 + 6):
            dx = (x + 0.5 - acx) / ((AX1 - AX0) / 2)
            topo = AY0 + 8 * dx * dx
            topo_ext = topo - 6
            if y >= topo and AX0 <= x < AX1:
                prof = (y - topo) / (AY1 - topo + 0.01)
                tij = ((x // 4 + (y // 3) % 2 * 2) % 2 == 0)
                cor = mistura("#1a120e", "#5a2a1a", prof ** 1.5)
                if (y % 3 == 0 or (x + (y // 3) * 2) % 6 == 0) and prof > 0.3:
                    cor = cor * 0.6
                c.p(x, y, cor if not tij else cor * 1.05)
                c.z[y, x] = 0.0
            elif y >= topo_ext and AX0 - 6 <= x < AX1 + 6 and y < AY1 + 1:
                ang = math.atan2(y - AY0 - 10, x + 0.5 - acx)
                k = 1 if int(ang * 9) % 2 else 2
                if y >= topo - 1:
                    k = 4
                c.p(x, y, PEDRA[k])
    # Pedra de fecho.
    c.ret(int(acx) - 3, AY0 - 7, 6, 7, PEDRA[1])
    c.ret(int(acx) - 3, AY0 - 7, 6, 1, PEDRA[0])
    c.ret(int(acx) + 2, AY0 - 7, 1, 7, PEDRA[3])
    # Console de madeira (viga grossa) com mísulas de pedra.
    c.z_atual = 0.1
    c.ret(388, 64, 92, 6, CARVALHO[1])
    c.ret(388, 64, 92, 1, CARVALHO[0])
    c.ret(388, 65, 92, 1, "#c08a50")
    c.ret(388, 69, 92, 1, CARVALHO[3])
    c.ret(388, 70, 92, 1, "#140a04")
    for x in range(390, 478, 6):
        c.p(x, 67, CARVALHO[2])
    for mx in (390, 470):
        c.ret(mx, 71, 7, 5, PEDRA[1])
        c.ret(mx + 1, 76, 5, 2, PEDRA[2])
        c.ret(mx, 71, 7, 1, PEDRA[0])
    # Em cima do console: castiçais, pratos de estanho, uma ampulheta e um pote.
    for (vx, alt) in ((396, 7), (468, 5)):
        c.ret(vx - 2, 62, 5, 2, LATAO[2])
        c.ret(vx - 1, 61, 3, 1, LATAO[1])
        c.ret(vx, 61 - alt, 2, alt, "#f0e6cc")
        c.p(vx, 61 - alt, "#d8cca8")
        c.ret(vx + 1, 61 - alt + 2, 1, 2, "#e8d8b0")         # pingo de cera
        if per["velas"]:
            e[61 - alt - 1, vx] += hexa("#fff0b0") * 1.6
            e[61 - alt - 2, vx] += hexa("#ffa040") * 0.8
        else:
            c.p(vx, 61 - alt - 1, "#2a2420")
    for (px_, py_) in ((406, 56), (456, 57)):
        c.elipse(px_, py_, 5, 5, "#8a96a0")
        c.elipse(px_, py_, 3.4, 3.4, "#a8b4bc")
        c.elipse(px_ - 1, py_ - 1, 1.4, 1.4, "#e0e8ec")
        c.ret(px_ - 1, 62, 3, 2, "#5a6670")
    c.ret(444, 56, 5, 1, CARVALHO[1])                      # ampulheta
    c.ret(444, 63, 5, 1, CARVALHO[1])
    for j in range(6):
        larg = abs(j - 2.5) * 0.8 + 0.8
        c.ret(round(446.5 - larg), 57 + j, round(larg * 2), 1, "#c8d8e0", 0.6)
    c.ret(445, 61, 3, 2, "#e8c070")
    c.ret(415, 58, 5, 6, "#6a3a24")                        # pote de barro
    c.ret(415, 58, 1, 6, "#8a5a3a")
    c.ret(414, 57, 7, 1, "#4a2414")
    # O fêmur da casa, pendurado em dois ganchos acima do console (troféu da taverna).
    c.z_atual = 0.08
    fx0, fx1, fy = 410, 456, 44
    for x in range(fx0, fx1 + 1):
        t = (x - fx0) / (fx1 - fx0)
        curva = -1.2 * math.sin(t * math.pi)              # o fêmur tem a curvatura anterior
        yc = fy + curva + (t - 0.5) * 2
        meia = 1.6 if 0.12 < t < 0.86 else 2.6
        for dy in range(-4, 5):
            yy = round(yc + dy)
            if abs(dy) <= meia:
                k = 0 if dy <= -1 else 1 if dy <= 0 else 2 if dy <= 1 else 3
                c.p(x, yy, OSSO[k])
        c.p(x, round(yc - meia - 0.5), OSSO[3], 0.7)
        c.p(x, round(yc + meia + 1), OSSO[3])
    # cabeça femoral (esfera), colo e trocânter maior à esquerda
    c.elipse(fx0 - 3, fy - 3, 3.4, 3.4, OSSO[1])
    c.elipse(fx0 - 4, fy - 4, 1.8, 1.8, OSSO[0])
    c.p(fx0 - 2, fy - 1, OSSO[3])
    c.linha(fx0 - 1, fy - 2, fx0 + 2, fy, OSSO[1])
    c.ret(fx0 + 1, fy - 4, 3, 3, OSSO[1])
    c.p(fx0 + 1, fy - 4, OSSO[0])
    c.p(fx0 + 3, fy - 2, OSSO[2])
    c.p(fx0 + 4, fy + 2, OSSO[2])                          # trocânter menor
    # côndilos à direita
    c.elipse(fx1 + 1, fy - 1, 2.4, 2.6, OSSO[1])
    c.elipse(fx1 + 1, fy + 3, 2.4, 2.6, OSSO[2])
    c.p(fx1 + 2, fy + 1, OSSO[3])
    c.p(fx1, fy - 2, OSSO[0])
    # ganchos de ferro forjado
    for gx in (418, 448):
        c.ret(gx, fy - 6, 2, 3, FERRO[1])
        c.p(gx, fy - 7, FERRO[0])
        c.p(gx + 2, fy - 3, FERRO[2])
        c.p(gx - 1, fy + 3, FERRO[1])
        c.p(gx + 2, fy + 3, FERRO[1])
    # Placa de latão sob o troféu.
    c.ret(428, 52, 10, 3, LATAO[2])
    c.ret(428, 52, 10, 1, LATAO[1])
    for x in range(430, 436, 2):
        c.p(x, 53, LATAO[4])
    # Lareira por dentro: chamas em línguas (atrás), depois a grelha, os cães de ferro e as toras por cima.
    f = Camada(0.05)
    chama = Camada(0.05)
    fk = per["fogo_k"] ** 0.35
    gl = np.random.default_rng(39)
    # (centro x, altura, meia-largura, fase do balanço, camada: 0 externa vermelha .. 3 núcleo)
    linguas = []
    for (cx_, alt, larg) in ((418, 15, 5), (426, 22, 6), (434, 27, 7), (442, 21, 6), (450, 14, 5), (430, 12, 4), (439, 13, 4)):
        linguas.append((cx_, alt, larg, gl.random() * 6, 0))
    for (cx_, alt, larg) in ((424, 15, 4), (433, 21, 5), (443, 15, 4)):
        linguas.append((cx_, alt, larg, gl.random() * 6, 1))
    for (cx_, alt, larg) in ((428, 9, 3), (435, 14, 3.5), (441, 9, 2.5)):
        linguas.append((cx_, alt, larg, gl.random() * 6, 2))
    for (cx_, alt, larg) in ((434, 7, 2.2), (429, 4, 1.6), (440, 4, 1.6)):
        linguas.append((cx_, alt, larg, gl.random() * 6, 3))
    paleta = (("#c8301a", 1.0), ("#ff8a24", 1.45), ("#ffcc50", 1.9), ("#fff6d0", 2.3))
    base_f = 116
    for (cx_, alt, larg, fase, cam) in linguas:
        cor, k = paleta[cam]
        for y in range(base_f - alt - 1, base_f + 1):
            t = (base_f - y) / alt
            if t > 1:
                continue
            meia = larg * (1 - t) ** 0.75 * (0.75 + 0.25 * math.sin(t * 3.1))
            sway = 1.6 * math.sin(t * 4.2 + fase) * t
            for x in range(int(cx_ - larg - 3), int(cx_ + larg + 4)):
                if abs(x + 0.5 - cx_ - sway) <= meia:
                    e[y, x] = hexa(cor) * k * fk
                    chama.p(x, y, cor)
    # pontas soltas (labaredas que se desprendem)
    for (x, y, cam) in ((427, 92, 0), (436, 86, 0), (444, 93, 0), (433, 89, 1), (421, 99, 0), (447, 97, 1)):
        cor, k = paleta[cam]
        e[y, x] = hexa(cor) * k * fk
        e[y + 1, x] = hexa(cor) * k * fk
        chama.p(x, y, cor)
        chama.p(x, y + 1, cor)
    f.z_atual = 0.05
    for x in range(410, 458):
        f.p(x, 119, FERRO[3])
        if x % 4 == 0:
            f.p(x, 118, FERRO[2])
    for cx in (411, 455):
        f.ret(cx, 108, 2, 12, FERRO[2])
        f.ret(cx - 1, 106, 4, 2, FERRO[1])
        f.p(cx, 106, FERRO[0])
        f.p(cx + 1, 105, FERRO[0])
        f.ret(cx - 2, 120, 6, 2, FERRO[3])
    # toras: duas cruzadas atrás e uma grossa na frente (casca escura, topo com anéis)
    for (xa, ya, xb, yb, r) in ((416, 117, 446, 113, 2.0), (424, 113, 454, 117, 2.0), (414, 118, 452, 118, 2.6)):
        n = int(max(abs(xb - xa), abs(yb - ya)))
        for i in range(n + 1):
            t = i / n
            x, y = xa + (xb - xa) * t, ya + (yb - ya) * t
            for dy in np.arange(-r, r + 0.5, 1):
                k = 2 if dy < -r / 2 else 3 if dy < r / 2 else 4
                f.p(round(x), round(y + dy), CARVALHO[k])
        f.elipse(xa, ya, r * 0.8, r, "#a8784a")
        f.p(round(xa), round(ya), "#6a4422")
    # Brasas: rachaduras incandescentes nas toras e no leito de cinzas (emissivo).
    brasa = ruido(38, 2, W, H)
    e[f.c[:, :, 3] > 0.5] = 0                                   # as toras e os cães de ferro tapam as chamas
    for y in range(108, 123):
        for x in range(408, 460):
            if f.c[y, x, 3] > 0.5 and f.c[y, x, 0] < 0.5 or y >= 120:
                v = brasa[y, x]
                if v > 0.58:
                    e[y, x] = hexa("#ff5a14") * (v - 0.58) * 4.0 * fk
                if v > 0.76:
                    e[y, x] = hexa("#ffb040") * 1.3 * fk
    # fagulhas subindo
    for _ in range(16):
        x, y = 418 + int(g.random() * 32), 74 + int(g.random() * 20)
        e[y, x] += hexa("#ffb040") * (0.6 + g.random()) * fk
    # Caldeirão no braço de ferro, à esquerda do fogo.
    c.z_atual = 0.05
    c.linha(404, 82, 420, 82, FERRO[2])
    c.ret(404, 80, 2, 30, FERRO[2])
    c.ret(418, 82, 1, 6, FERRO[1])
    ferro_esc = ("#5a5a64", "#3a3a42", "#26262c", "#16161a")
    for y in range(88, 100):
        meia = 7 - abs(y - 93) * 0.45 if y > 90 else 6.5
        for x in range(int(418.5 - meia), int(418.5 + meia) + 1):
            k = 1 if x < 415 else 2 if x < 421 else 3
            if y >= 97:
                k = min(3, k + 1)
            c.p(x, y, ferro_esc[k])
    c.ret(410, 89, 17, 1, ferro_esc[0])
    c.p(411, 89, "#8a8a94")
    c.ret(410, 90, 1, 3, ferro_esc[0])                      # brilho do fogo na borda de baixo à direita
    for (x, y) in ((424, 96), (425, 95), (423, 97)):
        c.p(x, y, "#7a4a2a")
    c.ret(412, 88, 13, 1, "#5a6a3a")                       # sopa
    c.p(414, 88, "#7a8a4a")
    # Lenha empilhada ao lado da lareira e o atiçador/fole.
    for (lx, ly) in ((468, 118), (473, 118), (478, 118), (470, 113), (475, 113), (472, 108)):
        c.elipse(lx, ly, 2.6, 2.6, CARVALHO[3])
        c.elipse(lx, ly, 1.6, 1.6, "#b8885a")
        c.p(lx, ly, "#7a5232")
    c.ret(394, 92, 1, 30, FERRO[1])
    c.ret(393, 92, 3, 1, FERRO[0])
    c.p(395, 94, FERRO[1])
    # Lareira: soleira de pedra no chão (avança para a sala).
    c.z_atual = 0.12
    for y in range(CHAO, 128):
        t = (y - CHAO) / 16
        xa = int(388 - t * 8)
        for x in range(xa, W):
            junta = (x - xa) % 13 == 0 or y in (118, 123)
            k = 4 if junta else 3 if (x // 13 + y // 6) % 2 else 2
            if y in (CHAO, 119, 124) and not junta:
                k -= 1                                              # quina de cima de cada laje
            if y == 127:
                k = 5
            cor = cor_de(PEDRA[k]) * (0.92 + g.random() * 0.12)
            if not junta and g.random() < 0.05:
                cor = cor * 0.75                                    # cinza e fuligem
            c.p(x, y, np.clip(cor, 0, 1))
    return c, e, chama, f


# ─────────────────────────────── Lustre de roda e lanterna ───────────────────────────────
def lustre(c: Camada, e: np.ndarray, per: dict) -> list[tuple[int, int]]:
    """Lustre de roda de carroça com velas (acesas na tarde e à noite), pendurado na viga por correntes."""
    c.z_atual = 0.45
    cx, cy = LUSTRE[0], 24
    for (ax, ay) in ((cx - 16, cy), (cx + 16, cy), (cx, cy - 2)):
        for j in range(16, cy + 1):
            t = (j - 16) / max(cy - 16, 1)
            x = round(cx + (ax - cx) * t)
            c.p(x, j, FERRO[1] if j % 2 else FERRO[2])
    c.ret(cx - 1, 14, 3, 3, FERRO[1])
    # aro da roda em elipse e raios
    for k in range(80):
        ang = k / 80 * math.tau
        x, y = cx + 22 * math.cos(ang), cy + 3.4 * math.sin(ang)
        frente = math.sin(ang) > 0
        c.p(round(x), round(y), CARVALHO[1] if frente else CARVALHO[3])
        c.p(round(x), round(y) + 1, CARVALHO[2] if frente else CARVALHO[4])
    for k in range(8):
        ang = k / 8 * math.tau + 0.2
        c.linha(cx, cy, cx + 21 * math.cos(ang), cy + 3 * math.sin(ang), CARVALHO[2])
    c.elipse(cx, cy, 2.5, 1.5, CARVALHO[1])
    c.p(cx, cy, FERRO[0])
    chamas = []
    velas = []
    for k in range(8):
        ang = k / 8 * math.tau + 0.2
        velas.append((cy + 3.4 * math.sin(ang), cx + 22 * math.cos(ang), math.sin(ang) > 0))
    velas.sort()
    for (vy, vx, frente) in velas:
        vx, vy = round(vx), round(vy)
        alt = 5 if frente else 4
        c.ret(vx - 1, vy, 3, 1, FERRO[1])
        c.ret(vx, vy - alt, 1, alt, "#f4ead0" if frente else "#d8ccae")
        c.p(vx, vy - alt + 2, "#e8dcc0")
        c.p(vx + 1 if frente else vx - 1, vy - 1, "#f0e6cc")     # cera escorrida
        if per["velas"]:
            e[vy - alt - 1, vx] += hexa("#ffd070") * 1.5
            e[vy - alt - 2, vx] += hexa("#ff9a40") * 0.7
            chamas.append((vx, vy - alt - 1))
        else:
            c.p(vx, vy - alt - 1, "#2a2420")                      # pavio apagado
    return chamas


def penduricalhos(c: Camada, e: np.ndarray, per: dict) -> list[tuple[int, int]]:
    """Réstias de alho, ervas secas, um presunto e a lanterna do balcão pendurados na viga-mestra."""
    c.z_atual = 0.2
    g = np.random.default_rng(53)
    for (x, comp) in ((86, 14), (128, 11), (176, 13)):
        c.linha(x, 17, x, 17 + comp, "#8a7a5a")
        for j in range(3, comp, 2):
            for s in (-1, 1):
                c.elipse(x + s * 1.6, 17 + j + (s > 0), 1.6, 1.4, "#ece2cc")
                c.p(x + s * 1.6, 17 + j, "#ffffff", 0.6)
        c.p(x, 18 + comp, "#d8ccb0")
    for (x, comp, cor) in ((106, 12, "#5a7a3a"), (114, 10, "#7a8a4a"), (158, 13, "#6a5a3a"), (196, 9, "#5a7a3a")):
        c.linha(x, 17, x, 20, "#8a7a5a")
        c.ret(x - 1, 20, 3, 1, "#a0302a")
        for j in range(comp):
            larg = 1 + j // 3
            for dx in range(-larg, larg + 1):
                if g.random() < 0.75:
                    c.p(x + dx, 21 + j, tom(cor, 0.75 + g.random() * 0.5))
    # presunto
    c.linha(36, 17, 36, 21, "#8a7a5a")
    c.elipse(36, 28, 4, 7, "#8a3a2a")
    c.elipse(35, 27, 2.4, 5, "#a8503a")
    c.ret(35, 21, 2, 3, "#e8d8c0")
    # Lanterna de ferro sobre o balcão (acesa à noite).
    lx, ly = 136, 17
    c.ret(lx, ly, 1, 8, FERRO[1])
    c.ret(lx - 3, ly + 8, 7, 2, FERRO[1])
    c.ret(lx - 2, ly + 10, 5, 7, "#2a2620")
    c.ret(lx - 3, ly + 17, 7, 1, FERRO[1])
    c.ret(lx - 3, ly + 10, 1, 7, FERRO[2])
    c.ret(lx + 3, ly + 10, 1, 7, FERRO[2])
    luzes = []
    if per["lampiao"]:
        for y in range(ly + 11, ly + 17):
            for x in range(lx - 2, lx + 3):
                d = math.hypot(x - lx, y - (ly + 14))
                e[y, x] += hexa("#ffb860") * max(0.0, 1.3 - d * 0.35)
        e[ly + 14, lx] += hexa("#fff0c0") * 1.2
        luzes.append((lx, ly + 14))
    else:
        c.ret(lx - 2, ly + 10, 5, 7, "#4a4a48")
        c.p(lx - 1, ly + 11, "#a8b0b0")
    return luzes


# ─────────────────────────────── Assoalho ───────────────────────────────
def assoalho() -> Camada:
    c = Camada(0.0)
    fx, fy = FUGA
    g = np.random.default_rng(17)
    veio = ruido(19, 2, 400, 200)
    tabuas = ["#6a4226", "#7a4e2c", "#5e3a20", "#704830", "#664028", "#5a3a22"]
    desloc = g.random(200) * 30
    nos = g.random(200)
    for y in range(CHAO, H):
        d = y - fy
        c.z[y, :] = (y - CHAO) / (H - CHAO)
        for x in range(W):
            X = (x + 0.5 - fx) * 82 / d
            Zw = 82 * 82 / d
            b = int(math.floor(X / 8)) + 100
            Xa = (x - 0.5 - fx) * 82 / d
            costura = int(math.floor(Xa / 8)) + 100 != b
            emenda = int((Zw + desloc[b % 200]) / 30) != int((82 * 82 / (d - 1) + desloc[b % 200]) / 30)
            base = hexa(tabuas[(b * 7) % 6])
            v = veio[int((Zw * 6) % 200), int((X * 1.7) % 400)]
            k = 0.84 + v * 0.3
            fr = (X / 8) % 1
            if fr < 0.14:
                k *= 1.12                                      # quina clara da tábua
            if costura or emenda:
                k = 0.42
            if nos[b % 200] > 0.8 and abs(((Zw + desloc[b % 200] * 3) % 47) - 20) < 0.9 and 0.3 < fr < 0.7:
                k = 0.55                                       # nó da madeira
            c.c[y, x, :3] = np.clip(base * k, 0, 1)
            c.c[y, x, 3] = 1
    for x in range(W):
        c.c[CHAO, x, :3] *= 0.45
        c.c[CHAO + 1, x, :3] *= 0.7
    # Palha e serragem espalhadas, uma moeda perdida, manchas de cerveja.
    for _ in range(160):
        x, y = int(g.random() * W), CHAO + 3 + int(g.random() * (H - CHAO - 4))
        if 328 <= x <= 382 and y > 120 and g.random() < 0.7:
            continue
        c.p(x, y, "#c8a860" if g.random() < 0.6 else "#a88848", 0.75)
        if g.random() < 0.4:
            c.p(x + 1, y, "#b89850", 0.6)
    for (cx, cy, rx, ry) in ((118, 140, 9, 2), (232, 156, 12, 2.4), (420, 150, 8, 1.6)):
        c.elipse(cx, cy, rx, ry, "#2a160a", 0.28)
    c.p(352, 156, LATAO[1])
    c.p(353, 156, LATAO[2])
    return c


# ─────────────────────────────── Mesas, cadeiras e cartas ───────────────────────────────
def carta(c: Camada, x: int, y: int, virada: bool, inclina: int = 0, w: int = 8, h: int = 4) -> None:
    """Uma carta deitada na mesa (vista de cima em perspectiva): verso vermelho com filete dourado e losango, ou a
    frente (cartão de estudo) com o desenho de um osso."""
    c.ret(x + round(inclina / 2) + 1, y + h, w, 1, "#1a0e06", 0.4)          # sombrinha
    for j in range(h):
        dx = round(inclina * j / max(h - 1, 1))
        for i in range(w):
            xx, yy = x + i + dx, y + j
            if virada:
                cor = "#fff8e4" if j == 0 else PAPEL[0] if j < h - 1 else PAPEL[1]
                if i == w - 1:
                    cor = PAPEL[2]
            else:
                borda = i in (0, w - 1) or j in (0, h - 1)
                centro = abs(i - (w - 1) / 2) + abs(j - (h - 1) / 2) * 1.6 < 1.6
                cor = VERSO[2] if borda or centro else (VERSO[0] if (i + j) % 2 else VERSO[1])
                if borda and j == h - 1:
                    cor = "#a87a30"
            c.p(xx, yy, cor)
    if virada:   # osso de desenho: diáfise e as duas pontas bilobadas (um nó em cima e outro embaixo)
        my = y + max(1, h // 2)
        off = round(inclina * (my - y) / max(h - 1, 1))
        xa, xb = x + 1 + off, x + w - 2 + off
        c.ret(xa + 1, my, xb - xa - 1, 1, "#8a7a60")
        for ex in (xa, xb):
            c.p(ex, my - 1, "#4a3a28")
            if my + 1 < y + h:
                c.p(ex, my + 1, "#4a3a28")
            else:
                c.p(ex, my, "#4a3a28")


def cadeira_de_tras(c: Camada, cx: int, topo: int, yb: int) -> None:
    """Cadeira atrás da mesa, de frente para a câmera: só o encosto de travessas aparece acima do tampo."""
    w = 16
    x = cx - w // 2
    for xx in (x, x + w - 2):
        c.ret(xx, topo, 2, yb - topo, CARVALHO[2])
        c.ret(xx, topo, 1, yb - topo, CARVALHO[1])
        c.p(xx, topo - 1, CARVALHO[0])
        c.p(xx + 1, topo - 1, CARVALHO[1])
    for yy in (topo + 2, topo + 6, topo + 10):
        c.ret(x + 2, yy, w - 4, 2, CARVALHO[1])
        c.ret(x + 2, yy, w - 4, 1, CARVALHO[0])
        c.ret(x + 2, yy + 2, w - 4, 1, CARVALHO[4], 0.6)
    c.ret(x + 6, topo + 3, 4, 2, CARVALHO[2])               # entalhe de coração no espaldar
    c.p(x + 7, topo + 3, "#2a160a")
    c.p(x + 8, topo + 3, "#2a160a")


def cadeira_de_lado(c: Camada, x: int, yb: int, virada_dir: bool = True) -> None:
    """Cadeira de perfil virada para a mesa: encosto alto do lado de fora, assento grosso e pernas abertas."""
    w = 15
    ys = yb - 13
    ex = x if virada_dir else x + w - 2                       # o encosto fica do lado oposto à mesa
    c.ret(ex, ys - 20, 2, 20 + 13, CARVALHO[2])
    c.ret(ex, ys - 20, 1, 20 + 13, CARVALHO[1])
    c.p(ex, ys - 21, CARVALHO[0])
    for yy in range(ys - 18, ys - 2, 5):
        c.ret(ex + (2 if virada_dir else -2), yy, 2, 3, CARVALHO[2])
        c.p(ex + (2 if virada_dir else -1), yy, CARVALHO[1])
    c.ret(x, ys, w, 3, CARVALHO[1])
    c.ret(x, ys, w, 1, CARVALHO[0])
    c.ret(x, ys + 2, w, 1, CARVALHO[3])
    c.ret(x + 3, ys + 1, 9, 1, CARVALHO[2])                   # almofadinha de palha
    for i in range(3, 12, 2):
        c.p(x + i, ys + 1, "#a8884a")
    pf = x + w - 2 if virada_dir else x
    c.linha(pf, ys + 3, pf + (1 if virada_dir else -1), yb, CARVALHO[2])
    c.linha(ex + 1, ys + 3, ex + (-1 if virada_dir else 1) + 1, yb, CARVALHO[3])
    c.ret(min(pf, ex) + 1, yb - 5, w - 3, 1, CARVALHO[3])


def tampo(c: Camada, cx: int, cy: int, rx: int, ry: float) -> None:
    """Tampo redondo de tábuas grossas visto de cima, com a borda (espessura) e as cabeças de prego."""
    for x in range(cx - rx, cx + rx + 1):
        t = (x + 0.5 - cx) / rx
        if abs(t) > 1:
            continue
        yb_ = cy + ry * math.sqrt(1 - t * t)
        luz = 1.0 - (t + 1) * 0.12
        for k, cor in enumerate((CARVALHO[1], CARVALHO[2], CARVALHO[3], CARVALHO[4])):
            c.p(x, round(yb_) + k, tom(cor, luz))
    veio = ruido(57, 2, 100, 40)
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(cx - rx - 1, cx + rx + 2):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d <= 1:
                u = x - cx + rx
                tab = u // 7
                v = veio[(y - cy + 20) % 40, (u * 2 + tab * 13) % 100]
                k = 0.88 + v * 0.26 + 0.05 * (tab % 2)
                cor = cor_de(CARVALHO[0 if d > 0.86 and y < cy else 1]) * k
                if u % 7 == 0:
                    cor = cor_de(CARVALHO[3])
                elif u % 7 == 1:
                    cor = cor * 1.08
                c.p(x, y, np.clip(cor, 0, 1))
    for u in range(3, 2 * rx, 7):
        c.p(cx - rx + u, cy - int(ry * 0.6), FERRO[1])
        c.p(cx - rx + u, cy + int(ry * 0.6), FERRO[1])


def pe_de_mesa(c: Camada, cx: int, y0: int, base: int, abre: int = 14) -> None:
    """Pé central torneado e quatro pés em cruz."""
    c.ret(cx - 3, y0, 7, base - y0 - 2, CARVALHO[2])
    c.ret(cx - 3, y0, 1, base - y0 - 2, CARVALHO[1])
    c.ret(cx - 2, y0, 1, base - y0 - 2, CARVALHO[0])
    c.ret(cx + 3, y0, 1, base - y0 - 2, CARVALHO[4])
    for yy in (y0 + 3, base - 7):
        c.ret(cx - 4, yy, 9, 2, CARVALHO[1])
        c.ret(cx - 4, yy + 1, 9, 1, CARVALHO[3])
    for (dx, dy, cor) in ((-abre, 1, CARVALHO[2]), (abre, 1, CARVALHO[3]), (-abre // 2, 3, CARVALHO[1]), (abre // 2, 3, CARVALHO[2])):
        c.linha(cx, base - 3, cx + dx, base + dy - 1, cor)
        c.linha(cx, base - 2, cx + dx, base + dy, CARVALHO[3])
        c.ret(cx + dx - 1, base + dy - 1, 3, 2, CARVALHO[3])
    c.ret(cx - 3, base - 4, 7, 3, CARVALHO[2])


def mesa_fundo(c: Camada, cx: int, cy: int) -> None:
    pe_de_mesa(c, cx, cy + 4, cy + 18, 10)
    tampo(c, cx, cy, 15, 3.5)
    caneca(c, cx - 7, cy + 1, "#8a8a90", espuma=False)
    caneca(c, cx + 3, cy + 2, "#8a6a4a", espuma=True)
    carta(c, cx - 3, cy - 2, False, 1, 6, 2)


def mesa_de_cartas(c: Camada, e: np.ndarray, per: dict) -> list:
    """A mesa principal: tampo grande, baralho, cartas espalhadas (cartões de estudo; uns virados com o osso), a mão
    de cartas em leque apoiada na caneca (o fêmur na da frente), canecas, dado e o toco de vela."""
    luzes = []
    cx, cy, rx, ry = 297, 117, 30, 8.5
    pe_de_mesa(c, cx, cy + 10, 145, 16)
    tampo(c, cx, cy, rx, ry)
    # baralho (pilha com as bordas das cartas em camadas)
    bx, by = cx - 13, cy - 5
    for k in range(5):
        c.ret(bx, by + 4 - k, 9, 1, PAPEL[1] if k % 2 else PAPEL[2])
        c.p(bx + 8, by + 4 - k, PAPEL[2])
    carta(c, bx, by - 3, False, 0, 9, 3)
    c.ret(bx - 1, by + 5, 11, 1, "#1a0e06", 0.4)
    # cartas espalhadas
    for (x, y, vir, inc) in ((cx - 25, cy - 1, True, 0), (cx - 3, cy - 4, True, 1), (cx + 7, cy - 6, False, -1),
                             (cx - 14, cy + 2, False, 1), (cx - 3, cy + 3, True, -1), (cx + 8, cy + 1, True, 0),
                             (cx - 25, cy + 3, False, 2)):
        carta(c, x, y, vir, inc)
    # mão de cartas em leque, de pé, apoiada na caneca (a da frente mostra o fêmur)
    caneca(c, cx + 20, cy - 3, "#9a7a5a", espuma=True, alt=8)
    leque = ((-3, VERSO[0], -1), (0, VERSO[1], 0), (3, None, 1))
    for (dx, cor, inc) in leque:
        x0, y0 = cx + 15 + dx, cy - 13 + abs(inc)
        for j in range(10):
            xx = x0 + round(inc * (9 - j) / 9)
            if cor is None:
                c.ret(xx, y0 + j, 6, 1, "#fff8e4" if j == 0 else PAPEL[0])
                c.p(xx + 5, y0 + j, PAPEL[2])
            else:
                c.ret(xx, y0 + j, 6, 1, VERSO[2] if j in (0, 9) else cor)
                c.p(xx, y0 + j, VERSO[2])
                c.p(xx + 5, y0 + j, tom(VERSO[2], 0.7))
        if cor is None:     # fêmur desenhado: cabeça, colo, diáfise e côndilos
            fx, fy = x0 + 1, y0 + 1
            c.p(fx, fy, "#4a3a28")
            c.p(fx + 1, fy, "#5a4a36")
            c.p(fx + 1, fy + 1, "#5a4a36")
            c.p(fx + 2, fy + 1, "#6a5a42")
            for j in range(2, 7):
                c.p(fx + 2, fy + j, "#6a5a42")
            c.p(fx + 1, fy + 7, "#4a3a28")
            c.p(fx + 3, fy + 7, "#4a3a28")
            c.p(fx + 2, fy + 7, "#6a5a42")
    # caneca de estanho do outro lado, um dado e o toco de vela num pires de estanho
    caneca(c, cx - 30, cy - 3, "#8a8a90", espuma=True, alt=6, asa_dir=False)
    c.ret(cx + 4, cy + 3, 3, 3, "#f4ece0")
    c.ret(cx + 4, cy + 3, 3, 1, "#ffffff")
    c.p(cx + 5, cy + 4, "#2a1a10")
    c.ret(cx + 4, cy + 6, 3, 1, "#1a0e06", 0.4)
    vx, vy = cx - 18, cy - 7
    c.elipse(vx, vy + 1, 3.5, 1.2, "#8a96a0")
    c.p(vx - 2, vy + 1, "#c8d0d8")
    c.ret(vx - 1, vy - 5, 3, 6, "#efe4c8")
    c.p(vx - 1, vy - 5, "#d8cca8")
    c.p(vx + 1, vy - 2, "#e8dcc0")
    c.p(vx + 2, vy, "#e8dcc0")
    if per["velas"]:
        e[vy - 6, vx] += hexa("#fff0b0") * 1.8
        e[vy - 7, vx] += hexa("#ffb050") * 1.0
        e[vy - 8, vx] += hexa("#ff7a30") * 0.4
        luzes.append((vx, vy - 6))
    else:
        c.p(vx, vy - 6, "#2a2420")
    return luzes


def mobilia(per: dict) -> tuple[Camada, Camada, np.ndarray, list, list]:
    """Mesinha do fundo (z menor) e a mesa principal de cartas com as cadeiras (z maior)."""
    fundo = Camada(0.45)
    frente = Camada(0.62)
    e = np.zeros((H, W, 3), dtype=np.float32)
    # Mesinha do fundo com uma cadeira e uma banqueta, entre o balcão e a janela.
    cadeira_de_tras(fundo, 172, 100, 128)
    mesa_fundo(fundo, 174, 112)
    fundo.ret(186, 120, 10, 2, CARVALHO[1])
    fundo.ret(186, 120, 10, 1, CARVALHO[0])
    fundo.linha(188, 122, 187, 131, CARVALHO[2])
    fundo.linha(194, 122, 195, 131, CARVALHO[3])
    # Mesa principal: cadeira atrás, a mesa, cadeira à esquerda.
    cadeira_de_tras(frente, 299, 95, 134)
    cadeira_de_lado(frente, 247, 147, True)
    luzes = mesa_de_cartas(frente, e, per)
    # Cartas caídas no chão perto da cadeira (o chão do mascote fica livre).
    frente.z_atual = 0.7
    carta(frente, 263, 148, True, 1, 7, 2)
    carta(frente, 274, 151, False, -1, 7, 2)
    objetos = [((150, 88, 205, 132), 131), ((240, 90, 330, 150), 146)]
    return fundo, frente, e, luzes, objetos


# ─────────────────────────────── Primeiro plano ───────────────────────────────
def primeiro_plano() -> Camada:
    """Perto da câmera (vai desfocado): ramos de ervas penduradas no alto à direita."""
    c = Camada(1.0)
    g = np.random.default_rng(81)
    for (x, comp) in ((452, 26), (466, 20), (476, 30)):
        c.linha(x, 0, x, 4, "#6a5a3a")
        for j in range(comp):
            larg = 1 + j // 4
            for dx in range(-larg, larg + 1):
                if g.random() < 0.7:
                    c.p(x + dx, 4 + j, tom("#4a5a2a", 0.6 + g.random() * 0.5))
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


YS, XS = (m / ESC for m in np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32))


def luz3d(cx: float, cy: float, cz: float, raio: float, z: np.ndarray, prof: float = 80.0, achatar: float = 1.0) -> np.ndarray:
    """Luz pontual com profundidade: núcleo gaussiano + cauda longa (1/d²)."""
    d2 = ((XS - cx) ** 2 + ((YS - cy) / achatar) ** 2 + ((z - cz) * prof) ** 2) / raio ** 2
    return np.exp(-d2 * 2.2) * 0.7 + 0.3 / (1 + d2 * 6)


def em_faixas(v: np.ndarray, passos: int = 6, k: float = 0.45) -> np.ndarray:
    """Borda em faixas (a poça de luz em degraus, como nos jogos), misturada à luz contínua."""
    return v * (1 - k) + np.floor(v * passos) / passos * k


def contraluz(alfa: np.ndarray, dx: int, dy: int) -> np.ndarray:
    viz = np.roll(np.roll(alfa, -dy, 0), -dx, 1)
    return ((alfa > 0.5) & (viz < 0.5)).astype(np.float32)


def sombra_do_sol(alfa: np.ndarray, objetos, desce: float, lado: float) -> np.ndarray:
    """Projeta no chão a silhueta de cada objeto (pé em y_base) na direção do sol: um ponto a h px do chão cai
    h*desce mais perto da câmera e h*desce*lado para o lado."""
    s = np.zeros((H * 2, W * 2), dtype=np.float32)
    for (x0, y0, x1, y1), yb in objetos:
        ys, xs = np.nonzero(alfa[y0:y1, x0:x1] > 0.5)
        ys, xs = ys + y0, xs + x0
        hgt = np.clip(yb - ys, 0, None).astype(np.float32)
        for sub in (0.0, 0.5):
            dy = hgt * desce + sub
            sx = ((xs + 0.5 + dy * lado) * 2).astype(int)
            sy = ((yb + dy) * 2).astype(int)
            ok = (sx >= 0) & (sx < W * 2) & (sy >= 0) & (sy < H * 2)
            s[sy[ok], sx[ok]] = 1
    s = np.asarray(Image.fromarray((s * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR), dtype=np.float32) / 255
    return np.clip(s * 1.6, 0, 1)


def sombra_do_fogo(alfa: np.ndarray, objetos, luz_chao: tuple[float, float], hl: float) -> np.ndarray:
    """Sombra no chão a partir de uma luz pontual (o fogo) a hl px de altura sobre o ponto luz_chao do assoalho."""
    lx, ly = luz_chao
    s = np.zeros((H, W), dtype=np.float32)
    for (x0, y0, x1, y1), yb in objetos:
        ys, xs = np.nonzero(alfa[y0:y1, x0:x1] > 0.5)
        ys, xs = ys + y0, xs + x0
        hgt = np.clip(yb - ys, 0, hl - 1).astype(np.float32)
        r = np.clip(hl / (hl - hgt), 1, 3.5)
        sx = (lx + (xs - lx) * r).astype(int)
        sy = (ly + (yb - ly) * r).astype(int)
        ok = (sx >= 0) & (sx < W) & (sy >= CHAO) & (sy < H)
        s[sy[ok], sx[ok]] = 1
    return s


def feixe_da_janela(trans: np.ndarray, opacos: np.ndarray, per: dict) -> tuple[np.ndarray, np.ndarray]:
    """Projeta cada pedacinho do vidro até o chão: o caminho vira o feixe volumétrico e o fim vira a mancha de luz
    da janela no assoalho (com a sombra dos caixilhos). Quanto mais baixo o sol, mais longe a mancha."""
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
    altura = CHAO - wy                                         # quanto o ponto do vidro está acima do chão
    dy = altura * per["desce"]
    destino_y = CHAO + dy
    escala = (destino_y - FUGA[1]) / (CHAO - FUGA[1])           # perspectiva: o chão abre ao vir para a câmera
    destino_x = FUGA[0] + (wx + dy * per["lado"] - FUGA[0]) * escala
    g = np.random.default_rng(93)
    faixas = np.repeat(g.random(48), 3)
    faixas = np.convolve(faixas, np.ones(3) / 3, mode="same")
    idx = np.clip(((wx - JAN[0]) * 1.1 + (wy - JAN[1]) * 0.3).astype(int), 0, len(faixas) - 1)
    raio_peso = pw * (0.2 + 1.5 * faixas[idx] ** 2)
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
            perto = min(1.0, max(0.0, (t - 0.1) / 0.35)) ** 1.5
            np.add.at(feixe, (py[ok], px[ok]), raio_peso[ok] * perto * (1 - 0.6 * t ** 2))
    feixe = desfocar(feixe[:, :, None], 3)[:, :, 0]
    feixe *= 0.55 + 0.9 * ruido_feixe
    feixe *= 1 - opacos * 0.85
    mancha = desfocar(mancha[:, :, None], 1.4)[:, :, 0]
    mancha = mancha / max(np.percentile(mancha[mancha > 0], 85), 1e-6)
    return feixe / max(np.percentile(feixe, 99.7), 1e-6), np.clip(mancha, 0, 1.25)


def compor(camadas) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    alb = np.zeros((H, W, 3), dtype=np.float32)
    z = np.zeros((H, W), dtype=np.float32)
    eh_chao = np.zeros((H, W), dtype=np.float32)
    for cam, chao_ in camadas:
        a = cam.c[:, :, 3:4]
        alb = alb * (1 - a) + cam.c[:, :, :3] * a
        if chao_ >= 0:
            sel = cam.c[:, :, 3] > 0.5
            z[sel] = cam.z[sel]
            eh_chao[sel] = chao_
    return alb, z, eh_chao


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    emis1 = np.zeros((H, W, 3), dtype=np.float32)
    par, e0 = parede(per)
    emis1 += e0
    emis_jan, trans = janela(par, nome, per)
    quadro = quadro_avisos(per)
    bal_fundo, bal_frente, e_bal = balcao(per)
    emis1 += e_bal
    lar, e_lar, chama, lenha = lareira(per, nome)
    emis1 += e_lar
    meio = Camada(0.3)
    luzes_pend = penduricalhos(meio, emis1, per)
    chamas_lustre = lustre(meio, emis1, per)
    chao = assoalho()
    mob_fundo, mob_frente, e_mob, luzes_mesa, objetos = mobilia(per)
    emis1 += e_mob
    fg = primeiro_plano()

    alb, z, eh_chao = compor(((par, 0), (chao, 1), (quadro, 0), (bal_fundo, 0), (lar, 0), (chama, 0), (lenha, 0), (meio, 0),
                              (bal_frente, 0), (mob_fundo, 0), (mob_frente, 0)))
    # A soleira de pedra da lareira é chão também (recebe sombras e o sol).
    soleira = (lar.c[:, :, 3] > 0.5) & (np.arange(H)[:, None] >= CHAO)
    eh_chao[soleira] = 1
    vidro = (trans > 0).astype(np.float32)

    # Sombras projetadas no chão: do sol/luar (pela janela) e do fogo.
    alfa_obj = np.maximum.reduce([mob_frente.c[:, :, 3], mob_fundo.c[:, :, 3]])
    s_sol = sombra_do_sol(alfa_obj, objetos, per["desce"], per["lado"])
    s_fogo = sombra_do_fogo(mob_frente.c[:, :, 3], objetos[1:], (FOGO[0], 122), 16)
    s_fogo = np.maximum(s_fogo, sombra_do_fogo(bal_frente.c[:, :, 3], [((0, 86, 156, 131), 124)], (FOGO[0], 122), 16) * 0.6)
    ao = Camada(0.5)                                              # oclusão de contato sob os móveis
    for (cx, cy, rx, ry, a) in ((297, 144, 22, 3.2, 0.7), (176, 132, 15, 2.4, 0.6), (258, 147, 10, 2, 0.6),
                                 (303, 138, 10, 2, 0.5), (76, 126, 80, 3, 0.55), (38, 131, 9, 1.5, 0.5), (98, 131, 9, 1.5, 0.5),
                                 (430, 124, 34, 2, 0.4), (190, 131, 6, 1.4, 0.5)):
        for k in range(4):
            ao.elipse(cx, cy, rx * (1 - k * 0.2), ry * (1 - k * 0.2), "#000000", a * 0.3)
    ao_m = ao.c[:, :, 3]

    # Contraluz em 1x: o fogo acende as bordas voltadas para ele; a janela, as bordas viradas para ela.
    rim_fogo = np.zeros((H, W), dtype=np.float32)
    rim_jan = np.zeros((H, W), dtype=np.float32)
    ys1, xs1 = np.mgrid[0:H, 0:W]
    for cam in (meio, bal_frente, mob_fundo, mob_frente, quadro):
        al = cam.c[:, :, 3]
        for (lx, ly, alvo) in ((FOGO[0], FOGO[1] - 6, rim_fogo), ((JAN[0] + JAN[2]) / 2, 60, rim_jan)):
            ddx = np.sign(lx - xs1).astype(int)
            ddy = np.sign(ly - ys1).astype(int)
            for sx in (-1, 0, 1):
                for sy in (-1, 0, 1):
                    if sx == 0 and sy == 0:
                        continue
                    m = contraluz(al, sx, sy) * ((ddx == sx) & (ddy == sy))
                    np.maximum(alvo, m, out=alvo)

    alb3 = ampliar(alb)
    z3 = desfocar(ampliar(z[:, :, None]), 1.0)[:, :, 0]
    chao3 = ampliar(eh_chao[:, :, None])[:, :, 0]
    emis3 = ampliar(emis1)
    jan3 = ampliar(emis_jan)
    vidro3 = ampliar(vidro[:, :, None])[:, :, 0]
    s_sol3 = desfocar(ampliar(s_sol[:, :, None]), 1.2)[:, :, 0]
    s_fogo3 = desfocar(ampliar(s_fogo[:, :, None]), 3.5)[:, :, 0] * chao3
    ao3 = desfocar(ampliar(ao_m[:, :, None]), 2.0)[:, :, 0]
    fx, fy = FOGO

    # ── Luz: ambiente + claridade da janela + mancha de sol + fogo (em faixas) + velas e lanterna.
    amb = hexa(per["amb"]) * per["amb_k"]
    luz = np.zeros_like(alb3) + amb
    # a sala clareia perto da janela (luz do céu rebatida)
    jx = (JAN[0] + JAN[2]) / 2
    ceu_med = emis_jan[JAN[1]:JAN[3], JAN[0]:JAN[2]].reshape(-1, 3).mean(0)
    luz += luz3d(jx, 66, 0.2, 150, z3, achatar=0.8)[:, :, None] * ceu_med * (0.9 if nome != "noite" else 0.7)
    luz += luz3d(jx + 60, 120, 0.5, 220, z3, achatar=0.6)[:, :, None] * hexa(per["sol"]) * 0.25 * per["sol_k"]
    # fogo: poça em faixas, com cintilação na borda
    k_f = per["fogo_k"]
    fogo = luz3d(fx, fy - 4, 0.15, 150, z3, prof=90, achatar=0.85) * 1.1 + luz3d(fx, fy - 4, 0.15, 45, z3, prof=60) * 0.9
    fogo = em_faixas(fogo, 7, 0.4)
    # a pedra da lareira por dentro do arco não recebe o fogo de frente (é o fundo); o console faz sombra acima
    fogo *= 1 - (s_fogo3 * 0.85)
    luz += fogo[:, :, None] * hexa("#ff9a4a") * 1.45 * k_f
    if per["velas"]:
        chamas_lustre = chamas_lustre + [(396, 53), (468, 55)]
    for (vx, vy) in chamas_lustre:
        luz += em_faixas(luz3d(vx, vy, 0.4, 44, z3, prof=60), 5, 0.3)[:, :, None] * hexa("#ffb860") * 0.24
    for (vx, vy) in luzes_mesa:
        luz += em_faixas(luz3d(vx, vy, 0.62, 34, z3, prof=50), 5, 0.4)[:, :, None] * hexa("#ffb860") * 0.6
    for (vx, vy) in luzes_pend:
        luz += em_faixas(luz3d(vx, vy, 0.25, 90, z3, prof=50), 6, 0.4)[:, :, None] * hexa("#ffa850") * 0.75
    if per["velas"]:
        luz += luz3d(142, 80, 0.32, 26, z3, prof=50)[:, :, None] * hexa("#ffb050") * 0.45
    luz *= (1 - ao3 * 0.8)[:, :, None]

    # ── Feixe e mancha de luz da janela no chão (com as sombras projetadas do sol).
    opacos = ampliar(np.maximum.reduce([mob_frente.c[:, :, 3], mob_fundo.c[:, :, 3], bal_frente.c[:, :, 3]])[:, :, None])[:, :, 0]
    feixe, mancha = feixe_da_janela(trans, opacos, per)
    luz_sol = (mancha * chao3 * (1 - s_sol3 * 0.9))[:, :, None] * hexa(per["sol"]) * 1.6 * per["sol_k"]
    luz += luz_sol

    img = alb3 * luz
    # Contraluz.
    rf = desfocar(ampliar(rim_fogo[:, :, None]), 0.6)[:, :, 0] * np.clip(fogo * 1.5, 0, 1)
    img += (rf * 0.4 * k_f)[:, :, None] * hexa("#ffc070")
    rj = desfocar(ampliar(rim_jan[:, :, None]), 0.6)[:, :, 0] * np.clip(luz3d(jx, 60, 0.0, 120, np.zeros_like(z3)) * 1.3, 0, 1)
    img += (rj * 0.3 * per["sol_k"])[:, :, None] * hexa(per["sol"])
    # Janela (vidro emissivo) e emissivos (chamas, brasas, velas).
    img = img * (1 - vidro3[:, :, None]) + jan3 * vidro3[:, :, None]
    img += emis3

    # Feixe volumétrico com poeira.
    img += feixe[:, :, None] * hexa(per["sol"]) * 0.75 * per["feixe_k"]
    g = np.random.default_rng(5)
    poeira = np.zeros(feixe.shape, dtype=np.float32)
    for _ in range(3200):
        x, y = int(g.random() * W * ESC), int(g.random() * H * ESC)
        if feixe[y, x] > 0.12 and g.random() < feixe[y, x]:
            poeira[y, x] = 0.4 + g.random() * 0.8
            if g.random() < 0.3 and x + 1 < W * ESC:
                poeira[y, x + 1] = poeira[y, x] * 0.5
    for _ in range(170):                                       # fagulhas e poeira dourada perto do fogo
        ang, r = g.random() * math.tau, g.random() ** 0.6 * 40
        x, y = int((fx + math.cos(ang) * r * 0.8) * ESC), int((fy - 22 + math.sin(ang) * r * 0.6) * ESC)
        if 0 <= x < W * ESC and 0 <= y < H * ESC:
            poeira[y, x] = -(0.3 + g.random() * 0.6)
    img += np.clip(poeira, 0, None)[:, :, None] * hexa(per["poeira"]) * 0.5 * per["feixe_k"]
    img += np.clip(-poeira, 0, None)[:, :, None] * hexa("#ffc070") * 0.55 * k_f

    # Halo das chamas.
    halo = luz3d(fx, fy - 2, 0, 30, np.zeros_like(z3)) * 0.35 + luz3d(fx, fy, 0, 10, np.zeros_like(z3)) * 0.5
    halo *= k_f
    for (vx, vy) in chamas_lustre + luzes_mesa:
        halo += luz3d(vx, vy, 0, 5, np.zeros_like(z3)) * 0.35
    for (vx, vy) in luzes_pend:
        halo += luz3d(vx, vy, 0, 8, np.zeros_like(z3)) * 0.45
    img += halo[:, :, None] * hexa("#ffb060")

    # Fumaça da chaminé subindo pelo vão (só um véu) e vapor da sopa.
    fum = ruido(97, 5)
    fum3 = ampliar(fum[:, :, None])[:, :, 0] * np.clip(1 - np.abs(XS - 433) / 22, 0, 1) * np.clip((96 - YS) / 18, 0, 1) * np.clip((YS - 76) / 6, 0, 1)
    img += fum3[:, :, None] * hexa("#ffd8b0") * 0.08 * k_f

    # Primeiro plano desfocado e escuro.
    fg3 = desfocar_rgba(ampliar(fg.c), 6)
    fgc = fg3[:, :, :3] * (amb * 0.55 + luz3d(fx, fy, 1.0, 260, np.ones_like(z3))[:, :, None] * hexa("#ff9a50") * 0.25 * k_f)
    img = img * (1 - fg3[:, :, 3:4]) + fgc * fg3[:, :, 3:4]

    # Brilho (bloom).
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.68) * 3, 0, 1), 0, 2.5)
    img += desfocar(claro, 16) * 0.45 + desfocar(claro, 4) * 0.35

    # Mapeamento de tons.
    lum = img.mean(2, keepdims=True)
    comp = np.where(lum > 0.62, 0.62 + (lum - 0.62) / (1 + (lum - 0.62) * 1.6), lum) / np.maximum(lum, 1e-4)
    img = img * comp
    lum2 = img.mean(2, keepdims=True)
    img = img + (lum2 - img) * np.clip((lum2 - 0.72) * 0.8, 0, 0.35)

    # Correção de cor: luzes quentes, sombras frias; contraste.
    quente, fria = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * quente + (1 - lum) * (fria * 0.6 + 0.4)))
    img = np.clip((img - 0.45) * 1.1 + 0.45, 0, 1.4)

    # Lado esquerdo mais calmo (o texto vai ali).
    calma = np.clip((0.45 - XS / W) / 0.17, 0, 1)[:, :, None]
    media = img.mean(2, keepdims=True)
    suave_ = (media + (img - media) * 0.72) * 0.86 + hexa("#0c1228") * 0.05
    img = img * (1 - calma) + suave_ * calma

    # Vinheta e grão.
    v = ((XS / W - 0.6) ** 2 * 1.2 + (YS / H - 0.6) ** 2 * 0.9)
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.0)[:, :, None]
    g = np.random.default_rng(99)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.018
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    nomes = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in nomes:
        img = montar(nome)
        a = PASTA / f"taverna-{nome}.webp"
        b = PASTA / f"taverna-{nome}-960.webp"
        img.save(a, quality=83, method=6)
        img.resize((960, 320), Image.LANCZOS).save(b, quality=83, method=6)
        for f in (a, b):
            print(f.name, f.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
