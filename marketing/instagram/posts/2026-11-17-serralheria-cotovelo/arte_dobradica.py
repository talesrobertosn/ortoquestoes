"""A Serralheria da Dobradiça: arte em pixel art HD-2D dos stories da questão ombro-cotovelo-0249 (TEOT 2024).

Arte original feita por código (numpy + PIL): nada baixado, nada gerado por IA, nenhum desenho de anatomia.
Segue o pipeline HD-2D do Orto Questões (arte_oficina.py / scripts/gerar_cena_*.py):
- fundo.png (1080 x 1920): parede de cantaria de pedra e vigas de carvalho com rebites, janela em arco com céu
  de fim de tarde e feixes volumétricos com poeira, lamparina de latão acesa à esquerda, prateleira com almotolia,
  pote de rebites e ferramentas penduradas, e bancada de serralheiro embaixo com bigorna, martelo de bola, rebites
  e limalhas;
- objetos soltos em PNG transparente: dobradica (mecanismo isométrico com haste superior, barra inferior, eixo
  preso por braçadeira anelar e o tirante diagonal cravado nas duas hastes), grampo, martelo e chave;
- recortes nítidos (Lanczos) das figuras reais do acervo em img/ (sem desenhar nada sobre a anatomia).
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

PASTA = Path(__file__).resolve().parent
SAIDA = PASTA / "arte"
IMG_DIR = PASTA / "img"
RAIZ = PASTA.parents[3]
W, H, ESC = 360, 640, 3


def hexa(c) -> np.ndarray:
    if not isinstance(c, str):
        return np.asarray(c, dtype=np.float32)
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def mix(a, b, t: float) -> np.ndarray:
    return hexa(a) * (1.0 - t) + hexa(b) * t


def h01(*v: int) -> float:
    h = 2166136261
    for k in v:
        h = ((h ^ (int(k) & 0xFFFFFFFF)) * 16777619) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 1274126177) & 0xFFFFFFFF
    return (h & 0xFFFF) / 65535.0


def ruido(seed: int, ex: int, ey: int, w: int, h: int) -> np.ndarray:
    g = np.random.default_rng(seed)
    peq = g.random((h // max(ey, 1) + 4, w // max(ex, 1) + 4)).astype(np.float32)
    img = Image.fromarray((peq * 255).astype(np.uint8)).resize(
        ((w // max(ex, 1) + 4) * max(ex, 1), (h // max(ey, 1) + 4) * max(ey, 1)), Image.BICUBIC
    )
    arr = np.asarray(img, dtype=np.float32) / 255.0
    return np.clip(arr[ey:ey + h, ex:ex + w], 0.0, 1.0)


class Tela:
    def __init__(self, w: int, h: int) -> None:
        self.w, self.h = w, h
        self.c = np.zeros((h, w, 4), dtype=np.float32)
        self.Y, self.X = np.mgrid[0:h, 0:w].astype(np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h and a > 0:
            rgb = hexa(cor)
            b = self.c[y, x]
            na = a + b[3] * (1.0 - a)
            b[:3] = (rgb * a + b[:3] * b[3] * (1.0 - a)) / max(na, 1e-6)
            b[3] = na

    def masc(self, m: np.ndarray, cor, a: float = 1.0) -> None:
        am = np.clip(m * a, 0.0, 1.0)[:, :, None]
        rgb = hexa(cor) if isinstance(cor, str) or np.ndim(cor) == 1 else cor
        ba = self.c[:, :, 3:4]
        na = am + ba * (1.0 - am)
        self.c[:, :, :3] = np.where(
            na > 0, (rgb * am + self.c[:, :, :3] * ba * (1.0 - am)) / np.maximum(na, 1e-6), self.c[:, :, :3]
        )
        self.c[:, :, 3:4] = na

    def ret(self, x0, y0, w, h, cor, a: float = 1.0) -> None:
        m = ((self.X >= x0) & (self.X < x0 + w) & (self.Y >= y0) & (self.Y < y0 + h)).astype(np.float32)
        self.masc(m, cor, a)

    def poli_m(self, pts) -> np.ndarray:
        m = np.zeros((self.h, self.w), dtype=bool)
        px, py = self.X + 0.5, self.Y + 0.5
        n = len(pts)
        for i in range(n):
            x0, y0 = pts[i]
            x1, y1 = pts[(i + 1) % n]
            if y0 == y1:
                continue
            cr = ((y0 <= py) & (py < y1)) | ((y1 <= py) & (py < y0))
            xc = x0 + (py - y0) * (x1 - x0) / (y1 - y0)
            m ^= cr & (px < xc)
        return m.astype(np.float32)

    def poli(self, pts, cor, a: float = 1.0) -> None:
        self.masc(self.poli_m(pts), cor, a)

    def elip_m(self, cx, cy, rx, ry) -> np.ndarray:
        return ((((self.X + 0.5 - cx) / max(rx, 0.01)) ** 2 + ((self.Y + 0.5 - cy) / max(ry, 0.01)) ** 2) <= 1).astype(
            np.float32
        )

    def elip(self, cx, cy, rx, ry, cor, a: float = 1.0) -> None:
        self.masc(self.elip_m(cx, cy, rx, ry), cor, a)

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0, g: int = 1) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) * 2 + 1
        for i in range(n + 1):
            t = i / max(n, 1)
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for gx in range(g):
                for gy in range(g):
                    self.p(x + gx - g // 2, y + gy - g // 2, cor, a)

    def contorno(self, cor, a: float = 1.0) -> None:
        al = self.c[:, :, 3] > 0.5
        viz = np.zeros_like(al)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            viz |= np.roll(np.roll(al, dy, 0), dx, 1)
        self.masc((viz & ~al).astype(np.float32), cor, a)


def brilho(t: Tela, x, y, tam: int, cor: str = "#fff6d8") -> None:
    t.p(x, y, "#ffffff")
    for k in range(1, tam + 1):
        a = 1.0 - (k - 1) / (tam + 0.5)
        for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
            t.p(x + dx, y + dy, cor, a)


def faixa_tons(t: Tela, m: np.ndarray, eixo: np.ndarray, tons) -> None:
    n = len(tons)
    k = np.clip((eixo * n).astype(int), 0, n - 1)
    rgb = np.stack([hexa(c) for c in tons])[k]
    t.masc(m, rgb)


def _caixa(arr, r, eixo):
    if r < 1:
        return arr
    pad = [(0, 0)] * arr.ndim
    pad[eixo] = (r + 1, r)
    a = np.pad(arr, pad, mode="edge")
    s = np.cumsum(a, axis=eixo, dtype=np.float64)
    n = arr.shape[eixo]
    return ((np.take(s, np.arange(2 * r + 1, 2 * r + 1 + n), axis=eixo) - np.take(s, np.arange(0, n), axis=eixo)) / (2 * r + 1)).astype(np.float32)


def desfocar(arr, raio):
    if raio <= 0:
        return arr
    r = max(1, int(round((math.sqrt(4 * raio * raio + 1) - 1) / 2)))
    out = arr.astype(np.float32)
    for _ in range(3):
        out = _caixa(_caixa(out, r, 0), r, 1)
    return out


def desfocar_rgba(arr, raio):
    if raio <= 0:
        return arr
    pm = arr.copy()
    pm[:, :, :3] *= pm[:, :, 3:4]
    d = desfocar(pm, raio)
    d[:, :, :3] /= np.maximum(d[:, :, 3:4], 1e-4)
    return d


def ampliar(arr, k=ESC):
    return arr.repeat(k, 0).repeat(k, 1)


def sobre(base, cam):
    a = cam[:, :, 3:4]
    return base * (1.0 - a) + cam[:, :, :3] * a


ACO = ("#f4f7fa", "#d8e0e8", "#b2bcc6", "#88929c", "#626b74", "#434a52")
FERRO = ("#9aa4ae", "#76808a", "#555e68", "#3d444c", "#2a2f36", "#1b1f24")
LATAO = ("#fff3be", "#f2d078", "#d8a846", "#b27c28", "#825216", "#56320c")
VERDETE = ("#58bfb0", "#2d9286", "#14655e", "#0e4944", "#09302c")

BANCADA = 532
FRENTE_B = 588
JANELA_X0, JANELA_Y0, JANELA_X1, JANELA_Y1 = 236, 8, 346, 98


def parede_pedra_madeira(t: Tela) -> None:
    """Parede da serralheria: blocos de pedra talhada com argamassa e vigas de ferro rebitadas."""
    n_fino = ruido(10, 2, 2, W, H)
    n_med = ruido(11, 8, 6, W, H)
    # Fundo base de pedra escura azulada-quente
    t.ret(0, 0, W, BANCADA, "#2b2b30")
    alt_fiada = 18
    for row, y0 in enumerate(range(0, BANCADA, alt_fiada)):
        y1 = min(BANCADA, y0 + alt_fiada - 1)
        offset = (row * 19) % 34
        x = -offset
        col = 0
        while x < W:
            larg = 28 + int(h01(row, col, 3) * 18)
            xa, xb = max(0, x), min(W, x + larg - 1)
            if xb > xa + 2 and y1 > y0 + 2:
                v = h01(row, col, 7)
                c_base = mix("#3b3a3f", "#4d4744", v) * (0.88 + 0.24 * h01(row, col, 11))
                m = (t.X >= xa) & (t.X < xb) & (t.Y >= y0) & (t.Y < y1)
                tex = 0.88 + 0.20 * n_med + 0.10 * (n_fino - 0.5)
                bloco_rgb = np.clip(c_base[None, None, :] * tex[:, :, None], 0, 1)
                t.masc(m.astype(np.float32), bloco_rgb)
                # Bisel de luz no topo/esquerda e sombra embaixo/direita
                t.ret(xa, y0, xb - xa, 1, mix(c_base, "#8a8278", 0.36))
                t.ret(xa, y0, 1, y1 - y0, mix(c_base, "#7c766e", 0.26))
                t.ret(xa, y1 - 1, xb - xa, 1, "#201e22")
                t.ret(xb - 1, y0, 1, y1 - y0, "#232126")
                # Pequenas lascas/rachaduras em alguns blocos
                if h01(row, col, 21) > 0.72:
                    lx = xa + 5 + int(h01(row, col, 22) * max(1, xb - xa - 10))
                    ly = y0 + 4 + int(h01(row, col, 23) * max(1, y1 - y0 - 8))
                    t.p(lx, ly, "#1e1c20")
                    t.p(lx + 1, ly + 1, "#1e1c20")
                    t.p(lx, ly + 1, "#625d58", 0.6)
            # Junta de argamassa
            if xb < W:
                t.ret(xb, y0, 1, y1 - y0 + 1, "#1b191d")
            x += larg
            col += 1
        t.ret(0, y1, W, 1, "#19171b")

    # Viga horizontal de ferro forjado com rebites (altura y=104)
    for yv in (106,):
        m_viga = (t.Y >= yv) & (t.Y < yv + 9)
        faixa_tons(t, m_viga.astype(np.float32), (t.Y - yv) / 9.0, ("#646d76", "#4b525a", "#3a4047", "#292e34"))
        t.ret(0, yv, W, 1, "#85909a")
        t.ret(0, yv + 8, W, 1, "#181a1e")
        for k in range(1, 5):
            t.c[yv + 8 + k, :, :3] *= 0.52 + 0.10 * k
        for rx in range(14, W, 28):
            t.elip(rx, yv + 4, 2.0, 2.0, "#25292e")
            t.elip(rx, yv + 4, 1.4, 1.4, "#747e88")
            t.p(rx - 1, yv + 3, "#b8c2cc")


def janela_forja(t: Tela, vid: Tela) -> None:
    """Janela de ferro da oficina no alto à direita, com luz dourada de fim de tarde."""
    x0, y0, x1, y1 = JANELA_X0, JANELA_Y0, JANELA_X1, JANELA_Y1
    t.ret(x0 - 4, y0 - 3, x1 - x0 + 8, y1 - y0 + 6, "#18161a")
    t.ret(x0, y0, x1 - x0, y1 - y0, "#383e46")
    # Moldura externa chanfrada de ferro e pedra
    t.ret(x0 - 3, y0 - 2, x1 - x0 + 6, 2, "#6c6864")
    t.ret(x0 - 3, y1, x1 - x0 + 6, 4, "#7a7268")
    t.ret(x0 - 3, y1, x1 - x0 + 6, 1, "#aba092")
    for k in range(1, 5):
        t.c[y1 + 3 + k, x0 - 4:x1 + 4, :3] *= 0.50 + 0.11 * k

    # Quatro painéis de vidro industrial (2x2 com subdivisão fina)
    paineis = [
        (x0 + 5, y0 + 5, (x0 + x1) // 2 - 2, (y0 + y1) // 2 - 2),
        ((x0 + x1) // 2 + 2, y0 + 5, x1 - 5, (y0 + y1) // 2 - 2),
        (x0 + 5, (y0 + y1) // 2 + 2, (x0 + x1) // 2 - 2, y1 - 5),
        ((x0 + x1) // 2 + 2, (y0 + y1) // 2 + 2, x1 - 5, y1 - 5),
    ]
    # Céu entardecer dourado-âmbar embaixo e azul-suave em cima + silhueta de telhados/árvores
    tt = np.clip((t.Y - y0) / max(1, y1 - y0), 0, 1)[:, :, None]
    ceu = hexa("#a8c6dc") * (1.0 - tt) + hexa("#ffd690") * tt
    folha = ruido(55, 4, 4, W, H) * 0.65 + ruido(56, 2, 2, W, H) * 0.35
    silhueta = (t.Y > y0 + 52 + 8 * np.sin(t.X / 11.0)) | ((folha > 0.68) & (t.Y > y0 + 36))
    cor_sil = np.where((folha > 0.62)[:, :, None], hexa("#5c6e58"), hexa("#3e4c46"))
    ceu = np.where(silhueta[:, :, None], cor_sil, ceu)

    mv = np.zeros((H, W), dtype=np.float32)
    for a, b, c, d in paineis:
        t.ret(a, b, c - a, d - b, "#111317")
        mv[b:d, a:c] = 1.0
        # Bisel de ferro nos caixilhos
        t.ret(a - 1, b - 1, c - a + 2, 1, "#22262c")
        t.ret(a - 1, d, c - a + 2, 1, "#7c8690")
    vid.masc(mv, ceu)
    # Reflexos diagonais sutis no vidro
    for a, b, c, d in paineis:
        for s in range(22):
            vid.p(a + 4 + s, b + 3 + s * 0.85, "#fff8e8", 0.24)
            vid.p(a + 6 + s, b + 3 + s * 0.85, "#fff8e8", 0.12)


def lamparina_e_prateleira(t: Tela, luz_emissiva: Tela) -> None:
    """Prateleira de madeira e ferro à esquerda, almotolia verdete, pote de rebites e lamparina acesa."""
    y = 66
    t.ret(8, y, 178, 6, "#6e4a2e")
    t.ret(8, y, 178, 1, "#a87850")
    t.ret(8, y + 5, 178, 1, "#2e1c10")
    for k in range(1, 6):
        t.c[y + 5 + k, 8:186, :3] *= 0.48 + 0.09 * k
    for bx in (24, 166):
        for i in range(13):
            t.p(bx, y + 6 + i, "#25282c")
            t.p(bx + 1, y + 6 + i, "#505860")
            t.p(bx + 1 + i * 0.75, y + 6 + i * 0.95, "#383e46")

    # Lamparina de latão pendurada sob suporte de ferro à esquerda (x=38, y=82..102) -> acende a cena!
    lx, ly = 36, 28
    # haste na parede no alto
    t.ret(14, 18, 26, 3, "#2b3036")
    t.ret(14, 18, 26, 1, "#68727c")
    t.linha(16, 21, 28, 30, "#3d444c")
    t.ret(lx - 1, 20, 2, 7, "#505860")
    # chapéu de latão
    t.poli([(lx - 10, ly + 4), (lx + 10, ly + 4), (lx + 5, ly), (lx - 5, ly)], LATAO[2])
    t.linha(lx - 10, ly + 4, lx + 10, ly + 4, LATAO[0])
    # corpo de vidro com chama quente
    t.ret(lx - 6, ly + 5, 12, 13, "#ffdfa0", 0.45)
    luz_emissiva.elip(lx, ly + 11, 5.5, 6.5, "#ffe49c", 0.95)
    luz_emissiva.elip(lx, ly + 12, 3.0, 4.2, "#ffffff", 1.0)
    t.ret(lx - 6, ly + 5, 1, 13, LATAO[3])
    t.ret(lx + 5, ly + 5, 1, 13, LATAO[4])
    # base de latão da lamparina pousada perto da prateleira
    t.ret(lx - 8, ly + 18, 16, 4, LATAO[3])
    t.ret(lx - 8, ly + 18, 16, 1, LATAO[0])

    # Pote de vidro com rebites de latão (x=66)
    g = np.random.default_rng(77)
    px0, pw, ph = 66, 18, 24
    py0 = y - ph
    t.ret(px0, py0 + 3, pw, ph - 3, "#b8d0d8", 0.30)
    for yy in range(py0 + 10, y - 1):
        for xx in range(px0 + 1, px0 + pw - 1):
            r = g.random()
            cor = LATAO[0] if r < 0.20 else LATAO[2] if r < 0.65 else LATAO[4]
            t.p(xx, yy, cor, 0.95)
    t.ret(px0, py0 + 3, 1, ph - 3, "#e8f6fa", 0.8)
    t.ret(px0 + pw - 1, py0 + 3, 1, ph - 3, "#5a6c74", 0.8)
    t.ret(px0 - 1, py0, pw + 2, 4, "#4b525a")
    t.ret(px0 - 1, py0, pw + 2, 1, "#9aa4ae")

    # Almotolia de óleo em verdete (#14655E) e bico de latão (x=94)
    ax, ay = 96, y
    for dx in range(-9, 10):
        h_domo = int(math.sqrt(max(0, 81 - dx * dx)) * 1.15)
        u = (dx + 9) / 18.0
        cor = VERDETE[0] if u < 0.22 else VERDETE[1] if u < 0.52 else VERDETE[2] if u < 0.80 else VERDETE[3]
        t.ret(ax + dx, ay - h_domo, 1, h_domo, cor)
    t.ret(ax - 10, ay - 2, 20, 2, LATAO[2])
    t.linha(ax, ay - 11, ax + 14, ay - 26, LATAO[1], g=2)
    t.linha(ax, ay - 10, ax + 14, ay - 25, LATAO[4])
    # alça curva
    for a in range(120, 270, 12):
        rad = math.radians(a)
        t.p(ax - 7 + 5 * math.cos(rad), ay - 6 + 5 * math.sin(rad), LATAO[2])

    # Argolas de ferro e tenaz penduradas à direita da prateleira (x=132..176)
    for cx, r in ((134, 8), (152, 6)):
        t.p(cx, y - 22, "#8a949e")
        for a in range(0, 360, 6):
            rad = math.radians(a)
            for dr in (-1, 0, 1):
                c_anel = FERRO[0] if 200 <= a <= 330 and dr == -1 else FERRO[2] if dr == 0 else FERRO[4]
                t.p(cx + (r + dr) * math.cos(rad), y - 13 + (r + dr) * math.sin(rad), c_anel)

    # Chaves de boca penduradas sob a viga em y=118 (ficam nas bordas laterais, calmas)
    for kx, comp in ((18, 36), (340, 38)):
        t.p(kx, 116, LATAO[1])
        t.ret(kx - 2, 118, 4, comp, FERRO[2])
        t.ret(kx - 2, 118, 1, comp, FERRO[0])
        t.elip(kx, 118 + comp, 5, 5, FERRO[3])
        t.elip(kx, 118 + comp + 2, 2.5, 3, "#242226")


def bancada_serralheiro(topo: Tela, frente: Tela, obj: Tela, somb: Tela) -> None:
    """Bancada pesada de carvalho escuro com cantoneira de ferro, bigorna no canto, rebites e régua de aço."""
    n1 = ruido(80, 16, 2, W, H)
    n2 = ruido(81, 4, 1, W, H)
    Y, X = topo.Y, topo.X
    m_topo = (Y >= BANCADA) & (Y < FRENTE_B)
    t_prof = np.clip((Y - BANCADA) / (FRENTE_B - BANCADA), 0, 1)
    base_mad = mix("#5a3b24", "#744d30", 0.5)[None, None, :] * (0.82 + 0.28 * n1[:, :, None]) * (0.94 + 0.12 * n2[:, :, None])
    # Pranchas horizontais da bancada
    for py in (BANCADA + 18, BANCADA + 38):
        base_mad[py, :, :] *= 0.52
        base_mad[py + 1, :, :] *= 1.18
    base_mad *= (0.78 + 0.28 * t_prof)[:, :, None]
    topo.masc(m_topo.astype(np.float32), np.clip(base_mad, 0, 1))
    topo.ret(0, BANCADA, W, 1, "#946846")

    # Frente da bancada com cantoneira de ferro rebitada e gavetões
    m_fr = Y >= FRENTE_B
    fr_rgb = mix("#3b2618", "#26180e", np.clip((Y - FRENTE_B) / (H - FRENTE_B), 0, 1)[:, :, None])
    frente.masc(m_fr.astype(np.float32), fr_rgb)
    # Cantoneira de ferro na borda frontal da bancada
    frente.ret(0, FRENTE_B, W, 6, FERRO[3])
    frente.ret(0, FRENTE_B, W, 1, FERRO[0])
    frente.ret(0, FRENTE_B + 5, W, 1, FERRO[5])
    for rx in range(16, W, 32):
        frente.elip(rx, FRENTE_B + 3, 1.6, 1.6, LATAO[2])
        frente.p(rx - 1, FRENTE_B + 2, LATAO[0])
    # Gavetas com puxadores de latão
    for gx0 in (24, 194):
        frente.ret(gx0, FRENTE_B + 14, 142, 30, "#20130a")
        frente.ret(gx0 + 1, FRENTE_B + 15, 140, 28, "#311e12")
        frente.ret(gx0 + 1, FRENTE_B + 15, 140, 1, "#523522")
        # puxador em concha de latão
        px = gx0 + 71
        frente.elip(px, FRENTE_B + 28, 11, 5, LATAO[3])
        frente.elip(px, FRENTE_B + 27, 9, 3.5, LATAO[1])
        frente.ret(px - 8, FRENTE_B + 29, 16, 3, "#1a1008")

    # Na superfície da bancada:
    # 1) Ponta de bigorna de ferro à esquerda (x=10..88, y=540..578)
    somb.elip(52, 575, 42, 7, "#000000", 0.48)
    # base da bigorna
    obj.poli([(22, 576), (78, 576), (72, 562), (28, 562)], FERRO[4])
    obj.poli([(26, 562), (74, 562), (78, 546), (22, 546)], FERRO[3])
    # face superior polida + chifre cônico apontando para a direita
    obj.poli([(16, 546), (78, 546), (104, 551), (78, 556), (16, 553)], FERRO[1])
    obj.ret(16, 546, 62, 2, ACO[0])
    obj.linha(78, 546, 103, 551, ACO[0])

    # 2) Régua de aço graduada no meio-esquerda (x=114..234, y=566..574)
    somb.ret(115, 573, 122, 4, "#000000", 0.40)
    m_reg = (obj.X >= 114) & (obj.X < 236) & (obj.Y >= 565) & (obj.Y < 573)
    faixa_tons(obj, m_reg.astype(np.float32), (obj.Y - 565) / 8.0, ACO[:4])
    for xx in range(118, 234, 3):
        h_tr = 4 if (xx - 118) % 15 == 0 else 2
        obj.ret(xx, 565, 1, h_tr, "#343a42")

    # 3) Dobradiça de latão e rebites soltos à direita da bancada (x=258..342)
    somb.elip(296, 564, 34, 8, "#000000", 0.42)
    # duas abas de dobradiça na bancada
    obj.poli([(264, 554), (292, 550), (295, 566), (267, 570)], LATAO[2])
    obj.poli([(295, 550), (324, 554), (321, 570), (292, 566)], LATAO[3])
    obj.linha(264, 554, 292, 550, LATAO[0])
    obj.ret(292, 549, 4, 19, LATAO[1])
    for rx, ry in ((276, 559), (284, 562), (306, 559), (314, 562)):
        obj.elip(rx, ry, 1.8, 1.4, FERRO[4])
        obj.p(rx, ry - 1, LATAO[0])

    # Rebites soltos e limalhas douradas/aço
    for rx, ry in ((246, 556), (252, 569), (334, 562), (340, 571), (106, 569)):
        somb.elip(rx + 1, ry + 1, 2.5, 1.5, "#000000", 0.4)
        obj.elip(rx, ry, 2.2, 1.6, LATAO[2])
        obj.p(rx - 1, ry - 1, LATAO[0])


def mascara_feixes() -> tuple[np.ndarray, np.ndarray]:
    hh, ww = H * ESC, W * ESC
    gy, gx = np.mgrid[0:hh, 0:ww].astype(np.float32) / ESC
    ar = np.zeros((hh, ww), np.float32)
    mancha = np.zeros((hh, ww), np.float32)
    dir_sol = 0.62
    for yv in np.linspace(JANELA_Y0 + 6, JANELA_Y1 - 6, 10):
        t = gy - yv
        xw = gx + dir_sol * t
        dentro = (xw >= JANELA_X0 + 6) & (xw < JANELA_X1 - 6) & (t > 0)
        ar += dentro * np.exp(-t / 390.0) / 10.0
    no_topo = (gy >= BANCADA) & (gy < FRENTE_B)
    m_sol = (gx >= 110) & (gx < 290) & (gy >= BANCADA + 8) & (gy < FRENTE_B - 6) & no_topo
    mancha = np.maximum(mancha, m_sol.astype(np.float32))
    return desfocar(ar, 10), desfocar(mancha, 12)


def poeira(img: np.ndarray, ar: np.ndarray) -> np.ndarray:
    g = np.random.default_rng(108)
    hh, ww = ar.shape
    for _ in range(850):
        x, y = int(g.random() * ww), int(g.random() * hh)
        k = ar[y, x]
        if k > 0.11 and g.random() < k * 1.5:
            r = 1 + (g.random() < 0.16)
            v = 0.35 + g.random() * 0.5
            img[max(0, y - r + 1):y + r, max(0, x - r + 1):x + r] += hexa("#ffeec4") * v * k * 2.1
    return img


def fundo() -> None:
    parede_t, vid, prat, luz_em, topo, frente, obj, somb = (Tela(W, H) for _ in range(8))
    parede_pedra_madeira(parede_t)
    janela_forja(parede_t, vid)
    lamparina_e_prateleira(prat, luz_em)
    bancada_serralheiro(topo, frente, obj, somb)

    for k in range(1, 14):
        parede_t.c[BANCADA - k, :, :3] *= 0.52 + 0.036 * k

    img = np.zeros((H * ESC, W * ESC, 3), np.float32)
    img = sobre(img, desfocar_rgba(ampliar(parede_t.c), 0.9))
    img = sobre(img, desfocar_rgba(ampliar(prat.c), 0.5))
    img = sobre(img, ampliar(topo.c))
    img = sobre(img, ampliar(somb.c))
    img = sobre(img, ampliar(obj.c))
    img = sobre(img, desfocar_rgba(ampliar(frente.c), 1.3))

    ar, mancha = mascara_feixes()
    gy, gx = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32) / ESC
    # Iluminação HD-2D: ambiente azul-ardósia morno + lamparina quente à esquerda + janela dourada à direita + calor da forja embaixo
    amb = hexa("#7e8492") * 0.78
    luz_lamp = np.exp(-(((gx - 36) / 95.0) ** 2 + ((gy - 40) / 85.0) ** 2))[:, :, None] * hexa("#ffb85c") * 0.92
    luz_jan = np.exp(-(((gx - 290) / 125.0) ** 2 + ((gy - 60) / 95.0) ** 2))[:, :, None] * hexa("#ffdca4") * 0.62
    luz_forja = np.exp(-(((gx - 70) / 180.0) ** 2 + ((gy - 575) / 110.0) ** 2))[:, :, None] * hexa("#ff9848") * 0.44
    luz_dir = np.exp(-(((gx - 300) / 180.0) ** 2 + ((gy - 560) / 110.0) ** 2))[:, :, None] * hexa("#ffd088") * 0.32
    luz = amb + luz_lamp + luz_jan + luz_forja + luz_dir + mancha[:, :, None] * hexa("#ffdcb0") * 0.50
    img = img * luz

    vv = ampliar(vid.c)
    vv[:, :, :3] *= 1.16
    img = sobre(img, desfocar_rgba(vv, 1.4))
    em = ampliar(luz_em.c)
    img = sobre(img, desfocar_rgba(em, 1.0))

    img = img + ar[:, :, None] * hexa("#ffd08e") * 0.22
    img = poeira(img, ar)

    # Bloom suave nas fontes emissivas (lamparina e janela)
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img - 0.68, 0, None) * np.clip((lum - 0.58) * 3.0, 0, 1)
    img = img + desfocar(claro, 8) * 0.58 + desfocar(claro, 26) * 0.52

    # Grading: altas luzes ouro-quente, sombras azul-noite
    q, f = hexa("#ffe4b4"), hexa("#3e4e6c")
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.82 + 0.20 * (lum * q + (1.0 - lum) * (f * 0.65 + 0.35)))
    img = np.clip((img - 0.40) * 1.08 + 0.40, 0, 1.35)

    # Acalmar miolo central (onde entra a folha creme) + vinheta suave de diorama
    xs, ys = gx / W, gy / H
    miolo = np.clip(1.0 - np.abs(ys - 0.47) / 0.34, 0, 1)
    img *= (1.0 - 0.20 * miolo * miolo)[:, :, None]
    v = (xs - 0.50) ** 2 * 1.25 + (ys - 0.47) ** 2 * 1.05
    img *= (1.0 - np.clip(v - 0.08, 0, 1) * 0.95)[:, :, None]

    g = np.random.default_rng(17)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.020
    Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8)).save(SAIDA / "fundo.png", optimize=True)


def salvar(t: Tela, nome: str, k: int, contorno: str | None = "#18120e") -> None:
    if contorno:
        t.contorno(contorno)
    al = t.c[:, :, 3] > 0.01
    ys, xs = np.where(al)
    c = t.c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(np.clip(ampliar(c, k) * 255, 0, 255).astype(np.uint8), "RGBA").save(
        SAIDA / f"{nome}.png", optimize=True
    )


def dobradica() -> None:
    """Mecanismo puramente mecânico de serralheria (NÃO imita osso):
    - Montante vertical de carvalho/ferro à esquerda (batente superior)
    - Barra horizontal inferior de carvalho/ferro (viga inferior)
    - Cilindro de aço giratório paralelo preso à barra inferior por uma BRAÇADEIRA ANELAR (como o 2 = anular)
    - Tira curta de aço que morre na braçadeira (como 1/4)
    - O TIRANTE DIAGONAL DOURADO (como o 3) rebitado do montante vertical até a barra inferior!
    """
    t = Tela(160, 134)

    # 1) Montante vertical (batente superior à esquerda): x=14..44, y=8..98
    m_post = (t.X >= 14) & (t.X < 44) & (t.Y >= 8) & (t.Y < 98)
    faixa_tons(t, m_post.astype(np.float32), (t.X - 14) / 30.0, ("#9c6e48", "#805838", "#644228", "#482e1a"))
    for xx in range(18, 42, 4):
        t.linha(xx, 11, xx, 58, "#4e321c", 0.55)
    t.ret(14, 8, 30, 3, "#bc8c60")
    t.ret(14, 11, 30, 1, "#482e1a")
    # Chapa de ferro rebitada na metade inferior do montante
    m_chapa = (t.X >= 12) & (t.X < 46) & (t.Y >= 58) & (t.Y < 98)
    faixa_tons(t, m_chapa.astype(np.float32), (t.X - 12) / 34.0, FERRO[:5])
    t.ret(12, 58, 34, 2, ACO[1])
    t.ret(12, 57, 34, 1, "#1b1f24")

    # 2) Barra horizontal inferior (viga de baixo): x=20..150, y=88..116
    m_viga = (t.X >= 20) & (t.X < 150) & (t.Y >= 88) & (t.Y < 116)
    faixa_tons(t, m_viga.astype(np.float32), (t.Y - 88) / 28.0, ("#a47650", "#865c3c", "#68462c", "#4a301c"))
    t.ret(46, 87, 104, 1, "#2a1a10")
    for yy in (95, 103, 110):
        t.linha(26, yy, 146, yy, "#4e3420", 0.50)
    # Pino de gonzo central da dobradiça
    t.elip(29, 94, 8.5, 8.5, "#1b1f24")
    t.elip(29, 94, 7.2, 7.2, FERRO[3])
    t.elip(29, 94, 4.6, 4.6, LATAO[2])
    t.p(27, 92, LATAO[0])

    # 3) Eixo cilíndrico giratório superior (paralelo à barra inferior): x=50..146, y=63..80
    t.ret(50, 62, 96, 19, "#1b1f24")
    m_eixo = (t.X >= 50) & (t.X < 146) & (t.Y >= 63) & (t.Y < 80)
    faixa_tons(t, m_eixo.astype(np.float32), (t.Y - 63) / 17.0, ACO[:5])
    t.elip(146, 71.5, 3.5, 8.5, ACO[4])

    # 4) BRAÇADEIRA ANELAR (metáfora do 2 - anular): abraça o cilindro e prende SÓ na barra inferior!
    t.ret(56, 56, 20, 48, "#1b1f24")
    m_anel = (t.X >= 57) & (t.X < 75) & (t.Y >= 57) & (t.Y < 103)
    faixa_tons(t, m_anel.astype(np.float32), (t.X - 57) / 18.0, ("#e2eaf2", "#bac4ce", "#8c98a4", "#606a74"))
    t.ret(57, 57, 18, 2, "#ffffff")
    t.elip(66, 97, 3.2, 3.2, "#1b1f24")
    t.elip(66, 97, 2.0, 2.0, ACO[1])

    # 5) Tira curta cinza (metáfora do 1): sai do montante, mas PARA na braçadeira!
    pts_curta = [(33, 65), (57, 63), (57, 73), (33, 74)]
    t.poli([(32, 64), (58, 62), (58, 74), (32, 75)], "#1b1f24")
    t.poli(pts_curta, "#8e98a4")
    t.linha(33, 65, 56, 63, "#d4dce4")
    t.elip(37, 69.5, 2.2, 2.2, FERRO[4])

    # 6) O TIRANTE DIAGONAL DOURADO (metáfora do 3 = LCUL):
    # Sai do montante vertical, passa sobre a braçadeira e ancora na crista da barra inferior!
    t.poli([(26, 76), (34, 69), (122, 97), (116, 107)], "#1f160c")
    pts_tir = [(28, 76), (34, 71), (120, 98), (115, 105)]
    m_tir = t.poli_m(pts_tir)
    faixa_tons(t, m_tir, np.clip((t.Y - 71) / 34.0, 0, 1), LATAO[:5])
    t.linha(34, 71, 120, 98, LATAO[0], g=1)
    t.linha(28, 76, 115, 105, LATAO[4], g=1)
    # Dois rebites de ancoragem verdete + ouro
    for rx, ry in ((33, 75), (114, 101)):
        t.elip(rx, ry, 4.6, 4.6, VERDETE[3])
        t.elip(rx, ry, 3.2, 3.2, LATAO[1])
        t.p(rx - 1, ry - 1, "#ffffff")

    salvar(t, "dobradica", 3)


def grampo() -> None:
    """Grampo de ferro forjado e latão para prender o cabeçalho dos quadros."""
    t = Tela(44, 52)
    m_corpo = (t.X >= 8) & (t.X < 36) & (t.Y >= 6) & (t.Y < 42)
    faixa_tons(t, m_corpo.astype(np.float32), (t.X - 8) / 28.0, FERRO[:5])
    t.ret(8, 6, 28, 2, ACO[1])
    t.ret(15, 2, 14, 6, LATAO[2])
    t.ret(15, 2, 14, 1, LATAO[0])
    t.ret(6, 36, 32, 8, VERDETE[2])
    t.ret(6, 36, 32, 2, VERDETE[0])
    t.ret(6, 42, 32, 2, VERDETE[4])
    t.elip(22, 22, 4.5, 4.5, LATAO[3])
    t.elip(22, 22, 2.8, 2.8, LATAO[0])
    salvar(t, "grampo", 3)


def chave() -> None:
    """Chave de boca de aço forjado."""
    t = Tela(136, 38)
    m_h = (t.X >= 26) & (t.X < 110) & (t.Y >= 14) & (t.Y < 24)
    faixa_tons(t, m_h.astype(np.float32), (t.Y - 14) / 10.0, ACO[1:5])
    t.ret(34, 17, 68, 4, FERRO[3])
    for cx, abertura_esq in ((20, True), (116, False)):
        t.elip(cx, 19, 14, 13, ACO[2])
        t.elip(cx, 18, 12, 10, ACO[1])
        if abertura_esq:
            m_boca = t.poli_m([(3, 12), (19, 15), (19, 23), (3, 26)])
        else:
            m_boca = t.poli_m([(117, 15), (133, 12), (133, 26), (117, 23)])
        t.c[:, :, 3] = np.where(m_boca > 0.5, 0.0, t.c[:, :, 3])
    t.ret(64, 15, 8, 1, "#ffffff")
    salvar(t, "chave", 3)


def martelo() -> None:
    """Martelo de bola de serralheiro (cabo de nogueira e cabeça de aço polido)."""
    t = Tela(142, 54)
    pts = [(6, 23), (112, 21), (112, 31), (6, 31)]
    m_cabo = t.poli_m(pts)
    faixa_tons(t, m_cabo, np.clip((t.Y - 21) / 10.0, 0, 1), ("#d49258", "#b2703c", "#8a5026", "#5e3416"))
    for xx in range(14, 106, 7):
        t.p(xx, 25, "#6e3e1c", 0.7)
    m_cab = (t.X >= 104) & (t.X < 126) & (t.Y >= 10) & (t.Y < 44)
    faixa_tons(t, m_cab.astype(np.float32), (t.X - 104) / 22.0, FERRO[:5])
    m_bat = (t.X >= 102) & (t.X < 128) & (t.Y >= 40) & (t.Y < 48)
    faixa_tons(t, m_bat.astype(np.float32), (t.X - 102) / 26.0, ACO[:5])
    t.elip(115, 10, 9, 7, ACO[2])
    t.elip(113, 8, 5, 4, ACO[0])
    t.ret(126, 23, 4, 6, LATAO[1])
    salvar(t, "martelo", 3)


def preparar_imagens_acervo() -> None:
    """Prepara ampliações Lanczos e recortes limpos das imagens reais do acervo, sem desenhar sobre a anatomia."""
    IMG_DIR.mkdir(exist_ok=True)
    q_src = Image.open(RAIZ / "public/imagens/ombro-cotovelo/ombro-cotovelo-0250-1.jpeg").convert("RGB")
    q_2x = q_src.resize((q_src.width * 2, q_src.height * 2), Image.LANCZOS)
    q_2x.save(IMG_DIR / "questao-2x.png", optimize=True)

    c_src = Image.open(RAIZ / "public/imagens/ombro-cotovelo/campbell15-15-1-w82.jpeg").convert("RGB")
    cw, ch = c_src.size
    # Painel A (medial): x=0..676; Painel B (lateral): x=678..1316 (sem cortar 'Posterior')
    painel_a = c_src.crop((0, 0, 676, ch))
    painel_b = c_src.crop((678, 0, cw, ch))
    painel_a.resize((int(painel_a.width * 1.5), int(painel_a.height * 1.5)), Image.LANCZOS).save(
        IMG_DIR / "campbell-medial.png", optimize=True
    )
    painel_b.resize((int(painel_b.width * 1.5), int(painel_b.height * 1.5)), Image.LANCZOS).save(
        IMG_DIR / "campbell-lateral.png", optimize=True
    )
    c_src.save(IMG_DIR / "campbell-completo.png", optimize=True)


if __name__ == "__main__":
    import sys
    SAIDA.mkdir(parents=True, exist_ok=True)
    preparar_imagens_acervo()
    rapido = "--objetos" in sys.argv
    lista = (dobradica, grampo, chave, martelo) if rapido else (dobradica, grampo, chave, martelo, fundo)
    for fn in lista:
        fn()
        print("ok", fn.__name__)
