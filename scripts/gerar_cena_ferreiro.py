"""Cenário "HD-2D" do Caderno de erros: a oficina do ferreiro da vila (30/10/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai das
funções abaixo, no mesmo jeito dos outros cenários (scripts/gerar_cena_arena.py, scripts/gerar_cena_vila.py): a cena é
pintada em pixel art (480 x 160), camada por camada, e depois montada em 3x com a luz calculada por pixel.

A ideia: o Caderno de erros guarda as questões que a pessoa errou, para "reforjar". A cena é a ferraria da vila:
- à direita, a forja de tijolo com coifa de pedra fuliginosa, brasas laranja, chama e fumaça subindo pela chaminé; o
  fole de couro ao lado, com a alavanca e a corda; ganchos com tenazes e atiçadores pendurados na coifa;
- no centro-direita, a bigorna sobre o toco, com uma placa de fêmur (placa ortopédica de 9 furos) recém-tirada do
  fogo, a ponta ainda em brasa, o martelo ao lado e as faíscas do último golpe;
- o barril de água para temperar, com a tenaz dentro e o vapor subindo;
- a porta larga ao fundo mostrando a rua da vila na hora do dia (o feixe de sol entra e desenha a porta no chão);
- na parede da esquerda (calma, é onde o texto entra), prateleiras com ferraduras, correntes, lâminas, um elmo, a
  caixa de pregos e, discretas no meio das peças, placas e parafusos; o porta-ferramentas com martelos e tenazes;
- perto da bigorna, a prateleira das encomendas da "clínica": placas, parafusos, uma haste intramedular e, presa na
  parede, a folha com o desenho do fêmur (o molde).

A forja é a luz principal e fica acesa nos três períodos; à noite ela domina (e a lamparina pendurada acende).
O chão em x 330–380 (y 95–150) fica livre para o mascote, que recebe a luz da forja.

Gera em public/pixel/paginas/: ferreiro-{manha,tarde,noite}.webp (1440 x 480) e -960.webp (960 x 320).
Uso: python3 scripts/gerar_cena_ferreiro.py              (os três períodos)
     python3 scripts/gerar_cena_ferreiro.py noite        (só um ou alguns: manha, tarde, noite)
"""
from __future__ import annotations

import math
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "paginas"
W, H, ESC = 480, 160, 3

CHAO = 108                         # linha onde a parede encontra o chão
PORTA = (198, 30, 64, 78)          # x, y, largura, altura do vão da porta (vista da rua)
FOGO = (407, 79)                   # centro do fogo da forja
BIGORNA_PONTA = (309, 104)         # ponta em brasa da placa na bigorna (de onde saem as faíscas)
LAMPARINA = (352, 41)


# ─────────────────────────────── Pincéis básicos ───────────────────────────────
@lru_cache(maxsize=4096)
def _hexa(c: str) -> tuple[float, float, float]:
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def hexa(c: str) -> np.ndarray:
    return np.array(_hexa(c), dtype=np.float32)


