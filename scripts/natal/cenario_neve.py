"""A clareira nevada no Natal, com a montagem do cenário de inverno.

O pinheiro fica no ombro da trilha, ao lado da cabana de festão aceso.
O trenó original leva presentes e uma lamparina junto aos patins.
Uso: python3 scripts/natal/cenario_neve.py [manha tarde noite]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image

from hd2d import Camada, h01, hexa, pal
from cenarios import inicio_neve as cena

SAIDA = Path(__file__).resolve().parents[2] / "public" / "pixel" / "inicio"
VINHO = pal("#301017", "#4a141c", "#691d26", "#8b2832", "#a93842", "#c55057", "#e07673")
VERDE = pal("#0d2529", "#193e40", "#235452", "#376e68", "#528b7b", "#75a687", "#a5c6a2")
LATAO = pal("#332217", "#543619", "#805722", "#a87535", "#cb9951", "#eec481", "#ffe6ac")
LINHO = pal("#50443c", "#725c4f", "#90775f", "#ac9272", "#c7ad87", "#e5cb9e", "#f3e4bd")
FERRO = pal("#17141b", "#29242c", "#3b3440", "#4d4952", "#716765", "#988472", "#beab91")
COR_LUZ = "#ffcf83"
CENTRO, BASE_PINHO = 323, 160
Pontos = dict[tuple[int, int], tuple[float, float]]  # (x, y) → (alcance, potência)


def pintar_pinheiro(P: cena.Plano, E: Camada, L, pontos: Pontos) -> np.ndarray:
    """Usa as saias nevadas da mata e pendura vidro, latão e o fio entre os galhos."""
    c = cena.Plano()
    cena.pinheiro(c, CENTRO, BASE_PINHO, 40, 12.45, L, seed=763, neve=0.52, tronco_alt=5)
    copa = c.c.c[:, :, 3] > 0.5
    albedo = c.c.c[:, :, :3]
    folhas = copa & (albedo[:, :, 1] > albedo[:, :, 0] + 0.024)
    albedo[folhas] *= (1.20, 1.46, 1.24)
    c.d[folhas] = np.maximum(c.d[folhas], 0.18)
    d = cena.direto(L, (0.15, 0.72, 0.5))
    c.c.contornar("#112223", 0.35)
    # O fio desce em arcos partidos pelos galhos em primeiro plano.
    for esq, dir_, fundo, queda in ((-4, 5, 37, 2.3), (-7, 8, 29, 2.9), (-9, 11, 19, 3.1), (-10, 10, 12, 2.0)):
        a, b = CENTRO + esq, CENTRO + dir_
        for x in range(a, b):
            t = (x - a) / (b - a)
            y = round(BASE_PINHO - fundo + queda * math.sin(math.pi * t) + 2.2 * t)
            if copa[y, x]:
                c.p(x, y, LATAO[2 if x % 4 == 0 else 0], d * 0.55, a=0.82)
    # Ornamentos de vidro soprados, pendurados nas bordas firmes das saias.
    for dx, alto, cores in ((-2, 34, VINHO), (5, 26, VERDE), (-5, 21, VINHO),
                            (8, 14, VINHO), (-3, 10, LATAO), (6, 6, VINHO), (-8, 6, VINHO)):
        x, y = CENTRO + dx, BASE_PINHO - alto
        if not copa[y - 2, x]:
            continue
        c.p(x, y - 2, LATAO[4], d)
        for (ox, oy, k) in ((0, -1, 4), (-1, 0, 5), (0, 0, 6), (1, 0, 2),
                            (-1, 1, 3), (0, 1, 2), (1, 1, 1), (0, 2, 1)):
            c.p(x + ox, y + oy, cores[k], max(0.34, d) * (0.92 if ox < 1 else 0.62))
    for dx, alto, raio, peso in ((1, 37, 8, 0.24), (-3, 30, 9, 0.28), (3, 25, 9, 0.23),
                                 (-6, 17, 10, 0.28), (6, 17, 10, 0.28), (-1, 12, 13, 0.37),
                                 (7, 8, 14, 0.33), (-7, 10, 14, 0.30)):
        x, y = CENTRO + dx, BASE_PINHO - alto
        if not copa[y, x]:
            continue
        c.p(x, y - 1, LATAO[2], d * 0.7)
        c.p(x, y, LATAO[6], d)
        c.p(x, y + 1, LATAO[4], d)
        c.p(x - 1, y, LATAO[3], d)
        E.p(x, y, "#ffe6a3", 0.95)
        E.p(x, y + 1, "#ffc06a", 0.53)
        if alto < 18:
            c.p(x + 1, y, LATAO[4], d)
            E.p(x + 1, y, "#ffd18b", 0.53)
        pontos[(x, y)] = raio, peso

    # Estrela secular facetada no guia do pinheiro. A vareta prende a peça
    # ao broto mais alto, e os próprios planos do latão definem cinco pontas.
    estrela = ("...3...", "...5...", "2456421", ".35641.", "..454..", "..3.2..")
    x0, y0 = CENTRO - 3, BASE_PINHO - 51
    c.p(CENTRO, y0 + 6, LATAO[4], d)
    c.p(CENTRO, y0 + 7, LATAO[2], d)
    c.p(CENTRO, y0 + 8, cena.VERDE_PINHO[4], d)
    for dy, linha in enumerate(estrela):
        for dx, tom in enumerate(linha):
            if tom != ".":
                c.p(x0 + dx, y0 + dy, LATAO[int(tom)], max(d, 0.42))
    E.p(CENTRO, y0 + 3, "#fff1bc", 0.88)
    E.p(CENTRO - 1, y0 + 2, "#ffd284", 0.55)
    pontos[(CENTRO, y0 + 3)] = 10, 0.32
    iluminar_ramos_altos(c, pontos)

    # A borda rasgada de neve cobre o pé do tronco onde ele entra na
    # clareira. Guarda o mesmo sombreamento dos outros tufos do cenário.
    d_neve = cena.direto(L, (0.12, 0.36, 1))
    for dx, dy, k in ((-6, 1, 1), (-5, 1, 3), (-4, 1, 4), (-3, 0, 2), (-3, 1, 4), (-2, 1, 3),
                      (-1, 2, 3), (0, 2, 4), (1, 1, 5), (1, 2, 3), (2, 0, 4), (2, 1, 4),
                      (3, 1, 3), (4, 0, 3), (4, 1, 2), (6, 1, 1)):
        c.p(CENTRO + dx, BASE_PINHO + dy, cena.NEVE[k], d_neve * (0.65 if dy == 2 else 0.88), a=0.88)
    cena.juntar_plano(P, c, BASE_PINHO)
    return c.c.c[:, :, 3]


def iluminar_ramos_altos(P: cena.Plano, pontos: Pontos) -> None:
    """Incidência quente na copa acima da altura em que o telhado corta a luz dos lampiões."""
    vis = (P.c.c[:, :, 3] > 0.5) & (cena.YA < 117)
    x, y = cena.XA[vis], cena.YA[vis]
    ganho = np.zeros_like(x)
    for (lx, ly), (raio, peso) in pontos.items():
        dist = ((x - lx) / raio) ** 2 + ((y - ly) / (raio * 0.78)) ** 2
        ganho += np.exp(-dist * 3.2) * peso
    P.c.c[vis, :3] += ganho[:, None] * hexa("#ffca78") * 0.31


def pintar_festao(P: cena.Plano, E: Camada, L, pontos: Pontos, nome: str) -> None:
    """Ramos trançados presos com cravos ao beiral da frente e à empena."""
    c, vidro_aceso = cena.Plano(), Camada()
    verde = pal("#12261d", "#1d3929", "#2b5136", "#3a6943", "#4b8050", "#60955e", "#79a971")
    d = max(0.39, cena.direto(L, (-0.15, 0.85, 0.47)))
    ganho = {"manha": 0.11, "tarde": 0.19, "noite": 0.32}[nome]
    rebotes = []
    tramos = (
        (311, 326, 103, 112, 3.2, (3, 8, 13)),
        (326, 349, 112, 112, 4.3, (5, 10, 16, 21)),
        (349, 374, 112, 112, 5.0, (4, 10, 16, 22)),
        (374, 400, 112, 112, 4.2, (4, 10, 17, 23)),
    )
    for a, b, ya, yb, queda, vidros in tramos:

        def curva(x: int) -> int:
            f = (x - a) / (b - a)
            return round(ya + f * (yb - ya) + math.sin(math.pi * f) * queda)

        for x in range(a, b + 1):
            y = curva(x)
            # Talo grosso encostado na madeira e pontas de pinho em leque.
            c.p(x, y + 2, verde[0], d * 0.75)
            for dy in range(-2, 2):
                base = 3 + (dy < 0) - (dy > 0) * 2
                tom = max(1, min(base + round(h01(x, y + dy, 42) * 2), 6))
                c.p(x, y + dy, verde[tom], d * (1.05 if dy < 0 else 0.75))
            if h01(x, y, 5) > 0.49:
                c.p(x, y - 3, verde[4 + (x % 3 == 0)], d)
            if h01(x, y, 19) > 0.69:
                c.p(x, y + 3, verde[1], d * 0.64)
            if x % 7 in (0, 1):
                c.p(x, y - 2, cena.NEVE[3 + (x % 7 == 0)], d * 0.93, cint=0.2)
        for i, dx in enumerate(vidros):
            x = a + dx
            y = curva(x) + (i % 2 == 0)
            vidro, borda, feixe = (
                ("#ffe0a0", "#a86c31", "#ffc36e"),
                ("#ff8267", "#9f3440", "#ff5e52"),
                ("#aeeac2", "#356950", "#6bd698"),
                ("#ffca84", "#a56538", "#ffb378"),
            )[(i + (a == 349)) % 4]
            c.p(x, y - 1, FERRO[1], d)
            c.p(x - 1, y, borda, d)
            c.p(x, y, vidro, d)
            c.p(x + 1, y, borda, d * 0.79)
            c.p(x, y + 1, borda, d)
            vidro_aceso.p(x, y, vidro, 0.99)
            vidro_aceso.p(x, y + 1, feixe, 0.56)
            pontos[(x, y)] = (11 + (y >= 116) * 5, 0.16 + (y >= 116) * 0.08)
            rebotes.append((x, y, hexa(feixe)))
        c.p(a, ya - 2, FERRO[6], d)
        c.p(a, ya - 1, FERRO[4], d)
    c.p(400, 110, FERRO[5], d)
    # Laços de tecido amarram as junções. As pontas dobram sobre os ramos.
    laco = (".6....5..", "463..565.", ".456564..", "..4563...", "..24.43..", ".43...32.", ".3.....2.")
    for x, y in ((318, 107), (350, 113), (374, 112), (397, 113)):
        for dy, linha in enumerate(laco):
            for dx, tom in enumerate(linha):
                if tom != ".":
                    u, v = x - 4 + dx, y - 3 + dy
                    c.p(u, v, VINHO[int(tom)], d * (1 if dy < 4 else 0.7))
                    vidro_aceso.c[v, u, 3] = 0
    # A cor do vidro rebate primeiro nas folhas, nos pingentes e na tora
    # mais próxima. O cone curto usa apenas superfícies desse plano.
    for x, y, cor in rebotes:
        if vidro_aceso.c[y, x, 3] < 0.7:
            continue
        xa, xb, ya, yb = max(309, x - 6), x + 7, y - 4, y + 8
        yy, xx = np.mgrid[ya:yb, xa:xb]
        dist = np.hypot((xx - x) / 7, (yy - y - 1) / 7.5)
        luz = np.maximum(0, 1 - dist) ** 2 * ganho
        for camada, peso in ((c.c, 1.0), (P.c, 0.83)):
            v = camada.c[ya:yb, xa:xb]
            v[:, :, :3] += (luz * v[:, :, 3] * peso)[:, :, None] * cor
    sombra = np.roll(c.c.c[:, :, 3] > 0.5, 2, axis=0) & (P.c.c[:, :, 3] > 0.8)
    P.c.c[sombra, :3] *= 0.74
    E.c[:, :, 3] *= 1 - c.c.c[:, :, 3]
    E.juntar(vidro_aceso)
    cena.juntar_plano(P, c, None)


def presente(P: cena.Plano, x0: int, y0: int, w: int, h: int, papel: np.ndarray, fita: np.ndarray, L) -> None:
    """A caixa repousa na tábua, com face lateral, papel estampado e fita dobrada."""
    cima = cena.direto(L, (0, 0.3, 1))
    frente = cena.direto(L, (0, 1, 0.2))
    lateral = cena.direto(L, (1, 0.18, 0.1))
    for y in range(y0 + 1, y0 + h):
        for dx in range(w):
            lado = dx >= w - 2
            k = 4 - (y == y0 + h - 1) - 2 * lado
            k -= h01(x0 + dx, y, 73) > 0.78
            c = papel[k]
            if (dx + 2 * y) % 6 == 0 and y % 2 == 0:
                c = papel[min(k + 2, 6)]
            if dx == w // 2 - 1 or y == y0 + h // 2:
                c = fita[(2 if lado else 4) - (y == y0 + h - 1)]
            P.p(x0 + dx, y, c, lateral if lado else frente)
    for dx in range(w):
        P.p(x0 + dx, y0, fita[5] if dx == w // 2 - 1 else papel[5 if dx < w - 2 else 4], cima)
    m = x0 + w // 2 - 1
    for dx, dy, k in ((-2, -1, 2), (-1, -1, 5), (0, -1, 3), (1, -1, 5), (2, -1, 3), (0, 0, 6)):
        P.p(m + dx, y0 + dy, fita[k], cima)


def pintar_carga(P: cena.Plano, E: Camada, L, pontos: Pontos) -> None:
    """Presentes no bordo livre. A alça da lamparina é presa ao último montante."""
    x0, x1, base = cena.TRENO
    carga = cena.Plano()
    presente(carga, x0 + 5, 168, 10, 5, VINHO, LATAO, L)
    presente(carga, x0 + 17, 168, 13, 5, VERDE, LINHO, L)
    # Este pacote sobe à direita da caixa de pouso da coruja.
    presente(carga, 374, 162, 6, 11, VINHO, LINHO, L)
    cima = cena.direto(L, (0.15, 0.4, 1))
    for x in range(x0 + 1, x1 + 1):
        P.p(x, base - 4, LATAO[2] if x % 8 == 0 else VINHO[3], cima * 0.62)
    # Base rebitada, alça e vidro fosco. O núcleo acende o assento e a neve.
    lx, ly = x1 + 3, base - 10
    for dx, dy, tom in ((-1, -3, 1), (0, -4, 4), (1, -3, 2), (-1, -2, 2), (0, -2, 5), (1, -2, 2),
                        (-2, -1, 0), (2, -1, 1), (-2, 0, 2), (2, 0, 3), (-2, 1, 1), (2, 1, 2),
                        (-1, 2, 2), (0, 2, 5), (1, 2, 3), (0, 3, 1)):
        carga.p(lx + dx, ly + dy, FERRO[tom], cima * 0.72)
    for dx, dy, tom in ((-1, 0, 4), (0, -1, 5), (0, 0, 6), (1, 0, 4), (0, 1, 5)):
        carga.p(lx + dx, ly + dy, LATAO[tom], cima)
        E.p(lx + dx, ly + dy, "#fff0b7" if tom == 6 else COR_LUZ, 0.94 if tom == 6 else 0.57)
    pontos[(lx, ly)] = 24, 0.85
    cena.juntar_plano(P, carga, base)


def montar(nome: str) -> Image.Image:
    pontos: Pontos = {}
    emi = Camada()
    objetos_original, treno_original, cabana_original = cena.pintar_objetos, cena.treno, cena.cabana
    luz_original = cena.luz_em_degraus

    def treno(P: cena.Plano, L) -> None:
        treno_original(P, L)
        pintar_carga(P, emi, L, pontos)

    def cabana(P: cena.Plano, E: Camada, periodo: dict, nome: str):
        componentes = cabana_original(P, E, periodo, nome)
        pintar_festao(P, E, periodo["L"], pontos, nome)
        return componentes

    def objetos(nome: str, periodo: dict):
        obj, janelas, lampioes, pingentes = objetos_original(nome, periodo)
        alfa_pinheiro = pintar_pinheiro(obj.P, emi, periodo["L"], pontos)
        obj.E.c[:, :, 3] *= 1 - alfa_pinheiro
        obj.E.juntar(emi)
        visiveis = [(x, y) for x, y in pontos if obj.E.c[y, x, 3] > 0.3]
        return obj, janelas, lampioes + visiveis, pingentes

    def luz(x, y, raio, achatar, seed, degraus=6):
        if (x, y) not in pontos:
            return luz_original(x, y, raio, achatar, seed, degraus)
        meio, forca = pontos[(x, y)]
        return luz_original(x, y, meio, achatar, seed, degraus) * forca

    # Os pontos amarelos usam a mesma luz de lampião da cabana. Cada ponto
    # acrescenta a sua própria queda antes da curva de tom e do bloom.
    with patch.multiple(cena, pintar_objetos=objetos, treno=treno, cabana=cabana, luz_em_degraus=luz):
        return cena.montar(nome)


def main() -> None:
    for nome in sys.argv[1:] or cena.PERIODOS:
        if nome not in cena.PERIODOS:
            raise SystemExit(f"Período desconhecido: {nome}")
        img = montar(nome)
        prefixo = SAIDA / f"cena-neve-natal-{nome}"
        img.save(f"{prefixo}.webp", quality=84, method=6)
        img.resize((960, 400), Image.Resampling.LANCZOS).save(f"{prefixo}-960.webp", quality=84, method=6)


if __name__ == "__main__":
    main()
