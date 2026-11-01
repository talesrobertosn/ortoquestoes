"""A Torre do Tempo: o cenário "HD-2D" do topo do cronograma (31/10/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. A cena é pintada em
pixel art (480 x 200), camada por camada, e montada em 3x com a luz calculada por pixel, com a mesma técnica e os
mesmos pincéis de scripts/gerar_cena_vila.py (importados de lá, sem mudar as artes que outras páginas usam).

O lugar: a praça de uma vila na estrada que leva ao castelo da prova. A torre é cívica (sino, relógio e praça), sem
nenhum símbolo religioso. O mostrador não tem letras nem algarismos: aro de ferro, filete de latão, face de porcelana
e doze marcas geométricas. Nenhum texto ou número é pintado: tudo o que se lê fica no HTML.

Composição (pixels da arte), pensada para a interface:
- x 0-205: céu, colinas, bosque e a muralha distante em baixo contraste (onde ficam o título e a frase);
- a estrada parte de x ~ 220 no primeiro plano, cruza x ~ 290 e chega à praça; um ramo segue até o castelo;
- a torre entre x ~ 335 e 445, com o telhado inteiro, o relógio grande e a porta; casas de dois andares em volta;
- o castelo distante, menor e mais frio, entre a estrada e a torre.
A geometria é a mesma nas três horas do dia; mudam o céu, a luz, as sombras e as janelas.

Saída em public/pixel/cronograma/:
- torre-tempo-<manha|tarde|noite>.webp (1440 x 600) e -960.webp (960 x 400): o fundo, sem o sino;
- torre-tempo-sino-<hora>.png: o sino recortado já com a luz da hora, para balançar por cima (raramente).
Uso: <python com numpy e pillow> scripts/gerar_cena_cronograma.py [manha|tarde|noite]
     ... scripts/gerar_cena_cronograma.py chao   (torre-tempo-chao.webp: o chão de pedra da praça; testado e retirado do site em 01/11/2026)
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar_cena_vila as v  # noqa: E402

# A vila pinta em 480 x 160; esta cena é mais alta (o topo do cronograma tem o céu e a praça inteiros).
W, H, ESC = 480, 200, 3
v.H = H
v._YS, v._XS = np.mgrid[0:H, 0:W].astype(np.float32)
v._GYS, v._GXS = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)
v.ruido.__defaults__ = (None, W, H)  # o tamanho padrão do ruído foi fixado na importação
_YS, _XS, _GYS, _GXS = v._YS, v._XS, v._GYS, v._GXS
Camada, Montagem, hexa, mistura, hash01, ruido = v.Camada, v.Montagem, v.hexa, v.mistura, v.hash01, v.ruido
elipse_m, poligono_m, desfocar, ampliar, curva = v.elipse_m, v.poligono_m, v.desfocar, v.ampliar, v.curva
brilho, raios_radiais, sombra_projetada, remapear, apagar = v.brilho, v.raios_radiais, v.sombra_projetada, v.remapear, v.apagar
ceu_hora, mapa_sol, nevoa, suave_np, lampiao = v.ceu_hora, v.mapa_sol, v.nevoa, v.suave_np, v.lampiao

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "cronograma"
PERIODOS = ("manha", "tarde", "noite")
P = "tarde"

# A torre (constantes usadas também na montagem, nas sombras e nos pontos de luz da página).
CX = 390
XA, XB, LADO = CX - 30, CX + 30, 12
TOPO_CORPO, BASE = 36, 170
RELOGIO = (CX, 89, 22)  # centro e raio do mostrador
SINO = (CX, 44)  # topo do sino
FEIXE_SOL = {"manha": (70, 22), "tarde": (232, 116), "noite": (168, 24)}


# ─────────────────────────────── Pincéis desta cena ───────────────────────────────
def cantaria(c: Camada, x0: int, x1: int, y0: int, y1: int, seed: int, tons, alt: int = 5, larg: int = 10,
             rejunte=("#4a4440", "#2c2a30"), musgo_de: float = 0.6, sombra_dir: bool = True) -> None:
    """Blocos de pedra individualizados: cada um com o seu tom, aresta clara em cima e à esquerda, canto lascado,
    rejunte escuro e musgo no pé da parede (mais no lado da sombra)."""
    n = ruido(seed + 5, 3)
    mg = ruido(seed + 6, 4)
    for y in range(max(0, y0), min(H, y1)):
        fi = (y - y0) // alt
        for x in range(max(0, x0), min(W, x1)):
            off = int(hash01(fi, seed, 3) * larg)
            col = (x - x0 + off) // larg
            larg_b = larg + int(hash01(fi, col, seed + 1) * 3) - 1
            emx, emy = (x - x0 + off) % larg, (y - y0) % alt
            t = (x - x0) / max(1, x1 - x0)
            sombra = t if sombra_dir else 1 - t
            if emy == alt - 1 or emx == min(larg, larg_b) - 1:
                cor = mistura(rejunte[0], rejunte[1], sombra)
            else:
                k = hash01(fi, col, seed)
                base = 0.12 + sombra * 0.55 + (k - 0.5) * 0.4 + (n[y, x] - 0.5) * 0.22
                if emy == 0:
                    base -= 0.22
                if emx == 0:
                    base -= 0.1
                if emy == alt - 2:
                    base += 0.12
                lasca = (emx in (1, larg - 2)) and (emy in (0, alt - 2)) and hash01(fi, col, seed + 9) > 0.7
                if lasca:
                    base += 0.3
                i = min(len(tons) - 1, max(0, int(base * len(tons))))
                cor = hexa(tons[i])
                frac = (y - y0) / max(1, y1 - y0)
                if mg[y, x] > 0.64 - sombra * 0.08 and frac > musgo_de:
                    cor = cor * 0.55 + hexa("#4e6e3c") * 0.45
            c.p(x, y, cor)


def cornija(c: Camada, x0: int, x1: int, y: int, lado: int, claro="#d6c8b6", meio="#a8988a", escuro="#5a5058") -> None:
    """Faixa de pedra saliente, com a luz em cima, os dentes por baixo e a sombra na parede."""
    c.ret(x0 - 2, y, x1 - x0 + 4, 3, meio)
    c.ret(x0 - 2, y, x1 - x0 + 4, 1, claro)
    c.ret(x1 + 2, y, lado - 2, 3, escuro)
    c.ret(x1 + 2, y, lado - 2, 1, "#7a6e70")
    for k in range(x0 - 1, x1 + 2, 3):
        c.p(k, y + 3, "#6e6264")
    c.ret(x0 - 2, y + 3, x1 - x0 + lado + 2, 1, "#2a2428", 0.55)


def janela_funda(c: Camada, e: Camada, x: int, y: int, w: int, h: int, luzes: list, forca: float = 0.4, cortina: bool = False) -> None:
    """Janela de arco civil com o vão fundo: soleira, ombreira em sombra do lado da luz, vidro aceso em quadrículas."""
    arco = poligono_m([(x, y + h), (x, y + w // 2), (x + w, y + w // 2), (x + w, y + h)])
    arco = np.maximum(arco, elipse_m(x + w / 2 - 0.5, y + w / 2, w / 2, w / 2) * (_YS <= y + w / 2))
    contorno = (desfocar(arco[:, :, None], 0.8)[:, :, 0] > 0.04) & (arco == 0) & (_YS < y + h + 1) & (_YS > y - 3)
    c.mascara(contorno.astype(np.float32), "#cbbba8")
    c.mascara(arco, "#2a2026")
    vidro = arco * (_XS >= x + 2) * (_YS >= y + 1)
    e.mascara(vidro, "#ffbe66")
    e.mascara(vidro * (_XS < x + 2 + w * 0.35) * (_YS < y + h * 0.5), "#ffe8b0")
    for k in range(x + 2 + (w - 2) // 2, x + w, 99):
        pass
    for cam in (c, e):
        cam.ret(x + 1 + w // 2, y + 1, 1, h - 1, "#3a2418")
        cam.ret(x + 2, y + h // 2 + 1, w - 2, 1, "#3a2418")
    if cortina:
        e.mascara(vidro * (_XS > x + w - 3), "#c86a40")
    c.ret(x - 1, y + h, w + 2, 2, "#b8a898")
    c.ret(x - 1, y + h, w + 2, 1, "#e8dccc")
    c.ret(x - 1, y + h + 2, w + 2, 1, "#3a3034", 0.6)
    luzes.append((x + w / 2, y + h * 0.6, 14 + w, 1.2, "#ffaa50", forca))


def sino(c: Camada, cx: int, topo: int) -> None:
    """Sino de bronze com coroa, ombro, cintura, boca e badalo; a luz entra pela esquerda."""
    c.ret(cx - 2, topo - 3, 5, 3, "#4a2c14")
    c.ret(cx - 1, topo - 4, 3, 1, "#8a5a28")
    perfil = [2, 4, 5, 6, 6, 6, 6, 6, 6, 7, 7, 8, 9, 10, 12, 12]  # coroa, ombro redondo, cintura reta e a boca aberta
    for j, m in enumerate(perfil):
        for dx in range(-m, m + 1):
            t = (dx + m) / (2 * m)
            cor = "#e8c47a" if t < 0.12 else "#c8903e" if t < 0.32 else "#9a6428" if t < 0.6 else "#6a3e18" if t < 0.84 else "#3e2410"
            if j in (2, 11):  # frisos
                cor = "#ffd890" if t < 0.3 else "#9a6024" if t < 0.75 else "#3e2410"
            if j == len(perfil) - 1:
                cor = "#5a3414" if t > 0.25 else "#d8a050"
            if j == len(perfil) - 2 and 0.2 < t < 0.8:
                cor = "#6a3e18"
            c.p(cx + dx, topo + j, cor)
    for (dx, dy) in ((-4, 3), (-5, 5), (-5, 6), (-5, 9)):
        c.p(cx + dx, topo + dy, "#ffe8b0")
    # pátina de verdete nas reentrâncias da sombra
    for j in (3, 4, 12):
        for dx in range(perfil[j] - 3, perfil[j] + 1):
            if hash01(dx, j, 5) > 0.5:
                c.p(cx + dx, topo + j, "#5e8a72")
    # o badalo aparece na boca do sino, preso por dentro
    c.ret(cx - 1, topo + len(perfil) - 1, 3, 1, "#1e120a")
    c.disco(cx + 0.5, topo + len(perfil) + 1.0, 1.5, ("#b07a34", "#6a4018", "#2e1a0c"))


# ─────────────────────────────── A torre ───────────────────────────────
def torre(c: Camada, e: Camada, rel: Camada, campanario: Camada, luzes: list) -> None:
    pedra = ("#3e3a3e", "#5a524e", "#7a6e64", "#9a8c7c", "#b8a894", "#d2c4ac")
    pedra_lado = ("#24222a", "#302c34", "#3c3640", "#4a4248", "#585058")
    # Corpo em cantaria, a face lateral na sombra (a luz das três horas vem da esquerda).
    cantaria(c, XA, XB, TOPO_CORPO, BASE, 3, pedra, alt=5, larg=11)
    cantaria(c, XB, XB + LADO, TOPO_CORPO, BASE, 4, pedra_lado, alt=5, larg=7, rejunte=("#1e1c22", "#16141a"), musgo_de=0.35)
    # Quinas em silharia (pedras alternadas mais claras, maiores), a quina da luz com aresta brilhante.
    for y in range(TOPO_CORPO, BASE, 10):
        for (qx, w) in ((XA, 6), (XB - 6, 6)):
            ww = w if (y // 10) % 2 == 0 else w - 3
            xx = qx if qx == XA else XB - ww
            c.ret(xx, y, ww, 9, "#c4b6a2" if qx == XA else "#8e8274")
            c.ret(xx, y, ww, 1, "#e6dac6" if qx == XA else "#a89a88")
            c.ret(xx, y + 9, ww, 1, "#3a3236")
            if qx == XA:
                c.ret(xx + ww - 1, y + 1, 1, 8, "#8a7c6e")
    c.ret(XA, TOPO_CORPO, 1, BASE - TOPO_CORPO, "#f2e8d4")
    c.ret(XB, TOPO_CORPO, 1, BASE - TOPO_CORPO, "#1a181e")
    c.ret(XB + 1, TOPO_CORPO, 1, BASE - TOPO_CORPO, "#4a444c")
    # Embasamento mais largo, em blocos grandes.
    cantaria(c, XA - 4, XB + 4, 154, BASE, 8, pedra, alt=8, larg=14, musgo_de=0.2)
    cantaria(c, XB + 4, XB + LADO + 2, 154, BASE, 9, pedra_lado, alt=8, larg=8, musgo_de=0.0)
    c.ret(XA - 5, 153, XB - XA + 10, 2, "#a8988a")
    c.ret(XA - 5, 153, XB - XA + 10, 1, "#e0d2be")
    c.ret(XB + 5, 153, LADO - 3, 2, "#4a4248")
    for y in (36, 64, 114, 140):
        cornija(c, XA, XB, y, LADO)

    # ── Campanário: arco aberto com o interior de madeira, a viga e o sino (o sino fica numa camada própria).
    cb0, cb1 = 40, 63
    abre = poligono_m([(CX - 18, cb1), (CX - 18, cb0 + 10), (CX + 18, cb0 + 10), (CX + 18, cb1)])
    abre = np.maximum(abre, elipse_m(CX - 0.5, cb0 + 10, 18, 11) * (_YS <= cb0 + 10))
    fundo = np.zeros((H, W, 3), dtype=np.float32) + hexa("#160e10")
    fundo += (1 - np.clip(np.abs(_XS - CX) / 18, 0, 1))[:, :, None] * hexa("#2a180e")
    tabuas = (np.mod(_XS - CX, 5) == 0) * 0.35
    fundo = fundo * (1 - tabuas[:, :, None])
    c.mascara(abre, fundo)
    borda = (desfocar(abre[:, :, None], 0.9)[:, :, 0] > 0.04) & (abre == 0) & (_YS > cb0 - 3) & (_YS < cb1)
    c.mascara(borda.astype(np.float32), "#e0d2bc")
    # aduelas do arco
    for k in range(9):
        a = math.pi + k / 8 * math.pi
        for r in (19, 20, 21):
            c.p(CX - 0.5 + math.cos(a) * r, cb0 + 10 + math.sin(a) * (r * 11 / 18), "#5a4e48" if r == 21 else "#bfae98")
    c.ret(CX - 17, cb0 + 4, 34, 3, "#4a2c18")
    c.ret(CX - 17, cb0 + 4, 34, 1, "#8a5a32")
    for k in range(CX - 15, CX + 16, 6):
        c.p(k, cb0 + 5, "#2a1a10")
    # guarda-corpo de pedra na base do vão
    c.ret(CX - 18, cb1 - 4, 36, 4, "#9a8a7a")
    c.ret(CX - 18, cb1 - 4, 36, 1, "#ddcfba")
    for k in range(CX - 16, CX + 17, 4):
        c.ret(k, cb1 - 3, 2, 3, "#4a3e3c")
    # pilastras do campanário
    c.ret(XA, cb0 - 2, 6, cb1 - cb0 + 2, "#c4b6a2")
    c.ret(XA, cb0 - 2, 1, cb1 - cb0 + 2, "#f0e4d0")
    c.ret(XB - 6, cb0 - 2, 6, cb1 - cb0 + 2, "#7a6e64")
    sino(campanario, *SINO)
    luzes.append((CX, cb0 + 14, 22, 0.9, "#ffb860", 0.4))
    e.ret(CX - 10, cb1 - 5, 20, 1, "#ffcf80", 0.25)

    # ── Telhado de quatro águas em telhas envelhecidas, beiral com cachorros, musgo na água da sombra.
    eave, apice = 34, 3
    musgo = ruido(31, 4)
    for y in range(apice, eave + 1):
        t = (y - apice) / (eave - apice)
        meia = 2 + t * 38
        fila = (y - apice) // 3
        for x in range(int(CX - meia), int(CX + meia) + 1):
            u = (x - CX) / max(meia, 1)
            off = (fila % 2) * 2
            em, emy = (x + off) % 4, (y - apice) % 3
            if u < -0.15:
                tons = ("#e88a64", "#c25e3e", "#8a3c2a")
            elif u < 0.4:
                tons = ("#b65a3c", "#94462e", "#622a22")
            else:
                tons = ("#743a2e", "#582c26", "#3a1c1c")
            cor = hexa(tons[2] if emy == 2 else tons[0] if (emy == 0 and em in (1, 2)) else tons[1])
            if em == 3 and emy < 2:
                cor = hexa(tons[2])
            k = hash01(x // 4, fila, 17)
            if k > 0.86:  # telha trocada (mais nova) ou desbotada
                cor = cor * 1.12 if k > 0.93 else cor * 0.86
            if u > 0.15 and musgo[y, x] > 0.6 - t * 0.12:
                cor = cor * 0.5 + hexa("#4c6a38") * 0.5
            if abs(x - (CX - meia)) < 1.2:
                cor = hexa("#ffd0aa")
            c.p(x, y, cor)
        c.p(CX, y, "#ffc4a0" if y % 2 else "#c8705a")  # espigão
        c.p(CX + 1, y, "#4a2420")
    # pingadeira e beiral de madeira com os cachorros
    c.ret(CX - 42, eave, 84, 2, "#5a3420")
    c.ret(CX - 42, eave, 84, 1, "#a06a3a")
    c.ret(CX - 42, eave + 2, 84, 1, "#1e1416", 0.7)
    for k in range(CX - 40, CX + 41, 5):
        c.ret(k, eave + 2, 2, 2, "#3a2014")
        c.p(k, eave + 2, "#7a4a28")
    # trapeira (janelinha no telhado), com vidro escuro
    c.poligono([(CX - 6, 26), (CX, 19), (CX + 6, 26)], "#9a4a34")
    c.ret(CX - 5, 26, 10, 6, "#b0a08e")
    c.ret(CX - 3, 27, 6, 5, "#24181c")
    e.ret(CX - 2, 28, 4, 3, "#ffb860", 0.65)
    c.linha(CX - 6, 26, CX, 19, "#ffd0aa")
    # haste de ferro, esfera de latão e um galhardete (sem cruz e sem letras)
    c.ret(CX, -1, 1, apice + 1, "#2a2428")
    c.disco(CX + 0.5, apice - 1, 1.7, ("#ffe8a0", "#c89040", "#6a4418"))
    c.poligono([(CX + 1, 0), (CX + 8, 2), (CX + 1, 4)], "#b03a32")
    c.linha(CX + 1, 0, CX + 7, 2, "#e86a4a")

    # ── O relógio: moldura quadrada de pedra com bossas de latão, aro de ferro rebitado, filete de latão, face de
    # porcelana aquecida por dentro, doze marcas geométricas e ponteiros originais (de ferro, com contrapeso em anel).
    mx, my, r = RELOGIO
    # anel de aduelas de pedra em volta do mostrador, cada aduela com o seu tom e a junta escura
    for y in range(my - r - 5, my + r + 6):
        for x in range(mx - r - 5, mx + r + 6):
            d = math.hypot(x - mx, y - my)
            if not (r + 0.4 < d <= r + 4.6):
                continue
            ang = math.atan2(y - my, x - mx)
            seg = int((ang + math.pi) / math.tau * 20)
            junta = abs(((ang + math.pi) / math.tau * 20) - round((ang + math.pi) / math.tau * 20)) < 0.07
            luz = -math.cos(ang + math.pi * 0.72)
            k = hash01(seg, 3, 61)
            cor = mistura("#d8cab4", "#6e6460", 0.5 - luz * 0.4 + (k - 0.5) * 0.3)
            if d > r + 3.6:
                cor = cor * 0.7
            if junta:
                cor = hexa("#3a3236")
            c.p(x, y, cor)
    for (qx, qy) in ((mx - r - 3, my - r - 3), (mx + r + 3, my - r - 3), (mx - r - 3, my + r + 3), (mx + r + 3, my + r + 3)):
        c.disco(qx + 0.5, qy + 0.5, 1.8, ("#ffe8a0", "#c8902e", "#5a3a14"))
    for y in range(my - r - 1, my + r + 2):
        for x in range(mx - r - 1, mx + r + 2):
            d = math.hypot(x - mx, y - my)
            ang = math.atan2(y - my, x - mx)
            luz = -math.cos(ang + math.pi * 0.72)  # luz de cima à esquerda
            if r - 2.2 <= d <= r + 0.4:  # aro de ferro escuro
                cor = "#5a565e" if luz > 0.6 else "#36343c" if luz > -0.2 else "#1c1a20"
                if d > r - 0.4:
                    cor = "#141218"
                c.p(x, y, cor)
            elif r - 3.6 <= d < r - 2.2:  # filete de latão
                c.p(x, y, "#fff0b0" if luz > 0.65 else "#e0b04c" if luz > 0 else "#9a6a24" if luz > -0.6 else "#5a3a14")
            elif d < r - 3.6:  # porcelana: clara no centro, morna na borda, sombra interna do aro em cima à esquerda
                k = d / (r - 3.6)
                cor = mistura("#fff6e2", "#ecd2a4", k ** 1.8)
                sombra_int = max(0.0, (k - 0.78) / 0.22) * max(0.0, luz) * 0.3
                cor = cor * (1 - sombra_int) + hexa("#8a6a4a") * sombra_int
                if hash01(x, y, 23) > 0.93:
                    cor = cor * 0.97
                rel.p(x, y, cor)
    for i in range(16):  # rebites no aro
        a = i / 16 * math.tau
        c.p(mx + math.cos(a) * (r - 1.1), my + math.sin(a) * (r - 1.1), "#9a96a0")
    for i in range(60):  # trilho dos minutos
        a = i / 60 * math.tau - math.pi / 2
        rel.p(mx + math.cos(a) * (r - 5.2), my + math.sin(a) * (r - 5.2), "#b89870" if i % 5 else "#6a4a34")
    for i in range(12):  # as doze marcas: losango no alto, barras nos quartos, gotas nas outras horas
        a = i / 12 * math.tau - math.pi / 2
        ux, uy = math.cos(a), math.sin(a)
        if i == 0:
            for (dx, dy) in ((0, -1), (-1, 0), (0, 0), (1, 0), (0, 1), (0, 2), (-1, 1), (1, 1)):
                rel.p(mx + ux * (r - 9) + dx, my + uy * (r - 9) + dy, "#2a1a1a")
            rel.p(mx + ux * (r - 9), my + uy * (r - 9) - 1, "#c8902e")
        elif i % 3 == 0:
            for t in np.linspace(r - 11.5, r - 7, 6):
                rel.p(mx + ux * t, my + uy * t, "#2a1a1a")
                rel.p(mx + ux * t - uy * 0.9, my + uy * t + ux * 0.9, "#2a1a1a")
        else:
            for t in np.linspace(r - 9.5, r - 7.2, 3):
                rel.p(mx + ux * t, my + uy * t, "#3a2622")
            rel.p(mx + ux * (r - 10.2), my + uy * (r - 10.2), "#8a6a50")
    # roseta gravada no centro, bem leve
    for i in range(8):
        a = i / 8 * math.tau
        rel.p(mx + math.cos(a) * 4, my + math.sin(a) * 4, "#e0c49a")
    # Ponteiros: o das horas largo, em folha; o dos minutos fino, com contrapeso em anel. Hora de cenário (4h38).
    for (ang_g, comp, folha, cauda) in ((140, 9.5, 2.2, 3.0), (229, 15.0, 1.3, 5.0)):
        a = math.radians(ang_g) - math.pi / 2
        ux, uy = math.cos(a), math.sin(a)
        px, py = -uy, ux
        for t in np.linspace(-cauda, comp, int((comp + cauda) * 4)):
            larg = folha * math.sin(min(1, max(0, t / comp)) * math.pi) ** 0.8 if t > 0 else 0.5
            for k in np.linspace(-larg, larg, max(2, int(larg * 4))):
                rel.p(mx + ux * t + px * k, my + uy * t + py * k, "#1a1218")
        rel.p(mx + ux * comp * 0.45 - px * 0.6, my + uy * comp * 0.45 - py * 0.6, "#6a6670")  # brilho no ferro
        cx2, cy2 = mx - ux * cauda, my - uy * cauda
        if cauda > 4:
            for k in range(12):
                b = k / 12 * math.tau
                rel.p(cx2 + math.cos(b) * 1.6, cy2 + math.sin(b) * 1.6, "#1a1218")
    rel.disco(mx + 0.5, my + 0.5, 1.8, ("#ffe8a0", "#c8902e", "#5a3a14"))
    luzes.append((mx, my, 34, 1.0, "#ffd890", 0.22))

    # ── Janelas fundas do meio da torre e a porta em arco civil com ferragens e arandelas.
    janela_funda(c, e, CX - 15, 118, 8, 16, luzes, 0.35)
    janela_funda(c, e, CX + 7, 118, 8, 16, luzes, 0.3, cortina=True)
    # vaso de flores no peitoril da esquerda
    for k in range(10):
        c.p(CX - 16 + k, 133 - (k % 2), ["#e86a6a", "#ffd86a", "#f4a7c4", "#ffffff"][k % 4])
        c.p(CX - 16 + k, 134 - (k % 2), "#4a7a3a")
    px0, py0, pw = CX - 10, 147, 20
    porta = poligono_m([(px0, BASE), (px0, py0 + 8), (px0 + pw, py0 + 8), (px0 + pw, BASE)])
    porta = np.maximum(porta, elipse_m(CX - 0.5, py0 + 8, pw / 2, 8) * (_YS <= py0 + 8))
    madeira = np.zeros((H, W, 3), dtype=np.float32) + hexa("#6a3e22")
    veio = ruido(41, 1, 6)
    madeira = madeira * (0.8 + 0.35 * veio)[:, :, None]
    madeira = madeira * (1 - (np.mod(_XS - px0, 5) == 0) * 0.45)[:, :, None]
    madeira = madeira * (1 - np.clip((_XS - (px0 + pw * 0.6)) / pw, 0, 1) * 0.4)[:, :, None]
    c.mascara(porta, madeira)
    vao = (desfocar(porta[:, :, None], 0.9)[:, :, 0] > 0.04) & (porta == 0) & (_YS < BASE) & (_YS > py0 - 3)
    c.mascara(vao.astype(np.float32), "#d2c2ac")
    for k in range(9):  # aduelas
        a = math.pi + k / 8 * math.pi
        c.p(CX - 0.5 + math.cos(a) * (pw / 2 + 2), py0 + 8 + math.sin(a) * 10, "#6a5e56")
    for yb in (py0 + 10, py0 + 18):  # ferragens com cravos
        c.ret(px0 + 1, yb, pw - 1, 2, "#2a2a32")
        c.ret(px0 + 1, yb, pw - 1, 1, "#6a6a78")
        for k in range(px0 + 2, px0 + pw, 3):
            c.p(k, yb + 1, "#a8a8b8")
    c.disco(CX + 5.5, py0 + 15.5, 1.4, ("#ffe8a0", "#a8742a", "#4a2a10"))  # argola
    c.ret(CX - 1, py0 + 2, 2, BASE - py0 - 2, "#2a1a10", 0.6)
    for sx in (px0 - 6, px0 + pw + 3):  # arandelas
        lado = -1 if sx < CX else 1
        c.ret(sx + (4 if lado < 0 else -2), py0 + 3, 2, 1, "#1e1a20")  # braço de ferro preso à parede
        c.ret(sx, py0 - 3, 4, 1, "#1e1a20")  # chapéu
        c.ret(sx + 1, py0 - 4, 2, 1, "#1e1a20")
        c.ret(sx, py0 - 2, 1, 6, "#2a2430")
        c.ret(sx + 3, py0 - 2, 1, 6, "#2a2430")
        c.ret(sx, py0 + 4, 4, 1, "#1e1a20")
        c.p(sx + 1, py0 + 5, "#1e1a20")
        e.ret(sx + 1, py0 - 2, 2, 6, "#ffd890")
        e.p(sx + 1, py0 - 1, "#ffffff")
        luzes.append((sx + 2, py0 + 2, 18, 1.0, "#ffb060", 0.55))
    # degraus gastos (cantos arredondados, desgaste no meio)
    for (i, (dy, mg)) in enumerate(((0, 4), (2, 7), (4, 10))):
        y = BASE + dy
        c.ret(px0 - mg, y, pw + 2 * mg, 2, "#a89a90" if i else "#b8aaa0")
        c.ret(px0 - mg + 1, y, pw + 2 * mg - 2, 1, "#e2d6c6")
        c.ret(CX - 5, y, 10, 1, "#c8baa8")
        c.p(px0 - mg, y, "#6a5e5a")
        c.p(px0 + pw + mg - 1, y, "#6a5e5a")
    # hera subindo pela quina iluminada
    g = np.random.default_rng(12)
    for k in range(120):
        y = BASE - g.random() ** 1.6 * 70
        x = XA - 1 + g.random() * 7 * (1 - (BASE - y) / 75)
        c.p(x, y, ["#5a8a4a", "#3e6a3a", "#7aa85a", "#2e5230"][k % 4])


def casa(c: Camada, e: Camada, x0: int, x1: int, base: int, andar: int, cumeeira: int, luzes: list, seed: int,
         reboco=("#cfc0a4", "#8e806e"), telha=("#c26444", "#93452e", "#5e2a22"), janelas=(0.25, 0.7), portinha: float | None = None,
         chamine: float | None = 0.72, pedra_baixo: bool = True) -> None:
    """Casa de dois andares: térreo de pedra, andar de cima em enxaimel com reboco, empena de frente, telhas
    assimétricas (uma água maior), janelas acesas com floreira e venezianas, chaminé."""
    cx = (x0 + x1) / 2
    meio_y = (andar + base) // 2
    for y in range(andar, base):
        for x in range(x0, x1):
            t = (x - x0) / (x1 - x0)
            k = hash01(x, y, seed) * 0.1
            c.p(x, y, mistura(reboco[0], reboco[1], min(1, t * 0.8 + k)))
    if pedra_baixo:
        cantaria(c, x0, x1, meio_y + 2, base, seed + 3, ("#4a4448", "#6a6058", "#8a7c6c", "#a8988a"), alt=4, larg=8, musgo_de=0.3)
    # madeiramento: frechal, prumos e mãos-francesas
    c.ret(x0, andar, x1 - x0, 2, "#4a2e1e")
    c.ret(x0, meio_y, x1 - x0, 2, "#4a2e1e")
    c.ret(x0, meio_y + 2, x1 - x0, 1, "#2a1a14", 0.6)
    for x in range(x0, x1, 10):
        c.ret(x, andar, 2, meio_y - andar, "#4a2e1e")
    for x in range(x0, x1 - 10, 20):
        c.linha(x + 1, meio_y - 1, x + 10, andar + 2, "#4a2e1e")
    c.ret(x1 - 2, andar, 2, base - andar, "#2a1e1e", 0.5)
    # empena
    for y in range(cumeeira, andar):
        t = (y - cumeeira) / max(1, andar - cumeeira)
        meia = t * (x1 - x0) / 2
        for x in range(int(cx - meia), int(cx + meia) + 1):
            c.p(x, y, mistura(reboco[0], reboco[1], (x - x0) / (x1 - x0) * 0.9) * 0.94)
    c.ret(cx - 1, cumeeira + 4, 2, andar - cumeeira - 4, "#4a2e1e")
    # telhado em telhas com beiral, a água da esquerda mais longa (assimetria)
    for y in range(cumeeira - 4, andar + 4):
        t = (y - cumeeira + 4) / (andar - cumeeira + 8)
        for lado in (-1, 1):
            meia = t * (x1 - x0) / 2 + (6 if lado < 0 else 4)
            for k in range(6):
                x = cx + lado * (meia - k)
                tom = telha[0] if lado < 0 else telha[1]
                if (y + k) % 3 == 0:
                    tom = telha[2]
                if k == 0:
                    tom = "#f0b090" if lado < 0 else "#4a2420"
                if hash01(int(x), y, seed + 7) > 0.9:
                    tom = "#6a7a48" if lado > 0 else tom
                c.p(x, y, tom)
    # janelas: em cima com venezianas e floreira; embaixo com a portinha
    for f in janelas:
        jx = int(x0 + (x1 - x0) * f) - 4
        jy = andar + 5
        c.ret(jx - 3, jy - 1, 2, 11, "#3e6a5a")
        c.ret(jx + 9, jy - 1, 2, 11, "#2e5244")
        c.ret(jx - 1, jy - 1, 10, 11, "#3a2a22")
        e.ret(jx, jy, 8, 9, "#ffbe66")
        e.ret(jx + 1, jy + 1, 3, 3, "#ffeec4")
        for cam in (c, e):
            cam.ret(jx + 4, jy, 1, 9, "#3a2418")
            cam.ret(jx, jy + 4, 8, 1, "#3a2418")
        c.ret(jx - 2, jy + 9, 12, 2, "#7a4a2a")
        for k in range(12):
            c.p(jx - 2 + k, jy + 8 - (k % 2), ["#f4a7c4", "#ffe07a", "#f07a6a", "#e8e0ff"][(k + seed) % 4])
            c.p(jx - 2 + k, jy + 9 - (k % 2), "#4a7a3a")
        luzes.append((jx + 4, jy + 10, 16, 0.9, "#ffaa50", 0.35))
    if portinha is not None:
        dx = int(x0 + (x1 - x0) * portinha)
        c.ret(dx - 1, base - 13, 10, 13, "#3a2a22")
        c.ret(dx, base - 12, 8, 12, "#5a3420")
        c.ret(dx + 3, base - 12, 1, 12, "#3a2014")
        e.ret(dx + 1, base - 10, 2, 3, "#ffbe66", 0.9)
        luzes.append((dx + 4, base - 6, 14, 1.0, "#ffa850", 0.3))
    if chamine is not None:
        chx = int(x0 + (x1 - x0) * chamine)
        topo = int(cumeeira + (andar - cumeeira) * abs(chx - cx) / ((x1 - x0) / 2)) - 12
        c.ret(chx, topo, 5, 12, "#7a5a52")
        c.ret(chx, topo, 1, 12, "#b88a7a")
        c.ret(chx - 1, topo - 1, 7, 2, "#3e2c2c")


def bandeirolas(c: Camada, pontos, seed: int) -> None:
    """Cordão de bandeirolas triangulares lisas (sem letras) que cai entre dois pontos."""
    (x0, y0), (x1, y1) = pontos
    n = int(abs(x1 - x0) / 4)
    cores = ["#c83a34", "#e8b04a", "#3e7a6a", "#f0e2c8", "#8a3a5a"]
    for i in range(n + 1):
        t = i / max(1, n)
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t + math.sin(t * math.pi) * 5
        c.p(x, y, "#3a2a24")
        if i % 1 == 0 and 0 < i < n:
            cor = cores[(i + seed) % len(cores)]
            for j in range(4):
                for k in range(-(3 - j) // 2, (3 - j) // 2 + 1):
                    c.p(x + k, y + 1 + j, cor)
            c.p(x - 1, y + 1, "#ffffff", 0.4)


# ─────────────────────────────── A cena ───────────────────────────────
def ceu() -> np.ndarray:
    if P == "manha":
        return ceu_hora([(0, "#2a58ac"), (40, "#4a86d2"), (80, "#8ab8e6"), (108, "#c4dcee"), (124, "#e6eef0"), (140, "#f6ecd8"),
                         (200, "#f6ecd8")],
                        sol=(FEIXE_SOL["manha"][0], FEIXE_SOL["manha"][1], 4, "#fff0c8", 0.28, 100),
                        nuvens=dict(yc=52, esp=50, limiar=0.56, ex=36, ey=9, luz="#ffffff", sombra="#9eb4d6", miolo="#d8e4f2",
                                    lado_luz=-1, luz_dy=-1, forca=0.95), seed=401)
    if P == "tarde":
        c = ceu_hora([(0, "#2e3680"), (30, "#5e5294"), (64, "#c47884"), (92, "#ff9e66"), (110, "#ffc47e"), (122, "#fff0c0"),
                      (200, "#ffdca0")],
                     sol=(FEIXE_SOL["tarde"][0], FEIXE_SOL["tarde"][1], 7, "#ffb050", 0.85, 170),
                     nuvens=dict(yc=66, esp=44, limiar=0.55, ex=50, ey=4, luz="#fff0b0", sombra="#a0566e", miolo="#e0806e",
                                 lado_luz=-1, luz_dy=1, forca=0.92), seed=402)
        return c
    return ceu_hora([(0, "#03061a"), (40, "#0a1134"), (84, "#17224e"), (116, "#26346a"), (132, "#33437a"), (200, "#33437a")],
                    lua=(FEIXE_SOL["noite"][0], FEIXE_SOL["noite"][1], 7, True),
                    nuvens=dict(yc=74, esp=36, limiar=0.6, ex=50, ey=4, luz="#9aa8dc", sombra="#18204a", miolo="#2a3466",
                                lado_luz=-1, luz_dy=-1, forca=0.8),
                    estrelas=360, seed=403)


def montar(com_sino: bool) -> tuple[Image.Image, np.ndarray]:
    """Pinta e monta a cena da hora P. Devolve a imagem e a máscara (3x) do sino."""
    luzes: list = []
    xs = np.arange(W)

    # ── Montanhas ao longe (perspectiva aérea: claras e frias).
    longe = Camada()
    crista = 108 + 7 * np.sin(xs / 41) + 4 * np.sin(xs / 14 + 1) + ruido(14, 6)[0] * 5 - 16 * np.exp(-((xs - 120) / 70) ** 2) \
        - 10 * np.exp(-((xs - 300) / 50) ** 2)
    for x in range(W):
        for y in range(int(crista[x]), H):
            t = min(1, (y - crista[x]) / 30)
            cor = mistura("#9a8aa8", "#6a6488", t)
            if y - crista[x] < 1.5 and crista[max(0, x - 1)] > crista[x]:
                cor = hexa("#d8c8d8")
            longe.p(x, y, cor)
    # ── Colinas do meio, a colina do castelo e o castelo da prova (frio, distante).
    meio_c = Camada()
    e_longe = Camada()
    KX = 262
    colina = 124 + 3 * np.sin(xs / 23) + 2 * np.sin(xs / 7) - 22 * np.exp(-((xs - KX) / 26) ** 2) - 6 * np.exp(-((xs - 80) / 60) ** 2)
    n = ruido(15, 5)
    for x in range(W):
        for y in range(int(colina[x]), H):
            t = min(1, (y - colina[x]) / 22)
            cor = mistura("#6a6a8a", "#44486a", t)
            if n[y, x] > 0.62:
                cor = cor * 0.88
            if y - colina[x] < 1:
                cor = mistura("#b8b0c8", "#6a6a8a", 0.4)
            meio_c.p(x, y, cor)
    g = np.random.default_rng(16)
    for _ in range(130):  # pinheiros na crista
        x = int(g.random() * W)
        if KX - 22 < x < KX + 22:
            continue
        y0 = colina[x] + 2 + g.random() * 7
        alt = 3 + int(g.random() * 6)
        for j in range(alt):
            for dx in range(-(j // 2), j // 2 + 1):
                meio_c.p(x + dx, y0 - alt + j, "#323a52" if dx >= 0 else "#4a5270")
    kb = int(colina[KX]) + 3
    meio_c.ret(KX - 16, kb - 9, 33, 10, "#5e6684")
    meio_c.ret(KX - 16, kb - 9, 2, 10, "#9aa2c0")
    meio_c.ret(KX + 11, kb - 9, 6, 10, "#424a68")
    for k in range(KX - 16, KX + 17, 2):
        meio_c.p(k, kb - 10, "#5e6684")
    for (tx, larg, alt) in ((KX - 15, 5, 17), (KX - 5, 9, 28), (KX + 7, 6, 15), (KX + 14, 4, 11)):
        meio_c.ret(tx, kb - alt, larg, alt, "#58607e")
        meio_c.ret(tx + larg - 2, kb - alt, 2, alt, "#3c4462")
        meio_c.ret(tx, kb - alt, 1, alt, "#a8b0cc")
        for k in range(larg // 2 + 2):
            yk = kb - alt - 1 - k * 2
            meio_c.ret(tx - 1 + k, yk - 1, larg + 2 - 2 * k, 2, "#3e4a72")
            meio_c.ret(tx + larg // 2, yk - 1, larg // 2 + 1 - k, 2, "#2c3456")
            meio_c.p(tx - 1 + k, yk - 1, "#9aa8cc")
    meio_c.ret(KX - 1, kb - 6, 3, 6, "#22263a")
    meio_c.ret(KX, kb - 44, 1, 8, "#2a2e40")
    meio_c.ret(KX + 1, kb - 44, 5, 2, "#c84a3a")
    meio_c.ret(KX + 1, kb - 42, 3, 1, "#8a2a2a")
    for (wx, wy) in ((KX - 1, kb - 22), (KX + 2, kb - 22), (KX, kb - 15), (KX - 13, kb - 12), (KX + 9, kb - 9), (KX - 8, kb - 5),
                     (KX + 5, kb - 5), (KX + 15, kb - 7)):
        e_longe.ret(wx, wy, 1, 2, "#ffd070")
        e_longe.p(wx, wy, "#fff0b0")
    e_longe.ret(KX - 1, kb - 5, 3, 5, "#ffb050", 0.8)
    luzes.append((KX, kb - 10, 14, 1.0, "#ffb060", 0.25))
    for (wx, wy) in ((150, 128), (188, 126), (226, 130), (322, 124), (346, 127), (96, 130)):  # sítios nas colinas
        e_longe.p(wx, wy, "#ffc060", 0.8)

    # ── Campo: retalhos de lavoura, o bosque e a muralha antiga à esquerda (calmos), o gramado perto da praça.
    campo = Camada()
    n1, n2 = ruido(21, 9), ruido(22, 3)
    for y in range(118, H):
        prof = (y - 118) / 82
        for x in range(W):
            if y < colina[x] + 5:
                continue
            per = int(18 + prof * 46)
            cel = (int((x + y * 2.2) / per), int(y / (4 + prof * 14)))
            k = hash01(cel[0], cel[1], 9)
            tons = [("#6a8650", "#566e44"), ("#8a8650", "#72703e"), ("#567a54", "#446444"), ("#76925a", "#62784a")][int(k * 4)]
            vv = n1[y, x] * 0.7 + n2[y, x] * 0.3
            cor = hexa(tons[0] if vv > 0.5 else tons[1])
            if prof > 0.35:
                cor = hexa("#5e8a48" if vv > 0.6 else "#4c7a3e" if vv > 0.42 else "#3e6834")
            elif (x + int(y * 2.2)) % per == 0:
                cor = hexa("#344a34")
            campo.p(x, y, cor)
    g = np.random.default_rng(23)
    for _ in range(60):  # árvores redondas nos campos
        x = g.random() * W
        y = 128 + g.random() * 18
        if x > 290 and y > 134:
            continue
        rr = 1.5 + (y - 120) * 0.14
        campo.disco(x, y - rr, rr, ("#6a8a5a", "#486a46", "#2c4234"))
    # o bosque à esquerda: copas em massa, escuras e de pouco contraste (fundo do texto)
    bosque = Camada()
    for _ in range(140):
        x = g.random() * 215
        y = 150 + g.random() * 14 - x * 0.03
        rr = 4 + g.random() * 6
        bosque.disco(x, y, rr, ("#4a6a48", "#34503a", "#22382c"), granulado=0.4)
    # a muralha antiga da vila, baixa, atravessando o campo (pedra gasta, ameias e uma torrinha em ruína)
    for x in range(0, 214):
        yb = 156 - x * 0.05
        alt = 7
        for y in range(int(yb - alt), int(yb)):
            k = hash01(x // 5, (y - int(yb)) // 3, 77)
            cor = mistura("#8a8478", "#5e5a56", k * 0.6 + (y - yb + alt) / alt * 0.3)
            if (x // 5 + (y // 3)) % 2 == 0 and (x % 5 == 0):
                cor = cor * 0.8
            bosque.p(x, y, cor)
        if x % 6 < 3:
            bosque.ret(x, yb - alt - 2, 1, 2, "#7a7468")
    bosque.ret(150, 136, 10, 16, "#7a7468")
    bosque.ret(150, 136, 1, 16, "#a8a090")
    for k in range(150, 160, 3):
        bosque.ret(k, 134, 2, 2, "#7a7468")
    bosque.ret(154, 142, 3, 4, "#2a2a30")

    # ── A estrada: do primeiro plano (x ~ 220) até a praça, e um ramo estreito que sobe até o castelo.
    estrada = curva([(214, 206), (236, 186), (262, 174), (292, 166), (318, 163), (338, 164)], 140)
    ramo = curva([(292, 166), (284, 156), (270, 148), (262, 140), (268, 134), (262, kb + 1)], 80)
    trilha = Camada()
    def pintar_caminho(pts, larg_de) -> None:
        for (x, y) in pts:
            larg = larg_de(y)
            for dx in range(int(-larg - 1), int(larg + 2)):
                for dy in (0, 1):
                    px, py = x + dx, y + dy
                    u = abs(dx) / max(larg, 0.5)
                    if u > 1:
                        continue
                    k = hash01(int(px), int(py), 31)
                    cor = mistura("#d2b07e", "#a07c54", k * 0.7 + u * 0.5)
                    if larg > 5 and 0.3 < u < 0.42:  # sulcos das rodas
                        cor = mistura("#8a6646", "#6e5036", k)
                    if u > 0.86:
                        cor = mistura("#7a6444", "#56683e", k)
                    trilha.p(px, py, cor)
    pintar_caminho(ramo, lambda y: 0.8 + max(0, y - 128) * 0.12)
    pintar_caminho(estrada, lambda y: 3 + max(0, y - 160) * 0.55)
    g = np.random.default_rng(32)
    for (x, y) in estrada[::5]:
        larg = 3 + max(0, y - 160) * 0.55
        px = x + (g.random() - 0.5) * larg * 1.6
        trilha.p(px, y + g.random() * 2, "#ecd6b0")
        trilha.p(px + 1, y + 1 + g.random() * 2, "#6a5038")
    # capim nas bordas da estrada
    for (x, y) in estrada[::3]:
        larg = 3 + max(0, y - 160) * 0.55
        for lado in (-1, 1):
            if g.random() < 0.5:
                bx = x + lado * (larg + 1)
                for j in range(int(1 + g.random() * (y - 150) * 0.06)):
                    trilha.p(bx + lado * (j % 2), y - j, "#4a7a3a" if j else "#3a6030")

    # ── A praça de paralelepípedos irregulares, com o muro baixo e a escada até a estrada.
    praca_m = (((_XS - 420) / 120) ** 2 + ((_YS - 196) / 36) ** 2 < 1) | ((_XS > 330) & (_YS > 168))
    paralelos = Camada()
    ccx, ccy = CX - 20, BASE + 150  # centro dos arcos, bem abaixo da cena
    for y in range(158, H):
        for x in range(300, W):
            if not praca_m[y, x]:
                continue
            dx, dy = x - ccx, (y - ccy) * 2.0
            rr = math.hypot(dx, dy)
            ang = math.atan2(dx, -dy)
            alt = 2.2 + (y - 158) * 0.05  # fiadas mais largas perto da câmera
            fi = int(rr / alt / 2.6 * 2.6)
            fr = rr / alt - int(rr / alt)
            larg = (3.2 + (y - 158) * 0.07) / max(rr, 1)
            off = hash01(int(rr / alt), 1, 41)
            fc = ang / larg + off
            col = int(math.floor(fc))
            fx = fc - col
            k = hash01(col, int(rr / alt), 41)
            if fr > 0.78 or fx > 0.84:
                cor = "#5e5652" if k > 0.2 else "#5a7046"
            elif fr < 0.22 or fx < 0.14:
                cor = "#e2d6c6" if k > 0.3 else "#cabcac"
            else:
                cor = ["#aa9e92", "#b8ac9e", "#9c9088", "#c4b6a6", "#a49a8c", "#8a9a72"][int(k * 5.6)]
            paralelos.p(x, y, cor)
    borda = praca_m & ~(np.roll(praca_m, 2, 0) & np.roll(praca_m, -2, 1) & np.roll(praca_m, 2, 1))
    paralelos.mascara(borda.astype(np.float32) * (_YS > 158), "#5a4e4a")
    # muro baixo da praça (à esquerda, onde a estrada sobe), com escada gasta
    muro = Camada()
    cantaria(muro, 300, 334, 172, 182, 55, ("#5a524e", "#7a6e64", "#9a8c7c", "#b8a894"), alt=4, larg=7, musgo_de=0.2)
    muro.ret(299, 171, 36, 2, "#c8baa8")
    muro.ret(299, 171, 36, 1, "#ece0cc")
    for (i, y) in enumerate((166, 169, 172)):
        muro.ret(334 - i, y, 10 + i * 2, 3, "#a89a8c")
        muro.ret(334 - i, y, 10 + i * 2, 1, "#ddd0bc")
    # marco de pedra na bifurcação (sem letras): pedra arredondada com musgo
    muro.disco(296, 160, 3.2, ("#c8bcac", "#8a7e72", "#4e4646"))
    muro.ret(293, 160, 7, 3, "#7a6e64")
    muro.ret(293, 162, 7, 1, "#3a3236")
    muro.p(294, 158, "#6a8a4a")
    muro.p(295, 157, "#6a8a4a")

    # ── Casas, torre, lampiões, bandeirolas e canteiros.
    predios = Camada()
    emiss = Camada()
    rel = Camada()
    campanario = Camada()
    casa(predios, emiss, 296, 324, 160, 136, 120, luzes, 52, reboco=("#c4b89e", "#887c6c"), telha=("#a85a44", "#7e4030", "#542620"),
         janelas=(0.5,), chamine=0.3, pedra_baixo=True)
    casa(predios, emiss, 318, 358, 168, 128, 106, luzes, 51, janelas=(0.28, 0.72), portinha=0.42, chamine=0.74)
    casa(predios, emiss, 434, 492, 170, 122, 98, luzes, 53, reboco=("#d4c6aa", "#928470"), telha=("#b86044", "#8a4430", "#5a2a22"),
         janelas=(0.2, 0.55), portinha=0.12, chamine=None)
    torre(predios, emiss, rel, campanario, luzes)
    if not com_sino:
        campanario = Camada()
    bandeirolas(predios, ((340, 113), (XA - 2, 120)), 1)
    bandeirolas(predios, ((XB + LADO, 117), (452, 108)), 3)
    objetos = Camada()
    lampiao(objetos, emiss, 252, 182, 0.75, luzes)
    lampiao(objetos, emiss, 286, 168, 0.5, luzes)
    lampiao(objetos, emiss, 455, 184, 0.95, luzes)
    # canteiros junto à torre: terra, folhagem e flores discretas
    g = np.random.default_rng(61)
    flores = ["#f4a7c4", "#ffe07a", "#c8a8f8", "#ffffff", "#f07a6a"]
    for (x0, x1) in ((XA - 18, XA - 6), (XB + LADO + 1, XB + LADO + 14)):
        objetos.ret(x0, BASE - 3, x1 - x0, 4, "#7a6a5a")
        objetos.ret(x0, BASE - 3, x1 - x0, 1, "#b8a890")
        for _ in range(60):
            x = x0 + g.random() * (x1 - x0)
            y = BASE - 4 - g.random() * 6 * g.random()
            objetos.p(x, y, ["#3e6a36", "#5a8a48", "#2e5230"][int(g.random() * 3)])
        for _ in range(9):
            objetos.p(x0 + g.random() * (x1 - x0), BASE - 5 - g.random() * 4, flores[int(g.random() * 5)])

    # ── Primeiro plano (desfocado): folhas no canto esquerdo, o parapeito no canto direito.
    frente = Camada()
    for (cx_, cy_, rr) in ((-6, 196, 26), (34, 204, 18), (70, 210, 14)):
        frente.disco(cx_, cy_, rr, ("#5a8a48", "#3e6a36", "#26462a"))
    for _ in range(140):
        x = g.random() * 110
        alt = 6 + g.random() * 18
        inc = (g.random() - 0.5) * 0.7
        for j in range(int(alt)):
            frente.p(x + inc * j, H - 1 - j, "#4a7a3a" if j > alt * 0.5 else "#2e4e2a")
    cantaria(frente, 432, W, 191, H, 91, ("#5a524e", "#7a6e64", "#9a8c7c", "#b8a894"), alt=6, larg=13, musgo_de=0.0)
    frente.ret(428, 189, W - 428, 3, "#b8aa9a")
    frente.ret(428, 189, W - 428, 1, "#e6dac6")
    for _ in range(40):
        frente.p(432 + g.random() * 48, 189 - g.random() * 3, ["#4a7a3a", "#6a9a4a"][int(g.random() * 2)])
    vagalumes = Camada()
    for _ in range(30):
        vagalumes.p(220 + g.random() * 250, 122 + g.random() * 56, "#f0ff9a", 0.6 + g.random() * 0.4)

    # ── A hora do dia: paleta das camadas distantes, sombras projetadas e luz.
    rampas_longe = {"manha": [(0, "#5a74a2"), (0.6, "#7e96c0"), (1, "#c8d8ec")],
                    "tarde": [(0, "#5a2c50"), (0.55, "#7c4062"), (1, "#ffb08c")],
                    "noite": [(0, "#10162e"), (0.6, "#1c2650"), (1, "#56669e")]}
    rampas_meio = {"manha": [(0, "#33505e"), (0.45, "#4c6c78"), (0.8, "#80a0a6"), (1, "#c0d0c0")],
                   "tarde": [(0, "#22142a"), (0.5, "#38223e"), (0.85, "#6e3e58"), (1, "#d07468")],
                   "noite": [(0, "#080c22"), (0.5, "#121a3a"), (1, "#4a5a92")]}
    remapear(longe, rampas_longe[P], 0.12)
    remapear(meio_c, rampas_meio[P], 0.3)
    a = predios.c[:, :, 3]
    comp, cis = {"manha": (0.32, 0.7), "tarde": (0.5, 0.95), "noite": (0.22, 0.4)}[P]
    sombra = np.zeros((H, W), dtype=np.float32)
    for (xa, xb, base) in ((XA - 6, XB + LADO + 3, BASE), (318, 358, 168), (296, 324, 160), (434, W, 170)):
        recorte = np.zeros_like(a)
        recorte[:int(base), xa:xb] = a[:int(base), xa:xb]
        sombra = np.maximum(sombra, sombra_projetada(recorte, base, comp, cis))
    ao = np.zeros((H, W), dtype=np.float32)  # oclusão de contato no pé das paredes
    ao[BASE:BASE + 3, XA - 6:XB + LADO + 3] = 1
    ao[168:171, 318:358] = 1
    ao[170:173, 434:W] = 1
    sombra = np.maximum(sombra, desfocar(ao[:, :, None], 1.2)[:, :, 0] * 0.8) * (_YS > 150)

    m = Montagem(ceu())
    m.camada(longe, 2.2)
    m.camada(meio_c, 1.1)
    m.emissivo(e_longe, 0.4, halo={"manha": 0.0, "tarde": 0.3, "noite": 1.0}[P])
    m.camada(campo, 0.5)
    nev = {"manha": ("#dce6f0", 0.4), "tarde": ("#ffc89a", 0.32), "noite": ("#3a4a80", 0.42)}[P]
    nevoa(m, 120, 140, nev[0], nev[1], 311, x0=60)
    m.camada(bosque, 0.9, escurecer={"manha": 0.92, "tarde": 0.8, "noite": 0.75}[P])
    m.camada(trilha)
    m.camada(paralelos)
    m.camada(muro)
    m.camada(objetos)
    m.camada(predios)
    m.camada(campanario)
    if P == "manha":
        m.camada(apagar(emiss, predios))
        m.camada(rel)
        m.iluminar("#a8b4d2", [(CX, 54, 20, 1.0, "#ffc070", 0.15)], mapa=mapa_sol("#fff0d4", 0.66, sombra, 0.85))
    elif P == "tarde":
        m.camada(apagar(emiss, predios, vidro=("#3a2430", "#a8605a", "#ffd8a0"), aceso=0.35))
        janelas = [l[:5] + (l[5] * 0.3,) for l in luzes]
        poente = [(232, 112, 240, 0.4, "#ff9a5a", 0.32)]
        m.iluminar("#86708c", janelas + poente, mapa=mapa_sol("#ffb070", 0.64, sombra, 0.9))
        # o filete de luz do poente na quina esquerda da torre e das casas
        borda = np.zeros((H, W), dtype=np.float32)
        borda[TOPO_CORPO:BASE, XA:XA + 2] = 1
        borda[0:36, :] = 0
        m.somar(desfocar(ampliar(borda[:, :, None]), 1.2)[:, :, 0], "#ffb070", 0.16)
    else:
        fortes = [l[:5] + (l[5] * 1.25,) for l in luzes]
        m.iluminar("#2c3266", fortes + [(168, 24, 280, 0.6, "#6a7ac8", 0.12)], mapa=mapa_sol("#7a8ad0", 0.18, sombra, 0.9))
        m.emissivo(emiss, 0, halo=0.8)
        m.emissivo(rel, 0, halo=0.18)
    if P == "tarde":
        m.emissivo(rel, 0, halo=0.12)

    # ── Feixes de luz atravessando a rua (manhã e tarde), com poeira; luar fino à noite.
    if P in ("manha", "tarde"):
        sx, sy = FEIXE_SOL[P]
        ceu_claro = np.clip((m.img.mean(2) - (0.78 if P == "manha" else 0.62)) * 3, 0, 1) * (1 - m.solido) * (_GYS < 150 * ESC)
        raios = raios_radiais(ceu_claro, (sx, sy), alcance=0.7)
        m.somar(desfocar(raios[:, :, None], 6)[:, :, 0], "#fff4d8" if P == "manha" else "#ffb070", 0.24 if P == "manha" else 0.7)
        # dois feixes que passam entre as casas e a torre e pousam na praça
        feixe = np.zeros((H, W), dtype=np.float32)
        if P == "manha":
            feixe = np.maximum(feixe, poligono_m([(336, 104), (358, 104), (420, 196), (380, 196)]))
            feixe = np.maximum(feixe, poligono_m([(300, 118), (312, 118), (350, 196), (330, 196)]) * 0.6)
        else:
            feixe = np.maximum(feixe, poligono_m([(300, 128), (318, 124), (480, 186), (480, 200), (440, 200)]))
        feixe *= (1 - np.clip((_YS - 150) / 60, 0, 1) * 0.4)
        f3 = desfocar(ampliar(feixe[:, :, None]), 10)[:, :, 0] * (1 - 0.7 * desfocar(ampliar((a > 0.5).astype(np.float32)[:, :, None]), 2)[:, :, 0])
        m.somar(f3, "#fff2cc" if P == "manha" else "#ffbe80", 0.14 if P == "manha" else 0.16)
        poeira = np.zeros((H * ESC, W * ESC), dtype=np.float32)
        g2 = np.random.default_rng(88)
        for _ in range(260):
            x, y = int(g2.random() * W * ESC), int(g2.random() * H * ESC)
            if f3[y, x] > 0.25:
                poeira[y, x] = 0.6 + g2.random() * 0.4
        m.somar(desfocar(poeira[:, :, None], 0.6)[:, :, 0], "#fff6dc", 0.9)
    else:
        m.emissivo(vagalumes, 0, halo=1.3)
    m.camada(frente, 6, escurecer={"manha": 0.62, "tarde": 0.42, "noite": 0.3}[P])

    quente, fria = {"manha": ("#fff0d4", "#24366a"), "tarde": ("#ffcf8a", "#3a1e4e"), "noite": ("#ffd8a8", "#121848")}[P]
    img = m.acabar(quente, fria, esquerda=0.38, centro_v=(0.7, 0.5), contraste=1.08 if P == "manha" else 1.06,
                   bloom={"manha": 0.3, "tarde": 0.55, "noite": 1.0}[P])
    sino_m = ampliar(campanario.c[:, :, 3:4])[:, :, 0] if com_sino else np.zeros((H * ESC, W * ESC), dtype=np.float32)
    return img, sino_m


def gerar(periodo: str) -> None:
    global P
    P = periodo
    v.PERIODO = periodo
    PASTA.mkdir(parents=True, exist_ok=True)
    com, mascara = montar(True)
    sem, _ = montar(False)
    nome = f"torre-tempo-{periodo}"
    sem.save(PASTA / f"{nome}.webp", quality=84, method=6)
    sem.resize((960, 400), Image.LANCZOS).save(PASTA / f"{nome}-960.webp", quality=84, method=6)
    # O sino recortado da cena com o sino, já com a luz da hora (para balançar por cima do fundo).
    ys, xs = np.nonzero(mascara > 0.5)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.asarray(com)[y0:y1, x0:x1]
    rgba[:, :, 3] = (mascara[y0:y1, x0:x1] > 0.5) * 255
    Image.fromarray(rgba).save(PASTA / f"torre-tempo-sino-{periodo}.png", optimize=True)
    tam = (PASTA / f"{nome}.webp").stat().st_size // 1024, (PASTA / f"{nome}-960.webp").stat().st_size // 1024
    print(f"{nome}: {tam[0]} KB, 960: {tam[1]} KB; sino em x {x0}-{x1}, y {y0}-{y1} (de 1440 x 600)")


def chao_da_praca() -> None:
    """O chão da praça que continua a cena embaixo do topo (o fundo da página do cronograma): paralelepípedos
    irregulares de pedra escura, cada um com o seu tom, chanfro claro no alto à esquerda, sombra embaixo à direita,
    rejunte com musgo e algumas lascas. Ladrilho de 160 x 160 que se repete sem emenda (as sementes dão a volta)."""
    T = 160
    g = np.random.default_rng(907)
    # Centros das pedras numa grade com tremor (fiadas desencontradas), repetida em volta para o ladrilho fechar.
    cent = []
    for j in range(0, T, 11):
        for i in range(0, T, 14):
            off = 7 if (j // 11) % 2 else 0
            cent.append(((i + off + g.uniform(-3, 3)) % T, (j + g.uniform(-2, 2)) % T))
    cent = np.array(cent, dtype=np.float32)
    ys, xs = np.mgrid[0:T, 0:T].astype(np.float32)
    d1 = np.full((T, T), 1e9, np.float32); d2 = d1.copy(); idx = np.zeros((T, T), np.int32)
    for k, (cx, cy) in enumerate(cent):
        dx = np.abs(xs - cx); dx = np.minimum(dx, T - dx)
        dy = np.abs(ys - cy); dy = np.minimum(dy, T - dy)
        d = np.hypot(dx * 0.82, dy * 1.05)
        menor = d < d1
        d2 = np.where(menor, d1, np.minimum(d2, d))
        idx = np.where(menor, k, idx)
        d1 = np.where(menor, d, d1)
    borda = d2 - d1
    tom = np.array([hash01(k, 3, 907) for k in range(len(cent))], np.float32)[idx]
    # chanfro: a luz vem de cima à esquerda (como no topo); o lado de baixo à direita da pedra escurece
    cxp, cyp = cent[idx, 0], cent[idx, 1]
    rx = xs - cxp; rx = (rx + T / 2) % T - T / 2
    ry = ys - cyp; ry = (ry + T / 2) % T - T / 2
    luz = np.clip(-(rx * 0.6 + ry * 0.8) / 7, -1, 1)
    n = v.ruido(911, 2, 2, T, T)
    base = 0.2 + tom * 0.1 + luz * 0.06 * np.clip(borda / 3, 0, 1) + (n - 0.5) * 0.04
    pedra = np.stack([base * 1.1, base * 0.97, base * 0.84], 2)  # pedra morna, de arenito gasto
    pedra = pedra + (np.clip(1.4 - borda, 0, 1) * (luz > 0.25))[:, :, None] * np.array([0.12, 0.085, 0.04], np.float32)  # aresta acesa, âmbar
    rejunte = borda < 1.25
    musgo = (v.ruido(913, 5, 5, T, T) > 0.58) & rejunte
    cor = np.where(rejunte[:, :, None], np.array([0.075, 0.06, 0.045], np.float32), pedra)
    cor = np.where(musgo[:, :, None], np.array([0.13, 0.16, 0.08], np.float32), cor)
    lasca = (n > 0.82) & (borda > 2.5) & (tom > 0.6)
    cor = np.where(lasca[:, :, None], cor * 1.35, cor)
    img = Image.fromarray((np.clip(cor, 0, 1) * 255).astype(np.uint8)).resize((T * ESC, T * ESC), Image.NEAREST)
    PASTA.mkdir(parents=True, exist_ok=True)
    img.save(PASTA / "torre-tempo-chao.webp", quality=80, method=6)
    print("torre-tempo-chao:", (PASTA / "torre-tempo-chao.webp").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    if "chao" in sys.argv[1:]:
        chao_da_praca()
        sys.exit()
    for p in [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS):
        gerar(p)
