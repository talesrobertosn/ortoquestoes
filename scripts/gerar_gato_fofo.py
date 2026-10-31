"""O gato fofo do Orto Questões (31/10/2026): laranja tigrado chibi, feito do zero por este script.

Nada é baixado nem gerado por IA: cada pixel sai de formas geométricas simples (elipses, cápsulas, polígonos e
tubos), de uma luz de cima à esquerda quantizada em rampas de 4 a 7 tons, de um contorno marrom-escuro de 1 px e de
moldes de pixel desenhados à mão para o rosto (olhos, nariz, boca), que é o que precisa ler bem em tamanho 1x.

Personagem: cabeça grande e redonda (quase metade da altura sentado), bochechas fofas com tufos, olhos grandes
verdes com pupila escura e brilho branco, nariz rosa pequeno, boquinha em "w", orelhas com o miolo rosa, focinho,
peito, patas e ponta da cauda creme, três listras na testa e listras no dorso e na cauda. Olha para a DIREITA.

Gera:
- public/pixel/mascote/gato-fofo.png: quadros de 64 x 48, 6 por linha, 14 linhas (ordem em LINHAS);
  pés no chão na linha y = 45 (contorno de baixo), corpo centrado em x = 32;
- public/eventos/gato.png: retrato 128 x 128 (arte 32 x 32 ampliada 4x);
- public/flashcards/vfx/gato-dorme.png, gato-acorda.png, gato-feliz.png: 240 x 30 (6 quadros de 40 x 30).

Uso:  python3 scripts/gerar_gato_fofo.py [--previa PASTA] [--candidatos]

API para reaproveitar (cenas da tela de carregamento etc.), todas em coordenadas de pixel do quadro:
    t = Tela(64, 48)                          # quadro vazio
    Xf(x, y, s=1.0, ang=0.0, espelho=False)   # sistema local -> quadro (escala, giro em graus)
    cabeca(t, xf, olhos=..., olhar=(dx,dy), boca=..., orelhas=(e,d), vira=0.0)  # cabeça com expressão
    corpo_sentado(t, x_chao, Pose(...)), corpo_em_pe(t, x_chao, Pose(...)), corpo_deitado(...), corpo_enrolado(...)
    perna(t, quadril, pe, raio, ...), cauda(t, pontos, raio0, raio1, ...)     # membros
    bola_la(t, c, r, giro), livro_aberto(t, c, folha), zz(t, x, y, k), coracao(t, x, y), brilho(t, x, y)
    t.sombra(cx, larg), t.render() -> np.uint8 (h, w, 4)
Veja as funções gato_* (uma por linha da folha) como exemplos de uso de cada pose.
"""
from __future__ import annotations

import math
import os
import sys
from dataclasses import dataclass, field, replace
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]
QW, QH, NQ = 64, 48, 6        # quadro da folha principal e quadros por linha
CHAO = 45                     # linha (y) do contorno de baixo das patas em todas as linhas
CENTRO_X = 32                 # centro horizontal do corpo
TAU = math.tau


def hx(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float64)


# ═══════════════════════════════ paleta ═══════════════════════════════
# Cada material tem uma rampa (escuro -> claro) e a faixa usada pela luz (lo..hi). As listras do tigrado descem
# dois degraus na mesma rampa, por isso o pelo tem tons abaixo de `lo`.
@dataclass
class Mat:
    rampa: list
    lo: int
    hi: int


MATS: dict[str, Mat] = {
    "pelo": Mat(["#6c2a12", "#8e3b17", "#b5541d", "#da7128", "#ef9238", "#f9b158", "#ffd189"], 2, 6),
    "creme": Mat(["#a8755a", "#c99c7c", "#e6c6a4", "#f6e3c9", "#fff6e8"], 1, 4),
    "rosa": Mat(["#a24b55", "#d27c86", "#f0a2a8", "#ffc7c8"], 1, 3),
    "la": Mat(["#6e1f2c", "#a3303f", "#d24a55", "#ee7a7c", "#ffaaa4"], 1, 4),        # bolinha de lã
    "capa": Mat(["#1f3a52", "#2c5878", "#3d7aa0", "#5c9cc0", "#8cc2dc"], 1, 4),      # capa do livro
    "papel": Mat(["#a89a86", "#cfc2ac", "#e9dfcb", "#fbf6ea", "#ffffff"], 1, 4),
    "tala": Mat(["#8e9aa6", "#bcc6cf", "#e2e8ec", "#f7fafb", "#ffffff"], 1, 4),      # atadura
    "azul": Mat(["#2d5f8a", "#3f7fb3", "#5fa3d6", "#8cc6ee"], 0, 3),                 # tala de alumínio / fita
}
NOMES_MAT = list(MATS)
IDX_MAT = {n: i for i, n in enumerate(NOMES_MAT)}
_RAMPAS = [np.array([hx(c) for c in MATS[n].rampa]) for n in NOMES_MAT]

CONTORNO = hx("#3b1c10")      # marrom bem escuro e quente (não preto)
SOMBRA_COR = (40, 22, 14)
LUZ = np.array([-0.55, -0.70, 0.55])
LUZ /= np.linalg.norm(LUZ)

# cores dos moldes do rosto
COR = {
    "K": "#3b1c10",   # contorno/pálpebra
    "P": "#1e120c",   # pupila
    "W": "#ffffff",   # brilho
    "w": "#fff3d6",   # brilho menor (creme)
    "g": "#3c7a2a",   # íris escura
    "G": "#6cb337",   # íris
    "L": "#b8e468",   # íris clara (embaixo)
    "N": "#e98c95",   # nariz
    "n": "#c4606c",   # nariz sombra
    "M": "#6b2b1e",   # boca
    "R": "#c9505a",   # boca aberta (dentro)
    "T": "#f39aa2",   # língua
}
COR_RGB = {k: hx(v) for k, v in COR.items()}


# ═══════════════════════════════ formas ═══════════════════════════════
# Uma forma é uma função f(X, Y) -> (dentro, nx, ny, nz): máscara e normal (para a luz). Coordenadas em pixels,
# centro do pixel em +0.5.
class Forma:
    def __init__(self, f):
        self.f = f

    def __call__(self, X, Y):
        return self.f(X, Y)

    def __or__(self, o: "Forma") -> "Forma":
        def f(X, Y):
            d1, *n1 = self(X, Y)
            d2, *n2 = o(X, Y)
            n = [np.where(d2, b, a) for a, b in zip(n1, n2)]
            return (d1 | d2, *n)
        return Forma(f)

    def menos(self, o: "Forma") -> "Forma":
        def f(X, Y):
            d1, *n1 = self(X, Y)
            d2 = o(X, Y)[0]
            return (d1 & ~d2, *n1)
        return Forma(f)

    def e(self, o: "Forma") -> "Forma":
        def f(X, Y):
            d1, *n1 = self(X, Y)
            d2 = o(X, Y)[0]
            return (d1 & d2, *n1)
        return Forma(f)


def _nz(nx, ny, achata):
    q = np.clip(nx * nx + ny * ny, 0, 1)
    nx, ny = nx * achata, ny * achata
    nz = np.sqrt(np.clip(1 - q, 0, 1)) + 0.15
    m = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
    return nx / m, ny / m, nz / m


def elipse(c, rx, ry, ang=0.0, achata=1.0) -> Forma:
    """Elipse (normal de esfera achatada). ang em graus."""
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def f(X, Y):
        dx, dy = X - c[0], Y - c[1]
        u, v = dx * ca + dy * sa, -dx * sa + dy * ca
        a, b = u / rx, v / ry
        dentro = a * a + b * b <= 1.0
        nx, ny = a * ca - b * sa, a * sa + b * ca
        return (dentro, *_nz(nx, ny, achata))
    return Forma(f)


def circulo(c, r, achata=1.0) -> Forma:
    return elipse(c, r, r, 0.0, achata)


def tubo(pts, raios, achata=1.0) -> Forma:
    """Cadeia de cápsulas pelos pontos `pts`, raio interpolado (lista do mesmo tamanho ou par (r0, r1))."""
    pts = [np.array(p, float) for p in pts]
    if len(raios) != len(pts):
        r0, r1 = raios
        tot = [0.0]
        for a, b in zip(pts, pts[1:]):
            tot.append(tot[-1] + np.linalg.norm(b - a))
        raios = [r0 + (r1 - r0) * (s / max(tot[-1], 1e-6)) for s in tot]

    def f(X, Y):
        melhor = np.full(X.shape, 1e9)
        nx = np.zeros(X.shape)
        ny = np.zeros(X.shape)
        for (a, b), (ra, rb) in zip(zip(pts, pts[1:]), zip(raios, raios[1:])):
            ab = b - a
            L2 = max(float(ab @ ab), 1e-9)
            h = np.clip(((X - a[0]) * ab[0] + (Y - a[1]) * ab[1]) / L2, 0, 1)
            px, py = X - (a[0] + ab[0] * h), Y - (a[1] + ab[1] * h)
            r = ra + (rb - ra) * h
            dist = np.sqrt(px * px + py * py)
            d = dist / r
            m = d < melhor
            melhor = np.where(m, d, melhor)
            nx = np.where(m, px / r, nx)
            ny = np.where(m, py / r, ny)
        dentro = melhor <= 1.0
        return (dentro, *_nz(nx, ny, achata))
    return Forma(f)


