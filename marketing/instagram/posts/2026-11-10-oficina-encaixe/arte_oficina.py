"""A Oficina do Encaixe: arte em pixel art "HD-2D" dos stories da questão trauma-0187 (10/11/2026).

Arte original feita por código: nada baixado, nada gerado por IA. Mesma técnica dos cenários do site
(scripts/gerar_cena_*.py): pintar em pixel art pequena, camada por camada, com 3 a 7 tons por material, contorno e
textura; ampliar 3x e montar com luz calculada por pixel (sol entrando pela janela em feixes com poeira, mancha de sol
na bancada, sombras projetadas, brilho, correção de cor, vinheta e grão).

Saída em arte/:
- fundo.png (1080 x 1920): a parede de tábuas, a janela com o sol da tarde, a prateleira, as ferramentas penduradas
  e a bancada de faia com maravalhas, macete, lápis, régua e um bloco com uma mortalha riscada a lápis;
- os objetos soltos (PNG transparente, ampliados sem suavizar): paquimetro, transferidor, esquadro, encaixe
  (espiga e mortalha), grampo, lapis, etiqueta e maravalha.
Nenhum texto é pintado: tudo o que se lê fica no HTML.
Uso: python3 arte_oficina.py  (numpy e pillow)
"""
from __future__ import annotations

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


# ───────────────────────────── A parede e a janela ─────────────────────────────
JANELA = (238, 8, 348, 96)  # x0, y0, x1, y1 da moldura
VIDROS = [(244, 14, 290, 49), (294, 14, 342, 49), (244, 53, 290, 90), (294, 53, 342, 90)]
DIR_SOL = 0.66  # o feixe desce para a esquerda: x recua 0.66 por pixel de queda


