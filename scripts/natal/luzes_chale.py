"""Mais luzes na sacada do Vale e na lareira da Sala, nos motores originais."""
from contextlib import contextmanager
import math
from unittest.mock import patch

import numpy as np
from PIL import Image

from hd2d import Camada, pal
from cenarios import inicio_sala_natal as sala, inicio_vale as vale

OURO = pal("#302019", "#583b28", "#866645", "#b58e58", "#d7aa61", "#f3cf87", "#fff0bb")
LUZES = (
    ("#542b19", "#bc6735", "#ffd27c", "#fff2cf"),
    ("#3c282a", "#a34043", "#f77b69", "#ffc9aa"),
    ("#233c37", "#4f866b", "#8bd5a2", "#d4ffe1"),
    ("#35314d", "#6376b3", "#9bbbff", "#e4e8ff"),
)
MATERIAL = ("#332419", "#675137", "#a58146")


def vidro(cor, emissivo, x, y, vidro, intensidade, pontos):
    cor.p(x, y - 2, MATERIAL[0])
    cor.p(x + 1, y - 2, MATERIAL[2])
    cor.p(x, y - 1, MATERIAL[1])
    cor.p(x - 1, y, vidro[0])
    cor.p(x, y, vidro[3])
    cor.p(x + 1, y, vidro[1])
    cor.p(x, y + 1, vidro[2])
    cor.p(x, y + 2, vidro[1])
    if emissivo is not None:
        emissivo.p(x, y, vidro[3], intensidade)
        emissivo.p(x, y + 1, vidro[2], intensidade * 0.85)
    pontos.append((x, y, vidro[2]))


def varal(cor, emissivo, comeco, fim, altura, queda, passo, intensidade):
    pontos = []
    def linha(x):
        return altura + round(queda * math.sin(math.pi * (x - comeco) / (fim - comeco)))

    for x in range(comeco, fim + 1):
        cor.p(x, linha(x), MATERIAL[1] if x % 3 else MATERIAL[2])
    for i, x in enumerate(range(comeco + 2, fim, passo)):
        vidro(cor, emissivo, x, linha(x) + 2, LUZES[i % len(LUZES)], intensidade, pontos)
    return pontos


@contextmanager
def vale_iluminado(nevado):
    chale_original = vale.chale
    rail_original = vale.guarda_corpo

    def acrescentar(P, E, L, x0, x1, y, queda, passo, luzes):
        c, e = Camada(), Camada()
        pontos = varal(c, e, x0, x1, y, queda, passo, 1.0)
        alfa = c.c[:, :, 3]
        P.juntar(c, np.where(alfa > 0, vale.direto(L, (0, 1, 0.2)), 0).astype(np.float32))
        E.juntar(e)
        luzes.extend(pontos)

    def chale(P, E, per, nome, luzes):
        pecas = chale_original(P, E, per, nome, luzes)
        # A linha fica na face da soleira. Os dois intervalos deixam livre
        # o miolo da sacada, por onde passam o gato e a coruja.
        for x0, x1 in ((405, 414), (455, 478)):
            acrescentar(P, E, per["L"], x0, x1, 116, 2, 5, luzes)
        return pecas

    def guarda_corpo(P, E, L, luzes):
        rail_original(P, E, L, luzes)
        x0, x1 = 334, 364
        y = int(vale.TERRACO[x0]) - 7
        acrescentar(P, E, L, x0, x1, y, 2, 5, luzes)

    with patch.dict(vale.ESTADO, nevado=nevado):
        with patch.multiple(vale, chale=chale, guarda_corpo=guarda_corpo):
            yield


def pintar_sala(nome):
    luz_original = sala.light

    def luz(img, periodo, p):
        c = Camada()
        pontos = varal(c, None, 266, 327, 75, 3, 7, 0.92)
        # Dois sininhos de latão sob a luz, presos à prateleira.
        for x, y in ((277, 85), (320, 85)):
            c.linha(x, y - 5, x, y - 2, OURO[2])
            c.bitmap(x - 2, y - 2, (
                " 45  ", " 563 ", " 562 ", "45621", "34210", "  3  ",
            ), {str(i): cor for i, cor in enumerate(OURO)})
        arte = (np.clip(c.c, 0, 1) * 255).astype(np.uint8)
        img.paste(Image.fromarray(arte, "RGBA"), (0, 0), Image.fromarray(arte[:, :, 3]))
        # A Sala usa os pontos da árvore para iluminar o albedo e calcular
        # o bloom. O mesmo caminho serve aos vidros montados no console.
        with patch.object(sala, "TREE_LIGHTS", [*sala.TREE_LIGHTS, *pontos]):
            return luz_original(img, periodo, p)

    with patch.object(sala, "light", luz):
        return sala.render(nome)


def salvar(img, prefixo, nome):
    stem = vale.PASTA / f"{prefixo}-{nome}"
    img.save(f"{stem}.webp", quality=84, method=6)
    img.resize((960, 400), Image.Resampling.LANCZOS).save(f"{stem}-960.webp", quality=84, method=6)
    print(stem.name, flush=True)


def main():
    for nevado in (False, True):
        with vale_iluminado(nevado):
            for nome in vale.PERIODOS:
                salvar(vale.montar(nome), "cena-vale-natal" + ("-nevado" if nevado else ""), nome)
    for nome in sala.PALETTES:
        salvar(pintar_sala(nome), "cena-sala-natal-luzes", nome)


if __name__ == "__main__":
    main()