def capsula(a, b, ra, rb=None, achata=1.0) -> Forma:
    return tubo([a, b], [ra, ra if rb is None else rb], achata)


def poligono(pts, espessura=2.5) -> Forma:
    """Polígono com normal de 'almofada' (borda inclinada até `espessura` px para dentro)."""
    P = [np.array(p, float) for p in pts]

    def f(X, Y):
        dentro = np.zeros(X.shape, bool)
        dmin = np.full(X.shape, 1e9)
        gx = np.zeros(X.shape)
        gy = np.zeros(X.shape)
        n = len(P)
        for i in range(n):
            a, b = P[i], P[(i + 1) % n]
            if (a[1] > Y).any() or True:
                cond = ((a[1] > Y) != (b[1] > Y)) & (X < (b[0] - a[0]) * (Y - a[1]) / (b[1] - a[1] + 1e-12) + a[0])
                dentro ^= cond
            ab = b - a
            h = np.clip(((X - a[0]) * ab[0] + (Y - a[1]) * ab[1]) / max(float(ab @ ab), 1e-9), 0, 1)
            px, py = X - (a[0] + ab[0] * h), Y - (a[1] + ab[1] * h)
            d = np.sqrt(px * px + py * py)
            m = d < dmin
            dmin = np.where(m, d, dmin)
            gx = np.where(m, -px / (d + 1e-9), gx)
            gy = np.where(m, -py / (d + 1e-9), gy)
        s = np.clip(1 - dmin / espessura, 0, 1)
        return (dentro, *_nz(gx * s, gy * s, 1.0))
    return Forma(f)


def tudo() -> Forma:
    return Forma(lambda X, Y: (np.ones(X.shape, bool), np.zeros(X.shape), np.zeros(X.shape), np.ones(X.shape)))


def semiplano(p, nrm) -> Forma:
    """Lado do plano para onde aponta `nrm` (para recortes)."""
    def f(X, Y):
        d = (X - p[0]) * nrm[0] + (Y - p[1]) * nrm[1]
        z = np.zeros(X.shape)
        return (d >= 0, z, z, z + 1)
    return Forma(f)


# ═══════════════════════════════ sistema local ═══════════════════════════════
@dataclass
class Xf:
    """Leva coordenadas locais (x para a frente do gato, y para baixo) ao quadro: escala `s`, giro `ang` (graus,
    horário), espelho horizontal opcional. Use xf(p) para pontos e xf.r(raio) para medidas."""
    x: float
    y: float
    s: float = 1.0
    ang: float = 0.0
    espelho: bool = False

    def __call__(self, p):
        px, py = p[0] * self.s, p[1] * self.s
        if self.ang:
            ca, sa = math.cos(math.radians(self.ang)), math.sin(math.radians(self.ang))
            px, py = px * ca - py * sa, px * sa + py * ca
        if self.espelho:
            px = -px
        return (self.x + px, self.y + py)

    def r(self, v):
        return v * self.s

    def a(self, ang):
        """Ângulo local -> ângulo no quadro."""
        g = ang + self.ang
        return -g if self.espelho else g

    def filho(self, p, ang=0.0, s=1.0) -> "Xf":
        """Sistema preso ao ponto local p (girado de `ang` a mais)."""
        x, y = self(p)
        return Xf(x, y, self.s * s, self.ang + ang, self.espelho)


# ═══════════════════════════════ tela ═══════════════════════════════
class Tela:
    """Quadro de pintura. Cada pinta() escreve material, tom (luz) e grupo; grupos com `linha=True` desenham uma
    linha interna (tom mais escuro) sobre o que ficou atrás deles. Depois vem o contorno externo de 1 px, a luz de
    borda opcional, os moldes do rosto e os enfeites (sobre)."""

    def __init__(self, w=QW, h=QH):
        self.w, self.h = w, h
        ys, xs = np.mgrid[0:h, 0:w]
        self.X, self.Y = xs + 0.5, ys + 0.5
        self.mat = np.full((h, w), -1, np.int16)
        self.tom = np.zeros((h, w))
        self.desl = np.zeros((h, w), np.int8)
        self.grp = np.full((h, w), -1, np.int32)
        self.linha = []              # por grupo: desenha linha interna sobre o que está atrás?
        self.cor_linha = []          # por grupo: cor da linha (None = tom mais escuro do material de trás)
        self.sobre = []              # (x, y, rgb, alfa) depois do contorno
        self.sombra_a = np.zeros((h, w))
        self.rim = None              # (dx, rgb, força) luz de borda vinda do lado dx
        self.atras = []              # (x, y, rgb, a) pixels pintados ANTES do gato (sem contorno)

    # ── grupos e pintura ──
    def grupo(self, linha=True, cor=None) -> int:
        self.linha.append(linha)
        self.cor_linha.append(cor)
        return len(self.linha) - 1

    def pinta(self, forma: Forma, mat: str, g: int, luz=0.0, desl=0):
        d, nx, ny, nz = forma(self.X, self.Y)
        sh = nx * LUZ[0] + ny * LUZ[1] + nz * LUZ[2]
        tom = np.clip(0.5 + 0.85 * (sh - 0.55) + luz, 0, 0.999)
        self.mat[d] = IDX_MAT[mat]
        self.tom[d] = tom[d]
        self.desl[d] = desl
        self.grp[d] = g

    def decal(self, forma: Forma, desl=-2, so=("pelo",), mat=None):
        """Listras e manchas: desce `desl` degraus (ou troca o material) só onde já há os materiais `so`."""
        d = forma(self.X, self.Y)[0]
        ok = np.isin(self.mat, [IDX_MAT[m] for m in so]) & d
        if mat is not None:
            self.mat[ok] = IDX_MAT[mat]
        self.desl[ok] = desl if mat is None else 0

    def px(self, x, y, cor, a=1.0, atras=False):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            rgb = COR_RGB[cor] if isinstance(cor, str) and cor in COR_RGB else (hx(cor) if isinstance(cor, str) else np.array(cor, float))
            (self.atras if atras else self.sobre).append((x, y, rgb, a))

    def molde(self, linhas, x, y, centro=True, cores=None):
        """Desenha um molde de pixel (lista de strings; '.' é vazio) com o centro (ou canto) em (x, y)."""
        h, w = len(linhas), len(linhas[0])
        x0 = int(math.floor(x - (w / 2 if centro else 0) + 0.5))
        y0 = int(math.floor(y - (h / 2 if centro else 0) + 0.5))
        for j, l in enumerate(linhas):
            for i, ch in enumerate(l):
                if ch == ".":
                    continue
                cor = (cores or {}).get(ch, ch)
                self.px(x0 + i, y0 + j, cor)

    def sombra(self, cx, larg, y=CHAO + 0.2, alt=1.7, forca=0.38):
        """Sombra de contato no chão (elipse suave), debaixo do gato."""
        d = ((self.X - cx) / larg) ** 2 + ((self.Y - y) / alt) ** 2
        a = np.where(d < 1, forca * np.where(d < 0.45, 1.0, 0.6), 0)
        self.sombra_a = np.maximum(self.sombra_a, a)

    # ── saída ──
    def render(self) -> np.ndarray:
        h, w = self.h, self.w
        op = self.mat >= 0
        out = np.zeros((h, w, 4), np.float64)
        # sombra e "atrás" (sem contorno)
        out[..., :3] = SOMBRA_COR
        out[..., 3] = self.sombra_a * 255
        for x, y, rgb, a in self.atras:
            out[y, x, :3] = rgb * a + out[y, x, :3] * (1 - a) if out[y, x, 3] > 0 else rgb
            out[y, x, 3] = max(out[y, x, 3], a * 255)
        # nível de cada pixel
        nivel = np.zeros((h, w), np.int32)
        cor = np.zeros((h, w, 3))
        for i, n in enumerate(NOMES_MAT):
            m = self.mat == i
            if not m.any():
                continue
            M = MATS[n]
            lv = M.lo + np.floor(self.tom * (M.hi - M.lo + 1)).astype(np.int32) + self.desl
            lv = np.clip(lv, 0, len(M.rampa) - 1)
            nivel[m] = lv[m]
        # luz de borda (rim) do lado indicado
        if self.rim is not None:
            dx, rgb_rim, forca = self.rim
            viz = np.zeros_like(op)
            if dx > 0:
                viz[:, :-1] = ~op[:, 1:]
                viz[:, -1] = True
            else:
                viz[:, 1:] = ~op[:, :-1]
                viz[:, 0] = True
            borda = op & viz
            nivel = np.where(borda, nivel + 2, nivel)
        for i, n in enumerate(NOMES_MAT):
            m = self.mat == i
            if m.any():
                R = _RAMPAS[i]
                cor[m] = R[np.clip(nivel[m], 0, len(R) - 1)]
        if self.rim is not None:
            cor = np.where(borda[..., None], cor * (1 - forca) + np.array(rgb_rim) * forca, cor)
        # linhas internas: pixel do grupo de trás vizinho (4) de um grupo da frente com linha
        linha = np.zeros((h, w), bool)
        cor_l = np.zeros((h, w, 3))
        G = self.grp
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            q = np.full((h, w), -1, np.int32)
            ys = slice(max(dy, 0), h + min(dy, 0))
            yd = slice(max(-dy, 0), h + min(-dy, 0))
            xs = slice(max(dx, 0), w + min(dx, 0))
            xd = slice(max(-dx, 0), w + min(-dx, 0))
            q[yd, xd] = G[ys, xs]
            frente = (q > G) & op & (q >= 0)
            if frente.any():
                tem = np.array(self.linha + [False])[np.where(q >= 0, q, len(self.linha))]
                novo = frente & tem & ~linha
                linha |= novo
                for yy, xx in zip(*np.nonzero(novo)):
                    cl = self.cor_linha[q[yy, xx]]
                    if cl is None:
                        mi = self.mat[yy, xx]
                        cl = _RAMPAS[mi][max(0, min(MATS[NOMES_MAT[mi]].lo - 1, nivel[yy, xx] - 2))]
                    cor_l[yy, xx] = cl
        cor = np.where(linha[..., None], cor_l, cor)
        # contorno externo 4-vizinho
        viz = np.zeros_like(op)
        viz[1:, :] |= op[:-1, :]
        viz[:-1, :] |= op[1:, :]
        viz[:, 1:] |= op[:, :-1]
        viz[:, :-1] |= op[:, 1:]
        cont = viz & ~op
        out[op, :3] = cor[op]
        out[op, 3] = 255
        out[cont, :3] = CONTORNO
        out[cont, 3] = 255
        for x, y, rgb, a in self.sobre:
            if a >= 1 or out[y, x, 3] == 0:
                out[y, x, :3] = rgb
                out[y, x, 3] = 255 * a if out[y, x, 3] == 0 else 255
            else:
                out[y, x, :3] = out[y, x, :3] * (1 - a) + rgb * a
        return np.clip(np.round(out), 0, 255).astype(np.uint8)