def parede(t: Tela) -> None:
    g = np.random.default_rng(1)
    x, tabuas = 0, []
    while x < W:
        w = int(g.integers(17, 28))
        tabuas.append((x, min(W, x + w)))
        x += w
    fino = ruido(2, 1, 11, W + 8, H)
    med = ruido(3, 3, 46, W, H)
    larg = ruido(4, 24, 70, W, H)
    Y, X = t.Y, t.X
    rgb = np.zeros((H, W, 3), np.float32)
    for i, (a, b) in enumerate(tabuas):
        k = h01(i, 5)
        base = mix("#62402a", "#4c301e", k) * (0.92 + 0.16 * h01(i, 9))
        sl = (X >= a) & (X < b)
        # o veio ondula devagar, cada tábua com a sua fase
        off = (2.2 * np.sin(Y / (19 + 7 * h01(i, 3)) + i * 1.7) + 1.2 * np.sin(Y / 7.3 + i)).astype(int)
        xi = np.clip(X.astype(int) + off + 4, 0, W + 7)
        f = fino[Y.astype(int), xi]
        tom = base[None, None, :] * (0.80 + 0.30 * larg[:, :, None]) * (0.93 + 0.12 * med[:, :, None])
        tom = np.where((f > 0.74)[:, :, None], tom * 0.78, tom)
        tom = np.where((f > 0.86)[:, :, None], tom * 0.82, tom)
        tom = np.where((f < 0.16)[:, :, None], tom * 1.10, tom)
        rgb = np.where(sl[:, :, None], tom, rgb)
        # fresta escura, quina iluminada à esquerda, sombra à direita
        rgb[:, a] = hexa("#1a0f08")
        if a + 1 < W:
            rgb[:, a + 1] = rgb[:, a + 1] * 1.22
        if b - 1 > a:
            rgb[:, b - 1] = rgb[:, b - 1] * 0.74
        # nós da madeira com anéis e o veio desviando em volta
        for j in range(2):
            if h01(i, j, 77) > 0.58:
                cx = a + (b - a) * (0.3 + 0.4 * h01(i, j, 1))
                cy = 30 + h01(i, j, 2) * 470
                rx, ry = 2.2 + h01(i, j, 3) * 1.8, 3.5 + h01(i, j, 4) * 2.5
                d = np.sqrt(((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2)
                anel = (d < 1) & (np.sin(d * 9) > 0)
                rgb = np.where(((d < 1) & sl)[:, :, None], rgb * 0.62, rgb)
                rgb = np.where((anel & sl)[:, :, None], rgb * 0.75, rgb)
                rgb = np.where(((d < 0.35) & sl)[:, :, None], hexa("#24150c"), rgb)
                halo = (d > 1) & (d < 2.6) & sl & (np.sin(d * 6 + X * 0.2) > 0.55)
                rgb = np.where(halo[:, :, None], rgb * 0.84, rgb)
    t.masc(np.ones((H, W), np.float32), rgb)
    for y0 in (104, 336):  # travessas pregadas
        travessa(t, y0, tabuas)


def travessa(t: Tela, y0: int, tabuas) -> None:
    n = ruido(40 + y0, 22, 1, W, H)
    tom = np.where(n[y0:y0 + 9, :, None] > 0.55, hexa("#6c442a"), hexa("#5e3a24"))
    t.c[y0:y0 + 9, :, :3] = tom
    t.c[y0, :, :3] = hexa("#8e6040")
    t.c[y0 + 1, :, :3] = hexa("#7a5034")
    t.c[y0 + 8, :, :3] = hexa("#3a2414")
    for k in (1, 2, 3):  # sombra da travessa na parede
        t.c[y0 + 8 + k, :, :3] *= 0.55 + 0.13 * k
    for (a, b) in tabuas:
        cx = (a + b) // 2
        for yy in (y0 + 3, y0 + 5):
            t.p(cx, yy, "#2a2420")
            t.p(cx + 1, yy, "#2a2420")
            t.p(cx, yy - 1 if yy == y0 + 3 else yy + 1, "#8a8278")


def janela(t: Tela, vid: Tela) -> None:
    x0, y0, x1, y1 = JANELA
    t.ret(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6, "#24160c")  # vão na parede
    ruid = ruido(50, 4, 2, W, H)
    moldura = Tela(W, H)
    moldura.ret(x0, y0, x1 - x0, y1 - y0, "#9a7650")
    for (a, b, c, d) in VIDROS:
        moldura.ret(a, b, c - a, d - b, "#000000")
    m = moldura.c[:, :, 3] * (moldura.c[:, :, 0] > 0.1)
    tom = np.where((ruid > 0.6)[:, :, None], hexa("#a8835a"), hexa("#94704a"))
    t.masc(m, tom)
    # bisel da moldura: quinas claras em cima e à esquerda, escuras embaixo e à direita
    t.ret(x0, y0, x1 - x0, 1, "#d2ac7c")
    t.ret(x0, y0, 1, y1 - y0, "#c49e70")
    t.ret(x0, y1 - 1, x1 - x0, 1, "#5a3e24")
    t.ret(x1 - 1, y0, 1, y1 - y0, "#5a3e24")
    for (a, b, c, d) in VIDROS:
        t.ret(a - 1, b - 1, c - a + 2, 1, "#5e4228")
        t.ret(a - 1, b - 1, 1, d - b + 2, "#5e4228")
        t.ret(a - 1, d, c - a + 2, 1, "#c8a274")
        t.ret(c, b - 1, 1, d - b + 2, "#c8a274")
    # o vidro: céu de tarde e folhagem lá fora, desfocados (emissivo)
    ceu = np.zeros((H, W, 3), np.float32)
    tt = np.clip((t.Y - y0) / (y1 - y0), 0, 1)[:, :, None]
    ceu[:] = hexa("#fff4d6") * (1 - tt) + hexa("#ffd38a") * tt
    folha = ruido(51, 5, 5, W, H) * 0.6 + ruido(52, 2, 2, W, H) * 0.4
    alt = np.clip((t.Y - (y0 + 38)) / 40, 0, 1) + np.clip((x0 + 30 - t.X) / 40, 0, 1) * 0.5
    verde = np.where(folha[:, :, None] > 0.62, hexa("#b8c470"), np.where(folha[:, :, None] > 0.5, hexa("#8ea35a"), hexa("#6c8746")))
    mascf = (folha + alt * 0.55 > 0.86)
    ceu = np.where(mascf[:, :, None], verde, ceu)
    mv = np.zeros((H, W), np.float32)
    for (a, b, c, d) in VIDROS:
        mv[b:d, a:c] = 1
    vid.masc(mv, ceu)
    # um galho escuro cruzando o vidro
    for k in range(60):
        xx = 250 + k * 1.5
        yy = 44 + 10 * math.sin(k / 14) + k * 0.25
        if any(a <= xx < c and b <= yy < d for (a, b, c, d) in VIDROS):
            vid.p(xx, yy, "#4a5a32", 0.85)
            if k % 9 == 0:
                vid.p(xx + 1, yy - 1, "#5e7040", 0.8)
    # reflexo diagonal no vidro
    for (a, b, c, d) in VIDROS:
        for s in range(0, 24):
            vid.p(a + 4 + s, b + 3 + s * 0.9, "#ffffff", 0.22)
            vid.p(a + 6 + s, b + 3 + s * 0.9, "#ffffff", 0.12)
    # peitoril e o vaso de planta
    t.ret(x0 - 8, y1, x1 - x0 + 16, 4, "#a8835a")
    t.ret(x0 - 8, y1, x1 - x0 + 16, 1, "#dcb688")
    t.ret(x0 - 8, y1 + 3, x1 - x0 + 16, 1, "#4a3018")
    for k in (1, 2, 3, 4):
        t.c[y1 + 3 + k, x0 - 8:x1 + 8, :3] *= 0.5 + 0.12 * k
    vaso(t, 318, y1)


def vaso(t: Tela, cx: int, base: int) -> None:
    for y in range(base - 13, base):
        k = (y - (base - 13)) / 13
        meia = 8 - k * 2
        for x in range(int(cx - meia), int(cx + meia) + 1):
            u = (x - (cx - meia)) / (2 * meia)
            cor = "#e08a52" if u < 0.25 else "#c46c38" if u < 0.62 else "#93491f"
            t.p(x, y, cor)
    t.ret(cx - 9, base - 15, 19, 3, "#d27a44")
    t.ret(cx - 9, base - 15, 19, 1, "#f0a46c")
    t.ret(cx - 9, base - 13, 19, 1, "#7a3a16")
    g = np.random.default_rng(60)
    for i in range(34):  # folhas
        ang = -math.pi / 2 + (g.random() - 0.5) * 2.4
        comp = 6 + g.random() * 12
        x, y = cx + (g.random() - 0.5) * 6, base - 15
        for s in range(int(comp)):
            px, py = x + math.cos(ang) * s, y + math.sin(ang) * s + (s / comp) ** 2 * 4
            cor = "#9cc46a" if s > comp * 0.6 else "#6f9a48" if s > comp * 0.3 else "#4a7434"
            t.p(px, py, cor)
            if s > 2 and s < comp - 2:
                t.p(px + 1, py, "#5a8640", 0.8)
        brilho_folha = (x + math.cos(ang) * comp * 0.7, y + math.sin(ang) * comp * 0.7)
        t.p(*brilho_folha, "#d4ec98", 0.9)


# ───────────────────────────── A prateleira ─────────────────────────────
def prateleira(t: Tela) -> None:
    y = 64
    t.ret(6, y, 172, 6, "#8a603c")
    t.ret(6, y, 172, 1, "#c08a5a")
    t.ret(6, y + 5, 172, 1, "#3e2614")
    n = ruido(70, 18, 1, W, H)
    t.masc(((t.Y >= y + 1) & (t.Y < y + 5) & (t.X >= 6) & (t.X < 178) & (n > 0.6)).astype(np.float32), "#9a6e46")
    for k in range(1, 7):
        t.c[y + 5 + k, 6:178, :3] *= 0.45 + 0.08 * k
    for bx in (22, 158):  # mãos-francesas de ferro
        for i in range(14):
            t.p(bx, y + 6 + i, "#2c2622")
            t.p(bx + 1, y + 6 + i, "#4a423a")
            t.p(bx + 1 + i * 0.8, y + 6 + i * 0.1, "#2c2622")
        for i in range(12):
            t.p(bx + 1 + i * 0.8, y + 6 + i * 1.05, "#3a322c")
    pote(t, 12, y, 17, 23, "parafusos", 71)
    pote(t, 32, y, 14, 29, "pregos", 72)
    lata(t, 50, y)
    blocos(t, 74, y)
    plaina(t, 104, y)
    serrote(t, 98, 8)
    furadeira(t, 40, 4)


def pote(t: Tela, x0: int, base: int, w: int, h: int, tipo: str, seed: int) -> None:
    g = np.random.default_rng(seed)
    y0 = base - h
    t.ret(x0, y0 + 3, w, h - 3, "#b8ccd2", 0.32)
    for y in range(y0 + 3 + (h - 3) // 3, base - 1):  # o conteúdo
        for x in range(x0 + 1, x0 + w - 1):
            r = g.random()
            if tipo == "parafusos":
                cor = "#c8ccd0" if r < 0.18 else "#8a9098" if r < 0.6 else "#5a6068"
            else:
                cor = "#9aa0a6" if (x + y // 2) % 3 == 0 else "#62686e"
            t.p(x, y, cor, 0.95)
    t.ret(x0, y0 + 3, 1, h - 3, "#e6f2f6", 0.85)
    t.ret(x0 + 2, y0 + 5, 1, h - 9, "#ffffff", 0.55)
    t.ret(x0 + w - 1, y0 + 3, 1, h - 3, "#6a7c84", 0.85)
    t.ret(x0, base - 1, w, 1, "#7a8c94", 0.9)
    t.ret(x0 - 1, y0, w + 2, 4, "#8a7444")  # tampa com frisos
    for x in range(x0 - 1, x0 + w + 1, 2):
        t.p(x, y0 + 1, "#b89a5a")
        t.p(x, y0 + 2, "#5e4a26")
    t.ret(x0 - 1, y0, w + 2, 1, "#d8bc78")


def lata(t: Tela, x0: int, base: int) -> None:
    w, h = 19, 22
    y0 = base - h
    for x in range(x0, x0 + w):
        u = (x - x0) / (w - 1)
        cor = "#d8dde2" if u < 0.2 else "#aab0b8" if u < 0.55 else "#7a828a" if u < 0.85 else "#5a6068"
        t.ret(x, y0, 1, h, cor)
        band = "#2a8a7e" if u < 0.3 else "#14655e" if u < 0.75 else "#0c4640"
        t.ret(x, y0 + 7, 1, 9, band)
        t.ret(x, y0 + 9, 1, 3, "#f0e6cc" if u < 0.4 else "#d8ccae" if u < 0.8 else "#b0a488")
    t.ret(x0 - 1, y0 - 1, w + 2, 2, "#c4cad0")
    t.ret(x0 - 1, y0 - 1, w + 2, 1, "#eef2f4")
    for k in range(5):  # escorrido de verniz
        t.p(x0 + 4, y0 + 1 + k, "#7a4418")
        t.p(x0 + 5, y0 + 1 + k // 2, "#9a5a22")


def blocos(t: Tela, x0: int, base: int) -> None:
    for (dx, dy, w, h, tons) in ((0, 0, 26, 8, ("#c88a5a", "#a86a40", "#7a4a2a")), (3, 8, 21, 7, ("#e8c88a", "#c8a468", "#9a7a48")),
                                 (6, 15, 15, 8, ("#7a5a3e", "#5e422c", "#3e2a1a"))):
        y = base - dy - h
        t.ret(x0 + dx, y, w, h, tons[1])
        t.ret(x0 + dx, y, w, 1, tons[0])
        t.ret(x0 + dx + w - 1, y, 1, h, tons[2])
        for k in range(2, w - 2, 3):  # veio
            t.p(x0 + dx + k, y + 2 + (k % 4), tons[2], 0.6)
        # topo com anéis de crescimento (corte transversal)
        cx, cy = x0 + dx + 3, y + h // 2
        for r in (1, 2, 3):
            for a in range(0, 360, 30):
                t.p(cx + r * math.cos(math.radians(a)) * 0.6, cy + r * math.sin(math.radians(a)), tons[2], 0.5)


def plaina(t: Tela, x0: int, base: int) -> None:
    # corpo de faia
    t.poli([(x0, base - 1), (x0 + 6, base - 9), (x0 + 58, base - 9), (x0 + 62, base - 1)], "#b88450")
    t.ret(x0 + 6, base - 9, 52, 1, "#e0b07a")
    t.ret(x0, base - 2, 62, 1, "#5a3a20")
    for k in range(4, 60, 5):
        t.p(x0 + k, base - 5 + (k % 3), "#8a5e36", 0.7)
    # ferro e cunha de latão
    t.poli([(x0 + 26, base - 9), (x0 + 34, base - 22), (x0 + 38, base - 22), (x0 + 31, base - 9)], "#a0a8b0")
    t.linha(x0 + 34, base - 22, x0 + 27, base - 10, "#e8eef2")
    t.poli([(x0 + 29, base - 9), (x0 + 35, base - 18), (x0 + 39, base - 17), (x0 + 34, base - 9)], "#d0a040")
    t.p(x0 + 34, base - 14, "#fff0a0")
    # manopla da frente e punho de trás
    t.elip(x0 + 12, base - 12, 3, 3.5, "#7a3a1e")
    t.p(x0 + 11, base - 14, "#c06a3a")
    for k in range(14):
        a = math.radians(200 + k * 10)
        for r in (5, 6, 7):
            t.p(x0 + 50 + r * math.cos(a), base - 12 + r * math.sin(a), "#7a3a1e" if r == 7 else "#9a4e28")


def serrote(t: Tela, x0: int, y0: int) -> None:
    # prego, lâmina trapezoidal com dentes e punho de madeira
    t.p(x0 + 8, y0 - 3, "#2a2420")
    t.p(x0 + 9, y0 - 3, "#8a8278")
    lam = [(x0 + 18, y0 + 2), (x0 + 74, y0 + 9), (x0 + 74, y0 + 18), (x0 + 18, y0 + 26)]
    m = t.poli_m(lam)
    eixo = np.clip((t.Y - y0) / 26, 0, 1)
    faixa_tons(t, m, eixo, ("#e4e8ec", "#c4cad0", "#a2a8b0", "#82888e"))
    for x in range(x0 + 18, x0 + 74, 2):  # dentes
        yb = y0 + 26 - (x - x0 - 18) * 8 / 56
        t.p(x, yb, "#9aa0a6")
        t.p(x + 1, yb + 1, "#5a6066")
    t.linha(x0 + 20, y0 + 4, x0 + 72, y0 + 10, "#f8fbfd", 0.8)
    pun = [(x0, y0 + 2), (x0 + 20, y0), (x0 + 22, y0 + 28), (x0 + 4, y0 + 30)]
    pm = t.poli_m(pun)
    faixa_tons(t, pm, np.clip((t.X - x0) / 22, 0, 1), ("#d08a52", "#b06c3a", "#8a4e26", "#6a3618"))
    t.elip(x0 + 10, y0 + 15, 3.5, 7, "#24160c")
    for (dx, dy) in ((17, 6), (17, 22)):
        t.p(x0 + dx, y0 + dy, "#e8c86a")
        t.p(x0 + dx + 1, y0 + dy, "#8a6a2a")


def furadeira(t: Tela, x0: int, y0: int) -> None:
    """Arco de pua pendurado: a manivela de ferro com o punho e a cabeça de madeira."""
    t.p(x0 + 6, y0 - 1, "#2a2420")
    t.elip(x0 + 6, y0 + 3, 4, 3, "#7a4a28")
    t.p(x0 + 5, y0 + 2, "#c08048")
    pts = [(x0 + 6, y0 + 6), (x0 + 6, y0 + 12), (x0 + 16, y0 + 14), (x0 + 16, y0 + 24), (x0 + 6, y0 + 26), (x0 + 6, y0 + 34)]
    for (a, b) in zip(pts, pts[1:]):
        t.linha(a[0], a[1], b[0], b[1], "#3a3836", g=2)
        t.linha(a[0] - 1, a[1], b[0] - 1, b[1], "#8a8884")
    t.ret(x0 + 13, y0 + 15, 6, 8, "#9a5a2e")
    t.ret(x0 + 13, y0 + 15, 2, 8, "#c88048")
    t.ret(x0 + 5, y0 + 34, 3, 6, "#a8acb0")
    t.p(x0 + 6, y0 + 40, "#6a6e72")


# ───────────────────────────── Ferramentas penduradas (nas margens) ─────────────────────────────
def ferramentas(t: Tela) -> None:
    # suporte de formões à esquerda
    t.ret(0, 150, 30, 5, "#7a5030")
    t.ret(0, 150, 30, 1, "#a87448")
    for i, x in enumerate((3, 10, 17, 24)):
        cab = ("#b86a38", "#9a5228", "#d0904e", "#8a4a22")[i]
        t.ret(x, 128 + i % 2 * 2, 4, 22 - i % 2 * 2, cab)
        t.ret(x, 128 + i % 2 * 2, 1, 22 - i % 2 * 2, "#e8a868")
        t.ret(x, 148, 4, 2, "#c8a040")
        t.ret(x + 1, 155, 2, 22 + i * 3, "#9aa2a8")
        t.ret(x + 1, 155, 1, 22 + i * 3, "#dfe6ea")
    # esquadro pendurado à direita
    t.p(344, 152, "#2a2420")
    t.ret(336, 154, 6, 58, "#6a2e1e")
    t.ret(336, 154, 1, 58, "#a04a30")
    for yy in (162, 182, 202):
        t.p(338, yy, "#e8c86a")
        t.p(339, yy, "#8a6a2a")
    t.ret(342, 156, 18, 4, "#c0c8ce")
    t.ret(342, 156, 18, 1, "#eef4f8")
    for x in range(344, 360, 2):
        t.p(x, 159, "#5a6066")
    # grampos pendurados na travessa de baixo
    for i, x in enumerate((322, 334, 346)):
        grampo_parede(t, x, 345 + i * 3, 70 - i * 8)
    # serra de arco à esquerda, embaixo
    for k in range(70):
        t.p(4 + 10 * math.sin(k / 22), 380 + k, "#7a4e2c")
        t.p(5 + 10 * math.sin(k / 22), 380 + k, "#a06a3e")
    t.linha(2, 382, 2, 450, "#b8bec4")
    t.ret(10, 412, 16, 3, "#8a5a34")


def grampo_parede(t: Tela, x: int, y: int, h: int) -> None:
    t.ret(x, y, 3, h, "#a8b0b6")
    t.ret(x, y, 1, h, "#e6ecf0")
    t.ret(x - 8, y, 11, 5, "#14655e")
    t.ret(x - 8, y, 11, 1, "#3aa094")
    t.ret(x - 8, y + h - 14, 11, 5, "#14655e")
    t.ret(x - 8, y + h - 14, 11, 1, "#3aa094")
    t.ret(x - 6, y + h - 9, 2, 6, "#c0c6cc")
    t.ret(x - 8, y + h - 3, 6, 10, "#9a4a26")
    t.ret(x - 8, y + h - 3, 2, 10, "#d07a44")


# ───────────────────────────── A bancada ─────────────────────────────
BANCADA = 512
FRENTE = 572


def bancada(topo: Tela, frente: Tela) -> None:
    g = np.random.default_rng(80)
    Y, X = topo.Y, topo.X
    rgb = np.zeros((H, W, 3), np.float32)
    y = BANCADA
    veio = ruido(81, 26, 1, W, H)
    veio2 = ruido(82, 6, 1, W, H)
    sujo = ruido(83, 9, 5, W, H)
    while y < FRENTE:
        hh = int(g.integers(7, 11))
        k = g.random()
        base = mix("#d8a86e", "#bf8f56", k)
        sl = (Y >= y) & (Y < y + hh)
        tom = base[None, None, :] * (0.90 + 0.14 * veio[:, :, None]) * (0.95 + 0.07 * veio2[:, :, None])
        tom = np.where((veio2 > 0.8)[:, :, None], tom * 0.86, tom)
        rgb = np.where(sl[:, :, None], tom, rgb)
        rgb[min(y + hh - 1, H - 1)] *= 0.72  # junta da colagem
        rgb[y] *= 1.08
        y += hh
    rgb = np.where(((sujo > 0.7) & (Y >= BANCADA) & (Y < FRENTE))[:, :, None], rgb * 0.9, rgb)  # encardido do uso
    topo.masc(((Y >= BANCADA) & (Y < FRENTE)).astype(np.float32), rgb)
    topo.ret(0, BANCADA, W, 1, "#3a2414")
    topo.ret(0, FRENTE - 1, W, 1, "#f4cc94")
    for _ in range(26):  # marcas de uso: mossas, cortes de formão, riscos de lápis, pingos de cola
        x, yy = g.random() * W, BANCADA + 3 + g.random() * 54
        tipo = g.random()
        if tipo < 0.35:
            topo.elip(x, yy, 1.5 + g.random() * 1.5, 1, "#8a5e34", 0.55)
        elif tipo < 0.6:
            topo.linha(x, yy, x + 4 + g.random() * 8, yy + g.random() * 2 - 1, "#6a4424", 0.6)
        elif tipo < 0.82:
            topo.linha(x, yy, x + 8 + g.random() * 14, yy, "#5a5a62", 0.45)
        else:
            topo.elip(x, yy, 1.4, 1.1, "#d8962a", 0.85)
            topo.p(x - 0.5, yy - 0.5, "#ffe0a0")
    # frente: o avental da bancada com os furos de batente e a morsa
    n = ruido(84, 30, 2, W, H)
    tom = np.where(n[:, :, None] > 0.55, hexa("#84552f"), hexa("#744828"))
    frente.masc((Y >= FRENTE).astype(np.float32), tom)
    frente.ret(0, FRENTE, W, 2, "#a8744a")
    frente.ret(0, FRENTE + 2, W, 1, "#5a361c")
    for x in range(118, W, 46):
        frente.ret(x, 590, 7, 7, "#1e120a")
        frente.ret(x, 590, 7, 1, "#4a2c18")
        frente.ret(x + 6, 590, 1, 7, "#c08a5a")
    # morsa de madeira com o fuso de aço e a alavanca
    frente.ret(8, 566, 84, 46, "#b07848")
    frente.ret(8, 566, 84, 2, "#e0a870")
    frente.ret(8, 610, 84, 2, "#5a3618")
    frente.ret(90, 566, 2, 46, "#6a4222")
    for k in range(10, 88, 6):
        frente.p(8 + k, 580 + (k % 5), "#8a5a32", 0.7)
    frente.elip(50, 592, 8, 8, "#8a9096")
    frente.elip(50, 592, 6, 6, "#b8bec4")
    frente.elip(48, 590, 2, 2, "#eef4f8")
    frente.ret(14, 590, 72, 4, "#9aa0a6")
    frente.ret(14, 590, 72, 1, "#e8eef2")
    for xx in (12, 86):
        frente.elip(xx, 592, 3, 3, "#7a8086")
        frente.p(xx - 1, 591, "#eef4f8")


def maravalha(t: Tela, cx: float, cy: float, rx: float, ry: float, rot: float, larg: float, voltas: float, seed: int) -> None:
    """Uma apara de plaina enrolada: fita fina em espiral, clara no lado do sol e escura por dentro."""
    n = int(220 * voltas)
    for i in range(n):
        s = i / n
        a = s * voltas * 2 * math.pi
        r = 1 - 0.45 * s
        px, py = math.cos(a) * rx * r, math.sin(a) * ry * r
        x = cx + px * math.cos(rot) - py * math.sin(rot)
        y = cy + px * math.sin(rot) + py * math.cos(rot)
        frente_da_fita = math.sin(a) < 0
        for k in range(int(larg)):
            cor = ("#fff2d0" if k == 0 else "#f2d49c" if k == 1 else "#e0b878") if frente_da_fita else ("#d2a46a" if k < larg - 1 else "#a07444")
            t.p(x, y + k * 0.8, cor)
    t.p(cx + rx * 0.6 * math.cos(rot), cy - ry * 0.5, "#ffffff", 0.7)


def objetos(t: Tela, sombra: Tela) -> None:
    g = np.random.default_rng(90)
    # bloco de treino com uma mortalha aberta e o risco a lápis
    b = Tela(W, H)
    b.ret(38, 526, 52, 20, "#c89058")
    b.ret(38, 520, 52, 6, "#e8b478")
    b.ret(38, 520, 52, 1, "#ffd8a0")
    b.ret(89, 520, 1, 26, "#7a4a24")
    for k in range(40, 88, 4):
        b.p(k, 530 + (k % 3) * 3, "#a06e3e", 0.7)
    b.ret(54, 521, 18, 4, "#3a2210")  # o rasgo da mortalha
    b.ret(54, 521, 18, 1, "#1e1008")
    b.ret(71, 521, 1, 4, "#8a5a30")
    for x in range(50, 77, 2):
        b.p(x, 520, "#5a5a62", 0.6)
    t.colar(b, "#3a2210")
    # macete de faia
    m = Tela(W, H)
    m.ret(112, 524, 38, 24, "#c8945a")
    m.ret(112, 524, 38, 2, "#f0c484")
    m.ret(112, 546, 38, 2, "#7a4e28")
    m.ret(112, 524, 6, 24, "#b07a44")
    for r in (2, 4, 6, 8):
        for a in range(0, 360, 20):
            m.p(115 + r * 0.35 * math.cos(math.radians(a)), 536 + r * math.sin(math.radians(a)), "#8a5a30", 0.55)
    m.ret(150, 532, 58, 7, "#d8b47e")
    m.ret(150, 532, 58, 1, "#f6dcaa")
    m.ret(150, 538, 58, 1, "#8a6a40")
    t.colar(m, "#3a2210")
    # lápis de carpinteiro
    lp = Tela(W, H)
    lp.ret(20, 556, 66, 5, "#b8352a")
    lp.ret(20, 556, 66, 1, "#e8604a")
    lp.ret(20, 560, 66, 1, "#7a1e16")
    lp.poli([(20, 556), (8, 558), (8, 559), (20, 561)], "#e8c690")
    lp.ret(5, 558, 3, 2, "#3a3a42")
    lp.p(5, 558, "#9a9aa8")
    lp.ret(84, 556, 2, 5, "#e8c86a")
    t.colar(lp, "#3a1810")
    # régua de aço com as marcas
    rg = Tela(W, H)
    rg.ret(96, 558, 120, 6, "#c4cad0")
    rg.ret(96, 558, 120, 1, "#f4f8fa")
    rg.ret(96, 563, 120, 1, "#7a828a")
    for x in range(98, 214, 3):
        rg.ret(x, 558, 1, 2 if (x - 98) % 15 else 4, "#3a4048")
    t.colar(rg, "#2a3036")
    # maravalhas e serragem
    for i in range(30):
        cx = 230 + g.random() * 108
        cy = 526 + g.random() * 30
        maravalha(t, cx, cy, 7 + g.random() * 10, 4 + g.random() * 5, g.random() * math.pi, 3, 0.9 + g.random() * 1.1, i)
    for _ in range(420):
        x = 160 + g.normal(0, 70)
        yy = BANCADA + 4 + g.random() * 62
        if BANCADA < yy < FRENTE + 3:
            t.p(x, yy, "#f0d29a" if g.random() < 0.6 else "#c89a62", 0.7 + g.random() * 0.3)
    # sombras projetadas: o sol vem da direita, a sombra cai para a esquerda e para baixo
    al = t.c[:, :, 3].copy()
    sh = np.roll(np.roll(al, 3, 0), -5, 1) * ((t.Y >= BANCADA) & (t.Y < FRENTE))
    sombra.masc(np.clip(sh, 0, 1) * (al < 0.5), "#2a160a", 0.55)


# ───────────────────────────── Montagem com luz ─────────────────────────────
def mascara_sol() -> tuple[np.ndarray, np.ndarray]:
    """Feixes de sol pelos quatro vidros (no ar) e a mancha de sol na bancada, em pixels 3x."""
    hh, ww = H * ESC, W * ESC
    gy, gx = np.mgrid[0:hh, 0:ww].astype(np.float32) / ESC
    ar = np.zeros((hh, ww), np.float32)
    mancha = np.zeros((hh, ww), np.float32)
    for (a, b, c, d) in VIDROS:
        for yv in np.linspace(b, d, 8):
            t = gy - yv
            xw = gx + DIR_SOL * t
            dentro = (xw >= a) & (xw < c) & (t > 0)
            ar += dentro * np.exp(-t / 380) / 8
    no_topo = (gy >= BANCADA) & (gy < FRENTE)
    # a mancha: os vidros projetados no plano da bancada (cisalhados), com bordas macias
    for (a, b, c, d) in VIDROS:
        alt = BANCADA - b
        sx = DIR_SOL * alt * 1.0
        y0 = BANCADA + (b - 14) * 0.55
        y1 = BANCADA + (d - 14) * 0.55
        xa, xb = a - sx * 0.62, c - sx * 0.62
        m = (gx >= xa) & (gx < xb) & (gy >= y0) & (gy < y1) & no_topo
        mancha = np.maximum(mancha, m.astype(np.float32))
    return desfocar(ar, 9), desfocar(mancha, 10)


def poeira(img: np.ndarray, ar: np.ndarray) -> np.ndarray:
    g = np.random.default_rng(99)
    hh, ww = ar.shape
    for _ in range(900):
        x, y = int(g.random() * ww), int(g.random() * hh)
        k = ar[y, x]
        if k > 0.12 and g.random() < k * 1.6:
            r = 1 + (g.random() < 0.15)
            v = 0.35 + g.random() * 0.5
            img[max(0, y - r + 1):y + r, max(0, x - r + 1):x + r] += hexa("#fff0c8") * v * k * 2.2
    return img


def fundo() -> None:
    parede_t, vid, prat, topo, frente, obj, somb = (Tela(W, H) for _ in range(7))
    parede(parede_t)
    janela(parede_t, vid)
    prateleira(prat)
    ferramentas(prat)
    bancada(topo, frente)
    objetos(obj, somb)
    # sombra de contato da parede logo acima da bancada
    for k in range(1, 14):
        parede_t.c[BANCADA - k, :, :3] *= 0.55 + 0.035 * k

    img = np.zeros((H * ESC, W * ESC, 3), np.float32)
    img = sobre(img, desfocar_rgba(ampliar(parede_t.c), 1.0))
    img = sobre(img, desfocar_rgba(ampliar(prat.c), 0.6))
    img = sobre(img, ampliar(topo.c))
    img = sobre(img, ampliar(somb.c))
    img = sobre(img, ampliar(obj.c))
    img = sobre(img, desfocar_rgba(ampliar(frente.c), 1.4))

    ar, mancha = mascara_sol()
    gy, gx = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32) / ESC
    # luz: ambiente morno e baixo, o sol que bate na bancada e o rebatido quente vindo de baixo e da direita
    amb = hexa("#8e7a6c") * 0.86
    rebatido = np.exp(-(((gx - 300) / 220) ** 2 + ((gy - 560) / 120) ** 2))[:, :, None] * hexa("#ffb070") * 0.35
    perto_janela = np.exp(-(((gx - 292) / 120) ** 2 + ((gy - 70) / 90) ** 2))[:, :, None] * hexa("#ffd8a0") * 0.55
    luz = amb + rebatido + perto_janela + mancha[:, :, None] * hexa("#ffdcb0") * 0.62
    img = img * luz
    # o vidro aceso por cima e os feixes de sol no ar
    vv = ampliar(vid.c)
    vv[:, :, :3] = vv[:, :, :3] * 1.18
    img = sobre(img, desfocar_rgba(vv, 1.6))
    img = img + ar[:, :, None] * hexa("#ffcf8c") * 0.24
    img = poeira(img, ar)
    # bloom
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img - 0.7, 0, None) * np.clip((lum - 0.6) * 3, 0, 1)
    img = img + desfocar(claro, 8) * 0.6 + desfocar(claro, 28) * 0.55
    # correção de cor: altas luzes quentes, sombras frias
    q, f = hexa("#ffe2b0"), hexa("#4a5a78")
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.8 + 0.2 * (lum * q + (1 - lum) * (f * 0.6 + 0.4)))
    img = np.clip((img - 0.42) * 1.1 + 0.42, 0, 1.4)
    # o miolo (onde entra o conteúdo) mais calmo e a vinheta de diorama
    xs, ys = gx / W, gy / H
    miolo = np.clip(1 - np.abs(ys - 0.47) / 0.33, 0, 1)
    img *= (1 - 0.22 * miolo * miolo)[:, :, None]
    v = (xs - 0.55) ** 2 * 1.3 + (ys - 0.46) ** 2 * 1.1
    img *= (1 - np.clip(v - 0.06, 0, 1) * 1.05)[:, :, None]
    g = np.random.default_rng(7)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.022
    Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8)).save(SAIDA / "fundo.png", optimize=True)


