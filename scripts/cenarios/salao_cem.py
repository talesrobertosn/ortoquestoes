"""Cenário "HD-2D" do topo do ranking (O Salão dos Cem): o Salão dos Campeões aberto para a mata (31/10/2026).

Arte original feita por código, no fluxo de `.claude/skills/arte-hd2d/SKILL.md`: nada baixado nem gerado por IA.
É o mesmo castelo da Escadaria da Ascensão (`escadaria_cem.py`): pedra greige quente, sombras azul-noite, luz dourada
de fim de tarde e toques de verde-floresta e esmeralda. Nenhum símbolo religioso (o vitral tem só folhas, losangos e
louros).

Como é feito:
1. Geometria de verdade em perspectiva de um ponto (como o salão da biblioteca): o chão, as paredes laterais, as duas
   colunas e os três pedestais são sólidos traçados por raio na grade de pixel art (480 x 270), um raio por pixel, sem
   antisserrilhado (o contorno fica de pixel). Cada pixel sabe onde está no espaço e para onde olha (normal).
2. Os materiais são pintados por cima em rampas fechadas de 4 a 8 tons, com ruído de semente fixa: cantaria com juntas,
   lajes polidas, tapete esmeralda com barra dourada, pedra marfim com ouro (1º), pedra prata com safira (2º), arenito
   com bronze (3º), vitral de folhas e louros, hera, musgo e a mata lá fora.
3. A luz é calculada por pixel em 3x (1440 x 810): o sol de fim de tarde atravessa o vitral (cada ponto do chão olha de
   volta para o vidro e pega a cor dele, com a sombra dos pedestais) e entra pelo arco da mata (luz salpicada pelas
   folhas); tochas nas colunas com borda em faixas; céu frio de ambiente; brilho especular no ouro e nas lajes;
   reflexo do salão no chão polido; feixes volumétricos marchando pelo ar com sombra (grade de visibilidade) e poeira;
   profundidade de campo, brilho, curva de tom, altas luzes quentes e sombras frias, vinheta e grão.
4. Interface: o lado esquerdo (x 0..190) fica calmo e escuro (título e vidro da missão); o pódio, o vitral e o arco da
   mata ficam de 210 a 460 (recorte do celular 196..476).

Saída (public/ranking/cem/): salao-fundo.webp (1440 x 810) e salao-fundo-960.webp, salao-frente.webp (com alfa: hera
da frente), salao-luz.webp (o feixe e a poeira para o site pôr sobre os cavaleiros com mix-blend-mode: screen) e
salao.json (pedestais, tochas, estandartes, recortes).
Uso: python3 scripts/cenarios/salao_cem.py [--previas PASTA]
"""
from __future__ import annotations

import json
import math
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parents[2]
PASTA = RAIZ / "public" / "ranking" / "cem"
W, H, ESC = 480, 270, 3

# ─────────────────────────────── Câmera e sala ───────────────────────────────
# Mundo: X para a direita, Y para cima (chão em Y = 0), Z da parede do fundo (Z = 0) para a câmera.
# Na parede do fundo, 1 unidade = 1 pixel de arte: x = X e y = 200 - Y.
F = 380.0              # distância da câmera à parede do fundo (= distância focal)
VPX, HZ = 318.0, 120.0  # ponto de fuga (o centro do vitral e do 1º lugar) e linha do horizonte
OLHO = 80.0            # altura do olho: o chão encontra a parede do fundo em y = 200
XL, XR = 190.0, 420.0  # paredes laterais
# Arco da mata na parede da direita (em Z, Y): vão retangular com volta perfeita em cima
ARCO = dict(z0=36.0, z1=136.0, ym=104.0, esp=10.0)
ARCO["zc"] = (ARCO["z0"] + ARCO["z1"]) / 2
ARCO["r"] = (ARCO["z1"] - ARCO["z0"]) / 2
# Vitral na parede do fundo (px = unidades): três lancetas de volta perfeita
VITRAL = dict(x0=276, x1=360, y0=24, y1=160)
LANCETAS = [(279, 297, 52), (301, 335, 26), (339, 357, 52)]   # (x0, x1, topo do arco)
# Sol: direção PARA a fonte (normalizada). Pelo vitral: de trás e do alto; pela mata: da direita, da frente e do alto.
SOL_V = np.array([-0.10, 0.78, -0.62], np.float32)
SOL_V /= np.linalg.norm(SOL_V)
SOL_M = np.array([0.74, 0.40, 0.54], np.float32)
SOL_M /= np.linalg.norm(SOL_M)

# Pedestais (px da arte): centro, topo (onde os pés pisam) e o centro da base no chão; tiers de cima para baixo:
# (forma, raio px, altura px, papel)
PEDESTAIS = {
    1: dict(cx=318, topo=170, base=212, tiers=[("oct", 28, 4, "tampo"), ("cil", 26, 1.5, "gola"), ("cil", 24.5, 1.5, "filete"),
                                               ("cil", 23, 18, "friso"), ("cil", 24.5, 1.5, "filete"), ("cil", 26, 2.5, "toro"),
                                               ("oct", 29, 5, "degrau"), ("oct", 32, 5, "degrau"), ("oct", 35, 5, "degrau")]),
    2: dict(cx=246, topo=186, base=220, tiers=[("oct", 24, 4, "tampo"), ("cil", 22, 1.2, "gola"), ("cil", 20.5, 1.3, "filete"),
                                               ("cil", 19, 13, "friso"), ("cil", 20.5, 1.3, "filete"), ("cil", 22, 2.2, "toro"),
                                               ("oct", 25, 4, "degrau"), ("oct", 28, 3.5, "degrau"), ("oct", 31.5, 3.5, "degrau")]),
    3: dict(cx=390, topo=192, base=224, tiers=[("oct", 23, 4, "tampo"), ("cil", 21, 1.2, "gola"), ("cil", 19.5, 1.3, "filete"),
                                               ("cil", 18, 12, "friso"), ("cil", 19.5, 1.3, "filete"), ("cil", 21, 2.2, "toro"),
                                               ("oct", 24, 3.5, "degrau"), ("oct", 27, 3.5, "degrau"), ("oct", 30.5, 3, "degrau")]),
}
COLUNAS = [dict(x=207.0, z=16.0, r=8.5), dict(x=412.0, z=16.0, r=8.0)]
TOCHA_Y = 92.0          # altura (Y) do bocal das tochas nas colunas
TAPETE = dict(x0=297.0, x1=339.0, z0=78.0)
SEMENTE = 7


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


YA, XA = np.mgrid[0:H, 0:W].astype(np.float32)


def ruido(seed: int, escala: float, w: int = W, h: int = H) -> np.ndarray:
    """Ruído suave 0..1 (valores aleatórios ampliados com interpolação)."""
    g = np.random.default_rng(abs(int(seed)))
    pw, ph = int(w / escala) + 3, int(h / escala) + 3
    pequeno = g.random((ph, pw)).astype(np.float32)
    img = Image.fromarray(pequeno, mode="F").resize((int(pw * escala), int(ph * escala)), Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32)[:h, :w], 0, 1)


def ruido_em(seed: int, escala: float, u: np.ndarray, v: np.ndarray, tam: int = 512) -> np.ndarray:
    """Ruído suave amostrado em coordenadas de mundo (u, v), para texturas presas às superfícies."""
    tab = ruido(seed, escala, tam, tam)
    iu = np.mod(np.floor(u).astype(np.int64), tam)
    iv = np.mod(np.floor(v).astype(np.int64), tam)
    return tab[iv, iu]


def hash2(a: np.ndarray, b: np.ndarray, seed: int = 0) -> np.ndarray:
    """Número pseudoaleatório 0..1 por par de inteiros (bloco de pedra, laje)."""
    a = a.astype(np.int64)
    b = b.astype(np.int64)
    h = (a * 73856093) ^ (b * 19349663) ^ (seed * 83492791)
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return (np.abs(h) % 10007).astype(np.float32) / 10007


BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16 - 0.47)
BAYER_HW = np.tile(BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W]


def indice(v: np.ndarray, n: int, pontilhado: float = 0.0) -> np.ndarray:
    """Quantiza v (0..1) em n tons; com pontilhado ordenado (Bayer 4x4) nas transições, como na pixel art."""
    return np.clip(np.floor(v * n + BAYER_HW[:v.shape[0], :v.shape[1]] * pontilhado), 0, n - 1).astype(int)


def poli(pts, w: int = W, h: int = H) -> np.ndarray:
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon([(float(x), float(y)) for x, y in pts], fill=255)
    return np.asarray(m) > 127


def bordas(m: np.ndarray) -> np.ndarray:
    """Pixels de m que encostam (4 vizinhos) em algo fora de m."""
    viz = np.zeros_like(m)
    for s, ax in ((1, 0), (-1, 0), (1, 1), (-1, 1)):
        viz |= ~np.roll(m, s, ax)
    return m & viz


# ─────────────────────────────── Projeção ───────────────────────────────
def proj(X, Y, Z):
    k = F / (F - np.asarray(Z, dtype=np.float64))
    return VPX + (np.asarray(X) - VPX) * k, HZ - (np.asarray(Y) - OLHO) * k


def escala_em(Z: float) -> float:
    return F / (F - Z)


def raios(xs: np.ndarray, ys: np.ndarray):
    """Origem e direção (não normalizada, com dz = -1) dos raios que passam pelos pontos de tela (x, y)."""
    d = np.stack([(xs - VPX) / F, -(ys - HZ) / F, -np.ones_like(xs)], -1).astype(np.float64)
    o = np.broadcast_to(np.array([VPX, OLHO, F]), d.shape).astype(np.float64)
    return o, d


# ─────────────────────────────── Sólidos ───────────────────────────────
INF = 1e9


class Solido:
    """Um sólido do salão: prisma octogonal (planta convexa), cilindro, caixa ou plano limitado."""

    def __init__(self, tipo: str, **k) -> None:
        self.tipo = tipo
        self.__dict__.update(k)

    def cortar(self, o: np.ndarray, d: np.ndarray):
        """Distância t (INF se não acerta) e a normal no ponto de entrada."""
        n = o.shape[0]
        if self.tipo in ("prisma", "caixa"):
            tn = np.full(n, -INF)
            tf = np.full(n, INF)
            nrm = np.zeros((n, 3))
            planos = list(self.planos) + [((0.0, 1.0, 0.0), self.y1), ((0.0, -1.0, 0.0), -self.y0)]
            for (nx, ny, nz), dd in planos:
                den = d[:, 0] * nx + d[:, 1] * ny + d[:, 2] * nz
                num = dd - (o[:, 0] * nx + o[:, 1] * ny + o[:, 2] * nz)
                with np.errstate(divide="ignore", invalid="ignore"):
                    t = num / den
                entra = den < 0
                sai = den > 0
                paralelo_fora = (den == 0) & (num < 0)
                novo = entra & (t > tn)
                tn = np.where(novo, t, tn)
                nrm[novo] = (nx, ny, nz)
                tf = np.where(sai & (t < tf), t, tf)
                tf = np.where(paralelo_fora, -INF, tf)
            ok = (tn <= tf) & (tn > 1e-6)
            return np.where(ok, tn, INF), nrm
        if self.tipo == "cilindro":
            ox, oz = o[:, 0] - self.cx, o[:, 2] - self.cz
            a = d[:, 0] ** 2 + d[:, 2] ** 2
            b = 2 * (ox * d[:, 0] + oz * d[:, 2])
            c = ox ** 2 + oz ** 2 - self.r ** 2
            disc = b * b - 4 * a * c
            sq = np.sqrt(np.maximum(disc, 0))
            t1 = (-b - sq) / (2 * a)
            y = o[:, 1] + d[:, 1] * t1
            lado = (disc >= 0) & (t1 > 1e-6) & (y >= self.y0) & (y <= self.y1)
            # tampa de cima (vista de cima, quando o olho está acima dela)
            with np.errstate(divide="ignore", invalid="ignore"):
                tt = (self.y1 - o[:, 1]) / d[:, 1]
            px, pz = o[:, 0] + d[:, 0] * tt - self.cx, o[:, 2] + d[:, 2] * tt - self.cz
            tampa = (tt > 1e-6) & (px ** 2 + pz ** 2 <= self.r ** 2) & (o[:, 1] > self.y1)
            t = np.where(lado, t1, INF)
            t = np.where(tampa & (tt < t), tt, t)
            nrm = np.zeros((n, 3))
            hx, hz = ox + d[:, 0] * t, oz + d[:, 2] * t
            nrm[:, 0], nrm[:, 2] = hx / self.r, hz / self.r
            usa_tampa = tampa & (tt <= t)
            nrm[usa_tampa] = (0, 1, 0)
            return t, nrm
        if self.tipo == "plano":
            ax, v = self.eixo, self.valor
            with np.errstate(divide="ignore", invalid="ignore"):
                t = (v - o[:, ax]) / d[:, ax]
            p = o + d * t[:, None]
            ok = (t > 1e-6)
            for e, (lo, hi) in self.limites.items():
                ok &= (p[:, e] >= lo) & (p[:, e] <= hi)
            if getattr(self, "furo", None) is not None:
                ok &= ~self.furo(p)
            nrm = np.zeros((n, 3))
            nrm[:, ax] = self.sinal
            return np.where(ok, t, INF), nrm
        raise ValueError(self.tipo)


def octogono(cx: float, cz: float, r: float, giro: float):
    """Planos (normal, d) de um prisma octogonal com uma face virada para a câmera (giro = ângulo de visada)."""
    planos = []
    for i in range(8):
        a = giro + i * math.pi / 4
        nx, nz = math.sin(a), math.cos(a)
        planos.append(((nx, 0.0, nz), r * math.cos(math.pi / 8) + nx * cx + nz * cz))
    return planos


def caixa(x0, x1, y0, y1, z0, z1, **k) -> Solido:
    planos = [((1.0, 0.0, 0.0), x1), ((-1.0, 0.0, 0.0), -x0), ((0.0, 0.0, 1.0), z1), ((0.0, 0.0, -1.0), -z0)]
    return Solido("caixa", planos=planos, y0=y0, y1=y1, **k)


