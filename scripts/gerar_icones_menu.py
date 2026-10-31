"""Ícones em pixel art do menu principal ("Portal do Aventureiro").

Família nova, desenhada só para o menu (nenhum ícone é cópia dos atalhos da página inicial).
Cada pixel sai deste script; nada baixado, nada de IA de imagem.

LINGUAGEM DA FAMÍLIA
--------------------
- Grade: 32x32 para os 6 ícones principais (mostrados a 64 px CSS) e 24x24 para os secundários
  (mostrados a 48 px CSS). Exportados ampliados 4x sem suavização (128 e 96 px), PNG indexado com
  fundo transparente.
- Margem: 1 px livre em volta na grade (nada encosta na borda), a silhueta ocupa ~85% da caixa.
- Contorno: 1 px, sempre a cor mais escura da rampa do próprio material (marrom de tinta no papel e
  na madeira, verde-escuro no verdete etc.), nunca preto puro. Onde um objeto passa na frente de
  outro, o contorno dele também passa por cima (``por_cima=True``) para separar os planos.
- Luz: única, do alto à esquerda. A borda de cima/esquerda de cada forma recebe o tom de luz, a de
  baixo/direita o de sombra; o miolo fica no tom base. Brilho especular (tom 5) só em metal, vidro,
  gema e osso, em 1 a 3 pixels perto do canto de cima à esquerda.
- Rampas: 5 tons por material (contorno, sombra, base, luz, brilho), herdadas dos emblemas e dos
  atalhos (PERGAMINHO, MADEIRA, ouro, prata) e completadas com o verdete da marca (#14655e), o ouro
  da marca (#f0c46a / #f4cf7c), papel marfim, osso de luz fria (Atlas), vermelho de erro e azul.
  Nada de cor lamacenta: as rampas variam em matiz (sombras mais frias, luzes mais quentes).
- Contraste: o miolo de cada ícone fica claro o bastante para não sumir no marfim (#fbfaf6) e o
  contorno escuro garante a leitura no fundo escuro (#171e1d).
- Detalhe: um só "detalhe herói" por ícone (o lápis, a areia, o "?", o tique, a fita), sem ruído e
  sem pixel solto (o script confere pixels órfãos antes de gravar).

Uso: python3 scripts/gerar_icones_menu.py [--prancha caminho.png]
Saída: public/pixel/menu/<nome>.png
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parents[1]
PASTA = RAIZ / "public" / "pixel" / "menu"
ESCALA = 4

Cor = tuple[int, int, int, int]
Mascara = set[tuple[int, int]]


def hexa(c: str, a: int = 255) -> Cor:
    return int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), a


# ---------- rampas: contorno, sombra, base, luz, brilho ----------
PERGAMINHO = ["#4a3418", "#9c7a45", "#d9bf86", "#f2e3bb", "#fff8e6"]
PAPEL = ["#4a3418", "#c7b089", "#efe3c4", "#fff8e8", "#ffffff"]
MADEIRA = ["#2a1608", "#5c3415", "#8a5226", "#b47a45", "#d9a877"]
OURO = ["#3d2804", "#a8741a", "#e0aa45", "#f4cf7c", "#fff4cf"]
PRATA = ["#232c30", "#6b787c", "#a5b2b6", "#d4dde0", "#ffffff"]
VERDETE = ["#06302b", "#0f4f49", "#14655e", "#2f9a86", "#9fe3d2"]
VERDE_TIQUE = ["#0a3a22", "#1f7a4d", "#2f9a5e", "#5cc98a", "#d6f7e2"]
VERMELHO = ["#3d0a0a", "#8f1d1d", "#c4362f", "#e8695a", "#ffd2c9"]
AZUL = ["#0e1d3f", "#22457f", "#2f62a8", "#5b8fd8", "#cfe0ff"]
ROSA = ["#4a1a22", "#b9566a", "#e08494", "#f4b3be", "#ffe4ea"]
GRAFITE = ["#14181a", "#3a4246", "#5b686c", "#8a979b", "#c9d3d6"]
PELE = ["#4a2a14", "#c98a5a", "#f2c08a", "#f8d6ad", "#fff0dc"]
VIDRO = ["#1d3a44", "#7fa8ae", "#c4e2de", "#e8f6f3", "#ffffff"]
# Osso do Atlas: marfim com luz fria (realce azulado), sombra em cinza-azulado.
OSSO = ["#2b3242", "#9aa0ad", "#e2dbc8", "#eef3f4", "#dcefff"]
OSSO_LADO = ["#2b3242", "#6d7587", "#a7a9ac", "#c3c4c4", "#dcefff"]

TINTA = "#1b1208"
LINHA_PAPEL = "#b9a57a"


class Tela:
    """Grade de pixels com camadas sombreadas (mesma regra dos emblemas, tamanho variável).

    Desenha numa grade com folga (FOLGA px em volta) e, no fim, centraliza a silhueta na caixa
    n x n com 1 px livre em cada borda; se não couber, avisa (o desenho precisa encolher)."""

    FOLGA = 4

    def __init__(self, n: int) -> None:
        self.n = n
        self.m = n + 2 * self.FOLGA
        self.px: list[list[Cor | None]] = [[None] * self.m for _ in range(self.m)]

    def dentro(self, x: int, y: int) -> bool:
        return -self.FOLGA <= x < self.n + self.FOLGA and -self.FOLGA <= y < self.n + self.FOLGA

    def ponto(self, x: int, y: int, c: Cor) -> None:
        if self.dentro(x, y):
            self.px[y + self.FOLGA][x + self.FOLGA] = c

    def cheio(self, x: int, y: int) -> bool:
        return self.dentro(x, y) and self.px[y + self.FOLGA][x + self.FOLGA] is not None

    def camada(self, m: Mascara, rampa: list[str], contorno: bool = True, por_cima: bool = False,
               brilho: list[tuple[int, int]] | None = None, plano: bool = False) -> None:
        """Forma sombreada: luz em cima/esquerda, sombra embaixo/direita, contorno da rampa.

        plano=True pinta só o tom base (para miolos pequenos em que a borda viraria ruído)."""
        r = [hexa(c) for c in rampa]
        m = {(x, y) for (x, y) in m if self.dentro(x, y)}
        for (x, y) in m:
            c = r[2]
            if not plano:
                if (x, y - 1) not in m or (x - 1, y) not in m:
                    c = r[3]
                if (x, y + 1) not in m or (x + 1, y) not in m:
                    c = r[1]
            self.ponto(x, y, c)
        if contorno:
            for v in vizinhos(m):
                if por_cima or not self.cheio(*v):
                    self.ponto(v[0], v[1], r[0])
        for (x, y) in brilho or []:
            self.ponto(x, y, r[4])

    def pintar(self, m: Mascara, c: str) -> None:
        for (x, y) in m:
            self.ponto(x, y, hexa(c))

    def apagar(self, m: Mascara) -> None:
        for (x, y) in m:
            if self.dentro(x, y):
                self.px[y + self.FOLGA][x + self.FOLGA] = None

    def final(self) -> list[list[Cor | None]]:
        """Recorta a silhueta e centraliza na caixa n x n com 1 px de margem."""
        pts = [(x, y) for y in range(self.m) for x in range(self.m) if self.px[y][x] is not None]
        x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
        y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
        w, h = x1 - x0 + 1, y1 - y0 + 1
        if w > self.n - 2 or h > self.n - 2:
            raise ValueError(f"silhueta {w}x{h} não cabe em {self.n - 2}x{self.n - 2}")
        dx, dy = (self.n - w) // 2 - x0, (self.n - h + 1) // 2 - y0
        g: list[list[Cor | None]] = [[None] * self.n for _ in range(self.n)]
        for (x, y) in pts:
            g[y + dy][x + dx] = self.px[y][x]
        return g

    def orfaos(self) -> list[tuple[int, int]]:
        """Pixels opacos sem nenhum vizinho opaco (sujeira)."""
        g = self.final()
        def ok(x: int, y: int) -> bool:
            return 0 <= x < self.n and 0 <= y < self.n and g[y][x] is not None
        return [(x, y) for y in range(self.n) for x in range(self.n) if g[y][x] is not None
                and not any(ok(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]

    def imagem(self, escala: int = ESCALA) -> Image.Image:
        g = self.final()
        im = Image.new("RGBA", (self.n, self.n), (0, 0, 0, 0))
        for y in range(self.n):
            for x in range(self.n):
                if g[y][x] is not None:
                    im.putpixel((x, y), g[y][x])
        return im.resize((self.n * escala, self.n * escala), Image.NEAREST)


# ---------- formas ----------
def vizinhos(m: Mascara, n: int | None = None) -> Mascara:
    return {(x + dx, y + dy) for (x, y) in m for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))} - m


def ret(x0: int, y0: int, x1: int, y1: int) -> Mascara:
    return {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}


def elipse(cx: float, cy: float, rx: float, ry: float) -> Mascara:
    return {(x, y) for y in range(int(cy - ry) - 1, int(cy + ry) + 2) for x in range(int(cx - rx) - 1, int(cx + rx) + 2)
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1}


def circ(cx: float, cy: float, r: float) -> Mascara:
    return elipse(cx, cy, r, r)


def poli(pts: list[tuple[float, float]]) -> Mascara:
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    saida = set()
    for y in range(int(min(ys)) - 1, int(max(ys)) + 2):
        for x in range(int(min(xs)) - 1, int(max(xs)) + 2):
            px, py, dentro = x + 0.5, y + 0.5, False
            for i in range(len(pts)):
                (x1, y1), (x2, y2) = pts[i], pts[i - 1]
                if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
                    dentro = not dentro
            if dentro:
                saida.add((x, y))
    return saida


def tracar(x0: float, y0: float, x1: float, y1: float, esp: float = 1.0) -> Mascara:
    saida: Mascara = set()
    passos = int(max(abs(x1 - x0), abs(y1 - y0)) * 3) + 1
    for i in range(passos + 1):
        t = i / passos
        saida |= circ(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, esp / 2 + 0.35)
    return saida


def pixels_linha(x0: int, y0: int, x1: int, y1: int) -> Mascara:
    """Linha de 1 px sem engrossar (Bresenham), para traços finos e limpos."""
    saida = set()
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    erro = dx + dy
    while True:
        saida.add((x0, y0))
        if (x0, y0) == (x1, y1):
            return saida
        e2 = 2 * erro
        if e2 >= dy:
            erro += dy
            x0 += sx
        if e2 <= dx:
            erro += dx
            y0 += sy


def girar(pts: list[tuple[float, float]], cx: float, cy: float, graus: float) -> list[tuple[float, float]]:
    a = math.radians(graus)
    c, s = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for (x, y) in pts]


def cartao(cx: float, cy: float, w: float, h: float, graus: float) -> list[tuple[float, float]]:
    return girar([(cx - w / 2, cy - h / 2), (cx + w / 2, cy - h / 2), (cx + w / 2, cy + h / 2), (cx - w / 2, cy + h / 2)], cx, cy, graus)


def bastao(p0: tuple[float, float], p1: tuple[float, float], w0: float, w1: float | None = None) -> Mascara:
    """Quadrilátero orientado de p0 a p1 com larguras w0 (início) e w1 (fim)."""
    w1 = w0 if w1 is None else w1
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    n = math.hypot(dx, dy)
    nx, ny = -dy / n, dx / n
    return poli([(p0[0] + nx * w0 / 2, p0[1] + ny * w0 / 2), (p1[0] + nx * w1 / 2, p1[1] + ny * w1 / 2),
                 (p1[0] - nx * w1 / 2, p1[1] - ny * w1 / 2), (p0[0] - nx * w0 / 2, p0[1] - ny * w0 / 2)])


def glifo(linhas: list[str], x: int, y: int) -> Mascara:
    return {(x + i, y + j) for j, l in enumerate(linhas) for i, ch in enumerate(l) if ch == "#"}


def mover(m: Mascara, dx: int, dy: int) -> Mascara:
    return {(x + dx, y + dy) for (x, y) in m}


INTERROGACAO = [".###.", "#...#", "....#", "..##.", "..#..", ".....", "..#.."]
INTERROGACAO_P = [".##.", "#..#", "...#", "..#.", "....", "..#."]
TIQUE_P = ["....#", "...#.", "#.#..", ".#..."]


# =====================================================================
# ÍCONES PRINCIPAIS (32x32)
# =====================================================================
def treinar(t: Tela) -> None:
    """Folha de questões com caixinhas marcadas e lápis na diagonal."""
    folha = ret(4, 3, 22, 28) - poli([(18, 2), (23.5, 2), (23.5, 7.5)])
    t.camada(folha, PAPEL)
    t.camada(poli([(18, 3), (18, 8), (23, 8)]), PERGAMINHO, por_cima=True)  # orelha dobrada
    for i, y in enumerate((8, 14, 20)):
        caixa = ret(7, y, 9, y + 2)
        t.pintar(vizinhos(caixa, t.n), PERGAMINHO[1])
        t.pintar(caixa, "#ffffff")
        t.pintar(pixels_linha(12, y, 18 if i else 15, y), LINHA_PAPEL)
        t.pintar(pixels_linha(12, y + 2, 16 if i != 1 else 19, y + 2), LINHA_PAPEL)
        if i < 2:
            t.pintar(glifo(TIQUE_P, 7, y - 1), VERDE_TIQUE[1])
    # lápis: ponta embaixo à esquerda, borracha em cima à direita
    p0, p1 = (13.0, 28.5), (28.5, 11.0)
    def ao_longo(a: float, b: float) -> tuple[tuple[float, float], tuple[float, float]]:
        return ((p0[0] + (p1[0] - p0[0]) * a, p0[1] + (p1[1] - p0[1]) * a),
                (p0[0] + (p1[0] - p0[0]) * b, p0[1] + (p1[1] - p0[1]) * b))
    a, b = ao_longo(0.0, 0.24)
    t.camada(bastao(a, b, 0.6, 4.6), MADEIRA[:2] + ["#e9c48d", "#f6dcb0", "#fff0d6"], por_cima=True)
    a, b = ao_longo(0.24, 0.78)
    t.camada(bastao(a, b, 4.6), OURO, por_cima=True)
    a, b = ao_longo(0.78, 0.87)
    t.camada(bastao(a, b, 4.8), PRATA, por_cima=True)
    a, b = ao_longo(0.87, 1.0)
    t.camada(bastao(a, b, 4.6), ROSA, por_cima=True)
    a, _ = ao_longo(0.0, 0.0)
    t.pintar(ret(13, 27, 14, 28) & bastao(*ao_longo(0.0, 0.1), 0.6, 2.4), GRAFITE[1])


def revisao(t: Tela) -> None:
    """Ampulheta de madeira e latão, areia dourada caindo."""
    vidro = poli([(9, 6), (23, 6), (22, 11), (17.4, 15.4), (17.4, 16.6), (22, 21), (23, 26), (9, 26), (10, 21),
                  (14.6, 16.6), (14.6, 15.4), (10, 11)])
    t.camada(vidro, VIDRO)
    t.camada(poli([(11, 9), (21, 9), (20, 11.5), (16.6, 14.6), (15.4, 14.6), (12, 11.5)]), OURO, contorno=False)
    t.camada(poli([(10.5, 26), (11.5, 22), (14.5, 19.5), (17.5, 19.5), (20.5, 22), (21.5, 26)]), OURO, contorno=False)
    t.pintar(ret(16, 15, 16, 19), OURO[2])
    t.pintar({(16, 21)}, OURO[4])
    t.pintar(pixels_linha(11, 8, 11, 9) | {(12, 10)}, "#ffffff")
    t.pintar(pixels_linha(11, 22, 11, 23), "#ffffff")
    for x in (6, 25):
        t.camada(ret(x, 5, x + 1, 27), OURO, por_cima=True)
    for y0 in (2, 26):
        t.camada(ret(4, y0, 27, y0 + 3), MADEIRA, por_cima=True)
    for x in (6, 25):
        t.pintar({(x, y) for y in (3, 28)}, OURO[3])
    # entalhe nas tampas e grãos de areia no ar
    for y0 in (3, 28):
        t.camada(ret(14, y0, 17, y0 + 1), OURO, contorno=False, brilho=[(14, y0)])
    t.pintar({(15, 20), (17, 18)}, OURO[3])


def flashcards(t: Tela) -> None:
    """Três cartões em leque: o de trás (verso verdete), um com tique e o da frente, reto, com "?"."""
    t.camada(poli(cartao(21, 12.5, 12, 17, 18)), VERDETE)
    t.pintar(poli(cartao(21, 12.5, 7, 12, 18)) - poli(cartao(21, 12.5, 5, 10, 18)), VERDETE[3])
    t.camada(poli(cartao(18, 14, 12, 17, 7)), PAPEL, por_cima=True)
    t.camada(tracar(18.6, 12.4, 20.2, 14, 1.5) | tracar(20.2, 14, 22.6, 9.6, 1.5), VERDE_TIQUE, contorno=False)
    t.camada(ret(4, 11, 16, 28), PAPEL, por_cima=True)
    t.pintar(pixels_linha(6, 13, 14, 13), OURO[2])
    t.pintar(pixels_linha(6, 26, 14, 26), OURO[2])
    t.camada(glifo(INTERROGACAO, 8, 16) | mover(glifo(INTERROGACAO, 8, 16), 1, 0), VERDETE, contorno=False, plano=True)


def cronograma(t: Tela) -> None:
    """Calendário com espiral, dias marcados e um selo de tique de concluído."""
    t.camada(ret(4, 5, 27, 27), PAPEL)
    t.camada(ret(4, 5, 27, 10), VERDETE, por_cima=False)
    for x in (7, 12, 17, 22):
        t.camada(ret(x, 2, x + 2, 7) - ret(x + 1, 4, x + 1, 5), PRATA, por_cima=True)
    k = 0
    for j in range(3):
        for i in range(4):
            x, y = 7 + i * 5, 13 + j * 4
            dia = ret(x, y, x + 2, y + 1)
            if k in (0, 1, 2, 4, 5):
                t.pintar(dia, OURO[2])
                t.pintar({(x, y)}, OURO[3])
            elif k == 6:
                t.pintar(dia, VERMELHO[2])
            else:
                t.pintar(dia, "#e2d3ad")
            k += 1
    selo = circ(23.5, 24.5, 5.2)
    t.camada(selo, VERDE_TIQUE, por_cima=True, brilho=[(21, 21)])
    t.pintar(glifo(["....#", "...##", "#.##.", "###..", ".#..."], 21, 22), "#ffffff")


def resumos(t: Tela) -> None:
    """Livro fechado em pé, de três-quartos: capa verdete, cantos de ouro, folhas com borda dourada, fita."""
    tras = poli([(9, 4), (12, 2), (28, 2), (28, 23.5), (25, 26.5), (9, 26.5)])
    t.camada(tras, VERDETE)
    t.camada(poli([(10, 4.5), (12.5, 2.8), (27, 2.8), (24.5, 5)]), PAPEL, contorno=False, plano=True)
    folhas = poli([(24, 4.5), (27, 2.8), (27, 23), (24, 25.5)])
    t.camada(folhas, OURO, contorno=False)
    for y in range(6, 24, 3):
        t.pintar(pixels_linha(25, y, 26, y - 1), OURO[1])
    capa = ret(4, 4, 23, 26)
    t.camada(capa, VERDETE, por_cima=True)
    t.camada(ret(4, 4, 6, 26), ["#06302b", "#0b3f39", "#0f4f49", "#14655e", "#2f9a86"], contorno=False)
    for y in (8, 21):
        t.camada(ret(4, y, 6, y + 1), OURO, contorno=False)
    t.camada(ret(10, 9, 19, 13), OURO, por_cima=True)
    t.pintar(pixels_linha(12, 11, 17, 11), OURO[1])
    t.camada(poli([(14.5, 16.5), (17, 19), (14.5, 21.5), (12, 19)]), OURO, por_cima=True, brilho=[(14, 17)])
    for (x, y) in ((21, 5), (21, 24)):
        t.pintar(ret(x, y, x + 1, y + 1), OURO[3])
    t.camada(poli([(18, 26), (21, 26), (21, 29.2), (19.5, 28), (18, 29.2)]), VERMELHO, por_cima=True)


def atlas(t: Tela) -> None:
    """Vértebra lombar vista de cima (corte axial): corpo na frente (embaixo), forame vertebral
    triangular, pedículos, processos articulares, transversos e espinhoso; 1-2 px de espessura e luz fria."""
    corpo = elipse(16, 22.6, 11, 5.4) - elipse(16, 16.4, 3.6, 2.4)
    pediculos = bastao((11, 19.5), (10.8, 12.5), 3.2) | bastao((21, 19.5), (21.2, 12.5), 3.2)
    transversos = (bastao((10.5, 12.8), (3.6, 7.6), 3.2, 2.4) | circ(3.5, 7.5, 1.6)
                   | bastao((21.5, 12.8), (28.4, 7.6), 3.2, 2.4) | circ(28.5, 7.5, 1.6))
    laminas = bastao((11, 11.2), (15.6, 6.4), 2.8) | bastao((21, 11.2), (16.4, 6.4), 2.8)
    espinhoso = bastao((16, 7.5), (16, 2.8), 3.4, 2.2) | circ(16, 3, 1.2)
    forame = poli([(12.6, 17.2), (12.6, 13.4), (16, 9.4), (19.4, 13.4), (19.4, 17.2)])
    topo = (corpo | pediculos | transversos | laminas | espinhoso) - forame
    lado = (mover(topo, 0, 1) | (mover(corpo, 0, 2))) - topo - forame
    t.camada(lado | topo, OSSO_LADO)
    t.camada(topo, OSSO, contorno=False, brilho=[(6, 21), (7, 20), (3, 6), (15, 3)])
    # osso esponjoso no miolo do corpo (pontilhado discreto) e cortical clara na borda
    t.pintar({(x, y) for (x, y) in elipse(16, 23.3, 7, 3.2) if (x + 2 * y) % 5 == 0 and y % 2 == 0}, "#cfc7b3")
    for x in (10.5, 21.5):
        t.camada(elipse(x, 10.4, 1.6, 1.2), ["#2b3242", "#8fb0c9", "#b5d3ea", "#e4f2ff", "#ffffff"], contorno=False)
    t.pintar(forame & vizinhos(topo, t.n), OSSO[0])


def cronograma_mao(t: Tela) -> None:
    """Calendário com espiral e a mão espalmada (cronograma de Cirurgia da Mão)."""
    t.camada(ret(2, 4, 21, 21), PAPEL)
    t.camada(ret(2, 4, 21, 8), VERDETE)
    for x in (6, 15):
        t.camada(ret(x, 2, x + 1, 6), PRATA, por_cima=True)
    for y in (11, 14):
        t.pintar(ret(18, y, 19, y + 1), OURO[2])
    t.pintar(ret(18, 17, 19, 18), "#e2d3ad")
    # quatro dedos de 2 px com fresta, polegar aberto à esquerda, palma larga
    dedos = ret(7, 12, 8, 14) | ret(10, 11, 11, 14) | ret(13, 11, 14, 14) | ret(16, 13, 16, 15)
    palma = ret(7, 15, 16, 19) - {(16, 19), (7, 19)}
    polegar = tracar(4.6, 13.6, 7, 16.5, 1.6)
    t.camada(dedos | palma | polegar, PELE, por_cima=True)
    t.pintar({(9, y) for y in range(12, 15)} | {(12, y) for y in range(11, 15)} | {(15, y) for y in range(13, 15)}, PELE[0])


def temas(t: Tela) -> None:
    t.camada(ret(2, 20, 21, 21), MADEIRA)
    t.camada(ret(3, 13, 6, 19), VERDETE)
    t.camada(ret(9, 9, 12, 19), OURO, brilho=[(9, 9)])
    t.camada(ret(15, 15, 18, 19), AZUL)
    estrela = poli(estrela_pts(10.5, 5.6, 3.8, 1.6))
    t.camada(estrela, OURO, por_cima=True, brilho=[(10, 3)])


def estrela_pts(cx: float, cy: float, r: float, ri: float, pontas: int = 5) -> list[tuple[float, float]]:
    pts = []
    for i in range(pontas * 2):
        a = -math.pi / 2 + i * math.pi / pontas
        rr = r if i % 2 == 0 else ri
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


def torneio(t: Tela) -> None:
    """Escudo de torneio (verdete com aro de ouro) com duas cartas em leque no brasão e estrela na ponta."""
    escudo = poli([(2.5, 1.5), (21.5, 1.5), (21.5, 10.5), (18.4, 16.6), (12, 21.6), (5.6, 16.6), (2.5, 10.5)])
    t.camada(escudo, OURO, brilho=[(3, 2)])
    campo = poli([(4.5, 3.5), (19.5, 3.5), (19.5, 10.3), (16.8, 15.4), (12, 19.4), (7.2, 15.4), (4.5, 10.3)])
    t.camada(campo, VERDETE, contorno=False)
    t.camada(poli(cartao(9.2, 8.6, 5.4, 7.8, -22)), PERGAMINHO, por_cima=True)
    t.camada(poli(cartao(13.8, 9.6, 5.8, 8, 9)), PAPEL, por_cima=True)
    t.pintar(glifo(INTERROGACAO_P, 12, 7), VERMELHO[2])
    t.pintar(glifo(["..#..", ".###.", "#####", ".#.#."], 10, 14), OURO[3])


def simulado(t: Tela) -> None:
    """Bilhete de entrada com canhoto verdete, picote e selo dourado com estrela."""
    corpo = ret(2, 5, 21, 18) - circ(1.6, 11.5, 2.6) - circ(22.4, 11.5, 2.6)
    t.camada(corpo, PAPEL)
    t.camada(ret(3, 6, 6, 17) - circ(1.6, 11.5, 3.6), VERDETE, contorno=False)
    t.pintar({(8, y) for y in range(6, 18, 2)}, PERGAMINHO[1])
    t.pintar(pixels_linha(10, 7, 19, 7) | pixels_linha(10, 16, 19, 16), OURO[2])
    t.camada(circ(15, 11.5, 3.9), OURO, brilho=[(13, 9)])
    t.pintar(glifo(["..#..", "#####", ".###.", ".#.#."], 13, 10), OURO[1])


def ranking(t: Tela) -> None:
    taca = poli([(5, 2), (19, 2), (18.5, 8), (15.5, 12.5), (8.5, 12.5), (5.5, 8)])
    alcas = tracar(5, 4, 2.5, 6, 1.2) | tracar(2.5, 6, 6, 9.5, 1.2) | tracar(19, 4, 21.5, 6, 1.2) | tracar(21.5, 6, 18, 9.5, 1.2)
    t.camada(alcas, OURO)
    t.camada(taca | ret(11, 12, 12, 15) | ret(8, 16, 15, 17), OURO, brilho=[(7, 4)])
    t.camada(ret(6, 18, 17, 21), MADEIRA, por_cima=True)
    t.camada(circ(12, 6.5, 1.8), VERMELHO, contorno=False, brilho=[(11, 6)])


def liga(t: Tela) -> None:
    t.camada(ret(4, 4, 5, 20), MADEIRA)
    t.camada(circ(4.5, 3.4, 2), OURO, por_cima=True, brilho=[(4, 2)])
    flamula = poli([(6, 4), (21, 4), (21, 15), (17, 12.5), (13.5, 15), (6, 15)])
    t.camada(flamula, VERDETE, por_cima=True)
    t.camada(poli(estrela_pts(12.5, 9.2, 3.4, 1.5)), OURO, por_cima=True)


def conquistas(t: Tela) -> None:
    t.camada(ret(2, 11, 21, 21), MADEIRA)
    t.camada(poli([(2, 11), (2, 7), (5, 4), (18, 4), (21, 7), (21, 11)]), MADEIRA)
    for x in (4, 18):
        t.camada(ret(x, 5, x + 1, 21), OURO, contorno=False)
    t.camada(ret(2, 10, 21, 11), OURO, contorno=False)
    t.camada(circ(11.5, 12.5, 3.3), OURO, por_cima=True)
    t.camada(circ(11.5, 12.5, 1.6), VERDETE, contorno=False, brilho=[(11, 12)])


def desempenho(t: Tela) -> None:
    """Gráfico de linha subindo, com área sombreada, marcos dourados e seta."""
    t.camada(ret(2, 2, 3, 21) | ret(2, 20, 21, 21), GRAFITE)
    pts = [(4.5, 17.5), (9.5, 12.5), (13.5, 15.5), (17.5, 8.5)]
    area = poli([(4, 19.5)] + pts + [(19, 6.5), (19, 19.5)])
    t.pintar(area, "#cfe9e2")
    t.pintar({(x, y) for (x, y) in area if (x + y) % 4 == 0 and y > 14}, "#b4ddd2")
    traco: Mascara = set()
    for a, b in zip(pts, pts[1:]):
        traco |= tracar(*a, *b, 1.4)
    dx, dy = 5 / math.hypot(5, 7), -7 / math.hypot(5, 7)
    bx, by = pts[-1]
    ponta = poli([(bx + dx * 4.4, by + dy * 4.4), (bx - dy * 2.8, by + dx * 2.8), (bx + dy * 2.8, by - dx * 2.8)])
    t.camada(traco | ponta, VERDETE)
    for (x, y) in pts[1:3]:
        t.camada(circ(x, y, 1.6), OURO, por_cima=True)


def erros(t: Tela) -> None:
    t.camada(ret(6, 3, 21, 21), PAPEL)
    t.camada(ret(4, 2, 19, 21), AZUL, por_cima=True)
    for y in range(4, 21, 3):
        t.camada(ret(2, y, 5, y), PRATA, por_cima=True)
    t.camada(ret(8, 7, 16, 15), PAPEL, por_cima=True)
    t.camada(tracar(10, 9, 14, 13, 1.3) | tracar(14, 9, 10, 13, 1.3), VERMELHO, contorno=False)


def favoritas(t: Tela) -> None:
    t.camada(poli(estrela_pts(12, 12.6, 11, 4.6)), OURO, brilho=[(9, 9), (10, 9)])


def relatorio(t: Tela) -> None:
    t.camada(ret(6, 2, 18, 14), PAPEL)
    t.camada(ret(8, 9, 9, 12), VERDETE, contorno=False)
    t.camada(ret(11, 6, 12, 12), OURO, contorno=False)
    t.camada(ret(14, 4, 15, 12), VERMELHO, contorno=False)
    env = ret(2, 9, 21, 21)
    t.camada(env, PERGAMINHO, por_cima=True)
    t.camada(poli([(2, 21), (11.5, 14), (21, 21)]), PERGAMINHO, por_cima=True)
    t.pintar(pixels_linha(2, 10, 11, 16) | pixels_linha(21, 10, 12, 16), PERGAMINHO[1])


def conta(t: Tela) -> None:
    t.camada(circ(12, 12, 10.5), OURO, brilho=[(6, 5)])
    t.camada(circ(12, 12, 8), VERDETE, contorno=False)
    busto = (circ(12, 9.5, 3.2) | (elipse(12, 18.5, 5.8, 4.2) & ret(0, 15, 23, 19))) & circ(12, 12, 8)
    t.camada(busto, PAPEL, contorno=False)


def assinatura(t: Tela) -> None:
    t.camada(poli([(6, 12), (10, 13), (8, 22), (6.5, 20), (4, 21.5)]), VERMELHO)
    t.camada(poli([(18, 12), (14, 13), (16, 22), (17.5, 20), (20, 21.5)]), VERMELHO)
    roseta = poli(estrela_pts(12, 10, 9.5, 7.8, 12))
    t.camada(roseta, OURO, por_cima=True)
    t.camada(circ(12, 10, 5.4), VERDETE, por_cima=True)
    t.camada(poli(estrela_pts(12, 10.3, 3.6, 1.5)), OURO, contorno=False, brilho=[(12, 7)])


def indicar(t: Tela) -> None:
    t.camada(ret(3, 11, 20, 21), VERMELHO)
    t.camada(ret(2, 8, 21, 11), VERMELHO, por_cima=True)
    t.camada(ret(11, 8, 12, 21), OURO, contorno=False)
    laco = poli([(11.5, 7), (6, 2.5), (4.5, 4), (5.5, 7)]) | poli([(11.5, 7), (17, 2.5), (18.5, 4), (17.5, 7)])
    t.camada(laco, OURO, por_cima=True)
    t.camada(ret(10, 5, 13, 7), OURO, por_cima=True)


def suporte(t: Tela) -> None:
    balao = elipse(12, 10, 10.5, 8) | poli([(5, 15), (3.5, 21.5), (11, 16)])
    t.camada(balao, PAPEL)
    q = [".###.", "#...#", "....#", "..##.", "..#..", ".....", "..#.."]
    t.camada(glifo(q, 10, 6) | mover(glifo(q, 10, 6), 1, 0), VERDETE, contorno=False, plano=True)


def projeto(t: Tela) -> None:
    """Documento do projeto com assinatura e pena de escrever."""
    t.camada(ret(2, 2, 15, 21), PERGAMINHO)
    for y in (5, 8, 11):
        t.pintar(pixels_linha(5, y, 12, y), PERGAMINHO[1])
    t.pintar(pixels_linha(4, 17, 5, 16) | pixels_linha(6, 16, 7, 18) | pixels_linha(8, 17, 10, 15) | {(11, 16), (12, 17)}, VERDETE[1])
    pena = poli([(21.6, 2.2), (21.2, 5.8), (18.4, 11), (14.6, 16.4), (13.4, 15.4), (15.2, 10), (18.2, 4.4)])
    t.camada(pena, ["#2b3242", "#b5c0cc", "#eef2f4", "#ffffff", "#ffffff"], por_cima=True)
    t.pintar(pixels_linha(20, 3, 14, 15), "#8c93a3")
    t.camada(tracar(13.6, 16.4, 12, 19.6, 1), OURO, por_cima=True)


def admin(t: Tela) -> None:
    """Chave ornamentada: argola com furo e três botões, gema no colar, haste e dois dentes."""
    argola = circ(7, 7, 4.4) | circ(7, 2.9, 1.3) | circ(2.9, 7, 1.3) | circ(4, 4, 1.2)
    furo = circ(6.5, 6.5, 1.6)
    eixo = ((9, 9), (19.6, 19.6))
    haste = bastao(*eixo, 2.6)
    def dente(f: float, comp: float) -> Mascara:
        bx, by = 9 + 10.6 * f, 9 + 10.6 * f
        return bastao((bx, by), (bx + comp * 0.707, by - comp * 0.707), 2.2)
    t.camada(haste | dente(0.66, 4.2) | dente(0.92, 3.4), OURO)
    t.camada(argola - furo, OURO, por_cima=True, brilho=[(4, 3)])
    t.camada(circ(10, 10, 1.9), VERMELHO, por_cima=True, brilho=[(9, 9)])


def entrar(t: Tela) -> None:
    moldura = poli([(5, 22), (5, 8), (7, 4), (11.5, 2), (16, 4), (18, 8), (18, 22)])
    t.camada(moldura, GRAFITE)
    porta = poli([(7, 22), (7, 9), (8.5, 6), (11.5, 4.5), (14.5, 6), (16, 9), (16, 22)])
    t.camada(porta, MADEIRA, contorno=False)
    t.pintar({(x, y) for x in (9, 12) for y in range(7, 22)} & porta, MADEIRA[1])
    t.camada(ret(14, 13, 14, 14), OURO, contorno=False)
    t.camada(tracar(1, 15, 8, 15, 2) | poli([(7, 11), (11.5, 15.5), (7, 20)]), VERDETE, por_cima=True)


PRINCIPAIS = {"treinar": treinar, "revisao": revisao, "flashcards": flashcards,
              "cronograma": cronograma, "resumos": resumos, "atlas": atlas}
SECUNDARIOS = {"cronograma-mao": cronograma_mao, "temas": temas, "torneio": torneio, "simulado": simulado,
               "ranking": ranking, "liga": liga, "conquistas": conquistas, "desempenho": desempenho,
               "erros": erros, "favoritas": favoritas, "relatorio": relatorio, "conta": conta,
               "assinatura": assinatura, "indicar": indicar, "suporte": suporte, "projeto": projeto,
               "admin": admin, "entrar": entrar}


def gerar() -> dict[str, Tela]:
    telas = {}
    for grupo, n in ((PRINCIPAIS, 32), (SECUNDARIOS, 24)):
        for nome, desenhar in grupo.items():
            t = Tela(n)
            desenhar(t)
            telas[nome] = t
    return telas


def gravar(nome: str, t: Tela) -> int:
    """Grava o PNG mais leve que reproduz exatamente os pixels (indexado quando cabe)."""
    from io import BytesIO
    im = t.imagem()
    opcoes = []
    for modo in ("rgba", "p"):
        b = BytesIO()
        if modo == "rgba":
            im.save(b, "PNG", optimize=True)
        else:
            im.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(b, "PNG", optimize=True)
        if Image.open(BytesIO(b.getvalue())).convert("RGBA").tobytes() == im.tobytes():
            opcoes.append(b.getvalue())
    dados = min(opcoes, key=len)
    (PASTA / f"{nome}.png").write_bytes(dados)
    return len(dados)


def prancha(telas: dict[str, Tela], caminho: Path) -> None:
    """Prancha de conferência: cada ícone a 2x e 4x, no marfim e no escuro, com o nome."""
    fundos = [("#fbfaf6", "#5b686c"), ("#171e1d", "#9aa9a6")]
    col = 4 * 32 + 2 * 32 + 30  # 4x + 2x + respiro
    nomes = list(telas)
    por_linha = 4
    linhas = math.ceil(len(nomes) / por_linha)
    alt_item = 4 * 32 + 26
    W, H = por_linha * col * 2 + 40, linhas * alt_item + 20
    im = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(im)
    try:
        fonte = ImageFont.load_default(size=13)
    except TypeError:
        fonte = ImageFont.load_default()
    d.rectangle([0, 0, W // 2, H], fill=hexa(fundos[0][0]))
    d.rectangle([W // 2, 0, W, H], fill=hexa(fundos[1][0]))
    for k, nome in enumerate(nomes):
        t = telas[nome]
        i, j = k % por_linha, k // por_linha
        for lado, (fundo, texto) in enumerate(fundos):
            x0 = lado * (W // 2) + 10 + i * col
            y0 = 10 + j * alt_item
            g4, g2 = t.imagem(4), t.imagem(2)
            im.alpha_composite(g4, (x0, y0))
            im.alpha_composite(g2, (x0 + 4 * 32 + 10, y0))
            d.text((x0, y0 + 4 * 32 + 4), f"{nome} ({t.n})", fill=hexa(texto), font=fonte)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(caminho)


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    telas = gerar()
    total = 0
    for nome, t in telas.items():
        sujos = t.orfaos()
        if sujos:
            print(f"aviso: {nome} tem pixels soltos em {sujos}")
        total += gravar(nome, t)
    print(f"{len(telas)} ícones em {PASTA} ({total / 1024:.1f} KB)")
    if "--prancha" in sys.argv:
        prancha(telas, Path(sys.argv[sys.argv.index("--prancha") + 1]))


if __name__ == "__main__":
    main()
