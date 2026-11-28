"""Cenário da série Classificações Ortopédicas (28/11/2026): sala de laudos de radiologia, de dia.

Para não parecer o vídeo do Salter-Harris (gabinete noturno com negatoscópio): luz do dia pela persiana, paleta clara
(azul, branco, verde-água), monitor de PACS no lugar do negatoscópio, letreiro de acrílico no lugar da placa de
madeira e um quadro branco magnético para os números da classificação. Mesma geometria do cena.py do Salter-Harris
(a tela do monitor ocupa o retângulo do filme), para reaproveitar o montador.

    python3 cenario.py  -> arte/fundo.npy, arte/placa-site.npy e arte/previa-fundo.png
"""
from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "../2026-11-27-video-salter-harris"))
from cena import (CAIXA, ESC, FILME, H, MESA_Y, PLACA, PLACA_SITE, W, XX, YY, Camada, ampliar, bloom_tonemap,  # noqa: E402
                  desfocar, hash01, hexa, luz_pontual, luz_retangular, quantizar, rampa, ruido, sobre)

PAREDE = ["#9fb2bd", "#afc1cb", "#bccdd5", "#c8d8df", "#d4e2e8"]
ALUMINIO = ["#5d666c", "#7d878d", "#9ea8ad", "#c0c8cc", "#e3e8ea"]
PRETO = ["#0c0e10", "#15181b", "#1e2226", "#2a2f34", "#3a4046"]
VERDE = ["#0b3a35", "#14655E", "#1f8a80", "#58b8ab", "#a7e0d6"]
BRANCO = ["#c9d1d4", "#dde3e5", "#eef2f3", "#f8fafa"]
JANELA = (0, 20, 64, 150)


def parede() -> Camada:
    c = Camada()
    n = ruido(201, 30) * 0.6 + ruido(202, 6) * 0.4
    tom = 0.55 + (n - 0.5) * 0.35 + (hash01(XX, YY, 7) - 0.5) * 0.08
    c.pintar(np.ones((H, W), bool), rampa(PAREDE, quantizar(np.clip(tom, 0, 1), 5, 0.7)))
    # rodameio em verde-água (faixa de proteção hospitalar) logo acima da mesa
    faixa = (YY >= MESA_Y - 30) & (YY < MESA_Y - 22)
    c.pintar(faixa, VERDE[2])
    c.pintar(faixa & (YY == MESA_Y - 30), VERDE[4])
    c.pintar(faixa & (YY == MESA_Y - 23), VERDE[0])
    # forro com luminárias embutidas
    c.ret(0, 0, W, 12, "#e8eef0")
    c.ret(0, 12, W, 14, "#aab8bf")
    for x in (40, 180, 320):
        c.ret(x - 28, 2, x + 28, 10, "#fbfdff")
        c.ret(x - 28, 10, x + 28, 11, "#c9d4d9")
    return c


