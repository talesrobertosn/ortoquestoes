"""O mascote em pixel art HD-2D (30/10/2026): o esqueleto guerreiro chibi e o gato, feitos do zero por este script.

Nada é baixado nem gerado por IA: cada pixel sai das formas (campos de distância), da luz calculada e das paletas
abaixo. O personagem é original: crânio grande e redondo com rachadura, órbitas ovais enormes e baixas, dentes
retos, expressão séria; corpo pequeno com costelas e coluna; armadura leve (ombreira de aço amassada com correia,
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
    "orbita": Mat(rampa("#040206", "#08050b", "#0e0912", "#16101a", "#211823", "#30232c"), hx("#0c070c"), rim=0.0, amb=0.2, kd=0.8),
    "brilho": Mat(rampa("#26343e", "#4d6a78", "#86a8b4", "#c8dde0"), TINTA, emite=True, bloom=0.0),
    # armadura
    "aco": Mat(rampa("#16161e", "#262833", "#3a3e4a", "#535a66", "#717a84", "#939ca3", "#b8c0c2", "#e2e6e2"), hx("#0e0d14"), rim=0.55, tex=0.06, brilho=0.9),
    "ferrugem": Mat(rampa("#2a120c", "#4a2214", "#6e3a1e", "#93552a", "#b0733a"), hx("#140a08"), rim=0.2, tex=0.12),
    "couro": Mat(rampa("#1a0f0c", "#2c1a13", "#43281b", "#5c3824", "#784a2e", "#93603a", "#ad7a4c"), hx("#120a08"), rim=0.35, tex=0.08),
    "latao": Mat(rampa("#2a1a08", "#4f3410", "#7a5418", "#a87a26", "#d2a83c", "#f0d670", "#fff4b8"), hx("#170e05"), rim=0.3, brilho=1.0),
    "pano": Mat(rampa("#1a080c", "#2e0d14", "#47121c", "#621a24", "#7e252c", "#9a3536", "#b44c44"), hx("#12060a"), rim=0.4, tex=0.06),
    "capa": Mat(rampa("#0d0716", "#170d24", "#221333", "#2f1a45", "#3e2358", "#4f2e6c", "#653e82", "#7f5798"), hx("#08040e"), rim=0.55, tex=0.05),
    "forro": Mat(rampa("#07040b", "#0d0812", "#150d1c", "#1e1428"), hx("#05030a"), rim=0.0, amb=0.5, kd=0.4),
    # objetos
    "madeira": Mat(rampa("#1c100a", "#311c10", "#4c2e18", "#6a4322", "#8a5c30", "#a87642", "#c49358"), hx("#120a06"), rim=0.3, tex=0.1),
    "papel": Mat(rampa("#5a4a3e", "#8f7c66", "#bba88a", "#dccbaa", "#efe4c8", "#fbf6e6"), hx("#22160f"), rim=0.15, tex=0.03),
    "tinta": Mat(rampa("#3a2c2a", "#5a4840", "#7a6656"), hx("#22160f"), rim=0.0),
    "capa_livro": Mat(rampa("#14080a", "#2a0e12", "#45161a", "#622024", "#80302e", "#9c443c"), hx("#100507"), rim=0.35, tex=0.05),
    "caneca": Mat(rampa("#141c26", "#1f2e3e", "#2c4458", "#3d5e76", "#557c94", "#7ea0b2", "#b4ccd4"), hx("#0b1018"), rim=0.4, brilho=0.6),
    "cafe": Mat(rampa("#120804", "#26140a", "#3e2414", "#5a3820"), hx("#0c0604"), rim=0.0, brilho=0.4),
    "filme": Mat(rampa("#0a1220", "#0f1c30", "#16283f", "#203852", "#2c4a66"), hx("#05080f"), rim=0.2, brilho=0.3),
    "raiox": Mat(rampa("#2a4a6a", "#5084aa", "#8cc0dc", "#cbeaf6", "#f4ffff"), hx("#05080f"), emite=True, bloom=0.35),
    "marsh": Mat(rampa("#5a3a28", "#8a5a36", "#b88048", "#d8a868", "#ecd0a0", "#f8ecd8", "#fffaf0"), hx("#22140c"), rim=0.2),
    "borracha": Mat(rampa("#2a0a0c", "#4a1014", "#6e1a1c", "#962826", "#bc3c32", "#dc5c48"), hx("#140506"), rim=0.35, brilho=0.4),
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
            emis = np.array([MATS[nm].emite for nm in NOMES_MAT] + [True])[self.mat]
            fator = np.where(cheio & ~emis, 1.0, 0.0)[..., None]
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
    cab = Quadro2D(Quadro2D(piv, ang_c).p(0, -24), ang_c)
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
    # calota: larga em cima, maçãs do rosto e maxila mais estreitas
    calota = elipse((0, -6.5), 25.0, 20.5)
    rosto = elipse((0 + v * 0.8, 9.5), 17.0, 9.0)
    macas = circulo((-14.5 + v * 1.2, 7.5), 4.0) | circulo((14.5 + v * 1.2, 7.5), 4.0)
    f = calota.suave(rosto, 5.0).suave(macas, 2.5)
    t.pinta(q.forma(f), "osso", 8.0, R=13.0, pid="cranio", uv=uv, semente=51)
    # mandíbula pequena (peça da frente: ganha o traço da junta)
    mand = caixa((v * 1.2, 20.6), 8.6, 3.3, r=2.6).suave(elipse((v * 1.2, 22.4), 6.0, 2.0), 1.2)
    t.pinta(q.forma(mand), "osso", 8.3, R=3.0, pid="mandibula", uv=uv, semente=52)
    # sombras de modelado: têmporas, abaixo das maçãs, testa mais clara
    for sx in (-1, 1):
        t.pinta(q.forma(elipse((sx * 20.5 + v * 0.6, 3.0), 3.6, 7.5)), "osso", 0, sobre="cranio", tom=-0.13, uv=uv, semente=51, normal=False)
        t.pinta(q.forma(elipse((sx * 11.0 + v * 1.3, 15.2), 3.4, 1.8)), "osso", 0, sobre="cranio", tom=-0.12, uv=uv, semente=51, normal=False)
    t.pinta(q.forma(elipse((-7 + v, -16.0), 8.0, 5.5)), "osso", 0, sobre="cranio", tom=0.05, uv=uv, semente=51, normal=False)
    # rachadura irregular no alto à direita, com a beira de baixo clara
    rach = [(9.5, -25.6), (10.6, -22.8), (9.4, -20.6), (12.2, -18.0), (11.6, -15.6), (13.8, -13.4)]
    t.pinta(q.forma(traco([(x + 0.7, y + 0.7) for x, y in rach], 0.5)), "osso", 0, sobre="cranio", tom=0.16, uv=uv, semente=51, normal=False)
    t.pinta(q.forma(traco(rach, 0.55)), "orbita", 0, sobre="cranio", R=-1, tom=0.25)
    t.pinta(q.forma(capsula((12.2, -18.0), (14.8, -19.4), 0.45)), "orbita", 0, sobre="cranio", R=-1, tom=0.25)
    # órbitas: ovais enormes, afastadas e baixas, com a borda de cima reta e levemente caída para dentro (sério)
    for sx in (-1, 1):
        cx = sx * 10.6 + v * 2.2 + (sx * v * -0.6)
        rx = 7.6 * (1 - 0.12 * v * sx)
        orb = elipse((cx, 5.2), rx, 8.6, ang=sx * -6) & semiplano((0, -2.2), (-sx * 0.10, -1))
        dente_orb = lambda X, Y, cx=cx: -0.32 * np.clip(1 - (Y - (q.o[1] - 4)) / 10.0, 0, 1)
        t.pinta(q.forma(orb), "orbita", 8.01, R=-3.5, pid="cranio", tom=0.0, uv=uv)
        # sobrancelha óssea: arco claro logo acima da borda
        arco = q.forma(elipse((cx, 5.0), rx + 1.6, 9.8, ang=sx * -6) - elipse((cx, 5.6), rx + 0.2, 8.8, ang=sx * -6)) & q.forma(semiplano((0, -1.2), (0, 1)))
        t.pinta(arco, "osso", 0, sobre="cranio", tom=0.1, uv=uv, semente=51, normal=False)
        # brilho fraco e frio, quase apagado, no fundo
        if p.brilho > 0:
            gx = cx + sx * -1.3 + v * 1.2
            t.pinta(q.forma(circulo((gx, 6.4), 1.05)), "brilho", 8.02, pid="cranio", tom=0.3 * p.brilho, sem_contorno=True)
            t.pinta(q.forma(circulo((gx - 0.4, 5.9), 0.55)), "brilho", 8.03, pid="cranio", tom=0.75 * p.brilho, sem_contorno=True)
            gp = q.p(gx, 6.2)
            t.luz(gp[0], gp[1], 2.0, "#5d7f90", 6.5, 0.6 * p.brilho)
    # cavidade nasal pequena
    nz = (v * 2.4, 13.4)
    nariz = (circulo((nz[0] - 1.0, nz[1] - 0.6), 1.15) | circulo((nz[0] + 1.0, nz[1] - 0.6), 1.15)) | poligono([(nz[0] - 2.0, nz[1] - 0.4), (nz[0] + 2.0, nz[1] - 0.4), (nz[0], nz[1] + 2.0)])
    t.pinta(q.forma(nariz), "orbita", 8.01, R=-1.2, pid="cranio", tom=0.1)
    # boca: fileira curta e reta de dentes, fechada
    bx = v * 2.0
    t.pinta(q.forma(caixa((bx, 18.9), 7.2, 2.7, r=1.0)), "orbita", 8.35, R=-1.0, pid="dentes_fundo", sem_contorno=True)
    for k in range(-3, 3):
        x0 = bx + k * 2.3 + 0.15
        t.pinta(q.forma(caixa((x0 + 1.0, 17.55), 0.95, 1.35, r=0.4)), "dente", 8.4, R=0.9, pid="dentes", sem_contorno=True, tom=0.02)
        t.pinta(q.forma(caixa((x0 + 1.0, 20.25), 0.95, 1.15, r=0.4)), "dente", 8.4, R=0.9, pid="dentes", sem_contorno=True, tom=-0.04)
    if sob_capuz:
        # sombra do capuz no alto do crânio
        t.pinta(q.forma(semiplano((0, -6), (0, 1))), "osso", 0, sobre="cranio", tom=lambda X, Y: -0.3 * np.ones_like(X), uv=uv, semente=51, normal=False)
        t.pinta(q.forma(elipse((0, -12), 30, 9)), "osso", 0, sobre="cranio", tom=-0.42, uv=uv, semente=51, normal=False)


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
    # vértebras do pescoço
    for k, y in enumerate((-27.4, -25.6)):
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
    # ombreira de aço redonda, amassada, com rebites, ferrugem e arranhões, no ombro esquerdo (da tela)
    om = r.j["ombro_e"]
    a1 = p.be[0]
    qo = Quadro2D((om[0] - 1.0, om[1] - 0.2), -(a1 - 14) * 0.35 + 14 + p.inclina * 0.5)
    lam = elipse((0.3, 3.6), 6.6, 2.8) | elipse((0.6, 5.6), 5.4, 2.2)
    t.pinta(qo.forma(lam), "aco", p.ze + 0.55, R=2.0, pid="ombreira2", semente=101, tom=-0.08)
    dom = elipse((0, 0.2), 7.6, 4.9) - elipse((0, 5.8), 9.0, 1.6)
    amassado = lambda X, Y: (0.0 * X, 0.0 * X)
    t.pinta(qo.forma(dom), "aco", p.ze + 0.6, R=5.5, pid="ombreira", semente=102, uv=qo.uv())
    t.pinta(qo.forma(elipse((0, 0.2), 7.6, 4.9) - elipse((0, -0.2), 6.3, 3.8)), "aco", 0, sobre="ombreira", tom=0.12, normal=False)
    t.pinta(qo.forma(semiplano((0, 2.2), (0, -1))), "aco", 0, sobre="ombreira", tom=-0.18, normal=False)
    d_c = qo.p(-1.8, 0.4)
    t.pinta(circulo(d_c, 1.4), "aco", 0, sobre="ombreira", R=-1.6, tom=-0.05)          # amassado
    for (x, y) in ((-4.2, 1.6), (0.0, 3.0), (4.2, 1.6)):
        t.pinta(qo.forma(circulo((x, y), 0.6)), "aco", 0, sobre="ombreira", R=0.6, tom=0.15)
    for (x, y, rr) in ((3.2, -1.8, 0.9), (-3.6, 3.0, 0.7), (1.6, 2.2, 0.6), (-0.5, -3.4, 0.5)):
        t.pinta(qo.forma(circulo((x, y), rr).borda(0.3, 1.6, 7)), "ferrugem", 0, sobre="ombreira", R=0.8)
    t.pinta(qo.forma(capsula((-2.6, -2.8), (1.2, -3.6), 0.35)), "aco", 0, sobre="ombreira", tom=0.3)
    t.pinta(qo.forma(capsula((2.0, 0.6), (4.4, -0.8), 0.35)), "aco", 0, sobre="ombreira", tom=0.25)
    t.pinta(qo.forma(capsula((2.4, 1.0), (4.6, -0.4), 0.3)), "aco", 0, sobre="ombreira", tom=-0.25)
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
