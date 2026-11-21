"""Natal no cais: lâmpadas de vidro na viga, coroa na estaca e pinheiro na margem.

As peças entram na grade de 480 × 200 antes da montagem HD-2D do cais. O píer
recebe a luz das lâmpadas e a água recebe seus reflexos na mesma ondulação da
pintura. Uso: python3 scripts/natal/cenario_cais.py [manha tarde noite]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image

from fio_topo import COBRE, SOQUETE, VIDROS
from guirlanda import PINHO, VERMELHO
from hd2d import Camada, h01, tom

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "cenarios"))
import inicio_cais as base  # noqa: E402

VASO = base.pal("#201512", "#38251c", "#543726", "#754b32", "#96653f", "#b78655", "#d2a477")
GELO = base.pal("#334a50", "#476168", "#57767e", "#6e8d97", "#8ca4aa", "#b2c2c4", "#d7dbd3")
AMPARO = (320, 354, 410)
ARVORE = (316, 168)
LUZES_PINHEIRO = ((316, 147, "#ffe1a0", 10, 0.48), (313, 157, "#ffc777", 7, 0.48),
                  (319, 159, "#ff7455", 7, 0.40), (316, 154, "#a9ecbb", 6, 0.36))
LAMPADAS = ((328, 0), (340, 4), (350, 2), (361, 1), (374, 0), (386, 2), (398, 4))


def areas_livres() -> np.ndarray:
    livre = base.XA >= 216
    caixas = list(base.LIVRE.values())
    caixas.extend((p["x"], p["y"], p["x"] + 35, p["y"] + 21) for p in base.PONTOS["gato"])
    caixas.extend((p["x"] - 16, p["y"] - 24, p["x"] + 16, p["y"]) for p in base.PONTOS["coruja"])
    for x0, y0, x1, y1 in caixas:
        livre[y0:y1 + 1, x0:x1 + 1] = False
    return livre


def altura_fio(x: int) -> int:
    primeira = x <= AMPARO[1]
    a, b = AMPARO[:2] if primeira else AMPARO[1:]
    t = (x - a) / (b - a)
    flecha = 1.4 if primeira else 1.8
    return round(116 + flecha * math.sin(math.pi * t) ** 1.3)


def fio_na_viga(c: Camada, e: Camada) -> None:
    for x in range(AMPARO[0], AMPARO[-1] + 1):
        y = altura_fio(x)
        c.p(x, y + 1, COBRE[0], 0.58)
        c.p(x, y, COBRE[3 if x % 4 == 0 else 1])
    for x in AMPARO:
        y = altura_fio(x)
        c.p(x, y - 1, "#aa9b81")
        c.p(x + 1, y, "#403326")
        c.p(x, y, COBRE[4])

    for x, indice in LAMPADAS:
        y = altura_fio(x)
        vidro, _ = VIDROS[indice]
        c.p(x, y + 1, SOQUETE[4])
        c.p(x + 1, y + 1, SOQUETE[2])
        forma = (".ab", "acd", ".b.") if x < 354 else (".ab", "acd", "bcd", ".b.")
        c.bitmap(x - 1, y + 2, forma, dict(zip("abcd", vidro)))
        e.bitmap(x - 1, y + 2, forma, dict(zip("abcd", vidro)), 0.64)
        e.p(x, y + 3, vidro[3], 0.78)


def laco(c: Camada, x: int, y: int) -> None:
    cores = dict(zip("0123456", VERMELHO[1:]))
    c.bitmap(x - 4, y, [
        "65.....54", "451.1.432", ".2345432.", "...343...", "..43042..", ".43...23.",
    ], cores)


def coroa_da_estaca(c: Camada, per: dict) -> None:
    cx, cy = 323, 106
    c.bitmap(320, 96, ["3..", "43.", ".43", "..3"], dict(zip("234", COBRE[2:5])))
    # Cobre trançado sob a coroa: prende no poste que já segura a corda.
    c.linha(321, 98, cx, 101, COBRE[1])
    lx, ly = per["luz"]
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            v = math.hypot(dx / 1.06, dy)
            a = math.atan2(dy, dx)
            grao = h01(dx, dy, 811)
            if 2.7 < v < 5.8 + math.sin(a * 11) * 0.48 + (grao - 0.5) * 1.6:
                claro = (dx * lx + dy * ly) / 8
                volume = 1 - abs(v - 4.3) / 2
                tom_ramo = 0.45 + claro * 0.25 + volume * 0.21 + (grao - 0.5) * 0.26
                c.p(cx + dx, cy + dy, tom(PINHO, tom_ramo))
    # Ramos tangenciais com pontas desfiadas, pinhas secas e frutinhas de azevinho.
    for i in range(14):
        a = math.tau * i / 14
        x = round(cx + 4.8 * math.cos(a))
        y = round(cy + 4.5 * math.sin(a))
        claro = math.cos(a) * lx + math.sin(a) * ly
        for j in range(3):
            tx = x + j * (math.cos(a) * 0.44 - math.sin(a) * 0.85)
            ty = y + j * (math.sin(a) * 0.44 + math.cos(a) * 0.85)
            c.p(round(tx), round(ty), tom(PINHO, 0.53 + claro * 0.25 + j * 0.045))
    c.bitmap(cx - 5, cy - 4, [".5", "42", ".3"], dict(zip("2345", COBRE[2:])))
    c.bitmap(cx + 4, cy + 2, [".5", "42", ".3"], dict(zip("2345", COBRE[2:])))
    for dx, dy in ((-4, 2), (3, -4), (6, -1)):
        c.p(cx + dx - 1, cy + dy, VERMELHO[4])
        c.p(cx + dx, cy + dy, VERMELHO[2])
        c.p(cx + dx - 1, cy + dy - 1, VERMELHO[6])
    laco(c, cx, cy + 3)


def congelar_margem(c: Camada, linha_margem: np.ndarray, livre: np.ndarray) -> None:
    """Crosta descontínua nos seixos e conchas; juncos ficam à frente dela."""
    borda = base.YA - linha_margem[None, :]
    textura = base.ruido_ret(841, 9, 1.4)
    quebrado = base.ruido(842, 2)
    margem_x = base.XA
    trechos = ((margem_x >= 309) & (margem_x < 323)) | ((margem_x >= 354) & (margem_x < 453))
    gelo = trechos & livre & (borda >= -3) & (borda < 2 + textura * 4)
    gelo &= (textura + quebrado * 0.35 > 0.58)
    verso = np.clip(0.55 + (textura - 0.5) * 0.25 + quebrado * 0.28 - borda * 0.07, 0, 1)
    tons = base.pontilhar(verso, len(GELO))
    c.mascara(gelo, GELO[tons], 0.82)
    friso = gelo & (borda <= -1) & (quebrado > 0.48)
    c.mascara(friso, GELO[6], 0.56)
    fissuras = gelo & ((base.XA + 2 * base.YA) % 11 == 0) & (quebrado < 0.48)
    c.mascara(fissuras, GELO[1], 0.55)


def pinheiro_da_margem(c: Camada, e: Camada, luz) -> None:
    """Pinheiro novo num vaso de aduelas, apoiado junto às pedras da margem."""
    x, y = ARVORE
    c.mascara(base.elipse(x, y, 5, 1.5), "#25231a", 0.52)
    for j, largura in enumerate((7, 7, 5, 5, 5)):
        for i in range(-(largura // 2), largura // 2 + 1):
            veios = h01(i, j, 851)
            face = 0.52 + i * luz[0] * 0.11 + (veios - 0.5) * 0.22
            aro = 0.27 if j in (1, 4) else 0
            c.p(x + i, y - 5 + j, tom(VASO, face - aro))
    c.ret(x - 2, y - 6, 5, 1, VASO[0])
    c.p(x, y - 7, VASO[4])
    c.p(x, y - 6, VASO[3])
    c.p(x - 2, y - 5, VASO[6])
    c.p(x - 3, y - 4, VASO[5])
    c.p(x + 2, y - 2, VASO[2])

    # As pontas se desencontram a cada saia e a neve agarra nas quinas voltadas para cima.
    for k, (topo, ponta, raio) in enumerate(((148, 154, 2.6), (151, 158, 4.1), (155, 163, 6))):
        for dy in range(topo, ponta + 1):
            v = (dy - topo) / (ponta - topo)
            for dx in range(-int(raio * v ** 0.78), int(raio * v ** 0.78) + 1):
                grao = h01(dx, dy, k)
                if dy == ponta and dx and grao < 0.36:
                    continue
                corte = 0.60 + dx * luz[0] * 0.045 - v * 0.20 + (grao - 0.5) * 0.35
                c.p(x + dx, dy, tom(PINHO, corte))
                if abs(dx) >= 2 and grao > 0.80 and v < 0.91:
                    c.p(x + dx, dy, GELO[4 + int(grao > 0.94)], 0.78)
    for xi, yi, cor, _, _ in LUZES_PINHEIRO[1:]:
        c.p(xi, yi - 1, VASO[5])
        c.p(xi, yi, cor)
        e.p(xi, yi, cor, 0.72)
    dourado = {"1": "#9c6a31", "2": "#dcb05a", "3": "#ffe7ae"}
    c.bitmap(x - 2, 144, ("..2..", ".232.", "23332", ".121.", ".1.1."), dourado)
    e.bitmap(x - 2, 144, (".....", "..a..", ".aba.", "..a.."), {"a": "#ffd78c", "b": "#fff2ca"}, 0.55)
    e.p(x, 146, "#fff2ca", 0.58)


def reflexos_de_natal(nome: str, img: np.ndarray, agua: np.ndarray, ondas: np.ndarray, livre: np.ndarray) -> np.ndarray:
    # Cristas partidas acompanham o deslocamento inteiro de cada linha de água.
    y0 = base.CAIS_AGUA
    onda = base.ruido_ret(886, 5, 1)
    agua_livre = agua & base.ampliar(livre[:, :, None])[:, :, 0]
    profundidade = np.clip(base.YA - y0, 0, None)
    ganho = {"manha": 0.09, "tarde": 0.27, "noite": 0.51}[nome]
    for i, (x, indice) in enumerate(LAMPADAS):
        cor = base.hexa(VIDROS[indice][1])
        y = altura_fio(x) + 3
        espelho = 2 * y0 - y
        centro = x + ondas + np.sin(base.YA * 1.3 + i) * 1.15
        lateral = np.clip(1 - abs(base.XA - centro) / (2.1 + profundidade * 0.105), 0, 1) ** 1.35
        queda = np.exp(-((base.YA - espelho) / 6.5) ** 2)
        ondas_curtas = (onda > 0.42) & ((base.YA + i) % 3 != 0)
        risco = lateral * queda * (0.12 + ondas_curtas * (0.35 + onda * 0.45))
        risco = base.ampliar(risco[:, :, None]) * agua_livre[:, :, None]
        img += (risco + base.desfocar(risco, 4) * 0.36 * agua_livre[:, :, None]) * cor * ganho
    return img


def montar(nome: str) -> Image.Image:
    livre = areas_livres()
    pintar_cais = base.pintar_cais
    pintar_objetos = base.pintar_margem_obj
    pintar_chao = base.pintar_chao
    reflexo_objetos = base.reflexo_objetos

    def cais_com_natal(periodo: str, per: dict) -> base.Grupo:
        o = pintar_cais(periodo, per)
        c, e = Camada(), Camada()
        coroa_da_estaca(c, per)
        c.bitmap(416, 100, ["54.", "43.", "43."], dict(zip("345", VERMELHO[3:6])))
        laco(c, 417, 102)
        fio_na_viga(c, e)
        c.c[~livre] = 0
        e.c[~livre] = 0
        o.cam.juntar(c)
        o.emissivo.juntar(e)
        o.base[c.c[:, :, 3] > 0.4] = base.CAIS_AGUA
        return o

    def objetos_com_luz(periodo: str, per: dict, margem: np.ndarray) -> base.Grupo:
        o = pintar_objetos(periodo, per, margem)
        o.add(ARVORE[1], pinheiro_da_margem, o.emissivo, per["luz"])
        o.luzes.extend(LUZES_PINHEIRO)
        # As luzes entram na soma da madeira, separadas do reflexo âmbar dos lampiões.
        for x, indice in LAMPADAS:
            o.luzes.append((x, altura_fio(x) + 3, VIDROS[indice][1], 13, 0.41))
        return o

    def chao_com_gelo(periodo: str, per: dict, margem: np.ndarray, agua: np.ndarray) -> Camada:
        c = pintar_chao(periodo, per, margem, agua)
        congelar_margem(c, margem, livre)
        return c

    def reflexo_com_natal(img, alfa, linha, agua, ondas, tint, intensidade):
        img = reflexo_objetos(img, alfa, linha, agua, ondas, tint, intensidade)
        return reflexos_de_natal(nome, img, agua, ondas, livre)

    # O módulo original só expõe a montagem completa. Valem estes pincéis durante uma única renderização.
    with (
        patch.object(base, "pintar_cais", cais_com_natal),
        patch.object(base, "pintar_margem_obj", objetos_com_luz),
        patch.object(base, "pintar_chao", chao_com_gelo),
        patch.object(base, "reflexo_objetos", reflexo_com_natal),
    ):
        return base.montar(nome)


def main() -> None:
    nomes = sys.argv[1:] or base.PERIODOS
    for nome in nomes:
        img = montar(nome)
        caminho = base.PASTA / f"cena-cais-natal-{nome}"
        img.save(caminho.with_suffix(".webp"), quality=84, method=6)
        img.resize((960, 400), Image.Resampling.LANCZOS).save(f"{caminho}-960.webp", quality=82, method=6)


if __name__ == "__main__":
    main()