# ═══════════════════════════════ estilo (as medidas do personagem) ═══════════════════════════════
@dataclass
class Estilo:
    """Medidas do gato. ESTILO é o escolhido; os candidatos da prancha só variam estes números."""
    cab_rx: float = 10.2       # meia largura da cabeça
    cab_ry: float = 8.6        # meia altura da cabeça
    bochecha: float = 1.0      # tamanho das bochechas fofas
    tufo: float = 1.0          # tufos nas laterais das bochechas
    orelha: float = 1.0        # tamanho das orelhas
    olho: str = "A"            # molde dos olhos
    olho_dx: float = 4.6       # distância dos olhos ao centro do rosto
    olho_dy: float = 0.6       # altura dos olhos (relativa ao centro da cabeça)
    rosto_dx: float = 1.2      # rosto deslocado para a frente (3/4 para a direita)
    nariz_dy: float = 3.6
    corpo: float = 1.0         # escala do corpo em relação à cabeça


ESTILO = Estilo()

# moldes dos olhos: aberto, meio, fechado (dormindo, curva para baixo), feliz (curva para cima)
OLHOS = {
    "A": {  # grande e alto, pupila escura, íris verde embaixo
        "aberto": [".KK.", "KWPK", "KPPK", "KgGK", "KGLK", ".KK."],
        "meio": ["....", "KKKK", "KPPK", "KGLK", ".KK.", "...."],
        "baixo": [".KK.", "KgGK", "KWPK", "KPPK", "KPLK", ".KK."],    # olhando para baixo (pupila embaixo)
    },
    "B": {  # redondo 5x5, íris verde em volta da pupila
        "aberto": [".KKK.", "KWPgK", "KPPGK", "KgGLK", ".KKK."],
        "meio": [".....", "KKKKK", "KPPGK", ".KKK.", "....."],
        "baixo": [".KKK.", "KggGK", "KWPGK", "KPPLK", ".KKK."],
    },
    "D": {  # 5x6: pupila grande, brilho, íris verde embaixo e do lado
        "aberto": [".KKK.", "KWPPK", "KPPgK", "KPPGK", "KgGLK", ".KKK."],
        "meio": [".....", ".....", "KKKKK", "KPPGK", "KgGLK", ".KKK."],
        "baixo": [".KKK.", "KggGK", "KWPPK", "KPPGK", "KPPLK", ".KKK."],
    },
    "C": {  # menor, mais realista
        "aberto": [".KK.", "KWPK", "KGLK", ".KK."],
        "meio": ["....", "KKKK", "KGLK", ".KK."],
        "baixo": [".KK.", "KgGK", "KWPK", ".KK."],
    },
    "P": {  # pequeno, para os quadros de 40 x 30
        "aberto": [".K.", "KWK", "KPK", "KGK", ".K."],
        "meio": ["...", "KKK", "KPK", ".K.", "..."],
        "baixo": [".K.", "KGK", "KWK", "KPK", ".K."],
    },
}
OLHO_FECHADO = {"g": ["K...K", ".KKK."], "p": ["K.K", ".K."]}   # dormindo (arco para baixo)
OLHO_FELIZ = {"g": [".KKK.", "K...K"], "p": [".K.", "K.K"]}     # feliz (arco para cima)
BOCAS = {
    "w": ["M..M", ".MM."],            # boquinha (sob o nariz)
    "w_p": ["M.M"],
    "aberta": [".MMM.", "MRRRM", "MRTRM", ".MMM."],
    "aberta_p": [".M.", "MRM", ".M."],
    "bocejo": [".MMM.", "MRRRM", "MRRRM", "MRTRM", ".MMM."],
    "feliz": ["M...M", ".MMM.", ".MTM."],
    "nada": ["."],
}
NARIZ = {"g": ["NN", ".n"], "p": ["N"]}


def _molde_olho(est: Estilo, tipo: str, olhar=(0, 0), pequeno=False):
    """Escolhe o molde do olho e aplica o olhar (dx, dy em -1..1) movendo pupila e brilho dentro da íris."""
    if tipo in ("fechado", "feliz"):
        return (OLHO_FECHADO if tipo == "fechado" else OLHO_FELIZ)["p" if pequeno else "g"]
    base = OLHOS["P" if pequeno else est.olho]
    if tipo == "aberto" and olhar[1] > 0.5:
        tipo = "baixo"
    m = [list(l) for l in base.get(tipo, base["aberto"])]
    dx = int(round(olhar[0]))
    if dx and tipo in ("aberto", "baixo"):
        # desloca o miolo (sem as bordas K) uma coluna para o lado do olhar
        for row in m:
            mi = [i for i, c in enumerate(row) if c != "K" and c != "."]
            if len(mi) >= 2:
                vals = [row[i] for i in mi]
                vals = (vals[-1:] + vals[:-1]) if dx > 0 else (vals[1:] + vals[:1])
                for i, v in zip(mi, vals):
                    row[i] = v
    if olhar[1] < -0.5 and tipo == "aberto":
        # olhando para cima: pupila sobe (rola o miolo para cima)
        cols = range(len(m[0]))
        for i in cols:
            mi = [j for j in range(len(m)) if m[j][i] not in "K."]
            if len(mi) >= 2:
                vals = [m[j][i] for j in mi]
                vals = vals[1:] + vals[:1]
                for j, v in zip(mi, vals):
                    m[j][i] = v
    return ["".join(r) for r in m]


