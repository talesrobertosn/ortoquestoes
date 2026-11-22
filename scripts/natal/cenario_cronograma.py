"""A estrada do Cronograma no Natal, com neve, uma coroa no sino e luz no beiral.

Pinta e ilumina na mesma montagem do cenário que está na página. Conserva a
caixa do sino animado e os estandartes. Saídas com prefixo estrada-prova-natal.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from fio_topo import COBRE, SOQUETE, VIDROS
from guirlanda import PINHO, VERMELHO
from hd2d import h01, pal, tom

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "cenarios"))
import cronograma_estrada as base  # noqa: E402


NEVE = pal("#687c98", "#8296ad", "#9cacbd", "#b2c4d2", "#ccd6de", "#e0e5e3", "#f2f1e8")
BULBOS = ((402, 55, 4), (410, 57, 0), (418, 59, 2), (427, 59, 1), (435, 57, 0), (443, 55, 4))
CAIXA_SINO = (1245, 189, 1290, 243)


def neve_no_telhado(c) -> None:
    # O quadril da água esquerda recebe neve primeiro. Deixa livres a trapeira e o remate.
    for y in range(22, 52):
        meia = 1.5 + (y - 22) / 30 * 21.5
        largura = 2.6 + 2.5 * math.sin((y - 22) * 0.23) ** 2
        for dx in range(round(-meia), round(-meia + largura) + 1):
            x = base.CX + dx
            cor = 0.53 + (h01(x, y, 401) - 0.5) * 0.27
            cor += 0.13 * ((y - 22) % 3 == 0) - 0.18 * (dx >= -meia + largura - 1)
            c.p(x, y, tom(NEVE, cor), 0.86)
    for x in range(base.CX - 24, base.CX + 25):
        profundidade = 3 if h01(x // 4, 79) > 0.45 else 2
        for j in range(profundidade):
            claro = 0.82 - j * 0.21 + (h01(x, j, 91) - 0.5) * 0.19 - 0.14 * (x > base.CX)
            c.p(x, 51 + j, tom(NEVE, claro))
        if x % 9 == 0:
            c.p(x, 53 + profundidade, NEVE[2], 0.72)
    for x in range(base.CX - 19, base.CX + 19):
        if h01(x // 3, 478) > 0.35:
            c.p(x, 85, NEVE[4], 0.75)
            c.p(x, 86, NEVE[2], 0.50)


def coroa_sino(c) -> None:
    cx, cy = base.CX, 72
    c.linha(cx, 65, cx, 69, COBRE[2])
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            r = math.hypot(dx, dy * 1.12)
            grao = h01(dx, dy, 95)
            if 1.7 < r < 4.2 + (grao - 0.5) * 0.8:
                claro = 0.52 - dx * 0.055 - dy * 0.045 + (grao - 0.5) * 0.25
                c.p(cx + dx, cy + dy, tom(PINHO, claro))
    c.p(cx - 2, cy - 2, PINHO[-2])
    c.p(cx + 2, cy - 1, VERMELHO[5])
    for dx, dy, tom_fita in ((-2, 3, 7), (-1, 4, 5), (0, 4, 7), (1, 4, 4), (2, 3, 6),
                             (-1, 5, 6), (1, 5, 5), (-2, 6, 4), (2, 6, 3)):
        c.p(cx + dx, cy + dy, VERMELHO[tom_fita])


def lampadas(c, e) -> list:
    y_anterior = 54
    for x in range(398, 447):
        y = 54 + round(4 * math.sin((x - 398) * math.pi / 48))
        if y != y_anterior:
            c.p(x, y_anterior, COBRE[2])
        c.p(x, y, COBRE[1] if x % 5 else COBRE[4])
        y_anterior = y
    c.p(398, 53, "#ad966e")
    c.p(446, 53, "#9c8564")
    luzes = []
    for x, y, indice in BULBOS:
        vidro, feixe = VIDROS[indice]
        c.p(x, y - 1, SOQUETE[4])
        c.p(x, y, vidro[3])
        c.p(x + 1, y + 1, vidro[1])
        c.p(x, y + 1, vidro[2])
        e.p(x, y, vidro[3], 0.83)
        e.p(x, y + 1, vidro[2], 0.53)
        luzes.append((x, y, 9, 0.86, feixe, 0.39))
    return luzes


def main() -> None:
    camadas = base.pintar()
    emissivo = base.Camada()
    neve_no_telhado(camadas["predios"])
    coroa_sino(camadas["sino"])
    luzes = lampadas(camadas["predios"], emissivo)
    camadas["luzes"].extend(luzes)

    class MontagemNatal(base.Montagem):
        def iluminar(self, ambiente, pontos, mapa=None):
            if base.P == "manha":
                pontos = pontos + [l[:5] + (l[5] * 0.20,) for l in luzes]
            super().iluminar(ambiente, pontos, mapa)
            e = base.copia(emissivo)
            e.c[:, :, 3] *= {"manha": 0.31, "tarde": 0.64, "noite": 0.92}[base.P]
            self.emissivo(e, halo={"manha": 0.22, "tarde": 0.42, "noite": 0.76}[base.P])

    with patch.object(base, "Montagem", MontagemNatal):
        for periodo in sys.argv[1:] or base.PERIODOS:
            base.P = base.v.PERIODO = periodo
            com, sino, _ = base.montar(camadas, True)
            sem, _, _ = base.montar(camadas, False)
            nome = f"estrada-prova-natal-{periodo}"
            sem.save(base.PASTA / f"{nome}.webp", quality=84, method=6)
            sem.resize((960, 400), Image.Resampling.LANCZOS).save(
                base.PASTA / f"{nome}-960.webp", quality=82, method=6,
            )
            base.recorte(com, sino, CAIXA_SINO).save(base.PASTA / f"estrada-prova-natal-sino-{periodo}.png", optimize=True)
            print(nome)


if __name__ == "__main__":
    main()
