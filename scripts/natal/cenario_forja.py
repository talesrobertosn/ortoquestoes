#!/usr/bin/env python3
"""Pintura de Natal da Forja, na grade de 480 × 200 do cenário original.

A coroa fica presa à cinta da chaminé, o cordão segue a viga e as brasas
iluminam os embrulhos assentados nas lajes. Uso: python3 scripts/natal/cenario_forja.py
"""
from __future__ import annotations

import math
from types import FunctionType

import numpy as np
from PIL import Image

from hd2d import Camada, hexa, luz_pontual, pal
from cenarios import inicio_forja as forja

X, Y = forja.XA, forja.YA
Luz = tuple[int, int, str, float, float]
PINHO = pal("#15281d", "#274630", "#365b40", "#507749", "#668e5a", "#82a66e", "#a1ba7a")
VINHO = pal("#2c0e18", "#471723", "#68202a", "#9a303a", "#be454d", "#e16d6c", "#ef9382")
FITA = pal("#261a0f", "#3b2b1b", "#584228", "#755839", "#876942", "#9a7b4e", "#b69860")
PAPEL_VERDE = pal("#0d2426", "#142f33", "#1a4146", "#24555a", "#346765", "#477870", "#638e80")
PAPEL_VINHO = pal("#271315", "#381c1f", "#522830", "#6d343a", "#85444a", "#a75b5c", "#bb746a")
FERRO = pal("#16191d", "#2c3038", "#434956", "#606776", "#7d8798", "#9ba8b6", "#c7ced1")
PINHA = pal("#221714", "#36241a", "#4d3325", "#614632", "#755640", "#8a6647", "#a28058")
GEADA = pal("#455355", "#5a6867", "#6f7e79", "#83918a", "#9aaa9e", "#b3c0b6", "#ccd6cf")
VIDROS = (
    (pal("#574024", "#826137", "#aa7b40", "#c69352", "#dba866", "#efc486", "#ffe0ad"), "#ffca83"),
    (pal("#46212c", "#70353f", "#964451", "#b85b62", "#d37679", "#ed9490", "#ffd1ad"), "#ff8974"),
    (pal("#1a3a33", "#2e5b4e", "#407261", "#5c8f76", "#80af92", "#a4c8a1", "#dbe6b4"), "#b4d898"),
)


def lacinho(c: Camada, x: int, y: int, cores: np.ndarray) -> None:
    """Laço de fita dobrada, com vincos e duas pontas cortadas."""
    c.bitmap(x - 5, y - 2, [
        " 43     32 ",
        "4233   3222",
        "41235432102",
        " 325652222 ",
        "   34621   ",
        "   23121   ",
        "  342 231  ",
        "  32   21  ",
        "  1     1  ",
    ], {str(i): cor for i, cor in enumerate(cores)})


def sino(c: Camada, x: int, y: int, desvio: int) -> None:
    """Ferro martelado, boca dobrada para fora e badalo aparente."""
    c.linha(x - desvio * 2, y - 4, x, y + 1, FERRO[2])
    c.p(x - desvio, y - 2, FERRO[4])
    c.bitmap(x - 4, y, [
        "   23    ",
        "  4562   ",
        "  54421  ",
        "  53421  ",
        "  43221  ",
        " 5433211 ",
        "643333310",
        " 0122210 ",
        "   45    ",
        "    0    ",
    ], {str(i): cor for i, cor in enumerate(FERRO)})
    c.p(x - 3, y + 6, FERRO[5])
    c.p(x - 1, y + 1, FERRO[6])
    c.p(x + 1, y + 4, FERRO[3])


