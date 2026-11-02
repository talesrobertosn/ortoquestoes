"""O mascote em pixel art HD-2D (30/10/2026): o esqueleto guerreiro chibi e o gato, feitos do zero por este script.

Nada é baixado nem gerado por IA: cada pixel sai das formas (campos de distância), da luz calculada e das paletas
abaixo. O personagem é original: crânio grande e redondo com rachadura, órbitas ovais enormes e baixas, sem dentes à mostra (crânio de peça
só), expressão séria; corpo pequeno com costelas e coluna; armadura leve (ombreira de aço amassada com correia,
cinto com fivela, saiote de pano vermelho esfarrapado, braçadeira de couro). Nos comportamentos de Halloween ele
veste por cima uma capa roxa com capuz.

Gera em public/pixel/mascote/:
- esqueleto.png: folha de sprites, quadros de 96 x 128, 8 quadros por linha, uma linha por comportamento
  (ordem e ids em src/componentes/mascote/sprites.ts);
- gato.png: quadros de 64 x 40, 6 por linha (dormindo, acordado, tala).
O CSS amplia com image-rendering: pixelated.

Uso: python3 scripts/gerar_mascote.py [--previa PASTA]   (a prévia salva folhas ampliadas para conferir)
"""
from __future__ import annotations

import math
import sys
from dataclasses import dataclass, field, replace
from pathlib import Path

import os

import numpy as np
from PIL import Image

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "mascote"
FW, FH, NQ = 96, 128, 8          # quadro do esqueleto e quadros por linha
GW, GH, GQ = 64, 40, 6           # quadro do gato

TAU = math.tau


# ═══════════════════════════════ cor ═══════════════════════════════
def hx(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255.0


def rampa(*hs: str) -> np.ndarray:
    return np.stack([hx(h) for h in hs])


# ═══════════════════════════════ ruído ═══════════════════════════════
def _hash(ix: np.ndarray, iy: np.ndarray, seed: int) -> np.ndarray:
    h = (ix.astype(np.int64) * 374761393 + iy.astype(np.int64) * 668265263 + seed * 2246822519) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFF) / 65535.0


def ruido(x: np.ndarray, y: np.ndarray, seed: int = 0) -> np.ndarray:
    """Ruído de valor suave em [-1, 1]."""
    ix, iy = np.floor(x), np.floor(y)
    fx, fy = x - ix, y - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = _hash(ix, iy, seed), _hash(ix + 1, iy, seed)
    c, d = _hash(ix, iy + 1, seed), _hash(ix + 1, iy + 1, seed)
    return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 2 - 1


def granulo(x: np.ndarray, y: np.ndarray, seed: int = 0) -> np.ndarray:
    """Ruído de pixel (não suave) em [-1, 1]."""
    return _hash(np.floor(x), np.floor(y), seed) * 2 - 1


# ═══════════════════════════════ formas (campos de distância) ═══════════════════════════════
class Forma:
    """Campo de distância com sinal (negativo dentro) e a caixa que o contém."""

    __slots__ = ("f", "bb")

    def __init__(self, f, bb):
        self.f, self.bb = f, bb

    def __or__(self, o: "Forma") -> "Forma":
        a, b = self.f, o.f
        return Forma(lambda X, Y: np.minimum(a(X, Y), b(X, Y)), _uniao(self.bb, o.bb))

    def __sub__(self, o: "Forma") -> "Forma":
        a, b = self.f, o.f
        return Forma(lambda X, Y: np.maximum(a(X, Y), -b(X, Y)), self.bb)

    def __and__(self, o: "Forma") -> "Forma":
        a, b = self.f, o.f
        bb = (max(self.bb[0], o.bb[0]), max(self.bb[1], o.bb[1]), min(self.bb[2], o.bb[2]), min(self.bb[3], o.bb[3]))
        return Forma(lambda X, Y: np.maximum(a(X, Y), b(X, Y)), bb)

    def suave(self, o: "Forma", k: float = 2.0) -> "Forma":
        a, b = self.f, o.f

        def f(X, Y):
            da, db = a(X, Y), b(X, Y)
            h = np.clip(0.5 + 0.5 * (db - da) / k, 0, 1)
            return db + (da - db) * h - k * h * (1 - h)
        return Forma(f, _uniao(self.bb, o.bb))

    def engrossa(self, r: float) -> "Forma":
        a = self.f
        x0, y0, x1, y1 = self.bb
        return Forma(lambda X, Y: a(X, Y) - r, (x0 - r, y0 - r, x1 + r, y1 + r))

    def borda(self, amp: float, freq: float, seed: int) -> "Forma":
        """Contorno irregular (pelo, pano gasto)."""
        a = self.f
        x0, y0, x1, y1 = self.bb
        return Forma(lambda X, Y: a(X, Y) + amp * ruido(X * freq, Y * freq, seed), (x0 - amp, y0 - amp, x1 + amp, y1 + amp))


def _uniao(a, b):
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))


def circulo(c, r) -> Forma:
    cx, cy = c
    return Forma(lambda X, Y: np.hypot(X - cx, Y - cy) - r, (cx - r, cy - r, cx + r, cy + r))


def elipse(c, rx, ry, ang=0.0) -> Forma:
    cx, cy = c
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def f(X, Y):
        dx, dy = X - cx, Y - cy
        u, v = dx * ca + dy * sa, -dx * sa + dy * ca
        k0 = np.hypot(u / rx, v / ry)
        k1 = np.hypot(u / (rx * rx), v / (ry * ry)) + 1e-9
        return k0 * (k0 - 1) / k1
    r = max(rx, ry)
    return Forma(f, (cx - r, cy - r, cx + r, cy + r))


def caixa(c, hw, hh, r=0.0, ang=0.0) -> Forma:
    cx, cy = c
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def f(X, Y):
        dx, dy = X - cx, Y - cy
        u, v = np.abs(dx * ca + dy * sa) - (hw - r), np.abs(-dx * sa + dy * ca) - (hh - r)
        return np.hypot(np.maximum(u, 0), np.maximum(v, 0)) + np.minimum(np.maximum(u, v), 0) - r
    e = math.hypot(hw, hh)
    return Forma(f, (cx - e, cy - e, cx + e, cy + e))


def capsula(a, b, ra, rb=None) -> Forma:
    rb = ra if rb is None else rb
    ax, ay = a
    bx, by = b
    ex, ey = bx - ax, by - ay
    ee = ex * ex + ey * ey + 1e-9

    def f(X, Y):
        wx, wy = X - ax, Y - ay
        t = np.clip((wx * ex + wy * ey) / ee, 0, 1)
        return np.hypot(wx - ex * t, wy - ey * t) - (ra + (rb - ra) * t)
    r = max(ra, rb)
    return Forma(f, (min(ax, bx) - r, min(ay, by) - r, max(ax, bx) + r, max(ay, by) + r))


def poligono(pts) -> Forma:
    P = np.array(pts, float)
    n = len(P)

    def f(X, Y):
        d = (X - P[0, 0]) ** 2 + (Y - P[0, 1]) ** 2
        s = np.ones_like(X)
        j = n - 1
        for i in range(n):
            e0, e1 = P[j, 0] - P[i, 0], P[j, 1] - P[i, 1]
            wx, wy = X - P[i, 0], Y - P[i, 1]
            t = np.clip((wx * e0 + wy * e1) / (e0 * e0 + e1 * e1 + 1e-9), 0, 1)
            bx, by = wx - e0 * t, wy - e1 * t
            d = np.minimum(d, bx * bx + by * by)
            c1, c2, c3 = Y >= P[i, 1], Y < P[j, 1], e0 * wy > e1 * wx
            s = np.where((c1 & c2 & c3) | (~c1 & ~c2 & ~c3), -s, s)
            j = i
        return s * np.sqrt(d)
    return Forma(f, (P[:, 0].min(), P[:, 1].min(), P[:, 0].max(), P[:, 1].max()))


def traco(pts, r) -> Forma:
    """Linha grossa por vários pontos; r pode ser um número ou um raio por ponto."""
    rs = [r] * len(pts) if isinstance(r, (int, float)) else list(r)
    f = capsula(pts[0], pts[1], rs[0], rs[1])
    for i in range(1, len(pts) - 1):
        f = f | capsula(pts[i], pts[i + 1], rs[i], rs[i + 1])
    return f


def bezier(p0, p1, p2, n=10):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in np.linspace(0, 1, n)]


def semiplano(p, nrm) -> Forma:
    """Lado do plano para onde a normal aponta é FORA."""
    px, py = p
    nx, ny = nrm
    L = math.hypot(nx, ny)
    nx, ny = nx / L, ny / L
    return Forma(lambda X, Y: (X - px) * nx + (Y - py) * ny, (-1e3, -1e3, 1e3, 1e3))


class Quadro2D:
    """Transformação local -> tela (origem + rotação em graus, sentido horário na tela)."""

    def __init__(self, o, ang=0.0, esp=1.0):
        self.o, self.ang, self.esp = o, ang, esp
        self.c, self.s = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def p(self, x, y=None):
        if y is None:
            x, y = x
        x, y = x * self.esp, y
        return (self.o[0] + x * self.c - y * self.s, self.o[1] + x * self.s + y * self.c)

    def forma(self, fl: Forma) -> Forma:
        """Leva uma forma desenhada em coordenadas locais para a tela."""
        ox, oy = self.o
        c, s, e = self.c, self.s, self.esp
        g = fl.f

        def f(X, Y):
            dx, dy = X - ox, Y - oy
            return g((dx * c + dy * s) / e, -dx * s + dy * c)
        x0, y0, x1, y1 = fl.bb
        cs = [self.p(x, y) for x in (x0, x1) for y in (y0, y1)]
        return Forma(f, (min(q[0] for q in cs), min(q[1] for q in cs), max(q[0] for q in cs), max(q[1] for q in cs)))

    def uv(self):
        ox, oy = self.o
        c, s, e = self.c, self.s, self.esp
        return lambda X, Y: ((( X - ox) * c + (Y - oy) * s) / e, -(X - ox) * s + (Y - oy) * c)


# ═══════════════════════════════ materiais ═══════════════════════════════
@dataclass
class Mat:
    rampa: np.ndarray
    contorno: np.ndarray
    rim: float = 0.4
    tex: float = 0.0
    amb: float = 0.30
    kd: float = 0.95
    brilho: float = 0.0           # especular (metal)
    emite: bool = False
    bloom: float = 0.0
    luz_pontual: float = 1.0


TINTA = hx("#170f16")
MATS: dict[str, Mat] = {
    # osso marfim: sombras frias e arroxeadas, luzes quentes
    "osso": Mat(rampa("#2a2030", "#45343f", "#67524b", "#8b725a", "#ae9472", "#cbb68e", "#e3d3ac", "#f6edd2"), hx("#1a1118"), rim=0.5, tex=0.07),
    "dente": Mat(rampa("#4a3a42", "#8d7a66", "#c9b896", "#e9dcbb", "#fbf4e0"), hx("#1a1118"), rim=0.2, tex=0.03),
    "interior": Mat(rampa("#0e0910", "#170f19", "#211723", "#2e2129", "#3c2c30"), hx("#0c070c"), rim=0.0, amb=0.45, kd=0.5),
    "orbita": Mat(rampa("#0a0709", "#151012", "#221b1d", "#312829", "#403637", "#4f4446"), hx("#0c070c"), rim=0.0, amb=0.2, kd=0.8, luz_pontual=0.2),
    "brilho": Mat(rampa("#26343e", "#4d6a78", "#86a8b4", "#c8dde0"), TINTA, emite=True, bloom=0.0),
    # armadura
    "aco": Mat(rampa("#16161e", "#262833", "#3a3e4a", "#535a66", "#717a84", "#939ca3", "#b8c0c2", "#e2e6e2"), hx("#0e0d14"), rim=0.55, tex=0.02, brilho=0.9),
    "ferrugem": Mat(rampa("#2a120c", "#4a2214", "#6e3a1e", "#93552a", "#b0733a"), hx("#140a08"), rim=0.2, tex=0.12),
    "couro": Mat(rampa("#1a0f0c", "#2c1a13", "#43281b", "#5c3824", "#784a2e", "#93603a", "#ad7a4c"), hx("#120a08"), rim=0.35, tex=0.08),
    "latao": Mat(rampa("#2a1a08", "#4f3410", "#7a5418", "#a87a26", "#d2a83c", "#f0d670", "#fff4b8"), hx("#170e05"), rim=0.3, brilho=1.0),
    "pano": Mat(rampa("#1a080c", "#2e0d14", "#47121c", "#621a24", "#7e252c", "#9a3536", "#b44c44"), hx("#12060a"), rim=0.4, tex=0.06),
    "capa": (Mat(rampa("#08080b", "#0f0f14", "#17171e", "#202029", "#2a2a35", "#363642", "#454552", "#585866"), hx("#050507"), rim=0.55, tex=0.05, luz_pontual=0.55)
             if os.environ.get("CAPA") == "escura" else
             Mat(rampa("#0d0716", "#170d24", "#221333", "#2f1a45", "#3e2358", "#4f2e6c", "#653e82", "#7f5798"), hx("#08040e"), rim=0.55, tex=0.05, luz_pontual=0.55)),
    "forro": Mat(rampa("#07040b", "#0d0812", "#150d1c", "#1e1428"), hx("#05030a"), rim=0.0, amb=0.5, kd=0.4, luz_pontual=0.4),
    # objetos
    "madeira": Mat(rampa("#1c100a", "#311c10", "#4c2e18", "#6a4322", "#8a5c30", "#a87642", "#c49358"), hx("#120a06"), rim=0.3, tex=0.1),
    "papel": Mat(rampa("#5a4a3e", "#8f7c66", "#bba88a", "#dccbaa", "#efe4c8", "#fbf6e6"), hx("#22160f"), rim=0.15, tex=0.03),
    "tinta": Mat(rampa("#2a1e1e", "#3e2e2a", "#5a4638"), hx("#22160f"), rim=0.0, amb=0.2, kd=0.5),
    "capa_livro": Mat(rampa("#061214", "#0b2226", "#12343a", "#1a4a50", "#246468", "#348080"), hx("#030a0c"), rim=0.35, tex=0.05),
    "caneca": Mat(rampa("#200608", "#3e0c10", "#621418", "#8a2020", "#b0322a", "#d24e3a", "#ee7a5a"), hx("#120304"), rim=0.4, brilho=0.6),
    "cafe": Mat(rampa("#120804", "#26140a", "#3e2414", "#5a3820"), hx("#0c0604"), rim=0.0, brilho=0.4),
    "filme": Mat(rampa("#0a1220", "#0f1c30", "#16283f", "#203852", "#2c4a66"), hx("#05080f"), rim=0.2, brilho=0.3),
    "raiox": Mat(rampa("#2a4a6a", "#5084aa", "#8cc0dc", "#cbeaf6", "#f4ffff"), hx("#05080f"), emite=True, bloom=0.35),
    "marsh": Mat(rampa("#5a3a28", "#8a5a36", "#b88048", "#d8a868", "#ecd0a0", "#f8ecd8", "#fffaf0"), hx("#22140c"), rim=0.2),
    "borracha": Mat(rampa("#3a1010", "#6a1e1a", "#a0342a", "#d4523c", "#f07a5a", "#ffa880"), hx("#1a0606"), rim=0.35, brilho=0.4),
    "abobora": Mat(rampa("#2a0e04", "#4a1a06", "#74300a", "#a0480e", "#c86414", "#e8862a", "#f8aa50"), hx("#160702"), rim=0.35, tex=0.06),
    "talo": Mat(rampa("#14180a", "#262c10", "#3c4418", "#566024"), hx("#0a0c04"), rim=0.2),
    "chama": Mat(rampa("#7a2008", "#c84a10", "#f08a20", "#ffc040", "#ffe890", "#fffbe8"), hx("#3a1004"), emite=True, bloom=0.8),
    "lanterna_luz": Mat(rampa("#a0400a", "#e07a18", "#ffb030", "#ffe070", "#fff8d0"), hx("#3a1004"), emite=True, bloom=0.7),
    "cera": Mat(rampa("#5a4a40", "#9a8670", "#cdb898", "#ecdcbc", "#fbf2dc"), hx("#22160f"), rim=0.2),
    "morcego": Mat(rampa("#07040a", "#100a16", "#1a1124", "#261a34", "#352546", "#4a3660"), hx("#040208"), rim=0.6, tex=0.04),
    "morcego_asa": Mat(rampa("#0b0610", "#160e1e", "#22162e", "#30203e", "#44305a"), hx("#040208"), rim=0.5),
    "olho_morcego": Mat(rampa("#a02010", "#f05020", "#ffb070"), TINTA, emite=True, bloom=0.3),
    # gato (laranja tigrado com peito branco)
    "pelo": Mat(rampa("#2a120c", "#4a2010", "#6e3414", "#94481a", "#b8622a", "#d27e3c", "#e89c56", "#f8be7c"), hx("#1a0a06"), rim=0.5, tex=0.05),
    "pelo_listra": Mat(rampa("#1e0c08", "#34160a", "#50240e", "#6c3412", "#8a4618", "#a85a22"), hx("#1a0a06"), rim=0.4),
    "pelo_branco": Mat(rampa("#4a3a40", "#7a6a66", "#a8988a", "#cfc2b0", "#e8dfcf", "#f8f4ea"), hx("#241a18"), rim=0.4, tex=0.04),
    "rosa": Mat(rampa("#5a2a30", "#94505a", "#c87a80", "#e8a0a0"), hx("#2a1014"), rim=0.1),
    "olho_gato": Mat(rampa("#2a4a10", "#4a7a18", "#7ab02a", "#b8e050"), hx("#0a1004"), emite=True),
    "pupila": Mat(rampa("#050305", "#0d0a0c"), TINTA, rim=0.0),
    "tala": Mat(rampa("#0e1a3a", "#16295a", "#20407e", "#2c58a0", "#4074c0", "#5e94dc", "#8ab8f0"), hx("#070c1e"), rim=0.4, tex=0.03),
    "faixa": Mat(rampa("#6a6a6e", "#9a9a9a", "#c8c6c0", "#e6e4dc", "#faf8f2"), hx("#2a2826"), rim=0.2, tex=0.06),
    # linhas novas (31/10/2026): chapéu de mago, cristal do cajado e lã do inverno
    "chapeu": Mat(rampa("#07081a", "#0c0f2a", "#121a40", "#1a2656", "#23346e", "#2f4588", "#405aa2"), hx("#04050e"), rim=0.5, tex=0.06),
    "cristal": Mat(rampa("#08302e", "#0e5a56", "#16867e", "#2cb4a6", "#62e2d0", "#b4fff0", "#f0fffb"), hx("#031614"), emite=True, bloom=0.75),
    "la": Mat(rampa("#2a080c", "#4a1016", "#6e1a20", "#94262a", "#b63a36", "#d05446", "#e67a62"), hx("#160406"), rim=0.4, tex=0.1),
    "la_creme": Mat(rampa("#4a3c36", "#7c6a5c", "#ad987e", "#d4c2a2", "#ebdfc2", "#faf3e2"), hx("#241a16"), rim=0.35, tex=0.08),
    # linhas novas (01/11/2026, sempre no fim): manto do mago 2, capa de viajante, gema verdete, lousa e giz
    "manto": Mat(rampa("#05061a", "#0a0e2a", "#10173c", "#172150", "#1f2c66", "#2a3a7c", "#384c94"), hx("#03040e"), rim=0.55, tex=0.05, luz_pontual=0.6),
    "viagem": Mat(rampa("#170d08", "#24150c", "#352012", "#482d18", "#5e3c20", "#774f2a", "#906436", "#a87c48"), hx("#0e0805"), rim=0.45, tex=0.09),
    "gema": Mat(rampa("#062820", "#0e4a3a", "#187058", "#2a9476", "#52ba98", "#9ae2c4", "#e2fff2"), hx("#03140f"), emite=True, bloom=0.45),
    "lousa": Mat(rampa("#0a1210", "#101c18", "#16261f", "#1d3028", "#253c32", "#2f4a3e"), hx("#060a08"), rim=0.25, tex=0.1),
    "giz": Mat(rampa("#8a9690", "#b4c0b8", "#dce4da", "#f6f8f0"), hx("#3a4440"), rim=0.0, amb=0.75, kd=0.3, tex=0.15),
    # roupas da tela de entrar (31/10/2026, sempre no fim): jaleco longo, uniforme verde, terno social, sapatos e livros
    "jaleco": Mat(rampa("#2a3238", "#47525a", "#6c787e", "#96a2a4", "#bcc6c6", "#d8dfde", "#eef0ee", "#fbfcfa"), hx("#141a1e"), rim=0.45, tex=0.03),
    "uniforme": Mat(rampa("#041a18", "#072824", "#0b3732", "#0f4842", "#14655e", "#1d7b72", "#2b9285"), hx("#03100e"), rim=0.5, tex=0.05),
    "blazer": Mat(rampa("#03191a", "#062724", "#09352f", "#0d433c", "#0f4f49", "#176259", "#22786c", "#348f80"), hx("#020c0b"), rim=0.7, tex=0.04),
    "camisa": Mat(rampa("#4c5258", "#7a8288", "#a8b0b2", "#d0d6d4", "#e8ece8", "#f8faf6"), hx("#1c2226"), rim=0.3, tex=0.02, amb=0.55, kd=0.6),
    "calca": Mat(rampa("#0c0e12", "#15181e", "#1e222a", "#2a2f38", "#383e48", "#4a515c", "#5e6672"), hx("#07080b"), rim=0.65, tex=0.03),
    "sapato": Mat(rampa("#0e0605", "#1c0d09", "#2e160e", "#432114", "#5c2e1b", "#7a4126", "#9c5a36"), hx("#080303"), rim=0.5, brilho=0.7),
    "tamanco": Mat(rampa("#3a4248", "#5e686e", "#8a9496", "#b4bcbc", "#d6dcda", "#eef2f0"), hx("#161c20"), rim=0.35, brilho=0.4),
    "livro_verde": Mat(rampa("#06200e", "#0c3418", "#134c24", "#1c6632", "#278242", "#38a054", "#58bc6c"), hx("#031008"), rim=0.5, tex=0.06),
    "livro_vinho": Mat(rampa("#1c0508", "#30090e", "#480f16", "#62161e", "#7e2028", "#9a2e32", "#b44440"), hx("#120305"), rim=0.5, tex=0.06),
    "tubo": Mat(rampa("#0c0f12", "#161b20", "#222930", "#323b44", "#46525c", "#5e6c76"), hx("#06080a"), rim=0.6, brilho=0.5),
    "gravata": Mat(rampa("#1a0406", "#2e070b", "#4a0c12", "#661219", "#841c22", "#a02a2c"), hx("#100203"), rim=0.45, tex=0.04),
    # terceira leva (01/11/2026, sempre no fim): neve, brasa, ferro da bigorna, bota encharcada e vidro da luneta
    "neve": Mat(rampa("#3c4a66", "#5c6e8c", "#8496b2", "#aebfd4", "#d2deea", "#ebf2f8", "#fbfdff"), hx("#1c2234"), rim=0.45, tex=0.05, amb=0.3),
    "brasa": Mat(rampa("#4a0c04", "#8a1e06", "#c8400c", "#f07018", "#ffa83a", "#ffd878", "#fff4d0"), hx("#2a0804"), emite=True, bloom=0.7),
    "ferro": Mat(rampa("#0c0c10", "#16161c", "#202128", "#2c2e36", "#3c3f48", "#53575f", "#70757c", "#9aa0a4"), hx("#060609"), rim=0.5, tex=0.05, brilho=0.6),
    "bota": Mat(rampa("#120f0a", "#1e1a12", "#2c261a", "#3c3422", "#4e442c", "#625637", "#786a44", "#8e7e54"), hx("#0a0806"), rim=0.45, tex=0.12),
    "vidro": Mat(rampa("#0a1424", "#12223a", "#1c3452", "#2a4a6c", "#46688a", "#7a9cba"), hx("#060a12"), rim=0.3, brilho=1.0),
}
NOMES_MAT = list(MATS)
IDX_MAT = {n: i for i, n in enumerate(NOMES_MAT)}

LUZ = np.array([-0.52, -0.66, 0.54]); LUZ /= np.linalg.norm(LUZ)
RIM = np.array([0.86, -0.32, -0.12]); RIM /= np.linalg.norm(RIM)
COR_RIM = hx("#a9d4ff")
MEIO = (LUZ + np.array([0, 0, 1.0])); MEIO /= np.linalg.norm(MEIO)


