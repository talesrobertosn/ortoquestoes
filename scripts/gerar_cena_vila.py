"""Cenários "HD-2D" das seções da página inicial: a torre do relógio, o baú do tesouro e o correio da vila
(30/10/2026, mesma técnica do acampamento em scripts/gerar_cena_inicio.py).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai
das funções abaixo. A cena é pintada em pixel art (480 x 160), camada por camada, e depois montada em 3x com a luz
calculada por pixel, como nos jogos "HD-2D":
- profundidade de campo: o fundo e o primeiro plano desfocados, o assunto nítido;
- materiais pintados "à luz do dia" e iluminados na montagem: ambiente da hora (multiplica) e luzes pontuais
  (lanternas, janelas, o ouro do baú) que somam, com uma camada de emissivos (vidro aceso, areia, chamas) por cima;
- feixes de luz, brilho (bloom), correção de cor quente nas altas luzes e fria nas sombras, vinheta e granulação.
A esquerda (cerca de 45% da largura) fica mais calma e escura de propósito: é onde o site põe o texto.

Gera em public/pixel/inicio/:
- secao-torre: a praça da vila ao entardecer, a torre do relógio, a ampulheta gigante e a estrada até o castelo
  da prova (a calculadora "Até a prova" e o cronograma);
- secao-bau: a caverna do tesouro com o baú aberto (os planos);
- secao-correio: o canto do correio da vila ao anoitecer (o programa de indicação).
Cada uma em .webp de 1440 x 480 e 960 x 320.
Uso: python3 scripts/gerar_cena_vila.py [torre|bau|correio]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"
W, H, ESC = 480, 160, 3


# ─────────────────────────────── Pincéis ───────────────────────────────
def hexa(c) -> np.ndarray:
    if not isinstance(c, str):
        return np.asarray(c, dtype=np.float32)
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def mistura(a, b, t: float) -> np.ndarray:
    return hexa(a) * (1 - t) + hexa(b) * t


def hash01(*v: int) -> float:
    """Número pseudoaleatório estável 0..1 para um pixel ou tijolo (a textura não muda entre execuções)."""
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
            na = a + base[3] * (1 - a)
            if na > 0:
                base[:3] = (rgb * a + base[:3] * base[3] * (1 - a)) / na
            base[3] = na

    def ret(self, x0, y0, w, h, cor, a: float = 1.0) -> None:
        x0, y0, w, h = int(round(x0)), int(round(y0)), int(round(w)), int(round(h))
        xa, xb, ya, yb = max(0, x0), min(W, x0 + w), max(0, y0), min(H, y0 + h)
        if xa >= xb or ya >= yb:
            return
        m = np.zeros((H, W), dtype=np.float32)
        m[ya:yb, xa:xb] = a
        self.mascara(m, cor)

    def mascara(self, m: np.ndarray, cor, a: float = 1.0) -> None:
        """Pinta a cor (ou um mapa de cores HxWx3) com a opacidade m (HxW, 0..1)."""
        am = np.clip(m * a, 0, 1)[:, :, None]
        rgb = hexa(cor) if isinstance(cor, str) or np.ndim(cor) == 1 else cor
        base_a = self.c[:, :, 3:4]
        na = am + base_a * (1 - am)
        seguro = np.maximum(na, 1e-6)
        self.c[:, :, :3] = np.where(na > 0, (rgb * am + self.c[:, :, :3] * base_a * (1 - am)) / seguro, self.c[:, :, :3])
        self.c[:, :, 3:4] = na

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0, grossura: int = 1) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / max(n, 1)
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for gx in range(grossura):
                for gy in range(grossura):
                    self.p(x + gx - grossura // 2, y + gy - grossura // 2, cor, a)

    def elipse(self, cx, cy, rx, ry, cor, a: float = 1.0) -> None:
        self.mascara(elipse_m(cx, cy, rx, ry), cor, a)

    def poligono(self, pts, cor, a: float = 1.0) -> None:
        self.mascara(poligono_m(pts), cor, a)

    def disco(self, cx, cy, r, cores, luz=(-0.6, -0.8), granulado: float = 0.55) -> None:
        """Disco com sombreamento em 3 tons, iluminado da direção `luz` (copas, pedras, moedas)."""
        lx, ly = luz
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                dx, dy = x - cx, y - cy
                if math.hypot(dx, dy) <= r:
                    k = (dx * lx + dy * ly) / max(r, 1) + (hash01(x, y, 7) - 0.5) * granulado
                    self.p(x, y, cores[0] if k > 0.38 else cores[1] if k > -0.2 else cores[2])


_YS, _XS = np.mgrid[0:H, 0:W].astype(np.float32)


def elipse_m(cx, cy, rx, ry) -> np.ndarray:
    return ((((_XS - cx) / max(rx, 0.01)) ** 2 + ((_YS - cy) / max(ry, 0.01)) ** 2) <= 1).astype(np.float32)


def poligono_m(pts) -> np.ndarray:
    """Máscara de um polígono (regra par-ímpar), no centro de cada pixel."""
    m = np.zeros((H, W), dtype=bool)
    px, py = _XS + 0.5, _YS + 0.5
    n = len(pts)
    for i in range(n):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % n]
        if y0 == y1:
            continue
        cruza = ((y0 <= py) & (py < y1)) | ((y1 <= py) & (py < y0))
        xc = x0 + (py - y0) * (x1 - x0) / (y1 - y0)
        m ^= cruza & (px < xc)
    return m.astype(np.float32)


def ruido(seed: int, ex: int, ey: int | None = None, w: int = W, h: int = H) -> np.ndarray:
    """Ruído suave 0..1 (valores aleatórios ampliados com interpolação); ex/ey dão o tamanho do grão."""
    ey = ey or ex
    g = np.random.default_rng(seed)
    pequeno = g.random((h // ey + 3, w // ex + 3)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize(((w // ex + 3) * ex, (h // ey + 3) * ey), Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32)[ey:ey + h, ex:ex + w] / 255, 0, 1)


def gradiente(paradas) -> np.ndarray:
    """Céu em faixas suaves: [(y, cor), ...]."""
    ys = np.array([p[0] for p in paradas], dtype=np.float32)
    cores = np.array([hexa(p[1]) for p in paradas])
    linha = np.stack([np.interp(np.arange(H), ys, cores[:, i]) for i in range(3)], 1).astype(np.float32)
    return np.repeat(linha[:, None, :], W, 1)


def brilho(c: Camada, x, y, tam: int, cor: str = "#fff6d0") -> None:
    """Estrelinha de 4 pontas (o cintilar do ouro, do vidro e das estrelas)."""
    c.p(x, y, "#ffffff")
    for k in range(1, tam + 1):
        a = 1 - (k - 1) / (tam + 0.5)
        for (dx, dy) in ((k, 0), (-k, 0), (0, k), (0, -k)):
            c.p(x + dx, y + dy, cor, a)
    if tam >= 2:
        for (dx, dy) in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            c.p(x + dx, y + dy, cor, 0.35)


def curva(pontos, passos: int = 200):
    """Catmull-Rom pelos pontos de controle (para a estrada)."""
    pts = [pontos[0]] + list(pontos) + [pontos[-1]]
    saida = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = (np.array(p, dtype=np.float32) for p in pts[i - 1:i + 3])
        for k in range(passos):
            t = k / passos
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
            saida.append((float(q[0]), float(q[1])))
    return saida


# ─────────────────────────────── Montagem com luz ───────────────────────────────
_GYS, _GXS = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)


def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def _caixa(arr: np.ndarray, r: int, eixo: int) -> np.ndarray:
    """Média móvel de largura 2r+1 ao longo de um eixo (bordas estendidas), por soma acumulada."""
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
    """Desfoque gaussiano aproximado por três caixas (aceita valores acima de 1, como as luzes)."""
    if raio <= 0:
        return arr
    r = max(1, int(round((math.sqrt(4 * raio * raio + 1) - 1) / 2)))
    out = arr.astype(np.float32)
    for _ in range(3):
        out = _caixa(_caixa(out, r, 0), r, 1)
    return out


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


def luz_pontual(cx: float, cy: float, raio: float, achatar: float = 1.0) -> np.ndarray:
    d2 = ((_GXS - cx * ESC) / (raio * ESC)) ** 2 + ((_GYS - cy * ESC) / (raio * ESC * achatar)) ** 2
    return np.exp(-d2 * 2.2)


def raios_radiais(mascara: np.ndarray, centro, passos: int = 56, alcance: float = 0.9, queda: float = 0.965) -> np.ndarray:
    """Feixes de luz: desfoque radial de uma máscara de luz em direção (ou a partir) de um centro."""
    hh, ww = mascara.shape
    sx, sy = centro[0] * ESC, centro[1] * ESC
    acum = np.zeros_like(mascara)
    peso = 1.0
    for i in range(passos):
        t = i / passos * alcance
        px = np.clip((_GXS + (sx - _GXS) * t).astype(np.int32), 0, ww - 1)
        py = np.clip((_GYS + (sy - _GYS) * t).astype(np.int32), 0, hh - 1)
        acum += mascara[py, px] * peso
        peso *= queda
    return acum / passos


class Montagem:
    """Junta as camadas em 3x: profundidade de campo, luz ambiente e pontual, emissivos e acabamento."""

    def __init__(self, ceu: np.ndarray) -> None:
        self.img = ampliar(ceu)
        self.solido = np.zeros(self.img.shape[:2], dtype=np.float32)
        self.recep = np.ones(self.img.shape[:2], dtype=np.float32)

    def camada(self, cam: Camada, desfoque: float = 0.0, escurecer: float = 1.0, solida: bool = True, luz_k: float = 1.0) -> None:
        """luz_k: quanto a camada recebe das luzes pontuais (o ouro já é claro de si, recebe menos para não estourar)."""
        arr = desfocar_rgba(ampliar(cam.c), desfoque)
        if escurecer != 1.0:
            arr = arr * np.array([escurecer, escurecer, escurecer, 1], dtype=np.float32)
        self.img = sobre(self.img, arr)
        if solida:
            self.solido = np.maximum(self.solido, arr[:, :, 3])
            self.recep = self.recep * (1 - arr[:, :, 3]) + luz_k * arr[:, :, 3]

    def iluminar(self, ambiente, luzes) -> None:
        """ambiente: cor (multiplica); luzes: [(cx, cy, raio, achatar, cor, força)] somadas, só no que não é céu."""
        soma = np.zeros_like(self.img)
        for (cx, cy, raio, achatar, cor, forca) in luzes:
            soma += luz_pontual(cx, cy, raio, achatar)[:, :, None] * hexa(cor) * forca
        luz = hexa(ambiente) + soma * self.recep[:, :, None]
        s = self.solido[:, :, None]
        self.img = self.img * (1 - s) + self.img * s * luz

    def emissivo(self, cam: Camada, desfoque: float = 0.0, halo: float = 0.0) -> None:
        arr = desfocar_rgba(ampliar(cam.c), desfoque)
        self.img = sobre(self.img, arr)
        if halo > 0:
            pm = arr[:, :, :3] * arr[:, :, 3:4]
            self.img += desfocar(pm, 7) * halo * 0.6 + desfocar(pm, 22) * halo * 0.5

    def somar(self, mapa: np.ndarray, cor, forca: float = 1.0) -> None:
        self.img = self.img + mapa[:, :, None] * hexa(cor) * forca

    def acabar(self, quente: str, fria: str, esquerda: float = 0.5, vinheta: float = 1.0, centro_v=(0.62, 0.55),
               contraste: float = 1.08, seed: int = 99) -> Image.Image:
        img = self.img
        xs, ys = _GXS / (W * ESC), _GYS / (H * ESC)
        # Brilho (bloom) das luzes fortes, em dois raios.
        lum = img.mean(2, keepdims=True)
        claro = np.clip(img - 0.62, 0, None) * np.clip((lum - 0.55) * 3, 0, 1)
        img = img + desfocar(claro, 6) * 0.55 + desfocar(claro, 20) * 0.6
        # Correção de cor: sombras frias, luzes quentes.
        q, f = hexa(quente), hexa(fria)
        lum = np.clip(img.mean(2, keepdims=True), 0, 1)
        img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (f * 0.5 + 0.5)))
        img = np.clip((img - 0.45) * contraste + 0.45, 0, 1.3)
        # A esquerda fica calma e mais escura (é onde entra o texto do site).
        t = np.clip(xs / 0.52, 0, 1)
        suave = t * t * (3 - 2 * t)
        img *= (1 - esquerda + esquerda * suave)[:, :, None]
        # Vinheta de diorama e granulação.
        v = (xs - centro_v[0]) ** 2 * 1.2 + (ys - centro_v[1]) ** 2 * 1.6
        img *= (1 - np.clip(v - 0.08, 0, 1) * 0.9 * vinheta)[:, :, None]
        g = np.random.default_rng(seed)
        img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.024
        return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


# ═══════════════════════════════ 1. A torre do relógio ═══════════════════════════════
# Algarismos romanos em 3 linhas de altura (I, V e X), para o mostrador.
GLIFOS = {
    "I": ["X", "X", "X"],
    "V": ["X.X", "X.X", ".X."],
    "X": ["X.X", ".X.", "X.X"],
}
ROMANOS = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"]


def escrever_romano(c: Camada, texto: str, cx: float, cy: float, cor: str) -> None:
    largura = sum(len(GLIFOS[l][0]) for l in texto) + len(texto) - 1
    x = round(cx - largura / 2)
    y0 = round(cy - 1.5)
    for l in texto:
        g = GLIFOS[l]
        for j, linha in enumerate(g):
            for i, ch in enumerate(linha):
                if ch == "X":
                    c.p(x + i, y0 + j, cor)
        x += len(g[0]) + 1


def parede_de_pedra(c: Camada, x0: int, x1: int, y0: int, y1: int, luz_esq: bool = True, seed: int = 0,
                    tons=("#ae96a4", "#87788e", "#625a76", "#433e5a"), alt: int = 4, larg: int = 9) -> None:
    """Cantaria em fiadas desencontradas, cada pedra com um tom, aresta clara em cima e rejunte escuro."""
    n = ruido(seed + 5, 3)
    musgo = ruido(seed + 6, 5)
    for y in range(max(0, y0), min(H, y1)):
        fi = (y - y0) // alt
        for x in range(max(0, x0), min(W, x1)):
            off = (fi % 2) * (larg // 2)
            col = (x - x0 + off) // larg
            emx, emy = (x - x0 + off) % larg, (y - y0) % alt
            t = (x - x0) / max(1, x1 - x0)
            sombra = t if luz_esq else 1 - t
            if emy == alt - 1 or emx == larg - 1:
                cor = mistura("#3a3048", "#241e30", sombra)
            else:
                k = hash01(fi, col, seed)
                base = 0.15 + sombra * 0.75 + (k - 0.5) * 0.35 + (n[y, x] - 0.5) * 0.25
                if emy == 0:
                    base -= 0.18
                if emx == 0:
                    base -= 0.08
                i = min(3, max(0, int(base * 3.2)))
                cor = hexa(tons[i])
                if musgo[y, x] > 0.68 and y > y0 + (y1 - y0) * 0.55:
                    cor = cor * 0.6 + hexa("#5a7a4a") * 0.4
            c.p(x, y, cor)


def torre(c: Camada, e: Camada, cx: int = 398, er: Camada | None = None) -> list:
    """A torre do relógio: telhado de telhas, campanário aberto com o sino, mostrador e porta. Devolve as luzes."""
    luzes = []
    er = er or e
    xa, xb, lado = cx - 22, cx + 22, 8  # face da frente e a face lateral (sombra)
    topo_corpo, base = 27, 142
    # Corpo em cantaria, com a face lateral na sombra.
    parede_de_pedra(c, xa, xb, topo_corpo, base, seed=3)
    parede_de_pedra(c, xb, xb + lado, topo_corpo, base, seed=4, tons=("#5e5474", "#4c4462", "#3c3652", "#2c283e"), larg=6)
    c.ret(xa, topo_corpo, 1, base - topo_corpo, "#f0c0b0")  # luz do poente na quina
    c.ret(xa + 1, topo_corpo, 1, base - topo_corpo, "#d8a4a8", 0.6)
    c.ret(xb, topo_corpo, 1, base - topo_corpo, "#2a2238")
    # Cornijas (faixas salientes) com sombra embaixo.
    for yc in (50, 96, 127):
        c.ret(xa - 2, yc, xb - xa + 4, 3, "#b8a0ac")
        c.ret(xa - 2, yc, xb - xa + 4, 1, "#f2d2c8")
        c.ret(xb + 2, yc, lado - 2, 3, "#4a425c")
        c.ret(xa - 2, yc + 3, xb - xa + lado + 2, 1, "#241e30", 0.8)
        for k in range(xa, xb, 4):
            c.p(k, yc + 2, "#7a6a80")
    # Base mais larga (embasamento).
    c.ret(xa - 3, 130, xb - xa + 6, 12, "#8a7a90")
    parede_de_pedra(c, xa - 3, xb + 3, 130, base, seed=8, alt=6, larg=12)
    parede_de_pedra(c, xb + 3, xb + lado + 1, 130, base, seed=9, tons=("#4c4462", "#3c3652", "#2c283e", "#221e30"), alt=6, larg=7)

    # ── Campanário: arco aberto, o sino de bronze iluminado por dentro.
    cb_y0, cb_y1 = 29, 49
    arco = poligono_m([(cx - 15, cb_y1), (cx - 15, cb_y0 + 9), (cx + 15, cb_y0 + 9), (cx + 15, cb_y1)])
    arco = np.maximum(arco, elipse_m(cx, cb_y0 + 9, 15, 9) * (_YS <= cb_y0 + 9))
    interior = np.zeros((H, W, 3), dtype=np.float32) + hexa("#3a2220")
    interior = interior + (1 - np.clip(np.abs(_XS - cx) / 16, 0, 1))[:, :, None] * hexa("#5a3020")
    c.mascara(arco, interior)
    for yy in range(cb_y0 + 1, cb_y1):  # moldura do arco (aduelas)
        for xx in range(cx - 17, cx + 18):
            if arco[yy, xx] == 0 and (arco[yy, min(W - 1, xx + 1)] or arco[yy, xx - 1] or arco[max(0, yy - 1), xx] if yy > 0 else 0):
                pass
    borda = (desfocar(arco[:, :, None], 0.8)[:, :, 0] > 0.05) & (arco == 0) & (_YS > cb_y0 - 2) & (_YS < cb_y1)
    c.mascara(borda.astype(np.float32), "#e6cdbf")
    # Viga e o sino.
    c.ret(cx - 14, cb_y0 + 5, 28, 2, "#4a2a18")
    c.ret(cx - 14, cb_y0 + 5, 28, 1, "#8a5a30")
    perfil = [2, 3, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 9, 9]
    by = cb_y0 + 7
    for j, m in enumerate(perfil):
        for dx in range(-m, m + 1):
            t = (dx + m) / (2 * m)
            cor = "#ffe29a" if t < 0.18 else "#e2a648" if t < 0.4 else "#b0702a" if t < 0.72 else "#6a3e18"
            if j == len(perfil) - 1:
                cor = "#5a3414" if t > 0.3 else "#c88a3a"
            if j == 9:
                cor = "#ffd88a" if t < 0.3 else "#8a5420"
            c.p(cx + dx, by + j, cor)
    c.p(cx - 3, by + 3, "#fff6d0")
    c.p(cx - 4, by + 5, "#fff2c0")
    c.ret(cx, by + len(perfil), 1, 2, "#3a2210")
    c.ret(cx - 1, by + len(perfil) + 2, 3, 1, "#5a3414")
    # Colunas laterais do campanário.
    c.ret(xa, cb_y0 - 2, 4, cb_y1 - cb_y0 + 2, "#c8b0b8")
    c.ret(xa, cb_y0 - 2, 1, cb_y1 - cb_y0 + 2, "#f6d0c4")
    c.ret(xb - 4, cb_y0 - 2, 4, cb_y1 - cb_y0 + 2, "#6a5e7a")
    luzes.append((cx, cb_y0 + 13, 26, 0.9, "#ffb860", 0.55))
    e.ret(cx - 6, cb_y1 - 2, 12, 1, "#ffcf80", 0.35)

    # ── Telhado de quatro águas em telhas, beiral de madeira com cachorros, pináculo e cata-vento.
    eave, apice = 27, 3
    for y in range(apice, eave + 1):
        t = (y - apice) / (eave - apice)
        meia = 3 + t * 30
        fila = (y - apice) // 3
        for x in range(int(cx - meia), int(cx + meia) + 1):
            dx = x - cx
            u = dx / max(meia, 1)
            off = (fila % 2) * 2
            em = (x + off) % 4
            emy = (y - apice) % 3
            if u < -0.05:
                tons = ("#e8846a", "#c4583e", "#8e3a2c")
            elif u < 0.45:
                tons = ("#b04c38", "#8c3a2e", "#5e2624")
            else:
                tons = ("#6e3030", "#542428", "#3c1a20")
            cor = tons[2] if emy == 2 else tons[0] if (emy == 0 and em in (1, 2)) else tons[1]
            if em == 3 and emy < 2:
                cor = tons[2]
            if abs(x - (cx - meia)) < 1:
                cor = "#ffc0a0"
            c.p(x, y, cor)
        c.p(cx, y, "#ffb898" if y % 2 else "#d0705a")
    c.ret(cx - 34, eave, 70, 2, "#5a3420")
    c.ret(cx - 34, eave, 70, 1, "#9a6438")
    for k in range(cx - 32, cx + 35, 5):
        c.ret(k, eave + 2, 2, 2, "#3a2014")
    c.ret(cx, 0, 1, apice + 1, "#c89040")
    c.disco(cx + 0.5, apice, 1.6, ("#ffe8a0", "#d09a40", "#7a5020"))

    # ── Mostrador do relógio: aro de ferro, moldura dourada, face acesa por trás, algarismos e ponteiros.
    my = 73
    c.ret(xa + 1, my - 22, 42, 44, "#a8929e")
    c.ret(xa + 1, my - 22, 42, 1, "#e8c8c0")
    for (qx, qy) in ((xa + 3, my - 20), (xb - 4, my - 20), (xa + 3, my + 19), (xb - 4, my + 19)):
        c.disco(qx + 0.5, qy + 0.5, 1.5, ("#ffe8a0", "#c8902e", "#6a4418"))
    for y in range(my - 21, my + 22):
        for x in range(cx - 21, cx + 22):
            d = math.hypot(x - cx, y - my)
            ang = math.atan2(y - my, x - cx)
            luz_aro = -math.cos(ang + math.pi * 0.75)
            if 19.4 <= d < 21:
                c.p(x, y, "#2a2030" if d >= 20.3 else "#4a3a4a")
            elif 17.0 <= d < 19.4:
                c.p(x, y, "#fff0a8" if luz_aro > 0.55 else "#e0b04c" if luz_aro > -0.1 else "#9a6a24" if luz_aro > -0.6 else "#6a4418")
                if (round(math.degrees(ang)) % 30) == 0 and d > 17.8:
                    c.p(x, y, "#fff8d0")
            elif d < 17.0:
                # Face de vidro leitoso acesa por trás: anel dos algarismos, aro fino e um sol raiado no centro.
                k = d / 17
                cor = mistura("#fbeccc", "#e2b878", k ** 2)
                if 9.0 <= d < 15.6:
                    cor = cor * 0.95
                if 15.6 <= d < 16.3:
                    cor = hexa("#6a4630")
                er.p(x, y, cor)
    for i in range(60):  # marcas dos minutos, por dentro do aro fino
        a = i / 60 * math.tau - math.pi / 2
        er.p(cx + math.cos(a) * 15.0, my + math.sin(a) * 15.0, "#8a6a50" if i % 5 else "#2a1a1a")
    for i, txt in enumerate(ROMANOS):
        a = i / 12 * math.tau - math.pi / 2
        larg = sum(len(GLIFOS[l][0]) for l in txt) + len(txt) - 1
        r = 13.9 - (abs(math.cos(a)) * larg / 2 + abs(math.sin(a)) * 1.5)
        escrever_romano(er, txt, cx + math.cos(a) * r, my + math.sin(a) * r, "#2e1a1c")
    # Ponteiros de ferro com pontas em lança: 10h10.
    for (ang_g, comp, gross) in ((305, 8.0, 2), (60, 13.0, 1)):
        a = math.radians(ang_g) - math.pi / 2
        ex, ey = cx + math.cos(a) * comp, my + math.sin(a) * comp
        er.linha(cx, my, ex - math.cos(a) * 1.5, ey - math.sin(a) * 1.5, "#1a1018", grossura=gross)
        px, py = -math.sin(a), math.cos(a)
        for t in range(4):
            for k in np.linspace(-1.6 + t * 0.45, 1.6 - t * 0.45, 5):
                er.p(ex - math.cos(a) * (3 - t) + px * k, ey - math.sin(a) * (3 - t) + py * k, "#1a1018")
        er.linha(cx, my, cx - math.cos(a) * 3.5, my - math.sin(a) * 3.5, "#1a1018")
        er.p(cx - math.cos(a) * 4, my - math.sin(a) * 4, "#c8902e")
    er.disco(cx + 0.5, my + 0.5, 1.6, ("#ffe8a0", "#c8902e", "#6a4418"))
    luzes.append((cx, my, 30, 1.0, "#ffd890", 0.28))

    # ── Janela seteira acesa, estandarte e a porta em arco entreaberta, com arandelas.
    for (jx, jy) in ((cx - 1, 104),):
        e.ret(jx - 2, jy, 5, 12, "#ffc070")
        e.ret(jx - 1, jy - 2, 3, 2, "#ffc070")
        e.ret(jx - 1, jy + 1, 1, 10, "#fff0c0")
        c.ret(jx - 3, jy - 3, 7, 1, "#e8d0c8")
        c.ret(jx - 3, jy + 12, 7, 1, "#3a3048")
        luzes.append((jx, jy + 6, 18, 1.4, "#ffb060", 0.35))
    # Estandarte vermelho com a ampulheta bordada.
    for (bx, by0) in ((xa + 5, 100),):
        for y in range(by0, by0 + 22):
            for x in range(bx, bx + 7):
                ponta = y - by0 > 18 and abs(x - bx - 3) < (y - by0 - 18)
                if not ponta:
                    c.p(x, y, "#c23a3a" if x - bx < 2 else "#9a2a30" if x - bx < 5 else "#6e1c26")
        c.ret(bx - 1, by0 - 1, 9, 1, "#d8a040")
        for (dx, dy) in ((1, 5), (2, 5), (3, 5), (4, 5), (5, 5), (2, 6), (3, 6), (4, 6), (3, 7), (3, 8), (2, 9), (3, 9), (4, 9),
                         (1, 10), (2, 10), (3, 10), (4, 10), (5, 10)):
            c.p(bx + dx, by0 + dy, "#f2c860")
    for (bx, by0) in ((xb - 12, 100),):
        for y in range(by0, by0 + 22):
            for x in range(bx, bx + 7):
                ponta = y - by0 > 18 and abs(x - bx - 3) < (y - by0 - 18)
                if not ponta:
                    c.p(x, y, "#8a2a36" if x - bx < 2 else "#6e1c28" if x - bx < 5 else "#4a1220")
        c.ret(bx - 1, by0 - 1, 9, 1, "#b08038")
        for (dx, dy) in ((1, 5), (5, 5), (2, 6), (4, 6), (3, 7), (3, 8), (2, 9), (4, 9), (1, 10), (5, 10)):
            c.p(bx + dx, by0 + dy, "#c89a48")
    # Porta.
    px0, py0 = cx - 8, 121
    porta = poligono_m([(px0, base), (px0, py0 + 6), (px0 + 16, py0 + 6), (px0 + 16, base)])
    porta = np.maximum(porta, elipse_m(cx, py0 + 6, 8, 6) * (_YS <= py0 + 6))
    c.mascara(porta, "#5a3420")
    for k in range(px0, px0 + 17, 4):
        c.ret(k, py0, 1, base - py0, "#3a2010")
    for yb in (py0 + 9, py0 + 16):
        c.ret(px0, yb, 17, 1, "#2a2a34")
        for k in range(px0 + 1, px0 + 16, 3):
            c.p(k, yb, "#9a9aa8")
    e.ret(cx + 4, py0 + 5, 3, base - py0 - 5, "#ffbf6a")  # fresta de luz da porta entreaberta
    e.ret(cx + 4, py0 + 7, 1, base - py0 - 9, "#fff0c0")
    luzes.append((cx + 5, base, 30, 0.6, "#ffaa50", 0.6))
    contorno = (desfocar(porta[:, :, None], 0.8)[:, :, 0] > 0.05) & (porta == 0) & (_YS < base) & (_YS > py0 - 3)
    c.mascara(contorno.astype(np.float32), "#d8c0b8")
    for (sx_, lado_) in ((px0 - 6, -1), (px0 + 22, 1)):
        c.ret(sx_, py0 + 4, 4, 1, "#2a2030")
        c.ret(sx_, py0 - 3, 4, 7, "#2a2030")
        e.ret(sx_ + 1, py0 - 2, 2, 5, "#ffd890")
        e.p(sx_ + 1, py0 - 1, "#ffffff")
        luzes.append((sx_ + 2, py0, 16, 1.0, "#ffb060", 0.55))
    # Degraus.
    c.ret(px0 - 4, base, 25, 2, "#a8969c")
    c.ret(px0 - 4, base, 25, 1, "#e0c8c4")
    c.ret(px0 - 7, base + 2, 31, 2, "#8a7a84")
    c.ret(px0 - 7, base + 2, 31, 1, "#c8b4b4")
    # Hera subindo pela quina iluminada.
    g = np.random.default_rng(12)
    for k in range(70):
        y = base - g.random() * 55 * g.random()
        x = xa - 1 + g.random() * 6 * (1 - (base - y) / 60)
        c.p(x, y, ["#5a8a4a", "#3e6a3a", "#7aa85a"][k % 3])
    return luzes


def ampulheta(c: Camada, e: Camada, cx: int, base: int) -> list:
    """A ampulheta gigante decorativa: tampas de madeira com friso de ouro, colunas torneadas, vidro e areia acesa."""
    topo = base - 52
    vy0, vy1 = topo + 7, base - 7
    meio = (vy0 + vy1) / 2
    meia_alt = (vy1 - vy0) / 2
    # Pedestal de pedra.
    c.ret(cx - 19, base, 39, 3, "#7a6c78")
    c.ret(cx - 19, base, 39, 1, "#c8b4b0")
    c.ret(cx - 17, base + 3, 35, 3, "#56485a")
    c.ret(cx - 17, base + 3, 35, 1, "#8a7a84")
    # Coluna de trás (vista através do vidro).
    c.ret(cx - 1, vy0, 3, vy1 - vy0, "#4a2a18")

    def largura(y):
        u = abs(y - meio) / meia_alt
        w = 1.2 + 10.5 * u ** 0.6
        if u > 0.8:
            w *= 1 - (u - 0.8) * 1.4
        return w

    areia_topo = meio - 9
    for y in range(vy0, vy1):
        w = largura(y + 0.5)
        for x in range(int(cx - w - 1), int(cx + w + 2)):
            dx = x - cx
            if abs(dx) > w:
                continue
            if y < meio and y >= areia_topo + max(0.0, 3.2 - abs(dx) * 0.55):  # areia de cima, afundando em funil
                cor = "#f6c050" if dx < -2 else "#e0a03a" if dx < 3 else "#b8742a"
                e.p(x, y, "#fff0b0" if hash01(x, y, 3) > 0.9 else cor)
                continue
            monte = vy1 - 15 + abs(dx) * 1.05  # areia de baixo, um monte
            if y > meio and y >= min(monte, vy1 - 5):
                cor = "#f8c858" if dx < -2 else "#e0a03a" if dx < 4 else "#b06c26"
                if y >= vy1 - 3:
                    cor = "#9a5a20"
                e.p(x, y, "#fff0b0" if hash01(x, y, 4) > 0.88 else cor)
                continue
            c.p(x, y, "#8aa8e0", 0.2)
            if abs(dx) > w - 1:
                c.p(x, y, "#e0eeff", 0.6)
    for y in range(vy0 + 2, vy1 - 2):  # reflexos do vidro
        w = largura(y + 0.5)
        if abs(y - meio) > 4:
            c.p(cx - w + 2, y, "#ffffff", 0.8)
            if 8 < abs(y - meio) < meia_alt - 3:
                c.p(cx - w + 3, y, "#ffffff", 0.4)
            c.p(cx + w - 2, y, "#b8d0ff", 0.35)
    e.ret(cx, meio - 1, 1, vy1 - 15 - meio + 2, "#fff2a8")  # o fio de areia caindo
    e.p(cx, vy1 - 15, "#ffffff")

    def tampa(y, baixo):
        # chapa principal
        c.ret(cx - 18, y, 37, 4, "#5a3420")
        c.ret(cx - 18, y, 37, 1, "#b07a44")
        c.ret(cx - 18, y + 3, 37, 1, "#2e1a10")
        c.ret(cx - 16, y + 1, 33, 1, "#f0c050")
        c.ret(cx - 16, y + 2, 33, 1, "#9a6a20")
        for k in range(cx - 14, cx + 15, 4):
            c.p(k, y + 1, "#fff4b0")
        # moldura menor junto ao vidro
        ym = y - 2 if baixo else y + 4
        c.ret(cx - 14, ym, 29, 2, "#7a4a2a")
        c.ret(cx - 14, ym, 29, 1, "#c08a50" if baixo else "#7a4a2a")
        c.ret(cx - 14, ym + 1, 29, 1, "#4a2a18" if baixo else "#3a2014")
        for kx in (cx - 19, cx + 19):
            c.disco(kx, y + 1.5, 2.4, ("#ffe8a0", "#d09a40", "#6a4418"))
        # remate no centro (botão dourado)
        yb = y - 2 if not baixo else y + 4
        if not baixo:
            c.disco(cx + 0.5, y - 1.5, 2.2, ("#ffe8a0", "#d09a40", "#6a4418"))
    tampa(topo, False)
    tampa(vy1 + 1, True)
    # Colunas torneadas na frente (espiral de luz e sombra).
    for kx in (cx - 15, cx + 15):
        for y in range(vy0 - 1, vy1 + 1):
            fase = (y + (0 if kx < cx else 2)) % 4
            c.p(kx - 1, y, "#d89a58" if fase < 2 else "#8a5a30")
            c.p(kx, y, "#a06a38" if fase in (1, 2) else "#6a4022")
            c.p(kx + 1, y, "#4a2a18" if fase != 1 else "#6a4022")
        for yy in (vy0 + 3, meio, vy1 - 3):
            c.disco(kx, yy, 1.8, ("#ffe8a0", "#d09a40", "#6a4418"))
    # Faíscas de areia subindo.
    g = np.random.default_rng(77)
    for _ in range(18):
        x, y = cx + g.normal(0, 11), topo - g.random() * 26 + 10
        e.p(x, y, "#ffe08a", 0.35 + g.random() * 0.6)
    brilho(e, cx - 8, vy0 + 4, 2)
    brilho(e, cx + 7, vy1 - 6, 1)
    return [(cx, meio + 10, 46, 0.8, "#ffb848", 0.4), (cx, vy1 - 8, 14, 1.0, "#ffd070", 0.2)]


def lampiao(c: Camada, e: Camada, x: float, yb: float, s: float, luzes: list) -> None:
    """Poste de lampião em escala s (perspectiva da estrada); acende o vidro e registra a luz."""
    alt = max(3, round(30 * s))
    if s < 0.22:
        c.ret(x, yb - alt, 1, alt, "#2a2030")
        e.p(x, yb - alt - 1, "#ffe0a0")
        e.p(x, yb - alt, "#ffb860", 0.7)
        luzes.append((x, yb - alt, 8, 1.0, "#ffb060", 0.35))
        return
    gr = max(1, round(2 * s))
    c.ret(x, yb - alt, gr, alt, "#2a2232")
    c.ret(x, yb - alt, 1, alt, "#5a4a5a")
    c.ret(x - gr, yb - 2, gr * 3, 2, "#2a2232")
    lw, lh = max(3, round(7 * s)), max(4, round(9 * s))
    lx, ly = x + gr / 2 - lw / 2, yb - alt - lh
    c.ret(lx - 1, ly - 1, lw + 2, 1, "#2a2232")
    c.ret(lx, ly - 2, lw, 1, "#2a2232")
    c.ret(lx + lw // 2, ly - 3, 1, 1, "#2a2232")
    e.ret(lx, ly, lw, lh, "#ffcf70")
    e.ret(lx + 1, ly + 1, max(1, lw - 2), max(1, lh - 2), "#fff0c0")
    if lw >= 5:
        c.ret(lx + lw // 2, ly, 1, lh, "#3a2a2a", 0.6)
    c.ret(lx - 1, ly + lh, lw + 2, 1, "#2a2232")
    luzes.append((x, ly + lh / 2, 12 + 30 * s, 0.85, "#ffb058", 0.25 + 0.2 * s))


def casa(c: Camada, e: Camada, x0: int, x1: int, base: int, parede_topo: int, cumeeira: int, luzes: list, seed: int,
         chamine: bool = True, tons_telhado=("#6a4a6a", "#4e3654", "#36243e"), janelas=(0.22, 0.62)) -> None:
    """Casinha em enxaimel com empena de frente, janelas acesas, floreira e chaminé."""
    cx = (x0 + x1) / 2
    # Parede de reboco com madeiramento.
    for y in range(parede_topo, base):
        for x in range(x0, x1):
            t = (x - x0) / (x1 - x0)
            k = hash01(x, y, seed) * 0.12
            c.p(x, y, mistura("#cdb89e", "#7a6c7c", min(1, t * 0.9 + k)))
    for x in range(x0, x1, 9):
        c.ret(x, parede_topo, 2, base - parede_topo, "#5a3a26")
    c.ret(x0, parede_topo, x1 - x0, 2, "#5a3a26")
    c.ret(x0, (parede_topo + base) // 2, x1 - x0, 2, "#5a3a26")
    for x in range(x0, x1 - 9, 18):
        c.linha(x + 1, (parede_topo + base) // 2 - 1, x + 9, parede_topo + 2, "#5a3a26")
    # Empena: triângulo de reboco e o telhado inclinado por cima.
    for y in range(cumeeira, parede_topo):
        t = (y - cumeeira) / (parede_topo - cumeeira)
        meia = t * (x1 - x0) / 2
        for x in range(int(cx - meia), int(cx + meia) + 1):
            c.p(x, y, mistura("#bca88e", "#6e6070", (x - x0) / (x1 - x0)))
    c.ret(cx - 1, cumeeira + 3, 2, parede_topo - cumeeira - 3, "#5a3a26")
    for y in range(cumeeira - 3, parede_topo + 3):
        t = (y - cumeeira + 3) / (parede_topo - cumeeira + 6)
        meia = t * (x1 - x0) / 2 + 5
        for lado in (-1, 1):
            for k in range(5):
                x = cx + lado * (meia - k)
                tom = tons_telhado[0] if lado < 0 else tons_telhado[1]
                if (y + k) % 3 == 0:
                    tom = tons_telhado[2]
                c.p(x, y, tom)
    # Janelas acesas com caixilho em cruz, venezianas e floreira.
    jy = parede_topo + 6
    for jx in (int(x0 + (x1 - x0) * f) for f in janelas):
        c.ret(jx - 4, jy - 1, 2, 11, "#3e6a5a")
        c.ret(jx + 7, jy - 1, 2, 11, "#2e5244")
        e.ret(jx - 2, jy, 9, 9, "#ffc068")
        e.ret(jx - 1, jy + 1, 3, 3, "#fff0c8")
        c.ret(jx + 2, jy, 1, 9, "#4a2c1c")
        c.ret(jx - 2, jy + 4, 9, 1, "#4a2c1c")
        c.ret(jx - 3, jy + 9, 11, 2, "#7a4a2a")
        for k in range(10):
            c.p(jx - 3 + k, jy + 8 - (k % 2), ["#f4a7c4", "#ffe07a", "#f07a6a", "#c8a8f8"][k % 4])
            c.p(jx - 3 + k, jy + 9 - (k % 2), "#4a7a3a")
        luzes.append((jx + 2, jy + 10, 18, 0.9, "#ffaa50", 0.45))
    if chamine:
        chx = int(cx + (x1 - x0) * 0.22)
        c.ret(chx, cumeeira + 2, 5, 9, "#7a5a5a")
        c.ret(chx, cumeeira + 2, 1, 9, "#b08a80")
        c.ret(chx - 1, cumeeira + 1, 7, 2, "#4a3438")


def fumaca(c: Camada, x: float, y: float, seed: int) -> None:
    g = np.random.default_rng(seed)
    for k in range(26):
        t = k / 26
        c.disco(x + math.sin(t * 5 + seed) * 4 * t + t * 10, y - t * 34, 1.5 + t * 4, ("#a89ab8", "#8a7ca0", "#6e6488"))
    c.c[:, :, 3] *= 0.32


def cena_torre() -> Image.Image:
    luzes: list = []
    ceu = gradiente([(0, "#090c26"), (28, "#1a1d4c"), (58, "#43306a"), (80, "#9a4c70"), (94, "#e07c64"),
                     (104, "#ffb070"), (116, "#ffd49a"), (160, "#ffd49a")])
    # Brilho do poente atrás das colinas.
    d = np.hypot((_XS - 268) / 150, (_YS - 108) / 40)
    ceu += np.exp(-d * d * 1.5)[:, :, None] * hexa("#ff9a6a") * 0.35
    # Nuvens finas em faixas, acesas por baixo.
    nv = ruido(11, 46, 4) * 0.7 + ruido(12, 12, 2) * 0.3
    for y in range(40, 98):
        for x in range(W):
            v = nv[y, x] - 0.56 - abs(y - 74) / 90
            if v > 0:
                k = min(1, v * 7) * 0.85
                t = (y - 40) / 58
                cor = mistura("#4a3070", "#e88a80", t)
                if nv[min(H - 1, y + 2), x] - 0.56 - abs(y + 2 - 74) / 90 < 0:
                    cor = mistura("#d8708a", "#ffd0a0", t)
                ceu[y, x] = ceu[y, x] * (1 - k) + cor * k
    # Estrelas (mais no alto) e a lua crescente perto da divisa do texto.
    g = np.random.default_rng(5)
    for _ in range(170):
        x, y = int(g.random() * W), int(g.random() ** 1.7 * 70)
        b = (0.3 + g.random() * 0.7) * (1 - y / 80)
        ceu[y, x] = np.minimum(1, ceu[y, x] + b)
        if b > 0.8:
            for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if 0 <= x + dx < W and 0 <= y + dy < H:
                    ceu[y + dy, x + dx] = np.minimum(1, ceu[y + dy, x + dx] + b * 0.35)
    # Aura dourada atrás do castelo da prova (o destino da estrada).
    ceu += np.exp(-(((_XS - 286) / 26) ** 2 + ((_YS - 66) / 22) ** 2))[:, :, None] * hexa("#ffcf80") * 0.22
    mx, my = 246, 22
    ceu += np.exp(-((_XS - mx) ** 2 + (_YS - my) ** 2) / 140)[:, :, None] * hexa("#b8a8ff") * 0.25
    for y in range(my - 8, my + 9):
        for x in range(mx - 8, mx + 9):
            if math.hypot(x - mx, y - my) < 6.5 and math.hypot(x - mx - 3, y - my + 2) > 5.2:
                ceu[y, x] = hexa("#fff4d8") if math.hypot(x - mx, y - my) < 5.5 else hexa("#e8d8c0")

    # ── Montanhas ao longe (enevoadas).
    longe = Camada()
    xs = np.arange(W)
    crista = 86 + 6 * np.sin(xs / 37) + 4 * np.sin(xs / 13 + 1) + ruido(14, 6)[0] * 4 - 10 * np.exp(-((xs - 150) / 60) ** 2)
    for x in range(W):
        for y in range(int(crista[x]), H):
            t = min(1, (y - crista[x]) / 30)
            cor = mistura("#9a6a96", "#5e4a7a", t)
            if y - crista[x] < 1.5 and (crista[max(0, x - 1)] > crista[x]):
                cor = hexa("#e0a0a8")
            longe.p(x, y, cor)
    # ── A colina do castelo e as colinas do meio, com aldeias e bosques.
    meio_c = Camada()
    colina = 102 + 3 * np.sin(xs / 23) + 2 * np.sin(xs / 7) - 30 * np.exp(-((xs - 286) / 30) ** 2) - 8 * np.exp(-((xs - 90) / 50) ** 2)
    n = ruido(15, 5)
    for x in range(W):
        for y in range(int(colina[x]), H):
            t = min(1, (y - colina[x]) / 20)
            base_c = mistura("#5a4a7a", "#3a3058", t)
            if n[y, x] > 0.62:
                base_c = base_c * 0.85
            if y - colina[x] < 1:
                base_c = mistura("#c08aa0", "#5a4a7a", 0.3 if x < 290 else 0.8)
            meio_c.p(x, y, base_c)
    # Pinheirinhos na crista.
    g = np.random.default_rng(16)
    for _ in range(90):
        x = int(g.random() * W)
        if 262 < x < 312:
            continue
        y0 = colina[x] + 2 + g.random() * 6
        alt = 3 + int(g.random() * 5)
        for j in range(alt):
            meia = j // 2
            for dx in range(-meia, meia + 1):
                meio_c.p(x + dx, y0 - alt + j, "#2e2648" if dx >= 0 else "#46386a")
    # O castelo da prova no alto da colina.
    kx, kb = 286, int(colina[286]) + 3
    # Muralha com ameias, torres de telhado cônico, a torre de menagem e janelinhas acesas.
    meio_c.ret(kx - 15, kb - 8, 31, 9, "#5a4a72")
    meio_c.ret(kx - 15, kb - 8, 2, 9, "#a87a98")
    meio_c.ret(kx + 10, kb - 8, 6, 9, "#3e3258")
    for k in range(kx - 15, kx + 16, 2):
        meio_c.p(k, kb - 9, "#5a4a72")
    for (tx, larg, alt) in ((kx - 14, 5, 15), (kx - 4, 8, 24), (kx + 7, 5, 13), (kx + 13, 4, 10)):
        meio_c.ret(tx, kb - alt, larg, alt, "#544470")
        meio_c.ret(tx + larg - 2, kb - alt, 2, alt, "#3a2e56")
        meio_c.ret(tx, kb - alt, 1, alt, "#d89aa8")
        for k in range(larg // 2 + 3):
            meio_c.ret(tx - 1 + k, kb - alt - (larg // 2 + 2 - k) - 1, larg + 2 - 2 * k, 1, "#2a2448" if k > (larg // 2) else "#3a3060")
            meio_c.p(tx - 1 + k, kb - alt - (larg // 2 + 2 - k) - 1, "#b07a90")
    meio_c.ret(kx - 1, kb - 5, 3, 5, "#1e1830")
    meio_c.ret(kx, kb - 37, 1, 7, "#2a2238")
    meio_c.ret(kx + 1, kb - 37, 5, 2, "#e04a3a")
    meio_c.ret(kx + 1, kb - 35, 3, 1, "#a02a2a")
    e_longe = Camada()
    for (wx, wy) in ((kx - 1, kb - 19), (kx + 1, kb - 19), (kx, kb - 13), (kx - 12, kb - 11), (kx + 9, kb - 9), (kx - 7, kb - 4),
                     (kx + 5, kb - 4), (kx + 14, kb - 6)):
        e_longe.p(wx, wy, "#ffd070")
    e_longe.ret(kx - 1, kb - 3, 3, 3, "#ffb050", 0.8)
    luzes.append((kx, kb - 10, 14, 1.0, "#ffb060", 0.4))
    # Caminho em zigue-zague subindo a colina até o portão.
    for (a, b) in (((270, 104), (291, 96)), ((291, 96), (276, 90)), ((276, 90), (287, kb - 1))):
        meio_c.linha(a[0], a[1], b[0], b[1], "#9a7a8a")
    # Luzinhas de sítios nas colinas (à direita da área do texto).
    for (wx, wy) in ((214, 104), (232, 108), (330, 103), (352, 106), (186, 106)):
        e_longe.p(wx, wy, "#ffc060", 0.85)

    # ── Campo: lavouras em retalhos, a estrada sinuosa e o gramado da praça.
    campo = Camada()
    n1, n2 = ruido(21, 9), ruido(22, 3)
    for y in range(100, H):
        prof = (y - 100) / 60
        for x in range(W):
            linha_campo = colina[x] + 4
            if y < linha_campo:
                continue
            cel = (int((x + y * 2.1) / (16 + prof * 40)), int(y / (4 + prof * 12)))
            k = hash01(cel[0], cel[1], 9)
            tons = [("#5e7a4c", "#4a6640"), ("#7a7a46", "#646436"), ("#4a6e50", "#3a5a42"), ("#6a8a52", "#567446")][int(k * 4)]
            v = n1[y, x] * 0.7 + n2[y, x] * 0.3
            cor = hexa(tons[0] if v > 0.5 else tons[1])
            if prof > 0.45:  # perto: grama da praça
                cor = hexa("#5e8a48" if v > 0.6 else "#4c7a3e" if v > 0.42 else "#3e6834")
            elif (x + int(y * 2.1)) % int(16 + prof * 40) == 0:  # cercas vivas entre os retalhos
                cor = hexa("#2e4430")
            campo.p(x, y, cor)
    # Árvores redondas espalhadas pelos campos.
    g = np.random.default_rng(23)
    for _ in range(46):
        x = g.random() * W
        y = 104 + g.random() * 16
        if 300 < x < 480 and y > 110:
            continue
        r = 1.5 + (y - 100) * 0.12
        campo.disco(x, y - r, r, ("#5e7a50", "#3e5a40", "#283c30"))
    # Estrada sinuosa: do primeiro plano até o pé da colina do castelo.
    estrada = curva([(268, 104), (282, 108), (246, 116), (296, 126), (256, 141), (280, 163)], 120)
    for i, (x, y) in enumerate(estrada[::-1]):
        larg = 1.0 + (y - 100) * 0.42
        for dx in range(int(-larg - 1), int(larg + 2)):
            for dy in (0, 1):
                px, py = x + dx, y + dy
                u = abs(dx) / max(larg, 0.5)
                if u > 1:
                    continue
                k = hash01(int(px), int(py), 31)
                cor = mistura("#c8a070", "#9a7650", k * 0.8 + u * 0.5)
                if larg > 6 and 0.28 < u < 0.42:
                    cor = mistura("#8a6644", "#6e5034", k)
                if u > 0.86:
                    cor = mistura("#7a6040", "#506038", k)
                campo.p(px, py, cor)
    g = np.random.default_rng(32)
    for (x, y) in estrada[200::7]:  # pedrinhas na terra
        larg = 1.0 + (y - 100) * 0.42
        if larg > 4:
            px = x + (g.random() - 0.5) * larg * 1.6
            campo.p(px, y + g.random() * 2, "#e0c8a0")
            campo.p(px + 1, y + 1 + g.random() * 2, "#6a5038")
    # Lampiões ao longo da estrada, alternando os lados.
    objetos = Camada()
    emiss = Camada()
    for i, frac in enumerate((0.1, 0.24, 0.4, 0.58, 0.77)):
        j = int(frac * (len(estrada) - 1))
        x, y = estrada[j]
        larg = 1.0 + (y - 100) * 0.42
        lado = -1 if i % 2 else 1
        s = (y - 98) / 62
        lampiao(objetos, emiss, x + lado * (larg + 2 + 3 * s), y + 1, s, luzes)

    # ── A praça de paralelepípedos na frente da torre.
    praca = ((_XS - 410) / 130) ** 2 + ((_YS - 168) / 30) ** 2 < 1
    paralelos = Camada()
    for y in range(126, H):
        prof = (y - 120) / 40
        alt = 2 + int(prof * 3)
        fi = (y - 126) // alt
        larg = 4 + int(prof * 5)
        for x in range(280, W):
            if not praca[y, x]:
                continue
            off = (fi % 2) * (larg // 2)
            emx, emy = (x + off) % larg, (y - 126) % alt
            k = hash01((x + off) // larg, fi, 41)
            if emx == larg - 1 or emy == alt - 1:
                cor = "#3a3040"
            elif emy == 0 or emx == 0:
                cor = "#c0aeb0" if k > 0.3 else "#a8969c"
            else:
                cor = ["#8a7a84", "#9a8890", "#7a6c78", "#a69498"][int(k * 4)]
            paralelos.p(x, y, cor)
    borda_praca = praca & ~(np.roll(praca, 2, 0) & np.roll(praca, -2, 1) & np.roll(praca, 2, 1))
    paralelos.mascara(borda_praca.astype(np.float32) * (_YS > 126), "#5a4a50")

    # ── Casas, torre, ampulheta e canteiros.
    predios = Camada()
    emiss_p = Camada()
    emiss_rel = Camada()
    emiss_amp = Camada()
    casa(predios, emiss_p, 434, 492, 140, 104, 80, luzes, 51)
    casa(predios, emiss_p, 326, 370, 133, 108, 92, luzes, 52, chamine=True, tons_telhado=("#7a5a6e", "#5a4058", "#3e2a40"), janelas=(0.5, 0.76))
    fumo = Camada()
    luzes += torre(predios, emiss_p, 398, emiss_rel)
    luzes += ampulheta(predios, emiss_amp, 322, 152)
    # Canteiros de flores na borda da praça e vasos junto à torre.
    g = np.random.default_rng(61)
    flores = ["#f4a7c4", "#ffe07a", "#c8a8f8", "#ffffff", "#f07a6a", "#ff9ac0"]
    for _ in range(520):
        ang = g.random() * math.pi
        x = 410 - math.cos(ang) * 132 * (1 + g.random() * 0.12)
        y = 168 - math.sin(ang) * 31 * (1 + g.random() * 0.14)
        if y > H or x < 270:
            continue
        predios.p(x, y + 1, "#3e6a34")
        predios.p(x, y + 2, "#2e5228")
        if g.random() < 0.55:
            predios.p(x, y, flores[int(g.random() * len(flores))])
        else:
            predios.p(x, y, "#5a8a44")
    for (vx, vy) in ((374, 141), (424, 141), (350, 146), (456, 148)):
        predios.ret(vx - 3, vy - 4, 7, 5, "#a8583a")
        predios.ret(vx - 3, vy - 4, 7, 1, "#d08060")
        predios.ret(vx + 2, vy - 3, 1, 4, "#6a3020")
        predios.disco(vx, vy - 7, 4, ("#7aa85a", "#4e8040", "#2e5a2e"))
        for k in range(6):
            predios.p(vx - 3 + hash01(vx, k) * 7, vy - 10 + hash01(k, vy) * 6, flores[k % 6])

    # Varais de luzinhas entre a torre e as casas.
    for (p0, p1) in (((427, 92), (466, 100)), ((371, 94), (336, 106))):
        n = 18
        for i in range(n + 1):
            t = i / n
            x = p0[0] + (p1[0] - p0[0]) * t
            y = p0[1] + (p1[1] - p0[1]) * t + math.sin(t * math.pi) * 6
            predios.p(x, y, "#2a2030")
            if i % 3 == 1:
                emiss_p.p(x, y + 1, ["#ffd070", "#ff9a70", "#fff0b0", "#a8e0ff"][i % 4])
                luzes.append((x, y + 1, 7, 1.0, "#ffc070", 0.18))
    # Cerca de madeira acompanhando a estrada, do lado de fora da curva.
    for i in range(140, len(estrada) - 20, 26):
        x, y = estrada[i]
        larg = 1.0 + (y - 100) * 0.42
        s_ = (y - 98) / 62
        fx_ = x - larg - 5 - 6 * s_
        alt = 3 + 9 * s_
        predios.ret(fx_, y - alt, max(1, round(2 * s_)), alt, "#5a3a26")
        predios.p(fx_, y - alt, "#a07850")
        if i + 26 < len(estrada) - 20:
            x2, y2 = estrada[i + 26]
            larg2 = 1.0 + (y2 - 100) * 0.42
            s2 = (y2 - 98) / 62
            for frac in (0.3, 0.7):
                predios.linha(fx_, y - alt * frac, x2 - larg2 - 5 - 6 * s2, y2 - (3 + 9 * s2) * frac, "#7a5234")
    # Lampiões da praça.
    lampiao(predios, emiss_p, 462, 152, 0.95, luzes)
    lampiao(predios, emiss_p, 298, 158, 1.0, luzes)
    # Passarinhos voltando para a torre.
    for (bx, by) in ((440, 30), (452, 24), (433, 21), (300, 40)):
        for (dx, dy) in ((-2, -1), (-1, 0), (0, 1), (1, 0), (2, -1)):
            predios.p(bx + dx, by + dy, "#1a1428")

    # ── Primeiro plano: capim e flores bem perto da câmera (desfocados), vaga-lumes.
    frente = Camada()
    g = np.random.default_rng(71)
    for _ in range(260):
        x = g.random() * W
        if 150 < x < 420 and g.random() < 0.85:
            continue
        alt = 6 + g.random() * 16
        inc = (g.random() - 0.5) * 0.6
        for j in range(int(alt)):
            frente.p(x + inc * j, H - 1 - j, "#4a7a3a" if j > alt * 0.5 else "#2e4e2a")
    for (cx_, cy_, r) in ((-4, 168, 26), (40, 172, 18), (470, 170, 20)):
        frente.disco(cx_, cy_, r, ("#5a8a48", "#3e6a36", "#26462a"))
    for _ in range(40):
        x = 420 + g.random() * 60
        y = H - g.random() * 14
        frente.ret(x, y, 2, 2, flores[int(g.random() * 6)])
    vagalumes = Camada()
    for _ in range(26):
        x = 230 + g.random() * 250
        y = 96 + g.random() * 58
        vagalumes.p(x, y, "#f0ff9a", 0.6 + g.random() * 0.4)

    # ── Montagem.
    m = Montagem(ceu)
    m.camada(longe, 1.8)
    m.emissivo(e_longe, 0.8, halo=0.6)
    m.camada(meio_c, 0.9)
    m.camada(campo, 0.3)
    m.camada(paralelos)
    m.camada(objetos)
    m.camada(fumo, 1.5, solida=False)
    m.camada(predios)
    # Ambiente do anoitecer (frio) e a luz do poente vindo do horizonte, à esquerda da torre.
    luzes_poente = [(268, 96, 220, 0.4, "#ff8a6a", 0.28)]
    m.iluminar("#50508e", luzes + luzes_poente)
    m.emissivo(emiss, 0, halo=0.9)
    m.emissivo(emiss_p, 0, halo=0.6)
    m.emissivo(emiss_rel, 0, halo=0.12)
    m.emissivo(emiss_amp, 0, halo=0.3)
    # Feixes do poente subindo atrás das colinas.
    ceu_claro = np.clip((m.img.mean(2) - 0.55) * 2, 0, 1) * (1 - m.solido) * (_GYS < 108 * ESC)
    raios = raios_radiais(ceu_claro, (270, 112), alcance=0.6)
    m.somar(desfocar(raios[:, :, None], 6)[:, :, 0], "#ffb080", 0.5)
    m.emissivo(vagalumes, 0, halo=1.2)
    m.camada(frente, 6, escurecer=0.35)
    return m.acabar("#ffd8a8", "#1e1a48", esquerda=0.42, centro_v=(0.66, 0.55))


# ═══════════════════════════════ 2. O baú do tesouro ═══════════════════════════════
def relevo(seed: int, n: int = 160, esticar: float = 1.0, fino: float = 0.18, y0: float = 0, y1: float = H) -> np.ndarray:
    """Mapa de altura de rocha em blocos: células de Voronoi abauladas (cada uma uma pedra), fendas entre elas e
    um ruído fino por cima."""
    g = np.random.default_rng(seed)
    px = g.random(n) * (W + 40) - 20
    py = y0 + g.random(n) * (y1 - y0 + 20) - 10
    f1 = np.full((H, W), 1e9, dtype=np.float32)
    f2 = np.full((H, W), 1e9, dtype=np.float32)
    alt = np.zeros((H, W), dtype=np.float32)
    alturas = g.random(n).astype(np.float32)
    for i in range(n):
        d = np.sqrt(((_XS - px[i]) / esticar) ** 2 + (_YS - py[i]) ** 2)
        menor = d < f1
        f2 = np.where(menor, f1, np.minimum(f2, d))
        alt = np.where(menor, alturas[i], alt)
        f1 = np.where(menor, d, f1)
    borda = np.clip((f2 - f1) / 3.2, 0, 1)
    h = np.sqrt(borda) * (0.6 + 0.4 * alt) + ruido(seed + 1, 3) * fino + ruido(seed + 2, 11) * 0.25
    return h


def rocha_iluminada(h: np.ndarray, luzes, rampa, forca: float = 7.0, base: float = 0.0) -> np.ndarray:
    """Pinta a rocha em tons de pixel art a partir das normais do relevo, virada para as luzes (luz rasante)."""
    gy, gx = np.gradient(h)
    nx, ny, nz = -gx * forca, -gy * forca, np.ones_like(h)
    n = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / n, ny / n, nz / n
    difusa = np.zeros_like(h) + base
    for (lx, ly, lz, peso) in luzes:
        vx, vy, vz = lx - _XS, ly - _YS, np.full_like(h, lz)
        d = np.sqrt(vx * vx + vy * vy + vz * vz)
        difusa += np.clip((nx * vx + ny * vy + nz * vz) / d, 0, 1) * peso
    # Pontilhado ordenado (Bayer 4x4) entre os tons, como na pixel art.
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16 - 0.5
    d = np.tile(bayer, (H // 4 + 1, W // 4 + 1))[:H, :W]
    nivel = np.clip(difusa * (len(rampa) - 1) + d * 0.9, 0, len(rampa) - 1)
    idx = np.round(nivel).astype(int)
    cores = np.array([hexa(c) for c in rampa])
    return cores[idx]


def moeda(c: Camada, x: float, y: float, k: float) -> None:
    """Uma moeda deitada (3 x 2) com brilho e borda escura; k varia o tom."""
    x, y = int(round(x)), int(round(y))
    c.p(x - 1, y, "#e8b23a" if k > 0.5 else "#d89a2a")
    c.p(x, y, "#ffe27a" if k > 0.3 else "#f4c64a")
    c.p(x + 1, y, "#c8861e")
    c.p(x - 1, y + 1, "#a8661a")
    c.p(x, y + 1, "#b8761c")
    c.p(x + 1, y + 1, "#7a4612")
    if k > 0.85:
        c.p(x - 1, y, "#fff6c0")


def joia(c: Camada, x: float, y: float, tipo: int, tam: int = 2) -> None:
    """Pedra lapidada: losango com faceta clara em cima à esquerda e contorno escuro."""
    cores = [("#ffd0d8", "#e8304a", "#8a1028", "#4a0818"), ("#d0ffe0", "#2ec86a", "#0e7a3a", "#04401c"),
             ("#d8e8ff", "#3a7aff", "#1a3aa8", "#0a1a5a"), ("#f0d8ff", "#a858e8", "#5a2a9a", "#2a104a"),
             ("#ffffff", "#c8f0ff", "#7ab8d8", "#3a6a8a")][tipo % 5]
    x, y = int(round(x)), int(round(y))
    for dy in range(-tam - 1, tam + 2):
        meia = tam + 1 - abs(dy)
        for dx in range(-meia, meia + 1):
            borda = abs(dx) == meia or abs(dy) == tam + 1
            if borda:
                c.p(x + dx, y + dy, cores[3])
            elif dx + dy < -tam * 0.5:
                c.p(x + dx, y + dy, cores[0])
            elif dx + dy < tam * 0.6:
                c.p(x + dx, y + dy, cores[1])
            else:
                c.p(x + dx, y + dy, cores[2])
    c.p(x - max(1, tam // 2), y - max(1, tam // 2), "#ffffff")


def monte_de_moedas(c: Camada, cx: float, base: float, rx: float, alt: float, n: int, seed: int) -> None:
    """Monte em domo de moedas empilhadas (de trás para a frente), com algumas em pé."""
    g = np.random.default_rng(seed)
    pts = []
    for _ in range(n):
        u = g.random() * 2 - 1
        topo = base - alt * (1 - u * u) ** 0.8
        y = topo + g.random() ** 1.6 * (base - topo)
        pts.append((cx + u * rx, y, g.random()))
    pts.sort(key=lambda t: t[1])
    # fundo do monte (sombra entre as moedas)
    for x in range(int(cx - rx), int(cx + rx) + 1):
        u = (x - cx) / rx
        if abs(u) > 1:
            continue
        topo = base - alt * (1 - u * u) ** 0.8 + 1.5
        for y in range(int(topo), int(base) + 1):
            c.p(x, y, "#8a5214" if (x + y) % 3 else "#6a3a10")
    for (x, y, k) in pts:
        moeda(c, x, y, k)
        if k > 0.97:
            c.ret(x, y - 3, 1, 3, "#ffe27a")
            c.p(x + 1, y - 2, "#a8661a")


def cena_bau() -> Image.Image:
    luzes: list = []
    bx, bb = 336, 140  # centro e base do baú
    fonte = (bx + 2, 104)
    cristal = (458, 82)
    # ── Paredes da caverna, com relevo virado para o ouro e para os cristais.
    h_parede = relevo(101, 120, esticar=1.3)
    rampa_parede = ["#0a0e1a", "#121a2c", "#1c283e", "#283850", "#384a62", "#4e6078", "#6e7c92"]
    parede = rocha_iluminada(h_parede, [(fonte[0], fonte[1], 26, 1.15), (cristal[0], cristal[1], 22, 0.55), (150, -30, 60, 0.25)],
                             rampa_parede, forca=3.2, base=0.08)
    # Fundo mais escuro longe do baú e no alto (a caverna some no escuro).
    dist = np.hypot((_XS - fonte[0]) / 260, (_YS - fonte[1]) / 140)
    parede *= np.clip(1.2 - dist * 0.6, 0.5, 1)[:, :, None]
    parede *= np.clip(0.55 + _YS / 90, 0, 1)[:, :, None]  # o teto se perde no escuro
    parede *= (0.72 + 0.4 * ruido(105, 34, 10))[:, :, None]  # dobras grandes da rocha
    # O túnel ao fundo, à esquerda (escuro e calmo).
    tunel = elipse_m(96, 88, 34, 40) * (_YS < 120)
    parede = parede * (1 - tunel[:, :, None] * 0.8) + tunel[:, :, None] * hexa("#04060c") * 0.8
    ceu = parede  # não há céu: a parede é o fundo
    fundo = Camada()
    fundo.mascara(np.ones((H, W), dtype=np.float32), parede)

    # ── Estalactites do teto (camada do meio).
    teto = Camada()
    g = np.random.default_rng(103)
    x = -6
    while x < W + 6:
        larg = 3 + g.random() * 9
        comp = 8 + g.random() * 30 * (0.5 if 180 < x < 300 else 1)
        topo0 = -2 + g.random() * 6
        for y in range(int(topo0), int(topo0 + comp)):
            t = (y - topo0) / comp
            meia = larg * (1 - t) ** 1.3
            for dx in range(int(-meia), int(meia) + 1):
                lado = dx / max(meia, 0.5)
                para_luz = 1 if x < fonte[0] else -1
                k = lado * para_luz
                cor = "#6a7690" if k > 0.45 else "#3a4660" if k > -0.2 else "#1c2436"
                if hash01(int(x + dx), y, 5) > 0.92:
                    cor = "#5a6a82"
                teto.p(x + dx, y, cor)
        if g.random() < 0.3:  # gota d'água na ponta
            teto.p(x, topo0 + comp + 1, "#9ad8ff")
        x += larg * 1.4 + g.random() * 10
    # faixa de rocha do teto
    for xx in range(W):
        alt = 6 + 5 * math.sin(xx / 17) + 3 * math.sin(xx / 5.3)
        teto.ret(xx, 0, 1, alt, "#1a2232")
        teto.p(xx, alt, "#3a4660")

    # Colunas de rocha (estalactite que encontrou a estalagmite) no meio do caminho, dando profundidade.
    colunas = Camada()
    for (cx_c, larg_c, seed_c) in ((226, 13, 1), (60, 18, 2)):
        nn = ruido(190 + seed_c, 2, 6)
        for y in range(0, H):
            t = y / H
            meia = larg_c * (1 - 0.45 * math.exp(-((t - 0.45) / 0.18) ** 2)) + 3 * math.sin(y / 7 + seed_c)
            if t > 0.72:
                meia += (t - 0.72) * 60
            for x in range(int(cx_c - meia), int(cx_c + meia) + 1):
                u = (x - cx_c) / max(meia, 1)
                k = u + (nn[y, x % W] - 0.5) * 0.7
                cor = "#4a5874" if k > 0.5 else "#2e3a52" if k > -0.1 else "#1a2234" if k > -0.6 else "#10162a"
                if y % 9 == 0 and hash01(x, y) > 0.4:
                    cor = "#141a2c"
                colunas.p(x, y, cor)
    # ── Chão de pedra com relevo, poça d'água à esquerda do baú.
    chao = Camada()
    h_chao = relevo(111, 260, esticar=3.0, y0=115)
    rampa_chao = ["#0c0e16", "#141722", "#1e2230", "#2a2e3c", "#3c3e4c", "#54525e", "#76707a"]
    pedra = rocha_iluminada(h_chao, [(fonte[0], fonte[1] + 10, 18, 1.3), (cristal[0], cristal[1] + 30, 20, 0.4)], rampa_chao, forca=3.0, base=0.22)
    borda_chao = 120 + 3 * np.sin(_XS / 23) + 2 * np.sin(_XS / 7)
    chao.mascara((_YS >= borda_chao).astype(np.float32), pedra)
    chao.mascara(((_YS >= borda_chao) & (_YS < borda_chao + 1.5)).astype(np.float32), "#3a4656", 0.8)
    # pedras soltas
    g = np.random.default_rng(113)
    for _ in range(70):
        x, y = g.random() * W, 124 + g.random() * 36
        r = 1 + g.random() * 2.5
        chao.disco(x, y, r, ("#5a5662", "#33323e", "#1a1a24"), luz=(1 if x < bx else -1, -0.6))
    # Poça: espelho escuro com o reflexo do ouro em estrias.
    poca = elipse_m(252, 147, 30, 5.5)
    reflexo = np.zeros((H, W, 3), dtype=np.float32) + hexa("#0a1424")
    estria = (np.sin(_XS * 1.7) * 0.5 + 0.5) * np.exp(-((_XS - 300) / 40) ** 2)
    reflexo += (estria * (np.sin(_YS * 2.3) > 0))[:, :, None] * hexa("#c08a3a") * 0.9
    chao.mascara(poca, reflexo)
    chao.mascara((poca > 0) & (elipse_m(252, 147.5, 30, 5.5) > 0) & ~(elipse_m(252, 148.5, 29, 5) > 0), "#6a7a90", 0.7)

    # ── Cristais azuis crescendo da parede à direita (luz fria que contrasta com o ouro).
    cristais = Camada()
    emis_cr = Camada()

    def prisma(cam, em, x0, y0, ang, comp, larg, tons):
        ca, sa = math.cos(ang), math.sin(ang)
        px, py = -sa, ca
        pts = [(x0 + px * larg, y0 + py * larg), (x0 + ca * comp * 0.85 + px * larg, y0 + sa * comp * 0.85 + py * larg),
               (x0 + ca * comp, y0 + sa * comp), (x0 + ca * comp * 0.85 - px * larg, y0 + sa * comp * 0.85 - py * larg),
               (x0 - px * larg, y0 - py * larg)]
        m = poligono_m(pts)
        lado = (_XS - x0) * px + (_YS - y0) * py
        cor = np.where((lado < -larg * 0.25)[:, :, None], hexa(tons[0]), np.where((lado < larg * 0.35)[:, :, None], hexa(tons[1]), hexa(tons[2])))
        cam.mascara(m, cor)
        borda = (desfocar(m[:, :, None], 0.7)[:, :, 0] > 0.04) & (m == 0)
        cam.mascara(borda.astype(np.float32), tons[3], 0.8)
        em.mascara(m * (np.abs(lado) < larg * 0.2) * 0.7, "#e8ffff")
    tons_cr = ("#c8faff", "#52c8ec", "#1e6aa8", "#08203e")
    # Saliência de rocha de onde nascem os cristais.
    cristais.disco(486, 96, 22, ("#3a4a62", "#26324a", "#141c2c"), luz=(-0.8, -0.3))
    for (x0, y0, ang, comp, larg) in ((482, 66, 3.25, 22, 3.5), (478, 80, 3.5, 34, 6), (486, 92, 3.2, 40, 7.5), (474, 104, 3.75, 30, 6),
                                      (484, 112, 3.0, 22, 4.5), (470, 116, 4.1, 20, 4), (480, 124, 3.55, 16, 3.5), (476, 92, 3.95, 18, 3.5)):
        prisma(cristais, emis_cr, x0, y0, ang, comp, larg, tons_cr)
    for (x0, y0, ang, comp, larg) in ((430, 142, 4.55, 15, 3.4), (437, 143, 5.0, 11, 2.6), (424, 143, 4.15, 9, 2.2), (441, 144, 5.3, 6, 1.8)):
        prisma(cristais, emis_cr, x0, y0, ang, comp, larg, tons_cr)
    luzes += [(cristal[0], cristal[1], 70, 1.0, "#3ab8ff", 0.55), (430, 134, 20, 0.8, "#5ad0ff", 0.3)]

    # ── O baú: tampa aberta (por dentro), monte de ouro, frente com ferragens douradas.
    bau = Camada()
    em = Camada()
    x0, x1 = bx - 31, bx + 31
    yt, yb = 116, bb  # frente
    # Tampa aberta (vista por dentro), abaulada no alto, inclinada para trás.
    tampa_m = poligono_m([(x0 + 4, 109), (x0 + 6, 84), (x1 + 6, 84), (x1 + 4, 109)])
    tampa_m = np.maximum(tampa_m, elipse_m(bx + 6, 84, 31, 9) * (_YS < 84))
    luz_tampa = np.clip((_YS - 74) / 36, 0, 1)
    madeira_dentro = np.zeros((H, W, 3), dtype=np.float32) + hexa("#3a1a12")
    madeira_dentro += luz_tampa[:, :, None] * hexa("#7a3a1e")
    madeira_dentro *= (0.85 + 0.15 * ((_XS.astype(int) // 1 % 7) != 0))[:, :, None]
    bau.mascara(tampa_m, madeira_dentro)
    contorno_tampa = (desfocar(tampa_m[:, :, None], 0.8)[:, :, 0] > 0.04) & (tampa_m == 0)
    bau.mascara(contorno_tampa.astype(np.float32), "#2a1008")
    friso = tampa_m * (1 - (desfocar(tampa_m[:, :, None], 1.6)[:, :, 0] > 0.97))
    bau.mascara(friso, "#e8b040")
    bau.mascara(friso * (_XS < bx), "#ffe08a", 0.6)
    for k in range(x0 + 10, x1 + 4, 10):
        bau.ret(k, 80, 2, 29, "#c8902e")
        bau.ret(k, 80, 1, 29, "#ffe08a", 0.7)
    # Brasão no forro da tampa: um escudo com uma estrela.
    sx, sy = bx + 5, 93
    escudo = poligono_m([(sx - 6, sy - 6), (sx + 6, sy - 6), (sx + 6, sy + 1), (sx, sy + 7), (sx - 6, sy + 1)])
    bau.mascara(escudo, "#7a1a2a")
    bau.mascara(((desfocar(escudo[:, :, None], 0.8)[:, :, 0] > 0.04) & (escudo == 0)).astype(np.float32), "#f0c050")
    brilho(bau, sx, sy - 1, 2, "#ffe08a")
    # Borda de trás da abertura e o monte de ouro transbordando.
    bau.ret(x0 + 2, 108, x1 - x0 + 4, 3, "#5a2a16")
    bau.ret(x0 + 2, 108, x1 - x0 + 4, 1, "#f0c050")
    monte_de_moedas(bau, bx + 1, 117, 31, 17, 900, 121)
    # Taça dourada e o cristal rosa em cima do ouro.
    tx, ty = bx - 17, 101
    for j, m_ in enumerate([5, 5, 4, 4, 3, 2, 1, 1, 1, 3, 4]):
        for dx in range(-m_, m_ + 1):
            t = (dx + m_) / (2 * m_ + 0.01)
            bau.p(tx + dx, ty - 10 + j, "#fff0a0" if t < 0.25 else "#e8b040" if t < 0.6 else "#9a6418")
    bau.ret(tx - 4, ty - 10, 9, 1, "#fff6c8")
    joia(bau, tx, ty - 7, 0, 1)
    cx_, cy_ = bx + 15, 99
    prisma(bau, em, cx_, cy_ + 4, -1.35, 13, 2.6, ("#ffd8f4", "#f070c8", "#a02a80", "#4a0a3a"))
    prisma(bau, em, cx_ + 3, cy_ + 5, -0.9, 8, 1.8, ("#ffd8f4", "#f070c8", "#a02a80", "#4a0a3a"))
    luzes.append((cx_ + 1, cy_ - 2, 18, 1.0, "#ff70d0", 0.4))
    # Frente do baú: tábuas, faixas douradas, cantoneiras com filigrana, fechadura.
    for y in range(yt, yb):
        for x in range(x0, x1):
            tab = (y - yt) // 8
            k = hash01(x // 3, y, tab) * 0.25 + (0.12 if (x + tab * 5) % 11 == 0 else 0)
            t = (x - x0) / (x1 - x0)
            cor = mistura("#9a4a26", "#4a2012", min(1, t * 0.7 + k))
            if (y - yt) % 8 == 7:
                cor = hexa("#2a0e08")
            bau.p(x, y, cor)
    # Lateral direita (em perspectiva, na sombra).
    bau.poligono([(x1, yt), (x1 + 7, yt - 6), (x1 + 7, yb - 5), (x1, yb)], "#3a160c")
    bau.linha(x1, yt, x1 + 7, yt - 6, "#c8902e")
    bau.linha(x1 + 7, yt - 6, x1 + 7, yb - 5, "#8a5a1a")
    for (yy, alt) in ((yt, 3), (yb - 3, 3)):
        bau.ret(x0 - 1, yy, x1 - x0 + 2, alt, "#d89a30")
        bau.ret(x0 - 1, yy, x1 - x0 + 2, 1, "#fff0a0")
        bau.ret(x0 - 1, yy + alt - 1, x1 - x0 + 2, 1, "#8a5414")
        for k in range(x0 + 2, x1, 5):
            bau.p(k, yy + 1, "#fff6c8")
    for k in (x0 + 9, x1 - 10):
        bau.ret(k, yt, 3, yb - yt, "#d89a30")
        bau.ret(k, yt, 1, yb - yt, "#fff0a0")
        bau.ret(k + 2, yt, 1, yb - yt, "#8a5414")
        for yy in range(yt + 5, yb - 3, 4):
            bau.p(k + 1, yy, "#fff6c8")
    for (ccx, sxn) in ((x0, 1), (x1 - 1, -1)):  # cantoneiras
        for j in range(9):
            bau.p(ccx + sxn * j, yt + 3, "#f0c050")
            bau.p(ccx, yt + 3 + j, "#f0c050")
            bau.p(ccx + sxn * j, yb - 4, "#f0c050")
            bau.p(ccx, yb - 4 - j, "#f0c050")
        for (dx, dy) in ((2, 6), (3, 5), (5, 3), (6, 2), (4, 4)):
            bau.p(ccx + sxn * dx, yt + 2 + dy, "#ffe08a")
            bau.p(ccx + sxn * dx, yb - 3 - dy, "#ffe08a")
    # Fechadura.
    fx, fy = bx, yt + 2
    espelho = poligono_m([(fx - 6, fy), (fx + 6, fy), (fx + 6, fy + 9), (fx, fy + 14), (fx - 6, fy + 9)])
    bau.mascara(espelho, "#e0a838")
    bau.mascara(espelho * (_XS < fx - 2), "#fff0a0", 0.7)
    bau.mascara(espelho * (_XS > fx + 2), "#9a6418", 0.7)
    bau.mascara(((desfocar(espelho[:, :, None], 0.8)[:, :, 0] > 0.04) & (espelho == 0)).astype(np.float32), "#5a3010")
    bau.disco(fx, fy + 5, 1.6, ("#1a0a04", "#1a0a04", "#1a0a04"))
    bau.ret(fx, fy + 6, 1, 4, "#1a0a04")
    # Moedas escorrendo pela frente até o chão e um colar de pérolas pendurado.
    g = np.random.default_rng(131)
    for _ in range(70):
        t = g.random()
        x = x0 + 3 + g.normal(0, 3) + t * 3
        moeda(bau, x, yt + 2 + t * (yb - yt), g.random())
    for i in range(16):
        t = i / 15
        x = bx + 9 + t * 12
        y = yt + 1 + math.sin(t * math.pi) * 10
        bau.p(x, y, "#fffaf0")
        bau.p(x + 1, y + 1, "#b8b0c0")
    joia(bau, bx + 15, yt + 10, 2, 1)

    # ── Montes de ouro no chão, joias espalhadas e os objetos: livro, pergaminhos, bússola.
    chao_ouro = Camada()
    monte_de_moedas(chao_ouro, x0 - 6, bb + 3, 20, 9, 340, 141)
    monte_de_moedas(chao_ouro, x1 + 14, bb + 4, 17, 7, 260, 142)
    monte_de_moedas(chao_ouro, bx + 4, bb + 9, 26, 4, 200, 143)
    g = np.random.default_rng(151)
    for _ in range(90):  # moedas soltas, rareando para a esquerda
        x = bx + g.normal(0, 52)
        if x < 225 and g.random() < 0.8:
            continue
        y = bb - 2 + g.random() * 20
        moeda(chao_ouro, x, y, g.random())
    for i in range(16):
        x = bx + g.normal(0, 40)
        y = bb - 4 + g.random() * 18
        joia(chao_ouro, x, y, i, 1 + int(g.random() * 2))
    for (jx, jy, tp) in ((x0 + 2, 106, 1), (bx - 6, 101, 0), (bx + 22, 105, 2), (bx - 26, 108, 3), (bx + 4, 107, 4)):
        joia(bau, jx, jy, tp, 2)
    # Livro grosso de capa azul com cantos de ouro e um medalhão (deitado, em perspectiva).
    lx, ly = 278, 149
    capa = poligono_m([(lx - 15, ly - 2), (lx + 7, ly - 9), (lx + 17, ly - 3), (lx - 5, ly + 4)])
    pag_a = poligono_m([(lx - 15, ly - 2), (lx - 5, ly + 4), (lx - 5, ly + 9), (lx - 15, ly + 3)])
    pag_b = poligono_m([(lx - 5, ly + 4), (lx + 17, ly - 3), (lx + 17, ly + 2), (lx - 5, ly + 9)])
    chao_ouro.mascara(pag_a, "#2a3a7a")  # lombada
    chao_ouro.mascara(pag_a * (_YS > ly + 1), "#1a2650", 0.6)
    chao_ouro.mascara(pag_b, "#efe2c2")
    chao_ouro.mascara(pag_b * ((_YS.astype(int) + (_XS.astype(int) // 3)) % 2 == 0), "#c8b896", 0.7)
    chao_ouro.mascara(capa, "#2e4ea8")
    chao_ouro.mascara(capa * (poligono_m([(lx - 15, ly - 2), (lx + 7, ly - 9), (lx + 9, ly - 7), (lx - 12, ly + 0)])), "#5a80dc")
    borda_capa = (desfocar(capa[:, :, None], 0.8)[:, :, 0] > 0.04) & (capa == 0) & (pag_b == 0) & (pag_a == 0)
    chao_ouro.mascara(borda_capa.astype(np.float32), "#101a3a")
    chao_ouro.mascara(((desfocar(capa[:, :, None], 1.1)[:, :, 0] < 0.97) & (capa > 0)).astype(np.float32), "#d8a838", 0.85)
    for (qx, qy) in ((lx - 13, ly - 2), (lx + 7, ly - 8), (lx + 15, ly - 3), (lx - 5, ly + 3)):
        chao_ouro.disco(qx, qy, 1.4, ("#fff0a0", "#e0a838", "#8a5414"))
    chao_ouro.elipse(lx + 1, ly - 2.5, 3.2, 2, "#e0a838")
    chao_ouro.elipse(lx + 1, ly - 2.5, 1.8, 1, "#c02a3a")
    chao_ouro.p(lx, ly - 3, "#ffffff")
    chao_ouro.ret(lx + 10, ly + 2, 2, 5, "#c02a2a")  # fitinha marcadora
    # Pergaminhos enrolados com fita vermelha e lacre, encostados no baú.
    for (px0, py0, comp, ang) in ((x1 + 9, bb - 5, 18, -0.5), (x1 + 13, bb - 2, 15, -0.25)):
        ca, sa = math.cos(ang), math.sin(ang)
        for t in range(comp):
            for r in range(-2, 3):
                x = px0 + ca * t - sa * r
                y = py0 + sa * t + ca * r
                cor = "#fff4d8" if r == -2 else "#e8d4a8" if r < 1 else "#b89a6a" if r < 2 else "#7a6040"
                chao_ouro.p(x, y, cor)
        ex, ey = px0 + ca * comp, py0 + sa * comp
        chao_ouro.disco(ex, ey, 2.4, ("#f4e6c4", "#c8ae80", "#8a7050"))
        chao_ouro.p(ex, ey, "#7a6040")
        mx_, my_ = px0 + ca * comp * 0.5, py0 + sa * comp * 0.5
        for r in range(-2, 3):
            chao_ouro.p(mx_ - sa * r, my_ + ca * r, "#c02a2a")
            chao_ouro.p(mx_ + ca - sa * r, my_ + sa + ca * r, "#8a1a1a")
        chao_ouro.disco(mx_ + 1, my_ + 3, 1.6, ("#e04040", "#a01a1a", "#600a0a"))
    # Bússola de latão aberta: tampa em pé atrás, aro dourado, rosa dos ventos e agulha vermelha.
    cx2, cy2 = 408, 150
    chao_ouro.elipse(cx2 + 1, cy2 - 8, 7.5, 5.5, "#7a4a14")
    chao_ouro.elipse(cx2 + 1, cy2 - 8, 6, 4.2, "#2a1a0c")
    chao_ouro.elipse(cx2 - 1, cy2 - 10, 2.5, 1.5, "#c8902e", 0.6)
    for y in range(int(cy2 - 6), int(cy2 + 7)):
        for x in range(int(cx2 - 9), int(cx2 + 10)):
            d = math.hypot((x - cx2) / 8.5, (y - cy2) / 5.2)
            if d <= 1:
                if d > 0.74:
                    luz_ = (x - cx2) * -0.6 + (y - cy2) * -1
                    chao_ouro.p(x, y, "#fff0a0" if luz_ > 2 else "#e0a838" if luz_ > -2 else "#8a5414")
                else:
                    chao_ouro.p(x, y, "#f4ead2" if d < 0.55 else "#d8c8a4")
    for (dx, dy) in ((0, -3), (0, 3), (-5, 0), (5, 0)):
        chao_ouro.p(cx2 + dx, cy2 + dy, "#5a4030")
    chao_ouro.linha(cx2 - 4, cy2 + 2, cx2, cy2, "#e8e8f0")
    chao_ouro.linha(cx2, cy2, cx2 + 4, cy2 - 2, "#d82a2a")
    chao_ouro.p(cx2 + 4, cy2 - 2, "#ff5a4a")
    chao_ouro.p(cx2, cy2, "#ffe08a")
    chao_ouro.p(cx2 - 5, cy2 - 3, "#ffffff")
    chao_ouro.p(cx2 - 4, cy2 - 4, "#ffffff", 0.6)
    chao_ouro.ret(cx2 + 9, cy2 - 1, 3, 1, "#c8902e")  # argola

    # ── Brilhos sobre o ouro (emissivos) e o interior aceso do baú.
    brilhos = Camada()
    g = np.random.default_rng(161)
    for _ in range(18):
        x = bx + g.normal(0, 30)
        y = 100 + abs(g.normal(0, 18))
        if y > 158:
            continue
        brilho(brilhos, x, y, 1 + int(g.random() * 1.6), "#fff2b0")
    for (x, y, t) in ((bx - 4, 98, 3), (x0 + 1, yt + 1, 2), (bx + 25, 103, 2), (cx_ + 1, cy_ - 8, 2), (cx2 - 3, cy2 - 2, 1), (tx - 3, ty - 9, 2)):
        brilho(brilhos, x, y, t, "#fff6d0")
    poeira = Camada()
    for _ in range(90):
        ang = -math.pi / 2 + g.normal(0, 0.55)
        r = 6 + g.random() ** 0.7 * 90
        x, y = fonte[0] + math.cos(ang) * r * 1.3, fonte[1] + math.sin(ang) * r
        poeira.p(x, y, "#ffe8a8", 0.3 + g.random() * 0.6)
    for _ in range(30):
        x, y = 430 + g.normal(0, 20), 80 + g.normal(0, 25)
        poeira.p(x, y, "#a8f0ff", 0.4 + g.random() * 0.5)
    luzes += [(fonte[0], fonte[1] - 6, 160, 0.62, "#ffa030", 0.85), (fonte[0], fonte[1] - 14, 40, 0.8, "#ffd070", 0.25),
              (bx, bb + 8, 80, 0.3, "#ffb040", 0.4)]
    # Primeiro plano: rochas e estalagmites bem perto, desfocadas.
    frente = Camada()
    for (cx3, cy3, r) in ((-10, 172, 34), (30, 182, 22), (476, 176, 24), (448, 186, 18)):
        frente.disco(cx3, cy3, r, ("#1e2638", "#141a28", "#0a0e18"))
    for (sx_, larg, alt) in ((462, 9, 44), (18, 8, 30)):
        for y in range(H - alt, H):
            t = (y - (H - alt)) / alt
            meia = larg * t ** 0.7
            frente.ret(sx_ - meia, y, meia * 2 + 1, 1, "#121826")
            frente.ret(sx_ - meia, y, max(1, meia * 0.6), 1, "#2a3448")
    for _ in range(14):
        moeda(frente, 380 + g.random() * 80, 150 + g.random() * 10, g.random())

    # ── Montagem.
    m = Montagem(np.zeros((H, W, 3), dtype=np.float32))
    m.camada(fundo, 1.3)
    m.camada(teto, 0.8)
    m.camada(chao, 0.3)
    m.camada(colunas, 1.2)
    m.camada(cristais)
    m.camada(chao_ouro, luz_k=0.75)
    m.camada(bau, luz_k=0.62)
    m.iluminar("#48568a", luzes + [(142, 140, 60, 0.35, "#5a7ac8", 0.45)])
    # Facho de luar entrando por uma fenda do teto, à esquerda (frio e calmo).
    t = _GYS / (H * ESC)
    centro = (176 + (140 - 176) * t) * ESC
    facho = np.exp(-((_GXS - centro) / (16 * ESC * (0.7 + t * 0.6))) ** 2 * 2) * np.clip(1.1 - t * 0.6, 0, 1)
    m.somar(desfocar(facho[:, :, None], 8)[:, :, 0], "#6a8ad0", 0.22)
    # Raios de luz dourada saindo do baú, em leque.
    ang = np.arctan2(_GYS - fonte[1] * ESC, _GXS - fonte[0] * ESC)
    r = np.hypot(_GXS - fonte[0] * ESC, (_GYS - fonte[1] * ESC) * 1.2) / ESC
    leque = np.zeros_like(r)
    g = np.random.default_rng(171)
    for _ in range(11):
        a0 = -math.pi / 2 + g.normal(0, 0.5)
        largura = 0.03 + g.random() * 0.07
        leque += np.exp(-((ang - a0) / largura) ** 2) * (0.5 + g.random() * 0.7)
    leque *= np.exp(-r / 85) * np.clip((r - 4) / 12, 0, 1) * (_GYS < (fonte[1] + 6) * ESC)
    m.somar(desfocar(leque[:, :, None], 3)[:, :, 0], "#ffc860", 0.5)
    # O ouro brilha de dentro do baú: um clarão quente sobre o monte (como se a luz morasse ali).
    m.somar(luz_pontual(bx + 2, 108, 34, 0.45), "#ffc858", 0.55)
    m.somar(luz_pontual(bx + 2, 112, 16, 0.6), "#fff0b0", 0.35)
    m.emissivo(em, 0, halo=0.6)
    m.emissivo(emis_cr, 0, halo=0.5)
    m.emissivo(brilhos, 0, halo=0.8)
    m.emissivo(poeira, 0.3, halo=0.6)
    m.camada(frente, 5, escurecer=0.6)
    return m.acabar("#ffd8a0", "#0e1838", esquerda=0.36, centro_v=(0.6, 0.6), contraste=1.08)


# ═══════════════════════════════ 3. O correio da vila ═══════════════════════════════
def cena_correio() -> Image.Image:
    raise NotImplementedError


CENAS = {"torre": cena_torre, "bau": cena_bau, "correio": cena_correio}


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    pedidas = sys.argv[1:] or list(CENAS)
    for nome in pedidas:
        img = CENAS[nome]()
        destino = PASTA / f"secao-{nome}.webp"
        img.save(destino, quality=82, method=6)
        img.resize((960, 320), Image.LANCZOS).save(PASTA / f"secao-{nome}-960.webp", quality=82, method=6)
        print(nome, destino.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
