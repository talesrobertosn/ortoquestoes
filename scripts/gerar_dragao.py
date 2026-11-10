#!/usr/bin/env python3
"""O dragão vermelho, quarto mascote (10/11/2026, pedido do Tales: o guardião do tesouro de "Indique e ganhe", que
também visita o menu soltando fogo). Original, feito do zero com o motor de scripts/gerar_mascote.py (formas por campo
de distância, luz calculada, contorno e paletas): chibi de três quartos virado para a esquerda, escamas vermelhas,
barriga em placas douradas, um chifre no nariz e dois para trás, espinhos no dorso, asas de membrana alaranjada, cauda
em ponta de lança e olho âmbar de pupila em fenda.

Gera public/pixel/mascote/dragao.png: quadros de 224 x 112, 12 por linha, uma linha por comportamento (ids em
src/componentes/mascote/sprites.ts, LINHAS_DRAGAO): parado, voando, pousando, fogo, dormindo, rugindo.
O dragão ocupa a direita do quadro; a esquerda fica livre para o jato de fogo.

Uso: python3 scripts/gerar_dragao.py [--previa ARQUIVO.png]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar_mascote as gm  # noqa: E402
from gerar_mascote import Mat, Quadro2D, Tela, bezier, capsula, circulo, elipse, hx, poligono, rampa, ruido, traco  # noqa: E402

DW, DH, DQ = 224, 112, 12
OX = 98          # deslocamento do dragão no quadro (a esquerda é do fogo)
CHAO = 104.0
TAU = math.tau

NOVOS = {
    "dragao": Mat(rampa("#1e0408", "#38070c", "#560c12", "#78131a", "#9c1c20", "#c02a26", "#de4630", "#f46a44", "#ff9a6a"), hx("#16030a"), rim=0.55, tex=0.05, brilho=0.25),
    "dragao_escuro": Mat(rampa("#14030a", "#26050c", "#3c0810", "#560d16", "#72141c", "#8e2024"), hx("#0e0206"), rim=0.4, tex=0.05),
    "barriga": Mat(rampa("#4a2a0c", "#7a4a14", "#a8721e", "#cf9a30", "#eabf52", "#f8dc82", "#fff2b8"), hx("#241204"), rim=0.3, tex=0.03, brilho=0.35),
    "membrana": Mat(rampa("#2a060a", "#4a0c0e", "#701810", "#982c14", "#c2481c", "#e26c2a", "#f6964a"), hx("#16030a"), rim=0.45, tex=0.04),
    "membrana_tras": Mat(rampa("#16040a", "#26060c", "#3a0a0e", "#521212", "#6c1e16", "#86301c"), hx("#0e0206"), rim=0.25, tex=0.04),
    "chifre": Mat(rampa("#3a2a22", "#6a5238", "#9a7e52", "#c6aa76", "#e6d2a0", "#fbf2d4"), hx("#1c120c"), rim=0.35, tex=0.04, brilho=0.3),
    "olho_dragao": Mat(rampa("#7a3a04", "#c87808", "#f4b418", "#ffe050", "#fff8c0"), hx("#1a0a02"), emite=True, bloom=0.25),
    "fumaca": Mat(rampa("#3a3438", "#5a5458", "#807a7c", "#a8a2a2"), hx("#2a2428"), rim=0.0, amb=0.7, kd=0.3),
}
for nome, mat in NOVOS.items():
    if nome not in gm.MATS:
        gm.MATS[nome] = mat
        gm.NOMES_MAT.append(nome)
        gm.IDX_MAT[nome] = len(gm.NOMES_MAT) - 1


def escamas(fase: float = 0.0, k: float = 0.075):
    """Escamas em fileiras alternadas: um arco claro em cima e a borda escura embaixo de cada uma."""
    def tom(X, Y):
        v = (Y + fase) / 3.6
        linha = np.floor(v)
        u = X / 4.4 + (linha % 2) * 0.5
        fx, fy = u - np.floor(u) - 0.5, v - linha
        # cada escama é um "U": a borda de baixo, arredondada, fica escura; o miolo de cima, claro
        arco = fy - (0.62 + 0.38 * (1 - (fx * 2) ** 2) ** 0.5 * 0.9 - 0.34)
        return np.where(np.abs(arco) < 0.13, -k * 1.6, np.where((fy < 0.34) & (np.abs(fx) < 0.26), k * 0.9, 0.0))
    return tom


def placas(X, Y):
    """Placas da barriga: faixas horizontais com a junta escura."""
    f = (Y / 3.6) - np.floor(Y / 3.6)
    return np.where(f < 0.16, -0.2, np.where(f < 0.42, 0.07, 0.0))


def sombra(t: Tela, cx: float, larg: float, forca: float = 1.0):
    for dy, a in ((0, 0.42), (1, 0.26)):
        for x in range(int(cx - larg) - 1, int(cx + larg) + 2):
            d = abs(x + 0.5 - cx) / larg
            if d < 1:
                t.ponto_fx(x, CHAO + dy, "#0c0710", (a if d < 0.62 else a * 0.55) * forca, sob=True)


def asa(t: Tela, ombro, ang: float, abre: float, z: float, tras: bool = False, bate: float = 0.0):
    """Asa de morcego: braço, três dedos e a membrana recortada entre eles. ang gira a asa no ombro (negativo = para
    cima), abre estica (1 = aberta, 0,5 = recolhida)."""
    q = Quadro2D(ombro, ang, abre)
    pulso = (9.0, -25.0)
    pontas = [(31.0, -35.0 + bate * 3), (43.0, -17.0 + bate * 5), (38.0, 3.0 + bate * 5)]
    preso = (9.0, 9.0)
    def meio(a, b, puxa):
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        return (mx + (pulso[0] - mx) * puxa, my + (pulso[1] - my) * puxa)
    contorno = [(0.0, 1.0), (4.0, -13.0), pulso, meio(pulso, pontas[0], -0.16), pontas[0], meio(pontas[0], pontas[1], 0.3), pontas[1],
                meio(pontas[1], pontas[2], 0.34), pontas[2], meio(pontas[2], preso, 0.42), preso]
    mem, osso = ("membrana_tras", "dragao_escuro") if tras else ("membrana", "dragao")
    pid = "asa_t" if tras else "asa"
    uv = q.uv()
    def veios(X, Y):
        u, v = uv(X, Y)
        a = np.arctan2(v - pulso[1], u - pulso[0])
        return 0.05 * np.sin(a * 9.0) - 0.035 * np.hypot(u - pulso[0], v - pulso[1]) / 30
    t.pinta(q.forma(poligono(contorno)), mem, z, R=5.0, pid=pid, tom=veios, semente=71 + tras)
    for ponta in pontas:
        t.pinta(q.forma(traco([pulso, meio(pulso, ponta, 0.04), ponta], [1.7, 1.3, 0.7])), osso, z + 0.05, R=1.2, pid=pid + "_dedo", semente=73)
        t.pinta(q.forma(circulo(ponta, 1.0)), "chifre", z + 0.06, R=0.8, pid=pid + "_garra", sem_contorno=True)
    t.pinta(q.forma(traco([(0.0, 0.0), (4.5, -13.0), pulso], [3.2, 2.6, 2.0])), osso, z + 0.1, R=2.0, pid=pid + "_braco", tom=escamas(1.0, 0.05), semente=74)
    t.pinta(q.forma(poligono([(pulso[0] - 1.6, pulso[1] - 0.4), (pulso[0] + 0.4, pulso[1] - 7.5), (pulso[0] + 2.2, pulso[1] - 0.2)])), "chifre", z + 0.12, R=0.9, pid=pid + "_unha")


def espinhos(t: Tela, pts, z: float, alt: float = 4.6, cada: int = 2, cima=-1.0, pid="espinho"):
    """Fileira de espinhos ao longo de uma curva (o dorso), maiores no meio."""
    n = len(pts)
    for i in range(1, n - 1, cada):
        (x0, y0), (x1, y1) = pts[i - 1], pts[i + 1]
        tx, ty = x1 - x0, y1 - y0
        L = math.hypot(tx, ty) or 1
        nx, ny = ty / L * -cima, -tx / L * -cima
        if ny > 0:
            nx, ny = -nx, -ny
        h = alt * (0.55 + 0.45 * math.sin(i / (n - 1) * math.pi))
        cx, cy = pts[i]
        t.pinta(poligono([(cx - tx / L * 2.1, cy - ty / L * 2.1), (cx + nx * h + tx / L * 1.2, cy + ny * h + ty / L * 1.2), (cx + tx / L * 2.1, cy + ty / L * 2.1)]),
                "dragao_escuro", z, R=1.2, pid=f"{pid}{i}", tom=lambda X, Y, cy=cy, h=h: np.clip((cy - Y) / max(h, 1), 0, 1) * 0.5)


def cabeca(t: Tela, c, inc: float, boca: float = 0.0, fechado: bool = False, z: float = 4.0, olhar: float = 0.0, bravo: float = 0.0):
    q = Quadro2D(c, inc)
    qm = Quadro2D(q.p(2.0, 5.0), inc - boca * 26)
    # chifres de trás (dois de cada lado; os de trás, mais escuros)
    for (a, m, b, r0, zz, tom) in (((5.0, -4.5), (11.0, -12.5), (19.5, -14.5), 2.5, z - 0.5, -0.12), ((2.5, -6.0), (8.0, -15.0), (17.0, -19.0), 2.7, z + 0.3, 0.0)):
        pts = bezier(a, m, b, 7)
        t.pinta(q.forma(traco(pts, [r0 - (r0 - 0.5) * i / 6 for i in range(7)])), "chifre", zz, R=1.6, pid=f"chifre{zz}", tom=lambda X, Y, tom=tom: tom + 0.05 * np.sin((X + Y) * 1.6), semente=81)
    # barbatanas da bochecha
    t.pinta(q.forma(poligono([(4.0, 2.0), (14.5, -1.0), (10.0, 4.0), (16.0, 6.5), (9.5, 8.0), (13.0, 12.5), (4.5, 9.5)])), "membrana", z - 0.3, R=2.0, pid="barbatana", semente=82)
    # mandíbula
    queixo = elipse((-9.0, 1.6), 9.0, 3.3).suave(elipse((-1.0, 1.0), 5.0, 3.6), 1.5)
    if boca > 0.05:
        t.pinta(qm.forma(elipse((-8.5, -0.4), 8.0, 2.6)), "interior", z - 0.25, R=2.0, pid="boca_dentro")
        t.pinta(qm.forma(elipse((-9.0, 0.6), 5.5, 1.5)), "borracha", z - 0.22, R=1.2, pid="lingua")
    t.pinta(qm.forma(queixo), "dragao", z - 0.2, R=3.0, pid="queixo", tom=escamas(2.0, 0.05), semente=83)
    t.pinta(qm.forma(elipse((-8.0, 3.2), 8.0, 1.9)), "barriga", 0, sobre="queixo", R=1.5)
    if boca > 0.05:
        for x in (-15.0, -11.5, -8.0):
            t.pinta(qm.forma(poligono([(x - 1.0, -0.8), (x, -3.6), (x + 1.0, -0.8)])), "dente", z - 0.1, R=0.6, pid="dente_b", sem_contorno=True)
    # crânio e focinho
    cranio = elipse((0.0, 0.0), 10.0, 8.6).suave(elipse((-11.5, 2.2), 9.2, 5.0), 3.0).suave(elipse((-17.5, 0.8), 3.4, 3.2), 1.6)
    t.pinta(q.forma(cranio), "dragao", z, R=6.0, pid="cabeca", uv=q.uv(), tom=escamas(0.0, 0.06), semente=84)
    t.pinta(q.forma(elipse((-12.0, 6.0), 8.0, 1.5)), "dragao_escuro", 0, sobre="cabeca", R=1.0)
    for x in (-17.0, -13.5, -10.0, -6.5):  # dentes de cima, sempre à mostra
        t.pinta(q.forma(poligono([(x - 1.0, 6.4), (x, 9.0 + (x == -17.0) * 0.6), (x + 1.0, 6.4)])), "dente", z + 0.05, R=0.6, pid="dente", sem_contorno=True)
    # o chifre do nariz e a narina
    t.pinta(q.forma(poligono([(-19.6, -0.6), (-22.5, -12.0), (-14.6, -2.6)]).engrossa(0.5)), "chifre", z + 0.3, R=1.6, pid="chifre_nariz", tom=lambda X, Y: 0.05 * np.sin(Y * 1.8), semente=85)
    t.pinta(q.forma(elipse((-17.6, 2.6), 1.1, 0.75, 20)), "pupila", z + 0.1, R=0.5, pid="narina", sem_contorno=True)
    # crista da sobrancelha e o olho âmbar
    t.pinta(q.forma(traco([(-9.5, -4.2 + bravo), (-5.0, -6.4), (1.5, -5.6 - bravo * 0.5)], [1.3, 1.7, 1.3])), "dragao_escuro", z + 0.25, R=1.2, pid="sobrancelha")
    ex, ey = -4.4, -1.2
    if fechado:
        t.pinta(q.forma(traco([(ex - 2.6, ey - 0.2), (ex, ey + 1.1), (ex + 2.6, ey - 0.2)], 0.5)), "pupila", z + 0.2, R=0.5, pid="olho", sem_contorno=True)
    else:
        t.pinta(q.forma(elipse((ex, ey), 3.1, 3.2)), "pupila", z + 0.12, R=0.6, pid="olho", sem_contorno=True)
        t.pinta(q.forma(elipse((ex, ey), 2.5, 2.7)), "olho_dragao", z + 0.15, pid="olho", tom=lambda X, Y: 0.95 - np.clip((Y - q.p(ex, ey)[1]) * 0.16 + 0.2, 0, 0.6), sem_contorno=True)
        t.pinta(q.forma(elipse((ex - 0.3 + olhar, ey), 0.62, 2.4)), "pupila", z + 0.2, pid="olho", sem_contorno=True)
        t.pinta(q.forma(circulo((ex - 1.1, ey - 1.3), 0.6)), "olho_dragao", z + 0.25, pid="olho", tom=1.0, sem_contorno=True)
    for (x, y, r) in ((-1.0, 4.6, 0.9), (2.0, 5.6, 0.7), (-13.0, -1.6, 0.7), (-10.5, -2.6, 0.6)):  # pintas de escama clara
        t.pinta(q.forma(circulo((x, y), r)), "dragao", 0, sobre="cabeca", R=0.6, tom=0.16, normal=False)
    return q, qm


def perna(t: Tela, quadril, pe, z: float, tras: bool = False, coxa: float = 6.5, pid="perna"):
    mat = "dragao_escuro" if tras else "dragao"
    joelho = ((quadril[0] + pe[0]) / 2 - 3.0, (quadril[1] + pe[1]) / 2 + 0.5)
    t.pinta(elipse(quadril, coxa, coxa * 1.08).suave(capsula(joelho, (pe[0] + 1.0, pe[1] - 2.2), 3.1, 2.7), 2.0), mat, z, R=4.0, pid=pid, tom=escamas(3.0, 0.05), semente=91)
    t.pinta(elipse((pe[0] - 2.4, pe[1] - 1.6), 4.8, 2.4), mat, z + 0.05, R=2.0, pid=pid + "_pe", semente=92)
    for i in range(3):
        gx = pe[0] - 6.4 + i * 2.5
        t.pinta(poligono([(gx, pe[1] - 2.2), (gx - 1.9, pe[1] + 0.3), (gx + 1.2, pe[1] - 0.4)]), "chifre", z + 0.1, R=0.8, pid=pid + "_garra", sem_contorno=True)


def cauda(t: Tela, pts, z: float):
    n = len(pts)
    rs = [6.2 - 4.9 * (i / (n - 1)) ** 0.85 for i in range(n)]
    t.pinta(traco(pts, rs), "dragao", z, R=3.6, pid="cauda", tom=escamas(1.5, 0.055), semente=95)
    t.pinta(traco([(x, y + r * 0.62) for (x, y), r in zip(pts, rs)][: n - 2], [r * 0.5 for r in rs][: n - 2]), "barriga", 0, sobre="cauda", R=1.2, tom=placas)
    espinhos(t, pts[1:-1], z - 0.1, alt=3.6, pid="esp_cauda")
    (x0, y0), (x1, y1) = pts[-2], pts[-1]
    tx, ty = x1 - x0, y1 - y0
    L = math.hypot(tx, ty) or 1
    tx, ty = tx / L, ty / L
    nx, ny = -ty, tx
    ponta = [(x1 - tx * 1.0 + nx * 1.2, y1 - ty * 1.0 + ny * 1.2), (x1 + tx * 1.5 + nx * 5.6, y1 + ty * 1.5 + ny * 5.6), (x1 + tx * 10.0, y1 + ty * 10.0),
             (x1 + tx * 1.5 - nx * 5.6, y1 + ty * 1.5 - ny * 5.6), (x1 - tx * 1.0 - nx * 1.2, y1 - ty * 1.0 - ny * 1.2)]
    t.pinta(poligono(ponta), "membrana", z + 0.1, R=2.2, pid="lanca", semente=96)


def fogo(t: Tela, boca_pt, forca: float, k: int, direcao=(-1.0, 0.28)):
    """Jato de fogo em três camadas (brasa por fora, chama, miolo claro), com a borda viva e fagulhas."""
    if forca <= 0.02:
        return
    bx, by = boca_pt
    comp = 16 + 62 * forca
    dx, dy = direcao
    L = math.hypot(dx, dy); dx, dy = dx / L, dy / L
    nx, ny = -dy, dx
    def cone(larg0, larg1, alcance, seed):
        def f(X, Y):
            u = (X - bx) * dx + (Y - by) * dy
            v = (X - bx) * nx + (Y - by) * ny
            tt = np.clip(u / alcance, 0, 1)
            meia = larg0 + (larg1 - larg0) * np.sin(tt * math.pi * 0.62) ** 0.9
            onda = ruido(u * 0.2 - k * 1.7, v * 0.35 + seed, seed) * (1.5 + 3.5 * tt)
            return np.maximum(np.abs(v + onda) - meia * (1.0 - tt ** 3 * 0.6), np.maximum(-u, u - alcance - onda * 1.5))
        return gm.Forma(f, (bx - comp - 10, by - 26, bx + 4, by + 40))
    t.pinta(cone(2.0, 12.5, comp, 5), "brasa", 6.0, R=6.0, pid="fogo1", tom=lambda X, Y: np.clip(0.2 + 0.25 * ruido(X * 0.3 + k, Y * 0.3, 9), 0, 1), sem_contorno=True)
    t.pinta(cone(1.6, 8.6, comp * 0.86, 6), "chama", 6.1, R=5.0, pid="fogo2", tom=lambda X, Y: np.clip(0.5 + 0.3 * ruido(X * 0.35 + k * 1.3, Y * 0.35, 11), 0, 1), sem_contorno=True)
    t.pinta(cone(1.0, 4.6, comp * 0.62, 7), "chama", 6.2, R=3.0, pid="fogo3", tom=0.98, sem_contorno=True)
    t.luz(bx - comp * 0.4 * abs(dx), by + comp * 0.3 * dy, 14, "#ff9a3c", 60, 1.5 * forca)
    g = np.random.default_rng(600 + k)
    for _ in range(int(16 * forca)):
        u = g.random() * comp * 1.12
        v = (g.random() - 0.5) * (8 + u * 0.38)
        t.ponto_fx(bx + dx * u + nx * v, by + dy * u + ny * v - g.random() * 5, ("#fff4c0", "#ffc040", "#ff8a20")[int(g.random() * 3)], 0.95)


def dragao(t: Tela, k: int, sobe: float = 0.0, resp: float = 0.0, cab_inc: float = 0.0, cab_dx: float = 0.0, cab_dy: float = 0.0, boca: float = 0.0,
           asa_ang: float = 24.0, asa_abre: float = 0.5, bate: float = 0.0, cauda_f: float = 0.0, fechado: bool = False, voo: float = 0.0, olhar: float = 0.0,
           chama: float = 0.0, bravo: float = 0.0, com_sombra: float = 1.0):
    """O dragão sentado (voo=0) ou no ar (voo=1: pernas recolhidas, corpo deitado para a frente)."""
    oy = -sobe
    t.origem = (OX, oy)
    if com_sombra > 0:
        sombra(t, OX + 72, 30 - 8 * voo, com_sombra * (1 - 0.55 * voo))
    P = lambda x, y: (OX + x, y + oy)
    corpo_c = P(70, 79 - resp * 0.5)
    # asa de trás, cauda e pernas de trás
    asa(t, P(71, 63), asa_ang - 10, asa_abre * 0.95, 0.4, tras=True, bate=bate)
    cf = math.sin(cauda_f * TAU)
    cauda(t, [P(86, 86), P(96, 94 - voo * 6), P(107, 97 + cf * 1.5 - voo * 10), P(117, 92 + cf * 3 - voo * 13), P(122, 83 + cf * 4 - voo * 14), P(120, 74 + cf * 3 - voo * 13)], 1.4)
    perna(t, P(81, 87 - voo * 2), P(84 + voo * 6, CHAO - 1 - voo * 9 + sobe * (1 - voo)), 1.0, tras=True, pid="perna_t")
    perna(t, P(60, 86 - voo * 2), P(57 + voo * 4, CHAO - 1 - voo * 10 + sobe * (1 - voo)), 1.1, tras=True, coxa=4.6, pid="braco_t")
    # corpo e barriga em placas
    corpo = elipse(corpo_c, 20.5, 15.5 + resp * 0.5).suave(elipse(P(58, 71), 12.0, 11.5), 4.0)
    t.pinta(corpo, "dragao", 2.0, R=11.0, pid="corpo", tom=escamas(0.0), semente=101)
    t.pinta(elipse(P(59, 84), 12.5, 12.0).suave(elipse(P(52, 70), 6.5, 8.0), 3.0), "barriga", 0, sobre="corpo", R=7.0, tom=placas)
    # pescoço em S com espinhos e a faixa dourada na frente
    hc = P(37 + cab_dx, 47 + cab_dy)
    pesc = bezier(P(58, 68), P(57 + cab_dx * 0.3, 52 + cab_dy * 0.5), (hc[0] + 6, hc[1] + 5), 8)
    t.pinta(traco(pesc, [9.2, 8.8, 8.2, 7.6, 7.2, 6.8, 6.6, 6.4]), "dragao", 2.6, R=5.0, pid="pescoco", tom=escamas(1.0), semente=102)
    t.pinta(traco([(x - 4.4, y + 2.0) for (x, y) in pesc], [3.6, 3.5, 3.3, 3.1, 3.0, 2.9, 2.8, 2.6]), "barriga", 0, sobre="pescoco", R=2.0, tom=placas)
    dorso = [(x + 6.5, y - 3.0) for (x, y) in pesc[::-1]] + [P(70, 62.5 - resp * 0.5), P(80, 65 - resp * 0.4), P(88, 72), P(92, 80)]
    espinhos(t, dorso, 2.5, alt=5.4, cada=1, pid="esp_dorso")
    # pernas da frente
    perna(t, P(85, 89 - voo * 2), P(88 + voo * 6, CHAO - voo * 8 + sobe * (1 - voo)), 3.0, pid="perna")
    perna(t, P(63, 88 - voo * 2), P(61 + voo * 4, CHAO - voo * 9 + sobe * (1 - voo)), 3.1, coxa=4.9, pid="braco")
    # asa da frente e a cabeça
    asa(t, P(74, 65), asa_ang, asa_abre, 3.4, bate=bate)
    q, qm = cabeca(t, hc, cab_inc, boca=boca, fechado=fechado, olhar=olhar, bravo=bravo)
    if chama > 0:
        fogo(t, qm.p(-15.0, 1.0), chama, k)
    return q


def fumacinha(t: Tela, x: float, y: float, fase: float):
    for i in range(3):
        f = (fase + i / 3) % 1
        r = 1.2 + f * 2.4
        if f < 0.9:
            t.pinta(circulo((x - f * 5 + math.sin(f * 7 + i) * 1.5, y - f * 13), r), "fumaca", 5.0 + i * 0.01, R=1.5, pid=f"fum{i}", tom=0.2 - f * 0.2, sem_contorno=True)


# ═══════════════════════════════ as linhas ═══════════════════════════════
def l_parado(t: Tela, k: int):
    f = k / DQ
    resp = math.sin(f * TAU)
    q = dragao(t, k, resp=resp, cab_inc=-3 + resp * 2.0, cab_dy=-resp * 0.8, asa_ang=24 - resp * 3, asa_abre=0.5 + resp * 0.015, cauda_f=f, fechado=(0.6 <= f < 0.7), olhar=(-0.3 if 0.25 <= f < 0.5 else 0.0))
    if f >= 0.75:
        fumacinha(t, q.p(-18.0, 1.5)[0], q.p(-18.0, 1.5)[1], (f - 0.75) * 3.3)


def l_voando(t: Tela, k: int):
    f = k / DQ
    bat = math.sin(f * TAU)
    dragao(t, k, sobe=14 + bat * 3.0, cab_inc=-8, cab_dy=2.0, cab_dx=-2.0, asa_ang=-6 + bat * 44, asa_abre=1.08, bate=bat, cauda_f=f + 0.25, voo=1.0, bravo=0.4)


def l_pousando(t: Tela, k: int):
    """Toca uma vez: desce batendo as asas, toca o chão, recolhe as asas e senta."""
    u = k / (DQ - 1)
    desce = max(0.0, 1 - u * 1.7)
    bat = math.sin(u * TAU * 1.6)
    abre = 1.08 - 0.58 * max(0.0, (u - 0.55) / 0.45)
    dragao(t, k, sobe=18 * desce ** 1.4, cab_inc=-8 * desce - 3 * (1 - desce), asa_ang=(-14 + bat * 36) * max(desce, 0.25) + 24 * (1 - max(desce, 0.25)), asa_abre=abre,
           bate=bat * desce, cauda_f=u * 0.8, voo=desce, resp=(-1.6 if 0.68 <= u <= 0.88 else 0.0))


def l_fogo(t: Tela, k: int):
    """Inspira (cabeça para trás), abre a boca e solta o jato; fecha soltando fumaça."""
    u = k / (DQ - 1)
    chave = lambda vals: float(np.interp(u, np.linspace(0, 1, len(vals)), vals))
    # inspira (0 a 0,2), o jato cresce, segura firme no meio e apaga aos poucos
    forca = chave((0.0, 0.0, 0.0, 0.35, 0.75, 0.95, 1.0, 1.0, 0.97, 0.8, 0.45, 0.0))
    recuo = chave((0.0, 0.6, 1.0, 0.3, -0.4, -0.7, -0.8, -0.8, -0.75, -0.55, -0.25, 0.0))
    boca = chave((0.0, 0.15, 0.3, 0.75, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.6, 0.15))
    inspira = 0.08 < u < 0.22
    q = dragao(t, k, resp=(1.6 if inspira else -0.6 * forca), cab_inc=recuo * 13 + 4 * forca, cab_dx=recuo * 4.0, cab_dy=-recuo * 2.5 + forca * 2.5, boca=boca,
               asa_ang=24 - 18 * max(forca, recuo * 0.6), asa_abre=0.5 + 0.34 * max(forca, recuo * 0.5), cauda_f=k / DQ, chama=forca, bravo=1.0 * (forca > 0 or inspira))
    if k == DQ - 1:
        fumacinha(t, q.p(-18.0, 2.0)[0], q.p(-18.0, 2.0)[1], 0.2)


def l_rugindo(t: Tela, k: int):
    """Comemora: ergue a cabeça, abre as asas e solta um rugido com fagulhas."""
    f = k / DQ
    sobe = math.sin(f * math.pi) ** 0.7
    dragao(t, k, resp=sobe, cab_inc=18 * sobe, cab_dx=3.0 * sobe, cab_dy=-7.0 * sobe, boca=0.9 * sobe, asa_ang=24 - 50 * sobe, asa_abre=0.5 + 0.6 * sobe, bate=-sobe,
           cauda_f=f * 2, bravo=0.3)
    g = np.random.default_rng(700 + k)
    for _ in range(int(9 * sobe)):
        t.ponto_fx(OX + 14 + g.random() * 22, 26 + g.random() * 16 - sobe * 6, ("#fff4c0", "#ffc040", "#ff8a20")[int(g.random() * 3)], 0.95)


def l_dormindo(t: Tela, k: int):
    """Enrolado em cima do ouro, a cabeça apoiada nas patas, a cauda em volta e a fumacinha do nariz."""
    f = k / DQ
    resp = math.sin(f * TAU)
    t.origem = (OX, 0.0)
    sombra(t, OX + 66, 38)
    P = lambda x, y: (OX + x, y)
    asa(t, P(74, 80 - resp * 0.5), 46, 0.5, 0.6, tras=True)
    corpo = elipse(P(72, 88 - resp * 0.5), 25.0, 13.5 + resp * 0.7).suave(elipse(P(52, 93), 12.0, 9.0), 4.0)
    t.pinta(corpo, "dragao", 2.0, R=10.0, pid="corpo", tom=escamas(0.0), semente=111)
    t.pinta(elipse(P(64, 99), 20.0, 5.0), "barriga", 0, sobre="corpo", R=3.0, tom=placas)
    dorso = [P(50, 85.5), P(56, 79.5 - resp * 0.4), P(64, 76 - resp * 0.6), P(73, 75 - resp * 0.7), P(82, 76.5 - resp * 0.6), P(90, 80), P(95, 86)]
    espinhos(t, dorso, 2.5, alt=5.0, cada=1, pid="esp_dorso")
    # cauda dando a volta pela frente
    cauda(t, [P(95, 93), P(98, 100), P(88, 103), P(72, 103.5), P(58, 103), P(49, 102.5)], 3.2)
    asa(t, P(77, 82 - resp * 0.5), 52, 0.5, 3.0)
    # patas da frente e a cabeça deitada em cima delas
    t.pinta(elipse(P(40, 101), 8.5, 2.6), "dragao", 3.6, R=2.0, pid="pata", tom=escamas(2.0, 0.05), semente=112)
    for i in range(3):
        t.pinta(poligono([P(33 + i * 2.6, 100.0), P(30.6 + i * 2.6, 102.8), P(34.4 + i * 2.6, 102.0)]), "chifre", 3.7, R=0.8, pid="pata_garra", sem_contorno=True)
    q, _ = cabeca(t, P(40, 91 - resp * 0.4), 9, fechado=True, z=4.4)
    fumacinha(t, q.p(-18.0, 1.0)[0], q.p(-18.0, 1.0)[1], f)
    fase = f
    gm.zz(t, OX + 24 + fase * 5, 72 - fase * 10, 5, 0.9 * (1 - fase))


LINHAS = [("parado", l_parado), ("voando", l_voando), ("pousando", l_pousando), ("fogo", l_fogo), ("dormindo", l_dormindo), ("rugindo", l_rugindo)]


def folha() -> Image.Image:
    img = Image.new("RGBA", (DW * DQ, DH * len(LINHAS)), (0, 0, 0, 0))
    for li, (_, desenhar) in enumerate(LINHAS):
        for k in range(DQ):
            t = Tela(DW, DH)
            desenhar(t, k)
            img.paste(Image.fromarray(t.render(), "RGBA"), (k * DW, li * DH))
    return img


def main() -> None:
    img = folha()
    destino = gm.PASTA / "dragao.png"
    gm.salvar(img, destino)
    print("dragao.png", img.size, destino.stat().st_size // 1024, "KB")
    if "--previa" in sys.argv:
        alvo = Path(sys.argv[sys.argv.index("--previa") + 1])
        fundo = Image.new("RGBA", (img.width * 2, img.height * 2), (38, 30, 34, 255))
        fundo.alpha_composite(img.resize((img.width * 2, img.height * 2), Image.NEAREST))
        fundo.convert("RGB").save(alvo)


if __name__ == "__main__":
    main()