# ═══════════════════════════════ partes do corpo ═══════════════════════════════
def cabeca(t: Tela, xf: Xf, olhos="aberto", olhar=(0.0, 0.0), boca="w", orelhas=(0.0, 0.0), vira=0.0,
           est: Estilo | None = None, pequeno=None, luz=0.0, linha=True, piscar_um=None):
    """Cabeça com expressão. xf: sistema com origem no centro da cabeça (use xf.ang para inclinar).
    olhos: aberto | meio | fechado | feliz ; olhar: (dx, dy) de -1 a 1 ; boca: chave de BOCAS ;
    orelhas: giro extra (graus) de cada orelha (esquerda, direita da imagem; + para trás) ;
    vira: -1..1 move o rosto para a esquerda/direita (virar a cabeça). Devolve o grupo."""
    est = est or ESTILO
    pequeno = xf.s < 0.8 if pequeno is None else pequeno
    g = t.grupo(linha)
    rx, ry = est.cab_rx, est.cab_ry
    fx = est.rosto_dx + vira * 3.0
    sx = 1 if not xf.espelho else -1
    # orelhas (giradas em torno do meio da base)
    for lado, extra in ((-1, orelhas[0]), (1, orelhas[1])):
        o = est.orelha
        b0 = (fx * 0.5 + lado * 2.6, -ry * 0.88)
        b1 = (fx * 0.5 + lado * 9.4, -ry * 0.30)
        ap = (fx * 0.5 + lado * 8.2 * (0.9 + 0.1 * o), -ry - 5.6 * o)
        mid = ((b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2)
        ang = math.radians(extra * lado)

        def rot(p):
            dx_, dy_ = p[0] - mid[0], p[1] - mid[1]
            return (mid[0] + dx_ * math.cos(ang) - dy_ * math.sin(ang), mid[1] + dx_ * math.sin(ang) + dy_ * math.cos(ang))
        P = [xf(rot(p)) for p in (b0, ap, b1)]
        t.pinta(poligono(P, espessura=xf.r(2.2)), "pelo", g, luz=luz + 0.08)
        # miolo rosa
        ci = ((b0[0] + ap[0] + b1[0]) / 3, (b0[1] + ap[1] + b1[1]) / 3 + 0.6)
        enc = lambda p, k=0.5: (ci[0] + (p[0] - ci[0]) * k, ci[1] + (p[1] - ci[1]) * k)
        Pi = [xf(rot(enc(b0, 0.62))), xf(rot(enc(ap, 0.62))), xf(rot(enc(b1, 0.62)))]
        t.pinta(poligono(Pi, espessura=xf.r(1.0)), "rosa", g, luz=luz - 0.05)
    # crânio + bochechas fofas + tufos
    t.pinta(elipse(xf((0, 0)), xf.r(rx), xf.r(ry), xf.a(0)), "pelo", g, luz=luz)
    bo = est.bochecha
    for lado in (-1, 1):
        t.pinta(elipse(xf((lado * (rx - 3.0) + fx * 0.3, ry * 0.36)), xf.r(4.2 * bo), xf.r(3.6 * bo)), "pelo", g, luz=luz)
        if est.tufo > 0:
            tf = est.tufo
            P = [xf((lado * (rx - 1.2) + fx * 0.3, ry * 0.05)), xf((lado * (rx + 1.6 * tf) + fx * 0.3, ry * 0.42)),
                 xf((lado * (rx - 0.6) + fx * 0.3, ry * 0.62)), xf((lado * (rx + 0.9 * tf) + fx * 0.3, ry * 0.82)),
                 xf((lado * (rx - 3.0) + fx * 0.3, ry * 0.85))]
            t.pinta(poligono(P, espessura=xf.r(1.5)), "pelo", g, luz=luz - 0.05)
    # focinho e queixo creme
    t.pinta(elipse(xf((fx - 1.6, est.nariz_dy + 1.4)), xf.r(2.9), xf.r(2.4), achata=0.6), "creme", g, luz=luz + 0.05)
    t.pinta(elipse(xf((fx + 1.6, est.nariz_dy + 1.4)), xf.r(2.9), xf.r(2.4), achata=0.6), "creme", g, luz=luz + 0.05)
    t.pinta(elipse(xf((fx, est.nariz_dy + 2.8)), xf.r(2.2), xf.r(1.6), achata=0.5), "creme", g, luz=luz)
    # listras: três na testa (simétricas) e duas em cada bochecha
    for i, dx in enumerate((-2.7, 0.0, 2.7)):
        top = -ry * 0.95 + (0.3 if i != 1 else 0)
        comp = 3.1 if i == 1 else 2.4
        a, b = xf((fx * 0.6 + dx * 1.0, top)), xf((fx * 0.6 + dx * 0.8, top + comp))
        t.decal(capsula(a, b, xf.r(0.62), xf.r(0.45)))
    for lado in (-1, 1):
        for k, yy in enumerate((0.9, 2.6)):
            x0 = lado * (rx + 0.2) + fx * 0.3
            a, b = xf((x0, yy)), xf((x0 - lado * (2.2 - 0.5 * k), yy + 0.3))
            t.decal(capsula(a, b, xf.r(0.5), xf.r(0.35)))
    # rosto: moldes de pixel (não giram; só as posições acompanham a cabeça)
    for lado in (-1, 1):
        sep = est.olho_dx * (1.0 - 0.12 * lado * (vira + 0.35))   # 3/4: o olho de trás fica mais perto do centro
        c = xf((fx + lado * sep, est.olho_dy))
        tipo = olhos
        if piscar_um is not None and lado == piscar_um:
            tipo = "fechado"
        ol = (olhar[0] * sx, olhar[1])
        t.molde(_molde_olho(est, tipo, ol, pequeno), c[0], c[1])
    cn = xf((fx, est.nariz_dy))
    t.molde(NARIZ["p" if pequeno else "g"], cn[0], cn[1] - 0.5)
    if boca != "nada":
        chave = boca + ("_p" if pequeno and boca + "_p" in BOCAS else "")
        mb = BOCAS[chave]
        cb = xf((fx, est.nariz_dy + (1.2 if pequeno else 1.4)))
        t.molde(mb, cb[0], cb[1], centro=False) if False else t.molde(mb, cb[0], cb[1] + len(mb) / 2 - 0.5)
    return g


def cauda(t: Tela, pts, r0=2.5, r1=1.8, luz=0.0, listras=(0.3, 0.52, 0.72), ponta=True, linha=True, s=1.0):
    """Cauda grossa pelos pontos de controle (quadro): curva suave (Catmull-Rom), listras e ponta creme."""
    P = _suave(pts, 6)
    g = t.grupo(linha)
    t.pinta(tubo(P, (r0, r1)), "pelo", g, luz=luz)
    # comprimento acumulado para colocar listras e ponta
    seg = [0.0]
    for a, b in zip(P, P[1:]):
        seg.append(seg[-1] + math.dist(a, b))
    tot = seg[-1]

    def em(f):
        alvo = f * tot
        for i in range(1, len(seg)):
            if seg[i] >= alvo:
                u = (alvo - seg[i - 1]) / max(seg[i] - seg[i - 1], 1e-9)
                a, b = P[i - 1], P[i]
                p = (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)
                d = (b[0] - a[0], b[1] - a[1])
                n = math.hypot(*d) or 1
                return p, (d[0] / n, d[1] / n)
        return P[-1], (1, 0)
    for f in listras:
        p, d = em(f)
        r = r0 + (r1 - r0) * f + 0.8
        nrm = (-d[1], d[0])
        a = (p[0] + nrm[0] * r, p[1] + nrm[1] * r)
        b = (p[0] - nrm[0] * r, p[1] - nrm[1] * r)
        t.decal(capsula(a, b, 0.55 * s + 0.15))
    if ponta:
        # ponta creme: o último trecho
        p, d = em(0.86)
        t.decal(tubo([p] + [q for q, sg in zip(P, seg) if sg > 0.86 * tot] + [P[-1]], (r1 + 1, r1 + 1)), mat="creme")
    return g


def _suave(pts, n=6):
    """Catmull-Rom pelos pontos (passa por todos)."""
    pts = [tuple(map(float, p)) for p in pts]
    if len(pts) < 3:
        return pts
    P = [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            u = k / n
            u2, u3 = u * u, u * u * u
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3) for j in (0, 1)))
    out.append(pts[-1])
    return out


