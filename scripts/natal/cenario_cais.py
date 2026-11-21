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
from guirlanda import OURO, PINHO, VERMELHO
from hd2d import Camada, h01, tom

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "cenarios"))
import inicio_cais as base  # noqa: E402

VASO = base.pal("#201512", "#38251c", "#543726", "#754b32", "#96653f", "#b78655", "#d2a477")
GELO = base.pal("#334a50", "#476168", "#57767e", "#6e8d97", "#8ca4aa", "#b2c2c4", "#d7dbd3")
AMPARO = (320, 354, 410)
ARVORE = (316, 165)
ESTRELA = (314, 132)
LUZES_PINHEIRO = ((314, 132, "#ffe1a0", 12, 0.62), (312, 142, "#ffd182", 7, 0.46),
                  (315, 147, "#ff8155", 8, 0.40), (318, 152, "#ffd595", 8, 0.48),
                  (312, 155, "#9edfc4", 8, 0.52), (320, 159, "#ff785b", 8, 0.40),
                  (314, 159, "#ffd595", 8, 0.50))
LUZ_FESTAO = (381, 103, "#ffc580", 9, 0.48)
LUZES_BARCO = ((320, 147, "#ffc477", 6, 0.38), (323, 148, "#ff7457", 6, 0.33))
LAMPADAS = ((328, 0), (340, 4), (350, 2), (361, 1), (374, 0), (386, 2), (398, 4))


def areas_livres() -> np.ndarray:
    livre = base.XA >= 216
    caixas = list(base.LIVRE.values())
    # Arredondamento para fora: o gato sobe 4,5 px e a coruja tem 33 px centrados nos pés.
    caixas.extend((p["x"], p["y"] - 5, p["x"] + 35, p["y"] + 22) for p in base.PONTOS["gato"])
    caixas.extend((p["x"] - 17, p["y"] - 24, p["x"] + 16, p["y"]) for p in base.PONTOS["coruja"])
    for x0, y0, x1, y1 in caixas:
        livre[y0:y1 + 1, x0:x1 + 1] = False
    return livre


def altura_fio(x: int) -> int:
    if x < AMPARO[1]:
        return 115  # Trecho esticado no alto da viga, entre as duas caixas do gato.
    a, b = AMPARO[1:]
    t = (x - a) / (b - a)
    return round(116 + 1.8 * math.sin(math.pi * t) ** 1.3)


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
        if x < AMPARO[1]:
            c.p(x, y, SOQUETE[4])
            c.p(x - 1, y + 1, vidro[1])
            c.p(x, y + 1, vidro[3])
            c.p(x + 1, y + 1, vidro[0])
            e.p(x, y + 1, vidro[3], 0.82)
            continue
        c.p(x, y + 1, SOQUETE[4])
        c.p(x + 1, y + 1, SOQUETE[2])
        forma = (".ab", "acd", "bcd", ".b.")
        c.bitmap(x - 1, y + 2, forma, dict(zip("abcd", vidro)))
        e.bitmap(x - 1, y + 2, forma, dict(zip("abcd", vidro)), 0.64)
        e.p(x, y + 3, vidro[3], 0.78)


def luzes_da_viga() -> list[tuple[int, int, str, int, float]]:
    return [
        (x, altura_fio(x) + (1 if x < AMPARO[1] else 3), VIDROS[indice][1], 13, 0.41)
        for x, indice in LAMPADAS
    ]


def fio_na_proa(c: Camada, e: Camada) -> None:
    """O cordão segue o costado da proa, entre dois cabeços da amurada."""
    c.linha(317, 145, 321, 146, COBRE[2])
    c.linha(321, 146, 324, 146, COBRE[1])
    c.p(317, 145, COBRE[5])
    c.p(324, 146, COBRE[4])
    for x, y, cor, _, _ in LUZES_BARCO:
        luz = base.hexa(cor)
        c.p(x, y - 1, SOQUETE[3])
        c.p(x + 1, y, luz * 0.50)
        c.p(x, y, luz * 0.84)
        e.p(x, y, luz, 0.72)


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


