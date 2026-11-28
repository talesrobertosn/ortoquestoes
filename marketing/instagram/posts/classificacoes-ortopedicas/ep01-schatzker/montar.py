"""Classificações Ortopédicas · Ep. 1 · Schatzker. Reels 1080 x 1920, 30 fps.

Reaproveita o cenário e as peças do vídeo Salter-Harris (../../2026-11-27-video-salter-harris): gabinete com
negatoscópio, mascote, legendas, placa do site e música. No filme entram as imagens reais do Tales (tipos I, IV e VI;
os outros vêm desenhados em planalto.py até chegarem os arquivos) e, na chamada, prints reais do resumo do site.

    python3 narracao.py && python3 montar.py           -> schatzker.mp4
    python3 montar.py --quadros 2 10 30                 -> só prévias
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
from scipy.ndimage import gaussian_filter

AQUI = os.path.dirname(os.path.abspath(__file__))
SH = os.path.abspath(os.path.join(AQUI, "../../2026-11-27-video-salter-harris"))
sys.path.insert(0, SH)

import cena  # noqa: E402
import video as V  # noqa: E402
from cena import ESC, hexa  # noqa: E402
from filme import FH, FW  # noqa: E402

import planalto as P  # noqa: E402

FPS, LW, LH = 30, 1080, 1920
FX, FY = V.FILME_X, V.FILME_Y
FWP, FHP = FW * ESC, FH * ESC
LEAD, GAP, CAUDA = 1.6, 0.14, 2.0  # LEAD = vinheta de abertura
CREME, OURO = V.CREME, V.OURO
TIPOS = ["i", "ii", "iii", "iv", "v", "vi"]
ROMANO = {"i": "I", "ii": "II", "iii": "III", "iv": "IV", "v": "V", "vi": "VI"}
# o que fica escrito embaixo de cada número (acumula); cor do grupo (lateral, medial, os dois)
SIGNIF = {"i": "racha", "ii": "racha\n+afunda", "iii": "só\nafunda", "iv": "medial", "v": "os dois", "vi": "soltou"}
GRUPO = {"i": "lat", "ii": "lat", "iii": "lat", "iv": "med", "v": "dois", "vi": "dois"}
COR_GRUPO = {"lat": (110, 214, 190), "med": OURO, "dois": (255, 140, 120)}
REAIS = {  # tipo -> (arquivo, anotação em px da imagem: (cx, cy, rx, ry, rótulo) ou None)
    "i": ("schatzker-1-ap-zoom.png", (372, 262, 72, 70, "platô lateral")),
    "iv": ("schatzker-4-tc-coronal.png", None),
    "vi": ("schatzker-6-tc-coronal.png", (205, 425, 125, 70, "metáfise x diáfise")),
}
for t, nome in (("ii", "schatzker-2"), ("iii", "schatzker-3"), ("v", "schatzker-5")):  # se os arquivos chegarem
    for ext in ("png", "jpg", "jpeg"):
        for sufixo in ("", "-tc-coronal"):
            c = os.path.join(AQUI, "raiox", f"{nome}{sufixo}.{ext}")
            if os.path.exists(c):
                REAIS[t] = (os.path.basename(c), None)


# ------------------------------------------------------------------ tempo
def roteiro():
    tempos = json.load(open(os.environ.get("TEMPOS", os.path.join(AQUI, "audio", "tempos.json"))))
    t, cenas = LEAD, []
    minimo = {t_: 3.3 for t_ in TIPOS} | {"macete": 6.0, "chamada": 5.5}
    for i, c in enumerate(tempos["cenas"]):
        dur = max(c["seg"] + GAP, minimo.get(c["cena"], 0)) + (CAUDA if c["cena"] == "fim" else 0)
        cenas.append({"id": c["cena"], "i": i, "t0": t, "dur": dur, "fala": c["seg"], "chunks": c["inicios"],
                      "legendas": c["legendas"]})
        t += dur
    return cenas


def suave(x):
    return V.suave(x)


# ------------------------------------------------------------------ imagens no filme
@lru_cache(maxsize=None)
def real(tipo: str):
    """Imagem real ajustada ao filme (mantém a proporção, fundo de filme), mais a escala e o deslocamento usados."""
    arq, anot = REAIS[tipo]
    im = Image.open(os.path.join(AQUI, "raiox", arq)).convert("L")
    w, h = im.size
    esc = min(FWP / w, FHP / h)
    nw, nh = int(w * esc), int(h * esc)
    im = im.resize((nw, nh), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    a = np.clip((a - 0.04) / 0.92, 0, 1) ** 0.95  # contraste leve
    fundo = np.zeros((FHP, FWP, 3), np.float32) + hexa("#05090d")
    ox, oy = (FWP - nw) // 2, (FHP - nh) // 2
    tinta = a[..., None] * hexa("#eaf3f2")[None, None] + (1 - a[..., None]) * hexa("#05090d")[None, None]
    fundo[oy:oy + nh, ox:ox + nw] = tinta
    return fundo, esc, ox, oy, anot


@lru_cache(maxsize=None)
def desenhado(tipo: str) -> np.ndarray:
    return np.repeat(np.repeat(P.filme(tipo), ESC, 0), ESC, 1)


def anel(img, cx, cy, rx, ry, alfa, cor=OURO, fase=0.0):
    """Anel tracejado em pixel art (passos de 3 px) em volta da região da fratura, girando devagar."""
    if alfa <= 0:
        return
    n = int(2 * math.pi * max(rx, ry) / 6)
    for k in range(n):
        if (k // 3) % 2:
            continue
        ang = 2 * math.pi * k / n + fase
        x = int((cx + rx * math.cos(ang)) // 3 * 3)
        y = int((cy + ry * math.sin(ang)) // 3 * 3)
        if 6 <= x < LW - 6 and 6 <= y < LH - 6:
            img[y - 1:y + 5, x - 1:x + 5] = img[y - 1:y + 5, x - 1:x + 5] * (1 - alfa) + np.array((0.02, 0.03, 0.04)) * alfa
            img[y:y + 3, x:x + 3] = img[y:y + 3, x:x + 3] * (1 - alfa) + np.array(cor) / 255 * alfa


def selo(img, txt, x, y, alfa=1.0, cor=CREME, fundo="#0b1418"):
    """Etiqueta pequena (ex.: CASO REAL) com fundo escuro."""
    t = V.texto_img(txt, "jakarta", 28, cor, 800)
    h, w = t.shape[:2]
    reg = img[y - 4:y + h + 4, x - 10:x + w + 10]
    reg[:] = reg * (1 - 0.8 * alfa) + hexa(fundo) * 0.8 * alfa
    V.colar(img, t, x, y, alfa)


def mini_esquema(img, tipo, alfa=1.0):
    """Esquema desenhado do tipo, pequeno, no canto do filme (quando o filme mostra a imagem real)."""
    if alfa <= 0:
        return
    pe = P.filme(tipo)
    pe = np.asarray(Image.fromarray((pe * 255).astype(np.uint8)).resize((FW, FH), Image.NEAREST)).astype(np.float32) / 255
    x0, y0 = FX + FWP - FW - 18, FY + 18
    borda = np.zeros((FH + 8, FW + 8, 4), np.float32)
    borda[..., :3] = np.array(OURO) / 255
    borda[..., 3] = 1
    V.colar(img, borda, x0 - 4, y0 - 4, alfa)
    rg = np.dstack([pe, np.ones(pe.shape[:2], np.float32)])
    V.colar(img, rg, x0, y0, alfa)
    for pts in P.OURO.get(tipo, []):
        for (a, b), (c, d) in zip(pts[:-1], pts[1:]):
            n = 40
            for k in range(n):
                q = k / n
                x = int(x0 + P.CX + a + (c - a) * q)
                y = int(y0 + b + (d - b) * q)
                img[y - 1:y + 1, x - 1:x + 1] = np.array(OURO) / 255
    selo(img, "esquema", x0 + 6, y0 + FH - 40, alfa * 0.9)


# ------------------------------------------------------------------ ladrilhos I a VI e significados
@lru_cache(maxsize=None)
def ladrilho(estado):
    return V.ladrilho_img(estado)


def ladrilhos(img, visiveis, ativo, feitos, t):
    for k, tp in enumerate(TIPOS):
        vis = suave(visiveis - k)
        if vis <= 0:
            continue
        cx = (180 + (k - 2.5) * 50) * ESC
        cy = 92 * ESC
        estado = "ativo" if ativo == tp else ("feito" if k < feitos else "apagado")
        if estado == "ativo":
            g = V.glow_ladrilho()
            V.colar(img, g, int(cx - g.shape[1] / 2), int(cy - g.shape[0] / 2), 0.85 + 0.15 * math.sin(t * 6), aditivo=True)
        V.colar_centro(img, ladrilho(estado), cx, cy + (1 - vis) * -40, vis)
        cor = (42, 24, 6) if estado == "ativo" else (COR_GRUPO[GRUPO[tp]] if estado == "feito" else (120, 140, 132))
        V.colar_centro(img, V.texto_img(ROMANO[tp], "jersey", 84, cor), cx, cy - 4 + (1 - vis) * -40, vis)
        if estado != "apagado":
            for j, linha in enumerate(SIGNIF[tp].split("\n")):
                s = V.texto_img(linha, "jakarta", 25, (46, 54, 56) if estado == "feito" else (150, 98, 20), 800)
                V.colar(img, s, int(cx - s.shape[1] / 2), int((92 + 17) * ESC + j * 30), vis)


# ------------------------------------------------------------------ telas do site (chamada)
@lru_cache(maxsize=None)
def tela_site(nome):
    im = Image.open(os.path.join(AQUI, "telas", nome)).convert("RGB")
    w, h = 400, int(400 * im.size[1] / im.size[0])
    return np.asarray(im.resize((w, h), Image.LANCZOS)).astype(np.float32) / 255


@lru_cache(maxsize=1)
def moldura_celular():
    """iPhone desenhado: corpo escuro arredondado, ilha dinâmica e reflexo."""
    w, h, r = 440, 900, 64
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), r, fill=(18, 20, 22, 255), outline=(120, 126, 130, 255), width=4)
    d.rounded_rectangle((20, 20, w - 21, h - 21), r - 18, fill=(0, 0, 0, 0))
    d.rounded_rectangle((w // 2 - 60, 34, w // 2 + 60, 66), 16, fill=(8, 8, 9, 255))
    return np.asarray(im).astype(np.float32) / 255


def celular(img, tl, alfa):
    if alfa <= 0:
        return
    cx, cy = LW // 2, 820
    sw, sh = 400, 860
    telas = [("cel-resumo-topo.png", 0), ("cel-resumo-schatzker.png", 0), ("cel-resumo-questoes.png", 420)]
    k = 0 if tl < 1.6 else (1 if tl < 3.4 else 2)
    nome, rol = telas[k]
    t = tela_site(nome)
    if k == 2:  # rola até o botão "Praticar as 48 questões"
        rol = int(min(1, (tl - 3.4) / 0.6) * 0 + 310)
    tela = t[rol:rol + sh] if t.shape[0] - rol >= sh else t[-sh:]
    x0, y0 = cx - sw // 2, cy - sh // 2
    reg = img[y0:y0 + sh, x0:x0 + sw]
    reg[:] = reg * (1 - alfa) + tela[: reg.shape[0], : reg.shape[1]] * alfa
    m = moldura_celular()
    V.colar(img, m, cx - m.shape[1] // 2, cy - m.shape[0] // 2, alfa)
    if k == 1:  # lupa dourada sobre a linha do tipo II, "o mais comum"
        lupa(img, t, x0, y0, 0, (210, 360), alfa * suave((tl - 1.9) / 0.3))
    if k == 2:
        pulso = 0.5 + 0.5 * math.sin(tl * 7)
        anel(img, cx, y0 + 189, 205, 52, alfa * (0.6 + 0.4 * pulso), OURO, tl)


def lupa(img, tela, x0, y0, rol, centro, alfa):
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
    V.colar(img, pino, X - pino.shape[1] // 2 + 0, Y + r + 14, alfa)


# ------------------------------------------------------------------ abertura e fim
def vinheta(img, t):
    a = 1 - suave((t - LEAD + 0.35) / 0.35)
    if a <= 0:
        return
    img *= 1 - 0.8 * a
    lad = V.ladrilho_marca()
    esc = 0.6 + 0.4 * suave(t / 0.5)
    V.colar_centro(img, lad, LW / 2, 760, a, esc)
    V.colar_centro(img, V.texto_img("CLASSIFICAÇÕES", "jersey", 120, OURO, None, 0, sombra=6), LW / 2, 920, a * suave((t - 0.2) / 0.3))
    V.colar_centro(img, V.texto_img("ORTOPÉDICAS", "jersey", 120, OURO, None, 0, sombra=6), LW / 2, 1020, a * suave((t - 0.3) / 0.3))
    V.colar_centro(img, V.texto_img("EP. 1 · SCHATZKER", "jakarta", 48, CREME, 800), LW / 2, 1120, a * suave((t - 0.5) / 0.3))


def cartao_final(img, a):
    if a <= 0:
        return
    img *= 1 - 0.62 * a
    V.colar_centro(img, V.ladrilho_marca(), LW / 2, 640, a)
    V.colar_centro(img, V.texto_img("Classificações Ortopédicas", "jersey", 96, CREME, None, 0, sombra=6), LW / 2, 800, a)
    V.colar_centro(img, V.texto_img("Resumos, questões e flashcards", "jakarta", 42, CREME, 700), LW / 2, 890, a)
    V.colar_centro(img, V.texto_img("www.ortoquestoes.com.br", "jakarta", 64, OURO, 800), LW / 2, 980, a)
    V.colar_centro(img, V.texto_img("Fonte: Rockwood and Green's Fractures in Adults,", "jakarta", 30, (190, 196, 190), 500), LW / 2, 1080, a)
    V.colar_centro(img, V.texto_img("10ª ed., cap. 62", "jakarta", 30, (190, 196, 190), 500), LW / 2, 1120, a)


# ------------------------------------------------------------------ quadro
class Montador:
    def __init__(self):
        # cenário próprio da série (sala de laudos de dia, ../cenario.py), diferente do gabinete do Salter-Harris
        serie = os.path.join(AQUI, "..", "arte")
        if not os.path.exists(os.path.join(serie, "fundo.npy")):
            subprocess.run([sys.executable, os.path.join(AQUI, "..", "cenario.py")], check=True)
        self.fundo = np.load(os.path.join(serie, "fundo.npy")).astype(np.float32)
        self.placa = np.load(os.path.join(serie, "placa-site.npy")).astype(np.float32)
        self.cenas = roteiro()
        self.total = self.cenas[-1]["t0"] + self.cenas[-1]["dur"]
        yy, xx = np.mgrid[0:LH, 0:LW].astype(np.float32)
        vx, vy = (xx / LW - 0.5) * 1.25, (yy / LH - 0.48) * 0.95
        self.vinheta = np.clip(1 - (vx * vx + vy * vy) * 0.85, 0.35, 1)[..., None]
        g = np.random.default_rng(5)
        self.graos = [g.normal(0, 0.018, (LH // 3, LW // 3)).astype(np.float32) for _ in range(6)]
        self.ouro = {t: [V.amostrar([(P.CX + a, b) for a, b in pts]) for pts in P.OURO.get(t, [])] for t in TIPOS}
        self.pe = {k: V.mascote_base(k) for k in V.MASCOTE}

    def cena_em(self, t):
        if t < LEAD:
            return None, t
        for c in self.cenas:
            if c["t0"] <= t < c["t0"] + c["dur"]:
                return c, t - c["t0"]
        return self.cenas[-1], t - self.cenas[-1]["t0"]

    def quadro(self, t):
        c, tl = self.cena_em(t)
        cid = c["id"] if c else "abertura"
        img = self.fundo.copy()
        liga = suave(t / 0.4)
        filme_rgb = None
        if cid in ("abertura", "gancho"):
            seq = ["i", "ii", "iii", "iv", "v", "vi"]
            k = int((t * 3.2)) % 6
            tp = seq[k]
            filme_rgb = real(tp)[0] if tp in REAIS else desenhado(tp)
        elif cid in ("macete", "pergunta", "chamada", "fim"):
            filme_rgb = desenhado("normal")
        else:
            filme_rgb = real(cid)[0] if cid in REAIS else desenhado(cid)
        img[FY:FY + FHP, FX:FX + FWP] = filme_rgb * (0.25 + 0.75 * liga)

        if cid in TIPOS:
            self.tipo(img, cid, tl, t, c)
        elif cid == "macete":
            self.macete(img, tl, c)
        elif cid == "pergunta":
            self.pergunta(img, tl)
        elif cid == "gancho":
            V.colar_centro(img, V.texto_img("6 TIPOS", "jersey", 170, OURO, None, 0, sombra=8), LW / 2, FY + FHP / 2,
                           0.9, 1 + 0.06 * math.sin(tl * 8))

        # placa do título: nome da série pequeno e a classificação grande
        x0, y0, x1, y1 = [v * ESC for v in cena.PLACA]
        V.colar_centro(img, V.texto_img("CLASSIFICAÇÕES ORTOPÉDICAS · EP. 1", "jakarta", 26, (20, 101, 94), 800), LW / 2, y0 + 30)
        V.colar_centro(img, V.texto_img("SCHATZKER", "jersey", 96, (14, 46, 42)), LW / 2, y0 + 82)

        # ladrilhos I a VI: entram no macete e ficam
        if cid == "macete":
            ladrilhos(img, (tl - c["chunks"][1]) / 0.25 if tl > c["chunks"][1] else 0, None, 0, t)
        elif cid in TIPOS:
            k = TIPOS.index(cid)
            ladrilhos(img, 6, cid, k, t)
        elif cid in ("pergunta", "chamada", "fim"):
            ladrilhos(img, 6, "iv" if cid == "pergunta" and tl > 99 else None, 6, t)

        # mascote
        anim = "orientando" if cid in TIPOS or cid == "macete" else ("comemorando" if cid in ("fim", "chamada") else "raiox")
        fr = V.mascote_quadro(anim, int(t * 8) % 8)
        V.colar(img, fr, -16, cena.MESA_Y * ESC + 8 - self.pe[anim])

        img = self.pos(img, t)

        if cid == "chamada":
            img *= 1 - 0.55 * suave(tl / 0.3)
            celular(img, tl, suave(tl / 0.35))
        if cid in ("gancho", "fim"):
            a_placa = suave(tl / 0.3) if cid == "fim" else 1.0
            V.placa_site(img, self.placa, a_placa)
        if cid == "fim":
            cartao_final(img, suave((tl - 0.6) / 0.5))
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
            V.colar_centro(img, leg, LW / 2, 1335, alfa, esc)
        elif cid == "abertura":
            vinheta(img, t)
        return np.clip(img, 0, 1)

    def tipo(self, img, cid, tl, t, c):
        V.colar(img, V.texto_img(f"TIPO {ROMANO[cid]}", "jersey", 96, OURO, None, 0, sombra=5), FX + 18, FY + 8, suave(tl / 0.25))
        if cid in REAIS:
            fundo, esc, ox, oy, anot = real(cid)
            selo(img, "CASO REAL", FX + 300, FY + 30, suave((tl - 0.2) / 0.3))
            if anot:
                cx, cy, rx, ry, rot = anot
                X, Y = FX + ox + cx * esc, FY + oy + cy * esc
                a = suave((tl - 0.4) / 0.4)
                anel(img, X, Y, rx * esc, ry * esc, a, OURO if cid != "vi" else (255, 140, 120), tl * 0.6)
                t_ = V.texto_img(rot, "jakarta", 36, CREME, 800, 6, (6, 10, 12))
                V.colar(img, t_, int(X - t_.shape[1] / 2), int(Y - ry * esc - 60), a)
            mini_esquema(img, cid, suave((tl - 0.8) / 0.4))
        else:
            for pts in self.ouro.get(cid, []):
                V.aplicar_traco(img, V.mascara_traco(pts, (tl - 0.45) / 0.8), glow=1.0)
            if cid in P.DEPRESSAO:
                u0, u1, prof = P.DEPRESSAO[cid]
                yt = float(P.topo_tibia(np.array((u0 + u1) / 2)))
                X = FX + (P.CX + (u0 + u1) / 2) * ESC
                Y = FY + (yt + prof + 3) * ESC
                pulso = 0.5 + 0.5 * math.sin(tl * 8)
                a = suave((tl - 0.9) / 0.3)
                anel(img, X, Y, (u1 - u0) * ESC * 0.8, 12 * ESC, a * (0.6 + 0.4 * pulso), (255, 140, 120), tl)
                rot = V.texto_img("afundou", "jakarta", 36, (255, 200, 180), 800, 6, (6, 10, 12))
                V.colar(img, rot, int(X - rot.shape[1] / 2), int(Y - 14 * ESC - 70), a)
            selo(img, "ESQUEMA", FX + FWP - 190, FY + 30, suave((tl - 0.2) / 0.3))
        if cid == "iv":
            a = suave((tl - c["chunks"][-1]) / 0.25)
            pis = 0.6 + 0.4 * math.sin(tl * 10)
            V.colar_centro(img, V.texto_img("RISCO VASCULAR", "jersey", 90, (255, 120, 96), None, 6, (20, 4, 2)),
                           FX + FWP / 2, FY + FHP / 2 + 120, a * pis)
        V.colar(img, V.texto_img("Rockwood Adultos, 10ª ed., cap. 62", "jakarta", 24, (200, 214, 214), 600, 4, (5, 8, 10)),
                FX + FWP - 470, FY + FHP - 44, 0.85)

    def macete(self, img, tl, c):
        # pinta o platô por grupo, no ritmo das frases: lateral (I-III), medial (IV), os dois (V), diáfise (VI)
        ch = c["chunks"]
        yt = FY + (P.YT0 - 6) * ESC
        lados = [
            (1, FX + (P.CX + 4) * ESC, FX + (P.CX + 66) * ESC, yt, FY + 135 * ESC, COR_GRUPO["lat"], "I  II  III"),
            (2, FX + (P.CX - 66) * ESC, FX + (P.CX - 4) * ESC, yt, FY + 135 * ESC, COR_GRUPO["med"], "IV"),
            (3, FX + (P.CX - 66) * ESC, FX + (P.CX + 66) * ESC, yt, FY + 135 * ESC, COR_GRUPO["dois"], "V"),
            (4, FX + (P.CX - 40) * ESC, FX + (P.CX + 40) * ESC, FY + 142 * ESC, FY + 160 * ESC, COR_GRUPO["dois"], "VI"),
        ]
        for idx, x0, x1, y0, y1, cor, rot in lados:
            if idx >= len(ch):
                continue
            a = suave((tl - ch[idx]) / 0.25)
            fim = ch[idx + 1] if idx + 1 < len(ch) else 99
            if idx == 3 and tl > fim - 0.05:
                a *= 1 - suave((tl - fim) / 0.2)
            if idx in (1, 2) and tl > ch[3]:
                a *= 1 - suave((tl - ch[3]) / 0.2)
            if a <= 0:
                continue
            reg = img[int(y0):int(y1), int(x0):int(x1)]
            reg[:] = reg * (1 - 0.35 * a) + np.array(cor) / 255 * 0.35 * a
            V.colar_centro(img, V.texto_img(rot, "jersey", 110, cor, None, 6, (6, 10, 12)), (x0 + x1) / 2, (y0 + y1) / 2 + (90 if idx == 4 else 0), a)

    def pergunta(self, img, tl):
        # os seis tipos em miniatura (2 x 3) e o ponto de interrogação
        img[FY:FY + FHP, FX:FX + FWP] *= 0.35
        for k, tp in enumerate(TIPOS):
            col, lin = k % 3, k // 3
            w, h = 250, 300
            x = FX + 21 + col * (w + 13)
            y = FY + 12 + lin * (h + 6)
            src = real(tp)[0] if tp in REAIS else desenhado(tp)
            mini = np.asarray(Image.fromarray((src * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)).astype(np.float32) / 255
            a = suave((tl - 0.1 * k) / 0.25)
            reg = img[y:y + h, x:x + w]
            reg[:] = reg * (1 - a) + mini * a
            V.colar(img, V.texto_img(ROMANO[tp], "jersey", 64, OURO, None, 5, (6, 8, 8)), x + 10, y + 4, a)
        V.colar_centro(img, V.texto_img("?", "jersey", 300, OURO, None, 10, (20, 12, 2)), LW / 2, FY + FHP / 2,
                       suave((tl - 0.7) / 0.3) * (0.8 + 0.2 * math.sin(tl * 6)), 1 + 0.05 * math.sin(tl * 5))

    def pos(self, img, t):
        alto = np.clip(img - 0.8, 0, None)
        bl = gaussian_filter(alto[::6, ::6], (8, 8, 0))
        img = img + np.repeat(np.repeat(bl, 6, 0), 6, 1)[:LH, :LW] * 0.9
        img = img / (1 + img * 0.16)
        lum = img.mean(axis=-1, keepdims=True)
        img = img + np.clip(1 - lum * 2.2, 0, 1) * hexa("#0a1830") * 0.10
        img = img * self.vinheta
        g = self.graos[int(t * FPS / 2) % len(self.graos)]
        return img + np.repeat(np.repeat(g, 3, 0), 3, 1)[..., None]


# ------------------------------------------------------------------ áudio
def trilha(m: Montador):
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

    def por(s, t):
        i0 = int(t * sr)
        if i0 < n:
            mix[i0:i0 + len(s)] += s[: n - i0]

    notas = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0]
    por(tom(120, 0.35, 0.05, 0.002, 8, (1, 3, 5)), 0.05)
    for k, f in enumerate((392.0, 523.25, 659.25)):
        por(tom(f, 0.8, 0.09, 0.004, 4), 0.25 + k * 0.12)  # vinheta
    for c in m.cenas:
        cid = c["id"]
        if cid in TIPOS:
            por(tom(notas[TIPOS.index(cid)], 0.6, 0.11, 0.003, 7), c["t0"])
            rng = np.random.default_rng(TIPOS.index(cid))
            d = 0.8
            tt = np.arange(int(d * sr)) / sr
            ru = np.convolve(rng.normal(0, 1, len(tt)).astype(np.float32), np.ones(6) / 6, "same")
            por((ru * np.sin(np.pi * tt / d) ** 0.7 * 0.03).astype(np.float32), c["t0"] + 0.45)
            if cid == "iv":
                por(tom(220, 0.5, 0.12, 0.003, 6, (1, 2)), c["t0"] + c["chunks"][-1])
        if cid == "macete":
            for k in range(6):
                por(tom(notas[k], 0.4, 0.07, 0.003, 8), c["t0"] + c["chunks"][1] + k * 0.25)
        if cid == "pergunta":
            por(tom(659.25, 0.5, 0.08, 0.003, 6), c["t0"] + 0.7)
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
    nq = int(m.total * FPS)
    bruto = saida.replace(".mp4", "-bruto.mp4")
    proc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{LW}x{LH}",
                             "-r", str(FPS), "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                             "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", bruto], stdin=subprocess.PIPE)
    for k in range(nq):
        proc.stdin.write((m.quadro(k / FPS) * 255 + 0.5).astype(np.uint8).tobytes())
    proc.stdin.close()
    proc.wait()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", bruto, "-c:v", "libx264", "-preset", "slow", "-crf", "23",
                    "-pix_fmt", "yuv420p", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar",
                    "48000", "-movflags", "+faststart", saida], check=True)
    os.remove(bruto)
    print("ok", saida, round(m.total, 2), "s")


def previas(ts):
    m = Montador()
    os.makedirs(os.path.join(AQUI, "previa"), exist_ok=True)
    for t in ts:
        Image.fromarray((m.quadro(t) * 255 + 0.5).astype(np.uint8)).save(os.path.join(AQUI, "previa", f"q-{t:05.2f}.png"))
    print([(c["id"], round(c["t0"], 1)) for c in m.cenas])


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--quadros":
        previas([float(x) for x in sys.argv[2:]])
    else:
        render(os.path.join(AQUI, "schatzker.mp4"))
