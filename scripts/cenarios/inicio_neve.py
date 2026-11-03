"""Cenário "HD-2D" do topo da página inicial: o refúgio da neve (01/11/2026).

Nada baixado nem gerado por IA: cada pixel sai das funções abaixo, no mesmo jeito do acampamento
(scripts/gerar_cena_inicio.py, de onde vêm os pincéis básicos, o desfoque e as luzes em degraus).

A cena, pintada em pixel art de 480 x 200 e montada em 3x com a luz calculada por pixel:
- uma clareira nevada na montanha: cordilheira ao fundo (faces de rocha e neve, ravinas e cornijas), a encosta com a
  mata de pinheiros, pinheiros grandes com neve camada por camada nos galhos;
- a cabana de troncos (fachada e oitão em perspectiva, cantos entalhados, telhado coberto de neve com a borda
  pendurada e pingentes de gelo, chaminé de pedra soltando fumaça, janelas com luz quente e geada nos cantos);
- a fogueira de pedras exatamente na âncora do fogo, só pedras, lenha e brasas (a chama animada entra por cima), com a
  neve derretida em volta; pilha de lenha, cepo com machado, trenó com fardo, esquis e bastões encostados na cabana,
  cerca baixa, banco de tora, lampião na porta e num poste junto ao oitão, pegadas e o rastro do trenó.
- A neve é um relevo de verdade (montes, ondas do vento, pegadas): cada pixel tem uma normal e recebe a luz direta
  conforme a direção do sol ou da lua (sol rasante revela as ondas), o céu azul nas sombras, a fogueira e as janelas
  em laranja e dourado, e cintila em pixels onde a luz bate.
- Montagem: sombras projetadas (do sol, da lua e da fogueira), oclusão de contato, poças de luz das janelas, fumaça
  volumétrica iluminada, feixes de luz com pó de gelo, névoa por distância, profundidade de campo, brilho (bloom),
  curva de tom, correção de cor e vinheta.

Três horas: manhã (céu claro e frio, sol rasante pela direita, sombras longas azuis), tarde (luz rosada do poente
vinda da frente à esquerda, montanhas em alpenglow, sombras violeta) e noite (lua, estrelas, neve azulada aquecida pelo
fogo e pelas janelas). Saídas em public/pixel/inicio/: cena-neve-{manha,tarde,noite}.webp (1440 x 600) e -960
(960 x 400), mais cena-neve.json com os pontos do gato e da coruja.

O fogo (caixa x 220-260, y 104-152, base em 240,146), o esqueleto (x 262-308, y 96-163), o gato e a coruja entram por
cima (componentes/inicio/cena/CenaDiorama.tsx); as áreas deles ficam livres.
Uso: python3 scripts/cenarios/inicio_neve.py           (as três)
     python3 scripts/cenarios/inicio_neve.py noite     (só uma)
"""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
from gerar_cena_inicio import (  # noqa: E402  (pincéis e luzes do acampamento, sem alterar o script)
    BAYER_HW, ESC, GX, GXa, GY, GYa, H, MADEIRA, PEDRA, W, XA, YA, Camada, ampliar, desfocar, desfocar_rgba,
    facho, hexa, luz_em_degraus, luz_pontual, pal, pedra, poli, pontilhar, projetar_sombra, raios_de_luz, ruido,
    ruido_ret, sobre, suave)

PASTA = RAIZ / "public" / "pixel" / "inicio"
FOGO = (240, 146)
LIVRE = {"fogo": (220, 104, 260, 152), "esqueleto": (262, 96, 308, 163)}
HORIZ = 106                       # onde a clareira encontra a encosta da mata

# ─────────────────────────────── Horas do dia ───────────────────────────────
# L: direção da luz direta em 3D (x para a direita, y para a câmera, z para cima); sombra: deslocamento no chão por
# pixel de altura; d_*: quanto a luz direta chega nas faces da cabana.
PERIODOS = {
    "manha": dict(
        L=(0.80, -0.42, 0.30), sombra=(-2.0, 0.62), astro=(452, 16),
        ceu=("#2a62b4", "#78aee2", "#d4e8f6"), amb="#6a8ed0", amb_k=0.5, sol="#ffd49a", sol_k=1.25,
        fogo_k=0.3, jan_k=0.55, nevoa="#b8d0ec", nevoa_k=0.92, quente="#fff0d8", fria="#22406e",
        rocha=("#26304a", "#3a4664", "#56627e", "#76829c"), fumaca="#e4ecf6"),
    "tarde": dict(
        L=(-0.74, 0.56, 0.26), sombra=(1.7, -0.62), astro=(-60, 60),
        ceu=("#262a66", "#8670b0", "#f2aaa6"), amb="#7a6cbc", amb_k=0.48, sol="#ff9a7c", sol_k=1.05,
        fogo_k=0.45, jan_k=0.85, nevoa="#b49ac6", nevoa_k=0.95, quente="#ffd2b0", fria="#2e2458",
        rocha=("#2a2440", "#423a5e", "#5e5478", "#7c7090"), fumaca="#f0d0d4"),
    "noite": dict(
        L=(0.46, -0.40, 0.79), sombra=(-0.6, 0.3), astro=(398, 24),
        ceu=("#02061a", "#0a1538", "#1c2c5c"), amb="#4a62bc", amb_k=0.26, sol="#a8c2ff", sol_k=0.45,
        fogo_k=1.05, jan_k=1.2, nevoa="#1a2856", nevoa_k=0.85, quente="#ffd49a", fria="#0a1532",
        rocha=("#0c1226", "#182240", "#243058", "#323e6c"), fumaca="#8a98c8"),
}

NEVE = pal("#7c8aa8", "#96a4c0", "#b0bcd4", "#c4cee0", "#d2dae8", "#dee4ee", "#eaeef4")
TORA = pal("#1e120a", "#30200f", "#463018", "#5e4222", "#7a582e", "#94703c", "#ae8a4e")
VERDE_PINHO = pal("#081812", "#0e2219", "#142e20", "#1c3c28", "#264c30", "#325e38", "#427040")
PEDRA_CHAM = pal("#2a2a30", "#3e3e46", "#56565e", "#6e6e74", "#8a8a8c", "#a8a6a2", "#c6c2b8")


def normal3(v) -> np.ndarray:
    a = np.array(v, dtype=np.float32)
    return a / np.linalg.norm(a)


def direto(L, n) -> float:
    """Quanto da luz direta chega numa face de normal n (Lambert)."""
    return float(max(0.0, np.dot(normal3(L), normal3(n))))


class Plano:
    """Uma camada de pixel art com o mapa de luz direta (0..1) de cada pixel e a linha de chão (para as sombras)."""

    def __init__(self) -> None:
        self.c = Camada()
        self.d = np.zeros((H, W), np.float32)
        self.base = np.full((H, W), -1, np.float32)
        self.cint = np.zeros((H, W), np.float32)      # onde pode cintilar (neve)

    def p(self, x, y, cor, d: float | None = None, a: float = 1.0, cint: float = 0.0) -> None:
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            self.c.p(x, y, cor, a)
            if d is not None:
                self.d[y, x] = self.d[y, x] * (1 - a) + d * a
            if a > 0.5:
                self.cint[y, x] = cint

    def juntar(self, t: Camada, d, base: float | None = None, cint=0.0) -> None:
        m = t.c[:, :, 3] > 0.4
        self.c.juntar(t)
        self.d[m] = d[m] if np.ndim(d) == 2 else d
        self.cint[m] = cint[m] if np.ndim(cint) == 2 else cint
        if base is not None:
            self.base[m] = base


def topo_de(m: np.ndarray) -> np.ndarray:
    """Pixels do topo de uma silhueta (onde o de cima está vazio)."""
    acima = np.zeros_like(m)
    acima[1:] = m[:-1]
    return m & ~acima


def nevar(P: Plano, m: np.ndarray, L, seed: int, esp: float = 2.2, lumps: float = 0.5, base: float | None = None,
          beirada: bool = True) -> None:
    """Põe neve sobre tudo o que é topo em m: camada de 1 a 3 px, com montinhos por cima e a borda de baixo azulada."""
    g = np.random.default_rng(seed)
    n = ruido(seed, 3.0)
    topo = topo_de(m)
    ys, xs = np.nonzero(topo)
    d_cima = direto(L, (0, 0.25, 1))
    for x, y in zip(xs, ys):
        e = int(np.clip(esp * (0.6 + n[y, x] * 0.9), 1, 4))
        monte = n[y, x] > 1 - lumps * 0.6
        if monte:
            P.p(x, y - 1, NEVE[5], d_cima, cint=1)
        for k in range(e):
            yy = y + k
            if 0 <= yy < H and m[yy, x]:
                cor = NEVE[6] if k == 0 else NEVE[4] if k < e - 1 else NEVE[2]
                P.p(x, yy, cor, d_cima * (1 - k * 0.18), cint=1 if k == 0 else 0)
                if base is not None:
                    P.base[yy, x] = base
        if beirada and g.random() < 0.12:
            P.p(x, y + e, NEVE[1], d_cima * 0.4)


