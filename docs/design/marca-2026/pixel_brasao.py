"""O brasão do aventureiro: o símbolo do Orto Questões em pixel art "HD-2D" (11/11/2026, estudo de identidade).

Arte original feita por código, na técnica de .claude/skills/arte-hd2d: pintar pequeno (400 x 250), com 4 a 7 tons
por material, contorno e textura; ampliar 4x e montar com luz (tochas, brilho do ouro, bloom, vinheta e grão).
O ladrilho vira uma placa de pedra verde chumbada numa parede de pedra, com as três linhas de resposta entalhadas:
duas em pedra clara e a certa em ouro aceso, com o visto. Duas tochas iluminam a cena.

Saída em pixel/: cena.png (1600 x 1000, o fundo do painel), icone-64.png e icone-32.png (o símbolo em pixel puro).
Uso: python3 pixel_brasao.py
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

SAIDA = Path(__file__).resolve().parent / "pixel"
W, H, K = 400, 250, 4


def hexa(c):
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def h01(*v):
    h = 2166136261
    for k in v:
        h = ((h ^ (int(k) & 0xFFFFFFFF)) * 16777619) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 1274126177) & 0xFFFFFFFF
    return (h & 0xFFFF) / 65535


class T:
    def __init__(s, w, h):
        s.w, s.h = w, h
        s.c = np.zeros((h, w, 4), np.float32)
        s.Y, s.X = np.mgrid[0:h, 0:w].astype(np.float32)

    def p(s, x, y, cor, a=1.0):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < s.w and 0 <= y < s.h:
            rgb = hexa(cor)
            b = s.c[y, x]
            na = a + b[3] * (1 - a)
            b[:3] = (rgb * a + b[:3] * b[3] * (1 - a)) / max(na, 1e-6)
            b[3] = na

    def m(s, msk, cor, a=1.0):
        am = np.clip(msk * a, 0, 1)[:, :, None]
        rgb = hexa(cor) if isinstance(cor, str) else cor
        ba = s.c[:, :, 3:4]
        na = am + ba * (1 - am)
        s.c[:, :, :3] = np.where(na > 0, (rgb * am + s.c[:, :, :3] * ba * (1 - am)) / np.maximum(na, 1e-6), s.c[:, :, :3])
        s.c[:, :, 3:4] = na

    def rr(s, x0, y0, w, h, r):
        """Máscara de retângulo arredondado."""
        cx = np.clip(s.X, x0 + r, x0 + w - 1 - r)
        cy = np.clip(s.Y, y0 + r, y0 + h - 1 - r)
        return ((s.X - cx) ** 2 + (s.Y - cy) ** 2 <= r * r + 0.5) & (s.X >= x0) & (s.X < x0 + w) & (s.Y >= y0) & (s.Y < y0 + h)

    def circ(s, cx, cy, r):
        return (s.X - cx) ** 2 + (s.Y - cy) ** 2 <= r * r + 0.3


VERDE = ["#8fd1bf", "#4fa896", "#2a8576", "#1b6a5f", "#13544b", "#0c3d37", "#082a26"]
OURO = ["#fff6c8", "#ffe08a", "#f4cf7c", "#e0a94a", "#b07a28", "#7a4a14"]
PEDRA = ["#d8d2c0", "#bdb5a0", "#9c947e", "#7a735f"]


def placa(t: T, x0, y0, s):
    """O ladrilho de pedra verde (s = lado), com bisel, veios, as linhas entalhadas e o ouro. Devolve as luzes do ouro."""
    r = round(s * 0.24)
    corpo = t.rr(x0, y0, s, s, r)
    # sombra projetada na parede
    sombra = t.rr(x0 + 4, y0 + 6, s, s, r) & ~corpo
    t.m(sombra.astype(np.float32), "#000000", 0.45)
    # corpo em faixas de luz (luz do alto à esquerda) + veios da pedra
    u = ((t.X - x0) + (t.Y - y0) * 1.1) / (s * 2.1)
    k = np.clip((u * 5).astype(int) + 1, 1, 5)
    rgb = np.stack([hexa(c) for c in VERDE])[k]
    veio = np.sin((t.X * 0.35 + t.Y * 0.9) + np.sin(t.Y * 0.21) * 3) > 0.93
    rgb = np.where(veio[:, :, None], rgb * 0.82, rgb)
    salpico = np.vectorize(lambda x, y: h01(x, y, 3))(t.X.astype(int), t.Y.astype(int)) > 0.93
    rgb = np.where(salpico[:, :, None], rgb * 1.12, rgb)
    t.m(corpo.astype(np.float32), rgb)
    # bisel: borda clara em cima/esquerda, escura embaixo/direita
    dentro = t.rr(x0 + 3, y0 + 3, s - 6, s - 6, max(1, r - 3))
    borda = corpo & ~dentro
    cl = borda & ((t.Y - y0) + (t.X - x0) < s * 1.0)
    t.m(cl.astype(np.float32), VERDE[0], 0.8)
    t.m((borda & ~cl).astype(np.float32), VERDE[6], 0.9)
    # contorno
    al = corpo
    viz = np.zeros_like(al)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        viz |= np.roll(np.roll(al, dy, 0), dx, 1)
    t.m((viz & ~al).astype(np.float32), "#03100e")
    # as três linhas (proporções do símbolo A em 100 x 100)
    f = s / 100
    luzes = []
    for (cy, comp, certa) in ((30, 34, False), (50, 40, True), (70, 26, False)):
        cxc, cyc = x0 + 30 * f, y0 + cy * f
        rc = (9 if certa else 6.5) * f
        bx, bw, bh = x0 + 43 * f, comp * f, (10 if certa else 9) * f
        by = cyc - bh / 2
        bola = t.circ(cxc, cyc, rc)
        barra = t.rr(round(bx), round(by), round(bw), round(bh), max(1, round(bh / 2)))
        if certa:
            # ouro em relevo: faixas de cima para baixo e brilho
            for msk in (bola, barra):
                yy = (t.Y - (cyc - rc if msk is bola else by)) / max(1, (2 * rc if msk is bola else bh))
                kk = np.clip((yy * 4).astype(int) + 1, 1, 4)
                t.m(msk.astype(np.float32), np.stack([hexa(c) for c in OURO])[kk])
                t.m((msk & (yy < 0.18)).astype(np.float32), OURO[0])
            # o visto entalhado na bola
            for i in range(int(6 * f) + 1):
                t.p(cxc - 3.6 * f + i * 0.5, cyc + 0.2 * f + i * 0.5, VERDE[5])
            for i in range(int(13 * f) + 1):
                t.p(cxc - 0.6 * f + i * 0.55, cyc + 3 * f - i * 0.65, VERDE[5])
            luzes.append((bx + bw / 2, cyc, 26, "#ffcf6a", 0.85))
            luzes.append((cxc, cyc, 18, "#ffcf6a", 0.7))
        else:
            # entalhe: fundo escuro com borda de luz embaixo (pedra clara cavada)
            for msk in (bola, barra):
                t.m(msk.astype(np.float32), PEDRA[2])
                sup = msk & ~np.roll(msk, 1, 0)
                inf = msk & ~np.roll(msk, -1, 0)
                t.m(sup.astype(np.float32), "#5a5444")
                t.m(inf.astype(np.float32), PEDRA[0])
    return luzes


def parede(t: T):
    """Parede de pedra escura em fiadas, com rejunte e musgo."""
    rgb = np.zeros((t.h, t.w, 3), np.float32) + hexa("#1c2422")
    alt = 14
    for fila in range(t.h // alt + 1):
        y0 = fila * alt
        desloc = (fila % 2) * 13
        x = -desloc
        j = 0
        while x < t.w:
            w = 22 + int(h01(fila, j) * 14)
            k = h01(fila, j, 2)
            base = hexa("#2a3431") * (0.8 + 0.35 * k)
            ys, xs = slice(max(0, y0 + 1), min(t.h, y0 + alt)), slice(max(0, x + 1), min(t.w, x + w))
            rgb[ys, xs] = base
            rgb[y0 + 1:y0 + 3, max(0, x + 1):max(0, x + w)] = base * 1.18  # topo da pedra
            rgb[min(t.h - 1, y0 + alt - 1), max(0, x + 1):max(0, x + w)] = base * 0.7
            for q in range(6):  # textura
                px, py = x + 2 + int(h01(fila, j, q) * (w - 4)), y0 + 3 + int(h01(fila, j, q, 9) * (alt - 5))
                if 0 <= px < t.w and 0 <= py < t.h:
                    rgb[py, px] *= 0.82 if q % 2 else 1.15
            if h01(fila, j, 7) > 0.8 and y0 > 120:  # musgo
                for q in range(8):
                    px, py = x + 1 + int(h01(fila, j, q, 1) * (w - 2)), y0 + alt - 2 - int(h01(fila, j, q, 4) * 3)
                    if 0 <= px < t.w and 0 <= py < t.h:
                        rgb[py, px] = hexa("#3e5a32") if q % 3 else hexa("#56763e")
            x += w
            j += 1
    t.m(np.ones((t.h, t.w), np.float32), rgb)
    # chão
    chao = t.Y >= 214
    t.m(chao.astype(np.float32), "#151b1a")
    for x in range(0, t.w, 3):
        t.p(x, 214, "#2f3a37")


def tocha(t: T, x, y):
    """Suporte de ferro e o cabo de madeira; a chama é pintada na montagem (emissiva)."""
    for i in range(22):
        for dx, cor in ((0, "#7a5030"), (1, "#5a3a20" if i % 3 else "#3e2814"), (2, "#3e2814")):
            t.p(x - 1 + dx, y + i, cor)
    t.m(t.rr(x - 5, y + 8, 12, 3, 1).astype(np.float32), "#3a3e40")
    t.m(t.rr(x - 4, y - 3, 10, 5, 2).astype(np.float32), "#4a4e50")
    t.m(t.rr(x - 4, y - 3, 10, 1, 0).astype(np.float32), "#7a7e80")
    return (x + 0.5, y - 10)


def chama(t: T, x, y, fase):
    for yy in range(-20, 3):
        larg = max(0, 5.2 * (1 - (-yy) / 21) ** 0.65 + 0.8 * math.sin(yy * 0.7 + fase))
        for xx in range(-7, 8):
            d = abs(xx + 1.1 * math.sin(yy * 0.45 + fase)) / max(0.3, larg)
            if d <= 1:
                calor = (1 - d) * 0.6 + (1 + yy / 20) * 0.5
                cor = "#fff6c8" if calor > 0.95 else "#ffd060" if calor > 0.75 else "#ff9a2a" if calor > 0.5 else "#e05a18" if calor > 0.3 else "#902a10"
                t.p(x + xx, y + yy, cor)


def desfocar(a, r):
    if r <= 0:
        return a
    out = a.astype(np.float32)
    k = max(1, int(r))
    for _ in range(3):
        for eixo in (0, 1):
            pad = [(0, 0)] * a.ndim
            pad[eixo] = (k + 1, k)
            p = np.pad(out, pad, mode="edge")
            s = np.cumsum(p, axis=eixo, dtype=np.float64)
            n = out.shape[eixo]
            out = ((np.take(s, np.arange(2 * k + 1, 2 * k + 1 + n), axis=eixo) - np.take(s, np.arange(0, n), axis=eixo)) / (2 * k + 1)).astype(np.float32)
    return out


def cena():
    t = T(W, H)
    parede(t)
    pl = T(W, H)
    luzes = placa(pl, 228, 52, 112)
    tl = T(W, H)
    pontos = [tocha(tl, 196, 118), tocha(tl, 372, 118)]
    fogo = T(W, H)
    for i, (x, y) in enumerate(pontos):
        chama(fogo, x, y + 6, i * 1.7)
    # monta em 4x
    amp = lambda a: a.repeat(K, 0).repeat(K, 1)
    img = amp(t.c)[:, :, :3]
    for cam in (pl, tl):
        a = amp(cam.c)
        img = img * (1 - a[:, :, 3:4]) + a[:, :, :3] * a[:, :, 3:4]
    gy, gx = np.mgrid[0:H * K, 0:W * K].astype(np.float32) / K
    luz = np.zeros_like(img) + hexa("#4a5a66") * 0.55
    for (x, y) in pontos:
        d = np.exp(-(((gx - x) / 70) ** 2 + ((gy - y) / 60) ** 2))
        luz += d[:, :, None] * hexa("#ffb060") * 1.4
    for (x, y, r, c, f) in luzes:
        d = np.exp(-(((gx - x) / r) ** 2 + ((gy - y) / r) ** 2))
        luz += d[:, :, None] * hexa(c) * f * 0.5
    img = img * luz
    a = amp(fogo.c)
    img = img * (1 - a[:, :, 3:4]) + a[:, :, :3] * a[:, :, 3:4] * 1.15
    # ouro emissivo: brilho por cima
    ouro = amp(((pl.c[:, :, 0] > 0.8) & (pl.c[:, :, 1] > 0.55) & (pl.c[:, :, 2] < 0.7)).astype(np.float32))
    img += desfocar(ouro[:, :, None] * hexa("#ffcf6a"), 10) * 0.5
    # bloom
    claro = np.clip(img - 0.72, 0, None)
    img += desfocar(claro, 8) * 0.8 + desfocar(claro, 26) * 0.6
    # brasas
    g = np.random.default_rng(3)
    for (x, y) in pontos:
        for _ in range(14):
            bx, by = int((x + g.normal(0, 4)) * K), int((y - 10 - g.random() * 40) * K)
            if 0 <= by < H * K - 4 and 0 <= bx < W * K - 4:
                img[by:by + K, bx:bx + K] += hexa("#ffb050") * (0.5 + g.random() * 0.6)
    # o lado do texto (esquerda) mais calmo, vinheta e grão
    xs, ys = gx / W, gy / H
    img *= (0.42 + 0.58 * np.clip((xs - 0.05) / 0.45, 0, 1) ** 1.2)[:, :, None]
    img *= (1 - np.clip(((xs - 0.68) ** 2 * 1.4 + (ys - 0.5) ** 2 * 1.8) - 0.06, 0, 1) * 0.9)[:, :, None]
    img += (g.random(img.shape[:2])[:, :, None] - 0.5) * 0.02
    SAIDA.mkdir(exist_ok=True)
    Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8)).save(SAIDA / "cena.png", optimize=True)


def icones():
    for lado in (64, 32):
        t = T(lado + 4, lado + 4)
        placa(t, 1, 1, lado)
        al = t.c[:, :, 3] > 0.01
        ys, xs = np.where(al)
        c = t.c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(np.clip(c * 255, 0, 255).astype(np.uint8), "RGBA").save(SAIDA / f"icone-{lado}.png")


if __name__ == "__main__":
    cena()
    icones()
    print("ok")
