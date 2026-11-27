"""Monta o vídeo "Salter-Harris em 40 segundos" (Reels/TikTok 1080 x 1920, 30 fps) com a narração de narracao.py.

    python3 narracao.py            # gera audio/cena-NN.wav e audio/tempos.json (voz sintética local)
    python3 video.py               # gera salter-harris.mp4
    python3 video.py --quadros 3.0 12.5   # só grava PNGs desses instantes em previa/ (conferência)
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
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter

import cena
from cena import ESC, hexa, quantizar, rampa
from filme import FH, FW, Osso, filme_duplo, filme_unico, pintar_filme

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "../../../.."))
FONTES = os.environ.get("FONTES", "/tmp/claude-0/video/fontes")
FPS = 30
LW, LH = 1080, 1920
FILME_X, FILME_Y = 25 * ESC, 161 * ESC          # canto do filme no vídeo
LEAD = 0.3                                      # silêncio antes da primeira fala
GAP = 0.16                                       # respiro entre cenas
CAUDA = 1.5                                      # tempo extra do cartão final

CREME = (246, 238, 219)
OURO = (244, 207, 124)
VERMELHO = (255, 120, 96)

# ------------------------------------------------------------------ roteiro: legendas (o que se lê) por cena
LEGENDAS = {
    "gancho": ["Mesma queda, mesmo punho.", "No *adulto*, quebra o osso.", "Na *criança*, quem paga é a *fise*."],
    "fise": ["A placa de crescimento é *cartilagem*:", "mais fraca que o osso e o ligamento.", "Salter e Harris: *cinco tipos*.", "Decora: *SALTR*."],
    "s": ["*S* de Straight:", "passa *reto* pela fise.", "O raio-x pode vir *quase normal*."],
    "a": ["*A* de Above:", "sobe pela *metáfise*", "e leva o *Thurston-Holland*.", "É o *mais comum*."],
    "l": ["*L* de Lower:", "desce pela *epífise*", "e entra na *articulação*."],
    "t": ["*T* de Through:", "atravessa *tudo*.", "III e IV são *articulares*:", "*redução anatômica*."],
    "r": ["*R* de cRush:", "a fise é *esmagada*", "e *nenhum traço* aparece."],
    "virada": ["Por isso o *tipo V*", "quase nunca é visto no dia.", "Aparece *meses depois*,", "quando o osso *para de crescer*."],
    "fim": ["Salva pro próximo *plantão*.", "Treine para o *TEOT*, o *TARO* e a *Cirurgia da Mão*", "em *ortoquestoes.com.br*"],
}
TITULOS = {"gancho": "ADULTO x CRIANÇA", "virada": "MESES DEPOIS", "fim": "ORTO QUESTÕES"}
TIPOS = {"s": 0, "a": 1, "l": 2, "t": 3, "r": 4}
ROMANOS = ["I", "II", "III", "IV", "V"]


# ------------------------------------------------------------------ tempo
def roteiro() -> list[dict]:
    """Tempo de cada cena e de cada frase (vem de audio/tempos.json, gravado por narracao.py)."""
    tempos = json.load(open(os.path.join(AQUI, "audio", "tempos.json")))
    t = LEAD
    cenas = []
    for i, c in enumerate(tempos["cenas"]):
        dur = c["seg"] + GAP
        if c["cena"] == "fim":
            dur += CAUDA
        LEGENDAS[c["cena"]] = c["legendas"]
        cenas.append({"id": c["cena"], "i": i, "t0": t, "dur": dur, "fala": c["seg"], "chunks": c["inicios"]})
        t += dur
    return cenas


def cena_em(cenas, t):
    for c in cenas:
        if c["t0"] <= t < c["t0"] + c["dur"]:
            return c, t - c["t0"]
    return cenas[-1], t - cenas[-1]["t0"]


def chunk_em(c, tl):
    k = 0
    for i, s in enumerate(c["chunks"]):
        if tl >= s:
            k = i
    return k


def suave(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


# ------------------------------------------------------------------ fontes e texto
@lru_cache(maxsize=None)
def fonte(nome: str, tam: int, peso: int | None = None):
    caminhos = {
        "jersey": f"{FONTES}/Jersey10-Regular.ttf",
        "pixel": f"{FONTES}/PixelifySans%5Bwght%5D.ttf",
        "jakarta": f"{FONTES}/PlusJakartaSans.ttf",
    }
    f = ImageFont.truetype(caminhos[nome], tam)
    if peso is not None:
        try:
            f.set_variation_by_axes([peso])
        except Exception:
            pass
    return f


def pedacos(txt: str):
    """'a *b* c' -> [('a ', False), ('b', True), (' c', False)]"""
    out = []
    dest = False
    for i, p in enumerate(txt.split("*")):
        if p:
            out.append((p, dest))
        dest = not dest
    return out


@lru_cache(maxsize=256)
def legenda_img(txt: str, tam: int = 70) -> np.ndarray:
    """Legenda estilo vídeo curto: branca/creme com contorno escuro grosso, palavras-chave em ouro. Quebra em 2 linhas."""
    f = fonte("jakarta", tam, 800)
    larg_max = 960
    # palavras como listas de segmentos coloridos (a pontuação fica grudada na palavra anterior)
    palavras = [[]]
    for p, dest in pedacos(txt):
        partes = p.split(" ")
        for k, w in enumerate(partes):
            if k > 0 and palavras[-1]:
                palavras.append([])
            if w:
                palavras[-1].append((w, dest))
    palavras = [w for w in palavras if w]
    linhas, atual = [], []
    tmp = Image.new("RGBA", (10, 10))
    d = ImageDraw.Draw(tmp)
    esp = d.textlength(" ", font=f)

    def lp(w):
        return sum(d.textlength(seg, font=f) for seg, _ in w)

    def larg(ws):
        return sum(lp(w) for w in ws) + esp * (len(ws) - 1)

    for w in palavras:
        if atual and larg(atual + [w]) > larg_max:
            linhas.append(atual)
            atual = [w]
        else:
            atual.append(w)
    if atual:
        linhas.append(atual)
    alt_l = int(tam * 1.18)
    im = Image.new("RGBA", (LW, alt_l * len(linhas) + 40), (0, 0, 0, 0))
    dd = ImageDraw.Draw(im)
    for li, ws in enumerate(linhas):
        x = (LW - larg(ws)) / 2
        y = 20 + li * alt_l
        for w in ws:
            for seg, dest in w:
                cor = OURO if dest else (255, 252, 244)
                dd.text((x, y), seg, font=f, fill=cor + (255,), stroke_width=9, stroke_fill=(10, 14, 16, 255))
                x += d.textlength(seg, font=f)
            x += esp
    a = np.asarray(im).astype(np.float32) / 255
    # sombra projetada suave embaixo
    sombra = gaussian_filter(a[..., 3], 7)
    out = np.zeros_like(a)
    out[..., 3] = np.clip(sombra * 0.75, 0, 1)
    sh = np.roll(out, 8, axis=0)
    comb = sh.copy()
    al = a[..., 3:4]
    comb[..., :3] = a[..., :3] * al + sh[..., :3] * (1 - al)
    comb[..., 3:4] = al + sh[..., 3:4] * (1 - al)
    return comb


@lru_cache(maxsize=64)
def texto_img(txt: str, nome: str, tam: int, cor: tuple, peso: int | None = None, contorno: int = 0,
              cor_contorno=(8, 10, 12), sombra: int = 0) -> np.ndarray:
    f = fonte(nome, tam, peso)
    tmp = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    bb = tmp.textbbox((0, 0), txt, font=f, stroke_width=contorno)
    w, h = bb[2] - bb[0] + 20 + sombra, bb[3] - bb[1] + 20 + sombra
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if sombra:
        d.text((10 - bb[0] + sombra, 10 - bb[1] + sombra), txt, font=f, fill=(0, 0, 0, 200), stroke_width=contorno,
               stroke_fill=(0, 0, 0, 200))
    d.text((10 - bb[0], 10 - bb[1]), txt, font=f, fill=tuple(cor) + (255,), stroke_width=contorno,
           stroke_fill=tuple(cor_contorno) + (255,))
    return np.asarray(im).astype(np.float32) / 255


def colar(img: np.ndarray, rgba: np.ndarray, x: int, y: int, alfa: float = 1.0, aditivo: bool = False) -> None:
    """Compõe uma imagem RGBA (float) sobre img na posição (x, y) (canto superior esquerdo)."""
    h, w = rgba.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(img.shape[1], x + w), min(img.shape[0], y + h)
    if x1 <= x0 or y1 <= y0:
        return
    sub = rgba[y0 - y:y1 - y, x0 - x:x1 - x]
    a = sub[..., 3:4] * alfa
    if aditivo:
        img[y0:y1, x0:x1] += sub[..., :3] * a
    else:
        img[y0:y1, x0:x1] = sub[..., :3] * a + img[y0:y1, x0:x1] * (1 - a)


def colar_centro(img, rgba, cx, cy, alfa=1.0, escala=1.0):
    if escala != 1.0:
        h, w = rgba.shape[:2]
        im = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8)).resize(
            (max(1, int(w * escala)), max(1, int(h * escala))), Image.BILINEAR)
        rgba = np.asarray(im).astype(np.float32) / 255
    h, w = rgba.shape[:2]
    colar(img, rgba, int(cx - w / 2), int(cy - h / 2), alfa)


# ------------------------------------------------------------------ mascote
@lru_cache(maxsize=None)
def folha(nome: str) -> np.ndarray:
    return np.asarray(Image.open(os.path.join(RAIZ, "public/pixel/mascote", nome)).convert("RGBA")).astype(np.float32) / 255


MASCOTE = {  # id -> (folha, linha)
    "raiox": ("esqueleto.png", 5),
    "orientando": ("esqueleto-poses.png", 7),
    "comemorando": ("esqueleto-poses.png", 4),
}


@lru_cache(maxsize=64)
def mascote_quadro(anim: str, q: int) -> np.ndarray:
    nome, linha = MASCOTE[anim]
    f = folha(nome)
    fr = f[linha * 128:(linha + 1) * 128, q * 96:(q + 1) * 96]
    fr = np.asarray(Image.fromarray((fr * 255).astype(np.uint8)).resize((240, 320), Image.NEAREST)).astype(np.float32) / 255
    # luz: fria do negatoscópio pela direita, ambiente quente e baixo pela esquerda
    h, w = fr.shape[:2]
    gx = np.linspace(0, 1, w)[None, :, None]
    gy = np.linspace(0, 1, h)[:, None, None]
    luz = 0.5 * hexa("#ffd9b0") + (0.25 + 0.75 * gx) * hexa("#cfe2ff") * (0.95 - 0.35 * gy)
    fr[..., :3] = np.clip(fr[..., :3] * luz, 0, 1)
    # contorno de luz fria na borda direita da silhueta
    a = fr[..., 3] > 0.5
    borda = a & ~np.roll(a, -2, axis=1)
    fr[borda, :3] = np.clip(fr[borda, :3] * 0.5 + hexa("#e6f1ff") * 0.6, 0, 1)
    return fr


def mascote_base(anim: str) -> int:
    """Linha do pé (última linha com pixel opaco) no quadro ampliado, para apoiar na mesa."""
    fr = mascote_quadro(anim, 0)
    linhas = np.where(fr[..., 3].max(axis=1) > 0.5)[0]
    return int(linhas.max())


# ------------------------------------------------------------------ ladrilhos S A L T R
def ladrilho_base(estado: str) -> np.ndarray:
    """Um ladrilho em pixel art (36 x 28), estados: 'apagado', 'feito', 'ativo'."""
    w, h = 36, 28
    c = cena.Camada(w, h)
    if estado == "ativo":
        cores = ["#6b4510", "#9c6a1c", "#c99634", "#f4cf7c", "#fff0c4"]
    elif estado == "feito":
        cores = ["#06211e", "#0b3a35", "#14655E", "#1f8a80", "#58b8ab"]
    else:
        cores = ["#050c0b", "#0a1a18", "#0f2724", "#173a35", "#245048"]
    yy, xx = c.yy, c.xx
    corpo = ~(((xx < 2) & (yy < 2)) | ((xx > w - 3) & (yy < 2)) | ((xx < 2) & (yy > h - 3)) | ((xx > w - 3) & (yy > h - 3)))
    tex = (cena.hash01(xx, yy, 33) - 0.5) * 0.18
    tom = 0.55 + tex - 0.25 * (yy / h)
    c.pintar(corpo, rampa(cores[1:4], quantizar(np.clip(tom, 0, 1), 3, 0.7)))
    c.pintar(corpo & ((yy == 0) | (xx == 0)), cores[4])
    c.pintar(corpo & ((yy == h - 1) | (xx == w - 1)), cores[0])
    c.pintar(corpo & ((yy == h - 2) & (xx > 0)), cores[1])
    # brilho no canto
    c.pintar((xx >= 2) & (xx <= 4) & (yy == 2), "#ffffff", 0.5)
    return c.c


def ladrilho_img(estado: str) -> np.ndarray:
    return np.repeat(np.repeat(ladrilho_base(estado), ESC, 0), ESC, 1)


LAD_IMGS = {}
LAD_CY = 92  # centro dos ladrilhos (arte pequena)
SIGNIFICADOS = [("Straight", "reto"), ("Above", "acima"), ("Lower", "abaixo"), ("Through", "através"), ("cRush", "esmaga")]


def desenhar_significados(img, alfas: list[float], ativo: int | None) -> None:
    """Embaixo de cada letra: a palavra em inglês e o que ela quer dizer; uma vez explicada, fica até o fim."""
    for i, (ing, pt) in enumerate(SIGNIFICADOS):
        a = alfas[i]
        if a <= 0:
            continue
        cx = (180 + (i - 2) * 52) * ESC
        y = (LAD_CY + 19) * ESC
        cor1 = OURO if ativo == i else (226, 200, 140)
        t1 = texto_img(ing, "jakarta", 30, cor1, 800, 4, (6, 8, 8))
        t2 = texto_img(pt, "jakarta", 34, CREME, 800, 4, (6, 8, 8))
        colar(img, t1, int(cx - t1.shape[1] / 2), int(y - 20), a)  # topo fixo: as linhas ficam alinhadas
        colar(img, t2, int(cx - t2.shape[1] / 2), int(y + 16), a)


def desenhar_ladrilhos(img, n_visiveis: float, ativo: int | None, feitos: int, tl_pop: list[float], tempo: float) -> None:
    for e in ("apagado", "feito", "ativo"):
        if e not in LAD_IMGS:
            LAD_IMGS[e] = ladrilho_img(e)
    for i, letra in enumerate("SALTR"):
        vis = suave((n_visiveis - i) * 1.0)
        if vis <= 0:
            continue
        cx = (180 + (i - 2) * 52) * ESC
        cy = LAD_CY * ESC
        estado = "ativo" if ativo == i else ("feito" if i < feitos or (ativo is None and feitos >= 5) else "apagado")
        if ativo is None and feitos == 0:
            estado = "feito"
        pulo = 1.0 + 0.18 * math.sin(min(1, vis) * math.pi) if vis < 1 else 1.0
        if estado == "ativo":
            # brilho de ouro em volta (luz que sai do ladrilho)
            g = glow_ladrilho()
            colar(img, g, int(cx - g.shape[1] / 2), int(cy - g.shape[0] / 2), 0.85 + 0.15 * math.sin(tempo * 6), aditivo=True)
        colar_centro(img, LAD_IMGS[estado], cx, cy + (1 - vis) * -40, vis, pulo)
        cor = (42, 24, 6) if estado == "ativo" else (CREME if estado == "feito" else (120, 140, 132))
        t = texto_img(letra, "jersey", 92, cor)
        colar_centro(img, t, cx, cy - 4 + (1 - vis) * -40, vis, pulo)


@lru_cache(maxsize=1)
def glow_ladrilho() -> np.ndarray:
    h, w = 260, 300
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w / 2) / 1.2) ** 2 + (yy - h / 2) ** 2)
    a = np.exp(-(d / 70) ** 2)
    out = np.zeros((h, w, 4), np.float32)
    out[..., :3] = hexa("#ffcf6a")
    out[..., 3] = a * 0.6
    return out


# ------------------------------------------------------------------ traços de fratura
def amostrar(pts: list[tuple[float, float]], passo: float = 0.35) -> np.ndarray:
    out = []
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / passo))
        for k in range(n):
            t = k / n
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
    out.append(pts[-1])
    return np.array(out)


def caminho_fise(o: Osso, u0: float, u1: float) -> list:
    us = np.linspace(u0, u1, max(2, int(abs(u1 - u0) * 1.2)))
    return [o.pt(u, float(o.yp(u))) for u in us]


def tracos(o: Osso) -> dict:
    """Os traços de cada tipo, em coordenadas do filme."""
    hw = lambda v: float(o.hw(v))
    t = {}
    t["s"] = caminho_fise(o, -56, 56)
    t["a"] = caminho_fise(o, 56, -14) + [o.pt(-hw(96), 96)]
    t["l"] = caminho_fise(o, -56, 8) + [o.pt(11, float(o.ya(11)) - 0.5)]
    t["t"] = [o.pt(-hw(80), 80), o.pt(-10.8, float(o.yp(-10.8))), o.pt(6, float(o.ya(6)) - 0.5)]
    return t


def fragmento_th(o: Osso) -> list:
    pts = [o.pt(-14, float(o.yp(-14))), o.pt(-float(o.hw(96)), 96)]
    for v in np.linspace(96, 118, 8):
        pts.append(o.pt(-float(o.hw(v)), v))
    pts += caminho_fise(o, -56, -14)
    return pts


def mascara_traco(pts_amostra: np.ndarray, frac: float, espessura: int = 1) -> np.ndarray:
    """Pixels (arte pequena, tamanho do filme) do traço desenhado até a fração `frac`."""
    m = np.zeros((FH, FW), bool)
    n = int(len(pts_amostra) * min(max(frac, 0), 1))
    for x, y in pts_amostra[:n]:
        xi, yi = int(round(x)), int(round(y))
        for dx in range(-espessura + 1, espessura):
            if 0 <= xi + dx < FW and 0 <= yi < FH:
                m[yi, xi + dx] = True
        if 0 <= xi < FW and 0 <= yi + 1 < FH and espessura > 1:
            m[yi + 1, xi] = True
    return m


def ponta_traco(pts_amostra, frac):
    n = int(len(pts_amostra) * min(max(frac, 0), 1))
    return pts_amostra[max(0, n - 1)] if n else None


# ------------------------------------------------------------------ filmes por cena (cache)
@lru_cache(maxsize=None)
def filme_cache(chave: str) -> tuple:
    if chave == "duplo-gancho":
        d, a, b = filme_duplo(dict(cx=66, s=0.62, topo=62, adulto=True), dict(cx=198, s=0.55, topo=88))
        return pintar_filme(d), (a, b)
    if chave.startswith("duplo-gancho-desliz"):
        k = float(chave.split(":")[1])
        d, a, b = filme_duplo(dict(cx=66, s=0.62, topo=62, adulto=True), dict(cx=198, s=0.55, topo=88, desliz=k))
        return pintar_filme(d), (a, b)
    if chave.startswith("unico"):
        partes = dict(p.split("=") for p in chave.split(":")[1:]) if ":" in chave else {}
        d, o = filme_unico(desliz=float(partes.get("desliz", 0)))
        return pintar_filme(d), (o,)
    if chave.startswith("virada"):
        k = float(chave.split(":")[1])
        fech = k > 0.5
        d, a, b = filme_duplo(dict(cx=66, s=0.55, topo=74), dict(cx=198, s=0.55, topo=74, fise_aberta=not fech, encurtar=k))
        return pintar_filme(d), (a, b)
    raise KeyError(chave)


def filme_grande(rgb_pequeno: np.ndarray) -> np.ndarray:
    return np.repeat(np.repeat(rgb_pequeno, ESC, 0), ESC, 1)


def aplicar_traco(img, mask, cor_nucleo="#fff3cf", cor_borda="#f4cf7c", glow=1.0, cor_glow="#ffc45a"):
    """Desenha o traço (pixels da arte pequena) sobre o filme no vídeo, com brilho que ilumina o osso em volta."""
    if not mask.any():
        return
    big = np.repeat(np.repeat(mask, ESC, 0), ESC, 1).astype(np.float32)
    ys, xs = np.where(big > 0)
    y0, y1 = max(0, ys.min() - 60), min(big.shape[0], ys.max() + 60)
    x0, x1 = max(0, xs.min() - 60), min(big.shape[1], xs.max() + 60)
    sub = big[y0:y1, x0:x1]
    g = gaussian_filter(sub, 14) * 3.2 + gaussian_filter(sub, 4) * 1.2
    reg = img[FILME_Y + y0:FILME_Y + y1, FILME_X + x0:FILME_X + x1]
    reg += g[..., None] * hexa(cor_glow) * 0.55 * glow
    borda = gaussian_filter(sub, 1.2) > 0.15
    reg[borda] = hexa(cor_borda)
    reg[sub > 0.5] = hexa(cor_nucleo)


def preencher(img, poligono_pts, cor="#f4cf7c", a=0.35):
    from PIL import ImageDraw as D

    m = Image.new("L", (FW, FH), 0)
    D.Draw(m).polygon([(float(x), float(y)) for x, y in poligono_pts], fill=255)
    mm = np.repeat(np.repeat(np.asarray(m) > 127, ESC, 0), ESC, 1)
    reg = img[FILME_Y:FILME_Y + FH * ESC, FILME_X:FILME_X + FW * ESC]
    xadrez = ((np.indices(mm.shape).sum(0) // ESC) % 2 == 0)  # pontilhado de pixel art
    reg[mm] = reg[mm] * (1 - a) + hexa(cor) * a
    reg[mm & xadrez] += hexa(cor) * a * 0.25


def rotulo(img, txt, fx, fy, alvo_fx, alvo_fy, alfa=1.0, cor=CREME, tam=40):
    """Rótulo com fio-guia em pixel art: texto em (fx, fy) do filme, fio até o alvo (coordenadas do filme)."""
    if alfa <= 0:
        return
    t = texto_img(txt, "jakarta", tam, cor, 800, 6, (6, 10, 12))
    X, Y = FILME_X + fx * ESC, FILME_Y + fy * ESC
    colar(img, t, int(X), int(Y - t.shape[0] / 2), alfa)
    # fio: do fim do texto até o alvo, em degraus de 3 px
    ax, ay = FILME_X + alvo_fx * ESC, FILME_Y + alvo_fy * ESC
    x_ini = X + t.shape[1] - 6 if ax > X + t.shape[1] / 2 else X + 6
    n = int(max(abs(ax - x_ini), abs(ay - Y)) / 3) + 1
    for k in range(n + 1):
        q = k / max(n, 1)
        px = int((x_ini + (ax - x_ini) * q) // 3 * 3)
        py = int((Y + (ay - Y) * q) // 3 * 3)
        if 0 <= py < LH - 6 and 0 <= px < LW - 6:
            img[py - 1:py + 5, px - 1:px + 5] = img[py - 1:py + 5, px - 1:px + 5] * (1 - alfa) + np.array((0.02, 0.03, 0.04)) * alfa
            img[py:py + 3, px:px + 3] = img[py:py + 3, px:px + 3] * (1 - alfa) + np.array(cor) / 255 * alfa
    # ponto no alvo
    img[int(ay) - 6:int(ay) + 6, int(ax) - 6:int(ax) + 6] = img[int(ay) - 6:int(ay) + 6, int(ax) - 6:int(ax) + 6] * (1 - alfa) + np.array((0.02, 0.03, 0.04)) * alfa
    img[int(ay) - 3:int(ay) + 3, int(ax) - 3:int(ax) + 3] = img[int(ay) - 3:int(ay) + 3, int(ax) - 3:int(ax) + 3] * (1 - alfa) + np.array(cor) / 255 * alfa


def seta_pixel(img, fx, fy, dirc: int, alfa=1.0, cor="#ff7860"):
    """Setinha em pixel art (triângulo) apontando para cima (dirc=-1) ou para baixo (dirc=1)."""
    c = cena.Camada(15, 12)
    for r in range(7):
        y = r if dirc == 1 else 11 - r
        c.ret(r, y, 15 - r, y + 1, cor)
    c.ret(5, 0 if dirc == 1 else 6, 10, 6 if dirc == 1 else 12, cor) if False else None
    big = np.repeat(np.repeat(c.c, ESC, 0), ESC, 1)
    colar(img, big, int(FILME_X + fx * ESC - big.shape[1] / 2), int(FILME_Y + fy * ESC - big.shape[0] / 2), alfa)


# ------------------------------------------------------------------ cartão final
@lru_cache(maxsize=1)
def ladrilho_marca() -> np.ndarray:
    """O ladrilho das alternativas (símbolo oficial) em pixel art, 48 x 48 ampliado 3x."""
    n = 48
    c = cena.Camada(n, n)
    yy, xx = c.yy, c.xx
    r = 9
    dentro = np.ones((n, n), bool)
    for (cx, cy) in ((r, r), (n - 1 - r, r), (r, n - 1 - r), (n - 1 - r, n - 1 - r)):
        quad = ((xx < r) if cx == r else (xx > n - 1 - r)) & ((yy < r) if cy == r else (yy > n - 1 - r))
        dentro &= ~(quad & ((xx - cx) ** 2 + (yy - cy) ** 2 > r * r))
    c.pintar(dentro, "#14655E")
    c.pintar(dentro & (yy < 3), "#1f8a80")
    c.pintar(dentro & (yy > n - 4), "#0b3a35")
    s = n / 100
    alts = [(30, 30, 6.5, 43, 25.5, 34, 9, False), (30, 50, 9, 43, 45, 40, 10, True), (30, 70, 6.5, 43, 65.5, 26, 9, False)]
    for (cx, cy, rr, x, y, lw, lh, certa) in alts:
        cor = "#F4CF7C" if certa else "#F6EEDB"
        c.pintar((xx - cx * s) ** 2 + (yy - cy * s) ** 2 <= (rr * s) ** 2, cor)
        c.pintar((xx >= x * s) & (xx < (x + lw) * s) & (yy >= y * s) & (yy < (y + lh) * s), cor)
        if certa:
            c.p(cx * s - 2, cy * s, "#14655E")
            c.p(cx * s - 1, cy * s + 1, "#14655E")
            c.p(cx * s, cy * s, "#14655E")
            c.p(cx * s + 1, cy * s - 1, "#14655E")
            c.p(cx * s + 2, cy * s - 2, "#14655E")
    return np.repeat(np.repeat(c.c, 4, 0), 4, 1)


def cartao_final(img, a: float) -> None:
    if a <= 0:
        return
    img *= 1 - 0.62 * a
    lad = ladrilho_marca()
    colar_centro(img, lad, LW / 2, 700, a)
    colar_centro(img, texto_img("Orto Questões", "jersey", 150, CREME, None, 0, sombra=6), LW / 2, 860, a)
    colar_centro(img, texto_img("Questões de prova, comentadas.", "jakarta", 44, CREME, 600), LW / 2, 960, a)
    colar_centro(img, texto_img("www.ortoquestoes.com.br", "jakarta", 60, OURO, 800), LW / 2, 1045, a)
    colar_centro(img, texto_img("Fonte: Rockwood and Wilkins' Fractures in Children,", "jakarta", 30, (190, 196, 190), 500), LW / 2, 1130, a)
    colar_centro(img, texto_img("10ª ed., cap. 2, figs. 2-10 a 2-15", "jakarta", 30, (190, 196, 190), 500), LW / 2, 1172, a)


# ------------------------------------------------------------------ montagem de um quadro
class Montador:
    def __init__(self) -> None:
        caminho = os.path.join(AQUI, "arte", "fundo.npy")
        if not os.path.exists(caminho):
            cena.main()
        self.fundo = np.load(caminho).astype(np.float32)
        self.cenas = roteiro()
        self.total = self.cenas[-1]["t0"] + self.cenas[-1]["dur"]
        yy, xx = np.mgrid[0:LH, 0:LW].astype(np.float32)
        vx = (xx / LW - 0.5) * 1.25
        vy = (yy / LH - 0.48) * 0.95
        self.vinheta = np.clip(1 - (vx * vx + vy * vy) * 0.85, 0.35, 1)[..., None]
        g = np.random.default_rng(5)
        self.graos = [g.normal(0, 0.018, (LH // 3, LW // 3)).astype(np.float32) for _ in range(6)]
        o = Osso()
        self.o = o
        self.tr = {k: amostrar(v) for k, v in tracos(o).items()}
        self.frag = fragmento_th(o)
        self.pe_mascote = {k: mascote_base(k) for k in MASCOTE}

    def quadro(self, t: float) -> np.ndarray:
        c, tl = cena_em(self.cenas, t)
        cid = c["id"]
        img = self.fundo.copy()

        # ---------------- filme
        liga = suave(t / 0.35)  # o negatoscópio acende no começo (com piscada)
        pisca = 1.0 if t > 0.5 else (0.35 if 0.12 < t < 0.2 else 1.0)
        brilho_filme = (0.25 + 0.75 * liga) * pisca
        extra = []
        if cid == "gancho":
            ch = chunk_em(c, tl)
            ts = [c["chunks"][1], c["chunks"][2]]
            desliz = 4.0 * suave((tl - ts[1] - 0.2) / 0.5)
            chave = "duplo-gancho" if desliz < 0.3 else f"duplo-gancho-desliz:{round(desliz)}"
            rgb, ossos = filme_cache(chave)
        elif cid == "virada":
            k = 16.0 * suave((tl - c["chunks"][1] + 0.1) / 1.2)
            rgb, ossos = filme_cache(f"virada:{round(k)}")
        else:
            desl = 0
            if cid == "s":
                desl = round(3 * suave((tl - 1.6) / 0.5))
            rgb, ossos = filme_cache(f"unico:desliz={desl}")
        fg = filme_grande(rgb) * brilho_filme
        img[FILME_Y:FILME_Y + FH * ESC, FILME_X:FILME_X + FW * ESC] = fg

        # ---------------- conteúdo de cada cena sobre o filme
        if cid == "gancho":
            a, b = ossos
            rotulo_topo(img, "ADULTO", 66, 14, suave((tl - 0.1) / 0.3))
            rotulo_topo(img, "CRIANÇA", 198, 14, suave((tl - 0.1) / 0.3))
            # adulto: traço transverso na metáfise distal
            t1 = c["chunks"][1]
            pts = amostrar([a.pt(-56, 136), a.pt(-30, 133), a.pt(-8, 138), a.pt(18, 134), a.pt(40, 137), a.pt(56, 134)])
            aplicar_traco(img, mascara_traco(pts, (tl - t1 - 0.1) / 0.6))
            # criança: a fise acende em vermelho
            t2 = c["chunks"][2]
            if tl > t2:
                pf = amostrar(caminho_fise(b, -56, 56))
                pulso = 0.75 + 0.25 * math.sin((tl - t2) * 9)
                aplicar_traco(img, mascara_traco(pf, (tl - t2) / 0.45), "#ffe1d6", "#ff7860", pulso * 1.2, "#ff5a40")
        elif cid == "fise":
            o = ossos[0]
            fade = lambda s0: suave((tl - s0) / 0.3)
            pulso = 0.6 + 0.4 * math.sin(tl * 7)
            pf = amostrar(caminho_fise(o, -56, 56))
            aplicar_traco(img, mascara_traco(pf, (tl - 0.15) / 0.6), "#dff7ff", "#7fd6ff", pulso, "#5fc8ff")
            rotulo(img, "metáfise", 6, 86, 98, 100, fade(0.6))
            rotulo(img, "fise", 6, 121, 74, float(o.yp(-58)), fade(0.0))
            rotulo(img, "epífise", 6, 142, 86, 141, fade(1.1))
            rotulo(img, "articulação", 132 - 50, 196, 132, 159, fade(1.6), tam=34) if False else None
        elif cid in TIPOS:
            o = ossos[0]
            i = TIPOS[cid]
            colar(img, texto_img(f"TIPO {ROMANOS[i]}", "jersey", 96, OURO, None, 0, sombra=5), FILME_X + 18, FILME_Y + 8,
                  suave(tl / 0.25))
            t_ini = 0.45
            fr = (tl - t_ini) / 0.9
            if cid == "a":
                if tl > t_ini + 1.0:
                    preencher(img, self.frag, "#f4cf7c", 0.32 * suave((tl - t_ini - 1.0) / 0.4))
            if cid in self.tr:
                aplicar_traco(img, mascara_traco(self.tr[cid], fr), glow=1.0)
                p = ponta_traco(self.tr[cid], fr)
                if p is not None and fr < 1:
                    faisca(img, p)
            fade = lambda s0: suave((tl - s0) / 0.3)
            if cid == "s":
                rotulo(img, "só na fise", 6, 104, 76, float(o.yp(-56)) - 1, fade(1.2))
            elif cid == "a":
                rotulo(img, "Thurston-Holland", 4, 70, 89, 109, fade(c["chunks"][2]))
                rotulo(img, "metáfise", 140 + 64, 66, 160, 90, fade(c["chunks"][1]), tam=34) if False else None
            elif cid == "l":
                rotulo(img, "articulação", 176, 186, 142, 156, fade(c["chunks"][2]))
            elif cid == "t":
                rotulo(img, "atravessa tudo", 4, 70, 106, 96, fade(c["chunks"][1]))
                rotulo(img, "articular", 190, 186, 140, 155, fade(c["chunks"][2]))
            elif cid == "r":
                # a fise é esmagada: setas apertando e a faixa pulsando em vermelho, sem traço
                aperto = suave((tl - 0.4) / 0.4)
                ciclo = (math.sin((tl - 0.4) * 10) + 1) / 2 if tl > 0.4 else 0
                for ux in (-30, 0, 30):
                    seta_pixel(img, 132 + ux, 104 + 6 * aperto * ciclo, 1, aperto)
                    seta_pixel(img, 132 + ux, 139 - 6 * aperto * ciclo, -1, aperto)
                pf = amostrar(caminho_fise(o, -56, 56))
                if tl > 0.5:
                    aplicar_traco(img, mascara_traco(pf, 1.0), "#ffd0c4", "#ff7860", 0.5 + 0.6 * ciclo, "#ff5a40")
                rotulo(img, "raio-x: normal", 150, 186, 160, 124, fade(c["chunks"][2]))
            # fonte, discreta, no pé do filme
            colar(img, texto_img("Rockwood Crianças, 10ª ed., cap. 2", "jakarta", 26, (200, 214, 214), 600, 4, (5, 8, 10)),
                  FILME_X + FW * ESC - 520, FILME_Y + FH * ESC - 48, 0.85)
        elif cid == "virada":
            a, b = ossos
            rotulo_topo(img, "LADO BOM", 66, 14, 1.0)
            rotulo_topo(img, "LADO LESADO", 198, 14, 1.0)
            k = 16.0 * suave((tl - c["chunks"][1] + 0.1) / 1.2)
            if k > 0.5:
                # linha tracejada do comprimento esperado e a diferença
                ya_bom = a.pt(0, float(a.ya(0)))[1]
                ya_mau = b.pt(0, float(b.ya(0)))[1]
                y_px = int(FILME_Y + ya_bom * ESC)
                for x in range(FILME_X + 150 * ESC, FILME_X + 258 * ESC, 18):
                    img[y_px - 2:y_px + 2, x:x + 9] = hexa("#f4cf7c")
                xb = FILME_X + 252 * ESC
                y2 = int(FILME_Y + ya_mau * ESC)
                img[y2:y_px, xb - 2:xb + 2] = hexa("#ff7860")
                img[y2 - 2:y2 + 2, xb - 12:xb + 12] = hexa("#ff7860")
                rotulo(img, "parou de crescer", 132 + 6, 34, 198, float(b.pt(0, float(b.yp(0)))[1]), suave((tl - c["chunks"][2]) / 0.3), cor=(255, 200, 180), tam=34)
            if tl < c["chunks"][1]:
                rotulo(img, "no dia: normal", 132 + 10, 34, 198, float(b.pt(0, float(b.yp(0)))[1]), suave((tl - 0.3) / 0.3), tam=34)
        elif cid == "fim":
            o = ossos[0]

        # ---------------- placa do título
        if cid in TITULOS:
            titulo = TITULOS[cid]
        else:
            titulo = "SALTER-HARRIS"
        timg = texto_img(titulo, "jersey", 112 if len(titulo) <= 13 else 92, OURO, None, 0, sombra=6)
        colar_centro(img, timg, LW / 2, (cena.PLACA[1] + cena.PLACA[3]) / 2 * ESC)

        # ---------------- ladrilhos SALTR
        if cid == "fise":
            n = (tl - c["chunks"][3]) / 0.14 if tl > c["chunks"][3] else 0
            if n > 0:
                desenhar_ladrilhos(img, n, None, 0, [], t)
        elif cid in TIPOS:
            i_at = TIPOS[cid]
            desenhar_ladrilhos(img, 5, i_at, i_at, [], t)
            desenhar_significados(img, [1.0 if j < i_at else (suave((tl - 0.25) / 0.35) if j == i_at else 0.0) for j in range(5)], i_at)
        elif cid in ("virada", "fim"):
            desenhar_ladrilhos(img, 5, 4 if cid == "virada" else None, 5, [], t)
            desenhar_significados(img, [1.0] * 5, None)

        # ---------------- mascote
        anim = "raiox" if cid in ("gancho", "virada") else ("comemorando" if cid == "fim" else "orientando")
        q = int(t * 8) % 8
        fr_m = mascote_quadro(anim, q)
        pe = self.pe_mascote[anim]
        colar(img, fr_m, -16, cena.MESA_Y * ESC + 8 - pe)

        # ---------------- luz, tom, vinheta, grão
        img = self.pos(img, t)

        # ---------------- cartão final (por cima, sem grão)
        if cid == "fim":
            cartao_final(img, suave((tl - c["chunks"][1]) / 0.5))

        # ---------------- placa fixa do site (o vídeo inteiro)
        placa_site_texto(img)

        # ---------------- legenda
        ch = chunk_em(c, tl)
        if not (cid == "fim" and tl > c["chunks"][1] + 0.2 and False):
            leg = legenda_img(LEGENDAS[cid][ch])
            t_ch = tl - c["chunks"][ch]
            esc = 1.0 + 0.08 * (1 - suave(t_ch / 0.12))
            y_leg = 1335
            colar_centro(img, leg, LW / 2, y_leg, 1.0 if tl < c["fala"] + 0.25 or cid == "fim" else max(0, 1 - (tl - c["fala"] - 0.25) / 0.1), esc)
        return np.clip(img, 0, 1)

    def pos(self, img, t):
        # bloom barato (em baixa resolução)
        alto = np.clip(img - 0.8, 0, None)
        peq = alto[::6, ::6]
        bl = gaussian_filter(peq, (8, 8, 0))
        bl = np.repeat(np.repeat(bl, 6, 0), 6, 1)[:LH, :LW]
        img = img + bl * 0.9
        img = img / (1 + img * 0.16)
        lum = img.mean(axis=-1, keepdims=True)
        img = img + np.clip(1 - lum * 2.2, 0, 1) * hexa("#0a1830") * 0.10
        img = img * self.vinheta
        g = self.graos[int(t * FPS / 2) % len(self.graos)]
        img = img + np.repeat(np.repeat(g, 3, 0), 3, 1)[..., None]
        return img


def placa_site_texto(img):
    x0, y0, x1, y1 = [v * ESC for v in cena.PLACA_SITE]
    cy = (y0 + y1) / 2
    colar_centro(img, texto_img("Treine para o TEOT, o TARO e a Cirurgia da Mão", "jakarta", 36, CREME, 700, 4, (8, 5, 3)), LW / 2, cy - 27)
    colar_centro(img, texto_img("www.ortoquestoes.com.br", "jakarta", 54, OURO, 800, 4, (8, 5, 3)), LW / 2, cy + 22)


def rotulo_topo(img, txt, fcx, fy, alfa):
    t = texto_img(txt, "jersey", 64, CREME, None, 5, (6, 10, 12))
    colar_centro(img, t, FILME_X + fcx * ESC, FILME_Y + fy * ESC, alfa)


def faisca(img, p):
    """Ponta do traço: uma faísca de ouro."""
    x = int(FILME_X + p[0] * ESC)
    y = int(FILME_Y + p[1] * ESC)
    for r, a in ((22, 0.25), (12, 0.5), (5, 1.0)):
        img[max(0, y - r):y + r, max(0, x - 2):x + 2] += hexa("#fff2c8") * a
        img[max(0, y - 2):y + 2, max(0, x - r):x + r] += hexa("#fff2c8") * a


# ------------------------------------------------------------------ áudio
def trilha(m: Montador) -> np.ndarray:
    sr = 48000
    n = int(m.total * sr) + sr
    mix = np.zeros(n, np.float32)
    for c in m.cenas:
        a, sr0 = sf.read(os.path.join(AQUI, "audio", f"cena-{c['i']:02d}.wav"), dtype="float32")
        if a.ndim > 1:
            a = a.mean(1)
        # reamostra 24k -> 48k
        x = np.interp(np.arange(int(len(a) * sr / sr0)) * sr0 / sr, np.arange(len(a)), a).astype(np.float32)
        x = x / (np.abs(x).max() + 1e-6) * 0.86
        i0 = int(c["t0"] * sr)
        mix[i0:i0 + len(x)] += x[: max(0, n - i0)]

    voz = mix.copy()

    def tom(freq, dur, vol, ataque=0.005, decai=6.0, harm=(1, 2, 3)):
        tt = np.arange(int(dur * sr)) / sr
        s = sum(np.sin(2 * np.pi * freq * h * tt) / (h * h) for h in harm)
        env = np.minimum(1, tt / ataque) * np.exp(-tt * decai)
        return (s * env * vol).astype(np.float32)

    def por(sinal, t):
        i0 = int(t * sr)
        if i0 < n:
            mix[i0:i0 + len(sinal)] += sinal[: n - i0]

    rng = np.random.default_rng(3)
    # zumbido + clique do negatoscópio acendendo
    por(tom(120, 0.35, 0.05, 0.002, 8, (1, 3, 5)), 0.05)
    por(tom(1800, 0.04, 0.12, 0.0005, 80, (1,)), 0.08)
    for c in m.cenas:
        cid = c["id"]
        if cid in TIPOS:
            i = TIPOS[cid]
            por(tom([523.25, 587.33, 659.25, 783.99, 880.0][i], 0.6, 0.11, 0.003, 7), c["t0"])  # ladrilho acende
            if cid != "r":
                # traço riscando: ruído filtrado subindo
                d = 0.9
                tt = np.arange(int(d * sr)) / sr
                ruido = rng.normal(0, 1, len(tt)).astype(np.float32)
                ruido = np.convolve(ruido, np.ones(6) / 6, "same")
                env = np.sin(np.pi * tt / d) ** 0.7 * 0.035
                por((ruido * env).astype(np.float32), c["t0"] + 0.45)
                por(tom(1318.5, 0.5, 0.06, 0.002, 9), c["t0"] + 1.35)
            else:
                for k in range(3):
                    por(tom(70, 0.25, 0.22, 0.002, 14, (1, 2)), c["t0"] + 0.45 + k * 0.31)  # baques do esmagamento
        if cid == "fise":
            for k in range(5):
                por(tom([523.25, 587.33, 659.25, 783.99, 880.0][k], 0.45, 0.08, 0.003, 8), c["t0"] + c["chunks"][3] + k * 0.14)
        if cid == "gancho":
            por(tom(196, 0.5, 0.12, 0.003, 9, (1, 2)), c["t0"] + c["chunks"][1] + 0.1)
            por(tom(185, 0.6, 0.14, 0.003, 7, (1, 2, 4)), c["t0"] + c["chunks"][2])
        if cid == "virada":
            por(tom(98, 1.4, 0.10, 0.2, 1.8, (1, 2)), c["t0"] + c["chunks"][1])
        if cid == "fim":
            for k, f in enumerate((523.25, 659.25, 783.99, 1046.5)):
                por(tom(f, 1.2, 0.07, 0.004, 3.5), c["t0"] + c["chunks"][1] + 0.2 + k * 0.09)
    # música de fundo animada (musica.py), bem baixa, abaixando ainda mais enquanto a voz fala (sidechain)
    from musica import musica

    mus = musica(m.total)
    mus = np.pad(mus, (0, max(0, n - len(mus))))[:n]
    env = np.abs(voz)
    k = int(0.03 * sr)
    env = np.convolve(env, np.ones(k) / k, "same")
    env = np.convolve((env > 0.02).astype(np.float32), np.ones(int(0.25 * sr)) / int(0.25 * sr), "same")
    duck = 1 - 0.5 * np.clip(env, 0, 1)
    mix += (mus * 0.11 * duck).astype(np.float32)
    mix = mix[: int(m.total * sr)]
    pico = np.abs(mix).max()
    if pico > 0.98:
        mix = mix / pico * 0.98
    return mix, sr


def render(saida: str) -> None:
    m = Montador()
    mix, sr = trilha(m)
    wav = os.path.join(AQUI, "audio", "trilha.wav")
    sf.write(wav, mix, sr)
    nq = int(m.total * FPS)
    proc = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{LW}x{LH}", "-r", str(FPS),
        "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", saida], stdin=subprocess.PIPE)
    for k in range(nq):
        q = m.quadro(k / FPS)
        proc.stdin.write((q * 255 + 0.5).astype(np.uint8).tobytes())
        if k % 150 == 0:
            print(f"{k}/{nq}", flush=True)
    proc.stdin.close()
    proc.wait()
    print("ok", saida, round(m.total, 2), "s")


def previas(instantes: list[float]) -> None:
    m = Montador()
    os.makedirs(os.path.join(AQUI, "previa"), exist_ok=True)
    for t in instantes:
        q = m.quadro(t)
        Image.fromarray((q * 255 + 0.5).astype(np.uint8)).save(os.path.join(AQUI, "previa", f"q-{t:05.2f}.png"))
    print("cenas:", [(c["id"], round(c["t0"], 2), [round(x, 2) for x in c["chunks"]]) for c in m.cenas])


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--quadros":
        previas([float(x) for x in sys.argv[2:]])
    else:
        render(os.path.join(AQUI, "salter-harris.mp4"))
