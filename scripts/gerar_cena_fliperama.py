"""Cenário "HD-2D" do post "TILT! O fliperama do MIRELS" (Instagram, 03/11/2026, pedido do Tales).

Arte original feita por código (numpy + PIL): nada baixado nem gerado por IA. A noite na taverna da vila: parede de
taipa com enxaimel e lambri, janela redonda com a lua, a lanterna pendurada à esquerda e a lareira fora do quadro à
direita; no meio, a máquina de fliperama de madeira e latão, com o letreiro MIRELS no vidro de cima, o placar de
pontos em matriz de pontos âmbar e quatro bumpers no tampo (local, tamanho, tipo e dor). A máquina é a luz principal
da cena: o letreiro, o placar e o bumper aceso pintam a parede e o assoalho.

Cada slide pede um estado da máquina (o bumper aceso e o número no placar); o número é desenhado no placar da própria
arte, então cada imagem tem exatamente o placar daquele slide. O lado esquerdo (x < 150 da arte) fica calmo e
escuro para o texto do post.

Arte base 360 x 450 (feed, 1080 x 1350) ou 360 x 640 (stories, 1080 x 1920), ampliada 3x com a luz calculada.
Uso: python3 scripts/gerar_cena_fliperama.py <pasta de saída>
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ESC = 3
W = 360
H = 450          # trocado por configurar()
CHAO = 352       # linha onde a parede encontra o assoalho (trocada por configurar())
DY = 0           # deslocamento vertical da máquina (stories)


def configurar(altura: int) -> None:
    global H, CHAO, DY, YS, XS
    H = altura
    DY = 0 if altura == 450 else 150
    CHAO = 352 + DY
    YS, XS = (m / ESC for m in np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32))


def hexa(c: str) -> np.ndarray:
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def cor_de(cor) -> np.ndarray:
    return hexa(cor) if isinstance(cor, str) else np.asarray(cor, dtype=np.float32)


def mistura(a, b, t: float) -> np.ndarray:
    return cor_de(a) * (1 - t) + cor_de(b) * t


def ruido(seed: int, escala: int, w: int | None = None, h: int | None = None) -> np.ndarray:
    w, h = w or W, h or H
    g = np.random.default_rng(seed)
    pequeno = g.random((h // escala + 2, w // escala + 2)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize((w + escala * 2, h + escala * 2), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32)[:h, :w] / 255


class Camada:
    """Camada de pixel art RGBA (float 0..1) com profundidade por pixel (z: 0 = parede, 1 = perto da câmera)."""

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
        m = np.zeros((H, W), dtype=bool)
        m[ya:yb, xa:xb] = True
        self.mascara(m, cor, a)

    def poligono(self, pts, cor, a: float = 1.0) -> None:
        im = Image.new("L", (W, H), 0)
        ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
        self.mascara(np.asarray(im) > 127, cor, a)

    def elipse(self, cx, cy, rx, ry, cor, a: float = 1.0) -> None:
        yy, xx = np.mgrid[0:H, 0:W]
        m = ((xx + 0.5 - cx) / max(rx, 0.1)) ** 2 + ((yy + 0.5 - cy) / max(ry, 0.1)) ** 2 <= 1
        self.mascara(m, cor, a)

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / max(n, 1)
            self.p(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), cor, a)


# ─────────────────────────────── Paletas ───────────────────────────────
CARVALHO = ("#b07a44", "#8a5a30", "#66401f", "#452a14", "#2a180a")
NOGUEIRA = ("#8a4e2c", "#6a3820", "#4e2614", "#34180a", "#1e0d04")   # a caixa do fliperama
VIGA = ("#7a5232", "#5e3c22", "#432a16", "#2c1a0c", "#180d05")
REBOCO = ("#e6d8bc", "#d2c2a2", "#b8a684", "#8e7c5e")
LATAO = ("#fff0b0", "#e8c060", "#b88a34", "#7a5620", "#4a3010")
CROMO = ("#f4f6fa", "#c8ccd6", "#8a90a0", "#565c6c", "#2c3040")
FERRO = ("#7a7a84", "#55555e", "#38383e", "#222226")
# Os quatro bumpers (a ordem do MIRELS na conta do post): local, tamanho, tipo, dor.
BUMPERS = {
    "local": dict(xy=(226, 214), cor=("#ff8a7a", "#e0483c", "#9a2420", "#5a1010"), luz="#ff6a50"),
    "tamanho": dict(xy=(272, 214), cor=("#8ad0ff", "#3c8ae0", "#1e4a9a", "#0e2450"), luz="#5aa8ff"),
    "tipo": dict(xy=(212, 250), cor=("#9af0b0", "#3cc070", "#1e7a40", "#0e3a20"), luz="#50e080"),
    "dor": dict(xy=(286, 250), cor=("#fff0a0", "#f0c040", "#a87a10", "#5a4008"), luz="#ffc840"),
}

# ─────────────────────────────── Fonte de pontos (5 x 7) ───────────────────────────────
FONTE = {
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "I": ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    " ": ["00000"] * 7,
}


def texto_pontos(texto: str, escala: int = 1, espaco: int = 1) -> np.ndarray:
    """Máscara (h x w) do texto na fonte de pontos; cada ponto vira um bloco escala x escala."""
    cols = []
    for i, ch in enumerate(texto):
        g = np.array([[int(b) for b in linha] for linha in FONTE[ch]], dtype=np.float32)
        cols.append(g)
        if i < len(texto) - 1:
            cols.append(np.zeros((7, espaco), dtype=np.float32))
    m = np.concatenate(cols, axis=1)
    return m.repeat(escala, 0).repeat(escala, 1)


# ─────────────────────────────── A sala ───────────────────────────────
def parede() -> Camada:
    c = Camada(0.0)
    n1, n2 = ruido(11, 3), ruido(12, 9)
    yy, xx = np.mgrid[0:H, 0:W]
    # Reboco caiado, manchado e gasto, mais escuro no alto.
    base = mistura(REBOCO[2], REBOCO[3], 0.35)
    tex = (n1 * 0.6 + n2 * 0.4)
    alt = np.clip(yy / CHAO, 0, 1)
    rgb = base[None, None, :] * (0.72 + 0.28 * tex[:, :, None]) * (0.78 + 0.22 * alt[:, :, None])
    c.c[:, :, :3] = rgb
    c.c[:, :, 3] = 1
    # Rachaduras finas e reboco caído mostrando o tijolo.
    g = np.random.default_rng(3)
    for _ in range(9):
        x, y = g.integers(8, W - 8), g.integers(20, CHAO - 90)
        for _ in range(g.integers(6, 16)):
            c.p(x, y, mistura(REBOCO[3], "#3a2a1a", 0.45), 0.7)
            x += g.integers(-1, 2); y += 1
    for (bx, by) in ((40, 70 + DY // 3), (330, 120 + DY // 2)):
        for j in range(3):
            for i in range(4):
                c.ret(bx + i * 6 + (j % 2) * 3, by + j * 4, 5, 3, mistura("#9a5a3a", "#5a3020", g.random() * 0.6))
    # Enxaimel: vigas horizontais e esteios.
    viga_h(c, 0, W, 0, 10)
    viga_h(c, 0, W, CHAO - 66, 7)
    for x in (4, 150, 346):
        viga_v(c, x, 0, CHAO - 60, 9)
    mao_francesa(c, 13, 26 + DY // 2, 44, 10)
    mao_francesa(c, 341, 26 + DY // 2, 312, 10)
    # Lambri de tábuas embaixo.
    topo = CHAO - 59
    for x in range(0, W, 12):
        k = 0.88 + (x * 37 % 11) / 60
        c.ret(x, topo, 12, CHAO - topo, mistura(CARVALHO[2], CARVALHO[3], 0.4) * k)
        c.ret(x, topo, 1, CHAO - topo, CARVALHO[4])
        c.ret(x + 1, topo, 1, CHAO - topo, mistura(CARVALHO[1], CARVALHO[2], 0.5) * k)
    c.ret(0, topo, W, 3, CARVALHO[1])
    c.ret(0, topo + 3, W, 1, CARVALHO[4])
    c.ret(0, CHAO - 4, W, 4, CARVALHO[3])
    return c


def viga_h(c: Camada, x0: int, x1: int, y: int, alt: int) -> None:
    g = np.random.default_rng(y + 5)
    c.ret(x0, y, x1 - x0, alt, VIGA[2])
    c.ret(x0, y, x1 - x0, 1, VIGA[0])
    c.ret(x0, y + 1, x1 - x0, 1, VIGA[1])
    c.ret(x0, y + alt - 1, x1 - x0, 1, VIGA[4])
    for x in range(x0, x1, 3):
        if g.random() < 0.3:
            c.p(x, y + 2 + int(g.random() * (alt - 3)), VIGA[3])


def viga_v(c: Camada, x: int, y0: int, y1: int, larg: int) -> None:
    g = np.random.default_rng(x + 9)
    c.ret(x - larg // 2, y0, larg, y1 - y0, VIGA[2])
    c.ret(x - larg // 2, y0, 1, y1 - y0, VIGA[0])
    c.ret(x - larg // 2 + 1, y0, 1, y1 - y0, VIGA[1])
    c.ret(x + larg // 2, y0, 1, y1 - y0, VIGA[4])
    for y in range(y0, y1, 2):
        if g.random() < 0.25:
            c.p(x - larg // 2 + 2 + int(g.random() * (larg - 3)), y, VIGA[3])


def mao_francesa(c: Camada, xa: int, ya: int, xb: int, yb: int) -> None:
    for t in np.linspace(0, 1, 60):
        x, y = xa + (xb - xa) * t, ya + (yb - ya) * t
        for k in range(-2, 3):
            c.p(x, y + k, VIGA[1] if k == -2 else VIGA[4] if k == 2 else VIGA[2])


def janela_redonda(c: Camada) -> tuple[np.ndarray, np.ndarray]:
    """Óculo de vidro em rodelas, no alto à direita, com a lua. Devolve (emissão do vidro, máscara do vidro)."""
    cx, cy, r = 104, 50 + DY // 2, 19
    emis = np.zeros((H, W, 3), dtype=np.float32)
    vidro = np.zeros((H, W), dtype=np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot(xx + 0.5 - cx, yy + 0.5 - cy)
    c.mascara(d <= r + 4, VIGA[3])
    c.mascara((d <= r + 4) & (d > r + 2.6), VIGA[1])
    dentro = d <= r
    ceu = mistura("#0a1430", "#24346a", 0.0) + (yy[:, :, None] - (cy - r)) / (2 * r) * (hexa("#2a3a78") - hexa("#081028"))
    lua = np.hypot(xx - (cx + 6), yy - (cy - 6)) <= 5
    emis[dentro] = ceu[dentro] * 0.9
    emis[lua & dentro] = hexa("#f4f0dc") * 1.6
    g = np.random.default_rng(8)
    for _ in range(9):
        sx, sy = cx + g.integers(-r + 3, r - 3), cy + g.integers(-r + 3, r - 3)
        if np.hypot(sx - cx, sy - cy) < r - 2:
            emis[sy, sx] = hexa("#dfe6ff") * (0.8 + g.random())
    # Rodelas (fundo de garrafa): cada uma escurece a borda e acende um pontinho de reflexo.
    for oy in range(-r, r + 1, 8):
        for ox in range(-r, r + 1, 8):
            ccx, ccy = cx + ox + (4 if (oy // 8) % 2 else 0), cy + oy
            dd = np.hypot(xx + 0.5 - ccx, yy + 0.5 - ccy)
            anel = dentro & (dd > 3.4) & (dd <= 4.2)
            emis[anel] *= 0.35
    caixilho = dentro & ((np.abs(xx + 0.5 - cx) < 0.9) | (np.abs(yy + 0.5 - cy) < 0.9))
    emis[caixilho] = 0
    c.mascara(caixilho, VIGA[3])
    vidro[dentro & ~caixilho] = 1
    return emis, vidro


def lanterna(c: Camada, emis: np.ndarray) -> tuple[float, float]:
    """Lanterna de ferro pendurada da viga, à esquerda; devolve o ponto da chama."""
    x, y0 = 38, 10
    y1 = 44 + DY // 3
    c.linha(x, y0, x, y1 - 10, FERRO[2])
    c.ret(x - 6, y1 - 10, 13, 2, FERRO[1])
    c.poligono([(x - 5, y1 - 8), (x + 6, y1 - 8), (x + 4, y1 + 6), (x - 3, y1 + 6)], "#ffe0a0")
    for k in (-5, 0, 5):
        c.linha(x + k, y1 - 8, x + k * 0.7, y1 + 6, FERRO[3])
    c.ret(x - 4, y1 + 6, 9, 2, FERRO[1])
    c.ret(x - 1, y1 + 8, 3, 2, FERRO[2])
    for yy in range(y1 - 6, y1 + 5):
        for xx in range(x - 3, x + 4):
            emis[yy, xx] += hexa("#ffb050") * 0.35
    emis[y1 - 1:y1 + 3, x - 1:x + 2] += hexa("#fff0c0") * 1.4
    return x + 0.5, y1


def quadro_recordes(c: Camada) -> None:
    """Na parede do lado calmo, uma lousa de recordes (só riscos de giz, sem texto)."""
    x0, y0, w, h = 22, 92 + DY // 2, 92, 60
    c.ret(x0 - 3, y0 - 3, w + 6, h + 6, VIGA[1])
    c.ret(x0 - 3, y0 - 3, w + 6, 1, VIGA[0])
    c.ret(x0, y0, w, h, "#1e2a24")
    g = np.random.default_rng(21)
    for i in range(6):
        y = y0 + 8 + i * 8
        c.ret(x0 + 6, y, 10 + g.integers(0, 6), 1, "#9aa89c", 0.55)
        c.ret(x0 + 26, y, 30 + g.integers(0, 24), 1, "#9aa89c", 0.45)
        c.ret(x0 + w - 18, y, 10, 1, "#c8b070", 0.55)
    c.ret(x0 + 4, y0 + h - 4, 18, 2, "#d8d8d0", 0.8)


def prateleira(c: Camada) -> None:
    """Prateleira de garrafas no lado calmo (vidro verde, âmbar e fumê, rolhas e reflexo)."""
    y = 214 + DY // 2
    c.ret(14, y, 120, 3, CARVALHO[1]); c.ret(14, y, 120, 1, CARVALHO[0]); c.ret(14, y + 3, 120, 1, CARVALHO[4])
    for x in (22, 124):
        c.poligono([(x, y + 4), (x + 3, y + 4), (x + 3, y + 12)], CARVALHO[3])
    g = np.random.default_rng(17)
    x = 18
    while x < 128:
        alt = int(g.integers(9, 17))
        larg = int(g.integers(4, 7))
        vid = ("#2e6a3a", "#8a5a1a", "#3a3a44", "#6a2a2a")[int(g.integers(0, 4))]
        c.ret(x, y - alt, larg, alt, vid)
        c.ret(x + larg // 2 - 1, y - alt - 4, 2, 4, vid)
        c.ret(x + larg // 2 - 1, y - alt - 5, 2, 1, "#c8a070")
        c.ret(x + 1, y - alt + 2, 1, alt - 4, "#ffffff", 0.25)
        if g.random() < 0.6:
            c.ret(x, y - alt // 2 - 2, larg, 4, "#e8dcc0", 0.85)
        x += larg + int(g.integers(1, 4))


def mesinha(c: Camada, emis: np.ndarray) -> tuple[float, float]:
    """Mesinha redonda com vela e caneca, no chão à esquerda; devolve a chama."""
    cx, ty = 74, CHAO + 30
    c.z_atual = 0.7
    c.ret(cx - 2, ty, 5, 44, CARVALHO[3]); c.ret(cx - 2, ty, 1, 44, CARVALHO[1])
    c.ret(cx - 12, ty + 42, 25, 3, CARVALHO[3])
    c.elipse(cx, ty, 24, 5, CARVALHO[2]); c.elipse(cx, ty - 1, 24, 4.4, CARVALHO[1])
    c.elipse(cx, ty - 1.6, 22, 3.4, mistura(CARVALHO[1], CARVALHO[0], 0.4))
    # caneca
    c.ret(cx + 6, ty - 10, 7, 9, "#8a6a4a"); c.ret(cx + 6, ty - 10, 7, 2, "#f0e8d8"); c.ret(cx + 13, ty - 8, 2, 5, "#6a4a2a")
    # vela
    c.ret(cx - 8, ty - 9, 4, 8, "#f0e6cc"); c.ret(cx - 8, ty - 9, 1, 8, "#ffffff")
    c.ret(cx - 7, ty - 12, 2, 3, "#ffd070")
    emis[ty - 13:ty - 9, cx - 8:cx - 4] += hexa("#ffc060") * 1.4
    return cx - 6, ty - 11


def assoalho() -> Camada:
    c = Camada(0.6)
    fx, fy = 250, CHAO - 120
    n = ruido(31, 4)
    for y in range(CHAO, H):
        prof = (y - CHAO) / max(H - CHAO, 1)
        for x in range(W):
            # tábuas convergindo para o ponto de fuga
            u = fx + (x - fx) * (CHAO - fy) / (y - fy)
            tab = int(math.floor(u / 16))
            borda = abs(u / 16 - round(u / 16)) * 16 * (y - fy) / (CHAO - fy)
            k = 0.82 + ((tab * 53) % 9) / 40 + n[y, x] * 0.18
            cor = mistura(CARVALHO[2], CARVALHO[3], 0.5 - prof * 0.3) * k
            if borda < 0.8:
                cor = cor * 0.45
            elif borda < 1.6:
                cor = cor * 1.08
            c.p(x, y, cor)
        c.z[y, :] = 0.15 + 0.85 * prof
    return c


# ─────────────────────────────── A máquina ───────────────────────────────
def fliperama(estado: dict) -> tuple[Camada, Camada, np.ndarray, list]:
    """A máquina inteira. Devolve (corpo, pernas, emissão, luzes [(x, y, cor, força, raio)])."""
    c = Camada(0.45)
    pernas = Camada(0.5)
    emis = np.zeros((H, W, 3), dtype=np.float32)
    luzes = []
    d = DY
    # ── Pernas de ferro com sapatas, abrindo um pouco para fora.
    for (xt, xb_, yt, yb, z) in ((172, 166, 336 + d, 410 + d, 0.62), (330, 336, 336 + d, 410 + d, 0.62), (196, 194, 300 + d, 372 + d, 0.42), (306, 308, 300 + d, 372 + d, 0.42)):
        pernas.z_atual = z
        for t in np.linspace(0, 1, 120):
            x = xt + (xb_ - xt) * t
            y = yt + (yb - yt) * t
            pernas.ret(x - 2, y, 5, 1, FERRO[2])
            pernas.p(x - 2, y, FERRO[0])
            pernas.p(x + 2, y, FERRO[3])
        pernas.ret(xb_ - 4, yb, 9, 3, FERRO[1])
        pernas.ret(xb_ - 4, yb + 3, 9, 1, FERRO[3])
    # ── Caixa de baixo (a frente do gabinete) com a porta das fichas.
    c.z_atual = 0.55
    frente = [(160, 300 + d), (340, 300 + d), (340, 340 + d), (160, 340 + d)]
    c.poligono(frente, NOGUEIRA[2])
    veio = ruido(41, 2)
    for y in range(300 + d, 340 + d):
        for x in range(160, 340):
            k = 0.85 + veio[y, x] * 0.3 + 0.08 * math.sin(x * 0.35 + y * 0.05)
            c.p(x, y, cor_de(NOGUEIRA[2]) * k)
    c.ret(160, 300 + d, 180, 1, NOGUEIRA[0])
    c.ret(160, 339 + d, 180, 1, NOGUEIRA[4])
    c.ret(160, 300 + d, 1, 40, NOGUEIRA[1])
    c.ret(339, 300 + d, 1, 40, NOGUEIRA[4])
    # cantoneiras de latão
    for (x, y) in ((160, 300 + d), (334, 300 + d), (160, 334 + d), (334, 334 + d)):
        c.ret(x, y, 6, 6, LATAO[2]); c.ret(x, y, 6, 1, LATAO[0]); c.p(x + 2, y + 2, LATAO[0])
    # porta das fichas
    c.ret(232, 308 + d, 36, 26, FERRO[2]); c.ret(232, 308 + d, 36, 1, FERRO[0]); c.ret(232, 333 + d, 36, 1, FERRO[3])
    for k, x in enumerate((238, 254)):
        c.ret(x, 313 + d, 8, 10, "#2a0a08")
        c.ret(x + 3, 315 + d, 2, 6, "#120404")
        emis[313 + d:323 + d, x:x + 8] += hexa("#ff3a2a") * 0.55
        emis[316 + d:320 + d, x + 1:x + 3] += hexa("#ffb0a0") * 0.6
        luzes.append((x + 4, 318 + d, "#ff4030", 0.25, 18))
    c.ret(247, 326 + d, 6, 3, LATAO[2])
    # ── Barra da frente (cromada) e o tampo inclinado (trapézio), com as laterais de madeira.
    c.z_atual = 0.5
    tampo_frente_y, tampo_fundo_y = 296 + d, 188 + d
    lat = [(158, 300 + d), (342, 300 + d), (322, 184 + d), (178, 184 + d)]
    c.poligono(lat, NOGUEIRA[3])
    # campo de jogo: madeira clara pintada em azul-noite com arte de estrelas douradas
    campo = [(168, tampo_frente_y), (332, tampo_frente_y), (314, tampo_fundo_y), (186, tampo_fundo_y)]
    im = Image.new("L", (W, H), 0)
    ImageDraw.Draw(im).polygon(campo, fill=255)
    mc = np.asarray(im) > 127
    yy, xx = np.mgrid[0:H, 0:W]
    prof = np.clip((yy - tampo_fundo_y) / (tampo_frente_y - tampo_fundo_y), 0, 1)
    fundo_campo = mistura("#16224a", "#24366e", 0.0)
    cor_campo = fundo_campo[None, None, :] * (0.75 + 0.35 * prof[:, :, None]) + (ruido(51, 2)[:, :, None] - 0.5) * 0.04
    c.c[mc, :3] = cor_campo[mc]; c.c[mc, 3] = 1; c.z[mc] = 0.5
    # raios dourados saindo do centro (arte do tampo) e estrelinhas
    cx_, cy_ = 250, 236 + d
    ang = np.arctan2(yy - cy_, (xx - cx_) * 0.8)
    raio = (np.cos(ang * 12) > 0.82) & mc & (np.hypot((xx - cx_) * 0.8, yy - cy_) > 16)
    c.mascara(raio, "#3a4a8a", 0.55)
    g = np.random.default_rng(61)
    for _ in range(40):
        sx, sy = g.integers(186, 314), g.integers(tampo_fundo_y + 2, tampo_frente_y - 4)
        if mc[sy, sx]:
            c.p(sx, sy, "#f4d27a", 0.8)
    # trilhos laterais cromados
    for (a, b) in (((168, tampo_frente_y), (186, tampo_fundo_y)), ((332, tampo_frente_y), (314, tampo_fundo_y))):
        c.linha(a[0], a[1], b[0], b[1], CROMO[1])
        c.linha(a[0] + (1 if a[0] < 250 else -1), a[1], b[0] + (1 if b[0] < 250 else -1), b[1], CROMO[3])
    # faixas de entrada no alto (três raias) com luzinhas
    for k, x in enumerate((232, 250, 268)):
        for xp in (x - 7, x + 7):
            c.ret(xp, tampo_fundo_y + 5, 1, 9, CROMO[3])
            c.p(xp, tampo_fundo_y + 5, CROMO[0])
        aceso = estado.get("raias", 0) > k
        c.elipse(x, tampo_fundo_y + 12, 2.2, 1.4, "#ffe08a" if aceso else "#6a5a30")
        if aceso:
            emis[tampo_fundo_y + 11:tampo_fundo_y + 14, x - 2:x + 3] += hexa("#ffd060") * 0.9
    # ── Bumpers: saia de borracha, anel de latão, tampa colorida; o aceso emite e ilumina a cena.
    for nome, b in BUMPERS.items():
        bx, by = b["xy"]
        by += d
        cor = b["cor"]
        aceso = nome in estado.get("acesos", ())
        c.elipse(bx, by + 4, 11, 4.5, "#05070f", 0.55)          # sombra no tampo
        c.elipse(bx, by + 2, 10, 4.5, "#e8e4d8")                 # saia branca
        c.elipse(bx, by + 1, 10, 4.2, "#c8c0b0")
        c.elipse(bx, by, 8.5, 3.6, LATAO[2])                     # anel
        c.elipse(bx, by - 0.5, 8.5, 3.2, LATAO[1])
        c.elipse(bx, by - 3, 7, 3.4, cor[2] if not aceso else cor[1])   # tampa
        c.elipse(bx, by - 4, 6, 2.6, cor[1] if not aceso else cor[0])
        c.elipse(bx - 2, by - 5, 2, 1, "#ffffff", 0.7 if aceso else 0.35)
        for yy_ in range(int(by - 7), int(by + 1)):
            for xx_ in range(int(bx - 7), int(bx + 8)):
                if ((xx_ + 0.5 - bx) / 7) ** 2 + ((yy_ + 0.5 - (by - 3)) / 3.4) ** 2 <= 1:
                    emis[yy_, xx_] += hexa(b["luz"]) * (1.15 if aceso else 0.08)
        if aceso:
            luzes.append((bx, by - 4, b["luz"], 1.0, 60))
    # estilingues (triângulos) e as palhetas
    for lado in (-1, 1):
        x0 = 250 + lado * 46
        c.poligono([(x0, 262 + d), (x0 + lado * 12, 282 + d), (x0, 282 + d)], "#e8e4d8")
        c.poligono([(x0 + lado * 1, 265 + d), (x0 + lado * 9, 280 + d), (x0 + lado * 1, 280 + d)], "#c02a2a")
        emis[268 + d:279 + d, min(x0, x0 + lado * 8):max(x0, x0 + lado * 8)] += hexa("#ff4040") * 0.12
        px0 = 250 + lado * 30
        pts = [(px0, 284 + d), (px0 - lado * 22, 290 + d), (px0 - lado * 22, 292 + d), (px0, 288 + d)]
        c.poligono(pts, "#f2efe6")
        c.linha(px0, 288 + d, px0 - lado * 22, 292 + d, "#c02a2a")
        c.elipse(px0, 286 + d, 2.2, 2.2, CROMO[2])
    # a bola de aço, com reflexo
    bx, by = estado.get("bola", (246, 236))
    by += d
    c.elipse(bx + 1, by + 3, 4, 1.6, "#03050c", 0.6)
    c.elipse(bx, by, 3.4, 3.4, CROMO[2])
    c.elipse(bx - 0.6, by - 0.6, 2.6, 2.6, CROMO[1])
    c.p(bx - 1, by - 2, CROMO[0]); c.p(bx - 2, by - 1, CROMO[0])
    c.p(bx + 1, by + 1, CROMO[3])
    # barra de travamento (frente) e vidro do tampo (reflexo diagonal)
    c.ret(166, tampo_frente_y - 1, 168, 4, CROMO[1])
    c.ret(166, tampo_frente_y - 1, 168, 1, CROMO[0])
    c.ret(166, tampo_frente_y + 2, 168, 1, CROMO[3])
    # botões laterais (flipper)
    for x in (156, 344):
        c.ret(x - 1, 304 + d, 3, 5, "#c02a2a"); c.p(x - 1, 304 + d, "#ff8080")
    # ── Caixa de cima (o "backbox"): madeira com latão, o letreiro e o placar.
    c.z_atual = 0.35
    bx0, bx1, by0, by1 = 186, 314, 58 + d, 186 + d
    c.ret(bx0, by0, bx1 - bx0, by1 - by0, NOGUEIRA[2])
    for y in range(by0, by1):
        for x in range(bx0, bx1):
            k = 0.82 + veio[y, x] * 0.3 + 0.06 * math.sin(y * 0.4 + x * 0.03)
            c.p(x, y, cor_de(NOGUEIRA[2]) * k)
    c.ret(bx0, by0, bx1 - bx0, 2, NOGUEIRA[0]); c.ret(bx0, by1 - 2, bx1 - bx0, 2, NOGUEIRA[4])
    c.ret(bx0, by0, 2, by1 - by0, NOGUEIRA[1]); c.ret(bx1 - 2, by0, 2, by1 - by0, NOGUEIRA[4])
    # coroa de latão em cima (arco com pináculos)
    for x in range(bx0 - 2, bx1 + 2):
        t = (x - (bx0 + bx1) / 2) / ((bx1 - bx0) / 2 + 2)
        h_ = int(8 * (1 - t * t))
        c.ret(x, by0 - h_, 1, h_ + 1, NOGUEIRA[3])
        c.p(x, by0 - h_, LATAO[1])
    for x in (bx0 + 2, (bx0 + bx1) // 2, bx1 - 3):
        c.ret(x - 1, by0 - 14 + (6 if x != (bx0 + bx1) // 2 else 0), 3, 6, LATAO[2])
        c.elipse(x + 0.5, by0 - 15 + (6 if x != (bx0 + bx1) // 2 else 0), 2.2, 2.2, LATAO[1])
    # letreiro MIRELS (neon dourado sobre vidro escuro)
    c.ret(bx0 + 8, by0 + 8, bx1 - bx0 - 16, 30, "#0c0a14")
    c.ret(bx0 + 8, by0 + 8, bx1 - bx0 - 16, 1, LATAO[2]); c.ret(bx0 + 8, by0 + 37, bx1 - bx0 - 16, 1, LATAO[3])
    letras = texto_pontos("MIRELS", 2, 1)
    lh, lw = letras.shape
    lx, ly = int((bx0 + bx1) / 2 - lw / 2), by0 + 12
    neon = estado.get("neon", 1.0)
    for j in range(lh):
        for i in range(lw):
            if letras[j, i]:
                c.p(lx + i, ly + j, "#fff4c8")
                emis[ly + j, lx + i] += hexa("#ffd070") * 1.25 * neon
    luzes.append(((bx0 + bx1) / 2, by0 + 20, "#ffc860", 0.9 * neon, 120))
    # arte do vidro do meio: escudo dourado com estrela, raios e as quatro gemas das variáveis
    c.ret(bx0 + 8, by0 + 42, bx1 - bx0 - 16, 40, "#1a1030")
    vy0 = by0 + 42
    yy2, xx2 = np.mgrid[0:H, 0:W]
    reg = (xx2 >= bx0 + 8) & (xx2 < bx1 - 8) & (yy2 >= vy0) & (yy2 < vy0 + 40)
    ang2 = np.arctan2(yy2 - (vy0 + 20), xx2 - 250)
    c.mascara(reg & (np.cos(ang2 * 10) > 0.7), "#3a2058", 0.9)
    escudo = [(238, vy0 + 6), (262, vy0 + 6), (262, vy0 + 24), (250, vy0 + 34), (238, vy0 + 24)]
    c.poligono(escudo, LATAO[3])
    c.poligono([(240, vy0 + 8), (260, vy0 + 8), (260, vy0 + 23), (250, vy0 + 31), (240, vy0 + 23)], LATAO[1])
    estrela = [(250 + 7 * math.cos(math.pi / 2 + k * math.pi / 5) * (1 if k % 2 == 0 else 0.45), vy0 + 19 - 7 * math.sin(math.pi / 2 + k * math.pi / 5) * (1 if k % 2 == 0 else 0.45)) for k in range(10)]
    c.poligono(estrela, "#fff0b0")
    for nome, x in zip(("local", "tamanho", "tipo", "dor"), (206, 222, 278, 294)):
        aceso = nome in estado.get("acesos", ())
        cor = BUMPERS[nome]["cor"]
        c.elipse(x, vy0 + 20, 3.2, 3.2, cor[1] if aceso else cor[3])
        c.p(x - 1, vy0 + 19, "#ffffff" if aceso else cor[2])
        if aceso:
            emis[vy0 + 18:vy0 + 23, x - 2:x + 3] += hexa(BUMPERS[nome]["luz"]) * 0.9
    emis[vy0 + 8:vy0 + 32, 240:261] += hexa("#ffd880") * 0.12 * neon
    # placar: matriz de pontos âmbar
    py0 = by0 + 88
    c.ret(bx0 + 10, py0, bx1 - bx0 - 20, 30, "#050302")
    c.ret(bx0 + 10, py0, bx1 - bx0 - 20, 1, CROMO[2]); c.ret(bx0 + 10, py0 + 29, bx1 - bx0 - 20, 1, CROMO[3])
    for y in range(py0 + 2, py0 + 28, 2):
        for x in range(bx0 + 12, bx1 - 12, 2):
            c.p(x, y, "#2a1404")
    placar = estado.get("placar", "000")
    m = texto_pontos(placar, 2, 2)
    mh, mw = m.shape
    mx, my = int(250 - mw / 2), py0 + 8
    for j in range(mh):
        for i in range(mw):
            if m[j, i] and (i % 2 == 0) and (j % 2 == 0):
                c.p(mx + i, my + j, "#ffd080")
                c.p(mx + i + 1, my + j, "#ffb040", 0.6)
                c.p(mx + i, my + j + 1, "#ffb040", 0.6)
                emis[my + j:my + j + 2, mx + i:mx + i + 2] += hexa("#ff9a2a") * 1.15
    luzes.append((250, py0 + 15, "#ff9a30", 0.6, 70))
    # pés do letreiro: o encaixe com o tampo
    c.ret(bx0 + 4, by1, bx1 - bx0 - 8, 4, NOGUEIRA[4])
    return c, pernas, emis, luzes


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


YS = XS = None


def luz3d(cx, cy, cz, raio, z, prof: float = 80.0, achatar: float = 1.0) -> np.ndarray:
    d2 = ((XS - cx) ** 2 + ((YS - cy) / achatar) ** 2 + ((z - cz) * prof) ** 2) / raio ** 2
    return np.exp(-d2 * 2.2) * 0.7 + 0.3 / (1 + d2 * 6)


def em_faixas(v: np.ndarray, passos: int = 6, k: float = 0.45) -> np.ndarray:
    return v * (1 - k) + np.floor(v * passos) / passos * k


def compor(camadas):
    alb = np.zeros((H, W, 3), dtype=np.float32)
    z = np.zeros((H, W), dtype=np.float32)
    for cam in camadas:
        a = cam.c[:, :, 3:4]
        alb = alb * (1 - a) + cam.c[:, :, :3] * a
        sel = cam.c[:, :, 3] > 0.5
        z[sel] = cam.z[sel]
    return alb, z


def montar(estado: dict) -> Image.Image:
    par = parede()
    emis = np.zeros((H, W, 3), dtype=np.float32)
    emis_jan, vidro = janela_redonda(par)
    quadro_recordes(par)
    prateleira(par)
    chama_lant = lanterna(par, emis)
    chao = assoalho()
    mesa = Camada(0.7)
    chama_mesa = mesinha(mesa, emis)
    maq, pernas, e_maq, luzes = fliperama(estado)
    emis += e_maq

    # sombra de contato da máquina no assoalho e oclusão na parede atrás dela
    ao = Camada(0.6)
    for k in range(5):
        ao.elipse(252, 408 + DY, 96 - k * 12, 9 - k * 1.2, "#000000", 0.16)
    ao_par = Camada(0.0)
    for k in range(6):
        ao_par.ret(180 - k * 4, 50 + DY - k * 4, 140 + k * 8, 300 + k * 8, "#000000", 0.06)

    alb, z = compor((par, ao_par, chao, ao, mesa, pernas, maq))
    alb3, z3 = ampliar(alb), desfocar(ampliar(z[:, :, None]), 1.0)[:, :, 0]
    emis3, jan3 = ampliar(emis), ampliar(emis_jan)
    vidro3 = ampliar(vidro[:, :, None])[:, :, 0]

    # Luz: ambiente noturno frio + lanterna + lareira fora do quadro (direita) + a máquina (letreiro, placar, bumper).
    luz = np.zeros_like(alb3) + hexa("#2a3870") * 0.5
    luz += luz3d(104, 50 + DY // 2, 0.1, 90, z3)[:, :, None] * hexa("#8eaaff") * 0.35            # luar do óculo
    lx, ly = chama_lant
    vx, vy = chama_mesa
    luz += em_faixas(luz3d(vx, vy, 0.7, 60, z3, prof=50), 6, 0.4)[:, :, None] * hexa("#ffb060") * 0.8
    luz += em_faixas(luz3d(lx, ly, 0.2, 130, z3, prof=60), 6, 0.4)[:, :, None] * hexa("#ffa850") * 1.25
    fogo = em_faixas(luz3d(W + 20, CHAO - 40, 0.4, 260, z3, prof=50, achatar=0.8), 7, 0.35)
    luz += fogo[:, :, None] * hexa("#ff8a40") * 1.35
    for (x, y, cor, forca, raio) in luzes:
        luz += em_faixas(luz3d(x, y, 0.55, raio * 1.4, z3, prof=45), 6, 0.35)[:, :, None] * hexa(cor) * forca * 0.9
    img = alb3 * luz

    # contraluz quente na borda direita da máquina (lareira) e fria na esquerda (luar)
    al = np.maximum(maq.c[:, :, 3], pernas.c[:, :, 3])
    borda_d = ((al > 0.5) & (np.roll(al, -1, 1) < 0.5)).astype(np.float32)
    borda_e = ((al > 0.5) & (np.roll(al, 1, 1) < 0.5)).astype(np.float32)
    img += desfocar(ampliar(borda_d[:, :, None]), 0.6) * hexa("#ffb060") * 0.55
    img += desfocar(ampliar(borda_e[:, :, None]), 0.6) * hexa("#9ab4ff") * 0.18

    img = img * (1 - vidro3[:, :, None]) + jan3 * vidro3[:, :, None]
    img += emis3

    # feixe de luar entrando pelo óculo e descendo até o assoalho (volumétrico, com ruído)
    jx, jy = 104, 50 + DY // 2
    dirx, diry = 0.55, 1.0
    norm = math.hypot(dirx, diry)
    ux, uy = dirx / norm, diry / norm
    ax, ay = XS - jx, YS - jy
    ao_longo = ax * ux + ay * uy
    perp = np.abs(ax * uy - ay * ux)
    feixe = np.exp(-(perp / (16 + ao_longo * 0.18)) ** 2) * np.clip(ao_longo / 30, 0, 1) * np.exp(-np.clip(ao_longo - 120, 0, None) / 160)
    feixe *= (YS < CHAO + 40) * (0.6 + 0.8 * ampliar(ruido(71, 6)[:, :, None])[:, :, 0])
    img += feixe[:, :, None] * hexa("#9ab4ff") * 0.16

    # reflexo do letreiro e do bumper aceso no assoalho encerado (vertical, borrado)
    refl = np.zeros_like(img)
    chao_m = ampliar((np.arange(H)[:, None] >= CHAO).astype(np.float32)[:, :, None].repeat(W, 1))[:, :, 0]
    for (x, y, cor, forca, raio) in luzes:
        ry = CHAO + (CHAO - y) * 0.18 + 14
        refl += (np.exp(-((XS - x) ** 2) / (2 * 9 ** 2) - ((YS - ry) ** 2) / (2 * 22 ** 2)))[:, :, None] * hexa(cor) * forca * 0.22
    img += refl * chao_m[:, :, None]

    # poeira dourada no ar, mais perto do letreiro
    g = np.random.default_rng(7)
    poeira = np.zeros(img.shape[:2], dtype=np.float32)
    for _ in range(900):
        x, y = g.random() * W, g.random() * CHAO
        perto = math.exp(-((x - 250) ** 2 + (y - 80 - DY) ** 2) / (2 * 90 ** 2))
        if g.random() < perto * 0.9 + 0.05:
            poeira[int(y * ESC), int(x * ESC)] = 0.3 + g.random() * 0.7
    img += poeira[:, :, None] * hexa("#ffe0a0") * 0.45

    # brilho (bloom)
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.6) * 3, 0, 1), 0, 2.5)
    img += desfocar(claro, 18) * 0.5 + desfocar(claro, 5) * 0.4
    # mapeamento de tons
    lum = img.mean(2, keepdims=True)
    comp = np.where(lum > 0.62, 0.62 + (lum - 0.62) / (1 + (lum - 0.62) * 1.6), lum) / np.maximum(lum, 1e-4)
    img = img * comp
    # correção de cor: luzes quentes, sombras frias
    quente, fria = hexa("#ffcf8a"), hexa("#0c1638")
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * quente + (1 - lum) * (fria * 0.6 + 0.4)))
    img = np.clip((img - 0.45) * 1.1 + 0.45, 0, 1.4)
    # lado esquerdo calmo (texto)
    calma = np.clip((0.42 - XS / W) / 0.16, 0, 1)[:, :, None]
    media = img.mean(2, keepdims=True)
    img = img * (1 - calma * 0.45) + ((media + (img - media) * 0.7) * 0.8) * calma * 0.45
    # vinheta e grão
    v = (XS / W - 0.62) ** 2 * 1.1 + (YS / H - 0.45) ** 2 * 0.9
    img *= (1 - np.clip(v - 0.06, 0, 1) * 1.05)[:, :, None]
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.016
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


# Estados da máquina para cada peça do post (o placar só sobe: 0, 2, 4, 7, 8).
ESTADOS = {
    "apagado": dict(placar="000", acesos=(), raias=0, bola=(250, 270)),
    "local": dict(placar="002", acesos=("local",), raias=1, bola=(240, 226)),
    "tamanho": dict(placar="004", acesos=("local", "tamanho"), raias=2, bola=(258, 228)),
    "tipo": dict(placar="007", acesos=("local", "tamanho", "tipo"), raias=3, bola=(230, 264)),
    "dor": dict(placar="008", acesos=("local", "tamanho", "tipo", "dor"), raias=3, bola=(264, 268)),
    "tilt": dict(placar="012", acesos=("local", "tamanho", "tipo", "dor"), raias=3, bola=(250, 280), neon=0.35),
}


def main() -> None:
    saida = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    saida.mkdir(parents=True, exist_ok=True)
    pedidos = sys.argv[2:] or [f"feed:{e}" for e in ESTADOS] + [f"story:{e}" for e in ("apagado", "tilt", "local")]
    for pedido in pedidos:
        formato, nome = pedido.split(":")
        configurar(450 if formato == "feed" else 640)
        img = montar(ESTADOS[nome])
        arq = saida / f"{formato}-{nome}.webp"
        img.save(arq, quality=88, method=6)
        print(arq.name, img.size, arq.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