# ═══════════════════════════════ a tela de um quadro ═══════════════════════════════
class Tela:
    def __init__(self, w=FW, h=FH):
        self.w, self.h = w, h
        ys, xs = np.mgrid[0:h, 0:w]
        self.X, self.Y = xs + 0.5, ys + 0.5
        self.mat = np.full((h, w), -1, int)
        self.Z = np.full((h, w), -1e9)
        self.pid = np.full((h, w), -1, int)
        self.N = np.zeros((h, w, 3)); self.N[..., 2] = 1
        self.tom = np.zeros((h, w))
        self.tex = np.zeros((h, w))
        self.sem_contorno = np.zeros((h, w), bool)
        self.luzes: list[tuple] = []
        self.fx_sob = np.zeros((h, w, 4))     # sombra no chão (antes do personagem)
        self.fx = np.zeros((h, w, 4))         # vapor, faíscas, zz (depois)
        self.pids: dict[str, int] = {}
        self.origem = (0.0, 0.0)

    def _pid(self, nome):
        if nome not in self.pids:
            self.pids[nome] = len(self.pids)
        return self.pids[nome]

    def pinta(self, forma: Forma, mat: str, z: float, R: float = 2.0, pid: str = "obj", plano=(0.0, 0.0, 1.0),
              relevo=None, tom=0.0, uv=None, sobre: str | None = None, sem_contorno=False, semente=1, normal=True):
        """Pinta a forma: grava material, profundidade e normal (perfil arredondado de raio R; negativo = côncavo).
        sobre=pid pinta só por cima do que já é daquela peça (decalque)."""
        x0, y0, x1, y1 = forma.bb
        x0, y0 = max(0, int(math.floor(x0 - 1))), max(0, int(math.floor(y0 - 1)))
        x1, y1 = min(self.w, int(math.ceil(x1 + 2))), min(self.h, int(math.ceil(y1 + 2)))
        if x0 >= x1 or y0 >= y1:
            return
        sl = (slice(y0, y1), slice(x0, x1))
        X, Y = self.X[sl], self.Y[sl]
        d = forma.f(X, Y)
        m = d < 0
        if sobre is not None:
            m &= self.pid[sl] == self.pids.get(sobre, -99)
        else:
            m &= z >= self.Z[sl]
        if not m.any():
            return
        e = 0.35
        gx = (forma.f(X + e, Y) - forma.f(X - e, Y)) / (2 * e)
        gy = (forma.f(X, Y + e) - forma.f(X, Y - e)) / (2 * e)
        gl = np.hypot(gx, gy) + 1e-6
        gx, gy = gx / gl, gy / gl
        t = np.clip(-d / abs(R), 0, 1)
        nz = np.sqrt(np.clip(1 - (1 - t) ** 2, 0, 1))
        s = np.sqrt(np.clip(1 - nz * nz, 0, 1))
        sg = 1 if R > 0 else -1
        px, py, pz = plano
        nx, ny, nzz = sg * gx * s + nz * px, sg * gy * s + nz * py, nz * pz
        if relevo is not None:
            bx, by = relevo(X, Y)
            nx, ny = nx + bx, ny + by
        nl = np.sqrt(nx * nx + ny * ny + nzz * nzz) + 1e-9
        tomv = tom(X, Y) if callable(tom) else np.full(X.shape, float(tom))
        if uv is None:
            u, v = X - self.origem[0], Y - self.origem[1]
        else:
            u, v = uv(X, Y)
        texv = granulo(u, v, semente) * 0.6 + ruido(u * 0.5, v * 0.5, semente + 7) * 0.6
        Nn = np.stack([nx / nl, ny / nl, nzz / nl], -1)
        if not normal:
            # decalque só de tom: soma ao tom e mantém material, normal e textura
            self.tom[sl][m] += tomv[m]
            return
        self.mat[sl][m] = IDX_MAT[mat]
        if sobre is None:
            self.Z[sl][m] = z
            self.pid[sl][m] = self._pid(pid)
        self.N[sl][m] = Nn[m]
        self.tom[sl][m] = tomv[m]
        self.tex[sl][m] = texv[m]
        self.sem_contorno[sl][m] = sem_contorno

    def luz(self, x, y, zh, cor, raio, forca=1.0):
        self.luzes.append((x, y, zh, hx(cor) if isinstance(cor, str) else cor, raio, forca))

    def ponto_fx(self, x, y, cor, a=1.0, sob=False):
        x, y = int(math.floor(x)), int(math.floor(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            buf = self.fx_sob if sob else self.fx
            c = hx(cor) if isinstance(cor, str) else cor
            ant = buf[y, x]
            na = a + ant[3] * (1 - a)
            buf[y, x, :3] = (c * a + ant[:3] * ant[3] * (1 - a)) / max(na, 1e-6)
            buf[y, x, 3] = na

    # ─────────── iluminação e acabamento ───────────
    def render(self) -> np.ndarray:
        h, w = self.h, self.w
        cheio = self.mat >= 0
        Z = np.where(cheio, self.Z, -1e9)
        P = self.pid

        def viz(a, dx, dy, fill):
            out = np.full_like(a, fill)
            ys0, ys1 = max(0, -dy), min(h, h - dy)
            xs0, xs1 = max(0, -dx), min(w, w - dx)
            out[ys0:ys1, xs0:xs1] = a[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx]
            return out

        # oclusão de ambiente: peças da frente por perto escurecem
        oc = np.zeros((h, w))
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                r = math.hypot(dx, dy)
                if r == 0 or r > 3.2:
                    continue
                zq, pq = viz(Z, dx, dy, -1e9), viz(P, dx, dy, -1)
                oc += ((zq > Z + 0.25) & (pq != P)) / r
        ao = 1 - np.clip(oc * 0.05, 0, 0.42)
        # sombra projetada (luz do alto à esquerda)
        sombra = np.zeros((h, w))
        for (dx, dy, k) in ((-1, -1, 0.5), (-1, -2, 0.5), (-2, -2, 0.4), (-2, -3, 0.35), (-3, -4, 0.25), (0, -2, 0.3)):
            zq, pq = viz(Z, dx, dy, -1e9), viz(P, dx, dy, -1)
            sombra = np.maximum(sombra, ((zq > Z + 0.25) & (pq != P)) * k)
        sombra = np.clip(sombra, 0, 0.6)

        N = self.N
        dif = np.clip((N * LUZ).sum(-1), 0, 1) * (1 - sombra)
        rim = np.clip((N * RIM).sum(-1), 0, 1) ** 1.6 * (1 - sombra * 0.5)
        esp = np.clip((N * MEIO).sum(-1), 0, 1) ** 24 * (1 - sombra)
        out = np.zeros((h, w, 3))
        idx_final = np.zeros((h, w), int)
        brilho_buf = np.zeros((h, w, 3))
        for mi, nome in enumerate(NOMES_MAT):
            m = self.mat == mi
            if not m.any():
                continue
            M = MATS[nome]
            n = len(M.rampa)
            if M.emite:
                I = np.clip(self.tom[m], 0, 1)
            else:
                I = (M.amb + M.kd * dif[m]) * ao[m] + self.tom[m] + self.tex[m] * M.tex
                if M.brilho:
                    # metal: reflexo do ambiente (céu claro em cima, horizonte escuro, chão médio)
                    ny = N[..., 1][m]
                    env = 0.62 - 0.42 * ny - 0.42 * np.exp(-((ny + 0.12) / 0.2) ** 2)
                    I = I * 0.5 + env * 0.55 * ao[m] + self.tom[m] * 0.5
            idx = np.clip(np.floor(I * (n - 1) + 0.5), 0, n - 1).astype(int)
            cor = M.rampa[idx].copy()
            if not M.emite:
                rb = np.floor(rim[m] * M.rim * 3.2) / 3.2
                cor += (COR_RIM - cor) * np.clip(rb, 0, 1)[:, None] * 0.55
                if M.brilho:
                    eb = np.floor(esp[m] * 3) / 3 * M.brilho
                    cor += (np.array([1.0, 0.98, 0.92]) - cor) * eb[:, None] * 0.85
            else:
                brilho_buf[m] = cor * M.bloom
            out[m] = cor
            idx_final[m] = idx
        # luzes pontuais (lanterna, velas, fogueira, órbitas), em faixas
        if self.luzes:
            soma = np.zeros((h, w, 3))
            for (lx, ly, lz, lc, lr, lf) in self.luzes:
                vx, vy, vz = lx - self.X, ly - self.Y, np.full((h, w), float(lz))
                dist = np.sqrt(vx * vx + vy * vy + vz * vz) + 1e-6
                lam = np.clip((N[..., 0] * vx + N[..., 1] * vy + N[..., 2] * vz) / dist, 0, 1)
                at = np.clip(1 - dist / lr, 0, 1) ** 1.5
                k = np.floor(lam * at * lf * 5) / 5
                soma += k[..., None] * lc
            resp_luz = np.array([0.0 if MATS[nm].emite else MATS[nm].luz_pontual for nm in NOMES_MAT] + [0.0])[self.mat]
            fator = np.where(cheio, resp_luz, 0.0)[..., None]
            out = out + soma * fator * (0.35 + out)
        # linhas internas: a peça de trás ganha um traço escuro onde a da frente começa
        cont = np.zeros((h, w), bool)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            zq, pq = viz(Z, dx, dy, -1e9), viz(P, dx, dy, -1)
            sc = viz(self.sem_contorno, dx, dy, True)
            cont |= cheio & (zq > Z + 0.25) & (pq != P) & (pq >= 0) & ~sc
        cont &= ~self.sem_contorno
        mc = np.zeros((h, w, 3))
        for mi, nome in enumerate(NOMES_MAT):
            mc[self.mat == mi] = MATS[nome].contorno
        out = np.where(cont[..., None], out * 0.35 + mc * 0.65, out)
        # contorno externo de 1 pixel (um pouco mais claro do lado da luz)
        alfa = cheio.astype(float)
        borda = np.zeros((h, w), bool)
        cor_b = np.zeros((h, w, 3))
        melhor = np.full((h, w), -1e9)
        for dx, dy, luzlado in ((1, 0, True), (0, 1, True), (-1, 0, False), (0, -1, False)):
            mq = viz(self.mat, dx, dy, -1)
            zq = viz(Z, dx, dy, -1e9)
            scq = viz(self.sem_contorno, dx, dy, True)
            cq = viz(out, dx, dy, 0.0)
            ok = (~cheio) & (mq >= 0) & ~scq & (zq > melhor)
            cm = np.zeros((h, w, 3))
            for mi, nome in enumerate(NOMES_MAT):
                cm[mq == mi] = MATS[nome].contorno
            if luzlado:
                cm = cm * 0.8 + cq * 0.2
            cor_b = np.where(ok[..., None], cm, cor_b)
            melhor = np.where(ok, zq, melhor)
            borda |= ok
        out = np.where(borda[..., None], cor_b, out)
        alfa = np.maximum(alfa, borda)
        # brilho (bloom) das coisas que emitem luz, em faixas e com halo transparente fora do sprite
        if brilho_buf.any():
            b = brilho_buf
            for _ in range(3):
                b = (b + viz(b, 1, 0, 0.0) + viz(b, -1, 0, 0.0) + viz(b, 0, 1, 0.0) + viz(b, 0, -1, 0.0)
                     + viz(b, 1, 1, 0.0) * 0.7 + viz(b, -1, -1, 0.0) * 0.7 + viz(b, 1, -1, 0.0) * 0.7 + viz(b, -1, 1, 0.0) * 0.7) / 7.8
            b = b * 2.6
            inten = b.max(-1)
            faixa = np.floor(np.clip(inten, 0, 1) * 4) / 4
            cor_g = b / (inten[..., None] + 1e-6)
            dentro = alfa > 0
            out = np.where(dentro[..., None], out + cor_g * faixa[..., None] * 0.35, out)
            fora = (~dentro) & (faixa > 0)
            out = np.where(fora[..., None], cor_g, out)
            alfa = np.where(fora, faixa * 0.55, alfa)
        # efeitos por cima (vapor, faíscas, zz) e a sombra no chão por baixo de tudo
        rgb, a = _sobre(self.fx[..., :3], self.fx[..., 3], out, alfa)
        rgb, a = _sobre(rgb, a, self.fx_sob[..., :3], self.fx_sob[..., 3])
        rgba = np.concatenate([np.clip(rgb, 0, 1), np.clip(a, 0, 1)[..., None]], -1)
        return (rgba * 255 + 0.5).astype(np.uint8)


def _sobre(c1, a1, c2, a2):
    """Composição "over": (c1, a1) por cima de (c2, a2)."""
    a = a1 + a2 * (1 - a1)
    c = (c1 * a1[..., None] + c2 * (a2 * (1 - a1))[..., None]) / (a[..., None] + 1e-9)
    return c, a


# ═══════════════════════════════ o esqueleto: pose e articulações ═══════════════════════════════
@dataclass
class Pose:
    x: float = 0.0                 # deslocamento da raiz (pés)
    y: float = 0.0
    inclina: float = 0.0           # tronco, graus (positivo = horário na tela)
    resp: float = 0.0              # respiração 0..1
    cab: float = 0.0               # inclinação da cabeça
    cab_dx: float = 0.0
    cab_dy: float = 0.0
    vira: float = 0.0              # olhar para os lados (-1 esquerda, 1 direita)
    brilho: float = 1.0            # o brilho fraco no fundo das órbitas (0 = apagado)
    # braços: (braço, antebraço, mão) em graus a partir da vertical para baixo, positivo para fora; e o tipo da mão
    be: tuple = (14.0, 6.0, 4.0, "aberta")
    bd: tuple = (14.0, 6.0, 4.0, "aberta")
    pe: tuple = (9.0, -4.0)        # coxa, perna (esquerda da tela)
    pd: tuple = (9.0, -4.0)
    ze: float = 6.0                # profundidade de cada braço
    zd: float = 6.0
    pano: float = 0.0              # balanço do saiote e da capa
    capa: bool = False
    sombra: bool = True
    olhar: tuple = (0.0, 0.0)      # para onde vai o brilho no fundo das órbitas


def _dir(a, s):
    r = math.radians(a)
    return (s * math.sin(r), math.cos(r))


def _soma(p, d, k):
    return (p[0] + d[0] * k, p[1] + d[1] * k)


@dataclass
class Rig:
    raiz: tuple
    P: tuple
    tronco: Quadro2D
    cab: Quadro2D
    j: dict = field(default_factory=dict)   # articulações por nome
    ang_mao: dict = field(default_factory=dict)


def montar(p: Pose) -> Rig:
    raiz = (48 + p.x, 123 + p.y)
    P = (raiz[0], raiz[1] - 22)
    tr = Quadro2D(P, p.inclina)
    pesc = tr.p(0, -28.4 - p.resp * 0.5)
    piv = (pesc[0] + p.cab_dx, pesc[1] + p.cab_dy)
    ang_c = p.inclina + p.cab
    cab = Quadro2D(Quadro2D(piv, ang_c).p(0, DESCE_CRANIO), ang_c)
    r = Rig(raiz, P, tr, cab)
    for lado, s, (a1, a2, a3, _) in (("e", -1, p.be), ("d", 1, p.bd)):
        om = tr.p(s * 10.2, -22.8 - p.resp * 0.7)
        co = _soma(om, _dir(a1 - s * p.inclina, s), 8.2)
        pu = _soma(co, _dir(a2 - s * p.inclina, s), 7.4)
        dm = _dir(a3 - s * p.inclina, s)
        pa = _soma(pu, dm, 2.3)
        r.j.update({f"ombro_{lado}": om, f"cotovelo_{lado}": co, f"punho_{lado}": pu, f"palma_{lado}": pa})
        r.ang_mao[lado] = math.degrees(math.atan2(dm[1], dm[0])) - 90   # ângulo para Quadro2D (+y = dedos)
    for lado, s, (a1, a2) in (("e", -1, p.pe), ("d", 1, p.pd)):
        qd = (P[0] + s * 4.2, P[1] + 1.6)
        jo = _soma(qd, _dir(a1, s), 8.3)
        to = _soma(jo, _dir(a2, s), 7.8)
        r.j.update({f"quadril_{lado}": qd, f"joelho_{lado}": jo, f"tornozelo_{lado}": to})
    r.j["pescoco"] = pesc
    return r


def mao_quadro(r: Rig, lado: str, extra=0.0) -> Quadro2D:
    return Quadro2D(r.j[f"palma_{lado}"], r.ang_mao[lado] + extra)


# ─────────── ossos ───────────
def osso_longo(t: Tela, a, b, r, z, pid, nos=(1.35, 1.25), sem=1):
    """Osso longo com as pontas em nó (epífises com dois côndilos)."""
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    px, py = -math.sin(ang), math.cos(ang)
    f = capsula(a, b, r)
    for (c, k) in ((a, nos[0]), (b, nos[1])):
        rr = r * k * 0.82
        f = f.suave(circulo((c[0] + px * r * 0.55, c[1] + py * r * 0.55), rr), 0.8)
        f = f.suave(circulo((c[0] - px * r * 0.55, c[1] - py * r * 0.55), rr), 0.8)
    q = Quadro2D(a, math.degrees(ang) - 90)
    t.pinta(f, "osso", z, R=r * 1.25, pid=pid, uv=q.uv(), semente=sem)


def mao(t: Tela, r: Rig, lado: str, tipo: str, z: float):
    s = -1 if lado == "e" else 1
    q = mao_quadro(r, lado)
    pid = f"mao_{lado}"
    t.pinta(q.forma(elipse((0, -0.3), 2.1, 2.0)), "osso", z, R=2.0, pid=pid, uv=q.uv(), semente=31)
    if tipo == "aberta":
        for k, (dx, ln) in enumerate(((-1.6, 3.3), (-0.4, 3.9), (0.8, 3.7), (1.9, 3.0))):
            base = (dx * 0.8, 1.0)
            ponta = (dx * 1.25, 1.0 + ln)
            t.pinta(q.forma(traco([base, ((base[0] + ponta[0]) / 2, (base[1] + ponta[1]) / 2 + 0.2), ponta], [0.62, 0.55, 0.62])),
                    "osso", z + 0.05, R=0.8, pid=pid, uv=q.uv(), semente=32 + k)
        pol = -s
        t.pinta(q.forma(traco([(pol * 1.4, -0.4), (pol * 3.0, 1.0), (pol * 3.5, 2.6)], [0.7, 0.6, 0.62])), "osso", z + 0.05, R=0.8, pid=pid)
    elif tipo == "punho":
        # dedos fechados: uma fileira de nós por cima do que a mão segura
        for k, dx in enumerate((-1.7, -0.55, 0.6, 1.75)):
            t.pinta(q.forma(elipse((dx, 1.9), 0.75, 1.15)), "osso", z + 0.6, R=0.9, pid=pid + "_dedos", semente=40 + k)
        t.pinta(q.forma(capsula((-s * 1.6, 0.0), (-s * 0.6, 2.3), 0.7)), "osso", z + 0.65, R=0.8, pid=pid + "_dedos")
    elif tipo == "pinca":
        t.pinta(q.forma(traco([(0.2, 1.0), (0.6, 3.2), (-0.2, 4.0)], 0.6)), "osso", z + 0.6, R=0.8, pid=pid + "_dedos")
        t.pinta(q.forma(traco([(-s * 1.4, -0.2), (-s * 1.0, 2.4), (-0.3, 3.6)], 0.62)), "osso", z + 0.6, R=0.8, pid=pid + "_dedos")
        for dx in (1.0, 1.9):
            t.pinta(q.forma(capsula((dx * s * -0 + dx, 1.0), (dx * 1.1, 2.7), 0.55)), "osso", z + 0.1, R=0.7, pid=pid)


def braco(t: Tela, r: Rig, p: Pose, lado: str):
    s = -1 if lado == "e" else 1
    z = p.ze if lado == "e" else p.zd
    tipo = (p.be if lado == "e" else p.bd)[3]
    om, co, pu = r.j[f"ombro_{lado}"], r.j[f"cotovelo_{lado}"], r.j[f"punho_{lado}"]
    t.pinta(circulo(om, 2.35), "osso", z - 0.05, R=2.3, pid=f"umero_{lado}")
    osso_longo(t, om, co, 1.45, z, f"umero_{lado}", nos=(1.2, 1.3), sem=11 if s < 0 else 12)
    # rádio e ulna: dois ossos finos lado a lado
    ang = math.atan2(pu[1] - co[1], pu[0] - co[0])
    px, py = -math.sin(ang), math.cos(ang)
    for k, (off, rr) in enumerate(((0.75, 0.72), (-0.75, 0.62))):
        a = (co[0] + px * off * 0.6, co[1] + py * off * 0.6)
        b = (pu[0] + px * off, pu[1] + py * off)
        t.pinta(capsula(a, b, rr, rr + 0.1), "osso", z + 0.2, R=1.0, pid=f"antebraco_{lado}", semente=13 + k)
    t.pinta(circulo(co, 1.7), "osso", z + 0.25, R=1.8, pid=f"antebraco_{lado}", semente=15)
    mao(t, r, lado, tipo, z + 0.4)


def perna(t: Tela, r: Rig, p: Pose, lado: str):
    s = -1 if lado == "e" else 1
    qd, jo, to = r.j[f"quadril_{lado}"], r.j[f"joelho_{lado}"], r.j[f"tornozelo_{lado}"]
    osso_longo(t, qd, jo, 1.55, 2.0, f"femur_{lado}", nos=(1.3, 1.35), sem=21 if s < 0 else 22)
    t.pinta(circulo((jo[0] + s * 0.2, jo[1] - 0.2), 1.25), "osso", 2.1, R=1.4, pid=f"patela_{lado}")
    osso_longo(t, jo, to, 1.35, 1.8, f"tibia_{lado}", nos=(1.35, 1.2), sem=23 if s < 0 else 24)
    # pé: calcanhar e cinco dedos curtos
    c = (to[0] + s * 1.3, to[1] + 2.4)
    t.pinta(elipse(c, 3.3, 1.9), "osso", 2.6, R=1.8, pid=f"pe_{lado}", semente=25)
    for k in range(4):
        x = c[0] + s * (-1.6 + k * 1.3)
        t.pinta(capsula((x, c[1] + 0.2), (x + s * 0.25, c[1] + 1.9), 0.55), "osso", 2.7, R=0.7, pid=f"dedo_pe_{lado}", semente=26 + k)


# Modelo do rosto (30/10/2026, o Tales escolhe entre modelos): ROSTO=<nome> python3 scripts/gerar_mascote.py
ROSTO = os.environ.get("ROSTO", "tres_quartos")   # o Tales escolheu o "modelo E" em 31/10/2026
DESCE_CRANIO = {"tres_quartos": -21.0, "frente_liso": -22.0, "frente_redondo": -25.0}.get(ROSTO, -26.5)


def cranio(t: Tela, r: Rig, p: Pose, sob_capuz=False):
    q = r.cab
    uv = q.uv()
    v = p.vira
    # calota comum a todos os modelos, com a rachadura no alto à direita
    calota = elipse((0, -6.5), 25.0, 20.5)
    frente = ROSTO != "tres_quartos"
    if ROSTO == "tres_quartos":
        rosto = elipse((-5.5 + v * 0.8, 8.5), 19.5, 10.0)
        f = calota.suave(rosto, 6.0)
    elif ROSTO == "frente_liso":
        rosto = elipse((v * 0.8, 7.5), 22.0, 11.5)
        macas = circulo((-22.0 + v * 1.2, 11.0), 3.2) | circulo((22.0 + v * 1.2, 11.0), 3.2)
        f = calota.suave(rosto, 5.0).suave(macas, 2.0)
    else:
        rosto = elipse((v * 0.8, 7.0), 23.0, 11.0)
        rm = 1.8 if ROSTO == "frente_redondo" else 3.4
        macas = circulo((-22.6 + v * 1.2, 12.0), rm) | circulo((22.6 + v * 1.2, 12.0), rm)
        maxila = (caixa((0.4 + v * 1.4, 20.6), 9.0, 4.8, r=3.0) if ROSTO == "frente_redondo"
                  else caixa((0.4 + v * 1.4, 21.4), 13.6 if ROSTO != "frente_pequeno" else 11.0, 5.6, r=3.2))
        f = calota.suave(rosto, 5.0).suave(macas, 2.0).suave(maxila, 2.6)
    t.pinta(q.forma(f), "osso", 8.0, R=13.0, pid="cranio", uv=uv, semente=51)
    for sx in (-1, 1):
        t.pinta(q.forma(elipse((sx * 21.0 + v * 0.6, 1.0), 3.4, 7.0)), "osso", 0, sobre="cranio", tom=-0.12, uv=uv, semente=51, normal=False)
        if ROSTO in ("frente_dentes", "frente_pequeno", "frente_brilho", "frente_redondo"):
            t.pinta(q.forma(elipse((sx * 16.8 + v * 1.3, 17.6), 3.0, 2.6)), "osso", 0, sobre="cranio", tom=-0.16, uv=uv, semente=51, normal=False)
    t.pinta(q.forma(elipse((-7 + v, -16.0), 8.0, 5.5)), "osso", 0, sobre="cranio", tom=0.05, uv=uv, semente=51, normal=False)
    rach = [(9.5, -25.6), (10.6, -22.8), (9.4, -20.6), (12.2, -18.0), (11.6, -15.6), (13.8, -13.4)]
    t.pinta(q.forma(traco([(x + 0.7, y + 0.7) for x, y in rach], 0.5)), "osso", 0, sobre="cranio", tom=0.16, uv=uv, semente=51, normal=False)
    t.pinta(q.forma(traco(rach, 0.55)), "orbita", 0, sobre="cranio", R=-1, tom=0.25)
    t.pinta(q.forma(capsula((12.2, -18.0), (14.8, -19.4), 0.45)), "orbita", 0, sobre="cranio", R=-1, tom=0.25)

    if not frente:
        # três-quartos para a esquerda: órbita grande com aro claro e a estreita na borda; nariz embaixo à esquerda
        ox = v * 2.0
        grande = elipse((0.6 + ox, 3.0), 8.0, 7.6, ang=-8)
        t.pinta(q.forma(elipse((0.6 + ox, 3.0), 9.9, 9.4, ang=-8) - grande), "osso", 0, sobre="cranio", tom=0.12, uv=uv, semente=51, normal=False)
        lateral = elipse((-19.6 + ox, 3.6), 4.2, 5.9, ang=6) & f
        for orb in (grande, lateral):
            t.pinta(q.forma(orb), "orbita", 8.01, R=-3.5, pid="cranio", tom=0.0, uv=uv)
        t.pinta(q.forma(elipse((1.4 + ox, 4.6), 5.6, 4.8, ang=-8)), "orbita", 0, sobre="cranio", tom=0.18, normal=False)
        t.pinta(q.forma(elipse((-19.0 + ox, 5.0), 2.4, 3.6)), "orbita", 0, sobre="cranio", tom=0.14, normal=False)
        nz = (-11.0 + v * 2.4, 11.6)
        nariz = poligono([(nz[0] - 2.2, nz[1] - 1.4), (nz[0] + 2.2, nz[1] - 1.4), (nz[0], nz[1] + 2.0)]).suave(circulo((nz[0], nz[1] - 0.8), 1.5), 0.6)
        t.pinta(q.forma(nariz), "orbita", 8.01, R=-1.2, pid="cranio", tom=0.05)
        t.pinta(q.forma(elipse((v * 1.0, 19.0), 14.0, 2.4)), "osso", 0, sobre="cranio", tom=-0.1, uv=uv, semente=51, normal=False)
    else:
        # de frente: órbitas ovais em pé (menores no modelo "pequeno"), nariz de duas fendas
        rx, ry = {"frente_pequeno": (6.2, 8.0), "frente_redondo": (7.6, 7.8)}.get(ROSTO, (7.4, 9.6))
        for sx in (-1, 1):
            cx = sx * {"frente_pequeno": 11.4, "frente_redondo": 10.6}.get(ROSTO, 12.0) + v * 2.2
            orb = elipse((cx, 4.6 if ROSTO == "frente_redondo" else 4.2), rx * (1 - 0.1 * v * sx), ry, ang=sx * 8)
            if ROSTO == "frente_redondo":
                # órbitas redondas e bem pretas, como nas referências do ceifador e do esqueleto da picareta
                t.pinta(q.forma(orb), "orbita", 8.01, R=-3.5, pid="cranio", tom=-0.35, uv=uv)
                continue
            t.pinta(q.forma(orb), "orbita", 8.01, R=-3.5, pid="cranio", tom=0.0, uv=uv)
            t.pinta(q.forma(elipse((cx + sx * 0.4, 5.6), rx * 0.68, ry * 0.69, ang=sx * 8)), "orbita", 0, sobre="cranio", tom=0.12, normal=False)
            if ROSTO == "frente_brilho":
                # um pontinho de luz no alto de cada órbita
                gx, gy = cx - 2.2, 0.6
                t.pinta(q.forma(circulo((gx, gy), 1.25)), "brilho", 8.03, pid="cranio", tom=0.9, sem_contorno=True)
        if ROSTO == "frente_redondo":
            # nariz pequeno em coração invertido
            nz = (v * 2.4, 12.4)
            nariz = (circulo((nz[0] - 1.1, nz[1] - 0.6), 1.25) | circulo((nz[0] + 1.1, nz[1] - 0.6), 1.25)) | poligono([(nz[0] - 2.3, nz[1] - 0.3), (nz[0] + 2.3, nz[1] - 0.3), (nz[0], nz[1] + 2.0)])
            t.pinta(q.forma(nariz), "orbita", 8.01, R=-1.0, pid="cranio", tom=-0.2)
        else:
            for sx in (-1, 1):
                t.pinta(q.forma(elipse((sx * 1.5 + v * 2.4, 11.4), 0.95, 2.4, ang=sx * -10)), "orbita", 8.01, R=-1.0, pid="cranio", tom=0.05)
        if ROSTO == "frente_liso":
            # sem dentes: só a sombra da curva de baixo do rosto
            t.pinta(q.forma(elipse((v * 1.0, 17.8), 13.0, 2.4)), "osso", 0, sobre="cranio", tom=-0.1, uv=uv, semente=51, normal=False)
        else:
            # uma fileira só de dentes grandes e claros, separados por traços encaixados na grade de pixels
            bx = 0.4 + v * 1.4
            meia = {"frente_pequeno": 8.0, "frente_redondo": 6.6}.get(ROSTO, 10.6)
            n = {"frente_pequeno": 5, "frente_redondo": 5}.get(ROSTO, 7)
            passo = 2 * meia / n
            t.pinta(q.forma(traco(bezier((bx - meia - 0.4, 18.8), (bx, 18.0), (bx + meia + 0.4, 18.8), 9), 0.55)), "orbita", 0, sobre="cranio", tom=0.2)
            t.pinta(q.forma(traco(bezier((bx - meia + 0.2, 22.6), (bx, 24.2), (bx + meia - 0.2, 22.6), 9), 0.55)), "orbita", 0, sobre="cranio", tom=0.2)
            t.pinta(q.forma(elipse((bx, 20.0), meia + 3.4, 5.4)), "osso", 0, sobre="cranio", tom=0.1, uv=uv, semente=51, normal=False)
            t.pinta(q.forma(caixa((bx, 20.9), meia, 1.8, r=0.6)), "osso", 0, sobre="cranio", tom=0.26, uv=uv, semente=51, normal=False)
            for i in range(1, n):
                # cada traço é uma coluna de 1 pixel encaixada na grade (não some quando a cabeça inclina)
                x = bx - meia + i * passo
                (x0, y0), (_, y1) = q.p(x, 19.6), q.p(x, 22.4 + 0.6 * (1 - abs(i - n / 2) / (n / 2)))
                cx_, ya, yb = round(x0) + 0.5, round(y0), round(y1)
                t.pinta(caixa((cx_, (ya + yb) / 2 + 0.5), 0.5, max(1.0, (yb - ya) / 2)), "orbita", 8.4, R=0.3, pid="dentes", sem_contorno=True, tom=0.28)
    if sob_capuz:
        # sombra do capuz no alto do crânio
        def sombra_capuz(X, Y):
            _, vv = uv(X, Y)
            return -0.62 * np.clip((4.0 - vv) / 20.0, 0, 1) ** 0.8
        t.pinta(q.forma(semiplano((0, 6), (0, 1))), "osso", 0, sobre="cranio", tom=sombra_capuz, normal=False)


def tronco(t: Tela, r: Rig, p: Pose):
    q = r.tronco
    uv = q.uv()
    # interior escuro da caixa torácica, com a coluna aparecendo atrás
    inter = elipse((0, -16.2), 9.0, 8.0) - elipse((0, -7.0), 4.0, 4.6)
    t.pinta(q.forma(inter), "interior", 3.5, R=-4.0, pid="torax", uv=uv)
    for k in range(6):
        y = -23.2 + k * 2.6
        t.pinta(q.forma(caixa((0, y), 1.6, 1.0, r=0.6)), "osso", 3.8, R=1.2, pid="coluna_t", tom=-0.18 - 0.02 * k, uv=uv, semente=60 + k)
    # coluna lombar (aparece entre as costelas e o cinto)
    for k, y in enumerate((-9.6, -7.0, -4.4)):
        t.pinta(q.forma(caixa((0, y), 2.4, 1.05, r=0.7) | caixa((0, y), 3.6, 0.45, r=0.4)), "osso", 4.0, R=1.4, pid=f"lombar{k}", uv=uv, semente=66 + k)
    # costelas: arcos que saem do esterno, sobem um pouco e descem pelos lados
    larg = (7.6, 9.3, 9.8, 9.4)
    for i, w in enumerate(larg):
        y0 = -22.4 + i * 3.25 + p.resp * (-0.25 + i * 0.12)
        for s in (-1, 1):
            pts = bezier((s * 1.6, y0 + 0.4), (s * w * 0.78, y0 - 2.4), (s * w, y0 + 3.2), 9)
            pts.append((s * (w - 0.9), y0 + 4.6))
            t.pinta(q.forma(traco(pts, [0.95] * 8 + [0.85, 0.7])), "osso", 4.5, R=1.1, pid="costelas", uv=uv, semente=70 + i)
    for s in (-1, 1):   # costela flutuante
        t.pinta(q.forma(traco([(s * 6.0, -10.6), (s * 8.0, -11.0), (s * 8.8, -9.6)], 0.75)), "osso", 4.45, R=1.0, pid="costelas", uv=uv, semente=75)
    # esterno e clavículas
    t.pinta(q.forma(capsula((0, -23.6), (0, -12.0), 1.35, 1.0) | elipse((0, -23.0), 2.4, 1.8) | circulo((0, -11.0), 0.8)), "osso", 4.7, R=1.5, pid="esterno", uv=uv, semente=77)
    for s in (-1, 1):
        t.pinta(q.forma(traco(bezier((s * 1.8, -24.6), (s * 6.0, -26.6), (s * 10.0, -23.6), 7), 0.85)), "osso", 4.8, R=1.0, pid=f"clavicula{s}", uv=uv, semente=78)
    # vértebras do pescoço (aparecem entre o crânio redondo e as clavículas)
    for k, y in enumerate((-31.0, -29.2, -27.4, -25.6)):
        t.pinta(q.forma(caixa((0, y), 1.9, 0.75, r=0.5)), "osso", 7.0, R=1.0, pid=f"cervical{k}", uv=uv, semente=79)
    # pelve (quase toda sob o cinto e o saiote)
    pel = elipse((-4.6, 0.8), 4.8, 3.6, 20).suave(elipse((4.6, 0.8), 4.8, 3.6, -20), 1.5).suave(caixa((0, 2.0), 2.4, 3.0, r=1.2), 1.0)
    t.pinta(Quadro2D(r.P).forma(pel), "osso", 3.0, R=2.5, pid="pelve", semente=80)


# ─────────── armadura leve ───────────
def armadura(t: Tela, r: Rig, p: Pose, capa=False):
    q = r.tronco
    uv = q.uv()
    # correia de couro em diagonal, do ombro esquerdo (da tela) ao quadril direito, com pespontos e fivelinha
    cor = [(-9.2, -23.6), (-4.0, -16.0), (2.0, -9.0), (7.8, -2.6)]
    t.pinta(q.forma(traco(cor, 1.45)), "couro", 5.0, R=1.3, pid="correia", uv=uv, semente=90)
    for k in range(9):
        a = k / 8
        x = -9.2 + (7.8 + 9.2) * a
        y = -23.6 + (21.0) * a
        if k % 2 == 0:
            t.pinta(q.forma(circulo((x + 0.6, y - 0.5), 0.45)), "couro", 0, sobre="correia", tom=0.3)
    t.pinta(q.forma(caixa((-1.0, -12.4), 1.7, 1.5, r=0.4, ang=48) - caixa((-1.0, -12.4), 0.7, 0.6, ang=48)), "latao", 5.1, R=0.9, pid="fivela_c")
    # cinto com fivela grande
    t.pinta(q.forma(caixa((0, -1.6), 9.4, 1.75, r=0.8)), "couro", 5.3, R=1.4, pid="cinto", uv=uv, semente=91,
            relevo=lambda X, Y: (0.0, 0.0))
    for x in (-6.5, -3.5, 4.5, 7.2):
        t.pinta(q.forma(circulo((x, -1.6), 0.55)), "aco", 0, sobre="cinto", tom=0.25, R=0.6)
    fiv = caixa((0.8, -1.6), 2.6, 2.3, r=0.6) - caixa((0.8, -1.6), 1.3, 1.0, r=0.3)
    t.pinta(q.forma(fiv), "latao", 5.6, R=1.0, pid="fivela", uv=uv)
    t.pinta(q.forma(capsula((0.6, -2.6), (0.6, -0.6), 0.4)), "aco", 5.65, R=0.5, pid="fivela_pino", sem_contorno=True)
    # saiote de pano vermelho esfarrapado: três abas com franjas e rasgos, balançando
    ondas = p.pano
    for k, (cx, w, comp) in enumerate(((-6.0, 4.6, 11.0), (0.6, 4.4, 12.5), (6.6, 4.6, 10.6))):
        fase = ondas + k * 1.7
        bal = math.sin(fase) * 0.9
        topo = -0.2
        pts = [(cx - w, topo), (cx + w, topo)]
        nb = 6
        for i in range(nb + 1):
            a = 1 - i / nb
            x = cx - w * 1.15 + 2 * w * 1.15 * a + bal
            h = comp + (1.6 if i % 2 == 0 else -0.6) + math.sin(i * 2.3 + k) * 0.9 + math.sin(fase * 1.3 + i) * 0.5
            pts.append((x, topo + h))
        aba = poligono(pts)
        # rasgos
        aba = aba - elipse((cx + 1.2 + bal * 0.5, comp * 0.62), 0.9, 1.4) if k == 1 else aba
        dobras = lambda X, Y, cx=cx, fase=fase: (0.28 * np.sin((X - r.P[0] - cx) * 1.35 + fase * 0.4), 0.0 * X)
        t.pinta(q.forma(aba), "pano", 5.2 + (0.05 if k == 1 else 0), R=1.6, pid=f"saia{k}", uv=uv, relevo=dobras, semente=95 + k,
                tom=lambda X, Y: -0.12 * np.clip((Y - (r.P[1] + 2)) / 10, 0, 1))
    # braçadeira de couro com faixa de aço no antebraço direito (da tela)
    co, pu = r.j["cotovelo_d"], r.j["punho_d"]
    a = (co[0] + (pu[0] - co[0]) * 0.3, co[1] + (pu[1] - co[1]) * 0.3)
    b = (co[0] + (pu[0] - co[0]) * 0.92, co[1] + (pu[1] - co[1]) * 0.92)
    zb = p.zd + 0.32
    t.pinta(capsula(a, b, 1.7, 2.0), "couro", zb, R=1.6, pid="bracadeira", semente=97)
    for k in (0.3, 0.75):
        m = (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)
        ang = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))
        t.pinta(caixa(m, 0.6, 2.25, r=0.3, ang=ang), "aco", zb + 0.02, R=0.8, pid="bracadeira_faixa", sem_contorno=True)
    if capa:
        return   # a ombreira fica por baixo da capa
    # ombreira de aço redonda, amassada, com rebites, ferrugem e arranhões, no ombro esquerdo (da tela)
    om = r.j["ombro_e"]
    a1 = p.be[0]
    qo = Quadro2D((om[0] - 1.6, om[1] - 0.4), -(a1 - 14) * 0.35 + 12 + p.inclina * 0.5)
    uvo = qo.uv()
    # lâmina de baixo (escalonada) e a cúpula com aba
    t.pinta(qo.forma(elipse((0.4, 4.4), 7.4, 2.5)), "aco", p.ze + 0.55, R=2.0, pid="ombreira2", uv=uvo, semente=101, tom=-0.1)
    dom = elipse((0, 0.6), 8.4, 4.9)
    t.pinta(qo.forma(dom), "aco", p.ze + 0.6, R=6.5, pid="ombreira", semente=102, uv=uvo)
    # aba (borda virada) clara em cima, sombra embaixo
    t.pinta(qo.forma(dom - elipse((0, 0.0), 7.0, 3.7)), "aco", 0, sobre="ombreira", tom=0.1, normal=False)
    t.pinta(qo.forma(elipse((0, 4.6), 8.4, 1.6)), "aco", 0, sobre="ombreira", tom=-0.2, normal=False)
    # amassado: côncavo, com o lado de baixo claro
    t.pinta(qo.forma(elipse((-2.4, 0.2), 1.6, 1.2)), "aco", 0, sobre="ombreira", R=-1.4, uv=uvo, semente=102)
    for (x, y) in ((-5.4, 2.4), (0.0, 3.6), (5.4, 2.4)):
        t.pinta(qo.forma(circulo((x, y), 0.65)), "aco", 0, sobre="ombreira", R=0.7, tom=0.12)
    for (x, y, rr) in ((4.2, -1.6, 0.8), (-5.6, 3.8, 0.6), (2.0, 3.0, 0.45)):
        t.pinta(qo.forma(circulo((x, y), rr)), "ferrugem", 0, sobre="ombreira", R=0.8)
    t.pinta(qo.forma(capsula((-3.6, -2.8), (0.6, -3.6), 0.32)), "aco", 0, sobre="ombreira", tom=0.3, normal=False)
    t.pinta(qo.forma(capsula((2.6, 0.4), (5.2, -1.0), 0.3)), "aco", 0, sobre="ombreira", tom=-0.3, normal=False)
    # tira que prende a ombreira e corre para a correia
    t.pinta(qo.forma(traco([(3.0, 2.0), (6.0, 4.0)], 0.9)), "couro", p.ze + 0.58, R=0.9, pid="tira_ombreira")


def sombra_chao(t: Tela, r: Rig, larg=15.0):
    cx, cy = r.raiz[0], r.raiz[1] + 0.2
    for y in range(int(cy) - 3, int(cy) + 3):
        for x in range(int(cx - larg - 2), int(cx + larg + 3)):
            d = ((x + 0.5 - cx) / larg) ** 2 + ((y + 0.5 - cy) / 2.6) ** 2
            if d < 1:
                t.ponto_fx(x, y, "#0c0710", 0.42 if d < 0.45 else 0.26, sob=True)


def esqueleto(t: Tela, p: Pose, extras=None) -> Rig:
    r = montar(p)
    t.origem = r.raiz
    if p.sombra:
        sombra_chao(t, r)
    for lado in ("e", "d"):
        perna(t, r, p, lado)
    tronco(t, r, p)
    for lado in ("e", "d"):
        braco(t, r, p, lado)
    armadura(t, r, p, p.capa)
    if p.capa:
        capa(t, r, p)
    cranio(t, r, p, sob_capuz=p.capa)
    if extras:
        extras(t, r)
    return r


# ─────────── capa de Halloween com capuz ───────────
def _barra_rasgada(x0, x1, y, n, fase, seed, amp=2.2):
    """Pontos da barra esfarrapada, da direita para a esquerda (para fechar polígonos)."""
    rng = np.random.default_rng(seed)
    alt = rng.uniform(-1, 1, n + 1)
    pts = []
    for i in range(n + 1):
        a = 1 - i / n
        x = x0 + (x1 - x0) * a
        yy = y + (amp if i % 2 == 0 else -amp * 0.5) + alt[i] * amp * 0.6 + math.sin(fase + i * 1.3) * 0.7
        pts.append((x + math.sin(fase * 0.7 + i) * 0.4, yy))
    return pts


def _dobras(cx, freq, amp, fase):
    return lambda X, Y: (amp * np.sin((X - cx) * freq + fase + Y * 0.05), 0.0 * X)


def capa(t: Tela, r: Rig, p: Pose):
    q = r.tronco
    uv = q.uv()
    f = p.pano
    cx = r.P[0]
    # costas da capa (aparece em volta do corpo), em forma de sino
    tras = poligono([(-11.5, -26.0), (11.5, -26.0), (16.5, -6.0), (19.5, 19.0)] + _barra_rasgada(-19.5, 19.5, 20.0, 12, f, 3) + [(-16.5, -6.0)])
    t.pinta(q.forma(tras), "capa", 0.4, R=3.0, pid="capa_tras", uv=uv, relevo=_dobras(cx, 0.9, 0.35, f), tom=-0.16, semente=120)
    # painéis da frente: deixam aberto o meio (costelas, correia, cinto e saiote aparecem)
    for s_ in (-1, 1):
        ext = [(s_ * 2.8, -27.6), (s_ * 12.6, -25.0), (s_ * 15.6, -14.0), (s_ * 18.6, 6.0), (s_ * 19.6, 19.0)]
        barra = _barra_rasgada(s_ * 19.6, s_ * 8.4, 20.2, 5, f + s_, 7 + s_, 2.0)
        if s_ < 0:
            barra = barra[::-1]
            barra = _barra_rasgada(-8.4, -19.6, 20.2, 5, f - 1, 6, 2.0)
        intr = [(s_ * 8.4, 19.0), (s_ * 8.6, 6.0), (s_ * 7.2, -6.0), (s_ * 5.4, -16.0), (s_ * 3.4, -23.0)]
        pts = ext + barra + intr if s_ > 0 else ext + barra + intr
        pai = poligono(pts)
        pai = pai - elipse((s_ * 14.0, 13.0), 1.1, 1.6) - elipse((s_ * 11.2, 16.6), 0.8, 1.2)
        t.pinta(q.forma(pai), "capa", 5.9, R=2.6, pid=f"capa_{s_}", uv=uv, relevo=_dobras(cx + s_ * 3, 1.05, 0.42, f * 0.6 + s_),
                tom=lambda X, Y: -0.1 * np.clip((Y - r.P[1]) / 20, 0, 1), semente=121 + s_)
        # forro escuro aparecendo na beira de dentro
        borda_in = poligono([(s_ * 3.4, -23.0), (s_ * 5.4, -16.0), (s_ * 7.2, -6.0), (s_ * 8.6, 6.0), (s_ * 8.4, 19.6),
                             (s_ * 9.6, 19.6), (s_ * 9.8, 6.0), (s_ * 8.3, -6.0), (s_ * 6.5, -16.0), (s_ * 4.6, -23.5)])
        t.pinta(q.forma(borda_in), "forro", 5.95, R=1.0, pid=f"capa_{s_}", sobre=f"capa_{s_}")
        # manto curto sobre os ombros
        manto = poligono([(s_ * 2.6, -28.4), (s_ * 13.4, -26.0), (s_ * 15.6, -19.0)] + [(s_ * (15.0 - i * 2.3), -18.4 + (1.6 if i % 2 else 0)) for i in range(6)] + [(s_ * 3.2, -21.0)])
        t.pinta(q.forma(manto), "capa", 7.05, R=3.0, pid=f"manto_{s_}", uv=uv, relevo=_dobras(cx, 1.4, 0.3, f), semente=125 + s_)
    # broche que fecha a capa
    t.pinta(q.forma(circulo((0, -24.0), 1.9)), "latao", 7.3, R=1.8, pid="broche")
    t.pinta(q.forma(circulo((0, -24.0), 0.8)), "orbita", 7.35, R=-0.8, pid="broche", sem_contorno=True)
    # mangas largas por cima dos braços (as mãos de osso ficam de fora)
    for lado, s_ in (("e", -1), ("d", 1)):
        om, co, pu = r.j[f"ombro_{lado}"], r.j[f"cotovelo_{lado}"], r.j[f"punho_{lado}"]
        z = (p.ze if lado == "e" else p.zd) + 0.35
        ang = math.atan2(pu[1] - co[1], pu[0] - co[0])
        px, py = -math.sin(ang), math.cos(ang)
        fim = (pu[0] - math.cos(ang) * 0.6, pu[1] - math.sin(ang) * 0.6)
        manga = capsula(om, co, 3.0, 2.9) | capsula(co, fim, 2.9, 3.6)
        boca = poligono([(fim[0] + px * 3.8, fim[1] + py * 3.8), (fim[0] - px * 3.8, fim[1] - py * 3.8),
                         (fim[0] - px * 3.8 + math.cos(ang) * 1.6, fim[1] - py * 3.8 + math.sin(ang) * 1.6),
                         (fim[0] + math.cos(ang) * 2.4, fim[1] + math.sin(ang) * 2.4),
                         (fim[0] + px * 3.8 + math.cos(ang) * 1.4, fim[1] + py * 3.8 + math.sin(ang) * 1.4)])
        t.pinta(manga | boca, "capa", z, R=2.8, pid=f"manga_{lado}", relevo=_dobras(om[0], 1.3, 0.25, f), semente=127)
        t.pinta(circulo(fim, 2.3), "forro", 0, sobre=f"manga_{lado}", R=-1.5)
    # capuz: costas (forro escuro) atrás do crânio e a borda de pano por cima das laterais e do alto
    c = r.cab
    fora = elipse((0, -5.0), 29.0, 25.5).suave(elipse((1.5, -27.0), 6.0, 5.0), 3.0) | poligono([(-28.0, -2.0), (28.0, -2.0), (21.0, 27.0), (-21.0, 27.0)])
    abertura = elipse((0, 3.6), 22.4, 22.0)
    t.pinta(c.forma(fora), "forro", 0.6, R=4.0, pid="capuz_fundo")
    rel_c = lambda X, Y: (0.3 * np.sin((X - c.o[0]) * 0.55 + f), 0.0 * X)
    t.pinta(c.forma(fora - abertura), "capa", 9.0, R=5.0, pid="capuz", uv=c.uv(), relevo=rel_c, semente=130)
    t.pinta(c.forma(abertura.engrossa(1.3) - abertura), "forro", 0, sobre="capuz", R=-1.2)
    t.pinta(c.forma(elipse((-9, -22), 8.0, 4.0)), "capa", 0, sobre="capuz", tom=0.06, normal=False)


