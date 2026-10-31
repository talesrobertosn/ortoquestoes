"""Cenário "HD-2D" da seção do Atlas 3D na página inicial: o gabinete de anatomia à luz de vela (30/10/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai
das funções abaixo. A cena é desenhada em pixel art (480 x 160), camada por camada, e depois montada em 3x com a luz
calculada por pixel, na mesma técnica do cenário do topo (scripts/gerar_cena_inicio.py, de onde vieram os pincéis):
- profundidade de campo: a estante e a janela do fundo levemente desfocadas, a mesa e a vitrine nítidas, o primeiro
  plano bem desfocado;
- três velas acesas na mesa, com poças de luz quente irregulares (parecem tremular) e sombras projetadas na parede;
- a vitrine com o esqueleto, iluminada por dentro com uma luz fria, ciano, que vaza para o chão e para a mesa;
- o luar entrando pela janela da esquerda e desenhando os caixilhos no assoalho, com poeira suspensa no feixe;
- brilho (bloom), correção de cor (altas luzes quentes, sombras frias), vinheta e um grão leve de filme.

Composição: os 45% da esquerda ficam calmos e mais escuros (o texto da seção fica ali); os pontos focais são a mesa
com as velas (centro) e a vitrine com o esqueleto (terço direito).
Gera em public/pixel/inicio/: secao-atlas.webp (1440 x 480) e secao-atlas-960.webp (960 x 320).
Uso: python3 scripts/gerar_cena_atlas.py
"""
from __future__ import annotations

import math
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"
PASTA_PAGINAS = Path(__file__).resolve().parents[1] / "public" / "pixel" / "paginas"
W, H, ESC = 480, 160, 3
PERIODOS = ("manha", "tarde", "noite")
# Hora do dia da versão da página Atlas. None = a versão da página inicial (secao-atlas), intacta.
PERIODO: str | None = None
# Nas páginas, a mesa vai 30 px para a esquerda e a vitrine 26 px para a direita: o assoalho de x 330-380 fica livre
# para o mascote (o globo do canto sai, porque a vitrine passa a ocupar o lugar dele).
DX_MESA, DX_VITRINE = -30, 26

# Pontos de referência da cena (em pixels da arte).
CHAMAS = [(215.5, 81.0, 0.85), (327.5, 77.0, 1.05), (336.5, 88.0, 0.85)]  # x, y, força de cada vela
VITRINE = (354, 4, 448, 144)  # x0, y0, x1, y1 (moldura inteira)
VIDRO = (358, 13, 444, 127)  # área do vidro
ESQ = (401, 126)  # pés do esqueleto (centro, chão da vitrine)
JANELA = (10, 12, 56, 84)
PAREDE_CHAO = 118  # onde a parede encontra o assoalho


@lru_cache(maxsize=None)
def _hexa(c: str) -> tuple:
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def hexa(c: str) -> np.ndarray:
    return np.array(_hexa(c), dtype=np.float32)