# ─────────────────────────────── Céu e montanhas ───────────────────────────────
def pintar_ceu(nome: str, per: dict) -> np.ndarray:
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    t = np.clip(YA / ({"tarde": 66}.get(nome, 92)), 0, 1)[:, :, None]
    ceu = np.where(t < 0.55, topo + (meio - topo) * (t / 0.55), meio + (horiz - meio) * ((t - 0.55) / 0.45)).astype(np.float32)
    if nome == "manha":
        ax, ay = per["astro"]
        d = np.hypot(XA - ax, (YA - ay) * 1.3)
        ceu += (np.exp(-d / 110) * 0.25 + np.exp(-d / 24) * 0.45)[:, :, None] * hexa("#fff4dc")
        # cirros finos, puxados pelo vento
        cir = ruido_ret(11, 40, 3) * 0.7 + ruido_ret(12, 12, 2) * 0.3
        k = np.clip((cir - 0.58) * 3.2, 0, 0.55) * np.exp(-((YA - 26) / 14) ** 2)
        k = np.floor(k * 5) / 5
        ceu = ceu * (1 - k[:, :, None]) + hexa("#f6faff") * k[:, :, None]
    elif nome == "tarde":
        # cinturão de Vênus: faixa rosa sobre a sombra azul da Terra no horizonte
        rosa = np.exp(-((YA - 50) / 16) ** 2)
        ceu += rosa[:, :, None] * (hexa("#ffb8b0") - ceu) * 0.6
        ceu += (np.exp(-np.hypot(XA + 40, YA - 70) / 140) * 0.5)[:, :, None] * hexa("#ffb070")
        # nuvens em bancos fofos: base acesa pelo poente (dourado à esquerda, rosa à direita), topo lilás
        nuv = ruido_ret(13, 26, 7) * 0.6 + ruido_ret(14, 8, 3.5) * 0.3 + ruido(16, 2.5) * 0.1
        faixa = np.exp(-((YA - 28) / 11) ** 2) + np.exp(-((YA - 8) / 6) ** 2) * 0.6
        v = np.clip((nuv - 0.56) * 4.0 * faixa, 0, 1)
        v = np.floor(v * 3 + 0.25) / 3
        cima = np.roll(v, 2, 0)
        base_n = (v > 0) & (cima >= v)              # parte de baixo da nuvem (vê o sol que já se pôs)
        lado = np.clip(1 - XA / 480, 0, 1)[:, :, None]
        acesa = hexa("#ffd8a8") * lado + hexa("#ffa8c0") * (1 - lado)
        cor_n = np.where(base_n[:, :, None], acesa, hexa("#c890c8"))
        k = np.clip(v * 0.9, 0, 0.9)[:, :, None]
        ceu = ceu * (1 - k) + cor_n * k
    else:
        g = np.random.default_rng(3)
        for _ in range(420):
            x, y = int(g.random() * W), int(g.random() * 96)
            b = 0.3 + g.random() ** 2.2 * 1.0
            ceu[y, x] += b * hexa("#e8eeff")
            if b > 1.0:
                for (ox, oy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= x + ox < W and 0 <= y + oy < H:
                        ceu[y + oy, x + ox] += 0.32 * hexa("#c8d4ff")
        via = np.exp(-((YA + 0.42 * XA - 150) / 16) ** 2) * (ruido(9, 5) * 0.7 + ruido(10, 2) * 0.3)
        ceu += via[:, :, None] * hexa("#7080c8") * 0.32
        for _ in range(240):
            x, y = int(g.random() * W), int(g.random() * 90)
            if via[y, x] > 0.25:
                ceu[y, x] += 0.35 * hexa("#dfe6ff")
        ax, ay = per["astro"]
        d = np.hypot(XA - ax, YA - ay)
        ceu += (np.exp(-d / 26) * 0.35 + np.exp(-d / 70) * 0.12)[:, :, None] * hexa("#9ab4ff")
        for y in range(ay - 8, ay + 9):
            for x in range(ax - 8, ax + 9):
                dd = math.hypot(x - ax, y - ay)
                if dd < 6.6:
                    cr = (x - ax + 2) ** 2 + (y - ay + 1) ** 2 < 4 or (x - ax - 2) ** 2 + (y - ay - 2) ** 2 < 2.5 or \
                        (x - ax + 1) ** 2 + (y - ay - 3) ** 2 < 1.5
                    ceu[y, x] = hexa("#c4d0f2") if cr or dd > 5.8 else hexa("#f6f8ff")
    return ceu


PICOS_LONGE = [(20, 50, 0.5, 0.55), (92, 42, 0.55, 0.5), (160, 36, 0.5, 0.6), (232, 30, 0.62, 0.48),
               (296, 12, 0.78, 0.66), (366, 28, 0.55, 0.6), (430, 22, 0.6, 0.55), (500, 40, 0.6, 0.6)]
PICOS_MEIO = [(-6, 62, 0.5, 0.45), (64, 60, 0.45, 0.5), (136, 66, 0.42, 0.45), (196, 58, 0.55, 0.5),
              (254, 52, 0.6, 0.55), (346, 60, 0.5, 0.42), (414, 52, 0.48, 0.5), (486, 58, 0.5, 0.5)]


def cordilheira(nome: str, per: dict, picos, seed: int, neve_ate: float, fim: int, rocha_k: float = 1.0
                ) -> tuple[Camada, np.ndarray]:
    """Montanhas: cada pico com a face da luz e a da sombra separadas por uma crista que serpenteia, caneluras de
    neve e costelas de rocha descendo em diagonal (linhas de queda), cornija clara no alto."""
    c = Camada()
    L = normal3(per["L"])
    jag = (ruido(seed, 2.5)[0] - 0.5) * 2.4 + (ruido(seed + 1, 8)[0] - 0.5) * 4
    alturas = np.stack([ay + np.abs(XA - ax) * np.where(XA < ax, sl, sr) for (ax, ay, sl, sr) in picos])
    dono = np.argmin(alturas, 0)
    topo = alturas.min(0) + jag[None, :]
    m = (YA >= topo) & (YA < fim)
    ax = np.array([p[0] for p in picos], np.float32)[dono]
    ay = np.array([p[1] for p in picos], np.float32)[dono]
    serp = (ruido(seed + 2, 6) - 0.5) * 8
    crista = ax + serp * np.clip((YA - ay) / 24, 0, 1) + (YA - ay) * 0.1
    face = np.where(XA < crista, -1.0, 1.0)
    # linhas de queda: ruído amostrado em coordenadas inclinadas (para fora do pico)
    n1 = ruido_ret(seed + 3, 1.8, 10)
    n2 = ruido_ret(seed + 4, 4.0, 18)
    xi = ((XA + (YA - ay) * 0.55 * face) % W).astype(int)
    yi = YA.astype(int)
    cost = n1[yi, xi]
    cost2 = n2[yi, xi]
    inc = (cost - 0.5) * 0.9 + (cost2 - 0.5) * 0.6
    nx = face * 0.75 + inc * 0.5
    ny = np.full_like(nx, 0.3)
    nz = np.full_like(nx, 0.55)
    nn = np.sqrt(nx * nx + ny * ny + nz * nz)
    D = np.clip((nx * L[0] + ny * L[1] + nz * L[2]) / nn, 0, 1)
    D = np.floor(D * 5 + BAYER_HW * 0.6) / 5                       # degraus de pixel art
    linha = ay + neve_ate + (ruido(seed + 5, 5) - 0.5) * 10
    rocha = (cost < 0.3 * rocha_k) & (YA - topo > 3) & (YA > ay + 5)
    rocha |= (YA > linha) & (cost2 < 0.55) & (cost < 0.55)
    paleta_r = pal(*per["rocha"])
    kr = np.clip((D * 3 + 0.4 + BAYER_HW * 0.6).astype(int), 0, 3)
    kn = np.clip((2.6 + (cost - 0.5) * 2 + BAYER_HW * 0.7).astype(int) + 2, 3, 6)
    cor = np.where(rocha[:, :, None], paleta_r[kr], NEVE[kn])
    c.mascara(m, cor)
    borda = m & ~np.roll(m, 1, 0)
    c.mascara(borda, NEVE[6])
    d = np.where(rocha, D * 0.7, D)
    return c, (d * m).astype(np.float32)


def pintar_encosta(nome: str, per: dict) -> tuple[Plano, list]:
    """A encosta logo atrás da clareira: neve e a mata de pinheiros pequenos em fileiras (mais densas nos lados)."""
    P = Plano()
    L = per["L"]
    n1 = ruido(71, 30)[0] * 10 + ruido(72, 8)[0] * 3
    xs = np.arange(W)
    topo = 74 + n1 + 14 * np.exp(-((xs - 252) / 48) ** 2)
    d_neve = direto(L, (0.0, 0.5, 0.9))
    for x in range(W):
        t0 = int(topo[x])
        for y in range(t0, HORIZ + 8):
            k = 4 + (1 if (x * 7 + y * 3) % 11 == 0 else 0) - (1 if y - t0 < 1 else 0)
            P.p(x, y, NEVE[k], d_neve * (0.85 + 0.15 * math.sin(x / 9 + y / 4)), cint=0.3)
    g = np.random.default_rng(73)
    arvs = []
    for fil, (dy0, alt0, passo) in enumerate(((2, 9, 3.0), (10, 13, 3.6), (18, 17, 4.6))):
        x = -4.0
        while x < W + 4:
            centro = 1 - math.exp(-((x - 252) / 46) ** 2)
            if g.random() < 0.25 + 0.75 * centro:
                yb = topo[int(np.clip(x, 0, W - 1))] + dy0 + g.random() * 5
                if yb < HORIZ + 4:
                    alt = alt0 * (0.7 + g.random() * 0.6)
                    arvs.append((x, yb, alt, fil))
            x += passo * (0.6 + g.random() * 0.8)
    arvs.sort(key=lambda a: a[1])
    for (x, yb, alt, fil) in arvs:
        pinheirinho(P, x, yb, alt, L, seed=int(x * 13 + fil * 7))
    return P, arvs


def pinheirinho(P: Plano, cx: float, yb: float, alt: float, L, seed: int) -> None:
    """Pinheiro pequeno e distante: silhueta em degraus, lado da luz e da sombra e neve nos ombros."""
    lado = 1 if L[0] > 0 else -1
    dl, ds = direto(L, (0.8 * lado, 0.4, 0.45)), direto(L, (-0.8 * lado, 0.4, 0.45))
    d_neve = direto(L, (0, 0.3, 1))
    yt = yb - alt
    for y in range(int(yt), int(yb) + 1):
        f = (y - yt) / max(alt, 1)
        meia = 0.5 + f * alt * 0.36 + ((y + seed) % 3 == 0) * 0.8
        for x in range(int(round(cx - meia)), int(round(cx + meia)) + 1):
            u = (x - cx) / max(meia, 1)
            ilum = u * lado > 0.15
            neve = ((y + seed) % 3 == 0 and abs(u) > 0.3) or (y == int(yt))
            if neve:
                P.p(x, y, NEVE[5] if ilum else NEVE[2], d_neve, cint=0.6)
            else:
                P.p(x, y, VERDE_PINHO[3 if ilum else 1], dl if ilum else ds)
    P.p(cx, yb + 1, TORA[1], ds)


# ─────────────────────────────── Pinheiros ───────────────────────────────
def pinheiro(P: Plano, cx: float, base: float, alt: float, larg: float, L, seed: int, neve: float = 1.0,
             tronco_alt: float = 6, escuro: float = 0.0) -> None:
    """Pinheiro com camadas de galhos (saias em serra) e neve assentada em cada camada; desenha de baixo para cima."""
    g = np.random.default_rng(seed)
    lado = 1 if L[0] > 0 else -1
    d_neve = direto(L, (0, 0.3, 1))
    # tronco
    tl = max(2, int(larg * 0.12))
    for y in range(int(base - tronco_alt - 4), int(base) + 1):
        for x in range(int(cx - tl), int(cx + tl) + 1):
            u = (x - cx) / max(tl, 1)
            k = int(np.clip(3 + u * lado * 2 - escuro * 3 + ((x * 5 + y * 3) % 4 == 0), 0, 6))
            P.p(x, y, TORA[k], direto(L, (u * 0.9, 0.5, 0.1)))
    topo = base - tronco_alt - alt
    n_cam = max(3, int(alt / 9))
    camadas = []
    for i in range(n_cam):
        f0 = i / n_cam
        f1 = (i + 1) / n_cam
        yt = topo + alt * (f0 * 0.82)
        yb = topo + alt * f1 + 2
        w = larg * (0.18 + 0.82 * f1) * (0.9 + g.random() * 0.2)
        camadas.append((yt, yb, w))
    rn = ruido(seed, 2.2)
    for (yt, yb, w) in reversed(camadas):
        alto = yb - yt
        serra_f = g.random() * 6
        for y in range(int(yt), int(yb) + 3):
            for x in range(int(cx - w - 2), int(cx + w + 3)):
                u = (x - cx) / w
                if abs(u) > 1.05:
                    continue
                # silhueta: triângulo com a saia caindo nas pontas e a borda de baixo em serra
                ylin = yt + abs(u) * alto * 0.95
                serra = 1.6 * abs(math.sin((x + serra_f) * 1.15)) + abs(u) * 2.2
                yfund = yb + serra - 1
                if y < ylin or y > yfund:
                    continue
                prof = (y - ylin) / max(yfund - ylin, 1)           # 0 em cima (ombro), 1 na saia
                tufo = rn[int(y) % H, int(x) % W]
                k = 3.4 + u * lado * 1.6 - prof * 2.2 + (tufo - 0.5) * 2.2 - escuro * 2.5
                kk = int(np.clip(k + BAYER_HW[int(y) % H, int(x) % W] * 0.8, 0, 6))
                dd = direto(L, (u * 0.85, 0.45, 0.55 - prof * 0.4))
                # neve: no ombro de cada camada e em tufos por cima dos galhos
                esp = 1.4 + neve * (1.2 + tufo * 1.6)
                na_neve = (y - ylin) < esp * (1 - abs(u) * 0.35) and neve > 0
                na_neve |= neve > 0 and tufo > 0.72 and prof < 0.55 and ((x + y) % 2 == 0 or tufo > 0.8)
                if na_neve:
                    kn = int(np.clip(5 + u * lado * 1.2 - (y - ylin) * 0.7 - prof * 2 - escuro * 3, 1, 6))
                    P.p(x, y, NEVE[kn], d_neve * (0.75 + 0.35 * u * lado), cint=1.0 if kn >= 5 else 0.3)
                else:
                    P.p(x, y, VERDE_PINHO[kk], dd * (1 - escuro * 0.5))
        # pontas da saia com neve pendurada
        for x in range(int(cx - w), int(cx + w) + 1, 3):
            u = (x - cx) / w
            if abs(u) > 0.25 and g.random() < 0.55 * neve:
                yy = yt + abs(u) * alto * 0.95 + 1
                P.p(x, yy - 1, NEVE[6], d_neve, cint=1)
    # ponta
    P.p(cx, topo - 1, NEVE[6], d_neve, cint=1)
    P.p(cx, topo, NEVE[5], d_neve)


# ─────────────────────────────── O chão nevado ───────────────────────────────
PORTA = (362, 138)
PEGADAS = [(PORTA[0], PORTA[1] + 3), (350, 146), (326, 152), (300, 160), (276, 160), (258, 156)]
PEGADAS_LENHA = [(232, 156), (214, 158), (202, 154)]
TRENO = (338, 376, 178)                           # x0, x1, linha do chão
CEPO = (165, 162)
LENHA = (186, 212, 150)
CERCA = (124, 212, 114)


BORDA_CHAO = (HORIZ - 1 + (ruido(36, 9)[0] - 0.5) * 7 + (ruido(35, 3)[0] - 0.5) * 2).astype(np.float32)


def caminho_pontos(pts, passo: float = 4.5):
    out = []
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / passo))
        for i in range(n):
            t = i / n
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, math.atan2(y1 - y0, x1 - x0)))
    return out