def no_arco(z, y, folga: float = 0.0):
    """(z, y) dentro do vão do arco da mata na parede da direita."""
    a = ARCO
    reto = (z >= a["z0"] - folga) & (z <= a["z1"] + folga) & (y >= -1) & (y <= a["ym"])
    volta = (z - a["zc"]) ** 2 + (y - a["ym"]) ** 2 <= (a["r"] + folga) ** 2
    return reto | (volta & (y > a["ym"]))


def montar_pedestais() -> list[dict]:
    """Converte os pedestais de px da arte para o mundo (cada um no seu Z, com a escala da sua profundidade)."""
    out = []
    for lugar, p in PEDESTAIS.items():
        # a base (centro, no chão) fixa o Z; o topo fixa a altura; o centro x fixa o X
        z = F - F * OLHO / (p["base"] - HZ)
        s = escala_em(z)
        alt = OLHO - (p["topo"] - HZ) / s
        X = VPX + (p["cx"] - VPX) / s
        giro = math.atan2(X - VPX, F - z)
        tiers = []
        y = alt
        soma_px = sum(t[2] for t in p["tiers"])
        for forma, rpx, hpx, papel in p["tiers"]:
            h = hpx / soma_px * alt
            r = rpx / s
            tiers.append(dict(forma=forma, r=r, y0=y - h, y1=y, papel=papel))
            y -= h
        out.append(dict(lugar=lugar, X=X, Z=z, s=s, alt=alt, giro=giro, tiers=tiers, cx=p["cx"], topo=p["topo"], base=p["base"]))
    return out


PED = montar_pedestais()


def solidos() -> list[Solido]:
    """Todos os sólidos com o seu id (o índice) e o tipo de material."""
    lista: list[Solido] = []
    # paredes e chão
    lista.append(Solido("plano", eixo=2, valor=0.0, sinal=1.0, limites={0: (XL, XR), 1: (0, 400)},
                        furo=lambda p: na_vitral(p[:, 0], 200 - p[:, 1]), mat="fundo"))
    lista.append(Solido("plano", eixo=2, valor=-7.0, sinal=1.0, limites={0: (XL, XR), 1: (0, 400)}, mat="vidro"))
    lista.append(Solido("plano", eixo=0, valor=XL, sinal=1.0, limites={2: (0, 600), 1: (0, 400)}, mat="esq"))
    lista.append(Solido("plano", eixo=0, valor=XR, sinal=-1.0, limites={2: (0, 600), 1: (0, 400)},
                        furo=lambda p: no_arco(p[:, 2], p[:, 1]), mat="dir"))
    lista.append(Solido("plano", eixo=2, valor=ARCO["z0"], sinal=1.0,
                        limites={0: (XR, XR + ARCO["esp"]), 1: (0, ARCO["ym"] + ARCO["r"])},
                        furo=lambda p: ~no_arco(np.full(len(p), ARCO["z0"] + 0.5), p[:, 1]), mat="ombreira"))
    lista.append(Solido("plano", eixo=0, valor=XR + 60, sinal=-1.0, limites={2: (-200, 900), 1: (-50, 900)}, mat="fora"))
    lista.append(Solido("plano", eixo=1, valor=0.0, sinal=1.0, limites={0: (XL, XR), 2: (0, 600)}, mat="chao"))
    # pilastras da parede da esquerda (caixas que saem da parede)
    for z0 in (44.0, 168.0):
        lista.append(caixa(XL - 1, XL + 7, 0, 260, z0, z0 + 13, mat="pilastra"))
    # colunas: plinto, toro, fuste, capitel
    for i, c in enumerate(COLUNAS):
        x, z, r = c["x"], c["z"], c["r"]
        lista.append(caixa(x - r - 3, x + r + 3, 0, 9, z - r - 3, z + r + 3, mat="col_base", col=i))
        lista.append(Solido("cilindro", cx=x, cz=z, r=r + 1.6, y0=9, y1=13, mat="col_toro", col=i))
        lista.append(Solido("cilindro", cx=x, cz=z, r=r, y0=13, y1=166, mat="col_fuste", col=i))
        lista.append(Solido("cilindro", cx=x, cz=z, r=r + 1.6, y0=166, y1=171, mat="col_toro", col=i))
        lista.append(caixa(x - r - 4, x + r + 4, 171, 182, z - r - 4, z + r + 4, mat="col_capitel", col=i))
    # pedestais
    for p in PED:
        for k, t in enumerate(p["tiers"]):
            if t["forma"] == "oct":
                s = Solido("prisma", planos=octogono(p["X"], p["Z"], t["r"], p["giro"]), y0=t["y0"], y1=t["y1"])
            else:
                s = Solido("cilindro", cx=p["X"], cz=p["Z"], r=t["r"], y0=t["y0"], y1=t["y1"])
            s.mat, s.lugar, s.tier, s.papel = "pedestal", p["lugar"], k, t["papel"]
            lista.append(s)
    for i, s in enumerate(lista):
        s.id = i
    return lista


def na_lanceta(x, y):
    """(x, y) de tela dentro do vidro de uma das três lancetas (parede do fundo: x = X, y = 200 - Y)."""
    m = np.zeros(np.shape(x), bool)
    for x0, x1, yt in LANCETAS:
        r = (x1 - x0) / 2
        cx = (x0 + x1) / 2
        reto = (x >= x0) & (x <= x1) & (y >= yt + r) & (y <= VITRAL["y1"] - 2)
        volta = ((x - cx) ** 2 + (y - yt - r) ** 2 <= r * r) & (y < yt + r)
        m |= reto | volta
    return m


def na_vitral(x, y):
    return na_lanceta(x, y)


SOLIDOS = solidos()
ID = {s.mat: s.id for s in SOLIDOS if s.mat in ("fundo", "vidro", "esq", "dir", "ombreira", "fora", "chao")}


def tracar(o: np.ndarray, d: np.ndarray, lista=None):
    """Primeiro sólido em cada raio: (t, id, normal)."""
    lista = SOLIDOS if lista is None else lista
    n = o.shape[0]
    tm = np.full(n, INF)
    idm = np.full(n, -1, np.int32)
    nm = np.zeros((n, 3))
    for s in lista:
        t, nrm = s.cortar(o, d)
        m = t < tm
        tm = np.where(m, t, tm)
        idm[m] = s.id
        nm[m] = nrm[m]
    return tm, idm, nm


def tracar_tela(w: int, h: int, esc: float):
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float64)
    xs = (xs + 0.5) / esc
    ys = (ys + 0.5) / esc
    o, d = raios(xs.ravel(), ys.ravel())
    t, i, nrm = tracar(o, d)
    p = o + d * t[:, None]
    return t.reshape(h, w), i.reshape(h, w), nrm.reshape(h, w, 3), p.reshape(h, w, 3)


# ─────────────────────────────── Sombra (oclusores) ───────────────────────────────
OCLUSORES = [s for s in SOLIDOS if s.mat in ("pedestal", "col_base", "col_toro", "col_fuste", "col_capitel")]


def visivel(p: np.ndarray, L: np.ndarray, ignora=None) -> np.ndarray:
    """1 onde o ponto p enxerga a direção L sem bater num pedestal ou coluna."""
    o = p + L[None, :] * 0.35
    d = np.broadcast_to(L, p.shape).astype(np.float64)
    vis = np.ones(p.shape[0], np.float32)
    for s in OCLUSORES:
        t, _ = s.cortar(o, d)
        bate = t < INF
        if ignora is not None:
            bate &= ignora != s.id
        vis[bate] = 0
    return vis


LUSTRE = np.array([318.0, 196.0, 178.0])


def visivel_ponto(p: np.ndarray, L0: np.ndarray) -> np.ndarray:
    """1 onde o ponto p enxerga a luz pontual L0 sem bater num pedestal ou coluna."""
    d = L0[None, :] - p
    dist = np.linalg.norm(d, axis=1)
    d = d / dist[:, None]
    o = p + d * 0.35
    vis = np.ones(p.shape[0], np.float32)
    for s in OCLUSORES:
        t, _ = s.cortar(o, d)
        vis[t < dist] = 0
    return vis


def ate_vitral(p: np.ndarray):
    """De cada ponto, seguindo o sol do vitral até a parede do fundo: (x, y) de tela no vidro."""
    s = p[..., 2] / (-SOL_V[2])
    x = p[..., 0] + SOL_V[0] * s
    y = 200 - (p[..., 1] + SOL_V[1] * s)
    return x, y


def ate_arco(p: np.ndarray):
    """De cada ponto, seguindo o sol da mata até a parede da direita: (z, y) no plano do arco."""
    s = (XR + ARCO["esp"] * 0.5 - p[..., 0]) / SOL_M[0]
    return p[..., 2] + SOL_M[2] * s, p[..., 1] + SOL_M[1] * s, s


# ─────────────────────────────── Paletas (albedo, de escuro a claro) ───────────────────────────────
PEDRA = pal("#221e20", "#2e2828", "#3b3330", "#4a4039", "#5a4e44", "#6b5d50", "#7d6d5d", "#907e6a", "#a28f78")
PEDRA_CLARA = pal("#3a3330", "#4c433c", "#5f5449", "#726656", "#867864", "#9a8a73", "#ad9d84", "#c0b096")
ARGAMASSA = hexa("#17141a")
MADEIRA = pal("#160e0a", "#22150e", "#301e13", "#402918", "#52351f", "#664327", "#7b5230")
FERRO = pal("#0e0e14", "#1c1c24", "#2c2c36", "#42424c", "#5e5e68")
OURO = pal("#4a3014", "#7a5420", "#a8782c", "#d0a040", "#e4b85c", "#f2d088", "#fbecc0")
LAJE = pal("#2c2826", "#3a3532", "#4a4440", "#5b5450", "#6d655e", "#80776e", "#958a7e", "#aa9e8e")
LAJE_ESC = pal("#1c1a1e", "#252229", "#2f2b32", "#3a353b", "#464046", "#534b50")
TAPETE_R = pal("#04100e", "#071a17", "#0a2420", "#0c2e28", "#0c3c34", "#114a40", "#17675b")
MUSGO = pal("#10241a", "#18361f", "#234a26", "#30602c", "#437834", "#5a903e")
HERA = pal("#0b1a12", "#12291a", "#1b3c20", "#285226", "#386a2c", "#4e8434", "#6c9e3e", "#90b84c")
# pedestais: (pedra, metal das faixas, metal do número)
MARMORE = pal("#3a342e", "#544b42", "#6f6558", "#8c8170", "#a99d88", "#c4b8a0", "#dcd2bc", "#ece6d6")
PRATA_PEDRA = pal("#1e2128", "#2b303a", "#3b414e", "#4f5665", "#656d7e", "#7e8798", "#99a2b2", "#b6becc")
ARENITO = pal("#2c1e16", "#402c20", "#563c2a", "#6e4e36", "#866244", "#9e7854", "#b48e66", "#c8a47a")
PRATA = pal("#2a3040", "#4a5466", "#76829a", "#a6b2c6", "#cfd8e6", "#eef3fa")
SAFIRA = pal("#0c1430", "#152a5c", "#21438a", "#3a68b8", "#6e9ce0", "#b8d6fa")
BRONZE = pal("#3a1c0e", "#5e3016", "#8a4a22", "#b06a34", "#d08a4c", "#eab07a", "#f8d6a8")
MATERIAL_PED = {1: (MARMORE, OURO, OURO), 2: (PRATA_PEDRA, SAFIRA, PRATA), 3: (ARENITO, BRONZE, BRONZE)}

# vidro (cores puras, a luz do sol entra depois)
VIDRO = {
    "chumbo": "#120e0c", "marfim": "#f6eccc", "palha": "#f0d690", "ambar": "#e8a848", "mel": "#d08a30",
    "ouro": "#f4c45a", "esm": "#1d7a4c", "esm_esc": "#11523a", "folha": "#5aa040", "folha_cl": "#a8cc58",
    "ceu": "#b8cccc", "ceu_cl": "#f0ecd8", "bronze": "#9a5a2a", "vinho": "#8a3a2a",
}

DIGITOS = {
    1: ["..##...", ".###...", "####...", "..##...", "..##...", "..##...", "..##...", "..##...", "..##...", "######.", "######."],
    2: [".####..", "##..##.", "....##.", "....##.", "...##..", "..##...", ".##....", "##.....", "######."],
    3: [".####..", "##..##.", "....##.", "..###..", "....##.", "....##.", "....##.", "##..##.", ".####.."],
}


class Tela:
    """Os mapas da pintura na grade de arte: albedo, normal extra, metal, brilho especular, emissivo e reflexo."""

    def __init__(self) -> None:
        self.alb = np.zeros((H, W, 3), np.float32)
        self.nex = np.zeros((H, W, 3), np.float32)       # perturbação somada à normal geométrica
        self.metal = np.zeros((H, W), np.float32)
        self.esp = np.zeros((H, W), np.float32)
        self.emi = np.zeros((H, W, 3), np.float32)
        self.refl = np.zeros((H, W), np.float32)
        self.ao = np.ones((H, W), np.float32)            # oclusão pintada (cantos, juntas fundas)

    def p(self, x, y, cor, metal: float | None = None, emi=None) -> None:
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            self.alb[y, x] = hexa(cor) if isinstance(cor, str) else cor
            if metal is not None:
                self.metal[y, x] = metal
            if emi is not None:
                self.emi[y, x] = emi


# ─────────────────────────────── Cantaria ───────────────────────────────
def cantaria(u: np.ndarray, v: np.ndarray, alt: float, comp: float, seed: int):
    """Blocos de pedra em fiadas (coordenadas de mundo u horizontal, v vertical): id do bloco e tom do bloco."""
    fila = np.floor(v / alt)
    desl = hash2(fila, fila * 0 + 3, seed) * comp
    larg = comp * (0.75 + 0.5 * hash2(fila, fila * 0 + 5, seed))
    col = np.floor((u + desl) / larg)
    tom = hash2(fila, col, seed)
    bid = fila * 10000 + col
    return bid, tom, fila, col


def juntas(bid: np.ndarray, m: np.ndarray):
    """Junta de 1 px onde o bloco muda (em cima e à esquerda) e as quinas do bloco (topo claro, base escura)."""
    cima = np.roll(bid, 1, 0)
    esq = np.roll(bid, 1, 1)
    baixo = np.roll(bid, -1, 0)
    junta = m & ((bid != cima) | (bid != esq))
    topo = m & ~junta & (np.roll(junta, 1, 0))
    base = m & ~junta & (np.roll(junta, -1, 0) & (bid == cima))
    base |= m & ~junta & (bid != baixo)
    return junta, topo, base


