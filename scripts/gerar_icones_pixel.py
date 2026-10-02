"""Ícones em pixel art da temporada RPG: atalhos da página inicial e recursos do assinante.

Usa o mesmo motor dos emblemas (contorno e sombreado automáticos, 32x32 ampliado 4x).
Gera public/pixel/<nome>.png. Uso: python3 scripts/gerar_icones_pixel.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gerar_emblemas_provisorios import (  # noqa: E402
    MADEIRA, METAIS, PERGAMINHO, Tela, circulo, gravar_png, linha, poligono, retangulo, trofeu,
)

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel"
VERDE = ["#062a24", "#0d5247", "#14655e", "#2f9a86", "#9fe3d2"]
AZUL = ["#0b1a3a", "#1d3a7a", "#2b5fa8", "#5b8fd8", "#cfe0ff"]
VERMELHO = ["#3d0a0a", "#8f1d1d", "#d33a3a", "#f07a6a", "#ffd2c9"]
PELE = ["#4a2a14", "#c98a5a", "#f2c08a", "#f8d6ad", "#fff0dc"]


def livro(t: Tela) -> None:
    t.camada(poligono([(3, 8), (15.5, 10), (15.5, 27), (3, 25)]), PERGAMINHO)
    t.camada(poligono([(16.5, 10), (29, 8), (29, 25), (16.5, 27)]), PERGAMINHO)
    t.camada(retangulo(15, 9, 16, 28), MADEIRA)
    for y in (14, 17, 20):
        t.pintar(linha(6, y - 1, 13, y, 0.5), "#9c7a45")
        t.pintar(linha(19, y, 26, y - 1, 0.5), "#9c7a45")
    t.camada(poligono([(22, 6), (25, 6), (25, 14), (23.5, 12.5), (22, 14)]), VERMELHO)


def calendario(t: Tela) -> None:
    t.camada(retangulo(4, 7, 27, 28), PERGAMINHO)
    t.camada(retangulo(4, 7, 27, 12), VERMELHO)
    for x in (9, 22):
        t.camada(retangulo(x, 3, x + 1, 9), METAIS["prata"])
    for (x, y) in ((8, 16), (13, 16), (18, 16), (23, 16), (8, 21), (13, 21)):
        t.pintar(retangulo(x, y, x + 1, y + 1), "#9c7a45")
    t.camada(linha(17, 22, 19.5, 24.5, 1.6) | linha(19.5, 24.5, 25, 17.5, 1.6), VERDE, contorno=False)


def grafico(t: Tela) -> None:
    t.camada(retangulo(3, 27, 29, 28), MADEIRA)
    t.camada(retangulo(5, 19, 9, 26), AZUL)
    t.camada(retangulo(12, 14, 16, 26), VERDE)
    t.camada(retangulo(19, 9, 23, 26), METAIS["ouro"])
    t.camada(linha(5, 14, 12, 9, 1.4) | linha(12, 9, 17, 11, 1.4) | linha(17, 11, 26, 3.5, 1.4), VERMELHO)
    t.camada(poligono([(23, 3), (28, 2), (27, 7)]), VERMELHO)


def trofeu_ouro(t: Tela) -> None:
    trofeu(t, "ouro", 1)
    t.brilho(26, 4, "#fff4cf")


def prancheta(t: Tela) -> None:
    t.camada(retangulo(6, 6, 25, 29), MADEIRA)
    t.camada(retangulo(8, 9, 23, 27), PERGAMINHO)
    t.camada(retangulo(11, 3, 20, 8), METAIS["prata"])
    for i, y in enumerate((13, 18, 23)):
        t.camada(linha(10, y, 11.5, y + 1.5, 1) | linha(11.5, y + 1.5, 14, y - 1, 1), VERDE if i < 2 else VERMELHO, contorno=False)
        t.pintar(linha(16, y, 21, y, 0.6), "#9c7a45")


def escudo_liga(t: Tela) -> None:
    t.camada(poligono([(5, 6), (27, 6), (27, 17), (16, 29), (5, 17)]), AZUL)
    t.camada(poligono([(16, 6), (27, 6), (27, 17), (16, 29)]), ["#0b1a3a", "#1d3a7a", "#1d4a8f", "#3a6ec0", "#9fbff0"], contorno=False)
    t.camada(poligono([(10, 14), (13, 10), (16, 13), (19, 10), (22, 14), (21, 19), (11, 19)]), METAIS["ouro"])
    t.camada(retangulo(4, 4, 28, 6), METAIS["ouro"])


def turma(t: Tela) -> None:
    for (cx, cor, base) in ((8, AZUL, 21), (24, VERMELHO, 21), (16, VERDE, 18)):
        t.camada(poligono([(cx - 6, base + 10), (cx - 5, base + 3), (cx + 5, base + 3), (cx + 6, base + 10)]), cor)
        t.camada(circulo(cx, base - 2, 4.2), PELE)


def envelope(t: Tela) -> None:
    t.camada(retangulo(3, 8, 28, 25), PERGAMINHO)
    t.pintar(linha(4, 9, 15.5, 18, 0.8) | linha(27, 9, 15.5, 18, 0.8), "#c9a86a")
    t.camada(circulo(15.5, 18, 3), VERMELHO)
    t.brilho(14, 17, "#f07a6a")


def bau(t: Tela) -> None:
    t.camada(retangulo(4, 15, 27, 28), MADEIRA)
    t.camada(poligono([(4, 15), (4, 10), (8, 6), (23, 6), (27, 10), (27, 15)]), MADEIRA)
    for x in (4, 14, 25):
        t.camada(retangulo(x, 6 if x == 14 else 9, x + 2, 28), METAIS["ouro"], contorno=False)
    t.camada(retangulo(4, 14, 27, 16), METAIS["ouro"])
    t.camada(retangulo(13, 16, 18, 21), METAIS["ouro"])
    t.pintar(retangulo(15, 18, 16, 19), "#3d2804")
    for (x, y) in ((9, 3), (21, 2), (27, 5)):
        t.brilho(x, y, "#fff4cf")


ICONES = {
    "treinar": livro, "revisao": calendario, "desempenho": grafico, "ranking": trofeu_ouro,
    "simulado": prancheta, "liga": escudo_liga, "turma": turma, "relatorio": envelope, "planos": bau,
}


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    for nome, desenhar in ICONES.items():
        t = Tela()
        desenhar(t)
        gravar_png(PASTA / f"{nome}.png", t)
    print(f"{len(ICONES)} ícones em {PASTA}")


if __name__ == "__main__":
    main()