def coroa(c: Camada, e: Camada) -> list[Luz]:
    cx, cy = 240, 56
    u, v = X - cx, Y - cy
    raio = np.hypot(u, v * 1.12)
    ang = np.arctan2(v * 1.12, u)
    fibra = forja.ruido(114, 1.8) - 0.5
    relevo = np.clip(1 - np.abs(raio - 10.8) / 3.2, 0, 1)
    anel = (raio > 7.2) & (raio < 13.2 + 0.65 * np.sin(9 * ang))
    tom = 1.95 + relevo * 1.45 - np.cos(ang - 0.7) * 0.9 + fibra * 1.7
    # Presilha torcida nos dois furos, acima do ressalto da chaminé.
    c.linha(cx - 1, 31, cx - 3, 45, FERRO[2])
    c.linha(cx + 1, 31, cx + 2, 44, FERRO[3])
    c.ret(cx - 1, 30, 3, 2, FERRO[1])
    c.p(cx, 30, FERRO[6])
    c.mascara(anel, forja.tom(PINHO, tom))
    # Os eixos enfaixados seguem a volta. As agulhas partem de cada eixo em pares.
    for i in range(25):
        a = (i + 0.20 * forja.h2(i, 55)) * math.tau / 25
        rr = 10.1 + 1.6 * forja.h2(i, 19)
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr / 1.12
        dx, dy = math.cos(a + 1.24), math.sin(a + 1.24)
        c.linha(x, y, x + 4 * dx, y + 4 * dy, PINHO[2])
        for passo in (1, 2, 3):
            px, py = x + passo * dx, y + passo * dy
            for lado in (-1, 1):
                g = 1.2 + forja.h2(i, passo, lado) * 1.85
                tom = 2 + int((1 - math.cos(a - 0.7)) + passo * 0.57 + forja.h2(i, passo) * 0.9)
                c.linha(px, py, px + 0.7 * dx + lado * g * dy, py + 0.7 * dy - lado * g * dx, PINHO[tom])
                if forja.h2(i, passo, lado, 70) > 0.84:
                    c.p(px + 0.7 * dx + lado * g * dy, py + 0.7 * dy - lado * g * dx, PINHO[min(6, tom + 1)])
    for x, y, lado in ((231, 51, -1), (247, 49, 1), (251, 59, 1), (231, 62, -1)):
        c.linha(x, y, x + lado * 3, y - 2, PINHO[2])
        c.p(x + lado * 2, y - 1, PINHO[5])
        c.p(x + lado * 3, y - 2, PINHO[4])
        c.p(x - 1, y, VINHO[5])
        c.p(x, y - 1, VINHO[6])
        c.p(x, y, VINHO[4])
        c.p(x + 1, y, VINHO[5])
        c.p(x, y + 1, VINHO[2])
        c.p(x + 1, y + 1, VINHO[3])
    for x, y in ((230, 62), (247, 62)):
        c.bitmap(x - 2, y, [" 13 ", "2412", "3651", " 412", " 310", "  1 "],
                 {str(i): cor for i, cor in enumerate(PINHA)})
    # Pontos de vidro âmbar amarrados entre os ramos.
    luzes = []
    for x, y in ((235, 46), (245, 46), (250, 53), (229, 59), (247, 64)):
        c.p(x, y - 1, FERRO[4])
        c.p(x, y, FITA[5])
        e.p(x, y, "#ffd39a", 0.62)
        luzes.append((x, y, "#ffd29f", 11, 0.91))
    sino(c, 236, 69, -1)
    sino(c, 245, 71, 1)
    lacinho(c, 240, 65, VINHO)
    c.linha(234, 63, 238, 65, VINHO[4])
    c.p(235, 63, VINHO[5])
    c.p(245, 64, VINHO[4])
    return luzes


def fio(c: Camada, e: Camada) -> list[Luz]:
    """Cordão curto na viga da direita, com ganchos e lâmpadas facetadas."""
    luzes = []
    for a, b, barriga, pontos in (
        (273, 310, 5, ((284, 0), (299, 1))),
        (310, 358, 4, ((320, 2), (349, 0))),
        (358, 392, 5, ((371, 1), (383, 0))),
    ):
        def altura(x: int) -> int:
            t = (x - a) / (b - a)
            return round(15 + barriga * 4 * t * (1 - t))

        for x in range(a, b + 1):
            y = altura(x)
            c.p(x, y + 1, "#171718", 0.62)
            c.p(x, y, "#494136" if x % 3 == 0 else "#2b2723")
        # Um raminho preso ao último vão da viga, sem encobrir os soquetes.
        if a == 358:
            for x in range(360, 390):
                y = altura(x) - 1
                c.p(x, y, PINHO[1])
                if x % 3 == 0:
                    for lado in (-1, 1):
                        dx = 2 + int(forja.h2(x, lado) > 0.55)
                        dy = (1 + int(forja.h2(x, lado, 8) > 0.45)) * lado
                        cor = 3 + int(forja.h2(x, lado, 17) > 0.6)
                        c.linha(x - 1, y, x + dx, y + dy, PINHO[cor])
                        c.p(x + dx, y + dy, PINHO[cor + (x % 2)])
            for x in (364, 376, 387):
                y = altura(x) - 2
                c.p(x, y, VINHO[4])
                c.p(x, y - 1, VINHO[6])
                c.p(x + 1, y, VINHO[2])
        c.bitmap(a - 1, 13, [" 4 ", "512", " 3 ", " 2 "], {str(i): cor for i, cor in enumerate(FERRO)})
        for x, cor in pontos:
            y = altura(x)
            c.p(x, y + 1, FERRO[2])
            c.bitmap(x - 1, y + 2, [" 3 ", "421", "320"], {str(i): cor for i, cor in enumerate(FERRO)})
            vidro, luz = VIDROS[cor]
            c.bitmap(x - 1, y + 5, [" 3 ", "450", "561", "342", " 2 "], {str(i): tom for i, tom in enumerate(vidro)})
            e.p(x, y + 6, vidro[5], 0.55)
            e.p(x, y + 7, vidro[6], 0.94)
            e.p(x - 1, y + 7, vidro[4], 0.45)
            luzes.append((x, y + 7, luz, 14, 0.82))
    c.bitmap(391, 13, [" 4 ", "512", " 3 ", " 2 "], {str(i): cor for i, cor in enumerate(FERRO)})
    return luzes


