"""Desenha em pixel art os emblemas que ainda não têm arte feita à mão.

Cada família tem uma silhueta própria (chama, calendário, escudo, cristal,
mapa, espadas, raio, alvo, coração alado, troféu, lua, sol, medalha), desenhada
numa grade de 32x32 com contorno, luz no alto à esquerda e sombra embaixo à
direita, e ampliada 4x sem suavização para 128x128. O metal segue o nível
(bronze, prata, ouro, esmeralda, lendário); ouro em diante ganha gemas e
brilhos, e o lendário uma aura roxa. Dentro da família, cada degrau acrescenta
um detalhe (mais dias marcados, mais espadas, chama maior).

Nunca sobrescreve arte feita à mão (ARTE_PROPRIA) e grava a lista de ids com
arte em src/dados/imagensEmblemas.ts.

Uso: python3 scripts/gerar_emblemas_provisorios.py
"""
from __future__ import annotations

import math
import re
import struct
import zlib
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
PASTA = RAIZ / "public" / "emblemas"
LISTA = RAIZ / "src" / "dados" / "imagensEmblemas.ts"
CATALOGO = RAIZ / "src" / "estado" / "conquistas.ts"

# Artes feitas à mão (PixelLab): nunca são geradas nem substituídas aqui.
ARTE_PROPRIA = {"questoes-100", "questoes-250", "questoes-500", "questoes-1000", "questoes-3000", "fogueira", "sequencia-3"}

N = 32
Cor = tuple[int, int, int, int]


def hexa(c: str, a: int = 255) -> Cor:
    return int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), a


def misturar(a: Cor, b: Cor, t: float) -> Cor:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)  # type: ignore[return-value]


# Rampa de cada metal: contorno, sombra, base, luz, brilho.
METAIS = {
    "bronze": ["#3b1d0c", "#7a4220", "#b8733f", "#e3a26b", "#f7d2ae"],
    "prata": ["#232c30", "#5f6d72", "#9eacb1", "#d4dde0", "#ffffff"],
    "ouro": ["#3d2804", "#946512", "#d9a23a", "#f5cd6b", "#fff4cf"],
    "esmeralda": ["#04241f", "#0d5247", "#23907a", "#5cc9ad", "#d2fbef"],
    "lendario": ["#1c0633", "#4b1d7a", "#8448cf", "#b98cf0", "#f3e6ff"],
}
CHAMAS = {  # cor externa, meio e núcleo da chama por nível
    "bronze": ["#c2410c", "#f97316", "#fed7aa"],
    "prata": ["#1d4ed8", "#60a5fa", "#e0f2fe"],
    "ouro": ["#d97706", "#fbbf24", "#fef9c3"],
    "esmeralda": ["#047857", "#34d399", "#d1fae5"],
    "lendario": ["#7e22ce", "#c084fc", "#fae8ff"],
}
VERMELHO = ["#4c0d0d", "#8f1d1d", "#d33a3a", "#f07a6a", "#ffd2c9"]
PERGAMINHO = ["#4a3418", "#9c7a45", "#d9bf86", "#f2e3bb", "#fff8e6"]
MADEIRA = ["#2a1608", "#5c3415", "#8a5226", "#b47a45", "#d9a877"]
NOITE = ["#0b1330", "#1e2a5a", "#34478f", "#6a7fd1", "#dfe6ff"]
FITAS = ["#b3423a", "#14655e", "#2b5fa8", "#c9952f", "#7b3fa0", "#1f7a4d", "#d06a1f", "#3a3a3a"]


class Tela:
    def __init__(self) -> None:
        self.px: list[list[Cor | None]] = [[None] * N for _ in range(N)]

    def ponto(self, x: int, y: int, c: Cor) -> None:
        if 0 <= x < N and 0 <= y < N:
            self.px[y][x] = c

    def camada(self, mascara: set[tuple[int, int]], rampa: list[str], contorno: bool = True) -> None:
        """Pinta uma forma: base, luz no alto/esquerda, sombra embaixo/direita e contorno."""
        r = [hexa(c) for c in rampa]
        for (x, y) in mascara:
            cima, esq = (x, y - 1) not in mascara, (x - 1, y) not in mascara
            baixo, dir_ = (x, y + 1) not in mascara, (x + 1, y) not in mascara
            c = r[2]
            if cima or esq:
                c = r[3]
            if baixo or dir_:
                c = r[1]
            self.ponto(x, y, c)
        if contorno:
            for (x, y) in mascara:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    v = (x + dx, y + dy)
                    if v not in mascara and 0 <= v[0] < N and 0 <= v[1] < N:
                        atual = self.px[v[1]][v[0]]
                        if atual is None or atual[3] < 255:
                            self.ponto(v[0], v[1], r[0])

    def pintar(self, mascara: set[tuple[int, int]], c: str) -> None:
        for (x, y) in mascara:
            self.ponto(x, y, hexa(c))

    def aura(self, c: str) -> None:
        """Brilho translúcido em volta de tudo o que já foi desenhado."""
        cheio = {(x, y) for y in range(N) for x in range(N) if self.px[y][x] is not None}
        for raio, alfa in ((1, 150), (2, 70)):
            borda = set()
            for (x, y) in cheio:
                for dx in range(-raio, raio + 1):
                    for dy in range(-raio, raio + 1):
                        v = (x + dx, y + dy)
                        if v not in cheio and 0 <= v[0] < N and 0 <= v[1] < N and abs(dx) + abs(dy) <= raio + 1:
                            borda.add(v)
            for (x, y) in borda:
                if self.px[y][x] is None:
                    self.ponto(x, y, hexa(c, alfa))
            cheio |= borda

    def brilho(self, x: int, y: int, c: str = "#ffffff") -> None:
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            self.ponto(x + dx, y + dy, hexa(c, 255 if (dx, dy) == (0, 0) else 200))


# ---------- formas ----------
def circulo(cx: float, cy: float, r: float) -> set[tuple[int, int]]:
    return {(x, y) for y in range(N) for x in range(N) if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r}


def retangulo(x0: int, y0: int, x1: int, y1: int) -> set[tuple[int, int]]:
    return {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}


def poligono(pontos: list[tuple[float, float]]) -> set[tuple[int, int]]:
    saida = set()
    for y in range(N):
        for x in range(N):
            px, py, dentro = x + 0.5, y + 0.5, False
            for i in range(len(pontos)):
                (x1, y1), (x2, y2) = pontos[i], pontos[i - 1]
                if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
                    dentro = not dentro
            if dentro:
                saida.add((x, y))
    return saida


def linha(x0: float, y0: float, x1: float, y1: float, espessura: float = 1.0) -> set[tuple[int, int]]:
    saida = set()
    passos = int(max(abs(x1 - x0), abs(y1 - y0)) * 3) + 1
    for i in range(passos + 1):
        t = i / passos
        saida |= circulo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, espessura / 2 + 0.35)
    return saida


# ---------- famílias ----------
def chama(t: Tela, nivel: str, degrau: int) -> None:
    externa, meio, nucleo = CHAMAS[nivel]
    t.camada(retangulo(8, 25, 23, 27) | retangulo(10, 28, 21, 29), MADEIRA)
    altura = 6 + degrau
    topo = max(2, 18 - altura)
    corpo = poligono([(16, topo), (22.5, 13), (24, 19), (21, 25), (11, 25), (8, 19), (10, 14), (12.5, 17)])
    t.camada(corpo, [_hex(misturar(hexa(externa), hexa("#000000"), 0.45)), externa, externa, meio, nucleo])
    t.pintar(poligono([(16, topo + 6), (19.5, 16), (20, 21), (17.5, 24.5), (14.5, 24.5), (12, 21), (13, 17)]), meio)
    t.pintar(poligono([(16, topo + 11), (18, 19.5), (17.6, 23.5), (14.4, 23.5), (14, 20)]), nucleo)


def _hex(c: Cor) -> str:
    return "#%02x%02x%02x" % c[:3]


