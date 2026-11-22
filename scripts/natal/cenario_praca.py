#!/usr/bin/env python3
"""Praça do Pinheiro enfeitada, na grade de 480 × 200 da pintura original.

O festão cruza o portão entre os beirais. O pinheiro conserva seus galhos e
o carrinho à direita vira uma barraca de castanhas e chocolate quente.
Uso: python3 scripts/natal/cenario_praca.py [manha|tarde|noite]
"""
from __future__ import annotations

import math
import sys
from types import FunctionType

import numpy as np
from PIL import Image

from hd2d import Camada, hexa, pal
from cenarios import inicio_praca as praca

X, Y = praca.XA, praca.YA
PINHO = pal("#0b2219", "#153326", "#214737", "#346047", "#4c7c55", "#659564", "#87a772")
VELUDO = pal("#3c1021", "#59182b", "#7a2434", "#a63343", "#c44550", "#e2686c", "#f68e80")
OURO = pal("#4b321b", "#72502a", "#9f6f37", "#c09149", "#dfae55", "#efca79", "#f9e2ae")
CREME = pal("#72695e", "#908071", "#b0a08b", "#c8b69c", "#dcc9ac", "#f0ddbb", "#fff0d5")
COBRE = pal("#332320", "#58382e", "#785144", "#996854", "#b98666", "#d6a47d", "#f2c29e")
FRIOS = pal("#253d43", "#32535a", "#3e6e70", "#518683", "#67a49e", "#83bcb3", "#b0dbd0")
FERRO = pal("#1a202c", "#283345", "#394659", "#4d5d70", "#637588", "#8495a2", "#abb8c0")
VIDROS = ((OURO, "#ffd58a"), (VELUDO, "#ff8986"), (FRIOS, "#a3e3cd"))
Luz = tuple[int, int, str, float, float]


def amostras(paleta: np.ndarray) -> dict:
    return {str(i): cor for i, cor in enumerate(paleta)}


def espalhar_luz(e: Camada, receptor: Camada, luzes: list[Luz], ganho: float) -> None:
    """Reflexo difuso multiplicado pelo pigmento das superfícies junto à origem.

    A montagem da Praça soma a emissão em RGB antes do bloom. O mesmo plano
    recebe o reflexo de baixa intensidade, sem retirar luz das janelas.
    """
    difusa = np.zeros_like(receptor.c[:, :, :3])
    for x, y, cor, raio, forca in luzes:
        d = ((X - x) / raio) ** 2 + ((Y - y) / (raio * 0.78)) ** 2
        queda = np.maximum(0, np.exp(-2.2 * d) - 0.035)
        difusa += queda[:, :, None] * hexa(cor) * (forca * ganho)
    difusa *= receptor.c[:, :, :3] * receptor.c[:, :, 3:4]
    mascara = difusa.max(2) > 0.002
    e.c[mascara, :3] = difusa[mascara] + e.c[mascara, :3] * e.c[mascara, 3:4]
    e.c[mascara, 3] = 1


def laco(c: Camada, x: int, y: int, virado: bool = False) -> None:
    """Veludo torcido no nó, debrum e duas caudas em alturas diferentes."""
    tiras = [
        "  43       322 ",
        " 56443   456321",
        "454253357563411",
        " 4522446543210 ",
        "  4332544321   ",
        "     4432231   ",
        "    432  3321  ",
        "   542   4321  ",
        "   421    321  ",
        "   1      421  ",
        "          1 1  ",
    ]
    c.bitmap(x - 7, y - 3, [linha[::-1] for linha in tiras] if virado else tiras, amostras(VELUDO))
    c.p(x - 5, y - 2, VELUDO[6])
    c.p(x + 4, y - 1, VELUDO[5])


def bola(c: Camada, x: int, y: int, paleta: np.ndarray) -> None:
    c.p(x, y - 3, OURO[4])
    c.bitmap(x - 2, y - 2, [" 563 ", "56531", "65420", " 320 ", "  1  "], amostras(paleta))


def lampada(c: Camada, e: Camada, x: int, y: int, tipo: int, potencia: float) -> Luz:
    vidro, cor = VIDROS[tipo]
    c.p(x, y - 2, FERRO[2])
    c.bitmap(x - 1, y - 1, ["432", " 2 "], amostras(FERRO))
    c.bitmap(x - 1, y + 1, [" 3 ", "540", "652", "431", " 2 "], amostras(vidro))
    e.p(x - 1, y + 3, vidro[6], potencia * 0.8)
    e.p(x, y + 3, cor, potencia * 0.72)
    e.p(x, y + 2, vidro[5], potencia * 0.44)
    return x, y + 3, cor, 13, 0.45