# ───────────────────────────── Objetos soltos ─────────────────────────────
def salvar(t: Tela, nome: str, k: int, contorno: str | None = "#1e1410") -> None:
    if contorno:
        t.contorno(contorno)
    al = t.c[:, :, 3] > 0.01
    ys, xs = np.where(al)
    c = t.c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(np.clip(ampliar(c, k) * 255, 0, 255).astype(np.uint8), "RGBA").save(SAIDA / f"{nome}.png", optimize=True)


AÇO = ("#f6f9fb", "#dce2e7", "#bcc4cb", "#98a0a8", "#767e86", "#585f66")
LATAO = ("#fff2b8", "#f0cf78", "#d8a948", "#b47c2c", "#84521a", "#5a3410")


def paquimetro() -> None:
    t = Tela(220, 70)
    Y, X = t.Y, t.X
    # régua principal
    m = ((X >= 26) & (X < 214) & (Y >= 24) & (Y < 37)).astype(np.float32)
    faixa_tons(t, m, (Y - 24) / 13, AÇO[:5])
    for x in range(40, 210, 2):  # escala gravada
        alt = 5 if (x - 40) % 20 == 0 else 3 if (x - 40) % 10 == 0 else 2
        t.ret(x, 24, 1, alt, "#3a4048")
    t.ret(26, 34, 188, 1, "#e8eef2")
    # bico fixo (externo embaixo, interno em cima)
    t.poli([(14, 24), (34, 24), (34, 37), (30, 62), (24, 66), (20, 62), (14, 37)], AÇO[2])
    t.poli([(14, 24), (20, 24), (20, 62), (14, 37)], AÇO[1])
    t.poli([(28, 37), (34, 37), (30, 62), (26, 64)], AÇO[4])
    t.poli([(20, 24), (28, 24), (25, 8), (22, 6)], AÇO[2])
    t.linha(21, 22, 23, 8, AÇO[0])
    # cursor com a janela do nônio, o parafuso de trava e a roldana
    t.ret(74, 18, 46, 24, AÇO[2])
    t.ret(74, 18, 46, 2, AÇO[0])
    t.ret(74, 40, 46, 2, AÇO[5])
    t.ret(118, 18, 2, 24, AÇO[4])
    t.ret(80, 25, 34, 8, "#eef3f6")
    for x in range(82, 113, 3):
        t.ret(x, 25, 1, 3 if (x - 82) % 9 else 5, "#2e343a")
    t.ret(80, 32, 34, 1, AÇO[3])
    t.ret(100, 10, 9, 8, AÇO[3])  # parafuso de trava serrilhado
    for x in range(100, 109, 2):
        t.ret(x, 10, 1, 8, AÇO[1])
    t.ret(99, 9, 11, 1, AÇO[0])
    t.elip(86, 46, 5, 4, AÇO[3])
    for a in range(0, 360, 40):
        t.p(86 + 4 * math.cos(math.radians(a)), 46 + 3 * math.sin(math.radians(a)), AÇO[5])
    t.poli([(74, 42), (86, 42), (82, 62), (78, 66), (74, 62)], AÇO[2])
    t.poli([(74, 42), (78, 42), (78, 64), (74, 62)], AÇO[1])
    t.poli([(76, 18), (84, 18), (82, 6), (79, 4)], AÇO[2])
    # haste de profundidade e brilhos
    t.ret(214, 28, 6, 3, AÇO[2])
    brilho(t, 160, 27, 2)
    brilho(t, 90, 20, 2)
    salvar(t, "paquimetro", 4)