def misturar(a: str, b: str, t: float) -> np.ndarray:
    return hexa(a) * (1 - t) + hexa(b) * t


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples."""

    def __init__(self) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and a > 0:
            rgb = hexa(cor) if isinstance(cor, str) else cor
            base = self.c[y, x]
            na = a + base[3] * (1 - a)
            if na > 0:
                base[:3] = (rgb * a + base[:3] * base[3] * (1 - a)) / na
            base[3] = na

    def ret(self, x0, y0, w, h, cor, a: float = 1.0) -> None:
        for y in range(int(y0), int(y0 + h)):
            for x in range(int(x0), int(x0 + w)):
                self.p(x, y, cor, a)

    def disco(self, cx, cy, r, cores, luz=(-0.6, -0.8), granulado: float = 0.55) -> None:
        """Disco com sombreamento em 3 tons, iluminado da direção `luz`."""
        self.elipse(cx, cy, r, r, cores, luz, granulado)

    def elipse(self, cx, cy, rx, ry, cores, luz=(-0.6, -0.8), granulado: float = 0.0) -> None:
        lx, ly = luz
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                dx, dy = (x - cx) / max(rx, 0.5), (y - cy) / max(ry, 0.5)
                if dx * dx + dy * dy <= 1.0:
                    k = dx * lx + dy * ly + (((x * 73856093) ^ (y * 19349663)) % 997 / 997 - 0.5) * granulado
                    if isinstance(cores, str):
                        cor = cores
                    else:
                        cor = cores[0] if k > 0.38 else cores[1] if k > -0.2 else cores[2]
                    self.p(x, y, cor)

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 1.0) + 1
        vistos = set()
        for i in range(n + 1):
            t = i / max(n, 1)
            x, y = int(round(x0 + (x1 - x0) * t)), int(round(y0 + (y1 - y0) * t))
            if (x, y) not in vistos:
                vistos.add((x, y))
                self.p(x, y, cor, a)

    def poligono(self, pts, cor, a: float = 1.0) -> None:
        ys = [p[1] for p in pts]
        n = len(pts)
        for y in range(int(math.floor(min(ys))), int(math.ceil(max(ys))) + 1):
            yc = y + 0.0
            inter = []
            for i in range(n):
                x0, y0 = pts[i]
                x1, y1 = pts[(i + 1) % n]
                if (y0 <= yc < y1) or (y1 <= yc < y0):
                    inter.append(x0 + (yc - y0) * (x1 - x0) / (y1 - y0))
            inter.sort()
            for k in range(0, len(inter) - 1, 2):
                for x in range(int(math.ceil(inter[k] - 0.01)), int(math.floor(inter[k + 1] + 0.01)) + 1):
                    self.p(x, y, cor, a)

    def osso(self, x0, y0, x1, y1, r0, r1=None, cores=None, luz=(-0.8, -0.5)) -> None:
        """Cápsula afilada sombreada (ossos longos, tubos de latão, velas): luz, meio-tom e sombra."""
        r1 = r0 if r1 is None else r1
        cores = cores or OSSO
        vx, vy = x1 - x0, y1 - y0
        comp2 = vx * vx + vy * vy or 1e-6
        rm = max(r0, r1)
        for y in range(int(min(y0, y1) - rm) - 1, int(max(y0, y1) + rm) + 2):
            for x in range(int(min(x0, x1) - rm) - 1, int(max(x0, x1) + rm) + 2):
                t = max(0.0, min(1.0, ((x - x0) * vx + (y - y0) * vy) / comp2))
                px, py = x0 + vx * t, y0 + vy * t
                r = r0 + (r1 - r0) * t
                d = math.hypot(x - px, y - py)
                if d <= r + 0.3:
                    nx, ny = ((x - px) / d, (y - py) / d) if d > 1e-3 else (0.0, 0.0)
                    k = (nx * luz[0] + ny * luz[1]) * min(1.0, d / max(r, 0.5))
                    cor = cores[0] if k > 0.3 else cores[1] if k > -0.35 else cores[2]
                    self.p(x, y, cor)

    def contornar(self, cor: str, a: float = 1.0) -> None:
        """Contorno de 1 pixel em volta de tudo o que já está na camada (separa a forma do fundo)."""
        alfa = self.c[:, :, 3] > 0.5
        viz = np.zeros_like(alfa)
        viz[1:] |= alfa[:-1]
        viz[:-1] |= alfa[1:]
        viz[:, 1:] |= alfa[:, :-1]
        viz[:, :-1] |= alfa[:, 1:]
        borda = viz & ~alfa
        self.c[borda, :3] = hexa(cor)
        self.c[borda, 3] = a


def ruido(seed: int, escala: int, w: int = W, h: int = H) -> np.ndarray:
    """Ruído suave 0..1 (valores aleatórios ampliados com interpolação)."""
    g = np.random.default_rng(seed)
    pequeno = g.random((h // escala + 2, w // escala + 2)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize((w + escala * 2, h + escala * 2), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32)[:h, :w] / 255


def ruido_veio(seed: int, ex: int, ey: int) -> np.ndarray:
    """Ruído esticado (veio da madeira): ex e ey são as escalas em x e em y."""
    g = np.random.default_rng(seed)
    pequeno = g.random((H // ey + 2, W // ex + 2)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize((W + ex * 2, H + ey * 2), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32)[:H, :W] / 255


def hash01(x: int, y: int, s: int = 0) -> float:
    return (((x * 73856093) ^ (y * 19349663) ^ (s * 83492791)) & 0xFFFF) / 65535


# ─────────────────────────────── Materiais (albedo; a luz vem na montagem) ───────────────────────────────
OSSO = ("#f0e6cc", "#c4b28c", "#7e6a4c")
OSSO_ESCURO = "#4a3c2c"
LATAO = ("#f2cf7a", "#c8963a", "#7a5420")
MOGNO = ("#8a4a2c", "#5e2e1a", "#3a1a10")
CARVALHO = ("#9a6a40", "#74482a", "#4e2e1a")
PERGAMINHO = ("#ecdcb4", "#d4bf90", "#a88c60")
CERA = ("#ece0c4", "#d2bf9a", "#8e7656")
TINTA = "#4a2e1c"
LIVROS = [("#7a2a2e", "#5a1c20"), ("#2e5236", "#1e3a26"), ("#2c3a5e", "#1c2642"), ("#6a4426", "#4a2e18"),
          ("#8e6a2e", "#64481c"), ("#3a2a2a", "#261a1a"), ("#5a3a5e", "#3c2440"), ("#7a5236", "#563820")]
OURO = "#d8b050"


def livro_em_pe(c: Camada, x: int, base: int, larg: int, alt: int, cores, seed: int) -> None:
    """Livro de pé na estante: lombada com faixas douradas, rótulo e a borda escura da sombra."""
    claro, escuro = cores
    c.ret(x, base - alt, larg, alt, claro)
    c.ret(x + larg - 1, base - alt, 1, alt, escuro)
    if larg > 2:
        c.ret(x, base - alt, 1, alt, misturar(claro, "#ffffff", 0.12))
    for fy in (base - alt + 2, base - 3):
        c.ret(x, fy, larg, 1, OURO, 0.85)
    if alt > 10 and larg > 2:
        c.ret(x + 1, base - alt + 4, max(1, larg - 2), 3, "#1a1210" if hash01(x, seed) > 0.5 else "#c8a868", 0.7)
    if hash01(x, base, seed) > 0.6 and alt > 12:
        c.ret(x, base - alt // 2, larg, 1, OURO, 0.6)
    c.ret(x, base - alt, larg, 1, misturar(claro, "#ffffff", 0.25))


def livro_deitado(c: Camada, x: int, base: int, larg: int, alt: int, cores) -> None:
    """Livro deitado (pilha): a lombada voltada para a frente e as folhas claras no topo."""
    claro, escuro = cores
    c.ret(x, base - alt, larg, alt, claro)
    c.ret(x, base - 1, larg, 1, escuro)
    c.ret(x, base - alt, larg, 1, misturar(claro, "#ffffff", 0.2))
    c.ret(x + 2, base - alt + 1, larg - 4, max(1, alt - 2), OURO, 0.35)
    c.ret(x + 3, base - alt + 1, larg - 6, max(1, alt - 2), claro)
    c.ret(x + larg - 1, base - alt, 1, alt, "#e8d8b0")


def pote(c: Camada, x: int, base: int, larg: int, alt: int, liquido: str, especime: str, forma: str, seed: int) -> None:
    """Pote de vidro com espécime em conserva: tampa, líquido, a forma do espécime e o reflexo do vidro."""
    c.ret(x + 1, base - alt, larg - 2, 2, "#6a4a2a")
    c.ret(x + 1, base - alt, larg - 2, 1, "#b08a50")
    c.ret(x, base - alt + 2, larg, alt - 2, "#3a4a48", 0.55)
    c.ret(x + 1, base - alt + 4, larg - 2, alt - 5, liquido, 0.85)
    c.ret(x + 1, base - alt + 4, larg - 2, 1, misturar(liquido, "#ffffff", 0.35), 0.9)
    cx, cy = x + larg / 2, base - alt / 2 + 1.5
    if forma == "coracao":
        c.elipse(cx - 0.8, cy - 0.5, 1.8, 1.6, especime)
        c.elipse(cx + 0.9, cy - 0.3, 1.6, 1.6, especime)
        c.poligono([(cx - 2.4, cy), (cx + 2.4, cy), (cx + 0.2, cy + 3)], especime)
        c.p(cx + 1, cy - 2.5, especime)
    elif forma == "cerebro":
        c.elipse(cx, cy, larg / 2 - 1.5, 2.5, especime)
        for k in range(-2, 3):
            c.p(cx + k, cy - 1 + (k % 2), misturar(especime, "#000000", 0.4))
        c.p(cx, cy + 2, misturar(especime, "#000000", 0.3))
    elif forma == "feto":
        c.disco(cx, cy - 1.5, 1.8, (especime, especime, especime), granulado=0)
        c.elipse(cx + 0.3, cy + 1.5, 1.6, 2.0, especime)
    elif forma == "vertebras":
        for k in range(4):
            c.ret(cx - 1, base - alt + 6 + k * 2, 3, 1, especime)
            c.p(cx - 2, base - alt + 6 + k * 2, especime, 0.6)
            c.p(cx + 2, base - alt + 6 + k * 2, especime, 0.6)
    else:  # olho
        c.disco(cx, cy, 2.0, ("#f0e8e0", "#d8ccc0", "#a89888"), granulado=0)
        c.p(cx - 0.5, cy, "#3a6a8a")
        c.p(cx + 0.5, cy, "#1a2a3a")
        c.linha(cx + 2, cy + 1, cx + 3, cy + 3, "#a0484a")
    c.ret(x + 1, base - alt + 2, 1, alt - 3, "#e8f4f0", 0.45)
    c.ret(x + larg - 2, base - alt + 3, 1, alt - 5, "#ffffff", 0.12)
    c.ret(x, base - 1, larg, 1, "#2a2a28", 0.6)


# ─────────────────────────────── Parede, teto e janela ───────────────────────────────
def parede() -> Camada:
    """Papel de parede verde-musgo com arabescos, lambri de madeira com almofadas, rodapé e a viga do teto."""
    c = Camada()
    n = ruido(11, 10)
    for y in range(0, PAREDE_CHAO):
        for x in range(W):
            if y < 88:
                faixa = (x % 12) in (0, 1)
                base = "#33463a" if faixa else "#2a3a31"
                c.p(x, y, base)
                # Arabesco: um losango pequeno com um ponto, em grade alternada.
                gx, gy = (x + (6 if (y // 14) % 2 else 0)) % 12, y % 14
                if (abs(gx - 6) + abs(gy - 7)) == 3:
                    c.p(x, y, "#46594a")
                elif gx == 6 and gy == 7:
                    c.p(x, y, "#5a6e52")
                c.p(x, y, "#000000", 0.18 * n[y, x])
            else:
                c.p(x, y, MOGNO[1])
    # Viga do teto e moldura.
    veio = ruido_veio(12, 14, 1)
    for y in range(0, 7):
        for x in range(W):
            c.p(x, y, MOGNO[2] if veio[y, x] < 0.5 else "#4a2416")
    c.ret(0, 6, W, 1, "#7a4a2a")
    c.ret(0, 7, W, 1, "#1a0c08", 0.7)
    # Lambri: almofadas em relevo (luz em cima e à esquerda, sombra embaixo e à direita).
    c.ret(0, 87, W, 2, MOGNO[0])
    c.ret(0, 87, W, 1, "#a8653a")
    c.ret(0, 89, W, 1, "#1e0e08", 0.8)
    for x0 in range(4, W, 30):
        c.ret(x0, 92, 24, 20, MOGNO[1])
        c.ret(x0, 92, 24, 1, MOGNO[2])
        c.ret(x0, 92, 1, 20, MOGNO[2])
        c.ret(x0 + 1, 111, 24, 1, "#9a5a34")
        c.ret(x0 + 24, 93, 1, 19, "#9a5a34")
        c.ret(x0 + 3, 95, 18, 14, "#6a3420")
        c.ret(x0 + 3, 95, 18, 1, "#8a4a2c")
    teia(c, W - 1, 8, 22, math.pi * 0.5, math.pi * 1.0)
    teia(c, 57, 8, 9, 0.0, math.pi * 0.5)
    c.ret(0, 113, W, 5, MOGNO[2])
    c.ret(0, 113, W, 1, "#8a4a2c")
    for y in range(88, 118):
        for x in range(W):
            if veio[y, x] > 0.72:
                c.p(x, y, "#000000", 0.12)
    return c


def janela() -> tuple[Camada, Camada]:
    """Janela em arco com o céu da noite, a lua e os telhados; cortinas de veludo. Devolve (albedo, emissivo)."""
    c, e = Camada(), Camada()
    x0, y0, x1, y1 = JANELA
    cx = (x0 + x1) / 2
    raio = (x1 - x0) / 2
    g = np.random.default_rng(5)

    def dentro(x, y, folga=0.0):
        if y < y0 + raio:
            return math.hypot(x - cx, y - (y0 + raio)) <= raio - folga
        return x0 + folga <= x <= x1 - folga and y <= y1 - folga

    # Céu (emissivo: brilha sozinho, a luz da sala não o escurece).
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if dentro(x, y, 2):
                t = (y - y0) / (y1 - y0)
                ceu_ = {"manha": ("#4a86d4", "#cfe4f2"), "tarde": ("#6a4a8a", "#ffb870")}.get(PERIODO, ("#0c1838", "#2a3e70"))
                e.p(x, y, misturar(*ceu_, t))
    if PERIODO in ("manha", "tarde"):
        nv = ruido(9, 6)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if dentro(x, y, 2) and nv[y, x] - 0.55 - abs(y - y0 - 36) / 70 > 0:
                    e.p(x, y, "#ffffff" if PERIODO == "manha" else "#ffd0a0", 0.75)
        sx_, sy_, r_ = (x0 + 14, y0 + 12, 3.2) if PERIODO == "manha" else (x0 + 30, y1 - 18, 4.2)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                d = math.hypot(x - sx_, y - sy_)
                if dentro(x, y, 2) and d < r_ * 4:
                    e.p(x, y, "#fff4d0" if PERIODO == "manha" else "#ffd070", (1 - d / (r_ * 4)) ** 2 * 0.8)
                if dentro(x, y, 2) and d < r_:
                    e.p(x, y, "#fffbe8")
    for _ in range(26 if PERIODO not in ("manha", "tarde") else 0):
        x, y = x0 + 3 + int(g.random() * (x1 - x0 - 6)), y0 + 3 + int(g.random() * 40)
        if dentro(x, y, 3):
            e.p(x, y, "#c8d4ff", 0.4 + g.random() * 0.5)
    lx, ly = x0 + 13, y0 + 16
    for y in range(ly - 5, ly + 6) if PERIODO not in ("manha", "tarde") else ():
        for x in range(lx - 5, lx + 6):
            d = math.hypot(x - lx, y - ly)
            if d <= 4.3:
                cra = math.hypot(x - lx - 1.5, y - ly + 1) < 1.2 or math.hypot(x - lx + 1.5, y - ly - 1.5) < 0.9
                e.p(x, y, "#c8d2ee" if cra else "#f4f6ff")
    # Telhados e uma torre ao longe, com uma janelinha acesa.
    for x in range(x0, x1 + 1):
        alt = y1 - 12 + int(3 * math.sin(x * 0.5)) + (-5 if 28 < x < 33 else 0) + (-3 if 44 < x < 50 else 0)
        for y in range(alt, y1 + 1):
            if dentro(x, y, 2):
                e.p(x, y, {"manha": "#7a8aa8", "tarde": "#3a2232"}.get(PERIODO, "#0a1022"))
    if PERIODO != "manha":
        e.p(30, y1 - 13, "#ffcf7a")
        e.p(46, y1 - 9, "#ffcf7a", 0.8)
        e.p(20, y1 - 6, "#ffcf7a", 0.6)
    # Moldura, caixilhos e peitoril (albedo).
    for y in range(y0 - 2, y1 + 3):
        for x in range(x0 - 2, x1 + 3):
            if dentro(x, y, -2) and not dentro(x, y, 2):
                c.p(x, y, CARVALHO[2] if y > y0 + raio or x > cx else CARVALHO[1])
    c.ret(int(cx) - 1, y0 + 2, 2, y1 - y0 - 2, CARVALHO[1])
    c.ret(int(cx), y0 + 2, 1, y1 - y0 - 2, CARVALHO[2])
    for yy in (y0 + 30, y0 + 52):
        c.ret(x0 + 2, yy, x1 - x0 - 3, 2, CARVALHO[1])
        c.ret(x0 + 2, yy + 1, x1 - x0 - 3, 1, CARVALHO[2])
    c.ret(x0 - 4, y1 + 2, x1 - x0 + 9, 3, CARVALHO[0])
    c.ret(x0 - 4, y1 + 2, x1 - x0 + 9, 1, "#c08a58")
    c.ret(x0 - 3, y1 + 5, x1 - x0 + 7, 1, "#1a0e08", 0.7)
    # Vaso com uma planta pequena no peitoril.
    c.ret(x1 - 12, y1 - 3, 6, 5, "#8a4a30")
    c.ret(x1 - 12, y1 - 3, 6, 1, "#b06a44")
    for k in range(7):
        a = -math.pi / 2 + (k - 3) * 0.4
        c.linha(x1 - 9, y1 - 3, x1 - 9 + math.cos(a) * 6, y1 - 3 + math.sin(a) * 6, "#3a5a32")
        c.p(x1 - 9 + math.cos(a) * 6, y1 - 3 + math.sin(a) * 6, "#5a7a44")
    # Cortinas de veludo vinho, com pregas e a faixa que as prende.
    for (cx0, cx1, lado) in ((x0 - 9, x0 + 3, -1), (x1 - 3, x1 + 9, 1)):
        for y in range(y0 - 6, y1 + 22):
            preso = abs(y - (y0 + 44)) < 2
            aperto = max(0, 1 - abs(y - (y0 + 44)) / 30) * 4
            for x in range(cx0, cx1 + 1):
                xx = x - cx0 if lado < 0 else cx1 - x
                if xx > (cx1 - cx0) - aperto:
                    continue
                prega = math.sin((x + (y * 0.1 if y > y0 + 44 else 0)) * 1.3)
                cor = "#6a2230" if prega > 0.4 else "#4a1622" if prega > -0.4 else "#2e0c16"
                c.p(x, y, cor)
            if preso:
                c.ret(cx0 + (0 if lado < 0 else 4), y, 9, 1, "#b08a3a")
        c.ret(cx0 - 1, y0 - 8, cx1 - cx0 + 3, 2, LATAO[1])
    c.ret(x0 - 12, y0 - 8, x1 - x0 + 25, 1, LATAO[2])
    c.disco(x0 - 12, y0 - 7.5, 1.5, LATAO)
    c.disco(x1 + 12, y0 - 7.5, 1.5, LATAO)
    return c, e


def estante() -> Camada:
    """A estante alta da esquerda (fica na meia-luz): livros, potes, caixas, um rolo de mapas e uma coruja em cima."""
    c = Camada()
    x0, x1, topo = 66, 206, 14
    veio = ruido_veio(21, 10, 1)
    c.ret(x0, topo, x1 - x0, PAREDE_CHAO - topo, "#1e130c")
    for y in range(topo, PAREDE_CHAO):
        for x in range(x0 + 4, x1 - 4):
            if veio[y, x] > 0.6:
                c.p(x, y, "#2a1a10")
    # Laterais e topo da estante.
    for (lx, w) in ((x0, 4), (x1 - 4, 4), (x0 + 70, 3)):
        c.ret(lx, topo, w, PAREDE_CHAO - topo, CARVALHO[1])
        c.ret(lx, topo, 1, PAREDE_CHAO - topo, CARVALHO[0])
        c.ret(lx + w - 1, topo, 1, PAREDE_CHAO - topo, CARVALHO[2])
    c.ret(x0 - 3, topo - 4, x1 - x0 + 6, 4, CARVALHO[1])
    c.ret(x0 - 3, topo - 4, x1 - x0 + 6, 1, CARVALHO[0])
    c.ret(x0 - 2, topo, x1 - x0 + 4, 1, "#140a06")
    prateleiras = [38, 62, 86, 110]
    g = np.random.default_rng(23)
    for i, py in enumerate(prateleiras):
        # Conteúdo de cada vão (entre as laterais), da esquerda para a direita.
        for (a, b) in ((x0 + 4, x0 + 70), (x0 + 73, x1 - 4)):
            x = a + 1
            while x < b - 2:
                r = g.random()
                livre = b - 1 - x
                if r < 0.1 and livre > 10:
                    pote(c, x, py, 8, 12 + int(g.random() * 4), ["#8a7a3a", "#6a8a5a", "#9a6a3a"][int(g.random() * 3)],
                         "#c8a890", ["coracao", "feto", "vertebras", "olho"][int(g.random() * 4)], int(g.random() * 99))
                    x += 10
                elif r < 0.16 and livre > 12:
                    for k in range(3):
                        livro_deitado(c, x, py - k * 3, 12 - k, 3, LIVROS[int(g.random() * len(LIVROS))])
                    x += 13
                elif r < 0.2 and livre > 8:
                    x += 3 + int(g.random() * 3)  # um vão vazio
                elif r < 0.24 and livre > 10:
                    c.ret(x, py - 8, 9, 8, "#4a3020")
                    c.ret(x, py - 8, 9, 1, "#6a4a30")
                    c.ret(x + 3, py - 5, 3, 2, LATAO[1])
                    x += 10
                else:
                    larg = 2 + int(g.random() * 3)
                    alt = 13 + int(g.random() * 8)
                    larg = min(larg, livre)
                    if larg < 2:
                        break
                    if g.random() < 0.08 and larg > 2:
                        # Livro inclinado encostado no vizinho.
                        for j in range(alt - 1):
                            c.ret(x + j // 5, py - 1 - j, larg, 1, LIVROS[i % len(LIVROS)][0])
                            c.p(x + j // 5 + larg - 1, py - 1 - j, LIVROS[i % len(LIVROS)][1])
                        x += larg + alt // 5 + 1
                    else:
                        livro_em_pe(c, x, py, larg, alt, LIVROS[int(g.random() * len(LIVROS))], i)
                        x += larg
        c.ret(x0 + 2, py, x1 - x0 - 4, 3, CARVALHO[1])
        c.ret(x0 + 2, py, x1 - x0 - 4, 1, CARVALHO[0])
        c.ret(x0 + 2, py + 3, x1 - x0 - 4, 2, "#0a0604", 0.6)
    # Topo: rolos de mapas num vaso, uma caixa e uma coruja empalhada.
    c.ret(x0 + 8, topo - 12, 10, 8, "#5a3a2a")
    c.ret(x0 + 8, topo - 12, 10, 1, "#7a5a3a")
    for k, (dx, alt) in enumerate(((1, 9), (4, 12), (7, 8))):
        c.ret(x0 + 8 + dx, topo - 12 - alt, 3, alt, PERGAMINHO[1])
        c.ret(x0 + 8 + dx, topo - 12 - alt, 1, alt, PERGAMINHO[0])
        c.ret(x0 + 8 + dx, topo - 12 - alt, 3, 1, PERGAMINHO[2])
    c.ret(x0 + 40, topo - 7, 22, 7, "#3a2a20")
    c.ret(x0 + 40, topo - 7, 22, 1, "#5a4030")
    c.ret(x0 + 48, topo - 5, 6, 2, LATAO[1])
    ox, oy = x1 - 26, topo - 4
    c.elipse(ox, oy - 6, 4.5, 6.5, ("#7a6248", "#5a4634", "#3a2c20"), luz=(0.5, -0.8))
    c.disco(ox, oy - 12, 4, ("#8a7258", "#5a4634", "#3a2c20"), luz=(0.5, -0.8), granulado=0.2)
    for s in (-1, 1):
        c.disco(ox + s * 1.8, oy - 12, 1.3, ("#e8d8a8", "#e8d8a8", "#e8d8a8"), granulado=0)
        c.p(ox + s * 1.8, oy - 12, "#1a1008")
        c.p(ox + s * 3, oy - 16, "#5a4634")
    c.p(ox, oy - 10, "#c8a050")
    for k in range(3):
        c.p(ox - 2 + k * 2, oy - 4 + (k % 2), "#e8d8b0", 0.5)
    c.ret(ox - 6, oy - 1, 12, 2, "#4a3020")
    c.ret(ox - 6, oy - 1, 12, 1, "#6a4a30")
    return c


# ─────────────────────────────── Mapa anatômico e prateleiras da direita ───────────────────────────────
def furar(c: Camada, cx: float, cy: float, rx: float, ry: float) -> None:
    """Abre um buraco elíptico na camada (forames, entalhes)."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if 0 <= x < W and 0 <= y < H and ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                c.c[y, x, 3] = 0


def passar_a_tinta(c: Camada, forma: Camada, tinta: str, papel: str, hachura: bool = True, luz_esq: bool = False) -> None:
    """Transforma uma silhueta em desenho de atlas: contorno a pena, miolo no papel e hachuras do lado da sombra."""
    m = forma.c[:, :, 3] > 0.5
    borda = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
    for (y, x) in zip(*np.nonzero(m)):
        if borda[y, x]:
            c.p(x, y, tinta)
        else:
            c.p(x, y, papel)
            if luz_esq and not m[y, max(0, x - 2)]:
                c.p(x, y, "#ffffff", 0.22)
            if hachura and not m[y, min(W - 1, x + 2)] and y % 2 == 0:
                c.p(x, y, tinta, 0.55)


