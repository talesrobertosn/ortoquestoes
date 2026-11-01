"""Cenário "HD-2D" da página de entrar e criar conta: o Salão de Leitura do castelo, a chegada do estudante (01/11/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai
das funções abaixo, na mesma técnica das outras cenas (scripts/gerar_cena_gabinete.py e scripts/gerar_cena_estufa.py
são a referência direta): pixel art em 480 x 160, camada por camada, montada em 3x com a luz calculada por pixel.

A metáfora: quem chega ao site entra no salão de leitura do castelo. O esqueleto mascote (sprite animado do site, posto
por cima da arte) está em pé no tapete, ao lado do atril com o grande livro aberto virado para ele: o estudo começa
ali. Em volta, tudo o que o site guarda: estantes cheias, pergaminhos, o tinteiro com a pena, os estandartes da casa.

A cena: um salão-biblioteca de pedra clara (silhar marfim) e madeira cor de mel, em dois andares. Estantes altas com as
lombadas uma a uma (cores, alturas, faixas douradas, etiquetas sem texto, livros deitados e inclinados, pequenos
objetos), armários de portas almofadadas embaixo, a galeria (mezanino) com balaústre torneado atravessando a cena,
apoiada em mísulas. No centro, entre duas pilastras, a janela alta em arco (aduelas, fecho, peitoril fundo) com vidros
em losango de chumbo e duas hastes de ferro, nada de vitral; nas pilastras, as tochas de ferro; pendurados na galeria,
os dois estandartes de tecido esmeralda com um livro aberto bordado em fio dourado (sem letras). Embaixo: o piso de
lajes claras em perspectiva, o tapete esmeralda e ouro, o atril de madeira com o livro aberto e as fitas, a mesa
pequena com a pilha de livros, os pergaminhos enrolados, o tinteiro com a pena e a lanterna de latão.

A luz:
- a sala tem geometria de verdade (câmera em perspectiva): cada pixel sabe onde está no espaço (X, altura, fundo) e
  "olha" para a luz até a parede do fundo; se o raio sai pelo vidro da janela, recebe luz (atravessando a espessura da
  parede: o raio precisa passar pelo vão nas duas faces), se bate no ferro, no chumbo ou na pedra, fica na sombra. Por
  isso o caixilho aparece projetado no chão, no tapete e no atril, e também no ar (o feixe volumétrico é a soma de
  vários planos de profundidade traçados do mesmo jeito), com poeira brilhando;
- os objetos (atril, mesa, galeria, estandartes) fazem sombra pelo traçado em tela, como no gabinete; cada chama
  também traça as suas: a galeria tapa a luz das estantes de cima, os estandartes sombreiam a pedra, o atril e a mesa
  deitam sombra no piso para longe da tocha e da lanterna;
- rebatimento quente (o que a chama ilumina devolve luz da sua cor em volta) e brilho especular quente no latão, no
  fio dourado dos estandartes e nas faixas douradas das lombadas, onde o sol traçado ou a chama alcança;
- dia: o amanhecer claro e quente; pedra marfim, madeira mel, papel; a luz dourada entra baixa pela janela e pousa no
  livro do atril; sombras leves e frias; as tochas apagadas. O ambiente lê como claro (o site está em tema claro);
- noite: as duas tochas e a lanterna da mesa acesas, com a borda da luz em faixas, as sombras da galeria e dos
  estandartes traçadas a partir de cada chama; o luar azul fraco entra pela janela; céu azul-noite com a lua;
- profundidade de campo leve, sombras de contato, bloom contido, mapeamento de tom, correção de cor, vinheta e grão.

Composição (contrato com a página; a interface vai por cima):
- canto de cima à esquerda (x < 210, y < 95) calmo e com pouco contraste: vai o título;
- terço de baixo à direita (x > 300, y > 95) calmo: um painel claro cobre essa área no computador;
- o esqueleto (48 x 64 px de arte, na escala do salão) fica em pé com os pés em y = 152, centrado em x = 228: o chão
  de x 200 a 256, y 140 a 154, é livre e plano (só o tapete); atrás da cabeça (x 204 a 252, y 86 a 110) só há parede
  lisa de pedra (as estantes de baixo param em x 200 e os estandartes terminam acima); o atril, com o tampo na altura
  da cintura dele, fica logo à esquerda (x 171 a 201), virado para ele;
- a janela alta em arco e o feixe principal ficam do centro para a direita (x 250 a 330, alto);
- no celular aparece só o recorte de x 150 até x 446 (MOVEL_X0, MOVEL_X1), com o esqueleto, o atril e a janela.

Gera em public/pixel/paginas/: portal-{dia,noite}.webp (1440 x 480), -960.webp (960 x 320) e -movel.webp
(888 x 480: de x 150 até x 446, a janela do celular).
Uso: python3 scripts/gerar_cena_portal.py [dia|noite ...]  (precisa de numpy e Pillow)
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
XC, YH, F, D, HC = 290.0, 80.0, 80.0, 1.0, 1.0
PISO_Y = 124                                   # junção da parede do fundo com o piso
ZB = F * HC / (PISO_Y - YH) - D                # profundidade da parede do fundo (0,818)
TETO_Y = 5                                     # onde o forro encontra a parede do fundo
YR = HC - (TETO_Y - YH) * (ZB + D) / F         # altura do forro
SW = (ZB + D) / F                              # quanto vale 1 px da arte na parede do fundo (unidade de mundo)
ESPESSURA_PAREDE = 0.10                        # a janela é funda: o raio precisa passar pelo vão nas duas faces

# A janela alta em arco (na parede do fundo, em px da arte).
JAN_CX = 290.0                                 # eixo da janela
JAN_R = 30.0                                   # meia largura do vão (e raio do arco)
JAN_YA = 44.0                                  # linha de nascença do arco
JAN_PEITORIL = 109.0                           # base do vão
ADUELA_R = 38.0                                # raio de fora do arco de aduelas
PIL_E = (236, 251)                             # pilastra da esquerda (x0, x1)
PIL_D = (329, 344)                             # pilastra da direita

# Galeria (mezanino) e estantes.
GAL_CORRIMAO = 30                              # topo do corrimão
GAL_PISO = 45                                  # topo da testeira do piso da galeria
GAL_BASE = 51                                  # fim da testeira (embaixo vêm as mísulas)
EST_BAIXA = 57                                 # topo das estantes de baixo
BALCAO_Y = 95                                  # tampo do balcão sobre os armários

# Objetos (profundidades).
Z_GAL = 0.60
Z_BAND = 0.64
Z_ATRIL = 0.15
Z_MESA = 0.33
ATRIL_X = 185

# Pontos de luz (centro da chama, em px da arte) e o recorte do celular.
TOCHA_E = (243.5, 61.5)
TOCHA_D = (336.5, 61.5)
LANTERNA = (151.5, 107.5)
MOVEL_X0, MOVEL_X1 = 150, 446
ESQUELETO = (228, 152)                         # pés do esqueleto (centro x, y); o sprite tem 48 x 64 px de arte
LIVRE = (200, 256, 140, 154)                   # chão livre e plano para os pés (x0, x1, y0, y1)
CABECA = (204, 252, 86, 110)                   # atrás da cabeça: só parede lisa


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
    """hash01 vetorizado para índices inteiros (lajes, pedras, losangos)."""
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


def colar(dst: Camada, src: Camada) -> None:
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
    """Se u está a menos de larg/2 da linha de grade mais próxima (mesma unidade)."""
    f = (u - desl) / passo
    d = np.abs(f - np.round(f)) * passo
    return d < larg / 2


def para_hex(rgb) -> str:
    r, g, b = (int(np.clip(v, 0, 1) * 255 + 0.5) for v in rgb)
    return f"#{r:02x}{g:02x}{b:02x}"


# Paletas (do escuro ao claro). A luz da hora entra depois, na montagem.
PEDRA = ["#5e5446", "#786c5a", "#948670", "#ae9f86", "#c5b79c", "#d8ccb2", "#e8dfca", "#f4eedf"]
LAJE = ["#7a705e", "#958a74", "#ada28a", "#c2b89e", "#d4cbb2", "#e3dbc6", "#efe9da"]
MEL = ["#3a2412", "#56371b", "#744d25", "#916230", "#ad7a3e", "#c6934f", "#dcae68", "#ecc888"]
MEL_ESC = ["#1e1209", "#2c1b0e", "#3c2513", "#4e311a"]
FERRO = ["#141416", "#22222a", "#33333c", "#474752", "#62626e", "#868694"]
TECIDO = ["#04201a", "#0a3029", "#0C3C34", "#124d43", "#17675B", "#1f7a6b", "#2c917e", "#46ab95"]
FIO = ["#5a3c10", "#8a6420", "#b88a34", "#E4B85C", "#f2d48a", "#fff0c0"]
LATAO = ["#2a1a08", "#5a3a12", "#8a5e1e", "#b4802c", "#d6a242", "#efc66e", "#fff0b8"]
PERGAMINHO = ["#5a4a30", "#857152", "#ad9a74", "#cdbd96", "#e6dab8", "#f6efd8"]
PAPEL = ["#8a8270", "#b0a890", "#d0c8b0", "#e8e2d0", "#f8f4e8"]
COURO = ["#2a0e09", "#40160e", "#581f13", "#702a18", "#8a3a22"]
CERA = ["#b8a888", "#d8ccac", "#efe6cc", "#fff8e8"]
TAPETE = {"esm": "#0f4a3e", "esm2": "#17675B", "esm3": "#1f7a6b", "ouro": "#c09440", "ouro2": "#E4B85C",
          "verm": "#7a2a1e", "verm2": "#9a3c26", "marfim": "#e8dcbc", "noite": "#1c2a40", "barra": "#3a1a10"}
LOMBADAS = ["#7a2a22", "#9a4a2a", "#2a5a3a", "#17675B", "#2a3a5e", "#4a6a8a", "#b8862e", "#a8865a", "#5a3a24",
            "#d8c8a0", "#6a6a34", "#2a6a6a", "#6a2234", "#7a7468", "#c4a46a", "#3a4a2a", "#8a5a3a", "#c87a3a"]
OURO = "#E4B85C"
METAIS = (LATAO[3], LATAO[4], LATAO[5], LATAO[6], FIO[2], FIO[3], FIO[4], FIO[5])   # brilham (especular quente)


# ─────────────────────────────── Horas ───────────────────────────────
def _rumo_para(x: float, y: float, z: float, alvo=(JAN_CX, 72.0)) -> tuple:
    """Direção (X, Y, Z) que vai do ponto (x, y da arte na profundidade z) até um ponto da janela: a luz que pousa ali."""
    X = (x - XC) * (z + D) / F
    Y = HC - (y - YH) * (z + D) / F
    Xo = (alvo[0] - XC) * SW
    Yo = HC - (alvo[1] - YH) * SW
    return (Xo - X, Yo - Y, ZB - z)


PERIODOS = {
    "dia": dict(
        ceu=("#6f9ed4", "#efc898", "#ffcf88"), morro=("#6a7c98", "#93a0b4"), torre="#7e6e68", copa="#46563a",
        amb="#f6e2c2", amb_k=0.8, jan_luz="#ffe8c0", jan_k=0.45,
        sol="#ffc878", sol_k=1.15, rumo=(1.3, 2.2, 1.0), feixe=0.6,
        tochas=0.0, lanterna=0.0, quente="#fff0d0", fria="#cfd4e2", calma="#f4ead8", calma_k=0.75),
    "noite": dict(
        ceu=("#121a34", "#1c2a52", "#2e4272"), morro=("#141e3a", "#1c2a4a"), torre="#18213c", copa="#0c1424",
        amb="#5a6894", amb_k=0.52, jan_luz="#8aa4e0", jan_k=0.45,
        sol="#a8c2ff", sol_k=0.42, rumo=_rumo_para(275, 138, 80 / 58 - 1, (JAN_CX - 6, 40.0)), feixe=0.22,
        tochas=1.0, lanterna=1.0, quente="#ffd49a", fria="#1a2440", calma="#1e2236", calma_k=0.45),
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


def vao_janela(xw, yw):
    """Se o ponto (px da parede) está dentro do vão da janela."""
    dx = xw - JAN_CX
    reto = (np.abs(dx) < JAN_R) & (yw >= JAN_YA) & (yw < JAN_PEITORIL)
    arco = (np.hypot(dx, yw - JAN_YA) < JAN_R) & (yw < JAN_YA)
    return reto | arco


def caixilho_janela(xw, yw, fator: float = 1.0, continuo: bool = False):
    """O caixilho em px da parede: aro de ferro, duas hastes verticais (três luzes), barras de apoio finas e a rede de
    chumbo em losangos. Nada em cruz no meio, nada de vitral. Devolve (ferro, chumbo, id do losango)."""
    dx = xw - JAN_CX
    r = np.hypot(dx, yw - JAN_YA)
    aro = np.where(yw < JAN_YA, r > JAN_R - 1.4 * fator, np.abs(dx) > JAN_R - 1.4 * fator) | (yw > JAN_PEITORIL - 1.4 * fator)
    hastes = (np.abs(np.abs(dx) - JAN_R / 3) < 0.8 * fator) & (yw > JAN_YA - math.sqrt(JAN_R ** 2 - (JAN_R / 3) ** 2) + 1)
    barras = np.zeros_like(aro)
    for yb in (60.0, 77.0, 94.0):
        barras |= np.abs(yw - yb) < 0.45 * fator
    ferro = aro | hastes | barras
    # losangos de 8 x 16 px: as linhas sobem 2 px para cada 1 px de lado (degrau limpo de pixel art)
    # (no traçado da luz, `continuo` usa a posição exata: a rede projetada no chão sai em linhas, não em pontos)
    fx_ = (lambda v: v) if continuo else np.floor
    a = (fx_(dx) + fx_(yw - JAN_YA) * 0.5) / 8.0
    b = (fx_(dx) - fx_(yw - JAN_YA) * 0.5) / 8.0
    da = (a * 8.0) % 8.0
    db = (b * 8.0) % 8.0
    if continuo:
        da = np.minimum(da, 8.0 - da) * 2
        db = np.minimum(db, 8.0 - db) * 2
    chumbo = (da < 0.75 * fator) | (db < 0.75 * fator)
    ident = np.floor(a).astype(int) * 131 + np.floor(b).astype(int)
    return ferro, chumbo, ident


def transmissao(X, Y, Z, rumo, fator: float = 1.0) -> np.ndarray:
    """Quanto de luz chega no ponto (X, Y, Z) vindo da direção `rumo`: anda até a face de dentro da parede do fundo e
    olha o que há lá (o vidro, o chumbo, o ferro ou a pedra); depois confere a face de fora (a parede é funda)."""
    lx, ly, lz = rumo
    out = np.ones_like(X, dtype=np.float32)
    for k, zp in enumerate((ZB, ZB + ESPESSURA_PAREDE)):
        t = (zp - Z) / max(lz, 1e-6)
        ex, ey = X + lx * t, Y + ly * t
        xw = XC + ex / SW
        yw = YH + (HC - ey) / SW
        dentro = vao_janela(xw, yw)
        if k == 0:
            ferro, chumbo, ident = caixilho_janela(xw, yw, fator, continuo=True)
            v = dentro.astype(np.float32) * (1 - ferro) * (1 - 0.6 * chumbo)
            v = v * (0.84 + 0.16 * hash_arr(ident, 3, 5))         # vidro antigo: cada losango passa um pouco diferente
        else:
            v = dentro.astype(np.float32)
        out = out * v
    out = np.where((Z > ZB - 0.004) | (Y < -0.01) | (Y > YR), 0.0, out)
    return out.astype(np.float32)


# ─────────────────────────────── Lá fora (visto pela janela) ───────────────────────────────
def pintar_fora(nome: str, per: dict) -> np.ndarray:
    """O céu da hora, os morros, as torres do castelo do outro lado do pátio e um galho. Só aparece pelo vidro."""
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    t = np.clip((_YS - 12) / 92, 0, 1)[:, :, None]
    ceu = np.where(t < 0.6, topo * (1 - t / 0.6) + meio * (t / 0.6), meio * (1 - (t - 0.6) / 0.4) + horiz * ((t - 0.6) / 0.4))
    ceu = ceu.astype(np.float32)
    nuv = ruido(41, 14, 3) * 0.6 + ruido(42, 5, 2) * 0.4
    faixa = np.exp(-((_YS - 34) / 9) ** 2) + np.exp(-((_YS - 58) / 5) ** 2) * 0.6
    v = np.clip((nuv - 0.5) * 3.0 * faixa, 0, 0.8)
    if nome == "dia":
        # nuvens com a barriga rosada-dourada do amanhecer e a borda de cima clara
        borda = (np.roll(nuv, 1, 0) < nuv)[:, :, None]
        cn = np.where(borda, hexa("#fff6e6"), hexa("#f4c8a0"))
        ceu = ceu * (1 - v[:, :, None] * 0.8) + cn * v[:, :, None] * 0.8
        # o sol nascendo baixo, à direita do vão
        d = np.hypot(_XS - (JAN_CX + 14), (_YS - 90) * 1.1)
        ceu += (np.exp(-d / 26) * 0.7)[:, :, None] * hexa("#ffe0a0")
        ceu = np.where((d < 4.2)[:, :, None], hexa("#fff8e0") * 1.3, ceu)
    else:
        g = np.random.default_rng(17)
        for _ in range(160):
            x, y = int(JAN_CX - 30 + g.random() * 60), int(10 + g.random() * 70)
            ceu[y, x] += (0.2 + g.random() ** 2 * 0.9) * hexa("#e4ecff")
        lx, ly = JAN_CX - 9.0, 30.0
        dl = np.hypot(_XS - lx, _YS - ly)
        lua = np.clip(5.2 - dl, 0, 1)
        mares = ruido(44, 2) > 0.62
        cor_lua = np.where(mares[:, :, None], hexa("#ccd2e0"), hexa("#f6f4e6"))
        ceu = ceu * (1 - lua[:, :, None]) + cor_lua * lua[:, :, None] * 1.25
        ceu += (np.exp(-dl / 13) * 0.42)[:, :, None] * hexa("#9ab4f0")
        ceu = ceu * (1 - v[:, :, None] * 0.35) + hexa("#2c3c64") * v[:, :, None] * 0.35
    # morros em duas camadas
    m0, m1 = hexa(per["morro"][0]), hexa(per["morro"][1])
    for x in range(int(JAN_CX - 32), int(JAN_CX + 33)):
        y1 = 84 + 3 * math.sin(x / 7.0) + 1.5 * math.sin(x / 2.7 + 1)
        y0 = 92 + 2 * math.sin(x / 5.0 + 2)
        for y in range(int(y1), H):
            ceu[y, x] = m1 * 0.7 + ceu[y, x] * 0.3
        for y in range(int(y0), H):
            ceu[y, x] = m0
    # torres do castelo do outro lado do pátio (telhado cônico, ameias, janelinhas)
    tor = hexa(per["torre"])
    for (tx, ytop, larg) in ((int(JAN_CX) - 17, 58, 7), (int(JAN_CX) + 19, 66, 6), (int(JAN_CX) + 2, 80, 30)):
        if larg > 20:     # o muro com ameias
            for x in range(tx - larg // 2, tx + larg // 2):
                for y in range(ytop, H):
                    ceu[y, x] = tor * (0.92 + 0.08 * ((x // 3 + y // 2) % 2))
                if x % 4 < 2:
                    ceu[ytop - 1, x] = tor * 0.9
                    ceu[ytop - 2, x] = tor * 0.9
            continue
        for y in range(ytop, H):
            for x in range(tx - larg // 2, tx + larg // 2 + 1):
                ceu[y, x] = tor * (1.1 if x == tx - larg // 2 else 0.86 if x == tx + larg // 2 else 1.0)
        for k in range(9):
            for x in range(tx - larg // 2 - 1 + k // 2, tx + larg // 2 + 2 - k // 2):
                ceu[ytop - 1 - k, x] = tor * (0.8 if x > tx else 0.92)
        ceu[ytop + 5, tx] = hexa("#ffcf70") * (1.5 if nome == "noite" else 0.45)
        ceu[ytop + 6, tx] = hexa("#ffcf70") * (1.2 if nome == "noite" else 0.4)
    # bandeirola na torre da esquerda (só a forma, sem símbolo)
    for k in range(4):
        ceu[58 - 11 + k // 2, int(JAN_CX - 17) + 1 + k] = hexa("#17675B") * (1.0 if nome == "dia" else 0.5)
    # galho com folhas entrando pela direita do vão (contra a luz)
    copa = hexa(per["copa"])
    g = np.random.default_rng(23)
    for i in range(20):
        x = JAN_CX + 30 - i
        y = 22 + i * 0.4 + math.sin(i / 2.2) * 1.0
        ceu[int(y), int(x)] = copa * 0.75
        if i % 2 == 0:
            for _ in range(6):
                fx, fy = x + g.normal(0, 1.8), y + g.normal(0.6, 1.6)
                ceu[int(fy), int(fx)] = copa * (0.85 + 0.35 * g.random())
    return np.clip(ceu, 0, 1.6)


# ─────────────────────────────── Pincéis de marcenaria ───────────────────────────────
def madeira(c: Camada, x0, y0, w, h, tons, seed: int, k0: float = 0.5, amp: float = 0.26, vertical: bool = False) -> None:
    """Retângulo de madeira com veio (manchas alongadas e linhas finas)."""
    x0, y0, w, h = int(x0), int(y0), int(w), int(h)
    if w <= 0 or h <= 0:
        return
    m = np.zeros((H, W), dtype=np.float32)
    m[max(0, y0):max(0, y0 + h), max(0, x0):max(0, x0 + w)] = 1
    veio = ruido(seed, 1, 9) if vertical else ruido(seed, 11, 1)
    fino = ruido(seed + 1, 1, 4) if vertical else ruido(seed + 1, 5, 1)
    k = k0 + (veio - 0.5) * amp + (fino - 0.5) * amp * 0.6
    linhas = (np.sin((_XS if vertical else _YS) * 2.1 + veio * 9) > 0.86)
    k = np.where(linhas, k - 0.08, k)
    c.mascara(m, tons_arr(tons, k))


def bisel(c: Camada, x0, y0, w, h, tons, k: float, seed: int, vertical: bool = False) -> None:
    """Almofada em relevo: borda clara em cima e à esquerda, escura embaixo e à direita, campo com veio."""
    madeira(c, x0, y0, w, h, tons, seed, k, vertical=vertical)
    c.ret(x0, y0, w, 1, tons_idx(tons, k + 0.26))
    c.ret(x0, y0, 1, h, tons_idx(tons, k + 0.16))
    c.ret(x0, y0 + h - 1, w, 1, tons_idx(tons, k - 0.3))
    c.ret(x0 + w - 1, y0, 1, h, tons_idx(tons, k - 0.22))


def calmo(x: float, y: float) -> float:
    """0..1: quanto o ponto está nas áreas calmas (título em cima à esquerda; painel embaixo à direita)."""
    a = np.clip((214 - x) / 18, 0, 1) * np.clip((99 - y) / 10, 0, 1)
    b = np.clip((x - 296) / 18, 0, 1) * np.clip((y - 91) / 10, 0, 1)
    return float(max(a, b))


# ─────────────────────────────── Estrutura: forro, parede de pedra, janela, pilastras ───────────────────────────────
def estrutura() -> dict:
    """O forro de vigas, a cornija, a parede de silhar marfim, as pilastras, a janela em arco (aduelas, fecho, jambas
    em cunhal, peitoril fundo, caixilho de ferro e a rede de chumbo). Devolve a camada e os mapas do vidro."""
    c = Camada()
    px, py = _XS + 0.5, _YS + 0.5

    # ── Forro (y < TETO_Y): vigas de mel correndo para o fundo e tábuas atravessadas.
    zt = z_teto(py)
    Xt, _ = mundo(px, py, zt)
    teto = py < TETO_Y
    viga = perto(Xt, 0.7, 0.16)
    dv = (Xt / 0.7 - np.round(Xt / 0.7)) * 0.7 * F / (zt + D)
    k = 0.34 + (ruido(31, 9, 1) - 0.5) * 0.14 + 0.05 * np.sign(np.sin(zt * 52))
    k = np.where(perto(zt, 0.075, 0.008), 0.1, k)
    k = np.where(viga, 0.5 + 0.2 * (dv < -0.5) - 0.18 * (dv > 0.9), k)
    c.mascara(teto.astype(np.float32), tons_arr(MEL, k))

    # ── Parede de silhar marfim: fiadas de 7 px, juntas desencontradas, faces cinzeladas, algumas pedras mais quentes.
    parede = (py >= TETO_Y) & (py < PISO_Y)
    y0p = TETO_Y + 3
    fi = np.floor((py - y0p) / 7).astype(int)
    ey = (py - y0p) % 7
    bx = np.zeros((H, W), dtype=int)
    ex = np.zeros((H, W), dtype=np.float32)
    larg = np.ones((H, W), dtype=np.float32)
    gp = np.random.default_rng(32)
    for f_ in range(-1, (PISO_Y - y0p) // 7 + 2):
        bordas = [-gp.random() * 20]
        while bordas[-1] < W + 30:
            bordas.append(bordas[-1] + 12 + gp.random() * 16)
        bordas = np.array(bordas)
        linha = fi == f_
        idx = np.clip(np.searchsorted(bordas, px[0], side="right") - 1, 0, len(bordas) - 2)
        bx = np.where(linha, idx[None, :] + (f_ + 1) * 100, bx)
        ex = np.where(linha, (px[0] - bordas[idx])[None, :], ex)
        larg = np.where(linha, (bordas[idx + 1] - bordas[idx])[None, :], larg)
    n = ruido(34, 2)
    kp = 0.62 + (hash_arr(bx, fi, 35) - 0.5) * 0.16 + (n - 0.5) * 0.12
    kp += 0.1 * (ey < 1) + 0.05 * (ex < 1.2) - 0.08 * (ey > 5.2) - 0.05 * (ex > larg - 1.5) + (ruido(30, 6, 3) - 0.5) * 0.1
    junta = (ey > 6.1) | (ex > larg - 0.8)
    kp = np.where(junta, 0.3, kp)
    lasca = (ruido(36, 3) > 0.76) & ~junta
    kp = np.where(lasca, kp - 0.1, kp)
    cor = tons_arr(PEDRA, kp)
    quente = hash_arr(bx, fi, 37) > 0.72
    cor = np.where(quente[:, :, None], cor * np.array([1.04, 1.0, 0.92], dtype=np.float32), cor)
    c.mascara(parede.astype(np.float32), cor)

    # ── Cornija de pedra sob o forro (perfil em degraus, com dentículos).
    for x in range(W):
        c.p(x, TETO_Y, PEDRA[3])
        c.p(x, TETO_Y + 1, PEDRA[7])
        c.p(x, TETO_Y + 2, PEDRA[5] if x % 4 else PEDRA[3])
        c.p(x, TETO_Y + 3, PEDRA[4] if x % 4 < 2 else PEDRA[6])
        c.p(x, TETO_Y + 4, "#000000", 0.18)

    # ── As pilastras: fuste com caneluras rasas, base e capitel no nível da galeria.
    for (x0, x1) in (PIL_E, PIL_D):
        for y in range(TETO_Y + 4, PISO_Y):
            for x in range(x0, x1):
                u = (x - x0) / (x1 - x0 - 1)
                kk = 0.66 - 0.22 * max(0.0, u - 0.7) / 0.3 + 0.08 * (u < 0.12)
                if (x - x0) in (4, 10) and GAL_BASE + 6 < y < PISO_Y - 8:
                    kk -= 0.06                                    # caneluras (rasas: atrás do esqueleto a parede é calma)
                if (x - x0) in (5, 11) and GAL_BASE + 6 < y < PISO_Y - 8:
                    kk += 0.03
                kk += (hash01(x, y // 7, 38) - 0.5) * 0.06 + (n[y, x] - 0.5) * 0.08
                if (y - TETO_Y) % 14 == 0:
                    kk = 0.4                                      # junta das pedras do fuste
                c.p(x, y, tons_idx(PEDRA, kk))
        # capitel (no nível da galeria) e base (plinto)
        for (yy, alt, sobra) in ((GAL_PISO - 1, 2, 2), (GAL_PISO + 1, 4, 1), (GAL_BASE + 1, 2, 0)):
            c.ret(x0 - sobra, yy, x1 - x0 + 2 * sobra, alt, PEDRA[5])
            c.ret(x0 - sobra, yy, x1 - x0 + 2 * sobra, 1, PEDRA[7])
            c.ret(x0 - sobra, yy + alt - 1, x1 - x0 + 2 * sobra, 1, PEDRA[2])
        for (yy, alt, sobra) in ((PISO_Y - 9, 2, 1), (PISO_Y - 7, 7, 2)):
            c.ret(x0 - sobra, yy, x1 - x0 + 2 * sobra, alt, PEDRA[5])
            c.ret(x0 - sobra, yy, x1 - x0 + 2 * sobra, 1, PEDRA[7])
            c.ret(x0 + x1 - x0 + sobra - 1, yy, 1, alt, PEDRA[3])
        c.ret(x0 - 2, PISO_Y - 1, x1 - x0 + 4, 1, PEDRA[1])

    # ── A janela: o arco de aduelas em leque com o fecho, as jambas em cunhal, o vão fundo e o peitoril.
    dx, dyy = px - JAN_CX, py - JAN_YA
    r = np.hypot(dx, dyy)
    ang = np.arctan2(dyy, dx)
    aduela = (dyy < 0) & (r >= JAN_R + 2) & (r < ADUELA_R)
    na = 13
    ia = np.floor((ang + math.pi) / (math.pi / na)).astype(int)
    fa = (ang + math.pi) / (math.pi / na) - ia
    ka = 0.62 + (hash_arr(ia, 3, 39) - 0.5) * 0.14 + (n - 0.5) * 0.1
    ka += 0.12 * (r > ADUELA_R - 1.3) - 0.12 * (r < JAN_R + 3)
    ka = np.where((fa < 0.08) | (fa > 0.92) | (r > ADUELA_R - 0.6), 0.32, ka)
    fecho = aduela & (ia == na // 2 + na // 2) | aduela & (np.abs(dx) < 3.5)
    ka = np.where(fecho, ka + 0.1, ka)
    c.mascara(aduela.astype(np.float32), tons_arr(PEDRA, ka))
    # o fecho sobressai um pouco acima do arco
    for yy in range(int(JAN_YA - ADUELA_R - 2), int(JAN_YA - ADUELA_R + 1)):
        for xx in range(int(JAN_CX - 4), int(JAN_CX + 5)):
            c.p(xx, yy, tons_idx(PEDRA, 0.86 if yy == int(JAN_YA - ADUELA_R - 2) else 0.7 - 0.03 * (xx - JAN_CX)))
    # jambas em cunhal: pedras alternadas, longas e curtas
    for lado in (-1, 1):
        for j, y in enumerate(range(int(JAN_YA), int(JAN_PEITORIL) + 3, 7)):
            larg_q = 8 if j % 2 == 0 else 5
            x_in = JAN_CX + lado * (JAN_R + 2)
            xa = x_in if lado > 0 else x_in - larg_q
            kq = 0.68 + (hash01(j, lado, 40) - 0.5) * 0.12
            for yy in range(y, min(y + 7, int(JAN_PEITORIL) + 3)):
                for xx in range(int(xa), int(xa + larg_q)):
                    kk = kq + 0.1 * (yy == y) - 0.08 * (yy == y + 6) + (n[yy, xx] - 0.5) * 0.08
                    if yy == y + 6 or (xx == int(xa) and lado > 0) or (xx == int(xa + larg_q) - 1 and lado < 0):
                        kk = 0.34
                    c.p(xx, yy, tons_idx(PEDRA, kk))
    # o vão fundo (ombreira): 2 px de pedra em volta do vidro; em cima é sombra, nas laterais meia-luz
    vao_ext = (np.where(dyy < 0, r < JAN_R + 2, np.abs(dx) < JAN_R + 2)) & (py < JAN_PEITORIL + 2) & (py > JAN_YA - JAN_R - 2)
    vao = vao_janela(px, py)
    ombreira = vao_ext & ~vao
    k_omb = np.where(dyy < 0, 0.28 + 0.3 * (dyy / -JAN_R) * 0, 0.42 + 0.1 * (dx > 0))
    c.mascara(ombreira.astype(np.float32), tons_arr(PEDRA, k_omb))
    # o peitoril: a pedra funda vista de cima (recebe a luz), a quina e a pingadeira
    yp = int(JAN_PEITORIL)
    for x in range(int(JAN_CX - JAN_R - 3), int(JAN_CX + JAN_R + 3)):
        c.p(x, yp, PEDRA[5])
        c.p(x, yp + 1, PEDRA[6])
        c.p(x, yp + 2, PEDRA[7])
        c.p(x, yp + 3, PEDRA[4])
        c.p(x, yp + 4, PEDRA[2])
        c.p(x, yp + 5, "#000000", 0.25)
    peitoril = np.zeros((H, W), dtype=np.float32)
    peitoril[yp:yp + 3, int(JAN_CX - JAN_R - 3):int(JAN_CX + JAN_R + 3)] = 1
    # caixilho de ferro e chumbo
    ferro, chumbo, ident = caixilho_janela(px, py)
    kf = 0.45 + 0.25 * (dx < 0) * (np.abs(dx) > JAN_R - 1.5) + (ruido(39, 2) - 0.5) * 0.12
    c.c[vao, 3] = 0.0                                            # tira a pedra de dentro do vão
    c.mascara((vao & ferro).astype(np.float32), tons_arr(FERRO, kf))
    so_chumbo = vao & chumbo & ~ferro
    c.c[so_chumbo, :3] = hexa("#2e2e34")
    c.c[so_chumbo, 3] = 0.72                                     # o chumbo deixa passar um fio de luz nas bordas
    vid = (vao & ~ferro).astype(np.float32) * np.where(chumbo, 0.28, 1.0)
    # vidro antigo: cada losango com um tom (claro, âmbar bem leve, verde-água bem leve), nada de cor forte
    hq = hash_arr(ident, 1, 71)
    var = np.ones((H, W, 3), dtype=np.float32) * (0.9 + 0.14 * hq)[:, :, None]
    var = np.where((hq > 0.78)[:, :, None], var * np.array([1.04, 1.0, 0.88], dtype=np.float32), var)
    var = np.where((hq < 0.16)[:, :, None], var * np.array([0.92, 1.0, 0.97], dtype=np.float32), var)
    return dict(c=c, vidro=vid, var=var, peitoril=peitoril)


# ─────────────────────────────── Livros ───────────────────────────────
def tom(cor, f: float) -> str:
    return para_hex(np.clip(hexa(cor) * f, 0, 1))


def fileira(c: Camada, x0: int, x1: int, yb: int, hmax: int, seed: int, objetos: bool = True) -> None:
    """Uma prateleira de livros, um a um: largura, altura, cor, faixas douradas, etiqueta sem texto, alguns inclinados,
    pilhas deitadas, vãos e pequenos objetos. yb é a linha de apoio (o topo da tábua)."""
    g = np.random.default_rng(seed)
    x = x0
    inclinado_prev = False
    while x < x1:
        resto = x1 - x
        r = g.random()
        cal = calmo(x, yb - hmax / 2)
        if r < 0.045 and resto > 11 and objetos:                  # pilha deitada
            n = 2 + int(g.random() * 3)
            w = 7 + int(g.random() * 4)
            y = yb
            for i in range(n):
                th = 2 + (g.random() < 0.3)
                base = LOMBADAS[int(g.random() * len(LOMBADAS))]
                dxp = int(g.random() * 2)
                c.ret(x + dxp, y - th, w - 1, th, tom(base, 0.9))
                c.ret(x + dxp, y - th, w - 1, 1, tom(base, 1.18))
                c.ret(x + dxp + w - 2, y - th, 1, th, PAPEL[2])           # o corte das folhas
                if th == 3:
                    c.ret(x + dxp + 2, y - 2, 2, 1, tom(OURO, 0.85))
                y -= th
            x += w + 1
            continue
        if r < 0.075 and resto > 4:                                # vão (o fundo da estante aparece)
            x += 2 + int(g.random() * 3)
            continue
        if r < 0.10 and resto > 7 and objetos:                     # pequeno objeto
            tipo = int(g.random() * 4)
            if tipo == 0:      # pote de cerâmica com tampa
                c.ret(x + 1, yb - 6, 4, 6, "#4a6a62")
                c.ret(x + 1, yb - 6, 1, 6, "#6a8a80")
                c.ret(x + 4, yb - 6, 1, 6, "#2e4640")
                c.ret(x + 2, yb - 8, 2, 2, "#8a6a44")
            elif tipo == 1:    # ampulheta pequena
                c.ret(x + 1, yb - 8, 5, 1, MEL[4])
                c.ret(x + 1, yb - 1, 5, 1, MEL[4])
                for j in range(6):
                    w2 = 1 + abs(j - 2.5) * 0.7
                    c.ret(x + 3.5 - w2, yb - 7 + j, w2 * 2, 1, "#cfe0e4", 0.6)
                c.ret(x + 3, yb - 3, 1, 2, "#e4c48a")
            elif tipo == 2:    # globo pequeno de latão
                c.elipse(x + 3.5, yb - 5, 3, 3, "#2a5a6a")
                c.p(x + 2, yb - 6, "#6aa0a8")
                c.p(x + 4, yb - 4, "#8a7a4a")
                c.ret(x + 2, yb - 1, 4, 1, LATAO[3])
                c.p(x + 6, yb - 6, LATAO[4])
            else:              # caixinha de madeira
                c.ret(x + 1, yb - 4, 6, 4, MEL[3])
                c.ret(x + 1, yb - 4, 6, 1, MEL[5])
                c.p(x + 4, yb - 2, LATAO[5])
            x += 7 + int(g.random() * 2)
            continue
        w = [2, 2, 3, 3, 3, 3, 4, 4, 5][int(g.random() * 9)]
        w = min(w, resto)
        h = hmax - int(g.random() * 5) - (1 if w == 2 else 0)
        base = hexa(LOMBADAS[int(g.random() * len(LOMBADAS))])
        base = base * (0.86 + 0.24 * g.random())
        if cal > 0:
            base = base * (1 - 0.45 * cal) + hexa("#9a7a54") * 0.45 * cal      # lado calmo: cores mais apagadas
        claro, meio, esc = (para_hex(np.clip(base * f, 0, 1)) for f in (1.22, 1.0, 0.68))
        incl = (not inclinado_prev) and g.random() < 0.05 and resto > w + 3
        for i in range(w):
            corx = claro if i == 0 else esc if i == w - 1 else meio
            for y in range(yb - h, yb):
                xx = x + i + (int((yb - y) * 0.28) if incl else 0)
                c.p(xx, y, corx)
        topo = para_hex(np.clip(base * 1.35, 0, 1))
        c.ret(x + (int(h * 0.28) if incl else 0), yb - h, w, 1, topo)
        if g.random() < 0.65 and h > 7 and not incl:               # faixas douradas (ou escuras) no alto e embaixo
            fx = FIO[2 + int(g.random() * 3)] if g.random() < 0.7 else esc
            c.ret(x, yb - h + 2, w, 1, fx)
            c.ret(x, yb - 3, w, 1, fx)
            if g.random() < 0.35:
                c.ret(x, yb - h + 4, w, 1, fx)
        if w >= 3 and g.random() < 0.4 and h > 8 and not incl:     # etiqueta (sem texto)
            c.ret(x + 1, yb - h + 5, w - 2, 2, tom("#e8dcb8", 0.9 - 0.25 * cal))
        x += w + (1 if g.random() < 0.06 else 0)
        if incl:
            x += 3
        inclinado_prev = incl


# ─────────────────────────────── Estantes, galeria e armários ───────────────────────────────
TRECHOS = ((0, PIL_E[0] - 2), (PIL_D[1] + 2, W))   # as estantes do andar de cima, de cada lado das pilastras
BAIXO = ((0, 200), (PIL_D[1] + 2, W))             # as de baixo: à esquerda param antes do esqueleto (parede lisa atrás)


def estantes() -> tuple[Camada, np.ndarray]:
    """As estantes do andar de cima (atrás do balaústre), as de baixo e os armários de portas almofadadas com o balcão.
    Devolve a camada e a máscara dos tampos (o balcão olha para cima)."""
    c = Camada()
    tampos = np.zeros((H, W), dtype=np.float32)
    for t, (x0, x1) in enumerate(TRECHOS):
        # ── Andar de cima: caixa, tábuas, divisórias e livros.
        yt, yb = TETO_Y + 4, GAL_PISO
        madeira(c, x0, yt, x1 - x0, yb - yt, MEL_ESC, 60 + t, 0.45, amp=0.3)
        prat_cima = (yt + 1, yt + 13, yt + 25, yb)
        divis = list(range(x0 + 2 + (t * 17) % 40, x1, 46))
        for k in range(3):
            ya, yz = prat_cima[k] + 2, prat_cima[k + 1]
            for j in range(len(divis) + 1):
                xa = (divis[j - 1] + 3) if j > 0 else x0 + 1
                xz = divis[j] if j < len(divis) else x1 - 1
                if xz - xa > 3:
                    fileira(c, xa, xz, yz, yz - ya - 1, 100 + t * 50 + k * 7 + j)
            c.ret(x0, yz, x1 - x0, 2, MEL[4])
            c.ret(x0, yz, x1 - x0, 1, MEL[6])
            c.ret(x0, ya, x1 - x0, 1, "#000000", 0.35)            # a sombra da tábua de cima sobre os livros
        for dxv in divis:
            madeira(c, dxv, yt, 3, yb - yt, MEL, 70 + dxv, 0.55, vertical=True)
            c.ret(dxv, yt, 1, yb - yt, MEL[6])
            c.ret(dxv + 2, yt, 1, yb - yt, MEL[2])
        c.ret(x0, yt, x1 - x0, 2, MEL[5])
        c.ret(x0, yt, x1 - x0, 1, MEL[7])

        # montante da ponta do andar de cima, junto à pilastra
        xx = x1 - 3 if t == 0 else x0
        madeira(c, xx, TETO_Y + 4, 3, GAL_PISO - TETO_Y - 4, MEL, 130 + t, 0.6, vertical=True)
        c.ret(xx, TETO_Y + 4, 1, GAL_PISO - TETO_Y - 4, MEL[7])

        # ── Andar de baixo: estante (três prateleiras), balcão e armários.
        x0, x1 = BAIXO[t]
        yt2 = EST_BAIXA
        madeira(c, x0, yt2, x1 - x0, BALCAO_Y - yt2, MEL_ESC, 80 + t, 0.45, amp=0.3)
        c.ret(x0, yt2, x1 - x0, 2, MEL[5])
        c.ret(x0, yt2, x1 - x0, 1, MEL[7])
        prat_baixo = (yt2 + 1, yt2 + 13, yt2 + 25, BALCAO_Y)
        divis2 = list(range(x0 + 20 + (t * 23) % 30, x1, 42))
        for k in range(3):
            ya, yz = prat_baixo[k] + 2, prat_baixo[k + 1]
            for j in range(len(divis2) + 1):
                xa = (divis2[j - 1] + 3) if j > 0 else x0 + 1
                xz = divis2[j] if j < len(divis2) else x1 - 1
                if xz - xa > 3:
                    fileira(c, xa, xz, yz, yz - ya - 1, 300 + t * 50 + k * 7 + j)
            if k < 2:
                c.ret(x0, yz, x1 - x0, 2, MEL[4])
                c.ret(x0, yz, x1 - x0, 1, MEL[6])
            c.ret(x0, ya, x1 - x0, 1, "#000000", 0.35)
        for dxv in divis2:
            madeira(c, dxv, yt2, 3, BALCAO_Y - yt2, MEL, 90 + dxv, 0.55, vertical=True)
            c.ret(dxv, yt2, 1, BALCAO_Y - yt2, MEL[6])
            c.ret(dxv + 2, yt2, 1, BALCAO_Y - yt2, MEL[2])
        # balcão (tampo saliente) e os armários de portas almofadadas
        c.ret(x0, BALCAO_Y, x1 - x0, 1, MEL[7])
        c.ret(x0, BALCAO_Y + 1, x1 - x0, 1, MEL[6])
        c.ret(x0, BALCAO_Y + 2, x1 - x0, 1, MEL[4])
        c.ret(x0, BALCAO_Y + 3, x1 - x0, 1, MEL[2])
        tampos[BALCAO_Y:BALCAO_Y + 2, x0:x1] = 1
        madeira(c, x0, BALCAO_Y + 4, x1 - x0, PISO_Y - BALCAO_Y - 4, MEL, 110 + t, 0.5)
        passo = 21
        for k, xa in enumerate(range(x0 + 3, x1 - 12, passo)):
            larg_p = min(passo - 4, x1 - 3 - xa)
            if larg_p < 8:
                continue
            bisel(c, xa, BALCAO_Y + 7, larg_p, PISO_Y - BALCAO_Y - 15, MEL, 0.55 + (hash01(k, t, 41) - 0.5) * 0.08, 120 + k + t * 20, vertical=True)
            c.ret(xa + 2, BALCAO_Y + 10, larg_p - 4, PISO_Y - BALCAO_Y - 21, MEL[3], 0.35)
            c.ret(xa + 3, BALCAO_Y + 11, larg_p - 6, 1, MEL[6], 0.5)
            puxador = xa + (larg_p - 2 if k % 2 == 0 else 1)
            c.p(puxador, BALCAO_Y + 17, LATAO[5])
            c.p(puxador, BALCAO_Y + 18, LATAO[3])
            c.ret(xa - 2, BALCAO_Y + 5, 1, PISO_Y - BALCAO_Y - 9, MEL[2])
        for x in range(x0, x1):
            c.p(x, PISO_Y - 4, MEL[5])
            c.p(x, PISO_Y - 3, MEL[3])
            c.p(x, PISO_Y - 2, MEL[2])
            c.p(x, PISO_Y - 1, MEL[1])
        # montante da ponta (com a sombra que ele faz na parede lisa ao lado)
        xx = x1 - 3 if t == 0 else x0
        madeira(c, xx, EST_BAIXA, 3, PISO_Y - EST_BAIXA, MEL, 134 + t, 0.62, vertical=True)
        c.ret(xx, EST_BAIXA, 1, PISO_Y - EST_BAIXA, MEL[7])
        c.ret(xx + 2, EST_BAIXA, 1, PISO_Y - EST_BAIXA, MEL[2])
        if t == 0:
            c.ret(x1, EST_BAIXA, 2, PISO_Y - EST_BAIXA, "#000000", 0.18)
    return c, tampos


def galeria() -> Camada:
    """O mezanino: testeira com molduras e dentículos, mísulas entalhadas, balaústres torneados, corrimão e pilaretes
    nas pontas (com pinha de remate). Corre de ponta a ponta e é interrompido só pela janela."""
    c = Camada()
    for t, (x0, x1) in enumerate(TRECHOS):
        xa, xz = (x0, x1 + 2) if t == 0 else (x0 - 2, x1)
        # testeira do piso da galeria
        madeira(c, xa, GAL_PISO, xz - xa, GAL_BASE - GAL_PISO, MEL, 140 + t, 0.6)
        c.ret(xa, GAL_PISO, xz - xa, 1, MEL[7])
        c.ret(xa, GAL_PISO + 1, xz - xa, 1, MEL[5])
        for x in range(xa, xz):
            c.p(x, GAL_PISO + 4, MEL[6] if x % 3 else MEL[2])    # dentículos
            c.p(x, GAL_BASE - 1, MEL[2])
        c.ret(xa, GAL_BASE, xz - xa, 1, MEL[1])
        # mísulas (consolos) entalhados em voluta, com a sombra embaixo
        for mx in range(xa + 9, xz - 4, 26):
            for j in range(6):
                w_ = 3 - j * 0.45
                for x in range(int(mx - w_), int(mx + w_) + 1):
                    c.p(x, GAL_BASE + 1 + j, tons_idx(MEL, 0.66 - 0.08 * j - 0.15 * (x > mx)))
            c.p(mx - 2, GAL_BASE + 2, MEL[7])
            c.p(mx + 1, GAL_BASE + 4, MEL[2])
        # corrimão e balaústres torneados (vaso: base, barriga, pescoço, capitel)
        c.ret(xa, GAL_CORRIMAO, xz - xa, 3, MEL[5])
        c.ret(xa, GAL_CORRIMAO, xz - xa, 1, MEL[7])
        c.ret(xa, GAL_CORRIMAO + 2, xz - xa, 1, MEL[3])
        c.ret(xa, GAL_CORRIMAO + 3, xz - xa, 1, MEL[1], 0.8)
        c.ret(xa, GAL_PISO - 2, xz - xa, 2, MEL[4])
        c.ret(xa, GAL_PISO - 2, xz - xa, 1, MEL[6])
        perfil = [1, 1, 0, 1, 1, 2, 2, 2, 1, 1, 2]                 # meia largura, de cima para baixo
        for bxx in range(xa + 2, xz - 2, 5):
            for j, wj in enumerate(perfil):
                y = GAL_CORRIMAO + 4 + j
                if y >= GAL_PISO - 2:
                    break
                for x in range(bxx - wj, bxx + wj + 1):
                    u = (x - bxx) / max(wj, 1)
                    c.p(x, y, tons_idx(MEL, 0.72 - abs(u + 0.4) * 0.35 - (0.1 if j in (2, 8) else 0)))
        # pilarete na ponta junto à janela, com pinha de remate
        px_ = x1 - 3 if t == 0 else x0 - 1
        for y in range(GAL_CORRIMAO - 2, GAL_BASE):
            for x in range(px_ - 2, px_ + 3):
                c.p(x, y, tons_idx(MEL, 0.72 - abs(x - px_ + 0.6) * 0.14))
        c.ret(px_ - 3, GAL_CORRIMAO - 3, 7, 1, MEL[6])
        c.elipse(px_ + 0.5, GAL_CORRIMAO - 5.5, 2.2, 2.4, MEL[5])
        c.p(px_ - 1, GAL_CORRIMAO - 7, MEL[7])
        c.p(px_, GAL_CORRIMAO - 9, MEL[6])
    return c


# ─────────────────────────────── Estandartes ───────────────────────────────
BAND = ((207, 228), (349, 370))      # x0, x1 de cada estandarte
BAND_Y0, BAND_Y1 = GAL_BASE + 2, 77  # a ponta termina acima da cabeça do esqueleto (y 86)


def estandartes() -> Camada:
    """Dois estandartes de tecido verde-esmeralda pendurados na galeria por um varão de latão: dobras, barra de fio
    dourado, o livro aberto bordado (sem letras), a ponta em rabo de andorinha e as franjas."""
    c = Camada()
    for (x0, x1) in BAND:
        w = x1 - x0
        cx = (x0 + x1) / 2
        # varão de latão com remates e os cordões presos na testeira
        c.ret(x0 - 3, BAND_Y0 - 1, w + 6, 2, LATAO[4])
        c.ret(x0 - 3, BAND_Y0 - 1, w + 6, 1, LATAO[6])
        for xr in (x0 - 4, x1 + 3):
            c.elipse(xr + 0.5, BAND_Y0, 1.6, 1.6, LATAO[4])
            c.p(xr, BAND_Y0 - 1, LATAO[6])
        for xr in (x0 + 2, x1 - 3):
            c.linha(xr, GAL_BASE - 1, xr, BAND_Y0 - 1, LATAO[2])
        # o pano: dobras verticais (seno), mais funda embaixo, com a ponta em rabo de andorinha
        for x in range(x0, x1):
            u = (x - x0) / (w - 1)
            ponta = BAND_Y1 + 6 - abs(u - 0.5) * 2 * 0 - (6 - abs(u - 0.5) * 12) * 1.0
            ponta = BAND_Y1 + abs(u - 0.5) * 12
            for y in range(BAND_Y0 + 1, int(ponta)):
                v = (y - BAND_Y0) / (BAND_Y1 - BAND_Y0)
                dobra = math.sin(u * math.tau * 2.0 + 0.4 + v * 0.6) * (0.16 + 0.08 * v)
                kk = 0.56 + dobra - 0.1 * (u > 0.85) + 0.06 * (u < 0.1) - 0.08 * v + (hash01(x, y, 51) - 0.5) * 0.05
                if y < BAND_Y0 + 3:
                    kk = 0.45 + 0.25 * ((x - x0) % 4 < 2)              # a bainha franzida no varão
                c.p(x, y, tons_idx(TECIDO, kk))
        # barra de fio dourado (1 px, a 2 px da borda), seguindo a ponta
        for y in range(BAND_Y0 + 4, BAND_Y1 + 3):
            for xx in (x0 + 2, x1 - 3):
                c.p(xx, y, FIO[3] if (y // 2) % 3 else FIO[4])
        for x in range(x0 + 2, x1 - 2):
            c.p(x, BAND_Y0 + 4, FIO[3])
            u = (x - x0) / (w - 1)
            yv = BAND_Y1 - 3 + abs(u - 0.5) * 12
            c.p(x, yv, FIO[3] if x % 3 else FIO[4])
        # o livro aberto bordado: duas páginas cheias de fio dourado, abauladas em cima, com a lombada no meio e as
        # linhas de pontos (sem letras); a capa aparece como um filete mais escuro embaixo
        by = 62
        for i in range(-7, 8):
            if i == 0:
                continue
            a_ = abs(i)
            ytop = by - 2 - (1 if 2 <= a_ <= 5 else 0) + (1 if a_ == 7 else 0)
            ybot = by + 4 - (1 if a_ == 1 else 0) + (1 if a_ >= 6 else 0)
            for y in range(ytop, ybot + 1):
                if y == ybot:
                    cor = FIO[1]                                   # a capa por baixo das folhas
                elif y == ytop:
                    cor = FIO[5] if i < 0 else FIO[4]
                elif a_ in (2, 3, 4, 5) and (y - ytop) % 2 == 0 and not (i > 0 and a_ == 5):
                    cor = FIO[2]                                   # linhas de pontos
                else:
                    cor = FIO[4] if i < 0 else FIO[3]
                c.p(cx + i - 0.5, y, cor)
        c.linha(cx - 0.5, by - 2, cx - 0.5, by + 4, FIO[1])
        # um pequeno losango em cima (remate, sem cruz)
        for (ddx, ddy) in ((0, -7), (-1, -6), (1, -6), (0, -5)):
            c.p(cx - 0.5 + ddx, by + ddy, FIO[4])
        c.p(cx - 0.5, by - 6, FIO[2])
        for (ddx, ddy) in ((-5, 10), (5, 10)):
            c.p(cx - 0.5 + ddx, by + ddy, FIO[2])
        c.linha(cx - 4.5, by + 10, cx + 3.5, by + 10, FIO[3])
        # franjas douradas nas pontas
        for x in range(x0, x1):
            u = (x - x0) / (w - 1)
            yb = BAND_Y1 + abs(u - 0.5) * 12
            if x % 2 == 0:
                c.p(x, yb, FIO[2])
                c.p(x, yb + 1, FIO[1], 0.8)
        for xr in (x0, x1 - 1):
            for k in range(2):
                c.p(xr, BAND_Y1 + 6 + k, FIO[3 if k < 1 else 2])
            c.p(xr, BAND_Y1 + 5, FIO[5])
    c.contornar("#06140f", 0.55)
    return c


# ─────────────────────────────── Tochas ───────────────────────────────
def tochas() -> tuple[Camada, Camada]:
    """As tochas de ferro nas pilastras: espelho de ferro com rebites, braço em voluta, o cesto de ferro com a cabeça
    de breu. Devolve (tochas, chamas acesas)."""
    c, e = Camada(), Camada()
    for (fx, fy) in (TOCHA_E, TOCHA_D):
        x, y = int(fx), int(fy)
        # espelho (placa) na pilastra
        c.ret(x - 2, y + 9, 5, 9, FERRO[2])
        c.ret(x - 2, y + 9, 5, 1, FERRO[4])
        c.ret(x - 2, y + 9, 1, 9, FERRO[3])
        c.p(x - 1, y + 10, FERRO[5])
        c.p(x + 1, y + 16, FERRO[5])
        c.p(x, y + 18, FERRO[2])
        # braço curvo saindo da placa
        for k in range(6):
            c.p(x + 1 - k * 0.2, y + 13 - k, FERRO[3 if k % 2 else 4])
        # o cabo de madeira e o cesto de ferro em grade
        c.ret(x, y + 5, 2, 6, MEL[2])
        c.p(x, y + 5, MEL[4])
        for k in range(4):
            c.ret(x - 2 + k * 0, y + 1 + k, 6, 1, FERRO[3] if k % 2 else FERRO[4])
        for k in range(-2, 4, 2):
            c.ret(x + k, y + 1, 1, 4, FERRO[1])
        c.ret(x - 2, y + 1, 6, 1, FERRO[5])
        # cabeça de breu (embebida, escura, com fios de estopa) e a fuligem na pedra acima
        c.ret(x - 1, y - 1, 4, 3, "#2a1e16")
        c.p(x - 1, y - 1, "#4a3424")
        c.p(x + 2, y, "#1a120c")
        for j in range(16):
            c.p(x + (j % 3) - 1, y - 3 - j, "#000000", 0.05 + 0.05 * (16 - j) / 16)
        # a chama (acesa só à noite)
        cores = ((0, 0, "#fff8e0", 1), (0, -1, "#fff0b8", 1), (1, -1, "#ffe08a", 1), (0, -2, "#ffd070", 1),
                 (1, -2, "#ffb84c", 1), (0, -3, "#ffa040", 1), (1, -3, "#ff8a30", 0.9), (0, -4, "#ff7a28", 0.85),
                 (1, -5, "#e05a20", 0.6), (0, -6, "#c04018", 0.4), (-1, 0, "#ffd070", 1), (2, 0, "#ffc060", 1),
                 (-1, -1, "#ffb048", 0.9), (2, -1, "#ffa040", 0.9), (-1, -2, "#ff8a30", 0.7), (2, -2, "#ff7a28", 0.6),
                 (-1, 1, "#ffc060", 0.9), (0, 1, "#ffe8a0", 1), (1, 1, "#ffe8a0", 1), (2, 1, "#ffb048", 0.9),
                 (-2, 0, "#ff8a30", 0.5), (3, 0, "#ff7a28", 0.45), (-1, -3, "#e05a20", 0.4), (1, -7, "#a03010", 0.25))
        for (ddx, ddy, cor, a) in cores:
            e.p(x + ddx, y + ddy, cor, a)
    return c, e


# ─────────────────────────────── Piso e tapete ───────────────────────────────
TAP = (-2.15, 0.38, 0.03, 0.5)    # X0, X1, Z0, Z1 em mundo


def chao() -> tuple[Camada, np.ndarray]:
    """Lajes de pedra clara em perspectiva (duas pedras alternadas em xadrez diagonal, veios, juntas e desgaste) e o
    tapete esmeralda e ouro, com barra, faixas de losangos, campo em treliça e franja na frente."""
    c = Camada()
    py = _YS + 0.5
    px = _XS + 0.5
    m = py >= PISO_Y
    zc = z_chao(np.maximum(py, PISO_Y + 0.01))
    X, _ = mundo(px, py, zc)
    esc = F / (zc + D)
    L = 0.34
    i = np.floor(X / L).astype(int)
    j = np.floor(zc / L).astype(int)
    eu, ev = (X / L) % 1, (zc / L) % 1
    du = np.minimum(eu, 1 - eu) * L * esc
    dv = np.minimum(ev, 1 - ev) * L * F / (zc + D) ** 2 * HC
    alt = (i + j) % 2 == 0
    veio = np.sin(X * 22 + zc * 31 + np.sin(zc * 9 + X * 4) * 2.2 + hash_arr(i, j, 52) * 9)
    k = np.where(alt, 0.66, 0.5) + (hash_arr(i, j, 53) - 0.5) * 0.12 + (ruido(54, 5, 2) - 0.5) * 0.1
    k += np.where(np.abs(veio) < 0.05, -0.08, 0) + 0.04 * (ev < 0.18)
    k = np.where(du < 0.5, 0.18, np.where(du < 1.0, k - 0.1, k))
    k = np.where(dv < 0.45, 0.2, k)
    k -= 0.1 * np.clip((zc - 0.45) / 0.4, 0, 1)
    gasto = (ruido(55, 9, 3) > 0.7) & (zc < 0.5)
    k = np.where(gasto, k + 0.05, k)
    c.mascara(m.astype(np.float32), tons_arr(LAJE, k))

    # ── O tapete (desenhado em coordenadas do mundo, então as faixas e os losangos seguem a perspectiva).
    x0, x1, z0, z1 = TAP
    dentro = m & (X >= x0) & (X < x1) & (zc >= z0) & (zc < z1)
    bx_ = np.minimum(X - x0, x1 - X)
    bz_ = np.minimum(zc - z0, z1 - zc) * 1.6
    b = np.minimum(bx_, bz_)
    ao_longo = np.where(bx_ < bz_, zc * 1.6, X)              # coordenada ao longo da faixa da barra
    cores = np.zeros((H, W, 3), dtype=np.float32)

    def pinta(mask, nome):
        nonlocal cores
        cores = np.where(mask[:, :, None], hexa(TAPETE[nome]), cores)

    # campo: esmeralda com treliça de losangos mais escura e um ponto de ouro em cada cruzamento
    pinta(np.ones((H, W), bool), "esm2")
    pa, pb = (X + zc * 2.4) / 0.26, (X - zc * 2.4) / 0.26
    lin = (np.abs(pa - np.round(pa)) < 0.09) | (np.abs(pb - np.round(pb)) < 0.09)
    pinta(lin, "esm")
    no = (np.abs(pa - np.round(pa)) < 0.16) & (np.abs(pb - np.round(pb)) < 0.16)
    pinta(no, "esm3")
    pinta(no & ((np.round(pa) + np.round(pb)) % 2 == 0), "ouro")
    # barra: filete escuro, faixa marfim com losangos vermelhos, filete de ouro, filete esmeralda escuro
    pinta(b < 0.2, "esm")
    pinta(b < 0.17, "ouro")
    faixa = b < 0.145
    pinta(faixa, "marfim")
    meio = (b - 0.03) / 0.115
    los_b = np.abs((ao_longo / 0.1) % 1 - 0.5) * 2 + np.abs(meio - 0.5) * 2.2
    pinta(faixa & (b > 0.03) & (los_b < 0.75), "verm")
    pinta(faixa & (b > 0.03) & (los_b < 0.32), "ouro2")
    pinta(b < 0.03, "esm")
    # medalhão em losango no meio (geométrico, sem símbolo)
    xm, zm = (x0 + x1) / 2, (z0 + z1) / 2
    los = np.abs(X - xm) / 0.62 + np.abs(zc - zm) / 0.15
    pinta((los < 1.0) & (b > 0.2), "ouro")
    pinta((los < 0.9) & (b > 0.2), "esm")
    pinta((los < 0.62) & (b > 0.2), "marfim")
    pinta((los < 0.52) & (b > 0.2), "verm2")
    pinta((los < 0.3) & (b > 0.2), "ouro2")
    pinta((los < 0.14) & (b > 0.2), "esm3")
    felpa = 0.9 + 0.14 * hash_arr(_XS.astype(int), _YS.astype(int), 56)
    gasto = 1 - 0.1 * (ruido(57, 7, 3) > 0.7)
    cores = cores * (felpa * gasto)[:, :, None]
    c.mascara(dentro.astype(np.float32), cores)
    # espessura do tapete na frente e a franja de fios claros
    yf = int(round(YH + HC * F / (z0 + D)))
    xa = int(XC + x0 * F / (z0 + D))
    xb = int(XC + x1 * F / (z0 + D))
    for x in range(xa, xb):
        c.p(x, yf, "#0a2a22")
        if x % 2 == 0:
            c.p(x, yf + 1, "#efe6c8", 0.9)
            c.p(x + (x % 4 == 0), yf + 2, "#c8bc98", 0.65)
    return c, dentro.astype(np.float32)


# ─────────────────────────────── O atril ───────────────────────────────
def atril() -> Camada:
    """O atril de madeira na escala do esqueleto (o tampo chega à cintura dele): pés em cruz com sapatas de latão,
    coluna torneada com anéis, o tampo inclinado descendo para a direita (virado para o esqueleto), a régua de apoio,
    o grande livro aberto com as páginas abauladas, o corte das folhas e as fitas-marcador caindo."""
    c = Camada()
    ax = ATRIL_X
    y_chao = 150
    # pés em cruz (dois para os lados, um para a frente, um para trás) com sapatas de latão
    for (fx, fy) in ((ax - 13, y_chao), (ax + 12, y_chao), (ax + 1, y_chao + 1), (ax - 5, y_chao - 3)):
        c.linha(ax, y_chao - 8, fx, fy - 1, MEL[5])
        c.linha(ax + 1, y_chao - 8, fx + 1, fy - 1, MEL[3])
        c.linha(ax, y_chao - 7, fx, fy, MEL[1])
        c.ret(fx - 1, fy - 1, 3, 2, LATAO[3])
        c.p(fx - 1, fy - 1, LATAO[5])
    # coluna torneada com anéis
    for y in range(124, y_chao - 7):
        w = 2
        if y in (127, 128, 136, 137) or y > y_chao - 11:
            w = 3
        if y in (131, 132, 141):
            w = 1
        for x in range(ax - w, ax + w + 1):
            u = (x - ax) / max(w, 1)
            c.p(x, y, tons_idx(MEL, 0.8 - abs(u + 0.35) * 0.5))
    c.ret(ax - 3, y_chao - 8, 7, 2, MEL[6])
    c.ret(ax - 4, y_chao - 6, 9, 1, MEL[3])
    # o suporte e o tampo inclinado (mais alto à esquerda, descendo para o esqueleto à direita)
    c.ret(ax - 6, 121, 13, 3, MEL[4])
    c.ret(ax - 6, 121, 13, 1, MEL[6])
    c.ret(ax - 6, 123, 13, 1, MEL[2])
    c.poligono([(ax - 15, 108), (ax + 13, 114), (ax + 15, 120), (ax - 13, 114)], MEL[4])
    c.linha(ax - 13, 115, ax + 15, 121, MEL[2])
    c.linha(ax - 13, 116, ax + 15, 122, MEL[1])
    c.linha(ax + 15, 119, ax + 15, 122, MEL[2])
    c.linha(ax - 12, 114, ax + 14, 120, MEL[6])          # a régua de apoio na borda de baixo
    # o livro: capa de couro com cantoneiras de latão
    c.poligono([(ax - 14, 107), (ax + 13, 113), (ax + 14, 119), (ax - 13, 113)], COURO[2])
    for (cx_, cy_) in ((ax - 14, 107), (ax + 12, 113), (ax - 13, 112), (ax + 13, 118)):
        c.p(cx_, cy_, LATAO[5])
    for x in range(ax - 12, ax + 13):
        t = (x - (ax - 12)) / 24
        ybase = 112.2 + t * 5.4
        u = (x - ax) / 12
        lado = -1 if u < 0 else 1
        bojo = math.sin(math.pi * min(1, abs(u) * 1.05)) * 1.8
        ytop = ybase - 5.2 - bojo + (0.9 if abs(u) < 0.1 else 0)
        for y in range(int(math.floor(ytop)), int(ybase) + 1):
            tt = (y - ytop) / max(ybase - ytop, 1)
            k = 0.66 - abs(u) * 0.08 - (0.32 if abs(u) < 0.09 else 0) - (0.08 if lado > 0 else -0.04) - tt * 0.14
            cor = tons_idx(PERGAMINHO, k)
            if 0.18 < abs(u) < 0.88 and (y + (1 if lado > 0 else 0)) % 2 == 0 and y < ybase - 0.5 and hash01(x, y, 83) > 0.3:
                cor = mistura(cor, "#5a4630", 0.35)        # linhas de escrita (pontilhado, sem letras)
            c.p(x, y, cor)
        c.p(x, int(ybase) + 1, PERGAMINHO[2] if x % 3 else PERGAMINHO[1])   # o corte das folhas
    # a gravura da página da direita: um círculo de traços (sem texto) e uma folha virando
    for k in range(14):
        a_ = k / 14 * math.tau
        c.p(ax + 6 + math.cos(a_) * 2.6, 111.5 + math.sin(a_) * 1.4, "#7a5a36", 0.7)
    for k in range(5):
        c.p(ax + 2 + k, 107 - math.sin(k / 4 * math.pi) * 1.5 + k * 0.25, PERGAMINHO[5])
    c.linha(ax, 108, ax + 1, 114, PERGAMINHO[0])           # o vinco do meio
    # fitas-marcador saindo do vinco e caindo pela borda baixa
    fitas = ((ax + 1, 131, ["#06241c", "#0C3C34", "#17675B", "#2a8a74"]), (ax + 3, 128, ["#5a1a12", "#8a2a1e", "#b0402a", "#d06040"]),
             (ax + 5, 126, ["#6a4a10", "#a8782a", OURO, "#f2d488"]))
    for (fx, fim, tons_) in fitas:
        y0f = 117 + (fx - ax) // 3
        for y in range(y0f, fim):
            x = fx + 0.6 * math.sin((y - y0f) / 2.6) + (y - y0f) * 0.08
            c.p(x, y, tons_idx(tons_, 0.62))
            c.p(x + 1, y, tons_idx(tons_, 0.3))
        x = fx + 0.6 * math.sin((fim - y0f) / 2.6) + (fim - y0f) * 0.08
        c.p(x, fim, tons_idx(tons_, 0.5))
        c.p(x - 1, fim + 1, tons_idx(tons_, 0.3))
        c.p(x + 1, fim + 1, tons_idx(tons_, 0.3))
    return c


# ─────────────────────────────── A mesa ───────────────────────────────
def pergaminho(c: Camada, x0: float, y0: float, comp: int, r: float, fita_cor: str, seed: int) -> None:
    """Pergaminho enrolado deitado: cilindro com tons, as pontas em espiral e a fita amarrada."""
    for i in range(comp):
        for j in range(-int(r) - 1, int(r) + 2):
            if abs(j) > r + 0.3:
                continue
            k = 0.62 - (j / (r + 0.5)) * 0.28 + (hash01(int(x0) + i, j, seed) - 0.5) * 0.06
            c.p(x0 + i, y0 + j, tons_idx(PERGAMINHO, k))
    for (xx, lado) in ((x0, -1), (x0 + comp - 1, 1)):
        for j in range(-int(r), int(r) + 1):
            c.p(xx + lado, y0 + j, PERGAMINHO[4] if j < 0 else PERGAMINHO[2])
        c.p(xx + lado, y0, PERGAMINHO[1])
        c.p(xx + lado, y0 + 0.6, "#5a4630", 0.6)
    fx = x0 + comp // 2
    for j in range(-int(r) - 1, int(r) + 2):
        c.p(fx, y0 + j, tom(fita_cor, 1.0 if j < 0 else 0.7))
    c.p(fx + 1, y0 + r + 1, tom(fita_cor, 0.8))
    c.p(fx + 1, y0 + r + 2, tom(fita_cor, 0.6))
    c.p(fx - 1, y0 + r + 2, tom(fita_cor, 0.7))


def mesa() -> tuple[Camada, Camada, np.ndarray]:
    """A mesa pequena de mel: tampo com a borda moldurada, avental entalhado, pernas torneadas. Em cima: a pilha de
    livros, os pergaminhos enrolados (um aberto caindo pela frente), o tinteiro com a pena e a lanterna de latão.
    Devolve (mesa e objetos, chama da lanterna, máscara do tampo)."""
    c, e = Camada(), Camada()
    x0, x1, yt = 96, 160, 118
    tampo = np.zeros((H, W), dtype=np.float32)
    # a cadeira encostada à esquerda (vista de lado, virada para a mesa): pés torneados, assento de veludo esmeralda
    # com tachas de latão, encosto alto com travessas e o remate em pinha
    cx0, cx1, ys = 74, 93, 122
    for (lx_, yb_, kk) in ((cx0 + 1, 141, 0.62), (cx1 - 1, 141, 0.55), (cx0 + 4, 138, 0.32), (cx1 - 4, 138, 0.3)):
        for y in range(ys + 3, yb_):
            w_ = 1 if (y - ys) % 7 not in (3, 4) else 1.5
            for x in range(int(lx_ - w_ + 0.5), int(lx_ + w_ + 0.5)):
                c.p(x, y, tons_idx(MEL, kk + 0.15 - abs(x - lx_) * 0.15))
    c.ret(cx0 + 1, 133, cx1 - cx0 - 2, 1, MEL[3])
    for y in range(ys - 26, ys + 3):                             # montante do encosto (sobe atrás)
        k_ = 0.72 - 0.1 * ((y - ys) % 8 == 0)
        c.p(cx0, y, tons_idx(MEL, k_))
        c.p(cx0 + 1, y, tons_idx(MEL, k_ - 0.25))
    c.elipse(cx0 + 1, ys - 28, 1.6, 1.8, MEL[5])
    c.p(cx0, ys - 29, MEL[7])
    for yy in (ys - 22, ys - 15, ys - 8):                       # travessas do encosto (vistas de lado: só a ponta)
        c.ret(cx0 + 2, yy, 2, 2, MEL[4])
        c.p(cx0 + 2, yy, MEL[6])
    for y in range(ys, ys + 4):                                 # o assento estofado
        for x in range(cx0 + 1, cx1 + 1):
            kk = 0.62 - (y - ys) * 0.12 + 0.08 * math.sin((x - cx0) / 3.0) * (y == ys)
            c.p(x, y - (1 if y == ys and 3 < x - cx0 < cx1 - cx0 - 3 else 0), tons_idx(TECIDO, kk))
    for x in range(cx0 + 2, cx1, 3):
        c.p(x, ys + 3, LATAO[5])
    c.ret(cx0 + 1, ys + 4, cx1 - cx0, 1, MEL[2])
    # pernas de trás (mais curtas, mais escuras) e da frente, torneadas
    for (lx, yb, kk) in ((x0 + 6, 136, 0.35), (x1 - 7, 136, 0.35), (x0 + 2, 141, 0.6), (x1 - 3, 141, 0.6)):
        for y in range(yt + 5, yb):
            w = 1 + (1 if (y - yt) % 9 in (2, 3) else 0) + (1 if y > yb - 3 else 0)
            for x in range(lx - w, lx + w + 1):
                c.p(x, y, tons_idx(MEL, kk + 0.2 - abs(x - lx + 0.4) * 0.12))
        c.ret(lx - 1, yb - 1, 3, 1, MEL[1])
    # travessa baixa entre as pernas
    c.ret(x0 + 3, 133, x1 - x0 - 6, 2, MEL[3])
    c.ret(x0 + 3, 133, x1 - x0 - 6, 1, MEL[5])
    # o tampo (visto um pouco de cima) e a borda moldurada; o avental com um entalhe de arcos
    madeira(c, x0, yt - 3, x1 - x0, 3, MEL, 150, 0.68)
    c.ret(x0, yt - 3, x1 - x0, 1, MEL[7])
    tampo[yt - 3:yt, x0:x1] = 1
    c.ret(x0 - 1, yt, x1 - x0 + 2, 2, MEL[5])
    c.ret(x0 - 1, yt, x1 - x0 + 2, 1, MEL[6])
    c.ret(x0 - 1, yt + 1, x1 - x0 + 2, 1, MEL[3])
    madeira(c, x0 + 1, yt + 2, x1 - x0 - 2, 4, MEL, 151, 0.45)
    for x in range(x0 + 4, x1 - 4, 6):
        for k in range(5):
            c.p(x + k, yt + 4 + abs(k - 2) * 0.5, MEL[2])
        c.p(x + 2, yt + 3, MEL[6])
    c.ret(x0 + 1, yt + 6, x1 - x0 - 2, 1, MEL[1])
    # a pilha de livros (deitados, cada um com a sua cor, o corte das folhas e uma faixa)
    pilha = (("#2a3a5e", 15, 3), ("#7a2a22", 14, 3), ("#17675B", 13, 2), ("#b8862e", 12, 3), ("#5a3a24", 11, 2))
    y = yt - 3
    for k, (cor, w, th) in enumerate(pilha):
        xa = x0 + 3 + (k % 2) - (1 if k == 3 else 0)
        c.ret(xa, y - th, w, th, tom(cor, 0.92))
        c.ret(xa, y - th, w, 1, tom(cor, 1.25))
        c.ret(xa, y - 1, w, 1, tom(cor, 0.62))
        c.ret(xa + w - 2, y - th + 1, 2, th - 1, PAPEL[3])
        c.ret(xa + w - 2, y - th + 1, 2, 1, PAPEL[4])
        if th == 3:
            c.ret(xa + 3, y - 2, 4, 1, tom(OURO, 0.8))
        y -= th
    topo_pilha = y
    # um livro pequeno aberto em cima da pilha (as páginas em leque)
    for i in range(-5, 6):
        yy = topo_pilha - 1 - (1 if abs(i) in (2, 3, 4) else 0)
        c.p(x0 + 10 + i, yy, PAPEL[4] if i < 0 else PAPEL[3])
        c.p(x0 + 10 + i, yy + 1, COURO[3])
    c.p(x0 + 10, topo_pilha - 1, PAPEL[1])
    # os pergaminhos enrolados (um deles aberto, caindo pela borda da frente)
    pergaminho(c, x0 + 22, yt - 5, 13, 1.6, "#17675B", 1)
    pergaminho(c, x0 + 24, yt - 8, 11, 1.4, "#8a2a1e", 2)
    for i in range(10):
        xx = x0 + 37 + i
        c.p(xx, yt - 4, PERGAMINHO[4])
        c.p(xx, yt - 5, PERGAMINHO[3])
    for j in range(7):
        c.p(x0 + 46 + (j > 4), yt - 3 + j, PERGAMINHO[3 if j % 2 else 4])
        c.p(x0 + 45 + (j > 4), yt - 3 + j, PERGAMINHO[4])
        c.p(x0 + 44 + (j > 4), yt - 3 + j, PERGAMINHO[2] if j > 0 else PERGAMINHO[4])
        if j in (1, 3):
            c.p(x0 + 45, yt - 3 + j, "#6a5236", 0.5)
    for (dx_, dy_) in ((-1, 3), (0, 4), (1, 4), (2, 3)):
        c.p(x0 + 45 + dx_, yt + 4 + dy_ - 3, PERGAMINHO[5])
    # o tinteiro (vidro escuro com tampa de latão) e a pena (barba clara, raque, ponta escura)
    tx = x0 + 39
    c.ret(tx, yt - 9, 5, 5, "#1e2630")
    c.ret(tx, yt - 9, 1, 5, "#3a4a5a")
    c.p(tx + 1, yt - 8, "#8aa0b0")
    c.ret(tx + 1, yt - 11, 3, 2, LATAO[3])
    c.ret(tx + 1, yt - 11, 3, 1, LATAO[5])
    for k in range(13):
        xq = tx + 2 + k * 0.55
        yq = yt - 11 - k
        c.p(xq, yq, CERA[3] if k > 2 else "#2a2a2a")
        if 3 < k < 12:
            larg_b = 1 if k in (4, 11) else 2
            for b_ in range(1, larg_b + 1):
                c.p(xq - b_, yq + b_ * 0.5, PAPEL[3] if b_ == 1 else PAPEL[2])
                c.p(xq + b_ * 0.4 + 0.5, yq + 0.3, PAPEL[4] if b_ == 1 else PAPEL[3], 0.8)
    # a lanterna de latão: argola, chapéu, vidros com a armação, a vela e o pingo
    lx, ly = int(LANTERNA[0]), int(LANTERNA[1])
    c.elipse(lx + 0.5, ly - 10, 1.8, 1.6, LATAO[3])
    c.elipse(lx + 0.5, ly - 10, 0.8, 0.6, "#000000", 0.0)
    c.p(lx, ly - 10, MEL_ESC[1])
    for k in range(3):
        c.ret(lx - 1 - k, ly - 8 + k, 3 + 2 * k, 1, LATAO[5 - k])
    c.ret(lx - 4, ly - 5, 9, 1, LATAO[2])
    # vidros
    for y in range(ly - 4, ly + 6):
        for x in range(lx - 3, lx + 4):
            c.p(x, y, "#d8e4e0" if x < lx else "#b8c8c4", 0.35)
    for x in (lx - 4, lx, lx + 4):
        for y in range(ly - 4, ly + 6):
            c.p(x, y, LATAO[4] if x < lx + 2 else LATAO[2])
    c.ret(lx - 4, ly + 6, 9, 2, LATAO[3])
    c.ret(lx - 4, ly + 6, 9, 1, LATAO[5])
    c.ret(lx - 3, ly + 8, 7, 1, LATAO[1])
    # vela dentro
    for y in range(ly + 1, ly + 6):
        c.p(lx - 1, y, CERA[3], 0.85)
        c.p(lx + 1, y, CERA[1], 0.85)
    c.p(lx, ly + 1, "#2a1a10")
    for y in range(ly + 2, ly + 6):
        c.p(lx, y, CERA[2], 0.6)
    # a chama da lanterna (acesa só à noite)
    for (ddx, ddy, cor, a) in ((0, 0, "#fff6d0", 1), (0, -1, "#ffe08a", 1), (0, -2, "#ffa448", 0.9),
                               (0, 1, "#ffd070", 1), (-1, 0, "#ff9a3a", 0.55), (1, 0, "#ff9a3a", 0.55), (0, -3, "#e06a20", 0.4)):
        e.p(lx + ddx, ly + ddy, cor, a)
    return c, e, tampo


# ─────────────────────────────── Peitoril e escada ───────────────────────────────
def detalhes() -> Camada:
    """No peitoril: dois livros deitados e um vasinho com uma muda (contra a luz). Na estante da direita, a escada de
    biblioteca encostada no corrimão da galeria, com o trilho de latão."""
    c = Camada()
    yp = int(JAN_PEITORIL) + 1
    for (yy, cor, w) in ((yp - 2, "#2a5a3a", 13), (yp - 4, "#9a4a2a", 11)):
        xa = int(JAN_CX - JAN_R + 3)
        c.ret(xa, yy, w, 2, tom(cor, 0.95))
        c.ret(xa, yy, w, 1, tom(cor, 1.25))
        c.ret(xa + w - 1, yy, 1, 2, PAPEL[3])
    vx = int(JAN_CX - JAN_R + 19)
    c.ret(vx, yp - 4, 5, 4, "#a8582e")
    c.ret(vx, yp - 4, 5, 1, "#c87444")
    c.ret(vx + 4, yp - 4, 1, 4, "#7a3a1e")
    for (dx_, dy_, cor) in ((2, -5, "#2c7034"), (1, -6, "#43893c"), (3, -7, "#43893c"), (2, -8, "#68a64c"),
                            (0, -7, "#2c7034"), (4, -6, "#1f5a2b"), (2, -6, "#1f5a2b")):
        c.p(vx + dx_, yp + dy_, cor)
    # a escada de biblioteca (montantes, degraus, ganchos no trilho)
    xa, xb = 392, 400
    y0, y1 = GAL_CORRIMAO + 2, PISO_Y + 3
    for y in range(y0, y1):
        t = (y - y0) / (y1 - y0)
        desl = int(t * 8)
        for (xx, kk) in ((xa + desl, 0.7), (xb + desl, 0.5)):
            c.p(xx, y, tons_idx(MEL, kk))
            c.p(xx + 1, y, tons_idx(MEL, kk - 0.25))
        if (y - y0) % 7 == 3:
            c.linha(xa + desl + 1, y, xb + desl, y, MEL[6])
            c.linha(xa + desl + 1, y + 1, xb + desl, y + 1, MEL[2])
    c.ret(xa - 1, y0 - 1, 3, 2, LATAO[4])
    c.ret(xb - 1, y0 - 1, 3, 2, LATAO[4])
    for x in range(PIL_D[1] + 2, W):
        c.p(x, GAL_CORRIMAO + 3, LATAO[3] if x % 9 else LATAO[5])
    for (xx,) in ((xa + 8,), (xb + 8,)):
        c.ret(xx - 1, y1 - 1, 3, 2, LATAO[2])
    return c


def primeiro_plano() -> Camada:
    """Perto da câmera (desfocado na montagem): a coluna de pedra na borda esquerda, com a base."""
    c = Camada()
    for y in range(0, H):
        larg = 6 + (4 if y > 140 else 0) + (2 if y < 8 else 0)
        for x in range(0, larg):
            u = x / larg
            k = 0.62 + 0.18 * math.sin(u * math.pi * 0.9) - 0.25 * (u > 0.85) + (hash01(x // 2, y // 9, 61) - 0.5) * 0.06
            c.p(x, y, tons_idx(PEDRA, k))
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
    """Poça de luz de chama: borda irregular (parece tremular) e anéis de pixel art na queda (a luz em faixas)."""
    ang = np.arctan2(_GYS - cy * ESC, _GXS - cx * ESC)
    g = np.random.default_rng(seed)
    f = [g.random() * 6.28 for _ in range(3)]
    mod = 1 + 0.08 * np.sin(5 * ang + f[0]) + 0.05 * np.sin(9 * ang + f[1]) + 0.03 * np.sin(14 * ang + f[2])
    d2 = ((_GXS - cx * ESC) / (raio * ESC * mod)) ** 2 + ((_GYS - cy * ESC) / (raio * ESC * achatar * mod)) ** 2
    i = np.exp(-d2 * 2.2)
    return i * 0.7 + np.floor(i * degraus) / degraus * 0.3


def sombra_da_chama(mascara: np.ndarray, luz: tuple[float, float], fs=(0.12, 0.22, 0.34, 0.5, 0.7)) -> np.ndarray:
    """Sombra traçada em 2D a partir de uma chama: para cada pixel, anda em direção à luz e vê se cruza a máscara.
    Vários passos (frações do caminho) e a média dá a penumbra. Devolve 1 onde há sombra."""
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    s = np.zeros((H, W), dtype=np.float32)
    for f in fs:
        qx = np.clip((xs + (luz[0] - xs) * f).round().astype(int), 0, W - 1)
        qy = np.clip((ys + (luz[1] - ys) * f).round().astype(int), 0, H - 1)
        s = np.maximum(s, mascara[qy, qx].astype(np.float32))
    return s


def rumo_na_tela(z: float, rumo) -> tuple[float, float]:
    """Direção (na tela) em que um ponto na profundidade z "olha" para a luz."""
    X0, Y0 = -1.0, 0.5
    lx, ly, lz = rumo
    e = 0.02
    xa, ya = tela(X0, Y0, z)
    xb, yb = tela(X0 + lx * e, Y0 + ly * e, z + lz * e)
    dx, dy = xb - xa, yb - ya
    n = math.hypot(dx, dy) or 1
    return dx / n, dy / n


ESPESSURA = 0.14


def ocluir_tela(oc_id: np.ndarray, pix_id: np.ndarray, direcao, z_oc: np.ndarray, z_pix, rumo, passos: int = 110) -> np.ndarray:
    """Sombra dos objetos traçada em tela, com profundidade: anda na direção da luz e, a cada passo, sabe em que
    profundidade o raio está. Só bate num objeto se o raio passa pela faixa de profundidade dele. 1 onde a luz passa."""
    lx, ly, lz = rumo
    n = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / n, ly / n, lz / n
    proj = max(math.hypot(lx, ly), 0.2)
    dx, dy = direcao
    x = _XS + 0.5
    y = _YS + 0.5
    zp = np.broadcast_to(np.asarray(z_pix, dtype=np.float32), (H, W))
    passo_mundo = 0.7 * (zp + D) / F / proj
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


@lru_cache(maxsize=1)
def camadas():
    """As camadas de pixel art (iguais nas duas horas; só a luz muda)."""
    est = estrutura()
    estc = est["c"]
    est_l, tampos = estantes()
    c_chao, tapete = chao()
    gal = galeria()
    band = estandartes()
    toc, e_toc = tochas()
    atr = atril()
    mes, e_lan, tampo_mesa = mesa()
    det = detalhes()
    for cam in (atr, mes):
        cam.contornar("#1a0e06", 0.62)
    gal.contornar("#1e1208", 0.35)
    toc.contornar("#0e0c0a", 0.4)
    frente = primeiro_plano()
    return dict(est=est, estc=estc, estantes=est_l, tampos=tampos, chao=c_chao, tapete=tapete, gal=gal, band=band,
                toc=toc, e_toc=e_toc, atr=atr, mes=mes, e_lan=e_lan, tampo_mesa=tampo_mesa, det=det, frente=frente)


def mascara_calma() -> np.ndarray:
    """As duas áreas calmas (em 3x): título em cima à esquerda e painel embaixo à direita, com borda suave."""
    x, y = _GXS / ESC, _GYS / ESC
    a = np.clip((216 - x) / 22, 0, 1) * np.clip((101 - y) / 12, 0, 1)
    b = np.clip((x - 294) / 22, 0, 1) * np.clip((y - 89) / 12, 0, 1)
    return np.maximum(a, b)


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
    tipo = np.where(py < TETO_Y, 0, np.where(py < PISO_Y, 2, 1)).astype(np.int32)   # 0 forro, 1 horizontal, 2 parede, 3 objeto
    pix_id = np.zeros((H, W), dtype=np.int32)
    oc_id = np.zeros((H, W), dtype=np.int32)
    z_oc = np.zeros((H, W), dtype=np.float32)
    # planos, de trás para a frente: (chave, z, desfoque, id de sombra, tipo, faz sombra)
    planos = [
        ("estc", None, 0.0, 1, 2, False),
        ("estantes", ZB - 0.01, 0.0, 2, 2, False),
        ("chao", None, 0.0, 3, 1, False),
        ("det", ZB - 0.04, 0.0, 4, 3, False),
        ("gal", Z_GAL, 0.0, 5, 3, True),
        ("toc", ZB - 0.05, 0.0, 6, 3, False),
        ("band", Z_BAND, 0.0, 7, 3, True),
        ("mes", Z_MESA, 0.0, 8, 3, True),
        ("atr", Z_ATRIL, 0.0, 9, 3, True),
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
    # o mapa de metal (latão, fio dourado, faixas douradas das lombadas): recebe brilho especular quente
    chaves = np.array([int(_hexa(m_)[0] * 255 + 0.5) * 65536 + int(_hexa(m_)[1] * 255 + 0.5) * 256 + int(_hexa(m_)[2] * 255 + 0.5) for m_ in METAIS])
    metal = np.zeros((H, W), dtype=np.float32)
    for (chave, _, _, _, _, _) in planos:
        cc = L[chave].c
        q8 = np.round(np.clip(cc[:, :, :3], 0, 1) * 255).astype(np.int64)
        k8 = q8[:, :, 0] * 65536 + q8[:, :, 1] * 256 + q8[:, :, 2]
        metal = np.where(cc[:, :, 3] > 0.5, np.isin(k8, chaves).astype(np.float32), metal)
    # os tampos olham para cima: o peitoril, o balcão, o tampo da mesa e as páginas do livro do atril
    horiz = (est["peitoril"] > 0) | (L["tampos"] > 0) | (L["tampo_mesa"] > 0)
    horiz |= (pix_id == 9) & (_YS < 114) & (_YS > 100) & (_XS > ATRIL_X - 15) & (_XS < ATRIL_X + 15)
    tipo = np.where(horiz, 1, tipo)
    zmap = np.where(est["peitoril"] > 0, ZB - 0.04, zmap)

    # ── A janela: o céu da hora pelo vidro antigo.
    fora = pintar_fora(nome, per)
    fora3 = ampliar(fora)
    vidro3 = ampliar(est["vidro"][:, :, None])
    vid = desfocar(fora3, 1.0) * ampliar(est["var"])
    vid = vid * 0.88 + hexa(per["jan_luz"]) * 0.06
    img = vid * vidro3

    # ── Albedo, de trás para a frente, com profundidade de campo.
    solido = np.zeros(img.shape[:2], dtype=np.float32)
    for (chave, _, raio, _, _, _) in planos:
        a = desfocar_rgba(ampliar(L[chave].c), raio)
        img = sobre(img, a)
        solido = np.maximum(solido, a[:, :, 3])

    # Sombras de contato: sob a galeria, sob o balcão, na quina do piso, sob a mesa, sob o atril, atrás do balaústre.
    ao = Camada()
    for (x0, x1) in TRECHOS:
        ao.ret(x0, GAL_BASE + 1, x1 - x0 + 2, 7, "#000000", 0.32)
        ao.ret(x0, GAL_CORRIMAO + 3, x1 - x0, GAL_PISO - GAL_CORRIMAO - 3, "#000000", 0.22)
    for (x0, x1) in BAIXO:
        ao.ret(x0, BALCAO_Y + 4, x1 - x0, 4, "#000000", 0.3)
    for x in range(W):
        ao.ret(x, PISO_Y, 1, 2, "#000000", 0.4)
    for (cx, cy, rx, ry, a) in ((128, 141, 34, 2.5, 0.55), (84, 141, 11, 2.0, 0.5), (ATRIL_X, 150, 14, 2.0, 0.65), (JAN_CX, JAN_PEITORIL + 5, 34, 1.5, 0.3),
                                (243, PISO_Y + 1, 10, 1.5, 0.4), (337, PISO_Y + 1, 10, 1.5, 0.4), (404, PISO_Y + 2, 7, 1.2, 0.5)):
        ao.elipse(cx, cy, rx, ry, "#000000", a)
    for (x0, x1) in BAND:
        ao.ret(x0 + 2, BAND_Y0 + 2, x1 - x0, BAND_Y1 - BAND_Y0 + 4, "#000000", 0.12)
    sombra_ao = desfocar_rgba(ampliar(ao.c), 4)
    img = img * (1 - sombra_ao[:, :, 3:4])

    # ── O sol (ou o luar): transmissão traçada em 3D pela janela × sombra dos objetos traçada em tela.
    z3 = ampliar(zmap[:, :, None])[:, :, 0]
    gx, gy = (_GXS + 0.5) / ESC, (_GYS + 0.5) / ESC
    X3, Y3 = mundo(gx, gy, z3)
    T = transmissao(X3, Y3, z3, rumo)
    oc_sup = ocluir_tela(oc_id, pix_id, rumo_na_tela(0.3, rumo), z_oc, zmap, rumo)
    T = T * desfocar(ampliar(oc_sup[:, :, None]), 1.0)[:, :, 0]
    T = desfocar(T[:, :, None], 0.7)[:, :, 0]
    tipo3 = ampliar(tipo[:, :, None])[:, :, 0]
    rec = np.select([tipo3 == 1, tipo3 == 2, tipo3 == 3],
                    [0.5 + 0.9 * lyn, 0.0, 0.25 + 0.25 * lyn + 0.2 * abs(lxn)], 0.0)

    # ── Luz: ambiente + a janela como fonte de área + sol traçado + chamas.
    amb = hexa(per["amb"]) * per["amb_k"]
    luz = np.zeros_like(img) + amb
    # o ambiente é um pouco mais fraco no alto (sob o forro) e nos fundos das estantes
    luz *= (0.86 + 0.14 * np.clip(_GYS / (H * ESC) * 1.6, 0, 1))[:, :, None]
    jl = hexa(per["jan_luz"]) * per["jan_k"]
    luz += luz_pontual(JAN_CX, 90, 150, 0.7)[:, :, None] * jl * 0.8
    luz += luz_pontual(JAN_CX - 40, 140, 200, 0.45)[:, :, None] * jl * 0.4
    sol = hexa(per["sol"]) * per["sol_k"]
    luz += (T * rec)[:, :, None] * sol
    rebat = desfocar((T * rec * (tipo3 != 2))[:, :, None], 50)
    luz += rebat * sol * 0.6
    acesas = []
    luz_q = np.zeros_like(img)                 # só a luz das chamas (para o rebatimento quente)
    spec = np.zeros(img.shape[:2], dtype=np.float32)
    piso = (tipo == 1) & (_YS >= PISO_Y)
    objs = [((pix_id == 8), Z_MESA + 0.06), ((pix_id == 9), Z_ATRIL + 0.05)]

    def sombra_objetos(fx, fy):
        """Sombras do atril e da mesa no piso, para longe da chama (só no chão à frente de cada objeto)."""
        s_ = np.zeros((H, W), dtype=np.float32)
        for (mk, zo) in objs:
            s_ = np.maximum(s_, sombra_da_chama(mk, (fx, fy), (0.06, 0.12, 0.2, 0.3, 0.42)) * piso * (zmap < zo) * ~mk)
        return s_
    if per["tochas"] > 0:
        gal_m = (L["gal"].c[:, :, 3] > 0.5)
        band_m = (L["band"].c[:, :, 3] > 0.5)
        parede = (tipo == 2) | (pix_id == 4)
        for (k, (fx, fy)) in enumerate((TOCHA_E, TOCHA_D)):
            s_g = sombra_da_chama(gal_m, (fx, fy)) * parede            # a galeria tapa a luz das estantes de cima
            s_b = sombra_da_chama(band_m, (fx, fy), (0.08, 0.16, 0.26)) * parede
            s = np.maximum(np.maximum(s_g, s_b * 0.85), sombra_objetos(fx, fy) * 0.8)
            s3 = desfocar(ampliar(s[:, :, None]), 2.2)[:, :, 0]
            poca = luz_de_chama(fx, fy, 135, 0.82, 3 + k)[:, :, None]
            l_ = poca * hexa("#ff9a48") * 0.78 * per["tochas"] * (1 - 0.8 * s3)[:, :, None]
            l_ += luz_pontual(fx, fy, 22, 1.0)[:, :, None] * hexa("#ffd890") * 0.3 * per["tochas"]
            luz += l_
            luz_q += l_
            spec += luz_pontual(fx, fy, 70, 1.0) * (1 - s3) * per["tochas"]
        acesas.append("e_toc")
    if per["lanterna"] > 0:
        fx, fy = LANTERNA
        s3 = desfocar(ampliar(sombra_objetos(fx, fy)[:, :, None]), 2.0)[:, :, 0]
        l_ = luz_de_chama(fx, fy, 95, 0.7, 9)[:, :, None] * hexa("#ffa858") * 0.95 * per["lanterna"] * (1 - 0.75 * s3)[:, :, None]
        l_ += luz_pontual(fx, fy, 16, 1.0)[:, :, None] * hexa("#ffd890") * 0.6 * per["lanterna"]
        luz += l_
        luz_q += l_
        spec += luz_pontual(fx, fy, 45, 1.0) * per["lanterna"]
        acesas.append("e_lan")
    # rebatimento quente: o que a chama ilumina devolve um pouco de luz da sua cor às superfícies em volta
    if luz_q.max() > 0:
        luz += desfocar(img * luz_q, 26) * 0.45
    luz = np.minimum(luz, 2.6)
    s = solido[:, :, None]
    img = img * (1 - s) + img * s * luz
    # brilho especular quente no metal: onde o sol traçado ou a chama alcança
    spec += T * 1.1 + luz_pontual(JAN_CX, 90, 120, 0.7) * 0.18 * (nome == "dia")
    metal3 = ampliar(metal[:, :, None])[:, :, 0]
    brilho_m = metal3 * np.clip(spec, 0, 1.6)
    img += brilho_m[:, :, None] * hexa("#ffe2a0") * 0.38 + desfocar(brilho_m[:, :, None], 2) * hexa("#ffc070") * 0.25

    # ── Feixe volumétrico: planos de ar traçados (o caixilho e a rede de losangos aparecem no ar), com poeira.
    vol = np.zeros(img.shape[:2], dtype=np.float32)
    planos_ar = np.linspace(0.03, ZB - 0.02, 36)
    ancoras = np.linspace(0.03, ZB - 0.02, 7)
    ocl = [desfocar(ampliar(ocluir_tela(oc_id, np.zeros_like(pix_id), rumo_na_tela(za, rumo), z_oc, za, rumo, passos=90)[:, :, None]), 1.5)[:, :, 0]
           for za in ancoras]
    for zs in planos_ar:
        Xs, Ys = mundo(gx, gy, zs)
        dentro = (Ys > 0) & (Ys < YR) & (z3 > zs)
        Ts = transmissao(Xs, Ys, np.full_like(Xs, zs), rumo, fator=2.2) * dentro
        Ts = Ts * ocl[int(np.argmin(np.abs(ancoras - zs)))]
        vol += Ts
    vol = desfocar(vol[:, :, None], 2.0)[:, :, 0] / len(planos_ar)
    vol = np.power(np.clip(vol, 0, 1), 1.4)
    # raios de luz: estrias ao longo do feixe (a poeira mais densa em umas faixas que em outras)
    bdx, bdy = rumo_na_tela(0.4, rumo)
    perp = (gx * bdy - gy * bdx) / 2.6
    gs = np.random.default_rng(97).random(2000).astype(np.float32)
    i0 = np.floor(perp).astype(int) % 2000
    fr = perp - np.floor(perp)
    estria = gs[i0] * (1 - fr) + gs[(i0 + 1) % 2000] * fr
    perp2 = perp / 4.3
    j0 = np.floor(perp2).astype(int) % 2000
    fr2 = perp2 - np.floor(perp2)
    estria = estria * 0.5 + (gs[(j0 + 700) % 2000] * (1 - fr2) + gs[(j0 + 701) % 2000] * fr2) * 0.5
    vol = vol * (0.2 + 1.15 * estria ** 1.5)
    # o feixe passa atrás da cabeça do esqueleto: ali ele fica mais ralo, para a silhueta do sprite não sumir no brilho
    hx0, hx1, hy0, hy1 = CABECA
    cab = np.clip((gx - hx0 + 8) / 10, 0, 1) * np.clip((hx1 + 8 - gx) / 10, 0, 1) * np.clip((gy - hy0 + 8) / 10, 0, 1) * np.clip((hy1 + 18 - gy) / 12, 0, 1)
    vol = vol * (1 - 0.5 * cab)
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
    img += poeira * mistura(per["sol"], "#ffffff", 0.45) * (0.7 if nome == "dia" else 0.45)

    # ── Emissivos: o céu pela janela e as chamas com halo.
    img += vidro3 * vid * (0.2 if nome == "dia" else 0.9)
    chamas = Camada()
    for chave in acesas:
        colar(chamas, L[chave])
    if chamas.c[:, :, 3].any():
        ch = ampliar(chamas.c)
        img = sobre(img, ch)
        nucleo = (ch[:, :, 3:4] > 0.9).astype(np.float32)
        pm = ch[:, :, :3] * ch[:, :, 3:4] * (0.25 + 0.75 * nucleo)
        img += (desfocar(pm, 2.5) * 0.8 + desfocar(pm, 7) * 0.45 + desfocar(pm, 20) * 0.7) * hexa("#ffb060")

    # ── De manhã as tochas acabaram de ser apagadas: um fio de fumaça sobe de cada uma.
    if per["tochas"] == 0:
        fum = Camada()
        for (k, (fx, fy)) in enumerate((TOCHA_E, TOCHA_D)):
            for j in range(26):
                xx = fx - 0.5 + math.sin(j / 3.2 + k * 1.7) * (0.6 + j * 0.09) + j * 0.12
                fum.p(xx, fy - 1 - j, "#e8e2d8", 0.5 * (1 - j / 26))
                if j > 8:
                    fum.p(xx + 1, fy - 1 - j, "#e8e2d8", 0.25 * (1 - j / 26))
        img = sobre(img, desfocar_rgba(ampliar(fum.c), 1.4) * np.array([1, 1, 1, 0.8], dtype=np.float32))

    # ── Primeiro plano desfocado.
    fr = desfocar_rgba(ampliar(L["frente"].c), 5)
    escur = 0.5 if nome == "dia" else 0.32
    img = sobre(img, fr * np.array([escur * 1.05, escur * 0.95, escur * 0.8, 0.55], dtype=np.float32))

    # ── Acabamento: bloom contido, curva de tom, cor, áreas calmas, vinheta, grão.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img - 0.78, 0, None) * np.clip((lum - 0.6) * 3, 0, 1)
    img = img + desfocar(claro, 6) * 0.35 + desfocar(claro, 22) * 0.4
    joelho = 0.76
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, f = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.8 + 0.2 * (lum * q + (1 - lum) * (f * 0.5 + 0.5)))
    img = np.clip((img - 0.45) * 1.06 + 0.45, 0, 1.3)
    # profundidade de campo em faixa (tilt-shift, como nos jogos HD-2D): nítido no meio, onde ficam o esqueleto e o
    # atril; o forro e a borda de baixo ficam levemente desfocados
    yn = _GYS / ESC
    ts = np.clip((60 - yn) / 55, 0, 1) * 0.85 + np.clip((yn - 154) / 6, 0, 1) * 0.6
    img = img + (desfocar(img, 2.2) - img) * ts[:, :, None]
    calma = mascara_calma()[:, :, None]
    media = desfocar(np.clip(img, 0, 1.3), 14)
    img = media + (img - media) * (1 - 0.5 * calma)
    img = img * (1 - per["calma_k"] * 0.5 * calma) + hexa(per["calma"]) * per["calma_k"] * 0.5 * calma
    xn = _GXS / (W * ESC)
    v = (xn - 0.55) ** 2 * 0.9 + (_GYS / (H * ESC) - 0.45) ** 2 * 0.6
    forca_v = 0.55 if nome == "dia" else 0.9
    img *= (1 - np.clip(v - 0.07, 0, 1) * forca_v)[:, :, None]
    img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.018
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    pedidas = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in pedidas:
        img = montar(nome)
        destino = PASTA / f"portal-{nome}.webp"
        img.save(destino, quality=88, method=6)
        menor = PASTA / f"portal-{nome}-960.webp"
        img.resize((960, 320), Image.LANCZOS).save(menor, quality=88, method=6)
        movel = PASTA / f"portal-{nome}-movel.webp"
        img.crop((MOVEL_X0 * ESC, 0, MOVEL_X1 * ESC, H * ESC)).save(movel, quality=82, method=6)
        print(destino.name, destino.stat().st_size // 1024, "KB |", menor.name, menor.stat().st_size // 1024, "KB |",
              movel.name, movel.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