def pintar_cantaria(t: Tela, m: np.ndarray, u, v, alt, comp, seed, paleta=PEDRA, nivel=4.2, var=1.6,
                    rachas: float = 0.0):
    bid, tom, fila, col = cantaria(u, v, alt, comp, seed)
    n1 = ruido_em(seed + 1, 3.0, u * 1.0, v * 1.0)
    n2 = ruido_em(seed + 2, 1.2, u * 1.0, v * 1.0)
    k = nivel + (tom - 0.5) * var * 2 + (n1 - 0.5) * 1.6 + (n2 - 0.5) * 0.9
    junta, topo, base = juntas(bid, m)
    k = k + topo * 0.9 - base * 0.8
    idx = np.clip(np.floor(k + BAYER_HW * 0.6), 0, len(paleta) - 1).astype(int)
    t.alb[m] = paleta[idx[m]]
    # lascas: pontinhos escuros com um claro embaixo, em poucos blocos
    lasca = m & (n2 > 0.86) & (tom > 0.4) & ~junta
    t.alb[lasca] = paleta[np.clip(idx[lasca] - 2, 0, None)]
    t.alb[junta] = ARGAMASSA
    t.ao[junta] = 0.75
    t.nex[topo] += (0, 0.55, 0)
    t.nex[base] += (0, -0.45, 0)
    return bid, tom, junta


# ─────────────────────────────── Parede do fundo (2D: x = X, y = 200 - Y) ───────────────────────────────
def parede_fundo(t: Tela, ids: np.ndarray) -> None:
    m = ids == ID["fundo"]
    x, y = XA, YA
    pintar_cantaria(t, m, x, y + 1, 9, 21, 11)
    # rodapé de pedra (y 182..200): blocos maiores e uma moldura clara redonda em cima
    rod = m & (y >= 182)
    pintar_cantaria(t, rod, x, y - 182, 10, 30, 12, PEDRA, nivel=3.4)
    for yy, k in ((181, 6), (182, 7), (183, 5), (184, 3)):
        mm = m & (y == yy)
        n = ruido_em(13, 2, x, x * 0)
        t.alb[mm] = PEDRA[np.clip(k + (n[mm] > 0.6).astype(int) - (n[mm] < 0.25).astype(int), 0, 8)]
    t.nex[m & (y == 181)] += (0, 0.8, 0)
    t.nex[m & (y == 184)] += (0, -0.6, 0)
    # viga de madeira no alto (y 6..18) com tiras de ferro e cravos
    viga = m & (y >= 6) & (y < 18)
    veio = ruido_em(14, 6, x * 0.25, y * 3.0) * 0.7 + ruido_em(15, 2, x * 0.5, y * 2) * 0.3
    k = 3.2 + (veio - 0.5) * 3.0 - (y - 6) / 12 * 1.4
    k = np.where(y == 6, 5.6, k)
    k = np.where(y == 17, 0.4, k)
    t.alb[viga] = MADEIRA[np.clip(np.floor(k + BAYER_HW * 0.5), 0, 6).astype(int)[viga]]
    t.nex[m & (y == 6)] += (0, 0.8, 0)
    for xs in range(196, 420, 37):
        faixa = viga & (np.abs(x - xs) <= 1)
        t.alb[faixa] = FERRO[np.where(x[faixa] == xs - 1, 3, 1)]
        t.metal[faixa] = 0.6
        for yy in (8, 15):
            t.p(xs, yy, FERRO[4], metal=0.8)
    acima = m & (y < 6)
    t.alb[acima] = MADEIRA[0] * 0.6
    t.ao[acima] = 0.4
    # friso entalhado (y 19..29): losangos em relevo com um ponto, entre dois filetes
    friso = m & (y >= 18) & (y <= 30)
    t.alb[friso] = PEDRA_CLARA[3]
    fx = np.mod(x - 3, 10)
    fy = y - 24
    los = friso & (np.abs(fx - 5) + np.abs(fy) <= 4)
    t.alb[los] = PEDRA_CLARA[4]
    lado_luz = los & ((fx - 5) + fy < 0)
    t.alb[lado_luz] = PEDRA_CLARA[6]
    t.nex[lado_luz] += (0, 0.4, 0.2)
    sombra = los & ((fx - 5) + fy > 1)
    t.alb[sombra] = PEDRA_CLARA[2]
    t.nex[sombra] += (0, -0.4, 0)
    contorno = friso & (np.abs(np.abs(fx - 5) + np.abs(fy) - 5) < 0.5)
    t.alb[contorno] = PEDRA_CLARA[1]
    ponto = friso & (fx == 5) & (fy == 0)
    t.alb[ponto] = PEDRA_CLARA[7]
    for yy, k, ny in ((18, 1, -0.5), (19, 6, 0.7), (20, 4, 0), (29, 5, 0.5), (30, 2, -0.6)):
        mm = m & (y == yy)
        t.alb[mm] = PEDRA_CLARA[k]
        t.nex[mm] += (0, ny, 0)
    t.ao[m & (y == 31)] = 0.7
    # pilastras ao lado do vitral (planas, saltadas: borda esquerda clara, direita escura) com capitel e base
    for x0, x1 in ((264, 275), (361, 372)):
        pil = m & (x >= x0) & (x <= x1) & (y >= 31) & (y < 182)
        bid, tom, fila, col = cantaria(x - x0, y, 12, 40, 20 + x0)
        n = ruido_em(21, 2.5, x, y)
        k = 4.6 + (tom - 0.5) * 1.6 + (n - 0.5) * 1.4
        k = np.where(x == x0, 7.2, np.where(x == x1, 2.2, k))
        k = np.where(x == x0 + 1, k + 1, k)
        t.alb[pil] = PEDRA_CLARA[np.clip(np.floor(k + BAYER_HW * 0.5), 0, 7).astype(int)[pil]]
        jn = pil & (bid != np.roll(bid, 1, 0)) & (x > x0) & (x < x1)
        t.alb[jn] = PEDRA_CLARA[1]
        t.nex[pil & (x == x0)] += (-0.7, 0, 0.3)
        t.nex[pil & (x == x1)] += (0.7, 0, 0.3)
        # capitel (y 31..38) com volutas simples e base (y 174..181)
        for yy, k, ext in ((31, 6, 2), (32, 7, 2), (33, 4, 2), (34, 5, 1), (35, 3, 1), (36, 6, 1), (37, 2, 0),
                           (174, 6, 0), (175, 2, 1), (176, 6, 1), (177, 7, 1), (178, 4, 2), (179, 6, 2), (180, 3, 2)):
            mm = m & (y == yy) & (x >= x0 - ext) & (x <= x1 + ext)
            t.alb[mm] = PEDRA_CLARA[k]
            t.nex[mm] += (0, 0.35 if k >= 5 else -0.3, 0)
        for xx in (x0, x1):
            t.p(xx + (1 if xx == x0 else -1), 34, PEDRA_CLARA[1])
            t.p(xx, 35, PEDRA_CLARA[7])
    moldura_vitral(t, m)
    # rachas finas em alguns blocos (fora das áreas dos estandartes, do vitral e das tochas)
    g = np.random.default_rng(SEMENTE + 40)
    for _ in range(9):
        xx, yy = int(g.integers(212, 410)), int(g.integers(108, 176))
        if 270 < xx < 368:
            continue
        for _k in range(int(g.integers(4, 9))):
            if 0 <= yy < H and m[yy, xx]:
                t.alb[yy, xx] = PEDRA[1]
                if yy + 1 < H and m[yy + 1, xx]:
                    t.alb[yy + 1, xx] = PEDRA[5]
            xx += int(g.integers(-1, 2))
            yy += 1


def moldura_vitral(t: Tela, m: np.ndarray) -> None:
    """Moldura entalhada do vitral: aduelas em volta de cada lanceta, mainéis, painéis de folhas e o peitoril."""
    x, y = XA, YA
    vx0, vx1 = VITRAL["x0"], VITRAL["x1"]
    caixa_m = m & (x >= vx0) & (x <= vx1) & (y >= 22) & (y <= 166)
    n = ruido_em(31, 2.2, x, y)
    t.alb[caixa_m] = PEDRA_CLARA[np.clip(np.floor(4 + (n[caixa_m] - 0.5) * 2 + BAYER_HW[caixa_m] * 0.6), 0, 7).astype(int)]
    # borda externa da moldura (filete claro à esquerda e no alto, escuro à direita)
    t.alb[caixa_m & (x == vx0)] = PEDRA_CLARA[7]
    t.alb[caixa_m & (x == vx0 + 1)] = PEDRA_CLARA[5]
    t.alb[caixa_m & (x == vx1)] = PEDRA_CLARA[1]
    t.alb[caixa_m & (x == vx1 - 1)] = PEDRA_CLARA[3]
    t.alb[caixa_m & (y == 22)] = PEDRA_CLARA[7]
    t.nex[caixa_m & (x <= vx0 + 1)] += (-0.5, 0, 0.3)
    t.nex[caixa_m & (x >= vx1 - 1)] += (0.5, 0, 0.3)
    # aduelas: anel de 3 px em volta de cada lanceta, com juntas radiais
    for x0, x1, yt in LANCETAS:
        r = (x1 - x0) / 2
        cx, cy = (x0 + x1) / 2, yt + r
        d = np.hypot(x - cx + 0.5, (y - cy + 0.5))
        ang = np.arctan2(y - cy + 0.5, x - cx + 0.5)
        anel = caixa_m & (y < cy + 1) & (d > r) & (d <= r + 3.6)
        reto = caixa_m & (y >= cy) & (((x >= x0 - 3) & (x < x0)) | ((x > x1) & (x <= x1 + 3))) & (y <= VITRAL["y1"])
        k = np.where(d > r + 2.6, 2, np.where(d < r + 1.2, 6, 5))
        t.alb[anel] = PEDRA_CLARA[k[anel]]
        rad = anel & (np.abs(np.mod(ang * (7 if r > 12 else 5) / math.pi, 1) - 0.5) < 0.09)
        t.alb[rad] = PEDRA_CLARA[1]
        t.nex[anel] += np.stack([np.cos(ang), -np.sin(ang), np.full_like(ang, 0.4)], -1)[anel] * 0.4
        kk = np.where((x == x0 - 1) | (x == x1 + 1), 6, np.where((x == x0 - 3) | (x == x1 + 3), 2, 4))
        t.alb[reto] = PEDRA_CLARA[kk[reto]]
        # fiadas do montante
        t.alb[reto & (np.mod(y - 4, 13) == 0)] = PEDRA_CLARA[1]
        # chave no alto do arco (bloco saliente)
        for yy in range(int(yt - 4), int(yt + 1)):
            for xx in range(int(cx) - 1, int(cx) + 2):
                if m[yy, xx]:
                    t.alb[yy, xx] = PEDRA_CLARA[6 if xx < cx else 3]
    # painéis com folhas entalhadas sobre as lanceta laterais (y 26..46)
    for x0, x1, yt in (LANCETAS[0], LANCETAS[2]):
        cx = (x0 + x1) / 2
        for i, yy in enumerate(range(28, 46, 5)):
            for dx in (-1, 1):
                folha_relevo(t, m, int(cx + dx * 3), yy, dx)
        t.p(int(cx), 46, PEDRA_CLARA[6])
    # peitoril saliente (y 160..166): topo claro, face, sombra embaixo
    for yy, k in ((159, 7), (160, 6), (161, 5), (162, 4), (163, 3), (164, 2), (165, 1)):
        mm = m & (y == yy) & (x >= vx0 - 3) & (x <= vx1 + 3)
        t.alb[mm] = PEDRA_CLARA[k]
    t.nex[m & (y == 159) & (x >= vx0 - 3) & (x <= vx1 + 3)] += (0, 1.0, 0.2)
    t.ao[m & (y == 166) & (x >= vx0 - 3) & (x <= vx1 + 3)] = 0.55
    t.ao[m & (y == 167) & (x >= vx0 - 2) & (x <= vx1 + 2)] = 0.8


def folha_relevo(t: Tela, m, cx: int, cy: int, lado: int) -> None:
    """Folha de 5 px entalhada na pedra: lado de cima claro, de baixo escuro."""
    pts = [(0, 0, 6), (lado, -1, 7), (lado * 2, -1, 6), (lado, 0, 4), (lado * 2, 0, 3), (lado * 3, -1, 5), (0, 1, 2)]
    for dx, dy, k in pts:
        xx, yy = cx + dx, cy + dy
        if 0 <= yy < H and 0 <= xx < W and m[yy, xx]:
            t.alb[yy, xx] = PEDRA_CLARA[k]
            t.nex[yy, xx] += (0, 0.3 if k >= 5 else -0.3, 0.2)