def desenhar_quadril(c: Camada, cx: float, py: float, tinta: str) -> None:
    """Prancha clássica do quadril: pelve em vista anterior com os dois fêmures inteiros pendurados até os côndilos."""
    f = Camada()
    preto = ("#000000",) * 3
    for s in (-1, 1):
        # Asa do ilíaco aberta como uma borboleta (crista alta e larga, espinha ilíaca na ponta de fora).
        f.poligono([(cx + s * 2.5, py - 2), (cx + s * 6, py - 6.5), (cx + s * 10, py - 8), (cx + s * 13, py - 7),
                    (cx + s * 14, py - 4.6), (cx + s * 12.4, py - 2.6), (cx + s * 11.4, py + 1), (cx + s * 9.6, py + 4.6),
                    (cx + s * 6, py + 5), (cx + s * 3.6, py + 3)], "#000000")
        f.osso(cx + s * 8, py + 5.4, cx + s * 1.2, py + 8.6, 1.5, 1.5, preto)  # ramo superior do púbis
        f.osso(cx + s * 8.2, py + 5.6, cx + s * 6.2, py + 11.6, 1.8, 1.7, preto)  # ísquio
        f.osso(cx + s * 6, py + 11.6, cx + s * 1.4, py + 10, 1.1, 1.1, preto)  # ramo inferior
        f.disco(cx + s * 10, py + 4.8, 2.4, "#000000", granulado=0)  # cabeça do fêmur no acetábulo
        f.osso(cx + s * 10.8, py + 5.6, cx + s * 13, py + 8.2, 1.6, 1.7, preto)  # colo
        f.elipse(cx + s * 13.8, py + 7.2, 1.6, 2.4, "#000000")  # trocânter maior
        f.osso(cx + s * 13, py + 8.4, cx + s * 7.2, py + 35, 2.0, 1.6, preto)  # diáfise
        f.poligono([(cx + s * 8.8, py + 33), (cx + s * 5.8, py + 33), (cx + s * 4.0, py + 38), (cx + s * 10.4, py + 38)], "#000000")
        f.elipse(cx + s * 5.2, py + 38, 1.9, 1.9, "#000000")  # côndilo medial
        f.elipse(cx + s * 9.2, py + 38, 1.9, 1.9, "#000000")  # côndilo lateral
    for s in (-1, 1):
        furar(f, cx + s * 4.6, py + 8.8, 1.7, 1.4)  # forames obturados
        furar(f, cx + s * 7.2, py + 39.4, 0.9, 1.4)  # fossa intercondilar
    furar(f, cx, py + 12.6, 2.6, 2.4)  # arco púbico
    furar(f, cx, py + 2.4, 5.4, 3.6)  # abertura pélvica
    f.poligono([(cx - 3.2, py - 3.6), (cx + 3.2, py - 3.6), (cx + 1.2, py + 3.6), (cx - 1.2, py + 3.6)], "#000000")  # sacro
    passar_a_tinta(c, f, tinta, "#b88a58", hachura=True, luz_esq=True)
    for s in (-1, 1):
        for k in range(5):  # hachura da fossa ilíaca
            c.p(cx + s * (6 + k * 1.3), py - 5.4 + k * 0.6, tinta, 0.45)
        c.p(cx + s * 1.1, py - 1.6, tinta, 0.7)  # forames sacrais
        c.p(cx + s * 0.9, py + 0.6, tinta, 0.7)
        c.p(cx + s * 10.8, py + 4, tinta, 0.6)  # fóvea
        c.linha(cx + s * 12.2, py + 6.6, cx + s * 11.6, py + 10.2, tinta, 0.5)  # linha intertrocantérica
        c.p(cx + s * 11.2, py + 12, tinta)  # trocânter menor
    c.ret(cx, py + 8.4, 1, 2, tinta)  # sínfise púbica


