"""Cenário "HD-2D" da página Favoritas: o Gabinete das relíquias, uma sala de colecionador no castelo (01/11/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai
das funções abaixo, na mesma técnica das outras cenas (scripts/gerar_cena_estufa.py é a referência direta): pixel art
em 480 x 160, camada por camada, montada em 3x com a luz calculada por pixel.

A metáfora: as favoritas são as questões que a pessoa guardou para rever, marcadas com uma estrela. No gabinete, cada
coisa guardada tem o seu lugar: a vitrine de curiosidades, o móvel de gavetinhas com etiquetas sem texto, os
pergaminhos com fita verde. No centro, o atril com o grande livro aberto e as fitas-marcador; numa delas, a estrela
de latão de oito pontas (o símbolo das favoritas), que é onde o sol da manhã pousa.

A cena: paredes de pedra lavrada sobre um lambri de nogueira com almofadas, forro de vigas escuras, o óculo (janela
redonda) com o caixilho de ferro radial e anel (nada em cruz), o assoalho de tábuas com o tapete de padrão geométrico.
À esquerda, em sombra calma: a cortina de veludo esmeralda, a estante de livros, a poltrona de veludo e o globo. Do
centro para a direita: o móvel de gavetinhas com a lamparina de latão e os pergaminhos, o cesto de pergaminhos, o
atril, a prateleira da parede com o castiçal e a grande vitrine de mogno com portas de vidro (conchas, minerais e
cristais coloridos, o astrolábio pequeno, frascos, a amonite fóssil e o pequeno osso longo sob a redoma). No alto,
pendurada, a luminária de latão em estrela facetada de oito pontas.

A luz:
- a sala tem geometria de verdade (câmera em perspectiva): cada pixel sabe onde está no espaço (X, altura, fundo) e
  "olha" para a luz até a parede do fundo; se o raio sai pelo vidro do óculo, recebe luz, se bate no ferro do
  caixilho ou na pedra, fica na sombra. Por isso o desenho radial do caixilho aparece projetado no chão, no atril e
  na vitrine, e também no ar (o feixe volumétrico é a soma de vários planos de profundidade traçados do mesmo jeito);
- os objetos (atril, vitrine, cesto, luminária) fazem sombra pelo traçado em tela, como na estufa;
- manhã: sol frio-dourado alto pelo óculo, feixe nítido pousando no livro, na estrela e no tapete, poeira brilhando;
- tarde: poente âmbar baixo, feixe longo e quase deitado atravessando a sala até a vitrine: vidros e cristais
  refletem (brilhos especulares e manchas de cor), sombras compridas; a lamparina já acesa, fraca;
- noite: luar azul fraco pelo óculo sobre o tapete, e a lamparina, o castiçal e a luminária-estrela acesos, com
  brilho (bloom) e os furinhos da estrela salpicando luz no forro; os cristais da vitrine brilham de leve;
- profundidade de campo, sombras de contato, mapeamento de tom, correção de cor, vinheta e grão.

Composição para a interface: os 42% da esquerda (x < 200) ficam calmos e escuros (o texto vai ali); o óculo com o
feixe, o atril com a estrela e a vitrine ficam do centro para a direita. O chão em x 330–380 fica livre para o gato
(pés em y ≈ 150, em cima do tapete). A coruja pousa na cornija da vitrine em POLEIRO, com a parede livre acima.

Gera em public/pixel/paginas/: gabinete-{manha,tarde,noite}.webp (1440 x 480), -960.webp (960 x 320) e
-movel.webp (888 x 480: de x 184 até a borda, a janela do celular).
Uso: python3 scripts/gerar_cena_gabinete.py [manha|tarde|noite ...]  (precisa de numpy e Pillow)
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

# ── Câmera (perspectiva simples): X para a direita, Y para cima (altura), Z para o fundo; olho na altura HC.
XC, YH, F, D, HC = 300.0, 80.0, 80.0, 1.0, 1.0
PISO_Y = 122                                   # junção da parede do fundo com o assoalho
ZB = F * HC / (PISO_Y - YH) - D                # profundidade da parede do fundo (0,905)
TETO_Y = 12                                    # onde o forro encontra a parede do fundo
YR = HC - (TETO_Y - YH) * (ZB + D) / F         # altura do forro (2,62)
SW = (ZB + D) / F                              # quanto vale 1 px da arte na parede do fundo (unidade de mundo)
RODATETO_Y = 16                                # fim da cornija de madeira sob o forro
LAMBRI_Y = 89                                  # topo do lambri (a moldura de cadeira)

OCULO = (282.0, 41.0)                          # centro do óculo na parede do fundo
R_VIDRO = 18.0                                 # raio do vidro (px na parede)
R_PEDRA = 26.0                                 # raio de fora do arco de aduelas

# Objetos (x0, x1, topo, base) e profundidades.
GAV = (198, 258, 81, 124)                      # móvel de gavetinhas, encostado na parede
Z_GAV = 0.80
Z_ATRIL = 0.35
ATRIL_X = 300                                  # eixo do atril
VIT = (392, 470, 41, 141)                      # vitrine: frente (x0, x1), cornija (topo) e chão
Z_VIT = 0.30
Z_VIT_FUNDO = 0.56
PRAT = (316, 372, 80)                          # prateleira da parede: x0, x1, tampo

POLEIRO = (431, 41)                            # pés da coruja: o topo da cornija da vitrine
LAMPARINA = (213.5, 66.5)                      # chama da lamparina no móvel de gavetinhas
CASTICAL = (362.5, 64.5)                       # chama do castiçal na prateleira da parede
ESTRELA = (350.5, 31.5)                        # centro da luminária-estrela pendurada
MOVEL_X0 = 184                                 # recorte do celular


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


def hash_arr(a, b, s: int) -> np.ndarray:
    """hash01 vetorizado para índices inteiros (painéis de vidro, lajotas)."""
    a = np.asarray(a).astype(np.int64)
    b = np.asarray(b).astype(np.int64)
    h = (a * 73856093) ^ (b * 19349663) ^ (s * 83492791)
    h = (h ^ (h >> 13)) * 1274126177
    return (((h >> 9) & 0xFFFF) / 65535.0).astype(np.float32)


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
        rgb = hexa(cor)
        bloco = self.c[ya:yb, xa:xb]
        ba = bloco[:, :, 3:4]
        na = a + ba * (1 - a)
        bloco[:, :, :3] = (rgb * a + bloco[:, :, :3] * ba * (1 - a)) / np.maximum(na, 1e-6)
        bloco[:, :, 3:4] = na

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


def tons_arr(tons, k: np.ndarray) -> np.ndarray:
    paleta = np.stack([hexa(t) for t in tons])
    i = np.clip((np.clip(k, 0, 0.999) * len(tons)).astype(int), 0, len(tons) - 1)
    return paleta[i]


def perto(u, passo, larg, desl=0.0):
    """Distância de u à linha de grade mais próxima (mesma unidade) e se está dentro da largura."""
    f = (u - desl) / passo
    d = np.abs(f - np.round(f)) * passo
    return d < larg / 2


# Paletas (do escuro ao claro). A luz da hora entra depois, na montagem.
LATAO = ["#2a1a08", "#5a3a12", "#8a5e1e", "#b4802c", "#d6a242", "#efc66e", "#fff0b8"]
FERRO = ["#0e0e10", "#18181c", "#24242a", "#34343c", "#4a4a54", "#6a6a76"]
NOGUEIRA = ["#0e0805", "#170e08", "#21140b", "#2c1a0f", "#382214", "#462b19", "#56351f", "#684226"]
MOGNO = ["#120605", "#1e0c08", "#2c120b", "#3c1a10", "#4e2416", "#622e1c", "#7a3c24", "#934c2e"]
ASSOALHO = ["#120b06", "#1d120a", "#29190e", "#362113", "#442a18", "#55351e", "#684226"]
PEDRA = ["#18140f", "#241d16", "#30271e", "#3d3227", "#4b3e31", "#5b4b3a", "#6e5b46"]
VELUDO = ["#03100c", "#061a14", "#0a271e", "#0f362a", "#154737", "#1b5a46", "#247058", "#33896c"]
PERGAMINHO = ["#4a3a22", "#7a6644", "#a8936a", "#cbb88e", "#e6d8b2", "#f6edd2"]
FITA = ["#06241c", "#0C3C34", "#17675B", "#2a8a74", "#52b090"]
FITA_VERM = ["#3a0c0a", "#6a1a14", "#9a2a1e", "#c24a32"]
COURO = ["#170705", "#2a0e09", "#40160e", "#581f13", "#702a18"]
VIME = ["#2a1c0c", "#46301a", "#644626", "#82603a", "#a07c4c"]
CERA = ["#b8a888", "#d8ccac", "#efe6cc", "#fff8e8"]
OSSO = ["#6a604c", "#9a8e72", "#c8bc9c", "#e8dec2"]
ESMERALDA = ["#06261c", "#0e4a36", "#17675B", "#2fa080", "#7fe0b8", "#dcfff2"]
CITRINO = ["#4a2c06", "#8a5a12", "#c88a28", "#e4b85c", "#ffe49a", "#fffbe0"]
AGUA = ["#082430", "#145266", "#2a8aa0", "#5cc4d4", "#a8eef4", "#eaffff"]
ROSA = ["#3e1418", "#743038", "#b0606a", "#e0a0a4", "#fbe0e0"]
RUBI = ["#2a0606", "#661010", "#a82020", "#e0503c", "#ffb0a0"]
OURO = "#E4B85C"


# ─────────────────────────────── Horas do dia ───────────────────────────────
def _rumo_para(x: float, y: float, z: float) -> tuple:
    """Direção (X, Y, Z) que vai do ponto (x, y da arte na profundidade z) até o centro do óculo: a luz que pousa ali."""
    X = (x - XC) * (z + D) / F
    Y = HC - (y - YH) * (z + D) / F
    Xo = (OCULO[0] - XC) * SW
    Yo = HC - (OCULO[1] - YH) * SW
    return (Xo - X, Yo - Y, ZB - z)


PERIODOS = {
    "manha": dict(
        ceu=("#5a9ee8", "#a6d2f4", "#eef4f0"), morro=("#7e9cb0", "#a4bccc"), torre="#8c98a4", copa="#2c4a3a",
        amb="#b0aca8", amb_k=1.05, oculo_luz="#e0ecf4", oculo_k=1.0,
        sol="#ffe2a8", sol_k=1.45, rumo=_rumo_para(336, 150, 0.143), feixe=0.95, lamp=0.0, castical=0.0, estrela=0.0,
        quente="#fff0d2", fria="#36425c", cristal=0.0),
    "tarde": dict(
        ceu=("#4a3e7a", "#e08a62", "#ffc884"), morro=("#6a4050", "#8e5c5a"), torre="#5a3a40", copa="#2a1a1c",
        amb="#a88478", amb_k=0.85, oculo_luz="#ffb070", oculo_k=1.0,
        sol="#ff9448", sol_k=2.15, rumo=_rumo_para(418, 86, Z_VIT), feixe=1.5, lamp=0.45, castical=0.0, estrela=0.0,
        quente="#ffd6a0", fria="#3c2e46", cristal=0.0),
    "noite": dict(
        ceu=("#070d24", "#10204a", "#22396c"), morro=("#0c1630", "#142244"), torre="#0e1630", copa="#060c18",
        amb="#62729c", amb_k=0.85, oculo_luz="#7894d0", oculo_k=0.7,
        sol="#a8c4ff", sol_k=1.2, rumo=_rumo_para(366, 146, 0.20), feixe=0.8, lamp=1.6, castical=1.4, estrela=1.5,
        quente="#ffd08e", fria="#121c36", cristal=1.0),
}


# ─────────────────────────────── Geometria ───────────────────────────────
def mundo(x, y, z):
    """Ponto da tela (x, y em pixels da arte) na profundidade z → (X, altura)."""
    X = (x - XC) * (z + D) / F
    Y = HC - (y - YH) * (z + D) / F
    return X, Y


def tela(X, Y, Z):
    s = F / (Z + D)
    return XC + X * s, YH + (HC - Y) * s


def z_chao(y):
    return F * HC / np.maximum(y - YH, 1e-3) - D


def z_teto(y):
    return F * (HC - YR) / np.minimum(y - YH, -1e-3) - D


def caixilho_oculo(dx, dy, fator: float = 1.0):
    """O caixilho do óculo em px da parede, relativo ao centro: aro, anel, cubo e oito raios girados 22,5° (nenhum na
    vertical nem na horizontal: nada de cruz). Devolve (ferro, chumbo, setor, faixa)."""
    r = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx)
    aro = r > R_VIDRO - 1.6 * fator
    anel = np.abs(r - 8.6) < 0.95 * fator
    cubo = r < 2.3 * fator + 0.3
    a = np.mod(ang - math.pi / 8, math.pi / 4)
    da = np.minimum(a, math.pi / 4 - a)
    raio = (r * np.sin(da) < 0.8 * fator) & (r > 2)
    ferro = aro | anel | cubo | raio
    chumbo = np.zeros_like(r, dtype=bool)
    setor = np.floor(np.mod(ang - math.pi / 8, math.tau) / (math.pi / 4)).astype(int)
    faixa = np.digitize(r, [8.6, 13.4])
    return ferro, chumbo, setor, faixa


def transmissao(X, Y, Z, rumo, fator: float = 1.0) -> np.ndarray:
    """Quanto de luz chega no ponto (X, Y, Z) vindo da direção `rumo`: anda até a parede do fundo e olha o que há lá
    (o vidro do óculo, o ferro do caixilho ou a pedra). A luz só entra pelo óculo."""
    lx, ly, lz = rumo
    t = (ZB - Z) / max(lz, 1e-6)
    ex, ey = X + lx * t, Y + ly * t
    xw = XC + ex / SW
    yw = YH + (HC - ey) / SW
    dx, dy = xw - OCULO[0], yw - OCULO[1]
    r = np.hypot(dx, dy)
    ferro, chumbo, setor, faixa = caixilho_oculo(dx, dy, fator)
    v = (r < R_VIDRO).astype(np.float32) * (1 - ferro) * (1 - 0.7 * chumbo)
    v = v * (0.88 + 0.12 * hash_arr(setor, faixa, 5))         # vidro antigo: cada vidrinho passa um pouco diferente
    v = np.where((Z > ZB - 0.004) | (Y < -0.01) | (Y > YR), 0.0, v)
    return v.astype(np.float32)


# ─────────────────────────────── Lá fora (visto pelo óculo) ───────────────────────────────
def pintar_fora(nome: str, per: dict) -> np.ndarray:
    """O céu da hora, o morro, a torre do castelo ao longe e um galho na frente. Só aparece pelo vidro do óculo."""
    ox, oy = OCULO
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    t = np.clip((_YS - (oy - 20)) / 40, 0, 1)[:, :, None]
    ceu = np.where(t < 0.55, topo * (1 - t / 0.55) + meio * (t / 0.55), meio * (1 - (t - 0.55) / 0.45) + horiz * ((t - 0.55) / 0.45))
    ceu = ceu.astype(np.float32)
    nuv = ruido(41, 9, 3) * 0.6 + ruido(42, 4, 2) * 0.4
    v = np.clip((nuv - 0.52) * 3.2 * np.exp(-((_YS - oy + 6) / 8) ** 2), 0, 0.8)
    if nome == "manha":
        ceu = ceu * (1 - v[:, :, None] * 0.8) + hexa("#ffffff") * v[:, :, None] * 0.8
        ceu += (np.exp(-np.hypot(_XS - (ox - 14), _YS - (oy - 18)) / 18) * 0.45)[:, :, None] * hexa("#fff4d8")
    elif nome == "tarde":
        cn = np.where((np.roll(nuv, -1, 0) < nuv)[:, :, None], hexa("#ffd8a8"), hexa("#b06a7a"))
        ceu = ceu * (1 - v[:, :, None] * 0.85) + cn * v[:, :, None] * 0.85
        d = np.hypot(_XS - (ox - 9), (_YS - (oy + 9)) * 1.1)
        ceu += (np.exp(-d / 12) * 0.9)[:, :, None] * hexa("#ffc070")
        ceu = np.where((d < 3.6)[:, :, None], hexa("#fff2c8") * 1.3, ceu)
    else:
        g = np.random.default_rng(17)
        for _ in range(90):
            x, y = int(ox - 20 + g.random() * 40), int(oy - 20 + g.random() * 40)
            ceu[y, x] += (0.25 + g.random() ** 2 * 0.9) * hexa("#e4ecff")
        lx, ly = ox - 7.0, oy - 8.0
        dl = np.hypot(_XS - lx, _YS - ly)
        lua = np.clip(4.4 - dl, 0, 1)
        mares = ruido(44, 2) > 0.62
        cor_lua = np.where(mares[:, :, None], hexa("#c8ccd8"), hexa("#f4f2e4"))
        ceu = ceu * (1 - lua[:, :, None]) + cor_lua * lua[:, :, None] * 1.2
        ceu += (np.exp(-dl / 9) * 0.4)[:, :, None] * hexa("#9ab4f0")
        ceu = ceu * (1 - v[:, :, None] * 0.35) + hexa("#2a3a60") * v[:, :, None] * 0.35
    # morros em duas camadas e a torre do castelo ao longe (telhado cônico, janelinha)
    m0, m1 = hexa(per["morro"][0]), hexa(per["morro"][1])
    for x in range(int(ox - 20), int(ox + 21)):
        y1 = oy + 6 + 2.5 * math.sin(x / 6.0) + 1.5 * math.sin(x / 2.3 + 1)
        y0 = oy + 10 + 2 * math.sin(x / 4.0 + 2)
        for y in range(int(y1), int(oy + 21)):
            ceu[y, x] = m1 * 0.75 + ceu[y, x] * 0.25
        for y in range(int(y0), int(oy + 21)):
            ceu[y, x] = m0
    tx = int(ox + 7)
    tor = hexa(per["torre"])
    for y in range(int(oy - 3), int(oy + 12)):
        for x in range(tx - 2, tx + 3):
            ceu[y, x] = tor * (1.12 if x == tx - 2 else 0.9 if x == tx + 2 else 1.0)
    for k in range(6):
        for x in range(tx - 3 + k // 2, tx + 4 - k // 2):
            ceu[int(oy - 4 - k), x] = tor * 0.78
    ceu[int(oy + 1), tx] = hexa("#ffcf70") * (1.4 if nome == "noite" else 0.4)
    ceu[int(oy - 2), tx - 3] = tor * 0.7
    ceu[int(oy - 2), tx + 3] = tor * 0.7
    # galho com folhas entrando pela esquerda do óculo (contra a luz)
    copa = hexa(per["copa"])
    g = np.random.default_rng(23)
    for i in range(16):
        x = ox - 20 + i
        y = oy - 11 + i * 0.35 + math.sin(i / 2.0) * 0.8
        ceu[int(y), int(x)] = copa * 0.8
        if i % 2 == 0:
            for _ in range(5):
                fx, fy = x + g.normal(0, 1.6), y + g.normal(-0.5, 1.6)
                ceu[int(fy), int(fx)] = copa * (0.9 + 0.3 * g.random())
    return np.clip(ceu, 0, 1.6)


# ─────────────────────────────── Pincéis de marcenaria ───────────────────────────────
def madeira(c: Camada, x0, y0, w, h, tons, seed: int, k0: float = 0.5, amp: float = 0.28, vertical: bool = False) -> None:
    """Retângulo de madeira com veio (manchas alongadas e linhas finas) e nós raros."""
    x0, y0, w, h = int(x0), int(y0), int(w), int(h)
    if w <= 0 or h <= 0:
        return
    m = np.zeros((H, W), dtype=np.float32)
    m[max(0, y0):max(0, y0 + h), max(0, x0):max(0, x0 + w)] = 1
    veio = ruido(seed, 1, 9) if vertical else ruido(seed, 11, 1)
    fino = ruido(seed + 1, 1, 4) if vertical else ruido(seed + 1, 5, 1)
    k = k0 + (veio - 0.5) * amp + (fino - 0.5) * amp * 0.6
    linhas = (np.sin((_XS if vertical else _YS) * 2.1 + veio * 9) > 0.86)
    k = np.where(linhas, k - 0.09, k)
    c.mascara(m, tons_arr(tons, k))


def bisel(c: Camada, x0, y0, w, h, tons, k: float, seed: int, vertical: bool = False) -> None:
    """Almofada em relevo: borda clara em cima e à esquerda, escura embaixo e à direita, campo com veio."""
    madeira(c, x0, y0, w, h, tons, seed, k, vertical=vertical)
    c.ret(x0, y0, w, 1, tons_idx(tons, k + 0.28))
    c.ret(x0, y0, 1, h, tons_idx(tons, k + 0.18))
    c.ret(x0, y0 + h - 1, w, 1, tons_idx(tons, k - 0.3))
    c.ret(x0 + w - 1, y0, 1, h, tons_idx(tons, k - 0.22))


# ─────────────────────────────── Estrutura: forro, parede de pedra, lambri, óculo ───────────────────────────────
def estrutura() -> dict:
    """Forro de vigas, cornija, parede de pedra lavrada com o óculo (arco de aduelas, caixilho radial) e o lambri de
    nogueira com almofadas. Devolve a camada e o mapa do vidro do óculo."""
    c = Camada()
    px, py = _XS + 0.5, _YS + 0.5

    # ── Forro (y < TETO_Y): vigas correndo para o fundo e tábuas atravessadas.
    zt = z_teto(py)
    Xt, _ = mundo(px, py, zt)
    teto = py < TETO_Y
    viga = perto(Xt, 0.62, 0.15)
    dv = (Xt / 0.62 - np.round(Xt / 0.62)) * 0.62 * F / (zt + D)
    k = 0.3 + (ruido(31, 9, 1) - 0.5) * 0.14 + 0.05 * np.sign(np.sin(zt * 52))
    k = np.where(perto(zt, 0.075, 0.008), 0.06, k)
    k = np.where(viga, 0.42 + 0.22 * (dv < -0.5) - 0.2 * (dv > 0.9), k)
    k -= 0.12 * (1 - py / TETO_Y)
    c.mascara(teto.astype(np.float32), tons_arr(NOGUEIRA, k))

    # ── Parede de pedra lavrada (silhar): fiadas de 7 px, juntas desencontradas, faces cinzeladas.
    parede = (py >= RODATETO_Y) & (py < LAMBRI_Y)
    fi = np.floor((py - RODATETO_Y) / 7).astype(int)
    ey = (py - RODATETO_Y) % 7
    bx = np.zeros((H, W), dtype=int)
    ex = np.zeros((H, W), dtype=np.float32)
    larg = np.ones((H, W), dtype=np.float32)
    gp = np.random.default_rng(32)
    for f_ in range(0, (LAMBRI_Y - RODATETO_Y) // 7 + 2):
        bordas = [-gp.random() * 20]
        while bordas[-1] < W + 30:
            bordas.append(bordas[-1] + 11 + gp.random() * 17)
        bordas = np.array(bordas)
        linha = fi == f_
        idx = np.clip(np.searchsorted(bordas, px[0], side="right") - 1, 0, len(bordas) - 2)
        bx = np.where(linha, idx[None, :] + f_ * 100, bx)
        ex = np.where(linha, (px[0] - bordas[idx])[None, :], ex)
        larg = np.where(linha, (bordas[idx + 1] - bordas[idx])[None, :], larg)
    n = ruido(34, 2)
    kp = 0.44 + (hash_arr(bx, fi, 35) - 0.5) * 0.22 + (n - 0.5) * 0.16
    kp += 0.1 * (ey < 1) + 0.05 * (ex < 1.2) - 0.08 * (ey > 5.2) - 0.05 * (ex > larg - 1.5) + (ruido(30, 6, 3) - 0.5) * 0.12
    junta = (ey > 6.1) | (ex > larg - 0.8)
    kp = np.where(junta, 0.1, kp)
    lasca = (ruido(36, 3) > 0.74) & ~junta
    kp = np.where(lasca, kp - 0.12, kp)
    kp -= 0.1 * np.clip((RODATETO_Y + 14 - py) / 14, 0, 1)        # sombra da cornija
    cor = tons_arr(PEDRA, kp)
    quente = hash_arr(bx, fi, 37) > 0.72
    cor = np.where(quente[:, :, None], cor * np.array([1.07, 1.0, 0.9], dtype=np.float32), cor)
    c.mascara(parede.astype(np.float32), cor)

    # ── O óculo: arco de aduelas em leque, fecho no alto, o vão fundo (ombreira) e o caixilho radial.
    ox, oy = OCULO
    dx, dy = px - ox, py - oy
    r = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx)
    aduela = (r >= R_VIDRO + 2) & (r < R_PEDRA)
    na = 14
    ia = np.floor(np.mod(ang + math.pi / 2 + math.pi / na, math.tau) / (math.tau / na)).astype(int)
    fa = np.mod(ang + math.pi / 2 + math.pi / na, math.tau) / (math.tau / na) - ia
    ka = 0.5 + (hash_arr(ia, 3, 38) - 0.5) * 0.16 + (n - 0.5) * 0.12
    ka += 0.14 * (dy < 0) * (np.abs(dy) / R_PEDRA) - 0.1 * (dy > 0) * (dy / R_PEDRA)
    ka += 0.12 * (r > R_PEDRA - 1.2) * (dy < 0) - 0.12 * (r < R_VIDRO + 3)
    ka = np.where((fa < 0.07) | (fa > 0.93) | (r > R_PEDRA - 0.6), 0.07, ka)
    fecho = (ia == 0) & aduela
    ka = np.where(fecho, ka + 0.08, ka)
    c.mascara(aduela.astype(np.float32), tons_arr(PEDRA, ka))
    # o fecho sobressai um pouco acima do arco
    for yy in range(int(oy - R_PEDRA - 2), int(oy - R_PEDRA + 1)):
        for xx in range(int(ox - 3), int(ox + 4)):
            c.p(xx, yy, tons_idx(PEDRA, 0.62 if yy == int(oy - R_PEDRA - 2) else 0.5 - 0.04 * (xx - ox)))
    # a ombreira (a espessura da parede): em cima é sombra, embaixo o peitoril recebe a luz de fora
    ombreira = (r >= R_VIDRO) & (r < R_VIDRO + 2)
    k_omb = np.where(dy > 0, 0.55 + 0.25 * (dy / R_VIDRO), 0.12)
    c.mascara(ombreira.astype(np.float32), tons_arr(PEDRA, k_omb))
    # caixilho de ferro (com um fio de latão no anel e no cubo)
    ferro, chumbo, setor, faixa = caixilho_oculo(dx, dy)
    vidro = (r < R_VIDRO)
    kf = 0.5 + 0.28 * (dy < 0) * (r > R_VIDRO - 1.6) - 0.15 * (dx > 0) + (ruido(39, 2) - 0.5) * 0.12
    c.mascara((vidro & ferro).astype(np.float32), tons_arr(FERRO, kf))
    latao = vidro & ((np.abs(r - 8.6) < 0.35) | (r < 1.3))
    c.mascara(latao.astype(np.float32), hexa(LATAO[4]))
    c.mascara((vidro & chumbo & ~ferro).astype(np.float32), hexa("#202428"), 0.8)
    vid = (vidro & ~ferro & ~chumbo).astype(np.float32)
    # vidro antigo: cada vidrinho com um tom (claro, âmbar bem leve, verde-garrafa bem leve)
    hq = hash_arr(setor, faixa, 71)
    var = np.ones((H, W, 3), dtype=np.float32) * (0.9 + 0.16 * hq)[:, :, None]
    var = np.where((hq > 0.72)[:, :, None], var * np.array([1.05, 1.0, 0.84], dtype=np.float32), var)
    var = np.where((hq < 0.2)[:, :, None], var * np.array([0.88, 1.0, 0.95], dtype=np.float32), var)

    # ── Cornija de madeira sob o forro (perfil em degraus, com dentículos).
    for x in range(W):
        c.p(x, TETO_Y, NOGUEIRA[2])
        c.p(x, TETO_Y + 1, NOGUEIRA[6])
        c.p(x, TETO_Y + 2, NOGUEIRA[4] if x % 4 else NOGUEIRA[2])
        c.p(x, TETO_Y + 3, NOGUEIRA[3] if x % 4 < 2 else NOGUEIRA[5])
        c.p(x, RODATETO_Y, "#000000", 0.45)

    # ── Lambri de nogueira: moldura de cadeira, montantes, almofadas em relevo e rodapé.
    for x in range(W):
        c.p(x, LAMBRI_Y, NOGUEIRA[6])
        c.p(x, LAMBRI_Y + 1, NOGUEIRA[7] if x % 7 else NOGUEIRA[5])
        c.p(x, LAMBRI_Y + 2, NOGUEIRA[3])
        c.p(x, LAMBRI_Y + 3, NOGUEIRA[1])
    madeira(c, 0, LAMBRI_Y + 4, W, PISO_Y - LAMBRI_Y - 4, NOGUEIRA, 40, 0.42)
    passo = 27
    for k, x0 in enumerate(range(3, W, passo)):
        bisel(c, x0, LAMBRI_Y + 7, passo - 6, 19, NOGUEIRA, 0.5 + (hash01(k, 41) - 0.5) * 0.08, 42 + k, vertical=True)
        c.ret(x0 + 3, LAMBRI_Y + 10, passo - 12, 1, NOGUEIRA[2], 0.6)
        c.ret(x0 - 3, LAMBRI_Y + 4, 1, PISO_Y - LAMBRI_Y - 8, NOGUEIRA[2])   # junta do montante
    for x in range(W):
        c.p(x, PISO_Y - 4, NOGUEIRA[5])
        c.p(x, PISO_Y - 3, NOGUEIRA[3])
        c.p(x, PISO_Y - 2, NOGUEIRA[2])
        c.p(x, PISO_Y - 1, NOGUEIRA[1])

    # ── Esteio de madeira na quina do lado calmo (separa a estante do gabinete).
    for y in range(RODATETO_Y, PISO_Y):
        for x in range(186, 193):
            u = (x - 186) / 6
            c.p(x, y, tons_idx(NOGUEIRA, 0.62 - abs(u - 0.3) * 0.6 + (hash01(x, y // 3, 43) - 0.5) * 0.06))
    for (yy, alt) in ((RODATETO_Y, 3), (LAMBRI_Y - 1, 4)):
        c.ret(184, yy, 11, alt, NOGUEIRA[5])
        c.ret(184, yy, 11, 1, NOGUEIRA[7])

    # ── Arandela apagada de ferro na pedra (entre o óculo e a prateleira), com um fio de fuligem.
    for y in range(52, 62):
        c.p(326, y, "#000000", 0.08 * (62 - y) / 10)
    c.ret(324, 62, 5, 2, FERRO[3])
    c.ret(325, 64, 3, 3, FERRO[2])
    c.p(326, 61, CERA[0])
    return dict(c=c, vidro=vid, var=var)


# ─────────────────────────────── Assoalho e tapete ───────────────────────────────
TAPETE = (-0.85, 1.45, 0.06, 0.64)   # X0, X1, Z0, Z1 em mundo


def chao() -> tuple[Camada, np.ndarray]:
    """Assoalho de tábuas correndo para o fundo (perspectiva), com emendas, veio e cera; e o tapete de padrão
    geométrico (barra, faixas com losangos, campo em treliça e medalhão octogonal), com franja na frente."""
    c = Camada()
    py = _YS + 0.5
    px = _XS + 0.5
    m = py >= PISO_Y
    zc = z_chao(np.maximum(py, PISO_Y + 0.01))
    X, _ = mundo(px, py, zc)
    esc = F / (zc + D)
    tab = np.floor(X / 0.17).astype(int)
    eu = (X / 0.17) % 1
    du = np.minimum(eu, 1 - eu) * 0.17 * esc
    emenda_z = (zc + hash_arr(tab, 1, 50) * 0.9) % 0.9
    demenda = np.minimum(emenda_z, 0.9 - emenda_z) * 103 / (zc + D) ** 2
    veio = np.sin(X * 140 + hash_arr(tab, 2, 51) * 30 + np.sin(zc * 18 + tab) * 2.4)
    k = 0.52 + (hash_arr(tab, np.floor((zc + hash_arr(tab, 1, 50) * 0.9) / 0.9), 52) - 0.5) * 0.22 + veio * 0.06
    k += (ruido(53, 6, 2) - 0.5) * 0.12
    k = np.where(du < 0.6, 0.06, np.where(du < 1.2, k - 0.12, k))
    k = np.where(demenda < 0.55, 0.08, k)
    k -= 0.14 * np.clip((zc - 0.5) / 0.4, 0, 1)
    cor = tons_arr(ASSOALHO, k)
    c.mascara(m.astype(np.float32), cor)
    # pregos nas emendas
    g = np.random.default_rng(54)
    for _ in range(40):
        x, y = g.random() * W, PISO_Y + 2 + g.random() * 36
        c.p(x, y, "#0c0806", 0.6)

    # ── O tapete.
    x0, x1, z0, z1 = TAPETE
    u = (X - x0) / (x1 - x0)
    v = (zc - z0) / (z1 - z0)
    dentro = m & (u >= 0) & (u < 1) & (v >= 0) & (v < 1)
    nx, nz = 62, 19
    i = np.floor(u * nx).astype(int)
    j = np.floor(v * nz).astype(int)
    b = np.minimum(np.minimum(i, nx - 1 - i), np.minimum(j, nz - 1 - j))
    pal = {
        "barra": "#24100a", "verm": "#6a2216", "verm2": "#8a3220", "ouro": "#a8803a", "ouro2": "#c89a4c",
        "esm": "#103a30", "esm2": "#1a5446", "creme": "#d8c8a0", "azul": "#1a2238",
    }
    cores = np.zeros((H, W, 3), dtype=np.float32)

    def pinta(mask, nome):
        nonlocal cores
        cores = np.where(mask[:, :, None], hexa(pal[nome]), cores)

    pinta(np.ones((H, W), bool), "esm")
    lat = ((i - j * 2) % 8 == 0) | ((i + j * 2) % 8 == 0)
    pinta(lat, "esm2")
    centro_l = ((i % 8) == 4) & ((j % 4) == 0)
    pinta(centro_l, "ouro")
    pinta((b >= 1) & (b <= 3), "verm")
    dia = ((i + j) % 4 == 0) | ((i - j) % 4 == 0)
    pinta((b == 2) & dia, "ouro2")
    pinta((b == 4), "ouro")
    pinta(b == 0, "barra")
    # medalhão octogonal no meio, com uma estrela de oito pontas em losangos
    di, dj = (i - nx / 2 + 0.5), (j - nz / 2 + 0.5) * 2.1
    oct_ = np.maximum(np.maximum(np.abs(di), np.abs(dj)), (np.abs(di) + np.abs(dj)) * 0.72)
    pinta(oct_ < 9.5, "verm")
    pinta(np.abs(oct_ - 8.5) < 0.6, "ouro2")
    pinta(oct_ < 6.6, "azul")
    quadrado = np.maximum(np.abs(di), np.abs(dj))
    losango = (np.abs(di) + np.abs(dj)) * 0.7071
    pinta(np.minimum(quadrado, losango) < 4.3, "ouro")
    pinta(np.maximum(quadrado, losango) < 3.2, "verm2")
    pinta(losango < 1.6, "ouro2")
    # lã: felpa e desgaste
    felpa = 0.86 + 0.18 * hash_arr(_XS.astype(int), _YS.astype(int), 55)
    gasto = 1 - 0.18 * (ruido(56, 7, 3) > 0.68)
    cores = cores * (felpa * gasto)[:, :, None]
    cores *= (1 - 0.18 * np.clip((zc - 0.3) / 0.4, 0, 1))[:, :, None]
    c.mascara(dentro.astype(np.float32), cores)
    # espessura do tapete na frente e a franja de fios claros
    yf = int(round(YH + HC * F / (z0 + D)))
    xa = int(XC + x0 * F / (z0 + D))
    xb = int(XC + x1 * F / (z0 + D))
    for x in range(xa, xb):
        c.p(x, yf, "#1a0806")
        if x % 2 == 0:
            c.p(x, yf + 1, "#cfc0a0", 0.85)
            c.p(x + (x % 4 == 0), yf + 2, "#a89878", 0.6)
    return c, dentro.astype(np.float32)


# ─────────────────────────────── Esquerda (calma): cortina, estante, poltrona, globo ───────────────────────────────
def lado_esquerdo() -> tuple[Camada, Camada]:
    """Devolve (estante e globo, encostados no fundo; poltrona e cortina, mais perto)."""
    c, p = Camada(), Camada()
    # ── Estante de livros encostada na parede.
    x0, x1, yt, yb = 24, 152, 22, 124
    madeira(c, x0, yt, x1 - x0, yb - yt, NOGUEIRA, 60, 0.2)
    for (yy, cor) in ((yt, NOGUEIRA[6]), (yt + 1, NOGUEIRA[4]), (yt + 2, NOGUEIRA[5]), (yt + 3, NOGUEIRA[2])):
        c.ret(x0 - 2, yy, x1 - x0 + 4, 1, cor)
    for (xx, w) in ((x0, 4), (x1 - 4, 4), ((x0 + x1) // 2 - 1, 3)):
        madeira(c, xx, yt + 4, w, yb - yt - 4, NOGUEIRA, 61 + xx, 0.5, vertical=True)
        c.ret(xx, yt + 4, 1, yb - yt - 4, NOGUEIRA[6])
    g = np.random.default_rng(62)
    lomb = [("#3a1410", "#5a2016"), ("#14301e", "#1e4a2c"), ("#2a1e10", "#44301a"), ("#1a2036", "#28304e"),
            ("#3e2a10", "#5e4018"), ("#2e0e14", "#481822")]
    prateleiras = (40, 58, 76, 94)
    for k, ys in enumerate(prateleiras):
        c.ret(x0 + 4, ys, x1 - x0 - 8, 2, NOGUEIRA[5])
        c.ret(x0 + 4, ys, x1 - x0 - 8, 1, NOGUEIRA[7])
        c.ret(x0 + 4, ys + 2, x1 - x0 - 8, 1, NOGUEIRA[1])
        x = x0 + 5
        while x < x1 - 6:
            if abs(x - ((x0 + x1) // 2)) < 3:
                x = (x0 + x1) // 2 + 3
                continue
            r = g.random()
            if r < 0.07:   # vão com um objeto: pote, ampulheta pequena ou livros deitados
                tipo = int(g.random() * 3)
                if tipo == 0:
                    c.ret(x, ys - 6, 5, 6, "#3a4a46")
                    c.ret(x + 1, ys - 7, 3, 1, "#5a4a34")
                    c.p(x, ys - 5, "#7a8a86")
                elif tipo == 1:
                    for jj in range(3):
                        c.ret(x - 1, ys - 2 - jj * 2, 12, 2, lomb[int(g.random() * 6)][1])
                        c.ret(x - 1, ys - 2 - jj * 2, 12, 1, lomb[int(g.random() * 6)][1], 0.5)
                    x += 6
                else:
                    c.ret(x, ys - 8, 4, 1, LATAO[2])
                    c.ret(x, ys - 1, 4, 1, LATAO[2])
                    c.ret(x + 1, ys - 7, 2, 6, "#6a5a40")
                x += 7
                continue
            w = 2 + int(g.random() * 3)
            h = 11 + int(g.random() * 5)
            esc_, cla = lomb[int(g.random() * len(lomb))]
            inclina = g.random() < 0.06
            for xx in range(x, x + w):
                for yy in range(ys - h, ys):
                    xi = xx + (int((ys - yy) * 0.35) if inclina else 0)
                    cor = cla if xx == x else esc_
                    if yy in (ys - h + 2, ys - 3):
                        cor = "#6a5426"   # filete dourado gasto
                    c.p(xi, yy, cor)
            c.ret(x, ys - h, w, 1, mistura(cla, "#000000", 0.3))
            x += w + (1 if inclina else 0)
    # parte de baixo: portas de almofada e puxadores
    for k in range(2):
        bisel(c, x0 + 6 + k * 61, 99, 56, 21, NOGUEIRA, 0.42, 63 + k, vertical=True)
        c.p(x0 + 58 + k * 61, 108, LATAO[3])
    c.ret(x0 - 1, 97, x1 - x0 + 2, 2, NOGUEIRA[6])

    # ── Globo terrestre no pé de madeira (mapa inventado, sem letreiro).
    gx, gy, gr = 168.0, 104.0, 8.5
    terra = ruido(64, 4) > 0.56
    for y in range(int(gy - gr), int(gy + gr) + 1):
        for x in range(int(gx - gr), int(gx + gr) + 1):
            d = math.hypot(x + 0.5 - gx, y + 0.5 - gy)
            if d < gr:
                k = 0.62 - d / gr * 0.35 - (x - gx) / gr * 0.12
                cor = mistura("#5a4a2a", "#a8905a", k) if terra[y, x * 2 % W] else mistura("#0e2a2a", "#2a5a54", k)
                c.p(x, y, cor)
    for k in range(40):
        a_ = k / 40 * math.tau
        c.p(gx + math.cos(a_) * (gr + 1.2), gy + math.sin(a_) * (gr + 1.2) * 1.0, LATAO[3] if math.sin(a_) < 0 else LATAO[1])
    c.linha(gx, gy + gr + 1, gx, 120, NOGUEIRA[5])
    c.linha(gx + 1, gy + gr + 1, gx + 1, 120, NOGUEIRA[3])
    c.linha(gx, 120, gx - 7, 128, NOGUEIRA[4])
    c.linha(gx, 120, gx + 7, 128, NOGUEIRA[3])
    c.linha(gx, 120, gx, 127, NOGUEIRA[4])

    # ── Poltrona de veludo esmeralda (encosto de orelhas, capitonê, tachas de latão, pés torneados).
    cx, ytop, ybase = 84, 102, 146
    for y in range(ytop, 136):
        t = (y - ytop) / (136 - ytop)
        meia = 24 + (3 if t < 0.25 else 0) - (2 * (1 - t / 0.25) ** 2 * 3 if t < 0.25 else 0)
        for x in range(int(cx - meia), int(cx + meia) + 1):
            u = (x - cx) / meia
            k = 0.55 - abs(u + 0.25) * 0.4 + 0.12 * math.sin(u * 7) * 0.4 - t * 0.12
            if y < 128 and abs(u) < 0.62:
                # capitonê: botões em losango
                bx_, by_ = (x - cx) % 8, (y - ytop + (((x - cx) // 8) % 2) * 4) % 8
                if bx_ == 4 and by_ == 4:
                    k -= 0.3
                elif abs(bx_ - 4) + abs(by_ - 4) == 4:
                    k -= 0.08
            p.p(x, y, tons_idx(VELUDO, k))
    # assento e braços
    for y in range(124, 138):
        for x in range(cx - 30, cx + 31):
            braco = abs(x - cx) > 21
            if braco or y > 128:
                u = (x - cx) / 30
                k = 0.6 - abs(u) * 0.2 - (y - 124) * 0.02 + (0.15 if (braco and y < 127) else 0)
                p.p(x, y, tons_idx(VELUDO, k))
    for y in range(126, 137, 2):
        p.p(cx - 30, y, LATAO[4])
        p.p(cx + 30, y, LATAO[3])
    p.ret(cx - 30, 137, 61, 2, VELUDO[1])
    for lx in (cx - 27, cx + 25):
        for y in range(139, ybase):
            p.p(lx, y, NOGUEIRA[6] if y % 3 else NOGUEIRA[4])
            p.p(lx + 1, y, NOGUEIRA[3])
    # almofada de veludo com borla dourada
    p.elipse(cx + 8, 122, 9, 5, VELUDO[5])
    p.elipse(cx + 7, 121, 6, 3, VELUDO[6])
    p.p(cx + 17, 125, LATAO[4])
    p.p(cx + 17, 126, LATAO[3])

    # ── Cortina de veludo à esquerda (pregas fundas) com a abraçadeira de latão.
    for y in range(0, 152):
        aperto = math.exp(-((y - 96) / 10) ** 2)
        larg = 18 - 7 * aperto + (4 if y > 120 else 0) * (y - 120) / 32
        for x in range(0, int(larg) + 1):
            k = 0.42 + 0.3 * math.sin(x * (0.9 + aperto * 0.8) + 0.4 + y * 0.01) - (x / max(larg, 1)) * 0.15
            p.p(x, y, tons_idx(VELUDO, k))
        p.p(int(larg) + 1, y, VELUDO[0], 0.6)
    for x in range(0, 14):
        p.p(x, 95, LATAO[4] if x % 3 else LATAO[2])
        p.p(x, 96, LATAO[2])
    p.elipse(13, 100, 1.6, 3, LATAO[3])
    return c, p


# ─────────────────────────────── Centro: móvel de gavetinhas, lamparina, pergaminhos ───────────────────────────────
def pergaminho(c: Camada, x0: float, y0: float, comp: int, ang: float, r: float = 1.6, fita: bool = True, seed: int = 0) -> None:
    """Pergaminho enrolado visto de lado: cilindro com volume, a ponta em espiral e a fita verde amarrada."""
    ux, uy = math.cos(ang), math.sin(ang)
    nx, ny = -uy, ux
    for s in range(int(comp * 2)):
        t = s / 2
        for j in range(-int(r * 2) - 1, int(r * 2) + 2):
            q = j / 2
            if abs(q) > r:
                continue
            k = 0.5 - (q / r) * 0.32 - (0.12 if hash01(int(t), seed, 81) > 0.8 else 0)
            c.p(x0 + ux * t + nx * q, y0 + uy * t + ny * q, tons_idx(PERGAMINHO, k))
    # pontas em espiral
    for (tt, lado) in ((0, -1), (comp, 1)):
        ex, ey = x0 + ux * tt, y0 + uy * tt
        c.p(ex, ey, PERGAMINHO[1])
        c.p(ex + nx * 0.8, ey + ny * 0.8, PERGAMINHO[4])
        c.p(ex - nx * 0.8, ey - ny * 0.8, PERGAMINHO[2])
    if fita:
        mx, my = x0 + ux * comp * 0.5, y0 + uy * comp * 0.5
        for j in range(-int(r) - 1, int(r) + 2):
            c.p(mx + nx * j, my + ny * j, FITA[3] if j < 0 else FITA[2])
            c.p(mx + ux + nx * j, my + uy + ny * j, FITA[1])
        c.p(mx + nx * (r + 1.5) + ux * 1.5, my + ny * (r + 1.5) + uy * 1.5, FITA[2])
        c.p(mx + nx * (r + 2.5) + ux * 0.5, my + ny * (r + 2.5) + uy * 0.5, FITA[3])
        c.p(mx + nx * (r + 2.2) - ux * 1.0, my + ny * (r + 2.2) - uy * 1.0, FITA[1])


def rolo(c: Camada, x0: float, y0: float, comp: int, ang: float, r: float, seed: int) -> None:
    """Pergaminho grosso em pé (no cesto): cilindro de papel cor de couro claro, a boca do rolo com a espiral escura
    à mostra e uma fita verde com laço."""
    ux, uy = math.cos(ang), math.sin(ang)
    nx, ny = -uy, ux
    for s_ in range(int(comp * 2)):
        t = s_ / 2
        for j in range(-int(r * 2) - 1, int(r * 2) + 2):
            q = j / 2
            if abs(q) > r:
                continue
            k = 0.46 - (q / r) * 0.34 + (0.06 if hash01(int(t * 2), seed, 82) > 0.7 else 0)
            c.p(x0 + ux * t + nx * q, y0 + uy * t + ny * q, tons_idx(PERGAMINHO[:4], k))
    # a boca do rolo: elipse com a espiral de papel enrolado
    ex, ey = x0 + ux * comp, y0 + uy * comp
    for j in range(-int(r * 2) - 1, int(r * 2) + 2):
        q = j / 2
        if abs(q) <= r:
            c.p(ex + nx * q, ey + ny * q - 0.5, PERGAMINHO[3] if abs(q) > r - 0.8 else PERGAMINHO[1])
    c.p(ex, ey - 0.5, PERGAMINHO[0])
    c.p(ex + nx * 0.8, ey + ny * 0.8 - 0.5, PERGAMINHO[2])
    # fita verde com laço, a um terço da altura
    mx, my = x0 + ux * comp * 0.72, y0 + uy * comp * 0.72
    for j in range(-int(r * 2) - 1, int(r * 2) + 2):
        q = j / 2
        if abs(q) <= r:
            c.p(mx + nx * q, my + ny * q, FITA[3] if q < 0 else FITA[2])
            c.p(mx + ux * 0.6 + nx * q, my + uy * 0.6 + ny * q, FITA[1])
    c.p(mx + nx * (r + 1), my + ny * (r + 1), FITA[3])
    c.p(mx + nx * (r + 1) - ux, my + ny * (r + 1) - uy, FITA[2])
    c.p(mx + nx * (r + 1) - ux * 2, my + ny * (r + 1) - uy * 2, FITA[1])


def gaveteiro() -> tuple[Camada, Camada, Camada]:
    """O móvel de gavetinhas (mogno, puxadores de latão, porta-etiquetas sem texto, uma gaveta entreaberta com a fita
    escapando), a lamparina de latão e os pergaminhos em cima. Devolve (móvel, objetos de cima, chama)."""
    c, o, e = Camada(), Camada(), Camada()
    x0, x1, yt, yb = GAV
    # tampo com borda moldurada
    madeira(c, x0 - 2, yt, x1 - x0 + 4, 3, MOGNO, 70, 0.62)
    c.ret(x0 - 2, yt, x1 - x0 + 4, 1, MOGNO[7])
    c.ret(x0 - 2, yt + 3, x1 - x0 + 4, 1, MOGNO[1])
    madeira(c, x0, yt + 4, x1 - x0, yb - yt - 4, MOGNO, 71, 0.3)
    cols, lins = 4, 5
    gx0, gx1, gy0, gy1 = x0 + 3, x1 - 3, yt + 6, yb - 7
    cw = (gx1 - gx0) / cols
    lh = (gy1 - gy0) / lins
    for i in range(cols):
        for j in range(lins):
            dx0 = int(gx0 + i * cw)
            dy0 = int(gy0 + j * lh)
            w = int(gx0 + (i + 1) * cw) - dx0 - 1
            h = int(gy0 + (j + 1) * lh) - dy0 - 1
            aberta = (i, j) == (2, 1)
            k = 0.5 + (hash01(i, j, 72) - 0.5) * 0.12
            if aberta:
                c.ret(dx0, dy0 - 1, w, 1, MOGNO[6])   # a gaveta sai um pouco: aparece a borda de cima
                c.ret(dx0, dy0 + h, w, 1, "#000000", 0.6)
            bisel(c, dx0, dy0, w, h, MOGNO, k, 73 + i * 7 + j)
            # porta-etiqueta de latão (cartão creme sem texto) e o puxador
            ex = dx0 + w // 2 - 2
            c.ret(ex, dy0 + 1, 5, 2, LATAO[1])
            c.ret(ex + 1, dy0 + 1, 3, 1, PERGAMINHO[3] if hash01(i, j, 74) > 0.25 else PERGAMINHO[1])
            c.p(ex, dy0 + 1, LATAO[3])
            c.p(dx0 + w // 2, dy0 + h - 2, LATAO[3])
            c.p(dx0 + w // 2 + 1, dy0 + h - 2, LATAO[1])
            if aberta:
                # a fita verde escapando da gaveta
                for s in range(7):
                    c.p(dx0 + w // 2 + 2 + (s % 2), dy0 + h + s, FITA[3] if s % 2 else FITA[2])
    # rodapé com pés recortados
    c.ret(x0, yb - 6, x1 - x0, 1, MOGNO[6])
    madeira(c, x0, yb - 5, x1 - x0, 3, MOGNO, 75, 0.36)
    for fx in (x0, x1 - 5):
        c.ret(fx, yb - 2, 5, 2, MOGNO[2])
        c.ret(fx, yb - 2, 5, 1, MOGNO[4])
    c.ret(x0 + 5, yb - 2, x1 - x0 - 10, 2, "#000000", 0.4)

    # ── A lamparina de latão: pé, haste, reservatório redondo, colar, chaminé de vidro bojuda e a chama.
    lx, ly = int(LAMPARINA[0]), int(LAMPARINA[1])
    base = yt - 1
    o.ret(lx - 4, base, 9, 1, LATAO[2])
    o.ret(lx - 3, base - 1, 7, 1, LATAO[4])
    o.ret(lx - 1, base - 3, 3, 2, LATAO[3])
    o.p(lx - 1, base - 3, LATAO[5])
    for y in range(base - 9, base - 3):
        t = (y - (base - 9)) / 6
        meia = 4.6 * math.sin(math.pi * (0.15 + 0.75 * t))
        for x in range(int(lx - meia), int(lx + meia) + 1):
            u = (x + 0.5 - lx - 0.5) / max(meia, 1)
            o.p(x, y, tons_idx(LATAO, 0.8 - abs(u + 0.4) * 0.6 - t * 0.1))
    o.ret(lx - 2, base - 10, 5, 1, LATAO[5])
    o.ret(lx - 2, base - 11, 5, 1, LATAO[2])
    o.p(lx + 3, base - 7, LATAO[1])          # botãozinho do pavio
    o.p(lx + 4, base - 7, LATAO[4])
    for y in range(base - 20, base - 11):
        t = (y - (base - 20)) / 9
        meia = 1.6 + 1.8 * math.sin(math.pi * min(1, t * 1.1))
        for x in range(int(lx - meia), int(lx + meia) + 1):
            o.p(x, y, "#c8dcd8", 0.22)
        o.p(lx - meia, y, "#ffffff", 0.5)
        o.p(lx + meia, y, "#8aa0a0", 0.35)
    o.p(lx, ly + 2, "#2a1a10")
    for (dx, dy, cor) in ((0, 0, "#fff6d0"), (0, -1, "#ffe08a"), (0, -2, "#ffa448"), (0, 1, "#ffd070"),
                          (-1, 0, "#ff9a3a"), (1, 0, "#ff9a3a")):
        e.p(lx + dx, ly + dy, cor, 0.55 if dx else 1)
    # ── Pergaminhos deitados em pilha, um caderninho de couro e a lupa.
    pergaminho(o, 222, yt - 3, 16, 0.0, 1.7, seed=1)
    pergaminho(o, 228, yt - 6.5, 14, -0.05, 1.6, seed=2)
    pergaminho(o, 239, yt - 3, 12, 0.0, 1.5, fita=False, seed=3)
    o.ret(244, yt - 4, 11, 4, COURO[2])
    o.ret(244, yt - 4, 11, 1, COURO[4])
    o.ret(245, yt - 2, 10, 1, PERGAMINHO[3])
    o.ret(254, yt - 4, 1, 4, LATAO[3])
    for k in range(14):
        a_ = k / 14 * math.tau
        o.p(253 + math.cos(a_) * 2.5, yt - 9 + math.sin(a_) * 2.5, LATAO[4] if math.sin(a_) < 0 else LATAO[2])
    o.p(252, yt - 10, "#ffffff", 0.6)
    o.linha(254, yt - 7, 256, yt - 4, NOGUEIRA[5])
    return c, o, e


def cesto() -> Camada:
    """Cesto de vime no chão, cheio de pergaminhos em pé com fitas verdes."""
    c = Camada()
    cx, yt, yb = 244.0, 117, 130
    # pergaminhos (atrás da borda do cesto)
    for (ang, comp, dx) in ((-1.78, 19, -5), (-1.42, 20, 4), (-1.6, 23, 0), (-1.9, 15, -8), (-1.3, 15, 8)):
        rolo(c, cx + dx, yt + 7, comp, ang, 1.7, seed=int(dx + 20))
    for y in range(yt, yb):
        t = (y - yt) / (yb - yt)
        meia = 10.5 - t * 2
        for x in range(int(cx - meia), int(cx + meia) + 1):
            u = (x + 0.5 - cx) / meia
            trama = ((x + (y // 2) * 2) % 4 < 2) ^ ((y // 2) % 2 == 0)
            k = 0.62 - abs(u + 0.3) * 0.45 - t * 0.12 + (0.1 if trama else -0.06)
            c.p(x, y, tons_idx(VIME, k))
    for x in range(int(cx - 11), int(cx + 12)):
        c.p(x, yt, VIME[4] if x % 2 else VIME[3])
        c.p(x, yt + 1, VIME[2])
    c.ret(cx - 8, yb, 17, 1, "#000000", 0.4)
    return c


# ─────────────────────────────── O atril com o livro e a estrela ───────────────────────────────
def estrela_m(cx: float, cy: float, r_ext: float, r_int: float, giro: float = 0.0, pontas: int = 8,
              r_curta: float | None = None) -> list:
    pts = []
    for k in range(pontas * 2):
        a_ = giro + k * math.pi / pontas - math.pi / 2
        r = (r_ext if (r_curta is None or k % 4 == 0) else r_curta) if k % 2 == 0 else r_int
        pts.append((cx + math.cos(a_) * r, cy + math.sin(a_) * r))
    return pts


def estrela_facetada(c: Camada, cx: float, cy: float, r_ext: float, r_int: float, tons, giro: float = 0.0,
                     contorno: str | None = None, r_curta: float | None = None) -> None:
    """Estrela de oito pontas em latão facetado: cada ponta tem duas faces (uma pega a luz do alto à esquerda)."""
    pts = estrela_m(cx, cy, r_ext, r_int, giro, r_curta=r_curta)
    n = len(pts)
    for k in range(0, n, 2):
        ponta = pts[k]
        for lado in (-1, 1):
            vale = pts[(k + lado) % n]
            # normal média da face: a luz vem do alto à esquerda
            mx = (ponta[0] + vale[0]) / 2 - cx
            my = (ponta[1] + vale[1]) / 2 - cy
            luz = (-mx * 0.7 - my * 0.7) / max(math.hypot(mx, my), 1e-3)
            kk = 0.5 + 0.36 * luz + (0.1 if lado < 0 else -0.1)
            c.poligono([(cx, cy), ponta, vale], tons_idx(tons, kk))
    if contorno:
        for k in range(n):
            a, b = pts[k], pts[(k + 1) % n]
            c.linha(a[0], a[1], b[0], b[1], contorno, 0.5)


def atril() -> Camada:
    """O atril de mogno (tripé, coluna torneada, tampo inclinado), o livro grande aberto e as fitas-marcador; na fita
    dourada, a estrela de latão de oito pontas."""
    c = Camada()
    ax = ATRIL_X
    y_chao = int(round(YH + HC * F / (Z_ATRIL + D)))     # 139
    # tripé
    for (fx, fy) in ((ax - 16, y_chao), (ax + 16, y_chao), (ax + 2, y_chao + 1)):
        c.linha(ax, y_chao - 12, fx, fy - 1, MOGNO[5])
        c.linha(ax + 1, y_chao - 12, fx + 1, fy - 1, MOGNO[3])
        c.linha(ax, y_chao - 11, fx, fy, MOGNO[1])
        c.ret(fx - 1, fy - 1, 3, 2, LATAO[3])
        c.p(fx - 1, fy - 1, LATAO[5])
    # coluna torneada com anéis
    for y in range(112, y_chao - 10):
        w = 2
        if y in (116, 117, 125, 126) or y > y_chao - 14:
            w = 3
        if y in (120, 121):
            w = 1
        for x in range(ax - w, ax + w + 1):
            u = (x - ax) / max(w, 1)
            c.p(x, y, tons_idx(MOGNO, 0.68 - abs(u + 0.35) * 0.5))
    c.ret(ax - 3, y_chao - 11, 7, 2, MOGNO[6])
    # suporte e tampo inclinado
    c.ret(ax - 6, 110, 13, 2, MOGNO[4])
    c.ret(ax - 6, 110, 13, 1, MOGNO[6])
    tampo = [(ax - 19, 99), (ax + 19, 99), (ax + 22, 108), (ax - 22, 108)]
    c.poligono(tampo, MOGNO[5])
    c.ret(ax - 22, 108, 45, 2, MOGNO[3])
    c.ret(ax - 22, 108, 45, 1, MOGNO[6])
    c.ret(ax - 21, 110, 43, 1, MOGNO[1])
    # livro: capa de couro com cantoneiras de latão, o bloco de folhas e as duas páginas abauladas
    c.poligono([(ax - 21, 99), (ax + 21, 99), (ax + 23, 107), (ax - 23, 107)], COURO[2])
    for (cx_, cy_) in ((ax - 22, 106), (ax + 21, 106), (ax - 20, 99), (ax + 19, 99)):
        c.ret(cx_, cy_, 2, 2, LATAO[4])
        c.p(cx_, cy_, LATAO[6])
    for y in range(104, 107):     # o corte das folhas (camadas)
        for x in range(ax - 20, ax + 21):
            c.p(x, y, PERGAMINHO[3] if (y + x // 9) % 2 else PERGAMINHO[2])
    for x in range(ax - 20, ax + 21):
        u = (x - ax) / 20
        lado = -1 if u < 0 else 1
        bojo = math.sin(math.pi * min(1, abs(u) * 1.05)) * 2.2
        ytop = 98 - bojo + (1 if abs(u) < 0.06 else 0)
        for y in range(int(math.floor(ytop)), 104):
            t = (y - ytop) / (104 - ytop)
            k = 0.5 - abs(u) * 0.1 - (0.3 if abs(u) < 0.08 else 0) - (0.08 if lado > 0 else 0) - t * 0.1
            cor = tons_idx(PERGAMINHO, k)
            # linhas de escrita ilegível (pontinhos claros-escuros, sem letras) e uma gravura de círculos
            if 0.14 < abs(u) < 0.9 and y % 2 == 0 and y < 103 and hash01(x, y, 83) > 0.32 and not (lado > 0 and 0.35 < u < 0.8 and y < 102):
                cor = mistura(cor, "#5a4630", 0.35)
            c.p(x, y, cor)
    # gravura na página da direita: órbitas concêntricas (sem texto)
    for k in range(18):
        a_ = k / 18 * math.tau
        c.p(ax + 11 + math.cos(a_) * 4.5, 99.5 + math.sin(a_) * 1.8, "#6a5236", 0.7)
    c.p(ax + 11, 99, "#8a3a22")
    # dobra central (sombra do vinco)
    c.linha(ax, 97, ax, 104, PERGAMINHO[0])
    # fitas-marcador saindo do vinco e caindo pela frente do tampo
    fitas = ((ax - 4, 121, FITA_VERM), (ax - 1, 125, FITA[1:]), (ax + 3, 118, ["#6a4a10", "#a8782a", OURO, "#f2d488"]))
    for (fx, fim, tons) in fitas:
        for y in range(103, fim):
            x = fx + 0.8 * math.sin((y - 103) / 3.0) + (y - 103) * 0.12
            c.p(x, y, tons_idx(tons, 0.62))
            c.p(x + 1, y, tons_idx(tons, 0.3))
        x = fx + 0.8 * math.sin((fim - 103) / 3.0) + (fim - 103) * 0.12
        c.p(x, fim, tons_idx(tons, 0.5))     # ponta em rabo de andorinha
        c.p(x + 1, fim + 1, tons_idx(tons, 0.3))
        c.p(x - 1, fim + 1, tons_idx(tons, 0.3))
    # a estrela de latão (oito pontas, facetada) presa na fita dourada
    sx = ax + 3 + 0.8 * math.sin(15 / 3.0) + 15 * 0.12 + 0.5
    estrela_facetada(c, sx, 124.5, 6.4, 2.7, LATAO, giro=0.0, contorno="#2a1a08")
    c.ret(sx - 1, 117, 2, 2, LATAO[3])              # argolinha que prende a estrela na fita
    c.p(sx - 2, 122, LATAO[6])
    c.p(sx - 1, 123, LATAO[6])
    c.p(sx, 124, LATAO[5])
    return c


# ─────────────────────────────── Prateleira da parede com o castiçal ───────────────────────────────
def prateleira() -> tuple[Camada, Camada]:
    """Prateleira de nogueira em mãos-francesas de ferro: potes de boticário, livros deitados, um pergaminho com fita
    e o castiçal de latão. Devolve (prateleira e objetos, chama)."""
    c, e = Camada(), Camada()
    x0, x1, yt = PRAT
    madeira(c, x0, yt, x1 - x0, 3, NOGUEIRA, 90, 0.6)
    c.ret(x0, yt, x1 - x0, 1, NOGUEIRA[7])
    c.ret(x0, yt + 3, x1 - x0, 1, NOGUEIRA[1])
    for bx in (x0 + 5, x1 - 7):
        for k in range(9):
            a_ = k / 8 * math.pi / 2
            c.p(bx + 1 + math.sin(a_) * 0 + k * 0.0, yt + 4 + k, FERRO[3])
            c.p(bx + 1 + (8 - k) * 0.55, yt + 4 + k * 0.55, FERRO[4])
        c.p(bx + 1, yt + 13, FERRO[2])
    # potes de boticário (vidro, conteúdo, tampa de rolha e cordão)
    for (px_, cor, alt) in ((322, "#5a6a3a", 9), (330, "#8a5a3a", 7)):
        c.ret(px_, yt - alt, 6, alt, "#9ab0a8", 0.32)
        c.ret(px_ + 1, yt - alt + 3, 4, alt - 3, cor)
        c.ret(px_ + 1, yt - alt + 3, 4, 1, mistura(cor, "#ffffff", 0.25))
        c.ret(px_ + 1, yt - alt - 2, 4, 2, "#8a6a44")
        c.ret(px_ + 1, yt - alt - 2, 4, 1, "#b08a5a")
        c.p(px_, yt - alt + 1, "#ffffff", 0.5)
        c.p(px_, yt - alt + 2, "#ffffff", 0.3)
        c.ret(px_, yt - alt, 6, 1, LATAO[2], 0.7)
    # livros deitados e o pergaminho em cima
    for (yy, cor, cl) in ((yt - 3, "#2e1a10", "#4a2c1a"), (yt - 6, "#16301e", "#244a30")):
        c.ret(338, yy, 16, 3, cor)
        c.ret(338, yy, 16, 1, cl)
        c.ret(353, yy, 1, 3, PERGAMINHO[3])
        c.p(339, yy + 1, "#6a5426")
    pergaminho(c, 339, yt - 8, 13, 0.0, 1.4, seed=7)
    # o castiçal de latão: prato com alça em anel, haste torneada, copo, vela e pingos
    vx, vy = int(CASTICAL[0]), int(CASTICAL[1])
    c.ret(vx - 4, yt - 1, 9, 1, LATAO[2])
    c.ret(vx - 3, yt - 2, 7, 1, LATAO[5])
    for k in range(8):
        a_ = k / 7 * math.pi
        c.p(vx + 5 + math.cos(a_) * 1.4, yt - 2 - math.sin(a_) * 1.6, LATAO[4])
    for y in range(yt - 7, yt - 2):
        w = 1 if y in (yt - 5,) else 0
        for x in range(vx - w, vx + w + 1):
            c.p(x, y, LATAO[5] if x <= vx else LATAO[2])
    c.ret(vx - 1, yt - 8, 3, 1, LATAO[4])
    for y in range(vy + 2, yt - 8):
        c.p(vx - 1, y, CERA[3])
        c.p(vx, y, CERA[2])
        c.p(vx + 1, y, CERA[1])
    c.p(vx + 1, vy + 4, CERA[2])
    c.p(vx + 2, vy + 5, CERA[1])
    c.p(vx - 2, vy + 7, CERA[2])
    c.p(vx, vy + 1, "#2a1a10")
    for (dx, dy, cor) in ((0, 0, "#fff6d0"), (0, -1, "#ffe08a"), (0, -2, "#ffa448"), (0, 1, "#ffd070"),
                          (-1, 0, "#ff9a3a"), (1, 0, "#ff9a3a")):
        e.p(vx + dx, vy + dy, cor, 0.55 if dx else 1)
    return c, e


# ─────────────────────────────── A vitrine de curiosidades ───────────────────────────────
def cristais(c: Camada, cx: float, yb: float, pontas, tons, mascara: np.ndarray | None = None) -> None:
    """Drusa de cristais: prismas de ponta facetada (face clara à esquerda), em ângulos diferentes."""
    for (dx, alt, ang, larg) in pontas:
        ux, uy = math.sin(ang), -math.cos(ang)
        nx, ny = -uy, ux
        for s in range(int(alt * 2)):
            t = s / 2
            ponta = max(0.0, (t - (alt - larg * 1.2)) / (larg * 1.2))
            meia = larg * (1 - ponta)
            for j in range(-int(larg * 2) - 1, int(larg * 2) + 2):
                q = j / 2
                if abs(q) > meia:
                    continue
                k = 0.42 + (0.32 if q < 0 else -0.05) + t / alt * 0.25 - (0.2 if abs(q) > meia - 0.5 else 0)
                x, y = cx + dx + ux * t + nx * q, yb + uy * t + ny * q
                c.p(x, y, tons_idx(tons, k))
                if mascara is not None and 0 <= int(round(y)) < H and 0 <= int(round(x)) < W:
                    mascara[int(round(y)), int(round(x))] = max(mascara[int(round(y)), int(round(x))], 0.5 + 0.5 * t / alt)
        tx, ty = cx + dx + ux * alt, yb + uy * alt
        c.p(tx, ty, tons[-1])


def vitrine() -> tuple[Camada, Camada, Camada, np.ndarray, np.ndarray]:
    """A vitrine de mogno: cornija com dentículos (o poleiro), portas de vidro, prateleiras, forro de veludo verde e as
    curiosidades; embaixo, o balcão e as portas de almofada. Devolve (móvel, conteúdo, vidros, máscara dos cristais,
    máscara do vidro)."""
    c, o, v = Camada(), Camada(), Camada()
    cri = np.zeros((H, W), dtype=np.float32)
    vid = np.zeros((H, W), dtype=np.float32)
    x0, x1, yt, yb = VIT
    # lateral esquerda em perspectiva (de x ≈ 377 a 392)
    xl = tela(mundo(x0, 0, Z_VIT)[0], 0, Z_VIT_FUNDO)[0]
    topo_f = tela(0, mundo(0, yt, Z_VIT)[1], Z_VIT_FUNDO)[1]
    chao_f = YH + HC * F / (Z_VIT_FUNDO + D)

    def y_lado(x, y_frente, y_fundo):
        t = (x - xl) / (x0 - xl)
        return y_fundo + (y_frente - y_fundo) * t

    for x in range(int(xl), x0):
        ya, yb_ = y_lado(x + 0.5, yt + 7, topo_f + 6), y_lado(x + 0.5, yb, chao_f)
        yv0, yv1 = y_lado(x + 0.5, 53, topo_f + 10), y_lado(x + 0.5, 106, chao_f - 30)
        for y in range(int(ya), int(yb_)):
            if yv0 <= y < yv1 and xl + 2 <= x < x0 - 2:
                o.p(x, y, mistura(VELUDO[0], VELUDO[2], (x - xl) / 15))      # o fundo de veludo visto pelo vidro do lado
                v.p(x, y, "#cfe0e4", 0.1)
                vid[y, x] = 1
            else:
                c.p(x, y, tons_idx(MOGNO, 0.4 + (x - xl) / 15 * 0.12 + (hash01(x, y // 4, 99) - 0.5) * 0.06))
        # cornija da lateral
        for (dy_, kk) in ((0, 0.8), (1, 0.6), (2, 0.5), (3, 0.2), (4, 0.55), (5, 0.45), (6, 0.25)):
            c.p(x, y_lado(x + 0.5, yt + dy_, topo_f + dy_ * 0.85), tons_idx(MOGNO, kk))
    # ── Cornija: lábio claro (onde a coruja pousa), gola, dentículos, friso.
    for x in range(x0 - 3, x1 + 4):
        c.p(x, yt, MOGNO[7])
        c.p(x, yt + 1, MOGNO[6])
        c.p(x, yt + 2, MOGNO[4])
        c.p(x, yt + 3, MOGNO[1])
    for x in range(x0 - 1, x1 + 2):
        c.p(x, yt + 4, MOGNO[5] if x % 3 else MOGNO[2])
        c.p(x, yt + 5, MOGNO[4] if x % 3 else MOGNO[1])
        c.p(x, yt + 6, MOGNO[2])
    madeira(c, x0, yt + 7, x1 - x0, 3, MOGNO, 100, 0.48)
    # roseta de latão no friso: estrela pequena de oito pontas
    estrela_facetada(c, (x0 + x1) / 2, yt + 8.5, 2.6, 1.2, LATAO)
    # ── Montantes e travessas da parte de vidro.
    yv0, yv1 = yt + 10, 108
    for (sx, w) in ((x0, 4), (x1 - 4, 4), ((x0 + x1) // 2 - 2, 4)):
        madeira(c, sx, yv0, w, yv1 - yv0, MOGNO, 101 + sx, 0.5, vertical=True)
        c.ret(sx, yv0, 1, yv1 - yv0, MOGNO[6])
        c.ret(sx + w - 1, yv0, 1, yv1 - yv0, MOGNO[2])
    madeira(c, x0, yv0, x1 - x0, 3, MOGNO, 102, 0.5)
    c.ret(x0, yv0 + 2, x1 - x0, 1, MOGNO[1])
    madeira(c, x0, yv1 - 3, x1 - x0, 3, MOGNO, 103, 0.52)
    c.ret(x0, yv1 - 3, x1 - x0, 1, MOGNO[6])
    # dobradiças e fechadura de latão
    for (hx, hy) in ((x0 + 1, yv0 + 8), (x0 + 1, yv1 - 12), (x1 - 3, yv0 + 8), (x1 - 3, yv1 - 12)):
        c.ret(hx, hy, 2, 3, LATAO[3])
        c.p(hx, hy, LATAO[5])
    mx = (x0 + x1) // 2
    c.ret(mx - 1, 78, 3, 4, LATAO[3])
    c.p(mx - 1, 78, LATAO[5])
    c.p(mx, 80, LATAO[0])
    # ── O interior: forro de veludo esmeralda com luz de cima, e as prateleiras.
    panes = ((x0 + 4, mx - 2), (mx + 2, x1 - 4))
    for (pa, pb) in panes:
        for y in range(yv0 + 3, yv1 - 3):
            for x in range(pa, pb):
                k = 0.3 - (y - yv0) / (yv1 - yv0) * 0.14 + (0.04 if (x + y) % 3 == 0 else 0) + (hash01(x // 2, y // 5, 104) - 0.5) * 0.06 - 0.08 * abs((x - (pa + pb) / 2) / (pb - pa))
                o.p(x, y, tons_idx(VELUDO, k))
                vid[y, x] = 1
    prat = (66, 81, 95)
    for ys in prat:
        # acima do olho (y < 80) vê-se a face de baixo; abaixo, o tampo
        c.ret(x0 + 4, ys, x1 - x0 - 8, 2, MOGNO[4])
        if ys < 80:
            c.ret(x0 + 4, ys + 1, x1 - x0 - 8, 1, MOGNO[2])
            c.ret(x0 + 4, ys + 2, x1 - x0 - 8, 1, "#000000", 0.4)
        else:
            c.ret(x0 + 4, ys - 1, x1 - x0 - 8, 1, MOGNO[6])
            c.ret(x0 + 4, ys + 1, x1 - x0 - 8, 1, MOGNO[2])
        c.ret(mx - 2, ys - 1, 4, 4, MOGNO[3])

    # ── As curiosidades.
    # prateleira de cima (apoio em y 65): astrolábio pequeno, drusa de esmeralda, a redoma com o ossinho
    ys = 65
    ax_, ay_ = 403.0, 58.0
    c_ast = o
    for y in range(int(ay_ - 6), int(ay_ + 7)):
        for x in range(int(ax_ - 6), int(ax_ + 7)):
            d = math.hypot(x + 0.5 - ax_, y + 0.5 - ay_)
            if d < 5.6:
                if d > 4.4:
                    k = 0.72 - (y - ay_) / 6 * 0.25 - (x - ax_) / 6 * 0.15
                    c_ast.p(x, y, tons_idx(LATAO, k))
                elif d > 3.6:
                    c_ast.p(x, y, LATAO[1])
                else:
                    c_ast.p(x, y, tons_idx(LATAO, 0.42 + (0.2 if abs(d - 2.2) < 0.5 else 0) - (0.15 if (x + y) % 3 == 0 and d < 2.5 else 0)))
    c_ast.linha(ax_ - 3.5, ay_ + 3.5, ax_ + 3.5, ay_ - 3.5, LATAO[5])   # a alidade
    c_ast.p(ax_, ay_, LATAO[6])
    c_ast.ret(ax_ - 1, ay_ - 8, 3, 2, LATAO[4])                           # argola do trono
    c_ast.p(ax_, ay_ - 8, LATAO[1])
    c_ast.ret(ax_ - 3, ys - 1, 7, 1, NOGUEIRA[5])                         # suporte
    c_ast.linha(ax_, ay_ + 5.5, ax_, ys - 1, NOGUEIRA[4])
    cristais(o, 417, ys, ((0, 9, -0.18, 1.6), (-3, 6, -0.55, 1.3), (3, 7, 0.32, 1.4), (-1, 4, 0.75, 1.0), (5, 4, 0.9, 1.0)), ESMERALDA, cri)
    o.elipse(417, ys, 5, 1.5, "#3a3228")
    # redoma: base torneada, dois apoios de latão e o pequeno osso longo (discreto), cúpula de vidro
    rx_ = 449.0
    o.ret(rx_ - 8, ys - 2, 17, 2, NOGUEIRA[5])
    o.ret(rx_ - 8, ys - 2, 17, 1, NOGUEIRA[7])
    o.ret(rx_ - 4, ys - 4, 1, 2, LATAO[3])
    o.ret(rx_ + 4, ys - 4, 1, 2, LATAO[3])
    for x in range(int(rx_ - 5), int(rx_ + 6)):
        k = 0.7 if x < rx_ else 0.55
        o.p(x, ys - 5, tons_idx(OSSO, k))
        o.p(x, ys - 4, tons_idx(OSSO, k - 0.3))
    for (ex_, s_) in ((rx_ - 6, -1), (rx_ + 6, 1)):
        o.p(ex_, ys - 6, OSSO[3])
        o.p(ex_, ys - 4, OSSO[1])
        o.p(ex_, ys - 5, OSSO[2])
        o.p(ex_ + s_, ys - 6, OSSO[2])
        o.p(ex_ + s_, ys - 4, OSSO[1])
    for y in range(ys - 15, ys - 2):
        t = (ys - 2 - y) / 13
        meia = 7.2 * math.sqrt(max(0.0, 1 - t ** 2.2))
        v.p(rx_ - meia, y, "#e8f4f4", 0.55)
        v.p(rx_ + meia, y, "#9ab0b0", 0.4)
        for x in range(int(rx_ - meia) + 1, int(rx_ + meia)):
            v.p(x, y, "#d0e4e4", 0.07)
    v.ret(rx_ - 2, ys - 15, 4, 1, "#e8f4f4", 0.5)
    v.p(rx_ - 4, ys - 11, "#ffffff", 0.75)
    v.p(rx_ - 5, ys - 9, "#ffffff", 0.55)
    o.ret(rx_ - 1, ys - 16, 2, 1, LATAO[4])

    # prateleira do meio (apoio em y 80): concha, vieira, dois frascos, a amonite fóssil
    ys = 80
    # concha cônica em espiral
    for s in range(12):
        t = s / 11
        meia = 0.6 + t * 3.2
        y = ys - 2 - (1 - t) * 8
        for x in range(int(399 - meia), int(399 + meia) + 1):
            k = 0.75 - abs(x - 399 + 0.8) / max(meia, 1) * 0.35 - (0.2 if s % 3 == 0 else 0)
            o.p(x + t * 2, y, mistura("#7a5a4a", "#f0d8c0", k))
    o.p(402, ys - 3, "#c88a7a")
    o.p(403, ys - 2, "#e8b0a0")
    # vieira em leque com costelas
    for y in range(ys - 7, ys):
        for x in range(406, 415):
            d = math.hypot(x + 0.5 - 410.5, (y + 0.5 - ys) * 1.2)
            if d < 6.5:
                ang = math.atan2(y - ys, x - 410.5)
                k = 0.55 + 0.25 * math.cos(ang * 9) - d / 6.5 * 0.15
                o.p(x, y, mistura("#7a4a32", "#f0c098", k))
    o.ret(409, ys - 1, 3, 1, "#a87a5a")
    # frascos: balão com líquido verde-água e garrafinha âmbar com rolha
    for y in range(ys - 6, ys):
        for x in range(417, 425):
            d = math.hypot(x + 0.5 - 421, (y + 0.5 - (ys - 3)) * 1.1)
            if d < 3.6:
                o.p(x, y, mistura("#1a6a6a", "#4ac0b0", 0.6 - (y - ys + 6) * 0.08) if y > ys - 4 else mistura("#a8c8c8", "#e0f0f0", 0.4), 0.85 if y > ys - 4 else 0.35)
    o.ret(420, ys - 10, 2, 4, "#c8e0e0", 0.45)
    o.ret(420, ys - 11, 2, 1, "#8a6a44")
    o.p(419, ys - 4, "#ffffff", 0.7)
    o.ret(425, ys - 9, 3, 9, "#8a4a10")
    o.ret(425, ys - 9, 1, 9, "#c87a2a")
    o.ret(426, ys - 12, 1, 3, "#7a5030", 0.9)
    o.ret(425, ys - 13, 3, 1, "#a07a4a")
    o.p(425, ys - 7, "#ffe0a0", 0.8)
    # amonite: disco em espiral com costelas, num suporte
    amx, amy = 446.0, ys - 7.0
    for y in range(int(amy - 7), int(amy + 7)):
        for x in range(int(amx - 7), int(amx + 7)):
            dx_, dy_ = x + 0.5 - amx, y + 0.5 - amy
            d = math.hypot(dx_, dy_)
            if d < 6.3:
                ang = math.atan2(dy_, dx_)
                espiral = (d - 1.1 * (ang + math.pi)) % 2.4
                costela = math.cos(ang * 14 - d * 0.6)
                k = 0.55 + 0.18 * costela - (0.3 if espiral < 0.55 else 0) - (dx_ + dy_) / 12 * 0.2
                o.p(x, y, mistura("#3a3226", "#c8b494", k))
    o.ret(amx - 3, ys - 1, 7, 1, NOGUEIRA[5])
    o.ret(455, ys - 4, 6, 4, PERGAMINHO[4])      # cartão sem texto
    o.ret(455, ys - 4, 6, 1, PERGAMINHO[5])
    o.p(456, ys - 2, PERGAMINHO[1], 0.5)
    o.p(458, ys - 2, PERGAMINHO[1], 0.5)

    # prateleira de baixo (apoio em y 94): geodo com cristais de água-marinha, citrinos, quartzo rosa, rubi
    ys = 94
    gx_, gy_ = 403.0, ys - 5.0
    for y in range(int(gy_ - 6), int(gy_ + 6)):
        for x in range(int(gx_ - 7), int(gx_ + 7)):
            d = math.hypot((x + 0.5 - gx_) / 6.5, (y + 0.5 - gy_) / 5.2)
            if d < 1 and y < ys:
                if d > 0.72:
                    o.p(x, y, mistura("#3a2e24", "#8a7a64", 0.6 - (y - gy_) / 6 * 0.4 + hash01(x, y, 105) * 0.2))
                else:
                    o.p(x, y, tons_idx(AGUA, 0.25 + hash01(x, y, 106) * 0.6))
                    cri[y, x] = 0.6 + 0.4 * hash01(x, y, 107)
                    if hash01(x, y, 108) > 0.82:
                        o.p(x, y, AGUA[5])
    cristais(o, 416, ys, ((0, 8, -0.1, 1.5), (-3, 5, -0.6, 1.2), (3, 6, 0.45, 1.3), (1, 3, 0.9, 0.9)), CITRINO, cri)
    o.elipse(416, ys, 4.5, 1.2, "#4a3a2a")
    o.ret(424, ys - 3, 5, 3, PERGAMINHO[4])
    o.ret(424, ys - 3, 5, 1, PERGAMINHO[5])
    cristais(o, 442, ys, ((0, 7, 0.05, 2.0), (-3, 5, -0.4, 1.4), (3, 4, 0.6, 1.2)), ROSA, cri)
    o.elipse(442, ys, 5, 1.3, "#4a3a32")
    cristais(o, 455, ys, ((0, 5, -0.15, 1.1), (2, 3, 0.5, 0.9)), RUBI, cri)
    o.ret(459, ys - 3, 5, 3, PERGAMINHO[3])

    # compartimento de baixo (apoio em y 104): náutilo cortado e o suporte de frasquinhos coloridos
    ys = 104
    nx_, ny_ = 409.0, ys - 5.0
    for y in range(int(ny_ - 6), int(ny_ + 6)):
        for x in range(int(nx_ - 7), int(nx_ + 7)):
            dx_, dy_ = x + 0.5 - nx_, (y + 0.5 - ny_) * 1.15
            d = math.hypot(dx_, dy_)
            if d < 6 and y < ys:
                ang = math.atan2(dy_, dx_)
                camara = math.cos(ang * 5 + d * 0.9) > 0.7
                k = 0.7 - d / 6 * 0.25 + (dx_ < 0) * 0.1
                cor = mistura("#8a5a3a", "#f4e4cc", k)
                if d < 3.5 and camara:
                    cor = mistura(cor, "#5a3a2a", 0.6)
                if d > 4.8:
                    cor = mistura(cor, "#c8784a", 0.35)   # as listras de fora
                o.p(x, y, cor)
    o.ret(436, ys - 3, 26, 3, NOGUEIRA[5])
    o.ret(436, ys - 3, 26, 1, NOGUEIRA[7])
    for k, cor in enumerate(("#2fa080", "#c88a28", "#a82020", "#3ab0c4", "#e4b85c", "#4a8a3a")):
        fx = 438 + k * 4
        o.ret(fx, ys - 9, 2, 6, "#c8dcdc", 0.35)
        o.ret(fx, ys - 6, 2, 3, cor)
        o.p(fx, ys - 6, mistura(cor, "#ffffff", 0.4))
        o.ret(fx, ys - 10, 2, 1, "#8a6a44")
        cri[ys - 6:ys - 3, fx:fx + 2] = np.maximum(cri[ys - 6:ys - 3, fx:fx + 2], 0.35)

    # ── O vidro das portas: reflexos diagonais e o brilho das arestas.
    for (pa, pb) in panes:
        for y in range(yv0 + 3, yv1 - 3):
            for x in range(pa, pb):
                faixa_ = (x - pa) + (y - yv0) * 0.55
                ref = 0.12 if 6 < faixa_ % 34 < 9 else 0.07 if 11 < faixa_ % 34 < 12 else 0.0
                v.p(x, y, "#e8f4f8", 0.05 + ref)
        v.ret(pa, yv0 + 3, 1, yv1 - yv0 - 6, "#ffffff", 0.25)
    # ── Balcão e a parte de baixo: portas de almofada, espelho de fechadura, rodapé com pés de garra.
    madeira(c, x0 - 3, yv1, x1 - x0 + 6, 3, MOGNO, 110, 0.6)
    c.ret(x0 - 3, yv1, x1 - x0 + 6, 1, MOGNO[7])
    c.ret(x0 - 3, yv1 + 3, x1 - x0 + 6, 1, MOGNO[1])
    madeira(c, x0, yv1 + 4, x1 - x0, yb - yv1 - 9, MOGNO, 111, 0.36)
    for (pa, pb) in ((x0 + 3, mx - 1), (mx + 1, x1 - 3)):
        bisel(c, pa, yv1 + 7, pb - pa, 19, MOGNO, 0.5, 112 + pa, vertical=True)
        bisel(c, pa + 4, yv1 + 10, pb - pa - 8, 13, MOGNO, 0.42, 113 + pa, vertical=True)
    for kx in (mx - 4, mx + 3):
        c.ret(kx, yv1 + 14, 2, 4, LATAO[3])
        c.p(kx, yv1 + 14, LATAO[5])
        c.p(kx + (1 if kx < mx else 0), yv1 + 16, LATAO[0])
    c.ret(x0 - 1, yb - 5, x1 - x0 + 2, 2, MOGNO[5])
    c.ret(x0 - 1, yb - 5, x1 - x0 + 2, 1, MOGNO[7])
    madeira(c, x0, yb - 3, x1 - x0, 3, MOGNO, 114, 0.3)
    for fx in (x0 - 1, x1 - 5):
        c.ret(fx, yb - 3, 6, 3, MOGNO[3])
        c.ret(fx, yb - 3, 6, 1, MOGNO[6])
        c.p(fx + 1, yb - 1, LATAO[3])
    return c, o, v, cri, vid


# ─────────────────────────────── A luminária-estrela pendurada ───────────────────────────────
def luminaria() -> tuple[Camada, Camada, np.ndarray]:
    """Luminária de latão em estrela facetada de oito pontas, pendurada do forro por corrente, com o miolo de vidro
    âmbar e furinhos nas faces. Devolve (latão, brilho aceso, furinhos)."""
    c, e = Camada(), Camada()
    furos = np.zeros((H, W), dtype=np.float32)
    cx, cy = ESTRELA
    for y in range(0, int(cy - 12)):
        if y % 3 == 0:
            c.p(cx - 1, y, FERRO[4])
            c.p(cx, y, FERRO[2])
        elif y % 3 == 1:
            c.p(cx, y, FERRO[4])
        else:
            c.p(cx - 1, y, FERRO[3])
            c.p(cx, y, FERRO[3])
    c.ret(cx - 2, cy - 13, 4, 1, LATAO[4])
    c.ret(cx - 1, cy - 12, 2, 1, LATAO[2])
    estrela_facetada(c, cx, cy, 12.0, 3.4, LATAO, giro=math.pi / 4, contorno="#2a1a08", r_curta=7.5)
    # aros de reforço
    for k in range(36):
        a_ = k / 36 * math.tau
        c.p(cx + math.cos(a_) * 3.6, cy + math.sin(a_) * 3.6, LATAO[1])
    # miolo de vidro âmbar
    for y in range(int(cy - 3), int(cy + 4)):
        for x in range(int(cx - 3), int(cx + 4)):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d < 3.2:
                c.p(x, y, mistura("#6a3a10", "#c8862a", 0.7 - d / 3.2 * 0.5))
                e.p(x, y, mistura("#fff2c0", "#ff9a3a", d / 3.2), 1.0 if d < 1.6 else 0.6)
    # furinhos nas pontas (acendem à noite)
    pts = estrela_m(cx, cy, 12.0, 3.4, math.pi / 4, r_curta=7.5)
    for k in range(0, 16, 2):
        px_, py_ = pts[k]
        for f in (0.45, 0.68):
            fx, fy = cx + (px_ - cx) * f, cy + (py_ - cy) * f
            c.p(fx, fy, LATAO[0])
            e.p(fx, fy, "#ffd890", 0.8)
            furos[int(round(fy)), int(round(fx))] = 1
    # pingente embaixo
    c.ret(cx - 1, cy + 8, 2, 2, LATAO[4])
    c.p(cx, cy + 10, LATAO[2])
    return c, e, furos


def primeiro_plano() -> Camada:
    """Perto da câmera (desfocado na montagem): a borda da cortina da direita e o canto de um banquinho de veludo."""
    c = Camada()
    for y in range(0, H):
        larg = 9 + 3 * math.sin(y / 23.0) + (6 if y > 118 else 0) * (y - 118) / 42
        for x in range(int(W - larg), W):
            k = 0.4 + 0.3 * math.sin((W - x) * 0.9 + y * 0.02)
            c.p(x, y, tons_idx(VELUDO, k))
    for x in range(W - 12, W):
        c.p(x, 70, LATAO[4])
        c.p(x, 71, LATAO[2])
    for y in range(146, H):
        for x in range(0, 46 - (y - 146) // 3):
            k = 0.45 + 0.12 * math.sin(x * 0.5) - (y - 146) * 0.01
            c.p(x, y, tons_idx(VELUDO, k))
    for x in range(0, 44, 3):
        c.p(x, 146, LATAO[3])
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


def sombra_projetada(mascara: np.ndarray, luz: tuple[float, float], f: float) -> np.ndarray:
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    qx = np.clip((xs + (luz[0] - xs) * f).round().astype(int), 0, W - 1)
    qy = np.clip((ys + (luz[1] - ys) * f).round().astype(int), 0, H - 1)
    return mascara[qy, qx].astype(np.float32)


def rumo_na_tela(z: float, rumo) -> tuple[float, float]:
    """Direção (na tela) em que um ponto na profundidade z "olha" para a luz."""
    X0, Y0 = 0.0, 0.8
    lx, ly, lz = rumo
    e = 0.02
    xa, ya = tela(X0, Y0, z)
    xb, yb = tela(X0 + lx * e, Y0 + ly * e, z + lz * e)
    dx, dy = xb - xa, yb - ya
    n = math.hypot(dx, dy) or 1
    return dx / n, dy / n


def ocluir_tela(oc_id: np.ndarray, pix_id: np.ndarray, direcao, z_oc: np.ndarray, z_pix, rumo, passos: int = 110) -> np.ndarray:
    """Sombra dos objetos (vasos, plantas, bancadas, lanterna) traçada em tela, com profundidade: anda na direção da
    luz e, a cada passo, sabe em que profundidade o raio está (ele avança também no fundo, conforme o rumo). Só bate
    num objeto se o raio passa pela faixa de profundidade dele (centro z_oc ± ESPESSURA). Devolve 1 onde a luz passa."""
    lx, ly, lz = rumo
    n = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / n, ly / n, lz / n
    proj = max(math.hypot(lx, ly), 0.2)
    dx, dy = direcao
    x = _XS + 0.5
    y = _YS + 0.5
    zp = np.broadcast_to(np.asarray(z_pix, dtype=np.float32), (H, W))
    passo_mundo = 0.7 * (zp + D) / F / proj          # quanto o raio anda no espaço a cada passo de tela
    vivo = np.ones((H, W), dtype=np.float32)
    for i in range(passos):
        x = x + dx * 0.7
        y = y + dy * 0.7
        dentro = (x >= 0) & (x < W) & (y >= 0) & (y < H)
        xi = np.clip(x.astype(int), 0, W - 1)
        yi = np.clip(y.astype(int), 0, H - 1)
        o = oc_id[yi, xi]
        z_raio = zp + lz * passo_mundo * (i + 1)
        bate = dentro & (o > 0) & (o != pix_id) & (i > 1) & (np.abs(z_oc[yi, xi] - z_raio) < ESPESSURA)
        vivo = vivo * np.where(bate, 0.0, 1.0)
    return vivo


ESPESSURA = 0.16


@lru_cache(maxsize=1)
def camadas():
    """As camadas de pixel art (iguais nas três horas; só a luz muda)."""
    est = estrutura()
    c_chao, tapete = chao()
    esq, poltrona = lado_esquerdo()
    gav, gav_o, e_lamp = gaveteiro()
    ces = cesto()
    atr = atril()
    prat, e_cast = prateleira()
    vit, vit_o, vit_v, cri, vit_vid = vitrine()
    lum, e_est, furos = luminaria()
    for cam in (gav_o, ces, atr, prat):
        cam.contornar("#0e0604", 0.6)
    frente = primeiro_plano()
    return dict(est=est, estc=est["c"], chao=c_chao, tapete=tapete, esq=esq, poltrona=poltrona, gav=gav, gav_o=gav_o, e_lamp=e_lamp,
                ces=ces, atr=atr, prat=prat, e_cast=e_cast, vit=vit, vit_o=vit_o, vit_v=vit_v, cri=cri,
                vit_vid=vit_vid, lum=lum, e_est=e_est, furos=furos, frente=frente)


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    L = camadas()
    est = L["est"]
    rumo = per["rumo"]
    lx, ly, lz = rumo
    nrm = math.sqrt(lx * lx + ly * ly + lz * lz)
    lxn, lyn, lzn = lx / nrm, ly / nrm, lz / nrm

    # ── Mapas de profundidade (z), de identidade (quem faz sombra em quem) e de orientação da superfície.
    py = _YS + 0.5
    zmap = np.where(py < TETO_Y, z_teto(py), np.where(py < PISO_Y, ZB, z_chao(np.maximum(py, PISO_Y + 0.01)))).astype(np.float32)
    tipo = np.where(py < TETO_Y, 0, np.where(py < PISO_Y, 2, 1)).astype(np.int32)   # 0 forro, 1 horizontal, 2 parede, 3 objeto, 4 lado da vitrine
    pix_id = np.zeros((H, W), dtype=np.int32)
    oc_id = np.zeros((H, W), dtype=np.int32)
    z_oc = np.zeros((H, W), dtype=np.float32)
    # planos, de trás para a frente: (chave, z, desfoque, id de sombra, tipo, faz sombra)
    planos = [
        ("estc", None, 0.3, 1, 2, False),
        ("chao", None, 0.2, 2, 1, False),
        ("esq", ZB - 0.1, 0.55, 3, 3, False),
        ("prat", ZB - 0.05, 0.25, 4, 3, True),
        ("gav", Z_GAV, 0.25, 5, 3, True),
        ("gav_o", Z_GAV - 0.03, 0.2, 6, 3, True),
        ("ces", 0.58, 0.12, 7, 3, True),
        ("lum", 0.5, 0.15, 8, 3, True),
        ("vit_o", Z_VIT + 0.16, 0.0, 10, 3, False),
        ("vit", Z_VIT, 0.0, 10, 3, True),
        ("atr", Z_ATRIL, 0.0, 11, 3, True),
        ("poltrona", 0.22, 0.7, 12, 3, False),
    ]
    for (chave, z, _, ident, tp, sombra) in planos:
        a = L[chave].c[:, :, 3] > 0.5
        if z is not None:
            zmap = np.where(a, z, zmap)
        pix_id = np.where(a, ident, pix_id)
        tipo = np.where(a, tp, tipo)
        if sombra:
            oc_id = np.where(a, ident, oc_id)
            z_oc = np.where(a, z + 0.02, z_oc)
    # o vão do vidro do óculo é "parede" sem sol; os tampos (livro, gaveteiro, balcão, prateleiras) olham para cima
    lado_vit = (L["vit"].c[:, :, 3] > 0.5) & (_XS < VIT[0])
    tipo = np.where(lado_vit, 4, tipo)
    zmap = np.where(lado_vit, Z_VIT + 0.13, zmap)
    livro = (pix_id == 11) & (_YS < 108) & (_YS > 95)
    tipo = np.where(livro, 1, tipo)

    # ── O óculo: o céu da hora pelo vidro antigo.
    fora = pintar_fora(nome, per)
    fora3 = ampliar(fora)
    vidro3 = ampliar(est["vidro"][:, :, None])
    vid = desfocar(fora3, 1.2) * ampliar(est["var"])
    vid = vid * 0.92 + hexa(per["oculo_luz"]) * 0.08
    img = vid * vidro3

    # ── Albedo, de trás para a frente, com profundidade de campo.
    solido = np.zeros(img.shape[:2], dtype=np.float32)
    for (chave, _, raio, _, _, _) in planos:
        a = desfocar_rgba(ampliar(L[chave].c), raio)
        img = sobre(img, a)
        solido = np.maximum(solido, a[:, :, 3])
        if chave == "vit_o":
            vv = ampliar(L["vit_v"].c)       # o vidro da vitrine fica entre o conteúdo e a moldura
            img = sobre(img, vv)

    # Sombras de contato: debaixo do móvel, da vitrine, do atril, do cesto, da poltrona e na quina do chão.
    ao = Camada()
    for (cx, cy, rx, ry, a) in ((228, 124, 34, 2.5, 0.7), (426, 141, 44, 3, 0.8), (396, 136, 24, 4, 0.5),
                                (ATRIL_X, 139, 20, 2.2, 0.75), (244, 130, 12, 2, 0.7), (84, 146, 34, 3, 0.75),
                                (88, 124, 72, 2, 0.5), (168, 128, 9, 1.5, 0.6)):
        ao.elipse(cx, cy, rx, ry, "#000000", a)
    for x in range(W):
        ao.ret(x, PISO_Y, 1, 2, "#000000", 0.45)
    sombra_ao = desfocar_rgba(ampliar(ao.c), 4)
    img = img * (1 - sombra_ao[:, :, 3:4] * (1 - ampliar((L["tapete"] * 0)[:, :, None])))

    # ── O feixe: transmissão traçada em 3D (o caixilho radial projetado) × sombra dos objetos (traçada em tela).
    z3 = ampliar(zmap[:, :, None])[:, :, 0]
    gx, gy = (_GXS + 0.5) / ESC, (_GYS + 0.5) / ESC
    X3, Y3 = mundo(gx, gy, z3)
    T = transmissao(X3, Y3, z3, rumo)
    oc_sup = ocluir_tela(oc_id, pix_id, rumo_na_tela(0.4, rumo), z_oc, zmap, rumo)
    T = T * desfocar(ampliar(oc_sup[:, :, None]), 1.0)[:, :, 0]
    T = desfocar(T[:, :, None], 0.8)[:, :, 0]
    tipo3 = ampliar(tipo[:, :, None])[:, :, 0]
    rec = np.select([tipo3 == 1, tipo3 == 2, tipo3 == 3, tipo3 == 4],
                    [0.3 + 0.7 * lyn, 0.0, 0.3 + 0.28 * lyn + 0.26 * abs(lxn), 0.15 + 0.85 * max(0.0, -lxn)], 0.0)
    calmo_sol = np.clip((_GXS / ESC - 170) / 60, 0.0, 1)
    T = T * calmo_sol

    # ── Luz: ambiente + o óculo como fonte de área + sol traçado + chamas.
    amb = hexa(per["amb"]) * per["amb_k"]
    luz = np.zeros_like(img) + amb
    oc_luz = hexa(per["oculo_luz"]) * per["oculo_k"]
    luz += luz_pontual(OCULO[0], OCULO[1] + 10, 120, 0.85)[:, :, None] * oc_luz * 0.9
    luz += luz_pontual(OCULO[0] + 40, 120, 190, 0.6)[:, :, None] * oc_luz * 0.35
    sol = hexa(per["sol"]) * per["sol_k"]
    luz += (T * rec)[:, :, None] * sol
    # a mancha de sol rebate: aquece o chão em volta, o pé dos móveis e a parede de baixo
    rebat = desfocar((T * rec * (tipo3 != 2))[:, :, None], 60)
    luz += rebat * sol * 1.6
    acesas = []
    if per["lamp"] > 0:
        x_, y_ = LAMPARINA
        luz += luz_de_chama(x_, y_, 120, 0.75, 3)[:, :, None] * hexa("#ff9a48") * 0.95 * per["lamp"]
        luz += luz_pontual(x_, y_, 22, 1.0)[:, :, None] * hexa("#ffd890") * 0.6 * per["lamp"]
        acesas.append("e_lamp")
    if per["castical"] > 0:
        x_, y_ = CASTICAL
        sv = sombra_projetada(L["prat"].c[:, :, 3] > 0.5, (x_, y_), 0.25)
        sv = desfocar(ampliar(sv[:, :, None]), 2)[:, :, 0] * (tipo3 == 2)
        luz += luz_de_chama(x_, y_, 90, 0.8, 5)[:, :, None] * hexa("#ff9a48") * 0.85 * per["castical"] * (1 - sv * 0.5)[:, :, None]
        acesas.append("e_cast")
    if per["estrela"] > 0:
        x_, y_ = ESTRELA
        luz += luz_de_chama(x_, y_ + 8, 170, 0.8, 7)[:, :, None] * hexa("#ffa858") * 0.75 * per["estrela"]
        # os furinhos da estrela salpicam pontos de luz no forro, na cornija e na pedra em volta
        pontos = np.zeros((H, W), dtype=np.float32)
        ys_, xs_ = np.where(L["furos"] > 0)
        for (fy, fx) in zip(ys_, xs_):
            ddx, ddy = fx - x_, fy - y_
            for f in (2.6, 3.6, 4.8):
                qx, qy = x_ + ddx * f, y_ + ddy * f
                if 0 <= qx < W - 1 and 0 <= qy < H - 1 and tipo[int(qy), int(qx)] in (0, 2):
                    pontos[int(qy), int(qx)] += 1.0 / f
        pontos = np.maximum(pontos, np.roll(pontos, 1, 1))
        luz += desfocar(ampliar(pontos[:, :, None]), 1.4) * hexa("#ffc070") * 5.0 * per["estrela"]
        acesas.append("e_est")
    luz = np.minimum(luz, 2.8)
    s = solido[:, :, None]
    img = img * (1 - s) + img * s * luz

    # ── A vitrine: o vidro reflete a luz que bate nele; os cristais faíscam e jogam manchas de cor no veludo.
    cri3 = ampliar(L["cri"][:, :, None])[:, :, 0]
    vv3 = ampliar(L["vit_vid"][:, :, None])[:, :, 0]
    alb_o = ampliar(L["vit_o"].c)[:, :, :3]
    Tv = desfocar((T * (tipo3 != 2))[:, :, None], 1.0)[:, :, 0]
    brilho = cri3 * Tv
    manchas = desfocar((alb_o * brilho[:, :, None]), 5) * 2.2
    img += manchas * vv3[:, :, None] * sol * 0.6
    # faíscas: nos cristais onde o feixe bate (ou, à noite, onde a chama alcança), brilhos em X com halo; cada faísca
    # joga uma mancha da cor do cristal no veludo e na prateleira ao lado (a luz atravessando a pedra)
    T_arte = T[1::ESC, 1::ESC]
    cand = np.argwhere((L["cri"] > 0.4) & ((T_arte > 0.08) | (per["cristal"] > 0)))
    fa = np.zeros(img.shape[:2], dtype=np.float32)
    cor_mancha = np.zeros_like(img)
    if len(cand):
        gf = np.random.default_rng(13)
        n_f = 26 if per["cristal"] == 0 else 12
        for (yy, xx) in cand[gf.choice(len(cand), size=min(n_f, len(cand)), replace=False)]:
            forca = (T_arte[yy, xx] * 1.6 if per["cristal"] == 0 else 0.45) * (0.6 + 0.6 * gf.random())
            Y0, X0 = yy * ESC + 1, xx * ESC + 1
            for k in range(-4, 5):
                q = forca * (1 - abs(k) / 5)
                for (dy_, dx_) in ((k, k), (k, -k)):
                    if 0 <= Y0 + dy_ < H * ESC and 0 <= X0 + dx_ < W * ESC:
                        fa[Y0 + dy_, X0 + dx_] += q
            cy_, cx_ = min(H * ESC - 1, Y0 + 5), min(W * ESC - 1, X0 + 16)
            cor_mancha[cy_ - 3:cy_ + 3, cx_ - 4:cx_ + 4] += alb_o[Y0, X0] * forca
    img += (fa[:, :, None] * 1.6 + desfocar(fa[:, :, None], 3) * 2.4) * mistura(per["sol"], "#ffffff", 0.65)
    img += desfocar(cor_mancha, 5) * 2.4 * vv3[:, :, None]
    # o vidro das portas espelha o poente em faixas diagonais
    faixas = (np.sin((_GXS + _GYS * 0.6) / 6.0) > 0.75) | (np.sin((_GXS + _GYS * 0.6) / 2.3 + 1) > 0.97)
    reflexo_vid = vv3 * Tv * (0.25 + 0.75 * faixas)
    img += reflexo_vid[:, :, None] * sol * 0.45
    if per["cristal"] > 0:
        img += (desfocar((alb_o * cri3[:, :, None]), 1.0) * 0.35 + desfocar((alb_o * cri3[:, :, None]), 6) * 0.5) * per["cristal"]
    # o vidro da vitrine também devolve o reflexo das chamas à noite
    if per["castical"] > 0 or per["estrela"] > 0:
        img += (vv3 * (np.sin((_GXS + _GYS * 0.55) / 9.0) > 0.92))[:, :, None] * hexa("#ffb060") * 0.12

    # ── Feixe volumétrico: planos de ar traçados (o desenho radial do caixilho aparece no ar), com poeira.
    vol = np.zeros(img.shape[:2], dtype=np.float32)
    planos_ar = np.linspace(0.04, ZB - 0.02, 44)
    ancoras = np.linspace(0.04, ZB - 0.02, 9)
    ocl = [desfocar(ampliar(ocluir_tela(oc_id, np.zeros_like(pix_id), rumo_na_tela(za, rumo), z_oc, za, rumo, passos=90)[:, :, None]), 1.5)[:, :, 0]
           for za in ancoras]
    for zs in planos_ar:
        Xs, Ys = mundo(gx, gy, zs)
        dentro = (Ys > 0) & (Ys < YR) & (z3 > zs)
        Ts = transmissao(Xs, Ys, np.full_like(Xs, zs), rumo, fator=1.25) * dentro
        Ts = Ts * ocl[int(np.argmin(np.abs(ancoras - zs)))]
        vol += Ts
    vol = desfocar(vol[:, :, None], 2.2)[:, :, 0] / len(planos_ar)
    vol = np.power(np.clip(vol, 0, 1), 1.15) * calmo_sol
    densidade = 0.55 + 0.45 * desfocar(ampliar(ruido(93, 18, 8)[:, :, None]), 6)[:, :, 0]
    img += (vol * densidade)[:, :, None] * sol * per["feixe"] * 3.0
    g = np.random.default_rng(91)
    poeira = np.zeros(img.shape[:2], dtype=np.float32)
    for _ in range(5200):
        x, y = int(g.random() * W * ESC), int(g.random() * H * ESC)
        k = vol[y, x] * 5
        if k > 0.08 and g.random() < min(1, k) * 0.85:
            tam = 1 if g.random() < 0.7 else 2
            poeira[y:y + tam, x:x + tam] += 0.5 + g.random() * 0.5
    poeira = desfocar(np.clip(poeira, 0, 1)[:, :, None], 0.6)
    img += poeira * mistura(per["sol"], "#ffffff", 0.45) * (0.75 if nome != "noite" else 0.45)

    # ── Emissivos: o céu do óculo, as chamas com halo, a estrela acesa.
    img += vidro3 * vid * (1.1 if nome == "noite" else 0.65)
    chamas = Camada()
    for chave in acesas:
        colar(chamas, L[chave])
    if chamas.c[:, :, 3].any():
        ch = ampliar(chamas.c)
        img = sobre(img, ch)
        nucleo = (ch[:, :, 3:4] > 0.9).astype(np.float32)
        pm = ch[:, :, :3] * ch[:, :, 3:4] * (0.25 + 0.75 * nucleo)
        k = max(per["lamp"], per["castical"], per["estrela"])
        img += (desfocar(pm, 2.5) * 0.8 + desfocar(pm, 7) * 0.45 + desfocar(pm, 20) * 0.9) * hexa("#ffb060") * min(k, 1.2)

    # ── Primeiro plano desfocado e escuro.
    fr = desfocar_rgba(ampliar(L["frente"].c), 5)
    escur = 0.3 if nome == "noite" else 0.36
    img = sobre(img, fr * np.array([escur * 0.9, escur, escur * 0.95, 1], dtype=np.float32))

    # ── Acabamento: bloom, curva de tom, cor, esquerda calma, vinheta, grão.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img - 0.7, 0, None) * np.clip((lum - 0.55) * 3, 0, 1)
    img = img + desfocar(claro, 6) * 0.5 + desfocar(claro, 22) * 0.55
    joelho = 0.72
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, f = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (f * 0.5 + 0.5)))
    img = np.clip((img - 0.45) * 1.08 + 0.45, 0, 1.3)
    xn = _GXS / (W * ESC)
    calma = np.clip((0.46 - xn) / 0.16, 0, 1)[:, :, None]
    media = desfocar(np.clip(img, 0, 1.3), 16)
    img = media + (img - media) * (1 - 0.4 * calma)
    img *= 1 - 0.14 * calma
    v = (xn - 0.62) ** 2 * 1.1 + (_GYS / (H * ESC) - 0.42) ** 2 * 0.6
    img *= (1 - np.clip(v - 0.06, 0, 1) * 0.95)[:, :, None]
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.022
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    pedidas = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in pedidas:
        img = montar(nome)
        destino = PASTA / f"gabinete-{nome}.webp"
        img.save(destino, quality=88, method=6)
        menor = PASTA / f"gabinete-{nome}-960.webp"
        img.resize((960, 320), Image.LANCZOS).save(menor, quality=88, method=6)
        movel = PASTA / f"gabinete-{nome}-movel.webp"
        img.crop((MOVEL_X0 * ESC, 0, W * ESC, H * ESC)).save(movel, quality=82, method=6)
        print(destino.name, destino.stat().st_size // 1024, "KB |", menor.name, menor.stat().st_size // 1024, "KB |", movel.name, movel.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
