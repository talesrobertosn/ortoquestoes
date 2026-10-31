"""Fogos mágicos que contornam os três atalhos do novo menu principal (31/10/2026), feitos do zero por este script
(numpy + PIL; nada baixado nem de IA).

Gera em public/pixel/menu/:
- fogo-tempo.png  "Fogo do Tempo" (Cronograma): âmbar e ouro, línguas pequenas e bem desenhadas, poucas brasas,
  intensidade baixa e ritmo calmo (constância).
- fogo-saber.png  "Fogo do Conhecimento" (Resumos): laranja-claro delicado, com cintilas e pequenos sinais que lembram
  letras iluminadas de página subindo no ar.
- fogo-atlas.png  "Fogo Anatômico" (Atlas 3D): ciano para violeta, frio e enérgico, partículas quadradas, faíscas de
  varredura verticais e uma pulsação leve.
  Cada um: faixa VERTICAL de 8 quadros de 32 x 32 (folha 32 x 256), fundo transparente.
- faiscas.png  brasa flutuante, 8 quadros de 8 x 8 em faixa horizontal (64 x 8).
- vagalume.png vagalume verde-amarelado, 4 quadros de 6 x 6 em faixa horizontal (24 x 6).

Como a folha dos fogos funciona (importante para o CSS):
O anel em volta do cartão repete a textura nos dois eixos e anima trocando background-position-y em degraus de um
quadro. Como a folha inteira se repete na vertical, embaixo do quadro f aparece o quadro f+1. Por isso a folha é pintada
como UM campo de fogo contínuo F(x, y, t), periódico em x (32 px), em y (32 px) e no tempo (8 quadros), e cada linha da
folha é amostrada num tempo que cresce devagar dentro do quadro: linha r do quadro f usa t = f + r/32. Assim:
- a folha inteira (32 x 256) emenda consigo mesma em cima/embaixo e dos lados, sem costura;
- a linha 31 do quadro f encosta na linha 0 do quadro f+1 sem salto (o tempo é contínuo);
- descer a folha um quadro (32 px) avança exatamente um passo de tempo em cada ponto da tela; o quadro 8 volta ao 1.
O CSS deve repetir a FOLHA TODA (background-size 64px 512px no 2x) e andar de 0 a -512px com steps(8).

As línguas sobem em todo o anel (em cima, nos lados e embaixo), como pedido.
Uso: python3 scripts/gerar_fogos_menu.py [--previa PASTA]
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "menu"

TW = 32          # largura do ladrilho
TH = 32          # altura do ladrilho (= altura do quadro)
N = 8            # quadros no ciclo
SH = TH * N      # altura da folha

# Grade da folha: x, y local do ladrilho e o tempo (em quadros) de cada linha.
_Y, _X = np.mgrid[0:SH, 0:TW].astype(np.float64)
_YL = _Y % TH
_T = _Y / TH     # 0..8, contínuo: linha r do quadro f -> f + r/32


def hx(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)


def enrola(d: np.ndarray | float, p: float) -> np.ndarray:
    """Distância com volta (toro): o ladrilho emenda consigo mesmo."""
    return (np.asarray(d) + p / 2) % p - p / 2


def borra(a: np.ndarray, r: int) -> np.ndarray:
    """Desfoque de caixa com volta nos dois eixos (a folha é um toro 32 x 256, então o brilho também emenda)."""
    out = a.copy()
    for eixo in (0, 1):
        acc = np.zeros_like(out)
        for k in range(-r, r + 1):
            acc += np.roll(out, k, axis=eixo)
        out = acc / (2 * r + 1)
    return out


def lugares(rng: np.random.Generator, n: int, colunas: int, jx: float = 0.35, jy: float = 0.3
            ) -> list[tuple[float, float]]:
    """Posições em "tijolo" (fileiras desencontradas) com sorteio pequeno, num ladrilho toroidal: as línguas quase
    não se sobrepõem, então cada uma mantém a silhueta."""
    linhas = math.ceil(n / colunas)
    pts = []
    for i in range(n):
        c, l = i % colunas, i // colunas
        x = (c + 0.5 + rng.uniform(-jx, jx)) * TW / colunas + (l % 2) * TW / colunas / 2
        y = (l + 0.5 + rng.uniform(-jy, jy)) * TH / linhas
        pts.append((x % TW, y % TH))
    return pts


# ─────────────────────────────── Línguas de fogo ───────────────────────────────
def linguas(rng: np.random.Generator, n: int, colunas: int, alt: tuple[float, float], larg: tuple[float, float],
            subida: float, balanco: float, ciclos: tuple[int, ...] = (1,), solta: float = 0.6,
            afina: float = 0.85, jx: float = 0.12, jy: float = 0.12) -> tuple[np.ndarray, np.ndarray]:
    """Campo de calor (0 a ~1.4) de n línguas que nascem, crescem, soltam a ponta e somem em ciclo fechado.

    Cada língua vive um ciclo de 8/c quadros (c inteiro), com fase própria; no começo do ciclo ela tem altura zero,
    então o "renascimento" no pé não aparece. O pé sobe `subida` px durante a vida; a ponta se solta perto do fim
    (uma gotinha que continua subindo e apaga). Devolve (calor, pé): o pé marca a borda de baixo de cada língua,
    onde entra o filete escuro fino."""
    calor = np.zeros((SH, TW))
    pe = np.zeros((SH, TW), dtype=bool)
    for (x0, y0) in lugares(rng, n, colunas, jx, jy):
        c = int(rng.choice(ciclos))
        fase = rng.uniform(0, 1)
        p = (_T * c / N + fase) % 1.0                     # vida 0..1
        h = rng.uniform(*alt) * np.sin(np.pi * p) ** 0.55 + 0.01
        w = rng.uniform(*larg) * (0.75 + 0.25 * np.sin(np.pi * p))
        bal_f = rng.uniform(0, 1)
        cb = int(rng.choice((1, 2)))
        base_y = y0 - subida * p
        dy = enrola(base_y - _YL, TH)                      # para cima positivo
        t = dy / h
        # Balanço: a ponta oscila mais que o pé (ciclo fechado em 8 quadros).
        s = balanco * np.clip(t, 0, 1.2) ** 1.4 * np.sin(2 * np.pi * (cb * _T / N + bal_f) + t * 2.2)
        dx = enrola(_X - x0 - s, TW)
        # Largura: pé arredondado, corpo em gota, ponta fina.
        hw = np.where(t < 0, w * np.sqrt(np.clip(1 - (t / 0.22) ** 2, 0, 1)),
                      w * np.clip((t + 0.22) / 0.4, 0, 1) ** 0.5 * np.clip(1 - t, 0, 1) ** afina)
        d = np.abs(dx) / (hw + 0.45)
        dentro = (d < 1) & (t > -0.22) & (t < 1)
        q = (1 - d) * 0.62 + (1 - np.clip(t, 0, 1)) * 0.7 - 0.08
        calor = np.maximum(calor, np.where(dentro, q, 0))
        pe |= dentro & (t < -0.02) & (h > 2.0)
        # A ponta que se solta: aparece na segunda metade da vida e sobe mais rápido que o pé.
        if solta > 0:
            ps = np.clip((p - 0.5) / 0.5, 0, 1)
            gy = base_y - h - 1.0 - ps * 5.0
            gx = x0 + balanco * np.sin(2 * np.pi * (cb * _T / N + bal_f) + 2.2)
            ddy = enrola(_YL - gy, TH)
            ddx = enrola(_X - gx, TW)
            r = 0.95 * (1 - ps) + 0.15
            g = (ddx ** 2 + (ddy * 0.8) ** 2) < r ** 2
            calor = np.maximum(calor, np.where(g & (p > 0.5), solta * (1 - 0.6 * ps), 0))
    return calor, pe


# ─────────────────────────────── Partículas ───────────────────────────────
def particulas(rng: np.random.Generator, n: int, subida_ciclo: int, deriva: float, vida: float = 1.0,
               ciclos: tuple[int, ...] = (1,)) -> list[dict]:
    """Partículas que sobem `subida_ciclo` * 32 px por ciclo (inteiro: emenda no tempo) e derivam para os lados.
    Devolve, para cada uma, arrays (por linha da folha) de posição e de vida."""
    out = []
    for (x0, y0) in lugares(rng, n, max(1, n // 2)):
        c = int(rng.choice(ciclos))
        f = rng.uniform(0, 1)
        p = (_T * c / N + f) % 1.0
        y = y0 - p * TH * subida_ciclo
        x = x0 + deriva * np.sin(2 * np.pi * (_T / N + rng.uniform(0, 1)))
        out.append({"x": x, "y": y, "p": p, "viva": p < vida, "sem": rng.uniform(0, 1)})
    return out


def ponto(pt: dict, raio: float = 0.5) -> np.ndarray:
    dx = enrola(_X - np.round(pt["x"]), TW)
    dy = enrola(_YL - np.round(pt["y"]), TH)
    return (np.abs(dx) < raio) & (np.abs(dy) < raio) & pt["viva"]


def carimbo(pt: dict, mapa: np.ndarray) -> np.ndarray:
    """Desenha um bitmap pequeno (0 = vazio, >0 = tom) centrado na partícula. Devolve o tom por pixel (0 = nada)."""
    hh, ww = mapa.shape
    dx = np.round(enrola(_X - np.round(pt["x"]), TW)).astype(int) + ww // 2
    dy = np.round(enrola(_YL - np.round(pt["y"]), TH)).astype(int) + hh // 2
    ok = (dx >= 0) & (dx < ww) & (dy >= 0) & (dy < hh) & pt["viva"]
    v = np.zeros((SH, TW))
    v[ok] = mapa[dy[ok], dx[ok]]
    return v


# ─────────────────────────────── Cor ───────────────────────────────
class Tela:
    """Folha RGBA em float, com pintura por cima (src-over)."""

    def __init__(self) -> None:
        self.rgb = np.zeros((SH, TW, 3))
        self.a = np.zeros((SH, TW))

    def pinta(self, mask: np.ndarray, cor: np.ndarray | str, alfa: float | np.ndarray = 1.0) -> None:
        c = hx(cor) if isinstance(cor, str) else cor
        al = np.where(mask, alfa, 0.0)
        na = al + self.a * (1 - al)
        seguro = np.maximum(na, 1e-6)
        for k in range(3):
            cc = c[..., k] if np.ndim(c) == 3 else c[k]
            self.rgb[..., k] = (cc * al + self.rgb[..., k] * self.a * (1 - al)) / seguro
        self.a = na

    def png(self) -> Image.Image:
        arr = np.dstack([np.clip(self.rgb, 0, 255), np.clip(self.a * 255, 0, 255)]).round().astype(np.uint8)
        arr[arr[..., 3] == 0] = 0
        return Image.fromarray(arr, "RGBA")


def colorir(tela: Tela, calor: np.ndarray, faixas: list[tuple[float, str, float]]) -> None:
    """Faixas de calor em degraus (sem degradê): [(limiar, cor, alfa)], da mais fria para a mais quente."""
    for lim, c, al in faixas:
        tela.pinta(calor >= lim, c, al)


def brilho(tela: Tela, calor: np.ndarray, cores: tuple[str, ...], r: int, alfas: tuple[float, ...],
           degraus: tuple[float, ...]) -> None:
    """Corpo do fogo: halo translúcido em degraus (sem degradê) que liga as línguas e enche o anel.
    Pintado antes das línguas; cada degrau tem cor e alfa próprios (do mais fraco ao mais forte)."""
    b = borra(np.clip(calor, 0, 1), r)
    for lim, c, al in zip(degraus, cores, alfas):
        tela.pinta(b >= lim, c, al)


# ─────────────────────────────── 1. Fogo do Tempo ───────────────────────────────
def fogo_tempo() -> Image.Image:
    rng = np.random.default_rng(1207)
    calor, pe = linguas(rng, n=20, colunas=5, alt=(4.5, 7.0), larg=(1.2, 1.7), subida=3.0, balanco=0.6,
                    ciclos=(1,), solta=0.55, afina=0.9, jy=0.25)
    tela = Tela()
    brilho(tela, calor, ("#f0c46a", "#eab250", "#e39a2a"), 2, (0.22, 0.30, 0.38), (0.06, 0.16, 0.28))
    colorir(tela, calor, [
        (0.06, "#d98c1e", 0.75),   # borda âmbar translúcida
        (0.18, "#c8761a", 1.0),    # âmbar
        (0.40, "#e8a83a", 1.0),
        (0.62, "#f0c46a", 1.0),    # ouro
        (0.92, "#fff3c4", 1.0),    # miolo pálido
    ])
    tela.pinta(pe & (calor >= 0.2) & (calor < 0.62), "#8a4b0c", 0.75)   # pé fino âmbar-escuro
    # Brasas discretas: poucas, lentas, piscam.
    for pt in particulas(rng, 4, 1, 1.2, vida=0.8):
        piscar = (np.floor(pt["p"] * 8 + pt["sem"] * 3) % 3) != 2
        tela.pinta(ponto(pt) & piscar, "#f0c46a" if pt["sem"] > 0.5 else "#ffe39a", 0.95)
    return tela.png()


# ─────────────────────────────── 2. Fogo do Conhecimento ───────────────────────────────
# Sinais miúdos que lembram letras iluminadas (2 a 3 px): "i", traço, "+", "ponto duplo", "L", "v".
GLIFOS = [
    np.array([[2, 0, 0], [0, 0, 0], [1, 0, 0]], dtype=float)[:, :1],
    np.array([[1, 2, 1]], dtype=float),
    np.array([[0, 1, 0], [1, 2, 1], [0, 1, 0]], dtype=float),
    np.array([[2], [0], [2]], dtype=float),
    np.array([[1, 0], [2, 1]], dtype=float),
    np.array([[1, 0, 1], [0, 2, 0]], dtype=float),
]


def fogo_saber() -> Image.Image:
    rng = np.random.default_rng(3141)
    calor, pe = linguas(rng, n=12, colunas=4, alt=(5.5, 8.5), larg=(1.3, 1.8), subida=4.0, balanco=1.2,
                    ciclos=(1,), solta=0.6, afina=1.0, jx=0.2, jy=0.3)
    tela = Tela()
    brilho(tela, calor, ("#ffe2bf", "#ffcc94", "#ffb46e"), 2, (0.22, 0.28, 0.34), (0.04, 0.12, 0.24))
    colorir(tela, calor, [
        (0.06, "#d8641e", 0.7),    # borda laranja translúcida (delicada)
        (0.22, "#f08a32", 1.0),
        (0.46, "#ffaa50", 1.0),
        (0.78, "#ffd08a", 1.0),
        (1.00, "#fff0d0", 1.0),
    ])
    tela.pinta(pe & (calor >= 0.22) & (calor < 0.46), "#c4561a", 0.7)
    # Cintilas: estrelinha de 4 pontas que acende e apaga enquanto sobe.
    estrela_g = np.array([[0, 1, 0], [1, 2, 1], [0, 1, 0]], dtype=float)
    for pt in particulas(rng, 6, 1, 2.0, vida=0.85):
        fase = (pt["p"] * 3 + pt["sem"]) % 1.0
        grande = fase < 0.35
        v = carimbo(pt, estrela_g)
        tela.pinta((v == 1) & grande, "#ffd27a", 0.8)
        tela.pinta(v == 2, "#fffaf0" if pt["sem"] > 0.4 else "#ffe9a8", 1.0)
    # Sinais de página: letrinhas douradas que flutuam devagar e somem.
    for i, pt in enumerate(particulas(rng, 6, 1, 1.0, vida=0.75)):
        g = GLIFOS[(i * 2 + 1) % len(GLIFOS)]
        v = carimbo(pt, g)
        al = np.where(pt["p"] > 0.55, 0.6, 0.95)
        tela.pinta(v == 2, "#c98a1c", al)
        tela.pinta(v == 1, "#e6b04a", al * 0.85)
    # Pontinhos de luz miúdos.
    for pt in particulas(rng, 6, 2, 1.5, vida=0.9):
        tela.pinta(ponto(pt), "#ffc070", 0.85)
    return tela.png()


# ─────────────────────────────── 3. Fogo Anatômico ───────────────────────────────
def fogo_atlas() -> Image.Image:
    rng = np.random.default_rng(2718)
    calor, pe = linguas(rng, n=20, colunas=5, alt=(6.0, 10.0), larg=(0.9, 1.3), subida=6.0, balanco=0.4,
                    ciclos=(1, 2), solta=0.7, afina=1.3, jx=0.15, jy=0.3)
    # Pulsação leve: o fogo inteiro respira duas vezes por ciclo.
    pulso = 1.0 + 0.12 * np.sin(2 * np.pi * 2 * _T / N)
    calor = calor * pulso
    tela = Tela()
    brilho(tela, calor, ("#bfe6ff", "#9cc4ff", "#a08cf4"), 2, (0.16, 0.22, 0.3), (0.06, 0.16, 0.3))
    colorir(tela, calor, [
        (0.06, "#9a86f4", 0.6),    # borda violeta translúcida
        (0.22, "#7a5cf0", 1.0),    # violeta claro
        (0.40, "#3f8ff0", 1.0),    # azul
        (0.62, "#36c6ec", 1.0),    # ciano
        (0.84, "#c8f4ff", 1.0),
        (1.05, "#ffffff", 1.0),
    ])
    tela.pinta(pe & (calor >= 0.22) & (calor < 0.4), "#4a2ab0", 0.7)
    # Faíscas de varredura: fios verticais de 1 px que sobem rápido (cabeça clara, cauda violeta).
    for pt in particulas(rng, 3, 2, 0.0, vida=0.7):
        for k, (c, al) in enumerate((("#e8fbff", 1.0), ("#7fd6ff", 0.9), ("#8a6cf0", 0.7), ("#8a6cf0", 0.35))):
            q = dict(pt, y=pt["y"] + k)
            tela.pinta(ponto(q), c, al)
    # Partículas quadradas (2x2 ou 1x1) que sobem e piscam.
    quad = np.array([[1, 1], [1, 1]], dtype=float)
    for pt in particulas(rng, 3, 1, 1.5, vida=0.8):
        if pt["sem"] > 0.5:
            v = carimbo(pt, quad)
            tela.pinta((v > 0) & (pt["p"] < 0.35), "#b9a8ff", 0.85)
            tela.pinta(ponto(pt) & (pt["p"] >= 0.35), "#c8f4ff", 0.9)
        else:
            tela.pinta(ponto(pt), "#a8f0ff", 0.9)
    return tela.png()


# ─────────────────────────────── Sprites soltos ───────────────────────────────
def faiscas() -> Image.Image:
    """Brasa quente que flutua: miolo de 1-2 px, halo em degraus que respira, sobe e desce 1 px."""
    folha = Image.new("RGBA", (8 * 8, 8), (0, 0, 0, 0))
    for q in range(8):
        f = q / 8 * 2 * np.pi
        cx, cy = 3.5 + 0.6 * math.sin(f), 3.5 - 0.9 * math.sin(f + 0.8)
        resp = 0.5 + 0.5 * math.sin(f)
        img = np.zeros((8, 8, 4))
        for y in range(8):
            for x in range(8):
                d = math.hypot(x - cx, y - cy)
                if d < 0.75:
                    c, a = "#fff6d0", 1.0
                elif d < 1.45:
                    c, a = "#ffc860", 1.0
                elif d < 2.3:
                    c, a = "#ff9a3a", 0.45 + 0.25 * resp
                elif d < 3.2 + 0.4 * resp:
                    c, a = "#ffb050", 0.16 + 0.10 * resp
                else:
                    continue
                img[y, x, :3] = hx(c)
                img[y, x, 3] = a * 255
        folha.paste(Image.fromarray(img.round().astype(np.uint8), "RGBA"), (q * 8, 0))
    return folha


def vagalume() -> Image.Image:
    """Vagalume verde-amarelado: acende, brilha, esmaece, quase apaga."""
    folha = Image.new("RGBA", (6 * 4, 6), (0, 0, 0, 0))
    nivel = [0.55, 1.0, 0.7, 0.2]
    for q, nv in enumerate(nivel):
        img = np.zeros((6, 6, 4))
        for y in range(6):
            for x in range(6):
                d = math.hypot(x - 2.5, y - 2.5)
                if d < 0.8:
                    c, a = ("#f6ffb0" if nv > 0.5 else "#d8f070"), 0.6 + 0.4 * nv
                elif d < 1.7:
                    c, a = "#c8f04a", 0.25 + 0.6 * nv
                elif d < 2.6:
                    c, a = "#a8e040", 0.25 * nv
                else:
                    continue
                if a < 0.03:
                    continue
                img[y, x, :3] = hx(c)
                img[y, x, 3] = a * 255
        folha.paste(Image.fromarray(img.round().astype(np.uint8), "RGBA"), (q * 6, 0))
    return folha


# ─────────────────────────────── Prévia (fora do repositório) ───────────────────────────────
def _arred(w: int, h: int, r: float, ox: float = 0, oy: float = 0, W: int = 0, H: int = 0) -> np.ndarray:
    yy, xx = np.mgrid[0:H, 0:W].astype(float) + 0.5
    x0, y0, x1, y1 = ox, oy, ox + w, oy + h
    cx = np.clip(xx, x0 + r, x1 - r)
    cy = np.clip(yy, y0 + r, y1 - r)
    return ((xx - cx) ** 2 + (yy - cy) ** 2 <= r * r) & (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)


def anel(folha: Image.Image, quadro: int, anel_px: int = 10, escala: int = 2, raio: int = 16,
         opac: float = 1.0) -> Image.Image:
    """Simula o CSS: cartão 220 x 120 em #fbfaf6, anel de `anel_px` px css com a folha ampliada 2x repetida."""
    cw, ch, m = 220, 120, 26
    W, H = cw + 2 * m, ch + 2 * m
    tex = np.asarray(folha.resize((folha.width * escala, folha.height * escala), Image.NEAREST)).astype(float)
    th, tw = tex.shape[:2]
    lx, ly = m - anel_px, m - anel_px
    yy, xx = np.mgrid[0:H, 0:W]
    tx = (xx - lx) % tw
    ty = (yy - ly + quadro * TH * escala) % th
    camada = tex[ty, tx]
    fora = _arred(cw + 2 * anel_px, ch + 2 * anel_px, raio + anel_px, lx, ly, W, H)
    cartao = _arred(cw, ch, raio, m, m, W, H)
    mask = fora & ~cartao
    fundo = np.ones((H, W, 3)) * hx("#fbfaf6")
    a = camada[..., 3:4] / 255 * mask[..., None] * opac
    img = fundo * (1 - a) + camada[..., :3] * a
    # Cartão: branco com borda fina.
    borda = _arred(cw, ch, raio, m, m, W, H) & ~_arred(cw - 2, ch - 2, raio - 1, m + 1, m + 1, W, H)
    img[cartao] = hx("#ffffff")
    img[borda] = hx("#dce2e0")
    return Image.fromarray(img.round().astype(np.uint8), "RGB")