def perna(t: Tela, topo, pe, raio=2.3, luz=0.0, linha=True, pata=True, pata_rx=None, pata_ry=None, joelho=None, tala=False):
    """Perna do quadril/ombro (topo) até o pé; pata creme ovalada no fim (apoiada: achatada)."""
    g = t.grupo(linha)
    pts = [topo, joelho, pe] if joelho is not None else [topo, pe]
    t.pinta(tubo(pts, (raio * 1.15, raio * 0.95)), "pelo", g, luz=luz)
    if pata:
        prx = pata_rx or raio * 1.12
        pry = pata_ry or raio * 0.72
        ult = pts[-2]
        dx, dy = pe[0] - ult[0], pe[1] - ult[1]
        n = math.hypot(dx, dy) or 1
        c = (pe[0] + dx / n * 0.4, pe[1] + dy / n * 0.4)
        ang = math.degrees(math.atan2(dy, dx)) - 90
        t.pinta(elipse(c, prx, pry * 1.15, ang, achata=0.7), "creme", g, luz=luz + 0.05)
    if tala:
        # atadura branca enrolada no antebraço com a talinha azul
        a = (topo[0] + (pe[0] - topo[0]) * 0.45, topo[1] + (pe[1] - topo[1]) * 0.45)
        b = (topo[0] + (pe[0] - topo[0]) * 0.86, topo[1] + (pe[1] - topo[1]) * 0.86)
        g2 = t.grupo(True)
        t.pinta(capsula(a, b, raio * 1.25), "tala", g2, luz=luz + 0.1)
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        t.decal(capsula((m[0] - raio * 1.2, m[1]), (m[0] + raio * 1.2, m[1]), 0.5), so=("tala",), mat="azul")
    return g


# ═══════════════════════════════ poses do corpo ═══════════════════════════════
@dataclass
class Pose:
    """Parâmetros de uma pose (todos com padrão). Medidas locais em px; o gato olha para +x."""
    # cabeça
    cab: tuple = (2.6, -24.5)          # centro da cabeça (local, relativo ao chão sob o corpo)
    cab_ang: float = 0.0
    olhos: str = "aberto"
    olhar: tuple = (0.0, 0.0)
    boca: str = "w"
    orelhas: tuple = (0.0, 0.0)
    vira: float = 0.0
    piscar_um: int | None = None
    # corpo
    dy: float = 0.0                    # pulo / balanço vertical do corpo inteiro (sobe com negativo)
    respira: float = 0.0               # 0..1 peito enche
    inclina: float = 0.0               # corpo sentado inclinado (graus)
    cauda: tuple = ((-8.0, -2.0), (-15.0, -2.6), (-18.6, -8.0), (-16.6, -14.5))
    cauda_frente: bool = False         # cauda na frente das patas (enrolada)
    # patas dianteiras: deslocamento do pé (dx, dy) de cada uma (perto, longe)
    pata_perto: tuple = (0.0, 0.0)
    pata_longe: tuple = (0.0, 0.0)
    tala: bool = False
    # quadrúpede
    quadril: tuple = (-7.5, -12.5)
    ombro: tuple = (6.5, -12.5)
    pes: tuple = ((-6.0, 0.0), (-9.0, 0.0), (7.5, 0.0), (4.5, 0.0))   # trás-perto, trás-longe, frente-perto, frente-longe
    joelhos: tuple = (None, None, None, None)
    rim: bool = False
    luz: float = 0.0


def corpo_sentado(t: Tela, x0: float, p: Pose, s=1.0, sombra=True, est: Estilo | None = None):
    """Gato sentado de lado olhando para a direita (3/4): ancas, peito creme, patas da frente, cauda."""
    est = est or ESTILO
    xf = Xf(x0, CHAO - 0.5 + p.dy * s, s)  # y local 0 = parte de baixo das patas
    xc = xf.filho((0, 0), p.inclina)
    if sombra:
        t.sombra(x0 - 1.5 * s, 13.5 * s * (1 - min(abs(p.dy), 6) / 14), y=CHAO + 0.2)
    if not p.cauda_frente:
        cauda(t, [xf(q) for q in p.cauda], xf.r(2.5), xf.r(1.9), s=s)
    # pata da frente de trás (mais escura)
    perna(t, xc((5.6, -10.5)), xf((7.6 + p.pata_longe[0], -1.4 + p.pata_longe[1])), xf.r(2.15), luz=-0.22, linha=True,
          pata_rx=xf.r(2.4), pata_ry=xf.r(1.5))
    g = t.grupo(True)
    resp = p.respira * 0.6
    t.pinta(elipse(xc((-3.2, -6.6)), xf.r(9.2 + resp * 0.3), xf.r(6.6)), "pelo", g)                 # anca
    t.pinta(elipse(xc((0.2, -11.6)), xf.r(7.4 + resp), xf.r(8.4 + resp * 0.4), -8), "pelo", g)        # tronco
    t.pinta(elipse(xc((3.6, -11.0)), xf.r(3.9 + resp), xf.r(6.2), -10, achata=0.6), "creme", g, luz=0.05)  # peito
    # listras do dorso (curvas nas costas)
    for k, (yy, cc) in enumerate(((-15.0, 3.8), (-11.6, 4.4), (-8.0, 4.0))):
        a, b = xc((-5.8 - k * 0.8, yy)), xc((-5.8 - k * 0.8 + cc, yy - 1.4))
        t.decal(capsula(a, b, xf.r(0.62), xf.r(0.45)))
    # coxa (com linha) e pé de trás
    gc = t.grupo(True)
    t.pinta(elipse(xc((-4.6, -5.4)), xf.r(6.0), xf.r(5.2), 0), "pelo", gc, luz=0.02)
    t.decal(capsula(xc((-8.8, -6.0)), xc((-6.4, -3.8)), xf.r(0.6)))
    t.pinta(elipse(xf((-2.0, -1.3)), xf.r(3.5), xf.r(1.55), achata=0.7), "creme", gc, luz=0.05)
    if p.cauda_frente:
        cauda(t, [xf(q) for q in p.cauda], xf.r(2.3), xf.r(1.8), s=s)
    # pata da frente de perto
    perna(t, xc((2.4, -10.0)), xf((4.2 + p.pata_perto[0], -1.4 + p.pata_perto[1])), xf.r(2.25), luz=0.02, linha=True,
          pata_rx=xf.r(2.5), pata_ry=xf.r(1.5), tala=p.tala)
    # cabeça
    xh = xc.filho(p.cab, p.cab_ang)
    cabeca(t, xh, p.olhos, p.olhar, p.boca, p.orelhas, p.vira, est=est, piscar_um=p.piscar_um, luz=p.luz)
    if p.rim:
        t.rim = (1, hx("#ffcf7a"), 0.55)


def corpo_em_pe(t: Tela, x0: float, p: Pose, s=1.0, sombra=True, est: Estilo | None = None):
    """Gato de pé de lado (andar, espreguiçar, agachar). Quadril e ombro definem o tronco; pes = alvos das 4 patas."""
    est = est or ESTILO
    xf = Xf(x0, CHAO - 0.5 + p.dy * s, s)
    xa = Xf(x0, CHAO - 0.5, s)   # pés presos ao chão
    if sombra:
        t.sombra(x0, 15 * s)
    q, o = p.quadril, p.ombro
    cauda(t, [xf(c) for c in p.cauda], xf.r(2.4), xf.r(1.8), s=s)
    # patas de trás (longe) mais escuras
    perna(t, xf((q[0] - 1.0, q[1] + 2.0)), xa(p.pes[1]), xf.r(2.2), luz=-0.24, joelho=None if p.joelhos[1] is None else xa(p.joelhos[1]))
    perna(t, xf((o[0] - 0.4, o[1] + 2.5)), xa(p.pes[3]), xf.r(2.1), luz=-0.24, joelho=None if p.joelhos[3] is None else xa(p.joelhos[3]))
    g = t.grupo(True)
    t.pinta(tubo([xf(q), xf(o)], (xf.r(6.3), xf.r(5.9))), "pelo", g)
    # barriga creme
    t.decal(elipse(xf(((q[0] + o[0]) / 2 + 1.0, (q[1] + o[1]) / 2 + 5.8)), xf.r(8.0), xf.r(2.6)), mat="creme")
    t.decal(elipse(xf((o[0] + 3.4, o[1] + 1.5)), xf.r(2.8), xf.r(4.2)), mat="creme")   # peito
    # listras do dorso (verticais)
    vx, vy = o[0] - q[0], o[1] - q[1]
    L = math.hypot(vx, vy) or 1
    ux, uy = vx / L, vy / L
    nx_, ny_ = uy, -ux   # normal para cima
    for f in (0.12, 0.38, 0.62):
        c = (q[0] + vx * f, q[1] + vy * f)
        a = (c[0] + nx_ * 6.2, c[1] + ny_ * 6.2)
        b = (c[0] + nx_ * 2.2 - ux * 0.8, c[1] + ny_ * 2.2 - uy * 0.8)
        t.decal(capsula(xf(a), xf(b), xf.r(0.62), xf.r(0.45)))
    # patas de perto
    perna(t, xf((q[0] + 0.5, q[1] + 2.0)), xa(p.pes[0]), xf.r(2.4), luz=0.02, joelho=None if p.joelhos[0] is None else xa(p.joelhos[0]))
    perna(t, xf((o[0] + 0.6, o[1] + 2.5)), xa(p.pes[2]), xf.r(2.3), luz=0.02, joelho=None if p.joelhos[2] is None else xa(p.joelhos[2]))
    xh = xf.filho(p.cab, p.cab_ang)
    cabeca(t, xh, p.olhos, p.olhar, p.boca, p.orelhas, p.vira, est=est, piscar_um=p.piscar_um)