def fita_fole(c: Camada) -> None:
    # A fita acompanha a seção em cunha do fole, inclusive as dobras do couro.
    for y, x, tom in ((94, 184, 5), (95, 184, 4), (96, 185, 3), (97, 185, 3), (98, 186, 4),
                      (99, 186, 5), (100, 187, 4), (101, 187, 3), (102, 188, 2), (103, 188, 2),
                      (104, 189, 3), (105, 189, 2), (106, 190, 2), (107, 190, 1)):
        c.ret(x - 1, y, 1, 1, VINHO[tom + 1])
        c.ret(x, y, 2, 1, VINHO[tom])
        c.p(x + 2, y, VINHO[1])
    c.bitmap(186, 97, [" 3 5 ", "32542", " 433 ", " 31  ", "  2  "], {str(i): cor for i, cor in enumerate(VINHO)})


def pacote(c: Camada, x: int, base: int, w: int, h: int, papel: np.ndarray, fita: np.ndarray) -> None:
    """Três faces em perspectiva, com dobras do papel e fita sobre as quinas."""
    y = base - h
    frente = forja.poli([(x, y), (x + w, y + 1), (x + w, base), (x, base - 1)])
    lado = forja.poli([(x + w, y + 1), (x + w + 2, y - 1), (x + w + 2, base - 2), (x + w, base)])
    topo = forja.poli([(x, y), (x + 2, y - 2), (x + w + 2, y - 1), (x + w, y + 1)])
    fibras = forja.ruido(104, 1.35) - 0.5
    tom = 4 - (X - x) * (1.3 / w) + fibras * 1.5 - (Y == base) * 1.3
    c.mascara(frente, forja.tom(papel, tom))
    c.mascara(lado, forja.tom(papel, tom - 1.25))
    c.mascara(topo, forja.tom(papel, tom + 1.65))
    c.linha(x, y, x + w - 1, y + 1, papel[5])
    c.linha(x, base - 1, x + w, base, papel[1])
    c.linha(x + w, base, x + w + 2, base - 2, papel[0])
    c.p(x + w + 2, base - 3, papel[1])
    c.p(x + 1, base - 3, papel[2])
    c.p(x + w + 1, y + 3, papel[0])
    cx = x + w // 2
    c.linha(cx, base - 1, cx, y, fita[3])
    c.linha(cx - 1, base - 1, cx - 1, y, fita[5])
    c.linha(cx, y, cx + 2, y - 2, fita[6])
    c.linha(x, y + 3, x + w, y + 4, fita[3])
    c.p(x, y + 3, fita[4])
    c.linha(x + w, y + 4, x + w + 2, y + 2, fita[1])
    if w > 7:
        c.p(x + 2, base - 1, papel[3])
        c.p(x + w - 2, y + 2, fita[2])
        c.p(x + w - 1, y + 2, fita[4])
        c.p(x + w - 1, y + 3, fita[1])
    c.bitmap(cx - 3, y - 4, [" 5  4 ", "436321", "  543 ", "   1  "], {str(i): cor for i, cor in enumerate(fita)})


def pintar_fora_natal(nome: str, per: dict) -> tuple[np.ndarray, Camada]:
    ceu, fora = forja.pintar_fora(nome, per)
    # A geada fica do lado de fora: nos tufos frios e nas beiras do caminho.
    pegada = forja.ruido(110, 4.4) * 0.7 + forja.ruido(111, 2.1) * 0.3
    caminho = np.abs(X - (440 - (132 - Y) * 0.9))
    meia_largura = 4 + (Y - 92) * 0.35
    margem = forja.suave(0, 6, caminho - meia_largura)
    quantidade = forja.suave(111, 127, Y) * (0.62 + margem * 0.38)
    geada = forja.ret(398, 108, 468, 132) & (pegada * quantidade > 0.44) & (caminho > meia_largura)
    franjas = geada & ~np.roll(geada, 1, 0)
    v = 1.8 + (pegada - 0.46) * 5 + franjas * 1.15 + forja.BAYER_HW * 0.7
    pigmento = forja.tom(GEADA, v)
    if nome == "tarde":
        pigmento *= hexa("#fff2db")
    fora.mascara(geada, pigmento, 0.76)
    return ceu, fora


