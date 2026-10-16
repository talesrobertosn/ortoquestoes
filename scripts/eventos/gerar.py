"""Pixel art própria dos pequenos encontros (easter eggs). Python puro, sem imagens externas.

Refeito em 16/10/2026 (pedido do Tales: "deixar mais bonito"). Usa o mesmo motor dos ícones
da página inicial e dos emblemas (scripts/gerar_emblemas_provisorios.py): grade de 32x32,
contorno escuro, luz no alto/esquerda, sombra embaixo/direita e brilhos pontuais, ampliado 4x.
Assim as visitas falam a mesma língua visual dos atalhos (public/pixel/*.png).

Gera public/eventos/<nome>.png (128x128) e a sala do Arquivo do Preceptor (arquivo.png).
Uso: python3 scripts/eventos/gerar.py
"""
from __future__ import annotations

import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gerar_emblemas_provisorios import (  # noqa: E402
    MADEIRA, METAIS, PERGAMINHO, VERMELHO, Tela, circulo, gravar_png, hexa, linha, poligono, retangulo,
)

PASTA = Path(__file__).resolve().parents[2] / "public" / "eventos"
VERDE = ["#062a24", "#0d5247", "#14655e", "#2f9a86", "#9fe3d2"]
JALECO = ["#2b3a3e", "#9fb0b4", "#e4ecee", "#ffffff", "#ffffff"]
PELE = ["#4a2a14", "#c98a5a", "#f2c08a", "#f8d6ad", "#fff0dc"]
CABELO = ["#140c06", "#2a1a0e", "#3d2814", "#5a3c20", "#7a5532"]
CAFE = ["#1a0d05", "#3b1f0c", "#5a3216", "#7a4a26", "#a06a3e"]
CREME = ["#4a3418", "#c9a86a", "#f2dfb4", "#fff3d6", "#ffffff"]
LARANJA = ["#3d1a06", "#a2531c", "#d9822f", "#f2a95a", "#ffd9a8"]
ROSA = ["#4a1626", "#b4506a", "#e88aa0", "#f7bccb", "#ffe8ee"]
BORRACHA = ["#3d0a0a", "#9b2b20", "#d2523a", "#f0866a", "#ffd2c9"]
OURO = METAIS["ouro"]
PRATA = METAIS["prata"]


def vapor(t: Tela, x: float, y: float, fase: int) -> None:
    """Fio de vapor translúcido (sem contorno), para a xícara."""
    for i in range(7):
        dx = math.sin((i + fase) * 0.9) * 1.2
        t.ponto(round(x + dx), round(y - i), hexa("#ffffff", 210 - i * 24))


def cafe(t: Tela) -> None:
    t.camada(retangulo(4, 26, 27, 27) | retangulo(6, 28, 25, 28), CREME)  # pires
    alca = circulo(22.5, 18.5, 4.6) - circulo(22.5, 18.5, 2.4)
    t.camada({p for p in alca if p[0] >= 21}, VERDE)
    corpo = poligono([(7, 12), (22, 12), (21, 25), (8, 25)])
    t.camada(corpo, VERDE)
    t.pintar(retangulo(8, 12, 20, 12), "#9fe3d2")  # borda clara do esmalte
    t.pintar(retangulo(9, 13, 19, 14), "#4a2a14")  # café visto de cima
    t.pintar(retangulo(10, 13, 13, 13), "#7a4a26")
    t.pintar(linha(9, 16, 9, 22, 0.4), "#5cc9ad")  # reflexo vertical do esmalte
    t.pintar(retangulo(12, 18, 16, 19), "#e9c46a")  # faixa dourada
    t.pintar(retangulo(13, 18, 13, 18), "#fff4cf")
    vapor(t, 11, 10, 0)
    vapor(t, 16, 9, 2)
    t.brilho(26, 6, "#fff4cf")