# ─────────────────────────────── Vitral (coordenadas do vidro: gx = X, gy = 200 - Y) ───────────────────────────────
def vitral_cores(gw: int = W, gh: int = 220) -> tuple[np.ndarray, np.ndarray]:
    """Mapa do vidro (cor transmitida) e do chumbo, com folhas, louros e losangos (sem símbolo religioso)."""
    gy, gx = np.mgrid[0:gh, 0:gw].astype(np.float32)
    cor = np.zeros((gh, gw, 3), np.float32)
    dentro = na_lanceta(gx + 0.5, gy + 0.5)
    chumbo = np.zeros((gh, gw), bool)
    malha = np.zeros((gh, gw), bool)
    motivo = np.zeros((gh, gw), bool)
    C = {k: hexa(v) for k, v in VIDRO.items()}
    n = ruido(51, 2.0, gw, gh)
    n2 = ruido(52, 5.0, gw, gh)
    for li, (x0, x1, yt) in enumerate(LANCETAS):
        r = (x1 - x0) / 2
        cx = (x0 + x1) / 2
        lan = dentro & (gx >= x0 - 1) & (gx <= x1 + 1)
        # fundo: céu de fim de tarde (claro no alto, mel embaixo)
        t = np.clip((gy - yt) / (VITRAL["y1"] - yt), 0, 1)
        fundo = (C["ceu_cl"] * (1 - t[..., None]) * 0.5 + C["palha"] * (0.5 + 0.0 * t[..., None])
                 + C["ambar"] * t[..., None] * 0.5) / (1.0 + t[..., None] * 0.0)
        cor[lan] = fundo[lan]
        # malha de losangos
        u, v = gx - cx, gy - yt
        passo = 8.0
        a1 = np.mod(u + v, passo)
        a2 = np.mod(-u + v, passo)
        malha |= lan & ((a1 < 0.7) | (a2 < 0.7))
        # cada losango com um tom levemente diferente (vidro soprado)
        cel = np.floor((u + v) / passo) * 31 + np.floor((-u + v) / passo)
        varia = hash2(cel, cel * 0 + li, 9)
        quente = np.where((varia < 0.3)[..., None], C["palha"], np.where((varia < 0.55)[..., None], C["ambar"],
                          np.where((varia < 0.8)[..., None], C["marfim"], C["mel"])))
        alto = np.clip(1 - (gy - yt) / 40, 0, 1)[..., None]
        cor[lan] = (quente * (1 - alto * 0.5) + C["ceu_cl"] * alto * 0.5)[lan]
        cor[lan] *= (0.9 + 0.16 * varia[lan])[:, None]
        # borda de 2 px esmeralda em volta de cada lanceta, com contas douradas
        d_borda = np.minimum(np.minimum(gx - x0, x1 - gx), np.where(gy < yt + r, r - np.hypot(gx - cx, gy - yt - r), 99))
        borda = lan & (d_borda < 2.4)
        cor[borda] = C["esm"] * (0.8 + 0.4 * n[borda])[:, None]
        conta = borda & (np.mod(gy, 7) < 1.2) & (d_borda > 0.6)
        cor[conta] = C["ouro"]
        chumbo |= lan & (np.abs(d_borda - 2.4) < 0.55)
        if li != 1:
            # trepadeira subindo pelo meio: haste bronze e folhas esmeralda e verde-folha, frutinhos dourados
            for k in range(14):
                yy = VITRAL["y1"] - 8 - k * 7.5
                if yy < yt + 4:
                    break
                xx = cx + math.sin(k * 1.3 + li) * 2.2
                haste = lan & (np.abs(gx - xx) < 0.9) & (gy >= yy - 7.5) & (gy <= yy)
                cor[haste] = C["bronze"]
                motivo |= haste
                ld = 1 if k % 2 == 0 else -1
                fx, fy = xx + ld * 3.6, yy - 3
                folha = lan & ((((gx - fx) * 0.62) ** 2 + ((gy - fy) * 1.1) ** 2) <= 5.8)
                motivo |= lan & ((((gx - fx) * 0.62) ** 2 + ((gy - fy) * 1.1) ** 2) <= 8.0)
                cor[folha] = np.where(((gx - fx) * ld < 0)[folha][:, None], C["esm"], C["folha"])
                chumbo |= lan & (np.abs((((gx - fx) * 0.62) ** 2 + ((gy - fy) * 1.1) ** 2) - 7.0) < 1.3) & ~folha
                if k % 3 == 1:
                    fr = lan & ((gx - (xx - ld * 2.5)) ** 2 + (gy - yy + 5) ** 2 <= 1.3)
                    cor[fr] = C["ouro"]
        else:
            # central: louro de vitória no alto (coroa aberta de folhas) e a mata embaixo
            ccy = yt + 15
            d = np.hypot(gx - cx, gy - ccy)
            ang = np.arctan2(gy - ccy, gx - cx)
            coroa = lan & (np.abs(d - 9.5) < 2.6) & (np.sin(ang) > -0.55)
            fol = coroa & (np.mod(ang * 9 / math.pi + (d - 9.5) * 0.2, 1) < 0.62)
            cor[coroa] = C["esm_esc"]
            motivo |= lan & (d < 12.8) & ((np.sin(ang) > -0.55) | (d < 6))
            cor[fol] = np.where((d < 9.5)[fol][:, None], C["folha"], C["folha_cl"])
            disco = lan & (d < 5.5)
            cor[disco] = C["ouro"] * (0.95 + 0.15 * n[disco])[:, None]
            chumbo |= lan & ((np.abs(d - 5.6) < 0.5) | (np.abs(d - 12.3) < 0.5) & (np.sin(ang) > -0.55))
            fita = lan & (np.abs(gy - (ccy + 9)) < 1.4) & (np.abs(gx - cx) < 5)
            cor[fita] = C["vinho"] * 1.2
            # árvores estilizadas: copas redondas em verdes, troncos bronze, chão de relva
            for (tx, ty, tr, tk) in ((cx - 9, 96, 8, 0), (cx + 8, 104, 9, 1), (cx - 1, 120, 10, 2), (cx - 11, 134, 7, 3),
                                     (cx + 10, 136, 7, 4)):
                dd = np.hypot(gx - tx, (gy - ty) * 1.05)
                copa = lan & (dd < tr)
                motivo |= lan & (dd < tr + 0.6)
                luz = ((gx - tx) * 0.5 - (gy - ty)) / tr
                cor[copa] = np.where((luz > 0.35)[copa][:, None], C["folha_cl"],
                                     np.where((luz > -0.3)[copa][:, None], C["folha"], C["esm"]))
                chumbo |= lan & (np.abs(dd - tr) < 0.55)
                tronco = lan & (np.abs(gx - tx) < 1.2) & (gy > ty + tr - 1) & (gy < ty + tr + 7)
                cor[tronco] = C["bronze"]
                motivo |= tronco
            relva = lan & (gy > 146)
            motivo |= relva
            cor[relva] = np.where((n2[relva] > 0.5)[:, None], C["esm"], C["folha"])
            chumbo |= lan & (np.abs(gy - 146) < 0.5)
        # travessas de ferro (barras horizontais)
        for yy in range(int(yt + r + 14), VITRAL["y1"], 22):
            chumbo |= lan & (np.abs(gy - yy) < 0.7)
    chumbo |= malha & ~motivo
    cor *= (0.92 + 0.16 * n)[..., None]
    cor[chumbo] = C["chumbo"]
    cor[~dentro] = 0
    return cor, chumbo


VIDRO_COR, VIDRO_CHUMBO = vitral_cores()


def vidro_em(gx: np.ndarray, gy: np.ndarray, borrado: np.ndarray | None = None) -> np.ndarray:
    tab = VIDRO_COR if borrado is None else borrado
    ix = np.clip(np.floor(gx).astype(np.int64), 0, tab.shape[1] - 1)
    iy = np.clip(np.floor(gy).astype(np.int64), 0, tab.shape[0] - 1)
    ok = (gx >= 0) & (gx < tab.shape[1]) & (gy >= 0) & (gy < tab.shape[0])
    return tab[iy, ix] * ok[..., None]


# ─────────────────────────────── Paredes laterais, ombreira, chão e tapete ───────────────────────────────
def no_nicho(z, y):
    """Nicho em arco na parede da esquerda (em Z, Y), entre as pilastras: guarda uma taça antiga, na penumbra."""
    zc, yb, r = 113.0, 78.0, 32.0
    return ((z >= zc - r) & (z <= zc + r) & (y >= 26) & (y <= yb)) | (((z - zc) ** 2 + (y - yb) ** 2 <= r * r) & (y > yb))


def parede_esquerda(t: Tela, ids, P) -> None:
    m = ids == ID["esq"]
    z, y = P[..., 2], P[..., 1]
    pintar_cantaria(t, m, z, y, 10, 24, 61, nivel=3.8)
    rod = m & (y < 18)
    pintar_cantaria(t, rod, z, y, 9, 34, 62, nivel=3.0)
    t.alb[m & (y >= 18) & (y < 20.5)] = PEDRA[6]
    t.nex[m & (y >= 18) & (y < 20.5)] += (0, 0.7, 0)
    # nicho: aduelas em volta, fundo recuado escuro, prateleira e a taça
    zc, yb, r = 113.0, 78.0, 32.0
    d = np.hypot(z - zc, y - yb)
    ad = m & ~no_nicho(z, y) & ((((d <= r + 5) & (y > yb))) | ((np.abs(z - zc) <= r + 5) & (y <= yb) & (y >= 22)))
    ang = np.arctan2(y - yb, z - zc)
    k = np.where(d > r + 3.8, 2, 5) + (hash2(np.floor(ang * 11 / math.pi), ang * 0, 3) > 0.5)
    t.alb[ad] = PEDRA[np.clip(k[ad], 0, 8)]
    rad = ad & (y > yb) & (np.abs(np.mod(ang * 11 / math.pi, 1) - 0.5) < 0.08)
    t.alb[rad] = ARGAMASSA
    dentro = m & no_nicho(z, y)
    n = ruido_em(63, 3, z, y)
    prof = np.clip((y - 26) / 70, 0, 1)
    t.alb[dentro] = PEDRA[np.clip(np.floor(1.6 + n * 1.6 - prof * 0.6 + BAYER_HW * 0.5), 0, 8).astype(int)[dentro]]
    t.ao[dentro] = 0.45
    t.nex[dentro] += (0, 0, 0)
    prat = m & (np.abs(z - zc) <= r) & (y >= 26) & (y < 29)
    t.alb[prat] = PEDRA[5]
    t.nex[prat] += (0, 0.8, 0)
    # a taça (silhueta de bronze escuro com um filete de luz)
    taca = m & (np.abs(z - zc) < 6.5 - np.clip(y - 46, 0, 9) * 0.35) & (y >= 29) & (y < 57)
    perna = m & (np.abs(z - zc) < 1.4) & (y >= 31) & (y < 42)
    pe = m & (np.abs(z - zc) < 5) & (y >= 29) & (y < 32)
    bojo = m & (np.hypot((z - zc) / 8, (y - 48) / 7) < 1) & (y >= 42)
    alca = m & (np.abs(np.hypot((z - zc) / 11, (y - 50) / 5.5) - 1) < 0.12) & (np.abs(z - zc) > 7)
    cal = pe | perna | (bojo & (y < 55)) | alca
    t.alb[cal] = OURO[2]
    t.alb[cal & (z > zc + 1)] = OURO[1]
    t.alb[cal & (np.abs(z - zc - 0.5) < 1.5)] = OURO[4]
    t.metal[cal] = 1.0
    t.ao[cal] = 0.8
    del taca


def pilastras_esq(t: Tela, ids, P, N) -> None:
    m = np.isin(ids, [s.id for s in SOLIDOS if s.mat == "pilastra"])
    z, y, x = P[..., 2], P[..., 1], P[..., 0]
    u = np.where(np.abs(N[..., 0]) > 0.5, z, x)
    pintar_cantaria(t, m, u, y, 14, 60, 71, paleta=PEDRA_CLARA, nivel=3.6, var=1.2)
    for y0, y1, k in ((0, 4, 3), (4, 6, 5), (6, 8, 2), (8, 10, 6), (158, 160, 6), (160, 163, 2), (163, 166, 5), (166, 168, 7)):
        mm = m & (y >= y0) & (y < y1)
        t.alb[mm] = PEDRA_CLARA[k]
    # a face de frente (Z) um tom abaixo: assim a quina vertical acende
    frente = m & (N[..., 2] > 0.5)
    t.alb[frente] *= 0.86


def parede_direita(t: Tela, ids, P) -> None:
    m = ids == ID["dir"]
    z, y = P[..., 2], P[..., 1]
    pintar_cantaria(t, m, z, y, 10, 24, 81, nivel=4.0)
    a = ARCO
    d = np.hypot(z - a["zc"], y - a["ym"])
    ang = np.arctan2(y - a["ym"], z - a["zc"])
    ad = m & (((d <= a["r"] + 7) & (y > a["ym"])) | ((((z >= a["z0"] - 7) & (z < a["z0"])) | ((z > a["z1"]) & (z <= a["z1"] + 7))) & (y <= a["ym"])))
    k = np.where(d > a["r"] + 5.5, 3, 6)
    k = np.where((y <= a["ym"]) & ((z < a["z0"] - 5.5) | (z > a["z1"] + 5.5)), 3, k)
    t.alb[ad] = PEDRA_CLARA[k[ad]]
    rad = ad & (y > a["ym"]) & (np.abs(np.mod(ang * 9 / math.pi, 1) - 0.5) < 0.07)
    t.alb[rad] = ARGAMASSA
    fiada = ad & (y <= a["ym"]) & (np.mod(y, 13) < 0.9)
    t.alb[fiada] = ARGAMASSA
    t.nex[ad & (d <= a["r"] + 2)] += (0, 0, 0.3)
    rod = m & (y < 18)
    pintar_cantaria(t, rod, z, y, 9, 34, 82, nivel=3.0)


def ombreira(t: Tela, ids, P) -> None:
    m = ids == ID["ombreira"]
    x, y = P[..., 0], P[..., 1]
    pintar_cantaria(t, m, x * 2.2, y, 13, 30, 91, paleta=PEDRA_CLARA, nivel=3.4)
    n = ruido_em(92, 3, x * 3, y)
    musgo = m & (n > 0.55) & (y < 40 + n * 30)
    t.alb[musgo] = MUSGO[np.clip(np.floor((n[musgo] - 0.55) * 14 + 1), 0, 5).astype(int)]