def festao(c: Camada, e: Camada, x0: float, y0: float, x1: float, y1: float,
           potencia: float) -> list[Luz]:
    def altura(x: float) -> float:
        t = (x - x0) / (x1 - x0)
        return y0 + (y1 - y0) * t + 11.5 * math.sin(math.pi * t)

    for x in range(int(x0), int(x1) + 1):
        y = altura(x)
        c.p(x, y + 2, PINHO[0], 0.84)
        c.p(x, y + 1, PINHO[1])
        c.p(x, y, PINHO[2 + int(praca.h01(x, 38) > 0.58)])
        if x % 3:
            c.p(x, y - 1, PINHO[2])
        if x % 7 < 3:
            c.p(x, y + 3, PINHO[1], 0.75)
    for x in range(int(x0) + 2, int(x1) - 1, 2):
        y = altura(x)
        direcao = -1 if x < (x0 + x1) / 2 else 1
        for lado in (-1, 1):
            dx = direcao * (2 + 2.5 * praca.h01(x, lado, 28))
            dy = lado * (1.5 + 2.4 * praca.h01(x, lado, 63))
            k = 3 + int(praca.h01(x, lado, 67) > 0.5)
            c.linha(x, y, x + dx, y + dy, PINHO[k])
            c.p(x + dx, y + dy, PINHO[k + int(x % 4 == 2)])
        if x % 6 == 0:
            c.p(x, y + 1, PINHO[5])
            c.p(x + 1, y + 2, PINHO[3])
        if x % 10 == 6:
            c.linha(x, y + 1, x + direcao * 2, y + 4, PINHO[2])
            c.p(x + direcao * 3, y + 4, PINHO[4])
    for x in (x0, x1):
        y = altura(x)
        c.ret(x - 1, y - 2, 2, 2, FERRO[3])
        c.p(x, y - 2, FERRO[6])
        c.p(x, y, OURO[4])

    for x in (228, 249, 255, 288, 299, 324):
        y = round(altura(x))
        c.p(x, y - 1, VELUDO[5])
        c.p(x - 1, y, VELUDO[4])
        c.p(x + 1, y, VELUDO[6])

    luzes = []
    for x, tipo in ((219, 0), (227, 1), (244, 2), (253, 0), (262, 1), (282, 0),
                    (291, 2), (300, 1), (317, 0), (325, 2)):
        luzes.append(lampada(c, e, x, round(altura(x)) + 2, tipo, potencia))
    for x, dy, paleta in ((248, 2, VELUDO), (258, 1, OURO), (286, 3, VELUDO), (303, 2, OURO)):
        bola(c, x, round(altura(x)) + dy, paleta)
    for x in (236, 273, 309):
        laco(c, x, round(altura(x)) + 2, virado=x == 309)
    return luzes


def pinheiro(c: Camada, e: Camada, casas: Camada, per: dict, potencia: float) -> list[tuple]:
    arvore, emissao = Camada(), Camada()
    antigos = dict(per, luzes_k=min(1, per["luzes_k"] * 1.38))
    pontos = praca.pinheiro_praca(arvore, emissao, antigos)
    silhueta_inferior = arvore.c[113:, :, 3].copy()
    x, base = praca.PINHEIRO
    topo = base - 103
    # A coroa maior fica acima da copa. Na área de pouso, a geometria,
    # a posição das bolas antigas e a base da árvore são as da pintura original.
    arvore.ret(x, topo + 3, 2, 5, OURO[0])
    arvore.p(x, topo + 4, OURO[4])
    emissao.c[topo - 4:topo + 4, x - 3:x + 4] = 0
    arvore.bitmap(x - 6, topo - 7, [
        "      4      ",
        "      6      ",
        "     564     ",
        "     564     ",
        "    45642    ",
        "6545566544321",
        "  564654432  ",
        "   6546432   ",
        "   4564321   ",
        "  5654 4210  ",
        " 645     310 ",
        " 43       20 ",
    ], amostras(OURO))
    emissao.p(x, topo, "#fff2bc", potencia * 0.95)
    emissao.p(x, topo - 1, "#ffdaa0", potencia * 0.78)
    luzes = [(x, topo, "#ffd58a", 20, 0.82)]
    for ox, y, paleta in ((-3, 74, VELUDO), (6, 83, OURO), (-10, 94, COBRE),
                          (2, 96, VELUDO), (14, 106, FRIOS), (-14, 108, OURO)):
        bola(arvore, x + ox, y, paleta)
    for ya, largura, fase in ((69, 6, 0.8), (85, 12, 1.2), (100, 16, 0.6), (118, 23, 0.9), (136, 28, 1.1)):
        for dx in range(-largura, largura + 1):
            t = (dx + largura) / (largura * 2)
            y = round(ya + 4 * t + 2 * math.sin(math.pi * t + fase))
            xx = x + dx
            if arvore.c[y, xx, 3] < 1:
                continue
            em_pouso = y >= 112
            arvore.p(xx, y, OURO[(1 if em_pouso else 2) + (2 if dx % 3 == 0 else 0)])
            if dx % 6 == 1 and (not em_pouso or arvore.c[y + 1, xx, 3] == 1):
                arvore.p(xx, y + 1, OURO[5 if em_pouso else 6])
                emissao.p(xx, y + 1, "#ffd188", potencia * (0.4 if em_pouso else 0.58))
                luzes.append((xx, y + 1, "#ffd08a", 7, 0.25))
    if not np.array_equal(silhueta_inferior, arvore.c[113:, :, 3]):
        raise ValueError("O enfeite mudou a silhueta do pinheiro no plano do pouso")
    galhos = [(px, py, cor, 9, 0.23) for px, py, cor in pontos if py > 107]
    espalhar_luz(emissao, arvore, luzes + galhos, potencia * 0.78)
    espalhar_luz(e, casas, luzes[:1], potencia * 0.78)
    # As janelas ficam atrás do pinheiro. O vidro só se vê entre os galhos.
    e.c[:, :, 3] *= 1 - arvore.c[:, :, 3]
    c.juntar(arvore)
    e.juntar(emissao)
    # Omite o centro antigo da estrela, redesenhado no novo plano emissivo.
    return [(px, py, cor) for px, py, cor in pontos if (px, py) != (x, topo)]