def bilhete(t: Tela) -> None:
    t.camada(retangulo(6, 5, 25, 29), MADEIRA)
    t.camada(retangulo(8, 8, 23, 27), PERGAMINHO)
    t.camada(retangulo(12, 3, 19, 7), PRATA)
    t.pintar(retangulo(14, 4, 17, 4), "#ffffff")
    for y in (12, 15, 18):
        t.pintar(linha(10.5, y, 21, y, 0.4), "#b39465")
    t.pintar(linha(10.5, 21, 16, 21, 0.4), "#b39465")
    # Coração de colega no canto do bilhete.
    coracao = circulo(18.2, 22.6, 1.3) | circulo(20.6, 22.6, 1.3) | poligono([(16.8, 23), (22, 23), (19.4, 26)])
    t.camada(coracao, VERMELHO, contorno=False)
    t.ponto(18, 22, hexa("#ffd2c9"))
    t.brilho(27, 4, "#fff4cf")


def pessoa(t: Tela, acenando: bool = True) -> None:
    """Residente de jaleco, cabelo curto e estetoscópio."""
    t.camada(poligono([(7, 30), (8, 21), (11, 18), (21, 18), (24, 21), (25, 30)]), JALECO)
    t.camada(poligono([(13, 18), (19, 18), (16, 24)]), VERDE, contorno=False)  # pijama cirúrgico no decote
    t.pintar(linha(16, 24, 16, 30, 0.3), "#9fb0b4")
    t.camada(circulo(16, 11.5, 6), PELE)
    t.camada(poligono([(10, 10), (11, 6), (15, 4.5), (20, 5), (22.5, 8), (22, 11), (19, 8.5), (14, 9), (11, 11.5)]), CABELO)
    t.pintar({(13, 12), (19, 12)}, "#1b1208")
    t.pintar({(13, 11), (19, 11)}, "#3d2814")
    t.pintar({(15, 15), (16, 15), (17, 15)}, "#c46a50")
    t.pintar({(12, 14), (20, 14)}, "#f0a08a")
    # Estetoscópio no pescoço.
    t.pintar(linha(12.5, 19, 12, 24, 0.4) | linha(19.5, 19, 20, 24, 0.4), "#2b3a3e")
    t.camada(circulo(20.5, 25.5, 1.4), PRATA, contorno=False)
    if acenando:
        t.camada(linha(24, 22, 27.5, 15, 2.2), JALECO)
        t.camada(circulo(28, 13.5, 1.9), PELE)


def mascote(t: Tela) -> None:
    pessoa(t)
    t.brilho(5, 7, "#fff4cf")


def estrela_forma(cx: float, cy: float, r1: float, r2: float) -> set[tuple[int, int]]:
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = r1 if i % 2 == 0 else r2
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return poligono(pts)


def estrela(t: Tela) -> None:
    # Rastro da estrela cadente, do canto para o centro.
    for i, a in enumerate((60, 90, 130, 170, 210)):
        t.pintar(linha(2 + i * 2.2, 27 - i * 2.2, 3 + i * 2.2, 26 - i * 2.2, 0.5), "#f5cd6b" if i > 2 else "#d9a23a")
    for (x, y, a) in ((3, 28, 90), (5, 26, 140), (7, 24, 190)):
        t.ponto(x, y, hexa("#fff4cf", a))
    t.camada(estrela_forma(18.5, 14, 11, 4.6), OURO)
    t.pintar(estrela_forma(17.5, 13, 4, 1.8), "#fff4cf")
    t.ponto(15, 10, hexa("#ffffff"))
    t.brilho(28, 4)
    t.brilho(7, 6, "#fff4cf")


def relogio(t: Tela) -> None:
    for cx in (9, 23):
        t.camada(circulo(cx, 7.5, 3.4), OURO)
    t.camada(linha(9, 26, 7, 29, 1.2) | linha(23, 26, 25, 29, 1.2), PRATA)
    t.camada(circulo(16, 17, 10.5), OURO)
    t.camada(circulo(16, 17, 8.2), CREME, contorno=False)
    t.pintar(circulo(16, 17, 8.2) - circulo(16, 17, 7.6), "#c9a86a")
    for ang in range(0, 360, 30):
        x = 16 + math.cos(math.radians(ang)) * 6.6
        y = 17 + math.sin(math.radians(ang)) * 6.6
        t.ponto(int(x), int(y), hexa("#9c7a45" if ang % 90 else "#14655e"))
    t.pintar(linha(16, 17, 16, 11.5, 0.5), "#1b1208")
    t.pintar(linha(16, 17, 20, 19.5, 0.5), "#14655e")
    t.camada(circulo(16, 17, 1.1), OURO, contorno=False)
    t.camada(retangulo(14, 4, 17, 6), PRATA)
    t.ponto(12, 12, hexa("#ffffff"))
    t.brilho(28, 9, "#fff4cf")


