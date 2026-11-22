"""Guarnições de Natal para as molduras das páginas de estudo."""
from __future__ import annotations

import math

import numpy as np
from PIL import Image

from guirlanda import MADEIRA, OURO, PINHO, VERMELHO
from hd2d import ESC, H, SAIDA, W, Camada, camada_de_luz, h01, hexa, iluminar, luz_pontual, pal, salvar_rgba, tom
from molduras_paginas import bagas, bracadeira, coroa, laco, ramo

ALTURA = 61
GELO = pal("#536a79", "#738b9a", "#9eafba", "#c1d5da", "#dce4d9", "#fdf0d3")
COBRE = pal("#281b18", "#473023", "#684733", "#8c6543", "#b68552", "#dfbc78", "#f4d797")
VIDRO = pal("#362218", "#694525", "#94602a", "#bc793a", "#d79f52", "#f2cb78", "#ffecaf")
LIVROS = (
    pal("#271822", "#472333", "#663042", "#803e4a", "#aa525c", "#c67474", "#e79586"),
    pal("#102526", "#234443", "#335d59", "#427972", "#5a938b", "#79b6a8", "#acd4b9"),
    pal("#302119", "#4e3320", "#685034", "#866041", "#a37c51", "#c39d68", "#e5c58a"),
)
CORES = ("#ffc778", "#ff9b8c", "#a8e4b7", "#ffe7a6", "#aaceff")


