"""A estrada até o castelo da prova: o cenário "HD-2D" do topo do cronograma (10/11/2026).

Arte original feita por código (numpy + PIL), sem nada baixado nem gerado por IA de imagem. Substitui a Torre do Tempo
(scripts/gerar_cena_cronograma.py), que o Tales recusou: "o castelo está flutuando em cima de uma montanha".

Uma paisagem só, com a mesma geometria nas três horas do dia (pixels da arte, 480 x 200):
- x 0-190: céu limpo e a encosta arborizada em sombra (fundo calmo do texto);
- x 212-400: o platô de rocha com o castelo da prova assentado em cima (muralha que acompanha o terreno, contrafortes,
  fundação que entra na rocha, portão com rampa de pedra, torres de alturas diferentes, estandartes verde e ouro);
- a estrada sai do primeiro plano, passa pela bifurcação com a placa de madeira, cruza a ponte de pedra em arco sobre o
  riacho, contorna a margem e sobe o platô em zigue-zague até o portão;
- x 350-480: a vila com a Torre do Relógio (mostrador sem letras nem algarismos, sino no campanário) e casas enxaimel.
No celular a página mostra a faixa de x 192 a 480 (40% a 100%).

Saída em public/pixel/cronograma/:
- estrada-prova-<manha|tarde|noite>.webp (1440 x 600) e -960.webp (960 x 400): o fundo, sem o sino e sem os estandartes
  das torres (que balançam por cima);
- estrada-prova-sino-<hora>.png e estrada-prova-estandarte-<hora>.png: recortes com a luz da hora;
- scripts/cenarios/cronograma-estrada.json: as âncoras em pixels da arte de 1440 x 600.
Uso: <python com numpy e pillow> scripts/cenarios/cronograma_estrada.py [manha|tarde|noite]
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import gerar_cena_cronograma as t  # noqa: E402  (pincéis da torre; ajusta a vila para 480 x 200 na importação)

v = t.v
W, H, ESC = 480, 200, 3
_YS, _XS, _GYS, _GXS = t._YS, t._XS, t._GYS, t._GXS
Camada, Montagem, hexa, mistura, hash01, ruido = t.Camada, t.Montagem, t.hexa, t.mistura, t.hash01, t.ruido
elipse_m, poligono_m, desfocar, ampliar, curva = t.elipse_m, t.poligono_m, t.desfocar, t.ampliar, t.curva
raios_radiais, sombra_projetada, remapear, apagar = t.raios_radiais, t.sombra_projetada, t.remapear, t.apagar
ceu_hora, mapa_sol, nevoa, suave_np, lampiao, cantaria, cornija = t.ceu_hora, t.mapa_sol, t.nevoa, t.suave_np, t.lampiao, t.cantaria, t.cornija

PASTA = RAIZ / "public" / "pixel" / "cronograma"
ANCORAS = Path(__file__).resolve().parent / "cronograma-estrada.json"
PERIODOS = ("manha", "tarde", "noite")
P = "tarde"
SOL = {"manha": (214, 70), "tarde": (236, 103), "noite": (224, 30)}

# A torre do relógio da vila.
CX = 422
XA, XB, LADO = CX - 17, CX + 17, 9
TOPO, BASE = 54, 184
RELOGIO = (CX, 107, 13)
SINO_TOPO = (CX, 66)
# Âncoras (pixels da arte pequena; viram 3x no JSON).
ANC: dict = {"lampioes": [], "janelas": [], "chamines": [], "estandartes": []}

PL = ["#f6e8c8", "#e6d2ae", "#d0ba94", "#b8a284"]  # pedra do castelo na luz
PS = ["#a39084", "#877872", "#6c5e66", "#544a5a"]  # e na sombra
TEL = ["#8aaab8", "#64879a", "#486a82", "#324e68", "#22364e"]  # ardósia dos telhados
VERDE = ["#2a8a74", "#17675B", "#0C3C34"]
OURO = "#E4B85C"


def marcar(c: Camada, m, cor, a: float = 1.0) -> None:
    c.mascara(np.asarray(m, dtype=np.float32), cor, a)


def copia(c: Camada) -> Camada:
    n = Camada()
    n.c = c.c.copy()
    return n


def atmosfera(c: Camada, cor, k, mult: float = 1.0) -> None:
    """Perspectiva aérea: puxa a camada para a cor do ar (k pode ser um mapa H x W)."""
    kk = k[:, :, None] if isinstance(k, np.ndarray) else k
    c.c[:, :, :3] = c.c[:, :, :3] * mult * (1 - kk) + hexa(cor) * kk


def ocultar(e: Camada, *frentes: Camada) -> Camada:
    """Tira de uma camada de luz o que fica atrás das camadas da frente."""
    n = copia(e)
    for f in frentes:
        n.c[:, :, 3] *= 1 - np.clip(f.c[:, :, 3], 0, 1)
    return n


def interp(pts, x: float) -> float:
    return float(np.interp(x, [p[0] for p in pts], [p[1] for p in pts]))


# ─────────────────────────────── Vegetação ───────────────────────────────
def pinheiro(c: Camada, x: float, yb: float, alt: int, tons, seed: int = 0) -> None:
    for j in range(alt):
        tier = j % 4
        half = 0.5 + j * 0.2 + tier * 0.42
        y = yb - alt + j
        for dx in range(-int(half), int(half) + 1):
            k = dx / (half + 0.01) + (hash01(int(x) + dx, int(y), seed) - 0.5) * 0.6
            cor = tons[0] if k < -0.4 else tons[1] if k < 0.2 else tons[2]
            if tier == 3 and dx > -half * 0.3:
                cor = tons[2]
            c.p(x + dx, y, cor)
    c.p(x, yb, "#3a2a22")
    c.p(x, yb - alt - 1, tons[1])


def arvore(c: Camada, x: float, yb: float, r: float, tons=("#86b058", "#5a8a42", "#356236"), tronco: str = "#4a3424") -> None:
    alt = max(1, int(r * 0.7))
    c.ret(x, yb - alt, 1 if r < 4 else 2, alt + 1, tronco)
    if r >= 4:
        c.ret(x, yb - alt, 1, alt + 1, "#7a5a3a")
    cy = yb - alt - r * 0.75
    c.disco(x - r * 0.45, cy + r * 0.25, r * 0.72, tons)
    c.disco(x + r * 0.5, cy + r * 0.2, r * 0.7, tons)
    c.disco(x, cy - r * 0.15, r * 0.85, tons)
    for k in range(int(r * 1.5)):  # folhas soltas de luz
        a = hash01(int(x), k, 5) * math.tau
        rr = hash01(k, int(yb), 6) * r * 0.8
        if math.cos(a) < 0.2:
            c.p(x + math.cos(a) * rr, cy + math.sin(a) * rr * 0.8, mistura(tons[0], "#e8f0a0", 0.3))


def alamo(c: Camada, x: float, yb: float, alt: int, tons=("#7aa052", "#4e7a40", "#2e5234")) -> None:
    for j in range(alt):
        f = j / max(1, alt - 1)
        half = 0.4 + math.sin(min(1, f * 1.15) * math.pi) ** 0.7 * (1.2 + alt * 0.06)
        for dx in range(-int(round(half)), int(round(half)) + 1):
            k = dx / (half + 0.3) + (hash01(int(x) + dx, j, 3) - 0.5) * 0.5
            c.p(x + dx, yb - alt + j - 1, tons[0] if k < -0.35 else tons[1] if k < 0.3 else tons[2])
    c.p(x, yb, "#4a3424")
    c.p(x, yb - 1, "#4a3424")


def cerca(c: Camada, x0: float, y0: float, x1: float, y1: float, alt: int = 3) -> None:
    n = int(abs(x1 - x0))
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / max(1, n)
        y = y0 + (y1 - y0) * i / max(1, n)
        c.p(x, y - alt + 1, "#b08a5a" if i % 2 else "#8a6844")
        if alt > 3:
            c.p(x, y - 1, "#7a5a3a")
        if i % 5 == 0:
            for j in range(alt + 1):
                c.p(x, y - j, "#c49a66" if j == alt else "#6a4a30")


def marco(c: Camada, x: float, y: float, s: float) -> None:
    """Marco de légua: pedra de topo arredondado, sem letras (uma faixa gravada e musgo no pé)."""
    if s < 0.45:
        c.p(x, y - 1, "#efe6d2")
        c.p(x, y, "#9a8e80")
        return
    w, h = (2, 4) if s < 0.75 else (3, 6)
    c.ret(x, y - h + 1, w, h, "#bcb0a0")
    c.ret(x, y - h + 1, 1, h, "#efe6d2")
    c.ret(x + w - 1, y - h + 2, 1, h - 1, "#7c7068")
    c.p(x + w - 1, y - h + 1, "#bcb0a0", 0.4)
    c.ret(x, y - h + 3, w, 1, "#8a7e72", 0.7)
    c.p(x - 1, y, "#5a7a40")
    c.p(x + w, y, "#4a6a38")


# ─────────────────────────────── Estrada e água ───────────────────────────────
def campo_dist(pts, hw_fn, achat: float = 0.42, min_ry: float = 1.1) -> np.ndarray:
    """Distância normalizada (0 no eixo, 1 na borda) de um caminho pintado com pincel elíptico (perspectiva do chão)."""
    U = np.full((H, W), 9.0, dtype=np.float32)
    for (x, y) in pts:
        rx = hw_fn(y)
        ry = max(min_ry, rx * achat)
        x0, x1, y0, y1 = max(0, int(x - rx - 1)), min(W, int(x + rx + 2)), max(0, int(y - ry - 1)), min(H, int(y + ry + 2))
        if x0 >= x1 or y0 >= y1:
            continue
        sub = np.hypot((_XS[y0:y1, x0:x1] - x) / rx, (_YS[y0:y1, x0:x1] - y) / ry)
        U[y0:y1, x0:x1] = np.minimum(U[y0:y1, x0:x1], sub)
    return U


def pintar_estrada(c: Camada, U: np.ndarray, seed: int, sulcos_de: float = 160, claro="#e2c492", escuro="#b08c62") -> None:
    g = np.random.default_rng(seed)
    k = g.random((H, W)).astype(np.float32) * 0.5 + ruido(seed + 1, 4, 2) * 0.5
    tt = np.clip(U * 0.85 + (k - 0.5) * 0.55, 0, 1)[:, :, None]
    cor = hexa(claro) * (1 - tt) + hexa(escuro) * tt
    sulco = ((U > 0.32) & (U < 0.5) & (_YS > sulcos_de))[:, :, None]
    cor = np.where(sulco, hexa("#9c7a54") * (0.9 + 0.2 * k[:, :, None]), cor)
    borda = (U > 0.82)[:, :, None]
    mix = (k > 0.52)[:, :, None]
    cor = np.where(borda, np.where(mix, hexa("#6a8044"), hexa("#8e7850")), cor)
    marcar(c, U <= 1, cor.astype(np.float32))
    ys, xs = np.nonzero(U < 0.78)
    for i in g.choice(len(ys), size=min(len(ys), max(8, len(ys) // 26)), replace=False):
        c.p(xs[i], ys[i], "#f4e2bc" if g.random() < 0.55 else "#7c6244")


def hw_chao(y: float) -> float:
    return 1.6 + max(0.0, y - 142) * 0.27


# ─────────────────────────────── O castelo ───────────────────────────────
def pedra_c(x: int, y: int, tt: float, seed: int) -> np.ndarray:
    fi = y // 3
    off = (fi % 2) * 2
    col = (x + off) // 4
    k = hash01(col, fi, seed)
    val = tt + (k - 0.5) * 0.2
    tons = PL + PS
    cor = hexa(tons[int(min(0.999, max(0.0, val)) * 8)])
    if y % 3 == 2 or (x + off) % 4 == 3:
        cor = cor * 0.9
    if k > 0.93:
        cor = cor * 1.06
    return cor


def cone(c: Camada, cx: float, half: float, y_eave: int, alt: int, tons=TEL) -> None:
    apex = y_eave - alt
    for y in range(apex, y_eave + 1):
        f = (y - apex) / max(1, alt)
        hf = 0.45 + (f ** 1.12) * half
        for x in range(int(math.floor(cx - hf)), int(math.ceil(cx + hf)) + 1):
            u = (x - cx) / max(hf, 0.5)
            if abs(u) > 1.08:
                continue
            i = 0 if u < -0.62 else 1 if u < -0.18 else 2 if u < 0.3 else 3 if u < 0.74 else 4
            if (y - apex) % 3 == 2:
                i = min(4, i + 1)
            elif hash01(x, y, 91) > 0.88:
                i = max(0, i - 1)
            c.p(x, y, tons[i])
    for x in range(int(cx - half) + 1, int(cx + half) + 1):
        c.p(x, y_eave + 1, "#2e2a40", 0.5)
    c.p(cx, apex - 1, "#f0c46a")
    c.p(cx, apex - 2, "#8a6428")


def bandeira(c: Camada, x: int, y: int, w: int = 9, h: int = 5) -> None:
    """Estandarte verde-floresta com a faixa de ouro, em rabo de andorinha, ondulando para a direita."""
    for i in range(w):
        dy = int(round(math.sin(i * 0.85 + 0.4) * 1.0))
        for j in range(h):
            if i >= w - 2 and j == h // 2:
                continue
            if i == w - 1 and j in (h // 2 - 1, h // 2 + 1) and h > 4:
                continue
            cor = VERDE[0] if (i % 4 == 1) else VERDE[1] if (i % 4 in (0, 2)) else VERDE[2]
            if j == h // 2 or (i == 0):
                cor = OURO if i % 4 != 3 else "#a8823a"
            if j == h - 1:
                cor = mistura(cor, "#081c1a", 0.35)
            c.p(x + 1 + i, y + j + dy, cor)


def estandarte(c: Camada, x: int, y: int, w: int = 3, h: int = 8) -> None:
    """Estandarte pendurado na muralha: campo verde, orla e losango de ouro, ponta em bico."""
    for j in range(h):
        for i in range(w):
            if j == h - 1 and i != w // 2:
                continue
            cor = VERDE[1] if i < w - 1 else VERDE[2]
            if j == 0 or (i == w // 2 and j in (h // 2 - 1, h // 2)) or (j == h - 2 and w > 3 and i in (0, w - 1)):
                cor = OURO
            c.p(x + i, y + j, cor)
    c.ret(x - 1, y - 1, w + 2, 1, "#5a3e24")


def torre_c(c: Camada, e: Camada, x0: int, w: int, yt: int, yb, seed: int, jan=(), cone_alt: int = 0, ameia: bool = False,
            faixa: bool = True) -> None:
    """Torre redonda: sombreamento de cilindro (luz da esquerda, luz rebatida na borda direita), sapata alargada,
    cordão de pedra, cachorros no alto e ameias ou telhado cônico de ardósia."""
    cx = x0 + (w - 1) / 2
    fundo = 0
    for x in range(x0, x0 + w):
        u = (x - x0) / max(1, w - 1)
        tt = 0.03 if u < 0.07 else 0.13 + 0.8 * u ** 1.2
        if u > 0.94:
            tt = 0.76
        ybx = int(yb(x)) if callable(yb) else int(yb)
        fundo = max(fundo, ybx)
        for y in range(yt, ybx + 1):
            c.p(x, y, pedra_c(x, y, tt, seed))
    ybl = int(yb(x0)) if callable(yb) else int(yb)
    ybr = int(yb(x0 + w - 1)) if callable(yb) else int(yb)
    for j in range(4):  # sapata
        c.p(x0 - 1, ybl - j, PL[1] if j else PL[2])
        c.p(x0 + w, ybr - j, PS[2])
    if faixa:
        ys = yt + int((fundo - yt) * 0.46)
        for x in range(x0, x0 + w):
            u = (x - x0) / max(1, w - 1)
            c.p(x, ys, "#fff4d8" if u < 0.4 else PL[2] if u < 0.75 else PS[0])
            c.p(x, ys + 1, "#3a3040", 0.35)
    for x in range(x0 - 1, x0 + w + 1):  # cachorros (machicolagem)
        u = (x - x0 + 1) / (w + 1)
        c.p(x, yt, "#fff4d8" if u < 0.4 else PL[2] if u < 0.72 else PS[1])
        c.p(x, yt + 1, PL[1] if u < 0.4 else PL[3] if u < 0.72 else PS[2])
        c.p(x, yt + 2, "#4a3e4c" if (x - x0) % 2 else (PL[3] if u < 0.6 else PS[2]))
    c.ret(x0, yt + 3, w, 1, "#3a3040", 0.3)
    if ameia:
        for x in range(x0 - 1, x0 + w + 1):
            if (x - x0 + 1) % 3 != 2:
                u = (x - x0 + 1) / (w + 1)
                c.p(x, yt - 1, PL[1] if u < 0.5 else PS[0])
                c.p(x, yt - 2, "#fff4d8" if u < 0.5 else PL[3])
    if cone_alt:
        cone(c, cx, w / 2 + 1.6, yt - 1, cone_alt)
    for (dy, fx, on) in jan:
        ww, wh = (2, 4) if w >= 12 else (1, 3)
        wx, wy = x0 + int(round((w - 1) * fx)), yt + dy
        c.ret(wx - 1, wy - 1, ww + 2, 1, PL[0], 0.7)
        c.ret(wx, wy, ww, wh, "#33283a")
        c.ret(wx - 1, wy + wh, ww + 2, 1, PL[0], 0.8)
        if on:
            e.ret(wx, wy, ww, wh, "#ffcc74")
            e.p(wx, wy, "#fff2c8")


def bloco(c: Camada, x0: int, x1: int, yt: int, yb: int, seed: int, t0: float = 0.2, t1: float = 0.45) -> None:
    for x in range(x0, x1):
        u = (x - x0) / max(1, x1 - x0 - 1)
        tt = t0 + (t1 - t0) * u
        if x == x0:
            tt = 0.02
        if x >= x1 - 2:
            tt = 0.7
        for y in range(yt, yb + 1):
            c.p(x, y, pedra_c(x, y, tt, seed))


def base_muralha(x: float) -> int:
    return 109 + int(round(1.3 * math.sin((x - 250) / 15)))


def castelo(c: Camada, e: Camada, flags: Camada, luzes: list) -> None:
    yb = base_muralha
    # ── Torre de menagem: bloco alto com telhado de quatro águas, duas fiadas de janelas e chaminé.
    bloco(c, 300, 334, 58, 100, 11, 0.16, 0.42)
    for y in range(42, 59):  # telhado de quatro águas
        f = (y - 42) / 16
        xa, xb = 309 + (298 - 309) * f, 324 + (335 - 324) * f
        for x in range(int(round(xa)), int(round(xb)) + 1):
            u = (x - xa) / max(1.0, xb - xa)
            i = 0 if u < 0.1 else 1 if u < 0.45 else 2 if u < 0.72 else 3
            if x > 324 + (y - 42) * 0.3:
                i = 4
            if (y - 42) % 3 == 2:
                i = min(4, i + 1)
            elif hash01(x, y, 92) > 0.9:
                i = max(0, i - 1)
            c.p(x, y, TEL[i])
    c.ret(309, 41, 16, 1, "#b8d0d8")
    c.ret(298, 59, 38, 1, "#2e2a40", 0.5)
    c.ret(327, 40, 3, 7, PS[0])
    c.ret(327, 40, 1, 7, PL[1])
    c.ret(326, 39, 5, 1, PS[2])
    c.poligono([(313, 50), (316.5, 45), (320, 50)], TEL[1])  # trapeira
    c.ret(314, 50, 5, 4, PL[1])
    c.ret(316, 51, 1, 3, "#33283a")
    e.ret(316, 51, 1, 3, "#ffcc74")
    for (wy, alt) in ((63, 6), (76, 5)):
        for wx in (305, 311, 317, 323):
            c.ret(wx - 1, wy - 1, 4, 1, PL[0], 0.7)
            c.ret(wx, wy, 2, alt, "#33283a")
            c.p(wx, wy - 1, "#33283a", 0.6)
            c.ret(wx - 1, wy + alt, 4, 1, PL[0])
            if hash01(wx, wy, 5) > 0.25:
                e.ret(wx, wy, 2, alt, "#ffc468")
                e.p(wx, wy, "#fff2c8")
                e.ret(wx, wy + alt // 2, 2, 1, "#a8683a")
    c.ret(300, 70, 34, 1, "#fff4d8", 0.6)
    c.ret(300, 71, 34, 1, "#3a3040", 0.3)
    # ── Salão entre a torre grande e a menagem: telhado de duas águas visto de lado, com trapeiras.
    bloco(c, 284, 302, 76, 100, 12, 0.24, 0.4)
    for y in range(67, 77):
        for x in range(283, 303):
            i = 1 if y < 69 else 2 if y < 73 else 3
            if (x + (y // 2) * 2) % 4 == 3 or y % 3 == 0:
                i = min(4, i + 1)
            c.p(x, y, TEL[i])
    c.ret(283, 66, 20, 1, "#b8d0d8")
    for wx in (288, 295):
        c.ret(wx, 80, 2, 4, "#33283a")
        e.ret(wx, 80, 2, 4, "#ffc468")
    # ── As torres de trás: a grande (a mais alta), a esguia colada à menagem e a do meio.
    torre_c(c, e, 270, 14, 50, 100, 13, jan=[(8, 0.3, 1), (21, 0.55, 1), (33, 0.3, 0), (44, 0.5, 1)], cone_alt=22)
    for x in range(268, 286):  # balcão de madeira (hurdício) sob o telhado
        c.p(x, 55, "#8a5a34" if x < 278 else "#5a3a24")
        c.p(x, 56, "#4a2e1e")
        if x % 3 == 0:
            c.p(x, 57, "#4a2e1e")
    torre_c(c, e, 322, 7, 46, 72, 14, jan=[(6, 0.4, 1), (15, 0.5, 0)], cone_alt=14, faixa=False)
    torre_c(c, e, 256, 10, 66, 100, 15, jan=[(6, 0.4, 1), (17, 0.5, 0)], cone_alt=13)
    # mastros e estandartes (os dois das torres ficam numa camada própria: balançam por cima da pintura)
    for (mx, my) in ((277, 19), (343, 44)):
        c.ret(mx, my, 1, 9, "#3a2c2c")
        c.p(mx, my - 1, "#f0c46a")
        bandeira(flags, mx, my, 9, 5)
        ANC["estandartes"].append((mx + 1, my - 1, 10, 7))
    # ── A cortina de muralha que acompanha o terreno: cordão, ameias, seteiras, contrafortes e a fundação na rocha.
    x0, x1, yt = 250, 342, 93
    for x in range(x0, x1):
        u = (x - x0) / (x1 - x0)
        base = yb(x) + 2
        for y in range(yt, base + 1):
            tt = 0.2 + 0.26 * u
            fund = y >= base - 3
            if fund:
                tt += 0.2
            cor = pedra_c(x, y if not fund else y // 2 * 2, tt, 16)
            if fund and hash01(x // 2, y, 33) > 0.6:
                cor = cor * 0.6 + hexa("#5c7a44") * 0.4  # musgo no pé
            c.p(x, y, cor)
        if (x - x0) % 4 < 2:  # ameias
            c.p(x, yt - 2, "#fff4d8")
            c.p(x, yt - 1, PL[1])
        c.p(x, yt, "#fff4d8" if (x - x0) % 4 < 2 else PL[2])
        c.p(x, yt + 3, PL[0])
        c.p(x, yt + 4, "#3a3040", 0.4)
    for sx in range(x0 + 5, x1 - 3, 9):  # seteiras
        if not (284 < sx < 310):
            c.ret(sx, yt + 7, 1, 3, "#33283a")
            c.p(sx, yt + 6, PL[0], 0.6)
    for bx in list(range(x0 + 12, 283, 12)) + list(range(314, x1 - 4, 12)):  # contrafortes
        base = yb(bx) + 4
        for y in range(yt + 5, base + 1):
            larg = 3 if y < base - 5 else 4 if y < base - 2 else 5
            xi = bx - (larg - 3)
            for k in range(larg):
                cor = "#fff4d8" if k == 0 else PL[1] if k < larg - 1 else PS[1]
                if y == yt + 5:
                    cor = "#fff4d8" if k < 2 else PL[2]
                if (y % 3 == 2) and 0 < k < larg - 1:
                    cor = PL[2]
                c.p(xi + k, y, cor)
        c.p(bx + 3, base, PS[2])
        c.ret(bx + 3, yt + 6, 1, base - yt - 8, "#3a3040", 0.28)  # sombra do contraforte na muralha
    estandarte(c, 264, 97, 3, 8)
    estandarte(c, 324, 97, 3, 8)
    # ── Torres de canto: a da esquerda com ameias e a da direita, mais larga, com telhado cônico.
    torre_c(c, e, 243, 12, 78, lambda x: yb(x) + 4, 17, jan=[(7, 0.35, 1), (18, 0.5, 0)], ameia=True)
    c.ret(249, 68, 1, 9, "#3a2c2c")
    bandeira(c, 249, 68, 6, 4)
    torre_c(c, e, 336, 14, 72, lambda x: yb(x) + 4, 18, jan=[(7, 0.3, 1), (19, 0.55, 1), (29, 0.3, 0)], cone_alt=18)
    # ── A casa do portão: corpo saliente com ameias, duas torrinhas e o arco com a grade erguida.
    bloco(c, 288, 308, 85, 111, 19, 0.14, 0.32)
    for x in range(287, 309):
        if (x - 287) % 3 != 2:
            c.p(x, 83, "#fff4d8")
            c.p(x, 84, PL[1])
        c.p(x, 85, "#fff4d8")
        c.p(x, 88, PL[0])
        c.p(x, 89, "#3a3040", 0.35)
    torre_c(c, e, 283, 6, 82, lambda x: yb(x) + 3, 20, jan=[(8, 0.5, 1)], cone_alt=9, faixa=False)
    torre_c(c, e, 306, 6, 82, lambda x: yb(x) + 3, 21, jan=[(8, 0.5, 1)], cone_alt=9, faixa=False)
    arco = [(98, 295, 299), (99, 294, 300)] + [(y, 293, 301) for y in range(100, 112)]
    for (y, xa, xb) in arco:
        c.ret(xa - 1, y, xb - xa + 3, 1, "#fff4d8" if y < 101 else PL[0])
    c.ret(294, 97, 7, 1, "#fff4d8")
    for (y, xa, xb) in arco:
        c.ret(xa, y, xb - xa + 1, 1, "#2a1e28")
    c.ret(293, 100, 2, 12, "#1c141c")  # a espessura do vão, em sombra
    for x in range(295, 301, 2):  # grade erguida
        c.ret(x, 99, 1, 4, "#120e14")
    c.ret(294, 102, 7, 1, "#120e14")
    e.ret(296, 104, 5, 7, "#ffb45a", 0.6)
    e.ret(297, 105, 3, 5, "#ffd890", 0.7)
    for sx in (291, 303):  # tochas do portão
        c.p(sx, 101, "#3a2c2c")
        e.p(sx, 100, "#ffe0a0")
        e.p(sx, 99, "#ffb050", 0.8)
    estandarte(c, 295, 89, 5, 8)
    luzes += [(297, 105, 12, 0.9, "#ffb060", 0.5), (277, 72, 16, 1.2, "#ffb060", 0.22), (317, 72, 18, 1.0, "#ffb060", 0.24),
              (343, 84, 12, 1.2, "#ffb060", 0.18), (249, 90, 10, 1.2, "#ffb060", 0.15)]
    ANC["janelas"] += [(297, 106, 9), (317, 70, 12), (277, 62, 8)]


# ─────────────────────────────── O platô ───────────────────────────────
PERFIL = [(204, 149), (212, 141), (218, 135), (229, 133), (233, 126), (238, 115), (245, 111), (250, 110), (300, 109), (350, 110),
          (356, 113), (362, 120), (372, 128), (386, 138), (404, 148)]
MORRO = [(252, 144.5), (270, 142.5), (294, 139.5), (309, 137.5), (316.5, 135), (309, 132.5), (290, 131), (271, 129.5), (262, 127.5),
         (259.5, 125), (266, 123), (288, 121.5), (307, 120), (318, 118.5), (320.5, 116), (314, 113.8), (305, 112.3), (298, 111)]


def plato(c: Camada) -> None:
    """Platô largo de rocha estratificada: falésia clara do lado da luz, flanco direito em sombra, a encosta da
    frente em terraços de capim com afloramentos, por onde a estrada sobe em zigue-zague."""
    nR, nS, nC, nG = ruido(71, 5, 9), ruido(72, 6, 3), ruido(73, 3, 5), ruido(74, 7, 3)
    lit_t = ["#f2e2c0", "#dcc8a2", "#c4ae8c", "#a89478"]
    sh_t = ["#96847a", "#7c6c6c", "#645662", "#4c4256"]
    gr_t = ["#9cb866", "#7c9c50", "#618444", "#4a6c3c", "#38563a"]
    for x in range(204, 405):
        yt = interp(PERFIL, x)
        base = 148 + int(nG[150, x] * 3)
        xn = (x - 204) / 200
        flanco_e, flanco_d = x < 248, x > 344
        for y in range(int(round(yt)), base + 1):
            d = y - yt
            frac = d / max(1.0, base - yt)
            r = nR[y, x]
            rocha = (r > 0.36 and frac < 0.8) if (flanco_e or flanco_d) else (r > 0.6 and frac < 0.9) or d < 2.5
            if 218 <= x <= 229 and d < 3:
                rocha = False  # o ombro gramado do moinho
            if rocha:
                faceta = int((x + nS[y, x] * 9) / 4)
                luz = hash01(faceta, int((y + faceta * 2) / 7), 75) + (0.32 - xn * 0.7) + (0.25 if flanco_e else -0.2 if flanco_d else 0)
                tons = lit_t if luz > 0.5 else sh_t
                i = int(min(3.99, max(0, (hash01(faceta, y // 3, 76) * 2.2 + frac * 1.6))))
                cor = hexa(tons[i])
                if nC[y, x] > 0.72:
                    cor = hexa("#3e3448")
                elif (y + faceta) % 5 == 0:
                    cor = cor * 0.86  # estratos
                if d < 1:
                    cor = hexa("#fff2d0") if luz > 0.5 else hexa(sh_t[0])
            else:
                k = nG[y, x] * 0.6 + hash01(x, y, 77) * 0.4 + frac * 0.25 + xn * 0.25 - 0.1
                cor = hexa(gr_t[int(min(4.99, max(0, k * 5)))])
                if d < 1.2:
                    cor = hexa("#b4cc74")
            c.p(x, y, cor)
    # borda de capim e arbustos no alto do platô, à frente da fundação
    g = np.random.default_rng(78)
    for _ in range(46):
        x = 206 + g.random() * 196
        yt = interp(PERFIL, x)
        y = yt + 4 + g.random() * (144 - yt - 4)
        if 250 < x < 324 and any(abs(y - my) < 2.6 and abs(x - mx) < 9 for (mx, my) in MORRO):
            continue
        r = 1.2 + g.random() * 1.8
        c.disco(x, y, r, ("#8cb05a", "#5c8644", "#345c38"))
        c.p(x + r * 0.6, y + r, "#2c3c38", 0.5)
    for (x, alt) in ((234, 7), (240, 6), (358, 8), (364, 9), (371, 8), (379, 9), (388, 8), (331, 6), (326, 5)):
        y = interp(PERFIL, x) + (3 if x < 250 or x > 350 else 22 + (x % 5))
        alamo(c, x, y + 5, alt, ("#7ea456", "#52803f", "#30563a"))


def estrada_do_morro(c: Camada, e: Camada, luzes: list) -> None:
    pts = curva(MORRO, 40)
    U = campo_dist(pts, lambda y: 1.25 + max(0.0, y - 110) * 0.024, achat=0.6, min_ry=1.0)
    m = U <= 1
    muro_ = np.roll(m, 1, 0) & ~m
    marcar(c, muro_, "#5e5058")  # muro de arrimo embaixo de cada lance
    marcar(c, np.roll(muro_, 1, 0) & ~m & ~muro_, "#3c3444", 0.4)
    pintar_estrada(c, U, 81, sulcos_de=999, claro="#f0d8a8", escuro="#c8a678")
    # a rampa de pedra do último lance até o portão, com parapeito
    for (x, y) in curva(MORRO[-5:], 30):
        c.p(x, y - 1.6, "#f8ecd0")
        c.p(x, y + 1.4, "#6a5c66")
    c.ret(294, 110, 7, 3, "#e8d0a0")
    c.ret(294, 112, 7, 1, "#c8a678")
    for (x, y) in ((317, 134), (259, 125), (321, 116.5)):  # lampiões nas curvas
        c.ret(x, y - 4, 1, 4, "#2a2232")
        e.p(x, y - 5, "#ffe0a0")
        luzes.append((x, y - 5, 7, 1.0, "#ffb060", 0.4))
    for (x, y) in ((284, 140), (300, 131.5), (280, 121.5), (300, 119.5)):
        marco(c, x, y - 1, 0.3)


# ─────────────────────────────── A vila ───────────────────────────────
def sino_p(c: Camada, cx: int, topo: int) -> None:
    c.ret(cx - 1, topo - 2, 3, 2, "#4a2c14")
    c.p(cx, topo - 3, "#8a5a28")
    perfil = [1, 2, 3, 4, 4, 4, 4, 5, 5, 6, 7, 7]
    for j, mm in enumerate(perfil):
        for dx in range(-mm, mm + 1):
            tt = (dx + mm) / (2 * mm)
            cor = "#f0cc82" if tt < 0.14 else "#cc9442" if tt < 0.34 else "#9c6628" if tt < 0.6 else "#6a3e18" if tt < 0.84 else "#3e2410"
            if j in (2, 9):
                cor = "#ffdc94" if tt < 0.3 else "#9a6024" if tt < 0.75 else "#3e2410"
            if j == len(perfil) - 1:
                cor = "#5a3414" if tt > 0.25 else "#d8a050"
            c.p(cx + dx, topo + j, cor)
    for (dx, dy) in ((-3, 3), (-3, 5), (-4, 8)):
        c.p(cx + dx, topo + dy, "#fff0c0")
    for (dx, dy) in ((3, 4), (4, 8), (5, 10)):
        c.p(cx + dx, topo + dy, "#5e8a72")  # verdete
    c.ret(cx - 1, topo + len(perfil), 3, 1, "#1e120a")
    c.disco(cx + 0.5, topo + len(perfil) + 1.2, 1.4, ("#b07a34", "#6a4018", "#2e1a0c"))


def torre_relogio(c: Camada, e: Camada, rel: Camada, camp: Camada, luzes: list) -> None:
    pedra = ("#3e3a3e", "#5a524e", "#7a6e64", "#9a8c7c", "#b8a894", "#d2c4ac")
    pedra_lado = ("#24222a", "#302c34", "#3c3640", "#4a4248", "#585058")
    cantaria(c, XA, XB, TOPO, BASE, 3, pedra, alt=4, larg=9)
    cantaria(c, XB, XB + LADO, TOPO, BASE, 4, pedra_lado, alt=4, larg=6, rejunte=("#1e1c22", "#16141a"), musgo_de=0.35)
    for y in range(TOPO, BASE, 8):  # silharia das quinas
        ww = 5 if (y // 8) % 2 == 0 else 3
        c.ret(XA, y, ww, 7, "#c8baa6")
        c.ret(XA, y, ww, 1, "#eadfca")
        c.ret(XA, y + 7, ww, 1, "#3a3236")
        c.ret(XA + ww - 1, y + 1, 1, 6, "#8a7c6e")
        c.ret(XB - ww, y, ww, 7, "#8e8274")
        c.ret(XB - ww, y, ww, 1, "#a89a88")
        c.ret(XB - ww, y + 7, ww, 1, "#3a3236")
    c.ret(XA, TOPO, 1, BASE - TOPO, "#f6ecd8")
    c.ret(XB, TOPO, 1, BASE - TOPO, "#1a181e")
    c.ret(XB + 1, TOPO, 1, BASE - TOPO, "#4a444c")
    cantaria(c, XA - 3, XB + 3, 172, BASE, 8, pedra, alt=6, larg=11, musgo_de=0.2)
    cantaria(c, XB + 3, XB + LADO + 2, 172, BASE, 9, pedra_lado, alt=6, larg=7, musgo_de=0.0)
    c.ret(XA - 4, 171, XB - XA + 8, 2, "#a8988a")
    c.ret(XA - 4, 171, XB - XA + 8, 1, "#e4d6c2")
    c.ret(XB + 4, 171, LADO - 2, 2, "#4a4248")
    for y in (54, 86, 127):
        cornija(c, XA, XB, y, LADO)
    # ── Campanário: arco aberto, interior de madeira, viga, guarda-corpo; o sino fica numa camada própria.
    ac, ab, rx = 69, 85, 11
    abre = poligono_m([(CX - rx, ab), (CX - rx, ac), (CX + rx, ac), (CX + rx, ab)])
    abre = np.maximum(abre, elipse_m(CX - 0.5, ac, rx, 9) * (_YS <= ac))
    fundo = np.zeros((H, W, 3), dtype=np.float32) + hexa("#160e10")
    fundo += (1 - np.clip(np.abs(_XS - CX) / rx, 0, 1))[:, :, None] * hexa("#2c1a0e")
    fundo = fundo * (1 - ((np.mod(_XS - CX, 4) == 0) * 0.35)[:, :, None])
    c.mascara(abre, fundo)
    borda = (desfocar(abre[:, :, None], 0.9)[:, :, 0] > 0.04) & (abre == 0) & (_YS > 57) & (_YS < ab)
    marcar(c, borda, "#e4d6c0")
    for k in range(9):  # aduelas
        a = math.pi + k / 8 * math.pi
        c.p(CX - 0.5 + math.cos(a) * (rx + 2), ac + math.sin(a) * 11, "#5a4e48")
    c.p(CX, 58, "#f6ecd8")
    c.ret(CX - 9, 63, 18, 2, "#4a2c18")
    c.ret(CX - 9, 63, 18, 1, "#8a5a32")
    c.ret(CX - rx, ab - 4, rx * 2, 4, "#9a8a7a")
    c.ret(CX - rx, ab - 4, rx * 2, 1, "#e2d4be")
    for k in range(CX - rx + 1, CX + rx, 3):
        c.ret(k, ab - 3, 1, 3, "#4a3e3c")
    sino_p(camp, *SINO_TOPO)
    luzes.append((CX, ac + 6, 16, 0.9, "#ffb860", 0.36))
    e.ret(CX - 7, ab - 5, 14, 1, "#ffcf80", 0.22)
    # ── Telhado de quatro águas com beiral, trapeira e remate de latão.
    eave, apice = 52, 22
    musgo = ruido(31, 4)
    for y in range(apice, eave + 1):
        f = (y - apice) / (eave - apice)
        meia = 1.5 + f * 21.5
        fila = (y - apice) // 3
        for x in range(int(CX - meia), int(CX + meia) + 1):
            u = (x - CX) / max(meia, 1)
            tons = ("#ec8e66", "#c45f3e", "#8a3c2a") if u < -0.15 else ("#b85b3c", "#95462e", "#622a22") if u < 0.4 else ("#743a2e", "#582c26", "#3a1c1c")
            em, emy = (x + (fila % 2) * 2) % 4, (y - apice) % 3
            cor = hexa(tons[2] if emy == 2 else tons[0] if (emy == 0 and em in (1, 2)) else tons[1])
            if em == 3 and emy < 2:
                cor = hexa(tons[2])
            k = hash01(x // 4, fila, 17)
            if k > 0.86:
                cor = cor * (1.12 if k > 0.93 else 0.86)
            if u > 0.15 and musgo[y, x] > 0.62 - f * 0.12:
                cor = cor * 0.5 + hexa("#4c6a38") * 0.5
            if abs(x - (CX - meia)) < 1.2:
                cor = hexa("#ffd4ae")
            c.p(x, y, cor)
        c.p(CX, y, "#ffc8a4" if y % 2 else "#c8705a")
        c.p(CX + 1, y, "#4a2420")
    c.ret(CX - 24, eave, 48, 2, "#5a3420")
    c.ret(CX - 24, eave, 48, 1, "#a8703e")
    c.ret(CX - 23, eave + 2, 46 + LADO - 2, 1, "#1e1416", 0.6)
    for k in range(CX - 22, CX + 23, 4):
        c.ret(k, eave + 2, 2, 1, "#3a2014")
    c.poligono([(CX - 5, 41), (CX, 35), (CX + 5, 41)], "#9a4a34")
    c.linha(CX - 5, 41, CX, 35, "#ffd4ae")
    c.ret(CX - 4, 41, 8, 5, "#b4a492")
    c.ret(CX - 2, 42, 4, 4, "#24181c")
    e.ret(CX - 1, 43, 2, 2, "#ffb860", 0.7)
    c.ret(CX, apice - 6, 1, 6, "#2a2428")
    c.disco(CX + 0.5, apice - 1, 1.6, ("#ffe8a0", "#c89040", "#6a4418"))
    c.poligono([(CX + 1, apice - 7), (CX + 7, apice - 5), (CX + 1, apice - 3)], VERDE[1])
    c.linha(CX + 1, apice - 7, CX + 6, apice - 5, OURO)
    # ── O relógio: anel de aduelas, aro de ferro rebitado, filete de latão, porcelana e doze marcas geométricas.
    mx, my, r = RELOGIO
    for y in range(my - r - 5, my + r + 6):
        for x in range(mx - r - 5, mx + r + 6):
            d = math.hypot(x - mx, y - my)
            ang = math.atan2(y - my, x - mx)
            luz = -math.cos(ang + math.pi * 0.72)
            if r + 0.4 < d <= r + 3.4:
                fr = (ang + math.pi) / math.tau * 16
                cor = mistura("#dccdb6", "#6e6460", 0.5 - luz * 0.4 + (hash01(int(fr), 3, 61) - 0.5) * 0.3)
                if d > r + 2.5:
                    cor = cor * 0.7
                if abs(fr - round(fr)) < 0.08:
                    cor = hexa("#3a3236")
                c.p(x, y, cor)
            elif r - 1.6 <= d <= r + 0.4:
                c.p(x, y, "#141218" if d > r - 0.4 else "#5a565e" if luz > 0.6 else "#36343c" if luz > -0.2 else "#1c1a20")
            elif r - 2.7 <= d < r - 1.6:
                c.p(x, y, "#fff0b0" if luz > 0.65 else "#e0b04c" if luz > 0 else "#9a6a24" if luz > -0.6 else "#5a3a14")
            elif d < r - 2.7:
                k = d / (r - 2.7)
                cor = mistura("#fff6e2", "#ecd2a4", k ** 1.8)
                s_int = max(0.0, (k - 0.74) / 0.26) * max(0.0, luz) * 0.32
                rel.p(x, y, cor * (1 - s_int) + hexa("#8a6a4a") * s_int)
    for i in range(12):
        a = i / 12 * math.tau - math.pi / 2
        ux, uy = math.cos(a), math.sin(a)
        c.p(mx + ux * (r - 0.8), my + uy * (r - 0.8), "#9a96a0")
        if i % 3 == 0:
            for dd in (r - 6.4, r - 5.4, r - 4.4):
                rel.p(mx + ux * dd, my + uy * dd, "#2a1a1a")
        else:
            rel.p(mx + ux * (r - 4.6), my + uy * (r - 4.6), "#5a3e30")
    for i in range(8):
        a = i / 8 * math.tau
        rel.p(mx + math.cos(a) * 3, my + math.sin(a) * 3, "#e4caa0")
    for (ang_g, comp, folha, cauda) in ((305, 5.2, 1.0, 1.5), (62, 8.2, 0.6, 2.4)):  # ponteiros (hora de cenário)
        a = math.radians(ang_g) - math.pi / 2
        ux, uy = math.cos(a), math.sin(a)
        for dd in np.linspace(-cauda, comp, int((comp + cauda) * 4)):
            larg = folha * math.sin(min(1, max(0, dd / comp)) * math.pi) ** 0.8 if dd > 0 else 0.3
            for k in np.linspace(-larg, larg, max(2, int(larg * 4))):
                rel.p(mx + ux * dd - uy * k, my + uy * dd + ux * k, "#1a1218")
    rel.disco(mx + 0.5, my + 0.5, 1.5, ("#ffe8a0", "#c8902e", "#5a3a14"))
    luzes.append((mx, my, 24, 1.0, "#ffd890", 0.2))
    # ── Janelas fundas, porta em arco com ferragens, arandelas, degraus e hera.
    t.janela_funda(c, e, CX - 11, 134, 6, 12, luzes, 0.3)
    t.janela_funda(c, e, CX + 5, 134, 6, 12, luzes, 0.26, cortina=True)
    for k in range(8):
        c.p(CX - 12 + k, 145 - (k % 2), ["#e86a6a", "#ffd86a", "#f4a7c4", "#ffffff"][k % 4])
        c.p(CX - 12 + k, 146 - (k % 2), "#4a7a3a")
    px0, py0, pw = CX - 7, 158, 14
    porta = poligono_m([(px0, BASE), (px0, py0 + 6), (px0 + pw, py0 + 6), (px0 + pw, BASE)])
    porta = np.maximum(porta, elipse_m(CX - 0.5, py0 + 6, pw / 2, 6) * (_YS <= py0 + 6))
    madeira = np.zeros((H, W, 3), dtype=np.float32) + hexa("#6e4024")
    madeira = madeira * (0.8 + 0.35 * ruido(41, 1, 6))[:, :, None]
    madeira = madeira * (1 - (np.mod(_XS - px0, 4) == 0) * 0.45)[:, :, None]
    madeira = madeira * (1 - np.clip((_XS - (px0 + pw * 0.6)) / pw, 0, 1) * 0.4)[:, :, None]
    c.mascara(porta, madeira)
    vao = (desfocar(porta[:, :, None], 0.9)[:, :, 0] > 0.04) & (porta == 0) & (_YS < BASE) & (_YS > py0 - 3)
    marcar(c, vao, "#d6c6b0")
    for yb_ in (py0 + 9, py0 + 17):
        c.ret(px0 + 1, yb_, pw - 1, 2, "#2a2a32")
        c.ret(px0 + 1, yb_, pw - 1, 1, "#6a6a78")
        for k in range(px0 + 2, px0 + pw, 3):
            c.p(k, yb_ + 1, "#a8a8b8")
    c.disco(CX + 3.5, py0 + 14, 1.2, ("#ffe8a0", "#a8742a", "#4a2a10"))
    c.ret(CX, py0 + 1, 1, BASE - py0 - 1, "#2a1a10", 0.6)
    for sx in (px0 - 6, px0 + pw + 3):
        c.ret(sx, py0 + 1, 3, 1, "#1e1a20")
        c.ret(sx, py0 + 2, 1, 5, "#2a2430")
        c.ret(sx + 2, py0 + 2, 1, 5, "#2a2430")
        c.ret(sx, py0 + 7, 3, 1, "#1e1a20")
        e.ret(sx + 1, py0 + 2, 1, 5, "#ffd890")
        e.p(sx + 1, py0 + 3, "#ffffff")
        luzes.append((sx + 1, py0 + 5, 15, 1.0, "#ffb060", 0.5))
        ANC["janelas"].append((sx + 1, py0 + 4, 10))
    for (i, (dy, mg)) in enumerate(((0, 3), (2, 6))):
        y = BASE + dy
        c.ret(px0 - mg, y, pw + 2 * mg, 2, "#a89a90" if i else "#b8aaa0")
        c.ret(px0 - mg + 1, y, pw + 2 * mg - 2, 1, "#e6dac8")
    g = np.random.default_rng(12)
    for k in range(110):
        y = BASE - g.random() ** 1.6 * 62
        x = XA - 1 + g.random() * 6 * (1 - (BASE - y) / 68)
        c.p(x, y, ["#5a8a4a", "#3e6a3a", "#7aa85a", "#2e5230"][k % 4])


def barril(c: Camada, x: int, yb: int, w: int = 7, h: int = 9) -> None:
    for j in range(h):
        bojo = 1 if 1 < j < h - 2 else 0
        for i in range(-bojo, w + bojo):
            u = (i + bojo) / (w + 2 * bojo - 1)
            cor = "#c8925a" if u < 0.2 else "#a06a3a" if u < 0.55 else "#74482a" if u < 0.85 else "#4a2c1c"
            if (i + bojo) % 2 == 1:
                cor = mistura(cor, "#2a1a10", 0.18)
            if j in (1, h - 3):
                cor = "#6a6a78" if u < 0.3 else "#3a3a46"
            c.p(x + i, yb - h + 1 + j, cor)
    c.ret(x, yb - h, w, 1, "#d8aa72")
    c.ret(x + 1, yb - h, w - 2, 1, "#8a5a34")


def caixote(c: Camada, x: int, yb: int, w: int = 8, h: int = 7) -> None:
    c.ret(x, yb - h + 1, w, h, "#9a6c40")
    c.ret(x, yb - h + 1, w, 1, "#d4a46c")
    c.ret(x, yb - h + 1, 1, h, "#c08c56")
    c.ret(x + w - 1, yb - h + 2, 1, h - 1, "#5a3a22")
    c.ret(x, yb, w, 1, "#5a3a22")
    c.linha(x + 1, yb - h + 2, x + w - 2, yb - 1, "#6a4428")
    c.linha(x + 1, yb - 1, x + w - 2, yb - h + 2, "#7a5230")


def carroca(c: Camada, x: int, yb: int) -> None:
    """Carroça de feno parada à beira da estrada: caixa de tábuas, varais apoiados no chão e duas rodas raiadas."""
    c.ret(x, yb - 9, 16, 5, "#8a5a34")
    c.ret(x, yb - 9, 16, 1, "#c08a54")
    for k in range(x + 3, x + 16, 4):
        c.ret(k, yb - 8, 1, 4, "#5a3820")
    c.ret(x, yb - 5, 16, 1, "#4a2e1c")
    c.linha(x - 1, yb - 6, x - 8, yb, "#7a5230")
    c.linha(x - 1, yb - 5, x - 8, yb + 1, "#4a2e1c")
    for (dx, dy, r) in ((2, -11, 3.2), (7, -12.5, 4.2), (12, -11.5, 3.4)):  # o feno
        c.disco(x + dx, yb + dy, r, ("#f4d67a", "#d8ae4e", "#a47a30"), granulado=0.9)
    c.ret(x, yb - 9, 16, 1, "#c08a54")
    for wx in (x + 3, x + 12):
        for a in range(24):
            an = a / 24 * math.tau
            c.p(wx + math.cos(an) * 3.4, yb - 2.5 + math.sin(an) * 3.4, "#3a2618" if math.sin(an) > -0.3 else "#8a6240")
        for a in range(4):
            an = a / 4 * math.pi + 0.3
            c.linha(wx - math.cos(an) * 2.4, yb - 2.5 - math.sin(an) * 2.4, wx + math.cos(an) * 2.4, yb - 2.5 + math.sin(an) * 2.4, "#6a4428")
        c.p(wx, yb - 2.5, "#d8b070")


def placa(c: Camada, x: int, yb: int) -> None:
    """Poste de sinalização de madeira, sem texto: duas tábuas em seta (uma para o castelo, outra para a vila)."""
    c.ret(x, yb - 24, 2, 25, "#6a4628")
    c.ret(x, yb - 24, 1, 25, "#a87a48")
    c.ret(x - 1, yb - 25, 4, 1, "#3a2618")
    for (y0, dir_, comp) in ((yb - 22, -1, 13), (yb - 16, 1, 11)):
        xa = x - comp + 3 if dir_ < 0 else x - 2
        c.ret(xa, y0, comp, 4, "#b8864e")
        c.ret(xa, y0, comp, 1, "#e0b278")
        c.ret(xa, y0 + 3, comp, 1, "#6a4628")
        ponta = xa - 1 if dir_ < 0 else xa + comp
        c.ret(ponta, y0 + 1, 1, 2, "#b8864e")
        c.p(ponta + dir_, y0 + 1, "#b8864e")
        c.p(ponta + dir_, y0 + 2, "#6a4628")
        c.p(x, y0 + 1, "#2a1a10")
        c.p(x + 1, y0 + 2, "#2a1a10")
        for k in range(xa + 2, xa + comp - 1, 3):  # veios da madeira (nada escrito)
            c.p(k, y0 + 2, "#9a6c3c", 0.6)
    c.p(x - 1, yb, "#4a6a38")
    c.p(x + 2, yb, "#5a7a40")
    c.p(x + 3, yb, "#4a6a38")


def casinha(c: Camada, e: Camada, x0: int, w: int, yb: int, par: int, tel: int, seed: int, telha=("#d07850", "#a8563c", "#74382c"),
            chamine: bool = True, luzes: list | None = None) -> None:
    """Casa pequena da aldeia ao pé do platô: sapata de pedra, reboco com enxaimel, telhado de duas águas, janela."""
    yt = yb - par
    for y in range(yt, yb + 1):
        for x in range(x0, x0 + w):
            u = (x - x0) / (w - 1)
            cor = mistura("#f0e2c4", "#b8a488", u * 0.8 + hash01(x, y, seed) * 0.12)
            if y >= yb - 1:
                cor = mistura("#a09484", "#6e645c", u)
            c.p(x, y, cor)
    c.ret(x0, yt, w, 1, "#5a3a26")
    c.ret(x0, yt, 1, par - 1, "#5a3a26")
    c.ret(x0 + w - 1, yt, 1, par - 1, "#3e2a1e")
    c.ret(x0 + w // 2, yt, 1, par - 1, "#5a3a26")
    for j in range(tel + 1):
        f = j / tel
        hf = 0.5 + f * (w / 2 + 1.5)
        cxm = x0 + (w - 1) / 2
        for x in range(int(round(cxm - hf)), int(round(cxm + hf)) + 1):
            u = (x - cxm) / max(1, hf)
            cor = telha[0] if u < -0.2 else telha[1] if u < 0.45 else telha[2]
            if j % 2 == 1 and abs(u) < 0.9:
                cor = mistura(cor, "#3a1c1c", 0.25)
            if j == tel and abs(u) <= 1:
                cor = telha[2]
            c.p(x, yt - tel + j - 1, cor)
        c.p(int(round(cxm - hf)), yt - tel + j - 1, "#ffd0aa")
    wx = x0 + 2
    c.ret(wx, yt + 2, 2, 2, "#3a2a22")
    e.ret(wx, yt + 2, 2, 2, "#ffc468")
    c.ret(x0 + w - 4, yb - 3, 2, 3, "#5a3420")
    if chamine:
        chx = x0 + w - 4
        c.ret(chx, yt - tel - 1, 2, 4, "#8a6a60")
        c.p(chx, yt - tel - 1, "#c09a8a")
        c.ret(chx - 1, yt - tel - 2, 4, 1, "#4a3434")
        ANC["chamines"].append((chx + 1, yt - tel - 3, 0.5))
    if luzes is not None:
        luzes.append((wx + 1, yt + 3, 8, 1.0, "#ffb060", 0.4))


def moinho(c: Camada, e: Camada, x: int, yb: int) -> None:
    """Moinho de vento no ombro do platô: corpo de pedra caiada que afina, capelo de madeira e quatro velas treliçadas."""
    alt = 13
    for j in range(alt):
        hf = 2.2 + j * 0.13
        for dx in range(-int(round(hf)), int(round(hf)) + 1):
            u = (dx + hf) / (2 * hf)
            cor = "#f6ecd4" if u < 0.22 else "#dccdb0" if u < 0.55 else "#aa9a88" if u < 0.85 else "#7e7270"
            if j % 4 == 3:
                cor = mistura(cor, "#5a5058", 0.18)
            c.p(x + dx, yb - alt + j + 1, cor)
    for (dx, dy, cor) in ((-2, -alt - 1, "#8a5a3a"), (-1, -alt - 2, "#a06a44"), (0, -alt - 3, "#a06a44"), (1, -alt - 2, "#6a4228"), (2, -alt - 1, "#5a3620"),
                          (-1, -alt - 1, "#8a5a3a"), (0, -alt - 1, "#7a4e30"), (1, -alt - 1, "#5a3620"), (0, -alt - 2, "#8a5a3a"), (-3, -alt, "#5a3620"),
                          (-2, -alt, "#7a4e30"), (-1, -alt, "#7a4e30"), (0, -alt, "#6a4228"), (1, -alt, "#5a3620"), (2, -alt, "#4a2c1c"), (3, -alt, "#4a2c1c")):
        c.p(x + dx, yb + dy, cor)
    c.ret(x, yb - 2, 1, 3, "#4a2e1e")
    c.ret(x - 1, yb - 8, 1, 2, "#33283a")
    e.ret(x - 1, yb - 8, 1, 2, "#ffc468")
    hx, hy = x, yb - alt - 0.5
    for k in range(4):
        a = math.radians(24 + 90 * k)
        ux, uy = math.cos(a), math.sin(a)
        for dd in np.linspace(1, 10.5, 30):
            c.p(hx + ux * dd, hy + uy * dd, "#5a3e2a")
            if dd > 3.2:
                c.p(hx + ux * dd - uy * 1.3, hy + uy * dd + ux * 1.3, "#f4ead0" if int(dd) % 2 else "#cfc0a0")
                c.p(hx + ux * dd - uy * 2.4, hy + uy * dd + ux * 2.4, "#d8ccb0" if int(dd) % 2 == 0 else "#a89a84", 0.9)
    c.p(hx, hy, "#2a1a14")


def ponte(c: Camada, e: Camada, luzes: list) -> None:
    """Ponte de pedra em arco, de perfil: parapeito do fundo, tabuleiro, parapeito da frente com capeamento claro,
    tímpano em cantaria, aduelas com a chave saliente, intradorso em sombra e pilaretes com lampiões."""
    xw, xe, xc = 238, 276, 257
    def yd(x: float) -> float:
        return 169.5 + (x - xw) * 0.06 - 3.0 * math.sin(math.pi * (x - xw) / (xe - xw))
    for x in range(xw - 2, xe + 3):
        d = int(round(yd(min(max(x, xw), xe))))
        fora = abs(x - xc) - 11
        fundo = int(round(180 - max(0, fora) * 0.8))
        u = (x - xw) / (xe - xw)
        if xw + 3 <= x <= xe - 3:  # parapeito do fundo
            c.p(x, d - 4, "#d8ccb4")
            c.p(x, d - 3, "#9e9080" if x % 4 else "#857868")
        for y in range(d - 2, d + 1):  # tabuleiro
            c.p(x, y, mistura("#dcbc8c", "#b8946a", hash01(x, y, 5) * 0.8))
        c.p(x, d + 1, "#fff6dc")  # capeamento
        c.p(x, d + 2, "#eadcc0" if x % 5 else "#b8aa94")
        for y in range(d + 3, fundo + 1):
            dentro = ((x - xc) / 9.0) ** 2 + ((y - 180) / 7.5) ** 2
            if dentro <= 1.0:
                if ((x - xc - 1.6) / 8.2) ** 2 + ((y - 181.2) / 7.2) ** 2 > 1.0:
                    c.p(x, y, "#4a4250" if x < xc else "#6a5e62")  # intradorso
                continue
            fi = (y - d) // 3
            col = (x + (fi % 2) * 3) // 5
            k = hash01(col, fi, 55)
            tt = 0.15 + u * 0.3 + (k - 0.5) * 0.35 + (y - d) * 0.02
            cor = hexa(["#f0e2c6", "#dccbac", "#c4b296", "#aa9a84", "#8e8072", "#74685f"][int(min(5.99, max(0, tt * 6)))])
            if (y - d) % 3 == 2 or (x + (fi % 2) * 3) % 5 == 4:
                cor = cor * 0.84
            if dentro <= 1.42:  # aduelas
                an = math.atan2(y - 180, x - xc)
                cor = hexa("#f8ecd0" if int(an * 5) % 2 else "#d8c8aa")
                if dentro > 1.3:
                    cor = cor * 0.8
            if y > fundo - 2 and hash01(x, y, 56) > 0.5:
                cor = cor * 0.6 + hexa("#56743e") * 0.4
            c.p(x, y, cor)
    c.ret(xc - 1, 170, 3, 3, "#fff6dc")  # a chave do arco
    c.ret(xc + 1, 171, 1, 2, "#b8aa94")
    for px in (xw - 2, xe):  # pilaretes
        d = int(round(yd(min(max(px, xw), xe))))
        c.ret(px, d - 3, 3, 6, "#d4c6ac")
        c.ret(px, d - 3, 1, 6, "#fff6dc")
        c.ret(px + 2, d - 2, 1, 5, "#8e8072")
        c.ret(px - 1, d - 4, 5, 1, "#f0e4c8")
        lampiao(c, e, px + 1, d - 4, 0.34, luzes)
        ANC["lampioes"].append((px + 1, d - 16, 12))


# ─────────────────────────────── As camadas (iguais nas três horas) ───────────────────────────────
RIACHO = [(358, 152.5), (340, 151.5), (318, 151.5), (296, 152.5), (277, 154), (266, 159), (260, 168), (256, 178), (249, 188), (238, 202)]
S0 = [(284, 207), (297, 198), (310, 192), (322, 187.5)]
S1 = [(366, 191.5), (342, 190), (322, 187.5), (305, 182), (288, 175.5), (275, 171.5)]
S3 = [(239, 168.5), (227, 166.5), (217, 162), (212.5, 155), (216, 149.5), (228, 146.5), (242, 145), (252, 144.5)]


def crista_encosta(x: float) -> float:
    return 97 + 54 * min(1.0, max(0.0, x) / 206) ** 1.22


def pintar() -> dict:
    L: dict = {}
    luzes: list = []
    xs = np.arange(W, dtype=np.float32)
    g = np.random.default_rng(7)

    # ── Serras ao longe (duas cristas, facetas de luz do lado esquerdo).
    def serra(crista: np.ndarray, alt: float, seed: int) -> Camada:
        cam = Camada()
        n = ruido(seed, 9, 6)
        d = _YS - crista[None, :]
        lit = (np.gradient(crista) < 0)[None, :]
        val = np.clip(d / alt, 0, 1) * 0.55 + np.where(lit & (d < 6 + n * 12), 0.0, 0.3) + (n - 0.5) * 0.25
        cor = hexa("#c8c0d0")[None, None] * (1 - np.clip(val, 0, 1))[:, :, None] + hexa("#565470")[None, None] * np.clip(val, 0, 1)[:, :, None]
        marcar(cam, d >= 0, cor.astype(np.float32))
        return cam
    r1 = ruido(11, 5)[3]
    c1 = 101 - 13 * np.exp(-((xs - 118) / 55) ** 2) - 9 * np.exp(-((xs - 410) / 44) ** 2) - 7 * np.exp(-((xs - 215) / 26) ** 2) \
        + 4 * np.sin(xs / 23) + 2.5 * np.sin(xs / 8 + 1) + (r1 - 0.5) * 5
    L["serra1"] = serra(c1, 26, 12)
    c2 = 116 + 3.5 * np.sin(xs / 31 + 2) + 2 * np.sin(xs / 11) - 6 * np.exp(-((xs - 170) / 40) ** 2) - 4 * np.exp(-((xs - 440) / 40) ** 2)
    s2 = serra(c2, 20, 13)
    for _ in range(150):  # arvoredo na crista
        x = int(g.random() * W)
        y0 = c2[x] + 1 + g.random() * 8
        alt = 3 + int(g.random() * 5)
        for j in range(alt):
            for dx in range(-(j // 2), j // 2 + 1):
                s2.p(x + dx, y0 - alt + j, "#6a6a80" if dx < 0 else "#484a60")
    L["serra2"] = s2

    # ── O vale: pasto em retalhos, a lavoura em fileiras, o trigo, flores e pedras.
    campo = Camada()
    n1, n2 = ruido(21, 11, 5), ruido(22, 3, 2)
    vv = n1 * 0.65 + n2 * 0.35
    idx = (vv > 0.44).astype(int) + (vv > 0.6).astype(int)
    perto = np.array([hexa(k) for k in ("#44703a", "#588840", "#70a04e")])[idx]
    longe = np.array([hexa(k) for k in ("#6c8658", "#7e9862", "#94ac6e")])[idx]
    prof = np.clip((_YS - 128) / 62, 0, 1)[:, :, None] ** 0.8
    faixas = ((np.floor((_XS + _YS * 1.8) / (14 + (_YS - 128) * 0.5)) % 2) * 0.06)[:, :, None]  # roçado em faixas
    cor = (longe * (1 - prof) + perto * prof) * (1 - faixas * (1 - prof))
    marcar(campo, _YS >= 127, cor.astype(np.float32))
    lav = poligono_m([(293, 158), (346, 157), (350, 174), (301, 173)])
    u = (_XS - 320) / np.maximum(_YS - 118, 1)
    fil = np.floor(u * 15 + 100).astype(int)
    terra = np.where(((fil % 2) == 0)[:, :, None], hexa("#7a5a3a") * (0.9 + 0.25 * n2[:, :, None]), hexa("#78a84a") * (0.8 + 0.4 * n2[:, :, None]))
    marcar(campo, lav, terra.astype(np.float32))
    marcar(campo, (lav > 0) & ((fil % 2) == 1) & (n2 > 0.62), "#b4d466")
    trigo = poligono_m([(263, 146.5), (312, 145.5), (316, 150), (268, 151)])
    marcar(campo, trigo, np.where(((_XS + _YS) % 3 == 0)[:, :, None], hexa("#b8923e"), hexa("#e2c060") * (0.85 + 0.3 * n2[:, :, None])).astype(np.float32))
    # ── O riacho (a cor vem do céu, na montagem) e as margens.
    riacho = curva(RIACHO, 60)
    UA = campo_dist(riacho, lambda y: 1.3 + max(0.0, y - 153) * 0.2, achat=0.5, min_ry=0.9)
    agua = UA <= 1
    margem = (UA <= 1.5) & ~agua
    marcar(campo, margem, np.where((n2 > 0.5)[:, :, None], hexa("#6a5a40"), hexa("#3c5a34")).astype(np.float32))
    L["agua"], L["agua_u"] = agua, UA
    # ── A estrada no vale (do primeiro plano até o pé do platô).
    US = np.minimum(np.minimum(campo_dist(curva(S0, 60), hw_chao), campo_dist(curva(S1, 60), hw_chao)), campo_dist(curva(S3, 60), hw_chao))
    pintar_estrada(campo, US, 31)
    L["estrada_u"] = US
    livre = (US > 1.25) & (UA > 1.6) & (lav == 0)
    for _ in range(520):  # capim, flores e pedrinhas
        x, y = int(190 + g.random() * 170), int(150 + g.random() * 50)
        if not livre[y, x]:
            continue
        k = g.random()
        if k < 0.5:
            campo.p(x, y, "#3c6234")
            campo.p(x, y - 1, "#8cbc5c")
        elif k < 0.86 and y > 164:
            campo.p(x, y, ["#fff4e0", "#ffd86a", "#f4a7c4", "#ff8a6a", "#e8e0ff"][int(g.random() * 5)])
            campo.p(x, y + 1, "#3c6234")
        elif y > 160:
            campo.p(x, y, "#cfc4b0")
            campo.p(x + 1, y, "#8a7e72")
            campo.p(x, y + 1, "#2c4430", 0.5)
    for (x, y, s) in ((330, 196, 1.0), (289, 169, 0.7), (222, 160, 0.6), (232, 142.5, 0.4), (350, 197, 1.0)):
        marco(campo, x, y, s)
    L["campo"] = campo

    # ── A encosta arborizada da esquerda (em sombra: o fundo do texto).
    enc = Camada()
    ne = ruido(41, 9, 5)
    crista = np.array([crista_encosta(x) + (ne[100, min(W - 1, int(x))] - 0.5) * 5 for x in range(W)], dtype=np.float32)
    m_enc = (_YS >= crista[None, :]) & (_XS < 208)
    marcar(enc, m_enc, np.where((ne > 0.5)[:, :, None], hexa("#24403a"), hexa("#1a3232")).astype(np.float32))
    tons_p = (("#3c5e48", "#2a4a3c", "#1a3230"), ("#35573f", "#264438", "#182e2e"), ("#44664a", "#2e4e3e", "#1c3432"))
    arvs = []
    for _ in range(330):
        x = -6 + g.random() * 214
        yc = crista_encosta(x)
        yb = yc + 3 + (g.random() ** 1.4) * (H + 10 - yc)
        arvs.append((yb, x, g.random()))
    for (yb, x, k) in sorted(arvs):
        esc = 0.75 + (yb - 100) / 100 * 0.9
        if k < 0.78:
            pinheiro(enc, x, yb, int((9 + k * 9) * esc), tons_p[int(k * 97) % 3], int(k * 1000))
        else:
            arvore(enc, x, yb, (3.5 + k * 3) * esc, ("#456a48", "#2e4e3c", "#1a3230"), "#1e1a1c")
    L["encosta"] = enc

    # ── O platô, o castelo, a estrada do morro.
    pl, cast, e_cast, flags, morro = Camada(), Camada(), Camada(), Camada(), Camada()
    plato(pl)
    castelo(cast, e_cast, flags, luzes)
    gb = np.random.default_rng(79)
    for _ in range(34):  # a rocha e o mato sobem na fundação (o castelo nasce do platô)
        x = 244 + gb.random() * 106
        if 290 < x < 304:
            continue
        y = base_muralha(x) + 3 + gb.random() * 2.5
        if gb.random() < 0.55:
            cast.disco(x, y, 1.2 + gb.random() * 1.3, ("#94b860", "#628a46", "#3a6238"))
        else:
            cast.disco(x, y + 0.5, 1.3 + gb.random() * 1.2, ("#f0e0be", "#b8a488", "#74666a"))
    estrada_do_morro(morro, e_cast, luzes)
    moinho(pl, e_cast, 223, 133)
    L.update(plato=pl, castelo=cast, e_cast=e_cast, flags=flags, morro=morro)

    # ── O plano do meio: aldeia ao pé do platô, árvores, ponte, cercas, carroça, placa, varal.
    meio, e_meio = Camada(), Camada()
    for (x, yb, alt) in ((319, 148, 9), (353, 149, 11), (357, 150, 9)):
        alamo(meio, x, yb, alt)
    casinha(meio, e_meio, 322, 11, 148, 5, 5, 1, luzes=luzes)
    casinha(meio, e_meio, 338, 13, 149, 6, 6, 2, telha=("#c8845a", "#9c5c40", "#6c3c2e"), luzes=luzes)
    for k, cor in enumerate(("#f6f0e4", "#c8443a", "#f0d890", "#f6f0e4")):  # varal entre as duas casinhas
        meio.p(333 + k, 143, "#5a4a40")
        if k % 3 != 2:
            meio.p(333 + k, 144, cor)
    for a in range(16):  # a roda d'água
        an = a / 16 * math.tau
        meio.p(350.5 + math.cos(an) * 3, 149.5 + math.sin(an) * 3, "#5a3a24" if a % 2 else "#8a6240")
    meio.linha(348, 149.5, 353, 149.5, "#6a4428")
    meio.linha(350.5, 147, 350.5, 152, "#6a4428")
    for (x, yb, r, escuro) in ((285, 151, 2.6, 0), (303, 150, 2.2, 0), (250, 153, 3.0, 0), (286, 166, 3.6, 0), (352, 166, 5.5, 0), (346, 170, 4.2, 0),
                               (206, 166, 5.0, 1), (198, 178, 6.0, 1), (216, 184, 5.5, 1), (232, 180, 4.4, 0), (228, 197, 5.0, 0), (268, 190, 4.6, 0)):
        campo.elipse(x + r * 0.7, yb + 0.6, r * 1.1, max(1.0, r * 0.32), "#16261e", 0.34)
        arvore(meio, x, yb, r, ("#5a8448", "#3c6640", "#244636") if escuro else ("#8ab65a", "#5c8c44", "#356236"))
    ponte(meio, e_meio, luzes)
    cerca(meio, 300, 176.5, 349, 177.5, 3)
    cerca(meio, 196, 173, 233, 172, 3)
    cerca(meio, 331, 199, 356, 198, 4)
    for (hx, hy) in ((272, 186), (279, 189)):  # medas de feno
        meio.disco(hx, hy - 2, 3.0, ("#f4d67a", "#d8ae4e", "#a47a30"), granulado=0.9)
        meio.ret(hx - 3, hy, 7, 1, "#8a6a30")
        campo.elipse(hx + 2.5, hy + 1, 3.5, 1.2, "#16261e", 0.3)
    campo.elipse(309, 186.5, 12, 2.2, "#16261e", 0.32)
    carroca(meio, 297, 185)
    campo.elipse(327, 198.4, 5, 1.4, "#16261e", 0.3)
    placa(meio, 322, 198)
    lampiao(meio, e_meio, 293, 178, 0.6, luzes)
    ANC["lampioes"].append((293.5, 178 - 23, 22))
    lampiao(meio, e_meio, 219, 150, 0.36, luzes)
    ANC["lampioes"].append((219.5, 150 - 13, 13))
    L.update(meio=meio, e_meio=e_meio)

    # ── A praça de paralelepípedos em arcos.
    praca_m = (((_XS - 376) / 34) ** 2 + ((_YS - 197) / 12) ** 2 < 1) | ((_XS > 352) & (_YS > 183))
    par = Camada()
    ccx, ccy = CX - 20, BASE + 150
    for y in range(180, H):
        for x in range(338, W):
            if not praca_m[y, x]:
                continue
            dx, dy = x - ccx, (y - ccy) * 2.0
            rr = math.hypot(dx, dy)
            ang = math.atan2(dx, -dy)
            alt = 2.2 + (y - 170) * 0.05
            fr = rr / alt - int(rr / alt)
            larg = (3.2 + (y - 170) * 0.07) / max(rr, 1)
            fc = ang / larg + hash01(int(rr / alt), 1, 41)
            col = int(math.floor(fc))
            fx = fc - col
            k = hash01(col, int(rr / alt), 41)
            if fr > 0.78 or fx > 0.84:
                cor_ = "#5e5652" if k > 0.2 else "#5a7046"
            elif fr < 0.22 or fx < 0.14:
                cor_ = "#e2d6c6" if k > 0.3 else "#cabcac"
            else:
                cor_ = ["#aa9e92", "#b8ac9e", "#9c9088", "#c4b6a6", "#a49a8c", "#8a9a72"][int(k * 5.6)]
            par.p(x, y, cor_)
    borda_p = praca_m & ~(np.roll(praca_m, 2, 0) & np.roll(praca_m, -2, 1) & np.roll(praca_m, 2, 1))
    marcar(par, borda_p & (_YS > 180), "#6a5e56")
    L["praca"] = par

    # ── As casas, a torre do relógio e os objetos da praça.
    pr, em, rel, camp, obj = Camada(), Camada(), Camada(), Camada(), Camada()
    t.casa(pr, em, 378, 408, 178, 140, 120, luzes, 54, reboco=("#c0b49c", "#84786a"), telha=("#a05640", "#783e30", "#502420"),
           janelas=(0.4,), chamine=0.3, pedra_baixo=True)
    ANC["chamines"].append((378 + 9 + 2, 111, 1.0))
    t.casa(pr, em, 358, 402, 185, 150, 126, luzes, 51, janelas=(0.26, 0.72), portinha=0.56, chamine=0.76)
    ANC["chamines"].append((358 + 33 + 2, 124, 1.0))
    ANC["janelas"] += [(358 + 11, 162, 13), (358 + 31, 162, 13)]
    # janela do térreo, com floreira
    pr.ret(363, 172, 9, 9, "#3a2a22")
    em.ret(364, 173, 7, 7, "#ffbe66")
    em.ret(365, 174, 2, 2, "#ffeec4")
    for cam in (pr, em):
        cam.ret(367, 173, 1, 7, "#3a2418")
    pr.ret(362, 181, 11, 1, "#c8baa8")
    for k in range(10):
        pr.p(362 + k, 180 - (k % 2), ["#f07a6a", "#ffe07a", "#f4a7c4", "#ffffff"][k % 4])
    luzes.append((367, 178, 14, 0.9, "#ffaa50", 0.3))
    t.casa(pr, em, 452, 504, 187, 148, 120, luzes, 53, reboco=("#d4c6aa", "#928470"), telha=("#b86044", "#8a4430", "#5a2a22"),
           janelas=(0.22, 0.6), portinha=0.16, chamine=None)
    ANC["janelas"].append((452 + 11, 160, 13))
    torre_relogio(pr, em, rel, camp, luzes)
    # varal entre a casa e um poste: roupas lisas ao vento
    obj.ret(343, 160, 1, 27, "#6a4628")
    obj.p(343, 159, "#a87a48")
    for i in range(16):
        x = 343 + i
        y = 161 + math.sin(i / 15 * math.pi) * 2.2
        obj.p(x, y, "#4a3a30")
        peca = [None, "#f6f0e4", "#f6f0e4", "#f6f0e4", None, "#c8443a", "#c8443a", None, "#f0d890", "#f0d890", "#f0d890", None, "#3e7a6a", "#3e7a6a", None, None][i]
        if peca:
            for j in range(1, 5 if i % 5 else 4):
                obj.p(x, y + j, peca if j < 4 else mistura(peca, "#3a3040", 0.3))
    lampiao(obj, em, 376, 191, 0.85, luzes)
    ANC["lampioes"].append((377, 191 - 30, 30))
    barril(obj, 449, 190, 7, 9)
    barril(obj, 457, 192, 7, 10)
    caixote(obj, 441, 191, 8, 7)
    caixote(obj, 443, 184, 6, 5)
    for (x0_, x1_) in ((XA - 14, XA - 4), (XB + LADO + 1, XB + LADO + 3)):
        obj.ret(x0_, BASE - 2, x1_ - x0_, 3, "#7a6a5a")
        obj.ret(x0_, BASE - 2, x1_ - x0_, 1, "#b8a890")
        for _ in range(46):
            obj.p(x0_ + g.random() * (x1_ - x0_), BASE - 3 - g.random() * 6 * g.random(), ["#3e6a36", "#5a8a48", "#2e5230"][int(g.random() * 3)])
        for _ in range(8):
            obj.p(x0_ + g.random() * (x1_ - x0_), BASE - 4 - g.random() * 4, ["#f4a7c4", "#ffe07a", "#ffffff", "#f07a6a"][int(g.random() * 4)])
    L.update(predios=pr, emiss=em, rel=rel, sino=camp, objetos=obj)

    # ── Primeiro plano desfocado: folhagem no canto esquerdo.
    fr = Camada()
    for (cx_, cy_, rr) in ((-8, 196, 24), (30, 205, 18), (66, 210, 13)):
        fr.disco(cx_, cy_, rr, ("#4a7a44", "#345e38", "#20402a"))
    for _ in range(120):
        x = g.random() * 104
        alt = 5 + g.random() * 16
        inc = (g.random() - 0.5) * 0.7
        for j in range(int(alt)):
            fr.p(x + inc * j, H - 1 - j, "#3e6a38" if j > alt * 0.5 else "#264428")
    L["frente"] = fr
    vag = Camada()
    for _ in range(26):
        vag.p(200 + g.random() * 160, 150 + g.random() * 44, "#f0ff9a", 0.5 + g.random() * 0.4)
    L["vagalumes"] = vag
    L["luzes"] = luzes
    return L


# ─────────────────────────────── O céu e a montagem ───────────────────────────────
def ceu() -> np.ndarray:
    sx, sy = SOL[P]
    if P == "manha":
        par = [(0, "#2f5a9e"), (36, "#5c8cc8"), (66, "#a4c0d8"), (88, "#ecd8b4"), (106, "#ffdc9c"), (200, "#ffe0a8")]  # manhã dourada: o Tales pede luz quente
        kw = dict(sol=(sx, sy, 5, "#ffcf7a", 0.6, 120), seed=511,
                  nuvens=dict(yc=54, esp=48, limiar=0.57, ex=38, ey=8, luz="#fff2d0", sombra="#a4b0cc", miolo="#f0e2d0", lado_luz=-1, luz_dy=1, forca=0.92))
    elif P == "tarde":
        par = [(0, "#22386e"), (26, "#445288"), (50, "#a8707e"), (72, "#ec9060"), (92, "#ffba6c"), (108, "#ffe4a4"), (200, "#ffdca0")]
        kw = dict(sol=(sx, sy, 6, "#ffae4c", 0.8, 150), seed=512,
                  nuvens=dict(yc=58, esp=42, limiar=0.55, ex=46, ey=5, luz="#ffeeb0", sombra="#8e5468", miolo="#e08468", lado_luz=-1, luz_dy=1, forca=0.92))
    else:
        par = [(0, "#040818"), (40, "#0a1434"), (84, "#16244e"), (110, "#24366a"), (130, "#30447a"), (200, "#30447a")]
        kw = dict(lua=(sx, sy, 6, True), estrelas=210, seed=513,
                  nuvens=dict(yc=70, esp=34, limiar=0.6, ex=50, ey=4, luz="#96a6dc", sombra="#161e48", miolo="#283464", lado_luz=-1, luz_dy=-1, forca=0.75))
    com = ceu_hora(par, **kw)
    sem = ceu_hora(par, **{k: val for k, val in kw.items() if k != "nuvens"})
    k = (0.2 + 0.8 * suave_np(150, 270, _XS))[:, :, None]  # o céu do lado do texto fica limpo
    c = sem * (1 - k) + com * k
    if P != "noite":  # pássaros
        cor = hexa("#3a3044" if P == "tarde" else "#4a5670")
        for (bx, by, tam) in ((352, 36, 2), (362, 41, 1), (343, 44, 1), (372, 33, 1), (300, 16, 1), (232, 44, 1), (384, 50, 2)):
            pts = [(-2, 0), (-1, -1), (0, 0), (1, -1), (2, 0)] if tam == 2 else [(-1, -1), (0, 0), (1, -1)]
            for (dx, dy) in pts:
                c[by + dy, bx + dx] = c[by + dy, bx + dx] * 0.3 + cor * 0.7
    return c.astype(np.float32)


def camada_agua(ceu1: np.ndarray, L: dict) -> Camada:
    """O riacho reflete o céu: cada pixel busca a linha do céu espelhada no horizonte, com ondas e margens escuras."""
    agua, UA = L["agua"], L["agua_u"]
    yr = np.clip(112 - (_YS - 150) * 1.05, 0, H - 1).astype(int)
    xi = np.clip(_XS + np.sin(_YS * 1.7) * 1.5, 0, W - 1).astype(int)
    cor = ceu1[yr, xi] * np.array([0.8, 0.86, 0.94], dtype=np.float32)
    n = ruido(61, 5, 1)
    onda = ((np.mod(_YS * 5 + _XS, 9) < 3) & (n > 0.55))[:, :, None]
    cor = np.where(onda, np.minimum(1.2, cor * 1.22 + 0.04), cor)
    borda = np.clip((UA - 0.62) / 0.38, 0, 1)[:, :, None]
    cor = cor * (1 - borda * 0.5) + hexa("#22382e") * borda * 0.5
    sob = (((_XS - 257) / 9.0) ** 2 + ((_YS - 180) / 7.5) ** 2 <= 1) | ((np.abs(_XS - 259) < 10) & (_YS > 180) & (_YS < 185))
    cor = np.where(sob[:, :, None], cor * 0.5 + hexa("#1a2630") * 0.2, cor)  # a sombra e o reflexo da ponte
    if P == "noite":
        brilho_lua = (np.abs(_XS - (236 + (_YS - 190) * -0.8)) < 2.5) & (np.mod(_YS, 3) == 0) & (_YS > 172)
        cor = np.where(brilho_lua[:, :, None], hexa("#c8d4ff"), cor)
    cam = Camada()
    marcar(cam, agua, np.clip(cor, 0, 1.2).astype(np.float32))
    return cam


def montar(L: dict, com: bool) -> tuple[Image.Image, np.ndarray, np.ndarray]:
    """Monta a cena da hora P em 3x com a luz. Devolve a imagem e as máscaras (3x) do sino e dos estandartes."""
    luzes = list(L["luzes"])
    ceu1 = ceu()
    m = Montagem(ceu1)
    r1 = {"manha": [(0, "#6680aa"), (0.6, "#8ea6c8"), (1, "#d2deee")], "tarde": [(0, "#6a4460"), (0.55, "#9a5c66"), (1, "#ffb88c")],
          "noite": [(0, "#10162e"), (0.6, "#1c2650"), (1, "#50609a")]}[P]
    r2 = {"manha": [(0, "#3a5868"), (0.5, "#56788a"), (1, "#a8c0c4")], "tarde": [(0, "#3a2438"), (0.5, "#5e3648"), (1, "#c8705e")],
          "noite": [(0, "#080c22"), (0.5, "#121a3a"), (1, "#3e4e86")]}[P]
    s1, s2 = copia(L["serra1"]), copia(L["serra2"])
    remapear(s1, r1, 0.1)
    remapear(s2, r2, 0.22)
    m.camada(s1, 1.8)
    m.camada(s2, 0.7)
    ar, k_ar, mult = {"manha": ("#f0dcbc", 0.2, 1.02), "tarde": ("#f4a878", 0.2, 0.9), "noite": ("#1e2c5c", 0.26, 0.95)}[P]
    campo = copia(L["campo"])
    atmosfera(campo, ar, np.clip((158 - _YS) / 30, 0, 1) * k_ar * 1.1)
    m.camada(campo)
    m.camada(camada_agua(ceu1, L), solida=False)
    pl, cast, morro, flags = copia(L["plato"]), copia(L["castelo"]), copia(L["morro"]), copia(L["flags"])
    atmosfera(pl, ar, np.clip((150 - _YS) / 40, 0.25, 1) * k_ar * 1.05, mult)
    atmosfera(cast, ar, k_ar, mult)
    atmosfera(flags, ar, k_ar * 0.6, mult)
    atmosfera(morro, ar, k_ar * 0.8, mult)
    m.camada(pl)
    m.camada(cast)
    m.camada(morro)
    if com:
        m.camada(flags)
    if P == "manha":
        nevoa(m, 126, 156, "#eef0ec", 0.5, 311, x0=200)
    elif P == "noite":
        nevoa(m, 130, 154, "#34488a", 0.3, 311, x0=200)
    enc = L["encosta"]
    m.camada(enc, 0.5, escurecer={"manha": 0.9, "tarde": 0.78, "noite": 0.8}[P])
    meio, par, pr, obj, camp = L["meio"], L["praca"], L["predios"], L["objetos"], L["sino"]
    m.camada(meio)
    m.camada(par)
    m.camada(pr)
    m.camada(obj)
    if com:
        m.camada(camp)
    # sombras projetadas (sol baixo à esquerda) e oclusão de contato
    comp, cis = {"manha": (0.34, 0.75), "tarde": (0.5, 1.0), "noite": (0.22, 0.4)}[P]
    a = pr.c[:, :, 3]
    sombra = np.zeros((H, W), dtype=np.float32)
    for (xa, xb, base) in ((XA - 3, XB + LADO + 3, BASE), (358, 402, 185), (452, W, 187)):
        rec = np.zeros_like(a)
        rec[:int(base), xa:xb] = a[:int(base), xa:xb]
        sombra = np.maximum(sombra, sombra_projetada(rec, base, comp, cis))
    ao = np.zeros((H, W), dtype=np.float32)
    ao[BASE:BASE + 3, XA - 4:XB + LADO + 3] = 1
    ao[185:188, 358:402] = 1
    ao[187:190, 452:W] = 1
    for (xa, xb, yb) in ((441, 464, 191), (296, 314, 185)):
        ao[yb:yb + 2, xa:xb] = 0.8
    sombra = np.maximum(sombra, desfocar(ao[:, :, None], 1.2)[:, :, 0] * 0.8) * (_YS > 170)
    frentes = (enc, meio, pr, obj)
    e_cast, e_meio, emiss, rel = ocultar(L["e_cast"], *frentes), ocultar(L["e_meio"], pr, obj), L["emiss"], L["rel"]
    a_cast = np.clip(cast.c[:, :, 3], 0, 1)
    rim = ((a_cast > 0.5) & ~(np.roll(a_cast, 1, 1) > 0.5)).astype(np.float32)
    for f in frentes:
        rim *= 1 - np.clip(f.c[:, :, 3], 0, 1)
    rim3 = desfocar(ampliar(rim[:, :, None]), 0.7)[:, :, 0]
    a_pr = np.clip(pr.c[:, :, 3], 0, 1)
    rim_pr = ((a_pr > 0.5) & ~(np.roll(a_pr, 1, 1) > 0.5) & (_YS < 186)).astype(np.float32) * (1 - np.clip(obj.c[:, :, 3], 0, 1))
    rim_pr3 = desfocar(ampliar(rim_pr[:, :, None]), 1.0)[:, :, 0]
    if P == "manha":
        m.camada(apagar(emiss, pr))
        m.camada(rel)
        m.iluminar("#a8b4d2", [(CX, 72, 16, 1.0, "#ffc070", 0.12)], mapa=mapa_sol("#fff0d4", 0.66, sombra, 0.85))
        m.somar(rim3, "#fff2cc", 0.16)
    elif P == "tarde":
        m.camada(apagar(emiss, pr, vidro=("#3a2430", "#a8605a", "#ffd8a0"), aceso=0.6))
        fracas = [l[:5] + (l[5] * 0.36,) for l in luzes]
        poente = [(SOL[P][0], SOL[P][1] + 6, 230, 0.42, "#ff9a5a", 0.3)]
        m.iluminar("#8a7690", fracas + poente, mapa=mapa_sol("#ffb070", 0.62, sombra, 0.9))
        m.somar(rim3, "#ffbe78", 0.42)
        m.somar(rim_pr3, "#ffb070", 0.14)
        for (cam, al) in ((e_cast, 0.8), (e_meio, 0.7)):
            n = copia(cam)
            n.c[:, :, 3] *= al
            m.emissivo(n, 0, halo=0.35)
        m.emissivo(rel, 0, halo=0.1)
    else:
        fortes = [l[:5] + (l[5] * 1.25,) for l in luzes]
        m.iluminar("#2e3670", fortes + [(SOL[P][0], SOL[P][1], 280, 0.6, "#6a7ac8", 0.14)], mapa=mapa_sol("#7a8ad0", 0.2, sombra, 0.9))
        m.somar(rim3, "#9ab0f0", 0.12)
        m.emissivo(e_cast, 0, halo=0.9)
        m.emissivo(e_meio, 0, halo=0.8)
        m.emissivo(emiss, 0, halo=0.8)
        m.emissivo(rel, 0, halo=0.16)
        m.emissivo(ocultar(L["vagalumes"], pr, obj, meio), 0, halo=1.2)
    # feixes de sol com poeira (manhã e tarde)
    if P in ("manha", "tarde"):
        lim = 0.8 if P == "manha" else 0.66
        ceu_claro = np.clip((m.img.mean(2) - lim) * 3, 0, 1) * (1 - m.solido) * (_GYS < 118 * ESC)
        raios = raios_radiais(ceu_claro, SOL[P], alcance=0.7)
        m.somar(desfocar(raios[:, :, None], 6)[:, :, 0], "#ffe4a8" if P == "manha" else "#ffb070", 0.32 if P == "manha" else 0.55)
        feixe = poligono_m([(236, 112), (262, 108), (470, 196), (300, 200)] if P == "tarde" else [(214, 84), (240, 84), (420, 200), (250, 200)])
        feixe = feixe * (1 - np.clip((_YS - 140) / 70, 0, 1) * 0.5)
        f3 = desfocar(ampliar(feixe[:, :, None]), 14)[:, :, 0] * (1 - 0.75 * desfocar(ampliar((a > 0.5).astype(np.float32)[:, :, None]), 2)[:, :, 0])
        m.somar(f3, "#fff2cc" if P == "manha" else "#ffbe80", 0.07 if P == "manha" else 0.11)
        poeira = np.zeros((H * ESC, W * ESC), dtype=np.float32)
        g2 = np.random.default_rng(88)
        for _ in range(240):
            x, y = int(g2.random() * W * ESC), int(g2.random() * H * ESC)
            if f3[y, x] > 0.3:
                poeira[y, x] = 0.5 + g2.random() * 0.4
        m.somar(desfocar(poeira[:, :, None], 0.6)[:, :, 0], "#fff6dc", 0.8)
    m.camada(L["frente"], 5, escurecer={"manha": 0.55, "tarde": 0.4, "noite": 0.3}[P])
    quente, fria = {"manha": ("#ffe2a8", "#26346a"), "tarde": ("#ffcf8a", "#33244e"), "noite": ("#ffd8a8", "#121848")}[P]
    img = m.acabar(quente, fria, esquerda=0.36, centro_v=(0.66, 0.5), contraste=1.08 if P == "manha" else 1.06,
                   bloom={"manha": 0.3, "tarde": 0.5, "noite": 1.0}[P])
    sino_m = ampliar(camp.c[:, :, 3:4])[:, :, 0]
    flag_m = ampliar(L["flags"].c[:, :, 3:4])[:, :, 0]
    return img, sino_m, flag_m


def recorte(img: Image.Image, mascara: np.ndarray, caixa) -> Image.Image:
    x0, y0, x1, y1 = caixa
    rgba = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.asarray(img)[y0:y1, x0:x1]
    rgba[:, :, 3] = (mascara[y0:y1, x0:x1] > 0.5) * 255
    return Image.fromarray(rgba)


def gerar(periodo: str, L: dict) -> dict:
    global P
    P = periodo
    v.PERIODO = periodo
    PASTA.mkdir(parents=True, exist_ok=True)
    com, sino_m, flag_m = montar(L, True)
    sem, _, _ = montar(L, False)
    nome = f"estrada-prova-{periodo}"
    sem.save(PASTA / f"{nome}.webp", quality=84, method=6)
    sem.resize((960, 400), Image.LANCZOS).save(PASTA / f"{nome}-960.webp", quality=84, method=6)
    ys, xs = np.nonzero(sino_m > 0.5)
    cs = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    recorte(com, sino_m, cs).save(PASTA / f"estrada-prova-sino-{periodo}.png", optimize=True)
    fx, fy, fw, fh = (k * ESC for k in ANC["estandartes"][0])
    recorte(com, flag_m, (fx, fy, fx + fw, fy + fh)).save(PASTA / f"estrada-prova-estandarte-{periodo}.png", optimize=True)
    kb = [(PASTA / f"{nome}{s}.webp").stat().st_size / 1024 for s in ("", "-960")]
    print(f"{nome}: {kb[0]:.0f} KB, 960: {kb[1]:.0f} KB; sino {cs}")
    return {"sino": {"x": cs[0], "y": cs[1], "w": cs[2] - cs[0], "h": cs[3] - cs[1]}}


def escrever_ancoras(extra: dict) -> None:
    e3 = lambda val: int(round(val * ESC))  # noqa: E731
    dados = {
        "arte": {"w": W * ESC, "h": H * ESC, "arquivos": "public/pixel/cronograma/estrada-prova-<manha|tarde|noite>[-960].webp"},
        "sino": extra["sino"],
        "estandartes": [{"x": e3(x), "y": e3(y), "w": e3(w), "h": e3(h)} for (x, y, w, h) in ANC["estandartes"]],
        "luzes": [{"x": e3(x), "y": e3(y), "r": e3(r), "tipo": "lampiao"} for (x, y, r) in ANC["lampioes"]]
        + [{"x": e3(x), "y": e3(y), "r": e3(r), "tipo": "janela"} for (x, y, r) in ANC["janelas"]],
        "chamines": [{"x": e3(x), "y": e3(y), "escala": s} for (x, y, s) in ANC["chamines"]],
        "castelo": {"x": 243 * ESC, "y": 17 * ESC, "w": 108 * ESC, "h": 96 * ESC, "portao": {"x": 297 * ESC, "y": 105 * ESC}},
        "torre_relogio": {"x": (CX - 24) * ESC, "y": 14 * ESC, "w": 57 * ESC, "h": 172 * ESC, "relogio": {"x": CX * ESC, "y": 107 * ESC, "r": 13 * ESC}},
        "ponte": {"x": 236 * ESC, "y": 162 * ESC, "w": 43 * ESC, "h": 19 * ESC},
        "area_texto": {"x": 0, "y": 0, "w": 192 * ESC, "h": H * ESC},
        "celular": {"x0": 192 * ESC, "x1": W * ESC},
    }
    ANCORAS.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    camadas = pintar()
    extra = {}
    for p in [a for a in sys.argv[1:] if a in PERIODOS] or list(PERIODOS):
        extra = gerar(p, camadas)
    escrever_ancoras(extra)
