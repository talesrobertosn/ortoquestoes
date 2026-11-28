"""Classificações Ortopédicas · Ep. 1 · Schatzker. Reels 1080 x 1920, 30 fps (arte v2, 28/11/2026).

Conceito: os planaltos ao pôr do sol ("platô" = planalto) e cada tipo como uma carta colecionável que o mascote,
de mago, faz surgir no ar. A carta mostra a imagem real do Tales (I, IV, VI) ou o esquema desenhado (planalto.py)
e, explicada, voa para a coleção no céu. Peças da série em ../paisagem.py e ../carta.py; legendas, mascote, música e
placa do site vêm do vídeo Salter-Harris.

    python3 narracao.py && python3 montar.py     -> schatzker.mp4
    python3 montar.py --quadros 2 10 30          -> prévias
"""
from __future__ import annotations

import json
import math
import os
import subprocess
import sys
from functools import lru_cache

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
SERIE = os.path.abspath(os.path.join(AQUI, ".."))
SH = os.path.abspath(os.path.join(AQUI, "../../2026-11-27-video-salter-harris"))
sys.path.insert(0, SH)
sys.path.insert(1, SERIE)
import cena  # noqa: E402
import video as V  # noqa: E402
from cena import ESC, hexa  # noqa: E402

import carta as K  # noqa: E402
import planalto as P  # noqa: E402

FPS, LW, LH = 30, 1080, 1920
LEAD, GAP, CAUDA = 1.3, 0.1, 1.7
CREME, OURO = V.CREME, V.OURO
TIPOS = ["i", "ii", "iii", "iv", "v", "vi"]
ROMANO = {"i": "I", "ii": "II", "iii": "III", "iv": "IV", "v": "V", "vi": "VI"}
GRUPO = {"i": "lat", "ii": "lat", "iii": "lat", "iv": "med", "v": "dois", "vi": "dois"}
NOME = {"i": "Racha", "ii": "Racha + afunda", "iii": "Só afunda", "iv": "Platô medial", "v": "Os dois platôs",
        "vi": "Soltou da diáfise"}
DETALHE = {"i": "lateral · jovem, osso bom", "ii": "lateral · o mais comum", "iii": "lateral · idoso osteopênico",
           "iv": "varo · risco vascular", "v": "bicondilar · metáfise presa", "vi": "o mais instável"}
CURTO = {"i": "racha", "ii": "racha\n+afunda", "iii": "só\nafunda", "iv": "medial", "v": "os dois", "vi": "soltou"}
COR_GRUPO = {"lat": (110, 214, 190), "med": OURO, "dois": (255, 140, 120)}
REAIS = {
    "i": ("schatzker-1-ap-zoom.png", (372, 262, 72, 70, "platô lateral")),
    "iv": ("schatzker-4-tc-coronal.png", None),
    "vi": ("schatzker-6-tc-coronal.png", (205, 425, 125, 70, "metáfise x diáfise")),
}
for t_, nome in (("ii", "schatzker-2"), ("iii", "schatzker-3"), ("v", "schatzker-5")):
    for ext in ("png", "jpg", "jpeg"):
        for suf in ("", "-tc-coronal"):
            cam = os.path.join(AQUI, "raiox", f"{nome}{suf}.{ext}")
            if os.path.exists(cam):
                REAIS[t_] = (os.path.basename(cam), None)

# geometria do quadro
CARTA_CX, CARTA_Y = 560, 556             # centro x e topo da carta grande
MINI_Y, MINI_W = 272, 138                # coleção no céu
(JX0, JY0, JX1, JY1), JMASK = K.janela_px()
JW, JH = JX1 - JX0, JY1 - JY0
MAGO = ("esqueleto-poses.png", 1)        # linha do mago com o cajado


def suave(x):
    return V.suave(x)


def roteiro():
    tempos = json.load(open(os.environ.get("TEMPOS", os.path.join(AQUI, "audio", "tempos.json"))))
    t, cenas = LEAD, []
    minimo = {t_: 3.1 for t_ in TIPOS} | {"macete": 5.5, "chamada": 5.0}
    for i, c in enumerate(tempos["cenas"]):
        dur = max(c["seg"] + GAP, minimo.get(c["cena"], 0)) + (CAUDA if c["cena"] == "fim" else 0)
        cenas.append({"id": c["cena"], "i": i, "t0": t, "dur": dur, "fala": c["seg"], "chunks": c["inicios"],
                      "legendas": c["legendas"]})
        t += dur
    return cenas


# ------------------------------------------------------------------ arte das cartas
@lru_cache(maxsize=None)
def imagem_tipo(tp: str):
    """Imagem para a janela da carta (JW x JH): real (ajustada) ou esquema desenhado; e a transformação usada."""
    if tp in REAIS:
        arq, anot = REAIS[tp]
        im = Image.open(os.path.join(AQUI, "raiox", arq)).convert("L")
        w, h = im.size
        esc = max(JW / w, JH / h) if tp == "i" else min(JW / w, JH / h) * 1.12
        nw, nh = int(w * esc), int(h * esc)
        a = np.asarray(im.resize((nw, nh), Image.LANCZOS)).astype(np.float32) / 255
        a = np.clip((a - 0.04) / 0.92, 0, 1)
        out = np.zeros((JH, JW, 3), np.float32) + hexa("#05090d")
        ox, oy = (JW - nw) // 2, (JH - nh) // 2
        sx0, sy0 = max(0, -ox), max(0, -oy)
        dx0, dy0 = max(0, ox), max(0, oy)
        ww, hh = min(nw - sx0, JW - dx0), min(nh - sy0, JH - dy0)
        tinta = a[..., None] * hexa("#eef6f4") + (1 - a[..., None]) * hexa("#05090d")
        out[dy0:dy0 + hh, dx0:dx0 + ww] = tinta[sy0:sy0 + hh, sx0:sx0 + ww]
        return out, esc, ox, oy, anot
    f = P.filme(tp)
    fw, fh = f.shape[1], f.shape[0]
    esc = max(JW / fw, JH / fh)
    big = np.asarray(Image.fromarray((f * 255).astype(np.uint8)).resize((int(fw * esc), int(fh * esc)), Image.NEAREST)).astype(np.float32) / 255
    ox, oy = (JW - big.shape[1]) // 2, (JH - big.shape[0]) // 2 + 10
    out = np.zeros((JH, JW, 3), np.float32) + hexa("#05090d")
    sy0 = max(0, -oy)
    sx0 = max(0, -ox)
    hh, ww = min(big.shape[0] - sy0, JH - max(0, oy)), min(big.shape[1] - sx0, JW - max(0, ox))
    out[max(0, oy):max(0, oy) + hh, max(0, ox):max(0, ox) + ww] = big[sy0:sy0 + hh, sx0:sx0 + ww]
    return out, esc, ox, oy, None


