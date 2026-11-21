"""A guirlanda do canto da barra de atalhos (modo Natal), refeita na técnica da árvore (21/11/2026).

Coroa de pinho de verdade: um anel de raminhos em leque, todos girando no mesmo sentido, pintados com o pontilhado das
cenas e a luz de cima à esquerda; frutinhas de azevinho com folha serrilhada, pinhas com escamas, sininhos dourados,
luzinhas quentes que iluminam os ramos em volta, o laço grande de veludo com caudas longas e a fita que sobe até o
prego (ela fica pendurada, não flutuando).
Saídas: guirlanda.png e guirlanda-luz.png. Uso: python3 scripts/natal/guirlanda.py
"""
from __future__ import annotations

import math

import numpy as np

from hd2d import ESC, H, W, Camada, camada_de_luz, desfocar, hexa, h01, iluminar, luz_pontual, pal, salvar_rgba, tom

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gerar_cena_inicio import XA, YA, poli, pontilhar, ruido  # noqa: E402

PINHO = pal("#050f0b", "#081a12", "#0d2418", "#12301e", "#183c24", "#1f4a2a", "#285a30", "#336c36", "#43803e", "#5a9648")
VERMELHO = pal("#2c0608", "#4a0c10", "#6e1418", "#941e22", "#b82c2c", "#d8443a", "#f06a54", "#ff9a7c")
OURO = pal("#4a2c08", "#6e4612", "#94641c", "#b8862a", "#d8a83c", "#f0c85a", "#ffe28a", "#fff4c8")
MADEIRA = pal("#1e120a", "#30200f", "#463018", "#5e4222", "#7a582e", "#94703c", "#ae8a4e", "#c8a468")
AZEVINHO = pal("#061a10", "#0c2a1a", "#144028", "#1e5836", "#2e7448")

CX, CY, R = 120, 60, 15       # centro e raio do anel (meio da espessura)


def raminho(c: Camada, textura, bx, by, ang, comp, larg, seed) -> np.ndarray:
    """Um raminho em leque: base no anel, ponta seguindo o anel (sentido horário) e caindo um pouco para fora."""
    dx, dy = math.cos(ang), math.sin(ang)
    px, py = bx + dx * comp, by + dy * comp
    nx, ny = -dy, dx
    pts = [(bx + nx * larg * 0.3, by + ny * larg * 0.3), (bx + dx * comp * 0.5 + nx * larg, by + dy * comp * 0.5 + ny * larg),
           (px, py), (bx + dx * comp * 0.55 - nx * larg * 0.8, by + dy * comp * 0.55 - ny * larg * 0.8), (bx - nx * larg * 0.3, by - ny * larg * 0.3)]
    return poli(pts)


