"""A Oficina da Mão: o cenário "HD-2D" do topo do cronograma de Cirurgia da Mão (01/11/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. É a mesma praça da
Torre do Tempo (scripts/gerar_cena_cronograma.py): o céu, as montanhas, o castelo da prova, os campos, o bosque, a
estrada, as casas, os lampiões e a luz das três horas vêm de lá, importados sem mudar nada. No lugar da torre fica a
oficina de um artesão de precisão, o ofício da mão:
- a fachada de dois andares em enxaimel sobre o térreo de pedra, com empena de telhas e um óculo em roda dentada;
- no meio do andar, uma lupa de bancada grande, de latão, presa à parede por um braço articulado de três juntas;
- a vitrine sob o toldo verdete mostra o trabalho fino: relógios de bolso, engrenagens, pinças e um manequim de mão
  articulado, de madeira;
- a placa da guilda pendurada no braço de ferro: uma mão aberta de chapa recortada, com filete de latão e uma
  engrenagem no meio da palma. É a peça que balança (recortada à parte, como o sino da torre).
Nenhum texto ou número é pintado: tudo o que se lê fica no HTML.

A composição segue a da torre (o vidro do texto à esquerda, x 0-205, calmo; o foco do centro para a direita), então
o mesmo CSS (CronogramaTorre.css) serve às três variantes do cronograma.

Saída em public/pixel/cronograma/:
- oficina-mao-<manha|tarde|noite>.webp (1440 x 600) e -960.webp (960 x 400): o fundo, sem a placa;
- oficina-mao-placa-<hora>.png: a placa recortada já com a luz da hora, para balançar por cima (raramente).
Uso: <python com numpy e pillow> scripts/gerar_cena_mao.py [manha|tarde|noite]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar_cena_cronograma as t  # noqa: E402  (ajusta a vila para 480 x 200 na importação)

v = t.v
W, H, ESC = t.W, t.H, t.ESC
_YS, _XS = t._YS, t._XS
Camada, hexa, mistura, hash01, ruido = t.Camada, t.hexa, t.mistura, t.hash01, t.ruido
elipse_m, poligono_m, desfocar = t.elipse_m, t.poligono_m, t.desfocar
cantaria, cornija = t.cantaria, t.cornija

PASTA = t.PASTA
PERIODOS = t.PERIODOS

# A oficina ocupa o lugar da torre (as sombras, os feixes e o filete do poente da montagem usam estas constantes).
CX = 390
XA, XB, LADO = 356, 424, 12
TOPO_CORPO, BASE = 62, 170
ANDAR = 116  # a cornija entre o térreo de pedra e o andar de enxaimel
APICE = 20
LUPA = (388, 86, 10)  # centro e raio do aro da lupa de bancada
PLACA = (343, 74)  # centro do alto da placa (onde as correntes encontram o braço)

REBOCO = ("#d8cab0", "#9a8a74")
MADEIRA = "#4a2e1e"


def _contorno(m: np.ndarray) -> np.ndarray:
    """O pixel logo fora de uma máscara (contorno de 1 pixel)."""
    viz = np.zeros_like(m)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        viz = np.maximum(viz, np.roll(np.roll(m, dy, 0), dx, 1))
    return (viz > 0.5) & (m < 0.5)


def engrenagem(c: Camada, cx: float, cy: float, r: float, dentes: int, tons, furo: float = 0.0, fase: float = 0.0) -> None:
    """Roda dentada de latão: dentes retos, aro com luz em cima à esquerda, cubo e furo opcional."""
    for y in range(int(cy - r - 2), int(cy + r + 3)):
        for x in range(int(cx - r - 2), int(cx + r + 3)):
            d = math.hypot(x - cx, y - cy)
            ang = math.atan2(y - cy, x - cx)
            dente = (math.cos(ang * dentes + fase) > 0.1)
            borda = r + (1.2 if dente else 0)
            if d > borda or d < furo:
                continue
            luz = -math.cos(ang + math.pi * 0.72)
            cor = tons[0] if luz > 0.55 else tons[1] if luz > -0.1 else tons[2] if luz > -0.7 else tons[3]
            if furo and d < furo + 1:
                cor = tons[3]
            c.p(x, y, cor)


def mao_aberta() -> np.ndarray:
    """A silhueta da mão aberta da placa (palma para a frente, dedos um pouco abertos), como máscara da arte."""
    hx, hy = PLACA[0], PLACA[1] + 6
    m = np.zeros((H, W), dtype=np.float32)
    # dedos: indicador, médio, anelar e mínimo, de pontas redondas, com a fresta de 1 pixel entre eles
    for (dx, topo, larg) in ((-6, 3, 3), (-2, 0, 3), (2, 2, 3), (6, 6, 2.6)):
        x0 = hx + dx - larg / 2
        m = np.maximum(m, poligono_m([(x0, hy + topo + 1.5), (x0 + larg, hy + topo + 1.5), (x0 + larg, hy + 13), (x0, hy + 13)]))
        m = np.maximum(m, elipse_m(x0 + larg / 2 - 0.5, hy + topo + 1.6, larg / 2, 1.6))
    # palma e punho
    m = np.maximum(m, poligono_m([(hx - 8, hy + 11), (hx + 8.5, hy + 11), (hx + 8, hy + 20), (hx + 5.5, hy + 25), (hx + 5.5, hy + 29),
                                  (hx - 5, hy + 29), (hx - 5, hy + 25), (hx - 8, hy + 19)]))
    # polegar: sai da base da palma e sobe para fora, à esquerda
    m = np.maximum(m, poligono_m([(hx - 7.5, hy + 21), (hx - 13.5, hy + 12.5), (hx - 11, hy + 10.5), (hx - 6, hy + 15)]))
    m = np.maximum(m, elipse_m(hx - 12.5, hy + 11.6, 1.8, 1.6))
    return (m > 0.5).astype(np.float32)


def placa(c: Camada) -> None:
    """A placa da guilda: a mão de chapa de ferro com filete de latão, a engrenagem na palma e as correntes."""
    hx, hy = PLACA
    m = mao_aberta()
    # correntes: elos alternados de ferro, do braço até as duas orelhas da chapa
    for (cx_, y1) in ((hx - 5, hy + 8), (hx + 5, hy + 10)):
        for y in range(hy, y1):
            c.p(cx_, y, "#5a5664" if (y - hy) % 2 else "#24222a")
            if (y - hy) % 2 == 0:
                c.p(cx_ + 1, y, "#3a3640")
    # filete de latão em volta da chapa (claro do lado da luz, à esquerda; escuro do outro)
    borda = _contorno(m)
    for y, x in zip(*np.nonzero(borda)):
        luz = -(x - hx) * 0.07 - (y - hy - 14) * 0.03
        c.p(x, y, "#ffe8a0" if luz > 0.45 else "#e0b04c" if luz > 0.05 else "#9a6a24" if luz > -0.5 else "#5a3a14")
    # a chapa: ferro escuro com a luz na borda esquerda, ruído de forja e rebites
    n = ruido(141, 1)
    for y, x in zip(*np.nonzero(m)):
        k = (x - (hx - 13)) / 26 + (n[y, x] - 0.5) * 0.25
        cor = "#5a5662" if k < 0.18 else "#45424e" if k < 0.42 else "#34323c" if k < 0.7 else "#24222a"
        if m[y, x - 1] < 0.5 if x > 0 else False:
            cor = "#8a8696"  # aresta acesa da chapa
        c.p(x, y, cor)
    # vinco dos dedos (a dobra da palma), um pixel mais escuro
    for x in range(hx - 7, hx + 8):
        if m[hy + 6 + 13, x] > 0.5:
            c.p(x, hy + 6 + 13, "#1c1a22")
    # a engrenagem de latão no meio da palma (o trabalho fino)
    engrenagem(c, hx + 0.5, hy + 6 + 18.5, 3.2, 8, ("#fff0b0", "#e0b04c", "#9a6a24", "#5a3a14"), furo=1.1)
    for (rx, ry) in ((hx - 5, hy + 8), (hx + 5, hy + 10)):  # rebites das orelhas
        c.p(rx, ry, "#c8902e")
        c.p(rx, ry - 1, "#ffe8a0")


def lupa(c: Camada, e: Camada, rel: Camada, luzes: list) -> None:
    """A lupa de latão na fachada, como a de bancada do artesão: aro grosso rebitado, cabo torneado preso à parede por
    uma braçadeira, e a lente que aumenta o enxaimel atrás dela (o reflexo do céu em cima e o brilho em diagonal)."""
    lx, ly, r = LUPA
    atras = c.c[:, :, :3].copy()  # a parede antes da lupa: a lente mostra este pedaço ampliado
    # o cabo: madeira torneada na diagonal, para baixo e à direita, com anéis de latão
    for k in range(15):
        x, y = lx + r * 0.7 + k * 0.72, ly + r * 0.7 + k * 0.72
        cor = ("#c8902e" if k < 2 else "#ffe8a0" if k in (6, 12) else "#8a5a32" if k % 4 else "#6a3e22")
        c.ret(x - 1, y - 1, 3, 3, cor)
        c.p(x - 1, y - 1, "#e8c070" if k < 2 else "#c88a5a")
        c.p(x + 1, y + 1, "#2a1a10")
    c.disco(lx + r * 0.7 + 15 * 0.72 + 0.5, ly + r * 0.7 + 15 * 0.72 + 0.5, 1.6, ("#ffe8a0", "#c8902e", "#5a3a14"), granulado=0.1)
    # a braçadeira de ferro que prende o cabo à parede
    bx, by = lx + r * 0.7 + 7 * 0.72, ly + r * 0.7 + 7 * 0.72
    c.ret(bx - 3, by + 2, 7, 2, "#24222a")
    c.ret(bx - 3, by + 2, 7, 1, "#6a6670")
    c.p(bx - 3, by + 3, "#a8a8b8")
    c.p(bx + 3, by + 3, "#a8a8b8")
    # sombra do aro e do cabo na parede (a luz vem da esquerda, de cima)
    c.mascara(elipse_m(lx + 2.5, ly + 2.5, r + 1.5, r + 1.5) * (1 - elipse_m(lx, ly, r + 1, r + 1)), "#2a2024", 0.45)
    # aro: latão grosso com a luz em cima à esquerda, filete escuro por dentro e rebites
    for y in range(ly - r - 2, ly + r + 3):
        for x in range(lx - r - 2, lx + r + 3):
            d = math.hypot(x - lx, y - ly)
            ang = math.atan2(y - ly, x - lx)
            luz = -math.cos(ang + math.pi * 0.72)
            if r - 2.4 <= d <= r + 0.6:
                cor = "#fff0b0" if luz > 0.7 else "#e8b850" if luz > 0.2 else "#b07a2c" if luz > -0.4 else "#6a4416"
                if d > r - 0.2:
                    cor = "#3a2410" if luz < 0.3 else cor
                c.p(x, y, cor)
            elif r - 3.2 <= d < r - 2.4:
                c.p(x, y, "#2a1a10")
            elif d < r - 3.2:
                # a lente: o enxaimel ampliado 2x, num vidro levemente azulado, com o céu refletido em cima
                sx, sy = int(round(377 + (x - lx) / 2.1)), int(round(98 + (y - ly) / 2.1))
                cor = atras[sy, sx] * 1.08
                k = (y - (ly - r)) / (2 * r)
                cor = cor * 0.78 + mistura("#e8f4f8", "#9ab8c4", k) * 0.22
                if d > r - 4.6:
                    cor = cor * 0.88 + hexa("#ffd890") * 0.12 * (luz < 0)
                if -0.5 < (x - lx) + (y - ly) * 0.9 + 3 < 1.6 and y < ly - 1:
                    cor = mistura("#ffffff", "#e8f4f8", 0.2)
                rel.p(x, y, cor)
    for i in range(12):
        a = i / 12 * math.tau + 0.2
        c.p(lx + math.cos(a) * (r - 1.2), ly + math.sin(a) * (r - 1.2), "#5a3a14" if i % 2 else "#ffe8a0")
    luzes.append((lx, ly, 30, 1.0, "#ffd890", 0.16))


def janela_enxaimel(c: Camada, e: Camada, x: int, y: int, w: int, h: int, luzes: list, seed: int) -> None:
    """Janela alta do andar com venezianas verdete, caixilho em cruz, vidro aceso e floreira."""
    c.ret(x - 3, y - 1, 2, h + 2, "#2e6a5e")
    c.ret(x - 3, y - 1, 1, h + 2, "#4e8a7a")
    c.ret(x + w + 1, y - 1, 2, h + 2, "#1e4a42")
    for k in range(y, y + h, 2):
        c.p(x - 2, k, "#1e4a42")
        c.p(x + w + 2, k, "#163a34")
    c.ret(x - 1, y - 1, w + 2, h + 2, "#3a2a22")
    e.ret(x, y, w, h, "#ffbe66")
    e.ret(x + 1, y + 1, max(1, w // 2 - 1), h // 3, "#ffeec4")
    for cam in (c, e):
        cam.ret(x + w // 2, y, 1, h, "#3a2418")
        cam.ret(x, y + h // 2, w, 1, "#3a2418")
    c.ret(x - 2, y + h + 1, w + 4, 2, "#7a4a2a")
    c.ret(x - 2, y + h + 1, w + 4, 1, "#a8704a")
    for k in range(w + 4):
        c.p(x - 2 + k, y + h - (k % 2), ["#f4a7c4", "#ffe07a", "#f07a6a", "#e8e0ff"][(k + seed) % 4])
        c.p(x - 2 + k, y + h + 1 - (k % 2), "#4a7a3a")
    luzes.append((x + w / 2, y + h * 0.6, 16, 0.9, "#ffaa50", 0.32))


def oficina(c: Camada, e: Camada, rel: Camada, campanario: Camada, luzes: list) -> None:
    """A oficina no lugar da torre; `campanario` recebe só a placa (a peça recortada que balança)."""
    pedra = ("#3e3a3e", "#5a524e", "#7a6e64", "#9a8c7c", "#b8a894", "#d2c4ac")
    pedra_lado = ("#24222a", "#302c34", "#3c3640", "#4a4248", "#585058")
    # ── Térreo de pedra (fachada e lado na sombra), com quinas em silharia.
    cantaria(c, XA, XB, ANDAR, BASE, 13, pedra, alt=5, larg=11, musgo_de=0.55)
    cantaria(c, XB, XB + LADO, ANDAR - 4, BASE, 14, pedra_lado, alt=5, larg=7, rejunte=("#1e1c22", "#16141a"), musgo_de=0.3)
    for y in range(ANDAR, BASE, 10):
        ww = 6 if (y // 10) % 2 == 0 else 3
        c.ret(XA, y, ww, 9, "#c4b6a2")
        c.ret(XA, y, ww, 1, "#e6dac6")
        c.ret(XA, y + 9, ww, 1, "#3a3236")
        c.ret(XA + ww - 1, y + 1, 1, 8, "#8a7c6e")
    c.ret(XA, ANDAR, 1, BASE - ANDAR, "#f2e8d4")

    # ── Andar de enxaimel em balanço (2 pixels para fora de cada lado), reboco morno e o madeiramento.
    x0, x1 = XA - 2, XB + 2
    for y in range(TOPO_CORPO, ANDAR):
        for x in range(x0, x1):
            u = (x - x0) / (x1 - x0)
            k = hash01(x, y, 71) * 0.1
            c.p(x, y, mistura(REBOCO[0], REBOCO[1], min(1, u * 0.7 + k)))
    # o lado do andar, na sombra
    for y in range(TOPO_CORPO + 2, ANDAR - 4):
        for x in range(x1, XB + LADO):
            c.p(x, y, mistura("#6a5e56", "#4a4048", (x - x1) / max(1, XB + LADO - x1) + hash01(x, y, 72) * 0.15))
    c.ret(x1, TOPO_CORPO + 2, 1, ANDAR - TOPO_CORPO - 6, "#1a161c")
    for xx in range(x1 + 3, XB + LADO, 4):
        c.ret(xx, TOPO_CORPO + 2, 1, ANDAR - TOPO_CORPO - 6, "#2a1c18")
    # frechal, travessa do meio, prumos e mãos-francesas (as diagonais do enxaimel), deixando livre o lugar da lupa
    for yy in (TOPO_CORPO, ANDAR - 2):
        c.ret(x0, yy, x1 - x0, 2, MADEIRA)
        c.ret(x0, yy, x1 - x0, 1, "#7a5034")
    c.ret(x0, ANDAR, x1 - x0, 1, "#1e1416", 0.7)
    for xx in (x0, x0 + 20, x1 - 22, x1 - 2):
        c.ret(xx, TOPO_CORPO, 2, ANDAR - TOPO_CORPO, MADEIRA)
    c.ret(x0, 100, x1 - x0, 2, MADEIRA)
    for (a, b) in (((x0 + 2, 99), (x0 + 19, TOPO_CORPO + 2)), ((x1 - 3, 99), (x1 - 21, TOPO_CORPO + 2))):
        c.linha(a[0], a[1], b[0], b[1], MADEIRA, grossura=2)
    for (a, b) in (((x0 + 2, ANDAR - 3), (x0 + 19, 102)), ((x1 - 3, ANDAR - 3), (x1 - 21, 102))):
        c.linha(a[0], a[1], b[0], b[1], MADEIRA, grossura=2)
    # cachorros de madeira sob o balanço
    for xx in range(x0 + 1, x1, 6):
        c.ret(xx, ANDAR + 1, 2, 2, "#3a2014")
        c.p(xx, ANDAR + 1, "#7a4a28")
    cornija(c, XA, XB, ANDAR + 3, LADO)
    # as janelas altas do andar, uma de cada lado da lupa
    janela_enxaimel(c, e, 364, 70, 9, 15, luzes, 1)
    janela_enxaimel(c, e, 408, 70, 9, 15, luzes, 3)
    lupa(c, e, rel, luzes)

    # ── Empena de frente em reboco com o óculo em roda dentada, e o telhado de telhas da vila.
    for y in range(APICE + 4, TOPO_CORPO):
        f = (y - APICE - 4) / (TOPO_CORPO - APICE - 4)
        meia = f * (x1 - x0) / 2
        for x in range(int(CX - meia), int(CX + meia) + 1):
            c.p(x, y, mistura(REBOCO[0], REBOCO[1], (x - x0) / (x1 - x0) * 0.8 + hash01(x, y, 73) * 0.08) * 0.95)
    # a linha da tesoura de lado a lado e as duas escoras até o óculo (sem pendural no meio: nada de cruz)
    fl = (54 - APICE - 4) / (TOPO_CORPO - APICE - 4) * (x1 - x0) / 2
    c.ret(CX - fl, 54, 2 * fl + 1, 2, MADEIRA)
    c.ret(CX - fl, 54, 2 * fl + 1, 1, "#7a5034")
    c.linha(CX - 13, 53, CX - 7, 46, MADEIRA, grossura=2)
    c.linha(CX + 13, 53, CX + 7, 46, MADEIRA, grossura=2)
    # óculo: aro de pedra, vidro aceso por trás de uma rosácea em forma de engrenagem
    ox, oy, orr = CX, 40, 7
    c.mascara(elipse_m(ox, oy, orr + 2, orr + 2), "#b8a894")
    c.mascara(elipse_m(ox + 0.6, oy + 0.6, orr + 2, orr + 2) * (1 - elipse_m(ox, oy, orr + 1.4, orr + 1.4)), "#6a5e56", 0.6)
    e.mascara(elipse_m(ox, oy, orr, orr), "#ffbe66")
    e.mascara(elipse_m(ox - 2, oy - 2, 3, 3), "#ffeec4")
    for cam in (c, e):
        for i in range(8):
            a = i / 8 * math.tau
            cam.linha(ox, oy, ox + math.cos(a) * (orr - 0.5), oy + math.sin(a) * (orr - 0.5), "#3a2418")
        cam.disco(ox + 0.5, oy + 0.5, 1.6, ("#e0b04c", "#9a6a24", "#5a3a14"), granulado=0.1)
        for i in range(16):
            a = i / 16 * math.tau
            cam.p(ox + math.cos(a) * (orr - 0.2), oy + math.sin(a) * (orr - 0.2), "#3a2418" if i % 2 else "#6a4a2a")
    luzes.append((ox, oy, 18, 1.0, "#ffb860", 0.35))
    # telhado: as duas águas da empena com beiral largo, telhas envelhecidas e musgo na água da sombra
    musgo = ruido(131, 4)
    for y in range(APICE, TOPO_CORPO + 4):
        f = (y - APICE) / (TOPO_CORPO + 4 - APICE)
        for lado in (-1, 1):
            meia = f * (x1 - x0 + 14) / 2
            for k in range(7):
                x = CX + lado * (meia - k)
                fila = (y - APICE) // 3
                tons = ("#e88a64", "#c25e3e", "#8a3c2a") if lado < 0 else ("#94462e", "#743a2e", "#4a2420")
                cor = hexa(tons[2] if (y + k) % 3 == 0 else tons[0] if k < 2 else tons[1])
                if hash01(int(x) // 3, fila, 137) > 0.88:
                    cor = cor * 0.86
                if lado > 0 and musgo[y, int(x) % W] > 0.6:
                    cor = cor * 0.5 + hexa("#4c6a38") * 0.5
                if k == 0:
                    cor = hexa("#ffd0aa" if lado < 0 else "#3a1c1c")
                c.p(x, y, cor)
    # a água do lado, em perspectiva: a faixa que corre para trás a partir da borda direita da empena
    beiral = (CX + (x1 - x0 + 14) / 2, TOPO_CORPO + 4)
    agua = poligono_m([(CX + 1, APICE), (CX + LADO + 1, APICE - 3), (beiral[0] + LADO - 6, beiral[1] - 3), (beiral[0] - 6, beiral[1])])
    for y, x in zip(*np.nonzero(agua)):
        em = (x + (y // 3) * 2) % 4
        cor = hexa("#2e1616" if (y % 3 == 2 or em == 3) else "#4e2622")
        if musgo[y, x] > 0.58:
            cor = cor * 0.6 + hexa("#3a5230") * 0.4
        c.p(x, y, cor)
    c.linha(CX + 1, APICE - 1, CX + LADO + 1, APICE - 4, "#c8705a")  # a cumeeira pega a luz
    # tábua de beiral (testeira) recortada e o pináculo de latão com uma engrenagem pequena
    for y in range(APICE, TOPO_CORPO + 4):
        f = (y - APICE) / (TOPO_CORPO + 4 - APICE)
        meia = f * (x1 - x0 + 14) / 2
        c.p(CX - meia + 7, y + 1, "#5a3420")
        c.p(CX + meia - 7, y + 1, "#2a1a14")
    c.ret(CX, APICE - 7, 1, 8, "#2a2428")
    engrenagem(c, CX + 0.5, APICE - 8.5, 2.6, 6, ("#fff0b0", "#e0b04c", "#9a6a24", "#5a3a14"), furo=0.9)
    # chaminé de pedra na água da sombra, com o fio de fumaça da forja pequena
    c.ret(410, 26, 5, 14, "#6a4a44")
    c.ret(410, 26, 1, 14, "#a87a6a")
    c.ret(414, 26, 1, 14, "#3a2828")
    c.ret(409, 24, 7, 2, "#3e2c2c")

    # ── O térreo: vitrine sob o toldo verdete, a porta em arco com a arandela, os degraus.
    vx0, vx1, vy0, vy1 = 362, 400, 130, 158
    c.ret(vx0 - 2, vy0 - 2, vx1 - vx0 + 4, vy1 - vy0 + 4, "#3a2a22")
    c.ret(vx0 - 2, vy0 - 2, 1, vy1 - vy0 + 4, "#7a5a40")
    # o fundo da vitrine (madeira escura) e a prateleira
    rel.ret(vx0, vy0, vx1 - vx0, vy1 - vy0, "#3a2416")
    rel.mascara(np.clip(1 - np.hypot(_XS - 378, _YS - 140) / 22, 0, 1) * (_XS >= vx0) * (_XS < vx1) * (_YS >= vy0) * (_YS < vy1), "#c88a48", 0.35)
    rel.ret(vx0, 145, vx1 - vx0, 1, "#8a5a32")
    rel.ret(vx0, 146, vx1 - vx0, 1, "#2a180e")
    rel.ret(vx0, vy1 - 3, vx1 - vx0, 3, "#6a4428")
    rel.ret(vx0, vy1 - 3, vx1 - vx0, 1, "#a8784a")
    # em cima: relógios de bolso pendurados e engrenagens soltas
    # relógios de bolso pendurados pela corrente, em alturas diferentes (mostrador claro, ponteiros, coroa)
    for (gx, gy, fio) in ((366, 138, 6), (396, 136, 4)):
        for k in range(fio):
            rel.p(gx, gy - 3 - fio + k, "#c8902e" if k % 2 else "#8a5a20")
        rel.p(gx, gy - 3, "#ffe8a0")
        rel.disco(gx + 0.5, gy + 0.5, 2.7, ("#e0b04c", "#a8742a", "#5a3a14"), granulado=0.05)
        rel.disco(gx + 0.5, gy + 0.5, 1.7, ("#f4ecdc", "#e0d4bc", "#c8b89a"), granulado=0.05)
        rel.p(gx, gy - 1, "#3a2a20")
        rel.p(gx + 1, gy, "#3a2a20")
    # engrenagens: uma grande e outra pequena, engatadas
    engrenagem(rel, 382.5, 138.5, 3.4, 10, ("#ffe8a0", "#d0a040", "#8a5a20", "#4a2c10"), furo=1.1)
    engrenagem(rel, 388.5, 141.5, 2.0, 7, ("#ffe0a0", "#c8902e", "#7a4a18", "#3a2410"), furo=0.6, fase=0.4)
    # embaixo: o manequim de mão articulado (madeira clara), a pinça e a lupinha de relojoeiro
    mx, my = 371, 154
    rel.ret(mx - 2, my - 1, 5, 2, "#7a4a2a")  # base
    rel.ret(mx, my - 4, 1, 3, "#a87a4a")  # punho
    for (dx, alt) in ((-2, 5), (-1, 7), (0, 8), (1, 7), (2, 5)):
        rel.ret(mx + dx, my - 4 - alt, 1, alt, "#e8c890" if dx < 1 else "#c8a070")
        rel.p(mx + dx, my - 4 - alt // 2, "#8a6038")  # a junta do dedo
    rel.ret(mx - 2, my - 6, 5, 2, "#d8b07a")  # palma
    rel.p(mx - 3, my - 6, "#e8c890")  # polegar
    rel.p(mx - 4, my - 7, "#e8c890")
    rel.linha(380, 155, 386, 151, "#d8d8e0")  # a pinça
    rel.linha(380, 155, 386, 152, "#8a8a98")
    rel.disco(393.5, 152.5, 2.2, ("#ffe8a0", "#9a6a24", "#3a2410"), granulado=0.1)  # a lupinha de olho
    rel.p(393, 152, "#e8f2f4")
    rel.p(394, 152, "#a8c0c8")
    # caixilhos da vitrine e o reflexo do vidro
    for xx in (375, 388):
        rel.ret(xx, vy0, 1, vy1 - vy0, "#2a1a10")
    rel.ret(vx0, 144, vx1 - vx0, 1, "#2a1a10")
    rel.mascara(((np.mod(_XS + _YS * 0.8, 13) < 2) * (_XS >= vx0) * (_XS < vx1) * (_YS >= vy0) * (_YS < vy1)).astype(np.float32), "#ffffff", 0.12)
    c.ret(vx0 - 3, vy1 + 2, vx1 - vx0 + 6, 2, "#b8a898")
    c.ret(vx0 - 3, vy1 + 2, vx1 - vx0 + 6, 1, "#e8dccc")
    luzes.append((378, 146, 30, 1.0, "#ffb060", 0.55))
    # o toldo verdete e creme, com o babado recortado e a sombra na vitrine
    for y in range(121, 128):
        for x in range(vx0 - 4, vx1 + 4):
            faixa = ((x - vx0) // 3) % 2
            luz = (y - 121) / 7
            cor = mistura("#2a7a6c", "#145a50", luz) if faixa == 0 else mistura("#f2e8d2", "#c8b898", luz)
            c.p(x, y, cor)
    c.ret(vx0 - 4, 121, vx1 - vx0 + 8, 1, "#0e3a34")
    for x in range(vx0 - 4, vx1 + 4):
        if (x - vx0) % 3 != 2:
            c.p(x, 128, "#1e6a5e" if ((x - vx0) // 3) % 2 == 0 else "#d8cab0")
    c.ret(vx0 - 4, 128, 1, 2, "#2a2024")
    c.ret(vx1 + 3, 128, 1, 2, "#2a2024")
    c.ret(vx0, 130, vx1 - vx0, 3, "#1a1014", 0.45)
    # porta em arco com vidrinho aceso, ferragens e a argola
    px0, py0, pw = 405, 140, 14
    porta = poligono_m([(px0, BASE), (px0, py0 + 7), (px0 + pw, py0 + 7), (px0 + pw, BASE)])
    porta = np.maximum(porta, elipse_m(px0 + pw / 2 - 0.5, py0 + 7, pw / 2, 7) * (_YS <= py0 + 7))
    madeira = np.zeros((H, W, 3), dtype=np.float32) + hexa("#5e3a20")
    madeira = madeira * (0.82 + 0.3 * ruido(151, 1, 6))[:, :, None]
    madeira = madeira * (1 - (np.mod(_XS - px0, 4) == 0) * 0.4)[:, :, None]
    c.mascara(porta, madeira)
    vao = _contorno(porta) & (_YS < BASE) & (_YS > py0 - 2)
    c.mascara(vao.astype(np.float32), "#d2c2ac")
    e.ret(px0 + 4, py0 + 3, 6, 6, "#ffbe66")
    e.ret(px0 + 5, py0 + 4, 2, 2, "#ffeec4")
    for cam in (c, e):
        cam.ret(px0 + 7, py0 + 3, 1, 6, "#3a2418")
        cam.ret(px0 + 4, py0 + 6, 6, 1, "#3a2418")
    for yb in (py0 + 13, py0 + 22):
        c.ret(px0 + 1, yb, pw - 1, 1, "#2a2a32")
        for k in range(px0 + 2, px0 + pw, 3):
            c.p(k, yb, "#a8a8b8")
    c.disco(px0 + 3.5, py0 + 18.5, 1.2, ("#ffe8a0", "#a8742a", "#4a2a10"))
    luzes.append((px0 + 7, py0 + 6, 14, 1.0, "#ffa850", 0.35))
    sx = px0 + pw + 2  # arandela ao lado da porta
    c.ret(sx - 1, py0 + 3, 2, 1, "#1e1a20")
    c.ret(sx, py0 - 3, 4, 1, "#1e1a20")
    c.ret(sx + 1, py0 - 4, 2, 1, "#1e1a20")
    c.ret(sx, py0 - 2, 1, 6, "#2a2430")
    c.ret(sx + 3, py0 - 2, 1, 6, "#2a2430")
    c.ret(sx, py0 + 4, 4, 1, "#1e1a20")
    e.ret(sx + 1, py0 - 2, 2, 6, "#ffd890")
    e.p(sx + 1, py0 - 1, "#ffffff")
    luzes.append((sx + 2, py0 + 2, 18, 1.0, "#ffb060", 0.55))
    for (i, (dy, mg)) in enumerate(((0, 2), (2, 4), (4, 6))):
        y = BASE + dy
        c.ret(px0 - mg, y, pw + 2 * mg, 2, "#a89a90" if i else "#b8aaa0")
        c.ret(px0 - mg + 1, y, pw + 2 * mg - 2, 1, "#e2d6c6")
        c.ret(px0 + pw // 2 - 3, y, 6, 1, "#c8baa8")
    # banco de pedra sob a vitrine e um vaso de flores no canto
    c.ret(vx0, 163, vx1 - vx0 - 6, 3, "#a89a8c")
    c.ret(vx0, 163, vx1 - vx0 - 6, 1, "#ddd0bc")
    c.ret(vx0 + 2, 166, 2, 4, "#6a5e5a")
    c.ret(vx1 - 10, 166, 2, 4, "#6a5e5a")
    for k in range(7):
        c.p(XA - 3 + k, 166 - (k % 2), ["#e86a6a", "#ffd86a", "#f4a7c4", "#ffffff"][k % 4])
        c.p(XA - 3 + k, 167 - (k % 2), "#4a7a3a")
    c.ret(XA - 2, 167, 5, 3, "#9a5a3a")
    c.ret(XA - 2, 167, 5, 1, "#c8805a")

    # ── O braço de ferro da placa, preso à quina iluminada, com a voluta por baixo; a placa vai na camada própria.
    hx, hy = PLACA
    c.ret(hx - 9, hy - 2, XA - hx + 9, 2, "#24222a")
    c.ret(hx - 9, hy - 2, XA - hx + 9, 1, "#6a6670")
    c.ret(XA - 2, hy - 4, 3, 6, "#2a2630")
    for k in range(10):  # a voluta (espiral simples) que escora o braço
        a = k / 10 * math.pi * 1.6
        c.p(XA - 4 - math.cos(a) * (3 + k * 0.5), hy + 1 + math.sin(a) * (2 + k * 0.4), "#24222a")
    c.p(hx - 10, hy - 2, "#24222a")
    c.disco(hx - 10.5, hy - 1.5, 1.3, ("#ffe8a0", "#c8902e", "#5a3a14"), granulado=0.1)
    placa(campanario)
    luzes.append((hx, hy + 18, 14, 1.0, "#ffc070", 0.12))

    # hera subindo pela quina do térreo
    g = np.random.default_rng(112)
    for k in range(90):
        y = BASE - g.random() ** 1.6 * 48
        x = XA - 1 + g.random() * 6 * (1 - (BASE - y) / 52)
        c.p(x, y, ["#5a8a4a", "#3e6a3a", "#7aa85a", "#2e5230"][k % 4])


_bandeirolas = t.bandeirolas


def bandeirolas(c: Camada, pontos, seed: int) -> None:
    """O cordão da esquerda da torre daria na placa: aqui ele sai da casa e vai para trás, no alto da empena."""
    (x0, y0), (x1, y1) = pontos
    if x0 == 340:
        return _bandeirolas(c, ((326, 110), (338, 112)), seed)
    return _bandeirolas(c, ((XB + LADO, 104), (452, 106)), seed)


def configurar() -> None:
    """Põe a oficina no lugar da torre, com as constantes que a montagem da torre usa nas sombras e na luz."""
    t.torre = oficina
    t.bandeirolas = bandeirolas
    t.CX, t.XA, t.XB, t.LADO, t.TOPO_CORPO, t.BASE = CX, XA, XB, LADO, TOPO_CORPO, BASE


def gerar(periodo: str) -> None:
    configurar()
    t.P = periodo
    v.PERIODO = periodo
    PASTA.mkdir(parents=True, exist_ok=True)
    com, mascara = t.montar(True)
    sem, _ = t.montar(False)
    nome = f"oficina-mao-{periodo}"
    sem.save(PASTA / f"{nome}.webp", quality=84, method=6)
    sem.resize((960, 400), Image.LANCZOS).save(PASTA / f"{nome}-960.webp", quality=84, method=6)
    ys, xs = np.nonzero(mascara > 0.5)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.asarray(com)[y0:y1, x0:x1]
    rgba[:, :, 3] = (mascara[y0:y1, x0:x1] > 0.5) * 255
    Image.fromarray(rgba).save(PASTA / f"oficina-mao-placa-{periodo}.png", optimize=True)
    tam = (PASTA / f"{nome}.webp").stat().st_size // 1024, (PASTA / f"{nome}-960.webp").stat().st_size // 1024
    print(f"{nome}: {tam[0]} KB, 960: {tam[1]} KB; placa em x {x0}-{x1}, y {y0}-{y1} (de 1440 x 600)")


if __name__ == "__main__":
    for p in [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS):
        gerar(p)
