"""Cenário "HD-2D" do topo da página Favoritas: o jardim murado da vila (30/10/2026).

Cada questão que a pessoa guarda é uma flor do jardim: as flores dos canteiros brilham de leve como estrelinhas (de dia
um cintilar discreto; à noite acendem de verdade, com halo). Arte original feita por código: nada baixado, nada gerado
por IA, nenhum personagem de terceiros. A cena é pintada em pixel art (480 x 160), camada por camada, e montada em 3x
com a luz calculada por pixel, como nos jogos "HD-2D" (a mesma técnica de gerar_cena_inicio.py e gerar_cena_vila.py):
- céu da hora: nuvens de algodão na manhã; o poente atrás do arco à tarde; lua, estrelas e vaga-lumes à noite;
- ao fundo, os morros enevoados e a vila (casinhas de telhado de barro, a igreja com a torre) atrás do muro baixo de
  pedra com hera; à direita, o arco de pedra coberto de trepadeira com rosas, aberto para a estradinha da vila;
- no jardim: o grande carvalho à esquerda (sombra calma, onde o site põe o texto), o banco de madeira, o poço de pedra
  com telhadinho, balde e manivela, as lanternas de jardim, o caminho de pedras que vem do arco até a frente, os
  canteiros (caixa de madeira na frente, borda de pedra à direita, a faixa ao pé do muro), o regador de cobre e, como
  detalhe ortopédico, uma bota de gesso aproveitada como vaso de flores ao pé do poço;
- luz: ambiente da hora, sol com sombras projetadas (curtas de manhã; à tarde o sol baixo entra pelo arco e risca o
  caminho com uma faixa dourada), salpicos de sol sob o carvalho, luzes quentes das lanternas e das janelas, feixes
  volumétricos com poeira, luz de recorte nas bordas, névoa por distância, brilho (bloom), curva de tom, correção de
  cor, vinheta e grão.
O chão de x 330-380 (pés em y 150) fica livre: é onde o mascote fica em pé, ao lado do canteiro da direita.

Gera em public/pixel/paginas/: jardim-manha, jardim-tarde e jardim-noite (.webp, 1440 x 480 e 960 x 320).
Uso: python3 scripts/gerar_cena_jardim.py              (as três)
     python3 scripts/gerar_cena_jardim.py noite        (só uma)
"""
from __future__ import annotations

import math
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "paginas"
W, H, ESC = 480, 160, 3
CHAO = 97            # pé do muro: onde o gramado do jardim começa
MURO_TOPO = 78       # topo da capa de pedra do muro
ARCO = (430, 51)     # centro do arco (o vão vai de x 415 a 445)
MASCOTE = (330, 95, 380, 150)


# ─────────────────────────────── Pincéis básicos ───────────────────────────────
@lru_cache(maxsize=4096)
def _hexa(c: str) -> tuple[float, float, float]:
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def hexa(c) -> np.ndarray:
    if not isinstance(c, str):
        return np.asarray(c, dtype=np.float32)
    return np.array(_hexa(c), dtype=np.float32)


def pal(*cores: str) -> np.ndarray:
    return np.array([_hexa(c) for c in cores], dtype=np.float32)


def mistura(a, b, t: float) -> np.ndarray:
    return hexa(a) * (1 - t) + hexa(b) * t