def previa(folhas: dict[str, Image.Image], destino: Path, anel_px: int = 10, sufixo: str = "") -> None:
    destino.mkdir(parents=True, exist_ok=True)
    linhas = []
    for nome, folha in folhas.items():
        quadros = [anel(folha, q, anel_px) for q in (0, 2, 4, 6)]
        w, h = quadros[0].size
        linha = Image.new("RGB", (w * 4 + 30, h), "#fbfaf6")
        for i, im in enumerate(quadros):
            linha.paste(im, (i * (w + 10), 0))
        linhas.append(linha)
        gif = [anel(folha, q, anel_px).resize((w * 2, h * 2), Image.NEAREST) for q in range(N)]
        gif[0].save(destino / f"anel-{nome}{sufixo}.gif", save_all=True, append_images=gif[1:], duration=140, loop=0)
        # Folha ampliada 8x, com a folha repetida 3x3 para ver costuras.
        rep = Image.new("RGBA", (TW * 3, SH * 2))
        for i in range(3):
            for j in range(2):
                rep.paste(folha, (i * TW, j * SH))
        bg = Image.new("RGBA", rep.size, "#fbfaf6")
        bg.alpha_composite(rep)
        bg.convert("RGB").resize((rep.width * 4, rep.height * 4), Image.NEAREST).save(destino / f"folha-{nome}.png")
    W = max(l.width for l in linhas)
    comp = Image.new("RGB", (W, sum(l.height + 12 for l in linhas)), "#fbfaf6")
    y = 0
    for l in linhas:
        comp.paste(l, (0, y))
        y += l.height + 12
    comp.resize((comp.width * 2, comp.height * 2), Image.NEAREST).save(destino / f"aneis{sufixo}.png")
    # Recorte ampliado de um canto (detalhe do pixel).
    for nome, folha in folhas.items():
        im = anel(folha, 0, anel_px)
        im.crop((0, 0, 140, 70)).resize((560, 280), Image.NEAREST).save(destino / f"zoom-{nome}{sufixo}.png")