def festao_do_corrimao(c: Camada, e: Camada, luz) -> None:
    """Ramo com bagas amarrado à corda, com a rede de pesca por trás."""
    esquerda, direita = 369, 394
    for x in range(esquerda, direita + 1):
        t = (x - esquerda) / (direita - esquerda)
        yy = round(99 + 5 * math.sin(math.pi * t))
        c.ret(x, yy, 1, 3, PINHO[1])
        c.p(x, yy + 1, tom(PINHO, 0.63 + (h01(x, 891) - 0.5) * 0.18))
        if x % 3 == 0:
            dx = -1 if x < 381 else 1
            c.p(x + dx, yy - 1, tom(PINHO, 0.78 - luz[0] * 0.10))
            c.p(x - dx, yy + 3, tom(PINHO, 0.45))
        if x in (373, 389):
            c.p(x, yy + 2, VERMELHO[4])
            c.p(x - 1, yy + 1, VERMELHO[6])
            c.p(x + 1, yy + 2, VERMELHO[2])
        if x in (371, 381, 391):
            c.p(x, yy - 1, GELO[4])
            c.p(x + 1, yy, GELO[5])
    c.ret(esquerda, 98, 1, 3, COBRE[4])
    c.ret(direita, 98, 1, 3, COBRE[4])
    laco(c, 382, 102)
    x, y, cor, _, _ = LUZ_FESTAO
    c.p(x, y - 1, SOQUETE[4])
    c.p(x - 1, y, OURO[4])
    c.p(x, y, cor)
    e.p(x, y, cor, 0.78)


def congelar_margem(c: Camada, linha_margem: np.ndarray, livre: np.ndarray) -> None:
    """Crosta descontínua nos seixos e conchas; juncos ficam à frente dela."""
    borda = base.YA - linha_margem[None, :]
    textura = base.ruido_ret(841, 9, 1.4)
    quebrado = base.ruido(842, 2)
    trechos = (base.XA >= 309) & (base.XA < 453)
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

    # Cinco saias de galhos, com o tronco inclinado na direção do lago.
    galhos = ((314, 134, 143, 2.6), (314, 139, 148, 4.2), (315, 144, 153, 5.4),
              (315, 149, 158, 6.4), (316, 152, 161, 7.1))
    for k, (centro, topo, ponta, raio) in enumerate(galhos):
        for yy in range(topo, ponta + 1):
            v = (yy - topo) / (ponta - topo)
            meia = int(raio * v ** 0.73)
            for dx in range(-meia, meia + 1):
                grao = h01(dx, yy, k)
                if yy == ponta and dx and grao < 0.42:
                    continue
                corte = 0.59 + dx * luz[0] * 0.038 - v * 0.22 + (grao - 0.5) * 0.35
                c.p(centro + dx, yy, tom(PINHO, corte))
                quina = abs(dx) >= max(1, meia - 1)
                if quina and grao > 0.62 and 0.42 < v < 0.93:
                    c.p(centro + dx, yy, GELO[4 + int(grao > 0.83)], 0.76)
    # Fio que retorna por trás da copa e enfeites de vidro entre as agulhas.
    for faixa in (((312, 141), (315, 146)), ((310, 150), (320, 153)), ((310, 157), (322, 161))):
        c.linha(*faixa[0], *faixa[1], "#b79d66", 0.50)
    vidro = dict(zip("1234", VERMELHO[3:7]))
    for bx, by in ((314, 138), (310, 151), (318, 156), (312, 158)):
        c.p(bx, by - 1, OURO[4])
        c.bitmap(bx - 1, by, (".4.", "432", ".1."), vidro)
    for xi, yi, cor, _, _ in LUZES_PINHEIRO[1:]:
        c.p(xi, yi - 1, VASO[5])
        c.p(xi, yi, cor)
        e.p(xi, yi, cor, 0.76)

    # Estrela de latão facetado: borda fria por fora, filamento por dentro.
    ex, ey = ESTRELA
    dourado = dict(zip("123456", OURO[2:]))
    c.bitmap(ex - 3, ey - 3, ("...3...", "...4...", "3456543", ".45654.", "..434..", ".32.23."), dourado)
    e.bitmap(ex - 3, ey - 3, (".......", "...a...", "..aba..", "...a..."), {"a": "#ffcd79", "b": "#fff2ca"}, 0.61)