def livro(t: Tela) -> None:
    """Tomo do Preceptor: capa verde, cantos de ouro, fita e um brilho na lombada."""
    t.camada(retangulo(9, 6, 26, 28), PERGAMINHO)  # miolo visto de lado
    for y in range(8, 28, 2):
        t.ponto(25, y, hexa("#c9a86a"))
    t.camada(retangulo(6, 4, 23, 28), VERDE)
    t.camada(retangulo(6, 4, 8, 28), ["#04241f", "#0a3f37", "#0d5247", "#1f7a6a", "#5cc9ad"], contorno=False)
    for (x, y) in ((22, 4), (22, 27), (9, 4), (9, 27)):
        t.camada(retangulo(x - (1 if x > 15 else 0), y - (1 if y > 15 else 0), x + (0 if x > 15 else 1), y + (0 if y > 15 else 1)), OURO, contorno=False)
    t.camada(estrela_forma(15.5, 14.5, 4.6, 2), OURO)
    t.pintar(retangulo(11, 22, 20, 22), "#d9a23a")
    t.camada(poligono([(17, 27), (20, 27), (20, 31), (18.5, 29.6), (17, 31)]), VERMELHO)
    t.brilho(27, 4, "#fff4cf")
    t.brilho(4, 22, "#fff4cf")


def martelo(t: Tela) -> None:
    """Martelo de reflexo (Taylor): cabo de aço e cabeça triangular de borracha."""
    t.camada(linha(7, 28, 18, 10, 1.6), PRATA)
    t.camada(linha(5.5, 30, 8.5, 26, 2.4), ["#1f2427", "#3a4246", "#566166", "#7d8b90", "#b7c3c7"])
    cabeca = poligono([(8.5, 6), (27, 15.5), (24, 4.5)])
    t.camada(cabeca, BORRACHA)
    t.pintar(linha(11.5, 6.2, 23, 5.2, 0.3), "#f7b19c")
    t.camada(circulo(18.5, 9.5, 1.5), PRATA, contorno=False)
    # Faíscas do reflexo.
    for (x, y) in ((28, 17), (25, 20)):
        t.brilho(x, y, "#fff4cf")
    t.pintar(linha(27, 21, 30, 24, 0.3), "#f5cd6b")


def selo(t: Tela) -> None:
    fita = ["#04241f", "#0d5247", "#14655e", "#2f9a86", "#9fe3d2"]
    t.camada(poligono([(9, 18), (14, 20), (11, 31), (8.5, 28.5), (5.5, 29)]), fita)
    t.camada(poligono([(23, 18), (18, 20), (21, 31), (23.5, 28.5), (26.5, 29)]), fita)
    # Roseta serrilhada.
    pts = []
    for i in range(24):
        a = i * math.pi / 12
        r = 11 if i % 2 == 0 else 9.8
        pts.append((16 + math.cos(a) * r, 13.5 + math.sin(a) * r))
    t.camada(poligono(pts), OURO)
    t.camada(circulo(16, 13.5, 7), ["#3d2804", "#b07a1c", "#e2ad45", "#f5cd6b", "#fff4cf"], contorno=False)
    t.pintar(circulo(16, 13.5, 7) - circulo(16, 13.5, 6.3), "#946512")
    t.pintar(linha(12.3, 13.8, 15, 16.5, 1.1) | linha(15, 16.5, 20, 10.5, 1.1), "#14655e")
    t.brilho(11, 8)
    t.brilho(28, 4, "#fff4cf")