# ─────────────────────── Chamas soltas da borda de cima (31/10/2026) ───────────────────────
# No menu real o anel fino virou purpurina; estas são línguas únicas que ficam EM PÉ na borda de cima de cada cartão
# (4 a 6 ao longo da borda e 1 ou 2 menores nos cantos). Faixa horizontal de 8 quadros de 12 x 20, base na última
# linha, ciclo fechado (o quadro 8 volta ao 1).
CW, CH = 12, 20


def _quadro_vazio() -> np.ndarray:
    return np.zeros((CH, CW, 4))


def _por(img: np.ndarray, x: int, y: int, c: str, a: float) -> None:
    """Pinta por cima (src-over) um pixel do quadro."""
    if not (0 <= x < CW and 0 <= y < CH):
        return
    rgb, al = hx(c), a
    na = al + img[y, x, 3] * (1 - al)
    if na <= 0:
        return
    img[y, x, :3] = (rgb * al + img[y, x, :3] * img[y, x, 3] * (1 - al)) / na
    img[y, x, 3] = na


def _lingua(img: np.ndarray, q: int, pal: list[str], alt: float, larg: float, amp: float, viva: float,
            brilho: str, brilho_a: float, pe: str | None, cx: float = 5.5, solta: bool = True,
            quente: float = 0.0, borda_a: float = 1.0, fase0: float = 0.0, com_brilho: bool = True) -> None:
    """Uma língua em gota: pé arredondado na última linha, corpo que balança, ponta fina que às vezes se solta.
    pal vai do miolo (0) à borda (último). Brilho atrás em 2 degraus de alfa (sem degradê borrado)."""
    fase = q / N * 2 * np.pi + fase0
    base = CH - 0.5
    a_q = alt * (1 + 0.07 * viva * np.sin(2 * fase + 0.6) + 0.04 * np.sin(fase))
    # Brilho em degraus atrás.
    cy = base - a_q * 0.42
    rb = (larg + 2.6) * (1 + 0.05 * np.sin(2 * fase))
    for y in range(CH if com_brilho else 0):
        for x in range(CW):
            d = np.hypot((x + 0.5 - cx - 0.5) / rb, (y + 0.5 - cy) / (a_q * 0.62))
            if d < 1:
                _por(img, x, y, brilho, brilho_a * (0.45 if d > 0.68 else 1.0))
    corpo = np.zeros((CH, CW), dtype=bool)
    for y in range(CH):
        t = (base - (y + 0.5)) / a_q
        if t < -0.1 or t > 1.25:
            continue
        tt = max(t, 0.0)
        sw = amp * tt ** 1.3 * np.sin(fase + tt * 2.4) + amp * 0.4 * tt ** 2 * np.sin(2 * fase - tt * 5.0)
        if t <= 1:
            hw = larg * min(1.0, (tt + 0.15) / 0.35) ** 0.5 * (1 - tt) ** 0.85
            hw *= 1 + viva * 0.14 * np.sin(3 * fase + tt * 7.0) + viva * 0.07 * np.sin(fase - tt * 11.0)
        else:
            liga = solta and np.sin(fase * 2 + 1.0) > 0.25 - viva * 0.2
            hw = 0.5 if liga and t < 1.1 + 0.1 * viva else 0.0
        if hw <= 0:
            continue
        for x in range(CW):
            d = abs(x + 0.5 - (cx + 0.5 + sw)) / (hw + 0.5)
            if d > 1:
                continue
            calor = (1 - d) * 0.62 + (1 - min(tt, 1.2)) * 0.72 - 0.12 + quente
            i = 0 if calor > 1.0 else 1 if calor > 0.82 else 2 if calor > 0.62 else 3 if calor > 0.42 else 4
            i = min(i, len(pal) - 1)
            if hw < 0.9 or t > 1:
                i = min(max(i, 2), len(pal) - 2)   # ponta fina em tom médio (sem "pavio" escuro)
            _por(img, x, y, pal[i], borda_a if i == len(pal) - 1 else 1.0)
            corpo[y, x] = True
    # Pé fino mais escuro: só a última linha, nas pontas do pé (o miolo continua quente).
    xs = np.where(corpo[CH - 1])[0]
    if len(xs) and pe:
        for x in xs:
            borda = x in (xs.min(), xs.max())
            _por(img, int(x), CH - 1, pe, 0.95 if borda else 0.55)