def pacote(c: Camada, x: int, y: int, w: int, h: int, papel: np.ndarray, fita: np.ndarray, luz) -> None:
    """Papel estampado, dobra da tampa e fita embolada no nó."""
    c.mascara(base.elipse(x + (w - 1) / 2, y + h, (w + 2) / 2, 1.45), "#251a14", 0.68)
    papel = papel * 0.84
    fita = fita * 0.76
    for yy in range(h):
        for xx in range(w):
            quina = xx == w - 1 or yy == h - 1
            luz_do_lado = (xx - w / 2) * luz[0] * 0.047
            padrao = ((xx + yy) % 4 == 0) * 0.14
            v = 0.56 + luz_do_lado + padrao - quina * 0.24 + (h01(x + xx, y + yy, 873) - 0.5) * 0.12
            c.p(x + xx, y + yy, tom(papel, v))
    c.ret(x + 1, y - 2, w - 1, 2, papel[-3])
    c.p(x, y - 1, papel[-1])
    c.ret(x + w - 2, y - 1, 2, 2, papel[2])
    c.ret(x, y + 1, w, 1, papel[1], 0.65)
    m = x + w // 2
    c.ret(m, y - 2, 2, h + 2, fita[3])
    c.ret(x, y + h // 2, w, 1, fita[4])
    c.ret(m, y - 2, 1, h + 1, fita[5])
    c.bitmap(m - 2, y - 5, ("5.4.4", "35.53", ".353."), dict(zip("345", fita[3:6])))


def reflexos_de_natal(nome: str, img: np.ndarray, agua: np.ndarray, ondas: np.ndarray, livre: np.ndarray) -> np.ndarray:
    # Cristas partidas acompanham o deslocamento inteiro de cada linha de água.
    y0 = base.CAIS_AGUA
    onda = base.ruido_ret(886, 5, 1)
    agua_livre = agua & base.ampliar(livre[:, :, None])[:, :, 0]
    profundidade = np.clip(base.YA - y0, 0, None)
    ganho = {"manha": 0.10, "tarde": 0.29, "noite": 0.52}[nome]
    cais = (*luzes_da_viga(), LUZ_FESTAO)
    for i, (x, y, cor, _, _) in enumerate((*cais, *LUZES_BARCO)):
        proa = i >= len(cais)
        linha = base.BARCO[2] if proa else y0
        cor_rgb = base.hexa(cor)
        espelho = 2 * linha - y
        centro = x + ondas + np.sin(base.YA * 1.3 + i) * 1.15
        lateral = np.clip(1 - abs(base.XA - centro) / (2.1 + profundidade * 0.105), 0, 1) ** 1.35
        alcance = 3.4 if proa else 6.5
        queda = np.exp(-((base.YA - espelho) / alcance) ** 2) * (base.YA > linha)
        ondas_curtas = (onda > 0.42) & ((base.YA + i) % 3 != 0)
        risco = lateral * queda * (0.12 + ondas_curtas * (0.35 + onda * 0.45))
        risco = base.ampliar(risco[:, :, None]) * agua_livre[:, :, None]
        img += (risco + base.desfocar(risco, 4) * 0.36 * agua_livre[:, :, None]) * cor_rgb * ganho
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
        festao_do_corrimao(c, e, per["luz"])
        c.bitmap(416, 100, ["54.", "43.", "43."], dict(zip("345", VERMELHO[3:6])))
        laco(c, 417, 102)
        fio_na_viga(c, e)
        c.c[~livre] = 0
        e.c[~livre] = 0
        o.cam.juntar(c)
        o.emissivo.juntar(e)
        o.base[c.c[:, :, 3] > 0.4] = base.CAIS_AGUA
        o.add(base.BARCO[2], fio_na_proa, o.emissivo)
        return o

    def objetos_com_luz(periodo: str, per: dict, margem: np.ndarray) -> base.Grupo:
        o = pintar_objetos(periodo, per, margem)
        o.add(ARVORE[1], pinheiro_da_margem, o.emissivo, per["luz"])
        o.add(165, pacote, 319, 161, 6, 4, OURO, VERMELHO, per["luz"])
        o.add(172, pacote, 327, 166, 10, 6, VERMELHO, OURO, per["luz"])
        o.luzes.extend(LUZES_PINHEIRO)
        # As luzes entram na soma da madeira, separadas do reflexo âmbar dos lampiões.
        o.luzes.extend(luzes_da_viga())
        o.luzes.append(LUZ_FESTAO)
        o.luzes.extend(LUZES_BARCO)
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
