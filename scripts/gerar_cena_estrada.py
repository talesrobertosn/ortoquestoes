"""Cenário "HD-2D" do topo da página do Cronograma: a estrada até a prova (30/10/2026).

Nada baixado nem gerado por IA: cada pixel sai das funções abaixo, no mesmo jeito das outras cenas
(gerar_cena_inicio.py, gerar_cena_vila.py, gerar_cena_arena.py). A pintura é feita em pixel art (480 x 160),
camada por camada, e montada em 3x com a luz calculada por pixel.

A cena (o plano de estudo semana a semana até a prova):
- uma estrada de terra com sulcos de roda, poças e capim no meio, que sai do primeiro plano e serpenteia por três
  camadas de colinas até o castelo distante no horizonte (o dia da prova);
- marcos de pedra numerados (1, 2, 3...) na beira da estrada, cada um uma semana, cada vez menores com a distância;
- uma placa de madeira com setas ("PROVA" para o castelo, "HOJE" de volta) e uma muleta encostada na cerca (o segredo);
- cerca de madeira acompanhando a estrada, colinas com retalhos de lavoura (trigo, pasto, terra arada) e sebes,
  moinho, aldeia de telhados vermelhos, bosques, árvores grandes emoldurando os lados;
- um pequeno acampamento na beira: carroça coberta (com uma perna engessada aparecendo pela lona de trás), lampião,
  barril, fogueira e um fêmur esquecido ao lado;
- montanhas em duas camadas com neve e perspectiva atmosférica; céu da hora: manhã com nuvens e névoa nos vales,
  tarde com o poente dourado atrás do castelo (raios, contraluz e sombras longas), noite com lua, estrelas, vaga-lumes,
  fogueira e as janelas do castelo e da aldeia acesas.

O chão em x 330-380, y 95-152 (pixels da arte) fica livre, na beira da estrada: é onde o mascote fica em pé.
Saída: public/pixel/paginas/estrada-{manha,tarde,noite}.webp (1440 x 480) e -960.webp (960 x 320).
Uso: python3 scripts/gerar_cena_estrada.py            (as três)
     python3 scripts/gerar_cena_estrada.py noite      (só uma)
"""
from __future__ import annotations

import math
import sys
import time
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "paginas"
LUGAR = "estrada"
W, H, ESC = 480, 160, 3
LIVRE = {"mascote": (328, 95, 382, 153)}
CASTELO = (374, 60)                     # centro e base da muralha do castelo
SOL_TARDE = (387, 50)
FOGO = (424, 146)


# ─────────────────────────────── Pincéis básicos ───────────────────────────────
@lru_cache(maxsize=4096)
def _hexa(c: str) -> tuple[float, float, float]:
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def hexa(c: str) -> np.ndarray:
    return np.array(_hexa(c), dtype=np.float32)


def pal(*cores: str) -> np.ndarray:
    return np.array([_hexa(c) for c in cores], dtype=np.float32)