def corpo_deitado(t: Tela, x0: float, p: Pose, s=1.0, sombra=True, est: Estilo | None = None):
    """Deitado em 'pão' (loaf): corpo baixo e comprido, patinhas creme na frente, cabeça erguida à direita."""
    est = est or ESTILO
    xf = Xf(x0, CHAO - 0.5 + p.dy * s, s)
    if sombra:
        t.sombra(x0, 17 * s)
    cauda(t, [xf(c) for c in p.cauda], xf.r(2.4), xf.r(1.8), s=s)
    g = t.grupo(True)
    r = p.respira * 0.5
    t.pinta(elipse(xf((-2.0, -6.4 - r * 0.5)), xf.r(13.0 + r * 0.3), xf.r(6.6 + r)), "pelo", g)
    t.pinta(elipse(xf((6.0, -5.8)), xf.r(5.4), xf.r(5.0), achata=0.6), "creme", g, luz=0.04)
    t.decal(elipse(xf((-2.0, -0.4)), xf.r(11.0), xf.r(1.4)), mat="creme")
    for k in range(4):
        a, b = xf((-11.0 + k * 3.6, -12.4 - r)), xf((-12.0 + k * 3.6, -8.8))
        t.decal(capsula(a, b, xf.r(0.62), xf.r(0.42)))
    # coxa
    gc = t.grupo(True)
    t.pinta(elipse(xf((-8.0, -4.4)), xf.r(5.6), xf.r(4.0)), "pelo", gc, luz=0.02)
    t.decal(capsula(xf((-11.5, -5.0)), xf((-9.2, -2.6)), xf.r(0.6)))
    # patinhas da frente (dobradas, creme)
    gp = t.grupo(True)
    t.pinta(elipse(xf((8.2, -1.3)), xf.r(3.0), xf.r(1.6), achata=0.7), "creme", gp, luz=-0.1)
    gp2 = t.grupo(True)
    t.pinta(elipse(xf((4.6, -1.3)), xf.r(3.0), xf.r(1.6), achata=0.7), "creme", gp2, luz=0.04)
    xh = xf.filho(p.cab, p.cab_ang)
    cabeca(t, xh, p.olhos, p.olhar, p.boca, p.orelhas, p.vira, est=est, piscar_um=p.piscar_um, luz=p.luz)
    if p.rim:
        t.rim = (1, hx("#ffd27e"), 0.6)


def corpo_enrolado(t: Tela, x0: float, p: Pose, s=1.0, sombra=True, est: Estilo | None = None, cab_fora=False):
    """Dormindo enroladinho: bolo redondo, cabeça apoiada na frente, cauda dando a volta por baixo do queixo."""
    est = est or ESTILO
    xf = Xf(x0, CHAO - 0.5 + p.dy * s, s)
    if sombra:
        t.sombra(x0, 16 * s)
    g = t.grupo(True)
    r = p.respira * 0.7
    t.pinta(elipse(xf((-2.0, -7.8 - r * 0.5)), xf.r(13.6 + r * 0.2), xf.r(7.8 + r)), "pelo", g)
    t.decal(elipse(xf((-2.0, -0.6)), xf.r(11.0), xf.r(1.2)), mat="creme")
    for k in range(4):
        a, b = xf((-12.6 + k * 3.8, -14.4 - r)), xf((-13.2 + k * 3.8, -10.0))
        t.decal(capsula(a, b, xf.r(0.65), xf.r(0.42)))
    gc = t.grupo(True)
    t.pinta(elipse(xf((-8.6, -5.6)), xf.r(5.8), xf.r(4.8)), "pelo", gc, luz=0.02)
    t.decal(capsula(xf((-12.0, -6.4)), xf((-9.8, -3.6)), xf.r(0.6)))
    # cabeça apoiada (baixa, um pouco inclinada) e patinha sob o queixo
    xh = xf.filho(p.cab, p.cab_ang)
    gp = t.grupo(True)
    t.pinta(elipse(xf((p.cab[0] - 1.0, -1.4)), xf.r(3.0), xf.r(1.6), achata=0.7), "creme", gp, luz=0.04)
    cabeca(t, xh, p.olhos, p.olhar, p.boca, p.orelhas, p.vira, est=est, piscar_um=p.piscar_um)
    # cauda enrolada na frente, por baixo do queixo
    cauda(t, [xf(c) for c in p.cauda], xf.r(2.3), xf.r(1.9), s=s)


# ═══════════════════════════════ objetos ═══════════════════════════════
def bola_la(t: Tela, c, r=3.6, giro=0.0, fio=True):
    """Bolinha de lã vermelha com fios em arco e um fio solto no chão."""
    g = t.grupo(True)
    t.pinta(circulo(c, r), "la", g)
    for k in range(3):
        a = giro + k * 1.05
        dx, dy = math.cos(a), math.sin(a)
        p0 = (c[0] - dy * r * 0.9 + dx * r * 0.2, c[1] + dx * r * 0.9 + dy * r * 0.2)
        p1 = (c[0] + dy * r * 0.9 + dx * r * 0.2, c[1] - dx * r * 0.9 + dy * r * 0.2)
        t.decal(capsula(p0, p1, 0.45), desl=-1, so=("la",))
    if fio:
        x, y = c[0] + r * 0.6, c[1] + r - 0.2
        for i in range(5):
            t.px(x + i, CHAO - 0.0 + (1 if i in (1, 2) else 0) - 1, "#a3303f")


def livro_aberto(t: Tela, c, folha=0.0):
    """Livrinho aberto no chão visto de lado/cima; folha 0..1 vira uma página (da direita para a esquerda)."""
    x, y = c
    g = t.grupo(True)
    t.pinta(poligono([(x - 7.5, y - 1.5), (x + 7.5, y - 1.5), (x + 8.0, y + 1.0), (x - 8.0, y + 1.0)], 1.0), "capa", g)
    gp = t.grupo(True)
    t.pinta(poligono([(x - 7.0, y - 3.5), (x - 0.4, y - 2.4), (x - 0.4, y - 0.4), (x - 7.0, y - 1.2)], 1.6), "papel", gp, luz=0.1)
    gq = t.grupo(True)
    t.pinta(poligono([(x + 0.4, y - 2.4), (x + 7.0, y - 3.5), (x + 7.0, y - 1.2), (x + 0.4, y - 0.4)], 1.6), "papel", gq, luz=-0.05)
    # linhas de texto
    for k in range(2):
        for lado in (-1, 1):
            for i in range(4):
                xx = x + lado * (2.0 + i * 1.2)
                if (i + k) % 4 != 3:
                    t.px(xx, y - 2.6 + k * 1.0 + (0.1 * i if lado < 0 else -0.1 * i), "#b6a88f")
    if 0 < folha < 1:
        # página no ar: um triângulo que sobe da direita, passa pelo meio e cai na esquerda
        a = math.pi * folha
        tip = (x + math.cos(a) * 6.5, y - 1.4 - math.sin(a) * 5.0)
        gf = t.grupo(True)
        t.pinta(poligono([(x - 0.2, y - 2.4), tip, (tip[0], tip[1] + 1.6), (x + 0.2, y - 0.6)], 1.0), "papel", gf, luz=0.2)


def zz(t: Tela, x, y, k=0, tam=1):
    """Um 'z' de sono (3x3 ou 4x4) claro com contorno."""
    m = ["zzz", "..z.", ".z..", "zzzz"] if tam > 1 else ["zzz", ".z.", "zzz"]
    m = ["zzzz", "..z.", ".z..", "zzzz"] if tam > 1 else ["zzz", ".z.", "zzz"]
    t.molde(m, x, y, cores={"z": "#e8f2ff"})


def coracao(t: Tela, x, y, cor="#ff7d8c"):
    t.molde([".r.r.", "rrrrr", "rrrrr", ".rrr.", "..r.."], x, y, cores={"r": cor})


def brilho(t: Tela, x, y, cor="#fff3b0"):
    t.molde([".c.", "ccc", ".c."], x, y, cores={"c": cor})


def nota(t: Tela, x, y, cor="#ffe9a8"):
    t.molde(["..cc", "..c.", "..c.", "ccc.", "cc.."], x, y, cores={"c": cor})


# ═══════════════════════════════ linhas da folha ═══════════════════════════════
X0 = 34.0    # posição do corpo sentado no quadro (o conjunto fica centrado em x = 32)