def biscoito(t: Tela) -> None:
    corpo = poligono([(4, 19), (9, 10), (16, 8), (19, 13), (23, 9), (28, 12), (29, 19), (24, 25), (16, 24), (9, 26)])
    t.camada(corpo, ["#4a2508", "#b06a22", "#e3a046", "#f6c877", "#fff0c8"])
    t.pintar(linha(16, 12, 17, 23, 0.5), "#a35f1d")  # dobra
    t.pintar({(10, 14), (11, 16), (23, 14), (25, 17)}, "#c98232")
    # Papelzinho da sorte saindo da dobra.
    t.camada(poligono([(17, 18), (29, 24), (28, 27), (16, 21)]), CREME)
    t.pintar(linha(20, 21.3, 26, 24.2, 0.3), "#d33a3a")
    t.brilho(6, 6, "#fff4cf")
    t.brilho(27, 5, "#fff4cf")


def bolo(t: Tela) -> None:
    t.camada(retangulo(3, 28, 28, 29), PRATA)  # prato
    t.camada(retangulo(5, 20, 26, 27), ["#3d1d10", "#8a4a2c", "#b0684a", "#cf8a6a", "#f0b89a"])
    t.camada(retangulo(7, 14, 24, 19), ["#3d1d10", "#8a4a2c", "#b0684a", "#cf8a6a", "#f0b89a"])
    t.camada(retangulo(5, 20, 26, 21), CREME, contorno=False)
    t.camada(retangulo(7, 14, 24, 15), CREME, contorno=False)
    for x in (8, 13, 19, 24):
        t.pintar(retangulo(x, 22, x, 23), "#fff3d6")
    for x in (10, 16, 21):
        t.pintar(retangulo(x, 16, x, 17), "#fff3d6")
    for (x, y) in ((9, 25), (15, 24), (22, 25), (12, 18), (19, 18)):
        t.ponto(x, y, hexa("#e88aa0"))
    for i, x in enumerate((11, 16, 21)):
        t.camada(retangulo(x, 9, x, 13), ROSA if i == 1 else VERDE, contorno=False)
        t.ponto(x, 7, hexa("#fff4cf"))
        t.ponto(x, 8, hexa("#f5a524"))
        t.ponto(x, 6, hexa("#ffd27a", 170))
    t.brilho(4, 6, "#fff4cf")
    t.brilho(27, 9, "#fff4cf")


def gato(t: Tela) -> None:
    rabo = linha(22, 28, 27, 25, 1.6) | linha(27, 25, 28, 19, 1.6)
    t.camada(rabo, LARANJA)
    t.camada(poligono([(8, 29), (9, 19), (13, 16), (19, 16), (23, 19), (24, 29)]), LARANJA)
    t.camada(poligono([(13, 29), (14, 21), (18, 21), (19, 29)]), CREME, contorno=False)  # peito
    t.camada(circulo(16, 12, 7), LARANJA)
    t.camada(poligono([(9.5, 9), (10, 2.5), (14.5, 6.5)]), LARANJA)
    t.camada(poligono([(22.5, 9), (22, 2.5), (17.5, 6.5)]), LARANJA)
    t.pintar({(11, 5), (11, 6), (21, 5), (21, 6)}, "#e88aa0")
    t.pintar(linha(14, 6.5, 14, 8, 0.2) | linha(16, 6, 16, 8, 0.2) | linha(18, 6.5, 18, 8, 0.2), "#a2531c")
    for x in (12, 19):
        t.pintar(retangulo(x, 11, x + 1, 12), "#1f7a4d")
        t.ponto(x, 11, hexa("#d2fbef"))
    t.pintar({(16, 14)}, "#e88aa0")
    t.pintar({(15, 15), (17, 15)}, "#a2531c")
    t.pintar(linha(7, 13, 10, 14, 0.2) | linha(22, 14, 25, 13, 0.2), "#fff3d6")
    t.camada(retangulo(10, 28, 13, 29) | retangulo(19, 28, 22, 29), CREME)  # patinhas
    t.brilho(5, 4, "#fff4cf")


def presente(t: Tela) -> None:
    t.camada(retangulo(6, 15, 25, 29), VERDE)
    t.camada(retangulo(4, 11, 27, 15), ["#04241f", "#0d5247", "#23907a", "#5cc9ad", "#d2fbef"])
    t.camada(retangulo(14, 11, 17, 29), OURO, contorno=False)
    t.pintar(retangulo(4, 15, 27, 15), "#062a24")
    laco_e = poligono([(15.5, 10), (8, 4), (7, 9), (10, 11)])
    laco_d = poligono([(16.5, 10), (24, 4), (25, 9), (22, 11)])
    t.camada(laco_e, OURO)
    t.camada(laco_d, OURO)
    t.camada(circulo(16, 10, 2), OURO)
    t.brilho(28, 5, "#fff4cf")
    t.brilho(3, 20, "#fff4cf")