def lanternas_do_portao(c: Camada, e: Camada, potencia: float) -> list[Luz]:
    """Duas velas protegidas por metal e vidro nos topos de pedra."""
    luzes = []
    for x in (250, 294):
        c.bitmap(x - 3, 85, [
            "   5   ",
            "  362  ",
            "  421  ",
            "  401  ",
            "  401  ",
            "  312  ",
            " 54321 ",
            "6543210",
        ], amostras(FERRO))
        c.p(x, 88, OURO[4])
        c.p(x, 89, OURO[6])
        c.p(x, 90, OURO[5])
        c.p(x, 91, OURO[2])
        c.ret(x - 2, 94, 5, 1, VELUDO[3])
        c.p(x - 2, 94, VELUDO[5])
        c.p(x + 2, 94, VELUDO[1])
        e.p(x, 89, "#ffe4a3", potencia * 0.53)
        e.p(x, 90, "#ffd28d", potencia * 0.43)
        luzes.append((x, 90, "#ffd28d", 12, 0.65))
    return luzes


def barraca(c: Camada, e: Camada) -> list[Luz]:
    """O carrinho da praça, com toldo listrado, castanhas e chocolate."""
    for x, base in ((430, 141), (454, 151)):
        c.ret(x - 1, 108, 3, base - 108, praca.MADEIRA[1])
        c.ret(x, 107, 1, base - 108, praca.MADEIRA[5])
        c.p(x, base - 2, FERRO[5])
        c.p(x - 1, 111, FERRO[5])
    for x in range(428, 463):
        topo = 103 + int(0.44 * abs(x - 445))
        x_padrao = x + (x - 445) * 0.12
        tecido = VELUDO if int(x_padrao // 4) % 2 else CREME
        for y in range(topo, 116):
            veio = int(praca.h01(x, y, 108) > 0.63)
            dobra = int(x % 4 == 2 and y > topo + 3)
            tom = 3 + int(y < topo + 2) * 2 - int(y > 112) + veio - dobra
            c.p(x, y, tecido[tom])
        c.p(x, 113, tecido[4 if x % 5 == 0 else 3])
        c.p(x, 116, tecido[1])
        if x % 4 < 2:
            c.p(x, 117, tecido[0])
        if x % 4 == 2:
            c.p(x, 115, tecido[4])

    # As castanhas continuam dentro do caixote do carrinho. Duas canecas
    # de cerâmica e uma panela de cobre ocupam o balcão de caibros.
    c.ret(428, 137, 23, 2, praca.MADEIRA[3])
    c.ret(428, 137, 23, 1, praca.MADEIRA[6])
    for x in range(429, 450):
        tom = 3 + int(praca.h01(x, 108) > 0.66)
        c.ret(x, 139, 1, 4, praca.MADEIRA[tom])
    c.ret(428, 141, 23, 1, praca.MADEIRA[4])
    c.linha(449, 140, 453, 135, praca.MADEIRA[2])
    c.linha(452, 150, 456, 150, FERRO[3])
    c.p(454, 149, FERRO[6])
    c.ret(429, 135, 9, 3, COBRE[1])
    for i, (x, y) in enumerate(((429, 135), (431, 133), (432, 135), (434, 134), (436, 135))):
        c.p(x, y + 1, COBRE[1])
        c.p(x, y, COBRE[3 + (i % 2)])
        c.p(x + 1, y, COBRE[5])
        c.p(x + 1, y + 1, COBRE[2])
    c.linha(429, 138, 438, 138, OURO[5])
    c.linha(430, 139, 437, 139, OURO[3])
    c.bitmap(438, 132, [" 13  ", "34531", "45022", "34242", " 32  "], amostras(FRIOS))
    c.bitmap(445, 131, ["  45  ", " 5632 ", "456321", "564321", " 4532 "], amostras(COBRE))
    c.p(446, 128, CREME[4], 0.45)
    c.p(447, 126, CREME[4], 0.4)
    c.p(447, 125, CREME[3], 0.35)
    c.p(448, 124, CREME[2], 0.26)
    c.linha(449, 116, 449, 120, FERRO[3])
    c.p(449, 118, FERRO[6])
    c.bitmap(446, 120, ["  54  ", " 4321 ", "432210", " 4331 ", " 4331 ", " 4321 ", " 4321 ", "654321"], amostras(FERRO))
    c.ret(448, 123, 2, 4, OURO[4])
    c.p(448, 124, OURO[6])
    e.p(448, 124, "#ffe3a3", 0.86)
    e.p(449, 125, "#ffc17c", 0.62)
    return [(448, 126, "#ffcd91", 26, 0.96)]


def conferir_ancoras(c: Camada) -> None:
    caixas = [(220, 104, 260, 152), (262, 96, 308, 163)]
    caixas += [(p["x"], p["y"] - 4.5, p["x"] + 36, p["y"] + 22.5) for p in praca.ANCORAS["gato"]]
    caixas += [(p["x"] - 16.5, p["y"] - 24, p["x"] + 16.5, p["y"]) for p in praca.ANCORAS["coruja"]]
    caixas.append((295, 113, 427, 179))
    for x0, y0, x1, y1 in caixas:
        caixa = (X >= math.floor(x0)) & (X <= x1) & (Y >= math.floor(y0)) & (Y <= y1)
        if np.any(caixa & (c.c[:, :, 3] > 0)):
            raise ValueError(f"Enfeite dentro da área reservada {x0, y0, x1, y1}")


def montar(nome: str) -> Image.Image:
    potencia = {"manha": 0.45, "tarde": 0.72, "noite": 0.93}[nome]
    # O varal e o calçamento já foram pintados quando a barraca entra.
    palco: dict[str, Camada] = {}

    def varal_natal(c: Camada, e: Camada, per: dict, x0: float, y0: float, x1: float, y1: float) -> list[tuple]:
        ramos, vidros = Camada(), Camada()
        luzes = festao(ramos, vidros, x0, y0, x1, y1, potencia)
        velas = lanternas_do_portao(ramos, vidros, potencia)
        conferir_ancoras(ramos)
        conferir_ancoras(vidros)
        c.juntar(ramos)
        e.juntar(vidros)
        espalhar_luz(e, c, luzes + velas, potencia)
        palco["casas"], palco["emissivos"] = c, e
        return [(x, y, cor) for x, y, cor, _, _ in luzes]

    def chao_com_receptor() -> Camada:
        chao = praca.pintar_chao()
        palco["calçamento"] = chao
        return chao

    def miudezas_natal(c: Camada) -> None:
        praca.miudezas(c)
        carrinho, vidro = Camada(), Camada()
        luzes = barraca(carrinho, vidro)
        conferir_ancoras(carrinho)
        conferir_ancoras(vidro)
        c.juntar(carrinho)
        em = palco["emissivos"]
        vidro.c[:, :, 3] *= potencia
        em.juntar(vidro)
        espalhar_luz(em, c, luzes, potencia * 0.89)
        espalhar_luz(em, palco["casas"], luzes, potencia * 0.5)
        rebatida = [(450, 144, "#ffbd76", 19, 0.37)]
        espalhar_luz(em, palco["calçamento"], rebatida, potencia * 0.58)

    montagem = FunctionType(praca.montar.__code__, {
        **vars(praca),
        "varal": varal_natal,
        "pintar_chao": chao_com_receptor,
        "miudezas": miudezas_natal,
        "pinheiro_praca": lambda c, e, per: pinheiro(c, e, palco["casas"], per, potencia),
    })
    return montagem(nome)


def main() -> None:
    nomes = sys.argv[1:] or praca.PERIODOS
    for nome in nomes:
        img = montar(nome)
        arq = praca.PASTA / f"cena-praca-natal-{nome}"
        img.save(arq.with_suffix(".webp"), quality=84, method=6)
        img.resize((960, 400), Image.Resampling.LANCZOS).save(f"{arq}-960.webp", quality=84, method=6)


if __name__ == "__main__":
    main()