def mapa_anatomico() -> Camada:
    """Prancha de anatomia presa na parede: fêmur à esquerda, quadril (pelve com os fêmures) à direita, legendas."""
    c = Camada()
    x0, y0, x1, y1 = 216, 13, 258, 76
    # Papel envelhecido com bordas mais escuras e manchas.
    n = ruido(31, 6)
    for y in range(y0, y1):
        for x in range(x0, x1):
            borda = min(x - x0, x1 - 1 - x, y - y0, y1 - 1 - y)
            if x > x1 - 5 and y > y1 - 5 and (x - (x1 - 5)) + (y - (y1 - 5)) > 4:
                continue
            cor = PERGAMINHO[2] if borda == 0 else PERGAMINHO[1] if borda < 2 or n[y, x] > 0.74 else PERGAMINHO[0]
            c.p(x, y, cor)
    # Canto de baixo enrolado (o verso do papel aparece).
    for k in range(5):
        c.ret(x1 - 5 + k, y1 - 1 - (4 - k), 1, 1 + (4 - k) // 2, "#c8b088")
    c.linha(x1 - 5, y1 - 1, x1 - 1, y1 - 5, "#fff2d0")
    # Título e régua de legendas.
    c.ret(x0 + 7, y0 + 3, 28, 1, TINTA)
    c.ret(x0 + 11, y0 + 5, 20, 1, TINTA, 0.5)
    c.ret(x0 + 3, y0 + 8, x1 - x0 - 6, 1, TINTA, 0.3)
    # O quadril com os dois fêmures, no centro da prancha.
    qx, qy = (x0 + x1) / 2, y0 + 20
    desenhar_quadril(c, qx, qy, TINTA)
    # Detalhe no canto: corte da cabeça do fêmur com as trabéculas, num círculo de lupa.
    hx, hy = x1 - 7, y1 - 12
    for a in range(0, 360, 12):
        c.p(hx + math.cos(math.radians(a)) * 4.6, hy + math.sin(math.radians(a)) * 4.6, TINTA, 0.8)
    f = Camada()
    f.disco(hx - 0.6, hy - 0.6, 2.6, "#000000", granulado=0)
    f.osso(hx + 0.6, hy + 0.8, hx + 2.6, hy + 3.6, 1.4, 1.6, ("#000000",) * 3)
    passar_a_tinta(c, f, TINTA, PERGAMINHO[0], hachura=False)
    c.linha(hx - 2, hy + 0.5, hx + 0.5, hy - 2, TINTA, 0.5)
    c.linha(qx + 10.4, qy + 4.4, hx - 3, hy - 3.5, TINTA, 0.35)
    # Linhas de chamada com as legendas (risquinhos de texto) nas margens.
    for (ax, ay, lx, ly) in ((qx - 10, qy - 4, x0 + 3, qy - 8), (qx - 12, qy + 7, x0 + 3, qy + 10), (qx - 9, qy + 24, x0 + 3, qy + 26),
                             (qx + 10, qy - 5, x1 - 4, qy - 9), (qx + 6, qy + 37, x1 - 4, qy + 31)):
        c.linha(ax, ay, lx, ly, TINTA, 0.5)
    for (tx, ty, tl) in ((x0 + 3, qy - 10, 5), (x0 + 3, qy + 12, 6), (x0 + 3, qy + 28, 5), (x1 - 8, qy - 11, 5), (x1 - 8, qy + 29, 5),
                         (x0 + 3, y1 - 5, 18), (x0 + 3, y1 - 3, 13)):
        for k in range(tl):
            if hash01(tx + k, ty) > 0.25:
                c.p(tx + k, ty, TINTA, 0.6)
    # Mancha de café e os percevejos de latão.
    for y in range(y0 + 8, y0 + 16):
        for x in range(x0 + 3, x0 + 12):
            if abs(math.hypot(x - x0 - 7, y - y0 - 12) - 2.8) < 0.55:
                c.p(x, y, "#8a6a40", 0.35)
    for (tx, ty) in ((x0 + 2, y0 + 1), (x1 - 3, y0 + 1), (x0 + 2, y1 - 3)):
        c.ret(tx, ty, 2, 2, "#b03a2a")
        c.p(tx, ty, "#f08a6a")
        c.p(tx + 2, ty + 2, "#000000", 0.4)
    return c


def ampulheta(c: Camada, x: int, base: int) -> None:
    c.ret(x, base - 2, 9, 2, CARVALHO[1])
    c.ret(x, base - 2, 9, 1, CARVALHO[0])
    c.ret(x, base - 15, 9, 2, CARVALHO[1])
    c.ret(x, base - 15, 9, 1, CARVALHO[0])
    for px in (x, x + 8):
        c.ret(px, base - 13, 1, 11, "#5a3a22")
    for y in range(base - 13, base - 2):
        t = (y - (base - 13)) / 10
        meia = 3.2 * abs(t - 0.5) * 2 + 0.6
        for xx in range(x + 1, x + 8):
            if abs(xx - (x + 4)) <= meia:
                areia = (t > 0.3 and t < 0.5) or (t > 0.78) or (t >= 0.5 and xx == x + 4)
                c.p(xx, y, "#e0b060" if areia else "#9ab8c0", 1 if areia else 0.35)
    c.p(x + 3, base - 12, "#ffffff", 0.7)
    c.p(x + 3, base - 6, "#ffffff", 0.5)
    c.ret(x + 3, base - 4, 3, 1, "#c08a40")


def microscopio(c: Camada, x: int, base: int) -> None:
    """Microscópio de latão de gabinete: pé em ferradura, coluna, braço em C, platina, espelho, tubo inclinado e ocular."""
    # Pé em ferradura de ferro preto com o friso claro.
    c.ret(x, base - 3, 16, 3, "#2a2622")
    c.ret(x, base - 3, 16, 1, "#6a625a")
    c.ret(x + 5, base - 1, 6, 1, "#120e0c")
    # Coluna e o eixo de inclinação.
    c.ret(x + 9, base - 11, 3, 8, LATAO[1])
    c.ret(x + 9, base - 11, 1, 8, LATAO[0])
    c.ret(x + 11, base - 11, 1, 8, LATAO[2])
    c.disco(x + 10.5, base - 11, 1.5, LATAO, granulado=0)
    # Espelho redondo embaixo da platina, e a platina com as presilhas.
    c.disco(x + 5.5, base - 6, 1.8, ("#f0f6ff", "#9aaabb", "#4a5868"), luz=(-0.5, -0.9), granulado=0)
    c.p(x + 5.5, base - 4, LATAO[2])
    c.ret(x + 1, base - 10, 11, 2, LATAO[1])
    c.ret(x + 1, base - 10, 11, 1, LATAO[0])
    c.ret(x + 2, base - 11, 2, 1, "#c8c8c8")
    c.ret(x + 8, base - 11, 2, 1, "#c8c8c8")
    # Braço em C, que sai da coluna e segura o tubo por trás.
    for k in range(12):
        t = k / 11
        bx = x + 11 + math.sin(t * math.pi) * 2.2 - t * 1.4
        by = base - 12 - t * 7.5
        c.disco(bx, by, 1.2, LATAO, luz=(-0.7, -0.7), granulado=0)
    # Tubo óptico inclinado (objetiva perto da platina, ocular em cima), com anéis e o botão de foco.
    c.osso(x + 5.5, base - 12.5, x + 8.2, base - 20.5, 1.7, 1.6, LATAO, luz=(-0.9, -0.2))
    c.osso(x + 5.0, base - 11.5, x + 5.4, base - 12.5, 0.9, 0.9, ("#d8d8d8", "#8a8a8a", "#4a4a4a"))
    for (ax, ay) in ((x + 6.2, base - 15), (x + 7.4, base - 18.6)):
        c.ret(ax - 1, ay, 4, 1, LATAO[2])
    c.osso(x + 8.2, base - 20.5, x + 8.8, base - 22.5, 1.1, 1.1, ("#6a6a6a", "#3a3a3a", "#1a1a1a"))
    c.ret(x + 8, base - 24, 3, 1, "#8a8a8a")
    c.disco(x + 12.2, base - 16, 1.6, LATAO, luz=(-0.6, -0.8), granulado=0)
    c.p(x + 12, base - 16.5, "#fff0b0")
    c.p(x + 4.6, base - 17, "#fff4c8", 0.9)  # brilho no tubo


def mao_esqueleto(c: Camada, x: int, base: int) -> None:
    """Modelo de mão (esqueleto) num pedestal de madeira: carpo, metacarpos e falanges com as articulações."""
    c.ret(x, base - 3, 16, 3, CARVALHO[1])
    c.ret(x, base - 3, 16, 1, CARVALHO[0])
    c.ret(x + 1, base - 1, 14, 1, CARVALHO[2])
    c.ret(x + 7, base - 7, 2, 4, LATAO[1])
    cx, cy = x + 8, base - 9
    c.elipse(cx, cy, 3.2, 2.0, OSSO, luz=(-0.6, -0.8), granulado=0.6)  # carpo
    c.ret(cx - 3, cy + 2, 7, 1, OSSO[2])
    # Dedos: ângulo, comprimento do metacarpo e das falanges.
    for (ang, meta, fal) in ((-118, 4.5, (2.6, 2.2)), (-99, 5.5, (3.4, 2.4, 1.8)), (-90, 6.0, (3.6, 2.6, 1.9)),
                             (-81, 5.5, (3.4, 2.4, 1.8)), (-69, 4.8, (2.6, 2.0, 1.6))):
        a = math.radians(ang)
        bx, by = cx + math.cos(a) * 2.2, cy + math.sin(a) * 1.4
        ex, ey = bx + math.cos(a) * meta, by + math.sin(a) * meta
        c.linha(bx, by, ex, ey, OSSO[1])
        c.p(ex, ey, OSSO[0])
        a2 = a + (0.25 if ang < -100 else 0)
        for comp in fal:
            nx, ny = ex + math.cos(a2) * comp, ey + math.sin(a2) * comp
            c.linha(ex, ey, nx, ny, OSSO[1])
            c.p(nx, ny, OSSO[0])
            ex, ey = nx, ny
    c.p(cx - 1, cy - 1, OSSO[0])


def rolos(c: Camada, x: int, base: int, comp: int) -> None:
    """Pranchas enroladas deitadas, em pirâmide, com o caracol do papel na ponta e fitas vermelhas."""
    tons = ("#f0e2bc", "#d8c49a", "#b8a074", "#8a7050")
    for (dx, dy, r, cl) in ((0, 0, 2.7, comp - 2), (7, 0, 2.7, comp - 7), (3.5, -4.6, 2.6, comp - 6)):
        cy = base - r + dy - 0.2
        for xx in range(int(x + dx), int(x + dx + cl)):
            for yy in range(int(round(cy - r)), int(round(cy + r)) + 1):
                t = (yy - cy) / r
                cor = tons[0] if t < -0.45 else tons[1] if t < 0.2 else tons[2] if t < 0.7 else tons[3]
                c.p(xx, yy, cor)
            if (xx * 7) % 11 == 0:
                c.p(xx, cy + r * 0.3, tons[2], 0.5)
        # Ponta: o caracol do papel enrolado.
        ex = x + dx
        c.disco(ex, cy, r, ("#f8ecd0", "#e0cca4", "#b09870"), granulado=0)
        for a in range(0, 540, 45):
            rr = 0.4 + a / 540 * (r - 0.6)
            c.p(ex + math.cos(math.radians(a)) * rr, cy + math.sin(math.radians(a)) * rr, "#8a7050")
        fita = int(x + dx + cl * 0.55)
        c.ret(fita, int(round(cy - r)), 2, int(round(2 * r)) + 1, "#a82a2a")
        c.ret(fita, int(round(cy - r)), 1, int(round(2 * r)) + 1, "#d84a3a")
        c.p(fita + 1, int(round(cy + r)) + 1, "#a82a2a")
        c.p(fita + 2, int(round(cy + r)) + 2, "#a82a2a")


def prateleiras_direita() -> Camada:
    """Duas prateleiras de parede acima da mesa: ampulheta, livros, potes, rolos, microscópio e a mão de esqueleto."""
    c = Camada()
    x0, x1 = 262, 350
    for py in (40, 66):
        c.ret(x0, py, x1 - x0, 3, CARVALHO[1])
        c.ret(x0, py, x1 - x0, 1, CARVALHO[0])
        c.ret(x0, py + 2, x1 - x0, 1, CARVALHO[2])
        c.ret(x0 + 1, py + 3, x1 - x0 - 2, 2, "#0a0604", 0.45)
        for bx in (x0 + 4, x1 - 6):  # mãos-francesas
            for k in range(6):
                c.ret(bx + k // 2, py + 3 + k, 2, 1, "#2a1a10")
            c.p(bx + 1, py + 4, LATAO[1])
    quadrinho(c, x0 + 10, 9, 13, 16, "coluna")
    quadrinho(c, x0 + 30, 11, 12, 12, "cranio")
    # Prateleira de cima.
    ampulheta(c, x0 + 3, 40)
    cores = [LIVROS[0], LIVROS[2], LIVROS[1], LIVROS[4], LIVROS[6], LIVROS[3], LIVROS[0]]
    x = x0 + 14
    for k, (larg, alt) in enumerate(((3, 14), (4, 12), (3, 15), (3, 13), (4, 14), (2, 11), (3, 12))):
        livro_em_pe(c, x, 40, larg, alt, cores[k], 7 + k)
        x += larg
    pote(c, x + 2, 40, 10, 14, "#9a8a3a", "#b86a5a", "coracao", 3)
    rolos(c, x + 15, 40, 34)
    # Prateleira de baixo.
    microscopio(c, x0 + 2, 66)
    mao_esqueleto(c, x0 + 22, 66)
    xb = x0 + 42
    for k, (larg, cor) in enumerate(((22, LIVROS[3]), (19, LIVROS[1]), (21, LIVROS[7]), (17, LIVROS[2]))):
        livro_deitado(c, xb + (k % 2), 66 - k * 3, larg, 3, cor)
    pote(c, xb + 25, 66, 10, 13, "#8aa08a", "#d8a8a0", "cerebro", 4)
    return c


# ─────────────────────────────── Assoalho e tapete ───────────────────────────────
def chao() -> Camada:
    """Assoalho de tábuas em perspectiva e um tapete persa original (padrão geométrico calculado)."""
    c = Camada()
    fx, fy = 270, -150  # ponto de fuga das tábuas (acima da cena)
    veio = ruido_veio(41, 2, 1)
    largura = 13
    tons = ("#76482a", "#643c22", "#82522e", "#6c4426", "#5c361e")
    for y in range(PAREDE_CHAO, H):
        prof = (y - PAREDE_CHAO) / (H - PAREDE_CHAO)
        for x in range(W):
            # Coordenada da tábua: onde a reta até o ponto de fuga corta a borda de baixo da imagem.
            u = fx + (x - fx) * (H - fy) / (y - fy)
            tab = int(u // largura)
            du = u % largura
            escala = (y - fy) / (H - fy)
            cor = tons[(tab * 7) % 5]
            c.p(x, y, cor)
            g = veio[y, int(u * 1.7) % W]
            if g > 0.68:
                c.p(x, y, "#000000", 0.16)
            elif g < 0.2:
                c.p(x, y, "#ffffff", 0.05)
            if du < 1.0 / escala:
                c.p(x, y, "#1a0e08")  # junta entre as tábuas
            elif du < 2.0 / escala:
                c.p(x, y, "#ffffff", 0.07)  # quina gasta que pega luz
            # Emendas de topo: uma ou duas por tábua, em alturas diferentes.
            for k in (0, 1):
                ye = PAREDE_CHAO + 3 + int(hash01(tab, k, 9) * (H - PAREDE_CHAO - 4))
                if y == ye and hash01(tab, k, 4) > 0.35:
                    c.p(x, y, "#1a0e08")
            # Pregos ao lado das emendas.
            if int(du * escala) == 3 and (y - PAREDE_CHAO) % 17 == (tab * 5) % 17:
                c.p(x, y, "#2a1a10")
    c.ret(0, PAREDE_CHAO, W, 1, "#0a0604", 0.7)
    # Tapete: trapézio em perspectiva com borda, faixa de losangos, campo vermelho e medalhão central.
    topo, esq0, dir0 = 131, 150, 404
    for y in range(topo, H):
        t = (y - topo) / 46
        esq = esq0 - (y - topo) * 0.62
        dir_ = dir0 + (y - topo) * 0.62
        for x in range(int(esq), int(dir_) + 1):
            u = (x - esq) / (dir_ - esq)
            v = t
            bu = min(u, 1 - u) * 260  # distância à borda em "fios"
            bv = v * 46
            b = min(bu, bv * 1.6)
            cor = "#76222a"
            if b < 1.2:
                cor = "#3a1014"
            elif b < 3.2:
                cor = "#7a2a24"
            elif b < 4.2:
                cor = "#c89a48"
            elif b < 9.5:
                # Faixa de losangos dourados e azuis.
                k = (u * 260 if bv * 1.6 > bu else u * 260) + (bv * 1.6 if bv * 1.6 <= bu else 0)
                fase = (k % 8) - 4
                meio = abs(b - 6.8)
                cor = "#2a2e52" if abs(fase) + meio < 3.0 else "#3a1418"
                if abs(abs(fase) + meio - 2.6) < 0.5:
                    cor = "#c8a050"
            elif b < 10.5:
                cor = "#c89a48"
            else:
                mu, mv = (u - 0.5) * 260, (bv - 17) * 1.6
                d = abs(mu) / 1.6 + abs(mv) * 1.1
                if d < 11:
                    cor = "#22284a" if d < 5 else "#d0a24c" if d < 6.4 else "#9a2e2e"
                    if d < 2:
                        cor = "#e8c870"
                    elif 2.8 < d < 3.6:
                        cor = "#c89a48"
                elif d < 12.4:
                    cor = "#d0a24c"
                else:
                    # Campo: treliça em losangos com uma roseta em cada célula.
                    a1, a2 = (mu + mv * 1.4) % 14, (mu - mv * 1.4) % 14
                    if a1 < 1.1 or a2 < 1.1:
                        cor = "#561418"
                    else:
                        r1, r2 = (mu + mv * 1.4 + 7) % 14 - 7, (mu - mv * 1.4 + 7) % 14 - 7
                        rr = abs(r1) + abs(r2)
                        if rr < 2.2:
                            cor = "#c89a48"
                        elif rr < 3.6:
                            cor = "#2a3058"
            c.p(x, y, cor)
            if hash01(x, y, 3) > 0.86:
                c.p(x, y, "#000000", 0.18)
    return c


# ─────────────────────────────── A mesa e o que está nela ───────────────────────────────
def mesa() -> Camada:
    """Mesa de estudo de carvalho escuro: tampo com couro verde, gavetas com puxadores de latão, pés torneados."""
    c = Camada()
    x0, x1, yb, yf = 194, 352, 97, 112
    veio = ruido_veio(51, 12, 1)
    for y in range(yb, yf):
        t = (y - yb) / (yf - yb)
        a, b = x0 + 4 - 4 * t, x1 - 4 + 4 * t
        for x in range(int(a), int(b) + 1):
            v = veio[y, x]
            c.p(x, y, MOGNO[0] if v > 0.62 else "#743c22" if v > 0.35 else MOGNO[1])
    # Couro verde com friso dourado.
    for y in range(yb + 2, yf - 1):
        t = (y - yb) / (yf - yb)
        a, b = 226 - 2 * t, 322 + 2 * t
        for x in range(int(a), int(b) + 1):
            borda = y in (yb + 2, yf - 2) or x in (int(a), int(b))
            c.p(x, y, "#b8944a" if borda else "#2e4a36" if hash01(x, y) > 0.2 else "#36543e")
    c.ret(x0 - 1, yf, x1 - x0 + 3, 3, MOGNO[0])
    c.ret(x0 - 1, yf, x1 - x0 + 3, 1, "#b8743e")
    c.ret(x0 - 1, yf + 2, x1 - x0 + 3, 1, MOGNO[2])
    # Avental com duas gavetas.
    c.ret(x0, yf + 3, x1 - x0 + 1, 9, MOGNO[1])
    for gx in (x0 + 10, x0 + 86):
        c.ret(gx, yf + 4, 62, 7, "#6a341e")
        c.ret(gx, yf + 4, 62, 1, MOGNO[2])
        c.ret(gx, yf + 4, 1, 7, MOGNO[2])
        c.ret(gx + 1, yf + 10, 62, 1, "#9a5a32")
        hx = gx + 28
        c.ret(hx, yf + 6, 6, 1, LATAO[1])
        c.p(hx, yf + 7, LATAO[1])
        c.p(hx + 5, yf + 7, LATAO[1])
        c.ret(hx + 1, yf + 8, 4, 1, LATAO[0])
        c.p(hx + 3, yf + 4 + 2, "#1a0c06")
    c.ret(x0, yf + 12, x1 - x0 + 1, 1, MOGNO[2])
    # Pés torneados (os de trás mais escuros, aparecendo por baixo).
    for (lx, fundo) in ((x0 + 9, True), (x1 - 12, True), (x0 + 1, False), (x1 - 6, False)):
        topo, fim = yf + 13, (139 if fundo else 148)
        for y in range(topo, fim):
            t = (y - topo) / (fim - topo)
            larg = 5 if t < 0.12 else 4 + int(1.5 * math.sin(t * 9)) if t < 0.5 else 3 if t < 0.92 else 5
            for k in range(larg):
                xx = lx + 3 - larg // 2 + k
                tom = MOGNO[0] if k == 0 else MOGNO[2] if k == larg - 1 else MOGNO[1]
                if fundo:
                    tom = misturar(tom, "#000000", 0.45)
                c.p(xx, y, tom)
    return c


def vela(c: Camada, e: Camada, x: int, base: int, alt: int, larg: int, seed: int) -> None:
    """Vela de cera com escorridos, pavio e a chama (a chama vai na camada emissiva `e`)."""
    g = np.random.default_rng(seed)
    topo = base - alt
    for y in range(topo, base):
        for k in range(larg):
            c.p(x + k, y, CERA[0] if k == 0 else CERA[2] if k == larg - 1 else CERA[1])
    # Borda derretida no topo, com a poça de cera clara.
    c.ret(x, topo, larg, 1, "#fffaf0")
    c.p(x - 1, topo + 1, CERA[1])
    c.p(x + larg, topo + 1, CERA[2])
    # Escorridos descendo pelos lados.
    for _ in range(4):
        lado = x - 1 if g.random() < 0.5 else x + larg
        y0 = topo + 1 + int(g.random() * 3)
        comp = 2 + int(g.random() * (alt * 0.6))
        for j in range(comp):
            c.p(lado, y0 + j, CERA[1] if lado < x else CERA[2])
        c.p(lado, y0 + comp, CERA[0])
    for _ in range(2):
        xx = x + int(g.random() * larg)
        comp = 2 + int(g.random() * 6)
        for j in range(comp):
            c.p(xx, topo + 1 + j, "#fffaf0", 0.7)
    c.p(x + larg // 2, topo - 1, "#1a1008")
    # Chama: base azulada, corpo laranja, miolo amarelo e o centro quase branco.
    cx = x + (larg - 1) / 2
    for y in range(topo - 9, topo - 1):
        t = (y - (topo - 9)) / 8
        meia = 0.4 + 1.6 * math.sin(t * math.pi * 0.85) ** 1.2
        for xx in range(int(cx - 2), int(cx + 3)):
            d = abs(xx - cx)
            if d <= meia:
                cor = "#ffffff" if d < meia * 0.35 and 0.4 < t < 0.85 else "#ffe27a" if d < meia * 0.75 else "#ff8a2a"
                if t > 0.9:
                    cor = "#5a7aff"
                e.p(xx, y, cor, 0.95)
        e.p(cx, topo - 10, "#ff9a3a", 0.5)


def objetos_mesa() -> tuple[Camada, Camada, Camada]:
    """Livro de anatomia aberto, tinteiro e pena, crânio peso de papel sobre livros, anotações e velas.

    Devolve (objetos, velas, chamas): as velas ficam separadas para não projetarem sombra delas mesmas.
    """
    c, v, e = Camada(), Camada(), Camada()
    # Sombras de contato no tampo.
    for (x, y, w) in ((236, 111, 68), (222, 109, 12), (302, 109, 26), (200, 110, 16), (209, 110, 14), (322, 107, 22)):
        c.ret(x, y, w, 2, "#120806", 0.45)
    # Livro aberto: capa de couro vermelho, páginas curvas com desenhos de ossos e texto.
    capa = "#5a1a1e"
    c.poligono([(236, 101), (269, 99), (303, 101), (305, 113), (269, 112), (234, 113)], capa)
    for y in range(112, 114):
        c.ret(237, y, 30, 1, "#efe2c0" if y == 112 else "#c8b48a")
        c.ret(271, y, 31, 1, "#efe2c0" if y == 112 else "#c8b48a")
    esq = [(238, 101), (268, 100), (268, 111), (236, 112)]
    dir_ = [(270, 100), (300, 101), (302, 112), (270, 111)]
    for pts, lado in ((esq, -1), (dir_, 1)):
        c.poligono(pts, "#efe2c0")
        for y in range(99, 113):
            for k in range(4):
                xx = 268 - k if lado < 0 else 270 + k
                c.p(xx, y, "#a88c60", 0.35 - k * 0.07)
    c.ret(269, 99, 1, 13, "#7a6040")
    c.p(237, 101, "#d8c8a0")
    c.p(301, 101, "#d8c8a0")
    # Página esquerda: fêmur deitado e linhas de texto; página direita: crânio de frente e a mão.
    c.osso(242, 104, 258, 105, 0.9, 0.8, ("#5a3a22",) * 3)
    c.elipse(241, 103.5, 1.6, 1.6, "#5a3a22")
    c.elipse(259, 104, 1.3, 1.9, "#5a3a22")
    c.osso(243, 104, 257, 104.6, 0.3, 0.3, ("#d8c49a",) * 3)
    c.p(244, 106, "#5a3a22")
    for (ty, ini, fim) in ((107, 240, 265), (109, 240, 262), (110, 239, 264)):
        for xx in range(ini, fim):
            if hash01(xx, ty, 1) > 0.3:
                c.p(xx, ty, "#5a4a3a", 0.75)
    c.elipse(278, 104, 3.2, 3.4, "#5a3a22")
    c.elipse(278, 103.6, 2.4, 2.4, "#efe2c0")
    c.p(277, 104, "#5a3a22")
    c.p(279, 104, "#5a3a22")
    c.p(278, 106, "#5a3a22")
    c.ret(277, 107, 3, 1, "#5a3a22", 0.7)
    for k in range(4):
        c.linha(288 + k * 1.5, 107, 287 + k * 2, 102 - (k % 2), "#5a3a22", 0.8)
    c.linha(287, 107, 285, 104, "#5a3a22", 0.8)
    for (ty, ini, fim) in ((109, 274, 298), (110, 274, 296)):
        for xx in range(ini, fim):
            if hash01(xx, ty, 2) > 0.3:
                c.p(xx, ty, "#5a4a3a", 0.75)
    # Fita marcadora pendurada para fora da mesa.
    c.ret(270, 112, 1, 6, "#a01e2a")
    c.p(271, 117, "#a01e2a")
    # Anotações espalhadas (folhas tortas com linhas).
    for (pts, linhas) in (([(198, 106), (219, 104), (222, 111), (200, 113)], [(201, 107, 15), (201, 109, 13), (202, 111, 12)]),
                          ([(304, 108), (323, 110), (320, 115), (302, 113)], [(306, 110, 12), (305, 112, 11)])):
        c.poligono(pts, "#e8dcc0")
        c.linha(*pts[0], *pts[1], "#fffaf0")
        for (lx, ly, lc) in linhas:
            for k in range(lc):
                if hash01(lx + k, ly, 5) > 0.3:
                    c.p(lx + k + (ly - 106) * 0.2, ly - k * 0.1, "#4a3a3a", 0.7)
    # Folha caindo da borda da mesa.
    c.poligono([(320, 112), (330, 112), (331, 118), (322, 119)], "#d8ccb0")
    c.linha(320, 112, 330, 112, "#fffaf0")
    # Tinteiro de vidro escuro com tampa de latão e a pena.
    c.ret(224, 104, 8, 6, "#1a1a2a")
    c.ret(225, 104, 1, 5, "#5a6a8a")
    c.ret(224, 109, 8, 1, "#0a0a10")
    c.ret(225, 102, 6, 2, LATAO[1])
    c.ret(225, 102, 6, 1, LATAO[0])
    c.ret(226, 101, 4, 1, "#0a0a14")
    for k in range(16):
        t = k / 15
        px, py = 228 + t * 12, 101 - t * 15 + 3 * t * t
        c.p(px, py, "#e8e0d0" if k > 2 else "#3a2a1a")
        if k > 3:
            larg = 2.2 * math.sin((t - 0.18) / 0.82 * math.pi)
            for j in range(1, int(larg) + 1):
                c.p(px - j, py - j * 0.5, "#f4efe4" if j == 1 else "#c8c0b0")
                c.p(px + j, py + j * 0.3, "#d8d0c0" if j == 1 else "#a8a090")
    # Dois livros empilhados e o crânio peso de papel em cima (vira o rosto para o livro aberto).
    livro_deitado(c, 304, 109, 20, 3, LIVROS[2])
    livro_deitado(c, 305, 106, 18, 3, LIVROS[0])
    sx, sy = 314.5, 96.5
    luz = (0.75, -0.6)
    c.elipse(sx + 0.5, sy, 5.4, 5.0, OSSO, luz=luz, granulado=0.3)
    c.elipse(sx - 1.8, sy + 3.2, 3.4, 3.0, OSSO, luz=luz, granulado=0.2)
    c.ret(sx - 4, sy + 1, 1, 1, OSSO[2])
    c.elipse(sx - 2.6, sy + 1, 1.4, 1.3, "#2a1a12")
    c.p(sx - 3, sy + 1, "#120a06")
    c.elipse(sx + 0.8, sy + 1.3, 1.0, 1.1, "#3a2a1a")
    c.p(sx - 4.4, sy + 3, "#2a1a12")
    c.ret(sx - 5, sy + 5, 4, 1, OSSO[0])
    for k in range(4):
        c.p(sx - 5 + k, sy + 5, "#5a4a3a" if k % 2 else OSSO[0])
    c.ret(sx - 4, sy + 6, 5, 2, OSSO[1])
    c.ret(sx - 4, sy + 7, 5, 1, OSSO[2])
    c.p(sx + 2.5, sy + 4, "#5a4a3a")
    c.linha(sx - 1, sy - 4, sx + 2, sy - 2, OSSO[2])
    c.p(sx + 3, sy + 2, OSSO[2])
    # Castiçais de latão e velas.
    c.elipse(215.5, 109.5, 5.5, 1.6, LATAO, luz=(0.3, -1))
    c.ret(213, 107, 6, 2, LATAO[1])
    c.ret(213, 107, 6, 1, LATAO[0])
    c.disco(209, 108.5, 1.6, LATAO, granulado=0)
    c.p(209, 108, "#2a1a10")
    c.elipse(332, 108.5, 9, 1.8, LATAO, luz=(-0.3, -1))
    c.ret(330, 104, 4, 4, LATAO[1])
    c.ret(330, 104, 1, 4, LATAO[0])
    c.ret(326, 104, 4, 2, LATAO[1])
    c.ret(334, 104, 5, 2, LATAO[1])
    c.ret(326, 104, 13, 1, LATAO[0])
    vela(v, e, 214, 107, 22, 4, 1)
    vela(v, e, 326, 104, 23, 4, 2)
    vela(v, e, 335, 104, 13, 4, 3)
    # Cera acumulada nos pratinhos.
    v.ret(212, 107, 2, 1, CERA[1])
    v.ret(218, 107, 1, 1, CERA[1])
    v.ret(334, 104, 2, 1, CERA[0])
    v.ret(339, 104, 1, 1, CERA[1])
    return c, v, e


# ─────────────────────────────── A vitrine com o esqueleto ───────────────────────────────
def esqueleto(cx: float, base: float) -> Camada:
    """Esqueleto humano em pé, na posição anatômica (palmas para a frente), com proporções reais.

    Altura de ~104 px (vértice a ~22, pés a `base`): crânio, coluna, caixa torácica, pelve, ossos longos, mãos e pés.
    """
    c = Camada()
    L = (-0.75, -0.6)  # luz de cima à esquerda (velas) com a luz fria da vitrine vindo de cima
    sombra = OSSO[2]

    def y(f):  # fração da altura (0 = sola, 1 = vértice) para pixel
        return base - f * 104

    # Coluna torácica e lombar (atrás, aparece entre as costelas).
    for k in range(13):
        yy = y(0.80) + 1 + k * 1.5
        c.ret(cx - 1, yy, 3, 1, OSSO[2] if k % 2 == 0 else OSSO_ESCURO)
    for k in range(5):
        yy = y(0.615) + k * 1.9
        c.ret(cx - 2, yy, 5, 1, OSSO[0])
        c.ret(cx - 2, yy + 1, 5, 1, OSSO[1])
        c.p(cx - 3, yy + 0.5, OSSO[1])
        c.p(cx + 3, yy + 0.5, sombra)
        c.p(cx + 2, yy + 1, sombra)
    # Escápulas (atrás, só a borda lateral aparece fora das costelas).
    for s in (-1, 1):
        c.poligono([(cx + s * 7.5, y(0.80)), (cx + s * 11, y(0.796)), (cx + s * 10.6, y(0.775)), (cx + s * 8.5, y(0.72))],
                   OSSO[2] if s < 0 else OSSO_ESCURO)
    # Caixa torácica em barril: costelas finas com vãos escuros, esterno e rebordo costal.
    larguras = [4.6, 6.6, 8.0, 8.9, 9.5, 9.9, 10.0, 9.7, 9.0, 7.8]
    for i, larg in enumerate(larguras):
        y0 = y(0.795) + 0.4 + i * 1.95
        queda = 1.6 + i * 0.25
        for s in (-1, 1):
            pts = []
            for k in range(13):
                u = k / 12
                pts.append((cx + s * (1.6 + (larg - 1.6) * math.sin(u * math.pi / 2)), y0 + queda * u ** 2))
            pts.append((cx + s * (larg - 0.2), y0 + queda + 1.2))
            pts.append((cx + s * (larg - 0.9), y0 + queda + 2.2))
            for j in range(len(pts) - 1):
                if s < 0:
                    tom = OSSO[0] if 3 < j < 12 else OSSO[1]
                else:
                    tom = OSSO[1] if j < 8 else sombra
                c.linha(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], tom)
    for s in (-1, 1):  # rebordo costal (as cartilagens de baixo sobem até o esterno)
        c.linha(cx + s * 1.2, y(0.665), cx + s * 7.8, y(0.618), OSSO[0] if s < 0 else OSSO[1])
        c.linha(cx + s * 1.2, y(0.656), cx + s * 7.6, y(0.611), sombra)
    c.ret(cx - 1, y(0.795), 2, 12, OSSO[0])  # esterno
    c.ret(cx, y(0.795) + 1, 1, 11, OSSO[1])
    c.ret(cx - 1, y(0.795) - 1, 3, 2, OSSO[0])  # manúbrio
    c.p(cx, y(0.795) + 12, OSSO[1])  # xifoide
    # Clavículas em S, do manúbrio ao acrômio.
    for s in (-1, 1):
        c.osso(cx + s * 1.5, y(0.802), cx + s * 6, y(0.808), 0.6, 0.6, luz=L)
        c.osso(cx + s * 6, y(0.808), cx + s * 10.4, y(0.804), 0.6, 0.6, luz=L)
    # Pescoço: vértebras cervicais (corpos com processos laterais).
    for k in range(4):
        yy = y(0.852) + k * 1.4
        c.ret(cx - 1, yy, 3, 1, OSSO[0] if k % 2 == 0 else OSSO[1])
        if k % 2 == 0:
            c.p(cx - 2, yy, OSSO[1])
            c.p(cx + 2, yy, sombra)
    # Crânio de frente: calota, órbitas fundas, abertura nasal, malares, dentes e mandíbula.
    ky = y(0.925)
    c.elipse(cx, ky - 2.2, 5.3, 5.6, OSSO, luz=L, granulado=0.2)
    c.poligono([(cx - 5, ky - 1), (cx + 5, ky - 1), (cx + 4.6, ky + 3), (cx + 3.2, ky + 5), (cx - 3.2, ky + 5), (cx - 4.6, ky + 3)], OSSO[1])
    c.ret(cx + 3, ky, 2, 4, sombra)
    c.p(cx - 4, ky + 1, OSSO[0])
    c.ret(cx - 4, ky - 2, 3, 1, OSSO[0])  # arcos superciliares
    c.ret(cx + 1, ky - 2, 3, 1, OSSO[1])
    for s in (-1, 1):
        ox = cx + s * 2.3
        for (dx, dy, cor) in ((-1, 0, "#2a1c14"), (0, 0, "#1a100a"), (1, 0, "#2a1c14"), (-1, 1, "#1a100a"), (0, 1, "#0e0806"),
                              (1, 1, "#1a100a"), (0, 2, "#2a1c14")):
            c.p(ox + dx, ky - 1 + dy, cor)
        c.p(cx + s * 4.6, ky + 2, OSSO[0] if s < 0 else sombra)  # malar
        c.p(cx + s * 4.2, ky + 3, OSSO[1] if s < 0 else sombra)
    c.p(cx, ky + 1.6, "#1a100a")  # abertura nasal (pera invertida)
    c.p(cx - 0.6, ky + 2.6, "#1a100a")
    c.p(cx + 0.6, ky + 2.6, "#2a1c14")
    for k in range(-2, 3):  # dentes de cima e de baixo
        c.p(cx + k, ky + 4, OSSO[0] if k % 2 == 0 else "#8a7a60")
        c.p(cx + k, ky + 5, OSSO[1] if k % 2 == 0 else "#6a5a44")
    c.ret(cx - 3, ky + 4, 1, 3, OSSO[1])  # ramos da mandíbula
    c.ret(cx + 3, ky + 4, 1, 3, sombra)
    c.ret(cx - 2, ky + 6, 5, 1, OSSO[1])
    c.ret(cx - 1, ky + 7, 3, 1, OSSO[2])  # mento
    c.p(cx - 2, ky + 6, OSSO[0])
    c.p(cx - 2, ky - 6, OSSO[0])
    c.p(cx - 3, ky - 5, OSSO[0])
    # Pelve: asas do ilíaco abertas, abertura pélvica escura, sacro, púbis e forames obturados.
    py = y(0.575)
    for s in (-1, 1):
        asa = [(cx + s * 2.6, py + 0.8), (cx + s * 5.2, py - 1.4), (cx + s * 9, py - 1.2), (cx + s * 11, py + 1.4),
               (cx + s * 10.6, py + 4), (cx + s * 8.4, py + 6.6), (cx + s * 6.6, py + 8.2), (cx + s * 4.6, py + 6.8),
               (cx + s * 3.6, py + 3.5)]
        c.poligono(asa, OSSO[1])
        c.elipse(cx + s * 6.2, py + 2.6, 2.6, 1.8, sombra if s > 0 else OSSO[1], granulado=0)
        c.elipse(cx + s * 6.6, py + 2.2, 1.6, 1.0, OSSO_ESCURO if s > 0 else sombra, granulado=0)
        c.linha(cx + s * 3.6, py - 0.4, cx + s * 9.4, py - 0.8, OSSO[0] if s < 0 else OSSO[1])  # crista ilíaca
        c.p(cx + s * 10.6, py + 1.6, OSSO[0] if s < 0 else sombra)
        c.linha(cx + s * 10.5, py + 3.8, cx + s * 8.2, py + 6.8, OSSO[1] if s < 0 else sombra)
        # Ramos do púbis e do ísquio em volta do forame obturado.
        fx, fy = cx + s * 3.9, py + 10.2
        for a in range(0, 360, 15):
            r = math.radians(a)
            c.p(fx + math.cos(r) * 2.3, fy + math.sin(r) * 1.9, OSSO[1] if math.sin(r) < 0.3 else sombra)
        c.elipse(fx, fy, 1.2, 0.9, "#0e0806")
        c.p(cx + s * 5.6, py + 12, OSSO[1])  # tuberosidade isquiática
    c.poligono([(cx - 2.6, py + 0.2), (cx + 2.6, py + 0.2), (cx + 0.9, py + 7.6), (cx - 0.9, py + 7.6)], OSSO[0])  # sacro
    c.ret(cx + 1, py + 1, 1, 5, OSSO[1])
    for k in range(3):
        c.p(cx - 1.1, py + 1.6 + k * 1.9, OSSO_ESCURO)
        c.p(cx + 1.1, py + 1.6 + k * 1.9, OSSO_ESCURO)
    c.p(cx, py + 8.4, OSSO[1])  # cóccix
    for s in (-1, 1):  # linha terminal: a borda da abertura pélvica, do sacro ao púbis
        for k in range(9):
            a = math.radians(-70 + k * 17)
            c.p(cx + s * (1.6 + 3.2 * math.cos(a) * 0.9), py + 5.4 + 3.4 * math.sin(a), OSSO[2] if s < 0 else OSSO_ESCURO)
    c.ret(cx - 1, py + 9.4, 2, 2, OSSO[0])  # sínfise púbica
    c.ret(cx - 2, py + 8.8, 1, 1, OSSO[1])
    c.ret(cx + 1, py + 8.8, 1, 1, sombra)
    # Membros inferiores.
    for s in (-1, 1):
        lz = L
        hx, hy = cx + s * 6.4, py + 7.4
        c.disco(hx, hy, 1.7, OSSO, luz=lz, granulado=0.1)  # cabeça femoral no acetábulo
        c.osso(hx + s * 0.6, hy + 0.6, cx + s * 8.6, hy + 2.2, 1.1, 1.3, luz=lz)  # colo
        c.disco(cx + s * 9.4, hy + 1.6, 1.4, OSSO, luz=lz, granulado=0.1)  # trocânter maior
        jx, jy = cx + s * 4.4, y(0.285)
        c.osso(cx + s * 8.9, hy + 3, jx + s * 0.4, jy - 1.6, 1.55, 1.15, luz=lz)  # diáfise do fêmur
        c.p(cx + s * 7.6, hy + 4.5, OSSO[1])  # trocânter menor
        c.elipse(jx - 1, jy, 1.4, 1.5, OSSO, luz=lz)
        c.elipse(jx + 1.1, jy, 1.4, 1.5, OSSO, luz=lz)  # côndilos
        c.disco(jx, jy - 0.4, 1.1, ("#fffaf0", OSSO[0], OSSO[1]), luz=lz, granulado=0)  # patela
        c.ret(jx - 2, jy + 1.6, 5, 1, OSSO_ESCURO)  # espaço articular
        c.osso(jx, jy + 2.6, jx + s * 0.1, base - 4.5, 1.3, 0.85, luz=lz)  # tíbia
        c.ret(jx - 2, jy + 2.4, 5, 1, OSSO[0] if s < 0 else OSSO[1])  # platô tibial
        c.osso(jx + s * 2.4, jy + 3.2, jx + s * 2.2, base - 4, 0.45, 0.45, (OSSO[1], OSSO[1], OSSO[2]), luz=lz)  # fíbula
        c.p(jx + s * 2.4, base - 3.5, OSSO[1])  # maléolo lateral
        c.p(jx - s * 1.3, base - 4.2, OSSO[0])  # maléolo medial
        # Pé: tálus, metatarsos e artelhos virados um pouco para fora.
        c.elipse(jx + s * 0.4, base - 3, 1.6, 1.0, OSSO, luz=lz)
        for k in range(5):
            tx = jx + s * (-1.3 + k * 1.05)
            c.linha(tx, base - 2, tx + s * (0.2 + k * 0.3), base, OSSO[1] if k % 2 == 0 else OSSO[0])
        c.ret(jx - 2 + (1 if s > 0 else 0), base, 5, 1, OSSO[2])
    # Membros superiores pendentes, palmas para a frente.
    for s in (-1, 1):
        lz = L
        sx, sy = cx + s * 10.6, y(0.795)
        c.disco(sx, sy + 0.4, 1.7, OSSO, luz=lz, granulado=0.1)  # cabeça do úmero
        ex, ey = cx + s * 12.6, y(0.625)
        c.osso(sx + s * 0.4, sy + 1.4, ex, ey - 1.0, 1.15, 0.9, luz=lz)  # úmero
        c.elipse(ex, ey, 1.8, 1.2, OSSO, luz=lz)  # epicôndilos
        wx, wy = cx + s * 14.6, y(0.48)
        c.osso(ex - s * 0.6, ey + 1, wx - s * 1.0, wy - 0.5, 0.55, 0.55, luz=lz)  # ulna (medial)
        c.osso(ex + s * 0.8, ey + 1, wx + s * 0.6, wy - 0.5, 0.55, 0.7, luz=lz)  # rádio (lateral)
        c.elipse(wx, wy + 1, 1.6, 1.2, OSSO, luz=lz, granulado=0.4)  # carpo
        # Dedos (o polegar do lado de fora, como na posição anatômica).
        for k, (dx, comp, abre) in enumerate(((-1.6, 7.2, -0.06), (-0.6, 8.4, -0.02), (0.4, 8.8, 0.02), (1.4, 7.9, 0.06))):
            bx = wx + s * dx * -1
            c.linha(bx, wy + 2, bx + s * abre * -comp * 2, wy + 2 + comp, OSSO[1])
            for j in (3, 5.5):
                c.p(bx + s * abre * -j * 2, wy + 2 + j, OSSO[0])
        tx = wx + s * 1.8
        c.linha(tx, wy + 1.5, tx + s * 2.0, wy + 6.5, OSSO[1])
        c.p(tx + s * 1.2, wy + 4, OSSO[0])
    return c


def vitrine(sk: Camada) -> tuple[Camada, Camada, Camada, Camada]:
    """Vitrine de mogno e vidro. Devolve (fundo interno, moldura, emissivo do vidro, suporte)."""
    fundo, mold, vidro, sup = Camada(), Camada(), Camada(), Camada()
    x0, y0, x1, y1 = VITRINE
    gx0, gy0, gx1, gy1 = VIDRO
    cx, base = ESQ
    # Interior: fundo de veludo azul-petróleo, laterais em perspectiva e o piso da vitrine.
    n = ruido_veio(61, 3, 14) * 0.7 + ruido(62, 6) * 0.3
    bx0, by0, bx1, by1 = gx0 + 7, gy0 + 5, gx1 - 7, base - 6
    for y in range(gy0, gy1 + 1):
        for x in range(gx0, gx1 + 1):
            if bx0 <= x <= bx1 and by0 <= y <= by1:
                v = n[y, x]
                prega = math.sin((x - bx0) / 7.5 * math.pi * 2 + v * 2.5)
                cor = "#1e4a4e" if prega > 0.45 else "#173e42" if prega > -0.35 else "#10302f"
                if prega > 0.85:
                    cor = "#245458"
            elif y > by1:
                cor = "#3a2418" if (y + x // 6) % 3 else "#2a1810"
                if y == by1 + 1:
                    cor = "#5a3a24"
            elif y < by0:
                cor = "#0e2224"
            else:
                cor = "#0c2426" if x < bx0 else "#0a1e20"
            fundo.p(x, y, cor)
    # Sombra do esqueleto no veludo (luz da vitrine em cima e velas à esquerda).
    mascara = sk.c[:, :, 3] > 0.5
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    for (lx, ly, f, forca) in ((cx, gy0, 0.08, 0.3), (CHAMAS[1][0], CHAMAS[1][1], 0.12, 0.22)):
        qx = np.clip((xs + (lx - xs) * f).round().astype(int), 0, W - 1)
        qy = np.clip((ys + (ly - ys) * f).round().astype(int), 0, H - 1)
        proj = mascara[qy, qx]
        for (yy, xx) in zip(*np.nonzero(proj)):
            if bx0 <= xx <= bx1 and by0 <= yy <= by1 + 3:
                fundo.p(xx, yy, "#000000", forca)
    # Luminária interna (tira de luz) no alto.
    vidro.ret(bx0 + 4, gy0 + 1, bx1 - bx0 - 8, 1, "#d8fbff")
    vidro.ret(bx0 + 2, gy0 + 2, bx1 - bx0 - 4, 1, "#6ad8e8", 0.6)
    fundo.ret(bx0 + 2, gy0, bx1 - bx0 - 4, 1, LATAO[1])
    # Suporte do esqueleto: base redonda com pés, haste de latão até o sacro.
    sup.elipse(cx, base + 1.2, 11, 2.2, ("#5a3a24", "#3a2418", "#24140c"), luz=(-0.4, -1))
    sup.ret(cx - 11, base + 1, 22, 1, LATAO[1], 0.8)
    for dx in (-10, 10, -3, 3):
        sup.ret(cx + dx - 1, base + 3, 2, 1, LATAO[2])
    sup.ret(cx, base - 50, 1, 51, LATAO[2])
    sup.ret(cx + 1, base - 50, 1, 51, "#3a2410")
    sup.ret(cx - 2, base - 51, 5, 1, LATAO[2])
    # Moldura de mogno: cornija com frontão, colunas, e o móvel de baixo com almofadas e plaqueta.
    for y in range(y0, gy0):
        for x in range(x0 - 2, x1 + 3):
            c = MOGNO[1] if y > y0 + 3 else MOGNO[0]
            mold.p(x, y, c)
    mold.ret(x0 - 3, y0 + 3, x1 - x0 + 7, 2, MOGNO[0])
    mold.ret(x0 - 3, y0 + 3, x1 - x0 + 7, 1, "#b8743e")
    mold.ret(x0 - 1, y0 + 6, x1 - x0 + 3, 1, OURO, 0.8)
    mold.ret(x0, gy0 - 1, x1 - x0 + 1, 1, MOGNO[2])
    fx = (x0 + x1) // 2
    for k in range(7):
        mold.ret(fx - 12 + k * 2, y0 - k, 24 - k * 4 + 1, 1, MOGNO[0] if k < 6 else "#b8743e")
    mold.disco(fx, y0 - 2, 1.6, LATAO, granulado=0)
    for (px, w) in ((x0, gx0 - x0), (gx1 + 1, x1 - gx1)):
        mold.ret(px, gy0, w, gy1 - gy0 + 1, MOGNO[1])
        mold.ret(px, gy0, 1, gy1 - gy0 + 1, MOGNO[0])
        mold.ret(px + w - 1, gy0, 1, gy1 - gy0 + 1, MOGNO[2])
    for (px, py) in ((x0 + 1, gy0 + 20), (x0 + 1, gy1 - 20), (x1 - 2, gy0 + 20), (x1 - 2, gy1 - 20)):
        mold.ret(px, py, 2, 3, LATAO[1])  # dobradiças
        mold.p(px, py, LATAO[0])
    mold.ret(x1 - 3, (gy0 + gy1) // 2, 2, 4, LATAO[0])  # fechadura
    mold.p(x1 - 3, (gy0 + gy1) // 2 + 2, "#1a0c06")
    mold.ret(x0 - 2, gy1 + 1, x1 - x0 + 5, 3, MOGNO[0])
    mold.ret(x0 - 2, gy1 + 1, x1 - x0 + 5, 1, "#b8743e")
    mold.ret(x0 - 1, gy1 + 4, x1 - x0 + 3, y1 - gy1 - 6, MOGNO[1])
    for px in (x0 + 4, fx + 3):
        mold.ret(px, gy1 + 6, 38, 9, "#6a341e")
        mold.ret(px, gy1 + 6, 38, 1, MOGNO[2])
        mold.ret(px, gy1 + 6, 1, 9, MOGNO[2])
        mold.ret(px + 1, gy1 + 14, 38, 1, "#9a5a32")
        mold.ret(px + 38, gy1 + 7, 1, 8, "#9a5a32")
    mold.ret(fx - 7, gy1 + 8, 14, 5, LATAO[1])
    mold.ret(fx - 7, gy1 + 8, 14, 1, LATAO[0])
    mold.ret(fx - 7, gy1 + 12, 14, 1, LATAO[2])
    mold.ret(fx - 5, gy1 + 10, 10, 1, "#5a3a14", 0.8)
    mold.ret(x0 - 2, y1 - 2, x1 - x0 + 5, 2, MOGNO[2])
    for px in (x0, x1 - 4):
        mold.ret(px - 1, y1, 6, 3, MOGNO[1])
        mold.ret(px - 1, y1, 6, 1, MOGNO[0])
    # Reflexos no vidro (emissivos): duas faixas diagonais, a borda clara e o reflexo das chamas.
    for y in range(gy0, gy1 + 1):
        for x in range(gx0, gx1 + 1):
            d1 = (x - gx0) + (gy1 - y) * 0.55
            for (centro, larg, forca) in ((40, 5, 0.10), (49, 1.6, 0.16), (92, 9, 0.05), (104, 2, 0.08)):
                if abs(d1 - centro) < larg:
                    vidro.p(x, y, "#d8f4ff", forca * (1 - abs(d1 - centro) / larg))
    vidro.ret(gx0, gy0, 1, gy1 - gy0, "#b8eef8", 0.35)
    vidro.ret(gx0, gy0, gx1 - gx0, 1, "#b8eef8", 0.25)
    for (fx_, fy_) in ((364, 86), (370, 84), (373, 92)):
        vidro.p(fx_, fy_, "#ffcf7a", 0.6)
        vidro.p(fx_, fy_ - 1, "#ffcf7a", 0.25)
    return fundo, mold, vidro, sup


def globo() -> Camada:
    """Globo terrestre num tripé, no canto direito, recortado pela borda da imagem."""
    c = Camada()
    if PERIODO is not None:
        return c
    gx, gy, r = 467, 98, 11
    g = ruido(71, 4)
    for y in range(int(gy - r), int(gy + r) + 1):
        for x in range(int(gx - r), int(gx + r) + 1):
            dx, dy = (x - gx) / r, (y - gy) / r
            if dx * dx + dy * dy <= 1:
                lon = math.asin(max(-1, min(1, dx / math.sqrt(max(1e-3, 1 - dy * dy)))))
                terra = g[int((y * 1.0) % H), int((lon * 18 + 60) % W)] > 0.56
                k = -dx * 0.7 - dy * 0.5
                if terra:
                    cor = "#c8a868" if k > 0.3 else "#a08048" if k > -0.3 else "#6a5430"
                else:
                    cor = "#5a7a88" if k > 0.3 else "#3e5a68" if k > -0.3 else "#28404c"
                c.p(x, y, cor)
    for a in range(-60, 241, 4):
        t = math.radians(a)
        c.p(gx + math.cos(t) * (r + 2), gy + math.sin(t) * (r + 2), LATAO[1] if math.cos(t) < 0 else LATAO[2])
    c.ret(gx - 1, gy + r + 2, 3, 4, LATAO[1])
    for (dx, fim) in ((-8, 140), (0, 143), (8, 140)):
        c.linha(gx, gy + r + 5, gx + dx, fim, MOGNO[1])
        c.linha(gx + 1, gy + r + 5, gx + dx + 1, fim, MOGNO[2])
    c.elipse(gx, gy + r + 14, 7, 1.4, MOGNO[1])
    return c


def quadrinho(c: Camada, x: int, y: int, w: int, h: int, desenho: str) -> None:
    """Gravura emoldurada (moldura dourada, passe-partout e um desenho a pena)."""
    c.ret(x, y, w, h, "#8a6424")
    c.ret(x, y, w, 1, "#e8c070")
    c.ret(x, y, 1, h, "#c89a48")
    c.ret(x + w - 1, y, 1, h, "#5a3a14")
    c.ret(x, y + h - 1, w, 1, "#4a2e10")
    c.ret(x + 2, y + 2, w - 4, h - 4, PERGAMINHO[1])
    c.ret(x + 3, y + 3, w - 6, h - 6, PERGAMINHO[0])
    cx = x + w / 2
    if desenho == "coluna":
        for k in range(h - 8):
            yy = y + 4 + k
            curva = math.sin(k / (h - 9) * math.pi * 1.6) * 1.2
            c.ret(cx - 1 + curva, yy, 2 + (k > h - 13), 1, TINTA, 0.85 if k % 2 == 0 else 0.45)
            if k % 2 == 0:
                c.p(cx - 2 + curva, yy, TINTA, 0.5)
                c.p(cx + 2 + curva, yy, TINTA, 0.5)
    else:  # crânio de perfil
        f = Camada()
        f.elipse(cx + 0.5, y + h / 2 - 0.5, 3.6, 3.0, "#000000")
        f.poligono([(cx - 3, y + h / 2), (cx + 1, y + h / 2 + 1), (cx + 0.5, y + h / 2 + 3.5), (cx - 2.6, y + h / 2 + 3)], "#000000")
        passar_a_tinta(c, f, TINTA, PERGAMINHO[0], hachura=False)
        c.p(cx - 1.4, y + h / 2 + 0.2, TINTA)
    c.p(cx, y - 2, LATAO[1])  # prego e o cordão
    c.linha(cx, y - 2, x + 2, y, "#3a2a1a", 0.6)
    c.linha(cx, y - 2, x + w - 3, y, "#3a2a1a", 0.6)


def teia(c: Camada, cx: int, cy: int, raio: int, a0: float, a1: float) -> None:
    """Teia de aranha num canto (raios e fios em espiral, bem transparentes)."""
    raios = [a0 + (a1 - a0) * k / 5 for k in range(6)]
    for a in raios:
        c.linha(cx, cy, cx + math.cos(a) * raio, cy + math.sin(a) * raio, "#c8c8d0", 0.22)
    for r in range(3, raio, 3):
        for j in range(len(raios) - 1):
            p0 = (cx + math.cos(raios[j]) * r, cy + math.sin(raios[j]) * r)
            p1 = (cx + math.cos(raios[j + 1]) * r, cy + math.sin(raios[j + 1]) * r)
            c.linha(*p0, *p1, "#c8c8d0", 0.16)


def objetos_chao() -> Camada:
    """No assoalho: pilha de livros grandes encostada na mesa e uma folha caída no tapete."""
    c = Camada()
    for k, (larg, cor) in enumerate(((26, LIVROS[3]), (23, LIVROS[1]), (25, LIVROS[0]), (20, LIVROS[2]))):
        livro_deitado(c, 164 + (k % 2) * 2 - k, 147 - k * 4, larg, 4, cor)
    c.ret(163, 147, 28, 1, "#000000", 0.4)
    c.poligono([(232, 151), (246, 149), (249, 155), (235, 157)], "#d8ccb0")
    c.linha(232, 151, 246, 149, "#fff4dc")
    for k in range(3):
        c.linha(236, 152 + k * 1.4, 245, 150.6 + k * 1.4, "#4a3a3a", 0.5)
    return c


def primeiro_plano() -> Camada:
    """Perto da câmera, bem desfocados: o espaldar de uma poltrona de couro à esquerda e uma pilha de livros à direita."""
    c = Camada()
    for y in range(118, H + 10):
        for x in range(-10, 74):
            dx, dy = (x - 30) / 44, (y - 170) / 46
            if dx * dx + dy * dy < 1:
                k = -dx * 0.5 - dy * 0.9
                c.p(x, y, "#5a2a1a" if k > 0.6 else "#3e1a10" if k > 0 else "#24100a")
    for a in range(200, 341, 9):
        t = math.radians(a)
        c.p(30 + math.cos(t) * 42, 170 + math.sin(t) * 44, LATAO[0])
    for k, (larg, cor) in enumerate(((52, LIVROS[0]), (48, LIVROS[2]), (54, LIVROS[3]), (46, LIVROS[1]))):
        x0 = 436 + (k % 2) * 3
        y0 = H - 6 - k * 6
        c.ret(x0, y0, larg, 6, cor[0])
        c.ret(x0, y0, larg, 1, misturar(cor[0], "#ffffff", 0.25))
        c.ret(x0 + 4, y0 + 2, larg - 8, 1, OURO, 0.7)
    return c


# ─────────────────────────────── Montagem com luz ───────────────────────────────
def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    if raio <= 0:
        return arr
    canais = []
    for i in range(arr.shape[2]):
        im = Image.fromarray(np.clip(arr[:, :, i] * 255, 0, 255).astype(np.uint8))
        canais.append(np.asarray(im.filter(ImageFilter.GaussianBlur(raio)), dtype=np.float32) / 255)
    return np.stack(canais, 2)


def desfocar_f(arr: np.ndarray, raio: float) -> np.ndarray:
    """Desfoque em ponto flutuante (para mapas de luz acima de 1)."""
    if raio <= 0:
        return arr
    escala = max(1e-6, float(arr.max()))
    return desfocar(arr / escala, raio) * escala


def desfocar_rgba(arr: np.ndarray, raio: float) -> np.ndarray:
    """Desfoque com alfa pré-multiplicado (sem halo escuro nas bordas)."""
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


YS, XS = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)


def luz_pontual(cx: float, cy: float, raio: float, achatar: float = 1.0) -> np.ndarray:
    d2 = ((XS - cx * ESC) / (raio * ESC)) ** 2 + ((YS - cy * ESC) / (raio * ESC * achatar)) ** 2
    return np.exp(-d2 * 2.2)


def luz_de_vela(cx: float, cy: float, raio: float, achatar: float, seed: int) -> np.ndarray:
    """Poça de luz de vela: borda irregular (parece tremular) e leves anéis de pixel art na queda da luz."""
    ang = np.arctan2(YS - cy * ESC, XS - cx * ESC)
    g = np.random.default_rng(seed)
    f = [g.random() * 6.28 for _ in range(3)]
    mod = 1 + 0.09 * np.sin(5 * ang + f[0]) + 0.06 * np.sin(9 * ang + f[1]) + 0.04 * np.sin(14 * ang + f[2])
    d2 = ((XS - cx * ESC) / (raio * ESC * mod)) ** 2 + ((YS - cy * ESC) / (raio * ESC * achatar * mod)) ** 2
    i = np.exp(-d2 * 2.2)
    aneis = np.floor(i * 7) / 7
    return i * 0.78 + aneis * 0.22


def sombra_projetada(mascara: np.ndarray, luz: tuple[float, float], f: float) -> np.ndarray:
    """Sombra na parede: amostra a máscara do objeto no caminho até a luz (f = distância objeto-parede / luz-parede)."""
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    qx = np.clip((xs + (luz[0] - xs) * f).round().astype(int), 0, W - 1)
    qy = np.clip((ys + (luz[1] - ys) * f).round().astype(int), 0, H - 1)
    return mascara[qy, qx].astype(np.float32)


def montar() -> Image.Image:
    # Camadas desenhadas em pixel art.
    c_parede = parede()
    c_janela, e_janela = janela()
    c_estante = estante()
    c_mapa = mapa_anatomico()
    c_prat = prateleiras_direita()
    c_chao = chao()
    c_mesa = mesa()
    c_obj, c_velas, e_chamas = objetos_mesa()
    c_esq = esqueleto(*ESQ)
    c_esq.contornar("#061212", 0.6)
    v_fundo, v_mold, e_vidro, v_sup = vitrine(c_esq)
    c_globo = globo()
    c_frente = primeiro_plano()
    c_chao_obj = objetos_chao()

    # Sombras projetadas na parede pelas velas (só as coisas acima da chama fazem sombra para cima).
    obj_parede = c_prat.c[:, :, 3] > 0.5
    obj_mesa = c_obj.c[:, :, 3] > 0.5
    sombra_vela = []
    for (lx, ly, _) in CHAMAS:
        s = np.maximum(sombra_projetada(obj_parede, (lx, ly), 0.16), sombra_projetada(obj_mesa, (lx, ly), 0.55) * 0.8)
        sombra_vela.append(desfocar(ampliar(s[:, :, None]), 4)[:, :, 0])

    # Composição do albedo, de trás para a frente, com a profundidade de campo de cada plano.
    img = np.zeros((H * ESC, W * ESC, 3), dtype=np.float32)
    planos = [(c_parede, 0.6), (c_janela, 1.0), (c_estante, 1.1), (c_mapa, 0.3), (c_prat, 0.2)]
    for cam, r in planos:
        img = sobre(img, desfocar_rgba(ampliar(cam.c), r))
    frente_alfa = np.zeros(img.shape[:2], dtype=np.float32)
    for cam, r in ((c_chao, 0.3), (c_chao_obj, 0.4), (c_globo, 0.9), (v_fundo, 1.0), (v_sup, 0), (c_esq, 0), (v_mold, 0), (c_mesa, 0),
                   (c_obj, 0), (c_velas, 0)):
        a = desfocar_rgba(ampliar(cam.c), r)
        img = sobre(img, a)
        frente_alfa = np.maximum(frente_alfa, a[:, :, 3])
    eh_parede = 1 - np.clip(frente_alfa, 0, 1)

    # Sombra embaixo da mesa e da vitrine, e contato no assoalho.
    ao = Camada()
    for y in range(124, 150):
        for x in range(192, 356):
            t = (y - 124) / 26
            ao.p(x, y, "#000000", 0.8 * min(1, 1.6 * (1 - abs(x - 274) / 90)) * (1 - t * 0.55))
    for x in range(350, 452):
        ao.ret(x, 144, 1, 4, "#000000", 0.35 * (1 - abs(x - 401) / 60))
    sombra_ao = desfocar_rgba(ampliar(ao.c), 6)
    img = img * (1 - sombra_ao[:, :, 3:4])

    # Luz: ambiente frio (multiplica) + velas, vitrine e luar (somam).
    amb = hexa("#3a4a7e") * 0.40
    luz = np.zeros_like(img) + amb
    for i, (lx, ly, k) in enumerate(CHAMAS):
        poca = luz_de_vela(lx, ly, 105, 0.78, i + 1)[:, :, None] * hexa("#ff9440") * 1.25 * k
        miolo = luz_pontual(lx, ly, 30, 0.9)[:, :, None] * hexa("#ffd890") * 0.9 * k
        bloqueio = (1 - sombra_vela[i] * eh_parede * 0.85)[:, :, None]
        luz += (poca + miolo) * bloqueio
    gx0, gy0, gx1, gy1 = VIDRO
    interior = ((XS >= gx0 * ESC) & (XS < (gx1 + 1) * ESC) & (YS >= gy0 * ESC) & (YS < (gy1 + 1) * ESC)).astype(np.float32)
    interior = desfocar(interior[:, :, None], 2)[:, :, 0]
    ciano = hexa("#62e6f0")
    luz += interior[:, :, None] * (luz_pontual(ESQ[0], gy0, 75, 1.4)[:, :, None] * ciano * 1.15 + ciano * 0.2)
    luz += luz_pontual(ESQ[0], 140, 70, 0.35)[:, :, None] * hexa("#3ab8d0") * 0.55 * (1 - interior[:, :, None])
    luz += luz_pontual(ESQ[0] + 10, 80, 105, 0.9)[:, :, None] * hexa("#3ab8d0") * 0.38 * (1 - interior[:, :, None])
    # Luar: em volta da janela e a mancha dos caixilhos no assoalho.
    jx0, jy0, jx1, jy1 = JANELA
    luz += luz_pontual((jx0 + jx1) / 2, 50, 45, 1.2)[:, :, None] * hexa("#7a9ae0") * 0.35
    luz += luz_pontual(90, 70, 150, 0.7)[:, :, None] * hexa("#6a86c8") * 0.22  # luar difuso na estante
    mancha = Camada()
    for y in range(PAREDE_CHAO + 4, H):
        t = (y - PAREDE_CHAO - 4) / 34
        a = 40 + t * 46
        for x in range(int(a), int(a + 42 + t * 14)):
            u = (x - a) / (42 + t * 14)
            caixilho = abs(u - 0.5) < 0.04 or abs(t - 0.45) < 0.05
            if not caixilho:
                mancha.p(x, y, "#ffffff", 0.9)
    mancha_l = desfocar_rgba(ampliar(mancha.c), 2.5)[:, :, 3]
    luz += mancha_l[:, :, None] * hexa("#8aa8f0") * 0.55
    chao_m = (YS > PAREDE_CHAO * ESC).astype(np.float32)[:, :, None]
    luz += luz_pontual(272, 152, 120, 0.3)[:, :, None] * hexa("#ff9a50") * 0.75 * chao_m
    # A vela não recebe toda a luz da própria chama (senão vira um bloco branco).
    velas_a = ampliar(c_velas.c)[:, :, 3:4]
    luz = luz * (1 - 0.5 * velas_a) + amb * 0.5 * velas_a
    img = img * luz

    # Emissivos: céu da janela, reflexos do vidro, luminária da vitrine e as chamas com halo.
    jan = desfocar_rgba(ampliar(e_janela.c), 1.0)
    img = sobre(img, jan * np.array([0.85, 0.85, 0.95, 1], dtype=np.float32))
    vid = ampliar(e_vidro.c)
    img = img + vid[:, :, :3] * vid[:, :, 3:4] * 1.1
    cham = ampliar(e_chamas.c)
    img = sobre(img, cham)
    halo = desfocar(cham[:, :, :3] * cham[:, :, 3:4], 5) * 1.6 + desfocar(cham[:, :, :3] * cham[:, :, 3:4], 18) * 1.4
    img += halo * hexa("#ffb060")
    for (lx, ly, k) in CHAMAS:  # brilho alongado para cima, como chama que dança
        img += luz_pontual(lx, ly - 5, 5, 2.6)[:, :, None] * hexa("#ffc880") * 0.22 * k

    # Cone de luz da luminária da vitrine, com poeira fria flutuando dentro.
    tv = np.clip((YS / ESC - gy0) / (gy1 - gy0), 0, 1)
    cone = np.exp(-((XS - ESQ[0] * ESC) / ((14 + tv * 30) * ESC)) ** 2 * 2) * (1 - tv * 0.7) * interior
    img += desfocar(cone[:, :, None], 4) * hexa("#5ad8e8") * 0.16
    gc = np.random.default_rng(78)
    for _ in range(70):
        x = int((gx0 + 3 + gc.random() * (gx1 - gx0 - 6)) * ESC)
        y = int((gy0 + 4 + gc.random() * (gy1 - gy0 - 12)) * ESC)
        img[y:y + 2, x:x + 2] += hexa("#b8f4ff") * (0.15 + gc.random() * 0.35) * (0.4 + cone[y, x])

    # Reflexos no verniz: as chamas no tampo da mesa e a vitrine no assoalho.
    refl = np.zeros(img.shape[:2], dtype=np.float32)
    for (lx, ly, k) in CHAMAS:
        refl += luz_pontual(lx, 110.5, 4, 2.2) * k
    tampo = ((YS >= 97 * ESC) & (YS < 112 * ESC)).astype(np.float32)
    img += desfocar((refl * tampo)[:, :, None], 2) * hexa("#ffb870") * 0.35
    piso = (YS > 145 * ESC).astype(np.float32)
    rv = np.exp(-((XS - ESQ[0] * ESC) / (34 * ESC)) ** 2 * 2) * np.clip(1 - (YS / ESC - 145) / 16, 0, 1) * piso
    img += rv[:, :, None] * hexa("#4ac0d8") * 0.10

    # Feixe de luar volumétrico, da janela até o chão, e poeira suspensa (mais visível perto das velas).
    t = np.clip((YS / ESC - 40) / 100, 0, 1)
    centro = (34 + t * 60) * ESC
    feixe = np.exp(-((XS - centro) / ((16 + t * 12) * ESC)) ** 2 * 2) * (YS > 40 * ESC) * (1 - t * 0.5)
    img += desfocar(feixe[:, :, None], 6) * hexa("#5a78c0") * 0.13
    g = np.random.default_rng(77)
    poeira = np.zeros(img.shape[:2], dtype=np.float32)
    calor = sum(luz_pontual(lx, ly, 60, 0.9) for (lx, ly, _) in CHAMAS) + feixe * 0.6
    for _ in range(1600):
        x, y = int(g.random() * W * ESC), int(g.random() * H * ESC)
        k = calor[y, x]
        if k > 0.08 and g.random() < k:
            tam = 1 if g.random() < 0.7 else 2
            poeira[y:y + tam, x:x + tam] += 0.5 + g.random() * 0.5
    poeira = desfocar(np.clip(poeira, 0, 1)[:, :, None], 0.7)
    img += poeira * hexa("#ffdca0") * 0.7

    # Primeiro plano desfocado e escurecido.
    frente = desfocar_rgba(ampliar(c_frente.c), 8)
    img = sobre(img, frente * np.array([0.22, 0.2, 0.22, 1], dtype=np.float32))

    # Brilho (bloom) das luzes fortes.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * (lum > 0.75), 0, 2)
    img += desfocar_f(claro, 14) * 0.45

    # Curva de tom suave (as velas e as páginas não estouram no branco).
    joelho = 0.7
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))

    # Correção de cor: altas luzes quentes, sombras frias; contraste.
    quente, fria = hexa("#ffd08a"), hexa("#0c1a34")
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * quente + (1 - lum) * (fria * 0.5 + 0.5)))
    img = np.clip((img - 0.5) * 1.06 + 0.5, 0, 1.3)

    # A esquerda (onde fica o texto) mais calma: menos contraste e um pouco mais escura.
    xn = XS / (W * ESC)
    calma = np.clip((0.52 - xn) / 0.14, 0, 1)[:, :, None]
    media = desfocar_f(np.clip(img, 0, 1.3), 18)
    img = media + (img - media) * (1 - 0.4 * calma)
    img *= 1 - 0.08 * calma

    # Vinheta e grão.
    v = ((xn - 0.58) ** 2 * 1.2 + (YS / (H * ESC) - 0.45) ** 2 * 1.3)
    img *= (1 - np.clip(v - 0.05, 0, 1) * 1.0)[:, :, None]
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.02
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def montar_hora() -> Image.Image:
    """O gabinete de anatomia numa hora do dia (página Atlas): a hora entra pela janela da esquerda (sol da manhã,
    poente comprido, luar) e pelas velas (apagadas de manhã, acesas à tarde e à noite). A luminária da vitrine fica acesa
    sempre, mais forte à noite."""
    P = PERIODO
    k_vela = {"manha": 0.0, "tarde": 0.6, "noite": 1.0}[P]
    k_vit = {"manha": 0.55, "tarde": 0.75, "noite": 1.0}[P]
    cor_j = {"manha": "#fff0d4", "tarde": "#ffa860", "noite": "#8aa8f0"}[P]
    # Camadas desenhadas em pixel art.
    c_parede = parede()
    c_janela, e_janela = janela()
    c_estante = estante()
    c_mapa = mapa_anatomico()
    c_prat = prateleiras_direita()
    c_chao = chao()
    c_mesa = mesa()
    c_obj, c_velas, e_chamas = objetos_mesa()
    for cam in (c_mesa, c_obj, c_velas, e_chamas):  # a mesa e tudo o que está nela vão para a esquerda
        cam.c = np.roll(cam.c, DX_MESA, 1)
    if P == "manha":
        e_chamas = Camada()
    c_esq = esqueleto(*ESQ)
    c_esq.contornar("#061212", 0.6)
    v_fundo, v_mold, e_vidro, v_sup = vitrine(c_esq)
    c_globo = globo()
    c_frente = primeiro_plano()
    c_chao_obj = objetos_chao()

    # Sombras projetadas na parede pelas velas (só as coisas acima da chama fazem sombra para cima).
    obj_parede = c_prat.c[:, :, 3] > 0.5
    obj_mesa = c_obj.c[:, :, 3] > 0.5
    sombra_vela = []
    for (lx, ly, _) in CHAMAS:
        s = np.maximum(sombra_projetada(obj_parede, (lx, ly), 0.16), sombra_projetada(obj_mesa, (lx, ly), 0.55) * 0.8)
        sombra_vela.append(desfocar(ampliar(s[:, :, None]), 4)[:, :, 0])

    # Composição do albedo, de trás para a frente, com a profundidade de campo de cada plano.
    img = np.zeros((H * ESC, W * ESC, 3), dtype=np.float32)
    planos = [(c_parede, 0.6), (c_janela, 1.0), (c_estante, 1.1), (c_mapa, 0.3), (c_prat, 0.2)]
    for cam, r in planos:
        img = sobre(img, desfocar_rgba(ampliar(cam.c), r))
    frente_alfa = np.zeros(img.shape[:2], dtype=np.float32)
    for cam, r in ((c_chao, 0.3), (c_chao_obj, 0.4), (c_globo, 0.9), (v_fundo, 1.0), (v_sup, 0), (c_esq, 0), (v_mold, 0), (c_mesa, 0),
                   (c_obj, 0), (c_velas, 0)):
        a = desfocar_rgba(ampliar(cam.c), r)
        img = sobre(img, a)
        frente_alfa = np.maximum(frente_alfa, a[:, :, 3])
    eh_parede = 1 - np.clip(frente_alfa, 0, 1)

    # Sombra embaixo da mesa e da vitrine, e contato no assoalho.
    ao = Camada()
    for y in range(124, 150):
        for x in range(192 + DX_MESA, 356 + DX_MESA):
            t = (y - 124) / 26
            ao.p(x, y, "#000000", 0.8 * min(1, 1.6 * (1 - abs(x - 274 - DX_MESA) / 90)) * (1 - t * 0.55))
    for x in range(350 + DX_VITRINE, 452 + DX_VITRINE):
        ao.ret(x, 144, 1, 4, "#000000", 0.35 * (1 - abs(x - 401 - DX_VITRINE) / 60))
    sombra_ao = desfocar_rgba(ampliar(ao.c), 6)
    img = img * (1 - sombra_ao[:, :, 3:4])

    # Luz: ambiente frio (multiplica) + velas, vitrine e luar (somam).
    amb = hexa({"manha": "#a0a6c4", "tarde": "#8a6a7a", "noite": "#3a4a7e"}[P]) * {"manha": 0.68, "tarde": 0.5, "noite": 0.4}[P]
    luz = np.zeros_like(img) + amb
    for i, (lx, ly, k) in enumerate(CHAMAS):
        poca = luz_de_vela(lx, ly, 105, 0.78, i + 1)[:, :, None] * hexa("#ff9440") * 1.25 * k * k_vela
        miolo = luz_pontual(lx, ly, 30, 0.9)[:, :, None] * hexa("#ffd890") * 0.9 * k * k_vela
        bloqueio = (1 - sombra_vela[i] * eh_parede * 0.85)[:, :, None]
        luz += (poca + miolo) * bloqueio
    gx0, gy0, gx1, gy1 = VIDRO
    interior = ((XS >= gx0 * ESC) & (XS < (gx1 + 1) * ESC) & (YS >= gy0 * ESC) & (YS < (gy1 + 1) * ESC)).astype(np.float32)
    interior = desfocar(interior[:, :, None], 2)[:, :, 0]
    ciano = hexa("#62e6f0")
    luz += interior[:, :, None] * (luz_pontual(ESQ[0], gy0, 75, 1.4)[:, :, None] * ciano * 1.15 + ciano * 0.2) * k_vit
    luz += luz_pontual(ESQ[0], 140, 70, 0.35)[:, :, None] * hexa("#3ab8d0") * 0.55 * (1 - interior[:, :, None]) * k_vit
    luz += luz_pontual(ESQ[0] + 10, 80, 105, 0.9)[:, :, None] * hexa("#3ab8d0") * 0.38 * (1 - interior[:, :, None]) * k_vit
    # Luar: em volta da janela e a mancha dos caixilhos no assoalho.
    jx0, jy0, jx1, jy1 = JANELA
    k_jan = {"manha": 1.6, "tarde": 1.4, "noite": 1.0}[P]
    luz += luz_pontual((jx0 + jx1) / 2, 50, 45, 1.2)[:, :, None] * hexa(cor_j) * 0.35 * k_jan
    luz += luz_pontual(90, 70, 150, 0.7)[:, :, None] * hexa(cor_j) * 0.22 * k_jan  # claridade difusa na estante
    if P != "noite":  # a luz do dia que entra rebate pela sala inteira
        luz += luz_pontual(200, 110, 260, 0.6)[:, :, None] * hexa(cor_j) * (0.3 if P == "manha" else 0.16)
    mancha = Camada()
    # de manhã a mancha cai mais perto da janela; à tarde, sol baixo, ela se estica pelo assoalho até a mesa
    estica = {"manha": 0.8, "tarde": 2.1, "noite": 1.0}[P]
    for y in range(PAREDE_CHAO + 4, H):
        t = (y - PAREDE_CHAO - 4) / 34
        a = 40 + t * 46 * estica
        for x in range(int(a), int(a + 42 + t * 14)):
            u = (x - a) / (42 + t * 14)
            caixilho = abs(u - 0.5) < 0.04 or abs(t - 0.45) < 0.05
            if not caixilho:
                mancha.p(x, y, "#ffffff", 0.9)
    mancha_l = desfocar_rgba(ampliar(mancha.c), 2.5)[:, :, 3]
    luz += mancha_l[:, :, None] * hexa(cor_j) * {"manha": 0.75, "tarde": 0.7, "noite": 0.55}[P]
    chao_m = (YS > PAREDE_CHAO * ESC).astype(np.float32)[:, :, None]
    luz += luz_pontual(272 + DX_MESA, 152, 120, 0.3)[:, :, None] * hexa("#ff9a50") * 0.75 * chao_m * k_vela
    # A vela não recebe toda a luz da própria chama (senão vira um bloco branco).
    velas_a = ampliar(c_velas.c)[:, :, 3:4]
    luz = luz * (1 - 0.5 * velas_a) + amb * 0.5 * velas_a
    img = img * luz

    # Emissivos: céu da janela, reflexos do vidro, luminária da vitrine e as chamas com halo.
    jan = desfocar_rgba(ampliar(e_janela.c), 1.0)
    img = sobre(img, jan * np.array({"manha": [0.95, 0.95, 0.98, 1], "tarde": [1, 0.92, 0.85, 1],
                                     "noite": [0.85, 0.85, 0.95, 1]}[P], dtype=np.float32))
    vid = ampliar(e_vidro.c)
    img = img + vid[:, :, :3] * vid[:, :, 3:4] * 1.1 * (0.6 + 0.4 * k_vit)
    cham = ampliar(e_chamas.c)
    img = sobre(img, cham)
    halo = desfocar(cham[:, :, :3] * cham[:, :, 3:4], 5) * 1.6 + desfocar(cham[:, :, :3] * cham[:, :, 3:4], 18) * 1.4
    img += halo * hexa("#ffb060")
    for (lx, ly, k) in CHAMAS:  # brilho alongado para cima, como chama que dança
        img += luz_pontual(lx, ly - 5, 5, 2.6)[:, :, None] * hexa("#ffc880") * 0.22 * k * k_vela

    # Cone de luz da luminária da vitrine, com poeira fria flutuando dentro.
    tv = np.clip((YS / ESC - gy0) / (gy1 - gy0), 0, 1)
    cone = np.exp(-((XS - ESQ[0] * ESC) / ((14 + tv * 30) * ESC)) ** 2 * 2) * (1 - tv * 0.7) * interior
    img += desfocar(cone[:, :, None], 4) * hexa("#5ad8e8") * 0.16 * k_vit
    gc = np.random.default_rng(78)
    for _ in range(70):
        x = int((gx0 + 3 + gc.random() * (gx1 - gx0 - 6)) * ESC)
        y = int((gy0 + 4 + gc.random() * (gy1 - gy0 - 12)) * ESC)
        img[y:y + 2, x:x + 2] += hexa("#b8f4ff") * (0.15 + gc.random() * 0.35) * (0.4 + cone[y, x])

    # Reflexos no verniz: as chamas no tampo da mesa e a vitrine no assoalho.
    refl = np.zeros(img.shape[:2], dtype=np.float32)
    for (lx, ly, k) in CHAMAS:
        refl += luz_pontual(lx, 110.5, 4, 2.2) * k
    tampo = ((YS >= 97 * ESC) & (YS < 112 * ESC)).astype(np.float32)
    img += desfocar((refl * tampo)[:, :, None], 2) * hexa("#ffb870") * 0.35 * k_vela
    piso = (YS > 145 * ESC).astype(np.float32)
    rv = np.exp(-((XS - ESQ[0] * ESC) / (34 * ESC)) ** 2 * 2) * np.clip(1 - (YS / ESC - 145) / 16, 0, 1) * piso
    img += rv[:, :, None] * hexa("#4ac0d8") * 0.10

    # Feixe de luar volumétrico, da janela até o chão, e poeira suspensa (mais visível perto das velas).
    t = np.clip((YS / ESC - 40) / 100, 0, 1)
    centro = (34 + t * 60 * estica) * ESC
    feixe = np.exp(-((XS - centro) / ((16 + t * 12) * ESC)) ** 2 * 2) * (YS > 40 * ESC) * (1 - t * 0.5)
    img += desfocar(feixe[:, :, None], 6) * hexa(cor_j) * {"manha": 0.3, "tarde": 0.3, "noite": 0.13}[P]
    g = np.random.default_rng(77)
    poeira = np.zeros(img.shape[:2], dtype=np.float32)
    calor = sum(luz_pontual(lx, ly, 60, 0.9) for (lx, ly, _) in CHAMAS) * k_vela + feixe * (0.6 if P == "noite" else 1.0)
    for _ in range(1600):
        x, y = int(g.random() * W * ESC), int(g.random() * H * ESC)
        k = calor[y, x]
        if k > 0.08 and g.random() < k:
            tam = 1 if g.random() < 0.7 else 2
            poeira[y:y + tam, x:x + tam] += 0.5 + g.random() * 0.5
    poeira = desfocar(np.clip(poeira, 0, 1)[:, :, None], 0.7)
    img += poeira * hexa("#ffdca0" if P != "manha" else "#fff4e0") * 0.7

    # Primeiro plano desfocado e escurecido.
    frente = desfocar_rgba(ampliar(c_frente.c), 8)
    img = sobre(img, frente * np.array([0.22, 0.2, 0.22, 1], dtype=np.float32))

    # Brilho (bloom) das luzes fortes.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * (lum > 0.75), 0, 2)
    img += desfocar_f(claro, 14) * 0.45

    # Curva de tom suave (as velas e as páginas não estouram no branco).
    joelho = 0.7
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))

    # Correção de cor: altas luzes quentes, sombras frias; contraste.
    quente, fria = (hexa(c_) for c_ in {"manha": ("#fff0d4", "#22345e"), "tarde": ("#ffcf90", "#2a1a3a"),
                                         "noite": ("#ffd08a", "#0c1a34")}[P])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * quente + (1 - lum) * (fria * 0.5 + 0.5)))
    img = np.clip((img - 0.5) * 1.06 + 0.5, 0, 1.3)

    # A esquerda (onde fica o texto) mais calma: menos contraste e um pouco mais escura.
    xn = XS / (W * ESC)
    calma = np.clip((0.52 - xn) / 0.14, 0, 1)[:, :, None]
    media = desfocar_f(np.clip(img, 0, 1.3), 18)
    img = media + (img - media) * (1 - 0.4 * calma)
    img *= 1 - 0.08 * calma

    # Vinheta e grão.
    v = ((xn - 0.58) ** 2 * 1.2 + (YS / (H * ESC) - 0.45) ** 2 * 1.3)
    img *= (1 - np.clip(v - 0.05, 0, 1) * 1.0)[:, :, None]
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.02
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    """Sem argumentos: a seção da página inicial (public/pixel/inicio/secao-atlas).
    Com --paginas [manha|tarde|noite]: a página Atlas em public/pixel/paginas/atlas-<hora>(-960).webp."""
    global PERIODO, CHAMAS, VITRINE, VIDRO, ESQ
    args = sys.argv[1:]
    if "--paginas" in args:
        PASTA_PAGINAS.mkdir(parents=True, exist_ok=True)
        orig = (CHAMAS, VITRINE, VIDRO, ESQ)
        CHAMAS = [(x + DX_MESA, y, k) for (x, y, k) in orig[0]]
        VITRINE = (orig[1][0] + DX_VITRINE, orig[1][1], orig[1][2] + DX_VITRINE, orig[1][3])
        VIDRO = (orig[2][0] + DX_VITRINE, orig[2][1], orig[2][2] + DX_VITRINE, orig[2][3])
        ESQ = (orig[3][0] + DX_VITRINE, orig[3][1])
        for p in [a for a in args if a in PERIODOS] or list(PERIODOS):
            PERIODO = p
            img = montar_hora()
            nome = f"atlas-{p}"
            img.save(PASTA_PAGINAS / f"{nome}.webp", quality=84, method=6)
            img.resize((960, 320), Image.LANCZOS).save(PASTA_PAGINAS / f"{nome}-960.webp", quality=84, method=6)
            print(nome, (PASTA_PAGINAS / f"{nome}.webp").stat().st_size // 1024, "KB,",
                  (PASTA_PAGINAS / f"{nome}-960.webp").stat().st_size // 1024, "KB (960)")
        PERIODO = None
        CHAMAS, VITRINE, VIDRO, ESQ = orig
        return
    PASTA.mkdir(parents=True, exist_ok=True)
    img = montar()
    img.save(PASTA / "secao-atlas.webp", quality=85, method=6)
    img.resize((960, 320), Image.LANCZOS).save(PASTA / "secao-atlas-960.webp", quality=84, method=6)
    for nome in ("secao-atlas.webp", "secao-atlas-960.webp"):
        print(nome, (PASTA / nome).stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
