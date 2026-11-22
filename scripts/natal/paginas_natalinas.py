"""Pinho, madeira, lã, latão e chocolate para o salão, o menu e o placar.

Cada peça usa a grade das cenas e conserva a luz local de seus emissores.
Uso: python3 scripts/natal/paginas_natalinas.py
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image

from hd2d import SAIDA, Camada, ampliar, camada_de_luz, desfocar, h01, hexa, iluminar, luz_pontual, pal
from gerar_cena_inicio import ESC, H, W, XA, YA

PINHO = pal("#12241b", "#1b3726", "#284b31", "#3a6540", "#4a7a49", "#689459", "#89ac65")
RUBI = pal("#2b1018", "#491823", "#68202c", "#8c303a", "#b14047", "#cd5455", "#ed7970")
VERDE = pal("#10282b", "#1c3c3f", "#285852", "#36766a", "#538c7b", "#76ac93", "#a9c8a5")
LINHO = pal("#47382b", "#6c5941", "#948160", "#b4a17a", "#d2bf97", "#e9d8b2", "#fff1cd")
OURO = pal("#2e2218", "#563c23", "#805d35", "#ae8347", "#cda15e", "#e8c582", "#f5daa2")
MADEIRA = pal("#1f1816", "#372620", "#50362a", "#694830", "#8d603a", "#ad7845", "#c19260")
LUZES = ("#ffd586", "#ff927f", "#a2e6b0")
Ponto = tuple[int, int, str]


def bitmap(c: Camada, x: int, y: int, linhas: tuple[str, ...], cores) -> None:
    c.bitmap(x, y, linhas, {str(i): cor for i, cor in enumerate(cores)})


def graveto(c: Camada, x: int, y: int, i: int) -> None:
    """Agulhas em leque, com talo torcido e o broto mais novo na ponta."""
    for dy in range(-2, 3):
        tom = round(3.5 - 0.8 * dy + 2.2 * (h01(x, y + dy, i) - 0.5))
        c.p(x, y + dy, PINHO[min(6, max(tom, 0))])
    if h01(x, y, 3) > 0.38:
        c.p(x + 1, y - 3, PINHO[5 + (x % 5 == 0)])
        c.p(x + 2, y - 2, PINHO[3])
    if h01(x, y, 18) > 0.65:
        c.p(x - 1, y + 3, PINHO[2])
    if h01(x, y, 54) > 0.87:
        c.p(x, y - 1, RUBI[6])
        c.p(x + 1, y, RUBI[3])


def lampada(c: Camada, e: Camada, x: int, y: int, cor: str) -> Ponto:
    vidro = hexa(cor)
    c.p(x, y - 2, MADEIRA[1])
    c.p(x, y - 1, OURO[3])
    c.p(x - 1, y, vidro * 0.58)
    c.p(x, y, vidro)
    c.p(x + 1, y, vidro * 0.72)
    c.p(x, y + 1, vidro * 0.67)
    e.p(x, y, cor, 0.86)
    e.p(x, y + 1, cor, 0.47)
    return x, y, cor


def festao(c: Camada, e: Camada, a: int, b: int, ya: int, yb: int, i: int, queda: float = 6) -> list[Ponto]:
    pontos = []

    def y_em(x: int) -> int:
        t = (x - a) / (b - a)
        return round(ya + (yb - ya) * t + queda * math.sin(math.pi * t))

    for x in range(a, b + 1):
        graveto(c, x, y_em(x), i)
    for x in (a, b):
        c.p(x, y_em(x) - 4, OURO[5])
        c.p(x, y_em(x) - 3, OURO[2])
    for n, x in enumerate(range(a + 6, b - 3, 8)):
        pontos.append(lampada(c, e, x, y_em(x) + 2, LUZES[(i + n) % len(LUZES)]))
    return pontos


def laco(c: Camada, x: int, y: int) -> None:
    bitmap(c, x - 6, y - 3, (
        ".6.......5...", "465.....564..", ".456...563...", "..4564653....",
        "...34665.....", "....45334....", "...452.342...", "...34...32...",
        "..343....32..", "..3.2.....2..",
    ), RUBI)


def coroa(c: Camada, e: Camada, x: int, y: int) -> list[Ponto]:
    """Pinho em anel, na moldura da estante, preso por uma fita e um gancho."""
    c.ret(x - 1, y - 18, 3, 7, RUBI[3])
    c.p(x - 1, y - 18, OURO[5])
    dx, dy = XA - x, YA - y
    ang = np.arctan2(dy, dx)
    raio = np.hypot(dx, dy * 1.12)
    vento = np.sin(ang * 13 + raio * 0.7)
    m = (raio > 6.3) & (raio < 13.6 + vento * 1.2)
    sombra = (raio < 8) * 1.5
    tom = np.clip((4.7 - dy * 0.13 - dx * 0.10 + vento - sombra).astype(int), 0, 6)
    c.mascara(m, PINHO[tom])
    for a in np.linspace(0, math.tau, 26, endpoint=False):
        bx = x + math.cos(a) * 14.9
        by = y + math.sin(a) * 13.1
        c.p(bx, by, PINHO[3 + (by < y)])
    for ox, oy in ((-10, -3), (1, -9), (10, -6), (9, 7), (-9, 5)):
        c.p(x + ox, y + oy, RUBI[6])
        c.p(x + ox + 1, y + oy, RUBI[4])
        c.p(x + ox, y + oy + 1, RUBI[2])
    laco(c, x, y + 10)
    return [lampada(c, e, x + ox, y + oy, "#ffda91") for ox, oy in ((-10, 1), (8, -7), (11, 5))]


def meia(c: Camada, x: int, y: int, pano, invertida: bool = False) -> None:
    linhas = (
        "..5665..", "..4542..", "...554..", "...453..", "...543..",
        "...542..", "...541..", "...542..", "...5442.", "...54332",
        "..654432", ".655433.", ".54332..", "..322...",
    )
    c.p(x + 4, y - 1, OURO[3])
    for dy, linha in enumerate(linhas):
        for dx, ch in enumerate(linha[::-1] if invertida else linha):
            if ch == ".":
                continue
            tom = int(ch)
            cores = LINHO if dy <= 1 else pano
            if dy in (4, 6) and dx in (3, 4, 5):
                cores, tom = LINHO, 4 + (dx % 2)
            c.p(x + dx, y + dy, cores[tom])


def xicara(c: Camada, x: int, y: int) -> None:
    """Pires dourado, cerâmica esmaltada, chocolate e vapor em fitas."""
    c.mascara(((XA - x) / 8.0) ** 2 + ((YA - y - 0.8) / 2.3) ** 2 < 1, "#2b211b", a=0.52)
    c.mascara(((XA - x) / 7.0) ** 2 + ((YA - y + 0.5) / 1.9) ** 2 < 1, OURO[3])
    c.ret(x - 4, y - 1, 9, 1, OURO[5])
    bitmap(c, x - 5, y - 9, (
        ".4566541....", "656543322...", "6599983244..", ".6565443245.",
        ".6565442.43.", ".655433243..", "..65432124..", "..543212....",
        "...3212.....",
    ), [*RUBI, hexa("#e4a774"), hexa("#74462b"), hexa("#38201c")])
    c.p(x - 3, y - 8, LINHO[5])
    c.p(x - 2, y - 6, OURO[5], 0.75)
    c.p(x - 3, y - 5, OURO[5], 0.65)
    for dx, dy, a in ((0, -11, 0.76), (0, -12, 0.67), (-1, -13, 0.57), (-2, -14, 0.45), (-2, -15, 0.52),
                      (-1, -16, 0.43), (0, -17, 0.31), (1, -18, 0.26), (1, -19, 0.19), (0, -20, 0.15),
                      (3, -14, 0.19), (4, -15, 0.3), (4, -16, 0.22)):
        c.p(x + dx, y + dy, "#f2d8b3", a)


def render(c: Camada, e: Camada, pontos: list[Ponto], amb: str, k: float) -> tuple[np.ndarray, np.ndarray]:
    rgb, alfa, _ = iluminar(c, e, pontos, amb=amb, amb_k=k, raio_lamp=5.5, cruz=False)
    return rgb, alfa


def salvar(nome: str, rgb: np.ndarray, alfa: np.ndarray, b: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = (p * ESC for p in b)
    img = np.dstack([rgb, alfa])[y0:y1, x0:x1]
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(SAIDA / nome, optimize=True)


def biblioteca() -> None:
    c, e = Camada(), Camada()
    pontos = []
    # Fixa o verde na cornija em perspectiva da estante da direita.
    for i, (a, b, ya, yb) in enumerate(((391, 420, 51, 44), (420, 449, 44, 39), (449, 479, 39, 31))):
        pontos.extend(festao(c, e, a, b, ya, yb, i, 4.0))
    pontos.extend(coroa(c, e, 454, 57))
    meia(c, 360, 132, RUBI, True)
    meia(c, 372, 132, VERDE)
    xicara(c, 378, 127)
    # A madeira recebe a outra metade da luz de cada vidro, no mesmo plano.
    rebote = np.zeros((H * ESC, W * ESC, 3), np.float32)
    for x, y, cor in pontos:
        rebote += luz_pontual(x, y + 3, 12.0, 0.86)[:, :, None] * hexa(cor) * 0.27
    em = ampliar(e.c)
    emi = em[:, :, :3] * em[:, :, 3:4]
    rebote += emi * 0.42 + desfocar(emi, 7) * 0.56
    e.c[:, :, 3] *= 0.67
    for nome, amb, k in (("manha", "#d4ac82", 0.96), ("tarde", "#dc9874", 0.87), ("noite", "#8092ac", 0.72)):
        rgb, a = render(c, e, pontos, amb, k)
        salvar(f"biblioteca-{nome}.png", rgb, a, (0, 0, W, 180))
    cor, alfa = camada_de_luz(rebote, janela_x=False, janela_y=False, ganho=0.92, teto=0.55)
    salvar("biblioteca-luz.png", cor, alfa, (0, 0, W, 180))


def menu() -> None:
    c, e = Camada(), Camada()
    largura, altura = 120, 24
    for x in range(largura):
        for y in range(altura):
            tom = 2 + (y % 8 in (0, 1)) - (y % 8 == 7)
            tom += int(h01(x // 4, y, 81) > 0.62)
            c.p(x, y, MADEIRA[tom])
    pontos = []
    for i in range(3):
        pontos.extend(festao(c, e, i * 40, (i + 1) * 40, 5, 5, i, 5))
    for x in (20, 60, 100):
        laco(c, x, 14)
    rgb, alfa = render(c, e, pontos, "#ab9190", 0.79)
    salvar("menu-festao.png", rgb, alfa, (0, 0, largura, altura))

    c, e = Camada(), Camada()
    # O relógio de mesa cabe no nicho com a vela sobre o ressalto de latão.
    cx, cy = 34, 28
    c.ret(18, 27, 32, 15, MADEIRA[2])
    c.ret(15, 39, 39, 3, MADEIRA[4])
    c.ret(13, 42, 43, 2, MADEIRA[2])
    c.ret(19, 23, 29, 1, MADEIRA[5])
    c.ret(21, 24, 25, 1, OURO[4])
    d = np.hypot(XA - cx, YA - cy)
    c.mascara(d < 13, OURO[np.clip((4.4 + (cx - XA) * 0.13 + (cy - YA) * 0.18).astype(int), 1, 6)])
    c.mascara(d < 10.5, "#754a2f")
    c.mascara(d < 9, LINHO[np.clip((5 + (cy - YA) * 0.12 + (cx - XA) * 0.10).astype(int), 1, 6)])
    for i in range(12):
        t = math.tau * i / 12
        c.p(cx + math.sin(t) * 7.7, cy - math.cos(t) * 7.7, MADEIRA[1 if i % 3 == 0 else 3])
    c.ret(43, 18, 11, 2, OURO[4])
    c.ret(46, 11, 5, 7, LINHO[3])
    c.ret(46, 11, 2, 6, LINHO[5])
    c.p(50, 13, LINHO[4])
    c.p(48, 10, MADEIRA[1])
    bitmap(c, 46, 4, ("..5..", ".65..", ".654.", ".645.", "..4.."), OURO)
    e.p(48, 7, "#fff2b2")
    e.p(47, 7, "#ffbd64", 0.75)
    rgb, alfa = render(c, e, [(48, 8, "#ffd18a")], "#c6a391", 0.93)
    salvar("menu-relogio.png", rgb, alfa, (0, 0, 62, 46))
    luz = luz_pontual(48, 10, 18, 0.92)[:, :, None] * hexa("#ffd18a") * 0.47
    cor, a = camada_de_luz(luz, janela_x=False, janela_y=False, ganho=0.78, teto=0.54)
    salvar("menu-relogio-luz.png", cor, a, (0, 0, 76, 48))


def placar() -> None:
    c, e = Camada(), Camada()
    xicara(c, 15, 24)
    rgb, alfa = render(c, e, [], "#ffd9be", 1.29)
    salvar("placar-chocolate.png", rgb, alfa, (5, 3, 26, 28))


if __name__ == "__main__":
    biblioteca()
    menu()
    placar()