def suave(a: float, b: float, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def hash01(*v: int) -> float:
    """Número pseudoaleatório estável 0..1 (textura que não muda entre execuções)."""
    h = 2166136261
    for k in v:
        h = ((h ^ (int(k) & 0xFFFFFFFF)) * 16777619) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 1274126177) & 0xFFFFFFFF
    return (h & 0xFFFF) / 65535


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples."""

    def __init__(self) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and a > 0:
            rgb = hexa(cor)
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
        x0, y0, w, h = int(round(x0)), int(round(y0)), int(round(w)), int(round(h))
        xa, xb, ya, yb = max(0, x0), min(W, x0 + w), max(0, y0), min(H, y0 + h)
        if xa >= xb or ya >= yb:
            return
        m = np.zeros((H, W), dtype=bool)
        m[ya:yb, xa:xb] = True
        self.mascara(m, cor, a)

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / n
            self.p(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, cor, a)

    def mascara(self, m: np.ndarray, cor, a: float = 1.0) -> None:
        """Pinta onde m é verdadeiro; `cor` pode ser uma cor ou uma imagem H x W x 3."""
        m = m.astype(bool)
        if not m.any():
            return
        cor = hexa(cor) if isinstance(cor, str) else np.asarray(cor, dtype=np.float32)
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

    def disco(self, cx, cy, r, cores, luz=(-0.6, -0.8), granulado: float = 0.5) -> None:
        lx, ly = luz
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                dx, dy = x - cx, y - cy
                if math.hypot(dx, dy) <= r:
                    k = (dx * lx + dy * ly) / max(r, 1) + (hash01(x, y, 7) - 0.5) * granulado
                    self.p(x, y, cores[0] if k > 0.38 else cores[1] if k > -0.2 else cores[2])

    def contornar(self, cor: str, a: float = 1.0) -> None:
        m = self.c[:, :, 3] > 0.5
        viz = np.zeros_like(m)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            viz |= np.roll(np.roll(m, dy, 0), dx, 1)
        self.mascara(viz & ~m, cor, a)

    def juntar(self, outra: "Camada") -> None:
        a = outra.c[:, :, 3:4]
        na = a + self.c[:, :, 3:4] * (1 - a)
        self.c[:, :, :3] = (outra.c[:, :, :3] * a + self.c[:, :, :3] * self.c[:, :, 3:4] * (1 - a)) / np.maximum(na, 1e-6)
        self.c[:, :, 3:4] = na


YA, XA = np.mgrid[0:H, 0:W].astype(np.float32)


def poli(pts) -> np.ndarray:
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon([(float(x), float(y)) for x, y in pts], fill=255)
    return np.asarray(m) > 127


def elipse(cx, cy, rx, ry) -> np.ndarray:
    return ((XA + 0.5 - cx) / rx) ** 2 + ((YA + 0.5 - cy) / ry) ** 2 <= 1


def ruido(seed: int, escala: float, w: int = W, h: int = H) -> np.ndarray:
    g = np.random.default_rng(abs(int(seed)))
    pw, ph = int(w / escala) + 3, int(h / escala) + 3
    pequeno = g.random((ph, pw)).astype(np.float32)
    img = Image.fromarray(pequeno, mode="F").resize((int(pw * escala), int(ph * escala)), Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32)[:h, :w], 0, 1)


def ruido_ret(seed: int, ex: float, ey: float) -> np.ndarray:
    g = np.random.default_rng(abs(int(seed)))
    pw, ph = int(W / ex) + 3, int(H / ey) + 3
    pequeno = g.random((ph, pw)).astype(np.float32)
    img = Image.fromarray(pequeno, mode="F").resize((int(pw * ex), int(ph * ey)), Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32)[:H, :W], 0, 1)


def fbm(seed: int, escalas=(24, 9, 3.5), pesos=(0.55, 0.3, 0.15)) -> np.ndarray:
    return sum(ruido(seed + i, e) * p for i, (e, p) in enumerate(zip(escalas, pesos)))


BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16 - 0.47)
BAYER_HW = np.tile(BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W]


def pontilhar(v: np.ndarray, n: int, forca: float = 0.9) -> np.ndarray:
    return np.clip(np.floor(v * n + BAYER_HW * forca), 0, n - 1).astype(int)


def curva(pontos, passos: int = 60):
    """Catmull-Rom pelos pontos de controle (o caminho de pedras)."""
    pts = [pontos[0]] + list(pontos) + [pontos[-1]]
    saida = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = (np.array(p, dtype=np.float32) for p in pts[i - 1:i + 3])
        for k in range(passos):
            t = k / passos
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
            saida.append((float(q[0]), float(q[1])))
    return saida


# ─────────────────────────────── Horas do dia ───────────────────────────────
PERIODOS = {
    "manha": dict(
        luz=(-0.7, -0.7), amb="#94acd4", amb_k=0.46, sol="#ffe8bc", sol_k=1.12, sol_obj=0.85, sombra=(0.7, 0.28),
        nevoa="#cfe0ec", lamp_k=0.0, jan_k=0.0, flor_k=0.32, quente="#fff0d0", fria="#2a4a72", rec="#fff0c0", rec_k=0.45),
    "tarde": dict(
        luz=(0.75, -0.6), amb="#9a7cb8", amb_k=0.5, sol="#ffb060", sol_k=1.5, sol_obj=0.22, sombra=(-0.95, 0.9),
        nevoa="#f0a888", lamp_k=0.55, jan_k=0.55, flor_k=0.8, quente="#ffd49a", fria="#3a2a5e", rec="#ffa850", rec_k=1.2),
    "noite": dict(
        luz=(0.3, -0.95), amb="#4a5ca8", amb_k=0.46, sol="#9ab4ff", sol_k=0.55, sol_obj=0.6, sombra=(-0.35, 0.3),
        nevoa="#1c2a58", lamp_k=1.5, jan_k=1.4, flor_k=1.35, quente="#ffcf8a", fria="#0a1532", rec="#9ab4ff", rec_k=0.55),
}
SOL_TARDE = (432, 64)
LUA = (262, 19)

# Paletas (escuro -> claro). A luz da hora entra depois, na montagem.
FOLHA_CARV = pal("#0c1810", "#132418", "#1a321e", "#234424", "#2e582a", "#3e6e30", "#548638")
FOLHA_MEIO = pal("#10201c", "#173024", "#204228", "#2c5a2e", "#3e7434", "#56903c", "#76ac48", "#9cc65a")
FOLHA_ARB = pal("#122a18", "#1c3c1e", "#2a5426", "#3c6e2e", "#538a36", "#70a442", "#94c052", "#bada6c")
FOLHA_HERA = pal("#0e2216", "#16321e", "#204628", "#2c5c30", "#3c7438", "#548e44", "#74aa52")
FOLHA_LAVANDA = pal("#24302e", "#34463e", "#4a5e50", "#62786a", "#7e9480", "#9ab09a")
CASCA = pal("#140d09", "#22160f", "#332216", "#46301e", "#5c4028", "#755434", "#906a42", "#a88252")
MUSGO = pal("#2a4a1e", "#3e6626", "#58842e", "#78a238", "#9cbe48")
PEDRA = pal("#3a3632", "#55504a", "#706960", "#8c8478", "#a89e8e", "#c4b8a4", "#ddd2bc")
PEDRA_CAMINHO = pal("#3a3430", "#504843", "#665d55", "#7c7266", "#928676", "#a89a86", "#bcae96")
GRAMA = pal("#14281a", "#1c3a1e", "#284e24", "#36602a", "#467230", "#588436", "#6c963e", "#84a846", "#a0bc56")
MADEIRA = pal("#24160c", "#3a2414", "#54361e", "#6e4828", "#8a5e34", "#a87644", "#c49258")
TERRA = pal("#2a1c14", "#3a2a1e", "#4c3626", "#5e4430", "#70543a")

FOLHAS_CARIMBO = [
    ((0, 0), (1, 0), (1, 1), (2, 1)),
    ((1, 0), (2, 0), (0, 1), (1, 1)),
    ((0, 0), (1, 0), (2, 0), (1, 1)),
    ((1, 0), (0, 1), (1, 1), (2, 1)),
    ((0, 0), (1, 0), (2, 1), (1, 1), (3, 1)),
    ((0, 0), (0, 1), (1, 1), (1, 2)),
]
FOLHA_MIUDA = [((0, 0), (1, 0)), ((0, 0), (0, 1)), ((0, 0), (1, 1)), ((0, 0),)]


def normal_luz(luz, z: float = 0.6):
    lx, ly = luz
    n = math.sqrt(lx * lx + ly * ly + z * z)
    return lx / n, ly / n, z / n


def copa(c: Camada, cx: float, cy: float, r: float, paleta: np.ndarray, luz, seed: int, dens: float = 0.62,
         achatar: float = 0.82, brilho: float = 0.0, escuro: float = 0.0, carimbos=FOLHAS_CARIMBO) -> None:
    """Um cacho de folhas: miolo escuro e centenas de carimbos de folha sombreados como uma esfera."""
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
    n = int(math.pi * r * ry * dens)
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
            c.p(xi + sx, yi + sy, paleta[i])
        if i >= nt - 3:
            sx, sy = car[0]
            c.p(xi + sx, yi + sy, paleta[min(nt - 1, i + 1)])
        c.p(xi + car[-1][0], yi + car[-1][1] + 1, paleta[max(0, i - 2)])


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
          paleta: np.ndarray = PEDRA, escuro: float = 0.0, chata: bool = False) -> None:
    """Pedra arredondada sombreada como um domo (chata=True: laje do caminho, quase plana, com aresta)."""
    g = np.random.default_rng(abs(int(seed)))
    L = normal_luz(luz, 0.8 if not chata else 2.2)
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
            if chata:
                nz = 1.0 if d2 < 0.6 else nz
            k = dx * L[0] + dy * L[1] * 1.2 + nz * L[2] - escuro
            k += ((x * 7349 + y * 1933 + seed) % 97 / 97 - 0.5) * 0.25
            i = int(np.clip((k * 0.5 + 0.5) * (nt - 1) + 0.3, 0, nt - 1))
            if dy > 0.5 and d2 > 0.45:
                i = max(0, i - 2)
            elif dy < -0.5 and d2 > 0.55:
                i = min(nt - 1, i + 1)
            c.p(x, y, paleta[i])
            if musgo > 0 and MUSGO_N[y % H, x % W] + musgo * 0.5 > 0.86 and d2 > 0.35:
                c.p(x, y, MUSGO[int(np.clip((k * 0.5 + 0.5) * 4, 0, 4))])


# ─────────────────────────────── Céu ───────────────────────────────
def gradiente(paradas) -> np.ndarray:
    ys = np.array([p[0] for p in paradas], dtype=np.float32)
    cores = np.array([hexa(p[1]) for p in paradas])
    linha = np.stack([np.interp(np.arange(H), ys, cores[:, i]) for i in range(3)], 1).astype(np.float32)
    return np.repeat(linha[:, None, :], W, 1)


def nuvem_cumulo(ceu: np.ndarray, cx: float, base: float, larg: float, alt: float, seed: int, cores, luz) -> None:
    """Nuvem de algodão: união de bolas com fundo achatado, borda de luz e barriga na sombra (pixel art)."""
    g = np.random.default_rng(seed)
    m = np.zeros((H, W), bool)
    n = int(larg / 4) + 3
    bolas = []
    for i in range(n):
        t = i / (n - 1)
        x = cx - larg / 2 + t * larg + g.normal(0, 2)
        r = alt * (0.45 + 0.55 * math.sin(math.pi * t) ** 0.7) * (0.75 + g.random() * 0.4)
        y = base - r * 0.55
        bolas.append((x, y, r))
        m |= elipse(x, y, r, r * 0.86)
    for _ in range(int(larg / 8)):
        x = cx + g.normal(0, larg / 5)
        r = alt * (0.35 + g.random() * 0.4)
        m |= elipse(x, base - alt * 0.8 - g.random() * alt * 0.3, r, r * 0.86)
    m &= YA <= base
    lit, meio, sombra, fundo = (hexa(c) for c in cores)
    lx, ly = luz
    viz = np.roll(np.roll(m, int(round(-ly * 2)), 0), int(round(-lx * 2)), 1)
    borda_luz = m & ~viz
    topo = np.where(m.any(0), m.argmax(0), base)
    t = np.clip((YA - (base - alt * 1.3)) / (alt * 1.3), 0, 1)
    v = 1 - t + (ruido(seed, 4) - 0.5) * 0.35
    idx = pontilhar(np.clip(v, 0, 1), 3, 0.8)
    cor = np.where((idx == 2)[:, :, None], lit, np.where((idx == 1)[:, :, None], meio, sombra))
    cor = np.where(borda_luz[:, :, None], lit * 1.04, cor)
    cor = np.where(((YA >= base - 1) & m)[:, :, None], fundo, cor)
    ceu[m] = cor[m]


def pintar_ceu(nome: str) -> np.ndarray:
    if nome == "manha":
        ceu = gradiente([(0, "#3a78c6"), (26, "#5f9ad8"), (54, "#9cc8ea"), (72, "#d6e8ee"), (90, "#eef2e4"), (160, "#eef2e4")])
        d = np.hypot(XA + 40, (YA + 30) * 1.2)
        ceu += (np.exp(-d / 150) * 0.45)[:, :, None] * hexa("#fff4d8")
        cores = ("#ffffff", "#e8eef8", "#b4c6e2", "#9aaed0")
        for (cx, base, larg, alt, s) in ((96, 34, 74, 15, 1), (262, 24, 56, 11, 2), (390, 40, 86, 17, 3),
                                         (474, 17, 40, 9, 4), (188, 52, 36, 7, 5), (330, 58, 30, 6, 6)):
            nuvem_cumulo(ceu, cx, base, larg, alt, s, cores, (-0.8, -0.6))
        # véu de nuvem fina bem no alto
        fino = (ruido_ret(41, 40, 3) - 0.6) * 3 * np.exp(-((YA - 10) / 8) ** 2)
        ceu += np.clip(fino, 0, 0.3)[:, :, None] * hexa("#ffffff")
    elif nome == "tarde":
        ceu = gradiente([(0, "#24265c"), (16, "#3e3676"), (32, "#7a4680"), (46, "#c86070"), (58, "#f08a62"),
                         (68, "#ffb46a"), (78, "#ffd890"), (160, "#ffd890")])
        sx, sy = SOL_TARDE
        d = np.hypot(XA - sx, (YA - sy) * 1.25)
        ceu += (np.exp(-d / 70) * 0.55 + np.exp(-d / 18) * 0.6)[:, :, None] * hexa("#ffd890")
        # faixas de nuvem acesas por baixo
        nv = ruido_ret(11, 46, 4) * 0.7 + ruido_ret(12, 12, 2) * 0.3
        for y in range(8, 66):
            for x in range(W):
                v = nv[y, x] - 0.55 - abs(y - 36) / 70
                if v > 0:
                    k = min(1, v * 8) * 0.9
                    t = y / 66
                    cor = mistura("#3a2a64", "#b0607a", t)
                    abaixo = nv[min(H - 1, y + 1), x] - 0.55 - abs(y + 1 - 36) / 70
                    if abaixo < 0:
                        perto = math.exp(-abs(x - sx) / 120)
                        cor = mistura(mistura("#e87878", "#ffd090", t), "#fff0b0", perto * 0.6)
                    ceu[y, x] = ceu[y, x] * (1 - k) + cor * k
        cores = ("#ffd4a0", "#e89a88", "#9a6088", "#6a4878")
        for (cx, base, larg, alt, s) in ((110, 44, 64, 10, 21), (300, 30, 44, 8, 22)):
            nuvem_cumulo(ceu, cx, base, larg, alt, s, cores, (0.9, 0.4))
        # o disco do sol
        for y in range(sy - 9, sy + 10):
            for x in range(sx - 9, sx + 10):
                dd = math.hypot(x - sx, y - sy)
                if dd < 6.5:
                    ceu[y, x] = hexa("#fffbe8") if dd < 5 else hexa("#ffe8a8")
        for y in (sy - 1, sy + 2):  # fiapos de nuvem cruzando o sol
            for x in range(sx - 14, sx + 12):
                ceu[y, x] = ceu[y, x] * 0.5 + hexa("#ff9a70") * 0.5
    else:
        ceu = gradiente([(0, "#03071a"), (26, "#081232"), (54, "#13204a"), (74, "#22325e"), (160, "#22325e")])
        g = np.random.default_rng(3)
        for _ in range(300):
            x, y = int(g.random() * W), int(g.random() ** 1.3 * 76)
            b = (0.3 + g.random() ** 2 * 0.9) * (1 - y / 95)
            ceu[y, x] += b * hexa("#e8eeff")
            if b > 0.85:
                for (ox, oy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= x + ox < W and 0 <= y + oy < H:
                        ceu[y + oy, x + ox] += 0.3 * b
        via = np.exp(-((YA - 0.28 * XA + 30) / 12) ** 2) * ruido(9, 6) * 0.22
        ceu += via[:, :, None] * hexa("#8a9ad8")
        # nuvens finas prateadas pelo luar
        nv = ruido_ret(13, 50, 4) * 0.7 + ruido_ret(14, 14, 2) * 0.3
        for y in range(20, 60):
            for x in range(W):
                v = nv[y, x] - 0.6 - abs(y - 42) / 60
                if v > 0:
                    k = min(1, v * 8) * 0.8
                    cor = hexa("#1a2650")
                    if nv[max(0, y - 1), x] - 0.6 - abs(y - 1 - 42) / 60 < 0:
                        cor = mistura("#3a4a80", "#9aaee0", math.exp(-abs(x - LUA[0]) / 90))
                    ceu[y, x] = ceu[y, x] * (1 - k) + cor * k
        lx, ly = LUA
        d = np.hypot(XA - lx, YA - ly)
        ceu += (np.exp(-d / 26) * 0.4 + np.exp(-d / 7) * 0.4)[:, :, None] * hexa("#9ab0f0")
        for y in range(ly - 8, ly + 9):
            for x in range(lx - 8, lx + 9):
                dd = math.hypot(x - lx, y - ly)
                if dd < 6.6:
                    cr = ((x - lx + 2) ** 2 + (y - ly + 1) ** 2 < 4 or (x - lx - 2) ** 2 + (y - ly - 2) ** 2 < 2.5
                          or (x - lx - 3) ** 2 + (y - ly + 3) ** 2 < 1.2)
                    ceu[y, x] = hexa("#c8d2f0") if cr or dd > 5.8 else hexa("#f6f8ff")
    return ceu.astype(np.float32)


# ─────────────────────────────── Fundo: morros e a vila ───────────────────────────────
def pintar_morros(nome: str) -> Camada:
    c = Camada()
    xs = np.arange(W)
    n = ruido(51, 20)[0] * 8 + ruido(52, 6)[0] * 2
    crista = 58 + 5 * np.sin(xs / 41) + n + 12 * np.exp(-((xs - 432) / 34) ** 2) - 6 * np.exp(-((xs - 120) / 60) ** 2)
    noite = nome == "noite"
    for x in range(W):
        y1 = int(crista[x])
        c.ret(x, y1, 1, H - y1, "#7d9ab8" if not noite else "#1a2650")
        c.p(x, y1, "#a8bed6" if not noite else "#2a3a6a")
    # segunda fileira, mais perto, com bosquinhos
    crista2 = 68 + 3 * np.sin(xs / 23 + 2) + ruido(53, 9)[0] * 4 + 7 * np.exp(-((xs - 432) / 26) ** 2)
    for x in range(W):
        y2 = int(crista2[x])
        c.ret(x, y2, 1, H - y2, "#6a8a8e" if not noite else "#18244a")
        if (x * 7) % 5 == 0:
            c.p(x, y2, "#88a8a4" if not noite else "#24305a")
    g = np.random.default_rng(54)
    for _ in range(70):
        x = g.random() * W
        if 412 < x < 452:
            continue
        y = crista2[int(x)] + 1
        r = 1.5 + g.random() * 2
        c.disco(x, y - r * 0.6, r, ("#6a8a7a", "#557466", "#425e54") if not noite else ("#24305a", "#1c284e", "#162042"))
    return c


def casinha(c: Camada, jan: Camada, x0: int, w: int, base: int, hp: int, ht: int, telhado, seed: int, luz,
            janelas=1, chamine=False) -> None:
    """Casinha da vila em três quartos: a empena de frente (caiada, cor de cada casa), a parede do lado na sombra,
    telhado de barro em fiadas com a cumeeira, porta, janelas (acendem à noite) e chaminé."""
    g = np.random.default_rng(seed)
    cal = [("#f2e8d2", "#cfc0a4"), ("#f0dcc0", "#c8b090"), ("#f4e0d8", "#c8aca4"), ("#e8e4d4", "#b8b4a4")][seed % 4]
    lado_esq = luz[0] < 0
    wf = int(w * 0.55)                  # largura da empena de frente
    xf0 = x0 if lado_esq else x0 + w - wf
    xs0, xs1 = (xf0 + wf, x0 + w) if lado_esq else (x0, xf0)
    for y in range(base - hp, base):
        for x in range(x0, x0 + w):
            k = hash01(x, y, seed) * 0.25
            frente = xf0 <= x < xf0 + wf
            c.p(x, y, mistura(cal[0], cal[1], k) if frente else mistura(cal[1], "#8a7c6c", 0.35 + k))
    c.ret(x0, base - 1, w, 1, "#7a6a58")
    # empena triangular da frente
    cxf = xf0 + wf / 2
    for j in range(ht):
        meia = wf / 2 * (1 - j / ht)
        for x in range(int(cxf - meia), int(cxf + meia) + 1):
            c.p(x, base - hp - 1 - j, mistura(cal[0], cal[1], 0.2 + hash01(x, j, seed) * 0.2))
    # o telhado do lado: um paralelogramo de telhas, da beira da empena até o fundo
    t0, t1, t2 = (hexa(q) for q in telhado)
    for j in range(ht + 1):
        y = base - hp - 1 - j
        meia = wf / 2 * (1 - j / (ht + 0.5))
        xa = cxf + meia if lado_esq else xs0 - 1
        xb = xs1 + 1 if lado_esq else cxf - meia
        if lado_esq:
            xa, xb = cxf + meia - 1, xs1 + 1 - j * 0.3
        else:
            xa, xb = xs0 - 1 + j * 0.3, cxf - meia + 1
        for x in range(int(xa), int(xb) + 1):
            fila = (base - hp - 1 - y) % 2
            cor = t2 if (x + fila * 2) % 4 == 0 else t1
            if j == ht:
                cor = t0
            c.p(x, y, cor)
    # beirais da empena (as duas águas vistas de frente)
    for j in range(ht + 1):
        meia = wf / 2 * (1 - j / (ht + 0.5)) + 1
        y = base - hp - 1 - j
        c.p(cxf - meia, y, t0)
        c.p(cxf - meia - 1, y + 1, t1)
        c.p(cxf + meia, y, t2 if lado_esq else t0)
    c.ret(cxf, base - hp - ht - 1, 1, 1, t0)
    # porta
    px = int(xf0 + wf / 2 - 1)
    c.ret(px, base - 5, 3, 4, "#5a3a26")
    c.p(px + 2, base - 3, "#d8b060")
    if chamine:
        cx = int(x0 + w * (0.7 if lado_esq else 0.3))
        c.ret(cx, base - hp - ht - 2, 3, ht - 1, "#9a7a6a")
        c.ret(cx + 2, base - hp - ht - 2, 1, ht - 1, "#6a5048")
        c.ret(cx - 1, base - hp - ht - 3, 5, 1, "#5a4038")
    for k in range(janelas):
        if k == 0:
            jx, jy = int(xf0 + 1 + (wf - 4) * 0.15), base - hp + 2
        else:
            jx, jy = int(xs0 + (xs1 - xs0) * k / (janelas + 0.4)), base - hp + 2
        if jy + 3 > base - 1 or jx < x0:
            continue
        c.ret(jx, jy, 2, 3, "#3a3442")
        if g.random() < 0.85:
            jan.ret(jx, jy, 2, 3, "#ffc068")
            jan.p(jx, jy, "#fff0c0")
        c.ret(jx - 1, jy + 3, 4, 1, "#e8dcc8")
        if k == 0:
            c.p(jx - 1, jy + 2, "#e07a8a")  # vasinho na janela
            c.p(jx + 2, jy + 2, "#f0c040")


def pintar_vila(nome: str, per: dict) -> tuple[Camada, Camada, list]:
    """A vila no morro atrás do muro: casinhas, a igreja com a torre, árvores redondas e ciprestes; a estradinha
    que sai do arco. Devolve a camada, as janelas (emissivas) e as luzes das janelas."""
    c, jan = Camada(), Camada()
    luz = per["luz"]
    xs = np.arange(W)
    # o morro da vila
    morro = 74 + 2 * np.sin(xs / 17) + ruido(61, 8)[0] * 2 - 6 * np.exp(-((xs - 300) / 70) ** 2) + 4 * np.exp(-((xs - 432) / 18) ** 2)
    n = fbm(62, (14, 5, 2))
    for x in range(W):
        for y in range(int(morro[x]), H):
            v = n[y, x]
            cor = mistura("#6a8a52", "#4e7044", 0.5 + (v - 0.5) * 1.6)
            if int(morro[x]) == y:
                cor = hexa("#8aa866")
            c.p(x, y, cor)
    # a estradinha que sai do arco e sobe o morro
    for y in range(int(morro[430]) + 1, CHAO + 2):
        t = (y - morro[430]) / (CHAO - morro[430])
        cx = 432 - (1 - t) * 6 + math.sin(t * 5) * 2
        larg = 1.5 + t * 9
        for x in range(int(cx - larg), int(cx + larg) + 1):
            k = hash01(x, y, 63)
            c.p(x, y, mistura("#c8ae84", "#9a8060", k * 0.6 + abs(x - cx) / larg * 0.4))
    # árvores redondas e ciprestes atrás das casas
    g = np.random.default_rng(64)
    for _ in range(26):
        x = 170 + g.random() * 310
        if 410 < x < 454:
            continue
        y = morro[int(min(W - 1, x))] + 2
        if g.random() < 0.35:
            alt = 9 + g.random() * 8
            for j in range(int(alt)):
                meia = 1.6 * math.sin(math.pi * (j + 1) / (alt + 1)) ** 0.8 + 0.5
                for dx in range(-int(meia), int(meia) + 1):
                    c.p(x + dx, y - alt + j, "#3e5e3e" if dx < 0 else "#2c4630" if dx > 0 else "#34523a")
        else:
            copa(c, x, y - 4, 4 + g.random() * 3, FOLHA_MEIO, luz, int(x * 7), dens=0.7, achatar=0.85)
    # casinhas
    telhados = [("#c8664a", "#a84a36", "#6e2e24"), ("#b85a44", "#944032", "#5e2620"), ("#8a6a7a", "#6a5060", "#443444"),
                ("#d0784e", "#b0583a", "#743426")]
    casas = [(176, 14, 70, 6, 5, 2), (214, 14, 69, 6, 5, 1), (256, 16, 70, 7, 5, 3), (360, 14, 68, 6, 5, 0),
             (388, 12, 71, 6, 4, 2), (466, 14, 69, 6, 5, 1),
             (184, 18, 78, 8, 7, 0), (204, 20, 80, 9, 7, 1), (230, 14, 77, 7, 5, 2), (246, 22, 81, 10, 8, 3),
             (272, 18, 79, 8, 7, 0), (346, 18, 79, 9, 7, 1), (368, 22, 81, 10, 8, 3), (392, 14, 78, 7, 5, 2),
             (458, 24, 81, 11, 8, 0)]
    for i, (x0, w, base, hp, ht, ti) in enumerate(casas):
        casinha(c, jan, x0, w, base, hp, ht, telhados[ti], 70 + i, luz, janelas=1 + w // 12, chamine=(i % 3 == 0))
    # a igreja com a torre do sino (o ponto alto da vila)
    ix, ib = 296, 77
    casinha(c, jan, ix, 24, ib, 13, 9, ("#c8664a", "#a84a36", "#6e2e24"), 90, luz, janelas=2)
    tx = ix + 26
    for y in range(36, ib):
        for x in range(tx, tx + 9):
            sombra = (x - tx) > 5 if luz[0] < 0 else (x - tx) < 3
            c.p(x, y, mistura("#efe4cc", "#c0b096", hash01(x, y, 91) * 0.3) if not sombra else hexa("#a49680"))
    for yc in (48, 60):
        c.ret(tx - 1, yc, 11, 1, "#d8ccb4")
        c.ret(tx - 1, yc + 1, 11, 1, "#8a7c6a")
    c.ret(tx + 3, 39, 3, 6, "#2a2232")  # janela do sino
    c.ret(tx + 3, 39, 3, 1, "#d8ccb4")
    c.p(tx + 4, 42, "#c8902e")
    c.p(tx + 4, 43, "#8a5a20")
    jan.ret(tx + 4, 52, 1, 3, "#ffc068")
    for j in range(12):  # o pináculo
        meia = (j + 1) * 0.45
        y = 24 + j
        for x in range(int(tx + 4.5 - meia), int(tx + 4.5 + meia) + 1):
            c.p(x, y, "#a84a36" if x < tx + 4.5 else "#6e2e24")
    c.ret(tx + 4, 19, 1, 5, "#5a4a3a")
    c.ret(tx + 3, 20, 3, 1, "#5a4a3a")
    luzes = []
    ys, xs_ = np.nonzero(jan.c[:, :, 3] > 0.5)
    vistos = set()
    for (y, x) in zip(ys, xs_):
        chave = (x // 6, y // 6)
        if chave not in vistos:
            vistos.add(chave)
            luzes.append((x + 0.5, y + 2, 7, 1.0, "#ffb060", 0.35, "jan"))
    return c, jan, luzes


# ─────────────────────────────── O carvalho e o muro com o arco ───────────────────────────────
def pintar_carvalho(nome: str, per: dict) -> tuple[Camada, Camada]:
    """O carvalho do canto esquerdo (dentro do jardim): tronco grosso e a copa que escurece o lado do texto.
    Devolve o tronco (faz sombra) e a copa (só salpica o chão)."""
    luz = per["luz"]
    tr, cp = Camada(), Camada()
    tronco(tr, 54, 18, 114, 13, luz, 3, musgo=0.7, raizes=4, base_larg=1.1, inclina=0.05)
    # galhos grossos subindo para a copa
    for (x0, y0, x1, y1, e) in ((54, 50, 96, 22, 4), (52, 40, 20, 14, 4), (58, 34, 140, 26, 3), (56, 60, 4, 44, 3)):
        n = int(math.hypot(x1 - x0, y1 - y0))
        for i in range(n):
            t = i / n
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + math.sin(t * 3) * 3
            esp = max(1, int(e * (1 - t * 0.6)))
            for k in range(-esp, esp + 1):
                tom = 2 + (k < 0) * 2 + (hash01(int(x), k, 5) > 0.7)
                tr.p(x, y + k * 0.7, CASCA[min(7, tom)])
    for (x, y, r, s, esc) in ((20, 2, 46, 1, 0.25), (96, -4, 50, 2, 0.15), (150, 6, 30, 3, 0.1), (-4, 46, 26, 4, 0.3),
                              (56, 24, 34, 5, 0.1), (122, 34, 22, 6, 0.05), (176, 16, 16, 7, 0.0), (84, 46, 20, 8, 0.15),
                              (30, 60, 16, 9, 0.35)):
        copa(cp, x, y, r, FOLHA_CARV, luz, 300 + s, dens=0.85, achatar=0.7, escuro=esc)
    # folhinhas soltas só onde a copa já está (silhueta recortada, sem pontos no céu)
    a = cp.c[:, :, 3] > 0.5
    borda = a & ~(np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1))
    ys, xs = np.nonzero(borda)
    g = np.random.default_rng(310)
    for (y, x) in zip(ys, xs):
        if g.random() < 0.18:
            dx, dy = int(np.sign(x - 80)), int(np.sign(y - 20))
            cp.p(x + dx, y + dy, FOLHA_CARV[int(g.random() * 3) + 2])
    return tr, cp


def parede(c: Camada, x0: int, x1: int, y0: int, y1: int, luz, seed: int, alt: int = 4, larg=(6, 11)) -> None:
    """Cantaria de pedras irregulares: cada pedra com seu tom, aresta clara em cima, rejunte escuro, musgo embaixo."""
    g = np.random.default_rng(seed)
    n = ruido(seed + 5, 3)
    mus = ruido(seed + 6, 5)
    y = y0
    fila = 0
    while y < y1:
        ha = alt + (1 if g.random() < 0.3 else 0)
        x = x0 - int(g.random() * larg[1])
        while x < x1:
            wa = int(larg[0] + g.random() * (larg[1] - larg[0]))
            tom = g.random()
            for yy in range(y, min(y1, y + ha)):
                for xx in range(max(x0, x), min(x1, x + wa)):
                    ey, ex = yy - y, xx - x
                    if ey == ha - 1 or ex == wa - 1:
                        c.p(xx, yy, "#3a3430")
                        continue
                    k = 0.45 + (tom - 0.5) * 0.5 + (n[yy, xx] - 0.5) * 0.3
                    if ey == 0:
                        k += 0.22 if luz[1] < 0 else 0.05
                    if ex == 0 and luz[0] < 0:
                        k += 0.1
                    if ex == wa - 2:
                        k -= 0.12 if luz[0] < 0 else -0.08
                    if ey == ha - 2:
                        k -= 0.12
                    i = int(np.clip(k * 7, 0, 6))
                    cor = PEDRA[i]
                    if mus[yy, xx] > 0.62 and yy > y0 + (y1 - y0) * 0.5:
                        cor = cor * 0.55 + MUSGO[1 + int(k * 2)] * 0.45
                    c.p(xx, yy, cor)
            x += wa
        y += ha
        fila += 1


def pintar_muro(nome: str, per: dict) -> tuple[Camada, list]:
    """O muro baixo de pedra com capa, hera e rosas trepadeiras, e o arco de pedra à direita."""
    luz = per["luz"]
    c = Camada()
    ax, ay = ARCO
    r_in, r_out = 15, 25
    # o muro, dos dois lados do arco
    parede(c, 0, ax - r_in - 9, MURO_TOPO + 3, CHAO, luz, 101)
    parede(c, ax + r_in + 9, W, MURO_TOPO + 3, CHAO, luz, 102)
    for (xa, xb) in ((0, ax - r_in - 9), (ax + r_in + 9, W)):  # a capa de pedra, saliente
        for x in range(xa, xb):
            lajota = (x // 13) % 2
            c.p(x, MURO_TOPO, PEDRA[6] if hash01(x, 1) > 0.25 else PEDRA[5])
            c.p(x, MURO_TOPO + 1, PEDRA[5 - lajota])
            c.p(x, MURO_TOPO + 2, PEDRA[3 - lajota])
            if x % 13 == 0:
                c.p(x, MURO_TOPO + 1, PEDRA[1])
                c.p(x, MURO_TOPO + 2, PEDRA[1])
            c.p(x, MURO_TOPO + 3, "#2a2420")
    # ── O arco: pilares de blocos grandes, impostas, aduelas em leque e a pedra-chave
    for (px0, px1) in ((ax - r_in - 10, ax - r_in), (ax + r_in, ax + r_in + 10)):
        parede(c, px0, px1, ay, CHAO + 1, luz, 110 + px0, alt=6, larg=(5, 10))
        c.ret(px0 - 1, ay - 3, px1 - px0 + 2, 3, PEDRA[5])
        c.ret(px0 - 1, ay - 3, px1 - px0 + 2, 1, PEDRA[6])
        c.ret(px0 - 1, ay - 1, px1 - px0 + 2, 1, PEDRA[2])
        c.ret(px0 - 1, CHAO - 4, px1 - px0 + 2, 5, PEDRA[3])  # plinto
        c.ret(px0 - 1, CHAO - 4, px1 - px0 + 2, 1, PEDRA[5])
        c.ret(px0, ay, 1, CHAO - ay, PEDRA[5] if px0 < ax else PEDRA[2])
    naduelas = 13
    for y in range(ay - r_out - 1, ay + 1):
        for x in range(ax - r_out - 1, ax + r_out + 2):
            d = math.hypot(x + 0.5 - ax, y + 0.5 - ay)
            if not (r_in <= d < r_out) or y > ay - 3:
                if not (r_in <= d < r_out and y <= ay):
                    continue
            ang = math.atan2(-(y + 0.5 - ay), x + 0.5 - ax)  # 0 (direita) .. pi (esquerda)
            fat = ang / math.pi * naduelas
            i_ad = int(fat)
            borda = (fat - i_ad) < 0.09 or d > r_out - 1
            chave = i_ad == naduelas // 2
            nrm = (math.cos(ang), -math.sin(ang))
            k = 0.5 + (nrm[0] * luz[0] + nrm[1] * luz[1]) * 0.25 + (hash01(i_ad, 3) - 0.5) * 0.3
            if d < r_in + 1:
                k -= 0.25  # intradorso na sombra
            if chave:
                k += 0.1
            cor = "#3a3430" if borda and not chave else PEDRA[int(np.clip(k * 7, 0, 6))]
            c.p(x, y, cor)
    # pedra-chave saliente
    c.ret(ax - 3, ay - r_out - 3, 7, 12, PEDRA[4])
    c.ret(ax - 3, ay - r_out - 3, 7, 1, PEDRA[6])
    c.ret(ax + 2, ay - r_out - 2, 1, 11, PEDRA[2])
    c.ret(ax - 3, ay - r_out + 8, 7, 1, "#3a3430")
    # o vão por dentro: espessura do arco (intradorso) visível na lateral da sombra
    for y in range(ay - r_in, CHAO):
        for x in range(ax - r_in, ax + r_in):
            d = math.hypot(x + 0.5 - ax, y + 0.5 - ay)
            dentro = (y >= ay) or d < r_in
            perto_borda = (x < ax - r_in + 3) if luz[0] > 0 else (x >= ax + r_in - 3)
            if dentro and perto_borda and (y >= ay or d >= r_in - 3):
                c.p(x, y, PEDRA[1] if hash01(x, y) > 0.3 else PEDRA[0])
    # ── Hera no muro (cachos pendentes da capa)
    g = np.random.default_rng(120)
    for (hx, hw, hd) in ((128, 34, 13), (236, 22, 10), (300, 14, 7), (366, 26, 15), (466, 14, 12), (14, 18, 9)):
        for _ in range(hw * hd // 2):
            x = hx + g.random() * hw
            prof = hd * (0.4 + 0.6 * math.sin(math.pi * (x - hx) / hw)) * g.random() ** 0.7
            y = MURO_TOPO + prof
            car = FOLHA_MIUDA[int(g.random() * 4)]
            tom = int(np.clip(6 - prof / hd * 4 + g.normal(0, 1), 0, 6))
            for (sx, sy) in car:
                c.p(x + sx, y + sy, FOLHA_HERA[tom])
    return c, []


def pintar_trepadeira(c: Camada, flores: list, per: dict) -> None:
    """A trepadeira de rosas que sobe pelo pilar esquerdo do arco, cobre a volta e pende no vão."""
    luz = per["luz"]
    ax, ay = ARCO
    g = np.random.default_rng(130)
    caule = []
    for i in range(80):  # sobe pelo pilar esquerdo
        t = i / 79
        caule.append((ax - 23 + math.sin(t * 9) * 2, CHAO - t * (CHAO - ay)))
    for i in range(110):  # contorna o arco por fora
        ang = math.pi - i / 109 * math.pi * 0.86
        caule.append((ax + math.cos(ang) * 24 + math.sin(i / 5) * 1.5, ay - math.sin(ang) * 24 + math.cos(i / 7)))
    for (x, y) in caule[::2]:
        c.p(x, y, "#4a3a22")
    for j, (x, y) in enumerate(caule[::3]):
        r = 2.6 + g.random() * 2.2 + (1.5 if y < ay - 10 else 0)
        copa(c, x + g.normal(0, 1.5), y + g.normal(0, 1.2), r, FOLHA_HERA, luz, 1300 + j, dens=1.0, achatar=0.85,
             carimbos=FOLHA_MIUDA)
    # cachos que pendem dentro do vão
    for (hx, comp) in ((ax - 12, 12), (ax - 6, 7), (ax + 4, 9), (ax + 11, 15), (ax - 1, 4)):
        topo = ay - math.sqrt(max(0, 15 ** 2 - (hx - ax) ** 2)) + 1
        for k in range(comp):
            x = hx + math.sin(k / 2.5) * 0.8
            c.p(x, topo + k, FOLHA_HERA[3 + (k % 2)])
            if k % 2 == 0:
                c.p(x + (1 if k % 4 == 0 else -1), topo + k, FOLHA_HERA[2 + (k % 3)])
    # rosas (também cintilam: são flores do jardim)
    rosas = ("#ff9ab8", "#ffffff", "#ffc0d4", "#f87898")
    for j, (x, y) in enumerate(caule[4::7]):
        x += g.normal(0, 1.5)
        y += g.normal(0, 1.5)
        cor = rosas[j % 4]
        c.p(x, y, cor)
        c.p(x + 1, y, cor)
        c.p(x, y + 1, mistura(cor, "#802040", 0.4))
        c.p(x + 1, y + 1, mistura(cor, "#802040", 0.25))
        flores.append((x + 0.5, y + 0.3, "#ffd8e8", 0.55))


# ─────────────────────────────── O chão: gramado e caminho de pedras ───────────────────────────────
CAMINHO = curva([(431, 96), (428, 104), (414, 114), (392, 126), (370, 138), (356, 150), (350, 164)], 40)


def largura_caminho(y: float) -> float:
    return 7 + (y - CHAO) * 0.36


def pintar_chao(nome: str, per: dict, flores: list) -> tuple[Camada, np.ndarray]:
    """Gramado com tufos e trevos, a faixa de terra ao pé do muro e o caminho de lajes de pedra até o arco."""
    luz = per["luz"]
    c = Camada()
    v = fbm(201, (22, 8, 3.5), (0.55, 0.3, 0.15))
    prof = np.clip((YA - CHAO) / (H - CHAO), 0, 1)
    listras = np.sin((XA * 0.5 + YA * 1.6) / (6 + prof * 10)) * 0.05  # leve listra do corte
    tons = np.clip(0.18 + v * 0.62 + listras + prof * 0.06, 0, 1)
    idx = np.clip(pontilhar(tons, 5, 0.45) + 2, 0, len(GRAMA) - 1)
    cor = GRAMA[idx]
    chao = YA >= CHAO
    c.mascara(chao, cor)
    # sombra de contato ao pé do muro (terra úmida e capim mais escuro)
    for x in range(W):
        for k in range(3):
            c.p(x, CHAO + k, GRAMA[k] if hash01(x, k, 3) > 0.3 else TERRA[1 + k])
    g = np.random.default_rng(202)
    # tufos de capim em "v" (duas ou três folhas), com o pé escuro; maiores e mais espaçados perto
    for _ in range(1700):
        x, y = g.random() * W, CHAO + 3 + g.random() ** 0.9 * (H - CHAO - 3)
        pr = (y - CHAO) / (H - CHAO)
        alt = 1 + int(pr * 2.5 + g.random() * 0.8)
        bi = int(np.clip(idx[int(min(H - 1, y)), int(x)], 2, 7))
        for j in range(alt):
            c.p(x - (j + 1) * 0.5, y - j, GRAMA[min(8, bi + 1)])
            c.p(x + (j + 1) * 0.6, y - j - (j > 0), GRAMA[min(8, bi + 1 + (j == alt - 1))])
        c.p(x, y, GRAMA[min(8, bi + 1)])
        c.p(x, y + 1, GRAMA[max(0, bi - 2)])
    # trevinhos e florzinhas brancas do gramado (não brilham: são do capim)
    for _ in range(140):
        x, y = g.random() * W, CHAO + 4 + g.random() * (H - CHAO - 6)
        c.p(x, y, "#f4f4e8" if g.random() < 0.6 else "#f8e070")
        c.p(x + 1, y + 1, GRAMA[2])
    # ── o caminho de lajes
    ocup = np.zeros((H, W), bool)
    pts = CAMINHO
    i = 0
    seed = 0
    while i < len(pts):
        x, y = pts[i]
        lw = largura_caminho(y)
        rx = 2.0 + (y - CHAO) * 0.15
        ry = rx * 0.42
        # uma fileira com 1 a 3 lajes de lado a lado
        n_lado = 1 if lw < 12 else 2 if lw < 22 else 3
        for k in range(n_lado):
            off = (k - (n_lado - 1) / 2) * (lw * 2 / n_lado) * 0.95 + g.normal(0, rx * 0.12)
            rxx = rx * (0.85 + g.random() * 0.3) * (1.0 if n_lado == 1 else 1.1)
            cx, cy = x + off, y + g.normal(0, 0.3)
            c.mascara(elipse(cx + 0.6, cy + 0.9, rxx + 0.6, ry * 1.05 + 0.5), "#24301c", 0.75)
            pedra(c, cx, cy, rxx, ry * (0.9 + g.random() * 0.25), luz, 2100 + seed, musgo=0.25, paleta=PEDRA_CAMINHO,
                  chata=True)
            ocup |= elipse(cx, cy, rxx + 1, ry + 1)
            seed += 1
        # avança uma laje e um respiro de grama
        passo = ry * 2 + 1.6
        dy = 0
        while i < len(pts) and dy < passo:
            i += 1
            if i < len(pts):
                dy = pts[i][1] - y
    # pedrinhas soltas na beira do caminho
    for (x, y) in pts[::3]:
        lw = largura_caminho(y)
        for lado in (-1, 1):
            if g.random() < 0.5:
                px = x + lado * (lw + 1 + g.random() * 3)
                c.p(px, y, PEDRA_CAMINHO[5])
                c.p(px + 1, y, PEDRA_CAMINHO[3])
                c.p(px, y + 1, PEDRA_CAMINHO[1])
    return c, ocup


# ─────────────────────────────── Os objetos do jardim ───────────────────────────────
class Objetos:
    """Os objetos numa camada, guardando a linha do chão de cada um (para as sombras) e as luzes."""

    def __init__(self) -> None:
        self.cam = Camada()
        self.base = np.full((H, W), -1, dtype=np.float32)
        self.emissivo = Camada()
        self.luzes: list = []

    def add(self, base: float, fn, *args) -> None:
        t = Camada()
        fn(t, *args)
        self.cam.juntar(t)
        self.base[t.c[:, :, 3] > 0.4] = base


def flor(c: Camada, flores: list, x: float, y: float, cor: str, miolo: str, brilho: str, tam: int, k: float = 1.0) -> None:
    """Uma florzinha: pétalas em cruz (ou um ponto, longe) e o miolo; registra o cintilar de estrela."""
    xi, yi = int(round(x)), int(round(y))
    if tam >= 2:
        for (ox, oy) in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            c.p(xi + ox, yi + oy, cor)
        c.p(xi + 1, yi + 1, mistura(cor, "#3a2040", 0.35))
        c.p(xi, yi, miolo)
    else:
        c.p(xi, yi, cor)
        c.p(xi, yi + 1, mistura(cor, "#2a3a20", 0.5))
    flores.append((xi + 0.5, yi + 0.5, brilho, k * (1.0 if tam >= 2 else 0.6)))


CORES_FLOR = [  # (pétala, miolo, brilho da estrelinha)
    ("#fff6e0", "#f8c840", "#fff4c8"),
    ("#f27a9e", "#ffe890", "#ffd8e8"),
    ("#a68ae8", "#fff0a0", "#e4dcff"),
    ("#f8d040", "#c87820", "#fff8c0"),
    ("#78a8f0", "#ffffff", "#dff0ff"),
    ("#e85a5a", "#ffe0a0", "#ffd0c8"),
    ("#ffb0c8", "#fff2b0", "#ffe4ec"),
]


def touceira(c: Camada, flores: list, cx: float, cy: float, r: float, luz, seed: int, n_flor: int,
             paleta=FOLHA_ARB, cores=None, haste: bool = True) -> None:
    """Moita de folhas com flores por cima (as flores ficam na metade de cima, viradas para a luz)."""
    g = np.random.default_rng(seed)
    copa(c, cx, cy, r, paleta, luz, seed, dens=0.95, achatar=0.75)
    cores = cores or CORES_FLOR
    for _ in range(n_flor):
        ang = math.pi + g.random() * math.pi
        d = math.sqrt(g.random()) * r * 0.95
        x = cx + math.cos(ang) * d
        y = cy + math.sin(ang) * d * 0.75 - g.random() * 2.5
        if haste and g.random() < 0.5:
            alt = 2 + int(g.random() * 3)
            for j in range(alt):
                c.p(x, y + j, "#3e6a2e")
            y -= 1
        p, m, b = cores[int(g.random() * len(cores))]
        flor(c, flores, x, y, p, m, b, 2 if r > 3.5 and g.random() < 0.75 else 1)


def canteiro_madeira(c: Camada, flores: list, luz, x0: int, x1: int, yt: int, yb: int) -> None:
    """Canteiro alto em caixa de tábuas: borda de cima clara, tábuas da frente com veio e pregos, terra escura."""
    # terra vista de cima (faixa)
    for y in range(yt - 3, yt + 1):
        for x in range(x0 + 2, x1 - 2):
            c.p(x, y, TERRA[int(hash01(x, y, 5) * 3) + 1])
    # flores e folhagem plantadas
    g = np.random.default_rng(x0)
    n = int((x1 - x0) / 7)
    for i in range(n):
        x = x0 + 5 + (x1 - x0 - 10) * (i + g.random() * 0.6) / n
        touceira(c, flores, x, yt - 4 - g.random() * 2, 4 + g.random() * 2.5, luz, 500 + x0 + i, 3 + int(g.random() * 3))
    # tábuas
    for y in range(yt, yb):
        for x in range(x0, x1):
            ey = (y - yt) % 4
            k = VEIOS[y, (x * 2) % W]
            i = 4 if ey == 0 else 3 if k > 0.55 else 2
            if ey == 3:
                i = 1
            if x < x0 + 2 or x >= x1 - 2:
                i = 5 if x < x0 + 2 and luz[0] < 0 else 1 if x >= x1 - 2 and luz[0] < 0 else 3
            c.p(x, y, MADEIRA[i])
    c.ret(x0 - 1, yt - 1, x1 - x0 + 2, 2, MADEIRA[6])  # borda de cima
    c.ret(x0 - 1, yt, x1 - x0 + 2, 1, MADEIRA[4])
    for x in (x0 + 3, (x0 + x1) // 2, x1 - 4):
        for y in range(yt + 2, yb, 4):
            c.p(x, y, "#c8c0b0")
    c.ret(x0, yb, x1 - x0, 1, "#1a120c")


def canteiro_pedra(c: Camada, flores: list, luz, x0: int, x1: int, ytop: int, ychao: int) -> None:
    """Canteiro com meio-fio de pedras redondas, cheio de lavanda, margaridas e estrelinhas."""
    for y in range(ytop, ychao - 3):
        for x in range(x0, x1):
            c.p(x, y, TERRA[int(hash01(x, y, 9) * 3) + 1])
    g = np.random.default_rng(x0 + 7)
    n = int((x1 - x0) / 3.2)
    for i in range(n):
        x = x0 + 4 + (x1 - x0 - 8) * (i + g.random() * 0.7) / n
        y = ytop + 3 + (i % 3) / 2 * (ychao - ytop - 9) + g.normal(0, 1)
        if g.random() < 0.35:  # lavanda: espigas
            for k in range(5):
                xx = x + k - 2 + g.normal(0, 0.4)
                alt = 5 + int(g.random() * 4)
                for j in range(alt):
                    c.p(xx, y - j, FOLHA_LAVANDA[2 + (j < alt - 3) * 0 + (k == 1)])
                for j in range(3):
                    c.p(xx, y - alt + j, "#9a80d8" if j else "#c4b0ff")
                if k == 2:
                    flores.append((xx + 0.5, y - alt + 0.5, "#e0d4ff", 0.5))
        else:
            touceira(c, flores, x, y, 3.5 + g.random() * 2.5, luz, 700 + x0 + i, 2 + int(g.random() * 4))
    for i, x in enumerate(range(x0, x1, 5)):
        pedra(c, x + 2.5, ychao - 2, 3.2, 2.4, luz, 800 + i + x0, musgo=0.5, paleta=PEDRA)


def faixa_pe_do_muro(c: Camada, flores: list, luz, x0: int, x1: int) -> None:
    """A faixa de flores ao pé do muro: malva-rosa alta, moitas e estrelinhas."""
    g = np.random.default_rng(140)
    x = x0
    while x < x1:
        if g.random() < 0.3:  # malva-rosa (haste alta com flores empilhadas)
            alt = 10 + int(g.random() * 9)
            for j in range(alt):
                c.p(x, CHAO + 2 - j, "#3e6a2e")
                if j % 3 == 1:
                    c.p(x - 1, CHAO + 2 - j, FOLHA_ARB[4])
            cor = CORES_FLOR[int(g.random() * len(CORES_FLOR))]
            for j in range(alt - 7, alt, 2):
                c.p(x, CHAO + 2 - j, cor[0])
                c.p(x + 1, CHAO + 2 - j, mistura(cor[0], "#602040", 0.3))
            flores.append((x + 0.5, CHAO + 2 - alt + 1.5, cor[2], 0.8))
            x += 3
        else:
            r = 3 + g.random() * 2.5
            touceira(c, flores, x + r, CHAO - 1, r, luz, 1400 + int(x), int(1 + g.random() * 3), haste=False)
            x += r * 1.6


def poco(c: Camada, e: Camada, luz, cx: int, base: int) -> None:
    """O poço: bocal de pedra (cilindro com fiadas), água escura, dois esteios, telhadinho de telhas, sarilho com
    manivela, corda e o balde de madeira na borda."""
    rx, ry = 17, 4.5
    topo = base - 15
    # corpo cilíndrico de pedras
    for y in range(int(topo), base + 1):
        fila = int((y - topo) // 4)
        for x in range(cx - rx, cx + rx + 1):
            u = (x + 0.5 - cx) / rx
            if abs(u) > 1:
                continue
            yb = base + math.sqrt(max(0, 1 - u * u)) * ry * 0.6
            if y > yb:
                continue
            ang = math.asin(np.clip(u, -1, 1))
            col = int((ang + fila * 0.22) / 0.34)
            fx = ((ang + fila * 0.22) / 0.34) % 1
            ey = (y - topo) % 4
            k = 0.5 - u * (0.45 if luz[0] < 0 else -0.45) * 0.7 - abs(u) ** 4 * 0.35 + (hash01(col, fila, 4) - 0.5) * 0.35
            if ey == 3 or fx < 0.1:
                c.p(x, y, "#2e2824")
                continue
            if ey == 0:
                k += 0.15
            cor = PEDRA[int(np.clip(k * 7, 0, 6))]
            if MUSGO_N[y, x] > 0.6 and y > base - 6:
                cor = cor * 0.5 + MUSGO[2] * 0.5
            c.p(x, y, cor)
    # bocal (anel de pedra em elipse) e a água escura
    for y in range(int(topo - ry - 2), int(topo + ry + 2)):
        for x in range(cx - rx - 1, cx + rx + 2):
            d = ((x + 0.5 - cx) / (rx + 0.5)) ** 2 + ((y + 0.5 - topo) / (ry + 0.6)) ** 2
            di = ((x + 0.5 - cx) / (rx - 3)) ** 2 + ((y + 0.5 - topo) / (ry - 1.3)) ** 2
            if d > 1:
                continue
            if di <= 1:
                c.p(x, y, "#0c1014" if di > 0.55 or y < topo else "#1a2630")
                continue
            ang = math.atan2(y - topo, x - cx)
            k = 0.7 - math.sin(ang) * 0.25 + (hash01(int(ang * 6), 2) - 0.5) * 0.3
            cor = PEDRA[int(np.clip(k * 7, 0, 6))]
            if int((ang + math.pi) * 6) != int((ang + math.pi + 0.05) * 6):
                cor = hexa("#3a3430")
            c.p(x, y, cor)
    e.p(cx + 4, topo + 1, "#ffffff", 0.35)  # o céu refletido lá no fundo
    # esteios de madeira
    for (px, lado) in ((cx - 15, -1), (cx + 14, 1)):
        for y in range(topo - 30, int(topo + 2)):
            c.p(px, y, MADEIRA[4 if lado < 0 else 2])
            c.p(px + 1, y, MADEIRA[3 if lado < 0 else 1])
            if y % 5 == 0:
                c.p(px + (0 if lado < 0 else 1), y, MADEIRA[1])
    # sarilho (rolo com a corda) e manivela
    ry0 = topo - 22
    for x in range(cx - 13, cx + 14):
        c.p(x, ry0, MADEIRA[5])
        c.p(x, ry0 + 1, MADEIRA[3])
        c.p(x, ry0 + 2, MADEIRA[2])
    for x in range(cx - 6, cx + 5):
        for k in range(3):
            c.p(x, ry0 + k, "#c8a878" if (x + k) % 2 else "#8a7050")
    c.linha(cx + 16, ry0 + 1, cx + 19, ry0 + 1, "#3a3a40")
    c.linha(cx + 19, ry0 + 1, cx + 19, ry0 + 6, "#3a3a40")
    c.ret(cx + 18, ry0 + 6, 3, 2, MADEIRA[3])
    # corda descendo e o balde pendurado
    c.linha(cx - 1, ry0 + 3, cx - 1, topo - 9, "#b89868")
    bx, by = cx - 1, topo - 9
    for y in range(by, by + 7):
        meia = 3 + (y - by) * 0.15
        for x in range(int(bx - meia), int(bx + meia) + 1):
            u = (x - bx) / meia
            c.p(x, y, MADEIRA[5 if u < -0.3 else 4 if u < 0.4 else 2])
    c.ret(bx - 3, by + 1, 7, 1, "#4a4a52")
    c.ret(bx - 3, by + 5, 7, 1, "#4a4a52")
    c.linha(bx - 3, by, bx, by - 3, "#4a4a52")
    c.linha(bx + 3, by, bx, by - 3, "#4a4a52")
    # telhadinho de duas águas, com telhas
    ty = topo - 34
    for j in range(10):
        y = ty + j
        meia = 4 + j * 2.0
        for x in range(int(cx - meia), int(cx + meia) + 1):
            esq = x < cx
            t = ("#c8664a", "#a84a36", "#6e2e24") if (esq and luz[0] < 0) or (not esq and luz[0] > 0) else ("#a04a38", "#843a2e", "#5a2420")
            fila = j % 3
            cor = t[2] if fila == 2 else t[0] if (x + j) % 4 == 0 else t[1]
            c.p(x, y, cor)
    c.ret(cx - 24, ty + 10, 49, 1, "#3a1e14")
    c.ret(cx - 1, ty - 1, 3, 1, "#7a3a2a")
    # o balde de madeira cheio d'água apoiado na borda
    for y in range(int(topo + 1), int(topo + 8)):
        for x in range(cx + 9, cx + 16):
            u = (x - cx - 12.5) / 3.5
            c.p(x, y, MADEIRA[5 if u < -0.3 else 4 if u < 0.4 else 2])
    c.ret(cx + 9, topo + 2, 7, 1, "#4a4a52")
    c.ret(cx + 9, topo + 6, 7, 1, "#4a4a52")
    c.ret(cx + 10, topo, 5, 1, "#3a5a70")
    e.p(cx + 11, topo, "#d8f0ff", 0.4)


def banco(c: Camada, luz, x0: int, base: int) -> None:
    """Banco de jardim: ripas de madeira no assento e no encosto, pés de ferro com volutas."""
    w = 40
    ys = base - 9
    for (px) in (x0 + 3, x0 + w - 5):  # pés de ferro
        c.ret(px, ys, 2, 10, "#2a2a30")
        c.p(px - 1, base, "#2a2a30")
        c.p(px + 2, base, "#2a2a30")
        c.ret(px, ys - 12, 2, 12, "#2a2a30")
        c.p(px + 2, ys + 3, "#3a3a44")
        c.p(px + 3, ys + 2, "#3a3a44")
        c.p(px - 1, ys - 13, "#3a3a44")
        c.p(px + 2, ys - 13, "#3a3a44")
    for k, yy in enumerate((ys - 11, ys - 8, ys - 5)):  # encosto
        c.ret(x0, yy, w, 2, MADEIRA[4 + (k == 0)])
        c.ret(x0, yy + 1, w, 1, MADEIRA[2])
    for k, yy in enumerate((ys, ys + 2)):  # assento
        c.ret(x0 - 1, yy, w + 2, 2, MADEIRA[5 - k])
        c.ret(x0 - 1, yy + 1, w + 2, 1, MADEIRA[3 - k])
    for x in range(x0, x0 + w, 3):
        if hash01(x, 2) > 0.6:
            c.p(x, ys, MADEIRA[6])
    # um livro esquecido no banco (a pessoa veio ler as favoritas aqui)
    c.ret(x0 + 26, ys - 2, 7, 2, "#7a2a34")
    c.ret(x0 + 26, ys - 2, 7, 1, "#a8404a")
    c.ret(x0 + 27, ys - 1, 5, 1, "#efe2c4")


def lanterna(c: Camada, e: Camada, luzes: list, x: int, base: int, alt: int, forte: float = 1.0) -> None:
    """Lanterna de jardim: pedestal de pedra, coluna, gaiola de ferro com vidro (acende com a hora) e chapéu."""
    # pedestal
    c.ret(x - 3, base - 3, 7, 3, PEDRA[3])
    c.ret(x - 3, base - 3, 7, 1, PEDRA[5])
    c.ret(x + 2, base - 3, 2, 3, PEDRA[1])
    # coluna
    topo_col = base - alt + 11
    for y in range(topo_col, base - 3):
        c.p(x - 1, y, PEDRA[5])
        c.p(x, y, PEDRA[4])
        c.p(x + 1, y, PEDRA[2])
    c.ret(x - 2, topo_col - 1, 5, 1, PEDRA[5])
    # gaiola com vidro
    gy = base - alt + 3
    c.ret(x - 3, gy - 1, 7, 1, "#2a2a30")
    c.ret(x - 3, gy + 7, 7, 1, "#2a2a30")
    for xx in (x - 3, x + 3):
        c.ret(xx, gy, 1, 7, "#2a2a30")
    c.ret(x - 2, gy, 5, 7, "#3a3a40")
    e.ret(x - 2, gy, 5, 7, "#ffc870")
    e.ret(x - 1, gy + 1, 3, 5, "#fff0c0")
    e.ret(x, gy + 2, 1, 3, "#ffffff")
    c.ret(x, gy, 1, 7, "#2a2a30", 0.6)
    # chapéu
    c.ret(x - 4, gy - 2, 9, 1, "#2a2a30")
    c.ret(x - 3, gy - 3, 7, 1, "#34343c")
    c.ret(x - 1, gy - 4, 3, 1, "#34343c")
    c.p(x, gy - 5, "#5a5a64")
    luzes.append((x, gy + 3, 44 * forte, 0.62, "#ffb060", 0.9 * forte, "lamp"))


def regador(c: Camada, e: Camada, luz, x: int, base: int) -> None:
    """Regador de cobre: corpo, alça, bico comprido com o crivo e um brilho na quina."""
    for y in range(base - 8, base):
        for xx in range(x, x + 9):
            u = (xx - x) / 8
            i = 4 if u < 0.2 else 3 if u < 0.55 else 2 if u < 0.85 else 1
            if y == base - 8:
                i = 4
            c.p(xx, y, ("#4a2414", "#6a3420", "#9a5430", "#c87a48", "#f0b080")[i])
    c.ret(x, base - 5, 9, 1, "#5a2c18")
    c.ret(x + 1, base, 8, 1, "#2a140c")
    for k in range(8):  # bico
        c.p(x - 1 - k, base - 4 - k * 0.7, "#b06a3a")
        c.p(x - 1 - k, base - 3 - k * 0.7, "#6a3420")
    c.ret(x - 11, base - 12, 3, 3, "#c87a48")
    c.p(x - 11, base - 12, "#f0b080")
    for k in range(7):  # alça
        ang = math.pi * k / 6
        c.p(x + 4 + math.cos(ang) * 4, base - 9 - math.sin(ang) * 4, "#7a3a22")
    e.p(x + 1, base - 7, "#ffe0b0", 0.6)
    # gotinhas no crivo
    c.p(x - 12, base - 8, "#bfe0ff")
    c.p(x - 13, base - 6, "#bfe0ff")


def bota_de_gesso(c: Camada, flores: list, luz, x: int, base: int) -> None:
    """A bota de gesso (tala suropodálica) aproveitada como vaso: cano, pé, faixas de atadura e flores saindo."""
    branco = ("#fbf8f0", "#ece6d8", "#d4ccba", "#a8a090")
    for y in range(base - 14, base):
        for xx in range(x, x + 7):
            u = (xx - x) / 6
            i = 0 if u < 0.25 else 1 if u < 0.6 else 2 if u < 0.9 else 3
            if (y - base) % 3 == 0:
                i = min(3, i + 1)  # voltas da atadura
            c.p(xx, y, branco[i])
    for y in range(base - 5, base):  # o pé
        for xx in range(x + 6, x + 13):
            i = 1 if y < base - 3 else 2
            if xx == x + 12:
                i = 3
            c.p(xx, y, branco[i])
    for xx in range(x + 9, x + 13):  # dedinhos à mostra
        c.p(xx, base - 5, "#f0c8a8")
    c.ret(x, base, 13, 1, "#3a3020")
    c.p(x + 3, base - 9, "#e05050")  # assinatura de um amigo no gesso
    c.p(x + 4, base - 9, "#e05050")
    c.p(x + 2, base - 8, "#5070d0")
    c.p(x + 4, base - 7, "#5070d0")
    touceira(c, flores, x + 3.5, base - 16, 3.6, luz, 1901, 4)


def vaso(c: Camada, flores: list, luz, x: int, base: int, tam: float, seed: int) -> None:
    """Vaso de barro com borda, sombra do lado e uma moita florida."""
    w = int(5 + tam * 3)
    h = int(4 + tam * 2.5)
    for y in range(base - h, base):
        t = (y - base + h) / h
        meia = w / 2 - t * 1.2
        for x in range(int(x - meia), int(x + meia) + 1):
            u = (x - (x - 0)) if False else 0
        for xx in range(int(x - meia), int(x + meia) + 1):
            u = (xx - x) / max(meia, 1)
            i = 0 if u < -0.4 else 1 if u < 0.3 else 2
            if luz[0] > 0:
                i = 2 - i
            c.p(xx, y, ("#e08a5c", "#b8603c", "#7a3a24")[i])
    c.ret(x - w / 2 - 1, base - h - 1, w + 3, 2, "#c8704a")
    c.ret(x - w / 2 - 1, base - h - 1, w + 3, 1, "#f0a878")
    touceira(c, flores, x + 0.5, base - h - 3, 2.5 + tam * 1.6, luz, seed, 2 + int(tam * 2))


def pintar_objetos(nome: str, per: dict, flores: list) -> Objetos:
    luz = per["luz"]
    ob = Objetos()
    ob.add(CHAO + 1, faixa_pe_do_muro, flores, luz, 92, 404)
    ob.add(CHAO + 1, faixa_pe_do_muro, flores, luz, 457, 480)
    ob.add(CHAO + 1, lanterna, ob.emissivo, ob.luzes, 400, CHAO + 1, 16, 0.6)
    ob.add(110, vaso, flores, luz, 392, 110, 0.6, 1601)
    ob.add(116, banco, luz, 150, 116)
    ob.add(121, vaso, flores, luz, 138, 121, 1.0, 1602)
    ob.add(120, touceira, flores, 214, 114, 7, luz, 1501, 7)
    ob.add(121, touceira, flores, 232, 116, 5, luz, 1502, 5)
    ob.add(124, poco, ob.emissivo, luz, 270, 122)
    ob.add(127, bota_de_gesso, flores, luz, 291, 127)
    ob.add(128, lanterna, ob.emissivo, ob.luzes, 318, 128, 24)
    ob.add(130, lanterna, ob.emissivo, ob.luzes, 461, 130, 30)
    ob.add(148, canteiro_pedra, flores, luz, 390, 478, 124, 148)
    ob.add(134, vaso, flores, luz, 186, 134, 1.2, 1603)
    ob.add(149, canteiro_madeira, flores, luz, 196, 304, 136, 149)
    ob.add(150, regador, ob.emissivo, luz, 318, 150)
    return ob


def pintar_frente(nome: str, per: dict) -> Camada:
    """Primeiro plano desfocado: folhagem nos cantos de baixo."""
    c = Camada()
    luz = per["luz"]
    copa(c, -6, 162, 34, FOLHA_CARV, luz, 4001, dens=0.9, achatar=0.6, escuro=0.2)
    copa(c, 60, 170, 22, FOLHA_CARV, luz, 4002, dens=0.9, achatar=0.6, escuro=0.25)
    copa(c, 486, 160, 22, FOLHA_ARB, luz, 4003, dens=0.9, achatar=0.7, escuro=0.1)
    return c


# ─────────────────────────────── Montagem com luz ───────────────────────────────
GY, GX = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)
GYa, GXa = GY / ESC, GX / ESC


def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def _caixa(arr: np.ndarray, r: int, eixo: int) -> np.ndarray:
    if r < 1:
        return arr
    pad = [(0, 0)] * arr.ndim
    pad[eixo] = (r + 1, r)
    a = np.pad(arr, pad, mode="edge")
    s = np.cumsum(a, axis=eixo, dtype=np.float64)
    n = arr.shape[eixo]
    fim = np.take(s, np.arange(2 * r + 1, 2 * r + 1 + n), axis=eixo)
    ini = np.take(s, np.arange(0, n), axis=eixo)
    return ((fim - ini) / (2 * r + 1)).astype(np.float32)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    if raio <= 0:
        return arr
    r = max(1, int(round((math.sqrt(4 * raio * raio + 1) - 1) / 2)))
    out = arr.astype(np.float32)
    for _ in range(3):
        out = _caixa(_caixa(out, r, 0), r, 1)
    return out


def desfocar_rgba(arr: np.ndarray, raio: float) -> np.ndarray:
    if raio <= 0:
        return arr
    pm = arr.copy()
    pm[:, :, :3] *= pm[:, :, 3:4]
    d = desfocar(pm, raio)
    a = np.maximum(d[:, :, 3:4], 1e-4)
    d[:, :, :3] = d[:, :, :3] / a
    return d


def sobre(base: np.ndarray, camada: np.ndarray) -> np.ndarray:
    a = camada[:, :, 3:4]
    return base * (1 - a) + camada[:, :, :3] * a


def luz_pontual(cx: float, cy: float, raio: float, achatar: float = 1.0) -> np.ndarray:
    d2 = ((GXa - cx) / raio) ** 2 + ((GYa - cy) / (raio * achatar)) ** 2
    return np.exp(-d2 * 2.2)


def luz_em_degraus(cx: float, cy: float, raio: float, achatar: float, seed: int, degraus: int = 6) -> np.ndarray:
    """Poça de luz com a borda irregular e anéis de pixel art na queda."""
    ang = np.arctan2(GYa - cy, GXa - cx)
    g = np.random.default_rng(abs(int(seed)))
    f = [g.random() * 6.28 for _ in range(3)]
    mod = 1 + 0.08 * np.sin(5 * ang + f[0]) + 0.05 * np.sin(9 * ang + f[1]) + 0.03 * np.sin(14 * ang + f[2])
    d2 = ((GXa - cx) / (raio * mod)) ** 2 + ((GYa - cy) / (raio * achatar * mod)) ** 2
    i = np.exp(-d2 * 2.2)
    return i * 0.72 + np.floor(i * degraus) / degraus * 0.28


def raios_de_luz(mascara: np.ndarray, fonte, passos: int = 72, alcance: float = 0.92, queda: float = 0.968) -> np.ndarray:
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


def facho(x_topo, y_topo, x_base, y_base, larg_topo, larg_base, dureza: float = 1.0) -> np.ndarray:
    t = np.clip((GYa - y_topo) / (y_base - y_topo), 0, 1.3)
    centro = x_topo + (x_base - x_topo) * t
    larg = larg_topo + (larg_base - larg_topo) * t
    dist = np.abs(GXa - centro) / np.maximum(larg, 0.5)
    return np.exp(-dist ** (2 * dureza) * 2.4) * (GYa > y_topo)


def projetar_sombra(alfa: np.ndarray, base: np.ndarray, vetor) -> np.ndarray:
    """Sombra no chão: cada pixel de objeto, a altura h acima da sua linha de chão, cai em (x + sx h, base + sy h)."""
    ys, xs = np.nonzero((alfa > 0.4) & (base >= 0))
    out = np.zeros((H, W), dtype=np.float32)
    if len(xs) == 0:
        return out
    b = base[ys, xs]
    h = np.maximum(b - ys, 0).astype(np.float32)
    sx, sy = vetor
    for s in np.linspace(0, 1, 4):
        hh = h + s
        tx = np.round(xs + sx * hh).astype(int)
        ty = np.round(b + sy * hh).astype(int)
        ok = (tx >= 0) & (tx < W) & (ty >= 0) & (ty < H)
        out[ty[ok], tx[ok]] = 1
    return out


def estrela(img: np.ndarray, x: float, y: float, cor, k: float, braco: int) -> None:
    """Cintilar de estrela de 4 pontas em 3x (as flores)."""
    X, Y = int(x * ESC), int(y * ESC)
    hh, ww = img.shape[:2]
    rgb = hexa(cor)
    for d in range(-braco, braco + 1):
        q = (1 - abs(d) / (braco + 1)) ** 1.6 * k
        if 0 <= Y < hh and 0 <= X + d < ww:
            img[Y, X + d] += rgb * q
        if 0 <= Y + d < hh and 0 <= X < ww and d != 0:
            img[Y + d, X] += rgb * q
    for (dx, dy) in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
        if 0 <= Y + dy < hh and 0 <= X + dx < ww:
            img[Y + dy, X + dx] += rgb * k * 0.35


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    luz_dir = per["luz"]
    flores: list = []

    ceu = ampliar(pintar_ceu(nome))
    morros = pintar_morros(nome)
    vila, janelas, luzes_jan = pintar_vila(nome, per)
    muro, _ = pintar_muro(nome, per)
    pintar_trepadeira(muro, flores, per)
    tronco_c, copa_c = pintar_carvalho(nome, per)
    chao, caminho = pintar_chao(nome, per, flores)
    obj = pintar_objetos(nome, per, flores)
    frente = pintar_frente(nome, per)

    # base (linha do chão) do muro e do tronco, para as sombras
    base_muro = np.where(muro.c[:, :, 3] > 0.4, float(CHAO), -1).astype(np.float32)
    base_tr = np.where(tronco_c.c[:, :, 3] > 0.4, 114.0, -1).astype(np.float32)

    planos = [  # (camada, desfoque, névoa, recebe sol, recebe luz pontual)
        (morros.c, 2.0, 0.55, 0.3, 0.0),
        (vila.c, 1.0, 0.26, 0.75, 0.3),
        (muro.c, 0.3, 0.0, 0.9, 1.0),
        (chao.c, 0.0, 0.0, 1.0, 1.0),
        (tronco_c.c, 0.6, 0.0, 0.5, 0.6),
        (obj.cam.c, 0.0, 0.0, 1.0, 1.0),
        (copa_c.c, 1.4, 0.03, 0.35, 0.2),
    ]
    img = ceu.copy()
    solido = np.zeros(img.shape[:2], np.float32)
    m_nev = np.zeros_like(solido)
    m_sol = np.zeros_like(solido)
    m_pt = np.zeros_like(solido)
    e_chao = np.zeros_like(solido)
    alfas = []
    for i, (cam, r, nev, so, pt) in enumerate(planos):
        a = desfocar_rgba(ampliar(cam), r)
        al = a[:, :, 3]
        alfas.append(al)
        img = sobre(img, a)
        solido = solido * (1 - al) + al
        m_nev = m_nev * (1 - al) + nev * al
        m_sol = m_sol * (1 - al) + so * al
        m_pt = m_pt * (1 - al) + pt * al
        e_chao = e_chao * (1 - al) + (1.0 if i == 3 else 0.0) * al
    obj_a = alfas[5]

    # ── sombras projetadas
    alfa_obj = obj.cam.c[:, :, 3]
    vet = per["sombra"]
    so_jardim = (YA >= CHAO).astype(np.float32)
    s_obj = projetar_sombra(alfa_obj, obj.base, vet)
    s_muro = projetar_sombra(muro.c[:, :, 3], base_muro, vet)
    s_tr = projetar_sombra(tronco_c.c[:, :, 3], base_tr, vet)
    sombra = np.maximum.reduce([s_obj, s_muro, s_tr]) * so_jardim * (alfa_obj < 0.5)
    if nome == "tarde":
        # o sol baixo atrás do muro: só o vão do arco deixa a luz passar (a faixa dourada no caminho)
        sombra = np.maximum(sombra, (s_muro > 0).astype(np.float32))
    sombra = desfocar(ampliar(sombra[:, :, None]), 2.0 if nome != "noite" else 4.0)[:, :, 0]
    # oclusão de contato
    ao = np.zeros((H, W), np.float32)
    pe = (alfa_obj > 0.4) & (obj.base >= 0) & (np.abs(YA - obj.base) < 2.5)
    ao = np.maximum(ao, pe.astype(np.float32))
    ao = np.maximum(ao, suave(CHAO + 6, CHAO, YA) * (YA >= CHAO) * 0.8)
    ao = np.maximum(ao, ((tronco_c.c[:, :, 3] > 0.4) & (YA > 108)).astype(np.float32))
    ao = desfocar(ampliar(ao[:, :, None]), 4)[:, :, 0] * (1 - obj_a * 0.7)

    # ── o mapa do sol: o chão e as coisas de pé
    folhas = ruido(61, 7) * 0.6 + ruido(62, 3) * 0.4
    salpico = np.floor(suave(0.4, 0.62, folhas) * 3.99) / 3
    salpico = desfocar(ampliar(salpico[:, :, None]), 0.8)[:, :, 0]
    sob_carvalho = (1 - suave(150, 215, GXa)) * (GYa > 60)
    if nome == "manha":
        mapa_sol = 1 - sob_carvalho * (1 - salpico * 0.85)
    elif nome == "tarde":
        mapa_sol = np.ones_like(GXa) * (1 - sob_carvalho * 0.8)
    else:
        mapa_sol = luz_em_degraus(LUA[0], 132, 170, 0.35, 5) * 0.7 + 0.3
    em_pe = obj_a + alfas[2] * (1 - e_chao) + alfas[4] * 0.5  # muro, objetos e tronco: superfícies de pé
    k_pe = np.clip(em_pe, 0, 1)
    fator = (1 - k_pe) + k_pe * per["sol_obj"]
    mapa_sol = mapa_sol * (1 - sombra * 0.92) * fator
    if nome == "tarde":
        # do outro lado do muro (a estradinha e a vila) o sol bate em cheio
        mapa_sol = np.where(GYa < CHAO, np.maximum(mapa_sol, 0.9 * (1 - alfas[2])), mapa_sol)

    amb = hexa(per["amb"]) * per["amb_k"]
    luz = amb * (1 - ao[:, :, None] * 0.6) * (1 - sob_carvalho * 0.3)[:, :, None]
    luz = luz + hexa(per["sol"]) * per["sol_k"] * (mapa_sol * m_sol)[:, :, None]
    lk = per["lamp_k"]
    for (lx, ly, raio, ach, cor, forca, tipo) in obj.luzes + luzes_jan:
        k = lk if tipo == "lamp" else per["jan_k"] * 0.6
        if k <= 0:
            continue
        luz = luz + luz_em_degraus(lx, ly, raio, ach, int(lx * 3 + ly), 5)[:, :, None] * hexa(cor) * forca * k * m_pt[:, :, None]
    # as flores acendem o que está em volta (bem de leve de dia, mais à noite)
    fl = np.zeros((H, W), np.float32)
    for (x, y, cor, k) in flores:
        fl[int(min(H - 1, y)), int(min(W - 1, x))] += k
    fl_luz = desfocar(ampliar(fl[:, :, None]), 9)[:, :, 0]
    luz = luz + fl_luz[:, :, None] * hexa("#fff0d0") * per["flor_k"] ** 2 * 3.0
    # vaga-lumes à noite
    vagas = []
    if nome == "noite":
        g = np.random.default_rng(17)
        while len(vagas) < 42:
            x, y = 150 + g.random() * 330, 60 + g.random() * 92
            if MASCOTE[0] - 4 <= x <= MASCOTE[2] + 4 and MASCOTE[1] <= y <= MASCOTE[3]:
                continue
            vagas.append((x, y, 0.5 + g.random() * 0.6))
        for (x, y, k) in vagas:
            luz = luz + luz_pontual(x, y + 3, 8, 0.6)[:, :, None] * hexa("#c8ff80") * 0.16 * k
    s_ = solido[:, :, None]
    img = img * (1 - s_) + img * s_ * luz

    # ── luz de recorte nas bordas viradas para a luz
    alto_a = np.maximum.reduce([copa_c.c[:, :, 3], tronco_c.c[:, :, 3], muro.c[:, :, 3], obj.cam.c[:, :, 3]]) > 0.5
    ddx, ddy = (-1, -1) if nome == "manha" else (2, -1) if nome == "tarde" else (0, -1)
    viz = np.roll(np.roll(alto_a, -ddy, 0), -ddx, 1)
    viz[:3, :] = True
    viz[-3:, :] = True
    viz[:, :3] = True
    viz[:, -3:] = True
    recorte = (alto_a & ~viz).astype(np.float32)
    recorte = desfocar(ampliar(recorte[:, :, None]), 0.8)[:, :, 0]
    perto = {"manha": luz_pontual(0, 0, 300, 0.7), "tarde": luz_pontual(SOL_TARDE[0], SOL_TARDE[1], 190, 0.9),
             "noite": luz_pontual(LUA[0], LUA[1], 220, 1.0)}[nome]
    img += (recorte * perto)[:, :, None] * hexa(per["rec"]) * per["rec_k"]

    # ── névoa por distância
    nev = hexa(per["nevoa"])
    brilho_nev = 1.0
    if nome == "tarde":
        brilho_nev = 1 + luz_pontual(SOL_TARDE[0], SOL_TARDE[1], 70, 0.6)[:, :, None] * 0.45
    mn = m_nev[:, :, None] * s_
    img = img * (1 - mn) + nev * brilho_nev * mn

    # ── emissivos: janelas da vila, vidro das lanternas
    jk = per["jan_k"]
    if jk > 0:
        ej = desfocar_rgba(ampliar(janelas.c), 1.0)
        img = img * (1 - ej[:, :, 3:4] * min(1, jk)) + ej[:, :, :3] * ej[:, :, 3:4] * jk
        img += desfocar(ej[:, :, :3] * ej[:, :, 3:4], 8) * jk * 0.8
    em = ampliar(obj.emissivo.c)
    k_em = {"manha": 0.25, "tarde": 0.8, "noite": 1.6}[nome]
    img = img * (1 - em[:, :, 3:4] * min(1, k_em)) + em[:, :, :3] * em[:, :, 3:4] * k_em
    halo = desfocar(em[:, :, :3] * em[:, :, 3:4], 6) * 1.2 + desfocar(em[:, :, :3] * em[:, :, 3:4], 22) * 1.2
    img += halo * k_em * 0.5 * (1.0 if nome != "manha" else 0.15)

    # ── feixes de luz e poeira
    vis_ceu = (1 - solido)
    poe = ampliar(ruido(81, 4)[:, :, None])[:, :, 0]
    if nome == "manha":
        f = (facho(150, 0, 236, 128, 6, 22, 1.6) * 0.8 + facho(186, 0, 286, 118, 4, 14, 1.6) * 0.6 +
             facho(118, 10, 176, 120, 3, 9, 1.5) * 0.45)
        f = f * np.clip(1.25 - GYa / 160, 0, 1) * (0.55 + 0.7 * poe) * suave(30, 70, GYa)
        f = desfocar(f[:, :, None], 2.5)[:, :, 0] * (1 - obj_a * 0.5) * (0.25 + 0.75 * alfas[6] + 0.6 * e_chao)
        img += f[:, :, None] * hexa("#fff0c0") * 0.4
        cor_poeira, peso_poeira = "#fff6d8", f * 1.6
    elif nome == "tarde":
        sx, sy = SOL_TARDE
        brilho_s = np.exp(-np.hypot(GXa - sx, (GYa - sy) * 1.2) / 7)
        raios = raios_de_luz((vis_ceu * (0.3 + brilho_s * 3)).astype(np.float32), (sx, sy), passos=96, alcance=0.97, queda=0.976)
        raios = desfocar(raios[:, :, None], 3)[:, :, 0]
        img += raios[:, :, None] * hexa("#ffc078") * 1.0
        f = facho(sx, sy + 4, 372, 150, 4, 24, 1.3) * (0.55 + 0.6 * poe) * (GYa > CHAO - 30)
        f = desfocar(f[:, :, None], 3)[:, :, 0] * (1 - obj_a * 0.5)
        img += f[:, :, None] * hexa("#ffb468") * 0.3
        cor_poeira, peso_poeira = "#ffe0a8", (f * 2.4 + raios * 1.5) * suave(50, 80, GYa)
    else:
        f = facho(LUA[0], 26, 250, 140, 10, 40, 1.2) * np.clip(1.1 - GYa / 190, 0, 1) * (0.6 + 0.5 * poe)
        f = desfocar(f[:, :, None], 4)[:, :, 0] * (1 - obj_a * 0.6)
        img += f[:, :, None] * hexa("#7a9ae8") * 0.12
        cor_poeira, peso_poeira = "#c8d8ff", f * 0.8
    g = np.random.default_rng(83)
    rgbp = hexa(cor_poeira)
    for _ in range(1600):
        X, Y = int(g.random() * (W * ESC - 4)), int(g.random() * (H * ESC - 4))
        k = peso_poeira[Y, X] * (0.3 + g.random() * 0.8)
        if k > 0.05:
            tam = 2 if g.random() < 0.7 else 3
            img[Y:Y + tam, X:X + tam] += rgbp * k

    # ── as flores-estrela
    kf = per["flor_k"]
    est = np.zeros_like(img)
    for (x, y, cor, k) in flores:
        braco = 2 + int(k * 2.5 * min(1.6, kf))
        estrela(est, x, y, cor, k * (0.55 + 0.45 * kf), braco)
    img += est * (0.9 if nome != "manha" else 0.75)
    img += desfocar(est, 4) * kf * 1.4 + desfocar(est, 12) * kf * 0.9

    # ── vida: borboletas (manhã), pétalas no vento (tarde), vaga-lumes (noite)
    if nome == "manha":
        for (x, y, cor) in ((248, 96, "#ffe070"), (386, 112, "#ffffff"), (300, 70, "#b8d8ff")):
            X, Y = x * ESC, y * ESC
            for (dx, dy) in ((0, 0), (2, 0), (0, 1), (2, 1)):
                img[Y + dy * ESC:Y + (dy + 1) * ESC, X + dx * ESC:X + (dx + 1) * ESC] = hexa(cor) * 1.05
            img[Y:Y + 2 * ESC, X + ESC:X + 2 * ESC] = hexa("#2a2018")
        # um passarinho na capa do muro
        X, Y = 262 * ESC, (MURO_TOPO - 3) * ESC
        for (dx, dy, cor) in ((0, 0, "#6a4a30"), (1, 0, "#6a4a30"), (2, 1, "#8a6a48"), (0, 1, "#c86a3a"), (1, 1, "#8a6a48"),
                              (-1, 0, "#e0a040"), (3, 1, "#4a3420"), (1, 2, "#3a2a1a")):
            img[Y + dy * ESC:Y + (dy + 1) * ESC, X + dx * ESC:X + (dx + 1) * ESC] = hexa(cor) * 0.9
    elif nome == "tarde":
        gl = np.random.default_rng(29)
        for _ in range(16):
            x, y = 210 + gl.random() * 250, 40 + gl.random() * 90
            if MASCOTE[0] - 3 <= x <= MASCOTE[2] + 3 and MASCOTE[1] <= y:
                continue
            cor = hexa(["#ffb0c8", "#ffd0e0", "#ffe0a0"][int(gl.random() * 3)])
            X, Y = int(x) * ESC, int(y) * ESC
            img[Y:Y + ESC, X:X + 2 * ESC] = cor * 1.1
            img[Y + ESC:Y + 2 * ESC, X + ESC:X + 2 * ESC] = cor * 0.8
    if vagas:
        vl = np.zeros((H * ESC, W * ESC), np.float32)
        for (x, y, k) in vagas:
            X, Y = int(x * ESC), int(y * ESC)
            vl[Y:Y + 3, X:X + 3] += k
        img += vl[:, :, None] * hexa("#e8ffb0") * 1.2
        img += desfocar(vl[:, :, None], 5) * hexa("#a8ff60") * 2.6
        img += desfocar(vl[:, :, None], 14) * hexa("#80d040") * 1.6

    # ── primeiro plano desfocado e escuro
    fr = desfocar_rgba(ampliar(frente.c), 9)
    k_fr = {"manha": 0.5, "tarde": 0.38, "noite": 0.3}[nome]
    img = sobre(img, fr * np.array([k_fr, k_fr, k_fr * 1.05, 1], dtype=np.float32))

    # ── acabamento: brilho, curva de tom, cor, lado do texto calmo, vinheta e grão
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.8) * 5, 0, 1), 0, 2)
    img = img + desfocar(claro, 10) * 0.35 + desfocar(claro, 32) * 0.3
    joelho = 0.74
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, fr_ = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (fr_ * 0.5 + 0.5)))
    img = np.clip((img - 0.48) * 1.08 + 0.48, 0, 1.2)
    xn, yn = GX / (W * ESC), GY / (H * ESC)
    calma = (1 - suave(0.3, 0.46, xn))[:, :, None]
    media = desfocar(np.clip(img, 0, 1.2), 14)
    img = media + (img - media) * (1 - 0.3 * calma)
    img *= 1 - 0.22 * calma
    v = (xn - 0.6) ** 2 * 1.2 + (yn - 0.58) ** 2 * 1.5
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.0)[:, :, None]
    gg = np.random.default_rng(99)
    img += (gg.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.016
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    pedidas = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in pedidas:
        img = montar(nome)
        destino = PASTA / f"jardim-{nome}.webp"
        img.save(destino, quality=84, method=6)
        menor = PASTA / f"jardim-{nome}-960.webp"
        img.resize((960, 320), Image.LANCZOS).save(menor, quality=84, method=6)
        print(nome, destino.stat().st_size // 1024, "KB,", menor.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