def transferidor() -> None:
    t = Tela(150, 84)
    cx, cy, R = 75, 78, 70
    d = np.hypot(t.X + 0.5 - cx, t.Y + 0.5 - cy)
    ang = np.degrees(np.arctan2(cy - t.Y - 0.5, t.X + 0.5 - cx))
    corpo = (d <= R) & (t.Y <= cy) & ~((d < 34) & (t.Y < cy - 6))
    luz = np.clip(0.5 - (t.X - cx) / (2.4 * R) + (t.Y - cy) / (3 * R) + 0.12 * np.sin(np.radians(ang) * 3), 0, 0.999)
    faixa_tons(t, corpo.astype(np.float32), 1 - luz, LATAO[:5])
    for a in range(0, 181, 5):  # graduação
        L = 10 if a % 30 == 0 else 7 if a % 10 == 0 else 4
        for r in range(R - L, R - 1):
            t.p(cx + r * math.cos(math.radians(a)), cy - r * math.sin(math.radians(a)), "#5a3410")
    for r in (R, 34):
        for a10 in range(0, 1801):
            a = a10 / 10
            t.p(cx + r * math.cos(math.radians(a)), cy - r * math.sin(math.radians(a)), "#4a2a0a" if r == R else "#7a4a18")
    t.ret(cx - R, cy - 6, 2 * R + 1, 6, LATAO[2])
    t.ret(cx - R, cy - 6, 2 * R + 1, 1, LATAO[0])
    t.ret(cx - R, cy - 1, 2 * R + 1, 1, LATAO[5])
    t.ret(cx - 1, cy - 9, 3, 9, "#5a3410")
    t.p(cx, cy - 4, "#fff6c8")
    for s in range(26):  # reflexo
        x, y = cx - 50 + s * 1.2, cy - 56 + s * 0.9
        if 36 < math.hypot(x - cx, y - cy) < R - 3:
            t.p(x, y, "#fffbe0", 0.6)
    brilho(t, cx - 40, cy - 46, 2)
    salvar(t, "transferidor", 4)