def placa(c, x, y, w, h, p, semente, lateral=0):
    """Face de madeira, couro ou papel com quina, desgaste e ruído direcional."""
    for j in range(h):
        for i in range(w):
            grao = h01(i, j, semente)
            veio = h01(i // 7, j, semente + 13)
            luz = .62 - .37 * (i == w - 1 or j == h - 1) + .22 * (i == 0 or j == 0)
            c.p(x+i, y+j, tom(p, luz - lateral + (grao-.5)*.20 + (veio-.5)*.15))


def tabua(c, w, y, h=6):
    placa(c, 1, y, w-2, h, MADEIRA, 71)
    for x in range(1, w-1):
        c.p(x, y+h, "#171815", .52)
        if h01(x, y) > .86:
            c.p(x, y+2, MADEIRA[5], .86)
    for x in range(13, w-5, 31):
        c.p(x, y+2, COBRE[1])
        c.p(x-1, y+1, COBRE[5])


def lampada(c, e, x, y, pontos, cor):
    c.ret(x-1, y-2, 3, 3, COBRE[1])
    c.p(x-1, y-2, COBRE[5])
    c.bitmap(x-2, y, (".543.", "65432", "54321", ".421."), dict(zip("123456", VIDRO[1:])))
    e.p(x-1, y+1, cor, .87)
    e.p(x, y+2, cor, .77)
    e.p(x+1, y+2, cor, .30)
    pontos.append((x, y+2, cor))


def festao(c, e, pontos, w):
    # O festão encosta no friso. As braçadeiras atravessam a madeira e o fio cede no meio.
    tabua(c, w, 11, 5)
    for x in range(4, w-4):
        y = 16 + round(7 * math.sin(math.pi * ((x-4) % 88) / 88))
        c.p(x, y+1, MADEIRA[1])
        c.p(x, y, MADEIRA[5])
        if x % 8 == 0:
            i = x//8
            ramo(c, x, y, math.radians(17 if i%2 else 155), 9+i%5, -1)
            ramo(c, x, y-1, math.radians(-21 if i%2 else -155), 7+i%4, 1)
        if x % 22 == 12:
            lampada(c, e, x, y+4, pontos, CORES[(x//22) % len(CORES)])
        if x % 19 == 6:
            bagas(c, x, y-1)
        if h01(x, 190) > .70:
            c.p(x, y-3, tom(GELO, .49+.42*h01(x, 177)), .86)
    for x in range(4, w-4, 88):
        bracadeira(c, x, 10)
    for x in (48, 136, 224, 312):
        laco(c, x, 24)
    c.linha(178, 19, 178, 24, OURO[5])
    coroa(c, 178, 32)


def ramos(c, x, y, sentido):
    for i in range(13):
        bx = x + i * sentido * 3
        by = y - round(math.sin(i / 12 * math.pi) * 6)
        ramo(c, bx, by, math.radians(-162 if sentido < 0 else -20), 8+i%5, 1)
        ramo(c, bx, by+1, math.radians(151 if sentido < 0 else 31), 8+i%3, -1)
        if i % 3 == 1:
            bagas(c, bx, by-2)
    laco(c, x, y-6)


def presente(c, x, base, w, h, p, fita):
    y = base - h
    c.ret(x-2, base, w+6, 2, "#161815", .52)
    placa(c, x, y+3, w, h-3, p, x)
    placa(c, x+w-4, y+3, 4, h-3, p, x, .25)
    placa(c, x-1, y, w+1, 4, p, x+1)
    placa(c, x+w//2-1, y, 3, h, fita, x+2)
    c.linha(x+w//2, y, x+w//2-4, y-4, fita[4], 2)
    c.linha(x+w//2, y, x+w//2+4, y-4, fita[5], 2)
    c.p(x+w//2, y-1, fita[-1])
    c.linha(x+w//2-5, y-3, x+w//2-2, y-5, fita[6])
    c.linha(x+w//2+2, y-5, x+w//2+5, y-3, fita[5])
    c.p(x+w//2-4, y-4, fita[-1])


def vela(c, e, x, base, h, pontos):
    c.ret(x-5, base-2, 11, 2, COBRE[2])
    c.linha(x-4, base-3, x+4, base-3, COBRE[5])
    placa(c, x-2, base-h, 5, h-3, GELO, x)
    c.p(x-1, base-h+4, GELO[-1])
    c.p(x-1, base-h+5, GELO[3])
    c.p(x, base-h-1, COBRE[0])
    e.bitmap(x-1, base-h-5, (".2.", "23.", "123", ".2."), {"1":"#f1a053", "2":"#ffe4a7", "3":"#fff5ce"})
    c.bitmap(x-1, base-h-5, (".2.", "23.", "123", ".2."), {"1":"#f1a053", "2":"#ffe4a7", "3":"#fff5ce"})
    pontos.append((x, base-h-3, "#ffd18b"))


def lanterna(c, e, x, base, pontos):
    c.ret(x-12, base-3, 25, 4, COBRE[1])
    c.linha(x-11, base-3, x+10, base-3, COBRE[5])
    c.ret(x-9, base-23, 19, 20, COBRE[2])
    placa(c, x-7, base-22, 15, 18, VIDRO, x)
    c.linha(x-6, base-22, x-6, base-6, VIDRO[5])
    c.linha(x+2, base-22, x+2, base-7, COBRE[2])
    c.linha(x+7, base-22, x+7, base-5, COBRE[1])
    for i in range(6):
        c.ret(x-11+i, base-25-i, 23-2*i, 1, COBRE[2+i//2])
        c.p(x-11+i, base-25-i, COBRE[-1])
    c.ret(x-2, base-34, 5, 5, COBRE[2])
    c.p(x-2, base-34, COBRE[6])
    c.p(x, base-33, "#1b2420")
    c.ret(x-2, base-10, 4, 4, VIDRO[-1])
    c.bitmap(x-2, base-17, (".2..", ".23.", "1232", ".22."), {"1":"#e89543","2":"#ffcf80","3":"#fff4bf"})
    e.ret(x-1, base-15, 3, 3, "#ffe198", .72)
    pontos.append((x, base-14, "#ffc778"))


def sino(c, e, x, y, pontos):
    # Bronze polido no dorso, escuro por baixo, batente no ponto mais baixo.
    for j in range(19):
        meio = round(4 + (j/18)**2.7*9)
        for i in range(-meio, meio+1):
            v = .77 - .20*((i+meio)/(2*meio)) - .28*(j>15) + .24*(i in (-meio+1, -meio+2))
            c.p(x+i, y+j, tom(OURO, v + (h01(i,j,x)-.5)*.28))
    c.ret(x-13, y+19, 27, 2, COBRE[1])
    c.linha(x-13,y+18,x+13,y+18,OURO[6])
    c.ret(x-2,y+20,5,4,OURO[2])
    c.p(x-1,y+22,OURO[6])
    c.p(x-5,y+6,OURO[-1])
    c.p(x-6,y+7,OURO[-1])
    e.p(x-6,y+7,"#ffe3a4",.6)
    pontos.append((x-6,y+7,"#ffcf86"))


def livros(c, x, base):
    for i in range(8):
        w = 6 + i%3
        h = 15 + int(h01(i, 300) * 15)
        p = LIVROS[i%len(LIVROS)]
        placa(c, x, base-h, w, h, p, i*13)
        c.ret(x+w-2, base-h+1, 1, h-2, p[1])
        c.linha(x+1, base-h+3, x+w-2, base-h+3, COBRE[5])
        c.linha(x+1, base-4, x+w-2, base-4, COBRE[4])
        for j in range(2):
            c.p(x+2+j, base-h+6+j, GELO[4], .76)
        x += w+1
    # Livro deitado na ponta, com folhas e marcador de fita.
    placa(c, x+4, base-5, 27, 5, LIVROS[0], 44)
    placa(c, x+6, base-4, 23, 2, GELO, 45)
    placa(c, x+7, base-11, 24, 6, LIVROS[1], 46)
    placa(c, x+9, base-10, 20, 3, GELO, 47)
    c.ret(x+18, base-8, 2, 5, VERMELHO[6])


def montar(nome, largura):
    c, e = Camada(), Camada()
    pontos = []
    base = 48
    if nome == "festao":
        festao(c, e, pontos, largura)
    else:
        tabua(c, largura, base)
        # Dois apoios sob o tampo, com os rebites na face visível.
        modelo = ("654321", "65432.", "5432..", "432...", "32....")
        for x in (20, largura-26):
            c.bitmap(x, base+6, modelo, dict(zip("123456", COBRE[1:])))
            c.p(x+1, base+7, COBRE[-1])
        if nome == "lanternas":
            lanterna(c, e, 44, base, pontos)
            lanterna(c, e, 128, base, pontos)
            ramos(c, 87, base-3, -1)
            ramos(c, 87, base-3, 1)
            presente(c, 90, base, 23, 17, LIVROS[0], OURO)
        elif nome == "biblioteca":
            livros(c, 48, base)
            ramos(c, 56, base-2, -1)
            ramos(c, 133, base-1, 1)
            vela(c, e, 33, base, 17, pontos)
            vela(c, e, 158, base, 21, pontos)
        elif nome == "sinos":
            placa(c, 56, 13, 62, 6, MADEIRA, 23)
            for x, fim in ((71, 24), (102, 22)):
                c.ret(x-1, 15, 3, fim-15, COBRE[2])
                c.linha(x-1, 15, x-1, fim-1, OURO[5])
                c.p(x+3, 14, COBRE[6])
            ramos(c, 88, 21, -1)
            ramos(c, 88, 21, 1)
            sino(c, e, 71, 23, pontos)
            sino(c, e, 102, 21, pontos)
            presente(c, 29, base, 20, 14, LIVROS[1], OURO)
            vela(c, e, 137, base, 19, pontos)
        elif nome == "presentes":
            ramos(c, 65, base-3, -1)
            ramos(c, 108, base-2, 1)
            presente(c, 57, base, 28, 26, LIVROS[0], OURO)
            presente(c, 91, base, 24, 22, LIVROS[1], VERMELHO)
            presente(c, 77, base+1, 22, 13, LIVROS[2], VERMELHO)
            vela(c, e, 43, base, 20, pontos)
            vela(c, e, 135, base, 15, pontos)
    rgb, alfa, _ = iluminar(c, e, pontos, amb="#d0dce9", amb_k=.88,
                           extra=[(largura*.24,-11,105,"#ffe1a8",.44,1)], raio_lamp=9, cruz=False)
    fatia = np.s_[:ALTURA*ESC, :largura*ESC]
    salvar_rgba(f"passagem-{nome}.png", rgb[fatia], alfa[fatia])
    luz = np.zeros((H*ESC, W*ESC, 3), dtype=np.float32)
    for x,y,cor in pontos:
        luz += luz_pontual(x,y,16 if nome == "festao" else 24, .93)[:,:,None] * hexa(cor)
    rgb_luz, alfa_luz = camada_de_luz(luz[fatia], ganho=.35, teto=.50)
    # A luz é difusa. A arte mantém a grade 3×, mas o halo pode vir na grade base.
    rgbl = np.dstack((rgb_luz, alfa_luz))
    difusa = Image.fromarray(np.rint(np.clip(rgbl, 0, 1) * 255).astype(np.uint8))
    difusa = difusa.resize((largura, ALTURA), Image.Resampling.LANCZOS)
    difusa.save(SAIDA / f"passagem-{nome}-luz.webp", quality=87, method=6)


if __name__ == "__main__":
    for forma, largura in (("festao", 360), ("lanternas", 174), ("biblioteca", 192),
                           ("sinos", 174), ("presentes", 174)):
        montar(forma, largura)
