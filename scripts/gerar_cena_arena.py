"""Cenários "HD-2D" das seções da página inicial: a Arena e o Salão dos troféus (30/10/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai das
funções abaixo, no mesmo jeito do topo da página (scripts/gerar_cena_inicio.py): a cena é pintada em pixel art
(480 x 160), camada por camada, e depois montada em 3x com a luz calculada por pixel, como nos jogos "HD-2D":
- profundidade de campo: arquibancada e primeiro plano desfocados, o pódio nítido;
- feixes de luz volumétricos (o sol pelos arcos da arena, a lua pelas janelas do salão) com poeira no ar;
- tochas, velas e lustres que acendem o que está perto, com brilho (bloom) nas luzes fortes;
- correção de cor quente nas altas luzes e fria nas sombras, vinheta e grão.

Duas cenas, sempre com os ~45% da esquerda mais calmos e escuros (é onde o texto da seção entra por cima):
1. secao-arena: o interior de um pequeno coliseu de pedra no fim da tarde dourada. Arcos, arquibancada com a torcida
   (só sugerida, desfocada), estandartes coloridos com emblemas inventados (osso, cruz, escudo, estrela, coroa),
   tochas, areia com pegadas e marcas de roda e, à direita do centro, o pódio de pedra de três degraus sob um facho de
   sol, com a taça de ouro no alto ("Arena do que a prova mais cobra").
2. secao-trofeus: o Salão dos troféus à noite (Ranking). Estantes cheias de taças, medalhas, escudos e rosetas, cada
   um com o brilho do metal; tapete vermelho até o pedestal iluminado; janelas altas com a lua; lustres e velas.

Gera em public/pixel/inicio/: secao-arena(.webp, -960.webp) e secao-trofeus(.webp, -960.webp), 1440 x 480 e 960 x 320.
Uso: python3 scripts/gerar_cena_arena.py            (as duas)
     python3 scripts/gerar_cena_arena.py arena      (só uma: arena ou trofeus)
"""
from __future__ import annotations

import math
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"
W, H, ESC = 480, 160, 3


# ─────────────────────────────── Pincéis básicos ───────────────────────────────
@lru_cache(maxsize=4096)
def _hexa(c: str) -> tuple[float, float, float]:
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def hexa(c: str) -> np.ndarray:
    return np.array(_hexa(c), dtype=np.float32)