def pintar_chao(nome: str, per: dict) -> tuple[Plano, np.ndarray]:
    """Neve como relevo: montes, ondas do vento, monte junto às paredes, pegadas, rastro do trenó e o derretido
    em volta da fogueira. Devolve o plano e a máscara do chão molhado (sem neve)."""
    P = Plano()
    L = normal3(per["L"])
    fx, fy = FOGO
    # relevo (em pixels de altura)
    h = (ruido(31, 40) - 0.5) * 7 + (ruido(32, 14) - 0.5) * 3
    ondas = ruido_ret(33, 16, 3.0) * 0.7 + ruido_ret(34, 7, 2.0) * 0.3
    h += (ondas - 0.5) * 2.2 * suave(HORIZ, 150, YA)
    h += np.exp(-((XA - 364) / 46) ** 6) * np.exp(-((YA - 140) / 4.5) ** 2) * 2.6        # monte junto à fachada
    h += np.exp(-((XA - 199) / 16) ** 4) * np.exp(-((YA - 152) / 3) ** 2) * 2.0          # junto à lenha
    h += np.exp(-((XA - 60) / 70) ** 2) * np.exp(-((YA - 170) / 40) ** 2) * 6           # duna grande à esquerda
    # trilha pisada: da porta à fogueira, com as pegadas
    trilha = np.full((H, W), 1e9, np.float32)
    for (x0, y0), (x1, y1) in zip(PEGADAS[:-1], PEGADAS[1:]):
        vx, vy = x1 - x0, y1 - y0
        t = np.clip(((XA - x0) * vx + (YA - y0) * vy) / (vx * vx + vy * vy), 0, 1)
        trilha = np.minimum(trilha, np.hypot(XA - (x0 + t * vx), (YA - (y0 + t * vy)) * 1.6))
    pisado = np.clip(1 - trilha / 5, 0, 1)
    h = h * (1 - pisado * 0.7) - pisado * 0.8
    pits = np.zeros((H, W), np.float32)
    g = np.random.default_rng(35)
    for trajeto in (PEGADAS, [(PEGADAS[-1][0], PEGADAS[-1][1])] + PEGADAS_LENHA, [(164, 170), (140, 182), (110, 196)]):
        for i, (x, y, ang) in enumerate(caminho_pontos(trajeto, 4.2)):
            lado = 1.5 if i % 2 else -1.5
            px = x - math.sin(ang) * lado * 0.6
            py = y + math.cos(ang) * lado
            pits += (((XA - px) / 1.3) ** 2 + ((YA - py) / 0.9) ** 2 < 1).astype(np.float32)
    h -= pits * 1.5
    # rastro do trenó: dois sulcos que saem dele e vão para a direita
    for off in (0, 6):
        for k in range(160):
            x = TRENO[1] + 2 + k
            y = TRENO[2] - 2 + off * 0.5 + k * 0.1 + math.sin(k / 30) * 2 + off
            if x < W:
                h[int(y), int(x)] -= 1.2
    # derretido em volta da fogueira
    borda = (ruido(37, 3) - 0.5) * 0.5
    dfo = ((XA - fx) / 29) ** 2 + ((YA - fy - 1) / 9.5) ** 2
    molhado = dfo < 1 + borda
    lama = dfo < 0.55 + borda * 0.6
    h = np.where(molhado, np.minimum(h, -0.8), h)
    h += np.clip(1.3 - np.abs(dfo - 1.15) * 3, 0, 1) * 1.2                         # anel de neve empurrada
    # normal e luz direta
    hx = np.zeros_like(h)
    hy = np.zeros_like(h)
    hx[:, 1:-1] = (h[:, 2:] - h[:, :-2]) * 0.5
    hy[1:-1, :] = (h[2:, :] - h[:-2, :]) * 0.5
    nx, ny, nz = -hx * 0.9, -hy * 1.3, np.ones_like(h)
    # o chão sobe um pouco para o fundo (encosta): a normal inclina para a câmera
    ny = ny + 0.25
    nn = np.sqrt(nx * nx + ny * ny + nz * nz)
    D = np.clip((nx * L[0] + ny * L[1] + nz * L[2]) / nn, 0, 1)
    D = np.clip(D * 2.1 - 0.06, 0, 1.0)
    # cor: neve com pontilhado (cavidades mais azuladas), trilha um pouco cinza, lama e cinza perto do fogo
    cav = np.clip(-(h - desfocar(h[:, :, None], 3)[:, :, 0]) * 0.8, -1, 1)
    v = 0.62 + (ruido(38, 2) - 0.5) * 0.25 - cav * 0.25 - pisado * 0.18 - pits * 0.2
    k = pontilhar(np.clip(v, 0, 1), 4, 0.35) + 2
    cor = NEVE[np.clip(k, 0, 6)]
    terra = pal("#120e0c", "#1a1410", "#241a14", "#30241a", "#3e3024")
    kt = pontilhar(np.clip(0.45 + (ruido(39, 2) - 0.5) * 0.7 - (1 - dfo) * 0.3, 0, 1), 5, 0.9)
    cor_t = terra[kt]
    lama_neve = pal("#4a4a56", "#646672", "#80848e")[pontilhar(np.clip(0.5 + (ruido(40, 1.5) - 0.5), 0, 1), 3, 0.9)]
    cor = np.where(molhado[:, :, None], np.where(lama[:, :, None], cor_t, lama_neve), cor)
    chao = YA >= BORDA_CHAO[None, :]
    # a beirada de trás da clareira: um barranco de neve mais claro, ondulado
    beira = chao & (YA < BORDA_CHAO[None, :] + 2)
    cor = np.where(beira[:, :, None], NEVE[6], cor)
    P.c.mascara(chao, cor)
    D = np.floor(D * 6 + BAYER_HW * 0.3 + 0.45) / 6                      # degraus de pixel art
    P.d = np.where(chao, np.where(molhado, D * 0.6, D), 0).astype(np.float32)
    # cintilar: grãos espalhados na neve virada para a luz
    gr = np.random.default_rng(41).random((H, W))
    P.cint = (chao & ~molhado & (gr < 0.05)).astype(np.float32) * np.clip(D * 1.4, 0, 1)
    # gravetos, cinza e pocinhas no derretido
    for _ in range(26):
        a = g.random() * math.tau
        r = 0.6 + g.random() * 0.35
        x, y = fx + math.cos(a) * 25 * r, fy + 1 + math.sin(a) * 8.5 * r
        if molhado[int(y), int(x)]:
            P.p(x, y, ["#141010", "#4a4a50", "#6a5038"][int(g.random() * 3)], D[int(y), int(x)] * 0.5)
    P.normal = (nx / nn, ny / nn, nz / nn)
    P.chao = chao & ~molhado
    return P, molhado


# ─────────────────────────────── A cabana ───────────────────────────────
# Projeção: fachada virada para a câmera (x 328-400, chão em y 136), profundidade para cima e para a esquerda.
CAB = dict(x0=328, x1=400, chao=136, alt=22, prof=(-16, -9), cume=17)


