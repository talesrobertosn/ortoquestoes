"""Observatório de Natal, na grade e na montagem do terraço original.

A estrela de latão fica na cúpula da torre distante. Na frente, gelo fino nas
ameias, um fio preso à alvenaria e cetim amarrado ao tubo da luneta.
Uso: python3 scripts/natal/cenario_observatorio.py [manha tarde noite]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image

from hd2d import Camada, h01, hexa, pal
from cenarios import inicio_observatorio as cena
from gerar_cena_inicio import poli

SAIDA = Path(__file__).resolve().parents[2] / "public" / "pixel" / "inicio"
PINHO = pal("#101e15", "#1b3123", "#295039", "#386647", "#4a7c54", "#699968", "#8ab57f")
NEVE = pal("#4b6474", "#647d8a", "#829aa7", "#a3bbc6", "#becfd4", "#d6e2e4", "#e8eef0")
CETIM = pal("#210a16", "#3d1021", "#621728", "#832033", "#a63042", "#c64b59", "#e07577")
COBRE = pal("#191a16", "#35332a", "#584838", "#847052", "#ac875d", "#c8a479")
ESTRELA = ("#402515", "#694020", "#935a29", "#be803a", "#d8a653", "#f6cb76", "#ffe3a8")
VIDROS = (
    (("#724322", "#bd833d", "#855332", "#f4bb6c", "#ffe9bc"), "#ffc681"),
    (("#622734", "#a95854", "#72303c", "#df776b", "#fac1aa"), "#ff776c"),
    (("#29504a", "#538174", "#325c55", "#81b7a3", "#caf0c9"), "#9de5c0"),
)
FORCA = {"manha": 0.24, "tarde": 0.53, "noite": 0.94}
PONTAS_ESTRELA = (
    (0, -7), (1.6, -2.2), (6.6, -2.2), (2.7, 1.1), (4.3, 5.6),
    (0, 2.8), (-4.3, 5.6), (-2.7, 1.1), (-6.6, -2.2), (-1.6, -2.2),
)


def pintar_estrela(torres: Camada, emis: Camada, nome: str) -> None:
    """A armação usa o pino da cúpula. A luz incide no cobre logo abaixo."""
    cx, cy = 353, 38
    # Só o telhado existente recebe a luz. O gradiente cruza as chapas e
    # acompanha a incidência no topo curvo, deixando a junta em sombra.
    y, x = np.mgrid[43:51, 349:357].astype(np.float32)
    telhado = torres.c[43:51, 349:357]
    dist = np.hypot(x - cx, (y - cy) * 0.9)
    atenuacao = np.maximum(0, 1 - dist / 14) ** 2
    incidencia = 0.85 - 0.09 * np.abs(x - cx) - 0.1 * (x == cx)
    grau = atenuacao * incidencia * telhado[:, :, 3] * FORCA[nome]
    telhado[:, :, :3] += grau[:, :, None] * hexa("#ffba65") * 2.45
    torres.ret(cx, 40, 1, 6, COBRE[1])
    torres.p(cx - 1, 43, COBRE[1])
    torres.p(cx, 43, COBRE[5])
    torres.p(cx, 44, COBRE[4])
    # Cinco painéis de vidro mel com dois planos por ponta. A crista de
    # latão faz sombra nas juntas e mantém as cinco pontas legíveis de dia.
    p = np.array([(cx + dx, cy + dy) for dx, dy in PONTAS_ESTRELA])
    torres.mascara(poli(p), ESTRELA[0])
    for i in range(len(p)):
        j = (i + 1) % len(p)
        a = (1 - 0.17) * p[i] + np.array([cx, cy]) * 0.17
        b = (1 - 0.17) * p[j] + np.array([cx, cy]) * 0.17
        facet = poli(((cx, cy), a, b))
        cor = (4, 3, 6, 2, 5, 3, 5, 2, 6, 4)[i]
        torres.mascara(facet, ESTRELA[cor])
        emis.mascara(facet, "#ffd894" if i in (2, 5, 8) else "#f4b562",
                      FORCA[nome] * (0.27 if i in (3, 7) else 0.54))
    torres.p(cx, cy, ESTRELA[6])
    emis.p(cx, cy, "#fff0c8", FORCA[nome] * 0.84)



def pintar_neve(muro: Camada, topos: np.ndarray) -> None:
    """Cristais no topo das ameias e pequenos acúmulos nas juntas inferiores."""
    for cx in (344, 368, 392, 416, 440):
        for x in range(cx - 6, cx + 8):
            # A neve assenta atrás da aresta e dobra sobre as quinas gastas.
            relevo = h01(x // 3, cx, 11)
            topo = cena.AMEIA_TOPO - (1 if relevo > 0.34 else 0)
            fundo = cena.AMEIA_TOPO + 1 + (h01(x, cx, 4) > 0.73)
            if relevo < 0.16 and h01(x, cx, 5) < 0.58:
                continue
            for y in range(topo, fundo + 1):
                dobro = y == fundo
                tom = 2 + int(h01(x, y, 3) * 3)
                if dobro:
                    tom -= 2 if x >= cx + 2 else 1
                elif y == topo:
                    tom += 2
                muro.p(x, y, NEVE[min(tom, 6)])
                topos[y, x] = not dobro
    for a, b, centro in ((312, 326, 315), (328, 336, 332), (346, 361, 356), (375, 390, 382), (400, 414, 406), (424, 446, 437)):
        for x in range(a, b):
            # A borda se rompe perto das juntas; a face baixa guarda gelo azul.
            if h01(x, a, 5) < 0.26:
                continue
            alto = abs(x - centro) < 3 and h01(x, a, 9) > 0.38
            for y in range(cena.CAPA - alto, cena.CAPA + 2):
                tom = 3 + int(h01(x, y, 3) * 3) - (2 if y > cena.CAPA else 0)
                muro.p(x, y, NEVE[min(tom, 6)])
                topos[y, x] = True
            if h01(x, a, 8) > 0.87:
                muro.p(x, cena.CAPA + 2, NEVE[1])
    for x in range(452, cena.W):
        altura = 1 + (h01(x // 4, 61, 2) > 0.53)
        for y in range(61 - altura, 62):
            tom = 2 + int(h01(x, y, 6) * 3) + (2 if y < 61 else 0)
            muro.p(x, y, NEVE[min(tom, 6)])
            topos[y, x] = True


def pintar_ramo(muro: Camada) -> None:
    """Pinho atado à mísula baixa. Os raminhos seguem a curva do galho."""
    c = Camada()
    # Dois galhos unidos pelo nó no centro, com agulhas curtas, sobrepostas
    # em leque. As folhas azuladas são os brotos nas pontas mais expostas.
    for lado in (-1, 1):
        for i in range(15):
            x = 328 + lado * i
            y = 134 - i * (0.24 if lado < 0 else 0.55)
            meia = max(0.0, (1 - i / 14) * 2.8)
            for dy in range(-math.floor(meia), math.ceil(meia) + 1):
                tom = 2 + (dy < 0) * 2 - (dy > 1) + (h01(x, dy, 4) > 0.58)
                c.p(x, y + dy, PINHO[tom])
            c.p(x, y + 1, COBRE[1] if i % 3 == 0 else PINHO[2])
            if i in (0, 14):
                continue
            for j in (-1, 0, 1):
                comprimento = 1.4 + 3.1 * h01(lado, i, j, 8)
                comprimento *= 1 - 0.56 * i / 15
                for passo in range(1, math.ceil(comprimento) + 1):
                    yy = y + passo * (j - (lado == 1) * 0.34)
                    xx = x + lado * passo * (0.48 + 0.2 * (j == 0))
                    tom = min(6, 2 + (j != 1) + (passo > 1)
                              + int(h01(lado, i, j, passo) * 2.5))
                    c.p(xx, yy, PINHO[tom])
    # Sombra curta das agulhas na pedra e dois pontos de amarração.
    sombra = np.roll(c.c[:, :, 3] > 0.5, 1, axis=0) & (muro.c[:, :, 3] > 0.9)
    muro.c[sombra, :3] *= 0.78
    for x, y in ((315, 129), (339, 127)):
        c.p(x, y, COBRE[5])
        c.p(x, y + 1, COBRE[2])
    c.bitmap(322, 131, (
        "45.....453..", "356...4643..", ".456.5634...", "..345631....",
        "...456543...", "....465.43..", "...453...43.", "...43.....3.",
        "..345.......", "..4.........",
    ), {str(i): cor for i, cor in enumerate(CETIM)})
    # Frutos pequenos, mais escuros que o cetim, no espaço entre os ramos.
    for x, y in ((317, 132), (320, 133), (335, 133), (340, 128)):
        c.p(x, y, CETIM[6])
        c.p(x + 1, y, CETIM[4])
        c.p(x, y + 1, CETIM[2])
    muro.juntar(c)


def pintar_fio(muro: Camada, emis: Camada, luzes: list) -> None:
    """O cobre trançado cruza as seteiras e para em cravos na face das ameias."""
    tramos = (
        (313, 344, 128, 111, 7.0, ((7, 1), (16, 0), (23, 2))),
        (344, 368, 111, 111, 7.0, ((6, 0), (17, 2))),
        (368, 392, 111, 111, 8.5, ((6, 1), (17, 0))),
        (392, 416, 111, 111, 7.5, ((6, 2), (17, 1))),
        (416, 440, 111, 111, 8.0, ((6, 0), (17, 2))),
    )
    for a, b, ya, yb, queda, lampadas in tramos:

        def curvatura(x: int) -> int:
            t = (x - a) / (b - a)
            return round(ya + (yb - ya) * t + queda * math.sin(math.pi * t))

        for x in range(a, b):
            y = curvatura(x)
            muro.p(x, y, COBRE[2] if x % 4 == 0 else COBRE[0])
            if x % 4 in (0, 1):
                muro.p(x, y - 1, COBRE[3], 0.64)
            if x - a in (4, 5, 6) or b - x in (4, 5, 6):
                muro.p(x, y + 1, "#1b1618", 0.42)
        for pos, cor in lampadas:
            x = a + pos
            y = curvatura(x) + 1
            vidro, luz = VIDROS[cor]
            muro.p(x, y, COBRE[0])
            muro.p(x, y + 1, COBRE[3])
            muro.p(x - 1, y + 2, vidro[0])
            muro.p(x, y + 2, vidro[4])
            muro.p(x + 1, y + 2, vidro[2])
            if a == 313:  # vidro de dupla faceta no trecho mais próximo
                muro.p(x - 1, y + 3, vidro[1])
                muro.p(x + 1, y + 3, vidro[2])
            muro.p(x, y + 3, vidro[3])
            muro.p(x, y + 4, vidro[1])
            emis.p(x, y + 2, vidro[4], 0.9)
            emis.p(x, y + 3, vidro[3], 0.66)
            luzes.append((x, y + 2.5, luz, 14, 0.59))
    for x, y in ((313, 128), (344, 111), (368, 111), (392, 111), (416, 111), (440, 111)):
        muro.p(x, y - 1, COBRE[4])
        muro.p(x, y, COBRE[2])
        muro.p(x + 1, y, COBRE[0])


def pintar_laco(obj: cena.Objetos) -> None:
    """A fita abraça o cilindro, com duas alças vincadas e pontas soltas."""
    x, y = 364, 107
    # As duas bordas da volta cruzam a diagonal do tubo e herdam a
    # curvatura dele. A sombra de contato cobre só os pixels do tubo.
    u, v = cena.XA - x, cena.YA - y
    axial, radial = 0.79 * u + 0.62 * v, 0.62 * u - 0.79 * v
    sombra = (np.abs(axial) < 3.8) & (np.abs(radial) < 4.5) & (obj.cam.c[:, :, 3] > 0.95)
    obj.cam.c[sombra, :3] *= 0.62
    obj.cam.mascara(sombra & (np.abs(axial) < 2.6), CETIM[2])
    obj.cam.mascara(sombra & (np.abs(axial) < 1.8) & (radial > -0.7), CETIM[4])
    obj.cam.mascara(sombra & (np.abs(axial) < 1.3) & (radial > 2), CETIM[5])
    obj.metal[sombra] *= 0.1

    c = Camada()
    partes = (
        # Pontas com a boca em V, em planos diferentes.
        ([(-1, -1), (2, 1), (-1, 6), (-1, 10), (-3, 8), (-6, 9), (-4, 4)], 2.9, 1),
        ([(1, 0), (4, 0), (6, 4), (9, 8), (6, 7), (5, 10), (3, 6)], 2.2, -1),
        ([(-1, 0), (-5, 1), (-8, -1), (-9, -5), (-7, -6), (-4, -5), (0, -2)], 3.7, 1),
        ([(0, -1), (4, -5), (7, -6), (9, -4), (8, 0), (5, 2), (2, 1)], 4.0, -1),
        ([(-2, -2), (1, -3), (3, -1), (2, 2), (-1, 2), (-2, 1)], 4.7, 1),
    )
    for pontos, meio, sinal in partes:
        m = poli([(x + dx, y + dy) for dx, dy in pontos])
        vinco = np.sin((u * 0.29 + v * 0.82) * sinal + 0.8)
        borda_inf = m & ~np.roll(m, -1, axis=0)
        borda_sup = m & ~np.roll(m, 1, axis=0)
        pano = meio + vinco * 1.2 - borda_inf * 1.7 + borda_sup * 0.7 + cena.BAYER_HW * 0.42
        c.mascara(m, CETIM[np.clip(pano.astype(int), 0, 6)])
    # Uma linha de ponto dourado acompanha o corte das pontas do cetim.
    for dx, dy, tom in ((-6, 8, 2), (-3, 8, 3), (-1, 9, 3), (4, 8, 2), (5, 9, 3), (7, 7, 4)):
        c.p(x + dx, y + dy, cena.LATAO[tom], 0.72)
    obj.cam.juntar(c)
    tecido = c.c[:, :, 3] > 0.5
    obj.base[tecido] = 168  # o mesmo apoio e as mesmas sombras da luneta
    obj.metal[tecido] = 0
    obj.fogo[tecido] = 1


def montar(nome: str) -> Image.Image:
    emis = Camada()
    luzes: list[tuple[float, float, str, float, float]] = []
    ceu_original, distantes_original = cena.pintar_ceu, cena.pintar_distantes
    muro_original, objetos_original = cena.pintar_parapeito, cena.pintar_objetos

    def ceu(nome: str, periodo: dict):
        albedo, estrelas = ceu_original(nome, periodo)
        if nome == "noite":
            # Uns poucos grãos frios nas regiões menos densas, entre a lua e
            # a margem e longe do bloco de texto.
            for x, y in ((371, 15), (379, 57), (401, 68), (412, 16), (424, 30), (443, 14), (454, 57)):
                albedo[y, x] += hexa("#c3d7f0") * (0.3 + h01(x, y, 9) * 0.26)
        return albedo, estrelas

    def distantes(nome: str, periodo: dict):
        torres, janelas = distantes_original(nome, periodo)
        pintar_estrela(torres, emis, nome)
        return torres, janelas

    def parapeito(nome: str, periodo: dict):
        muro, topos = muro_original(nome, periodo)
        pintar_neve(muro, topos)
        pintar_ramo(muro)
        pintar_fio(muro, emis, luzes)
        return muro, topos

    def objetos(nome: str, periodo: dict):
        obj = objetos_original(nome, periodo)
        pintar_laco(obj)
        # A luneta passa na frente do cordão. Suprime vidro e luz quando
        # o tubo oculta a lâmpada no ponto de vista do terraço.
        emis.c[:, :, 3] *= 1 - obj.cam.c[:, :, 3]
        obj.emissivo.juntar(emis)
        obj.luzes.extend(
            (x, y, cor, raio, k)
            for x, y, cor, raio, k in luzes
            if obj.cam.c[int(y), int(x), 3] < 0.8
        )
        return obj

    # As substituições duram só esta renderização. A montagem original
    # continua responsável pela câmera, pela luz da hora e pelo acabamento.
    with patch.multiple(cena, pintar_ceu=ceu, pintar_distantes=distantes,
                        pintar_parapeito=parapeito, pintar_objetos=objetos):
        return cena.montar(nome)


def main() -> None:
    for nome in sys.argv[1:] or cena.PERIODOS:
        if nome not in cena.PERIODOS:
            raise SystemExit(f"Período desconhecido: {nome}")
        img = montar(nome)
        prefixo = SAIDA / f"cena-observatorio-natal-{nome}"
        img.save(f"{prefixo}.webp", quality=84, method=6)
        img.resize((960, 400), Image.Resampling.LANCZOS).save(f"{prefixo}-960.webp", quality=82, method=6)


if __name__ == "__main__":
    main()