def chao(t: Tela, ids, P) -> None:
    m = ids == ID["chao"]
    x, z = P[..., 0], P[..., 2]
    # barra de lajes escuras junto das paredes e lajes claras polidas no meio (fileiras desencontradas)
    borda = m & ((x < XL + 9) | (x > XR - 9) | (z < 9))
    fila = np.floor(z / 21)
    desl = np.mod(fila, 2) * 10.5
    col = np.floor((x - XL + desl) / 21)
    bid = np.where(borda, -1 - np.floor(z / 30) * 7 - (x > 300) * 3, fila * 1000 + col)
    tom = hash2(fila, col, 101)
    n1 = ruido_em(102, 4, x * 2, z * 2)
    n2 = ruido_em(103, 1.5, x * 3, z * 3)
    k = 4.0 + (tom - 0.5) * 2.4 + (n1 - 0.5) * 1.8 + (n2 - 0.5) * 0.7
    # veios da pedra polida (linhas finas onduladas)
    veio = np.abs(ruido_em(104, 9, x * 2.5 + z, z * 2.5) - 0.5) < 0.018
    k = np.where(veio, k + 1.3, k)
    idx = np.clip(np.floor(k + BAYER_HW * 0.55), 0, 7).astype(int)
    t.alb[m] = LAJE[idx[m]]
    kb = np.clip(np.floor(2.4 + (n1 - 0.5) * 2 + BAYER_HW * 0.5), 0, 5).astype(int)
    t.alb[borda] = LAJE_ESC[kb[borda]]
    junta, topo, base = juntas(bid, m)
    t.alb[junta] = ARGAMASSA
    t.ao[junta] = 0.8
    t.refl[m] = np.where(borda[m], 0.12, 0.3)
    t.refl[junta] = 0.0
    t.esp[m] = 0.35
    # musgo nas juntas perto do arco da mata e no canto da esquerda
    nm = ruido_em(105, 5, x * 2, z * 2)
    perto_arco = suave(330, 412, x) * suave(10, 50, z) * (1 - suave(150, 190, z))
    mus = m & (junta | (np.roll(junta, 1, 1) & (nm > 0.6))) & (nm * (0.4 + perto_arco) > 0.42)
    t.alb[mus] = MUSGO[np.clip(np.floor(nm[mus] * 5), 0, 5).astype(int)]
    t.refl[mus] = 0
    tufo = m & (perto_arco > 0.5) & (nm > 0.78) & (x > XR - 9)
    t.alb[tufo] = MUSGO[np.clip(np.floor((nm[tufo] - 0.78) * 25 + 2), 0, 5).astype(int)]
    t.refl[tufo] = 0
    tapete(t, m, x, z)


def tapete(t: Tela, m, x, z) -> None:
    a = TAPETE
    tap = m & (x >= a["x0"]) & (x <= a["x1"]) & (z >= a["z0"])
    dx = np.minimum(x - a["x0"], a["x1"] - x)
    dz = z - a["z0"]
    d = np.minimum(dx, dz)
    n = ruido_em(111, 2, x * 3, z * 3)
    # campo esmeralda com um adamascado de losangos (um tom acima) e o pelo (ruído)
    u, v = x - (a["x0"] + a["x1"]) / 2, z
    los = (np.abs(np.mod(u + v * 0.5, 9) - 4.5) + np.abs(np.mod(v * 0.5 - u, 9) - 4.5)) < 2.2
    k = 3.9 + (n - 0.5) * 1.2 + los * 0.9
    t.alb[tap] = TAPETE_R[np.clip(np.floor(k + BAYER_HW * 0.5), 0, 6).astype(int)[tap]]
    fio1 = tap & (d < 0.9)
    barra = tap & (d >= 0.9) & (d < 3.6)
    fio2 = tap & (d >= 3.6) & (d < 4.4)
    t.alb[barra] = TAPETE_R[2]
    t.alb[fio1] = OURO[2]
    t.alb[fio2] = OURO[3]
    # losangos dourados na barra (ao longo de Z nas laterais)
    fase = np.mod(z, 9)
    ld = barra & (dx < dz) & (np.abs(fase - 4.5) * 0.45 + np.abs(dx - 2.25) < 0.9)
    t.alb[ld] = OURO[4]
    t.refl[tap] = 0.0
    t.esp[tap] = 0.05
    t.metal[fio1 | fio2 | ld] = 0.5


# ─────────────────────────────── Colunas ───────────────────────────────
def colunas(t: Tela, ids, P) -> None:
    for i, c in enumerate(COLUNAS):
        ids_c = [s.id for s in SOLIDOS if getattr(s, "col", None) == i]
        m = np.isin(ids, ids_c)
        x, y, z = P[..., 0], P[..., 1], P[..., 2]
        ang = np.arctan2(x - c["x"], z - c["z"])
        n = ruido_em(121 + i, 2.5, ang * 30, y * 1.5)
        fuste = m & (ids == [s.id for s in SOLIDOS if getattr(s, "col", None) == i and s.mat == "col_fuste"][0])
        # caneluras: 18 sulcos (a normal gira para os lados do sulco) e um tom mais escuro no fundo de cada um
        fase = np.mod(ang * 18 / (2 * math.pi), 1)
        sulco = np.sin(fase * 2 * math.pi)
        k = 4.2 + (n - 0.5) * 1.5 - (np.abs(fase - 0.5) > 0.38) * 1.2
        t.alb[fuste] = PEDRA_CLARA[np.clip(np.floor(k + BAYER_HW * 0.4), 0, 7).astype(int)[fuste]]
        tang = np.stack([np.cos(ang), np.zeros_like(ang), -np.sin(ang)], -1)
        t.nex[fuste] += (tang * sulco[..., None] * 0.45)[fuste]
        # anéis das juntas do fuste
        t.alb[fuste & (np.mod(y, 26) < 0.9)] = PEDRA_CLARA[2]
        outros = m & ~fuste
        k = 4.4 + (n - 0.5) * 1.6
        # molduras do capitel e da base: faixas claras e escuras
        faixa = np.where(m & (y > 166), np.mod(np.floor(y - 166), 4), np.mod(np.floor(y), 3))
        k = k + np.where(faixa == 0, 1.6, np.where(faixa == 2, -1.4, 0))
        t.alb[outros] = PEDRA_CLARA[np.clip(np.floor(k + BAYER_HW * 0.4), 0, 7).astype(int)[outros]]
        # folhas entalhadas no capitel (sobre a face da frente)
        cap = m & (y >= 172) & (y < 181)
        fol = cap & (np.mod(x * 0.7 + np.floor(y / 3) * 2, 4) < 1.4)
        t.alb[fol] = PEDRA_CLARA[6]
        t.esp[m] = 0.12


# ─────────────────────────────── Pedestais ───────────────────────────────
def pedestais(t: Tela, ids, P, N) -> None:
    por_id = {s.id: s for s in SOLIDOS if s.mat == "pedestal"}
    for p in PED:
        pedra, faixa, num = MATERIAL_PED[p["lugar"]]
        ids_p = [i for i, s in por_id.items() if s.lugar == p["lugar"]]
        m = np.isin(ids, ids_p)
        x, y, z = P[..., 0], P[..., 1], P[..., 2]
        ang = np.arctan2(x - p["X"], z - p["Z"])
        u = ang * 25 + p["lugar"] * 50
        n1 = ruido_em(130 + p["lugar"], 3, u * 1.4, y * 3)
        n2 = ruido_em(140 + p["lugar"], 1.2, u * 2, y * 4)
        veio = np.abs(ruido_em(150 + p["lugar"], 10, u * 1.2 + y * 3, y * 2.5 - u * 0.4) - 0.5) < (0.014 if p["lugar"] == 1 else 0.008)
        k = 4.5 + (n1 - 0.5) * 0.9 + (n2 - 0.5) * 0.35
        papel = np.full((H, W), "", dtype=object)
        tier = np.full((H, W), -1)
        for i in ids_p:
            mm = ids == i
            papel[mm] = por_id[i].papel
            tier[mm] = por_id[i].tier
        topo_sup = m & (N[..., 1] > 0.5)
        k = np.where(topo_sup, k + 1.2, k)
        k = np.where(papel == "gola", k - 1.4, k)
        k = np.where(papel == "toro", k + 0.8, k)
        k = np.where(papel == "degrau", k - (tier - 6) * 0.5, k)
        k = np.where(veio & (papel != "filete"), k - 1.6, k)
        idx = np.clip(np.floor(k + BAYER_HW * 0.25), 0, 7).astype(int)
        t.alb[m] = pedra[idx[m]]
        # quinas: a primeira linha logo abaixo de uma superfície de cima acende (chanfro), e as arestas verticais
        # entre facetas do octógono ganham um filete claro
        abaixo_do_topo = m & ~topo_sup & np.roll(topo_sup, 1, 0)
        t.alb[abaixo_do_topo] = pedra[np.clip(idx[abaixo_do_topo] + 2, 0, 7)]
        t.nex[abaixo_do_topo] += (0, 0.9, 0.2)
        nx = N[..., 0]
        aresta = m & ~topo_sup & (np.abs(nx - np.roll(nx, 1, 1)) > 0.2) & np.roll(m, 1, 1) & (papel != "filete") & np.isin(papel, ["tampo", "degrau"])
        t.alb[aresta] = pedra[np.clip(idx[aresta] + 2, 0, 7)]
        sob = m & ~topo_sup & (tier >= 0) & (np.roll(tier, 1, 0) >= 0) & (np.roll(tier, 1, 0) < tier) & ~np.roll(topo_sup, 1, 0)
        t.ao[sob] = 0.62
        # faixas de metal
        fil = m & (papel == "filete")
        kf = np.clip(np.floor(3 + (n2 - 0.5) * 1.5), 0, len(faixa) - 1).astype(int)
        t.alb[fil] = faixa[kf[fil]]
        t.metal[fil] = 1.0
        t.esp[m] = 0.3
        t.esp[topo_sup] = 0.45
        # no 1º lugar, um filete de ouro no meio do tampo e do primeiro degrau
        if p["lugar"] == 1:
            for papel_, frac in (("tampo", 0.5), ("degrau", 0.5)):
                for i in ids_p:
                    s = por_id[i]
                    if s.papel != papel_ or (papel_ == "degrau" and s.tier != 6):
                        continue
                    ym = s.y0 + (s.y1 - s.y0) * frac
                    sy = np.abs(y - ym) < (s.y1 - s.y0) * 0.14
                    linha = (ids == i) & sy & ~topo_sup
                    t.alb[linha] = OURO[3]
                    t.metal[linha] = 1.0
        # sombra de contato dos pés do cavaleiro no tampo
        cxs, cys = p["cx"], p["topo"]
        d = ((XA - cxs) / 14) ** 2 + ((YA - cys - 0.5) / 2.6) ** 2
        t.ao[topo_sup] *= np.clip(0.45 + 0.55 * d, 0.45, 1)[topo_sup]
        friso_entalhes(t, p, ids, por_id, pedra, faixa, num)


def friso_entalhes(t: Tela, p: dict, ids, por_id, pedra, faixa, num) -> None:
    """O número em metal embutido no friso, com sulco escuro em volta, e os enfeites de cada lugar."""
    s = next(s for s in por_id.values() if s.lugar == p["lugar"] and s.papel == "friso")
    fr = ids == s.id
    sx, sy = proj(p["X"], (s.y0 + s.y1) / 2, p["Z"] + s.r)
    sx, sy = int(round(float(sx))), int(round(float(sy)))
    dig = DIGITOS[p["lugar"]]
    hh, ww = len(dig), len(dig[0])
    x0, y0 = sx - ww // 2, sy - hh // 2
    cheio = np.zeros((H, W), bool)
    for j, linha in enumerate(dig):
        for i, ch in enumerate(linha):
            if ch == "#":
                cheio[y0 + j, x0 + i] = True
    sulco = np.zeros_like(cheio)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        sulco |= np.roll(np.roll(cheio, dy, 0), dx, 1)
    sulco &= ~cheio & fr
    t.alb[sulco] = pedra[1]
    t.ao[sulco] = 0.7
    # a borda de baixo do sulco pega luz (o corte da pedra)
    luz_sulco = sulco & ~np.roll(sulco, -1, 0) & ~np.roll(cheio, -1, 0)
    t.alb[luz_sulco] = pedra[6]
    cheio &= fr
    claro = cheio & ~np.roll(cheio, 1, 0)
    esc = cheio & ~np.roll(cheio, -1, 1)
    t.alb[cheio] = num[3]
    t.alb[cheio & ~np.roll(cheio, 1, 1)] = num[4]
    t.alb[claro] = num[min(5, len(num) - 1)]
    t.alb[esc] = num[2]
    t.metal[cheio] = 1.0
    t.esp[cheio] = 1.0
    r_fr = (s.y1 - s.y0) * p["s"]
    if p["lugar"] == 1:
        # louros em volta do número: dois ramos em arco com folhas em pares, ouro em relevo
        for lado in (-1, 1):
            for k in range(6):
                a = math.radians(105 + k * 23)
                rx, ry = 10.5, 8.0
                fx = sx + lado * math.cos(a - math.pi / 2) * rx * -1
                fx = sx + lado * (rx * math.sin(math.radians(20 + k * 25)))
                fy = sy + 6 - k * 2.4
                cx_, cy_ = int(round(fx)), int(round(fy))
                for dx, dy, kk in ((0, 0, 3), (lado, -1, 5), (-lado, 0, 2), (0, 1, 2), (lado, 0, 4)):
                    xx, yy = cx_ + dx, cy_ + dy
                    if fr[yy, xx] and not cheio[yy, xx]:
                        t.alb[yy, xx] = OURO[kk]
                        t.metal[yy, xx] = 1.0
                        t.esp[yy, xx] = 0.9
        # fitinha no pé dos louros
        for dx in (-1, 0, 1):
            if fr[sy + 7, sx + dx]:
                t.alb[sy + 7, sx + dx] = OURO[4]
                t.metal[sy + 7, sx + dx] = 1.0
        # embutidos de ouro nas bordas de cima e de baixo do friso (linha pontilhada de contas)
        for yy in (int(sy - r_fr / 2) + 1, int(sy + r_fr / 2) - 1):
            for xx in range(sx - 22, sx + 23, 3):
                if fr[yy, xx] and not cheio[yy, xx]:
                    t.alb[yy, xx] = OURO[4]
                    t.metal[yy, xx] = 1.0
    elif p["lugar"] == 2:
        # safiras lapidadas dos dois lados e uma faixa de lápis-lazúli embutida
        for lado in (-1, 1):
            gx = sx + lado * 10
            for dy in range(-2, 3):
                for dx in range(-(2 - abs(dy)), 3 - abs(dy)):
                    xx, yy = gx + dx, sy + dy
                    if fr[yy, xx]:
                        kk = 4 if (dx + dy) < 0 else 2 if (dx + dy) > 0 else 3
                        t.alb[yy, xx] = SAFIRA[kk]
                        t.metal[yy, xx] = 0.6
                        t.esp[yy, xx] = 1.0
            t.p(gx - 1, sy - 1, SAFIRA[5], metal=0.6)
            for dy in (-3, 3):
                t.p(gx, sy + dy, PRATA[3], metal=1.0)
        for yy in (int(sy - r_fr / 2) + 1, int(sy + r_fr / 2) - 1):
            mm = fr & (YA == yy) & ~cheio
            t.alb[mm] = SAFIRA[2]
            t.metal[mm] = 0.5
            t.alb[mm & (np.mod(XA, 4) == 0)] = PRATA[4]
    else:
        # cravos de bronze em losango e faixas de cobre
        for lado in (-1, 1):
            for gx in (sx + lado * 9, sx + lado * 15):
                for dx, dy, kk in ((0, -1, 5), (-1, 0, 4), (0, 0, 3), (1, 0, 2), (0, 1, 1)):
                    if fr[sy + dy, gx + dx]:
                        t.alb[sy + dy, gx + dx] = BRONZE[kk]
                        t.metal[sy + dy, gx + dx] = 1.0
        for yy in (int(sy - r_fr / 2) + 1, int(sy + r_fr / 2) - 1):
            mm = fr & (YA == yy) & ~cheio
            t.alb[mm] = BRONZE[3]
            t.metal[mm] = 1.0