def _sn(k, n=NQ, d=0.0):
    return math.sin((k / n + d) * TAU)


def _cs(k, n=NQ, d=0.0):
    return math.cos((k / n + d) * TAU)


def cauda_sentado(k, amp=1.0, fase=0.0):
    """Cauda atrás do gato sentado balançando (pontos locais)."""
    w = _sn(k, d=fase) * amp
    return ((-8.0, -2.0), (-14.6, -2.8 + 0.2 * w), (-18.4 + 0.6 * w, -8.0), (-17.0 + 2.6 * w, -14.6 + 0.6 * abs(w)))


def cauda_enrolada_frente(k=0, amp=0.0):
    """Cauda dando a volta pela frente das patas (gato sentado elegante)."""
    w = _sn(k) * amp
    return ((-8.4, -2.4), (-6.0, -0.9), (0.0, -0.7), (6.5, -0.9), (10.0 + w, -2.0 - abs(w) * 0.6))


def gato_dormindo(t, k):
    resp = 0.5 + 0.5 * _sn(k)
    p = Pose(cab=(9.0, -8.2), cab_ang=12, olhos="fechado", boca="nada", respira=resp,
             orelhas=(0.0, -14.0 if k == 3 else 0.0),
             cauda=((-14.0, -3.6), (-9.0, -0.6), (0.0, -0.2), (6.0, -0.4), (10.0, -1.2)))
    corpo_enrolado(t, X0 - 1.5, p)
    zz(t, 52 + (k % 3), 18 - (k % 3) * 2) if k % 3 != 2 else None


def gato_acordado(t, k):
    p = Pose(cauda=cauda_sentado(k, 1.0), olhos="fechado" if k == 4 else "aberto", cab_ang=1.2 * _sn(k))
    corpo_sentado(t, X0, p)


def gato_tala(t, k):
    w = _sn(k)
    p = Pose(cauda=cauda_sentado(k, 0.6), tala=True, inclina=1.0 * w, cab_ang=-3 + 1.5 * w, olhar=(0, 0.6) if k in (2, 3) else (0, 0),
             pata_perto=(0.3, -0.6 if k in (2, 3) else 0.0), olhos="fechado" if k == 5 else "aberto")
    corpo_sentado(t, X0, p)


def gato_sentado(t, k):
    p = Pose(cauda=cauda_enrolada_frente(k, 0.8), cauda_frente=True, orelhas=(0.0, 18.0) if k in (2, 3) else (0.0, 0.0),
             olhos="fechado" if k == 5 else "aberto")
    corpo_sentado(t, X0, p)


def gato_andando(t, k):
    """Ciclo de 6 quadros (passo diagonal: frente-perto com trás-longe)."""
    f = k / NQ
    bob = -0.6 * abs(math.cos(f * TAU))  # sobe no meio do passo
    dy = round(-0.8 + 0.8 * abs(math.cos(f * TAU)) * 1.0)

    def pe(base_x, fase):
        a = (f + fase) * TAU
        x = base_x + 3.2 * math.cos(a)
        y = -max(0.0, math.sin(a)) * 2.2   # levanta na volta (frente)
        return (x, y)
    pes = (pe(-6.5, 0.0), pe(-8.5, 0.5), pe(7.0, 0.5), pe(5.0, 0.0))
    p = Pose(dy=dy, pes=pes, cab=(10.5, -22.5 - 0.0), cab_ang=0.8 * _sn(k, d=0.25),
             cauda=((-12.0, -14.0), (-17.0, -17.0 + 0.6 * _sn(k)), (-18.5 + 1.0 * _sn(k, d=0.2), -24.0), (-15.5 + 1.6 * _sn(k, d=0.35), -28.0)))
    corpo_em_pe(t, X0 - 1.0, p)


def gato_espreguicando(t, k):
    """0 de pé -> 1 patas à frente -> 2-3 alongado com bocejo -> 4 voltando -> 5 de pé."""
    seq = [0.0, 0.55, 1.0, 1.0, 0.5, 0.0][k]
    u = seq
    q = (-7.5, -12.5 - 1.0 * u)
    o = (6.5 + 1.0 * u, -12.5 + 6.5 * u)
    pes = ((-6.0, 0.0), (-8.6, 0.0), (7.5 + 6.0 * u, 0.0), (5.0 + 5.5 * u, 0.0))
    p = Pose(quadril=q, ombro=o, pes=pes,
             cab=(10.5 + 3.0 * u, -22.5 + 10.5 * u), cab_ang=-6 * u,
             olhos="fechado" if k in (2, 3) else ("meio" if k in (1, 4) else "aberto"),
             boca="bocejo" if k == 3 else ("aberta" if k == 2 else "w"),
             orelhas=(14 * u, 14 * u),
             cauda=((-12.0, -14.0 - u), (-17.0, -18.0 - 2 * u), (-17.0 + 2 * u, -25.0 - 2 * u), (-13.0 + 3 * u, -28.5 - 2 * u)))
    corpo_em_pe(t, X0 - 2.0, p)


def gato_brincando(t, k):
    seq = [0.0, 0.5, 1.0, 0.6, 0.2, 0.0][k]
    bx = 52.0 + [0, 0, 0.6, 1.4, 1.8, 0.8][k]
    p = Pose(cauda=cauda_sentado(k, 1.2, 0.2), cab_ang=-4.0 - 2 * seq, olhar=(1, 0.6),
             pata_perto=(4.0 + 4.0 * seq, -5.0 * seq - 0.5 * (seq > 0)), boca="aberta" if k == 2 else "w",
             orelhas=(-6, -6), inclina=3 * seq)
    corpo_sentado(t, X0 - 3.0, p)
    bola_la(t, (bx, CHAO - 3.7 - [0, 0, 0.8, 1.6, 0.6, 0][k]), 3.6, giro=k * 0.9)


def gato_lendo(t, k):
    fol = [0, 0, 0, 0.3, 0.7, 0][k]
    p = Pose(cauda=cauda_sentado(k, 0.5), cab_ang=-10.0, cab=(3.4, -24.0), olhar=(0.6 if k < 3 else -0.6, 1.0),
             olhos="meio" if k == 0 else "aberto", pata_perto=(0.0, 0.0))
    corpo_sentado(t, X0 - 4.0, p)
    livro_aberto(t, (48.0, CHAO - 0.7), fol)


def gato_comemorando(t, k):
    alt = [0, 2.0, 4.6, 5.4, 3.0, 0.4][k]
    p = Pose(dy=-alt, cauda=((-8.0, -2.6), (-12.0, -6.0), (-13.4, -14.0 - alt * 0.3), (-11.0 + _sn(k) * 1.5, -20.0 - alt * 0.3)),
             olhos="feliz", boca="aberta", pata_perto=(3.0, -7.0 if k in (1, 2, 3, 4) else -1.0),
             pata_longe=(3.5, -8.0 if k in (2, 3) else -1.0), cab_ang=3 * _sn(k), orelhas=(-4, -4))
    corpo_sentado(t, X0, p)
    if k in (2, 3, 4):
        brilho(t, 19 - (k - 2), 12 + (k % 2))
        brilho(t, 51 + (k - 2), 9 + (k % 2) * 2)


