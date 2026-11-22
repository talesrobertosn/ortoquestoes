"""Ramo de pinho preso ao filete da mesa de Treinar. Uso: python scripts/natal/treinar.py."""
from __future__ import annotations

from guirlanda import MADEIRA, OURO, PINHO
from hd2d import ESC, Camada, h01, iluminar, pal, salvar_rgba, tom
from molduras_paginas import bagas, ramo

LARGURA, ALTURA = 79, 24
LATAO = pal("#342821", "#624937", "#896644", "#aa804d", "#c99f62", "#e1bf83", "#f3d9a7")


def pintar() -> None:
    cor = Camada()
    # O filete termina num pino. O ramo entra por baixo do aro, com a ponta voltada para o título.
    for x in range(25, LARGURA):
        cor.p(x, 19, LATAO[1], 0.48 if x < 32 else 0.76)
        cor.p(x, 18, tom(LATAO, 0.44 + h01(x, 18) * .28), min((x - 24) / 10, 1))
    cor.linha(72, 18, 72, 10, LATAO[2], 2)

    for x in range(71, 10, -1):
        y = 11 + (71 - x) // 15
        cor.p(x, y + 1, MADEIRA[2])
        cor.p(x, y, MADEIRA[4])
    for x, y, angulo, tamanho, lado in (
        (69, 11, -2.42, 15, -1), (60, 12, 2.67, 13, -1),
        (57, 12, -2.50, 17, 1), (47, 13, 2.84, 17, -1),
        (39, 13, -2.81, 15, 1), (31, 14, 2.95, 15, 1),
        (26, 14, -2.83, 16, 1), (64, 11, 2.31, 10, 1),
    ):
        ramo(cor, x, y, angulo, tamanho, lado)

    # Pontas jovens nas agulhas de cima e brilho nas bordas próximas do metal.
    for x, y in ((20, 9), (24, 7), (30, 10), (34, 12), (41, 10), (44, 7),
                 (47, 9), (51, 12), (55, 6), (58, 9), (62, 10)):
        if cor.c[y, x, 3]:
            cor.p(x, y, PINHO[7], .84)
    bagas(cor, 46, 11)
    bagas(cor, 50, 14)
    cor.bitmap(63, 7, (
        "..5..........", "..64.........", "...53...564..", "....52.5324..",
        ".....45324...", ".....5643....", "....53332....", "...532..432..",
        "..432....432.", ".433......32.",
    ), dict(zip("23456", pal("#551e23", "#773238", "#a74947", "#c66659", "#dd8772"))))
    # Sino de latão: argola, bojo, boca mais aberta e badalo preso sob a borda.
    cor.bitmap(69, 12, ("...5...", "..543..", "..65...", "..654..", ".67543.", "6754321", "533221.", "...3..."),
               dict(zip("1234567", OURO[1:])))
    cor.p(72, 20, LATAO[2], .60)

    # Luz difusa e um reflexo quente curto no latão e nas agulhas próximas.
    rgb, alfa, _ = iluminar(cor, Camada(), [], amb="#dce5de", amb_k=1.01,
                            extra=((69, 9, 28, "#ffd49d", .27, 1.0),), cruz=False)
    largura, altura = LARGURA * ESC, ALTURA * ESC
    salvar_rgba("treinar-ramo.png", rgb[:altura, :largura], alfa[:altura, :largura])


if __name__ == "__main__":
    pintar()