# ─────────────────────────────── A mata lá fora, a hera e as tochas ───────────────────────────────
FOLHA_MATA = pal("#1a3322", "#244a2a", "#2f6030", "#3e7634", "#538c3a", "#6ea444", "#8fbc52", "#b6d066", "#dce496")
TRONCO = pal("#1c140e", "#2c2016", "#3e2e1e", "#524028", "#6a5434", "#846a42")
CEU_FORA = pal("#e8a85e", "#f0bc6e", "#f4cc84", "#f8dc9e", "#fbe8bc")


def carimbar_copa(alb, msk, cx, cy, r, seed, luz=(0.7, -0.6), pal_=FOLHA_MATA, dens=0.7, desl=0) -> None:
    """Copa folha por folha: carimbos de 2 a 4 px sombreados como esfera (luz da direita e do alto)."""
    g = np.random.default_rng(seed)
    n = int(r * r * dens * 1.6)
    lx, ly = luz
    for _ in range(n):
        a = g.random() * 6.283
        d = math.sqrt(g.random()) * r
        x = cx + math.cos(a) * d
        y = cy + math.sin(a) * d * 0.85
        nx, ny = (x - cx) / r, (y - cy) / r
        k = 0.45 + 0.42 * (nx * lx + ny * ly) + g.random() * 0.25 - d / r * 0.12
        ki = int(np.clip(round(k * (len(pal_) - 1)) + desl, 0, len(pal_) - 1))
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1))[: int(g.integers(2, 5))]:
            xx, yy = int(x) + dx, int(y) + dy
            if 0 <= xx < alb.shape[1] and 0 <= yy < alb.shape[0]:
                alb[yy, xx] = pal_[ki]
                msk[yy, xx] = True