def _folha_chama(desenha) -> Image.Image:
    folha = np.zeros((CH, CW * N, 4))
    for q in range(N):
        img = _quadro_vazio()
        desenha(img, q)
        folha[:, q * CW:(q + 1) * CW] = img
    arr = np.dstack([np.clip(folha[..., :3], 0, 255), np.clip(folha[..., 3] * 255, 0, 255)]).round().astype(np.uint8)
    arr[arr[..., 3] == 0] = 0
    return Image.fromarray(arr, "RGBA")


def chama_tempo() -> Image.Image:
    pal = ["#fff3c4", "#ffe39a", "#f0c46a", "#e8a83a", "#c8761a"]

    def d(img: np.ndarray, q: int) -> None:
        # Linguinha de lado (atrás), defasada; depois a principal.
        _lingua(img, q, pal, alt=6.5, larg=1.6, amp=0.6, viva=0.6, brilho="#f0c46a", brilho_a=0.0, pe=None,
                cx=3.5, solta=False, fase0=2.2, com_brilho=False)
        _lingua(img, q, pal, alt=12.5, larg=2.8, amp=0.9, viva=0.5, brilho="#f0c46a", brilho_a=0.2, pe="#8a4b0c",
                cx=6.0)
        # Brasa miúda só em parte do ciclo, subindo devagar ao lado.
        if q in (3, 4, 5, 6):
            k = q - 3
            _por(img, 8 + (k // 2), 5 - k, "#f0c46a" if k < 3 else "#e8a83a", 0.95 if k < 3 else 0.6)
    return _folha_chama(d)


def chama_saber() -> Image.Image:
    pal = ["#fff0d0", "#ffd08a", "#ffaa50", "#f08a32", "#e0782a"]
    # Duas cintilas/letrinhas acima da chama, em ciclos desencontrados.
    estrela = [(0, -1), (-1, 0), (1, 0), (0, 1)]

    def d(img: np.ndarray, q: int) -> None:
        _lingua(img, q, pal, alt=6.0, larg=1.7, amp=0.8, viva=0.8, brilho="#ffc48a", brilho_a=0.0, pe=None,
                cx=7.5, solta=False, fase0=3.4, com_brilho=False, borda_a=0.7)
        _lingua(img, q, pal, alt=11.0, larg=3.3, amp=1.4, viva=0.8, brilho="#ffc48a", brilho_a=0.24,
                pe="#c4561a", cx=5.0, borda_a=0.7, quente=0.05)
        # Cintila de 4 pontas: sobe da esquerda, acende no meio do caminho e apaga.
        y = 6 - (q * 6) // N
        x = 2 + (1 if q >= 4 else 0)
        if q not in (7,):
            _por(img, x, y, "#fffaf0", 1.0)
            if q in (2, 3, 4):
                for dx, dy in estrela:
                    _por(img, x + dx, y + dy, "#ffd27a", 0.75)
        # Letrinha dourada ("i"): sobe pela direita, defasada meio ciclo.
        k = (q + 4) % N
        y2 = 7 - (k * 7) // N
        a2 = 0.95 if k < 5 else 0.5
        if k != 7:
            _por(img, 9, y2, "#c98a1c", a2)
            _por(img, 9, y2 + 2, "#e6b04a", a2 * 0.9)
    return _folha_chama(d)


def chama_atlas() -> Image.Image:
    # Miolo branco-azulado (branco puro some no marfim do menu), corpo ciano, borda azul, ponta e pé violeta.
    pal = ["#f2fdff", "#9ae8fb", "#2fc0ea", "#3a86ee", "#6a4ee6"]

    def d(img: np.ndarray, q: int) -> None:
        pulso = 1 + 0.1 * np.sin(2 * np.pi * 2 * q / N)
        _lingua(img, q, pal, alt=16.5 * pulso, larg=2.5, amp=0.8, viva=1.2, brilho="#a99cf6", brilho_a=0.2,
                pe="#4a2ab0", cx=5.5, quente=0.04)
        # Faísca de varredura vertical: fio de 1 px que sobe rápido (2 passagens por ciclo).
        k = q % 4
        y = 9 - k * 3
        x = 8 if q < 4 else 2
        for j, (c, a) in enumerate((("#e8fbff", 1.0), ("#7fd6ff", 0.9), ("#8a6cf0", 0.6))):
            _por(img, x, y + j, c, a)
    return _folha_chama(d)


def previa_chamas(chamas: dict[str, Image.Image], destino: Path) -> None:
    """Borda de cima de um cartão 220 x 120 em #fbfaf6, chamas a 2x: 5 ao longo da borda + 2 menores nos cantos.
    Quadros 0..7 lado a lado; uma faixa por fogo; mais um GIF de cada."""
    destino.mkdir(parents=True, exist_ok=True)
    cw, m = 220, 14
    W, H = cw + 2 * m, 70
    raio = 16

    def cena(folha: Image.Image, q: int) -> Image.Image:
        bg = Image.new("RGBA", (W, H), "#fbfaf6")
        card = np.zeros((H, W), dtype=bool)
        cartao = _arred(cw, 120, raio, m, 44, W, H + 80)[:H]
        borda = cartao & ~_arred(cw - 2, 118, raio - 1, m + 1, 45, W, H + 80)[:H]
        arr = np.asarray(bg).copy()
        arr[cartao] = (255, 255, 255, 255)
        arr[borda] = (220, 226, 224, 255)
        bg = Image.fromarray(arr, "RGBA")
        quadro = folha.crop((0, 0, CW, CH))
        grandes = [m + 34 + i * 38 for i in range(5)]
        for i, x in enumerate(grandes):
            qq = (q + i * 3) % N
            fr = folha.crop((qq * CW, 0, (qq + 1) * CW, CH)).resize((CW * 2, CH * 2), Image.NEAREST)
            bg.alpha_composite(fr, (x - CW, 44 - CH * 2 + 1))
        for i, x in enumerate((m + 8, m + cw - 8)):
            qq = (q + 5 + i * 2) % N
            fr = folha.crop((qq * CW, 0, (qq + 1) * CW, CH)).resize((CW * 2, CH * 2), Image.NEAREST)
            fr = fr.resize((int(CW * 1.4), int(CH * 1.4)), Image.NEAREST)  # menor nos cantos (1,4x)
            bg.alpha_composite(fr, (x - fr.width // 2, 44 + 6 - fr.height))
        return bg.convert("RGB")

    faixas = []
    for nome, folha in chamas.items():
        qs = [cena(folha, q) for q in range(N)]
        linha = Image.new("RGB", (W * 4, H * 2), "#fbfaf6")
        for q, im in enumerate(qs):
            linha.paste(im, ((q % 4) * W, (q // 4) * H))
        faixas.append(linha)
        big = [im.resize((W * 2, H * 2), Image.NEAREST) for im in qs]
        big[0].save(destino / f"chama-{nome}.gif", save_all=True, append_images=big[1:], duration=120, loop=0)
        f = Image.new("RGBA", folha.size, "#fbfaf6")
        f.alpha_composite(folha)
        f.convert("RGB").resize((folha.width * 8, folha.height * 8), Image.NEAREST).save(destino / f"chama-folha-{nome}.png")
    comp = Image.new("RGB", (W * 4, sum(l.height for l in faixas)), "#fbfaf6")
    y = 0
    for l in faixas:
        comp.paste(l, (0, y))
        y += l.height
    comp.resize((comp.width * 2, comp.height * 2), Image.NEAREST).save(destino / "chamas.png")
    folhas = Image.new("RGB", (CW * N * 8, CH * 8 * 3 + 20), "white")
    for i, nome in enumerate(chamas):
        folhas.paste(Image.open(destino / f"chama-folha-{nome}.png"), (0, i * (CH * 8 + 10)))
    folhas.save(destino / "chamas-folhas.png")


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    folhas = {"tempo": fogo_tempo(), "saber": fogo_saber(), "atlas": fogo_atlas()}
    for nome, img in folhas.items():
        img.save(PASTA / f"fogo-{nome}.png", optimize=True)
    faiscas().save(PASTA / "faiscas.png", optimize=True)
    vagalume().save(PASTA / "vagalume.png", optimize=True)
    for p in [PASTA / f"fogo-{n}.png" for n in folhas] + [PASTA / "faiscas.png", PASTA / "vagalume.png"]:
        print(f"{p.name}: {p.stat().st_size} bytes")
    chamas = {"tempo": chama_tempo(), "saber": chama_saber(), "atlas": chama_atlas()}
    for nome, img in chamas.items():
        img.save(PASTA / f"chama-{nome}.png", optimize=True)
        p = PASTA / f"chama-{nome}.png"
        print(f"{p.name}: {p.stat().st_size} bytes")
    if "--previa" in sys.argv:
        previa_chamas(chamas, Path(sys.argv[sys.argv.index("--previa") + 1]))
        destino = Path(sys.argv[sys.argv.index("--previa") + 1])
        previa(folhas, destino)
        previa(folhas, destino, 14, "-14")


if __name__ == "__main__":
    main()