def cabana(P: Plano, E: Camada, per: dict, nome: str) -> list:
    """Cabana de troncos: oitão com janela (virado para a fogueira), fachada com duas janelas e porta, telhado
    nevado com pingentes, chaminé de pedra, lampião e degrau. Devolve as janelas [(x0, y0, x1, y1, normal)]."""
    L = per["L"]
    x0, x1, ch, alt, (px, py), cume = CAB["x0"], CAB["x1"], CAB["chao"], CAB["alt"], CAB["prof"], CAB["cume"]
    topo = ch - alt
    d_frente = direto(L, (0, 1, 0.08))
    d_oitao = direto(L, (-1, 0, 0.08))
    d_teto = direto(L, (0.25 * np.sign(L[0]), 0.25, 0.95))
    janelas = []
    # ── fachada: toras horizontais de 3 px (luz em cima, sombra embaixo, fresta escura)
    veio = ruido_ret(501, 6, 1)
    for y in range(topo, ch + 1):
        r = (y - topo) % 3
        for x in range(x0, x1 + 1):
            v = veio[y, x]
            k = [5, 4, 2][r] + (v - 0.5) * 2.2 + (0.6 if (x * 13 + y * 7) % 37 == 0 else 0)
            if r == 2 and (x * 3 + y) % 5 == 0:
                k -= 1
            P.p(x, y, TORA[int(np.clip(k, 0, 6))], d_frente * (1.0 if r == 0 else 0.85))
        if r == 2:
            for x in range(x0, x1 + 1):
                if (x * 7 + y) % 9 == 0:
                    P.p(x, y, TORA[0], d_frente * 0.5)
    # ── oitão (face esquerda, paralelogramo + triângulo), toras inclinadas na direção da profundidade
    incl = py / px                                   # 0.545: as toras sobem para a esquerda
    gab = poli([(x0, ch), (x0 + px, ch + py), (x0 + px, topo + py), (x0 + px / 2, topo + py / 2 - cume), (x0, topo)])
    ys, xs = np.nonzero(gab)
    for x, y in zip(xs, ys):
        yl = y - (x - x0) * incl                     # coordenada da tora no plano do oitão
        r = int(yl - topo) % 3
        v = veio[y, (x * 3) % W]
        k = [4, 3, 1][r] + (v - 0.5) * 2.0 - 0.6
        P.p(x, y, TORA[int(np.clip(k, 0, 6))], d_oitao * (1.0 if r == 0 else 0.85))
    # pontas das toras no canto da frente (entalhe): rodelas com anéis
    for y in range(topo + 1, ch + 1, 3):
        for (dx, dy, cor) in ((-2, 0, "#c8a46a"), (-1, 0, "#e0c088"), (0, 0, "#b08a52"), (-2, 1, "#9a7444"),
                              (-1, 1, "#b8925a"), (0, 1, "#7a5630"), (-3, 0, "#6a4a28"), (-3, 1, "#4a3018"), (1, 0, "#5a3c20")):
            P.p(x0 + dx, y + dy - 1, cor, max(d_frente, d_oitao) * 0.9)
        P.p(x0 - 1, y - 1, "#f0d8a0", max(d_frente, d_oitao))
    for y in range(topo + 1, ch + 1, 3):         # canto da direita (as pontas aparecem de lado)
        P.p(x1 + 1, y - 1, TORA[5], d_frente)
        P.p(x1 + 2, y - 1, TORA[3], d_frente * 0.8)
        P.p(x1 + 1, y, TORA[2], d_frente * 0.6)
    # base de pedra sob a fachada
    for x in range(x0 - 1, x1 + 3):
        P.p(x, ch + 1, PEDRA_CHAM[2 + (x % 4 == 0)], d_frente * 0.8)
        P.p(x, ch + 2, PEDRA_CHAM[1], d_frente * 0.6)
    # ── janelas da fachada e a porta
    def janela_frente(jx0, jy0, jw, jh):
        for y in range(jy0 - 1, jy0 + jh + 1):
            for x in range(jx0 - 1, jx0 + jw + 1):
                borda = x in (jx0 - 1, jx0 + jw) or y in (jy0 - 1, jy0 + jh)
                if borda:
                    P.p(x, y, MADEIRA[5] if y == jy0 - 1 else MADEIRA[2], d_frente)
        for y in range(jy0, jy0 + jh):
            for x in range(jx0, jx0 + jw):
                t = (y - jy0) / jh
                cor = hexa("#ffcf7a") * (1 - t) + hexa("#ff9840") * t
                if x == jx0 + jw // 2:
                    cor = hexa("#3a2414")
                elif (x - jx0 + y - jy0) % 7 == 0 and t < 0.5:
                    cor = hexa("#ffe8b0")
                cor_g = cor
                # geada nos cantos de baixo
                cant = min(x - jx0, jx0 + jw - 1 - x) + (jy0 + jh - 1 - y)
                if cant <= 1:
                    cor_g = hexa("#dfeaf8")
                P.p(x, y, cor_g, 0.0)
                E.p(x, y, cor_g if cant > 1 else hexa("#ffe0b0"), 1.0 if cant > 1 else 0.35)
        # cortininhas e um vaso na janela (silhuetas)
        for y in range(jy0, jy0 + jh - 1):
            P.p(jx0, y, "#a8402a", 0.0)
            P.p(jx0 + jw - 1, y, "#a8402a", 0.0)
            E.p(jx0, y, "#ff7a40", 0.5)
            E.p(jx0 + jw - 1, y, "#ff7a40", 0.5)
        # peitoril com neve
        for x in range(jx0 - 2, jx0 + jw + 2):
            P.p(x, jy0 + jh + 1, MADEIRA[3], d_frente)
            P.p(x, jy0 + jh, NEVE[6] if x % 4 else NEVE[5], d_teto, cint=1)
        janelas.append((jx0, jy0, jx0 + jw, jy0 + jh, "frente"))

    janela_frente(334, 119, 11, 9)
    janela_frente(379, 119, 11, 9)
    # porta de tábuas com dobradiças e o vão de luz
    dx0, dx1 = 356, 369
    for y in range(117, ch + 1):
        for x in range(dx0, dx1):
            tab = (x - dx0) % 4
            k = [2, 3, 3, 1][tab] + (veio[y, x * 2 % W] - 0.5) * 1.5
            P.p(x, y, MADEIRA[int(np.clip(k, 0, 6))], d_frente * 0.8)
    for x in range(dx0 - 1, dx1 + 1):
        P.p(x, 116, MADEIRA[5], d_frente)
    for y in range(116, ch + 1):
        P.p(dx0 - 1, y, MADEIRA[4], d_frente)
        P.p(dx1, y, MADEIRA[1], d_frente * 0.5)
    for y in (121, 131):
        for x in range(dx0, dx0 + 6):
            P.p(x, y, "#2a2a30", d_frente)
        P.p(dx0 + 5, y, "#5a5a64", d_frente)
    P.p(dx1 - 3, 127, "#e0b860", d_frente)                # maçaneta
    for y in range(118, ch + 1):                          # fresta de luz da porta entreaberta
        P.p(dx1 - 1, y, "#ffb860", 0.0)
        E.p(dx1 - 1, y, "#ffc070", 0.9)
    # degrau (tora) e a neve varrida em volta
    for x in range(dx0 - 3, dx1 + 3):
        for y in range(ch + 1, ch + 4):
            k = [5, 3, 1][y - ch - 1]
            P.p(x, y, TORA[k], d_frente)
        P.p(x, ch + 1, NEVE[5] if x % 5 == 0 else TORA[6], d_teto)
    # ── janela do oitão (paralelogramo), virada para a fogueira
    jg = poli([(x0 - 4, ch - 15 - 4 * incl), (x0 - 12, ch - 15 - 12 * incl), (x0 - 12, ch - 6 - 12 * incl), (x0 - 4, ch - 6 - 4 * incl)])
    moldura = poli([(x0 - 3, ch - 16 - 3 * incl), (x0 - 13, ch - 16 - 13 * incl), (x0 - 13, ch - 5 - 13 * incl), (x0 - 3, ch - 5 - 3 * incl)])
    P.c.mascara(moldura & ~jg, MADEIRA[2])
    ys, xs = np.nonzero(jg)
    for x, y in zip(xs, ys):
        t = (y - (ch - 15 - (x0 - x) * incl)) / 9
        cor = hexa("#ffd27e") * (1 - t) + hexa("#ff9a44") * t
        if x == x0 - 8:
            cor = hexa("#3a2414")
        if t > 0.82:
            cor = hexa("#d8e4f4")
        P.p(x, y, cor, 0.0)
        E.p(x, y, cor, 1.0 if t <= 0.82 else 0.3)
    for x in range(x0 - 14, x0 - 2):                     # peitoril inclinado com neve
        y = int(round(ch - 5 - (x0 - x) * incl))
        P.p(x, y, NEVE[6], d_teto, cint=1)
        P.p(x, y + 1, MADEIRA[3], d_oitao)
    janelas.append((x0 - 12, int(ch - 15 - 12 * incl), x0 - 4, int(ch - 6 - 4 * incl), "oitao"))
    # ── telhado: plano da frente visto de cima, todo nevado, com a beirada grossa e pingentes
    ap = (x0 + px / 2, topo + py / 2 - cume)               # ápice do oitão
    beiral_y = topo - 1
    teto = poli([(x0 - 3, beiral_y + 2), (x1 + 6, beiral_y + 2), (x1 + 6 + px / 2, ap[1]), (ap[0], ap[1] - 1)])
    ys, xs = np.nonzero(teto)
    ond = ruido(503, 4)
    for x, y in zip(xs, ys):
        f = (y - ap[1]) / (beiral_y - ap[1] + 2)
        # ondas do vento paralelas à cumeeira (linhas finas quebradas) e o miolo mais claro no alto
        onda = abs(math.sin((y + ond[y, x] * 2.0) * 0.9)) < 0.12 and ond[y, x] > 0.5
        k = 5.4 - f * 1.2 + (ond[y, x] - 0.5) * 0.9 - (1.4 if onda else 0)
        kk = int(np.clip(k, 2, 6))
        P.p(x, y, NEVE[kk], d_teto * (1.15 - f * 0.45) * (0.8 if onda else 1), cint=0.15)
    # cumeeira: cornija de neve que pega o sol rasante
    for x in range(int(ap[0]), int(x1 + 6 + px / 2) + 1):
        P.p(x, ap[1] - 1, NEVE[6], max(d_teto, direto(L, (0.2, -0.3, 1))) * 1.3, cint=0.6)
        if x % 7 in (2, 3):
            P.p(x, ap[1] - 2, NEVE[6], max(d_teto, direto(L, (0.2, -0.3, 1))) * 1.3)
    # beirada da direita: a espessura da neve vista de lado
    for k in range(int(beiral_y + 2 - ap[1])):
        t_ = k / (beiral_y + 2 - ap[1])
        x = x1 + 6 + px / 2 * (1 - t_)
        y = ap[1] + k
        P.p(x + 1, y, NEVE[3], direto(L, (1, 0.1, 0.2)) * 1.2)
        P.p(x + 2, y + 1, NEVE[1], direto(L, (1, 0.1, 0.2)))
    # as duas empenas do oitão: tábua de madeira com a neve do telhado transbordando por cima
    d_emp = direto(L, (-0.7, 0.2, 0.7))
    tras = (x0 + px - 1, topo + py + 1)                    # beiral de trás
    frente = (x0 - 3, beiral_y + 2)
    for (a_, b_, grossa) in ((ap, tras, 2), (ap, frente, 1)):
        n = int(max(abs(b_[0] - a_[0]), abs(b_[1] - a_[1]))) + 1
        for i in range(n + 1):
            t_ = i / n
            x = a_[0] + (b_[0] - a_[0]) * t_
            y = a_[1] + (b_[1] - a_[1]) * t_
            P.p(x, y + 1, MADEIRA[2], d_emp * 0.6)
            P.p(x, y + 2, MADEIRA[1], d_emp * 0.3)
            for e in range(grossa + 1):
                P.p(x - (1 if b_ is tras else 0), y - e, NEVE[6 - e], max(d_emp, d_teto), cint=0.4)
    # beirada da frente: rolo de neve pendurado (3 px) com sombra embaixo
    g = np.random.default_rng(505)
    for x in range(x0 - 6, x1 + 8):
        caida = 1 + (ruido(506, 3)[0, x] > 0.55)
        for k in range(caida + 2):
            P.p(x, beiral_y + 1 + k, NEVE[6] if k == 0 else NEVE[5] if k < caida + 1 else NEVE[2], d_frente * 0.6 + d_teto * 0.4,
                cint=1 if k == 0 else 0)
        P.p(x, beiral_y + 3 + caida, TORA[0], d_frente * 0.2)
    # pingentes de gelo
    pingentes = []
    for x in range(x0 - 4, x1 + 6):
        if g.random() < 0.45:
            comp = int(1 + g.random() ** 1.6 * 7)
            y0 = beiral_y + 4 + (ruido(506, 3)[0, x] > 0.55)
            for k in range(comp):
                cor = "#e8f4ff" if k < comp - 1 else "#ffffff"
                P.p(x, y0 + k, cor if (k + x) % 3 else "#b8d0ec", d_frente * 0.7 + 0.2, cint=1 if k == comp - 1 else 0.4)
            pingentes.append((x, y0 + comp - 1))
    for i in range(14):                                     # pingentes no beiral do oitão
        t = 0.15 + i / 15 * 0.8
        x = ap[0] - 2 + (x0 + px - 3 - ap[0] + 2) * t
        y = ap[1] + (topo + py + 2 - ap[1]) * t + 2
        comp = int(1 + g.random() * 4)
        for k in range(comp):
            P.p(x, y + k, "#e0eefc", d_oitao * 0.8 + 0.15, cint=0.5)
    # ── chaminé de pedra
    cx0, cx1, ctop = 378, 387, 74
    cbase = int(beiral_y - (beiral_y - ap[1]) * 0.55)
    for y in range(ctop, cbase + 2):
        for x in range(cx0, cx1):
            row = (y - ctop) // 3
            junta = (y - ctop) % 3 == 2 or (x + row * 2) % 5 == 0
            u = (x - cx0) / (cx1 - cx0 - 1)
            k = 2 + (1 - u) * 1.2 * (1 if L[0] < 0 else -1) + (u * 1.4 if L[0] > 0 else 0) + ((x * 7 + y * 3) % 5) * 0.25
            P.p(x, y, PEDRA_CHAM[int(np.clip(k - (1.5 if junta else 0), 0, 6))],
                direto(L, ((u - 0.5) * 1.4, 0.8, 0.1)))
    for x in range(cx0 - 1, cx1 + 1):
        P.p(x, ctop, PEDRA_CHAM[4], d_teto)
        P.p(x, ctop - 1, NEVE[6], d_teto, cint=1)
        if x % 3:
            P.p(x, ctop - 2, NEVE[5], d_teto)
    for x in range(cx0 + 1, cx1 - 1):
        P.p(x, ctop, "#1a1410", 0)
        E.p(x, ctop, "#ff7a30", 0.5)
    for x in range(cx0 - 2, cx1 + 2):                       # neve acumulada no pé da chaminé
        P.p(x, cbase + 1, NEVE[6], d_teto, cint=1)
        P.p(x, cbase, NEVE[5] if x % 2 else NEVE[6], d_teto)
    # ── lampião pendurado entre a porta e a janela
    lampiao(P, E, 374, beiral_y + 6)
    return janelas, [(374, beiral_y + 9)], pingentes


