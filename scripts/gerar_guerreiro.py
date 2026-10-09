"""Guerreiro da guilda (o mensageiro de armadura): escudo na mão e um fêmur no lugar da espada.

Gera public/ranking/guerreiro.png, uma tira com 2 quadros de 34x37 (fêmur erguido e fêmur
baixado), ampliada 4x. A tela de carregamento anima os quadros com CSS (steps).
    python3 scripts/gerar_guerreiro.py
"""
from __future__ import annotations

from gerar_cenario_ranking import PASTA, gravar, hexa

W, H = 34, 37
OX, OY = 5, 7  # deslocamento do corpo (desenhado nas coordenadas do mensageiro)
OSSO, SOMBRA_OSSO = "#efe6cf", "#c9bb96"


def quadro(erguido: bool) -> list[list[str | None]]:
    g: list[list[str | None]] = [[None] * W for _ in range(H)]

    def p(x: int, y: int, c: str, corpo: bool = True) -> None:
        if corpo:
            x, y = x + OX, y + OY
        if 0 <= x < W and 0 <= y < H:
            g[y][x] = c

    def ret(x0: int, y0: int, x1: int, y1: int, c: str, corpo: bool = True) -> None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                p(x, y, c, corpo)

    def linha(x0: int, y0: int, x1: int, y1: int, c: str, grossura: int = 2) -> None:
        passos = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(passos + 1):
            x = round(x0 + (x1 - x0) * i / passos)
            y = round(y0 + (y1 - y0) * i / passos)
            for d in range(grossura):
                p(x, y + d, c)

    # pluma vermelha e elmo de ferro com protetor de nariz
    for (x, y) in ((11, 0), (12, 0), (12, 1), (13, 1), (12, 2), (11, 2)):
        p(x, y, "#d33a3a")
    p(13, 0, "#f07a6a")
    ret(8, 3, 15, 8, "#8f9aa3")
    ret(9, 3, 10, 7, "#c3ccd2")
    ret(7, 8, 16, 8, "#5f6a72")
    # rosto
    ret(8, 9, 15, 14, "#f2c08a")
    ret(7, 9, 7, 11, "#6b3d1c")
    ret(16, 9, 16, 11, "#6b3d1c")
    for (x, y) in ((10, 11), (13, 11)):
        p(x, y, "#1b1208")
    for (x, y) in ((9, 13), (14, 13)):
        p(x, y, "#f08a7a")
    p(11, 13, "#8a3a20"), p(12, 13, "#8a3a20")
    ret(11, 9, 12, 11, "#5f6a72")  # protetor de nariz
    # túnica azul com a cruz dourada da guilda, cinto
    ret(7, 15, 16, 22, "#2b5fa8")
    ret(8, 15, 8, 22, "#4a7fd0")
    ret(11, 16, 12, 20, "#e8b34f")
    ret(10, 17, 13, 17, "#e8b34f")
    ret(7, 21, 16, 21, "#5c3415")
    p(11, 21, "#e8b34f"), p(12, 21, "#e8b34f")
    # pernas e botas
    ret(8, 23, 10, 26, "#5c3415")
    ret(13, 23, 15, 26, "#5c3415")
    ret(7, 27, 10, 28, "#3a2210")
    ret(13, 27, 16, 28, "#3a2210")
    # escudo redondo de madeira com aro de ferro e cravo dourado (lado esquerdo da tela)
    sy = 0 if erguido else 1
    ret(1, 15 + sy, 7, 23 + sy, "#8a5226")
    ret(1, 15 + sy, 7, 15 + sy, "#5f6a72"), ret(1, 23 + sy, 7, 23 + sy, "#5f6a72")
    ret(0, 16 + sy, 0, 22 + sy, "#5f6a72"), ret(8, 16 + sy, 8, 22 + sy, "#5f6a72")
    ret(3, 15 + sy, 5, 23 + sy, "#a8683a")
    ret(4, 18 + sy, 4, 20 + sy, "#e8b34f"), ret(3, 19 + sy, 5, 19 + sy, "#e8b34f")
    # braço direito e a mão que segura o fêmur
    if erguido:
        ret(17, 14, 18, 18, "#2b5fa8")
        ret(18, 12, 19, 13, "#f2c08a")
        # fêmur erguido: côndilos junto da mão, diáfise subindo, cabeça no alto
        p(17, 13, OSSO), p(17, 14, SOMBRA_OSSO), p(20, 14, OSSO), p(20, 15, SOMBRA_OSSO)
        linha(19, 11, 24, 0, OSSO)
        linha(20, 12, 25, 1, SOMBRA_OSSO, 1)
        ret(24, -3, 26, -1, OSSO)  # cabeça femoral
        p(26, -1, SOMBRA_OSSO), p(23, -1, OSSO)
        p(26, 1, OSSO)  # trocânter maior
    else:
        ret(17, 16, 18, 19, "#2b5fa8")
        ret(19, 17, 20, 18, "#f2c08a")
        # fêmur abaixado na frente, quase na horizontal (golpe)
        p(18, 19, OSSO), p(18, 20, SOMBRA_OSSO), p(18, 16, OSSO)
        linha(21, 17, 25, 15, OSSO)
        linha(21, 19, 25, 17, SOMBRA_OSSO, 1)
        ret(25, 13, 27, 15, OSSO)  # cabeça femoral
        p(27, 15, SOMBRA_OSSO)
        p(24, 17, OSSO)  # trocânter maior
    return g


def contornar(g: list[list[str | None]]) -> list[list[tuple[int, int, int, int]]]:
    cheio = {(x, y) for y in range(H) for x in range(W) if g[y][x]}
    px = []
    for y in range(H):
        lin = []
        for x in range(W):
            c = g[y][x]
            if c:
                lin.append(hexa(c))
            elif any((x + dx, y + dy) in cheio for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                lin.append(hexa("#1b1208"))
            else:
                lin.append((0, 0, 0, 0))
        px.append(lin)
    return px


if __name__ == "__main__":
    a, b = contornar(quadro(True)), contornar(quadro(False))
    gravar(PASTA / "guerreiro.png", [la + lb for la, lb in zip(a, b)])
    print("guerreiro gerado")