def calendario(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(retangulo(6, 8, 25, 27), PERGAMINHO)
    t.camada(retangulo(6, 6, 25, 11), METAIS[nivel])
    for x in (10, 21):
        t.camada(retangulo(x, 3, x + 1, 8), ["#222222", "#555555", "#777777", "#999999", "#cccccc"])
    marcados = min(12, (degrau + 1) * 2 - 1)
    k = 0
    for linha_ in range(3):
        for col in range(4):
            x, y = 9 + col * 4, 14 + linha_ * 4
            if k < marcados:
                t.pintar(linha(x, y + 1, x + 1, y + 2) | linha(x + 1, y + 2, x + 3, y), "#b3423a")
            else:
                t.pintar(retangulo(x, y, x + 2, y + 2), "#c9b07a")
            k += 1


def escudo(t: Tela, nivel: str, degrau: int) -> None:
    forma = poligono([(5, 5), (27, 5), (27, 15), (24, 22), (16, 29), (8, 22), (5, 15)])
    t.camada(forma, METAIS[nivel])
    t.camada(poligono([(8, 8), (24, 8), (24, 15), (21.5, 20.5), (16, 25.5), (10.5, 20.5), (8, 15)]), ["#0b3a35", "#14655e", "#1f7a6d", "#2b9583", "#7fd3c2"], contorno=False)
    t.camada(linha(11, 15.5, 14.5, 19.5, 2.2) | linha(14.5, 19.5, 21.5, 11, 2.2), ["#0d3b1f", "#e8f7ee", "#ffffff", "#ffffff", "#ffffff"], contorno=False)


def cristal(t: Tela, nivel: str, degrau: int) -> None:
    rampa = METAIS[nivel] if nivel != "bronze" else ["#3b1d0c", "#a3502a", "#e07a3f", "#f5a56b", "#ffe1c4"]
    t.camada(poligono([(16, 3), (26, 12), (16, 29), (6, 12)]), rampa)
    t.pintar(linha(6.5, 12, 25.5, 12, 0.6), rampa[1])
    t.pintar(linha(16, 3.5, 12, 12, 0.6) | linha(16, 3.5, 20, 12, 0.6), rampa[3])
    t.pintar(linha(12, 12, 16, 28, 0.6) | linha(20, 12, 16, 28, 0.6), rampa[1])
    t.brilho(11, 9)


def mapa(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(retangulo(6, 7, 25, 25), PERGAMINHO)
    t.camada(retangulo(4, 5, 7, 27), METAIS[nivel])
    t.camada(retangulo(24, 5, 27, 27), METAIS[nivel])
    t.pintar(linha(9, 21, 12, 17, 0.8) | linha(12, 17, 15, 19, 0.8) | linha(15, 19, 18, 13, 0.8), "#9c7a45")
    t.pintar(linha(18, 10, 22, 14, 1.4) | linha(22, 10, 18, 14, 1.4), "#b3423a")
    for i in range(min(degrau + 1, 3)):
        t.pintar(circulo(10 + i * 4, 11, 1.1), "#14655e")


def espadas(t: Tela, nivel: str, degrau: int) -> None:
    def espada(x0: float, y0: float, x1: float, y1: float) -> None:
        t.camada(linha(x0, y0, x1, y1, 2.2), METAIS["prata"] if nivel != "prata" else METAIS["ouro"])
        dx, dy = x1 - x0, y1 - y0
        comp = math.hypot(dx, dy)
        ux, uy = dx / comp, dy / comp
        gx, gy = x1 - ux * 6, y1 - uy * 6
        t.camada(linha(gx - uy * 4, gy + ux * 4, gx + uy * 4, gy - ux * 4, 2), METAIS[nivel])
        t.camada(linha(gx + ux * 0.5, gy + uy * 0.5, x1 + ux * 1.5, y1 + uy * 1.5, 2.2), MADEIRA)
    espada(6, 6, 25, 25)
    if degrau >= 1:
        espada(26, 6, 7, 25)
    if degrau >= 2:
        t.camada(poligono([(11, 21), (21, 21), (21, 26), (16, 30), (11, 26)]), METAIS[nivel])
    if degrau >= 3:
        t.camada(poligono([(10, 7), (12, 3), (14, 6), (16, 2), (18, 6), (20, 3), (22, 7), (22, 9), (10, 9)]), METAIS["ouro"])


def raio(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(16, 16, 13.5), ["#0b3a35", "#123f3a", "#14655e", "#1d7a6f", "#2b9583"])
    t.camada(poligono([(18, 3), (8, 18), (15, 18), (12, 29), (24, 13), (17, 13), (21, 3)]), METAIS[nivel])
    for i in range(degrau):
        t.brilho(6 + i * 3, 7 + (i % 2) * 2, "#fff4cf")


def alvo(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(15, 17, 13), METAIS[nivel])
    t.camada(circulo(15, 17, 10.5), VERMELHO, contorno=False)
    t.pintar(circulo(15, 17, 7.8), "#fff8e6")
    t.pintar(circulo(15, 17, 5.2), "#d33a3a")
    t.pintar(circulo(15, 17, 2.6), "#fff8e6")
    t.camada(linha(15, 17, 28, 4, 1.4), MADEIRA)
    t.camada(poligono([(27, 2), (31, 2), (29, 6), (28, 5)]) | poligono([(29, 5), (31, 7), (27, 7)]), METAIS["prata"])


def coracao(t: Tela, nivel: str, degrau: int) -> None:
    asa = poligono([(14, 12), (2, 6), (4, 11), (1, 12), (4, 16), (2, 18), (8, 19), (14, 18)])
    asa2 = {(N - 1 - x, y) for (x, y) in asa}
    t.camada(asa, METAIS[nivel])
    t.camada(asa2, METAIS[nivel])
    t.camada(circulo(12.5, 13, 5) | circulo(19.5, 13, 5) | poligono([(7.7, 14.5), (24.3, 14.5), (16, 26)]), VERMELHO)
    t.brilho(11, 11, "#ffd2c9")


def trofeu(t: Tela, nivel: str, degrau: int) -> None:
    taca = poligono([(7, 5), (25, 5), (24, 13), (20, 18), (12, 18), (8, 13)])
    alcas = linha(6, 8, 4, 12, 1.4) | linha(4, 12, 9, 15, 1.4) | linha(26, 8, 28, 12, 1.4) | linha(28, 12, 23, 15, 1.4)
    t.camada(alcas, METAIS[nivel])
    t.camada(taca | retangulo(14, 18, 17, 22) | retangulo(10, 23, 21, 25) | retangulo(8, 26, 23, 28), METAIS[nivel])
    t.pintar(retangulo(10, 26, 21, 27), "#5c3415")
    t.brilho(11, 8)
    if degrau >= 1:
        t.pintar(circulo(16, 10, 2), "#d33a3a")


def lua(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(16, 16, 14), NOITE)
    t.camada(circulo(14, 16, 9) - circulo(18, 13, 8), METAIS[nivel])
    for (x, y) in ((22, 8), (25, 17), (19, 24), (8, 7)):
        t.brilho(x, y, "#fff4cf")


def sol(t: Tela, nivel: str, degrau: int) -> None:
    raios = set()
    for i in range(8):
        a = i * math.pi / 4
        raios |= linha(16 + math.cos(a) * 9, 16 + math.sin(a) * 9, 16 + math.cos(a) * 14, 16 + math.sin(a) * 14, 2.2)
    t.camada(raios, METAIS["ouro"])
    t.camada(circulo(16, 16, 8), METAIS[nivel] if nivel != "ouro" else ["#7c2d12", "#c2410c", "#f97316", "#fdba74", "#fff7ed"])
    t.brilho(13, 13, "#fff4cf")


def medalha(t: Tela, nivel: str, degrau: int) -> None:
    fita = FITAS[degrau % len(FITAS)]
    escura = _hex(misturar(hexa(fita), hexa("#000000"), 0.45))
    t.camada(poligono([(8, 0), (13, 0), (17, 12), (12, 12)]), [escura, escura, fita, fita, fita])
    t.camada(poligono([(19, 0), (24, 0), (20, 12), (15, 12)]), [escura, escura, fita, fita, fita])
    t.camada(circulo(16, 20, 11), METAIS[nivel])
    t.camada(circulo(16, 20, 7.5), METAIS[nivel], contorno=False)
    osso = linha(11.5, 15.5, 20.5, 24.5, 1.6) | linha(20.5, 15.5, 11.5, 24.5, 1.6)
    t.pintar(osso, "#fff8e6")
    for (x, y) in ((11, 15), (20, 15), (11, 24), (20, 24)):
        t.pintar(circulo(x + 0.5, y + 0.5, 1.4), "#fff8e6")


CORES_TEMA = ["#b3423a", "#2b5fa8", "#1f7a4d", "#c9952f", "#7b3fa0", "#d06a1f", "#14655e", "#c2417a", "#3a6ea5", "#8a5226", "#4b5563"]


def estandarte(t: Tela, nivel: str, degrau: int) -> None:
    cor = CORES_TEMA[degrau % len(CORES_TEMA)]
    escura = _hex(misturar(hexa(cor), hexa("#000000"), 0.45))
    clara = _hex(misturar(hexa(cor), hexa("#ffffff"), 0.35))
    t.camada(retangulo(6, 3, 7, 30), MADEIRA)
    t.camada(circulo(6.5, 3, 2), METAIS["ouro"])
    t.camada(poligono([(8, 5), (27, 5), (27, 24), (17.5, 19), (8, 24)]), [escura, escura, cor, clara, clara])
    osso = linha(13, 9, 22, 16, 1.6) | linha(22, 9, 13, 16, 1.6)
    t.pintar(osso, "#fff8e6")
    for (x, y) in ((13, 9), (22, 9), (13, 16), (22, 16)):
        t.pintar(circulo(x + 0.5, y + 0.5, 1.3), "#fff8e6")
    t.camada(retangulo(8, 4, 27, 5), METAIS[nivel])


def ampulheta(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(retangulo(7, 3, 24, 5) | retangulo(7, 26, 24, 28), MADEIRA)
    t.camada(poligono([(9, 6), (22, 6), (17, 15.5), (22, 25), (9, 25), (14, 15.5)]), ["#2f3a3e", "#9fc3d6", "#cfe6f2", "#eef8fd", "#ffffff"])
    areia = ["#7a4a12", "#c98a2e", "#e8b34f", "#f5d58a", "#fff1c2"]
    t.camada(poligono([(11, 8), (20, 8), (16.5, 13), (14.5, 13)]), areia, contorno=False)
    altura = 3 + degrau * 2
    t.camada(poligono([(15.5, 24.5 - altura), (21, 24.5), (10, 24.5)]), areia, contorno=False)
    t.pintar(retangulo(15, 15, 16, 22), "#e8b34f")
    t.camada(retangulo(7, 6, 8, 25) | retangulo(23, 6, 24, 25), METAIS[nivel])


def estrela(t: Tela, nivel: str, degrau: int) -> None:
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = 14 if i % 2 == 0 else 6
        pts.append((16 + math.cos(a) * r, 17 + math.sin(a) * r))
    t.camada(poligono(pts), METAIS[nivel] if nivel != "bronze" else ["#3b1d0c", "#a3502a", "#e07a3f", "#f5a56b", "#ffe1c4"])
    t.brilho(12, 12)


def pena(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(retangulo(4, 14, 22, 28), PERGAMINHO)
    for y in (17, 20, 23):
        t.pintar(linha(7, y, 19, y, 0.6), "#9c7a45")
    t.camada(poligono([(27, 2), (30, 5), (17, 20), (14, 21), (15, 18)]), ["#3a3a3a", "#d4dde0", "#f4f7f8", "#ffffff", "#ffffff"])
    t.pintar(linha(28, 3.5, 15.5, 19.5, 0.6), "#9eacb1")
    t.camada(retangulo(4, 12, 22, 13) | retangulo(4, 28, 22, 29), METAIS[nivel])


def alvorada(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(16, 16, 14), ["#3b1d0c", "#d06a1f", "#f59e0b", "#fbbf24", "#fef3c7"])
    t.camada(circulo(16, 21, 7) & retangulo(0, 0, 31, 21), METAIS["ouro"], contorno=False)
    t.pintar(retangulo(3, 21, 28, 22), "#7a4220")
    t.camada(retangulo(3, 23, 28, 27) & circulo(16, 16, 13.4), ["#0d5247", "#0d5247", "#23907a", "#5cc9ad", "#d2fbef"], contorno=False)
    for i in range(5):
        a = math.pi + i * math.pi / 4
        t.pintar(linha(16 + math.cos(a) * 9, 21 + math.sin(a) * 9, 16 + math.cos(a) * 12, 21 + math.sin(a) * 12, 1), "#fff4cf")


def lanterna(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(16, 17, 14), NOITE)
    t.camada(linha(16, 3, 16, 7, 1.2), METAIS["prata"])
    t.camada(retangulo(11, 7, 20, 9) | retangulo(11, 24, 20, 26), METAIS[nivel])
    t.camada(retangulo(12, 10, 19, 23), ["#7c2d12", "#f59e0b", "#fbbf24", "#fde68a", "#fffbeb"])
    t.pintar(retangulo(15, 13, 16, 20), "#fffbeb")
    t.camada(retangulo(11, 10, 11, 23) | retangulo(20, 10, 20, 23), METAIS[nivel], contorno=False)
    for (x, y) in ((6, 9), (25, 12), (8, 24)):
        t.brilho(x, y, "#fff4cf")


def martelo(t: Tela, nivel: str, degrau: int) -> None:
    """Primeiros passos: o martelo ortopédico, cabo de madeira e cabeça de aço."""
    t.camada(linha(6, 28, 18, 14, 2.4), MADEIRA)
    t.pintar(linha(7, 26, 16.5, 15, 0.5), "#b47a45")
    t.camada(linha(4.5, 29.5, 7.5, 26.5, 3), ["#1f1206", "#3a2210", "#4f2e14", "#6b4220", "#8a5a30"])
    ux, uy = 0.75, 0.66
    vx, vy = -uy, ux
    cx, cy, meia, larg = 20.5, 11.5, 9.5, 3.6
    canto = lambda su, sv: (cx + ux * meia * su + vx * larg * sv, cy + uy * meia * su + vy * larg * sv)
    t.camada(poligono([canto(-1, -1), canto(1, -1), canto(1, 1), canto(-1, 1)]), METAIS["prata"])
    for su in (-1, 1):
        f = 0.78 * su
        t.camada(poligono([(cx + ux * meia * f + vx * larg * 1.15 * sv, cy + uy * meia * f + vy * larg * 1.15 * sv) for sv in (-1, 1)]
                          + [(cx + ux * meia * su * 1.05 + vx * larg * 1.15 * sv, cy + uy * meia * su * 1.05 + vy * larg * 1.15 * sv) for sv in (1, -1)]),
                 ["#232c30", "#4a565b", "#7d8b90", "#b7c3c7", "#ffffff"])
    t.camada(circulo(18.3, 14.2, 2.2), METAIS["bronze"])
    t.brilho(18, 8)
    for (x, y) in ((5, 6), (27, 25)):
        t.brilho(x, y, "#fff4cf")


def louros(t: Tela, cx: float, cy: float, r: float) -> None:
    folhas = ["#173d12", "#2f6b22", "#4f9a35", "#86c95a", "#d4f5b0"]
    for lado in (-1, 1):
        for i in range(7):
            a = math.radians(100 + i * 22)
            x, y = cx - lado * math.cos(a) * r, cy + math.sin(a) * r
            t.camada(circulo(x, y, 1.15) | circulo(x - lado * 0.9, y - 0.9, 0.9), folhas)


def preceptor(t: Tela, nivel: str, degrau: int) -> None:
    """Preceptor: ouro, louros, três gemas e uma estrela no topo."""
    verde, verde_escuro = "#1f7a4d", "#0d3b24"
    fita = [verde_escuro, verde_escuro, verde, verde, "#5cc98a"]
    t.camada(poligono([(8, 0), (13, 0), (16, 8), (12, 8)]), fita)
    t.camada(poligono([(19, 0), (24, 0), (20, 8), (16, 8)]), fita)
    t.pintar(retangulo(10, 0, 10, 4) | retangulo(21, 0, 21, 4), "#f5cd6b")
    cx, cy = 16, 18.5
    louros(t, cx, cy, 11.4)
    t.camada(circulo(cx, cy, 8.8), METAIS["ouro"])
    t.camada(circulo(cx, cy, 6.2), ["#3d2804", "#5c3d0d", "#6e4a14", "#8a5e17", "#b07a1c"], contorno=False)
    t.pintar(circulo(cx, cy, 6.2) - circulo(cx, cy, 5.5), "#3d2804")
    t.pintar(linha(12.8, 15.3, 19.2, 21.7, 1.3), "#fff8e6")
    for (x, y) in ((12.3, 14.8), (19.7, 22.2)):
        t.pintar(circulo(x, y, 1.2), "#fff8e6")
    t.pintar(linha(19.4, 15.4, 13.4, 21.4, 0.9), "#d4dde0")
    t.pintar(linha(19.6, 15.2, 18, 16.8, 0.6), "#ffffff")
    for ang, c in ((150, "#2b5fa8"), (90, "#d33a3a"), (30, "#1f7a4d")):
        x, y = cx + math.cos(math.radians(ang)) * 7.6, cy + math.sin(math.radians(ang)) * 7.6
        escura = _hex(misturar(hexa(c), hexa("#000000"), 0.5))
        clara = _hex(misturar(hexa(c), hexa("#ffffff"), 0.45))
        t.camada(circulo(x, y, 1.7), [escura, escura, c, clara, clara])
        t.ponto(round(x - 1), round(y - 1), hexa("#ffffff"))
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = 5.8 if i % 2 == 0 else 2.6
        pts.append((cx + math.cos(a) * r, 7.4 + math.sin(a) * r))
    estrela_ = poligono(pts)
    t.pintar({(x + dx, y + dy) for (x, y) in estrela_ for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))}, "#3d2804")
    t.camada(estrela_, ["#3d2804", "#d9a23a", "#f5cd6b", "#fff4cf", "#ffffff"], contorno=False)
    t.brilho(12, 13, "#fff4cf")
    for (x, y) in ((4, 6), (28, 5)):
        t.brilho(x, y, "#fff4cf")


def coroa(t: Tela, nivel: str, lugar: int) -> None:
    """Coroa do pódio: ouro para o 1º, prata para o 2º, bronze para o 3º."""
    corpo = poligono([(4, 12), (10, 19), (16, 8), (22, 19), (28, 12), (26, 26), (6, 26)])
    t.camada(corpo, METAIS[nivel])
    t.camada(retangulo(6, 23, 26, 27), METAIS[nivel])
    for (x, y) in ((4, 11), (16, 6), (28, 11)):
        t.camada(circulo(x + 0.5, y + 0.5, 1.9), METAIS[nivel])
    joias = ["#d33a3a", "#2b5fa8", "#1f7a4d"]
    for i, x in enumerate((10, 16, 22)):
        t.pintar(circulo(x + 0.5, 25.0, 1.5), joias[(i + lugar) % 3])
    t.brilho(12, 15)
    if lugar == 1:
        t.brilho(27, 3, "#fff4cf")
        t.brilho(4, 4, "#fff4cf")


FORMAS = {
    "questoes": medalha, "sequencia": chama, "dias": calendario, "acertos": escudo, "dominadas": cristal,
    "temas": mapa, "sessoes": espadas, "maratona": raio, "precisao": alvo, "redencao": coracao,
    "gabarito": trofeu, "secreta-madrugada": lua, "secreta-fim-de-semana": sol,
    "mestre": estandarte, "resistencia": ampulheta, "colecao": estrela, "anotacoes": pena,
    "secreta-madrugador": alvorada, "secreta-sextou": lanterna,
    "questoes-50": martelo, "questoes-2000": preceptor,
}



# ================= Artes novas (06/10/2026): uma silhueta por emblema =================
OSSO = ["#4a3f2c", "#b9a98a", "#e9dfc6", "#fbf6ea", "#ffffff"]
PELE = ["#4a2a18", "#a8653b", "#d99a6c", "#f0c39d", "#ffe9d6"]
AZUL = ["#0b1f4a", "#1d4ed8", "#3b82f6", "#93c5fd", "#e0f2fe"]
ROXO = ["#2a0a3d", "#6b21a8", "#9333ea", "#c084fc", "#f3e8ff"]
LAVA = ["#3b0a05", "#9a1c0c", "#e2491d", "#fb923c", "#fde68a"]
PEDRA = ["#1c1917", "#44403c", "#78716c", "#a8a29e", "#e7e5e4"]


def chama_livre(t: Tela, nivel: str, cx: float, base: float, altura: float, larg: float) -> None:
    externa, meio, nucleo = CHAMAS[nivel]
    topo = base - altura
    corpo = poligono([(cx, topo), (cx + larg * .55, base - altura * .55), (cx + larg * .5, base - altura * .15), (cx + larg * .3, base),
                      (cx - larg * .3, base), (cx - larg * .5, base - altura * .15), (cx - larg * .55, base - altura * .5), (cx - larg * .15, base - altura * .62)])
    t.camada(corpo, [_hex(misturar(hexa(externa), hexa("#000000"), 0.45)), externa, externa, meio, nucleo])
    t.pintar(poligono([(cx, topo + altura * .35), (cx + larg * .3, base - altura * .3), (cx + larg * .18, base - 1), (cx - larg * .18, base - 1), (cx - larg * .3, base - altura * .3)]), meio)
    t.pintar(poligono([(cx, topo + altura * .6), (cx + larg * .14, base - altura * .15), (cx, base - 1.5), (cx - larg * .14, base - altura * .15)]), nucleo)


def disco(t: Tela, rampa: list[str], r: float = 14) -> None:
    t.camada(circulo(16, 16, r), rampa)


# ---- sequência: tocha, lampião, farol, cometa, vulcão, orbe, chama alada ----
def seq_tocha(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(poligono([(14, 18), (18, 18), (17, 30), (15, 30)]), MADEIRA)
    t.camada(poligono([(11, 15), (21, 15), (19, 20), (13, 20)]), METAIS[nivel])
    t.pintar(retangulo(12, 16, 20, 16), hexa_str(METAIS[nivel][4]))
    chama_livre(t, nivel, 16, 15, 13, 12)


def hexa_str(c: str) -> str:
    return c


def seq_lampiao(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(linha(11, 6, 16, 2, 1) | linha(21, 6, 16, 2, 1), METAIS["prata"])
    t.camada(retangulo(9, 6, 22, 8) | retangulo(8, 26, 23, 29), METAIS[nivel])
    t.camada(retangulo(10, 9, 21, 25), ["#1e3a5f", "#9fc3d6", "#cfe6f2", "#eef8fd", "#ffffff"])
    chama_livre(t, nivel, 15.5, 24, 13, 9)
    t.camada(retangulo(9, 9, 10, 25) | retangulo(21, 9, 22, 25), METAIS[nivel], contorno=False)
    t.pintar(retangulo(15, 9, 16, 9), "#ffffff")


def seq_farol(t: Tela, nivel: str, degrau: int) -> None:
    for i, a in enumerate((-1, 1)):
        t.pintar(poligono([(16, 7), (16 + a * 15, 2), (16 + a * 15, 12)]), "#fff3b0")
    t.camada(poligono([(12, 12), (20, 12), (22, 28), (10, 28)]), ["#2a0d0d", "#f2f2f2", "#ffffff", "#ffffff", "#ffffff"])
    for y in (15, 21):
        t.pintar(poligono([(11.6, y), (20.4, y), (20.9, y + 3), (11.1, y + 3)]), "#d33a3a")
    t.camada(retangulo(11, 5, 21, 11), METAIS[nivel])
    t.pintar(retangulo(13, 7, 19, 10), CHAMAS[nivel][2])
    t.camada(poligono([(11, 5), (16, 1), (21, 5)]), METAIS[nivel])
    t.camada(retangulo(6, 28, 26, 30), PEDRA)


def seq_cometa(t: Tela, nivel: str, degrau: int) -> None:
    disco(t, NOITE)
    externa, meio, nucleo = CHAMAS[nivel]
    t.pintar(linha(6, 26, 18, 14, 4.5), externa)
    t.pintar(linha(9, 23, 19, 13, 2.8), meio)
    t.pintar(linha(12, 20, 19.5, 12.5, 1.4), nucleo)
    t.camada(circulo(20.5, 11.5, 4.2), METAIS[nivel])
    t.brilho(19, 10)
    for (x, y) in ((8, 8), (25, 22), (12, 4)):
        t.brilho(x, y, "#fff4cf")


def seq_vulcao(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(poligono([(2, 29), (12, 13), (20, 13), (30, 29)]), PEDRA)
    t.pintar(poligono([(13, 13), (19, 13), (21, 20), (18, 18), (16, 24), (14, 19), (11.5, 21)]), "#e2491d")
    t.pintar(poligono([(14.5, 13), (17.5, 13), (17, 17), (16, 20), (15, 17)]), "#fde68a")
    chama_livre(t, nivel, 16, 13, 11, 12)
    for (x, y, c) in ((7, 6, "#fb923c"), (25, 5, "#fb923c"), (9, 3, "#fde68a")):
        t.camada(circulo(x, y, 1.4), LAVA)


def seq_orbe(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(poligono([(9, 27), (23, 27), (21, 23), (11, 23)]) | retangulo(7, 27, 25, 30), METAIS["ouro"])
    t.camada(circulo(16, 14, 10), ["#04241f", "#0d5247", "#1a6e60", "#23907a", "#5cc9ad"])
    chama_livre(t, nivel, 16, 21, 13, 11)
    t.pintar(circulo(16, 14, 10) - circulo(16, 14, 9.2), "#d2fbef")
    t.brilho(11, 9, "#ffffff")


def seq_alada(t: Tela, nivel: str, degrau: int) -> None:
    asa = poligono([(13, 17), (1, 8), (3, 13), (0, 15), (4, 19), (2, 22), (9, 23), (13, 21)])
    t.camada(asa, METAIS[nivel])
    t.camada({(N - 1 - x, y) for (x, y) in asa}, METAIS[nivel])
    for y in (13, 17, 20):
        t.pintar(linha(4, y, 11, y + 1, 0.5), METAIS[nivel][1])
        t.pintar(linha(27, y, 20, y + 1, 0.5), METAIS[nivel][1])
    chama_livre(t, nivel, 16, 28, 24, 14)
    t.camada(poligono([(10, 5), (12, 1), (14, 4), (16, 0), (18, 4), (20, 1), (22, 5)]), METAIS["ouro"])


# ---- mestres de tema: escudo hexagonal na cor do tema, com o símbolo da área ----
def moldura_tema(t: Tela, cor: str) -> None:
    escura = _hex(misturar(hexa(cor), hexa("#000000"), 0.5))
    clara = _hex(misturar(hexa(cor), hexa("#ffffff"), 0.35))
    hexagono = poligono([(16, 1), (29, 8.5), (29, 23.5), (16, 31), (3, 23.5), (3, 8.5)])
    t.camada(hexagono, METAIS["ouro"])
    t.camada(poligono([(16, 4), (26.5, 10), (26.5, 22), (16, 28), (5.5, 22), (5.5, 10)]), [escura, escura, cor, clara, clara], contorno=False)


def osso_h(cx: float, cy: float, comp: float, esp: float) -> set[tuple[int, int]]:
    a, b = cx - comp / 2, cx + comp / 2
    return linha(a, cy, b, cy, esp) | circulo(a, cy - esp * .55, esp * .62) | circulo(a, cy + esp * .55, esp * .62) | circulo(b, cy - esp * .55, esp * .62) | circulo(b, cy + esp * .55, esp * .62)


def icone_coluna(t: Tela) -> None:
    for i, (x, y) in enumerate(((12, 7), (11, 12), (11, 17), (12, 22))):
        t.camada(retangulo(x, y, x + 6, y + 3), OSSO)
        t.camada(poligono([(x + 6, y + 1), (x + 12, y + 2.5), (x + 11, y + 4), (x + 6, y + 3)]), OSSO)


def icone_livro(t: Tela) -> None:
    t.camada(poligono([(5, 10), (16, 12), (16, 25), (5, 23)]), ["#3d2804", "#e9dfc6", "#fbf6ea", "#ffffff", "#ffffff"])
    t.camada(poligono([(27, 10), (16, 12), (16, 25), (27, 23)]), ["#3d2804", "#d9cdb0", "#f2e8d0", "#fbf6ea", "#ffffff"])
    for y in (14, 17, 20):
        t.pintar(linha(7, y, 14, y + 1, 0.5), "#9c7a45")
        t.pintar(linha(18, y + 1, 25, y, 0.5), "#9c7a45")
    t.camada(osso_h(16, 7, 8, 1.6), OSSO)


def icone_joelho(t: Tela) -> None:
    femur = retangulo(13, 3, 18, 10) | circulo(12.5, 13, 3.6) | circulo(19, 13, 3.6)
    t.camada(femur, OSSO)
    t.camada(retangulo(9, 18, 23, 21) | poligono([(11, 21), (21, 21), (18.5, 25), (18.5, 29), (13, 29), (13, 25)]), OSSO)
    t.camada(circulo(24, 13, 2.4), OSSO)
    t.pintar(retangulo(15, 11, 16, 15), "#b9a98a")


def icone_mao(t: Tela) -> None:
    palma = retangulo(10, 15, 21, 26)
    dedos = retangulo(10, 7, 12, 15) | retangulo(13, 5, 15, 15) | retangulo(16, 6, 18, 15) | retangulo(19, 8, 21, 15)
    polegar = linha(10, 22, 6, 15, 2.6)
    t.camada(palma | dedos | polegar, PELE)
    for x in (13, 16, 19):
        t.pintar(retangulo(x, 9, x, 14), PELE[1])


def icone_braco(t: Tela) -> None:
    escapula = poligono([(5, 4), (12, 6), (11, 12), (13, 18), (11, 26), (6, 22)])
    t.camada(escapula, OSSO)
    t.camada(linha(18, 17, 24, 28, 4.4) | circulo(24.5, 28.5, 2.6), OSSO)
    t.camada(circulo(16.5, 14.5, 5.2), OSSO)
    t.camada(poligono([(10, 7), (17, 5), (21, 7), (17, 8)]), OSSO)
    t.pintar(linha(11.6, 10, 11.6, 19, 0.6), "#b9a98a")


def icone_trabecular(t: Tela) -> None:
    t.camada(circulo(16, 16, 10), OSSO)
    t.pintar(circulo(16, 16, 7.5), "#d9c9a5")
    for (x, y) in ((13, 13), (18, 12), (20, 17), (15, 18), (11, 18), (17, 21), (14, 9), (21, 13)):
        t.pintar(circulo(x, y, 1.3), "#8a6b3c")


def icone_pe(t: Tela) -> None:
    pe = retangulo(9, 5, 15, 16) | circulo(11, 22, 4.5) | poligono([(8, 16), (15, 14), (25, 21), (26.5, 25.5), (11, 26.5)])
    t.camada(pe, PELE)
    for (x, y) in ((25, 21.5), (22.5, 20), (20, 19), (17.5, 18)):
        t.camada(circulo(x, y - 0.5, 1.4), PELE, contorno=False)
    t.pintar(linha(12, 20, 18, 21, 0.5), PELE[1])


def icone_urso(t: Tela) -> None:
    marrom = ["#3a2010", "#7a4a26", "#a8693c", "#c98d5c", "#ecc39c"]
    t.camada(circulo(16, 21, 7.5), marrom)
    t.camada(circulo(16, 11, 6.5) | circulo(10.5, 6, 2.6) | circulo(21.5, 6, 2.6), marrom)
    t.pintar(circulo(16, 13, 2.6), "#ecc39c")
    t.pintar(retangulo(13, 9, 13, 10) | retangulo(19, 9, 19, 10) | retangulo(15, 12, 17, 12), "#1c1917")
    t.pintar(circulo(16, 22, 3.6), "#ecc39c")


def icone_femur(t: Tela) -> None:
    t.camada(linha(17, 13, 22, 29, 3.6), OSSO)
    t.camada(linha(17, 13, 11, 9, 3), OSSO)
    t.camada(circulo(10, 8, 4), OSSO)
    t.camada(circulo(20.5, 12, 2.6), OSSO)
    t.pintar(circulo(9, 7, 6) - circulo(10, 8, 5), "#c9952f")


def icone_fratura(t: Tela) -> None:
    def ponta(x: float, y: float) -> set[tuple[int, int]]:
        return circulo(x - 1.6, y - 1.6, 2.2) | circulo(x + 1.6, y + 1.6, 2.2)
    a = linha(8, 24, 15, 17, 3.4) | ponta(7, 25)
    b = linha(17.5, 14.5, 24, 8, 3.4) | ponta(25, 7)
    t.camada(a, OSSO)
    t.camada(b, OSSO)
    t.pintar(linha(14.2, 15.2, 16.2, 17.8, 0.8) | linha(16.2, 13.2, 18.2, 15.8, 0.8), "#4a3f2c")
    t.pintar(poligono([(19, 18), (23, 18.5), (20, 21), (24, 23), (18.5, 22), (21, 20)]), "#f4cf7c")


def icone_celula(t: Tela) -> None:
    t.camada(poligono([(16, 5), (24, 8), (27, 16), (23, 25), (14, 27), (6, 21), (6, 11)]), ["#2a0a3d", "#c4a5e8", "#e3d3f7", "#f3ebfc", "#ffffff"])
    t.camada(circulo(15, 16, 5), ROXO)
    t.pintar(circulo(14, 15, 1.6), "#f3e8ff")
    for (x, y) in ((22, 12), (21, 21), (9, 13), (11, 22)):
        t.pintar(circulo(x, y, 1), "#9333ea")


ICONES_TEMA = {
    "coluna": ("#2b5fa8", icone_coluna), "conceitos-basicos": ("#14655e", icone_livro), "joelho": ("#1f7a4d", icone_joelho),
    "mao": ("#c9952f", icone_mao), "ombro-cotovelo": ("#d06a1f", icone_braco), "osteometabolicas": ("#4b5563", icone_trabecular),
    "pe-tornozelo": ("#3a6ea5", icone_pe), "pediatria": ("#c2417a", icone_urso), "quadril": ("#7b3fa0", icone_femur),
    "trauma": ("#b3423a", icone_fratura), "tumores": ("#5b21b6", icone_celula),
}


def mestre_tema(id_: str):
    cor, icone = ICONES_TEMA[id_.replace("mestre-", "")]
    def desenho(t: Tela, nivel: str, degrau: int) -> None:
        moldura_tema(t, cor)
        icone(t)
    return desenho


# ---- redenção: curativo, calo ósseo, coração costurado, pena em chamas, fênix ----
def red_curativo(t: Tela, nivel: str, degrau: int) -> None:
    faixa = poligono([(4, 21), (21, 4), (28, 11), (11, 28)])
    t.camada(faixa, ["#5a3a22", "#c98d5c", "#e8b48a", "#f5d2b3", "#fff1e3"])
    t.camada(poligono([(11, 14), (14, 11), (21, 18), (18, 21)]), ["#7a5a3a", "#efe6d8", "#fbf6ea", "#ffffff", "#ffffff"], contorno=False)
    for (x, y) in ((8, 20), (10, 22), (22, 9), (24, 11), (20, 7), (6, 18)):
        t.ponto(x, y, hexa("#a8653b"))
    t.camada(poligono([(2, 2), (5, 1), (7, 4), (4, 6)]), METAIS[nivel])


def red_calo(t: Tela, nivel: str, degrau: int) -> None:
    def ponta(x: float, y: float) -> set[tuple[int, int]]:
        return circulo(x - 1.8, y - 1.8, 2.5) | circulo(x + 1.8, y + 1.8, 2.5)
    t.camada(linha(8, 24, 24, 8, 4.2) | ponta(6.5, 25.5) | ponta(25.5, 6.5), OSSO)
    t.camada(circulo(16, 16, 4.8), ["#4a3f2c", "#c9b88f", "#ddd0ae", "#f0e7cf", "#ffffff"])
    t.pintar(linha(13.5, 17.5, 18.5, 14.5, 0.6), "#9c8a64")
    t.camada(poligono([(24, 21), (26, 25), (30, 26), (26, 27.5), (24, 31), (22.5, 27.5), (19, 26), (22.5, 25)]), METAIS[nivel], contorno=False)


def red_costurado(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(11, 12, 6.5) | circulo(21, 12, 6.5) | poligono([(4.8, 14), (27.2, 14), (16, 28)]), VERMELHO)
    t.pintar(linha(16, 8, 14, 13, 0.7) | linha(14, 13, 18, 18, 0.7) | linha(18, 18, 15, 24, 0.7), "#4c0d0d")
    for (x, y) in ((13, 10), (17, 11), (13, 15), (19, 16), (13, 20), (17, 22)):
        t.pintar(linha(x, y, x + 2, y, 0.5), "#ffd2c9")
    t.brilho(9, 9, "#ffd2c9")
    t.camada(poligono([(13, 1), (19, 1), (16, 5)]), METAIS[nivel])


def red_pena(t: Tela, nivel: str, degrau: int) -> None:
    chama_livre(t, "bronze", 16, 30, 16, 20)
    t.camada(poligono([(24, 3), (27, 5), (14, 24), (10, 26), (11, 22)]), ["#04241f", "#0d5247", "#23907a", "#5cc9ad", "#d2fbef"])
    t.pintar(linha(25.5, 4, 11, 25, 0.6), "#d2fbef")
    for i in range(4):
        y = 8 + i * 4
        t.pintar(linha(24 - i * 3, y, 27 - i * 3, y + 3, 0.5), "#5cc9ad")


def red_fenix(t: Tela, nivel: str, degrau: int) -> None:
    fogo = ["#7c1d06", "#dc2626", "#f97316", "#fbbf24", "#fef3c7"]
    asa = poligono([(14, 15), (1, 3), (3, 9), (0, 10), (4, 14), (1, 17), (7, 19), (13, 19)])
    t.camada(asa, fogo)
    t.camada({(N - 1 - x, y) for (x, y) in asa}, fogo)
    t.camada(poligono([(12, 28), (16, 31), (20, 28), (18, 24), (16, 27), (14, 24)]), ["#7c1d06", "#f97316", "#fbbf24", "#fde68a", "#fef3c7"])
    t.camada(circulo(16, 17, 4.5) | poligono([(12, 18), (20, 18), (16, 26)]), ["#4c0d0d", "#b91c1c", "#ef4444", "#fca5a5", "#fee2e2"])
    t.camada(circulo(16, 10, 3.2), ["#4c0d0d", "#b91c1c", "#ef4444", "#fca5a5", "#fee2e2"])
    t.pintar(poligono([(18.5, 10), (21.5, 11), (18.5, 12)]), "#fbbf24")
    t.ponto(17, 9, hexa("#1c1917"))
    t.camada(poligono([(14, 6), (15, 3), (16, 6), (17, 2), (18, 6)]), ["#7c1d06", "#f97316", "#fbbf24", "#fde68a", "#fef3c7"], contorno=False)


# ---- alvo com mais flechas a cada degrau ----
def alvo_flechas(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(14, 18, 12.5), METAIS[nivel])
    t.camada(circulo(14, 18, 10), VERMELHO, contorno=False)
    t.pintar(circulo(14, 18, 7.4), "#fff8e6")
    t.pintar(circulo(14, 18, 4.9), "#d33a3a")
    t.pintar(circulo(14, 18, 2.4), "#fff8e6")
    pontas = [(29, 3), (21, 1), (31, 11), (26, 0)][: degrau + 1]
    for i, (x, y) in enumerate(pontas):
        cx, cy = 14 + (i % 2) * 1.2, 18 - (i // 2) * 1.2
        t.camada(linha(cx, cy, x, y, 1.3), MADEIRA)
        t.camada(poligono([(x - 2, y), (x + 1, y - 1), (x, y + 2)]), ["#4c0d0d", "#b3423a", "#d33a3a", "#f07a6a", "#ffd2c9"])


# ---- especialistas por prova ----
def esp_diploma(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(retangulo(5, 8, 27, 22), PERGAMINHO)
    t.camada(retangulo(3, 6, 6, 24) | retangulo(26, 6, 29, 24), PERGAMINHO)
    for y in (11, 14, 17):
        t.pintar(linha(9, y, 23, y, 0.5), "#9c7a45")
    t.camada(poligono([(19, 21), (17, 30), (20, 28), (22, 31), (23, 21)]), VERMELHO)
    t.camada(circulo(21, 20, 3.6), METAIS["ouro"])


def esp_capelo(t: Tela, nivel: str, degrau: int) -> None:
    preto = ["#05080a", "#1f2a30", "#2f3d44", "#43555e", "#6b818b"]
    t.camada(poligono([(16, 6), (30, 12), (16, 18), (2, 12)]), preto)
    t.camada(poligono([(8, 15), (24, 15), (24, 22), (16, 25), (8, 22)]), preto)
    t.camada(linha(27, 13, 27, 23, 0.8), METAIS["ouro"])
    t.camada(circulo(27, 24.5, 1.8), METAIS["ouro"])
    t.pintar(circulo(16, 12, 1.2), hexa_str("#c9952f"))


def esp_luva(t: Tela, nivel: str, degrau: int) -> None:
    palma = retangulo(10, 14, 21, 24) | retangulo(11, 24, 20, 30)
    dedos = retangulo(10, 6, 12, 14) | retangulo(13, 4, 15, 14) | retangulo(16, 5, 18, 14) | retangulo(19, 7, 21, 14)
    t.camada(palma | dedos | linha(10, 21, 6, 14, 2.6), AZUL)
    t.camada(poligono([(24, 2), (26, 3), (21, 16), (19.5, 15.5)]), METAIS["prata"])
    t.pintar(retangulo(11, 26, 20, 26), "#93c5fd")


def esp_parafusos(t: Tela, nivel: str, degrau: int) -> None:
    for i, y in enumerate((5, 13, 21)):
        t.camada(retangulo(8, y, 14, y + 5), OSSO)
    t.camada(retangulo(17, 3, 19, 29), METAIS["prata"])
    for y in (7, 15, 23):
        t.camada(retangulo(11, y, 23, y + 1), METAIS[nivel])
        t.camada(circulo(23.5, y + 0.5, 2.2), METAIS[nivel])
        for x in (12, 14, 16):
            t.ponto(x, y + 2, hexa("#5f6d72"))


def esp_prancheta(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(retangulo(6, 5, 26, 30), MADEIRA)
    t.camada(retangulo(9, 9, 23, 27), ["#5f6d72", "#e8ecee", "#ffffff", "#ffffff", "#ffffff"])
    t.camada(retangulo(12, 3, 20, 7), METAIS[nivel])
    for i, y in enumerate((12, 17, 22)):
        t.pintar(linha(10.5, y + 1, 12, y + 2.5, 0.7) | linha(12, y + 2.5, 14.5, y - .5, 0.7), "#1f7a4d")
        t.pintar(linha(16, y + 1, 21, y + 1, 0.5), "#9eacb1")


def esp_ombro(t: Tela, nivel: str, degrau: int) -> None:
    fio_a, fio_b = "#2b5fa8", "#1f7a4d"
    for i in range(10):
        y = 4 + i * 1.4
        t.pintar(circulo(9 + math.sin(i * 0.9) * 3, y, 0.8), fio_a)
        t.pintar(circulo(23 + math.sin(i * 0.9 + 2) * 3, y, 0.8), fio_b)
    t.camada(circulo(16, 15, 3.4) - circulo(16, 15, 1.6), METAIS["prata"])
    t.camada(poligono([(13, 18), (19, 18), (18.5, 26), (16, 30), (13.5, 26)]), METAIS[nivel])
    for y in (20, 22.5, 25):
        t.pintar(linha(12.5, y, 19.5, y - 1, 0.6), METAIS[nivel][1])
    t.pintar(linha(10, 17, 15, 15, 0.7), fio_a)
    t.pintar(linha(22, 17, 17, 15, 0.7), fio_b)


def esp_protese(t: Tela, nivel: str, degrau: int) -> None:
    taca = circulo(13, 11, 9.5) - circulo(13, 11, 7) - retangulo(0, 12, 31, 31)
    t.camada(taca, METAIS["ouro"])
    t.camada(circulo(13, 11, 6), ["#3a3a3a", "#c7ccd1", "#e5e8eb", "#f7f8f9", "#ffffff"])
    t.camada(linha(15.5, 15, 20.5, 19, 2.6), METAIS["prata"])
    t.camada(poligono([(18, 17.5), (25, 18), (23.5, 23), (21.5, 30), (19.5, 30), (19, 22)]), METAIS[nivel])
    t.brilho(11, 9)


# ---- aproveitamento: medidor com o número ----
DIGITOS = {
    "0": ["111", "101", "101", "101", "111"], "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"], "9": ["111", "101", "111", "001", "111"], "%": ["101", "001", "010", "100", "101"],
}


def texto_pixel(t: Tela, texto: str, x: int, y: int, cor: str, escala: int = 1) -> None:
    for i, ch in enumerate(texto):
        for ly, linha_ in enumerate(DIGITOS[ch]):
            for lx, b in enumerate(linha_):
                if b == "1":
                    t.pintar(retangulo(x + (i * 4 + lx) * escala, y + ly * escala, x + (i * 4 + lx) * escala + escala - 1, y + ly * escala + escala - 1), cor)


def aproveitamento(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(16, 16, 14), METAIS[nivel])
    t.camada(circulo(16, 16, 11.5), ["#0b3a35", "#0b3a35", "#123f3a", "#14655e", "#2b9583"], contorno=False)
    pct = (60, 70, 80, 90)[degrau]
    for i in range(9):
        a = math.pi * (1 + i / 8)
        cor = "#b3423a" if i < 3 else "#c9952f" if i < 6 else "#5cc98a"
        t.pintar(linha(16 + math.cos(a) * 9, 17 + math.sin(a) * 9, 16 + math.cos(a) * 10.6, 17 + math.sin(a) * 10.6, 1), cor)
    a = math.pi * (1 + pct / 100)
    t.pintar(linha(16, 17, 16 + math.cos(a) * 8, 17 + math.sin(a) * 8, 1.2), "#ffffff")
    t.camada(circulo(16, 17, 1.6), METAIS[nivel], contorno=False)
    texto_pixel(t, f"{pct}%", 9, 21, "#ffffff")


# ---- secretas novas ----
def sec_relogio(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(16, 17, 13), METAIS[nivel])
    t.pintar(circulo(16, 17, 10.5), "#0b1330")
    for i in range(12):
        a = i * math.pi / 6
        t.ponto(round(16 + math.cos(a) * 9), round(17 + math.sin(a) * 9), hexa("#dfe6ff"))
    t.pintar(linha(16, 17, 19.5, 18.8, 1.2), "#f4cf7c")
    t.pintar(linha(16, 17, 23, 13.5, 0.8), "#ffffff")
    t.camada(retangulo(14, 2, 18, 4), METAIS[nivel])


def sec_coruja(t: Tela, nivel: str, degrau: int) -> None:
    disco(t, NOITE)
    t.camada(circulo(24, 7, 3) - circulo(25.5, 6, 2.6), METAIS["ouro"])
    corpo = ["#2a1a0c", "#6b4a2a", "#8f6a43", "#b48b5f", "#e0c49c"]
    t.camada(circulo(16, 19, 7.5) | poligono([(9, 9), (12, 13), (20, 13), (23, 9), (22, 16), (10, 16)]), corpo)
    for x in (13, 19):
        t.pintar(circulo(x, 15, 2.6), "#fef3c7")
        t.pintar(circulo(x, 15, 1.2), "#1c1917")
    t.pintar(poligono([(15, 17), (17, 17), (16, 19.5)]), "#f59e0b")
    t.camada(retangulo(6, 26, 26, 27), MADEIRA)


def sec_virada(t: Tela, nivel: str, degrau: int) -> None:
    t.camada(circulo(16, 16, 13), METAIS[nivel])
    t.pintar(circulo(16, 16, 10.5), "#0b3a35")
    seta = set()
    for i in range(22):
        a = math.radians(200 + i * 13)
        seta |= circulo(16 + math.cos(a) * 6.5, 16 + math.sin(a) * 6.5, 1.3)
    t.pintar(seta, "#5cc98a")
    t.pintar(poligono([(6.5, 10), (12, 11), (8, 16)]), "#5cc98a")
    t.pintar(linha(13, 17, 15, 19, 1) | linha(15, 19, 19.5, 13.5, 1), "#ffffff")


def sec_natal(t: Tela, nivel: str, degrau: int) -> None:
    verde = ["#052e16", "#166534", "#16a34a", "#4ade80", "#dcfce7"]
    t.camada(poligono([(16, 3), (24, 13), (20, 13), (27, 22), (5, 22), (12, 13), (8, 13)]), verde)
    t.camada(retangulo(14, 22, 18, 27), MADEIRA)
    for (x, y, c) in ((13, 11, "#ef4444"), (19, 16, "#fbbf24"), (11, 19, "#3b82f6"), (21, 20, "#ef4444"), (16, 15, "#f4f4f5")):
        t.pintar(circulo(x, y, 1.1), c)
    t.camada(poligono([(16, 0), (17.2, 2.5), (19.5, 2.8), (17.8, 4.4), (18.2, 6.8), (16, 5.6), (13.8, 6.8), (14.2, 4.4), (12.5, 2.8), (14.8, 2.5)]), METAIS["ouro"], contorno=False)


def sec_ano_novo(t: Tela, nivel: str, degrau: int) -> None:
    disco(t, NOITE)
    for (cx, cy, c) in ((11, 11, "#f4cf7c"), (21, 13, "#f472b6"), (15, 21, "#5cc9ad")):
        for i in range(8):
            a = i * math.pi / 4
            t.pintar(linha(cx + math.cos(a) * 1.5, cy + math.sin(a) * 1.5, cx + math.cos(a) * 4.5, cy + math.sin(a) * 4.5, 0.7), c)
        t.ponto(cx, cy, hexa("#ffffff"))
    t.pintar(linha(20, 27, 21, 18, 0.5), "#f472b6")


FORMAS.update({
    "sequencia-7": seq_tocha, "sequencia-14": seq_lampiao, "sequencia-30": seq_farol, "sequencia-60": seq_cometa,
    "sequencia-100": seq_vulcao, "sequencia-200": seq_orbe, "sequencia-365": seq_alada,
    "redencao-10": red_curativo, "redencao-50": red_calo, "redencao-100": red_costurado, "redencao-250": red_pena, "redencao-500": red_fenix,
    "precisao": alvo_flechas,
    "especialista-teot": esp_diploma, "especialista-taro": esp_capelo, "especialista-mao": esp_luva, "especialista-coluna": esp_parafusos,
    "especialista-enare": esp_prancheta, "especialista-tecoc": esp_ombro, "especialista-quadril": esp_protese,
    "aproveitamento": aproveitamento,
    "secreta-3h14": sec_relogio, "secreta-insone": sec_coruja, "secreta-virada": sec_virada, "secreta-natal": sec_natal, "secreta-ano-novo": sec_ano_novo,
})
for _tema in ICONES_TEMA:
    FORMAS[f"mestre-{_tema}"] = mestre_tema(f"mestre-{_tema}")

def desenhar(id_: str, familia: str, nivel: str, degrau: int) -> Tela:
    t = Tela()
    FORMAS.get(id_, FORMAS.get(familia, medalha))(t, nivel, degrau)
    if nivel in ("ouro", "esmeralda", "lendario"):
        t.brilho(27, 4, "#fff4cf")
    if nivel in ("esmeralda", "lendario"):
        t.brilho(4, 26, "#d2fbef" if nivel == "esmeralda" else "#f3e6ff")
    if nivel == "lendario":
        t.aura("#b98cf0")
    return t


def gravar_png(caminho: Path, t: Tela, escala: int = 4) -> None:
    largura = N * escala
    dados = bytearray()
    for linha_ in t.px:
        bruta = b"".join(bytes(p if p is not None else (0, 0, 0, 0)) * escala for p in linha_)
        for _ in range(escala):
            dados += b"\x00" + bruta

    def bloco(tipo: bytes, conteudo: bytes) -> bytes:
        return struct.pack(">I", len(conteudo)) + tipo + conteudo + struct.pack(">I", zlib.crc32(tipo + conteudo) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + bloco(b"IHDR", struct.pack(">IIBBBBB", largura, largura, 8, 6, 0, 0, 0))
    png += bloco(b"IDAT", zlib.compress(bytes(dados), 9)) + bloco(b"IEND", b"")
    caminho.write_bytes(png)


def catalogo() -> list[tuple[str, str, str]]:
    """(id, família, nível) de cada emblema, lidos de src/estado/conquistas.ts."""
    texto = CATALOGO.read_text(encoding="utf-8")
    saida = []
    for bloco in re.finditer(r"familia\('([a-z]+)', '[a-zA-Z]+', \[(.*?)\](?:, true)?\)", texto, re.S):
        for m in re.finditer(r"\['([a-z0-9-]+)', [\d]+, '[^']*', '[^']*', '([a-z]+)'", bloco.group(2)):
            saida.append((m.group(1), bloco.group(1), m.group(2)))
    return saida


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    degraus: dict[str, int] = {}
    gerados = 0
    for id_, familia, nivel in catalogo():
        degrau = degraus.get(familia, 0)
        degraus[familia] = degrau + 1
        if id_ in ARTE_PROPRIA:
            continue
        gravar_png(PASTA / f"{id_}.png", desenhar(id_, familia, nivel, degrau))
        gerados += 1
    for lugar, nivel in ((1, "ouro"), (2, "prata"), (3, "bronze")):
        if f"podio-{lugar}" not in ARTE_PROPRIA:
            t = Tela()
            coroa(t, nivel, lugar)
            gravar_png(PASTA / f"podio-{lugar}.png", t)
    ids = sorted(p.stem for p in PASTA.glob("*.png"))
    corpo = "".join(f"  '{i}',\n" for i in ids)
    texto = LISTA.read_text(encoding="utf-8")
    texto = re.sub(r"new Set<string>\(\[\n.*?\]\)", f"new Set<string>([\n{corpo}])", texto, flags=re.S)
    LISTA.write_text(texto, encoding="utf-8")
    print(f"{gerados} emblemas desenhados; {len(ids)} com arte no total.")


if __name__ == "__main__":
    main()
