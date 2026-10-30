"""Cenário "HD-2D" da página Desempenho: o observatório da vila, no alto da torre de pedra (30/10/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai
das funções abaixo, na mesma técnica das outras cenas (scripts/gerar_cena_atlas.py e scripts/gerar_cena_vila.py):
pixel art em 480 x 160, camada por camada, montada em 3x com a luz calculada por pixel.

A cena: o interior da cúpula de madeira do observatório, com nervuras, rebites de latão e o trilho dentado em que a
cúpula gira. A fenda está aberta (a porta de correr empurrada para o lado) e por ela se vê o céu da hora do dia, com
as montanhas e a vila lá embaixo. A grande luneta de latão, na sua montagem equatorial sobre um pilar de ferro,
aponta pela fenda. Em volta: o astrolábio esférico (esfera armilar) num pé de madeira, o astrolábio plano na parede,
mapas celestes e gráficos de pergaminho (barras e curvas desenhadas à tinta, porque é a página das estatísticas),
uma mesa com papéis, tinteiro, um fêmur de peso de papel e a lamparina; à noite, estrelas e constelações ligadas por
linhas fracas, uma delas em forma de fêmur, e o Cruzeiro do Sul.

A luz:
- o feixe que entra pela fenda é traçado por pixel (cada ponto da sala "olha" na direção do sol até a fenda), então a
  luneta projeta a própria sombra dentro do feixe e no chão; poeira suspensa brilha no feixe;
- manhã: sol frio-dourado e limpo, feixe pousando no chão ao lado da luneta; tarde: poente laranja, feixe mais
  inclinado e comprido; noite: luar fraco e azul pela fenda e a lamparina e a vela acesas, com brilho (bloom);
- profundidade de campo (fundo e primeiro plano desfocados), sombras de contato, correção de cor, vinheta e grão.

Composição para a interface: os 42% da esquerda ficam calmos e escuros (o texto vai ali); a fenda, a luneta e a mesa
ficam do centro para a direita. O chão em x 330–380 fica livre para o mascote (pés em y ≈ 150).

Gera em public/pixel/paginas/: observatorio-{manha,tarde,noite}.webp (1440 x 480) e -960.webp (960 x 320).
Uso: python3 scripts/gerar_cena_observatorio.py [manha|tarde|noite ...]
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

# Geometria da cúpula (pixels da arte).
AX, AY = 288.0, -70.0      # zênite (fora da imagem, acima)
BASE = 62.0                # onde a cúpula encontra o trilho
RAIO = 300.0               # raio da cúpula na base (em px)
FENDA = 52.0               # meia largura da fenda, medida na base
PAREDE_CHAO = 125          # junção da parede com o assoalho
# Luneta: ponta da ocular (embaixo, à direita) e da objetiva (em cima, dentro da fenda).
OCULAR = (323.0, 105.0)
OBJETIVA = (266.0, 23.0)
PILAR_X = 300
LAMPARINA = (455.5, 101.5)  # chama da lamparina da mesa
VELA = (259.5, 81.5)        # chama da vela na arandela da parede
VELA_ESQ = (40.5, 84.0)     # vela fraquinha na estante da esquerda


# ─────────────────────────────── Pincéis ───────────────────────────────
@lru_cache(maxsize=None)
def _hexa(c: str) -> tuple:
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def hexa(c) -> np.ndarray:
    if isinstance(c, str):
        return np.array(_hexa(c), dtype=np.float32)
    return np.asarray(c, dtype=np.float32)


def mistura(a, b, t: float) -> np.ndarray:
    return hexa(a) * (1 - t) + hexa(b) * t


def hash01(*v: int) -> float:
    """Número pseudoaleatório estável 0..1 (a textura não muda entre execuções)."""
    h = 2166136261
    for k in v:
        h = ((h ^ (int(k) & 0xFFFFFFFF)) * 16777619) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 1274126177) & 0xFFFFFFFF
    return (h & 0xFFFF) / 65535


_YS, _XS = np.mgrid[0:H, 0:W].astype(np.float32)


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples."""

    def __init__(self) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and a > 0:
            rgb = hexa(cor)
            base = self.c[y, x]
            na = a + base[3] * (1 - a)
            if na > 0:
                base[:3] = (rgb * a + base[:3] * base[3] * (1 - a)) / na
            base[3] = na

    def ret(self, x0, y0, w, h, cor, a: float = 1.0) -> None:
        x0, y0, w, h = int(round(x0)), int(round(y0)), int(round(w)), int(round(h))
        xa, xb, ya, yb = max(0, x0), min(W, x0 + w), max(0, y0), min(H, y0 + h)
        if xa >= xb or ya >= yb:
            return
        m = np.zeros((H, W), dtype=np.float32)
        m[ya:yb, xa:xb] = 1
        self.mascara(m, cor, a)

    def mascara(self, m: np.ndarray, cor, a: float = 1.0) -> None:
        am = np.clip(m * a, 0, 1)[:, :, None]
        rgb = hexa(cor) if isinstance(cor, str) or np.ndim(cor) == 1 else cor
        base_a = self.c[:, :, 3:4]
        na = am + base_a * (1 - am)
        seguro = np.maximum(na, 1e-6)
        self.c[:, :, :3] = np.where(na > 0, (rgb * am + self.c[:, :, :3] * base_a * (1 - am)) / seguro, self.c[:, :, :3])
        self.c[:, :, 3:4] = na

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        vistos = set()
        for i in range(n + 1):
            t = i / max(n, 1)
            x, y = int(round(x0 + (x1 - x0) * t)), int(round(y0 + (y1 - y0) * t))
            if (x, y) not in vistos:
                vistos.add((x, y))
                self.p(x, y, cor, a)

    def elipse(self, cx, cy, rx, ry, cor, a: float = 1.0) -> None:
        self.mascara(elipse_m(cx, cy, rx, ry), cor, a)

    def poligono(self, pts, cor, a: float = 1.0) -> None:
        self.mascara(poligono_m(pts), cor, a)

    def bitmap(self, x0, y0, linhas, cores: dict, a: float = 1.0) -> None:
        for j, ln in enumerate(linhas):
            for i, ch in enumerate(ln):
                if ch in cores:
                    self.p(x0 + i, y0 + j, cores[ch], a)

    def cilindro(self, x0, y0, x1, y1, r0, r1, tons, luz=-0.45, faixas=()) -> None:
        """Tubo sombreado (latão, ferro): tons do escuro ao claro, brilho do lado `luz` (−1 = lado esquerdo/de cima)."""
        vx, vy = x1 - x0, y1 - y0
        comp = math.hypot(vx, vy) or 1e-6
        ux, uy = vx / comp, vy / comp
        nx, ny = -uy, ux
        rm = max(r0, r1) + 1
        for y in range(int(min(y0, y1) - rm), int(max(y0, y1) + rm) + 1):
            for x in range(int(min(x0, x1) - rm), int(max(x0, x1) + rm) + 1):
                px, py = x + 0.5 - x0, y + 0.5 - y0
                t = (px * ux + py * uy) / comp
                if t < 0 or t > 1:
                    continue
                d = px * nx + py * ny
                r = r0 + (r1 - r0) * t
                if abs(d) > r:
                    continue
                v = d / r  # -1..1 através do tubo
                k = 1 - abs(v - luz) * 0.9
                k += (hash01(x, y, 5) - 0.5) * 0.12
                i = int(np.clip(k * (len(tons) - 0.01), 0, len(tons) - 1))
                cor = tons[i]
                for (ta, tb, cf) in faixas:
                    if ta <= t <= tb:
                        cor = cf[min(len(cf) - 1, i * len(cf) // len(tons))]
                if abs(v) > 0.86:
                    cor = mistura(tons[0], "#000000", 0.25)
                self.p(x, y, cor)

    def contornar(self, cor: str, a: float = 1.0) -> None:
        alfa = self.c[:, :, 3] > 0.5
        viz = np.zeros_like(alfa)
        viz[1:] |= alfa[:-1]
        viz[:-1] |= alfa[1:]
        viz[:, 1:] |= alfa[:, :-1]
        viz[:, :-1] |= alfa[:, 1:]
        borda = viz & ~alfa
        self.c[borda, :3] = hexa(cor)
        self.c[borda, 3] = a


def colar(dst: Camada, src: Camada, contorno: str | None = None, a: float = 1.0) -> None:
    if contorno:
        al = src.c[:, :, 3] > 0.5
        viz = np.zeros_like(al)
        for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            viz |= np.roll(np.roll(al, dy, 0), dx, 1)
        dst.mascara((viz & ~al).astype(np.float32), contorno, a)
    dst.mascara(src.c[:, :, 3], src.c[:, :, :3])


def elipse_m(cx, cy, rx, ry) -> np.ndarray:
    return ((((_XS + 0.5 - cx) / max(rx, 0.01)) ** 2 + ((_YS + 0.5 - cy) / max(ry, 0.01)) ** 2) <= 1).astype(np.float32)


def poligono_m(pts) -> np.ndarray:
    m = np.zeros((H, W), dtype=bool)
    px, py = _XS + 0.5, _YS + 0.5
    n = len(pts)
    for i in range(n):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % n]
        if y0 == y1:
            continue
        cruza = ((y0 <= py) & (py < y1)) | ((y1 <= py) & (py < y0))
        xc = x0 + (py - y0) * (x1 - x0) / (y1 - y0)
        m ^= cruza & (px < xc)
    return m.astype(np.float32)


def ruido(seed: int, ex: int, ey: int | None = None, w: int = W, h: int = H) -> np.ndarray:
    ey = ey or ex
    g = np.random.default_rng(seed)
    pequeno = g.random((h // ey + 3, w // ex + 3)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize(((w // ex + 3) * ex, (h // ey + 3) * ey), Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32)[ey:ey + h, ex:ex + w] / 255, 0, 1)


def tons_idx(tons, k: float):
    return tons[int(np.clip(k, 0, 0.999) * len(tons))]


# Paletas (do escuro ao claro). A luz da hora entra depois, na montagem.
LATAO = ["#2a1a08", "#5a3a12", "#8a5e1e", "#b8862e", "#dcae48", "#f4d27a", "#fff0b8"]
LATAO_ESC = ["#1e1206", "#3a2610", "#5e4018", "#7e5a22"]
FERRO = ["#121214", "#1e1e24", "#2c2c34", "#3e3e48", "#56565f", "#7c7c86"]
MADEIRA = ["#1e120a", "#2e1c10", "#422816", "#58361e", "#704628", "#8a5a34", "#a6703f"]
PERGAMINHO = ["#8a6e48", "#b0905e", "#ccae78", "#e2c892", "#f2e0b0", "#faf0d0"]
TINTA = "#2e2016"
PEDRA = ("#9a8c84", "#7c706c", "#605654", "#443c3e", "#2e282c")


# ─────────────────────────────── Horas do dia ───────────────────────────────
PERIODOS = {
    "manha": dict(
        ceu=("#4f8ed6", "#8cc0ea", "#e6f0f0"), amb="#9eaacc", amb_k=0.72, ceu_luz="#bcd4f4", ceu_k=0.7,
        sol="#ffe6b0", sol_k=1.4, rumo=(-0.62, -1.0), feixe=0.20, lamp=0.0, vela=0.0,
        quente="#ffe8c4", fria="#22406a", montanha=("#7a9ccc", "#9ab6d8"), nuvem=("#ffffff", "#c6d8ee")),
    "tarde": dict(
        ceu=("#36326e", "#c8706a", "#ffc47c"), amb="#9a7898", amb_k=0.56, ceu_luz="#ffb07a", ceu_k=0.55,
        sol="#ff9a50", sol_k=1.25, rumo=(-1.18, -1.0), feixe=0.26, lamp=0.5, vela=0.45,
        quente="#ffd49a", fria="#36285a", montanha=("#5a4a7a", "#8a5e7a"), nuvem=("#ffd2a0", "#b0708a")),
    "noite": dict(
        ceu=("#030716", "#0a1432", "#182a58"), amb="#34447e", amb_k=0.5, ceu_luz="#5a78d0", ceu_k=0.42,
        sol="#8eaaff", sol_k=0.8, rumo=(0.42, -1.0), feixe=0.16, lamp=1.5, vela=1.05,
        quente="#ffcf8a", fria="#0a1432", montanha=("#0c1430", "#141e40"), nuvem=("#28385e", "#141e3a")),
}


# ─────────────────────────────── Céu (visto pela fenda) ───────────────────────────────
ESTRELAS_FEMUR = [(309, 8), (314, 13), (322, 10), (313, 21), (318, 31), (320, 41), (315, 50), (326, 49)]
LIGACOES_FEMUR = [(0, 1), (1, 2), (1, 3), (2, 4), (3, 4), (4, 5), (5, 6), (5, 7), (6, 7)]
CRUZEIRO = [(250, 36), (252, 54), (244, 45), (258, 44), (254, 48)]


def coord_cupula(x, y):
    """Coordenadas da cúpula para um pixel: v (0 na base, 1 no zênite) e a posição na base (xb)."""
    q = ((x - AX) / 240.0) ** 2
    v = (BASE - y) / (132.0 + 30.0 * q)
    cv = np.cos(np.clip(v, 0, 0.999) * math.pi / 2)
    xb = AX + (x - AX) / np.maximum(cv, 1e-3)
    return v, xb, cv


def fenda_aberta(x, y) -> np.ndarray:
    v, xb, _ = coord_cupula(x, y)
    return (np.abs(xb - AX) < FENDA) & (y < BASE)


def pintar_ceu(nome: str, per: dict) -> np.ndarray:
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    t = np.clip(_YS / 62, 0, 1)[:, :, None]
    ceu = np.where(t < 0.55, topo * (1 - t / 0.55) + meio * (t / 0.55), meio * (1 - (t - 0.55) / 0.45) + horiz * ((t - 0.55) / 0.45))
    ceu = ceu.astype(np.float32)
    # Nuvens finas em faixas (manhã e tarde) e véu fino à noite.
    nuv = ruido(41, 26, 5) * 0.6 + ruido(42, 9, 3) * 0.4
    faixa = np.exp(-((_YS - 30) / 14) ** 2) + np.exp(-((_YS - 50) / 5) ** 2) * 0.6
    v = np.clip((nuv - 0.5) * 3.2 * faixa, 0, 0.85)
    sob = np.clip((np.roll(nuv, -2, 0) - 0.5) * 3.2 * faixa, 0, 1) < v - 0.05
    cn, cs = hexa(per["nuvem"][0]), hexa(per["nuvem"][1])
    k = v[:, :, None] * (0.85 if nome != "noite" else 0.35)
    ceu = ceu * (1 - k) + np.where(sob[:, :, None], cn, cs) * k
    if nome == "manha":
        # sol fora da fenda (à esquerda, alto): só o clarão
        d = np.hypot(_XS - 200, _YS + 40)
        ceu += (np.exp(-d / 120) * 0.35)[:, :, None] * hexa("#fff4d8")
    elif nome == "tarde":
        d = np.hypot(_XS - 150, (_YS - 70) * 1.3)
        ceu += (np.exp(-d / 90) * 0.55)[:, :, None] * hexa("#ffcf80")
        # passarinhos voltando para casa
        for (bx, by) in ((300, 30), (306, 26), (311, 31)):
            for (dx, dy) in ((-1, -1), (0, 0), (1, -1)):
                ceu[by + dy, bx + dx] = hexa("#2a1a2a")
    else:
        g = np.random.default_rng(17)
        for _ in range(420):
            x, y = int(g.random() * W), int(g.random() * 62)
            b = 0.25 + g.random() ** 2.2 * 0.9
            ceu[y, x] += b * hexa("#e4ecff")
        via = np.exp(-((_YS - 0.55 * (_XS - 240) - 26) / 9) ** 2) * ruido(43, 5) * 0.32
        ceu += via[:, :, None] * hexa("#8494d4")
        # constelações: linhas fracas e estrelas maiores
        def ligar(pts, pares, cor, a):
            for (i, j) in pares:
                (x0, y0), (x1, y1) = pts[i], pts[j]
                n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
                for s in range(1, n):
                    tt = s / n
                    xx, yy = int(round(x0 + (x1 - x0) * tt)), int(round(y0 + (y1 - y0) * tt))
                    ceu[yy, xx] = ceu[yy, xx] * (1 - a) + hexa(cor) * a
        ligar(ESTRELAS_FEMUR, LIGACOES_FEMUR, "#6a86d8", 0.42)
        ligar(CRUZEIRO, [(0, 1), (2, 3)], "#6a86d8", 0.38)
        for (x, y) in ESTRELAS_FEMUR + CRUZEIRO[:4]:
            ceu[y, x] = hexa("#ffffff") * 1.4
            for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ceu[y + dy, x + dx] = ceu[y + dy, x + dx] * 0.4 + hexa("#c8d8ff") * 0.6
        x, y = CRUZEIRO[4]
        ceu[y, x] = hexa("#dce6ff")
        # a lua crescente, para onde a luneta aponta
        lx, ly = 250.0, 10.0
        for yy in range(int(ly) - 6, int(ly) + 7):
            for xx in range(int(lx) - 6, int(lx) + 7):
                d1 = math.hypot(xx - lx, yy - ly)
                d2 = math.hypot(xx - lx - 2.6, yy - ly + 1.4)
                if 0 <= yy < H and d1 < 5.2 and d2 > 4.4:
                    ceu[yy, xx] = hexa("#f6f2dc") if d1 < 4.4 else hexa("#d8d4c0")
        ceu += (np.exp(-np.hypot(_XS - lx, _YS - ly) / 14) * 0.3)[:, :, None] * hexa("#9ab0f0")
    # Montanhas ao longe e a vila lá embaixo, no pé da fenda.
    m1, m2 = hexa(per["montanha"][0]), hexa(per["montanha"][1])
    for x in range(W):
        y_long = 50 + 4 * math.sin(x / 13.0) + 2.5 * math.sin(x / 5.3 + 1) + 1.5 * hash01(x // 3, 2)
        y_perto = 56 + 2.5 * math.sin(x / 9.0 + 2) + 1.2 * math.sin(x / 3.1)
        for y in range(int(y_long), 62):
            ceu[y, x] = m2 * 0.9 + ceu[y, x] * 0.1 if y < y_perto else m1
        if int(y_long) < 62:
            ceu[int(y_long), x] = ceu[int(y_long), x] * 0.6 + m2 * 0.4 + 0.06
    if nome == "noite":
        for (x, y) in ((258, 59), (262, 60), (269, 59), (281, 60), (296, 60), (301, 59), (315, 60), (322, 59)):
            ceu[y, x] = hexa("#ffcf70") * 1.3
    elif nome == "tarde":
        for (x, y) in ((262, 60), (281, 60), (301, 59), (315, 60)):
            ceu[y, x] = hexa("#ffcf70") * 0.9
    return ceu


# ─────────────────────────────── A cúpula ───────────────────────────────
def cupula() -> tuple[Camada, np.ndarray]:
    """Madeira em gomos com nervuras e rebites, a moldura da fenda, a porta de correr e o trilho dentado.
    Devolve também a máscara do céu visível (fenda)."""
    c = Camada()
    v, xb, cv = coord_cupula(_XS + 0.5, _YS + 0.5)
    rel = xb - AX
    phi = np.degrees(np.arcsin(np.clip(rel / RAIO, -1, 1)))
    dentro = _YS < BASE - 2
    fenda = (np.abs(rel) < FENDA) & dentro
    moldura = (np.abs(rel) >= FENDA) & (np.abs(rel) < FENDA + 5) & dentro
    porta = (rel >= FENDA + 5) & (rel < FENDA + 62) & dentro
    px_por_grau = RAIO * np.cos(np.radians(phi)) * cv * math.pi / 180
    # Gomos entre nervuras (a cada 10 graus; as de ±10 emolduram a fenda), cada gomo em tábuas compridas na latitude,
    # com uma junta por fiada, e dois anéis de travamento (vigas curvas) na altura.
    ALT_F = 0.042
    fiada = np.floor(v / ALT_F).astype(int)
    gomo = np.floor((phi + 5) / 10).astype(int)
    dentro_gomo = ((phi + 5) % 10) / 10            # 0..1 de uma nervura à outra
    nerv_d = np.minimum(dentro_gomo, 1 - dentro_gomo) * 10 * px_por_grau
    veio = ruido(51, 11, 1) * 0.6 + ruido(52, 3, 1) * 0.4
    alb = np.zeros((H, W, 3), dtype=np.float32)
    for y in range(int(BASE)):
        for x in range(W):
            if not dentro[y, x] or fenda[y, x]:
                continue
            fi, gm = int(fiada[y, x]), int(gomo[y, x])
            u = dentro_gomo[y, x]
            bf = (v[y, x] / ALT_F) % 1
            junta = 0.15 + 0.7 * hash01(fi, gm, 4)
            k = hash01(fi, gm, 3) if u < junta else hash01(fi, gm, 13)
            base = 0.5 + (k - 0.5) * 0.24 + (veio[y, x] - 0.5) * 0.3
            base += 0.10 * math.sin(u * math.pi) - 0.08  # gomo côncavo: o meio pega mais luz
            if bf > 0.8:
                base += 0.16   # aresta de baixo da tábua, que vê a luz da sala
            if bf < 0.16 or abs(u - junta) * 10 * px_por_grau[y, x] < 0.6:
                base = 0.06
            cor = hexa(tons_idx(MADEIRA, base))
            # anéis de travamento (vigas) em duas alturas
            for vv in (0.17, 0.42):
                dv = (v[y, x] - vv) * 132
                if -1.6 < dv < 1.6:
                    cor = hexa(MADEIRA[4] if dv > 0.6 else MADEIRA[2] if dv > -0.6 else MADEIRA[0])
            nd = nerv_d[y, x]
            if nd < 2.2:
                lado = dentro_gomo[y, x] < 0.5  # lado direito da nervura (u pequeno) pega a luz
                cor = hexa("#120804") if nd > 1.6 else hexa(MADEIRA[5] if lado and nd > 0.7 else MADEIRA[3] if nd > 0.7 else MADEIRA[4])
                if fi % 2 == 0 and 0.35 < bf < 0.62 and nd < 1.2:
                    cor = hexa(LATAO[5])  # rebite
                elif fi % 2 == 0 and 0.62 <= bf < 0.85 and nd < 1.2:
                    cor = hexa(LATAO[2])
            # escurece em direção ao zênite (a luz da sala não chega lá)
            cor = cor * (1 - 0.35 * np.clip(v[y, x] - 0.2, 0, 1))
            alb[y, x] = cor
    m = (dentro & ~fenda).astype(np.float32)
    c.mascara(m, alb)
    # Moldura da fenda em latão escurecido e a porta de correr (chapa pintada, rebitada) à direita.
    for y in range(int(BASE) - 2):
        for x in range(W):
            if moldura[y, x]:
                d = abs(rel[y, x]) - FENDA
                cor = LATAO[4] if d < 1.0 else LATAO[2] if d < 2.4 else LATAO_ESC[1] if d < 4 else "#120a04"
                c.p(x, y, cor)
            elif porta[y, x]:
                r = rel[y, x] - FENDA - 5
                base = 0.5 + (hash01(int(r // 9), fiada[y, x] // 4, 8) - 0.5) * 0.12
                if r > 58:
                    base = 0.05
                elif r < 2:
                    base = 0.8
                cor = mistura("#1a2a2a", "#4a6662", base)
                if int(r) % 9 == 0 and r > 3:
                    cor = mistura("#0e1818", "#2a3a3a", 0.5)
                if int(r) % 9 == 2 and (fiada[y, x] % 2 == 0) and (v[y, x] / 0.036) % 1 < 0.3:
                    cor = hexa("#a8b8a8")
                c.p(x, y, cor)
    # Sombra que a porta joga na madeira (à direita dela).
    sombra = ((rel >= FENDA + 62) & (rel < FENDA + 70) & dentro).astype(np.float32)
    c.c[:, :, :3] *= (1 - sombra * 0.45 * (1 - (rel - FENDA - 62) / 8).clip(0, 1))[:, :, None]
    # O trilho dentado em que a cúpula gira, com rodízios de ferro.
    for x in range(W):
        c.p(x, BASE - 2, "#3a2414")
        c.p(x, BASE - 1, "#6a4a2a")
        c.p(x, BASE, "#a87a48")
        c.p(x, BASE + 1, "#5a3c22")
        c.p(x, BASE + 2, FERRO[3] if x % 3 else FERRO[1])
        c.p(x, BASE + 3, FERRO[2] if x % 3 != 1 else FERRO[4])
        c.p(x, BASE + 4, FERRO[1])
        c.p(x, BASE + 5, "#2a1a10")
        c.p(x, BASE + 6, "#4a3220")
    for rx in range(14, W, 42):
        for (dx, dy, cor) in ((0, 0, FERRO[5]), (1, 0, FERRO[4]), (-1, 0, FERRO[3]), (0, 1, FERRO[2]), (0, -1, FERRO[5]),
                              (1, 1, FERRO[1]), (-1, -1, FERRO[4]), (1, -1, FERRO[3]), (-1, 1, FERRO[1])):
            c.p(rx + dx, BASE + 3 + dy, cor)
    return c, fenda.astype(np.float32)


# ─────────────────────────────── Parede e chão ───────────────────────────────
def parede() -> Camada:
    """Cantaria da torre: blocos de arenito de larguras variadas, cantos gastos, rejunte fundo, musgo no pé."""
    c = Camada()
    y0, y1 = int(BASE) + 7, PAREDE_CHAO
    n = ruido(61, 3)
    n2 = ruido(63, 9, 4)
    musgo = ruido(62, 6)
    tons = ["#2c2426", "#463a38", "#5e4e48", "#766254", "#8c7660", "#a48c70", "#bca486"]
    alts = [6, 5, 7, 5, 6, 6, 7, 5, 6, 6, 5]
    y = y0 + 2
    fi = 0
    while y < y1:
        alt = alts[fi % len(alts)]
        g = np.random.default_rng(600 + fi)
        x = -int(g.random() * 10)
        bloco = 0
        while x < W:
            larg = int(9 + g.random() * 10)
            k0 = 0.45 + (g.random() - 0.5) * 0.4
            for yy in range(y, min(y1, y + alt)):
                for xx in range(max(0, x), min(W, x + larg)):
                    ex, ey = xx - x, yy - y
                    if ex == larg - 1 or ey == alt - 1:
                        cor = "#2e2426"
                    else:
                        base = k0 + (n[yy, xx] - 0.5) * 0.3 + (n2[yy, xx] - 0.5) * 0.2
                        if ey == 0:
                            base += 0.2
                        elif ey == alt - 2:
                            base -= 0.16
                        if ex == 0:
                            base += 0.1
                        elif ex == larg - 2:
                            base -= 0.1
                        # cantos gastos
                        if (ex in (0, larg - 2)) and (ey in (0, alt - 2)):
                            base -= 0.25
                        if hash01(xx, yy, 66) < 0.05:
                            base -= 0.2  # poros e lascas
                        cor = tons_idx(tons, base)
                        if musgo[yy, xx] > 0.7 and yy > y1 - 16:
                            cor = mistura(cor, "#4a5e34", 0.4)
                    c.p(xx, yy, cor)
            x += larg
            bloco += 1
        y += alt
        fi += 1
    c.ret(0, y0, W, 2, "#1a1416")
    # Cornija de madeira embaixo do trilho e rodapé.
    for x in range(W):
        c.p(x, y0, "#2a1a10")
        c.p(x, y0 + 1, "#1a1008")
        c.p(x, y1 - 2, "#4a2e1a")
        c.p(x, y1 - 1, "#2a1a10")
    # Lambri de madeira na metade de baixo da parede: almofadas com moldura e friso.
    ly0 = 106
    for y in range(ly0, y1 - 2):
        for x in range(W):
            pnl = (x + 4) // 22
            ex = (x + 4) % 22
            ey = y - ly0
            k = 0.5 + (hash01(pnl, 77) - 0.5) * 0.15 + (hash01(x, y // 3, 78) - 0.5) * 0.08
            if ey < 2:
                k = 0.85 if ey == 0 else 0.3
            elif ex in (0, 1):
                k = 0.35 if ex == 0 else 0.62
            elif ex == 21:
                k = 0.2
            elif 4 <= ex <= 18 and 5 <= ey <= 14:
                # almofada rebaixada: borda de cima/esquerda escura, de baixo/direita clara
                if ex == 4 or ey == 5:
                    k = 0.25
                elif ex == 18 or ey == 14:
                    k = 0.72
                else:
                    k += 0.06
            c.p(x, y, tons_idx(MADEIRA, k))
    # Esteios de madeira que sobem até o trilho, com mísulas de pedra no topo.
    for px_ in (66, 156, 246, 388):
        for y in range(y0, y1 - 1):
            for dx in range(-2, 3):
                k = (0.72, 0.6, 0.48, 0.36, 0.16)[dx + 2]
                k += (hash01(px_, y // 2, 81) - 0.5) * 0.1
                c.p(px_ + dx, y, tons_idx(MADEIRA, k))
        for y in (y0 + 10, y1 - 22):
            c.ret(px_ - 2, y, 5, 1, FERRO[1])
            c.p(px_, y, LATAO[4])
        for j in range(5):
            w = 5 - j
            c.ret(px_ - w, y0 + 2 + j, w * 2 + 1, 1, PEDRA[1] if j < 2 else PEDRA[2])
            c.p(px_ - w, y0 + 2 + j, PEDRA[0])
            c.p(px_ + w, y0 + 2 + j, PEDRA[3])
    # A torre é redonda: a parede escurece nas pontas.
    curva_ = 1 - 0.38 * ((_XS - 300) / 300) ** 2
    c.c[:, :, :3] *= curva_[:, :, None]
    return c


def chao() -> Camada:
    """Assoalho em tábuas que fogem para o centro, com a rosa dos ventos de latão embutida em volta do pilar."""
    c = Camada()
    vpx, vpy = 296.0, 30.0
    veio = ruido(71, 9, 1)
    for y in range(PAREDE_CHAO, H):
        prof = (y - vpy) / (H - vpy)
        fiada = int((y - PAREDE_CHAO) ** 1.15 / 4.2)
        for x in range(W):
            u = (x - vpx) / prof  # posição "real" ao longo da largura
            tb = math.floor(u / 15)
            fr = (u / 15) % 1
            k = hash01(tb, fiada, 9)
            base = 0.5 + (k - 0.5) * 0.3 + (veio[y, x] - 0.5) * 0.3
            if fr < 0.06 * (1 + prof):
                base = 0.08
            elif fr < 0.16:
                base += 0.12
            # emenda das tábuas, desencontrada
            if (y - PAREDE_CHAO) > 0 and int((y - PAREDE_CHAO - 1) ** 1.15 / 4.2) != fiada and (tb + fiada) % 3 == 0:
                base = 0.1
            base -= (1 - prof) * 0.12
            c.p(x, y, tons_idx(MADEIRA[1:], base))
    # Rosa dos ventos de latão no chão (elipse achatada), em volta do pé da luneta.
    cx, cy, rx, ry = 300.0, 146.0, 50.0, 9.0
    for y in range(int(cy - ry) - 1, H):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = math.hypot(dx, dy)
            ang = math.atan2(dy, dx)
            if 0.9 < d < 1.0:
                c.p(x, y, LATAO[3] if dy < 0 else LATAO[2])
            elif 0.82 < d < 0.86:
                c.p(x, y, LATAO[2], 0.8)
            elif d < 0.82:
                # pontas da rosa: 8 raios
                for kk in range(8):
                    a0 = kk * math.pi / 4
                    da = abs((ang - a0 + math.pi) % (2 * math.pi) - math.pi)
                    larg_p = (0.24 if kk % 2 == 0 else 0.16) * (1 - d / 0.82)
                    if da < larg_p:
                        cor = LATAO[4] if (ang - a0) % (2 * math.pi) < math.pi else LATAO[2]
                        c.p(x, y, cor, 0.9 if kk % 2 == 0 else 0.7)
                        break
    return c


# ─────────────────────────────── Esquerda (calma) ───────────────────────────────
def lado_esquerdo() -> tuple[Camada, Camada]:
    """Estante com livros e rolos, o grande mapa celeste, as fases da lua, a seteira e um baú. Devolve (objetos, vela)."""
    c = Camada()
    e = Camada()
    # Estante.
    x0, x1, yt, yb = 6, 58, 70, 124
    c.ret(x0, yt, x1 - x0, yb - yt, "#24160c")
    c.ret(x0, yt, 2, yb - yt, "#4a2e18")
    c.ret(x1 - 2, yt, 2, yb - yt, "#3a2412")
    c.ret(x0 - 1, yt - 2, x1 - x0 + 2, 2, "#5a3a20")
    g = np.random.default_rng(81)
    lombadas = ["#6a2a26", "#2e4a5e", "#5a5a2a", "#4a2e4e", "#7a5a2a", "#2e5a46", "#8a7a5a", "#3a3a5a"]
    for (ys, ye) in ((72, 87), (89, 104), (106, 121)):
        c.ret(x0 + 2, ye, x1 - x0 - 4, 2, "#5a3a20")
        x = x0 + 3
        while x < x1 - 4:
            r = g.random()
            if r < 0.14 and ys == 89:
                # rolos de mapas deitados
                for k in range(3):
                    c.ret(x, ye - 3 - k * 3, 11, 3, PERGAMINHO[2 + k % 2])
                    c.p(x, ye - 2 - k * 3, PERGAMINHO[0])
                    c.p(x + 10, ye - 2 - k * 3, PERGAMINHO[5])
                x += 13
                continue
            if r < 0.22 and ys == 72 and not e.c[:, :, 3].any():
                # vela na estante (acesa à noite)
                c.ret(x + 1, ye - 6, 3, 6, "#e8dcc0")
                c.ret(x, ye - 1, 5, 1, LATAO[2])
                e.p(x + 2, ye - 8, "#fff2b0")
                e.p(x + 2, ye - 7, "#ffb850")
                x += 7
                continue
            w = 2 + int(g.random() * 3)
            h = 9 + int(g.random() * 6)
            cor = lombadas[int(g.random() * len(lombadas))]
            inc = g.random() < 0.08
            for j in range(h):
                xx = x + (j // 4 if inc else 0)
                c.ret(xx, ye - 1 - j, w, 1, cor)
                c.p(xx, ye - 1 - j, mistura(cor, "#ffffff", 0.2))
            c.ret(x, ye - h + 2, w, 1, LATAO[3], 0.6)
            x += w + (2 if inc else 0)
    # O grande mapa celeste (planisfério) preso à parede com tachas.
    mx0, my0, mw, mh = 74, 72, 52, 42
    papel(c, mx0, my0, mw, mh, 711)
    ccx, ccy, rr = mx0 + mw / 2, my0 + mh / 2 + 1, 17
    for k in range(120):
        a = k / 120 * math.tau
        c.p(ccx + math.cos(a) * rr, ccy + math.sin(a) * rr, TINTA)
        c.p(ccx + math.cos(a) * (rr - 3), ccy + math.sin(a) * (rr - 3), TINTA, 0.5)
    for k in range(12):
        a = k / 12 * math.tau
        c.linha(ccx + math.cos(a) * (rr - 3), ccy + math.sin(a) * (rr - 3), ccx + math.cos(a) * rr, ccy + math.sin(a) * rr, TINTA, 0.7)
    gm = np.random.default_rng(712)
    pts = [(ccx + (gm.random() - 0.5) * 26, ccy + (gm.random() - 0.5) * 26) for _ in range(18)]
    pts = [p for p in pts if math.hypot(p[0] - ccx, p[1] - ccy) < rr - 4]
    for i in range(len(pts) - 1):
        if i % 3 != 2:
            c.linha(*pts[i], *pts[i + 1], "#6a5a7a", 0.55)
    for p_ in pts:
        c.p(*p_, "#2a2a6a")
    c.elipse(ccx + 9, ccy - 9, 2, 2, "#c89a3a")  # o sol pintado em ouro
    # Fases da lua num pergaminho menor.
    papel(c, 132, 78, 30, 14, 713)
    for k in range(5):
        cx_ = 136 + k * 6
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                if dx * dx + dy * dy <= 5:
                    cheio = (dx + 2) / 4 <= (k / 4)
                    c.p(cx_ + dx, 85 + dy, TINTA if not cheio else "#e8d8a8")
    # Seteira (janela estreita) com o céu.
    c.ret(170, 76, 9, 30, PEDRA[1])
    c.ret(171, 77, 7, 28, PEDRA[3])
    # Baú de carvalho com ferragens.
    bx, by = 122, 147
    c.ret(bx, by - 15, 36, 15, MADEIRA[4])
    c.ret(bx, by - 18, 36, 4, MADEIRA[5])
    c.ret(bx, by - 18, 36, 1, MADEIRA[6])
    for k in (bx + 3, bx + 32):
        c.ret(k, by - 18, 2, 18, FERRO[2])
        c.p(k, by - 18, FERRO[4])
    c.ret(bx + 16, by - 13, 4, 4, LATAO[3])
    c.p(bx + 17, by - 11, LATAO[0])
    c.ret(bx, by - 1, 36, 1, MADEIRA[1])
    for j in range(5):
        c.ret(bx + 4, by - 10 + j * 2, 27, 1, MADEIRA[3], 0.5)
    # Barril com mapas enrolados.
    bx2, by2 = 70, 147
    for y in range(by2 - 18, by2):
        t = (y - by2 + 18) / 18
        meia = 8 + 1.6 * math.sin(t * math.pi)
        for x in range(int(bx2 - meia), int(bx2 + meia) + 1):
            u = (x - bx2) / meia
            cor = tons_idx(MADEIRA[2:], 0.75 - abs(u + 0.3) * 0.7)
            if int(t * 18) in (3, 14):
                cor = FERRO[3] if u < 0.3 else FERRO[1]
            c.p(x, y, cor)
    for k, (dx, h, cor) in enumerate(((-5, 14, PERGAMINHO[3]), (-1, 18, PERGAMINHO[4]), (3, 12, PERGAMINHO[2]), (6, 16, PERGAMINHO[3]))):
        c.ret(bx2 + dx, by2 - 18 - h + 6, 3, h, cor)
        c.p(bx2 + dx + 2, by2 - 18 - h + 6, PERGAMINHO[0])
        c.ret(bx2 + dx, by2 - 18 - h + 6, 3, 1, PERGAMINHO[5])
    # Pilha de livros no chão.
    for k, (w, cor) in enumerate(((20, "#4a2e4e"), (18, "#2e4a5e"), (21, "#6a2a26"), (16, "#5a5a2a"))):
        c.ret(164 + (k % 2) * 2, 146 - (k + 1) * 4, w, 4, cor)
        c.ret(164 + (k % 2) * 2, 146 - (k + 1) * 4, w, 1, mistura(cor, "#ffffff", 0.25))
        c.ret(164 + (k % 2) * 2 + w - 1, 146 - (k + 1) * 4 + 1, 1, 3, PERGAMINHO[3])
    return c, e


def papel(c: Camada, x0: int, y0: int, w: int, h: int, seed: int, tachas: bool = True) -> None:
    """Pergaminho preso à parede: bordas onduladas e queimadas, manchas, tachas de latão."""
    n = ruido(seed, 4)
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            bx = min(x - x0, x0 + w - 1 - x)
            by = min(y - y0, y0 + h - 1 - y)
            if (bx == 0 and hash01(x, y, seed) < 0.35) or (by == 0 and hash01(y, x, seed) < 0.35):
                continue
            k = 0.62 + (n[y, x] - 0.5) * 0.5 - (0.25 if min(bx, by) < 1 else 0.1 if min(bx, by) < 2 else 0)
            c.p(x, y, tons_idx(PERGAMINHO, k))
    # rolinho em baixo
    c.ret(x0 + 1, y0 + h - 1, w - 2, 1, PERGAMINHO[1])
    c.ret(x0 + 1, y0 + h, w - 2, 1, PERGAMINHO[0], 0.6)
    if tachas:
        for (tx, ty) in ((x0 + 2, y0 + 1), (x0 + w - 3, y0 + 1)):
            c.p(tx, ty, LATAO[5])
            c.p(tx + 1, ty + 1, LATAO[1])


# ─────────────────────────────── Esfera armilar ───────────────────────────────
def armilar(cx: float, cy: float, r: float, base: int) -> tuple[Camada, Camada]:
    """Astrolábio esférico de latão num pé torneado de madeira. Devolve (atrás + pé, frente)."""
    tras, frente = Camada(), Camada()
    # Pé torneado.
    for y in range(int(cy + r * 0.6), base):
        t = (y - cy - r * 0.6) / (base - cy - r * 0.6)
        larg = 2 + (1.5 if 0.3 < t < 0.4 or 0.62 < t < 0.7 else 0) + (6 * (t - 0.85) / 0.15 if t > 0.85 else 0)
        for x in range(int(cx - larg), int(cx + larg) + 1):
            u = (x - cx) / max(larg, 1)
            tras.p(x, y, tons_idx(MADEIRA[2:], 0.75 - (u + 0.35) * 0.5))
    tras.ret(cx - 9, base - 1, 19, 1, MADEIRA[1])
    # Garfo de latão que segura a esfera (o meridiano fixo).
    inc = math.radians(23.4)

    def anel(normal, raio, tons, grossura=1, marcas=0, larga=False):
        nx, ny, nz = normal
        nn = math.sqrt(nx * nx + ny * ny + nz * nz)
        nx, ny, nz = nx / nn, ny / nn, nz / nn
        # base ortonormal do plano do anel
        ax_ = (1, 0, 0) if abs(nx) < 0.9 else (0, 1, 0)
        ux, uy, uz = ny * ax_[2] - nz * ax_[1], nz * ax_[0] - nx * ax_[2], nx * ax_[1] - ny * ax_[0]
        un = math.sqrt(ux * ux + uy * uy + uz * uz)
        ux, uy, uz = ux / un, uy / un, uz / un
        vx, vy, vz = ny * uz - nz * uy, nz * ux - nx * uz, nx * uy - ny * ux
        passos = int(raio * 14)
        for k in range(passos):
            a = k / passos * math.tau
            X = raio * (math.cos(a) * ux + math.sin(a) * vx)
            Y = raio * (math.cos(a) * uy + math.sin(a) * vy)
            Z = raio * (math.cos(a) * uz + math.sin(a) * vz)
            sx, sy = cx + X, cy - Y
            luz = (-X * 0.6 + Y * 0.7) / raio
            cam = frente if Z >= 0 else tras
            if Z >= 0:
                cor = tons[3] if luz > 0.35 else tons[2] if luz > -0.3 else tons[1]
            else:
                cor = tons[1] if luz > 0 else tons[0]
            cam.p(sx, sy, cor)
            if larga:
                cam.p(sx, sy + 1, tons[max(0, (tons.index(cor) if cor in tons else 1) - 1)])
            if marcas and k % (passos // marcas) == 0 and Z >= 0:
                cam.p(sx, sy, "#fff6c8")

    lt = [LATAO[1], LATAO[2], LATAO[4], LATAO[5]]
    lt_esc = [LATAO[0], LATAO[1], LATAO[3], LATAO[4]]
    anel((1, 0, 0.12), r + 1.5, lt_esc, larga=True)                       # meridiano fixo (de frente, inclinado)
    anel((0, 1, 0), r + 1.5, lt, marcas=12)                                # horizonte
    eixo = (math.sin(0.5), math.cos(0.5), 0.25)
    anel(eixo, r, lt, marcas=8)                                            # equador
    anel((math.sin(0.5 + inc), math.cos(0.5 + inc), -0.4), r, [LATAO[2], LATAO[3], LATAO[5], LATAO[6]], larga=True, marcas=12)  # eclíptica
    anel((0.95, -0.2, 0.25), r, lt)                                        # coluro
    anel(eixo, r * 0.42, lt)                                               # círculo polar (pequeno)
    # A Terra no meio e o eixo polar.
    ex, ey = math.sin(0.5), math.cos(0.5)
    frente.linha(cx - ex * (r + 4), cy + ey * (r + 4), cx + ex * (r + 4), cy - ey * (r + 4), LATAO[3])
    frente.p(cx + ex * (r + 4), cy - ey * (r + 4), LATAO[6])
    for y in range(int(cy - 3), int(cy + 4)):
        for x in range(int(cx - 3), int(cx + 4)):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d < 3.2:
                agua = hash01(x, y, 21) < 0.55
                k = (-(x - cx) * 0.6 - (y - cy) * 0.7) / 3
                cor = ("#5aa0d8" if k > 0.3 else "#2e6aa8" if k > -0.4 else "#1a3a6a") if agua else ("#8ac06a" if k > 0 else "#4a7a3a")
                frente.p(x, y, cor)
    # Ponteiro do sol na eclíptica.
    frente.p(cx + r * 0.7, cy - r * 0.45, "#fff0a0")
    frente.p(cx + r * 0.7 + 1, cy - r * 0.45, "#ffc850")
    return tras, frente


# ─────────────────────────────── A luneta ───────────────────────────────
def luneta() -> tuple[Camada, Camada]:
    """O pilar de ferro, a montagem equatorial com a roda dentada e o contrapeso, e o tubo de latão. (atrás, frente)"""
    tras, c = Camada(), Camada()
    base_y = 147
    # Pilar de ferro fundido com caneluras e pé largo, em cima da rosa dos ventos.
    for y in range(80, base_y):
        t = (y - 80) / (base_y - 80)
        larg = 4.5 + 1.5 * t ** 3 + (5 if t > 0.9 else 0) + (2.5 if 0.86 < t <= 0.9 else 0)
        for x in range(int(PILAR_X - larg), int(PILAR_X + larg) + 1):
            u = (x + 0.5 - PILAR_X) / max(larg, 1)
            k = 0.85 - abs(u + 0.35) * 0.75
            if t < 0.86 and int((u + 1) * 3) % 2 == 1:
                k -= 0.12
            c.p(x, y, tons_idx(FERRO, k))
    for y in (96, 120, 133):
        c.ret(PILAR_X - 6, y, 13, 1, FERRO[4])
        c.ret(PILAR_X - 6, y + 1, 13, 1, FERRO[1])
    for (rx, ry) in ((PILAR_X - 8, base_y - 2), (PILAR_X + 8, base_y - 2)):
        c.p(rx, ry, LATAO[4])
    # Contrapeso (atrás do tubo): haste para baixo e para a esquerda, peso de ferro.
    mx, my = 301.0, 72.0
    tras.cilindro(mx, my, 282, 90, 1.2, 1.2, FERRO[1:])
    tras.cilindro(277, 85, 287, 95, 4.4, 4.4, FERRO)
    tras.p(282, 90, FERRO[5])
    # Cabeça da montagem: a caixa do eixo polar e a roda dentada.
    tras.cilindro(PILAR_X, 82, mx, my, 4, 4, FERRO)
    for y in range(int(my) - 9, int(my) + 10):
        for x in range(int(mx) + 1, int(mx) + 21):
            d = math.hypot(x + 0.5 - mx - 9, (y + 0.5 - my - 4) * 1.15)
            if d < 8.5:
                ang = math.atan2(y - my - 4, x - mx - 9)
                dente = d > 7.3 and int(ang / math.tau * 40) % 2 == 0
                if d > 7.3 and not dente:
                    continue
                k = 0.7 - ((x - mx - 9) * 0.5 + (y - my - 4) * 0.6) / 10
                cor = tons_idx(LATAO[1:6], k)
                if 2.2 < d < 3:
                    cor = LATAO[1]
                if d < 1.5:
                    cor = FERRO[4]
                if int(ang / math.tau * 6 + 0.5) % 1 == 0 and 3 < d < 7 and abs(math.sin(ang * 3)) < 0.18:
                    cor = LATAO[1]
                tras.p(x, y, cor)
    # O tubo de latão: mais largo na objetiva, com o para-orvalho e anéis.
    ex, ey = OCULAR
    ox, oy = OBJETIVA
    faixas = [(0.02, 0.06, LATAO_ESC), (0.30, 0.335, LATAO_ESC), (0.55, 0.585, LATAO_ESC), (0.80, 0.835, LATAO_ESC)]
    c.cilindro(ex, ey, ox, oy, 5.0, 6.2, LATAO, luz=-0.35, faixas=faixas)
    vx, vy = ox - ex, oy - ey
    comp = math.hypot(vx, vy)
    ux, uy = vx / comp, vy / comp
    nx, ny = -uy, ux
    # Para-orvalho (mais escuro, fosco) e o aro da objetiva com o vidro.
    sx0, sy0 = ex + vx * 0.86, ey + vy * 0.86
    c.cilindro(sx0, sy0, ox + ux * 1.5, oy + uy * 1.5, 7.2, 7.4, ["#4a2e12", "#6a461e", "#8a602c", "#a87a3c", "#c8964e", "#e0b468"], luz=-0.3,
               faixas=[(0.0, 0.1, LATAO_ESC), (0.88, 1.0, LATAO[2:6])])
    for k in range(-7, 8):
        c.p(ox + ux * 1.5 + nx * k, oy + uy * 1.5 + ny * k, "#2a3a5a" if abs(k) < 6 else LATAO[5])
    for k in (-3, -2):
        c.p(ox + ux * 1.5 + nx * k, oy + uy * 1.5 + ny * k, "#a8c8ff")
    # Berços que prendem o tubo à montagem.
    for t in (0.40, 0.52):
        bx_, by_ = ex + vx * t, ey + vy * t
        for k in range(-6, 7):
            c.p(bx_ + nx * k, by_ + ny * k, FERRO[3] if k < 3 else FERRO[1])
            c.p(bx_ + nx * k + ux, by_ + ny * k + uy, FERRO[2])
        c.p(bx_ + nx * 7, by_ + ny * 7, LATAO[5])
    # Buscadora: tubinho paralelo por cima, com dois suportes.
    off = -9.5
    f0 = (ex + vx * 0.48 + nx * off, ey + vy * 0.48 + ny * off)
    f1 = (ex + vx * 0.70 + nx * off, ey + vy * 0.70 + ny * off)
    c.cilindro(*f0, *f1, 1.6, 1.9, LATAO[1:], luz=-0.4)
    for t in (0.53, 0.65):
        a_ = (ex + vx * t + nx * -5.4, ey + vy * t + ny * -5.4)
        b_ = (ex + vx * t + nx * -7, ey + vy * t + ny * -7)
        c.linha(*a_, *b_, FERRO[2])
    # Ocular e focalizador na ponta de baixo, com o botão serrilhado.
    o0 = (ex - ux * 0.5, ey - uy * 0.5)
    o1 = (ex - ux * 7.5, ey - uy * 7.5)
    c.cilindro(*o0, *o1, 2.6, 2.6, LATAO[1:6], luz=-0.4)
    c.cilindro(*o1, o1[0] - ux * 3, o1[1] - uy * 3, 1.8, 1.8, FERRO[1:], luz=-0.4)
    kx, ky = ex - ux * 3 + nx * 4, ey - uy * 3 + ny * 4
    for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1)):
        c.p(kx + dx, ky + dy, LATAO[5] if (dx + dy) % 2 == 0 else LATAO[2])
    # Plaquinha gravada no tubo.
    pt = (ex + vx * 0.66, ey + vy * 0.66)
    c.p(pt[0], pt[1], LATAO[6])
    c.p(pt[0] + ux, pt[1] + uy, LATAO[6])
    return tras, c


# ─────────────────────────────── Direita: gráficos, astrolábio e a mesa ───────────────────────────────
def graficos_parede() -> Camada:
    c = Camada()
    # Gráfico de barras (acerto por área): eixos, barras hachuradas, aguadas de cor.
    x0, y0, w, h = 390, 72, 40, 30
    papel(c, x0, y0, w, h, 811)
    c.linha(x0 + 5, y0 + 4, x0 + 5, y0 + h - 5, TINTA)
    c.linha(x0 + 5, y0 + h - 5, x0 + w - 3, y0 + h - 5, TINTA)
    for k in range(4):
        c.p(x0 + 4, y0 + 6 + k * 5, TINTA)
    alturas = [12, 17, 9, 20, 14, 18]
    aguadas = ["#b04a3a", "#3a6aa0", "#b08a2a", "#3a8a5a", "#8a4a8a", "#3a6aa0"]
    for k, hh in enumerate(alturas):
        bx = x0 + 8 + k * 5
        for yy in range(y0 + h - 5 - hh, y0 + h - 5):
            for xx in (bx, bx + 1, bx + 2):
                if xx == bx or yy == y0 + h - 5 - hh or xx == bx + 2:
                    c.p(xx, yy, TINTA)
                else:
                    c.p(xx, yy, aguadas[k], 0.75)
    c.ret(x0 + 7, y0 + 3, 12, 1, TINTA, 0.5)  # título rabiscado
    c.ret(x0 + 21, y0 + 3, 7, 1, TINTA, 0.35)
    # Curva de evolução (linha subindo com pontos), num papel menor.
    x0, y0, w, h = 436, 70, 36, 25
    papel(c, x0, y0, w, h, 812)
    c.linha(x0 + 4, y0 + 3, x0 + 4, y0 + h - 4, TINTA)
    c.linha(x0 + 4, y0 + h - 4, x0 + w - 3, y0 + h - 4, TINTA)
    pts = [(x0 + 6, y0 + 17), (x0 + 11, y0 + 15), (x0 + 15, y0 + 16), (x0 + 20, y0 + 11), (x0 + 25, y0 + 9), (x0 + 30, y0 + 5)]
    for i in range(len(pts) - 1):
        c.linha(*pts[i], *pts[i + 1], "#9a2a22")
    for p_ in pts:
        c.p(*p_, TINTA)
        c.p(p_[0], p_[1] - 1, TINTA, 0.6)
    for k in range(5):  # grade pontilhada
        for xx in range(x0 + 6, x0 + w - 3, 2):
            c.p(xx, y0 + 5 + k * 3, TINTA, 0.18)
    # Astrolábio plano pendurado num prego (entre o gráfico e a luneta, acima do mascote).
    ax_, ay_ = 362, 80
    c.linha(ax_, ay_ - 10, ax_, ay_ - 8, FERRO[3])
    c.p(ax_, ay_ - 11, FERRO[5])
    for y in range(ay_ - 9, ay_ + 10):
        for x in range(ax_ - 9, ax_ + 10):
            d = math.hypot(x + 0.5 - ax_ - 0.5, y + 0.5 - ay_ - 0.5)
            ang = math.atan2(y - ay_, x - ax_)
            k = 0.6 - ((x - ax_) * 0.55 + (y - ay_) * 0.65) / 12
            if d < 8.8:
                if d > 7.4:
                    cor = tons_idx(LATAO[1:6], k + 0.15)
                    if int(ang / math.tau * 48) % 4 == 0:
                        cor = LATAO[1]
                elif d > 6.6:
                    cor = LATAO_ESC[1]
                else:
                    cor = tons_idx(LATAO[0:5], k - 0.05)
                    # aranha (rete) vazada
                    if (abs(d - 4.2) < 0.55) or (abs(math.hypot(x - ax_ + 1.5, y - ay_ - 1) - 3) < 0.5) or d < 1.1:
                        cor = LATAO[5]
                    elif abs(math.sin(ang * 2)) < 0.12 and d > 1.5:
                        cor = LATAO[4]
                c.p(x, y, cor)
    # alidade (régua) atravessada
    c.linha(ax_ - 7, ay_ + 4, ax_ + 7, ay_ - 4, LATAO[6])
    c.p(ax_, ay_, LATAO[1])
    # Arandela com vela na parede, entre a esfera e o pilar.
    vx_, vy_ = int(VELA[0]), int(VELA[1])
    c.ret(vx_ - 3, vy_ + 9, 7, 1, LATAO[3])
    c.ret(vx_ - 2, vy_ + 10, 5, 1, LATAO[1])
    c.linha(vx_, vy_ + 11, vx_, vy_ + 15, LATAO[2])
    c.ret(vx_ - 1, vy_ + 15, 3, 2, FERRO[2])
    c.ret(vx_ - 1, vy_ + 2, 3, 7, "#efe4c8")
    c.ret(vx_ + 1, vy_ + 2, 1, 7, "#c8b896")
    c.p(vx_ - 1, vy_ + 3, "#fff8e8")
    c.p(vx_ + 1, vy_ + 5, "#efe4c8")  # pingo de cera
    c.p(vx_, vy_ + 1, "#2a1a10")      # pavio
    return c


def mesa() -> tuple[Camada, Camada, Camada, np.ndarray]:
    """A mesa de trabalho: papéis, caderno com gráfico, tinteiro e pena, o fêmur de peso de papel, livros e a lamparina.
    Devolve (mesa, objetos, vidro/chama emissivo, máscara de quem faz sombra na parede)."""
    c, o, e = Camada(), Camada(), Camada()
    x0, x1, yt = 390, 478, 112
    # Tampo e aventais.
    c.ret(x0, yt, x1 - x0, 3, MADEIRA[5])
    c.ret(x0, yt, x1 - x0, 1, MADEIRA[6])
    c.ret(x0, yt + 3, x1 - x0, 1, MADEIRA[2])
    c.ret(x0 + 2, yt + 4, x1 - x0 - 4, 6, MADEIRA[3])
    for gx in (x0 + 18, x0 + 52):
        c.ret(gx, yt + 6, 14, 3, MADEIRA[2])
        c.ret(gx + 6, yt + 7, 3, 1, LATAO[4])
    c.ret(x0 + 2, yt + 10, x1 - x0 - 4, 1, MADEIRA[1])
    for lx in (x0 + 3, x1 - 7):
        for y in range(yt + 10, 148):
            t = (y - yt - 10) / 38
            w = 4 if (0.15 < t < 0.22 or 0.7 < t < 0.78) else 3
            for x in range(lx, lx + w):
                c.p(x, y, MADEIRA[4] if x == lx else MADEIRA[2])
    c.ret(x0 + 6, 138, x1 - x0 - 12, 2, MADEIRA[2])
    # Cesto de rolos embaixo da mesa.
    for y in range(132, 147):
        for x in range(430, 448):
            k = 0.5 + 0.3 * ((x + y) % 3 == 0) - 0.2 * ((x - 430) / 18)
            o.p(x, y, tons_idx(["#3a2a14", "#5a4220", "#7a5c2e", "#98763c"], k))
    for k, dx in enumerate((432, 436, 440, 444)):
        o.ret(dx, 124 + k % 2 * 3, 3, 9, PERGAMINHO[2 + k % 2])
        o.ret(dx, 124 + k % 2 * 3, 3, 1, PERGAMINHO[5])
    # Papéis espalhados no tampo (em leve perspectiva), um caderno aberto com um gráfico.
    for (px_, py_, w, cor) in ((396, 109, 15, PERGAMINHO[4]), (409, 110, 13, PERGAMINHO[3]), (440, 110, 12, "#f6eedc")):
        o.ret(px_, py_, w, 3, cor)
        o.ret(px_, py_ + 2, w, 1, mistura(cor, "#000000", 0.18))
        for k in range(px_ + 2, px_ + w - 2, 3):
            o.p(k, py_ + 1, TINTA, 0.4)
    # caderno aberto
    o.ret(418, 107, 20, 5, "#f8f0dc")
    o.ret(427, 107, 1, 5, "#c8b898")
    o.ret(418, 111, 20, 1, "#5a2a1a")
    o.linha(420, 110, 425, 108, "#2a4a8a")
    for k in range(430, 437, 2):
        o.ret(k, 110 - (k - 430) // 2, 1, 1 + (k - 430) // 2, "#9a2a22")
    # Tinteiro e pena.
    o.ret(400, 105, 5, 4, "#1a1a2a")
    o.ret(400, 105, 5, 1, "#3a3a5a")
    o.p(401, 106, "#8a8ac8")
    o.ret(401, 104, 3, 1, LATAO[3])
    o.linha(402, 104, 407, 93, "#f2ece0")
    o.linha(403, 103, 408, 94, "#d8d0c4")
    o.linha(404, 101, 409, 96, "#c0b8ac", 0.8)
    # O fêmur de peso de papel, deitado em cima dos papéis.
    femur(o, 408, 109)
    # Pilha de livros e uma ampulheta no canto.
    for k, (w, cor) in enumerate(((14, "#2e4a5e"), (12, "#6a2a26"), (13, "#4a3a2a"))):
        o.ret(463 + k % 2, 111 - (k + 1) * 3, w, 3, cor)
        o.ret(463 + k % 2, 111 - (k + 1) * 3, w, 1, mistura(cor, "#ffffff", 0.25))
        o.p(463 + k % 2 + w - 1, 111 - (k + 1) * 3 + 1, PERGAMINHO[3])
    # Lamparina: base de latão, reservatório de vidro com óleo, chaminé de vidro e a chama.
    lx, ly = LAMPARINA
    lx = int(lx)
    o.ret(lx - 4, 110, 9, 2, LATAO[3])
    o.ret(lx - 4, 111, 9, 1, LATAO[1])
    o.ret(lx - 1, 107, 3, 3, LATAO[4])
    for y in range(102, 108):
        meia = 3 if 103 <= y <= 106 else 2
        for x in range(lx - meia, lx + meia + 1):
            o.p(x, y, "#c88a3a" if x > lx - meia else "#f0c070")
    o.ret(lx - 2, 101, 5, 1, LATAO[4])
    for y in range(91, 101):
        meia = 1 if y < 94 else 2
        for x in range(lx - meia, lx + meia + 1):
            o.p(x, y, "#c8d8e8", 0.38)
        o.p(lx - meia, y, "#ffffff", 0.55)
    o.ret(lx - 1, 90, 3, 1, LATAO[2])
    o.ret(lx + 4, 106, 2, 1, LATAO[2])  # asa
    # Chama (o emissivo).
    e.p(lx, ly, "#fff6d0")
    e.p(lx, ly - 1, "#ffe08a")
    e.p(lx, ly - 2, "#ffb04a", 0.9)
    e.p(lx, ly + 1, "#ffd070")
    e.p(lx - 1, ly, "#ff9a3a", 0.6)
    e.p(lx + 1, ly, "#ff9a3a", 0.6)
    sombra = o.c[:, :, 3] > 0.5
    return c, o, e, sombra


def femur(c: Camada, x: int, y: int) -> None:
    """Fêmur pequeno (16 px), cabeça à esquerda, côndilos à direita."""
    osso = ["#8a7a5a", "#c8b890", "#ece0c0", "#fff8e4"]
    for xx in range(x + 3, x + 14):
        c.p(xx, y, osso[2])
        c.p(xx, y + 1, osso[1])
    c.p(x + 6, y, osso[3])
    c.p(x + 9, y, osso[3])
    # cabeça e colo
    c.ret(x, y - 2, 3, 3, osso[2])
    c.p(x, y - 2, osso[3])
    c.p(x + 2, y, osso[1])
    c.p(x + 3, y - 1, osso[2])
    c.p(x + 4, y - 1, osso[2])  # trocânter
    c.p(x + 4, y + 2, osso[1])
    # côndilos
    c.ret(x + 14, y - 1, 2, 2, osso[2])
    c.ret(x + 14, y + 1, 2, 2, osso[1])
    c.p(x + 15, y - 1, osso[3])
    c.p(x + 16, y, osso[1])


def planetario() -> tuple[Camada, Camada]:
    """Planetário de latão pendurado na cúpula por uma corrente: o sol no meio e os planetas nos braços.
    Devolve (camada, emissivo do sol de vidro, aceso à noite)."""
    c, e = Camada(), Camada()
    cx, cy = 420.0, 33.0
    for y in range(0, int(cy) - 6):
        c.p(cx + (0 if y % 3 else 1) - 0.5, y, FERRO[3] if y % 3 else FERRO[5])
    c.linha(cx - 6, cy - 9, cx, cy - 6, FERRO[3])
    c.linha(cx + 6, cy - 9, cx, cy - 6, FERRO[3])
    # haste e pé
    c.ret(cx - 0.5, cy, 1, 12, LATAO[2])
    c.ret(cx - 3, cy + 12, 7, 2, LATAO[3])
    c.ret(cx - 3, cy + 13, 7, 1, LATAO[1])
    orbitas = [(7, 0.0, "#c86a3a", 1), (11, 1.9, "#4a8ad0", 1.5), (15, 4.2, "#c8a060", 1.2), (20, 2.7, "#e0c890", 2)]
    # metade de trás das órbitas
    for (r, _, _, _) in orbitas:
        for k in range(int(r * 10)):
            a = k / (r * 10) * math.tau
            if math.sin(a) < 0:
                c.p(cx + math.cos(a) * r, cy + 3 + math.sin(a) * r * 0.28, LATAO[1], 0.8)
    # o sol (vidro âmbar com aro)
    for y in range(int(cy) - 4, int(cy) + 5):
        for x in range(int(cx) - 4, int(cx) + 5):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d < 3.6:
                k = 0.6 - ((x - cx) * 0.5 + (y - cy) * 0.6) / 5
                c.p(x, y, tons_idx(["#7a3a10", "#c8701e", "#f0a838", "#ffd870"], k))
                e.p(x, y, tons_idx(["#c86a18", "#ffa030", "#ffd060", "#fff0b0"], k + 0.2))
    for (r, a, cor, rp) in orbitas:
        for k in range(int(r * 10)):
            aa = k / (r * 10) * math.tau
            if math.sin(aa) >= 0:
                c.p(cx + math.cos(aa) * r, cy + 3 + math.sin(aa) * r * 0.28, LATAO[3], 0.9)
        px_, py_ = cx + math.cos(a) * r, cy + 3 + math.sin(a) * r * 0.28
        c.linha(cx, cy + 3, px_, py_ - 2, LATAO[2])
        c.linha(px_, py_ - 2, px_, py_, LATAO[2])
        rr = rp + 0.6
        for y in range(int(py_ - rr - 2), int(py_ + rr + 1)):
            for x in range(int(px_ - rr - 1), int(px_ + rr + 2)):
                d = math.hypot(x + 0.5 - px_, y + 0.5 - (py_ - 1.5))
                if d < rr + 0.2:
                    k = 0.55 - ((x - px_) * 0.6 + (y - py_ + 1.5) * 0.6) / max(rr, 1)
                    c.p(x, y, mistura(cor, "#ffffff" if k > 0.8 else "#000000", 0.35 if k > 0.8 else max(0, 0.45 - k * 0.5)))
        if r == 20:  # o anel de saturno
            c.linha(px_ - 4, py_ - 1, px_ + 4, py_ - 2.5, "#f0dca8")
    return c, e


def primeiro_plano() -> Camada:
    """Balaústre da escada em caracol à esquerda e rolos de mapas à direita (desfocados na montagem)."""
    c = Camada()
    c.ret(0, 136, 110, 4, "#3a2414")
    c.ret(0, 135, 110, 1, "#6a4426")
    for x in range(6, 110, 12):
        for y in range(140, 160):
            larg = 2 + (1 if (y - 140) % 7 < 2 else 0)
            c.ret(x - larg // 2, y, larg + 1, 1, "#4a2e18")
            c.p(x - larg // 2, y, "#7a5030")
    for k in range(3):
        c.ret(456 + k * 7, 146 - k * 4, 5, 20, PERGAMINHO[2 + k % 2])
        c.ret(456 + k * 7, 146 - k * 4, 5, 2, PERGAMINHO[5])
    return c


# ─────────────────────────────── Montagem com luz ───────────────────────────────
_GYS, _GXS = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)


def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def _caixa(arr: np.ndarray, r: int, eixo: int) -> np.ndarray:
    if r < 1:
        return arr
    pad = [(0, 0)] * arr.ndim
    pad[eixo] = (r + 1, r)
    a = np.pad(arr, pad, mode="edge")
    s = np.cumsum(a, axis=eixo, dtype=np.float64)
    n = arr.shape[eixo]
    fim = np.take(s, np.arange(2 * r + 1, 2 * r + 1 + n), axis=eixo)
    ini = np.take(s, np.arange(0, n), axis=eixo)
    return ((fim - ini) / (2 * r + 1)).astype(np.float32)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    if raio <= 0:
        return arr
    r = max(1, int(round((math.sqrt(4 * raio * raio + 1) - 1) / 2)))
    out = arr.astype(np.float32)
    for _ in range(3):
        out = _caixa(_caixa(out, r, 0), r, 1)
    return out


def desfocar_rgba(arr: np.ndarray, raio: float) -> np.ndarray:
    if raio <= 0:
        return arr
    pm = arr.copy()
    pm[:, :, :3] *= pm[:, :, 3:4]
    d = desfocar(pm, raio)
    a = np.maximum(d[:, :, 3:4], 1e-4)
    d[:, :, :3] = d[:, :, :3] / a
    return d


def sobre(base: np.ndarray, camada: np.ndarray) -> np.ndarray:
    a = camada[:, :, 3:4]
    return base * (1 - a) + camada[:, :, :3] * a


def luz_pontual(cx: float, cy: float, raio: float, achatar: float = 1.0) -> np.ndarray:
    d2 = ((_GXS - cx * ESC) / (raio * ESC)) ** 2 + ((_GYS - cy * ESC) / (raio * ESC * achatar)) ** 2
    return np.exp(-d2 * 2.2)


def luz_de_chama(cx: float, cy: float, raio: float, achatar: float, seed: int, degraus: int = 7) -> np.ndarray:
    """Poça de luz de chama: borda irregular (parece tremular) e anéis de pixel art na queda."""
    ang = np.arctan2(_GYS - cy * ESC, _GXS - cx * ESC)
    g = np.random.default_rng(seed)
    f = [g.random() * 6.28 for _ in range(3)]
    mod = 1 + 0.09 * np.sin(5 * ang + f[0]) + 0.06 * np.sin(9 * ang + f[1]) + 0.04 * np.sin(14 * ang + f[2])
    d2 = ((_GXS - cx * ESC) / (raio * ESC * mod)) ** 2 + ((_GYS - cy * ESC) / (raio * ESC * achatar * mod)) ** 2
    i = np.exp(-d2 * 2.2)
    return i * 0.76 + np.floor(i * degraus) / degraus * 0.24


def tracar_feixe(rumo, oclusor: np.ndarray, y_fenda: float = 34.0) -> np.ndarray:
    """Para cada pixel da sala, anda na direção da luz (rumo = dx, dy por passo) até a altura da fenda; se chegar
    dentro da fenda sem bater em nada, está no feixe. A luneta e os objetos (oclusor 0..1) fazem sombra."""
    dx, dy = rumo
    passo = 0.5
    x = _XS.copy() + 0.5
    y = _YS.copy() + 0.5
    vivo = np.ones((H, W), dtype=np.float32)
    aceso = np.zeros((H, W), dtype=np.float32)
    chegou = np.zeros((H, W), dtype=bool)
    n = int((H + 10) / passo)
    for i in range(n):
        x = x + dx * passo
        y = y + dy * passo
        agora = (~chegou) & (y <= y_fenda)
        if agora.any():
            ok = fenda_aberta(x, np.full_like(y, y_fenda)) & agora
            aceso = np.where(ok, vivo, aceso)
            chegou |= agora
        if i > 3:
            xi = np.clip(x.astype(int), 0, W - 1)
            yi = np.clip(y.astype(int), 0, H - 1)
            dentro = (x >= 0) & (x < W) & (y >= 0)
            vivo = vivo * (1 - oclusor[yi, xi] * dentro * (~chegou))
    # acima da fenda (o próprio céu) não conta
    aceso[_YS < y_fenda] = 0
    return aceso


def sombra_projetada(mascara: np.ndarray, luz: tuple[float, float], f: float) -> np.ndarray:
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    qx = np.clip((xs + (luz[0] - xs) * f).round().astype(int), 0, W - 1)
    qy = np.clip((ys + (luz[1] - ys) * f).round().astype(int), 0, H - 1)
    return mascara[qy, qx].astype(np.float32)


@lru_cache(maxsize=1)
def camadas():
    """As camadas de pixel art (iguais nas três horas; só a luz muda)."""
    c_cup, m_fenda = cupula()
    c_par = parede()
    c_chao = chao()
    c_esq, e_vela_esq = lado_esquerdo()
    c_graf = graficos_parede()
    arm_t, arm_f = armilar(214.0, 94.0, 17.0, 147)
    lun_t, lun_f = luneta()
    c_mesa, c_obj, e_lamp, sombra_mesa = mesa()
    c_frente = primeiro_plano()
    c_plan, e_plan = planetario()
    return dict(plan=c_plan, e_plan=e_plan, cup=c_cup, fenda=m_fenda, par=c_par, chao=c_chao, esq=c_esq, e_vela_esq=e_vela_esq, graf=c_graf,
                arm_t=arm_t, arm_f=arm_f, lun_t=lun_t, lun_f=lun_f, mesa=c_mesa, obj=c_obj, e_lamp=e_lamp,
                sombra_mesa=sombra_mesa, frente=c_frente)


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    L = camadas()
    ceu = pintar_ceu(nome, per)

    # ── Albedo, de trás para a frente, com profundidade de campo.
    img = ampliar(ceu)
    solido = np.zeros(img.shape[:2], dtype=np.float32)
    objeto = np.zeros(img.shape[:2], dtype=np.float32)  # o que não é parede nem cúpula (recebe o feixe inteiro)
    planos = [("cup", 0.5, False), ("par", 0.5, False), ("chao", 0.3, False), ("esq", 0.5, True), ("graf", 0.2, False), ("plan", 0.4, True),
              ("arm_t", 0.3, True), ("arm_f", 0.3, True), ("lun_t", 0, True), ("lun_f", 0, True), ("mesa", 0.2, True),
              ("obj", 0.2, True)]
    for chave, r, obj in planos:
        a = desfocar_rgba(ampliar(L[chave].c), r)
        img = sobre(img, a)
        solido = np.maximum(solido, a[:, :, 3])
        if obj:
            objeto = np.maximum(objeto, a[:, :, 3])
        else:
            objeto = objeto * (1 - a[:, :, 3])
    chao_m = (_GYS >= PAREDE_CHAO * ESC).astype(np.float32)

    # Sombras de contato: debaixo da mesa, do baú, do pé da luneta e da esfera.
    ao = Camada()
    for (cx, cy, rx, ry, a) in ((434, 146, 46, 4, 0.75), (140, 147, 21, 2.5, 0.7), (300, 147, 13, 2.5, 0.8), (214, 147, 10, 2, 0.7),
                                (70, 147, 10, 2, 0.6), (174, 146, 12, 2, 0.6), (434, 136, 42, 10, 0.35)):
        ao.elipse(cx, cy, rx, ry, "#000000", a)
    for x in range(W):  # o rodapé escurece a junção parede/chão
        ao.ret(x, PAREDE_CHAO, 1, 3, "#000000", 0.35)
    sombra_ao = desfocar_rgba(ampliar(ao.c), 4)
    img = img * (1 - sombra_ao[:, :, 3:4])

    # ── Feixe da fenda (traçado por pixel, com a sombra da luneta e dos objetos).
    oclusor = np.maximum.reduce([L["lun_f"].c[:, :, 3], L["lun_t"].c[:, :, 3] * 0.9, L["arm_f"].c[:, :, 3] * 0.6,
                                 L["arm_t"].c[:, :, 3] * 0.4, L["obj"].c[:, :, 3], L["mesa"].c[:, :, 3]])
    feixe1 = tracar_feixe(per["rumo"], oclusor)
    feixe = desfocar(ampliar(feixe1[:, :, None]), 1.2)[:, :, 0]

    # ── Luz: ambiente (multiplica) + céu pela fenda + feixe + chamas (somam).
    amb = hexa(per["amb"]) * per["amb_k"]
    luz = np.zeros_like(img) + amb
    # luz do céu que desce pela fenda e banha a cúpula e o centro da sala
    luz += luz_pontual(AX, 40, 120, 0.9)[:, :, None] * hexa(per["ceu_luz"]) * per["ceu_k"]
    luz += luz_pontual(AX, 0, 70, 1.2)[:, :, None] * hexa(per["ceu_luz"]) * per["ceu_k"] * 0.6
    sol = hexa(per["sol"]) * per["sol_k"]
    # luz rebatida pela mancha de sol no chão (aquece a mesa, o pé da luneta e o lambri)
    linhas = feixe1[136:150]
    if linhas.sum() > 1:
        mx_ = float((linhas.sum(0) * np.arange(W)).sum() / linhas.sum())
        luz += luz_pontual(mx_, 140, 95, 0.55)[:, :, None] * sol * 0.32
    rec = (0.16 + 0.84 * np.maximum(chao_m, objeto))[:, :, None]  # a parede está atrás do feixe: recebe menos
    luz += feixe[:, :, None] * sol * 1.35 * rec
    # chamas
    if per["lamp"] > 0:
        lx, ly = LAMPARINA
        sm = sombra_projetada(L["sombra_mesa"], (lx, ly), 0.45)
        sm = desfocar(ampliar(sm[:, :, None]), 3)[:, :, 0] * (1 - objeto) * (1 - chao_m)
        poca = luz_de_chama(lx, ly, 125, 0.7, 3)[:, :, None] * hexa("#ff9a48") * 1.15
        miolo = luz_pontual(lx, ly, 26, 0.9)[:, :, None] * hexa("#ffd890") * 0.9
        luz += (poca + miolo) * per["lamp"] * (1 - sm * 0.8)[:, :, None]
    if per["vela"] > 0:
        vx, vy = VELA
        luz += luz_de_chama(vx, vy, 62, 0.85, 5)[:, :, None] * hexa("#ff9a48") * 0.9 * per["vela"]
        luz += luz_de_chama(VELA_ESQ[0], VELA_ESQ[1], 30, 0.9, 7)[:, :, None] * hexa("#ff8a40") * 0.5 * per["vela"]
    s = solido[:, :, None]
    img = img * (1 - s) + img * s * luz

    # ── Emissivos: céu na seteira, chamas com halo, vidro da lamparina.
    sete = Camada()
    for y in range(78, 104):
        for x in range(172, 177):
            if y > 79 or x in (173, 174, 175):
                sete.p(x, y, ceu[min(61, 22 + (y - 78)), 200 + x])
    if nome == "noite":
        sete.p(174, 84, "#ffffff")
    a = ampliar(sete.c)
    img = sobre(img, a * np.array([0.8, 0.8, 0.8, 1], dtype=np.float32))
    chamas = Camada()
    if per["lamp"] > 0:
        colar(chamas, L["e_lamp"])
    if per["vela"] > 0:
        vx, vy = int(VELA[0]), int(VELA[1])
        for (dx, dy, cor) in ((0, 0, "#fff6d0"), (0, -1, "#ffd070"), (0, -2, "#ff9a3a"), (0, 1, "#ffe8a0")):
            chamas.p(vx + dx, vy + dy, cor)
        colar(chamas, L["e_vela_esq"])
    if nome == "noite":
        colar(chamas, L["e_plan"])
    if chamas.c[:, :, 3].any():
        ch = ampliar(chamas.c)
        img = sobre(img, ch)
        pm = ch[:, :, :3] * ch[:, :, 3:4]
        k = max(per["lamp"], per["vela"])
        img += (desfocar(pm, 5) * 1.5 + desfocar(pm, 16) * 1.2) * hexa("#ffb060") * k
        lx, ly = LAMPARINA
        img += luz_pontual(lx, ly - 4, 4, 2.4)[:, :, None] * hexa("#ffc880") * 0.3 * per["lamp"]
        # vidro da chaminé aceso por dentro
        img += luz_pontual(lx, 96, 3.2, 2.2)[:, :, None] * hexa("#ffd8a0") * 0.5 * per["lamp"]

    # ── Feixe volumétrico e poeira suspensa nele.
    vol = feixe * np.clip((_GYS / ESC - 52) / 22, 0, 1) * (1 - 0.35 * np.clip((_GYS / ESC - 62) / 90, 0, 1))
    vol = desfocar(vol[:, :, None], 3)
    img += vol * sol * per["feixe"] * 1.6
    # bordas da fenda acesas pelo céu
    img += desfocar(ampliar(L["fenda"][:, :, None]), 6) * (1 - ampliar(L["fenda"][:, :, None])) * hexa(per["ceu_luz"]) * 0.10
    g = np.random.default_rng(91)
    poeira = np.zeros(img.shape[:2], dtype=np.float32)
    calor = feixe * 0.9 + (luz_pontual(*LAMPARINA, 40) * per["lamp"] * 0.5 if per["lamp"] else 0)
    for _ in range(2600):
        x, y = int(g.random() * W * ESC), int(g.random() * H * ESC)
        k = calor[y, x]
        if k > 0.1 and g.random() < k * 0.6:
            tam = 1 if g.random() < 0.7 else 2
            poeira[y:y + tam, x:x + tam] += 0.5 + g.random() * 0.5
    poeira = desfocar(np.clip(poeira, 0, 1)[:, :, None], 0.6)
    img += poeira * mistura(per["sol"], "#ffffff", 0.4) * (0.55 if nome != "noite" else 0.35)

    # ── Primeiro plano desfocado e escuro.
    fr = desfocar_rgba(ampliar(L["frente"].c), 7)
    escur = 0.22 if nome == "noite" else 0.32
    img = sobre(img, fr * np.array([escur, escur * 0.92, escur * 0.9, 1], dtype=np.float32))

    # ── Acabamento: bloom, curva de tom, cor, esquerda calma, vinheta, grão.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img - 0.7, 0, None) * np.clip((lum - 0.6) * 3, 0, 1)
    img = img + desfocar(claro, 6) * 0.5 + desfocar(claro, 20) * 0.55
    joelho = 0.72
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, f = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (f * 0.5 + 0.5)))
    img = np.clip((img - 0.48) * 1.07 + 0.48, 0, 1.3)
    xn = _GXS / (W * ESC)
    calma = np.clip((0.46 - xn) / 0.16, 0, 1)[:, :, None]
    media = desfocar(np.clip(img, 0, 1.3), 16)
    img = media + (img - media) * (1 - 0.4 * calma)
    img *= 1 - 0.22 * calma
    v = (xn - 0.62) ** 2 * 1.1 + (_GYS / (H * ESC) - 0.48) ** 2 * 1.4
    img *= (1 - np.clip(v - 0.06, 0, 1) * 0.95)[:, :, None]
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.022
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    pedidas = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in pedidas:
        img = montar(nome)
        destino = PASTA / f"observatorio-{nome}.webp"
        img.save(destino, quality=84, method=6)
        menor = PASTA / f"observatorio-{nome}-960.webp"
        img.resize((960, 320), Image.LANCZOS).save(menor, quality=84, method=6)
        print(destino.name, destino.stat().st_size // 1024, "KB |", menor.name, menor.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