def main() -> None:
    c, e = Camada(), Camada()
    textura = ruido(81, 2.0) * 0.6 + ruido(82, 4.5) * 0.4
    anel = np.zeros((H, W), bool)
    rad = np.hypot(XA - CX, YA - CY)
    angp = np.arctan2(YA - CY, XA - CX)
    luz_px = -np.cos(angp + math.pi * 0.25)                                  # 1 no canto de cima à esquerda
    # o corpo do anel, cheio (sem buracos), com a sombra de dentro e o volume de "rosca"
    corpo = (rad > R - 7) & (rad < R + 6.5 + 1.2 * np.sin(angp * 9) * (textura - 0.3))
    perfil = 1 - np.abs(rad - R) / 7                                         # mais claro no meio da espessura
    v = 0.32 + 0.16 * luz_px + 0.14 * perfil + (textura - 0.5) * 0.3
    c.mascara(corpo, PINHO[pontilhar(np.clip(v, 0, 1), len(PINHO), 0.85)])
    anel |= corpo
    # três voltas de raminhos por cima: a de fora, a do meio e a de dentro, cada uma deslocada
    for volta, (rr, n, comp, larg, k_tom) in enumerate(((R + 3.5, 30, 7.5, 3.4, -0.06), (R, 28, 8.0, 3.6, 0.04), (R - 3.5, 22, 6.0, 2.8, -0.02))):
        for j in range(n):
            a = 2 * math.pi * j / n + volta * 0.37 + (h01(volta, j, 1) - 0.5) * 0.12
            bx, by = CX + math.cos(a) * rr, CY + math.sin(a) * rr
            tang = a + math.pi / 2 + (0.35 if volta == 0 else 0.1 if volta == 1 else -0.25)
            m = raminho(c, textura, bx, by, tang, comp + h01(volta, j, 2) * 2, larg, j)
            luz_ang = -math.cos(a + math.pi * 0.25)
            dist_base = np.hypot(XA - bx, YA - by) / (comp + 2)
            v = 0.44 + 0.2 * luz_ang + k_tom + 0.16 * dist_base + (textura - 0.5) * 0.24
            c.mascara(m, PINHO[pontilhar(np.clip(v, 0, 1), len(PINHO), 0.85)])
            ptx, pty = bx + math.cos(tang) * (comp + 1), by + math.sin(tang) * (comp + 1)
            c.p(ptx, pty, tom(PINHO, 0.78 + 0.18 * luz_ang))
            anel |= m
    # pontas de agulha saindo da borda (de fora e, menos, para dentro do furo): a silhueta deixa de ser um anel liso
    for j in range(64):
        a = 2 * math.pi * j / 64 + (h01(j, 7) - 0.5) * 0.08
        luz_ang = -math.cos(a + math.pi * 0.25)
        for lado, r0, comp in ((1, R + 5.5, 1 + int(h01(j, 8) * 2.2)), (-1, R - 6.5, 1)):
            if lado < 0 and j % 2:
                continue
            for k2 in range(-4, comp * 2 + 1):
                k = k2 / 2
                rr = r0 + lado * k
                aa = a + 0.04 * max(k, 0) * lado
                c.p(CX + math.cos(aa) * rr, CY + math.sin(aa) * rr, tom(PINHO, 0.34 + 0.2 * luz_ang + 0.06 * max(k, 0)))
    # furo do meio limpo, com uma borda escura (o anel tem espessura)
    furo = np.hypot(XA - CX, YA - CY) < R - 8
    c.c[furo] = 0
    borda = (np.hypot(XA - CX, YA - CY) < R - 6.8) & ~furo & anel
    c.c[borda, :3] *= 0.5
    pts = []
    # azevinho: duas folhas serrilhadas e três frutinhas, em quatro pontos do anel
    for k, a in enumerate((-2.4, -0.6, 0.9, 2.4)):
        x, y = CX + math.cos(a) * (R + 1), CY + math.sin(a) * (R + 1)
        for lado in (-1, 1):
            for s in range(6):
                fx, fy = x + lado * (s * 0.9 + 1), y - s * 0.35 + (1 if s % 2 else 0) * 0.6
                c.p(fx, fy, tom(AZEVINHO, 0.75 - s * 0.08)); c.p(fx, fy + 1, tom(AZEVINHO, 0.35))
        for (bx, by) in ((0, 0), (-1, 1), (1, 1)):
            c.p(x + bx, y + by, tom(VERMELHO, 0.7)); c.p(x + bx - 0.4, y + by - 0.4, tom(VERMELHO, 0.95))
    # pinhas com escamas (4 x 6), presas na volta de fora
    for a in (-1.5, 1.6, 3.0):
        x, y = CX + math.cos(a) * R - 1, CY + math.sin(a) * R - 2
        for dy in range(6):
            meia = (1, 2, 2, 2, 1, 1)[dy]
            for dx in range(-meia + 1, meia + 1):
                c.p(x + dx, y + dy, tom(MADEIRA, 0.5 - dx * 0.15 + (0.25 if (dx + dy) % 2 == 0 else 0)))
    # sininhos dourados (boca para baixo, badalo)
    for a in (-0.15, 2.0):
        x, y = CX + math.cos(a) * (R + 0.5), CY + math.sin(a) * (R + 0.5) - 2
        for dy, (l, rr) in enumerate(((0, 0), (-1, 1), (-1, 1), (-2, 2))):
            for dx in range(l, rr + 1):
                c.p(x + dx, y + dy, tom(OURO, 0.75 - dx * 0.15 - dy * 0.05))
        c.p(x - 1, y + 1, tom(OURO, 0.98)); c.p(x, y + 4, tom(OURO, 0.3))
    # luzinhas quentes entre os ramos
    for j in range(12):
        a = 2 * math.pi * j / 12 + 0.3
        if 0.9 < a % (2 * math.pi) < 2.2:                                 # nada de luz atrás do laço
            continue
        x, y = CX + math.cos(a) * (R + (2.5 if j % 2 else -2.5)), CY + math.sin(a) * (R + (2.5 if j % 2 else -2.5))
        cor = ("#ffd27a", "#ffe9a6", "#ffb04a")[j % 3]
        c.p(x, y, cor); e.p(x, y, cor)
        pts.append((x, y, cor))
    # a fita que sobe até o prego
    for y in range(int(CY - R - 10), int(CY - R - 4)):
        c.p(CX - 1, y, tom(VERMELHO, 0.72)); c.p(CX, y, tom(VERMELHO, 0.5)); c.p(CX + 1, y, tom(VERMELHO, 0.3))
    py = int(CY - R - 11)
    c.p(CX, py, "#c0c4c8"); c.p(CX - 1, py, "#7c868c"); c.p(CX + 1, py, "#566068"); c.p(CX, py - 1, "#e6ecf0")
    # o laço grande embaixo: duas alças em gota com a dobra de dentro, o nó e duas caudas com ponta em V
    lx, ly = CX, int(CY + R + 1)
    for lado in (-1, 1):
        alca = poli([(lx, ly - 1), (lx + lado * 3, ly - 5), (lx + lado * 7, ly - 6), (lx + lado * 10, ly - 3), (lx + lado * 10, ly + 1),
                     (lx + lado * 7, ly + 3), (lx + lado * 2, ly + 2)])
        dobra = poli([(lx + lado * 2, ly - 1), (lx + lado * 5, ly - 3), (lx + lado * 8, ly - 2), (lx + lado * 6, ly + 1), (lx + lado * 2, ly + 1)])
        v = 0.6 - (YA - ly) * 0.045 - np.abs(XA - lx) * 0.012 + (0.06 if lado < 0 else -0.06)
        c.mascara(alca, VERMELHO[pontilhar(np.clip(v, 0, 1), len(VERMELHO), 0.6)])
        c.mascara(dobra & alca, VERMELHO[pontilhar(np.clip(v - 0.32, 0, 1), len(VERMELHO), 0.6)])
        borda_alca = alca & ~np.roll(alca, 1, 0)
        c.mascara(borda_alca, tom(VERMELHO, 0.72 if lado < 0 else 0.6))
        # cauda: uma tira de 3 px que desce ondulando e abre um pouco, com a ponta cortada em V
        for k in range(14):
            x = lx + lado * (1.5 + k * 0.5 + math.sin(k * 0.55) * 0.9)
            y = ly + 2 + k
            dobra_k = math.sin(k * 0.55) > 0.55
            for j in range(3):
                c.p(x + lado * j, y, tom(VERMELHO, 0.72 - j * 0.16 + (0.12 if dobra_k else 0) - k * 0.01))
        xf = lx + lado * (1.5 + 13 * 0.5 + math.sin(13 * 0.55) * 0.9)
        c.p(xf, ly + 16, tom(VERMELHO, 0.48)); c.p(xf + lado * 2, ly + 16, tom(VERMELHO, 0.3))
    for yy in range(-2, 3):
        for xx in range(-2, 3):
            if abs(xx) + abs(yy) <= 3:
                c.p(lx + xx, ly + yy, tom(VERMELHO, 0.68 - yy * 0.07 - xx * 0.05))
    c.p(lx - 1, ly - 1, tom(VERMELHO, 0.76)); c.p(lx - 2, ly + 1, tom(VERMELHO, 0.3)); c.p(lx + 2, ly + 1, tom(VERMELHO, 0.25))

    rgb, alfa, emi = iluminar(c, e, pts, amb="#a8b2c8", amb_k=0.85, raio_lamp=4.5,
                              extra=[(CX - 10, CY - 14, 30, "#fff0d6", 0.35, 1.0)])
    x0, x1, y0, y1 = (CX - 26) * ESC, (CX + 27) * ESC, (CY - R - 13) * ESC, (CY + R + 20) * ESC
    salvar_rgba("guirlanda.png", rgb[y0:y1, x0:x1], alfa[y0:y1, x0:x1])
    luz = desfocar(emi, 5) * 1.3 + desfocar(emi, 16) * 1.4
    for (x, y, cor) in pts:
        luz += luz_pontual(x, y, 10)[:, :, None] * hexa(cor) * 0.12
    m = 24 * ESC
    cor, a = camada_de_luz(luz[y0 - m:y1 + m, x0 - m:x1 + m])
    salvar_rgba("guirlanda-luz.png", cor, a)
    print("a guirlanda começa em", m, m, "dentro da luz")


if __name__ == "__main__":
    main()