def poste_lampiao(P: Plano, E: Camada, L) -> tuple[int, int]:
    """Poste de madeira na frente do oitão com um lampião pendurado (acende o chão onde o esqueleto fica)."""
    x, yb = 313, 143
    d = direto(L, (0.3, 0.8, 0.3))
    for y in range(yb - 22, yb + 1):
        P.p(x, y, TORA[4], d)
        P.p(x + 1, y, TORA[2], d * 0.6)
        if (y * 3) % 7 == 0:
            P.p(x, y, TORA[3], d)
    for xx in range(x - 4, x + 2):               # braço
        P.p(xx, yb - 21, TORA[3], d)
    P.p(x - 1, yb - 20, TORA[2], d)
    for xx in range(x - 4, x + 3):               # neve no braço e no topo
        P.p(xx, yb - 22, NEVE[6], direto(L, (0, 0.3, 1)), cint=1)
    P.p(x, yb - 23, NEVE[5], direto(L, (0, 0.3, 1)))
    lampiao(P, E, x - 3, yb - 19)
    for yy in range(yb - 1, yb + 2):              # montinho de neve no pé
        for xx in range(x - 3, x + 5):
            if ((xx - x - 0.5) / 3.6) ** 2 + ((yy - yb - 0.5) / 1.5) ** 2 <= 1:
                P.p(xx, yy, NEVE[5], direto(L, (0, 0.4, 1)), cint=0.5)
    return (x - 3, yb - 16)


def lampiao(P: Plano, E: Camada, lx: int, ly: int) -> None:
    """Lampião de ferro com vidro aceso (o vidro vai também para a camada emissiva)."""
    P.p(lx, ly - 2, "#2a2a30", 0.3)
    P.p(lx, ly - 1, "#2a2a30", 0.3)
    for (dx, dy, cor) in ((-1, 0, "#3a3a40"), (0, 0, "#5a5a64"), (1, 0, "#3a3a40"), (-2, 1, "#2a2a30"), (2, 1, "#2a2a30"),
                          (-2, 5, "#2a2a30"), (2, 5, "#2a2a30"), (-1, 6, "#3a3a40"), (0, 6, "#5a5a64"), (1, 6, "#3a3a40")):
        P.p(lx + dx, ly + dy, cor, 0.4)
    for dy in range(2, 5):
        P.p(lx - 2, ly + dy, "#2a2a30", 0.3)
        P.p(lx + 2, ly + dy, "#2a2a30", 0.3)
        for dx in (-1, 0, 1):
            cor = "#fff0b0" if dx == 0 and dy == 3 else "#ffc860"
            P.p(lx + dx, ly + dy, cor, 0)
            E.p(lx + dx, ly + dy, cor, 1.0)



MADEIRA_HEX = ("#24160c", "#3a2414", "#54361e", "#6e4828", "#8a5e34", "#a87644", "#c49258")


def esquis(P: Plano, L) -> None:
    """Dois esquis de madeira e dois bastões encostados no canto direito da cabana."""
    d = direto(L, (0.2, 0.9, 0.3))
    for (xb, yb, xt, yt, cor) in ((408, 139, 404, 112, ("#7a2a1c", "#b04428", "#d8643a")),
                                  (412, 140, 407, 113, ("#5a3418", "#8a5428", "#b47a3c"))):
        n = yb - yt
        for k in range(n + 1):
            t = k / n
            x = xb + (xt - xb) * t
            y = yb - k
            P.p(x, y, cor[1], d)
            P.p(x + 1, y, cor[0], d * 0.5)
            if k % 6 == 0:
                P.p(x, y, cor[2], d)
        # ponta curvada
        P.p(xt, yt - 1, cor[2], d)
        P.p(xt - 1, yt - 2, cor[2], d)
        P.p(xt - 1, yt - 1, cor[1], d)
        # presilha
        P.p(xb + (xt - xb) * 0.45, yb - n * 0.45, "#2a2a30", d)
        P.p(xb + (xt - xb) * 0.45 + 1, yb - n * 0.45, "#5a5a64", d)
    for (xb, yb, xt, yt) in ((416, 141, 411, 118), (419, 141, 415, 117)):
        P.c.linha(xb, yb, xt, yt, hexa("#3a3a44"))
        P.p(xt, yt, "#a02a20", d)
        P.p(xb, yb - 3, "#c8ccd8", d)
        P.p(xb - 1, yb - 3, "#8a8e9a", d)
        P.p(xb + 1, yb - 3, "#8a8e9a", d)


def fogueira(P: Plano, E: Camada, L) -> None:
    """Só pedras, lenha cruzada, carvão e brasas (a chama entra por cima)."""
    fx, fy = FOGO
    for y in range(fy - 3, fy + 6):
        for x in range(fx - 13, fx + 14):
            d = ((x - fx) / 12) ** 2 + ((y - fy - 1) / 4.4) ** 2
            if d < 1:
                k = (x * 7 + y * 13) % 5
                P.p(x, y, "#2a2420" if d > 0.6 else ["#4a4440", "#3a3430", "#5e5650", "#1e1814", "#6a625a"][k], 0.2)
    for (x0, y0, x1, y1) in ((fx - 11, fy + 3, fx + 4, fy - 2), (fx + 11, fy + 3, fx - 4, fy - 2), (fx - 8, fy - 2, fx + 8, fy - 2)):
        for o in range(3):
            P.c.linha(x0, y0 + o, x1, y1 + o, MADEIRA[2 + (o == 0)] if o < 2 else hexa("#1a100a"))
        P.c.linha(x0, y0, x1, y1, hexa("#2a1a10"))
    for (x, y) in ((fx - 3, fy), (fx + 2, fy + 1), (fx - 6, fy + 2), (fx + 5, fy), (fx, fy + 2), (fx - 1, fy - 1),
                   (fx + 7, fy + 2), (fx - 8, fy + 1)):
        P.p(x, y, "#1a1210", 0)
        E.p(x, y, "#ff6a20")
        E.p(x + 1, y, "#ffb040", 0.75)
    g = np.random.default_rng(7)
    pedras = []
    n = 13
    for k in range(n):
        a = k / n * math.tau + 0.15
        pedras.append((fx + math.cos(a) * 16 + g.normal(0, 0.4), fy + 0.5 + math.sin(a) * 5.4, k, a))
    pedras.sort(key=lambda p: p[1])
    for (x, y, k, a) in pedras:
        t = Camada()
        rx, ry = 3.0 + g.random() * 0.8, 2.2 + g.random() * 0.5
        for yy in range(int(y - ry - 2), int(y + ry + 3)):
            for xx in range(int(x - rx - 2), int(x + rx + 3)):
                if ((xx + 0.5 - x) / (rx + 0.9)) ** 2 + ((yy + 0.5 - y) / (ry + 0.9)) ** 2 <= 1:
                    t.p(xx, yy, "#141012")
        pedra(t, x, y, rx, ry, (-math.cos(a) * 0.6, -0.9), seed=700 + k, paleta=PEDRA[1:], escuro=0.0)
        dd = np.where(t.c[:, :, 3] > 0.4, np.clip(0.35 + (YA - y) * -0.15, 0.1, 0.8), 0) * direto(L, (0, 0.4, 1))
        P.juntar(t, dd.astype(np.float32))
        # fuligem na face de dentro e um tiquinho de neve nas pedras de trás
        for yy in range(int(y - ry), int(y + ry) + 1):
            xx = int(round(x - math.cos(a) * (rx - 0.8)))
            if t.c[yy, xx, 3] > 0.4 and (yy + k) % 2 == 0:
                P.p(xx, yy, "#1e1c1c", None)
        if y < fy - 1:
            for xx in range(int(x - 1), int(x + 2)):
                P.p(xx, int(y - ry - 0.6), NEVE[5], direto(L, (0, 0.3, 1)), cint=0.5)


TORA_PONTA = ["..bbb..", ".bLLLb.", "bLlllLb", "bLlclLb", "bLlllDb", ".bDDDb.", "..bbb.."]


def lenha(P: Plano, L) -> None:
    """Pilha de lenha: toras de ponta (casca, alburno claro, anéis e miolo) em fileiras desencontradas, entre dois
    moirões, com neve por cima."""
    x0, x1, yb = LENHA
    d_ponta = max(direto(L, (0, 1, 0.15)), 0.12)
    t = Camada()
    for x in (x0, x1):
        for y in range(yb - 17, yb + 1):
            t.p(x, y, TORA[4])
            t.p(x + 1, y, TORA[2])
    g = np.random.default_rng(55)
    filas = [(yb - 6, 0), (yb - 11, 3), (yb - 16, 1)]
    for i, (yt, desl) in enumerate(filas):
        x = x0 + 2 + desl
        n = 0
        while x + 6 <= x1 + 1 - (i == 2) * 3:
            tons = ("#3a2414", "#c69860", "#e6c48a", "#a87844", "#7a5430") if g.random() < 0.7 else \
                   ("#2e1c10", "#b48450", "#d4ac70", "#946436", "#6a4426")
            cores = {"b": tons[0], "L": tons[1], "l": tons[2], "c": tons[3], "D": tons[4]}
            t.bitmap(x, yt, TORA_PONTA, cores)
            if g.random() < 0.4:                      # rachadura
                t.p(x + 3, yt + 2, tons[4])
                t.p(x + 4, yt + 1, tons[4])
            x += 6 if g.random() < 0.7 else 7
            n += 1
    m = t.c[:, :, 3] > 0.4
    P.juntar(t, np.where(m, d_ponta, 0).astype(np.float32), base=yb)
    nevar(P, m, L, 551, esp=2.6, lumps=0.9, base=yb)