# ═══════════════════════════════ objetos ═══════════════════════════════
class _QuadroEsc(Quadro2D):
    """Quadro com escala uniforme (para desenhar um objeto maior sem refazer as medidas)."""

    def __init__(self, o, ang, k):
        super().__init__(o, ang)
        self.k = k

    def p(self, x, y=None):
        if y is None:
            x, y = x
        return super().p(x * self.k, y * self.k)

    def forma(self, fl: Forma) -> Forma:
        g, k = fl.f, self.k
        x0, y0, x1, y1 = fl.bb
        esc = Forma(lambda X, Y: g(X / k, Y / k) * k, (x0 * k, y0 * k, x1 * k, y1 * k))
        return Quadro2D.forma(Quadro2D(self.o, self.ang), esc)

    def uv(self):
        f = Quadro2D(self.o, self.ang).uv()
        return lambda X, Y: tuple(a / self.k for a in f(X, Y))


def _escala(q: Quadro2D, k: float) -> Quadro2D:
    return _QuadroEsc(q.o, q.ang, k)


def espada(t: Tela, q: Quadro2D, z: float):
    """Espada curta e gasta. Origem no meio do cabo; +y aponta para a ponta."""
    q = Quadro2D(q.o, q.ang, 1.0)
    q = _escala(q, 1.3)
    uv = q.uv()
    t.pinta(q.forma(circulo((0, -3.6), 1.35)), "latao", z, R=1.4, pid="espada_pomo")
    t.pinta(q.forma(capsula((0, -2.6), (0, 2.4), 1.0)), "couro", z, R=1.0, pid="espada_cabo", uv=uv, semente=140)
    for y in (-1.6, 0.0, 1.6):
        t.pinta(q.forma(capsula((-1.0, y - 0.5), (1.0, y + 0.3), 0.3)), "couro", 0, sobre="espada_cabo", tom=-0.2, normal=False)
    t.pinta(q.forma(caixa((0, 3.4), 4.2, 0.85, r=0.5) | circulo((-4.0, 3.2), 0.95) | circulo((4.0, 3.2), 0.95)), "aco", z + 0.05, R=1.0, pid="espada_guarda")
    lam = poligono([(-1.7, 4.2), (1.7, 4.2), (1.55, 15.4), (0.0, 18.4), (-1.55, 15.4)])
    lam = lam - circulo((1.9, 9.0), 0.6) - circulo((-1.9, 12.6), 0.55) - circulo((1.8, 13.8), 0.45)
    t.pinta(q.forma(lam), "aco", z - 0.05, R=1.4, pid="espada_lamina", uv=uv, plano=(-0.35, -0.2, 0.9), semente=141)
    t.pinta(q.forma(capsula((0.0, 5.0), (0.0, 14.0), 0.42)), "aco", 0, sobre="espada_lamina", tom=-0.22, normal=False)
    t.pinta(q.forma(capsula((-0.9, 5.0), (-0.9, 14.4), 0.3)), "aco", 0, sobre="espada_lamina", tom=0.22, normal=False)
    for (x, y, rr) in ((0.8, 6.4, 0.55), (-0.6, 10.8, 0.5), (0.7, 15.2, 0.45)):
        t.pinta(q.forma(circulo((x, y), rr).borda(0.25, 1.8, 3)), "ferrugem", 0, sobre="espada_lamina", R=0.6)


def livro(t: Tela, c, ang: float, virar: float, z: float):
    """Livro aberto. virar em 0..1 = a folha da direita passando para a esquerda."""
    q = Quadro2D(c, ang)
    uv = q.uv()
    capa_l = poligono([(-12.4, -3.4), (0, -1.4), (12.4, -3.4), (12.8, 6.4), (0, 8.4), (-12.8, 6.4)])
    t.pinta(q.forma(capa_l), "capa_livro", z, R=1.2, pid="livro_capa", plano=(0, 0.45, 0.9))
    for s_ in (-1, 1):
        pts = bezier((0, -1.6), (s_ * 6, -4.8), (s_ * 11.6, -3.6), 6) + bezier((s_ * 11.9, 5.4), (s_ * 6, 4.6), (0, 7.0), 6)
        t.pinta(q.forma(poligono(pts)), "papel", z + 0.1, R=-2.0 if False else 2.0, pid=f"livro_pag{s_}", plano=(s_ * -0.25, 0.4, 0.88), uv=uv, semente=150)
        for k in range(4):
            y0 = -1.0 + k * 1.75
            x_a, x_b = s_ * 2.2, s_ * (9.6 if k != 3 else 6.0)
            curva = 1.6 - k * 0.15
            t.pinta(q.forma(traco([(x_a, y0 - 0.3), ((x_a + x_b) / 2, y0 - curva), (x_b, y0 - 0.9)], 0.42)), "tinta", 0, sobre=f"livro_pag{s_}", R=0.5)
        # bloco de folhas (espessura) embaixo de cada página
        t.pinta(q.forma(traco(bezier((s_ * 11.9, 5.6), (s_ * 6, 4.8), (0, 7.2), 6), 0.5)), "papel", z + 0.05, R=0.6, pid=f"livro_bloco{s_}", tom=-0.25)
        if s_ < 0:   # figura: um fêmur desenhado na página esquerda, em vermelho
            pass
    t.pinta(q.forma(capsula((0, -1.4), (0, 7.4), 0.45)), "papel", z + 0.15, R=0.5, pid="livro_meio", tom=-0.35)
    t.pinta(q.forma(traco([(0.6, -1.6), (1.2, 3.0), (0.8, 9.6)], 0.45)), "borracha", z + 0.16, R=0.5, pid="livro_fita")
    if 0 < virar < 1:
        # folha virando: comprime no x e sobe
        k = math.cos(virar * math.pi)
        topo = -1.6 - math.sin(virar * math.pi) * 5.0
        pts = [(0, -1.6), (k * 11.0, topo - 1.2), (k * 11.3, topo + 8.0), (0, 7.0)]
        t.pinta(q.forma(poligono(pts)), "papel", z + 0.3, R=1.5, pid="livro_folha", plano=(-k * 0.5, 0.3, 0.8), tom=0.06)


def caneca(t: Tela, q: Quadro2D, z: float, cheia=True):
    """Caneca esmaltada vermelha com borda branca. Origem no centro; alça para +x."""
    q = _escala(q, 1.3)
    uv = q.uv()
    t.pinta(q.forma(traco([(3.0, -2.4), (5.6, -2.0), (5.8, 1.4), (3.0, 1.8)], 0.85)), "caneca", z - 0.1, R=0.9, pid="caneca_alca")
    corpo = caixa((0, 0), 3.4, 4.2, r=1.0)
    t.pinta(q.forma(corpo), "caneca", z, R=3.0, pid="caneca", uv=uv, semente=160)
    t.pinta(q.forma(elipse((0, -4.0), 3.3, 1.1)), "papel", z + 0.05, R=0.8, pid="caneca", tom=0.1)
    t.pinta(q.forma(caixa((0, -3.2), 3.4, 0.45)), "papel", 0, sobre="caneca", R=1.0)
    if cheia:
        t.pinta(q.forma(elipse((0, -3.8), 2.4, 0.7)), "cafe", z + 0.1, R=-0.8, pid="caneca", sem_contorno=True)
    for x, y in ((-1.6, 1.0), (1.2, -1.4), (2.0, 2.6)):   # lascado do esmalte
        t.pinta(q.forma(circulo((x, y), 0.5)), "orbita", 0, sobre="caneca", R=-0.5, tom=0.2)
    t.pinta(q.forma(capsula((-2.3, -2.2), (-2.3, 2.2), 0.35)), "caneca", 0, sobre="caneca", tom=0.3, normal=False)


def vapor(t: Tela, x, y, k, n=3, alt=14):
    """Fios de vapor subindo (efeito, sem contorno)."""
    for j in range(n):
        for i in range(alt):
            fase = (i + k * 2 + j * 5) % alt
            yy = y - fase
            xx = x + (j - 1) * 2.2 + math.sin(fase * 0.55 + j * 2 + k * 0.8) * 1.4
            a = 0.85 * (1 - fase / alt) * (0.55 if (fase + j) % 3 == 0 else 1)
            if a > 0.06:
                t.ponto_fx(xx, yy, "#f2f0ea", a)


def filme_raiox(t: Tela, q: Quadro2D, z: float, luz: float):
    """Filme de raio X de um fêmur, contra a luz. Origem na borda de baixo (onde a mão segura)."""
    t.pinta(q.forma(caixa((0, -13.0), 10.0, 13.0, r=0.8)), "filme", z, R=1.0, pid="filme", tom=0.05 * luz)
    t.pinta(q.forma(caixa((0, -13.0), 8.6, 11.6, r=0.6)), "filme", 0, sobre="filme", tom=0.12 * luz, normal=False)
    # fêmur: cabeça, colo, trocânter, diáfise e côndilos
    fem = (circulo((-4.4, -22.0), 2.2) | capsula((-3.4, -21.0), (-0.4, -19.0), 1.0) | circulo((1.4, -20.6), 1.0)
           | capsula((0.0, -19.6), (1.2, -6.2), 1.25, 1.05) | circulo((-0.1, -4.6), 1.55) | circulo((2.7, -4.8), 1.5))
    medula = capsula((0.3, -17.0), (1.1, -8.2), 0.42)
    t.pinta(q.forma(fem), "raiox", z + 0.05, R=1.0, pid="filme", tom=0.55 + 0.3 * luz, sem_contorno=True)
    t.pinta(q.forma(medula), "raiox", z + 0.06, R=1.0, pid="filme", tom=0.3 + 0.2 * luz, sem_contorno=True)
    # etiqueta e marcador "D"
    t.pinta(q.forma(caixa((-6.0, -2.6), 2.2, 1.0, r=0.2)), "papel", z + 0.05, R=0.6, pid="filme_etq")
    t.pinta(q.forma(caixa((6.4, -23.0), 0.4, 1.1) | caixa((7.0, -23.0), 0.8, 1.1) - caixa((7.0, -23.0), 0.2, 0.5)), "raiox", z + 0.05, pid="filme", tom=0.6, sem_contorno=True)


def osso_pequeno(t: Tela, c, ang, z, pid, sem=0):
    q = _escala(Quadro2D(c, ang), 1.35)
    f = capsula((-3.0, 0), (3.0, 0), 0.85)
    for x in (-3.3, 3.3):
        f = f.suave(circulo((x, -0.9), 1.15), 0.6).suave(circulo((x, 0.9), 1.15), 0.6)
    t.pinta(q.forma(f), "osso", z, R=1.2, pid=pid, uv=q.uv(), semente=170 + sem)


def martelo(t: Tela, q: Quadro2D, z: float):
    """Martelo de reflexo. Origem na mão; o cabo segue +y e a cabeça triangular fica na ponta."""
    t.pinta(q.forma(capsula((0, -1.5), (0, 9.5), 0.65)), "aco", z - 0.1, R=0.8, pid="martelo_cabo")
    cab = poligono([(-4.4, 9.4), (4.4, 9.4), (0.0, 12.6)])
    cab = cab.suave(capsula((-3.4, 10.0), (3.4, 10.0), 0.9), 0.8)
    t.pinta(q.forma(cab), "borracha", z, R=1.6, pid="martelo_cab", uv=q.uv())
    t.pinta(q.forma(caixa((0, 9.4), 1.0, 0.7)), "aco", z + 0.05, R=0.6, pid="martelo_anel")


def espeto(t: Tela, q: Quadro2D, z: float, tostado: float, k: int):
    """Graveto com marshmallow. Origem na mão; o graveto segue -x."""
    t.pinta(q.forma(traco([(1.6, 0.2), (-7, 0.9), (-14, 2.0), (-19.5, 2.9)], [0.75, 0.7, 0.6, 0.5])), "madeira", z - 0.1, R=0.8, pid="espeto", uv=q.uv(), semente=180)
    t.pinta(q.forma(capsula((-9, 1.2), (-10.5, -1.0), 0.4)), "madeira", z - 0.12, R=0.5, pid="espeto")   # galhinho
    mq = Quadro2D(q.p(-21.5, 3.0), q.ang + 8)
    t.pinta(mq.forma(caixa((0, 0), 3.4, 3.0, r=1.4)), "marsh", z, R=2.4, pid="marsh",
            tom=lambda X, Y: -0.5 * tostado * np.clip(1.0 - (X - mq.o[0] + 3.4) / 4.5, 0, 1))
    t.pinta(mq.forma(caixa((-2.6, 0.4), 0.8, 2.4, r=0.6)), "marsh", 0, sobre="marsh", tom=-0.3 * tostado, normal=False)
    # brasas subindo
    for j in range(4):
        fy = ((k * 3 + j * 7) % 22)
        x = mq.o[0] - 3 + math.sin(fy * 0.5 + j) * 2.5 + j * 1.5
        y = mq.o[1] + 18 - fy
        if fy < 20:
            t.ponto_fx(x, y, "#ffd27a" if fy < 8 else "#ff8a3a", 0.9 - fy / 26)


def foice(t: Tela, q: Quadro2D, z: float):
    """Foice: origem na mão; o cabo vai de +12 (baixo) a -76 (alto); a lâmina curva para a esquerda."""
    uv = q.uv()
    t.pinta(q.forma(traco([(0, 24), (0.3, -10), (0.0, -46), (0.6, -72)], [1.05, 1.1, 1.1, 1.0])), "madeira", z - 0.2, R=1.2, pid="foice_cabo", uv=uv, semente=190)
    for y in (-4.0, -40.0, -66.0):
        t.pinta(q.forma(caixa((0.2, y), 1.6, 0.8, r=0.3)), "couro", z - 0.15, R=0.8, pid="foice_tira")
    t.pinta(q.forma(caixa((0.5, -71.0), 1.9, 2.6, r=0.6)), "aco", z - 0.1, R=1.0, pid="foice_colar")
    fora = bezier((1.8, -73.0), (-14.0, -86.0), (-38.0, -66.0), 12)
    dentro = bezier((-38.0, -66.0), (-17.0, -77.5), (0.4, -68.6), 12)
    lam = poligono(fora + dentro)
    lam = lam - circulo((-20.0, -76.0), 0.8) - circulo((-28.0, -72.6), 0.7)
    t.pinta(q.forma(lam), "aco", z - 0.05, R=2.0, pid="foice_lamina", uv=uv, plano=(-0.3, -0.35, 0.88), semente=191)
    fio = bezier((-1.0, -69.8), (-17.0, -78.2), (-35.0, -66.8), 10)
    t.pinta(q.forma(traco(fio, 0.45)), "aco", 0, sobre="foice_lamina", tom=0.45, normal=False)
    for (x, y, rr) in ((-6.0, -78.0, 0.8), (-12.0, -80.0, 0.6), (-2.0, -75.0, 0.6)):
        t.pinta(q.forma(circulo((x, y), rr).borda(0.3, 1.6, 4)), "ferrugem", 0, sobre="foice_lamina", R=0.6)


def lanterna_abobora(t: Tela, q: Quadro2D, z: float, chama: float, k: int):
    """Abóbora entalhada com vela dentro, presa por uma alça de arame. Origem na mão."""
    t.pinta(q.forma(traco(bezier((-6.2, 6.6), (0.0, -3.6), (6.2, 6.6), 9), 0.42)), "aco", z - 0.3, R=0.5, pid="alca")
    c = (0.0, 12.0)
    corpo = elipse(c, 7.6, 6.2).suave(elipse((c[0] - 3.6, c[1] + 0.2), 4.6, 5.8), 1.0).suave(elipse((c[0] + 3.6, c[1] + 0.2), 4.6, 5.8), 1.0)
    gomos = lambda X, Y: (0.45 * np.sin((X - q.o[0]) * 0.85), 0.0 * X)
    t.pinta(q.forma(corpo), "abobora", z, R=4.0, pid="abobora", uv=q.uv(), relevo=gomos, semente=200)
    t.pinta(q.forma(traco([(0.2, 6.4), (0.6, 4.6), (1.8, 3.6)], [1.0, 0.85, 0.6])), "talo", z + 0.1, R=0.9, pid="talo")
    luz = 0.65 + 0.35 * chama
    cara = (poligono([(-4.6, 10.6), (-1.6, 10.6), (-3.1, 8.0)]) | poligono([(1.6, 10.6), (4.6, 10.6), (3.1, 8.0)])
            | poligono([(-0.6, 12.4), (0.6, 12.4), (0.0, 11.2)])
            | poligono([(-5.0, 13.6), (5.0, 13.6), (4.0, 16.2), (2.6, 15.0), (1.4, 16.6), (0, 15.2), (-1.4, 16.6), (-2.6, 15.0), (-4.0, 16.2)]))
    t.pinta(q.forma(cara), "lanterna_luz", z + 0.1, pid="abobora", tom=lambda X, Y: luz - 0.25 * np.clip((Y - q.p(0, 13)[1]) / 4, 0, 1), sem_contorno=True)
    lp = q.p(0.0, 11.0)
    t.luz(lp[0], lp[1], 18.0, "#ff9a3a", 70.0, 1.3 * luz)


def chama(t: Tela, base, alt, k, sem, z):
    """Chama de vela que tremula."""
    bal = math.sin(k * 1.9 + sem) * 0.6
    f = poligono([(base[0] - 1.2, base[1]), (base[0] + 1.2, base[1]), (base[0] + 0.9 + bal * 0.4, base[1] - alt * 0.5), (base[0] + bal, base[1] - alt)]) \
        .suave(circulo((base[0], base[1] - 0.8), 1.25), 0.6)
    cy = base[1]
    t.pinta(f, "chama", z, pid=f"chama{sem}", sem_contorno=True,
            tom=lambda X, Y: np.clip(1.05 - (cy - Y) / (alt * 1.05) * 0.9 - np.abs(X - base[0]) * 0.18, 0.05, 1))


def candelabro(t: Tela, q: Quadro2D, z: float, k: int):
    """Castiçal de latão com três velas. Origem na mão; sobe para -y."""
    uv = q.uv()
    q = _escala(q, 1.3)
    uv = q.uv()
    t.pinta(q.forma(capsula((0, 3.5), (0, -8.5), 0.85) | elipse((0, 4.0), 2.4, 1.1) | circulo((0, -2.0), 1.3)), "latao", z - 0.1, R=1.0, pid="cand_haste", uv=uv)
    braco_c = traco(bezier((-7.0, -11.0), (-6.0, -6.6), (0.0, -7.6), 7), 0.65) | traco(bezier((7.0, -11.0), (6.0, -6.6), (0.0, -7.6), 7), 0.65)
    t.pinta(q.forma(braco_c), "latao", z - 0.05, R=0.8, pid="cand_bracos", uv=uv)
    for i, (x, y, h) in enumerate(((-7.0, -11.6, 5.2), (0.0, -9.6, 6.6), (7.0, -11.6, 4.4))):
        t.pinta(q.forma(elipse((x, y), 2.0, 0.8)), "latao", z, R=0.8, pid=f"cand_copo{i}")
        t.pinta(q.forma(caixa((x, y - h / 2 - 0.4), 1.15, h / 2, r=0.4) | circulo((x + 1.0, y - h + 1.6), 0.5)), "cera", z + 0.05, R=1.2, pid=f"vela{i}")
        tremor = 0.5 + 0.5 * math.sin(k * 2.1 + i * 2.4)
        topo = q.p(x, y - h - 0.6)
        chama(t, topo, 4.2 + tremor * 1.6, k, i, z + 0.2)
        t.luz(topo[0], topo[1] - 2, 22.0, "#ffb050", 60.0, 0.6 + 0.25 * tremor)


def morcego(t: Tela, c, asa: float, olha: int, z: float, nome: str):
    """Morcego pequeno e original: corpo redondo, orelhas pontudas e asas de dedos longos.
    asa em -1..1 (baixo..cima)."""
    q = _escala(Quadro2D(c), 1.35)
    corpo = elipse((0, 0), 2.4, 2.8).suave(circulo((0, -2.6), 2.0), 0.9)
    orelhas = poligono([(-2.0, -3.6), (-1.0, -3.8), (-1.8, -6.4)]) | poligono([(2.0, -3.6), (1.0, -3.8), (1.8, -6.4)])
    for s_ in (-1, 1):
        ay = -asa * 5.0
        pts = [(s_ * 1.6, -1.6), (s_ * 5.0, -2.0 + ay * 0.6), (s_ * 9.6, -1.4 + ay), (s_ * 8.4, 0.6 + ay * 0.8),
               (s_ * 7.0, 0.2 + ay * 0.6), (s_ * 5.6, 1.6 + ay * 0.5), (s_ * 4.0, 0.8 + ay * 0.3), (s_ * 1.6, 1.0)]
        t.pinta(q.forma(poligono(pts)), "morcego_asa", z - 0.05, R=1.0, pid=nome + "_asa")
        t.pinta(q.forma(traco([(s_ * 1.6, -1.6), (s_ * 5.0, -2.0 + ay * 0.6), (s_ * 9.6, -1.4 + ay)], 0.4)), "morcego", z - 0.04, R=0.5, pid=nome + "_asa")
    t.pinta(q.forma(corpo | orelhas), "morcego", z, R=2.2, pid=nome)
    for s_ in (-1, 1):
        t.pinta(q.forma(circulo((s_ * 0.85 + olha * 0.5, -2.8), 0.45)), "olho_morcego", z + 0.05, pid=nome, tom=0.9, sem_contorno=True)


def zz(t: Tela, x, y, tam, a):
    """Letra z de sono em pixel."""
    for i in range(tam):
        t.ponto_fx(x + i, y, "#cfe4ff", a)
        t.ponto_fx(x + i, y + tam - 1, "#cfe4ff", a)
        t.ponto_fx(x + tam - 1 - i, y + i, "#cfe4ff", a)


# ═══════════════════════════════ as linhas (comportamentos) ═══════════════════════════════
def _sn(k, n=NQ, desloc=0.0):
    return math.sin((k + desloc) / n * TAU)


def _cs(k, n=NQ, desloc=0.0):
    return math.cos((k + desloc) / n * TAU)


BASE = Pose()


def q_acenar(k):
    p = replace(BASE, inclina=1.2 * _sn(k), resp=0.5 + 0.5 * _sn(k), vira=0.15, cab=-1.5 * _sn(k),
                bd=(108.0 + 3 * _sn(k), 168.0 + 30 * _sn(k), 172.0 + 34 * _sn(k, desloc=0.4), "aberta"),
                be=(12.0, 2.0, 0.0, "punho"), pano=k / NQ * TAU)
    t = Tela()
    esqueleto(t, p, lambda t, r: espada(t, mao_quadro(r, "e", 4), p.ze + 0.3))
    return t


def q_ler(k):
    virar = max(0.0, min(1.0, (k - 3) / 3.0)) if 3 <= k <= 6 else 0.0
    p = replace(BASE, resp=0.5 + 0.5 * _sn(k), cab=3.0 + 1.0 * _sn(k), cab_dy=1.0, olhar=(0.4 * _sn(k, desloc=1), 1.2),
                be=(38.0, -40.0, -60.0, "punho"), bd=(38.0, -40.0, -60.0, "punho"), ze=6.0, zd=6.0, pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        a, b = r.j["palma_e"], r.j["palma_d"]
        livro(t, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 3.4), 0.0, virar, 6.3)
    esqueleto(t, p, ex)
    return t


def q_cafe(k):
    gole = [0.0, 0.25, 0.75, 1.0, 1.0, 0.85, 0.4, 0.05][k]
    a1 = 24 + 36 * gole
    a2 = -60 - 110 * gole
    a3 = -70 - 105 * gole
    p = replace(BASE, resp=0.5 + 0.5 * _sn(k), cab=-3.5 * gole, cab_dx=0.4 * gole, vira=0.25 * gole, olhar=(0.6 * gole, 0.8 * gole),
                bd=(a1, a2, a3, "punho"), be=(26.0, -40.0, -50.0, "punho"), pano=k / NQ * TAU, brilho=1.0 - 0.5 * gole)
    t = Tela()

    def ex(t, r):
        pa = r.j["palma_d"]
        # segura pela alça: o corpo da caneca fica do lado de dentro da mão
        cq = Quadro2D((pa[0] - 4.8, pa[1] - 0.6), -18 * gole)
        caneca(t, cq, p.zd + 0.35)
        topo = cq.p(-0.5, -5.4)
        vapor(t, topo[0], topo[1] - 1, k, 3 if gole < 0.6 else 2, 14)
    esqueleto(t, p, ex)
    return t


def q_dormir(k):
    s = _sn(k)
    p = replace(BASE, resp=0.5 + 0.5 * s, cab=11.0 + 1.6 * s, cab_dy=1.6 + 0.7 * s, cab_dx=0.6, inclina=1.6 + 0.4 * s, brilho=0.0,
                be=(7.0 + 1.0 * s, 1.0, -2.0, "aberta"), bd=(7.0 + 1.0 * s, 1.0, -2.0, "aberta"), pe=(7.0, -2.0), pd=(7.0, -2.0), pano=0.3 * s)
    t = Tela()
    esqueleto(t, p)
    # três "z" subindo e sumindo
    for j in range(3):
        fase = ((k + j * 8 / 3) % NQ) / NQ
        x = 74 + fase * 10 + math.sin(fase * TAU) * 1.5
        y = 40 - fase * 26
        tam = 3 + int(fase * 3)
        zz(t, x, y, tam, 0.95 * (1 - fase ** 2))
    return t


def q_alongar(k):
    a = [0.0, 0.3, 0.75, 1.0, 1.0, 0.85, 0.45, 0.1][k]
    p = replace(BASE, y=-1.4 * a, resp=a, cab=0.0, cab_dy=-1.2 * a, inclina=1.5 * math.sin(a * math.pi) * (1 if k < 4 else -1) * 0.6,
                be=(14 + 122 * a, 6 + 160 * a, 4 + 172 * a, "aberta"), bd=(14 + 122 * a, 6 + 160 * a, 4 + 172 * a, "aberta"),
                pe=(9.0 - 3 * a, -4.0 + 4 * a), pd=(9.0 - 3 * a, -4.0 + 4 * a), ze=6.0 - 5.2 * (a > 0.6), zd=6.0 - 5.2 * (a > 0.6),
                brilho=1.0 - 0.8 * (a > 0.9), pano=k / NQ * TAU)
    t = Tela()
    esqueleto(t, p)
    return t