def esquadro() -> None:
    t = Tela(120, 92)
    m = ((t.X >= 4) & (t.X < 24) & (t.Y >= 4) & (t.Y < 88)).astype(np.float32)
    faixa_tons(t, m, (t.X - 4) / 20, ("#b8583a", "#94402a", "#78301e", "#5a2214"))
    for y in range(8, 86, 3):
        t.p(8 + (y % 7), y, "#5a2214", 0.7)
        t.p(14 + (y % 5), y + 1, "#c06a48", 0.5)
    t.ret(4, 4, 20, 3, LATAO[2])
    t.ret(4, 4, 20, 1, LATAO[0])
    for yy in (24, 48, 72):
        t.elip(14, yy, 2.5, 2.5, LATAO[3])
        t.p(13, yy - 1, LATAO[0])
    lam = ((t.X >= 24) & (t.X < 118) & (t.Y >= 6) & (t.Y < 20)).astype(np.float32)
    faixa_tons(t, lam, (t.Y - 6) / 14, AÇO[:5])
    for x in range(28, 116, 2):
        t.ret(x, 6, 1, 5 if (x - 28) % 20 == 0 else 3 if (x - 28) % 10 == 0 else 2, "#3a4048")
    brilho(t, 90, 9, 2)
    salvar(t, "esquadro", 4)