def cepo(P: Plano, L) -> None:
    """Cepo de rachar lenha com o machado cravado e lascas em volta."""
    cx, yb = CEPO
    lado = 1 if L[0] > 0 else -1
    t = Camada()
    for y in range(yb - 6, yb + 1):
        for x in range(cx - 5, cx + 6):
            u = (x - cx) / 5.5
            k = int(np.clip(3 + u * lado * 2 + ((x + y * 3) % 5 == 0) * -1, 0, 6))
            t.p(x, y, TORA[k])
    for y in range(yb - 8, yb - 5):
        for x in range(cx - 5, cx + 6):
            if ((x - cx) / 5.5) ** 2 + ((y - yb + 6.5) / 1.6) ** 2 <= 1:
                t.p(x, y, "#c8a06a" if (int(math.hypot(x - cx, (y - yb + 6.5) * 3)) % 2) else "#a8804e")
    m = t.c[:, :, 3] > 0.4
    P.juntar(t, np.where(m, direto(L, (0, 0.7, 0.6)), 0).astype(np.float32), base=yb)
    nevar(P, m, L, 561, esp=1.6, lumps=0.6, base=yb)
    # machado cravado na beirada da direita, com o cabo descendo até a neve (o alto do cepo fica livre)
    for k in range(11):
        P.p(cx + 5 + k * 0.7, yb - 7 + k * 0.62, "#8a5a2a" if k % 4 else "#6a4220", 0.5)
    for (dx, dy, cor) in ((0, 0, "#8a9098"), (1, 0, "#c8ced8"), (0, -1, "#a8aeb8"), (1, -1, "#e8eef8"), (-1, 0, "#6a7078"),
                          (0, 1, "#5a6068"), (1, 1, "#8a9098")):
        P.p(cx + 4 + dx, yb - 7 + dy, cor, direto(L, (0.3, 0.7, 0.6)))
    for (x, y) in ((cx - 8, yb + 1), (cx + 7, yb + 2), (cx - 5, yb + 3), (cx + 9, yb)):
        P.p(x, y, "#c8a06a", 0.5)
        P.p(x + 1, y, "#a8804e", 0.4)