def mata(t: Tela, ids) -> None:
    """O que se vê pelo arco: céu de fim de tarde, a mata enevoada ao longe, dois troncos, folhagem e samambaias."""
    m = ids == ID["fora"]
    alb = np.zeros((H, W, 3), np.float32)
    msk = np.zeros((H, W), bool)
    # céu: dourado claro, mais claro no alto à direita (o sol)
    tc = np.clip(1 - (YA - 20) / 160, 0, 1) * 0.7 + np.clip((XA - 430) / 50, 0, 1) * 0.3
    alb[:] = CEU_FORA[np.clip(np.floor(tc * 5 + BAYER_HW * 0.8), 0, 4).astype(int)]
    # mata do fundo: silhueta ondulada enevoada
    perfil = 92 + 10 * np.sin(XA * 0.21) + 6 * np.sin(XA * 0.53 + 1) + ruido(171, 4)[0] * 8
    longe = YA > perfil
    nev = pal("#8a9a64", "#76885a", "#647850", "#526846")
    kk = np.clip(np.floor((YA - perfil) / 14 + ruido(172, 3) * 1.2 + BAYER_HW * 0.6), 0, 3).astype(int)
    alb[longe] = nev[kk[longe]]
    # copas do meio
    for (cx, cy, r, sd, dl) in ((462, 46, 19, 2, 0), (486, 84, 16, 3, 0), (474, 120, 15, 5, -1), (466, 160, 13, 7, -1),
                                (436, 58, 14, 1, -2), (446, 104, 13, 4, -1), (436, 140, 13, 6, -2), (430, 92, 9, 8, -3)):
        carimbar_copa(alb, msk, cx, cy, r, 180 + sd, dens=1.0, desl=dl)
    # troncos (casca com veios verticais, borda direita acesa)
    for (tx, larg, y0) in ((452, 4, 40), (474, 6, 60)):
        for y in range(y0, 210):
            for dx in range(larg):
                xx = tx + dx
                if xx >= W:
                    continue
                v = ruido(173, 2)[y, xx] if xx < W else 0.5
                k = 2 + (dx == larg - 1) * 2 + (dx == 0) * -1 + int(v * 2)
                alb[y, xx] = TRONCO[int(np.clip(k, 0, 5))]
    # folhagem baixa e samambaias na soleira (mais escuras: estão na sombra da parede)
    for (cx, cy, r, sd) in ((434, 186, 10, 11), (450, 194, 12, 12), (470, 188, 13, 13), (444, 204, 9, 14)):
        carimbar_copa(alb, msk, cx, cy, r, 190 + sd, dens=1.1, desl=-1)
    g = np.random.default_rng(175)
    for _ in range(30):
        x0, y0 = 428 + g.random() * 52, 196 + g.random() * 14
        for k in range(6):
            xx, yy = int(x0 + k * (0.6 if g.random() < 0.5 else -0.6)), int(y0 - k)
            if 0 <= xx < W and 0 <= yy < H:
                alb[yy, xx] = FOLHA_MATA[min(7, 3 + k // 2)]
    t.alb[m] = alb[m]
    # é tudo luz de fora: emissivo (o sol pega mais em cima e à direita)
    brilho = 0.95 + 0.35 * np.clip((XA - 430) / 50, 0, 1) - np.clip((YA - 150) / 60, 0, 1) * 0.35
    t.emi[m] = (alb * brilho[..., None])[m] * 0.82


def hera(t: Tela, ids, P, frente: np.ndarray | None = None) -> np.ndarray:
    """Hera pendurada no arco da mata e subindo pela parede da direita; devolve a máscara (para a luz de contraluz)."""
    g = np.random.default_rng(SEMENTE + 200)
    mh = np.zeros((H, W), bool)
    dentro_arco = ids == ID["fora"]
    ok = np.isin(ids, [ID["dir"], ID["ombreira"], ID["fora"], ID["fundo"]])
    a = ARCO
    # ramos que nascem no alto do arco e descem
    for i in range(16):
        ang = math.radians(10 + i * 10.5 + g.random() * 6)
        zz = a["zc"] - math.cos(ang) * (a["r"] + 3)
        yy = a["ym"] + math.sin(ang) * (a["r"] + 3)
        x, y = proj(XR, yy, zz)
        x, y = float(x), float(y)
        comp = 10 + g.random() * (34 if 40 < i * 10 < 140 else 18)
        for k in range(int(comp)):
            xi, yi = int(x), int(y)
            if 0 <= xi < W and 0 <= yi < H and ok[yi, xi]:
                t.alb[yi, xi] = HERA[1]
                mh[yi, xi] = True
                if k % 2 == 0:
                    lado = 1 if g.random() < 0.5 else -1
                    for dx, dy, kk in ((lado, 0, 4), (lado, 1, 3), (lado * 2, 0, 5), (lado * 2, 1, 2), (lado, -1, 6)):
                        xx, yy2 = xi + dx, yi + dy
                        if 0 <= xx < W and 0 <= yy2 < H and ok[yy2, xx] and g.random() < 0.88:
                            t.alb[yy2, xx] = HERA[int(np.clip(kk + g.integers(-1, 2), 0, 7))]
                            mh[yy2, xx] = True
            x += g.random() * 1.2 - 0.6
            y += 1
    # trepadeira na parede da direita acima do arco e no canto do fundo
    for i in range(10):
        x, y = 428 + g.random() * 50, 8 + g.random() * 30
        for k in range(int(10 + g.random() * 22)):
            xi, yi = int(x), int(y)
            if 0 <= xi < W and 0 <= yi < H and ok[yi, xi] and not dentro_arco[yi, xi]:
                t.alb[yi, xi] = HERA[2]
                mh[yi, xi] = True
                for dx, dy in ((1, 0), (-1, 0), (0, 1)):
                    xx, yy2 = xi + dx, yi + dy
                    if 0 <= xx < W and 0 <= yy2 < H and ok[yy2, xx] and g.random() < 0.55:
                        t.alb[yy2, xx] = HERA[int(g.integers(2, 7))]
                        mh[yy2, xx] = True
            x += g.random() * 2 - 1
            y += 0.6 + g.random() * 0.8
    t.nex[mh] += (0, 0.2, 0.3)
    t.metal[mh] = 0
    t.emi[mh] = 0
    t.esp[mh] = 0.15
    return mh


def tochas_xy() -> list[tuple[int, int]]:
    """Onde a chama de cada tocha nasce (o alto do bocal), em px da arte: as duas colunas e a pilastra da esquerda."""
    out = []
    for c in COLUNAS:
        x, y = proj(c["x"], TOCHA_Y, c["z"] + c["r"])
        out.append((int(round(float(x))), int(round(float(y)))))
    x, y = proj(XL + 7, TOCHA_Y, 174.5)
    out.append((int(round(float(x))), int(round(float(y)))))
    return out


def tochas_mundo() -> list[np.ndarray]:
    out = [np.array([c["x"], TOCHA_Y + 5, c["z"] + c["r"] + 4]) for c in COLUNAS]
    out.append(np.array([XL + 11, TOCHA_Y + 5, 174.5]))
    return out


def suportes(t: Tela) -> None:
    """Suporte de ferro de cada tocha: braçadeira, haste, bocal com aro de ouro e brasa (a chama é do site)."""
    for i, (x, y) in enumerate(tochas_xy()):
        larga = 9 if i < 2 else 6
        for dx in range(-larga, larga + 1):
            for yy, k in ((y + 7, 2), (y + 8, 1)):
                t.p(x + dx, yy, FERRO[k + (1 if dx < 0 else 0)], metal=0.7)
        for yy in range(y + 3, y + 7):
            t.p(x, yy, FERRO[2], metal=0.7)
            t.p(x + 1, yy, FERRO[1], metal=0.7)
        t.p(x - 1, y + 6, FERRO[3], metal=0.7)
        t.p(x + 2, y + 6, FERRO[1], metal=0.7)
        # bocal (taça de ferro com aro dourado)
        for dx in range(-3, 4):
            t.p(x + dx, y, OURO[4 if dx < 0 else 3], metal=1.0)
        for dx in range(-3, 4):
            t.p(x + dx, y + 1, FERRO[3 if dx < 0 else 1], metal=0.7)
        for dx in range(-2, 3):
            t.p(x + dx, y + 2, FERRO[2 if dx < 0 else 0], metal=0.7)
        t.p(x, y + 3, FERRO[1], metal=0.7)
        # brasa no alto do bocal
        for dx in range(-2, 3):
            t.p(x + dx, y - 1, "#ff9a3a" if abs(dx) < 2 else "#c8502a", emi=hexa("#ffa040") * (1.8 if abs(dx) < 2 else 1.0))


# ─────────────────────────────── Pintura completa na grade de arte ───────────────────────────────
def oclusao_ambiente(P: np.ndarray, N: np.ndarray, ids: np.ndarray, amostras: int = 24, alcance: float = 26.0):
    """Oclusão de ambiente traçada: de cada pixel saem raios no hemisfério da normal; quanto mais batem perto, mais
    escuro (cantos das paredes, pé dos pedestais e das colunas, embaixo das molduras)."""
    m = ~np.isin(ids, [ID["fora"], ID["vidro"]]) & (ids >= 0)
    p = P[m].reshape(-1, 3)
    n = N[m].reshape(-1, 3)
    g = np.random.default_rng(SEMENTE + 300)
    livre = np.zeros(len(p), np.float32)
    # base ortonormal por pixel
    a = np.where(np.abs(n[:, 1:2]) < 0.9, np.array([[0, 1, 0]]), np.array([[1, 0, 0]]))
    tx = np.cross(n, a)
    tx /= np.linalg.norm(tx, axis=1, keepdims=True)
    ty = np.cross(n, tx)
    for k in range(amostras):
        u1, u2 = (k + g.random()) / amostras, g.random()
        r = math.sqrt(u1)
        th = 2 * math.pi * u2
        d = tx * (r * math.cos(th)) + ty * (r * math.sin(th)) + n * math.sqrt(max(0.0, 1 - u1))
        t, _, _ = tracar(p + n * 0.3, d)
        livre += np.clip(t / alcance, 0, 1) ** 0.7
    out = np.ones((H, W), np.float32)
    out[m] = livre / amostras
    return out


def pintar():
    T, ids, N, P = tracar_tela(W, H, 1)
    t = Tela()
    parede_fundo(t, ids)
    parede_esquerda(t, ids, P)
    pilastras_esq(t, ids, P, N)
    parede_direita(t, ids, P)
    ombreira(t, ids, P)
    chao(t, ids, P)
    colunas(t, ids, P)
    pedestais(t, ids, P, N)
    vid = ids == ID["vidro"]
    gx, gy = P[..., 0], 200 - P[..., 1]
    cor = vidro_em(gx, gy)
    brilho = 1.2 + 0.35 * np.clip((120 - gy) / 100, 0, 1)
    t.emi[vid] = (cor * brilho[..., None])[vid]
    t.alb[vid] = 0
    mata(t, ids)
    suportes(t)
    mh = hera(t, ids, P)
    ao = oclusao_ambiente(P, N, ids)
    return dict(t=t, ids=ids, N=N, P=P, ao=ao, hera=mh)


# ─────────────────────────────── Luz em 3x ───────────────────────────────
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


def em_degraus(i: np.ndarray, n: int = 5, k: float = 0.45) -> np.ndarray:
    """Mistura a luz contínua com a mesma luz em faixas presas à grade de arte (borda em degraus de pixel art)."""
    hh, ww = i.shape
    blocos = i.reshape(hh // ESC, ESC, ww // ESC, ESC).mean((1, 3))
    faixas = ampliar(np.floor(blocos * n + 0.35) / n)
    return i * (1 - k) + faixas * k


def salpico_mata(z: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Quanto do sol passa pelas folhas lá fora (no plano do arco): mais aberto embaixo, copa fechada no alto."""
    tam = 512
    n = ruido(401, 7, tam, tam) * 0.6 + ruido(402, 3, tam, tam) * 0.4
    iz = np.clip((z * 2).astype(np.int64) + 40, 0, tam - 1)
    iy = np.clip((y * 2).astype(np.int64) + 40, 0, tam - 1)
    v = n[iy, iz]
    limiar = 0.34 + np.clip((y - 40) / 120, 0, 1) * 0.24
    return 0.15 + 0.85 * suave(limiar, limiar + 0.14, v)


def luz_sol_vitral(P: np.ndarray, borrado: np.ndarray) -> np.ndarray:
    """Cor do sol que chega em cada ponto atravessando o vitral (o vidro de trás e o furo da parede)."""
    s0 = P[..., 2] / (-SOL_V[2])
    x0 = P[..., 0] + SOL_V[0] * s0
    y0 = 200 - (P[..., 1] + SOL_V[1] * s0)
    furo = na_lanceta(x0, y0)
    s1 = (P[..., 2] + 7) / (-SOL_V[2])
    gx = P[..., 0] + SOL_V[0] * s1
    gy = 200 - (P[..., 1] + SOL_V[1] * s1)
    cor = vidro_em(gx, gy, borrado)
    return cor * (furo & (P[..., 2] > 0.2))[..., None]


def luz_sol_mata(P: np.ndarray) -> np.ndarray:
    zh, yh, s = ate_arco(P)
    dentro = no_arco(zh, yh, -1.5) & (s > 0) & (P[..., 0] < XR + 0.5)
    return dentro * salpico_mata(zh, yh)


def montar(base: dict) -> dict:
    t: Tela = base["t"]
    ids_b = base["ids"]
    hh, ww = H * ESC, W * ESC
    T3, ids3, N3, P3 = tracar_tela(ww, hh, ESC)
    ids_up = ampliar(ids_b)
    bate = ids3 == ids_up
    P3 = np.where(bate[..., None], P3, ampliar(base["P"]))
    N3 = np.where(bate[..., None], N3, ampliar(base["N"]))
    alb = ampliar(t.alb)
    nrm = N3 + ampliar(t.nex)
    nrm /= np.maximum(np.linalg.norm(nrm, axis=-1, keepdims=True), 1e-6)
    metal = ampliar(t.metal)[..., None]
    esp = ampliar(t.esp)[..., None]
    ao = ampliar(base["ao"] * t.ao)
    ao = desfocar(ao[..., None], 1.0)[..., 0]
    fora = (ids_up == ID["fora"]) | (ids_up == ID["vidro"])
    sala = ~fora
    C = np.array([VPX, OLHO, F])
    V = C - P3
    V /= np.linalg.norm(V, axis=-1, keepdims=True)
    Pf = P3.reshape(-1, 3)

    # ── 1. sol pelo vitral (cor do vidro, sombra dos pedestais)
    borrado = desfocar(VIDRO_COR, 1.2)
    # a luz que passa pelo vidro: parte com a cor do vidro, parte o dourado do sol (o vidro é claro e fino)
    borrado = borrado * 0.6 + borrado.mean(-1, keepdims=True) * hexa("#ffc878") * 0.55
    cv = luz_sol_vitral(P3, borrado).astype(np.float32)
    ndl_v = np.clip((nrm * SOL_V).sum(-1), 0, 1)
    alvo = (cv.max(-1) > 0.01) & (ndl_v > 0) & sala
    vis_v = np.zeros(hh * ww, np.float32)
    vis_v[alvo.ravel()] = visivel(Pf[alvo.ravel()], SOL_V.astype(np.float64))
    vis_v = vis_v.reshape(hh, ww)
    vis_v = desfocar(vis_v[..., None], 1.2)[..., 0]
    I_v = cv * (ndl_v * vis_v)[..., None] * 2.5

    # ── 2. sol da tarde pelo arco da mata (salpicado pelas folhas)
    km = luz_sol_mata(P3).astype(np.float32)
    ndl_m = np.clip((nrm * SOL_M).sum(-1), 0, 1)
    alvo = (km > 0.01) & (ndl_m > 0) & sala
    vis_m = np.zeros(hh * ww, np.float32)
    vis_m[alvo.ravel()] = visivel(Pf[alvo.ravel()], SOL_M.astype(np.float64))
    vis_m = desfocar(vis_m.reshape(hh, ww)[..., None], 1.2)[..., 0]
    i_m = em_degraus(km * ndl_m * vis_m, 4, 0.35)
    I_m = i_m[..., None] * hexa("#ffd090") * 1.4

    # ── 3. tochas: luz pontual quente com a borda em faixas
    I_t = np.zeros((hh, ww, 3), np.float32)
    for k, L0 in enumerate(tochas_mundo()):
        d = L0[None, None, :] - P3
        dist = np.linalg.norm(d, axis=-1)
        Ld = d / np.maximum(dist[..., None], 1e-6)
        ndl = np.clip((nrm * Ld).sum(-1), 0, 1) * 0.8 + 0.2
        raio = 70.0 if k < 2 else 48.0
        q = np.exp(-(dist / raio) ** 2 * 1.6) + 0.35 / (1 + (dist / 8) ** 2)
        q = em_degraus(np.clip(q, 0, 2).astype(np.float32), 6, 0.5)
        forca = 1.25 if k < 2 else 0.55
        I_t += (q * ndl)[..., None] * hexa("#ff9a48") * forca

    # ── 3b. lustre de velas fora do quadro (no alto, perto da câmera): modela a frente dos pedestais e projeta a
    # sombra deles para trás, no chão e na parede
    L0 = LUSTRE
    d = L0[None, None, :] - P3
    dist = np.linalg.norm(d, axis=-1)
    Ld = d / np.maximum(dist[..., None], 1e-6)
    ndl = np.clip((nrm * Ld).sum(-1), 0, 1)
    alvo = (ndl > 0) & sala
    vis_l = np.zeros(hh * ww, np.float32)
    vis_l[alvo.ravel()] = visivel_ponto(Pf[alvo.ravel()], L0)
    vis_l = desfocar(vis_l.reshape(hh, ww)[..., None], 2.0)[..., 0]
    q = np.exp(-((P3[..., 0] - 322) / 190) ** 2 - ((P3[..., 2] - 120) / 160) ** 2 - (P3[..., 1] / 260) ** 2)
    q = em_degraus((q * ndl * vis_l).astype(np.float32), 6, 0.4)
    I_l = q[..., None] * hexa("#ffb868") * 0.95

    # ── 4. ambiente: céu frio por cima, rebote quente do chão, rebote dourado do sol no pódio
    ny = nrm[..., 1:2]
    amb = (hexa("#36405e") * (0.5 + 0.5 * ny) + hexa("#4a3424") * (0.5 - 0.5 * ny)) * 0.85
    rebote = np.exp(-(((P3[..., 0] - 318) / 70) ** 2 + ((P3[..., 2] - 70) / 70) ** 2 + (P3[..., 1] / 90) ** 2))
    amb = amb + rebote[..., None] * hexa("#c89048") * 0.32
    frente = np.clip((nrm * V).sum(-1), 0, 1)[..., None] * hexa("#5a4a44") * 0.16
    luz_dif = (amb + frente) * ao[..., None] + I_v + I_m + I_t + I_l

    # ── 5. especular (ouro e pedra polida)
    def brilho(L, cor, ganho):
        Hh = L[None, None, :] + V
        Hh /= np.maximum(np.linalg.norm(Hh, axis=-1, keepdims=True), 1e-6)
        nh = np.clip((nrm * Hh).sum(-1), 0, 1)
        exp_ = np.where(metal[..., 0] > 0.5, 28.0, 60.0)
        return (nh ** exp_)[..., None] * cor * ganho

    Ll = LUSTRE[None, None, :] - P3
    Ll /= np.linalg.norm(Ll, axis=-1, keepdims=True)
    spec = brilho(SOL_V, 1.0, 1.0) * I_v * 1.4 + brilho(SOL_M, 1.0, 1.0) * I_m * 1.3
    for k, L0 in enumerate(tochas_mundo()):
        d = L0[None, None, :] - P3
        Ld = d / np.maximum(np.linalg.norm(d, axis=-1, keepdims=True), 1e-6)
        Hh = Ld + V
        Hh /= np.maximum(np.linalg.norm(Hh, axis=-1, keepdims=True), 1e-6)
        nh = np.clip((nrm * Hh).sum(-1), 0, 1)
        spec += (nh ** 24)[..., None] * I_t * 0.6
    Hh = Ll + V
    Hh /= np.maximum(np.linalg.norm(Hh, axis=-1, keepdims=True), 1e-6)
    nh = np.clip((nrm * Hh).sum(-1), 0, 1)
    spec += (nh ** 30)[..., None] * I_l * 1.2
    spec = spec * esp * np.where(metal > 0.5, alb * 2.6 + 0.15, 1.0)
    dif = alb * np.where(metal > 0.5, 0.85, 1.0)
    # metal reflete o salão quente em volta (um brilho de ambiente que não depende da direção)
    img = dif * luz_dif + spec + alb * metal * hexa("#c89858") * 0.22
    # hera em contraluz: as folhas na frente do vão claro deixam passar o sol (verde-ouro)
    hera3 = ampliar(base["hera"].astype(np.float32))
    claro_atras = desfocar((ampliar(t.emi).max(-1, keepdims=True) > 0.5).astype(np.float32), 6)[..., 0]
    img += (hera3 * claro_atras)[..., None] * alb * hexa("#d8f080") * 2.2
    emi = ampliar(t.emi)
    # profundidade de campo: a mata de fora e o vidro um pouco macios
    emi_m = desfocar(emi * (ids_up == ID["fora"])[..., None], 1.0)
    emi = np.where((ids_up == ID["fora"])[..., None], emi_m, emi)
    img = np.where(fora[..., None], emi, img + emi)

    # ── 6. reflexo do salão nas lajes polidas
    refl = ampliar(t.refl)
    rm = refl > 0
    if rm.any():
        p0 = P3[rm]
        dv = p0 - C
        dv[:, 1] *= -1
        dv /= np.linalg.norm(dv, axis=1, keepdims=True)
        tq, iq, _ = tracar(p0 + dv * 0.2, dv)
        q = p0 + dv * tq[:, None]
        qx, qy = proj(q[:, 0], q[:, 1], q[:, 2])
        fonte = desfocar(img, 3.0)
        ix = np.clip((qx * ESC).astype(int), 0, ww - 1)
        iy = np.clip((qy * ESC).astype(int), 0, hh - 1)
        amostra = fonte[iy, ix]
        rasante = np.clip(1 - np.abs(dv[:, 1]) * 2.2, 0.25, 1)
        dist = np.clip(1 - tq / 260, 0.15, 1)
        img[rm] += amostra * (refl[rm] * rasante * dist)[:, None] * 0.9
    return dict(img=img, P3=P3, ids_up=ids_up, nrm=nrm, borrado=borrado)


# ─────────────────────────────── Feixes volumétricos e poeira ───────────────────────────────
GRADE = dict(x0=180.0, x1=432.0, y0=0.0, y1=204.0, z0=-4.0, z1=236.0, passo=2.5)


def grade_de_luz(borrado: np.ndarray):
    """Visibilidade do sol (pelo vitral e pela mata) numa grade 3D do ar do salão, com a sombra dos sólidos."""
    g = GRADE
    xs = np.arange(g["x0"], g["x1"], g["passo"])
    ys = np.arange(g["y0"], g["y1"], g["passo"])
    zs = np.arange(g["z0"], g["z1"], g["passo"])
    Z, Y, X = np.meshgrid(zs, ys, xs, indexing="ij")
    P = np.stack([X, Y, Z], -1).reshape(-1, 3)
    cv = luz_sol_vitral(P, borrado).astype(np.float32)
    km = luz_sol_mata(P).astype(np.float32)
    for (cor, L) in ((cv, SOL_V), (km, SOL_M)):
        alvo = (cor.reshape(len(P), -1).max(-1) > 0.005)
        vis = np.zeros(len(P), np.float32)
        vis[alvo] = visivel(P[alvo], L.astype(np.float64))
        if cor.ndim == 2:
            cor *= vis[:, None]
        else:
            cor *= vis
    # dentro de um sólido não há ar
    forma = (len(zs), len(ys), len(xs))
    return cv.reshape(forma + (3,)), km.reshape(forma)


def amostrar_grade(G: np.ndarray, P: np.ndarray) -> np.ndarray:
    g = GRADE
    ix = np.clip(((P[..., 0] - g["x0"]) / g["passo"]).astype(np.int64), 0, G.shape[2] - 1)
    iy = np.clip(((P[..., 1] - g["y0"]) / g["passo"]).astype(np.int64), 0, G.shape[1] - 1)
    iz = np.clip(((P[..., 2] - g["z0"]) / g["passo"]).astype(np.int64), 0, G.shape[0] - 1)
    ok = ((P[..., 0] >= g["x0"]) & (P[..., 0] < g["x1"]) & (P[..., 1] >= g["y0"]) & (P[..., 1] < g["y1"]) &
          (P[..., 2] >= g["z0"]) & (P[..., 2] < g["z1"]))
    v = G[iz, iy, ix]
    return v * (ok[..., None] if v.ndim > ok.ndim else ok)


def volumetrico(montado: dict, Gv: np.ndarray, Gm: np.ndarray, passos: int = 120):
    """Marcha pelo ar ao longo de cada raio da câmera (em meia resolução): soma a luz espalhada pela poeira."""
    k = 2                                         # 720 x 405
    hh, ww = H * ESC // k, W * ESC // k
    ys, xs = np.mgrid[0:hh, 0:ww].astype(np.float64)
    xs = (xs + 0.5) / (ESC / k) / 1
    ys = (ys + 0.5) / (ESC / k)
    xs = xs / k * k
    o, d = raios((xs).ravel() / 1, ys.ravel())
    o, d = raios(((np.mgrid[0:hh, 0:ww][1] + 0.5) * k / ESC).ravel(), ((np.mgrid[0:hh, 0:ww][0] + 0.5) * k / ESC).ravel())
    P3 = montado["P3"][k // 2::k, k // 2::k].reshape(-1, 3)
    z_fim = np.clip(P3[:, 2], GRADE["z0"], None)
    z_ini = np.full_like(z_fim, 232.0)
    acum_v = np.zeros((len(o), 3), np.float32)
    acum_m = np.zeros(len(o), np.float32)
    tam = 512
    nd1 = ruido(411, 22, tam, tam)
    nd2 = ruido(412, 7, tam, tam)
    dlen = np.linalg.norm(d, axis=1)
    for i in range(passos):
        f = (i + 0.5) / passos
        Z = z_ini + (z_fim - z_ini) * f
        tt = F - Z
        p = o + d * tt[:, None]
        dz = np.abs(z_fim - z_ini) / passos * dlen
        # poeira em nuvens (ruído preso ao espaço, esticado na direção dos fachos)
        u = (p[:, 0] + p[:, 2] * 0.45) * 0.9
        v = (p[:, 1] + p[:, 2] * 0.6) * 0.9
        iu = np.mod(u.astype(np.int64) + 100, tam)
        iv = np.mod(v.astype(np.int64) + 100, tam)
        dens = 0.55 + 0.65 * nd1[iv, iu] + 0.35 * nd2[iv, np.mod(iu * 2, tam)]
        acum_v += amostrar_grade(Gv, p) * (dens * dz)[:, None]
        acum_m += amostrar_grade(Gm, p) * dens * dz
    vv = acum_v.reshape(hh, ww, 3) * 0.02
    vm = acum_m.reshape(hh, ww) * 0.0062
    vv = desfocar(vv.repeat(k, 0).repeat(k, 1), 2.0)
    vm = desfocar(vm.repeat(k, 0).repeat(k, 1)[..., None], 2.0)[..., 0]
    return vv, vm


def poeira(Gv: np.ndarray, Gm: np.ndarray, n: int = 5200):
    """Grãos de poeira nos fachos: pontos no espaço, projetados, do tamanho de 1 pixel de arte (perto) ou menos."""
    g = np.random.default_rng(SEMENTE + 500)
    P = np.stack([g.uniform(200, 425, n), g.uniform(4, 190, n), g.uniform(0, 200, n)], -1)
    cv = amostrar_grade(Gv, P).max(-1)
    cm = amostrar_grade(Gm, P)
    x, y = proj(P[:, 0], P[:, 1], P[:, 2])
    camada_v = np.zeros((H * ESC, W * ESC), np.float32)
    camada_m = np.zeros((H * ESC, W * ESC), np.float32)
    for i in range(n):
        for cam, val in ((camada_v, cv[i]), (camada_m, cm[i])):
            if val < 0.05:
                continue
            X, Y = int(x[i] * ESC), int(y[i] * ESC)
            tam = 3 if P[i, 2] > 110 and g.random() < 0.6 else 2
            if 0 <= X < W * ESC - 3 and 0 <= Y < H * ESC - 3:
                cam[Y:Y + tam, X:X + tam] += val * (0.35 + g.random() * 0.75)
    return camada_v, camada_m


# ─────────────────────────────── Acabamento ───────────────────────────────
def acabar(img: np.ndarray) -> np.ndarray:
    """Brilho (bloom), curva de tom, cor (altas luzes quentes, sombras frias), lado do texto calmo, vinheta e grão."""
    hh, ww = img.shape[:2]
    GY, GX = np.mgrid[0:hh, 0:ww].astype(np.float32)
    xn, yn = GX / ww, GY / hh
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.8) * 4, 0, 1), 0, 3)
    img = img + desfocar(claro, 10) * 0.32 + desfocar(claro, 34) * 0.3
    joelho = 0.7
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, fr = hexa("#ffd9a0"), hexa("#8fa0d8")
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.8 + 0.2 * (lum * q + (1 - lum) * (fr * 0.5 + 0.5)))
    img = np.clip((img - 0.45) * 1.06 + 0.45, 0, 1.2)
    # lado do texto (x < 190 de 480): menos contraste e mais escuro, sem corte visível
    calma = (1 - suave(0.33, 0.44, xn))[..., None]
    media = desfocar(np.clip(img, 0, 1.2), 14)
    img = media + (img - media) * (1 - 0.32 * calma)
    img *= 1 - 0.2 * calma
    # chão de baixo calmo (as placas do pódio ficam embaixo da cena)
    baixo = suave(0.86, 1.0, yn)[..., None]
    img *= 1 - 0.25 * baixo
    v = (xn - 0.56) ** 2 * 1.1 + (yn - 0.48) ** 2 * 1.4
    img *= (1 - np.clip(v - 0.07, 0, 1) * 1.05)[..., None]
    gg = np.random.default_rng(99)
    img = img + (gg.random(img.shape[:2]).astype(np.float32)[..., None] - 0.5) * 0.014
    return np.clip(img, 0, 1)


def profundidade(img: np.ndarray) -> np.ndarray:
    """Primeiro plano (o chão de baixo) um pouco desfocado."""
    hh, ww = img.shape[:2]
    GY = np.mgrid[0:hh, 0:ww][0].astype(np.float32) / ESC
    perto = suave(236, 266, GY)[..., None]
    return img * (1 - perto * 0.75) + desfocar(img, 3.0) * perto * 0.75


def frente_hera() -> np.ndarray:
    """Camada da frente (RGBA, 3x): ramos de hera pendurados no alto à direita, desfocados e em contraluz."""
    alb = np.zeros((H, W, 3), np.float32)
    msk = np.zeros((H, W), np.float32)
    g = np.random.default_rng(SEMENTE + 600)
    for i in range(7):
        x = 446 + i * 5.5 + g.random() * 3
        y = -2.0
        comp = 18 + g.random() * 40
        for k in range(int(comp)):
            xi, yi = int(x), int(y)
            if 0 <= xi < W and 0 <= yi < H:
                alb[yi, xi] = HERA[1]
                msk[yi, xi] = 1
                if k % 3 == 0:
                    lado = 1 if (k // 3) % 2 else -1
                    for dx, dy, kk in ((lado, 0, 3), (lado * 2, 0, 4), (lado, 1, 2), (lado * 2, -1, 5), (lado * 3, 0, 3)):
                        xx, yy = xi + dx, yi + dy
                        if 0 <= xx < W and 0 <= yy < H:
                            alb[yy, xx] = HERA[kk]
                            msk[yy, xx] = 1
            x += g.random() * 1.0 - 0.5
            y += 1
    rgba = np.concatenate([ampliar(alb) * 0.55, ampliar(msk)[..., None]], -1)
    # desfoque (está perto da câmera) em alfa pré-multiplicado
    pm = rgba.copy()
    pm[..., :3] *= pm[..., 3:4]
    pm = desfocar(pm, 4.0)
    a = np.clip(pm[..., 3:4], 1e-4, 1)
    pm[..., :3] /= a
    # contraluz: borda verde-ouro do lado do vão
    pm[..., :3] += hexa("#9ac050") * 0.25 * (pm[..., 3:4] > 0.05)
    pm[..., 3:4] = np.clip(pm[..., 3:4] * 1.15, 0, 1)
    return pm


def salvar_webp(arr: np.ndarray, caminho: Path, q: int = 84, alfa: bool = False) -> None:
    modo = "RGBA" if alfa else "RGB"
    Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8), modo).save(caminho, quality=q, method=6)


def main() -> None:
    import time
    t0 = time.time()
    base = pintar()
    print("pintura", round(time.time() - t0, 1), "s")
    montado = montar(base)
    print("luz", round(time.time() - t0, 1), "s")
    vb = desfocar(VIDRO_COR, 1.5)
    lum_v = vb.mean(-1, keepdims=True)
    Gv, Gm = grade_de_luz(vb * 0.45 + lum_v * hexa("#ffc070") * 0.75)
    vv, vm = volumetrico(montado, Gv, Gm)
    pv, pm = poeira(Gv, Gm)
    print("volume", round(time.time() - t0, 1), "s")
    img = montado["img"]
    # o que vai no fundo e o que vai na camada de luz (que o site põe por cima dos cavaleiros, em tela)
    feixe_v = vv * 1.0 + pv[..., None] * hexa("#ffe2a8") * 1.1
    feixe_m = vm[..., None] * hexa("#ffc078") + pm[..., None] * hexa("#ffe6b0") * 0.8
    parte_luz = feixe_v * 0.6 + feixe_m * 0.4
    sem_luz = profundidade(img + feixe_v + feixe_m - parte_luz)
    fundo = acabar(sem_luz)
    # a camada de luz é só o feixe (sem o fundo): luz suave em espaço de tela, com a mesma vinheta
    hh_, ww_ = fundo.shape[:2]
    gy_, gx_ = np.mgrid[0:hh_, 0:ww_].astype(np.float32)
    vin = 1 - np.clip((gx_ / ww_ - 0.56) ** 2 * 1.1 + (gy_ / hh_ - 0.48) ** 2 * 1.4 - 0.07, 0, 1) * 1.05
    luz = (1 - np.exp(-desfocar(parte_luz, 2.0) * 1.15)) * vin[..., None]
    luz = np.clip(luz, 0, 0.8)
    PASTA.mkdir(parents=True, exist_ok=True)
    salvar_webp(fundo, PASTA / "salao-fundo.webp", 84)
    Image.open(PASTA / "salao-fundo.webp").resize((960, 540), Image.LANCZOS).save(PASTA / "salao-fundo-960.webp",
                                                                                   quality=83, method=6)
    salvar_webp(luz, PASTA / "salao-luz.webp", 82)
    salvar_webp(frente_hera(), PASTA / "salao-frente.webp", 84, alfa=True)
    meta = {
        "base": [W, H], "escala": ESC,
        "pedestais": {str(k): {"cx": v["cx"], "topo": v["topo"]} for k, v in PEDESTAIS.items()},
        "tochas": [{"x": x, "y": y} for x, y in tochas_xy()],
        "estandartes": [{"x": 318, "y": 34, "lugar": 1}, {"x": 246, "y": 44, "lugar": 2}, {"x": 390, "y": 44, "lugar": 3}],
        "texto": {"x0": 0, "x1": 190},
        "recorte_celular": {"x0": 196, "x1": 476},
        "luz_blend": "screen",
        "notas": "Salão dos Campeões aberto para a mata (scripts/cenarios/salao_cem.py). Pedestais: cx e topo = onde os "
                 "pés do cavaleiro pisam (px da arte). Tochas: x, y = a base da chama (o alto do bocal pintado); a "
                 "terceira (na pilastra da esquerda) fica sob o vidro da missão e é opcional. Estandartes: x = centro, "
                 "y = haste; o do 1º lugar fica na frente do vitral, em contraluz. salao-luz.webp vai por cima dos "
                 "cavaleiros com mix-blend-mode: screen; salao-frente.webp (hera) por cima de tudo.",
    }
    (PASTA / "salao.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n")
    for nome in ("salao-fundo.webp", "salao-fundo-960.webp", "salao-luz.webp", "salao-frente.webp"):
        print(nome, (PASTA / nome).stat().st_size // 1024, "KB")
    if "--previas" in sys.argv:
        previas(Path(sys.argv[sys.argv.index("--previas") + 1]), fundo, luz)
    print("total", round(time.time() - t0, 1), "s")


def previas(pasta: Path, fundo: np.ndarray, luz: np.ndarray) -> None:
    """Prévias de conferência: cena final com cavaleiros e estandartes, simulação do título e vidro, recorte do celular."""
    pasta.mkdir(parents=True, exist_ok=True)
    img = Image.fromarray((fundo * 255).astype(np.uint8)).convert("RGBA")
    est = Image.open(PASTA / "estandartes.png").convert("RGBA")
    cav = Image.open(PASTA / "cavaleiros.png").convert("RGBA")
    tocha = Image.open(PASTA / "tocha.png").convert("RGBA")
    meta = json.loads((PASTA / "salao.json").read_text())
    for e in meta["estandartes"]:
        r = e["lugar"] - 1
        fr = est.crop((0, r * 94, 66, r * 94 + 94)).resize((int(66 * 0.6 * ESC), int(94 * 0.6 * ESC)), Image.NEAREST)
        img.alpha_composite(fr, (int((e["x"] - 66 * 0.6 / 2) * ESC), int(e["y"] * ESC)))
    for t in meta["tochas"]:
        fr = tocha.crop((0, 0, 20, 32)).resize((10 * ESC, 16 * ESC), Image.NEAREST)
        img.alpha_composite(fr, (int((t["x"] - 5) * ESC), int((t["y"] - 16) * ESC)))
    for lugar, p in meta["pedestais"].items():
        r = int(lugar) - 1
        fr = cav.crop((0, r * 88, 75, r * 88 + 88)).resize((75 * ESC, 88 * ESC), Image.NEAREST)
        img.alpha_composite(fr, (int((p["cx"] - 37) * ESC), int((p["topo"] - 84) * ESC)))
    a = np.asarray(img.convert("RGB"), np.float32) / 255
    a = 1 - (1 - a) * (1 - luz)
    fr_ = np.asarray(Image.open(PASTA / "salao-frente.webp").convert("RGBA"), np.float32) / 255
    a = a * (1 - fr_[..., 3:4]) + fr_[..., :3] * fr_[..., 3:4]
    final = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    final.save(pasta / "final.png")
    # simulação da interface: título branco e vidro escuro à esquerda
    ui = final.convert("RGBA")
    camada = Image.new("RGBA", ui.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(camada)
    dr.rounded_rectangle((16 * ESC, 60 * ESC, 186 * ESC, 235 * ESC), radius=16 * ESC // 3, fill=(14, 18, 30, 150),
                         outline=(240, 196, 106, 120), width=2)
    for i, w_ in enumerate((140, 120, 150, 90, 130)):
        dr.rounded_rectangle((28 * ESC, (80 + i * 26) * ESC, (28 + w_) * ESC, (86 + i * 26) * ESC), radius=6,
                             fill=(246, 247, 243, 170))
    ui.alpha_composite(camada)
    dr = ImageDraw.Draw(ui)
    try:
        from PIL import ImageFont
        fonte = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 64)
    except OSError:
        fonte = None
    dr.text((16 * ESC, 18 * ESC), "Arena dos Residentes", fill=(255, 255, 255, 255), font=fonte)
    ui.convert("RGB").save(pasta / "interface.png")
    final.crop((196 * ESC, 0, 476 * ESC, H * ESC)).save(pasta / "celular.png")


if __name__ == "__main__":
    main()
