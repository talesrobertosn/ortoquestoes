"""Cenário "HD-2D" do topo da página inicial: o observatório da torre (01/11/2026).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai das
funções abaixo, na mesma técnica do acampamento (scripts/gerar_cena_inicio.py, de onde vêm os utilitários: a classe
Camada, o ruído, o desfoque em float, as luzes em degraus e o castelo da prova). Pixel art em 480 x 200, camada por
camada, montada em 3x com a luz calculada por pixel.

A cena: o terraço de pedra no alto de uma torre de estudos.
- Ao fundo, o parapeito com ameias (blocos um a um, juntas, lascas, musgo e hera), aberto no meio por um trecho baixo
  por onde se vê a mata lá embaixo, o rio, as serras, duas torres de estudo distantes (cúpulas de cobre) e o castelo
  da prova sobre o morro.
- O céu é o protagonista: manhã de nuvens (cada nuvem iluminada pelo sol por "marcha" de raio no campo de densidade),
  sol baixo entre as torres; tarde de poente com nuvens acesas por baixo; noite com via láctea (faixas de poeira),
  estrelas de vários tamanhos e cores, lua, um meteoro e uma aurora suave.
- No terraço: o braseiro de ferro com carvão e brasas (sem chama: o fogo animado entra por cima), a esfera armilar de
  latão (anéis projetados em 3D, metade de trás mais escura), a grande luneta laqueada de verde com anéis de latão num
  tripé, a mesa dos mapas estelares (abertos e enrolados, só linhas e pontos), o astrolábio, a vela, a pilha de livros,
  o baú, o barril de mapas, as lanternas, o torreão da escada à esquerda e o pilar com o estandarte à direita.
- O piso é feito de lajes em perspectiva verdadeira (coordenadas de mundo), com textura que encolhe com a distância e
  um anel de latão incrustado em volta do braseiro.

A luz: ambiente da hora; sombras do parapeito calculadas pelo raio de cada ponto do piso até o sol (as ameias deixam
faixas de sol entre as sombras); sombras projetadas dos objetos pelo ponto de fuga do sol e, à noite, pelo braseiro;
luz quente do braseiro em degraus, das lanternas e da vela; luz de recorte nas bordas viradas para o sol ou a lua;
brilho do metal; feixes volumétricos pelas aberturas do parapeito, com poeira; névoa por distância (cerração no vale
de manhã); brilho (bloom), curva de tom, correção de cor, área calma à esquerda para o texto, vinheta e grão.

Contrato com o site (componentes/inicio/cena): o fogo animado ocupa x 220-260, y 104-152 (base em 240,146); o
esqueleto fica em x 262-308, y 96-163 (pés em y 163), espaço livre; o gato e a coruja pousam nos pontos gravados em
cena-observatorio.json.

Saída em public/pixel/inicio/: cena-observatorio-{manha,tarde,noite}.webp (1440 x 600) e -960.webp (960 x 400),
e cena-observatorio.json.
Uso: python3 scripts/cenarios/inicio_observatorio.py            (as três)
     python3 scripts/cenarios/inicio_observatorio.py noite      (só uma)
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
sys.path.append(str(RAIZ / "scripts"))
import gerar_cena_inicio as R  # noqa: E402  (utilitários do acampamento; o script de lá não é alterado)
from gerar_cena_inicio import (  # noqa: E402
    BAYER, BAYER_HW, ESC, GX, GY, GXa, GYa, H, W, XA, YA, Camada, ampliar, castelo, copa, desfocar,
    desfocar_rgba, dist_segmentos, fbm, hexa, luz_em_degraus, luz_pontual, pal, raios_de_luz, ruido, ruido_ret,
    sobre, suave)

PASTA = RAIZ / "public" / "pixel" / "inicio"
FOGO = (240, 146)                       # base da chama animada (o sprite ocupa x 220-260, y 104-152)
LIVRE = {"fogo": (220, 104, 260, 152), "esqueleto": (262, 96, 308, 163)}
HOR = 104                               # linha do horizonte (altura do olho)
CAPA = 125                              # topo da capa do parapeito
MURO_BASE = 140                         # onde a face interna do parapeito encontra o piso
AMEIA_TOPO = 104                        # topo das ameias
AMEIAS = [c for c in range(8, W, 24) if c <= 200 or c >= 344]   # o meio (212-332) é um trecho baixo, aberto
FOCAL = 153.0                           # perspectiva do piso (lajes quadradas)
LAJE = 0.444
Z_MURO = FOCAL / (MURO_BASE - HOR)

GATO = [
    {"x": 222, "y": 162, "pose": "fogueira"}, {"x": 154, "y": 170, "pose": "repouso"},
    {"x": 264, "y": 168, "pose": "sentado"}, {"x": 310, "y": 152, "pose": "observando"},
    {"x": 190, "y": 176, "pose": "sentado"}, {"x": 296, "y": 176, "pose": "repouso"},
]
CORUJA = [{"x": 176, "y": 104}, {"x": 200, "y": 104}, {"x": 201, "y": 155}, {"x": 346, "y": 176}, {"x": 322, "y": 198}]

PERIODOS = {
    "manha": dict(
        astro=(292, 70), vp_sombra=(292, 6), luz=(0.15, -0.95), ceu=("#2a66bc", "#78b2e4", "#e4eef0"),
        amb="#a6bede", amb_k=0.44, sol="#ffe2ae", sol_k=1.15, fogo_k=0.32, lamp_k=0.2,
        nevoa="#d2e2ee", nevoa_k=0.92, quente="#ffe8c0", fria="#28466a", rim="#fff0c8", rim_k=0.75,
        agua=("#e8f4f8", "#9cc8dc"), obj_sol=0.42),
    "tarde": dict(
        astro=(318, 97), vp_sombra=(318, 66), luz=(0.75, -0.45), ceu=("#24336c", "#d27a6c", "#ffcf7c"),
        amb="#8c7cae", amb_k=0.4, sol="#ffa45c", sol_k=1.32, fogo_k=0.62, lamp_k=0.5,
        nevoa="#f4a67c", nevoa_k=1.0, quente="#ffd49a", fria="#34285a", rim="#ffb468", rim_k=1.35,
        agua=("#ffe0a0", "#e8906a"), obj_sol=0.2),
    "noite": dict(
        astro=(398, 30), vp_sombra=(398, -70), luz=(0.55, -0.85), ceu=("#02061a", "#0b1738", "#1d2c5c"),
        amb="#3a4c94", amb_k=0.3, sol="#8ea8ff", sol_k=0.4, fogo_k=1.8, lamp_k=1.0,
        nevoa="#18264c", nevoa_k=0.85, quente="#ffcf8a", fria="#0a1532", rim="#9ab4ff", rim_k=0.55,
        agua=("#6a80c0", "#24346a"), obj_sol=0.35),
}

# ─────────────────────────────── Paletas (escuro -> claro) ───────────────────────────────
PEDRA_T = pal("#1f1e25", "#2d2b33", "#3d3a41", "#4f4b51", "#645e5f", "#7b746e", "#958c7f", "#b0a690", "#cbbfa4")
PISO_T = pal("#26222a", "#342e33", "#443b3e", "#574c4a", "#6c5e57", "#827166", "#9a8774", "#b39f86", "#cbb79a")
FERRO = pal("#0c0c10", "#16161c", "#22222a", "#303038", "#42424c", "#585862", "#74747e")
LATAO = pal("#2e1c0a", "#553614", "#7c561e", "#a8782c", "#cf9e42", "#ecc56a", "#fbe6a6")
LACA = pal("#05120e", "#0a1e18", "#0f2c24", "#153c32", "#1d5044", "#2a6656", "#3e806c")
MADEIRA = pal("#1e120a", "#341f12", "#4c2e1a", "#664024", "#82542e", "#9e6a3a", "#ba844a")
PERG = pal("#6e5230", "#94733f", "#b8975e", "#d4b77e", "#e8d3a0", "#f6e8c4")
HERA = pal("#0e1a14", "#15261a", "#1e3420", "#294426", "#36552c")
MUSGO_T = pal("#26381e", "#344a24", "#46602a", "#5a7630")

TEX = fbm(140, (9, 4, 2), (0.5, 0.3, 0.2))
TEX_FINO = ruido(141, 1.6)
MUSGO_N = ruido(142, 5)


def tom(paleta: np.ndarray, v: float) -> np.ndarray:
    return paleta[int(np.clip(v, 0, len(paleta) - 1))]


def hash2(a, b) -> np.ndarray:
    return np.modf(np.abs(np.sin(np.asarray(a) * 12.9898 + np.asarray(b) * 78.233)) * 43758.5453)[0]


class Objetos:
    """Os objetos do terraço: cor, linha do chão (para as sombras), emissivos (brasas, vidro) e metal (brilho)."""

    def __init__(self) -> None:
        self.cam = Camada()
        self.base = np.full((H, W), -1, dtype=np.float32)
        self.emissivo = Camada()
        self.metal = np.zeros((H, W), dtype=np.float32)
        self.fogo = np.ones((H, W), dtype=np.float32)       # quanto cada objeto recebe da luz do braseiro
        self.luzes: list[tuple[float, float, str, float, float]] = []

    def add(self, base: float, fn, *args, fogo: float = 1.0) -> None:
        t = Camada()
        m = np.zeros((H, W), dtype=np.float32)
        fn(t, self.emissivo, m, *args)
        a = t.c[:, :, 3]
        self.cam.juntar(t)
        self.base[a > 0.4] = base
        self.metal = np.where(a > 0.4, m, self.metal)
        self.fogo = np.where(a > 0.4, fogo, self.fogo)


def marcar(m: np.ndarray, x, y, k: float = 1.0) -> None:
    x, y = int(x), int(y)
    if 0 <= x < W and 0 <= y < H:
        m[y, x] = k


# ─────────────────────────────── O céu ───────────────────────────────
def gradiente(per: dict) -> np.ndarray:
    topo, meio, hz = (hexa(c) for c in per["ceu"])
    t = np.clip(YA / (HOR + 2), 0, 1) ** 1.12
    a = np.clip(t / 0.56, 0, 1)[:, :, None]
    b = np.clip((t - 0.56) / 0.44, 0, 1)[:, :, None] ** 1.3
    ceu = topo * (1 - a) + meio * a
    return (ceu * (1 - b) + hz * b).astype(np.float32)


def campo_nuvens(nome: str) -> np.ndarray:
    calma = 1 - suave(100, 236, XA)
    if nome == "manha":
        base = ruido(301, 34) * 0.5 + ruido(302, 13) * 0.32 + ruido(303, 4.5) * 0.18
        d1 = base + np.exp(-((YA - 32) / 14) ** 2) * 0.6 - 0.74 - suave(46, 53, YA) * 0.8 * (YA < 70)
        base2 = ruido_ret(304, 34, 3) * 0.6 + ruido_ret(305, 10, 2) * 0.4
        d2 = base2 + np.exp(-((YA - 84) / 5) ** 2) * 0.3 - 0.8 - (ruido(306, 20) < 0.5) * 0.3
        d = np.maximum(d1 - calma * 0.12, d2)
    elif nome == "tarde":
        base = ruido_ret(311, 52, 4) * 0.52 + ruido_ret(312, 15, 2.5) * 0.3 + ruido(313, 4) * 0.18
        d1 = base + np.exp(-((YA - 62) / 17) ** 2) * 0.46 - 0.76
        base2 = ruido_ret(314, 40, 3) * 0.6 + ruido(315, 6) * 0.4
        d2 = base2 + np.exp(-((YA - 24) / 8) ** 2) * 0.22 - 0.84 - (ruido(316, 18) < 0.55) * 0.3
        d = np.maximum(d1, d2) - calma * 0.08
    else:
        base = ruido_ret(321, 44, 4) * 0.6 + ruido(322, 7) * 0.4
        d = base + np.exp(-((YA - 86) / 6) ** 2) * 0.34 - 0.86 - calma * 0.1 - suave(330, 420, XA) * 0.1 - suave(74, 60, YA) * 0.5
    return d.astype(np.float32)


def pintar_nuvens(nome: str, per: dict, ceu: np.ndarray) -> np.ndarray:
    """Nuvens em pixel art: densidade por ruído, luz pela marcha de raio até o sol (mais densidade, mais sombra)."""
    d = campo_nuvens(nome)
    sx, sy = per["astro"]
    vx, vy = sx - XA, sy - YA
    n = np.maximum(np.hypot(vx, vy), 1)
    ux, uy = vx / n, vy / n
    dp = np.clip(d, 0, None)
    acc = np.zeros_like(d)
    for s in range(1, 10):
        px = np.clip((XA + ux * s * 1.7).astype(int), 0, W - 1)
        py = np.clip((YA + uy * s * 1.7).astype(int), 0, H - 1)
        acc += dp[py, px]
    T = np.exp(-acc * {"manha": 0.9, "tarde": 2.2, "noite": 2.0}[nome])
    perto = np.exp(-np.hypot(XA - sx, (YA - sy) * 1.3) / {"manha": 60, "tarde": 70, "noite": 50}[nome])
    if nome == "manha":
        cores = pal("#7088b4", "#93aad0", "#bccce4", "#e2eaf4", "#fffcf4", "#fffef8")
    elif nome == "tarde":
        cores = pal("#3e3f6c", "#6a5878", "#b0647a", "#e88a6c", "#ffbe7c", "#ffe2a4")
    else:
        cores = pal("#0c1430", "#141e40", "#1e2a52", "#2c3a6a", "#4a5c94", "#7a90c8")
    v = np.clip(T * 0.85 + perto * 0.35 - np.clip(d, 0, 0.3) * 0.5 + (0.2 if nome == 'manha' else 0.05), 0, 1)
    if nome == "tarde":  # acesas por baixo: a borda de baixo mais quente
        baixo = np.clip(d - np.roll(d, -2, 0), 0, 1)
        v = np.clip(v + baixo * 1.4, 0, 1)
    idx = np.clip(np.floor(v * (len(cores) - 0.01) + BAYER_HW * 0.7), 0, len(cores) - 1).astype(int)
    cor = cores[idx]
    cor = cor * (1 + (perto ** 2 * {"manha": 0.35, "tarde": 0.9, "noite": 0.4}[nome])[:, :, None])
    cheia = (d + BAYER_HW * 0.04) > 0
    franja = ((d + 0.035 + BAYER_HW * 0.05) > 0) & ~cheia
    a = cheia * 1.0 + franja * 0.45
    a = a * (YA < HOR + 2)
    return (ceu * (1 - a[:, :, None]) + cor * a[:, :, None]).astype(np.float32)


def pintar_ceu(nome: str, per: dict) -> tuple[np.ndarray, list]:
    ceu = gradiente(per)
    sx, sy = per["astro"]
    d = np.hypot(XA - sx, (YA - sy) * 1.15)
    grandes: list[tuple[int, int, float, np.ndarray]] = []
    if nome == "manha":
        ceu += (np.exp(-d / 110) * 0.22)[:, :, None] * hexa("#fff2d6")
        ceu += (np.exp(-d / 20) * 0.55)[:, :, None] * hexa("#fff6e0")
        ceu = pintar_nuvens(nome, per, ceu)
        disco = d < 5.6
        ceu[disco] = hexa("#fffbec") * 1.6
        ceu[(d >= 5.6) & (d < 6.8)] = hexa("#fff0c4") * 1.25
    elif nome == "tarde":
        ceu += (np.exp(-d / 80) * 0.75)[:, :, None] * hexa("#ffb060")
        ceu += (np.exp(-d / 22) * 0.9)[:, :, None] * hexa("#ffd890")
        faixa = np.exp(-((YA - 98) / 9) ** 2) * np.exp(-np.abs(XA - sx) / 190)
        ceu += (faixa * 0.6)[:, :, None] * hexa("#ff9a50")
        ceu = pintar_nuvens(nome, per, ceu)
        ceu[d < 8.4] = hexa("#fff2b8") * 1.7
        ceu[(d >= 8.4) & (d < 9.8)] = hexa("#ffc860") * 1.35
        # faixas finas atravessando o disco
        for yy in (94, 97):
            ceu[yy, sx - 9:sx + 10] = ceu[yy, sx - 9:sx + 10] * 0.6 + hexa("#ff8a50") * 0.5
    else:
        g = np.random.default_rng(3)
        # via láctea: faixa diagonal com núcleo, nuvens de estrelas e faixas de poeira escura
        p0, p1 = np.array([70.0, 128.0]), np.array([420.0, -20.0])
        dv = (p1 - p0) / np.linalg.norm(p1 - p0)
        perp = (XA - p0[0]) * -dv[1] + (YA - p0[1]) * dv[0]
        ao_longo = (XA - p0[0]) * dv[0] + (YA - p0[1]) * dv[1]
        perp = perp + np.sin(ao_longo / 40) * 4
        nuvem_est = ruido(331, 5) * 0.6 + ruido(332, 2) * 0.4
        via = np.exp(-(perp / 20) ** 2) * (0.45 + 0.8 * nuvem_est)
        poeira = np.exp(-((perp - 2 + (ruido(333, 16) - 0.5) * 8) / 4.5) ** 2) * suave(0.3, 0.7, ruido(334, 16))
        via = np.clip(via - poeira * 0.45, 0, None) * (0.55 + 0.45 * suave(120, 260, XA))
        ceu += (via * 0.3)[:, :, None] * hexa("#a0a8e8")
        ceu += (np.exp(-(perp / 8) ** 2) * via * 0.2)[:, :, None] * hexa("#ead8c0")
        # aurora: cortinas com raios verticais, verde-azulada embaixo e azul em cima, à direita
        for (y0, amp, fase, k) in ((54, 9, 0.0, 1.0), (40, 7, 2.1, 0.55)):
            yb = y0 + amp * np.sin(XA / 39 + fase) + 4 * np.sin(XA / 13 + fase * 2)
            acima = np.clip(yb - YA, 0, None)
            perfil = np.where(YA <= yb, np.exp(-acima / 20), np.exp(-((YA - yb) / 2.2) ** 2))
            raios = 0.45 + 0.9 * ruido_ret(335 + int(fase * 10), 1.4, 40)
            lado = suave(150, 300, XA) * (1 - suave(470, 520, XA))
            inten = perfil * raios * lado * k
            cor = hexa("#4ce6a8") * (1 - np.clip(acima / 30, 0, 1))[:, :, None] + \
                hexa("#5a72d8") * np.clip(acima / 30, 0, 1)[:, :, None]
            ceu += cor * (inten * 0.2)[:, :, None]
        ceu = pintar_nuvens(nome, per, ceu)
        # estrelas: muitas pequenas, mais densas na via láctea; algumas grandes com cruz
        cores_est = [hexa("#e8eeff"), hexa("#cfdcff"), hexa("#fff2d8"), hexa("#ffd8b0"), hexa("#b8d0ff")]
        n_ok = 0
        while n_ok < 1100:
            x, y = int(g.random() * W), int(g.random() * (HOR - 4))
            if g.random() > 0.35 + via[y, x] * 1.4:
                continue
            n_ok += 1
            b = 0.25 + g.random() ** 3 * 1.1
            if XA[0, x] < 170:
                b *= 0.65
            cor = cores_est[int(g.random() * len(cores_est))]
            ceu[y, x] += cor * b
            if b > 1.05 and len(grandes) < 22:
                grandes.append((x, y, b, cor))
        # lua quase cheia, com mares e crateras, e o halo
        ax, ay = sx, sy
        for y in range(ay - 9, ay + 10):
            for x in range(ax - 9, ax + 10):
                dd = math.hypot(x - ax, y - ay)
                if dd < 7.6:
                    mar = (ruido(336, 3)[y, x] > 0.58) or (x - ax + 2) ** 2 + (y - ay + 1) ** 2 < 5
                    cr = (x - ax - 3) ** 2 + (y - ay - 3) ** 2 < 2
                    sombra = (x - ax) < -4.6 + (y - ay) * 0.2 and dd > 4
                    c = "#a8b4dc" if (mar or cr) else "#f2f4ff"
                    if dd > 6.6:
                        c = "#d0d8f4"
                    if sombra:
                        c = "#7a86b8"
                    ceu[y, x] = hexa(c) * 1.25
        ceu += (np.exp(-d / 22) * 0.32 + np.exp(-d / 70) * 0.1)[:, :, None] * hexa("#9ab0f0")
        # meteoro
        for k in range(26):
            t = k / 25
            x, y = 352 - t * 34, 12 + t * 13
            ceu[int(y), int(x)] += hexa("#e8f0ff") * (t ** 1.6) * 0.95
    return ceu, grandes


# ─────────────────────────────── A paisagem lá embaixo ───────────────────────────────
def pintar_longe(nome: str, per: dict) -> Camada:
    """Serras, a mata vista do alto (copas pequenas), o rio e as clareiras."""
    c = Camada()
    noite = nome == "noite"
    luz = per["luz"]
    n1 = ruido(401, 18)[0] * 5 + ruido(402, 5)[0] * 2
    lx = 1 if luz[0] > 0 else -1
    serras = {"manha": (pal("#8aa4c4", "#a2b8d2", "#bccce0", "#d6e0ec"), pal("#5e7c98", "#6f8ea8", "#86a4ba", "#a2bccc")),
              "tarde": (pal("#7e5a7a", "#9a6a80", "#bc8088", "#e0a090"), pal("#523c5c", "#664a66", "#80586c", "#a87072")),
              "noite": (pal("#0e1634", "#141e42", "#1c2850", "#283664"), pal("#0a1028", "#0e1634", "#141e42", "#1a2650"))}[nome]
    relevo = [ruido(405, 7) * 0.6 + ruido(406, 2.5) * 0.4, ruido(407, 6) * 0.6 + ruido(408, 2) * 0.4]
    for i, (paleta, rel) in enumerate(zip(serras, relevo)):
        if i == 0:
            topo = 88 - 9 * np.exp(-((np.arange(W) - 70) / 45) ** 2) - 6 * np.exp(-((np.arange(W) - 172) / 28) ** 2) \
                - 11 * np.exp(-((np.arange(W) - 404) / 50) ** 2) + n1
        else:
            topo = 97 - 4 * np.exp(-((np.arange(W) - 300) / 40) ** 2) - 2 * np.sin(np.arange(W) / 23) + n1[(np.arange(W) * 3) % W] * 0.4
        topo = topo.astype(np.float32)
        dentro = YA >= topo[None, :]
        # encostas: o lado virado para a luz mais claro (gradiente horizontal do relevo + inclinação do cume)
        gx = np.roll(rel, -1, 1) - np.roll(rel, 1, 1)
        incl = np.gradient(topo)[None, :]
        k = 1.6 + gx * lx * 9 - incl * lx * 0.5 - (YA - topo[None, :]) * 0.05 + BAYER_HW * 0.8
        k = np.where(YA - topo[None, :] < 1, k + 0.8, k)
        c.mascara(dentro, paleta[np.clip(k, 0, 3).astype(int)])
    # a mata: fundo e copas miúdas em fileiras (mais perto, maiores)
    mata = {"manha": pal("#1c3a34", "#24483c", "#2e5844", "#3a6a4c", "#4c7e56", "#62945e"),
            "tarde": pal("#2a2632", "#38323a", "#4a4040", "#5e5046", "#76644c", "#907a54"),
            "noite": pal("#060c1a", "#0a1222", "#0e182a", "#121e34", "#18263e", "#1e2e48")}[nome]
    c.mascara(YA >= 101, mata[1])
    g = np.random.default_rng(403)
    for y0 in range(101, 132, 2):
        x = -4 + g.random() * 3
        r = 1.6 + (y0 - 101) * 0.09
        while x < W + 4:
            copa(c, x, y0, r + g.random() * 0.8, mata, luz, seed=int(x * 7 + y0 * 131), dens=0.9, achatar=0.75)
            x += r * 1.5 + g.random() * r
    # clareiras e campos no vale
    for (x0, y0, rx, ry, cor) in ((150, 106, 9, 1.6, 4), (346, 104, 11, 1.4, 4), (196, 113, 7, 2, 3)):
        m = ((XA - x0) / rx) ** 2 + ((YA - y0) / ry) ** 2 <= 1
        c.mascara(m, mata[cor] * np.array([1.12, 1.1, 0.9], dtype=np.float32))
    # o rio serpenteando para perto, refletindo o céu
    rio = dist_segmentos([(318, 101), (300, 104), (322, 108), (290, 114), (262, 119), (286, 125), (270, 132)])
    larg = 0.6 + (YA - 101) * 0.09
    m = (rio < larg) & (YA >= 101)
    a_cl, a_es = (hexa(x) for x in per["agua"])
    k = np.clip((YA - 101) / 30, 0, 1)[:, :, None]
    cor = a_cl * (1 - k) + a_es * k
    cor = cor * (0.85 + 0.3 * ruido_ret(404, 6, 1)[:, :, None])
    c.mascara(m, cor.astype(np.float32))
    c.mascara(m & (rio > larg - 0.8), a_es * 0.6)
    return c


def torre_distante(c: Camada, x0: int, base: int, w: int, topo: int, luz, nome: str, janelas: list) -> None:
    """Torre de estudos distante: fuste de pedra, varanda com ameias miúdas e a cúpula de cobre com a fenda."""
    lx = 1 if luz[0] > 0 else -1
    pedra_t = {"manha": pal("#4e5c74", "#64728a", "#808ca0", "#b4bcc6"),
               "tarde": pal("#5e4a5c", "#7e5e68", "#a87a72", "#d49c80"),
               "noite": pal("#121a34", "#1a2444", "#222e54", "#2c3a64")}[nome]
    cobre = {"manha": pal("#3e6e68", "#56908a", "#78b0a6", "#a0ccc0"),
             "tarde": pal("#3e4a54", "#58686a", "#7a8a7a", "#c8a07a"),
             "noite": pal("#0e1c2a", "#16283a", "#1e344a", "#2a4460")}[nome]
    for x in range(x0, x0 + w):
        u = (x - x0 + 0.5) / w * 2 - 1
        for y in range(topo, base):
            k = 1.4 + u * lx * 1.2 - abs(u) ** 4 * 0.7 + BAYER[y % 4, x % 4] * 0.6
            if y % 5 == 0:
                k -= 0.6
            c.p(x, y, tom(pedra_t, k))
    c.ret(x0 - 1, topo - 1, w + 2, 2, pedra_t[3 if lx > 0 else 2])
    c.ret(x0 - 1, topo + 1, w + 2, 1, pedra_t[0])
    for x in range(x0 - 1, x0 + w + 1, 2):
        c.p(x, topo - 2, pedra_t[2])
    cx, rr = x0 + w / 2, w / 2 + 0.6
    yb = topo - 2
    for y in range(int(yb - rr) - 1, yb + 1):
        for x in range(int(cx - rr) - 1, int(cx + rr) + 2):
            dx, dy = (x + 0.5 - cx) / rr, (y + 0.5 - yb) / (rr * 0.95)
            if dx * dx + dy * dy <= 1 and y <= yb:
                k = 1.6 + dx * lx * 1.4 - dy * 0.4
                c.p(x, y, tom(cobre, k))
    for y in range(int(yb - rr * 0.9), yb + 1):
        c.p(int(cx), y, cobre[0])
    c.ret(int(cx), int(yb - rr) - 4, 1, 3, pedra_t[0])
    for (jx, jy) in ((w // 2, 6), (w // 2 - 1, 15), (w // 2, 25)):
        if topo + jy < base - 1:
            c.p(x0 + jx, topo + jy, pedra_t[0])
            c.p(x0 + jx, topo + jy + 1, pedra_t[0])
            janelas.append((x0 + jx, topo + jy))


def pintar_distantes(nome: str, per: dict) -> tuple[Camada, list]:
    c = Camada()
    janelas: list = []
    torre_distante(c, 223, 110, 7, 58, per["luz"], nome, janelas)
    torre_distante(c, 349, 108, 8, 50, per["luz"], nome, janelas)
    cas = Camada()
    janelas += castelo(cas, 432, 99, per["luz"], nome == "noite")
    tinta = {"manha": (0.92, 0.98, 1.08), "tarde": (1.18, 0.86, 0.8), "noite": (1.0, 1.0, 1.0)}[nome]
    cas.c[:, :, :3] *= np.array(tinta, dtype=np.float32)
    c.juntar(cas)
    return c, janelas


# ─────────────────────────────── O parapeito, o torreão e o pilar ───────────────────────────────
def blocos(c: Camada, regiao: np.ndarray, cursos, larg: int, seed: int, base: float, var: float = 0.55,
           topo_claro: float = 0.9, musgo: float = 0.0, lado: int = 1) -> None:
    """Alvenaria: blocos em fiadas, cada um com seu tom, aresta de cima clara, junta escura, lascas e musgo."""
    g = np.random.default_rng(seed)
    n = len(PEDRA_T)
    for (y0, y1) in cursos:
        x = -int(g.integers(0, larg))
        while x < W:
            w = int(larg + g.integers(-3, 4))
            xa, xb = max(x, 0), min(x + w, W)
            if xa < xb:
                sub = regiao[y0:y1, xa:xb]
                if sub.any():
                    yy, xx = np.mgrid[y0:y1, xa:xb]
                    t0 = base + g.normal(0, var)
                    v = t0 + (TEX[y0:y1, xa:xb] - 0.5) * 2.2 + (TEX_FINO[y0:y1, xa:xb] - 0.5) * 0.8
                    v = v + (yy == y0) * topo_claro - (yy == y1 - 2) * 0.45
                    v = v + np.where(xx == (x if lado > 0 else x + w - 2), 0.45, 0)
                    lasca = hash2(xx * 1.7 + seed, yy * 3.1) < 0.035
                    v = np.where(lasca, v - 1.6, v)
                    junta = (yy == y1 - 1) | (xx == x + w - 1)
                    v = np.where(junta, 0.6 + TEX[y0:y1, xa:xb] * 0.9, v)
                    idx = np.clip(np.floor(v + BAYER_HW[y0:y1, xa:xb] * 0.8), 0, n - 1).astype(int)
                    cores = PEDRA_T[idx]
                    if musgo > 0:
                        mm = (MUSGO_N[y0:y1, xa:xb] + musgo * 0.5 > 0.86) & ((yy == y0) | junta)
                        cores = np.where(mm[:, :, None], MUSGO_T[np.clip((v * 0.5).astype(int), 0, 3)], cores)
                    vis = c.c[y0:y1, xa:xb]
                    vis[sub, :3] = cores[sub]
                    vis[sub, 3] = 1
            x += w


def pintar_parapeito(nome: str, per: dict) -> tuple[Camada, np.ndarray]:
    c = Camada()
    topos = np.zeros((H, W), bool)
    # face interna (130-139), capa (125-128) e a sombra da beirada (129)
    face = (YA >= CAPA + 5) & (YA < MURO_BASE)
    blocos(c, face, [(130, 135), (135, 140)], 13, 151, 3.2, musgo=0.35)
    capa = (YA >= CAPA) & (YA < CAPA + 4)
    blocos(c, capa, [(CAPA, CAPA + 4)], 17, 152, 4.9, topo_claro=1.5, musgo=0.25)
    c.mascara(YA == CAPA + 4, PEDRA_T[1])
    topos |= (YA >= CAPA) & (YA < CAPA + 2)
    # ameias: face da frente, face lateral virada para o centro e o topo (visto de cima)
    for i, cx in enumerate(AMEIAS):
        x0, x1 = cx - 7, cx + 8
        lado = int(round(abs(cx - 240) / 90))
        sg = 1 if cx < 240 else -1
        frente = (XA >= x0) & (XA < x1) & (YA >= AMEIA_TOPO + 2) & (YA < CAPA)
        blocos(c, frente, [(106, 110), (110, 114), (114, 118), (118, 122), (122, 125)], 8, 160 + i, 3.7,
               musgo=0.2 + (cx < 140) * 0.3, lado=sg)
        if lado:
            xs = range(x1, x1 + lado) if sg > 0 else range(x0 - lado, x0)
            for x in xs:
                for y in range(AMEIA_TOPO + 1, CAPA):
                    k = 1.6 + TEX[y, x] * 1.5 - (y % 4 == 1) * 0.8
                    c.p(x, y, tom(PEDRA_T, k))
        for y in (AMEIA_TOPO, AMEIA_TOPO + 1):
            for x in range(x0 + (sg if y == AMEIA_TOPO else 0) * lado // 2, x1 + (sg if y == AMEIA_TOPO else 0) * lado):
                k = 6.0 + TEX[y, x] * 2 - (y == AMEIA_TOPO + 1) * 0.8 + BAYER[y % 4, x % 4] * 0.6
                c.p(x, y, tom(PEDRA_T, k))
                if MUSGO_N[y, x] > 0.8:
                    c.p(x, y, MUSGO_T[2 + (y == AMEIA_TOPO)])
                topos[y, x] = True
    # hera na parte esquerda (pouco contraste: fica atrás do texto)
    g = np.random.default_rng(170)
    for x0 in range(30, 150, 9):
        xx = x0 + g.random() * 5
        comp = 6 + g.random() * 14
        for k in range(int(comp)):
            y = 126 + k
            if y >= MURO_BASE:
                break
            c.p(xx + math.sin(k / 3 + x0) * 1.2, y, HERA[1 + (k % 3 == 0)])
            if k % 2 == 0:
                c.p(xx + math.sin(k / 3 + x0) * 1.2 + (1 if k % 4 else -1), y, HERA[2 + (k % 5 == 0)])
    for (cx, cy, r) in ((56, 112, 4), (60, 120, 5), (82, 122, 4), (104, 127, 3.5), (36, 126, 4.5), (124, 130, 3)):
        copa(c, cx, cy, r, HERA, per["luz"], seed=cx * 3 + cy, dens=0.9)
    torreao(c, per)
    pilar(c, per, topos)
    return c, topos


def torreao(c: Camada, per: dict) -> None:
    """O torreão da escada, à esquerda: cilindro de pedra com fiadas curvas, a porta em arco e uma seteira."""
    cx, r = 10.0, 30.0
    for y in range(0, 162):
        for x in range(0, 41):
            u = (x + 0.5 - cx) / r
            if abs(u) >= 1:
                continue
            bow = (y - HOR) * 0.05 * (1 - u * u)
            yc = y - bow
            curso = int(yc // 5)
            frac = yc - curso * 5
            ang = math.asin(u)
            off = (curso % 2) * 0.5
            col = math.floor(ang / 0.3 + off)
            h = float(hash2(curso, col))
            k = 3.1 + u * 1.4 + (h - 0.5) * 1.1 + (TEX[y, x] - 0.5) * 1.4 - abs(u) ** 6 * 1.2
            if frac < 1:
                k -= 1.5
            elif frac < 2:
                k += 0.5
            if ((ang / 0.3 + off) % 1) < 0.1:
                k -= 1.3
            c.p(x, y, tom(PEDRA_T, k + BAYER[y % 4, x % 4] * 0.7))
    # base escura e rodapé
    c.ret(0, 159, 41, 3, PEDRA_T[1])
    # porta em arco: aduelas claras, tábuas, cravos e argola
    pcx, py0, prr = 25, 132, 8
    for y in range(py0 - prr - 2, 160):
        for x in range(pcx - prr - 2, pcx + prr + 3):
            dx = x + 0.5 - pcx
            dy = max(0.0, py0 - (y + 0.5))
            dd = math.hypot(dx, dy)
            if dd <= prr + 2 and dd > prr:
                k = 3.4 + (TEX[y, x] - 0.5) * 2 + (1 if int(math.atan2(dy, dx) * 4) % 2 else 0)
                c.p(x, y, tom(PEDRA_T, k))
            elif dd <= prr:
                tab = (x - (pcx - prr)) % 4 == 0
                k = 2.2 + (TEX_FINO[y, x] - 0.5) * 1.4 - (1.6 if tab else 0) + (0.5 if dx > 0 else 0)
                c.p(x, y, tom(MADEIRA, k))
    for y in (136, 150):
        c.ret(pcx - prr + 1, y, prr * 2 - 1, 1, FERRO[2])
        for x in range(pcx - prr + 2, pcx + prr, 3):
            c.p(x, y, FERRO[4])
    c.p(pcx + 4, 143, FERRO[5])
    c.p(pcx + 5, 144, FERRO[4])
    c.p(pcx + 4, 145, FERRO[3])
    # seteira com uma luz fraca
    for y in range(52, 62):
        c.p(22, y, "#120c08")
        c.p(23, y, "#1a120c")


def pilar(c: Camada, per: dict, topos: np.ndarray) -> None:
    """Pilar quadrado à direita, com capitel, o braço de ferro da lanterna e o estandarte."""
    x0, x1, topo, base = 456, 481, 66, 141
    regiao = (XA >= x0) & (XA < x1) & (YA >= topo) & (YA < base)
    blocos(c, regiao, [(y, min(y + 5, base)) for y in range(topo, base, 5)], 12, 180, 3.4, musgo=0.25)
    for x in range(x0 - 3, x0):
        for y in range(topo, base):
            c.p(x, y, tom(PEDRA_T, 1.6 + TEX[y, x] * 1.4 - (y % 5 == 0) * 0.8))
    c.ret(x0 - 5, topo - 5, x1 - x0 + 6, 2, PEDRA_T[7])
    c.ret(x0 - 5, topo - 3, x1 - x0 + 6, 3, PEDRA_T[4])
    c.ret(x0 - 5, topo, x1 - x0 + 6, 1, PEDRA_T[1])
    topos[topo - 5:topo - 3, x0 - 5:x1] = True
    # mastro e estandarte (verde com a borda dourada, ondulando ao vento)
    c.ret(467, 34, 1, 27, FERRO[3])
    c.p(467, 33, LATAO[5])
    for i in range(18):
        t = i / 17
        x = 466 - i
        yc = 37 + math.sin(t * 5.5) * 1.4 + t * 2
        meia = 3.2 * (1 - t * 0.55)
        for y in range(int(yc - meia), int(yc + meia) + 1):
            borda = y == int(yc - meia) or y == int(yc + meia)
            k = 3 + math.cos(t * 5.5) * 1.3
            c.p(x, y, LATAO[4] if borda else tom(pal("#08221c", "#0c3c34", "#125246", "#17675b", "#23806e"), k))


# ─────────────────────────────── O piso ───────────────────────────────
def coords_piso():
    dy = np.maximum(YA + 0.5 - HOR, 1)
    Z = FOCAL / dy
    X = (XA + 0.5 - 240) / dy
    return dy, Z, X


ANEL = (0.0, FOCAL / (153.0 - HOR), 0.9)  # centro (X, Z) e raio do anel de latão em volta do braseiro


def cinzas(c: Camada) -> None:
    """A cinza espalhada no piso em volta dos pés do braseiro (pintada no piso, sem volume)."""
    fx, fy = FOGO
    for y in range(fy + 9, fy + 18):
        for x in range(fx - 19, fx + 20):
            d = ((x - fx) / 18) ** 2 + ((y - fy - 13) / 3.6) ** 2
            if d < 1:
                hh = float(hash2(x * 1.3, y * 2.1))
                if d > 0.55 and hh < 0.55:
                    continue
                c.p(x, y, ["#3e3834", "#4a4440", "#34302c", "#575049", "#2a2624"][int(hh * 5)], 0.45 if d > 0.55 else 0.75)


def pintar_piso(nome: str, per: dict) -> tuple[Camada, np.ndarray]:
    c = Camada()
    metal = np.zeros((H, W), np.float32)
    m = YA >= MURO_BASE
    dy, Z, X = coords_piso()
    prof = Z_MURO - Z
    linha = np.floor(prof / LAJE)
    Xs = X + (linha % 2) * LAJE * 0.5 + hash2(linha, 7.0) * 0.1
    col = np.floor(Xs / LAJE)
    fu = Xs / LAJE - col
    fv = prof / LAJE - linha
    px_u = LAJE * dy
    px_v = LAJE * dy * dy / FOCAL
    h = hash2(linha * 3.1, col * 1.7)
    h2 = hash2(col * 5.3, linha * 0.7)
    # textura em coordenadas do mundo (o grão encolhe com a distância)
    g = np.random.default_rng(190)
    grao = g.random((256, 256)).astype(np.float32)
    suave_t = np.asarray(Image.fromarray(g.random((32, 32)).astype(np.float32), mode="F").resize((256, 256), Image.BICUBIC))
    ti = (Z * 46).astype(int) % 256
    tj = ((X + 20) * 46).astype(int) % 256
    v = 4.4 + (h - 0.5) * 1.6 + (grao[ti, tj] - 0.5) * 1.1 + (suave_t[ti, tj] - 0.5) * 1.6
    v = np.where(h2 < 0.12, v - 1.0, v)                       # algumas lajes de ardósia mais escura
    v = v + (fv * px_v < 2) * 0.7 - ((1 - fv) * px_v < 1.2) * 0.6 + (fu * px_u < 2) * 0.3 - ((1 - fu) * px_u < 1.2) * 0.35
    # gasto em volta do braseiro (pisado, mais liso e claro)
    d_anel = np.hypot(X - ANEL[0], Z - ANEL[1])
    v = v + np.exp(-(d_anel / 1.4) ** 2) * 0.5
    # rachaduras
    rach = (np.abs(fu - (0.25 + 0.5 * h2) - 0.2 * np.sin(fv * 7 + h * 6)) * px_u < 0.55) & (hash2(col, linha * 2.3) < 0.28)
    v = np.where(rach & (fv > 0.15) & (fv < 0.85), 1.0, v)
    junta = (fu * px_u < 1) | (fv * px_v < 1)
    v = np.where(junta, 0.4 + grao[ti, tj] * 0.9, v)
    idx = np.clip(np.floor(v + BAYER_HW * 0.75), 0, len(PISO_T) - 1).astype(int)
    cor = PISO_T[idx]
    # musgo nas juntas perto do muro e nas bordas
    mus = junta & (MUSGO_N + (1 - np.clip(prof / 1.2, 0, 1)) * 0.3 + (np.abs(XA - 240) > 170) * 0.2 > 0.85)
    cor = np.where(mus[:, :, None], MUSGO_T[np.clip((MUSGO_N * 5).astype(int), 0, 3)], cor)
    # anel de latão incrustado com marcas de grau e a linha meridiana
    anel = np.abs(d_anel - ANEL[2]) * dy < 0.7
    ang = np.arctan2(Z - ANEL[1], X - ANEL[0])
    marca = (np.abs(((ang / (math.tau / 36)) + 0.5) % 1 - 0.5) * d_anel * (math.tau / 36) * dy < 0.5) & \
        (d_anel > ANEL[2]) & (d_anel < ANEL[2] + 0.1)
    lat = (anel | marca) & ~junta
    k_lat = np.clip(2.6 + (grao[ti, tj] - 0.5) * 2, 0, 6).astype(int)
    cor = np.where(lat[:, :, None], LATAO[k_lat] * 0.8 + cor * 0.2, cor)
    metal[lat & m] = 1
    c.mascara(m, cor.astype(np.float32))
    # pedrinhas, lascas e um rolo de mapa esquecido no canto esquerdo
    for _ in range(140):
        x, y = int(g.random() * W), int(MURO_BASE + 2 + g.random() * (H - MURO_BASE - 2))
        if any(x0 - 2 <= x <= x1 + 2 and y0 <= y <= y1 + 4 for (x0, y0, x1, y1) in LIVRE.values()):
            continue
        c.p(x, y, PISO_T[7])
        c.p(x, y + 1, PISO_T[1])
    for i in range(16):
        c.p(96 + i, 186 - i // 6, PERG[2 + (i % 4 == 0)])
        c.p(96 + i, 187 - i // 6, PERG[1])
    c.p(95, 186, PERG[4])
    c.p(95, 187, PERG[3])
    cinzas(c)
    return c, metal


# ─────────────────────────────── Os objetos ───────────────────────────────
def braseiro(c: Camada, e: Camada, m: np.ndarray, luz) -> None:
    """Braseiro de ferro de três pés: bacia rebitada, aro, carvão em monte com brasas e a cinza no chão."""
    fx, fy = FOGO
    for (x, y) in ((fx - 13, fy + 14), (fx + 15, fy + 13), (fx + 7, fy + 15), (fx - 4, fy + 15)):
        c.p(x, y, "#1a1210")
        e.p(x, y, "#ff5a1a", 0.8)
    # pés curvos
    for (x0, y0, x1, y1) in ((fx - 8, fy + 5, fx - 13, fy + 13), (fx + 8, fy + 5, fx + 13, fy + 13), (fx, fy + 7, fx, fy + 14)):
        c.linha(x0, y0, x1, y1, FERRO[1])
        c.linha(x0 + 1, y0, x1 + 1, y1, FERRO[3])
        sg = -1 if x1 < fx else 1 if x1 > fx else 0
        c.ret(x1 - 1, y1, 3, 1, FERRO[2])
        c.p(x1 + sg * 2, y1 - 1, FERRO[3])
        c.p(x1 + sg * 2, y1 - 2, FERRO[2])
    # bacia
    for y in range(fy, fy + 9):
        t = (y - fy) / 8.5
        rx = 13.6 * math.sqrt(max(0.0, 1 - (t * 0.94) ** 2))
        for x in range(int(fx - rx), int(fx + rx) + 1):
            u = (x + 0.5 - fx) / max(rx, 1)
            k = 2.5 - abs(u) ** 2 * 1.4 - t * 1.6 + (0.5 if u > 0.2 else 0) + BAYER[y % 4, x % 4] * 0.6
            if y == fy + 2:
                k += 1.8
            if y == fy + 3:
                k -= 0.6
            c.p(x, y, tom(FERRO, k))
            if y == fy + 2 and (x - fx) % 4 == 0:
                c.p(x, y, FERRO[6])
                marcar(m, x, y)
            if y == fy + 2:
                marcar(m, x, y, 0.6)
    # alças
    for sg in (-1, 1):
        x = fx + sg * 15
        c.p(x, fy + 1, FERRO[4])
        c.p(x + sg, fy + 2, FERRO[3])
        c.p(x, fy + 3, FERRO[4])
    # interior e monte de carvão com brasas
    for y in range(fy - 5, fy + 2):
        for x in range(fx - 13, fx + 14):
            dd = ((x + 0.5 - fx) / 12.6) ** 2 + ((y + 0.5 - fy) / 2.7) ** 2
            topo = fy - 0.5 - 3.6 * math.sqrt(max(0.0, 1 - ((x + 0.5 - fx) / 12) ** 2)) + math.sin(x * 2.1) * 0.6
            if dd <= 1 or (y >= topo and abs(x + 0.5 - fx) < 12 and y <= fy):
                hh = float(hash2(x, y))
                c.p(x, y, ["#1a1412", "#2a201a", "#3a2c24", "#120c0a", "#5a1a0a"][int(hh * 5)])
                if hh < 0.3 and y > topo + 0.5:
                    perto = 1 - abs(x - fx) / 13
                    e.p(x, y, "#ffc860" if hh < 0.07 else "#ff8a2a" if hh < 0.17 else "#e0401a", 0.6 + perto * 0.4)
    # aro (frente) com brilho
    for k in range(80):
        a = k / 80 * math.pi
        x = fx + math.cos(a) * 13.8
        y = fy + 0.3 + math.sin(a) * 2.9
        c.p(x, y, FERRO[5] if math.sin(a) > 0.5 else FERRO[4])
        c.p(x, y + 1, FERRO[2])
        marcar(m, x, y, 0.8)
    for k in range(60):
        a = math.pi + k / 60 * math.pi
        x, y = fx + math.cos(a) * 13.8, fy + 0.3 + math.sin(a) * 2.9
        c.p(x, y, FERRO[3])
        if abs(math.cos(a)) < 0.8:
            e.p(x, y, "#c0501a", 0.35)


def esfera_armilar(c: Camada, e: Camada, m: np.ndarray, luz, cx: float = 148, cy: float = 120, R: float = 12.5) -> None:
    """Esfera armilar de latão num pedestal de pedra: horizonte, meridiano, equador, eclíptica, coluro e o eixo."""
    # pedestal: plinto e coluna em balaústre
    for y in range(148, 155):
        for x in range(int(cx) - 9, int(cx) + 10):
            u = (x + 0.5 - cx) / 9.5
            k = 4.6 - abs(u) * 1.2 + (u * 0.8) + (1.4 if y == 148 else 0) - (1.2 if y == 154 else 0)
            c.p(x, y, tom(PEDRA_T, k + (TEX[y, x] - 0.5) * 1.6))
    for y in range(135, 148):
        t = (y - 135) / 13
        meia = 2.4 + math.sin(t * math.pi) * 1.6 + (1.5 if y > 145 else 0)
        for x in range(int(cx - meia), int(cx + meia) + 1):
            u = (x + 0.5 - cx) / meia
            c.p(x, y, tom(PEDRA_T, 4.2 + u * 1.8 - abs(u) ** 4 * 1.5))
    for x in range(int(cx) - 4, int(cx) + 5):
        c.p(x, 134, LATAO[3 + (x > cx)])
        c.p(x, 135, LATAO[2])
        marcar(m, x, 134)
    yaw, lat, pitch = 0.55, 0.62, 0.32
    cy_, sy_ = math.cos(yaw), math.sin(yaw)
    e1 = np.array([cy_, 0, sy_])
    e2 = np.array([0.0, 1, 0])
    nm = np.array([-sy_, 0, cy_])
    p = e1 * math.cos(lat) + e2 * math.sin(lat)
    q1 = -e1 * math.sin(lat) + e2 * math.cos(lat)
    q1e = q1 * math.cos(0.41) + p * math.sin(0.41)
    L = np.array([0.75, 0.35, 0.55])
    L = L / np.linalg.norm(L)
    cp, sp = math.cos(pitch), math.sin(pitch)

    def proj(v):
        X, Y, Zz = v
        Y2 = Y * cp - Zz * sp
        Z2 = Y * sp + Zz * cp
        return cx + X * R, cy - Y2 * R, Z2

    pontos = []

    def anel(a_, b_, raio, tons, grosso, marcas=False):
        nn = int(raio * R * 8)
        for k in range(nn):
            a = k / nn * math.tau
            v = (a_ * math.cos(a) + b_ * math.sin(a)) * raio
            x, y, z = proj(v)
            nrm = v / max(np.linalg.norm(v), 1e-6)
            kk = 3.0 + float(np.dot(nrm, L)) * 2.4 + tons
            pontos.append((z, x, y, kk, marcas and k % max(1, nn // 36) == 0))
            if grosso:
                x2, y2, _ = proj(v * 0.93)
                pontos.append((z, x2, y2, kk - 0.8, False))

    anel(np.array([1.0, 0, 0]), np.array([0, 0, 1.0]), 1.2, 0.3, True, True)      # horizonte
    anel(e1, e2, 1.08, 0.5, True, True)                                              # meridiano
    anel(q1, nm, 1.0, 0.2, False)                                                    # equador
    anel(q1e, nm, 0.98, 0.6, True)                                                   # eclíptica (faixa larga)
    anel(p, nm, 0.94, -0.2, False)                                                   # coluro
    for k in range(40):                                                              # eixo polar
        t = k / 39 * 2.7 - 1.35
        x, y, z = proj(p * t)
        pontos.append((z, x, y, 3.0, False))
    pontos.sort(key=lambda q: q[0])
    meio_feito = False
    for (z, x, y, kk, mk) in pontos:
        if z > 0 and not meio_feito:  # a bolinha do centro entre a metade de trás e a da frente
            for yy in range(int(cy) - 3, int(cy) + 4):
                for xx in range(int(cx) - 3, int(cx) + 4):
                    dd = math.hypot(xx + 0.5 - cx, yy + 0.5 - cy)
                    if dd < 2.9:
                        k = 2.4 + ((xx - cx) * 0.4 - (yy - cy) * 0.3)
                        c.p(xx, yy, tom(pal("#0a1430", "#14244a", "#20386a", "#3a5490", "#6a88c0"), k))
            c.p(cx - 1, cy - 1, "#e8d8a0")
            c.p(cx + 1, cy + 1, "#c8b070")
            meio_feito = True
        k = kk - (1.5 if z < 0 else 0)
        c.p(x, y, tom(LATAO, k - (1.2 if mk else 0)))
        if z >= 0:
            marcar(m, x, y, np.clip((k - 2) / 4, 0, 1))


def telescopio(c: Camada, e: Camada, m: np.ndarray, luz) -> None:
    """A grande luneta laqueada de verde com anéis de latão, buscador, ocular e o tripé de madeira."""
    hub = (384.0, 130.0)
    pes = [(392.0, 159.0, 1.0), (368.0, 172.0, 0.0), (418.0, 170.0, 0.0)]   # o primeiro é a perna de trás
    for (px_, py_, tras) in pes:
        n = int(math.hypot(px_ - hub[0], py_ - hub[1]) * 1.4)
        for i in range(n + 1):
            t = i / n
            x = hub[0] + (px_ - hub[0]) * t
            y = hub[1] + (py_ - hub[1]) * t
            larg = 2.8 - t * 0.9
            for wv in range(int(larg) + 1):
                k = 4.4 - wv * 1.3 - tras * 1.6 + (0.4 if px_ < hub[0] else 0)
                c.p(x + wv - larg / 2, y, tom(MADEIRA, k))
            if abs(t - 0.1) < 0.02 or t > 0.95:
                c.p(x, y, LATAO[4 - int(tras * 2)])
                c.p(x + 1, y, LATAO[3 - int(tras * 2)])
                marcar(m, x, y)
    for i in range(41):  # corrente entre as pernas da frente
        t = i / 40
        x = 375 + (403 - 375) * t
        y = 153 + (152 - 153) * t + math.sin(t * math.pi) * 2.5
        if i % 2 == 0:
            c.p(x, y, LATAO[3])
    # montagem: garfo e o botão do eixo
    for y in range(121, 132):
        for x in range(380, 389):
            if abs(x - 384) > 2 or y > 128:
                u = (x - 384) / 4.5
                c.p(x, y, tom(LATAO, 3.6 + u * 1.5 - (y - 121) * 0.12))
                marcar(m, x, y, 0.7)
    # o tubo
    B = np.array([402.0, 137.0])
    F = np.array([323.0, 75.0])
    Lt = float(np.linalg.norm(F - B))
    d = (F - B) / Lt
    nu = np.array([-d[1], d[0]])
    if nu[1] > 0:
        nu = -nu
    xa, xb, ya, yb = 308, 414, 60, 146
    yy, xx = np.mgrid[ya:yb, xa:xb].astype(np.float32)
    rx, ry = xx + 0.5 - B[0], yy + 0.5 - B[1]
    s = rx * d[0] + ry * d[1]
    w = rx * nu[0] + ry * nu[1]
    t = s / Lt
    r = 3.0 + 1.5 * t
    para = t > 0.87
    r = np.where(para, 5.3, r)
    faixa = np.zeros_like(t, bool)
    for (t0, t1) in ((0.05, 0.09), (0.37, 0.41), (0.62, 0.66), (0.84, 0.87)):
        faixa |= (t >= t0) & (t < t1)
    r = np.where(faixa, r + 0.6, r)
    dentro = (s >= 0) & (s <= Lt) & (np.abs(w) <= r)
    q = w / np.maximum(r, 0.1)
    k = 3.0 + q * 2.0 - q ** 4 * 1.6 + (np.abs(q - 0.5) < 0.14) * 1.8 + BAYER_HW[ya:yb, xa:xb] * 0.5
    lat = faixa | para
    cores = np.where(lat[:, :, None], LATAO[np.clip(k + 0.6, 0, 6).astype(int)], LACA[np.clip(k, 0, 6).astype(int)])
    borda = dentro & (np.abs(w) > r - 0.8)
    cores = np.where(borda[:, :, None], np.where(lat[:, :, None], LATAO[1], LACA[0]), cores)
    vis = c.c[ya:yb, xa:xb]
    vis[dentro, :3] = cores[dentro]
    vis[dentro, 3] = 1
    m[ya:yb, xa:xb] = np.where(dentro & lat, np.clip((k - 2) / 4, 0.2, 1), m[ya:yb, xa:xb])
    m[ya:yb, xa:xb] = np.where(dentro & ~lat & (np.abs(q - 0.5) < 0.14), 0.5, m[ya:yb, xa:xb])
    # a lente: elipse na ponta, vidro escuro com o reflexo do céu
    rl = 5.3
    for (yy_, xx_) in zip(*np.nonzero(np.ones((24, 24)))):
        x, y = F[0] - 12 + xx_, F[1] - 12 + yy_
        vx, vy = x + 0.5 - F[0], y + 0.5 - F[1]
        a_ = vx * nu[0] + vy * nu[1]
        b_ = vx * d[0] + vy * d[1]
        ee = (a_ / rl) ** 2 + (b_ / (rl * 0.42)) ** 2
        if ee <= 1:
            if ee > 0.55:
                c.p(x, y, LATAO[5 if a_ > 0 else 3])
                marcar(m, x, y)
            else:
                c.p(x, y, "#0a1426" if a_ < 1.5 else "#3a5a88")
                if 1.2 < a_ < 2.6 and abs(b_) < 0.8:
                    c.p(x, y, "#a8d0f0")
    # buscador paralelo, com as duas presilhas
    for i in range(70):
        tt = 0.24 + i / 69 * 0.3
        base = B + d * Lt * tt
        rr = 3.0 + 1.5 * tt
        if not (0.3 <= tt <= 0.5):
            continue
        ctr = base + nu * (rr + 1.8)
        for o in (0, 1):
            p_ = ctr + nu * o
            c.p(p_[0], p_[1], LACA[5 if o == 1 else 2])
        if i in (14, 56):
            for o in range(int(rr), int(rr + 2)):
                p_ = base + nu * o
                c.p(p_[0], p_[1], LATAO[4])
                marcar(m, p_[0], p_[1])
    # ocular e o botão de foco
    for i in range(9):
        p_ = B - d * i
        for o in (-1.4, -0.5, 0.4, 1.3):
            q_ = p_ + nu * o
            c.p(q_[0], q_[1], LATAO[5 if o > 1 else 4 if o > 0 else 2])
            marcar(m, q_[0], q_[1], 0.8)
    kb = B + d * 6 - nu * 4.8
    for (ox, oy) in ((0, 0), (1, 0), (0, 1), (1, 1), (-1, 0), (0, -1)):
        c.p(kb[0] + ox, kb[1] + oy, LATAO[5 if oy < 1 else 3])


def mesa_de_mapas(c: Camada, e: Camada, m: np.ndarray, luz) -> None:
    """A mesa dos mapas: carta celeste aberta (pontos e linhas), rolos amarrados, astrolábio, vela e tinteiro."""
    tampo = R.poli([(434, 147), (482, 147), (482, 155), (428, 155)])
    v = 4.0 + (ruido_ret(501, 9, 1)[:, :] - 0.5) * 2.2 + (YA - 147) * 0.12
    c.mascara(tampo, MADEIRA[np.clip(np.floor(v + BAYER_HW * 0.6), 0, 6).astype(int)])
    c.ret(428, 155, 54, 1, MADEIRA[5])
    c.ret(428, 156, 54, 2, MADEIRA[2])
    for (x, y0, y1, k) in ((429, 158, 178, 3.5), (435, 156, 170, 1.8), (470, 158, 178, 3.0)):
        for y in range(y0, y1):
            gir = math.sin((y - y0) / 2.2) * 0.8
            c.p(x, y, tom(MADEIRA, k + gir + 0.8))
            c.p(x + 1, y, tom(MADEIRA, k + gir - 0.6))
    c.ret(431, 171, 39, 1, MADEIRA[2])
    # carta celeste aberta
    carta = R.poli([(438, 148), (471, 148), (473, 154), (436, 154)])
    c.mascara(carta, PERG[np.clip(np.floor(3.4 + (ruido(502, 3) - 0.5) * 2 + BAYER_HW * 0.6), 0, 5).astype(int)])
    tinta = hexa("#3a2614")
    g = np.random.default_rng(503)
    est = [(440 + g.random() * 30, 149 + g.random() * 4.5) for _ in range(14)]
    for i in (0, 2, 5, 9):
        c.linha(est[i][0], est[i][1], est[i + 1][0], est[i + 1][1], tinta, 0.35)
    for (x, y) in est:
        c.p(x, y, tinta)
    for k in range(40):
        a = k / 40 * math.pi
        c.p(454 + math.cos(a) * 12, 153 - math.sin(a) * 3.6, tinta, 0.4)
    c.ret(471, 148, 2, 1, PERG[1])
    c.p(472, 149, PERG[2])
    # rolos de mapa no fundo da mesa
    for (x0, x1, y, fita) in ((441, 459, 144, "#8a2a22"), (452, 476, 141, "#2a5a50"), (458, 470, 145, None)):
        for x in range(x0, x1):
            c.p(x, y, PERG[5])
            c.p(x, y + 1, PERG[3])
            c.p(x, y + 2, PERG[1])
        c.p(x0, y + 1, PERG[0])
        c.p(x0 - 1, y + 1, PERG[2])
        if fita:
            c.ret((x0 + x1) // 2, y, 1, 3, fita)
    # astrolábio em pé num suporte
    ax, ay = 448, 136
    for y in range(ay - 7, ay + 8):
        for x in range(ax - 7, ax + 8):
            dd = math.hypot(x + 0.5 - ax, y + 0.5 - ay)
            if dd <= 6.2:
                if dd > 5.0:
                    k = 4.4 + (x - ax) * 0.15 - (y - ay) * 0.15
                elif dd > 3.4 and int(math.atan2(y - ay, x - ax) * 6) % 2 == 0:
                    k = 2.2
                else:
                    k = 3.3 + (TEX_FINO[y, x] - 0.5)
                c.p(x, y, tom(LATAO, k))
                marcar(m, x, y, 0.8 if dd > 5 else 0.4)
    c.linha(ax - 4, ay + 3, ax + 4, ay - 3, LATAO[6])
    c.p(ax, ay, LATAO[1])
    for (ox, oy) in ((0, -8), (-1, -9), (1, -9), (0, -10)):
        c.p(ax + ox, ay + oy, LATAO[4])
    c.ret(ax - 3, ay + 7, 7, 1, MADEIRA[3])
    c.ret(ax - 1, ay + 6, 3, 1, MADEIRA[4])
    # vela num pires de latão
    c.ret(435, 146, 5, 1, LATAO[4])
    c.ret(434, 147, 7, 1, LATAO[2])
    marcar(m, 436, 146)
    for y in range(139, 146):
        c.p(436, y, "#f0e6cc")
        c.p(437, y, "#c8bca0")
    c.p(437, 140, "#fff6dc")
    c.p(436, 138, "#2a1a10")
    e.p(436, 136, "#ffe8a0")
    e.p(436, 137, "#ffc860")
    e.p(437, 137, "#ff9a40", 0.6)
    # tinteiro e pena
    c.ret(462, 149, 3, 3, "#141a24")
    c.p(463, 149, "#4a5a7a")
    c.linha(464, 149, 468, 141, "#e8e0d0")
    c.linha(465, 148, 468, 142, "#b8b0a0", 0.7)


def bau(c: Camada, e: Camada, m: np.ndarray, luz) -> None:
    """Baú de madeira com cintas de ferro e a fechadura de latão."""
    x0, x1 = 340, 381
    for y in range(176, 197):
        for x in range(x0, x1):
            u = (x - x0) / (x1 - x0)
            if y < 179:  # tampa vista de cima
                k = 4.6 + (TEX_FINO[y, x] - 0.5) * 1.6 - (y == 178) * 0.6
            elif y < 183:  # frente da tampa (abaulada)
                k = 4.0 - (y - 179) * 0.5 + (TEX_FINO[y, x] - 0.5)
            else:
                k = 3.2 + (TEX[y, x] - 0.5) * 1.6 - ((y - 183) % 5 == 4) * 1.8 - u * 0.4
            c.p(x, y, tom(MADEIRA, k + BAYER[y % 4, x % 4] * 0.6))
    c.ret(x0, 182, x1 - x0, 1, FERRO[2])
    c.ret(x0, 196, x1 - x0, 1, MADEIRA[0])
    for bx in (343, 377):
        for y in range(176, 196):
            c.p(bx, y, FERRO[3 if y < 179 else 2])
            c.p(bx + 1, y, FERRO[4 if y < 179 else 3])
            if y % 4 == 0:
                c.p(bx + 1, y, FERRO[6])
    for y in range(180, 188):
        for x in range(357, 364):
            c.p(x, y, tom(LATAO, 4.5 - (y - 180) * 0.3 + (x - 357) * 0.1))
            marcar(m, x, y)
    c.p(360, 183, "#140c06")
    c.p(360, 184, "#140c06")
    c.ret(341, 197, 3, 1, MADEIRA[0])
    c.ret(377, 197, 3, 1, MADEIRA[0])


def pilha_livros(c: Camada, e: Camada, m: np.ndarray, luz) -> None:
    """Pilha de livros deitados: lombadas com faixas douradas e o miolo de papel na ponta."""
    livros = [(193, 3, "#7a2a22", 16), (195, 2, "#1f5a55", 13), (192, 3, "#a87a2a", 15), (196, 2, "#2a3a6a", 12),
              (194, 3, "#4a6a2a", 14)]
    y = 168
    for (x, h, cor, w) in livros:
        y -= h
        base = hexa(cor)
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                k = 1.0 + (0.25 if yy == y else -0.25 if yy == y + h - 1 else 0) - (xx - x) / w * 0.15
                c.p(xx, yy, base * k)
        c.ret(x + w - 2, y, 2, h, PERG[4])
        c.ret(x + w - 2, y + h - 1, 2, 1, PERG[2])
        for fx in (x + 2, x + w - 5):
            c.ret(fx, y, 1, h, LATAO[5])
            marcar(m, fx, y, 0.6)


def lanterna(c: Camada, e: Camada, m: np.ndarray, x: int, base: int, alca: bool = True) -> None:
    """Lanterna de ferro com vidro e vela (o vidro é emissivo)."""
    c.ret(x - 3, base - 1, 7, 1, FERRO[2])
    c.ret(x - 2, base - 2, 5, 1, FERRO[4])
    for y in range(base - 9, base - 2):
        c.p(x - 3, y, FERRO[3])
        c.p(x + 3, y, FERRO[1])
        for xx in range(x - 2, x + 3):
            c.p(xx, y, "#6a5030")
            e.p(xx, y, "#ffd890" if abs(xx - x) < 2 and y > base - 8 else "#ffb860", 0.9)
    e.p(x, base - 6, "#fff6d0")
    e.p(x, base - 5, "#fff0c0")
    c.ret(x - 3, base - 10, 7, 1, FERRO[4])
    c.ret(x - 2, base - 11, 5, 1, FERRO[3])
    c.ret(x - 1, base - 12, 3, 1, FERRO[2])
    marcar(m, x - 2, base - 10)
    if alca:
        c.p(x - 1, base - 13, FERRO[3])
        c.p(x + 1, base - 13, FERRO[3])
        c.p(x, base - 14, FERRO[4])


def lanterna_pendurada(c: Camada, e: Camada, m: np.ndarray) -> None:
    for x in range(441, 456):
        c.p(x, 82, FERRO[3])
        c.p(x, 83, FERRO[1])
    for (x, y) in ((449, 84), (450, 85), (451, 85), (452, 84), (453, 84)):
        c.p(x, y, FERRO[3])
    for y in range(84, 90):
        c.p(442, y, FERRO[4] if y % 2 else FERRO[2])
    lanterna(c, e, m, 442, 104, alca=False)


def barril_de_mapas(c: Camada, e: Camada, m: np.ndarray) -> None:
    """Barril com mapas enrolados em pé (fitas coloridas), na frente à direita."""
    rolos = [(455, 166, "#8a2a22"), (459, 162, None), (463, 168, "#2a5a50"), (467, 164, None), (470, 170, "#a87a2a")]
    for (x, y, fita) in rolos:
        for yy in range(y, 182):
            c.p(x, yy, PERG[4])
            c.p(x + 1, yy, PERG[3])
            c.p(x + 2, yy, PERG[1])
        c.p(x + 1, y, PERG[0])
        c.p(x, y, PERG[5])
        if fita:
            c.ret(x, y + 5, 3, 1, fita)
    for y in range(178, 195):
        t = (y - 178) / 16
        meia = 11 + math.sin(t * math.pi) * 1.5
        for x in range(int(463 - meia), int(463 + meia) + 1):
            u = (x + 0.5 - 463) / meia
            k = 3.4 + u * -0.8 - abs(u) ** 3 * 1.8 + (TEX_FINO[y, x] - 0.5)
            if (x - 452) % 4 == 0:
                k -= 1.0
            col = MADEIRA if y not in (180, 181, 190, 191) else FERRO
            c.p(x, y, tom(col, k + (1 if col is FERRO else 0)))
    c.ret(452, 178, 23, 1, MADEIRA[1])


def barril_e_corda(c: Camada, e: Camada, m: np.ndarray) -> None:
    """Do lado calmo (esquerda): barril e um rolo de corda, de pouco contraste."""
    for y in range(146, 163):
        t = (y - 146) / 16
        meia = 7 + math.sin(t * math.pi) * 1.2
        for x in range(int(72 - meia), int(72 + meia) + 1):
            u = (x + 0.5 - 72) / meia
            k = 2.6 + u * 0.8 - abs(u) ** 3 * 1.4
            if (x - 65) % 3 == 0:
                k -= 0.8
            col = FERRO if y in (148, 149, 158, 159) else MADEIRA
            c.p(x, y, tom(col, k + (0.6 if col is FERRO else 0)))
    for y in range(145, 147):
        for x in range(65, 80):
            c.p(x, y, MADEIRA[3 + (y == 145)])
    for k in range(4):
        for a in range(40):
            ang = a / 40 * math.tau
            c.p(96 + math.cos(ang) * (5 - k * 0.9), 164 + math.sin(ang) * (1.6 - k * 0.2) - k, "#7a6440" if a % 3 else "#5a4830")


def pintar_objetos(nome: str, per: dict) -> Objetos:
    o = Objetos()
    luz = per["luz"]
    o.add(162, barril_e_corda)
    o.add(178, mesa_de_mapas, luz)
    o.add(-1, lanterna_pendurada)
    o.add(-1, lanterna, 188, 125)
    o.add(168, telescopio, luz)
    o.add(154, esfera_armilar, luz)
    o.add(160, braseiro, luz, fogo=0.3)
    o.add(168, pilha_livros, luz)
    o.add(196, bau, luz)
    o.add(194, barril_de_mapas)
    alfa = o.cam.c[:, :, 3] > 0.5
    o.cam.contornar("#0c0a0a", 0.6)
    o.base[(o.cam.c[:, :, 3] > 0.5) & ~alfa] = -1
    o.luzes += [(188, 118, "#ffc870", 30, 0.8), (442, 108, "#ffc870", 52, 0.9), (436, 140, "#ffb060", 26, 0.85)]
    return o


def pintar_frente(nome: str, per: dict) -> Camada:
    """Primeiro plano bem perto da câmera (sai desfocado): um vaso de ervas à esquerda e a quina de um caixote."""
    c = Camada()
    folhas = pal("#0e1c12", "#162c18", "#20401e", "#2e5826", "#40722e")
    for (cx, cy, r, s) in ((-6, 192, 24, 1), (22, 204, 18, 2), (6, 176, 14, 3)):
        copa(c, cx, cy, r, folhas, per["luz"], seed=950 + s, dens=0.55, escala=2)
    for y in range(184, 200):
        for x in range(470, 480):
            c.p(x, y, tom(MADEIRA, 2.4 + (x - 470) * 0.1 - (y == 184) * -1.5))
    return c


# ─────────────────────────────── Sombras e luz ───────────────────────────────
def sombra_parapeito(per: dict) -> np.ndarray:
    """Para cada ponto do piso, o raio até o sol (ou a lua) passa por cima do muro, por uma abertura ou bate na pedra.
    Q = ponto do raio na profundidade do muro: Q = S + (P - S) * (y_muro - hor) / (y_P - hor). Penumbra por amostras."""
    sx, sy = per["vp_sombra"]
    k = (MURO_BASE - HOR) / np.maximum(YA + 0.5 - HOR, 1)
    acc = np.zeros((H, W), np.float32)
    amostras = [(-3, 0), (3, 0), (0, -3), (0, 3), (0, 0), (-2, -2), (2, 2)]
    for (ox, oy) in amostras:
        qx = sx + ox + (XA + 0.5 - sx - ox) * k
        qy = sy + oy + (YA + 0.5 - sy - oy) * k
        em_a = np.zeros((H, W), bool)
        for cx in AMEIAS:
            em_a |= np.abs(qx - cx - 0.5) <= 7.5
        em_a |= (qx >= 453)                                    # o pilar da direita
        topo = np.where(em_a, AMEIA_TOPO, CAPA)
        topo = np.where(qx >= 453, 60, topo)
        acc += (qy < topo)
    lit = acc / len(amostras)
    lit = np.floor(lit * 3 + 0.5) / 3                            # penumbra em degraus
    return (lit * (YA >= MURO_BASE)).astype(np.float32)


def sombra_projetada(alfa: np.ndarray, base: np.ndarray, S, G, tmax: float = 4.0) -> np.ndarray:
    """Sombra dos objetos no piso pela fonte S (tela), cujo pé no chão é G (mesmo x). O pixel P (altura h sobre a
    linha de chão b) cai em G + t (B - G), com t = (Sy - Gy) / (b - y + Sy - Gy)."""
    ys, xs = np.nonzero((alfa > 0.4) & (base >= 0))
    out = np.zeros((H, W), np.float32)
    if len(xs) == 0:
        return out
    b = base[ys, xs].astype(np.float32)
    sx, sy = S
    gx, gy = G
    for sub in np.linspace(0, 1, 6):
        y = ys.astype(np.float32) - sub
        den = b - y + sy - gy
        t = np.where(den < -0.5, (sy - gy) / np.minimum(den, -0.5), tmax)
        t = np.clip(t, 1, tmax)
        tx = np.round(gx + t * (xs - gx)).astype(int)
        ty = np.round(gy + t * (b - gy)).astype(int)
        # ligar o pé à ponta da sombra (sombras compridas sem buracos)
        for f in np.linspace(0, 1, 5):
            px = np.round(xs + (tx - xs) * f).astype(int)
            py = np.round(b + (ty - b) * f).astype(int)
            ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
            out[py[ok], px[ok]] = 1
    return out


def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    fx, fy = FOGO
    sx, sy = per["astro"]

    ceu, estrelas = pintar_ceu(nome, per)
    longe = pintar_longe(nome, per)
    dist, janelas = pintar_distantes(nome, per)
    muro, topos = pintar_parapeito(nome, per)
    piso, metal_piso = pintar_piso(nome, per)
    obj = pintar_objetos(nome, per)
    frente = pintar_frente(nome, per)

    # ── sombras no piso (arte): parapeito (sol/lua), objetos (sol/lua) e objetos (braseiro)
    alfa_obj = obj.cam.c[:, :, 3]
    sol_piso = sombra_parapeito(per)
    vp = per["vp_sombra"]
    s_obj = sombra_projetada(alfa_obj, obj.base, vp, (vp[0], HOR), tmax={"manha": 2.2, "tarde": 4.5, "noite": 2.0}[nome])
    s_obj *= (alfa_obj < 0.5)
    sol_piso = sol_piso * (1 - s_obj * 0.92)
    s_fogo = sombra_projetada(alfa_obj * (obj.fogo > 0.5), obj.base, (fx, fy - 10), (fx, fy + 4), tmax=3.2)
    s_fogo[fy - 6:fy + 18, fx - 20:fx + 21] = 0
    s_fogo *= (alfa_obj < 0.5) * (YA >= MURO_BASE)

    # ── mapas por camada (arte): sol, fogo, ambiente e névoa, na ordem de pintura
    a_lon, a_dis, a_mur, a_pis = longe.c[:, :, 3], dist.c[:, :, 3], muro.c[:, :, 3], piso.c[:, :, 3]
    m_sol = np.zeros((H, W), np.float32)
    m_fogo = np.zeros((H, W), np.float32)
    m_amb = np.zeros((H, W), np.float32)
    nev_lon = {"manha": 0.2, "tarde": 0.3, "noite": 0.4}[nome] + (0.32 * suave(0.45, 0.75, ruido_ret(611, 20, 2)) * (nome == "manha") * (YA > 100)) - suave(100, 132, YA) * 0.08
    m_nev = np.zeros((H, W), np.float32)
    face_muro = (YA >= AMEIA_TOPO) & ~topos
    for (a, so, fo, am, nv) in (
            (a_lon, 0.85, 0.0, 1.0, nev_lon),
            (a_dis, {"manha": 0.3, "tarde": 0.22, "noite": 0.9}[nome], 0.0, 1.0, {"manha": 0.2, "tarde": 0.12, "noite": 0.2}[nome]),
            (a_mur, np.where(topos, 1.0, 0.07 + (nome == "manha") * 0.08), np.where(topos, 0.55, 1.0),
             np.where(topos, 1.15, 0.78), 0.0),
            (a_pis, sol_piso, 1 - s_fogo * 0.88, 1.0, 0.0),
            (alfa_obj, per["obj_sol"], obj.fogo, 0.86, 0.0)):
        sel = a > 0.5
        m_sol = np.where(sel, so, m_sol)
        m_fogo = np.where(sel, fo, m_fogo)
        m_amb = np.where(sel, am, m_amb)
        m_nev = np.where(sel, nv, m_nev)
    solido_a = np.maximum.reduce([a_lon, a_dis, a_mur, a_pis, alfa_obj])

    # ── albedo com profundidade de campo
    img = ampliar(ceu)
    for (cam, r) in ((longe.c, 1.3), (dist.c, 0.7), (muro.c, 0.0), (piso.c, 0.0), (obj.cam.c, 0.0)):
        img = sobre(img, desfocar_rgba(ampliar(cam), r))
    solido = desfocar(ampliar(solido_a[:, :, None]), 0.6)[:, :, 0]
    sol_ = np.clip(solido, 0, 1)[:, :, None]

    def amp(a, r=0.9):
        return desfocar(ampliar(a[:, :, None].astype(np.float32)), r)[:, :, 0]

    M_sol, M_fogo, M_amb, M_nev = amp(m_sol, 1.0), amp(m_fogo, 1.0), amp(m_amb, 0.8), amp(m_nev, 1.2)
    # oclusão: pé do muro, pé dos objetos, junto do torreão
    ao = np.zeros((H, W), np.float32)
    ao = np.maximum(ao, suave(MURO_BASE + 7, MURO_BASE, YA) * (YA >= MURO_BASE) * 0.75)
    ao = np.maximum(ao, ((alfa_obj > 0.4) & (obj.base >= 0) & (np.abs(YA - obj.base) < 3)).astype(np.float32))
    ao = np.maximum(ao, suave(52, 40, XA) * (YA > 150) * 0.6)
    ao = np.maximum(ao, (CAPA + 4 <= YA) * (YA < CAPA + 7) * 0.5)
    AO = desfocar(ampliar(ao[:, :, None]), 4)[:, :, 0] * (1 - amp(alfa_obj, 0.5) * 0.6)

    # ── luz
    amb = hexa(per["amb"]) * per["amb_k"]
    luz = amb * (M_amb * (1 - AO * 0.55))[:, :, None]
    luz = luz + hexa(per["sol"]) * per["sol_k"] * M_sol[:, :, None]
    fk = per["fogo_k"]
    L_fogo = luz_em_degraus(fx, fy - 4, 150, 0.5, 21, 7)[:, :, None] * hexa("#ff8a3a") * 1.35
    L_fogo += luz_pontual(fx, fy - 6, 52, 0.7)[:, :, None] * hexa("#ffd890") * (0.9 if nome != "noite" else 0.55)
    L_fogo = L_fogo * M_fogo[:, :, None]
    luz = luz + L_fogo * fk
    lk = per["lamp_k"]
    L_lamp = np.zeros_like(luz)
    for (lx_, ly_, cor, raio, k) in obj.luzes:
        L_lamp += luz_em_degraus(lx_, ly_, raio, 0.75, int(lx_), 5)[:, :, None] * hexa(cor) * k
    luz = luz + L_lamp * lk * np.clip(M_fogo + 0.3, 0, 1)[:, :, None]
    if nome == "noite":  # a aurora tinge de leve o que olha para cima
        luz = luz + hexa("#3ac890") * 0.06 * (amp(topos.astype(np.float32)) + (GYa >= MURO_BASE) * 0.4)[:, :, None]
    img = img * (1 - sol_) + img * sol_ * luz

    # ── metal: brilho especular do fogo, das lanternas e do sol
    met = amp(obj.metal + metal_piso * 0.3, 0.5)
    esp = L_fogo.mean(2) * fk * 0.9 + L_lamp.mean(2) * lk * 0.6 + M_sol * per["sol_k"] * 0.25
    img += (met * esp)[:, :, None] * hexa("#ffe0a0") * 0.9

    # ── recorte: bordas viradas para o sol / a lua (muro, ameias, objetos)
    A = (np.maximum.reduce([a_mur, alfa_obj, a_dis]) > 0.5)
    rec = np.zeros((H, W), np.float32)
    for (ddx, ddy, sel) in ((1, -1, XA < sx - 24), (-1, -1, XA > sx + 24), (0, -1, np.abs(XA - sx) <= 24)):
        viz = np.roll(np.roll(A, -ddy, 0), -ddx, 1)
        viz[:2, :] = True
        viz[:, :2] = True
        viz[:, -2:] = True
        rec = np.maximum(rec, (A & ~viz & sel).astype(np.float32))
    rec *= (1 - (a_lon > 0.5) * 0.5)
    REC = amp(rec, 0.8)
    perto_astro = luz_pontual(sx, sy, {"manha": 260, "tarde": 220, "noite": 260}[nome], 0.9)
    img += (REC * perto_astro)[:, :, None] * hexa(per["rim"]) * per["rim_k"]

    # ── névoa por distância
    nev = hexa(per["nevoa"]) * per["nevoa_k"]
    if nome == "tarde":
        nev = nev * (1 + luz_pontual(sx, sy, 160, 0.6)[:, :, None] * 0.9)
    elif nome == "manha":
        nev = nev * (1 + luz_pontual(sx, sy + 20, 150, 0.6)[:, :, None] * 0.08)
    else:
        nev = nev * (1 + luz_pontual(sx, sy, 200, 0.7)[:, :, None] * 0.4)
    mn = (M_nev * sol_[:, :, 0])[:, :, None]
    img = img * (1 - mn) + nev * mn

    # ── emissivos: brasas, vidro das lanternas, vela, janelas
    em = ampliar(obj.emissivo.c)
    k_em = {"manha": 0.6, "tarde": 0.9, "noite": 1.5}[nome]
    img = img * (1 - em[:, :, 3:4] * min(1, k_em)) + em[:, :, :3] * em[:, :, 3:4] * k_em
    halo = desfocar(em[:, :, :3] * em[:, :, 3:4], 6) * 1.2 + desfocar(em[:, :, :3] * em[:, :, 3:4], 22) * 1.3
    img += halo * k_em * 0.5
    if nome != "manha":
        jan = np.zeros((H, W), np.float32)
        for (wx, wy) in janelas:
            jan[wy, wx] = 1
        kj = 1.3 if nome == "noite" else 0.45
        J = ampliar(jan[:, :, None])
        img = img * (1 - J * 0.9) + J * hexa("#ffd27a") * kj
        img += desfocar(J, 5) * hexa("#ffb050") * 2.2 * kj

    # ── feixes: raios do sol/lua passando pelas aberturas do parapeito, e poeira
    vis_ceu = (1 - np.clip(solido, 0, 1)) * (GYa < HOR + 4)
    brilho = np.exp(-np.hypot(GXa - sx, (GYa - sy) * 1.2) / {"manha": 10, "tarde": 7, "noite": 9}[nome])
    pes_r = {"manha": (0.2, 1.8), "tarde": (0.18, 3.0), "noite": (0.12, 1.0)}[nome]
    raios = raios_de_luz((vis_ceu * (pes_r[0] + brilho * pes_r[1])).astype(np.float32), (sx, sy), passos=90,
                         alcance=0.97, queda=0.975)
    raios = desfocar(raios[:, :, None], 4)[:, :, 0]
    k_r = {"manha": 0.45, "tarde": 1.15, "noite": 0.45}[nome]
    cor_r = {"manha": "#ffe6b0", "tarde": "#ffb468", "noite": "#8aa2e8"}[nome]
    img += raios[:, :, None] * hexa(cor_r) * k_r
    # o ar sobre as faixas de sol do piso (volume): sobe das faixas em direção ao sol
    faixa_ar = np.zeros((H, W), np.float32)
    if nome != "noite":
        lit = sombra_parapeito(per) * (1 - s_obj)
        for k in range(1, 40, 2):
            f = k / 40
            yy = np.clip((YA + (sy - YA) * f * 0.5).astype(int), 0, H - 1)
            xx = np.clip((XA + (sx - XA) * f * 0.5).astype(int), 0, W - 1)
            faixa_ar = np.maximum(faixa_ar, np.zeros_like(faixa_ar))
            faixa_ar[yy, xx] = np.maximum(faixa_ar[yy, xx], lit * (1 - f) * (YA > MURO_BASE + 4))
        FA = desfocar(ampliar(faixa_ar[:, :, None]), 7)[:, :, 0] * (GYa > HOR + 8)
        FA = FA * (1 - amp(alfa_obj, 1) * 0.6)
        img += FA[:, :, None] * hexa(cor_r) * {"manha": 0.16, "tarde": 0.3}[nome]
    else:
        FA = np.zeros((H * ESC, W * ESC), np.float32)
    poe_peso = (raios * 1.3 + FA * 0.6) * (GYa < MURO_BASE + 6)
    g = np.random.default_rng(83)
    rgbp = hexa({"manha": "#fff4d0", "tarde": "#ffd8a0", "noite": "#c8d8ff"}[nome])
    for _ in range(900):
        X, Y = int(g.random() * (W * ESC - 4)), int(g.random() * (H * ESC - 4))
        k = poe_peso[Y, X] * (0.3 + g.random() * 0.8)
        if k > 0.05 and not (LIVRE["esqueleto"][0] * ESC <= X <= LIVRE["esqueleto"][2] * ESC and
                             LIVRE["esqueleto"][1] * ESC <= Y <= LIVRE["esqueleto"][3] * ESC):
            tam = 2 if g.random() < 0.7 else 3
            img[Y:Y + tam, X:X + tam] += rgbp * min(k, 0.6)

    # ── céu: cintilação das estrelas grandes; pássaros de dia; brasas subindo à noite e à tarde
    for (x, y, b, cor) in estrelas:
        X, Y = int(x * ESC + 1), int(y * ESC + 1)
        for d_ in range(-5, 6):
            k = (1 - abs(d_) / 6) ** 2 * (b - 0.8) * 0.9
            if 0 <= Y + d_ < H * ESC and 0 <= X + d_ < W * ESC:
                img[Y + d_, X] += cor * k
                img[Y, X + d_] += cor * k
    if nome != "noite":
        cor_p = hexa("#2a2a38") if nome == "manha" else hexa("#3a1e2a")
        for (bx, by, a) in ((338, 46, 0), (346, 50, 1), (331, 52, 1), (352, 44, 0), (268, 36, 1)):
            X, Y = bx * ESC, by * ESC
            for (dx, dy) in ((0, 0), (1, 1), (2, 0)) if a else ((0, 1), (1, 0), (2, 1)):
                img[Y + dy * ESC:Y + dy * ESC + ESC, X + dx * ESC:X + dx * ESC + ESC] = cor_p
    if nome != "manha":
        g2 = np.random.default_rng(91)
        for _ in range(9):
            x, y = 226 + g2.random() * 30, 72 + g2.random() * 30
            X, Y = int(x * ESC), int(y * ESC)
            kk = 0.6 + g2.random() * 0.8
            img[Y:Y + 3, X:X + 3] += hexa("#ffb050") * kk
            img += 0  # (o halo vem do brilho geral)

    # ── primeiro plano desfocado e escuro
    fr = desfocar_rgba(ampliar(frente.c), 9)
    k_fr = {"manha": 0.5, "tarde": 0.4, "noite": 0.3}[nome]
    img = sobre(img, fr * np.array([k_fr, k_fr, k_fr * 1.05, 1], dtype=np.float32))

    # ── acabamento: brilho, curva de tom, cor, área calma, vinheta e grão
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
    calma = (1 - suave(0.28, 0.46, xn))[:, :, None] * (0.75 + 0.25 * suave(0.3, 0.8, yn))[:, :, None]
    media = desfocar(np.clip(img, 0, 1.2), 16)
    img = media + (img - media) * (1 - 0.38 * calma)
    img *= 1 - 0.2 * calma
    v = (xn - 0.55) ** 2 * 1.3 + (yn - 0.58) ** 2 * 1.6
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
        img.save(PASTA / f"cena-observatorio-{nome}.webp", quality=84, method=6)
        img.resize((960, 400), Image.LANCZOS).save(PASTA / f"cena-observatorio-{nome}-960.webp", quality=82, method=6)
        print(nome, (PASTA / f"cena-observatorio-{nome}.webp").stat().st_size // 1024, "KB",
              (PASTA / f"cena-observatorio-{nome}-960.webp").stat().st_size // 1024, "KB", f"{time.time() - t0:.1f}s")
    (Path(__file__).resolve().parent / "cena-observatorio.json").write_text(
        json.dumps({"gato": GATO, "coruja": CORUJA, "particulas": "estrelas"}, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