def lapis() -> None:
    t = Tela(140, 18)
    t.ret(22, 4, 116, 10, "#b8352a")
    t.ret(22, 4, 116, 2, "#e8604a")
    t.ret(22, 8, 116, 1, "#a02a20")
    t.ret(22, 12, 116, 2, "#7a1e16")
    t.poli([(22, 4), (8, 8), (8, 10), (22, 14)], "#ecc894")
    t.poli([(22, 10), (8, 9), (8, 10), (22, 14)], "#c49a62")
    t.ret(2, 8, 7, 2, "#3a3a44")
    t.ret(2, 8, 7, 1, "#9a9aaa")
    t.ret(132, 4, 6, 10, "#e8c86a")
    t.ret(132, 4, 6, 2, "#fff0a8")
    salvar(t, "lapis", 4)


def grampo() -> None:
    t = Tela(64, 118)
    t.ret(8, 4, 6, 110, AÇO[2])
    t.ret(8, 4, 2, 110, AÇO[0])
    t.ret(12, 4, 2, 110, AÇO[4])
    for (y, h) in ((4, 12), (74, 12)):
        t.ret(8, y, 44, h, "#14655e")
        t.ret(8, y, 44, 2, "#3aa094")
        t.ret(8, y + h - 2, 44, 2, "#0a3a36")
    t.ret(44, 16, 10, 4, "#2a2a2a")
    t.ret(40, 62, 18, 5, AÇO[3])
    t.ret(40, 62, 18, 1, AÇO[0])
    for y in range(67, 74, 2):
        t.ret(47, y, 4, 1, AÇO[1])
        t.ret(47, y + 1, 4, 1, AÇO[4])
    t.ret(42, 86, 14, 28, "#9a4a26")
    t.ret(42, 86, 4, 28, "#d07a44")
    t.ret(53, 86, 3, 28, "#5e2a12")
    for y in range(90, 112, 4):
        t.ret(42, y, 14, 1, "#7a3a1a")
    t.ret(41, 86, 16, 3, LATAO[2])
    salvar(t, "grampo", 3)