def treno(P: Plano, L) -> None:
    """Trenó de madeira com patins curvos e um fardo amarrado (manta xadrez e lenha)."""
    x0, x1, yb = TRENO
    t = Camada()
    # patins
    for x in range(x0, x1 + 1):
        t.p(x, yb, "#3a2414")
        t.p(x, yb - 1, "#6a4424")
    for k in range(5):
        t.p(x1 + 1 + (k > 1) + (k > 3), yb - 1 - k, "#6a4424")
        t.p(x1 + 2 + (k > 1) + (k > 3), yb - 1 - k, "#3a2414")
    for x in (x0 + 4, x0 + 13, x0 + 22, x0 + 31):
        for y in range(yb - 4, yb - 1):
            t.p(x, y, "#4a2e18")
    # tábuas do assento
    for y in range(yb - 6, yb - 3):
        for x in range(x0 - 1, x1 + 2):
            t.p(x, y, ["#c08850", "#a06c3a", "#6a4424"][y - (yb - 6)])
    # fardo: manta xadrez enrolada, amarrada com corda
    for y in range(yb - 13, yb - 6):
        for x in range(x0 + 4, x1 - 6):
            if ((x - (x0 + x1 - 2) / 2) / 14) ** 2 + ((y - yb + 9.5) / 4) ** 2 <= 1:
                xad = ((x // 3) + (y // 2)) % 2
                base = "#a8382a" if xad else "#7a2418"
                if x % 6 == 0 or y % 4 == 0:
                    base = "#e0c890"
                t.p(x, y, base)
    for x in (x0 + 12, x0 + 22):
        for y in range(yb - 14, yb - 5):
            t.p(x, y, "#d8c8a0")
    m = t.c[:, :, 3] > 0.4
    dd = np.where(m, np.clip(direto(L, (0, 0.8, 0.6)) - np.clip((YA - (yb - 13)) / 14, 0, 1) * 0.4, 0, 1), 0)
    P.juntar(t, dd.astype(np.float32), base=yb)
    nevar(P, m, L, 571, esp=1.8, lumps=0.6, base=yb)


def banco(P: Plano, L) -> None:
    """Tora de sentar ao lado da fogueira (casca, ponta clara com anéis) com neve por cima."""
    x0, x1, yb = 178, 206, 163
    t = Camada()
    for x in range(x0, x1 + 1):
        for y in range(yb - 5, yb + 1):
            v = (y - (yb - 5)) / 5
            k = [3, 5, 4, 3, 2, 1][int(v * 5)] + ((x * 7 + y * 3) % 6 == 0) * -1
            t.p(x, y, TORA[int(np.clip(k, 0, 6))])
    for y in range(yb - 5, yb + 1):
        for x in range(x1 - 1, x1 + 2):
            if ((x - x1) / 1.6) ** 2 + ((y - yb + 2.5) / 3) ** 2 <= 1:
                t.p(x, y, "#e0c088" if (int(math.hypot(x - x1, (y - yb + 2.5)) * 1.5) % 2) else "#b89058")
    m = t.c[:, :, 3] > 0.4
    P.juntar(t, np.where(m, direto(L, (0, 0.8, 0.6)), 0).astype(np.float32), base=yb)
    nevar(P, m, L, 591, esp=1.8, lumps=0.8, base=yb)


def cerca(P: Plano, L) -> None:
    """Cerca baixa de varas, ao fundo à esquerda, com neve nas varas e nos moirões."""
    x0, x1, yb = CERCA
    t = Camada()
    lado = 1 if L[0] > 0 else -1
    postes = list(range(x0, x1 + 1, 22))
    for x in postes:
        for y in range(yb - 9, yb + 1):
            t.p(x, y, TORA[4 if lado > 0 else 2])
            t.p(x + 1, y, TORA[2 if lado > 0 else 4])
    for yv in (yb - 7, yb - 3):
        for x in range(x0, x1 + 2):
            yy = yv + int(round(math.sin(x / 9) * 0.6))
            t.p(x, yy, TORA[4])
            t.p(x, yy + 1, TORA[1])
    m = t.c[:, :, 3] > 0.4
    P.juntar(t, np.where(m, direto(L, (0, 0.9, 0.3)), 0).astype(np.float32), base=yb)
    nevar(P, m, L, 581, esp=1.6, lumps=0.7, base=yb)
    d_cima = direto(L, (0, 0.4, 1))
    for x in postes:                     # montinho de neve no pé de cada moirão
        for yy in range(yb - 1, yb + 2):
            for xx in range(x - 4, x + 6):
                if ((xx - x - 0.5) / 4.5) ** 2 + ((yy - yb - 0.6) / 1.6) ** 2 <= 1:
                    P.p(xx, yy, NEVE[5] if yy < yb + 1 else NEVE[3], d_cima, cint=0.5)


class Objetos:
    def __init__(self) -> None:
        self.P = Plano()
        self.E = Camada()


def pintar_objetos(nome: str, per: dict) -> tuple[Objetos, list, tuple, list]:
    o = Objetos()
    L = per["L"]
    t = Plano()
    janelas, lampiao, pingentes = cabana(t, o.E, per, nome)
    t2 = Plano()
    lampiao.append(poste_lampiao(t2, o.E, L))
    juntar_plano(o.P, t, CAB["chao"])
    # base: o oitão recua (a linha de chão vai de 136 na frente a 124 atrás)
    m = t.c.c[:, :, 3] > 0.4
    fundo = np.clip(CAB["chao"] + (XA - CAB["x0"]) * (-CAB["prof"][1] / CAB["prof"][0]) * -1, CAB["chao"] + CAB["prof"][1], CAB["chao"])
    o.P.base[m & (XA < CAB["x0"])] = fundo[m & (XA < CAB["x0"])]
    juntar_plano(o.P, t2, 143)
    for fn, args in ((moitas, (L,)), (esquis, (L,)), (cerca, (L,)), (banco, (L,)), (lenha, (L,)), (cepo, (L,)), (treno, (L,))):
        t = Plano()
        fn(t, *args)
        juntar_plano(o.P, t, None)
    t = Plano()
    fogueira(t, o.E, L)
    juntar_plano(o.P, t, FOGO[1] + 4)
    o.P.c.contornar("#10101c", 0.28)
    return o, janelas, lampiao, pingentes


def juntar_plano(dst: Plano, src: Plano, base: float | None) -> None:
    m = src.c.c[:, :, 3] > 0.4
    dst.c.juntar(src.c)
    dst.d[m] = src.d[m]
    dst.cint[m] = src.cint[m]
    if base is not None:
        dst.base[m] = base
    else:
        dst.base[m] = np.where(src.base[m] >= 0, src.base[m], dst.base[m])


def pintar_pinheiros_meio(nome: str, per: dict) -> Plano:
    """A parede de pinheiros grandes nos dois lados da clareira (escura à esquerda, sob o texto), com a vista do
    centro aberta para as montanhas; alguns pinheiros atrás da cabana."""
    P = Plano()
    L = per["L"]
    lista = [  # x, base, altura, largura, semente, escuro
        (8, 120, 118, 30, 11, 0.35), (44, 114, 104, 28, 12, 0.3), (78, 110, 92, 24, 13, 0.3), (110, 109, 78, 22, 14, 0.25),
        (138, 107, 62, 18, 15, 0.2), (162, 106, 46, 14, 16, 0.15), (184, 105, 30, 10, 17, 0.1), (26, 112, 80, 22, 31, 0.4),
        (94, 107, 64, 18, 32, 0.35), (60, 108, 70, 20, 33, 0.35),
        (356, 104, 34, 11, 18, 0.05), (372, 103, 44, 13, 19, 0.05), (402, 106, 66, 18, 20, 0.05), (432, 112, 88, 24, 21, 0.1),
        (458, 108, 100, 26, 22, 0.12), (418, 104, 52, 15, 23, 0.05), (314, 102, 20, 7, 24, 0.0), (330, 102, 26, 8, 25, 0.0),
        (480, 116, 110, 28, 26, 0.15),
    ]
    for (x, b, alt, lg, s, esc) in sorted(lista, key=lambda a: a[1]):
        t = Plano()
        pinheiro(t, x, b, alt, lg, L, seed=s, neve=1.0, tronco_alt=4, escuro=esc)
        juntar_plano(P, t, b)
    return P


def pintar_pinheiros_perto(nome: str, per: dict) -> Plano:
    """O pinheiro enorme da frente à esquerda (escuro, sai do quadro) e arbustos nevados no chão."""
    P = Plano()
    L = per["L"]
    t = Plano()
    pinheiro(t, 20, 196, 196, 46, L, seed=41, neve=1.0, tronco_alt=10, escuro=0.5)
    juntar_plano(P, t, 196)
    return P


def moitas(P: Plano, L) -> None:
    """Montinhos de neve com galhos secos furando, pedras nevadas e pinheirinhos novos espalhados pela clareira."""
    g = np.random.default_rng(111)
    d_cima = direto(L, (0, 0.3, 1))
    lugares = [(132, 128, 1), (150, 176, 0), (104, 150, 2), (180, 124, 0), (120, 140, 2), (412, 150, 1), (440, 172, 0),
               (398, 190, 2), (214, 190, 1), (122, 192, 0), (452, 194, 2), (346, 124, 0), (456, 140, 2), (82, 132, 0)]
    for (x, y, tipo) in lugares:
        t = Plano()
        if tipo == 0:      # moita seca coberta de neve
            for k in range(7):
                a = -math.pi / 2 + (k - 3) * 0.32
                comp = 4 + g.random() * 4
                for s_ in range(int(comp)):
                    t.p(x + math.cos(a) * s_, y + math.sin(a) * s_, "#3a2a1e" if s_ % 3 else "#5a4030", 0.3)
            for yy in range(y - 3, y + 1):
                for xx in range(x - 5, x + 6):
                    if ((xx - x) / 5.5) ** 2 + ((yy - y) / 3.2) ** 2 <= 1:
                        k = 5 if yy < y - 1 else 3
                        t.p(xx, yy, NEVE[k], d_cima * (1.1 if yy < y - 1 else 0.6), cint=0.8)
        elif tipo == 1:    # pedra nevada
            c = Camada()
            pedra(c, x, y - 1.5, 4.2, 2.6, (L[0], -L[2]), seed=x, paleta=PEDRA[:6])
            dd = np.where(c.c[:, :, 3] > 0.4, 0.4, 0).astype(np.float32)
            t.juntar(c, dd)
            nevar(t, c.c[:, :, 3] > 0.4, L, x, esp=2.2, lumps=0.7)
        else:              # pinheirinho novo
            pinheiro(t, x, y, 12 + g.random() * 6, 5 + g.random() * 2, L, seed=x + 7, neve=1.0, tronco_alt=1)
        juntar_plano(P, t, y)


def pintar_frente(nome: str, per: dict) -> Camada:
    """Galhos de pinheiro nevados bem perto da câmera, nos cantos de baixo (saem bem desfocados)."""
    c = Camada()
    g = np.random.default_rng(91)
    for (x0, y0, dirx, comp) in ((-6, 186, 1, 70), (-4, 6, 1, 50)):
        for k in range(comp):
            x = x0 + dirx * k
            y = y0 - k * 0.18 + math.sin(k / 9) * 2
            c.p(x, y, "#2a1c12")
            c.p(x, y + 1, "#1a1008")
            if k % 2 == 0:
                for j in range(1, 9 - k // 12):
                    for s in (-1, 1):
                        xx = x + dirx * j * 0.6
                        yy = y + s * j * 0.9
                        c.p(xx, yy, VERDE_PINHO[2 + (s < 0)])
                        if s < 0 and g.random() < 0.55:
                            c.p(xx, yy - 1, NEVE[5])
    return c


# ─────────────────────────────── Montagem com luz ───────────────────────────────
def poligono_luz(pts) -> np.ndarray:
    m = poli(pts).astype(np.float32)
    return desfocar(ampliar(m[:, :, None]), 4)[:, :, 0]


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    fx, fy = FOGO
    L = normal3(per["L"])

    ceu = ampliar(pintar_ceu(nome, per))
    mlonge, d_longe = cordilheira(nome, per, PICOS_LONGE, 120, 30, HORIZ, 0.8)
    mperto, d_perto = cordilheira(nome, per, PICOS_MEIO, 140, 14, HORIZ, 1.1)
    encosta, _ = pintar_encosta(nome, per)
    chao, molhado = pintar_chao(nome, per)
    pin_meio = pintar_pinheiros_meio(nome, per)
    obj, janelas, lampiao, pingentes = pintar_objetos(nome, per)
    pin_perto = pintar_pinheiros_perto(nome, per)
    frente = pintar_frente(nome, per)

    # (camada rgba, mapa de luz direta, desfoque, névoa, recebe fogo, cintila)
    planos = [
        (mlonge.c, d_longe, 2.0, 0.42, 0.0, None),
        (mperto.c, d_perto, 1.4, 0.24, 0.0, None),
        (encosta.c.c, encosta.d, 1.0, 0.12, 0.15, encosta.cint),
        (chao.c.c, chao.d, 0.0, np.clip(1 - (GYa - HORIZ) / 30, 0, 1) * 0.12, 1.0, chao.cint),
        (pin_meio.c.c, pin_meio.d, 0.5, 0.05, 0.6, pin_meio.cint),
        (obj.P.c.c, obj.P.d, 0.0, 0.0, 1.0, obj.P.cint),
        (pin_perto.c.c, pin_perto.d, 1.6, 0.0, 0.5, pin_perto.cint),
    ]
    img = ceu.copy()
    sol_m = np.zeros(img.shape[:2], np.float32)
    m_d = np.zeros_like(sol_m)
    m_nev = np.zeros_like(sol_m)
    m_fogo = np.zeros_like(sol_m)
    m_cint = np.zeros_like(sol_m)
    alfas = []
    for cam, d, r, nev, fo, ci in planos:
        a = desfocar_rgba(ampliar(cam), r)
        al = a[:, :, 3]
        alfas.append(al)
        dd = desfocar(ampliar(d[:, :, None]), r)[:, :, 0] if r > 0 else ampliar(d[:, :, None])[:, :, 0]
        img = sobre(img, a)
        sol_m = sol_m * (1 - al) + al
        m_d = m_d * (1 - al) + dd * al
        m_nev = m_nev * (1 - al) + nev * al
        m_fogo = m_fogo * (1 - al) + fo * al
        cc = ampliar(ci[:, :, None])[:, :, 0] if ci is not None else 0
        m_cint = m_cint * (1 - al) + cc * al * (r < 0.8)
    obj_a = alfas[5]

    # ── sombras projetadas (do sol/lua e da fogueira) e oclusão de contato
    so_chao = ((YA >= BORDA_CHAO[None, :]) & (obj.P.c.c[:, :, 3] < 0.4)).astype(np.float32)
    s_obj = projetar_sombra(obj.P.c.c[:, :, 3], obj.P.base, per["sombra"])
    s_pin = projetar_sombra(pin_meio.c.c[:, :, 3], pin_meio.base, per["sombra"])
    s_per = projetar_sombra(pin_perto.c.c[:, :, 3], pin_perto.base, per["sombra"])
    sombra = np.maximum.reduce([s_obj, s_pin, s_per]) * so_chao
    # sombras de pinheiros fora do quadro riscando a neve (manhã pela direita, tarde pela esquerda)
    sx, sy = per["sombra"]
    if nome != "noite":
        fora = ((560, 104, 6), (600, 112, 9), (640, 106, 5), (700, 110, 8)) if nome == "manha" else \
               ((-40, 200, 8), (-90, 230, 10))
        for (bx, by, larg) in fora:
            yy = by + (XA - bx) * (sy / sx)
            banda = (np.abs(YA - yy) < larg * 0.5 + np.abs(bx - XA) * 0.01) & (YA > HORIZ)
            banda &= (XA < bx) if sx < 0 else (XA > bx)
            sombra = np.maximum(sombra, banda.astype(np.float32) * 0.85 * so_chao)
    if nome == "manha":   # o pinheirão da frente e a mata da esquerda deixam o lado do texto na sombra
        sombra = np.maximum(sombra, (1 - suave(110, 190, XA + (YA - 150) * 0.4)) * 0.9 * so_chao)
    sombra = desfocar(ampliar(sombra[:, :, None]), 1.6)[:, :, 0]

    def do_fogo(xs, b):
        vx, vy = xs - fx, b - fy
        n = np.maximum(np.hypot(vx, vy * 2.6), 1)
        k = np.clip(n / 24, 0.4, 2.6)
        return vx / n * k, vy / n * k * 0.45
    s_fogo = projetar_sombra(obj.P.c.c[:, :, 3], obj.P.base, do_fogo)
    s_fogo[fy - 8:fy + 7, fx - 19:fx + 20] = 0
    s_fogo = desfocar(ampliar((s_fogo * so_chao)[:, :, None]), 3)[:, :, 0]
    ao = np.zeros((H, W), np.float32)
    pe = (obj.P.c.c[:, :, 3] > 0.4) & (obj.P.base >= 0) & (np.abs(YA - obj.P.base) < 2.5)
    ao = np.maximum(ao, pe.astype(np.float32))
    pe2 = (pin_meio.c.c[:, :, 3] > 0.4) & (np.abs(YA - pin_meio.base) < 3)
    ao = np.maximum(ao, pe2.astype(np.float32) * 0.8)
    ao[CAB["chao"] + 3:CAB["chao"] + 6, CAB["x0"] - 2:CAB["x1"] + 3] = 0.7
    ao = desfocar(ampliar(ao[:, :, None]), 4)[:, :, 0] * (1 - obj_a * 0.6)

    # ── a luz: céu (ambiente azul) + sol/lua direto + fogueira + janelas + lampião
    amb = hexa(per["amb"]) * per["amb_k"]
    # o céu ilumina mais o que olha para cima: neve recebe mais ambiente que paredes
    luz = amb[None, None, :] * (1 - ao[:, :, None] * 0.55)
    direta = m_d * (1 - sombra * 0.93)
    cor_sol = np.broadcast_to(hexa(per["sol"]), (H * ESC, W * ESC, 3))
    if nome == "tarde":   # alpenglow: o último sol, dourado nos cumes e rosa mais embaixo
        t_ = np.clip((GYa - 12) / 50, 0, 1)[:, :, None]
        cor_sol = hexa("#ffc47a") * (1 - t_) + hexa(per["sol"]) * t_
    luz = luz + cor_sol * per["sol_k"] * direta[:, :, None]
    fk = per["fogo_k"]
    raio_f = {"manha": 70, "tarde": 90, "noite": 120}[nome]
    fogo = luz_em_degraus(fx, fy - 4, raio_f, 0.5, 21, 7)[:, :, None] * hexa("#ff7418") * 1.15
    fogo += luz_em_degraus(fx, fy - 5, raio_f * 0.45, 0.55, 22, 5)[:, :, None] * hexa("#ffb048") * 0.75
    fogo += luz_pontual(fx, fy - 6, 16, 0.7)[:, :, None] * hexa("#ffd890") * 0.6
    fogo = fogo * (1 - s_fogo * 0.85)[:, :, None]
    # relevo da neve virado para o fogo: cada monte e cada pegada acende do lado da fogueira
    nxa, nya, nza = (ampliar(v[:, :, None])[:, :, 0] for v in chao.normal)
    vx, vy, vz = (fx - GXa), (fy - GYa) * 2.2, np.full_like(GXa, 9.0)
    vn = np.sqrt(vx * vx + vy * vy + vz * vz)
    rel = np.clip((nxa * vx + nya * vy + nza * vz) / vn, 0, 1)
    rel = np.floor(rel * 6 + 0.5) / 6
    no_chao = ampliar(chao.chao[:, :, None].astype(np.float32))[:, :, 0] * (1 - obj_a)
    # perto demais do fogo a luz satura: o derretido e as pedras recebem menos (ficam escuros e definidos)
    perto_fogo = desfocar(ampliar((((XA - fx) / 30) ** 2 + ((YA - fy) / 10) ** 2 < 1)[:, :, None].astype(np.float32)), 8)[:, :, 0]
    m_fogo = m_fogo * (1 - perto_fogo * 0.45)
    fator_rel = 1 + (rel * 1.5 - 0.8) * no_chao
    luz = luz + fogo * fk * m_fogo[:, :, None] * fator_rel[:, :, None]
    jk = per["jan_k"]
    poca_a = np.zeros((H, W), np.float32)
    ch = CAB["chao"]
    for (jx0, jy0, jx1, jy1, tipo) in janelas:
        if tipo == "frente":
            m = poli([(jx0, ch + 4), (jx1, ch + 4), (jx1 + 3, ch + 14), (jx0 - 3, ch + 14)])
            fade = np.clip(1 - (YA - ch - 4) / 12, 0, 1)
            meio = (jx0 + jx1) / 2
            caixilho = np.abs(XA - (meio + (XA - meio) * 0 + (YA - ch - 4) * 0)) < 0.6
        else:
            continue
        poca_a = np.maximum(poca_a, m * fade * (1 - caixilho * 0.8))
    poca_a = np.floor(poca_a * 4 + 0.6) / 4
    poca = desfocar(ampliar(poca_a[:, :, None]), 1.2)[:, :, 0]
    luz = luz + poca[:, :, None] * hexa("#ffb45a") * 1.4 * jk * (1 - obj_a[:, :, None] * 0.6)
    sob_teto = suave(CAB["chao"] - 23, CAB["chao"] - 19, GYa)[:, :, None]      # o telhado não pega luz de baixo
    for i, (lpx, lpy) in enumerate(lampiao):
        luz = luz + luz_em_degraus(lpx, lpy, 30, 0.8, 7 + i, 5)[:, :, None] * hexa("#ffc068") * 0.8 * jk * m_fogo[:, :, None] * sob_teto
    for (jx0, jy0, jx1, jy1, tipo) in janelas:   # a janela acende a parede e a neve em volta
        luz = luz + luz_pontual((jx0 + jx1) / 2, jy1 + 2, 16, 0.7)[:, :, None] * hexa("#ffb050") * 0.5 * jk * sob_teto
    img = img * (1 - sol_m[:, :, None]) + img * sol_m[:, :, None] * luz

    # ── luz de recorte: a borda de cima da neve contra o fundo acende do lado da luz
    alto = np.maximum.reduce([pin_meio.c.c[:, :, 3], pin_perto.c.c[:, :, 3], obj.P.c.c[:, :, 3]]) > 0.5
    ddx = 2 if L[0] > 0 else -2
    viz = np.roll(np.roll(alto, 1, 0), ddx, 1)
    viz[:3, :] = viz[-3:, :] = True
    viz[:, :3] = viz[:, -3:] = True
    rec = (alto & ~viz).astype(np.float32)
    rec = desfocar(ampliar(rec[:, :, None]), 0.8)[:, :, 0]
    cor_rec = {"manha": "#fff0d0", "tarde": "#ffb090", "noite": "#90aaff"}[nome]
    img += rec[:, :, None] * hexa(cor_rec) * {"manha": 0.45, "tarde": 0.6, "noite": 0.35}[nome]

    # ── névoa por distância e névoa baixa na base das montanhas
    nev = hexa(per["nevoa"]) * per["nevoa_k"]
    baixa = np.exp(-((GYa - 100) / 8) ** 2) * 0.16 * (1 - obj_a)
    mn = np.clip(m_nev + baixa * sol_m, 0, 1)[:, :, None]
    img = img * (1 - mn) + nev * mn

    # ── emissivos: janelas, brasas, lampião, fresta da porta
    em = ampliar(obj.E.c)
    k_em = {"manha": 0.6, "tarde": 0.85, "noite": 1.05}[nome]
    img = img * (1 - em[:, :, 3:4] * min(1, k_em)) + em[:, :, :3] * em[:, :, 3:4] * k_em
    halo = desfocar(em[:, :, :3] * em[:, :, 3:4], 4) * 0.8 + desfocar(em[:, :, :3] * em[:, :, 3:4], 16) * 0.9
    img += halo * k_em * 0.42

    # ── fumaça da chaminé: coluna volumétrica que sobe e o vento leva para a esquerda
    fum = np.zeros((H * ESC, W * ESC), np.float32)
    gf = np.random.default_rng(13)
    for k in range(70):
        t = k / 70
        r = (3 + t * 13) * ESC * (0.8 + gf.random() * 0.4)
        x = 382 - t ** 1.7 * 110 + gf.normal(0, 0.3 + t * 3)
        y = 72 - t * 60 + gf.normal(0, 0.3 + t * 2)
        X, Y = int(x * ESC), int(y * ESC)
        a = (1 - t) ** 1.3 * 0.42 * (0.6 + gf.random() * 0.8)
        ri = int(r * 1.3)
        y0, y1, x0, x1 = max(0, Y - ri), min(H * ESC, Y + ri), max(0, X - ri), min(W * ESC, X + ri)
        if y0 < y1 and x0 < x1:
            yy, xx = np.mgrid[y0:y1, x0:x1]
            fum[y0:y1, x0:x1] += np.exp(-(((xx - X) ** 2 + (yy - Y) ** 2) / (r * r)) * 2.0) * a
    textura = ampliar(ruido(15, 5)[:, :, None])[:, :, 0]
    fum = np.clip(fum * (0.6 + textura * 0.8), 0, 0.85) * (0.6 if nome == "noite" else 1.0)
    fum = desfocar(fum[:, :, None], 3)[:, :, 0]
    # sombreamento da fumaça: o lado virado para a luz clareia, o de baixo fica cinza-azulado
    desl = int(round(L[0] * 12)), int(round(-L[2] * 12))
    grad = fum - np.roll(np.roll(fum, desl[1], 0), desl[0], 1)
    lado_luz = np.clip(0.5 - grad * 6, 0, 1)[:, :, None]
    k_f = {"manha": 1.0, "tarde": 0.95, "noite": 0.4}[nome]
    escura = hexa({"manha": "#7a88a8", "tarde": "#6a5a8a", "noite": "#202a4a"}[nome])
    luz_f = (escura * (1 - lado_luz) + hexa(per["fumaca"]) * lado_luz) * k_f
    if nome == "noite":   # à noite, a base da fumaça pega o laranja da chaminé
        luz_f = luz_f + luz_pontual(382, 70, 14, 1.0)[:, :, None] * hexa("#ff9a50") * 0.5
    img = img * (1 - fum[:, :, None]) + luz_f * fum[:, :, None]

    # ── feixes de luz com pó de gelo e o brilho do astro
    poe = ampliar(ruido(81, 3)[:, :, None])[:, :, 0]
    if nome == "manha":
        vis = ((1 - sol_m) * (GYa < 80)).astype(np.float32)
        brilho = np.exp(-np.hypot(GXa - 470, (GYa - 18)) / 30)
        raios = raios_de_luz((vis * (0.3 + brilho * 4)).astype(np.float32), (470, 18), passos=80, alcance=0.96, queda=0.975)
        raios = desfocar(raios[:, :, None], 4)[:, :, 0]
        img += raios[:, :, None] * hexa("#fff0d0") * 0.7
        f = (facho(470, 0, 330, 160, 6, 30, 1.4) * 0.8 + facho(470, 0, 250, 172, 4, 22, 1.4) * 0.55 +
             facho(470, 0, 400, 176, 4, 18, 1.4) * 0.5)
        f = f * (0.5 + 0.7 * poe) * np.clip((GXa - 150) / 160, 0, 1)
        f = desfocar(f[:, :, None], 3)[:, :, 0] * (1 - obj_a * 0.5)
        img += f[:, :, None] * hexa("#ffeccc") * 0.5
        cor_p, peso_p = "#ffffff", f * 1.6
    elif nome == "tarde":
        f = (facho(-60, 40, 150, 170, 10, 60, 1.2) * 0.5 + facho(-60, 40, 300, 150, 8, 40, 1.3) * 0.35)
        f = f * (0.5 + 0.7 * poe)
        f = desfocar(f[:, :, None], 4)[:, :, 0] * (1 - obj_a * 0.5)
        img += f[:, :, None] * hexa("#ffb898") * 0.22
        cor_p, peso_p = "#ffd8c8", f * 1.2 + 0.05
    else:
        cor_p, peso_p = "#c8d8ff", luz_pontual(240, 120, 120, 0.6) * 0.25
    gp = np.random.default_rng(83)
    rgbp = hexa(cor_p)
    for _ in range(700):
        X, Y = int(gp.random() * (W * ESC - 4)), int(gp.random() * (H * ESC - 4))
        if any(x0 * ESC <= X <= x1 * ESC and y0 * ESC <= Y <= y1 * ESC for (x0, y0, x1, y1) in LIVRE.values()):
            continue
        k = peso_p[Y, X] * (0.3 + gp.random() * 0.8)
        if k > 0.05:
            img[Y:Y + 2, X:X + 2] += rgbp * k

    # ── cintilar: grãos de neve que acendem onde a luz bate (sol, fogo, janelas)
    luz_tot = (hexa(per["sol"]) * per["sol_k"] * direta[:, :, None] + fogo * fk * 0.6 +
               poca[:, :, None] * hexa("#ffb45a") * jk)
    forca = luz_tot.max(2) * (m_cint > 0.05)
    gc = np.random.default_rng(97)
    ys, xs = np.nonzero(forca[::ESC, ::ESC] > 0.3)
    for y, x in zip(ys, xs):
        if gc.random() > m_cint[y * ESC + 1, x * ESC + 1] * 0.16:
            continue
        X, Y = x * ESC + 1, y * ESC + 1
        k = min(forca[Y, X], 1.4) * (0.5 + gc.random() * 0.7)
        cor = luz_tot[Y, X] / max(luz_tot[Y, X].max(), 1e-3)
        img[Y, X] += cor * k * 1.4
        if k > 0.95 and gc.random() < 0.25:
            for dd in (-2, -1, 1, 2):
                kk = k * (0.5 if abs(dd) == 1 else 0.2)
                img[Y + dd, X] += cor * kk
                img[Y, X + dd] += cor * kk
    # pingentes: a ponta acende
    for (x, y) in pingentes:
        X, Y = x * ESC + 1, y * ESC + 1
        img[Y, X] += luz_tot[Y, X] * 0.6 + 0.15

    # ── primeiro plano desfocado e escuro
    fr = desfocar_rgba(ampliar(frente.c), 8)
    k_fr = {"manha": 0.5, "tarde": 0.42, "noite": 0.3}[nome]
    img = sobre(img, fr * np.array([k_fr, k_fr, k_fr * 1.08, 1], dtype=np.float32))

    # ── acabamento: brilho, curva de tom, cor, vinheta e grão
    lum = img.mean(2, keepdims=True)
    claro = np.clip(img * np.clip((lum - 0.86) * 5, 0, 1), 0, 2)
    img = img + desfocar(claro, 10) * 0.35 + desfocar(claro, 32) * 0.28
    joelho = 0.74
    img = np.where(img < joelho, img, joelho + (1 - joelho) * (1 - np.exp(-(img - joelho) / (1 - joelho))))
    q, fr_ = hexa(per["quente"]), hexa(per["fria"])
    lum = np.clip(img.mean(2, keepdims=True), 0, 1)
    img = img * (0.8 + 0.2 * (lum * q + (1 - lum) * (fr_ * 0.5 + 0.5)))
    img = np.clip((img - 0.48) * 1.06 + 0.48, 0, 1.2)
    xn, yn = GX / (W * ESC), GY / (H * ESC)
    calma = ((1 - suave(0.24, 0.42, xn)) * (0.55 + 0.45 * (1 - suave(0.5, 0.8, yn))))[:, :, None]
    canto = ((1 - suave(0.2, 0.42, xn)) * suave(0.55, 0.85, yn))[:, :, None]
    media = desfocar(np.clip(img, 0, 1.2), 14)
    img = media + (img - media) * (1 - 0.42 * calma)
    img *= 1 - 0.22 * calma - 0.12 * canto
    v = (xn - 0.55) ** 2 * 1.3 + (yn - 0.55) ** 2 * 1.5
    img *= (1 - np.clip(v - 0.08, 0, 1) * 1.0)[:, :, None]
    gg = np.random.default_rng(99)
    img += (gg.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.012
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


ANCORAS = {
    # gato: canto superior esquerdo da caixa de 36 x 22 px (arte), no chão livre
    "gato": [
        {"x": 222, "y": 153, "pose": "fogueira"},
        {"x": 168, "y": 170, "pose": "repouso"},
        {"x": 263, "y": 167, "pose": "sentado"},
        {"x": 301, "y": 176, "pose": "observando"},
        {"x": 226, "y": 177, "pose": "repouso"},
    ],
    # coruja: o ponto dos pés, pousada na lenha, no cepo, no fardo do trenó e em dois moirões da cerca
    "coruja": [
        {"x": 201, "y": 134},
        {"x": 164, "y": 154},
        {"x": 356, "y": 165},
        {"x": 147, "y": 104},
        {"x": 191, "y": 104},
    ],
    "particulas": "neve",
}


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    nomes = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in nomes:
        t0 = time.time()
        img = montar(nome)
        img.save(PASTA / f"cena-neve-{nome}.webp", quality=84, method=6)
        img.resize((960, 400), Image.LANCZOS).save(PASTA / f"cena-neve-{nome}-960.webp", quality=82, method=6)
        print(nome, (PASTA / f"cena-neve-{nome}.webp").stat().st_size // 1024, "KB",
              (PASTA / f"cena-neve-{nome}-960.webp").stat().st_size // 1024, "KB", f"{time.time() - t0:.1f}s")
    (Path(__file__).resolve().parent / "cena-neve.json").write_text(json.dumps(ANCORAS, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
