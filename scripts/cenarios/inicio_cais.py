"""Cenário "HD-2D" do topo da página inicial: O cais do lago (01/11/2026, rodízio de cenários do início).

Nada baixado nem gerado por IA: cada pixel sai das funções abaixo, no mesmo jeito do acampamento
(scripts/gerar_cena_inicio.py, de onde vêm os pincéis básicos: Camada, copa, pedra, luz_pontual, luz_em_degraus,
raios_de_luz, facho, projetar_sombra, desfoque em float). A arte é pintada em pixel art (480 x 200), camada por
camada, e montada em 3x com a luz calculada por pixel:
- ao fundo, o céu da hora, duas cordilheiras (a de longe com neve), morros com mata e a mata de pinheiros da outra
  margem, com uma cabana de pescador cuja janela acende ao entardecer;
- no meio, o lago calmo: o REFLEXO é calculado espelhando a imagem já iluminada (céu, montanhas, estrelas, lua, sol)
  com ondulação em degraus de pixel (cada linha da arte desliza um número inteiro de pixels), cristas e cavados,
  caminho de brilho do sol ou da lua e o reflexo próprio de cada objeto que está na água (o cais, as estacas, o barco,
  as lanternas) espelhado na sua linha d'água;
- o trapiche tábua por tábua com estacas, guarda-corpo de corda, rede pendurada com boias, vara de pesca com a boia
  na água, rolo de corda e balde; o barquinho a remo amarrado; lanternas em postes sobre a água;
- na margem de cá: a plataforma de pedra com o braseiro de ferro (só carvão e brasas: o fogo animado entra por cima),
  o poste com lanterna, a pedra grande, caixotes, barril com lampião, juncos e taboas, capim fio a fio;
- luz: ambiente da hora, sol (manhã de lado, tarde em contraluz), sombras projetadas, luz quente do braseiro e das
  lanternas (com o brilho delas riscado na água), névoa sobre o lago de manhã, feixes volumétricos com poeira,
  vaga-lumes à noite, brilho (bloom), curva de tom, correção de cor e vinheta.
Três horas do dia em public/pixel/inicio/: cena-cais-manha, cena-cais-tarde e cena-cais-noite (.webp, 1440 x 600 e
960 x 400) e cena-cais.json com os pontos do gato e da coruja.

O fogo, o esqueleto, o gato e a coruja ficam fora do cenário (animados por cima, CenaDiorama.tsx): a caixa do fogo
(x 220-260, y 104-152) tem só o braseiro; a do esqueleto (x 262-308, y 96-163) fica como chão aberto.
Uso: python3 scripts/cenarios/inicio_cais.py            (as três)
     python3 scripts/cenarios/inicio_cais.py noite      (só uma)
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

from gerar_cena_inicio import (  # noqa: E402  (pincéis do acampamento, reaproveitados sem alterar o original)
    BAYER_HW, CASCA, ESC, FOLHA_ARBUSTO, FOLHA_DOSSEL, FOLHA_MEIO, FOLHA_PERTO, GRAMA, GX, GXa, GY, GYa, H,
    MADEIRA, MUSGO, MUSGO_N, PEDRA, TERRA, VEIOS, W, XA, YA, Camada, _caixa, ampliar, copa, desfocar, desfocar_rgba,
    dist_segmentos, elipse, facho, fbm, hexa, lampiao, luz_em_degraus, luz_pontual, pal, pedra, pontilhar, projetar_sombra,
    raios_de_luz, ruido, ruido_ret, sobre, suave, tronco,
)

PASTA = RAIZ / "public" / "pixel" / "inicio"
FOGO = (240, 146)                       # centro da base da chama (o sprite animado ocupa x 220-260, y 104-152)
LIVRE = {"fogo": (220, 104, 260, 152), "esqueleto": (262, 96, 308, 163)}
Y0 = 84                                 # linha d'água da outra margem (eixo do espelho do fundo)
CAIS_X0, CAIS_X1, CAIS_YL, CAIS_YP, CAIS_AGUA = 318, 468, 106, 121, 131   # trapiche: ponta, raiz, bordas e linha d'água
BARCO = (337, 139, 149)                 # centro do barco e sua linha d'água
ASTRO = {"manha": (-60, -50), "tarde": (290, 66), "noite": (364, 26)}

PERIODOS = {
    "manha": dict(
        luz=(-0.78, -0.55), ceu=("#5e98d2", "#a9cdea", "#f6ecd6"), amb="#86a4c8", amb_k=0.5, sol="#ffe2b0", sol_k=1.02,
        nevoa="#d4e2e4", nevoa_k=0.92, fogo_k=0.26, lamp_k=0.16, quente="#ffe8c4", fria="#2a4868",
        agua=("#cfe4ea", "#5e94aa", "#1c4252"), sombra=(1.25, 0.3), refl=0.8),
    "tarde": dict(
        luz=(0.12, -0.95), ceu=("#33397a", "#c46c8c", "#ffb46e"), amb="#8e76ae", amb_k=0.5, sol="#ffb070", sol_k=1.05,
        nevoa="#e8a28c", nevoa_k=0.95, fogo_k=0.62, lamp_k=0.55, quente="#ffd49a", fria="#34265a",
        agua=("#ffcc92", "#8a5a88", "#261c44"), sombra="contraluz", refl=0.9),
    "noite": dict(
        luz=(0.55, -0.83), ceu=("#030817", "#0b1838", "#1c2c5c"), amb="#33479a", amb_k=0.32, sol="#7e9eff", sol_k=0.4,
        nevoa="#16244c", nevoa_k=0.85, fogo_k=1.45, lamp_k=1.0, quente="#ffcf8a", fria="#0a1532",
        agua=("#3a5090", "#14224a", "#050b1c"), sombra=None, refl=0.93),
}

FERRO = pal("#100e0d", "#1c1816", "#2a2420", "#3c342e", "#544840", "#706052", "#90806a")
PEDRA_Q = pal("#24221f", "#38342f", "#4e4943", "#67615a", "#827b70", "#9f9786", "#bdb49e", "#d6ccb2")
AREIA = pal("#2e281f", "#40372b", "#554a39", "#6c5f49", "#86775c", "#a08f70", "#b8a684")
CASCO = pal("#0e2228", "#163640", "#1f4a54", "#2a6068", "#3a7a80", "#5a989a")
PINHO = pal("#12261f", "#1a3428", "#244634", "#305a40", "#3e6e4c")


class Grupo:
    """Objetos numa camada, guardando a linha do chão (ou da água) de cada pixel, para sombras e reflexos."""

    def __init__(self) -> None:
        self.cam = Camada()
        self.base = np.full((H, W), -1, dtype=np.float32)
        self.emissivo = Camada()
        self.luzes: list[tuple[float, float, str, float, float]] = []

    def add(self, base: float, fn, *args) -> None:
        t = Camada()
        fn(t, *args)
        self.cam.juntar(t)
        self.base[t.c[:, :, 3] > 0.4] = base


def lado_luz(luz) -> int:
    return -1 if luz[0] < 0 else 1


# ─────────────────────────────── A margem e a água ───────────────────────────────
_MARGEM = [(0, 147), (40, 149), (90, 145), (140, 141), (172, 138), (200, 136), (214, 137), (240, 137), (266, 134),
           (286, 138), (300, 147), (312, 157), (330, 163), (370, 165), (410, 164), (430, 159), (446, 146), (460, 128),
           (472, 118), (480, 114)]


def margem() -> np.ndarray:
    """Linha da margem de cá (y da primeira linha de terra para cada x)."""
    xs = np.arange(W, dtype=np.float32)
    s = np.interp(xs, [p[0] for p in _MARGEM], [p[1] for p in _MARGEM])
    n = (ruido(77, 5)[0] - 0.5) * 3.0 + (ruido(78, 2)[0] - 0.5) * 1.2
    n[212:268] *= 0.2                 # embaixo da plataforma a borda é de pedra
    return np.round(s + n).astype(np.float32)


def mascara_agua(S: np.ndarray) -> np.ndarray:
    return (YA >= Y0) & (YA < S[None, :])


# ─────────────────────────────── Céu e montanhas ───────────────────────────────
def pintar_ceu(nome: str, per: dict) -> np.ndarray:
    topo, meio, horiz = (hexa(c) for c in per["ceu"])
    t = np.clip(YA / (Y0 - 4), 0, 1)
    t = np.floor(t * 22 + BAYER_HW * 0.9) / 22                     # degraus de pixel art no degradê
    t = np.clip(t, 0, 1)[:, :, None]
    ceu = np.where(t < 0.55, topo * (1 - t / 0.55) + meio * (t / 0.55), meio * (1 - (t - 0.55) / 0.45) + horiz * ((t - 0.55) / 0.45))
    ceu = ceu.astype(np.float32)
    ax, ay = ASTRO[nome]
    d = np.hypot(XA - ax, (YA - ay) * 1.25)
    # nuvens em faixas (estratos), com a barriga iluminada
    nuvem = ruido_ret(7, 46, 5) * 0.6 + ruido_ret(8, 14, 2) * 0.4
    faixa = np.exp(-((YA - 22) / 9) ** 2) * 0.9 + np.exp(-((YA - 44) / 6) ** 2) * 0.75
    v = (nuvem - 0.52) * 2.6 * faixa
    if nome == "manha":
        ceu += (np.exp(-d / 210) * 0.5)[:, :, None] * hexa("#fff2d8")
        cn, cs = hexa("#ffffff"), hexa("#c6d4ea")
    elif nome == "tarde":
        ceu += (np.exp(-d / 60) * 0.3 + np.exp(-d / 14) * 0.22)[:, :, None] * hexa("#ffc078")
        cn, cs = hexa("#ffd0a0"), hexa("#9a5a86")
    else:
        cn, cs = hexa("#2a3a6a"), hexa("#121c3e")
    k = np.clip(v * 3, 0, 0.8)
    k = (np.floor(k * 5 + BAYER_HW * 0.8) / 5).clip(0, 0.8)[:, :, None]
    barriga = (np.roll(nuvem, -2, axis=0) - 0.52) * 2.6 * faixa < v - 0.03
    cor_n = np.where(barriga[:, :, None], cs, cn)
    if nome == "tarde":   # a borda de baixo das nuvens pega fogo perto do sol
        quente = np.exp(-d / 120)[:, :, None]
        cor_n = cor_n * (1 - quente * 0.6) + hexa("#ffb070") * quente * 0.6 * 1.3
    ceu = ceu * (1 - k) + cor_n * k
    if nome == "tarde":   # o disco do sol baixo, entrando no vale
        disco = np.hypot(XA - ax, YA - ay) < 7.2
        ceu[disco] = hexa("#fff2c8") * 1.9
        aro = (np.hypot(XA - ax, YA - ay) < 8.4) & ~disco
        ceu[aro] = hexa("#ffd890") * 1.4
        for yy in (ay - 2, ay + 1, ay + 4):   # listras de bruma atravessando o disco
            ceu[yy, ax - 8:ax + 9] = ceu[yy, ax - 8:ax + 9] * 0.86 + hexa("#ff9a60") * 0.14
    if nome == "noite":
        g = np.random.default_rng(3)
        for _ in range(300):
            x, y = int(g.random() * W), int(g.random() * (Y0 - 6))
            b = 0.3 + g.random() ** 2 * 0.95
            ceu[y, x] += b * hexa("#e8eeff")
            if b > 1.0:
                for (ox, oy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= x + ox < W and 0 <= y + oy < H:
                        ceu[y + oy, x + ox] += 0.28
        via = np.exp(-((YA + 0.28 * XA - 120) / 13) ** 2) * ruido(9, 5) * 0.28
        ceu += via[:, :, None] * hexa("#8a9ad8")
        for y in range(ay - 8, ay + 9):
            for x in range(ax - 8, ax + 9):
                dd = math.hypot(x - ax, y - ay)
                if dd < 6.6:
                    cr = (x - ax + 2) ** 2 + (y - ay + 1) ** 2 < 4 or (x - ax - 2) ** 2 + (y - ay - 2) ** 2 < 2.5 \
                        or (x - ax - 1) ** 2 + (y - ay + 3) ** 2 < 1.2
                    ceu[y, x] = hexa("#c8d2f0") if cr or dd > 5.8 else hexa("#f4f6ff")
        ceu += (np.exp(-d / 20) * 0.38 + np.exp(-d / 70) * 0.12)[:, :, None] * hexa("#9ab0f0")
    return ceu


def pintar_montes(nome: str, per: dict) -> tuple[Camada, Camada]:
    """Cordilheira de longe (com neve e ravinas) e os morros com mata, mais perto; o vale do pôr do sol em x≈290."""
    lx = lado_luz(per["luz"])
    xs = np.arange(W, dtype=np.float32)
    picos = [(24, 42, 36), (112, 30, 48), (190, 44, 32), (236, 52, 24), (356, 38, 36), (412, 18, 50), (470, 34, 30)]
    alt = np.full(W, 86.0, dtype=np.float32)
    for (px, py, sp) in picos:
        alt = np.minimum(alt, py + (np.abs(xs - px) / sp) ** 1.3 * (76 - py) * 0.8)
    alt += (ruido(41, 3)[0] - 0.5) * 3 + (ruido(42, 10)[0] - 0.5) * 5
    dh = np.gradient(alt)
    cores = {"manha": (pal("#5c7298", "#7088ac", "#8ea6c4", "#b4c8dc"), pal("#9eb2cc", "#e6eef6", "#ffffff")),
             "tarde": (pal("#40345e", "#54406e", "#6c4e7a", "#a46a7e"), pal("#8a6c98", "#e6a8a0", "#ffd2b0")),
             "noite": (pal("#0c1430", "#121c3c", "#18244a", "#22305c"), pal("#2a3866", "#5a6ca0", "#8a9ccc"))}[nome]
    rocha, neve = cores
    c = Camada()
    ravina = ruido_ret(43, 2.2, 9)
    linha_neve = 36 + (ruido(44, 4)[0] - 0.5) * 10
    for x in range(W):
        top = int(alt[x])
        face = float(np.clip(-dh[x] * -lx * 1.3, -1.2, 1.2))   # face virada para a luz acende
        for y in range(top, Y0 + 2):
            prof = y - alt[x]
            k = 1.4 + face + (ravina[y, x] - 0.5) * 1.6 - prof * 0.025 + BAYER_HW[y, x] * 0.7
            cor = rocha[int(np.clip(k, 0, 3))]
            if y < linha_neve[x] + (ravina[y, x] - 0.5) * 6 and prof < 14:
                kn = 1.0 + face * 1.1 + (ravina[y, x] - 0.5) * 1.2 + BAYER_HW[y, x] * 0.6
                cor = neve[int(np.clip(kn, 0, 2))]
            c.p(x, y, cor)
        if face > 0.2:
            c.p(x, top, neve[2] if top < linha_neve[x] else rocha[3])
    # os morros de mata, mais perto, com pontas de pinheiro na crista
    alt2 = 66 + 5 * np.sin(xs / 37 + 0.6) + 3 * np.sin(xs / 13 + 1.7) + (ruido(45, 8)[0] - 0.5) * 6
    alt2 += 6 * np.exp(-((xs - 290) / 22) ** 2)          # o vale onde o sol se põe
    alt2 -= 5 * np.exp(-((xs - 400) / 40) ** 2)
    mata = {"manha": pal("#2e4a52", "#3a5a5e", "#4a6e68", "#5e8270"),
            "tarde": pal("#2a2244", "#36294e", "#46325a", "#6a4462"),
            "noite": pal("#070d1e", "#0b1428", "#101a32", "#16223e")}[nome]
    m = Camada()
    pontas = ruido(46, 2)[0]
    dh2 = np.gradient(alt2)
    for x in range(W):
        top = int(alt2[x])
        face = float(np.clip(-dh2[x] * -lx * 2.0, -1, 1))
        for y in range(top, Y0 + 2):
            k = 1.6 + face * 0.8 + (MUSGO_N[y, x] - 0.5) * 1.6 - (y - top) * 0.04 + BAYER_HW[y, x] * 0.8
            m.p(x, y, mata[int(np.clip(k, 0, 3))])
        if pontas[x] > 0.55:
            for k in range(1 + int((pontas[x] - 0.55) * 8)):
                m.p(x, top - 1 - k, mata[1])
    return c, m


def pinheiro(c: Camada, x: float, ybase: int, alt: int, larg: float, paleta: np.ndarray, lx: int, seed: int) -> None:
    """Pinheiro de silhueta em degraus (camadas de galhos), claro do lado da luz."""
    for k in range(alt):
        y = ybase - k
        t = k / alt
        meia = larg * (1 - t) * 0.5 * (0.7 + 0.3 * (((k + seed) % 4) / 3)) + 0.4
        for xx in range(int(round(x - meia)), int(round(x + meia)) + 1):
            u = (xx - x) / max(meia, 0.8)
            tom = 2 + (1 if u * lx > 0.25 else 0) - (1 if u * lx < -0.35 else 0) + (1 if ((k + seed) % 4) == 0 and u * lx > 0 else 0)
            c.p(xx, y, paleta[int(np.clip(tom, 0, len(paleta) - 1))])
    c.p(x, ybase - alt, paleta[3])


def pintar_mata_longe(nome: str, per: dict) -> tuple[Camada, list]:
    """A outra margem: pinheiros em duas fileiras, algumas copas redondas, a barranca e a cabana do pescador."""
    c = Camada()
    luz = per["luz"]
    lx = lado_luz(luz)
    g = np.random.default_rng(61)
    for fileira, (alt_min, alt_max, passo, pal_) in enumerate(((7, 15, 3.5, PINHO[1:]), (5, 11, 4.5, PINHO))):
        x = -4.0
        while x < W + 4:
            alt = int(alt_min + g.random() * (alt_max - alt_min))
            if 268 < x < 312:
                alt = int(alt * 0.55)        # o vale do sol tem a mata mais baixa
            base = Y0 - (2 if fileira == 0 else 0)
            pinheiro(c, x, base, alt, 3.6 + alt * 0.32, pal_, lx, int(x * 7) + fileira)
            x += passo + g.random() * passo
    for x0 in (40, 150, 230, 340, 452):
        copa(c, x0 + g.random() * 10, Y0 - 5, 4 + g.random() * 2, FOLHA_MEIO[0:6], luz, seed=x0, dens=0.7, escuro=0.15)
    # barranca da outra margem
    for x in range(W):
        for y in range(Y0 - 2, Y0 + 1):
            c.p(x, y, "#141c16" if (x * 7 + y) % 5 else "#26302a")
        if (x * 13) % 17 == 0:
            c.p(x, Y0 - 3, "#3a4a34")
    # a cabana do pescador na outra margem (janela acesa ao entardecer e à noite)
    cx, base = 382, Y0 - 1
    madeira = pal("#2a1c14", "#3e2a1c", "#5a3e28", "#7a5636")
    for y in range(base - 6, base + 1):
        for x in range(cx - 6, cx + 7):
            c.p(x, y, madeira[2 if (x - cx) * lx > 0 else 1] if y % 2 else madeira[0 if (x - cx) * lx < 0 else 1])
    for k in range(6):
        for x in range(cx - 7 + k, cx + 8 - k):
            c.p(x, base - 7 - k, "#3a3238" if (x - cx) * lx < 0 else "#5a4a48")
    c.ret(cx + 3, base - 13, 2, 4, "#2a2220")
    janela = (cx - 2, base - 4)
    c.ret(janela[0], janela[1], 2, 2, "#1a1410")
    # palafitas e um barquinho virado na margem
    for x in (cx - 5, cx + 5):
        c.p(x, base + 1, madeira[0])
    for x in range(cx + 9, cx + 16):
        c.p(x, base - 1, "#4a2a20")
        c.p(x, base - 2, "#7a3a2a" if 10 < x - cx < 15 else "#4a2a20")
    return c, [janela]


# ─────────────────────────────── A margem de cá ───────────────────────────────
def pintar_chao(nome: str, per: dict, S: np.ndarray, agua: np.ndarray) -> Camada:
    c = Camada()
    luz = per["luz"]
    g = np.random.default_rng(30)
    terra_m = YA >= S[None, :]
    d_margem = YA - S[None, :]
    v = fbm(31, (26, 9, 4), (0.5, 0.33, 0.17)) + g.random((H, W)).astype(np.float32) * 0.03
    v = v - suave(200, 30, XA) * 0.12 + suave(60, 0, d_margem) * 0.05
    idx = pontilhar(np.clip((v - 0.26) * 1.05, 0, 1), len(GRAMA), 0.6)
    c.mascara(terra_m, GRAMA[idx])
    # faixa de areia e seixos na beira (molhada e escura junto da água)
    nb = ruido(34, 4)
    praia = terra_m & (d_margem < 2.5 + nb * 5)
    molhado = np.clip(1 - d_margem / 2.2, 0, 1)
    ta = ruido(35, 2) * 0.6 + g.random((H, W)).astype(np.float32) * 0.25 + 0.25 - molhado * 0.55
    c.mascara(praia, AREIA[pontilhar(np.clip(ta, 0, 1), len(AREIA))])
    # caminhos de terra: da frente até a plataforma, da plataforma ao cais e ao poste
    prof = np.clip((YA - 140) / 60, 0, 1)
    caminho = np.minimum.reduce([
        dist_segmentos([(252, H + 4), (247, 182), (241, 162)]) / (3 + prof * 6),
        dist_segmentos([(262, 160), (296, 175), (340, 184), (388, 178), (428, 166), (450, 148), (462, 128)]) / (2.6 + prof * 4),
        dist_segmentos([(216, 157), (210, 153)]) / 3.0,
    ])
    nm = ruido(32, 7)
    t_terra = 1.25 - caminho + (nm - 0.5) * 0.7 + (g.random((H, W)) - 0.5) * 0.25
    trilha = (t_terra > 0.32) & terra_m & ~praia
    tv = ruido(33, 5) * 0.55 + ruido(36, 2) * 0.3 + g.random((H, W)).astype(np.float32) * 0.08 - np.clip(0.6 - t_terra, 0, 1) * 0.5
    c.mascara(trilha, TERRA[pontilhar(np.clip(tv + suave(0.3, 1.2, t_terra) * 0.15, 0, 1), len(TERRA))])
    # capim fio a fio (mais alto na frente e na beira)
    livres = list(LIVRE.values())
    for _ in range(12000):
        x, y = g.random() * W, 110 + g.random() * 92
        xi, yi = int(x), min(int(y), H - 1)
        if not terra_m[yi, xi] or (trilha[yi, xi] and g.random() < 0.88) or (praia[yi, xi] and g.random() < 0.7):
            continue
        if 212 <= xi <= 268 and 132 <= yi <= 164:
            continue
        if any(x0 - 1 <= xi <= x1 + 1 and y0 + 30 <= yi <= y1 + 2 for (x0, y0, x1, y1) in livres):
            continue
        pr = (y - 130) / 70
        alt = int(1 + g.random() * (2 + max(pr, 0) * 5 + (3 if d_margem[yi, xi] < 6 else 0)))
        base_i = int(np.clip(idx[yi, xi], 1, len(GRAMA) - 1))
        incl = (g.random() - 0.5) * 0.8
        for j in range(alt + 1):
            tone = min(len(GRAMA) - 1, base_i - 1 + int(j * 2.4 / max(alt, 1)) + (1 if j == alt else 0))
            c.p(x + incl * j, y - j, GRAMA[tone])
    # seixos e conchinhas na areia, pedrinhas e folhas na trilha
    for _ in range(520):
        x, y = g.random() * W, 112 + g.random() * 88
        xi, yi = int(x), min(int(y), H - 1)
        if not (praia[yi, xi] or trilha[yi, xi]):
            continue
        if any(x0 <= xi <= x1 and y0 + 40 <= yi <= y1 for (x0, y0, x1, y1) in livres):
            continue
        r = 0.8 + g.random() * 1.6 * (0.6 + (y - 110) / 90)
        if r < 1.3:
            c.p(xi, yi, PEDRA[5] if g.random() < 0.7 else "#d8c8b0")
            c.p(xi, yi + 1, PEDRA[2])
        else:
            pedra(c, x, y, r * 1.3, r, luz, seed=xi * 31 + yi)
    # gravetos
    for _ in range(36):
        x, y = g.random() * W, 140 + g.random() * 58
        if not trilha[min(int(y), H - 1), int(x)]:
            continue
        comp = 3 + g.random() * 5
        ang = (g.random() - 0.5) * 1.2
        c.linha(x, y, x + math.cos(ang) * comp, y + math.sin(ang) * comp * 0.4, MADEIRA[2])
    # flores miúdas na grama (poucas, longe do lado do texto)
    cores = [("#ffffff", "#f4e8a0"), ("#f6d24a", "#c88a20"), ("#9a8af0", "#d8d0ff"), ("#7ac8ff", "#e0f4ff")]
    for _ in range(26):
        cx, cy = 150 + g.random() * 330, 150 + g.random() * 48
        if not terra_m[int(cy), int(cx)] or trilha[int(cy), int(cx)] or 212 < cx < 310:
            continue
        cor, miolo = cores[int(g.random() * len(cores))]
        for _ in range(3 + int(g.random() * 6)):
            x, y = int(cx + g.normal(0, 3)), int(cy + g.normal(0, 1.4))
            if 0 <= x < W and 0 <= y < H and terra_m[y, x]:
                c.p(x, y + 1, GRAMA[3])
                c.p(x, y, cor)
                c.p(x + 1, y, cor)
                c.p(x, y - 1, miolo)
    plataforma(c, luz)
    # folhas de lírio d'água nas beiras calmas (rentes à água: não têm reflexo)
    for (x, y, r) in ((70, 136, 3.0), (77, 140, 2.2), (58, 132, 2.4), (110, 134, 2.6), (150, 133, 2.0), (126, 138, 2.8),
                      (392, 156, 2.6), (404, 160, 2.0), (420, 152, 2.4), (24, 140, 2.6)):
        for yy in range(int(y - r * 0.5) - 1, int(y + r * 0.5) + 2):
            for xx in range(int(x - r) - 1, int(x + r) + 2):
                dx, dy = (xx - x) / r, (yy - y) / (r * 0.5)
                if dx * dx + dy * dy <= 1 and not (dx > 0.15 and abs(dy) < 0.28) and agua[yy, xx]:
                    c.p(xx, yy, "#7ab04e" if dy < -0.25 else "#4e8e3c" if dy < 0.45 else "#2c5e30")
        if r > 2.5:
            c.p(x - 1, y - 1, "#ffd6e4")
            c.p(x, y - 1, "#ff8ab0")
            c.p(x - 1, y - 2, "#fff4f8")
    return c


def plataforma(c: Camada, luz) -> None:
    """Plataforma redonda de pedra que avança sobre a água: lajes talhadas em dois anéis em volta do braseiro (juntas
    desencontradas, cada laje com aresta de luz em cima e sombra embaixo), o miolo chamuscado e a face da frente."""
    cx, cy, rx, ry = 240, 147, 25, 11
    lx = lado_luz(luz)
    g = np.random.default_rng(12)
    dx, dy = (XA + 0.5 - cx) / rx, (YA + 0.5 - cy) / ry
    r = np.hypot(dx, dy) * (1 + (ruido(13, 3) - 0.5) * 0.05)
    ang = (np.arctan2(dy, dx) + math.pi) / math.tau          # 0..1
    topo = r <= 1.0
    # anéis: miolo (r < 0.5), anel de dentro (0.5-0.76) e anel de fora (0.76-1)
    anel = np.where(r < 0.5, 0, np.where(r < 0.76, 1, 2))
    nseg = np.where(anel == 1, 11, 17)
    giro = np.where(anel == 1, 0.03, 0.0)
    seg = np.floor((ang + giro) * nseg).astype(int)
    pedra_id = anel * 100 + seg
    tons = {k: g.normal(0, 0.6) for k in range(400)}
    quente = {k: g.random() < 0.3 for k in range(400)}
    ident = np.where(topo, pedra_id, -1)
    junta = np.zeros((H, W), bool)
    for (ox, oy) in ((1, 0), (0, 1)):
        viz = np.roll(np.roll(ident, -oy, 0), -ox, 1)
        junta |= (ident != viz) & topo & (viz >= 0)
    acima = np.roll(ident, 1, 0)
    abaixo = np.roll(ident, -1, 0)
    ys, xs = np.nonzero(topo)
    for x, y in zip(xs, ys):
        pid = ident[y, x]
        if anel[y, x] == 0:
            continue                                  # o miolo fica embaixo do braseiro (pintado abaixo)
        k = 3.6 + tons[pid] - dx[y, x] * lx * 0.6 - dy[y, x] * 0.4 + (VEIOS[y, (x * 7) % W] - 0.5) * 0.8 + BAYER_HW[y, x] * 0.5
        if acima[y, x] != pid:
            k += 1.3                                  # aresta de cima da laje pega luz
        if abaixo[y, x] != pid:
            k -= 1.0
        cor = PEDRA_Q[int(np.clip(k, 0, 7))]
        if quente[pid]:
            cor = cor * np.array([1.06, 1.0, 0.92], np.float32)
        if junta[y, x]:
            cor = PEDRA_Q[0] if MUSGO_N[y, x] < 0.62 else MUSGO[1]
        c.p(x, y, cor)
    # miolo chamuscado (cinza e fuligem) e marcas de fuligem nas lajes de dentro
    for x, y in zip(xs, ys):
        if anel[y, x] == 0:
            c.p(x, y, ["#2a2420", "#3a332d", "#4a423a", "#24201c"][(x * 7 + y * 13) % 4])
        elif anel[y, x] == 1 and (x * 5 + y * 3) % 7 == 0:
            c.p(x, y, "#2e2824", 0.6)
    # aresta de trás (beira da água) com respingo, e a face da frente em duas fiadas
    for x in range(cx - rx - 1, cx + rx + 2):
        col = np.nonzero(topo[:, x])[0]
        if len(col) == 0:
            continue
        yt, yb = col.min(), col.max()
        c.p(x, yt - 1, "#e8f0f0", 0.3)
        for rr in range(1, 6):
            y = yb + rr
            fiada = (rr - 1) // 3
            junta_v = (x + fiada * 5) % 8 == 0
            kk = 3.0 - rr * 0.3 + ((x * 13 + fiada * 5) % 5 - 2) * 0.3 - abs((x - cx) / rx) * 0.8 - (x - cx) / rx * lx * 0.5
            if rr == 1:
                kk += 0.8
            if rr == 4 or junta_v:
                kk = 0.3
            cor = PEDRA_Q[int(np.clip(kk, 0, 7))]
            if rr >= 5 and MUSGO_N[y, x] > 0.5:
                cor = MUSGO[1]
            c.p(x, y, cor)
        if (x * 7) % 9 == 0:   # tufos de capim no pé da plataforma
            for j in range(3):
                c.p(x + (j % 2), yb + 7 - j, GRAMA[3 + j])


# ─────────────────────────────── O trapiche, o barco e as lanternas da água ───────────────────────────────
def deck(c: Camada, luz) -> None:
    """O tabuleiro: tábuas compridas, cada uma com seu tom, veio, emendas desencontradas e pregos; a borda de trás pega
    luz, a da frente escurece, e a viga da frente fecha o piso."""
    g = np.random.default_rng(21)
    x0, x1, yl, yp = CAIS_X0, CAIS_X1, CAIS_YL, CAIS_YP
    linhas = list(range(yl, yp, 3))
    for r, y0 in enumerate(linhas):
        # emendas desencontradas: cada fiada de tábuas tem cortes em pontos diferentes
        cortes = [x0 - 3]
        while cortes[-1] < x1:
            cortes.append(cortes[-1] + int(16 + g.random() * 22))
        tons = g.normal(0, 0.5, len(cortes))
        falta = int(g.integers(2, len(cortes) - 2)) if r in (1, 3) else -1
        v = r / max(len(linhas) - 1, 1)
        for x in range(x0 - 2 + (r * 7) % 3 - 1, x1):
            t = int(np.searchsorted(cortes, x, side="right")) - 1
            junta = x in cortes
            for dy in range(3):
                y = y0 + dy
                if y >= yp:
                    continue
                if t == falta:
                    c.p(x, y, "#0a0806" if dy < 2 else MADEIRA[0])      # tábua que falta: a água escura embaixo
                    continue
                if dy == 2:
                    k = 1.4 + tons[t] * 0.3                                # fresta entre fiadas
                else:
                    k = 4.3 + tons[t] - v * 1.2 + (0.45 if dy == 0 else 0)
                    k += (VEIOS[(y * 5 + t * 13) % H, (x * 2 + t * 31) % W] - 0.5) * 1.3
                    k += 0.5 * math.exp(-((v - 0.45) / 0.3) ** 2) * (0.5 + 0.5 * math.sin(x * 0.05 + t))   # trilha gasta
                if junta:
                    k = 1.2
                c.p(x, y, MADEIRA[int(np.clip(k + BAYER_HW[y, x] * 0.35, 0, 6))])
            if (x - cortes[t]) in (1,) or (cortes[min(t + 1, len(cortes) - 1)] - x) == 2:
                c.p(x, y0, "#b8b2a4")                                      # pregos na ponta das tábuas
    # viga da frente (topo de luz, face em sombra) e a cabeça do trapiche
    for x in range(x0 - 3, x1):
        c.p(x, yp, MADEIRA[5] if (x // 6) % 4 else MADEIRA[6])
        c.p(x, yp + 1, MADEIRA[3])
        c.p(x, yp + 2, MADEIRA[2])
        c.p(x, yp + 3, MADEIRA[1])
    for y in range(yl, yp + 4):
        c.p(x0 - 4, y, MADEIRA[2])
        c.p(x0 - 5, y, MADEIRA[1])


def estacas(c: Camada, luz, perto: bool) -> None:
    """Estacas do trapiche: as da frente inteiras até a água, com limo e cracas; as de trás aparecem entre elas."""
    x0, x1, yp = CAIS_X0, CAIS_X1, CAIS_YP
    lx = lado_luz(luz)
    if perto:
        for x in range(x0 + 1, x1 - 6, 18):
            for y in range(yp + 3, CAIS_AGUA):
                lim = y >= CAIS_AGUA - 3
                for k in range(3):
                    t = 3 + (1 if (k == 0) == (lx < 0) else -1 if k == 2 else 0) - (2 if lim else 0)
                    c.p(x + k, y, (MUSGO[t - 1] * 0.6 if lim else MADEIRA[t]) if not lim else hexa("#1e2a1c") * (1 + 0.15 * k))
            c.p(x + 1, CAIS_AGUA - 4, "#c8c4b4")
            c.p(x, CAIS_AGUA - 2, "#a8a494")
    else:
        for x in range(x0 + 10, x1 - 6, 18):
            for y in range(yp + 3, CAIS_AGUA - 3):
                c.p(x, y, MADEIRA[1])
                c.p(x + 1, y, MADEIRA[0])


def sombra_sob_deck(c: Camada) -> None:
    for x in range(CAIS_X0 - 1, CAIS_X1):
        for y in range(CAIS_YP + 3, CAIS_AGUA - 1):
            c.p(x, y, "#060a0c", 0.8 - (y - CAIS_YP - 3) * 0.12)


def guarda_corpo(c: Camada, luz) -> None:
    """Postes curtos na borda de trás, com corda frouxa entre eles."""
    postes = [CAIS_X0 + 4 + 36 * k for k in range(5)]
    for x in postes:
        for y in range(CAIS_YL - 9, CAIS_YL + 1):
            c.p(x, y, MADEIRA[4])
            c.p(x + 1, y, MADEIRA[2])
        c.p(x, CAIS_YL - 10, MADEIRA[5])
        c.p(x + 1, CAIS_YL - 10, MADEIRA[3])
    for a, b in zip(postes[:-1], postes[1:]):
        for x in range(a + 2, b):
            t = (x - a) / (b - a)
            y = CAIS_YL - 8 + 3.2 * 4 * t * (1 - t)
            c.p(x, y, "#cdb98c")
            c.p(x, y + 1, "#6e5a3a", 0.6)


def rede_pendurada(c: Camada, luz) -> None:
    """Rede de pesca jogada sobre a corda, caindo até as tábuas, com boias de cortiça e vermelhas."""
    a, b = CAIS_X0 + 40, CAIS_X0 + 76
    for x in range(a + 2, b - 1):
        t = (x - a) / (b - a)
        ytop = CAIS_YL - 8 + 3.2 * 4 * t * (1 - t)
        ybot = CAIS_YP - 4 + math.sin(x * 0.7) * 1.2
        for y in range(int(ytop) + 1, int(ybot) + 1):
            malha = ((x + y) % 4 == 0) or ((x - y) % 4 == 0)
            dobra = math.sin(x * 0.55 + y * 0.2) > 0.6
            if malha:
                c.p(x, y, "#a8b498" if not dobra else "#6e7a62")
            elif dobra:
                c.p(x, y, "#3a4636", 0.45)
        if x % 6 == 0:
            yb = int(ybot)
            cor = ("#e8dcc0", "#b89a6a") if (x // 6) % 2 else ("#e04a3a", "#9a2a1e")
            c.ret(x - 1, yb, 3, 2, cor[0])
            c.p(x + 1, yb + 1, cor[1])


def tralha_no_cais(c: Camada, luz) -> None:
    """Rolo de corda, balde, caixote pequeno e a vara de pesca apoiada no guarda-corpo, com a linha e a boia."""
    # rolo de corda
    cx, cy = 440, 115
    for r in (5, 4, 3, 2):
        for k in range(int(r * 8)):
            a = k / (r * 8) * math.tau
            c.p(cx + math.cos(a) * r, cy + math.sin(a) * r * 0.42, "#d8c49a" if math.sin(a) < 0 else "#9a8458")
    c.p(cx, cy, "#4a3a22")
    # balde de madeira com aros
    bx, by = 452, 117
    for y in range(by - 6, by):
        for x in range(bx - 3, bx + 4):
            c.p(x, y, MADEIRA[4 if x < bx else 3] if y not in (by - 5, by - 2) else "#5a5650")
    c.ret(bx - 3, by - 7, 7, 1, "#2a1a10")
    c.ret(bx - 2, by - 7, 5, 1, "#3a6a7a")
    # caixote pequeno
    c.ret(424, 108, 10, 9, MADEIRA[3])
    c.ret(424, 108, 10, 1, MADEIRA[6])
    c.ret(424, 112, 10, 1, MADEIRA[1])
    c.ret(424, 108, 1, 9, MADEIRA[5])
    c.ret(433, 108, 1, 9, MADEIRA[2])
    # vara de pesca: do tabuleiro, apoiada no poste, saindo sobre a água de trás
    c.linha(398, 118, 392, 102, MADEIRA[4])
    c.linha(392, 102, 372, 78, "#b8945a")
    c.p(397, 115, "#2a2a2a")
    c.p(398, 116, "#7a7a80")
    for y in range(79, 97):        # a linha
        c.p(372 + (y - 79) * 0.05, y, "#d8d8d0", 0.55)
    c.p(373, 97, "#e8e0d0")
    c.p(373, 98, "#d83a2a")


def poste_lanterna(c: Camada, e: Camada, x: int, ytop: int, ybase: int, braco: int, luz) -> None:
    """Poste alto de madeira com braço e lanterna pendurada (braço < 0: para a esquerda)."""
    lx = lado_luz(luz)
    for y in range(ytop, ybase):
        c.p(x, y, MADEIRA[5] if lx < 0 else MADEIRA[3])
        c.p(x + 1, y, MADEIRA[3])
        c.p(x + 2, y, MADEIRA[1])
    c.ret(x, ytop - 1, 3, 1, MADEIRA[6])
    xb = x + 1 + braco
    c.linha(x + 1, ytop + 2, xb, ytop + 2, MADEIRA[4])
    c.linha(x + 1, ytop + 3, xb, ytop + 3, MADEIRA[1])
    c.linha(x + 1, ytop + 8, x + 1 + int(braco * 0.55), ytop + 3, MADEIRA[2])
    for y in range(ytop + 4, ytop + 6):
        c.p(xb, y, "#5a5650")
    lampiao(c, e, xb, ytop + 6 + 18, luz)


def barco(c: Camada, luz) -> None:
    """Barquinho a remo visto de cima, de lado: borda de madeira em volta, fundo fundo e escuro, bancos e remos,
    costado pintado (verde-mar com faixa vermelha) aparecendo embaixo da borda da frente, proa erguida à esquerda."""
    cx, cy, agua = BARCO
    lx = lado_luz(luz)
    rx, ry = 22.0, 5.0
    bordo = pal("#f0cc8a", "#c8965a", "#8a5e34", "#4a2e18")

    def meia(u: float) -> float:
        if u < 0:
            return ry * max(0.0, 1 - abs(u) ** 2.2) ** 0.6       # proa afinando em ponta
        return ry * (0.62 + 0.38 * math.sqrt(max(0.0, 1 - (u / 1.0) ** 2))) if u < 0.97 else ry * 0.6

    for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
        u = (x + 0.5 - cx) / rx
        if abs(u) > 1.0:
            continue
        hh = meia(u)
        sobe = max(0.0, -u - 0.6) * 5.0                            # a proa sobe um pouco
        ytop, ybot = cy - hh - sobe, cy + hh - sobe * 0.6
        # costado de fora, perto da câmera
        lado = 4.6 * (1 - abs(u) ** 3) + 1.4 + sobe * 0.5
        for y in range(int(round(ybot)) + 1, int(round(min(agua + 0.4, ybot + lado))) + 1):
            r = (y - ybot) / max(lado, 1)
            k = 3.6 - r * 2.6 + (0.5 if u * lx > 0.1 else -0.2) - abs(u) ** 4 * 1.0
            cor = CASCO[int(np.clip(k, 0, 5))]
            if r < 0.24:
                cor = hexa("#c0502e") if u * lx > -0.2 else hexa("#8a3420")
            elif int(y - ybot) % 2 == 0:
                cor = CASCO[int(np.clip(k - 0.8, 0, 5))]           # tábuas sobrepostas do casco
            c.p(x, y, cor)
        # dentro: parede de trás clara, fundo escuro com tábuas, sombra embaixo da borda da frente
        y0i, y1i = int(round(ytop)) + 1, int(round(ybot))
        for y in range(y0i, y1i):
            v = (y + 0.5 - ytop) / max(ybot - ytop, 1)
            if v < 0.3:
                k = 3.6 - v * 4 + (0.4 if u * lx < 0 else 0)
            elif v > 0.8:
                k = 0.6
            else:
                k = 1.7 + (0.6 if (y % 2) else 0) - abs(u) * 0.6
            c.p(x, y, MADEIRA[int(np.clip(k, 0, 6))])
        # a borda (amurada) em volta, grossa e clara, com o contorno escuro
        c.p(x, int(round(ytop)), bordo[0] if u * lx < 0.4 else bordo[1])
        c.p(x, int(round(ytop)) - 1, bordo[3])
        c.p(x, int(round(ybot)), bordo[1])
        c.p(x, int(round(ybot)) - 1 if y1i - y0i > 3 else int(round(ybot)), bordo[2])
    # proa (roda de proa) e espelho de popa
    px_ = int(cx - rx)
    c.p(px_, int(cy - 3), bordo[0])
    c.p(px_ - 1, int(cy - 4), bordo[1])
    c.p(px_ - 1, int(cy - 3), bordo[3])
    for y in range(int(cy - ry * 0.6), int(cy + ry * 0.6) + 1):
        c.p(int(cx + rx), y, bordo[1])
        c.p(int(cx + rx) + 1, y, bordo[2])
    # bancos atravessados
    for bxx in (int(cx - 8), int(cx + 7)):
        for y in range(int(cy - ry * 0.8), int(cy + ry * 0.8) + 1):
            c.p(bxx, y, bordo[0])
            c.p(bxx + 1, y, bordo[1])
            c.p(bxx + 2, y, bordo[3])
    # dois remos deitados, cabo claro e pá larga
    for (a, b, yy) in ((cx - 15, cx + 12, cy - 1.0), (cx - 12, cx + 15, cy + 1.6)):
        c.linha(a, yy, b, yy - 0.6, "#e0bc84")
        c.ret(int(b) - 1, int(yy - 1.5), 5, 2, "#b88a54")
        c.ret(int(b), int(yy - 1.5), 3, 1, "#ecc890")
    # rolo de corda na proa e a corda da popa até a estaca do trapiche
    for k in range(12):
        a = k / 12 * math.tau
        c.p(cx - 15 + math.cos(a) * 2.4, cy + 0.5 + math.sin(a) * 1.1, "#e0cca0" if math.sin(a) < 0 else "#a08a5e")
    xs_, ys_ = cx + rx + 1, cy - 2
    xe, ye = CAIS_X0 + 56, CAIS_YP + 6
    for k in range(24):
        t = k / 23
        c.p(xs_ + (xe - xs_) * t, ys_ + (ye - ys_) * t + 2.6 * 4 * t * (1 - t), "#d8c494")


def estaca_solta(c: Camada, luz) -> None:
    """Estaca de amarração sozinha na água, com corda enrolada e chapéu de limo (poleiro da coruja)."""
    x, ytop, base = 176, 112, 127
    lx = lado_luz(luz)
    for y in range(ytop, base):
        lim = y >= base - 3
        for k in range(3):
            t = 3 + (1 if (k == 0) == (lx < 0) else -1 if k == 2 else 0)
            c.p(x + k, y, hexa("#1e2a1c") * (1 + 0.2 * k) if lim else MADEIRA[t])
    c.ret(x, ytop - 1, 3, 1, MADEIRA[5])
    c.p(x + 1, ytop - 1, MADEIRA[6])
    for y in (ytop + 4, ytop + 6):
        c.ret(x - 1, y, 5, 1, "#d8c494")
        c.p(x + 3, y + 1, "#8a7650")
    c.linha(x + 3, ytop + 7, x + 7, base - 1, "#cdb98c", 0.8)


def barco_longe(c: Camada, e: Camada, luz) -> None:
    """Um barquinho de pesca lá longe, parado no meio do lago, com uma lanterninha num pau."""
    x, y = 150, 100
    for i in range(-6, 7):
        c.p(x + i, y, "#2a2018")
        if abs(i) < 6:
            c.p(x + i, y - 1, "#5a4030" if i < 4 else "#3a2a20")
    c.p(x - 6, y - 1, "#6a4e34")
    c.ret(x - 4, y - 2, 9, 1, "#8a6a44")
    c.ret(x + 3, y - 6, 1, 4, "#3a2a1e")
    c.p(x + 4, y - 6, "#3a2a1e")
    c.p(x + 4, y - 5, "#4a3a2a")
    e.p(x + 4, y - 5, "#ffd27a")


def pintar_cais(nome: str, per: dict) -> Grupo:
    o = Grupo()
    luz = per["luz"]
    o.add(-1, sombra_sob_deck)
    o.add(CAIS_AGUA - 4, estacas, luz, False)
    o.add(CAIS_AGUA, estacas, luz, True)
    o.add(CAIS_AGUA, deck, luz)
    o.add(CAIS_AGUA - 4, guarda_corpo, luz)
    o.add(CAIS_AGUA, rede_pendurada, luz)
    o.add(CAIS_AGUA, tralha_no_cais, luz)
    o.add(CAIS_AGUA, poste_lanterna, o.emissivo, CAIS_X0 + 1, 96, CAIS_AGUA, -7, luz)
    o.add(CAIS_AGUA, poste_lanterna, o.emissivo, CAIS_X0 + 91, 96, CAIS_AGUA, 7, luz)
    o.add(BARCO[2], barco, luz)
    o.add(125, estaca_solta, luz)
    o.add(101, barco_longe, o.emissivo, luz)
    o.cam.contornar("#120a06", 0.45)
    o.luzes += [(CAIS_X0 - 5, 111, "#ffc870", 40, 0.95), (CAIS_X0 + 99, 111, "#ffc870", 40, 0.9)]
    return o


# ─────────────────────────────── Objetos da margem ───────────────────────────────
BRASA = {"k": 1.0}


def braseiro(c: Camada, e: Camada, luz) -> None:
    """Braseiro de ferro baixo em três pés: bacia com rebites, aro, carvão e brasas (sem chama)."""
    fx, fy = 240, 147
    lx = lado_luz(luz)
    rx, ry = 14.0, 4.0
    # pés
    for (x0, dx) in ((229, -2), (240, 0), (251, 2)):
        c.linha(x0, 152, x0 + dx, 157, FERRO[1])
        c.linha(x0 + 1, 152, x0 + dx + 1, 157, FERRO[3])
        c.ret(x0 + dx - 1, 157, 3, 1, FERRO[2])
    # bacia (por fora), abaixo do aro da frente
    for x in range(int(fx - rx), int(fx + rx) + 1):
        u = (x + 0.5 - fx) / rx
        if abs(u) > 1:
            continue
        y_aro = fy + ry * math.sqrt(1 - u * u)
        prof = 5.5 * math.sqrt(max(0.0, 1 - u * u)) + 0.5
        for y in range(int(y_aro), int(y_aro + prof) + 1):
            t = (y - y_aro) / max(prof, 1)
            k = 3.4 - t * 2.0 - u * lx * 0.9 - abs(u) ** 4 * 1.2
            cor = FERRO[int(np.clip(k, 0, 6))]
            if int(y - y_aro) == 2 and (x % 4 == 0):
                cor = FERRO[6]                     # rebites da cinta
            c.p(x, y, cor)
            if t < 0.3:                             # reflexo quente das brasas na borda da bacia
                e.p(x, y, "#c86a2a", 0.35 * (1 - abs(u)))
    # aro (anel) e o carvão por dentro
    for y in range(int(fy - ry) - 1, int(fy + ry) + 2):
        for x in range(int(fx - rx) - 1, int(fx + rx) + 2):
            r = math.hypot((x + 0.5 - fx) / rx, (y + 0.5 - fy) / ry)
            if 0.84 <= r <= 1.04:
                lado_frente = y + 0.5 > fy
                c.p(x, y, FERRO[5] if lado_frente and (x - fx) * lx < 4 else FERRO[4] if lado_frente else FERRO[2])
            elif r < 0.84:
                c.p(x, y, FERRO[1] if y + 0.5 < fy - ry * 0.3 else "#16100c")
    g = np.random.default_rng(9)
    # carvão: pedaços amontoados, brasas nas rachaduras, cinza nas bordas
    for _ in range(70):
        a, d = g.random() * math.tau, math.sqrt(g.random())
        x = fx + math.cos(a) * d * rx * 0.74
        y = fy - 0.5 + math.sin(a) * d * ry * 0.62 - (1 - d) * 1.6
        tam = 1 + int(g.random() * 2)
        tom = ["#1a1818", "#272322", "#36302e", "#48413e"][int(g.random() * 4)]
        c.ret(int(x), int(y), tam, 1 + (g.random() < 0.4), tom)
        if (d > 0.7 and g.random() < 0.6) or g.random() < 0.15:
            c.p(int(x), int(y), "#6e6862" if g.random() < 0.5 else "#8a847c")
    for _ in range(30):
        a, d = g.random() * math.tau, math.sqrt(g.random()) * 0.75
        x = int(fx + math.cos(a) * d * rx * 0.72)
        y = int(fy - 0.5 + math.sin(a) * d * ry * 0.6 - (1 - d) * 1.4)
        quente = 1 - d
        cor = "#ffe08a" if quente > 0.7 else "#ffb040" if quente > 0.4 else "#ff6a20" if quente > 0.15 else "#c03a10"
        c.p(x, y, "#2a1410")
        e.p(x, y, cor, BRASA["k"])
        if g.random() < 0.5:
            e.p(x + 1, y, "#ff7a2a", 0.7 * BRASA["k"])
    # brasinhas caídas nas lajes
    for (x, y) in ((224, 155), (257, 153), (233, 158), (252, 158)):
        c.p(x, y, "#2a1410")
        e.p(x, y, "#ff7a30", 0.9)
    # atiçador de ferro encostado
    c.linha(258, 156, 253, 141, FERRO[2])
    c.linha(259, 156, 254, 141, FERRO[4])
    c.ret(252, 140, 2, 2, FERRO[5])


def lenha(c: Camada, x: int, yb: int, luz) -> None:
    for fila in range(2):
        for k in range(3 - fila):
            cx = x + k * 4 + fila * 2
            cy = yb - 2 - fila * 3.5
            for yy in range(int(cy - 2), int(cy + 3)):
                for xx in range(int(cx - 2), int(cx + 3)):
                    d = math.hypot(xx - cx, (yy - cy) * 1.15)
                    if d <= 2.2:
                        c.p(xx, yy, "#2a1a10" if d > 1.75 else "#a8784a" if d < 0.9 else "#7e5634" if d < 1.4 else "#4a2e1a")


def pedra_grande(c: Camada, luz) -> None:
    pedra(c, 180, 141, 10, 6.5, luz, seed=1201, musgo=0.8, paleta=PEDRA_Q)
    pedra(c, 192, 145, 4.5, 3.2, luz, seed=1202, musgo=0.5, paleta=PEDRA_Q)
    pedra(c, 170, 146, 3.2, 2.2, luz, seed=1203, paleta=PEDRA_Q)


def poste_margem(c: Camada, e: Camada, luz) -> None:
    poste_lanterna(c, e, 210, 114, 153, -6, luz)
    c.ret(208, 152, 7, 1, "#2a1a10")


def juncos(c: Camada, x: float, yb: float, n: int, alt: float, g, taboa: bool = True) -> None:
    """Touceira de juncos e taboas: folhas finas arqueadas e espigas marrons."""
    for k in range(n):
        xx = x + (k - n / 2) * 1.3 + g.random()
        a = alt * (0.6 + g.random() * 0.6)
        curva = (k - n / 2) * 0.09 + (g.random() - 0.5) * 0.1
        for j in range(int(a)):
            t = j / a
            c.p(xx + curva * j * j / a * 2, yb - j, GRAMA[2 + int(t * 4.5)])
        if taboa and k % 3 == 1:
            hx = xx + curva * a * 2
            c.ret(hx, yb - a - 3, 1, 4, "#5a3018")
            c.p(hx + 1, yb - a - 2, "#7a4424")
            c.p(hx, yb - a - 3, "#8a5634")
            c.p(hx, yb - a - 4, GRAMA[5])


def touceiras(c: Camada, S: np.ndarray, luz) -> None:
    g = np.random.default_rng(52)
    for (x, n, alt) in ((14, 7, 16), (34, 5, 12), (62, 6, 14), (98, 5, 11), (128, 6, 13), (156, 4, 10),
                        (378, 6, 13), (394, 4, 9), (432, 6, 14), (204, 3, 8)):
        juncos(c, x, S[int(x)] + 2, n, alt, g)


def caixotes(c: Camada, luz) -> None:
    lx = lado_luz(luz)

    def caixote(x0: int, yb: int, w: int, h: int, prof: int) -> None:
        frente = MADEIRA[4] if lx < 0 else MADEIRA[3]
        lado = MADEIRA[2] if lx < 0 else MADEIRA[5]
        c.ret(x0, yb - h, w, h, frente)
        for y in range(yb - h, yb, 3):
            c.ret(x0, y, w, 1, MADEIRA[2])
        c.ret(x0, yb - h, 2, h, MADEIRA[5])
        c.ret(x0 + w - 2, yb - h, 2, h, MADEIRA[5])
        c.linha(x0 + 2, yb - 2, x0 + w - 3, yb - h + 1, MADEIRA[5])
        for k in range(prof):
            c.ret(x0 + w + k, yb - h - k, 1, h, lado)
            c.ret(x0 + k + 1, yb - h - k - 1, w, 1, MADEIRA[6] if k < prof - 1 else MADEIRA[5])
        for (nx, ny) in ((x0 + 1, yb - h + 1), (x0 + w - 2, yb - h + 1), (x0 + 1, yb - 2), (x0 + w - 2, yb - 2)):
            c.p(nx, ny, "#c0c0b8")
        c.ret(x0, yb - 1, w, 1, MADEIRA[1])

    caixote(334, 176, 17, 12, 4)
    # rede dobrada em cima de um caixote menor ao lado
    caixote(356, 180, 10, 7, 3)
    for y in range(168, 174):
        for x in range(355, 368):
            if ((x + y) % 3 == 0) or ((x - y) % 3 == 0):
                c.p(x, y, "#9aa88a")
    # barril
    bx, bb = 380, 182
    for y in range(bb - 16, bb):
        bojo = 6 + 1.1 * math.sin((y - bb + 16) / 16 * math.pi)
        for x in range(int(bx - bojo), int(bx + bojo) + 1):
            u = (x - bx) / bojo
            k = u * lx * 0.8 + 0.1 - abs(u) ** 4 * 0.7
            i = int(np.clip((k * 0.5 + 0.5) * 6 + 0.5, 0, 6))
            cor = MADEIRA[i] if (x - bx + 20) % 3 else MADEIRA[max(0, i - 1)]
            if y in (bb - 14, bb - 13, bb - 4, bb - 3):
                cor = pal("#2a2826", "#4a4642", "#7a746c", "#a8a098")[int(np.clip((k * 0.5 + 0.5) * 4, 0, 3))]
            c.p(x, y, cor)
    for x in range(bx - 6, bx + 7):
        for y in range(bb - 19, bb - 15):
            if ((x - bx) / 6.2) ** 2 + ((y - bb + 17) / 2) ** 2 <= 1:
                c.p(x, y, MADEIRA[6] if y < bb - 17 else MADEIRA[5])
    # baldinho e corda enrolada no chão
    for r in (4, 3, 2):
        for k in range(r * 8):
            a = k / (r * 8) * math.tau
            c.p(318 + math.cos(a) * r, 184 + math.sin(a) * r * 0.45, "#d8c49a" if math.sin(a) < 0 else "#9a8458")


def lampiao_barril(c: Camada, e: Camada, luz) -> None:
    lampiao(c, e, 380, 163, luz)


def varal_de_rede(c: Camada, luz) -> None:
    """Varal de secar rede na beira, à direita: dois paus, travessa e a rede caída em barriga, com boias."""
    for (x, yb) in ((410, 190), (452, 184)):
        for y in range(146, yb):
            c.p(x, y, MADEIRA[4])
            c.p(x + 1, y, MADEIRA[2])
        c.p(x, 145, MADEIRA[5])
    for x in range(408, 456):
        c.p(x, 148, MADEIRA[5])
        c.p(x, 149, MADEIRA[2])
    for x in range(412, 452):
        t = (x - 412) / 40
        ybot = 150 + 18 * math.sin(t * math.pi) * (0.8 + 0.2 * math.sin(x * 0.4))
        for y in range(150, int(ybot)):
            malha = ((x + y) % 4 == 0) or ((x - y) % 4 == 0)
            if malha:
                c.p(x, y, "#a8b498" if (x // 7) % 2 else "#8a9a82")
        if x % 5 == 0:
            cor = ("#e8dcc0", "#b89a6a") if (x // 5) % 2 else ("#e04a3a", "#9a2a1e")
            c.ret(x - 1, int(ybot), 3, 2, cor[0])
            c.p(x + 1, int(ybot) + 1, cor[1])


def pintar_margem_obj(nome: str, per: dict, S: np.ndarray) -> Grupo:
    o = Grupo()
    luz = per["luz"]
    o.add(147, pedra_grande, luz)
    o.add(154, lenha, 216, 156, luz)
    o.add(157, braseiro, o.emissivo, luz)
    o.add(153, poste_margem, o.emissivo, luz)
    o.add(182, caixotes, luz)
    o.add(182, lampiao_barril, o.emissivo, luz)
    o.add(188, varal_de_rede, luz)
    t = Camada()
    touceiras(t, S, luz)
    o.cam.juntar(t)
    o.base[t.c[:, :, 3] > 0.4] = 150
    o.cam.contornar("#120a06", 0.5)
    o.luzes += [(204, 128, "#ffc870", 34, 0.85), (380, 154, "#ffc870", 30, 0.8)]
    return o


def pintar_arvores(nome: str, per: dict, base_map: np.ndarray) -> Camada:
    """As duas árvores que emolduram: o salgueiro da esquerda (ramos caindo sobre a água) e a da direita."""
    c = Camada()
    luz = per["luz"]
    g = np.random.default_rng(64)
    for (x, base, larg, seed, ytop) in ((10, 156, 22, 1, -2), (470, 132, 18, 2, -2)):
        t = Camada()
        tronco(t, x, ytop, base, larg, luz, seed=seed, musgo=0.75, raizes=4, base_larg=0.8)
        c.juntar(t)
        base_map[t.c[:, :, 3] > 0.5] = base
    # copa do salgueiro: cachos no alto à esquerda (escuros, deixam o lado do texto calmo)
    for k in range(16):
        cx = -10 + k * 9 + g.normal(0, 3)
        cy = -4 + g.random() * 14 + max(0, k - 9) * 1.5
        copa(c, cx, cy, 12 + g.random() * 6, FOLHA_DOSSEL, luz, seed=1300 + k, dens=0.65, escuro=0.05)
    # ramos pendentes do salgueiro, em cachos: fios finos com folhinhas alternadas, compridos e desiguais
    xc = 2.0
    while xc < 150:
        n = 2 + int(g.random() * 4)
        y0 = 8 + g.random() * 16
        base_comp = (22 + g.random() * 40) * (1 - max(0.0, xc - 90) / 110)
        for f in range(n):
            x = xc + f * 1.6 + g.normal(0, 0.5)
            comp = base_comp * (0.6 + g.random() * 0.5)
            fase = g.random() * 6
            for j in range(int(comp)):
                t = j / comp
                xx = x + math.sin(j / 11 + fase) * 1.4 * t + t * t * 2
                yy = y0 + j
                c.p(xx, yy, FOLHA_DOSSEL[2 if j % 3 else 1])
                if j % 2 == 0 and t < 0.97:
                    lado = 1 if (j // 2) % 2 else -1
                    tom = FOLHA_DOSSEL[int(np.clip(3 + (lado < 0) + (j % 7 == 0) - t * 1.5, 1, 6))]
                    c.p(xx + lado, yy, tom)
                    if t < 0.7 and j % 4 == 0:
                        c.p(xx + lado * 2, yy + 1, FOLHA_DOSSEL[3])
        xc += 7 + g.random() * 8
    # copa da direita e o galho que avança sobre o canto de cima
    for (cx, cy, r, s_) in ((468, 10, 20, 1), (446, -2, 16, 2), (480, 40, 14, 3), (430, 4, 10, 4), (458, 30, 11, 5)):
        copa(c, cx, cy, r, FOLHA_DOSSEL, luz, seed=1400 + s_, dens=0.62, brilho=0.06)
    for k in range(60):
        t = k / 60
        xx = 462 - t * 52
        yy = 20 + t * 6 - math.sin(t * 3) * 3
        for e in range(int(3 - t * 2) + 1):
            c.p(xx, yy + e, CASCA[5 if e == 0 else 2])
        if k % 12 == 6:
            copa(c, xx, yy + 3, 4 + g.random() * 2, FOLHA_DOSSEL, luz, seed=1500 + k, dens=0.9, brilho=0.1)
    return c


def pintar_frente(nome: str, per: dict) -> Camada:
    """Taboas e folhas muito perto da câmera, nos cantos de baixo (saem desfocadas)."""
    c = Camada()
    luz = per["luz"]
    g = np.random.default_rng(51)
    for (cx, cy, r, s) in ((-6, 202, 28, 1), (34, 214, 20, 2), (486, 200, 28, 3), (446, 214, 18, 4)):
        copa(c, cx, cy, r, FOLHA_PERTO, luz, seed=900 + s, dens=0.5, escala=2)
    for _ in range(90):
        x = g.random() * W
        if 80 < x < 410:
            continue
        alt = 12 + int(g.random() * 26)
        curva = (g.random() - 0.5) * 0.6
        for j in range(alt):
            c.p(x + curva * j * j / alt, H - 1 - j, FOLHA_PERTO[2 + (j > alt // 2) + (j > alt * 0.8)])
            c.p(x + 1 + curva * j * j / alt, H - 1 - j, FOLHA_PERTO[1])
        if g.random() < 0.35:
            hx = x + curva * alt
            c.ret(hx, H - alt - 7, 2, 7, "#3a2012")
            c.p(hx + 1, H - alt - 6, "#5a3420")
    return c


# ─────────────────────────────── A água (reflexo) ───────────────────────────────
def deslocamento_ondas(seed: int = 501) -> np.ndarray:
    """Deslocamento horizontal (em pixels da arte, inteiro) de cada trecho de linha da água: a ondulação."""
    S0 = Y0
    prof = np.clip((YA - S0) / 70, 0, 1)
    n1 = ruido_ret(seed, 34, 1.0)
    n2 = ruido_ret(seed + 1, 11, 1.0)
    amp = 0.25 + prof * 1.9
    return np.round(((n1 - 0.5) * 1.8 + (n2 - 0.5) * 0.7) * amp).astype(np.int32)


def pintar_agua(nome: str, per: dict, fundo: np.ndarray, agua: np.ndarray, S: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Água em alta resolução: o fundo iluminado espelhado na outra margem, com ondulação em degraus de pixel,
    cristas e cavados, transparência rasa na beira e o caminho de brilho do astro. Devolve (imagem, cristas, dx)."""
    Hh, Wh = H * ESC, W * ESC
    dx = deslocamento_ondas()
    DX = ampliar(dx[:, :, None])[:, :, 0] * ESC
    Y = GY.astype(np.int32)
    X = GX.astype(np.int32)
    src_y = np.clip(2 * Y0 * ESC - 1 - Y, 0, Hh - 1)
    src_x = np.clip(X + DX, 0, Wh - 1)
    refl = fundo[src_y, src_x]
    teto = {"manha": 0.86, "tarde": 0.95, "noite": 1.4}[nome]
    refl = teto * (1 - np.exp(-refl / teto))          # o espelho d'água nunca devolve o clarão inteiro
    # o reflexo estica na vertical perto da câmera (ondas mais largas)
    prof_h = np.clip((GYa - Y0) / 70, 0, 1)[:, :, None]
    esticado = _caixa(refl, 4, 0)
    esticado = _caixa(esticado, 4, 0)
    refl = refl * (1 - prof_h * 0.7) + esticado * prof_h * 0.7
    a_cl, a_me, a_es = (hexa(c) for c in per["agua"])
    prof_a = np.clip((YA - Y0) / np.maximum(S[None, :] - Y0, 1), 0, 1)
    corpo = a_me * (1 - prof_a[:, :, None]) + a_es * prof_a[:, :, None]
    k_refl = per["refl"] - prof_a * 0.32
    k_refl = ampliar(k_refl[:, :, None])
    img = refl * k_refl + ampliar(corpo) * (1 - k_refl)
    # cristas (claras) e cavados (escuros), linhas de 1 pixel da arte
    ondas = ruido_ret(503, 11, 1.0)
    ondas2 = ruido_ret(504, 5, 1.0)
    par = (YA.astype(np.int32) % 2 == 0)
    crista = ((ondas > 0.76 - prof_a * 0.06) & par & (ondas2 > 0.42)) & agua
    cavado = (ondas < 0.2) & agua & ~par
    ceu_hz = hexa(per["ceu"][2]) if nome != "noite" else hexa("#2a3c78")
    cr_h = ampliar(crista[:, :, None].astype(np.float32))
    cv_h = ampliar(cavado[:, :, None].astype(np.float32))
    img = img * (1 - cr_h * 0.35) + (img * 0.6 + ceu_hz * 0.7) * cr_h * 0.35
    img = img * (1 - cv_h * 0.16)
    # beira rasa: o fundo de areia aparece um pouco (de dia) e a linha de espuma
    d_beira = S[None, :] - YA
    raso = np.clip(1 - d_beira / 5, 0, 1) * agua
    cor_raso = hexa("#8a7a5a") if nome == "manha" else hexa("#7a5a4a") if nome == "tarde" else hexa("#1a2030")
    img = img * (1 - ampliar(raso[:, :, None]) * 0.3) + cor_raso * ampliar(raso[:, :, None]) * 0.3
    espuma = agua & (d_beira <= 1.5) & (ruido_ret(505, 3, 1.0) > 0.4)
    cor_esp = {"manha": "#f4f8f4", "tarde": "#ffe0c0", "noite": "#6a7ab0"}[nome]
    e_h = ampliar(espuma[:, :, None].astype(np.float32))
    img = img * (1 - e_h * 0.55) + hexa(cor_esp) * e_h * 0.55
    # a outra margem encosta na água com uma linha escura
    linha = ampliar(agua[:, :, None].astype(np.float32))[Y0 * ESC:Y0 * ESC + 2]
    img[Y0 * ESC:Y0 * ESC + 2] *= np.where(linha > 0.5, 0.55, 1.0)
    return img.astype(np.float32), crista, dx


