"""Cenário "HD-2D" do topo da página inicial (30/10/2026, pedido do Tales com o Octopath Traveler II de referência).

Nada baixado nem gerado por IA: cada pixel sai das funções abaixo. O cenário é pintado em pixel art (480 x 200),
camada por camada, e montado em 3x com a luz calculada por pixel, como nos jogos "HD-2D" (o mesmo jeito das cenas das
seções: gerar_cena_biblioteca.py, gerar_cena_atlas.py e gerar_cena_arena.py):
- uma clareira numa mata fechada, vista de cima: dossel em primeiro plano, árvores do meio, mata do fundo enevoada e,
  por uma abertura, o castelo da prova sobre um morro distante;
- cada copa é feita folha por folha (carimbos de 3 a 5 pixels sombreados como uma esfera), troncos com casca, musgo e
  raízes, capim fio a fio, flores, cogumelos, pedrinhas, folhas caídas, o lago com a ponte de pedra e o reflexo;
- o acampamento: barraca de lona, fogueira (só pedras, lenha e cinza; o fogo animado entra por cima), lampião num toco,
  lanterna pendurada num galho, panela num tripé ao lado, saco de dormir, mochila, caixotes, barril, placa e livros;
- luz: ambiente da hora, sol salpicado pelas folhas com bordas em degraus de pixel art, sombras projetadas (do sol ou,
  à noite, da fogueira), luz quente da fogueira e das lanternas, feixes volumétricos com poeira, névoa por distância,
  vaga-lumes à noite, brilho (bloom), curva de tom, correção de cor e vinheta.
Três horas do dia em public/pixel/inicio/: cena-manha, cena-tarde e cena-noite (.webp, 1440 x 600 e 960 x 400).

A fogueira, o esqueleto e o gato ficam fora do cenário: são animados e clicáveis (componentes/inicio/cena/CenaDiorama.tsx)
e entram por cima, nas áreas de LIVRE (em pixels da arte), que ficam como chão aberto.
Uso: python3 scripts/gerar_cena_inicio.py            (as três)
     python3 scripts/gerar_cena_inicio.py noite      (só uma)
"""
from __future__ import annotations

import math
import sys
import time
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"
W, H, ESC = 480, 200, 3
FOGO = (240, 146)                       # centro da fogueira (o sprite animado ocupa x 220-260, y 104-152)
LIVRE = {"fogo": (220, 104, 260, 152), "esqueleto": (262, 96, 308, 163), "gato": (226, 155, 248, 165)}
HORIZ = 96                              # onde o chão da clareira encontra a mata


# ─────────────────────────────── Pincéis básicos ───────────────────────────────
@lru_cache(maxsize=4096)
def _hexa(c: str) -> tuple[float, float, float]:
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def hexa(c: str) -> np.ndarray:
    return np.array(_hexa(c), dtype=np.float32)


def pal(*cores: str) -> np.ndarray:
    return np.array([_hexa(c) for c in cores], dtype=np.float32)


