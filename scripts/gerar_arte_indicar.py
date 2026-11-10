"""A arte da página Indique e ganhe fora da pintura do topo (Tales, 10/11/2026: "nenhuma arte pode ser simples; pixel
art riquíssimo em informação, em tudo"). Tudo pintado por código, pixel a pixel:

- o pilar de pedra das margens, em três peças (capitel com a arandela e as correntes, o fuste que se repete e a base
  com o tesouro derramado), com tijolo por tijolo, rachaduras, musgo, relevo de escamas, filetes e pedras de ouro, e a
  luz quente da tocha calculada sobre a pedra;
- a moldura de ouro lavrado dos blocos (para border-image de 9 fatias), com rebites, cantoneiras e rubis;
- a parede da caverna que forra o fundo da página (ladrilho que se repete);
- as moedas do placar (cheia e vazia).

Saída em public/pixel/paginas/indicar/. Rodar: python3 scripts/gerar_arte_indicar.py
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar_cena_tesouro as tz  # noqa: E402  (o monte de moedas, a taça, a coroa e a ânfora da cena)

PASTA = Path(__file__).resolve().parent.parent / "public" / "pixel" / "paginas" / "indicar"
ESCALA = 3
OURO = [(255, 246, 192), (255, 226, 122), (244, 198, 74), (216, 154, 42), (168, 102, 26), (106, 58, 16), (52, 28, 6)]
FERRO = [(150, 150, 160), (104, 104, 116), (70, 70, 82), (44, 44, 54), (24, 24, 32), (12, 12, 18)]


class Tela:
    def __init__(self, w: int, h: int) -> None:
        self.w, self.h = w, h
        self.c = np.zeros((h, w, 4), dtype=np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.c[y, x, :3] = np.array(cor[:3], dtype=np.float32) * a + self.c[y, x, :3] * (1 - a)
            self.c[y, x, 3] = max(self.c[y, x, 3], a)

    def ret(self, x, y, w, h, cor, a: float = 1.0) -> None:
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.p(xx, yy, cor, a)

    def imagem(self, escala: int = ESCALA) -> Image.Image:
        a = np.clip(self.c, 0, [255, 255, 255, 1]).copy()
        a[:, :, 3] *= 255
        img = Image.fromarray(a.astype(np.uint8), "RGBA")
        return img.resize((self.w * escala, self.h * escala), Image.NEAREST)


def mistura(c0, c1, t):
    return tuple(c0[i] + (c1[i] - c0[i]) * t for i in range(3))


def faixa_ouro(t: Tela, x: int, y: int, w: int, h: int, pedras: bool = True, seed: int = 0) -> None:
    """Friso de ouro lavrado: filete claro em cima, corpo em três tons, sulco, sombra embaixo, rebites e pedras."""
    for j in range(h):
        k = j / max(1, h - 1)
        cor = OURO[0] if j == 0 else OURO[1] if k < 0.3 else OURO[2] if k < 0.6 else OURO[3] if k < 0.85 else OURO[4]
        t.ret(x, y + j, w, 1, cor)
    t.ret(x, y + h, w, 1, OURO[6])
    t.ret(x, y - 1, w, 1, OURO[6])
    g = np.random.default_rng(seed)
    for i in range(x + 2, x + w - 2, 4):  # trançado: um ponto claro e um escuro alternados no meio do friso
        t.p(i, y + h // 2, OURO[0]); t.p(i + 1, y + h // 2 + 1, OURO[5]); t.p(i + 2, y + h // 2 - 1, OURO[4])
    if pedras and h >= 5:
        cores = [((232, 48, 74), (255, 170, 180), (120, 14, 30)), ((58, 122, 255), (180, 210, 255), (20, 50, 140)), ((46, 200, 106), (170, 255, 200), (14, 100, 50))]
        for n, cx in enumerate(range(x + 8, x + w - 6, 16)):
            base, luz, sombra = cores[(n + int(g.integers(0, 3))) % 3]
            t.ret(cx - 2, y + h // 2 - 2, 5, 5, OURO[6]); t.ret(cx - 1, y + h // 2 - 1, 3, 3, base)
            t.p(cx - 1, y + h // 2 - 1, luz); t.p(cx + 1, y + h // 2 + 1, sombra)


def pedra(t: Tela, x0: int, x1: int, y0: int, y1: int, seed: int, fase: int = 0, luz=None) -> None:
    """Alvenaria do fuste: fiadas de 12 px, tijolos de 26 px desencontrados, cada um com tom próprio, quina clara em
    cima e à esquerda, sombra embaixo e à direita, grão, lascas, rachaduras e musgo. O fuste é redondo: escurece nas
    bordas. `luz` (x, y, raio) soma a luz quente da tocha."""
    g = np.random.default_rng(seed)
    larg = x1 - x0
    for y in range(y0, y1):
        fiada = (y + fase) // 12
        dentro = (y + fase) % 12
        desloc = 13 if fiada % 2 else 0
        for x in range(x0, x1):
            col = (x - x0 + desloc) // 26
            dx = (x - x0 + desloc) % 26
            gt = np.random.default_rng(seed * 977 + fiada * 131 + col * 17)
            tom = 0.78 + 0.34 * gt.random()
            quente = gt.random() * 10
            cor = np.array([86 + quente, 70 + quente * 0.4, 62]) * tom
            if dentro == 0 or dx == 0:
                cor = np.array([20, 15, 14])  # junta
            elif dentro == 1 or dx == 1:
                cor = cor * 1.32  # quina iluminada
            elif dentro == 11 or dx == 25:
                cor = cor * 0.62  # quina na sombra
            else:
                cor = cor * (0.92 + 0.16 * g.random())  # grão da pedra
                if gt.random() < 0.3 and abs(dx - 13 - (dentro - 6) * (1 if gt.random() < 0.5 else -1)) < 1 and 3 < dentro < 10:
                    cor = cor * 0.5  # veio
            u = (x - x0 + 0.5) / larg * 2 - 1
            cor = cor * (0.34 + 0.66 * math.cos(u * 1.32) ** 1.5) * (1.12 if -0.55 < u < -0.3 else 1.0)
            if luz:
                d2 = (x - luz[0]) ** 2 + ((y - luz[1]) * 0.8) ** 2
                f = math.exp(-d2 / (2 * luz[2] ** 2))
                cor = cor * (0.62 + 1.25 * f) + np.array([70, 34, 6]) * f
            else:
                cor = cor * 0.62
            t.p(x, y, tuple(np.clip(cor, 0, 255)))
    # rachaduras que descem em zigue-zague
    for _ in range(max(1, (y1 - y0) // 40)):
        x, y = int(g.integers(x0 + 8, x1 - 8)), int(g.integers(y0, max(y0 + 1, y1 - 14)))
        for _ in range(int(g.integers(8, 20))):
            if y >= y1:
                break
            t.p(x, y, (10, 7, 8), 0.85); t.p(x + 1, y, (120, 96, 80), 0.25)
            y += 1; x += int(g.integers(-1, 2))
    # musgo nas juntas, mais do lado da sombra
    for _ in range((y1 - y0) * 2 // 3):
        x, y = int(g.integers(x0, x1)), int(g.integers(y0, y1))
        if (y + fase) % 12 in (0, 1, 11) and g.random() < 0.7:
            v = (40 + g.random() * 40)
            for k in range(int(g.integers(1, 4))):
                t.p(x + k, y, (v * 0.5, v * 1.3, v * 0.45), 0.8)
                if g.random() < 0.4:
                    t.p(x + k, y + 1, (v * 0.35, v, v * 0.3), 0.7)


def relevo_escamas(t: Tela, x0: int, x1: int, y0: int, y1: int) -> None:
    """Faixa esculpida com escamas de dragão em baixo-relevo, contornadas de ouro velho."""
    for y in range(y0, y1):
        for x in range(x0, x1):
            lin = (y - y0) // 5
            u = (x - x0 + (lin % 2) * 4) % 8 - 3.5
            v = (y - y0) % 5
            arco = abs(math.hypot(u, v - 0.5) - 3.6)
            if arco < 0.6:
                t.p(x, y, OURO[4], 0.9)
            elif arco < 1.3 and v > 1:
                t.p(x, y, (16, 11, 10), 0.55)
            elif v == 0 and abs(u) < 1.5:
                t.p(x, y, (190, 150, 110), 0.35)


def losango(t: Tela, cx: int, cy: int, r: int) -> None:
    """Medalhão: losango de ouro em degraus com rubi lapidado no centro."""
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            d = abs(dx) + abs(dy)
            if d <= r:
                cor = OURO[6] if d == r else OURO[0] if (d == r - 1 and dx + dy < 0) else OURO[4] if d == r - 1 else OURO[2] if d > r - 4 else OURO[5] if d == r - 4 else (150, 16, 34)
                if d < r - 4:
                    cor = (255, 150, 160) if dx + dy < -1 else (232, 48, 74) if dx - dy < 1 else (110, 10, 26)
                t.p(cx + dx, cy + dy, cor)
    t.p(cx - 1, cy - 2, (255, 255, 255))


def corrente(t: Tela, x: int, y0: int, n: int) -> None:
    """Corrente de ferro: elos de frente e de lado alternados, com brilho no alto de cada um."""
    y = y0
    for i in range(n):
        if i % 2 == 0:
            t.ret(x - 1, y, 3, 5, FERRO[4]); t.ret(x, y + 1, 1, 3, (0, 0, 0), 0.0)
            t.p(x - 1, y, FERRO[1]); t.p(x, y, FERRO[0]); t.p(x + 1, y + 4, FERRO[5]); t.p(x - 1, y + 2, FERRO[2]); t.p(x + 1, y + 2, FERRO[3])
            t.c[y + 1:y + 4, x, 3] = 0 if 0 <= x < t.w else 0
            y += 4
        else:
            t.ret(x, y, 1, 4, FERRO[2]); t.p(x, y, FERRO[0]); t.p(x, y + 3, FERRO[5])
            y += 3
    # o peso na ponta: um pingente de ouro
    t.ret(x - 1, y, 3, 3, OURO[2]); t.p(x - 1, y, OURO[0]); t.p(x + 1, y + 2, OURO[5]); t.p(x, y + 3, OURO[3]); t.p(x, y + 4, (232, 48, 74))


def arandela(t: Tela, cx: int, y: int) -> None:
    """A tocha de parede: espelho de ferro batido com rebites, braço em voluta, cesto de grades com as brasas."""
    t.ret(cx - 6, y + 6, 13, 26, FERRO[5]); t.ret(cx - 5, y + 7, 11, 24, FERRO[3])
    t.ret(cx - 5, y + 7, 11, 1, FERRO[1]); t.ret(cx - 5, y + 7, 1, 24, FERRO[2]); t.ret(cx + 5, y + 8, 1, 23, FERRO[5])
    for (dx, dy) in ((-4, 9), (4, 9), (-4, 28), (4, 28)):
        t.p(cx + dx, y + dy, FERRO[0]); t.p(cx + dx, y + dy + 1, FERRO[5])
    for j in range(10):  # voluta gravada no espelho
        a = j / 9 * math.pi * 1.6
        t.p(cx + round(math.cos(a) * (3 - j * 0.2)), y + 19 + round(math.sin(a) * (3 - j * 0.2)), OURO[3])
    # braço e cesto
    t.ret(cx - 1, y - 2, 3, 12, FERRO[4]); t.ret(cx - 1, y - 2, 1, 12, FERRO[1]); t.ret(cx - 2, y + 9, 5, 2, FERRO[2])
    for j in range(9):
        meia = 5 + j
        yy = y - 3 - j
        t.ret(cx - meia, yy, meia * 2 + 1, 1, FERRO[4] if j % 3 else FERRO[2])
        t.p(cx - meia, yy, FERRO[1]); t.p(cx + meia, yy, FERRO[5])
        for gx in range(-meia + 2, meia - 1, 4):  # grades por onde se vê a brasa
            t.p(cx + gx, yy, (255, 140, 30) if j % 3 else (255, 210, 90))
    yy = y - 12
    t.ret(cx - 14, yy, 29, 2, FERRO[2]); t.ret(cx - 14, yy, 29, 1, FERRO[0]); t.ret(cx - 15, yy - 1, 1, 3, FERRO[4]); t.ret(cx + 15, yy - 1, 1, 3, FERRO[5])
    g = np.random.default_rng(4)
    for x in range(cx - 12, cx + 13):  # as brasas no alto do cesto
        alt = int(g.integers(1, 4))
        for k in range(alt):
            t.p(x, yy - 1 - k, [(255, 240, 170), (255, 170, 50), (220, 80, 20), (120, 30, 10)][min(3, k + int(g.integers(0, 2)))])


def pilar():
    W, X0, X1 = 132, 28, 104
    luz = (66, 74, 40)
    # ----- capitel, arandela e correntes
    topo = Tela(W, 190)
    pedra(topo, X0, X1, 40, 190, 11, luz=luz)
    for (x, y, w, h, tom) in ((8, 4, 116, 8, 1.0), (12, 12, 108, 5, 0.8), (16, 17, 100, 4, 1.15), (22, 30, 88, 5, 0.9), (25, 35, 82, 5, 0.7)):
        for j in range(h):
            for i in range(w):
                u = (i + 0.5) / w * 2 - 1
                g = np.random.default_rng(x * 31 + j * 7 + i)
                v = (96 + 10 * g.random()) * tom * (0.4 + 0.6 * math.cos(u * 1.2)) * (1.3 if j == 0 else 0.6 if j == h - 1 else 1.0)
                topo.p(x + i, y + j, (v, v * 0.82, v * 0.72))
        topo.ret(x, y + h, w, 1, (14, 10, 10))
    for x in range(10, 122, 6):  # dentículos sob a laje do capitel
        topo.ret(x, 12, 3, 4, (120, 100, 88)); topo.p(x, 12, (170, 146, 126)); topo.ret(x + 3, 12, 1, 4, (30, 22, 20))
    faixa_ouro(topo, 18, 22, 96, 7, seed=3)
    relevo_escamas(topo, X0 + 4, X1 - 4, 44, 59)
    faixa_ouro(topo, X0, 61, X1 - X0, 3, pedras=False)
    corrente(topo, 14, 13, 13); corrente(topo, 117, 13, 17); corrente(topo, 22, 13, 7)
    arandela(topo, 66, 96)
    losango(topo, 66, 150, 11)
    for (dx, dy) in ((-20, 0), (20, 0)):  # cravos de ouro ao lado do medalhão
        topo.ret(66 + dx - 1, 150 + dy - 1, 3, 3, OURO[2]); topo.p(66 + dx - 1, 149 + dy, OURO[0]); topo.p(66 + dx + 1, 151 + dy, OURO[5])
    faixa_ouro(topo, X0, 172, X1 - X0, 4, pedras=False, seed=5)
    # ----- fuste que se repete (duas fiadas duplas: 48 px casam com o desencontro dos tijolos)
    meio = Tela(W, 48)
    pedra(meio, X0, X1, 0, 48, 23, fase=190 % 12)
    # ----- base: fuste, friso, plinto em degraus e o tesouro derramado
    base = Tela(W, 150)
    pedra(base, X0, X1, 0, 70, 37, fase=(190 + 48) % 12)
    relevo_escamas(base, X0 + 4, X1 - 4, 40, 55)
    faixa_ouro(base, X0 - 2, 60, X1 - X0 + 4, 6, seed=9)
    for (x, y, w, h, tom) in ((22, 68, 88, 6, 1.1), (16, 74, 100, 8, 0.85), (10, 82, 112, 10, 1.0), (4, 92, 124, 58, 0.7)):
        for j in range(h):
            for i in range(w):
                u = (i + 0.5) / w * 2 - 1
                g = np.random.default_rng(x * 13 + j * 5 + i * 3)
                v = (92 + 12 * g.random()) * tom * (0.4 + 0.6 * math.cos(u * 1.2)) * (1.3 if j == 0 else 1.0) * 0.72
                base.p(x + i, y + j, (v, v * 0.82, v * 0.72))
        base.ret(x, y + h, w, 1, (14, 10, 10))
    cam = tz.monte(66, 158, 74, 58, 900, 31, luz=(66, 90))
    frente = tz.monte(34, 160, 44, 30, 320, 47, luz=(66, 90))
    cam.mascara(frente.c[:, :, 3], frente.c[:, :, :3])
    tz.taca(cam, 96, 118, 2); tz.coroa(cam, 58, 112); tz.vaso(cam, 22, 132, 14); tz.taca(cam, 116, 146, 1, "#3a7aff")
    g = np.random.default_rng(8)
    for _ in range(40):
        x, y = int(g.integers(0, 132)), int(g.integers(104, 158))
        if cam.c[y, x, 3] > 0.5:
            cor = ("#e8304a", "#3a7aff", "#2ec86a", "#b45cff")[int(g.integers(0, 4))]
            cam.ret(x, y, 2, 2, cor); cam.p(x, y, "#ffffff")
    rec = cam.c[160 - 150:160, 0:132]
    a = rec[:, :, 3:4]
    base.c[:, :, :3] = rec[:, :, :3] * 255 * a + base.c[:, :, :3] * (1 - a)
    base.c[:, :, 3] = np.maximum(base.c[:, :, 3], a[:, :, 0])
    return topo, meio, base


def moldura() -> Tela:
    """Moldura de 9 fatias (48 x 48, cantos de 16): ouro lavrado em chanfro, rebites, cantoneiras com rubi."""
    N, B = 48, 16
    t = Tela(N, N)
    for i in range(N):
        for j in range(N):
            d = min(i, j, N - 1 - i, N - 1 - j)
            if d > 5:
                continue
            cima = (j == d and j <= i and j < N - 1 - i) or (i == d and i < j and i < N - 1 - j)
            cor = [OURO[6], OURO[1] if cima else OURO[4], OURO[2] if cima else OURO[3], OURO[3] if cima else OURO[5], OURO[5], OURO[6]][d]
            t.p(i, j, cor)
    for k in range(B, N - B, 4):  # rebites ao longo dos lados
        for (x, y) in ((k, 2), (k, N - 3), (2, k), (N - 3, k)):
            t.p(x, y, OURO[0]); t.p(x + (1 if y in (2, N - 3) else 0), y + (1 if x in (2, N - 3) else 0), OURO[6])
    for (cx, cy, sx, sy) in ((0, 0, 1, 1), (N - 1, 0, -1, 1), (0, N - 1, 1, -1), (N - 1, N - 1, -1, -1)):
        P = lambda a, b: (cx + sx * a, cy + sy * b)
        for a in range(0, 13):  # cantoneira: chapa em leque com recorte
            for b in range(0, 13 - a):
                borda = a + b >= 11 or a == 0 or b == 0
                cor = OURO[6] if borda else OURO[1] if a + b < 4 else OURO[2] if a + b < 8 else OURO[3]
                t.p(*P(a, b), cor)
        for a in range(2, 9, 2):
            t.p(*P(a, 1), OURO[0]); t.p(*P(1, a), OURO[0])
        for (a, b, cor) in ((3, 3, (120, 10, 26)), (4, 3, (232, 48, 74)), (3, 4, (232, 48, 74)), (4, 4, (232, 48, 74)), (5, 4, (110, 10, 26)), (4, 5, (110, 10, 26)), (5, 5, (110, 10, 26)), (3, 5, (232, 48, 74)), (5, 3, (232, 48, 74))):
            t.p(*P(a, b), cor)
        t.p(*P(3, 3), (255, 190, 200)); t.p(*P(2, 4), OURO[6]); t.p(*P(4, 2), OURO[6]); t.p(*P(6, 4), OURO[6]); t.p(*P(4, 6), OURO[6])
        for k in range(7, 15):  # voluta que sai da cantoneira pelos dois lados
            t.p(*P(k, 7 - (k - 7) // 3), OURO[1]); t.p(*P(7 - (k - 7) // 3, k), OURO[1])
            t.p(*P(k, 8 - (k - 7) // 3), OURO[5]); t.p(*P(8 - (k - 7) // 3, k), OURO[5])
    return t


def parede() -> Image.Image:
    """Parede da caverna (ladrilho de 104 x 72): blocos irregulares bem escuros, juntas, veios de ouro e musgo."""
    W, H = 104, 72
    t = Tela(W, H)
    g = np.random.default_rng(77)
    for y in range(H):
        fi = y // 18
        desl = (0, 26, 9, 39)[fi % 4]
        for x in range(W):
            col = ((x + desl) % W) // 26
            dx, dy = (x + desl) % 26, y % 18
            gt = np.random.default_rng(fi * 53 + col * 11)
            tom = 0.7 + 0.5 * gt.random()
            cor = np.array([30.0, 23.0, 19.0]) * tom
            if dy == 0 or dx == 0:
                cor = np.array([7.0, 5.0, 5.0])
            elif dy == 1 or dx == 1:
                cor *= 1.5
            elif dy == 17 or dx == 25:
                cor *= 0.6
            else:
                cor *= 0.88 + 0.24 * g.random()
            t.p(x, y, tuple(cor))
    for _ in range(9):  # veios de ouro na rocha
        x, y = int(g.integers(0, W)), int(g.integers(0, H))
        for _ in range(int(g.integers(3, 8))):
            t.p(x % W, y % H, (150, 106, 36), 0.7); t.p((x + 1) % W, y % H, (70, 46, 14), 0.5)
            x += int(g.integers(0, 2)); y += int(g.integers(-1, 2))
    for _ in range(26):
        x, y = int(g.integers(0, W)), int(g.integers(0, H))
        if y % 18 in (0, 1):
            t.p(x, y, (26, 52, 24), 0.8); t.p((x + 1) % W, y, (18, 38, 18), 0.7)
    return t.imagem().convert("RGB")


def moedas() -> Tela:
    """Moeda cheia (o dragão cunhado) e o encaixe vazio, 14 x 14 cada."""
    t = Tela(28, 14)
    for k, cheia in enumerate((True, False)):
        ox = k * 14
        for y in range(14):
            for x in range(14):
                d = math.hypot(x - 6.5, y - 6.5)
                if d > 6.9:
                    continue
                if cheia:
                    cor = OURO[6] if d > 5.9 else OURO[1] if (d > 4.8 and x + y < 12) else OURO[4] if d > 4.8 else OURO[2]
                    if d <= 4.8 and (x + y) % 5 == 0:
                        cor = OURO[1]
                else:
                    cor = (10, 7, 5) if d > 5.9 else (60, 44, 20) if (d > 4.8 and x + y > 14) else (20, 14, 8) if d > 4.8 else (30, 22, 12)
                t.p(ox + x, y, cor)
        if cheia:  # o "7" cunhado e o brilho
            for (x, y) in ((5, 4), (6, 4), (7, 4), (8, 4), (8, 5), (7, 6), (7, 7), (6, 8), (6, 9)):
                t.p(ox + x, y, OURO[5]); t.p(ox + x, y + 1, OURO[0], 0.5)
            t.p(ox + 3, 3, (255, 255, 255)); t.p(ox + 4, 2, (255, 255, 255))
    return t


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    topo, meio, base = pilar()
    for nome, tela in (("pilar-topo", topo), ("pilar-meio", meio), ("pilar-base", base), ("moldura", moldura()), ("moedas", moedas())):
        img = tela.imagem(1 if nome in ("moldura", "moedas") else ESCALA)
        img.save(PASTA / f"{nome}.png", optimize=True)
        print(nome, img.size, (PASTA / f"{nome}.png").stat().st_size // 1024, "KB")
    parede().save(PASTA / "parede.webp", quality=90, method=6)
    print("parede", (PASTA / "parede.webp").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
