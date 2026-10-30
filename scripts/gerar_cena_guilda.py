"""Cenários "HD-2D" do topo de duas páginas: o Salão da guilda (Liga da residência) e a Sala do conselho
(Administrador), em três horas do dia (30/10/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai das
funções abaixo, no mesmo jeito dos outros cenários (scripts/gerar_cena_arena.py, scripts/gerar_cena_vila.py): a cena é
pintada em pixel art (480 x 160), camada por camada, e depois montada em 3x com a luz calculada por pixel:
- a hora do dia entra pelas janelas: o céu muda (manhã azul e limpa, poente laranja, noite com lua e estrelas), a
  mancha de luz das janelas é projetada no chão (curta de manhã, comprida e laranja à tarde, fria e fraca à noite),
  com os feixes volumétricos e a poeira no ar;
- lareira, braseiros, velas e lustres: brasas de manhã, fogo médio à tarde, tudo aceso e brilhando (bloom) à noite;
- profundidade de campo (parede levemente desfocada, primeiro plano bem desfocado, a mesa nítida), correção de cor
  (altas luzes quentes, sombras frias), vinheta, grão e os ~42% da esquerda mais calmos e escuros (texto por cima).

Duas cenas:
1. guilda: o salão da guilda dos residentes. Mesa comprida de madeira com bancos, canecas, pão, um gesso esquecido e
   um martelo de reflexo; estandartes de vários "serviços" pendurados das vigas (cores e emblemas diferentes: osso,
   escudo, estrela, cruz, coroa); o quadro do placar na parede com uma fileira de pinos por serviço; a lareira de pedra
   com o brasão de fêmures cruzados; braseiros; lustre de roda; janelas altas com a hora do dia; à esquerda, na
   penumbra, a porta, o armeiro e um esqueleto de anatomia num suporte.
2. conselho: a sala do conselho (painel do dono). Mesa redonda com o grande mapa aberto (rotas, montanhas, rosa dos
   ventos e peões), o livro-razão com colunas de números, pena e tinteiro, velas, pilhas de moedas e um fêmur de
   peso de papel; o cofre de ferro rebitado com a balança na prateleira e a radiografia da mão emoldurada; as
   prateleiras de rolos de pergaminho à esquerda; o vitral que pinta o mapa com a cor da hora do dia.

O chão em x 330–380 (y 95–150) fica livre para o mascote nas duas.

Gera em public/pixel/paginas/: <lugar>-<periodo>.webp (1440 x 480) e <lugar>-<periodo>-960.webp (960 x 320), com
lugar em {guilda, conselho} e período em {manha, tarde, noite}.
Uso: python3 scripts/gerar_cena_guilda.py                    (tudo)
     python3 scripts/gerar_cena_guilda.py guilda             (as três horas da guilda)
     python3 scripts/gerar_cena_guilda.py conselho noite     (só uma)
"""
from __future__ import annotations

import math
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "paginas"
W, H, ESC = 480, 160, 3


# ─────────────────────────────── Pincéis básicos ───────────────────────────────
@lru_cache(maxsize=4096)
def _hexa(c: str) -> tuple[float, float, float]:
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def hexa(c) -> np.ndarray:
    if not isinstance(c, str):
        return np.asarray(c, dtype=np.float32)
    return np.array(_hexa(c), dtype=np.float32)