def misturar(a, b, t: float) -> np.ndarray:
    a = hexa(a) if isinstance(a, str) else a
    b = hexa(b) if isinstance(b, str) else b
    return a * (1 - t) + b * t


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples."""

    def __init__(self) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            rgb = hexa(cor) if isinstance(cor, str) else np.asarray(cor, dtype=np.float32)
            base = self.c[y, x]
            if a >= 1:
                base[:3] = rgb
                base[3] = 1
                return
            na = a + base[3] * (1 - a)
            if na > 0:
                base[:3] = (rgb * a + base[:3] * base[3] * (1 - a)) / na
            base[3] = na

    def ret(self, x0, y0, w, h, cor, a: float = 1.0) -> None:
        x0, y0, w, h = int(x0), int(y0), int(w), int(h)
        xa, xb, ya, yb = max(0, x0), min(W, x0 + w), max(0, y0), min(H, y0 + h)
        if xa >= xb or ya >= yb:
            return
        rgb = hexa(cor) if isinstance(cor, str) else np.asarray(cor, dtype=np.float32)
        if a >= 1:
            self.c[ya:yb, xa:xb, :3] = rgb
            self.c[ya:yb, xa:xb, 3] = 1
        else:
            for y in range(ya, yb):
                for x in range(xa, xb):
                    self.p(x, y, rgb, a)

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / n
            self.p(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), cor, a)

    def disco(self, cx, cy, r, cores, luz=(-0.6, -0.8), a: float = 1.0, achatar: float = 1.0) -> None:
        lx, ly = luz
        for y in range(int(cy - r * achatar) - 1, int(cy + r * achatar) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                dx, dy = x + 0.5 - cx, (y + 0.5 - cy) / achatar
                d = math.hypot(dx, dy)
                if d <= r:
                    k = (dx * lx + dy * ly) / max(r, 1) + (((x * 73856093) ^ (y * 19349663)) % 997 / 997 - 0.5) * 0.3
                    cor = cores[0] if k > 0.38 else cores[1] if k > -0.2 else cores[2]
                    self.p(x, y, cor, a)

    def bitmap(self, x0, y0, linhas: list[str], cores: dict, a: float = 1.0) -> None:
        for j, linha in enumerate(linhas):
            for i, ch in enumerate(linha):
                if ch in cores:
                    self.p(x0 + i, y0 + j, cores[ch], a)


def ruido(seed: int, escala: int, w: int = W, h: int = H) -> np.ndarray:
    g = np.random.default_rng(seed)
    pequeno = g.random((h // escala + 2, w // escala + 2)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize((w + escala * 2, h + escala * 2), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32)[:h, :w] / 255


def ruido_ret(seed: int, ex: int, ey: int, w: int = W, h: int = H) -> np.ndarray:
    g = np.random.default_rng(seed)
    pequeno = g.random((h // ey + 2, w // ex + 2)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize(((w // ex + 2) * ex, (h // ey + 2) * ey), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32)[:h, :w] / 255


def suave(a: float, b: float, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# Paletas (do mais escuro ao mais claro)
PEDRA = ("#1c1816", "#2a2420", "#38302a", "#463c34", "#564a40", "#6a5c4e", "#82725e")
TIJOLO = ("#2a120c", "#4a2016", "#6a2e1e", "#843c26", "#9c5034", "#b46a46")
MADEIRA = ("#1a100a", "#2e1c10", "#4a2e1a", "#664226", "#845834", "#a47248")
FERRO = ("#121318", "#22252c", "#363a44", "#4e545e", "#6c7480", "#9aa2ae", "#d6dce4")
ACO = ("#2a3038", "#4a5664", "#748292", "#a2b0be", "#cad4de", "#eef4fa")   # aço cirúrgico, mais claro e frio
COURO = ("#24120a", "#3e2212", "#5a341c", "#784828", "#946036")
LATAO = ("#3a2408", "#6a4612", "#a0701e", "#d0a038", "#f0d070")


# ─────────────────────────────── Parede, teto e porta ───────────────────────────────
def parede() -> tuple[Camada, np.ndarray]:
    """Parede de pedra fuliginosa, vigas do teto, esteios de madeira e a moldura da porta. Devolve a máscara do vão."""
    c = Camada()
    g = np.random.default_rng(11)
    n = ruido(12, 5)
    n2 = ruido(13, 2)
    fuligem = ruido(14, 24)
    # pedras irregulares em fiadas
    y = 12
    fiada = 0
    while y < CHAO:
        alt = int(g.integers(6, 9))
        x = -int(g.integers(0, 12))
        while x < W:
            larg = int(g.integers(9, 19))
            tom = g.random()
            for yy in range(y, min(CHAO, y + alt)):
                for xx in range(max(0, x), min(W, x + larg)):
                    if yy == y + alt - 1 or xx == x + larg - 1:
                        k = 0 if (xx + yy) % 3 else 1                      # argamassa
                    else:
                        v = tom * 0.55 + n[yy, xx] * 0.3 + n2[yy, xx] * 0.25
                        k = 2 if v < 0.42 else 3 if v < 0.62 else 4
                        if yy == y and xx > x:
                            k = min(6, k + 1)                              # aresta de cima pega luz
                        if xx == x and yy > y:
                            k = min(6, k + 1)
                        if yy == y + alt - 2:
                            k = max(1, k - 1)                              # aresta de baixo na sombra
                        if g.random() < 0.025:
                            k = max(1, k - 2)                              # buraquinhos
                    c.p(xx, yy, PEDRA[k])
            x += larg
        y += alt
        fiada += 1
    # fuligem: escurece em cima, perto da coifa e em manchas
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    sujo = 0.25 * (1 - suave(12, 70, ys)) + 0.45 * np.exp(-(((xs - 407) / 70) ** 2 + ((ys - 40) / 50) ** 2))
    sujo += (fuligem - 0.5) * 0.25
    sujo = np.clip(sujo, 0, 0.7)
    c.c[:CHAO, :, :3] *= (1 - sujo[:CHAO, :, None])
    # rodapé úmido e escuro
    for yy in range(CHAO - 5, CHAO):
        c.c[yy, :, :3] *= 0.82 - (yy - (CHAO - 5)) * 0.04
    # teto: tábuas escuras, caibros e a viga mestra
    for yy in range(0, 12):
        for xx in range(W):
            tab = (xx // 7) % 2
            cor = misturar(MADEIRA[0], MADEIRA[1], 0.3 + 0.4 * tab + (n2[yy, xx] - 0.5) * 0.4)
            c.p(xx, yy, cor)
    for x0 in range(4, W, 32):
        c.ret(x0, 0, 6, 9, MADEIRA[2])
        c.ret(x0, 0, 1, 9, MADEIRA[3])
        c.ret(x0 + 5, 0, 1, 9, MADEIRA[1])
    for yy in range(9, 15):
        for xx in range(W):
            k = 4 if yy == 9 else 3 if yy < 12 else 2 if yy < 14 else 1
            if (xx * 13 + yy * 7) % 23 == 0:
                k = max(1, k - 1)                                          # veios
            c.p(xx, yy, MADEIRA[k])
    for x0 in range(20, W, 64):
        c.p(x0, 11, FERRO[4])                                              # cravos da viga
        c.p(x0 + 1, 11, FERRO[2])
    # esteios de madeira na parede
    for x0 in (184, 288):
        for yy in range(15, CHAO):
            for xx in range(x0, x0 + 6):
                k = 3 if xx == x0 + 1 else 4 if xx == x0 else 1 if xx == x0 + 5 else 2
                if (yy * 3 + xx) % 17 == 0:
                    k = max(1, k - 1)
                c.p(xx, yy, MADEIRA[k])
        c.ret(x0 - 2, CHAO - 3, 10, 3, PEDRA[3])
        c.ret(x0 - 2, CHAO - 3, 10, 1, PEDRA[5])
    # vão da porta
    px, py, pw, ph = PORTA
    vao = np.zeros((H, W), dtype=np.float32)
    vao[py:py + ph, px:px + pw] = 1
    c.c[py:py + ph, px:px + pw] = 0
    # moldura grossa de madeira (umbrais e verga)
    for yy in range(py - 6, CHAO):
        for xx in list(range(px - 5, px)) + list(range(px + pw, px + pw + 5)):
            lado = xx < px
            i = xx - (px - 5) if lado else xx - (px + pw)
            k = (4, 3, 3, 2, 1)[i] if lado else (1, 2, 3, 3, 4)[4 - i] if False else (2, 3, 3, 2, 1)[i]
            if (yy * 5 + xx) % 19 == 0:
                k = max(1, k - 1)
            c.p(xx, yy, MADEIRA[k])
    for yy in range(py - 6, py):
        for xx in range(px - 5, px + pw + 5):
            k = 4 if yy == py - 6 else 3 if yy < py - 2 else 2 if yy < py - 1 else 1
            if (xx * 7 + yy) % 13 == 0:
                k = max(1, k - 1)
            c.p(xx, yy, MADEIRA[k])
    for xx in (px - 3, px + pw + 2):
        for yy in (py - 4, py + 20, py + 50):
            c.p(xx, yy, FERRO[5])
            c.p(xx, yy + 1, FERRO[2])
    # ferradura da sorte na verga (pontas para cima)
    c.bitmap(px + pw // 2 - 4, py - 13, [
        "##.....##",
        "#o.....o#",
        "#o.....o#",
        "#o.....o#",
        ".#o...o#.",
        "..#ooo#..",
        "...###...",
    ], {"#": FERRO[2], "o": FERRO[4]})
    c.p(px + pw // 2 - 4, py - 13, FERRO[5])
    # soleira de pedra
    c.ret(px - 6, CHAO - 2, pw + 12, 2, PEDRA[5])
    c.ret(px - 6, CHAO - 1, pw + 12, 1, PEDRA[3])
    return c, vao


def exterior(periodo: str) -> np.ndarray:
    """A rua da vila vista pela porta: céu, colina, a casa em frente, a árvore e o calçamento (RGB, só no vão)."""
    px, py, pw, ph = PORTA
    out = np.zeros((H, W, 3), dtype=np.float32)
    g = np.random.default_rng(21)
    nuvem = ruido_ret(22, 14, 3)
    ceu_cores = {
        "manha": ("#5aa0e0", "#a8d4f2", "#e8f4f4"),
        "tarde": ("#5a4a8a", "#f08a4a", "#ffd88a"),
        "noite": ("#060c22", "#122454", "#24386a"),
    }[periodo]
    hor = 88                                                             # horizonte (pé das casas distantes)
    for y in range(py, py + ph):
        for x in range(px, px + pw):
            t = (y - py) / (hor - py)
            cor = misturar(ceu_cores[0], ceu_cores[1], min(1, t * 1.2)) if t < 0.83 else misturar(ceu_cores[1], ceu_cores[2], (t - 0.83) / 0.17)
            if periodo != "noite":
                nv = nuvem[y, x]
                if nv > 0.62 and y < 66:
                    cor = misturar(cor, "#ffffff" if periodo == "manha" else "#ffc8a0", min(0.7, (nv - 0.62) * 3))
            out[y, x] = cor
    # sol / lua
    if periodo == "tarde":
        sx, sy = 216, 70
        for y in range(py, py + ph):
            for x in range(px, px + pw):
                d = math.hypot(x - sx, y - sy)
                if d < 5:
                    out[y, x] = hexa("#fff4c8")
                elif d < 22:
                    out[y, x] += hexa("#ff9a40") * (1 - d / 22) ** 2 * 0.7
    if periodo == "noite":
        lx, ly = 248, 42
        for y in range(py, py + ph):
            for x in range(px, px + pw):
                d = math.hypot(x - lx, y - ly)
                if d < 4.5:
                    out[y, x] = hexa("#eef2ff") if math.hypot(x - lx - 1.5, y - ly + 1) > 2.2 else hexa("#c8d2ee")
                elif d < 16:
                    out[y, x] += hexa("#4a64b0") * (1 - d / 16) * 0.5
                elif g.random() < 0.012 and y < 70:
                    out[y, x] = hexa("#dfe6ff") * (0.6 + g.random() * 0.4)
    # colina distante com o castelinho
    coli = {"manha": "#7aa0b0", "tarde": "#9a6a6a", "noite": "#16203a"}[periodo]
    for x in range(px, px + pw):
        topo = 80 - 6 * math.sin((x - px) / 22) - 3 * math.sin((x - px) / 7.5)
        for y in range(int(topo), hor):
            out[y, x] = misturar(coli, ceu_cores[2], 0.25) * (0.95 + 0.05 * ((x + y) % 2))
    for (cx, alt) in ((246, 9), (250, 13), (254, 8)):
        for y in range(71 - alt, 75):
            for x in range(cx - 1, cx + 2):
                out[y, x] = misturar(coli, "#000000", 0.18)
        out[70 - alt, cx] = misturar(coli, "#000000", 0.18)
    # casa em frente (enxaimel): parede caiada, vigas, janela e telhado
    cas = {"manha": ("#e8dcc0", "#b8a888", "#6a4a30", "#9a4a34", "#5a2a20"),
           "tarde": ("#f0b880", "#b07a58", "#5a3420", "#a0402a", "#5a2018"),
           "noite": ("#3a4260", "#2a3048", "#161a2a", "#2a2440", "#14121e")}[periodo]
    x0, x1, base, beiral = 200, 238, 96, 56
    for y in range(beiral - 14, base):
        for x in range(x0 - 2, x1 + 3):
            if not (px <= x < px + pw):
                continue
            if y < beiral:
                meio = (x0 + x1) / 2
                if abs(x - meio) > (y - (beiral - 14)) * 1.55 + 1:
                    continue
                k = 3 if ((x + y) % 4 < 2) else 4
                if (y - (beiral - 14)) % 3 == 0:
                    k = 4
                out[y, x] = hexa(cas[k])
                continue
            if x < x0 or x > x1:
                continue
            cor = hexa(cas[0]) if x < x0 + 26 else hexa(cas[1])               # canto em sombra
            viga = x in (x0, x0 + 13, x0 + 26, x1) or y in (beiral, beiral + 1, 76) or abs((x - x0) - (y - 77) * 0.8) < 0.6 and y > 77
            if viga:
                cor = hexa(cas[2])
            out[y, x] = cor
    # janela da casa (acesa à noite) e porta
    jcor = {"manha": "#3a4a5a", "tarde": "#ffd880", "noite": "#ffc860"}[periodo]
    for y in range(62, 72):
        for x in range(204, 212):
            moldura = y in (62, 71) or x in (204, 211) or x == 208 or y == 67
            out[y, x] = hexa(cas[2]) if moldura else hexa(jcor)
    for y in range(80, 96):
        for x in range(226, 234):
            out[y, x] = hexa(cas[2]) if x in (226, 233) or y == 80 else misturar(cas[2], "#000000", 0.3)
    out[88, 231] = hexa("#d0a038")
    # árvore à direita (copa redonda por camadas) e poste de luz
    folha = {"manha": ("#2a5a2a", "#3e7a34", "#5e9a44", "#8abe5a"),
             "tarde": ("#3a3a1e", "#5a5a24", "#8a7a30", "#d0a040"),
             "noite": ("#0a1418", "#101e22", "#18282c", "#22343a")}[periodo]
    tronco = {"manha": "#4a3420", "tarde": "#3a2414", "noite": "#0c0c12"}[periodo]
    for y in range(66, 96):
        for x in range(251, 254):
            out[y, x] = hexa(tronco)
    fn = ruido(23, 3)
    for y in range(40, 76):
        for x in range(240, px + pw):
            d = math.hypot((x - 254) / 14, (y - 58) / 13) + (fn[y, x] - 0.5) * 0.45
            if d < 1:
                luz = ((254 - x) * 0.6 + (58 - y)) / 16
                if periodo == "tarde":
                    luz = (x - 254) * -0.9 / 14 + (58 - y) / 20
                k = 3 if luz > 0.55 else 2 if luz > 0.05 else 1 if d < 0.8 else 0
                if fn[y, x] > 0.72 and k < 3:
                    k += 1
                out[y, x] = hexa(folha[k])
    # calçamento da rua (pedras arredondadas em perspectiva)
    rua = {"manha": ("#8a8478", "#a8a090", "#6a6458"), "tarde": ("#a87858", "#d09a6a", "#7a5038"),
           "noite": ("#1e2234", "#2a3048", "#14162a")}[periodo]
    for y in range(base, py + ph):
        t = (y - base) / (py + ph - base)
        alt = 1 + int(t * 3)
        for x in range(px, px + pw):
            linha = (y - base) // max(1, alt)
            junta = (y - base) % max(1, alt) == 0 or (x + linha * 3) % (3 + int(t * 4)) == 0
            out[y, x] = hexa(rua[2]) if junta else hexa(rua[1]) if (x + y) % 5 == 0 else hexa(rua[0])
    # poste com lampião (aceso à noite)
    for y in range(64, 100):
        out[y, 241] = hexa("#1a1a20")
    for y in range(60, 66):
        for x in range(239, 244):
            if periodo == "noite":
                out[y, x] = hexa("#ffe2a0") if 60 < y < 65 and 239 < x < 243 else hexa("#3a2a1a")
            else:
                out[y, x] = hexa("#2a2a30") if y in (60, 65) or x in (239, 243) else hexa("#8a9aa8")
    return out


# ─────────────────────────────── Prateleiras e ferramentas ───────────────────────────────
def ferradura(c: Camada, x: int, y: int, k: float = 1.0) -> None:
    c.bitmap(x, y, [
        ".###.",
        "#o.o#",
        "#...#",
        "#...#",
        "#...#",
    ], {"#": FERRO[3], "o": FERRO[2]})
    c.p(x + 1, y, FERRO[5])
    c.p(x, y + 1, FERRO[4])


def placa_orto(c: Camada, x: int, y: int, comp: int, horizontal: bool = True, furos: int = 0, pal=ACO) -> None:
    """Placa ortopédica estreita, com furos a cada 3 px (aço cirúrgico frio)."""
    passo = 3
    if horizontal:
        for i in range(comp):
            c.p(x + i, y, pal[4] if i % passo else pal[3])
            c.p(x + i, y + 1, pal[2] if (i % passo) != 1 else pal[0])
        c.p(x, y, pal[3])
        c.p(x + comp - 1, y + 1, pal[1])
        c.p(x + 1, y, pal[5])
    else:
        for j in range(comp):
            c.p(x, y + j, pal[4])
            c.p(x + 1, y + j, pal[2] if (j % passo) != 1 else pal[0])
        c.p(x, y, pal[5])


def parafuso(c: Camada, x: int, y: int, alt: int = 5) -> None:
    """Parafuso cortical em pé: cabeça e a rosca em zigue-zague."""
    c.p(x - 1, y, ACO[3])
    c.p(x, y, ACO[5])
    c.p(x + 1, y, ACO[2])
    for j in range(1, alt):
        c.p(x, y + j, ACO[3] if j % 2 else ACO[1])
        c.p(x + (1 if j % 2 else -1), y + j, ACO[2], 0.8)


def prateleira(c: Camada, x0: int, y: int, w: int) -> None:
    """Tábua com mão-francesa nas pontas."""
    c.ret(x0, y, w, 1, MADEIRA[4])
    c.ret(x0, y + 1, w, 2, MADEIRA[2])
    c.ret(x0, y + 3, w, 1, MADEIRA[1])
    for xb in (x0 + 3, x0 + w - 5):
        for j in range(6):
            c.p(xb, y + 3 + j, MADEIRA[2])
            c.p(xb + 1, y + 3 + j, MADEIRA[1])
            if j < 5:
                c.p(xb + 2 + (j < 2) - (j > 3), y + 4 + j, MADEIRA[1], 0.8)
    # sombra da tábua na parede
    for xx in range(x0, x0 + w):
        c.p(xx, y + 4, "#000000", 0.35)
        c.p(xx, y + 5, "#000000", 0.18)


def prateleiras_esquerda(c: Camada) -> None:
    """A estante de parede da esquerda: ferraduras, correntes, lâminas, elmo, potes e, discretos, implantes."""
    g = np.random.default_rng(31)
    for (y, x0, w) in ((36, 14, 150), (58, 14, 150), (80, 14, 150)):
        prateleira(c, x0, y, w)
    # fileira de cima: ferraduras penduradas em pregos, um elmo, potes
    for i in range(7):
        ferradura(c, 18 + i * 7, 30)
    c.disco(84, 31, 5, (FERRO[4], FERRO[3], FERRO[1]))                   # elmo
    c.ret(79, 31, 11, 5, FERRO[2])
    c.ret(79, 31, 11, 1, FERRO[4])
    c.ret(83, 31, 1, 4, FERRO[0])
    c.ret(85, 31, 1, 4, FERRO[0])
    for (x, h) in ((96, 9), (104, 7), (111, 10)):                         # potes de barro e lata
        c.ret(x, 36 - h, 6, h, "#6a3a24" if x != 104 else FERRO[3])
        c.ret(x, 36 - h, 1, h, "#8a5434" if x != 104 else FERRO[5])
        c.ret(x, 36 - h, 6, 1, "#2a140c" if x != 104 else FERRO[1])
    for i in range(5):                                                   # barras de ferro deitadas
        c.ret(122, 34 - i, 36, 1, FERRO[3 + (i % 2)])
        c.p(122, 34 - i, FERRO[1])
    # fileira do meio: correntes, uma lâmina, placas e parafusos (implantes, discretos), caixa de pregos
    for i in range(14):                                                  # corrente enrolada pendendo da tábua
        x = 20 + (i % 2)
        c.p(x, 62 + i, FERRO[4] if i % 2 else FERRO[2])
        c.p(x + 1, 62 + i, FERRO[1])
    for j in range(3):
        for i in range(10):
            c.p(26 + i, 57 - j, FERRO[3] if (i + j) % 2 else FERRO[4])
    for i in range(22):                                                  # lâmina (espada sem cabo)
        c.p(40 + i, 54 - i // 9, FERRO[5] if i % 4 else FERRO[6])
        c.p(40 + i, 55 - i // 9, FERRO[3])
    c.ret(36, 53, 4, 3, MADEIRA[3])
    placa_orto(c, 66, 56, 16)                                            # placa deitada
    placa_orto(c, 70, 54, 10)
    for i in range(4):
        parafuso(c, 88 + i * 3, 52)
    c.ret(100, 50, 12, 8, MADEIRA[3])                                    # caixa de pregos
    c.ret(100, 50, 12, 1, MADEIRA[5])
    for i in range(5):
        c.p(101 + i * 2, 49, FERRO[4])
    for (x, h) in ((118, 14), (124, 12), (130, 15), (136, 11)):         # tenazes e limas em pé
        c.linha(x, 58, x + 2, 58 - h, FERRO[3])
        c.p(x + 2, 58 - h, FERRO[5])
    c.disco(150, 52, 5, (FERRO[3], FERRO[2], FERRO[1]))                  # panela
    c.ret(145, 52, 11, 6, FERRO[2])
    c.ret(145, 52, 11, 1, FERRO[4])
    # fileira de baixo: ferraduras em pilha, um balde, uma placa em T e um caixote
    for i in range(6):
        c.ret(18, 79 - i, 10, 1, FERRO[3 + (i % 2)])
    c.ret(32, 70, 10, 10, FERRO[2])
    c.ret(32, 70, 10, 1, FERRO[4])
    c.ret(32, 70, 1, 10, FERRO[3])
    c.linha(32, 69, 37, 66, FERRO[3])
    c.linha(37, 66, 41, 69, FERRO[3])
    placa_orto(c, 50, 70, 10, horizontal=False)                          # placa em T encostada
    c.ret(47, 69, 8, 2, ACO[3])
    c.ret(47, 69, 8, 1, ACO[4])
    c.ret(62, 68, 22, 12, MADEIRA[2])
    for xx in range(62, 84, 5):
        c.ret(xx, 68, 1, 12, MADEIRA[1])
    c.ret(62, 68, 22, 1, MADEIRA[4])
    for i in range(30):                                                  # barras e trilhos
        c.p(90 + i, 79, FERRO[3])
        c.p(90 + i, 78, FERRO[4] if i % 6 else FERRO[5])
        c.p(92 + i, 76, FERRO[2])
    for i in range(4):
        ferradura(c, 126 + i * 8, 75)
    # embaixo das prateleiras: caixotes e o rebolo de afiar
    for (x, y, w, h) in ((16, 92, 26, 16), (44, 96, 20, 12), (20, 84, 18, 8)):
        c.ret(x, y, w, h, MADEIRA[2])
        c.ret(x, y, w, 1, MADEIRA[4])
        c.ret(x + w - 1, y, 1, h, MADEIRA[1])
        for xx in range(x + 4, x + w, 6):
            c.ret(xx, y + 1, 1, h - 1, MADEIRA[1])
        c.linha(x + 1, y + h - 1, x + w - 2, y + 1, MADEIRA[3])
    # rebolo: roda de pedra num cavalete
    c.ret(84, 98, 3, 10, MADEIRA[2])
    c.ret(112, 98, 3, 10, MADEIRA[2])
    c.ret(84, 98, 31, 2, MADEIRA[3])
    for y in range(80, 100):
        for x in range(88, 112):
            d = math.hypot(x + 0.5 - 100, y + 0.5 - 90)
            if d < 9.5:
                k = 5 if d > 8.6 and x < 100 else 2 if d > 8.6 else 4 if (x - 100) + (y - 90) < -3 else 3
                if abs(d - 5) < 0.5:
                    k = 2
                c.p(x, y, PEDRA[k])
    c.disco(100, 90, 1.5, (FERRO[5], FERRO[3], FERRO[1]))
    c.linha(100, 90, 116, 86, FERRO[3])                                  # manivela
    c.ret(116, 84, 2, 4, MADEIRA[3])
    # porta-ferramentas entre a estante e a porta: martelos e tenazes pendurados
    c.ret(158, 24, 24, 3, MADEIRA[3])
    c.ret(158, 24, 24, 1, MADEIRA[5])
    c.ret(158, 26, 24, 1, MADEIRA[1])
    for (x, tipo, comp) in ((160, "martelo", 22), (166, "tenaz", 26), (172, "martelo", 18), (178, "tenaz", 22)):
        if tipo == "martelo":
            c.ret(x - 2, 27, 6, 4, FERRO[3])
            c.ret(x - 2, 27, 6, 1, FERRO[5])
            c.ret(x + 3, 28, 1, 3, FERRO[1])
            c.ret(x, 31, 2, comp - 4, MADEIRA[3])
            c.ret(x, 31, 1, comp - 4, MADEIRA[4])
        else:
            c.p(x, 27, FERRO[4])
            for j in range(comp):
                ab = 0 if j < 6 else (j - 6) * 0.12
                c.p(round(x - ab), 28 + j, FERRO[4] if j % 3 else FERRO[5])
                c.p(round(x + 1 + ab), 28 + j, FERRO[2])
    # sombras das ferramentas na parede
    c.ret(158, 27, 24, 1, "#000000", 0.2)


def prateleira_clinica(c: Camada) -> None:
    """Perto da bigorna: as encomendas da clínica (placas, parafusos, haste) e o molde do fêmur preso na parede."""
    prateleira(c, 300, 60, 44)
    # placa longa de fêmur (molde), pé
    placa_orto(c, 303, 57, 18)
    placa_orto(c, 305, 55, 12)
    # vidro com parafusos
    c.ret(324, 51, 6, 9, "#6a8a96")
    c.ret(324, 51, 1, 9, "#a8c8d0")
    c.ret(329, 51, 1, 9, "#2a3a44")
    c.ret(323, 50, 8, 1, LATAO[2])
    for (xx, yy) in ((325, 54), (327, 56), (326, 58), (328, 53)):
        c.p(xx, yy, ACO[4])
        c.p(xx, yy + 1, ACO[2])
    # haste intramedular encostada na parede (levemente curva)
    for j in range(26):
        x = 336 + int(math.sin(j / 26 * 1.2) * 1.5)
        c.p(x, 59 - j, ACO[4] if j % 5 else ACO[5])
        c.p(x + 1, 59 - j, ACO[2])
    c.p(336, 33, ACO[1])
    c.p(337, 33, ACO[3])
    # molde do fêmur: folha de pergaminho pregada, com o desenho do osso e as cotas
    x0, y0 = 304, 26
    for y in range(y0, y0 + 22):
        for x in range(x0, x0 + 18):
            borda = x in (x0, x0 + 17) or y in (y0, y0 + 21)
            cor = "#c8b088" if not borda else "#9a8060"
            if (x * 7 + y * 3) % 23 == 0:
                cor = "#b8a078"
            c.p(x, y, cor)
    c.p(x0 + 17, y0 + 21, "#5a4430")
    c.p(x0 + 16, y0 + 21, "#7a6040")
    tinta = "#4a3424"
    osso = [
        ".##.......",
        "####......",
        ".####.....",
        "..#.##....",
        ".....##...",
        "......##..",
        ".......##.",
        "........##",
        "........##",
        ".......###",
        ".......#.#",
    ]
    for j, linha in enumerate(osso):
        for i, ch in enumerate(linha):
            if ch == "#":
                c.p(x0 + 4 + i, y0 + 4 + j * 1.4, tinta)
    for i in range(0, 14, 2):
        c.p(x0 + 2 + i, y0 + 19, "#8a6a50")                            # cota tracejada
    c.p(x0 + 8, y0 + 1, FERRO[3])                                       # prego


# ─────────────────────────────── Forja e fole ───────────────────────────────
def forja() -> tuple[Camada, Camada, np.ndarray, np.ndarray]:
    """Chaminé, coifa de tijolo fuliginosa, a mesa da forja vista de cima (laje de pedra com o braseiro), a frente de
    tijolo com o cinzeiro e o fole de couro. Devolve (corpo, emissivos, interior da boca, frente da lareira)."""
    c = Camada()
    emis = Camada()
    interior = np.zeros((H, W), dtype=np.float32)
    frente_m = np.zeros((H, W), dtype=np.float32)
    n = ruido(41, 3)
    n2 = ruido(44, 2)
    g = np.random.default_rng(42)

    def tijolo(x, y, k_base, alt=3, larg=6):
        fil = y // alt
        junta = y % alt == 0 or (x + (fil % 2) * (larg // 2)) % larg == 0
        if junta:
            return max(0, k_base - 2)
        v = n[y, x] + (n2[y, x] - 0.5) * 0.4 + (((x + (fil % 2) * 3) // larg * 17 + fil * 5) % 7) / 7 * 0.3
        return min(5, max(0, k_base - 1 + (0 if v < 0.45 else 1 if v < 0.8 else 2)))

    # chaminé até o teto
    for y in range(0, 28):
        for x in range(392, 424):
            k = tijolo(x, y, 2)
            if x < 394:
                k = min(5, k + 1)
            if x > 421:
                k = max(0, k - 1)
            cor = hexa(TIJOLO[k]) * 0.55
            c.p(x, y, cor)
    # coifa: trapézio que alarga para baixo, fuliginosa em cima
    for y in range(26, 61):
        t = (y - 26) / 35
        xa, xb = 392 - t * 30, 424 + t * 26
        for x in range(int(xa), int(xb) + 1):
            k = tijolo(x, y, 3)
            if x < xa + 1.5:
                k = 5
            elif x < xa + 3:
                k = min(5, k + 1)
            if x > xb - 2:
                k = max(0, k - 2)
            sujo = 0.4 + 0.5 * t - 0.25 * n2[y, x] * (1 - t)
            cor = hexa(TIJOLO[k]) * sujo + hexa("#120a08") * (1 - sujo)
            c.p(x, y, cor)
    # manchas de fuligem escorrendo da boca para cima
    for x in range(366, 450):
        alt = int(6 + n[60, x] * 12)
        for j in range(alt):
            c.c[60 - j, x, :3] *= 0.6 + 0.4 * j / alt if c.c[60 - j, x, 3] > 0 else 1
    # cinta de ferro com rebites na borda da coifa
    for y in range(60, 66):
        for x in range(360, 452):
            k = 5 if y == 60 else 4 if y == 61 else 3 if y < 64 else 2 if y == 64 else 1
            if y == 62 and x % 7 == 3:
                k = 6
            if y == 63 and x % 7 == 3:
                k = 1
            c.p(x, y, FERRO[k])
    # boca da forja: fundo de dentro (aceso pela brasa na montagem)
    for y in range(66, 80):
        for x in range(372, 444):
            c.p(x, y, misturar("#140806", "#3a160c", (y - 66) / 14))
            interior[y, x] = 1
    # lados da boca (pilares de tijolo sob a coifa)
    for y in range(66, 80):
        for x in list(range(364, 372)) + list(range(444, 450)):
            k = tijolo(x, y, 3)
            if x == 371 or x == 444:
                k = 0
            c.p(x, y, TIJOLO[k] if x < 372 else TIJOLO[max(0, k - 2)])
    # mesa da forja vista de cima: laje de pedra (y 78–92), mais larga na frente (perspectiva)
    for y in range(78, 93):
        t = (y - 78) / 14
        xa, xb = 366 - t * 4, 448 + t * 3
        for x in range(int(xa), int(xb) + 1):
            v = n2[y, x] * 0.6 + n[y, x] * 0.4
            k = 4 if v < 0.5 else 5
            if (x * 3 + y * 7) % 19 == 0:
                k = 3
            if y >= 91:
                k = 6 if y == 91 else 3                                     # aresta da frente pega a luz
            if x < xa + 1:
                k = 6
            cor = hexa(PEDRA[k]) * (0.75 + 0.25 * t)
            # pó de carvão espalhado na laje
            cor = cor * (1 - 0.45 * math.exp(-((x - FOGO[0]) / 34) ** 2) * (0.6 + n2[y, x] * 0.6))
            c.p(x, y, cor)
    # aro de ferro do braseiro
    for x in range(380, 436):
        dx = (x - FOGO[0]) / 27
        if abs(dx) <= 1:
            yb = 85 + 3.2 * math.sqrt(max(0, 1 - dx * dx))
            c.p(x, int(yb), FERRO[4])
            c.p(x, int(yb) + 1, FERRO[1])
    # brasas: monte irregular com miolo amarelo e pedaços de carvão escuro por cima
    bn = ruido(43, 2)
    for y in range(70, 89):
        for x in range(380, 436):
            dx = (x - FOGO[0]) / 27
            if abs(dx) > 1:
                continue
            fundo = 85 + 3.2 * math.sqrt(max(0, 1 - dx * dx))
            topo = 80 - 6 * math.sqrt(max(0, 1 - dx * dx)) ** 1.4 + (bn[y, x] - 0.5) * 2.5
            if y < topo or y >= fundo:
                continue
            calor = (1 - abs(dx)) ** 0.7 * 0.75 + bn[y, x] * 0.45 - (y - topo) * 0.012
            pedra = ((x * 5 + (y // 2) * 7) % 9 == 0) or ((x // 2 + y * 3) % 11 == 0)
            if pedra:
                calor -= 0.5
            if y - topo < 1.2:
                calor -= 0.15
            cor = ("#fff4c0" if calor > 0.98 else "#ffd050" if calor > 0.8 else "#ff8a1c" if calor > 0.6
                   else "#d8420e" if calor > 0.4 else "#7a1e0a" if calor > 0.22 else "#2a0e08")
            emis.p(x, y, cor, 1 if calor > 0.22 else 0.6)
            if calor <= 0.22:
                c.p(x, y, "#1a1210")
    # chamas: línguas recortadas subindo para a boca
    for (x, alt, larg, fase) in ((392, 7, 1.6, 0.3), (398, 11, 2.4, 1.1), (404, 15, 3.0, 2.0), (409, 13, 2.6, 0.7),
                                 (415, 10, 2.2, 1.6), (421, 7, 1.8, 2.6), (427, 5, 1.4, 0.9), (387, 4, 1.0, 1.9)):
        base = 78 - 5 * math.sqrt(max(0, 1 - ((x - FOGO[0]) / 27) ** 2))
        for j in range(alt):
            v = j / alt
            w = larg * (1 - v ** 1.3)
            dx = math.sin(j * 0.75 + fase) * 1.1 * v
            for i in range(-int(w + 0.5), int(w + 0.5) + 1):
                if abs(i) > w + 0.2:
                    continue
                miolo = abs(i) < w * 0.5
                cor = ("#fffbe8" if v < 0.3 and miolo else "#ffe070" if v < 0.5 or (miolo and v < 0.7)
                       else "#ff9a2a" if v < 0.8 else "#e8501a")
                emis.p(x + i + dx, base - j, cor, 1 if v < 0.75 else 0.65)
    # tenaz e atiçador deitados na laje
    c.linha(436, 82, 452, 89, FERRO[4])
    c.linha(437, 83, 452, 90, FERRO[2])
    c.linha(372, 90, 388, 84, FERRO[3])
    c.p(388, 84, "#ff8030")
    emis.p(388, 84, "#ff8030", 0.8)
    emis.p(387, 84, "#c84010", 0.6)
    # frente de tijolo (y 93–112) e o cinzeiro aberto
    for y in range(93, 113):
        for x in range(362, 452):
            k = tijolo(x, y, 4, alt=4, larg=8)
            if x < 364:
                k = min(5, k + 1)
            if x > 448:
                k = max(0, k - 2)
            if y == 93:
                k = 1
            c.p(x, y, TIJOLO[k])
            frente_m[y, x] = 1
    for x in range(362, 452):
        c.p(x, 112, PEDRA[1])
    for y in range(98, 110):
        for x in range(394, 420):
            arco = y - 98 < 3 and abs(x - 407) > 10 + (y - 98) * 1.2
            if arco:
                continue
            c.p(x, y, "#100604")
            interior[y, x] = 0.2
    for x in range(393, 421):
        c.p(x, 110, PEDRA[4])
    for (x, y) in ((398, 108), (402, 109), (409, 108), (414, 109), (406, 107), (411, 109)):
        emis.p(x, y, "#ff6a20", 0.85)
        emis.p(x + 1, y, "#b8360e", 0.6)
    # o fole: tábuas, couro pregueado, bico de latão entrando na lateral da forja
    for i in range(29):
        x = 450 + i
        ytop = 64 + i * 0.1
        ybot = 88 - i * 0.3
        for y in range(int(ytop), int(ybot) + 1):
            if y <= ytop + 1.5:
                c.p(x, y, MADEIRA[4] if y <= ytop + 0.5 else MADEIRA[3])
            elif y >= ybot - 1.5:
                c.p(x, y, MADEIRA[2] if y < ybot - 0.5 else MADEIRA[1])
            else:
                dobra = ((y - ytop) / max(1, ybot - ytop) * 5 + i * 0.03) % 1
                k = 4 if dobra < 0.22 else 3 if dobra < 0.5 else 2 if dobra < 0.8 else 1
                if x > 474:
                    k = max(0, k - 1)
                c.p(x, y, COURO[k])
        if i % 5 == 2:
            c.p(x, int(ytop) + 1, LATAO[4])
            c.p(x, int(ybot) - 1, LATAO[2])
    for x in range(444, 452):
        c.p(x, 83, LATAO[4] if x < 447 else LATAO[3])
        c.p(x, 84, LATAO[1])
    # cavalete do fole e a alavanca com a corrente até a viga e a corda
    c.ret(454, 87, 3, 113 - 87, MADEIRA[2])
    c.ret(454, 87, 1, 113 - 87, MADEIRA[4])
    c.ret(473, 80, 3, 114 - 80, MADEIRA[2])
    c.ret(473, 80, 1, 114 - 80, MADEIRA[3])
    c.linha(462, 65, 479, 40, MADEIRA[4])
    c.linha(463, 65, 480, 40, MADEIRA[1])
    for y in range(14, 42, 2):
        c.p(477, y, FERRO[3])
        c.p(477, y + 1, FERRO[1])
    for y in range(44, 100):
        c.p(469 + (y - 44) // 30, y, "#9a7a54" if y % 3 else "#6a5438")
    c.ret(467, 99, 5, 3, MADEIRA[4])
    # ganchos na cinta com tenazes, atiçador e pá pendurados (desenhados por cima da boca)
    for (x, comp, tipo) in ((364, 22, "tenaz"), (369, 16, "aticador"), (446, 18, "pa")):
        c.p(x, 66, FERRO[5])
        c.p(x, 67, FERRO[2])
        if tipo == "tenaz":
            for j in range(comp):
                ab = 0 if j < 7 else (j - 7) * 0.15
                c.p(round(x - ab), 68 + j, FERRO[5] if j % 3 == 0 else FERRO[4])
                c.p(round(x + 1 + ab), 68 + j, FERRO[2])
        elif tipo == "aticador":
            c.ret(x, 68, 1, comp, FERRO[4])
            c.ret(x + 1, 68, 1, comp, FERRO[2])
            c.p(x - 1, 68 + comp, FERRO[3])
            c.p(x, 68 + comp, FERRO[3])
        else:
            c.ret(x, 68, 1, comp - 5, MADEIRA[4])
            c.ret(x - 2, 68 + comp - 5, 5, 6, FERRO[3])
            c.ret(x - 2, 68 + comp - 5, 5, 1, FERRO[5])
    return c, emis, interior, frente_m


# ─────────────────────────────── Chão ───────────────────────────────
def chao() -> Camada:
    """Lajes de pedra gastas em perspectiva (fiadas e juntas que fogem para o fundo), com pó de carvão perto da forja,
    carepa e limalha. A perspectiva é a de um chão visto de cima: profundidade z = K / (y - horizonte)."""
    c = Camada()
    n = ruido(51, 4)
    n2 = ruido(52, 2)
    g = np.random.default_rng(53)
    hz, fx = 46.0, 300.0                       # horizonte e ponto de fuga
    K = 60.0
    z_chao = K / (CHAO - hz)
    fila_z = 0.105                             # profundidade de cada fiada de lajes
    for y in range(CHAO, H):
        z = K / (y + 0.5 - hz)
        zl = (z_chao - z) / fila_z             # 0 na parede, cresce para perto de nós
        fila = int(zl)
        fz = zl - fila
        # tamanho da fiada em pixels nesta linha (para as arestas)
        dz_px = fila_z / (K / (y + 0.5 - hz) ** 2)
        for x in range(W):
            X = (x + 0.5 - fx) * z / 2.2 + fila * 0.37 + (fila % 3) * 0.21
            larg = 0.9 + ((fila * 7) % 5) * 0.06
            col = math.floor(X / larg)
            fx_ = X / larg - col
            px_lado = larg * 2.2 / z            # largura da laje em px
            semente = (fila * 131 + col * 71) % 997
            tom = (semente % 13) / 13
            v = n[y, x] * 0.45 + n2[y, x] * 0.3 + tom * 0.35
            k = 2 if v < 0.42 else 3 if v < 0.64 else 4
            # juntas (escuras), aresta de cima de cada laje clara, borda de baixo e direita sombreadas
            junta_h = fz * dz_px < 0.9
            junta_v = fx_ * px_lado < 0.9
            if junta_h or junta_v:
                k = 0 if (junta_h and fz * dz_px < 0.5) or (junta_v and fx_ * px_lado < 0.5) else 1
            elif fz * dz_px < 1.9 or fx_ * px_lado < 1.9:
                k = min(6, k + 1)
            elif (1 - fz) * dz_px < 1.4 or (1 - fx_) * px_lado < 1.2:
                k = max(1, k - 1)
            # trincas finas em algumas lajes
            if semente % 7 == 0 and abs((fx_ - 0.3) - (fz - 0.5) * 0.6) < 0.5 / max(px_lado, 1) and 0.15 < fz < 0.9:
                k = 1
            cor = hexa(PEDRA[k]) * (0.92 + 0.16 * n2[y, x])
            # pó de carvão perto da forja e no caminho até a bigorna
            carvao = math.exp(-(((x - 404) / 60) ** 2 + ((y - 114) / 10) ** 2)) * 0.85
            carvao += math.exp(-(((x - 296) / 34) ** 2 + ((y - 142) / 7) ** 2)) * 0.45
            carvao *= 0.5 + n2[y, x] * 0.9
            cor = cor * (1 - min(0.7, carvao))
            # gasto: caminho da porta até a bigorna, mais liso e claro
            gasto = math.exp(-(((x - 240 - (y - CHAO) * 0.8) / 28) ** 2)) * 0.14
            cor = cor * (1 + gasto)
            c.p(x, y, cor)
    # carepa e limalha (pontinhos de ferro), pregos, uma ferradura caída e brasinhas perto da forja
    for _ in range(320):
        x, y = int(g.integers(150, 470)), int(g.integers(CHAO + 2, H))
        if 326 <= x <= 384 and y > 132:
            continue
        c.p(x, y, FERRO[int(g.integers(0, 3))])
    ferradura(c, 168, 134)
    for (x, y) in ((190, 126), (214, 141), (392, 148), (148, 120)):
        c.linha(x, y, x + 3, y - 1, FERRO[4])
        c.p(x, y, FERRO[2])
    return c


# ─────────────────────────────── Objetos do meio ───────────────────────────────
def bigorna(c: Camada, emis: Camada) -> None:
    """Bigorna sobre o toco, a placa de fêmur na mesa (ponta em brasa) e o martelo."""
    # toco de madeira: cilindro de casca grossa (sulcos verticais irregulares), topo com anéis e rachaduras
    nt = ruido_ret(57, 1, 6)
    cx, r = 297, 22
    for y in range(119, 143):
        meia = r + (1.5 if y > 139 else 0) + (y - 139) * 0.6 * (y > 139)       # raízes alargam embaixo
        for x in range(int(cx - meia) - 1, int(cx + meia) + 2):
            lado = (x + 0.5 - cx) / meia
            if abs(lado) > 1:
                continue
            sulco = nt[y, x] + 0.35 * math.sin((x - cx) * 1.3 + nt[y, x] * 3)
            k = 3 if abs(lado) < 0.25 else 2 if abs(lado) < 0.7 else 1
            if lado < -0.55:
                k = 3                                                             # luz da porta na borda esquerda
            if sulco < 0.25:
                k = max(0, k - 2)
            elif sulco > 0.95:
                k = min(5, k + 1)
            if y > 140:
                k = max(0, k - 1)
            c.p(x, y, MADEIRA[k])
    for y in range(115, 124):
        for x in range(cx - r - 1, cx + r + 2):
            d = math.hypot((x + 0.5 - cx) / r, (y + 0.5 - 119.5) / 4)
            if d < 1:
                anel = int(d * 6 + nt[y, x] * 0.6) % 2
                k = 5 if anel and d > 0.8 else 4 if anel else 3
                if d > 0.93:
                    k = 2 if y > 119 else 4
                c.p(x, y, MADEIRA[k])
    c.linha(cx - 14, 119, cx - 6, 121, MADEIRA[1])                               # rachadura no topo
    c.linha(cx + 8, 118, cx + 15, 120, MADEIRA[1])
    # ferro: pés, cintura, corpo, mesa, chifre e calcanhar
    def tom(x, y, x0, x1):
        t = (x - x0) / max(1, x1 - x0)
        return 5 if t < 0.12 else 4 if t < 0.35 else 3 if t < 0.7 else 2 if t < 0.9 else 1
    for y in range(114, 121):                                                # pés (alargam para baixo)
        a = (y - 114) / 6
        x0, x1 = int(286 - a * 6), int(308 + a * 6)
        for x in range(x0, x1 + 1):
            c.p(x, y, FERRO[tom(x, y, x0, x1) - (1 if y == 120 else 0)])
    for y in range(110, 114):                                                # cintura
        for x in range(289, 306):
            c.p(x, y, FERRO[tom(x, y, 289, 305)])
    for y in range(104, 110):                                                # corpo
        for x in range(278, 318):
            k = tom(x, y, 278, 317)
            if y == 109:
                k = max(1, k - 1)
            c.p(x, y, FERRO[k])
    for x in range(277, 319):                                                # mesa (face de cima, polida)
        c.p(x, 103, FERRO[6] if 285 < x < 300 else FERRO[5])
    for i in range(14):                                                      # chifre
        x = 277 - i
        meia = 3 * (1 - i / 14) ** 0.8
        for y in range(int(105.5 - meia), int(105.5 + meia) + 1):
            c.p(x, y, FERRO[5] if y < 105 else FERRO[3] if y < 107 else FERRO[2])
    c.ret(318, 104, 4, 3, FERRO[3])                                          # calcanhar com o furo
    c.ret(318, 104, 4, 1, FERRO[5])
    c.p(316, 103, FERRO[0])
    # a placa de fêmur na mesa: 9 furos; a ponta da direita ainda em brasa (emissiva)
    for i in range(30):
        x = 284 + i
        furo = i % 3 == 1
        emis_k = max(0.0, (i - 18) / 11)
        base1, base2 = ACO[4], ACO[2]
        if emis_k > 0:
            cor1 = misturar(base1, "#ffb040" if emis_k < 0.7 else "#fff0b0", min(1, emis_k * 1.5))
            cor2 = misturar(base2, "#ff6a10", min(1, emis_k * 1.5))
            c.p(x, 101, cor1)
            c.p(x, 102, cor2 if not furo else "#2a0c04")
            emis.p(x, 101, cor1, min(1, emis_k * 1.6))
            if not furo:
                emis.p(x, 102, cor2, min(1, emis_k * 1.4))
        else:
            c.p(x, 101, base1 if not furo else ACO[2])
            c.p(x, 102, base2 if not furo else "#0a0c10")
    c.p(284, 101, ACO[5])
    c.p(285, 101, ACO[5])
    # martelo deitado na mesa, cabo para a esquerda (sobre o chifre)
    c.ret(268, 98, 18, 2, MADEIRA[4])
    c.ret(268, 99, 18, 1, MADEIRA[2])
    c.ret(285, 95, 5, 8, FERRO[3])
    c.ret(285, 95, 5, 1, FERRO[5])
    c.ret(285, 95, 1, 8, FERRO[4])
    c.ret(289, 96, 1, 7, FERRO[1])


def barril(c: Camada, emis: Camada) -> None:
    """Barril de água para temperar: aduelas, aros de ferro, água escura e a tenaz mergulhada."""
    x0, x1, yt, yb = 220, 248, 116, 146
    cx = (x0 + x1) / 2
    for y in range(yt, yb):
        bojo = 1 + 0.08 * math.sin((y - yt) / (yb - yt) * math.pi)
        meia = (x1 - x0) / 2 * bojo
        for x in range(int(cx - meia), int(cx + meia) + 1):
            t = (x + 0.5 - (cx - meia)) / (2 * meia)
            k = 4 if t < 0.15 else 3 if t < 0.45 else 2 if t < 0.8 else 1
            if int((x - cx) / meia * 6 + 6) != int((x + 1 - cx) / meia * 6 + 6):
                k = max(0, k - 2)                                                # juntas das aduelas
            if (y - yt) in (3, 4, 24, 25):
                k2 = 5 if t < 0.2 else 4 if t < 0.5 else 3 if t < 0.8 else 2
                c.p(x, y, FERRO[k2] if (y - yt) in (3, 24) else FERRO[1])
                continue
            c.p(x, y, MADEIRA[k])
    # boca: borda e a água escura (reflexos vêm na montagem)
    for y in range(yt - 3, yt + 3):
        for x in range(x0 - 1, x1 + 2):
            d = math.hypot((x + 0.5 - cx) / 15, (y + 0.5 - yt) / 3)
            if d < 1:
                c.p(x, y, MADEIRA[4] if d > 0.82 and y < yt else MADEIRA[2] if d > 0.82 else misturar("#0a1418", "#1a2a30", (x - x0) / 28))
    # tenaz mergulhada
    c.linha(242, 116, 252, 96, FERRO[4])
    c.linha(243, 116, 254, 97, FERRO[2])
    c.p(252, 96, FERRO[5])
    c.p(254, 97, FERRO[3])


# ─────────────────────────────── Frente (desfocada) ───────────────────────────────
def frente() -> Camada:
    """Primeiro plano: monte de carvão e balde à esquerda, correntes e barras à direita (desfocados)."""
    c = Camada()
    g = np.random.default_rng(61)
    for y in range(132, H):
        for x in range(0, 90):
            topo = 160 - 26 * math.exp(-((x - 30) / 34) ** 2) + math.sin(x * 0.7) * 1.2
            if y >= topo:
                k = g.random()
                c.p(x, y, "#121214" if k < 0.5 else "#1e1e24" if k < 0.85 else "#34363e")
    c.ret(64, 140, 18, 20, FERRO[2])
    c.ret(64, 140, 18, 2, FERRO[4])
    c.ret(64, 140, 2, 20, FERRO[3])
    c.ret(80, 140, 2, 20, FERRO[1])
    # barras de ferro e corrente no canto direito
    for i in range(5):
        c.ret(418 + i * 3, 150 - i, 62, 2, FERRO[2 + (i % 2)])
        c.ret(418 + i * 3, 150 - i, 62, 1, FERRO[4])
    for i in range(24):
        x = 430 + i * 2
        y = 154 + int(math.sin(i * 0.6) * 2)
        c.ret(x, y, 2, 2, FERRO[3] if i % 2 else FERRO[4])
    c.ret(400, 156, 80, 4, FERRO[1])
    return c


# ─────────────────────────────── Montagem com luz ───────────────────────────────
def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def _caixa(arr: np.ndarray, r: int, eixo: int) -> np.ndarray:
    pad = [(0, 0)] * arr.ndim
    pad[eixo] = (r + 1, r)
    a = np.pad(arr, pad, mode="edge")
    s = np.cumsum(a, axis=eixo, dtype=np.float64)
    n = arr.shape[eixo]
    alto = np.take(s, np.arange(2 * r + 1, 2 * r + 1 + n), axis=eixo)
    baixo = np.take(s, np.arange(0, n), axis=eixo)
    return ((alto - baixo) / (2 * r + 1)).astype(np.float32)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    if raio <= 0:
        return arr
    r = max(1, int(round(raio * 0.85)))
    out = arr.astype(np.float32)
    for _ in range(3):
        out = _caixa(out, r, 0)
        out = _caixa(out, r, 1)
    return out


def desfocar_rgba(arr: np.ndarray, raio: float) -> np.ndarray:
    if raio <= 0:
        return arr
    pm = arr.copy()
    pm[:, :, :3] *= pm[:, :, 3:4]
    d = desfocar(pm, raio)
    a = np.maximum(d[:, :, 3:4], 1e-4)
    d[:, :, :3] = d[:, :, :3] / a
    d[:, :, 3:4] = np.clip(d[:, :, 3:4], 0, 1)
    return d


def sobre(base: np.ndarray, camada: np.ndarray) -> np.ndarray:
    a = camada[:, :, 3:4]
    return base * (1 - a) + camada[:, :, :3] * a


GRADE_Y, GRADE_X = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)


def luz_pontual(cx: float, cy: float, raio: float, achatar: float = 1.0) -> np.ndarray:
    d2 = ((GRADE_X - cx * ESC) / (raio * ESC)) ** 2 + ((GRADE_Y - cy * ESC) / (raio * ESC * achatar)) ** 2
    return np.exp(-d2 * 2.2)


def sombra_projetada(mascara: np.ndarray, base_y: float, dx: float, dy: float, so_chao: bool = True) -> np.ndarray:
    """Sombra de um objeto no chão: cada pixel de altura h vai para (x + h·dx, base + h·dy). Em pixels da arte."""
    out = np.zeros((H, W), dtype=np.float32)
    ys, xs = np.nonzero(mascara > 0.5)
    for y, x in zip(ys, xs):
        h = base_y - y
        if h < 0:
            continue
        for f in (0.0, 0.5):
            sx, sy = int(round(x + (h + f) * dx)), int(round(base_y + (h + f) * dy))
            if 0 <= sx < W and CHAO <= sy < H:
                out[sy, sx] = 1
    return out


def poeira(seed: int, n: int, regiao, cor: str, img: np.ndarray, peso: np.ndarray, forca: float = 1.0) -> None:
    g = np.random.default_rng(seed)
    x0, y0, x1, y1 = regiao
    rgb = hexa(cor)
    for _ in range(n):
        x, y = x0 + g.random() * (x1 - x0), y0 + g.random() * (y1 - y0)
        X, Y = int(x * ESC), int(y * ESC)
        if not (0 <= X < W * ESC - 3 and 0 <= Y < H * ESC - 3):
            continue
        k = peso[Y, X] * (0.4 + g.random() * 0.8) * forca
        if k < 0.04:
            continue
        tam = 2 if g.random() < 0.7 else 3
        img[Y:Y + tam, X:X + tam] += rgb * k


def faiscas(img: np.ndarray, seed: int, origem, n: int, forca: float) -> None:
    """Faíscas do golpe: riscos curvos (parábolas) em alta resolução, do branco ao laranja, com um rastro."""
    g = np.random.default_rng(seed)
    ox, oy = origem[0] * ESC, origem[1] * ESC
    for _ in range(n):
        ang = -math.pi / 2 + (g.random() - 0.5) * math.pi * 1.25
        vel = 6 + g.random() * 22
        vx, vy = math.cos(ang) * vel, math.sin(ang) * vel
        t0 = g.random() * 0.8
        dur = 0.12 + g.random() * 0.2
        quente = g.random()
        passos = 18
        for i in range(passos):
            t = t0 + dur * i / passos
            x = ox + vx * t * ESC + (g.random() - 0.5) * 0.4
            y = oy + (vy * t + 26 * t * t) * ESC
            X, Y = int(x), int(y)
            if not (2 <= X < W * ESC - 3 and 2 <= Y < H * ESC - 3):
                continue
            k = (i / passos) ** 1.6 * forca
            cor = misturar("#ff7a20", "#fff6c8", quente * (i / passos))
            img[Y:Y + 2, X:X + 2] += cor * k * 1.6
    # brilho do ponto do golpe
    img += luz_pontual(origem[0], origem[1], 6, 0.8)[:, :, None] * hexa("#ffd070") * 0.9 * forca


def brasas_subindo(img: np.ndarray, seed: int, n: int, forca: float) -> None:
    """Fagulhas que sobem do fogo para a coifa, em zigue-zague, cada vez menores e mais vermelhas."""
    g = np.random.default_rng(seed)
    for _ in range(n):
        x = FOGO[0] + (g.random() - 0.5) * 40
        y = 74 - g.random() * 50
        sub = (74 - y) / 50
        x += math.sin(y * 0.3 + g.random() * 6) * 3 * sub
        X, Y = int(x * ESC), int(y * ESC)
        if not (0 <= X < W * ESC - 3 and 0 <= Y < H * ESC - 3):
            continue
        cor = misturar("#ffe090", "#ff4a10", sub)
        k = (1 - sub * 0.7) * forca * (0.6 + g.random() * 0.6)
        tam = 3 if sub < 0.3 and g.random() < 0.5 else 2
        img[Y:Y + tam, X:X + tam] += cor * k * 1.4
        img[Y + tam:Y + tam + 3, X:X + 1] += cor * k * 0.4          # rastro


PERIODOS = {
    # amb/k_amb: luz difusa do lugar; porta/k_porta: o céu enchendo a sala pela porta; sol: o feixe que entra pela
    # porta (cor, força, deslocamento lateral por linha e comprimento da mancha no chão); forja: força do fogo.
    "manha": dict(amb="#b4c4dc", k_amb=0.62, forja=1.0, porta="#d4e6f6", k_porta=0.85,
                  sol="#fff0cc", k_sol=1.0, sol_dx=0.5, sol_comp=40, ceu=1.08,
                  quente="#ffd8a8", fria="#24364e", esquerda=0.3, fumaca="#c4c8d2", lamparina=0.0),
    "tarde": dict(amb="#c8987c", k_amb=0.5, forja=1.05, porta="#ffb478", k_porta=0.9,
                  sol="#ffa456", k_sol=1.25, sol_dx=0.95, sol_comp=64, ceu=1.12,
                  quente="#ffc890", fria="#2e1c3e", esquerda=0.32, fumaca="#d4aa8c", lamparina=0.45),
    "noite": dict(amb="#3e5290", k_amb=0.26, forja=1.4, porta="#5a74b8", k_porta=0.42,
                  sol="#9ab4ec", k_sol=0.45, sol_dx=-0.3, sol_comp=30, ceu=1.0,
                  quente="#ffc890", fria="#121c40", esquerda=0.34, fumaca="#5a5e74", lamparina=1.0),
}


def lamparina(c: Camada, emis: Camada, acesa: float) -> None:
    """Lamparina de ferro pendurada da viga por uma corrente (acesa à tarde e à noite)."""
    lx, ly = LAMPARINA
    for y in range(15, ly - 5):
        c.p(lx, y, FERRO[3] if y % 2 else FERRO[1])
    c.ret(lx - 3, ly - 6, 7, 2, FERRO[3])
    c.ret(lx - 2, ly - 7, 5, 1, FERRO[4])
    for y in range(ly - 4, ly + 4):
        for x in range(lx - 3, lx + 4):
            grade = x in (lx - 3, lx + 3) or x == lx and y in (ly - 4, ly + 3)
            if grade:
                c.p(x, y, FERRO[2] if x > lx else FERRO[4])
            else:
                c.p(x, y, "#3a3020" if acesa < 0.2 else misturar("#ffcc70", "#ff9a30", (y - ly + 4) / 8))
                if acesa > 0.2:
                    emis.p(x, y, misturar("#ffd890", "#ff9a30", (y - ly + 4) / 8), acesa * 0.9)
    c.ret(lx - 4, ly + 4, 9, 2, FERRO[3])
    c.ret(lx - 4, ly + 4, 9, 1, FERRO[4])
    if acesa > 0.2:
        emis.p(lx, ly, "#fff8d8", acesa)
        emis.p(lx, ly - 1, "#ffe090", acesa)


def feixe_da_porta(dx: float, comp: float) -> tuple[np.ndarray, np.ndarray]:
    """Projeta cada pixel do vão da porta no chão (y_chão = CHAO + altura·comp/alt_porta, deslocado dx por linha).
    Devolve (volume do feixe no ar, mancha no chão), em pixels da arte, normalizados 0..1."""
    px, py, pw, ph = PORTA
    vol = np.zeros((H, W), dtype=np.float64)
    mancha = np.zeros((H, W), dtype=np.float64)
    ys, xs = np.mgrid[py:CHAO, px:px + pw]
    ys, xs = ys.ravel().astype(np.float64) + 0.5, xs.ravel().astype(np.float64) + 0.5
    h = CHAO - ys
    yl = CHAO + h * comp / ph
    xl = xs + (yl - CHAO) * dx
    for t in np.linspace(0, 1, 90):
        x = xs + (xl - xs) * t
        y = ys + (yl - ys) * t
        ok = (x >= 0) & (x < W) & (y >= 0) & (y < H)
        np.add.at(vol, (y[ok].astype(int), x[ok].astype(int)), 1)
    ok = (xl >= 0) & (xl < W) & (yl >= CHAO) & (yl < H)
    np.add.at(mancha, (yl[ok].astype(int), xl[ok].astype(int)), 1)
    # mancha: preencher (cada pixel do chão recebe ~ comp/ph pontos) e normalizar
    mancha = np.asarray(Image.fromarray(mancha.astype(np.float32)).filter(ImageFilter.MaxFilter(3)))
    mancha = np.clip(mancha / max(1e-6, np.percentile(mancha[mancha > 0], 60)), 0, 1)
    vol = vol / max(1e-6, np.percentile(vol[vol > 0], 97))
    return np.clip(vol, 0, 1.2).astype(np.float32), mancha.astype(np.float32)


def montar(periodo: str) -> Image.Image:
    P = PERIODOS[periodo]
    # ── pintura
    fundo, vao = parede()
    prateleiras_esquerda(fundo)
    prateleira_clinica(fundo)
    corpo_forja, emis, interior, frente_m = forja()
    lamparina(corpo_forja, emis, P["lamparina"])
    piso = chao()
    obj = Camada()
    bigorna(obj, emis)
    barril(obj, emis)
    perto = frente()
    rua = exterior(periodo)

    xs, ys = GRADE_X / ESC, GRADE_Y / ESC
    fundo_a = desfocar_rgba(ampliar(fundo.c), 0.6)
    forja_a = desfocar_rgba(ampliar(corpo_forja.c), 0.3)
    piso_a = ampliar(piso.c)
    obj_a = ampliar(obj.c)
    rua_a = desfocar(ampliar(rua), 1.2)
    vao_a = ampliar(vao[:, :, None])[:, :, 0]
    px, py, pw, ph = PORTA
    kf = P["forja"]

    # ── luz (multiplica o albedo)
    luz = np.ones((H * ESC, W * ESC, 3), dtype=np.float32) * hexa(P["amb"]) * P["k_amb"]
    luz *= (0.6 + 0.4 * suave(4, 34, ys))[:, :, None]                       # o teto fica no escuro
    luz *= (1 - 0.22 * np.exp(-((ys - CHAO) / 4) ** 2))[:, :, None]        # canto parede-chão
    porta_luz = (luz_pontual(px + pw / 2, CHAO - 14, 120, 0.75) * 0.75 + luz_pontual(px + pw / 2, CHAO + 10, 60, 0.55) * 0.7)
    luz += porta_luz[:, :, None] * hexa(P["porta"]) * P["k_porta"]
    # a forja: a coifa tapa o alto; a luz cai forte na frente e no chão
    tampa = np.where((xs > 352) & (xs < 456), 0.3 + 0.7 * suave(52, 70, ys), 0.6 + 0.4 * suave(20, 80, ys))
    forja_luz = (luz_pontual(FOGO[0], FOGO[1] + 10, 175, 0.6) * 0.75 + luz_pontual(FOGO[0], FOGO[1] + 12, 80, 0.75) * 1.0
                 + luz_pontual(FOGO[0], FOGO[1] + 4, 28, 1) * 1.2) * tampa
    # sombras da bigorna e do barril no chão (a forja está atrás e à direita: sombra para a frente e à esquerda)
    col = np.arange(W)[None, :]
    sombra_f = np.maximum(sombra_projetada(obj.c[:, :, 3] * (col > 262), 142, -0.62, 0.34),
                          sombra_projetada(obj.c[:, :, 3] * (col < 262), 146, -0.5, 0.24))
    sombra_f = desfocar(ampliar(sombra_f[:, :, None]), 4)[:, :, 0]
    forja_luz_chao = forja_luz * (1 - sombra_f * 0.85)
    luz += forja_luz_chao[:, :, None] * hexa("#ff9444") * 1.25 * kf
    luz += luz_pontual(FOGO[0], FOGO[1] + 6, 46, 0.8)[:, :, None] * hexa("#ffc070") * 0.45 * kf * tampa[:, :, None]
    luz += luz_pontual(306, 102, 18, 0.8)[:, :, None] * hexa("#ff9040") * 0.8           # a placa em brasa
    if P["lamparina"] > 0:
        lx, ly = LAMPARINA
        luz += luz_pontual(lx, ly + 8, 80, 1.0)[:, :, None] * hexa("#ffb060") * 0.4 * P["lamparina"]
        luz += luz_pontual(lx, ly, 16, 1.0)[:, :, None] * hexa("#ffe0a0") * 0.5 * P["lamparina"]

    # ── albedo x luz
    img = np.zeros((H * ESC, W * ESC, 3), dtype=np.float32)
    img = sobre(img, fundo_a)
    img = sobre(img, piso_a)
    img = img * luz
    img = img * (1 - vao_a[:, :, None]) + rua_a * P["ceu"] * vao_a[:, :, None]

    # mancha de sol (ou luar) no chão, com as sombras do barril e da bigorna
    dx, comp = P["sol_dx"], P["sol_comp"]
    vol, mancha = feixe_da_porta(dx, comp)
    sombra_s = np.maximum(sombra_projetada(obj.c[:, :, 3] * (col < 262), 146, dx * 0.85, 0.42),
                          sombra_projetada(obj.c[:, :, 3] * (col > 262), 142, dx * 0.85, 0.42))
    mancha = mancha * (1 - sombra_s)
    mancha_a = desfocar(ampliar(mancha[:, :, None]), 2.2)[:, :, 0] * (GRADE_Y >= CHAO * ESC)
    img += img * mancha_a[:, :, None] * hexa(P["sol"]) * P["k_sol"] * 1.6

    # corpo da forja e do fole, com a mesma luz; a frente de tijolo só vê a luz rebatida; a boca, o fogo direto
    fl = luz.copy()
    fm = desfocar(ampliar(frente_m[:, :, None]), 1)[:, :, 0]
    fl = fl * (1 - fm[:, :, None] * 0.55)
    forja_rgb = forja_a[:, :, :3] * fl
    int_a = ampliar(interior[:, :, None])[:, :, 0]
    forja_rgb += forja_a[:, :, :3] * (luz_pontual(FOGO[0], FOGO[1] - 2, 40, 0.45) * int_a)[:, :, None] * hexa("#ff7a2a") * 7 * kf
    # a borda de baixo da coifa e a cinta recebem o fogo por baixo
    sob = np.exp(-((ys - 64) / 3.5) ** 2) * np.exp(-((xs - FOGO[0]) / 40) ** 2)
    forja_rgb += forja_a[:, :, :3] * sob[:, :, None] * hexa("#ffa050") * 2.2 * kf
    img = img * (1 - forja_a[:, :, 3:4]) + forja_rgb * forja_a[:, :, 3:4]

    # objetos do meio (bigorna, barril): luz do lugar + o feixe que passa por eles + contorno quente da forja
    obj_luz = luz.copy()
    vol_a = desfocar(ampliar(vol[:, :, None]), 3)[:, :, 0]
    obj_luz += vol_a[:, :, None] * hexa(P["sol"]) * P["k_sol"] * 0.55
    obj_rgb = obj_a[:, :, :3] * obj_luz
    img = img * (1 - obj_a[:, :, 3:4]) + obj_rgb * obj_a[:, :, 3:4]
    a = obj.c[:, :, 3]
    borda = np.zeros_like(a)
    borda[:, :-1] = np.maximum(borda[:, :-1], a[:, :-1] * (1 - a[:, 1:]))
    borda[:, :-2] = np.maximum(borda[:, :-2], a[:, :-2] * (1 - a[:, 2:]) * 0.45)
    borda[1:, :] = np.maximum(borda[1:, :], a[1:, :] * (1 - a[:-1, :]) * 0.7)
    borda_a = desfocar(ampliar(borda[:, :, None]), 0.6)[:, :, 0] * np.clip(forja_luz * 1.6, 0, 1)
    img += borda_a[:, :, None] * hexa("#ffb060") * 1.1 * kf
    # reflexo do céu e do fogo na água do barril
    agua = np.exp(-(((xs - 234) / 10) ** 2 + ((ys - 116.4) / 1.5) ** 2))
    img += (agua * 0.6)[:, :, None] * (hexa(P["porta"]) * P["k_porta"] * 0.7 + hexa("#ff9040") * 0.35 * kf)

    # emissivos: brasas, chamas, a ponta da placa, a lamparina, brasinhas no cinzeiro
    emis_a = ampliar(emis.c)
    emis_rgb = emis_a[:, :, :3] * emis_a[:, :, 3:4]
    img = img * (1 - emis_a[:, :, 3:4] * 0.9) + emis_rgb * 1.6 * (0.85 + 0.15 * kf)

    # ── ar: fumaça da forja subindo e acumulando sob o teto, acesa por baixo pelo fogo
    fum = ruido_ret(71, 10, 5, W * ESC, H * ESC) * 0.55 + ruido(72, 18, W * ESC, H * ESC) * 0.45
    fum2 = ruido_ret(73, 6, 14, W * ESC, H * ESC)
    larg = np.maximum(6, 16 + (72 - ys) * 0.55)
    coluna = np.exp(-((xs - (FOGO[0] - (72 - ys) * 0.15 + (fum2 - 0.5) * 18)) / larg) ** 2) * suave(76, 46, ys)
    teto = (1 - suave(6, 46, ys)) * (0.35 + 0.65 * suave(160, 440, xs))
    dens = np.clip((coluna * 0.75 + teto * 0.55) * (fum * 1.6 - 0.35), 0, 1)
    dens *= 1 - vao_a * 0.6
    cor_fum = (hexa(P["fumaca"]) * (P["k_amb"] * 0.8 + 0.08)
               + forja_luz[:, :, None] * hexa("#ff8a40") * 0.6 * kf
               + vol_a[:, :, None] * hexa(P["sol"]) * 0.3)
    img = img * (1 - dens[:, :, None] * 0.6) + cor_fum * dens[:, :, None] * 0.6
    # ar quente brilhando na boca da forja
    img += luz_pontual(FOGO[0], FOGO[1] - 6, 34, 0.7)[:, :, None] * hexa("#ff7a30") * 0.3 * kf

    # feixe volumétrico entrando pela porta, com poeira dançando
    vol_f = vol_a * (1 - vao_a) * (GRADE_Y < (CHAO + comp) * ESC)
    img += vol_f[:, :, None] * hexa(P["sol"]) * P["k_sol"] * 0.32
    poeira(81, 1100, (190, 28, 340, 156), "#fff2d8", img, vol_f * 1.6, 0.7)
    poeira(82, 500, (350, 10, 470, 90), "#ffc080", img, forja_luz * 0.5, 0.55)

    # faíscas do último golpe e fagulhas subindo
    faiscas(img, 91, BIGORNA_PONTA, 52, 1.0)
    brasas_subindo(img, 92, 80, kf)

    # primeiro plano desfocado
    perto_a = desfocar_rgba(ampliar(perto.c), 4.5)
    perto_rgb = perto_a[:, :, :3] * (luz * 0.7)
    img = img * (1 - perto_a[:, :, 3:4]) + perto_rgb * perto_a[:, :, 3:4]

    return acabamento(img, P["quente"], P["fria"], P["esquerda"], seed=99)


def acabamento(img: np.ndarray, quente: str, fria: str, esquerda: float, seed: int, bloom_lim: float = 0.85,
               bloom_k: float = 0.42) -> Image.Image:
    """Bloom, mapeamento de tom suave, luz quente e sombra fria, área calma à esquerda, vinheta e grão."""
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - bloom_lim) * 5, 0, 1), 0, 2.0)
    img = img + desfocar(claro, 12) * bloom_k + desfocar(claro, 36) * bloom_k * 0.6
    img = img / (1 + np.maximum(img - 0.85, 0) * 0.6)                   # ombro suave: não estoura
    q, f = hexa(quente), hexa(fria)
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (f * 0.5 + 0.5)))
    img = np.clip((img - 0.45) * 1.08 + 0.45, 0, 1.3)
    xs, ys = GRADE_X / (W * ESC), GRADE_Y / (H * ESC)
    calma = 1 - esquerda * (1 - suave(0.08, 0.48, xs))
    lum = img.mean(2, keepdims=True)
    img = (img * 0.85 + lum * 0.15 * (1 - calma[:, :, None]) + img * 0.15 * calma[:, :, None]) * calma[:, :, None]
    v = (xs - 0.6) ** 2 * 1.2 + (ys - 0.55) ** 2 * 1.6
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.1)[:, :, None]
    g = np.random.default_rng(seed)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.018
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


# ─────────────────────────────── Saída ───────────────────────────────
def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    pedidos = sys.argv[1:] or list(PERIODOS)
    for periodo in pedidos:
        img = montar(periodo)
        grande = PASTA / f"ferreiro-{periodo}.webp"
        pequeno = PASTA / f"ferreiro-{periodo}-960.webp"
        img.save(grande, quality=83, method=6)
        img.resize((960, 320), Image.LANCZOS).save(pequeno, quality=83, method=6)
        print(f"ferreiro-{periodo}: {grande.stat().st_size // 1024} KB, {pequeno.stat().st_size // 1024} KB (960)")


if __name__ == "__main__":
    main()