def janela() -> tuple[Camada, np.ndarray]:
    """Janela à esquerda com persiana horizontal; devolve a máscara das frestas (por onde entra o sol)."""
    c = Camada()
    x0, y0, x1, y1 = JANELA
    vao = (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)
    t = np.clip((YY - y0) / (y1 - y0), 0, 1)
    ceu = hexa("#9fd0f2")[None, None] * (1 - t[..., None]) + hexa("#e6f4fb")[None, None] * t[..., None]
    c.pintar(vao, ceu)
    # prédios ao longe
    perfil = y1 - 30 - 18 * ((XX // 9) % 3 == 0) - 10 * ((XX // 7) % 2)
    c.pintar(vao & (YY > perfil), "#b9cbd6")
    c.pintar(vao & (YY > perfil) & (hash01(XX // 2, YY // 3, 3) > 0.8), "#d6e4ec")
    # lâminas da persiana
    lamina = vao & ((YY - y0) % 6 < 4)
    c.pintar(lamina, "#eef2f3")
    c.pintar(lamina & ((YY - y0) % 6 == 0), "#ffffff")
    c.pintar(lamina & ((YY - y0) % 6 == 3), "#c2ccd0")
    fresta = vao & ~lamina
    # cordão e trilho
    c.ret(x0, y0 - 4, x1 + 2, y0, ALUMINIO[2])
    c.ret(x0, y0 - 4, x1 + 2, y0 - 3, ALUMINIO[4])
    for yy in range(y0, y1, 3):
        c.p(x1 - 6, yy, "#d8dcdc")
    # caixilho branco
    c.ret(x1, y0 - 4, x1 + 3, y1 + 3, "#f3f6f7")
    c.ret(x0, y1, x1 + 3, y1 + 4, "#f3f6f7")
    c.ret(x0, y1 + 4, x1 + 3, y1 + 5, "#a9b4b9")
    return c, fresta


def letreiro() -> Camada:
    """Letreiro de acrílico branco leitoso, preso por quatro pinos de aço, com filete verde-água."""
    c = Camada()
    x0, y0, x1, y1 = PLACA
    m = (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)
    t = (YY - y0) / (y1 - y0)
    c.pintar(m, hexa("#fbfdfd")[None, None] * (1 - t[..., None] * 0.15) + hexa("#dfe8ea")[None, None] * (t[..., None] * 0.15))
    c.pintar(m & (YY == y0), "#ffffff")
    c.pintar(m & ((YY == y1 - 1) | (XX == x1 - 1)), "#b8c4c8")
    c.pintar(m & (YY >= y1 - 4) & (YY < y1 - 2) & (XX > x0 + 6) & (XX < x1 - 6), VERDE[1])
    for (px, py) in ((x0 + 5, y0 + 5), (x1 - 6, y0 + 5), (x0 + 5, y1 - 7), (x1 - 6, y1 - 7)):
        c.elipse(px, py, 2.2, 2.2, ALUMINIO[3])
        c.p(px - 1, py - 1, "#ffffff")
    # sombra projetada na parede
    c.pintar((XX >= x0 + 3) & (XX < x1 + 3) & (YY >= y1) & (YY < y1 + 3), "#000000", 0.18)
    return c


def quadro_branco() -> Camada:
    """Quadro branco magnético com moldura de alumínio e bandeja de canetas (os números I a VI vão por cima)."""
    c = Camada()
    x0, y0, x1, y1 = 22, 76, 338, 140
    m = (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)
    tom = 0.6 + (ruido(211, 18) - 0.5) * 0.15 - 0.2 * ((YY - y0) / (y1 - y0))
    c.pintar(m, rampa(BRANCO, quantizar(np.clip(tom, 0, 1), 4, 0.5)))
    # restos de caneta apagada
    for k in range(5):
        cx, cy = 60 + k * 60, 100 + (k % 2) * 14
        c.pintar(((XX - cx) / 16) ** 2 + ((YY - cy) / 3) ** 2 <= 1, "#b9c6cc", 0.25)
    borda = ((XX >= x0 - 2) & (XX < x1 + 2) & (YY >= y0 - 2) & (YY < y1 + 2)) & ~m
    c.pintar(borda, ALUMINIO[2])
    c.pintar(borda & (YY < y0), ALUMINIO[4])
    c.pintar(borda & (YY >= y1), ALUMINIO[0])
    c.ret(120, y1 + 2, 240, y1 + 5, ALUMINIO[1])
    c.ret(120, y1 + 2, 240, y1 + 3, ALUMINIO[3])
    for i, cor in enumerate((VERDE[1], "#c0392b", "#1f4e8c")):
        c.ret(140 + i * 16, y1, 152 + i * 16, y1 + 2, cor)
        c.ret(140 + i * 16, y1, 143 + i * 16, y1 + 2, "#e9ecec")
    return c


def monitor() -> tuple[Camada, np.ndarray]:
    """Monitor de laudo (PACS): moldura fina preta, barra do programa e pé de alumínio até a mesa."""
    c = Camada()
    x0, y0, x1, y1 = CAIXA
    fx0, fy0, fx1, fy1 = FILME
    caixa = (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)
    tela = (XX >= fx0) & (XX < fx1) & (YY >= fy0) & (YY < fy1)
    c.pintar(caixa & ~tela, rampa(PRETO, quantizar(np.clip(0.4 + 0.3 * (1 - (YY - y0) / (y1 - y0)) - 0.15, 0, 1), 5, 0.5)))
    c.pintar(caixa & ~tela & ((YY == y0) | (XX == x0)), PRETO[4])
    # barra do programa (no alto, dentro da tela, por trás da imagem: aparece nas margens)
    c.pintar(tela, "#0b0f12")
    c.pintar(tela & (YY < fy0 + 5), "#1b252c")
    for i, cor in enumerate(("#e06c5a", "#e5c07b", "#7fc98a")):
        c.elipse(fx0 + 4 + i * 5, fy0 + 2.5, 1.3, 1.3, cor)
    # logotipo e LED na moldura de baixo
    c.ret((x0 + x1) // 2 - 6, y1 - 6, (x0 + x1) // 2 + 6, y1 - 5, PRETO[4])
    c.p(x1 - 8, y1 - 5, "#7fffd0")
    # pé
    cx = (x0 + x1) // 2
    c.ret(cx - 7, y1, cx + 7, MESA_Y - 2, ALUMINIO[2])
    c.ret(cx - 7, y1, cx - 5, MESA_Y - 2, ALUMINIO[4])
    c.ret(cx + 5, y1, cx + 7, MESA_Y - 2, ALUMINIO[0])
    c.ret(cx - 30, MESA_Y - 3, cx + 30, MESA_Y, ALUMINIO[2])
    c.ret(cx - 30, MESA_Y - 3, cx + 30, MESA_Y - 2, ALUMINIO[4])
    return c, tela


def segundo_monitor() -> Camada:
    """Pedaço do segundo monitor à direita, com a lista de exames (fica desfocado)."""
    c = Camada()
    x0, y0, x1, y1 = 308, 160, W, 372
    c.ret(x0, y0, x1, y1, PRETO[1])
    c.ret(x0 + 4, y0 + 5, x1, y1 - 6, "#0e1a22")
    for k, y in enumerate(range(y0 + 10, y1 - 10, 9)):
        c.ret(x0 + 8, y, x1, y + 4, "#1e3a4a" if k % 2 else "#15303d")
        c.ret(x0 + 10, y + 1, x0 + 10 + 10 + (k * 7) % 20, y + 3, "#7fb6cc")
    c.ret(x0 + 8, y0 + 10 + 9 * 3, x1, y0 + 14 + 9 * 3, "#2f7f8f")
    return c


def mesa() -> Camada:
    c = Camada()
    y = MESA_Y
    veio = ruido(221, 3, W, H) * 0.5 + ruido(222, 30, W, H) * 0.5
    tampo = (YY >= y) & (YY < y + 10)
    c.pintar(tampo, rampa(BRANCO, quantizar(np.clip(0.75 + (veio - 0.5) * 0.2, 0, 1), 4, 0.5)))
    c.ret(0, y, W, y + 1, "#ffffff")
    c.ret(0, y + 10, W, y + 13, ALUMINIO[2])
    c.ret(0, y + 10, W, y + 11, ALUMINIO[4])
    frente = (YY >= y + 13) & (YY < y + 64)
    c.pintar(frente, rampa(["#7f9aa6", "#93adb8", "#a6bec8"], quantizar(np.clip(0.5 + (veio - 0.5) * 0.3, 0, 1), 3, 0.5)))
    for gx0, gx1 in ((14, 110), (128, 232), (250, 346)):
        c.ret(gx0, y + 20, gx1, y + 54, "#8aa4b0")
        c.ret(gx0, y + 20, gx1, y + 21, "#c3d4db")
        c.ret(gx0, y + 53, gx1, y + 54, "#5f7883")
        c.ret((gx0 + gx1) // 2 - 12, y + 26, (gx0 + gx1) // 2 + 12, y + 28, ALUMINIO[3])
    return c


def objetos() -> Camada:
    c = Camada()
    y = MESA_Y
    # teclado
    c.ret(96, y - 4, 196, y, PRETO[2])
    c.ret(96, y - 4, 196, y - 3, PRETO[4])
    for k in range(98, 194, 4):
        c.ret(k, y - 3, k + 3, y - 1, "#3b4248")
    # mouse
    c.elipse(212, y - 2, 6, 2.6, PRETO[3])
    c.p(211, y - 4, PRETO[4])
    # caneca verde-água com o ladrilho
    mx = 236
    c.ret(mx, y - 14, mx + 11, y, VERDE[2])
    c.ret(mx, y - 14, mx + 11, y - 13, VERDE[4])
    c.ret(mx + 8, y - 13, mx + 11, y, VERDE[1])
    c.ret(mx + 11, y - 11, mx + 14, y - 10, VERDE[2])
    c.ret(mx + 13, y - 10, mx + 14, y - 4, VERDE[2])
    c.ret(mx + 11, y - 4, mx + 14, y - 3, VERDE[1])
    c.ret(mx + 3, y - 9, mx + 8, y - 6, "#f6eedb")
    c.p(mx + 4, y - 8, "#f4cf7c")
    # vaso com suculenta
    vx = 300
    c.ret(vx, y - 10, vx + 14, y, "#e9e4da")
    c.ret(vx, y - 10, vx + 14, y - 9, "#ffffff")
    c.ret(vx + 11, y - 9, vx + 14, y, "#c7c1b4")
    for i, (dx, dy) in enumerate([(-3, -5), (0, -9), (4, -6), (7, -10), (10, -5), (2, -13), (6, -14)]):
        c.elipse(vx + 3 + dx, y - 10 + dy, 2.6, 1.8, ["#3f8a5c", "#5fb07a", "#2d6a44"][i % 3])
    # pasta de exames com uma radiografia saindo
    c.ret(38, y - 3, 84, y, "#e8d9a8")
    c.ret(38, y - 3, 84, y - 2, "#f6ead0")
    c.ret(44, y - 6, 78, y - 3, "#203038")
    c.ret(48, y - 5, 70, y - 4, "#5b7682")
    return c


def chao() -> Camada:
    c = Camada()
    y = MESA_Y + 64
    m = YY >= y
    tom = 0.55 + (ruido(231, 4, W, H) - 0.5) * 0.2
    c.pintar(m, rampa(["#7d8c93", "#8c9ba2", "#9aa9af"], quantizar(np.clip(tom, 0, 1), 3, 0.6)))
    c.pintar(m & ((XX + (YY - y) * 2) % 40 == 0), "#76858c")
    return c


def placa_site() -> Camada:
    """Faixa do site em acrílico (só no começo e no fim): branco leitoso com filete verde-água."""
    c = Camada()
    x0, y0, x1, y1 = PLACA_SITE
    m = (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)
    c.pintar(m, "#0f2e2a", 0.92)
    c.pintar(m & ((YY == y0) | (YY == y1 - 1) | (XX == x0) | (XX == x1 - 1)), VERDE[3])
    c.pintar(m & ((YY == y0 + 1) | (YY == y1 - 2)), VERDE[1])
    c.pintar((XX >= x0 + 2) & (XX < x1 + 2) & (YY >= y1) & (YY < y1 + 3), "#000000", 0.35)
    return c


def montar() -> dict:
    cam_parede = parede()
    cam_jan, fresta = janela()
    camadas = [cam_parede, cam_jan, letreiro(), quadro_branco()]
    cam_mon, tela = monitor()
    base = np.zeros((H, W, 3), np.float32)
    for cam in camadas + [cam_mon]:
        base = sobre(base, cam.c)
    grande = ampliar(base)
    grande = sobre(grande, desfocar(ampliar(segundo_monitor().c), 2.0))
    meio = np.zeros((H, W, 4), np.float32)
    for cam in (chao(), mesa(), objetos()):
        meio = sobre(meio, cam.c)
    mg = ampliar(meio)
    yy = np.arange(H * ESC)[:, None, None]
    peso = np.clip((yy - (MESA_Y + 20) * ESC) / 120, 0, 1)
    mg = mg * (1 - peso) + desfocar(mg, 1.6) * peso
    cor = sobre(grande, mg)

    # luz: dia claro e difuso + faixas de sol da persiana na parede (diagonal) + brilho frio do monitor
    hh, ww = H * ESC, W * ESC
    gy, gx = np.mgrid[0:hh, 0:ww].astype(np.float32)
    faixas = ((gy - gx * 0.55) // 21 % 2 == 0) & (gx > 70 * ESC) & (gx < 300 * ESC) & (gy < (MESA_Y - 30) * ESC)
    sol = np.exp(-((gx - 60 * ESC) / (220 * ESC)) ** 2) * faixas * 0.22
    sol = desfocar(sol[..., None].astype(np.float32), 2.5)[..., 0]
    fx0, fy0, fx1, fy1 = [v * ESC for v in FILME]
    tela_luz = luz_retangular(fx0, fy0, fx1, fy1, 160, ww, hh)
    ilum = (0.86 + 0.12 * (1 - gy / hh))[..., None] * hexa("#f4f8fb") + sol[..., None] * hexa("#fff1d6") \
        + tela_luz[..., None] * hexa("#bfe3ff") * 0.18 + luz_pontual(30 * ESC, 80 * ESC, 260, 1.4, ww, hh)[..., None] * 0.12
    acesa = cor * ilum
    mt = ampliar(tela.astype(np.float32)[..., None])
    acesa = acesa * (1 - mt) + cor * mt  # a tela não recebe sol (o filme entra por cima)
    return {"rgb": acesa}


def main() -> None:
    os.makedirs(os.path.join(AQUI, "arte"), exist_ok=True)
    r = montar()
    np.save(os.path.join(AQUI, "arte", "fundo.npy"), r["rgb"].astype(np.float16))
    pl = ampliar(placa_site().c)
    np.save(os.path.join(AQUI, "arte", "placa-site.npy"), pl.astype(np.float16))
    Image.fromarray((bloom_tonemap(r["rgb"].copy(), grao=0.015) * 255).astype(np.uint8)).save(
        os.path.join(AQUI, "arte", "previa-fundo.png"))
    print("ok")


if __name__ == "__main__":
    main()
