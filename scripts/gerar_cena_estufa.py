"""Cenário "HD-2D" da página Revisão: a estufa da vila, encostada no muro de pedra (01/11/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai
das funções abaixo, na mesma técnica das outras cenas (scripts/gerar_cena_observatorio.py é a referência direta):
pixel art em 480 x 160, camada por camada, montada em 3x com a luz calculada por pixel.

A metáfora: revisão espaçada é regar cada planta no tempo certo. Na bancada principal, uma fileira de vasos de barro
mostra a mesma planta em cinco estágios (semente, broto, muda, planta nova e planta florida), cada um com a sua
etiqueta de madeira sem texto. Na outra bancada ficam o regador de latão, a ampulheta (o tempo da revisão), a vela e
um vaso com uma suculenta de folhas em forma de osso (o único aceno discreto à ortopedia, sem anatomia).

A cena: o interior de uma estufa antiga de ferro verde e vidro. À esquerda, o muro de pedra da vila (pedra irregular,
argamassa, musgo) com a prateleira de mudas, as ferramentas penduradas, ervas secando, sacos de terra e o carrinho de
mão. À direita, a parede de vidro sobre a mureta de tijolo: caixilhos em grade, a faixa alta com arcos de bandeira e vidros
em losango de chumbo, tímpanos de ferro com olho redondo, vidros embaçados, um trincado e um basculante aberto; o telhado de vidro com caibros e terças; a coluna de ferro com a
trepadeira; a viga treliçada de onde pendem a lanterna e as cestas de samambaia; a tina de madeira com água; folhas
grandes desfocadas no primeiro plano. Lá fora, pelo vidro: o céu da hora, as árvores, o muro e os telhados da vila.

A luz:
- a estufa tem geometria de verdade (câmera em perspectiva): cada pixel sabe onde está no espaço (X, altura, fundo) e
  "olha" para o sol até sair pelo vidro (telhado, parede do fundo, parede lateral da direita ou a da frente). Se o
  raio sai por um caixilho de ferro, fica na sombra: por isso o quadriculado do ferro aparece projetado no chão, nas
  bancadas e no ar (o feixe volumétrico é a soma de quatro planos de profundidade traçados do mesmo jeito);
- os objetos (vasos, plantas, regador, viga, lanterna) fazem sombra pelo traçado em tela, como no observatório;
- manhã: sol frio-dourado alto pelo telhado, feixes nítidos, orvalho brilhando e vapor leve sobre a tina;
- tarde: poente laranja-rosado, baixo, entrando pelas vidraças da direita, feixes longos atravessando a sala e a
  grade de ferro esticada no chão;
- noite: luar azul pelo telhado (sem roxo), vaga-lumes e a lanterna e a vela acesas, com brilho (bloom);
- profundidade de campo, sombras de contato, mapeamento de tom, correção de cor, vinheta e grão.

Composição para a interface: os 42% da esquerda (x < 200) ficam calmos e escuros (o texto vai ali); os feixes, a
bancada dos estágios, o regador e a ampulheta ficam do centro para a direita. O chão em x 330–380 fica livre para o
gato (pés em y ≈ 150). A coruja pousa no topo da viga de ferro em (POLEIRO), com o vidro livre acima.

Gera em public/pixel/paginas/: estufa-{manha,tarde,noite}.webp (1440 x 480), -960.webp (960 x 320) e
-movel.webp (888 x 480: de x 184 até a borda, a janela do celular).
Uso: python3 scripts/gerar_cena_estufa.py [manha|tarde|noite ...]  (precisa de numpy e Pillow)
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
PISO_Y = 125                                   # junção da parede do fundo com o chão
ZB = F * HC / (PISO_Y - YH) - D                # profundidade da parede do fundo (0,778)
TELHADO_Y = 22                                 # onde o telhado encontra a parede do fundo
YR = HC - (TELHADO_Y - YH) * (ZB + D) / F      # altura do telhado (2,29)
MURETA = 0.32                                  # altura da mureta de tijolo sob o vidro
MURO_X = 196                                   # até aqui, o muro de pedra da vila
X_MURO = (MURO_X - XC) * (ZB + D) / F          # o mesmo limite em coordenada de mundo
XR = (W - XC) * (ZB + D) / F + 0.03            # parede lateral de vidro da direita (fora do quadro)
ZF = -0.5                                      # parede de vidro da frente (atrás da câmera)
PASSO = 22 / 45                                # vão entre montantes (22 px na parede do fundo)
TRAVESSAS = (MURETA, 1.0, 1.62)                # travessas da parede de vidro (altura)

VIGA_Y = 46                                    # topo da viga treliçada (o poleiro)
POLEIRO = (418, 46)                            # onde ficam os pés da coruja
LANTERNA = (286.5, 62.5)                       # chama da lanterna pendurada na viga
VELA = (447.5, 86.5)                           # chama da vela na bancada da direita
MOVEL_X0 = 184                                 # recorte do celular
Z_VIGA = 0.4                                   # profundidade da viga treliçada
X_VIGA0 = (MURO_X - 4 - XC) * (Z_VIGA + D) / F
Y_VIGA = tuple(HC - (yy - YH) * (Z_VIGA + D) / F for yy in (VIGA_Y, VIGA_Y + 3, VIGA_Y + 8, VIGA_Y + 10))


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


# Paletas (do escuro ao claro). A luz da hora entra depois, na montagem.
LATAO = ["#2a1a08", "#5a3a12", "#8a5e1e", "#b4802c", "#d6a242", "#efc66e", "#fff0b8"]
LATAO_ESC = ["#1e1206", "#3a2610", "#5e4018", "#7e5a22"]
FERRO = ["#121214", "#1e1e24", "#2c2c34", "#3e3e48", "#56565f", "#7c7c86"]
FERRO_VERDE = ["#07120f", "#0d1d18", "#142a23", "#1c3a30", "#264b3e", "#345e4e", "#4c7a66"]
MADEIRA = ["#1e120a", "#2e1c10", "#422816", "#58361e", "#704628", "#8a5a34", "#a6703f"]
MADEIRA_GASTA = ["#22180e", "#3a2a1a", "#544028", "#6c5636", "#866e48", "#a08a62"]
BARRO = ["#2e100a", "#4e1e10", "#743018", "#984222", "#b8582e", "#d27444", "#e8966a"]
FOLHA = ["#08200f", "#0e3218", "#164522", "#1f5a2b", "#2c7034", "#43893c", "#68a64c", "#97c46a"]
FOLHA_AZ = ["#0a2420", "#11352e", "#1a4a3c", "#256049", "#357a58", "#4f966a"]  # samambaia (verde-azulado)
TERRA = ["#140c08", "#22160e", "#332216", "#45301f", "#5a4029"]
PEDRA_MURO = ["#1a1918", "#262422", "#33302c", "#423d37", "#534c43", "#655c50", "#7a6f60"]
TIJOLO = ["#2a120c", "#461e12", "#62301c", "#7a4026", "#925432", "#a86a42"]
JUTA = ["#2e2214", "#46361e", "#5e4a2a", "#786038", "#8e7646", "#a68c58"]
CERA = ["#b8a888", "#d8ccac", "#efe6cc", "#fff8e8"]
OURO = "#E4B85C"


# ─────────────────────────────── Horas do dia ───────────────────────────────
# rumo = direção (X, Y, Z) que aponta para a luz; Y > 0 é para cima, Z > 0 é para o fundo.
PERIODOS = {
    "manha": dict(
        ceu=("#4f96e6", "#94cbf4", "#e8f2f4"), arvore=("#465a5e", "#677c7c", "#8ea29c"), morro="#a4bccc",
        gramado=("#9a9c84", "#b2b29a"), telhado_vila=("#8a5a46", "#a8745a"), nevoa="#f4f2ea", nevoa_k=0.85,
        amb="#a6b8c4", amb_k=0.72, vidro_luz="#cfe2ec", vidro_k=0.55,
        sol="#ffe4ae", sol_k=1.35, rumo=(-0.42, 1.0, -0.22), feixe=1.1, vapor=0.22, lamp=0.0, vela=0.0,
        quente="#fff0d2", fria="#33405a", tinta="#f8f8f4", satur=0.72, sangra=0.08),
    "tarde": dict(
        ceu=("#3c3c7a", "#d6806e", "#ffc888"), arvore=("#3a2a34", "#5a3e44", "#7a5650"), morro="#8a6478",
        gramado=("#6e5a3e", "#9a7a4e"), telhado_vila=("#5a3236", "#7a4840"), nevoa="#ffd2a8", nevoa_k=0.8,
        amb="#a08090", amb_k=0.6, vidro_luz="#ffc49a", vidro_k=0.5,
        sol="#ff9c58", sol_k=1.95, rumo=(1.0, 0.36, 0.10), feixe=1.0, vapor=0.16, lamp=0.55, vela=0.5,
        quente="#ffd6a0", fria="#3a2e50"),
    "noite": dict(
        ceu=("#060c22", "#0e1c42", "#20386a"), arvore=("#08101e", "#0e1a2c", "#16243a"), morro="#152648",
        gramado=("#0e1a26", "#14243a"), telhado_vila=("#141a2c", "#1c2438"), nevoa="#40568a", nevoa_k=0.6,
        amb="#62749e", amb_k=0.88, vidro_luz="#7a9ad8", vidro_k=0.55,
        sol="#a6c4ff", sol_k=0.95, rumo=(0.30, 1.0, -0.12), feixe=0.75, vapor=0.10, lamp=2.0, vela=1.5,
        quente="#ffd08e", fria="#0e1a34", sol_sup=1.9),
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


def z_telhado(y):
    return F * (HC - YR) / np.minimum(y - YH, -1e-3) - D


def perto(u, passo, larg, desl=0.0):
    """Distância de u à linha de grade mais próxima (mesma unidade) e se está dentro da largura."""
    f = (u - desl) / passo
    d = np.abs(f - np.round(f)) * passo
    return d < larg / 2


def vidraca(U, Y, fator: float = 1.0):
    """Caixilho de uma parede de vidro no plano (U horizontal, Y altura), em unidades de mundo.
    Devolve (ferro grosso, filete fino, coluna, faixa). `fator` engrossa as linhas (para a sombra)."""
    g = 1.0 / 45  # um pixel da parede do fundo
    grosso = perto(U, PASSO, 2.2 * g * fator, 0.0)
    for ty in TRAVESSAS:
        grosso |= np.abs(Y - ty - 0.5 * g) < 1.2 * g * fator
    faixa = np.digitize(Y, [1.0, 1.62])
    fino = np.zeros_like(grosso)
    baixo = faixa == 0
    meio = faixa == 1
    alto = faixa == 2
    fino |= baixo & perto(U, PASSO, 0.9 * g * fator, PASSO / 2)
    fino |= meio & perto(U, PASSO, 0.9 * g * fator, PASSO / 2)
    # faixa alta: cada vão termina num arco de bandeira (com um arco interno), tímpanos de ferro com um olho de
    # vidro redondo entre os arcos, e embaixo do arco os losangos de chumbo
    u = U - (np.floor(U / PASSO) + 0.5) * PASSO
    r = PASSO / 2 - 1.5 * g
    yc = YR - 0.05 - r
    dist = np.sqrt(u * u + (Y - yc) ** 2)
    em_cima = alto & (Y > yc)
    grosso |= em_cima & (np.abs(dist - r) < 1.1 * g * fator)
    olho = np.sqrt((np.abs(u) - PASSO / 2) ** 2 + (Y - (YR - 0.075)) ** 2)
    timpano = em_cima & (dist > r + 1.0 * g) & (olho > 2.2 * g)
    grosso |= timpano
    a = U + (Y - 1.62)
    b = U - (Y - 1.62)
    fino |= alto & ~timpano & (perto(a, PASSO / 2, 0.95 * g * fator) | perto(b, PASSO / 2, 0.95 * g * fator))
    coluna = np.floor(U / PASSO).astype(int)
    return grosso, fino, coluna, faixa


def caixilho_telhado(X, Z, fator: float = 1.0):
    """Telhado de vidro no plano (X, Z): caibros ao longo do fundo, terças atravessadas e filetes."""
    g = 1.0 / 50
    caibro = perto(X, PASSO, 2.4 * g * fator)
    terca = perto(Z - 0.03, 0.16, 1.6 * g * fator)
    filete = perto(X, PASSO, 0.9 * g * fator, PASSO / 2)
    return caibro | terca, filete


def painel_info(coluna, faixa, s: int):
    """Estado de cada vidro: embaçado (0..1), sujo (0..1) e se é o basculante aberto."""
    h = hash_arr(coluna, faixa, s)
    h2 = hash_arr(coluna, faixa, s + 7)
    emb = np.where(h < 0.42, 0.62 + 0.33 * h2, np.where(h < 0.56, 0.3, 0.03)).astype(np.float32)
    sujo = (0.1 + 0.2 * hash_arr(coluna, faixa, s + 3)).astype(np.float32)
    return emb, sujo


# Basculante aberto (parede do fundo, faixa do meio) e o vidro trincado.
ABERTO = dict(coluna=int(math.floor((400 - XC) / 22)), faixa=1)
TRINCADO = dict(coluna=int(math.floor((334 - XC) / 22)), faixa=1)


def transmissao(X, Y, Z, rumo, fator: float = 1.0) -> np.ndarray:
    """Quanto de luz chega no ponto (X, Y, Z) vindo da direção `rumo`, atravessando o envelope de vidro.
    É o "raio de sombra": anda do ponto até sair da estufa e olha o que há no ponto de saída (vidro limpo, vidro
    embaçado, caixilho de ferro, o muro de pedra ou a mureta)."""
    lx, ly, lz = rumo
    n = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / n, ly / n, lz / n
    inf = np.float32(1e9)
    ts = []
    ts.append(np.where(ly > 0, (YR - Y) / max(ly, 1e-6), inf))
    ts.append(np.where(lz > 0, (ZB - Z) / max(lz, 1e-6), inf) if lz > 0 else np.full_like(X, inf))
    ts.append(np.where(lz < 0, (ZF - Z) / min(lz, -1e-6), inf) if lz < 0 else np.full_like(X, inf))
    ts.append(np.where(lx > 0, (XR - X) / max(lx, 1e-6), inf) if lx > 0 else np.full_like(X, inf))
    xl = (0 - XC) * (ZB + D) / F - 0.5
    ts.append(np.where(lx < 0, (xl - X) / min(lx, -1e-6), inf) if lx < 0 else np.full_like(X, inf))
    T = np.stack(ts)
    qual = np.argmin(T, axis=0)
    t = np.min(T, axis=0)
    ex, ey, ez = X + lx * t, Y + ly * t, Z + lz * t
    out = np.zeros_like(X)
    # telhado
    m = qual == 0
    if m.any():
        ferro, filete = caixilho_telhado(ex, ez, fator)
        col = np.floor(ex / PASSO).astype(int)
        lin = np.floor(ez / 0.16).astype(int)
        emb, sujo = painel_info(col, lin + 40, 211)
        v = (1 - ferro) * (1 - 0.8 * filete) * np.clip(1 - 1.15 * emb, 0.05, 1) * (1 - 0.6 * sujo)
        v = np.where(ex < X_MURO + (ez - ZB) * 0.0, 0.0, v)   # sobre o muro, o telhado é de tábuas
        out = np.where(m, v, out)
    # paredes de vidro: fundo (U = X), frente (U = X), direita (U = Z)
    for k, U in ((1, ex), (2, ex), (3, ez * 1.6)):
        m = qual == k
        if not m.any():
            continue
        grosso, fino, col, faixa = vidraca(U, ey, fator)
        emb, sujo = painel_info(col, faixa + 10 * k, 300 + k)
        if k == 3:
            emb = emb * 0.35   # a lateral da direita foi lavada: o poente entra limpo
        if k == 1:
            aberto = (col == ABERTO["coluna"]) & (faixa == ABERTO["faixa"])
            emb = np.where(aberto, 0, emb)
            sujo = np.where(aberto, -0.08, sujo)
        v = (1 - grosso) * (1 - 0.85 * fino) * np.clip(1 - 1.15 * emb, 0.05, 1) * (1 - 0.6 * sujo)
        v = np.where(ey < MURETA, 0.0, v)
        if k == 1:
            v = np.where(ex < X_MURO, 0.0, v)
        out = np.where(m, v, out)
    # parede da esquerda (pedra) e pontos fora da sala
    out = np.where(qual == 4, 0.0, out)
    # a viga treliçada (em Z_VIGA) também faz sombra: banzos cheios, treliça pela metade
    if abs(lz) > 1e-3:
        tg = (Z_VIGA - Z) / lz
        yg = Y + ly * tg
        xg = X + lx * tg
        cruza = (tg > 0) & (tg < t) & (xg > X_VIGA0)
        banzo = cruza & (((yg <= Y_VIGA[0]) & (yg > Y_VIGA[1])) | ((yg <= Y_VIGA[2]) & (yg > Y_VIGA[3])))
        trelica = cruza & (yg <= Y_VIGA[1]) & (yg > Y_VIGA[2])
        out = out * np.where(banzo, 0.0, np.where(trelica, 0.45, 1.0))
    out = np.where((Y < -0.01) | (Y > YR + 0.01) | (Z > ZB + 0.01), 0.0, out)
    return out.astype(np.float32)


# ─────────────────────────────── Lá fora (visto pelo vidro) ───────────────────────────────
def pintar_fora(nome: str, per: dict) -> np.ndarray:
    """O céu, o morro, as árvores, o muro e os telhados da vila, o gramado. Só aparece através do vidro."""
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    t = np.clip(_YS / 82, 0, 1)[:, :, None]
    ceu = np.where(t < 0.55, topo * (1 - t / 0.55) + meio * (t / 0.55), meio * (1 - (t - 0.55) / 0.45) + horiz * ((t - 0.55) / 0.45))
    ceu = ceu.astype(np.float32)
    nuv = ruido(41, 30, 6) * 0.6 + ruido(42, 9, 3) * 0.4
    faixa = np.exp(-((_YS - 18) / 12) ** 2) + np.exp(-((_YS - 46) / 6) ** 2) * 0.7
    v = np.clip((nuv - 0.5) * 3.0 * faixa, 0, 0.8)
    if nome == "manha":
        ceu = ceu * (1 - v[:, :, None] * 0.75) + hexa("#ffffff") * v[:, :, None] * 0.75
        ceu += (np.exp(-np.hypot(_XS - 330, _YS + 60) / 140) * 0.3)[:, :, None] * hexa("#fff4d8")
    elif nome == "tarde":
        cn = np.where((np.roll(nuv, -2, 0) < nuv)[:, :, None], hexa("#ffd8a8"), hexa("#b8708a"))
        ceu = ceu * (1 - v[:, :, None] * 0.8) + cn * v[:, :, None] * 0.8
        # o sol baixo, à direita, quase tocando o morro
        d = np.hypot(_XS - 470, (_YS - 64) * 1.2)
        ceu += (np.exp(-d / 70) * 0.75)[:, :, None] * hexa("#ffc070")
        ceu = np.where((d < 7)[:, :, None], hexa("#fff2c8") * 1.25, ceu)
        for (bx, by) in ((380, 34), (386, 30), (391, 35), (352, 40), (357, 37)):
            for (dx, dy) in ((-1, -1), (0, 0), (1, -1)):
                ceu[by + dy, bx + dx] = hexa("#3a2230")
    else:
        g = np.random.default_rng(17)
        for _ in range(520):
            x, y = int(g.random() * W), int(g.random() * 70)
            b = 0.2 + g.random() ** 2.2 * 0.95
            ceu[y, x] += b * hexa("#e4ecff")
        via = np.exp(-((_YS - 0.4 * (_XS - 260) - 20) / 10) ** 2) * ruido(43, 5) * 0.28
        ceu += via[:, :, None] * hexa("#7c94d4")
        ceu = ceu * (1 - v[:, :, None] * 0.3) + hexa("#28385e") * v[:, :, None] * 0.3
        # a lua cheia por cima do telhado de vidro, à direita
        lx, ly = 372.0, 9.0
        dl = np.hypot(_XS - lx, _YS - ly)
        lua = np.clip(5.6 - dl, 0, 1)
        mares = ruido(44, 2) > 0.62
        cor_lua = np.where(mares[:, :, None], hexa("#c8ccd8"), hexa("#f4f2e4"))
        ceu = ceu * (1 - lua[:, :, None]) + cor_lua * lua[:, :, None] * 1.15
        ceu += (np.exp(-dl / 16) * 0.35)[:, :, None] * hexa("#9ab4f0")
    # Morro ao longe.
    for x in range(W):
        ym = 70 + 5 * math.sin(x / 41.0 + 0.6) + 2.5 * math.sin(x / 13.0) + 1.2 * hash01(x // 4, 2)
        for y in range(int(ym), 82):
            ceu[y, x] = ceu[y, x] * 0.35 + hexa(per["morro"]) * 0.65
    # Telhados da vila atrás do muro do jardim (com chaminés e janelinhas).
    tv0, tv1 = hexa(per["telhado_vila"][0]), hexa(per["telhado_vila"][1])
    casas = [(206, 26, 66, 1), (238, 22, 62, 0), (300, 30, 68, 1), (348, 20, 63, 0), (392, 34, 67, 1), (452, 26, 64, 0)]
    for (cx0, larg, ytop, chamine) in casas:
        for x in range(cx0, min(W, cx0 + larg)):
            u = (x - cx0) / larg
            yt = ytop + abs(u - 0.5) * larg * 0.45
            for y in range(int(yt), 84):
                if y < 0:
                    continue
                parede_ = y > ytop + larg * 0.24
                if parede_:
                    ceu[y, x] = mistura(per["morro"], "#d8c8a8" if nome == "manha" else "#806878" if nome == "tarde" else "#1a2238", 0.5)
                else:
                    k = 0.5 + ((y - ytop) % 3 == 0) * -0.25 + (u > 0.5) * -0.15
                    ceu[y, x] = tv0 * (1 - k) + tv1 * k
        if chamine:
            cxh = cx0 + int(larg * 0.7)
            for y in range(ytop - 2, ytop + 6):
                for x in range(cxh, cxh + 3):
                    ceu[y, x] = tv0 * 0.8
        for (wx, wy) in ((cx0 + larg // 3, ytop + int(larg * 0.32)), (cx0 + 2 * larg // 3, ytop + int(larg * 0.32))):
            if 0 <= wy < H and wx < W:
                cor = hexa("#ffcf70") * 1.3 if nome == "noite" else hexa("#2a2a3a") if nome == "manha" else hexa("#ffb860")
                ceu[wy:wy + 2, wx:wx + 2] = cor
    # Árvores do jardim (copas em tufos), mais altas atrás da estufa à direita.
    a0, a1, a2 = (hexa(c) for c in per["arvore"])
    copa = ruido(45, 7) * 0.6 + ruido(46, 3) * 0.4
    for x in range(W):
        alt = 52 - 18 * math.exp(-((x - 430) / 60) ** 2) - 12 * math.exp(-((x - 250) / 34) ** 2) + 6 * math.sin(x / 9.0) * 0.6 + 4 * copa[30, x]
        for y in range(int(alt), 92):
            k = copa[y, x]
            ilum = (k > 0.55) and (y - alt < 26)
            c = a2 if (ilum and copa[max(0, y - 2), x] < k) else a1 if k > 0.45 else a0
            dens = np.clip((y - alt) / 3, 0, 1)
            if y - alt < 3 and hash01(x, y, 47) > dens:
                continue
            ceu[y, x] = c
        # troncos
        if x % 37 in (11, 12) and x > 200:
            for y in range(int(alt) + 12, 92):
                ceu[y, x] = a0 * 0.7
    # Muro do jardim lá fora e o gramado até a estufa.
    g0, g1 = (hexa(c) for c in per["gramado"])
    for y in range(84, H):
        for x in range(W):
            if y < 88:
                ceu[y, x] = mistura("#8a8478" if nome == "manha" else "#6a5050" if nome == "tarde" else "#141c2c", "#000000", 0.15 * ((x // 5 + y) % 2))
            else:
                k = hash01(x, y, 48)
                ceu[y, x] = g0 * (1 - k * 0.4) + g1 * k * 0.4 if (x + y * 3) % 7 else g1
    return np.clip(ceu, 0, 1.6)


# ─────────────────────────────── Estrutura: muro, vidro, telhado, mureta, coluna ───────────────────────────────
def estrutura() -> dict:
    """Pinta o muro de pedra, o forro de tábuas sobre ele, os caixilhos do telhado e da parede de vidro, a mureta de
    tijolo, a calha, a coluna de ferro e a trepadeira. Devolve camadas e mapas (vidro, embaçado, sujeira)."""
    c = Camada()
    px, py = _XS + 0.5, _YS + 0.5
    vidro = np.zeros((H, W), dtype=np.float32)
    emb_m = np.zeros((H, W), dtype=np.float32)
    sujo_m = np.zeros((H, W), dtype=np.float32)
    aberto_m = np.zeros((H, W), dtype=np.float32)
    fundo_painel = np.zeros((H, W), dtype=np.float32)  # 0 no alto do vidro, 1 embaixo (o orvalho escorre)

    # ── Telhado (y < TELHADO_Y): vidro com caibros e terças; sobre o muro, forro de tábuas.
    zt = z_telhado(py)
    Xt, _ = mundo(px, py, zt)
    telhado = py < TELHADO_Y
    forro = telhado & (Xt < X_MURO)
    ferro_t, filete_t = caixilho_telhado(Xt, zt)
    col_t = np.floor(Xt / PASSO).astype(int)
    lin_t = np.floor((zt - 0.03) / 0.16).astype(int)
    emb_t, sujo_t = painel_info(col_t, lin_t + 40, 211)
    vid_t = telhado & ~forro & ~ferro_t
    # tons do ferro do telhado: a aresta de baixo do caibro pega a luz da sala
    escala_t = F / (zt + D)
    dcaibro = (Xt / PASSO - np.round(Xt / PASSO)) * PASSO * escala_t
    cor_ferro_t = tons_arr(FERRO_VERDE, 0.45 + 0.25 * np.sign(-dcaibro) * (np.abs(dcaibro) > 0.6) - 0.25 * (zt - 0.3))
    c.mascara((telhado & ferro_t & ~forro).astype(np.float32), cor_ferro_t)
    c.mascara((vid_t & filete_t).astype(np.float32), hexa(FERRO_VERDE[2]), 0.85)
    vidro = np.where(vid_t & ~filete_t, 1.0, vidro)
    emb_m = np.where(vid_t, emb_t * 0.55, emb_m)
    sujo_m = np.where(vid_t, sujo_t * 0.6, sujo_m)
    # forro de tábuas escuras sobre o muro, com as vigas aparentes
    zf = zt
    Xf = Xt
    tab = np.floor(zf / 0.07).astype(int)
    veio = ruido(31, 9, 1)
    k = 0.32 + (hash_arr(tab, 3, 31) - 0.5) * 0.18 + (veio - 0.5) * 0.2 - 0.25 * ((zf - zf.min()) * 0)
    junta = perto(zf, 0.07, 0.012)
    k = np.where(junta, 0.05, k)
    viga_f = perto(Xf, 0.9, 0.09, 0.2)
    k = np.where(viga_f, 0.45 + 0.2 * ((Xf / 0.9 - np.round((Xf - 0.2) / 0.9)) > 0), k)
    c.mascara(forro.astype(np.float32), tons_arr(MADEIRA, k * 0.9))
    # beirada do forro: a tábua de testeira na linha do telhado de vidro
    borda_forro = telhado & (np.abs(Xt - X_MURO) * escala_t < 1.6)
    c.mascara(borda_forro.astype(np.float32), hexa(MADEIRA[4]))

    # ── Calha de ferro no encontro do telhado com a parede de vidro.
    for x in range(MURO_X - 6, W):
        c.p(x, TELHADO_Y - 2, FERRO_VERDE[5])
        c.p(x, TELHADO_Y - 1, FERRO_VERDE[3])
        c.p(x, TELHADO_Y, FERRO_VERDE[2])
        c.p(x, TELHADO_Y + 1, FERRO_VERDE[4] if x % 22 else LATAO[2])
        c.p(x, TELHADO_Y + 2, FERRO_VERDE[1])

    # ── Parede de vidro do fundo (x ≥ MURO_X, entre a calha e a mureta).
    Xw = (px - XC) * (ZB + D) / F
    Yw = HC - (py - YH) * (ZB + D) / F
    grosso, fino, col, faixa = vidraca(Xw, Yw)
    emb_w, sujo_w = painel_info(col, faixa + 10, 301)
    parede_vidro = (px >= MURO_X) & (py > TELHADO_Y + 2) & (Yw >= MURETA)
    aberto = parede_vidro & (col == ABERTO["coluna"]) & (faixa == ABERTO["faixa"])
    trinc = parede_vidro & (col == TRINCADO["coluna"]) & (faixa == TRINCADO["faixa"])
    # ferro grosso com volume (aresta esquerda clara, direita escura), filetes finos de chumbo/ferro
    dmont = (Xw / PASSO - np.round(Xw / PASSO)) * 45 * PASSO
    k = 0.5 + 0.22 * (dmont < -0.2) - 0.22 * (dmont > 0.6)
    for ty in TRAVESSAS:
        em = np.abs(Yw - ty - 0.5 / 45) < 1.2 / 45
        k = np.where(em, 0.62 - 0.4 * ((Yw - ty) * 45 < -0.2), k)
    k = k + (ruido(32, 2, 7) - 0.5) * 0.12
    c.mascara((parede_vidro & grosso).astype(np.float32), tons_arr(FERRO_VERDE, k))
    c.mascara((parede_vidro & fino & ~grosso & ~aberto & (faixa < 2)).astype(np.float32), hexa(FERRO_VERDE[2]), 0.92)
    c.mascara((parede_vidro & fino & ~grosso & (faixa == 2)).astype(np.float32), hexa("#1a2a22"), 0.62)  # chumbo dos losangos
    vid_w = parede_vidro & ~grosso & ~(fino & ~aberto)
    vidro = np.where(vid_w, 1.0, vidro)
    emb_m = np.where(vid_w, emb_w, emb_m)
    sujo_m = np.where(vid_w, sujo_w, sujo_m)
    aberto_m = np.where(aberto & vid_w, 1.0, aberto_m)
    # posição dentro do vidro (para o embaçado mais forte embaixo de cada painel)
    limites = np.array([MURETA, 1.0, 1.62, YR])
    idx = np.clip(np.searchsorted(limites, Yw) - 1, 0, len(limites) - 2)
    y_lo, y_hi = limites[idx], limites[idx + 1]
    fundo_painel = np.where(vid_w, np.clip(1 - (Yw - y_lo) / np.maximum(y_hi - y_lo, 1e-3), 0, 1), fundo_painel)
    fundo_painel = np.where(vid_t, 0.3, fundo_painel)

    # O basculante aberto: a folha empurrada para fora, vista de lado (caixilho em perspectiva) e a haste de latão.
    xs_ab = np.where(aberto.any(0))[0]
    ys_ab = np.where(aberto.any(1))[0]
    ab = None
    if len(xs_ab):
        x0a, x1a, y0a, y1a = int(xs_ab.min()), int(xs_ab.max()), int(ys_ab.min()), int(ys_ab.max())
        ab = (x0a, x1a, y0a, y1a)
        # A folha gira no topo e sai para fora (basculante): o vidro dela cobre a parte de cima do vão, refletindo o
        # céu; embaixo fica a fresta aberta, com o lado de fora nítido. O caixilho da folha aparece em perspectiva.
        yr = y0a + int((y1a - y0a) * 0.58)
        for y in range(y0a + 1, yr):
            t = (y - y0a) / max(1, yr - y0a)
            ins = int(1 + t * 2)
            for x in range(x0a + ins, x1a - ins + 1):
                c.p(x, y, mistura("#eaf4f6", "#9ab8c4", t), 0.42 + 0.1 * ((x + y) % 5 == 0))
            c.p(x0a + ins - 1, y, FERRO_VERDE[5])
            c.p(x1a - ins + 1, y, FERRO_VERDE[3])
        c.linha(x0a + 1, y0a, x1a - 1, y0a, FERRO_VERDE[6])
        c.linha(x0a + 3, yr - 1, x1a - 3, yr - 1, FERRO_VERDE[6])   # travessa de baixo da folha (a luz pega em cima)
        c.linha(x0a + 3, yr, x1a - 3, yr, FERRO_VERDE[4])
        c.linha(x0a + 3, yr + 1, x1a - 3, yr + 1, FERRO_VERDE[1])
        c.linha(x0a + 4, yr + 2, x1a - 4, yr + 2, "#000000", 0.35)
        aberto_m[y0a:yr + 2, x0a:x1a + 1] = 0.0                 # em cima é vidro (da folha)
        emb_m[y0a:yr + 2, x0a:x1a + 1] = 0.0
        # haste de latão do peitoril até a folha
        c.linha(x0a + 4, y1a - 1, x0a + 7, yr + 3, FERRO[4])
        c.p(x0a + 4, y1a - 1, LATAO[4])
        # ramo da trepadeira entrando pela fresta
        for k in range(5):
            c.p(x1a - 4 - k, yr + 3 + (k % 2), FOLHA[4 + k % 2])
            c.p(x1a - 4 - k, yr + 4 + (k % 2), FOLHA[2])
    # O vidro trincado: rachaduras finas em estrela irregular, com um caco faltando no canto.
    xs_tr = np.where(trinc.any(0))[0]
    ys_tr = np.where(trinc.any(1))[0]
    trincas = Camada()
    if len(xs_tr):
        # uma trinca só, que nasce no canto de cima e desce serpenteando, com dois galhos curtos (sem estrela)
        x, y = float(xs_tr.min()) + 2, float(ys_tr.min()) + 1
        galhos = []
        for s_ in range(30):
            ang2 = 1.05 + 0.5 * math.sin(s_ * 0.7) + (hash01(s_, 77) - 0.5) * 0.5
            x += math.cos(ang2) * 0.8
            y += math.sin(ang2) * 0.8
            if trinc[int(np.clip(y, 0, H - 1)), int(np.clip(x, 0, W - 1))]:
                trincas.p(x, y, "#e8f4ff", 0.42)
            if s_ in (9, 19):
                galhos.append((x, y, 0.1 if s_ == 9 else 2.4))
        for (gx_, gy_, ang) in galhos:
            for s_ in range(5):
                gx_ += math.cos(ang)
                gy_ += math.sin(ang)
                if trinc[int(np.clip(gy_, 0, H - 1)), int(np.clip(gx_, 0, W - 1))]:
                    trincas.p(gx_, gy_, "#e8f4ff", 0.3)
        # caco faltando no canto de baixo à direita (vê-se o lado de fora sem o vidro)
        x1t, y1t = int(xs_tr.max()), int(ys_tr.max())
        for j in range(5):
            for i in range(5 - j):
                if trinc[y1t - j, x1t - i]:
                    aberto_m[y1t - j, x1t - i] = 1.0
                    emb_m[y1t - j, x1t - i] = 0.0

    # ── Mureta de tijolo sob o vidro, com a soleira de pedra.
    mureta = (px >= MURO_X) & (Yw < MURETA) & (py < PISO_Y)
    y_sol = YH + (HC - MURETA) * F / (ZB + D)
    n = ruido(33, 2)
    fiada = np.floor((py - y_sol) / 3.5).astype(int)
    desl = (fiada % 2) * 5
    bloco_ = np.floor((px + desl) / 10).astype(int)
    em_x = (px + desl) % 10
    em_y = (py - y_sol) % 3.5
    kt = 0.5 + (hash_arr(bloco_, fiada, 34) - 0.5) * 0.35 + (n - 0.5) * 0.25 + 0.15 * (em_y < 1)
    junta = (em_x < 1) | (em_y > 2.6)
    kt = np.where(junta, 0.08, kt)
    cor_m = tons_arr(TIJOLO, kt)
    musgo = (ruido(35, 4) > 0.62) & (py > PISO_Y - 6)
    cor_m = np.where(musgo[:, :, None], cor_m * 0.5 + hexa("#3e5a2a") * 0.5, cor_m)
    c.mascara(mureta.astype(np.float32), cor_m)
    for x in range(MURO_X, W):
        y = int(y_sol)
        c.p(x, y - 2, "#8a8274")
        c.p(x, y - 1, "#6a6458" if x % 9 else "#4a463e")
        c.p(x, y, "#3a3630")
        c.p(x, y + 1, "#1a1816", 0.8)

    # ── Muro de pedra da vila (x < MURO_X, abaixo do forro): pedras irregulares (Voronoi), argamassa e musgo.
    muro = (px < MURO_X) & ~telhado & (py < PISO_Y)
    g = np.random.default_rng(36)
    centros = []
    y = TELHADO_Y - 6.0
    while y < PISO_Y + 6:
        alt = 5 + g.random() * 3.5
        x = -g.random() * 10
        while x < MURO_X + 10:
            larg = 7 + g.random() * 9
            centros.append((x + larg / 2 + (g.random() - 0.5) * 3, y + alt / 2 + (g.random() - 0.5) * 2, larg / 2, alt / 2))
            x += larg
        y += alt
    cs = np.array(centros, dtype=np.float32)
    dx = (px[None] - cs[:, 0, None, None]) / cs[:, 2, None, None]
    dy = (py[None] - cs[:, 1, None, None]) / cs[:, 3, None, None]
    dist = np.sqrt(dx * dx + dy * dy)
    o = np.argsort(dist, axis=0)
    i1 = o[0]
    d1 = np.take_along_axis(dist, o[:1], 0)[0]
    d2 = np.take_along_axis(dist, o[1:2], 0)[0]
    borda = (d2 - d1)
    dxs = np.take_along_axis(dx, o[:1], 0)[0]
    dys = np.take_along_axis(dy, o[:1], 0)[0]
    kp = 0.48 + (hash_arr(i1, 7, 37) - 0.5) * 0.3 + (ruido(38, 2) - 0.5) * 0.18
    kp += -0.1 * dys - 0.05 * dxs            # pedra abaulada: topo e esquerda claros
    kp = np.where(borda < 0.34, kp - 0.22, kp)  # aresta da pedra
    kp = np.where(borda < 0.16, 0.06, kp)       # argamassa funda
    kp -= 0.12 * np.clip((py - 100) / 25, 0, 1)
    cor_p = tons_arr(PEDRA_MURO, kp)
    tom = hash_arr(i1, 9, 39)
    cor_p = np.where((tom > 0.7)[:, :, None], cor_p * np.array([1.06, 0.98, 0.9], dtype=np.float32), cor_p)
    musgo = (ruido(40, 5) * 0.7 + ruido(41, 2) * 0.3 > 0.58) & ((borda < 0.45) | (py > 108)) & (dys < 0.2)
    cor_p = np.where(musgo[:, :, None], cor_p * 0.45 + hexa("#2e4a22") * 0.55, cor_p)
    c.mascara(muro.astype(np.float32), cor_p)
    # a quina do muro com a estufa: sombra e um filete de luz no canto
    for y in range(TELHADO_Y, PISO_Y):
        c.p(MURO_X - 1, y, "#000000", 0.5)
        c.p(MURO_X - 2, y, "#000000", 0.25)

    # ── Coluna de ferro na quina, com base, anel e capitel de volutas.
    col_x = MURO_X - 1
    for y in range(0, PISO_Y + 1):
        larg = 3 if y > 30 else 3
        if PISO_Y - 6 <= y:
            larg = 5
        elif PISO_Y - 9 <= y:
            larg = 4
        elif TELHADO_Y - 2 <= y <= TELHADO_Y + 3:
            larg = 5
        for x in range(col_x - larg, col_x + larg + 1):
            u = (x - col_x) / max(larg, 1)
            k_ = 0.75 - abs(u + 0.3) * 0.7 + (0.08 if (x - col_x) % 2 == 0 and larg == 3 else 0)
            c.p(x, y, tons_idx(FERRO_VERDE, k_))
    for (vx, sx) in ((col_x - 7, -1), (col_x + 7, 1)):
        for k_ in range(10):
            a_ = k_ / 9 * math.pi * 1.4
            c.p(vx - sx * math.cos(a_) * 2.5, TELHADO_Y + 4 - math.sin(a_) * 2.5, FERRO_VERDE[4])
        c.linha(col_x, TELHADO_Y + 4, vx, TELHADO_Y + 4, FERRO_VERDE[3])
    # mão-francesa decorativa ligando a coluna à viga
    for k_ in range(18):
        a_ = k_ / 17 * math.pi / 2
        c.p(col_x + 4 + 12 - math.cos(a_) * 12, VIGA_Y + 6 + 12 - math.sin(a_) * 12 + 12 - 12, FERRO_VERDE[4] if k_ % 4 else LATAO[3])

    # Vidro antigo: cada painel (e cada losango) com um tom e um brilho levemente diferentes.
    ia = np.floor((Xw + (Yw - 1.62)) / (PASSO / 2)).astype(int)
    ib = np.floor((Xw - (Yw - 1.62)) / (PASSO / 2)).astype(int)
    hq = np.where(faixa == 2, hash_arr(ia, ib, 71), hash_arr(col, faixa, 72))
    hq = np.where(vid_t, hash_arr(col_t, lin_t, 73), hq)
    var = np.ones((H, W, 3), dtype=np.float32) * (0.9 + 0.2 * hq)[:, :, None]
    var = np.where((hq > 0.86)[:, :, None], var * np.array([1.04, 1.0, 0.86], dtype=np.float32), var)   # âmbar
    var = np.where((hq < 0.12)[:, :, None], var * np.array([0.88, 1.0, 0.96], dtype=np.float32), var)   # verde-garrafa
    return dict(c=c, vidro=vidro, emb=emb_m, sujo=sujo_m, aberto=aberto_m, fundo_painel=fundo_painel, var=var,
                trincas=trincas, ab=ab, telhado_vidro=vid_t.astype(np.float32))


# ─────────────────────────────── Chão ───────────────────────────────
def chao() -> Camada:
    """Lajotas de pedra em perspectiva (assentadas em amarração), juntas com musgo, terra derramada e folhas caídas."""
    c = Camada()
    py = _YS + 0.5
    px = _XS + 0.5
    m = py >= PISO_Y
    zc = z_chao(np.maximum(py, PISO_Y + 0.01))
    X, _ = mundo(px, py, zc)
    fiada = np.floor(zc / 0.105).astype(int)
    U = X + (fiada % 2) * 0.17
    laje = np.floor(U / 0.34).astype(int)
    eu = (U / 0.34) % 1
    ez = (zc / 0.105) % 1
    esc = F / (zc + D)
    du = np.minimum(eu, 1 - eu) * 0.34 * esc     # distância à junta em px
    dz = np.minimum(ez, 1 - ez) * 0.105 * 103.1 / (zc + D) ** 2
    n = ruido(51, 3)
    k = 0.6 + (hash_arr(laje, fiada, 52) - 0.5) * 0.3 + (n - 0.5) * 0.22
    k += 0.12 * (ez > 0.75) - 0.1 * (eu > 0.85)   # aresta da frente da laje clara, lado direito escuro
    junta = (du < 0.75) | (dz < 0.55)
    k = np.where(junta, 0.05, k)
    k -= 0.1 * np.clip((zc - 0.45) / 0.35, 0, 1)  # o fundo é mais escuro
    k -= 0.18 * np.clip((MURO_X + 20 - px) / 160, 0, 1)
    cor = tons_arr(["#151413", "#22201d", "#302c27", "#3f3a33", "#4f483f", "#62594c", "#766b5b"], k)
    musgo = junta & (ruido(53, 4) > 0.55)
    cor = np.where(musgo[:, :, None], cor * 0.4 + hexa("#2e4a24") * 0.6, cor)
    # terra derramada perto dos sacos e da bancada, e manchas de umidade
    terra = (ruido(54, 6) > 0.7) & (((px < 120) & (py > 140)) | ((px > 200) & (px < 320) & (py < 136)))
    cor = np.where(terra[:, :, None], tons_arr(TERRA, 0.4 + n * 0.5), cor)
    umido = np.exp(-(((px - 258) / 70) ** 2 + ((py - 152) / 9) ** 2))
    cor = cor * (1 - 0.3 * umido)[:, :, None]
    c.mascara(m.astype(np.float32), cor)
    # folhas caídas (fora da faixa do gato)
    g = np.random.default_rng(55)
    for _ in range(26):
        x, y = 200 + g.random() * 275, 128 + g.random() * 30
        if 322 < x < 388:
            continue
        cor_f = FOLHA[3 + int(g.random() * 3)] if g.random() < 0.7 else "#8a6a2a"
        c.p(x, y, cor_f)
        c.p(x + 1, y, mistura(cor_f, "#000000", 0.3))
    # ralo de ferro no chão, perto da tina
    for x in range(300, 314):
        for y in range(152, 155):
            c.p(x, y, FERRO[1] if (x % 2) else FERRO[3])
    return c


# ─────────────────────────────── Plantas e vasos ───────────────────────────────
def folha(c: Camada, x0, y0, ang, comp, larg, tons, nervura: bool = True, luz: float = -1.0) -> None:
    """Folha lanceolada: forma de lança, lado de cima claro, nervura central, ponta fina."""
    ux, uy = math.cos(ang), math.sin(ang)
    nx, ny = -uy, ux
    passos = max(2, int(comp * 2.2))
    for i in range(passos + 1):
        t = i / passos
        w = larg * (math.sin(math.pi * min(1.0, t * 1.08)) ** 0.75) * (1 - 0.15 * t)
        cx, cy = x0 + ux * comp * t, y0 + uy * comp * t
        jn = int(math.ceil(w)) + 1
        for j in range(-jn, jn + 1):
            s = j / 2.0
            if abs(s) > w:
                continue
            lado = (s * (ny * luz)) > 0 or (s * nx * 0.3 > 0)
            k = 0.62 - 0.25 * t + (0.18 if lado else -0.12) - abs(s) / max(w, 0.5) * 0.15
            c.p(cx + nx * s, cy + ny * s, tons_idx(tons, k))
        if nervura and 0.1 < t < 0.85 and comp > 4:
            c.p(cx, cy, tons_idx(tons, 0.92 - 0.3 * t))


def caule(c: Camada, pts, cor) -> None:
    for i in range(len(pts) - 1):
        c.linha(*pts[i], *pts[i + 1], cor)


def vaso(c: Camada, cx: float, yb: int, w: int, h: int, seed: int, terra: bool = True) -> int:
    """Vaso de barro torneado: corpo afunilado com volume, borda saliente, salitre e musgo. Devolve o y da terra."""
    topo = yb - h
    for y in range(topo + 2, yb):
        t = (y - topo - 2) / max(1, (yb - topo - 2))
        meia = (w / 2 - 0.5) * (1 - 0.22 * t)
        for x in range(int(math.floor(cx - meia)), int(math.ceil(cx + meia))):
            u = (x + 0.5 - cx) / max(meia, 1)
            k = 0.72 - abs(u + 0.32) * 0.62 - 0.12 * t + (hash01(x, y, seed) - 0.5) * 0.08
            cor = tons_idx(BARRO, k)
            if hash01(x, y, seed + 1) < 0.06 and t < 0.5:
                cor = mistura(cor, "#e8dcc8", 0.45)   # salitre
            if t > 0.8 and hash01(x, y, seed + 2) < 0.25:
                cor = mistura(cor, "#3e5a2a", 0.5)    # limo na base
            c.p(x, y, cor)
        c.p(cx - meia - 0.5, y, BARRO[0], 0.9)
        c.p(cx + meia - 0.5, y, BARRO[0], 0.9)
    # borda saliente (2 px) com o lábio claro em cima
    meia = w / 2 + 0.5
    for x in range(int(math.floor(cx - meia)), int(math.ceil(cx + meia))):
        u = (x + 0.5 - cx) / meia
        c.p(x, topo, tons_idx(BARRO, 0.85 - abs(u + 0.3) * 0.5))
        c.p(x, topo + 1, tons_idx(BARRO, 0.62 - abs(u + 0.3) * 0.55))
        c.p(x, topo + 2, BARRO[1], 0.85)
    if terra:
        for x in range(int(math.floor(cx - meia + 1)), int(math.ceil(cx + meia - 1))):
            c.p(x, topo, TERRA[2] if hash01(x, seed) > 0.4 else TERRA[3])
        c.p(cx - meia + 1, topo, BARRO[5])
    c.ret(cx - w / 2 + 1, yb, w - 2, 1, "#000000", 0.35)
    return topo


def etiqueta(c: Camada, x: int, y: int, h: int = 6) -> None:
    """Etiqueta de madeira espetada na terra (sem texto: só a ponta clara e o veio)."""
    clara = ["#4e3e2a", "#7a6646", "#a08a62", "#bea67a"]
    for j in range(h):
        c.p(x, y + j, clara[3] if j < 4 else clara[2])
        c.p(x + 1, y + j, clara[2] if j < 4 else clara[1])
        c.p(x + 2, y + j, clara[0], 0.8)
    c.p(x, y - 1, clara[2])
    c.p(x + 1, y - 1, clara[1])
    c.p(x + 1, y + 2, "#5a4a3a", 0.45)   # marquinha de carvão (ilegível)


def flor(c: Camada, x, y, cor, miolo) -> None:
    for (dx, dy) in ((0, -1), (-1, 0), (1, 0), (0, 1)):
        c.p(x + dx, y + dy, cor)
    c.p(x - 1, y - 1, mistura(cor, "#ffffff", 0.35), 0.7)
    c.p(x, y, miolo)


def fronde(c: Camada, x0, y0, ang, comp, tons, curva: float = 0.02, folhinha: float = 2.2) -> None:
    """Fronde de samambaia: raque curva com folíolos alternados que diminuem para a ponta."""
    x, y = x0, y0
    a = ang
    for i in range(int(comp)):
        t = i / comp
        a += curva
        x += math.cos(a)
        y += math.sin(a)
        c.p(x, y, tons[1])
        if i % 2 == 0 and t < 0.95:
            fl = folhinha * (1 - t * 0.8) + 0.6
            for lado in (-1, 1):
                aa = a + lado * 1.05
                for s in range(1, int(fl) + 1):
                    k = 0.75 - s / (fl + 1) * 0.3 - t * 0.2 + (0.12 if lado < 0 else -0.08)
                    c.p(x + math.cos(aa) * s, y + math.sin(aa) * s, tons_idx(tons, k))


def bancada(c: Camada, x0: int, x1: int, yt: int, yp: int, seed: int) -> None:
    """Bancada de ripas: tampo de tábuas visto de cima, testeira, pés de caibro, travessa e a prateleira de baixo."""
    veio = ruido(seed, 13, 1)
    for y in range(yt - 4, yt):
        for x in range(x0 + 1, x1):
            ripa = (y - (yt - 4))
            k = 0.62 + (veio[y, x] - 0.5) * 0.3 + (hash01(x // 17, ripa, seed) - 0.5) * 0.12 - 0.05 * (3 - ripa)
            if ripa == 1 and (x * 3 + seed) % 29 < 1:
                k = 0.15  # fresta entre as ripas
            c.p(x, y, tons_idx(MADEIRA_GASTA, k))
    c.ret(x0 + 1, yt - 4, x1 - x0 - 1, 1, MADEIRA_GASTA[1])
    c.ret(x0, yt, x1 - x0 + 1, 1, MADEIRA_GASTA[5])
    for y in range(yt + 1, yt + 4):
        for x in range(x0, x1 + 1):
            k = 0.5 + (veio[y, x] - 0.5) * 0.35 - (y - yt) * 0.07
            c.p(x, y, tons_idx(MADEIRA_GASTA, k))
    c.ret(x0, yt + 4, x1 - x0 + 1, 1, MADEIRA_GASTA[0])
    # pregos na testeira
    for x in range(x0 + 4, x1, 16):
        c.p(x, yt + 2, FERRO[4])
    # pés (caibros) e travessa
    for lx in (x0 + 2, x1 - 4, (x0 + x1) // 2 - 1):
        for y in range(yt + 5, yp):
            c.p(lx, y, MADEIRA_GASTA[4])
            c.p(lx + 1, y, MADEIRA_GASTA[3])
            c.p(lx + 2, y, MADEIRA_GASTA[1])
    # prateleira de baixo (ripas mais escuras, em sombra)
    ys = yp - 12
    for y in range(ys - 2, ys + 1):
        for x in range(x0 + 2, x1 - 1):
            c.p(x, y, tons_idx(MADEIRA_GASTA, 0.38 + (y - ys + 2) * 0.08 + (veio[y, x] - 0.5) * 0.2))
    c.ret(x0 + 2, ys + 1, x1 - x0 - 3, 1, MADEIRA_GASTA[0])
    # mão-francesa em diagonal entre o pé e o tampo
    c.linha(x0 + 4, yt + 12, x0 + 12, yt + 5, MADEIRA_GASTA[2])
    c.linha(x1 - 5, yt + 12, x1 - 13, yt + 5, MADEIRA_GASTA[2])


# ─────────────────────────────── Esquerda (calma): muro, prateleira, ferramentas, sacos ───────────────────────────────
def lado_esquerdo() -> Camada:
    c = Camada()
    # Prateleira de tábuas presa ao muro por mãos-francesas de ferro, com mudas, potes de sementes e bandejas.
    for (sy, x0, x1) in ((60, 14, 112), (86, 10, 104)):
        c.ret(x0, sy, x1 - x0, 2, MADEIRA[4])
        c.ret(x0, sy, x1 - x0, 1, MADEIRA[5])
        c.ret(x0, sy + 2, x1 - x0, 1, MADEIRA[1])
        for bx in (x0 + 6, x1 - 8):
            c.linha(bx, sy + 3, bx + 5, sy + 8, FERRO[3])
            c.ret(bx, sy + 3, 1, 6, FERRO[2])
    g = np.random.default_rng(301)
    # prateleira de cima: vasinhos com mudas
    for k, x in enumerate((20, 31, 42, 54)):
        topo = vaso(c, x, 60, 8, 7, 310 + k)
        for j in range(2 + k % 2):
            folha(c, x, topo, -math.pi / 2 + (j - 0.8) * 0.8, 4 + k % 3, 1.1, FOLHA[1:6])
    # potes de vidro com sementes (vidro com reflexo e tampa de rolha)
    for k, (x, cor) in enumerate(((66, "#8a6a3a"), (74, "#5a4a2a"), (82, "#a88a4a"))):
        c.ret(x, 52, 6, 8, "#8aa0a0", 0.35)
        c.ret(x + 1, 55, 4, 5, cor)
        c.ret(x + 1, 55, 4, 1, mistura(cor, "#ffffff", 0.25))
        c.ret(x, 51, 6, 1, MADEIRA[5])
        c.p(x, 53, "#ffffff", 0.45)
        c.p(x, 54, "#ffffff", 0.3)
    # novelo de barbante e tesoura de poda deitada
    c.elipse(96, 57, 4, 3, "#a89068")
    for j in range(5):
        c.linha(93, 55 + j, 99, 56 + j * 0.6, "#7a6448", 0.5)
    c.p(95, 55, "#cab38a")
    # prateleira de baixo: bandeja de sementeira, pilha de vasos virados, regador velho de zinco
    for x in range(14, 46):
        for y in range(80, 86):
            k = 0.45 + (0.2 if y == 80 else 0) - (0.2 if x in (14, 45) else 0)
            c.p(x, y, tons_idx(MADEIRA_GASTA, k))
    for x in range(16, 44, 3):
        c.p(x, 79, FOLHA[4])
        c.p(x + 1, 78, FOLHA[5])
        c.p(x, 78, FOLHA[3])
    for k in range(4):
        topo_x = 54
        yb = 86 - k * 3
        for x in range(topo_x - 5 + k // 2, topo_x + 6 - k // 2):
            u = (x - topo_x) / 6
            c.p(x, yb - 1, tons_idx(BARRO, 0.6 - abs(u + 0.3) * 0.5))
            c.p(x, yb - 2, tons_idx(BARRO, 0.75 - abs(u + 0.3) * 0.5))
            c.p(x, yb - 3, BARRO[1])
    for y in range(76, 86):
        for x in range(68, 84):
            u = (x - 76) / 8
            k = 0.62 - abs(u + 0.3) * 0.55
            c.p(x, y, tons_idx(["#2a3032", "#3e4648", "#56605e", "#707a76", "#8e9690"], k))
    c.ret(68, 76, 16, 1, "#8e9690")
    c.linha(68, 80, 60, 72, "#56605e")
    c.linha(68, 81, 60, 73, "#2a3032")
    c.ret(58, 71, 3, 2, "#707a76")
    for k in range(9):
        a_ = k / 8 * math.pi
        c.p(76 + math.cos(a_) * 6, 76 - math.sin(a_) * 5, "#56605e")
    # Ervas secando de cabeça para baixo no barrote do forro.
    c.ret(8, 22, 120, 1, MADEIRA[3])
    c.ret(8, 23, 120, 1, MADEIRA[1])
    for k, (x, cor) in enumerate(((22, "#6a6a3e"), (40, "#7a5a6a"), (60, "#5e6e44"), (80, "#8a7a4a"), (102, "#6a5a7a"))):
        c.linha(x, 23, x, 27, "#b8a078")
        for j in range(12):
            for s in range(-2, 3):
                if hash01(k, j, s) > 0.35 + abs(s) * 0.12:
                    c.p(x + s + (j // 5) * (1 if s > 0 else -1) * 0.5, 28 + j, mistura(cor, "#000000", 0.15 * (j % 3)))
        c.ret(x - 1, 27, 3, 1, "#a8884a")
    # Ripa de ferramentas no muro: pá, ancinho, enxada, tesoura de poda e colher de jardineiro.
    c.ret(118, 44, 72, 3, MADEIRA[4])
    c.ret(118, 44, 72, 1, MADEIRA[6])
    c.ret(118, 47, 72, 1, MADEIRA[1])
    for x in range(124, 190, 14):
        c.ret(x, 46, 2, 2, MADEIRA[2])
        c.p(x, 46, MADEIRA[5])
    # pá: cabo com empunhadura em D e lâmina de ferro
    c.ret(126, 34, 2, 46, MADEIRA[5])
    c.ret(127, 34, 1, 46, MADEIRA[3])
    for k in range(10):
        a_ = k / 9 * math.pi
        c.p(127 + math.cos(a_) * 3, 34 - math.sin(a_) * 4, MADEIRA[5])
    for y in range(80, 96):
        t = (y - 80) / 16
        meia = 3.5 + t * 1.5 - (2.5 * (t - 0.8) / 0.2 if t > 0.8 else 0)
        for x in range(int(127 - meia), int(127 + meia) + 1):
            u = (x - 127) / max(meia, 1)
            c.p(x, y, tons_idx(FERRO, 0.7 - abs(u + 0.3) * 0.6))
    c.ret(126, 80, 3, 1, FERRO[5])
    # ancinho de cabeça para baixo (dentes para cima)
    c.ret(141, 40, 2, 56, MADEIRA[4])
    c.ret(142, 40, 1, 56, MADEIRA[2])
    c.ret(134, 38, 16, 2, FERRO[3])
    c.ret(134, 38, 16, 1, FERRO[4])
    for x in range(134, 150, 2):
        c.ret(x, 33, 1, 5, FERRO[4])
    # enxada
    c.ret(156, 44, 2, 52, MADEIRA[5])
    c.ret(157, 44, 1, 52, MADEIRA[3])
    c.poligono([(151, 38), (162, 38), (160, 44), (153, 44)], FERRO[3])
    c.ret(151, 38, 11, 1, FERRO[5])
    # tesoura de poda (duas lâminas e cabos vermelhos gastos) e colher de jardineiro
    c.linha(170, 48, 176, 60, "#6a2a22")
    c.linha(171, 48, 177, 60, "#8a3a2a")
    c.linha(178, 48, 174, 60, "#6a2a22")
    c.linha(175, 60, 172, 68, FERRO[5])
    c.linha(174, 60, 177, 68, FERRO[4])
    c.p(175, 60, LATAO[4])
    c.ret(184, 48, 2, 9, MADEIRA[5])
    c.poligono([(182, 57), (188, 57), (187, 66), (185, 69), (183, 66)], FERRO[4])
    c.linha(185, 58, 185, 66, FERRO[2])
    # rolo de corda pendurado
    for k in range(3):
        for j in range(24):
            a_ = j / 24 * math.tau
            c.p(166 + math.cos(a_) * (5 - k * 0.8), 80 + math.sin(a_) * (7 - k * 0.6), "#5a4a32" if math.sin(a_) > 0.2 else "#7e6a48")
    # Sacos de terra de juta no chão (um aberto, com a terra transbordando) e o carrinho de mão.
    juta_n = ruido(320, 2)
    for (sx, sw, sh, aberto) in ((14, 30, 22, False), (38, 26, 18, True), (6, 20, 12, False)):
        yb = 150 if sx != 6 else 154
        for y in range(yb - sh, yb):
            t = (y - yb + sh) / sh
            meia = sw / 2 * (0.82 + 0.18 * math.sin(min(1, t * 1.6) * math.pi / 2))
            cxs = sx + sw / 2
            for x in range(int(cxs - meia), int(cxs + meia) + 1):
                u = (x - cxs) / meia
                k = 0.6 - abs(u + 0.3) * 0.5 - t * 0.12 + (0.06 if (x + y) % 2 else -0.04) + (juta_n[y, x] - 0.5) * 0.15
                c.p(x, y, tons_idx(JUTA, k))
            if aberto and t < 0.2:
                for x in range(int(cxs - meia + 2), int(cxs + meia - 1)):
                    c.p(x, y, tons_idx(TERRA, 0.3 + hash01(x, y) * 0.6))
        if not aberto:
            c.ret(sx + sw / 2 - 3, yb - sh - 2, 6, 2, JUTA[3])
            c.ret(sx + sw / 2 - 1, yb - sh - 3, 2, 2, "#c8a870")   # o amarrado
        c.linha(sx + 4, yb - sh // 2, sx + sw - 4, yb - sh // 2, JUTA[1], 0.6)   # costura
    c.elipse(58, 150, 8, 2.5, TERRA[2])
    c.elipse(56, 149, 5, 1.5, TERRA[3])
    # carrinho de mão de madeira (caçamba, roda raiada, pés e braços)
    bx0, bx1, by0, by1 = 98, 150, 126, 140
    for y in range(by0, by1):
        t = (y - by0) / (by1 - by0)
        xa, xb = bx0 + t * 6, bx1 - t * 10
        for x in range(int(xa), int(xb) + 1):
            tab = (y - by0) // 4
            k = 0.5 + (hash01(tab, 3, 91) - 0.5) * 0.2 - 0.1 * t + (0.15 if (y - by0) % 4 == 0 else 0)
            c.p(x, y, tons_idx(MADEIRA_GASTA, k))
    c.ret(bx0 - 1, by0 - 1, bx1 - bx0 + 2, 1, MADEIRA_GASTA[5])
    for x in range(bx0 + 2, bx1 - 2):     # terra e um vasinho dentro da caçamba
        c.p(x, by0, TERRA[3] if hash01(x, 92) > 0.3 else TERRA[4])
    c.linha(bx1 - 12, by1, bx1 + 18, by1 + 6, MADEIRA_GASTA[4])
    c.linha(bx1 - 12, by1 + 1, bx1 + 18, by1 + 7, MADEIRA_GASTA[2])
    c.linha(bx0 + 4, by1, bx0 + 2, 150, MADEIRA_GASTA[3])
    c.linha(bx0 + 12, by1, bx0 + 12, 150, MADEIRA_GASTA[3])
    wx, wy = 92.0, 143.0
    for y in range(int(wy) - 8, int(wy) + 9):
        for x in range(int(wx) - 8, int(wx) + 9):
            d = math.hypot(x + 0.5 - wx, y + 0.5 - wy)
            ang = math.atan2(y - wy, x - wx)
            if 6.4 < d < 8:
                c.p(x, y, FERRO[3] if ang < 0 else FERRO[1])
            elif 5.4 < d <= 6.4:
                c.p(x, y, MADEIRA_GASTA[3])
            elif d < 5.4 and abs(math.sin(ang * 3)) < 0.2:
                c.p(x, y, MADEIRA_GASTA[2])
            elif d < 1.5:
                c.p(x, y, FERRO[4])
    c.linha(wx, wy, bx0 + 2, by1 - 2, MADEIRA_GASTA[2])
    # pilha de vasos vazios encaixados, junto da coluna
    # (dois vasos de boca para baixo no chão, um terceiro por cima e um caído de lado)
    for (cx_, yb_, w_, h_) in ((170, 151, 11, 9), (182, 151, 11, 9), (176, 142, 10, 8)):
        for y in range(yb_ - h_, yb_):
            t = (y - yb_ + h_) / h_
            meia = w_ / 2 * (0.72 + 0.28 * t)
            for x in range(int(cx_ - meia), int(cx_ + meia) + 1):
                u = (x + 0.5 - cx_) / meia
                k = 0.66 - abs(u + 0.32) * 0.6 - (0.25 if y >= yb_ - 2 else 0) + (0.12 if y == yb_ - 2 else 0)
                c.p(x, y, tons_idx(BARRO, k))
        c.ret(cx_ - 1, yb_ - h_, 2, 1, BARRO[0])   # o furo do fundo
    for y in range(144, 151):
        for x in range(150, 160):
            d = math.hypot((x - 155) / 5, (y - 147.5) / 3.5)
            if d < 1:
                c.p(x, y, tons_idx(BARRO, 0.7 - d * 0.5 - (x - 150) * 0.02))
    c.elipse(149.5, 147.5, 1.4, 3.4, TERRA[1])
    return c


# ─────────────────────────────── Centro e direita ───────────────────────────────
BANCA_A = (206, 326, 104, 147)   # x0, x1, topo, pé
BANCA_B = (388, 479, 101, 146)


def bancada_estagios() -> tuple[Camada, Camada]:
    """A bancada principal e a fileira dos cinco estágios. Devolve (bancada, plantas e vasos)."""
    b, o = Camada(), Camada()
    x0, x1, yt, yp = BANCA_A
    bancada(b, x0, x1, yt, yp, 401)
    yb = yt - 2
    xs = (220, 243, 266, 289, 312)
    # 1. só terra e a semente aparecendo
    topo = vaso(o, xs[0], yb, 13, 11, 410)
    for (dx, dy, cor) in ((-2, -1, "#7a5a30"), (-1, -1, "#b8925a"), (-2, -2, "#a07a44"), (-1, -2, "#e0c088"),
                          (0, -1, "#f0e8d0"), (1, 0, "#f0e8d0")):   # a semente rachando, com a radícula branca
        o.p(xs[0] + dx, topo + dy, cor)
    o.p(xs[0] + 3, topo, TERRA[4])
    o.p(xs[0] - 4, topo, TERRA[4])
    etiqueta(o, xs[0] + 3, topo - 6)
    # 2. broto: caule curvado e dois cotilédones
    topo = vaso(o, xs[1], yb, 13, 11, 420)
    caule(o, [(xs[1], topo), (xs[1], topo - 3), (xs[1] + 1, topo - 5)], FOLHA[5])
    for (dx, dy) in ((-2, -6), (-1, -6), (-1, -7), (2, -6), (3, -6), (2, -7)):
        o.p(xs[1] + dx, topo + dy, FOLHA[6] if dy == -7 else FOLHA[5])
    o.p(xs[1] - 2, topo - 7, FOLHA[7])
    etiqueta(o, xs[1] + 4, topo - 6)
    # 3. muda: haste com quatro folhas
    topo = vaso(o, xs[2], yb, 13, 11, 430)
    caule(o, [(xs[2], topo), (xs[2], topo - 10)], FOLHA[4])
    for (yy, lado, cmp) in ((topo - 4, -1, 5), (topo - 6, 1, 5), (topo - 8, -1, 4), (topo - 10, 1, 3)):
        folha(o, xs[2], yy, -math.pi / 2 + lado * 1.0, cmp, 1.4, FOLHA[2:])
    etiqueta(o, xs[2] + 4, topo - 6)
    # 4. planta nova: moita com folhas largas
    topo = vaso(o, xs[3], yb, 14, 12, 440)
    g = np.random.default_rng(441)
    for k in range(11):
        ang = -math.pi / 2 + (k / 10 - 0.5) * 2.4 + (g.random() - 0.5) * 0.3
        folha(o, xs[3] + (g.random() - 0.5) * 3, topo, ang, 7 + g.random() * 6, 1.9, FOLHA[1:])
    etiqueta(o, xs[3] + 5, topo - 6)
    # 5. planta florida: alta, cheia, com flores douradas e botões
    topo = vaso(o, xs[4], yb, 15, 13, 450)
    g = np.random.default_rng(451)
    for k in range(16):
        ang = -math.pi / 2 + (k / 15 - 0.5) * 2.7 + (g.random() - 0.5) * 0.3
        folha(o, xs[4] + (g.random() - 0.5) * 4, topo - 1, ang, 9 + g.random() * 9, 2.1, FOLHA)
    for k in range(5):
        caule(o, [(xs[4] + (k - 2) * 2, topo - 4), (xs[4] + (k - 2) * 4, topo - 20 - (k % 2) * 4)], FOLHA[3])
    for (dx, dy) in ((-8, -21), (-3, -26), (2, -24), (7, -21), (-1, -18), (10, -15), (-10, -15), (5, -29)):
        flor(o, xs[4] + dx, topo + dy, OURO if (dx + dy) % 3 else "#f0a8a0", "#8a3a1a")
    etiqueta(o, xs[4] + 6, topo - 6)
    # gotas de água e um pouco de terra sobre o tampo, a pazinha deitada
    for x in (232, 254, 279, 301):
        b.p(x, yt - 1, "#9ab8c8", 0.6)
    b.ret(212, yt - 2, 1, 1, TERRA[3])
    b.linha(318, yt - 2, 324, yt - 3, MADEIRA[5])
    b.ret(312, yt - 3, 6, 2, FERRO[4])
    b.p(312, yt - 3, FERRO[5])
    # Embaixo: bandeja de sementeira, saco de adubo e vasos empilhados de lado.
    ys = yp - 12
    for x in range(214, 246):
        for y in range(ys - 6, ys - 2):
            b.p(x, y, tons_idx(MADEIRA_GASTA, 0.35 + (0.2 if y == ys - 6 else 0)))
    for x in range(216, 244, 3):
        b.p(x, ys - 7, FOLHA[3])
        b.p(x + 1, ys - 8, FOLHA[4])
    for y in range(ys - 14, ys - 2):
        t = (y - ys + 14) / 12
        for x in range(254, 278):
            k = 0.5 - abs((x - 266) / 12 + 0.3) * 0.4 + ((x + y) % 2) * 0.05 - t * 0.1
            b.p(x, y, tons_idx(JUTA, k))
    b.ret(262, ys - 15, 7, 2, JUTA[2])
    for k in range(3):
        cx = 292 + k * 10
        for y in range(ys - 8, ys - 2):
            for x in range(cx - 4, cx + 5):
                u = (x - cx) / 4.5
                b.p(x, y, tons_idx(BARRO, 0.55 - abs(u + 0.2) * 0.5 - (y - ys + 8) * 0.03))
        b.elipse(cx - 4, ys - 5, 1.2, 3, BARRO[1])
    return b, o


def bancada_regador() -> tuple[Camada, Camada, Camada]:
    """A bancada da direita: regador de latão, ampulheta, vela e a suculenta de folhas em osso.
    Devolve (bancada, objetos, chama)."""
    b, o, e = Camada(), Camada(), Camada()
    x0, x1, yt, yp = BANCA_B
    bancada(b, x0, x1, yt, yp, 501)
    yb = yt - 2
    # ── O regador de latão: corpo oval, costuras, alça em arco, bico longo com o crivo.
    cx, cy0, cy1 = 408.0, yb - 15, yb
    for y in range(int(cy0), int(cy1)):
        t = (y - cy0) / (cy1 - cy0)
        meia = 9.5 - 1.2 * (t - 0.55) ** 2 * 4 + (0.6 if t > 0.88 else 0)
        for x in range(int(cx - meia), int(cx + meia) + 1):
            u = (x + 0.5 - cx) / meia
            k = 0.78 - abs(u + 0.38) * 0.72 + (hash01(x, y, 61) - 0.5) * 0.06
            cor = tons_idx(LATAO, k)
            if int(y - cy0) in (3, int(cy1 - cy0) - 3):
                cor = tons_idx(LATAO, k - 0.22)       # costura
            elif int(y - cy0) in (4, int(cy1 - cy0) - 2):
                cor = tons_idx(LATAO, k + 0.12)
            if hash01(x, y, 62) < 0.05 and abs(u) > 0.4:
                cor = mistura(cor, "#4e8a6a", 0.55)  # verdete
            o.p(x, y, cor)
    # boca e tampa
    o.ret(cx - 5, cy0 - 1, 10, 1, LATAO[5])
    o.ret(cx - 4, cy0 - 2, 8, 1, LATAO[3])
    o.ret(cx - 3, cy0 - 2, 3, 1, LATAO[1])
    # amassado
    o.p(cx + 4, cy0 + 8, LATAO[2])
    o.p(cx + 5, cy0 + 8, LATAO[1])
    # alça em arco por cima
    for k in range(26):
        a_ = k / 25 * math.pi
        x = cx + 2 + math.cos(a_) * 7.5
        y = cy0 + 1 - math.sin(a_) * 7
        o.p(x, y, LATAO[5] if a_ > math.pi / 2 else LATAO[3])
        o.p(x, y + 1, LATAO[1])
    # bico: tubo afunilado saindo de baixo para a esquerda e para cima
    bx0_, by0_, bx1_, by1_ = cx - 8, cy1 - 4, cx - 22, cy0 - 4
    for i in range(30):
        t = i / 29
        x = bx0_ + (bx1_ - bx0_) * t
        y = by0_ + (by1_ - by0_) * t
        r = 1.6 - 0.8 * t
        for j in range(-2, 3):
            if abs(j) <= r + 0.2:
                o.p(x + j * 0.5, y + j * 0.85, LATAO[5] if j < 0 else LATAO[3] if j == 0 else LATAO[1])
    # o crivo (rosa do regador): disco furadinho visto de lado
    rx, ry = bx1_ - 1, by1_ - 1
    for j in range(-3, 4):
        o.p(rx + j * 0.4, ry + j, LATAO[4] if j < 1 else LATAO[2])
        o.p(rx - 1 + j * 0.4, ry + j, LATAO[2] if j % 2 else LATAO[0])
    o.p(rx + 1, ry - 1, LATAO[6])
    # gotinhas pingando do crivo
    for (dx, dy) in ((-2, 5), (-3, 8)):
        o.p(rx + dx, ry + dy, "#bcd8e8", 0.7)
    # ── A ampulheta: tampas de latão torneado, três colunas, vidro e areia dourada caindo.
    hx, hy0, hy1 = 431.0, yb - 18, yb
    o.ret(hx - 5, hy1 - 2, 11, 2, LATAO[3])
    o.ret(hx - 5, hy1 - 2, 11, 1, LATAO[5])
    o.ret(hx - 5, hy0, 11, 2, LATAO[4])
    o.ret(hx - 5, hy0 + 1, 11, 1, LATAO[2])
    o.ret(hx - 4, hy0 - 1, 9, 1, LATAO[5])
    for px_ in (hx - 4, hx + 4):
        o.ret(px_, hy0 + 2, 1, hy1 - hy0 - 4, LATAO[2])
        o.p(px_, hy0 + 8, LATAO[5])
    meio = (hy0 + hy1) / 2
    for y in range(int(hy0) + 2, int(hy1) - 2):
        d = abs(y + 0.5 - meio)
        meia = 0.6 + d * 0.42
        for x in range(int(hx - meia), int(hx + meia) + 1):
            o.p(x, y, "#c8dce4", 0.35)
        o.p(hx - meia, y, "#ffffff", 0.5)
        if y > meio + 2:
            areia = (y - meio - 2) / (hy1 - 2 - meio - 2)
            for x in range(int(hx - meia * min(1, areia * 1.4 + 0.2)), int(hx + meia * min(1, areia * 1.4 + 0.2)) + 1):
                o.p(x, y, tons_idx(["#a8782a", "#c8963c", OURO, "#f2d488"], 0.4 + 0.4 * ((x + y) % 3 == 0)))
        elif hy0 + 4 < y < meio - 1:
            cheia = (y - hy0 - 4) / (meio - hy0 - 5)
            if cheia > 0.45:
                for x in range(int(hx - meia + 0.6), int(hx + meia) + 1):
                    o.p(x, y, tons_idx(["#a8782a", "#c8963c", OURO], 0.3 + 0.5 * ((x + y) % 2)))
    for y in range(int(meio) - 1, int(meio) + 6):
        o.p(hx, y, "#f2d488")
    # ── Castiçal de latão com a vela (acesa à tarde e à noite).
    vx, vy = int(VELA[0]), int(VELA[1])
    o.ret(vx - 4, yb - 1, 9, 1, LATAO[3])
    o.ret(vx - 3, yb - 2, 7, 1, LATAO[5])
    o.ret(vx - 1, yb - 4, 3, 2, LATAO[4])
    for k in range(8):
        a_ = k / 7 * math.pi
        o.p(vx + 5 + math.cos(a_) * 1.6, yb - 2 - math.sin(a_) * 1.8, LATAO[4])
    for y in range(vy + 2, yb - 4):
        o.p(vx - 1, y, CERA[3])
        o.p(vx, y, CERA[2])
        o.p(vx + 1, y, CERA[1])
    o.p(vx + 1, vy + 4, CERA[2])
    o.p(vx + 2, vy + 5, CERA[1])   # pingo de cera
    o.p(vx, vy + 1, "#2a1a10")      # pavio
    for (dx, dy, cor) in ((0, 0, "#fff6d0"), (0, -1, "#ffe08a"), (0, -2, "#ffa448"), (0, 1, "#ffd070"),
                          (-1, 0, "#ff9a3a"), (1, 0, "#ff9a3a")):
        e.p(vx + dx, vy + dy, cor, 0.55 if dx else 1)
    # ── Suculenta de folhas em forma de osso (aceno discreto), num vaso baixo.
    sx = 466
    topo = vaso(o, sx, yb, 14, 9, 470)
    osso = ["#24402f", "#365a44", "#4e765a", "#6a9270"]
    for k, (ang, comp) in enumerate(((-2.0, 9), (-1.55, 11), (-1.15, 8), (-2.45, 6), (-0.75, 6))):
        ux, uy = math.cos(ang), math.sin(ang)
        x0_, y0_ = sx + (k - 2) * 1.2, topo
        for s in range(comp):
            o.p(x0_ + ux * s, y0_ + uy * s, osso[1] if s % 3 else osso[2])
            o.p(x0_ + ux * s + 1, y0_ + uy * s, osso[0])
        ex_, ey_ = x0_ + ux * comp, y0_ + uy * comp
        # a ponta com dois nós (como a epífise de um osso estilizado)
        for (dx, dy) in ((-1, 0), (1, 0), (-1, -1), (1, -1)):
            o.p(ex_ + dx * 1.2 - uy * 0, ey_ + dy, osso[2] if dy else osso[3])
        o.p(ex_, ey_, osso[1])
    etiqueta(o, sx + 5, topo - 5, 5)
    # pacotinhos de sementes de papel (sem texto) e a colher de muda
    for (px_, cor) in ((452, "#d8c8a0"), (455, "#c8b080")):
        o.ret(px_, yb - 6, 5, 6, cor)
        o.ret(px_, yb - 6, 5, 1, mistura(cor, "#ffffff", 0.3))
        o.ret(px_ + 1, yb - 4, 3, 2, "#7a8a4a", 0.6)
    # Embaixo: caixote de sementes, saco de terra e um regador velho de zinco.
    ys = yp - 12
    for y in range(ys - 10, ys - 2):
        for x in range(394, 420):
            k = 0.42 + (0.18 if (y - ys + 10) % 4 == 0 else 0) - (0.2 if x in (394, 419) else 0)
            b.p(x, y, tons_idx(MADEIRA_GASTA, k))
    for x in range(396, 418, 2):
        b.p(x, ys - 11, FOLHA[3 + x % 3])
    for y in range(ys - 13, ys - 2):
        for x in range(426, 448):
            k = 0.5 - abs((x - 437) / 11 + 0.3) * 0.4 + ((x + y) % 2) * 0.05
            b.p(x, y, tons_idx(JUTA, k))
    b.ret(434, ys - 14, 6, 2, JUTA[2])
    return b, o, e


def tina() -> tuple[Camada, np.ndarray]:
    """Tina de madeira com aros de ferro, cheia d'água. Devolve (camada, máscara da superfície da água)."""
    c = Camada()
    cx, cy, rx, ry = 258.0, 136.0, 30.0, 4.5
    yb = 152
    # aduelas: corpo levemente abaulado
    for y in range(int(cy), yb):
        t = (y - cy) / (yb - cy)
        meia = rx - 1.5 * t + 0.8 * math.sin(t * math.pi)
        for x in range(int(cx - meia), int(cx + meia) + 1):
            u = (x + 0.5 - cx) / meia
            ad = int((math.asin(np.clip(u, -1, 1)) + 1.6) * 6)
            k = 0.62 - abs(u + 0.3) * 0.5 + (hash01(ad, 77) - 0.5) * 0.15 - t * 0.1
            if abs((math.asin(np.clip(u, -1, 1)) + 1.6) * 6 - ad) < 0.12:
                k = 0.12
            cor = tons_idx(MADEIRA_GASTA, k)
            if t > 0.75 and hash01(x, y, 78) < 0.3:
                cor = mistura(cor, "#2e4a24", 0.5)
            c.p(x, y, cor)
        # escorre um pouco de água pela aduela
    for (ya, ) in ((cy + 3,), (yb - 4,)):
        t = (ya - cy) / (yb - cy)
        meia = rx - 1.5 * t + 0.8 * math.sin(t * math.pi)
        for x in range(int(cx - meia), int(cx + meia) + 1):
            u = (x - cx) / meia
            c.p(x, ya, tons_idx(FERRO, 0.75 - abs(u + 0.3) * 0.6))
            c.p(x, ya + 1, FERRO[1])
        c.p(cx - meia * 0.6, ya, LATAO[4])
    # borda (aro de cima) e a superfície da água
    agua = np.zeros((H, W), dtype=np.float32)
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry)
            dy = (y + 0.5 - cy)
            if d < 0.84:
                agua[y, x] = 1
            elif d < 0.95:
                c.p(x, y, "#0e1c1e" if dy < 0 else MADEIRA_GASTA[1])      # a parede de dentro, em sombra
            elif d < 1.14:
                c.p(x, y, MADEIRA_GASTA[5] if dy > 0.5 else MADEIRA_GASTA[4] if dy > -1.5 else MADEIRA_GASTA[3])
    c.mascara(agua, "#203a3e")
    # um regadorzinho de zinco mergulhado e uma folha boiando
    c.p(cx + 10, cy - 1, FOLHA[5])
    c.p(cx + 11, cy - 1, FOLHA[4])
    c.p(cx + 12, cy, FOLHA[3])
    # concha de lata pendurada na borda
    c.linha(cx - 22, cy - 3, cx - 26, cy - 9, MADEIRA[5])
    c.ret(cx - 23, cy - 3, 4, 3, "#707a76")
    c.ret(cx - 23, cy - 3, 4, 1, "#a8b0aa")
    return c, agua