ICONES = {
    "cafe": cafe, "bilhete": bilhete, "mascote": mascote, "estrela": estrela, "relogio": relogio,
    "livro": livro, "martelo": martelo, "selo": selo, "biscoito": biscoito, "bolo": bolo, "gato": gato,
    "presente": presente,
}


# ---------------- Sala do Arquivo do Preceptor (240x88, exibida a 2x) ----------------
def sala() -> None:
    from PIL import Image, ImageDraw

    rng = random.Random(1610)
    L, A = 240, 88
    im = Image.new("RGBA", (L, A))
    px = im.load()
    # Parede em faixas (como a página inicial), com a luz do luar no meio.
    for y in range(A):
        for x in range(L):
            luz = max(0.0, 1 - math.hypot((x - 120) / 120, (y - 30) / 70))
            faixa = (y // 6) % 2
            base = (14 + faixa, 34 + faixa * 2, 30 + faixa)
            r = int(base[0] + 22 * luz)
            g = int(base[1] + 26 * luz)
            b = int(base[2] + 16 * luz)
            if (x * 7 + y * 13) % 29 == 0:
                r, g, b = r + 3, g + 3, b + 2
            px[x, y] = (r, g, b, 255)
    d = ImageDraw.Draw(im)
    # Rodapé e assoalho de tábuas com luz quente vinda dos candeeiros.
    for y in range(66, A):
        for x in range(L):
            calor = max(0.0, 1 - min(abs(x - 86), abs(x - 154)) / 70) * max(0.0, 1 - (y - 66) / 30)
            tom = 0.55 + 0.45 * calor
            px[x, y] = (int(92 * tom + 18), int(62 * tom + 10), int(36 * tom + 6), 255)
    for y in range(66, A, 5):
        d.line((0, y, L, y), fill=(42, 26, 14, 255))
        for x in range((y % 3) * 11, L, 33):
            d.line((x, y + 1, x, y + 4), fill=(52, 32, 16, 255))
    d.line((0, 65, L, 65), fill=(156, 120, 70, 255))
    # Janela em arco com céu estrelado e lua.
    jx0, jx1, jy0, jy1 = 99, 141, 6, 60
    d.rounded_rectangle((jx0 - 3, jy0 - 3, jx1 + 3, jy1 + 3), radius=22, fill=(122, 92, 46, 255))
    d.rounded_rectangle((jx0 - 2, jy0 - 2, jx1 + 2, jy1 + 2), radius=21, fill=(176, 140, 76, 255))
    d.rounded_rectangle((jx0, jy0, jx1, jy1), radius=19, fill=(18, 40, 56, 255))
    for y in range(jy0, jy1):
        for x in range(jx0, jx1):
            if px[x, y][:3] == (18, 40, 56):
                t = (y - jy0) / (jy1 - jy0)
                px[x, y] = (int(14 + 20 * t), int(30 + 34 * t), int(58 + 22 * t), 255)
    d.ellipse((112, 13, 125, 26), fill=(246, 234, 190, 255))
    d.ellipse((117, 11, 128, 23), fill=(20, 42, 60, 255))
    for (x, y) in ((106, 30), (132, 21), (128, 40), (110, 47), (135, 50), (104, 18)):
        d.point((x, y), fill=(232, 220, 170, 255))
    d.line((120, jy0, 120, jy1), fill=(176, 140, 76, 255), width=2)
    d.line((jx0, 36, jx1, 36), fill=(176, 140, 76, 255), width=2)
    d.line((jx0 - 4, jy1 + 3, jx1 + 4, jy1 + 3), fill=(208, 170, 98, 255), width=2)  # peitoril
    # Estantes com livros sombreados (lombada clara à esquerda, escura à direita).
    paleta = [(112, 140, 104), (182, 152, 92), (160, 106, 84), (76, 118, 112), (140, 132, 102), (196, 178, 128), (128, 74, 70), (64, 92, 120)]
    for origem in (8, 51, 154, 197):
        d.rectangle((origem - 1, 7, origem + 35, 66), fill=(58, 36, 18, 255))
        d.rectangle((origem, 8, origem + 34, 65), fill=(122, 84, 44, 255))
        d.rectangle((origem + 2, 10, origem + 32, 63), fill=(30, 22, 14, 255))
        for y in (25, 43, 61):
            x = origem + 3
            while x < origem + 30:
                larg = rng.randint(2, 4)
                alto = rng.randint(9, 13)
                cor = rng.choice(paleta)
                if rng.random() < 0.12 and x < origem + 26:  # livro inclinado
                    d.polygon([(x, y), (x + larg, y), (x + larg + 3, y - alto + 1), (x + 3, y - alto + 1)], fill=cor)
                    x += larg + 4
                    continue
                d.rectangle((x, y - alto, x + larg, y), fill=cor)
                d.line((x, y - alto, x, y), fill=tuple(min(255, c + 34) for c in cor))
                d.line((x + larg, y - alto, x + larg, y), fill=tuple(int(c * 0.62) for c in cor))
                d.line((x, y - alto + 2, x + larg, y - alto + 2), fill=(226, 206, 150, 255))
                x += larg + 1
            d.rectangle((origem + 1, y + 1, origem + 33, y + 2), fill=(164, 120, 66, 255))
            d.line((origem + 1, y + 3, origem + 33, y + 3), fill=(70, 44, 22, 255))
    # Candeeiros de pé com cúpula acesa.
    for x in (86, 154):
        d.rectangle((x - 1, 36, x, 63), fill=(150, 116, 60, 255))
        d.rectangle((x - 4, 63, x + 3, 64), fill=(120, 90, 46, 255))
        d.polygon([(x - 6, 36), (x + 5, 36), (x + 3, 28), (x - 4, 28)], fill=(244, 206, 120, 255))
        d.line((x - 4, 28, x + 3, 28), fill=(255, 240, 196, 255))
        d.line((x - 6, 36, x + 5, 36), fill=(196, 150, 70, 255))
        d.point((x - 3, 30), fill=(255, 250, 225, 255))
    # Plantas nos cantos.
    for x in (1, 232):
        d.rectangle((x, 58, x + 6, 65), fill=(168, 104, 66, 255))
        d.line((x, 58, x + 6, 58), fill=(206, 140, 96, 255))
        d.line((x + 3, 42, x + 3, 58), fill=(78, 120, 72, 255))
        for dx, dy in ((-3, 45), (1, 48), (-2, 52), (2, 54)):
            d.rectangle((x + dx + 1, dy, x + dx + 4, dy + 1), fill=(118, 172, 102, 255))
            d.point((x + dx + 1, dy), fill=(170, 214, 140, 255))
    # O Preceptor (mesmo residente dos ícones, em 1x), atrás da mesa.
    t = Tela()
    pessoa(t, acenando=False)
    for y in range(32):
        for x in range(32):
            c = t.px[y][x]
            if c is not None:
                px[104 + x, 38 + y] = c
    # Mesa com livro aberto e vela.
    d.rectangle((92, 66, 148, 69), fill=(196, 150, 88, 255))
    d.line((92, 66, 148, 66), fill=(232, 196, 130, 255))
    d.line((92, 70, 148, 70), fill=(90, 58, 28, 255))
    for x in (95, 144):
        d.rectangle((x, 71, x + 2, 86), fill=(120, 80, 42, 255))
    d.polygon([(110, 66), (120, 63), (120, 66)], fill=(250, 236, 200, 255))
    d.polygon([(120, 63), (130, 66), (120, 66)], fill=(236, 218, 176, 255))
    d.rectangle((136, 60, 137, 65), fill=(250, 240, 220, 255))
    d.point((136, 58), fill=(255, 214, 110, 255))
    d.point((136, 59), fill=(255, 170, 50, 255))
    im.save(PASTA / "arquivo.png", optimize=True)


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    for nome, desenhar in ICONES.items():
        t = Tela()
        desenhar(t)
        gravar_png(PASTA / f"{nome}.png", t)
    sala()
    print(f"{len(ICONES)} ícones e a sala em {PASTA}")


if __name__ == "__main__":
    main()