def misturar(a: str, b: str, t: float) -> np.ndarray:
    return hexa(a) * (1 - t) + hexa(b) * t


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples."""

    def __init__(self) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)

    def p(self, x: int, y: int, cor, a: float = 1.0) -> None:
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            rgb = hexa(cor) if isinstance(cor, str) else cor
            base = self.c[y, x]
            if a >= 1:
                base[:3] = rgb
                base[3] = 1
                return
            na = a + base[3] * (1 - a)
            if na > 0:
                base[:3] = (rgb * a + base[:3] * base[3] * (1 - a)) / na
            base[3] = na

    def ret(self, x0: int, y0: int, w: int, h: int, cor, a: float = 1.0) -> None:
        x0, y0, w, h = int(x0), int(y0), int(w), int(h)
        xa, xb, ya, yb = max(0, x0), min(W, x0 + w), max(0, y0), min(H, y0 + h)
        if xa >= xb or ya >= yb:
            return
        rgb = hexa(cor) if isinstance(cor, str) else cor
        if a >= 1:
            self.c[ya:yb, xa:xb, :3] = rgb
            self.c[ya:yb, xa:xb, 3] = 1
        else:
            for y in range(ya, yb):
                for x in range(xa, xb):
                    self.p(x, y, rgb, a)

    def linha(self, x0: float, y0: float, x1: float, y1: float, cor, a: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / n
            self.p(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), cor, a)

    def disco(self, cx: float, cy: float, r: float, cores, luz=(-0.6, -0.8), a: float = 1.0, achatar: float = 1.0) -> None:
        """Disco com sombreamento em 3 tons, iluminado da direção `luz`."""
        lx, ly = luz
        for y in range(int(cy - r * achatar) - 1, int(cy + r * achatar) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                dx, dy = x - cx, (y - cy) / achatar
                d = math.hypot(dx, dy)
                if d <= r:
                    k = (dx * lx + dy * ly) / max(r, 1) + (((x * 73856093) ^ (y * 19349663)) % 997 / 997 - 0.5) * 0.4
                    cor = cores[0] if k > 0.38 else cores[1] if k > -0.2 else cores[2]
                    self.p(x, y, cor, a)

    def bitmap(self, x0: int, y0: int, linhas: list[str], cores: dict, a: float = 1.0) -> None:
        for j, linha in enumerate(linhas):
            for i, ch in enumerate(linha):
                if ch in cores:
                    self.p(x0 + i, y0 + j, cores[ch], a)


def ruido(seed: int, escala: int, w: int = W, h: int = H) -> np.ndarray:
    """Ruído suave 0..1 (valores aleatórios ampliados com interpolação)."""
    g = np.random.default_rng(seed)
    pequeno = g.random((h // escala + 2, w // escala + 2)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize((w + escala * 2, h + escala * 2), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32)[:h, :w] / 255


def ruido_ret(seed: int, ex: int, ey: int) -> np.ndarray:
    """Ruído esticado (ex na horizontal, ey na vertical), bom para nuvens em faixa e veios."""
    g = np.random.default_rng(seed)
    pequeno = g.random((H // ey + 2, W // ex + 2)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize(((W // ex + 2) * ex, (H // ey + 2) * ey), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32)[:H, :W] / 255


def suave(a: float, b: float, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ─────────────────────────────── Metais e troféus ───────────────────────────────
# Sete tons por metal: do contorno escuro ao reflexo branco. O brilho vem da faixa clara à esquerda do eixo, do
# escuro à direita e do reflexo fino na borda direita, como num objeto de revolução polido.
METAIS = {
    "ouro": ("#2a1606", "#5e3a0a", "#9c6614", "#d29c26", "#f4ca4c", "#ffe98e", "#fffbe6"),
    "prata": ("#1a1e26", "#444c5a", "#76808e", "#a8b2c0", "#d2dae4", "#eef2f8", "#ffffff"),
    "bronze": ("#200f08", "#4c2612", "#80441e", "#b26834", "#d89254", "#f2bf8a", "#fff0dc"),
}
MADEIRA = ("#1e120a", "#3a2416", "#5a3820", "#7e5230", "#a87444")
MARMORE = ("#3a3a44", "#6a6a76", "#a4a2aa", "#d4d0d4", "#f2eeec")


def tom_metal(t: float, w: float) -> int:
    if w < 1.2:
        return 4 if t < 0 else 2
    if t < -0.84:
        return 2
    if t < -0.56:
        return 4
    if t < -0.18:
        return 5
    if t < 0.12:
        return 3
    if t < 0.52:
        return 2
    if t < 0.8:
        return 1
    return 3


def corpo_metal(c: Camada, cx: float, ytop: int, larguras: list[float], metal: str, reflexo: bool = True,
                contorno: bool = True) -> None:
    """Sólido de revolução (taça, pé, haste) a partir das meias-larguras de cada linha, de cima para baixo."""
    pal = METAIS[metal]
    for i, w in enumerate(larguras):
        if w <= 0:
            continue
        y = ytop + i
        acima = larguras[i - 1] if i > 0 else 0
        incl = 1 if w > acima + 0.4 else (-1 if w < acima - 0.4 else 0)
        x0, x1 = int(math.floor(cx - w + 0.5)), int(math.floor(cx + w + 0.5))
        for x in range(x0, x1 + 1):
            t = (x + 0.5 - cx) / max(w + 0.5, 0.6)
            k = min(5, max(1, tom_metal(t, w) + incl))
            c.p(x, y, pal[k])
        if contorno and w >= 1.5:
            c.p(x0 - 1, y, pal[0], 0.85)
            c.p(x1 + 1, y, pal[0], 0.85)
        if reflexo and w >= 1.6 and i % 5 in (1, 2):
            c.p(int(cx - w * 0.42), y, pal[6])


def perfil(pontos: list[tuple[float, float]], altura: int, escala: float) -> list[float]:
    """Interpola um perfil normalizado [(v, meia-largura)] (v de 0 no topo a 1 na base) para `altura` linhas."""
    vs = [p[0] for p in pontos]
    ws = [p[1] for p in pontos]
    return [float(np.interp((i + 0.5) / altura, vs, ws)) * escala for i in range(altura)]


PERFIS = {
    # taça clássica de bojo largo
    "taca": [(0, .44), (.05, .46), (.12, .43), (.3, .38), (.44, .29), (.53, .16), (.58, .08), (.64, .06), (.68, .11),
             (.72, .06), (.84, .07), (.9, .2), (1, .25)],
    # cálice alto e estreito
    "calice": [(0, .3), (.05, .32), (.25, .28), (.4, .2), (.5, .1), (.56, .05), (.8, .05), (.84, .1), (.88, .05),
               (.92, .16), (1, .22)],
    # urna com tampa e pináculo
    "urna": [(0, .04), (.06, .08), (.1, .04), (.14, .18), (.2, .24), (.24, .3), (.3, .36), (.45, .38), (.58, .3),
             (.66, .14), (.72, .08), (.8, .08), (.86, .16), (1, .24)],
    # bola sobre haste (globo)
    "globo": [(0, .06), (.05, .2), (.12, .27), (.22, .3), (.32, .27), (.4, .18), (.46, .06), (.8, .06), (.86, .12),
              (.9, .06), (.94, .2), (1, .24)],
}


def alcas(c: Camada, cx: float, ytop: int, h: int, w_boca: float, metal: str, abertura: float = 0.3) -> None:
    """Duas alças em arco dos lados do bojo."""
    pal = METAIS[metal]
    for lado in (-1, 1):
        n = max(6, h)
        for i in range(n + 1):
            a = i / n * math.pi
            r = w_boca * abertura + h * 0.14
            x = cx + lado * (w_boca * 0.82 + math.sin(a) * r)
            y = ytop + 1 + (1 - math.cos(a)) * h * 0.22
            c.p(round(x), round(y), pal[4] if lado < 0 and a < 1.8 else pal[2] if lado < 0 else pal[3] if a < 1.2 else pal[1])


def plinto(c: Camada, cx: float, yb: int, larg: int, alt: int, tipo: str = "madeira", plaqueta: bool = True) -> int:
    """Base do troféu (madeira escura ou mármore) com plaqueta dourada; devolve o y do topo."""
    pal = MADEIRA if tipo == "madeira" else MARMORE
    x0 = int(round(cx - larg / 2))
    c.ret(x0, yb - alt, larg, alt, pal[2])
    c.ret(x0, yb - alt, larg, 1, pal[4])
    c.ret(x0 + larg - 1, yb - alt + 1, 1, alt - 1, pal[1])
    c.ret(x0, yb - 1, larg, 1, pal[0])
    if plaqueta and alt >= 3 and larg >= 5:
        c.ret(x0 + 2, yb - alt + 1 + (alt - 2) // 2, larg - 4, 1, METAIS["ouro"][4])
    return yb - alt


def trofeu(c: Camada, cx: float, yb: int, h: int, tipo: str, metal: str, g: np.random.Generator) -> None:
    """Um troféu completo de altura `h` em pé sobre y=yb."""
    if tipo in ("taca", "calice", "urna", "globo"):
        ph = max(2, h // 6)
        topo = plinto(c, cx, yb, max(5, int(h * 0.62)) | 1, ph, "madeira" if g.random() < 0.7 else "marmore")
        hc = h - ph
        larg = perfil(PERFIS[tipo], hc, hc)
        corpo_metal(c, cx, topo - hc, larg, metal)
        if tipo == "taca" or (tipo == "urna" and g.random() < 0.5):
            alcas(c, cx, topo - hc + (int(hc * 0.18) if tipo == "urna" else 0), int(hc * 0.5), larg[1], metal)
        if tipo == "urna":
            c.p(round(cx), topo - hc - 1, METAIS[metal][5])
    elif tipo == "estatueta":
        ph = max(3, h // 3)
        topo = plinto(c, cx, yb, max(5, int(h * 0.5)) | 1, ph, "marmore" if g.random() < 0.6 else "madeira")
        col = max(2, h // 4)
        corpo_metal(c, cx, topo - col, [max(0.6, h * 0.08)] * col, metal, reflexo=False)
        estrela(c, cx, topo - col - max(3, h // 5), max(2, h // 5), metal)
    elif tipo == "osso":
        ph = max(2, h // 4)
        topo = plinto(c, cx, yb, max(7, int(h * 0.8)) | 1, ph, "marmore")
        osso_dourado(c, cx, topo - 1, max(7, int(h * 0.8)), metal)
    elif tipo == "prato":
        r = h * 0.42
        cy = yb - 2 - r
        prato(c, cx, cy, r, metal)
        c.ret(round(cx - r * 0.5), yb - 2, max(3, int(r)), 2, MADEIRA[2])
        c.ret(round(cx - r * 0.5), yb - 2, max(3, int(r)), 1, MADEIRA[4])


def estrela(c: Camada, cx: float, cy: float, r: float, metal: str) -> None:
    pal = METAIS[metal]
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            ang = math.atan2(dy, dx) + math.pi / 2
            raio = r * (0.55 + 0.45 * abs(math.cos(ang * 2.5)))
            if math.hypot(dx, dy) <= raio:
                c.p(x, y, pal[5] if dx < -0.3 and dy < 0.3 else pal[3] if dx < 0.5 else pal[2])
    c.p(round(cx - 0.5), round(cy - 0.5), pal[6])


def osso_dourado(c: Camada, cx: float, yb: int, larg: int, metal: str) -> None:
    """O osso de ouro (prêmio de ortopedia, claro), deitado sobre a base."""
    pal = METAIS[metal]
    x0 = int(round(cx - larg / 2))
    c.ret(x0 + 2, yb - 2, larg - 4, 2, pal[3])
    c.ret(x0 + 2, yb - 2, larg - 4, 1, pal[5])
    for ex in (x0, x0 + larg - 3):
        c.disco(ex + 1.5, yb - 3, 1.6, (pal[5], pal[3], pal[2]))
        c.disco(ex + 1.5, yb - 0.6, 1.4, (pal[4], pal[3], pal[1]))
    c.p(x0 + 3, yb - 2, pal[6])


def prato(c: Camada, cx: float, cy: float, r: float, metal: str) -> None:
    """Salva comemorativa em pé: anéis concêntricos com o reflexo em diagonal."""
    pal = METAIS[metal]
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            if d <= r:
                anel = d > r - 1.1
                diag = (dx + dy) / max(r, 1)
                k = 1 if anel and diag > 0.3 else 5 if anel else (4 if diag < -0.5 else 3 if diag < 0.2 else 2)
                if not anel and abs(d - r * 0.55) < 0.6:
                    k = 1
                c.p(x, y, pal[k])
    c.p(round(cx - r * 0.5), round(cy - r * 0.5), pal[6])


def escudo(c: Camada, cx: float, y0: int, w: int, h: int, cores: tuple[str, str], metal: str, emblema: list[str] | None) -> None:
    """Escudo de parede (brasão): campo partido em duas cores, borda de metal e emblema."""
    pal = METAIS[metal]
    for j in range(h):
        v = j / max(h - 1, 1)
        meia = w / 2 if v < 0.5 else w / 2 * math.sqrt(max(0.0, 1 - ((v - 0.5) / 0.5) ** 2))
        for x in range(int(round(cx - meia)), int(round(cx + meia))):
            borda = x <= cx - meia + 1 or x >= cx + meia - 1 or j == 0
            if borda:
                cor = pal[5] if x < cx else pal[2]
            else:
                cor = cores[0] if x < cx else cores[1]
            c.p(x, y0 + j, cor)
    if emblema:
        ew = len(emblema[0])
        c.bitmap(int(round(cx - ew / 2)), y0 + 2, emblema, {"#": pal[4], "o": pal[6]})


def medalha(c: Camada, x: int, y0: int, comp: int, fitas: tuple[str, str], metal: str) -> None:
    """Medalha pendurada: fita em V de duas cores e o disco de metal com estrela em relevo."""
    pal = METAIS[metal]
    for j in range(comp):
        off = j * 0.35
        c.p(round(x - 2 + off), y0 + j, fitas[0])
        c.p(round(x - 1 + off), y0 + j, fitas[1])
        c.p(round(x + 2 - off), y0 + j, fitas[0])
        c.p(round(x + 1 - off), y0 + j, fitas[1])
    cy = y0 + comp + 1.5
    c.disco(x + 0.5, cy, 2.4, (pal[5], pal[3], pal[2]))
    c.p(x - 1, int(cy) + 2, pal[1])
    c.p(x + 1, int(cy) + 2, pal[1])
    c.p(x, int(cy) - 1, pal[6])


def roseta(c: Camada, x: int, y: int, cores: tuple[str, str], r: float = 3.2) -> None:
    """Roseta de fita (rosette): babado em duas cores, miolo dourado e duas caudas."""
    for j in range(0, int(r * 2.4)):
        c.p(x - 1 - j // 3, y + 2 + j, cores[0])
        c.p(x + 1 + j // 3, y + 2 + j, cores[0])
        c.p(x - j // 3, y + 2 + j, cores[1])
    for yy in range(int(y - r) - 1, int(y + r) + 2):
        for xx in range(int(x - r) - 1, int(x + r) + 2):
            d = math.hypot(xx + 0.5 - x - 0.5, yy + 0.5 - y - 0.5)
            if d <= r:
                ang = math.atan2(yy - y, xx - x)
                cor = cores[1] if (int(ang * 2.6) % 2) else cores[0]
                c.p(xx, yy, cor)
    c.disco(x + 0.5, y + 0.5, 1.4, (METAIS["ouro"][5], METAIS["ouro"][3], METAIS["ouro"][2]))


# ─────────────────────────────── Estandartes e emblemas ───────────────────────────────
EMBLEMAS = {
    "osso": [".##.....##.", "###.....###", "..#######..", "###.....###", ".##.....##."],
    "cruz": ["..###..", "..###..", "#######", "#######", "#######", "..###..", "..###.."],
    "escudo": ["#######", "#ooooo#", "#o###o#", "#o###o#", ".#o#o#.", "..#o#..", "...#..."],
    "estrela": ["...#...", "..###..", "#######", ".#####.", "..###..", ".##.##.", "#.....#"],
    "coroa": ["#..#..#", "##.#.##", "#######", "#o#o#o#", "#######"],
    "louro": ["#.....#", "#.....#", "##...##", ".#...#.", ".##.##.", "..###.."],
}
PANOS = {
    "vermelho": ("#e0503c", "#b8302a", "#7e1a1c", "#4a0e12"),
    "azul": ("#4a7ad0", "#2c54a8", "#1c3474", "#0e1a40"),
    "dourado": ("#f6cc58", "#d8a032", "#a0701e", "#5a3a10"),
    "verde": ("#4ab06a", "#2c8648", "#1a5a32", "#0c3018"),
    "roxo": ("#9a62c8", "#7040a0", "#482870", "#24123c"),
}


def estandarte(c: Camada, x0: int, y0: int, w: int, h: int, pano: str, emblema: str, fase: float = 0.0,
               ponta: str = "cauda", vento: float = 0.6) -> None:
    """Estandarte pendurado numa vara: dobras sombreadas, galão dourado, emblema, ponta recortada e franja."""
    tons = PANOS[pano]
    ouro = METAIS["ouro"]
    corte = max(3, w // 2)
    for j in range(h):
        v = j / h
        dx = round(math.sin(v * 2.4 + fase) * vento * v * 1.6)
        for i in range(w):
            # recorte da ponta
            if ponta == "cauda" and j > h - corte and abs(i - (w - 1) / 2) < (j - (h - corte)) * 0.9:
                continue
            if ponta == "ponta" and j > h - corte and abs(i - (w - 1) / 2) > (h - j) * (w / 2) / corte:
                continue
            dobra = math.sin(i / max(w, 1) * math.pi * 2.2 + fase * 1.7 + v * 0.8)
            k = 0 if dobra > 0.45 else 1 if dobra > -0.35 else 2
            if i == w - 1 or j > h - 3:
                k = min(3, k + 1)
            cor = tons[k]
            if (i == 1 or i == w - 2) and 2 <= j < h - corte:
                cor = ouro[4] if k == 0 else ouro[3] if k == 1 else ouro[2]
            if j in (2, 3) and 1 <= i <= w - 2:
                cor = ouro[4] if j == 2 else ouro[2]
            c.p(x0 + i + dx, y0 + j, cor)
    # franja dourada na ponta
    for i in range(w):
        if ponta == "reta" and i % 2 == 0:
            dx = round(math.sin(2.4 + fase) * vento * 1.6)
            c.p(x0 + i + dx, y0 + h, ouro[4])
            c.p(x0 + i + dx, y0 + h + 1, ouro[2])
    # emblema
    em = EMBLEMAS[emblema]
    ew, eh = len(em[0]), len(em)
    ey = y0 + max(5, int(h * 0.36) - eh // 2)
    dxe = round(math.sin((ey - y0) / h * 2.4 + fase) * vento * (ey - y0) / h * 1.6)
    claro = "#fff4d0" if pano != "dourado" else "#5a2a10"
    c.bitmap(x0 + (w - ew) // 2 + dxe, ey + 1, em, {"#": tons[3]}, 0.5)
    c.bitmap(x0 + (w - ew) // 2 + dxe, ey, em, {"#": claro, "o": tons[1]})
    # vara com pontas douradas e o cordão
    c.ret(x0 - 2, y0 - 1, w + 4, 1, MADEIRA[2])
    c.ret(x0 - 2, y0 - 2, w + 4, 1, MADEIRA[4])
    for ex in (x0 - 3, x0 + w + 2):
        c.p(ex, y0 - 2, ouro[5])
        c.p(ex, y0 - 1, ouro[3])
    c.linha(x0 - 1, y0 - 2, x0 + w // 2, y0 - 5, ouro[3])
    c.linha(x0 + w, y0 - 2, x0 + w // 2, y0 - 5, ouro[2])


def chama(c: Camada, x: int, y: int, tam: int = 1) -> None:
    """Chama de tocha/vela em pixel art (a luz vem depois, na montagem)."""
    if tam <= 0:
        c.p(x, y, "#fff2b0")
        c.p(x, y - 1, "#ffb040", 0.8)
        return
    c.p(x, y, "#ff9a2a")
    c.p(x - 1, y, "#e85a18")
    c.p(x + 1, y, "#e85a18")
    c.p(x, y - 1, "#ffd860")
    c.p(x - 1, y - 1, "#ff9a2a")
    c.p(x + 1, y - 1, "#ff7a20", 0.8)
    c.p(x, y - 2, "#fff6c8")
    c.p(x, y - 3, "#ffc040")
    if tam >= 2:
        c.p(x + 1, y - 3, "#ff9a2a", 0.7)
        c.p(x, y - 4, "#ff8020", 0.6)
        c.p(x - 1, y - 2, "#ffd860")


# ─────────────────────────────── Montagem com luz (comum) ───────────────────────────────
def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def _caixa(arr: np.ndarray, r: int, eixo: int) -> np.ndarray:
    """Média móvel de largura 2r+1 ao longo de um eixo (bordas repetidas), em float."""
    pad = [(0, 0)] * arr.ndim
    pad[eixo] = (r + 1, r)
    a = np.pad(arr, pad, mode="edge")
    s = np.cumsum(a, axis=eixo, dtype=np.float64)
    n = arr.shape[eixo]
    alto = np.take(s, np.arange(2 * r + 1, 2 * r + 1 + n), axis=eixo)
    baixo = np.take(s, np.arange(0, n), axis=eixo)
    return ((alto - baixo) / (2 * r + 1)).astype(np.float32)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    """Desfoque gaussiano aproximado (três passadas de caixa), em float: preserva luzes acima de 1."""
    if raio <= 0:
        return arr
    r = max(1, int(round(raio * 0.85)))
    out = arr.astype(np.float32)
    for _ in range(3):
        out = _caixa(out, r, 0)
        out = _caixa(out, r, 1)
    return out


def desfocar_rgba(arr: np.ndarray, raio: float) -> np.ndarray:
    """Desfoque com alfa pré-multiplicado (sem halo escuro nas bordas)."""
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


def raios_de_luz(mascara: np.ndarray, fonte: tuple[float, float], passos: int = 72, alcance: float = 0.92,
                 queda: float = 0.968) -> np.ndarray:
    """Feixes: desfoque radial da máscara iluminada em direção à fonte de luz."""
    hh, ww = mascara.shape
    sx, sy = fonte[0] * ESC, fonte[1] * ESC
    acum = np.zeros_like(mascara)
    peso = 1.0
    for i in range(passos):
        t = i / passos * alcance
        px = np.clip((GRADE_X + (sx - GRADE_X) * t).astype(np.int32), 0, ww - 1)
        py = np.clip((GRADE_Y + (sy - GRADE_Y) * t).astype(np.int32), 0, hh - 1)
        acum += mascara[py, px] * peso
        peso *= queda
    return acum / passos


def facho(x_topo: float, y_topo: float, x_base: float, y_base: float, larg_topo: float, larg_base: float,
          dureza: float = 1.0) -> np.ndarray:
    """Cone de luz volumétrico entre dois pontos (em pixels da arte); `dureza` > 1 deixa a borda mais definida."""
    t = np.clip((GRADE_Y / ESC - y_topo) / (y_base - y_topo), 0, 1.25)
    centro = x_topo + (x_base - x_topo) * t
    larg = larg_topo + (larg_base - larg_topo) * t
    dist = np.abs(GRADE_X / ESC - centro) / np.maximum(larg, 0.5)
    return np.exp(-dist ** (2 * dureza) * 2.4) * (GRADE_Y / ESC > y_topo)


def poeira(seed: int, n: int, regiao, cor: str, img: np.ndarray, peso: np.ndarray, forca: float = 1.0) -> None:
    """Partículas de poeira no ar: pontinhos de 1 a 2 px (da arte) que só aparecem onde há luz (`peso`)."""
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


def acabamento(img: np.ndarray, quente: str, fria: str, esquerda: float, seed: int, bloom_lim: float = 0.88,
               bloom_k: float = 0.4, vinheta_y: float = 0.55) -> Image.Image:
    """Bloom, correção de cor (luz quente, sombra fria), contraste, área calma à esquerda, vinheta e grão."""
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - bloom_lim) * 6, 0, 1), 0, 1.5)
    img = img + desfocar(claro, 14) * bloom_k + desfocar(claro, 40) * bloom_k * 0.6
    q, f = hexa(quente), hexa(fria)
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (f * 0.5 + 0.5)))
    img = np.clip((img - 0.48) * 1.1 + 0.48, 0, 1.3)
    xs, ys = GRADE_X / (W * ESC), GRADE_Y / (H * ESC)
    # área calma do texto: a esquerda escurece e perde contraste aos poucos (sem corte visível)
    calma = 1 - esquerda * (1 - suave(0.08, 0.5, xs))
    lum = img.mean(2, keepdims=True)
    img = (img * 0.82 + lum * 0.18 * (1 - calma[:, :, None]) + img * 0.18 * calma[:, :, None]) * calma[:, :, None]
    v = (xs - 0.56) ** 2 * 1.25 + (ys - vinheta_y) ** 2 * 1.8
    img *= (1 - np.clip(v - 0.07, 0, 1) * 1.15)[:, :, None]
    g = np.random.default_rng(seed)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.02
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


# ═════════════════════════════════════ 1. ARENA ═════════════════════════════════════
# A parede do fundo é uma tigela vista de dentro: o alto (mais perto de nós nas laterais) sobe nas bordas e o pé da
# parede desce nelas. Tudo na parede é medido pela fração s (0 = borda de cima, 1 = pé) e pela coordenada dos arcos A.
AR_CX, AR_MEIA = 250, 268
AR_SOL = (466, 8)             # o sol baixo, à direita, espiando por cima da borda
PODIO = (346, 150)            # centro e chão do pódio
PEDRA = ("#f2ddb0", "#dcc092", "#c2a276", "#9c7e5a", "#715a44", "#3e2e26")


def ar_borda(x: float) -> tuple[float, float]:
    u = (x - AR_CX) / AR_MEIA
    curva = 1 - u * u
    return 4 + 20 * curva, 114 - 15 * curva


def ar_coord_arcos() -> np.ndarray:
    alturas = np.array([ar_borda(x)[1] - ar_borda(x)[0] for x in range(W)], dtype=np.float32)
    a = np.cumsum(14.0 / alturas) / 14.0 * 6.2
    return a - a[int(AR_CX)]


ARCO_A = ar_coord_arcos()
PORTOES = {-2, 1, 4}


def ceu_arena() -> np.ndarray:
    ceu = np.zeros((H, W, 3), dtype=np.float32)
    topo, meio, horiz = hexa("#4c4a92"), hexa("#e8866e"), hexa("#ffcf8a")
    for y in range(H):
        t = min(1, y / 64)
        ceu[y] = topo * (1 - t) ** 2 + meio * 2 * t * (1 - t) + horiz * t * t
    # mais dourado do lado do sol
    lado = np.clip(np.arange(W, dtype=np.float32) / W - 0.3, 0, 1)[None, :, None]
    ceu = ceu * (1 - lado * 0.5) + (ceu * 0.4 + hexa("#ffb070") * 0.6) * lado * 0.5
    # nuvens em faixas compridas (cirros de fim de tarde), com a barriga acesa pelo sol
    n = ruido_ret(7, 40, 3) * 0.7 + ruido_ret(8, 12, 2) * 0.3
    for y in range(0, 40):
        for x in range(W):
            v = n[y, x] - 0.52 - abs(y - 14) / 60
            if v > 0:
                k = min(1, v * 6) * 0.85
                acesa = n[min(H - 1, y + 1), x] < n[y, x]
                cor = hexa("#ffe2a8") if acesa else hexa("#c87a8a")
                cor = cor * (0.85 + 0.3 * min(1, x / W + 0.2))
                ceu[y, x] = ceu[y, x] * (1 - k) + cor * k
    # pombas voando, acesas por baixo pelo sol
    for (bx, by, abre) in ((300, 8, 1), (312, 5, 0), (322, 10, 1), (286, 13, 0), (420, 22, 1), (430, 18, 0)):
        for (dx, dy) in ((-2, -abre), (-1, 0), (0, 1 - abre), (1, 0), (2, -abre)):
            ceu[by + dy, bx + dx] = hexa("#3a2a3a")
        ceu[by + 1, bx] = hexa("#ffd8a0")
    sx, sy = AR_SOL
    for y in range(H):
        for x in range(W):
            d = math.hypot(x - sx, (y - sy) * 1.1)
            if d < 80:
                ceu[y, x] = np.minimum(1.6, ceu[y, x] + hexa("#ffd890") * max(0, 1 - d / 80) ** 2 * 1.0)
            if d < 9:
                ceu[y, x] = hexa("#fffbe8") * 1.6
    return ceu


def parede_arena() -> tuple[Camada, list[tuple[int, int]], np.ndarray]:
    """A arquibancada do fundo: ático com arcos abertos para o céu, degraus com a torcida, balaustrada e o muro da
    arena com faixas pintadas, portões e tochas. Devolve a camada, as tochas e a máscara dos arcos abertos."""
    c = Camada()
    n_grande = ruido(11, 10)
    g = np.random.default_rng(12)
    grao = g.random((H, W))
    abertos = np.zeros((H, W), dtype=np.float32)
    tochas: list[tuple[int, int]] = []
    NT = 11
    for x in range(W):
        rim, base = ar_borda(x)
        alt = base - rim
        A = ARCO_A[x]
        fa = A - math.floor(A)
        ka = math.floor(A)
        fa3 = (A / 3 + 0.5) - math.floor(A / 3 + 0.5)
        corredor = abs(fa3 - 0.5) < 0.04
        for y in range(int(rim), int(base) + 1):
            s = (y - rim) / alt
            if s < 0:
                continue
            ruidinho = (grao[y, x] - 0.5) * 0.06 + (n_grande[y, x] - 0.5) * 0.08
            cor = None
            if s < 0.035:
                cor = PEDRA[0] if y == int(rim) else PEDRA[2]
            elif s < 0.055:
                cor = PEDRA[4] if x % 2 else PEDRA[2]
            elif s < 0.30:
                sb = (s - 0.055) / 0.245
                fx = (fa - 0.59) / 0.35
                topo = 0.24 + 0.3 * (1 - math.sqrt(max(0.0, 1 - fx * fx)))
                if abs(fx) < 1 and topo < sb < 0.93:
                    if fx < -0.78:
                        cor = PEDRA[4]
                    elif sb > 0.86:
                        cor = PEDRA[3]
                    else:
                        abertos[y, x] = 1
                        continue
                elif abs(fx) < 1.2 and topo - 0.11 < sb <= topo:
                    cor = PEDRA[4] if int((fx + 1.2) * 4.2) % 2 == 0 and abs(sb - topo + 0.05) < 0.06 else PEDRA[1]
                elif fa < 0.19:
                    cor = PEDRA[0] if fa < 0.04 else PEDRA[3] if fa > 0.15 else PEDRA[1]
                    if 0.9 < sb or sb < 0.06:
                        cor = PEDRA[2]
                else:
                    fila = int(sb * 6)
                    junta_h = (sb * 6) % 1 < 0.14
                    junta_v = ((fa * 3 + fila * 0.5) % 1) < 0.07
                    cor = PEDRA[3] if junta_h or junta_v else PEDRA[2]
            elif s < 0.335:
                cor = PEDRA[0] if s < 0.31 else PEDRA[1] if s < 0.32 else PEDRA[4]
            elif s < 0.80:
                tier = (s - 0.335) / 0.465 * NT
                ft = tier - math.floor(tier)
                if corredor:
                    ft2 = (tier * 2) % 1
                    cor = PEDRA[1] if ft2 < 0.35 else PEDRA[3]
                    if abs(fa3 - 0.5) > 0.03:
                        cor = PEDRA[4]
                    if 0.48 < s < 0.6 and int(A / 3 + 0.5) % 2 == 0:
                        # vomitório: a passagem escura por onde a torcida entra
                        cor = "#22160f" if abs(fa3 - 0.5) < 0.035 else PEDRA[3]
                else:
                    cor = PEDRA[1] if ft < 0.3 else PEDRA[4] if ft > 0.86 else PEDRA[3]
            elif s < 0.835:
                if s < 0.81:
                    cor = PEDRA[0]
                else:
                    cor = PEDRA[2] if (x % 3) else PEDRA[5]
            else:
                sb = (s - 0.835) / 0.165
                fx = (fa - 0.5) / 0.36
                portao = ka in PORTOES and abs(fx) < 1
                topo_p = 0.18 + 0.3 * (1 - math.sqrt(max(0.0, 1 - fx * fx)))
                if portao and sb > topo_p:
                    grade = (x % 3 == 0) or (int(sb * 40) % 4 == 0)
                    cor = "#5a4630" if grade else "#140d0a"
                    if abs(fx) > 0.86:
                        cor = PEDRA[4]
                elif portao and sb > topo_p - 0.08:
                    cor = PEDRA[0]
                elif 0.08 < sb < 0.32:
                    painel = int(A * 2) % 2
                    borda_p = sb < 0.11 or sb > 0.29 or ((A * 2) % 1) < 0.05
                    cor = "#f0e2c0" if borda_p else ("#9a2e24" if painel else "#2c5a7a")
                    if not borda_p and abs(((A * 2) % 1) - 0.5) < 0.12 and abs(sb - 0.2) < 0.05:
                        cor = "#e8b440"
                elif sb > 0.92:
                    cor = PEDRA[4]
                else:
                    fila = int((sb - 0.32) * 5)
                    junta_h = ((sb - 0.32) * 5) % 1 < 0.1
                    junta_v = ((A * 4 + fila * 0.5) % 1) < 0.06
                    cor = PEDRA[3] if junta_h or junta_v else PEDRA[2]
            rgb = hexa(cor) * (1 + ruidinho)
            c.c[y, x, :3] = rgb
            c.c[y, x, 3] = 1
    # A torcida: figurinhas de 1 x 3 px nos degraus (cabeça, roupa), algumas com braços e bandeirinhas.
    peles = ["#f0c8a0", "#d8a478", "#b47c54", "#8a5a3a", "#e8b890"]
    roupas = ["#c83c30", "#2c5ca8", "#e8c040", "#3a8a4a", "#e8e0d0", "#7a4a9a", "#d87a30", "#4a4a5a", "#a0a8b8", "#c86a8a"]
    # cada setor entre dois corredores tem a sua torcida organizada (uma cor domina), como nos estandartes
    times = ["#c83c30", "#2c5ca8", "#e8c040", "#3a8a4a", "#e8e0d0", "#7a4a9a"]
    dono = {k: (times[int(g.random() * len(times))] if g.random() < 0.65 else None) for k in range(-30, 30)}
    for t in range(NT):
        for x in range(W):
            if g.random() > 0.86:
                continue
            rim, base = ar_borda(x)
            alt = base - rim
            A = ARCO_A[x]
            fa3 = (A / 3 + 0.5) - math.floor(A / 3 + 0.5)
            if abs(fa3 - 0.5) < 0.05:
                continue
            ys = round(rim + (0.335 + (t + 0.3) / NT * 0.465) * alt)
            setor = dono.get(int(math.floor(A / 3 + 0.5)))
            roupa = setor if setor and g.random() < 0.7 else roupas[int(g.random() * len(roupas))]
            roupa = misturar(roupa, "#3e302c", 0.38)
            c.p(x, ys - 1, roupa)
            c.p(x, ys - 2, roupa)
            c.p(x, ys - 3, peles[int(g.random() * len(peles))])
            if g.random() < 0.12:
                c.p(x + (1 if g.random() < 0.5 else -1), ys - 4, peles[0])
            if g.random() < 0.035:
                c.p(x, ys - 5, ["#ff4a3a", "#4a8aff", "#ffd84a", "#4ad86a"][int(g.random() * 4)])
                c.p(x, ys - 4, "#3a2a1a")
    # Bandeirolas: cordões em catenária na balaustrada, triângulos coloridos.
    cores_b = ["#e84a3a", "#f6c84a", "#3a7ad8", "#3aa85a", "#f2ece0"]
    ka0 = int(math.floor(ARCO_A[0]))
    for k in range(ka0, int(ARCO_A[-1]) + 1):
        xs = [x for x in range(W) if k <= ARCO_A[x] < k + 1]
        if len(xs) < 4 or k % 2:
            continue
        xa, xb = xs[0], xs[-1]
        for x in range(xa, xb + 1):
            rim, base = ar_borda(x)
            y0 = rim + 0.81 * (base - rim)
            t = (x - xa) / max(1, xb - xa)
            y = y0 + 4 * math.sin(t * math.pi)
            c.p(x, round(y), "#5a4630")
            if (x - xa) % 4 == 2 and 1 < x - xa < xb - xa - 1:
                cor = cores_b[(x // 4 + k) % len(cores_b)]
                c.p(x, round(y) + 1, cor)
                c.p(x + 1, round(y) + 1, cor)
                c.p(x, round(y) + 2, cor)
    # Tochas nas pilastras do muro da arena.
    for k in range(ka0, int(ARCO_A[-1]) + 2):
        xs = [x for x in range(W) if abs(ARCO_A[x] - k) < 0.02]
        if not xs or k % 2:
            continue
        x = xs[0]
        rim, base = ar_borda(x)
        y = round(rim + (0.835 + 0.165 * 0.5) * (base - rim))
        c.ret(x - 1, y, 3, 1, "#3a2a1a")
        c.ret(x, y - 2, 1, 4, "#5a3a22")
        c.ret(x - 1, y - 3, 3, 1, "#2a1a10")
        chama(c, x, y - 4, 1)
        tochas.append((x, y - 5))
    return c, tochas, abertos


def estandartes_arena() -> Camada:
    """Os estandartes grandes pendurados no ático, sobre a arquibancada: vermelho, azul, dourado, verde."""
    c = Camada()
    panos = ["vermelho", "azul", "dourado", "verde"]
    emblemas = ["osso", "cruz", "escudo", "estrela", "coroa", "louro"]
    lista = [(k, panos[(k // 2) % 4], emblemas[(k // 2 + 2) % 6]) for k in range(-16, 22, 2)]
    for i, (k, pano, em) in enumerate(lista):
        xs = [x for x in range(W) if abs(ARCO_A[x] - (k + 0.59)) < 0.03]
        if not xs:
            continue
        x = xs[len(xs) // 2]
        rim, base = ar_borda(x)
        alt = base - rim
        larg = max(7, int(alt * 0.13)) | 1
        comp = int(alt * 0.42)
        y0 = round(rim + 0.32 * alt)
        estandarte(c, x - larg // 2, y0, larg, comp, pano, em, fase=i * 1.3, ponta="cauda" if i % 2 else "ponta")
    return c


def chao_arena() -> Camada:
    """Areia: tons em ruído, ondulações do vento, marcas de roda de biga, rastelo em volta do pódio e pegadas."""
    c = Camada()
    n1, n2 = ruido(31, 14), ruido(32, 4)
    veio = ruido_ret(33, 30, 2)
    g = np.random.default_rng(35)
    fino = g.random((H, W))
    areia = ("#f8e2ac", "#ecca8e", "#dab47a", "#c49c66", "#a88054", "#7e5e40")
    px, py = PODIO
    for x in range(W):
        _, base = ar_borda(x)
        for y in range(int(base), H):
            v = n1[y, x] * 0.5 + n2[y, x] * 0.2 + veio[y, x] * 0.15 + fino[y, x] * 0.15
            k = 0 if v > 0.66 else 1 if v > 0.52 else 2 if v > 0.38 else 3
            # ondinhas de vento: riscos finos e compridos
            if abs(math.sin(x * 0.05 + y * 1.3 + veio[y, x] * 9)) > 0.97:
                k = max(0, k - 1)
            elif abs(math.sin(x * 0.05 + y * 1.3 + veio[y, x] * 9 + 0.35)) > 0.97:
                k = min(4, k + 1)
            # rastelo em volta do pódio: elipses concêntricas
            d = math.hypot((x - px) / 3.4, (y - py + 2) * 1.0)
            if 22 < d < 44 and (d % 2.6) < 0.5:
                k = min(4, k + 1)
            if y < base + 3:
                k = min(5, k + 3 - int(y - base))
            c.p(x, y, areia[k])
    # Marcas de roda de biga: dois sulcos paralelos em curva atravessando a areia.
    for desloc in (0, 6):
        for x in range(-10, W + 10):
            t = x / W
            y = 126 + 22 * math.sin(t * math.pi * 1.1 + 0.6) + desloc * (0.5 + t * 0.5)
            if 0 <= x < W and y < H and not (px - 70 < x < px + 70 and y > py - 18):
                c.p(x, round(y), areia[4])
                c.p(x, round(y) - 1, areia[0], 0.8)
                c.p(x, round(y) + 1, areia[3], 0.5)
    # Pegadas: trilhas alternadas (esquerda/direita) que convergem para o pódio.
    trilhas = [((60, 162), (286, 150)), ((150, 120), (292, 146)), ((476, 160), (406, 150)), ((250, 104), (312, 140)),
               ((420, 112), (392, 142))]
    for (xa, ya), (xb, yb) in trilhas:
        dist = math.hypot(xb - xa, yb - ya)
        n = int(dist / 4.5)
        nx, ny = -(yb - ya) / dist, (xb - xa) / dist
        for i in range(n):
            t = i / n
            lado = 1 if i % 2 else -1
            x = xa + (xb - xa) * t + nx * lado * 1.4 + math.sin(t * 7) * 3
            y = ya + (yb - ya) * t + ny * lado * 0.6
            tam = 2 if y > 135 else 1
            c.ret(round(x), round(y), tam + 1, 1, areia[4])
            c.p(round(x) + tam, round(y), areia[5])
            c.p(round(x), round(y) - 1, areia[0])
    # Pedrinhas e palha.
    for _ in range(420):
        x, y = int(g.random() * W), int(100 + g.random() * 60)
        if y < ar_borda(x)[1] + 2:
            continue
        if g.random() < 0.55:
            c.p(x, y, areia[5])
            c.p(x, y - 1, "#fff4d0")
        else:
            c.p(x, y, "#f0d070")
            c.p(x + 1, y - 1, "#c8a050")
            c.p(x + 2, y - 1, "#e8c060", 0.7)
    objetos_arena(c)
    return c


def objetos_arena(c: Camada) -> None:
    """O que ficou na areia: escudo redondo caído, lança, armário de armas e barris junto ao muro, pétalas de rosa."""
    # escudo redondo caído (vermelho com borda de bronze e umbo dourado)
    for (ex, ey, rx, pano) in ((150, 141, 10, "vermelho"), (448, 150, 8, "azul")):
        tons = PANOS[pano]
        for y in range(ey - 5, ey + 5):
            for x in range(ex - rx - 1, ex + rx + 2):
                d = math.hypot((x - ex) / rx, (y - ey) / (rx * 0.38))
                if d <= 1:
                    cor = METAIS["bronze"][4] if d > 0.82 and y < ey else METAIS["bronze"][2] if d > 0.82 else tons[0] if (x - ex) < -rx * 0.2 else tons[1]
                    if d < 0.25:
                        cor = METAIS["ouro"][5] if x < ex else METAIS["ouro"][3]
                    c.p(x, y, cor)
        c.ret(ex - rx, ey + 4, rx * 2, 1, "#7e5e40", 0.6)
    # lança caída
    c.linha(170, 152, 222, 140, MADEIRA[3])
    c.linha(170, 153, 222, 141, MADEIRA[1])
    c.linha(222, 140, 228, 138, METAIS["prata"][4])
    c.linha(222, 141, 228, 139, METAIS["prata"][2])
    # armário de armas junto ao muro, à direita: lanças em pé e escudos pendurados
    x0, yb = 404, 114
    c.ret(x0, yb - 20, 44, 2, MADEIRA[3])
    c.ret(x0, yb - 20, 44, 1, MADEIRA[4])
    c.ret(x0, yb - 8, 44, 2, MADEIRA[2])
    for xx in (x0, x0 + 42):
        c.ret(xx, yb - 22, 2, 22, MADEIRA[2])
        c.ret(xx, yb - 22, 1, 22, MADEIRA[4])
    for i, xx in enumerate(range(x0 + 4, x0 + 40, 5)):
        c.ret(xx, yb - 30 + (i % 2) * 2, 1, 30 - (i % 2) * 2, MADEIRA[3])
        c.p(xx, yb - 31 + (i % 2) * 2, METAIS["prata"][5])
        c.p(xx, yb - 32 + (i % 2) * 2, METAIS["prata"][3])
    for (sx, pano) in ((x0 + 9, "verde"), (x0 + 22, "dourado"), (x0 + 35, "vermelho")):
        for y in range(yb - 18, yb - 7):
            for x in range(sx - 5, sx + 6):
                d = math.hypot(x - sx, y - (yb - 13))
                if d <= 4.8:
                    cor = METAIS["bronze"][4] if d > 3.8 and x < sx else METAIS["bronze"][2] if d > 3.8 else \
                        PANOS[pano][1] if x < sx else PANOS[pano][2]
                    c.p(x, y, cor)
        c.p(sx, yb - 13, METAIS["ouro"][5])
        c.p(sx + 1, yb - 13, METAIS["ouro"][3])
    # barris
    for (bx, by) in ((462, 118), (472, 121)):
        for y in range(by - 10, by + 1):
            meia = 4 if y in (by - 10, by) else 5
            for dx in range(-meia, meia + 1):
                aro = y in (by - 8, by - 2)
                c.p(bx + dx, y, "#3a2a1a" if aro else MADEIRA[4] if dx < -2 else MADEIRA[3] if dx < 2 else MADEIRA[2])
        c.ret(bx - 4, by - 10, 9, 1, MADEIRA[4])
    # pétalas de rosa jogadas em volta do pódio
    g = np.random.default_rng(37)
    px, py = PODIO
    for _ in range(150):
        ang = g.random() * math.tau
        r = abs(g.normal(0, 1)) * 18 + 22
        x, y = px + math.cos(ang) * r * 1.9, py + math.sin(ang) * r * 0.3 + 2
        if y > ar_borda(x)[1] + 2:
            cor = ["#e83a4a", "#c82038", "#ff7a8a", "#f6e8e0"][int(g.random() * 4)]
            c.p(x, y, cor)
            if g.random() < 0.4:
                c.p(x + 1, y, cor)


def podio() -> tuple[Camada, list[tuple[float, float]]]:
    """O pódio de pedra (2.º, 1.º, 3.º) sobre um degrau largo, com numerais e coroas de louro em ouro, pano vermelho
    com franja no centro e as taças: ouro no alto, prata e bronze dos lados. Devolve a camada e os pontos de brilho."""
    c = Camada()
    px, py = PODIO
    pedra = ("#fff2d2", "#f0dcb4", "#d8be94", "#b49870", "#866c50", "#4a3a2c")
    brilhos = []
    ruido_p = ruido(41, 3)

    def bloco(x0: int, y0: int, w: int, h: int, topo: int = 4, lateral: int = 4) -> None:
        # topo visto de cima, recuando para a esquerda (o ponto de fuga fica à esquerda do pódio)
        for j in range(topo):
            yy = y0 - topo + j
            c.ret(x0 - (topo - j), yy, w, 1, pedra[0] if j < topo - 1 else pedra[1])
        # lateral esquerda na sombra
        for i in range(lateral):
            for j in range(h + (lateral - i) - 1):
                yy = y0 - (lateral - i) + 1 + j
                if yy < y0 + h:
                    c.p(x0 - lateral + i, yy, pedra[4] if i < lateral - 1 else pedra[3])
        # frente com textura de pedra e juntas
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                v = ruido_p[y % H, x % W]
                c.p(x, y, pedra[1] if v > 0.68 else pedra[2] if v > 0.3 else pedra[3])
        c.ret(x0, y0, w, 1, pedra[0])
        c.ret(x0 + w - 1, y0, 1, h, pedra[3])
        for j in range(7, h, 8):
            c.ret(x0, y0 + j, w, 1, pedra[3])
            c.ret(x0, y0 + j + 1, w, 1, pedra[1])
        for j in range(0, h, 8):
            off = 7 if (j // 8) % 2 else 15
            for x in range(x0 + off, x0 + w - 2, 17):
                c.ret(x, y0 + j, 1, min(7, h - j), pedra[4])
        # lascas
        g = np.random.default_rng(x0)
        for _ in range(w * h // 60):
            lx, ly = x0 + int(g.random() * (w - 2)), y0 + 1 + int(g.random() * (h - 2))
            c.p(lx, ly, pedra[4])
            c.p(lx + 1, ly - 1, pedra[0])
        c.ret(x0 - lateral, y0 + h - 1, w + lateral, 1, pedra[5])

    def louros(cx: int, cy: int, r: float) -> None:
        ouro = METAIS["ouro"]
        for lado in (-1, 1):
            n = max(6, int(r * 1.6))
            for i in range(n):
                a = math.radians(250 - i * 150 / n)
                x = cx + lado * math.cos(a) * r
                y = cy - math.sin(a) * r * 0.95
                c.p(round(x), round(y), ouro[3])
                # folhinhas para fora e para dentro do ramo
                c.p(round(x + lado * math.cos(a) * 1.3), round(y - math.sin(a) * 1.3), ouro[4] if i % 2 else ouro[5])
                if i % 2 == 0:
                    c.p(round(x - lado * math.cos(a) * 1.1), round(y + math.sin(a) * 1.1), ouro[2])
        c.p(cx - 1, cy + round(r) + 1, PANOS["vermelho"][1])
        c.p(cx + 1, cy + round(r) + 1, PANOS["vermelho"][1])

    def numeral(cx: int, cy: int, n: int) -> None:
        ouro = METAIS["ouro"]
        larg = 3 * n
        x0 = cx - larg // 2
        c.ret(x0 - 1, cy, larg + 1, 1, ouro[4])
        c.ret(x0 - 1, cy + 8, larg + 1, 1, ouro[3])
        for i in range(n):
            c.ret(x0 + i * 3, cy + 1, 1, 7, ouro[4])
            c.ret(x0 + i * 3 + 1, cy + 1, 1, 7, ouro[2])
        c.ret(x0 - 1, cy + 9, larg + 1, 1, pedra[4])

    # degrau largo de base, 2.º (esquerda), 3.º (direita) e 1.º (centro)
    bloco(px - 64, py - 6, 128, 6, topo=4, lateral=5)
    bloco(px - 56, py - 26, 36, 20)
    bloco(px + 20, py - 19, 36, 13)
    bloco(px - 20, py - 38, 40, 32)
    # pano vermelho com franja sobre a frente do 1.º lugar
    for j in range(13):
        meia = 15 - j * 0.12
        for x in range(round(px - meia), round(px + meia)):
            dobra = math.sin((x - px) * 0.8 + j * 0.05)
            c.p(x, py - 38 + j, PANOS["vermelho"][0 if dobra > 0.4 else 1 if dobra > -0.3 else 2])
    c.ret(px - 15, py - 37, 30, 1, METAIS["ouro"][4])
    for x in range(px - 14, px + 15, 2):
        c.p(x, py - 25, METAIS["ouro"][4])
        c.p(x, py - 24, METAIS["ouro"][2])
    louros(px, py - 30, 3.5)
    c.bitmap(px - 2, py - 32, EMBLEMAS["estrela"][1:6], {"#": METAIS["ouro"][4]})
    numeral(px, py - 19, 1)
    louros(px, py - 15, 8)
    numeral(px - 38, py - 21, 2)
    louros(px - 38, py - 17, 8)
    numeral(px + 38, py - 16, 3)
    # as taças: ouro grande com alças sobre mármore; prata e bronze menores
    g = np.random.default_rng(5)
    topo = plinto(c, px, py - 42, 17, 5, "marmore")
    hc = 30
    larg = perfil(PERFIS["taca"], hc, 32)
    corpo_metal(c, px, topo - hc, larg, "ouro")
    alcas(c, px, topo - hc + 1, 16, larg[1], "ouro", 0.4)
    brilhos += [(px - 6, topo - hc + 6), (px - 4, topo - 9)]
    trofeu(c, px - 38, py - 30, 18, "taca", "prata", g)
    trofeu(c, px + 38, py - 23, 15, "taca", "bronze", g)
    brilhos += [(px - 41, py - 44), (px + 36, py - 34)]
    # pétalas sobre os degraus
    for _ in range(40):
        x = px - 60 + g.random() * 120
        y = py - 7 if g.random() < 0.6 else py - 27 if x < px - 20 else py - 20 if x > px + 20 else py - 39
        c.p(x, y - int(g.random() * 2), ["#e83a4a", "#ff7a8a", "#c82038"][int(g.random() * 3)])
    return c, brilhos


def sombras_arena() -> Camada:
    """Sombra que o pódio projeta na areia (o sol vem do alto à direita, a sombra cai para a esquerda)."""
    c = Camada()
    px, py = PODIO
    for j in range(0, 10):
        for x in range(-64, 66):
            alt_local = 44 if abs(x) < 20 else 26 if x < 0 else 19
            xx = px + x - j * 3 - 3
            if j < alt_local * 0.22:
                c.p(round(xx), py + j // 2, "#2a1a24", 0.5)
    return c


def frente_arena() -> Camada:
    """Primeiro plano (vai bem desfocado): coluna na sombra à esquerda, cordas do toldo com bandeirolas no alto à
    direita e montes de areia embaixo."""
    c = Camada()
    for x in range(-4, 14):
        for y in range(H):
            canelura = (x % 4 == 1)
            c.p(x, y, "#4a382e" if canelura else "#6a5444" if x < 9 else "#3a2a22")
    c.ret(-4, 0, 20, 8, "#5a4638")
    c.ret(-4, 8, 22, 3, "#7a6250")
    for (cx, cy, r) in ((60, 172, 20), (110, 178, 16), (424, 176, 20), (478, 166, 20)):
        c.disco(cx, cy, r, ("#e0b880", "#b48c60", "#6a5038"))
    for (xa, ya, xb, yb, flecha) in ((236, -4, 330, 10, 6), (410, 2, 500, 30, 7)):
        n = int(xb - xa)
        for i in range(n):
            t = i / n
            x = xa + (xb - xa) * t
            y = ya + (yb - ya) * t + flecha * math.sin(t * math.pi)
            c.p(round(x), round(y), "#4a3424")
            if i % 10 == 5:
                cor = ["#d8402e", "#f0c040", "#2e6ac8", "#2e9a50"][(i // 10) % 4]
                for j in range(5):
                    c.ret(round(x) - (4 - j) // 2, round(y) + 1 + j, max(1, 5 - j), 1, cor)
    return c


def velario() -> Camada:
    """O toldo (velário) esticado no alto, à direita, em gomos listrados; o vão entre eles deixa passar o facho."""
    c = Camada()
    for (xa, xb, prof) in ((244, 356, 13), (402, 490, 17)):
        for x in range(xa, xb):
            t = (x - xa) / (xb - xa)
            fundo = prof * (0.55 + 0.45 * math.sin(t * math.pi)) + 2 * math.sin(x * 0.35)
            for y in range(-2, int(fundo)):
                listra = int((x - xa) / 7) % 2
                borda = y >= int(fundo) - 1
                cor = "#7a2a1e" if borda else ("#d8603c" if listra else "#f2c88a")
                c.p(x, y, cor)
    return c


def montar_arena() -> Image.Image:
    ceu = ampliar(ceu_arena())
    parede, tochas, abertos = parede_arena()
    parede_a = desfocar_rgba(ampliar(parede.c), 1.3)
    bandeiras = desfocar_rgba(ampliar(estandartes_arena().c), 1.0)
    chao = desfocar_rgba(ampliar(chao_arena().c), 0.4)
    pod, brilhos = podio()
    pod_a = ampliar(pod.c)
    sombras = desfocar_rgba(ampliar(sombras_arena().c), 3)
    frente = desfocar_rgba(ampliar(frente_arena().c), 10)

    img = ceu.copy()
    solido = np.zeros(img.shape[:2], dtype=np.float32)
    for cam in (parede_a, bandeiras, chao):
        img = sobre(img, cam)
        solido = np.maximum(solido, cam[:, :, 3])
    img = sobre(img, sombras)
    img = sobre(img, pod_a)
    solido = np.maximum(solido, pod_a[:, :, 3])

    xs, ys = GRADE_X / ESC, GRADE_Y / ESC
    px, py = PODIO
    # Sol e sombra: a parte esquerda da arena fica na sombra da arquibancada (área calma do texto). Perto da borda da
    # sombra, a luz que passa pelos arcos risca a areia em faixas inclinadas.
    borda_sombra = 168 + 0.62 * ys + 5 * np.sin(ys * 0.17)
    m = suave(borda_sombra - 12, borda_sombra + 12, xs)
    piso = ys > 108
    faixas = suave(0.55, 0.95, np.sin((xs - ys * 0.62) * math.tau / 26)) * suave(borda_sombra - 60, borda_sombra - 20, xs) * piso
    faixas = desfocar(faixas[:, :, None], 6)[:, :, 0]
    m = np.clip(m + faixas * (1 - m) * 0.3, 0, 1)
    amb_sombra = hexa("#6c66a6") * 0.8
    amb_sol = hexa("#ffd8a4") * 1.0
    luz = amb_sombra * (1 - m[:, :, None]) + amb_sol * m[:, :, None]
    f_luz = facho(382, -6, px + 2, py - 30, 10, 40)
    luz = luz + f_luz[:, :, None] * hexa("#ffe2a8") * 0.16
    luz = luz + luz_pontual(px, py - 2, 64, 0.22)[:, :, None] * hexa("#ffd890") * 0.22
    for (tx, ty) in tochas:
        k = 0.6 if tx > 200 else 0.4
        luz = luz + luz_pontual(tx, ty + 2, 20, 0.8)[:, :, None] * hexa("#ff9a40") * k
    sol_ = solido[:, :, None]
    img = img * (1 - sol_) + img * sol_ * luz

    # Feixes do sol pelos arcos abertos do ático (raios crepusculares).
    vis = ampliar(abertos[:, :, None])[:, :, 0] * (GRADE_X > 200 * ESC)
    raios = raios_de_luz(vis, AR_SOL, passos=80, alcance=0.95)
    raios = desfocar(raios[:, :, None], 6)[:, :, 0]
    img += raios[:, :, None] * hexa("#ffd090") * 1.3

    # O grande facho de sol descendo sobre o pódio, com poeira dançando.
    poe = ampliar(ruido(81, 4)[:, :, None])[:, :, 0]
    f = facho(382, -6, px + 2, py - 34, 9, 28, dureza=2.2) * np.clip(1.1 - ys / 170, 0, 1)
    f2 = facho(398, -6, px + 16, py - 22, 2.5, 8, dureza=1.6) * 0.8
    f3 = facho(366, -6, px - 14, py - 30, 2, 6, dureza=1.6) * 0.55
    fachos = desfocar(((f + f2 + f3) * (0.55 + 0.75 * poe))[:, :, None], 3)[:, :, 0]
    # o facho morre na altura da taça (a luz pousa nela, não passa por cima do pódio como névoa)
    fachos *= np.clip((py - 36 - ys) / 26, 0, 1) * 0.85 + 0.15 * np.clip((py - ys) / 30, 0, 1)
    fachos *= 1 - 0.65 * pod_a[:, :, 3]
    img += fachos[:, :, None] * hexa("#ffe2a4") * 0.5
    poeira(82, 1100, (300, 0, 430, 150), "#fff0c0", img, fachos * 2.4, 1.0)
    # pétalas caindo dentro do facho
    g = np.random.default_rng(84)
    for _ in range(70):
        x, y = px - 30 + g.random() * 70, 20 + g.random() * 100
        X, Y = int(x * ESC), int(y * ESC)
        k = fachos[Y, X] * 2 + 0.25
        cor = hexa(["#ff5a6a", "#ff8a9a", "#e8304a", "#fff0e8"][int(g.random() * 4)])
        img[Y:Y + 3, X:X + 3] = img[Y:Y + 3, X:X + 3] * 0.3 + cor * min(1.3, k + 0.5) * 0.7
    poeira(83, 500, (200, 10, 480, 150), "#ffd8a0", img, desfocar(m[:, :, None], 1)[:, :, 0] * 0.3, 0.8)

    # Faíscas do metal: estrela de 4 pontas nos reflexos das taças.
    for (bx, by) in brilhos:
        X, Y = int(bx * ESC + 1), int(by * ESC + 1)
        for d in range(-8, 9):
            k = (1 - abs(d) / 9) ** 2 * 1.2
            if 0 <= Y + d < H * ESC and 0 <= X + d < W * ESC:
                img[Y + d, X] += k
                img[Y, X + d] += k

    img = sobre(img, frente * np.array([0.5, 0.45, 0.48, 1], dtype=np.float32))
    # velário contra o sol: o pano translúcido acende por trás
    vel = desfocar_rgba(ampliar(velario().c), 5)
    img = sobre(img, vel * np.array([1.05, 0.8, 0.62, 1], dtype=np.float32))
    return acabamento(img, "#ffd49a", "#3a2a5e", esquerda=0.4, seed=91)


# ═════════════════════════════════════ 2. SALÃO DOS TROFÉUS ═════════════════════════════════════
SA_CHAO = 108                 # linha onde a parede do fundo encontra o chão
SA_FUGA = (340, 66)           # ponto de fuga
PEDESTAL = (340, 122)         # centro e chão do pedestal
JANELA = (306, 12, 68, 82)    # x, y, largura, altura da janela grande atrás do pedestal
LUA = (352, 28)


def parede_salao() -> tuple[Camada, np.ndarray, list]:
    """Parede do fundo: pedra azulada, lambris de madeira, pilastras, a janela grande e as menores, estantes."""
    c = Camada()
    n = ruido(101, 6)
    g = np.random.default_rng(102)
    for y in range(0, SA_CHAO):
        for x in range(W):
            fila = y // 5
            junta = y % 5 == 0 or ((x + fila * 6) % 13 == 0)
            v = n[y, x] + (g.random() - 0.5) * 0.15
            cor = "#3a3e5a" if junta else ("#5a5e7e" if v > 0.62 else "#4c5070" if v > 0.38 else "#42465f")
            c.p(x, y, cor)
    # cornija e teto escuro com vigas
    for y in range(0, 9):
        for x in range(W):
            c.p(x, y, "#1c1420" if y < 6 else "#6a5a4a" if y == 6 else "#3a2e2a")
    for x in range(0, W, 24):
        c.ret(x, 0, 5, 6, "#2e2226")
        c.ret(x, 5, 5, 1, "#4a3a32")
    # lambri de madeira embaixo
    for y in range(90, SA_CHAO):
        for x in range(W):
            painel = (x % 30) in (0, 1) or y in (91, SA_CHAO - 2)
            cor = MADEIRA[1] if painel else MADEIRA[2] if (x % 30) < 3 or y < 93 else MADEIRA[1] if y > SA_CHAO - 4 else "#4a2e1c"
            c.p(x, y, cor)
        c.ret(0, 89, W, 1, MADEIRA[4])
    # pilastras
    for (x0, larg) in ((178, 12), (292, 10), (380, 10), (466, 14)):
        c.ret(x0, 8, larg, SA_CHAO - 8, "#585c7a")
        c.ret(x0, 8, 2, SA_CHAO - 8, "#7a7e9c")
        c.ret(x0 + larg - 2, 8, 2, SA_CHAO - 8, "#363a54")
        for y in range(12, SA_CHAO - 4, 4):
            c.ret(x0 + 3, y, larg - 6, 1, "#4a4e6a")
        c.ret(x0 - 1, 8, larg + 2, 3, "#8a8eaa")
        c.ret(x0 - 1, SA_CHAO - 6, larg + 2, 6, "#4a4e6a")
    # janela grande: arco ogival, vitral de losangos com o céu da noite e a lua
    jx, jy, jw, jh = JANELA
    mascara = np.zeros((H, W), dtype=np.float32)
    cxj = jx + jw / 2
    for y in range(jy - 3, jy + jh + 3):
        for x in range(jx - 3, jx + jw + 3):
            dx = abs(x + 0.5 - cxj) / (jw / 2)
            v = (y - jy) / (jw / 2)
            topo_ok = v > 1 - math.sqrt(max(0, 1 - (dx * 0.98) ** 2)) * 1.0 if v < 1 else True
            dentro = dx < 1 and topo_ok and y < jy + jh
            moldura = dx < 1.12 and (y < jy + jh + 3) and (v > 1 - math.sqrt(max(0, 1 - (dx / 1.12) ** 2)) - 0.08 if v < 1 else True)
            if dentro:
                mascara[y, x] = 1
            elif moldura:
                c.p(x, y, "#8a8eaa" if x < cxj else "#4a4e6a")
    ceu = ruido(103, 20)
    for y in range(H):
        for x in range(W):
            if mascara[y, x] <= 0:
                continue
            t = (y - jy) / jh
            cor = misturar("#16224e", "#3a5a9a", t) + (ceu[y, x] - 0.5) * 0.12
            d = math.hypot(x - LUA[0], y - LUA[1])
            if d < 7:
                cor = hexa("#f4f6ff") if math.hypot(x - LUA[0] + 2, y - LUA[1] + 2) > 2 or d > 5 else hexa("#d4dcf4")
                if (x * 7 + y * 3) % 11 == 0 and d < 6:
                    cor = hexa("#c4cce8")
            elif d < 18:
                cor = cor + hexa("#5a7ac8") * (1 - d / 18) * 0.6
            elif g.random() < 0.007:
                cor = hexa("#e8eeff")
            # caixilhos: losangos de chumbo e montantes de pedra
            losango = ((x + y) % 7 == 0) or ((x - y) % 7 == 0)
            montante = abs(x - cxj) < 1 or abs(x - (jx + jw * 0.25)) < 0.6 or abs(x - (jx + jw * 0.75)) < 0.6
            travessa = y in (jy + 30, jy + 31, jy + 58, jy + 59)
            if montante or travessa:
                cor = hexa("#5a5e7a") if not travessa or y % 2 == 0 else hexa("#3a3e56")
                mascara[y, x] = 0
            elif losango:
                cor = cor * 0.55
                mascara[y, x] = 0.35
            c.c[y, x, :3] = cor
            c.c[y, x, 3] = 1
    # parapeito da janela
    c.ret(jx - 4, jy + jh, jw + 8, 2, "#9a9eba")
    c.ret(jx - 4, jy + jh + 2, jw + 8, 1, "#3a3e56")
    # janelinhas altas e estreitas dos lados (lua mais fraca)
    for (wx, wy, ww, wh) in ((206, 14, 14, 50), (420, 14, 16, 52)):
        for y in range(wy, wy + wh):
            for x in range(wx, wx + ww):
                dx = abs(x + 0.5 - (wx + ww / 2)) / (ww / 2)
                v = (y - wy) / (ww / 2)
                if v < 1 and v < 1 - math.sqrt(max(0, 1 - dx * dx)):
                    continue
                cor = misturar("#1a2654", "#34508c", (y - wy) / wh)
                if (x + y) % 5 == 0 or (x - y) % 5 == 0:
                    cor = cor * 0.55
                    mascara[y, x] = max(mascara[y, x], 0.3)
                else:
                    mascara[y, x] = 0.85
                c.c[y, x, :3] = cor
                c.c[y, x, 3] = 1
        c.ret(wx - 2, wy + wh, ww + 4, 2, "#8a8eaa")
    return c, mascara, []


def estante(c: Camada, x0: int, y0: int, w: int, h: int, prateleiras: int, seed: int, brilhos: list,
            claridade: float = 1.0) -> None:
    """Uma estante de troféus: moldura de madeira entalhada, fundo de veludo e prateleiras cheias, cada peça diferente."""
    g = np.random.default_rng(seed)
    # moldura e coroamento
    c.ret(x0 - 3, y0 - 5, w + 6, 5, MADEIRA[2])
    c.ret(x0 - 3, y0 - 5, w + 6, 1, MADEIRA[4])
    c.ret(x0 - 2, y0 - 3, w + 4, 1, METAIS["ouro"][2])
    for x in range(x0, x0 + w, 6):
        c.p(x + 2, y0 - 2, MADEIRA[0])
    c.ret(x0 - 3, y0, 3, h, MADEIRA[3])
    c.ret(x0 - 3, y0, 1, h, MADEIRA[4])
    c.ret(x0 + w, y0, 3, h, MADEIRA[1])
    c.ret(x0 - 4, y0 + h, w + 8, 4, MADEIRA[2])
    c.ret(x0 - 4, y0 + h, w + 8, 1, MADEIRA[4])
    # fundo de veludo vinho com pregas
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            prega = math.sin(x * 0.7 + math.sin(y * 0.05) * 2)
            c.p(x, y, "#5a1420" if prega > 0.5 else "#46101a" if prega > -0.4 else "#360c14")
    alt_p = h // prateleiras
    tipos = ["taca", "taca", "calice", "urna", "globo", "estatueta", "estatueta", "osso", "prato", "taca"]
    metais = ["ouro", "ouro", "prata", "bronze", "ouro", "prata"]
    fitas = [("#c8302a", "#f4f0e0"), ("#2c5aa8", "#f6d24a"), ("#2c8a4a", "#f6d24a"), ("#7a3a9a", "#f4f0e0"),
             ("#e8a020", "#2c5aa8")]
    for p in range(prateleiras):
        yb = y0 + (p + 1) * alt_p - 2
        # pendurados no fundo: medalhas, escudos e rosetas, no alto do vão
        x = x0 + 3 + int(g.random() * 4)
        while x < x0 + w - 6:
            r = g.random()
            if r < 0.35:
                medalha(c, x, yb - alt_p + 3, 4 + int(g.random() * 2), fitas[int(g.random() * len(fitas))],
                        metais[int(g.random() * len(metais))])
            elif r < 0.55:
                roseta(c, x, yb - alt_p + 5, fitas[int(g.random() * len(fitas))], 2.4)
            x += 10 + int(g.random() * 10)
        # a prateleira
        c.ret(x0, yb, w, 2, MADEIRA[3])
        c.ret(x0, yb, w, 1, MADEIRA[4])
        c.ret(x0, yb + 2, w, 1, "#1a0a0c")
        # troféus em pé
        x = x0 + 4 + g.random() * 3
        while x < x0 + w - 4:
            tipo = tipos[int(g.random() * len(tipos))]
            metal = metais[int(g.random() * len(metais))]
            hmax = alt_p - 6
            hh = int(hmax * (0.55 + g.random() * 0.45))
            if tipo == "osso":
                hh = min(hh, 8)
            larg = max(6, int(hh * (0.75 if tipo in ("taca", "osso", "prato") else 0.6)))
            if x + larg / 2 > x0 + w - 2:
                break
            if g.random() < 0.18 and hh > 9:
                escudo(c, x, yb - hh, max(7, int(hh * 0.7)), hh, (["#a82a24", "#1e3c8a", "#1e6a3a"][int(g.random() * 3)], "#e8dcc0"),
                       metal, EMBLEMAS[["cruz", "estrela", "osso"][int(g.random() * 3)]] if hh > 13 else None)
            else:
                trofeu(c, x, yb, hh, tipo, metal, g)
            if g.random() < 0.6:
                brilhos.append((x - hh * 0.12, yb - hh * 0.7, claridade * (0.6 + g.random() * 0.6)))
            x += larg + 2 + g.random() * 4


TAPETE_U = 3.0                # meia-largura do tapete, em casas do piso
PISO_K, PISO_F = 5.2, 150.0   # escala das casas e "distância focal" da perspectiva do piso


def piso_x(u: float, y: float) -> float:
    """Posição x na tela de um ponto do piso a `u` casas do eixo, na linha y."""
    return SA_FUGA[0] + u * (y - SA_FUGA[1]) / PISO_K


def chao_salao() -> tuple[Camada, np.ndarray]:
    """Mármore xadrez em perspectiva (amostrado 4 x 4 por pixel, sem serrilhado nas casas do fundo), com veios e
    juntas, a máscara do que reflete e o tapete vermelho com galão dourado até o pedestal."""
    c = Camada()
    fx, fy = SA_FUGA
    ss = 4
    ys, xs = np.mgrid[SA_CHAO * ss:H * ss, 0:W * ss].astype(np.float32)
    ys, xs = (ys + 0.5) / ss, (xs + 0.5) / ss
    prof = ys - fy
    u = (xs - fx) * PISO_K / prof
    v = PISO_K * PISO_F / prof
    casa = (np.floor(u) + np.floor(v)) % 2
    nv = np.asarray(Image.fromarray((ruido(111, 7) * 255).astype(np.uint8)).resize((W * ss, H * ss), Image.BILINEAR),
                    dtype=np.float32)[SA_CHAO * ss:] / 255
    veio = np.abs(np.sin(u * 2.3 + v * 1.1 + nv * 7)) < 0.07
    claro, escuro = hexa("#d6cec0"), hexa("#2c2e3e")
    cor = np.where(casa[..., None] > 0, claro, escuro)
    cor = np.where(veio[..., None], cor * 0.82 + hexa("#8a8494") * 0.18, cor)
    junta = ((u % 1) < 0.045) | ((v % 1) < 0.06)
    cor = np.where(junta[..., None], hexa("#6a6458"), cor)
    cor = cor.reshape(H - SA_CHAO, ss, W, ss, 3).mean((1, 3))
    c.c[SA_CHAO:, :, :3] = cor
    c.c[SA_CHAO:, :, 3] = 1
    reflete = np.zeros((H, W), dtype=np.float32)
    reflete[SA_CHAO:] = 1
    # tapete vermelho com galão dourado, em perspectiva até o pedestal
    px, py = PEDESTAL
    for y in range(py - 2, H):
        xa, xb = piso_x(-TAPETE_U, y + 0.5), piso_x(TAPETE_U, y + 0.5)
        meia = (xb - xa) / 2
        vv = PISO_K * PISO_F / (y + 0.5 - fy)
        for x in range(int(xa) - 1, int(xb) + 2):
            d = abs(x + 0.5 - fx) / meia
            if d > 1:
                continue
            reflete[y, x] = 0
            if d > 0.9:
                cor_t = METAIS["ouro"][3] if d < 0.95 else METAIS["ouro"][1]
            else:
                trama = ((x + y) % 3 == 0)
                cor_t = "#b0242e" if trama else "#921a26"
                if 0.8 < d < 0.85:
                    cor_t = "#e8b840"
                if (vv % 2) < 0.12 and d < 0.78:
                    cor_t = "#6a1018"
            c.p(x, y, cor_t)
        # sombra suave de cada lado do tapete (a borda grossa levanta do piso)
        c.p(int(xa) - 2, y, "#000000", 0.4)
        c.p(int(xb) + 2, y, "#000000", 0.25)
    return c, reflete


MARMORE_PED = ("#24242e", "#4a4a5c", "#7c7a8e", "#aeaabc", "#d6d2dc", "#f4f0f4")


def castical(c: Camada, cx: int, base: int, alt: int, luzes: list) -> None:
    """Castiçal de pé alto: tripé, haste com nós, três braços curvos e velas acesas."""
    ouro = METAIS["ouro"]
    for dx in range(-4, 5):
        c.p(cx + dx, base - 1 - (abs(dx) < 3), ouro[4] if dx < 0 else ouro[2])
    c.p(cx - 4, base, ouro[1])
    c.p(cx + 4, base, ouro[1])
    haste = [0.6] * alt
    for k in (4, alt // 2, alt - 4):
        haste[k] = 1.5
        haste[k + 1] = 1.1
    corpo_metal(c, cx, base - 2 - alt, haste, "ouro", reflexo=False, contorno=False)
    topo = base - 2 - alt
    for lado in (-1, 1):
        for i in range(7):
            a = i / 6 * math.pi / 2
            c.p(round(cx + lado * math.sin(a) * 6), round(topo - (1 - math.cos(a)) * 5 + 2), ouro[4] if lado < 0 else ouro[2])
    for dx, alt_v in ((-6, 3), (0, 5), (6, 3)):
        ytopo = topo - (5 if dx else 2) - alt_v + 2 if dx else topo - 3 - alt_v
        c.ret(cx + dx - 1, ytopo + alt_v, 3, 1, ouro[3])
        c.ret(cx + dx, ytopo, 1, alt_v, "#f4ecdc")
        c.p(cx + dx, ytopo, "#ffffff")
        chama(c, cx + dx, ytopo - 1, 1)
        luzes.append((cx + dx, ytopo - 3))


def pedestal_salao(brilhos: list, luzes_ped: list) -> Camada:
    """O pedestal de mármore canelado, com almofada de veludo e a grande taça de ouro; castiçais e os cordões de
    veludo nos postes dourados ao longo do tapete."""
    c = Camada()
    px, py = PEDESTAL
    mp = MARMORE_PED
    # degraus redondos (elipses vistas de cima)
    for (ry, rx, alt) in ((py, 22, 3), (py - 3, 17, 3)):
        for j in range(alt):
            for x in range(px - rx, px + rx + 1):
                t = (x - px) / rx
                c.p(x, ry - j, mp[4] if t < -0.5 else mp[3] if t < 0.1 else mp[2] if t < 0.6 else mp[1])
        for x in range(px - rx, px + rx + 1):
            t = (x - px) / rx
            yy = ry - alt - round(2 * math.sqrt(max(0, 1 - t * t)))
            for y in range(yy, ry - alt + 1):
                c.p(x, y, mp[5] if t < -0.2 else mp[4])
        c.ret(px - rx, ry, rx * 2 + 1, 1, mp[0])
    # fuste canelado
    topo_f = py - 32
    for y in range(topo_f, py - 7):
        for x in range(px - 8, px + 9):
            t = (x - px) / 8.5
            canel = (x - px) % 3 == 0
            k = 4 if t < -0.5 else 3 if t < 0.0 else 2 if t < 0.55 else 1
            if canel:
                k = max(0, k - 1)
            if y > py - 11:
                k = max(0, k - 1)
            c.p(x, y, mp[k])
    c.ret(px - 9, py - 8, 19, 1, mp[3])
    # capitel e tampo
    c.ret(px - 11, topo_f - 3, 23, 3, mp[3])
    c.ret(px - 11, topo_f - 3, 23, 1, mp[5])
    c.ret(px + 4, topo_f - 3, 8, 3, mp[2])
    c.ret(px - 13, topo_f - 6, 27, 3, mp[4])
    c.ret(px - 13, topo_f - 6, 27, 1, mp[5])
    c.ret(px + 6, topo_f - 6, 8, 3, mp[2])
    c.ret(px - 13, topo_f - 4, 27, 1, mp[1])
    c.ret(px - 9, topo_f, 19, 1, METAIS["ouro"][3])
    for x in range(px - 9, px + 10, 3):
        c.p(x, topo_f - 2, mp[1])
    # almofada de veludo com borlas
    for j, cor in enumerate(("#e85a5a", "#b8202a", "#8a1420")):
        c.ret(px - 10 + (j == 0), topo_f - 9 + j, 21 - 2 * (j == 0), 1, cor)
    for x in (px - 10, px + 10):
        c.p(x, topo_f - 6, METAIS["ouro"][4])
        c.p(x, topo_f - 5, METAIS["ouro"][2])
    # a grande taça: bojo largo, alças generosas, tampa e uma estrela no alto
    hc = 34
    larg = perfil(PERFIS["taca"], hc, 36)
    yt = topo_f - 9 - hc
    corpo_metal(c, px, yt, larg, "ouro")
    alcas(c, px, yt + 1, 18, larg[1], "ouro", 0.42)
    tampa = [1, 2, 3.5, 5, 6.5, 7.5, 8.5]
    corpo_metal(c, px, yt - len(tampa), tampa, "ouro")
    estrela(c, px, yt - len(tampa) - 4, 3.6, "ouro")
    # faixa gravada no bojo
    for x in range(round(px - larg[8]), round(px + larg[8]) + 1):
        c.p(x, yt + 8, METAIS["ouro"][2] if x > px else METAIS["ouro"][3])
    brilhos += [(px - 7, yt + 6, 2.0), (px - 1, yt - 12, 1.6), (px - 3, yt + 26, 1.0)]
    # castiçais de pé alto dos dois lados do tapete
    for cx in (px - 34, px + 34):
        castical(c, cx, py + 3, 28, luzes_ped)
    # cordões de veludo nos postes dourados ao longo do tapete (mais altos quanto mais perto)
    postes = []
    for lado in (-1, 1):
        for y in (py + 9, py + 21, py + 38):
            esc = (y - SA_FUGA[1]) / (py + 9 - SA_FUGA[1])
            postes.append((round(piso_x(lado * (TAPETE_U + 0.6), y)), y, esc))
    for (sx, sy, esc) in postes:
        alt = round(8 * esc)
        c.ret(sx - 1, sy - 1, 4, 1, METAIS["ouro"][2])
        c.ret(sx - 2, sy, 6, 1, METAIS["ouro"][1])
        c.ret(sx, sy - alt, 1, alt, METAIS["ouro"][5])
        c.ret(sx + 1, sy - alt, 1, alt, METAIS["ouro"][2])
        c.disco(sx + 0.5, sy - alt - 1, 1.2 * esc, (METAIS["ouro"][5], METAIS["ouro"][3], METAIS["ouro"][2]))
    for lado in (postes[:3], postes[3:]):
        for (a, b) in zip(lado, lado[1:]):
            n = int(math.hypot(b[0] - a[0], b[1] - a[1])) + 1
            for i in range(n + 1):
                t = i / n
                x = a[0] + (b[0] - a[0]) * t
                alt = 8 * (a[2] + (b[2] - a[2]) * t)
                y = a[1] + (b[1] - a[1]) * t - alt + 1 + 4 * a[2] * math.sin(t * math.pi)
                c.p(round(x), round(y), "#e03a44")
                c.p(round(x), round(y) + 1, "#8a1420")
    return c


def lustre(c: Camada, cx: int, y_corrente: int, larg: int, luzes: list, k: float = 1.0) -> None:
    """Lustre de ferro e ouro: corrente, aro com braços, velas e gotas de cristal."""
    for y in range(0, y_corrente):
        c.p(cx, y, "#5a4a3a" if y % 2 else "#8a7a5a")
    yb = y_corrente
    corpo_metal(c, cx, yb, [1, 2, 2.5, 2, 1.5, 1, 1.5, 0.6], "ouro", reflexo=False)
    meia = larg // 2
    for i in range(-meia, meia + 1):
        y = yb + 5 + round(2 * (1 - (i / meia) ** 2))
        c.p(cx + i, y, METAIS["ouro"][3] if i < 0 else METAIS["ouro"][2])
        c.p(cx + i, y + 1, METAIS["ouro"][1])
    for i in range(-meia, meia + 1, max(3, larg // 6)):
        y = yb + 5 + round(2 * (1 - (i / meia) ** 2))
        c.ret(cx + i, y - 3, 1, 3, "#f0e8d8")
        chama(c, cx + i, y - 4, 0)
        luzes.append((cx + i, y - 5, k))
        c.p(cx + i, y + 2, "#c8e0ff")
        c.p(cx + i, y + 3, "#ffffff", 0.7)


def estandartes_salao() -> Camada:
    c = Camada()
    estandarte(c, 290, 12, 13, 58, "vermelho", "coroa", fase=0.4, ponta="cauda", vento=0.2)
    estandarte(c, 378, 12, 13, 58, "azul", "osso", fase=1.6, ponta="cauda", vento=0.2)
    estandarte(c, 180, 14, 9, 40, "verde", "escudo", fase=2.2, ponta="ponta", vento=0.2)
    estandarte(c, 466, 14, 11, 44, "dourado", "estrela", fase=0.9, ponta="ponta", vento=0.2)
    return c


def montar_trofeus() -> Image.Image:
    parede, janela, _ = parede_salao()
    brilhos: list = []
    estantes = Camada()
    estante(estantes, 10, 20, 160, 66, 3, 201, brilhos, 0.5)
    estante(estantes, 230, 22, 56, 64, 3, 202, brilhos, 1.0)
    estante(estantes, 396, 22, 62, 64, 3, 203, brilhos, 1.0)
    bandeiras = estandartes_salao()
    luzes: list = []
    tetos = Camada()
    lustre(tetos, 256, 18, 26, luzes, 1.0)
    lustre(tetos, 430, 12, 22, luzes, 0.9)
    lustre(tetos, 96, 16, 22, luzes, 0.45)
    chao, reflete = chao_salao()
    luzes_ped: list = []
    ped = pedestal_salao(brilhos, luzes_ped)
    px, py = PEDESTAL

    fundo = parede.c.copy()
    for cam in (estantes, bandeiras):
        a = cam.c[:, :, 3:4]
        fundo[:, :, :3] = fundo[:, :, :3] * (1 - a) + cam.c[:, :, :3] * a
    fundo_a = desfocar_rgba(ampliar(fundo), 0.7)
    chao_a = ampliar(chao.c)
    ped_a = ampliar(ped.c)
    teto_a = desfocar_rgba(ampliar(tetos.c), 1.2)

    img = np.zeros((H * ESC, W * ESC, 3), dtype=np.float32)
    img = sobre(img, fundo_a)
    img = sobre(img, chao_a)

    xs, ys = GRADE_X / ESC, GRADE_Y / ESC
    # Luz: ambiente frio da noite, velas e lustres quentes, o pedestal sob um foco dourado.
    luz = np.ones_like(img) * hexa("#5a6aaa") * 0.42
    luz = luz * (0.7 + 0.3 * suave(40, 300, xs))[:, :, None]
    for (lx, ly, k) in luzes:
        luz += luz_pontual(lx, ly, 46, 0.8)[:, :, None] * hexa("#ffb060") * 0.55 * k
        luz += luz_pontual(lx, ly, 12, 1)[:, :, None] * hexa("#ffe0a0") * 0.6 * k
    for (lx, ly) in luzes_ped:
        luz += luz_pontual(lx, ly, 34, 0.9)[:, :, None] * hexa("#ffa850") * 0.22
        luz += luz_pontual(lx, ly, 8, 1)[:, :, None] * hexa("#ffe0a0") * 0.5
    # poça de luz quente na cabeceira do tapete
    luz += luz_pontual(px, py + 8, 44, 0.32)[:, :, None] * hexa("#ffb870") * 0.45
    luz += luz_pontual(px, py - 30, 44, 1.2)[:, :, None] * hexa("#ffd890") * 0.3
    janela_a = ampliar(janela[:, :, None])[:, :, 0]
    luz_img = luz * (1 - janela_a[:, :, None]) + janela_a[:, :, None] * 1.25
    img = img * luz_img

    # Mancha da janela projetada no chão pela lua (losangos e montantes inclusos), azulada.
    jx, jy, jw, jh = JANELA
    patch = np.zeros((H, W), dtype=np.float32)
    for y in range(SA_CHAO + 2, H):
        for x in range(W):
            wy = jy + jh - (y - (SA_CHAO + 2)) / (H - SA_CHAO - 2) * jh
            wx = x + (y - SA_CHAO) * 1.1 + 12
            if 0 <= int(wy) < H and 0 <= int(wx) < W:
                patch[y, x] = janela[int(wy), int(wx)] * (1 if 300 < wx < 380 else 0)
    patch = desfocar(ampliar(patch[:, :, None]), 2.5)[:, :, 0]
    img += img * patch[:, :, None] * hexa("#8ab0ff") * 1.6 + patch[:, :, None] * hexa("#4a6ab8") * 0.4

    # Reflexo no mármore polido (a parede espelhada na linha do chão), só fora do tapete.
    yc = SA_CHAO * ESC
    refl = np.zeros_like(img)
    for y in range(yc, H * ESC):
        ys_ = 2 * yc - y
        if ys_ >= 0:
            refl[y] = img[ys_]
    refl = desfocar(refl, 3)
    rm = ampliar(reflete[:, :, None])[:, :, 0]
    queda = np.clip(1 - (GRADE_Y - yc) / (60 * ESC), 0, 1)
    img += refl * (rm * queda * 0.32)[:, :, None]

    # Pedestal e castiçais por cima, com a mesma luz, e o reflexo deles.
    ped_luz = luz * 1.0 + luz_pontual(px, py - 50, 26, 1.2)[:, :, None] * hexa("#ffe8b0") * 0.45
    ped_rgb = ped_a[:, :, :3] * ped_luz
    yb = py * ESC + ESC
    refl_p = np.zeros_like(ped_a)
    for y in range(yb, H * ESC):
        ys_ = 2 * yb - y
        if 0 <= ys_ < H * ESC:
            refl_p[y, :, :3] = ped_rgb[ys_]
            refl_p[y, :, 3] = ped_a[ys_, :, 3]
    refl_p = desfocar_rgba(refl_p, 3)
    img += refl_p[:, :, :3] * (refl_p[:, :, 3] * rm * 0.3)[:, :, None]
    img = img * (1 - ped_a[:, :, 3:4]) + ped_rgb * ped_a[:, :, 3:4]
    # lustres
    teto_rgb = teto_a[:, :, :3] * (luz * 1.1 + 0.25)
    img = img * (1 - teto_a[:, :, 3:4]) + teto_rgb * teto_a[:, :, 3:4]

    # Fachos de luar entrando pela janela grande (desfoque direcional) e foco dourado no pedestal.
    vol = np.zeros(img.shape[:2], dtype=np.float32)
    jm = desfocar(janela_a[:, :, None], 2)[:, :, 0]
    for i in range(0, 60):
        dx, dy = -int(i * 1.1 * ESC * 0.6), int(i * ESC * 0.6)
        sh = np.roll(np.roll(jm, dy, 0), dx, 1)
        vol += sh * (1 - i / 60)
    vol = desfocar(vol[:, :, None], 8)[:, :, 0] / 60
    vol *= (GRADE_Y < (SA_CHAO + 40) * ESC)
    img += vol[:, :, None] * hexa("#7a9ae0") * 1.7
    foco = facho(px + 6, -4, px, py - 30, 6, 22) * np.clip(1.2 - ys / 130, 0, 1)
    foco = desfocar(foco[:, :, None], 5)[:, :, 0]
    img += foco[:, :, None] * hexa("#ffd890") * 0.32
    poeira(301, 500, (300, 0, 400, 120), "#fff0d0", img, foco * 2.0, 0.8)
    poeira(302, 500, (220, 20, 420, 150), "#c0d4ff", img, vol * 3.0, 0.7)

    # Cintilância dos metais: estrelinhas de 4 pontas nos reflexos (mais fortes onde há luz).
    for item in brilhos:
        bx, by, kb = item
        X, Y = int(bx * ESC + 1), int(by * ESC + 1)
        if not (8 < X < W * ESC - 8 and 8 < Y < H * ESC - 8):
            continue
        perto = float(luz[Y, X].mean())
        forca = kb * min(1.6, 0.35 + perto * 1.2)
        r = 4 + int(forca * 3)
        for d in range(-r, r + 1):
            k = (1 - abs(d) / (r + 1)) ** 2 * forca * 0.9
            img[Y + d, X] += k * hexa("#fff4d8")
            img[Y, X + d] += k * hexa("#fff4d8")

    return acabamento(img, "#ffd8a0", "#1a2a5a", esquerda=0.38, seed=92, bloom_lim=0.8, bloom_k=0.45, vinheta_y=0.5)


# ─────────────────────────────── Saída ───────────────────────────────
CENAS = {"arena": ("secao-arena", montar_arena), "trofeus": ("secao-trofeus", montar_trofeus)}


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    pedidas = sys.argv[1:] or list(CENAS)
    for chave in pedidas:
        nome, montar = CENAS[chave]
        img = montar()
        img.save(PASTA / f"{nome}.webp", quality=82, method=6)
        img.resize((960, 320), Image.LANCZOS).save(PASTA / f"{nome}-960.webp", quality=80, method=6)
        print(nome, (PASTA / f"{nome}.webp").stat().st_size // 1024, "KB,",
              (PASTA / f"{nome}-960.webp").stat().st_size // 1024, "KB (960)")


if __name__ == "__main__":
    main()
