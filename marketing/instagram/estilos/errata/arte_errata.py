"""Errata: arte em pixel art "HD-2D" dos stories da questão tumores-0394 (13/11/2026).

O gabinete de revisão à noite: estante de livros com lombadas uma a uma, janela em arco com a lua e a cidade, cortina
de veludo, mesa de nogueira com mata-borrão de couro verde, luminária de banqueiro acesa, tinteiro, óculos, fichas
de revisão e lápis vermelho. Arte original feita por código (mesma técnica de .claude/skills/arte-hd2d e da Oficina
do encaixe): pintar em 360 x 640, ampliar 3x e montar com luz calculada (a lâmpada quente na mesa, o luar frio na
janela), bloom, correção de cor, vinheta e grão.

Saída em arte/:
- fundo.png (1080 x 1920): o gabinete com a mesa embaixo (stories 1 a 4);
- fundo-mesa.png (1080 x 1920): o mesmo gabinete com a mesa alta, onde fica o MacBook (story 5);
- objetos soltos (PNG transparente): volumes (13ª, 14ª e 15ª em pé), livro-aberto, livros-deitados, lapis,
  lupa, carimbo, balanca-litica, balanca-blastica e macbook (com a tela vazada para a captura real do site).
Nenhum texto é pintado: tudo o que se lê fica no HTML.
Uso: python3 arte_errata.py  (numpy e pillow)
"""

import math
from pathlib import Path

import numpy as np
from PIL import Image

SAIDA = Path(__file__).resolve().parent / "arte"
W, H, ESC = 360, 640, 3


# ───────────────────────────── Pincéis ─────────────────────────────
def hexa(c) -> np.ndarray:
    if not isinstance(c, str):
        return np.asarray(c, dtype=np.float32)
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def mix(a, b, t: float) -> np.ndarray:
    return hexa(a) * (1 - t) + hexa(b) * t


def h01(*v: int) -> float:
    h = 2166136261
    for k in v:
        h = ((h ^ (int(k) & 0xFFFFFFFF)) * 16777619) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 1274126177) & 0xFFFFFFFF
    return (h & 0xFFFF) / 65535


