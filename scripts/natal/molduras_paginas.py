"""Festão de canto para as molduras e ramo com neve para a borda pública."""
from __future__ import annotations

import math

from guirlanda import MADEIRA, OURO, PINHO, VERMELHO
from hd2d import ESC, Camada, h01, iluminar, pal, salvar_rgba, tom

LARGURA, ALTURA = 120, 39
NEVE = pal("#617a88", "#8198a7", "#a4b7bf", "#c5d4d5", "#e4e8e0", "#f3f2e7")


def ramo(c: Camada, x: int, y: int, ang: float, tamanho: int, polar: int) -> None:
    dx, dy = math.cos(ang), math.sin(ang)
    px, py = x + dx * tamanho, y + dy * tamanho
    c.linha(x, y + 1, px, py + 1, MADEIRA[2])
    c.linha(x, y, px, py, MADEIRA[5])
    for n in range(1, tamanho):
        cx, cy = x + n * dx, y + n * dy
        largura = 1.1 + 3.1 * (1 - n / tamanho)
        for lado in (-1, 1):
            fim_x, fim_y = cx - dx * largura - lado * dy * largura, cy - dy * largura + lado * dx * largura
            luz = 0.56 + 0.12 * polar - 0.10 * lado + (h01(x, n, lado) - 0.5) * 0.30
            c.linha(cx, cy + 1, fim_x, fim_y + 1, tom(PINHO, luz - 0.22))
            c.linha(cx, cy, fim_x, fim_y, tom(PINHO, luz))
            if (n + x) % 3:
                c.p(fim_x, fim_y, tom(PINHO, luz + 0.14))


def laco(c: Camada, x: int, y: int) -> None:
    c.bitmap(x - 6, y, [
        ".76.......65.", "7642.....546.", "64324...5424.", ".36546545333.", "..356546433..",
        "....34535....", "...654.543...", "..543...543..", ".543.....543.", ".4........43.", "...........3.",
    ], dict(zip("1234567", VERMELHO[1:])))


def bagas(c: Camada, x: int, y: int) -> None:
    c.bitmap(x - 2, y, (".7.5.", "56543", ".434."), dict(zip("34567", VERMELHO[3:])))


def bracadeira(c: Camada, x: int, y: int) -> None:
    c.ret(x, y, 2, 5, MADEIRA[2])
    c.ret(x, y, 1, 5, OURO[4])
    c.p(x, y, OURO[-1])


def pintar_neve(c: Camada) -> None:
    """Neve inclinada com borda quebrada e rastros de gelo sob o beiral."""
    for inicio, fim, profundidade in ((6, 29, 3), (38, 56, 2), (69, 94, 3), (103, 113, 2)):
        for x in range(inicio, fim):
            y = 2 + int(round(0.14 * (x - inicio))) % 3
            h = profundidade - (x == inicio or x == fim - 1)
            for j in range(h):
                valor = 0.78 - 0.25 * j + (h01(x, j, 65) - 0.5) * 0.26
                c.p(x, y + j, tom(NEVE, valor))
            if h01(x, 67) > 0.84:
                c.p(x, y + h, NEVE[1], 0.81)


def coroa(c: Camada, x: int, y: int) -> None:
    for dy in range(-9, 10):
        for dx in range(-10, 11):
            r = math.hypot(dx, 1.15 * dy)
            grao = h01(dx, dy, 34)
            if 4.2 < r < 8.7 + (grao - 0.5) * 1.6:
                perfil = 1 - abs(r - 6.4) / 3
                c.p(x + dx + 1, y + dy + 2, "#0d2119", 0.52)
                tom_folha = 0.38 - (dx + dy) * 0.014 + perfil * 0.24 + (grao - 0.45) * 0.32
                c.p(x + dx, y + dy, tom(PINHO, tom_folha))
    for i in range(13):
        a = math.tau * i / 13
        bx, by = round(x + 6.2 * math.cos(a)), round(y + 5.5 * math.sin(a))
        ramo(c, bx, by, a + 0.81, 4 + i % 2, 1 if i > 7 else -1)
    # Abre o centro depois de entrelaçar as agulhas, deixando a moldura aparecer pelo anel.
    for dy in range(-3, 4):
        for dx in range(-4, 5):
            if dx * dx + 1.18 * dy * dy < 12:
                c.c[y + dy, x + dx] = 0
    bagas(c, x - 6, y - 4)
    c.p(x + 5, y + 2, VERMELHO[5])
    c.p(x + 4, y + 2, VERMELHO[7])
    laco(c, x, y + 5)


def pintar(publico: bool) -> Camada:
    c = Camada()
    for x in range(7, 114):
        y = 6 + round(4 * math.sin((x - 7) / 107 * math.pi))
        c.p(x, y + 2, MADEIRA[0], 0.66)
        c.p(x, y, MADEIRA[3])
        c.p(x, y + 1, MADEIRA[1])
    for i, x in enumerate(range(10, 113, 7)):
        y = 6 + round(4 * math.sin((x - 7) / 107 * math.pi))
        ramo(c, x, y + 1, math.radians(165 if i % 2 == 0 else 17), 8 + i % 3, -1)
        ramo(c, x, y - 1, math.radians(-151 if i % 2 == 0 else -18), 7 + i % 3, 1)
    bracadeira(c, 8, 3)
    bracadeira(c, 109, 3)
    for x, y in ((27, 7), (47, 12), (68, 8), (105, 8)):
        bagas(c, x, y)
    if publico:
        pintar_neve(c)
        laco(c, 84, 9)
    else:
        bracadeira(c, 89, 7)
        c.linha(90, 10, 90, 14, OURO[3])
        coroa(c, 90, 22)
    return c


def main() -> None:
    for publico, nome in ((False, "moldura-festao-coroa"), (True, "borda-publica-festao-neve")):
        c = pintar(publico)
        rgb, alfa, _ = iluminar(c, Camada(), [], amb="#d5dfeb", amb_k=0.96, cruz=False,
                               extra=[(49, -24, 100, "#ffe2ab", 0.49, 1.0)])
        limite = (slice(0, ALTURA * ESC), slice(0, LARGURA * ESC))
        salvar_rgba(f"{nome}.png", rgb[limite], alfa[limite])


if __name__ == "__main__":
    main()
