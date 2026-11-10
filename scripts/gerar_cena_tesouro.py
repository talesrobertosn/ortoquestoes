#!/usr/bin/env python3
"""A Câmara do Tesouro: o cenário HD-2D do topo de "Indique e ganhe" (10/11/2026, pedido do Tales: "tom de ouro, como
se a pessoa estivesse ganhando muito"; referências de dragões dormindo em cima do ouro).

Arte original, pintada por código com a técnica e os pincéis de scripts/gerar_cena_vila.py (a caverna do baú): uma
câmara de pedra com uma montanha de moedas, um baú aberto, taças, coroa, vasos, joias e a espada do site fincada no
alto do monte; um feixe de luz quente desce do teto e o ouro devolve a luz em leque. A esquerda fica calma e escura
(é onde entra o texto). O patamar da frente (x 270-460, y ~126) é o chão dos mascotes, que entram por cima, em CSS.

Uso: python3 scripts/gerar_cena_tesouro.py  ->  public/pixel/paginas/tesouro.webp e tesouro-960.webp
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar_cena_vila as v  # noqa: E402
from gerar_cena_vila import Camada, Montagem, H, W, ESC, hash01, hexa, mistura  # noqa: E402

XS, YS, GXS, GYS = v._XS, v._YS, v._GXS, v._GYS
PICO = (352, 70)  # o alto do monte, onde a espada está fincada e o feixe pousa
OURO = ("#fff6c0", "#ffe27a", "#f4c64a", "#d89a2a", "#a8661a", "#6a3a10")


def sombrear(c: Camada, mapa: np.ndarray) -> None:
    c.c[:, :, :3] *= mapa[:, :, None]


def monte(cx: float, base: float, rx: float, alt: float, n: int, seed: int, luz=(PICO[0], 60)) -> Camada:
    """Um monte de moedas com volume: claro no alto e do lado da luz, escuro na base e nas dobras."""
    c = Camada()
    v.monte_de_moedas(c, cx, base, rx, alt, n, seed)
    u = np.clip((XS - cx) / rx, -1, 1)
    topo = base - alt * (1 - u * u) ** 0.8
    fundo = np.clip((YS - topo) / max(alt, 1), 0, 1.6)
    lado = np.clip(1 - np.abs(XS - luz[0]) / 260, 0.35, 1)
    dobras = 0.82 + 0.36 * v.ruido(seed + 9, 14, 7)
    sombrear(c, np.clip((1.18 - fundo * 0.5) * lado * dobras, 0.3, 1.25))
    return c


def taca(c: Camada, x: int, y: int, s: int = 1, gema: str = "#e8304a") -> None:
    """Taça de ouro (y = base): pé, haste, copa com borda clara e uma pedra."""
    c.ret(x - 2 * s, y - 1, 4 * s + 1, 1, OURO[4]); c.ret(x - 1 * s, y - 2, 2 * s + 1, 1, OURO[3])
    c.ret(x, y - 2 - 3 * s, 1, 3 * s, OURO[2]); c.p(x + 1, y - 3 - s, OURO[4])
    for i in range(4 * s):
        meia = min(3 * s, 1 + i)
        yy = y - 3 - 3 * s - i
        c.ret(x - meia, yy, 2 * meia + 1, 1, OURO[2])
        c.p(x - meia, yy, OURO[1]); c.p(x + meia, yy, OURO[4])
    topo = y - 3 - 7 * s
    c.ret(x - 3 * s, topo, 6 * s + 1, 1, OURO[0]); c.ret(x - 3 * s + 1, topo + 1, 6 * s - 1, 1, "#5a3008")
    c.p(x, y - 4 - 4 * s, gema); c.p(x - 1, y - 5 - 4 * s, "#ffffff")


def coroa(c: Camada, x: int, y: int) -> None:
    c.ret(x - 6, y - 3, 13, 4, OURO[2]); c.ret(x - 6, y - 3, 13, 1, OURO[1]); c.ret(x - 6, y, 13, 1, OURO[4])
    for i, dx in enumerate((-6, -3, 0, 3, 6)):
        alt = 5 if i % 2 == 0 else 3
        for k in range(alt):
            c.p(x + dx, y - 4 - k, OURO[1] if k < alt - 1 else OURO[0])
        c.p(x + dx, y - 4 - alt, ("#e8304a", "#3a7aff", "#2ec86a")[i % 3])
    for dx, cor in ((-4, "#3a7aff"), (0, "#e8304a"), (4, "#2ec86a")):
        c.p(x + dx, y - 1, cor); c.p(x + dx, y - 2, "#ffffff")
    c.ret(x - 7, y + 1, 15, 1, "#3d2804")


def vaso(c: Camada, x: int, y: int, alt: int = 14) -> None:
    """Ânfora de ouro com alças e uma faixa de pedras."""
    for i in range(alt):
        t = i / (alt - 1)
        meia = int(round(2 + 4.2 * math.sin(math.pi * min(1, t * 1.15)) ** 0.9)) if t < 0.86 else 2
        yy = y - i
        c.ret(x - meia, yy, 2 * meia + 1, 1, OURO[2])
        c.ret(x - meia, yy, max(1, meia // 2), 1, OURO[1]); c.ret(x + meia - 1, yy, 2, 1, OURO[4])
    c.ret(x - 3, y - alt, 7, 1, OURO[0]); c.ret(x - 3, y, 7, 1, OURO[5])
    for dx in (-3, -1, 1, 3):
        c.p(x + dx, y - alt // 2, "#3a7aff" if dx % 4 else "#e8304a")
    for lado in (-1, 1):
        c.p(x + lado * 6, y - alt + 4, OURO[3]); c.p(x + lado * 7, y - alt + 5, OURO[3]); c.p(x + lado * 6, y - alt + 6, OURO[4])


def espada(c: Camada, em: Camada, x: int, ponta: int) -> None:
    """A espada do site, fincada no alto do monte (como na fogueira da página inicial), com o fio aceso pelo feixe."""
    topo = ponta - 30
    for yy in range(topo + 9, ponta + 1):
        c.p(x - 1, yy, "#8a96a8"); c.p(x, yy, "#e8f0f8"); c.p(x + 1, yy, "#5a6678")
    c.ret(x - 6, topo + 7, 13, 2, OURO[2]); c.ret(x - 6, topo + 7, 13, 1, OURO[0]); c.p(x - 7, topo + 8, OURO[3]); c.p(x + 7, topo + 8, OURO[3])
    c.ret(x - 1, topo + 1, 3, 6, "#6a3a1c"); c.ret(x - 1, topo + 2, 3, 1, OURO[3]); c.ret(x - 1, topo + 4, 3, 1, OURO[3])
    c.ret(x - 2, topo - 2, 5, 3, OURO[2]); c.p(x, topo - 1, "#e8304a"); c.p(x - 1, topo - 2, OURO[0])
    for yy in range(topo + 10, ponta - 2, 3):
        em.p(x, yy, "#fffbe0", 0.55)
    v.brilho(em, x, topo + 12, 3)


def bau(c: Camada, em: Camada, x0: int, base: int) -> None:
    """Baú aberto, transbordando: tampa abaulada para trás, cintas de latão, fechadura e o ouro de dentro aceso."""
    w, h = 38, 20
    topo = base - h
    # tampa aberta (atrás)
    for i in range(16):
        t = i / 15
        larg = w - 2
        c.ret(x0 + 1, topo - 4 - i, larg, 1, mistura("#5a3216", "#8a5226", 1 - t) if i % 4 else "#3d2010")
    c.ret(x0 + 1, topo - 20, w - 2, 1, "#b47a45")
    for bx in (x0 + 5, x0 + w // 2, x0 + w - 6):
        c.ret(bx - 1, topo - 20, 3, 17, OURO[3]); c.ret(bx - 1, topo - 20, 1, 17, OURO[1])
    # forro vermelho da tampa
    c.ret(x0 + 3, topo - 15, w - 6, 10, "#7a1424", 0.85)
    # o ouro de dentro
    for i in range(140):
        xx = x0 + 3 + hash01(i, 31) * (w - 7)
        u = (xx - x0 - w / 2) / (w / 2)
        yy = topo - 7 * (1 - u * u) + hash01(i, 32) * 5
        v.moeda(c, xx, yy, hash01(i, 33))
        if hash01(i, 34) > 0.9:
            em.p(xx, yy, "#fff6c0", 0.8)
    # caixa
    for i in range(h):
        c.ret(x0, topo + i, w, 1, "#8a5226" if i % 5 else "#4a2810")
    c.ret(x0, topo, w, 2, "#c8922a"); c.ret(x0, topo, w, 1, OURO[1]); c.ret(x0, base - 2, w, 2, "#7a5210")
    for bx in (x0, x0 + w // 2 - 1, x0 + w - 3):
        c.ret(bx, topo, 3, h, OURO[3]); c.ret(bx, topo, 1, h, OURO[1])
        for yy in (topo + 4, topo + 14):
            c.p(bx + 1, yy, OURO[0])
    c.ret(x0 + w // 2 - 3, topo + 3, 7, 8, OURO[2]); c.ret(x0 + w // 2 - 3, topo + 3, 7, 1, OURO[0]); c.ret(x0 + w // 2, topo + 6, 1, 3, "#1b1208")
    c.ret(x0 + w - 4, topo + 2, 4, h - 2, "#000000", 0.28)  # lado da sombra


def tocha(c: Camada, em: Camada, x: int, y: int, luzes: list) -> None:
    c.ret(x - 1, y, 3, 9, "#5a3a1c"); c.ret(x - 3, y - 1, 7, 2, "#8a8aa0"); c.ret(x - 2, y + 9, 5, 1, "#3a4660")
    for (dx, dy, cor) in ((0, -2, "#ffb030"), (-1, -3, "#ff8a20"), (0, -3, "#ffd860"), (1, -3, "#ff8a20"), (0, -4, "#fff2a0"), (-1, -5, "#ffb030"),
                          (0, -5, "#ffe070"), (0, -6, "#ffb030"), (1, -6, "#ff7a18"), (0, -8, "#ff9a28")):
        em.p(x + dx, y + dy, cor)
    luzes.append((x, y - 3, 46, 0.9, "#ff9a3c", 1.25))


def cena() -> "v.Image.Image":
    luzes: list = [(PICO[0], 92, 130, 0.62, "#ffc070", 0.6), (PICO[0], 66, 40, 0.9, "#fff0b8", 0.4), (446, 112, 40, 0.8, "#ffb850", 0.4), (250, 120, 90, 0.6, "#ff9a50", 0.25), (350, 134, 150, 0.3, "#ffc878", 0.45)]
    # ── A parede da câmara: rocha lavrada, com o relevo virado para o ouro.
    h_parede = v.relevo(311, 170, esticar=1.5, torcer=8)
    rampa = ["#0c0a10", "#16121a", "#221a22", "#32262c", "#463634", "#5e4a3e", "#7c6248"]
    parede = v.rocha_iluminada(h_parede, [(PICO[0], 96, 30, 1.2), (236, 58, 20, 0.5), (462, 58, 20, 0.5), (150, -30, 60, 0.18)], rampa, forca=2.4, base=0.1)
    dist = np.hypot((XS - PICO[0]) / 250, (YS - 100) / 150)
    parede *= np.clip(1.25 - dist * 0.7, 0.4, 1)[:, :, None]
    parede *= (0.72 + 0.4 * v.ruido(315, 34, 10))[:, :, None]
    fundo = Camada()
    fundo.mascara(np.ones((H, W), dtype=np.float32), parede)

    # ── Arquitetura: três nichos em arco com ouro guardado ao fundo, duas pilastras e a cornija do teto com a claraboia.
    arq = Camada()
    em = Camada()
    brilhos = Camada()
    for (ax, r) in ((268, 22), (352, 30), (436, 22)):
        ay = 64 if r > 25 else 70
        nicho = (v.elipse_m(ax, ay, r, r) * (YS <= ay)) + ((np.abs(XS - ax) <= r) & (YS > ay) & (YS < 128))
        arq.mascara(np.clip(nicho, 0, 1), "#07060a", 0.82)
        for y in range(int(ay - r - 6), int(ay) + 1):
            for x in range(int(ax - r - 6), int(ax + r + 7)):
                d = math.hypot(x - ax, y - ay)
                if r <= d < r + 5:
                    ang = math.atan2(ay - y, x - ax) / math.pi * 11
                    junta = abs(ang - round(ang)) < 0.1
                    fr = (d - r) / 5
                    arq.p(x, y, "#120e12" if junta else "#9a8468" if fr < 0.25 else "#3a2e30" if fr > 0.8 else mistura("#6a5646", "#52423a", hash01(int(ang), ax)))
        for lado in (-1, 1):
            arq.ret(ax + lado * r - (5 if lado < 0 else 0), ay, 5, 62, "#52423a")
            arq.ret(ax + lado * r - (5 if lado < 0 else 0) + (4 if lado < 0 else 0), ay, 1, 62, "#9a8468")
        # prateleiras de ouro no fundo do nicho, quase no escuro
        for i in range(46 if r > 25 else 26):
            xx = ax - r + 4 + hash01(i, ax) * (2 * r - 8)
            yy = 96 + hash01(i, ax + 1) * 26
            v.moeda(arq, xx, yy, hash01(i, ax + 2) * 0.6)
    arq.c[:, :, :3] *= np.where(arq.c[:, :, 3:4] > 0, 0.8, 1)
    for xx in range(W):  # cornija
        alt = 9 + (2 if (xx // 12) % 2 else 0)
        if not 334 <= xx <= 370:
            arq.ret(xx, 0, 1, alt, "#1a1418"); arq.p(xx, alt, "#5e4a3e"); arq.p(xx, alt + 1, "#2a2024")
    for px in (220, 312, 392, 474):  # pilastras entre os nichos
        for y in range(11, 132):
            for dx in range(9):
                fr = dx / 8
                cor = "#8a7458" if fr < 0.2 else "#2a2024" if fr > 0.8 else ("#5a4a40" if (y // 7) % 2 else "#64524a")
                arq.p(px - 4 + dx, y, "#161014" if y % 7 == 0 else cor)
        arq.ret(px - 6, 11, 13, 3, "#7c6a58"); arq.ret(px - 6, 11, 13, 1, "#b09a78")
    tocha(arq, em, 220, 60, luzes)
    tocha(arq, em, 474, 60, luzes)
    # estandartes vermelhos com o losango dourado, pendurados nas pilastras do meio
    for px in (312, 392):
        for y in range(16, 46):
            meia = 4 if y < 42 else 4 - (y - 41)
            arq.ret(px - meia, y, 2 * meia + 1, 1, "#8a1a2a" if (y // 3) % 2 else "#7a1424")
            arq.p(px - meia, y, "#c8922a"); arq.p(px + meia, y, "#c8922a")
        for (dx, dy) in ((0, -2), (-1, -1), (0, -1), (1, -1), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (0, 2)):
            arq.p(px + dx, 28 + dy, "#f4c64a")

    # ── O chão de pedra e as moedas espalhadas que vêm até a esquerda.
    chao = Camada()
    h_chao = v.relevo(321, 120, esticar=2.6, torcer=5, y0=126, y1=H)
    piso = v.rocha_iluminada(h_chao, [(PICO[0], 120, 22, 1.2), (220, 60, 30, 0.4)], ["#0e0a0c", "#1a1416", "#2a2020", "#3c2e28", "#544034", "#6e5640"], forca=2.0, base=0.1)
    chao.mascara((YS >= 128).astype(np.float32), piso)
    g = np.random.default_rng(331)
    for _ in range(520):
        xx = 96 + g.random() ** 0.55 * 390
        yy = 131 + g.random() * 27
        if g.random() < np.clip((xx - 90) / 200, 0.06, 1):
            v.moeda(chao, xx, yy, g.random())

    # ── A montanha: o monte do fundo (alto), os dois ombros e o patamar da frente, onde ficam os mascotes.
    tras = monte(PICO[0], 140, 150, 68, 5600, 341)
    ombro_e = monte(246, 144, 62, 26, 900, 343)
    ombro_d = monte(452, 142, 60, 34, 1100, 345)
    obj = Camada()
    espada(obj, brilhos, PICO[0], PICO[1] + 8)
    coroa(obj, 306, 96); taca(obj, 392, 92, 2, "#3a7aff"); taca(obj, 276, 112, 1); vaso(obj, 420, 104, 16); vaso(obj, 252, 122, 11)
    taca(obj, 330, 84, 1, "#2ec86a"); taca(obj, 374, 78, 1, "#a858e8")
    # escudo redondo encostado no monte
    for y in range(-8, 9):
        for x in range(-8, 9):
            d = math.hypot(x, y)
            if d <= 8:
                obj.p(318 + x, 112 + y, OURO[4] if d > 7 else OURO[3] if 4.5 < d < 5.5 else OURO[1] if (x + y) < -4 else OURO[2] if d > 2 else OURO[0])
    obj.p(316, 109, "#ffffff")
    bau(obj, brilhos, 428, 132)
    frente = monte(360, 162, 200, 37, 5200, 347, luz=(PICO[0], 100))
    # joias, colares de pérola e peças grandes por cima do ouro
    g = np.random.default_rng(351)
    for i in range(46):
        xx = 210 + g.random() * 262
        u = (xx - 360) / 200
        yy = 162 - 37 * (1 - u * u) ** 0.8 + 2 + g.random() ** 1.5 * 22
        if 268 < xx < 420 and yy < 132:  # o chão dos mascotes fica limpo de peças altas
            continue
        v.joia(frente, xx, yy, i, 1 if g.random() < 0.6 else 2)
    for i in range(34):
        u = g.random() * 2 - 1
        xx = PICO[0] + u * 140
        yy = 140 - 68 * (1 - u * u) ** 0.8 + 3 + g.random() * 30
        v.joia(tras, xx, yy, i + 3, 1 if g.random() < 0.7 else 2)
    for (x0p, y0p, n) in ((236, 136, 16), (404, 131, 12)):
        for k in range(n):
            frente.p(x0p + k * 2, y0p + round(math.sin(k / (n - 1) * math.pi) * 3), "#fff8f0" if k % 2 else "#d8d0e0")
    # cintilar do ouro: estrelas de 4 pontas nas cristas
    g = np.random.default_rng(361)
    for _ in range(30):
        u = g.random() * 2 - 1
        xx = PICO[0] + u * 150
        yy = 140 - 68 * (1 - u * u) ** 0.8 + g.random() ** 2 * 50
        v.brilho(brilhos, xx, yy, 1 + int(g.random() * 2.4))
    for _ in range(22):
        xx = 230 + g.random() * 245
        u = (xx - 360) / 200
        yy = 162 - 37 * (1 - u * u) ** 0.8 + 1 + g.random() * 26
        v.brilho(brilhos, xx, yy, 1 + int(g.random() * 1.6))
    # poeira dourada no ar
    poeira = Camada()
    for _ in range(170):
        xx, yy = 190 + g.random() * 290, 12 + g.random() * 116
        poeira.p(xx, yy, "#ffe8a0", 0.25 + g.random() * 0.6)
    # primeiro plano desfocado: pedras e moedas escuras nos cantos de baixo
    perto = Camada()
    for (cx, cy, rx, ry) in ((30, 168, 70, 22), (472, 172, 44, 20), (150, 174, 60, 14)):
        perto.elipse(cx, cy, rx, ry, "#0a0708")
    for i in range(60):
        v.moeda(perto, 438 + hash01(i, 71) * 44, 150 + hash01(i, 72) * 10, 0.2)

    # ── Montagem com luz.
    m = Montagem(np.zeros((H, W, 3), dtype=np.float32))
    m.camada(fundo, 1.7)
    m.camada(arq, 0.8)
    m.camada(chao, 0.3)
    m.camada(tras, 0.35, luz_k=0.5)
    m.camada(ombro_e, 0.2, luz_k=0.55)
    m.camada(ombro_d, 0.2, luz_k=0.55)
    m.camada(obj, 0, luz_k=0.6)
    m.camada(frente, 0, luz_k=0.62)
    # o feixe da claraboia: pousa no alto do monte e ilumina o que toca
    yy, xx = GYS / ESC, GXS / ESC
    fx, fy = 352, 0
    t = np.clip((yy - fy) / (PICO[1] + 30 - fy), 0, 1.4)
    centro = fx + (PICO[0] - fx) * t
    larg = 12 + 26 * t
    feixe = np.exp(-((xx - centro) / larg) ** 4 * 1.4)
    mancha = np.exp(-(((xx - PICO[0]) / 78) ** 2 + ((yy - 96) / 34) ** 2) * 1.5)
    mapa = (mancha * 0.42 + feixe * 0.2 * (yy > 60))[:, :, None] * hexa("#ffe0a0")
    m.iluminar("#54404a", luzes, mapa=mapa)
    faixas = 0.62 + 0.38 * np.sin((xx - centro) * 0.9 + 1.4) ** 2
    ar = feixe * faixas * np.clip(1.1 - t * 0.5, 0, 1)
    m.somar(v.desfocar(ar[:, :, None], 4)[:, :, 0], "#ffd890", 0.34)
    m.somar(v.desfocar(ar[:, :, None], 16)[:, :, 0], "#ffc870", 0.2)
    g = np.random.default_rng(371)
    for _ in range(1100):
        X, Y = int(g.random() * (W * ESC - 3)), int(g.random() * (H * ESC - 3))
        k = ar[Y, X] * (0.4 + g.random() * 0.9)
        if k > 0.08:
            m.img[Y:Y + 2, X:X + 2] += hexa("#ffe8b0") * k * 0.9
    # o ouro devolve a luz: leque dourado a partir do monte
    ang = np.arctan2(GYS - 104 * ESC, GXS - PICO[0] * ESC)
    r = np.hypot(GXS - PICO[0] * ESC, (GYS - 104 * ESC) * 1.25) / ESC
    leque = np.zeros_like(r)
    g = np.random.default_rng(381)
    for _ in range(15):
        a0 = -math.pi / 2 + g.normal(0, 0.75)
        leque += np.exp(-((ang - a0) / (0.03 + g.random() * 0.08)) ** 2) * (0.4 + g.random() * 0.7)
    leque *= np.exp(-r / 105) * np.clip((r - 10) / 18, 0, 1) * (GYS < 112 * ESC)
    m.somar(v.desfocar(leque[:, :, None], 3)[:, :, 0], "#ffc860", 0.42)
    m.somar(v.luz_pontual(PICO[0], 96, 80, 0.5), "#ffb848", 0.12)
    m.somar(v.luz_pontual(446, 108, 20, 0.7), "#fff0b0", 0.3)
    m.emissivo(em, 0.3, halo=1.4)
    m.emissivo(brilhos, 0, halo=0.5)
    m.emissivo(poeira, 0.3, halo=0.6)
    m.camada(perto, 5, escurecer=0.55)
    return m.acabar("#ffd8a0", "#1a1030", esquerda=0.42, centro_v=(0.72, 0.6), contraste=1.1, bloom=0.6)


def canto() -> "v.Image.Image":
    """O monte de ouro dos cantos da página Indicar (PNG transparente, 132 x 96 ampliado 3x): o mesmo ouro da cena,
    com taça, coroa, ânfora e pedras, para enfeitar as margens que ficavam vazias."""
    c = monte(40, 158, 96, 74, 1500, 77, luz=(70, 90))
    c.c[:, :, :3] *= 0.92
    f = monte(96, 160, 60, 40, 520, 91, luz=(70, 90))
    c.mascara(f.c[:, :, 3], f.c[:, :, :3])
    vaso(c, 20, 112, 15); taca(c, 58, 104, 2); coroa(c, 88, 128); taca(c, 112, 140, 1, "#3a7aff")
    g = np.random.default_rng(5)
    for _ in range(26):
        x, y = int(g.random() * 128), int(100 + g.random() * 58)
        if c.c[y, x, 3] > 0.5:
            cor = ("#e8304a", "#3a7aff", "#2ec86a", "#b45cff")[int(g.random() * 4)]
            c.ret(x, y, 2, 2, cor); c.p(x, y, "#ffffff")
    a = (np.clip(c.c[66:160, 0:132], 0, 1) * 255).astype(np.uint8)
    img = v.Image.fromarray(a, "RGBA")
    return img.resize((img.width * 3, img.height * 3), v.Image.NEAREST)


def main() -> None:
    img = cena()
    cn = canto()
    cn.save(v.PASTA_PAGINAS / "tesouro-canto.png", optimize=True)
    print("tesouro-canto", (v.PASTA_PAGINAS / "tesouro-canto.png").stat().st_size // 1024, "KB")
    v.PASTA_PAGINAS.mkdir(parents=True, exist_ok=True)
    for nome, tam, q in (("tesouro", None, 84), ("tesouro-960", (960, 320), 84)):
        destino = v.PASTA_PAGINAS / f"{nome}.webp"
        (img if tam is None else img.resize(tam, v.Image.LANCZOS)).save(destino, quality=q, method=6)
        print(nome, destino.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