def ruido(seed: int, ex: int, ey: int, w: int, h: int) -> np.ndarray:
    g = np.random.default_rng(seed)
    peq = g.random((h // ey + 3, w // ex + 3)).astype(np.float32)
    img = Image.fromarray((peq * 255).astype(np.uint8)).resize(((w // ex + 3) * ex, (h // ey + 3) * ey), Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32)[ey:ey + h, ex:ex + w] / 255, 0, 1)


class Tela:
    """Uma camada de pixel art RGBA (float 0..1)."""

    def __init__(self, w: int, h: int) -> None:
        self.w, self.h = w, h
        self.c = np.zeros((h, w, 4), dtype=np.float32)
        self.Y, self.X = np.mgrid[0:h, 0:w].astype(np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h and a > 0:
            rgb = hexa(cor)
            b = self.c[y, x]
            na = a + b[3] * (1 - a)
            b[:3] = (rgb * a + b[:3] * b[3] * (1 - a)) / max(na, 1e-6)
            b[3] = na

    def masc(self, m: np.ndarray, cor, a: float = 1.0) -> None:
        am = np.clip(m * a, 0, 1)[:, :, None]
        rgb = hexa(cor) if isinstance(cor, str) or np.ndim(cor) == 1 else cor
        ba = self.c[:, :, 3:4]
        na = am + ba * (1 - am)
        self.c[:, :, :3] = np.where(na > 0, (rgb * am + self.c[:, :, :3] * ba * (1 - am)) / np.maximum(na, 1e-6), self.c[:, :, :3])
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
        return ((((self.X + 0.5 - cx) / max(rx, .01)) ** 2 + ((self.Y + 0.5 - cy) / max(ry, .01)) ** 2) <= 1).astype(np.float32)

    def elip(self, cx, cy, rx, ry, cor, a: float = 1.0) -> None:
        self.masc(self.elip_m(cx, cy, rx, ry), cor, a)

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0, g: int = 1) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) * 2 + 1
        for i in range(n + 1):
            t = i / n
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for gx in range(g):
                for gy in range(g):
                    self.p(x + gx - g // 2, y + gy - g // 2, cor, a)

    def contorno(self, cor, a: float = 1.0) -> None:
        al = self.c[:, :, 3] > 0.5
        viz = np.zeros_like(al)
        for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            viz |= np.roll(np.roll(al, dy, 0), dx, 1)
        self.masc((viz & ~al).astype(np.float32), cor, a)

    def colar(self, o: "Tela", contorno: str | None = None) -> None:
        if contorno:
            o.contorno(contorno)
        self.masc(o.c[:, :, 3], o.c[:, :, :3])


def brilho(t: Tela, x, y, tam: int, cor: str = "#fff6d8") -> None:
    t.p(x, y, "#ffffff")
    for k in range(1, tam + 1):
        a = 1 - (k - 1) / (tam + .5)
        for (dx, dy) in ((k, 0), (-k, 0), (0, k), (0, -k)):
            t.p(x + dx, y + dy, cor, a)


def faixa_tons(t: Tela, m: np.ndarray, eixo: np.ndarray, tons) -> None:
    """Pinta a máscara em faixas de tons conforme `eixo` (0..1): o sombreamento em degraus da pixel art."""
    n = len(tons)
    k = np.clip((eixo * n).astype(int), 0, n - 1)
    rgb = np.stack([hexa(c) for c in tons])[k]
    t.masc(m, rgb)


# ───────────────────────────── Desfoque e montagem ─────────────────────────────
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
    return base * (1 - a) + cam[:, :, :3] * a



def salvar(t: Tela, nome: str, k: int = ESC, contorno: str | None = "#140d0a") -> None:
    if contorno:
        t.contorno(contorno)
    al = t.c[:, :, 3] > 0.01
    ys, xs = np.where(al)
    c = t.c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(np.clip(ampliar(c, k) * 255, 0, 255).astype(np.uint8), "RGBA").save(SAIDA / f"{nome}.png", optimize=True)


def degrade_v(t: Tela, m: np.ndarray, y0: float, y1: float, tons) -> None:
    faixa_tons(t, m, np.clip((t.Y - y0) / max(y1 - y0, 1), 0, 0.999), tons)


def degrade_h(t: Tela, m: np.ndarray, x0: float, x1: float, tons) -> None:
    faixa_tons(t, m, np.clip((t.X - x0) / max(x1 - x0, 1), 0, 0.999), tons)


# Couros e tecidos das lombadas: (claro, médio, escuro, sombra)
COUROS = [
    ("#a8453a", "#86302a", "#64201c", "#3e1210"),  # vinho
    ("#3f7a5e", "#2c5e48", "#1e4434", "#112a20"),  # verde
    ("#4a5f8c", "#344870", "#243354", "#141e34"),  # azul-marinho
    ("#c4974c", "#a07434", "#7a5424", "#4a3214"),  # ocre
    ("#8a6648", "#6c4c34", "#503624", "#302014"),  # tabaco
    ("#e4d8b8", "#cbbd98", "#a8987a", "#706450"),  # pergaminho
    ("#5a5450", "#423e3a", "#2e2a28", "#1a1816"),  # grafite
    ("#7a3c5a", "#5e2c46", "#441e32", "#28101e"),  # ameixa
]
OURO = ("#fff0b0", "#f2cf72", "#cf9f42", "#8e6420")
AÇO = ("#f6f9fb", "#dce2e7", "#bcc4cb", "#98a0a8", "#767e86", "#585f66")


# ───────────────────────────── A parede, a estante e a janela ─────────────────────────────
JAN = (226, 10, 324, 108)  # x0, y0, x1, y1 da janela em arco (o arco ocupa o topo)
NICHO = (212, 4, 338, 116)  # a parede aberta em volta da janela, entre dois montantes
SECOES = ((8, 112), (120, 204), (212, 338), (346, 360))
PRAT_PASSO = 54


def papel_parede(t: Tela) -> None:
    """Papel de parede verde-garrafa com damasco discreto, atrás da estante e em volta da janela."""
    Y, X = t.Y, t.X
    base = np.zeros((H, W, 3), np.float32)
    n = ruido(11, 2, 2, W, H) * 0.5 + ruido(12, 9, 9, W, H) * 0.5
    u, v = (X % 24) - 12, (Y % 32) - 16
    losango = (np.abs(u) / 12 + np.abs(v) / 16)
    flor = (np.abs(np.abs(u) - 4) + np.abs(np.abs(v) - 6) < 3.2) | (losango < 0.22)
    fio = np.abs(losango - 0.86) < 0.05
    base[:] = hexa("#1d3a33")
    base = np.where(flor[:, :, None], hexa("#24463d"), base)
    base = np.where(fio[:, :, None], hexa("#2a4d43"), base)
    base *= (0.9 + 0.2 * n)[:, :, None]
    for x in range(0, W, 48):  # listras do rolo do papel
        base[:, x] *= 0.82
    t.masc(np.ones((H, W), np.float32), base)


def lombada(t: Tela, x: int, base_y: int, w: int, h: int, seed: int, inclina: int = 0) -> None:
    """Um livro em pé: couro em 4 tons, nervuras, faixas douradas, etiqueta e desgaste."""
    c = COUROS[int(h01(seed, 1) * len(COUROS)) % len(COUROS)]
    top = base_y - h
    if inclina:
        pts = [(x, base_y), (x + w, base_y), (x + w + inclina, top), (x + inclina, top)]
        m = t.poli_m(pts)
        eixo = np.clip((t.X - x - (base_y - t.Y) / h * inclina) / w, 0, 0.999)
        faixa_tons(t, m, eixo, (c[0], c[1], c[1], c[2], c[3]))
        return
    m = ((t.X >= x) & (t.X < x + w) & (t.Y >= top) & (t.Y < base_y)).astype(np.float32)
    eixo = np.clip((t.X - x) / w, 0, 0.999)
    # couro arredondado: luz da esquerda (a lâmpada), sombra à direita
    tons = (c[0], c[1], c[1], c[1], c[2], c[3]) if w > 5 else (c[0], c[1], c[2])
    faixa_tons(t, m, eixo, tons)
    gr = ruido(seed, 1, 2, W, H)
    t.masc(m * (gr > 0.78), c[2], 0.5)
    kind = h01(seed, 2)
    if w >= 5 and kind > 0.25:  # faixas douradas em cima e embaixo, nervuras
        for yy in (top + 3, base_y - 4):
            t.ret(x + 1, yy, w - 2, 1, OURO[2])
            t.p(x + 1, yy, OURO[1])
        if kind > 0.5:
            for yy in range(top + 9, base_y - 8, max(7, h // 4)):
                t.ret(x, yy, w, 1, c[0], 0.9)
                t.ret(x, yy + 1, w, 1, c[3], 0.8)
        if kind > 0.62 and h > 26:  # etiqueta escura com título em traços dourados
            ey = top + 6 + int(h01(seed, 3) * 6)
            t.ret(x + 1, ey, w - 2, 7, c[3])
            for k in range(2):
                t.ret(x + 2, ey + 2 + k * 2, max(1, w - 4 - int(h01(seed, k) * 2)), 1, OURO[2], 0.9)
    elif w >= 4:
        t.ret(x + 1, top + 4, w - 2, 1, OURO[3])
    # quinas
    t.ret(x, top, w, 1, c[0])
    t.ret(x + w - 1, top, 1, h, c[3])


def objeto_prateleira(t: Tela, x: int, base_y: int, tipo: str, seed: int) -> int:
    """Objetos entre os livros. Devolve a largura ocupada."""
    if tipo == "ampulheta":
        t.ret(x, base_y - 2, 10, 2, "#6a4428")
        t.ret(x, base_y - 20, 10, 2, "#6a4428")
        t.ret(x, base_y - 20, 10, 1, "#a8784a")
        for side in (x + 1, x + 8):
            t.ret(side, base_y - 18, 1, 16, "#8a5a34")
        for k in range(16):
            yy = base_y - 18 + k
            meia = 3.5 - 3 * math.sin(k / 15 * math.pi)
            t.ret(x + 5 - meia, yy, meia * 2, 1, "#cfe6ee", 0.35)
            if k > 10 or (k < 5 and k > 2):
                t.ret(x + 5 - meia + 0.5, yy, max(1, meia * 2 - 1), 1, "#e8c47a")
        t.p(x + 5, base_y - 11, "#e8c47a")
        return 12
    if tipo == "globo":
        t.ret(x + 3, base_y - 3, 12, 3, "#5a3a20")
        t.ret(x + 8, base_y - 6, 2, 3, "#b0843c")
        t.elip(x + 9, base_y - 15, 8, 8, "#3a6a8c")
        terra = t.elip_m(x + 9, base_y - 15, 8, 8) * (ruido(seed, 3, 3, W, H) > 0.55)
        t.masc(terra, "#c0a868")
        t.masc(t.elip_m(x + 7, base_y - 17, 3, 3), "#ffffff", 0.18)
        for a in range(0, 360, 12):
            t.p(x + 9 + 9.5 * math.cos(math.radians(a)), base_y - 15 + 9.5 * math.sin(math.radians(a)), "#c89a48", 0.9 if a < 200 else 0.6)
        return 18
    if tipo == "vaso":
        for y in range(base_y - 11, base_y):
            k = (y - base_y + 11) / 11
            meia = 4 + 1.5 * math.sin(k * math.pi)
            for xx in range(int(x + 6 - meia), int(x + 6 + meia) + 1):
                u = (xx - (x + 6 - meia)) / (2 * meia)
                t.p(xx, y, "#e2d6c0" if u < 0.3 else "#c4b49a" if u < 0.7 else "#8a7c66")
        g = np.random.default_rng(seed)
        for i in range(22):
            ang = -math.pi / 2 + (g.random() - 0.5) * 2.6
            comp = 5 + g.random() * 9
            xx, yy = x + 6, base_y - 11
            for s in range(int(comp)):
                xx += math.cos(ang) * 0.9
                yy += math.sin(ang) * 0.9 + s * 0.03
                t.p(xx, yy, "#5f8a4a" if s < comp * 0.6 else "#86ad5e")
        return 13
    if tipo == "aparador":  # aparador de livros de latão
        t.ret(x, base_y - 2, 7, 2, OURO[3])
        t.ret(x + 4, base_y - 16, 3, 14, OURO[2])
        t.ret(x + 4, base_y - 16, 1, 14, OURO[1])
        t.elip(x + 5, base_y - 18, 3, 3, OURO[2])
        t.p(x + 4, base_y - 19, OURO[0])
        return 8
    if tipo == "vela":
        t.ret(x + 1, base_y - 2, 8, 2, "#8e6420")
        t.ret(x + 3, base_y - 13, 4, 11, "#efe6cf")
        t.ret(x + 3, base_y - 13, 1, 11, "#fffaf0")
        t.ret(x + 6, base_y - 13, 1, 11, "#c8bca4")
        t.p(x + 5, base_y - 14, "#2a2420")
        return 11
    return 0


def estante(t: Tela, chao: int) -> None:
    """Estante de nogueira na parede inteira (menos a janela), com prateleiras cheias até a mesa."""
    Y, X = t.Y, t.X
    madeira = ruido(21, 30, 1, W, H)
    g = np.random.default_rng(22)
    # montantes verticais (laterais da estante)
    montantes = [0, 112, 204, 338]
    for mx in montantes:
        m = ((X >= mx) & (X < mx + 8) & (Y < chao)).astype(np.float32)
        degrade_h(t, m, mx, mx + 8, ("#7a5232", "#5e3c22", "#5e3c22", "#4a2e1a", "#2e1a0e"))
        t.masc(m * (madeira > 0.62), "#6a4428", 0.6)
    # fundo das prateleiras (madeira escura atrás dos livros)
    sl = np.zeros((H, W), bool)
    for (a, b) in SECOES:
        sl |= (X >= a) & (X < b)
    fundo_m = (sl & (Y < chao)).astype(np.float32)
    t.masc(fundo_m, "#2a1a10")
    t.masc(fundo_m * (madeira > 0.55), "#33200f", 0.8)
    # prateleiras e livros
    y = 8
    linhas = []
    while y + PRAT_PASSO <= chao + 4:
        linhas.append(y + PRAT_PASSO - 6)
        y += PRAT_PASSO
    for i, py in enumerate(linhas):
        # livros entre os montantes
        for (a, b) in SECOES:
            if (a, b) == (212, 338) and py < NICHO[3]:
                continue  # o nicho da janela
            x = a + 1
            j = 0
            while x < b - 3:
                sd = i * 1000 + a * 7 + j
                r = h01(sd, 9)
                if r < 0.07 and b - x > 20:
                    tipo = ["ampulheta", "globo", "vaso", "vela", "aparador"][int(h01(sd, 8) * 5) % 5]
                    x += objeto_prateleira(t, x, py, tipo, sd) + 1
                    j += 1
                    continue
                w = 4 + int(h01(sd, 4) * 6)
                h = 30 + int(h01(sd, 5) * 15)
                w = min(w, b - x)
                if w < 3:
                    break
                if r > 0.93 and b - x > 14:  # um livro tombado, encostado
                    lombada(t, x, py, w, h - 4, sd, inclina=7)
                    x += w + 8
                else:
                    lombada(t, x, py, w, h, sd)
                    x += w
                j += 1
            # sombra de contato embaixo dos livros
        # a tábua da prateleira (frente iluminada, quina clara, sombra embaixo)
        t.ret(0, py, W, 6, "#7a5232")
        t.ret(0, py, W, 1, "#b88a58")
        t.ret(0, py + 1, W, 1, "#946640")
        t.ret(0, py + 5, W, 1, "#3a2414")
        t.masc(((Y >= py + 2) & (Y < py + 5) & (madeira > 0.6)).astype(np.float32), "#6a4428", 0.7)
        for k in range(1, 5):
            t.c[py + 5 + k: py + 6 + k, :, :3] *= 0.55 + 0.1 * k
    # montantes por cima das prateleiras
    for mx in montantes:
        t.ret(mx, 0, 1, chao, "#a07448")
        t.ret(mx + 7, 0, 1, chao, "#24140a")
    # cornija no topo
    t.ret(0, 0, W, 4, "#5e3c22")
    t.ret(0, 3, W, 1, "#2a180c")
    # o nicho da janela fica aberto: ali aparece o papel de parede
    x0, y0, x1, y1 = NICHO
    t.c[y0:y1, x0:x1, 3] = 0
    for k in range(1, 6):  # sombra dos montantes no papel
        t.c[y0:y1, x0 + k - 1, :3] *= 1
    t.ret(x0, y1 - 1, x1 - x0, 1, "#2a180c")


def janela(t: Tela, vid: Tela, cort: Tela) -> None:
    x0, y0, x1, y1 = JAN
    cx = (x0 + x1) / 2
    r = (x1 - x0) / 2
    Y, X = t.Y, t.X
    arco = ((X >= x0) & (X < x1) & (Y < y1) & ((Y >= y0 + r) | (((X + 0.5 - cx) / r) ** 2 + ((Y + 0.5 - (y0 + r)) / r) ** 2 <= 1)))
    # moldura de madeira pintada (creme envelhecido)
    out = arco.astype(np.float32)
    viz = np.zeros_like(arco)
    for dx in range(-4, 5):
        for dy in range(-4, 5):
            if abs(dx) + abs(dy) <= 5:
                viz |= np.roll(np.roll(arco, dy, 0), dx, 1)
    moldura = (viz & ~arco).astype(np.float32)
    t.masc(moldura, "#cbbd9c")
    t.masc(moldura * (Y < y0 + r) * (X < cx), "#e4d8b8", 0.8)
    t.masc(moldura * (X > cx), "#9e8f70", 0.7)
    # vidros: céu da noite (emissivo)
    ceu = np.zeros((H, W, 3), np.float32)
    tt = np.clip((Y - y0) / (y1 - y0), 0, 1)[:, :, None]
    ceu[:] = hexa("#0c1430") * (1 - tt) + hexa("#24406a") * tt
    g = np.random.default_rng(31)
    vm = arco.astype(np.float32)
    vid.masc(vm, ceu)
    for _ in range(70):  # estrelas
        sx, sy = x0 + g.random() * (x1 - x0), y0 + g.random() * (y1 - y0) * 0.65
        if arco[int(sy), int(sx)]:
            vid.p(sx, sy, "#fff8e0", 0.4 + g.random() * 0.6)
    # lua crescente com halo
    lx, ly = x0 + r * 1.42, y0 + r * 0.9
    lua = vid.elip_m(lx, ly, 9, 9) * (1 - vid.elip_m(lx - 4, ly - 2, 8.5, 8.5)) * vm
    vid.masc(lua, "#fff4d0")
    vid.masc(lua * vid.elip_m(lx + 3, ly + 2, 6, 6), "#e8dcb0")
    # a cidade: telhados, uma torre com relógio e janelas acesas
    tel = np.zeros((H, W), bool)
    xx = x0
    while xx < x1:
        bw = 6 + int(g.random() * 12)
        bh = 14 + int(g.random() * 22)
        tel |= (X >= xx) & (X < xx + bw) & (Y >= y1 - bh)
        if g.random() < 0.4:  # telhado de duas águas
            tel |= (Y >= y1 - bh - (bw / 2 - np.abs(X - xx - bw / 2))) & (X >= xx) & (X < xx + bw) & (Y < y1 - bh + 1)
        xx += bw
    tx = x0 + 22
    tel |= (X >= tx) & (X < tx + 9) & (Y >= y1 - 52)
    tel |= (Y >= y1 - 60 + np.abs(X - tx - 4.5) * 1.6) & (X >= tx) & (X < tx + 9)
    tm = (tel & arco).astype(np.float32)
    vid.masc(tm, "#0a0e1c")
    vid.masc(tm * (Y < y1 - 30) * (ruido(32, 2, 2, W, H) > 0.7), "#141c34", 0.8)
    vid.masc(vid.elip_m(tx + 4.5, y1 - 44, 2.6, 2.6) * vm, "#ffe6a0")
    for _ in range(90):
        wx, wy = x0 + g.random() * (x1 - x0), y1 - 2 - g.random() * 26
        if tel[int(wy), int(wx)] and arco[int(wy), int(wx)]:
            vid.p(wx, wy, "#ffcf70" if g.random() < 0.8 else "#ffe9b8", 0.7 + g.random() * 0.3)
    # caixilhos: a travessa na linha do arco, o montante do meio e o leque com o cubo em meia-lua
    ya = y0 + r
    dx_, dy_ = X + 0.5 - cx, Y + 0.5 - ya
    dist = np.hypot(dx_, dy_)
    ang = np.degrees(np.arctan2(-dy_, dx_))
    leque = (Y < ya) & arco & (dist > 9) & (np.min(np.stack([np.abs(ang - a) for a in (30, 60, 90, 120, 150)]), 0) * np.pi / 180 * dist < 0.9)
    cubo = (Y < ya + 1) & (np.abs(dist - 9) < 1.1) & arco
    trav = (np.abs(Y + 0.5 - ya) < 1.2) & arco
    vert = (np.abs(X + 0.5 - cx) < 1.2) & (Y >= ya) & arco
    trav2 = (np.abs(Y + 0.5 - (ya + (y1 - ya) * 0.5)) < 1.0) & arco
    vert2 = (np.abs(np.abs(X + 0.5 - cx) - r * 0.5) < 0.9) & (Y >= ya) & arco
    mc = (leque | cubo | trav | vert | trav2 | vert2).astype(np.float32)
    vid.masc(mc, "#c8bb98")
    vid.masc(mc * (np.roll(mc, 1, 0) < 0.5), "#efe4c6")
    # peitoril
    t.ret(x0 - 8, y1, x1 - x0 + 16, 5, "#d8cba8")
    t.ret(x0 - 8, y1, x1 - x0 + 16, 1, "#f2e8cc")
    t.ret(x0 - 8, y1 + 4, x1 - x0 + 16, 1, "#6a5c44")
    # cortinas de veludo verde com pregas e a faixa dourada
    for lado in (-1, 1):
        cx0 = x0 - 14 if lado < 0 else x1 - 2
        larg = 16
        topo = y0 - 4
        fim = y1 + 26
        for y in range(topo, fim):
            aperto = 1 - 0.45 * math.exp(-((y - (y1 - 6)) / 7) ** 2)  # amarrada na altura do peitoril
            wv = larg * aperto
            xa = cx0 + (0 if lado < 0 else larg - wv)
            for xx in range(int(xa), int(xa + wv) + 1):
                u = (xx - xa) / max(wv, 1)
                dobra = math.sin(u * math.pi * 3 + y * 0.02)
                cor = "#2f6e5a" if dobra > 0.5 else "#245a49" if dobra > -0.2 else "#173d32" if dobra > -0.7 else "#0f2a22"
                cort.p(xx, y, cor)
        by = y1 - 6
        cort.ret(cx0 + 2, by - 1, larg - 4, 3, OURO[2])
        cort.ret(cx0 + 2, by - 1, larg - 4, 1, OURO[1])
        for k in range(6):  # borla
            cort.ret(cx0 + larg // 2 - 1 + (k % 2), by + 2 + k, 2, 1, OURO[2 + (k % 2)])
    # varão
    cort.ret(x0 - 18, y0 - 6, x1 - x0 + 36, 2, OURO[2])
    cort.ret(x0 - 18, y0 - 6, x1 - x0 + 36, 1, OURO[1])
    cort.elip(x0 - 19, y0 - 5, 2.5, 2.5, OURO[1])
    cort.elip(x1 + 18, y0 - 5, 2.5, 2.5, OURO[2])


# ───────────────────────────── A mesa ─────────────────────────────
def mesa(topo: Tela, frente: Tela, y0: int) -> None:
    """Tampo de nogueira em perspectiva com mata-borrão de couro verde e a moldura frisada da frente."""
    Y, X = topo.Y, topo.X
    fy = H - 30  # onde começa a frente da mesa
    m = ((Y >= y0) & (Y < fy)).astype(np.float32)
    # veio da nogueira correndo na horizontal, com perspectiva (mais apertado ao fundo)
    prof = np.clip((Y - y0) / max(fy - y0, 1), 0, 1)
    veio = ruido(41, 26, 1, W, H) * 0.6 + ruido(42, 8, 1, W, H) * 0.4
    onda = np.sin((X * 0.05 + veio * 6 + Y * 0.9 / (0.4 + prof)) * 1.3)
    base = np.zeros((H, W, 3), np.float32)
    base[:] = hexa("#5a3420")
    base = np.where((onda > 0.55)[:, :, None], hexa("#6a4028"), base)
    base = np.where((onda < -0.6)[:, :, None], hexa("#46281a"), base)
    base = np.where((veio > 0.72)[:, :, None], hexa("#3a2014"), base)
    base *= (0.86 + 0.18 * prof)[:, :, None]
    topo.masc(m, base)
    # quina de trás do tampo e sombra na parede
    topo.ret(0, y0, W, 1, "#8a5a38")
    # mata-borrão: couro verde com moldura de couro marrom e filete dourado
    bx0, bx1 = 26, W - 26
    by0, by1 = y0 + 8, fy - 8
    if fy - y0 > 60:
        by0, by1 = y0 + 16, fy - 10
    cm = ((X >= bx0) & (X < bx1) & (Y >= by0) & (Y < by1)).astype(np.float32)
    couro = ruido(43, 2, 2, W, H)
    pele = np.where((couro > 0.62)[:, :, None], hexa("#245446"), hexa("#1d483c"))
    pele = np.where((couro < 0.22)[:, :, None], hexa("#173c32"), pele)
    topo.masc(cm, pele)
    for (a, b) in ((bx0, bx0 + 14), (bx1 - 14, bx1)):  # cantos de couro marrom
        mm = ((X >= a) & (X < b) & (Y >= by0) & (Y < by1)).astype(np.float32)
        topo.masc(mm, "#4a2a1a")
        topo.masc(mm * (couro > 0.6), "#5a3422")
        topo.ret(a, by0, b - a, 1, "#7a4a30")
    # filete dourado pontilhado
    for x in range(bx0 + 16, bx1 - 16, 2):
        topo.p(x, by0 + 3, OURO[2])
        topo.p(x, by1 - 4, OURO[3])
    for y in range(by0 + 3, by1 - 3, 2):
        topo.p(bx0 + 16, y, OURO[2])
        topo.p(bx1 - 17, y, OURO[3])
    topo.ret(bx0, by1, bx1 - bx0, 1, "#0e2620")
    # frente da mesa: moldura frisada
    fm = ((Y >= fy) & (Y < H)).astype(np.float32)
    degrade_v(frente, fm, fy, H, ("#8a5a38", "#6a4228", "#5a3420", "#4a2a1a", "#3a2014", "#2a160c"))
    frente.ret(0, fy, W, 1, "#c08a5a")
    frente.ret(0, fy + 4, W, 1, "#3a2014")
    frente.ret(0, fy + 5, W, 1, "#9a6a44")
    frente.masc(fm * (ruido(44, 22, 1, W, H) > 0.64), "#3a2014", 0.5)
    # uma gaveta com puxador de latão
    for gx in (60, 230):
        frente.ret(gx, fy + 10, 70, 16, "#5a3420")
        frente.ret(gx, fy + 10, 70, 1, "#2a160c")
        frente.ret(gx, fy + 25, 70, 1, "#8a5a38")
        frente.elip(gx + 35, fy + 18, 5, 2.4, OURO[3])
        frente.ret(gx + 31, fy + 17, 8, 1, OURO[1])


def lampada(t: Tela, cx: int, base_y: int) -> tuple[float, float]:
    """Luminária de banqueiro: base de latão, haste, cúpula de vidro verde. Devolve o ponto da luz."""
    # base oval de latão
    for k, cor in enumerate(OURO[::-1]):
        t.elip(cx, base_y - 2 - k * 0.6, 13 - k * 1.5, 3.4 - k * 0.4, cor)
    t.ret(cx - 1, base_y - 30, 3, 28, OURO[2])
    t.ret(cx - 1, base_y - 30, 1, 28, OURO[1])
    t.ret(cx + 1, base_y - 30, 1, 28, OURO[3])
    # braço curvo para a cúpula
    for i in range(10):
        t.p(cx + 1 + i * 0.4, base_y - 30 - i * 0.6, OURO[2])
    sy = base_y - 40
    # a cúpula: meio cilindro verde com reflexo e borda de latão
    for y in range(sy - 8, sy + 2):
        k = (y - (sy - 8)) / 10
        meia = 14 + k * 6
        for x in range(int(cx - meia), int(cx + meia) + 1):
            u = (x - (cx - meia)) / (2 * meia)
            v = math.sin(u * math.pi)
            cor = "#5fbf8e" if (v > 0.9 and k < 0.5) else "#2f8c64" if v > 0.6 else "#1d6a4a" if v > 0.3 else "#114a32"
            t.p(x, y, cor)
    t.ret(cx - 20, sy + 2, 41, 2, OURO[2])
    t.ret(cx - 20, sy + 2, 41, 1, OURO[1])
    for x in range(cx - 10, cx + 4):  # reflexo comprido no vidro
        t.p(x, sy - 5, "#bff0d4", 0.7)
    # boca acesa por baixo e a corrente
    t.elip(cx, sy + 4.5, 17, 1.8, "#fff2c0")
    for i in range(8):
        t.p(cx + 9, sy + 5 + i, OURO[1] if i % 2 else OURO[3])
    t.elip(cx + 9, sy + 13, 1.2, 1.4, OURO[1])
    return cx, sy + 5


def tinteiro(t: Tela, x: int, base_y: int) -> None:
    for y in range(base_y - 12, base_y):
        k = (y - base_y + 12) / 12
        meia = 6 + k * 2
        for xx in range(int(x - meia), int(x + meia) + 1):
            u = (xx - (x - meia)) / (2 * meia)
            t.p(xx, y, "#2a3a5a" if u < 0.25 else "#18223a" if u < 0.7 else "#0c1222")
    t.ret(x - 3, base_y - 15, 7, 3, OURO[2])
    t.ret(x - 3, base_y - 15, 7, 1, OURO[1])
    t.p(x - 4, base_y - 9, "#8fb0e8")
    t.p(x - 4, base_y - 8, "#5a78b0")
    # a caneta-tinteiro deitada
    for i in range(34):
        xx, yy = x + 10 + i, base_y - 2 - i * 0.18
        t.p(xx, yy, "#1a1a1e")
        t.p(xx, yy - 1, "#3a3a44" if i % 7 else "#55556a")
        if 20 < i < 23:
            t.p(xx, yy, OURO[1])
            t.p(xx, yy - 1, OURO[2])
    t.p(x + 9, base_y - 1, OURO[1])
    t.p(x + 8, base_y - 1, OURO[2])


def oculos(t: Tela, x: int, y: int) -> None:
    for dx in (0, 15):
        for a in range(0, 360, 8):
            t.p(x + dx + 6 * math.cos(math.radians(a)), y + 3.6 * math.sin(math.radians(a)), OURO[2] if a < 180 else OURO[3])
        t.masc(t.elip_m(x + dx, y, 5.4, 3.2), "#cfe6ee", 0.18)
        t.p(x + dx - 2, y - 1, "#ffffff", 0.7)
    t.linha(x + 6, y - 1, x + 9, y - 1, OURO[2])
    t.linha(x - 6, y - 1, x - 13, y + 3, OURO[3])
    t.linha(x + 21, y - 1, x + 28, y + 3, OURO[3])


def fichas(t: Tela, x: int, y: int, seed: int) -> None:
    """Pilha de fichas de revisão com marcas vermelhas."""
    g = np.random.default_rng(seed)
    for k in range(4):
        dx, dy = g.integers(-3, 4), -k
        t.ret(x + dx, y + dy, 44, 22, "#efe6cf" if k % 2 else "#f6efdc")
        t.ret(x + dx, y + dy, 44, 1, "#fffaf0")
        t.ret(x + dx + 43, y + dy, 1, 22, "#b8ab8c")
        t.ret(x + dx, y + dy + 21, 44, 1, "#a8987a")
    top = y - 3
    for i in range(5):
        t.ret(x + 4, top + 5 + i * 3, 28 - (i * 5) % 11, 1, "#8a8070")
    t.ret(x + 4, top + 3, 36, 1, "#c45a5a")  # pauta vermelha
    t.linha(x + 16, top + 13, x + 26, top + 11, "#c0392b")  # o risco da revisão
    t.linha(x + 30, top + 9, x + 33, top + 6, "#c0392b")
    t.linha(x + 33, top + 6, x + 36, top + 9, "#c0392b")


def lapis_mesa(t: Tela, x: int, y: int, comp: int = 40, ang: float = -0.12) -> None:
    for i in range(comp):
        xx, yy = x + i, y + i * ang
        if i < 4:
            t.p(xx, yy, "#3a2a24" if i < 2 else "#e8c8a0")
            continue
        t.p(xx, yy - 1, "#e05040")
        t.p(xx, yy, "#b83226")
        t.p(xx, yy + 1, "#7a1e16")
    t.p(x + comp, y + comp * ang, OURO[2])


def xicara(t: Tela, x: int, base_y: int) -> None:
    t.elip(x, base_y, 12, 3, "#e6dcc6")
    t.elip(x, base_y - 0.5, 10, 2.2, "#c8bca4")
    for y in range(base_y - 11, base_y - 1):
        for xx in range(x - 6, x + 7):
            u = (xx - (x - 6)) / 12
            t.p(xx, y, "#f4ecda" if u < 0.3 else "#ddd2bc" if u < 0.75 else "#b4a890")
    t.elip(x, base_y - 11, 6.5, 1.6, "#3a2214")
    for i in range(6):  # alça
        t.p(x + 7 + math.sin(i / 5 * math.pi) * 3, base_y - 9 + i, "#cfc4ac")
    for k in range(3):  # vapor
        for i in range(10):
            t.p(x - 3 + k * 3 + math.sin(i * 0.8 + k) * 1.5, base_y - 13 - i, "#ffffff", 0.18 * (1 - i / 10))


def objetos_mesa(obj: Tela, somb: Tela, y0: int, alta: bool) -> tuple[float, float]:
    """Objetos sobre a mesa e as sombras deles. Devolve o ponto da luz da luminária."""
    if not alta:
        lx, ly = lampada(obj, 44, y0 + 50)
        somb.masc(somb.elip_m(70, y0 + 52, 26, 4), "#000000", 0.45)
        fichas(obj, 108, y0 + 40, 51)
        somb.masc(somb.elip_m(132, y0 + 63, 26, 3), "#000000", 0.3)
        lapis_mesa(obj, 150, y0 + 66, 44, -0.1)
        oculos(obj, 222, y0 + 58)
        tinteiro(obj, 286, y0 + 50)
        somb.masc(somb.elip_m(300, y0 + 51, 22, 3), "#000000", 0.4)
        xicara(obj, 332, y0 + 34)
        somb.masc(somb.elip_m(336, y0 + 35, 14, 3), "#000000", 0.4)
    else:
        lx, ly = lampada(obj, 20, y0 + 30)
        somb.masc(somb.elip_m(44, y0 + 32, 30, 5), "#000000", 0.45)
        tinteiro(obj, 320, y0 + 26)
        xicara(obj, 344, y0 + 96)
        oculos(obj, 64, y0 + 184)
        fichas(obj, 276, y0 + 170, 52)
        lapis_mesa(obj, 150, y0 + 206, 48, -0.06)
    return lx, ly


# ───────────────────────────── Montagem com luz ─────────────────────────────
def fundo(nome: str, y_mesa: int, alta: bool) -> None:
    par, vid, est, cort, topo, frente, obj, somb = (Tela(W, H) for _ in range(8))
    papel_parede(par)
    estante(est, y_mesa)
    janela(par, vid, cort)
    mesa(topo, frente, y_mesa)
    lx, ly = objetos_mesa(obj, somb, y_mesa, alta)
    for k in range(1, 12):  # sombra de contato da estante sobre a mesa
        est.c[y_mesa - k, :, :3] *= 0.5 + 0.045 * k

    img = np.zeros((H * ESC, W * ESC, 3), np.float32)
    img = sobre(img, desfocar_rgba(ampliar(par.c), 1.2))
    img = sobre(img, desfocar_rgba(ampliar(est.c), 1.0))
    img = sobre(img, desfocar_rgba(ampliar(cort.c), 0.8))
    img = sobre(img, ampliar(topo.c))
    img = sobre(img, desfocar_rgba(ampliar(somb.c), 2.0))
    img = sobre(img, ampliar(obj.c))
    img = sobre(img, desfocar_rgba(ampliar(frente.c), 1.6))

    gy, gx = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32) / ESC
    # luz: ambiente frio e baixo, a lâmpada quente (com o cone para baixo) e o luar perto da janela
    amb = hexa("#5a6478") * 0.62
    d2 = ((gx - lx) / 150) ** 2 + ((gy - ly) / 120) ** 2
    lamp = np.exp(-d2)[:, :, None] * hexa("#ffc47a") * 1.0
    cone = (np.exp(-(((gx - lx) / 70) ** 2 + ((gy - ly - 24) / 30) ** 2)) * (gy > ly))[:, :, None] * hexa("#ffd89a") * 0.55
    jx, jy = (JAN[0] + JAN[2]) / 2, (JAN[1] + JAN[3]) / 2
    luar = np.exp(-(((gx - jx) / 90) ** 2 + ((gy - jy) / 110) ** 2))[:, :, None] * hexa("#9cb8ff") * 0.42
    geral = np.exp(-(((gx - 180) / 260) ** 2 + ((gy - y_mesa) / 260) ** 2))[:, :, None] * hexa("#ffb878") * 0.35
    luz = amb + lamp + cone + luar + geral
    img = img * luz
    # o vidro da janela aceso por cima (emissivo, levemente desfocado)
    vv = ampliar(vid.c)
    img = sobre(img, desfocar_rgba(vv, 1.2))
    # a boca da lâmpada e o brilho na cúpula
    brilho_l = np.exp(-(((gx - lx) / 16) ** 2 + ((gy - ly) / 4) ** 2))[:, :, None] * hexa("#fff0c8") * 1.6
    img = img + brilho_l
    # bloom
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img - 0.72, 0, None) * np.clip((lum - 0.55) * 3, 0, 1)
    img = img + desfocar(claro, 8) * 0.7 + desfocar(claro, 30) * 0.6
    # correção de cor: altas luzes quentes, sombras azul-esverdeadas
    q, f = hexa("#ffe2b0"), hexa("#3a5a66")
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (f * 0.6 + 0.4)))
    img = np.clip((img - 0.4) * 1.12 + 0.4, 0, 1.4)
    # vinheta de diorama
    xs, ys = gx / W, gy / H
    v = (xs - 0.5) ** 2 * 1.2 + (ys - 0.52) ** 2 * 1.0
    img *= (1 - np.clip(v - 0.07, 0, 1) * 1.1)[:, :, None]
    g = np.random.default_rng(7)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.022
    Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8)).save(SAIDA / f"{nome}.png", optimize=True)



# ───────────────────────────── Objetos soltos ─────────────────────────────
def salvar_inteiro(t: Tela, nome: str, contorno: str | None = "#140d0a") -> None:
    """Salva o quadro inteiro (sem recortar), para o HTML saber onde fica cada parte (3 px por pixel)."""
    if contorno:
        t.contorno(contorno)
    Image.fromarray(np.clip(ampliar(t.c, ESC) * 255, 0, 255).astype(np.uint8), "RGBA").save(SAIDA / f"{nome}.png", optimize=True)


def volume(t: Tela, x: int, base_y: int, w: int, h: int, c, seed: int, gasto: float = 0) -> None:
    """Lombada grande em pé, de frente: couro com nervuras, filetes de ouro e a etiqueta escura do título."""
    Y, X = t.Y, t.X
    top = base_y - h
    # o miolo das páginas aparecendo em cima (perspectiva leve)
    t.ret(x + 2, top - 3, w - 4, 3, "#efe4c8")
    for k in range(x + 3, x + w - 3, 2):
        t.p(k, top - 2, "#d4c6a4")
    m = ((X >= x) & (X < x + w) & (Y >= top) & (Y < base_y)).astype(np.float32)
    eixo = np.clip((X - x) / w, 0, 0.999)
    faixa_tons(t, m, eixo, (c[1], c[0], c[0], c[1], c[1], c[2], c[3]))
    gr = ruido(seed, 1, 1, t.w, t.h)
    t.masc(m * (gr > 0.8), c[2], 0.45)
    t.masc(m * (gr < 0.12), c[0], 0.35)
    if gasto:  # couro gasto nas quinas
        t.masc(m * (ruido(seed + 1, 2, 3, t.w, t.h) > 1 - gasto) * ((Y < top + 8) | (Y > base_y - 8)), "#c8b090", 0.35)
    # cabeceira arredondada em cima e embaixo
    t.ret(x, top, w, 2, c[0])
    t.ret(x, base_y - 2, w, 2, c[2])
    # nervuras (5), cada uma com luz e sombra
    for i, yy in enumerate((top + 12, top + 66, top + 84, top + 102, top + 120)):
        if yy > base_y - 10:
            continue
        t.ret(x, yy, w, 2, c[0])
        t.ret(x, yy + 2, w, 1, c[3])
        for k in range(x + 2, x + w - 2, 3):
            t.p(k, yy - 2, OURO[2])
            t.p(k, yy + 4, OURO[3])
    # etiqueta escura do título com filete de ouro (o texto vem do HTML)
    ey0, ey1 = top + 20, top + 58
    t.ret(x + 3, ey0, w - 6, ey1 - ey0, c[3])
    t.ret(x + 3, ey0, w - 6, 1, OURO[2])
    t.ret(x + 3, ey1 - 1, w - 6, 1, OURO[3])
    t.ret(x + 4, ey0 + 2, w - 8, 1, OURO[3], 0.7)
    t.ret(x + 4, ey1 - 3, w - 8, 1, OURO[3], 0.7)
    # ornamento de ouro embaixo (um losango) e o filete do pé
    cy = base_y - 22
    for k in range(5):
        t.ret(x + w // 2 - k, cy - 4 + k, 2 * k + 1, 1, OURO[2 if k < 3 else 1])
        t.ret(x + w // 2 - k, cy + 4 - k, 2 * k + 1, 1, OURO[2])
    t.ret(x + 2, base_y - 8, w - 4, 1, OURO[2])
    # brilho de luz na quina esquerda
    t.ret(x + 1, top + 2, 1, h - 4, "#ffffff", 0.18)


def volumes() -> None:
    t = Tela(130, 190)
    vinho = ("#9a4a3e", "#7a3430", "#5a2220", "#2e100e")
    azul = ("#4e6896", "#384f7a", "#263a5c", "#131e34")
    verde = ("#3d8c6a", "#2a6e52", "#1c503c", "#0c2a1e")
    volume(t, 6, 182, 34, 154, vinho, 81, gasto=0.12)
    volume(t, 44, 182, 38, 160, azul, 82, gasto=0.05)
    volume(t, 88, 186, 40, 168, verde, 83)
    # a 15ª puxada para frente: sombra no pé dos vizinhos
    for k in range(1, 4):
        t.c[178:184, 82 + k, :3] *= 0.7
    salvar_inteiro(t, "volumes")


def livro_aberto() -> None:
    """Livro aberto visto de cima: capa de couro verde, duas páginas com a curva da lombada, pilha das folhas e fita."""
    t = Tela(320, 220)
    Y, X = t.Y, t.X
    cxm = 160
    # capa (aparece em volta das páginas)
    capa = ((X >= 2) & (X < 318) & (Y >= 6) & (Y < 214)).astype(np.float32)
    t.masc(capa, "#1d4a3c")
    t.masc(capa * (ruido(91, 2, 2, 320, 220) > 0.6), "#245a49")
    t.ret(2, 6, 316, 1, "#3d7a62")
    t.ret(2, 213, 316, 1, "#0a1e18")
    for x in range(4, 316, 2):
        t.p(x, 9, OURO[3], 0.8)
        t.p(x, 210, OURO[3], 0.8)
    # bloco das folhas (bordas empilhadas embaixo e nas laterais)
    for k in range(5):
        t.ret(8 - k * 0.0, 196 + k, cxm - 10, 1, "#d8caa6" if k % 2 else "#efe4c6")
        t.ret(cxm + 2, 196 + k, cxm - 10, 1, "#d8caa6" if k % 2 else "#efe4c6")
    for k in range(4):
        t.ret(6 - k, 14, 1, 184, "#d8caa6" if k % 2 else "#efe4c6")
        t.ret(313 + k, 14, 1, 184, "#d8caa6" if k % 2 else "#efe4c6")
    # as duas páginas: a borda de cima e a de baixo sobem perto da lombada (a curva do papel)
    for lado in (-1, 1):
        for x in range(8 if lado < 0 else cxm + 1, cxm if lado < 0 else 313):
            u = abs(x - cxm) / 152  # 0 na lombada, 1 na borda
            curva = 3 * (1 - u) ** 6
            y_top = 13 - curva
            y_bot = 197
            for y in range(int(y_top), int(y_bot)):
                t.p(x, y, "#f6eedb")
    pag = (t.c[:, :, 0] > 0.9) & (t.c[:, :, 3] > 0.5)
    fib = ruido(92, 1, 1, 320, 220) * 0.6 + ruido(93, 6, 6, 320, 220) * 0.4
    t.masc((pag & (fib > 0.68)).astype(np.float32), "#efe4cc")
    t.masc((pag & (fib < 0.2)).astype(np.float32), "#fbf6e9")
    # sombra da lombada (degraus) e a luz rasante na página da esquerda
    for k in range(18):
        a = 0.42 * (1 - k / 18) ** 1.6
        for x in (cxm - 1 - k, cxm + k):
            t.masc((pag & (X == x)).astype(np.float32), "#6a5a40", a)
    t.ret(cxm - 1, 6, 2, 196, "#3a3020")
    # leve amarelado nas bordas (papel velho) e marca de dedo no canto
    borda = np.minimum(np.minimum(X - 8, 313 - X), np.minimum(Y - 10, 197 - Y))
    t.masc((pag & (borda < 6)).astype(np.float32) * (1 - np.clip(borda, 0, 6) / 6), "#d8c49a", 0.35)
    # a fita marcadora (verde com ponta em V) saindo por baixo
    for y in range(196, 219):
        t.ret(cxm + 30, y, 7, 1, "#2a6e52" if y % 3 else "#3d8c6a")
    t.ret(cxm + 30, 196, 1, 23, "#5aa882")
    t.p(cxm + 33, 218, (0, 0, 0, 0)) if False else None
    for k in range(3):
        t.c[218 - k, cxm + 32 - k:cxm + 35 + k, 3] = 0
    salvar_inteiro(t, "livro-aberto", contorno="#0a1712")


def livros_deitados() -> None:
    t = Tela(150, 56)
    azul = ("#4e6896", "#384f7a", "#263a5c", "#131e34")
    verde = ("#3d8c6a", "#2a6e52", "#1c503c", "#0c2a1e")
    Y, X = t.Y, t.X
    for (x0, y0, w, h, c, sd) in ((4, 28, 140, 24, azul, 1), (12, 4, 128, 24, verde, 2)):
        m = ((X >= x0) & (X < x0 + w) & (Y >= y0) & (Y < y0 + h)).astype(np.float32)
        faixa_tons(t, m, np.clip((Y - y0) / h, 0, 0.999), (c[0], c[0], c[1], c[1], c[2], c[3]))
        t.masc(m * (ruido(sd, 1, 1, 150, 56) > 0.8), c[2], 0.4)
        for xx in (x0 + 10, x0 + w - 12):  # nervuras verticais
            t.ret(xx, y0 + 1, 2, h - 2, c[0])
            t.ret(xx + 2, y0 + 1, 1, h - 2, c[3])
        t.ret(x0 + 22, y0 + 5, w - 46, h - 10, c[3])  # etiqueta
        t.ret(x0 + 22, y0 + 5, w - 46, 1, OURO[2])
        t.ret(x0 + 22, y0 + h - 6, w - 46, 1, OURO[3])
        t.ret(x0, y0, w, 1, c[0])
    # páginas aparecendo do lado direito do livro de cima
    salvar_inteiro(t, "livros-deitados")


def lapis() -> None:
    """Lápis bicolor de revisão (vermelho e azul), apontado dos dois lados."""
    t = Tela(130, 30)
    for i in range(116):
        x, y = 7 + i, 22 - i * 0.14
        verm = i < 58
        tons = ("#f68a78", "#e04a3a", "#b02c1e", "#7a1a10") if verm else ("#8aa8ee", "#4a6cc8", "#30489a", "#1c2a64")
        for j, c in enumerate(tons):
            t.p(x, y - 1 + j, c)
        if 56 <= i <= 59:
            for j in range(4):
                t.p(x, y - 1 + j, "#f3e9d0" if j < 2 else "#c8bca0")
    for lado, (x, y) in enumerate(((7, 22), (123, 22 - 116 * 0.14))):
        d = -1 if lado == 0 else 1
        for k in range(7):  # a madeira apontada e a mina
            xx = x + d * (k + 1)
            for j in range(4 - k // 2):
                t.p(xx, y - 1 + j + k // 2 * 0.5, "#e8c89c" if k < 5 else ("#c0392b" if lado == 0 else "#2c4f98"))
    salvar(t, "lapis", 3, contorno="#1a0e0a")


def lupa() -> None:
    """Lupa de latão com cabo de madeira; a lente fica vazada (o HTML põe o recorte ampliado embaixo)."""
    t = Tela(200, 200)
    cx, cy, ri, ro = 62, 138, 47, 56  # o cabo sobe para a direita
    d = np.hypot(t.X + 0.5 - cx, t.Y + 0.5 - cy)
    ang = np.arctan2(t.Y + 0.5 - cy, t.X + 0.5 - cx)
    # cabo: madeira escura torneada, com virola de latão
    for i2 in range(156):
        i = i2 / 2
        x, y = cx + (ro + 2 + i) * 0.7071, cy - (ro + 2 + i) * 0.7071
        larg = 6 if i < 12 else 8 + 1.5 * math.sin(i / 66 * math.pi)
        for k2 in range(int(-larg * 2), int(larg * 2) + 1):
            k = k2 / 2
            u = (k + larg) / (2 * larg)
            if i < 12:
                cor = OURO[1] if u < 0.3 else OURO[2] if u < 0.7 else OURO[3]
            else:
                cor = "#8a4a2a" if u < 0.25 else "#6a3418" if u < 0.6 else "#4a220e" if u < 0.85 else "#2a1206"
                if int(i) % 16 in (0, 1) and i > 14:
                    cor = "#3a1a0a"
            t.p(x + k * 0.7071, y + k * 0.7071, cor)
    # aro de latão em degraus de luz (luz de cima à esquerda)
    aro = ((d >= ri) & (d <= ro)).astype(np.float32)
    luz = np.clip(0.5 - 0.5 * np.cos(ang + math.pi * 0.75), 0, 0.999)
    faixa_tons(t, aro, luz, (OURO[0], OURO[1], OURO[2], OURO[2], OURO[3], "#5a3a10"))
    t.masc(((np.abs(d - ri) < 0.8)).astype(np.float32), "#5a3a10")
    t.masc(((np.abs(d - ro) < 0.8)).astype(np.float32), "#3a2408")
    t.masc(((np.abs(d - (ri + ro) / 2) < 0.6)).astype(np.float32) * (luz < 0.4), "#fff8d8", 0.8)
    # a lente: vazada, só com um reflexo curvo por cima (meio transparente)
    t.masc(((np.abs(d - (ri - 6)) < 1.2) & (ang > -2.6) & (ang < -1.6)).astype(np.float32), "#ffffff", 0.55)
    t.masc(((np.abs(d - (ri - 10)) < 0.8) & (ang > -2.4) & (ang < -2.0)).astype(np.float32), "#ffffff", 0.35)
    salvar_inteiro(t, "lupa", contorno="#1a1008")


def carimbo() -> None:
    t = Tela(50, 64)
    cx = 25
    # pegador de madeira torneada
    for y in range(4, 30):
        k = (y - 4) / 26
        meia = 7 + 3 * math.sin(k * math.pi) - (4 if 14 < y < 22 else 0)
        for x in range(int(cx - meia), int(cx + meia) + 1):
            u = (x - (cx - meia)) / (2 * meia)
            t.p(x, y, "#c8925a" if u < 0.25 else "#a06a3a" if u < 0.6 else "#784a24" if u < 0.85 else "#4a2a12")
    t.elip(cx - 3, 9, 2, 3, "#e8b880", 0.8)
    # corpo de madeira e a borracha vermelha
    for y in range(30, 54):
        for x in range(cx - 20, cx + 21):
            u = (x - (cx - 20)) / 40
            t.p(x, y, "#b07a46" if u < 0.2 else "#8e5c30" if u < 0.7 else "#6a4020")
    t.ret(cx - 20, 30, 41, 1, "#d8a46c")
    t.ret(cx - 21, 54, 43, 6, "#a8281e")
    t.ret(cx - 21, 54, 43, 1, "#d84a3a")
    t.ret(cx - 21, 59, 43, 1, "#6a140e")
    salvar(t, "carimbo", 3, contorno="#1a0e0a")


def balanca(nome: str, inclinacao: float) -> None:
    """Balança de pratos de latão. inclinacao > 0 abaixa o prato da esquerda."""
    t = Tela(140, 112)
    cx, piv = 70, 18
    # base em degraus e coluna
    for k, (w, cor) in enumerate(((50, OURO[3]), (40, OURO[2]), (30, OURO[1]))):
        t.ret(cx - w // 2, 106 - k * 4, w, 4, cor)
        t.ret(cx - w // 2, 106 - k * 4, w, 1, OURO[0] if k == 2 else OURO[1])
    t.ret(cx - 3, piv, 7, 86, OURO[2])
    t.ret(cx - 3, piv, 2, 86, OURO[1])
    t.ret(cx + 2, piv, 2, 86, OURO[3])
    t.elip(cx, piv - 6, 5, 5, OURO[2])
    t.elip(cx - 1, piv - 7, 2, 2, OURO[0])
    # o travessão inclinado
    a = math.radians(inclinacao)
    L = 52
    ends = []
    for sgn in (-1, 1):
        ex, ey = cx + sgn * L * math.cos(a), piv - sgn * L * math.sin(a) * -1
        ey = piv + (-sgn) * L * math.sin(a)
        ends.append((ex, ey))
    (lx, ly), (rx, ry) = ends
    for k in range(-1, 2):
        t.linha(lx, ly + k, rx, ry + k, OURO[1] if k < 0 else OURO[2] if k == 0 else OURO[3])
    t.elip(cx, piv, 3, 3, OURO[3])
    t.p(cx, piv, OURO[0])
    # correntes e pratos
    for (ex, ey) in ends:
        t.elip(ex, ey, 2, 2, OURO[2])
        for sgn in (-1, 1):
            for i in range(0, 34, 2):
                t.p(ex + sgn * i * 0.42, ey + 2 + i, OURO[2] if i % 4 else OURO[3])
        py = ey + 36
        for y in range(int(py), int(py) + 7):
            k = (y - py) / 7
            meia = 17 - k * 8
            for x in range(int(ex - meia), int(ex + meia) + 1):
                u = (x - (ex - meia)) / (2 * meia)
                t.p(x, y, OURO[1] if u < 0.25 else OURO[2] if u < 0.65 else OURO[3])
        t.ret(ex - 17, py, 35, 1, OURO[0])
    salvar_inteiro(t, nome, contorno="#2a1a06")


def macbook() -> None:
    """MacBook Air (13,6") de frente, cor estelar: tampa com bordas finas, entalhe da câmera e a base.
    A tela fica vazada: no HTML, a captura real do site entra embaixo, de (18, 6) a (286, 180) em pixels da arte,
    (54, 18) a (858, 540) na imagem 3x (804 x 522, a proporção 1470 x 956 da tela)."""
    t = Tela(304, 202)
    Y, X = t.Y, t.X
    lx0, lx1, ly0, ly1 = 12, 292, 0, 186
    r = 6
    tampa = ((X >= lx0) & (X < lx1) & (Y >= ly0) & (Y < ly1)).astype(bool)
    for (ccx, ccy) in ((lx0 + r, ly0 + r), (lx1 - r, ly0 + r)):
        canto = (np.abs(X + 0.5 - ccx) <= r) & (np.abs(Y + 0.5 - ccy) <= r) & (((X + 0.5 - ccx) ** 2 + (Y + 0.5 - ccy) ** 2) > r * r) & (Y < ly0 + r)
        canto &= ((X < lx0 + r) if ccx < 152 else (X >= lx1 - r))
        tampa &= ~canto
    t.masc(tampa.astype(np.float32), "#0b0d10")
    # aro de alumínio estelar (1 px) e reflexo no vidro da moldura
    viz = np.zeros_like(tampa)
    for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        viz |= ~np.roll(np.roll(tampa, dy, 0), dx, 1)
    t.masc((tampa & viz).astype(np.float32), "#d8ccb6")
    t.masc((tampa & viz & (Y < 3)).astype(np.float32), "#f4ecdc")
    t.masc((tampa & ~viz & (Y < 3)).astype(np.float32), "#1c2026", 0.8)
    # a tela vazada
    sx0, sx1, sy0, sy1 = 18, 286, 6, 180
    t.c[sy0:sy1, sx0:sx1, 3] = 0
    # entalhe da câmera
    nx0, nx1 = 138, 166
    t.ret(nx0, sy0, nx1 - nx0, 5, "#0b0d10")
    t.p(nx0 - 1, sy0, "#0b0d10")
    t.p(nx1, sy0, "#0b0d10")
    t.elip(152, sy0 + 2, 1.2, 1.2, "#1e2c44")
    t.p(152, sy0 + 2, "#3a5a8a")
    # dobradiça e a base em cunha vista de frente
    t.ret(lx0 + 6, ly1, lx1 - lx0 - 12, 3, "#2a2a2c")
    t.ret(lx0 + 6, ly1, lx1 - lx0 - 12, 1, "#4a4846")
    bx0, bx1, by0 = 2, 302, ly1 + 3
    base = ((X >= bx0) & (X < bx1) & (Y >= by0) & (Y < by0 + 9)).astype(np.float32)
    degrade_v(t, base, by0, by0 + 9, ("#f6eee0", "#e8dcc8", "#dccfb8", "#d0c2a8", "#c4b498", "#a89878", "#8a7c62"))
    for (ccx, sgn) in ((bx0, 1), (bx1 - 1, -1)):  # cantos arredondados da base
        for k in range(3):
            t.c[by0 + 6 + k, ccx + sgn * 0: ccx + 1 if sgn > 0 else ccx + 1, 3] = 0
            t.c[by0 + 8 - k, ccx: ccx + 1, 3] = 0
    t.ret(bx0 + 2, by0, bx1 - bx0 - 4, 1, "#fffaf0")
    # a cava para abrir a tampa, no meio
    t.elip(152, by0 + 1, 18, 1.6, "#b4a68c")
    t.ret(135, by0, 34, 1, "#c8baa0")
    # pés de borracha e sombra de contato
    t.ret(bx0 + 14, by0 + 9, 26, 1, "#2a2420")
    t.ret(bx1 - 40, by0 + 9, 26, 1, "#2a2420")
    salvar_inteiro(t, "macbook", contorno=None)


def prendedor() -> None:
    """Prendedor de papel (binder) preto, pequeno, com as alças de aço dobradas para trás."""
    t = Tela(28, 30)
    for sgn in (-1, 1):  # alças de arame
        x0 = 14 + sgn * 6
        for y in range(1, 15):
            t.p(x0, y, AÇO[1] if sgn < 0 else AÇO[3])
        t.ret(min(x0, 14 + sgn * 2), 1, 5, 1, AÇO[0])
    for y in range(13, 28):  # corpo em trapézio
        k = (y - 13) / 15
        meia = 8 + k * 3
        for x in range(int(14 - meia), int(14 + meia) + 1):
            u = (x - (14 - meia)) / (2 * meia)
            t.p(x, y, "#5a5e66" if u < 0.15 else "#2a2c32" if u < 0.7 else "#16171b")
    t.ret(6, 13, 17, 1, "#7a7e86")
    t.ret(4, 27, 21, 1, "#0a0a0c")
    t.ret(8, 16, 4, 1, "#9aa0aa", 0.8)
    salvar(t, "prendedor", 3, contorno="#0a0a0c")


def imagens() -> None:
    """Recortes e ampliações (Lanczos) da Fig. 29.28 do Campbell 15 para os filmes dos stories."""
    pasta = SAIDA.parent / "img"
    fig = Image.open(pasta / "figura-29-28.jpeg").convert("RGB")
    a, b = fig.crop((0, 0, 336, 336)), fig.crop((339, 0, 713, 336))
    a.resize((a.width * 3, a.height * 3), Image.LANCZOS).save(pasta / "fig-a-3x.png", optimize=True)
    b.resize((b.width * 3, b.height * 3), Image.LANCZOS).save(pasta / "fig-b-3x.png", optimize=True)
    z = fig.crop((14, 150, 194, 330))
    z.resize((z.width * 3, z.height * 3), Image.LANCZOS).save(pasta / "fig-a-zoom.png", optimize=True)
    z = fig.crop((360, 100, 540, 280))  # a lesão na ressonância (B)
    z.resize((z.width * 3, z.height * 3), Image.LANCZOS).save(pasta / "fig-b-zoom.png", optimize=True)


def iphone() -> None:
    """iPhone de frente, aro de titânio natural, bordas pretas finas e a Dynamic Island.
    A tela fica vazada (cantos arredondados): no HTML, de (8, 8) a (186, 393) em pixels da arte,
    (24, 24) a (558, 1179) na imagem 3x (534 x 1155, a proporção 390 x 844 do iPhone)."""
    t = Tela(196, 402)
    Y, X = t.Y, t.X

    def ret_arred(x0, y0, x1, y1, r):
        m = (X >= x0) & (X < x1) & (Y >= y0) & (Y < y1)
        for (cx, cy) in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
            fora = ((X + 0.5 - cx) ** 2 + (Y + 0.5 - cy) ** 2 > r * r)
            canto = ((X < x0 + r) if cx < (x0 + x1) / 2 else (X >= x1 - r)) & ((Y < y0 + r) if cy < (y0 + y1) / 2 else (Y >= y1 - r))
            m &= ~(canto & fora)
        return m
    # botões laterais (por baixo do aro)
    for (y0, y1) in ((70, 80), (96, 116), (122, 142)):
        t.ret(1, y0, 3, y1 - y0, "#8e877c")
        t.ret(1, y0, 1, y1 - y0, "#c8c0b2")
    t.ret(192, 104, 3, 34, "#8e877c")
    t.ret(194, 104, 1, 34, "#5a554e")
    corpo = ret_arred(3, 2, 193, 400, 24)
    # aro de titânio em degraus de luz (luz de cima à esquerda)
    luz = np.clip(0.5 - (X - 98) / 260 + (Y - 200) / 900, 0, 0.999)
    faixa_tons(t, corpo.astype(np.float32), luz, ("#efe8dc", "#d6cebf", "#bdb4a4", "#a39a8a", "#857c6e"))
    vidro = ret_arred(5, 4, 191, 398, 22)
    t.masc(vidro.astype(np.float32), "#0a0b0d")
    t.masc((vidro & ~ret_arred(6, 5, 190, 397, 21)).astype(np.float32), "#2a2c30")  # borda do vidro
    tela = ret_arred(8, 8, 186, 393, 18)
    t.c[tela, 3] = 0
    # Dynamic Island
    ilha = ret_arred(81, 13, 115, 23, 5)
    t.masc(ilha.astype(np.float32), "#050506")
    t.elip(108, 18, 1.6, 1.6, "#1c2638")
    t.p(108, 17, "#4a6a9a")
    # brilho no aro
    t.ret(30, 2, 120, 1, "#fffaf0", 0.7)
    salvar_inteiro(t, "iphone", contorno=None)


OBJETOS = [("iphone", iphone), ("imagens", imagens), ("prendedor", prendedor), ("volumes", volumes), ("livro-aberto", livro_aberto), ("livros-deitados", livros_deitados), ("lapis", lapis),
           ("lupa", lupa), ("carimbo", carimbo), ("balanca-litica", lambda: balanca("balanca-litica", 12)),
           ("balanca-blastica", lambda: balanca("balanca-blastica", -12)), ("macbook", macbook)]


if __name__ == "__main__":
    import sys
    SAIDA.mkdir(exist_ok=True)
    so = sys.argv[1:]
    for nome, fn in [("fundo", lambda: fundo("fundo", 530, False)), ("fundo-mesa", lambda: fundo("fundo-mesa", 372, True))] + OBJETOS:
        if not so or nome in so:
            fn()
            print(nome)