def suave(a: float, b: float, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples."""

    def __init__(self) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            rgb = hexa(cor) if isinstance(cor, str) else cor
            base = self.c[y, x]
            if a >= 1:
                base[:3] = rgb
                base[3] = 1
                return
            na = a + base[3] * (1 - a)
            if na > 0:
                base[:3] = (rgb * a + base[:3] * base[3] * (1 - a)) / na
            base[3] = na

    def ret(self, x0, y0, w, h, cor, a: float = 1.0) -> None:
        x0, y0, w, h = int(x0), int(y0), int(w), int(h)
        xa, xb, ya, yb = max(0, x0), min(W, x0 + w), max(0, y0), min(H, y0 + h)
        if xa >= xb or ya >= yb:
            return
        rgb = hexa(cor) if isinstance(cor, str) else cor
        if a >= 1:
            self.c[ya:yb, xa:xb, :3] = rgb
            self.c[ya:yb, xa:xb, 3] = 1
        else:
            for y in range(ya, yb):
                for x in range(xa, xb):
                    self.p(x, y, rgb, a)

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / n
            self.p(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), cor, a)

    def mascara(self, m: np.ndarray, cor, a: float = 1.0) -> None:
        """Pinta onde m é verdadeiro; `cor` pode ser uma cor ou uma imagem H x W x 3."""
        if isinstance(cor, str):
            cor = hexa(cor)
        rgb = cor[m] if np.ndim(cor) == 3 else cor
        if a >= 1:
            self.c[m, :3] = rgb
            self.c[m, 3] = 1
        else:
            base = self.c[m]
            na = a + base[:, 3:4] * (1 - a)
            base[:, :3] = (rgb * a + base[:, :3] * base[:, 3:4] * (1 - a)) / np.maximum(na, 1e-6)
            base[:, 3:4] = na
            self.c[m] = base

    def juntar(self, outra: "Camada") -> None:
        a = outra.c[:, :, 3:4]
        na = a + self.c[:, :, 3:4] * (1 - a)
        self.c[:, :, :3] = (outra.c[:, :, :3] * a + self.c[:, :, :3] * self.c[:, :, 3:4] * (1 - a)) / np.maximum(na, 1e-6)
        self.c[:, :, 3:4] = na


YA, XA = np.mgrid[0:H, 0:W].astype(np.float32)          # grade da arte
XS = np.arange(W, dtype=np.float32)


def ruido(seed: int, escala: float, w: int = W, h: int = H) -> np.ndarray:
    """Ruído suave 0..1 (valores aleatórios ampliados com interpolação)."""
    g = np.random.default_rng(abs(int(seed)))
    pw, ph = int(w / escala) + 3, int(h / escala) + 3
    pequeno = g.random((ph, pw)).astype(np.float32)
    img = Image.fromarray(pequeno, mode="F").resize((int(pw * escala), int(ph * escala)), Image.BICUBIC)
    a = np.asarray(img, dtype=np.float32)[:h, :w]
    return np.clip(a, 0, 1)


def ruido_ret(seed: int, ex: float, ey: float) -> np.ndarray:
    """Ruído esticado (ex na horizontal, ey na vertical): veios, faixas de névoa, ondas."""
    g = np.random.default_rng(abs(int(seed)))
    pw, ph = int(W / ex) + 3, int(H / ey) + 3
    pequeno = g.random((ph, pw)).astype(np.float32)
    img = Image.fromarray(pequeno, mode="F").resize((int(pw * ex), int(ph * ey)), Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32)[:H, :W], 0, 1)


def ruido1d(seed: int, escala: float) -> np.ndarray:
    return ruido(seed, escala, W, 8)[3]


BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16 - 0.47)
BAYER_HW = np.tile(BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W]


def pontilhar(v: np.ndarray, n: int, forca: float = 0.9) -> np.ndarray:
    """Quantiza v (0..1) em n tons com pontilhado ordenado (Bayer 4x4), como na pixel art."""
    return np.clip(np.floor(v * n + BAYER_HW * forca), 0, n - 1).astype(int)


def fbm(seed: int, escalas=(24, 9, 3.5), pesos=(0.55, 0.3, 0.15)) -> np.ndarray:
    return sum(ruido(seed + i, e) * p for i, (e, p) in enumerate(zip(escalas, pesos)))


def suavizar1d(v: np.ndarray, r: int) -> np.ndarray:
    k = np.ones(2 * r + 1, dtype=np.float32) / (2 * r + 1)
    return np.convolve(np.pad(v, r, mode="edge"), k, mode="valid").astype(np.float32)


# ─────────────────────────────── Horas do dia ───────────────────────────────
def sombra_tarde(xs, b):
    """Poente atrás do castelo: as sombras vêm na direção da câmera, abrindo para os lados."""
    return (xs - SOL_TARDE[0]) * 0.0065, np.full_like(xs, 1.05)


def sombra_lua(xs, b):
    return (xs - 300) * 0.003, np.full_like(xs, 0.45)


PERIODOS = {
    "manha": dict(
        luz=(-0.72, -0.62), ceu=("#3f82d4", "#86bcec", "#d8eaf2"), astro=(40, -40),
        nevoa="#d4e2ec", nevoa_k=0.9, amb="#88a6d0", amb_k=0.5, sol="#ffe2ac", sol_k=1.06,
        fogo_k=0.3, lamp_k=0.12, quente="#ffedc8", fria="#28486c", sombra=(1.05, 0.32),
        vale=0.62, vale_cor="#f2f6f6", rim="#fff0c0", rim_k=0.55, ceu_agua="#a8d0ee"),
    "tarde": dict(
        luz=(0.62, -0.28), ceu=("#33357a", "#d27a6a", "#ffcf86"), astro=SOL_TARDE,
        nevoa="#f2ac78", nevoa_k=1.0, amb="#9078b6", amb_k=0.44, sol="#ffac5c", sol_k=1.2,
        fogo_k=0.6, lamp_k=0.5, quente="#ffd49a", fria="#36265c", sombra=sombra_tarde,
        vale=0.42, vale_cor="#ffc48a", rim="#ffb860", rim_k=1.35, ceu_agua="#ffc890"),
    "noite": dict(
        luz=(0.05, -1.0), ceu=("#030818", "#0a1534", "#1b2a58"), astro=(300, 20),
        nevoa="#16244c", nevoa_k=0.85, amb="#3a4e94", amb_k=0.34, sol="#7e9eff", sol_k=0.42,
        fogo_k=1.35, lamp_k=1.0, quente="#ffcf8a", fria="#0a1532", sombra=sombra_lua,
        vale=0.5, vale_cor="#3c4e84", rim="#8eaaff", rim_k=0.5, ceu_agua="#26386a"),
}

# Paletas (escuro -> claro). A luz da hora entra depois, na montagem.
FOLHA = pal("#0e1c14", "#15281a", "#1e3a20", "#2a5026", "#3a682c", "#4e8034", "#68983c", "#88b04a")
FOLHA_ESC = pal("#0a140e", "#101e14", "#18301a", "#224220", "#2e5626", "#3e6a2c")
FOLHA_LONGE = pal("#1c3428", "#24422e", "#305434", "#3e663a", "#507a42")
CASCA = pal("#140d09", "#22160f", "#332216", "#46301e", "#5c4028", "#755434", "#906a42", "#a88252")
MUSGO = pal("#2a4a1e", "#3e6626", "#58842e", "#78a238", "#9cbe48")
PEDRA = pal("#2a2a2e", "#44444a", "#5e5e62", "#7a7a7a", "#9a9890", "#bcb8aa", "#dcd6c4")
PEDRA_MARCO = pal("#34343a", "#4c4c52", "#66666a", "#828078", "#a09c90", "#bfb9a8", "#dcd5c0")
TERRA = pal("#2e2018", "#423024", "#58422e", "#6e543a", "#866a48", "#9e8058", "#b4966c", "#c8ac82")
GRAMA = pal("#14281a", "#1c3a1e", "#284e24", "#36602a", "#467230", "#588436", "#6c963e", "#84a846", "#a0bc56")
MADEIRA = pal("#24160c", "#3a2414", "#54361e", "#6e4828", "#8a5e34", "#a87644", "#c49258")
LONA = pal("#5a4c3a", "#7a6a52", "#9a8a6c", "#b8a888", "#d2c4a2", "#e6dcbe", "#f6efda")

PASTO = pal("#2c4a26", "#3a5e2c", "#4c7432", "#62893a", "#7aa044", "#94b452")
PASTO_CL = pal("#3e5e2a", "#52763a", "#6a8e42", "#86a64c", "#a2bc58", "#bcd06a")
TRIGO = pal("#6a5a2a", "#8a7434", "#a88e40", "#c6a84c", "#dcc062", "#ecd682")
ARADO = pal("#3a2a1e", "#4e3a28", "#664c32", "#7c5e3c", "#94724a", "#aa8858")
MATA = pal("#162a1c", "#1e3824", "#28482c", "#345a34", "#42703c", "#52823f")
LAVANDA = pal("#3a3460", "#4c4478", "#605890", "#7a70aa", "#968cc4", "#b0a8d8")

FOLHAS_CARIMBO = [
    ((0, 0), (1, 0), (1, 1), (2, 1)),
    ((1, 0), (2, 0), (0, 1), (1, 1)),
    ((0, 0), (1, 0), (2, 0), (1, 1)),
    ((1, 0), (0, 1), (1, 1), (2, 1)),
    ((0, 0), (1, 0), (2, 1), (1, 1), (3, 1)),
    ((0, 0), (0, 1), (1, 1), (1, 2)),
]

FONTE = {
    "1": ["010", "110", "010", "010", "111"], "2": ["110", "001", "010", "100", "111"],
    "3": ["110", "001", "010", "001", "110"], "4": ["101", "101", "111", "001", "001"],
    "P": ["110", "101", "110", "100", "100"], "R": ["110", "101", "110", "101", "101"],
    "O": ["010", "101", "101", "101", "010"], "V": ["101", "101", "101", "101", "010"],
    "A": ["010", "101", "111", "101", "101"], "H": ["101", "101", "111", "101", "101"],
    "J": ["001", "001", "001", "101", "010"], "E": ["111", "100", "110", "100", "111"],
}


def normal_luz(luz, z: float = 0.6) -> tuple[float, float, float]:
    lx, ly = luz
    n = math.sqrt(lx * lx + ly * ly + z * z)
    return lx / n, ly / n, z / n


def copa(c: Camada, cx: float, cy: float, r: float, paleta: np.ndarray, luz, seed: int, dens: float = 0.62,
         achatar: float = 0.82, brilho: float = 0.0, escuro: float = 0.0, carimbos=FOLHAS_CARIMBO, escala: int = 1) -> None:
    """Um cacho de folhas: fundo escuro e centenas de carimbos de folha sombreados como uma esfera."""
    g = np.random.default_rng(abs(int(seed)))
    L = normal_luz(luz)
    nt = len(paleta)
    ry = r * achatar
    for y in range(int(cy - ry * 0.9), int(cy + ry * 0.9) + 1):
        for x in range(int(cx - r * 0.9), int(cx + r * 0.9) + 1):
            dx, dy = (x - cx) / (r * 0.9), (y - cy) / (ry * 0.9)
            if dx * dx + dy * dy <= 1:
                k = dx * L[0] + dy * L[1] + math.sqrt(max(0, 1 - dx * dx - dy * dy)) * L[2]
                i = int(np.clip((k * 0.5 + 0.5) * (nt - 1) * 0.55 - escuro * 2, 0, nt - 1))
                c.p(x, y, paleta[i])
    n = int(math.pi * r * ry * dens / (escala * escala))
    folhas = []
    for _ in range(n):
        ang = g.random() * math.tau
        d = math.sqrt(g.random()) * 1.06
        dx, dy = math.cos(ang) * d, math.sin(ang) * d
        nz = math.sqrt(max(0.0, 1 - dx * dx - dy * dy))
        k = dx * L[0] + dy * L[1] + nz * L[2]
        t = (k * 0.5 + 0.5) + g.normal(0, 0.09) + brilho - escuro
        folhas.append((t, cx + dx * r, cy + dy * ry, int(g.random() * len(carimbos))))
    folhas.sort(key=lambda f: f[0])
    for t, x, y, ic in folhas:
        i = int(np.clip(t * (nt - 1) + 0.3, 0, nt - 1))
        car = carimbos[ic]
        xi, yi = int(x), int(y)
        for (sx, sy) in car:
            for ex in range(escala):
                for ey in range(escala):
                    c.p(xi + sx * escala + ex, yi + sy * escala + ey, paleta[i])
        if i >= nt - 3:
            sx, sy = car[0]
            c.p(xi + sx * escala, yi + sy * escala, paleta[min(nt - 1, i + 1)])
        c.p(xi + car[-1][0] * escala, yi + (car[-1][1] + 1) * escala, paleta[max(0, i - 2)])


VEIOS = ruido_ret(901, 1.4, 7)
MUSGO_N = ruido(902, 4)


def tronco(c: Camada, cx: float, ytop: float, ybase: float, larg: float, luz, seed: int, musgo: float = 0.5,
           raizes: int = 3, base_larg: float = 1.0, inclina: float = 0.0, paleta: np.ndarray = CASCA,
           escuro: float = 0.0) -> None:
    """Tronco cilíndrico com casca em veios, musgo do lado da sombra e raízes abertas no pé."""
    g = np.random.default_rng(abs(int(seed)))
    lx = -1 if luz[0] < 0 else 1
    nt = len(paleta)
    for y in range(int(ytop), int(ybase) + 1):
        up = ybase - y
        w = larg * (1 + base_larg * 0.9 * math.exp(-up / (larg * 0.9 + 2)))
        xc = cx + inclina * up
        for x in range(int(xc - w / 2) - 1, int(xc + w / 2) + 2):
            u = (x + 0.5 - xc) / (w / 2)
            if abs(u) > 1:
                continue
            v = VEIOS[y % H, (x * 3 + seed * 17) % W]
            k = u * lx * 0.75 + 0.15 + (v - 0.5) * 1.1 - abs(u) ** 6 * 0.6 - escuro
            i = int(np.clip((k * 0.5 + 0.5) * (nt - 1) + 0.5, 0, nt - 1))
            c.p(x, y, paleta[i])
            m = MUSGO_N[y % H, x % W] + (0.35 if u * lx < 0 else -0.1) + math.exp(-up / 7) * 0.4 - (1 - musgo) * 0.6
            if m > 0.82:
                j = int(np.clip((k * 0.5 + 0.5) * 4 + (m - 0.82) * 6, 0, 4))
                c.p(x, y, MUSGO[j])
    for r in range(raizes):
        lado = -1 if r % 2 == 0 else 1
        comp = larg * (0.9 + g.random() * 0.9)
        x0 = cx + lado * larg * (0.2 + g.random() * 0.3)
        for s in range(int(comp)):
            t = s / max(comp, 1)
            x = x0 + lado * s
            y = ybase - 2 + t * 3 + math.sin(t * 3 + r) * 0.8
            esp = max(1, int((1 - t) * larg * 0.28))
            for e in range(esp):
                k = 0.5 - e / max(esp, 1) * 0.8 + (0.3 if lado * lx > 0 else -0.1)
                i = int(np.clip((k * 0.5 + 0.5) * (nt - 1), 0, nt - 1))
                c.p(x, y - e, paleta[i])
            if g.random() < 0.3:
                c.p(x, y - esp, MUSGO[2])


def pedra(c: Camada, cx: float, cy: float, rx: float, ry: float, luz, seed: int, musgo: float = 0.0,
          paleta: np.ndarray = PEDRA, escuro: float = 0.0) -> None:
    g = np.random.default_rng(abs(int(seed)))
    L = normal_luz(luz, 0.8)
    nt = len(paleta)
    fase = [g.random() * 6.28 for _ in range(3)]
    for y in range(int(cy - ry) - 2, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 2, int(cx + rx) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            ang = math.atan2(dy, dx)
            rr = 1 + 0.12 * math.sin(3 * ang + fase[0]) + 0.07 * math.sin(5 * ang + fase[1])
            d2 = (dx * dx + dy * dy) / (rr * rr)
            if d2 > 1:
                continue
            nz = math.sqrt(max(0, 1 - d2))
            k = dx * L[0] + dy * L[1] * 1.2 + nz * L[2] - escuro
            k += ((x * 7349 + y * 1933 + seed) % 97 / 97 - 0.5) * 0.25
            i = int(np.clip((k * 0.5 + 0.5) * (nt - 1) + 0.3, 0, nt - 1))
            if dy > 0.55 and d2 > 0.5:
                i = max(0, i - 2)
            c.p(x, y, paleta[i])
            if musgo > 0 and dy < -0.1 and MUSGO_N[y % H, x % W] + musgo * 0.5 > 0.8:
                c.p(x, y, MUSGO[int(np.clip((k * 0.5 + 0.5) * 4, 0, 4))])


def texto(c: Camada, x: int, y: int, s: str, cor, sombra=None) -> None:
    for i, ch in enumerate(s):
        gl = FONTE.get(ch)
        if gl is None:
            continue
        for j, linha in enumerate(gl):
            for k, b in enumerate(linha):
                if b == "1":
                    if sombra is not None:
                        c.p(x + i * 4 + k + 1, y + j + 1, sombra)
        for j, linha in enumerate(gl):
            for k, b in enumerate(linha):
                if b == "1":
                    c.p(x + i * 4 + k, y + j, cor)


# ─────────────────────────────── As cristas (o relevo) ───────────────────────────────
def _interp(pts) -> np.ndarray:
    xs, ys = zip(*pts)
    return np.interp(XS, xs, ys).astype(np.float32)


def _picos(seed: int, base: float, amps, periodos, expo: float = 1.4) -> np.ndarray:
    g = np.random.default_rng(seed)
    y = np.full(W, base, dtype=np.float32)
    for A, P in zip(amps, periodos):
        f = (XS / P + g.random()) % 1.0
        y -= A * (1 - np.abs(2 * f - 1)) ** expo
    return y


def _lombas(base: float, lombas, seed: int, ruido_k: float) -> np.ndarray:
    """Crista feita de colinas arredondadas que se sobrepõem (vales em V suave entre elas)."""
    y = np.full(W, base, dtype=np.float32)
    for (cx, h, w) in lombas:
        u = np.clip((XS - cx) / w, -1, 1)
        y = np.minimum(y, base - h * (1 - u * u) ** 1.3)
    return suavizar1d(y, 2) + (ruido1d(seed, 9) - 0.5) * ruido_k


CRISTA3 = _lombas(105, ((0, 18, 120), (120, 8, 80), (176, 6, 60), (300, 6.5, 70), (420, 12, 92), (486, 16, 70)), 11, 1.6)
CRISTA2 = _lombas(94, ((10, 15, 80), (110, 11, 64), (196, 8, 56), (334, 8.5, 48), (414, 13, 62), (476, 11, 44)), 12, 1.4)
_c1 = _lombas(73, ((30, 8, 64), (124, 7, 56), (214, 5, 54), (290, 3.5, 40), (456, 9, 56), (520, 10, 60)), 13, 1.2)
CRISTA1 = np.minimum(_c1, 73 - 14 * np.clip(1 - ((XS - CASTELO[0]) / 34) ** 2, 0, 1) ** 0.6)
CRISTA_M2 = _picos(21, 66, (9, 4.5, 2), (95, 34, 11)) + 9 * np.exp(-((XS - 382) / 44) ** 2)
CRISTA_M1 = _picos(22, 60, (20, 8, 3.2), (150, 52, 17)) + 14 * np.exp(-((XS - 384) / 50) ** 2)

ESTRADA3 = [(292, 170), (301, 152), (296, 140), (276, 128), (252, 119), (240, 112), (244, 105), (256, 100), (268, 95)]
ESTRADA2 = [(262, 104), (272, 99), (290, 96), (306, 92), (318, 89), (326, 87), (334, 83)]
ESTRADA1 = [(328, 86), (344, 76), (356, 71), (362, 67.5), (353, 64.8), (366, 62), (374, 60.5)]


def largura_estrada(y):
    return np.maximum(0.9, 0.0042 * (y - 56) ** 2)


def dist_polilinha(pts):
    """Distância (e lado, +1 à direita da direção de percurso) até uma polilinha."""
    d = np.full((H, W), 1e9, dtype=np.float32)
    lado = np.zeros((H, W), dtype=np.float32)
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        vx, vy = x1 - x0, y1 - y0
        t = np.clip(((XA - x0) * vx + (YA - y0) * vy) / (vx * vx + vy * vy), 0, 1)
        px, py = x0 + t * vx, y0 + t * vy
        dd = np.hypot(XA - px, YA - py)
        cr = np.sign(vx * (YA - y0) - vy * (XA - x0))
        m = dd < d
        d = np.where(m, dd, d)
        lado = np.where(m, cr, lado)
    return d, lado


def centro_estrada(pts, y: float) -> float:
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        if min(y0, y1) <= y <= max(y0, y1) and y0 != y1:
            return x0 + (x1 - x0) * (y - y0) / (y1 - y0)
    return pts[-1][0]


# ─────────────────────────────── Céu ───────────────────────────────
def nuvem(c: Camada, cx: float, cy: float, larg: float, alt: float, seed: int, paleta: np.ndarray, fonte,
          achatar: float = 1.0) -> None:
    """Nuvem de bolhas sombreadas como esferas, base reta, borda de luz voltada para o astro."""
    g = np.random.default_rng(seed)
    bolhas = []
    n = max(3, int(larg / 5))
    for i in range(n):
        t = i / (n - 1)
        r = alt * (0.35 + 0.65 * math.sin(math.pi * (0.1 + 0.8 * t))) * (0.75 + 0.45 * g.random())
        bx = cx - larg / 2 + t * larg + g.normal(0, 1.2)
        bolhas.append((bx, cy - r * 0.55 * achatar, r))
    for _ in range(n // 2):
        t = 0.2 + g.random() * 0.6
        r = alt * (0.3 + 0.4 * g.random())
        bolhas.append((cx - larg / 2 + t * larg, cy - alt * (0.7 + 0.5 * g.random()) * achatar, r))
    x0, x1 = int(cx - larg / 2 - alt * 1.3), int(cx + larg / 2 + alt * 1.3)
    y0, y1 = int(cy - alt * 2.2), int(cy + 2)
    x0, x1, y0, y1 = max(0, x0), min(W, x1), max(0, y0), min(H, y1)
    if x0 >= x1 or y0 >= y1:
        return
    yy, xx = YA[y0:y1, x0:x1], XA[y0:y1, x0:x1]
    alt_map = np.full(yy.shape, -1.0, np.float32)
    nx = np.zeros(yy.shape, np.float32)
    ny = np.zeros(yy.shape, np.float32)
    for (bx, by, r) in bolhas:
        dx, dy = (xx - bx) / r, (yy - by) / (r * achatar)
        d2 = dx * dx + dy * dy
        h = np.sqrt(np.clip(1 - d2, 0, 1)) * r - d2 * 0.01
        m = (d2 <= 1) & (h > alt_map)
        alt_map = np.where(m, h, alt_map)
        nx = np.where(m, dx, nx)
        ny = np.where(m, dy, ny)
    dentro = (alt_map >= 0) & (yy <= cy + (g.random() - 0.5))
    fx, fy = fonte
    vx, vy = fx - cx, fy - (cy - alt * 0.5)
    nv = math.hypot(vx, vy) + 1e-6
    L = (vx / nv, vy / nv)
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    k = nx * L[0] * 0.9 + ny * L[1] * 0.9 + nz * 0.35
    k = k * 0.5 + 0.5 - np.clip((yy - (cy - alt * 0.4)) / (alt * 0.8), 0, 1) * 0.25 * (L[1] < 0.3)
    nt = len(paleta)
    bay = BAYER_HW[y0:y1, x0:x1]
    idx = np.clip(np.floor(k * nt + bay * 0.8), 0, nt - 1).astype(int)
    sub = c.c[y0:y1, x0:x1]
    sub[dentro, :3] = paleta[idx[dentro]]
    sub[dentro, 3] = 1


def nuvens_faixa(c: Camada, y0: float, y1: float, seed: int, paleta: np.ndarray, fonte, limiar: float = 0.56,
                 ex: float = 34, xs=(0, W)) -> None:
    """Nuvens estiradas (cirros e estratos): densidade por ruído esticado, borda acesa do lado do astro."""
    dens = ruido_ret(seed, ex, 2.4) * 0.55 + ruido_ret(seed + 1, ex / 3.2, 1.3) * 0.3 + ruido(seed + 2, 2.5) * 0.15
    env = suave(y0, y0 + (y1 - y0) * 0.35, YA) * suave(y1, y1 - (y1 - y0) * 0.35, YA) * suave(xs[0], xs[0] + 30, XA) \
        * suave(xs[1], xs[1] - 30, XA)
    d = dens * (0.55 + 0.45 * env) * (env > 0.02)
    m = d > limiar
    fx, fy = fonte
    vx, vy = fx - 240, fy - (y0 + y1) / 2
    n = math.hypot(vx, vy) + 1e-6
    sx, sy = int(round(vx / n * 2)), int(round(vy / n * 2))
    rumo = np.roll(np.roll(d, -sy, 0), -sx, 1)
    perto = np.exp(-np.hypot(XA - fx, (YA - fy) * 1.5) / 110)
    k = 0.42 + (d - rumo) * 7 - (d - limiar) * 1.4 + perto * 0.45
    idx = pontilhar(np.clip(k, 0, 1), len(paleta), 0.8)
    c.mascara(m, paleta[idx])


def pintar_ceu(nome: str, per: dict) -> np.ndarray:
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    t = np.clip(YA / 70, 0, 1)[:, :, None]
    ceu = np.where(t < 0.5, topo * (1 - t * 2) + meio * t * 2, meio * (2 - t * 2) + horiz * (t * 2 - 1)).astype(np.float32)
    ax, ay = per["astro"]
    d = np.hypot(XA - ax, (YA - ay) * 1.25)
    nv = Camada()
    if nome == "manha":
        ceu += (np.exp(-d / 120) * 0.3)[:, :, None] * hexa("#fff4d8")
        ceu += (suave(40, 70, YA) * 0.1)[:, :, None] * hexa("#fff0d8")
        p = pal("#8a9ec4", "#a8bad8", "#c8d6ea", "#e4ecf6", "#f8fbff", "#ffffff")
        for (x, y, l, a, s) in ((262, 26, 64, 13, 1), (338, 14, 46, 9, 2), (432, 34, 58, 11, 3), (156, 34, 44, 8, 4),
                                (66, 18, 36, 7, 5), (206, 10, 30, 5, 6), (470, 12, 30, 6, 7)):
            nuvem(nv, x, y, l, a, s, p, (ax, ay), 0.85)
        # fiapos altos
        f = ruido_ret(14, 40, 2.5) * suave(0, 12, YA) * suave(30, 14, YA)
        ceu += (np.clip(f - 0.55, 0, 1) * 0.6)[:, :, None] * hexa("#ffffff")
    elif nome == "tarde":
        ceu += (np.exp(-d / 70) * 0.85 + np.exp(-d / 22) * 0.9 + np.exp(-d / 6) * 1.6)[:, :, None] * hexa("#ffd890")
        ceu += (np.exp(-np.abs(YA - 54) / 8) * np.exp(-np.abs(XA - ax) / 180) * 0.4)[:, :, None] * hexa("#ffb070")
        p = pal("#4a3466", "#6e3e6c", "#9c4e6c", "#cc6a6c", "#f08e6c", "#ffb878", "#ffdca0")
        for (x, y, l, a, s) in ((150, 16, 120, 8, 11), (300, 26, 110, 7, 12), (455, 14, 90, 7, 13), (40, 30, 80, 6, 14),
                                (250, 42, 70, 4.5, 15), (420, 40, 60, 4, 16)):
            nuvem(nv, x, y, l, a, s, p, (ax, ay + 20), 0.5)
        f = ruido_ret(15, 50, 2) * suave(2, 14, YA) * suave(46, 20, YA)
        ceu += (np.clip(f - 0.5, 0, 1) * 0.7)[:, :, None] * hexa("#ffb488")
        # disco do sol
        ds = np.hypot(XA - ax, YA - ay)
        ceu = np.where((ds < 6.5)[:, :, None], hexa("#fff6d8") * 1.6, ceu)
    else:
        p = pal("#0e1634", "#16204a", "#1e2c5c", "#2c3e72", "#46598e", "#6a7eb4")
        g = np.random.default_rng(3)
        for _ in range(340):
            x, y = int(g.random() * W), int(g.random() * 74)
            b = 0.3 + g.random() ** 2 * 0.95
            ceu[y, x] += b * hexa("#e8eeff") * (0.5 + 0.5 * suave(70, 20, y))
            if b > 1.0:
                for (ox, oy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= x + ox < W and 0 <= y + oy < H:
                        ceu[y + oy, x + ox] += 0.32
        via = np.exp(-((YA + 0.38 * XA - 150) / 14) ** 2) * (ruido(9, 5) * 0.6 + ruido(10, 2) * 0.4) * 0.3
        ceu += via[:, :, None] * hexa("#8a9ad8")
        ceu += (np.exp(-d / 40) * 0.35 + np.exp(-d / 12) * 0.4)[:, :, None] * hexa("#8aa4ee")
        for (x, y, l, a, s) in ((190, 36, 110, 6, 21), (410, 12, 90, 6, 22), (70, 18, 70, 5, 23)):
            nuvem(nv, x, y, l, a, s, p, (ax, ay), 0.5)
    a = nv.c[:, :, 3:4]
    ceu = ceu * (1 - a) + nv.c[:, :, :3] * a
    if nome == "noite":
        for y in range(ay - 8, ay + 9):
            for x in range(ax - 8, ax + 9):
                dd = math.hypot(x - ax, y - ay)
                if dd < 6.6:
                    cr = (x - ax + 2) ** 2 + (y - ay + 1) ** 2 < 4 or (x - ax - 2) ** 2 + (y - ay - 2) ** 2 < 2.5 \
                        or (x - ax + 1) ** 2 + (y - ay - 3) ** 2 < 1.2
                    ceu[y, x] = hexa("#c4cff0") if cr or dd > 5.8 else hexa("#f4f6ff")
                    if x - ax > 3.5 and dd > 4.6:
                        ceu[y, x] = hexa("#aab8e4")
    # pássaros
    if nome != "noite":
        g = np.random.default_rng(31)
        cor = hexa("#28304a") if nome == "manha" else hexa("#3a1e2e")
        bando = ((300, 30), (306, 27), (311, 31), (294, 34), (318, 26)) if nome == "manha" else \
                ((340, 40), (348, 37), (333, 43), (355, 41), (326, 38))
        for (bx, by) in bando:
            asa = int(g.random() * 2)
            ceu[by, bx] = cor
            ceu[by - asa, bx - 1] = cor
            ceu[by - asa, bx + 1] = cor
            ceu[by - 1 + asa, bx - 2] = cor
            ceu[by - 1 + asa, bx + 2] = cor
    return ceu


# ─────────────────────────────── Montanhas ───────────────────────────────
def pintar_montanha(crista: np.ndarray, paleta: np.ndarray, neve: np.ndarray | None, luz, seed: int,
                    altura_neve: float) -> Camada:
    c = Camada()
    lx = -1 if luz[0] < 0 else 1
    s1 = np.gradient(suavizar1d(crista, 2))
    s2 = np.gradient(suavizar1d(crista, 7))
    prof = np.clip((YA - crista[None, :]) / 22, 0, 1)
    s = s1[None, :] * (1 - prof) + s2[None, :] * prof
    sulcos = ruido_ret(seed, 2.6, 10) * 0.5 + ruido_ret(seed + 1, 6, 6) * 0.5
    k = 0.48 + np.clip(s * lx * -1.6, -0.45, 0.45) * (1 - prof * 0.4) + (sulcos - 0.5) * 0.3 - prof * 0.25
    nt = len(paleta)
    m = YA >= crista[None, :]
    c.mascara(m, paleta[pontilhar(np.clip(k, 0, 1), nt, 0.85)])
    if neve is not None:
        lim = altura_neve + (ruido_ret(seed + 2, 3, 10) - 0.5) * 9 + (sulcos - 0.5) * 6
        mn = m & (YA < lim) & (YA - crista[None, :] < 9 + sulcos * 7)
        kn = 0.55 + np.clip(s * lx * -2.0, -0.5, 0.5) + (sulcos - 0.5) * 0.4
        c.mascara(mn, neve[pontilhar(np.clip(kn, 0, 1), len(neve), 0.8)])
    return c


# ─────────────────────────────── O castelo ───────────────────────────────
def castelo(c: Camada, cx: int, base: int, luz, noite: bool) -> list[tuple[int, int]]:
    """O castelo da prova, distante, no alto do morro: muralha, torres de telhado cônico, flâmulas."""
    lx = -1 if luz[0] < 0 else 1
    claro, meio, sombra, escuro = "#efe6d6", "#cfc4b6", "#a49a96", "#5e5664"
    telha = ("#7a8ad0", "#5262a8", "#36407a")
    janelas: list[tuple[int, int]] = []

    def torre(x0: int, w: int, alt: int, teto: int, jan: list[tuple[int, int]]) -> None:
        for x in range(x0, x0 + w):
            u = (x - x0 + 0.5) / w * 2 - 1
            cor = claro if u * lx > 0.3 else meio if u * lx > -0.4 else sombra
            c.ret(x, base - alt, 1, alt, cor)
            for y in range(base - alt + 2, base, 3):           # fiadas de pedra
                if (x + y // 3) % 2 == 0:
                    c.p(x, y, sombra if cor != sombra else escuro)
        for x in range(x0 - 1, x0 + w + 1, 2):
            c.p(x, base - alt - 1, meio)
        c.ret(x0 - 1, base - alt, w + 2, 1, sombra)
        for k in range(teto):
            meia = (w + 2) * (1 - k / teto) / 2
            xc = x0 + w / 2
            for x in range(int(round(xc - meia)), int(round(xc + meia))):
                u = (x + 0.5 - xc) / max(meia, 0.5)
                c.p(x, base - alt - 2 - k, telha[0] if u * lx > 0.2 else telha[1] if u * lx > -0.5 else telha[2])
        c.p(int(x0 + w / 2), base - alt - 2 - teto, escuro)
        for (jx, jy) in jan:
            c.p(x0 + jx, base - alt + jy, escuro)
            c.p(x0 + jx, base - alt + jy + 1, escuro)
            janelas.append((x0 + jx, base - alt + jy))

    c.ret(cx - 20, base - 7, 40, 8, meio)
    for x in range(cx - 20, cx + 20):
        if (x - cx) % 2 == 0:
            c.p(x, base - 8, meio)
        c.p(x, base - 7, claro if lx < 0 else sombra)
        if (x * 5) % 7 == 0:
            c.p(x, base - 3, sombra)
    c.ret(cx - 2, base - 5, 4, 6, escuro)
    c.p(cx - 2, base - 5, meio)
    c.p(cx + 1, base - 5, meio)
    for (jx, jy) in ((cx - 13, base - 5), (cx + 11, base - 5)):
        c.p(jx, jy, escuro)
        janelas.append((jx, jy))
    torre(cx - 22, 5, 16, 7, [(2, 4)])
    torre(cx + 17, 5, 14, 6, [(2, 4)])
    torre(cx - 12, 6, 22, 8, [(2, 4), (3, 12)])
    torre(cx + 6, 6, 20, 7, [(2, 5), (3, 12)])
    torre(cx - 4, 9, 30, 11, [(2, 5), (6, 5), (4, 14), (4, 21)])
    for (fx, fy, cor) in ((cx, base - 30 - 13, "#e04848"), (cx - 9, base - 22 - 10, "#f0c040"),
                          (cx + 9, base - 20 - 9, "#e04848")):
        c.ret(fx, fy - 4, 1, 5, escuro)
        c.ret(fx + 1, fy - 4, 3, 1, cor)
        c.ret(fx + 1, fy - 3, 2, 1, cor)
    return janelas


# ─────────────────────────────── As colinas ───────────────────────────────
def retalhos(crista: np.ndarray, seed: int, n: int, squash: float, tipos, pesos):
    """Lavouras em retalhos (Voronoi achatado pela perspectiva): id da célula, tipo, borda e direção dos sulcos."""
    g = np.random.default_rng(seed)
    pts = []
    while len(pts) < n:
        x = g.random() * (W + 40) - 20
        y = crista[int(np.clip(x, 0, W - 1))] + g.random() ** 1.3 * 40
        pts.append((x, y))
    d1 = np.full((H, W), 1e9, np.float32)
    d2 = np.full((H, W), 1e9, np.float32)
    idx = np.zeros((H, W), np.int32)
    deform = (ruido(seed + 5, 6) - 0.5) * 5
    for i, (px, py) in enumerate(pts):
        d = np.hypot(XA + deform - px, (YA - py) * squash)
        m1 = d < d1
        d2 = np.where(m1, d1, np.minimum(d2, d))
        idx = np.where(m1, i, idx)
        d1 = np.where(m1, d, d1)
    tipo_cel = g.choice(len(tipos), size=n, p=np.array(pesos) / sum(pesos))
    ang_cel = g.random(n) * math.pi
    borda = (d2 - d1) < 1.3
    return idx, tipo_cel[idx], borda, ang_cel[idx]


def sombrear_colina(crista: np.ndarray, luz, escala: float) -> np.ndarray:
    lx = -1 if luz[0] < 0 else 1
    s = np.gradient(suavizar1d(crista, 6))
    prof = np.clip((YA - crista[None, :]) / escala, 0, 1)
    k = 0.55 + np.clip(s[None, :] * lx * -2.4, -0.3, 0.3) * (1 - prof * 0.7) + (1 - prof) ** 3 * 0.12 - prof * 0.22
    return k


def arvore_pequena(c: Camada, x: float, yb: float, r: float, luz, seed: int, paleta=FOLHA_LONGE, cipreste: bool = False):
    lx = -1 if luz[0] < 0 else 1
    nt = len(paleta)
    if cipreste:
        alt = int(r * 4.5)
        for j in range(alt):
            t = j / alt
            meia = r * math.sin(math.pi * min(1, 0.15 + t * 0.95)) * 0.9
            for xx in range(int(x - meia), int(x + meia) + 1):
                u = (xx + 0.5 - x) / max(meia, 0.6)
                k = 0.5 + u * lx * 0.35 + (0.15 if t < 0.3 else 0) - t * 0.15 + ((xx * 5 + j * 3 + seed) % 5) * 0.04
                c.p(xx, yb - alt + j, paleta[int(np.clip(k * nt, 0, nt - 1))])
        c.p(x, yb, CASCA[1])
        return
    c.ret(x, yb - r * 0.6, 1, r * 0.6 + 1, CASCA[2])
    for yy in range(int(yb - r * 2.3), int(yb - r * 0.4) + 1):
        for xx in range(int(x - r) - 1, int(x + r) + 2):
            dx, dy = (xx + 0.5 - x) / r, (yy + 0.5 - (yb - r * 1.35)) / (r * 0.95)
            d2 = dx * dx + dy * dy
            bump = ((xx * 7 + yy * 13 + seed) % 11) / 11 * 0.25
            if d2 <= 1 - bump * 0.6:
                k = 0.5 + dx * lx * 0.45 - dy * 0.3 + bump - (d2 > 0.7) * 0.08
                c.p(xx, yy, paleta[int(np.clip(k * nt, 0, nt - 1))])


def pintar_colina1(nome: str, per: dict):
    """Colinas distantes, com o morro do castelo, retalhos de lavoura, sebes, bosquinhos, aldeia e a estrada."""
    c = Camada()
    arv = Camada()
    luz = per["luz"]
    m = YA >= CRISTA1[None, :]
    tipos = (PASTO, PASTO_CL, TRIGO, ARADO, MATA, PASTO)
    idx, tipo, borda, ang = retalhos(CRISTA1, 101, 70, 3.2, tipos, (3, 3, 2, 1.2, 1.5, 2))
    k = sombrear_colina(CRISTA1, luz, 18) + (ruido(102, 5) - 0.5) * 0.12
    sulco = (np.sin((XA * np.cos(ang) + YA * 3 * np.sin(ang)) * 1.9) > 0.3) & np.isin(tipo, (2, 3))
    k = k - sulco * 0.1
    img = np.zeros((H, W, 3), np.float32)
    for i, p in enumerate(tipos):
        mm = m & (tipo == i)
        img[mm] = p[pontilhar(np.clip(k, 0, 1), len(p), 0.7)][mm]
    c.mascara(m, img)
    c.mascara(m & borda & (YA > CRISTA1[None, :] + 1), MATA[1])
    # morro do castelo: encosta com rochas
    rocha = pal("#5a5860", "#7a767a", "#a09a96", "#c4beb4")
    mr = m & (np.abs(XA - CASTELO[0]) < 30) & (YA < CRISTA1[None, :] + 8 + (ruido(103, 3) - 0.5) * 6)
    kr = 0.4 + (XA - CASTELO[0]) / 60 * (-1 if luz[0] < 0 else 1) * -0.6 + (ruido(104, 2) - 0.5) * 0.6
    c.mascara(mr & (ruido(105, 2.5) > 0.5), rocha[pontilhar(np.clip(kr, 0, 1), 4, 0.8)])
    # estrada
    d, _ = dist_polilinha(ESTRADA1)
    rm = m & (d < largura_estrada(YA) * 0.5 + 0.35)
    c.mascara(rm, TERRA[pontilhar(np.clip(0.75 + (ruido(106, 2) - 0.5) * 0.4, 0, 1), len(TERRA), 0.6)])
    # árvores pequenas nas sebes e bosquinhos
    g = np.random.default_rng(107)
    for _ in range(170):
        x = g.random() * W
        xi = int(x)
        y = CRISTA1[xi] + 1 + g.random() * 16
        yi = int(y)
        if yi >= H or not (borda[yi, xi] or tipo[yi, xi] == 4) or abs(x - CASTELO[0]) < 24:
            continue
        if d[yi, xi] < 2:
            continue
        arvore_pequena(arv, x, y, 1.3 + (y - CRISTA1[xi]) * 0.05 + g.random() * 0.6, luz, int(x * 7), FOLHA_LONGE,
                       cipreste=g.random() < 0.18)
    # a aldeia: casinhas de telhado vermelho na encosta antes do castelo
    janelas = []
    for (hx, hy, hw) in ((300, 75, 4), (306, 74, 3), (292, 77, 3), (312, 77, 4), (420, 70, 3), (426, 71, 4)):
        c.ret(hx, hy - 2, hw, 2, "#d8ccb4")
        c.ret(hx + (hw - 1 if luz[0] < 0 else 0), hy - 2, 1, 2, "#a89c8c")
        c.ret(hx - 1, hy - 3, hw + 2, 1, "#a8442e")
        c.ret(hx, hy - 4, hw, 1, "#c85a3a")
        c.p(hx + 1, hy - 1, "#3a2a2a")
        janelas.append((hx + 1, hy - 1))
    c.p(309, 70, "#c8bca8")       # torre da capelinha
    c.p(309, 71, "#c8bca8")
    c.p(309, 69, "#a8442e")
    cas = Camada()
    jan_c = castelo(cas, CASTELO[0], CASTELO[1], luz, nome == "noite")
    return c, arv, cas, jan_c + janelas


def moinho(c: Camada, e: Camada, x: int, yb: int, luz) -> None:
    lx = -1 if luz[0] < 0 else 1
    for j in range(11):
        meia = 2.0 + j * 0.16
        for xx in range(int(x - meia), int(x + meia) + 1):
            u = (xx + 0.5 - x) / meia
            c.p(xx, yb - 10 + j, "#e2d8c4" if u * lx > 0.2 else "#bcb0a0" if u * lx > -0.4 else "#8c8278")
    for k in range(3):
        c.ret(x - 2 + k, yb - 11 - k, 5 - 2 * k, 1, "#8a4a34" if k else "#a85a3a")
    c.p(x, yb - 2, "#3a2a24")
    c.p(x, yb - 1, "#3a2a24")
    c.p(x, yb - 7, "#3a2a24")
    hub = (x, yb - 11)
    for ang in (0.35, 0.35 + math.pi / 2, 0.35 + math.pi, 0.35 + 3 * math.pi / 2):
        for s in range(1, 8):
            px, py = hub[0] + math.cos(ang) * s, hub[1] + math.sin(ang) * s * 0.95
            c.p(px, py, "#5a3e2a")
            if s > 2:
                c.p(px + math.cos(ang + 1.57), py + math.sin(ang + 1.57), "#d8ccb8" if s % 2 else "#b0a490")
    c.p(*hub, "#3a2a1e")


def marco(c: Camada, x: float, yb: float, alt: int, larg: int, num: str | None, luz, seed: int) -> None:
    """Marco de pedra da estrada: laje de topo arredondado, número entalhado, musgo e capim no pé."""
    lx = -1 if luz[0] < 0 else 1
    nt = len(PEDRA_MARCO)
    x0 = int(round(x - larg / 2))
    yt = int(yb - alt)
    for yy in range(yt, int(yb) + 1):
        for xx in range(x0, x0 + larg):
            u = (xx + 0.5 - x) / (larg / 2)
            arred = (larg / 2) * (1 - math.sqrt(max(0, 1 - u * u)))
            if yy - yt < arred * 0.9:
                continue
            k = 0.55 + u * lx * 0.32 - (yy - yt) / max(alt, 1) * 0.12
            k += (((xx * 7349 + yy * 1933 + seed) % 97) / 97 - 0.5) * 0.22
            if abs(u) > 0.78:
                k -= 0.12
            if yy - yt <= arred * 0.9 + 1:
                k += 0.14
            i = int(np.clip(k * nt, 0, nt - 1))
            c.p(xx, yy, PEDRA_MARCO[i])
            mz = MUSGO_N[yy % H, (xx * 3) % W] + (yb - yy) / max(alt, 1) * -0.5 + (0.3 if u * lx < 0 else 0)
            if mz > 0.75:
                c.p(xx, yy, MUSGO[int(np.clip(k * 5, 0, 4))])
    if num and alt >= 8:
        nx = int(round(x - 1.5 - (len(num) - 1) * 2))
        ny = yt + max(2, int(alt * 0.28))
        texto(c, nx, ny, num, PEDRA_MARCO[0])
        for i, ch in enumerate(num):        # luz pegando na borda de baixo do entalhe
            for j, linha in enumerate(FONTE[ch]):
                for k_, b in enumerate(linha):
                    if b == "1" and (j == 4 or FONTE[ch][j + 1][k_] == "0"):
                        c.p(nx + i * 4 + k_, ny + j + 1, PEDRA_MARCO[5])
    elif num:
        c.p(int(x), yt + max(1, alt // 3), PEDRA_MARCO[0])
        if alt >= 5:
            c.p(int(x), yt + max(1, alt // 3) + 1, PEDRA_MARCO[0])


def pintar_colina2(nome: str, per: dict):
    """Colinas do meio: lavouras maiores com sulcos, sebes, árvores, ciprestes, moinho, cerca e marcos pequenos."""
    c = Camada()
    obj = Camada()
    base = np.full((H, W), -1, np.float32)
    luz = per["luz"]
    m = YA >= CRISTA2[None, :]
    tipos = (PASTO, PASTO_CL, TRIGO, ARADO, LAVANDA, PASTO)
    idx, tipo, borda, ang = retalhos(CRISTA2, 201, 46, 2.4, tipos, (3, 3, 2.4, 1.3, 0.8, 2))
    k = sombrear_colina(CRISTA2, luz, 16) + (ruido(202, 4) - 0.5) * 0.14
    linhas = np.sin((XA * np.cos(ang) + YA * 2.4 * np.sin(ang)) * 1.4)
    sulco = (linhas > 0.35) & np.isin(tipo, (2, 3, 4))
    k = k - sulco * 0.13 + (linhas < -0.6) * np.isin(tipo, (2, 4)) * 0.06
    img = np.zeros((H, W, 3), np.float32)
    for i, p in enumerate(tipos):
        mm = m & (tipo == i)
        img[mm] = p[pontilhar(np.clip(k, 0, 1), len(p), 0.7)][mm]
    c.mascara(m, img)
    sebe = m & borda & (YA > CRISTA2[None, :] + 1)
    c.mascara(sebe, MATA[2])
    c.mascara(sebe & (np.roll(sebe, 1, 0) == 0), MATA[4])
    d, _ = dist_polilinha(ESTRADA2)
    w = largura_estrada(YA)
    rm = m & (d < w * 0.5 + 0.4)
    tv = 0.7 + (ruido(203, 2) - 0.5) * 0.5 - (np.abs(d - w * 0.2) < 0.5) * 0.15
    c.mascara(rm, TERRA[pontilhar(np.clip(tv, 0, 1), len(TERRA), 0.6)])
    c.mascara(m & ~rm & (d < w * 0.5 + 1.2), GRAMA[6])
    g = np.random.default_rng(204)
    # bosquinhos e árvores soltas (maiores que as da colina 1)
    pos = []
    for _ in range(90):
        x = g.random() * W
        xi = int(x)
        y = CRISTA2[xi] + 1.5 + g.random() * 13
        yi = int(min(y, H - 1))
        if not (borda[yi, xi] or g.random() < 0.08):
            continue
        if d[yi, xi] < 3 or 226 < x < 330 and y > CRISTA3[xi] - 1:
            continue
        pos.append((x, y))
    for (x, y) in sorted(pos, key=lambda p: p[1]):
        xi = int(x)
        t = Camada()
        cip = g.random() < 0.22
        r = 2.0 + (y - CRISTA2[xi]) * 0.09 + g.random() * 1.2
        arvore_pequena(t, x, y, r, luz, int(x * 13), FOLHA, cipreste=cip)
        obj.juntar(t)
        base[t.c[:, :, 3] > 0.4] = y
    # grupo de árvores maiores atrás do mascote, emoldurando a estrada
    for (x, r, s) in ((338, 4.2, 1), (346, 3.4, 2), (424, 4.5, 3), (432, 3.6, 4), (186, 3.8, 5), (198, 3.0, 6)):
        y = CRISTA2[int(x)] + 4
        t = Camada()
        arvore_pequena(t, x, y, r, luz, s * 31, FOLHA)
        obj.juntar(t)
        base[t.c[:, :, 3] > 0.4] = y
    e = Camada()
    t = Camada()
    moinho(t, e, 168, int(CRISTA2[168] + 4), luz)
    obj.juntar(t)
    base[t.c[:, :, 3] > 0.4] = CRISTA2[168] + 4
    # marcos 4 e 5 (pequenos, na beira da estrada do meio)
    for (yy, lado, num, alt, larg) in ((96, 1, "4", 5, 3), (89.5, -1, "5", 3, 2)):
        xc = centro_estrada(ESTRADA2, yy) + lado * (largura_estrada(yy) * 0.5 + 2)
        t = Camada()
        marco(t, xc, yy, alt, larg, num, luz, int(yy))
        obj.juntar(t)
        base[t.c[:, :, 3] > 0.4] = yy
    # cerquinha ao longo da estrada do meio (postes de 2-3 px)
    for i in range(10):
        yy = 93 - i * 0.9
        xx = centro_estrada(ESTRADA2, yy) - largura_estrada(yy) * 0.5 - 3 - i * 0.2
        obj.ret(xx, yy - 2, 1, 3, MADEIRA[4 if luz[0] < 0 else 2])
        if i:
            obj.p(xx + 1, yy - 1.5, MADEIRA[3])
    return c, obj, base


# ─────────────────────────────── O chão perto: prado, estrada, cerca ───────────────────────────────
class Objetos:
    """Objetos numa camada, guardando a linha do chão de cada um (para as sombras)."""

    def __init__(self) -> None:
        self.cam = Camada()
        self.base = np.full((H, W), -1, dtype=np.float32)
        self.emissivo = Camada()
        self.luzes: list[tuple[float, float, str, float, float]] = []

    def add(self, base: float, fn, *args) -> None:
        t = Camada()
        fn(t, *args)
        self.cam.juntar(t)
        self.base[t.c[:, :, 3] > 0.4] = base


def livre(x, y, folga=0) -> bool:
    x0, y0, x1, y1 = LIVRE["mascote"]
    return x0 - folga <= x <= x1 + folga and y0 <= y <= y1 + folga


def pintar_chao(nome: str, per: dict):
    c = Camada()
    luz = per["luz"]
    g = np.random.default_rng(301)
    m = YA >= CRISTA3[None, :]
    prof = np.clip((YA - CRISTA3[None, :]) / 60, 0, 1)
    # grama em tons por ruído, mais escura do lado esquerdo e embaixo das árvores
    v = fbm(302, (26, 9, 4), (0.5, 0.33, 0.17)) + g.random((H, W)).astype(np.float32) * 0.03
    lados = suave(150, 30, XA) * 0.22 + suave(400, 470, XA) * 0.12
    s = np.gradient(suavizar1d(CRISTA3, 8))
    v = v + (1 - prof) * 0.1 - lados + np.clip(s[None, :] * (-1 if luz[0] < 0 else 1) * -2, -0.1, 0.1)
    idx = pontilhar(np.clip((v - 0.26) * 1.08, 0, 1), len(GRAMA), 0.6)
    c.mascara(m, GRAMA[idx])
    # a estrada: sulcos de roda, faixa de capim no meio, poças e bordas irregulares
    d, lado = dist_polilinha(ESTRADA3)
    w = largura_estrada(YA)
    borda_n = (ruido(303, 2.5) - 0.5) * (0.6 + w * 0.08)
    estrada = m & (d < w * 0.5 + borda_n)
    sd = d * lado
    rel = np.abs(sd) / np.maximum(w * 0.5, 0.5)
    tv = ruido(304, 4) * 0.5 + ruido(305, 1.6) * 0.3 + g.random((H, W)).astype(np.float32) * 0.1
    tv = tv + 0.18 - suave(0.75, 1.05, rel) * 0.22
    sulco = np.abs(rel - 0.5) < np.clip(0.07 + 2.0 / np.maximum(w, 1), 0.07, 0.16)
    tv = tv - sulco * 0.24 + (np.abs(rel - 0.5) < 0.2) * (~sulco) * 0.04
    c.mascara(estrada, TERRA[pontilhar(np.clip(tv, 0, 1), len(TERRA), 0.7)])
    # borda de luz no lado do sulco que recebe sol
    lxs = -1 if luz[0] < 0 else 1
    br = estrada & sulco & (np.roll(sulco, lxs, 1) == 0)
    c.mascara(br, TERRA[6])
    # capim no meio da estrada
    meio = estrada & (rel < 0.14) & (ruido(306, 3) > 0.42)
    c.mascara(meio, GRAMA[4])
    poca_m = np.zeros((H, W), bool)
    for (py, k) in ((143, 1), (131, -1), (156, -1)):
        px = centro_estrada(ESTRADA3, py) + k * largura_estrada(py) * 0.5 * 0.5
        rx = largura_estrada(py) * 0.12 + 1.5
        e = (((XA - px) / rx) ** 2 + ((YA - py) / (rx * 0.32 + 0.6)) ** 2) <= 1
        poca_m |= e & estrada
    ceu_ag = hexa(per["ceu_agua"])
    agua = ceu_ag * (0.85 + 0.15 * (YA % 2)[:, :, None]) * np.ones((H, W, 3), np.float32)
    c.mascara(poca_m, agua)
    c.mascara(poca_m & ~np.roll(poca_m, 1, 0), TERRA[1])
    # pedrinhas na estrada
    for _ in range(260):
        x, y = g.random() * W, g.random() * H
        xi, yi = int(x), int(y)
        if not estrada[yi, xi] or poca_m[yi, xi]:
            continue
        r = 0.6 + g.random() * 1.4 * (0.4 + (y - 95) / 70)
        if r < 1.1:
            c.p(xi, yi, PEDRA[5])
            c.p(xi, yi + 1, PEDRA[2])
        else:
            pedra(c, x, y, r * 1.3, r * 0.9, luz, seed=xi * 31 + yi)
    # fios de capim, mais altos perto da câmera e nas bordas da estrada
    for _ in range(12000):
        x, y = g.random() * W, g.random() * H
        xi, yi = int(x), int(y)
        if not m[yi, xi] or (estrada[yi, xi] and not meio[yi, xi] and g.random() < 0.97):
            continue
        pr = np.clip((y - CRISTA3[xi]) / 60, 0, 1)
        alt = int(1 + g.random() * (1.5 + pr * 5))
        perto_estr = d[yi, xi] < w[yi, xi] * 0.5 + 3
        if perto_estr:
            alt += int(g.random() * 3 * pr)
        if livre(xi, yi, 1):
            alt = min(alt, 2)
        bi = int(np.clip(idx[yi, xi], 1, len(GRAMA) - 1))
        incl = (g.random() - 0.5) * 0.9
        for j in range(alt + 1):
            tone = min(len(GRAMA) - 1, bi - 1 + int(j * 2.4 / max(alt, 1)) + (1 if j == alt else 0))
            c.p(x + incl * j, y - j, GRAMA[tone])
    # tufos de capim alto (folhas arqueadas) fora da área do mascote
    for _ in range(170):
        x, y = g.random() * W, g.random() * H
        xi, yi = int(x), int(y)
        if not m[yi, xi] or estrada[yi, xi] or livre(xi, yi, 6) or yi < CRISTA3[xi] + 4:
            continue
        pr = np.clip((y - CRISTA3[xi]) / 60, 0, 1)
        n = 5 + int(g.random() * 4)
        for f in range(n):
            ang = -math.pi / 2 + (f / (n - 1) - 0.5) * 2.2
            comp = (3 + pr * 9) * (0.6 + g.random() * 0.5)
            for s_ in range(int(comp)):
                tt = s_ / comp
                xx = x + math.cos(ang) * s_ * 0.8 + math.cos(ang) * tt * tt * comp * 0.5
                yy = y + math.sin(ang) * s_ * (1 - tt * 0.6)
                c.p(xx, yy, GRAMA[min(len(GRAMA) - 1, 2 + int(tt * 5))])
    # flores do campo em canteirinhos
    cores = [("#ffffff", "#f4e8a0"), ("#f6d24a", "#c88a20"), ("#ff8ab0", "#ffd0e0"), ("#9a8af0", "#d8d0ff"),
             ("#ff6a4a", "#ffc070"), ("#7ac8ff", "#e0f4ff")]
    for _ in range(60):
        cx, cy = g.random() * W, g.random() * H
        if not m[int(cy), int(cx)] or estrada[int(cy), int(cx)] or cy < CRISTA3[int(cx)] + 3:
            continue
        cor, miolo = cores[int(g.random() * len(cores))]
        pr = np.clip((cy - CRISTA3[int(cx)]) / 60, 0, 1)
        for _ in range(4 + int(g.random() * 9)):
            x, y = cx + g.normal(0, 2.5 + pr * 4), cy + g.normal(0, 1 + pr * 1.5)
            xi, yi = int(x), int(y)
            if not (0 <= yi < H and 0 <= xi < W) or estrada[yi, xi] or not m[yi, xi]:
                continue
            for j in range(1 + int(pr * 3)):
                c.p(xi, yi + 1 + j, GRAMA[3])
            if pr > 0.5:
                for (ox, oy) in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    c.p(xi + ox, yi + oy, cor)
                c.p(xi, yi, miolo)
            else:
                c.p(xi, yi, cor)
                c.p(xi, yi - 1, miolo)
    # pedras soltas no prado
    for (x, y, r) in ((186, 132, 3.2), (192, 134, 2), (318, 104, 1.6), (402, 104, 2.2), (140, 118, 2.4),
                      (444, 116, 1.8), (232, 156, 3.0)):
        pedra(c, x, y, r * 1.3, r, luz, seed=int(x * 3 + y), musgo=0.6)
    return c, estrada, poca_m


def cerca(c: Camada, pts, luz) -> list[tuple[float, float, float]]:
    """Cerca de postes e duas travessas, com a perspectiva da distância. Devolve (x, base, altura) dos postes."""
    lx = -1 if luz[0] < 0 else 1
    postes = []
    comp = [math.hypot(x1 - x0, y1 - y0) for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:])]
    total = sum(comp)
    s = 0.0
    while s < total:
        acc, i = s, 0
        while i < len(comp) - 1 and acc > comp[i]:
            acc -= comp[i]
            i += 1
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        t = min(1, acc / comp[i])
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        alt = max(3.0, (y - 56) * 0.13)
        postes.append((x, y, alt))
        s += alt * 1.9
    for (x, y, alt) in postes:
        lw = 2 if alt > 7 else 1
        for j in range(int(alt) + 1):
            for q in range(lw):
                k = 4 if (q == 0) == (lx < 0) else 2
                if j == 0:
                    k = 5
                c.p(x + q, y - alt + j, MADEIRA[k])
        c.p(x, y - alt, MADEIRA[6])
    for (xa, ya, aa), (xb, yb, ab) in zip(postes[:-1], postes[1:]):
        for f in (0.28, 0.62):
            y0, y1 = ya - aa * (1 - f), yb - ab * (1 - f)
            n = int(max(abs(xb - xa), abs(y1 - y0))) + 1
            esp = 2 if aa > 9 else 1
            for k in range(n + 1):
                t = k / n
                xx, yy = xa + (xb - xa) * t, y0 + (y1 - y0) * t
                c.p(xx, yy, MADEIRA[5])
                if esp > 1:
                    c.p(xx, yy + 1, MADEIRA[2])
    return postes


def placa(c: Camada, x: int, yb: int, luz) -> None:
    """Placa de madeira com setas: PROVA (para o castelo) e HOJE (de volta)."""
    lx = -1 if luz[0] < 0 else 1
    alt = 30
    for j in range(alt):
        for q in range(3):
            k = (5 if q == (0 if lx < 0 else 2) else 3 if q == 1 else 2) - (1 if (j * 3 + q) % 7 == 0 else 0)
            c.p(x + q, yb - alt + j, MADEIRA[k])
    c.ret(x - 1, yb - 1, 5, 1, MADEIRA[1])
    c.p(x + 1, yb - alt - 1, MADEIRA[4])

    def tabua(y0: int, x0: int, x1: int, ponta: int, palavra: str) -> None:
        for y in range(y0, y0 + 9):
            meio = y0 + 4
            for xx in range(x0, x1 + 1):
                if ponta < 0 and xx - x0 < abs(y - meio):
                    continue
                if ponta > 0 and x1 - xx < abs(y - meio):
                    continue
                k = 5 if y == y0 else 1 if y == y0 + 8 else 4 if y < meio else 3
                if (xx * 5 + y * 3) % 11 == 0 or (y == meio + 1 and xx % 9 == 2):
                    k -= 1
                c.p(xx, y, MADEIRA[max(0, k)])
        c.p(x + 1, y0 + 1, "#c8c8c0")
        c.p(x + 1, y0 + 7, "#9a9a92")
        larg = len(palavra) * 4 - 1
        tx = (x0 + x1) // 2 - larg // 2 + (2 if ponta < 0 else -3)
        texto(c, tx, y0 + 2, palavra, "#f2e6c4", MADEIRA[1])

    tabua(yb - alt + 2, x - 4, x + 28, 1, "PROVA")
    tabua(yb - alt + 13, x - 19, x + 5, -1, "HOJE")


def muleta(c: Camada, x: int, yb: int, luz) -> None:
    """Muleta axilar de madeira encostada na cerca (o segredo da cena)."""
    lx = -1 if luz[0] < 0 else 1
    topo = (x - 4, yb - 21)
    for k in range(22):
        t = k / 21
        px = x + (topo[0] - x) * t
        py = yb + (topo[1] - yb) * t
        abre = 0 if t < 0.35 else min(1.6, (t - 0.35) * 5)
        if abre < 0.5:
            c.p(px, py, MADEIRA[6 if lx < 0 else 4])
            c.p(px + 1, py, MADEIRA[3])
        else:
            c.p(px - abre, py, MADEIRA[6 if lx < 0 else 4])
            c.p(px + abre + 1, py, MADEIRA[4])
    # apoio da axila (almofada) e a empunhadura
    c.ret(topo[0] - 2, topo[1] - 1, 6, 2, "#5a3a2a")
    c.ret(topo[0] - 2, topo[1] - 1, 6, 1, "#8a5a40")
    hy = int(yb - 21 * 0.62)
    hx = int(x + (topo[0] - x) * 0.62)
    c.ret(hx - 1, hy, 4, 1, "#3a2a20")
    c.ret(hx - 1, hy - 1, 4, 1, "#6a4a34")
    c.ret(x - 1, yb - 1, 3, 2, "#2a2a2e")     # ponteira de borracha


def carroca(c: Camada, e: Camada, x0: int, base: int, luz) -> list:
    """Carroça coberta, de lado: rodas de raios, leito de tábuas, lona em arcos, lampião, perna engessada atrás."""
    lx = -1 if luz[0] < 0 else 1
    bx0, bx1 = x0 + 2, x0 + 50
    by0, by1 = base - 21, base - 12
    # sombra de baixo (eixo) e lança
    for k in range(18):
        t = k / 17
        xx, yy = bx0 + 2 - t * 17, by1 - 1 + t * 10
        c.p(xx, yy, MADEIRA[2])
        c.p(xx, yy + 1, MADEIRA[1])
    c.ret(bx0 - 17, base - 1, 2, 2, MADEIRA[1])
    c.ret(bx0 - 19, base - 3, 6, 1, MADEIRA[3])
    # lona: arcos com as pontas abauladas
    cx_ = (bx0 + bx1) / 2
    L = normal_luz(luz, 0.9)
    for x in range(bx0 - 2, bx1 + 3):
        u = (x - cx_) / ((bx1 - bx0) / 2 + 2)
        ponta = max(0.0, abs(u) - 0.8) / 0.2
        topo = by0 - 17 + 6 * (1 - math.sqrt(max(0, 1 - ponta * ponta))) + abs(u) * 1.5
        for y in range(int(topo), by0 + 1):
            v = (y - topo) / max(1, by0 - topo)
            nz = math.sqrt(max(0.05, 1 - v * v * 0.6))
            k = 0.25 + (-v + 0.4) * L[1] * -0.9 + nz * 0.3 + u * L[0] * 0.25 + (0.2 if v < 0.2 else 0)
            k += math.sin(x * 1.9 + y * 0.4) * 0.05 + (((x * 13 + y * 7) % 9) / 9 - 0.5) * 0.08
            if (x - bx0 + 3) % 9 in (0, 1):
                k -= 0.12 if (x - bx0 + 3) % 9 == 0 else -0.06
            if y == int(topo):
                k += 0.15
            if y >= by0 - 1:
                k -= 0.2
            c.p(x, y, LONA[int(np.clip(k * 7, 0, 6))])
    # abertura de trás franzida, com a perna engessada aparecendo
    for y in range(by0 - 10, by0 - 2):
        dy = (y - (by0 - 6)) / 4
        meia = 2.2 * math.sqrt(max(0, 1 - dy * dy))
        for x in range(int(bx1 + 1 - meia), int(bx1 + 1 + meia) + 1):
            c.p(x, y, "#2a1e16")
    for k in range(6):
        c.p(bx1 + k, by0 - 7 + (k > 3), "#f2efe6" if k < 4 else "#d8d2c4")
        c.p(bx1 + k, by0 - 6 + (k > 3), "#d8d2c4" if k < 4 else "#bcb4a4")
    c.p(bx1 + 6, by0 - 7, "#f0d0b0")
    c.p(bx1 + 6, by0 - 8, "#f0d0b0")
    # leito de tábuas
    for y in range(by0, by1 + 1):
        for x in range(bx0, bx1 + 1):
            pr = (y - by0) // 3
            k = 5 if y == by0 else 1 if y == by1 else (3 if pr % 2 == 0 else 4)
            if (x * 7 + pr * 13) % 11 == 0:
                k -= 1
            if x in (bx0, bx1) or (x - bx0) % 16 == 0:
                k = 2 if (x != bx0 or lx > 0) else 5
            c.p(x, y, MADEIRA[max(0, k)])
    for x in range(bx0 + 3, bx1, 16):
        c.p(x, by0 + 2, "#8a8a84")
        c.p(x, by1 - 2, "#8a8a84")
    # rodas
    for (wx, r) in ((bx0 + 8, 6.5), (bx1 - 9, 8.5)):
        wy = base - r
        for y in range(int(wy - r) - 1, int(wy + r) + 2):
            for x in range(int(wx - r) - 1, int(wx + r) + 2):
                dd = math.hypot(x + 0.5 - wx, y + 0.5 - wy)
                if r - 1.0 <= dd <= r + 0.3:
                    c.p(x, y, "#3a3a40" if y > wy else "#6a6a70")
                elif r - 2.2 <= dd < r - 1.0:
                    c.p(x, y, MADEIRA[4] if (y < wy) == (lx < 0) or y < wy else MADEIRA[2])
        for kk in range(10):
            ang = kk / 10 * math.tau + 0.2
            for s in range(1, int(r - 1.8)):
                c.p(wx + math.cos(ang) * s, wy + math.sin(ang) * s, MADEIRA[5] if math.sin(ang) < 0 else MADEIRA[3])
        for (dx, dy) in ((0, 0), (-1, 0), (0, -1), (-1, -1)):
            c.p(wx + dx, wy + dy, MADEIRA[1])
        c.p(wx - 1, wy - 1, "#9a9a94")
    # lampião pendurado na frente da lona
    hx, hy = bx0 - 1, by0 - 15
    c.linha(hx + 2, hy - 1, hx - 3, hy - 1, MADEIRA[2])
    c.p(hx - 3, hy, "#2a2a2a")
    lx0, ly0 = hx - 5, hy + 1
    c.ret(lx0, ly0, 5, 1, "#2a2420")
    c.ret(lx0 + 1, ly0 + 1, 3, 4, "#ffd080")
    c.p(lx0, ly0 + 1, "#3a3028")
    c.p(lx0 + 4, ly0 + 1, "#3a3028")
    c.ret(lx0, ly0 + 5, 5, 1, "#2a2420")
    e.ret(lx0 + 1, ly0 + 1, 3, 4, "#ffd890")
    e.p(lx0 + 2, ly0 + 2, "#fff4d0")
    return [(lx0 + 2.5, ly0 + 3, "#ffb860", 46, 0.7)]


def barril(c: Camada, x: int, yb: int, luz) -> None:
    lx = -1 if luz[0] < 0 else 1
    for y in range(yb - 10, yb + 1):
        t = (y - (yb - 5)) / 5.5
        meia = 3.6 * (1 - t * t * 0.18)
        for xx in range(int(x - meia), int(x + meia) + 1):
            u = (xx + 0.5 - x) / meia
            k = 3.4 + u * lx * -1.6 - abs(u) ** 4 * 1.4
            if y in (yb - 9, yb - 2):
                c.p(xx, y, "#4a4a50" if u * lx > 0 else "#8a8a8e")
                continue
            if (xx - int(x)) % 2 == 0:
                k -= 0.6
            c.p(xx, y, MADEIRA[int(np.clip(k, 0, 6))])
    c.ret(x - 3, yb - 11, 7, 1, MADEIRA[2])
    c.ret(x - 2, yb - 11, 5, 1, MADEIRA[4])


def caixote(c: Camada, x: int, yb: int, w: int, h: int, luz) -> None:
    lx = -1 if luz[0] < 0 else 1
    for y in range(yb - h, yb + 1):
        for xx in range(x, x + w):
            k = 4 if (y - (yb - h)) % 3 else 3
            if xx in (x, x + w - 1) or y in (yb - h, yb):
                k = 2
            if y == yb - h:
                k = 5
            if xx == x + (w - 1 if lx > 0 else 0):
                k = 5 if lx < 0 else 2
            c.p(xx, y, MADEIRA[k])
    c.linha(x + 1, yb - h + 1, x + w - 2, yb - 1, MADEIRA[2])


def fogueira(c: Camada, e: Camada, x: int, y: int, nome: str, luz) -> None:
    for i in range(10):
        ang = i / 10 * math.tau
        pedra(c, x + math.cos(ang) * 6.5, y + math.sin(ang) * 2.2, 1.6, 1.2, luz, seed=i * 7 + 3, escuro=0.15)
    c.ret(x - 4, y - 1, 9, 2, "#2a1a14")
    for (dx0, dx1) in ((-5, 4), (-3, 5)):
        c.linha(x + dx0, y + (0 if dx0 < -4 else -1), x + dx1, y - 2 if dx0 < -4 else y, MADEIRA[2])
    for (dx, dy) in ((-2, 0), (1, -1), (3, 0), (0, 0), (-1, -1)):
        c.p(x + dx, y + dy, "#ff7a2a")
        e.p(x + dx, y + dy, "#ff8a3a")
    if nome == "manha":
        return
    alt = 5 if nome == "tarde" else 8
    for j in range(alt):
        t = j / alt
        meia = (1 - t) * (3.2 if nome == "noite" else 2.4) * (0.7 + 0.3 * math.sin(j * 1.7))
        for xx in range(int(x - meia), int(x + meia) + 1):
            u = abs(xx + 0.5 - x) / max(meia, 0.5)
            cor = "#fff2b0" if u < 0.4 and t < 0.6 else "#ffc04a" if u < 0.75 else "#ff6a20"
            c.p(xx, y - 2 - j, cor)
            e.p(xx, y - 2 - j, cor)
    e.p(x + 1, y - 2 - alt - 2, "#ff9a40")
    e.p(x - 2, y - 2 - alt - 4, "#ffc060")


def femur(c: Camada, x: int, y: int) -> None:
    """Um fêmur esquecido ao lado da fogueira (cabeça, colo, diáfise e côndilos)."""
    osso, sombra, luzo = "#e8dfc8", "#b4a88e", "#fffaea"
    c.ret(x + 2, y, 7, 1, osso)
    c.ret(x + 2, y + 1, 7, 1, sombra)
    c.p(x, y - 1, osso)
    c.p(x + 1, y - 1, luzo)
    c.p(x, y, osso)
    c.p(x + 1, y, osso)
    c.p(x + 1, y + 1, sombra)
    c.p(x + 9, y - 1, osso)
    c.p(x + 10, y - 1, luzo)
    c.p(x + 9, y + 1, osso)
    c.p(x + 10, y + 1, sombra)
    c.p(x + 10, y, osso)


def pintar_objetos(nome: str, per: dict) -> Objetos:
    luz = per["luz"]
    ob = Objetos()
    # cerca do lado esquerdo da estrada, do primeiro plano até perto da crista
    ob.add(-1, lambda c: None)
    t = Camada()
    postes = cerca(t, [(118, 166), (176, 148), (212, 134), (226, 124), (230, 116), (236, 108)], luz)
    ob.cam.juntar(t)
    for (x, y, alt) in postes:
        ob.base[int(max(0, y - alt - 1)):int(y) + 1, int(x) - 1:int(x) + 3] = y
    # sobra da travessa: base aproximada pela linha da cerca
    sem_base = (t.c[:, :, 3] > 0.4) & (ob.base < 0)
    ob.base[sem_base] = YA[sem_base] + 6
    # marcos 1, 2, 3 na beira da estrada perto
    for (yy, lado, num, alt, larg) in ((150, -1, "1", 15, 10), (126.5, 1, "2", 11, 8), (111, -1, "3", 8, 6)):
        xc = centro_estrada(ESTRADA3, yy) + lado * (largura_estrada(yy) * 0.5 + 3 + larg * 0.4)
        ob.add(yy, marco, xc, yy, alt, larg, num, luz, int(yy * 3))
        if alt > 10:
            t = Camada()
            for k in range(-int(larg / 2) - 2, int(larg / 2) + 3, 2):   # capim no pé
                for j in range(2 + (k * 7) % 3):
                    t.p(xc + k + (j > 1), yy + 1 - j, GRAMA[4 + j])
            ob.cam.juntar(t)
    # placa com setas e a muleta encostada
    ob.add(138, placa, 248, 138, luz)
    ob.add(134, muleta, 219, 134, luz)
    # acampamento: carroça, barril, caixotes, fogueira e o fêmur
    t, e = Camada(), Camada()
    luzes = carroca(t, e, 396, 137, luz)
    ob.cam.juntar(t)
    ob.base[t.c[:, :, 3] > 0.4] = 137
    ob.emissivo.juntar(e)
    ob.luzes += luzes
    ob.add(141, barril, 455, 141, luz)
    ob.add(140, caixote, 386, 140, 7, 6, luz)
    ob.add(141, caixote, 444, 141, 6, 5, luz)
    t, e = Camada(), Camada()
    fogueira(t, e, FOGO[0], FOGO[1] + 2, nome, luz)
    ob.cam.juntar(t)
    ob.emissivo.juntar(e)
    ob.base[t.c[:, :, 3] > 0.4] = FOGO[1] + 3
    ob.add(150, femur, 404, 149)
    return ob


# ─────────────────────────────── Árvores da moldura e primeiro plano ───────────────────────────────
def pintar_moldura(nome: str, per: dict, base_map: np.ndarray) -> Camada:
    c = Camada()
    luz = per["luz"]
    g = np.random.default_rng(401)
    for (x, base, larg, seed, ytop) in ((22, 158, 16, 1, -2), (470, 152, 15, 2, -2)):
        t = Camada()
        tronco(t, x, ytop, base, larg, luz, seed=seed, musgo=0.75, raizes=4, base_larg=0.8)
        c.juntar(t)
        base_map[t.c[:, :, 3] > 0.5] = base
    # galhos
    for (x0, y0, x1, y1, e) in ((26, 40, 92, 22, 4), (20, 62, 70, 52, 3), (466, 34, 420, 18, 4), (472, 58, 436, 50, 3)):
        n = int(math.hypot(x1 - x0, y1 - y0))
        for k in range(n):
            t = k / n
            xx, yy = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - math.sin(t * 3) * 3
            esp = max(1, int(e * (1 - t * 0.7)))
            for q in range(esp):
                c.p(xx, yy + q, CASCA[5 if q == 0 else 3 if q < esp - 1 else 1])
    # copas: esquerda escura (área do texto), direita mais viva
    for (cx, cy, r, s, esc) in ((-6, 8, 30, 1, 0.12), (30, 0, 26, 2, 0.1), (66, 10, 22, 3, 0.1), (98, 20, 15, 4, 0.06),
                                (8, 44, 18, 5, 0.12), (52, 32, 16, 6, 0.08), (116, 12, 9, 7, 0.04),
                                (486, 6, 30, 8, 0.0), (452, -2, 24, 9, 0.0), (428, 14, 14, 10, 0.0), (478, 44, 20, 11, 0.0),
                                (446, 34, 14, 12, 0.0), (420, 30, 8, 13, 0.0)):
        copa(c, cx, cy, r, FOLHA, luz, seed=420 + s, dens=0.62, brilho=0.05, escuro=esc)
    # cortinas de folhas pendentes
    for x0 in list(range(-4, 120, 13)) + list(range(418, 490, 11)):
        xx = x0 + g.random() * 6
        topo = 24 + g.random() * 16 if x0 < 200 else 36 + g.random() * 14
        n = int(2 + g.random() * 4)
        for k in range(n):
            copa(c, xx + math.sin(k * 1.3 + x0) * 2, topo + k * 3, 3.0 + (1 - k / n) * 2.3, FOLHA, luz,
                 seed=int(xx * 11) + k, dens=0.95, brilho=0.08, escuro=0.08 if x0 < 200 else 0)
    # arbustos no pé das árvores
    for (x, y, r, s) in ((6, 150, 12, 1), (44, 156, 10, 2), (64, 150, 7, 3), (446, 148, 6, 4), (480, 150, 10, 5)):
        copa(c, x, y, r, FOLHA, luz, seed=480 + s, dens=0.75, achatar=0.7, escuro=0.08)
    return c


def pintar_frente(nome: str, per: dict) -> Camada:
    c = Camada()
    luz = per["luz"]
    for (cx, cy, r, s) in ((-4, 162, 22, 1), (36, 172, 18, 2), (484, 160, 22, 3), (446, 174, 16, 4)):
        copa(c, cx, cy, r, FOLHA_ESC, luz, seed=900 + s, dens=0.5, escala=2)
    g = np.random.default_rng(51)
    for _ in range(110):
        x = g.random() * W
        if 110 < x < 420:
            continue
        alt = 6 + int(g.random() * 14)
        for j in range(alt):
            c.p(x + (j * j) / 60 * (1 if x > 240 else -1), H - 1 - j, FOLHA_ESC[2 + (j > alt // 2) + (j > alt * 0.8)])
    return c


# ─────────────────────────────── Montagem com luz ───────────────────────────────
def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def _caixa(arr: np.ndarray, r: int, eixo: int) -> np.ndarray:
    pad = [(0, 0)] * arr.ndim
    pad[eixo] = (r + 1, r)
    a = np.pad(arr, pad, mode="edge")
    s = np.cumsum(a, axis=eixo, dtype=np.float64)
    n = arr.shape[eixo]
    alto = np.take(s, np.arange(2 * r + 1, 2 * r + 1 + n), axis=eixo)
    baixo = np.take(s, np.arange(0, n), axis=eixo)
    return ((alto - baixo) / (2 * r + 1)).astype(np.float32)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    """Desfoque gaussiano aproximado (três passadas de caixa), em float: preserva luzes acima de 1."""
    if raio <= 0:
        return arr
    r = max(1, int(round(raio * 0.85)))
    out = arr.astype(np.float32)
    for _ in range(3):
        out = _caixa(out, r, 0)
        out = _caixa(out, r, 1)
    return out


def desfocar_rgba(arr: np.ndarray, raio: float) -> np.ndarray:
    if raio <= 0:
        return arr
    pm = arr.copy()
    pm[:, :, :3] *= pm[:, :, 3:4]
    d = desfocar(pm, raio)
    a = np.maximum(d[:, :, 3:4], 1e-4)
    d[:, :, :3] = d[:, :, :3] / a
    d[:, :, 3:4] = np.clip(d[:, :, 3:4], 0, 1)
    return d


def sobre(base: np.ndarray, camada: np.ndarray) -> np.ndarray:
    a = camada[:, :, 3:4]
    return base * (1 - a) + camada[:, :, :3] * a


GY, GX = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)
GYa, GXa = GY / ESC, GX / ESC


def luz_pontual(cx: float, cy: float, raio: float, achatar: float = 1.0) -> np.ndarray:
    d2 = ((GXa - cx) / raio) ** 2 + ((GYa - cy) / (raio * achatar)) ** 2
    return np.exp(-d2 * 2.2)


def luz_em_degraus(cx: float, cy: float, raio: float, achatar: float, seed: int, degraus: int = 6) -> np.ndarray:
    ang = np.arctan2(GYa - cy, GXa - cx)
    g = np.random.default_rng(abs(int(seed)))
    f = [g.random() * 6.28 for _ in range(3)]
    mod = 1 + 0.08 * np.sin(5 * ang + f[0]) + 0.05 * np.sin(9 * ang + f[1]) + 0.03 * np.sin(14 * ang + f[2])
    d2 = ((GXa - cx) / (raio * mod)) ** 2 + ((GYa - cy) / (raio * achatar * mod)) ** 2
    i = np.exp(-d2 * 2.2)
    return i * 0.72 + np.floor(i * degraus) / degraus * 0.28


def raios_de_luz(mascara: np.ndarray, fonte: tuple[float, float], passos: int = 72, alcance: float = 0.92,
                 queda: float = 0.968) -> np.ndarray:
    hh, ww = mascara.shape
    sx, sy = fonte[0] * ESC, fonte[1] * ESC
    acum = np.zeros_like(mascara)
    peso = 1.0
    for i in range(passos):
        t = i / passos * alcance
        px = np.clip((GX + (sx - GX) * t).astype(np.int32), 0, ww - 1)
        py = np.clip((GY + (sy - GY) * t).astype(np.int32), 0, hh - 1)
        acum += mascara[py, px] * peso
        peso *= queda
    return acum / passos


def projetar_sombra(alfa: np.ndarray, base: np.ndarray, vetor) -> np.ndarray:
    ys, xs = np.nonzero((alfa > 0.4) & (base >= 0))
    out = np.zeros((H, W), dtype=np.float32)
    if len(xs) == 0:
        return out
    b = base[ys, xs]
    h = np.maximum(b - ys, 0).astype(np.float32)
    if callable(vetor):
        sx, sy = vetor(xs.astype(np.float32), b)
    else:
        sx, sy = vetor
    for s in np.linspace(0, 1, 4):
        hh = h + s
        tx = np.round(xs + sx * hh).astype(int)
        ty = np.round(b + sy * hh).astype(int)
        ok = (tx >= 0) & (tx < W) & (ty >= 0) & (ty < H)
        out[ty[ok], tx[ok]] = 1
    return out


def borda_luz(alfa: np.ndarray, ddx: int, ddy: int) -> np.ndarray:
    a = alfa > 0.5
    viz = np.roll(np.roll(a, -ddy, 0), -ddx, 1)
    viz[:2, :] = True
    viz[-2:, :] = True
    viz[:, :2] = True
    viz[:, -2:] = True
    return (a & ~viz).astype(np.float32)


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    fx, fy = FOGO
    ax, ay = per["astro"]

    ceu = ampliar(pintar_ceu(nome, per))
    lx = -1 if per["luz"][0] < 0 else 1
    neve = pal("#9aa8c4", "#c4cee0", "#e4eaf4", "#f8faff")
    m_longe = pintar_montanha(CRISTA_M1, pal("#5a6c8c", "#6c7e9c", "#8090ac", "#96a4bc", "#aebcd0"), neve, per["luz"], 501, 44)
    m_perto = pintar_montanha(CRISTA_M2, pal("#3e5266", "#4a6070", "#587080", "#68808c", "#7c9298"), None, per["luz"], 511, 0)
    col1, arv1, cast, janelas = pintar_colina1(nome, per)
    col2, obj2, base2 = pintar_colina2(nome, per)
    chao, estrada, poca = pintar_chao(nome, per)
    obj = pintar_objetos(nome, per)
    base_arv = np.full((H, W), -1, dtype=np.float32)
    moldura = pintar_moldura(nome, per, base_arv)
    frente = pintar_frente(nome, per)

    # ── albedo com profundidade de campo, e os mapas de névoa, sol e "perto da fogueira"
    nev_chao = np.clip(1 - (GYa - ampliar(CRISTA3[None, :].repeat(H, 0)[:, :, None])[:, :, 0]) / 30, 0, 1) * 0.16
    kn = {"manha": 0.72, "tarde": 0.95, "noite": 0.9}[nome]
    planos = [  # (camada, desfoque, névoa, recebe sol, recebe fogo)
        (m_longe.c, 1.0, 0.56 * kn, 0.6, 0.0),
        (m_perto.c, 0.8, 0.44 * kn, 0.65, 0.0),
        (cast.c, 0.3, (0.22 if nome == "manha" else 0.12 if nome == "tarde" else 0.25), 0.3 if nome == "tarde" else 0.8, 0.0),
        (col1.c, 0.5, 0.34, 1.0, 0.0),
        (arv1.c, 0.5, 0.32, 0.9, 0.0),
        (col2.c, 0.25, 0.18, 1.0, 0.0),
        (obj2.c, 0.25, 0.16, 0.95, 0.0),
        (chao.c, 0.0, nev_chao, 1.0, 1.0),
        (obj.cam.c, 0.0, 0.0, 1.0, 1.0),
        (moldura.c, 0.7, 0.0, 0.55, 0.45),
    ]
    img = ceu.copy()
    solido = np.zeros(img.shape[:2], dtype=np.float32)
    m_nevoa = np.zeros_like(solido)
    m_sol = np.zeros_like(solido)
    m_fogo = np.zeros_like(solido)
    alfas = []
    for cam, r, nev, so, fo in planos:
        a = desfocar_rgba(ampliar(cam), r)
        al = a[:, :, 3]
        alfas.append(al)
        img = sobre(img, a)
        solido = solido * (1 - al) + al
        m_nevoa = m_nevoa * (1 - al) + nev * al
        m_sol = m_sol * (1 - al) + so * al
        m_fogo = m_fogo * (1 - al) + fo * al
    # o que está na frente de cada plano (para esconder o recorte de luz de quem está atrás)
    na_frente = []
    acc = np.zeros_like(solido)
    for al in reversed(alfas):
        na_frente.append(acc.copy())
        acc = acc * (1 - al) + al
    na_frente = list(reversed(na_frente))
    obj_a = alfas[8]

    # ── sombras projetadas e oclusão de contato
    chao_art = (np.maximum.reduce([col1.c[:, :, 3], col2.c[:, :, 3], chao.c[:, :, 3]]) > 0.5)
    vetor = per["sombra"]
    s_obj = projetar_sombra(obj.cam.c[:, :, 3], obj.base, vetor)
    s_arv = projetar_sombra(moldura.c[:, :, 3], base_arv, vetor)
    s_o2 = projetar_sombra(obj2.c[:, :, 3], base2, vetor)
    sombra_sol = np.maximum.reduce([s_obj, s_arv, s_o2 * 0.85])
    if nome == "tarde":   # árvores fora do quadro riscam o prado com sombras longas
        for (bx, larg) in ((150, 6), (205, 4), (520, 9), (560, 6)):
            xx = bx + (YA - 100) * (bx - SOL_TARDE[0]) * 0.0065 / 1.05
            banda = (np.abs(XA - xx) < larg * (0.5 + (YA - 100) / 80)) & (YA > CRISTA3[None, :] + 3)
            sombra_sol = np.maximum(sombra_sol, banda.astype(np.float32) * 0.8)
    sombra_sol = sombra_sol * chao_art * (obj.cam.c[:, :, 3] < 0.5)
    sombra_sol = desfocar(ampliar(sombra_sol[:, :, None]), 1.8)[:, :, 0]

    def do_fogo(xs, b):
        vx, vy = xs - fx, b - fy
        n = np.maximum(np.hypot(vx, vy * 2.6), 1)
        k = np.clip(n / 22, 0.4, 2.4)
        return vx / n * k, vy / n * k * 0.45
    s_fogo = projetar_sombra(obj.cam.c[:, :, 3], obj.base, do_fogo)
    s_fogo[fy - 6:fy + 7, fx - 10:fx + 11] = 0
    s_fogo = desfocar(ampliar((s_fogo * chao_art * (obj.cam.c[:, :, 3] < 0.5))[:, :, None]), 3)[:, :, 0]
    ao = np.zeros((H, W), np.float32)
    pe = (obj.cam.c[:, :, 3] > 0.4) & (obj.base >= 0) & (np.abs(YA - obj.base) < 2.5)
    ao = np.maximum(ao, pe.astype(np.float32))
    ao[int(137 - 3):139, 396:452] = np.maximum(ao[134:139, 396:452], 0.9)    # embaixo da carroça
    ao = desfocar(ampliar(ao[:, :, None]), 3)[:, :, 0] * (1 - obj_a * 0.7)

    # ── luz do sol
    if nome == "manha":
        nuvem_s = suave(0.5, 0.6, ruido(601, 34) * 0.7 + ruido(602, 12) * 0.3)
        nuvem_s = ampliar(nuvem_s[:, :, None])[:, :, 0]
        mapa_sol = 1.0 - nuvem_s * 0.5 * (GYa > 60)
    elif nome == "tarde":
        mapa_sol = 0.42 + luz_pontual(SOL_TARDE[0], 80, 190, 0.45) * 0.75 + suave(140, 420, GXa) * 0.15
    else:
        mapa_sol = 0.5 + luz_pontual(ax, 70, 230, 0.6) * 0.55
    mapa_sol = mapa_sol * (1 - sombra_sol * 0.9)
    amb = hexa(per["amb"]) * per["amb_k"]
    luz = amb * (1 - ao[:, :, None] * 0.55)
    luz = luz + hexa(per["sol"]) * per["sol_k"] * (mapa_sol * m_sol)[:, :, None]
    fk = per["fogo_k"]
    fogo = luz_em_degraus(fx, fy - 4, 100, 0.5, 21, 7)[:, :, None] * hexa("#ff8a3a") * 1.3
    fogo += luz_pontual(fx, fy - 5, 34, 0.8)[:, :, None] * hexa("#ffd890") * 0.6
    fogo = fogo * (1 - s_fogo * 0.85)[:, :, None]
    luz = luz + fogo * fk * m_fogo[:, :, None]
    for (lx_, ly_, cor, raio, k) in obj.luzes:
        luz = luz + luz_em_degraus(lx_, ly_, raio, 0.75, int(lx_), 5)[:, :, None] * hexa(cor) * k * per["lamp_k"] * m_fogo[:, :, None]
    vagas = []
    if nome == "noite":
        g = np.random.default_rng(17)
        while len(vagas) < 34:
            x, y = 120 + g.random() * 340, 96 + g.random() * 56
            if livre(x, y, 3):
                continue
            vagas.append((x, y, 0.5 + g.random() * 0.6))
        for (x, y, k) in vagas:
            luz = luz + luz_pontual(x, y + 4, 9, 0.6)[:, :, None] * hexa("#b8ff70") * 0.16 * k
    sol_ = solido[:, :, None]
    img = img * (1 - sol_) + img * sol_ * luz

    # ── recorte de luz nas silhuetas (cristas, árvores, castelo, objetos)
    ddx, ddy = {"manha": (-1, -1), "tarde": (0, -1), "noite": (0, -1)}[nome]
    rec = np.zeros((H, W), np.float32)
    for i, (cam, *_r) in enumerate(planos):
        if i == 0 and nome == "manha":
            continue
        peso = {0: 0.35, 1: 0.4, 3: 0.5, 5: 0.55, 7: 0.45}.get(i, 1.0)
        rec = np.maximum(rec, borda_luz(cam[:, :, 3], ddx, ddy) * peso)
    rec_a = ampliar(rec[:, :, None])[:, :, 0]
    # só onde a camada é a visível (o recorte de trás não atravessa o que está na frente)
    vis = np.zeros_like(rec_a)
    for i, (cam, *_r) in enumerate(planos):
        b = ampliar(borda_luz(cam[:, :, 3], ddx, ddy)[:, :, None])[:, :, 0]
        vis = np.maximum(vis, b * (1 - na_frente[i]))
    rec_a = desfocar((rec_a * vis)[:, :, None], 0.8)[:, :, 0]
    perto_luz = {"manha": luz_pontual(60, -20, 420, 0.7) * 0.7 + 0.15,
                 "tarde": luz_pontual(SOL_TARDE[0], SOL_TARDE[1], 150, 0.7) * 1.3 + 0.07,
                 "noite": luz_pontual(ax, ay, 220, 0.9) * 0.8 + 0.12}[nome]
    img += (rec_a * perto_luz)[:, :, None] * hexa(per["rim"]) * per["rim_k"] * (1 - sombra_sol * 0.7)[:, :, None]

    # ── névoa por distância e névoa dos vales
    nev = hexa(per["nevoa"]) * per["nevoa_k"]
    brilho_nev = 1.0
    if nome == "tarde":
        brilho_nev = 1 + luz_pontual(SOL_TARDE[0], SOL_TARDE[1] + 6, 120, 0.6)[:, :, None] * 0.9
    elif nome == "manha":
        brilho_nev = 1 + luz_pontual(80, 10, 200, 0.8)[:, :, None] * 0.15
    mn = m_nevoa[:, :, None] * sol_
    img = img * (1 - mn) + nev * brilho_nev * mn
    faixas = ampliar((ruido_ret(611, 46, 2.2) * 0.6 + ruido_ret(612, 18, 1.5) * 0.4)[:, :, None])[:, :, 0]
    vale = np.zeros_like(GYa)
    for crista, alcance, k_, alvo in ((CRISTA2, 6.0, 1.0, 3), (CRISTA3, 5.0, 0.8, 5), (CRISTA1, 6.5, 0.85, 1),
                                      (CRISTA_M2, 4.0, 0.5, 0)):
        cr = ampliar(np.broadcast_to(crista[None, :], (H, W))[:, :, None])[:, :, 0]
        acima = cr - GYa
        banda = np.exp(-np.clip(acima, 0, None) / alcance) * (acima > -1.5) * suave(-1.5, 1.5, acima)
        vale = np.maximum(vale, banda * k_)
    vale = vale * (0.45 + 0.75 * faixas)
    vale = np.clip(vale, 0, 1) * per["vale"] * (1 - na_frente[7] * 0) * suave(170, 40, GYa)
    vale = desfocar(vale[:, :, None], 1.5)[:, :, 0]
    cor_vale = hexa(per["vale_cor"]) * (brilho_nev if np.ndim(brilho_nev) == 0 else brilho_nev[:, :, 0][:, :, None] * 0.8 + 0.2)
    img = img * (1 - vale[:, :, None] * 0.85) + cor_vale * vale[:, :, None] * 0.85
    if nome == "manha":     # neblina rasteira no prado, mais forte longe
        rast = faixas * suave(CRISTA3.mean() + 30, CRISTA3.mean(), GYa) * 0.22 * (1 - obj_a)
        img = img * (1 - rast[:, :, None]) + hexa("#f0f4f2") * rast[:, :, None]

    # ── emissivos: lampião, fogueira, janelas do castelo e da aldeia
    em = ampliar(obj.emissivo.c)
    k_em = {"manha": 0.35, "tarde": 0.85, "noite": 1.6}[nome]
    img = img * (1 - em[:, :, 3:4] * min(1, k_em)) + em[:, :, :3] * em[:, :, 3:4] * k_em
    halo = desfocar(em[:, :, :3] * em[:, :, 3:4], 6) * 1.2 + desfocar(em[:, :, :3] * em[:, :, 3:4], 20) * 1.3
    img += halo * k_em * 0.5
    if nome != "manha":
        kj = 1.3 if nome == "noite" else 0.55
        jan = np.zeros((H, W), np.float32)
        for (wx, wy) in janelas:
            X, Y = int(wx * ESC), int(wy * ESC)
            alto = 2 if wy < 58 else 1
            img[Y:Y + alto * ESC, X:X + ESC] = img[Y:Y + alto * ESC, X:X + ESC] * (1 - kj * 0.7) + hexa("#ffd27a") * kj
            jan[wy, wx] = 1
        img += desfocar(ampliar(jan[:, :, None]), 4) * hexa("#ffb050") * 2.2 * kj
        img += desfocar(ampliar(jan[:, :, None]), 14) * hexa("#ff9a40") * 1.6 * kj

    # ── raios de luz volumétricos e poeira
    vis_ceu = (1 - solido) * (GYa < 70)
    poe = ampliar(ruido(81, 4)[:, :, None])[:, :, 0]
    if nome == "manha":
        raios = raios_de_luz(vis_ceu.astype(np.float32), (40, -60), passos=80, alcance=0.95)
        raios = desfocar(raios[:, :, None], 5)[:, :, 0]
        img += raios[:, :, None] * hexa("#fff0c8") * 0.55
        peso_poeira, cor_poeira = raios * 1.6 * (GYa > 60), "#fff4d0"
    elif nome == "tarde":
        brilho = np.exp(-np.hypot(GXa - SOL_TARDE[0], (GYa - SOL_TARDE[1]) * 1.2) / 7)
        raios = raios_de_luz((vis_ceu * (0.35 + brilho * 3)).astype(np.float32), SOL_TARDE, passos=96, alcance=0.98,
                             queda=0.976)
        raios = desfocar(raios[:, :, None], 3)[:, :, 0]
        img += raios[:, :, None] * hexa("#ffc078") * 2.3
        peso_poeira, cor_poeira = raios * 3 * (GYa > 58), "#ffd8a0"
    else:
        raios = raios_de_luz(vis_ceu.astype(np.float32) * np.exp(-np.hypot(GXa - ax, GYa - ay) / 30),
                             (ax, ay), passos=60, alcance=0.9)
        raios = desfocar(raios[:, :, None], 4)[:, :, 0]
        img += raios[:, :, None] * hexa("#8aa4ff") * 0.5
        peso_poeira, cor_poeira = raios * 0.5, "#c8d8ff"
    g = np.random.default_rng(83)
    rgbp = hexa(cor_poeira)
    for _ in range(1800):
        X, Y = int(g.random() * (W * ESC - 4)), int(g.random() * (H * ESC - 4))
        k = peso_poeira[Y, X] * (0.3 + g.random() * 0.8)
        if k > 0.04 and not livre(X / ESC, Y / ESC, 2):
            tam = 2 if g.random() < 0.7 else 3
            img[Y:Y + tam, X:X + tam] += rgbp * k
    # fumaça da fogueira (manhã: brasa fumegando; noite: faíscas)
    fum = np.zeros((H * ESC, W * ESC), np.float32)
    alt_f = {"manha": 40, "tarde": 30, "noite": 26}[nome]
    for k in range(80):
        t = k / 80
        x = fx + math.sin(t * 7) * (1 + t * 4) + t * 10
        y = fy - 3 - t * alt_f
        X, Y = int(x * ESC), int(y * ESC)
        r = int(2 + t * 6)
        fum[max(0, Y - r):Y + r, max(0, X - r):X + r] += (1 - t) * min(1, t * 6) * 0.25
    fum = desfocar(fum[:, :, None], 5)[:, :, 0]
    cor_f = {"manha": "#e4e2dc", "tarde": "#c8a8a0", "noite": "#5a6080"}[nome]
    img = img + fum[:, :, None] * (hexa(cor_f) - img) * {"manha": 0.55, "tarde": 0.35, "noite": 0.35}[nome]
    if nome == "noite":
        g = np.random.default_rng(91)
        for _ in range(14):
            x, y = fx + g.normal(0, 3), fy - 10 - g.random() * 20
            X, Y = int(x * ESC), int(y * ESC)
            img[Y:Y + 2, X:X + 2] += hexa("#ffb050") * (1.5 - (fy - y) / 30)
    # vaga-lumes
    if vagas:
        vl = np.zeros((H * ESC, W * ESC), np.float32)
        for (x, y, k) in vagas:
            X, Y = int(x * ESC), int(y * ESC)
            vl[Y:Y + 3, X:X + 3] += k
        img += vl[:, :, None] * hexa("#e8ffb0") * 1.2
        img += desfocar(vl[:, :, None], 5) * hexa("#a8ff60") * 2.6
        img += desfocar(vl[:, :, None], 14) * hexa("#80d040") * 1.6
    # reflexo do céu nas poças: brilho em pontinhos
    pa = ampliar(poca[:, :, None].astype(np.float32))[:, :, 0]
    img += (pa * ((GX.astype(int) // 3 + GY.astype(int) // 3) % 5 == 0))[:, :, None] * hexa(per["ceu_agua"]) * 0.4

    # ── primeiro plano desfocado e escuro
    fr = desfocar_rgba(ampliar(frente.c), 8)
    k_fr = {"manha": 0.5, "tarde": 0.36, "noite": 0.3}[nome]
    img = sobre(img, fr * np.array([k_fr, k_fr, k_fr * 1.05, 1], dtype=np.float32))

    # ── acabamento: brilho, curva de tom, cor, área calma do texto, vinheta e grão
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.85) * 5, 0, 1), 0, 2)
    img = img + desfocar(claro, 10) * 0.4 + desfocar(claro, 30) * 0.3
    joelho = 0.72
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, fr_ = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (fr_ * 0.5 + 0.5)))
    img = np.clip((img - 0.48) * 1.08 + 0.48, 0, 1.2)
    xn, yn = GX / (W * ESC), GY / (H * ESC)
    calma = ((1 - suave(0.3, 0.46, xn)) * (0.55 + 0.45 * (1 - suave(0.45, 0.9, yn))))[:, :, None]
    media = desfocar(np.clip(img, 0, 1.2), 14)
    img = media + (img - media) * (1 - 0.3 * calma)
    img *= 1 - 0.2 * calma
    v = (xn - 0.55) ** 2 * 1.2 + (yn - 0.55) ** 2 * 1.5
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.1)[:, :, None]
    gg = np.random.default_rng(99)
    img += (gg.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.014
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    nomes = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in nomes:
        t0 = time.time()
        img = montar(nome)
        grande, peq = PASTA / f"{LUGAR}-{nome}.webp", PASTA / f"{LUGAR}-{nome}-960.webp"
        img.save(grande, quality=84, method=6)
        img.resize((960, 320), Image.LANCZOS).save(peq, quality=83, method=6)
        print(nome, grande.stat().st_size // 1024, "KB", peq.stat().st_size // 1024, "KB", f"{time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