def caminho_de_brilho(nome: str, agua: np.ndarray, cx: float, larg0: float, abre: float, dens: float, seed: int) -> np.ndarray:
    """O caminho de brilho do sol ou da lua na água: tracinhos horizontais numa coluna que alarga para perto."""
    g = np.random.default_rng(seed)
    m = np.zeros((H, W), np.float32)
    for y in range(Y0 + 1, H):
        w = larg0 + (y - Y0) * abre
        for _ in range(int(3 + w * 0.9)):
            x = cx + g.normal(0, w)
            k = math.exp(-((x - cx) / w) ** 2 * 0.8)
            if g.random() > k * dens:
                continue
            comp = 1 + int(g.random() * (2 + (y - Y0) * 0.06))
            for i in range(comp):
                xi = int(x) + i
                if 0 <= xi < W and agua[y, xi]:
                    m[y, xi] = max(m[y, xi], k * (0.6 + g.random() * 0.4))
    return m


def reflexo_objetos(img: np.ndarray, alfa: np.ndarray, base: np.ndarray, agua_vis: np.ndarray, dx: np.ndarray,
                    tint: np.ndarray, k: float) -> np.ndarray:
    """Espelha cada pixel de objeto (já iluminado) na sua própria linha d'água, com a mesma ondulação da água;
    o reflexo é um pouco mais escuro, puxa para a cor da água e sai levemente borrado (a água nunca é espelho perfeito)."""
    a_h = ampliar(alfa[:, :, None])[:, :, 0]
    b_h = ampliar(base[:, :, None])[:, :, 0]
    ys, xs = np.nonzero((a_h > 0.45) & (b_h > 0))
    if len(xs) == 0:
        return img
    Yt = (2 * b_h[ys, xs] * ESC - ys - 1).astype(np.int32)
    ok = (Yt >= 0) & (Yt < H * ESC)
    ys, xs, Yt = ys[ok], xs[ok], Yt[ok]
    Xt = np.clip(xs + dx[Yt // ESC, xs // ESC] * ESC, 0, W * ESC - 1)
    dist = Yt - (2 * b_h[ys, xs] * ESC - ys)
    ordem = np.argsort(-dist)
    ys, xs, Yt, Xt = ys[ordem], xs[ordem], Yt[ordem], Xt[ordem]
    buf = np.zeros_like(img)
    m = np.zeros(img.shape[:2], np.float32)
    buf[Yt, Xt] = img[ys, xs]
    m[Yt, Xt] = 1
    # some aos poucos com a distância da linha d'água
    queda = np.clip(1 - (Yt - (2 * b_h[ys, xs] * ESC - ys)) / (60 * ESC), 0.4, 1)
    m[Yt, Xt] *= queda
    buf = desfocar(buf * m[:, :, None], 1.2)
    mb = desfocar(m[:, :, None], 1.2)
    cor = buf / np.maximum(mb, 1e-4)
    mb = mb[:, :, 0] * agua_vis
    cor = cor * 0.78 + tint * 0.22
    return img * (1 - (mb * k)[:, :, None]) + cor * (mb * k)[:, :, None]


# ─────────────────────────────── Montagem com luz ───────────────────────────────
def montar(nome: str) -> Image.Image:
    per = PERIODOS[nome]
    fx, fy = FOGO
    S = margem()
    agua = mascara_agua(S)
    BRASA["k"] = {"manha": 0.4, "tarde": 0.8, "noite": 1.0}[nome]

    ceu = ampliar(pintar_ceu(nome, per))
    montes, morros = pintar_montes(nome, per)
    mata, janelas = pintar_mata_longe(nome, per)
    chao = pintar_chao(nome, per, S, agua)
    cais = pintar_cais(nome, per)
    obj = pintar_margem_obj(nome, per, S)
    base_arv = np.full((H, W), -1, dtype=np.float32)
    arvores = pintar_arvores(nome, per, base_arv)
    frente = pintar_frente(nome, per)

    # ── 1. o fundo (céu, montanhas, morros, mata da outra margem), iluminado e com névoa por distância
    amb = hexa(per["amb"]) * per["amb_k"]
    sol = hexa(per["sol"]) * per["sol_k"]
    nev = hexa(per["nevoa"]) * per["nevoa_k"]
    img = ceu.copy()
    for cam, r, k_nev, k_sol in ((montes.c, 1.8, 0.42, 0.85), (morros.c, 1.2, 0.26, 0.7), (mata.c, 0.7, 0.12, 0.6)):
        a = desfocar_rgba(ampliar(cam), r)
        al = a[:, :, 3:4]
        lit = a[:, :, :3] * (amb + sol * k_sol)
        if nome == "tarde":     # contraluz: o que está perto do sol no horizonte some no clarão
            clarao = luz_pontual(*ASTRO["tarde"], 120, 0.5)[:, :, None]
            lit = lit * (1 - clarao * 0.5) + hexa("#ff9a6a") * clarao * 0.35
        lit = lit * (1 - k_nev) + nev * k_nev
        img = img * (1 - al) + lit * al
    # luz de recorte na crista das montanhas (sol de lado, contraluz ou luar)
    crista_m = (montes.c[:, :, 3] > 0.5) & ~(np.roll(montes.c[:, :, 3], 1, 0) > 0.5)
    crista_m[0] = False
    rc = desfocar(ampliar(crista_m[:, :, None].astype(np.float32)), 1.2)
    cor_rc = {"manha": ("#fff4dc", 0.25), "tarde": ("#ffc890", 0.45), "noite": ("#a8b8ff", 0.12)}[nome]
    perto_astro = luz_pontual(*ASTRO["tarde"], 140, 0.6)[:, :, None] if nome == "tarde" else 1.0
    img += rc * hexa(cor_rc[0]) * cor_rc[1] * perto_astro
    if nome != "manha":   # a janela da cabana acesa
        for (wx, wy) in janelas:
            X, Y = wx * ESC, wy * ESC
            img[Y:Y + 2 * ESC, X:X + 2 * ESC] = hexa("#ffd27a") * (1.4 if nome == "noite" else 1.0)
        jan = np.zeros((H, W, 1), np.float32)
        for (wx, wy) in janelas:
            jan[wy, wx] = 1
        img += desfocar(ampliar(jan), 6) * hexa("#ffb050") * (3.0 if nome == "noite" else 1.6)
    fundo = img.copy()

    # ── 2. a água: o fundo espelhado, com ondas, e o caminho de brilho do astro
    ag_h = ampliar(agua[:, :, None].astype(np.float32))[:, :, 0] > 0.5
    agua_img, crista, dx = pintar_agua(nome, per, fundo, agua, S)
    img = np.where(ag_h[:, :, None], agua_img, img)

    # ── 3. a margem de cá, o cais e os objetos: albedo com a luz calculada por pixel
    planos = [  # (camada, desfoque, recebe sol, recebe fogo)
        (chao.c, 0.0, 1.0, 1.0),
        (cais.cam.c, 0.0, 0.9, 0.8),
        (obj.cam.c, 0.0, 1.0, 1.0),
        (arvores.c, 0.6, 0.55, 0.6),
    ]
    alb = np.zeros((H * ESC, W * ESC, 3), np.float32)
    solido = np.zeros((H * ESC, W * ESC), np.float32)
    m_sol = np.zeros_like(solido)
    m_fogo = np.zeros_like(solido)
    for cam, r, so, fo in planos:
        a = desfocar_rgba(ampliar(cam), r)
        al = a[:, :, 3]
        alb = alb * (1 - al[:, :, None]) + a[:, :, :3] * al[:, :, None]
        solido = solido * (1 - al) + al
        m_sol = m_sol * (1 - al) + so * al
        m_fogo = m_fogo * (1 - al) + fo * al

    # sombras projetadas: do sol (manhã de lado, tarde em contraluz) e do braseiro
    alfa_t = np.maximum(obj.cam.c[:, :, 3], cais.cam.c[:, :, 3] * (cais.base > 0))
    base_t = np.where(obj.cam.c[:, :, 3] > 0.4, obj.base, cais.base)
    if per["sombra"] == "contraluz":
        sx0 = ASTRO["tarde"][0]
        vetor = lambda xs, b: ((xs - sx0) * 0.022, np.full_like(xs, 0.95))   # noqa: E731  (sombras vêm para a câmera)
    else:
        vetor = per["sombra"]
    terra_m = (YA >= S[None, :]).astype(np.float32)
    if vetor is not None:
        s_obj = projetar_sombra(obj.cam.c[:, :, 3], obj.base, vetor)
        s_arv = projetar_sombra(arvores.c[:, :, 3], base_arv, vetor)
        sombra_sol = np.maximum(s_obj, s_arv) * terra_m * (obj.cam.c[:, :, 3] < 0.5)
    else:
        sombra_sol = np.zeros((H, W), np.float32)

    def do_fogo(xs, b):
        vx, vy = xs - fx, b - fy
        n = np.maximum(np.hypot(vx, vy * 2.6), 1)
        k = np.clip(n / 24, 0.4, 2.4)
        return vx / n * k, vy / n * k * 0.45

    sombra_fogo = projetar_sombra(obj.cam.c[:, :, 3], obj.base, do_fogo) * terra_m * (obj.cam.c[:, :, 3] < 0.5)
    sombra_fogo[fy - 12:fy + 13, fx - 20:fx + 21] = 0      # o braseiro e a lenha não sombreiam a própria plataforma
    sombra_sol = desfocar(ampliar(sombra_sol[:, :, None]), 2.2)[:, :, 0]
    sombra_fogo = desfocar(ampliar(sombra_fogo[:, :, None]), 3.5)[:, :, 0]
    # oclusão de contato no pé dos objetos e embaixo do braseiro
    pe = (alfa_t > 0.4) & (base_t >= 0) & (np.abs(YA - base_t) < 3)
    ao = pe.astype(np.float32)
    ao = np.maximum(ao, elipse(240, 156, 15, 2.5).astype(np.float32) * 0.9)
    ao = desfocar(ampliar(ao[:, :, None]), 4)[:, :, 0] * (1 - ampliar(alfa_t[:, :, None])[:, :, 0] * 0.7)

    folhas = ruido(61, 7) * 0.6 + ruido(62, 3) * 0.4
    salpico = desfocar(ampliar((np.floor(suave(0.38, 0.6, folhas) * 3.99) / 3)[:, :, None]), 0.8)[:, :, 0]
    if nome == "manha":
        lado = suave(40, 230, GXa)                      # a sombra do salgueiro cobre a esquerda
        mapa_sol = (0.3 + lado * 0.85) * (0.75 + 0.25 * salpico)
        mapa_sol = np.maximum(mapa_sol, luz_em_degraus(270, 150, 130, 0.42, 11) * 1.05)
    elif nome == "tarde":
        mapa_sol = 0.42 + luz_em_degraus(292, 150, 120, 0.35, 12) * 0.55     # luz rasante do pôr do sol
        mapa_sol = mapa_sol * (0.8 + 0.2 * salpico)
    else:
        mapa_sol = (0.45 + 0.25 * suave(120, 420, GXa)) * (0.7 + 0.3 * salpico)
    mapa_sol = mapa_sol * (1 - sombra_sol * 0.9)
    luz = amb * (1 - ao[:, :, None] * 0.6) + sol * (mapa_sol * m_sol)[:, :, None]
    # braseiro: poça em degraus, miolo forte, e bloqueio pelas sombras dos objetos
    fk = per["fogo_k"]
    fogo = luz_em_degraus(fx, fy - 4, 126, 0.52, 21, 7)[:, :, None] * hexa("#ff8a3a") * 1.35
    fogo += luz_pontual(fx, fy - 6, 38, 0.8)[:, :, None] * hexa("#ffd890") * {"manha": 0.35, "tarde": 0.8, "noite": 0.6}[nome]
    fogo = fogo * (1 - sombra_fogo * 0.85)[:, :, None]
    luz = luz + fogo * fk * m_fogo[:, :, None]
    lk = per["lamp_k"]
    luzes = cais.luzes + obj.luzes
    for (lx_, ly_, cor, raio, k) in luzes:
        luz = luz + luz_em_degraus(lx_, ly_, raio, 0.75, int(lx_), 5)[:, :, None] * hexa(cor) * k * lk * m_fogo[:, :, None]
    lit = alb * luz
    sol_ = solido[:, :, None]
    img = img * (1 - sol_) + lit * sol_

    # luz de recorte: bordas viradas para a luz acendem (de lado de manhã, por trás à tarde, luar à noite)
    alto_a = np.maximum.reduce([cais.cam.c[:, :, 3], obj.cam.c[:, :, 3], arvores.c[:, :, 3]]) > 0.5
    ddx, ddy = {"manha": (-1, 0), "tarde": (0, -1), "noite": (1, -1)}[nome]
    viz = np.roll(np.roll(alto_a, -ddy, 0), -ddx, 1)
    viz[:2, :] = True
    viz[-2:, :] = True
    viz[:, :2] = True
    viz[:, -2:] = True
    recorte = desfocar(ampliar((alto_a & ~viz).astype(np.float32)[:, :, None]), 0.8)[:, :, 0]
    k_rec, cor_rec = {"manha": (0.55, "#ffe6b0"), "tarde": (1.15, "#ffb060"), "noite": (0.45, "#8aa8ff")}[nome]
    alcance = {"manha": suave(20, 200, GXa), "tarde": luz_pontual(290, 90, 200, 0.7), "noite": suave(100, 420, GXa)}[nome]
    img += (recorte * alcance)[:, :, None] * hexa(cor_rec) * k_rec

    # ── emissivos: vidro das lanternas e brasas, com halo
    em = ampliar(cais.emissivo.c)
    em2 = ampliar(obj.emissivo.c)
    k_em = {"manha": 0.45, "tarde": 0.85, "noite": 1.5}[nome]
    for e_ in (em, em2):
        img = img * (1 - e_[:, :, 3:4] * min(1, k_em)) + e_[:, :, :3] * e_[:, :, 3:4] * k_em
        brilho = e_[:, :, :3] * e_[:, :, 3:4]
        img += (desfocar(brilho, 6) * 1.2 + desfocar(brilho, 22) * 1.3) * k_em * 0.5

    # ── reflexo dos objetos que estão na água (cais, estacas, barco, lanternas) e dos brilhos delas
    agua_vis = ag_h & (solido < 0.5)
    tint = hexa(per["agua"][1])
    img = reflexo_objetos(img, cais.cam.c[:, :, 3] * (cais.base > 0), cais.base, agua_vis, dx, tint, 0.78)
    # brilho das lanternas riscado na água, abaixo de cada uma
    ond = ruido_ret(506, 4, 1.0)
    risco = np.zeros((H, W), np.float32)
    for (lx_, ly_, cor, raio, k) in cais.luzes:
        yr = 2 * CAIS_AGUA - ly_
        for y in range(CAIS_AGUA + 1, H):
            peso = math.exp(-((y - yr) / 8) ** 2) * 0.8 + 0.3 * math.exp(-((y - yr) / 22) ** 2)
            if peso < 0.04:
                continue
            for x in range(int(lx_) - 8, int(lx_) + 9):
                if 0 <= x < W and agua[y, x]:
                    xo = x - dx[y, x] * 0.7
                    lateral = math.exp(-((xo - lx_) / (1.3 + (y - CAIS_AGUA) * 0.07)) ** 2)
                    traco = (ond[y, x] > 0.5) and (y % 2 == 0)
                    risco[y, x] += peso * lateral * (0.25 + 0.95 * traco)
    risco = ampliar(risco[:, :, None]) * ag_h[:, :, None] * (solido < 0.5)[:, :, None]
    k_risco = {"manha": 0.35, "tarde": 0.9, "noite": 1.6}[nome]
    img += risco * hexa("#ffc070") * k_risco
    img += desfocar(risco, 5) * hexa("#ff9a40") * k_risco * 0.3
    # o braseiro e o lampião do barril acendem as cristas da água perto da margem
    cr_h = ampliar(crista[:, :, None].astype(np.float32))[:, :, 0] * agua_vis
    quente = (luz_pontual(240, 132, 70, 0.55) * fk * 0.9 + luz_pontual(380, 158, 40, 0.6) * lk * 0.6 +
              luz_pontual(204, 136, 40, 0.6) * lk * 0.6)
    img += (cr_h * quente)[:, :, None] * hexa("#ffb060") * 0.9
    img += (agua_vis * quente * 0.25)[:, :, None] * hexa("#ff8a3a") * 0.4

    # caminho de brilho do sol (tarde) e da lua (noite); de manhã, o céu claro faz cintilar a água toda
    if nome == "tarde":
        cam_b = caminho_de_brilho(nome, agua, ASTRO["tarde"][0], 1.5, 0.3, 0.75, 71)
        cb = ampliar(cam_b[:, :, None]) * agua_vis[:, :, None]
        img += cb * hexa("#fff0c0") * 0.95 + desfocar(cb, 4) * hexa("#ffb060") * 0.5
    elif nome == "noite":
        cam_b = caminho_de_brilho(nome, agua, ASTRO["noite"][0], 1.2, 0.16, 0.7, 72)
        cb = ampliar(cam_b[:, :, None]) * agua_vis[:, :, None]
        img += cb * hexa("#e0e8ff") * 0.75 + desfocar(cb, 4) * hexa("#8aa0ff") * 0.3
    else:
        cam_b = caminho_de_brilho(nome, agua, 250, 60, 0.0, 0.18, 73)
        cb = ampliar(cam_b[:, :, None]) * agua_vis[:, :, None]
        img += cb * hexa("#fffaf0") * 0.55

    # ── névoa: de manhã, bancos baixos sobre o lago; à tarde, bruma rosada; à noite, um véu azul na outra margem
    nb = ruido_ret(510, 48, 4) * 0.6 + ruido_ret(511, 16, 2) * 0.4
    if nome == "manha":
        faixa = np.exp(-((YA - 90) / 9) ** 2) * 1.0 + np.exp(-((YA - 118) / 12) ** 2) * 0.55 * (XA < 330)
        dens = np.clip((nb - 0.32) * 2.2, 0, 1) * faixa
        cor_n = hexa("#f6efe2")
        k_n = 0.72
    elif nome == "tarde":
        faixa = np.exp(-((YA - 86) / 6) ** 2)
        dens = np.clip((nb - 0.35) * 2.0, 0, 1) * faixa
        cor_n = hexa("#ffb898")
        k_n = 0.45
    else:
        faixa = np.exp(-((YA - 86) / 7) ** 2)
        dens = np.clip((nb - 0.38) * 2.0, 0, 1) * faixa
        cor_n = hexa("#3a4a88")
        k_n = 0.45
    dens = np.floor(dens * 6 + BAYER_HW * 0.8) / 6          # bancos de névoa em degraus de pixel art
    dens = desfocar(ampliar(np.clip(dens, 0, 1)[:, :, None]), 3)[:, :, 0] * (1 - solido)
    if nome == "manha":
        pass
        cor_n = cor_n * (1 + luz_pontual(60, 70, 260, 0.6)[:, :, None] * 0.25)
    img = img * (1 - dens[:, :, None] * k_n) + cor_n * dens[:, :, None] * k_n

    # ── feixes de luz volumétricos e poeira
    vis_ceu = ((GYa < Y0) & (np.abs(img - ceu).sum(2) < 0.02)).astype(np.float32)
    poe = ampliar(ruido(81, 4)[:, :, None])[:, :, 0]
    if nome == "manha":
        raios = raios_de_luz(vis_ceu * suave(0, 120, GYa), (-70, -60), passos=80, alcance=0.95)
        raios = desfocar(raios[:, :, None], 5)[:, :, 0]
        img += raios[:, :, None] * hexa("#ffe6b0") * 0.9
        f = (facho(100, 8, 196, 126, 5, 22, 1.6) * 0.7 + facho(150, 4, 330, 104, 4, 16, 1.6) * 0.55 +
             facho(80, 20, 150, 112, 3, 10, 1.5) * 0.4 + facho(190, 0, 400, 98, 3, 12, 1.5) * 0.35)
        f = f * np.clip(1.25 - GYa / 160, 0, 1) * (0.55 + 0.7 * poe)
        f = desfocar(f[:, :, None], 2.5)[:, :, 0]
        img += f[:, :, None] * hexa("#ffe6a8") * 0.6
        cor_poeira, peso_poeira = "#fff4d0", f * 2.0
    elif nome == "tarde":
        ax, ay = ASTRO["tarde"]
        brilho = np.exp(-np.hypot(GXa - ax, (GYa - ay) * 1.2) / 7)
        raios = raios_de_luz((vis_ceu * (0.3 + brilho * 1.2)).astype(np.float32), (ax, ay), passos=90, alcance=0.97, queda=0.975)
        raios = desfocar(raios[:, :, None], 4)[:, :, 0] * suave(9, 46, np.hypot(GXa - ax, (GYa - ay) * 1.3))
        img += raios[:, :, None] * hexa("#ffb070") * 1.3
        f = facho(ax, ay, ax, 150, 3, 40, 1.2) * 0.35 * (GYa > ay)
        f = desfocar(f[:, :, None], 4)[:, :, 0] * (0.55 + 0.6 * poe)
        img += f[:, :, None] * hexa("#ffb468") * 0.35
        cor_poeira, peso_poeira = "#ffd8a0", (f * 2.5 + raios * 0.5) * (GYa > 60)
    else:
        ax, ay = ASTRO["noite"]
        f = facho(ax, ay, ax - 10, 150, 6, 40, 1.2) * np.clip(1.1 - GYa / 190, 0, 1) * (0.6 + 0.5 * poe)
        f = desfocar(f[:, :, None], 4)[:, :, 0]
        img += f[:, :, None] * hexa("#7a9ae8") * 0.16
        cor_poeira, peso_poeira = "#c8d8ff", f * 0.8
    g = np.random.default_rng(83)
    rgbp = hexa(cor_poeira)
    for _ in range(1400):
        X, Y = int(g.random() * (W * ESC - 4)), int(g.random() * (H * ESC - 4))
        k = peso_poeira[Y, X] * (0.3 + g.random() * 0.8)
        if k > 0.05:
            tam = 2 if g.random() < 0.7 else 3
            img[Y:Y + tam, X:X + tam] += rgbp * k
    # brilhos na água (estrelinhas de 4 pontas) nos pontos mais claros do reflexo
    gb = np.random.default_rng(85)
    kb = {"manha": 0.8, "tarde": 1.0, "noite": 0.5}[nome]
    lum_ag = img.mean(2) * agua_vis
    cand = np.argwhere(lum_ag[::ESC, ::ESC] > np.percentile(lum_ag[::ESC, ::ESC][agua], 97))
    gb.shuffle(cand)
    for (yy, xx) in cand[:9]:
        X, Y = int(xx * ESC + 1), int(yy * ESC + 1)
        for d in range(-6, 7):
            k = (1 - abs(d) / 7) ** 2 * kb
            if 0 <= Y + d < H * ESC and 0 <= X + d < W * ESC:
                img[Y + d, X] += k
                img[Y, X + d] += k
    # garças de manhã voando baixo; folhas soltas na tarde
    if nome == "manha":
        for (x, y) in ((168, 54), (182, 49)):
            X, Y = x * ESC, y * ESC
            for (ddx_, ddy_) in ((0, 0), (1, -1), (2, 0), (-1, -1), (3, -1)):
                img[Y + ddy_ * ESC:Y + (ddy_ + 1) * ESC, X + ddx_ * ESC:X + (ddx_ + 1) * ESC] = hexa("#f4f0e6") * 0.95
    # vaga-lumes (só à noite), com o reflexo na água
    if nome == "noite":
        gv = np.random.default_rng(17)
        vl = np.zeros((H * ESC, W * ESC), np.float32)
        n = 0
        while n < 34:
            x, y = 150 + gv.random() * 320, 96 + gv.random() * 80
            if any(x0 - 3 <= x <= x1 + 3 and y0 - 3 <= y <= y1 + 3 for (x0, y0, x1, y1) in LIVRE.values()):
                continue
            k = 0.5 + gv.random() * 0.6
            X, Y = int(x * ESC), int(y * ESC)
            vl[Y:Y + 3, X:X + 3] += k
            h = 3 + gv.random() * 6
            yr = int((y + 2 * h) * ESC)
            if yr < H * ESC - 3 and agua_vis[yr, X] and agua[int(y), int(x)]:
                vl[yr:yr + 2, X - 1:X + 4] += k * 0.4
            n += 1
        img += vl[:, :, None] * hexa("#e8ffb0") * 1.2
        img += desfocar(vl[:, :, None], 5) * hexa("#a8ff60") * 1.6
        img += desfocar(vl[:, :, None], 14) * hexa("#80d040") * 0.9

    # ── primeiro plano desfocado e escuro
    fr = desfocar_rgba(ampliar(frente.c), 9)
    k_fr = {"manha": 0.5, "tarde": 0.38, "noite": 0.3}[nome]
    img = sobre(img, fr * np.array([k_fr, k_fr, k_fr * 1.05, 1], dtype=np.float32))

    # ── acabamento: brilho, curva de tom, cor, área calma do texto, vinheta e grão
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
    calma = ((1 - suave(0.28, 0.44, xn)) * (1 - 0.35 * suave(0.5, 0.9, yn)))[:, :, None]
    canto = ((1 - suave(0.22, 0.4, xn)) * suave(0.6, 0.85, yn))[:, :, None]
    media = desfocar(np.clip(img, 0, 1.2), 16)
    img = media + (img - media) * (1 - 0.38 * calma)
    img *= 1 - 0.16 * calma - 0.12 * canto
    v = (xn - 0.52) ** 2 * 1.3 + (yn - 0.58) ** 2 * 1.6
    img *= (1 - np.clip(v - 0.08, 0, 1) * {"manha": 1.3, "tarde": 1.15, "noite": 1.1}[nome])[:, :, None]
    gg = np.random.default_rng(99)
    img += (gg.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.014
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


PONTOS = {
    "gato": [
        {"x": 222, "y": 153, "pose": "fogueira"},
        {"x": 176, "y": 148, "pose": "repouso"},
        {"x": 318, "y": 122, "pose": "sentado"},
        {"x": 330, "y": 92, "pose": "observando"},
        {"x": 262, "y": 168, "pose": "repouso"},
        {"x": 290, "y": 172, "pose": "sentado"},
    ],
    "coruja": [
        {"x": 320, "y": 95},
        {"x": 358, "y": 96},
        {"x": 342, "y": 160},
        {"x": 186, "y": 135},
        {"x": 177, "y": 111},
    ],
    "particulas": "vagalumes",
}


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    nomes = [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS)
    for nome in nomes:
        t0 = time.time()
        img = montar(nome)
        img.save(PASTA / f"cena-cais-{nome}.webp", quality=84, method=6)
        img.resize((960, 400), Image.LANCZOS).save(PASTA / f"cena-cais-{nome}-960.webp", quality=82, method=6)
        print(nome, (PASTA / f"cena-cais-{nome}.webp").stat().st_size // 1024, "KB",
              (PASTA / f"cena-cais-{nome}-960.webp").stat().st_size // 1024, "KB", f"{time.time() - t0:.1f}s")
    (Path(__file__).resolve().parent / "cena-cais.json").write_text(json.dumps(PONTOS, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