def encaixe() -> None:
    """Espiga e mortalha em isométrico: o montante desce com a espiga sobre o rasgo aberto na travessa."""
    t = Tela(420, 420)
    s = 2.0
    ox, oy = 180, 300

    def P(x, y, z):
        return (ox + (x - y) * 0.866 * s, oy + (x + y) * 0.5 * s - z * s)

    def face(pts3, tons, veio_dir, seed, anel=False):
        pts = [P(*p) for p in pts3]
        m = t.poli_m(pts)
        ys, xs = np.where(m > 0)
        if len(xs) == 0:
            return
        base = hexa(tons[1])
        n = ruido(seed, 1, 1, t.w, t.h)
        rgb = np.zeros((t.h, t.w, 3), np.float32) + base
        if veio_dir is not None:
            ux, uy = veio_dir
            proj = (t.X * -uy + t.Y * ux)
            ao_longo = (t.X * ux + t.Y * uy)
            onda = 1.6 * np.sin(ao_longo / 17 + seed) + 2.2 * ruido(seed + 1, 22, 22, t.w, t.h)
            listra = np.sin((proj + onda) * 0.95)
            fina = ruido(seed + 2, 1, 1, t.w, t.h)
            rgb = np.where((listra > 0.80)[:, :, None], hexa(tons[2]), rgb)
            rgb = np.where(((listra > 0.55) & (listra <= 0.80) & (fina > 0.5))[:, :, None], mix(tons[1], tons[2], 0.5), rgb)
            rgb = np.where((listra < -0.88)[:, :, None], hexa(tons[0]), rgb)
        if anel:
            cxa, cya = np.mean([p[0] for p in pts]), np.mean([p[1] for p in pts])
            r = np.hypot(t.X - cxa + 10, (t.Y - cya) * 1.4)
            rgb = np.where((np.sin(r * 1.1) > 0.6)[:, :, None], hexa(tons[2]), rgb)
        rgb = np.where((n > 0.93)[:, :, None], rgb * 0.92, rgb)
        t.masc(m, rgb)
        for i in range(len(pts)):  # arestas
            a, b = pts[i], pts[(i + 1) % len(pts)]
            t.linha(a[0], a[1], b[0], b[1], tons[3])

    TOPO = ("#f6cf96", "#e2b070", "#c08a50", "#6a4220")
    FRENTE_ = ("#d8a464", "#c48c50", "#a06a38", "#5a3418")
    LADO = ("#b07a44", "#9a6634", "#7a4c24", "#4a2a12")
    TOPO_C = ("#f0c890", "#d8a86a", "#b07a44", "#6a4220")
    # travessa com o rasgo (mortalha) no meio do topo: x 0..76, y 0..26, z 0..22
    X1, Y1, Z1 = 76, 26, 22
    mx0, mx1, my0, my1, prof = 26, 50, 7, 19, 18
    face([(0, Y1, 0), (X1, Y1, 0), (X1, Y1, Z1), (0, Y1, Z1)], FRENTE_, (1, 0.58), 201)
    face([(X1, 0, 0), (X1, Y1, 0), (X1, Y1, Z1), (X1, 0, Z1)], LADO, None, 202, anel=True)
    face([(0, 0, Z1), (X1, 0, Z1), (X1, Y1, Z1), (0, Y1, Z1)], TOPO, (1, 0.58), 203)
    # o rasgo: paredes internas visíveis (a de trás e a da esquerda) e o fundo escuro
    face([(mx0, my0, Z1), (mx1, my0, Z1), (mx1, my0, Z1 - prof), (mx0, my0, Z1 - prof)], ("#5a3418", "#4a2a12", "#3a200c", "#24140a"), None, 204)
    face([(mx0, my0, Z1), (mx0, my1, Z1), (mx0, my1, Z1 - prof), (mx0, my0, Z1 - prof)], ("#6a4220", "#5a3418", "#4a2a12", "#24140a"), None, 205)
    face([(mx0, my0, Z1 - prof), (mx1, my0, Z1 - prof), (mx1, my1, Z1 - prof), (mx0, my1, Z1 - prof)], ("#2a180c", "#22140a", "#1a0f08", "#120a04"), None, 206)
    # risco a lápis em volta do rasgo
    for (a, b) in (((mx0 - 2, my0 - 2), (mx1 + 2, my0 - 2)), ((mx1 + 2, my0 - 2), (mx1 + 2, my1 + 2)), ((mx1 + 2, my1 + 2), (mx0 - 2, my1 + 2)), ((mx0 - 2, my1 + 2), (mx0 - 2, my0 - 2))):
        pa, pb = P(a[0], a[1], Z1), P(b[0], b[1], Z1)
        t.linha(pa[0], pa[1], pb[0], pb[1], "#4a4a56", 0.55)
    # montante com a espiga, suspenso acima do rasgo
    gap = 22
    ex0, ex1, ey0, ey1 = mx0 + 1, mx1 - 1, my0 + 1, my1 - 1
    zb = Z1 + gap  # base da espiga
    ze = zb + prof  # ombro
    px0, px1, py0, py1 = mx0 - 8, mx1 + 8, 0, Y1
    ztopo = ze + 46
    # espiga
    face([(ex0, ey1, zb), (ex1, ey1, zb), (ex1, ey1, ze), (ex0, ey1, ze)], FRENTE_, (0, 1), 207)
    face([(ex1, ey0, zb), (ex1, ey1, zb), (ex1, ey1, ze), (ex1, ey0, ze)], LADO, (0, 1), 208)
    # ombro (a base do montante, vista por baixo não aparece) e o corpo do montante
    face([(px0, py1, ze), (px1, py1, ze), (px1, py1, ztopo), (px0, py1, ztopo)], FRENTE_, (0, 1), 209)
    face([(px1, py0, ze), (px1, py1, ze), (px1, py1, ztopo), (px1, py0, ztopo)], LADO, (0, 1), 210)
    face([(px0, py0, ztopo), (px1, py0, ztopo), (px1, py1, ztopo), (px0, py1, ztopo)], TOPO_C, None, 211, anel=True)
    # sombra da espiga no fundo do rasgo (ela ainda não entrou)
    sc = P((ex0 + ex1) / 2, (ey0 + ey1) / 2, Z1)
    t.elip(sc[0], sc[1] + 2, 9, 3, "#000000", 0.25)
    salvar(t, "encaixe", 4)


