"""Ícones em pixel art da temporada RPG: atalhos da página inicial e recursos do assinante.

Usa o mesmo motor dos emblemas (contorno e sombreado automáticos, 32x32 ampliado 4x).
Gera public/pixel/<nome>.png. Uso: python3 scripts/gerar_icones_pixel.py
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gerar_emblemas_provisorios import (  # noqa: E402
    MADEIRA, METAIS, N, PERGAMINHO, Tela, circulo, gravar_png, linha, poligono, retangulo, trofeu,
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


# ---------- ícones novos (31/10/2026): Flashcards, Revisão, Caderno de erros, Atlas 3D ----------
VIDRO = ["#1d3a44", "#6f9aa0", "#b9dcd8", "#e2f4f0", "#ffffff"]
CAPA = ["#240505", "#5a0f0f", "#7f1a1a", "#a83a32", "#e07a6a"]
MARFIM = ["#4a3a22", "#b39b70", "#e8d8b2", "#f7eed6", "#fffaf0"]
SETA = ["#062a24", "#1f7a6d", "#2f9a86", "#5cc9ad", "#d2fbef"]


def _vizinhos(m: set[tuple[int, int]]) -> set[tuple[int, int]]:
    return {(x + dx, y + dy) for (x, y) in m for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            if 0 <= x + dx < N and 0 <= y + dy < N} - m


def _por_cima(t: Tela, m: set[tuple[int, int]], rampa: list[str]) -> None:
    """Forma na frente de outra: o contorno escuro também passa por cima do que está atrás."""
    t.pintar(_vizinhos(m), rampa[0])
    t.camada(m, rampa)


def _cartao(cx: float, cy: float, w: float, h: float, graus: float) -> list[tuple[float, float]]:
    a = math.radians(graus)
    c, s = math.cos(a), math.sin(a)
    return [(cx + x * c - y * s, cy + x * s + y * c) for (x, y) in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]


def _arco(cx: float, cy: float, rx: float, ry: float, a0: float, a1: float, esp: float) -> set[tuple[int, int]]:
    m: set[tuple[int, int]] = set()
    passos = 24
    pts = [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / passos)),
            cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / passos))) for i in range(passos + 1)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        m |= linha(x0, y0, x1, y1, esp)
    return m


def _ponta(cx: float, cy: float, rx: float, ry: float, ang: float, sentido: int, tam: float = 3.2) -> set[tuple[int, int]]:
    """Ponta de seta no fim de um arco, apontando no sentido do giro."""
    a = math.radians(ang)
    px, py = cx + rx * math.cos(a), cy + ry * math.sin(a)
    tx, ty = -rx * math.sin(a) * sentido, ry * math.cos(a) * sentido
    n = math.hypot(tx, ty)
    tx, ty = tx / n, ty / n
    nx, ny = -ty, tx
    return poligono([(px + tx * tam, py + ty * tam), (px + nx * tam, py + ny * tam), (px - nx * tam, py - ny * tam)])


def _elipse(cx: float, cy: float, rx: float, ry: float) -> set[tuple[int, int]]:
    return {(x, y) for y in range(N) for x in range(N) if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1}


def flashcards(t: Tela) -> None:
    t.camada(poligono(_cartao(10, 15, 12, 17, -22)), AZUL)
    t.pintar(poligono(_cartao(10, 15, 8, 13, -22)), "#d9bf86")
    _por_cima(t, poligono(_cartao(22, 14, 12, 17, 20)), VERMELHO)
    t.pintar(poligono(_cartao(22, 14, 8, 13, 20)), "#d9bf86")
    _por_cima(t, retangulo(10, 10, 22, 28), PERGAMINHO)
    t.camada(retangulo(11, 11, 21, 13), VERDE, contorno=False)
    t.camada(linha(13.5, 18, 14, 16, 2) | linha(14, 16, 18, 16, 2) | linha(18, 16, 18.5, 18, 2)
             | linha(18.5, 18, 16.5, 20.5, 2) | retangulo(15, 20, 16, 22), MADEIRA, contorno=False)
    t.camada(retangulo(15, 24, 16, 25), MADEIRA, contorno=False)
    for (x, y) in ((27, 4), (4, 5)):
        t.brilho(x, y, "#fff4cf")


def ampulheta(t: Tela) -> None:
    for a0, a1 in ((-62, 30), (118, 210)):
        t.camada(_arco(16, 16, 13.5, 13.5, a0, a1, 2), SETA)
        t.camada(_ponta(16, 16, 13.5, 13.5, a1, 1, 4), SETA)
    vidro = poligono([(11, 7), (21, 7), (20.5, 12), (17, 15.5), (17, 16.5), (20.5, 20), (21, 25), (11, 25), (11.5, 20), (15, 16.5), (15, 15.5), (11.5, 12)])
    _por_cima(t, vidro, VIDRO)
    t.camada(poligono([(13.5, 11), (18.5, 11), (16.6, 14.5), (15.4, 14.5)]), METAIS["ouro"], contorno=False)
    t.camada(poligono([(11.5, 25), (13, 21.5), (16, 19.5), (19, 21.5), (20.5, 25)]), METAIS["ouro"], contorno=False)
    t.pintar(retangulo(15, 15, 16, 19), "#f5cd6b")
    for x in (9, 22):
        _por_cima(t, retangulo(x, 6, x + 1, 26), METAIS["ouro"])
    _por_cima(t, retangulo(7, 3, 24, 6), MADEIRA)
    _por_cima(t, retangulo(7, 25, 24, 28), MADEIRA)
    t.pintar(retangulo(13, 8, 13, 9), "#ffffff")
    t.brilho(27, 3, "#fff4cf")


def caderno_erros(t: Tela) -> None:
    t.camada(retangulo(8, 5, 26, 28), PERGAMINHO)
    _por_cima(t, retangulo(6, 4, 24, 27), CAPA)
    for y in range(6, 27, 4):
        _por_cima(t, retangulo(4, y, 8, y + 1), METAIS["prata"])
    _por_cima(t, poligono([(19, 1), (23, 1), (23, 10), (21, 8.5), (19, 10)]), VERDE)
    _por_cima(t, retangulo(11, 13, 21, 22), PERGAMINHO)
    t.camada(linha(13.5, 15.5, 18.5, 20.5, 1.8) | linha(18.5, 15.5, 13.5, 20.5, 1.8), VERMELHO, contorno=False)
    t.brilho(28, 4, "#fff4cf")


def atlas_osso(t: Tela) -> None:
    cx, cy, rx, ry = 16, 12.5, 13, 4
    t.camada(_arco(cx, cy, rx, ry, 180, 360, 1.8), SETA)
    t.camada(retangulo(5, 24, 26, 28), MADEIRA)
    _por_cima(t, _elipse(16, 23.5, 10.5, 2.8), MADEIRA)
    t.pintar(_elipse(16, 23.2, 7.5, 1.3), "#d9a877")
    osso = (linha(14.5, 7, 17, 17.5, 3.6) | circulo(12.4, 5, 2.9) | circulo(17.4, 4.3, 2.7)
            | circulo(14.6, 19.6, 2.8) | circulo(19.6, 19, 2.8))
    _por_cima(t, osso, MARFIM)
    t.camada(_arco(cx, cy, rx, ry, 0, 158, 1.8), SETA)
    t.camada(_ponta(cx, cy, rx, ry, 158, 1, 4), SETA)
    for (x, y) in ((27, 4), (5, 4)):
        t.brilho(x, y, "#fff4cf")

ICONES = {
    "treinar": livro, "revisao": calendario, "desempenho": grafico, "ranking": trofeu_ouro,
    "simulado": prancheta, "liga": escudo_liga, "turma": turma, "relatorio": envelope, "planos": bau,
    "flashcards": flashcards, "ciclo": ampulheta, "erros": caderno_erros, "atlas": atlas_osso,
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
