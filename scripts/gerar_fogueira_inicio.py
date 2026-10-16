"""Fogueira da sequência na página inicial (redesenho de 16/10/2026), feita do zero por este script.

Quanto mais dias seguidos, maior a chama e mais rara a cor. Oito estágios, cada um com 4 quadros:

    0 Cinzas          0 dias      lenha apagada, cinza e fumaça subindo
    1 Faísca          1–2         brasa acordando e uma chaminha laranja
    2 Fogueira        3–6         fogueira pequena laranja
    3 Labareda        7–13        média, amarelo-laranja, com faíscas
    4 Fogaréu         14–29       grande, núcleo branco-amarelo
    5 Chama azul      30–59       azul, quente de verdade
    6 Chama arcana    60–99       violeta, com runas flutuando
    7 Chama lendária  100+        dourada, com aura e estrelas

Nada baixado nem gerado por IA: cada pixel sai das funções abaixo (numpy + PIL).
Gera, em public/pixel/inicio/:
- fogueira-estagios.png: 4 colunas (quadros) x 8 linhas (estágios) de 32x36;
- dias-estagios.png: ícones dos dias, 14x14, 4 colunas (feito, hoje feito, parcial, sem estudo)
  x 7 linhas (a cor da chama do estágio 1 ao 7).
Os limites dos estágios ficam também em src/componentes/inicio/estagiosFogueira.ts (os dois
precisam andar juntos). O CSS amplia com image-rendering: pixelated, então os arquivos são minúsculos.

    python3 scripts/gerar_fogueira_inicio.py                 # grava os PNGs
    python3 scripts/gerar_fogueira_inicio.py --folha a.png   # e uma folha ampliada para conferir
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"
QW, QH = 32, 36          # quadro da fogueira
IW = 14                  # ícone do dia (quadrado)
QUADROS = 4


def rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


# Paletas da chama: borda escura -> miolo claro (5 tons)
P_LARANJA = ["#7a1e12", "#c2401a", "#f07a24", "#ffb43a", "#ffe8a0"]
P_LABAREDA = ["#9a2a14", "#e8561c", "#ff9a2a", "#ffd448", "#fff4c0"]
P_FOGAREU = ["#a8301a", "#ff6a1c", "#ffb02e", "#ffe466", "#ffffff"]
P_AZUL = ["#14247a", "#2350d8", "#3c9cff", "#9ee2ff", "#ffffff"]
P_ARCANA = ["#2e0f62", "#6a24c8", "#a85cff", "#dcaaff", "#fff2ff"]
P_LENDA = ["#7a4a0c", "#d4901a", "#ffc83a", "#fff08a", "#ffffff"]

# id, nome, desde, altura, meia-largura, paleta, faíscas
ESTAGIOS = [
    ("cinzas", "Cinzas", 0, 0, 0.0, P_LARANJA, 0),
    ("faisca", "Faísca", 1, 7, 2.6, P_LARANJA, 1),
    ("fogueira", "Fogueira", 3, 13, 5.0, P_LARANJA, 2),
    ("labareda", "Labareda", 7, 18, 6.4, P_LABAREDA, 4),
    ("fogareu", "Fogaréu", 14, 23, 7.8, P_FOGAREU, 5),
    ("azul", "Chama azul", 30, 24, 8.0, P_AZUL, 5),
    ("arcana", "Chama arcana", 60, 25, 8.3, P_ARCANA, 6),
    ("lendaria", "Chama lendária", 100, 26, 8.6, P_LENDA, 7),
]

MADEIRA = ["#2a160a", "#5a3418", "#8a5228", "#b9783c", "#e0a868"]   # contorno, escura, média, clara, anel
CARVAO = ["#141010", "#2e2624", "#4a3f3a", "#655853", "#8a7a70"]
PEDRA = ["#1d2224", "#4e575c", "#7a858b", "#a9b4b9"]
PEDRA_OURO = ["#3b2806", "#8a6414", "#c9962c", "#ffe08a"]


class Quadro:
    """Tela RGBA em numpy, com coordenadas de pixel."""

    def __init__(self, w: int, h: int) -> None:
        self.w, self.h = w, h
        self.px = np.zeros((h, w, 4), np.float32)
        self.y, self.x = np.mgrid[0:h, 0:w].astype(np.float32)

    def pintar(self, mascara: np.ndarray, cor: str, alfa: float = 1.0) -> None:
        r, g, b = rgb(cor)
        m = mascara
        novo = np.array([r, g, b], np.float32)
        a0 = self.px[..., 3:4]
        a = np.float32(alfa)
        cor_final = (novo * a + self.px[..., :3] * a0 * (1 - a)) / np.maximum(a + a0 * (1 - a), 1e-6)
        alfa_final = a + a0[..., 0] * (1 - a)
        self.px[m, :3] = cor_final[m]
        self.px[m, 3] = alfa_final[m]

    def p(self, x: int, y: int, cor: str, alfa: float = 1.0) -> None:
        if 0 <= x < self.w and 0 <= y < self.h:
            m = np.zeros((self.h, self.w), bool)
            m[y, x] = True
            self.pintar(m, cor, alfa)

    def ocupado(self) -> np.ndarray:
        return self.px[..., 3] > 0.5

    def contornar(self, cor: str, so: np.ndarray | None = None) -> None:
        a = self.ocupado() if so is None else so
        viz = np.zeros_like(a)
        viz[1:] |= a[:-1]; viz[:-1] |= a[1:]; viz[:, 1:] |= a[:, :-1]; viz[:, :-1] |= a[:, 1:]
        self.pintar(viz & ~self.ocupado(), cor)

    def colar(self, outro: "Quadro") -> None:
        a = outro.px[..., 3:4]
        a0 = self.px[..., 3:4]
        af = a + a0 * (1 - a)
        self.px[..., :3] = np.where(af > 0, (outro.px[..., :3] * a + self.px[..., :3] * a0 * (1 - a)) / np.maximum(af, 1e-6), 0)
        self.px[..., 3] = af[..., 0]

    def imagem(self) -> Image.Image:
        arr = self.px.copy()
        arr[..., 3] *= 255
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def hash2(x: np.ndarray, y: np.ndarray, s: int) -> np.ndarray:
    v = np.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453
    return v - np.floor(v)


# ---------------------------------------------------------------- lenha e pedras

def tora(q: Quadro, x0: float, y0: float, x1: float, y1: float, cores: list[str]) -> np.ndarray:
    """Tora reta de 3 px de espessura, sombreada de cima (clara) para baixo (escura)."""
    dx, dy = x1 - x0, y1 - y0
    comp = math.hypot(dx, dy)
    ux, uy = dx / comp, dy / comp
    px, py = q.x + 0.5 - x0, q.y + 0.5 - y0
    t = px * ux + py * uy
    n = -px * uy + py * ux          # distância perpendicular (positiva para baixo)
    corpo = (t >= 0) & (t <= comp) & (np.abs(n) <= 1.6)
    q.pintar(corpo & (n < -0.5), cores[3])
    q.pintar(corpo & (n >= -0.5) & (n < 0.6), cores[2])
    q.pintar(corpo & (n >= 0.6), cores[1])
    veio = corpo & (np.abs(n) < 0.6) & (hash2(np.floor(t / 3), 0 * t, 3) > 0.7)
    q.pintar(veio, cores[1])
    return corpo


def lenha(q: Quadro, apagada: bool, ouro: bool) -> None:
    cores = CARVAO if apagada else MADEIRA
    pedras = PEDRA_OURO if ouro else PEDRA
    lado = Quadro(q.w, q.h)
    for (cx, w) in ((4, 5), (10, 5), (16, 5), (22, 5), (28, 4)):
        m = (np.abs(lado.x + 0.5 - cx) <= w / 2) & (lado.y >= 32) & (lado.y <= 34)
        lado.pintar(m & (lado.y == 32), pedras[3])
        lado.pintar(m & (lado.y > 32), pedras[2])
        lado.pintar(m & (lado.y > 32) & (lado.x + 0.5 > cx + w / 2 - 1.2), pedras[1])
    lado.contornar(pedras[0])
    q.colar(lado)
    toras = Quadro(q.w, q.h)
    tora(toras, 4, 31.5, 26, 25.5, cores)
    tora(toras, 6, 25.5, 28, 31.5, cores)
    # anéis das pontas cortadas
    for (x, y) in ((26, 25), (6, 25)):
        toras.p(x, y, cores[4]); toras.p(x, y + 1, cores[3])
    toras.contornar(cores[0])
    q.colar(toras)


def brasas(q: Quadro, paleta: list[str], quadro: int, quantas: int) -> None:
    pontos = [(13, 28), (16, 29), (19, 28), (15, 27), (18, 30), (12, 30), (20, 30), (14, 30)]
    for i, (x, y) in enumerate(pontos[:quantas]):
        forte = (i + quadro) % 3 != 0
        q.p(x, y, paleta[3] if forte else paleta[2])


# ---------------------------------------------------------------- chama

def chama(q: Quadro, altura: int, meia: float, paleta: list[str], quadro: int, base: float = 29.5, centro: float = 16.0,
          linguas: bool = True) -> None:
    if altura <= 0:
        return
    balanco = [0.0, 1.0, 0.25, -0.9][quadro]
    y = q.y + 0.5
    h = (base - y) / altura                       # 0 na base, 1 na ponta
    dentro = (h >= 0) & (h <= 1)
    hc = np.clip(h, 0, 1)
    largura = meia * np.clip(np.sin(np.pi * np.minimum(1.0, 0.22 + hc * 0.9)), 0, 1) ** 0.75 * (1 - hc) ** 0.5
    cx = centro + balanco * hc ** 1.8 * (1.2 + meia * 0.25) + np.sin(hc * 6.5 - quadro * np.pi / 2) * hc * (0.35 + meia * 0.12)
    d = np.abs(q.x + 0.5 - cx) / np.maximum(largura, 0.01)
    borda = hash2(q.x, q.y, quadro + 11) * 0.22
    corpo = dentro & (d <= 1.0 - (borda if meia > 3 else 0) * (hc > 0.3))
    forca = (1 - d) * (1 - 0.65 * hc) + (0.07 if meia > 6.5 else 0) * (1 - hc)
    nivel = np.select([forca > 0.64, forca > 0.44, forca > 0.26, forca > 0.1], [4, 3, 2, 1], 0)
    for k in range(5):
        q.pintar(corpo & (nivel == k), paleta[k])
    # línguas soltas acima da ponta, subindo de um quadro para o outro
    topo = base - altura
    for k in range((1 if altura < 10 else 2) if linguas else 0):
        sobe = ((quadro + k * 2) % 4)
        lx = int(round(centro + (k * 2 - 1) * meia * 0.35 + balanco))
        ly = int(round(topo + 2 - sobe * 1.5))
        q.p(lx, ly, paleta[1 if sobe < 2 else 0])
        if altura >= 13 and sobe < 2:
            q.p(lx, ly + 1, paleta[2])


def faiscas(q: Quadro, paleta: list[str], quadro: int, quantas: int, altura: int) -> None:
    for k in range(quantas):
        ciclo = (quadro + k * 3) % 8 if quantas > 2 else (quadro + k * 2) % 4
        x = int(16 + math.sin(k * 2.3 + 0.7) * (5 + k % 3 * 2) + math.sin(ciclo * 1.3 + k) * 1.2)
        y = int(29 - altura * 0.45 - ciclo * (2.2 if quantas > 2 else 2.6) - k % 2 * 2)
        if 0 <= y < QH:
            q.p(x, y, paleta[3] if ciclo < 4 else paleta[2])


def aura_lendaria(q: Quadro, quadro: int) -> None:
    """Halo dourado translúcido atrás da chama e quatro estrelinhas cintilando em volta."""
    d = np.hypot((q.x + 0.5 - 16) / 14.5, (q.y + 0.5 - 18) / 17.0)
    xadrez = ((q.x + q.y + quadro) % 2) == 0
    q.pintar(d < 1.0, "#ffd75a", 0.10)
    q.pintar((d < 0.92) & (d >= 0.7) & xadrez, "#ffd75a", 0.28)
    q.pintar((d < 0.7) & xadrez, "#fff1b0", 0.22)
    # raios girando: quatro feixes finos que trocam de diagonal a cada quadro
    ang = np.arctan2(q.y + 0.5 - 18, q.x + 0.5 - 16)
    feixe = (np.abs(np.sin(2 * (ang - quadro * np.pi / 8))) < 0.12) & (d > 0.5) & (d < 1.0)
    q.pintar(feixe, "#fff6c8", 0.45)
    estrelas = [(4, 9), (27, 6), (2, 22), (29, 19)]
    for i, (x, y) in enumerate(estrelas):
        fase = (quadro + i) % 4
        if fase == 0:
            continue
        q.p(x, y, "#ffffff")
        if fase == 2:
            for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q.p(x + dx, y + dy, "#ffd75a")


def runas(q: Quadro, quadro: int) -> None:
    """Três runas (losangos) violeta orbitando a chama arcana."""
    for i in range(3):
        ang = quadro * (math.pi / 2) / 3 + i * 2 * math.pi / 3
        x = int(round(16 + math.cos(ang) * 12))
        y = int(round(17 + math.sin(ang) * 6))
        frente = math.sin(ang) > 0
        c = "#f0d2ff" if frente else "#a85cff"
        q.p(x, y - 1, c); q.p(x - 1, y, c); q.p(x + 1, y, c); q.p(x, y + 1, c)
        q.p(x, y, "#ffffff" if frente else "#6a24c8")


def fumaca(q: Quadro, quadro: int) -> None:
    for k in range(3):
        fase = (quadro + k * 4 / 3) % 4
        y = 24 - fase * 4.5 - k * 0.0
        x = 15.5 + math.sin(fase * 1.4 + k) * 2.2
        r = 1.4 + fase * 0.55
        m = np.hypot(q.x + 0.5 - x, q.y + 0.5 - y) < r
        q.pintar(m, "#8a9296" if k % 2 else "#a7aeb2", max(0.15, 0.62 - fase * 0.13))


def fogueira(estagio: int, quadro: int) -> Image.Image:
    eid, _, _, altura, meia, paleta, nf = ESTAGIOS[estagio]
    q = Quadro(QW, QH)
    if eid == "lendaria":
        aura_lendaria(q, quadro)
    if eid == "arcana":
        # runas de trás primeiro
        atras = Quadro(QW, QH); runas(atras, quadro); q.colar(atras)
    lenha(q, apagada=eid == "cinzas", ouro=eid == "lendaria")
    if eid == "cinzas":
        cinza = (np.abs(q.x + 0.5 - 16) < 5 - (29 - q.y) * 1.6) & (q.y >= 27) & (q.y <= 29)
        q.pintar(cinza, "#6d6866"); q.pintar(cinza & (q.y == 27), "#8f8a87")
        if quadro in (0, 1):
            q.p(15 + quadro, 29, "#c0562a")
        fumaca(q, quadro)
        return q.imagem()
    brasas(q, paleta, quadro, 3 if eid == "faisca" else 8)
    fogo = Quadro(QW, QH)
    chama(fogo, altura, meia, paleta, quadro)
    q.colar(fogo)
    faiscas(q, paleta, quadro, nf, altura)
    if eid == "arcana":
        frente = Quadro(QW, QH)
        runas(frente, quadro)
        frente.px[..., 3] *= (frente.px[..., 0] > 200)   # só as runas da frente (claras)
        q.colar(frente)
    return q.imagem()


# ---------------------------------------------------------------- ícones dos dias

def icone_chama(paleta: list[str], brilho: bool) -> Image.Image:
    q = Quadro(IW, IW)
    chama(q, 11, 4.6, paleta, 0, base=12.0, centro=7.0, linguas=False)
    q.contornar(paleta[0])
    if brilho:
        for (x, y) in ((1, 3), (12, 1), (12, 8)):
            q.p(x, y, "#ffffff")
    return q.imagem()


def icone_brasa() -> Image.Image:
    q = Quadro(IW, IW)
    q.pintar((q.y == 11) & (q.x >= 3) & (q.x <= 10), MADEIRA[2])
    q.pintar((q.y == 12) & (q.x >= 2) & (q.x <= 11), MADEIRA[1])
    for (x, y, c) in ((5, 10, "#f07a24"), (6, 10, "#ffb43a"), (7, 9, "#ffe8a0"), (8, 10, "#f07a24"), (6, 9, "#c2401a"), (7, 8, "#ffb43a"), (9, 11, "#ffb43a"), (4, 11, "#f07a24")):
        q.p(x, y, c)
    q.contornar(MADEIRA[0])
    return q.imagem()


def icone_cinza() -> Image.Image:
    q = Quadro(IW, IW)
    monte = (np.abs(q.x + 0.5 - 7) < 5.5 - (12.5 - q.y) * 1.6) & (q.y >= 9) & (q.y <= 12)
    q.pintar(monte, "#7a7f82"); q.pintar(monte & (q.y <= 10), "#9aa1a4")
    q.contornar("#3a3f42")
    for (x, y, a) in ((7, 6, 0.6), (8, 4, 0.45), (7, 2, 0.3)):
        q.p(x, y, "#a7aeb2", a)
    return q.imagem()


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    folha = Image.new("RGBA", (QW * QUADROS, QH * len(ESTAGIOS)), (0, 0, 0, 0))
    for e in range(len(ESTAGIOS)):
        for k in range(QUADROS):
            folha.alpha_composite(fogueira(e, k), (QW * k, QH * e))
    folha.save(PASTA / "fogueira-estagios.png", optimize=True)

    dias = Image.new("RGBA", (IW * 4, IW * (len(ESTAGIOS) - 1)), (0, 0, 0, 0))
    brasa, cinza = icone_brasa(), icone_cinza()
    for linha, est in enumerate(ESTAGIOS[1:]):
        dias.alpha_composite(icone_chama(est[5], False), (0, IW * linha))
        dias.alpha_composite(icone_chama(est[5], True), (IW, IW * linha))
        dias.alpha_composite(brasa, (IW * 2, IW * linha))
        dias.alpha_composite(cinza, (IW * 3, IW * linha))
    dias.save(PASTA / "dias-estagios.png", optimize=True)

    for nome in ("fogueira-estagios.png", "dias-estagios.png"):
        p = PASTA / nome
        print(p.relative_to(PASTA.parents[2]), Image.open(p).size, f"{p.stat().st_size} bytes")

    if "--folha" in sys.argv:
        destino = Path(sys.argv[sys.argv.index("--folha") + 1])
        esc = 4
        cel_w, cel_h = QW * esc + 44, QH * esc + 40
        out = Image.new("RGB", (cel_w * len(ESTAGIOS), cel_h * QUADROS), "#0f1d1a")
        dr = ImageDraw.Draw(out)
        try:
            from PIL import ImageFont
            fonte = ImageFont.truetype("DejaVuSans.ttf", 13)
        except OSError:
            fonte = None
        for e, est in enumerate(ESTAGIOS):
            for k in range(QUADROS):
                im = fogueira(e, k).resize((QW * esc, QH * esc), Image.NEAREST)
                out.paste(im, (e * cel_w + 12, k * cel_h + 8), im)
            dr.text((e * cel_w + 12, cel_h * QUADROS - 18), f"{est[1]} ({est[2]}+)", fill="#ffe3a3", font=fonte)
        out.save(destino)
        print("folha:", destino)


if __name__ == "__main__":
    main()