def suave(a: float, b: float, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples."""

    def __init__(self) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
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

    def ret(self, x0, y0, w, h, cor, a: float = 1.0) -> None:
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

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / n
            self.p(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), cor, a)

    def mascara(self, m: np.ndarray, cor, a: float = 1.0) -> None:
        """Pinta onde m é verdadeiro; `cor` pode ser uma cor ou uma imagem H x W x 3."""
        if isinstance(cor, str):
            cor = hexa(cor)
        rgb = cor[m] if np.ndim(cor) == 3 else cor
        if a >= 1:
            self.c[m, :3] = rgb
            self.c[m, 3] = 1
        else:
            base = self.c[m]
            na = a + base[:, 3:4] * (1 - a)
            base[:, :3] = (rgb * a + base[:, :3] * base[:, 3:4] * (1 - a)) / np.maximum(na, 1e-6)
            base[:, 3:4] = na
            self.c[m] = base

    def bitmap(self, x0, y0, linhas: list[str], cores: dict, a: float = 1.0) -> None:
        for j, linha in enumerate(linhas):
            for i, ch in enumerate(linha):
                if ch in cores:
                    self.p(x0 + i, y0 + j, cores[ch], a)

    def juntar(self, outra: "Camada") -> None:
        a = outra.c[:, :, 3:4]
        na = a + self.c[:, :, 3:4] * (1 - a)
        self.c[:, :, :3] = (outra.c[:, :, :3] * a + self.c[:, :, :3] * self.c[:, :, 3:4] * (1 - a)) / np.maximum(na, 1e-6)
        self.c[:, :, 3:4] = na


def poli(pts) -> np.ndarray:
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon([(float(x), float(y)) for x, y in pts], fill=255)
    return np.asarray(m) > 127


YA, XA = np.mgrid[0:H, 0:W].astype(np.float32)          # grade da arte


def elipse(cx, cy, rx, ry) -> np.ndarray:
    return ((XA - cx) / rx) ** 2 + ((YA - cy) / ry) ** 2 <= 1


def ruido(seed: int, escala: float, w: int = W, h: int = H) -> np.ndarray:
    """Ruído suave 0..1 (valores aleatórios ampliados com interpolação)."""
    g = np.random.default_rng(abs(int(seed)))
    pw, ph = int(w / escala) + 3, int(h / escala) + 3
    pequeno = g.random((ph, pw)).astype(np.float32)
    img = Image.fromarray(pequeno, mode="F").resize((int(pw * escala), int(ph * escala)), Image.BICUBIC)
    a = np.asarray(img, dtype=np.float32)[:h, :w]
    return np.clip(a, 0, 1)


def ruido_ret(seed: int, ex: float, ey: float) -> np.ndarray:
    """Ruído esticado (ex na horizontal, ey na vertical): veios de casca, ondas na água."""
    g = np.random.default_rng(abs(int(seed)))
    pw, ph = int(W / ex) + 3, int(H / ey) + 3
    pequeno = g.random((ph, pw)).astype(np.float32)
    img = Image.fromarray(pequeno, mode="F").resize((int(pw * ex), int(ph * ey)), Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32)[:H, :W], 0, 1)


BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16 - 0.47)
BAYER_HW = np.tile(BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W]


def pontilhar(v: np.ndarray, n: int, forca: float = 0.9) -> np.ndarray:
    """Quantiza v (0..1) em n tons com pontilhado ordenado (Bayer 4x4), como na pixel art."""
    return np.clip(np.floor(v * n + BAYER_HW * forca), 0, n - 1).astype(int)


def fbm(seed: int, escalas=(24, 9, 3.5), pesos=(0.55, 0.3, 0.15)) -> np.ndarray:
    return sum(ruido(seed + i, e) * p for i, (e, p) in enumerate(zip(escalas, pesos)))


# ─────────────────────────────── Horas do dia ───────────────────────────────
PERIODOS = {
    "manha": dict(
        luz=(-0.66, -0.75), ceu=("#5f9ad6", "#a8d0ec", "#fdf0d2"), astro=(30, -70),
        nevoa="#cfe2dc", nevoa_k=0.88, amb="#86a6cc", amb_k=0.45, sol="#ffd48e", sol_k=1.08,
        fogo_k=0.22, lamp_k=0.12, raios=1.0, quente="#ffe8c0", fria="#28466a", agua=("#d8eef0", "#84bccc", "#2a6274"),
        sombra=(0.75, 0.26)),
    "tarde": dict(
        luz=(0.9, -0.42), ceu=("#4c4f92", "#e2906c", "#ffd690"), astro=(320, 55),
        nevoa="#f2b88e", nevoa_k=1.0, amb="#9a86c0", amb_k=0.46, sol="#ffb46a", sol_k=1.18,
        fogo_k=0.55, lamp_k=0.45, raios=1.0, quente="#ffd49a", fria="#36285a", agua=("#ffcf98", "#5e6e9e", "#1e2848"),
        sombra=(-1.9, 0.42)),
    "noite": dict(
        luz=(0.25, -0.95), ceu=("#03081a", "#0c1838", "#1f2d5a"), astro=(232, 20),
        nevoa="#1a2850", nevoa_k=0.85, amb="#3a4c94", amb_k=0.33, sol="#7e9eff", sol_k=0.42,
        fogo_k=1.3, lamp_k=1.0, raios=0.35, quente="#ffcf8a", fria="#0a1532", agua=("#5a70b0", "#1e2e5c", "#0a1228"),
        sombra=None),
}

# Paletas (escuro -> claro). A luz da hora entra depois, na montagem.
FOLHA_DOSSEL = pal("#0a1610", "#11221a", "#18301e", "#224222", "#2f5a28", "#447432", "#5e8e3c")
FOLHA_MEIO = pal("#10201c", "#173024", "#204228", "#2c5a2e", "#3e7434", "#56903c", "#76ac48", "#9cc65a")
FOLHA_ARBUSTO = pal("#122a18", "#1c3c1e", "#2a5426", "#3c6e2e", "#538a36", "#70a442", "#94c052", "#bada6c")
FOLHA_PERTO = pal("#0e1c12", "#162c18", "#20401e", "#2e5826", "#40722e", "#5a8e38")
CASCA = pal("#140d09", "#22160f", "#332216", "#46301e", "#5c4028", "#755434", "#906a42", "#a88252")
MUSGO = pal("#2a4a1e", "#3e6626", "#58842e", "#78a238", "#9cbe48")
PEDRA = pal("#2a2a2e", "#44444a", "#5e5e62", "#7a7a7a", "#9a9890", "#bcb8aa", "#dcd6c4")
TERRA = pal("#2e2018", "#423024", "#58422e", "#6e543a", "#866a48", "#9e8058", "#b4966c", "#c8ac82")
GRAMA = pal("#14281a", "#1c3a1e", "#284e24", "#36602a", "#467230", "#588436", "#6c963e", "#84a846", "#a0bc56")
MADEIRA = pal("#24160c", "#3a2414", "#54361e", "#6e4828", "#8a5e34", "#a87644", "#c49258")
LONA = pal("#5a4a36", "#7a6a50", "#9a8a6a", "#b8a886", "#d2c4a0", "#e8dcbc", "#f6eed6")

FOLHAS_CARIMBO = [
    ((0, 0), (1, 0), (1, 1), (2, 1)),
    ((1, 0), (2, 0), (0, 1), (1, 1)),
    ((0, 0), (1, 0), (2, 0), (1, 1)),
    ((1, 0), (0, 1), (1, 1), (2, 1)),
    ((0, 0), (1, 0), (2, 1), (1, 1), (3, 1)),
    ((0, 0), (0, 1), (1, 1), (1, 2)),
]


def normal_luz(luz, z: float = 0.6) -> tuple[float, float, float]:
    lx, ly = luz
    n = math.sqrt(lx * lx + ly * ly + z * z)
    return lx / n, ly / n, z / n


def copa(c: Camada, cx: float, cy: float, r: float, paleta: np.ndarray, luz, seed: int, dens: float = 0.62,
         achatar: float = 0.82, brilho: float = 0.0, escuro: float = 0.0, carimbos=FOLHAS_CARIMBO, escala: int = 1) -> None:
    """Um cacho de folhas: fundo escuro e centenas de carimbos de folha sombreados como uma esfera."""
    g = np.random.default_rng(abs(int(seed)))
    L = normal_luz(luz)
    nt = len(paleta)
    ry = r * achatar
    # miolo escuro (sem buracos)
    for y in range(int(cy - ry * 0.9), int(cy + ry * 0.9) + 1):
        for x in range(int(cx - r * 0.9), int(cx + r * 0.9) + 1):
            dx, dy = (x - cx) / (r * 0.9), (y - cy) / (ry * 0.9)
            if dx * dx + dy * dy <= 1:
                k = dx * L[0] + dy * L[1] + math.sqrt(max(0, 1 - dx * dx - dy * dy)) * L[2]
                i = int(np.clip((k * 0.5 + 0.5) * (nt - 1) * 0.55 - escuro * 2, 0, nt - 1))
                c.p(x, y, paleta[i])
    n = int(math.pi * r * ry * dens / (escala * escala))
    folhas = []
    for _ in range(n):
        ang = g.random() * math.tau
        d = math.sqrt(g.random()) * 1.06
        dx, dy = math.cos(ang) * d, math.sin(ang) * d
        nz = math.sqrt(max(0.0, 1 - dx * dx - dy * dy))
        k = dx * L[0] + dy * L[1] + nz * L[2]
        t = (k * 0.5 + 0.5) + g.normal(0, 0.09) + brilho - escuro
        folhas.append((t, cx + dx * r, cy + dy * ry, int(g.random() * len(carimbos))))
    folhas.sort(key=lambda f: f[0])
    for t, x, y, ic in folhas:
        i = int(np.clip(t * (nt - 1) + 0.3, 0, nt - 1))
        car = carimbos[ic]
        xi, yi = int(x), int(y)
        for (sx, sy) in car:
            for ex in range(escala):
                for ey in range(escala):
                    c.p(xi + sx * escala + ex, yi + sy * escala + ey, paleta[i])
        if i >= nt - 3:  # borda de luz em cima da folha
            sx, sy = car[0]
            c.p(xi + sx * escala, yi + sy * escala, paleta[min(nt - 1, i + 1)])
        c.p(xi + car[-1][0] * escala, yi + (car[-1][1] + 1) * escala, paleta[max(0, i - 2)])


def tronco(c: Camada, cx: float, ytop: float, ybase: float, larg: float, luz, seed: int, musgo: float = 0.5,
           raizes: int = 3, base_larg: float = 1.0, inclina: float = 0.0, paleta: np.ndarray = CASCA,
           escuro: float = 0.0) -> None:
    """Tronco cilíndrico com casca em veios, musgo do lado da sombra e raízes abertas no pé."""
    g = np.random.default_rng(abs(int(seed)))
    veio = VEIOS
    lx = -1 if luz[0] < 0 else 1
    nt = len(paleta)
    for y in range(int(ytop), int(ybase) + 1):
        up = ybase - y
        w = larg * (1 + base_larg * 0.9 * math.exp(-up / (larg * 0.9 + 2)))
        xc = cx + inclina * up
        for x in range(int(xc - w / 2) - 1, int(xc + w / 2) + 2):
            u = (x + 0.5 - xc) / (w / 2)
            if abs(u) > 1:
                continue
            v = veio[y % H, (x * 3 + seed * 17) % W]
            k = u * lx * 0.75 + 0.15 + (v - 0.5) * 1.1 - abs(u) ** 6 * 0.6 - escuro
            i = int(np.clip((k * 0.5 + 0.5) * (nt - 1) + 0.5, 0, nt - 1))
            c.p(x, y, paleta[i])
            m = MUSGO_N[y % H, x % W] + (0.35 if u * lx < 0 else -0.1) + math.exp(-up / 7) * 0.4 - (1 - musgo) * 0.6
            if m > 0.82:
                j = int(np.clip((k * 0.5 + 0.5) * 4 + (m - 0.82) * 6, 0, 4))
                c.p(x, y, MUSGO[j])
    # raízes
    for r in range(raizes):
        lado = -1 if r % 2 == 0 else 1
        comp = larg * (0.9 + g.random() * 0.9)
        x0 = cx + lado * larg * (0.2 + g.random() * 0.3)
        for s in range(int(comp)):
            t = s / max(comp, 1)
            x = x0 + lado * s
            y = ybase - 2 + t * 3 + math.sin(t * 3 + r) * 0.8
            esp = max(1, int((1 - t) * larg * 0.28))
            for e in range(esp):
                k = 0.5 - e / max(esp, 1) * 0.8 + (0.3 if lado * lx > 0 else -0.1)
                i = int(np.clip((k * 0.5 + 0.5) * (nt - 1), 0, nt - 1))
                c.p(x, y - e, paleta[i])
            if g.random() < 0.3:
                c.p(x, y - esp, MUSGO[2])


VEIOS = ruido_ret(901, 1.4, 7)
MUSGO_N = ruido(902, 4)


def pedra(c: Camada, cx: float, cy: float, rx: float, ry: float, luz, seed: int, musgo: float = 0.0,
          paleta: np.ndarray = PEDRA, escuro: float = 0.0) -> None:
    g = np.random.default_rng(abs(int(seed)))
    L = normal_luz(luz, 0.8)
    nt = len(paleta)
    fase = [g.random() * 6.28 for _ in range(3)]
    for y in range(int(cy - ry) - 2, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 2, int(cx + rx) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            ang = math.atan2(dy, dx)
            rr = 1 + 0.12 * math.sin(3 * ang + fase[0]) + 0.07 * math.sin(5 * ang + fase[1])
            d2 = (dx * dx + dy * dy) / (rr * rr)
            if d2 > 1:
                continue
            nz = math.sqrt(max(0, 1 - d2))
            k = dx * L[0] + dy * L[1] * 1.2 + nz * L[2] - escuro
            k += ((x * 7349 + y * 1933 + seed) % 97 / 97 - 0.5) * 0.25
            i = int(np.clip((k * 0.5 + 0.5) * (nt - 1) + 0.3, 0, nt - 1))
            if dy > 0.55 and d2 > 0.5:
                i = max(0, i - 2)
            c.p(x, y, paleta[i])
            if musgo > 0 and dy < -0.1 and MUSGO_N[y % H, x % W] + musgo * 0.5 > 0.8:
                c.p(x, y, MUSGO[int(np.clip((k * 0.5 + 0.5) * 4, 0, 4))])


# ─────────────────────────────── Céu, montes e o castelo ───────────────────────────────
def pintar_ceu(nome: str, per: dict) -> np.ndarray:
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    t = np.clip(YA / 80, 0, 1)[:, :, None]
    ceu = np.where(t < 0.5, topo * (1 - t * 2) + meio * t * 2, meio * (2 - t * 2) + horiz * (t * 2 - 1))
    ceu = ceu.astype(np.float32)
    ax, ay = per["astro"]
    d = np.hypot(XA - ax, (YA - ay) * 1.2)
    nuvem = ruido_ret(7, 30, 6) * 0.65 + ruido_ret(8, 9, 3) * 0.35
    faixa = np.exp(-((YA - 34) / 16) ** 2)
    v = (nuvem - 0.5) * 2.2 * faixa
    if nome == "manha":
        ceu += (np.exp(-d / 130) * 0.55)[:, :, None] * hexa("#fff6dc")
        cn, cs = hexa("#ffffff"), hexa("#c4d6ec")
    elif nome == "tarde":
        ceu += (np.exp(-d / 60) * 0.9 + np.exp(-d / 8) * 1.5)[:, :, None] * hexa("#ffd890")
        cn, cs = hexa("#ffd6a8"), hexa("#b0708a")
    else:
        cn, cs = hexa("#2c3c6c"), hexa("#141e40")
    k = np.clip(v * 3, 0, 0.85)[:, :, None]
    sombra = (np.roll(nuvem, -2, axis=0) - 0.5) * 2.2 * faixa < v - 0.04
    cor_n = np.where(sombra[:, :, None], cn, cs)
    ceu = ceu * (1 - k) + cor_n * k
    if nome == "noite":
        g = np.random.default_rng(3)
        for _ in range(260):
            x, y = int(g.random() * W), int(g.random() * 80)
            b = 0.35 + g.random() ** 2 * 0.9
            ceu[y, x] += b * hexa("#e8eeff")
            if b > 0.95:
                for (ox, oy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= x + ox < W and 0 <= y + oy < H:
                        ceu[y + oy, x + ox] += 0.3
        # via láctea sugerida
        via = np.exp(-((YA - 0.32 * XA + 20) / 12) ** 2) * ruido(9, 6) * 0.25
        ceu += via[:, :, None] * hexa("#8a9ad8")
        # lua com crateras
        for y in range(ay - 8, ay + 9):
            for x in range(ax - 8, ax + 9):
                dd = math.hypot(x - ax, y - ay)
                if dd < 6.6:
                    cr = (x - ax + 2) ** 2 + (y - ay + 1) ** 2 < 4 or (x - ax - 2) ** 2 + (y - ay - 2) ** 2 < 2.5
                    ceu[y, x] = hexa("#c8d2f0") if cr or dd > 5.8 else hexa("#f4f6ff")
        ceu += (np.exp(-d / 18) * 0.35)[:, :, None] * hexa("#9ab0f0")
    return ceu


def pintar_montes(nome: str, per: dict) -> tuple[Camada, Camada, list]:
    """Cordilheira distante e o morro do castelo; o castelo vai numa camada própria (menos névoa)."""
    c = Camada()
    n = ruido(51, 20)[0] * 10 + ruido(52, 6)[0] * 3
    for x in range(W):
        y1 = int(52 + 6 * math.sin(x / 41) + n[x])
        c.ret(x, y1, 1, H - y1, "#8aa0c0" if nome != "noite" else "#1c2850")
        c.p(x, y1, "#b4c6dc" if nome != "noite" else "#2a3a68")
        y2 = int(68 - 11 * math.exp(-((x - 292) / 30) ** 2) + 2 * math.sin(x / 13) + n[(x * 3) % W] * 0.3)
        c.ret(x, y2, 1, H - y2, "#6f8aa6" if nome != "noite" else "#151f40")
        if (x + y2) % 3 == 0:
            c.p(x, y2, "#8aa4bc" if nome != "noite" else "#22305a")
    cas = Camada()
    janelas = castelo(cas, 292, 58, per["luz"], nome == "noite")
    return c, cas, janelas


def castelo(c: Camada, cx: int, base: int, luz, noite: bool) -> list[tuple[int, int]]:
    """O castelo da prova, pequeno e distante, no alto do morro: muralha, torres de telhado cônico, flâmulas."""
    lx = -1 if luz[0] < 0 else 1
    claro, meio, sombra, escuro = "#efe6d6", "#cfc4b6", "#a49a96", "#6e6670"
    telha = ("#7a8ad0", "#5262a8", "#36407a") if not noite else ("#5a6ab0", "#3a4888", "#262e60")
    janelas: list[tuple[int, int]] = []

    def torre(x0: int, w: int, alt: int, teto: int, jan: list[tuple[int, int]]) -> None:
        for x in range(x0, x0 + w):
            u = (x - x0 + 0.5) / w * 2 - 1
            cor = claro if u * lx > 0.3 else meio if u * lx > -0.4 else sombra
            c.ret(x, base - alt, 1, alt, cor)
        for x in range(x0 - 1, x0 + w + 1, 2):  # ameias
            c.p(x, base - alt - 1, meio)
        c.ret(x0 - 1, base - alt, w + 2, 1, sombra)
        for k in range(teto):
            meia = (w + 2) * (1 - k / teto) / 2
            xc = x0 + w / 2
            for x in range(int(round(xc - meia)), int(round(xc + meia))):
                u = (x + 0.5 - xc) / max(meia, 0.5)
                c.p(x, base - alt - 2 - k, telha[0] if u * lx > 0.2 else telha[1] if u * lx > -0.5 else telha[2])
        c.p(int(x0 + w / 2), base - alt - 2 - teto, escuro)
        for (jx, jy) in jan:
            c.p(x0 + jx, base - alt + jy, escuro)
            c.p(x0 + jx, base - alt + jy + 1, escuro)
            janelas.append((x0 + jx, base - alt + jy))

    # o morro rochoso embaixo do castelo: encosta com grama, rochas e pinheirinhos
    morro = pal("#3e5a46", "#4e6e50", "#64845a", "#7e9a66") if not noite else pal("#141c34", "#1a2440", "#222e4e", "#2a3858")
    rocha = pal("#6a6870", "#8e8a8c", "#b4aea8") if not noite else pal("#1e2440", "#2a3252", "#363e62")
    g = np.random.default_rng(57)
    for x in range(cx - 46, cx + 47):
        d = abs(x - cx)
        topo = base - 1 + max(0.0, d - 20) * 0.42 + math.sin(x * 0.9) * 0.6
        for y in range(int(topo), base + 16):
            u = (x - cx) / 46
            k = 1.6 - u * lx * 1.2 - (y - topo) * 0.06 + BAYER[y % 4, x % 4] * 0.9
            c.p(x, y, morro[int(np.clip(k, 0, 3))])
            if (x * 17 + y * 7) % 23 == 0 and y < topo + 8:
                c.p(x, y, rocha[int(np.clip(1 - u * lx, 0, 2))])
        if d > 22 and g.random() < 0.3:
            for k in range(4):
                c.ret(x - k // 2, int(topo) - 4 + k, 1 + k, 1, morro[0])
    # muralha com ameias e o portão
    c.ret(cx - 19, base - 7, 38, 7, meio)
    for x in range(cx - 19, cx + 19):
        if (x - cx) % 2 == 0:
            c.p(x, base - 8, meio)
        c.p(x, base - 7, claro if lx < 0 else sombra)
    c.ret(cx - 2, base - 5, 4, 5, escuro)
    c.p(cx - 2, base - 5, meio)
    c.p(cx + 1, base - 5, meio)
    torre(cx - 21, 5, 15, 7, [(2, 4)])
    torre(cx + 16, 5, 13, 6, [(2, 4)])
    torre(cx - 11, 6, 21, 8, [(2, 4), (3, 11)])
    torre(cx + 6, 5, 19, 7, [(2, 5)])
    torre(cx - 4, 9, 28, 11, [(2, 5), (6, 5), (4, 13)])
    # flâmulas
    for (fx, fy, cor) in ((cx, base - 28 - 13, "#e04848"), (cx - 8, base - 21 - 10, "#f0c040")):
        c.ret(fx, fy - 4, 1, 5, escuro)
        c.ret(fx + 1, fy - 4, 3, 1, cor)
        c.ret(fx + 1, fy - 3, 2, 1, cor)
    # caminho em zigue-zague descendo o morro
    for i, (x, y) in enumerate(((cx + 2, base + 1), (cx + 6, base + 3), (cx + 2, base + 5), (cx - 4, base + 7), (cx + 1, base + 9))):
        c.ret(x, y, 4, 1, "#d8cdb6", 0.7)
    return janelas


# ─────────────────────────────── A mata ───────────────────────────────
def pintar_mata_longe(nome: str, per: dict) -> Camada:
    """A mata do fundo em duas fileiras: pinheiros mais longe e claros, copas redondas mais perto e escuras."""
    c = Camada()
    g = np.random.default_rng(61)
    luz = per["luz"]
    lx = -1 if luz[0] < 0 else 1
    pinho = pal("#2a5a4e", "#386a58", "#4a7c62", "#5e8e6c")
    fundo = pal("#16302a", "#1e3c30", "#284a38")
    for y in range(70, HORIZ + 6):
        for x in range(W):
            c.p(x, y, fundo[int(np.clip(MUSGO_N[y, x] * 2.6 + (y - 76) / 30, 0, 2))])
    for fileira in range(2):
        x = -6.0
        while x < W + 6:
            centro = 266 < x < 318
            if fileira == 0:
                topo = (70 + g.random() * 5) if centro else (56 + g.random() * 12)
                alt = HORIZ - topo
                for k in range(int(alt)):
                    meia = 0.5 + k * 0.36 + ((k + int(x)) % 4) * 0.45
                    yy = int(topo + k)
                    for xx in range(int(x - meia), int(x + meia) + 1):
                        u = (xx - x) / max(meia, 1)
                        c.p(xx, yy, pinho[3] if u * lx > 0.3 else pinho[2] if u * lx > -0.3 else pinho[1])
                x += 4 + g.random() * 5
            else:
                topo = (78 + g.random() * 5) if centro else (66 + g.random() * 10)
                r = 5 + g.random() * 5
                c.ret(x, topo + r * 0.6, 1 + (r > 7), HORIZ + 4 - topo - r * 0.6, "#1e1a16")
                copa(c, x, topo + r * 0.7, r, FOLHA_MEIO[0:6], luz, seed=int(x * 7) + 3, dens=0.55)
                x += 6 + g.random() * 8
    return c


def pintar_mata_meio(nome: str, per: dict) -> Camada:
    """Árvores do meio, nos dois lados: troncos com casca, galhos e copas folha por folha. No centro, a abertura."""
    c = Camada()
    luz = per["luz"]
    g = np.random.default_rng(71)
    arvores = [(14, 99, 8), (46, 101, 6), (78, 98, 9), (110, 100, 5), (140, 97, 7), (170, 99, 5), (194, 98, 3),
               (340, 98, 4), (382, 100, 8), (412, 98, 6), (444, 101, 9), (474, 99, 6)]
    # o fundo entre os troncos: sub-bosque escuro nas laterais, que some em direção à abertura
    lado = suave(212, 178, XA) + suave(318, 350, XA)
    v = MUSGO_N * 0.45 + lado * 0.75 + suave(30, 90, YA) * 0.15
    m = (v > 0.55) & (YA < HORIZ + 8)
    k = pontilhar(np.clip(YA / 160 + np.roll(MUSGO_N, 37, 0) * 0.45, 0, 1), 3, 0.8)
    c.mascara(m, FOLHA_MEIO[k])
    c.c[:, :, 3] *= np.clip(lado * 1.3, 0, 1)
    for i, (x, base, larg) in enumerate(arvores):
        incl = (g.random() - 0.5) * 0.05
        tronco(c, x, 0, base, larg, luz, seed=200 + i, musgo=0.6, raizes=2, escuro=0.12, inclina=incl)
        # galhos
        for j in range(2):
            y0 = 30 + g.random() * 34
            ld = -1 if (j + i) % 2 else 1
            if 190 < x + ld * 20 < 335:
                ld = -ld
            comp = 10 + g.random() * 12
            xb = x + incl * (base - y0)
            for t_ in range(int(comp)):
                tt = t_ / comp
                xx, yy = xb + ld * t_, y0 - t_ * 0.55 - tt * tt * 4
                for e in range(max(1, int(larg * 0.3 * (1 - tt))) + 1):
                    c.p(xx, yy + e, CASCA[3 if e == 0 and ld * luz[0] < 0 else 1])
    for i, (x, base, larg) in enumerate(arvores):
        n = 4 + int(larg / 2.5)
        for j in range(n):
            cx = x + g.normal(0, 10 + larg)
            cy = 14 + g.random() * 52 - (larg - 5)
            if 206 < cx < 324:
                cx = 206 if cx < 265 else 324
            r = 8 + g.random() * 8 + larg * 0.5
            copa(c, cx, cy, r, FOLHA_MEIO, luz, seed=300 + i * 10 + j, dens=0.6, escuro=0.05)
    # folhagem baixa (arvoretas e arbustos altos) entre os troncos, nas laterais
    for x in list(range(-4, 200, 13)) + list(range(330, 486, 13)):
        cy = 70 + g.random() * 16
        copa(c, x + g.random() * 6, cy, 6 + g.random() * 5, FOLHA_MEIO, luz, seed=4000 + x, dens=0.65, escuro=0.12)
    # galhos que saem das copas na borda da abertura
    for (x0, y0, x1, y1) in ((196, 44, 216, 34), (338, 46, 320, 36)):
        c.linha(x0, y0, x1, y1, CASCA[2])
        c.linha(x0, y0 + 1, x1, y1 + 1, CASCA[1])
        copa(c, x1, y1 - 2, 6, FOLHA_MEIO, luz, seed=x0, dens=0.7)
    return c


def pintar_dossel(nome: str, per: dict) -> Camada:
    """O dossel perto da câmera, no alto: cachos escuros com as bordas acesas, cipós e a abertura no meio."""
    c = Camada()
    luz = per["luz"]
    g = np.random.default_rng(81)
    x = -24
    while x < W + 24:
        meio = 196 < x < 336
        if meio:
            if g.random() < 0.35:
                copa(c, x, -6 + g.random() * 6, 7 + g.random() * 4, FOLHA_DOSSEL, luz, seed=int(x) + 11, dens=0.7, brilho=0.05)
            x += 12 + g.random() * 10
            continue
        borda = min(abs(x - 196), abs(x - 336))
        cy = -10 + min(borda, 60) * 0.3 + g.random() * 10 + (g.random() < 0.3) * g.random() * 18
        r = 14 + g.random() * 10 + min(borda, 80) * 0.08
        copa(c, x, cy, r, FOLHA_DOSSEL, luz, seed=int(x) + 31, dens=0.62, brilho=0.08)
        x += 10 + g.random() * 9
    # galho atravessando o alto da abertura
    for k in range(0, 150):
        t = k / 150
        xx = 186 + t * 160
        yy = 6 + math.sin(t * 3.2) * 5 - t * 4
        esp = 3 - t * 2
        for e in range(int(esp) + 1):
            c.p(xx, yy + e, CASCA[1 + e % 2])
        if k % 9 == 0:
            copa(c, xx + g.normal(0, 3), yy + 4 + g.random() * 3, 3.5 + g.random() * 2.5, FOLHA_DOSSEL, luz, seed=k + 500, dens=0.9, brilho=0.12)
    # cortinas de folhas pendentes que quebram a borda de baixo do dossel
    for x0 in list(range(-10, 190, 17)) + list(range(342, 490, 17)):
        xx = x0 + g.random() * 8
        topo = 18 + g.random() * 14
        comp = 10 + g.random() * 22
        for k in range(int(comp / 3)):
            copa(c, xx + math.sin(k * 1.3 + x0) * 2, topo + k * 3, 3.2 + (1 - k / (comp / 3)) * 2.5, FOLHA_DOSSEL, luz,
                 seed=int(xx * 11) + k, dens=0.95, brilho=0.1)
    # cipós pendurados
    for (vx, vlen) in ((150, 52), (176, 38), (352, 46), (372, 30), (214, 24)):
        for k in range(vlen):
            xx = vx + math.sin(k / 6 + vx) * 1.4
            c.p(xx, 8 + k, FOLHA_DOSSEL[3])
            if k % 3 == 0:
                c.p(xx + (1 if k % 6 else -1), 8 + k, FOLHA_DOSSEL[5])
                c.p(xx + (2 if k % 6 else -2), 9 + k, FOLHA_DOSSEL[4])
    return c


def pintar_arvores_perto(nome: str, per: dict, base_map: np.ndarray) -> Camada:
    """As árvores grandes que emolduram (esquerda e direita) e a árvore da lanterna, à direita do acampamento."""
    c = Camada()
    luz = per["luz"]
    for (x, base, larg, seed, ytop) in ((14, 150, 26, 1, -2), (466, 158, 28, 2, -2), (356, 112, 10, 3, 8)):
        t = Camada()
        tronco(t, x, ytop, base, larg, luz, seed=seed, musgo=0.75, raizes=4, base_larg=0.8)
        c.juntar(t)
        base_map[t.c[:, :, 3] > 0.5] = base
    # galho da lanterna saindo da árvore da direita (casca em cima clara, embaixo escura) com raminhos e folhas
    for k in range(48):
        tt = k / 48
        xx = 354 - tt * 40
        yy = 56 + tt * 9 - math.sin(tt * 3.1) * 4
        esp = int(4 - tt * 2.4)
        for e in range(esp + 1):
            c.p(xx, yy + e, CASCA[6] if e == 0 else CASCA[4] if e == 1 else CASCA[2] if e < esp else CASCA[0])
        if k in (14, 30):
            for q in range(6):
                c.p(xx - q * 0.5, yy - q, CASCA[3])
    for (cx, cy, r, s_) in ((336, 50, 6, 77), (348, 46, 5, 78), (320, 56, 4.5, 81), (312, 62, 3.5, 82)):
        copa(c, cx, cy, r, FOLHA_ARBUSTO, luz, seed=s_, dens=0.85, brilho=0.05)
    # hera e folhas no tronco da esquerda
    copa(c, 26, 92, 7, FOLHA_ARBUSTO, luz, seed=79, dens=0.8)
    copa(c, 454, 104, 6, FOLHA_ARBUSTO, luz, seed=80, dens=0.8)
    return c


# ─────────────────────────────── O chão, o lago e a ponte ───────────────────────────────
LAGO = (98, 115, 50, 10)              # centro e raios do lago
PONTE = (150, 107)                     # centro do vão do arco (a linha d'água do riacho passa em y 108)
AGUA_Y = 108


def dist_segmentos(pts) -> np.ndarray:
    d = np.full((H, W), 1e9, dtype=np.float32)
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        vx, vy = x1 - x0, y1 - y0
        t = np.clip(((XA - x0) * vx + (YA - y0) * vy) / (vx * vx + vy * vy), 0, 1)
        d = np.minimum(d, np.hypot(XA - (x0 + t * vx), YA - (y0 + t * vy)))
    return d


def mascara_agua() -> np.ndarray:
    lx, ly, rx, ry = LAGO
    borda = (ruido(41, 6) - 0.5) * 0.28
    m = ((XA - lx) / rx) ** 2 + ((YA - ly) / ry) ** 2 <= 1 + borda
    riacho = dist_segmentos([(156, HORIZ - 4), (152, 100), (149, 108), (142, 114)]) < 6.5 + (YA - HORIZ) * 0.25
    return m | (riacho & (YA >= HORIZ - 3))


def pintar_chao(nome: str, per: dict) -> tuple[Camada, np.ndarray, np.ndarray]:
    c = Camada()
    luz = per["luz"]
    g = np.random.default_rng(30)
    fx, fy = FOGO
    prof = np.clip((YA - HORIZ) / (H - HORIZ), 0, 1)
    agua = mascara_agua()
    # ── grama: tons por ruído; mais clara e baixa (pisada) na clareira, escura na borda da mata
    dcl = ((XA - fx + 6) / 118) ** 2 + ((YA - fy + 4) / 42) ** 2
    nm = ruido(32, 7)
    clareira = 1 - suave(0.55, 1.3, dcl + (nm - 0.5) * 0.6)
    v = fbm(31, (26, 9, 4), (0.5, 0.33, 0.17)) + g.random((H, W)).astype(np.float32) * 0.03
    v = v + clareira * 0.2 - suave(HORIZ + 16, HORIZ, YA) * 0.3
    idx = pontilhar(np.clip((v - 0.28) * 1.05, 0, 1), len(GRAMA), 0.6)
    c.mascara(YA >= HORIZ - 2, GRAMA[idx])
    # ── terra batida em volta do fogo e os caminhos (para o fundo, para a ponte e para a frente)
    caminho = np.minimum.reduce([
        dist_segmentos([(fx + 10, fy + 6), (fx + 26, fy + 26), (fx + 44, H + 4)]) / (3 + prof * 7),
        dist_segmentos([(fx - 18, fy - 8), (198, 124), (182, 106), (176, 100)]) / (2.5 + prof * 4),
        dist_segmentos([(fx + 40, fy - 10), (302, 118), (300, 106), (294, HORIZ - 2)]) / (3 + prof * 4),
    ])
    nucleo = ((XA - fx) / 52) ** 2 + ((YA - fy - 2) / 16) ** 2
    t_terra = np.maximum(1.15 - nucleo, 1.25 - caminho) + (nm - 0.5) * 0.7 + (g.random((H, W)) - 0.5) * 0.25
    terra = (t_terra > 0.32) & (YA > HORIZ) & ~agua
    tv = ruido(33, 5) * 0.55 + ruido(34, 2) * 0.3 + g.random((H, W)).astype(np.float32) * 0.08 - np.clip(0.6 - t_terra, 0, 1) * 0.5
    tv = tv + suave(0.3, 1.2, t_terra) * 0.15
    c.mascara(terra, TERRA[pontilhar(np.clip(tv, 0, 1), len(TERRA))])
    # ── fios de capim (mais altos e grossos perto da câmera), por cima da borda da terra
    for _ in range(11000):
        x, y = g.random() * W, HORIZ + 1 + g.random() * (H - HORIZ)
        xi, yi = int(x), int(y)
        if agua[min(yi, H - 1), min(xi, W - 1)] or (terra[min(yi, H - 1), min(xi, W - 1)] and g.random() < 0.85):
            continue
        if any(x0 - 1 <= xi <= x1 + 1 and y0 <= yi <= y1 + 2 for (x0, y0, x1, y1) in LIVRE.values()):
            continue
        pr = (y - HORIZ) / (H - HORIZ)
        alt = int(1 + g.random() * (2 + pr * 5) * (1 - clareira[min(yi, H - 1), xi] * 0.6))
        base_i = int(np.clip(idx[min(yi, H - 1), xi], 1, len(GRAMA) - 1))
        incl = (g.random() - 0.5) * 0.8
        for j in range(alt + 1):
            tone = min(len(GRAMA) - 1, base_i - 1 + int(j * 2.4 / max(alt, 1)) + (1 if j == alt else 0))
            c.p(x + incl * j, y - j, GRAMA[tone])
    # ── tufos maiores de capim alto nas bordas (folhas arqueadas)
    for _ in range(140):
        x, y = g.random() * W, HORIZ + 6 + g.random() * (H - HORIZ - 6)
        if dcl[int(y), int(x)] < 1.05 or agua[int(y), int(x)]:
            continue
        pr = (y - HORIZ) / (H - HORIZ)
        n = 5 + int(g.random() * 4)
        for f in range(n):
            ang = -math.pi / 2 + (f / (n - 1) - 0.5) * 2.2
            comp = (5 + pr * 9) * (0.6 + g.random() * 0.5)
            for s in range(int(comp)):
                tt = s / comp
                xx = x + math.cos(ang) * s * 0.8 + math.cos(ang) * tt * tt * comp * 0.5
                yy = y + math.sin(ang) * s * (1 - tt * 0.6)
                c.p(xx, yy, GRAMA[min(len(GRAMA) - 1, 2 + int(tt * 5))])
    # ── pedrinhas e folhas caídas sobre a terra
    folhas_caidas = pal("#b8642a", "#d48a3a", "#8a4a22", "#c8a040", "#6a7a2a")
    for _ in range(420):
        x, y = g.random() * W, HORIZ + 4 + g.random() * (H - HORIZ - 4)
        xi, yi = int(x), int(y)
        if not terra[yi, xi] or any(x0 <= xi <= x1 and y0 <= yi <= y1 for (x0, y0, x1, y1) in (LIVRE["gato"],)):
            continue
        if g.random() < 0.55:
            r = 0.8 + g.random() * 1.6 * (0.6 + (y - HORIZ) / 100)
            if r < 1.2:
                c.p(xi, yi, PEDRA[5])
                c.p(xi, yi + 1, PEDRA[2])
            else:
                pedra(c, x, y, r * 1.3, r, luz, seed=xi * 31 + yi)
        else:
            cor = folhas_caidas[int(g.random() * 5)]
            c.p(xi, yi, cor)
            c.p(xi + 1, yi, cor * 0.8)
            if g.random() < 0.5:
                c.p(xi + 1, yi - 1, cor * 1.1)
    # gravetos
    for _ in range(40):
        x, y = g.random() * W, HORIZ + 8 + g.random() * (H - HORIZ - 8)
        if not terra[int(y), int(x)]:
            continue
        comp = 3 + g.random() * 5
        ang = (g.random() - 0.5) * 1.2
        c.linha(x, y, x + math.cos(ang) * comp, y + math.sin(ang) * comp * 0.4, MADEIRA[2])
    brilhos = lago_e_ponte(c, nome, per, agua)
    # ── flores em canteirinhos, cogumelos e samambaias
    flores(c, g, dcl, agua, terra)
    for (x, y, tipo) in ((364, 114, 0), (348, 113, 1), (28, 152, 0), (120, 140, 1), (306, 155, 1), (62, 106, 0),
                         (205, 162, 1), (440, 168, 0), (186, 150, 1)):
        cogumelos(c, x, y, tipo, g)
    for (x, y, k) in ((8, 120, 1.2), (40, 112, 1.0), (196, 104, 0.8), (330, 104, 0.9), (420, 118, 1.2), (470, 140, 1.3),
                      (90, 160, 1.4), (390, 176, 1.5), (36, 182, 1.6)):
        samambaia(c, x, y, k, luz, g)
    # arbustos altos e arvoretas soltos, para a borda da mata não virar uma linha reta
    for (x, r) in ((18, 9), (96, 7), (196, 8), (232, 6), (322, 9), (346, 7), (404, 10), (452, 8)):
        copa(c, x, HORIZ - 6 - r * 0.4, r, FOLHA_ARBUSTO, luz, seed=x * 3 + 5, dens=0.7, achatar=0.85, escuro=0.1)
    # arbustos na borda da mata (a passagem do chão para as árvores)
    x = -6
    while x < W + 6:
        if not (122 < x < 180) and not (284 < x < 306):
            r = 4 + g.random() * 5
            copa(c, x, HORIZ - 1 + g.random() * 4, r, FOLHA_ARBUSTO, luz, seed=int(x * 13) + 7, dens=0.75, achatar=0.7, escuro=0.08)
        x += 4 + g.random() * 6
    return c, terra, agua, brilhos


def lago_e_ponte(c: Camada, nome: str, per: dict, agua: np.ndarray) -> list[tuple[int, int]]:
    """O lago com o riacho que vem do fundo da mata e a ponte de pedra em arco; devolve os brilhos da água."""
    luz = per["luz"]
    g = np.random.default_rng(45)
    lx, ly, rx, ry = LAGO
    a_cl, a_me, a_es = (hexa(x) for x in per["agua"])
    lado = -1 if luz[0] < 0 else 1
    # ── a água: faixa escura com o reflexo da margem de trás, depois o céu refletido, e o fundo mais escuro perto
    topo_agua = np.full(W, H, dtype=np.float32)
    ys_, xs_ = np.nonzero(agua)
    np.minimum.at(topo_agua, xs_, ys_.astype(np.float32))
    prof_ag = np.clip(YA - topo_agua[None, :], 0, 30)
    t = np.clip((prof_ag - 2) / 7, 0, 1)[:, :, None]
    cor = a_cl * (1 - t) + a_me * t
    t2 = np.clip((YA - (ly + 2)) / 9, 0, 1)[:, :, None]
    cor = cor * (1 - t2 * 0.6) + a_es * t2 * 0.6
    refl = np.clip(1 - prof_ag / 4.5, 0, 1)[:, :, None]
    verde_refl = hexa("#1c3426") if nome != "noite" else hexa("#070d18")
    cor = cor * (1 - refl * 0.85) + verde_refl * refl * 0.85
    ond = ruido_ret(46, 11, 1.0)
    cor = cor * (0.88 + 0.24 * ond[:, :, None])
    faixas = (ruido_ret(47, 7, 1.0) > 0.72) & (prof_ag > 4)
    cor = np.where(faixas[:, :, None], cor * 0.75 + a_cl * 0.4, cor)
    c.mascara(agua, cor.astype(np.float32))
    # anéis de ondinha em volta de um peixe que acabou de pular
    for (ox, oy, rr) in ((84, 121, 7), (84, 121, 4), (120, 115, 3.5)):
        for k in range(int(rr * 9)):
            a = k / (rr * 9) * math.tau
            x, y = ox + math.cos(a) * rr, oy + math.sin(a) * rr * 0.38
            if agua[int(y), int(x)] and math.sin(a) > -0.2:
                c.p(x, y, a_cl * 1.1, 0.8)
    brilhos = []
    for _ in range(40):
        x, y = int(lx - rx + g.random() * rx * 2), int(ly - ry * 0.4 + g.random() * ry * 1.3)
        if agua[y, x] and agua[y, min(W - 1, x + 3)]:
            comp = 2 + int(g.random() * 4)
            c.ret(x, y, comp, 1, a_cl * 1.25, 0.9)
            if g.random() < 0.3:
                brilhos.append((x + comp // 2, y))
    # ── margem: terra molhada, espuma clara na beira da frente e pedras com musgo
    dentro = agua & np.roll(agua, -1, 0) & np.roll(agua, 1, 0) & np.roll(agua, 1, 1) & np.roll(agua, -1, 1)
    borda = agua & ~dentro
    ys, xs = np.nonzero(borda)
    for x, y in zip(xs, ys):
        frente = not agua[min(H - 1, y + 1), x]
        c.p(x, y, a_cl * 1.2 if frente and (x * 7) % 5 else hexa("#2a2a1e"))
        if frente:
            c.p(x, y + 1, hexa("#3a3022"))
            c.p(x, y + 2, hexa("#4a3e2a"), 0.6)
    for k in range(28):
        a = k / 28 * math.tau + g.random() * 0.15
        x = lx + math.cos(a) * (rx + 1.5)
        y = ly + math.sin(a) * (ry + 1.2)
        if x > 136 and y < ly:
            continue
        pedra(c, x, y, 1.6 + g.random() * 2.4, 1.2 + g.random() * 1.4, luz, seed=k + 600, musgo=0.7)
    # folhas de lírio d'água com flores
    for (x, y, r) in ((70, 119, 3.2), (77, 122, 2.4), (106, 114, 2.8), (62, 114, 2), (116, 122, 3.2), (96, 125, 2.2), (132, 119, 2.4)):
        for yy in range(int(y - r * 0.5) - 1, int(y + r * 0.5) + 2):
            for xx in range(int(x - r) - 1, int(x + r) + 2):
                dx, dy = (xx - x) / r, (yy - y) / (r * 0.5)
                if dx * dx + dy * dy <= 1 and not (dx > 0.15 and abs(dy) < 0.28):
                    c.p(xx, yy, "#7ab04e" if dy < -0.25 else "#4e8e3c" if dy < 0.45 else "#2c5e30")
        c.p(x - 1, y + int(r * 0.5) + 1, a_es * 0.8, 0.6)
        if r > 2.7:
            c.p(x - 1, y - 1, "#ffd6e4")
            c.p(x, y - 1, "#ff8ab0")
            c.p(x - 2, y - 1, "#ff9abc")
            c.p(x - 1, y - 2, "#fff4f8")
    # taboas e juncos nas margens
    for (x, y, n) in ((50, 118, 6), (56, 124, 4), (134, 126, 5), (140, 114, 3), (62, 110, 4), (158, 112, 3)):
        for k in range(n):
            xx = x + k * 1.6 + g.random()
            alt = 6 + g.random() * 8
            curva = (k - n / 2) * 0.08
            for j in range(int(alt)):
                c.p(xx + j * curva, y - j, GRAMA[3 + (j > alt * 0.5) + (j > alt * 0.85)])
            if k % 2 == 0:
                hx = xx + int(alt) * curva
                c.ret(hx, y - alt - 3, 1, 4, "#6a3a1e")
                c.p(hx, y - alt - 3, "#9a6238")
                c.p(hx, y - alt - 4, GRAMA[5])
    # ── a ponte de pedra: arco de aduelas, paramento em fiadas, parapeito com capa clara, musgo e hera
    px, py = PONTE
    meia, raio = 25, 11.5
    PEDRA_P = pal("#2e2a28", "#4a4440", "#686058", "#8a8074", "#aaa090", "#c8bea8", "#e6dcc4")
    # o tabuleiro visto de cima (lajes) e o parapeito de trás
    for x in range(px - meia + 2, px + meia - 1):
        u = (x - px) / meia
        topo = int(round(py - 17 + 6 * u * u))
        for y in range(topo - 4, topo):
            laje = (x + (y % 2) * 2) % 5 == 0
            c.p(x, y, PEDRA_P[3] if laje else PEDRA_P[4 + ((x * 7 + y) % 3 == 0)])
        c.p(x, topo - 5, PEDRA_P[5])
        c.p(x, topo - 6, PEDRA_P[4] if x % 4 else PEDRA_P[2])
    for x in range(px - meia, px + meia + 1):
        u = (x - px) / meia
        topo = int(round(py - 17 + 6 * u * u))
        for y in range(topo, AGUA_Y + 2):
            ua = (x + 0.5 - px) / raio
            if abs(ua) < 1 and y >= py - raio * math.sqrt(1 - ua * ua) and y > py - raio:
                continue  # vão do arco
            # fiadas de 3 px, juntas desencontradas
            fila = (y - (py - 18)) // 3
            junta_h = (y - (py - 18)) % 3 == 0
            junta_v = (x + (fila % 2) * 3 + fila * 2) % 6 == 0
            k = 4.2 - u * lado * 1.0 + ((x * 13 + fila * 7) % 5 - 2) * 0.28 - max(0, y - py) * 0.12
            if junta_h or junta_v:
                k -= 1.8
            c.p(x, y, PEDRA_P[int(np.clip(k, 0, 6))])
        # parapeito: capa clara e sombra embaixo dela
        c.p(x, topo, PEDRA_P[6] if (x * 3) % 7 else PEDRA_P[5])
        c.p(x, topo + 1, PEDRA_P[5])
        c.p(x, topo + 2, PEDRA_P[1])
        if MUSGO_N[topo, x] > 0.5:
            c.p(x, topo, MUSGO[4])
            c.p(x, topo - 1, MUSGO[3], 0.8)
    # aduelas em volta do vão, com a pedra de fecho
    for k in range(-9, 10):
        a = k / 9 * math.pi / 2
        for d in (0.6, 1.6, 2.6):
            x = px + math.sin(a) * (raio + d)
            y = py - math.cos(a) * (raio + d)
            tom = 5 if (k % 2 == 0) else 4
            if d > 2:
                tom = 1
            c.p(x, y, PEDRA_P[tom - (1 if math.sin(a) * lado > 0.3 else 0)])
    c.ret(px - 1, py - raio - 3, 3, 3, PEDRA_P[6])
    c.p(px + 1, py - raio - 1, PEDRA_P[3])
    # dentro do arco: sombra funda com a claridade do outro lado
    for y in range(int(py - raio), AGUA_Y + 2):
        for x in range(px - 12, px + 13):
            ua = (x + 0.5 - px) / raio
            if abs(ua) < 1 and y >= py - raio * math.sqrt(1 - ua * ua):
                # a boca do outro lado do arco, menor e mais alta, deixa ver a claridade da mata
                ub, vb = (x + 0.5 - px) / (raio * 0.62), (y - (py + 1)) / (raio * 0.62)
                if ub * ub + vb * vb < 1 and y > py - 6:
                    cor_b = (hexa("#4a7a4a") if y < AGUA_Y - 1 else a_cl * 0.8) if nome != "noite" else hexa("#121c34")
                else:
                    cor_b = hexa("#0c1618") * (1 + max(0, y - py) * 0.05)
                c.p(x, y, cor_b)
    # hera pendurada no paramento
    for (hx, n) in ((px - 18, 6), (px + 17, 5), (px - 6, 3)):
        for k in range(n):
            yy = py - 15 + 6 * ((hx - px) / meia) ** 2 + k
            c.p(hx + (k % 2), yy, MUSGO[2 + (k % 2)])
            c.p(hx - 1 + (k % 3), yy, MUSGO[1])
    # reflexo da ponte no riacho e no lago (espelhado, escuro e quebrado pelas ondas)
    for y in range(AGUA_Y + 2, AGUA_Y + 16):
        sy = AGUA_Y - (y - AGUA_Y)
        onda = int(round(math.sin(y * 1.9) * 0.9))
        for x in range(px - meia, px + meia + 1):
            if not agua[y, x]:
                continue
            u = (x - px) / meia
            topo = py - 17 + 6 * u * u
            ua = (x + 0.5 - px) / raio
            no_vao = abs(ua) < 1 and sy >= py - raio * math.sqrt(1 - ua * ua)
            if sy >= topo and not no_vao:
                c.p(x + onda, y, PEDRA[2] * 0.7 + a_me * 0.3, 0.75)
    return brilhos


def flores(c: Camada, g, dcl, agua, terra) -> None:
    cores = [("#ffffff", "#f4e8a0"), ("#f6d24a", "#c88a20"), ("#ff8ab0", "#ffd0e0"), ("#9a8af0", "#d8d0ff"),
             ("#ff6a4a", "#ffc070"), ("#7ac8ff", "#e0f4ff")]
    for _ in range(46):
        cx, cy = g.random() * W, HORIZ + 8 + g.random() * (H - HORIZ - 10)
        if dcl[int(cy), int(cx)] < 0.8 or agua[int(cy), int(cx)]:
            continue
        cor, miolo = cores[int(g.random() * len(cores))]
        pr = (cy - HORIZ) / (H - HORIZ)
        for _ in range(4 + int(g.random() * 8)):
            x, y = cx + g.normal(0, 2.5 + pr * 3), cy + g.normal(0, 1 + pr * 1.5)
            xi, yi = int(x), int(y)
            if not (0 <= yi < H and 0 <= xi < W) or agua[yi, xi]:
                continue
            haste = 1 + int(pr * 3)
            for j in range(haste):
                c.p(xi, yi + 1 + j, GRAMA[3])
            if pr > 0.45:
                for (ox, oy) in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    c.p(xi + ox, yi + oy, cor)
                c.p(xi, yi, miolo)
            else:
                c.p(xi, yi, cor)
                c.p(xi + 1, yi, cor)
                c.p(xi, yi - 1, miolo)


def cogumelos(c: Camada, x: float, y: float, tipo: int, g) -> None:
    chapeu = ("#d83a2a", "#ff6a4a", "#8a1a14") if tipo == 0 else ("#b88a5a", "#e0b880", "#6a4a2a")
    for k in range(2 + int(g.random() * 3)):
        xx, yy = x + k * 3 + g.random() * 2 - 3, y + g.random() * 2
        alt = 2 + int(g.random() * 3)
        r = 2 + int(g.random() * 2)
        c.ret(xx, yy - alt, 1, alt, "#f0e6d0")
        c.p(xx + 1, yy - alt + 1, "#c8bca0")
        for j in range(2):
            for i in range(-r + j, r - j + 1):
                c.p(xx + i, yy - alt - j, chapeu[1] if i < 0 and j == 1 else chapeu[0] if j == 1 else chapeu[2] if i > r - 2 else chapeu[0])
        if tipo == 0:
            c.p(xx - 1, yy - alt - 1, "#ffffff")
            c.p(xx + 1, yy - alt, "#ffffff")


def samambaia(c: Camada, x: float, y: float, k: float, luz, g) -> None:
    """Samambaia: frondes arqueadas com folíolos alternados."""
    n = 5 + int(g.random() * 3)
    for f in range(n):
        ang = math.pi + (f + 0.5) / n * math.pi  # leque para cima
        comp = (9 + g.random() * 6) * k
        for s in range(int(comp)):
            t = s / comp
            xx = x + math.cos(ang) * s
            yy = y + math.sin(ang) * s * 0.7 + t * t * comp * 0.45
            lado = math.cos(ang) * (-1 if luz[0] < 0 else 1)
            tom = int(np.clip(3 + (1 - t) * 1.5 + (0.8 if lado > 0 else -0.6), 1, 7))
            c.p(xx, yy, FOLHA_ARBUSTO[tom - 1])
            if s % 2 == 0 and t < 0.92:
                fol = int((1 - t) * 3 * k) + 1
                for q in range(1, fol + 1):
                    c.p(xx - math.sin(ang) * q * 0.7, yy + q * 0.5, FOLHA_ARBUSTO[tom])
                    c.p(xx + math.sin(ang) * q * 0.7, yy + q * 0.5 - 0.6, FOLHA_ARBUSTO[max(0, tom - 2)])


# ─────────────────────────────── O acampamento ───────────────────────────────
class Objetos:
    """Os objetos do acampamento numa camada, guardando a linha do chão de cada um (para as sombras)."""

    def __init__(self) -> None:
        self.cam = Camada()
        self.base = np.full((H, W), -1, dtype=np.float32)
        self.emissivo = Camada()          # vidro das lanternas, brasas: acendem conforme a hora
        self.luzes: list[tuple[float, float, str, float, float]] = []

    def add(self, base: float, fn, *args) -> None:
        t = Camada()
        fn(t, *args)
        self.cam.juntar(t)
        self.base[t.c[:, :, 3] > 0.4] = base


def barraca(c: Camada, luz) -> None:
    A, B = (196, 112), (181, 106)
    FL, FR, BL = (175, 148), (217, 148), (158, 141)
    lado_esq_aceso = luz[0] < 0
    g = np.random.default_rng(5)
    trama = ruido(91, 5) * 0.7 + ruido(92, 2) * 0.3
    # telhado lateral (esquerda), com costuras paralelas à cumeeira e um remendo
    m = poli([A, B, BL, FL])
    tl = (3.6 if lado_esq_aceso else 2.0) + (trama - 0.5) * 0.9
    # dobra do pano: mais claro perto da cumeeira
    d_cume = np.abs((YA - A[1]) - (XA - A[0]) * (B[1] - A[1]) / (B[0] - A[0]))
    tl = tl + np.clip(1 - d_cume / 12, 0, 1) * 0.7 - np.clip((YA - 130) / 20, 0, 1) * 0.6
    costura = np.zeros((H, W), bool)
    for off in (9, 18, 27, 36):
        costura |= (np.abs(d_cume - off) < 0.5)
    tl = np.where(costura, tl - 1.2, tl)
    c.mascara(m, LONA[np.clip(np.floor(tl + BAYER_HW * 0.45).astype(int), 0, 6)])
    remendo = m & (np.abs(XA - 170) < 4) & (np.abs(YA - 128) < 3)
    c.mascara(remendo, LONA[np.clip((tl - 0.5).astype(int), 0, 6)] * np.array([0.95, 0.85, 0.7], dtype=np.float32))
    for x in range(166, 175):
        c.p(x, 125, LONA[1])
        c.p(x, 131, LONA[1])
    # frente (triângulo) com a porta aberta e as abas amarradas
    f = poli([A, FL, FR])
    tf = (2.9 if lado_esq_aceso else 4.0) + (trama - 0.5) * 0.9 + np.clip((XA - 196) / 20, -1, 1) * (0.5 if not lado_esq_aceso else -0.4)
    c.mascara(f, LONA[np.clip(np.floor(tf + BAYER_HW * 0.45).astype(int), 0, 6)])
    porta = poli([(196, 117), (185, 148), (208, 148)])
    interior = np.clip((YA - 117) / 31, 0, 1)
    cor_int = pal("#140c08", "#24160e")[np.clip((interior * 2).astype(int), 0, 1)]
    c.mascara(porta, cor_int)
    # cobertor xadrez e travesseiro lá dentro
    for y in range(141, 148):
        for x in range(187, 207):
            if porta[y, x]:
                dobra = (x + y * 2) % 11 == 0
                c.p(x, y, "#c25a3a" if y == 141 else "#7a2a1c" if dobra else "#9a3a26" if y < 145 else "#6a2216")
                if x % 6 == 0 and y > 141:
                    c.p(x, y, "#c89850")
    c.ret(189, 138, 7, 3, "#cfc6b4")
    c.ret(189, 138, 7, 1, "#efe8d6")
    c.p(195, 140, "#a89c86")
    # abas enroladas
    for (x0, y0, x1, y1, lado) in ((196, 117, 184, 148, -1), (196, 117, 209, 148, 1)):
        for s in range(32):
            t = s / 31
            x = x0 + (x1 - x0) * t
            y = y0 + (y1 - y0) * t
            for e in range(2 + int(t * 2)):
                c.p(x + lado * e, y, LONA[5 - e] if lado < 0 else LONA[4 - e])
        c.ret(x0 + (x1 - x0) * 0.55 - (2 if lado < 0 else 0), y0 + (y1 - y0) * 0.55, 3, 1, "#8a4a2a")
    # contornos: bainha embaixo, arestas e cumeeira
    c.linha(*A, *FL, LONA[1])
    c.linha(*A, *FR, LONA[1] if lado_esq_aceso else LONA[2])
    c.linha(*A, *B, LONA[6])
    c.linha(*B, *BL, LONA[1])
    c.linha(FL[0], FL[1], FR[0], FR[1], LONA[0])
    c.linha(BL[0], BL[1], FL[0], FL[1], LONA[0])
    # mastro, bandeirola e cordas com estacas
    c.ret(195, 107, 2, 6, MADEIRA[4])
    c.p(195, 107, MADEIRA[6])
    for (x, y, cor) in ((197, 107, "#d83a2a"), (198, 107, "#d83a2a"), (199, 107, "#e84a3a"), (200, 108, "#c02a1a"),
                        (197, 108, "#b8281a"), (198, 108, "#d83a2a"), (199, 108, "#e85a4a"), (197, 109, "#a02010")):
        c.p(x, y, cor)
    c.linha(196, 113, 219, 150, "#cbb88e", 0.8)
    c.linha(181, 107, 152, 147, "#cbb88e", 0.8)
    c.ret(219, 148, 1, 3, MADEIRA[1])
    c.ret(151, 145, 1, 3, MADEIRA[1])


def fogueira(c: Camada, e: Camada, luz) -> None:
    fx, fy = FOGO
    # cinza e terra queimada
    for y in range(fy - 3, fy + 6):
        for x in range(fx - 14, fx + 15):
            d = ((x - fx) / 13) ** 2 + ((y - fy - 1) / 4.6) ** 2
            if d < 1:
                k = (x * 7 + y * 13) % 5
                c.p(x, y, "#3a3430" if d > 0.6 else ["#5a5450", "#4a4440", "#6e6660", "#2a2420", "#7a726a"][k])
    # lenha cruzada e carvão
    for (x0, y0, x1, y1) in ((fx - 11, fy + 3, fx + 4, fy - 2), (fx + 11, fy + 3, fx - 4, fy - 2), (fx - 8, fy - 2, fx + 8, fy - 2)):
        for o in range(3):
            c.linha(x0, y0 + o, x1, y1 + o, MADEIRA[2 + (o == 0)] if o < 2 else "#1a100a")
        c.linha(x0, y0, x1, y1, "#2a1a10")
    for (x, y) in ((fx - 3, fy), (fx + 2, fy + 1), (fx - 6, fy + 2), (fx + 5, fy), (fx, fy + 2), (fx - 1, fy - 1)):
        c.p(x, y, "#1a1210")
        e.p(x, y, "#ff7a2a")
        e.p(x + 1, y, "#ffb040", 0.7)
    # anel de pedras
    g = np.random.default_rng(7)
    pedras = []
    for k in range(15):
        a = k / 15 * math.tau + 0.2
        pedras.append((fx + math.cos(a) * 17, fy + 1 + math.sin(a) * 6.2, k))
    pedras.sort(key=lambda p: p[1])
    for (x, y, k) in pedras:
        pedra(c, x, y, 2.6 + g.random() * 0.9, 1.9 + g.random() * 0.6, luz, seed=700 + k, paleta=PEDRA[:5], escuro=0.15)


def lampiao_toco(c: Camada, e: Camada, x: int, base: int, luz) -> None:
    """Toco de árvore com o lampião em cima."""
    lx = -1 if luz[0] < 0 else 1
    for y in range(base - 8, base + 1):
        for xx in range(x - 5, x + 6):
            u = (xx - x) / 5.5
            if abs(u) <= 1:
                k = u * lx * 0.8 + ((xx * 3 + y * 5) % 4 - 1.5) * 0.25
                c.p(xx, y, CASCA[int(np.clip(3.5 + k * 2.4, 1, 7))])
    for y in range(base - 10, base - 7):
        for xx in range(x - 5, x + 6):
            if ((xx - x) / 5.5) ** 2 + ((y - base + 8.5) / 1.6) ** 2 <= 1:
                r = math.hypot((xx - x) / 5.5, (y - base + 8.5) / 1.6)
                c.p(xx, y, "#d8b078" if int(r * 3) % 2 == 0 else "#b88a54")
    lampiao(c, e, x, base - 10, luz)


def lampiao(c: Camada, e: Camada, x: int, ybase: int, luz) -> None:
    """Lampião de ferro com vidro (o vidro vai para a camada emissiva) e alça; ybase = fundo do lampião."""
    ferro, ferro_c, latao = "#22201e", "#4a4440", "#c89a48"
    c.ret(x - 4, ybase - 2, 9, 2, ferro)
    c.ret(x - 4, ybase - 2, 9, 1, ferro_c)
    c.ret(x - 3, ybase - 11, 7, 9, ferro)
    e.ret(x - 2, ybase - 10, 5, 7, "#ffcf70")
    e.ret(x - 1, ybase - 9, 3, 5, "#ffe8a8")
    e.ret(x, ybase - 8, 1, 3, "#fff8e0")
    c.ret(x, ybase - 10, 1, 7, ferro, 0.6)
    c.ret(x - 4, ybase - 12, 9, 1, ferro_c)
    c.ret(x - 3, ybase - 13, 7, 1, latao)
    c.ret(x - 2, ybase - 14, 5, 1, ferro)
    c.ret(x - 1, ybase - 15, 3, 1, latao)
    c.p(x - 2, ybase - 17, ferro_c)
    c.p(x + 2, ybase - 17, ferro_c)
    c.ret(x - 1, ybase - 18, 3, 1, ferro_c)
    c.p(x - 3, ybase - 1, latao)


def lanterna_pendurada(c: Camada, e: Camada, x: int, y_galho: int, luz) -> None:
    for y in range(y_galho, y_galho + 6):
        c.p(x, y, "#3a3430" if y % 2 else "#6a625a")
    lampiao(c, e, x, y_galho + 22, luz)


def tora(c: Camada, x0: int, x1: int, y: int, luz) -> None:
    """Tronco deitado para sentar: casca em faixas, musgo em cima e o corte com anéis na ponta."""
    lx = -1 if luz[0] < 0 else 1
    r = 4.5
    for x in range(x0, x1):
        for yy in range(int(y - r), int(y + r) + 1):
            v = (yy - y) / r
            k = -v * 0.9 + 0.2 + (VEIOS[(x * 2) % H, yy % W] - 0.5) * 0.8
            i = int(np.clip((k * 0.5 + 0.5) * 7, 0, 7))
            c.p(x, yy, CASCA[i])
            if v < -0.5 and MUSGO_N[yy, x] > 0.6:
                c.p(x, yy, MUSGO[int(np.clip(2 + (0.5 - v) * 2, 0, 4))])
    for (kx, ky) in ((x0 + 9, y), (x0 + 27, y + 1)):
        c.ret(kx, ky, 2, 2, CASCA[1])
        c.p(kx, ky, CASCA[5])
    xe = x1 if lx > 0 else x0
    for yy in range(int(y - r), int(y + r) + 1):
        for xx in range(xe - 3, xe + 3):
            d = math.hypot((xx - xe) / 2.6, (yy - y) / r)
            if d <= 1:
                c.p(xx, yy, "#e8c890" if int(d * 4) % 2 == 0 else "#c49a64")
        c.p(xe, y, "#8a6038")


def caixotes_e_barril(c: Camada, luz) -> None:
    lx = -1 if luz[0] < 0 else 1

    def caixote(x0: int, yb: int, w: int, h: int, prof: int) -> None:
        frente = MADEIRA[4] if lx < 0 else MADEIRA[3]
        lado = MADEIRA[2] if lx < 0 else MADEIRA[5]
        topo = MADEIRA[6]
        c.ret(x0, yb - h, w, h, frente)
        for y in range(yb - h, yb, 3):
            c.ret(x0, y, w, 1, MADEIRA[2])
        c.ret(x0, yb - h, 2, h, MADEIRA[5])
        c.ret(x0 + w - 2, yb - h, 2, h, MADEIRA[5])
        c.linha(x0 + 2, yb - 2, x0 + w - 3, yb - h + 1, MADEIRA[5])
        for k in range(prof):
            c.ret(x0 + w + k, yb - h - k, 1, h, lado)
            c.ret(x0 + k + 1, yb - h - k - 1, w, 1, topo if k < prof - 1 else MADEIRA[5])
        for (nx, ny) in ((x0 + 1, yb - h + 1), (x0 + w - 2, yb - h + 1), (x0 + 1, yb - 2), (x0 + w - 2, yb - 2)):
            c.p(nx, ny, "#c0c0b8")
        c.ret(x0, yb - 1, w, 1, MADEIRA[1])

    # barril
    bx, bb = 106, 149
    for y in range(bb - 17, bb):
        bojo = 7 + 1.2 * math.sin((y - bb + 17) / 17 * math.pi)
        for x in range(int(bx - bojo), int(bx + bojo) + 1):
            u = (x - bx) / bojo
            k = u * lx * 0.8 + 0.1 - abs(u) ** 4 * 0.7
            i = int(np.clip((k * 0.5 + 0.5) * 6 + 0.5, 0, 6))
            cor = MADEIRA[i]
            if (x - bx + 20) % 3 == 0:
                cor = MADEIRA[max(0, i - 1)]
            if y in (bb - 15, bb - 14, bb - 4, bb - 3):
                cor = pal("#2a2826", "#4a4642", "#7a746c", "#a8a098")[int(np.clip((k * 0.5 + 0.5) * 4, 0, 3))]
            c.p(x, y, cor)
    for x in range(bx - 7, bx + 8):
        for y in range(bb - 20, bb - 16):
            if ((x - bx) / 7.2) ** 2 + ((y - bb + 18) / 2) ** 2 <= 1:
                c.p(x, y, MADEIRA[6] if y < bb - 18 else MADEIRA[5])
    c.ret(bx - 2, bb - 19, 4, 1, MADEIRA[3])
    caixote(118, 149, 18, 13, 4)
    caixote(121, 136, 12, 9, 3)
    # saco de estopa encostado
    for y in range(139, 150):
        meia = 4 + math.sin((y - 139) / 11 * math.pi) * 2
        for x in range(int(145 - meia), int(145 + meia) + 1):
            u = (x - 145) / meia
            c.p(x, y, LONA[int(np.clip(3 + u * lx * 1.8 + ((x + y) % 3 - 1) * 0.4, 0, 6))])
    c.ret(143, 138, 4, 1, "#8a6a40")


def mochila(c: Camada, x: int, yb: int, luz) -> None:
    lx = -1 if luz[0] < 0 else 1
    corpo = pal("#2e3a1e", "#44522a", "#5c6a36", "#768446", "#929e5a")
    for y in range(yb - 14, yb):
        meia = 6 - (1 if y < yb - 12 else 0) - (1 if y == yb - 1 else 0)
        for xx in range(x - meia, x + meia + 1):
            u = (xx - x) / meia
            c.p(xx, y, corpo[int(np.clip(2 + u * lx * 1.6 - (y - yb + 14) * 0.05, 0, 4))])
    # aba com fivela, bolso, alças
    c.ret(x - 5, yb - 14, 11, 5, corpo[3])
    c.ret(x - 5, yb - 10, 11, 1, corpo[0])
    c.ret(x, yb - 10, 1, 2, "#d0b060")
    c.ret(x - 3, yb - 6, 7, 4, corpo[1])
    c.ret(x - 3, yb - 6, 7, 1, corpo[3])
    c.p(x, yb - 5, "#d0b060")
    c.ret(x - 6, yb - 12, 1, 9, "#5a3a20")
    c.ret(x + 6, yb - 12, 1, 9, "#5a3a20")
    # cobertor enrolado em cima
    for xx in range(x - 7, x + 8):
        for y in range(yb - 19, yb - 14):
            v = (y - yb + 16.5) / 2.5
            c.p(xx, y, "#b83a2a" if v < -0.3 else "#8a2418" if v < 0.5 else "#5a160e")
            if (xx - x) % 5 == 0:
                c.p(xx, y, "#e0c070")
    c.ret(x - 4, yb - 19, 1, 5, "#3a2414")
    c.ret(x + 4, yb - 19, 1, 5, "#3a2414")


def saco_de_dormir(c: Camada, x0: int, x1: int, y: int, luz) -> None:
    corpo = pal("#1a2e44", "#24405e", "#305478", "#3e6a92", "#5486ae", "#78a6c8")
    r = 3.5
    for x in range(x0, x1):
        for yy in range(int(y - r), int(y + r) + 1):
            v = (yy - y) / r
            k = -v * 1.2 + 0.4 + (0.3 if (x - x0) % 7 == 0 else 0)
            c.p(x, yy, corpo[int(np.clip((k * 0.5 + 0.5) * 5, 0, 5))])
    # ponta em espiral
    for yy in range(int(y - r), int(y + r) + 1):
        for xx in range(x0 - 2, x0 + 3):
            d = math.hypot((xx - x0) / 2.4, (yy - y) / r)
            if d <= 1:
                c.p(xx, yy, corpo[4] if int(d * 3 + math.atan2(yy - y, xx - x0)) % 2 else corpo[1])
    for sx in (x0 + 7, x1 - 8):
        c.ret(sx, int(y - r), 2, int(r * 2) + 1, "#6a4424")
        c.p(sx, int(y - r), "#a87444")


def livros(c: Camada, x: int, yb: int) -> None:
    pilha = (("#2f5aa0", 13, 3), ("#a8382a", 12, 2), ("#3a7a3a", 13, 3), ("#d8a840", 11, 2), ("#6a3a84", 12, 3), ("#1e6a72", 10, 2))
    y = yb
    for k, (cor, larg, esp) in enumerate(pilha):
        dx = [0, 1, -1, 1, 0, 2][k]
        y -= esp
        base = hexa(cor)
        c.ret(x + dx, y, larg, esp, base)
        c.ret(x + dx, y, larg, 1, base * 1.3)
        c.ret(x + dx + larg - 2, y, 2, esp, "#efe6d0")  # páginas
        c.ret(x + dx + larg - 2, y + esp - 1, 2, 1, "#c8bca0")
        c.ret(x + dx + 2, y + (esp > 2), 1, 1, "#f0d060")
        c.ret(x + dx + 4, y + (esp > 2), 1, 1, "#f0d060")
    # livro aberto em cima
    y -= 2
    c.ret(x + 1, y, 6, 2, "#f4ecd8")
    c.ret(x + 7, y, 6, 2, "#e4dac2")
    c.ret(x + 6, y, 1, 2, "#a89878")
    c.ret(x + 2, y, 3, 1, "#8a8070", 0.5)
    c.ret(x + 8, y + 1, 3, 1, "#8a8070", 0.5)
    c.ret(x, y + 2, 14, 1, "#7a2a20")


def tripe_e_panela(c: Camada, e: Camada, x: int, yb: int, luz) -> None:
    """Tripé de galhos amarrados com a panela de ferro, pendurada sobre brasas num anel de pedras pequeno."""
    topo = (x, yb - 30)
    for (px, py) in ((x - 12, yb), (x + 12, yb), (x + 3, yb - 5)):
        c.linha(topo[0], topo[1], px, py, MADEIRA[3])
        c.linha(topo[0] + 1, topo[1], px + 1, py, MADEIRA[1])
    c.ret(x - 1, yb - 31, 3, 2, "#8a6a40")
    for y in range(yb - 29, yb - 15):
        c.p(x, y, "#5a5650" if y % 2 else "#8a847a")
    # brasas e pedras
    for k in range(7):
        a = k / 7 * math.tau
        pedra(c, x + math.cos(a) * 6, yb - 1 + math.sin(a) * 2, 1.6, 1.2, luz, seed=800 + k)
    for (bx, by) in ((x - 2, yb - 1), (x + 1, yb - 1), (x, yb - 2), (x + 3, yb - 1), (x - 3, yb - 2)):
        c.p(bx, by, "#2a1810")
        e.p(bx, by, "#ff6a20")
    # panela
    cy = yb - 10
    for y in range(cy - 4, cy + 4):
        meia = 7 - max(0, y - cy - 1) * 0.8
        for xx in range(int(x - meia), int(x + meia) + 1):
            u = (xx - x) / meia
            k = u * (-1 if luz[0] < 0 else 1) * -0.8 + 0.1 - abs(u) ** 3 * 0.6
            c.p(xx, y, pal("#121212", "#1e1e20", "#2e2e32", "#46464c", "#66666e")[int(np.clip((k * 0.5 + 0.5) * 4.5, 0, 4))])
    for xx in range(x - 7, x + 8):
        c.p(xx, cy - 5, "#7a7a80")
        c.p(xx, cy - 4, "#2a2a2e")
    for xx in range(x - 5, x + 6):
        c.p(xx, cy - 5 + (abs(xx - x) > 3), "#c8782a" if xx % 3 else "#e0a040")
    c.p(x - 8, cy - 3, "#3a3a3e")
    c.p(x + 8, cy - 3, "#3a3a3e")
    c.linha(x - 7, cy - 5, x, cy - 15, "#4a4642")
    c.linha(x + 7, cy - 5, x, cy - 15, "#4a4642")
    # concha de pau encostada
    c.linha(x + 4, cy - 6, x + 9, cy - 12, MADEIRA[5])


def placa(c: Camada, x: int, yb: int, luz) -> None:
    """Placa de madeira apontando o caminho do castelo (a prova)."""
    c.ret(x, yb - 22, 2, 22, MADEIRA[3])
    c.ret(x + (1 if luz[0] < 0 else 0), yb - 22, 1, 22, MADEIRA[5])
    c.ret(x - 1, yb - 1, 4, 1, MADEIRA[1])
    for (y0, x0, x1, ponta) in ((yb - 21, x - 13, x + 5, -1), (yb - 14, x - 3, x + 13, 1)):
        for y in range(y0, y0 + 5):
            meio = y0 + 2
            for xx in range(x0, x1 + 1):
                if ponta < 0 and xx - x0 < abs(y - meio):
                    continue
                if ponta > 0 and x1 - xx < abs(y - meio):
                    continue
                cor = MADEIRA[5] if y == y0 else MADEIRA[2] if y == y0 + 4 else MADEIRA[4]
                if (xx * 3 + y) % 7 == 0:
                    cor = MADEIRA[3]
                c.p(xx, y, cor)
        for k in range(4):  # letrinhas sugeridas
            c.p(x0 + 3 + k * 3, y0 + 2, "#efe0b8")
            c.p(x0 + 4 + k * 3, y0 + 2, "#efe0b8")
    c.p(x + 1, yb - 19, "#c0c0b8")
    c.p(x + 1, yb - 12, "#c0c0b8")


def lenha_empilhada(c: Camada, x: int, yb: int, luz) -> None:
    for fila in range(3):
        for k in range(4 - fila):
            cx = x + k * 5 + fila * 2.5
            cy = yb - 2 - fila * 4
            for yy in range(int(cy - 2), int(cy + 3)):
                for xx in range(int(cx - 2), int(cx + 3)):
                    d = math.hypot(xx - cx, yy - cy)
                    if d <= 2.4:
                        c.p(xx, yy, "#3a2414" if d > 1.9 else "#e0b078" if d < 0.9 else "#c08a50")


def pintar_acampamento(nome: str, per: dict) -> Objetos:
    o = Objetos()
    luz = per["luz"]
    o.add(149, caixotes_e_barril, luz)
    o.add(147, lenha_empilhada, 84, 147, luz)
    o.add(148, barraca, luz)
    o.add(155, mochila, 156, 155, luz)
    o.add(158, saco_de_dormir, 168, 194, 154, luz)
    o.add(150, fogueira, o.emissivo, luz)
    o.add(162, lampiao_toco, o.emissivo, 211, 162, luz)
    o.add(152, tora, 258, 304, 147, luz)
    o.add(154, livros, 311, 154)
    o.add(156, tripe_e_panela, o.emissivo, 339, 156, luz)
    o.add(122, placa, 318, 122, luz)
    o.add(112, lanterna_pendurada, o.emissivo, 322, 63, luz)
    fx, fy = FOGO
    o.luzes += [(211, 144, "#ffc870", 34, 0.85), (322, 80, "#ffc870", 40, 0.9), (339, 152, "#ff8a3a", 14, 0.35)]
    return o


# ─────────────────────────────── Primeiro plano ───────────────────────────────
def pintar_frente(nome: str, per: dict) -> Camada:
    """Folhagem muito perto da câmera nos cantos (sai bem desfocada)."""
    c = Camada()
    luz = per["luz"]
    for (cx, cy, r, s) in ((-4, 196, 30, 1), (40, 210, 22, 2), (480, 192, 30, 3), (436, 212, 20, 4),
                           (-8, 4, 26, 5), (488, 0, 28, 6)):
        copa(c, cx, cy, r, FOLHA_PERTO, luz, seed=900 + s, dens=0.5, carimbos=FOLHAS_CARIMBO, escala=2)
    g = np.random.default_rng(51)
    for _ in range(120):
        x = g.random() * W
        if 90 < x < 390:
            continue
        alt = 8 + int(g.random() * 16)
        for j in range(alt):
            c.p(x + (j * j) / 60 * (1 if x > 240 else -1), H - 1 - j, FOLHA_PERTO[2 + (j > alt // 2) + (j > alt * 0.8)])
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


GY, GX = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)
GYa, GXa = GY / ESC, GX / ESC


def luz_pontual(cx: float, cy: float, raio: float, achatar: float = 1.0) -> np.ndarray:
    d2 = ((GXa - cx) / raio) ** 2 + ((GYa - cy) / (raio * achatar)) ** 2
    return np.exp(-d2 * 2.2)


def luz_em_degraus(cx: float, cy: float, raio: float, achatar: float, seed: int, degraus: int = 6) -> np.ndarray:
    """Poça de luz com a borda irregular e anéis de pixel art na queda (como nas cenas das seções)."""
    ang = np.arctan2(GYa - cy, GXa - cx)
    g = np.random.default_rng(abs(int(seed)))
    f = [g.random() * 6.28 for _ in range(3)]
    mod = 1 + 0.08 * np.sin(5 * ang + f[0]) + 0.05 * np.sin(9 * ang + f[1]) + 0.03 * np.sin(14 * ang + f[2])
    d2 = ((GXa - cx) / (raio * mod)) ** 2 + ((GYa - cy) / (raio * achatar * mod)) ** 2
    i = np.exp(-d2 * 2.2)
    return i * 0.72 + np.floor(i * degraus) / degraus * 0.28


def raios_de_luz(mascara: np.ndarray, fonte: tuple[float, float], passos: int = 72, alcance: float = 0.92,
                 queda: float = 0.968) -> np.ndarray:
    hh, ww = mascara.shape
    sx, sy = fonte[0] * ESC, fonte[1] * ESC
    acum = np.zeros_like(mascara)
    peso = 1.0
    for i in range(passos):
        t = i / passos * alcance
        px = np.clip((GX + (sx - GX) * t).astype(np.int32), 0, ww - 1)
        py = np.clip((GY + (sy - GY) * t).astype(np.int32), 0, hh - 1)
        acum += mascara[py, px] * peso
        peso *= queda
    return acum / passos


def facho(x_topo, y_topo, x_base, y_base, larg_topo, larg_base, dureza: float = 1.0) -> np.ndarray:
    t = np.clip((GYa - y_topo) / (y_base - y_topo), 0, 1.3)
    centro = x_topo + (x_base - x_topo) * t
    larg = larg_topo + (larg_base - larg_topo) * t
    dist = np.abs(GXa - centro) / np.maximum(larg, 0.5)
    return np.exp(-dist ** (2 * dureza) * 2.4) * (GYa > y_topo)


def projetar_sombra(alfa: np.ndarray, base: np.ndarray, vetor) -> np.ndarray:
    """Sombra no chão: cada pixel de objeto, a altura h acima da sua linha de chão, cai em (x + sx h, base + sy h).
    `vetor` é (sx, sy) fixo (sol) ou uma função (x, base) -> (sx, sy) (luz pontual)."""
    ys, xs = np.nonzero((alfa > 0.4) & (base >= 0))
    out = np.zeros((H, W), dtype=np.float32)
    if len(xs) == 0:
        return out
    b = base[ys, xs]
    h = np.maximum(b - ys, 0).astype(np.float32)
    if callable(vetor):
        sx, sy = vetor(xs.astype(np.float32), b)
    else:
        sx, sy = vetor
    for s in np.linspace(0, 1, 4):
        hh = h + s
        tx = np.round(xs + sx * hh).astype(int)
        ty = np.round(b + sy * hh).astype(int)
        ok = (tx >= 0) & (tx < W) & (ty >= 0) & (ty < H)
        out[ty[ok], tx[ok]] = 1
    return out


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    fx, fy = FOGO
    luz_dir = per["luz"]

    ceu = ampliar(pintar_ceu(nome, per))
    montes, cast, janelas = pintar_montes(nome, per)
    longe = pintar_mata_longe(nome, per)
    meio = pintar_mata_meio(nome, per)
    chao, terra, agua, brilhos = pintar_chao(nome, per)
    base_arv = np.full((H, W), -1, dtype=np.float32)
    perto = pintar_arvores_perto(nome, per, base_arv)
    obj = pintar_acampamento(nome, per)
    dossel = pintar_dossel(nome, per)
    frente = pintar_frente(nome, per)

    # ── composição do albedo, com profundidade de campo e os mapas de névoa, sol e "perto da fogueira"
    nevoa_chao = np.clip(1 - (GYa - HORIZ) / 26, 0, 1) * 0.22
    planos = [  # (camada, desfoque, névoa, recebe sol, recebe fogo)
        (montes.c, 2.0, 0.5, 0.15, 0.0),
        (cast.c, 0.8, 0.24, 0.25, 0.0),
        (longe.c, 1.6, 0.32, 0.2, 0.0),
        (meio.c, 0.9, 0.07, 0.5, 0.25),
        (chao.c, 0.0, nevoa_chao, 1.0, 1.0),
        (obj.cam.c, 0.0, 0.0, 1.0, 1.0),
        (perto.c, 0.5, 0.0, 0.6, 0.7),
        (dossel.c, 1.6, 0.04, 0.35, 0.1),
    ]
    img = ceu.copy()
    solido = np.zeros(img.shape[:2], dtype=np.float32)
    m_nevoa = np.zeros_like(solido)
    m_sol = np.zeros_like(solido)
    m_fogo = np.zeros_like(solido)
    camadas_a = []
    for cam, r, nev, so, fo in planos:
        a = desfocar_rgba(ampliar(cam), r)
        camadas_a.append(a)
        al = a[:, :, 3]
        img = sobre(img, a)
        solido = solido * (1 - al) + al
        m_nevoa = m_nevoa * (1 - al) + nev * al
        m_sol = m_sol * (1 - al) + so * al
        m_fogo = m_fogo * (1 - al) + fo * al
    obj_a = camadas_a[5][:, :, 3]

    # ── sombras projetadas (sol de dia; a fogueira à noite) e oclusão de contato
    alfa_obj = obj.cam.c[:, :, 3]
    if per["sombra"] is not None:
        s_obj = projetar_sombra(alfa_obj, obj.base, per["sombra"])
        s_arv = projetar_sombra(perto.c[:, :, 3], base_arv, per["sombra"])
        sombra_sol = np.maximum(s_obj, s_arv)
    else:
        sombra_sol = np.zeros((H, W), np.float32)
    def do_fogo(xs, b):
        vx, vy = xs - fx, b - fy
        n = np.maximum(np.hypot(vx, vy * 2.6), 1)
        k = np.clip(n / 26, 0.4, 2.4)
        return vx / n * k, vy / n * k * 0.45
    sombra_fogo = projetar_sombra(alfa_obj, obj.base, do_fogo)
    sombra_fogo[fy - 8:fy + 7, fx - 19:fx + 20] = 0  # as pedras do próprio anel não fazem sombra
    # tarde: troncos fora do quadro, à direita, riscam a clareira com sombras longas
    if nome == "tarde":
        for (bx, by, larg) in ((486, 120, 5), (500, 146, 7), (492, 176, 6), (470, 104, 3), (520, 132, 9)):
            yy = by + (bx - XA) * (per["sombra"][1] / -per["sombra"][0])
            banda = (np.abs(YA - yy) < larg * 0.5 + (bx - XA) * 0.012) & (XA < bx) & (YA > HORIZ)
            sombra_sol = np.maximum(sombra_sol, banda.astype(np.float32) * 0.9)
    so_chao = (YA > HORIZ - 2).astype(np.float32)
    sombra_sol = sombra_sol * so_chao * (alfa_obj < 0.5)
    sombra_fogo = sombra_fogo * so_chao * (alfa_obj < 0.5)
    sombra_sol = desfocar(ampliar(sombra_sol[:, :, None]), 2.2)[:, :, 0]
    sombra_fogo = desfocar(ampliar(sombra_fogo[:, :, None]), 3.5)[:, :, 0]
    # oclusão: embaixo dos objetos, na borda da mata e no pé das árvores
    ao = np.zeros((H, W), np.float32)
    pe = (alfa_obj > 0.4) & (obj.base >= 0) & (np.abs(YA - obj.base) < 3)
    ao = np.maximum(ao, pe.astype(np.float32))
    ao = np.maximum(ao, suave(HORIZ + 10, HORIZ - 2, YA) * 0.7)
    ao = desfocar(ampliar(ao[:, :, None]), 4)[:, :, 0] * (1 - obj_a * 0.7)

    # ── a luz do sol: poça na clareira e salpicos das folhas, com bordas em degraus
    folhas = ruido(61, 7) * 0.6 + ruido(62, 3) * 0.4
    salpico = np.floor(suave(0.38, 0.6, folhas) * 3.99) / 3
    salpico = desfocar(ampliar(salpico[:, :, None]), 0.8)[:, :, 0]
    if nome == "manha":
        poca = luz_em_degraus(258, 136, 120, 0.42, 11) * 1.05
        k_salp = np.clip(1 - poca, 0.15, 1)
        mapa_sol = np.clip(poca, 0, 1.1) * (1 - k_salp * (1 - salpico))
        mapa_sol = np.maximum(mapa_sol, salpico * 0.3)
    elif nome == "tarde":
        lado = suave(0, 330, GXa)
        mapa_sol = (0.4 + lado * 0.7) * (0.6 + 0.4 * salpico)
        mapa_sol = np.maximum(mapa_sol, luz_em_degraus(320, 130, 110, 0.4, 12) * 0.7)
    else:
        mapa_sol = luz_em_degraus(236, 136, 80, 0.4, 13) * (0.6 + 0.4 * salpico)
    mapa_sol = mapa_sol * (1 - sombra_sol * 0.92)
    # pousos dos feixes: manchas de sol no chão onde cada facho chega
    pousos = {"manha": ((262, 150, 16), (312, 146, 10), (220, 140, 7), (340, 128, 6), (168, 124, 6), (196, 113, 4)),
              "tarde": ((166, 150, 16), (252, 164, 13), (96, 122, 10)), "noite": ()}[nome]
    for (px_, py_, r_) in pousos:
        mapa_sol = mapa_sol + luz_em_degraus(px_, py_, r_ * 1.6, 0.42, px_, 4) * 0.55 * (GYa > HORIZ)
    # no alto (copas e mata), o sol só acende manchas e bordas; as laterais ficam na sombra do dossel
    alto = suave(HORIZ + 4, HORIZ - 10, GYa)
    mapa_sol = mapa_sol * (1 - alto) + (salpico ** 2 * 0.55 + 0.04) * alto
    sob_dossel = (1 - suave(150, 215, GXa) * suave(370, 318, GXa)) * suave(HORIZ + 6, HORIZ - 30, GYa)

    amb = hexa(per["amb"]) * per["amb_k"]
    luz = amb * (1 - ao[:, :, None] * 0.55) * (1 - sob_dossel * 0.35)[:, :, None]
    luz = luz + hexa(per["sol"]) * per["sol_k"] * (mapa_sol * m_sol)[:, :, None]
    # fogueira: poça em degraus, miolo forte, e bloqueio pelas sombras dos objetos
    fk = per["fogo_k"]
    fogo = luz_em_degraus(fx, fy - 6, 120, 0.55, 21, 7)[:, :, None] * hexa("#ff8a3a") * 1.35
    fogo += luz_pontual(fx, fy - 8, 40, 0.8)[:, :, None] * hexa("#ffd890") * (0.9 if nome != "noite" else 0.55)
    fogo = fogo * (1 - sombra_fogo * 0.85)[:, :, None]
    luz = luz + fogo * fk * m_fogo[:, :, None]
    lk = per["lamp_k"]
    for (lx, ly, cor, raio, k) in obj.luzes:
        luz = luz + luz_em_degraus(lx, ly, raio, 0.75, int(lx), 5)[:, :, None] * hexa(cor) * k * lk * m_fogo[:, :, None]
    # vaga-lumes (só à noite): pontinhos de luz que acendem o que está perto
    vagas = []
    if nome == "noite":
        g = np.random.default_rng(17)
        while len(vagas) < 46:
            x, y = 30 + g.random() * 420, 50 + g.random() * 120
            if any(x0 - 2 <= x <= x1 + 2 and y0 - 2 <= y <= y1 + 2 for (x0, y0, x1, y1) in LIVRE.values()):
                continue
            vagas.append((x, y, 0.5 + g.random() * 0.6))
        for (x, y, k) in vagas:
            luz = luz + luz_pontual(x, y + 4, 9, 0.6)[:, :, None] * hexa("#b8ff70") * 0.18 * k
    sol_ = solido[:, :, None]
    img = img * (1 - sol_) + img * sol_ * luz

    # ── névoa por distância (mais clara onde o sol atravessa)
    nev = hexa(per["nevoa"]) * per["nevoa_k"]
    brilho_nev = 1.0
    if nome == "tarde":
        brilho_nev = 1 + luz_pontual(320, 56, 90, 0.7)[:, :, None] * 0.8
    elif nome == "manha":
        brilho_nev = 1 + luz_pontual(200, 30, 110, 0.8)[:, :, None] * 0.2
    mn = m_nevoa[:, :, None] * sol_
    img = img * (1 - mn) + nev * brilho_nev * mn

    # ── emissivos: vidro das lanternas, brasas, janelas do castelo
    em = ampliar(obj.emissivo.c)
    k_em = {"manha": 0.35, "tarde": 0.75, "noite": 1.5}[nome]
    img = img * (1 - em[:, :, 3:4] * min(1, k_em)) + em[:, :, :3] * em[:, :, 3:4] * k_em
    halo = desfocar(em[:, :, :3] * em[:, :, 3:4], 6) * 1.2 + desfocar(em[:, :, :3] * em[:, :, 3:4], 20) * 1.2
    img += halo * k_em * 0.5
    if nome == "noite":
        for (wx, wy) in janelas:
            X, Y = int(wx * ESC), int(wy * ESC)
            img[Y:Y + 2 * ESC, X:X + ESC] = hexa("#ffd27a") * 1.3
        jan = np.zeros((H, W), np.float32)
        for (wx, wy) in janelas:
            jan[wy, wx] = 1
        img += desfocar(ampliar(jan[:, :, None]), 5) * hexa("#ffb050") * 2.5

    # ── feixes de luz volumétricos e poeira
    ys_a = GYa
    vis_ceu = (1 - solido) * (ys_a < 70)
    poe = ampliar(ruido(81, 4)[:, :, None])[:, :, 0]
    if nome == "manha":
        raios = raios_de_luz(vis_ceu.astype(np.float32), (40, -110), passos=80, alcance=0.95)
        raios = desfocar(raios[:, :, None], 5)[:, :, 0]
        img += raios[:, :, None] * hexa("#ffe6b0") * 0.8
        f = (facho(200, 0, 262, 150, 9, 30, 1.7) * 1.0 + facho(234, 0, 312, 146, 5, 17, 1.7) * 0.7 +
             facho(172, 6, 220, 140, 3.5, 11, 1.5) * 0.6 + facho(268, 0, 340, 126, 3, 9, 1.5) * 0.45 +
             facho(122, 10, 168, 124, 2.5, 8, 1.5) * 0.45 + facho(152, 4, 196, 112, 2, 5, 1.5) * 0.4)
        f = f * np.clip(1.2 - ys_a / 170, 0, 1) * (0.55 + 0.7 * poe)
        f = desfocar(f[:, :, None], 2.5)[:, :, 0] * (1 - obj_a * 0.5)
        img += f[:, :, None] * hexa("#ffe6a8") * 0.75
        cor_poeira, peso_poeira = "#fff4d0", f * 2.2
    elif nome == "tarde":
        brilho = np.exp(-np.hypot(GXa - 320, (GYa - 55) * 1.2) / 6)
        raios = raios_de_luz((vis_ceu * (0.4 + brilho * 3)).astype(np.float32), (320, 55), passos=90, alcance=0.97, queda=0.975)
        raios = desfocar(raios[:, :, None], 4)[:, :, 0]
        img += raios[:, :, None] * hexa("#ffc078") * 2.0
        f = (facho(320, 56, 160, 150, 4, 30, 1.3) * 0.55 + facho(320, 56, 250, 166, 3, 22, 1.4) * 0.5 +
             facho(320, 56, 90, 120, 3, 18, 1.4) * 0.35)
        f = f * (0.55 + 0.6 * poe) * np.clip((GXa - 60) / 120, 0, 1)
        f = desfocar(f[:, :, None], 3)[:, :, 0] * (1 - obj_a * 0.5)
        img += f[:, :, None] * hexa("#ffb468") * 0.5
        cor_poeira, peso_poeira = "#ffd8a0", f * 2.0
    else:
        f = facho(232, 18, 238, 140, 8, 34, 1.2) * np.clip(1.1 - ys_a / 180, 0, 1) * (0.6 + 0.5 * poe)
        f = desfocar(f[:, :, None], 4)[:, :, 0] * (1 - obj_a * 0.6)
        img += f[:, :, None] * hexa("#7a9ae8") * 0.22
        cor_poeira, peso_poeira = "#c8d8ff", f * 1.0
    g = np.random.default_rng(83)
    rgbp = hexa(cor_poeira)
    for _ in range(1500):
        X, Y = int(g.random() * (W * ESC - 4)), int(g.random() * (H * ESC - 4))
        k = peso_poeira[Y, X] * (0.3 + g.random() * 0.8)
        if k > 0.05:
            tam = 2 if g.random() < 0.7 else 3
            img[Y:Y + tam, X:X + tam] += rgbp * k
    # vapor da panela (sobe ondulando e some)
    vap = np.zeros((H * ESC, W * ESC), np.float32)
    for k in range(60):
        t = k / 60
        x = 339 + math.sin(t * 9) * (1 + t * 3) + t * 3
        y = 140 - t * 26
        X, Y = int(x * ESC), int(y * ESC)
        vap[Y - 2:Y + 3, X - 2:X + 3] += (1 - t) * 0.5
    vap = desfocar(vap[:, :, None], 4)[:, :, 0]
    img += vap[:, :, None] * hexa("#e8e4dc") * {"manha": 0.35, "tarde": 0.35, "noite": 0.18}[nome]
    # folhas caindo (dia) e borboletas na manhã, pixel a pixel
    gl = np.random.default_rng(29)
    if nome != "noite":
        for _ in range(14):
            x, y = 150 + gl.random() * 200, 30 + gl.random() * 70
            if any(x0 - 3 <= x <= x1 + 3 and y0 - 3 <= y <= y1 + 3 for (x0, y0, x1, y1) in LIVRE.values()):
                continue
            cor = hexa(["#e0a040", "#c86a2a", "#a8b84a", "#f0c860"][int(gl.random() * 4)])
            X, Y = int(x) * ESC, int(y) * ESC
            k = 0.7 + peso_poeira[Y, X] * 1.5
            img[Y:Y + ESC, X:X + 2 * ESC] = cor * k
            img[Y + ESC:Y + 2 * ESC, X + ESC:X + 2 * ESC] = cor * k * 0.7
    if nome == "manha":
        for (x, y, cor) in ((176, 158, "#fff4d0"), (352, 136, "#f6d24a"), (98, 132, "#b8d8ff")):
            X, Y = x * ESC, y * ESC
            for (dx, dy) in ((0, 0), (2, 0), (0, 1), (2, 1)):
                img[Y + dy * ESC:Y + (dy + 1) * ESC, X + dx * ESC:X + (dx + 1) * ESC] = hexa(cor) * 1.1
            img[Y:Y + 2 * ESC, X + ESC:X + 2 * ESC] = hexa("#2a2018")
    # vaga-lumes: núcleo e halo
    if vagas:
        vl = np.zeros((H * ESC, W * ESC), np.float32)
        for (x, y, k) in vagas:
            X, Y = int(x * ESC), int(y * ESC)
            vl[Y:Y + 3, X:X + 3] += k
        img += vl[:, :, None] * hexa("#e8ffb0") * 1.2
        img += desfocar(vl[:, :, None], 5) * hexa("#a8ff60") * 3.0
        img += desfocar(vl[:, :, None], 14) * hexa("#80d040") * 2.0

    # ── primeiro plano desfocado e escuro
    fr = desfocar_rgba(ampliar(frente.c), 9)
    k_fr = {"manha": 0.55, "tarde": 0.42, "noite": 0.32}[nome]
    img = sobre(img, fr * np.array([k_fr, k_fr, k_fr * 1.05, 1], dtype=np.float32))

    # ── acabamento: brilho, curva de tom, cor, vinheta e grão
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.85) * 5, 0, 1), 0, 2)
    img = img + desfocar(claro, 12) * 0.4 + desfocar(claro, 36) * 0.3
    joelho = 0.72
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, fr_ = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (fr_ * 0.5 + 0.5)))
    img = np.clip((img - 0.48) * 1.08 + 0.48, 0, 1.2)
    xn, yn = GX / (W * ESC), GY / (H * ESC)
    v = (xn - 0.5) ** 2 * 1.3 + (yn - 0.6) ** 2 * 1.6
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.1)[:, :, None]
    gg = np.random.default_rng(99)
    img += (gg.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.014
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    nomes = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in nomes:
        t0 = time.time()
        img = montar(nome)
        img.save(PASTA / f"cena-{nome}.webp", quality=84, method=6)
        img.resize((960, 400), Image.LANCZOS).save(PASTA / f"cena-{nome}-960.webp", quality=82, method=6)
        print(nome, (PASTA / f"cena-{nome}.webp").stat().st_size // 1024, "KB",
              (PASTA / f"cena-{nome}-960.webp").stat().st_size // 1024, "KB", f"{time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
