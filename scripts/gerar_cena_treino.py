"""Cenário "HD-2D" da página Caderno de erros: o Campo de treino da vila, ao pé da muralha do castelo (01/11/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai
das funções abaixo, na mesma técnica das outras cenas (scripts/gerar_cena_observatorio.py e scripts/gerar_cena_inicio.py):
pixel art em 480 x 160, camada por camada, montada em 3x com a luz calculada por pixel.

A cena: o lugar da revanche. Cada questão errada volta para ser refeita até acertar, como o golpe repetido no pátio.
À esquerda, a muralha de cantaria do castelo com a torre redonda (porta de tábuas, seteiras, hera, manchas de chuva)
e, atrás dela, as torres de telhado cônico do castelo. No canto da muralha, o contraforte com o estandarte
verde-esmeralda (um ramo dourado bordado, sem letras) e a tocha no suporte de ferro. Em volta do pátio, a paliçada de
troncos apontados, amarrados com corda, com frestas; atrás, a floresta. No pátio de terra batida, com pegadas: o
suporte de armas com espadas de treino encostadas (guarda redonda, inclinadas, nada em cruz) e escudos redondos; o
boneco de treino de palha e lona num poste (cortes de golpes, remendos costurados, braços de madeira inclinados para baixo); o alvo
redondo de palha pendurado num cavalete, com flechas fora do centro e UMA cravada no centro (a revanche que acertou),
um fardo de feno embaixo; o braseiro de ferro num tripé; o banco com a toalha, o balde, um rolo de atadura de linho e
uma tala acolchoada; os sacos de areia pendurados num pórtico; fardos e um barril de bastões junto à muralha.

A luz (é o ponto forte):
- as sombras são traçadas por pixel: cada ponto do chão e dos objetos "anda" na direção da luz e testa a profundidade
  (a linha do chão) de cada coisa que cruza, então só faz sombra o que de fato está entre ele e a luz;
- manhã: sol baixo dourado-frio pela direita, sombras longas e nítidas para a esquerda, névoa rasteira, orvalho;
- tarde: o poente atrás da paliçada; a luz passa só pelas frestas entre os troncos e risca o pátio em faixas, com
  feixes volumétricos e poeira levantada brilhando; o braseiro e a tocha já acesos;
- noite: luar azul com sombras suaves, estrelas, janelas do castelo, e o braseiro e a tocha com poças de luz em
  degraus, sombras projetadas pelo fogo, fagulhas e brilho (bloom);
- profundidade de campo, oclusão de contato, luz de recorte, correção de cor, vinheta e grão.

Composição para a interface: os 42% da esquerda (x < 200) ficam calmos e escuros (o texto vai ali); os focos (boneco,
alvo, braseiro) ficam do centro para a direita. O chão em x 330–380 fica livre e plano (gato com os pés em y ≈ 150).
Poleiro da coruja: o topo da trave do alvo, pés em (406, 76). Chamas: braseiro em BRASEIRO, tocha em TOCHA.

Gera em public/pixel/paginas/: treino-{manha,tarde,noite}.webp (1440 x 480), -960.webp (960 x 320) e
-movel.webp (888 x 480: de x 184 até a borda, a janela do celular).
Uso: python3 scripts/gerar_cena_treino.py [manha|tarde|noite ...]  (precisa de numpy e Pillow)
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

FUNDO_Y = 118          # pé da paliçada (fundo do pátio)
MURO_Y = 124           # pé da muralha
MURO_X1 = 232          # fim da face da muralha (começa a face lateral do contraforte)
PAL_X0 = 240           # começo da paliçada
SOL_TARDE = (438.0, 63.0)
LUA = (352.0, 19.0)
BRASEIRO = (453.0, 89.0)   # centro da chama do braseiro (pé do bloco de pedra em y 147)
BRAS_BASE = 147
TOCHA = (198.0, 64.0)      # centro da chama da tocha (na muralha)
POLEIRO = (406, 76)        # pés da coruja: topo da trave do alvo
ALVO = (406.0, 103.0)      # centro do alvo
GATO = (330, 380)          # faixa de chão livre (pés em y ≈ 150)
MOVEL_X0 = 184


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


def suave(a: float, b: float, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


_YS, _XS = np.mgrid[0:H, 0:W].astype(np.float32)


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples."""

    def __init__(self) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(math.floor(x)), int(math.floor(y))
        if 0 <= x < W and 0 <= y < H and a > 0:
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

    def contornar(self, cor: str, a: float = 1.0) -> None:
        alfa = self.c[:, :, 3] > 0.5
        viz = np.zeros_like(alfa)
        viz[1:] |= alfa[:-1]
        viz[:-1] |= alfa[1:]
        viz[:, 1:] |= alfa[:, :-1]
        viz[:, :-1] |= alfa[:, 1:]
        borda = viz & ~alfa
        self.mascara(borda.astype(np.float32), cor, a)

    def juntar(self, outra: "Camada") -> None:
        a = outra.c[:, :, 3:4]
        na = a + self.c[:, :, 3:4] * (1 - a)
        self.c[:, :, :3] = (outra.c[:, :, :3] * a + self.c[:, :, :3] * self.c[:, :, 3:4] * (1 - a)) / np.maximum(na, 1e-6)
        self.c[:, :, 3:4] = na


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
    img = Image.fromarray(pequeno).resize(((w // ex + 3) * ex, (h // ey + 3) * ey), Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32)[ey:ey + h, ex:ex + w], 0, 1)


BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16 - 0.47)
BAYER_HW = np.tile(BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W]


@lru_cache(maxsize=1)
def _h01() -> np.ndarray:
    return np.random.default_rng(5).random((H, W)).astype(np.float32)


def hash01_mapa() -> np.ndarray:
    return _h01()


def tons_idx(tons, k: float):
    return tons[int(np.clip(k, 0, 0.999) * len(tons))]


def tons_arr(tons, k: np.ndarray, pont: float = 0.0) -> np.ndarray:
    """Escolhe por pixel um tom da paleta (k 0..1), com pontilhado ordenado opcional (a 'trama' da pixel art)."""
    pal = np.array([hexa(t) for t in tons], dtype=np.float32)
    i = np.clip(np.floor(k * len(tons) + BAYER_HW * pont), 0, len(tons) - 1).astype(int)
    return pal[i]


# Paletas (do escuro ao claro). A luz da hora entra depois, na montagem.
PEDRA_M = ["#1e1a1c", "#2c2628", "#3c3433", "#4e4541", "#62574e", "#786a5c", "#8e7e6a", "#a6937a", "#bca88c"]
MADEIRA = ["#1e120a", "#2e1c10", "#422816", "#58361e", "#704628", "#8a5a34", "#a6703f", "#c08a52"]
CASCA = ["#140d09", "#22160f", "#332216", "#46301e", "#5c4028", "#755434", "#906a42"]
LENHO = ["#4e4030", "#6a5844", "#887460", "#a6927a", "#bcab94", "#d2c6b0"]   # madeira descascada, ponta talhada
PALHA = ["#382a14", "#56421e", "#76602c", "#957a3e", "#b09252", "#c6a968", "#d8be84", "#e8d4a8"]
LONA = ["#4a3e2e", "#665742", "#847358", "#a08e70", "#bcaa88", "#d4c4a2", "#e8dcbe", "#f6eedc"]
ESTOPA = ["#2e2214", "#46341e", "#5e482a", "#786038", "#927a4a", "#ab935e"]   # pano grosso dos sacos de areia
CORDA = ["#3a2a18", "#5e4628", "#86683e", "#aa8a56", "#c8aa74"]
FERRO = ["#0e0e12", "#1a1a20", "#26262e", "#34343e", "#46464f", "#5e5e68", "#80808a"]
ESMERALDA = ["#041a16", "#0a2e28", "#0C3C34", "#125046", "#17675B", "#1f7c6c", "#2e957f", "#46ae94"]
OURO = ["#4a300c", "#7a541a", "#a8782a", "#cc9a40", "#E4B85C", "#f2d48a", "#fff0c4"]
TERRA = ["#241a14", "#33261c", "#433224", "#54402e", "#665038", "#7a6244", "#8e7552", "#a28862", "#b49a72"]
GRAMA = ["#0e2014", "#16301a", "#1f4220", "#2b5626", "#386a2c", "#4a7e32", "#5e923a", "#78a646"]
HERA = ["#0a1c12", "#10281a", "#173820", "#204a26", "#2c5e2c", "#3c7434", "#548c3e"]
LINHO = ["#8a8270", "#a8a08c", "#c4bca6", "#dcd6c2", "#eeeadc", "#faf8f0"]
FOLHA_MATA = ["#0a1a16", "#10261e", "#173426", "#1f442e", "#2a5636", "#386a40", "#4c7e48"]
PINHO = ["#0e2420", "#163028", "#1e3e30", "#284c38", "#345c42"]


# ─────────────────────────────── Horas do dia ───────────────────────────────
PERIODOS = {
    "manha": dict(
        ceu=("#5a93d2", "#a6cde6", "#f1ead6"), amb="#9cb0cc", amb_k=0.6, sol="#ffd8a0", sol_k=1.08,
        sol_dir=(1.3, -0.16), nevoa="#d6e4e6", fogo=0.0, tocha=0.0, quente="#ffe8c4", fria="#22426a",
        montes=("#7f9cc4", "#a4bcd8"), nuvem=("#ffffff", "#c2d4ea")),
    "tarde": dict(
        ceu=("#30467e", "#d88a60", "#ffd08a"), amb="#a8846e", amb_k=0.62, sol="#ffa65a", sol_k=2.1,
        sol_dir=None, nevoa="#f4b484", fogo=0.45, tocha=0.5, quente="#ffd49a", fria="#2c3452",
        montes=("#6a5a7c", "#a26e72"), nuvem=("#ffd8a8", "#b46e7a")),
    "noite": dict(
        ceu=("#050b1e", "#0e1c40", "#22356a"), amb="#5c74b4", amb_k=0.5, sol="#a8c0ff", sol_k=0.5,
        sol_dir=(0.6, -0.25), nevoa="#22305c", fogo=2.1, tocha=1.35, quente="#ffcf8a", fria="#0e1c3c",
        montes=("#121c3e", "#1a2850"), nuvem=("#2c3c68", "#16203e")),
}


# ─────────────────────────────── Céu ───────────────────────────────
def pintar_ceu(nome: str, per: dict) -> np.ndarray:
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    t = np.clip(_YS / 96, 0, 1)[:, :, None]
    ceu = np.where(t < 0.5, topo * (1 - t * 2) + meio * t * 2, meio * (2 - t * 2) + horiz * (t * 2 - 1)).astype(np.float32)
    # Nuvens em faixas, com o lado de baixo sombreado.
    nuv = ruido(41, 30, 6) * 0.6 + ruido(42, 9, 3) * 0.4
    faixa = np.exp(-((_YS - 26) / 12) ** 2) + np.exp(-((_YS - 46) / 6) ** 2) * 0.7
    v = np.clip((nuv - 0.5) * 3.2 * faixa, 0, 0.85)
    sob = np.clip((np.roll(nuv, -2, 0) - 0.5) * 3.2 * faixa, 0, 1) < v - 0.05
    cn, cs = hexa(per["nuvem"][0]), hexa(per["nuvem"][1])
    k = v[:, :, None] * (0.85 if nome != "noite" else 0.4)
    ceu = ceu * (1 - k) + np.where(sob[:, :, None], cn, cs) * k
    if nome == "manha":
        d = np.hypot(_XS - 560, (_YS + 10) * 1.2)
        ceu += (np.exp(-d / 150) * 0.55)[:, :, None] * hexa("#fff2d0")
    elif nome == "tarde":
        sx, sy = SOL_TARDE
        d = np.hypot(_XS - sx, (_YS - sy) * 1.25)
        ceu += (np.exp(-d / 70) * 0.75 + np.exp(-d / 16) * 0.9)[:, :, None] * hexa("#ffd08a")
        # o disco do sol
        disco = np.hypot(_XS + 0.5 - sx, _YS + 0.5 - sy)
        ceu = np.where((disco < 6.5)[:, :, None], hexa("#fff6d8") * 1.6, ceu)
        ceu = np.where(((disco >= 6.5) & (disco < 7.5))[:, :, None], hexa("#ffe0a0") * 1.3, ceu)
        # passarinhos voltando para casa
        for (bx, by) in ((300, 30), (306, 26), (312, 32), (262, 22)):
            for (dx, dy) in ((-1, -1), (0, 0), (1, -1)):
                ceu[by + dy, bx + dx] = hexa("#3a2230")
    else:
        g = np.random.default_rng(17)
        for _ in range(520):
            x, y = int(g.random() * W), int(g.random() * 100)
            b = 0.25 + g.random() ** 2.2 * 0.95
            ceu[y, x] += b * hexa("#e4ecff")
            if b > 1.0:
                for (ox, oy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= x + ox < W and 0 <= y + oy < H:
                        ceu[y + oy, x + ox] += 0.28 * hexa("#c8d8ff")
        via = np.exp(-((_YS + 0.42 * (_XS - 300) - 40) / 11) ** 2) * ruido(43, 5) * 0.34
        ceu += via[:, :, None] * hexa("#8a9ce0")
        lx, ly = LUA
        for yy in range(int(ly) - 8, int(ly) + 9):
            for xx in range(int(lx) - 8, int(lx) + 9):
                dd = math.hypot(xx + 0.5 - lx, yy + 0.5 - ly)
                if dd < 6.6:
                    cr = (xx - lx + 2) ** 2 + (yy - ly + 1) ** 2 < 4 or (xx - lx - 2) ** 2 + (yy - ly - 2) ** 2 < 2.5 \
                        or (xx - lx + 1) ** 2 + (yy - ly - 3) ** 2 < 1.2
                    ceu[yy, xx] = hexa("#c4d0f2") if cr or dd > 5.8 else hexa("#f6f8ff")
        d = np.hypot(_XS - lx, _YS - ly)
        ceu += (np.exp(-d / 22) * 0.38 + np.exp(-d / 70) * 0.12)[:, :, None] * hexa("#9ab4f4")
    return ceu


# ─────────────────────────────── Fundo: montes, castelo, mata ───────────────────────────────
def pintar_montes(per: dict) -> Camada:
    c = Camada()
    longe, perto = per["montes"][1], per["montes"][0]
    n = ruido(51, 20)[0] * 8 + ruido(52, 6)[0] * 3
    for x in range(W):
        y1 = int(50 + 7 * math.sin(x / 37 + 1) + 3 * math.sin(x / 11) + n[x])
        c.ret(x, y1, 1, 76 - y1, longe)
        c.p(x, y1, mistura(longe, "#ffffff", 0.18))
        y2 = int(60 + 5 * math.sin(x / 23 + 2) + 2 * math.sin(x / 7.3) + n[(x * 3) % W] * 0.4)
        c.ret(x, y2, 1, 80 - y2, perto)
        if (x + y2) % 3 == 0:
            c.p(x, y2, mistura(perto, "#ffffff", 0.12))
    return c


def castelo_fundo(noite: bool) -> tuple[Camada, list]:
    """O castelo atrás da muralha: torre de menagem quadrada, torres redondas de telhado cônico, salão e flâmulas."""
    c = Camada()
    pedra = ["#5e5a62", "#7a7478", "#98908c", "#b6aca2", "#cfc6b8"]
    telha = ["#1e2a3a", "#2a3a4e", "#384e64", "#4a6278", "#5e7890"]
    jan = []

    def torre_redonda(cx, r, topo, base, teto):
        for y in range(topo, base):
            for x in range(int(cx - r), int(cx + r) + 1):
                u = (x + 0.5 - cx) / r
                if abs(u) > 1:
                    continue
                k = 0.55 + u * 0.4 - abs(u) ** 4 * 0.3 + (hash01(x, y // 3, 7) - 0.5) * 0.12
                if (y - topo) % 4 == 3:
                    k -= 0.15
                c.p(x, y, tons_idx(pedra, k))
        for x in range(int(cx - r - 1), int(cx + r) + 2):   # beiral
            c.p(x, topo, pedra[1])
        for k in range(teto):
            meia = (r + 1.5) * (1 - k / teto)
            for x in range(int(round(cx - meia)), int(round(cx + meia)) + 1):
                u = (x + 0.5 - cx) / max(meia, 0.5)
                c.p(x, topo - 1 - k, tons_idx(telha, 0.5 + u * 0.45 + (0.1 if (x + k) % 3 == 0 else 0)))
        c.p(int(cx), topo - teto - 1, OURO[3])
        c.p(int(cx), topo - teto - 2, OURO[2])

    # Salão com telhado de duas águas entre as torres.
    for y in range(26, 42):
        for x in range(122, 200):
            k = 0.45 + (hash01(x // 5, y // 3, 3) - 0.5) * 0.15 + (0.12 if y % 4 == 0 else 0)
            c.p(x, y, tons_idx(pedra, k))
    for k in range(9):
        for x in range(120 + k, 202 - k):
            c.p(x, 25 - k, tons_idx(telha, 0.35 + 0.1 * ((x + k) % 4 == 0) + k * 0.04))
    # Torre de menagem quadrada, com ameias e uma janela em arco.
    for y in range(6, 42):
        for x in range(146, 170):
            u = (x - 146) / 23
            k = 0.4 + u * 0.35 + (hash01(x // 4, y // 3, 5) - 0.5) * 0.14
            if (y - 6) % 4 == 3:
                k -= 0.12
            c.p(x, y, tons_idx(pedra, k))
    for x in range(144, 172):
        c.p(x, 6, pedra[3])
        if (x - 144) % 4 < 2:
            c.p(x, 4, pedra[2])
            c.p(x, 5, pedra[3])
    for (jx, jy) in ((152, 14), (161, 14), (156, 26)):
        c.ret(jx, jy, 2, 4, "#14121a")
        c.p(jx, jy - 1, pedra[1])
        jan.append((jx, jy + 1))
    torre_redonda(128.0, 6, 20, 42, 14)
    torre_redonda(190.0, 5, 16, 42, 12)
    torre_redonda(176.0, 3.5, 28, 42, 8)
    for (jx, jy) in ((127, 26), (190, 22), (189, 31)):
        c.ret(jx, jy, 1, 3, "#14121a")
        jan.append((jx, jy + 1))
    # Flâmulas esmeralda com a ponta dourada.
    for (fx, fy) in ((128, 5), (190, 3), (157, -1)):
        c.ret(fx, fy - 5 if fy >= 5 else 0, 1, 6, "#2a2a30")
        for j, w in enumerate((5, 4, 3, 2)):
            c.ret(fx + 1, max(0, fy - 5) + j // 2 + (j % 2), w, 1, ESMERALDA[5] if j < 2 else ESMERALDA[4])
        c.p(fx + 4, max(0, fy - 5) + 1, OURO[4])
    return c, jan


def copa(c: Camada, cx, cy, r, tons, seed: int, dens=0.62, achatar=0.85, brilho=0.0) -> None:
    """Um cacho de folhas: miolo escuro e carimbos de folha sombreados como uma esfera (luz de cima à direita)."""
    g = np.random.default_rng(seed)
    nt = len(tons)
    ry = r * achatar
    for y in range(int(cy - ry * 0.9), int(cy + ry * 0.9) + 1):
        for x in range(int(cx - r * 0.9), int(cx + r * 0.9) + 1):
            dx, dy = (x - cx) / (r * 0.9), (y - cy) / (ry * 0.9)
            if dx * dx + dy * dy <= 1:
                c.p(x, y, tons[int(np.clip((0.3 + dx * 0.25 - dy * 0.25) * (nt - 1) * 0.6, 0, nt - 1))])
    n = int(math.pi * r * ry * dens)
    folhas = []
    for _ in range(n):
        ang = g.random() * math.tau
        d = math.sqrt(g.random()) * 1.05
        dx, dy = math.cos(ang) * d, math.sin(ang) * d
        nz = math.sqrt(max(0.0, 1 - dx * dx - dy * dy))
        k = dx * 0.45 - dy * 0.55 + nz * 0.55
        t = (k * 0.5 + 0.45) + g.normal(0, 0.09) + brilho
        folhas.append((t, cx + dx * r, cy + dy * ry, int(g.random() * 4)))
    folhas.sort(key=lambda f: f[0])
    carimbos = (((0, 0), (1, 0), (1, 1)), ((1, 0), (0, 1), (1, 1)), ((0, 0), (1, 0), (2, 0), (1, 1)), ((0, 0), (0, 1), (1, 1)))
    for t, x, y, ic in folhas:
        i = int(np.clip(t * (nt - 1) + 0.3, 0, nt - 1))
        for (sx, sy) in carimbos[ic]:
            c.p(int(x) + sx, int(y) + sy, tons[i])
        if i >= nt - 2:
            c.p(int(x), int(y), tons[min(nt - 1, i + 1)])


def pintar_mata(nome: str) -> Camada:
    """A floresta atrás da paliçada: pinheiros ao longe, copas redondas mais perto; uma clareira onde o sol se põe."""
    c = Camada()
    g = np.random.default_rng(61)
    fundo = ["#0c1c18", "#122620", "#183026"]
    for y in range(64, FUNDO_Y + 1):
        for x in range(MURO_X1 - 4, W):
            c.p(x, y, fundo[int(np.clip(ruido(902, 4)[y, x] * 2.6 + (y - 76) / 30, 0, 2))])
    # pinheiros (fileira de trás)
    x = MURO_X1 - 6.0
    while x < W + 4:
        clareira = 404 < x < 470
        topo = (60 + g.random() * 6) if clareira else (40 + g.random() * 14)
        alt = 92 - topo
        for k in range(int(alt)):
            meia = 0.5 + k * 0.33 + ((k + int(x)) % 4) * 0.42
            yy = int(topo + k)
            for xx in range(int(x - meia), int(x + meia) + 1):
                u = (xx - x) / max(meia, 1)
                c.p(xx, yy, PINHO[4] if u > 0.35 else PINHO[3] if u > -0.2 else PINHO[2] if u > -0.6 else PINHO[1])
        x += 4 + g.random() * 6
    # copas redondas (fileira da frente), mais escuras
    x = MURO_X1 - 2.0
    while x < W + 6:
        clareira = 410 < x < 466
        r = 6 + g.random() * 6
        topo = (70 + g.random() * 4) if clareira else (52 + g.random() * 12)
        c.ret(x, topo + r * 0.6, 2, FUNDO_Y - topo, "#1a1410")
        copa(c, x, topo + r * 0.7, r, FOLHA_MATA, seed=int(x * 7) + 3, dens=0.6)
        x += 7 + g.random() * 8
    return c


# ─────────────────────────────── A muralha ───────────────────────────────
def cantaria(c: Camada, mask: np.ndarray, seed: int, alts, larg=(8, 16), k0: float = 0.5, luz_x=None,
             y_ini: int = 0, desloc: float = 0.0) -> None:
    """Pinta blocos de pedra nas fiadas (alturas `alts`) dentro de `mask`: tom por bloco, aresta de cima clara,
    lado direito aceso, rejunte fundo, cantos gastos, poros e lascas. luz_x(x) devolve um ajuste por coluna (torre)."""
    n = ruido(seed, 3)
    n2 = ruido(seed + 1, 9, 4)
    ys = np.nonzero(mask.any(1))[0]
    if len(ys) == 0:
        return
    y = int(ys.min()) if not y_ini else y_ini
    fi = 0
    y_fim = int(ys.max()) + 1
    while y < y_fim:
        alt = alts[fi % len(alts)]
        g = np.random.default_rng(seed * 100 + fi)
        x = -int(g.random() * 12) + int(desloc)
        while x < W:
            lw = int(larg[0] + g.random() * (larg[1] - larg[0]))
            kb = k0 + (g.random() - 0.5) * 0.3
            for yy in range(y, min(y_fim, y + alt)):
                for xx in range(max(0, x), min(W, x + lw)):
                    if not mask[yy, xx]:
                        continue
                    ex, ey = xx - x, yy - y
                    if ex == lw - 1 or ey == alt - 1:
                        k = 0.06 + n[yy, xx] * 0.06
                    else:
                        k = kb + (n[yy, xx] - 0.5) * 0.28 + (n2[yy, xx] - 0.5) * 0.18
                        if ey == 0:
                            k += 0.16
                        elif ey == alt - 2:
                            k -= 0.14
                        if ex == lw - 2:
                            k += 0.08
                        elif ex == 0:
                            k -= 0.08
                        if (ex in (0, lw - 2)) and (ey in (0, alt - 2)):
                            k -= 0.22
                        if hash01(xx, yy, seed) < 0.045:
                            k -= 0.2
                        elif hash01(xx, yy, seed + 9) < 0.02:
                            k += 0.14
                    if luz_x is not None:
                        k += luz_x(xx)
                    c.p(xx, yy, tons_idx(PEDRA_M, k))
            x += lw
        y += alt
        fi += 1


def hera(c: Camada, x0: float, y0: float, comp: int, seed: int, sobe: float = -1.0, deriva: float = 0.0) -> None:
    """Ramo de hera: caule sinuoso com folhas em três tons (lado direito aceso), subindo (sobe=-1) ou caindo (+1)."""
    g = np.random.default_rng(seed)
    x, y = x0, y0
    for s in range(comp):
        x += deriva + math.sin(s * 0.35 + seed) * 0.55 + (g.random() - 0.5) * 0.6
        y += sobe * (0.85 + g.random() * 0.3)
        c.p(x, y, "#2a2414")
        if g.random() < 0.62:
            lado = -1 if g.random() < 0.5 else 1
            fx, fy = x + lado * (1 + g.random() * 2), y + (g.random() - 0.5) * 2
            k = 0.45 + lado * 0.15 + (g.random() - 0.5) * 0.35 - (comp - s) / comp * 0.1
            base = tons_idx(HERA, k)
            for (dx, dy) in ((0, 0), (1, 0), (0, 1), (-1, 0), (0, -1)):
                if (dx, dy) != (0, -1) or g.random() < 0.5:
                    c.p(fx + dx, fy + dy, base)
            c.p(fx + 1, fy - 1 if g.random() < 0.5 else fy, tons_idx(HERA, k + 0.25))
            c.p(fx - 1, fy + 1, tons_idx(HERA, k - 0.3))


def tufo(c: Camada, x: float, yb: float, n: int, seed: int, alto: float = 5, tons=GRAMA, seco: float = 0.0) -> None:
    """Tufo de capim: folhas finas curvadas, escuras no pé e claras na ponta."""
    g = np.random.default_rng(seed)
    for _ in range(n):
        ox = (g.random() - 0.5) * n * 0.9
        h = alto * (0.5 + g.random() * 0.7)
        curva = (g.random() - 0.5) * 1.6
        for s in range(int(h)):
            t = s / max(h, 1)
            xx = x + ox + curva * t * t * h * 0.35
            k = 0.2 + t * 0.7 + (0.1 if curva > 0 else 0)
            cor = tons_idx(tons, k)
            if seco > 0 and g.random() < seco:
                cor = tons_idx(PALHA, 0.3 + t * 0.5)
            c.p(xx, yb - s, cor)


def chama(e: Camada, cx: float, yb: float, w: float, h: float, seed: int) -> None:
    """Chama de pixel art: miolo quase branco, amarelo, laranja e as pontas vermelhas, com línguas que se soltam."""
    g = np.random.default_rng(seed)
    for y in range(int(yb - h), int(yb) + 1):
        t = (yb - y) / h
        sway = math.sin(t * 4.0 + seed) * t * 1.5
        meia = (w / 2) * (1 - t ** 1.25) * (0.86 + 0.14 * math.sin(t * 11 + seed * 2)) + 0.4
        for x in range(int(cx - meia + sway) - 1, int(cx + meia + sway) + 2):
            u = abs(x + 0.5 - cx - sway) / max(meia, 0.5)
            if u > 1:
                continue
            q = u * 0.62 + t * 0.62
            cor = "#fffbe6" if q < 0.28 else "#ffe48a" if q < 0.5 else "#ffb444" if q < 0.72 else "#ff7c2c" if q < 0.92 else "#d8461e"
            e.p(x, y, cor)
    for k in range(3):
        tx = cx + (g.random() - 0.5) * w * 0.6
        ty = yb - h - 1 - g.random() * h * 0.25
        e.p(tx, ty, "#ff9a3a")
        e.p(tx, ty + 1, "#ff7a2a", 0.7)


def muralha() -> tuple[Camada, Camada, np.ndarray]:
    """Cantaria do castelo: o pano de muralha com ameias, a torre redonda com porta e seteiras, o contraforte do canto
    (face e lateral), o estandarte, a tocha no suporte, a hera e as manchas de chuva. Devolve (camada, chama, lateral)."""
    c, e = Camada(), Camada()
    face = np.zeros((H, W), dtype=bool)
    # pano de muralha: parapeito no y 40, merlões de 6 com vãos de 4
    face[40:MURO_Y, 0:MURO_X1] = True
    mer = ((_XS.astype(int) + 3) % 10 < 6) & (_YS >= 33) & (_YS < 40) & (_XS < MURO_X1)
    face |= mer
    c_pano = Camada()
    cantaria(c_pano, face, 300, (6, 5, 7, 5, 6, 6, 7, 5), k0=0.42)
    c.juntar(c_pano)
    # coroamento (lajes do adarve) e a sombra debaixo dele
    for x in range(MURO_X1):
        c.p(x, 40, PEDRA_M[7] if x % 9 else PEDRA_M[5])
        c.p(x, 41, PEDRA_M[3])
        c.p(x, 42, PEDRA_M[1], 0.6)
        if (x + 3) % 10 < 6:
            c.p(x, 33, PEDRA_M[7])
    # Torre redonda (x 22..92), mais alta, com balcão de mata-cães e merlões.
    TX, TR = 57.0, 35.0
    torre = (np.abs(_XS + 0.5 - TX) < TR) & (_YS >= 14) & (_YS < MURO_Y)
    luz_t = lambda x: 0.22 * (x + 0.5 - TX) / TR - 0.32 * ((x + 0.5 - TX) / TR) ** 4 + 0.04
    c_t = Camada()
    cantaria(c_t, torre, 310, (6, 6, 5, 7, 6, 5), larg=(7, 13), k0=0.46, luz_x=luz_t)
    c.juntar(c_t)
    # balcão saliente (y 6..14) apoiado em mísulas, merlões em cima
    for y in range(4, 15):
        for x in range(int(TX - TR - 4), int(TX + TR + 4)):
            u = (x + 0.5 - TX) / (TR + 4)
            if y < 8 and not ((x + 1) % 9 < 5):
                continue
            k = 0.5 + 0.24 * u - 0.3 * u ** 4 + (hash01(x // 4, y // 3, 31) - 0.5) * 0.14
            if y in (8, 4):
                k += 0.2
            if y == 13:
                k -= 0.25
            if y == 14 or (y >= 11 and (x % 6) in (0, 1)):
                k = 0.05   # vãos entre as mísulas
            c.p(x, y, tons_idx(PEDRA_M, k))
    # seteiras da torre e do pano
    for (sx, sy, h) in ((57, 36, 12), (57, 76, 12), (140, 60, 9), (110, 82, 8)):
        for yy in range(sy - 2, sy + h + 2):
            for xx in range(sx - 3, sx + 4):
                d = abs(xx - sx)
                if sy <= yy < sy + h and d <= 0:
                    c.p(xx, yy, "#08080c")
                elif sy <= yy < sy + h and d == 1:
                    c.p(xx, yy, PEDRA_M[2] if xx < sx else PEDRA_M[6])
                elif d <= 2 and (yy in (sy - 1, sy + h)):
                    c.p(xx, yy, PEDRA_M[7] if yy < sy else PEDRA_M[2])
    # Porta de tábuas em arco no pé da torre.
    dx0, dx1, dtopo = 45, 69, 98
    acx, acy, ar = 57.0, 108.0, 12.0
    for y in range(dtopo - 4, MURO_Y):
        for x in range(dx0 - 4, dx1 + 4):
            d = math.hypot(x + 0.5 - acx, (y + 0.5 - acy) * 1.0)
            dentro = (dx0 <= x < dx1) and (y >= acy or d < ar)
            aduela = (not dentro) and (y < acy and ar <= d < ar + 4 or (y >= acy and (dx0 - 4 <= x < dx0 or dx1 <= x < dx1 + 4)))
            if dentro:
                tab = (x - dx0) // 4
                ex = (x - dx0) % 4
                k = 0.42 + (hash01(tab, 41) - 0.5) * 0.18 + (hash01(x, y // 2, 42) - 0.5) * 0.1
                if ex == 0:
                    k = 0.08
                elif ex == 1:
                    k += 0.1
                if y in (104, 105, 116, 117):
                    c.p(x, y, FERRO[2] if y in (104, 116) else FERRO[1])
                    if ex == 2:
                        c.p(x, y, FERRO[5])
                    continue
                c.p(x, y, tons_idx(MADEIRA, k))
            elif aduela:
                if y < acy:
                    ang = math.atan2(y + 0.5 - acy, x + 0.5 - acx)
                    seg = int((ang + math.pi) / math.pi * 9)
                    k = 0.5 + (hash01(seg, 43) - 0.5) * 0.24 + (0.14 if d < ar + 1 else 0) - (0.25 if (ang * 9 / math.pi) % 1 < 0.12 else 0)
                else:
                    k = 0.45 + (hash01(x, (y - 108) // 5, 44) - 0.5) * 0.24 - (0.3 if (y - 108) % 5 == 4 else 0)
                c.p(x, y, tons_idx(PEDRA_M, k + 0.08))
    c.elipse(63.5, 112.5, 1.6, 1.6, FERRO[4])
    c.p(63, 112, FERRO[6])
    c.ret(dx0 - 2, MURO_Y - 2, dx1 - dx0 + 4, 2, PEDRA_M[6])
    # Contraforte do canto: face (x 206..232, topo y 22) e a face lateral (x 232..240) que recebe o sol da direita.
    cf = (_XS >= 206) & (_XS < MURO_X1) & (_YS >= 22) & (_YS < MURO_Y)
    cf |= ((_XS.astype(int) - 206) % 9 < 5) & (_XS >= 205) & (_XS < MURO_X1) & (_YS >= 15) & (_YS < 22)
    c_cf = Camada()
    cantaria(c_cf, cf, 320, (7, 6, 6, 7, 5), larg=(9, 14), k0=0.5, desloc=206)
    c.juntar(c_cf)
    lat = np.zeros((H, W), dtype=bool)
    for x in range(MURO_X1, PAL_X0):
        t = (x - MURO_X1) / (PAL_X0 - MURO_X1)
        y_topo = int(round(22 - 3 * t))
        y_pe = int(round(MURO_Y - 6 * t))
        lat[y_topo:y_pe, x] = True
        if (x - MURO_X1) % 9 < 5:
            lat[max(0, y_topo - 7):y_topo, x] = True
    c_lat = Camada()
    cantaria(c_lat, lat, 330, (7, 6, 6, 7, 5), larg=(3, 6), k0=0.62)
    c.juntar(c_lat)
    for y in range(15, MURO_Y):   # quina do contraforte (aresta viva)
        c.p(MURO_X1, y, PEDRA_M[8] if y % 7 else PEDRA_M[6])
        c.p(MURO_X1 - 1, y, PEDRA_M[3])
    for x in range(205, MURO_X1):
        if (x - 206) % 9 < 5:
            c.p(x, 15, PEDRA_M[8])
    # Rodapé (sapata) inclinado no pé da muralha.
    for x in range(MURO_X1):
        for y in range(MURO_Y - 7, MURO_Y):
            if c.c[y, x, 3] > 0:
                k = 0.5 + (hash01(x // 7, y, 51) - 0.5) * 0.2 + (0.22 if y == MURO_Y - 7 else -0.05 * (y - MURO_Y + 7))
                c.p(x, y, tons_idx(PEDRA_M, k))
    # Manchas de chuva escorrendo dos vãos das ameias e escurecimento do pé (umidade).
    risco = ruido(57, 1, 18)
    sujo = np.zeros((H, W), dtype=np.float32)
    vaos = ((_XS.astype(int) + 3) % 10 >= 6).astype(np.float32)
    sujo += vaos * np.clip((risco - 0.45) * 2.4, 0, 1) * np.clip(1 - (_YS - 42) / 50, 0, 1) * (_YS > 41)
    sujo += np.clip((_YS - 100) / 24, 0, 1) * 0.5 * ruido(58, 6)
    sujo *= (_XS < PAL_X0)
    c.c[:, :, :3] *= (1 - np.clip(sujo, 0, 1) * 0.4)[:, :, None]
    # Musgo no pé e nas juntas de baixo.
    mus = ruido(59, 4)
    m_mus = (mus > 0.66) & (_YS > 104) & (_YS < MURO_Y) & (c.c[:, :, 3] > 0) & (_XS < PAL_X0)
    c.mascara(m_mus.astype(np.float32), mistura(HERA[3], PEDRA_M[3], 0.35), 0.55)
    # Fuligem acima da tocha.
    tx, ty = TOCHA
    fu = np.exp(-(((_XS - tx) / 4.5) ** 2 + ((_YS - (ty - 12)) / 13) ** 2))
    c.c[:, :, :3] *= (1 - fu * 0.55)[:, :, None]
    # Hera: sobe do pé da torre, do pano e da quina; cai de cima do adarve.
    for (hx, hy, comp, sd, sobe, der) in ((96, 123, 70, 1, -1, 0.1), (104, 123, 52, 2, -1, -0.15), (90, 122, 40, 3, -1, 0.3),
                                          (150, 42, 22, 4, 1, 0.05), (158, 42, 30, 5, 1, -0.05), (166, 42, 16, 6, 1, 0.1),
                                          (204, 123, 46, 7, -1, 0.12), (2, 123, 60, 8, -1, 0.2), (12, 122, 30, 9, -1, -0.1),
                                          (186, 42, 12, 10, 1, 0.0)):
        hera(c, hx, hy, comp, 900 + sd, sobe, der)
    # Tocha: suporte de ferro chumbado, cabo de madeira inclinado, ponta de pano com piche (a chama vai no emissivo).
    c.ret(tx - 1, ty + 17, 4, 3, FERRO[3])
    c.p(tx - 1, ty + 17, FERRO[5])
    c.p(tx + 2, ty + 19, FERRO[1])
    c.linha(tx + 1, ty + 18, tx + 1, ty + 13, FERRO[4])
    c.ret(tx - 1, ty + 12, 5, 2, FERRO[3])
    c.ret(tx - 1, ty + 12, 5, 1, FERRO[5])
    for k in range(13):
        yy = ty + 20 - k
        xx = tx + (k * 0.12)
        c.p(xx, yy, MADEIRA[5])
        c.p(xx + 1, yy, MADEIRA[3])
    for y in range(int(ty) + 4, int(ty) + 8):
        for x in range(int(tx) - 1, int(tx) + 3):
            c.p(x, y, "#1a120c" if (x + y) % 2 else "#2e2014")
    c.p(tx + 2, ty + 5, "#4a3420")
    chama(e, tx + 0.8, ty + 5, 6.5, 13, 3)
    # Estandarte no contraforte: varão com ponteiras, pano esmeralda em pregas, ramo dourado bordado, rabo de andorinha.
    bx0, bx1, by0, by1 = 210, 229, 34, 84
    c.ret(bx0 - 2, by0 - 2, bx1 - bx0 + 4, 2, MADEIRA[5])
    c.ret(bx0 - 2, by0 - 1, bx1 - bx0 + 4, 1, MADEIRA[2])
    for (px_, cor) in ((bx0 - 3, OURO[4]), (bx1 + 1, OURO[4])):
        c.ret(px_, by0 - 3, 2, 3, cor)
        c.p(px_, by0 - 3, OURO[6])
    c.linha(bx0 + 1, by0 - 2, (bx0 + bx1) / 2, by0 - 8, CORDA[2])
    c.linha(bx1 - 1, by0 - 2, (bx0 + bx1) / 2, by0 - 8, CORDA[2])
    c.ret((bx0 + bx1) / 2 - 1, by0 - 9, 3, 2, FERRO[4])
    trama = ruido(71, 2)
    for y in range(by0, by1 + 8):
        for x in range(bx0, bx1):
            u = (x - bx0) / (bx1 - bx0 - 1)
            # rabo de andorinha: duas pontas embaixo
            corte = by1 + 7 - (1 - abs(u - 0.5) * 2) * 9
            if y > corte:
                continue
            prega = math.sin(u * math.pi * 3.0 + 0.4)   # três pregas verticais
            k = 0.5 + prega * 0.22 + u * 0.12 + (trama[y, x] - 0.5) * 0.12 - (y - by0) / 200
            if x in (bx0, bx1 - 1):
                k = 0.18
            cor = tons_idx(ESMERALDA, k)
            # barra dourada em cima e embaixo
            if y in (by0 + 2, by0 + 3) or abs(y - (corte - 2)) < 0.8:
                cor = tons_idx(OURO, 0.45 + prega * 0.2)
            c.p(x, y, cor)
    # franja dourada no corte
    for x in range(bx0, bx1):
        u = (x - bx0) / (bx1 - bx0 - 1)
        corte = by1 + 7 - (1 - abs(u - 0.5) * 2) * 9
        if x % 2 == 0:
            c.p(x, corte + 1, OURO[3])
            c.p(x, corte + 2, OURO[1], 0.8)
    # o ramo dourado bordado: caule curvo e folhas em pares, sem nenhuma letra
    rx0, ry0 = 214.0, 74.0
    caule = [(rx0 + s * 0.42 + math.sin(s * 0.16) * 1.2, ry0 - s) for s in range(30)]
    for (x, y) in caule:
        c.p(x, y, OURO[3])
        c.p(x + 1, y, OURO[1], 0.6)
    for j, s in enumerate(range(3, 29, 4)):
        x, y = caule[s]
        for lado in (-1, 1):
            if j == 6 and lado == -1:
                continue
            fx = x + lado * 2.4
            fy = y - 0.6
            for (dx, dy, kk) in ((0, 0, 4), (lado, -1, 5), (lado * 2, -1, 4), (lado, 0, 3), (lado * 2, -2, 6)):
                c.p(fx + dx, fy + dy, OURO[kk])
    c.p(caule[-1][0], caule[-1][1] - 1, OURO[6])
    c.p(caule[-1][0] + 1, caule[-1][1] - 2, OURO[5])
    # sombra do estandarte na pedra (à esquerda)
    c.mascara(((_XS >= bx0 - 2) & (_XS < bx0) & (_YS > by0) & (_YS < by1 + 4) & (c.c[:, :, 3] > 0)).astype(np.float32), "#000000", 0.35)
    return c, e, lat


# ─────────────────────────────── A paliçada ───────────────────────────────
def palicada() -> tuple[Camada, np.ndarray, list]:
    """Troncos apontados lado a lado (casca, ponta talhada clara), duas travessas amarradas com corda e frestas.
    Devolve (camada, linha do topo por coluna, flechas cravadas)."""
    c = Camada()
    topo_x = np.full(W, FUNDO_Y, dtype=np.float32)
    g = np.random.default_rng(77)
    veio = ruido(78, 1, 6)
    x = PAL_X0
    i = 0
    while x < W:
        w = int(4 + g.random() * 3.2)
        if 320 <= x <= 326:                      # um tronco caído: a fresta larga
            x += 7
            i += 1
            continue
        t = 73 + g.random() * 7 + 2.5 * math.sin(i * 1.7)
        if 400 < x < 470:
            t += 4                               # mais baixos onde o sol se põe
        ponta = 5 + int(g.random() * 2)
        inclina = (g.random() - 0.5) * 0.04
        quebrado = (i % 17 == 9)
        if quebrado:
            t += 9
        for y in range(int(t), FUNDO_Y):
            prof = y - t
            xc = x + w / 2 + inclina * (FUNDO_Y - y)
            if prof < ponta and not quebrado:
                f = (prof + 1) / ponta
                xa, xb = xc - w / 2 * f + (0.8 if i % 2 else -0.8) * (1 - f), xc + w / 2 * f
            else:
                xa, xb = xc - w / 2, xc + w / 2
            for xx in range(int(round(xa)), int(round(xb))):
                if xx >= W:
                    continue
                u = (xx + 0.5 - xc) / (w / 2)
                if prof < ponta and not quebrado:
                    k = 0.55 + u * 0.3 + (veio[y, xx] - 0.5) * 0.2
                    cor = tons_idx(LENHO, k)
                    if prof == 0:
                        cor = LENHO[5]
                elif quebrado and prof < 2:
                    cor = tons_idx(LENHO, 0.5 + (hash01(xx, 3) - 0.5) * 0.6)
                else:
                    k = 0.42 + u * 0.36 - abs(u) ** 5 * 0.35 + (veio[y, (xx * 3 + i * 11) % W] - 0.5) * 0.55
                    k += (hash01(i, 21) - 0.5) * 0.14
                    if prof < ponta + 2 and not quebrado:
                        k += 0.1   # borda da casca recém-cortada
                    cor = tons_idx(CASCA, k)
                    if hash01(xx, y, i) < 0.03:
                        cor = CASCA[0]
                c.p(xx, y, cor)
            topo_x[int(round(xa)):int(round(xb))] = np.minimum(topo_x[int(round(xa)):int(round(xb))], t)
        # nó na madeira
        if g.random() < 0.4:
            ny = int(t + 12 + g.random() * 20)
            c.p(x + w // 2, ny, CASCA[0])
            c.p(x + w // 2 + 1, ny, CASCA[4])
        gap = 0 if g.random() < 0.4 else 1 if g.random() < 0.55 else 2
        x += w + gap
        i += 1
    # Travessas na frente (troncos finos) com amarras de corda.
    for (ty, esp) in ((88, 3), (107, 3)):
        for x in range(PAL_X0 - 1, W):
            yy = ty + int(round(0.6 * math.sin(x / 31.0)))
            for k in range(esp):
                c.p(x, yy + k, tons_idx(CASCA, (0.75, 0.5, 0.2)[k] + (veio[yy, x] - 0.5) * 0.3))
        for x in range(PAL_X0 + 4, W, 17):
            yy = ty + int(round(0.6 * math.sin(x / 31.0)))
            for k in range(-1, esp + 1):
                c.p(x, yy + k, CORDA[3] if k % 2 else CORDA[2])
                c.p(x + 1, yy + k, CORDA[1])
                c.p(x + 2, yy + k + 1, CORDA[0], 0.6)
    # Flechas perdidas cravadas na paliçada (as que erraram), atrás do alvo e perto dele.
    flechas = [(436, 96, 1), (446, 112, -1), (372, 99, 1)]
    for (fx, fy, lado) in flechas:
        c.linha(fx, fy, fx - 6, fy + 3 * lado * 0 + 2, MADEIRA[6])
        c.p(fx - 6, fy + 2, "#e8e2d4")
        c.p(fx - 7, fy + 2, "#d0c8b8")
        c.p(fx - 6, fy + 1, "#f6f2e8")
        c.p(fx, fy, FERRO[2])
    # Corda enrolada pendurada num tronco.
    for k in range(18):
        a = k / 18 * math.tau
        c.p(286 + math.cos(a) * 4, 96 + math.sin(a) * 5, CORDA[3] if math.cos(a) > 0 else CORDA[1])
        c.p(286 + math.cos(a) * 3, 96 + math.sin(a) * 4, CORDA[2])
    c.ret(285, 89, 2, 3, FERRO[4])
    # Pé da paliçada: terra jogada e capim.
    for x in range(PAL_X0, W, 3):
        if hash01(x, 81) < 0.55:
            tufo(c, x, FUNDO_Y - 1, 3, 800 + x, alto=4 + hash01(x, 82) * 4, seco=0.25)
    for x in range(PAL_X0, W):
        if c.c[FUNDO_Y - 1, x, 3] > 0 and hash01(x, 83) < 0.6:
            c.p(x, FUNDO_Y - 1, TERRA[3])
    return c, topo_x, flechas


# ─────────────────────────────── O chão ───────────────────────────────
def y_chao(x: float) -> float:
    if x < MURO_X1:
        return MURO_Y
    if x < PAL_X0:
        return MURO_Y - 6 * (x - MURO_X1) / (PAL_X0 - MURO_X1)
    return FUNDO_Y


def pintar_chao() -> Camada:
    """Terra batida em perspectiva: manchas, pedriscos, capim nas bordas, o anel gasto em volta do boneco e as pegadas."""
    c = Camada()
    topo = np.array([y_chao(x) for x in range(W)], dtype=np.float32)
    chao = _YS >= topo[None, :]
    prof = np.clip((_YS - 112) / 48, 0, 1)                   # 0 no fundo, 1 na frente
    n_f = ruido(91, 2, 1)
    n_m = ruido(92, 7, 3)
    n_g = ruido(93, 22, 8)
    k = 0.5 + (n_m - 0.5) * 0.45 + (n_g - 0.5) * 0.4 + (n_f - 0.5) * 0.18 * (0.4 + prof)
    k -= np.clip(1 - (_YS - topo[None, :]) / 6, 0, 1) * 0.18      # pé dos muros mais úmido e escuro
    # trilhas gastas mais claras: anel do boneco, do banco ao suporte, da linha de tiro até o alvo
    anel = np.exp(-((np.hypot((_XS - 298) / 30, (_YS - 147) / 8) - 1) / 0.25) ** 2)
    trilha = np.exp(-((_YS - (150 - (_XS - 160) * 0.06)) / 4) ** 2) * suave(150, 200, _XS) * (1 - suave(290, 330, _XS))
    k += anel * 0.16 + trilha * 0.1
    k -= np.clip(1 - np.hypot((_XS - 298) / 9, (_YS - 147) / 3), 0, 1) * 0.1
    cor = tons_arr(TERRA, np.clip(k, 0, 1), pont=0.55)
    c.mascara(chao.astype(np.float32), cor)
    g = np.random.default_rng(94)
    livre = lambda x, y: GATO[0] - 2 <= x <= GATO[1] + 2 and y > 134
    # pedriscos com luz em cima
    for _ in range(240):
        x, y = g.random() * W, FUNDO_Y + 1 + g.random() * (H - FUNDO_Y)
        if y < y_chao(x) + 1 or (livre(x, y) and g.random() < 0.85):
            continue
        tam = 1 if g.random() < 0.8 or livre(x, y) else 2
        base = 0.25 + g.random() * 0.35
        c.p(x, y, tons_idx(PEDRA_M, base + 0.25))
        if tam == 2:
            c.p(x + 1, y, tons_idx(PEDRA_M, base + 0.2))
            c.p(x, y + 1, tons_idx(PEDRA_M, base - 0.1))
            c.p(x + 1, y + 1, tons_idx(TERRA, 0.15))
        else:
            c.p(x, y + 1, tons_idx(TERRA, 0.2), 0.7)
    # pegadas: pares de solas (calcanhar e planta), afundadas: borda de baixo clara, de cima escura
    def pegada(x, y, ang, esc=1.0):
        ca, sa = math.cos(ang), math.sin(ang)
        for (px_, py_, pr) in ((0, 0, 1.0), (2.2, 0, 1.2)):
            X = x + (px_ * ca) * esc
            Y = y + (px_ * sa) * esc * 0.35
            c.p(X, Y, TERRA[0])
            c.p(X + 1, Y, TERRA[1])
            c.p(X, Y + 1, TERRA[6], 0.9)
            if pr > 1:
                c.p(X + 1, Y + 1, TERRA[5], 0.7)
    for j in range(16):   # volta em torno do boneco
        a = j / 16 * math.tau + 0.2
        x = 298 + math.cos(a) * 24 + (j % 2) * 2
        y = 147 + math.sin(a) * 7 + (j % 2)
        if not livre(x, y):
            pegada(x, y, a + math.pi / 2)
    for j in range(9):    # do banco até o boneco
        x = 196 + j * 9.5
        y = 148 + (j % 2) * 3 - j * 0.3
        pegada(x, y, 0.1)
    for j in range(6):    # do suporte de armas
        x = 246 + j * 5 + (j % 2)
        y = 132 + j * 2.4
        pegada(x, y, 0.9)
    for j in range(5):    # rumo ao alvo, passando por trás do gato
        x = 392 + j * 7 + (j % 2)
        y = 145 + (j % 2) * 2
        pegada(x, y, 0.0)
    # sulcos de pé arrastado (golpes) e areia espalhada perto do boneco
    for (x0, y0, x1, y1) in ((270, 150, 282, 152), (312, 151, 324, 149), (276, 141, 268, 139), (318, 142, 326, 144)):
        c.linha(x0, y0, x1, y1, TERRA[1], 0.8)
        c.linha(x0, y0 + 1, x1, y1 + 1, TERRA[6], 0.6)
    # capim nas bordas: pé da muralha, cantos, frente esquerda e direita (fora da faixa do gato)
    for x in range(0, MURO_X1, 2):
        if hash01(x, 95) < 0.5:
            tufo(c, x, MURO_Y + 1, 3, 1000 + x, alto=3 + hash01(x, 96) * 5, seco=0.2)
    for (x, y, n, a) in ((150, 158, 6, 7), (228, 157, 5, 6), (262, 159, 7, 8), (420, 158, 5, 6), (470, 157, 7, 9),
                         (402, 150, 3, 4), (232, 140, 4, 5), (318, 156, 4, 5), (440, 150, 4, 5), (14, 150, 6, 7), (90, 156, 5, 6)):
        tufo(c, x, y, n, 1200 + x, alto=a, seco=0.3)
    # flores miúdas no pé da paliçada e da muralha
    for _ in range(26):
        x = g.random() * W
        y = y_chao(x) + 1 + g.random() * 3
        c.p(x, y, ["#e8d070", "#f0f0e0", "#c8a0d0", "#e89060"][int(g.random() * 4)])
    return c


# ─────────────────────────────── Objetos ───────────────────────────────
class Objetos:
    """Os objetos do pátio numa camada, guardando a linha do chão (base) e o número de cada um (para as sombras)."""

    def __init__(self) -> None:
        self.cam = Camada()
        self.base = np.full((H, W), -1, dtype=np.float32)
        self.ids = np.zeros((H, W), dtype=np.int32)
        self.n = 10

    def add(self, base: float, fn, *args) -> Camada:
        t = Camada()
        fn(t, *args)
        self.cam.juntar(t)
        m = t.c[:, :, 3] > 0.4
        self.base[m] = base
        self.ids[m] = self.n
        self.n += 1
        return t


def tora_vertical(c: Camada, x0: float, x1: float, y0: float, y1: float, tons=MADEIRA, k0: float = 0.5, seed: int = 0) -> None:
    """Peça de madeira de pé (poste): lado direito aceso, veio vertical, aresta escura à esquerda."""
    w = x1 - x0
    for y in range(int(y0), int(y1)):
        for x in range(int(x0), int(x1)):
            u = (x + 0.5 - x0) / w
            k = k0 - 0.25 + u * 0.5 + (hash01(x * 3 + seed, y // 3, 5) - 0.5) * 0.14
            if u < 1 / w + 0.01:
                k -= 0.22
            c.p(x, y, tons_idx(tons, k))


def tabua_horizontal(c: Camada, x0, x1, y, esp, tons=MADEIRA, k0: float = 0.5, seed: int = 0) -> None:
    for x in range(int(x0), int(x1)):
        for k in range(esp):
            kk = k0 + (0.28 if k == 0 else -0.25 if k == esp - 1 else 0) + (hash01(x // 4 + seed, k, 9) - 0.5) * 0.12
            c.p(x, y + k, tons_idx(tons, kk))
    c.p(x0, y, tons[min(len(tons) - 1, 6)])
    c.p(x1 - 1, y + esp - 1, tons[1])


def fardo(c: Camada, x0, x1, y0, y1, seed: int, topo: int = 3) -> None:
    """Fardo de feno: palha em fios horizontais, face de cima mais clara, dois arames de barbante."""
    n = ruido(seed, 3, 1)
    for y in range(y0, y1):
        for x in range(x0, x1):
            u = (x - x0) / (x1 - x0)
            k = 0.36 + u * 0.16 + (n[y, x] - 0.5) * 0.5 + (0.2 if y < y0 + topo else 0) - (0.12 if y == y0 + topo else 0)
            if x in (x0, x1 - 1):
                k -= 0.18
            if y == y1 - 1:
                k -= 0.22
            if hash01(x, y, seed) < 0.06:
                k += 0.25
            c.p(x, y, tons_idx(PALHA, k))
    for bx in (x0 + (x1 - x0) // 4, x0 + 3 * (x1 - x0) // 4):
        for y in range(y0, y1):
            c.p(bx, y, CORDA[1] if y > y0 + topo else CORDA[3])
    # fiapos soltos
    g = np.random.default_rng(seed)
    for _ in range(int((x1 - x0) * 0.6)):
        x = x0 + g.random() * (x1 - x0)
        c.p(x, y0 - 1, PALHA[5], 0.8)
        if g.random() < 0.4:
            c.p(x + 1, y0 - 2, PALHA[6], 0.6)


def props_esquerda(c: Camada) -> None:
    """Junto à muralha (área calma): fardos empilhados e o barril com bastões de treino."""
    fardo(c, 6, 32, 124, 136, 401)
    fardo(c, 30, 54, 126, 137, 402)
    fardo(c, 14, 40, 113, 124, 403)
    # barril de aduelas com aros de ferro e bastões de pé
    bx, yb = 76.0, 134
    for y in range(yb - 17, yb):
        t = (y - yb + 17) / 17
        meia = 7.5 + 1.4 * math.sin(t * math.pi)
        for x in range(int(bx - meia), int(bx + meia) + 1):
            u = (x + 0.5 - bx) / meia
            k = 0.5 + u * 0.32 - abs(u) ** 4 * 0.3 + (0.08 if (x - int(bx - meia)) % 3 == 0 else 0)
            cor = tons_idx(MADEIRA, k)
            if int(t * 17) in (2, 3, 13, 14):
                cor = tons_idx(FERRO, 0.4 + u * 0.4)
            c.p(x, y, cor)
    for (dx, h, inc) in ((-4, 26, -0.08), (-1, 30, 0.02), (2, 24, 0.12), (5, 28, 0.2)):
        for s in range(h):
            x = bx + dx + inc * s
            y = yb - 15 - s
            c.p(x, y, tons_idx(MADEIRA, 0.75))
            c.p(x + 1, y, tons_idx(MADEIRA, 0.45))
        c.p(bx + dx + inc * h, yb - 15 - h, MADEIRA[7])
    c.elipse(bx, yb - 17, 7.5, 1.6, MADEIRA[1])


def sacos_de_areia(c: Camada) -> None:
    """Pórtico de madeira (dois postes e a trave) com dois sacos de estopa pendurados por cordas."""
    tora_vertical(c, 101, 104, 70, 133, k0=0.45, seed=1)
    tora_vertical(c, 138, 141, 70, 133, k0=0.45, seed=2)
    tabua_horizontal(c, 97, 145, 67, 4, k0=0.55, seed=3)
    for (x, y) in ((104, 74), (137, 74)):   # mãos-francesas
        for k in range(6):
            c.p(x + (k if x < 120 else -k), y - k * 0.9 + 0, MADEIRA[4])
    trama = ruido(121, 1, 2)

    def saco(cx, y0, y1, rx, inc, seed):
        for y in range(int(y0), int(y1)):
            t = (y - y0) / (y1 - y0)
            meia = rx * (0.55 + 0.45 * math.sin(min(1, t * 1.25) * math.pi * 0.62 + 0.25)) * (1 - max(0, t - 0.85) * 2.2)
            xc = cx + inc * (y - y0)
            for x in range(int(xc - meia), int(xc + meia) + 1):
                u = (x + 0.5 - xc) / max(meia, 1)
                if abs(u) > 1:
                    continue
                k = 0.5 + u * 0.3 - abs(u) ** 3 * 0.3 + (trama[y, x] - 0.5) * 0.3 - t * 0.1
                if (x + y) % 2 == 0:
                    k += 0.05
                c.p(x, y, tons_idx(ESTOPA, k))
        # boca amarrada, costura vertical e um remendo
        c.ret(cx - 2 + inc * 2, y0 - 2, 5, 2, ESTOPA[4])
        c.ret(cx - 3 + inc * 3, y0 + 1, 7, 1, CORDA[2])
        for y in range(int(y0) + 4, int(y1) - 3, 2):
            c.p(cx + 2 + inc * (y - y0), y, ESTOPA[1])
        c.ret(cx - 4 + inc * 12, y0 + 10, 4, 4, ESTOPA[3])
        c.p(cx - 4 + inc * 12, y0 + 10, ESTOPA[5])
        for k in range(4):
            c.p(cx - 4 + inc * 12 + k, y0 + 9, LINHO[2], 0.7 if k % 2 else 0)
    c.linha(114, 71, 114, 84, CORDA[2])
    c.linha(115, 71, 115, 84, CORDA[1])
    saco(114.5, 85, 113, 6.5, 0.0, 1)
    c.linha(129, 71, 130, 80, CORDA[2])
    saco(130.0, 81, 104, 5.5, 0.08, 2)
    for x in range(108, 122):   # areia vazada no chão
        c.p(x, 131 + (x % 3 == 0), TERRA[6], 0.6)


def banco(c: Camada) -> None:
    """Banco de tábua com a tala acolchoada, o rolo de atadura de linho e a toalha listrada caída na ponta."""
    # pernas abertas e travessa
    for (x, d) in ((150, -1), (154, 1), (188, -1), (192, 1)):
        for k in range(10):
            c.p(x + d * k * 0.18, 133 + k, MADEIRA[4] if d > 0 else MADEIRA[2])
            c.p(x + 1 + d * k * 0.18, 133 + k, MADEIRA[3])
    tabua_horizontal(c, 151, 192, 137, 2, k0=0.35, seed=5)
    tabua_horizontal(c, 146, 198, 130, 3, k0=0.55, seed=6)
    for x in range(146, 198):       # topo do assento com veio
        if hash01(x, 11) < 0.12:
            c.p(x, 130, MADEIRA[7])
    # tala: tábua fina com o forro de feltro e a amarração
    c.ret(152, 128, 15, 2, LENHO[3])
    c.ret(152, 128, 15, 1, LENHO[5])
    c.ret(154, 127, 11, 1, "#c8b8a0")
    c.p(158, 128, CORDA[1])
    c.p(163, 128, CORDA[1])
    # rolo de atadura (linho): cilindro deitado com a ponta em espiral e a ponta solta descendo
    for y in range(125, 130):
        for x in range(170, 178):
            k = 0.62 - (y - 127) * 0.12 + (0.1 if (x + y) % 3 == 0 else 0)
            c.p(x, y, tons_idx(LINHO, k))
    for (dx, dy, kk) in ((0, 0, 3), (0, 1, 2), (0, 2, 2), (0, 3, 1), (-1, 1, 3), (-1, 2, 2)):
        c.p(169 + dx, 125 + dy, LINHO[kk])
    c.p(169, 127, LINHO[0])
    for k in range(6):
        c.p(178 + k, 129 + k * 0.4, LINHO[4] if k % 2 else LINHO[3])
    # toalha dobrada sobre a ponta direita: um pedaço no assento e o resto caindo pela frente em pregas, com a
    # barra listrada de esmeralda e a franja; sombra da beirada do assento logo abaixo dela
    for y in range(127, 130):
        for x in range(183, 196):
            c.p(x, y, tons_idx(LINHO, 0.72 + (0.12 if y == 127 else 0) - (x - 183) * 0.01))
    for y in range(130, 142):
        t = (y - 130) / 11
        x0 = 183 - t * 1.5
        x1 = 196 + t * 1.2
        for x in range(int(x0), int(x1) + 1):
            u = (x - x0) / (x1 - x0)
            prega = math.sin(u * math.pi * 3.2 + 0.5)
            fundo = 141 + round(math.sin(u * math.pi * 3.2 + 0.5) * 1.2)
            if y > fundo:
                continue
            k = 0.55 + prega * 0.2 - t * 0.12 + (0.08 if u > 0.6 else 0)
            if y == 130:
                k -= 0.3                                  # sombra da beirada
            cor = tons_idx(LINHO, k)
            if 135 <= y <= 136:
                cor = tons_idx(ESMERALDA, 0.5 + prega * 0.25)
            if y == fundo and x % 2:
                cor = LINHO[1]
            c.p(x, y, cor)
        if y > 132:
            c.p(int(x0), y, LINHO[0])
    for x in range(182, 199, 2):
        c.p(x, 142 + round(math.sin((x - 182) / 15 * math.pi * 3.2 + 0.5) * 1.2), LINHO[2], 0.8)
    # balde de aduelas no chão, com água e a concha encostada
    bx, yb = 206.0, 144
    for y in range(yb - 10, yb):
        t = (y - yb + 10) / 10
        meia = 5.2 - t * 0.9
        for x in range(int(bx - meia), int(bx + meia) + 1):
            u = (x + 0.5 - bx) / meia
            k = 0.5 + u * 0.3 + (0.1 if (x - int(bx - meia)) % 2 == 0 else -0.04)
            cor = tons_idx(MADEIRA, k)
            if int(t * 10) in (1, 7):
                cor = tons_idx(FERRO, 0.45 + u * 0.35)
            c.p(x, y, cor)
    c.elipse(bx, yb - 10, 5.4, 1.5, MADEIRA[2])
    c.elipse(bx, yb - 10, 4.2, 1.0, "#2a4a5a")
    c.p(bx + 2, yb - 10, "#a8d0e0")
    for k in range(9):   # alça de corda
        a = k / 8 * math.pi
        c.p(bx - math.cos(a) * 5, yb - 11 - math.sin(a) * 4, CORDA[3] if k < 5 else CORDA[2])
    c.linha(bx + 2, yb - 10, bx + 6, yb - 19, MADEIRA[5])
    c.ret(bx + 5, yb - 21, 3, 2, MADEIRA[4])


def suporte_armas(c: Camada) -> None:
    """Suporte de armas: montantes com chapéu, trave de cima com encaixes, travessa de baixo, espadas de treino de
    madeira encostadas e inclinadas (guarda redonda: nada forma cruz), uma lança e um elmo pendurado."""
    tora_vertical(c, 236, 239, 92, 131, k0=0.52, seed=7)
    tora_vertical(c, 264, 267, 92, 131, k0=0.52, seed=8)
    for x0 in (236, 264):
        c.ret(x0 - 1, 90, 5, 2, MADEIRA[5])
        c.ret(x0 - 1, 90, 5, 1, MADEIRA[7])
        c.ret(x0 - 1, 129, 5, 2, MADEIRA[3])
        c.p(x0 - 1, 129, MADEIRA[6])
    tabua_horizontal(c, 233, 271, 95, 3, k0=0.62, seed=9)
    for x in range(242, 263, 6):          # encaixes da trave
        c.p(x, 95, MADEIRA[1])
        c.p(x + 1, 95, MADEIRA[1])
    tabua_horizontal(c, 236, 267, 121, 3, k0=0.5, seed=10)

    def espada(xb, yb, xt, yt):
        n = int(math.hypot(xt - xb, yt - yb))
        for s in range(n + 1):
            t = s / n
            x, y = xb + (xt - xb) * t, yb + (yt - yb) * t
            if t < 0.7:      # lâmina de madeira: dois pixels, aresta clara, contorno escuro
                c.p(x - 1, y, MADEIRA[1])
                c.p(x, y, LENHO[5] if s % 6 else LENHO[4])
                c.p(x + 1, y, LENHO[3])
                c.p(x + 2, y, MADEIRA[1])
            elif t < 0.76:   # guarda redonda de couro (disco de lado: oval curta e escura)
                for d in (-1, 0, 1, 2):
                    c.p(x + d, y, "#3a2214" if d in (-1, 2) else "#6a4028")
                c.p(x, y - 1, "#8a5434")
            else:            # cabo com tiras de couro
                c.p(x, y, "#5a3420" if s % 2 else "#7a4a2c")
                c.p(x + 1, y, "#3a2010")
        c.elipse(xt + 0.6, yt - 0.5, 1.4, 1.4, FERRO[4])
        c.p(xt, yt - 1, FERRO[6])
    # lança encostada atrás, passando bem acima da trave
    for s in range(56):
        x, y = 262 - s * 0.36, 131 - s
        c.p(x, y, MADEIRA[6] if s % 7 else MADEIRA[4])
        c.p(x + 1, y, MADEIRA[3])
    for k in range(5):
        c.p(262 - 56 * 0.36 - k * 0.3, 75 - k, FERRO[6] if k < 2 else FERRO[4])
        c.p(262 - 56 * 0.36 - k * 0.3 + 1, 75 - k, FERRO[3])
    espada(243, 129, 247, 86)
    espada(250, 129, 252, 84)
    espada(258, 129, 256, 87)
    # elmo de ferro pendurado no montante da direita
    for y in range(83, 90):
        for x in range(232, 243):
            dx, dy = (x + 0.5 - 237.5) / 5.2, (y + 0.5 - 89.5) / 6.4
            if dx * dx + dy * dy <= 1:
                c.p(x, y, tons_idx(FERRO, 0.5 + dx * 0.32 - dy * 0.25))
    c.ret(232, 89, 11, 1, FERRO[2])
    c.ret(232, 89, 11, 1, FERRO[4], 0.5)
    c.p(239, 84, FERRO[6])
    c.p(240, 85, FERRO[6])
    c.ret(237, 82, 1, 1, FERRO[5])


def escudos(c: Camada) -> None:
    """Dois escudos redondos encostados no pé do suporte: tábuas, aro de ferro rebitado, umbo; um com o campo
    esmeralda e a faixa dourada em anel, o outro de madeira crua com marcas de golpes."""
    def escudo(cx, cy, r, pintado, seed):
        n = ruido(seed, 2)
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                dx, dy = x + 0.5 - cx, (y + 0.5 - cy) * 1.08
                d = math.hypot(dx, dy)
                if d > r:
                    continue
                luz = (dx * 0.5 - dy * 0.6) / r                  # convexo: luz de cima à direita
                if d > r - 1.5:
                    ang = math.atan2(dy, dx)
                    cor = tons_idx(FERRO, 0.5 + luz * 0.5)
                    if int((ang + math.pi) / math.tau * 14) % 2 == 0 and d > r - 0.9:
                        cor = FERRO[6] if luz > -0.2 else FERRO[4]   # rebites
                elif d < 2.6:
                    cor = tons_idx(FERRO, 0.72 + luz * 0.4)
                    if d < 1.2 and luz > -0.3:
                        cor = FERRO[6]
                else:
                    tab = int((dx + r) // 3.4)
                    k = 0.55 + luz * 0.3 + (hash01(tab, seed) - 0.5) * 0.18 + (n[y, x] - 0.5) * 0.18
                    if (dx + r) % 3.4 < 0.7:
                        k -= 0.32
                    if pintado:
                        if r * 0.52 < d < r * 0.68:
                            cor = tons_idx(OURO, k)
                        else:
                            cor = tons_idx(ESMERALDA, k + 0.1)
                        if n[y, x] > 0.74:
                            cor = tons_idx(LENHO, k)                 # tinta descascada
                    else:
                        cor = tons_idx(MADEIRA, k + 0.05)
                    if hash01(x, y, seed + 2) < 0.05:
                        cor = mistura(cor, "#000000", 0.45)       # marca de golpe
                c.p(x, y, cor)
    escudo(245.0, 121.0, 9.5, True, 131)
    c.ret(268, 104, 2, 2, FERRO[4])
    escudo(270.0, 113.0, 7.5, False, 132)


CRU = ["#3e382e", "#575044", "#71695a", "#8b8270", "#a39a86", "#b9b09a", "#cdc5b0", "#ded8c6"]   # lona/linho cru
COURO = ["#1e120a", "#34200f", "#4e3018", "#6a4424", "#875a32", "#a37244"]


def boneco(c: Camada) -> None:
    """Boneco de treino: toco, poste, tronco de lona crua estofado (tiras de couro com fivela, remendos costurados,
    rasgos com a palha aparecendo), cabeça de saco de lona amarrada no pescoço e dois braços de madeira presos por
    ferragens, inclinados para baixo (nada em cruz)."""
    cx = 298.0
    for y in range(139, 148):                       # toco de base com anéis no topo
        for x in range(288, 309):
            u = (x + 0.5 - cx) / 10.5
            if abs(u) > 1:
                continue
            if y < 142:
                if ((x + 0.5 - cx) / 10.5) ** 2 + ((y + 0.5 - 141) / 2.2) ** 2 > 1:
                    continue
                r = math.hypot((x + 0.5 - cx) / 10.5, (y + 0.5 - 141) / 2.2)
                c.p(x, y, LENHO[3] if int(r * 5) % 2 else LENHO[2])
            else:
                k = 0.45 + u * 0.35 - abs(u) ** 5 * 0.3 + (hash01(x, y // 2, 61) - 0.5) * 0.2
                c.p(x, y, tons_idx(CASCA, k))
    tora_vertical(c, 296.5, 299.5, 98, 141, k0=0.5, seed=11)
    trama = ruido(141, 1, 1)
    # braços de madeira (atrás do tronco nas pontas de cima): saem dos ombros e descem, um mais aberto
    def braco(xa, ya, xb, yb, esp):
        comp = math.hypot(xb - xa, yb - ya)
        ux, uy = (xb - xa) / comp, (yb - ya) / comp
        nx, ny = -uy, ux
        if nx > 0:
            nx, ny = -nx, -ny
        for yy in range(int(min(ya, yb)) - 3, int(max(ya, yb)) + 4):
            for xx in range(int(min(xa, xb)) - 3, int(max(xa, xb)) + 4):
                px_, py_ = xx + 0.5 - xa, yy + 0.5 - ya
                t = (px_ * ux + py_ * uy) / comp
                d = px_ * nx + py_ * ny
                if t < 0 or t > 1 or abs(d) > esp / 2:
                    continue
                v = d / (esp / 2)
                k = 0.5 + v * 0.3 + (hash01(int(t * comp / 2), 3, 77) - 0.5) * 0.12
                if v < -0.6:
                    k -= 0.22
                c.p(xx, yy, tons_idx(MADEIRA, k))
        ex, ey = xb, yb                              # ponta enrolada em couro e o corte claro
        for e in np.linspace(-esp / 2, esp / 2, 5):
            c.p(ex - ux * 2 + nx * e, ey - uy * 2 + ny * e, COURO[3] if e > 0 else COURO[1])
            c.p(ex - ux * 3 + nx * e, ey - uy * 3 + ny * e, COURO[2])
        c.p(ex + ux * 0.5, ey + uy * 0.5, LENHO[4])
    braco(291, 108, 279, 125, 3.2)
    braco(305, 108, 315, 123, 3.2)
    # tronco estofado de lona crua
    y0, y1 = 103, 133
    corpo = {}
    for y in range(y0, y1):
        t = (y - y0) / (y1 - y0)
        meia = 8.5 + 2.2 * math.sin(t * math.pi) - (1.4 if t < 0.1 else 0)
        corpo[y] = meia
        for x in range(int(cx - meia), int(cx + meia) + 1):
            u = (x + 0.5 - cx) / meia
            if abs(u) > 1:
                continue
            k = 0.44 + u * 0.3 - abs(u) ** 4 * 0.32 + (trama[y, x] - 0.5) * 0.12
            k += 0.03 if y % 2 == 0 else 0
            k -= 0.1 * max(0.0, math.sin(t * math.pi * 5 + 0.6)) * (1 - abs(u))   # estofo em gomos
            c.p(x, y, tons_idx(CRU, k))
        c.p(cx - meia, y, CRU[0])
        c.p(cx + meia, y, CRU[3])
    # costura vertical do pano (lateral esquerda)
    for y in range(y0 + 2, y1 - 1, 2):
        c.p(cx - 4 - math.sin((y - y0) / 30 * math.pi), y, CRU[2])
    # remendo de pano escuro com pontos claros
    rx0, ry0, rw, rh = 289, 112, 7, 6
    for y in range(ry0, ry0 + rh):
        for x in range(rx0, rx0 + rw):
            c.p(x, y, tons_idx(ESTOPA, 0.42 + (x - rx0) * 0.04 + (trama[y, x] - 0.5) * 0.1))
    for x in range(rx0, rx0 + rw):
        c.p(x, ry0 - 1, CRU[1] if x % 2 else CRU[4])
        c.p(x, ry0 + rh, CRU[1] if x % 2 == 0 else CRU[3])
    for y in range(ry0, ry0 + rh):
        c.p(rx0 - 1, y, CRU[1] if y % 2 else CRU[3])
        c.p(rx0 + rw, y, CRU[2] if y % 2 == 0 else CRU[5])
    # remendo esmeralda, embaixo à direita
    for y in range(124, 129):
        for x in range(301, 306):
            c.p(x, y, tons_idx(ESMERALDA, 0.42 + (x - 301) * 0.06))
    for x in range(301, 306):
        c.p(x, 123, CRU[2] if x % 2 else CRU[5])
        c.p(x, 129, CRU[1] if x % 2 == 0 else CRU[4])
    # tiras de couro com fivela de ferro (duas voltas)
    for (yc, fx) in ((109, 303), (120, 293)):
        meia = corpo[yc]
        for x in range(int(cx - meia) - 1, int(cx + meia) + 2):
            u = (x + 0.5 - cx) / meia
            yy = yc + int(round(-u * u * 0.7))
            c.p(x, yy - 1, CRU[1], 0.8)
            c.p(x, yy, tons_idx(COURO, 0.62 + u * 0.3))
            c.p(x, yy + 1, tons_idx(COURO, 0.4 + u * 0.3))
            c.p(x, yy + 2, tons_idx(COURO, 0.12))
        c.ret(fx, yc - 1, 3, 4, FERRO[4])
        c.ret(fx + 1, yc, 1, 2, COURO[2])
        c.p(fx + 2, yc - 1, FERRO[6])
        c.p(fx + 3, yc + 1, COURO[4])               # ponta da tira passando da fivela
    # cinta de baixo (barra dobrada) e rasgos com palha aparecendo
    for x in range(int(cx - corpo[y1 - 2]), int(cx + corpo[y1 - 2]) + 1):
        c.p(x, y1 - 2, CRU[2])
        c.p(x, y1 - 1, CRU[1])
    for (xa, ya, xb, yb) in ((300, 116, 306, 112), (286, 127, 291, 124)):
        c.linha(xa, ya, xb, yb, "#22180e")
        c.linha(xa, ya + 1, xb, yb + 1, PALHA[5])
        c.p((xa + xb) / 2, (ya + yb) / 2 + 2, PALHA[4])
        c.p((xa + xb) / 2 + 2, (ya + yb) / 2 - 1, PALHA[6])
    c.linha(294, 106, 297, 104, CRU[1])               # marca de golpe sem rasgo
    g = np.random.default_rng(142)
    for _ in range(8):                                  # palha só escapando pela barra de baixo
        x = cx - corpo[y1 - 1] + 1 + g.random() * (corpo[y1 - 1] * 2 - 2)
        for s in range(1 + int(g.random() * 2)):
            c.p(x + (g.random() - 0.5) * s, y1 + s, PALHA[4 + (s == 0)])
    # pescoço: o saco franzido e amarrado com cordão
    c.ret(cx - 3, 100, 7, 3, CRU[3])
    for x in range(int(cx) - 3, int(cx) + 4, 2):
        c.p(x, 100, CRU[1])
    c.ret(cx - 4, 101, 9, 1, CORDA[3])
    c.ret(cx - 4, 102, 9, 1, CORDA[1])
    c.p(cx + 4, 103, CORDA[3])
    c.p(cx + 5, 104, CORDA[2])
    c.p(cx + 5, 105, CORDA[1])
    # cabeça: saco de lona cheio, costura no meio, as duas pontas do saco amarradas em cima
    for y in range(88, 101):
        for x in range(int(cx) - 7, int(cx) + 8):
            dx, dy = (x + 0.5 - cx) / 6.4, (y + 0.5 - 94.6) / 6.4
            if dx * dx + dy * dy > 1:
                continue
            k = 0.52 + dx * 0.3 - dy * 0.15 - (dx * dx + dy * dy) ** 2 * 0.3 + (trama[y, x] - 0.5) * 0.12
            k += 0.03 if y % 2 == 0 else 0
            c.p(x, y, tons_idx(CRU, k))
    for y in range(89, 100, 2):
        c.p(cx + 1 - (y - 89) * 0.12, y, CRU[2])
    c.p(cx - 3, 96, CRU[2])                             # um ponto de remendo na testa
    c.p(cx - 2, 96, CRU[2])
    for x in range(int(cx) - 3, int(cx) + 4):          # a dobra costurada do topo do saco
        c.p(x, 88, CRU[5] if x > cx else CRU[4])
        c.p(x, 89, CRU[2], 0.7)


def flecha(c: Camada, fx: float, fy: float, dx: float, dy: float, pena: str, pena2: str, grande: bool = False) -> None:
    """Flecha cravada: a haste sai do ponto de impacto para o lado de quem atirou, as três penas no fim."""
    n = int(max(abs(dx), abs(dy)))
    for s in range(n + 1):
        x, y = fx + dx * s / n, fy + dy * s / n
        c.p(x, y, "#6a4024" if s % 4 else "#4a2a16")
        c.p(x, y - 1, "#c8925a" if s > 0 else "#120a04")
        if grande:
            c.p(x, y + 1, "#3a2010")
            c.p(x, y - 1, "#e8b46a" if s % 3 else "#f6d090")
    ex, ey = fx + dx, fy + dy
    sx = -1 if dx < 0 else 1
    for (ox, oy, cc) in ((0, -1, pena), (-sx, -1, pena), (-sx * 2, -2, pena), (0, 2, pena2), (-sx, 2, pena2),
                         (-sx * 2, 3, pena2), (-sx, 0, pena), (-sx, 1, pena2), (sx, 0, "#3a2010")):
        c.p(ex + ox, ey + oy, cc)
    if grande:
        for (ox, oy) in ((-sx * 3, -2), (-sx * 3, 3), (-sx * 2, -1), (-sx * 2, 2)):
            c.p(ex + ox, ey + oy, pena if oy < 0 else pena2)
    c.p(fx, fy, "#120a04")
    c.p(fx + sx * -1, fy, "#2a1a0c")


def alvo(c: Camada) -> tuple[list, list]:
    """Cavalete do alvo: postes com escoras, trave em cima (o poleiro), o disco de palha enrolada pintado em anéis
    esmeralda e ouro, flechas fora do centro e uma cravada no centro, e o fardo de feno embaixo."""
    tora_vertical(c, 385, 388, 78, 139, k0=0.48, seed=12)
    tora_vertical(c, 425, 428, 78, 139, k0=0.48, seed=13)
    for (x, d) in ((386, -1), (426, 1)):      # escoras
        for k in range(12):
            c.p(x + d * (k * 0.7 + 1), 127 + k, MADEIRA[4] if d > 0 else MADEIRA[3])
            c.p(x + d * (k * 0.7 + 1), 128 + k, MADEIRA[2])
    # trave de cima: face de cima clara, frente, sombra; topo plano em y 76 (os pés da coruja)
    for x in range(381, 432):
        c.p(x, 76, MADEIRA[7] if hash01(x, 3) > 0.15 else MADEIRA[6])
        c.p(x, 77, MADEIRA[5])
        c.p(x, 78, MADEIRA[4] if x % 7 else MADEIRA[3])
        c.p(x, 79, MADEIRA[2])
        c.p(x, 80, MADEIRA[0], 0.8)
    for (x, cor) in ((381, LENHO[3]), (431, LENHO[2])):   # topo serrado
        for y in range(76, 80):
            c.p(x, y, cor)
    for (xa, xb) in ((396, 398), (416, 414)):
        c.linha(xa, 80, xb, 88, CORDA[3])
        c.linha(xa + 1, 80, xb + 1, 88, CORDA[1])
    ax, ay = ALVO
    r = 16.0
    n = ruido(151, 2)
    for y in range(int(ay - r) - 1, int(ay + r) + 4):      # espessura do disco
        for x in range(int(ax - r) - 1, int(ax + r) + 4):
            d2 = math.hypot(x + 0.5 - ax - 1.6, y + 0.5 - ay - 1.8)
            if d2 <= r:
                c.p(x, y, tons_idx(PALHA, 0.2 + (hash01(x, y, 3) - 0.5) * 0.2))
    for y in range(int(ay - r) - 1, int(ay + r) + 2):
        for x in range(int(ax - r) - 1, int(ax + r) + 2):
            dx, dy = x + 0.5 - ax, y + 0.5 - ay
            d = math.hypot(dx, dy)
            if d > r:
                continue
            ang = math.atan2(dy, dx)
            espiral = (d + ang / math.tau * 1.6) % 1.6 < 0.55
            k = 0.55 + (dx * 0.4 - dy * 0.5) / r * 0.3 + (n[y, x] - 0.5) * 0.18 - (0.18 if espiral and d > 13.4 else 0)
            if d < 4.2:
                cor = tons_idx(OURO, 0.5 + k * 0.45)
            elif d < 6.8:
                cor = tons_idx(ESMERALDA, 0.2 + k * 0.4)
            elif d < 10.2:
                cor = tons_idx(LINHO, 0.25 + k * 0.6)
            elif d < 13.4:
                cor = tons_idx(ESMERALDA, 0.3 + k * 0.5)
            else:
                cor = tons_idx(PALHA, k)
            if 3.4 <= d < 13.4 and n[y, x] > 0.78:
                cor = tons_idx(PALHA, k)
            for rr in (4.2, 6.8, 10.2, 13.4):
                if abs(d - rr) < 0.45:
                    cor = mistura(cor, "#1a140c", 0.45)
            if d > r - 1:
                cor = tons_idx(PALHA, k - 0.2)
            c.p(x, y, cor)
    for (hx, hy) in ((399, 95), (414, 96), (410, 111), (397, 108), (418, 104), (402, 116), (392, 101), (408, 91)):
        c.p(hx, hy, "#1a1008")
        c.p(hx + 1, hy + 1, PALHA[6], 0.6)
    fardo(c, 391, 423, 125, 139, 152)
    # flechas fora do centro (penas brancas e verdes) e a do centro (penas douradas, maior)
    fora = [((394, 93), (-7, 6)), ((417, 98), (-8, 6)), ((413, 113), (-7, 5)), ((398, 117), (-6, 5)),
            ((421, 108), (-7, 5)), ((402, 130), (-8, 4)), ((417, 133), (-7, 3))]
    for i, ((fx, fy), (dx, dy)) in enumerate(fora):
        flecha(c, fx, fy, dx, dy, "#f2eee4", ESMERALDA[6] if i % 2 else "#c8c0b0")
    centro = ((int(ax), int(ay)), (-11, 8))
    flecha(c, ax, ay, -11, 8, OURO[6], OURO[4], grande=True)
    return fora, [centro]


def braseiro(c: Camada, e: Camada) -> None:
    """Braseiro de ferro (cesto de chamas): bloco de pedra lavrada, haste com anéis e o cesto de barras curvas abertas
    como pétalas, com as brasas dentro (vistas entre as barras) e o aro de cima. O fogo vai no emissivo."""
    bx = BRASEIRO[0]
    # bloco de pedra
    for y in range(137, BRAS_BASE + 1):
        for x in range(445, 462):
            u = (x + 0.5 - bx) / 8.5
            k = 0.5 + u * 0.3 + (hash01(x, y, 191) - 0.5) * 0.16
            if y <= 138:
                k = 0.78 + (hash01(x, 192) - 0.5) * 0.1 if y == 137 else 0.62
            if x in (445, 461):
                k -= 0.2
            if y == BRAS_BASE:
                k = 0.1
            c.p(x, y, tons_idx(PEDRA_M, k))
    c.p(448, 142, PEDRA_M[2])
    c.p(449, 143, PEDRA_M[2])
    c.p(457, 141, PEDRA_M[7])
    # haste com anéis
    for y in range(111, 137):
        c.p(bx - 1, y, FERRO[3])
        c.p(bx, y, FERRO[5] if y % 5 else FERRO[6])
        c.p(bx + 1, y, FERRO[2])
    for yr in (112, 125, 135):
        c.ret(bx - 2, yr, 5, 1, FERRO[4])
        c.p(bx + 1, yr, FERRO[6])
        c.ret(bx - 2, yr + 1, 5, 1, FERRO[1])
    # aro de trás (atrás das brasas)
    for x in range(int(bx - 11), int(bx + 12)):
        u = (x + 0.5 - bx) / 11
        c.p(x, 100 - int(round(math.sqrt(max(0, 1 - u * u)) * 1.6)), FERRO[2])
    # brasas: monte por cima do aro e o miolo do cesto (vistas entre as barras)
    def perfil(y):
        t = (111 - y) / 11
        return 2 + 9.5 * math.sin(min(1, t) * math.pi / 2) ** 0.45
    for y in range(96, 110):
        meia = perfil(y) if y >= 100 else 10.5 - (100 - y) * 2.2
        for x in range(int(bx - meia), int(bx + meia) + 1):
            c.p(x, y, "#1e1612" if (x * 3 + y) % 4 else "#3a2c24")
            if y < 100 and hash01(x, y, 175) < 0.3:
                c.p(x, y, "#5a4a42")          # cinza
            if hash01(x, y, 171) < 0.6:
                q = hash01(x, y, 172)
                e.p(x, y, ["#ffd070", "#ff9a30", "#ff6a1e", "#e0441a"][int(q * 4)], 0.95 if y < 104 else 0.75)
    # barras curvas do cesto: saem da base e abrem rápido (cesto fundo, não leque)
    for k in range(9):
        topo_x = bx + (k - 4) * 2.75
        for s_ in range(15):
            t = s_ / 14
            x = bx + (topo_x - bx) * math.sin(t * math.pi / 2) ** 0.45
            y = 111 - t * 11
            lado = (x - bx) / 11
            c.p(x, y, tons_idx(FERRO, 0.6 + lado * 0.3))
            if abs(lado) > 0.6:
                c.p(x + (1 if lado > 0 else -1), y, FERRO[1])
    # cinta do meio e aro da frente, grossos
    for x in range(int(bx - 9), int(bx + 10)):
        u = (x + 0.5 - bx) / 9
        c.p(x, 106 + int(round(math.sqrt(max(0, 1 - u * u)) * 1.2)), FERRO[5] if u > -0.3 else FERRO[3])
    for x in range(int(bx - 11), int(bx + 12)):
        u = (x + 0.5 - bx) / 11
        yy = 100 + int(round(math.sqrt(max(0, 1 - u * u)) * 1.6))
        c.p(x, yy, FERRO[6] if u > -0.2 and x % 2 else FERRO[4])
        c.p(x, yy + 1, FERRO[2])
    for k in (-1, 1):   # pontas viradas para fora
        c.p(bx + k * 12, 99, FERRO[5])
        c.p(bx + k * 13, 98, FERRO[4])
    c.ret(bx - 2, 110, 5, 2, FERRO[3])
    c.ret(bx - 2, 110, 5, 1, FERRO[5])


def pintar_objetos() -> tuple[Objetos, Camada, Camada, dict]:
    o = Objetos()
    e_bras = Camada()
    o.add(137, props_esquerda)
    o.add(133, sacos_de_areia)
    o.add(142, banco)
    o.add(131, suporte_armas)
    o.add(129, escudos)
    o.add(147, boneco)
    o.add(139, alvo)
    o.add(BRAS_BASE, braseiro, e_bras)
    ids = {"braseiro": o.n - 1}
    chamas = Camada()
    chama(chamas, BRASEIRO[0] + 0.5, 101.5, 14, 22, 7)
    chama(chamas, BRASEIRO[0] - 4.5, 101.5, 6, 12, 11)
    chama(chamas, BRASEIRO[0] + 5.5, 101.5, 6, 10, 13)
    return o, e_bras, chamas, ids


def primeiro_plano() -> Camada:
    """Muito perto da câmera (sai desfocado): mourão e corda no canto esquerdo, capim alto nos dois cantos de baixo."""
    c = Camada()
    tora_vertical(c, 2, 9, 104, 160, tons=CASCA, k0=0.4, seed=21)
    c.linha(8, 118, 60, 160, CORDA[2])
    c.linha(8, 119, 60, 161, CORDA[1])
    for (x, n, a) in ((16, 9, 16), (34, 7, 12), (468, 9, 16), (450, 6, 10), (8, 8, 14)):
        tufo(c, x, 161, n, 1500 + x, alto=a, tons=GRAMA[:6], seco=0.2)
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
    """Desfoque gaussiano aproximado (três passadas de caixa), em float: preserva luzes acima de 1."""
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
    return i * 0.74 + np.floor(i * degraus) / degraus * 0.26


def frestas(mask_pal: np.ndarray, px, py, prof, nome: str, per: dict, escala: int = 1):
    """A paliçada é uma parede fina: o raio de luz a cruza num ponto só. Para um ponto (px, py) da imagem a uma
    profundidade `prof` (linha do chão), acha onde o raio até a luz passa pela profundidade da paliçada e olha se ali
    há tronco ou fresta. Devolve 1 (luz passa) ou 0 (tronco). Serve para o chão, os objetos e o volume do ar."""
    prof = np.asarray(prof, dtype=np.float32)
    atras = prof <= FUNDO_Y + 0.01
    if nome == "tarde":
        sx, sy = SOL_TARDE
        vx, vy = sx - px, sy - py
        dist = np.maximum(np.hypot(vx, vy), 1e-3)
        f = np.clip((prof - FUNDO_Y) / np.maximum(prof - 95.0, 1e-3), 0, 1)
        qx, qy = px + vx * f, py + vy * f
    else:
        gx, gy = per["sol_dir"]
        dh = (FUNDO_Y - prof) / gy
        qx, qy = px + gx * dh, py + (gy - 1) * dh
    hh, ww = mask_pal.shape
    xi = np.floor(qx * escala).astype(np.int32)
    yi = np.floor(qy * escala).astype(np.int32)
    ok = (xi >= 0) & (xi < ww) & (yi >= 0) & (yi < hh)
    tronco = mask_pal[np.clip(yi, 0, hh - 1), np.clip(xi, 0, ww - 1)] & ok
    return np.where(atras, 1.0, 1.0 - tronco).astype(np.float32)


def tracar(alvo_xy, rumo, prof_fim, occ_a, occ_b, occ_id, rec_b, rec_id, tol: float = 3.2, passo: float = 0.6,
           ignorar: tuple = ()) -> np.ndarray:
    """Sombra traçada por pixel. Cada ponto anda em linha reta na imagem até a luz (alvo_xy, ou na direção `rumo`
    para o sol e a lua). A cada passo, a profundidade esperada do raio (a linha do chão onde ele está) vai da do
    próprio ponto até `prof_fim`; um pixel de objeto só bloqueia se a linha do chão dele bate com essa profundidade
    (± tol) e se não é o próprio objeto. Assim o boneco não faz sombra no que está atrás dele em relação à luz."""
    x = _XS + 0.5
    y = _YS + 0.5
    if alvo_xy is not None:
        vx, vy = alvo_xy[0] - x, alvo_xy[1] - y
        dist = np.maximum(np.hypot(vx, vy), 1e-3)
        ux, uy = vx / dist, vy / dist
        pf = prof_fim
        taxa = (pf - rec_b) / dist                 # variação da profundidade por pixel andado
        n = int(max(W, H) * 1.2 / passo)
    else:
        rx, ry, k_prof = rumo
        nrm = math.hypot(rx, ry)
        ux = np.full((H, W), rx / nrm, dtype=np.float32)
        uy = np.full((H, W), ry / nrm, dtype=np.float32)
        dist = np.full((H, W), 1e9, dtype=np.float32)
        taxa = np.full((H, W), k_prof, dtype=np.float32)
        n = int(W * 1.1 / passo)
    vivo = np.ones((H, W), dtype=np.float32)
    ign = np.isin(occ_id, list(ignorar)) if ignorar else np.zeros((H, W), dtype=bool)
    for i in range(2, n):
        s = i * passo
        px = x + ux * s
        py = y + uy * s
        dentro = (px >= 0) & (px < W) & (py >= 0) & (py < H) & (s < dist)
        if not dentro.any():
            break
        xi = np.clip(px.astype(np.int32), 0, W - 1)
        yi = np.clip(py.astype(np.int32), 0, H - 1)
        a = occ_a[yi, xi]
        esperado = rec_b + taxa * s
        bate = (np.abs(occ_b[yi, xi] - esperado) < tol) & (occ_id[yi, xi] != rec_id) & ~ign[yi, xi]
        vivo *= 1 - a * (bate & dentro)
    return vivo


@lru_cache(maxsize=1)
def camadas_fixas():
    """As camadas de pixel art que não mudam com a hora (só a luz muda)."""
    muro, e_tocha, lateral = muralha()
    pal, topo_pal, _ = palicada()
    chao = pintar_chao()
    obj, e_bras, chamas, ids = pintar_objetos()
    frente = primeiro_plano()
    obj_c = obj.cam
    return dict(muro=muro, e_tocha=e_tocha, lateral=lateral, pal=pal, topo_pal=topo_pal, chao=chao, obj=obj,
                e_bras=e_bras, chamas=chamas, ids=ids, frente=frente, obj_c=obj_c)


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    L = camadas_fixas()
    obj = L["obj"]
    ceu = pintar_ceu(nome, per)
    montes = pintar_montes(per)
    cast, janelas = castelo_fundo(nome == "noite")
    mata = pintar_mata(nome)

    # ── Albedo, de trás para a frente, com profundidade de campo, névoa e "quanto recebe de sol" por plano.
    img = ampliar(ceu)
    solido = np.zeros(img.shape[:2], dtype=np.float32)
    m_nev = np.zeros_like(solido)
    m_sol = np.zeros_like(solido)
    nev_k = {"manha": (0.55, 0.26, 0.3), "tarde": (0.5, 0.26, 0.24), "noite": (0.42, 0.3, 0.18)}[nome]
    sol_mata = {"manha": 0.55, "tarde": 0.25, "noite": 0.5}[nome]
    planos = [(montes.c, 2.2, nev_k[0], 0.3), (cast.c, 1.4, nev_k[1], 0.45), (mata.c, 1.3, nev_k[2], sol_mata),
              (L["pal"].c, 0.35, 0.04, 1.0), (L["muro"].c, 0.45, 0.03, 1.0), (L["chao"].c, 0.0, 0.0, 1.0),
              (L["obj_c"].c, 0.0, 0.0, 1.0)]
    for cam, r, nev, so in planos:
        a = desfocar_rgba(ampliar(cam), r)
        al = a[:, :, 3]
        img = sobre(img, a)
        solido = solido * (1 - al) + al
        m_nev = m_nev * (1 - al) + nev * al
        m_sol = m_sol * (1 - al) + so * al

    # ── Mapas de recepção e oclusão (1x): profundidade (linha do chão) e número de cada coisa.
    a_obj = obj.cam.c[:, :, 3]
    a_pal = L["pal"].c[:, :, 3]
    a_muro = L["muro"].c[:, :, 3]
    rec_b = _YS.copy()
    rec_id = np.zeros((H, W), dtype=np.int32)
    rec_b = np.where(a_muro > 0.5, MURO_Y, rec_b)
    rec_id = np.where(a_muro > 0.5, 2, rec_id)
    rec_b = np.where(a_pal > 0.5, FUNDO_Y, rec_b)
    rec_id = np.where(a_pal > 0.5, 1, rec_id)
    rec_b = np.where(a_obj > 0.5, obj.base, rec_b)
    rec_id = np.where(a_obj > 0.5, obj.ids, rec_id)
    occ_a = np.where(a_obj > 0.5, 1.0, 0.0).astype(np.float32)
    occ_b = np.where(a_obj > 0.5, obj.base, -99).astype(np.float32)
    occ_id = np.where(a_obj > 0.5, obj.ids, -1).astype(np.int32)
    m_pal = a_pal > 0.5
    # a face da muralha fica fora (não recebe sombra dos objetos: estão longe dela em relação à luz)
    eh_fundo = (a_obj < 0.5) & (a_pal < 0.5) & (a_muro < 0.5) & (_YS < np.array([y_chao(x) for x in range(W)])[None, :])

    def suavizar(v, r=1.6):
        return desfocar(ampliar(v[:, :, None]), r)[:, :, 0]

    # ── Sol (ou lua) traçado.
    px1, py1 = _XS + 0.5, _YS + 0.5
    if nome == "tarde":
        vis_obj = tracar(SOL_TARDE, None, 95.0, occ_a, occ_b, occ_id, rec_b, rec_id)
        vis_sol = vis_obj * frestas(m_pal, px1, py1, rec_b, nome, per)
        # Volume (feixes no ar): integra a luz ao longo do raio de visão de cada pixel. Um pixel da imagem
        # corresponde a pontos em várias profundidades (cada uma numa altura); a poeira fica perto do chão.
        vis_ar = np.zeros((H, W), dtype=np.float32)
        peso_t = np.zeros((H, W), dtype=np.float32)
        for d in np.arange(FUNDO_Y + 1.0, H + 1.0, 1.5):
            h = d - py1
            ok = h >= 0
            w = np.exp(-np.maximum(h, 0) / 24) * ok
            vis_ar += frestas(m_pal, px1, py1, np.full((H, W), d, np.float32), nome, per) * w
            peso_t += w
        vis_ar = vis_ar / np.maximum(peso_t, 1e-3) * np.clip(peso_t / 6, 0, 1)
    else:
        gx, gy = per["sol_dir"]
        ix, iy = gx, gy - 1.0
        k_prof = gy / math.hypot(ix, iy)
        vis_obj = tracar(None, (ix, iy, k_prof), 0.0, occ_a, occ_b, occ_id, rec_b, rec_id)
        vis_sol = vis_obj * frestas(m_pal, px1, py1, rec_b, nome, per)
        vis_ar = None
    vis_sol = np.where(eh_fundo, 1.0, vis_sol).astype(np.float32)
    vis_obj = np.where(eh_fundo, 1.0, vis_obj).astype(np.float32)
    # a fresta é fina: o teste da paliçada roda na resolução final (sem serrilhar as faixas de luz)
    m_pal3 = ampliar(m_pal[:, :, None])[:, :, 0]
    rec_b3 = ampliar(rec_b[:, :, None])[:, :, 0]
    fr3 = frestas(m_pal3, (_GXS + 0.5) / ESC, (_GYS + 0.5) / ESC, rec_b3, nome, per, escala=ESC)
    fr3 = desfocar(fr3[:, :, None], 1.0)[:, :, 0]
    fr3 = np.where(ampliar(eh_fundo[:, :, None])[:, :, 0], 1.0, fr3)
    vis_sol3 = suavizar(vis_obj, 1.2 if nome != "noite" else 3.0) * fr3

    # ── Oclusão de contato: debaixo de cada objeto, no pé dos muros, sob o banco e o cavalete.
    ao = Camada()
    for (cx, cy, rx, ry, a) in ((298, 147, 14, 2.6, 0.8), (406, 139, 22, 2.4, 0.7), (453, 147, 14, 2.2, 0.6),
                                (252, 131, 18, 2.2, 0.7), (172, 142, 28, 2.4, 0.7), (206, 144, 7, 1.6, 0.7),
                                (121, 133, 24, 2, 0.55), (76, 134, 10, 2, 0.6), (30, 137, 28, 2.2, 0.6),
                                (172, 137, 22, 5, 0.35), (406, 132, 18, 6, 0.3)):
        ao.elipse(cx, cy, rx, ry, "#000000", a)
    for x in range(W):
        yc = int(round(y_chao(x)))
        ao.ret(x, yc, 1, 3, "#000000", 0.4)
    ao_m = desfocar_rgba(ampliar(ao.c), 4)[:, :, 3]

    # ── Luz: ambiente + sol/lua (traçado) + chamas (traçadas) + rebatida.
    amb = hexa(per["amb"]) * per["amb_k"]
    luz = np.zeros_like(img) + amb
    luz = luz * (1 - ao_m * 0.62)[:, :, None]
    sol = hexa(per["sol"]) * per["sol_k"]
    lat3 = ampliar(L["lateral"].astype(np.float32)[:, :, None])[:, :, 0]
    face_muro = ampliar((a_muro > 0.5).astype(np.float32)[:, :, None])[:, :, 0] * (1 - lat3)
    if nome == "manha":
        receb = m_sol * (1 - face_muro * 0.72) * (1 + lat3 * 0.25)
    elif nome == "tarde":
        receb = m_sol * (1 - face_muro * 0.55) * (1 + lat3 * 0.1)
        # objetos contra o sol: a frente deles vê pouco do disco (a luz entra de lado, pelas frestas)
        receb = receb * (1 - ampliar((a_obj > 0.5).astype(np.float32)[:, :, None])[:, :, 0] * 0.35)
    else:
        receb = m_sol * (1 - face_muro * 0.45) * (1 - ampliar(m_pal[:, :, None].astype(np.float32))[:, :, 0] * 0.45)
    luz += (vis_sol3 * receb)[:, :, None] * sol
    if nome == "manha":
        # sol baixo rasante na cantaria: um calor ocre fraco que cresce para a direita e para o alto (sem clarear demais)
        rasante = face_muro * (0.12 + 0.22 * np.clip(_GXS / (MURO_X1 * ESC), 0, 1)) * (1 - 0.4 * np.clip(_GYS / (H * ESC), 0, 1))
        luz += rasante[:, :, None] * hexa("#ffc888")
        luz *= (1 - face_muro * 0.2)[:, :, None] + face_muro[:, :, None] * 0.2 * hexa("#d0a670")
    # céu: a parte de cima das coisas recebe a luz do céu
    luz += (luz_pontual(330, -40, 260, 0.6) * 0.35)[:, :, None] * hexa(per["ceu"][1]) * (0.5 if nome != "noite" else 0.4)
    # luz rebatida do chão ensolarado (aquece a base dos objetos)
    if nome != "noite":
        rebat = desfocar(ampliar((vis_sol * (_YS > FUNDO_Y) * (a_obj < 0.5))[:, :, None]), 18)[:, :, 0]
        luz += (rebat * 0.22)[:, :, None] * sol
    # chamas: braseiro e tocha, com sombras traçadas a partir delas
    if per["fogo"] > 0:
        bxl, byl = BRASEIRO
        vis_b = tracar((bxl, byl + 2), None, float(BRAS_BASE), occ_a, occ_b, occ_id, rec_b, rec_id, tol=3.2,
                       ignorar=(L["ids"]["braseiro"],))
        vis_b3 = suavizar(vis_b, 2.2)
        poca = luz_de_chama(bxl, byl + 14, 128, 0.62, 3)[:, :, None] * hexa("#ff9440") * 1.05
        miolo = luz_pontual(bxl, byl + 4, 30, 0.9)[:, :, None] * hexa("#ffd890") * 0.55
        luz += (poca + miolo) * per["fogo"] * (0.15 + 0.85 * vis_b3)[:, :, None]
    if per["tocha"] > 0:
        txl, tyl = TOCHA
        vis_t = tracar((txl, tyl), None, float(MURO_Y), occ_a, occ_b, occ_id, rec_b, rec_id, tol=3.2)
        vis_t3 = suavizar(vis_t, 2.2)
        poca_t = luz_de_chama(txl, tyl + 6, 74, 0.95, 5)[:, :, None] * hexa("#ff9a48") * 0.95
        poca_t += luz_pontual(txl, tyl + 2, 16, 1.2)[:, :, None] * hexa("#ffcf88") * 0.6
        luz += poca_t * per["tocha"] * (0.25 + 0.75 * vis_t3)[:, :, None]
    luz = np.minimum(luz, 2.6)
    s = solido[:, :, None]
    img = img * (1 - s) + img * s * luz

    # ── Luz de recorte: bordas viradas para a luz acendem (tarde: frestas da paliçada e topo dos objetos).
    alto = (np.maximum(a_obj, a_pal) > 0.5)
    if nome == "tarde":
        rec = np.zeros((H, W), dtype=np.float32)
        for (dx, dy, k) in ((1, 0, 1.0), (-1, 0, 0.8), (0, -1, 0.9), (1, -1, 0.8)):
            viz = np.roll(np.roll(alto, -dy, 0), -dx, 1)
            borda = alto & ~viz
            # só onde o vizinho de fora está no sol (fresta ou céu)
            fora = np.roll(np.roll(vis_ar, -dy, 0), -dx, 1)
            rec = np.maximum(rec, borda * fora * k)
        rec[:, :2] = 0
        rec[:, -2:] = 0
        rec *= np.clip(1 - np.hypot(_XS - SOL_TARDE[0], (_YS - SOL_TARDE[1]) * 1.4) / 300, 0.2, 1)
        img += suavizar(rec, 0.7)[:, :, None] * hexa("#ffb060") * 0.8
    elif nome == "manha":
        viz = np.roll(alto, -1, 1)
        borda = (alto & ~viz).astype(np.float32) * vis_sol
        borda[:, -2:] = 0
        img += suavizar(borda, 0.7)[:, :, None] * hexa("#ffe8b8") * 0.22
    else:
        viz = np.roll(alto, 1, 0)
        borda = (alto & ~viz & ~m_pal).astype(np.float32)
        img += suavizar(borda, 0.8)[:, :, None] * hexa("#9ab4ff") * 0.14

    # ── Névoa por distância (mais clara perto do sol na tarde), e a névoa rasteira da manhã.
    nev = hexa(per["nevoa"])
    brilho_nev = np.ones(img.shape[:2], dtype=np.float32)
    if nome == "tarde":
        brilho_nev = 1 + luz_pontual(SOL_TARDE[0], SOL_TARDE[1], 120, 0.6) * 0.9
    mn = (m_nev * solido)[:, :, None]
    img = img * (1 - mn) + nev * brilho_nev[:, :, None] * mn
    if nome == "manha":
        wisp = ampliar((ruido(201, 30, 3) * 0.55 + ruido(202, 11, 2) * 0.45)[:, :, None])[:, :, 0]
        yy = _GYS / ESC
        faixa = np.exp(-((yy - 119) / 6) ** 2) + np.exp(-((yy - 131) / 5) ** 2) * 0.35
        dens = np.clip(faixa * (wisp - 0.38) * 1.6, 0, 0.5)
        dens = desfocar(dens[:, :, None], 4)[:, :, 0]
        dens *= 1 - ampliar((a_obj > 0.5).astype(np.float32)[:, :, None])[:, :, 0] * 0.55
        lado_sol = 0.75 + 0.45 * np.clip(_GXS / (W * ESC), 0, 1)
        cor_n = hexa("#eef2ee") * lado_sol[:, :, None]
        img = img * (1 - dens[:, :, None]) + cor_n * dens[:, :, None]
    elif nome == "noite":
        faixa = np.exp(-((_GYS / ESC - 120) / 10) ** 2) * 0.22
        img = img * (1 - faixa[:, :, None]) + hexa("#2a3a6a") * faixa[:, :, None]

    # ── Emissivos: chama da tocha, brasas e chama do braseiro, janelas do castelo.
    em = Camada()
    k_tocha = {"manha": 0.0, "tarde": 1.0, "noite": 1.0}[nome]
    if k_tocha:
        em.juntar(L["e_tocha"])
    if nome != "manha":
        em.juntar(L["e_bras"])
    else:
        b = Camada()
        b.c = L["e_bras"].c.copy()
        b.c[:, :, 3] *= (hash01_mapa() < 0.18) * 0.6
        em.juntar(b)
    if per["fogo"] > 0:
        em.juntar(L["chamas"])
    ch = ampliar(em.c)
    k_em = {"manha": 0.35, "tarde": 1.0, "noite": 1.25}[nome]
    img = img * (1 - ch[:, :, 3:4] * min(1.0, k_em)) + ch[:, :, :3] * ch[:, :, 3:4] * k_em
    pm = ch[:, :, :3] * ch[:, :, 3:4]
    k_halo = {"manha": 0.15, "tarde": 0.6, "noite": 0.78}[nome]
    img += (desfocar(pm, 5) * 1.3 + desfocar(pm, 18) * 1.3) * hexa("#ffb060") * k_halo
    if nome == "noite":
        jan = np.zeros((H, W), np.float32)
        for (wx, wy) in janelas:
            jan[wy, wx] = 1
        j3 = ampliar(jan[:, :, None])
        img = img * (1 - j3) + j3 * hexa("#ffd27a") * 1.2
        img += desfocar(j3, 4) * hexa("#ffb050") * 1.6

    # ── Feixes volumétricos (tarde: pelas frestas da paliçada), poeira e fumaça.
    g = np.random.default_rng(91)
    poeira = np.zeros(img.shape[:2], dtype=np.float32)
    if nome == "tarde":
        # Raios crepusculares: cada pixel anda até o sol somando a luz que atravessa as frestas (e o céu acima das
        # pontas, mais fraco); a soma decai com a distância. Dá os feixes saindo de cada fresta em leque.
        topo_l = L["topo_pal"][None, :]
        banda = (_YS >= topo_l + 3) & (_YS < FUNDO_Y - 1) & (_XS >= PAL_X0)
        fonte = (banda & ~m_pal).astype(np.float32) * 1.0
        fonte += ((_YS < topo_l + 3) & (_XS >= PAL_X0 - 10)).astype(np.float32) * 0.07
        fonte *= np.exp(-np.hypot(_XS - SOL_TARDE[0], (_YS - SOL_TARDE[1]) * 1.3) / 260)
        sx, sy = SOL_TARDE
        acum = np.zeros((H, W), dtype=np.float32)
        peso = 1.0
        npas = 110
        for i in range(npas):
            t = i / npas * 0.97
            qx = np.clip((_XS + (sx - _XS) * t).astype(np.int32), 0, W - 1)
            qy = np.clip((_YS + (sy - _YS) * t).astype(np.int32), 0, H - 1)
            acum += fonte[qy, qx] * peso
            peso *= 0.99
        raios = acum / npas * 9.5
        topo3 = ampliar(L["topo_pal"][None, :].repeat(H, 0)[:, :, None])[:, :, 0]
        frente_pal = suave(-2, 8, _GYS / ESC - topo3)
        dist_sol = np.hypot(_GXS / ESC - SOL_TARDE[0], _GYS / ESC - SOL_TARDE[1])
        vol = suavizar(raios, 1.4) * frente_pal * np.clip(dist_sol / 70, 0.3, 1)
        vol *= 0.6 + 0.55 * ampliar(ruido(211, 8, 3)[:, :, None])[:, :, 0]
        vol *= 1 - ampliar((a_obj > 0.5).astype(np.float32)[:, :, None])[:, :, 0] * 0.55
        img += vol[:, :, None] * hexa("#ffb468") * 1.3
        # coroa de luz em volta do sol, por cima das pontas
        img += (luz_pontual(SOL_TARDE[0], SOL_TARDE[1], 34, 0.8) * 0.35)[:, :, None] * hexa("#ffcf88")
        calor = (vol * 1.4 + suavizar(vis_sol * (_YS > FUNDO_Y + 2), 1.0) * 0.8) * suave(112, 150, _GYS / ESC)
        cor_p, n_p = mistura("#ffd8a0", "#ffffff", 0.2), 2200
    elif nome == "manha":
        calor = suavizar(vis_sol, 1.0) * np.exp(-((_GYS / ESC - 125) / 22) ** 2) * 0.5
        cor_p, n_p = hexa("#fff4d8"), 420
    else:
        calor = luz_pontual(BRASEIRO[0], BRASEIRO[1] - 10, 30, 1.6) * 0.6
        cor_p, n_p = hexa("#ffb050"), 0
    for _ in range(n_p):
        X, Y = int(g.random() * (W * ESC - 3)), int(g.random() * (H * ESC - 3))
        k = calor[Y, X]
        if k > 0.06 and g.random() < k:
            tam = 2 if g.random() < 0.75 else 3
            poeira[Y:Y + tam, X:X + tam] += 0.5 + g.random() * 0.6
    img += np.clip(poeira, 0, 1.2)[:, :, None] * cor_p * (0.55 if nome == "tarde" else 0.4)
    # fagulhas subindo do braseiro (tarde e noite)
    if per["fogo"] > 0:
        gf = np.random.default_rng(31)
        fag = np.zeros(img.shape[:2], dtype=np.float32)
        for _ in range(26):
            t = gf.random()
            x = BRASEIRO[0] + (gf.random() - 0.5) * 10 + math.sin(t * 9 + gf.random() * 6) * 5 * t
            y = 96 - t * 46
            X, Y = int(x * ESC), int(y * ESC)
            if 0 <= Y < H * ESC - 3:
                fag[Y:Y + 3, X:X + 3] += (1 - t) * 1.1
        img += fag[:, :, None] * hexa("#ffb050") * 1.1 + desfocar(fag[:, :, None], 4) * hexa("#ff8030") * 1.6
    # fumaça: do braseiro apagado (manhã) e o fio da chama (tarde/noite)
    fum = np.zeros(img.shape[:2], dtype=np.float32)
    for k in range(70):
        t = k / 70
        x = BRASEIRO[0] + math.sin(t * 7) * (1 + t * 4) - t * 8
        y = 98 - t * 60
        X, Y = int(x * ESC), int(y * ESC)
        if Y > 6:
            fum[Y - 3:Y + 4, X - 4:X + 5] += (1 - t) * min(1, t * 6) * 0.3
    fum = desfocar(fum[:, :, None], 7)[:, :, 0]
    k_f = {"manha": 0.5, "tarde": 0.22, "noite": 0.2}[nome]
    cor_f = {"manha": "#d8dce0", "tarde": "#c8a888", "noite": "#5a6688"}[nome]
    img = img + fum[:, :, None] * (hexa(cor_f) - img * 0.6) * k_f
    # orvalho da manhã: pontinhos brilhando no capim e no pé da paliçada
    if nome == "manha":
        gd = np.random.default_rng(55)
        cap = (L["chao"].c[:, :, 1] > L["chao"].c[:, :, 0] * 1.05) | (np.abs(_YS - FUNDO_Y + 2) < 3) & (a_pal > 0.5)
        ys, xs = np.nonzero(cap & (vis_sol > 0.5) & (a_obj < 0.5))
        for i in gd.choice(len(ys), size=min(40, len(ys)), replace=False):
            X, Y = xs[i] * ESC + 1, ys[i] * ESC
            img[Y:Y + 1, X:X + 1] += 0.9
            for d in (-2, -1, 1, 2):
                kd = (1 - abs(d) / 3) * 0.35
                if 0 <= X + d < W * ESC:
                    img[Y, X + d] += kd
                if 0 <= Y + d < H * ESC:
                    img[Y + d, X] += kd

    # ── Primeiro plano desfocado e escuro.
    fr = desfocar_rgba(ampliar(L["frente"].c), 8)
    k_fr = {"manha": 0.42, "tarde": 0.34, "noite": 0.28}[nome]
    img = sobre(img, fr * np.array([k_fr, k_fr * 0.98, k_fr * 1.02, 1], dtype=np.float32))

    # ── Acabamento: bloom, curva de tom, cor, esquerda calma, vinheta, grão.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img - 0.72, 0, None) * np.clip((lum - 0.62) * 3, 0, 1)
    img = img + desfocar(claro, 6) * 0.5 + desfocar(claro, 22) * 0.5
    joelho = 0.72
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, f = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (f * 0.5 + 0.5)))
    img = np.clip((img - 0.48) * 1.07 + 0.48, 0, 1.3)
    xn = _GXS / (W * ESC)
    calma = np.clip((0.44 - xn) / 0.14, 0, 1)[:, :, None]
    media = desfocar(np.clip(img, 0, 1.3), 14)
    img = media + (img - media) * (1 - 0.42 * calma)
    img *= 1 - 0.22 * calma
    v = (xn - 0.64) ** 2 * 0.9 + (_GYS / (H * ESC) - 0.48) ** 2 * 1.3
    img *= (1 - np.clip(v - 0.07, 0, 1) * 0.85)[:, :, None]
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.02
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    pedidas = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in pedidas:
        img = montar(nome)
        destino = PASTA / f"treino-{nome}.webp"
        img.save(destino, quality=88, method=6)
        menor = PASTA / f"treino-{nome}-960.webp"
        img.resize((960, 320), Image.LANCZOS).save(menor, quality=88, method=6)
        movel = PASTA / f"treino-{nome}-movel.webp"
        img.crop((MOVEL_X0 * ESC, 0, W * ESC, H * ESC)).save(movel, quality=82, method=6)
        print(destino.name, destino.stat().st_size // 1024, "KB |", menor.name, menor.stat().st_size // 1024, "KB |",
              movel.name, movel.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