def misturar(a, b, t: float) -> np.ndarray:
    return hexa(a) * (1 - t) + hexa(b) * t


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples."""

    def __init__(self) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            rgb = hexa(cor)
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
        rgb = hexa(cor)
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
        """Disco com sombreamento em 3 tons, iluminado da direção `luz`."""
        lx, ly = luz
        for y in range(int(cy - r * achatar) - 1, int(cy + r * achatar) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                dx, dy = x + 0.5 - cx, (y + 0.5 - cy) / max(achatar, 0.05)
                d = math.hypot(dx, dy)
                if d <= r:
                    k = (dx * lx + dy * ly) / max(r, 1) + (((x * 73856093) ^ (y * 19349663)) % 997 / 997 - 0.5) * 0.3
                    cor = cores[0] if k > 0.38 else cores[1] if k > -0.2 else cores[2]
                    self.p(x, y, cor, a)

    def elipse(self, cx, cy, rx, ry, cor, a: float = 1.0) -> None:
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    self.p(x, y, cor, a)

    def bitmap(self, x0, y0, linhas: list[str], cores: dict, a: float = 1.0) -> None:
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
    """Ruído esticado (ex na horizontal, ey na vertical): veios de madeira, nuvens em faixa."""
    g = np.random.default_rng(seed)
    pequeno = g.random((H // ey + 2, W // ex + 2)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize(((W // ex + 2) * ex, (H // ey + 2) * ey), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32)[:H, :W] / 255


def suave(a: float, b: float, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ─────────────────────────────── Materiais ───────────────────────────────
METAIS = {
    "ouro": ("#2a1606", "#5e3a0a", "#9c6614", "#d29c26", "#f4ca4c", "#ffe98e", "#fffbe6"),
    "prata": ("#1a1e26", "#444c5a", "#76808e", "#a8b2c0", "#d2dae4", "#eef2f8", "#ffffff"),
    "bronze": ("#200f08", "#4c2612", "#80441e", "#b26834", "#d89254", "#f2bf8a", "#fff0dc"),
    "ferro": ("#0c0e12", "#1c2026", "#2e343c", "#454c56", "#626a76", "#8a929e", "#c4ccd6"),
    "estanho": ("#1a1c20", "#3a3e46", "#5e636c", "#868b94", "#aeb2ba", "#d2d6dc", "#f4f6f8"),
}
MADEIRA = ("#1a0f08", "#331f12", "#4e321c", "#6e4826", "#94643a", "#b8844e")
CARVALHO = ("#140c08", "#2a1a10", "#3e2818", "#563a22", "#74502e", "#94683c")
PERGAMINHO = ("#5a4026", "#8a6a42", "#b89a68", "#d8be8a", "#efdcae", "#fbf0d2")

NV_MADEIRA = ruido_ret(901, 22, 1)
NV_MADEIRA2 = ruido_ret(902, 7, 1)
NV_GRAO = np.random.default_rng(903).random((H, W)).astype(np.float32)


def madeira(c: Camada, x0, y0, w, h, tons=MADEIRA, vertical: bool = False, tabua: int = 0, base: int = 2,
            nos: int = 0, seed: int = 0) -> None:
    """Retângulo de madeira com veios (claros e escuros em faixas), juntas de tábua e alguns nós."""
    g = np.random.default_rng(seed + 77)
    for y in range(max(0, int(y0)), min(H, int(y0 + h))):
        for x in range(max(0, int(x0)), min(W, int(x0 + w))):
            if vertical:
                v = NV_MADEIRA[(x * 7 + 11) % H, (y // 1 + x * 13) % W] * 0.6 + NV_MADEIRA2[(x * 5) % H, y % W] * 0.4
            else:
                v = NV_MADEIRA[(y * 7 + seed) % H, (x + seed * 3) % W] * 0.6 + NV_MADEIRA2[(y * 5 + seed) % H, x % W] * 0.4
            v += (NV_GRAO[y, x] - 0.5) * 0.12
            k = base + (1 if v > 0.64 else 0) - (1 if v < 0.34 else 0)
            if tabua:
                pos = (x - x0) if vertical else (y - y0)
                if pos % tabua == 0 and pos > 0:
                    k = 0
                elif pos % tabua == 1:
                    k = min(len(tons) - 1, k + 1)
            c.p(x, y, tons[max(0, min(len(tons) - 1, k))])
    for _ in range(nos):
        nx, ny = x0 + 2 + g.random() * max(1, w - 4), y0 + 1 + g.random() * max(1, h - 2)
        c.p(nx, ny, tons[0])
        c.p(nx + 1, ny, tons[max(0, base - 1)])


def pedra(c: Camada, x0, y0, x1, y1, tons, seed: int, bw: int = 12, bh: int = 6, musgo: float = 0.0,
          luz_topo: bool = True) -> None:
    """Parede de blocos de pedra em amarração: cada bloco com o seu tom, aresta de cima clara, de baixo escura,
    argamassa recuada, lascas e salpicos. `tons`: (argamassa, escuro, médio1, médio2, claro, realce)."""
    g = np.random.default_rng(seed)
    n = ruido(seed + 1, 5)
    tom_bloco: dict = {}
    # cada fiada tem os seus blocos de largura variada (amarração irregular de pedra aparelhada)
    bordas: dict = {}
    for fila in range((y1 - y0) // bh + 2):
        xs_b, x = [], x0 - int(g.random() * bw)
        while x < x1 + bw:
            xs_b.append(x)
            x += max(4, int(bw * (0.6 + g.random() * 0.8)))
        bordas[fila] = np.array(xs_b)
    for y in range(max(0, y0), min(H, y1)):
        fila = (y - y0) // bh
        jy = (y - y0) % bh
        bb = bordas[fila]
        for x in range(max(0, x0), min(W, x1)):
            col = int(np.searchsorted(bb, x, side="right")) - 1
            jx = x - bb[col]
            larg_b = bb[col + 1] - bb[col] if col + 1 < len(bb) else bw
            chave = (fila, col)
            if chave not in tom_bloco:
                tom_bloco[chave] = (g.random(), g.random(), g.random())
            t0, t1, t2 = tom_bloco[chave]
            if jy == 0 or jx == 0 or (jy == 1 and jx == 1 and t2 > 0.6):
                cor = tons[0]
            elif luz_topo and jy == 1:
                cor = tons[4] if t1 > 0.25 else tons[3]
            elif jy == bh - 1 or jx == larg_b - 1:
                cor = tons[1]
            else:
                v = n[y, x] + (NV_GRAO[y, x] - 0.5) * 0.35 + (t0 - 0.5) * 0.5
                cor = tons[3] if v > 0.72 else tons[2] if v > 0.3 else tons[1]
                if jx == 1 and t2 > 0.5:
                    cor = tons[3]
                if NV_GRAO[y, x] > 0.985:
                    cor = tons[5]
                if musgo and n[y, x] * (1 - (y - y0) / max(1, y1 - y0)) < musgo * 0.2 and NV_GRAO[y, x] > 0.6:
                    cor = "#3a4a2a"
            c.p(x, y, cor)


# ─────────────────────────────── Céu das janelas (a hora do dia) ───────────────────────────────
PERIODOS = {
    "manha": dict(
        ceu=("#3a74cc", "#78b0e8", "#cfe6fa"), astro="sol", astro_cor="#fffbe8", nuvem=("#ffffff", "#c4d4ea"),
        morro=("#7a9ab8", "#5a7a9a"), amb="#bccae4", amb_k=0.72, sol="#fff0cc", sol_k=2.0,
        proj=(0.62, -0.42), feixe="#fff0d0", feixe_k=1.35, fogo=0.32, velas=0, quente="#ffe6b8", fria="#26385e",
        bloom_lim=0.9, bloom_k=0.32, exposicao=1.0, estrelas=False),
    "tarde": dict(
        ceu=("#3e3a84", "#e0705a", "#ffc070"), astro="sol", astro_cor="#ffe2a0", nuvem=("#ffd090", "#a85a7a"),
        morro=("#6a3a5a", "#4a2a4a"), amb="#d89a72", amb_k=0.78, sol="#ffa04a", sol_k=1.7,
        proj=(0.95, -0.95), feixe="#ff9a48", feixe_k=1.3, fogo=0.62, velas=1, quente="#ffc890", fria="#3a2a5a",
        bloom_lim=0.86, bloom_k=0.4, exposicao=1.0, estrelas=False),
    "noite": dict(
        ceu=("#060a1e", "#14204a", "#2a3a72"), astro="lua", astro_cor="#eef2ff", nuvem=("#3a4a7a", "#1a2448"),
        morro=("#0c1228", "#080c1c"), amb="#5a6aaa", amb_k=0.5, sol="#8aaaf0", sol_k=0.55,
        proj=(0.55, 0.32), feixe="#7a9ae0", feixe_k=0.55, fogo=1.0, velas=2, quente="#ffd49a", fria="#101c4a",
        bloom_lim=0.78, bloom_k=0.5, exposicao=1.0, estrelas=True),
}


def cor_ceu(per: dict, x: float, y: float, astro: tuple[float, float], nuv: np.ndarray, g) -> np.ndarray:
    """Cor do céu num ponto (coordenadas da cena inteira, para as janelas mostrarem o mesmo céu)."""
    a, b, c = (hexa(k) for k in per["ceu"])
    t = min(1.0, max(0.0, y / 92))
    cor = a * (1 - t) ** 2 + b * 2 * t * (1 - t) + c * t * t
    d = math.hypot(x - astro[0], (y - astro[1]) * 1.1)
    if per["astro"] == "sol":
        r = 6 if per is PERIODOS["manha"] else 9
        cor = cor + hexa(per["astro_cor"]) * max(0.0, 1 - d / 70) ** 2 * 0.9
        if d < r:
            cor = hexa(per["astro_cor"]) * (1.7 if d < r - 1.5 else 1.3)
    else:
        if d < 6:
            cor = hexa("#f4f6ff") * 1.25
            if math.hypot(x - astro[0] + 2.2, y - astro[1] + 1.5) < 4.6:
                cor = hexa("#ccd6f0")
            if (int(x) * 7 + int(y) * 3) % 9 == 0:
                cor = cor * 0.88
        else:
            cor = cor + hexa("#4a6ac8") * max(0.0, 1 - d / 30) * 0.5
    # nuvens em faixas
    v = nuv[int(y) % H, int(x) % W] - 0.56 - abs(y - 36) / 90
    if v > 0 and d > 7:
        k = min(1.0, v * 7) * 0.8
        acesa = nuv[min(H - 1, int(y) + 1), int(x) % W] < nuv[int(y) % H, int(x) % W]
        nc = hexa(per["nuvem"][0] if acesa else per["nuvem"][1])
        cor = cor * (1 - k) + nc * k
    elif per["estrelas"] and d > 8 and g.random() < 0.012:
        cor = hexa("#e8eeff") * (0.8 + g.random() * 0.6)
    return cor


def cor_morro(per: dict, x: float, y: float) -> np.ndarray | None:
    """Silhueta distante (morros e um torreão) vista no pé das janelas; None se é céu."""
    alt1 = 66 + 5 * math.sin(x * 0.045) + 3 * math.sin(x * 0.13 + 1)
    alt2 = 72 + 3 * math.sin(x * 0.07 + 2) + 2 * math.sin(x * 0.21)
    if 300 < x < 306 and y > 56:
        alt1 = 56
    if y > alt2:
        return hexa(per["morro"][1])
    if y > alt1:
        return hexa(per["morro"][0])
    return None


def janela(c: Camada, vidro: np.ndarray, per: dict, x0: int, y0: int, w: int, h: int, astro, seed: int,
           pedra_t=("#2a2622", "#4e4640", "#6a6058", "#8a8076", "#aaa092"), grade: int = 4, ogiva: bool = False) -> None:
    """Janela alta em arco (pleno ou ogival): moldura de pedra em aduelas, céu da hora do dia com morros ao longe,
    montante e travessa de pedra, vidraças pequenas em chumbo e o peitoril. Marca `vidro` (luz que entra)."""
    g = np.random.default_rng(seed)
    nuv = ruido_ret(seed + 5, 34, 3) * 0.7 + ruido_ret(seed + 6, 10, 2) * 0.3
    cx = x0 + w / 2
    r = w / 2

    def dentro(x, y, folga=0.0):
        rx = r + folga
        if y >= y0 + r:
            return abs(x + 0.5 - cx) <= rx and y < y0 + h + folga
        dy = y0 + r - (y + 0.5)
        if ogiva:
            # dois arcos cruzados (ogiva)
            d1 = math.hypot(x + 0.5 - (cx - rx * 0.45), dy)
            d2 = math.hypot(x + 0.5 - (cx + rx * 0.45), dy)
            return abs(x + 0.5 - cx) <= rx and d1 <= rx * 1.45 and d2 <= rx * 1.45
        return math.hypot(x + 0.5 - cx, dy) <= rx

    # moldura em aduelas (pedras do arco) e ombreiras
    for y in range(y0 - 5, y0 + h + 2):
        for x in range(int(cx - r - 5), int(cx + r + 6)):
            if dentro(x, y, 4) and not dentro(x, y, 0):
                ang = math.atan2((y0 + r) - y, x - cx)
                if y < y0 + r:
                    aduela = int((ang + math.pi) * 7) % 2
                else:
                    aduela = ((y - y0) // 5) % 2
                lado = x < cx
                k = 3 if lado else 1
                k += aduela
                if not dentro(x, y, 1):
                    pass
                else:
                    k = 0 if not lado else 4  # o recuo do vão: claro à esquerda, sombra à direita
                c.p(x, y, pedra_t[max(0, min(4, k))])
    for y in range(y0, y0 + h):
        for x in range(int(cx - r), int(cx + r) + 1):
            if not dentro(x, y):
                continue
            cor = cor_morro(per, x, y)
            if cor is None:
                cor = cor_ceu(per, x, y, astro, nuv, g)
            vid = 1.0
            # caixilhos: montante central, travessas de pedra, vidraças de chumbo
            mont = abs(x + 0.5 - cx) < 1.0
            trav = (y - y0 - int(r)) % 22 == 0 and y > y0 + r
            chumbo = ((x - int(cx)) % grade == 0) or ((y - y0) % (grade + 1) == 0)
            if mont or trav:
                cor = hexa(pedra_t[3] if x < cx else pedra_t[1])
                vid = 0
            elif chumbo:
                cor = cor * 0.42
                vid = 0.25
            else:
                # vidro antigo: leve ondulação e um reflexo na diagonal
                if (x + y * 2) % 13 == 0:
                    cor = cor * 1.08
            c.c[y, x, :3] = cor
            c.c[y, x, 3] = 1
            vidro[y, x] = max(vidro[y, x], vid)
    # peitoril
    c.ret(int(cx - r - 4), y0 + h, int(w + 9), 2, pedra_t[4])
    c.ret(int(cx - r - 4), y0 + h + 2, int(w + 9), 1, pedra_t[0])


# ─────────────────────────────── Fogo, velas, metal ───────────────────────────────
def chama(c: Camada, x: int, y: int, tam: int = 1) -> None:
    """Chama de vela/tocha em pixel art (a luz vem depois)."""
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


def vela(c: Camada, fogo: Camada, x: int, ybase: int, alt: int, acesa: bool, luzes: list, k: float = 1.0,
         raio: float = 26, cor_cera: str = "#efe4cc", grossa: bool = False) -> None:
    """Vela de cera com escorrido; acesa, ganha a chama (camada de fogo) e entra na lista de luzes."""
    c.ret(x, ybase - alt, 1, alt, cor_cera)
    if grossa:
        c.ret(x + 1, ybase - alt + 1, 1, alt - 1, "#cfc2a6")
    c.p(x, ybase - alt, "#fffaf0")
    if alt > 3:
        c.p(x + 1, ybase - alt + 1, "#d8ccb0")
        c.p(x - 1, ybase - alt + 2, "#e8dcc4", 0.7)
    c.p(x, ybase - alt - 1, "#2a1a10")
    if acesa:
        chama(fogo, x, ybase - alt - 1, 0)
        luzes.append((x, ybase - alt - 2, raio, "#ffb45a", 0.5 * k))


def castical(c: Camada, fogo: Camada, x: int, ybase: int, alt: int, acesa: bool, luzes: list, metal: str = "ouro",
             k: float = 1.0) -> None:
    """Castiçal baixo de metal (prato, haste com nó) e a vela."""
    m = METAIS[metal]
    c.ret(x - 2, ybase - 1, 5, 1, m[2])
    c.ret(x - 2, ybase - 1, 2, 1, m[4])
    c.p(x - 3, ybase - 1, m[1])
    c.p(x + 3, ybase - 1, m[1])
    c.ret(x, ybase - 4, 1, 3, m[3])
    c.p(x, ybase - 3, m[5])
    c.ret(x - 1, ybase - 5, 3, 1, m[4])
    vela(c, fogo, x, ybase - 5, alt, acesa, luzes, k)


def corpo_metal(c: Camada, cx: float, ytop: int, larguras: list[float], metal: str) -> None:
    """Sólido de revolução (caneca, taça, tinteiro) com faixa clara à esquerda e reflexo fino."""
    pal = METAIS[metal]
    for i, w in enumerate(larguras):
        if w <= 0:
            continue
        y = ytop + i
        x0, x1 = int(math.floor(cx - w + 0.5)), int(math.floor(cx + w + 0.5))
        for x in range(x0, x1 + 1):
            t = (x + 0.5 - cx) / max(w + 0.5, 0.6)
            k = 2 if t > 0.5 else 3 if t > 0.1 else 5 if -0.5 < t < -0.2 else 4
            if t > 0.8:
                k = 1
            c.p(x, y, pal[k])


# ─────────────────────────────── Estandartes ───────────────────────────────
EMBLEMAS = {
    "osso": [".##.....##.", "###.....###", "..#######..", "###.....###", ".##.....##."],
    "cruz": ["..###..", "..###..", "#######", "#######", "#######", "..###..", "..###.."],
    "escudo": ["#######", "#ooooo#", "#o###o#", "#o###o#", ".#o#o#.", "..#o#..", "...#..."],
    "estrela": ["...#...", "..###..", "#######", ".#####.", "..###..", ".##.##.", "#.....#"],
    "coroa": ["#..#..#", "##.#.##", "#######", "#o#o#o#", "#######"],
    "martelo": ["#####..", "#####..", "..#....", "..#....", "..#....", "..#....", "..##..."],
    "coluna": ["..#..", ".###.", "..#..", ".###.", "..#..", ".###.", "..#..", ".###.", "..#.."],
}
PANOS = {
    "vermelho": ("#e0503c", "#b8302a", "#7e1a1c", "#4a0e12"),
    "azul": ("#4a7ad0", "#2c54a8", "#1c3474", "#0e1a40"),
    "dourado": ("#f6cc58", "#d8a032", "#a0701e", "#5a3a10"),
    "verde": ("#4ab06a", "#2c8648", "#1a5a32", "#0c3018"),
    "roxo": ("#9a62c8", "#7040a0", "#482870", "#24123c"),
    "branco": ("#f4eee0", "#d4cab4", "#a49a84", "#5a5246"),
    "laranja": ("#f4924a", "#d0682c", "#94401a", "#52200c"),
}


def estandarte(c: Camada, x0: int, y0: int, w: int, h: int, pano: str, emblema: str, fase: float = 0.0,
               ponta: str = "cauda", vento: float = 0.25, corda_ate: int | None = None) -> None:
    """Estandarte pendurado numa vara: dobras sombreadas, galão dourado, emblema, ponta recortada e franja;
    `corda_ate`: y da viga de onde descem as duas correntinhas que seguram a vara."""
    tons = PANOS[pano]
    ouro = METAIS["ouro"]
    corte = max(3, w // 2)
    for j in range(h):
        v = j / h
        dx = round(math.sin(v * 2.4 + fase) * vento * v * 1.6)
        for i in range(w):
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
            # trama do tecido: um pixel mais escuro de vez em quando
            if (i * 3 + j * 5) % 11 == 0 and k < 2:
                cor = tons[k + 1]
            c.p(x0 + i + dx, y0 + j, cor)
    if ponta == "reta":
        for i in range(0, w, 2):
            dx = round(math.sin(2.4 + fase) * vento * 1.6)
            c.p(x0 + i + dx, y0 + h, ouro[4])
            c.p(x0 + i + dx, y0 + h + 1, ouro[2])
    em = EMBLEMAS[emblema]
    ew, eh = len(em[0]), len(em)
    ey = y0 + max(6, int(h * 0.36) - eh // 2)
    dxe = round(math.sin((ey - y0) / h * 2.4 + fase) * vento * (ey - y0) / h * 1.6)
    claro = "#fff4d0" if pano not in ("dourado", "branco") else "#4a2a10"
    c.bitmap(x0 + (w - ew) // 2 + dxe, ey + 1, em, {"#": tons[3]}, 0.5)
    c.bitmap(x0 + (w - ew) // 2 + dxe, ey, em, {"#": claro, "o": tons[1]})
    c.ret(x0 - 2, y0 - 1, w + 4, 1, MADEIRA[2])
    c.ret(x0 - 2, y0 - 2, w + 4, 1, MADEIRA[4])
    for ex in (x0 - 3, x0 + w + 2):
        c.p(ex, y0 - 2, ouro[5])
        c.p(ex, y0 - 1, ouro[3])
    if corda_ate is not None:
        for ex in (x0 - 1, x0 + w):
            for y in range(corda_ate, y0 - 2):
                c.p(ex, y, "#6a5a48" if y % 2 else "#3a2e26")
    else:
        c.linha(x0 - 1, y0 - 2, x0 + w // 2, y0 - 5, ouro[3])
        c.linha(x0 + w, y0 - 2, x0 + w // 2, y0 - 5, ouro[2])


# ─────────────────────────────── Montagem com luz (comum) ───────────────────────────────
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


def luz_faixas(cx: float, cy: float, raio: float, achatar: float = 1.0, faixas: int = 5) -> np.ndarray:
    """Luz pontual com a borda em degraus (o halo em faixas dos jogos de pixel art), suavizado de leve."""
    l = luz_pontual(cx, cy, raio, achatar)
    q = np.floor(l * faixas + 0.5) / faixas
    return q * 0.3 + l * 0.7


def projetar(vidro_cor: np.ndarray, chao_y: int, a: float, b: float, y_min: int | None = None) -> np.ndarray:
    """Mancha das janelas no chão: para cada ponto do chão, a altura na parede de onde vem o raio
    (hgt = (y - chao)/a) e o deslocamento lateral (b por unidade de altura). Em pixels da arte."""
    out = np.zeros((H, W, 3), dtype=np.float32)
    for y in range(chao_y + 1, H):
        hgt = (y - chao_y) / a
        yw = chao_y - hgt
        if yw < 0:
            continue
        xs = np.arange(W, dtype=np.float32) - hgt * b
        ok = (xs >= 0) & (xs < W - 1)
        xi = np.clip(xs.astype(np.int32), 0, W - 1)
        out[y] = vidro_cor[int(yw), xi] * ok[:, None]
    return out


def feixes(vidro: np.ndarray, direcao: tuple[float, float], comprimento: float, chao_y: int) -> np.ndarray:
    """Feixes volumétricos: a máscara das janelas arrastada na direção da luz (em 3x), com queda suave."""
    va = desfocar(ampliar(vidro[:, :, None]), 1.5)[:, :, 0]
    dx, dy = direcao
    n = math.hypot(dx, dy)
    dx, dy = dx / n, dy / n
    vol = np.zeros_like(va)
    passos = 70
    for i in range(passos):
        d = i / passos * comprimento * ESC
        sx, sy = int(round(dx * d)), int(round(dy * d))
        sh = np.roll(np.roll(va, sy, 0), sx, 1)
        if sy > 0:
            sh[:sy] = 0
        if sx > 0:
            sh[:, :sx] = 0
        elif sx < 0:
            sh[:, sx:] = 0
        t = i / passos
        vol += sh * (min(1.0, t * 6) * (1 - t) ** 1.2)
    vol = desfocar(vol[:, :, None], 6)[:, :, 0] / passos
    vol *= np.clip(1 - (GRADE_Y / ESC - chao_y) / 40, 0, 1)
    return vol


def poeira(seed: int, n: int, regiao, cor: str, img: np.ndarray, peso: np.ndarray, forca: float = 1.0) -> None:
    """Partículas de poeira no ar: só aparecem onde há luz (`peso`)."""
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


def acabamento(img: np.ndarray, per: dict, esquerda: float, seed: int, vinheta_y: float = 0.52) -> Image.Image:
    """Bloom, mapeamento de tom suave, correção de cor (luz quente, sombra fria), área calma à esquerda, vinheta e grão."""
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - per["bloom_lim"]) * 6, 0, 1), 0, 2.0)
    img = img + desfocar(claro, 12) * per["bloom_k"] + desfocar(claro, 36) * per["bloom_k"] * 0.6
    # curva de tom: comprime o que passa de ~0.85 sem estourar
    img = np.where(img > 0.8, 0.8 + (1 - np.exp(-(img - 0.8) * 2.2)) * 0.3, img)
    q, f = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (f * 0.5 + 0.5)))
    img = np.clip((img - 0.46) * 1.08 + 0.46, 0, 1.3)
    xs, ys = GRADE_X / (W * ESC), GRADE_Y / (H * ESC)
    calma = 1 - esquerda * (1 - suave(0.06, 0.46, xs))
    lum = img.mean(2, keepdims=True)
    img = (img * 0.8 + lum * 0.2 * (1 - calma[:, :, None]) + img * 0.2 * calma[:, :, None]) * calma[:, :, None]
    v = (xs - 0.6) ** 2 * 1.15 + (ys - vinheta_y) ** 2 * 1.7
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.1)[:, :, None]
    g = np.random.default_rng(seed)
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.018
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def compor(per: dict, fundo: Camada, meio: Camada, frente: Camada, fogo: Camada, sombras: Camada,
           vidro: np.ndarray, vidro_cor: np.ndarray, luzes: list, chao_y: int, ocluir: Camada,
           extra_luz=None, desf_fundo: float = 0.8, desf_frente: float = 3.0, feixe_colorido: bool = False,
           comp_feixe: float = 110, desf_patch: float = 1.6, patch_meio: np.ndarray | None = None,
           k_feixe: float = 1.0, k_patch_meio: float = 0.9, proj: tuple[float, float] | None = None) -> np.ndarray:
    """Montagem comum em 3x: albedo das camadas x luz (ambiente + janelas + luzes pontuais), mancha das janelas no
    chão com as sombras dos objetos, vidro e fogo emissivos, feixes com poeira. Devolve a imagem em float."""
    a_proj, b_proj = proj or per["proj"]
    fundo_a = desfocar_rgba(ampliar(fundo.c), desf_fundo)
    meio_a = ampliar(meio.c)
    frente_a = desfocar_rgba(ampliar(frente.c), desf_frente)
    sombra_a = desfocar_rgba(ampliar(sombras.c), 2.0)

    alb = np.zeros((H * ESC, W * ESC, 3), dtype=np.float32)
    alb = sobre(alb, fundo_a)
    alb = alb * (1 - sombra_a[:, :, 3:4] * 1.0)
    alb = sobre(alb, meio_a)

    # luz ambiente (mais forte perto das janelas de dia: a luz do céu bate na parede e volta)
    luz = np.ones_like(alb) * hexa(per["amb"]) * per["amb_k"]
    va = vidro.copy()
    vsum = va.sum()
    if vsum > 0:
        ys_, xs_ = np.nonzero(va > 0.5)
        for (cx, cy) in {(int(x) // 30 * 30 + 15, int(np.mean(ys_))) for x in xs_[:: max(1, len(xs_) // 40)]}:
            luz += luz_pontual(cx, cy, 80, 0.9)[:, :, None] * hexa(per["sol"]) * per["sol_k"] * 0.06
    # a mancha das janelas no chão, cortada pela sombra dos objetos (projetada para o lado de cá)
    patch = projetar(vidro_cor, chao_y, a_proj, b_proj)
    occ = ocluir.c[:, :, 3].copy()
    somb = np.zeros_like(occ)
    for i in range(1, 26):
        sx = int(round(b_proj * i * 0.8))
        sy = int(round(a_proj * i * 0.8))
        sh = np.roll(np.roll(occ, sy, 0), sx, 1)
        somb = np.maximum(somb, sh * (1 - i / 30))
    patch_chao = patch * (1 - np.clip(somb, 0, 1)[:, :, None] * 0.85)
    pm = meio.c[:, :, 3:4] > 0.5 if patch_meio is None else patch_meio[:, :, None] > 0.5
    patch = np.where(pm, patch * k_patch_meio, np.where(meio.c[:, :, 3:4] > 0.5, patch * 0.15, patch_chao))
    patch_a = desfocar(ampliar(patch), desf_patch)
    luz += patch_a * hexa(per["sol"]) * per["sol_k"] * 1.4
    for (lx, ly, r, cor, k) in luzes:
        luz += luz_faixas(lx, ly, r, 0.85)[:, :, None] * hexa(cor) * k * 1.6
        luz += luz_pontual(lx, ly, r * 0.3, 1)[:, :, None] * hexa("#ffe8b0") * k * 0.9
    if extra_luz is not None:
        luz += extra_luz
    img = alb * luz

    # vidro: o céu aparece como emissivo
    vm = desfocar(ampliar(np.clip(vidro, 0, 1)[:, :, None]), 0.6)
    vc = ampliar(fundo.c[:, :, :3])
    img = img * (1 - vm) + vc * vm * 1.15 + img * vm * 0.0
    # objetos do meio continuam por cima do vidro (o que estiver na frente da janela)
    meio_alpha = meio_a[:, :, 3:4]
    img = img * (1 - meio_alpha) + (meio_a[:, :, :3] * luz) * meio_alpha

    # fogo e chamas (emissivos, um pouco desfocados para o halo)
    fogo_a = ampliar(fogo.c)
    img = img * (1 - fogo_a[:, :, 3:4]) + fogo_a[:, :, :3] * 1.35 * fogo_a[:, :, 3:4]
    halo = desfocar(fogo_a[:, :, :3] * fogo_a[:, :, 3:4], 4)
    img += halo * 0.5

    # feixes de luz das janelas
    direcao = (b_proj, 1 + a_proj)
    vol = feixes(vidro, direcao, comp_feixe, chao_y)
    if feixe_colorido:
        # o vitral tinge os feixes: cada canal arrastado separadamente, normalizado pela máscara
        vc_n = vidro_cor / max(1e-3, float(vidro_cor.max()))
        vol_rgb = np.stack([feixes(vc_n[:, :, k], direcao, comp_feixe, chao_y) for k in range(3)], axis=2)
        img += (vol_rgb * 0.8 + vol[:, :, None] * 0.2) * hexa(per["feixe"]) * per["feixe_k"] * 2.6 * k_feixe
    else:
        img += vol[:, :, None] * hexa(per["feixe"]) * per["feixe_k"] * 2.4
    poeira(int(chao_y * 7 + a_proj * 100), 900, (0, 0, W, chao_y + 30), per["feixe"], img, vol * 3.2, 0.7)

    # primeiro plano desfocado, iluminado pela mesma luz
    fr_rgb = frente_a[:, :, :3] * (luz * 0.85)
    img = img * (1 - frente_a[:, :, 3:4]) + fr_rgb * frente_a[:, :, 3:4]
    return img


# ─────────────────────────────── Fonte de pixel (3 x 5) ───────────────────────────────
FONTE = {
    "L": ["#..", "#..", "#..", "#..", "###"], "I": ["###", ".#.", ".#.", ".#.", "###"],
    "G": [".##", "#..", "#.#", "#.#", ".##"], "A": [".#.", "#.#", "###", "#.#", "#.#"],
    "1": [".#.", "##.", ".#.", ".#.", "###"], "2": ["##.", "..#", ".#.", "#..", "###"],
    "3": ["##.", "..#", ".#.", "..#", "##."], "4": ["#.#", "#.#", "###", "..#", "..#"],
    "5": ["###", "#..", "##.", "..#", "##."], "6": [".##", "#..", "###", "#.#", "###"],
    "7": ["###", "..#", ".#.", ".#.", ".#."], "8": ["###", "#.#", "###", "#.#", "###"],
    "9": ["###", "#.#", "###", "..#", "##."], "0": ["###", "#.#", "#.#", "#.#", "###"],
}


def escrever(c: Camada, x: int, y: int, texto: str, cor, sombra=None) -> None:
    for i, ch in enumerate(texto):
        if ch in FONTE:
            if sombra is not None:
                c.bitmap(x + i * 4 + 1, y + 1, FONTE[ch], {"#": sombra})
            c.bitmap(x + i * 4, y, FONTE[ch], {"#": cor})


# ═════════════════════════════════════ 1. SALÃO DA GUILDA ═════════════════════════════════════
G_CHAO = 96
G_JANELAS = ((196, 16, 24, 62), (454, 16, 22, 62))
G_PLACAR = (250, 20, 78, 56)
G_LAREIRA = 415                  # eixo da lareira
PEDRA_G = ("#241c18", "#4a3e36", "#5e5046", "#6e6052", "#8a7a68", "#a89880")
PEDRA_LAR = ("#2a2420", "#5a5048", "#706458", "#847868", "#a29480", "#c4b49c")
OSSO = ("#fff8e8", "#e8dfc6", "#c2b698", "#8e8268", "#55493a")
FERRO = METAIS["ferro"]


def g_astro(nome: str) -> tuple[float, float]:
    return {"manha": (468, 26), "tarde": (463, 60), "noite": (210, 30)}[nome]


def g_parede(per: dict, nome: str, fogo: Camada, luzes: list) -> tuple[Camada, np.ndarray, np.ndarray]:
    """Teto de vigas, parede de pedra com lambri, as janelas altas, a porta, o armeiro, o esqueleto de anatomia,
    o quadro do placar e a lareira. Devolve a camada, a máscara do vidro e a cor da luz que entra."""
    c = Camada()
    vidro = np.zeros((H, W), dtype=np.float32)
    # parede de pedra e lambri
    pedra(c, 0, 10, W, 82, PEDRA_G, 11, bw=13, bh=6)
    madeira(c, 0, 82, W, 14, MADEIRA, vertical=True, tabua=6, base=2, seed=3)
    for x0 in range(0, W, 30):
        c.ret(x0, 82, 2, 14, MADEIRA[1])
        c.ret(x0 + 4, 85, 22, 8, MADEIRA[2])
        c.ret(x0 + 4, 85, 22, 1, MADEIRA[1])
        c.ret(x0 + 4, 92, 22, 1, MADEIRA[4])
        c.ret(x0 + 4, 85, 1, 8, MADEIRA[1])
    c.ret(0, 81, W, 1, MADEIRA[5])
    c.ret(0, 82, W, 1, MADEIRA[3])
    c.ret(0, 94, W, 2, MADEIRA[0])
    # oclusão e manchas: escurece embaixo da viga, nos cantos e em manchas de umidade/fuligem
    mancha = ruido(13, 26) * 0.6 + ruido(14, 9) * 0.4
    ys_, xs_ = np.mgrid[0:H, 0:W].astype(np.float32)
    ao = 1 - 0.38 * suave(26, 10, ys_) - 0.18 * suave(0.55, 0.85, mancha) - 0.12 * suave(80, 96, ys_)
    ao -= 0.25 * suave(60, 0, xs_)
    c.c[:G_CHAO, :, :3] *= np.clip(ao, 0.3, 1)[:G_CHAO, :, None]
    # teto: forro de tábuas, a viga mestra e as mãos-francesas
    madeira(c, 0, 0, W, 6, CARVALHO, tabua=3, base=1, seed=21)
    madeira(c, 0, 6, W, 5, MADEIRA, base=3, seed=22, nos=12)
    c.ret(0, 6, W, 1, MADEIRA[1])
    c.ret(0, 10, W, 1, MADEIRA[0])
    for x in range(14, W, 56):
        for j in range(7):
            c.ret(x - j, 11 + j, 2, 1, MADEIRA[3] if j < 3 else MADEIRA[2])
            c.ret(x + 4 + j, 11 + j, 2, 1, MADEIRA[2])
        c.ret(x, 11, 6, 2, MADEIRA[3])
        c.p(x + 2, 12, FERRO[5])
    # pilares de madeira na parede
    for (x0, larg) in ((180, 6), (446, 6)):
        madeira(c, x0, 11, larg, 71, MADEIRA, vertical=True, base=3, seed=x0)
        c.ret(x0, 11, 1, 71, MADEIRA[5])
        c.ret(x0 + larg - 1, 11, 1, 71, MADEIRA[1])
        for y in (24, 60):
            c.ret(x0, y, larg, 2, FERRO[3])
            c.p(x0 + 1, y, FERRO[6])
            c.p(x0 + larg - 2, y, FERRO[6])
    # janelas
    for i, (x0, y0, w, h) in enumerate(G_JANELAS):
        janela(c, vidro, per, x0, y0, w, h, g_astro(nome), 40 + i)
    # ── à esquerda, na penumbra: porta, armeiro e o esqueleto de anatomia
    g_porta(c)
    g_armeiro(c)
    g_esqueleto(c, 160, 40)
    g_placar(c)
    g_lareira(c, per, fogo, luzes)
    # arandela no pilar e lampião em cima do placar
    for (x, y) in ((183, 50),):
        c.ret(x - 1, y + 2, 3, 1, FERRO[3])
        c.ret(x, y - 1, 1, 3, FERRO[2])
        c.ret(x - 2, y - 2, 5, 1, FERRO[4])
        vela(c, fogo, x, y - 2, 4, per["velas"] >= 2, luzes, 0.8, 30)
    lx, ly = G_PLACAR[0] + G_PLACAR[2] // 2, 12
    c.ret(lx - 8, ly, 17, 1, FERRO[3])
    c.ret(lx - 1, ly + 1, 3, 2, FERRO[2])
    c.ret(lx - 2, ly + 3, 5, 1, FERRO[4])
    c.ret(lx - 2, ly + 4, 1, 4, FERRO[2])
    c.ret(lx + 2, ly + 4, 1, 4, FERRO[1])
    c.ret(lx - 1, ly + 4, 3, 4, "#e8c27a" if per["velas"] >= 1 else "#4a4e5a")
    c.ret(lx - 2, ly + 8, 5, 1, FERRO[3])
    if per["velas"] >= 1:
        fogo.ret(lx - 1, ly + 5, 3, 2, "#ffd890")
        fogo.p(lx, ly + 5, "#fff6d8")
        luzes.append((lx, ly + 6, 46, "#ffb460", 0.5 * per["velas"]))
    vidro_cor = c.c[:, :, :3] * vidro[:, :, None]
    return c, vidro, vidro_cor


def g_porta(c: Camada) -> None:
    """Porta de tábuas em arco, com cintas de ferro, cravos e argola."""
    x0, x1, y0 = 26, 62, 38
    cx = (x0 + x1) / 2
    r = (x1 - x0) / 2
    for y in range(y0 - 4, G_CHAO):
        for x in range(x0 - 4, x1 + 4):
            dy = y0 + r - y
            fora = dy > 0 and math.hypot(x + 0.5 - cx, dy) > r
            fora_mold = dy > 0 and math.hypot(x + 0.5 - cx, dy) > r + 3
            if fora and not fora_mold or (not fora and (x < x0 or x >= x1)):
                c.p(x, y, PEDRA_G[4] if x < cx else PEDRA_G[1])
            elif not fora and x0 <= x < x1:
                tab = (x - x0) % 6
                v = NV_MADEIRA[(x * 3) % H, y % W]
                cor = CARVALHO[1] if tab == 0 else CARVALHO[3] if v > 0.6 else CARVALHO[2]
                if tab == 1:
                    cor = CARVALHO[4]
                c.p(x, y, cor)
    for yb in (50, 82):
        c.ret(x0, yb, x1 - x0, 2, FERRO[3])
        c.ret(x0, yb, x1 - x0, 1, FERRO[5])
        for x in range(x0 + 2, x1 - 1, 5):
            c.p(x, yb, FERRO[6])
    c.disco(x1 - 7, 66, 2.2, (FERRO[5], FERRO[3], FERRO[1]))
    c.p(x1 - 7, 66, CARVALHO[1])
    c.ret(x0 - 3, G_CHAO - 2, x1 - x0 + 6, 2, PEDRA_G[3])


def g_armeiro(c: Camada) -> None:
    """Armeiro de parede: lanças, um escudo redondo e uma capa pendurada."""
    c.ret(76, 54, 40, 3, MADEIRA[3])
    c.ret(76, 54, 40, 1, MADEIRA[5])
    c.ret(76, 86, 40, 3, MADEIRA[2])
    c.ret(76, 86, 40, 1, MADEIRA[4])
    for (x, cor) in ((80, MADEIRA[3]), (88, MADEIRA[4]), (110, MADEIRA[3])):
        c.ret(x, 30, 1, 62, cor)
        c.ret(x + 1, 30, 1, 62, MADEIRA[1])
        c.p(x, 26, FERRO[6])
        c.ret(x, 27, 2, 3, FERRO[5])
        c.p(x + 1, 28, FERRO[3])
        c.ret(x - 1, 30, 4, 1, FERRO[3])
    # escudo redondo em quartos
    cx, cy, r = 99, 40, 8
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy - 0.5)
            if d <= r:
                quarto = (x >= cx) ^ (y >= cy)
                cor = "#8a2a24" if quarto else "#d8ccb0"
                if d > r - 1.2:
                    cor = FERRO[4] if x < cx else FERRO[2]
                if (x < cx - 2 and y < cy - 2) and not quarto:
                    cor = "#efe6d0"
                c.p(x, y, cor)
    c.disco(cx + 0.5, cy + 0.5, 2, (FERRO[6], FERRO[4], FERRO[2]))
    # capa num cabide
    c.ret(96, 56, 7, 1, FERRO[3])
    for j in range(26):
        larg = 4 + j // 4
        for i in range(-larg // 2, larg // 2 + 1):
            dobra = math.sin(i * 1.4 + j * 0.15)
            c.p(99 + i, 57 + j, "#2c3a6a" if dobra > 0.3 else "#1e2850" if dobra > -0.4 else "#141a38")


def g_esqueleto(c: Camada, cx: int, y0: int) -> None:
    """Esqueleto de anatomia pendurado no suporte (o detalhe ortopédico do canto escuro)."""
    o = OSSO
    # suporte: base de rodinhas e a haste com o gancho
    c.ret(cx - 8, G_CHAO - 2, 17, 2, FERRO[3])
    c.ret(cx - 8, G_CHAO - 2, 17, 1, FERRO[5])
    for x in (cx - 8, cx + 8):
        c.p(x, G_CHAO - 1, FERRO[1])
    c.ret(cx + 6, y0 - 6, 1, G_CHAO - y0 + 4, FERRO[4])
    c.ret(cx + 7, y0 - 6, 1, G_CHAO - y0 + 4, FERRO[2])
    c.ret(cx, y0 - 6, 7, 1, FERRO[4])
    c.ret(cx, y0 - 6, 1, 3, FERRO[3])
    # crânio
    c.bitmap(cx - 3, y0 - 3, [".###.", "#####", "#####", "#.#.#", "#####", ".###.", ".#.#."],
             {"#": o[1]})
    c.p(cx - 2, y0 - 2, o[0])
    c.p(cx - 1, y0 - 3, o[0])
    c.p(cx - 2, y0, "#1a1410")
    c.p(cx, y0, "#1a1410")
    c.p(cx + 1, y0 - 1, o[2])
    c.p(cx + 1, y0 + 1, o[2])
    # coluna, costelas, clavículas
    for y in range(y0 + 4, y0 + 30):
        c.p(cx, y, o[1] if y % 2 else o[3])
    c.ret(cx - 4, y0 + 5, 9, 1, o[1])
    for k, y in enumerate(range(y0 + 7, y0 + 18, 2)):
        larg = 4 - abs(k - 2) * 0.5
        for lado in (-1, 1):
            for i in range(1, int(larg) + 1):
                c.p(cx + lado * i, y + (i > 2), o[1] if lado < 0 else o[2])
    # bacia
    c.bitmap(cx - 4, y0 + 29, ["#.#####.#", "###...###", ".##...##.", "..#...#.."], {"#": o[1]})
    c.p(cx - 3, y0 + 29, o[0])
    # braços pendentes e mãos
    for lado in (-1, 1):
        sx = cx + lado * 5
        c.linha(sx, y0 + 6, sx + lado, y0 + 18, o[1] if lado < 0 else o[2])
        c.linha(sx + lado, y0 + 19, sx + lado, y0 + 30, o[2])
        c.ret(sx + lado - (lado > 0), y0 + 31, 2, 3, o[3])
        # pernas: fêmur, joelho, tíbia, pé
        hx = cx + lado * 3
        c.linha(hx, y0 + 33, hx, y0 + 44, o[1] if lado < 0 else o[2])
        c.p(hx, y0 + 45, o[0])
        c.linha(hx, y0 + 46, hx, y0 + 54, o[2])
        c.ret(hx - (lado < 0), y0 + 55, 2, 1, o[3])


def g_placar(c: Camada) -> None:
    """O quadro do placar da liga: moldura entalhada, cabeçalho com "LIGA" e louros, uma fileira de furos por
    serviço com a faixa da cor do estandarte e o pino na posição da pontuação, e um recado pregado."""
    x0, y0, w, h = G_PLACAR
    ouro = METAIS["ouro"]
    # sombra na parede
    c.ret(x0 + 2, y0 + 2, w, h, "#1a120e", 0.55)
    madeira(c, x0, y0, w, h, MADEIRA, base=3, seed=31, nos=6)
    c.ret(x0, y0, w, 1, MADEIRA[5])
    c.ret(x0, y0, 1, h, MADEIRA[5])
    c.ret(x0 + w - 1, y0, 1, h, MADEIRA[1])
    c.ret(x0, y0 + h - 1, w, 1, MADEIRA[0])
    # cantoneiras de ferro
    for (x, y) in ((x0, y0), (x0 + w - 4, y0), (x0, y0 + h - 4), (x0 + w - 4, y0 + h - 4)):
        c.ret(x, y, 4, 4, FERRO[3])
        c.ret(x, y, 4, 1, FERRO[5])
        c.p(x + 1, y + 1, FERRO[6])
        c.p(x + 2, y + 2, FERRO[1])
    # cabeçalho
    c.ret(x0 + 4, y0 + 3, w - 8, 9, "#2a1a10")
    c.ret(x0 + 4, y0 + 3, w - 8, 1, "#140c08")
    c.ret(x0 + 4, y0 + 11, w - 8, 1, MADEIRA[4])
    tx = x0 + w // 2 - 8
    escrever(c, tx, y0 + 5, "LIGA", ouro[5], ouro[1])
    for lado in (-1, 1):
        bx = x0 + w // 2 + lado * 16
        for j in range(5):
            c.p(bx + lado * j, y0 + 9 - j // 2, "#5aa04a" if j % 2 else "#3a7a3a")
            c.p(bx + lado * j, y0 + 6 + (j % 2), "#7ac05a")
    # quadro de furos (tábua de pinho clara, gasta no meio)
    bx0, by0, bw, bh = x0 + 4, y0 + 14, w - 8, h - 18
    for y in range(by0, by0 + bh):
        for x in range(bx0, bx0 + bw):
            v = NV_MADEIRA[(y * 5) % H, (x * 2) % W] * 0.7 + NV_GRAO[y, x] * 0.3
            c.p(x, y, "#b89464" if v > 0.62 else "#a6824f" if v > 0.36 else "#94723f")
    c.ret(bx0, by0, bw, 1, "#4a3018")
    c.ret(bx0, by0, 1, bh, "#4a3018")
    servicos = [("dourado", 0.96, "coroa"), ("vermelho", 0.83, "osso"), ("azul", 0.7, "escudo"),
                ("verde", 0.58, "estrela"), ("roxo", 0.41, "cruz"), ("laranja", 0.27, "coluna")]
    passo = bh // len(servicos)
    for r, (pano, pont, _em) in enumerate(servicos):
        yr = by0 + 1 + r * passo
        tons = PANOS[pano]
        # faixa da cor do serviço e o número da posição
        c.ret(bx0 + 1, yr, 5, passo - 1, tons[1])
        c.ret(bx0 + 1, yr, 5, 1, tons[0])
        c.ret(bx0 + 5, yr, 1, passo - 1, tons[3])
        c.p(bx0 + 3, yr + 2, "#fff4d0")
        escrever(c, bx0 + 8, yr, str(r + 1), "#2a1808" if r else METAIS["ouro"][1], "#d8b884")
        # trilha de furos
        xt0, xt1 = bx0 + 13, bx0 + bw - 3
        furos = list(range(xt0, xt1, 3))
        for xf in furos:
            c.p(xf, yr + 2, "#2a180a")
            c.p(xf, yr + 3, "#c8a878")
        # o fio da cor do serviço do começo até o pino (lê-se como uma barra do ranking) e o pino
        k = int(pont * (len(furos) - 1))
        xp = furos[k]
        for x in range(xt0, xp):
            c.p(x, yr + 2, tons[1])
            c.p(x, yr + 1, tons[0], 0.55)
            c.p(x, yr + 3, "#000000", 0.18)
        c.ret(xp - 1, yr - 1, 3, 5, "#1a0e06")
        c.ret(xp, yr - 1, 1, 4, tons[0])
        c.p(xp, yr - 1, "#ffffff")
        c.p(xp, yr + 2, tons[2])
        c.p(xp + 1, yr, tons[1])
        c.p(xp + 1, yr + 1, tons[2])
        c.p(xp + 2, yr + 3, "#000000", 0.35)
        # a coroa do primeiro lugar
        if r == 0:
            c.bitmap(xp - 2, yr - 6, ["#.#.#", "#####"], {"#": ouro[5]})
            c.p(xp, yr - 6, "#ffffff")
        if r < len(servicos) - 1:
            for x in range(bx0 + 7, bx0 + bw - 1):
                c.p(x, yr + passo - 1, "#7a5a32")
    # recado pregado embaixo da moldura, com alfinete vermelho
    rx, ry = x0 + w - 18, y0 + h - 3
    for y in range(ry, ry + 12):
        for x in range(rx, rx + 10):
            torto = (y - ry) * 0.15
            xx = round(x + torto)
            cor = PERGAMINHO[4] if x < rx + 8 else PERGAMINHO[3]
            if y == ry + 11 or x == rx + 9:
                cor = PERGAMINHO[2]
            if (y - ry) in (4, 6, 8) and rx + 2 <= x < rx + 7 - ((y + x) % 3 == 0):
                cor = "#6a5038"
            c.p(xx, y, cor)
    c.ret(rx + 2, ry + 12, 9, 1, "#000000", 0.3)
    c.disco(rx + 5.5, ry + 2, 1.3, ("#ff7a6a", "#d8302a", "#7a1414"))
    # taça pequena em cima da moldura
    tx = x0 + w // 2
    corpo_metal(c, tx, y0 - 7, [3, 3, 2.6, 2, 1.2, 0.6, 0.6, 1.6], "ouro")
    c.ret(tx - 3, y0 - 1, 7, 1, MADEIRA[1])
    for lado in (-1, 1):
        c.p(tx + lado * 4, y0 - 6, ouro[3])
        c.p(tx + lado * 4, y0 - 5, ouro[2])


def g_fogo(fogo: Camada, cx: int, base: int, larg: int, alt: float, seed: int) -> None:
    """Chamas da lareira/braseiro em pixel art: línguas de fogo com o miolo claro e as pontas vermelhas."""
    if alt <= 0.5:
        return
    g = np.random.default_rng(seed)
    linguas = [(cx + (g.random() - 0.5) * larg * 1.4, 0.55 + g.random() * 0.45, g.random() * 6) for _ in range(5)]
    for x in range(cx - larg, cx + larg + 1):
        hx = 0.0
        for (lx, k, fase) in linguas:
            d = abs(x - lx) / (larg * 0.45)
            if d < 1:
                hx = max(hx, alt * k * (1 - d * d))
        hx *= 1 - (abs(x - cx) / (larg + 1)) ** 2 * 0.5
        for j in range(int(hx) + 1):
            v = j / max(hx, 1)
            if v < 0.25:
                cor = "#fff6c8"
            elif v < 0.5:
                cor = "#ffd860"
            elif v < 0.75:
                cor = "#ff9a2a"
            else:
                cor = "#e85a18"
            fogo.p(x, base - j, cor, 1.0 if v < 0.9 else 0.7)
    # faíscas
    for _ in range(int(alt * 0.8)):
        fogo.p(cx + (g.random() - 0.5) * larg * 1.6, base - alt - g.random() * alt * 0.9, "#ffc860", 0.85)


def g_lareira(c: Camada, per: dict, fogo: Camada, luzes: list) -> None:
    """Lareira de pedra: coifa até o teto, o brasão de fêmures cruzados, a cornija com velas e ampulheta, a boca
    com tijolos refratários, cães de ferro, achas e o fogo do tamanho da hora (brasas de manhã)."""
    cx = G_LAREIRA
    x0, x1 = cx - 27, cx + 27
    pedra(c, x0, 10, x1, 64, PEDRA_LAR, 51, bw=9, bh=5)
    c.ret(x0, 10, 1, 54, PEDRA_LAR[5])
    c.ret(x1 - 1, 10, 1, 54, PEDRA_LAR[0])
    c.ret(x1 - 2, 10, 1, 54, PEDRA_LAR[1])
    # moldura de pedra do brasão
    # brasão: escudo azul, fêmures cruzados, coroa em cima
    bx, by, bw, bh = cx - 9, 22, 19, 24
    for j in range(bh):
        v = j / (bh - 1)
        meia = bw / 2 if v < 0.55 else bw / 2 * math.sqrt(max(0.0, 1 - ((v - 0.55) / 0.45) ** 2))
        for x in range(int(round(cx + 0.5 - meia)), int(round(cx + 0.5 + meia))):
            borda = x <= cx + 0.5 - meia + 1 or x >= cx + 0.5 + meia - 1.5 or j == 0
            cor = (METAIS["ouro"][4] if x < cx else METAIS["ouro"][2]) if borda else ("#2c54a8" if x < cx else "#1c3a7a")
            if not borda and (x + j) % 7 == 0:
                cor = "#24468e"
            c.p(x, by + j, cor)
    c.ret(cx - 10, by + bh, 21, 1, "#000000", 0.35)
    for lado in (-1, 1):
        xa, xb = cx - lado * 6, cx + lado * 6
        c.linha(xa, by + 5, xb, by + 18, OSSO[1])
        c.linha(xa + lado * -1, by + 5, xb + lado * -1, by + 18, OSSO[2])
        for (ex, ey) in ((xa, by + 5), (xb, by + 18)):
            c.disco(ex + 0.5, ey + 0.5, 1.6, (OSSO[0], OSSO[1], OSSO[3]))
    c.bitmap(cx - 4, by - 5, ["#.#.#.#", "#######", "#o#o#o#", "#######"],
             {"#": METAIS["ouro"][4], "o": "#c8302a"})
    c.p(cx - 4, by - 5, METAIS["ouro"][6])
    # cornija
    madeira(c, x0 - 6, 64, x1 - x0 + 12, 5, MADEIRA, base=3, seed=52)
    c.ret(x0 - 6, 64, x1 - x0 + 12, 1, MADEIRA[5])
    c.ret(x0 - 6, 68, x1 - x0 + 12, 1, MADEIRA[0])
    for xm in (x0 - 4, x1 - 2):
        for j in range(6):
            c.ret(xm + (j // 2 if xm < cx else -j // 2), 69 + j, 6 - j, 1, MADEIRA[3] if j < 3 else MADEIRA[2])
    # ombreiras
    pedra(c, x0, 69, x0 + 9, G_CHAO, PEDRA_LAR, 53, bw=9, bh=5)
    pedra(c, x1 - 9, 69, x1, G_CHAO, PEDRA_LAR, 54, bw=9, bh=5)
    c.ret(x0 + 8, 69, 1, G_CHAO - 69, PEDRA_LAR[0])
    c.ret(x1 - 9, 69, 1, G_CHAO - 69, PEDRA_LAR[4])
    # boca: arco abatido, fundo de tijolo refratário escurecido de fuligem
    bx0, bx1, btopo = x0 + 9, x1 - 9, 71
    for y in range(btopo, G_CHAO):
        for x in range(bx0, bx1):
            dx = (x + 0.5 - cx) / ((bx1 - bx0) / 2)
            if y < btopo + 5 and y < btopo + 5 * (dx * dx):
                c.p(x, y, PEDRA_LAR[3] if y == int(btopo + 5 * dx * dx) - 1 else PEDRA_LAR[2])
                continue
            fila = (y - btopo) // 3
            junta = (y - btopo) % 3 == 0 or (x + fila * 3) % 7 == 0
            prof = 1 - abs(dx) * 0.5
            fuligem = suave(G_CHAO - 20, btopo, y)
            base_c = misturar("#6a2a1a" if per["fogo"] > 0.4 else "#3a1e16", "#120a08", min(1.0, fuligem * 1.2 + 0.2))
            if junta:
                base_c = base_c * 0.55
            c.p(x, y, base_c * (0.7 + 0.3 * prof))
    # aduelas do arco
    for x in range(bx0 - 1, bx1 + 1):
        dx = (x + 0.5 - cx) / ((bx1 - bx0) / 2)
        y = int(btopo + 5 * dx * dx) - 2
        c.p(x, y, PEDRA_LAR[4] if (x // 4) % 2 else PEDRA_LAR[3])
        c.p(x, y - 1, PEDRA_LAR[2])
    # cães de ferro e achas
    for xa in (cx - 12, cx + 11):
        c.ret(xa, G_CHAO - 9, 2, 9, FERRO[3])
        c.ret(xa, G_CHAO - 9, 1, 9, FERRO[5])
        c.disco(xa + 1, G_CHAO - 10, 1.6, (FERRO[6], FERRO[4], FERRO[2]))
        c.ret(xa - 2, G_CHAO - 1, 6, 1, FERRO[2])
    for (ya, xa, xb, s) in ((G_CHAO - 4, cx - 14, cx + 12, 0), (G_CHAO - 7, cx - 10, cx + 9, 1), (G_CHAO - 3, cx - 6, cx + 15, 2)):
        for x in range(xa, xb):
            for j in range(3):
                cor = MADEIRA[3] if j == 0 else MADEIRA[2] if j == 1 else MADEIRA[1]
                if (x * 5 + s) % 7 == 0:
                    cor = MADEIRA[0]
                c.p(x, ya + j, cor)
        c.disco(xb + 0.2, ya + 1.5, 1.5, (PERGAMINHO[3], PERGAMINHO[2], MADEIRA[3]))
    # brasas nas rachaduras das achas (sempre), fogo do tamanho da hora
    gb = np.random.default_rng(55)
    for _ in range(26):
        x, y = cx - 13 + int(gb.random() * 27), G_CHAO - 8 + int(gb.random() * 8)
        if c.c[y, x, 3] > 0 and gb.random() < 0.8:
            fogo.p(x, y, "#ff6a1a" if gb.random() < 0.6 else "#ffb040", 0.55 + per["fogo"] * 0.45)
    alt = {0.32: 0.0, 0.62: 11.0, 1.0: 17.0}.get(per["fogo"], 10.0)
    g_fogo(fogo, cx, G_CHAO - 6, 13, alt, 56)
    g_fogo(fogo, cx - 6, G_CHAO - 5, 6, alt * 0.7, 57)
    if per["fogo"] < 0.4:
        # de manhã: só brasas e um fio de fumaça subindo para a coifa
        for j in range(26):
            y = G_CHAO - 7 - j
            for k2 in range(2):
                x = cx + round(math.sin(j * 0.32 + k2 * 2.1) * (1 + j * 0.12)) + k2 * 2 - 1
                c.p(x, y, "#b8b0a8", 0.32 * (1 - j / 26))
    luzes.append((cx, G_CHAO - 10, 78, "#ff8a3a", 0.85 * per["fogo"]))
    luzes.append((cx, G_CHAO - 8, 30, "#ffc070", 0.55 * per["fogo"]))
    # na cornija: castiçais, ampulheta, caneca e uma caveirinha
    for xv in (x0 - 2, x1 + 1):
        castical(c, fogo, xv, 64, 5, per["velas"] >= 1, luzes, "ouro", 0.9)
    hx = x0 + 8
    c.ret(hx - 2, 57, 5, 1, MADEIRA[4])
    c.ret(hx - 2, 63, 5, 1, MADEIRA[4])
    c.ret(hx - 2, 58, 1, 5, MADEIRA[3])
    c.ret(hx + 2, 58, 1, 5, MADEIRA[2])
    c.bitmap(hx - 1, 58, ["###", ".#.", ".#.", "###", "###"], {"#": "#cfe0ea"}, 0.8)
    c.p(hx, 61, "#e8c880")
    c.ret(hx - 1, 62, 3, 1, "#e8c880")
    corpo_metal(c, x1 - 9, 59, [1.5, 1.5, 1.5, 1.5, 1.5], "estanho")
    c.p(x1 - 6, 60, METAIS["estanho"][3])
    c.p(x1 - 6, 61, METAIS["estanho"][2])
    c.bitmap(cx + 5, 59, [".##.", "####", "#.#.", "####", ".##."], {"#": OSSO[1]})
    c.p(cx + 5, 59, OSSO[0])


def piso_tabuas(c: Camada, chao_y: int, fuga: tuple[float, float], k: float, f: float, tons, seed: int) -> None:
    """Assoalho de tábuas em perspectiva (amostrado 4 x 4 por pixel): tábuas na direção da fuga, emendas
    desencontradas, tom próprio por tábua, veio e pregos."""
    g = np.random.default_rng(seed)
    tom_tabua = g.random(400)
    emenda = g.random(400) * 7
    fx, fy = fuga
    ss = 4
    ys, xs = np.mgrid[chao_y * ss:H * ss, 0:W * ss].astype(np.float32)
    ys, xs = (ys + 0.5) / ss, (xs + 0.5) / ss
    prof = ys - fy
    u = (xs - fx) * k / prof
    v = k * f / prof
    iu = np.floor(u).astype(np.int32)
    t = tom_tabua[iu % 400]
    seg = (v + emenda[iu % 400]) % 7
    fu = u - np.floor(u)
    nv = np.asarray(Image.fromarray((ruido_ret(seed + 3, 3, 9) * 255).astype(np.uint8)).resize((W * ss, H * ss),
                    Image.BILINEAR), dtype=np.float32)[chao_y * ss:] / 255
    veio = np.sin(fu * 9 + nv * 9 + v * 0.3)
    base = np.stack([hexa(tons[1]), hexa(tons[2]), hexa(tons[3]), hexa(tons[4])])
    idx = np.clip((t * 2.2 + 0.9 + veio * 0.45).astype(np.int32), 0, 3)
    cor = base[idx]
    cor = np.where(((fu < 0.06) | (seg < 0.05))[..., None], hexa(tons[0]), cor)
    cor = np.where(((fu > 0.06) & (fu < 0.13))[..., None], cor * 1.08, cor)
    prego = (np.abs(seg - 0.25) < 0.08) & ((np.abs(fu - 0.25) < 0.06) | (np.abs(fu - 0.75) < 0.06))
    cor = np.where(prego[..., None], hexa("#1a1410"), cor)
    cor = cor.reshape(H - chao_y, ss, W, ss, 3).mean((1, 3))
    c.c[chao_y:, :, :3] = cor
    c.c[chao_y:, :, 3] = 1


def g_chao() -> Camada:
    """Assoalho do salão, a lareira com as lajes da soleira e o tapete redondo (o lugar do mascote)."""
    c = Camada()
    piso_tabuas(c, G_CHAO, (300, 34), 8.5, 120, MADEIRA, 61)
    # soleira de lajes na frente da lareira
    cx = G_LAREIRA
    for y in range(G_CHAO, G_CHAO + 9):
        meia = 36 + (y - G_CHAO) * 1.2
        for x in range(int(cx - meia), int(cx + meia)):
            laje = int((x - cx + meia) / 9 + (y - G_CHAO) // 4) % 2
            junta = (y - G_CHAO) % 4 == 0 or int((x - cx + meia) % 9) == 0
            cor = PEDRA_LAR[0] if junta else PEDRA_LAR[3 + laje] if y < G_CHAO + 3 else PEDRA_LAR[2 + laje]
            c.p(x, y, cor)
    # tapete oval no chão livre (onde o mascote fica)
    tcx, tcy, rx, ry = 356, 136, 34, 8.5
    for y in range(int(tcy - ry) - 1, int(tcy + ry) + 2):
        for x in range(int(tcx - rx) - 1, int(tcx + rx) + 2):
            d = math.hypot((x + 0.5 - tcx) / rx, (y + 0.5 - tcy) / ry)
            if d > 1:
                continue
            if d > 0.9:
                cor = "#d8a032" if d < 0.95 else "#5a3a10"
            elif d > 0.78:
                cor = "#6a1418"
            elif d > 0.72:
                cor = "#e8c050"
            else:
                ang = math.atan2((y - tcy) / ry, (x - tcx) / rx)
                padrao = int((ang + math.pi) * 4) % 2
                cor = "#9a2228" if (padrao ^ (d < 0.4)) else "#7a1820"
                if abs(d - 0.5) < 0.05:
                    cor = "#d8a032"
                if d < 0.14:
                    cor = "#e8c050"
            if (x + y) % 3 == 0 and d < 0.9:
                cor = misturar(cor, "#000000", 0.12)
            c.p(x, y, cor)
    return c


def caneca(c: Camada, x: int, yb: int, metal: str = "estanho", espuma: bool = True) -> None:
    corpo_metal(c, x + 1.5, yb - 5, [1.8, 1.8, 1.8, 1.8, 1.8], metal)
    pal = METAIS[metal]
    c.p(x + 4, yb - 4, pal[3])
    c.p(x + 5, yb - 3, pal[2])
    c.p(x + 4, yb - 2, pal[2])
    c.ret(x, yb - 4, 4, 1, pal[1])
    if espuma:
        c.ret(x, yb - 6, 4, 1, "#fff8e4")
        c.p(x + 1, yb - 7, "#ffffff")
        c.p(x + 3, yb - 6, "#e8dcc0")


def prato(c: Camada, x: int, y: int, rx: float = 4, comida: str | None = None) -> None:
    c.elipse(x, y, rx, 1.6, METAIS["estanho"][3])
    c.elipse(x - 0.5, y - 0.3, rx - 1.2, 0.9, METAIS["estanho"][4])
    c.p(x - rx + 1, y, METAIS["estanho"][5])
    c.p(x + rx - 1, y + 1, METAIS["estanho"][1])
    if comida == "pao":
        c.elipse(x, y - 1, 2.5, 1.3, "#c08040")
        c.p(x - 1, y - 2, "#e8b070")
        c.p(x + 1, y - 1, "#8a5020")
    elif comida == "maca":
        c.disco(x - 1, y - 1.5, 1.6, ("#ff6a5a", "#c8302a", "#7a1414"))
        c.p(x - 1, y - 3, "#4a3a1a")
        c.disco(x + 2, y - 1, 1.2, ("#a8d860", "#6aa030", "#3a6a1a"))
    elif comida == "coxa":
        c.ret(x - 2, y - 2, 3, 2, "#a0582a")
        c.p(x - 2, y - 2, "#d08a4a")
        c.p(x + 1, y - 1, OSSO[1])
        c.p(x + 2, y - 2, OSSO[0])


def g_mesa(per: dict, fogo: Camada, luzes: list) -> tuple[Camada, Camada]:
    """A mesa comprida (tampo de tábuas em leve perspectiva, cavaletes), os dois bancos e tudo em cima dela.
    Devolve a camada e o que faz sombra."""
    c = Camada()
    y_fundo, y_frente = 101, 114
    xa0, xb0, xa1, xb1 = 112, 304, 98, 316

    def borda(y):
        t = (y - y_fundo) / (y_frente - y_fundo)
        return xa0 + (xa1 - xa0) * t, xb0 + (xb1 - xb0) * t

    # banco de trás (só o assento aparece por cima da mesa)
    madeira(c, 118, 97, 182, 2, MADEIRA, base=3, seed=71)
    c.ret(118, 97, 182, 1, MADEIRA[4])
    c.ret(118, 99, 182, 2, MADEIRA[1])
    # tampo: tábuas no comprimento
    for y in range(y_fundo, y_frente):
        xa, xb = borda(y)
        for x in range(int(round(xa)), int(round(xb))):
            v = NV_MADEIRA[(y * 9) % H, x % W] * 0.6 + NV_MADEIRA2[(y * 3) % H, (x * 2) % W] * 0.4
            k = 4 if v > 0.62 else 3 if v > 0.36 else 2
            if (y - y_fundo) % 3 == 0:
                k = 2 if y > y_fundo else 1
            if (y - y_fundo) % 3 == 1:
                k = min(5, k + 1)
            if NV_GRAO[y, x] > 0.97:
                k = 1
            c.p(x, y, MADEIRA[k])
        c.p(int(round(xa)), y, MADEIRA[5])
        c.p(int(round(xb)) - 1, y, MADEIRA[2])
    # aba da frente e cabeceiras
    c.ret(xa1, y_frente, xb1 - xa1, 1, MADEIRA[5])
    madeira(c, xa1, y_frente + 1, xb1 - xa1, 4, MADEIRA, base=2, seed=72)
    c.ret(xa1, y_frente + 4, xb1 - xa1, 1, MADEIRA[0])
    for xr in range(xa1 + 6, xb1 - 4, 24):
        c.p(xr, y_frente + 2, FERRO[5])
        c.p(xr + 1, y_frente + 3, FERRO[2])
    # cavaletes (pés em X) e a travessa
    for xl in (112, 206, 300):
        for j in range(16):
            c.p(xl - 3 + j * 0.4, y_frente + 4 + j, MADEIRA[3])
            c.p(xl - 2 + j * 0.4, y_frente + 4 + j, MADEIRA[2])
            c.p(xl + 4 - j * 0.4, y_frente + 4 + j, MADEIRA[2])
            c.p(xl + 5 - j * 0.4, y_frente + 4 + j, MADEIRA[1])
        c.ret(xl - 5, y_frente + 19, 12, 2, MADEIRA[2])
        c.ret(xl - 5, y_frente + 19, 12, 1, MADEIRA[3])
    c.ret(112, y_frente + 10, 190, 2, MADEIRA[1])
    c.ret(112, y_frente + 10, 190, 1, MADEIRA[2])
    # banco da frente
    madeira(c, 94, 124, 226, 3, MADEIRA, base=3, seed=73)
    c.ret(94, 124, 226, 1, MADEIRA[5])
    c.ret(94, 127, 226, 2, MADEIRA[2])
    c.ret(94, 128, 226, 1, MADEIRA[0])
    for xl in (100, 206, 312):
        for j in range(12):
            c.p(xl - 2 - j * 0.15, 129 + j, MADEIRA[3])
            c.p(xl - 1 - j * 0.15, 129 + j, MADEIRA[1])
            c.p(xl + 2 + j * 0.15, 129 + j, MADEIRA[2])
            c.p(xl + 3 + j * 0.15, 129 + j, MADEIRA[1])
    # um manto esquecido no banco e uma bolsa de couro
    for j in range(7):
        for i in range(10 - j // 2):
            dobra = math.sin(i * 1.3 + j)
            c.p(150 + i + j // 3, 122 + j, "#5a2a6a" if dobra > 0.2 else "#3e1a4c")
    c.ret(262, 120, 6, 4, "#7a4a24")
    c.ret(262, 120, 6, 1, "#a06a3a")
    c.p(265, 122, METAIS["ouro"][4])
    sombra = Camada()
    sombra.c[:] = c.c
    # ── em cima da mesa
    prato(c, 126, 108, 4, "pao")
    caneca(c, 136, 111)
    castical(c, fogo, 143, 105, 3, per["velas"] >= 1, luzes, "estanho", 0.7)
    castical(c, fogo, 283, 105, 4, per["velas"] >= 1, luzes, "estanho", 0.7)
    caneca(c, 118, 107, "bronze")
    prato(c, 152, 110, 4, "coxa")
    # rolo de pergaminho aberto (a escala de plantão)
    for y in range(106, 110):
        for x in range(160, 176):
            cor = PERGAMINHO[4] if y < 109 else PERGAMINHO[3]
            if y == 107 and x % 3 and 162 < x < 174:
                cor = "#6a5038"
            c.p(x, y, cor)
    c.disco(159.5, 108, 1.6, (PERGAMINHO[4], PERGAMINHO[2], PERGAMINHO[1]))
    c.disco(176.5, 108, 1.6, (PERGAMINHO[4], PERGAMINHO[2], PERGAMINHO[1]))
    caneca(c, 180, 112)
    # dados
    for (dx, dy) in ((188, 110), (192, 111)):
        c.ret(dx, dy, 2, 2, "#f4ece0")
        c.p(dx + 1, dy + 1, "#a49a84")
        c.p(dx, dy, "#1a1410")
    # travessa com o assado
    c.elipse(212, 108, 10, 3.2, METAIS["estanho"][2])
    c.elipse(211.5, 107.6, 9, 2.6, METAIS["estanho"][4])
    c.disco(212, 106, 5, ("#d8904a", "#a0582a", "#5a2a12"), achatar=0.55)
    c.p(209, 104, "#ffd090")
    for (ox, oy) in ((206, 107), (218, 107)):
        c.p(ox, oy, OSSO[1])
        c.p(ox + (1 if ox > 212 else -1), oy - 1, OSSO[0])
    for (gx, gy) in ((203, 109), (221, 109), (215, 110)):
        c.p(gx, gy, "#4a9a3a")
    # candelabro de três braços no meio
    cx = 232
    m = METAIS["ouro"]
    c.ret(cx - 3, 107, 7, 1, m[2])
    c.ret(cx - 2, 106, 5, 1, m[4])
    c.ret(cx, 98, 1, 8, m[3])
    c.p(cx, 101, m[5])
    for lado in (-1, 1):
        c.p(cx + lado, 99, m[3])
        c.p(cx + lado * 2, 98, m[3])
        c.p(cx + lado * 3, 97, m[4] if lado < 0 else m[2])
    for xv, base in ((cx - 3, 96), (cx, 97), (cx + 3, 96)):
        vela(c, fogo, xv, base, 5 if xv == cx else 4, per["velas"] >= 1, luzes, 0.85, 30)
    prato(c, 246, 109, 4, "maca")
    caneca(c, 254, 106, "bronze")
    # pão comprido e faca
    c.elipse(262, 111, 5, 1.6, "#b07034")
    c.p(259, 110, "#e0a060")
    c.p(261, 110, "#7a4018")
    c.p(264, 110, "#7a4018")
    c.linha(248, 112, 255, 112, METAIS["prata"][4])
    c.ret(256, 112, 3, 1, MADEIRA[2])
    # o gesso esquecido: tala de braço com malha nas pontas e assinaturas coloridas
    gx0, gy = 270, 107
    for x in range(gx0, gx0 + 14):
        larg = 2 if x < gx0 + 4 else 3
        for j in range(larg):
            cor = "#f4f0e8" if j == 0 else "#d8d2c6" if j == 1 else "#b4ac9c"
            c.p(x, gy + j - (x > gx0 + 10), cor)
    c.ret(gx0 - 1, gy, 1, 2, "#a8b8c8")
    c.ret(gx0 + 14, gy - 1, 1, 3, "#a8b8c8")
    for (sx, sy, sc) in ((gx0 + 3, gy + 1, "#d83a3a"), (gx0 + 6, gy, "#2c5aa8"), (gx0 + 8, gy + 1, "#2c8a4a"),
                         (gx0 + 11, gy, "#7a3a9a")):
        c.p(sx, sy, sc)
        c.p(sx + 1, sy, sc, 0.6)
    caneca(c, 290, 111)
    # martelo de reflexo (cabeça triangular vermelha, cabo de metal)
    c.linha(294, 109, 304, 107, METAIS["prata"][4])
    c.linha(294, 110, 304, 108, METAIS["prata"][2])
    c.bitmap(304, 104, ["#..", "##.", "###", "##.", "#.."], {"#": "#c8302a"})
    c.p(304, 105, "#ff7a6a")
    caneca(c, 296, 106, "bronze", espuma=False)
    return c, sombra


def braseiro(c: Camada, fogo: Camada, cx: int, yb: int, aceso: float, luzes: list, seed: int, k: float = 1.0) -> None:
    """Braseiro de ferro num tripé: bacia rebitada, carvões em brasa e o fogo do tamanho da hora."""
    yt = yb - 22
    for lado in (-1, 0, 1):
        for j in range(18):
            x = cx + lado * (2 + j * 0.35)
            c.p(x, yt + 4 + j, FERRO[4] if lado < 0 else FERRO[2] if lado else FERRO[3])
        c.ret(cx + lado * 9 - 1, yb - 1, 3, 1, FERRO[2])
    c.ret(cx - 6, yt + 12, 13, 1, FERRO[3])
    for y in range(yt - 1, yt + 5):
        meia = 8 - (y - yt) * 0.8
        for x in range(int(cx - meia), int(cx + meia) + 1):
            t = (x - cx) / max(meia, 1)
            cor = FERRO[5] if t < -0.5 else FERRO[4] if t < 0 else FERRO[3] if t < 0.5 else FERRO[2]
            if (x - cx) % 4 == 0 and y == yt + 1:
                cor = FERRO[6]
            c.p(x, y, cor)
    c.ret(cx - 9, yt - 2, 19, 1, FERRO[5])
    c.ret(cx - 9, yt - 1, 19, 1, FERRO[2])
    g = np.random.default_rng(seed)
    for i in range(16):
        x, y = cx - 7 + int(g.random() * 15), yt - 3 - int(g.random() * 2)
        c.p(x, y, "#2a1a12")
        if aceso > 0.4 or g.random() < 0.3:
            fogo.p(x, y, "#ff7020" if g.random() < 0.5 else "#ffb040", 0.5 + aceso * 0.5)
    alt = {0.32: 0, 0.62: 7, 1.0: 11}.get(aceso, 6)
    g_fogo(fogo, cx, yt - 3, 6, alt, seed + 1)
    if aceso > 0.4:
        luzes.append((cx, yt - 6, 58, "#ff9a40", 0.62 * aceso * k))
        luzes.append((cx, yt - 4, 18, "#ffd080", 0.4 * aceso * k))
    else:
        luzes.append((cx, yt - 3, 20, "#ff7030", 0.25 * k))


def lustre_roda(c: Camada, fogo: Camada, cx: int, y: int, larg: int, acesa: bool, luzes: list) -> None:
    """Lustre de roda de carroça: corrente, aro de ferro com raios e velas em volta."""
    for yy in range(11, y - 4):
        c.p(cx, yy, FERRO[4] if yy % 2 else FERRO[2])
    for lado in (-1, 1):
        c.linha(cx, y - 4, cx + lado * larg // 2, y, FERRO[3])
    meia = larg // 2
    for i in range(-meia, meia + 1):
        yy = y + round(1.6 * (1 - (i / meia) ** 2))
        c.p(cx + i, yy, FERRO[4] if i < 0 else FERRO[2])
        c.p(cx + i, yy + 1, MADEIRA[2])
        c.p(cx + i, y - round(1.2 * (1 - (i / meia) ** 2)) + 1, MADEIRA[1], 0.8)
    for i in range(-meia, meia + 1, max(3, larg // 5)):
        yy = y + round(1.6 * (1 - (i / meia) ** 2))
        vela(c, fogo, cx + i, yy, 3, acesa, luzes, 0.45, 24)


def g_frente() -> Camada:
    """Primeiro plano (bem desfocado): barril e caixote à esquerda, lenha empilhada e o machado à direita."""
    c = Camada()
    # barril
    for y in range(124, H):
        meia = 13 - abs(y - 142) * 0.12
        for x in range(int(14 - meia), int(14 + meia)):
            t = (x - 14) / meia
            cor = MADEIRA[4] if t < -0.4 else MADEIRA[3] if t < 0.2 else MADEIRA[2] if t < 0.7 else MADEIRA[1]
            if (x - 1) % 5 == 0:
                cor = MADEIRA[1]
            if y in (128, 129, 150, 151):
                cor = FERRO[4] if t < 0 else FERRO[2]
            c.p(x, y, cor)
    c.elipse(14, 124, 12, 2.4, MADEIRA[2])
    c.elipse(14, 124, 10, 1.6, MADEIRA[1])
    madeira(c, 28, 140, 26, 20, MADEIRA, tabua=5, base=3, seed=91)
    c.ret(28, 140, 26, 1, MADEIRA[5])
    c.linha(28, 141, 53, 159, MADEIRA[2])
    # lenha à direita
    for (y, x0) in ((150, 448), (154, 444), (146, 452), (150, 462), (154, 458), (146, 466), (150, 476)):
        c.disco(x0 + 0.5, y + 0.5, 3.6, ("#c8a070", "#9a7040", "#5a3a1a"))
        c.disco(x0 + 0.5, y + 0.5, 1.6, ("#e8c890", "#c8a070", "#9a7040"))
        c.ret(x0 + 3, y - 3, 8, 7, MADEIRA[2])
        c.ret(x0 + 3, y - 3, 8, 1, MADEIRA[4])
    c.linha(470, 132, 478, 156, MADEIRA[3])
    c.bitmap(466, 128, ["####.", "#####", ".###."], {"#": FERRO[4]})
    return c


def g_sombras() -> Camada:
    """Sombras de contato no chão (debaixo da mesa, dos bancos e dos braseiros)."""
    c = Camada()
    for y in range(116, 142):
        for x in range(90, 324):
            k = 0.62 * (1 - abs(y - 128) / 14) * (1 - max(0, abs(x - 207) - 96) / 12)
            if k > 0:
                c.p(x, y, "#000000", min(0.75, k))
    for (cx, cy, rx) in ((456, 139, 13), (160, 96, 10)):
        c.elipse(cx, cy, rx, 2.2, "#000000", 0.5)
    return c


G_BANDEIRAS = [(104, 18, 11, 42, "roxo", "cruz", 0.3, "cauda"), (128, 16, 11, 46, "verde", "estrela", 1.4, "ponta"),
               (154, 18, 11, 40, "laranja", "coluna", 2.2, "cauda"), (228, 16, 13, 52, "azul", "escudo", 0.8, "cauda"),
               (334, 15, 13, 54, "vermelho", "osso", 1.9, "ponta"), (361, 17, 12, 48, "dourado", "coroa", 2.9, "cauda"),
               (282, 80, 0, 0, "", "", 0, "")]


def montar_guilda(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    fogo = Camada()
    luzes: list = []
    fundo, vidro, vidro_cor = g_parede(per, nome, fogo, luzes)
    for (x, y, w, h, pano, em, fase, ponta) in G_BANDEIRAS:
        if w:
            estandarte(fundo, x, y, w, h, pano, em, fase=fase, ponta=ponta, vento=0.25, corda_ate=11)
    chao = g_chao()
    fundo.c[G_CHAO:] = np.where(chao.c[G_CHAO:, :, 3:4] > 0, chao.c[G_CHAO:], fundo.c[G_CHAO:])
    mesa, ocl = g_mesa(per, fogo, luzes)
    braseiro(mesa, fogo, 456, 139, per["fogo"], luzes, 81)
    ocl_b = Camada()
    ocl_b.c[:] = ocl.c
    lustre_roda(mesa, fogo, 208, 46, 30, per["velas"] >= 2, luzes)
    frente = g_frente()
    sombras = g_sombras()
    img = compor(per, fundo, mesa, frente, fogo, sombras, vidro, vidro_cor, luzes, G_CHAO, ocl_b)
    return acabamento(img, per, esquerda=0.36, seed=97)


# ═════════════════════════════════════ 2. SALA DO CONSELHO ═════════════════════════════════════
C_CHAO = 98
C_VITRAL = (252, 12, 48, 70)      # x, y, largura, altura
C_MESA = (250, 120, 64, 11)       # centro, meias-larguras da elipse do tampo
C_COFRE = (398, 84, 48, 40)       # x, y do topo da frente, largura, altura
PEDRA_C = ("#1a1820", "#363240", "#433e4e", "#504a5c", "#666074", "#868096")


def c_tampo_y(x: float) -> tuple[float, float] | None:
    cx, cy, rx, ry = C_MESA
    u = (x + 0.5 - cx) / rx
    if abs(u) > 1:
        return None
    d = ry * math.sqrt(1 - u * u)
    return cy - d, cy + d


def c_vitral(c: Camada, vidro: np.ndarray, vidro_cor: np.ndarray, nome: str) -> None:
    """O vitral ogival: barra de quadrados vermelhos e azuis, medalhão com a rosa dos ventos dourada sobre azul,
    duas lancetas de losangos verdes, âmbar e roxos e o medalhão de baixo com o osso branco sobre vermelho.
    A cor que passa depende da hora (sol branco, poente laranja, luar azul e fraco)."""
    x0, y0, w, h = C_VITRAL
    cx, r = x0 + w / 2, w / 2
    tinta = {"manha": (hexa("#fff6e8"), 1.0), "tarde": (hexa("#ffb878"), 0.95), "noite": (hexa("#8aa6f0"), 0.55)}[nome]
    pedra_t = ("#141218", "#2a2632", "#3e3a4a", "#55516a", "#6e6a84")

    def dentro(x, y, folga=0.0):
        rx = r + folga
        if y >= y0 + r:
            return abs(x + 0.5 - cx) <= rx and y < y0 + h + folga
        dy = y0 + r - (y + 0.5)
        d1 = math.hypot(x + 0.5 - (cx - rx * 0.45), dy)
        d2 = math.hypot(x + 0.5 - (cx + rx * 0.45), dy)
        return abs(x + 0.5 - cx) <= rx and d1 <= rx * 1.45 and d2 <= rx * 1.45

    for y in range(y0 - 22, y0 + h + 2):
        for x in range(int(cx - r - 6), int(cx + r + 7)):
            if dentro(x, y, 3) and not dentro(x, y, 0):
                lado = x < cx
                aduela = (int(math.atan2((y0 + r) - y, x - cx) * 8) % 2) if y < y0 + r else ((y - y0) // 6) % 2
                k = (3 if lado else 1) + aduela
                if dentro(x, y, 1.5):
                    k = 3 if lado else 0
                c.p(x, y, pedra_t[max(0, min(4, k))])
    mc1 = (cx, y0 + 30, 12.5)      # medalhão de cima
    mc2 = (cx, y0 + 58, 7.5)       # medalhão de baixo
    g = np.random.default_rng(301)
    for y in range(y0 - 20, y0 + h):
        for x in range(int(cx - r), int(cx + r) + 1):
            if not dentro(x, y):
                continue
            u = (x + 0.5 - cx) / r
            d1 = math.hypot(x + 0.5 - mc1[0], y + 0.5 - mc1[1])
            d2 = math.hypot(x + 0.5 - mc2[0], y + 0.5 - mc2[1])
            chumbo = False
            if abs(d1 - mc1[2]) < 0.7 or abs(d2 - mc2[2]) < 0.7:
                chumbo = True
                cor = None
            elif d1 < mc1[2]:
                ang = math.atan2(y + 0.5 - mc1[1], x + 0.5 - mc1[0])
                raio_estrela = mc1[2] * (0.38 + 0.5 * abs(math.cos(ang * 4)) ** 6) * (0.75 if int((ang + math.pi) / (math.pi / 4)) % 2 else 1)
                if d1 < 2.2:
                    cor = "#fff8e0"
                elif d1 < raio_estrela:
                    cor = "#f6c84a" if (x - mc1[0]) * (y - mc1[1]) < 0 else "#d89a28"
                else:
                    cor = "#1c3a9a" if (x + y) % 5 else "#2a4cb8"
                if d1 > mc1[2] - 2:
                    cor = "#c8283a"
            elif d2 < mc2[2]:
                cor = "#b81e2e" if (x + y) % 4 else "#d83040"
                xx, yy = x - int(mc2[0]) + 5, y - int(mc2[1]) + 2
                osso = [".#.....#.", "##.....##", ".#######.", "##.....##", ".#.....#."]
                if 0 <= yy < 5 and 0 <= xx < 9 and osso[yy][xx] == "#":
                    cor = "#f8f2e4"
            elif abs(u) > 0.76 or y < y0 + 4:
                # barra: quadrados alternados
                cor = "#c8283a" if ((y // 4) + (x > cx)) % 2 else "#2848b8"
                if (y % 4 == 0) or abs(abs(u) - 0.76) < 0.06:
                    chumbo = True
                elif (y // 4) % 3 == 0:
                    cor = "#f0c040"
            elif y < y0 + 14:
                cor = "#a01a2a" if (x * 3 + y) % 7 else "#d03848"
                if (x + y) % 6 == 0 or (x - y) % 6 == 0:
                    chumbo = True
            else:
                # lancetas: losangos
                q = ((x + y) // 5 + (x - y) // 5) % 3
                cor = ("#2a9a5a", "#e8a030", "#7a3aa8")[q]
                if (x + y) % 5 == 0 or (x - y) % 5 == 0:
                    chumbo = True
            if abs(x + 0.5 - cx) < 1.0 and y > y0 + 44 and not d2 < mc2[2] + 1:
                cor, chumbo = "#4a4656", False
                c.p(x, y, cor)
                continue
            if y in (y0 + 44, y0 + 45) and d1 > mc1[2] + 1 and d2 > mc2[2] + 1:
                c.p(x, y, "#5a5668" if y == y0 + 44 else "#2e2a36")
                continue
            if chumbo:
                c.p(x, y, "#18161c")
                vidro[y, x] = 0.12
                continue
            base = hexa(cor) * (0.9 + g.random() * 0.2)
            luz_t, k = tinta
            emis = base * luz_t * k
            c.c[y, x, :3] = emis
            c.c[y, x, 3] = 1
            vidro[y, x] = 1.0
            vidro_cor[y, x] = base * luz_t * k
    # peitoril
    c.ret(int(cx - r - 5), y0 + h, int(w + 11), 2, pedra_t[4])
    c.ret(int(cx - r - 5), y0 + h + 2, int(w + 11), 1, pedra_t[0])


def c_prateleira_rolos(c: Camada, x0: int, y0: int, x1: int, y1: int, seed: int) -> None:
    """Estante de escaninhos cheia de rolos de pergaminho (pontas em espiral, fitas e lacres), alguns livros e
    plaquinhas de latão; uma escada encostada."""
    g = np.random.default_rng(seed)
    madeira(c, x0 - 3, y0 - 4, x1 - x0 + 6, y1 - y0 + 4, CARVALHO, vertical=True, base=2, seed=seed)
    c.ret(x0 - 4, y0 - 6, x1 - x0 + 8, 3, CARVALHO[4])
    c.ret(x0 - 4, y0 - 6, x1 - x0 + 8, 1, CARVALHO[5])
    cw, ch = 12, 10
    for cy in range(y0, y1 - ch + 1, ch):
        for cx in range(x0, x1 - cw + 1, cw):
            # fundo do escaninho
            c.ret(cx + 1, cy + 1, cw - 1, ch - 1, "#0e0806")
            c.ret(cx + 1, cy + 1, cw - 1, 1, "#060302")
            c.ret(cx, cy, cw, 1, CARVALHO[4])
            c.ret(cx, cy, 1, ch, CARVALHO[3])
            tipo = g.random()
            if tipo < 0.72:
                # rolos deitados vistos de lado: cilindros de comprimentos diferentes, ponta clara, fita no meio
                n = 2 + int(g.random() * 2)
                for i in range(n):
                    ry = cy + ch - 3 - i * 3
                    comp = 6 + int(g.random() * 4)
                    rx = cx + 2 + int(g.random() * (cw - comp - 2))
                    tom = 3 if g.random() < 0.6 else 4
                    c.ret(rx, ry, comp, 1, PERGAMINHO[tom + 1 if tom < 5 else 5])
                    c.ret(rx, ry + 1, comp, 1, PERGAMINHO[tom])
                    c.ret(rx, ry + 2, comp, 1, PERGAMINHO[tom - 2])
                    c.ret(rx - 1, ry, 1, 3, PERGAMINHO[tom - 1])
                    c.p(rx - 1, ry + 1, PERGAMINHO[1])
                    if g.random() < 0.45:
                        cor_f = ("#c8302a", "#2c5aa8", "#2c8a4a", "#d8a032")[int(g.random() * 4)]
                        c.ret(rx + comp // 2, ry, 1, 3, cor_f)
                if g.random() < 0.3:
                    # fita pendurada para fora
                    fx = cx + 4 + int(g.random() * 5)
                    c.ret(fx, cy + ch - 1, 1, 3, "#b02a2a")
                    c.p(fx, cy + ch + 1, "#e04a3a")
            elif tipo < 0.88:
                # livros em pé
                x = cx + 2
                while x < cx + cw - 2:
                    larg = 2 if g.random() < 0.7 else 1
                    alt = ch - 3 - int(g.random() * 2)
                    cor = ("#6a1a1a", "#1a3a5a", "#2a4a2a", "#5a3a1a", "#3a2a4a")[int(g.random() * 5)]
                    c.ret(x, cy + ch - alt, larg, alt, cor)
                    c.p(x, cy + ch - alt + 2, METAIS["ouro"][3])
                    x += larg
            else:
                # um rolo grande deitado com lacre
                c.ret(cx + 2, cy + ch - 4, cw - 3, 3, PERGAMINHO[3])
                c.ret(cx + 2, cy + ch - 4, cw - 3, 1, PERGAMINHO[4])
                c.disco(cx + 6, cy + ch - 2.5, 1.2, ("#e04a3a", "#a01a1a", "#5a0a0a"))
            # plaquinha de latão
            c.ret(cx + cw // 2 - 1, cy + ch - 1, 3, 1, METAIS["ouro"][3])
    c.ret(x0 - 3, y1, x1 - x0 + 6, 2, CARVALHO[1])
    # escada encostada
    for lado in (0, 9):
        c.linha(x1 - 26 + lado, y0 + 2, x1 - 18 + lado, C_CHAO + 1, CARVALHO[4] if lado == 0 else CARVALHO[3])
    for j in range(6, C_CHAO - y0, 8):
        t = j / (C_CHAO - y0)
        xa = x1 - 26 + 8 * t
        c.ret(int(xa), y0 + j, 10, 1, CARVALHO[4])


def c_radiografia(c: Camada, x0: int, y0: int, w: int, h: int) -> None:
    """Negatoscópio emoldurado com a radiografia de uma mão: rádio, ulna, carpo, metacarpos e falanges."""
    ouro = METAIS["ouro"]
    c.ret(x0 - 3, y0 - 3, w + 6, h + 6, ouro[1])
    c.ret(x0 - 2, y0 - 2, w + 4, h + 4, ouro[3])
    c.ret(x0 - 2, y0 - 2, w + 4, 1, ouro[5])
    c.ret(x0 - 2, y0 - 2, 1, h + 4, ouro[4])
    c.ret(x0 + w + 1, y0 - 2, 1, h + 4, ouro[1])
    for (cx_, cy_) in ((x0 - 2, y0 - 2), (x0 + w + 1, y0 - 2), (x0 - 2, y0 + h + 1), (x0 + w + 1, y0 + h + 1)):
        c.p(cx_, cy_, ouro[6])
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            v = (x - x0) / w
            c.p(x, y, misturar("#2a3a4a", "#1a2432", v + (y - y0) / h * 0.3))
    ossos = "#dfeaf2"
    meio_o = "#a8bccc"
    mx = x0 + w // 2
    # antebraço
    for y in range(y0 + h - 8, y0 + h):
        c.ret(mx - 5, y, 3, 1, meio_o)
        c.p(mx - 5, y, ossos)
        c.ret(mx + 1, y, 3, 1, meio_o)
        c.p(mx + 1, y, ossos)
    # carpo
    for (dx, dy) in ((-4, -10), (-2, -11), (0, -11), (2, -10), (-3, -12), (-1, -13), (1, -13), (3, -12)):
        c.p(mx + dx, y0 + h + dy, ossos)
    # metacarpos e dedos (com os espaços articulares)
    dedos = [(-5, 7, -0.45), (-2, 11, -0.12), (0, 12, 0.0), (2, 11, 0.12), (4, 9, 0.3)]
    for i, (dx, comp, inc) in enumerate(dedos):
        bx, by = mx + dx, y0 + h - 14
        if i == 0:
            bx, by = mx - 5, y0 + h - 11
        for j in range(comp):
            if j in (5, 8, 10) and i > 0 or (i == 0 and j in (3, 5)):
                continue
            x = bx + inc * j * (1.6 if i == 0 else 1)
            c.p(round(x), by - j, ossos if j % 3 else meio_o)
    # placa e parafusos (uma fixação no rádio, piada interna)
    c.ret(mx - 6, y0 + h - 6, 1, 5, "#ffffff")
    for k in range(3):
        c.p(mx - 5, y0 + h - 5 + k * 2, "#ffffff")
    c.bitmap(x0 + 2, y0 + 2, ["#.#", ".#.", "#.#"], {"#": "#c8d8e8"}, 0.7)


def c_parede(per: dict, nome: str, fogo: Camada, luzes: list) -> tuple[Camada, np.ndarray, np.ndarray]:
    """Teto de caixotões, parede de pedra fria com lambri de carvalho, o vitral, a estante de rolos, a tapeçaria,
    o negatoscópio com a radiografia, a prateleira com a balança e o armário de livros-razão."""
    c = Camada()
    vidro = np.zeros((H, W), dtype=np.float32)
    vidro_cor = np.zeros((H, W, 3), dtype=np.float32)
    pedra(c, 0, 8, W, 76, PEDRA_C, 211, bw=15, bh=7)
    madeira(c, 0, 76, W, 22, CARVALHO, vertical=True, base=2, seed=212)
    for x0 in range(0, W, 26):
        c.ret(x0, 76, 2, 22, CARVALHO[1])
        c.ret(x0 + 4, 80, 18, 14, CARVALHO[3])
        c.ret(x0 + 5, 81, 16, 12, CARVALHO[2])
        c.ret(x0 + 4, 80, 18, 1, CARVALHO[5])
        c.ret(x0 + 4, 93, 18, 1, CARVALHO[1])
        c.ret(x0 + 7, 84, 12, 6, CARVALHO[3])
        c.ret(x0 + 7, 84, 12, 1, CARVALHO[1])
        c.ret(x0 + 7, 89, 12, 1, CARVALHO[4])
    c.ret(0, 75, W, 1, METAIS["ouro"][2])
    c.ret(0, 76, W, 1, CARVALHO[5])
    c.ret(0, 96, W, 2, CARVALHO[0])
    # teto de caixotões
    madeira(c, 0, 0, W, 8, CARVALHO, base=2, seed=213)
    for x in range(0, W, 32):
        c.ret(x, 0, 4, 8, CARVALHO[1])
        c.ret(x + 4, 1, 28, 5, CARVALHO[3])
        c.ret(x + 6, 2, 24, 3, CARVALHO[2])
        c.p(x + 18, 3, METAIS["ouro"][3])
    c.ret(0, 7, W, 1, METAIS["ouro"][2])
    c.ret(0, 8, W, 1, CARVALHO[0])
    # oclusão e manchas
    mancha = ruido(214, 24) * 0.6 + ruido(215, 8) * 0.4
    ys_, xs_ = np.mgrid[0:H, 0:W].astype(np.float32)
    ao = 1 - 0.4 * suave(24, 8, ys_) - 0.15 * suave(0.55, 0.85, mancha) - 0.12 * suave(80, 98, ys_)
    ao -= 0.25 * suave(70, 0, xs_)
    c.c[:C_CHAO, :, :3] *= np.clip(ao, 0.3, 1)[:C_CHAO, :, None]
    c_vitral(c, vidro, vidro_cor, nome)
    c_prateleira_rolos(c, 10, 16, 166, 96, 220)
    # tapeçaria com o brasão (pena e osso cruzados) entre a estante e o vitral
    estandarte(c, 194, 16, 36, 50, "verde", "coroa", fase=0.5, ponta="reta", vento=0.05)
    for lado in (-1, 1):
        x1, y1, x2, y2 = 212 - lado * 8, 34, 212 + lado * 8, 54
        c.linha(x1, y1, x2, y2, OSSO[1] if lado < 0 else "#f4f0e8")
        c.linha(x1 + 1, y1, x2 + 1, y2, OSSO[2] if lado < 0 else "#c8c0b0")
    c.disco(204.5, 34.5, 1.6, (OSSO[0], OSSO[1], OSSO[3]))
    c.disco(220.5, 54.5, 1.6, (OSSO[0], OSSO[1], OSSO[3]))
    c.bitmap(218, 31, ["..##", ".##.", "##..", "#..."], {"#": "#f4f0e8"})
    # arandelas dos dois lados do vitral
    for xs in (241, 311):
        c.ret(xs - 2, 56, 5, 1, METAIS["ouro"][3])
        c.ret(xs - 1, 57, 3, 1, METAIS["ouro"][1])
        c.linha(xs, 58, xs, 62, METAIS["ouro"][2])
        c.ret(xs - 2, 62, 5, 2, METAIS["ouro"][2])
        vela(c, fogo, xs, 56, 5, per["velas"] >= 2, luzes, 0.8, 34)
    c_radiografia(c, 334, 24, 28, 34)
    # prateleira da balança, em cima do cofre
    cx_b = C_COFRE[0] + C_COFRE[2] // 2
    madeira(c, cx_b - 26, 60, 52, 3, CARVALHO, base=3, seed=230)
    c.ret(cx_b - 26, 60, 52, 1, CARVALHO[5])
    for xb in (cx_b - 20, cx_b + 18):
        for j in range(5):
            c.ret(xb, 63 + j, 5 - j, 1, CARVALHO[2])
    ouro = METAIS["ouro"]
    c.ret(cx_b - 4, 58, 9, 2, ouro[2])
    c.ret(cx_b - 4, 58, 9, 1, ouro[4])
    c.ret(cx_b, 42, 1, 16, ouro[4])
    c.ret(cx_b + 1, 42, 1, 16, ouro[2])
    c.disco(cx_b + 0.5, 41, 1.4, (ouro[6], ouro[4], ouro[2]))
    c.linha(cx_b - 12, 45, cx_b + 12, 43, ouro[4])
    for (px_, py_) in ((cx_b - 12, 45), (cx_b + 12, 43)):
        c.linha(px_, py_, px_ - 4, py_ + 8, ouro[2])
        c.linha(px_, py_, px_ + 4, py_ + 8, ouro[2])
        c.ret(px_ - 5, py_ + 8, 11, 1, ouro[4])
        c.ret(px_ - 4, py_ + 9, 9, 1, ouro[2])
    # na balança: um osso de um lado, moedas do outro (pesando um contra o outro)
    c.bitmap(cx_b - 16, 50, ["#.....#", "#######", "#.....#"], {"#": OSSO[1]})
    for k in range(3):
        c.ret(cx_b + 9, 49 - k, 6, 1, ouro[4] if k % 2 else ouro[3])
    vela(c, fogo, cx_b + 22, 60, 6, per["velas"] >= 1, luzes, 0.7, 30)
    # armário de livros-razão na ponta direita
    madeira(c, 456, 14, 24, 84, CARVALHO, vertical=True, base=2, seed=240)
    for yb in range(18, 96, 13):
        c.ret(458, yb + 11, 22, 2, CARVALHO[4])
        x = 459
        g = np.random.default_rng(yb)
        while x < 480:
            larg = 3 + int(g.random() * 2)
            cor = ("#5a1a14", "#2a1a10", "#3a2a1a", "#1a2a3a")[int(g.random() * 4)]
            c.ret(x, yb + 2, larg, 9, cor)
            c.ret(x, yb + 4, larg, 1, ouro[3])
            c.ret(x, yb + 8, larg, 1, ouro[2])
            x += larg + 1
    return c, vidro, vidro_cor


def piso_lajes(c: Camada, chao_y: int, fuga: tuple[float, float], k: float, f: float, tons, seed: int) -> None:
    """Lajes de pedra em perspectiva (amostradas 4 x 4): fiadas desencontradas, tom por laje, desgaste e juntas."""
    g = np.random.default_rng(seed)
    tom = g.random(4096)
    fx, fy = fuga
    ss = 4
    ys, xs = np.mgrid[chao_y * ss:H * ss, 0:W * ss].astype(np.float32)
    ys, xs = (ys + 0.5) / ss, (xs + 0.5) / ss
    prof = ys - fy
    v = k * f / prof
    iv = np.floor(v / 1.4).astype(np.int32)
    u = (xs - fx) * k / prof + (iv % 2) * 0.5
    iu = np.floor(u / 1.6).astype(np.int32)
    t = tom[(iu * 31 + iv * 17) % 4096]
    fu, fv = (u / 1.6) % 1, (v / 1.4) % 1
    nv = np.asarray(Image.fromarray((ruido(seed + 5, 6) * 255).astype(np.uint8)).resize((W * ss, H * ss), Image.BILINEAR),
                    dtype=np.float32)[chao_y * ss:] / 255
    base = np.stack([hexa(tons[1]), hexa(tons[2]), hexa(tons[3]), hexa(tons[4])])
    idx = np.clip((t * 2.6 + nv * 1.2).astype(np.int32), 0, 3)
    cor = base[idx]
    cor = np.where(((fu < 0.035) | (fv < 0.05))[..., None], hexa(tons[0]), cor)
    cor = np.where(((fv > 0.05) & (fv < 0.12))[..., None], cor * 1.1, cor)
    cor = cor.reshape(H - chao_y, ss, W, ss, 3).mean((1, 3))
    c.c[chao_y:, :, :3] = cor
    c.c[chao_y:, :, 3] = 1


def c_chao() -> Camada:
    """Lajes de pedra e o grande tapete redondo debaixo da mesa (medalhão, barra de ondas e franja)."""
    c = Camada()
    piso_lajes(c, C_CHAO, (250, 40), 7.0, 110, ("#141218", "#2e2a34", "#3a3640", "#46424c", "#56525e"), 251)
    tcx, tcy, rx, ry = 250, 134, 104, 16
    for y in range(int(tcy - ry) - 2, min(H, int(tcy + ry) + 3)):
        for x in range(int(tcx - rx) - 3, int(tcx + rx) + 4):
            d = math.hypot((x + 0.5 - tcx) / rx, (y + 0.5 - tcy) / ry)
            if d > 1.03:
                continue
            ang = math.atan2((y - tcy) / ry, (x - tcx) / rx)
            if d > 1.0:
                cor = "#d8c8a0" if (x % 2) else "#a89870"
            elif d > 0.95:
                cor = "#1a2a5a"
            elif d > 0.84:
                onda = math.sin(ang * 26) * 0.03
                cor = "#c89a3a" if abs(d - 0.895 - onda) < 0.022 else "#2a3a7a"
            elif d > 0.8:
                cor = "#8a1a24"
            else:
                pet = abs(math.cos(ang * 4)) ** 3
                cor = "#6a1420" if d > 0.3 + pet * 0.35 else "#8a2230"
                if abs(d - (0.3 + pet * 0.35)) < 0.04:
                    cor = "#d8a848"
                if d < 0.14:
                    cor = "#d8a848" if d > 0.08 else "#2a3a7a"
            if (x * 3 + y * 5) % 7 == 0:
                cor = misturar(cor, "#000000", 0.15)
            c.p(x, y, cor)
    return c


def c_cadeira(c: Camada, x0: int, w: int, y_topo: int, y_assento: int, y_pe: int, lado: bool = False) -> None:
    """Cadeira de espaldar alto entalhado, estofado vermelho com tachas de latão."""
    madeira(c, x0, y_topo, w, y_assento - y_topo, CARVALHO, vertical=True, base=3, seed=x0)
    c.ret(x0, y_topo, w, 1, CARVALHO[5])
    c.ret(x0, y_topo, 1, y_assento - y_topo, CARVALHO[5])
    c.ret(x0 + w - 1, y_topo, 1, y_assento - y_topo, CARVALHO[1])
    # coroamento entalhado
    for i in range(w):
        dy = round(2.5 * math.sin(i / max(1, w - 1) * math.pi))
        for j in range(dy):
            c.p(x0 + i, y_topo - 1 - j, CARVALHO[4] if j == dy - 1 else CARVALHO[3])
    c.p(x0 + w // 2, y_topo - 4, METAIS["ouro"][4])
    # estofado
    c.ret(x0 + 2, y_topo + 3, w - 4, y_assento - y_topo - 5, "#7a1a22")
    c.ret(x0 + 2, y_topo + 3, w - 4, 1, "#a82a32")
    c.ret(x0 + w - 3, y_topo + 3, 1, y_assento - y_topo - 5, "#4a0e14")
    for y in range(y_topo + 3, y_assento - 2, 3):
        c.p(x0 + 2, y, METAIS["ouro"][4])
        c.p(x0 + w - 3, y, METAIS["ouro"][3])
    if lado:
        c.ret(x0 - 2, y_assento, w + 10, 2, "#8a1e28")
        c.ret(x0 - 2, y_assento + 2, w + 10, 2, CARVALHO[2])
        for xl in (x0, x0 + w + 6):
            c.ret(xl, y_assento + 4, 2, y_pe - y_assento - 4, CARVALHO[3])
            c.p(xl, y_pe - 1, CARVALHO[1])


def c_mapa(c: Camada, g: np.random.Generator) -> list:
    """O mapa aberto em cima da mesa: papel em perspectiva com mar, costa, montanhas, florestas, rio, a rota
    tracejada vermelha até o X, a rosa dos ventos e os peões. Devolve brilhos (as pontas dos peões dourados)."""
    far, near = 111, 128
    xa0, xb0, xa1, xb1 = 214, 288, 204, 300
    terra = ruido(261, 9) * 0.65 + ruido(262, 4) * 0.35

    def borda(y):
        t = (y - far) / (near - far)
        return xa0 + (xa1 - xa0) * t, xb0 + (xb1 - xb0) * t

    for y in range(far, near):
        xa, xb = borda(y)
        for x in range(int(round(xa)), int(round(xb))):
            u = (x - xa) / (xb - xa)
            vv = (y - far) / (near - far)
            n = terra[40 + int(vv * 26), 150 + int(u * 110)]
            cor = PERGAMINHO[4] if n > 0.5 else "#93acae"
            if n > 0.5:
                viz = min(terra[40 + int(vv * 26) + dy_, 150 + int(u * 110) + dx_] for dy_ in (-1, 0, 1) for dx_ in (-1, 0, 1))
                if viz <= 0.5:
                    cor = "#7a5a3a"
            elif n > 0.47:
                cor = "#a8c0bc"
            # borda do papel e cantos enrolados
            if x == int(round(xa)) or x == int(round(xb)) - 1 or y in (far, near - 1):
                cor = PERGAMINHO[2]
            c.p(x, y, cor)
    # montanhas (^) em terra alta
    for (mx, my) in ((236, 114), (241, 115), (246, 114), (270, 120), (274, 121)):
        c.p(mx, my, "#5a4430")
        c.p(mx - 1, my + 1, "#5a4430")
        c.p(mx + 1, my + 1, "#8a7050")
        c.p(mx, my - 1, "#f4ecd8")
    # florestas (tufos de três pontinhos)
    for (fx_, fy_) in ((230, 117), (233, 118), (256, 122), (259, 121), (282, 119), (285, 120), (248, 125)):
        if c.c[fy_, fx_, 0] > 0.7:
            c.p(fx_, fy_, "#4a7a3a")
            c.p(fx_ + 1, fy_, "#3a6a2a")
            c.p(fx_, fy_ - 1, "#6a9a4a")
    # rio
    for i in range(18):
        c.p(250 + i * 0.8, 114 + i * 0.6 + math.sin(i * 0.8), "#4a7aa8")
    # rota tracejada até o X
    pts = [(222, 124), (232, 120), (246, 121), (258, 117), (276, 116)]
    for (a, b) in zip(pts, pts[1:]):
        n = int(math.hypot(b[0] - a[0], b[1] - a[1]))
        for i in range(n):
            if i % 3 < 2:
                t = i / n
                c.p(round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t), "#b82020")
    c.bitmap(276, 114, ["#.#", ".#.", "#.#"], {"#": "#d82020"})
    # rosa dos ventos no canto de baixo
    rx, ry = 290, 124
    c.linha(rx - 4, ry, rx + 4, ry, "#5a4430")
    c.linha(rx, ry - 3, rx, ry + 3, "#5a4430")
    c.p(rx, ry - 3, "#b82020")
    c.p(rx, ry, METAIS["ouro"][4])
    # peões e bandeirinhas
    brilhos = []
    for (px_, py_, cor) in ((228, 121, "#c8302a"), (252, 118, "#2c5aa8"), (264, 124, "#2c8a4a"), (276, 112, METAIS["ouro"][4])):
        c.p(px_ + 1, py_ + 1, "#000000", 0.35)
        c.ret(px_, py_ - 2, 1, 3, cor)
        c.p(px_, py_ - 3, cor)
        c.p(px_ - 1, py_, cor)
        c.p(px_ + 1, py_, misturar(cor, "#000000", 0.4))
        c.p(px_, py_ - 3, misturar(cor, "#ffffff", 0.5))
        brilhos.append((px_, py_ - 3))
    c.ret(240, 112, 1, 4, "#3a2a1a")
    c.ret(241, 112, 3, 2, "#e8c040")
    # canto enrolado (perto, à direita) e o fêmur de peso no canto de trás
    for j in range(4):
        c.ret(xb1 - 4 + j, near - 4 + j, 4 - j, 1, PERGAMINHO[5] if j < 2 else PERGAMINHO[3])
    c.bitmap(214, 109, [".#.........#.", "##.........##", ".###########.", "##.........##", ".#.........#."],
             {"#": OSSO[1]})
    c.ret(216, 111, 9, 1, OSSO[0])
    c.ret(216, 113, 9, 1, OSSO[3])
    # lupa sobre o mapa
    c.disco(262, 123, 2.6, ("#d8eaf4", "#9ab8cc", "#5a7a8a"))
    c.p(261, 122, "#ffffff")
    for i in range(4):
        c.p(264 + i, 125 + i // 2, MADEIRA[3])
    return brilhos


def c_mesa(per: dict, fogo: Camada, luzes: list) -> tuple[Camada, Camada, list]:
    """Cadeiras, a mesa redonda de pé central entalhado, o mapa, o livro-razão, pena e tinteiro, velas, moedas."""
    c = Camada()
    cx, cy, rx, ry = C_MESA
    # cadeiras de trás (só o espaldar aparece) e a da esquerda, de lado
    c_cadeira(c, 204, 16, 86, 112, 112)
    c_cadeira(c, 280, 16, 84, 112, 112)
    # tampo: elipse de carvalho com tábuas radiais e borda moldurada
    for y in range(cy - ry - 1, cy + ry + 5):
        for x in range(cx - rx - 1, cx + rx + 2):
            d = math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry)
            d_b = math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy - 4) / ry)
            if d <= 1:
                v = NV_MADEIRA[(y * 7) % H, x % W] * 0.6 + NV_MADEIRA2[(y * 3) % H, (x * 2) % W] * 0.4
                k = 4 if v > 0.62 else 3 if v > 0.36 else 2
                if d > 0.93:
                    k = 5 if y < cy else 4
                if 0.86 < d < 0.89:
                    k = 1
                c.p(x, y, CARVALHO[k])
            elif d_b <= 1 and y >= cy:
                # espessura da borda (meia elipse da frente)
                u = (x + 0.5 - cx) / rx
                c.p(x, y, CARVALHO[3] if u < -0.4 else CARVALHO[2] if u < 0.5 else CARVALHO[1])
                if d_b > 0.96 or y == cy + ry + 3:
                    c.p(x, y, CARVALHO[0])
    # pé central: coluna torneada e garras
    for y in range(cy + ry + 4, 146):
        t = (y - cy - ry - 4) / (146 - cy - ry - 4)
        meia = 5 + 3 * abs(math.sin(t * math.pi * 2.2)) if t < 0.75 else 6 + (t - 0.75) * 30
        for x in range(int(cx - meia), int(cx + meia) + 1):
            u = (x - cx) / max(meia, 1)
            c.p(x, y, CARVALHO[4] if u < -0.4 else CARVALHO[3] if u < 0.2 else CARVALHO[2] if u < 0.7 else CARVALHO[1])
    for lado in (-1, 1):
        for j in range(5):
            c.ret(cx + lado * (8 + j * 2) - (2 if lado < 0 else 0), 141 + j // 2, 3, 2, CARVALHO[3] if lado < 0 else CARVALHO[2])
        c.disco(cx + lado * 18, 145, 1.6, (METAIS["ouro"][5], METAIS["ouro"][3], METAIS["ouro"][1]))
    ocl = Camada()
    ocl.c[:] = c.c
    g = np.random.default_rng(271)
    brilhos = c_mapa(c, g)
    # livro-razão aberto: capa de couro, páginas com colunas de números, fita
    lx0, ly0 = 190, 120
    c.ret(lx0 - 1, ly0 - 1, 24, 9, "#5a1a14")
    c.ret(lx0 - 1, ly0 + 7, 24, 1, "#3a0e0a")
    for y in range(ly0, ly0 + 7):
        for x in range(lx0, lx0 + 22):
            meio_p = abs(x - (lx0 + 11)) < 1
            cor = PERGAMINHO[5] if x < lx0 + 11 else PERGAMINHO[4]
            if meio_p:
                cor = PERGAMINHO[2]
            elif (y - ly0) % 2 == 1 and ((x - lx0) % 11) not in (0, 1, 10) and (x * 7 + y * 3) % 5:
                cor = "#4a3a2a" if (x - lx0) % 11 < 7 else "#a82a24"
            c.p(x, y, cor)
    c.ret(lx0 + 11, ly0 + 7, 1, 3, "#c8302a")
    # tinteiro e pena
    c.disco(217.5, 120, 2.2, ("#4a5a6a", "#1a222a", "#0a0e12"))
    c.ret(216, 117, 3, 1, "#2a3440")
    for i in range(10):
        x, y = 218 + i * 0.6, 117 - i
        c.p(x, y, "#f4f0e8" if i > 2 else "#c8c0b0")
        if i > 3:
            c.p(x + 1, y, "#d8d0c4" if i % 2 else "#ffffff")
            c.p(x - 1, y + 1, "#b8b0a0", 0.8)
    # selo de cera e o bastão de lacre
    c.ret(232, 126, 6, 1, "#b02020")
    c.ret(232, 127, 6, 1, "#7a1010")
    c.ret(240, 124, 2, 3, MADEIRA[3])
    c.disco(241, 127.2, 1.4, (METAIS["ouro"][5], METAIS["ouro"][3], METAIS["ouro"][1]))
    # castiçais altos de prata e as velas
    for (xv, yb, alt) in ((227, 113, 6), (293, 117, 5)):
        m = METAIS["ouro"]
        c.ret(xv - 3, yb - 1, 7, 1, m[2])
        c.ret(xv - 2, yb - 2, 5, 1, m[4])
        c.ret(xv, yb - 6, 2, 4, m[3])
        c.p(xv, yb - 6, m[5])
        c.p(xv, yb - 4, m[6])
        c.ret(xv - 2, yb - 7, 6, 1, m[4])
        c.ret(xv - 1, yb - 6, 4, 1, m[1])
        vela(c, fogo, xv, yb - 7, alt, per["velas"] >= 1, luzes, 1.0, 36, grossa=True)
    # pilhas de moedas e uma bolsa
    for (mx, my, n) in ((300, 125, 5), (305, 123, 3), (296, 127, 2)):
        for k in range(n):
            c.ret(mx - 2, my - k, 5, 1, METAIS["ouro"][4] if k % 2 else METAIS["ouro"][3])
            c.p(mx - 2, my - k, METAIS["ouro"][5])
        brilhos.append((mx - 1, my - n))
    c.disco(306, 128, 2.6, ("#a87a4a", "#7a4a24", "#4a2a12"), achatar=0.7)
    c.ret(305, 125, 3, 1, "#c8a040")
    ocl2 = Camada()
    ocl2.c[:] = c.c
    return c, ocl2, brilhos


def c_cofre(c: Camada, fogo: Camada, brilhos: list) -> None:
    """O cofre de ferro: frente rebitada com chapas, cantoneiras de latão, o disco do segredo com marcas, o volante
    da maçaneta, o espelho da fechadura, pés de bola; em cima, livros-razão e uma bolsinha; moedas no chão."""
    x0, y0, w, h = C_COFRE
    f = FERRO
    ouro = METAIS["ouro"]
    # lateral direita (em perspectiva) e tampo
    for y in range(y0 - 3, y0 + h):
        for x in range(x0 + w, x0 + w + 6):
            topo = y0 - 3 + (x - x0 - w) * 0.5
            if y >= topo:
                c.p(x, y, f[1] if (y + x) % 9 else f[0])
    for y in range(y0 - 3, y0):
        for x in range(x0 + (y0 - y) * 2 - 6 + 6, x0 + w + (y0 - y) * 2):
            c.p(x, y, f[4] if y == y0 - 3 else f[3])
    # frente
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            v = NV_GRAO[y, x]
            c.p(x, y, f[3] if v > 0.6 else f[2])
    c.ret(x0, y0, w, 1, f[5])
    c.ret(x0, y0, 1, h, f[4])
    c.ret(x0 + w - 1, y0, 1, h, f[1])
    c.ret(x0, y0 + h - 1, w, 1, f[0])
    # porta com moldura e rebites
    px0, py0, pw, ph = x0 + 4, y0 + 4, w - 8, h - 8
    c.ret(px0, py0, pw, ph, f[2])
    c.ret(px0, py0, pw, 1, f[1])
    c.ret(px0, py0, 1, ph, f[1])
    c.ret(px0 + pw - 1, py0, 1, ph, f[4])
    c.ret(px0, py0 + ph - 1, pw, 1, f[4])
    for x in range(x0 + 2, x0 + w - 1, 4):
        for y in (y0 + 2, y0 + h - 3):
            c.p(x, y, f[6])
            c.p(x + 1, y + 1, f[0])
    for y in range(y0 + 6, y0 + h - 4, 4):
        for x in (x0 + 2, x0 + w - 3):
            c.p(x, y, f[6])
            c.p(x + 1, y + 1, f[0])
    # cantoneiras de latão
    for (cx_, cy_, sx, sy) in ((x0, y0, 1, 1), (x0 + w - 1, y0, -1, 1), (x0, y0 + h - 1, 1, -1), (x0 + w - 1, y0 + h - 1, -1, -1)):
        for i in range(5):
            for j in range(5 - i):
                c.p(cx_ + sx * i, cy_ + sy * j, ouro[4] if i + j < 2 else ouro[3] if i + j < 4 else ouro[2])
    # disco do segredo
    dx_, dy_ = x0 + 17, y0 + h // 2
    c.disco(dx_ + 0.5, dy_ + 0.5, 7.5, (f[5], f[4], f[1]))
    c.disco(dx_ + 0.5, dy_ + 0.5, 5.2, (ouro[5], ouro[3], ouro[1]))
    c.disco(dx_ + 0.5, dy_ + 0.5, 2.5, (f[4], f[2], f[0]))
    for k in range(16):
        a = k / 16 * math.tau
        c.p(round(dx_ + 0.5 + math.cos(a) * 6.6 - 0.5), round(dy_ + 0.5 + math.sin(a) * 6.6 - 0.5), f[6] if k % 4 == 0 else f[1])
    c.p(dx_, dy_ - 7, "#d83020")
    c.p(dx_ - 2, dy_ - 2, "#ffffff")
    brilhos.append((dx_ - 2, dy_ - 3))
    # volante da maçaneta
    vx, vy = x0 + 34, y0 + h // 2
    for k in range(3):
        a = k / 3 * math.tau + 0.4
        c.linha(vx, vy, vx + math.cos(a) * 5, vy + math.sin(a) * 5, ouro[3])
        c.disco(vx + math.cos(a) * 5 + 0.5, vy + math.sin(a) * 5 + 0.5, 1.2, (ouro[6], ouro[4], ouro[2]))
    c.disco(vx + 0.5, vy + 0.5, 1.6, (ouro[5], ouro[3], ouro[1]))
    # espelho da fechadura
    c.ret(x0 + 31, y0 + h - 11, 6, 6, ouro[3])
    c.ret(x0 + 31, y0 + h - 11, 6, 1, ouro[5])
    c.ret(x0 + 33, y0 + h - 10, 2, 2, "#000000")
    c.p(x0 + 33, y0 + h - 8, "#000000")
    # placa do fabricante
    c.ret(x0 + 12, y0 + 6, 24, 3, ouro[2])
    c.ret(x0 + 13, y0 + 7, 22, 1, ouro[4])
    for x in range(x0 + 15, x0 + 33, 2):
        c.p(x, y0 + 7, ouro[1])
    # pés
    for xp in (x0 + 3, x0 + w - 6):
        c.disco(xp + 1.5, y0 + h + 1, 2, (f[5], f[3], f[1]))
    # livros-razão e a bolsinha em cima
    for k, cor in enumerate(("#5a1a14", "#1a3a5a", "#3a2a1a")):
        c.ret(x0 + 6 + k, y0 - 6 - k * 3, 22 - k * 2, 3, cor)
        c.ret(x0 + 6 + k, y0 - 6 - k * 3, 22 - k * 2, 1, misturar(cor, "#ffffff", 0.25))
        c.ret(x0 + 27 - k, y0 - 5 - k * 3, 1, 2, PERGAMINHO[4])
    c.disco(x0 + 36, y0 - 6, 3.4, ("#b8844a", "#8a5a2a", "#4a2a12"), achatar=0.8)
    c.ret(x0 + 35, y0 - 10, 3, 1, ouro[3])
    # moedas que escaparam, no chão
    for (mx, my) in ((x0 - 4, y0 + h + 3), (x0 - 9, y0 + h + 6), (x0 + 6, y0 + h + 7), (x0 - 1, y0 + h + 8)):
        c.ret(mx, my, 3, 1, ouro[4])
        c.p(mx, my, ouro[6])
        brilhos.append((mx, my))


def c_lustre(c: Camada, fogo: Camada, cx: int, y: int, larg: int, acesa: bool, luzes: list) -> None:
    """Lustre de anel de ferro com velas e pingentes de cristal."""
    for yy in range(8, y - 5):
        c.p(cx, yy, FERRO[4] if yy % 2 else FERRO[2])
    for lado in (-1, 1):
        c.linha(cx, y - 5, cx + lado * larg // 2, y, FERRO[3])
    meia = larg // 2
    for i in range(-meia, meia + 1):
        yy = y + round(2 * (1 - (i / meia) ** 2))
        c.p(cx + i, yy, FERRO[4] if i < 0 else FERRO[2])
        c.p(cx + i, yy + 1, FERRO[1])
        c.p(cx + i, y - round(1.4 * (1 - (i / meia) ** 2)) + 1, FERRO[2], 0.8)
    for i in range(-meia, meia + 1, max(3, larg // 6)):
        yy = y + round(2 * (1 - (i / meia) ** 2))
        vela(c, fogo, cx + i, yy, 3, acesa, luzes, 0.45, 26)
        c.p(cx + i, yy + 2, "#c8e0ff")
        c.p(cx + i, yy + 3, "#ffffff", 0.6)


def c_frente() -> Camada:
    """Primeiro plano desfocado: cesto de rolos à esquerda, globo terrestre no pé à direita."""
    c = Camada()
    for y in range(128, H):
        meia = 18 + (y - 128) * 0.15
        for x in range(int(26 - meia), int(26 + meia)):
            trama = (x + y) % 3 == 0 or (x - y) % 4 == 0
            c.p(x, y, "#7a5a32" if trama else "#a07a46")
    c.elipse(26, 128, 18, 2.5, "#4a3420")
    for (rx, ry) in ((16, 120), (22, 116), (30, 118), (36, 122), (26, 112)):
        for j in range(12):
            c.p(rx + j * 0.2, ry + j, PERGAMINHO[3])
            c.p(rx + 1 + j * 0.2, ry + j, PERGAMINHO[2])
        c.disco(rx + 0.5, ry, 1.6, (PERGAMINHO[5], PERGAMINHO[3], PERGAMINHO[1]))
    # globo
    gx, gy, gr = 470, 124, 14
    for y in range(gy - gr, gy + gr + 1):
        for x in range(gx - gr, gx + gr + 1):
            d = math.hypot(x - gx, y - gy)
            if d <= gr:
                n = NV_MADEIRA[(y * 3) % H, (x * 5) % W]
                cor = "#4a7a5a" if n > 0.55 else "#3a5a8a"
                if x - gx < -gr * 0.3 and y - gy < 0:
                    cor = misturar(cor, "#ffffff", 0.2)
                if x - gx > gr * 0.4:
                    cor = misturar(cor, "#000000", 0.35)
                c.p(x, y, cor)
    for k in range(-gr - 2, gr + 3):
        a = k / (gr + 2)
        c.p(gx + round(math.sin(a * 1.4) * (gr + 2) * 0.3) - 1, gy + k, METAIS["ouro"][3])
    c.ret(gx - 2, gy + gr + 1, 4, 14, MADEIRA[3])
    c.ret(gx - 10, H - 4, 20, 4, MADEIRA[2])
    return c


def c_sombras() -> Camada:
    c = Camada()
    cx, cy, rx, ry = C_MESA
    for y in range(cy, 150):
        for x in range(cx - rx - 6, cx + rx + 8):
            d = math.hypot((x - cx - 3) / (rx + 2), (y - 140) / 10)
            if d < 1:
                c.p(x, y, "#000000", 0.55 * (1 - d) ** 0.6)
    x0, y0, w, h = C_COFRE
    c.ret(x0 - 2, y0 + h - 1, w + 12, 4, "#000000", 0.5)
    return c


def montar_conselho(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    fogo = Camada()
    luzes: list = []
    fundo, vidro, vidro_cor = c_parede(per, nome, fogo, luzes)
    chao = c_chao()
    fundo.c[C_CHAO:] = np.where(chao.c[C_CHAO:, :, 3:4] > 0, chao.c[C_CHAO:], fundo.c[C_CHAO:])
    meio, ocl, brilhos = c_mesa(per, fogo, luzes)
    c_cofre(meio, fogo, brilhos)
    ocl.c = np.maximum(ocl.c, meio.c * (np.arange(W)[None, :, None] > 390))
    c_lustre(meio, fogo, C_MESA[0], 24, 34, per["velas"] >= 2, luzes)
    if nome == "noite":
        luzes = [(x, y, r * 1.25, cor, k * 1.7) for (x, y, r, cor, k) in luzes]
    elif nome == "tarde":
        luzes = [(x, y, r * 1.1, cor, k * 1.25) for (x, y, r, cor, k) in luzes]
    # o negatoscópio: luz fria e fraca (mais visível à noite)
    luzes.append((348, 41, 30, "#9ac0ff", {"manha": 0.1, "tarde": 0.12, "noite": 0.35}[nome]))
    # a sala inteira recebe a luz difusa do vitral, na cor média dele
    vx, vy, vw, vh = C_VITRAL
    media = vidro_cor[vy:vy + vh, vx:vx + vw].reshape(-1, 3).mean(0)
    media = media / max(1e-3, float(media.max()))
    k_dif = {"manha": 0.42, "tarde": 0.46, "noite": 0.14}[nome]
    extra = (luz_pontual(vx + vw / 2, vy + vh * 0.7, 150, 0.7)[:, :, None] * media * k_dif
             + luz_pontual(vx + vw / 2, C_CHAO + 18, 70, 0.4)[:, :, None] * media * k_dif * 0.8)
    tampo = np.zeros((H, W), dtype=np.float32)
    cx, cy, rx, ry = C_MESA
    yy, xx = np.mgrid[0:H, 0:W]
    tampo[((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1] = 1
    img = compor(per, fundo, meio, c_frente(), fogo, c_sombras(), vidro, vidro_cor, luzes, C_CHAO, ocl,
                 feixe_colorido=True, comp_feixe=90, desf_patch=4.5, patch_meio=tampo, k_feixe=0.6, k_patch_meio=0.4,
                 proj={"manha": (0.55, -0.3), "tarde": (0.72, -0.85), "noite": (0.5, 0.3)}[nome], extra_luz=extra)
    # brilho do negatoscópio (emissivo) e cintilância do metal
    rad = np.zeros((H, W), dtype=np.float32)
    rad[24:58, 334:362] = {"manha": 0.25, "tarde": 0.3, "noite": 0.7}[nome]
    ra = desfocar(ampliar(rad[:, :, None]), 1.0)
    img += img * ra * 1.2
    xs = np.mgrid[0:H * ESC, 0:W * ESC][1]
    for (bx, by) in brilhos:
        X, Y = int(bx * ESC + 1), int(by * ESC + 1)
        if not (6 < X < W * ESC - 6 and 6 < Y < H * ESC - 6):
            continue
        forca = 0.5 + float(img[Y, X].mean()) * 0.8
        r = 3 + int(forca * 2)
        for d in range(-r, r + 1):
            k = (1 - abs(d) / (r + 1)) ** 2 * forca * 0.7
            img[Y + d, X] += k * hexa("#fff4d8")
            img[Y, X + d] += k * hexa("#fff4d8")
    return acabamento(img, per, esquerda=0.38, seed=131)


# ─────────────────────────────── Saída ───────────────────────────────
CENAS = {"guilda": montar_guilda, "conselho": montar_conselho}


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    args = sys.argv[1:]
    lugares = [a for a in args if a in CENAS] or list(CENAS)
    periodos = [a for a in args if a in PERIODOS] or list(PERIODOS)
    for lugar in lugares:
        for nome in periodos:
            img = CENAS[lugar](nome)
            base = PASTA / f"{lugar}-{nome}"
            img.save(f"{base}.webp", quality=84, method=6)
            img.resize((960, 320), Image.LANCZOS).save(f"{base}-960.webp", quality=84, method=6)
            print(f"{lugar}-{nome}", Path(f"{base}.webp").stat().st_size // 1024, "KB,",
                  Path(f"{base}-960.webp").stat().st_size // 1024, "KB (960)")


if __name__ == "__main__":
    main()