@lru_cache(maxsize=None)
def base_carta(grupo):
    return K.frente(grupo)


@lru_cache(maxsize=None)
def verso():
    v = K.verso().copy()
    lad = V.ladrilho_marca()
    lad = np.asarray(Image.fromarray((lad * 255).astype(np.uint8)).resize((150, 150), Image.NEAREST)).astype(np.float32) / 255
    y, x = v.shape[0] // 2 - 75, v.shape[1] // 2 - 75
    a = lad[..., 3:4]
    v[y:y + 150, x:x + 150, :3] = lad[..., :3] * a + v[y:y + 150, x:x + 150, :3] * (1 - a)
    return v


def desenhar_texto(c, txt, x, y, nome, tam, cor, peso=None, centro=False, contorno=0, cor_c=(8, 6, 4)):
    t = V.texto_img(txt, nome, tam, cor, peso, contorno, cor_c)
    if centro:
        x -= t.shape[1] // 2
    a = t[..., 3:4]
    h, w = t.shape[:2]
    x, y = int(x), int(y)
    reg = c[y:y + h, x:x + w]
    hh, ww = reg.shape[:2]
    reg[..., :3] = t[:hh, :ww, :3] * a[:hh, :ww] + reg[..., :3] * (1 - a[:hh, :ww])
    reg[..., 3:4] = np.maximum(reg[..., 3:4], a[:hh, :ww])