def q_raiox(k):
    sobe = [0.0, 0.45, 0.85, 1.0, 1.0, 1.0, 1.0, 0.6][k]
    luz = [0.3, 0.5, 0.8, 1.0, 0.85, 1.0, 0.9, 0.6][k]
    p = replace(BASE, resp=0.5 + 0.5 * _sn(k), vira=0.55 * sobe, cab=-5.0 * sobe, cab_dx=0.6 * sobe, olhar=(1.2 * sobe, -1.0 * sobe),
                bd=(70 + 45 * sobe, 100 + 50 * sobe, 120 + 50 * sobe, "punho"), be=(28.0, -40.0, -50.0, "punho"), zd=8.8, pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        q = mao_quadro(r, "d")
        fq = Quadro2D(q.p(0, -1.5), 10 + 3 * _sn(k) + (1 - sobe) * 2)
        filme_raiox(t, Quadro2D((fq.o[0] + 4.6, fq.o[1] + 3), fq.ang - 3), 9.5, luz)
        cl = fq.p(6.5, -12)
        t.luz(cl[0], cl[1], 4.0, "#9fd8ff", 40.0, 0.55 * luz)
    esqueleto(t, p, ex)
    return t


def q_malabares(k):
    b = math.sin(k / NQ * TAU * 3)
    p = replace(BASE, resp=0.5 + 0.5 * _sn(k), cab=1.5 * _sn(k), olhar=(0, -1.6),
                be=(32.0 - 5 * b, 64.0 - 14 * b, 150.0, "aberta"), bd=(32.0 + 5 * b, 64.0 + 14 * b, 150.0, "aberta"), pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        for i in range(3):
            th = TAU * (k / NQ + i / 3)
            x = 48 + 34 * math.cos(th)
            y = 52 - 42 * math.sin(th) if math.sin(th) > 0 else 52 - 34 * math.sin(th)
            osso_pequeno(t, (x, y), math.degrees(th) * 2 + i * 40, 9.6, f"malabar{i}", i)
    esqueleto(t, p, ex)
    return t


def q_reflexo(k):
    # 0-1 levanta o martelo, 2 bate, 3-4 a perna chuta, 5-7 volta
    martelo_a = [0.0, -0.6, 0.6, 0.4, 0.2, 0.0, 0.0, 0.0][k]
    chute = [0.0, 0.0, 0.1, 1.0, 0.7, 0.3, 0.1, 0.0][k]
    p = replace(BASE, inclina=-3.0, resp=0.5, cab=4.0 - 2.0 * chute, vira=0.5, olhar=(1.0, 1.4), cab_dy=0.5,
                pd=(74.0 - 2 * chute, 2.0 + 88 * chute), pe=(4.0, -1.0), y=-0.5,
                bd=(52.0 - 18 * martelo_a, 18.0 - 40 * martelo_a, -10.0 - 40 * martelo_a, "punho"), be=(34.0, -20.0, -30.0, "punho"),
                pano=1.2 * chute + k * 0.3)
    t = Tela()

    def ex(t, r):
        martelo(t, _escala(mao_quadro(r, "d", 20), 1.35), p.zd + 0.3)
        if k in (2, 3):
            jo = r.j["joelho_d"]
            for (dx, dy) in ((-3, -3), (0, -5), (3, -4), (5, -1), (-4, 0)):
                t.ponto_fx(jo[0] + dx, jo[1] + dy - 1, "#fff6c8", 0.95)
                t.ponto_fx(jo[0] + dx * 0.6, jo[1] + dy * 0.6 - 1, "#ffd27a", 0.7)
    esqueleto(t, p, ex)
    return t


def q_marshmallow(k):
    s = _sn(k)
    p = replace(BASE, x=5.0, inclina=-3.5, resp=0.5 + 0.5 * s, vira=-0.7, cab=-2.0, olhar=(-1.4, 1.2),
                be=(40.0 + 2 * s, 48.0 + 3 * s, 76.0, "punho"), bd=(40.0, -60.0, -70.0, "punho"), pano=k / NQ * TAU)
    t = Tela()
    # a fogueira está à esquerda, fora do quadro
    t.luz(-16.0, 100.0, 40.0, "#ff8a2a", 130.0, 1.5 + 0.2 * math.sin(k * 2.3))

    def ex(t, r):
        espeto(t, mao_quadro(r, "e", -88), p.ze + 0.3, 0.7, k)
    esqueleto(t, p, ex)
    return t


def q_parado(k):
    vira = [0.0, 0.0, -0.45, -0.5, 0.0, 0.45, 0.5, 0.0][k]
    brilho = 0.0 if k == 7 else 1.0
    p = replace(BASE, resp=0.5 + 0.5 * _sn(k), cab_dy=0.5 * _sn(k, desloc=0.5), vira=vira, brilho=brilho,
                olhar=(vira * 1.4, 0.0), bd=(12.0, 2.0, 0.0, "punho"), be=(14.0, 4.0, 2.0, "aberta"), pano=k / NQ * TAU)
    t = Tela()
    esqueleto(t, p, lambda t, r: espada(t, mao_quadro(r, "d", -4), p.zd + 0.3))
    return t


# ─────────── Halloween ───────────
def q_foice(k):
    ph = k / NQ * TAU
    s, c = math.sin(ph), math.cos(ph)
    p = replace(BASE, capa=True, y=-abs(math.sin(ph)) * 1.2, inclina=1.0 * s, resp=0.5 + 0.5 * s, vira=0.1,
                pe=(9.0 + 9 * s, -4.0 - 8 * max(0.0, s)), pd=(9.0 - 9 * s, -4.0 - 8 * max(0.0, -s)),
                be=(16.0 + 10 * s, 8.0 + 10 * s, 6.0, "aberta"), bd=(30.0, -8.0, -12.0, "punho"), pano=ph * 1.0)
    t = Tela()
    esqueleto(t, p, lambda t, r: foice(t, mao_quadro(r, "d", 12 - 1.2 * s), p.zd + 0.3))
    return t


def q_abobora(k):
    chamas = [0.8, 1.0, 0.7, 0.9, 0.6, 1.0, 0.85, 0.7][k]
    p = replace(BASE, capa=True, resp=0.5 + 0.5 * _sn(k), cab=2.0, olhar=(-0.4, 1.0),
                bd=(40.0, -108.0, -125.0, "punho"), be=(16.0, 6.0, 4.0, "aberta"), pano=k / NQ * TAU)
    t = Tela()
    esqueleto(t, p, lambda t, r: lanterna_abobora(t, Quadro2D(r.j["palma_d"], 5 * _sn(k)), 9.4, chamas, k))
    return t


def q_velas(k):
    p = replace(BASE, capa=True, resp=0.5 + 0.5 * _sn(k), vira=0.35, cab=-2.0, olhar=(0.8, -0.6),
                bd=(96.0, 112.0, 175.0, "punho"), be=(16.0, 6.0, 4.0, "aberta"), pano=k / NQ * TAU)
    t = Tela()
    esqueleto(t, p, lambda t, r: candelabro(t, Quadro2D(r.j["palma_d"], 0 + 2 * _sn(k)), 9.4, k))
    return t


def q_morcegos(k):
    ph = k / NQ * TAU
    p = replace(BASE, capa=True, resp=0.5 + 0.5 * math.sin(ph), vira=0.55 * math.cos(ph), olhar=(1.0 * math.cos(ph), -0.6),
                be=(14.0, 4.0, 2.0, "aberta"), bd=(14.0, 4.0, 2.0, "aberta"), pano=ph)
    t = Tela()

    def ex(t, r):
        asas = [1.0, 0.2, -1.0, 0.2]
        for i, (cy, rx, ry, sent, des) in enumerate(((30.0, 31.0, 8.0, 1, 0.0), (86.0, 31.5, 7.0, -1, 0.5))):
            th = ph * sent + des * TAU
            x = 48 + rx * math.cos(th)
            y = cy + ry * math.sin(th) + 1.5 * math.sin(ph * 2 + i)
            frente = math.sin(th) > 0
            morcego(t, (x, y), asas[(k + i * 2) % 4], 1 if math.cos(th) * sent < 0 else -1, 10.0 if frente else 0.2, f"morcego{i}")
    esqueleto(t, p, ex)
    return t


# ═══════════════════════════════ linhas novas (31/10/2026): acessórios e poses ═══════════════════════════════
# Tudo daqui para baixo só acrescenta: as linhas antigas não passam por estas funções.
def faixas(c, ang, periodo, larg, bb, fase=0.0) -> Forma:
    """Listras retas e paralelas (para decalque com sobre=): periodo e largura em pixels."""
    cx, cy = c
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def f(X, Y):
        u = (X - cx) * ca + (Y - cy) * sa + fase
        return np.abs(np.mod(u, periodo) - periodo / 2) - larg / 2
    return Forma(f, bb)


def sombra_em(t: Tela, cx, cy, larg=15.0, alt=2.6, forca=1.0):
    """A mesma sombra no chão de sombra_chao, num ponto fixo (para quem pula ou senta)."""
    for y in range(int(cy) - 3, int(cy) + 3):
        for x in range(int(cx - larg - 2), int(cx + larg + 3)):
            d = ((x + 0.5 - cx) / larg) ** 2 + ((y + 0.5 - cy) / alt) ** 2
            if d < 1:
                t.ponto_fx(x, y, "#0c0710", (0.42 if d < 0.45 else 0.26) * forca, sob=True)


def cintila(t: Tela, x, y, tam, cor="#fff6c8", a=1.0):
    """Estrelinha de brilho de 4 pontas em pixel (efeito)."""
    t.ponto_fx(x, y, "#ffffff", a)
    for i in range(1, tam + 1):
        ai = a * (1 - (i - 1) / (tam + 0.5))
        for dx, dy in ((i, 0), (-i, 0), (0, i), (0, -i)):
            t.ponto_fx(x + dx, y + dy, cor, ai)


def oculos(t: Tela, r: Rig, p: Pose, z=8.6):
    """Óculos redondos pequenos de aro dourado, apoiados sobre as órbitas (rosto três-quartos)."""
    q = r.cab
    ox = p.vira * 2.0
    c1, c2 = (1.6 + ox, 5.4), (-18.4 + ox, 6.0)
    aro1 = elipse(c1, 6.6, 6.3) - elipse(c1, 5.5, 5.2)
    aro2 = elipse(c2, 3.0, 5.4, ang=6) - elipse(c2, 2.0, 4.4, ang=6)
    ponte = traco(bezier((-4.9 + ox, 4.4), (-10.0 + ox, 1.2), (-15.4 + ox, 4.6), 7), 0.55)
    haste = traco([(8.0 + ox, 4.0), (15.0 + ox, 2.2), (21.6, 1.2)], 0.5)
    t.pinta(q.forma(aro1 | aro2 | ponte | haste), "latao", z, R=0.7, pid="oculos")
    # reflexo na lente grande: dois risquinhos claros em diagonal
    for (a, b) in (((c1[0] - 3.4, c1[1] - 1.0), (c1[0] - 1.2, c1[1] - 3.4)), ((c1[0] - 2.2, c1[1] + 1.2), (c1[0] - 1.4, c1[1] + 0.4))):
        t.pinta(q.forma(capsula(a, b, 0.42)), "brilho", z - 0.05, pid="oculos_lente", tom=0.75, sem_contorno=True)


def pena(t: Tela, ponta, ang: float, z: float):
    """Pena de escrever: a ponta de metal em `ponta`; a pena sobe na direção ang (graus, 0 = para cima)."""
    q = Quadro2D(ponta, ang)
    t.pinta(q.forma(poligono([(-0.55, 0.0), (0.55, 0.0), (0.0, 1.6)])), "aco", z, R=0.5, pid="pena_bico", sem_contorno=True, tom=-0.1)
    haste = [(0.0, 0.0), (0.2, -5.0), (0.9, -12.5), (1.8, -17.5)]
    vane = (bezier((0.1, -3.4), (-3.4, -9.0), (0.6, -17.8), 8) + [(1.8, -17.6)] + bezier((2.2, -16.4), (3.0, -10.0), (0.4, -3.4), 8))
    t.pinta(q.forma(poligono(vane).borda(0.25, 1.4, 9)), "faixa", z - 0.05, R=1.4, pid="pena", uv=q.uv(), semente=401)
    for i in range(4):   # farpas: riscos diagonais mais escuros
        y = -6.0 - i * 2.6
        t.pinta(q.forma(capsula((-1.6, y + 1.2), (0.3, y), 0.28)), "faixa", 0, sobre="pena", tom=-0.22, normal=False)
    t.pinta(q.forma(traco(haste, 0.32)), "faixa", z, R=0.4, pid="pena_haste", tom=-0.3, sem_contorno=True)


def chapeu_mago(t: Tela, r: Rig, k: int, z=9.0):
    """Chapéu pontudo azul-escuro com faixa dourada e estrelinhas de quatro pontas; a ponta tomba para a direita."""
    q = r.cab
    uv = q.uv()
    bal = 0.8 * _sn(k)
    cone = poligono([(-15.5, -21.4), (-12.6, -31.0), (-7.4, -40.0), (-0.8, -46.6), (6.0 + bal, -50.0), (12.6 + bal * 1.4, -48.6),
                     (15.0 + bal * 1.6, -44.4), (11.6 + bal, -45.6), (6.8 + bal * 0.6, -42.4), (9.0, -34.0), (15.2, -21.4)])
    t.pinta(q.forma(cone.suave(circulo((13.6 + bal * 1.5, -46.2), 1.7), 0.8)), "chapeu", z, R=4.0, pid="chapeu", uv=uv, semente=410,
            relevo=lambda X, Y: (0.22 * np.sin((X - q.o[0]) * 0.7), 0.0 * X))
    # dobra na ponta tombada (sombra) e luz no lado esquerdo do cone
    t.pinta(q.forma(elipse((7.6 + bal, -44.2), 3.4, 1.6, ang=-20)), "chapeu", 0, sobre="chapeu", tom=-0.22, normal=False)
    t.pinta(q.forma(traco([(-12.0, -24.0), (-8.4, -33.0), (-3.0, -41.0)], 0.9)), "chapeu", 0, sobre="chapeu", tom=0.12, normal=False)
    # aba larga e achatada por cima do crânio
    aba = elipse((0.4, -20.6), 24.6, 4.4, ang=-3)
    t.pinta(q.forma(aba), "chapeu", z + 0.2, R=2.2, pid="chapeu_aba", uv=uv, semente=411)
    t.pinta(q.forma(elipse((0.4, -21.8), 16.5, 2.2, ang=-3)), "chapeu", 0, sobre="chapeu_aba", tom=-0.2, normal=False)
    # faixa dourada com fivela
    t.pinta(q.forma(cone & (semiplano((0, -22.8), (0, 1)) - semiplano((0, -26.4), (0, 1)))), "latao", z + 0.1, R=1.0, pid="chapeu_faixa", tom=-0.05)
    t.pinta(q.forma(caixa((-4.6, -24.6), 1.9, 1.9, r=0.4) - caixa((-4.6, -24.6), 0.8, 0.8)), "latao", z + 0.15, R=0.7, pid="chapeu_fivela")
    # estrelinhas que acendem uma de cada vez
    for i, (x, y, tam) in enumerate(((-8.0, -31.0, 1.5), (3.0, -37.0, 1.3), (-2.5, -29.0, 0.9), (7.8, -29.4, 1.1), (-11.6, -22.0, 0.9))):
        luz = 0.55 + 0.45 * max(0.0, math.cos((k - i * 1.6) / NQ * TAU))
        alvo = "chapeu_aba" if i == 4 else "chapeu"
        est = capsula((x - tam, y), (x + tam, y), 0.42) | capsula((x, y - tam), (x, y + tam), 0.42)
        t.pinta(q.forma(est), "latao", 0, sobre=alvo, R=0.5, tom=0.1 + 0.35 * luz)


def cajado(t: Tela, q: Quadro2D, z: float, k: int):
    """Cajado de madeira torta com cristal verdete que pulsa. Origem na mão; o cabo vai de +30 (baixo) a -40 (alto)."""
    uv = q.uv()
    pulso = 0.5 + 0.5 * _sn(k)
    t.pinta(q.forma(traco([(0.2, 31.0), (0.0, 10.0), (-0.4, -12.0), (0.3, -30.0), (-0.2, -38.0)], [0.95, 1.0, 1.05, 1.1, 1.2])), "madeira", z - 0.2, R=1.1,
            pid="cajado", uv=uv, semente=420)
    for y in (-6.0, -2.0):   # empunhadura de couro
        t.pinta(q.forma(capsula((-1.4, y - 0.6), (1.4, y + 0.6), 0.55)), "couro", z - 0.15, R=0.6, pid="cajado_tira")
    # garras de madeira segurando o cristal
    for s_ in (-1, 1):
        t.pinta(q.forma(traco([(s_ * 0.6, -37.0), (s_ * 3.0, -41.0), (s_ * 2.6, -46.0), (s_ * 1.4, -48.4)], [0.9, 0.8, 0.65, 0.45])), "madeira", z + 0.1, R=0.7,
                pid=f"cajado_garra{s_}", semente=421)
    cr = poligono([(0.0, -53.6), (2.6, -49.6), (2.4, -43.6), (0.0, -40.6), (-2.4, -43.6), (-2.6, -49.6)])
    cy = q.p(0, -47)[1]
    cx = q.p(0, -47)[0]
    t.pinta(q.forma(cr), "cristal", z, pid="cristal", sem_contorno=False,
            tom=lambda X, Y: np.clip(0.55 + 0.3 * pulso - 0.07 * (X - cx) - 0.03 * (Y - cy), 0.1, 1.0))
    t.pinta(q.forma(capsula((-0.9, -51.0), (-0.9, -44.0), 0.4)), "cristal", z + 0.05, pid="cristal", tom=1.0, sem_contorno=True)
    lp = q.p(0, -47)
    t.luz(lp[0], lp[1], 10.0, "#5ef0d8", 30.0, 0.3 + 0.3 * pulso)
    # faíscas girando em volta do cristal
    for j in range(3):
        th = (k / NQ + j / 3) * TAU
        x = lp[0] + 6.5 * math.cos(th)
        y = lp[1] + 4.0 * math.sin(th) - 1
        t.ponto_fx(x, y, "#b8fff0" if j else "#ffffff", 0.55 + 0.4 * (math.sin(th) > 0))


def gorro(t: Tela, r: Rig, k: int, z=9.0):
    """Gorro de lã vermelho com barra dobrada creme e pompom (inverno)."""
    q = r.cab
    uv = q.uv()
    copa = elipse((0, -6.8), 26.0, 21.6) & semiplano((0, -12.5), (0, 1))
    trico = lambda X, Y: (0.32 * np.sin((uv(X, Y)[0]) * 1.35), 0.0 * X)
    t.pinta(q.forma(copa), "la", z, R=8.0, pid="gorro", uv=uv, semente=430, relevo=trico)
    # nervuras em V (tricô) em faixas verticais
    for i in range(-5, 6):
        x = i * 4.2
        t.pinta(q.forma(capsula((x, -26.0), (x * 1.04, -12.0), 0.35)), "la", 0, sobre="gorro", tom=-0.14, normal=False)
    barra = elipse((0, -6.6), 27.4, 23.0) & semiplano((0, -9.0), (0, 1)) & semiplano((0, -16.4), (0, -1))
    t.pinta(q.forma(barra), "la_creme", z + 0.2, R=2.4, pid="gorro_barra", uv=uv, semente=431,
            relevo=lambda X, Y: (0.4 * np.sin(uv(X, Y)[0] * 1.6), 0.0 * X))
    for i in range(-6, 7):
        x = i * 3.9 + 1.0
        t.pinta(q.forma(capsula((x, -15.6), (x, -9.8), 0.38)), "la_creme", 0, sobre="gorro_barra", tom=-0.16, normal=False)
    bal = 0.6 * _sn(k, desloc=1)
    pom = circulo((3.0 + bal, -28.6), 5.2).borda(0.7, 1.1, 12)
    t.pinta(q.forma(pom), "la_creme", z + 0.1, R=4.0, pid="pompom", uv=uv, semente=432,
            relevo=lambda X, Y: (0.35 * ruido(X * 1.4, Y * 1.4, 5), 0.35 * ruido(X * 1.4, Y * 1.4, 6)))


def cachecol(t: Tela, r: Rig, k: int, z=8.2):
    """Cachecol listrado vermelho e creme: a volta no pescoço, uma ponta caída na frente e a outra esvoaçando."""
    q = r.tronco
    uv = q.uv()
    ph = k / NQ * TAU
    volta = caixa((0.4, -28.4), 11.6, 2.9, r=2.4).suave(elipse((0.0, -26.6), 9.0, 2.6), 1.2)
    t.pinta(q.forma(volta), "la", z, R=2.4, pid="cachecol", uv=uv, semente=440)
    t.pinta(q.forma(faixas((0, 0), 0, 4.4, 1.9, (-14, -34, 14, -22))), "la_creme", 0, sobre="cachecol", R=2.0)
    # ponta caída na frente do peito, com franja
    ponta = poligono([(-6.8, -27.0), (-2.2, -27.0), (-2.6 + 0.4 * math.sin(ph), -13.4), (-7.6 + 0.4 * math.sin(ph), -13.8)])
    t.pinta(q.forma(ponta), "la", z - 0.1, R=1.8, pid="cachecol_ponta", uv=uv, semente=441, relevo=lambda X, Y: (0.25 * np.sin(Y * 0.9), 0.0 * X))
    t.pinta(q.forma(faixas((0, 0), 90, 4.4, 1.9, (-9, -27, 0, -13), fase=1.0)), "la_creme", 0, sobre="cachecol_ponta", R=1.8)
    for i in range(5):
        x = -7.2 + i * 1.15 + 0.4 * math.sin(ph)
        t.pinta(q.forma(capsula((x, -13.4), (x + 0.2 * math.sin(ph + i), -11.6), 0.36)), "la_creme", z - 0.12, R=0.5, pid="franja", sem_contorno=True)
    # ponta esvoaçando para a direita, ondulando com o vento
    pts_c, pts_b = [], []
    for i in range(7):
        a = i / 6
        x = 9.0 + a * 15.0
        y = -29.6 + a * 2.4 + math.sin(ph * 1.0 - a * 4.0) * (0.4 + 2.2 * a)
        meia = 2.6 - 0.7 * a
        pts_c.append((x, y - meia))
        pts_b.append((x, y + meia))
    vento = poligono(pts_c + pts_b[::-1])
    t.pinta(q.forma(vento), "la", z - 0.3, R=1.8, pid="cachecol_vento", uv=uv, semente=442)
    t.pinta(q.forma(faixas((0, 0), 0, 4.4, 1.9, (8, -36, 26, -22), fase=2.2 - k * 0.0)), "la_creme", 0, sobre="cachecol_vento", R=1.8)
    fim_x, fim_y = pts_c[-1][0], (pts_c[-1][1] + pts_b[-1][1]) / 2
    for j in range(4):
        y = fim_y - 1.5 + j * 1.0
        t.pinta(q.forma(capsula((fim_x, y), (fim_x + 1.8, y + 0.4 * math.sin(ph + j)), 0.34)), "la_creme", z - 0.32, R=0.5, pid="franja_v", sem_contorno=True)


def neve(t: Tela, k: int, n=7):
    """Flocos de neve caindo em laço (8 quadros)."""
    for i in range(n):
        x0 = (i * 37 + 11) % 92 + 2
        y = (i * 53 + k * 16) % 128
        x = x0 + 1.6 * math.sin((y / 128) * TAU * 2 + i)
        a = 0.75 * min(1.0, y / 14) * min(1.0, (128 - y) / 14)
        t.ponto_fx(x, y, "#f4f8ff", a)
        if i % 3 == 0:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                t.ponto_fx(x + dx, y + dy, "#cfe4ff", a * 0.45)


def pergaminho(t: Tela, pe, pd, k: int, z: float):
    """Pergaminho comprido: o rolo de cima entre as mãos, a folha caindo até o chão e o rolo de baixo no chão."""
    ph = k / NQ * TAU
    cy = (pe[1] + pd[1]) / 2 + 1.0
    x0, x1 = pe[0] - 2.0, pd[0] + 2.0
    xm = (x0 + x1) / 2
    # folha: desce do rolo, encosta no chão e segue para a frente e para a direita
    bal = 0.6 * math.sin(ph)
    D = 16.0
    esq = [(x0 + 1.2, cy), (x0 + 0.6 + bal, cy + 12), (x0 + 0.2 + bal * 1.5, cy + 22), (x0 + 0.8 + bal, 119.0)]
    chao = [(x0 + 3.0 + bal, 121.4), (x0 + D * 0.5, 123.6), (x0 + D, 125.0)]
    dirt = [(x1 + D, 121.0), (x1 + D * 0.5, 120.0), (x1 + 0.2 + bal, 118.0), (x1 - 0.6 + bal * 1.4, cy + 22), (x1 - 0.4 + bal, cy + 12), (x1 - 1.2, cy)]
    folha = poligono(esq + chao + dirt)
    yb = cy
    t.pinta(folha, "papel", z, R=2.0, pid="perg_folha", plano=(0, 0.25, 0.95), semente=450,
            tom=lambda X, Y: -0.08 * np.clip((Y - yb) / 30, 0, 1))
    # as missões do dia: caixinhas (algumas marcadas) e linhas de texto
    marcadas = (0, 1, 3)
    for i in range(8):
        y = cy + 4.0 + i * 3.6
        xa = x0 + 3.4 + bal * (0.4 + i * 0.12)
        if y > 117:
            break
        t.pinta(caixa((xa, y), 0.95, 0.95), "tinta", 0, sobre="perg_folha", R=0.5)
        if i in marcadas:
            t.pinta(traco([(xa - 0.6, y - 0.1), (xa, y + 0.6), (xa + 1.6, y - 1.6)], 0.42), "pano", z + 0.05, R=0.5, pid="perg_marca", sem_contorno=True, tom=0.3)
        fim = x1 - 3.0 - ((i * 7) % 5) * 1.3
        t.pinta(capsula((xa + 2.4, y), (fim + bal * (0.4 + i * 0.12), y), 0.42), "tinta", 0, sobre="perg_folha", R=0.5)
    # rolos: o de cima com punhos de madeira, o de baixo no chão, girando de leve
    rolo = capsula((x0 - 0.4, cy - 1.0), (x1 + 0.4, cy - 1.0), 2.1)
    t.pinta(rolo, "papel", z + 0.3, R=2.0, pid="perg_rolo", tom=-0.04, semente=451)
    t.pinta(capsula((x0, cy - 0.2), (x1, cy - 0.2), 0.45), "papel", 0, sobre="perg_rolo", tom=-0.22, normal=False)
    for x in (x0 - 2.8, x1 + 2.8):
        t.pinta(capsula((x, cy - 1.0), (x, cy - 1.0), 1.4) | circulo((x + (1.6 if x > xm else -1.6), cy - 1.0), 1.0), "madeira", z + 0.35, R=1.2, pid=f"perg_punho{x:.0f}")
    # rolo de baixo deitado no chão, na ponta da folha, balançando um pouquinho
    rx = x1 + D + 1.6 + 0.5 * math.sin(ph)
    rb = capsula((rx - 3.0, 120.6), (rx + 1.6, 125.4), 2.0)
    t.pinta(rb, "papel", z + 0.2, R=2.0, pid="perg_rolo2", semente=452, tom=-0.04)
    for j in range(2):
        u = (j * 0.5 + k / NQ) % 1.0
        cx_, cy_ = rx - 3.0 + 4.6 * u, 120.6 + 4.8 * u
        t.pinta(capsula((cx_ - 1.2, cy_ + 1.0), (cx_ + 1.2, cy_ - 1.0), 0.3), "papel", 0, sobre="perg_rolo2", tom=-0.25, normal=False)
    for (x, y) in ((rx - 3.6, 119.8), (rx + 2.2, 126.2)):
        t.pinta(circulo((x, y), 1.2), "madeira", z + 0.25, R=1.0, pid=f"perg_ponta{x:.0f}")


def trofeu(t: Tela, q: Quadro2D, z: float, k: int):
    """Taça dourada com duas alças. Origem na mão (base); a taça sobe para -y."""
    uv = q.uv()
    t.pinta(q.forma(caixa((0, 1.6), 4.6, 2.0, r=0.6)), "madeira", z - 0.1, R=1.4, pid="trofeu_base", uv=uv, semente=460)
    t.pinta(q.forma(caixa((0, 1.4), 2.6, 0.8, r=0.2)), "latao", 0, sobre="trofeu_base", R=0.6, tom=0.05)
    pe_ = caixa((0, -1.4), 3.2, 1.0, r=0.5) | capsula((0, -2.0), (0, -5.6), 0.9, 1.3) | elipse((0, -5.4), 1.9, 0.9)
    t.pinta(q.forma(pe_), "latao", z, R=1.2, pid="trofeu_pe", uv=uv)
    taca = poligono([(-6.4, -15.6), (6.4, -15.6), (5.6, -11.0), (3.0, -7.4), (0.0, -6.4), (-3.0, -7.4), (-5.6, -11.0)])
    taca = taca.suave(elipse((0, -10.0), 5.2, 3.6), 1.0)
    t.pinta(q.forma(taca), "latao", z + 0.05, R=4.0, pid="trofeu", uv=uv, semente=461)
    for s_ in (-1, 1):
        alca = traco(bezier((s_ * 5.6, -14.0), (s_ * 10.4, -13.6), (s_ * 4.2, -8.4), 7), 0.75)
        t.pinta(q.forma(alca), "latao", z, R=0.8, pid=f"trofeu_alca{s_}")
    t.pinta(q.forma(elipse((0, -15.6), 6.4, 1.3)), "latao", z + 0.1, R=0.9, pid="trofeu_boca", tom=0.1)
    t.pinta(q.forma(elipse((0, -15.7), 5.0, 0.7)), "latao", 0, sobre="trofeu_boca", R=-0.6, tom=-0.35)
    t.pinta(q.forma(capsula((-3.6, -14.0), (-2.6, -9.0), 0.55)), "latao", 0, sobre="trofeu", tom=0.4, normal=False)
    # estrela gravada no meio da taça
    t.pinta(q.forma(capsula((0.6, -12.4), (0.6, -9.4), 0.35) | capsula((-0.9, -10.9), (2.1, -10.9), 0.35)), "latao", 0, sobre="trofeu", tom=-0.28, normal=False)


def prancheta(t: Tela, q: Quadro2D, z: float):
    """Prancheta de madeira com folha e prendedor. Origem na mão (borda de baixo)."""
    uv = q.uv()
    t.pinta(q.forma(caixa((0, -6.6), 5.6, 7.0, r=0.8)), "madeira", z, R=1.0, pid="prancheta", uv=uv, plano=(0.1, 0.2, 0.95), semente=470)
    t.pinta(q.forma(caixa((0.2, -6.0), 4.4, 5.8, r=0.3)), "papel", z + 0.05, R=0.6, pid="prancheta_folha", uv=uv, semente=471)
    for i in range(4):
        y = -9.4 + i * 2.2
        t.pinta(q.forma(capsula((-2.6, y), (2.4 - (i % 2) * 1.6, y), 0.36)), "tinta", 0, sobre="prancheta_folha", R=0.4)
    t.pinta(q.forma(caixa((0, -13.0), 2.4, 1.1, r=0.4)), "aco", z + 0.1, R=0.8, pid="prancheta_clip")


def ponteiro(t: Tela, q: Quadro2D, z: float):
    """Vareta de apontar: origem na mão; segue +y; ponta com bolinha de latão."""
    t.pinta(q.forma(capsula((0, -1.6), (0, 20.0), 0.75, 0.48)), "madeira", z - 0.1, R=0.7, pid="ponteiro", uv=q.uv(), semente=480)
    t.pinta(q.forma(circulo((0, 20.6), 1.1)), "latao", z, R=1.0, pid="ponteiro_ponta")


def jaleco(t: Tela, r: Rig, p: Pose):
    """Jaleco curto branco por cima da armadura: abas abertas no meio, gola, bolso com caneta e mangas."""
    q = r.tronco
    uv = q.uv()
    for s_ in (-1, 1):
        aba = poligono([(s_ * 2.6, -27.4), (s_ * 11.4, -25.6), (s_ * 13.2, -18.0), (s_ * 13.0, -6.0), (s_ * 12.6, 5.6),
                        (s_ * 7.6, 6.4), (s_ * 6.4, -3.0), (s_ * 5.6, -12.0), (s_ * 4.0, -20.0)])
        t.pinta(q.forma(aba), "faixa", 5.9, R=2.4, pid=f"jaleco_{s_}", uv=uv, semente=490 + s_,
                relevo=lambda X, Y, s_=s_: (0.18 * np.sin((X - r.P[0]) * 1.1 + s_), 0.0 * X),
                tom=lambda X, Y: -0.06 * np.clip((Y - r.P[1] + 10) / 20, 0, 1))
        gola = poligono([(s_ * 2.2, -27.8), (s_ * 7.6, -26.6), (s_ * 6.0, -16.6), (s_ * 4.2, -19.6)])
        t.pinta(q.forma(gola), "faixa", 6.0, R=1.2, pid=f"gola_{s_}", plano=(s_ * 0.3, -0.1, 0.95), tom=-0.04)
        t.pinta(q.forma(capsula((s_ * 8.4, -3.0), (s_ * 8.6, 4.6), 0.3)), "faixa", 0, sobre=f"jaleco_{s_}", tom=-0.18, normal=False)
    # bolso no peito (lado direito da tela) com caneta
    t.pinta(q.forma(caixa((8.6, -13.6), 2.6, 0.35)), "faixa", 0, sobre="jaleco_1", tom=-0.22, normal=False)
    t.pinta(q.forma(caixa((7.8, -15.6), 0.55, 2.0, r=0.3)), "tala", 6.05, R=0.6, pid="caneta")
    t.pinta(q.forma(caixa((7.8, -17.2), 0.6, 0.5)), "latao", 6.1, R=0.4, pid="caneta_clip", sem_contorno=True)
    # mangas (as mãos de osso ficam de fora)
    for lado in ("e", "d"):
        om, co, pu = r.j[f"ombro_{lado}"], r.j[f"cotovelo_{lado}"], r.j[f"punho_{lado}"]
        z = (p.ze if lado == "e" else p.zd) + 0.35
        ang = math.atan2(pu[1] - co[1], pu[0] - co[0])
        fim = (pu[0] - math.cos(ang) * 1.6, pu[1] - math.sin(ang) * 1.6)
        manga = capsula(om, co, 2.7, 2.6) | capsula(co, fim, 2.6, 2.8)
        t.pinta(manga, "faixa", z, R=2.4, pid=f"jmanga_{lado}", semente=495)
        t.pinta(capsula((fim[0] - math.cos(ang) * 0.8, fim[1] - math.sin(ang) * 0.8), fim, 2.9), "faixa", z + 0.02, R=1.2, pid=f"jpunho_{lado}", tom=-0.06)


def goniometro(t: Tela, q: Quadro2D, z: float, abre: float):
    """Goniômetro de duas hastes com o disco no meio; abre em graus. Origem no disco."""
    t.pinta(q.forma(caixa((0, 5.2), 0.95, 6.0, r=0.4)), "aco", z, R=0.8, pid="gonio_a")
    for i in range(4):
        t.pinta(q.forma(capsula((-0.4, 2.6 + i * 2.2), (0.4, 2.6 + i * 2.2), 0.22)), "aco", 0, sobre="gonio_a", tom=-0.35, normal=False)
    q2 = _escala(Quadro2D(q.o, q.ang + abre), getattr(q, "k", 1.0))
    t.pinta(q2.forma(caixa((0, 5.2), 0.95, 6.0, r=0.4)), "aco", z + 0.1, R=0.8, pid="gonio_b")
    t.pinta(q.forma(circulo((0, 0), 2.4) - circulo((0, 0), 1.2)), "aco", z + 0.2, R=1.2, pid="gonio_disco", tom=0.05)
    t.pinta(q.forma(circulo((0, 0), 0.7)), "latao", z + 0.25, R=0.6, pid="gonio_pino")


def confete(t: Tela, k: int, centro=(48.0, 16.0), n=22):
    """Confetes que estouram no alto e caem girando (laço de 8 quadros)."""
    cores = ("#e8b84a", "#d24e3a", "#46d0c0", "#f4ead2", "#6aa0e8", "#f08a50")
    rng = np.random.default_rng(77)
    vx = rng.uniform(0.45, 1.0, n) * np.where(np.arange(n) % 2 == 0, -1, 1)
    vy = rng.uniform(0.2, 1.0, n)
    for i in range(n):
        tt = ((k - 1 - (i % 3) * 0.33) % NQ) / NQ
        x = centro[0] + vx[i] * 40 * (1 - (1 - tt) ** 2) + math.sin(tt * 9 + i) * 1.4
        y = centro[1] - vy[i] * 22 * tt * 2.2 + 120 * tt * tt
        a = 0.95 * min(1.0, (1 - tt) * 3.0)
        cor = cores[i % len(cores)]
        t.ponto_fx(x, y, cor, a)
        if (k + i) % 2:
            t.ponto_fx(x + 1, y, cor, a * 0.8)
        else:
            t.ponto_fx(x, y + 1, cor, a * 0.8)


# ─────────── as poses novas do esqueleto ───────────
def q_estudioso(k):
    # 0-3 anota na página da direita com a pena; 4-6 vira a página; 7 volta a anotar
    virar = {4: 0.25, 5: 0.6, 6: 0.9}.get(k, 0.0)
    escreve = math.sin(k * 2.2) if k < 4 or k == 7 else 0.0
    sobe = {4: 1.0, 5: 1.0, 6: 0.6}.get(k, 0.0)
    p = replace(BASE, resp=0.5 + 0.5 * _sn(k), cab=4.0 + 0.6 * _sn(k), cab_dy=1.2, vira=0.1,
                be=(36.0, -38.0, -62.0, "punho"), bd=(30.0 + 6 * sobe + 3 * escreve, -26.0 - 26 * sobe + 6 * escreve, -48.0, "pinca"),
                ze=6.0, zd=7.4, pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        a = r.j["palma_e"]
        c = (a[0] + 9.0, a[1] - 3.0)
        livro(t, c, -6.0, virar, 6.3)
        pd = r.j["palma_d"]
        pena(t, (pd[0] - 1.2, pd[1] + 2.4), 24.0 - 10 * sobe, p.zd + 0.9)
        oculos(t, r, p)
    esqueleto(t, p, ex)
    return t


def q_mago(k):
    s = _sn(k)
    p = replace(BASE, resp=0.5 + 0.5 * s, cab=-1.5 + 0.8 * s, vira=0.05, inclina=-1.0,
                bd=(66.0, 44.0, 20.0, "punho"), be=(34.0 + 4 * s, -10.0 + 6 * s, -30.0, "aberta"), zd=7.0, pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        cajado(t, Quadro2D(r.j["palma_d"], 7.0 + 0.6 * s), 9.6, k)
        chapeu_mago(t, r, k)
        # faísca na mão aberta, como quem conjura
        pe_ = r.j["palma_e"]
        if k % 4 in (1, 2):
            cintila(t, pe_[0] - 3, pe_[1] - 5 - (k % 4), 1 + (k % 4 == 2), "#b8fff0", 0.85)
    esqueleto(t, p, ex)
    return t


def q_inverno(k):
    s = _sn(k)
    gole = [0.0, 0.0, 0.1, 0.25, 0.25, 0.1, 0.0, 0.0][k]
    p = replace(BASE, resp=0.5 + 0.5 * s, cab=2.0 - 3.0 * gole + 0.6 * s, vira=0.05,
                bd=(24 + 20 * gole, -60 - 50 * gole, -70 - 45 * gole, "punho"), be=(30.0, -52.0, -58.0, "punho"), pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        pa = r.j["palma_d"]
        cq = Quadro2D((pa[0] - 4.8, pa[1] - 0.6), -10 * gole)
        caneca(t, cq, p.zd + 0.35)
        topo = cq.p(-0.5, -5.4)
        vapor(t, topo[0], topo[1] - 1, k, 3, 14)
        cachecol(t, r, k)
        gorro(t, r, k)
        neve(t, k)
    esqueleto(t, p, ex)
    return t


def q_pergaminho(k):
    s = _sn(k)
    p = replace(BASE, resp=0.5 + 0.5 * s, cab=7.0 + 0.8 * s, cab_dy=1.4, vira=0.15 + 0.15 * _sn(k, desloc=2),
                be=(40.0, -26.0, -60.0, "punho"), bd=(40.0, -26.0, -60.0, "punho"), ze=7.0, zd=7.0, pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        pergaminho(t, r.j["palma_e"], r.j["palma_d"], k, 7.0)
    esqueleto(t, p, ex)
    return t


def q_comemorando(k):
    alt = [-1.6, 3.5, 8.0, 9.0, 6.5, 2.0, -1.4, 0.0][k]     # altura do pulo (negativo = agachado)
    dobra = max(0.0, -alt) / 1.6
    no_ar = max(0.0, alt) / 9.0
    bal = math.sin(k / NQ * TAU * 2)
    p = replace(BASE, y=-max(0.0, alt) + dobra * 1.2, resp=0.5 + 0.5 * no_ar, cab=-2.0 * no_ar + 1.0 * dobra, cab_dy=-0.8 * no_ar,
                be=(116.0 + 6 * bal, 138.0 + 8 * bal, 160.0, "aberta"), bd=(116.0 - 6 * bal, 138.0 - 8 * bal, 160.0, "aberta"),
                pe=(9.0 + 16 * dobra + 12 * no_ar, -4.0 - 20 * dobra - 26 * no_ar), pd=(9.0 + 16 * dobra + 12 * no_ar, -4.0 - 20 * dobra - 26 * no_ar),
                sombra=False, pano=k / NQ * TAU * 1.5)
    t = Tela()
    sombra_em(t, 48.0, 123.2, 15.0 - 5.0 * no_ar, 2.6, 1.0 - 0.45 * no_ar)

    def ex(t, r):
        confete(t, k)
    esqueleto(t, p, ex)
    return t


def q_trofeu(k):
    s = _sn(k)
    ergue = [0.0, 0.6, 1.0, 0.8, 1.0, 0.7, 1.0, 0.4][k]
    p = replace(BASE, resp=0.5 + 0.5 * s, inclina=-2.5, vira=0.25, cab=-3.0 - 1.0 * ergue, cab_dx=-0.4,
                bd=(118.0 + 6 * ergue, 152.0 + 8 * ergue, 176.0, "punho"), be=(46.0 + 4 * ergue, 120.0 + 10 * ergue, 150.0, "punho"),
                zd=9.0, ze=7.2, pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        pd = r.j["palma_d"]
        qt = _escala(Quadro2D((pd[0] + 0.6, pd[1] - 3.2), 4.0 * s), 1.25)
        trofeu(t, qt, 10.0, k)
        topo = qt.p(0, -15.6)
        for j, (dx, dy, tam) in enumerate(((-4.0, -1.0, 2), (5.0, 3.0, 1), (1.0, -4.0, 1))):
            if (k + j * 3) % 8 < 4:
                fase = ((k + j * 3) % 8) / 4
                cintila(t, topo[0] + dx, topo[1] + dy, tam + (1 if fase > 0.3 and fase < 0.8 else 0), "#fff1a8", 0.95 - 0.3 * fase)
    esqueleto(t, p, ex)
    return t


def q_descansando(k):
    s = _sn(k)
    p = replace(BASE, y=12.0, resp=0.5 + 0.5 * s, cab=12.0 + 1.4 * s, cab_dy=1.6 + 0.6 * s, cab_dx=0.6, inclina=2.0 + 0.4 * s,
                pe=(100.0, -80.0), pd=(100.0, -80.0), be=(22.0 + 0.8 * s, -44.0, -70.0, "aberta"), bd=(22.0 + 0.8 * s, -44.0, -70.0, "aberta"),
                ze=7.4, zd=7.4, sombra=False, pano=0.3 * s)
    t = Tela()
    sombra_em(t, 48.0, 122.6, 22.0, 2.8)

    def ex(t, r):
        # canelas cruzadas por cima da barra do saiote e os pés de osso
        for lado, s_ in (("e", -1), ("d", 1)):
            jo = r.j[f"joelho_{lado}"]
            # canelas quase deitadas, uma na frente da outra (de pernas cruzadas), pés saindo pelos lados
            fim = (48.0 - s_ * 4.0, jo[1] + (2.6 if lado == "e" else 1.2))
            osso_longo(t, jo, fim, 1.35, 5.7 + (0.1 if lado == "e" else 0), f"canela_{lado}", nos=(1.35, 1.2), sem=23 if s_ < 0 else 24)
            t.pinta(circulo((jo[0] + s_ * 0.2, jo[1] - 0.2), 1.35), "osso", 5.85, R=1.4, pid=f"joelho_x{lado}")
            pe_ = elipse((fim[0] - s_ * 2.4, fim[1] + 0.2), 3.0, 1.8)
            t.pinta(pe_, "osso", 5.75 + (0.1 if lado == "e" else 0), R=1.6, pid=f"pe_x{lado}", semente=25)
            for j in range(3):
                x = fim[0] - s_ * (3.4 + j * 1.0)
                t.pinta(circulo((x, fim[1] + 1.0 + j * 0.2), 0.7), "osso", 5.8 + (0.1 if lado == "e" else 0), R=0.7, pid=f"dedo_x{lado}")
        # livro fechado no colo
        c = (48.0, 108.6)
        q = Quadro2D(c, -4.0)
        t.pinta(q.forma(caixa((0, 0.8), 8.6, 3.4, r=0.6)), "papel", 6.6, R=1.0, pid="livro_fechado_folhas", tom=-0.1)
        for i in range(3):
            t.pinta(q.forma(capsula((-7.8, 0.4 + i * 1.0), (7.8, 0.4 + i * 1.0), 0.22)), "papel", 0, sobre="livro_fechado_folhas", tom=-0.25, normal=False)
        t.pinta(q.forma(caixa((0, -2.4), 9.2, 2.6, r=0.6)), "capa_livro", 6.7, R=1.6, pid="livro_fechado", plano=(0, -0.5, 0.86), semente=150)
        t.pinta(q.forma(caixa((0, 4.0), 9.2, 0.9, r=0.4)), "capa_livro", 6.65, R=0.8, pid="livro_fechado_baixo")
        t.pinta(q.forma(capsula((3.0, -4.8), (3.6, 5.6), 0.45)), "borracha", 6.75, R=0.5, pid="livro_fita")
        # zz subindo
        for j in range(3):
            fase = ((k + j * 8 / 3) % NQ) / NQ
            x = 82 + fase * 6 + math.sin(fase * TAU) * 1.2
            y = 58 - fase * 24
            zz(t, x, y, 3 + int(fase * 3), 0.95 * (1 - fase ** 2))
    esqueleto(t, p, ex)
    return t


def q_orientando(k):
    s = _sn(k)
    toque = [0.0, 1.0, 0.3, 0.0, 0.0, 1.0, 0.3, 0.0][k]
    p = replace(BASE, resp=0.5 + 0.5 * s, inclina=-1.5, vira=0.45, cab=-2.0 - 1.0 * toque, cab_dx=0.3,
                bd=(90.0 - 3 * toque, 84.0 - 6 * toque, 86.0 - 10 * toque, "punho"), be=(18.0, -34.0, -60.0, "punho"), zd=7.4, ze=7.6, pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        ponteiro(t, mao_quadro(r, "d", 0), p.zd + 0.3)
        pe_ = r.j["palma_e"]
        prancheta(t, _escala(Quadro2D((pe_[0] + 2.4, pe_[1] + 3.0), 10.0), 1.2), p.ze + 0.25)
        if toque > 0.5:
            pt = mao_quadro(r, "d", 0).p(0, 22.0)
            cintila(t, pt[0] + 1, pt[1], 2, "#fff1a8", 0.9)
    esqueleto(t, p, ex)
    return t


def q_ortopedia(k):
    s = _sn(k)
    bate = [0.0, 0.5, 1.0, 0.3, 0.0, 0.5, 1.0, 0.3][k]
    p = replace(BASE, resp=0.5 + 0.5 * s, vira=0.2, cab=1.0 + 0.6 * s,
                bd=(40.0 + 4 * bate, 150.0 - 10 * bate, 170.0 - 30 * bate, "punho"), be=(16.0, 4.0, 2.0, "aberta"), pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        jaleco(t, r, p)
        martelo(t, _escala(mao_quadro(r, "d", 0), 1.6), p.zd + 0.6)
        if bate > 0.9:
            pt = _escala(mao_quadro(r, "d", 0), 1.6).p(0, 12.6)
            cintila(t, pt[0] + 3, pt[1] - 2, 1, "#fff1a8", 0.9)
    esqueleto(t, p, ex)
    return t


# ═══════════════════════════════ linhas novas (01/11/2026): segunda leva de poses ═══════════════════════════════
# Também só acrescentam: nenhuma linha anterior passa por estas funções (materiais novos ficam no fim de MATS).
# ─────────── mão que aponta (novo tipo; mao() original não muda) ───────────
def mao_apontando(t, r, lado, z):
    s = -1 if lado == "e" else 1
    q = mao_quadro(r, lado)
    pid = f"mao_{lado}"
    t.pinta(q.forma(elipse((0, -0.3), 2.1, 2.0)), "osso", z, R=2.0, pid=pid, uv=q.uv(), semente=31)
    for kk, dx in enumerate((-0.55, 0.6, 1.75)):
        t.pinta(q.forma(elipse((dx * -s, 1.9), 0.75, 1.15)), "osso", z + 0.6, R=0.9, pid=pid + "_dedos", semente=41 + kk)
    # indicador esticado
    t.pinta(q.forma(traco([(s * 0.6, 0.8), (s * 0.7, 4.2), (s * 0.8, 7.4)], [0.75, 0.66, 0.62])), "osso", z + 0.7, R=0.8, pid=pid + "_ind", semente=45)
    t.pinta(q.forma(capsula((-s * 1.6, 0.0), (-s * 0.4, 2.2), 0.7)), "osso", z + 0.65, R=0.8, pid=pid + "_dedos")


# ─────────── sentado: canelas e pés por cima da barra do saiote ───────────
def canelas_frente(t, joelhos, pes, z=5.8):
    """Joelhos dobrados para cima (de frente): patela, tíbia descendo até o pé e os dedos."""
    for i, ((jx, jy), (fx, fy)) in enumerate(zip(joelhos, pes)):
        s_ = -1 if jx < 48 else 1
        osso_longo(t, (jx, jy), (fx, fy), 1.35, z + 0.1 * i, f"canela{i}", nos=(1.35, 1.2), sem=23 + i)
        t.pinta(circulo((jx + s_ * 0.2, jy - 0.4), 1.5), "osso", z + 0.15 + 0.1 * i, R=1.5, pid=f"joelho{i}")
        c = (fx + s_ * 1.3, fy + 2.0)
        t.pinta(elipse(c, 3.3, 1.9), "osso", z + 0.2 + 0.1 * i, R=1.8, pid=f"pe{i}", semente=25)
        for kk in range(4):
            x = c[0] + s_ * (-1.6 + kk * 1.3)
            t.pinta(capsula((x, c[1] + 0.2), (x + s_ * 0.25, c[1] + 1.9), 0.55), "osso", z + 0.25 + 0.1 * i, R=0.7, pid=f"dedo_pe{i}", semente=26 + kk)


def coxas_frente(t, quadris, joelhos, z=5.6):
    for i, (a, b) in enumerate(zip(quadris, joelhos)):
        osso_longo(t, a, b, 1.55, z + 0.05 * i, f"coxa{i}", nos=(1.3, 1.35), sem=21 + i)


def tronco_cortado(t, cx, y, larg, z=0.8, k=0):
    """Tronco deitado com casca, um corte à mostra com anéis (à direita) e um tufo de musgo."""
    corpo = caixa((cx, y + 3.4), larg, 3.8, r=3.2)
    t.pinta(corpo, "madeira", z, R=3.4, pid="tronco", semente=510, tom=-0.08,
            relevo=lambda X, Y: (0.0 * X, 0.3 * np.sin(X * 1.7 + np.sin(Y * 0.8))))
    for i in range(5):
        x = cx - larg + 4 + i * (2 * larg - 8) / 4
        t.pinta(capsula((x, y + 0.8), (x + 1.2, y + 6.4), 0.35), "madeira", 0, sobre="tronco", tom=-0.22, normal=False)
    corte = elipse((cx + larg - 0.6, y + 3.4), 2.6, 3.8)
    t.pinta(corte, "madeira", z + 0.2, R=1.2, pid="tronco_corte", tom=0.18, plano=(0.5, 0, 0.86))
    for rr in (2.6, 1.4):
        t.pinta(elipse((cx + larg - 0.6, y + 3.4), rr * 0.68, rr) - elipse((cx + larg - 0.6, y + 3.4), rr * 0.68 - 0.4, rr - 0.4), "madeira", 0, sobre="tronco_corte", tom=-0.15, normal=False)
    t.pinta(elipse((cx - larg + 5, y + 0.4), 3.6, 1.2).borda(0.4, 1.6, 5), "talo", z + 0.1, R=1.0, pid="musgo")


# ─────────── caderno de capa de couro ───────────
def caderno(t, q, z, linhas_feitas: float, abre=1.0):
    """Caderno aberto inclinado para quem olha. Origem no meio da lombada; +y para baixo."""
    uv = q.uv()
    capa_ = poligono([(-13.4, -6.0), (0, -4.8), (13.4, -6.0), (13.8, 6.0), (0, 7.0), (-13.8, 6.0)])
    t.pinta(q.forma(capa_), "capa_livro", z, R=1.0, pid="cad_capa", plano=(0, 0.35, 0.93), semente=520)
    for s_ in (-1, 1):
        pag = poligono([(0, -4.2), (s_ * 5.4, -5.6), (s_ * 11.2, -4.6), (s_ * 11.5, 3.8), (s_ * 5.6, 3.6), (0, 4.8)])
        t.pinta(q.forma(pag), "papel", z + 0.1, R=1.6, pid=f"cad_pag{s_}", plano=(s_ * -0.2, 0.35, 0.9), uv=uv, semente=521, tom=0.1)
    # pauta e o que já foi escrito na página direita (cresce com linhas_feitas)
    for i in range(4):
        y = -2.4 + i * 1.8
        for s_ in (-1, 1):
            t.pinta(q.forma(capsula((s_ * 1.6, y), (s_ * 10.0, y - 0.3), 0.18)), "papel", 0, sobre=f"cad_pag{s_}", tom=-0.12, normal=False)
        # página esquerda: já escrita
        fim = 9.6 - (i % 2) * 2.4
        t.pinta(q.forma(capsula((-1.8, y - 0.35), (-fim, y - 0.65), 0.5)), "tinta", 0, sobre="cad_pag-1", R=0.4)
        feito = np.clip(linhas_feitas - i, 0, 1)
        if feito > 0:
            fx = 1.8 + (8.2 - (i % 2) * 2.2) * feito
            t.pinta(q.forma(capsula((1.8, y - 0.35), (fx, y - 0.6), 0.5)), "tinta", 0, sobre="cad_pag1", R=0.4)
    t.pinta(q.forma(capsula((0, -4.0), (0, 5.0), 0.42)), "papel", z + 0.15, R=0.5, pid="cad_meio", tom=-0.35)
    t.pinta(q.forma(traco([(-0.6, -4.2), (-1.0, 2.0), (-0.4, 8.6)], 0.42)), "pano", z + 0.16, R=0.5, pid="cad_fita")


def ponto_pena(linhas_feitas):
    """Onde a ponta da pena está escrevendo (coord. do caderno)."""
    i = min(3, int(linhas_feitas))
    f = linhas_feitas - i
    y = -2.4 + i * 1.8
    return (1.8 + (8.2 - (i % 2) * 2.2) * f, y - 0.5)


def tinteiro(t, base, z, k):
    """Tinteiro de vidro escuro com rolha, em cima do tronco."""
    x, y = base
    t.pinta(caixa((x, y - 2.4), 2.4, 2.6, r=1.0), "filme", z, R=2.0, pid="tinteiro", tom=0.05)
    t.pinta(caixa((x, y - 5.4), 1.2, 0.8, r=0.3), "filme", z + 0.05, R=0.8, pid="tinteiro_gargalo")
    t.pinta(caixa((x, y - 6.6), 1.0, 0.8, r=0.3), "madeira", z + 0.1, R=0.8, pid="rolha", tom=0.1)
    t.pinta(capsula((x - 1.2, y - 3.8), (x - 1.2, y - 1.4), 0.32), "aco", z + 0.12, pid="tinteiro_brilho", sem_contorno=True, tom=0.5)


def q_escrevendo(k):
    """Sentado num tronco deitado, perna direita cruzada por cima e o caderno apoiado nela."""
    s = _sn(k)
    feitas = 0.6 + k * 0.42
    p = replace(BASE, y=10.0, resp=0.5 + 0.5 * s, cab=6.0 + 0.6 * s, cab_dy=1.2, vira=0.15, inclina=1.0,
                pe=(2.0, 178.0), pd=(2.0, 178.0), be=(4.0, -4.0, -14.0, "punho"), bd=(34.0, -40.0, -64.0, "pinca"),
                ze=6.0, zd=6.0, sombra=False, pano=0.25 * s)
    t = Tela()
    sombra_em(t, 48.0, 124.6, 26.0, 2.4)
    tronco_cortado(t, 46.0, 114.0, 24.0, k=k)

    def ex(t, r):
        P = r.P
        canelas_frente(t, [(P[0] - 10.6, P[1] - 4.2), (P[0] + 10.6, P[1] - 4.6)], [(P[0] - 11.6, 120.2), (P[0] + 12.0, 120.6)])
        tinteiro(t, (72.0, 111.4), 1.2, k)
        cq = _escala(Quadro2D((P[0] + 1.0, P[1] - 10.0), -6.0), 1.1)
        caderno(t, cq, 6.3, feitas)
        pp = cq.p(*ponto_pena(feitas))
        pena(t, (pp[0] + 0.3 * math.sin(k * 2.7), pp[1]), 28.0 + 4 * math.sin(k * 2.2), 8.4)
    esqueleto(t, p, ex)
    return t


# ═════════ aventureiro ═════════
def mochila(t, r, p, z_tras=0.5, grande=False, k=0):
    """Mochila de couro atrás do corpo, aparecendo pelo lado direito e por cima do ombro; alça no ombro direito."""
    q = r.tronco
    uv = q.uv()
    w = 9.0 if not grande else 10.5
    corpo = caixa((9.0, -15.0), w, 11.0, r=3.4)
    t.pinta(q.forma(corpo), "couro", z_tras, R=3.0, pid="mochila", uv=uv, semente=530, tom=-0.04)
    aba = caixa((9.0, -23.4), w + 0.4, 3.6, r=2.4)
    t.pinta(q.forma(aba), "couro", z_tras + 0.1, R=2.0, pid="mochila_aba", uv=uv, semente=531)
    t.pinta(q.forma(capsula((9.0 - w + 1.5, -20.4), (9.0 + w - 1.5, -20.4), 0.35)), "couro", 0, sobre="mochila_aba", tom=0.2, normal=False)
    t.pinta(q.forma(caixa((16.4, -17.0), 1.6, 1.4, r=0.3) - caixa((16.4, -17.0), 0.6, 0.5)), "latao", z_tras + 0.15, R=0.7, pid="mochila_fiv")
    if grande:
        # saco de dormir enrolado embaixo da mochila, aparecendo dos dois lados do quadril
        rolo = capsula((-14.6, -4.2), (19.6, -4.2), 3.0)
        t.pinta(q.forma(rolo), "talo", z_tras - 0.1, R=2.6, pid="rolo", uv=uv, semente=532, tom=0.1)
        for x in (-11.0, 15.6):
            t.pinta(q.forma(caixa((x, -4.2), 0.8, 3.2)), "couro", z_tras - 0.05, R=0.6, pid="rolo_tira")
        t.pinta(q.forma(elipse((19.6, -4.2), 1.4, 2.8)), "talo", z_tras - 0.04, R=1.0, pid="rolo_ponta", tom=0.25)
    # alça no ombro direito (da tela), por cima da clavícula, descendo até a axila
    alca = traco([(5.0, -27.6), (10.4, -26.4), (12.6, -22.0), (12.0, -15.0)], 1.25)
    t.pinta(q.forma(alca), "couro", 7.6, R=1.1, pid="alca", uv=uv, semente=533)
    for i in range(3):
        t.pinta(q.forma(circulo((6.4 + i * 2.2, -27.3 + i * 0.4), 0.35)), "couro", 0, sobre="alca", tom=0.3, normal=False)


def capa_curta(t, r, p, longa=False):
    """Capa de viajante marrom: gola dobrada nos ombros e o pano caindo atrás; balança de leve."""
    q = r.tronco
    uv = q.uv()
    f = p.pano
    fim = 2.0 if not longa else 14.0
    larg = 15.0 if not longa else 18.0
    tras = poligono([(-11.0, -27.0), (11.0, -27.0), (larg - 1.5, -10.0), (larg, fim)] + _barra_rasgada(-larg, larg, fim + 1.0, 9, f, 13, 1.2) + [(-larg + 1.5, -10.0)])
    t.pinta(q.forma(tras), "viagem", 0.3, R=3.0, pid="capa_tras", uv=uv, relevo=_dobras(r.P[0], 0.9, 0.35, f), tom=-0.12, semente=540)
    # gola/capelete por cima dos ombros
    for s_ in (-1, 1):
        man = poligono([(s_ * 2.4, -28.8), (s_ * 12.8, -26.6), (s_ * 15.6, -19.0), (s_ * 15.0, -14.6), (s_ * 12.4, -16.2), (s_ * 10.4, -13.8), (s_ * 7.6, -17.2), (s_ * 4.6, -21.4)])
        t.pinta(q.forma(man), "viagem", 7.4 + 0.02 * s_, R=2.6, pid=f"gola_{s_}", uv=uv, relevo=_dobras(r.P[0], 1.3, 0.3, f), semente=541 + s_)
    # fecho: alfinete de latão
    t.pinta(q.forma(circulo((0, -24.8), 1.4)), "latao", 7.6, R=1.3, pid="broche_v")


def bastao(t, q, z, k, topo="no", chao=24.0):
    """Cajado de caminhada de madeira simples: a mão perto do alto, a ponta no chão. Origem na mão; +y desce."""
    uv = q.uv()
    t.pinta(q.forma(traco([(0.2, chao), (0.0, 12.0), (-0.3, 0.0), (0.2, -9.0)], [0.85, 0.95, 1.0, 1.1])), "madeira", z - 0.2, R=1.1, pid="bastao", uv=uv, semente=550)
    t.pinta(q.forma(circulo((0.8, 11.0), 0.75)), "madeira", z - 0.18, R=0.8, pid="bastao_no", tom=-0.12)
    t.pinta(q.forma(capsula((0.0, -1.6), (0.0, 3.6), 1.35)), "couro", z - 0.15, R=1.0, pid="bastao_tira", semente=552)
    if topo == "gancho":
        t.pinta(q.forma(traco(bezier((0.2, -9.0), (1.2, -15.0), (-4.0, -14.6), 7), [1.1, 1.08, 1.05, 1.0, 0.95, 0.9, 0.85])), "madeira", z - 0.2, R=1.1, pid="bastao_g", semente=551)
    else:
        t.pinta(q.forma(circulo((0.1, -9.6), 1.6).borda(0.3, 1.5, 4)), "madeira", z - 0.19, R=1.4, pid="bastao_g", semente=553, tom=0.05)


def q_aventureiro(k):
    s = _sn(k)
    p = replace(BASE, resp=0.5 + 0.5 * s, cab=-1.5 + 0.5 * s, cab_dy=0.4 * s, vira=-0.25, olhar=(-0.6, 0),
                bd=(30.0, 4.0, 0.0, "punho"), be=(14.0, 4.0, 2.0, "aberta"), zd=8.0, pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        mochila(t, r, p, grande=True, k=k)
        capa_curta(t, r, p, longa=True)
        pd = r.j["palma_d"]
        bastao(t, Quadro2D(pd, -6.0), 9.0, k, topo="gancho", chao=123.5 - pd[1])
    esqueleto(t, p, ex)
    return t


# ═════════ mago2 ═════════
def manto_mago(t, r, p):
    """Manto azul-escuro de borda vermelha por cima da armadura: aberto na frente, gola alta e fecho de latão."""
    q = r.tronco
    uv = q.uv()
    f = p.pano
    tras = poligono([(-11.5, -26.5), (11.5, -26.5), (16.5, -6.0), (18.5, 20.0)] + _barra_rasgada(-18.5, 18.5, 20.6, 10, f, 21, 0.8) + [(-16.5, -6.0)])
    t.pinta(q.forma(tras), "manto", 0.4, R=3.0, pid="manto_tras", uv=uv, relevo=_dobras(r.P[0], 0.9, 0.35, f), tom=-0.12, semente=560)
    t.pinta(q.forma(tras & semiplano((0, 17.6), (0, -1))), "pano", 0, sobre="manto_tras", R=1.0, tom=-0.05)
    for s_ in (-1, 1):
        ext = [(s_ * 3.0, -27.6), (s_ * 12.8, -25.0), (s_ * 15.4, -14.0), (s_ * 17.8, 6.0), (s_ * 18.6, 19.6)]
        bx = [(s_ * (18.6 - i * 2.0), 19.8 + (0.6 if i % 2 else -0.2) + 0.5 * math.sin(f + i)) for i in range(6)]
        intr = [(s_ * 8.6, 19.6), (s_ * 9.0, 6.0), (s_ * 7.6, -6.0), (s_ * 5.6, -16.0), (s_ * 3.6, -23.0)]
        pai = poligono(ext + bx + intr)
        t.pinta(q.forma(pai), "manto", 5.9, R=2.6, pid=f"manto_{s_}", uv=uv, relevo=_dobras(r.P[0] + s_ * 3, 1.05, 0.4, f * 0.6 + s_), semente=561 + s_,
                tom=lambda X, Y: -0.08 * np.clip((Y - r.P[1]) / 20, 0, 1))
        borda = poligono([(s_ * 3.6, -23.0), (s_ * 5.6, -16.0), (s_ * 7.6, -6.0), (s_ * 9.0, 6.0), (s_ * 8.6, 19.6), (s_ * 10.6, 19.8),
                          (s_ * 11.0, 6.0), (s_ * 9.6, -6.0), (s_ * 7.6, -16.0), (s_ * 5.8, -23.6)])
        t.pinta(q.forma(borda), "pano", 5.95, R=1.0, pid=f"manto_{s_}", sobre=f"manto_{s_}")
        barra = pai & semiplano((0, 17.4), (0, -1))
        t.pinta(q.forma(barra), "pano", 5.95, R=1.0, pid=f"manto_{s_}", sobre=f"manto_{s_}")
        gola = poligono([(s_ * 2.0, -28.6), (s_ * 9.6, -30.4), (s_ * 13.4, -26.0), (s_ * 12.0, -22.6), (s_ * 4.0, -23.4)])
        t.pinta(q.forma(gola), "manto", 7.1, R=2.4, pid=f"gola_m{s_}", uv=uv, semente=565 + s_)
        t.pinta(q.forma(gola - gola.engrossa(-1.0)), "pano", 0, sobre=f"gola_m{s_}", R=0.8)
    t.pinta(q.forma(circulo((0, -24.6), 1.7)), "latao", 7.3, R=1.6, pid="fecho")
    t.pinta(q.forma(circulo((0, -24.6), 0.7)), "gema", 7.35, pid="fecho", tom=0.6, sem_contorno=True)
    for lado, s_ in (("e", -1), ("d", 1)):
        om, co, pu = r.j[f"ombro_{lado}"], r.j[f"cotovelo_{lado}"], r.j[f"punho_{lado}"]
        z = (p.ze if lado == "e" else p.zd) + 0.35
        ang = math.atan2(pu[1] - co[1], pu[0] - co[0])
        fim = (pu[0] - math.cos(ang) * 0.8, pu[1] - math.sin(ang) * 0.8)
        manga = capsula(om, co, 3.0, 2.9) | capsula(co, fim, 2.9, 3.5)
        t.pinta(manga, "manto", z, R=2.8, pid=f"mmanga_{lado}", relevo=_dobras(om[0], 1.3, 0.25, f), semente=567)
        t.pinta(capsula((fim[0] - math.cos(ang) * 1.2, fim[1] - math.sin(ang) * 1.2), fim, 3.6), "pano", z + 0.02, R=1.2, pid=f"mpunho_{lado}")


def chapeu_torto(t, r, k, z=9.0):
    """Chapéu pontudo azul com a ponta dobrada para a esquerda e remendo; faixa vermelha."""
    q = r.cab
    uv = q.uv()
    bal = 0.7 * _sn(k)
    cone = poligono([(-15.0, -21.4), (-11.0, -31.0), (-5.0, -39.0), (1.4, -44.6), (-2.0 + bal, -48.2), (-9.6 + bal * 1.4, -49.4),
                     (-14.4 + bal * 1.6, -46.4), (-10.6 + bal, -46.0), (-4.6 + bal * 0.5, -43.6), (6.0, -35.0), (12.0, -28.0), (15.4, -21.4)])
    t.pinta(q.forma(cone.suave(circulo((-13.4 + bal * 1.5, -47.4), 1.6), 0.8)), "chapeu", z, R=4.0, pid="chapeu", uv=uv, semente=570,
            relevo=lambda X, Y: (0.22 * np.sin((X - q.o[0]) * 0.7), 0.0 * X))
    t.pinta(q.forma(elipse((-3.2 + bal, -44.6), 3.4, 1.6, ang=20)), "chapeu", 0, sobre="chapeu", tom=-0.22, normal=False)
    t.pinta(q.forma(traco([(-11.6, -24.0), (-7.8, -33.0), (-2.4, -40.0)], 0.9)), "chapeu", 0, sobre="chapeu", tom=0.12, normal=False)
    # remendo costurado
    t.pinta(q.forma(caixa((5.4, -31.0), 2.6, 2.2, r=0.4, ang=12)), "viagem", z + 0.05, R=0.8, pid="remendo")
    for (x, y) in ((3.2, -32.6), (7.6, -29.6), (3.6, -29.2), (7.2, -33.0)):
        t.pinta(q.forma(circulo((x, y), 0.3)), "papel", 0, sobre="remendo", tom=-0.1, normal=False)
    aba = elipse((0.4, -20.6), 25.2, 4.4, ang=-4)
    t.pinta(q.forma(aba), "chapeu", z + 0.2, R=2.2, pid="chapeu_aba", uv=uv, semente=571)
    t.pinta(q.forma(elipse((0.4, -21.8), 16.5, 2.2, ang=-3)), "chapeu", 0, sobre="chapeu_aba", tom=-0.2, normal=False)
    t.pinta(q.forma(cone & (semiplano((0, -22.8), (0, 1)) - semiplano((0, -26.2), (0, 1)))), "pano", z + 0.1, R=1.0, pid="chapeu_faixa")


def cajado_gema(t, q, z, k):
    """Cajado de madeira nodosa com a ponta enrolada em volta de uma pequena gema verdete. Origem na mão."""
    uv = q.uv()
    pulso = 0.5 + 0.5 * _sn(k)
    t.pinta(q.forma(traco([(0.2, 31.0), (0.0, 10.0), (-0.4, -12.0), (0.3, -30.0), (0.0, -37.0)], [0.95, 1.0, 1.05, 1.1, 1.15])), "madeira", z - 0.2, R=1.1,
            pid="cajado", uv=uv, semente=580)
    for y in (-6.0, -3.6, -1.2):
        t.pinta(q.forma(capsula((-1.4, y - 0.6), (1.4, y + 0.6), 0.5)), "couro", z - 0.15, R=0.6, pid="cajado_tira")
    t.pinta(q.forma(circulo((-0.9, -18.0), 0.8) | circulo((0.9, 6.0), 0.7)), "madeira", z - 0.18, R=0.8, pid="cajado_no", tom=-0.1)
    # gancho de madeira em espiral em volta da gema
    esp = bezier((0.0, -37.0), (5.6, -42.0), (2.6, -47.4), 7) + bezier((2.6, -47.4), (-2.6, -50.4), (-4.2, -45.0), 6)[1:] + bezier((-4.2, -45.0), (-4.6, -41.0), (-1.4, -41.6), 5)[1:]
    t.pinta(q.forma(traco(esp, [1.15 - 0.04 * i for i in range(len(esp))])), "madeira", z + 0.1, R=0.9, pid="cajado_esp", semente=581)
    gem = poligono([(0.0, -47.0), (1.8, -44.6), (0.0, -42.2), (-1.8, -44.6)]).suave(circulo((0, -44.6), 1.5), 0.5)
    cx, cy = q.p(0, -44.6)
    t.pinta(q.forma(gem), "gema", z, pid="gema", tom=lambda X, Y: np.clip(0.5 + 0.3 * pulso - 0.1 * (X - cx) - 0.08 * (Y - cy), 0.1, 1.0))
    t.pinta(q.forma(circulo((-0.6, -45.4), 0.45)), "gema", z + 0.05, pid="gema", tom=1.0, sem_contorno=True)
    t.luz(cx, cy, 8.0, "#62e0b0", 22.0, 0.25 + 0.2 * pulso)


def q_mago2(k):
    s = _sn(k)
    p = replace(BASE, resp=0.5 + 0.5 * s, cab=-1.0 + 0.7 * s, vira=0.0, inclina=-0.8,
                bd=(44.0, 24.0, 10.0, "punho"), be=(30.0 + 3 * s, -24.0 + 5 * s, -40.0, "aberta"), zd=8.2, pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        manto_mago(t, r, p)
        cajado_gema(t, Quadro2D(r.j["palma_d"], 3.0 + 0.6 * s), 9.6, k)
        chapeu_torto(t, r, k)
        pe_ = r.j["palma_e"]
        if k in (2, 3, 6):
            cintila(t, pe_[0] - 2, pe_[1] - 4 - (k % 2), 1, "#a8f0cc", 0.8)
    esqueleto(t, p, ex)
    return t


# ═════════ quadro ═════════
def lousa(t, q, z, k):
    """Lousinha de giz com moldura de madeira e 3 linhas (uma dica), virada para quem olha. Origem no centro."""
    uv = q.uv()
    t.pinta(q.forma(caixa((0, 0), 11.0, 8.4, r=1.0)), "madeira", z, R=1.2, pid="lousa_moldura", uv=uv, semente=590)
    t.pinta(q.forma(caixa((0, 0.2), 9.0, 6.6, r=0.4)), "lousa", z + 0.05, R=-0.8, pid="lousa", uv=uv, semente=591)
    linhas = [(-6.6, -3.4, 5.0), (-6.6, -0.2, 6.4), (-6.6, 3.0, 2.0)]
    for i, (xa, y, xb) in enumerate(linhas):
        t.pinta(q.forma(traco([(xa, y), ((xa + xb) / 2, y - 0.3), (xb, y + 0.1)], 0.5)), "giz", z + 0.08, pid="giz", sem_contorno=True, tom=0.6 - 0.1 * i)
    # marquinhas de tópico e um visto vermelho
    for (x, y) in ((-7.6, -3.4), (-7.6, -0.2), (-7.6, 3.0)):
        t.pinta(q.forma(circulo((x, y), 0.55)), "giz", z + 0.08, pid="giz", sem_contorno=True, tom=0.75)
    t.pinta(q.forma(traco([(3.4, 3.4), (4.4, 4.4), (6.6, 1.6)], 0.5)), "pano", z + 0.09, pid="giz_v", sem_contorno=True, tom=0.4)
    # poeira de giz na borda
    t.pinta(q.forma(elipse((4, 6.0), 4.0, 0.6)), "lousa", 0, sobre="lousa", tom=0.18, normal=False)
    for (x, y) in ((-10.0, -7.4), (10.0, -7.4), (-10.0, 7.4), (10.0, 7.4)):
        t.pinta(q.forma(circulo((x, y), 0.5)), "latao", z + 0.06, R=0.5, pid="lousa_preg", sem_contorno=True)


def q_quadro(k):
    """Lousa de giz verde-escura na mão esquerda, na altura do peito; a direita aponta com o indicador."""
    s = _sn(k)
    toque = [0.0, 0.4, 1.0, 0.4, 0.0, 0.4, 1.0, 0.4][k]
    p = replace(BASE, resp=0.5 + 0.5 * s, vira=0.25, cab=-1.0 + 0.5 * s, inclina=-1.0,
                be=(30.0, -40.0, -70.0, "punho"), bd=(50.0 - 3 * toque, -60.0 + 6 * toque, -92.0 + 4 * toque, "punho"), ze=7.0, zd=9.6, pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        pe_ = r.j["palma_e"]
        lousa(t, Quadro2D((pe_[0] + 6.0, pe_[1] - 3.0), -4.0 + 0.6 * s), 7.6, k)
        mao_apontando(t, r, "d", p.zd + 0.6)
        if toque > 0.9:
            pt = mao_quadro(r, "d").p(0.8, 8.0)
            cintila(t, pt[0] - 2, pt[1] - 1, 1, "#fff1a8", 0.8)
    esqueleto(t, p, ex)
    return t


# ═════════ fogueira (esqueleto) ═════════
def luz_fogo(t, k, forca=1.5, y=104.0):
    t.luz(-14.0, y, 30.0, "#ff8a2a", 120.0, forca + 0.22 * math.sin(k * 2.3) + 0.1 * math.sin(k * 5.1))


def brasas(t, k, x0=4.0, y0=118.0):
    for j in range(4):
        fy = (k * 3 + j * 7) % 26
        x = x0 + math.sin(fy * 0.45 + j) * 2.5 + j * 2.0
        y = y0 - fy * 2.2
        if fy < 22:
            t.ponto_fx(x, y, "#ffd27a" if fy < 9 else "#ff8a3a", 0.85 - fy / 30)


def q_fogueira(k):
    """Sentado de pernas cruzadas, as duas mãos estendidas para a esquerda (o fogo)."""
    s = _sn(k)
    p = replace(BASE, y=12.0, x=6.0, resp=0.5 + 0.5 * s, inclina=-4.0, vira=-0.6, cab=-1.0 + 0.6 * s, olhar=(-1.4, 1.0),
                pe=(100.0, -80.0), pd=(100.0, -80.0),
                be=(50.0 + 2 * s, 74.0, 150.0, "aberta"), bd=(-24.0, -96.0, -170.0, "aberta"), ze=8.6, zd=10.5, sombra=False, pano=0.3 * s)
    t = Tela()
    sombra_em(t, 54.0, 122.6, 22.0, 2.8)
    luz_fogo(t, k)

    def ex(t, r):
        for lado, s_ in (("e", -1), ("d", 1)):
            jo = r.j[f"joelho_{lado}"]
            fim = (r.P[0] - s_ * 4.0, jo[1] + (2.6 if lado == "e" else 1.2))
            osso_longo(t, jo, fim, 1.35, 5.7 + (0.1 if lado == "e" else 0), f"canela_{lado}", nos=(1.35, 1.2), sem=23 if s_ < 0 else 24)
            t.pinta(circulo((jo[0] + s_ * 0.2, jo[1] - 0.2), 1.35), "osso", 5.85, R=1.4, pid=f"joelho_x{lado}")
            t.pinta(elipse((fim[0] - s_ * 2.4, fim[1] + 0.2), 3.0, 1.8), "osso", 5.75 + (0.1 if lado == "e" else 0), R=1.6, pid=f"pe_x{lado}", semente=25)
        brasas(t, k)
    esqueleto(t, p, ex)
    return t


# ═════════ carinho ═════════
def q_carinho(k):
    """Agachado, a mão direita estendida para baixo à direita fazendo carinho (o gato fica fora do quadro)."""
    s = _sn(k)
    afaga = math.sin(k / NQ * TAU * 2)
    p = replace(BASE, y=16.0, x=-10.0, resp=0.5 + 0.5 * s, inclina=16.0, vira=0.5, cab=2.0 + 0.6 * s, cab_dx=0.6, olhar=(1.2, 1.4),
                pe=(2.0, 178.0), pd=(2.0, 178.0),
                bd=(38.0 + 3 * afaga, 40.0 + 8 * afaga, 62.0 + 12 * afaga, "aberta"), be=(10.0, -40.0, -50.0, "aberta"), ze=7.6, zd=8.0, sombra=False, pano=0.4 * s)
    t = Tela()
    sombra_em(t, 44.0, 123.6, 24.0, 2.6)

    def ex(t, r):
        P = r.P
        joelhos = [(P[0] - 13.4, P[1] - 7.0), (P[0] + 12.0, P[1] - 5.4)]
        coxas_frente(t, [(P[0] - 4.6, P[1] + 1.0), (P[0] + 4.6, P[1] + 1.4)], joelhos)
        canelas_frente(t, joelhos, [(P[0] - 14.6, 120.8), (P[0] + 14.0, 121.2)])
    esqueleto(t, p, ex)
    return t


# ═════════ comemora2 (toca uma vez) ═════════
def q_comemora2(k):
    """Reação curta: parado → agacha → pula erguendo o punho → aterrissa → parado. Quadros 0 e 7 = parado (quadro 0)."""
    if k in (0, 7):
        return q_parado(0)
    alt = {1: -1.6, 2: 5.0, 3: 8.0, 4: 6.0, 5: -1.2, 6: -0.3}[k]
    dobra = max(0.0, -alt) / 1.6
    no_ar = max(0.0, alt) / 8.0
    punho = {1: 0.1, 2: 0.7, 3: 1.0, 4: 1.0, 5: 0.45, 6: 0.15}[k]
    p = replace(BASE, y=-max(0.0, alt) + dobra * 1.2, resp=0.5 + 0.5 * no_ar, cab=-2.5 * no_ar + 1.0 * dobra, cab_dy=-0.6 * no_ar + 0.5 * dobra,
                vira=0.0, olhar=(0.0, -0.6 * no_ar),
                be=(14.0 + 112 * punho, 4.0 + 134 * punho, 2.0 + 156 * punho, "punho" if punho > 0.3 else "aberta"),
                bd=(12.0 + 16 * no_ar, 2.0 + 20 * no_ar, 0.0, "punho"),
                pe=(9.0 + 16 * dobra + 10 * no_ar, -4.0 - 20 * dobra - 22 * no_ar), pd=(9.0 + 16 * dobra + 10 * no_ar, -4.0 - 20 * dobra - 22 * no_ar),
                sombra=False, pano=k * 0.9, ze=6.0 if punho < 0.5 else 8.0)
    t = Tela()
    sombra_em(t, 48.0, 123.2, 15.0 - 5.0 * no_ar, 2.6, 1.0 - 0.45 * no_ar)

    def ex(t, r):
        espada(t, mao_quadro(r, "d", -4 - 10 * no_ar), p.zd + 0.3)
        if k in (3, 4):
            pe_ = r.j["palma_e"]
            for j, (dx, dy) in enumerate(((-6, -3), (5, -5), (-2, -8))):
                if (j + k) % 2 == 0 or k == 3:
                    cintila(t, pe_[0] + dx, pe_[1] + dy, 1, "#fff1a8", 0.85)
    esqueleto(t, p, ex)
    return t


# ═══════════════════════════════ tela de entrar (31/10/2026): jaleco longo e traje social ═══════════════════════════════
# Só acrescentam: o esqueleto é o mesmo (mesmo rig, mesmo crânio), mas sem a armadura por fora.
def esqueleto_vestido(t: Tela, p: Pose, roupa, extras=None) -> Rig:
    """O mesmo esqueleto de esqueleto(), com uma roupa no lugar da armadura (pernas, tronco e braços de osso por baixo)."""
    r = montar(p)
    t.origem = r.raiz
    if p.sombra:
        sombra_chao(t, r)
    for lado in ("e", "d"):
        perna(t, r, p, lado)
    tronco(t, r, p)
    for lado in ("e", "d"):
        braco(t, r, p, lado)
    roupa(t, r, p)
    cranio(t, r, p)
    if extras:
        extras(t, r)
    return r


def _calcas(t, r, mat, z=2.9, larg=(2.7, 2.35), barra=None, semente=600, tom=0.0):
    """Calças por cima dos ossos das pernas, do quadril ao tornozelo; o vinco da frente em decalque."""
    q = r.tronco
    t.pinta(q.forma(caixa((0, 1.6), 7.4, 3.0, r=2.0)), mat, z, R=2.4, pid="calca_cos", uv=q.uv(), semente=semente)
    for lado, s in (("e", -1), ("d", 1)):
        qd, jo, to = r.j[f"quadril_{lado}"], r.j[f"joelho_{lado}"], r.j[f"tornozelo_{lado}"]
        fim = (to[0], to[1] + 0.6)
        f = capsula(qd, jo, larg[0] + 0.3, larg[0]) | capsula(jo, fim, larg[0], larg[1])
        t.pinta(f, mat, z + 0.05, R=2.2, pid=f"calca_{lado}", semente=semente + 1 + (s > 0), tom=tom,
                relevo=lambda X, Y, cx=jo[0]: (0.12 * np.sin((X - cx) * 1.6), 0.0 * X))
        # vinco e sombra de dentro da perna
        t.pinta(capsula((jo[0] + s * 0.4, jo[1] - 5.0), (fim[0] + s * 0.3, fim[1] - 1.0), 0.32), mat, 0, sobre=f"calca_{lado}", tom=0.12, normal=False)
        t.pinta(capsula((jo[0] - s * 2.2, jo[1] - 6.0), (fim[0] - s * 1.8, fim[1] - 1.0), 0.5), mat, 0, sobre=f"calca_{lado}", tom=-0.14, normal=False)
        if barra:
            t.pinta(capsula((fim[0] - 2.5, fim[1] - 0.6), (fim[0] + 2.5, fim[1] - 0.6), 0.7), barra, 0, sobre=f"calca_{lado}", tom=-0.05, normal=False)


def _sapatos(t, r, mat, z=3.2, social=False):
    """Um sapato em cada pé (cobre os ossinhos do pé). social=True: bico fino e salto; senão, tamanco clínico."""
    for lado, s in (("e", -1), ("d", 1)):
        to = r.j[f"tornozelo_{lado}"]
        c = (to[0] + s * 1.6, to[1] + 2.6)
        if social:
            f = elipse((c[0] + s * 0.4, c[1] + 0.2), 4.0, 1.9).suave(elipse((c[0] - s * 1.0, c[1] - 0.8), 2.4, 1.8), 1.0)
        else:
            f = caixa((c[0] + s * 0.3, c[1]), 3.9, 2.1, r=1.8)
        t.pinta(f, mat, z, R=1.8, pid=f"sapato_{lado}", plano=(0.0, -0.25, 0.97), semente=610)
        # sola escura e um reflexo no bico
        t.pinta(caixa((c[0] + s * 0.3, c[1] + 1.7), 4.2, 0.5), mat, 0, sobre=f"sapato_{lado}", tom=-0.35, normal=False)
        if social:
            t.pinta(capsula((c[0] + s * 1.6, c[1] - 0.6), (c[0] + s * 3.0, c[1] - 0.3), 0.36), mat, 0, sobre=f"sapato_{lado}", tom=0.35, normal=False)


def _manga(t, r, p, lado, mat, larg=2.75, punho_mat=None, semente=620):
    """Manga longa até perto do punho (a mão de osso fica de fora), com o punho dobrado ou da camisa."""
    om, co, pu = r.j[f"ombro_{lado}"], r.j[f"cotovelo_{lado}"], r.j[f"punho_{lado}"]
    z = (p.ze if lado == "e" else p.zd) + 0.35
    ang = math.atan2(pu[1] - co[1], pu[0] - co[0])
    dx, dy = math.cos(ang), math.sin(ang)
    fim = (pu[0] - dx * 1.4, pu[1] - dy * 1.4)
    manga = capsula(om, co, larg + 0.35, larg) | capsula(co, fim, larg, larg + 0.1)
    t.pinta(manga, mat, z, R=2.4, pid=f"rmanga_{lado}", semente=semente)
    # dobra do cotovelo
    t.pinta(capsula((co[0] - dx * 1.2, co[1] - dy * 1.2), (co[0] + dx * 0.6, co[1] + dy * 0.6), 0.45), mat, 0, sobre=f"rmanga_{lado}", tom=-0.16, normal=False)
    if punho_mat:
        a = (fim[0] - dx * 0.2, fim[1] - dy * 0.2)
        b = (fim[0] + dx * 0.9, fim[1] + dy * 0.9)
        t.pinta(capsula(a, b, larg - 0.5), punho_mat, z + 0.02, R=1.2, pid=f"rpunho_{lado}", tom=0.02)
    else:
        t.pinta(capsula((fim[0] - dx * 1.0, fim[1] - dy * 1.0), fim, larg + 0.2), mat, z + 0.02, R=1.2, pid=f"rpunho_{lado}", tom=-0.04)


def livro_fechado(t: Tela, q: Quadro2D, z: float, mat: str, emblema="osso"):
    """Livro fechado de pé, segurado pela lombada no alto. Origem na mão; +y desce. Sem texto: só o emblema."""
    uv = q.uv()
    # bloco de folhas aparecendo na borda da frente e embaixo
    t.pinta(q.forma(caixa((0.9, 6.8), 4.4, 6.6, r=0.6)), "papel", z - 0.05, R=0.8, pid="livrof_folhas", tom=-0.08)
    capa_f = caixa((0.0, 6.4), 4.6, 6.8, r=0.9)
    t.pinta(q.forma(capa_f), mat, z, R=1.6, pid="livrof", uv=uv, plano=(-0.15, -0.05, 0.98), semente=630)
    # lombada (lado da mão) mais escura, com dois nervos dourados
    t.pinta(q.forma(caixa((-3.7, 6.4), 0.9, 6.8)), mat, 0, sobre="livrof", tom=-0.22, normal=False)
    for y in (1.6, 11.2):
        t.pinta(q.forma(caixa((-3.4, y), 1.2, 0.35)), "latao", z + 0.02, R=0.4, pid="livrof_nervo", sem_contorno=True, tom=0.05)
    # filete dourado no alto e embaixo da capa e o emblema
    for y in (1.0, 11.8):
        t.pinta(q.forma(caixa((0.9, y), 3.0, 0.3)), "latao", 0, sobre="livrof", tom=-0.12, normal=False)
    if emblema == "osso":
        # um ossinho cor de osso em diagonal no meio da capa (ortopedia, sem texto)
        qe = Quadro2D(q.p(0.9, 6.6), q.ang - 55)
        f = capsula((-2.1, 0), (2.1, 0), 0.6)
        for x in (-2.4, 2.4):
            f = f | circulo((x, -0.8), 0.85) | circulo((x, 0.8), 0.85)
        t.pinta(qe.forma(f), "osso", z + 0.05, R=0.9, pid="livrof_emb", tom=0.12)
    else:
        t.pinta(q.forma(circulo((0.6, 6.4), 1.3) - circulo((0.6, 6.4), 0.6)), "latao", z + 0.05, R=0.6, pid="livrof_emb", sem_contorno=True)


def _aceno(k):
    """Laço calmo de boas-vindas: braço erguido só nos quadros 2 a 5, com um aceno curto; quadro 7 já de volta à pose."""
    ergue = [0.0, 0.4, 1.0, 1.0, 1.0, 1.0, 0.45, 0.0][k]
    onda = [0.0, 0.0, -1.0, 0.7, -1.0, 0.5, 0.0, 0.0][k]
    a1 = 14.0 + (104.0 - 14.0) * ergue
    a2 = 6.0 + (150.0 - 6.0) * ergue ** 0.6 + 12.0 * onda
    a3 = 4.0 + (158.0 - 4.0) * ergue ** 0.6 + 16.0 * onda
    return ergue, (a1, a2, a3, "aberta")


def roupa_jaleco(t: Tela, r: Rig, p: Pose):
    """Jaleco branco longo (até o joelho), aberto sobre o uniforme verde; gola, bolso com caneta e crachá dourado.
    (O estetoscópio foi testado e saiu: a 1x virava risco escuro no peito; o livro de ortopedia na mão lê melhor.)"""
    q = r.tronco
    uv = q.uv()
    _calcas(t, r, "uniforme", larg=(2.7, 2.4), tom=-0.12)
    _sapatos(t, r, "tamanco")
    # blusa do uniforme com decote em V (aparecem as clavículas e a ponta do esterno)
    blusa = caixa((0, -11.8), 10.4, 16.0, r=3.0) - poligono([(-3.2, -28.6), (3.2, -28.6), (0.0, -20.2)])
    t.pinta(q.forma(blusa), "uniforme", 5.4, R=3.0, pid="blusa", uv=uv, semente=640)
    t.pinta(q.forma(traco([(-3.4, -27.8), (0.0, -20.0), (3.4, -27.8)], 0.55)), "uniforme", 0, sobre="blusa", tom=0.16, normal=False)
    # abas do jaleco: dos ombros até o joelho, abertas no meio
    for s_ in (-1, 1):
        aba = poligono([(s_ * 2.8, -27.8), (s_ * 11.0, -26.0), (s_ * 12.6, -19.0), (s_ * 12.4, -8.0), (s_ * 13.4, 2.0),
                        (s_ * 14.4, 10.6), (s_ * 9.0, 11.4), (s_ * 5.0, 11.0), (s_ * 4.2, 0.0), (s_ * 4.0, -10.0), (s_ * 3.4, -19.0)])
        t.pinta(q.forma(aba), "jaleco", 5.9 + 0.01 * s_, R=2.6, pid=f"jal_{s_}", uv=uv, semente=650 + s_,
                relevo=lambda X, Y, s_=s_: (0.16 * np.sin((X - r.P[0]) * 1.0 + s_ * 1.3 + Y * 0.08), 0.0 * X),
                tom=lambda X, Y: -0.05 * np.clip((Y - r.P[1] + 6) / 16, 0, 1))
        # beira de dentro da aba com uma linha de sombra (espessura do tecido)
        t.pinta(q.forma(traco([(s_ * 3.6, -19.0), (s_ * 4.2, -10.0), (s_ * 4.4, 0.0), (s_ * 5.2, 11.0)], 0.45)), "jaleco", 0, sobre=f"jal_{s_}", tom=-0.2, normal=False)
        # costura lateral e bolso de baixo
        t.pinta(q.forma(caixa((s_ * 9.2, 2.6), 2.8, 0.38)), "jaleco", 0, sobre=f"jal_{s_}", tom=-0.22, normal=False)
        t.pinta(q.forma(capsula((s_ * 6.6, 2.4), (s_ * 6.8, 7.4), 0.3)), "jaleco", 0, sobre=f"jal_{s_}", tom=-0.12, normal=False)
        t.pinta(q.forma(capsula((s_ * 11.8, 2.4), (s_ * 12.4, 7.0), 0.3)), "jaleco", 0, sobre=f"jal_{s_}", tom=-0.12, normal=False)
        # lapela larga dobrada (gola com o entalhe)
        lap = poligono([(s_ * 2.4, -28.2), (s_ * 7.8, -27.0), (s_ * 7.2, -23.6), (s_ * 8.8, -22.4), (s_ * 4.8, -14.6), (s_ * 3.4, -19.4)])
        t.pinta(q.forma(lap), "jaleco", 6.05, R=1.2, pid=f"jlap_{s_}", plano=(s_ * 0.35, -0.15, 0.92), tom=0.03)
        t.pinta(q.forma(traco([(s_ * 7.2, -23.6), (s_ * 8.8, -22.4), (s_ * 4.8, -14.6)], 0.4)), "jaleco", 0, sobre=f"jal_{s_}", tom=-0.3, normal=False)
    # bolso do peito (lado direito da tela) com caneta azul de clip dourado
    t.pinta(q.forma(caixa((8.4, -12.6), 2.6, 2.4, r=0.4)), "jaleco", 0, sobre="jal_1", tom=-0.08, normal=False)
    t.pinta(q.forma(caixa((8.4, -14.6), 2.7, 0.4)), "jaleco", 0, sobre="jal_1", tom=-0.24, normal=False)
    t.pinta(q.forma(caixa((7.6, -15.8), 0.6, 1.8, r=0.3)), "tala", 6.1, R=0.6, pid="caneta")
    t.pinta(q.forma(caixa((7.6, -17.4), 0.65, 0.5, r=0.2)), "latao", 6.15, R=0.4, pid="caneta_ponta", sem_contorno=True)
    # crachá dourado sem texto, preso no peito do outro lado
    t.pinta(q.forma(caixa((8.6, -9.4), 1.9, 1.5, r=0.4)), "latao", 6.12, R=0.9, pid="cracha", plano=(0.1, -0.1, 0.98))
    t.pinta(q.forma(caixa((8.6, -11.4), 0.45, 0.8)), "latao", 6.1, R=0.4, pid="cracha_clip", sem_contorno=True, tom=-0.15)
    for lado in ("e", "d"):
        _manga(t, r, p, lado, "jaleco", semente=660)


def roupa_social(t: Tela, r: Rig, p: Pose):
    """Blazer verde com botões dourados, camisa clara, gravata-borboleta vinho, calça social e sapatos."""
    q = r.tronco
    uv = q.uv()
    _calcas(t, r, "calca", larg=(2.6, 2.3))
    _sapatos(t, r, "sapato", social=True)
    # camisa clara (aparece no V das lapelas)
    t.pinta(q.forma(caixa((0, -14.0), 9.6, 13.6, r=3.0)), "camisa", 5.4, R=3.0, pid="camisa", uv=uv, semente=670, tom=0.14)
    t.pinta(q.forma(capsula((0.0, -24.0), (0.0, -8.0), 0.3)), "camisa", 0, sobre="camisa", tom=-0.18, normal=False)
    for y in (-19.6, -15.4):
        t.pinta(q.forma(circulo((0.9, y), 0.38)), "camisa", 0, sobre="camisa", tom=-0.3, normal=False)
    # colarinho
    for s_ in (-1, 1):
        t.pinta(q.forma(poligono([(s_ * 0.6, -28.0), (s_ * 4.8, -28.6), (s_ * 3.6, -24.6), (s_ * 0.8, -25.6)])), "camisa", 6.3, R=0.9, pid=f"colar_{s_}", tom=0.04)
    # blazer: duas abas que se fecham num botão na cintura, lapelas pontudas
    for s_ in (-1, 1):
        aba = poligono([(s_ * 2.8, -27.8), (s_ * 11.4, -26.2), (s_ * 12.8, -19.0), (s_ * 12.2, -8.0), (s_ * 12.4, 2.0),
                        (s_ * 11.2, 5.6), (s_ * 4.0, 6.2), (s_ * -0.6, 2.6), (s_ * -0.4, -8.4), (s_ * 1.4, -12.0), (s_ * 2.6, -20.0)])
        t.pinta(q.forma(aba), "blazer", 5.9 + 0.02 * s_, R=2.6, pid=f"blz_{s_}", uv=uv, semente=680 + s_,
                relevo=lambda X, Y, s_=s_: (0.14 * np.sin((X - r.P[0]) * 1.1 + s_ + Y * 0.07), 0.0 * X),
                tom=lambda X, Y: -0.04 * np.clip((Y - r.P[1] + 8) / 14, 0, 1))
        # pences e bolso com lapela embaixo
        t.pinta(q.forma(caixa((s_ * 8.2, 0.8), 2.6, 0.4)), "blazer", 0, sobre=f"blz_{s_}", tom=-0.22, normal=False)
        lap = poligono([(s_ * 2.6, -28.4), (s_ * 7.0, -27.0), (s_ * 7.8, -24.2), (s_ * 10.4, -23.8), (s_ * 1.2, -11.4), (s_ * 2.4, -20.0)])
        t.pinta(q.forma(lap), "blazer", 6.1, R=1.2, pid=f"blap_{s_}", plano=(s_ * 0.4, -0.2, 0.9), tom=0.06)
        t.pinta(q.forma(traco([(s_ * 7.8, -24.2), (s_ * 10.4, -23.8), (s_ * 1.6, -11.8)], 0.32)), "blazer", 0, sobre=f"blap_{s_}", tom=0.18, normal=False)
    # botões dourados: um que fecha na cintura e o de baixo; lenço dourado no bolso do peito
    for y in (-8.4, -2.6):
        t.pinta(q.forma(circulo((0.6, y), 0.95)), "latao", 6.3, R=0.9, pid="blz_botao")
    t.pinta(q.forma(caixa((8.2, -14.4), 2.6, 0.35)), "blazer", 0, sobre="blz_1", tom=-0.24, normal=False)
    t.pinta(q.forma(poligono([(6.4, -14.8), (7.6, -17.0), (8.4, -15.6), (9.4, -17.4), (10.2, -14.8)])), "latao", 6.15, R=0.8, pid="lenco", tom=-0.04)
    # gravata-borboleta vinho com o nó no meio
    gb = poligono([(-4.8, -29.0), (-0.6, -27.0), (-4.8, -24.6)]).suave(circulo((-4.2, -26.8), 1.4), 0.6) | \
        poligono([(4.8, -29.0), (0.6, -27.0), (4.8, -24.6)]).suave(circulo((4.2, -26.8), 1.4), 0.6)
    t.pinta(q.forma(gb), "gravata", 6.6, R=1.2, pid="gravata", semente=690)
    t.pinta(q.forma(caixa((0, -26.8), 1.0, 1.0, r=0.3)), "gravata", 6.7, R=0.8, pid="gravata_no", tom=0.05)
    for lado in ("e", "d"):
        _manga(t, r, p, lado, "blazer", larg=2.7, punho_mat="camisa", semente=695)
    for lado in ("e", "d"):
        om, co = r.j[f"ombro_{lado}"], r.j[f"cotovelo_{lado}"]
        # ombro estruturado: um friso mais claro no alto da manga
        t.pinta(capsula(om, (om[0] + (co[0] - om[0]) * 0.25, om[1] + (co[1] - om[1]) * 0.25), 2.2), "blazer", 0, sobre=f"rmanga_{lado}", tom=0.06, normal=False)


def _q_acesso(k, roupa, mat_livro, emblema):
    s = _sn(k)
    ergue, bd = _aceno(k)
    p = replace(BASE, resp=0.5 + 0.5 * s, cab=-1.0 * ergue + 0.6 * s, cab_dy=0.4 * _sn(k, desloc=0.5), vira=0.15 + 0.1 * ergue,
                olhar=(0.3 * ergue, 0.0), bd=bd, be=(12.0, 2.0, 0.0, "punho"), zd=6.0 if ergue < 0.5 else 7.2, pano=k / NQ * TAU)
    t = Tela()

    def ex(t, r):
        pe_ = r.j["palma_e"]
        livro_fechado(t, Quadro2D((pe_[0] - 0.4, pe_[1] - 1.2), 4.0 + 1.0 * s), p.ze + 0.3, mat_livro, emblema)
    # a mão que segura o livro por cima da capa
    r = esqueleto_vestido(t, p, roupa, ex)
    mao(t, r, "e", "punho", p.ze + 0.9)
    return t


def q_acesso_jaleco(k):
    return _q_acesso(k, roupa_jaleco, "livro_verde", "osso")


def q_acesso_social(k):
    return _q_acesso(k, roupa_social, "livro_vinho", "osso")


# ═══════════════════════════════ terceira leva (01/11/2026): o diretor de cena da página inicial ═══════════════════════════════
# Uma linha por cenário (cais, forja, acampamento, observatório, neve e o cais de novo), na folha esqueleto-poses3.png.
# Só acrescentam: o mesmo rig, o mesmo crânio (modelo E) e a mesma armadura; nenhuma função antiga muda.
def _vec(ang):
    a = math.radians(ang)
    return (math.cos(a), math.sin(a))


def _mais(p, v, k=1.0):
    return (p[0] + v[0] * k, p[1] + v[1] * k)


def _ang_pose(vx, vy, s, inclina):
    """Direção na tela -> ângulo no padrão de Pose (0 = para baixo, positivo = para fora do corpo)."""
    return math.degrees(math.atan2(s * vx, vy)) + s * inclina


def _ik(om, alvo, s, inclina, dobra=1.0, mao_ang=None):
    """Braço de dois ossos (8,2 e 7,4) com a palma em `alvo`. mao_ang = direção dos dedos na tela (graus, 0 = direita,
    90 = para baixo); dobra (+1 ou -1) escolhe o lado do cotovelo. Devolve (braço, antebraço, mão) no padrão de Pose."""
    L1, L2, LM = 8.2, 7.4, 2.3
    if mao_ang is None:
        mao_ang = math.degrees(math.atan2(alvo[1] - om[1], alvo[0] - om[0]))
    hv = _vec(mao_ang)
    pu = (alvo[0] - hv[0] * LM, alvo[1] - hv[1] * LM)
    dx, dy = pu[0] - om[0], pu[1] - om[1]
    d = min(max(math.hypot(dx, dy), abs(L1 - L2) + 0.05), L1 + L2 - 0.05)
    phi = math.atan2(dy, dx)
    alfa = math.acos(max(-1.0, min(1.0, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))))
    th = phi + dobra * alfa
    co = (om[0] + L1 * math.cos(th), om[1] + L1 * math.sin(th))
    th2 = math.atan2(pu[1] - co[1], pu[0] - co[0])
    return (_ang_pose(math.cos(th), math.sin(th), s, inclina), _ang_pose(math.cos(th2), math.sin(th2), s, inclina),
            _ang_pose(hv[0], hv[1], s, inclina))


def _com_maos(p: Pose, e=None, d=None) -> Pose:
    """Pose com as palmas nos alvos: e/d = (alvo, direção dos dedos em graus, tipo da mão, dobra do cotovelo)."""
    r = montar(p)
    kw = {}
    for lado, s, m in (("e", -1, e), ("d", 1, d)):
        if m is not None:
            alvo, ang, tipo, dobra = m
            kw["be" if lado == "e" else "bd"] = (*_ik(r.j[f"ombro_{lado}"], alvo, s, p.inclina, dobra, ang), tipo)
    return replace(p, **kw)


def fio_fx(t: Tela, pts, cor="#e6e0cf", a=0.85):
    """Linha de 1 pixel (fio de pesca) pelos pontos, sem pixels repetidos."""
    feitos = set()
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(1, int(math.ceil(max(abs(x1 - x0), abs(y1 - y0)))))
        for i in range(n + 1):
            u = i / n
            c = (int(math.floor(x0 + (x1 - x0) * u)), int(math.floor(y0 + (y1 - y0) * u)))
            if c not in feitos:
                feitos.add(c)
                t.ponto_fx(c[0], c[1], cor, a)


def gota_fx(t: Tela, x, y, a=1.0):
    """Gota d'água de 2 pixels (cabeça clara, rastro azul)."""
    t.ponto_fx(x, y, "#e8f6ff", a)
    t.ponto_fx(x, y - 1, "#7fb6e0", a * 0.6)


# ─────────── pesca ───────────
def vara_pesca(t: Tela, base, ang, comp, z, curva=0.0):
    """Vara de pesca de madeira com cabo de couro, carretel de latão e passadores de aço. ang em graus na tela
    (-90 = para cima); curva = quanto a ponta cede para baixo (px). Devolve a ponta."""
    d = _vec(ang)
    n = (-d[1], d[0]) if d[0] >= 0 else (d[1], -d[0])     # perpendicular que aponta para baixo
    P = lambda u: (base[0] + d[0] * comp * u + n[0] * curva * u * u, base[1] + d[1] * comp * u + n[1] * curva * u * u)
    us = np.linspace(0, 1, 12)
    pts = [P(u) for u in us]
    t.pinta(traco(pts, list(np.linspace(1.05, 0.42, 12))), "madeira", z, R=0.9, pid="vara", semente=600,
            tom=lambda X, Y: 0.08 * np.sin((X + Y) * 0.9))
    for u in (0.34, 0.58, 0.8, 0.95):     # amarrações escuras e os passadores (aneizinhos) por baixo
        c = P(u)
        t.pinta(circulo(c, 0.9), "madeira", 0, sobre="vara", tom=-0.3, normal=False)
        t.pinta(circulo(_mais(c, n, 1.25), 0.5), "aco", z - 0.05, R=0.5, pid="vara_anel", tom=0.2)
    t.pinta(traco([P(0.0), P(0.08), P(0.17)], [1.45, 1.35, 1.2]), "couro", z + 0.02, R=1.2, pid="vara_cabo", semente=601)
    for u in (0.03, 0.07, 0.11, 0.15):
        t.pinta(circulo(P(u), 0.55), "couro", 0, sobre="vara_cabo", tom=-0.28, normal=False)
    t.pinta(circulo(P(0.0), 1.3), "latao", z + 0.03, R=1.0, pid="vara_ponteira")
    cr = _mais(P(0.2), n, 2.3)
    t.pinta(circulo(cr, 1.9), "latao", z + 0.04, R=1.6, pid="carretel")
    t.pinta(circulo(cr, 0.8), "orbita", 0, sobre="carretel", R=-0.6, tom=0.15)
    t.pinta(capsula(cr, _mais(cr, n, 1.6), 0.35), "aco", z + 0.05, R=0.4, pid="carretel_alca", sem_contorno=True)
    return pts[-1]


def q_pescar(k):
    """Em pé no cais, a vara nas duas mãos; a linha cai para fora do quadro à direita. Quadros 6–7: um puxão leve."""
    s = _sn(k)
    puxa = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.4][k]
    ang = -40.0 + 1.6 * _sn(k, desloc=0.6) * (1 - puxa) - 12.0 * puxa
    p = replace(BASE, x=-6.0, resp=0.5 + 0.5 * s, inclina=-0.6 - 3.2 * puxa, vira=0.45, cab=1.2 + 0.7 * s - 2.4 * puxa,
                cab_dy=-0.8 * puxa, pano=k / NQ * TAU, ze=6.6, zd=6.6)
    # a vara numa mão só (a direita, ao lado do corpo, onde a mão aparece contra o fundo); a esquerda no cinto
    base = (49.0 - 0.6 * puxa, 98.6 - 3.4 * puxa)
    d = _vec(ang)
    hd = _vec(ang + 90)
    p = _com_maos(p, e=((33.0, 96.0), 60.0, "punho", 1),
                  d=(_mais(_mais(base, d, 5.6), hd, -1.6), ang + 90, "punho", -1))
    t = Tela()

    def ex(t, r):
        ponta = vara_pesca(t, base, ang, 46.0, 7.3, curva=2.4 + 0.5 * s - 1.6 * puxa)
        if puxa > 0.5:
            pts = [ponta, (96.5, ponta[1] + 34.0)]        # linha esticada no puxão
        else:
            tr = [0.0, 0.6, -0.5, 0.8, -0.7, 0.4, 0.0, 0.3][k]
            folga = 1.0 - 0.6 * puxa
            pts = bezier(ponta, (ponta[0] + 2.0 + tr, ponta[1] + 24.0 * folga), (97.5, ponta[1] + 46.0 - 8 * puxa), 14)
            pts = [(x + 0.35 * tr * math.sin(i * 1.7), y) for i, (x, y) in enumerate(pts)]
        fio_fx(t, pts)
        if puxa > 0.5:   # duas gotinhas soltas pela linha esticada
            gota_fx(t, 93, ponta[1] + 22, 0.8)
            gota_fx(t, 90, ponta[1] + 14, 0.55)
    esqueleto(t, p, ex)
    return t


# ─────────── forja ───────────
def bigorna(t: Tela, c, z):
    """Bigorna pequena sobre um toco. c = meio da face de cima; o bico aponta para a esquerda."""
    cx, cy = c
    toco = caixa((cx + 0.5, cy + 15.8), 7.2, 7.6, r=1.6)
    t.pinta(toco, "madeira", z - 0.4, R=2.6, pid="toco", semente=610, tom=-0.05,
            relevo=lambda X, Y: (0.32 * np.sin(X * 1.9 + np.sin(Y * 0.7) * 1.4), 0.0 * X))
    for i in range(4):
        x = cx - 5.0 + i * 3.3
        t.pinta(capsula((x, cy + 9.6), (x + 0.6, cy + 22.4), 0.3), "madeira", 0, sobre="toco", tom=-0.2, normal=False)
    t.pinta(elipse((cx + 0.5, cy + 8.4), 7.2, 1.3), "madeira", z - 0.35, R=0.8, pid="toco_topo", tom=0.16)
    # base com pezinhos, cintura e o bloco de cima com bico e talão
    corpo = (caixa((cx, cy + 6.8), 6.4, 1.3, r=0.5) | caixa((cx, cy + 4.6), 3.6, 2.2, r=0.4)
             | caixa((cx + 0.5, cy + 1.5), 7.4, 1.6, r=0.5) | caixa((cx + 7.4, cy + 2.2), 1.6, 1.0, r=0.3))
    bico = poligono([(cx - 6.8, cy - 0.1), (cx - 13.6, cy + 0.7), (cx - 6.8, cy + 3.2)])
    t.pinta(corpo.suave(bico, 0.6), "ferro", z, R=1.6, pid="bigorna", semente=611)
    t.pinta(caixa((cx + 0.5, cy + 0.3), 7.4, 0.45) | poligono([(cx - 6.8, cy - 0.1), (cx - 13.0, cy + 0.6), (cx - 6.8, cy + 0.8)]),
            "ferro", 0, sobre="bigorna", tom=0.34, normal=False)                      # face polida
    t.pinta(caixa((cx + 4.6, cy + 0.6), 0.6, 0.5), "orbita", 0, sobre="bigorna", tom=0.1)      # furo quadrado
    t.pinta(caixa((cx, cy + 4.6), 3.6, 2.2) & semiplano((cx - 1.6, 0), (1, 0)), "ferro", 0, sobre="bigorna", tom=0.1, normal=False)


def martelo_forja(t: Tela, mao_p, ang, z):
    """Martelo de ferreiro: cabo de madeira saindo da mão no ângulo `ang` (graus na tela); a cabeça de ferro fica
    atravessada na ponta, com a face de bater virada para ang - 90."""
    d = _vec(ang)
    a = _mais(mao_p, d, -2.6)
    b = _mais(mao_p, d, 11.0)
    t.pinta(capsula(a, b, 0.95, 0.8), "madeira", z - 0.15, R=0.9, pid="martelo_cabo", semente=612)
    t.pinta(capsula(_mais(mao_p, d, 6.0), _mais(mao_p, d, 7.2), 1.0), "couro", z - 0.12, R=0.9, pid="martelo_cunha")
    # no quadro da cabeça, +y local é a face de bater (ang - 90 na tela) e -y a pena
    q = Quadro2D(_mais(mao_p, d, 11.0), ang + 180)
    cab = caixa((0.0, 0.6), 2.5, 4.4, r=0.7) | caixa((0.0, 4.6), 2.9, 1.2, r=0.4) | poligono([(-2.0, -3.6), (2.0, -3.6), (0.0, -6.4)])
    t.pinta(q.forma(cab), "ferro", z + 0.1, R=1.8, pid="martelo_cab", semente=613)
    t.pinta(q.forma(caixa((0.0, 5.4), 2.9, 0.45)), "ferro", 0, sobre="martelo_cab", tom=0.42, normal=False)
    t.pinta(q.forma(caixa((-1.4, 0.4), 0.55, 3.6)), "ferro", 0, sobre="martelo_cab", tom=0.22, normal=False)


def q_martelar(k):
    """Ferreiro: martelo na mão esquerda batendo a barra em brasa na bigorna (à frente, à esquerda); faísca no impacto."""
    s = _sn(k)
    # (palma, ângulo do cabo): no alto (0 e 7), descendo, impacto no quadro 3, repique e volta
    curso = [((30.4, 79.6), -100.0), ((31.2, 80.6), -128.0), ((35.4, 86.0), -160.0), ((42.9, 91.2), 170.0),
             ((42.2, 89.8), 177.0), ((37.6, 85.0), -152.0), ((33.0, 81.2), -122.0), ((30.6, 79.8), -104.0)][k]
    golpe = [0.0, 0.2, 0.7, 1.0, 0.8, 0.45, 0.15, 0.0][k]
    p = replace(BASE, x=10.0, resp=0.5 + 0.5 * s, inclina=1.5 - 6.5 * golpe, vira=-0.35, cab=1.0 - 4.0 * golpe, cab_dy=0.4 * golpe,
                pano=k / NQ * TAU, ze=7.2, zd=6.0, bd=(16.0 + 2 * golpe, 8.0, 4.0, "punho"),
                pe=(10.0 + 3 * golpe, -4.0 - 3 * golpe), pd=(9.0, -4.0))
    mao_e, ang_m = curso
    p = _com_maos(p, e=(mao_e, ang_m - 90, "punho", 1))
    t = Tela()
    quente = 1.0 if k in (3, 4) else 0.0
    t.luz(34.0, 98.0, 9.0, "#ff8a2a", 46.0, 0.85 + 0.35 * quente + 0.06 * math.sin(k * 2.7))

    def ex(t, r):
        bigorna(t, (33.0, 100.2), 4.4)
        # barra em brasa deitada na face da bigorna: mais quente no meio, esfriando nas pontas
        barra = caixa((34.0, 99.2), 6.6, 0.85, r=0.5)
        t.pinta(barra, "brasa", 4.7, pid="barra", sem_contorno=True,
                tom=lambda X, Y: np.clip(0.95 + 0.05 * quente - np.abs(X - 33.0) * 0.1, 0.12, 1.0))
        t.pinta(barra.engrossa(0.55) - barra, "ferro", 4.65, R=0.6, pid="barra_casca", tom=-0.15)
        martelo_forja(t, r.j["palma_e"], ang_m, p.ze + 0.5)
        # faíscas de 1 a 2 pixels no impacto, voando para os lados e para cima
        if k == 3:
            for (x, y, cor, a) in ((30, 96, "#fffbe6", 1.0), (29, 95, "#ffd27a", 0.9), (38, 96, "#ffe9a8", 1.0), (39, 95, "#ffb050", 0.8),
                                   (26, 93, "#ff9a3a", 0.85)):
                t.ponto_fx(x, y, cor, a)
        elif k == 4:
            for (x, y, cor, a) in ((23, 90, "#ff8a3a", 0.75), (41, 92, "#ffb050", 0.6), (22, 92, "#c85a20", 0.45)):
                t.ponto_fx(x, y, cor, a)
    esqueleto(t, p, ex)
    return t


# ─────────── atiçar o fogo ───────────
def graveto_brasa(t: Tela, cabo, ponta, z, k, aceso=1.0):
    """Graveto comprido e torto, a ponta carbonizada com uma brasa acesa."""
    mx, my = (cabo[0] + ponta[0]) / 2, (cabo[1] + ponta[1]) / 2
    dx, dy = ponta[0] - cabo[0], ponta[1] - cabo[1]
    L = math.hypot(dx, dy)
    ux, uy = dx / L, dy / L
    nx, ny = -uy, ux
    pts = bezier(cabo, (mx + nx * 1.4, my + ny * 1.4), ponta, 12)
    t.pinta(traco(pts, list(np.linspace(1.05, 0.72, 12))), "madeira", z, R=0.9, pid="graveto", semente=620,
            tom=lambda X, Y: -0.22 + 0.06 * np.sin((X - Y) * 1.3))
    for i in (2, 6, 9):     # nós e casca lascada
        t.pinta(circulo(pts[i], 0.8), "madeira", 0, sobre="graveto", tom=-0.38, normal=False)
    galho = pts[4]
    t.pinta(capsula(galho, (galho[0] - nx * 2.6 + ux * 1.4, galho[1] - ny * 2.6 + uy * 1.4), 0.45), "madeira", z - 0.05, R=0.5, pid="graveto_galho", tom=-0.2)
    # ponta carbonizada (carvão) e a brasa: mais forte logo depois de mexer no fogo
    t.pinta(capsula(_mais(ponta, (ux, uy), -6.5), ponta, 0.9), "tinta", 0, sobre="graveto", R=0.8, tom=-0.1)
    t.pinta(circulo(_mais(ponta, (ux, uy), -0.3), 1.75), "brasa", z + 0.05, pid="brasa", sem_contorno=True,
            tom=lambda X, Y: np.clip(0.5 + 0.45 * aceso - np.hypot(X - ponta[0], Y - ponta[1]) * 0.2, 0.2, 1.0))
    for j, (a_, o_) in enumerate(((-2.6, 0.5), (-4.4, -0.4))):     # fendas de brasa no carvão
        c = _mais(_mais(ponta, (ux, uy), a_), (nx, ny), o_)
        t.pinta(circulo(c, 0.5), "brasa", z + 0.04, pid=f"brasa_fenda{j}", sem_contorno=True, tom=0.35 + 0.35 * aceso - 0.12 * j)
    t.luz(ponta[0] + 1, ponta[1] - 2, 8.0, "#ff8a2a", 14.0, 0.35 + 0.35 * aceso)


def q_aticar(k):
    """Agachado de leve e inclinado para a esquerda, atiça o fogo (fora do quadro) com um graveto comprido numa mão só;
    a ponta em brasa solta faíscas quando mexe nas brasas."""
    s = _sn(k)
    estoca = [0.0, 0.35, 0.9, 1.0, 0.8, 0.45, 0.15, 0.0][k]
    mexe = [0.0, 0.0, 0.0, 0.7, -0.7, 0.0, 0.0, 0.0][k]
    p = replace(BASE, x=13.0, y=1.0, resp=0.5 + 0.5 * s, inclina=-9.0 - 3.0 * estoca, vira=-0.6, cab=-4.0 - 2.0 * estoca,
                cab_dx=-0.4 * estoca, pano=k / NQ * TAU, ze=7.4, zd=6.0,
                pe=(24.0 + 3.0 * estoca, -18.0 - 3.0 * estoca), pd=(18.0, -12.0), bd=(24.0, 14.0, 10.0, "aberta"))
    ang = 151.0
    d = _vec(ang)
    ponta = _mais((11.0, 113.6), d, 6.0 * estoca)
    ponta = (ponta[0] + mexe * 0.8, ponta[1] - mexe * 1.2)
    mao = _mais(ponta, d, -41.0)
    cabo = _mais(ponta, d, -47.0)
    hd = _vec(ang - 90)
    p = _com_maos(p, e=(_mais(mao, hd, -1.6), ang - 90, "punho", 1))
    t = Tela()
    luz_fogo(t, k, forca=1.0 + 0.4 * estoca)

    def ex(t, r):
        graveto_brasa(t, cabo, ponta, p.ze + 0.7, k, aceso=estoca)
        # faíscas que sobem da ponta quando ele mexe nas brasas
        for j in range(5):
            fy = (k * 3 + j * 5) % 20
            if fy > 15 or (estoca < 0.3 and j > 1):
                continue
            x = ponta[0] + 1.0 + j * 1.3 + math.sin(fy * 0.6 + j * 1.7) * 1.6 + fy * 0.25
            y = ponta[1] - 3 - fy * 1.6
            t.ponto_fx(x, y, "#ffe08a" if fy < 6 else "#ff8a3a", 0.95 - fy / 18)
    esqueleto(t, p, ex)
    return t


# ─────────── observatório ───────────
def luneta(t: Tela, olho, ang, z, foco, girar, k):
    """Luneta pequena de latão num tripé de madeira. olho = ponta da ocular; ang = para onde aponta (graus na tela);
    foco = quanto o tubo de dentro saiu (px); girar = ângulo do risco no botão de foco. Devolve (botão, lente)."""
    d = _vec(ang)
    n = (-d[1], d[0]) if d[0] >= 0 else (d[1], -d[0])     # para baixo
    P = lambda s_, o=0.0: (olho[0] + d[0] * s_ + n[0] * o, olho[1] + d[1] * s_ + n[1] * o)
    # tripé: três pernas finas abertas da cabeça (embaixo do meio do tubo) até o chão
    cab_t = P(17.0, 4.2)
    for j, (px, pz) in enumerate(((cab_t[0] - 9.0, z - 2.4), (cab_t[0] + 2.0, z - 0.4), (cab_t[0] + 15.0, z - 1.6))):
        px = min(px, 93.0)
        t.pinta(capsula(cab_t, (px, 122.4), 0.85, 0.65), "madeira", pz, R=0.8, pid=f"tripe{j}", semente=630 + j)
        t.pinta(circulo((px, 122.2), 0.95), "latao", pz + 0.01, R=0.7, pid=f"tripe_pe{j}")
    t.pinta(circulo(cab_t, 1.9), "latao", z - 0.3, R=1.4, pid="tripe_cab")
    t.pinta(capsula(cab_t, P(17.0, 1.0), 0.8), "latao", z - 0.25, R=0.7, pid="tripe_cab")
    # ocular escura, tubo de foco (sai e entra), tubo principal com anéis e a objetiva com o vidro
    t.pinta(capsula(P(-0.6), P(2.6), 1.45), "ferro", z + 0.1, R=1.2, pid="ocular")
    t.pinta(capsula(P(2.2), P(8.6 + foco), 1.8), "latao", z, R=1.6, pid="tubo_foco", semente=631)
    t.pinta(capsula(P(8.0 + foco), P(31.0 + foco), 2.5, 2.9), "latao", z + 0.05, R=2.4, pid="tubo", semente=632)
    for sx in (8.6, 17.0, 30.0):
        t.pinta(capsula(P(sx - 0.6 + foco), P(sx + 0.6 + foco), 3.2), "latao", z + 0.09, R=1.3, pid=f"anel{sx}", tom=-0.12)
    t.pinta(capsula(P(13.6 + foco), P(15.2 + foco), 2.6, 2.7), "couro", z + 0.08, R=1.6, pid="cinta", semente=633)
    t.pinta(capsula(P(31.0 + foco), P(34.0 + foco), 3.4), "latao", z + 0.1, R=1.8, pid="objetiva", tom=0.05)
    lente = P(34.4 + foco)
    t.pinta(Quadro2D(lente, ang).forma(elipse((0, 0), 1.0, 2.8)), "vidro", z + 0.12, R=1.4, pid="lente", plano=(0.5, -0.4, 0.75))
    # botão de foco: haste curta para baixo e um botão serrilhado com um risco que gira
    haste_a = P(5.0, 1.4)
    bot = P(5.2, 6.6)
    t.pinta(capsula(haste_a, bot, 0.6), "latao", z + 0.15, R=0.6, pid="foco_haste")
    t.pinta(circulo(bot, 1.8), "latao", z + 0.2, R=1.5, pid="foco_botao")
    risco = _mais(bot, _vec(girar), 1.2)
    t.pinta(capsula(bot, risco, 0.38), "orbita", 0, sobre="foco_botao", tom=0.2)
    return bot, lente


def q_luneta(k):
    """No observatório: a cabeça inclinada para trás, o olho na ocular da luneta (apontada para cima, à direita),
    girando o botão de foco; no quadro 5 um brilho na objetiva."""
    s = _sn(k)
    foco = 0.9 * _sn(k, desloc=0.5)
    gira = k * 55.0
    p = replace(BASE, x=-13.0, resp=0.5 + 0.5 * s, inclina=2.0, vira=0.6, cab=13.0 + 0.6 * _sn(k, desloc=1.2), cab_dy=0.3,
                pano=k / NQ * TAU, ze=6.4, zd=9.6)
    r0 = montar(p)
    olho = r0.cab.p(1.2 + 3.4, 6.0)
    ang = -33.0
    dv = _vec(ang)
    nv = (-dv[1], dv[0])
    bot = (olho[0] + dv[0] * 5.2 + nv[0] * 6.6, olho[1] + dv[1] * 5.2 + nv[1] * 6.6)
    tremor = 12.0 * math.sin(k / NQ * TAU * 2)
    p = _com_maos(p, e=((25.0, 96.0), 70.0, "punho", 1), d=((bot[0] - 0.4, bot[1] + 1.9), -80.0 + tremor, "pinca", -1))
    t = Tela()

    def ex(t, r):
        _, lente = luneta(t, olho, ang, 9.2, foco, gira, k)
        if k in (5, 6):    # achou: um brilho na objetiva
            cintila(t, lente[0] + 2, lente[1] - 2, 2 if k == 5 else 1, "#fff6c8", 0.95 if k == 5 else 0.6)
    esqueleto(t, p, ex)
    return t


# ─────────── neve ───────────
def boneco_de_neve(t: Tela, cx, z, com_cabeca):
    """Boneco de neve pequeno: base, corpo com botões de carvão e braços de graveto; a cabeça vem de cabeca_neve()."""
    t.pinta(elipse((cx, 122.4), 14.0, 1.9), "neve", z - 0.6, R=0.8, pid="neve_chao", tom=-0.05)
    t.pinta(circulo((cx, 112.2), 10.4).borda(0.25, 1.4, 640), "neve", z, R=8.0, pid="neve_base", semente=640)
    t.pinta(circulo((cx, 96.6), 7.4).borda(0.2, 1.4, 641), "neve", z + 0.1, R=5.6, pid="neve_corpo", semente=641)
    for j, y in enumerate((94.4, 98.8, 108.0)):
        t.pinta(circulo((cx - 1.6, y), 0.85), "orbita", z + 0.15, R=0.6, pid=f"botao{j}", tom=0.1)
    t.pinta(traco([(cx + 6.2, 95.6), (cx + 10.6, 91.6), (cx + 12.6, 88.4)], 0.5), "madeira", z + 0.05, R=0.5, pid="braco_n1")
    t.pinta(capsula((cx + 10.6, 91.6), (cx + 13.2, 92.4), 0.38), "madeira", z + 0.05, R=0.4, pid="braco_n1")
    t.pinta(traco([(cx - 6.2, 96.8), (cx - 10.0, 98.4), (cx - 12.2, 101.2)], 0.5), "madeira", z + 0.05, R=0.5, pid="braco_n2")
    if com_cabeca:
        cabeca_neve(t, (cx, 84.4), z + 0.25)


def cabeca_neve(t: Tela, c, z, aperta=0.0):
    """A bola da cabeça: olhos de carvão e um narizinho de cenoura virado para a esquerda."""
    t.pinta(elipse(c, 5.4 + 0.6 * aperta, 5.2 - 0.7 * aperta).borda(0.15, 1.6, 643), "neve", z, R=4.2, pid="neve_cabeca", semente=643)
    for dx in (-2.6, 0.8):
        t.pinta(circulo((c[0] + dx, c[1] - 1.0), 0.8), "orbita", z + 0.05, R=0.5, pid="neve_olho", tom=0.1)
    t.pinta(poligono([(c[0] - 0.8, c[1] + 0.4), (c[0] - 0.8, c[1] + 1.8), (c[0] - 4.4, c[1] + 1.4)]), "abobora", z + 0.06, R=0.6, pid="cenoura")


def q_boneco_neve(k):
    """Molda a bola da cabeça nas mãos, põe no alto do boneco de neve, admira e tira de novo para ajeitar (laço)."""
    s = _sn(k)
    SX = 64.0
    bola = [(34.0, 92.0), (34.0, 92.2), (34.4, 91.4), (45.0, 87.6), (55.0, 84.0), (SX, 84.4), (SX, 84.4), (50.0, 88.4)][k]
    aperta = [0.0, 1.0, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0][k]
    alcance = [0.0, 0.0, 0.0, 0.4, 0.8, 1.0, 0.55, 0.6][k]
    p = replace(BASE, x=-14.0, resp=0.5 + 0.5 * s, inclina=0.5 + 5.0 * alcance, vira=0.15 + 0.5 * alcance,
                cab=1.5 - 2.0 * aperta + 2.0 * (k == 6), cab_dx=0.5 * alcance, pano=k / NQ * TAU, ze=8.6, zd=8.6)
    bx, by = bola
    if k <= 2:
        dd = 6.8 - 0.9 * aperta
        rot = [0.0, 0.0, 26.0][k]
        ve = _vec(180 + rot)
        e = ((bx + ve[0] * dd, by + ve[1] * dd), rot, "aberta", 1)
        d = ((bx - ve[0] * dd, by - ve[1] * dd), 180 + rot, "aberta", -1)
    elif k == 3:
        e = ((bx - 5.6, by + 1.0), -10.0, "aberta", 1)
        d = ((bx - 2.0, by + 5.0), -80.0, "aberta", -1)
    elif k in (4, 7):
        e = ((26.0, 96.0), 70.0, "aberta", 1)
        d = ((bx - 5.2, by + 0.6), -10.0, "aberta", -1)
    elif k == 5:
        e = ((26.0, 96.0), 70.0, "aberta", 1)
        d = ((bx - 5.2, by - 0.6), -25.0, "aberta", -1)
    else:
        e = ((26.0, 96.0), 70.0, "aberta", 1)
        d = ((52.0, 90.0), 20.0, "aberta", -1)
    p = _com_maos(p, e=e, d=d)
    t = Tela()

    def ex(t, r):
        no_boneco = k in (5, 6)
        boneco_de_neve(t, SX, 5.0, no_boneco)
        if not no_boneco:
            cabeca_neve(t, bola, 9.3, aperta)
        # farelos de neve caindo de quem molda e de quem assenta
        if k in (1, 2):
            for j, (dx, dy) in enumerate(((-1.0, 7.0), (2.0, 9.5), (0.0, 13.0))):
                t.ponto_fx(bx + dx + (k - 1) * 0.6, by + dy + (k - 1) * 3, "#f4f8ff", 0.9 - j * 0.2)
        if k == 5:
            for (dx, dy) in ((-6.0, 3.0), (6.2, 2.0)):
                t.ponto_fx(SX + dx, 84.4 + dy, "#f4f8ff", 0.8)
        if k == 6:
            t.ponto_fx(SX - 7.0, 91.0, "#f4f8ff", 0.5)
    esqueleto(t, p, ex)
    return t


# ─────────── pescou uma bota ───────────
def bota_velha(t: Tela, gancho, ang, z, k):
    """Bota velha encharcada pendurada pelo cadarço (gancho), bico para a esquerda, furo no bico e uma alga."""
    q = _escala(Quadro2D(gancho, ang), 1.3)
    cano = poligono([(-3.0, 0.4), (3.2, 0.0), (3.8, 9.6), (-2.6, 9.6)])
    pe_ = caixa((-2.6, 11.0), 6.4, 2.6, r=2.2)
    corpo = cano.suave(pe_, 1.4)
    t.pinta(q.forma(corpo), "bota", z, R=2.6, pid="bota", uv=q.uv(), semente=650)
    t.pinta(q.forma(caixa((-2.4, 13.7), 6.8, 0.9, r=0.5) | caixa((2.4, 13.2), 1.8, 1.2, r=0.4)), "couro", z + 0.05, R=0.8, pid="bota_sola", tom=-0.3)
    t.pinta(q.forma(elipse((0.1, 0.4), 3.1, 0.95)), "interior", z + 0.06, R=-0.8, pid="bota_boca")
    t.pinta(q.forma(caixa((0.1, 1.6), 3.4, 0.7, r=0.3)), "bota", 0, sobre="bota", tom=0.18, normal=False)
    for j in range(3):   # cadarço cruzado na frente do cano
        y = 2.6 + j * 2.1
        t.pinta(q.forma(capsula((-2.6, y), (-0.6, y + 1.2), 0.32) | capsula((-2.6, y + 1.2), (-0.6, y), 0.32)), "papel", z + 0.07, R=0.4, pid="cadarco", tom=-0.35)
    t.pinta(q.forma(elipse((-7.0, 11.2), 1.2, 0.9)), "orbita", z + 0.07, R=-0.6, pid="bota_furo", tom=0.05)
    t.pinta(q.forma(capsula((1.4, 6.0), (2.6, 4.0), 0.3)), "bota", 0, sobre="bota", tom=-0.3, normal=False)   # rasgo
    alga = [q.p(3.6, 12.6), q.p(5.0 + 0.6 * math.sin(k * 1.4), 15.2), q.p(4.2 + 0.8 * math.sin(k * 1.4 + 1), 18.2)]
    t.pinta(traco(alga, [0.55, 0.45, 0.35]), "talo", z + 0.08, R=0.5, pid="alga")
    return q.p(-7.0, 12.4), q.p(2.6, 14.8)


def q_pescou_bota(k):
    """Ergue a vara com uma bota velha pingando na ponta da linha; recua de leve, surpreso (sem boca), e a bota balança."""
    s = _sn(k)
    th = 11.0 * math.sin(k / NQ * TAU)
    ang = -67.0 + 1.5 * math.sin(k / NQ * TAU + 0.8)
    p = replace(BASE, x=-9.0, resp=0.5 + 0.5 * s, inclina=-6.5 + 0.8 * _sn(k, desloc=2), vira=0.75,
                cab=6.0 + 1.0 * math.sin(k / NQ * TAU * 2), cab_dy=-1.6, cab_dx=-1.0, pano=k / NQ * TAU, ze=8.8, zd=6.6,
                pe=(7.0, -3.0), pd=(20.0, -8.0))
    # vara erguida na mão direita; a esquerda aberta no alto, de susto
    base = (46.0, 96.0)
    d = _vec(ang)
    hd = _vec(ang + 90)
    p = _com_maos(p, e=((18.0 + 0.4 * s, 71.0 + 0.5 * s), -115.0, "aberta", 1),
                  d=(_mais(_mais(base, d, 6.4), hd, -1.6), ang + 90, "punho", -1))
    t = Tela()

    def ex(t, r):
        ponta = vara_pesca(t, base, ang, 54.0, 7.3, curva=6.0 + 0.8 * math.cos(k / NQ * TAU))
        L = 15.0
        gancho = (ponta[0] + L * math.sin(math.radians(th)), ponta[1] + L * math.cos(math.radians(th)))
        fio_fx(t, [ponta, gancho], a=0.9)
        furo, sola = bota_velha(t, gancho, -18.0 - th * 1.25, 8.0, k)
        for j in range(3):   # gotas pingando do furo e da sola
            ox, oy = (furo, sola, furo)[j]
            fy = (k * 4 + j * 7) % 16
            gota_fx(t, ox + (j - 1) * 0.6, oy + 2 + fy * 1.6, 1.0 - fy / 18)
    esqueleto(t, p, ex)
    return t


LINHAS = [
    ("acenar", "acenando", False, q_acenar),
    ("ler", "lendo", False, q_ler),
    ("cafe", "tomando café", False, q_cafe),
    ("dormir", "cochilando", False, q_dormir),
    ("alongar", "se espreguiçando", False, q_alongar),
    ("raiox", "olhando um raio X", False, q_raiox),
    ("malabares", "fazendo malabares com ossos", False, q_malabares),
    ("reflexo", "testando o próprio reflexo patelar", False, q_reflexo),
    ("marshmallow", "assando marshmallow", False, q_marshmallow),
    ("parado", "parado", False, q_parado),
    ("foice", "passeando com a foice", True, q_foice),
    ("abobora", "com a lanterna de abóbora", True, q_abobora),
    ("velas", "com o castiçal de velas", True, q_velas),
    ("morcegos", "com os morcegos", True, q_morcegos),
    # linhas novas (31/10/2026): usadas por id em lugares específicos, fora do sorteio do topo
    ("estudioso", "estudando de óculos", False, q_estudioso),
    ("mago", "de mago com o cajado", False, q_mago),
    ("inverno", "de gorro e cachecol com café", False, q_inverno),
    ("pergaminho", "lendo as missões do dia", False, q_pergaminho),
    ("comemorando", "comemorando", False, q_comemorando),
    ("trofeu", "erguendo um troféu", False, q_trofeu),
    ("descansando", "cochilando sentado com um livro", False, q_descansando),
    ("orientando", "mostrando o caminho", False, q_orientando),
    ("ortopedia", "de jaleco com martelo de reflexo", False, q_ortopedia),
    # segunda leva (01/11/2026), também fora do sorteio
    ("escrevendo", "escrevendo no caderno", False, q_escrevendo),
    ("aventureiro", "de mochila e cajado, pronto para explorar", False, q_aventureiro),
    ("mago2", "de manto e chapéu de mago", False, q_mago2),
    ("quadro", "mostrando uma dica na lousa", False, q_quadro),
    ("fogueira", "se aquecendo na fogueira", False, q_fogueira),
    ("carinho", "fazendo carinho no gato", False, q_carinho),
    ("comemora2", "comemorando a meta do dia", False, q_comemora2),
    # tela de entrar (31/10/2026): roupas novas do mesmo mascote, na folha esqueleto-acesso.png
    ("acesso_jaleco", "de jaleco longo dando boas-vindas", False, q_acesso_jaleco),
    ("acesso_social", "de blazer e gravata-borboleta dando boas-vindas", False, q_acesso_social),
    # terceira leva (01/11/2026): o diretor de cena da página inicial, uma ação por cenário, na folha esqueleto-poses3.png
    ("pescar", "pescando no cais", False, q_pescar),
    ("martelar", "martelando na bigorna", False, q_martelar),
    ("aticar", "atiçando o fogo com um graveto", False, q_aticar),
    ("luneta", "olhando pela luneta", False, q_luneta),
    ("boneco_neve", "fazendo um boneco de neve", False, q_boneco_neve),
    ("pescou_bota", "pescou uma bota velha", False, q_pescou_bota),
]


LINHAS_ANTIGAS = 14          # linhas que existiam antes de 31/10/2026 (não mudam nunca)
LINHAS_POSES_31 = 9          # poses de 31/10/2026 (as primeiras de esqueleto-poses.png; também não mudam)
LINHAS_POSES_2 = 7           # segunda leva (esqueleto-poses2.png; também não muda)
LINHAS_ACESSO = 2            # tela de entrar (esqueleto-acesso.png; também não muda)
LINHAS_POSES_3 = 6           # terceira leva (01/11/2026): o diretor de cena, em esqueleto-poses3.png


def folha_esqueleto(so=None) -> Image.Image:
    folha = Image.new("RGBA", (FW * NQ, FH * len(LINHAS)), (0, 0, 0, 0))
    for li, (ident, _, _, fn) in enumerate(LINHAS):
        if so and ident not in so:
            continue
        for k in range(NQ):
            folha.paste(Image.fromarray(fn(k).render(), "RGBA"), (k * FW, li * FH))
    return folha


# ═══════════════════════════════ o gato (laranja tigrado, peito e patas brancos) ═══════════════════════════════
def listras(cx, cy, ang, freq, larg, seed, bb):
    """Faixas de tigrado (onduladas) como forma para decalque."""
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def f(X, Y):
        u = (X - cx) * ca + (Y - cy) * sa
        v = -(X - cx) * sa + (Y - cy) * ca
        w = np.sin(u * freq + 0.6 * np.sin(v * 0.45 + seed) + ruido(u * 0.3, v * 0.3, seed) * 0.8)
        return (larg - w) * 1.6
    return Forma(f, bb)


def gato_sentado(t: Tela, k: int, cauda: float, pisca: bool, tala: bool, cabeca_inc: float = 0.0, pata_ergue: float = 0.0):
    t.origem = (0.0, 0.0)
    for x in range(14, 50):   # sombra no chão
        d = abs(x + 0.5 - 32) / 18
        if d < 1:
            t.ponto_fx(x, 38, "#0c0710", 0.4 if d < 0.6 else 0.25, sob=True)
            if d < 0.7:
                t.ponto_fx(x, 39, "#0c0710", 0.2, sob=True)
    resp = 0.4 * math.sin(k / GQ * TAU)
    # cauda atrás, balançando
    a = math.radians(cauda)
    base = (21.0, 34.5)
    meio = (11.5 + 1.5 * math.sin(a), 32.0)
    alto = (9.0 + 6.0 * math.sin(a), 23.0 + 1.0 * abs(math.sin(a)))
    ponta = (12.5 + 9.0 * math.sin(a), 17.5 + 2.0 * abs(math.sin(a)))
    pts = bezier(base, meio, alto, 6)[:-1] + bezier(alto, (alto[0] - 1.0 + 2 * math.sin(a), 18.0), ponta, 5)
    t.pinta(traco(pts, [2.4, 2.3, 2.2, 2.1, 2.0, 1.9, 1.85, 1.8, 1.7, 1.6]).borda(0.35, 1.3, 3), "pelo", 1.0, R=2.0, pid="cauda", semente=301)
    t.pinta(traco(pts[-3:], 1.9), "pelo_listra", 0, sobre="cauda", R=1.8)
    for i in (2, 4, 6):
        q_ = pts[i]
        t.pinta(circulo(q_, 1.0), "pelo_listra", 0, sobre="cauda", R=1.5)
    # quadril e corpo
    quad = elipse((28.0, 30.0), 10.5, 8.0 + resp * 0.3).borda(0.4, 1.0, 5)
    t.pinta(quad, "pelo", 2.0, R=6.0, pid="corpo", semente=302)
    corpo = elipse((35.0, 24.5 - resp * 0.2), 7.4, 10.4, -12).borda(0.4, 1.0, 6)
    t.pinta(corpo, "pelo", 2.2, R=5.0, pid="peito", semente=303)
    t.pinta(listras(28, 30, 80, 0.9, 0.45, 2, (16, 20, 40, 39)), "pelo_listra", 0, sobre="corpo", R=3.0)
    t.pinta(listras(34, 24, 75, 1.0, 0.5, 4, (26, 13, 44, 36)), "pelo_listra", 0, sobre="peito", R=3.0)
    t.pinta(elipse((38.2, 25.0), 3.8, 6.8, -10).borda(0.5, 1.2, 9), "pelo_branco", 0, sobre="peito", R=4.0)
    # pata de trás aparecendo
    t.pinta(elipse((22.5, 36.6), 4.6, 1.8), "pelo_branco", 2.4, R=1.6, pid="pata_tras", semente=304)
    # patas da frente
    for i, x in enumerate((34.6, 39.6)):
        topo = 27.0
        fim = 36.2 - (pata_ergue if i == 1 else 0)
        t.pinta(capsula((x, topo), (x + 0.2, fim), 1.9, 1.8).borda(0.25, 1.4, 11 + i), "pelo", 3.0 + i * 0.1, R=1.8, pid=f"pata{i}", semente=305 + i)
        t.pinta(capsula((x, fim - 2.6), (x + 0.2, fim), 1.9, 1.8), "pelo_branco", 0, sobre=f"pata{i}", R=1.8)
        t.pinta(elipse((x + 0.6, fim + 0.8), 2.5, 1.4), "pelo_branco", 3.05 + i * 0.1, R=1.2, pid=f"pata{i}")
        for dx in (-0.4, 0.9):
            t.pinta(capsula((x + 0.6 + dx, fim + 0.2), (x + 0.6 + dx, fim + 1.6), 0.25), "pelo_branco", 0, sobre=f"pata{i}", tom=-0.3, normal=False)
        if tala and i == 1:
            # tala azul com duas faixas brancas no antebraço
            t.pinta(caixa((x + 0.2, (topo + fim) / 2 + 0.6), 2.6, 3.4, r=1.0), "tala", 3.3, R=1.6, pid="tala", semente=320)
            for yy in ((topo + fim) / 2 - 1.4, (topo + fim) / 2 + 2.4):
                t.pinta(caixa((x + 0.2, yy), 2.9, 0.75, r=0.4), "faixa", 3.35, R=0.9, pid="faixa", semente=321)
            t.pinta(capsula((x - 1.4, (topo + fim) / 2 - 2.2), (x - 1.4, (topo + fim) / 2 + 3.6), 0.35), "tala", 0, sobre="tala", tom=0.3, normal=False)
    # cabeça
    q = Quadro2D((38.5, 13.2 + resp * 0.3), cabeca_inc)
    for s_ in (-1, 1):   # orelhas
        orelha = poligono([(s_ * 2.0, -4.6), (s_ * 7.6, -3.0), (s_ * 5.6, -10.4)])
        t.pinta(q.forma(orelha.suave(circulo((s_ * 5.0, -4.6), 1.6), 0.8)), "pelo", 3.6, R=1.6, pid=f"orelha{s_}", semente=330)
        t.pinta(q.forma(poligono([(s_ * 3.2, -4.8), (s_ * 6.4, -3.8), (s_ * 5.3, -8.4)])), "rosa", 0, sobre=f"orelha{s_}", R=-1.0)
        for j in range(2):
            t.pinta(q.forma(capsula((s_ * (4.3 + j * 0.8), -5.2), (s_ * (4.8 + j * 0.9), -8.6), 0.22)), "pelo_branco", 3.7, R=0.4, pid=f"tufo{s_}", sem_contorno=True)
    cab = elipse((0, 0), 8.2, 6.8).suave(elipse((0, 2.8), 6.6, 4.6), 1.5).borda(0.35, 1.2, 13)
    bochechas = elipse((-6.6, 2.6), 2.6, 2.2) | elipse((6.6, 2.6), 2.6, 2.2)
    t.pinta(q.forma(cab.suave(bochechas.borda(0.5, 1.5, 14), 1.0)), "pelo", 4.0, R=5.5, pid="cabeca", uv=q.uv(), semente=331)
    # "M" na testa e listras das bochechas
    for x0, y0, x1, y1 in ((-2.4, -6.4, -1.6, -3.4), (0.0, -6.8, 0.0, -3.6), (2.4, -6.4, 1.6, -3.4)):
        t.pinta(q.forma(capsula((x0, y0), (x1, y1), 0.55)), "pelo_listra", 0, sobre="cabeca", R=0.8)
    for s_ in (-1, 1):
        for j in range(2):
            t.pinta(q.forma(capsula((s_ * 8.4, 0.6 + j * 1.8), (s_ * 6.4, 1.0 + j * 1.6), 0.45)), "pelo_listra", 0, sobre="cabeca", R=0.6)
    t.pinta(q.forma(elipse((0, 3.6), 4.0, 2.7).borda(0.3, 1.5, 15)), "pelo_branco", 0, sobre="cabeca", R=2.4)
    t.pinta(q.forma(poligono([(-1.1, 1.6), (1.1, 1.6), (0, 2.8)])), "rosa", 4.1, R=0.8, pid="nariz", sem_contorno=True)
    t.pinta(q.forma(traco([(-1.6, 4.4), (-0.6, 4.8), (0, 4.0), (0.6, 4.8), (1.6, 4.4)], 0.3)), "pupila", 4.1, R=0.5, pid="boca", sem_contorno=True)
    for s_ in (-1, 1):
        cx_ = s_ * 3.4
        if pisca:
            t.pinta(q.forma(traco([(cx_ - 1.6, -0.4), (cx_, 0.3), (cx_ + 1.6, -0.4)], 0.42)), "pupila", 4.2, R=0.5, pid="olho", sem_contorno=True)
        else:
            t.pinta(q.forma(elipse((cx_, -0.6), 1.75, 1.9)), "pupila", 4.15, R=0.6, pid="olho", sem_contorno=True)
            t.pinta(q.forma(elipse((cx_, -0.5), 1.35, 1.55)), "olho_gato", 4.2, pid="olho", tom=lambda X, Y: 0.95 - np.clip((q.o[1] - 1.8 - Y) * -0.25, 0, 0.6), sem_contorno=True)
            t.pinta(q.forma(elipse((cx_ + 0.15, -0.5), 0.45, 1.5)), "pupila", 4.25, pid="olho", sem_contorno=True)
            t.pinta(q.forma(circulo((cx_ - 0.6, -1.4), 0.42)), "olho_gato", 4.3, pid="olho", tom=1.0, sem_contorno=True)
    # bigodes
    for s_ in (-1, 1):
        for j, dy in enumerate((-0.4, 0.8)):
            for i in range(5):
                x = q.p(s_ * (4.6 + i * 1.1), 3.0 + dy + i * 0.25 * (j * 2 - 1))
                t.ponto_fx(x[0], x[1], "#f6efe0", 0.75 - i * 0.12)


def gato_dormindo(t: Tela, k: int):
    t.origem = (0.0, 0.0)
    for x in range(10, 54):
        d = abs(x + 0.5 - 32) / 22
        if d < 1:
            t.ponto_fx(x, 38, "#0c0710", 0.42 if d < 0.6 else 0.25, sob=True)
    resp = math.sin(k / GQ * TAU)
    corpo = elipse((29.0, 30.0 - resp * 0.35), 16.5, 8.0 + resp * 0.45).borda(0.4, 1.0, 21)
    t.pinta(corpo, "pelo", 2.0, R=7.0, pid="corpo", semente=340)
    t.pinta(listras(29, 30, 90, 0.85, 0.42, 7, (12, 20, 46, 39)), "pelo_listra", 0, sobre="corpo", R=3.0)
    t.pinta(elipse((36.0, 34.4), 7.0, 2.6).borda(0.4, 1.3, 22), "pelo_branco", 0, sobre="corpo", R=2.0)
    # cauda enrolada na frente
    pts = bezier((13.5, 30.5), (16.0, 37.6), (33.0, 36.2), 10)
    t.pinta(traco(pts, [2.4, 2.4, 2.3, 2.3, 2.2, 2.1, 2.0, 1.9, 1.8, 1.7]).borda(0.3, 1.3, 23), "pelo", 3.0, R=2.0, pid="cauda", semente=341)
    for i in (2, 4, 6, 8):
        t.pinta(circulo(pts[i], 1.05), "pelo_listra", 0, sobre="cauda", R=1.5)
    t.pinta(traco(pts[-2:], 1.9), "pelo_listra", 0, sobre="cauda", R=1.5)
    # patinhas recolhidas sob a cabeça
    t.pinta(elipse((44.5, 35.2), 3.2, 1.6), "pelo_branco", 3.2, R=1.2, pid="patas", semente=342)
    # cabeça deitada, de olhos fechados
    q = Quadro2D((43.0, 27.6 - resp * 0.25), 14)
    tw = 1 if k == 3 else 0
    for s_ in (-1, 1):
        orelha = poligono([(s_ * 2.0, -4.0), (s_ * 7.2, -2.6), (s_ * (5.4 + tw * 0.6 * (s_ > 0)), -9.4 + tw * 1.2 * (s_ > 0))])
        t.pinta(q.forma(orelha.suave(circulo((s_ * 4.8, -4.2), 1.5), 0.8)), "pelo", 3.6, R=1.6, pid=f"orelha{s_}", semente=343)
        t.pinta(q.forma(poligono([(s_ * 3.2, -4.4), (s_ * 6.0, -3.4), (s_ * 5.1, -7.6)])), "rosa", 0, sobre=f"orelha{s_}", R=-1.0)
    cab = elipse((0, 0), 7.8, 6.2).suave(elipse((0, 2.6), 6.4, 4.2), 1.5).borda(0.35, 1.2, 24)
    t.pinta(q.forma(cab), "pelo", 4.0, R=5.0, pid="cabeca", uv=q.uv(), semente=344)
    for x0 in (-2.2, 0.0, 2.2):
        t.pinta(q.forma(capsula((x0, -5.8), (x0 * 0.7, -3.2), 0.5)), "pelo_listra", 0, sobre="cabeca", R=0.8)
    t.pinta(q.forma(elipse((0, 3.4), 3.8, 2.5).borda(0.3, 1.5, 25)), "pelo_branco", 0, sobre="cabeca", R=2.4)
    t.pinta(q.forma(poligono([(-1.0, 1.6), (1.0, 1.6), (0, 2.6)])), "rosa", 4.1, R=0.8, pid="nariz", sem_contorno=True)
    for s_ in (-1, 1):
        t.pinta(q.forma(traco([(s_ * 3.4 - 1.6, -0.6), (s_ * 3.4, 0.4), (s_ * 3.4 + 1.6, -0.6)], 0.42)), "pupila", 4.2, R=0.5, pid="olho", sem_contorno=True)
    # zz pequenos
    fase = (k % GQ) / GQ
    zz(t, 51 + fase * 5, 17 - fase * 10, 4, 0.9 * (1 - fase))


# ─────────── linhas novas do gato (31/10/2026) ───────────
def gato_cabeca(t: Tela, c, inc: float, pisca=False, olhar=(0.0, 0.0), feliz=False, boca_aberta=0.0, orelha_tw=0.0, z=4.0):
    """A cabeça do gato de gato_sentado (mesmas medidas e cores), com olhar, piscada, olhos felizes e boca aberta."""
    q = Quadro2D(c, inc)
    for s_ in (-1, 1):
        tw = orelha_tw if s_ > 0 else 0.0
        orelha = poligono([(s_ * 2.0, -4.6), (s_ * 7.6, -3.0), (s_ * (5.6 + tw * 0.6), -10.4 + tw * 1.4)])
        t.pinta(q.forma(orelha.suave(circulo((s_ * 5.0, -4.6), 1.6), 0.8)), "pelo", z - 0.4, R=1.6, pid=f"orelha{s_}", semente=330)
        t.pinta(q.forma(poligono([(s_ * 3.2, -4.8), (s_ * 6.4, -3.8), (s_ * (5.3 + tw * 0.5), -8.4 + tw * 1.2)])), "rosa", 0, sobre=f"orelha{s_}", R=-1.0)
        for j in range(2):
            t.pinta(q.forma(capsula((s_ * (4.3 + j * 0.8), -5.2), (s_ * (4.8 + j * 0.9), -8.6), 0.22)), "pelo_branco", z - 0.3, R=0.4, pid=f"tufo{s_}", sem_contorno=True)
    cab = elipse((0, 0), 8.2, 6.8).suave(elipse((0, 2.8), 6.6, 4.6), 1.5).borda(0.35, 1.2, 13)
    bochechas = elipse((-6.6, 2.6), 2.6, 2.2) | elipse((6.6, 2.6), 2.6, 2.2)
    t.pinta(q.forma(cab.suave(bochechas.borda(0.5, 1.5, 14), 1.0)), "pelo", z, R=5.5, pid="cabeca", uv=q.uv(), semente=331)
    for x0, y0, x1, y1 in ((-2.4, -6.4, -1.6, -3.4), (0.0, -6.8, 0.0, -3.6), (2.4, -6.4, 1.6, -3.4)):
        t.pinta(q.forma(capsula((x0, y0), (x1, y1), 0.55)), "pelo_listra", 0, sobre="cabeca", R=0.8)
    for s_ in (-1, 1):
        for j in range(2):
            t.pinta(q.forma(capsula((s_ * 8.4, 0.6 + j * 1.8), (s_ * 6.4, 1.0 + j * 1.6), 0.45)), "pelo_listra", 0, sobre="cabeca", R=0.6)
    t.pinta(q.forma(elipse((0, 3.6), 4.0, 2.7).borda(0.3, 1.5, 15)), "pelo_branco", 0, sobre="cabeca", R=2.4)
    t.pinta(q.forma(poligono([(-1.1, 1.6), (1.1, 1.6), (0, 2.8)])), "rosa", z + 0.1, R=0.8, pid="nariz", sem_contorno=True)
    if boca_aberta > 0:
        t.pinta(q.forma(elipse((0, 4.6), 1.3, 0.8 + boca_aberta)), "pupila", z + 0.1, R=0.5, pid="boca", sem_contorno=True)
        t.pinta(q.forma(elipse((0, 4.9 + boca_aberta * 0.4), 0.8, 0.45 + boca_aberta * 0.4)), "rosa", z + 0.12, R=0.5, pid="boca", sem_contorno=True)
    else:
        t.pinta(q.forma(traco([(-1.6, 4.4), (-0.6, 4.8), (0, 4.0), (0.6, 4.8), (1.6, 4.4)], 0.3)), "pupila", z + 0.1, R=0.5, pid="boca", sem_contorno=True)
    ox, oy = olhar
    for s_ in (-1, 1):
        cx_ = s_ * 3.4
        if feliz:
            t.pinta(q.forma(traco([(cx_ - 1.6, 0.2), (cx_, -0.9), (cx_ + 1.6, 0.2)], 0.42)), "pupila", z + 0.2, R=0.5, pid="olho", sem_contorno=True)
        elif pisca:
            t.pinta(q.forma(traco([(cx_ - 1.6, -0.4), (cx_, 0.3), (cx_ + 1.6, -0.4)], 0.42)), "pupila", z + 0.2, R=0.5, pid="olho", sem_contorno=True)
        else:
            t.pinta(q.forma(elipse((cx_, -0.6), 1.75, 1.9)), "pupila", z + 0.15, R=0.6, pid="olho", sem_contorno=True)
            t.pinta(q.forma(elipse((cx_, -0.5), 1.35, 1.55)), "olho_gato", z + 0.2, pid="olho", tom=lambda X, Y: 0.95 - np.clip((q.o[1] - 1.8 - Y) * -0.25, 0, 0.6), sem_contorno=True)
            t.pinta(q.forma(elipse((cx_ + 0.15 + ox, -0.5 + oy), 0.45, 1.5 - abs(oy) * 0.3)), "pupila", z + 0.25, pid="olho", sem_contorno=True)
            t.pinta(q.forma(circulo((cx_ - 0.6, -1.4), 0.42)), "olho_gato", z + 0.3, pid="olho", tom=1.0, sem_contorno=True)
    for s_ in (-1, 1):
        for j, dy in enumerate((-0.4, 0.8)):
            for i in range(5):
                x = q.p(s_ * (4.6 + i * 1.1), 3.0 + dy + i * 0.25 * (j * 2 - 1))
                t.ponto_fx(x[0], x[1], "#f6efe0", 0.75 - i * 0.12)
    return q


def gato_cauda(t: Tela, pts, z: float, seed=301):
    n = len(pts)
    rs = [2.4 - 0.8 * i / (n - 1) for i in range(n)]
    t.pinta(traco(pts, rs).borda(0.35, 1.3, 3), "pelo", z, R=2.0, pid="cauda", semente=seed)
    t.pinta(traco(pts[-3:], [rs[-3] * 0.95, rs[-2] * 0.95, rs[-1] * 0.95]), "pelo_listra", 0, sobre="cauda", R=1.8)
    for i in range(2, n - 3, 2):
        t.pinta(circulo(pts[i], 1.0), "pelo_listra", 0, sobre="cauda", R=1.5)


def gato_sombra(t: Tela, cx, larg, y=38, forca=1.0):
    for x in range(int(cx - larg) - 1, int(cx + larg) + 2):
        d = abs(x + 0.5 - cx) / larg
        if d < 1:
            t.ponto_fx(x, y, "#0c0710", (0.4 if d < 0.6 else 0.25) * forca, sob=True)
            if d < 0.7:
                t.ponto_fx(x, y + 1, "#0c0710", 0.2 * forca, sob=True)


def gato_sentado_v(t: Tela, k: int, cauda_pts, cauda_z=1.0, pisca=False, cabeca_inc=0.0, dy=0.0, olhar=(0.0, 0.0), feliz=False,
                   pata1=None, sombra=1.0, orelha_tw=0.0):
    """O gato sentado de gato_sentado com a cauda em qualquer traçado, o corpo deslocado em dy e a pata direita livre
    (pata1 = (dx, dy) da ponta da pata)."""
    t.origem = (0.0, 0.0)
    gato_sombra(t, 32, 18 - 4 * (1 - sombra), forca=sombra)
    resp = 0.4 * math.sin(k / GQ * TAU)
    gato_cauda(t, cauda_pts, cauda_z)
    quad = elipse((28.0, 30.0 + dy), 10.5, 8.0 + resp * 0.3).borda(0.4, 1.0, 5)
    t.pinta(quad, "pelo", 2.0, R=6.0, pid="corpo", semente=302)
    corpo = elipse((35.0, 24.5 - resp * 0.2 + dy), 7.4, 10.4, -12).borda(0.4, 1.0, 6)
    t.pinta(corpo, "pelo", 2.2, R=5.0, pid="peito", semente=303)
    t.pinta(listras(28, 30 + dy, 80, 0.9, 0.45, 2, (16, 20 + dy, 40, 39 + dy)), "pelo_listra", 0, sobre="corpo", R=3.0)
    t.pinta(listras(34, 24 + dy, 75, 1.0, 0.5, 4, (26, 13 + dy, 44, 36 + dy)), "pelo_listra", 0, sobre="peito", R=3.0)
    t.pinta(elipse((38.2, 25.0 + dy), 3.8, 6.8, -10).borda(0.5, 1.2, 9), "pelo_branco", 0, sobre="peito", R=4.0)
    t.pinta(elipse((22.5, 36.6 + dy), 4.6, 1.8), "pelo_branco", 2.4, R=1.6, pid="pata_tras", semente=304)
    for i, x in enumerate((34.6, 39.6)):
        topo = 27.0 + dy
        if i == 1 and pata1 is not None:
            fx, fy = x + pata1[0], 36.2 + dy + pata1[1]
        else:
            fx, fy = x + 0.2, 36.2 + dy
        t.pinta(capsula((x, topo), (fx, fy), 1.9, 1.8).borda(0.25, 1.4, 11 + i), "pelo", 3.0 + i * 0.1, R=1.8, pid=f"pata{i}", semente=305 + i)
        ang = math.atan2(fy - topo, fx - x)
        bx, by = fx - math.cos(ang) * 2.6, fy - math.sin(ang) * 2.6
        t.pinta(capsula((bx, by), (fx, fy), 1.9, 1.8), "pelo_branco", 0, sobre=f"pata{i}", R=1.8)
        t.pinta(elipse((fx + 0.4, fy + 0.8), 2.5, 1.4, ang=math.degrees(ang) - 90), "pelo_branco", 3.05 + i * 0.1, R=1.2, pid=f"pata{i}")
        for ddx in (-0.4, 0.9):
            t.pinta(capsula((fx + 0.4 + ddx, fy + 0.2), (fx + 0.4 + ddx, fy + 1.6), 0.25), "pelo_branco", 0, sobre=f"pata{i}", tom=-0.3, normal=False)
    return gato_cabeca(t, (38.5, 13.2 + resp * 0.3 + dy), cabeca_inc, pisca, olhar, feliz, orelha_tw=orelha_tw)


def gato_sentado_ereto(t: Tela, k: int):
    """Sentado ereto, a cauda enrolando devagar em volta das patas da frente e uma piscada lenta."""
    f = k / GQ * TAU
    enrola = 0.5 + 0.5 * math.sin(f)
    ponta = (45.0 + 1.2 * enrola, 33.0 - 2.6 * enrola)
    pts = bezier((21.0, 34.5), (24.0, 39.6), (34.0, 38.6), 6)[:-1] + bezier((34.0, 38.6), (43.0, 38.2), ponta, 5)
    gato_sentado_v(t, k, pts, cauda_z=3.4, pisca=(k == 3), cabeca_inc=-3.0 + 3.0 * math.sin(f - 0.8), orelha_tw=1.0 if k == 5 else 0.0)


def gato_andando(t: Tela, k: int):
    """Ciclo de caminhada de perfil (para a direita), com a cabeça virada para quem olha."""
    t.origem = (0.0, 0.0)
    f = k / GQ * TAU
    bob = 0.5 * abs(math.sin(f))
    gato_sombra(t, 32, 19)
    # patas de longe (mais escuras, atrás do corpo) e de perto; marcha em diagonal
    patas = (("tras_l", 20.0, 0.0, 1.2), ("frente_l", 41.0, math.pi, 1.2), ("tras_p", 22.5, math.pi, 3.0), ("frente_p", 43.5, 0.0, 3.0))
    for nome, x, fase, z in patas:
        ph = f + fase
        passo = 3.4 * math.sin(ph)
        ergue = max(0.0, math.cos(ph)) * 2.2
        topo = (x, 27.0 - bob)
        pe_ = (x + passo, 36.6 - ergue)
        joelho = ((topo[0] + pe_[0]) / 2 + (1.2 if "tras" in nome else -0.6), (topo[1] + pe_[1]) / 2)
        longe = z < 2
        t.pinta(traco([topo, joelho, pe_], [2.2, 1.8, 1.6]).borda(0.2, 1.4, 31), "pelo", z, R=1.6, pid=f"pata_{nome}", semente=350,
                tom=-0.18 if longe else 0.0)
        t.pinta(elipse((pe_[0] + 0.9, pe_[1] + 0.4), 2.2, 1.2), "pelo_branco", z + 0.05, R=1.0, pid=f"pata_{nome}", tom=-0.15 if longe else 0.0)
    # cauda erguida em gancho, balançando
    sw = 1.6 * math.sin(f)
    pts = bezier((17.0, 24.0 - bob), (9.0 + sw * 0.3, 20.0), (9.5 + sw, 10.5), 6)[:-1] + bezier((9.5 + sw, 10.5), (10.0 + sw, 6.0), (14.0 + sw * 1.2, 6.4), 4)
    gato_cauda(t, pts, 1.6)
    corpo = elipse((31.0, 25.0 - bob), 14.0, 6.6).suave(elipse((41.0, 24.0 - bob), 6.2, 6.8), 2.0).borda(0.4, 1.0, 32)
    t.pinta(corpo, "pelo", 2.0, R=5.5, pid="corpo", semente=351)
    t.pinta(listras(30, 25 - bob, 0, 0.95, 0.45, 8, (16, 16, 48, 33)), "pelo_listra", 0, sobre="corpo", R=3.0)
    t.pinta(elipse((33.0, 30.0 - bob), 9.0, 2.0).borda(0.4, 1.3, 33), "pelo_branco", 0, sobre="corpo", R=2.0)
    t.pinta(elipse((45.0, 26.0 - bob), 3.0, 4.0).borda(0.4, 1.3, 34), "pelo_branco", 0, sobre="corpo", R=2.0)
    gato_cabeca(t, (47.5, 15.4 - bob * 0.6), 6.0 + 2.0 * math.sin(f), pisca=False, olhar=(0.3, 0.0), z=4.0)


def gato_espreguicando(t: Tela, k: int):
    """Alongamento de gato: patas da frente esticadas no chão, peito baixo e o traseiro para cima."""
    t.origem = (0.0, 0.0)
    a = 0.5 - 0.5 * math.cos(k / GQ * TAU)        # 0 sentado-agachado, 1 alongamento completo
    gato_sombra(t, 33, 20)
    quad = (22.0, 24.0 - 3.0 * a)
    peito = (40.0, 28.0 + 3.0 * a)
    # patas de trás em pé, de perto e de longe
    for nome, x, z in (("tras_l", 20.0, 1.2), ("tras_p", 23.0, 3.0)):
        t.pinta(traco([(x, quad[1] + 2), (x + 1.4, 31.0), (x + 0.4, 36.6)], [2.4, 1.9, 1.6]).borda(0.2, 1.4, 35), "pelo", z, R=1.6, pid=f"pata_{nome}",
                semente=360, tom=-0.18 if z < 2 else 0.0)
        t.pinta(elipse((x + 1.2, 37.0), 2.3, 1.2), "pelo_branco", z + 0.05, R=1.0, pid=f"pata_{nome}", tom=-0.15 if z < 2 else 0.0)
    # patas da frente esticadas para a frente
    for nome, dx, z in (("frente_l", 1.6, 1.3), ("frente_p", 0.0, 3.2)):
        alcance = 49.0 + 5.0 * a + dx
        t.pinta(traco([(peito[0] - 1, peito[1] + 1), (alcance - 4.0, 35.0), (alcance, 36.4)], [2.2, 1.7, 1.6]).borda(0.2, 1.4, 36), "pelo", z, R=1.5,
                pid=f"pata_{nome}", semente=361, tom=-0.18 if z < 2 else 0.0)
        t.pinta(elipse((alcance + 0.8, 36.8), 2.4, 1.2), "pelo_branco", z + 0.05, R=1.0, pid=f"pata_{nome}", tom=-0.15 if z < 2 else 0.0)
    # cauda em pé, com a ponta curvada
    sw = 1.2 * math.sin(k / GQ * TAU * 2)
    pts = bezier((quad[0] - 6.0, quad[1] - 1.0), (8.0, quad[1] - 6.0), (10.0 + sw, 6.0 - a), 6)[:-1] + bezier((10.0 + sw, 6.0 - a), (11.0 + sw, 2.4), (14.6 + sw, 3.2), 4)
    gato_cauda(t, pts, 1.6)
    corpo = (elipse(quad, 8.6, 7.0).suave(elipse(peito, 7.4, 5.6, ang=18 * a), 6.0)
             .suave(capsula(quad, peito, 5.4), 2.0)).borda(0.4, 1.0, 37)
    t.pinta(corpo, "pelo", 2.0, R=5.5, pid="corpo", semente=362)
    t.pinta(listras(30, 26, -10 * a, 0.95, 0.45, 9, (12, 12, 50, 36)), "pelo_listra", 0, sobre="corpo", R=3.0)
    t.pinta(elipse((peito[0] + 2.0, peito[1] + 2.2), 5.0, 2.4, ang=18 * a).borda(0.4, 1.3, 38), "pelo_branco", 0, sobre="corpo", R=2.0)
    abre = max(0.0, (a - 0.6) / 0.4)
    gato_cabeca(t, (47.0 + 1.5 * a, 20.0 + 6.0 * a), 10.0 * a, pisca=a > 0.75, boca_aberta=0.9 * abre, z=4.0)


def bola_la(t: Tela, c, giro: float, z: float, fio=True):
    """Bolinha de lã vermelha com as voltas do fio e uma ponta solta no chão."""
    t.pinta(circulo(c, 3.4).borda(0.25, 1.6, 41), "la", z, R=3.0, pid="bola", semente=470)
    for i in range(3):
        a = giro + i * 1.05
        dx, dy = math.cos(a) * 2.6, math.sin(a) * 2.6
        t.pinta(traco(bezier((c[0] - dx, c[1] - dy), (c[0] + dy * 0.5, c[1] - dx * 0.5), (c[0] + dx, c[1] + dy), 6), 0.32), "la", 0, sobre="bola", tom=-0.2 if i % 2 else 0.18, normal=False)
    if fio:
        t.pinta(traco(bezier((c[0] - 1.0, c[1] + 3.0), (c[0] + 3.0, 39.0), (c[0] + 8.0, 37.6), 7), 0.45), "la", z - 0.1, R=0.5, pid="fio", sem_contorno=True)


def gato_brincando(t: Tela, k: int):
    """Sentado, batendo com a pata numa bolinha de lã, que rola e volta."""
    golpe = [0.0, 0.6, 1.0, 0.4, 0.0, 0.0][k]
    rola = [0.0, 0.0, 0.3, 1.0, 0.8, 0.3][k]
    bc = (52.0 + 3.0 * rola, 34.6)
    sw = 20 * math.sin(k / GQ * TAU)
    a = math.radians(sw)
    pts = bezier((21.0, 34.5), (11.5 + 1.5 * math.sin(a), 32.0), (9.0 + 6.0 * math.sin(a), 23.0), 6)[:-1] + bezier(
        (9.0 + 6.0 * math.sin(a), 23.0), (8.0 + 2 * math.sin(a), 18.0), (12.5 + 9.0 * math.sin(a), 17.5), 5)
    olho = (0.5, 0.6)
    gato_sentado_v(t, k, pts, cauda_z=1.0, cabeca_inc=6.0 + 3.0 * golpe, olhar=olho,
                   pata1=(3.0 + 6.0 * golpe, -2.0 - 6.0 * golpe + 4.0 * golpe * golpe), orelha_tw=0.6 * golpe)
    bola_la(t, bc, rola * 2.4, 3.6)


def livrinho(t: Tela, c, virar: float, z: float):
    """Livrinho aberto no chão, de frente para o gato."""
    q = _escala(Quadro2D(c, 0.0), 1.15)
    t.pinta(q.forma(poligono([(-7.6, -2.6), (0, -1.2), (7.6, -2.6), (7.9, 2.8), (0, 3.8), (-7.9, 2.8)])), "capa_livro", z, R=1.0, pid="livrinho_capa", plano=(0, 0.5, 0.86))
    for s_ in (-1, 1):
        pts = bezier((0, -1.4), (s_ * 3.6, -4.0), (s_ * 7.0, -3.2), 5) + bezier((s_ * 7.2, 2.0), (s_ * 3.6, 1.4), (0, 2.8), 5)
        t.pinta(q.forma(poligono(pts)), "papel", z + 0.1, R=1.4, pid=f"livrinho_pag{s_}", plano=(s_ * -0.25, 0.45, 0.86), semente=480)
        for j in range(3):
            y0 = -1.6 + j * 1.3
            t.pinta(q.forma(capsula((s_ * 1.6, y0), (s_ * 5.6, y0 - 0.5), 0.3)), "tinta", 0, sobre=f"livrinho_pag{s_}", R=0.4)
    t.pinta(q.forma(capsula((0, -0.4), (0, 3.0), 0.35)), "papel", z + 0.15, R=0.4, pid="livrinho_meio", tom=-0.35)
    if 0 < virar < 1:
        kk = math.cos(virar * math.pi)
        topo = -0.6 - math.sin(virar * math.pi) * 3.4
        t.pinta(q.forma(poligono([(0, -0.4), (kk * 6.6, topo - 0.8), (kk * 6.8, topo + 2.6), (0, 2.8)])), "papel", z + 0.3, R=1.0, pid="livrinho_folha", tom=0.06)


def gato_lendo(t: Tela, k: int):
    """Deitado de barriga, a cabeça erguida olhando um livrinho aberto; a ponta da cauda balança."""
    t.origem = (0.0, 0.0)
    f = k / GQ * TAU
    gato_sombra(t, 32, 22)
    resp = math.sin(f)
    sw = math.sin(f * 1.0)
    # cauda atrás, deitada e com a ponta erguida, balançando
    pts = bezier((14.0, 31.0), (6.0, 33.0), (6.0, 26.0 - 2.0 * sw), 6)[:-1] + bezier((6.0, 26.0 - 2.0 * sw), (6.5 + 2.4 * sw, 21.0), (10.0 + 3.6 * sw, 20.6 + abs(sw)), 4)
    gato_cauda(t, pts, 1.0)
    corpo = elipse((27.0, 30.0 - resp * 0.3), 15.0, 7.4 + resp * 0.35).borda(0.4, 1.0, 21)
    t.pinta(corpo, "pelo", 2.0, R=7.0, pid="corpo", semente=340)
    t.pinta(listras(27, 30, 90, 0.85, 0.42, 7, (10, 20, 44, 39)), "pelo_listra", 0, sobre="corpo", R=3.0)
    t.pinta(elipse((33.0, 34.6), 7.0, 2.4).borda(0.4, 1.3, 22), "pelo_branco", 0, sobre="corpo", R=2.0)
    t.pinta(elipse((38.0, 27.0), 4.4, 5.6).borda(0.4, 1.3, 23), "pelo_branco", 0, sobre="corpo", R=2.0)
    virar = {3: 0.35, 4: 0.75}.get(k, 0.0)
    livrinho(t, (50.0, 34.0), virar, 3.0)
    # patinhas da frente esticadas atrás do livro, só as pontas aparecendo dos lados
    for i, x in enumerate((39.4,)):
        t.pinta(elipse((x, 36.0), 2.2, 1.3), "pelo_branco", 2.6, R=1.0, pid=f"patinha{i}", semente=342)
        for ddx in (-0.5, 0.7):
            t.pinta(capsula((x + ddx, 35.0), (x + ddx, 36.6), 0.25), "pelo_branco", 0, sobre=f"patinha{i}", tom=-0.3, normal=False)
    pisca = k == 1
    gato_cabeca(t, (44.0, 20.4 - resp * 0.2), 4.0 + 1.5 * math.sin(f), pisca=pisca, olhar=(0.5 - 0.5 * math.cos(f), 0.8),
                orelha_tw=1.0 if k == 4 else 0.0, z=4.0)


def gato_comemorando(t: Tela, k: int):
    """Pulinho de alegria com a cauda em pé."""
    alt = [0.0, -1.2, 2.2, 2.6, 1.0, -0.8][k]        # positivo = no ar
    sw = 1.0 * math.sin(k / GQ * TAU * 2)
    base = (22.0, 33.0 - max(0.0, alt))
    pts = bezier(base, (15.0, 30.0 - alt), (15.5 + sw, 16.0 - alt), 6)[:-1] + bezier((15.5 + sw, 16.0 - alt), (16.0 + sw, 7.0 - alt), (19.6 + sw * 1.4, 5.6 - alt), 5)
    no_ar = max(0.0, alt) / 2.6
    gato_sentado_v(t, k, pts, cauda_z=1.0, dy=-alt, feliz=no_ar > 0.5, pisca=False, cabeca_inc=-4.0 * no_ar + 2.0 * max(0.0, -alt),
                   pata1=(1.4 * no_ar, -2.6 * no_ar), sombra=1.0 - 0.4 * no_ar)
    if no_ar > 0.3:
        for j, (dx, dy) in enumerate(((-9.0, -8.0), (12.0, -6.0), (9.0, 2.0))):
            cintila(t, 38.5 + dx, 13.0 - alt + dy, 1, "#fff1a8", 0.8)


# ─────────── linhas novas do gato (01/11/2026) ───────────
def palpebra(t, q, cx, fecha, z=4.4):
    """Pálpebra de pelo cobrindo a metade de cima do olho (piscada lenta)."""
    if fecha <= 0:
        return
    alto = -0.6 - 1.9 + 3.8 * fecha * 0.55
    t.pinta(q.forma(elipse((cx, -0.6), 1.9, 2.0) & semiplano((0, alto), (0, 1))), "pelo", z, R=0.8, pid="palpebra", sem_contorno=True, tom=0.05)
    t.pinta(q.forma(capsula((cx - 1.7, alto), (cx + 1.7, alto), 0.3)), "pupila", z + 0.01, pid="palpebra", sem_contorno=True)


def gato_observando(t, k):
    f = k / GQ * TAU
    pisca = [0.0, 0.0, 0.5, 1.0, 0.5, 0.0][k]
    a = math.radians(26 * math.sin(f))
    pts = bezier((21.0, 34.5), (11.5 + 1.5 * math.sin(a), 32.0), (9.0 + 6.0 * math.sin(a), 23.0), 6)[:-1] + bezier(
        (9.0 + 6.0 * math.sin(a), 23.0), (8.0 + 2 * math.sin(a), 18.0), (12.5 + 9.0 * math.sin(a), 17.5), 5)
    q = gato_sentado_v(t, k, pts, cauda_z=1.0, pisca=pisca >= 1.0, cabeca_inc=-12.0 + 1.0 * math.sin(f), olhar=(-0.45, -0.6), dy=0.0)
    if 0 < pisca < 1:
        for s_ in (-1, 1):
            palpebra(t, q, s_ * 3.4, pisca)


def gato_fogueira(t, k):
    """Deitado em pão-de-forma, de costas para a direita, olhando o fogo à esquerda."""
    t.origem = (0.0, 0.0)
    f = k / GQ * TAU
    resp = math.sin(f)
    gato_sombra(t, 34, 19)
    t.luz(-12.0, 26.0, 16.0, "#ff8a2a", 64.0, 1.5 + 0.25 * math.sin(k * 2.3) + 0.1 * math.sin(k * 4.1))
    # cauda enrolada na frente, ponta mexendo
    tw = math.sin(f)
    pts = bezier((48.0, 32.0), (52.0, 38.4), (38.0, 37.6), 6)[:-1] + bezier((38.0, 37.6), (30.0, 37.4), (25.0 + tw * 1.2, 35.6 - abs(tw) * 0.8), 5)
    corpo = elipse((36.0, 30.0 - resp * 0.3), 14.0, 7.6 + resp * 0.35).suave(elipse((44.0, 29.0), 8.0, 7.4), 2.0).borda(0.4, 1.0, 21)
    t.pinta(corpo, "pelo", 2.0, R=7.0, pid="corpo", semente=340)
    t.pinta(listras(38, 29, 90, 0.85, 0.42, 7, (20, 18, 56, 39)), "pelo_listra", 0, sobre="corpo", R=3.0)
    t.pinta(elipse((26.0, 33.0), 5.0, 3.4).borda(0.4, 1.3, 23), "pelo_branco", 0, sobre="corpo", R=2.0)
    # patinhas dobradas por baixo do peito (só a pontinha)
    t.pinta(elipse((22.4, 37.0), 3.0, 1.3), "pelo_branco", 2.6, R=1.0, pid="patinhas", semente=342)
    gato_cauda(t, pts, 3.2)
    tw_or = [0.0, 0.0, 1.0, 0.0, 0.0, 0.6][k]
    gato_cabeca(t, (21.0, 22.0 - resp * 0.2), -4.0 + 1.0 * math.sin(f), pisca=(k == 4), olhar=(-0.5, 0.2), orelha_tw=tw_or, z=4.0)


def gato_ronronando(t, k):
    """Deitado de lado, olhos fechados, barriga subindo e descendo, cauda enrolada, patas esticadas."""
    t.origem = (0.0, 0.0)
    f = k / GQ * TAU
    resp = math.sin(f)
    gato_sombra(t, 32, 23)
    # patas esticadas para a frente (quem olha), de longe e de perto
    for i, (x0, x1, z) in enumerate(((37.0, 43.0, 2.5), (41.0, 47.6, 2.6), (19.0, 24.6, 2.5), (23.0, 28.0, 2.6))):
        t.pinta(capsula((x0, 32.0), (x1, 35.8), 1.8, 1.5).borda(0.2, 1.4, 60 + i), "pelo", z, R=1.6, pid=f"pata{i}", semente=600 + i, tom=-0.1 if i % 2 == 0 else 0.0)
        t.pinta(elipse((x1 + 0.8, 36.4), 2.3, 1.2), "pelo_branco", z + 0.05, R=1.0, pid=f"pata{i}", tom=-0.1 if i % 2 == 0 else 0.0)
    corpo = elipse((30.0, 27.6 - resp * 0.2), 17.0, 8.0 + resp * 0.55).borda(0.4, 1.0, 61)
    t.pinta(corpo, "pelo", 2.0, R=7.0, pid="corpo", semente=610)
    t.pinta(listras(30, 26, 90, 0.85, 0.42, 11, (12, 16, 48, 36)), "pelo_listra", 0, sobre="corpo", R=3.0)
    barriga = elipse((32.0, 32.6 - resp * 0.1), 10.0, 1.9 + resp * 0.45).borda(0.4, 1.3, 62)
    t.pinta(barriga, "pelo_branco", 0, sobre="corpo", R=2.0)
    # cauda enrolada por cima das patas de trás
    pts = bezier((13.5, 27.0), (8.0, 36.0), (18.0, 38.0), 6)[:-1] + bezier((18.0, 38.0), (24.0, 38.6), (27.0 + 0.4 * resp, 36.2), 4)
    gato_cauda(t, pts, 2.8)
    # cabeça deitada no chão (de lado), olhos fechados
    q = gato_cabeca(t, (49.0, 28.6 - resp * 0.15), 22.0, pisca=True, z=4.0)


def gato_acordando(t, k):
    """Toca uma vez: dormindo → abre os olhos → boceja → senta. Quadro 0 = dormindo (0); quadro 5 = acordado (0)."""
    if k == 0:
        gato_dormindo(t, 0)
        return
    if k == 5:
        gato_sentado(t, 0, cauda=0.0, pisca=False, tala=False)
        return
    t.origem = (0.0, 0.0)
    if k in (1, 2):
        # ainda deitado de barriga, a cabeça se ergue
        gato_sombra(t, 32, 22)
        pts = bezier((13.5, 30.5), (16.0, 37.6), (33.0, 36.2), 10)
        corpo = elipse((29.0, 30.0), 16.5, 8.0).borda(0.4, 1.0, 21)
        t.pinta(corpo, "pelo", 2.0, R=7.0, pid="corpo", semente=340)
        t.pinta(listras(29, 30, 90, 0.85, 0.42, 7, (12, 20, 46, 39)), "pelo_listra", 0, sobre="corpo", R=3.0)
        t.pinta(elipse((36.0, 34.4), 7.0, 2.6).borda(0.4, 1.3, 22), "pelo_branco", 0, sobre="corpo", R=2.0)
        gato_cauda(t, pts, 3.0, seed=341)
        t.pinta(elipse((44.5, 35.2), 3.2, 1.6), "pelo_branco", 3.2, R=1.2, pid="patas", semente=342)
        if k == 1:
            q = gato_cabeca(t, (42.6, 25.0), 8.0, pisca=False, olhar=(0.0, 0.4), z=4.0)
            for s_ in (-1, 1):
                palpebra(t, q, s_ * 3.4, 0.5)
        else:
            gato_cabeca(t, (42.0, 21.6), -8.0, pisca=True, boca_aberta=1.2, z=4.0)
        return
    if k == 3:
        # levantando a frente: patas da frente esticadas, traseiro ainda no chão, boceja no fim
        gato_sombra(t, 32, 20)
        pts = bezier((14.0, 33.0), (10.0, 38.0), (24.0, 38.2), 6)
        quad = elipse((26.0, 31.0), 11.0, 7.0).borda(0.4, 1.0, 5)
        t.pinta(quad, "pelo", 2.0, R=6.0, pid="corpo", semente=302)
        peito = elipse((36.0, 27.0), 7.4, 9.0, -30).borda(0.4, 1.0, 6)
        t.pinta(peito, "pelo", 2.2, R=5.0, pid="peito", semente=303)
        t.pinta(listras(28, 30, 80, 0.9, 0.45, 2, (14, 20, 40, 39)), "pelo_listra", 0, sobre="corpo", R=3.0)
        t.pinta(elipse((39.0, 28.0), 3.6, 6.0, -26).borda(0.5, 1.2, 9), "pelo_branco", 0, sobre="peito", R=4.0)
        gato_cauda(t, pts, 3.0)
        for i, x in enumerate((37.0, 41.4)):
            t.pinta(capsula((x - 1.0, 29.0), (x + 1.6, 36.2), 1.9, 1.8).borda(0.25, 1.4, 11 + i), "pelo", 3.0 + i * 0.1, R=1.8, pid=f"pata{i}", semente=305 + i)
            t.pinta(elipse((x + 2.0, 37.0), 2.5, 1.4), "pelo_branco", 3.05 + i * 0.1, R=1.2, pid=f"pata{i}")
        gato_cabeca(t, (40.8, 16.4), -6.0, pisca=True, boca_aberta=0.5, z=4.0)
        return
    # k == 4: quase sentado, piscando
    pts = bezier((21.0, 34.5), (11.5, 32.0), (9.0, 23.0), 6)[:-1] + bezier((9.0, 23.0), (8.0, 18.0), (12.5, 17.5), 5)
    q = gato_sentado_v(t, 4, pts, cauda_z=1.0, cabeca_inc=-3.0, dy=1.2)
    for s_ in (-1, 1):
        palpebra(t, q, s_ * 3.4, 0.5)


# ─────────── terceira leva do gato (01/11/2026, sempre no fim) ───────────
def gato_olhando_cima(t, k):
    """Sentado, olhando para cima e para a direita (algo na prateleira de cima): orelhas para a frente, a cabeça sobe
    devagar e a ponta da cauda enrola e desenrola; uma piscada lenta no quadro 4."""
    f = k / GQ * TAU
    enrola = 0.5 + 0.5 * math.sin(f)
    ponta = (44.6 + 1.4 * enrola, 33.4 - 3.0 * enrola)
    pts = bezier((21.0, 34.5), (24.0, 39.6), (34.0, 38.6), 6)[:-1] + bezier((34.0, 38.6), (43.0, 38.2), ponta, 5)
    q = gato_sentado_v(t, k, pts, cauda_z=3.4, cabeca_inc=-15.0 - 2.5 * math.sin(f + 0.6), olhar=(0.45, -0.75),
                       orelha_tw=1.0 + 0.4 * math.sin(f))
    if k == 4:
        for s_ in (-1, 1):
            palpebra(t, q, s_ * 3.4, 0.5)


LINHAS_GATO = [("dormindo", "dormindo"), ("acordado", "acordado"), ("tala", "com a tala no braço"),
               # linhas novas (31/10/2026)
               ("sentado", "sentado"), ("andando", "andando"), ("espreguicando", "se espreguiçando"),
               ("brincando", "brincando com a bolinha de lã"), ("lendo", "lendo"), ("comemorando", "comemorando"),
               # segunda leva (01/11/2026)
               ("observando", "observando"), ("fogueira", "deitado perto da fogueira"), ("ronronando", "ronronando"),
               ("acordando", "acordando"),
               # terceira leva (01/11/2026)
               ("olhando_cima", "olhando para cima")]
LINHAS_GATO_ANTIGAS = 3
LINHAS_GATO_POSES_31 = 6
LINHAS_GATO_POSES_2 = 4          # segunda leva (gato-poses2.png); a terceira vai para gato-poses3.png
NOVAS_GATO = {"sentado": gato_sentado_ereto, "andando": gato_andando, "espreguicando": gato_espreguicando,
              "brincando": gato_brincando, "lendo": gato_lendo, "comemorando": gato_comemorando,
              "observando": gato_observando, "fogueira": gato_fogueira, "ronronando": gato_ronronando, "acordando": gato_acordando,
              "olhando_cima": gato_olhando_cima}


def q_gato(linha: str, k: int) -> Tela:
    t = Tela(GW, GH)
    if linha in NOVAS_GATO:
        NOVAS_GATO[linha](t, k)
        return t
    if linha == "dormindo":
        gato_dormindo(t, k)
    elif linha == "acordado":
        gato_sentado(t, k, cauda=28 * math.sin(k / GQ * TAU), pisca=(k == 4), tala=False)
    else:
        gato_sentado(t, k, cauda=18 * math.sin(k / GQ * TAU), pisca=(k == 2), tala=True, cabeca_inc=-6 + 2 * math.sin(k / GQ * TAU),
                     pata_ergue=0.8 + 0.6 * math.sin(k / GQ * TAU))
    return t


def folha_gato() -> Image.Image:
    folha = Image.new("RGBA", (GW * GQ, GH * len(LINHAS_GATO)), (0, 0, 0, 0))
    for li, (ident, _) in enumerate(LINHAS_GATO):
        for k in range(GQ):
            folha.paste(Image.fromarray(q_gato(ident, k).render(), "RGBA"), (k * GW, li * GH))
    return folha


# ═══════════════════════════════ saída ═══════════════════════════════
def _quantizar_por_blocos(img: Image.Image, corte: int) -> Image.Image:
    """Paleta de 256 cores separada para as linhas antigas (acima de `corte`) e para as novas: assim acrescentar linhas
    no fim nunca muda um pixel das antigas (a paleta das antigas sai igual à de antes)."""
    topo = img.crop((0, 0, img.width, corte)).quantize(256, method=Image.Quantize.FASTOCTREE).convert("RGBA")
    resto = img.crop((0, corte, img.width, img.height)).quantize(256, method=Image.Quantize.FASTOCTREE).convert("RGBA")
    out = Image.new("RGBA", img.size)
    out.paste(topo, (0, 0))
    out.paste(resto, (0, corte))
    return out


def _paleta_exata(img: Image.Image) -> Image.Image:
    """Se a imagem cabe em 256 cores RGBA, devolve a mesma imagem em modo P sem perder nenhum pixel (arquivo menor);
    senão devolve como está."""
    cores = img.getcolors(256)
    if cores is None:
        return img
    arr = np.asarray(img.convert("RGBA"))
    pal = np.array([c for _, c in cores], np.uint8)
    chave = lambda a: (a[..., 0].astype(np.uint32) << 24) | (a[..., 1].astype(np.uint32) << 16) | (a[..., 2].astype(np.uint32) << 8) | a[..., 3]
    ordem = np.argsort(chave(pal))
    idx = ordem[np.searchsorted(chave(pal)[ordem], chave(arr))].astype(np.uint8)
    out = Image.fromarray(idx, "P")
    out.putpalette(pal.tobytes(), rawmode="RGBA")
    return out


def salvar(img: Image.Image, caminho: Path, corte: int | None = None) -> None:
    """Grava em PNG; usa paleta de 256 cores (pixel art cabe nela) quando fica menor.
    Com `corte` (altura em pixels das linhas antigas), as antigas e as novas ganham paletas separadas (31/10/2026)."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    if corte is not None and img.height > corte:
        img = _quantizar_por_blocos(img, corte)   # até 512 cores: grava em RGBA (sem perder nenhuma)
        _paleta_exata(img).save(caminho, optimize=True)
        print(caminho.relative_to(PASTA.parents[2]) if caminho.is_relative_to(PASTA.parents[2]) else caminho, img.size, caminho.stat().st_size, "bytes")
        return
    img.save(caminho, optimize=True)
    tam = caminho.stat().st_size
    pal = img.quantize(256, method=Image.Quantize.FASTOCTREE)
    tmp = caminho.with_suffix(".tmp.png")
    pal.save(tmp, optimize=True)
    if tmp.stat().st_size < tam:
        tmp.replace(caminho)
    else:
        tmp.unlink()
    print(caminho.relative_to(PASTA.parents[2]) if caminho.is_relative_to(PASTA.parents[2]) else caminho, img.size, caminho.stat().st_size, "bytes")


def main() -> None:
    if os.environ.get("SAIDA"):
        salvar(folha_esqueleto(), Path(os.environ["SAIDA"]))
        return
    # As 14 linhas do esqueleto e as 3 do gato de antes de 31/10/2026 ficam na folha de sempre (a do topo da página
    # inicial, leve); as poses novas vão para uma segunda folha (esqueleto-poses.png e gato-poses.png), carregada só
    # onde uma pose fixa aparece. Cada folha com a sua paleta: as antigas saem iguais, pixel a pixel e em bytes.
    esq, gato = folha_esqueleto(), folha_gato()
    salvar(esq.crop((0, 0, esq.width, FH * LINHAS_ANTIGAS)), PASTA / "esqueleto.png")
    # Cada leva de poses tem a sua folha (31/10/2026): esqueleto-poses.png e gato-poses.png (primeira leva) e
    # esqueleto-poses2.png e gato-poses2.png (segunda). Acrescentar poses nunca muda um byte das folhas que já existem,
    # cada folha cabe numa paleta de 256 cores (leve) e só carrega onde uma pose dela aparece.
    a1, a2 = FH * LINHAS_ANTIGAS, FH * (LINHAS_ANTIGAS + LINHAS_POSES_31)
    a3 = FH * (LINHAS_ANTIGAS + LINHAS_POSES_31 + LINHAS_POSES_2)
    salvar(esq.crop((0, a1, esq.width, a2)), PASTA / "esqueleto-poses.png")
    salvar(esq.crop((0, a2, esq.width, a3)), PASTA / "esqueleto-poses2.png")
    # tela de entrar (31/10/2026): jaleco longo e traje social, na sua própria folha
    a4 = a3 + FH * LINHAS_ACESSO
    salvar(esq.crop((0, a3, esq.width, a4)), PASTA / "esqueleto-acesso.png")
    # terceira leva (01/11/2026): as ações do diretor de cena da página inicial, uma por cenário
    salvar(esq.crop((0, a4, esq.width, a4 + FH * LINHAS_POSES_3)), PASTA / "esqueleto-poses3.png")
    salvar(gato.crop((0, 0, gato.width, GH * LINHAS_GATO_ANTIGAS)), PASTA / "gato.png")
    g1, g2 = GH * LINHAS_GATO_ANTIGAS, GH * (LINHAS_GATO_ANTIGAS + LINHAS_GATO_POSES_31)
    salvar(gato.crop((0, g1, gato.width, g2)), PASTA / "gato-poses.png")
    g3 = GH * (LINHAS_GATO_ANTIGAS + LINHAS_GATO_POSES_31 + LINHAS_GATO_POSES_2)
    salvar(gato.crop((0, g2, gato.width, g3)), PASTA / "gato-poses2.png")
    salvar(gato.crop((0, g3, gato.width, gato.height)), PASTA / "gato-poses3.png")
    if "--previa" in sys.argv:
        destino = Path(sys.argv[sys.argv.index("--previa") + 1])
        destino.mkdir(parents=True, exist_ok=True)
        for nome in ("esqueleto", "gato"):
            im = Image.open(PASTA / f"{nome}.png").convert("RGBA")
            fundo = Image.new("RGBA", im.size, (34, 44, 40, 255))
            fundo.alpha_composite(im)
            fundo.resize((im.width * 2, im.height * 2), Image.NEAREST).save(destino / f"{nome}-2x.png")


if __name__ == "__main__":
    main()