def gato_observando(t, k):
    olhares = [(-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (0, 0)]
    viras = [-0.5, -0.4, 0.0, 0.4, 0.5, 0.0]
    angs = [-3, -6, -5, -2, 2, 0]
    p = Pose(cauda=cauda_sentado(k, 0.5), olhar=olhares[k], vira=viras[k], cab_ang=angs[k],
             orelhas=(6, -6) if k < 2 else ((-6, 6) if k in (3, 4) else (0, 0)))
    corpo_sentado(t, X0, p)


def gato_fogueira(t, k):
    resp = 0.5 + 0.5 * _sn(k)
    p = Pose(cab=(10.4, -16.6), cab_ang=-2, olhos="meio" if k != 3 else "fechado", respira=resp, rim=True,
             cauda=((-14.0, -3.2), (-18.0, -1.8), (-21.5 + 0.6 * _sn(k), -2.0), (-23.4 + _sn(k), -3.6)))
    corpo_deitado(t, X0 - 2.0, p)


def gato_ronronando(t, k):
    v = [0, 1, 0, -1, 0, 1][k] * 0.5
    p = Pose(cauda=cauda_enrolada_frente(k, 0.5), cauda_frente=True, olhos="feliz", boca="w", cab_ang=2.5 + v * 2,
             cab=(2.6 + v, -24.5), orelhas=(-3, -3))
    corpo_sentado(t, X0, p)
    if k % 2 == 1:
        # tremidinha do ronrono: dois risquinhos de cada lado
        for lado in (-1, 1):
            t.molde(["c.", ".c"] if lado < 0 else [".c", "c."], 34 + lado * 15 + (1 if lado > 0 else 0), 21, cores={"c": "#ffe0a0"})


def gato_acordando(t, k):
    if k <= 1:
        p = Pose(cab=(9.0, -8.2 - 2.0 * k), cab_ang=12 - 8 * k, olhos="fechado" if k == 0 else "meio", boca="nada",
                 respira=0.5, cauda=((-14.0, -3.6), (-9.0, -0.6), (0.0, -0.2), (6.0, -0.4), (10.0, -1.2)))
        corpo_enrolado(t, X0 - 1.5, p)
    elif k == 2:
        p = Pose(cab=(10.4, -16.6), olhos="fechado", boca="bocejo", orelhas=(12, 12),
                 cauda=((-14.0, -3.2), (-18.0, -1.8), (-21.0, -2.0), (-23.0, -3.6)))
        corpo_deitado(t, X0 - 2.0, p)
    elif k == 3:
        p = Pose(cab=(10.4, -17.4), olhos="meio",
                 cauda=((-14.0, -3.2), (-18.0, -1.8), (-21.0, -2.6), (-22.0, -5.0)))
        corpo_deitado(t, X0 - 2.0, p)
    else:
        p = Pose(cauda=cauda_sentado(0, 0.3), olhos="aberto" if k == 5 else "meio", orelhas=(0, 0))
        corpo_sentado(t, X0, p)


def gato_olhando_cima(t, k):
    w = _sn(k)
    p = Pose(cauda=cauda_sentado(k, 0.7), cab_ang=-12 + 1.0 * w, olhar=(1, -1), orelhas=(-10, -10), cab=(3.0, -24.6),
             olhos="fechado" if k == 4 else "aberto")
    corpo_sentado(t, X0, p)


LINHAS = [
    ("dormindo", gato_dormindo), ("acordado", gato_acordado), ("tala", gato_tala), ("sentado", gato_sentado),
    ("andando", gato_andando), ("espreguicando", gato_espreguicando), ("brincando", gato_brincando),
    ("lendo", gato_lendo), ("comemorando", gato_comemorando), ("observando", gato_observando),
    ("fogueira", gato_fogueira), ("ronronando", gato_ronronando), ("acordando", gato_acordando),
    ("olhando_cima", gato_olhando_cima),
]


def quadro(fn, k, w=QW, h=QH) -> np.ndarray:
    t = Tela(w, h)
    fn(t, k)
    return t.render()


def folha() -> Image.Image:
    img = Image.new("RGBA", (QW * NQ, QH * len(LINHAS)), (0, 0, 0, 0))
    for li, (_, fn) in enumerate(LINHAS):
        for k in range(NQ):
            img.paste(Image.fromarray(quadro(fn, k), "RGBA"), (k * QW, li * QH))
    return img


# ═══════════════════════════════ retrato (eventos) e quadros pequenos (flashcards) ═══════════════════════════════
def retrato() -> Image.Image:
    """Busto 32 x 32: cabeça grande e o peitinho creme, olhando para a frente (3/4)."""
    t = Tela(32, 32)
    g = t.grupo(True)
    t.pinta(elipse((15.5, 31.5), 10.5, 8.0), "pelo", g)
    t.decal(elipse((18.0, 30.5), 5.0, 6.0), mat="creme")
    t.decal(capsula((7.0, 28.0), (9.0, 26.5), 0.6))
    t.decal(capsula((6.5, 31.0), (9.0, 30.0), 0.6))
    cabeca(t, Xf(15.6, 16.6, 1.0), "aberto", (0, 0), "w")
    return Image.fromarray(t.render(), "RGBA")


VW, VH = 40, 30
VS = 0.7          # escala do gato nos quadros 40 x 30
VCHAO = 27        # linha do contorno das patas nos quadros pequenos


def _vfx(fn) -> Image.Image:
    img = Image.new("RGBA", (VW * 6, VH), (0, 0, 0, 0))
    for k in range(6):
        t = Tela(VW, VH)
        fn(t, k)
        img.paste(Image.fromarray(t.render(), "RGBA"), (k * VW, 0))
    return img


def _xp(x):
    """Posição horizontal nos quadros pequenos."""
    return x


def _pequeno(t, corpo, x, p, s=VS):
    # desloca o chão: os corpos usam CHAO; nos quadros pequenos o chão fica em VCHAO
    global CHAO
    antigo = CHAO
    CHAO = VCHAO
    try:
        corpo(t, x, p, s=s)
    finally:
        CHAO = antigo


def vfx_dorme(t, k):
    resp = 0.5 + 0.5 * _sn(k)
    p = Pose(cab=(9.0, -8.2), cab_ang=12, olhos="fechado", boca="nada", respira=resp,
             cauda=((-14.0, -3.6), (-9.0, -0.6), (0.0, -0.2), (6.0, -0.4), (10.0, -1.2)))
    _pequeno(t, corpo_enrolado, 20.0, p)
    if k % 3 != 2:
        zz(t, 33 + (k % 3), 7 - (k % 3) * 2)


def vfx_acorda(t, k):
    olhos = ["fechado", "fechado", "meio", "aberto", "aberto", "aberto"][k]
    p = Pose(cauda=cauda_sentado(k, 0.4), olhos=olhos, boca="aberta" if k == 1 else "w",
             orelhas=(10, 10) if k < 2 else (0, 0), cab_ang=[4, 2, 0, 0, -1, 0][k])
    _pequeno(t, corpo_sentado, 21.0, p)


def vfx_feliz(t, k):
    p = Pose(cauda=((-8.0, -2.6), (-12.0, -6.0), (-13.4, -14.0), (-11.0 + _sn(k) * 2.0, -19.5)), olhos="feliz", boca="w",
             cab_ang=3 * _sn(k), orelhas=(-3, -3), dy=-[0, 1, 1.6, 1, 0, 0][k])
    _pequeno(t, corpo_sentado, 21.0, p)
    if k in (0, 1, 3, 4):
        coracao(t, 33, 6 - (k % 3))


# ═══════════════════════════════ candidatos (prancha de design) ═══════════════════════════════
CANDIDATOS = {
    "A": Estilo(olho="A", cab_rx=11.0, cab_ry=9.4, orelha=0.8, tufo=0.6, olho_dx=4.8),       # olhos altos escuros
    "B": Estilo(olho="B", cab_rx=11.0, cab_ry=9.4, orelha=0.8, tufo=0.6, olho_dx=5.0),       # redondos, íris verde
    "D": Estilo(olho="D", cab_rx=11.0, cab_ry=9.4, orelha=0.8, tufo=0.6, olho_dx=5.0),       # grandes 5x6
}


# ═══════════════════════════════ saída ═══════════════════════════════
def salvar(img: Image.Image, caminho: Path) -> None:
    """PNG; usa a paleta de 256 cores (sem perder pixels) quando o arquivo fica menor."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    img.save(caminho, optimize=True)
    tam = caminho.stat().st_size
    cores = img.getcolors(256)
    if cores is not None:
        arr = np.asarray(img.convert("RGBA"))
        pal = np.array([c for _, c in cores], np.uint8)
        chave = lambda a: (a[..., 0].astype(np.uint32) << 24) | (a[..., 1].astype(np.uint32) << 16) | (a[..., 2].astype(np.uint32) << 8) | a[..., 3]
        ordem = np.argsort(chave(pal))
        idx = ordem[np.searchsorted(chave(pal)[ordem], chave(arr))].astype(np.uint8)
        p = Image.fromarray(idx, "P")
        p.putpalette(pal.tobytes(), rawmode="RGBA")
        tmp = caminho.with_suffix(".tmp.png")
        p.save(tmp, optimize=True)
        if tmp.stat().st_size < tam:
            tmp.replace(caminho)
        else:
            tmp.unlink()
    print(caminho.relative_to(RAIZ), img.size, caminho.stat().st_size, "bytes")


def main() -> None:
    sheet = folha()
    salvar(sheet, RAIZ / "public/pixel/mascote/gato-fofo.png")
    salvar(retrato().resize((128, 128), Image.NEAREST), RAIZ / "public/eventos/gato.png")
    salvar(_vfx(vfx_dorme), RAIZ / "public/flashcards/vfx/gato-dorme.png")
    salvar(_vfx(vfx_acorda), RAIZ / "public/flashcards/vfx/gato-acorda.png")
    salvar(_vfx(vfx_feliz), RAIZ / "public/flashcards/vfx/gato-feliz.png")
    if "--previa" in sys.argv:
        import previa_gato  # noqa  (ferramenta local de prévia, fora do repositório)


if __name__ == "__main__":
    main()