def carta(tp, tl=99.0, arte=None):
    """Carta inteira (RGBA 582 x 810): moldura, imagem com as marcações animadas e os textos."""
    c = base_carta(GRUPO.get(tp, "marca")).copy()
    img, esc, ox, oy, anot = imagem_tipo(tp) if arte is None else (arte, 1, 0, 0, None)
    jan = img.copy()
    # marcações animadas dentro da janela
    if arte is None and tp not in REAIS:
        for pts in P.OURO.get(tp, []):
            amostra = V.amostrar([((P.CX + a) * esc + ox, b * esc + oy) for a, b in pts], 1.0)
            n = int(len(amostra) * min(1, max(0, (tl - 0.6) / 0.8)))
            for x, y in amostra[:n]:
                xi, yi = int(x), int(y)
                if 3 <= xi < JW - 3 and 3 <= yi < JH - 3:
                    jan[yi - 3:yi + 3, xi - 3:xi + 3] = jan[yi - 3:yi + 3, xi - 3:xi + 3] * 0.4 + np.array((1.0, 0.85, 0.45)) * 0.6
                    jan[yi - 1:yi + 1, xi - 1:xi + 1] = (1.0, 0.97, 0.85)
        if tp in P.DEPRESSAO:
            u0, u1, prof = P.DEPRESSAO[tp]
            yt = float(P.topo_tibia(np.array((u0 + u1) / 2)))
            X, Y = (P.CX + (u0 + u1) / 2) * esc + ox, (yt + prof + 3) * esc + oy
            a = suave((tl - 1.0) / 0.3) * (0.6 + 0.4 * math.sin(tl * 8))
            anel_em(jan, X, Y, (u1 - u0) * esc * 0.7, 9 * esc, a, (255, 140, 120))
    if anot and arte is None:
        cx, cy, rx, ry, rot = anot
        a = suave((tl - 0.7) / 0.4)
        anel_em(jan, ox + cx * esc, oy + cy * esc, rx * esc, ry * esc, a, OURO if tp != "vi" else (255, 140, 120))
    sub = c[JY0:JY1, JX0:JX1]
    sub[..., :3] = np.where(JMASK[JY0:JY1, JX0:JX1, None], jan, sub[..., :3])
    # textos: tipo no alto, selo real/esquema, nome e detalhe no pergaminho
    desenhar_texto(c, f"TIPO {ROMANO.get(tp, '')}" if tp in ROMANO else "O SEGREDO", 44, 26, "jersey", 66, OURO)
    if tp in ROMANO:
        desenhar_texto(c, "CASO REAL" if tp in REAIS else "ESQUEMA", JX0 + 16, JY1 - 44, "jakarta", 24, (240, 236, 220), 800,
                       contorno=5)
        desenhar_texto(c, NOME[tp], K.CW * ESC // 2, K.PLACA_TXT[1] * ESC + 26, "jakarta", 50, (46, 28, 10), 800, centro=True)
        desenhar_texto(c, DETALHE[tp], K.CW * ESC // 2, K.PLACA_TXT[1] * ESC + 102, "jakarta", 31, (96, 66, 30), 700, centro=True)
    if tp == "macete":
        desenhar_texto(c, "Olhe o lado!", K.CW * ESC // 2, K.PLACA_TXT[1] * ESC + 26, "jakarta", 50, (46, 28, 10), 800, centro=True)
        desenhar_texto(c, "fora I-III · dentro IV · dois V · solto VI", K.CW * ESC // 2, K.PLACA_TXT[1] * ESC + 104, "jakarta", 26,
                       (96, 66, 30), 700, centro=True)
    if anot and arte is None and tl > 0.7:
        cx, cy, rx, ry, rot = anot
        desenhar_texto(c, rot, JX0 + ox + cx * esc, JY0 + oy + (cy - ry) * esc - 52, "jakarta", 32, CREME, 800, centro=True,
                       contorno=5)
    return c


def anel_em(arr, cx, cy, rx, ry, alfa, cor):
    if alfa <= 0:
        return
    n = int(2 * math.pi * max(rx, ry) / 6)
    for k in range(n):
        if (k // 3) % 2:
            continue
        ang = 2 * math.pi * k / n
        x, y = int(cx + rx * math.cos(ang)), int(cy + ry * math.sin(ang))
        if 3 <= x < arr.shape[1] - 4 and 3 <= y < arr.shape[0] - 4:
            arr[y - 2:y + 3, x - 2:x + 3] = arr[y - 2:y + 3, x - 2:x + 3] * (1 - alfa) + np.array(cor) / 255 * alfa


def brilho_holo(c, t, forca=0.35):
    """Faixa holográfica que atravessa a carta na diagonal (aditiva, só onde a carta é opaca)."""
    h, w = c.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    pos = ((t * 0.45) % 1.6 - 0.3) * (w + h)
    d = (xx + yy * 0.6) - pos
    faixa = np.exp(-(d / 50) ** 2) * forca
    arco = 0.5 + 0.5 * np.sin((xx - yy) * 0.02 + t * 2)
    cor = np.stack([0.8 + 0.2 * arco, np.full_like(arco, 0.9), 1.0 - 0.2 * arco], -1)
    c[..., :3] = np.clip(c[..., :3] + faixa[..., None] * cor * c[..., 3:4], 0, 1.4)


def transformar(c, escala=1.0, flip=1.0, rot=0.0):
    """Escala, "virar" (largura multiplicada por |flip|) e rotação, na resolução final."""
    h, w = c.shape[:2]
    nw, nh = max(2, int(w * escala * max(abs(flip), 0.02))), max(2, int(h * escala))
    im = Image.fromarray((np.clip(c, 0, 1) * 255).astype(np.uint8), "RGBA").resize((nw, nh), Image.BILINEAR)
    if rot:
        im = im.rotate(rot, resample=Image.BILINEAR, expand=True)
    return np.asarray(im).astype(np.float32) / 255


def sombra_carta(img, cx, cy, w, h, alfa):
    """Sombra suave da carta flutuante (deslocada para baixo-esquerda: o sol está à direita)."""
    y0, y1 = int(cy - h / 2 + 40), int(cy + h / 2 + 40)
    x0, x1 = int(cx - w / 2 - 30), int(cx + w / 2 - 30)
    y0, y1, x0, x1 = max(0, y0), min(LH, y1), max(0, x0), min(LW, x1)
    if y1 > y0 and x1 > x0:
        img[y0:y1, x0:x1] *= 1 - 0.25 * alfa


# ------------------------------------------------------------------ cenário animado
class Palco:
    def __init__(self):
        arte = os.path.join(SERIE, "arte")
        if not os.path.exists(os.path.join(arte, "ceu.npy")):
            subprocess.run([sys.executable, os.path.join(SERIE, "paisagem.py")], check=True)
        if not os.path.exists(os.path.join(arte, "placa-site.npy")):
            subprocess.run([sys.executable, os.path.join(SERIE, "cenario.py")], check=True)
        self.ceu = np.load(os.path.join(arte, "ceu.npy")).astype(np.float32)[..., :3]
        self.nuvens = np.load(os.path.join(arte, "nuvens.npy")).astype(np.float32)
        self.frente = np.load(os.path.join(arte, "frente.npy")).astype(np.float32)
        self.placa = np.load(os.path.join(arte, "placa-site.npy")).astype(np.float32)
        rng = np.random.default_rng(9)
        self.poeira = [(rng.uniform(0, LW), rng.uniform(300, 1500), rng.uniform(8, 30), rng.uniform(0, 6.28), rng.uniform(2, 4))
                       for _ in range(60)]

    def fundo(self, t):
        img = self.ceu.copy()
        desl = int(t * 8) % LW
        nv = np.roll(self.nuvens, desl, axis=1)
        a = nv[..., 3:4]
        img = nv[..., :3] * a + img * (1 - a)
        for (x, y, vel, fase, tam) in self.poeira:  # poeira dourada subindo devagar
            yy = int((y - t * vel) % 1300 + 300)
            xx = int(x + 14 * math.sin(t * 0.8 + fase))
            br = 0.5 + 0.5 * math.sin(t * 3 + fase)
            s = int(tam)
            if 0 <= xx < LW - s and 0 <= yy < LH - s:
                img[yy:yy + s, xx:xx + s] += np.array((1.0, 0.8, 0.45)) * 0.5 * br
        return img

    def frente_sobre(self, img):
        a = self.frente[..., 3:4]
        return self.frente[..., :3] * a + img * (1 - a)


CORUJA = ("coruja-nova.png", 44, 32, 5)   # folha, largura e altura do quadro, quadros por linha
LINHAS_CORUJA = ["parada", "andando", "voando", "pousando", "lendo", "dormindo", "acenando", "olhando"]
CORUJA_ESC = 7


@lru_cache(maxsize=None)
def quadro_coruja(estado, q):
    nome, w, h, n = CORUJA
    f = V.folha(nome)
    li = LINHAS_CORUJA.index(estado)
    fr = f[li * h:(li + 1) * h, (q % n) * w:(q % n + 1) * w]
    fr = np.asarray(Image.fromarray((fr * 255).astype(np.uint8)).resize((w * CORUJA_ESC, h * CORUJA_ESC), Image.NEAREST)).astype(np.float32) / 255
    fr[..., :3] *= hexa("#ffdcbf") * 0.97  # luz quente do pôr do sol
    a = fr[..., 3] > 0.5
    borda = a & ~np.roll(a, -CORUJA_ESC, axis=1)  # contorno de luz do lado do sol
    fr[borda, :3] = np.clip(fr[borda, :3] * 0.4 + hexa("#ffcf8a") * 0.8, 0, 1)
    return fr


ROCHA_X, ROCHA_Y = 2, 413 * ESC + 4  # onde a coruja pousa (pés)


def mascote(img, t, estado, faiscar=0.0, pos=None, fala=0.0):
    """A coruja bibliotecária, professora da série (sem chapéu nem cajado: Tales, 28/11/2026).
    pos = (x, y) dos pés quando ela está voando; fala = 0..1, a força da voz agora (ela "fala" no ritmo)."""
    fr = quadro_coruja(estado, int(t * (10 if estado == "voando" else 7)))
    if fala > 0.02 and estado != "voando":  # squash and stretch no ritmo da fala
        h, w = fr.shape[:2]
        sy = 1 + 0.06 * fala * (0.5 + 0.5 * math.sin(t * 22))
        sx = 1 / sy
        im = Image.fromarray((fr * 255).astype(np.uint8)).resize((int(w * sx), int(h * sy)), Image.NEAREST)
        fr = np.asarray(im).astype(np.float32) / 255
    pe = int(31 / 32 * fr.shape[0])
    if pos is None:
        x, y = ROCHA_X + (44 * CORUJA_ESC - fr.shape[1]) // 2, ROCHA_Y - pe
    else:
        x, y = int(pos[0] - fr.shape[1] / 2), int(pos[1] - pe)
    V.colar(img, fr, x, y)
    asa = (x + 30 * CORUJA_ESC, y + 10 * CORUJA_ESC)
    if faiscar > 0:
        px, py = asa
        for r, a_ in ((60, 0.16), (26, 0.32), (9, 0.85)):
            yy, xx = np.mgrid[-r:r, -r:r]
            m = np.exp(-(xx ** 2 + yy ** 2) / (r * r / 2))[..., None]
            reg = img[max(0, py - r):py + r, max(0, px - r):px + r]
            reg += m[: reg.shape[0], : reg.shape[1]] * np.array((1.0, 0.9, 0.6)) * a_ * faiscar
    return asa


def voo(t0, t):
    """Trajetória da chegada: entra pelo alto à direita, faz um arco sobre o vale e pousa na rocha."""
    p = min(1.0, max(0.0, (t - t0) / 1.7))
    e = p * p * (3 - 2 * p)
    x0, y0 = LW + 120, 260
    x1, y1 = ROCHA_X + 44 * CORUJA_ESC // 2, ROCHA_Y
    x = x0 + (x1 - x0) * e
    y = y0 + (y1 - y0) * e - math.sin(e * math.pi) * 180 + 12 * math.sin(t * 9) * (1 - e)
    return p, (x, y)


def faiscas(img, de, ate, prog, seed=1):
    """Rastro de faíscas do cajado até a carta (curva), no ritmo de `prog` (0..1)."""
    if prog <= 0 or prog >= 1.3:
        return
    rng = np.random.default_rng(seed)
    (x0, y0), (x1, y1) = de, ate
    for k in range(40):
        s = k / 40
        if s > prog:
            break
        cx = x0 + (x1 - x0) * s
        cy = y0 + (y1 - y0) * s - math.sin(s * math.pi) * 160
        jx, jy = rng.normal(0, 10), rng.normal(0, 10)
        tam = 3 + int(5 * (1 - abs(s - prog)))
        a = max(0, 1 - (prog - s) * 2.5)
        X, Y = int(cx + jx), int(cy + jy)
        if 0 <= X < LW - tam and 0 <= Y < LH - tam:
            img[Y:Y + tam, X:X + tam] += np.array((0.7, 1.0, 0.95)) * a


# ------------------------------------------------------------------ montador
class Montador:
    def __init__(self):
        self.palco = Palco()
        self.cenas = roteiro()
        self.total = self.cenas[-1]["t0"] + self.cenas[-1]["dur"]
        yy, xx = np.mgrid[0:LH, 0:LW].astype(np.float32)
        vx, vy = (xx / LW - 0.5) * 1.15, (yy / LH - 0.45) * 0.95
        self.vinheta = np.clip(1 - (vx * vx + vy * vy) * 0.8, 0.4, 1)[..., None]
        g = np.random.default_rng(5)
        self.graos = [g.normal(0, 0.014, (LH // 3, LW // 3)).astype(np.float32) for _ in range(6)]
        self.mini = {}
        self.env = self.envelope_voz()

    def envelope_voz(self):
        """Força da voz em cada quadro (0..1), para a coruja "falar" no ritmo da narração."""
        n = int(self.total * FPS) + 2
        env = np.zeros(n, np.float32)
        for c in self.cenas:
            caminho = os.path.join(AQUI, "audio", f"cena-{c['i']:02d}.wav")
            if not os.path.exists(caminho):
                continue
            a, sr = sf.read(caminho, dtype="float32")
            por_quadro = sr // FPS
            k = len(a) // por_quadro
            rms = np.sqrt((a[: k * por_quadro].reshape(k, por_quadro) ** 2).mean(1))
            rms = rms / (rms.max() + 1e-6)
            i0 = int(c["t0"] * FPS)
            env[i0:i0 + k] = rms[: max(0, n - i0)]
        return np.convolve(env, np.ones(3) / 3, "same")

    def fala(self, t):
        k = int(t * FPS)
        return float(self.env[k]) if 0 <= k < len(self.env) else 0.0

    def cena_em(self, t):
        if t < LEAD:
            return None, t
        for c in self.cenas:
            if c["t0"] <= t < c["t0"] + c["dur"]:
                return c, t - c["t0"]
        return self.cenas[-1], t - self.cenas[-1]["t0"]

    def mini_carta(self, tp):
        if tp not in self.mini:
            self.mini[tp] = transformar(carta(tp), MINI_W / (K.CW * ESC))
        return self.mini[tp]

    def colecao(self, img, n, t, ativo=None, chegando=None):
        """As cartas já explicadas, pequenas no céu, com o significado embaixo."""
        for k, tp in enumerate(TIPOS[:n]):
            cx = 90 + k * 180
            if k >= 3:
                cx = 90 + k * 180
            cx = LW / 2 + (k - 2.5) * 172
            mc = self.mini_carta(tp)
            bob = 4 * math.sin(t * 2 + k)
            a = 1.0
            if chegando == tp:
                continue
            V.colar(img, mc, int(cx - mc.shape[1] / 2), int(MINI_Y + bob), a)
            for j, linha in enumerate(CURTO[tp].split("\n")):
                s = V.texto_img(linha, "jakarta", 30, COR_GRUPO[GRUPO[tp]], 800, 6, (20, 10, 24))
                V.colar(img, s, int(cx - s.shape[1] / 2), int(MINI_Y + mc.shape[0] + 4 + j * 32 + bob), a)

    def quadro(self, t):
        c, tl = self.cena_em(t)
        cid = c["id"] if c else "abertura"
        img = self.palco.fundo(t)

        # título em fita (no céu)
        self.fita(img, t)

        n_col = 0
        if cid in TIPOS:
            n_col = TIPOS.index(cid)
        elif cid in ("pergunta", "chamada", "fim"):
            n_col = 6
        # carta que acabou de ser explicada voa para a coleção no começo da cena seguinte
        voando = None
        if cid in TIPOS and TIPOS.index(cid) > 0 and tl < 0.45:
            voando = TIPOS[TIPOS.index(cid) - 1]
        elif cid == "pergunta" and tl < 0.45:
            voando = "vi"
        if cid not in ("pergunta", "chamada"):
            self.colecao(img, n_col, t, chegando=voando)

        faiscar = 0.0
        if cid in TIPOS or cid == "macete":
            faiscar = max(0.0, 1 - tl / 0.8)
        if cid == "gancho":  # o leque vem antes, para a coruja voar na frente das cartas
            self.leque(img, t, tl, aberto=True)
        # a coruja-professora: chega voando no gancho, pousa, fala no ritmo da voz e gesticula a cada frase
        fala = self.fala(t)
        pos = None
        if cid == "abertura":
            estado, pos = None, None
        elif cid == "gancho":
            p, pos = voo(0.0, tl)
            estado = "voando" if p < 1 else ("pousando" if tl < 2.1 else "olhando")
            if p >= 1:
                pos = None
        elif cid == "chamada":
            estado = "lendo"
        elif cid == "fim":
            estado = "acenando"
        else:
            estado = "olhando" if int(t / 2.5) % 2 else "parada"
            if c is not None and any(0 <= tl - s < 0.7 for s in c["chunks"]):
                estado = "acenando"  # gesto de professora a cada frase nova
        ponta = mascote(img, t, estado, faiscar, pos, fala) if estado else (0, 0)
        img = self.palco.frente_sobre(img)
        if cid in TIPOS or cid == "macete":
            faiscas(img, ponta, (CARTA_CX, CARTA_Y + 300), tl / 0.5, seed=len(cid))

        if voando:
            k = TIPOS.index(voando)
            p = suave(tl / 0.45)
            alvo_x, alvo_y = LW / 2 + (k - 2.5) * 172, MINI_Y + 78
            x = CARTA_CX + (alvo_x - CARTA_CX) * p
            y = (CARTA_Y + 405) + (alvo_y - CARTA_Y - 405) * p
            esc = 1 + (MINI_W / (K.CW * ESC) - 1) * p
            cc = transformar(carta(voando), esc, 1, rot=12 * math.sin(p * math.pi))
            V.colar(img, cc, int(x - cc.shape[1] / 2), int(y - cc.shape[0] / 2))

        if cid in TIPOS:
            self.carta_grande(img, cid, tl, t)
        elif cid == "macete":
            self.carta_grande(img, "macete", tl, t, c)
        elif cid == "pergunta":
            self.leque(img, t, tl, aberto=True, pergunta=True)

        img = self.pos(img, t)

        if cid == "chamada":
            img *= 1 - 0.5 * suave(tl / 0.3)
            celular(img, tl, suave(tl / 0.35))
        if cid in ("gancho", "fim"):
            V.placa_site(img, self.palco.placa, 1.0 if cid == "gancho" else suave(tl / 0.3))
        if cid == "fim":
            cartao_final(img, suave((tl - 0.6) / 0.5), t)
        if cid == "abertura":
            vinheta(img, t)
        if c is not None:
            ch = 0
            for i, s in enumerate(c["chunks"]):
                if tl >= s:
                    ch = i
            leg = V.legenda_img(c["legendas"][ch])
            esc = 1.0 + 0.08 * (1 - suave((tl - c["chunks"][ch]) / 0.12))
            alfa = 1.0 if tl < c["fala"] + 0.25 or cid == "fim" else max(0, 1 - (tl - c["fala"] - 0.25) / 0.1)
            if cid == "fim" and tl > 0.7:
                alfa = 0.0
            V.colar_centro(img, leg, LW / 2, 1318 if cid in ("gancho", "fim") else 1385, alfa, esc)
        return np.clip(img, 0, 1)

    def fita(self, img, t):
        """Fita de título em pixel art (teal com bordas de ouro e pontas dobradas), ondulando de leve."""
        f = fita_img()
        y = 120 + int(3 * math.sin(t * 1.5))
        V.colar(img, f, LW // 2 - f.shape[1] // 2, y)
        V.colar_centro(img, V.texto_img("CLASSIFICAÇÕES ORTOPÉDICAS · EP. 1", "jakarta", 28, (246, 238, 219), 800, 4, (6, 30, 26)), LW / 2, y + 50)
        V.colar_centro(img, V.texto_img("SCHATZKER", "jersey", 100, OURO, None, 0, sombra=5), LW / 2, y + 108)

    def carta_grande(self, img, tp, tl, t, c=None):
        # entrada: desce girando (vira do verso para a frente) e depois flutua
        p = suave(tl / 0.55)
        ang = (1 - p) * math.pi
        flip = math.cos(ang)
        bob = 10 * math.sin(t * 1.8)
        if tp == "macete":
            arte = self.arte_macete(tl, c)
            cc = carta("macete", tl, arte=arte)
        else:
            cc = carta(tp, tl) if flip > 0 else verso().copy()
        if flip > 0:
            brilho_holo(cc, t, 0.28 if tp != "macete" else 0.18)
        esc = (0.7 + 0.3 * p) * 0.92
        tc = transformar(cc, esc, flip, rot=(1 - p) * -14)
        cx = CARTA_CX
        cy = CARTA_Y + 405 + bob - (1 - p) * 160
        sombra_carta(img, cx, cy, tc.shape[1], tc.shape[0], p)
        V.colar(img, tc, int(cx - tc.shape[1] / 2), int(cy - tc.shape[0] / 2))
        if tp == "iv":
            a = suave((tl - c_ultimo(self, "iv")) / 0.25) if True else 0
            V.colar_centro(img, V.texto_img("RISCO VASCULAR", "jersey", 92, (255, 120, 96), None, 7, (30, 6, 4)),
                           cx, cy - 80, a * (0.65 + 0.35 * math.sin(tl * 10)))

    def arte_macete(self, tl, c):
        """Esquema do platô pintado por lado, no ritmo das frases do macete."""
        arte, esc, ox, oy, _ = imagem_tipo("normal") if False else self._normal()
        a = arte.copy()
        ch = c["chunks"]
        X = lambda u: int((P.CX + u) * esc + ox)
        Yp = lambda v: int(v * esc + oy)
        zonas = [
            (1, X(4), X(66), Yp(P.YT0 - 6), Yp(138), COR_GRUPO["lat"], "I II III"),
            (2, X(-66), X(-4), Yp(P.YT0 - 6), Yp(138), COR_GRUPO["med"], "IV"),
            (3, X(-66), X(66), Yp(P.YT0 - 6), Yp(138), COR_GRUPO["dois"], "V"),
            (4, X(-44), X(44), Yp(142), Yp(162), COR_GRUPO["dois"], "VI"),
        ]
        for idx, x0, x1, y0, y1, cor, rot in zonas:
            if idx >= len(ch):
                continue
            al = suave((tl - ch[idx]) / 0.25)
            if idx in (1, 2) and len(ch) > 3 and tl > ch[3]:
                al *= 1 - suave((tl - ch[3]) / 0.2)
            if idx == 3 and len(ch) > 4 and tl > ch[4]:
                al *= 1 - suave((tl - ch[4]) / 0.2)
            if al <= 0:
                continue
            x0, x1 = max(0, x0), min(JW, x1)
            y0, y1 = max(0, y0), min(JH, y1)
            a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - 0.4 * al) + np.array(cor) / 255 * 0.4 * al
            tt = V.texto_img(rot, "jersey", 80, cor, None, 6, (6, 10, 12))
            h, w = tt.shape[:2]
            yy = (y0 + y1) // 2 - h // 2 + (60 if idx == 4 else 0)
            xx = (x0 + x1) // 2 - w // 2
            sub = a[max(0, yy):yy + h, max(0, xx):xx + w]
            tt = tt[: sub.shape[0], : sub.shape[1]]
            sub[:] = tt[..., :3] * tt[..., 3:4] * al + sub * (1 - tt[..., 3:4] * al)
        return a

    @lru_cache(maxsize=None)
    def _normal(self):
        return imagem_tipo_normal()

    def leque(self, img, t, tl, aberto=True, pergunta=False):
        """As seis cartas em leque (gancho e pergunta)."""
        abre = suave(tl / 0.6) if aberto else 0.0
        for k, tp in enumerate(TIPOS):
            ang = (k - 2.5) * 11 * abre
            esc = 0.5
            cc = transformar(carta(tp), esc, 1, rot=-ang)
            r = 700
            cx = LW / 2 + math.sin(math.radians(ang)) * r * abre
            cy = 940 - math.cos(math.radians(ang)) * r * abre + r * abre + 10 * math.sin(t * 2 + k)
            V.colar(img, cc, int(cx - cc.shape[1] / 2), int(cy - cc.shape[0] / 2))
        if pergunta:
            V.colar_centro(img, V.texto_img("?", "jersey", 320, OURO, None, 12, (40, 20, 4)), LW / 2, 760,
                           suave((tl - 0.6) / 0.3) * (0.8 + 0.2 * math.sin(tl * 6)), 1 + 0.05 * math.sin(tl * 5))
        else:
            V.colar_centro(img, V.texto_img("6 TIPOS", "jersey", 190, OURO, None, 10, (40, 20, 4)), LW / 2, 700,
                           suave((tl - 0.3) / 0.3), 1 + 0.05 * math.sin(tl * 6))

    def pos(self, img, t):
        from scipy.ndimage import gaussian_filter

        alto = np.clip(img - 0.78, 0, None)
        bl = gaussian_filter(alto[::6, ::6], (8, 8, 0))
        img = img + np.repeat(np.repeat(bl, 6, 0), 6, 1)[:LH, :LW] * 0.8
        img = img / (1 + img * 0.14)
        img = img * self.vinheta
        g = self.graos[int(t * FPS / 2) % len(self.graos)]
        return img + np.repeat(np.repeat(g, 3, 0), 3, 1)[..., None]


def c_ultimo(m, cid):
    for c in m.cenas:
        if c["id"] == cid:
            return c["chunks"][-1]
    return 0


@lru_cache(maxsize=1)
def imagem_tipo_normal():
    f = P.filme("normal")
    fw, fh = f.shape[1], f.shape[0]
    esc = max(JW / fw, JH / fh)
    big = np.asarray(Image.fromarray((f * 255).astype(np.uint8)).resize((int(fw * esc), int(fh * esc)), Image.NEAREST)).astype(np.float32) / 255
    ox, oy = (JW - big.shape[1]) // 2, (JH - big.shape[0]) // 2 + 10
    out = np.zeros((JH, JW, 3), np.float32) + hexa("#05090d")
    sy0, sx0 = max(0, -oy), max(0, -ox)
    hh, ww = min(big.shape[0] - sy0, JH - max(0, oy)), min(big.shape[1] - sx0, JW - max(0, ox))
    out[max(0, oy):max(0, oy) + hh, max(0, ox):max(0, ox) + ww] = big[sy0:sy0 + hh, sx0:sx0 + ww]
    return out, esc, ox, oy, None


@lru_cache(maxsize=1)
def fita_img():
    """Fita (faixa de título) em pixel art: corpo verde-água, bordas de ouro, pontas recortadas e dobras."""
    w, h = 300, 54
    c = cena.Camada(w, h)
    yy, xx = c.yy, c.xx
    corpo = (xx >= 22) & (xx < w - 22) & (yy >= 6) & (yy < h - 6)
    c.pintar(corpo, "#14655E")
    c.pintar(corpo & (yy < 10), "#1f8a80")
    c.pintar(corpo & (yy >= h - 10), "#0b3a35")
    for y0 in (6, h - 8):
        c.pintar((xx >= 22) & (xx < w - 22) & (yy >= y0) & (yy < y0 + 2), "#f4cf7c")
    for lado in (0, 1):
        x0 = 0 if lado == 0 else w - 26
        ponta = (xx >= x0) & (xx < x0 + 26) & (yy >= 14) & (yy < h)
        recorte = np.abs(yy - (14 + h) / 2) < (np.abs(xx - (x0 if lado == 0 else x0 + 26)) * 0.8)
        c.pintar(ponta & ~((xx - x0 if lado == 0 else x0 + 26 - xx) < 10) | (ponta & ~recorte & ((xx - x0 if lado == 0 else x0 + 26 - xx) >= 0)), "#0b3a35")
        dobra = (xx >= (18 if lado == 0 else w - 26)) & (xx < (26 if lado == 0 else w - 18)) & (yy >= h - 10) & (yy < h - 2)
        c.pintar(dobra, "#06211e")
    c.contornar("#140c04")
    return np.repeat(np.repeat(c.c, 3, 0), 3, 1)


# ------------------------------------------------------------------ celular, abertura, fim
@lru_cache(maxsize=None)
def tela_site(nome):
    im = Image.open(os.path.join(AQUI, "telas", nome)).convert("RGB")
    return np.asarray(im.resize((400, int(400 * im.size[1] / im.size[0])), Image.LANCZOS)).astype(np.float32) / 255


@lru_cache(maxsize=1)
def moldura_celular():
    w, h, r = 440, 900, 64
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), r, fill=(18, 20, 22, 255), outline=(200, 170, 110, 255), width=5)
    d.rounded_rectangle((20, 20, w - 21, h - 21), r - 18, fill=(0, 0, 0, 0))
    d.rounded_rectangle((w // 2 - 60, 34, w // 2 + 60, 66), 16, fill=(8, 8, 9, 255))
    return np.asarray(im).astype(np.float32) / 255


def celular(img, tl, alfa):
    if alfa <= 0:
        return
    cx, cy = LW // 2, 960 + int(8 * math.sin(tl * 2))
    sw, sh = 400, 860
    k = 0 if tl < 1.6 else (1 if tl < 3.4 else 2)
    t = tela_site(["cel-resumo-topo.png", "cel-resumo-schatzker.png", "cel-resumo-questoes.png"][k])
    rol = min(310 if k == 2 else 0, max(0, t.shape[0] - sh))
    tela = t[rol:rol + sh]
    if tela.shape[0] < sh:
        tela = np.concatenate([tela, np.repeat(tela[-1:], sh - tela.shape[0], 0)], 0)
    x0, y0 = cx - sw // 2, cy - sh // 2
    reg = img[y0:y0 + sh, x0:x0 + sw]
    reg[:] = reg * (1 - alfa) + tela[: reg.shape[0], : reg.shape[1]] * alfa
    m = moldura_celular()
    V.colar(img, m, cx - m.shape[1] // 2, cy - m.shape[0] // 2, alfa)
    if k == 1:
        V.lupa(img, t, x0, y0, 0, (210, 360), alfa * suave((tl - 1.9) / 0.3)) if hasattr(V, "lupa") else lupa(img, t, x0, y0, (210, 360), alfa * suave((tl - 1.9) / 0.3))
    if k == 2:
        anel_em(img, cx, y0 + 499 - rol, 205, 52, alfa * (0.7 + 0.3 * math.sin(tl * 7)), OURO)


def lupa(img, tela, x0, y0, centro, alfa):
    if alfa <= 0:
        return
    cxs, cys = centro
    r, z = 105, 1.9
    src = tela[max(0, int(cys - r / z)):int(cys + r / z), max(0, int(cxs - r / z)):int(cxs + r / z)]
    src = np.asarray(Image.fromarray((src * 255).astype(np.uint8)).resize((2 * r, 2 * r), Image.LANCZOS)).astype(np.float32) / 255
    X, Y = x0 + cxs + 120, y0 + cys - 40
    yy, xx = np.mgrid[-r:r, -r:r]
    dentro = (xx ** 2 + yy ** 2) <= (r - 6) ** 2
    aro = ((xx ** 2 + yy ** 2) <= r ** 2) & ~dentro
    reg = img[Y - r:Y + r, X - r:X + r]
    reg[dentro] = reg[dentro] * (1 - alfa) + src[dentro] * alfa
    reg[aro] = reg[aro] * (1 - alfa) + np.array(OURO) / 255 * alfa
    pino = V.texto_img("o mais comum", "jakarta", 28, (42, 24, 6), 800)
    caixa = np.zeros((pino.shape[0] + 8, pino.shape[1] + 20, 4), np.float32)
    caixa[..., :3] = np.array(OURO) / 255
    caixa[..., 3] = 1
    V.colar(img, caixa, X - caixa.shape[1] // 2, Y + r + 10, alfa)
    V.colar(img, pino, X - pino.shape[1] // 2, Y + r + 14, alfa)


def vinheta(img, t):
    a = 1 - suave((t - LEAD + 0.35) / 0.35)
    if a <= 0:
        return
    img *= 1 - 0.55 * a
    v = transformar(verso(), 0.55 + 0.1 * suave(t / 0.6), math.cos((1 - suave(t / 0.6)) * math.pi * 2))
    V.colar(img, v, LW // 2 - v.shape[1] // 2, 700 - v.shape[0] // 2, a)
    V.colar_centro(img, V.texto_img("CLASSIFICAÇÕES", "jersey", 118, OURO, None, 8, (40, 20, 4)), LW / 2, 1050, a * suave((t - 0.2) / 0.3))
    V.colar_centro(img, V.texto_img("ORTOPÉDICAS", "jersey", 118, OURO, None, 8, (40, 20, 4)), LW / 2, 1150, a * suave((t - 0.3) / 0.3))
    V.colar_centro(img, V.texto_img("EP. 1 · SCHATZKER", "jakarta", 48, CREME, 800, 5, (30, 14, 30)), LW / 2, 1250, a * suave((t - 0.5) / 0.3))


def cartao_final(img, a, t):
    if a <= 0:
        return
    img *= 1 - 0.55 * a
    v = transformar(verso(), 0.62, 1)
    brilho = v.copy()
    brilho_holo(brilho, t, 0.25)
    V.colar(img, brilho, LW // 2 - v.shape[1] // 2, 520 - v.shape[0] // 2 + int(8 * math.sin(t * 2)), a)
    V.colar_centro(img, V.texto_img("Classificações Ortopédicas", "jersey", 92, CREME, None, 7, (30, 14, 30)), LW / 2, 840, a)
    V.colar_centro(img, V.texto_img("Resumos, questões e flashcards", "jakarta", 42, CREME, 700, 5, (30, 14, 30)), LW / 2, 925, a)
    V.colar_centro(img, V.texto_img("www.ortoquestoes.com.br", "jakarta", 64, OURO, 800, 6, (30, 14, 30)), LW / 2, 1010, a)
    V.colar_centro(img, V.texto_img("Fonte: Rockwood and Green's Fractures in Adults, 10ª ed., cap. 62", "jakarta", 28, (230, 220, 220), 500, 4, (30, 14, 30)), LW / 2, 1090, a)


# ------------------------------------------------------------------ áudio e saída
def trilha(m):
    sr = 48000
    n = int(m.total * sr) + sr
    mix = np.zeros(n, np.float32)
    for c in m.cenas:
        a, sr0 = sf.read(os.path.join(AQUI, "audio", f"cena-{c['i']:02d}.wav"), dtype="float32")
        x = np.interp(np.arange(int(len(a) * sr / sr0)) * sr0 / sr, np.arange(len(a)), a).astype(np.float32)
        x = x / (np.abs(x).max() + 1e-6) * 0.86
        i0 = int(c["t0"] * sr)
        mix[i0:i0 + len(x)] += x[: max(0, n - i0)]
    voz = mix.copy()

    def tom(freq, dur, vol, ataque=0.005, decai=6.0, harm=(1, 2, 3)):
        tt = np.arange(int(dur * sr)) / sr
        s = sum(np.sin(2 * np.pi * freq * h * tt) / (h * h) for h in harm)
        return (s * np.minimum(1, tt / ataque) * np.exp(-tt * decai) * vol).astype(np.float32)

    def brilho(t0, vol=0.06):
        for k, f in enumerate((1318.5, 1567.98, 2093.0)):
            por(tom(f, 0.5, vol, 0.002, 7, (1,)), t0 + k * 0.05)

    def por(s, t):
        i0 = int(t * sr)
        if i0 < n:
            mix[i0:i0 + len(s)] += s[: n - i0]

    notas = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0]
    for k, f in enumerate((392.0, 523.25, 659.25, 783.99)):
        por(tom(f, 0.9, 0.08, 0.004, 4), 0.2 + k * 0.12)
    for c in m.cenas:
        cid = c["id"]
        if cid in TIPOS or cid == "macete":
            brilho(c["t0"] + 0.05)  # o cajado conjura a carta
            # "vush" da carta girando
            tt = np.arange(int(0.5 * sr)) / sr
            ru = np.convolve(np.random.default_rng(len(cid)).normal(0, 1, len(tt)).astype(np.float32), np.ones(30) / 30, "same")
            por((ru * np.sin(np.pi * tt / 0.5) * 0.08).astype(np.float32), c["t0"] + 0.1)
        if cid in TIPOS:
            por(tom(notas[TIPOS.index(cid)], 0.6, 0.09, 0.003, 7), c["t0"] + 0.55)
            if cid == "iv":
                por(tom(220, 0.5, 0.12, 0.003, 6, (1, 2)), c["t0"] + c["chunks"][-1])
        if cid == "pergunta":
            por(tom(659.25, 0.5, 0.08, 0.003, 6), c["t0"] + 0.6)
        if cid == "fim":
            for k, f in enumerate((523.25, 659.25, 783.99, 1046.5)):
                por(tom(f, 1.2, 0.07, 0.004, 3.5), c["t0"] + 0.6 + k * 0.09)
    from musica import musica

    mus = np.pad(musica(m.total), (0, n))[:n]
    env = np.convolve(np.abs(voz), np.ones(int(0.03 * sr)) / int(0.03 * sr), "same")
    env = np.convolve((env > 0.02).astype(np.float32), np.ones(int(0.25 * sr)) / int(0.25 * sr), "same")
    mix += (mus * 0.12 * (1 - 0.5 * np.clip(env, 0, 1))).astype(np.float32)
    mix = mix[: int(m.total * sr)]
    pico = np.abs(mix).max()
    return (mix / pico * 0.98 if pico > 0.98 else mix), sr


def render(saida):
    m = Montador()
    mix, sr = trilha(m)
    wav = os.path.join(AQUI, "audio", "trilha.wav")
    sf.write(wav, mix, sr)
    bruto = saida.replace(".mp4", "-bruto.mp4")
    proc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{LW}x{LH}",
                             "-r", str(FPS), "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                             "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", bruto], stdin=subprocess.PIPE)
    for k in range(int(m.total * FPS)):
        proc.stdin.write((m.quadro(k / FPS) * 255 + 0.5).astype(np.uint8).tobytes())
    proc.stdin.close()
    proc.wait()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", bruto, "-c:v", "libx264", "-preset", "slow", "-crf", "23",
                    "-pix_fmt", "yuv420p", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k",
                    "-ar", "48000", "-movflags", "+faststart", saida], check=True)
    os.remove(bruto)
    print("ok", saida, round(m.total, 2), "s")


def previas(ts):
    m = Montador()
    os.makedirs(os.path.join(AQUI, "previa"), exist_ok=True)
    for t in ts:
        Image.fromarray((m.quadro(t) * 255 + 0.5).astype(np.uint8)).save(os.path.join(AQUI, "previa", f"v2-{t:05.2f}.png"))
    print([(c["id"], round(c["t0"], 1)) for c in m.cenas])


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--quadros":
        previas([float(x) for x in sys.argv[2:]])
    else:
        render(os.path.join(AQUI, "schatzker.mp4"))