def viga_e_pendurados() -> tuple[Camada, Camada, Camada, Camada]:
    """A viga treliçada de ferro (o poleiro), a lanterna, as cestas de samambaia e a trepadeira.
    Devolve (viga, pendurados, trepadeira, chama da lanterna)."""
    c, tr, e = Camada(), Camada(), Camada()
    y0 = VIGA_Y
    # banzo de cima (o poleiro), banzo de baixo e a treliça em losangos entre eles
    for x in range(MURO_X - 4, W):
        c.p(x, y0, FERRO_VERDE[6])
        c.p(x, y0 + 1, FERRO_VERDE[4])
        c.p(x, y0 + 2, FERRO_VERDE[2])
        c.p(x, y0 + 8, FERRO_VERDE[5])
        c.p(x, y0 + 9, FERRO_VERDE[2])
        if x % 3 == 0:
            c.p(x, y0 + 1, LATAO[3] if x % 9 == 0 else FERRO_VERDE[5])   # rebites
        u = (x - MURO_X) % 8
        for (yy, cor) in ((y0 + 3 + abs(u - 4) * 0 + (u if u < 4 else 8 - u), FERRO_VERDE[4]),
                          (y0 + 7 - (u if u < 4 else 8 - u), FERRO_VERDE[3])):
            c.p(x, yy, cor)
    viga_c, c = c, Camada()
    # ── A lanterna pendurada: corrente, chapéu, quatro vidros com a chama, base e argola.
    lx, ly = int(LANTERNA[0]), int(LANTERNA[1])
    for y in range(y0 + 10, ly - 7):
        c.p(lx + (y % 2) * 0, y, FERRO[4] if y % 2 else FERRO[2])
        c.p(lx + 1, y, FERRO[1] if y % 2 else FERRO[3])
    c.ret(lx - 1, ly - 7, 4, 1, FERRO[4])
    for k in range(4):
        c.ret(lx - 1 - k, ly - 6 + k, 4 + 2 * k, 1, tons_idx(FERRO_VERDE, 0.7 - k * 0.12))
    c.ret(lx - 4, ly - 2, 10, 1, LATAO[4])
    # vidro com gradiente (claro no alto à esquerda, fumê embaixo) e a armação de ferro: dois montantes de canto,
    # um montante do meio só na metade de baixo (não esconde a chama) e o aro do meio
    for y in range(ly - 1, ly + 6):
        for x in range(lx - 3, lx + 5):
            if x in (lx - 3, lx + 4):
                c.p(x, y, FERRO_VERDE[4] if x == lx - 3 else FERRO_VERDE[1])
                continue
            t = (y - ly + 1) / 6
            u = (x - lx + 2) / 6
            c.p(x, y, mistura("#a8b8b0", "#2a3430", min(1, 0.2 + 0.55 * t + 0.35 * u)), 0.7)
            d = math.hypot(x - lx, (y - ly) * 1.2)
            e.p(x, y, mistura("#ffe2a0", "#b85a20", min(1, d / 4.0)), max(0.0, 0.42 - d * 0.08))
        c.p(lx - 2, y, "#ffffff", 0.45 if y < ly + 3 else 0.2)
    for y in range(ly + 2, ly + 6):
        c.p(lx + 2, y, FERRO_VERDE[2])
    c.ret(lx - 3, ly + 2, 8, 1, FERRO_VERDE[3])
    c.ret(lx - 4, ly + 6, 10, 1, LATAO[3])
    c.ret(lx - 3, ly + 7, 8, 1, FERRO_VERDE[2])
    c.ret(lx - 1, ly + 8, 4, 1, FERRO_VERDE[3])
    c.ret(lx - 1, ly + 3, 4, 2, CERA[2])  # toco de vela dentro
    c.ret(lx + 1, ly + 3, 1, 2, CERA[1])
    for (dx, dy, cor) in ((0, 0, "#fff6d0"), (0, -1, "#ffe08a"), (0, -2, "#ffa448"), (0, 1, "#ffd070"),
                          (1, 0, "#ffd070"), (1, -1, "#ffb860"), (-1, 0, "#ff9a3a")):
        e.p(lx + dx, ly + dy, cor, 0.6 if dx < 0 else 1)
    # ── Cestas de arame com samambaias, penduradas por três correntes.
    for (bx, prof) in ((246, 8), (348, 6)):
        by = y0 + 10 + prof
        for k in (-5, 0, 5):
            c.linha(bx + k, by, bx, y0 + 10, FERRO[3], 0.8)
        for x in range(bx - 6, bx + 7):
            for y in range(by, by + 5):
                t = (y - by) / 5
                if abs(x - bx) <= 6 - t * 3:
                    k = 0.4 + ((x + y) % 2) * 0.2
                    c.p(x, y, tons_idx(["#2a2014", "#4a3a20", "#6e5a34", "#8a7448"], k) if t < 0.5 else FERRO[2])
        c.ret(bx - 6, by, 13, 1, FERRO[4])
        g = np.random.default_rng(bx)
        for k in range(10):
            lado = -1 if k % 2 else 1
            abre = 0.25 + (k // 2) * 0.3 + (g.random() - 0.5) * 0.15
            ang = -math.pi / 2 + lado * abre
            fronde(c, bx + lado * (1 + k // 3), by, ang, 13 + g.random() * 10, FOLHA[1:], curva=lado * (0.1 + 0.03 * (k // 2)), folhinha=2.6)
    # ── Trepadeira: sobe pela coluna, corre um trecho da viga (sem tampar o poleiro) e desce pelo montante da direita.
    g = np.random.default_rng(611)
    caminho = [(MURO_X - 1 + 2 * math.sin(y / 5.0), y) for y in range(PISO_Y, TELHADO_Y, -1)]
    caminho += [(x, y0 + 2 + 1.5 * math.sin(x / 4.0)) for x in range(MURO_X, 312)]
    caminho += [(x, y0 + 2 + 1.5 * math.sin(x / 4.0)) for x in range(436, W)]
    caminho += [(458 + 1.5 * math.sin(y / 4.0), y) for y in range(y0 + 10, 99)]
    for i, (x, y) in enumerate(caminho):
        tr.p(x, y, "#3a4a22")
        if i % 3 == 0:
            ang = g.random() * math.tau
            if y < y0 + 4 and x > MURO_X + 2:
                ang = math.pi / 2 + (g.random() - 0.5) * 1.6   # na viga, as folhas pendem (o topo fica livre)
            folha(tr, x, y, ang, 3 + g.random() * 2.5, 1.3, FOLHA[1:7], nervura=False)
    # ramos pendentes da viga
    for bx in (212, 232, 270, 300, 446, 470):
        comp = 6 + int(hash01(bx, 3) * 14)
        for j in range(comp):
            x = bx + math.sin(j / 3.0) * 1.2
            tr.p(x, y0 + 3 + j, "#3a4a22")
            if j % 3 == 1:
                folha(tr, x, y0 + 3 + j, math.pi / 2 + (hash01(bx, j) - 0.5) * 2.4, 3, 1.2, FOLHA[1:7], nervura=False)
    return viga_c, c, tr, e


def primeiro_plano() -> Camada:
    """Folhas grandes e samambaias bem perto da câmera (desfocadas na montagem), fora da faixa do gato."""
    c = Camada()
    g = np.random.default_rng(701)
    # samambaia grande no canto de baixo à esquerda
    for k in range(9):
        ang = -math.pi / 2 + (k / 8 - 0.5) * 2.2
        fronde(c, 18 + k * 3, 162, ang, 30 + g.random() * 16, FOLHA_AZ, curva=0.03 * (1 if ang > -math.pi / 2 else -1), folhinha=4.5)
    # folhas largas (costela-de-adão simplificada, sem recortes demais) à esquerda
    for (x, y, ang, comp) in ((66, 164, -1.2, 26), (82, 166, -0.9, 22)):
        folha(c, x, y, ang, comp, 7, FOLHA[:6])
    # à direita: folhas de bananeira-de-jardim e samambaia entrando pela borda
    for (x, y, ang, comp, larg) in ((486, 168, -2.2, 40, 8), (474, 170, -1.9, 30, 6.5), (492, 140, -2.7, 30, 6)):
        folha(c, x, y, ang, comp, larg, FOLHA[:7])
    for k in range(5):
        fronde(c, 470, 165, -math.pi / 2 - 0.4 - k * 0.25, 26 + k * 3, FOLHA_AZ, curva=-0.03, folhinha=4)
    # ramo pendurado no alto à direita, vindo de fora do quadro
    for k in range(4):
        x0 = 452 + k * 8
        for j in range(16 + k * 4):
            c.p(x0 + math.sin(j / 4.0) * 2, j, "#2a3a1a")
            if j % 3 == 0:
                folha(c, x0 + math.sin(j / 4.0) * 2, j, math.pi / 2 + (hash01(k, j, 9) - 0.5) * 2, 6, 2.2, FOLHA[:6], nervura=False)
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
    c_chao = chao()
    c_esq = lado_esquerdo()
    ban_a, obj_a = bancada_estagios()
    ban_b, obj_b, e_vela = bancada_regador()
    c_tina, agua = tina()
    viga, pend, trep, e_lant = viga_e_pendurados()
    obj_a.contornar("#120a06", 0.55)
    obj_b.contornar("#120a06", 0.55)
    frente = primeiro_plano()
    return dict(est=est, chao=c_chao, esq=c_esq, ban_a=ban_a, obj_a=obj_a, ban_b=ban_b, obj_b=obj_b, e_vela=e_vela,
                tina=c_tina, agua=agua, viga=viga, pend=pend, trep=trep, e_lant=e_lant, frente=frente)


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    L = camadas()
    est = L["est"]
    rumo = per["rumo"]

    # ── Mapas de profundidade (z), de identidade (quem faz sombra em quem) e de orientação da superfície.
    py = _YS + 0.5
    zmap = np.where(py < TELHADO_Y, z_telhado(py), np.where(py < PISO_Y, ZB, z_chao(np.maximum(py, PISO_Y + 0.01)))).astype(np.float32)
    tipo = np.where(py < TELHADO_Y, 0, np.where(py < PISO_Y, 2, 1)).astype(np.int32)   # 0 telhado, 1 horizontal, 2 parede, 3 objeto
    pix_id = np.zeros((H, W), dtype=np.int32)
    oc_id = np.zeros((H, W), dtype=np.int32)
    z_oc = np.zeros((H, W), dtype=np.float32)
    # planos: (chave, camada, z, desfoque, id de sombra, tipo, faz sombra)
    planos = [
        ("est", est["c"], ZB, 0.35, 1, 2, False),
        ("chao", L["chao"], None, 0.25, 2, 1, False),
        ("esq", L["esq"], ZB - 0.08, 0.45, 3, 3, False),
        ("trep", L["trep"], ZB - 0.15, 0.1, 4, 3, False),
        ("ban_b", L["ban_b"], 0.21, 0.15, 5, 1, True),
        ("obj_b", L["obj_b"], 0.3, 0.0, 6, 3, True),
        ("ban_a", L["ban_a"], 0.2, 0.1, 7, 1, True),
        ("obj_a", L["obj_a"], 0.3, 0.0, 8, 3, True),
        ("viga", L["viga"], 0.4, 0.2, 11, 3, False),
        ("pend", L["pend"], 0.36, 0.2, 9, 3, True),
        ("tina", L["tina"], 0.11, 0.25, 10, 3, True),
    ]
    for (_, cam, z, _, ident, tp, sombra) in planos:
        a = cam.c[:, :, 3] > 0.5
        if z is not None:
            zmap = np.where(a, z, zmap)
        pix_id = np.where(a, ident, pix_id)
        tipo = np.where(a, tp, tipo)
        if sombra:
            oc_id = np.where(a, ident, oc_id)
            z_oc = np.where(a, z + (0.13 if tp == 1 else 0.02), z_oc)   # centro do objeto em profundidade
    # As bancadas: o tampo é horizontal, a testeira e os pés são verticais.
    for (x0, x1, yt, _) in (BANCA_A, BANCA_B):
        tampo = (L["ban_a"].c[:, :, 3] + L["ban_b"].c[:, :, 3] > 0.5) & (_YS >= yt - 4) & (_YS < yt) & (_XS >= x0) & (_XS <= x1)
        tipo = np.where(tampo, 1, np.where((tipo == 1) & np.isin(pix_id, (5, 7)) & ~tampo, 3, tipo))

    # ── Lá fora, através do vidro: nítido no vidro limpo, borrado e esbranquiçado no embaçado.
    fora = pintar_fora(nome, per)
    fora3 = ampliar(fora)
    emb3 = desfocar(ampliar(est["emb"][:, :, None]), 1.0)
    aberto3 = ampliar(est["aberto"][:, :, None])
    nitido = desfocar(fora3, 1.6)
    borrado = desfocar(fora3, 7)
    vid = nitido * (1 - emb3) + borrado * emb3
    vid = vid * (1 - aberto3) + desfocar(fora3, 0.8) * aberto3
    # o vidro velho é levemente verde e perde contraste; o embaçado acende com a luz de fora
    neb = hexa(per["nevoa"])
    lum_fora = desfocar(fora3.mean(2, keepdims=True), 10)
    fp3 = ampliar(est["fundo_painel"][:, :, None])
    nevoa_k = (emb3 * (0.45 + 0.35 * fp3) + 0.08) * (1 - aberto3)
    vid = vid * (1 - nevoa_k) + neb * (0.35 + 0.75 * lum_fora) * nevoa_k * per["nevoa_k"]
    tinta = hexa(per.get("tinta", "#edf7f2"))
    lum_v = vid.mean(2, keepdims=True)
    vid = lum_v + (vid - lum_v) * per.get("satur", 1.0)
    vid = vid * (tinta * (1 - aberto3) + aberto3)
    vid = vid * (ampliar(est["var"]) * (1 - aberto3) + aberto3)
    sujo3 = ampliar(est["sujo"][:, :, None])
    vid = vid * (1 - sujo3 * 0.5 * (0.4 + fp3)) + hexa("#6a6450") * sujo3 * 0.25 * fp3
    # reflexos diagonais fininhos no vidro
    reflexo = (np.sin((_GXS + _GYS * 0.7) / 9.0) > 0.985).astype(np.float32) * 0.035 * (ruido(95, 40, 20)[(_GYS // ESC).astype(int), (_GXS // ESC).astype(int)] > 0.5)
    vid += reflexo[:, :, None] * (1 - aberto3) * (0.4 if nome == "noite" else 1.0)
    vidro3 = ampliar(est["vidro"][:, :, None])
    # gotas de condensação: pontinhos escuros com brilho embaixo de cada painel
    g = np.random.default_rng(91)
    gotas = Camada()
    for _ in range(900):
        x, y = int(g.random() * W), int(g.random() * H)
        if est["vidro"][y, x] > 0 and est["fundo_painel"][y, x] > 0.5 + g.random() * 0.4 and est["aberto"][y, x] == 0:
            gotas.p(x, y, "#ffffff", 0.18 + 0.2 * g.random())
    img = vid * vidro3

    # ── Albedo, de trás para a frente, com profundidade de campo.
    solido = np.zeros(img.shape[:2], dtype=np.float32)
    for (chave, cam, _, raio, _, _, _) in planos:
        a = desfocar_rgba(ampliar(cam.c), raio)
        img = sobre(img, a)
        solido = np.maximum(solido, a[:, :, 3])
    # a água da tina: reflete o céu da hora (do vidro), com ondinhas
    agua3 = ampliar(L["agua"][:, :, None])
    onda = (np.sin(_GXS / 5.0 + np.sin(_GYS / 2.0) * 2) * 0.5 + 0.5)[:, :, None]
    refl = np.flip(desfocar(fora3, 4), 0)
    refl = np.roll(refl, -int(115 * ESC), 0)
    cor_agua = (refl * 0.72 + hexa("#1e4246") * 0.28) * (0.8 + 0.3 * onda)
    img = img * (1 - agua3) + cor_agua * agua3
    solido = solido * (1 - agua3[:, :, 0] * 0.6)

    # Sombras de contato: debaixo das bancadas, dos sacos, da tina, do carrinho e da pilha de vasos.
    ao = Camada()
    for (cx, cy, rx, ry, a) in ((266, 147, 64, 4, 0.75), (434, 146, 50, 4, 0.75), (258, 152, 32, 2.5, 0.8), (30, 150, 28, 3, 0.7),
                                (120, 150, 32, 3, 0.6), (176, 151, 10, 2, 0.6), (266, 128, 58, 16, 0.35), (434, 126, 46, 16, 0.4),
                                (100, 86, 100, 3, 0.25)):
        ao.elipse(cx, cy, rx, ry, "#000000", a)
    for x in range(W):
        ao.ret(x, PISO_Y, 1, 3, "#000000", 0.4)
    sombra_ao = desfocar_rgba(ampliar(ao.c), 4)
    frente_tina = desfocar(ampliar((L["tina"].c[:, :, 3:4] > 0.5).astype(np.float32)), 0.6)
    img = img * (1 - sombra_ao[:, :, 3:4] * (1 - frente_tina * 0.85))

    # ── O feixe: transmissão traçada em 3D (sombra do quadriculado de ferro) × sombra dos objetos (traçada em tela).
    z3 = ampliar(zmap[:, :, None])[:, :, 0]
    gx, gy = (_GXS + 0.5) / ESC, (_GYS + 0.5) / ESC
    X3, Y3 = mundo(gx, gy, z3)
    T = transmissao(X3, Y3, z3, rumo)
    oc_sup = ocluir_tela(oc_id, pix_id, rumo_na_tela(0.3, rumo), z_oc, zmap, rumo)
    T = T * desfocar(ampliar(oc_sup[:, :, None]), 1.0)[:, :, 0]
    T = desfocar(T[:, :, None], 0.9)[:, :, 0]
    # quanto cada superfície recebe (orientação): chão e tampos olham para cima, parede para a câmera
    lx, ly, lz = rumo
    nrm = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / nrm, ly / nrm, lz / nrm
    tipo3 = ampliar(tipo[:, :, None])[:, :, 0]
    rec = np.select([tipo3 == 1, tipo3 == 2, tipo3 == 3], [0.32 + 0.68 * ly, 0.15 + 0.85 * max(0.0, -lz) + 0.2 * abs(lx), 0.42 + 0.25 * ly + 0.3 * abs(lx)], 0.3)
    # o lado do texto (esquerda) fica de fora do sol: a luz direta some suavemente antes do muro
    calmo_sol = np.clip((_GXS / ESC - 165) / 80, 0.1, 1)
    T = T * calmo_sol

    # ── Luz: ambiente + céu que entra pelo vidro + sol traçado + chamas.
    amb = hexa(per["amb"]) * per["amb_k"]
    luz = np.zeros_like(img) + amb
    brilho_vidro = desfocar((vidro3 * lum_fora)[:, :, :1], 60)
    luz += brilho_vidro * hexa(per["vidro_luz"]) * per["vidro_k"] * 2.2
    luz += luz_pontual(360, 0, 160, 0.9)[:, :, None] * hexa(per["vidro_luz"]) * per["vidro_k"] * 0.5
    luz += luz_pontual(150, 70, 190, 0.8)[:, :, None] * hexa(per["vidro_luz"]) * per["vidro_k"] * 0.45
    sol = hexa(per["sol"]) * per["sol_k"]
    luz += (T * rec)[:, :, None] * sol * per.get("sol_sup", 1.0)
    # luz rebatida pela mancha de sol no chão e nos tampos (aquece as bancadas por baixo)
    rebat = desfocar((T * (tipo3 == 1))[:, :, None], 40)
    luz += rebat * sol * 0.9
    if per["lamp"] > 0:
        lx_, ly_ = LANTERNA
        poca = luz_de_chama(lx_, ly_ + 10, 150, 0.7, 3)[:, :, None] * hexa("#ff9a48") * 0.95
        miolo = luz_pontual(lx_, ly_ + 2, 26, 0.9)[:, :, None] * hexa("#ffd890") * 0.5
        # os vasos da bancada projetam sombra na mureta e no vidro
        sm = sombra_projetada((oc_id == 8) | (oc_id == 7), (lx_, ly_), 0.35)
        sm = desfocar(ampliar(sm[:, :, None]), 3)[:, :, 0] * (tipo3 == 2)
        luz += (poca + miolo) * per["lamp"] * (1 - sm * 0.75)[:, :, None]
        caixa = np.zeros((H, W), dtype=np.float32)
        caixa[int(LANTERNA[1]) - 2:int(LANTERNA[1]) + 7, int(LANTERNA[0]) - 4:int(LANTERNA[0]) + 6] = 1
        caixa3 = ampliar(caixa[:, :, None])
        luz = luz * (1 - 0.8 * caixa3) + (amb + 0.15) * 0.8 * caixa3
    if per["vela"] > 0:
        vx, vy = VELA
        sv = sombra_projetada((oc_id == 6), (vx, vy), 0.3)
        sv = desfocar(ampliar(sv[:, :, None]), 2)[:, :, 0] * (tipo3 != 3)
        luz += luz_de_chama(vx, vy, 70, 0.8, 5)[:, :, None] * hexa("#ff9a48") * 0.9 * per["vela"] * (1 - sv * 0.6)[:, :, None]
    luz = np.minimum(luz, 2.6)
    s = solido[:, :, None]
    img = img * (1 - s) + img * s * luz
    # o vidro também recebe um pouco da luz de dentro à noite (reflexo da lanterna)
    if per["lamp"] > 0:
        img += vidro3 * (1 - s) * luz_pontual(LANTERNA[0], LANTERNA[1], 70, 0.9)[:, :, None] * hexa("#ffb060") * 0.18 * per["lamp"]

    # ── Brilho de borda: o ferro fino contra o vidro claro "come" um pouco de luz (bleeding).
    claro = desfocar((vidro3 * (1 - s) * vid), 2.0)
    img += claro * s * per.get("sangra", 0.18) * (ampliar((tipo == 2)[:, :, None].astype(np.float32)) + 0.3)

    # ── Feixe volumétrico: quatro planos de ar traçados (a grade de ferro aparece no ar) com poeira e vapor.
    vol = np.zeros(img.shape[:2], dtype=np.float32)
    for zs in (0.08, 0.26, 0.44, 0.62):
        Xs, Ys = mundo(gx, gy, zs)
        dentro = (Ys > 0) & (Ys < YR) & (z3 > zs)
        Ts = transmissao(Xs, Ys, np.full_like(Xs, zs), rumo, fator=1.3) * dentro
        oc = ocluir_tela(oc_id, np.zeros_like(pix_id), rumo_na_tela(zs, rumo), z_oc, zs, rumo, passos=90)
        Ts = Ts * desfocar(ampliar(oc[:, :, None]), 1.5)[:, :, 0]
        vol += Ts
    vol = desfocar(vol[:, :, None], 1.6)[:, :, 0] / 4
    vol = np.power(np.clip(vol, 0, 1), 1.25) * calmo_sol
    densidade = 0.55 + 0.45 * desfocar(ampliar(ruido(93, 18, 8)[:, :, None]), 6)[:, :, 0]
    vapor = np.exp(-(((_GYS / ESC - 132) / 16) ** 2)) * np.exp(-(((_GXS / ESC - 258) / 70) ** 2))
    img += (vol * densidade)[:, :, None] * sol * per["feixe"]
    img += (vapor * (0.4 + vol * 2.0) * desfocar(ampliar(ruido(94, 10, 4)[:, :, None]), 4)[:, :, 0])[:, :, None] * mistura(per["nevoa"], "#ffffff", 0.3) * per["vapor"]
    # poeira e pólen suspensos no feixe
    poeira = np.zeros(img.shape[:2], dtype=np.float32)
    for _ in range(3400):
        x, y = int(g.random() * W * ESC), int(g.random() * H * ESC)
        k = vol[y, x] * 3
        if k > 0.1 and g.random() < min(1, k) * 0.8:
            tam = 1 if g.random() < 0.7 else 2
            poeira[y:y + tam, x:x + tam] += 0.5 + g.random() * 0.5
    poeira = desfocar(np.clip(poeira, 0, 1)[:, :, None], 0.6)
    img += poeira * mistura(per["sol"], "#ffffff", 0.45) * (0.6 if nome != "noite" else 0.35)

    # ── Reflexo do feixe na água da tina: cintilações nas ondinhas onde o sol (ou a lua) bate.
    ondas = np.clip(np.sin(_GXS / 4.3 + np.sin(_GYS / 2.1) * 2.2) * np.sin(_GYS / 3.0 + _GXS / 13.0), 0, 1) ** 12
    img += (agua3[:, :, 0] * (0.15 + T) * ondas)[:, :, None] * mistura(per["sol"], "#ffffff", 0.5) * 1.1

    # ── Gotas no vidro (acendem com a luz de fora) e o vidro trincado.
    gt = ampliar(gotas.c)
    img += gt[:, :, :1] * gt[:, :, 3:4] * (0.4 + lum_fora) * mistura(per["vidro_luz"], "#ffffff", 0.5)
    tc = ampliar(est["trincas"].c)
    img = img * (1 - tc[:, :, 3:4] * 0.5) + tc[:, :, :3] * tc[:, :, 3:4] * (0.5 + 0.6 * lum_fora)

    # ── Orvalho na manhã: brilhos nas folhas onde o sol bate.
    if nome == "manha":
        verde = np.zeros((H, W), dtype=bool)
        for chave in ("obj_a", "obj_b", "trep", "pend"):
            cc = L[chave].c
            verde |= (cc[:, :, 3] > 0.5) & (cc[:, :, 1] > cc[:, :, 0] * 1.15) & (cc[:, :, 1] > cc[:, :, 2])
        verde &= pix_id == np.isin(pix_id, (4, 6, 8, 9)) * pix_id
        ys_, xs_ = np.where(verde & (_XS > MURO_X))
        orv = np.zeros(img.shape[:2], dtype=np.float32)
        for i in g.choice(len(ys_), size=min(520, len(ys_)), replace=False):
            y, x = ys_[i], xs_[i]
            k = T[y * ESC + 1, x * ESC + 1]
            if k > 0.2 or g.random() < 0.25:
                orv[y * ESC + 1, x * ESC + 1] = 0.35 + k
        orv = desfocar(orv[:, :, None], 0.6) * 4.0 + desfocar(orv[:, :, None], 3) * 1.8
        img += orv * hexa("#fff8e0")

    # ── Emissivos: chamas com halo, vaga-lumes à noite.
    chamas = Camada()
    if per["lamp"] > 0:
        colar(chamas, L["e_lant"])
    if per["vela"] > 0:
        colar(chamas, L["e_vela"])
    if chamas.c[:, :, 3].any():
        ch = ampliar(chamas.c)
        img = sobre(img, ch)
        nucleo = (ch[:, :, 3:4] > 0.9).astype(np.float32)   # só a chama brilha forte; o vidro aceso não vira borrão
        pm = ch[:, :, :3] * ch[:, :, 3:4] * (0.25 + 0.75 * nucleo)
        k = max(per["lamp"], per["vela"])
        img += (desfocar(pm, 2.5) * 1.1 + desfocar(pm, 7) * 0.6 + desfocar(pm, 20) * 1.3) * hexa("#ffb060") * k
        img += luz_pontual(LANTERNA[0], LANTERNA[1] + 1, 3, 1.4)[:, :, None] * hexa("#ffd8a0") * 0.15 * per["lamp"]
    if nome == "noite":
        vg = np.zeros(img.shape[:2], dtype=np.float32)
        gv = np.random.default_rng(97)
        for _ in range(58):
            x = 200 + gv.random() * 275
            y = 60 + gv.random() * 88
            if 326 < x < 386 and y > 132:
                continue
            vg[int(y * ESC):int(y * ESC) + 2, int(x * ESC):int(x * ESC) + 2] = 0.6 + gv.random() * 0.6
        for _ in range(6):
            x, y = 40 + gv.random() * 150, 70 + gv.random() * 60
            vg[int(y * ESC):int(y * ESC) + 2, int(x * ESC):int(x * ESC) + 2] = 0.4
        img += (desfocar(vg[:, :, None], 0.8) * 2.6 + desfocar(vg[:, :, None], 9) * 4.5) * hexa("#c8f07a")

    # ── Primeiro plano desfocado e escuro.
    fr = desfocar_rgba(ampliar(L["frente"].c), 4)
    escur = 0.26 if nome == "noite" else 0.4
    tom_fr = np.array([escur * 0.9, escur, escur * 0.95, 1], dtype=np.float32)
    img = sobre(img, fr * tom_fr)

    # ── Acabamento: bloom, curva de tom, cor, esquerda calma, vinheta, grão.
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img - 0.72, 0, None) * np.clip((lum - 0.6) * 3, 0, 1)
    img = img + desfocar(claro, 6) * 0.5 + desfocar(claro, 22) * 0.55
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
        destino = PASTA / f"estufa-{nome}.webp"
        img.save(destino, quality=88, method=6)
        menor = PASTA / f"estufa-{nome}-960.webp"
        img.resize((960, 320), Image.LANCZOS).save(menor, quality=88, method=6)
        movel = PASTA / f"estufa-{nome}-movel.webp"
        img.crop((MOVEL_X0 * ESC, 0, W * ESC, H * ESC)).save(movel, quality=82, method=6)
        print(destino.name, destino.stat().st_size // 1024, "KB |", menor.name, menor.stat().st_size // 1024, "KB |", movel.name, movel.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