def etiqueta() -> None:
    """Etiqueta de papel kraft com ilhós de latão e o barbante."""
    w, h = 220, 300
    t = Tela(w, h + 40)
    pts = [(24, 40), (w - 24, 40), (w - 4, 62), (w - 4, h + 36), (4, h + 36), (4, 62)]
    m = t.poli_m(pts)
    fibra = ruido(300, 1, 3, t.w, t.h) * 0.5 + ruido(301, 3, 1, t.w, t.h) * 0.3 + ruido(302, 18, 18, t.w, t.h) * 0.2
    rgb = mix("#e6cc9c", "#cfae78", 0.0) * (0.92 + 0.14 * fibra[:, :, None])
    rgb = np.where((fibra > 0.68)[:, :, None], rgb * 0.94, rgb)
    t.masc(m, rgb)
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        t.linha(a[0], a[1], b[0], b[1], "#9a7a48")
    t.linha(25, 41, w - 25, 41, "#f6e2bc")
    # ilhós
    t.elip(w / 2, 62, 9, 9, LATAO[3])
    t.elip(w / 2, 62, 8, 8, LATAO[1])
    t.elip(w / 2 - 2, 60, 3, 3, LATAO[0])
    t.elip(w / 2, 62, 4.5, 4.5, "#3a2410")
    # barbante
    for k in range(90):
        x = w / 2 + 14 * math.sin(k / 15) + k * 0.25
        y = 62 - k * 0.7
        t.p(x, y, "#d8c8a8")
        t.p(x + 1, y, "#9a8a6a")
        if k % 4 == 0:
            t.p(x, y - 1, "#f0e4cc")
    salvar(t, "etiqueta", 4, contorno=None)


def maravalha_solta() -> None:
    t = Tela(70, 40)
    maravalha(t, 34, 18, 26, 12, 0.3, 3, 1.6, 1)
    salvar(t, "maravalha", 4)


if __name__ == "__main__":
    SAIDA.mkdir(exist_ok=True)
    for f in (paquimetro, transferidor, esquadro, lapis, grampo, encaixe, etiqueta, maravalha_solta, fundo):
        f()
        print("ok", f.__name__)
