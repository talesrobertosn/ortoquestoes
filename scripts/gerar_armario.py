"""Armários da Biblioteca de Resumos em HD-2D (Tales, 14/11/2026: "deixar a arte do armário mais bonita, toque
HD-2D, ray tracing, variações, detalhes no armário em si").

Arte original feita por código (numpy + PIL): nada baixado nem gerado por IA. Cada peça é pintada em pixel art
pequena, com 5 tons por madeira, veio, frisos, pregos de metal e desgaste, e recebe uma luz calculada por pixel:
a lamparina no alto do armário ilumina o fundo de cada nicho, a tábua de cima projeta sombra no topo do nicho
(oclusão de ambiente), os livros escurecem o pé do fundo e a borda chanfrada das tábuas pega o brilho.
No site tudo é mostrado em 3x com image-rendering: pixelated.

Peças (public/pixel/biblioteca/armario/):
- fileira-{madeira}-{periodo}.png (96 x 70): um nicho com o fundo de tábuas e a prateleira embaixo; repete nos dois
  sentidos (70 px de arte = 210 px no site, a altura de cada prateleira);
- pilastra-{madeira}.png (10 x 96): capitel (14), fuste que repete (70) e base (12), para border-image de 3 fatias;
  pilastras-{madeira}.png (21 x 96): as duas lado a lado, para a borda do celular (o nicho rola por dentro dela);
- cornija-{madeira}.png (60 x 36): o coroamento com dentículos, contas douradas, painel e consolos nos cantos
  (moldura de 9 fatias: 7 em cima, 8 embaixo, 10 de cada lado);
- rodape-{madeira}.png (48 x 10): o rodapé com os pés torneados (3 fatias: pé, miolo que repete, pé);
- enfeite-{nome}.png: aparador de latão, ampulheta, globo, castiçal, pilha de livros deitados, crânio e tinteiro;
- selos.png (4 x 16 x 16): os selos de cera da raridade (comum, raro, épico, lendário);
- mesa-{periodo}.webp (600 x 270): o palco da ficha, a mesa de leitura com vela, tinteiro e a estante ao fundo.

Madeiras: nogueira, carvalho, mogno, ebano e dourada (a estante "Mais cobrados", madeira escura com folha de ouro).
Períodos: manha, tarde e noite (a mesma hora do salão do topo).
Uso: python3 scripts/gerar_armario.py [--previa PASTA]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "biblioteca" / "armario"
PERIODOS = ("manha", "tarde", "noite")


def hexa(c: str) -> np.ndarray:
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def mistura(a, b, t: float) -> np.ndarray:
    a = hexa(a) if isinstance(a, str) else np.asarray(a, np.float32)
    b = hexa(b) if isinstance(b, str) else np.asarray(b, np.float32)
    return a * (1 - t) + b * t


# ─────────────────────────────── Madeiras e metais ───────────────────────────────
# Cada madeira: 5 tons da luz para a sombra, o metal dos pregos e frisos, e a cor do veio.
MADEIRAS = {
    "nogueira": dict(tons=("#b07a44", "#865634", "#603c22", "#3f2614", "#25160a"), metal="latao", veio=0.10, nos=3),
    "carvalho": dict(tons=("#cfa364", "#a87e46", "#7e5c30", "#573c1d", "#34230f"), metal="latao", veio=0.13, nos=2),
    "mogno": dict(tons=("#b8603e", "#8e4228", "#6c2e1c", "#4a1c10", "#2b0f08"), metal="cobre", veio=0.08, nos=1),
    "ebano": dict(tons=("#6c5a50", "#4c3e37", "#342a25", "#211a16", "#120e0b"), metal="prata", veio=0.07, nos=1),
    "dourada": dict(tons=("#946232", "#6e4624", "#503218", "#351f0d", "#1e1106"), metal="ouro", veio=0.09, nos=2),
}
METAIS = {
    "latao": ("#fff2b8", "#ecc464", "#bb8c36", "#7c5822", "#4a3110"),
    "cobre": ("#ffd8b4", "#e8996a", "#b8643c", "#7c3c22", "#4a2010"),
    "prata": ("#f6f6fa", "#c8ccd4", "#90949e", "#5c606a", "#30323a"),
    "ouro": ("#fff6c4", "#f6d36c", "#cf9c38", "#8a6018", "#503408"),
}
# Luz de cada hora: cor da luz, intensidade da lamparina e o ambiente (sombras).
LUZES = {
    "manha": dict(cor=(1.00, 0.97, 0.92), forca=1.00, ambiente=(0.52, 0.56, 0.64)),
    "tarde": dict(cor=(1.10, 0.92, 0.70), forca=1.04, ambiente=(0.50, 0.45, 0.44)),
    "noite": dict(cor=(1.12, 0.80, 0.52), forca=0.92, ambiente=(0.30, 0.30, 0.42)),
}


def ruido(seed: int, w: int, h: int, escala: float) -> np.ndarray:
    """Ruído suave 0..1 que dá a volta nas bordas (as peças repetem sem emenda)."""
    g = np.random.default_rng(seed)
    pw, ph = max(2, int(w / escala)), max(2, int(h / escala))
    base = g.random((ph, pw)).astype(np.float32)
    ys = np.arange(h) / h * ph
    xs = np.arange(w) / w * pw
    y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int)
    fy = (ys - y0)[:, None]; fx = (xs - x0)[None, :]
    fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
    a = base[y0 % ph][:, x0 % pw]; b = base[y0 % ph][:, (x0 + 1) % pw]
    c = base[(y0 + 1) % ph][:, x0 % pw]; d = base[(y0 + 1) % ph][:, (x0 + 1) % pw]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def paleta(tons) -> np.ndarray:
    return np.array([hexa(t) if isinstance(t, str) else np.asarray(t, np.float32) for t in tons], dtype=np.float32)


def tonalizar(t: np.ndarray, pal: np.ndarray) -> np.ndarray:
    """Índice contínuo 0..4 → cor da paleta, com dois degraus entre tons (pixel art, sem degradê liso)."""
    t = np.clip(t, 0, len(pal) - 1)
    i0 = np.floor(t).astype(int)
    i1 = np.minimum(i0 + 1, len(pal) - 1)
    f = np.round((t - i0) * 2) / 2
    return pal[i0] * (1 - f[..., None]) + pal[i1] * f[..., None]


def salvar(rgb: np.ndarray, alfa: np.ndarray | None, nome: str) -> None:
    h, w = rgb.shape[:2]
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = np.clip(rgb * 255 + 0.5, 0, 255).astype(np.uint8)
    out[..., 3] = 255 if alfa is None else np.clip(alfa * 255 + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(PASTA / nome, optimize=True)


# ─────────────────────────────── O nicho (fundo + prateleira) ───────────────────────────────
NW, NH = 96, 70          # nicho: 96 x 70 (288 x 210 no site)
TABUA_Y = 63             # a tábua ocupa as linhas 63..69 (os livros pousam em 63 = 189 px no site)
TABUAS_FUNDO = [14, 10, 16, 12, 14, 18, 12]


def fileira(madeira: str, periodo: str) -> None:
    m = MADEIRAS[madeira]
    pal = paleta(m["tons"])
    met = paleta(METAIS[m["metal"]])
    luz = LUZES[periodo]
    seed = sum(map(ord, madeira)) * 7
    g = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:NH, 0:NW].astype(np.float32)

    # Fundo: tábuas verticais, cada uma com o próprio tom, veio ao longo do comprimento e frisos entre elas.
    t = np.full((NH, NW), 3.0, np.float32)
    borda = np.zeros(NW, int)
    x = 0
    for i, larg in enumerate(TABUAS_FUNDO):
        tom_tabua = 3.05 + g.random() * 0.4
        fase = g.random() * 10
        cols = slice(x, x + larg)
        u = xx[:, cols] - x
        # fibras longas: o veio corre ao longo da tábua (vertical) e só ondula devagar; poucos fios escuros
        onda = 1.6 * ruido(seed + i, larg, NH, 18)[:, :larg] + 0.25 * np.sin(yy[:, cols] * 0.05 + fase)
        fio = np.sin(u * (1.1 + 0.25 * (i % 3)) + onda * 4 + fase)
        t[:, cols] = tom_tabua + m["veio"] * 3.2 * (fio > 0.9) - m["veio"] * 2.2 * (fio < -0.94)
        # um ou outro "catedral" (o desenho em arco do veio), discreto
        if i in (2, 5):
            cy = 20 + g.random() * 25
            arco = np.abs(u - larg / 2) * 1.6 - (yy[:, cols] - cy) * 0.35
            t[:, cols] += m["veio"] * 2.4 * ((np.mod(arco, 5) < 0.7) & (arco > 0) & (arco < 16))
        borda[x] = 1                        # friso escuro
        if larg > 1:
            borda[x + 1] = 2                # quina clara da tábua seguinte
        borda[x + larg - 1] = 3             # sombra da quina
        x += larg
    for xc in range(NW):
        if borda[xc] == 1:
            t[:, xc] = 4.2
        elif borda[xc] == 2:
            t[:, xc] -= 0.7
        elif borda[xc] == 3:
            t[:, xc] += 0.35
    # nós da madeira (fixos, com anel)
    for k in range(m["nos"]):
        cx, cy = g.integers(4, NW - 4), g.integers(12, 52)
        d = np.hypot((xx - cx) * 1.6, yy - cy)
        t = np.where(d < 1.2, t + 0.9, np.where(d < 2.4, t - 0.35, t))
    rgb = tonalizar(t, pal)

    # Luz do nicho: a lamparina vem do alto e da frente; a tábua de cima faz sombra nítida no topo (com penumbra),
    # o pé do fundo fica na sombra dos livros e o nicho todo recebe o ambiente da hora.
    y = yy[:, 0]
    sombra_cima = np.clip((y - 2.0) / 11.0, 0, 1) ** 0.8          # 0 colado na tábua de cima, 1 depois de ~13 px
    sombra_cima = np.where(y < 2, 0.0, sombra_cima)
    lampada = 0.62 + 0.42 * np.exp(-((y - 30) / 22) ** 2)          # o miolo do nicho é a parte mais clara
    pe = 1 - 0.42 * np.clip((y - 50) / (TABUA_Y - 50), 0, 1) ** 1.4  # os livros escurecem o pé do fundo
    forca = (sombra_cima * lampada * pe * luz["forca"])[:, None, None]
    amb = np.array(luz["ambiente"], np.float32)
    cor_luz = np.array(luz["cor"], np.float32)
    rgb = rgb * (amb * 0.45 + forca * cor_luz * 0.85)
    # pontilhado da penumbra (pixel art: a borda da sombra é feita de pontos, não de degradê)
    pen = (y >= 2) & (y <= 4)
    for yc in np.where(pen)[0]:
        rgb[yc, (np.arange(NW) + yc) % 2 == 0] *= 0.82

    # A prateleira: topo com luz, quina chanfrada que brilha, frente com veio, pregos e a sombra embaixo.
    ty = TABUA_Y
    veio_t = np.sin(xx[0] * 0.45 + 2.2 * np.sin(xx[0] * 0.13 + seed)) * 0.5 + 0.5
    linhas = [  # (índice do tom, variação do veio)
        (0.6, 0.2),   # 63: topo, a luz bate em cheio
        (1.1, 0.3),   # 64: topo, mais fundo
        (0.0, 0.0),   # 65: a quina chanfrada (brilho)
        (1.6, 0.6),   # 66: frente
        (2.0, 0.6),   # 67: frente
        (2.6, 0.4),   # 68: frente, embaixo
        (3.8, 0.0),   # 69: o filete de sombra
    ]
    for k, (tb, var) in enumerate(linhas):
        row = tonalizar(np.full(NW, tb) + var * (veio_t - 0.5) * 2, pal)
        brilho = 1.0 if k != 6 else 0.7
        rgb[ty + k] = row * (amb * 0.35 + cor_luz * 0.8 * luz["forca"]) * brilho
    # quina chanfrada: pontos de brilho de metal-claro no gume
    for xc in range(NW):
        if (xc * 13 + seed) % 7 == 0:
            rgb[ty + 2, xc] = np.clip(rgb[ty + 2, xc] * 1.18, 0, 1)
    # emenda das tábuas da prateleira e marcas de uso
    for xc in (31, 79):
        rgb[ty + 3:ty + 6, xc] = rgb[ty + 3:ty + 6, xc] * 0.6
    for xc in g.integers(2, NW - 2, 6):
        rgb[ty, xc] = np.clip(rgb[ty, xc] * 1.15, 0, 1)
    # pregos de metal na frente da tábua (2 x 2, com brilho no canto de cima)
    for xc in (12, 60):
        rgb[ty + 3, xc] = met[0]; rgb[ty + 3, xc + 1] = met[1]
        rgb[ty + 4, xc] = met[2]; rgb[ty + 4, xc + 1] = met[3]
        rgb[ty + 5, xc + 1] = rgb[ty + 5, xc + 1] * 0.7
    # frente dourada na estante dos mais cobrados: um filete de folha de ouro no meio da frente
    if madeira == "dourada":
        for xc in range(NW):
            rgb[ty + 4, xc] = met[1] if xc % 4 else met[0]
            rgb[ty + 5, xc] = mistura(met[3], rgb[ty + 5, xc], 0.4)
    # sombra que a tábua projeta no fundo logo acima dela (contato)
    rgb[ty - 1] *= 0.72
    rgb[ty - 2] *= 0.86
    salvar(np.clip(rgb, 0, 1), None, f"fileira-{madeira}-{periodo}.png")


# ─────────────────────────────── A pilastra ───────────────────────────────
PW, P_CAP, P_MEIO, P_BASE = 10, 14, 70, 12


def pilastra(madeira: str) -> None:
    m = MADEIRAS[madeira]
    pal = paleta(m["tons"])
    met = paleta(METAIS[m["metal"]])
    H = P_CAP + P_MEIO + P_BASE
    rgb = np.zeros((H, PW, 3), np.float32)
    # perfil do fuste (luz da esquerda e da frente): borda escura, quina clara, caneluras
    perfil = [3.6, 1.6, 0.8, 1.3, 2.4, 1.2, 2.4, 1.4, 2.2, 3.8]
    for y in range(H):
        for x in range(PW):
            rgb[y, x] = tonalizar(np.array(perfil[x]), pal)
    # fuste: anéis de metal e uma conta entalhada no meio de cada trecho (repete a cada 35 px, 2 por fatia)
    for y0 in range(P_CAP, P_CAP + P_MEIO, 35):
        for dy, k in ((0, 3.8), (1, 0.4), (2, 1.6)):
            rgb[y0 + dy, 1:PW - 1] = tonalizar(np.full(PW - 2, k), pal)
        meio = y0 + 17
        for dy in (-1, 0, 1):
            rgb[meio + dy, 3:7] = tonalizar(np.array([2.6, 1.0, 0.6, 2.2]) + abs(dy) * 0.6, pal)
        rgb[meio, 4] = met[0]; rgb[meio, 5] = met[1]
    # capitel: ábaco (topo reto), equino com contas de metal e o colarinho
    for y in range(P_CAP):
        if y < 2:
            row = np.array([2.8, 0.4, 0.2, 0.4, 0.6, 0.6, 0.8, 1.0, 1.4, 3.6]) + y * 0.8
        elif y < 4:
            row = np.full(PW, 3.6 if y == 3 else 2.4)
        elif y < 9:
            k = (y - 4) / 4
            row = np.array([3.4, 1.2, 0.6, 0.5, 0.8, 1.0, 1.2, 1.6, 2.2, 3.6]) + k * 0.9
        elif y == 9:
            row = np.full(PW, 3.9)
        else:
            row = np.array(perfil) - 0.2
        rgb[y] = tonalizar(row, pal)
    for x in range(1, PW - 1, 2):                                   # contas de metal no equino
        rgb[6, x] = met[1 if x < 5 else 2]
        rgb[7, x] = met[3]
    rgb[12, 1:PW - 1] = met[2]                                      # colarinho
    rgb[12, 2] = met[0]
    # base: toro, escócia e plinto
    b0 = P_CAP + P_MEIO
    base_perfis = [3.8, 1.0, 0.6, 1.4, 3.2, 2.0, 0.8, 1.2, 1.8, 2.4, 3.0, 4.0]
    for k, v in enumerate(base_perfis):
        rgb[b0 + k] = tonalizar(np.array([v + 0.8, v, v - 0.3, v, v + 0.2, v + 0.3, v + 0.4, v + 0.5, v + 0.7, v + 1.0]), pal)
    rgb[b0 + 4, 1:PW - 1] = met[2]
    # luz quente da lamparina no alto (o capitel pega mais luz que a base)
    luz = (1.12 - 0.22 * np.linspace(0, 1, H))[:, None, None]
    final = np.clip(rgb * luz, 0, 1)
    salvar(final, None, f"pilastra-{madeira}.png")
    # As duas pilastras lado a lado (a da direita espelhada), para a borda de 9 fatias do celular, que não rola junto
    duas = np.concatenate([final, final[:, :1] * 0, final[:, ::-1]], axis=1)
    salvar(duas, None, f"pilastras-{madeira}.png")


# ─────────────────────────────── A cornija (moldura de 9 fatias) ───────────────────────────────
CW, CH = 60, 36   # fatias: 7 em cima, 8 embaixo, 10 de cada lado; o miolo (40 x 21) repete


def cornija(madeira: str) -> None:
    m = MADEIRAS[madeira]
    pal = paleta(m["tons"])
    met = paleta(METAIS[m["metal"]])
    seed = sum(map(ord, madeira)) * 11
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
    rgb = np.zeros((CH, CW, 3), np.float32)
    # Painel do miolo (y 7..27): campo rebaixado com veio horizontal e luz de cima.
    veio = np.sin(xx * 0.18 + 2.5 * np.sin(yy * 0.9 + seed) + 1.4 * ruido(seed, CW, CH, 5) * 4)
    campo = 2.6 + 0.35 * (veio > 0.6) - 0.25 * (veio < -0.8) + (yy - 7) / 20 * 0.6
    rgb[:] = tonalizar(campo, pal)
    # topo: borda superior, dentículos e o fio de contas de metal
    rgb[0] = tonalizar(np.full(CW, 3.9), pal)
    rgb[1] = tonalizar(np.full(CW, 0.5), pal)
    for y in range(2, 6):
        for x in range(CW):
            dent = (x % 4) != 3
            v = (1.0 + (y - 2) * 0.35) if dent else 3.8
            if dent and x % 4 == 0:
                v -= 0.4
            rgb[y, x] = tonalizar(np.array(v), pal)
    for x in range(CW):
        rgb[6, x] = met[1] if x % 2 == 0 else met[3]
    # bisel do campo: quina clara em cima, sombra embaixo
    rgb[7] = tonalizar(np.full(CW, 3.9), pal)
    rgb[8] = tonalizar(np.full(CW, 3.2), pal)
    rgb[26] = tonalizar(np.full(CW, 1.4), pal)
    rgb[27] = tonalizar(np.full(CW, 0.9), pal)
    # cimácio (moldura convexa) e a borda de baixo, que faz sombra no armário
    for k, v in enumerate([1.8, 1.0, 0.6, 1.4, 2.6]):
        rgb[28 + k] = tonalizar(np.full(CW, v), pal)
    rgb[30, ::3] = met[2]
    rgb[33] = tonalizar(np.full(CW, 3.4), pal)
    rgb[34] = tonalizar(np.full(CW, 4.0), pal)
    rgb[35] = tonalizar(np.full(CW, 4.0), pal) * 0.6
    # consolos nos cantos (x 0..9 e 50..59): voluta entalhada com folha de metal
    for lado in (0, 1):
        x0 = 0 if lado == 0 else CW - 10
        for y in range(7, 28):
            for dx in range(10):
                x = x0 + (dx if lado == 0 else 9 - dx)
                borda = dx in (0, 9)
                prof = abs(dx - 4.5) / 4.5
                v = 3.9 if borda else 1.2 + prof * 1.6 + (y - 7) / 21 * 0.8
                rgb[y, x] = tonalizar(np.array(v), pal)
        # rosácea de metal no alto do consolo (quatro pétalas e o botão claro) e a canelura do consolo embaixo
        cx, cy = x0 + 5, 12
        for y in range(8, 17):
            for dx in range(1, 9):
                x = x0 + dx
                ddx, ddy = x + 0.5 - cx, y + 0.5 - (cy + 0.5)
                d = math.hypot(ddx, ddy)
                if d < 2.6:                                    # botão de metal abaulado, luz do alto à esquerda
                    lam = max(0, -ddx * 0.5 - ddy * 0.6) / 2.6 + (1 - d / 2.6) * 0.5
                    rgb[y, x] = met[0] if lam > 0.75 else met[1] if lam > 0.45 else met[2] if lam > 0.2 else met[3]
                elif d < 3.6 and int(math.degrees(math.atan2(ddy, ddx)) + 360) % 60 < 30:
                    rgb[y, x] = met[2]                           # anel de contas em volta
        for y in range(18, 27):
            for dx in (3, 6):
                x = x0 + (dx if lado == 0 else 9 - dx)
                rgb[y, x] = tonalizar(np.array(3.4), pal)
            x = x0 + (4 if lado == 0 else 5)
            rgb[y, x] = tonalizar(np.array(0.5), pal)
        rgb[26, x0 + 2:x0 + 8] = met[2]
    # luz da lamparina: o centro da cornija um pouco mais claro, as pontas mais escuras (a moldura repete, então a
    # variação é só vertical, para não criar emenda)
    luz = (1.08 - 0.12 * np.abs(np.linspace(-1, 1, CH)))[:, None, None]
    salvar(np.clip(rgb * luz, 0, 1), None, f"cornija-{madeira}.png")


# ─────────────────────────────── O rodapé (3 fatias) ───────────────────────────────
RW, RH = 48, 10


def rodape(madeira: str) -> None:
    m = MADEIRAS[madeira]
    pal = paleta(m["tons"])
    met = paleta(METAIS[m["metal"]])
    rgb = np.zeros((RH, RW, 3), np.float32)
    alfa = np.zeros((RH, RW), np.float32)
    perfil = [3.9, 0.5, 1.0, 1.6, 2.0, 2.2, 2.6, 3.0, 3.6, 4.0]
    for y in range(RH):
        rgb[y] = tonalizar(np.full(RW, perfil[y]), pal)
        alfa[y] = 1
    rgb[2, ::2] = met[2]
    rgb[2, 1::2] = met[3]
    # pés torneados nos cantos (x 0..9 e 38..47): bolacha com anel de metal; entre eles o miolo do plinto
    for lado in (0, 1):
        x0 = 0 if lado == 0 else RW - 10
        for y in range(RH):
            for dx in range(10):
                x = x0 + dx
                r = 4.6 - max(0, y - 5) * 0.5
                d = abs(dx - 4.5)
                if y >= 5 and d > r:
                    alfa[y, x] = 0
                    continue
                v = 0.6 + d / 4.5 * 2.8 + (0.4 if y > 6 else 0)
                rgb[y, x] = tonalizar(np.array(v), pal)
        rgb[5, x0 + 1:x0 + 9] = met[1]
        rgb[5, x0 + 2] = met[0]
    # entre os pés, embaixo, o rodapé recua (vão escuro)
    alfa[7:, 10:RW - 10] = 0
    rgb[6, 10:RW - 10] = tonalizar(np.full(RW - 20, 4.0), pal)
    salvar(np.clip(rgb, 0, 1), alfa, f"rodape-{madeira}.png")


# ─────────────────────────────── Enfeites (sprites) ───────────────────────────────
class Sprite:
    def __init__(self, w: int, h: int) -> None:
        self.rgb = np.zeros((h, w, 3), np.float32)
        self.a = np.zeros((h, w), np.float32)
        self.w, self.h = w, h

    def p(self, x, y, cor, a=1.0):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            c = hexa(cor) if isinstance(cor, str) else np.asarray(cor, np.float32)
            self.rgb[y, x] = c * a + self.rgb[y, x] * (1 - a) if self.a[y, x] else c
            self.a[y, x] = max(self.a[y, x], a)

    def contorno(self, cor="#140c06"):
        """Contorno escuro de 1 px por fora (como os sprites do salão)."""
        a = self.a > 0.5
        viz = np.zeros_like(a)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            viz |= np.roll(np.roll(a, dy, 0), dx, 1)
        borda = viz & ~a
        borda[0, :] &= a[0, :]; borda[-1, :] &= a[-1, :]
        self.rgb[borda] = hexa(cor)
        self.a[borda] = 1

    def salvar(self, nome: str):
        salvar(np.clip(self.rgb, 0, 1), self.a, nome)


def esfera(s: Sprite, cx, cy, r, pal, luz=(-0.6, -0.7)):
    for y in range(s.h):
        for x in range(s.w):
            dx, dy = (x + 0.5 - cx) / r, (y + 0.5 - cy) / r
            d2 = dx * dx + dy * dy
            if d2 <= 1:
                nz = math.sqrt(1 - d2)
                lam = max(0, -dx * luz[0] - dy * luz[1] + nz * 0.6)
                k = 4 - min(4, lam * 3.6)
                s.p(x, y, tonalizar(np.array(k), pal))


def enfeites() -> None:
    lat = paleta(METAIS["latao"])
    noz = paleta(MADEIRAS["nogueira"]["tons"])
    osso = paleta(("#f6edd6", "#e0d2b0", "#b8a682", "#7a6a4c", "#3a3022"))
    # Aparador de livros em latão (em L, com voluta)
    s = Sprite(11, 20)
    for y in range(20):
        for x in range(3, 7):
            s.p(x, y, tonalizar(np.array([1.2, 0.4, 1.4, 2.8][x - 3] + y * 0.04), lat))
    for x in range(0, 11):
        s.p(x, 18, tonalizar(np.array(1.0 + x * 0.15), lat)); s.p(x, 19, tonalizar(np.array(3.0), lat))
    for y in range(2, 9):
        for x in range(6, 10):
            if math.hypot(x - 7.5, y - 5) < 2.6 and math.hypot(x - 7.5, y - 5) > 1.2:
                s.p(x, y, tonalizar(np.array(1.0 if y < 5 else 2.6), lat))
    s.p(4, 1, lat[0]); s.p(4, 2, lat[0])
    s.contorno(); s.salvar("enfeite-aparador.png")
    # Ampulheta: tampos de madeira, colunas, vidro e areia dourada
    s = Sprite(12, 18)
    for x in range(12):
        for y in (0, 1, 16, 17):
            s.p(x, y, tonalizar(np.array(1.2 + (y % 2) * 1.5 + abs(x - 5.5) * 0.15), noz))
    for y in range(2, 16):
        s.p(1, y, noz[1]); s.p(10, y, noz[3])
        larg = abs(y - 8.5) / 6.5 * 3.4 + 0.6
        for x in range(2, 10):
            if abs(x - 5.5) <= larg:
                vidro = mistura("#dfeaf0", "#9ab0bc", abs(x - 5.5) / 4)
                s.p(x, y, vidro, 0.55)
        if y >= 11:
            for x in range(2, 10):
                if abs(x - 5.5) <= larg - 0.6 and y > 16 - (y - 10):
                    s.p(x, y, "#e8c070" if x < 6 else "#c49a48")
        if 3 <= y <= 6:
            for x in range(2, 10):
                if abs(x - 5.5) <= larg - 0.8 and y >= 4:
                    s.p(x, y, "#e8c070" if x < 6 else "#c49a48")
    s.p(5, 9, "#e8c070"); s.p(5, 10, "#e8c070"); s.p(6, 12, "#f6dc90")
    s.p(4, 3, "#ffffff", 0.7); s.p(3, 13, "#ffffff", 0.6)
    s.contorno(); s.salvar("enfeite-ampulheta.png")
    # Globo terrestre num pé de latão com meridiano
    s = Sprite(17, 22)
    mar = paleta(("#8fd0e8", "#4f9cc4", "#2f6e9a", "#1d4a6e", "#10283e"))
    terra = paleta(("#d8e09a", "#a8b85c", "#6e8a3a", "#465c22", "#283612"))
    esfera(s, 8.5, 8.5, 7.2, mar)
    cont = ruido(77, 17, 17, 3)
    for y in range(17):
        for x in range(17):
            if s.a[y, x] and cont[y, x] > 0.58:
                dx, dy = (x + 0.5 - 8.5) / 7.2, (y + 0.5 - 8.5) / 7.2
                nz = math.sqrt(max(0, 1 - dx * dx - dy * dy))
                lam = max(0, 0.6 * dx * -1 + 0.7 * -dy + nz * 0.6)
                s.p(x, y, tonalizar(np.array(4 - min(4, lam * 3.6)), terra))
    for t in np.linspace(-1.2, 1.9, 40):
        x, y = 8.5 + math.cos(t) * 8.4, 8.5 + math.sin(t) * 8.4
        s.p(x, y, lat[1] if math.sin(t) < 0 else lat[2])
    for y in range(17, 22):
        w = 1 if y < 20 else 4
        for x in range(int(8.5 - w), int(8.5 + w) + 1):
            s.p(x, y, tonalizar(np.array(1.0 + abs(x - 8) * 0.5 + (y - 17) * 0.2), lat))
    s.p(5, 5, "#ffffff", 0.8); s.p(6, 4, "#ffffff", 0.5)
    s.contorno(); s.salvar("enfeite-globo.png")
    # Castiçal de latão com vela (a chama é do site, para poder tremer)
    s = Sprite(10, 18)
    cera = paleta(("#fffaf0", "#f4e8cc", "#dccaa0", "#b09a70", "#6e5c3c"))
    for y in range(2, 13):
        for x in range(3, 7):
            s.p(x, y, tonalizar(np.array([0.4, 0.0, 0.8, 2.2][x - 3]), cera))
    s.p(6, 3, cera[1]); s.p(6, 4, cera[2])        # escorrido de cera
    s.p(4, 1, "#3a2a1a"); s.p(4, 0, "#2a1a0a")    # pavio
    for x in range(1, 9):
        s.p(x, 13, tonalizar(np.array(0.6 + abs(x - 4.5) * 0.4), lat))
    for y in range(14, 16):
        s.p(4, y, lat[1]); s.p(5, y, lat[2])
    for x in range(0, 10):
        s.p(x, 16, tonalizar(np.array(0.8 + abs(x - 4.5) * 0.35), lat)); s.p(x, 17, lat[3])
    s.contorno(); s.salvar("enfeite-castical.png")
    # Pilha de livros deitados (três, com lombada, cabeceado e páginas)
    s = Sprite(24, 14)
    capas = [("#8e2a2a", 0, 22), ("#2a4470", 2, 21), ("#2f5e3a", 1, 23)]
    y = 13
    for cor, x0, w in capas:
        pal_l = paleta((mistura(cor, "#ffffff", 0.35), mistura(cor, "#ffffff", 0.15), hexa(cor), hexa(cor) * 0.7, hexa(cor) * 0.45))
        for yy in range(y - 3, y + 1):
            for x in range(x0, x0 + w):
                k = [1.2, 2.0, 2.4, 3.4][yy - (y - 3)]
                s.p(x, yy, tonalizar(np.array(k + (0.6 if x == x0 else 0)), pal_l))
            s.p(x0 + w - 1, yy, "#efe2c2" if yy not in (y - 3, y) else hexa(cor) * 0.6)  # páginas
        for x in range(x0 + 3, x0 + w - 4, 5):
            s.p(x, y - 2, lat[1]); s.p(x, y - 1, lat[2])  # filetes dourados da lombada
        y -= 4
    s.contorno(); s.salvar("enfeite-pilha.png")
    # Crânio pequeno de estudo (três-quartos, mandíbula, órbitas fundas)
    s = Sprite(13, 12)
    esfera(s, 6.5, 5.2, 5.0, osso, luz=(-0.7, -0.6))
    for y in range(8, 12):
        for x in range(3, 10):
            if abs(x - 6.2) < 3.4 - (y - 8) * 0.4:
                s.p(x, y, tonalizar(np.array(1.4 + (y - 8) * 0.5 + abs(x - 6) * 0.2), osso))
    for (cx, cy, r) in ((4.6, 5.6, 1.5), (8.4, 5.6, 1.2)):
        for y in range(12):
            for x in range(13):
                if math.hypot(x + 0.5 - cx, y + 0.5 - cy) < r:
                    s.p(x, y, "#2a2218")
    s.p(6, 8, "#3a3022"); s.p(7, 8, "#3a3022")
    for x in (4, 6, 8):
        s.p(x, 10, "#7a6a4c")
    s.p(3, 2, "#ffffff", 0.6)
    s.contorno(); s.salvar("enfeite-cranio.png")
    # Tinteiro de vidro escuro com pena
    s = Sprite(12, 20)
    for y in range(12, 20):
        for x in range(1, 9):
            if abs(x - 4.5) < 3.6 - (0 if y > 13 else 1.2):
                k = 3.0 - (1.6 if x == 2 else 0) + (0.6 if x > 6 else 0)
                s.p(x, y, tonalizar(np.array(k), paleta(("#9ab0d8", "#4a5c88", "#283456", "#161c34", "#0a0c1a"))))
    for x in range(2, 8):
        s.p(x, 12, lat[2] if x % 2 else lat[1])
    pena = paleta(("#ffffff", "#f0ece4", "#d4ccbc", "#9a907e", "#5a5246"))
    for i in range(14):
        x, y = 5 + i * 0.45, 13 - i
        s.p(x, y, pena[1]); s.p(x + 1, y, pena[2] if i > 2 else pena[3])
        if i > 3:
            s.p(x + 2, y + 1, pena[0] if i % 2 else pena[2])
    s.contorno(); s.salvar("enfeite-tinteiro.png")


# ─────────────────────────────── Selos de cera da raridade ───────────────────────────────
def selos() -> None:
    cores = {"comum": ("#d8dcde", "#a6aeb2", "#7c868c", "#525a60", "#2e3438"),
             "raro": ("#bfe2ff", "#6eb2ec", "#3a7cc4", "#22528a", "#122c4e"),
             "epico": ("#ecd2ff", "#c08ef0", "#8a52c8", "#5a2e8e", "#321650"),
             "lendario": ("#fff6c4", "#f6d36c", "#d49a2e", "#8e5e10", "#4e3206")}
    atlas = np.zeros((16, 64, 3), np.float32)
    alfa = np.zeros((16, 64), np.float32)
    for i, (nome, tons) in enumerate(cores.items()):
        pal = paleta(tons)
        g = np.random.default_rng(i + 5)
        for y in range(16):
            for x in range(16):
                # disco de cera com a borda ondulada (pingos)
                ang = math.atan2(y - 7.5, x - 7.5)
                r = 6.6 + 0.8 * math.sin(ang * 7 + i) + 0.4 * math.sin(ang * 3)
                d = math.hypot(x - 7.5, y - 7.5)
                if d <= r:
                    nx, ny = (x - 7.5) / 7, (y - 7.5) / 7
                    lam = max(0, -nx * 0.6 - ny * 0.7 + 0.5)
                    k = 3.4 - lam * 2.6
                    if 3.2 < d < 4.4:
                        k += 0.9                          # o vinco do carimbo
                    atlas[y, i * 16 + x] = tonalizar(np.array(k), pal)
                    alfa[y, i * 16 + x] = 1
                elif d <= r + 1:
                    atlas[y, i * 16 + x] = hexa("#140c06")
                    alfa[y, i * 16 + x] = 1
        # o símbolo no meio: losango (a gema da raridade) em alto-relevo
        for y in range(5, 11):
            for x in range(5, 11):
                if abs(x - 7.5) + abs(y - 7.5) <= 2.6:
                    atlas[y, i * 16 + x] = tonalizar(np.array(0.4 + (0.9 if x + y > 15 else 0)), pal)
        atlas[5, i * 16 + 6] = pal[0]
    salvar(np.clip(atlas, 0, 1), alfa, "selos.png")


# ─────────────────────────────── A mesa da ficha (palco HD-2D) ───────────────────────────────
MW, MH, MESC = 200, 90, 3


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    if raio <= 0:
        return arr
    n = int(raio * 3) + 1
    k = np.exp(-(np.arange(-n, n + 1, dtype=np.float32) ** 2) / (2 * raio * raio)); k /= k.sum()
    out = np.pad(arr, ((n, n), (0, 0), (0, 0)), mode="edge")
    out = sum(out[i:i + arr.shape[0]] * k[i] for i in range(2 * n + 1))
    out = np.pad(out, ((0, 0), (n, n), (0, 0)), mode="edge")
    return sum(out[:, i:i + arr.shape[1]] * k[i] for i in range(2 * n + 1))


def mesa(periodo: str) -> Image.Image:
    luz = LUZES[periodo]
    noz = paleta(MADEIRAS["nogueira"]["tons"])
    mog = paleta(MADEIRAS["mogno"]["tons"])
    lat = paleta(METAIS["latao"])
    g = np.random.default_rng(91)
    yy, xx = np.mgrid[0:MH, 0:MW].astype(np.float32)
    HORIZ = 58                                            # onde o tampo da mesa encontra a parede

    # Fundo: a estante na parede, com nichos e lombadas (vai ficar desfocada: profundidade de campo).
    fundo = tonalizar(np.full((MH, MW), 3.2) + 0.3 * ruido(5, MW, MH, 8), noz)
    cores_l = [hexa(c) for c in ("#8e2a2a", "#2a4470", "#2f5e3a", "#7a4a2a", "#b88a3a", "#5a2e4e", "#2a6a6a", "#a8402e", "#d6c49a")]
    for y0, y1 in ((2, 18), (21, 37), (40, 56)):
        fundo[y1:y1 + 3] = tonalizar(np.full((3, MW), 1.2), noz)          # tábua
        x = 0
        while x < MW:
            w = int(g.integers(3, 7))
            alt = int(g.integers(y1 - y0 - 6, y1 - y0))
            c = cores_l[g.integers(len(cores_l))] * (0.75 + g.random() * 0.35)
            if g.random() < 0.08:
                x += w + 3
                continue
            for xi in range(x, min(MW, x + w)):
                sh = 0.65 if xi == x else (1.1 if xi == x + 1 else 0.9)
                fundo[y1 - alt:y1, xi] = c * sh
            fundo[y1 - alt + 2, x:min(MW, x + w)] = lat[2] * 0.8
            x += w + (1 if g.random() < 0.7 else 0)
    # Tampo da mesa em perspectiva (tábuas que fogem para o fundo) e o mata-borrão de couro verde no meio.
    tampo = np.zeros((MH, MW, 3), np.float32)
    prof = np.clip((yy - HORIZ) / (MH - HORIZ), 0, 1)
    xc = (xx - MW / 2) / (0.35 + prof * 0.65)
    veio = np.sin(xc * 0.08 + np.sin(yy * 0.7) * 0.6) * 0.5 + 0.5
    t = 1.6 + 0.8 * (1 - prof) + 0.5 * (veio > 0.7) + 0.35 * (np.mod(xc, 26) < 1.2)
    tampo = tonalizar(t, mog)
    couro = (np.abs(xc) < 46) & (yy > HORIZ + 3)
    tampo[couro] = tonalizar(1.8 + 1.2 * (1 - prof[couro]) + 0.2 * ruido(8, MW, MH, 2)[couro], paleta(("#7ab08a", "#3e7a58", "#245a40", "#163c2a", "#0c2218")))
    borda_couro = couro & ~((np.abs(xc) < 44) & (yy > HORIZ + 5))
    tampo[borda_couro] = lat[2]
    cena = np.where((yy >= HORIZ)[..., None], tampo, fundo)
    cena[HORIZ] = tonalizar(np.full(MW, 0.4), mog)                         # a quina do tampo
    alfa_fundo = (yy < HORIZ)

    # Objetos sobre a mesa: castiçal com vela à esquerda, tinteiro e pena à direita, pilha de livros no canto.
    obj = np.zeros((MH, MW, 4), np.float32)

    def p(x, y, c, a=1.0):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < MW and 0 <= y < MH:
            obj[y, x, :3] = c; obj[y, x, 3] = a
    vela_x, vela_y = 34, 46
    cera = paleta(("#fffaf0", "#f4e8cc", "#dccaa0", "#b09a70", "#6e5c3c"))
    for y in range(vela_y, 66):
        for x in range(vela_x - 2, vela_x + 3):
            p(x, y, tonalizar(np.array([0.2, 0.0, 0.4, 1.2, 2.4][x - vela_x + 2]), cera))
    for x in range(vela_x - 6, vela_x + 7):
        p(x, 66, tonalizar(np.array(0.6 + abs(x - vela_x) * 0.3), lat)); p(x, 67, lat[2])
    for x in range(vela_x - 8, vela_x + 9):
        p(x, 71, tonalizar(np.array(0.6 + abs(x - vela_x) * 0.3), lat)); p(x, 72, lat[3])
    for y in range(67, 71):
        p(vela_x, y, lat[1]); p(vela_x + 1, y, lat[3])
    chama = [(vela_x, vela_y - 1), (vela_x, vela_y - 2), (vela_x, vela_y - 3), (vela_x + 1, vela_y - 2), (vela_x, vela_y - 4)]
    for (x, y) in chama:
        p(x, y, np.array([1.6, 1.25, 0.6]))
    p(vela_x, vela_y - 2, np.array([2.4, 2.1, 1.4]))
    # tinteiro e pena
    ti_x = 160
    for y in range(64, 72):
        for x in range(ti_x - 4, ti_x + 5):
            if abs(x - ti_x) < 4 - (1 if y == 64 else 0):
                p(x, y, tonalizar(np.array(3.0 - (1.4 if x == ti_x - 2 else 0)), paleta(("#9ab0d8", "#4a5c88", "#283456", "#161c34", "#0a0c1a"))))
    for i in range(22):
        p(ti_x + 1 + i * 0.5, 63 - i, np.array([0.95, 0.93, 0.88])); p(ti_x + 2 + i * 0.5, 63 - i, np.array([0.8, 0.77, 0.7]))
        if i > 5:
            p(ti_x + 3 + i * 0.5, 64 - i, np.array([0.98, 0.96, 0.92]))
    # pilha de livros à direita, ao fundo
    for k, (c, w) in enumerate(((hexa("#2a4470"), 30), (hexa("#8e2a2a"), 27), (hexa("#b88a3a"), 25))):
        y0 = 62 - k * 4
        for y in range(y0 - 3, y0 + 1):
            for x in range(174 + k, 174 + k + w):
                if x < MW:
                    sh = [1.15, 1.0, 0.85, 0.6][y - (y0 - 3)]
                    p(x, y, c * sh if x < 174 + k + w - 1 else np.array([0.92, 0.86, 0.72]))
        for x in range(178 + k, 174 + k + w - 2, 6):
            p(x, y0 - 2, lat[1])

    # ─── Montagem com luz (3x): profundidade de campo, luz da vela, feixe com poeira, bloom e vinheta ───
    def amp(a):
        return a.repeat(MESC, 0).repeat(MESC, 1)
    W3, H3 = MW * MESC, MH * MESC
    Y3, X3 = np.mgrid[0:H3, 0:W3].astype(np.float32)
    fundo3 = desfocar(amp(np.where(alfa_fundo[..., None], cena, 0)), 3.2)
    mesa3 = amp(np.where(alfa_fundo[..., None], 0, cena))
    cena3 = np.where(amp(alfa_fundo[..., None]), fundo3, mesa3)
    amb = np.array(luz["ambiente"], np.float32)
    cor_luz = np.array(luz["cor"], np.float32)
    # luz da vela (pontual, quente, com queda e faixas no tampo)
    lx, ly = (vela_x + 0.5) * MESC, (vela_y - 2.5) * MESC
    d = np.hypot(X3 - lx, (Y3 - ly) * 1.25)
    vela = 1.5 / (1 + (d / 70) ** 2)
    faixas = np.floor(vela * 7) / 7                     # a luz no tampo cai em degraus (pixel art)
    luzv = np.where(Y3 >= HORIZ * MESC, faixas, vela)[..., None] * np.array([1.0, 0.72, 0.42])
    # luz da hora vinda de cima e da direita (janela fora de quadro); à noite quase só a vela
    dia = {"manha": 0.95, "tarde": 0.8, "noite": 0.28}[periodo]
    janela = dia * (0.55 + 0.45 * np.clip((X3 / W3) * 0.9 + 0.1, 0, 1))[..., None] * cor_luz
    ilum = amb * 0.5 + janela + luzv * (1.0 if periodo == "noite" else 0.7)
    out = cena3 * ilum
    # feixe de luz volumétrico com poeira (da direita alta para o centro do tampo)
    eixo = (X3 - W3 * 0.78) * 0.78 + (Y3 - 0) * 0.62
    feixe = np.exp(-(eixo / 70) ** 2) * np.clip(1 - Y3 / H3, 0.15, 1) * (0.22 if periodo != "noite" else 0.07)
    out += feixe[..., None] * cor_luz
    gp = np.random.default_rng(13)
    for _ in range(90):
        px, py = gp.random() * W3, gp.random() * H3
        if abs((px - W3 * 0.78) * 0.78 + py * 0.62) < 90:
            r = gp.choice([1, 1, 2])
            out[int(py):int(py) + r, int(px):int(px) + r] += 0.45 * cor_luz
    # objetos por cima, nítidos, com a mesma luz
    obj3 = amp(obj)
    acesa = amp(obj[..., :3] > 1.0)
    obj_lit = np.where(acesa, obj3[..., :3], obj3[..., :3] * ilum)
    out = out * (1 - obj3[..., 3:4]) + obj_lit * obj3[..., 3:4]
    # o halo da chama (luz no ar em volta dela) e o reflexo no tampo logo abaixo
    halo = np.exp(-np.hypot(X3 - lx, Y3 - ly) / 16) * 0.85 + np.exp(-np.hypot(X3 - lx, Y3 - ly) / 55) * 0.22
    out += halo[..., None] * np.array([1.0, 0.7, 0.36])
    refl = np.exp(-np.hypot((X3 - lx) * 0.5, (Y3 - 72 * MESC) * 2.2) / 18) * 0.25
    out += refl[..., None] * np.array([1.0, 0.72, 0.4])
    # bloom
    claro = np.clip(out - 0.9, 0, None)
    out = out + desfocar(claro, 10) * 0.9 + desfocar(claro, 3) * 0.5
    # mapeamento de tom, cor (altas luzes quentes, sombras frias), vinheta e grão
    out = out / (1 + out * 0.32)
    lum = out.mean(-1, keepdims=True)
    out = out + (np.array([0.03, 0.01, -0.03]) * lum) + (np.array([-0.01, 0.0, 0.025]) * (1 - lum))
    vin = 1 - 0.55 * (((X3 / W3 - 0.5) * 1.5) ** 2 + ((Y3 / H3 - 0.45) * 1.4) ** 2)
    out *= np.clip(vin, 0.35, 1)[..., None]
    out += (np.random.default_rng(3).random(out.shape[:2])[..., None] - 0.5) * 0.02
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGB")


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    for madeira in MADEIRAS:
        for periodo in PERIODOS:
            fileira(madeira, periodo)
        pilastra(madeira)
        cornija(madeira)
        rodape(madeira)
    enfeites()
    selos()
    for periodo in PERIODOS:
        mesa(periodo).save(PASTA / f"mesa-{periodo}.webp", quality=84, method=6)
    total = sum(f.stat().st_size for f in PASTA.iterdir())
    print(len(list(PASTA.iterdir())), "arquivos,", total // 1024, "KB")
    if "--previa" in sys.argv:
        previa(Path(sys.argv[sys.argv.index("--previa") + 1]))


def previa(destino: Path) -> None:
    """Uma prancha com todas as peças em 3x, para revisar olhando."""
    destino.mkdir(parents=True, exist_ok=True)
    pecas = sorted(p for p in PASTA.iterdir() if p.suffix == ".png")
    imgs = [Image.open(p).convert("RGBA") for p in pecas]
    larg = 1500
    x = y = 0; alt_linha = 0
    posicoes = []
    for im in imgs:
        w, h = im.width * 3, im.height * 3
        if x + w > larg:
            x = 0; y += alt_linha + 12; alt_linha = 0
        posicoes.append((x, y)); x += w + 12; alt_linha = max(alt_linha, h)
    prancha = Image.new("RGBA", (larg, y + alt_linha + 12), (40, 40, 44, 255))
    for im, (px, py) in zip(imgs, posicoes):
        prancha.alpha_composite(im.resize((im.width * 3, im.height * 3), Image.NEAREST), (px, py))
    prancha.save(destino / "armario-prancha.png")


if __name__ == "__main__":
    main()