def conferir_ancoras(*camadas: Camada) -> None:
    areas = list(forja.LIVRE.values())
    areas += [(p["x"], p["y"] - 4.5, p["x"] + 36, p["y"] + 22.5) for p in forja.ANCORAS["gato"]]
    areas += [(p["x"] - 16.5, p["y"] - 24, p["x"] + 16.5, p["y"]) for p in forja.ANCORAS["coruja"]]
    ocupada = np.logical_or.reduce([c.c[:, :, 3] > 0 for c in camadas])
    for x0, y0, x1, y1 in areas:
        reservada = (X >= math.floor(x0)) & (X <= x1) & (Y >= math.floor(y0)) & (Y <= y1)
        if np.any(ocupada & reservada):
            raise ValueError(f"Adereço da forja na área reservada {x0, y0, x1, y1}")


def montar(nome: str) -> Image.Image:
    pendentes, vidro = Camada(), Camada()
    presentes = forja.Objetos()
    luzes = coroa(pendentes, vidro) + fio(pendentes, vidro)
    fita_fole(pendentes)
    presentes.add(163, pacote, 253, 163, 6, 4, PAPEL_VERDE, FITA)
    presentes.add(166, pacote, 242, 166, 9, 6, PAPEL_VINHO, PAPEL_VERDE)
    conferir_ancoras(pendentes, presentes.cam, vidro)

    per = dict(forja.PERIODOS[nome])
    intensidade = {"manha": 0.62, "tarde": 0.83, "noite": 1.14}[nome]
    vidro.c[:, :, 3] *= intensidade / per["em_k"]
    # A luz das lâmpadas é incidente: entra no campo RGB antes de multiplicar
    # o albedo. A curva curta conserva as juntas da pedra e os veios da viga.
    ambiente = hexa(per["amb"])
    for x, y, cor, raio, forca in luzes:
        direta = luz_pontual(x, y - 1, raio, 0.76)
        rebatida = luz_pontual(x, y + 3, raio * 1.37, 1.08) * 0.13
        ambiente = ambiente + (direta + rebatida)[:, :, None] * hexa(cor) * forca * intensidade / per["amb_k"]
    per["amb"] = ambiente

    def objetos_natal() -> tuple[forja.Objetos, Camada, Camada, Camada]:
        obj, coifa, pend, emiss = forja.pintar_objetos()
        # Contato da coroa com a pedra: penumbra abaixo e à esquerda dos ramos.
        sombra = np.roll(np.roll(pendentes.c[:, :, 3], 2, 0), -1, 1)
        sombra *= forja.ret(215, 32, 265, 85)
        coifa.c[:, :, :3] *= (1 - 0.31 * sombra[:, :, None])
        pend.juntar(pendentes)
        obj.cam.juntar(presentes.cam)
        sobre_piso = presentes.base >= 0
        obj.base[sobre_piso] = presentes.base[sobre_piso]
        emiss.juntar(vidro)
        return obj, coifa, pend, emiss

    # Os embrulhos ficam à frente de parte do feixe da tarde. A mistura
    # preserva a névoa que passa pela frente e a leitura do papel nas sombras.
    oclusao_feixe = forja.desfocar(forja.ampliar(presentes.cam.c[:, :, 3:4]), 1.25)[:, :, 0]

    def feixe_atras_dos_presentes(*parametros: float) -> np.ndarray:
        return forja.feixe_dir(*parametros) * (1 - oclusao_feixe * 0.78)

    # A montagem recebe os pincéis por seu namespace. A cópia limita a
    # substituição de camadas e luz a esta chamada, sem alterar o render original.
    def cor_ou_campo(cor: str | np.ndarray) -> np.ndarray:
        return hexa(cor) if isinstance(cor, str) else cor

    montagem = FunctionType(forja.montar.__code__, {
        **vars(forja),
        "PERIODOS": {nome: per},
        "pintar_objetos": objetos_natal,
        "pintar_fora": pintar_fora_natal,
        "hexa": cor_ou_campo,
        "feixe_dir": feixe_atras_dos_presentes,
    })
    return montagem(nome)


def main() -> None:
    for nome in forja.PERIODOS:
        img = montar(nome)
        prefixo = forja.PASTA / f"cena-forja-natal-{nome}"
        img.save(prefixo.with_suffix(".webp"), quality=84, method=6)
        img.resize((960, 400), Image.Resampling.LANCZOS).save(f"{prefixo}-960.webp", quality=82, method=6)


if __name__ == "__main__":
    main()
