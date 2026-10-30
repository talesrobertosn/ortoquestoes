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
    "capa": Mat(rampa("#0d0716", "#170d24", "#221333", "#2f1a45", "#3e2358", "#4f2e6c", "#653e82", "#7f5798"), hx("#08040e"), rim=0.55, tex=0.05, luz_pontual=0.55),
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
    cab = Quadro2D(Quadro2D(piv, ang_c).p(0, -26.5), ang_c)
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


def cranio(t: Tela, r: Rig, p: Pose, sob_capuz=False):
    q = r.cab
    uv = q.uv()
    v = p.vira
    # crânio de frente (referência do Tales, 30/10/2026): calota grande, maçãs do rosto saltadas dos lados e a maxila
    # estreita embaixo, com uma fileira só de dentes grandes e claros
    calota = elipse((0, -6.5), 25.0, 20.5)
    rosto = elipse((v * 0.8, 7.0), 23.0, 11.0)
    macas = circulo((-22.6 + v * 1.2, 12.0), 3.4) | circulo((22.6 + v * 1.2, 12.0), 3.4)
    maxila = caixa((0.4 + v * 1.4, 21.4), 13.6, 5.6, r=3.2)
    f = calota.suave(rosto, 5.0).suave(macas, 2.0).suave(maxila, 2.6)
    t.pinta(q.forma(f), "osso", 8.0, R=13.0, pid="cranio", uv=uv, semente=51)
    # sombras de modelado: têmporas, embaixo das maçãs (onde a maxila entra) e a testa mais clara
    for sx in (-1, 1):
        t.pinta(q.forma(elipse((sx * 21.0 + v * 0.6, 1.0), 3.4, 7.0)), "osso", 0, sobre="cranio", tom=-0.12, uv=uv, semente=51, normal=False)
        t.pinta(q.forma(elipse((sx * 16.8 + v * 1.3, 17.6), 3.0, 2.6)), "osso", 0, sobre="cranio", tom=-0.16, uv=uv, semente=51, normal=False)
    t.pinta(q.forma(elipse((-7 + v, -16.0), 8.0, 5.5)), "osso", 0, sobre="cranio", tom=0.05, uv=uv, semente=51, normal=False)
    # rachadura irregular no alto à direita, com a beira de baixo clara
    rach = [(9.5, -25.6), (10.6, -22.8), (9.4, -20.6), (12.2, -18.0), (11.6, -15.6), (13.8, -13.4)]
    t.pinta(q.forma(traco([(x + 0.7, y + 0.7) for x, y in rach], 0.5)), "osso", 0, sobre="cranio", tom=0.16, uv=uv, semente=51, normal=False)
    t.pinta(q.forma(traco(rach, 0.55)), "orbita", 0, sobre="cranio", R=-1, tom=0.25)
    t.pinta(q.forma(capsula((12.2, -18.0), (14.8, -19.4), 0.45)), "orbita", 0, sobre="cranio", R=-1, tom=0.25)
    # órbitas: ovais grandes, em pé e levemente abertas para fora, escuras e sem brilho
    for sx in (-1, 1):
        cx = sx * 12.0 + v * 2.2
        orb = elipse((cx, 4.2), 7.4 * (1 - 0.1 * v * sx), 9.6, ang=sx * 8)
        t.pinta(q.forma(orb), "orbita", 8.01, R=-3.5, pid="cranio", tom=0.0, uv=uv)
        t.pinta(q.forma(elipse((cx + sx * 0.4, 5.6), 5.0, 6.6, ang=sx * 8)), "orbita", 0, sobre="cranio", tom=0.12, normal=False)
    # nariz: duas fendas pequenas
    for sx in (-1, 1):
        t.pinta(q.forma(elipse((sx * 1.5 + v * 2.4, 11.4), 0.95, 2.4, ang=sx * -10)), "orbita", 8.01, R=-1.0, pid="cranio", tom=0.05)
    # dentes: uma fileira só, grandes e claros, separados por traços finos encaixados na grade de pixels
    bx = 0.4 + v * 1.4
    t.pinta(q.forma(traco(bezier((bx - 11.0, 18.8), (bx, 18.0), (bx + 11.0, 18.8), 9), 0.55)), "orbita", 0, sobre="cranio", tom=0.2)
    t.pinta(q.forma(traco(bezier((bx - 10.4, 22.6), (bx, 24.2), (bx + 10.4, 22.6), 9), 0.55)), "orbita", 0, sobre="cranio", tom=0.2)
    t.pinta(q.forma(elipse((bx, 20.0), 14.0, 5.4)), "osso", 0, sobre="cranio", tom=0.1, uv=uv, semente=51, normal=False)
    t.pinta(q.forma(caixa((bx, 20.9), 10.6, 1.8, r=0.6)), "osso", 0, sobre="cranio", tom=0.26, uv=uv, semente=51, normal=False)
    for i in range(1, 7):
        # cada traço é uma coluna de 1 pixel encaixada na grade (não some quando a cabeça inclina)
        x = bx - 10.5 + i * 3.0
        (x0, y0), (_, y1) = q.p(x, 19.6), q.p(x, 22.4 + 0.6 * (1 - abs(i - 3.5) / 3.5))
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
]


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


LINHAS_GATO = [("dormindo", "dormindo"), ("acordado", "acordado"), ("tala", "com a tala no braço")]


def q_gato(linha: str, k: int) -> Tela:
    t = Tela(GW, GH)
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
def salvar(img: Image.Image, caminho: Path) -> None:
    """Grava em PNG; usa paleta de 256 cores (pixel art cabe nela) quando fica menor."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    img.save(caminho, optimize=True)
    tam = caminho.stat().st_size
    pal = img.quantize(256, method=Image.Quantize.FASTOCTREE)
    tmp = caminho.with_suffix(".tmp.png")
    pal.save(tmp, optimize=True)
    if tmp.stat().st_size < tam:
        tmp.replace(caminho)
    else:
        tmp.unlink()
    print(caminho.relative_to(PASTA.parents[2]), img.size, caminho.stat().st_size, "bytes")


def main() -> None:
    salvar(folha_esqueleto(), PASTA / "esqueleto.png")
    salvar(folha_gato(), PASTA / "gato.png")
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
