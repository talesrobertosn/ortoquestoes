"""Cenários "HD-2D" das seções da página inicial: a torre do relógio, o baú do tesouro e o correio da vila
(30/10/2026, mesma técnica do acampamento em scripts/gerar_cena_inicio.py).

Arte original feita por código: nada baixado, nada gerado por IA, nenhum personagem de terceiros. Cada pixel sai
das funções abaixo. A cena é pintada em pixel art (480 x 160), camada por camada, e depois montada em 3x com a luz
calculada por pixel, como nos jogos "HD-2D":
- profundidade de campo: o fundo e o primeiro plano desfocados, o assunto nítido;
- materiais pintados "à luz do dia" e iluminados na montagem: ambiente da hora (multiplica) e luzes pontuais
  (lanternas, janelas, o ouro do baú) que somam, com uma camada de emissivos (vidro aceso, areia, chamas) por cima;
- feixes de luz, brilho (bloom), correção de cor quente nas altas luzes e fria nas sombras, vinheta e granulação.
A esquerda (cerca de 45% da largura) fica mais calma e escura de propósito: é onde o site põe o texto.

Gera em public/pixel/inicio/:
- secao-torre: a praça da vila ao entardecer, a torre do relógio, a ampulheta gigante e a estrada até o castelo
  da prova (a calculadora "Até a prova" e o cronograma);
- secao-bau: a caverna do tesouro com o baú aberto (os planos);
- secao-correio: o canto do correio da vila ao anoitecer (o programa de indicação).
Cada uma em .webp de 1440 x 480 e 960 x 320.
Uso: python3 scripts/gerar_cena_vila.py [torre|bau|correio]
Páginas internas (Revisão, Planos/Assinatura, Indique e ganhe/Contato), nas três horas do dia, com a luz repintada
por hora (céu, sol ou lua, sombras projetadas, janelas e lampiões acesos ou apagados, a fenda do teto da caverna) e o
chão de x 330-380 livre para o mascote: python3 scripts/gerar_cena_vila.py --paginas [cena] [manha|tarde|noite]
  -> public/pixel/paginas/<cena>-<hora>(-960).webp
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "inicio"
PASTA_PAGINAS = Path(__file__).resolve().parents[1] / "public" / "pixel" / "paginas"
W, H, ESC = 480, 160, 3
PERIODOS = ("manha", "tarde", "noite")
# Hora do dia da versão das páginas internas. None = a versão da página inicial (secao-*), que fica exatamente como era.
PERIODO: str | None = None


def hora(orig, manha=None, tarde=None, noite=None):
    """Valor de um parâmetro da luz conforme a hora do dia; na versão da página inicial devolve sempre `orig`."""
    if PERIODO is None:
        return orig
    v = {"manha": manha, "tarde": tarde, "noite": noite}[PERIODO]
    return orig if v is None else v


# ─────────────────────────────── Pincéis ───────────────────────────────
def hexa(c) -> np.ndarray:
    if not isinstance(c, str):
        return np.asarray(c, dtype=np.float32)
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def mistura(a, b, t: float) -> np.ndarray:
    return hexa(a) * (1 - t) + hexa(b) * t


def hash01(*v: int) -> float:
    """Número pseudoaleatório estável 0..1 para um pixel ou tijolo (a textura não muda entre execuções)."""
    h = 2166136261
    for k in v:
        h = ((h ^ (int(k) & 0xFFFFFFFF)) * 16777619) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 1274126177) & 0xFFFFFFFF
    return (h & 0xFFFF) / 65535


class Camada:
    """Uma camada de pixel art RGBA (float 0..1) com pincéis simples."""

    def __init__(self) -> None:
        self.c = np.zeros((H, W, 4), dtype=np.float32)

    def p(self, x, y, cor, a: float = 1.0) -> None:
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and a > 0:
            rgb = hexa(cor)
            base = self.c[y, x]
            na = a + base[3] * (1 - a)
            if na > 0:
                base[:3] = (rgb * a + base[:3] * base[3] * (1 - a)) / na
            base[3] = na

    def ret(self, x0, y0, w, h, cor, a: float = 1.0) -> None:
        x0, y0, w, h = int(round(x0)), int(round(y0)), int(round(w)), int(round(h))
        xa, xb, ya, yb = max(0, x0), min(W, x0 + w), max(0, y0), min(H, y0 + h)
        if xa >= xb or ya >= yb:
            return
        m = np.zeros((H, W), dtype=np.float32)
        m[ya:yb, xa:xb] = a
        self.mascara(m, cor)

    def mascara(self, m: np.ndarray, cor, a: float = 1.0) -> None:
        """Pinta a cor (ou um mapa de cores HxWx3) com a opacidade m (HxW, 0..1)."""
        am = np.clip(m * a, 0, 1)[:, :, None]
        rgb = hexa(cor) if isinstance(cor, str) or np.ndim(cor) == 1 else cor
        base_a = self.c[:, :, 3:4]
        na = am + base_a * (1 - am)
        seguro = np.maximum(na, 1e-6)
        self.c[:, :, :3] = np.where(na > 0, (rgb * am + self.c[:, :, :3] * base_a * (1 - am)) / seguro, self.c[:, :, :3])
        self.c[:, :, 3:4] = na

    def linha(self, x0, y0, x1, y1, cor, a: float = 1.0, grossura: int = 1) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / max(n, 1)
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for gx in range(grossura):
                for gy in range(grossura):
                    self.p(x + gx - grossura // 2, y + gy - grossura // 2, cor, a)

    def elipse(self, cx, cy, rx, ry, cor, a: float = 1.0) -> None:
        self.mascara(elipse_m(cx, cy, rx, ry), cor, a)

    def poligono(self, pts, cor, a: float = 1.0) -> None:
        self.mascara(poligono_m(pts), cor, a)

    def disco(self, cx, cy, r, cores, luz=(-0.6, -0.8), granulado: float = 0.55) -> None:
        """Disco com sombreamento em 3 tons, iluminado da direção `luz` (copas, pedras, moedas)."""
        lx, ly = luz
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                dx, dy = x - cx, y - cy
                if math.hypot(dx, dy) <= r:
                    k = (dx * lx + dy * ly) / max(r, 1) + (hash01(x, y, 7) - 0.5) * granulado
                    self.p(x, y, cores[0] if k > 0.38 else cores[1] if k > -0.2 else cores[2])


def colar(dst: Camada, src: Camada, contorno: str | None = None, a: float = 1.0) -> None:
    """Cola uma camada sobre outra; com `contorno`, desenha antes a borda de 1 pixel em volta (leitura do objeto)."""
    if contorno:
        al = src.c[:, :, 3] > 0.5
        viz = np.zeros_like(al)
        for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            viz |= np.roll(np.roll(al, dy, 0), dx, 1)
        dst.mascara((viz & ~al).astype(np.float32), contorno, a)
    dst.mascara(src.c[:, :, 3], src.c[:, :, :3])


_YS, _XS = np.mgrid[0:H, 0:W].astype(np.float32)


def elipse_m(cx, cy, rx, ry) -> np.ndarray:
    return ((((_XS - cx) / max(rx, 0.01)) ** 2 + ((_YS - cy) / max(ry, 0.01)) ** 2) <= 1).astype(np.float32)


def poligono_m(pts) -> np.ndarray:
    """Máscara de um polígono (regra par-ímpar), no centro de cada pixel."""
    m = np.zeros((H, W), dtype=bool)
    px, py = _XS + 0.5, _YS + 0.5
    n = len(pts)
    for i in range(n):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % n]
        if y0 == y1:
            continue
        cruza = ((y0 <= py) & (py < y1)) | ((y1 <= py) & (py < y0))
        xc = x0 + (py - y0) * (x1 - x0) / (y1 - y0)
        m ^= cruza & (px < xc)
    return m.astype(np.float32)


def ruido(seed: int, ex: int, ey: int | None = None, w: int = W, h: int = H) -> np.ndarray:
    """Ruído suave 0..1 (valores aleatórios ampliados com interpolação); ex/ey dão o tamanho do grão."""
    ey = ey or ex
    g = np.random.default_rng(seed)
    pequeno = g.random((h // ey + 3, w // ex + 3)).astype(np.float32)
    img = Image.fromarray((pequeno * 255).astype(np.uint8)).resize(((w // ex + 3) * ex, (h // ey + 3) * ey), Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32)[ey:ey + h, ex:ex + w] / 255, 0, 1)


def gradiente(paradas) -> np.ndarray:
    """Céu em faixas suaves: [(y, cor), ...]."""
    ys = np.array([p[0] for p in paradas], dtype=np.float32)
    cores = np.array([hexa(p[1]) for p in paradas])
    linha = np.stack([np.interp(np.arange(H), ys, cores[:, i]) for i in range(3)], 1).astype(np.float32)
    return np.repeat(linha[:, None, :], W, 1)


def brilho(c: Camada, x, y, tam: int, cor: str = "#fff6d0") -> None:
    """Estrelinha de 4 pontas (o cintilar do ouro, do vidro e das estrelas)."""
    c.p(x, y, "#ffffff")
    for k in range(1, tam + 1):
        a = 1 - (k - 1) / (tam + 0.5)
        for (dx, dy) in ((k, 0), (-k, 0), (0, k), (0, -k)):
            c.p(x + dx, y + dy, cor, a)
    if tam >= 2:
        for (dx, dy) in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            c.p(x + dx, y + dy, cor, 0.35)


def curva(pontos, passos: int = 200):
    """Catmull-Rom pelos pontos de controle (para a estrada)."""
    pts = [pontos[0]] + list(pontos) + [pontos[-1]]
    saida = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = (np.array(p, dtype=np.float32) for p in pts[i - 1:i + 3])
        for k in range(passos):
            t = k / passos
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
            saida.append((float(q[0]), float(q[1])))
    return saida


# ─────────────────────────────── Montagem com luz ───────────────────────────────
_GYS, _GXS = np.mgrid[0:H * ESC, 0:W * ESC].astype(np.float32)


def ampliar(arr: np.ndarray) -> np.ndarray:
    return arr.repeat(ESC, 0).repeat(ESC, 1)


def _caixa(arr: np.ndarray, r: int, eixo: int) -> np.ndarray:
    """Média móvel de largura 2r+1 ao longo de um eixo (bordas estendidas), por soma acumulada."""
    if r < 1:
        return arr
    pad = [(0, 0)] * arr.ndim
    pad[eixo] = (r + 1, r)
    a = np.pad(arr, pad, mode="edge")
    s = np.cumsum(a, axis=eixo, dtype=np.float64)
    n = arr.shape[eixo]
    fim = np.take(s, np.arange(2 * r + 1, 2 * r + 1 + n), axis=eixo)
    ini = np.take(s, np.arange(0, n), axis=eixo)
    return ((fim - ini) / (2 * r + 1)).astype(np.float32)


def desfocar(arr: np.ndarray, raio: float) -> np.ndarray:
    """Desfoque gaussiano aproximado por três caixas (aceita valores acima de 1, como as luzes)."""
    if raio <= 0:
        return arr
    r = max(1, int(round((math.sqrt(4 * raio * raio + 1) - 1) / 2)))
    out = arr.astype(np.float32)
    for _ in range(3):
        out = _caixa(_caixa(out, r, 0), r, 1)
    return out


def desfocar_rgba(arr: np.ndarray, raio: float) -> np.ndarray:
    """Desfoque com alfa pré-multiplicado (sem halo escuro nas bordas)."""
    if raio <= 0:
        return arr
    pm = arr.copy()
    pm[:, :, :3] *= pm[:, :, 3:4]
    d = desfocar(pm, raio)
    a = np.maximum(d[:, :, 3:4], 1e-4)
    d[:, :, :3] = d[:, :, :3] / a
    return d


def sobre(base: np.ndarray, camada: np.ndarray) -> np.ndarray:
    a = camada[:, :, 3:4]
    return base * (1 - a) + camada[:, :, :3] * a


def luz_pontual(cx: float, cy: float, raio: float, achatar: float = 1.0) -> np.ndarray:
    d2 = ((_GXS - cx * ESC) / (raio * ESC)) ** 2 + ((_GYS - cy * ESC) / (raio * ESC * achatar)) ** 2
    return np.exp(-d2 * 2.2)


def raios_radiais(mascara: np.ndarray, centro, passos: int = 56, alcance: float = 0.9, queda: float = 0.965) -> np.ndarray:
    """Feixes de luz: desfoque radial de uma máscara de luz em direção (ou a partir) de um centro."""
    hh, ww = mascara.shape
    sx, sy = centro[0] * ESC, centro[1] * ESC
    acum = np.zeros_like(mascara)
    peso = 1.0
    for i in range(passos):
        t = i / passos * alcance
        px = np.clip((_GXS + (sx - _GXS) * t).astype(np.int32), 0, ww - 1)
        py = np.clip((_GYS + (sy - _GYS) * t).astype(np.int32), 0, hh - 1)
        acum += mascara[py, px] * peso
        peso *= queda
    return acum / passos


class Montagem:
    """Junta as camadas em 3x: profundidade de campo, luz ambiente e pontual, emissivos e acabamento."""

    def __init__(self, ceu: np.ndarray) -> None:
        self.img = ampliar(ceu)
        self.solido = np.zeros(self.img.shape[:2], dtype=np.float32)
        self.recep = np.ones(self.img.shape[:2], dtype=np.float32)

    def camada(self, cam: Camada, desfoque: float = 0.0, escurecer: float = 1.0, solida: bool = True, luz_k: float = 1.0) -> None:
        """luz_k: quanto a camada recebe das luzes pontuais (o ouro já é claro de si, recebe menos para não estourar)."""
        arr = desfocar_rgba(ampliar(cam.c), desfoque)
        if escurecer != 1.0:
            arr = arr * np.array([escurecer, escurecer, escurecer, 1], dtype=np.float32)
        self.img = sobre(self.img, arr)
        if solida:
            self.solido = np.maximum(self.solido, arr[:, :, 3])
            self.recep = self.recep * (1 - arr[:, :, 3]) + luz_k * arr[:, :, 3]
        else:  # luz própria (o interior aceso de uma janela): o que fica por baixo deixa de receber a luz de fora
            self.solido = self.solido * (1 - arr[:, :, 3])

    def iluminar(self, ambiente, luzes, mapa: np.ndarray | None = None) -> None:
        """ambiente: cor (multiplica); luzes: [(cx, cy, raio, achatar, cor, força)] somadas, só no que não é céu;
        mapa: luz extra já calculada por pixel (o sol com as sombras projetadas, nas versões das páginas)."""
        soma = np.zeros_like(self.img)
        for (cx, cy, raio, achatar, cor, forca) in luzes:
            soma += luz_pontual(cx, cy, raio, achatar)[:, :, None] * hexa(cor) * forca
        luz = hexa(ambiente) + soma * self.recep[:, :, None]
        if mapa is not None:
            luz = luz + mapa
        s = self.solido[:, :, None]
        self.img = self.img * (1 - s) + self.img * s * luz

    def emissivo(self, cam: Camada, desfoque: float = 0.0, halo: float = 0.0) -> None:
        arr = desfocar_rgba(ampliar(cam.c), desfoque)
        self.img = sobre(self.img, arr)
        if halo > 0:
            pm = arr[:, :, :3] * arr[:, :, 3:4]
            self.img += desfocar(pm, 7) * halo * 0.6 + desfocar(pm, 22) * halo * 0.5

    def reflexo(self, y_linha: float, mascara: np.ndarray, forca: float = 0.5, desfoque: float = 2.0) -> None:
        """Poças d'água: espelha o que está acima da linha (em pixels da arte) dentro da máscara, com ondulação."""
        yl = int(y_linha * ESC)
        hh = self.img.shape[0]
        ys = np.arange(hh)
        fonte_y = np.clip(2 * yl - ys, 0, hh - 1)
        espelho = self.img[fonte_y]
        # ondulação: cada linha da poça desloca um pouco para os lados
        desloc = (np.sin(ys / 2.3) * 2).astype(int)
        espelho = np.stack([espelho[i] if desloc[i] == 0 else np.roll(espelho[i], desloc[i], 0) for i in range(hh)])
        espelho = desfocar(espelho, desfoque)
        m = ampliar(mascara[:, :, None])[:, :, 0]
        m = desfocar(m[:, :, None], 1.5)[:, :, 0] * (ys[:, None] > yl)
        self.img = self.img * (1 - m[:, :, None] * forca) + espelho * hexa("#c8d0ff") * m[:, :, None] * forca

    def somar(self, mapa: np.ndarray, cor, forca: float = 1.0) -> None:
        self.img = self.img + mapa[:, :, None] * hexa(cor) * forca

    def acabar(self, quente: str, fria: str, esquerda: float = 0.5, vinheta: float = 1.0, centro_v=(0.62, 0.55),
               contraste: float = 1.08, seed: int = 99, bloom: float = 1.0) -> Image.Image:
        img = self.img
        xs, ys = _GXS / (W * ESC), _GYS / (H * ESC)
        # Brilho (bloom) das luzes fortes, em dois raios.
        lum = img.mean(2, keepdims=True)
        claro = np.clip(img - 0.62, 0, None) * np.clip((lum - 0.55) * 3, 0, 1)
        img = img + (desfocar(claro, 6) * 0.55 + desfocar(claro, 20) * 0.6) * bloom
        # Correção de cor: sombras frias, luzes quentes.
        q, f = hexa(quente), hexa(fria)
        lum = np.clip(img.mean(2, keepdims=True), 0, 1)
        img = img * (0.78 + 0.22 * (lum * q + (1 - lum) * (f * 0.5 + 0.5)))
        img = np.clip((img - 0.45) * contraste + 0.45, 0, 1.3)
        # A esquerda fica calma e mais escura (é onde entra o texto do site).
        t = np.clip(xs / 0.52, 0, 1)
        suave = t * t * (3 - 2 * t)
        img *= (1 - esquerda + esquerda * suave)[:, :, None]
        # Vinheta de diorama e granulação.
        v = (xs - centro_v[0]) ** 2 * 1.2 + (ys - centro_v[1]) ** 2 * 1.6
        img *= (1 - np.clip(v - 0.08, 0, 1) * 0.9 * vinheta)[:, :, None]
        g = np.random.default_rng(seed)
        img += (g.random(img.shape[:2]).astype(np.float32)[:, :, None] - 0.5) * 0.024
        return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))


# ─────────────────────────────── A hora do dia (versões das páginas) ───────────────────────────────
def remapear(cam: Camada, rampa, manter: float = 0.18, faixa=None) -> None:
    """Repinta uma camada distante com a paleta da hora (perspectiva aérea): cada pixel guarda o seu valor (claro ou
    escuro, relativo à camada) e ganha a cor da rampa [(0..1, cor), ...]; `manter` conserva um pouco do matiz."""
    a = cam.c[:, :, 3]
    if not (a > 0).any():
        return
    lum = cam.c[:, :, :3] @ np.array([0.3, 0.55, 0.15], dtype=np.float32)
    lo, hi = faixa or np.percentile(lum[a > 0], (2, 98))
    t = np.clip((lum - lo) / max(hi - lo, 1e-3), 0, 1)
    ts = np.array([r[0] for r in rampa], dtype=np.float32)
    cs = np.array([hexa(r[1]) for r in rampa], dtype=np.float32)
    nova = np.stack([np.interp(t, ts, cs[:, i]) for i in range(3)], 2).astype(np.float32)
    media = np.maximum(lum[:, :, None], 1e-3)
    matiz = cam.c[:, :, :3] / media * nova.mean(2, keepdims=True)
    cam.c[:, :, :3] = np.where(a[:, :, None] > 0, nova * (1 - manter) + np.clip(matiz, 0, 1) * manter, cam.c[:, :, :3])


def apagar(e: Camada, base: Camada | None = None, vidro=("#1e2a3a", "#5a7898", "#c8dcf0"), aceso: float = 0.0) -> Camada:
    """De dia, o que brilha à noite (vidro de janela, lampião) vira vidro apagado refletindo o céu: escuro embaixo,
    claro em cima, um risco de reflexo na diagonal. `base`: os caixilhos escuros pintados por baixo continuam
    aparecendo. `aceso` (0..1): um resto da luz de dentro misturado ao vidro (uma vela já acesa ao entardecer)."""
    out = Camada()
    a = e.c[:, :, 3].copy()
    if base is not None:
        lum_b = base.c[:, :, :3].mean(2)
        a *= ~((base.c[:, :, 3] > 0.5) & (lum_b < 0.3))
    # posição relativa dentro de cada vidraça (pelo contorno vertical da máscara)
    acima = np.zeros_like(a)
    for k in range(1, 7):
        acima += np.roll(a, k, 0) > 0
    t = np.clip(acima / 6, 0, 1)
    risco = (np.mod(_XS + _YS * 0.8, 9) < 2).astype(np.float32)
    v0, v1, v2 = hexa(vidro[0]), hexa(vidro[1]), hexa(vidro[2])
    cor = v1[None, None] * (1 - t[:, :, None]) * 0.9 + v0[None, None] * t[:, :, None]
    cor = cor + (v2 - cor) * (risco * 0.45)[:, :, None]
    if aceso > 0:
        cor = cor * (1 - aceso) + e.c[:, :, :3] * aceso
    out.c[:, :, :3] = cor
    out.c[:, :, 3] = a
    return out


def sombra_projetada(alfa: np.ndarray, base_y: float, comp: float, cis: float, borrar: float = 1.2) -> np.ndarray:
    """Sombra de um objeto no chão (em pixels da arte): espelha a silhueta para baixo a partir da base, achata por
    `comp` (sol alto = curta, sol baixo = longa) e inclina `cis` px por px de altura (o lado oposto ao sol)."""
    out = np.zeros((H, W), dtype=np.float32)
    ys, xs = np.nonzero(alfa > 0.5)
    for y, x in zip(ys, xs):
        alt = base_y - y
        if alt < 0:
            continue
        yy = int(round(base_y + alt * comp))
        xx = int(round(x + alt * cis))
        if 0 <= yy < H and 0 <= xx < W:
            out[yy, xx] = 1
    # fecha os buracos da projeção e amacia a borda (penumbra)
    out = desfocar(out[:, :, None], borrar)[:, :, 0]
    return np.clip(out * 3, 0, 1) * (_YS > base_y - 1)


def ceu_hora(paradas, sol=None, lua=None, nuvens=None, estrelas: int = 0, seed: int = 0) -> np.ndarray:
    """Céu de uma hora do dia, pintado em pixel art: gradiente, halo e disco do sol (ou da lua com as crateras),
    nuvens com a borda virada para a luz acesa e a barriga na sombra, estrelas que cintilam.
    sol = (x, y, raio_disco, cor_halo, força, raio_halo); lua = (x, y, raio, cheia); nuvens = dict(...)."""
    ceu = gradiente(paradas)
    g = np.random.default_rng(seed)
    if estrelas:
        for _ in range(estrelas):
            x, y = int(g.random() * W), int(g.random() ** 1.6 * 100)
            b = (0.25 + g.random() * 0.75) * (1 - y / 110)
            ceu[y, x] = np.minimum(1, ceu[y, x] + b * hexa("#e8ecff"))
            if b > 0.75:
                for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= x + dx < W and 0 <= y + dy < H:
                        ceu[y + dy, x + dx] = np.minimum(1, ceu[y + dy, x + dx] + b * 0.3)
        # a Via Láctea, uma faixa de poeira clara cruzando o alto
        faixa = np.exp(-(((_YS - (8 + (_XS - 240) * 0.12)) / 14) ** 2)) * ruido(seed + 1, 6) * (_XS > 170)
        ceu += (faixa * 0.16)[:, :, None] * hexa("#b8c0ff")
        for _ in range(500):
            x, y = int(g.random() * W), int(g.random() * 60)
            if faixa[y, x] > 0.25 and g.random() < faixa[y, x]:
                ceu[y, x] = np.minimum(1, ceu[y, x] + 0.22)
    if nuvens:
        nv = ruido(seed + 2, nuvens.get("ex", 30), nuvens.get("ey", 7)) * 0.65 + ruido(seed + 3, 9, 4) * 0.35
        yc, esp = nuvens["yc"], nuvens["esp"]
        dens = nv - nuvens.get("limiar", 0.55) - np.abs(_YS - yc) / esp
        dx, dy = nuvens.get("lado_luz", -1), nuvens.get("luz_dy", -1)  # direção de onde vem a luz
        perto = np.roll(np.roll(dens, -2 * dy, 0), -2 * dx, 1)
        acesa = np.clip((dens - perto) * 9 + 0.5, 0, 1)
        k = np.clip(dens * 7, 0, 1) * nuvens.get("forca", 0.9)
        cor = hexa(nuvens["sombra"]) * (1 - acesa[:, :, None]) + hexa(nuvens["luz"]) * acesa[:, :, None]
        miolo = np.clip(dens * 5 - 0.6, 0, 1)[:, :, None]
        cor = cor * (1 - miolo * 0.35) + hexa(nuvens.get("miolo", nuvens["sombra"])) * miolo * 0.35
        ceu = ceu * (1 - k[:, :, None]) + cor * k[:, :, None]
    if sol:
        sx_, sy_, r, cor_h, forca, raio_h = sol
        d = np.hypot(_XS - sx_, (_YS - sy_) * 1.05)
        ceu += (np.clip(1 - d / raio_h, 0, 1) ** 2 * forca)[:, :, None] * hexa(cor_h)
        ceu += (np.exp(-(d / (r * 1.7)) ** 2) * 0.55)[:, :, None] * hexa("#fff4d8")
        ceu = np.where((d < r)[:, :, None], hexa("#fffbec") * 1.5, ceu)
    if lua:
        mx, my, r, cheia = lua
        d = np.hypot(_XS - mx, _YS - my)
        ceu += (np.exp(-(d / (r * 3.2)) ** 2) * 0.32)[:, :, None] * hexa("#b8c4ff")
        ceu += (np.exp(-(d / (r * 9)) ** 2) * 0.1)[:, :, None] * hexa("#8a9aff")
        for y in range(int(my - r - 1), int(my + r + 2)):
            for x in range(int(mx - r - 1), int(mx + r + 2)):
                dd = math.hypot(x - mx, y - my)
                if dd > r or not (0 <= x < W and 0 <= y < H):
                    continue
                if not cheia and math.hypot(x - mx - r * 0.55, y - my + r * 0.3) < r * 0.85:
                    continue
                cor = mistura("#fffaf0", "#d8d8e8", dd / r * 0.7)
                if hash01(x // 2, y // 2, 77) > 0.72 and dd < r - 1:
                    cor = cor * 0.86
                ceu[y, x] = cor
    return ceu


# ═══════════════════════════════ 1. A torre do relógio ═══════════════════════════════
# Algarismos romanos em 3 linhas de altura (I, V e X), para o mostrador.
GLIFOS = {
    "I": ["X", "X", "X"],
    "V": ["X.X", "X.X", ".X."],
    "X": ["X.X", ".X.", "X.X"],
}
ROMANOS = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"]


def escrever_romano(c: Camada, texto: str, cx: float, cy: float, cor: str) -> None:
    largura = sum(len(GLIFOS[l][0]) for l in texto) + len(texto) - 1
    x = round(cx - largura / 2)
    y0 = round(cy - 1.5)
    for l in texto:
        g = GLIFOS[l]
        for j, linha in enumerate(g):
            for i, ch in enumerate(linha):
                if ch == "X":
                    c.p(x + i, y0 + j, cor)
        x += len(g[0]) + 1


def parede_de_pedra(c: Camada, x0: int, x1: int, y0: int, y1: int, luz_esq: bool = True, seed: int = 0,
                    tons=("#ae96a4", "#87788e", "#625a76", "#433e5a"), alt: int = 4, larg: int = 9) -> None:
    """Cantaria em fiadas desencontradas, cada pedra com um tom, aresta clara em cima e rejunte escuro."""
    n = ruido(seed + 5, 3)
    musgo = ruido(seed + 6, 5)
    for y in range(max(0, y0), min(H, y1)):
        fi = (y - y0) // alt
        for x in range(max(0, x0), min(W, x1)):
            off = (fi % 2) * (larg // 2)
            col = (x - x0 + off) // larg
            emx, emy = (x - x0 + off) % larg, (y - y0) % alt
            t = (x - x0) / max(1, x1 - x0)
            sombra = t if luz_esq else 1 - t
            if emy == alt - 1 or emx == larg - 1:
                cor = mistura("#3a3048", "#241e30", sombra)
            else:
                k = hash01(fi, col, seed)
                base = 0.15 + sombra * 0.75 + (k - 0.5) * 0.35 + (n[y, x] - 0.5) * 0.25
                if emy == 0:
                    base -= 0.18
                if emx == 0:
                    base -= 0.08
                i = min(3, max(0, int(base * 3.2)))
                cor = hexa(tons[i])
                if musgo[y, x] > 0.68 and y > y0 + (y1 - y0) * 0.55:
                    cor = cor * 0.6 + hexa("#5a7a4a") * 0.4
            c.p(x, y, cor)


def torre(c: Camada, e: Camada, cx: int = 398, er: Camada | None = None) -> list:
    """A torre do relógio: telhado de telhas, campanário aberto com o sino, mostrador e porta. Devolve as luzes."""
    luzes = []
    er = er or e
    xa, xb, lado = cx - 22, cx + 22, 8  # face da frente e a face lateral (sombra)
    topo_corpo, base = 27, 142
    # Corpo em cantaria, com a face lateral na sombra.
    parede_de_pedra(c, xa, xb, topo_corpo, base, seed=3)
    parede_de_pedra(c, xb, xb + lado, topo_corpo, base, seed=4, tons=("#5e5474", "#4c4462", "#3c3652", "#2c283e"), larg=6)
    c.ret(xa, topo_corpo, 1, base - topo_corpo, "#f0c0b0")  # luz do poente na quina
    c.ret(xa + 1, topo_corpo, 1, base - topo_corpo, "#d8a4a8", 0.6)
    c.ret(xb, topo_corpo, 1, base - topo_corpo, "#2a2238")
    # Cornijas (faixas salientes) com sombra embaixo.
    for yc in (50, 96, 127):
        c.ret(xa - 2, yc, xb - xa + 4, 3, "#b8a0ac")
        c.ret(xa - 2, yc, xb - xa + 4, 1, "#f2d2c8")
        c.ret(xb + 2, yc, lado - 2, 3, "#4a425c")
        c.ret(xa - 2, yc + 3, xb - xa + lado + 2, 1, "#241e30", 0.8)
        for k in range(xa, xb, 4):
            c.p(k, yc + 2, "#7a6a80")
    # Base mais larga (embasamento).
    c.ret(xa - 3, 130, xb - xa + 6, 12, "#8a7a90")
    parede_de_pedra(c, xa - 3, xb + 3, 130, base, seed=8, alt=6, larg=12)
    parede_de_pedra(c, xb + 3, xb + lado + 1, 130, base, seed=9, tons=("#4c4462", "#3c3652", "#2c283e", "#221e30"), alt=6, larg=7)

    # ── Campanário: arco aberto, o sino de bronze iluminado por dentro.
    cb_y0, cb_y1 = 29, 49
    arco = poligono_m([(cx - 15, cb_y1), (cx - 15, cb_y0 + 9), (cx + 15, cb_y0 + 9), (cx + 15, cb_y1)])
    arco = np.maximum(arco, elipse_m(cx, cb_y0 + 9, 15, 9) * (_YS <= cb_y0 + 9))
    interior = np.zeros((H, W, 3), dtype=np.float32) + hexa("#3a2220")
    interior = interior + (1 - np.clip(np.abs(_XS - cx) / 16, 0, 1))[:, :, None] * hexa("#5a3020")
    c.mascara(arco, interior)
    borda = (desfocar(arco[:, :, None], 0.8)[:, :, 0] > 0.05) & (arco == 0) & (_YS > cb_y0 - 2) & (_YS < cb_y1)
    c.mascara(borda.astype(np.float32), "#e6cdbf")
    # Viga e o sino.
    c.ret(cx - 14, cb_y0 + 5, 28, 2, "#4a2a18")
    c.ret(cx - 14, cb_y0 + 5, 28, 1, "#8a5a30")
    perfil = [2, 3, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 9, 9]
    by = cb_y0 + 7
    for j, m in enumerate(perfil):
        for dx in range(-m, m + 1):
            t = (dx + m) / (2 * m)
            cor = "#ffe29a" if t < 0.18 else "#e2a648" if t < 0.4 else "#b0702a" if t < 0.72 else "#6a3e18"
            if j == len(perfil) - 1:
                cor = "#5a3414" if t > 0.3 else "#c88a3a"
            if j == 9:
                cor = "#ffd88a" if t < 0.3 else "#8a5420"
            c.p(cx + dx, by + j, cor)
    c.p(cx - 3, by + 3, "#fff6d0")
    c.p(cx - 4, by + 5, "#fff2c0")
    c.ret(cx, by + len(perfil), 1, 2, "#3a2210")
    c.ret(cx - 1, by + len(perfil) + 2, 3, 1, "#5a3414")
    # Colunas laterais do campanário.
    c.ret(xa, cb_y0 - 2, 4, cb_y1 - cb_y0 + 2, "#c8b0b8")
    c.ret(xa, cb_y0 - 2, 1, cb_y1 - cb_y0 + 2, "#f6d0c4")
    c.ret(xb - 4, cb_y0 - 2, 4, cb_y1 - cb_y0 + 2, "#6a5e7a")
    luzes.append((cx, cb_y0 + 13, 26, 0.9, "#ffb860", 0.55))
    e.ret(cx - 6, cb_y1 - 2, 12, 1, "#ffcf80", 0.35)

    # ── Telhado de quatro águas em telhas, beiral de madeira com cachorros, pináculo e cata-vento.
    eave, apice = 27, 3
    for y in range(apice, eave + 1):
        t = (y - apice) / (eave - apice)
        meia = 3 + t * 30
        fila = (y - apice) // 3
        for x in range(int(cx - meia), int(cx + meia) + 1):
            dx = x - cx
            u = dx / max(meia, 1)
            off = (fila % 2) * 2
            em = (x + off) % 4
            emy = (y - apice) % 3
            if u < -0.05:
                tons = ("#e8846a", "#c4583e", "#8e3a2c")
            elif u < 0.45:
                tons = ("#b04c38", "#8c3a2e", "#5e2624")
            else:
                tons = ("#6e3030", "#542428", "#3c1a20")
            cor = tons[2] if emy == 2 else tons[0] if (emy == 0 and em in (1, 2)) else tons[1]
            if em == 3 and emy < 2:
                cor = tons[2]
            if abs(x - (cx - meia)) < 1:
                cor = "#ffc0a0"
            c.p(x, y, cor)
        c.p(cx, y, "#ffb898" if y % 2 else "#d0705a")
    c.ret(cx - 34, eave, 70, 2, "#5a3420")
    c.ret(cx - 34, eave, 70, 1, "#9a6438")
    for k in range(cx - 32, cx + 35, 5):
        c.ret(k, eave + 2, 2, 2, "#3a2014")
    c.ret(cx, 0, 1, apice + 1, "#c89040")
    c.disco(cx + 0.5, apice, 1.6, ("#ffe8a0", "#d09a40", "#7a5020"))

    # ── Mostrador do relógio: aro de ferro, moldura dourada, face acesa por trás, algarismos e ponteiros.
    my = 73
    c.ret(xa + 1, my - 22, 42, 44, "#a8929e")
    c.ret(xa + 1, my - 22, 42, 1, "#e8c8c0")
    for (qx, qy) in ((xa + 3, my - 20), (xb - 4, my - 20), (xa + 3, my + 19), (xb - 4, my + 19)):
        c.disco(qx + 0.5, qy + 0.5, 1.5, ("#ffe8a0", "#c8902e", "#6a4418"))
    for y in range(my - 21, my + 22):
        for x in range(cx - 21, cx + 22):
            d = math.hypot(x - cx, y - my)
            ang = math.atan2(y - my, x - cx)
            luz_aro = -math.cos(ang + math.pi * 0.75)
            if 19.4 <= d < 21:
                c.p(x, y, "#2a2030" if d >= 20.3 else "#4a3a4a")
            elif 17.0 <= d < 19.4:
                c.p(x, y, "#fff0a8" if luz_aro > 0.55 else "#e0b04c" if luz_aro > -0.1 else "#9a6a24" if luz_aro > -0.6 else "#6a4418")
                if (round(math.degrees(ang)) % 30) == 0 and d > 17.8:
                    c.p(x, y, "#fff8d0")
            elif d < 17.0:
                # Face de vidro leitoso acesa por trás: anel dos algarismos, aro fino e um sol raiado no centro.
                k = d / 17
                cor = mistura("#fbeccc", "#e2b878", k ** 2)
                if 9.0 <= d < 15.6:
                    cor = cor * 0.95
                if 15.6 <= d < 16.3:
                    cor = hexa("#6a4630")
                er.p(x, y, cor)
    for i in range(60):  # marcas dos minutos, por dentro do aro fino
        a = i / 60 * math.tau - math.pi / 2
        er.p(cx + math.cos(a) * 15.0, my + math.sin(a) * 15.0, "#8a6a50" if i % 5 else "#2a1a1a")
    for i, txt in enumerate(ROMANOS):
        a = i / 12 * math.tau - math.pi / 2
        larg = sum(len(GLIFOS[l][0]) for l in txt) + len(txt) - 1
        r = 13.9 - (abs(math.cos(a)) * larg / 2 + abs(math.sin(a)) * 1.5)
        escrever_romano(er, txt, cx + math.cos(a) * r, my + math.sin(a) * r, "#2e1a1c")
    # Ponteiros de ferro com pontas em lança: 10h10.
    for (ang_g, comp, gross) in ((305, 8.0, 2), (60, 13.0, 1)):
        a = math.radians(ang_g) - math.pi / 2
        ex, ey = cx + math.cos(a) * comp, my + math.sin(a) * comp
        er.linha(cx, my, ex - math.cos(a) * 1.5, ey - math.sin(a) * 1.5, "#1a1018", grossura=gross)
        px, py = -math.sin(a), math.cos(a)
        for t in range(4):
            for k in np.linspace(-1.6 + t * 0.45, 1.6 - t * 0.45, 5):
                er.p(ex - math.cos(a) * (3 - t) + px * k, ey - math.sin(a) * (3 - t) + py * k, "#1a1018")
        er.linha(cx, my, cx - math.cos(a) * 3.5, my - math.sin(a) * 3.5, "#1a1018")
        er.p(cx - math.cos(a) * 4, my - math.sin(a) * 4, "#c8902e")
    er.disco(cx + 0.5, my + 0.5, 1.6, ("#ffe8a0", "#c8902e", "#6a4418"))
    luzes.append((cx, my, 30, 1.0, "#ffd890", 0.28))

    # ── Janela seteira acesa, estandarte e a porta em arco entreaberta, com arandelas.
    for (jx, jy) in ((cx - 1, 104),):
        e.ret(jx - 2, jy, 5, 12, "#ffc070")
        e.ret(jx - 1, jy - 2, 3, 2, "#ffc070")
        e.ret(jx - 1, jy + 1, 1, 10, "#fff0c0")
        c.ret(jx - 3, jy - 3, 7, 1, "#e8d0c8")
        c.ret(jx - 3, jy + 12, 7, 1, "#3a3048")
        luzes.append((jx, jy + 6, 18, 1.4, "#ffb060", 0.35))
    # Estandarte vermelho com a ampulheta bordada.
    for (bx, by0) in ((xa + 5, 100),):
        for y in range(by0, by0 + 22):
            for x in range(bx, bx + 7):
                ponta = y - by0 > 18 and abs(x - bx - 3) < (y - by0 - 18)
                if not ponta:
                    c.p(x, y, "#c23a3a" if x - bx < 2 else "#9a2a30" if x - bx < 5 else "#6e1c26")
        c.ret(bx - 1, by0 - 1, 9, 1, "#d8a040")
        for (dx, dy) in ((1, 5), (2, 5), (3, 5), (4, 5), (5, 5), (2, 6), (3, 6), (4, 6), (3, 7), (3, 8), (2, 9), (3, 9), (4, 9),
                         (1, 10), (2, 10), (3, 10), (4, 10), (5, 10)):
            c.p(bx + dx, by0 + dy, "#f2c860")
    for (bx, by0) in ((xb - 12, 100),):
        for y in range(by0, by0 + 22):
            for x in range(bx, bx + 7):
                ponta = y - by0 > 18 and abs(x - bx - 3) < (y - by0 - 18)
                if not ponta:
                    c.p(x, y, "#8a2a36" if x - bx < 2 else "#6e1c28" if x - bx < 5 else "#4a1220")
        c.ret(bx - 1, by0 - 1, 9, 1, "#b08038")
        for (dx, dy) in ((1, 5), (5, 5), (2, 6), (4, 6), (3, 7), (3, 8), (2, 9), (4, 9), (1, 10), (5, 10)):
            c.p(bx + dx, by0 + dy, "#c89a48")
    # Porta.
    px0, py0 = cx - 8, 121
    porta = poligono_m([(px0, base), (px0, py0 + 6), (px0 + 16, py0 + 6), (px0 + 16, base)])
    porta = np.maximum(porta, elipse_m(cx, py0 + 6, 8, 6) * (_YS <= py0 + 6))
    c.mascara(porta, "#5a3420")
    for k in range(px0, px0 + 17, 4):
        c.ret(k, py0, 1, base - py0, "#3a2010")
    for yb in (py0 + 9, py0 + 16):
        c.ret(px0, yb, 17, 1, "#2a2a34")
        for k in range(px0 + 1, px0 + 16, 3):
            c.p(k, yb, "#9a9aa8")
    e.ret(cx + 4, py0 + 5, 3, base - py0 - 5, "#ffbf6a")  # fresta de luz da porta entreaberta
    e.ret(cx + 4, py0 + 7, 1, base - py0 - 9, "#fff0c0")
    luzes.append((cx + 5, base, 30, 0.6, "#ffaa50", 0.6))
    contorno = (desfocar(porta[:, :, None], 0.8)[:, :, 0] > 0.05) & (porta == 0) & (_YS < base) & (_YS > py0 - 3)
    c.mascara(contorno.astype(np.float32), "#d8c0b8")
    for sx_ in (px0 - 6, px0 + 22):
        c.ret(sx_, py0 + 4, 4, 1, "#2a2030")
        c.ret(sx_, py0 - 3, 4, 7, "#2a2030")
        e.ret(sx_ + 1, py0 - 2, 2, 5, "#ffd890")
        e.p(sx_ + 1, py0 - 1, "#ffffff")
        luzes.append((sx_ + 2, py0, 16, 1.0, "#ffb060", 0.55))
    # Degraus.
    c.ret(px0 - 4, base, 25, 2, "#a8969c")
    c.ret(px0 - 4, base, 25, 1, "#e0c8c4")
    c.ret(px0 - 7, base + 2, 31, 2, "#8a7a84")
    c.ret(px0 - 7, base + 2, 31, 1, "#c8b4b4")
    # Hera subindo pela quina iluminada.
    g = np.random.default_rng(12)
    for k in range(70):
        y = base - g.random() * 55 * g.random()
        x = xa - 1 + g.random() * 6 * (1 - (base - y) / 60)
        c.p(x, y, ["#5a8a4a", "#3e6a3a", "#7aa85a"][k % 3])
    return luzes


def ampulheta(c: Camada, e: Camada, cx: int, base: int) -> list:
    """A ampulheta gigante decorativa: tampas de madeira com friso de ouro, colunas torneadas, vidro e areia acesa."""
    topo = base - 52
    vy0, vy1 = topo + 7, base - 7
    meio = (vy0 + vy1) / 2
    meia_alt = (vy1 - vy0) / 2
    # Pedestal de pedra.
    c.ret(cx - 19, base, 39, 3, "#7a6c78")
    c.ret(cx - 19, base, 39, 1, "#c8b4b0")
    c.ret(cx - 17, base + 3, 35, 3, "#56485a")
    c.ret(cx - 17, base + 3, 35, 1, "#8a7a84")
    # Coluna de trás (vista através do vidro).
    c.ret(cx - 1, vy0, 3, vy1 - vy0, "#4a2a18")

    def largura(y):
        u = abs(y - meio) / meia_alt
        w = 1.2 + 10.5 * u ** 0.6
        if u > 0.8:
            w *= 1 - (u - 0.8) * 1.4
        return w

    areia_topo = meio - 9
    for y in range(vy0, vy1):
        w = largura(y + 0.5)
        for x in range(int(cx - w - 1), int(cx + w + 2)):
            dx = x - cx
            if abs(dx) > w:
                continue
            if y < meio and y >= areia_topo + max(0.0, 3.2 - abs(dx) * 0.55):  # areia de cima, afundando em funil
                cor = "#f6c050" if dx < -2 else "#e0a03a" if dx < 3 else "#b8742a"
                e.p(x, y, "#fff0b0" if hash01(x, y, 3) > 0.9 else cor)
                continue
            monte = vy1 - 15 + abs(dx) * 1.05  # areia de baixo, um monte
            if y > meio and y >= min(monte, vy1 - 5):
                cor = "#f8c858" if dx < -2 else "#e0a03a" if dx < 4 else "#b06c26"
                if y >= vy1 - 3:
                    cor = "#9a5a20"
                e.p(x, y, "#fff0b0" if hash01(x, y, 4) > 0.88 else cor)
                continue
            c.p(x, y, "#8aa8e0", 0.2)
            if abs(dx) > w - 1:
                c.p(x, y, "#e0eeff", 0.6)
    for y in range(vy0 + 2, vy1 - 2):  # reflexos do vidro
        w = largura(y + 0.5)
        if abs(y - meio) > 4:
            c.p(cx - w + 2, y, "#ffffff", 0.8)
            if 8 < abs(y - meio) < meia_alt - 3:
                c.p(cx - w + 3, y, "#ffffff", 0.4)
            c.p(cx + w - 2, y, "#b8d0ff", 0.35)
    e.ret(cx, meio - 1, 1, vy1 - 15 - meio + 2, "#fff2a8")  # o fio de areia caindo
    e.p(cx, vy1 - 15, "#ffffff")

    def tampa(y, baixo):
        # chapa principal
        c.ret(cx - 18, y, 37, 4, "#5a3420")
        c.ret(cx - 18, y, 37, 1, "#b07a44")
        c.ret(cx - 18, y + 3, 37, 1, "#2e1a10")
        c.ret(cx - 16, y + 1, 33, 1, "#f0c050")
        c.ret(cx - 16, y + 2, 33, 1, "#9a6a20")
        for k in range(cx - 14, cx + 15, 4):
            c.p(k, y + 1, "#fff4b0")
        # moldura menor junto ao vidro
        ym = y - 2 if baixo else y + 4
        c.ret(cx - 14, ym, 29, 2, "#7a4a2a")
        c.ret(cx - 14, ym, 29, 1, "#c08a50" if baixo else "#7a4a2a")
        c.ret(cx - 14, ym + 1, 29, 1, "#4a2a18" if baixo else "#3a2014")
        for kx in (cx - 19, cx + 19):
            c.disco(kx, y + 1.5, 2.4, ("#ffe8a0", "#d09a40", "#6a4418"))
        # remate no centro (botão dourado)
        if not baixo:
            c.disco(cx + 0.5, y - 1.5, 2.2, ("#ffe8a0", "#d09a40", "#6a4418"))
    tampa(topo, False)
    tampa(vy1 + 1, True)
    # Colunas torneadas na frente (espiral de luz e sombra).
    for kx in (cx - 15, cx + 15):
        for y in range(vy0 - 1, vy1 + 1):
            fase = (y + (0 if kx < cx else 2)) % 4
            c.p(kx - 1, y, "#d89a58" if fase < 2 else "#8a5a30")
            c.p(kx, y, "#a06a38" if fase in (1, 2) else "#6a4022")
            c.p(kx + 1, y, "#4a2a18" if fase != 1 else "#6a4022")
        for yy in (vy0 + 3, meio, vy1 - 3):
            c.disco(kx, yy, 1.8, ("#ffe8a0", "#d09a40", "#6a4418"))
    # Faíscas de areia subindo.
    g = np.random.default_rng(77)
    for _ in range(18):
        x, y = cx + g.normal(0, 11), topo - g.random() * 26 + 10
        e.p(x, y, "#ffe08a", 0.35 + g.random() * 0.6)
    brilho(e, cx - 8, vy0 + 4, 2)
    brilho(e, cx + 7, vy1 - 6, 1)
    return [(cx, meio + 10, 46, 0.8, "#ffb848", 0.4), (cx, vy1 - 8, 14, 1.0, "#ffd070", 0.2)]


def lampiao(c: Camada, e: Camada, x: float, yb: float, s: float, luzes: list) -> None:
    """Poste de lampião em escala s (perspectiva da estrada); acende o vidro e registra a luz."""
    alt = max(3, round(30 * s))
    if s < 0.22:
        c.ret(x, yb - alt, 1, alt, "#2a2030")
        e.p(x, yb - alt - 1, "#ffe0a0")
        e.p(x, yb - alt, "#ffb860", 0.7)
        luzes.append((x, yb - alt, 8, 1.0, "#ffb060", 0.35))
        return
    gr = max(1, round(2 * s))
    c.ret(x, yb - alt, gr, alt, "#2a2232")
    c.ret(x, yb - alt, 1, alt, "#5a4a5a")
    c.ret(x - gr, yb - 2, gr * 3, 2, "#2a2232")
    lw, lh = max(3, round(7 * s)), max(4, round(9 * s))
    lx, ly = x + gr / 2 - lw / 2, yb - alt - lh
    c.ret(lx - 1, ly - 1, lw + 2, 1, "#2a2232")
    c.ret(lx, ly - 2, lw, 1, "#2a2232")
    c.ret(lx + lw // 2, ly - 3, 1, 1, "#2a2232")
    e.ret(lx, ly, lw, lh, "#ffcf70")
    e.ret(lx + 1, ly + 1, max(1, lw - 2), max(1, lh - 2), "#fff0c0")
    if lw >= 5:
        c.ret(lx + lw // 2, ly, 1, lh, "#3a2a2a", 0.6)
    c.ret(lx - 1, ly + lh, lw + 2, 1, "#2a2232")
    luzes.append((x, ly + lh / 2, 12 + 30 * s, 0.85, "#ffb058", 0.25 + 0.2 * s))


def casa(c: Camada, e: Camada, x0: int, x1: int, base: int, parede_topo: int, cumeeira: int, luzes: list, seed: int,
         chamine: bool = True, tons_telhado=("#6a4a6a", "#4e3654", "#36243e"), janelas=(0.22, 0.62)) -> None:
    """Casinha em enxaimel com empena de frente, janelas acesas, floreira e chaminé."""
    cx = (x0 + x1) / 2
    # Parede de reboco com madeiramento.
    for y in range(parede_topo, base):
        for x in range(x0, x1):
            t = (x - x0) / (x1 - x0)
            k = hash01(x, y, seed) * 0.12
            c.p(x, y, mistura("#cdb89e", "#7a6c7c", min(1, t * 0.9 + k)))
    for x in range(x0, x1, 9):
        c.ret(x, parede_topo, 2, base - parede_topo, "#5a3a26")
    c.ret(x0, parede_topo, x1 - x0, 2, "#5a3a26")
    c.ret(x0, (parede_topo + base) // 2, x1 - x0, 2, "#5a3a26")
    for x in range(x0, x1 - 9, 18):
        c.linha(x + 1, (parede_topo + base) // 2 - 1, x + 9, parede_topo + 2, "#5a3a26")
    # Empena: triângulo de reboco e o telhado inclinado por cima.
    for y in range(cumeeira, parede_topo):
        t = (y - cumeeira) / (parede_topo - cumeeira)
        meia = t * (x1 - x0) / 2
        for x in range(int(cx - meia), int(cx + meia) + 1):
            c.p(x, y, mistura("#bca88e", "#6e6070", (x - x0) / (x1 - x0)))
    c.ret(cx - 1, cumeeira + 3, 2, parede_topo - cumeeira - 3, "#5a3a26")
    for y in range(cumeeira - 3, parede_topo + 3):
        t = (y - cumeeira + 3) / (parede_topo - cumeeira + 6)
        meia = t * (x1 - x0) / 2 + 5
        for lado in (-1, 1):
            for k in range(5):
                x = cx + lado * (meia - k)
                tom = tons_telhado[0] if lado < 0 else tons_telhado[1]
                if (y + k) % 3 == 0:
                    tom = tons_telhado[2]
                c.p(x, y, tom)
    # Janelas acesas com caixilho em cruz, venezianas e floreira.
    jy = parede_topo + 6
    for jx in (int(x0 + (x1 - x0) * f) for f in janelas):
        c.ret(jx - 4, jy - 1, 2, 11, "#3e6a5a")
        c.ret(jx + 7, jy - 1, 2, 11, "#2e5244")
        e.ret(jx - 2, jy, 9, 9, "#ffc068")
        e.ret(jx - 1, jy + 1, 3, 3, "#fff0c8")
        c.ret(jx + 2, jy, 1, 9, "#4a2c1c")
        c.ret(jx - 2, jy + 4, 9, 1, "#4a2c1c")
        c.ret(jx - 3, jy + 9, 11, 2, "#7a4a2a")
        for k in range(10):
            c.p(jx - 3 + k, jy + 8 - (k % 2), ["#f4a7c4", "#ffe07a", "#f07a6a", "#c8a8f8"][k % 4])
            c.p(jx - 3 + k, jy + 9 - (k % 2), "#4a7a3a")
        luzes.append((jx + 2, jy + 10, 18, 0.9, "#ffaa50", 0.45))
    if chamine:
        chx = int(cx + (x1 - x0) * 0.22)
        c.ret(chx, cumeeira + 2, 5, 9, "#7a5a5a")
        c.ret(chx, cumeeira + 2, 1, 9, "#b08a80")
        c.ret(chx - 1, cumeeira + 1, 7, 2, "#4a3438")


# ── A torre nas três horas do dia (páginas internas: Revisão).
def ceu_torre_hora() -> np.ndarray:
    if PERIODO == "manha":
        ceu = ceu_hora([(0, "#2c5cb0"), (34, "#4a86d2"), (66, "#86b6e6"), (88, "#bcd8ee"), (100, "#e2ecf0"), (112, "#f8eedc"),
                        (160, "#f8eedc")],
                       sol=(160, 20, 4, "#fff0c8", 0.3, 95),
                       nuvens=dict(yc=46, esp=46, limiar=0.55, ex=34, ey=9, luz="#ffffff", sombra="#9eb4d6", miolo="#d8e4f2",
                                   lado_luz=-1, luz_dy=-1, forca=0.95), seed=301)
        for (bx, by, abre) in ((330, 34, 1), (340, 30, 0), (348, 36, 1), (262, 44, 0)):
            for (dx, dy) in ((-2, -abre), (-1, 0), (0, 1 - abre), (1, 0), (2, -abre)):
                ceu[by + dy, bx + dx] = hexa("#34405a")
        return ceu
    if PERIODO == "tarde":
        ceu = ceu_hora([(0, "#34408a"), (24, "#6a5a9a"), (52, "#d0807e"), (76, "#ffaa6a"), (92, "#ffcf84"), (104, "#fff0c0"),
                        (160, "#ffe2a8")],
                       sol=(250, 95, 7, "#ffb050", 0.8, 150),
                       nuvens=dict(yc=58, esp=40, limiar=0.55, ex=48, ey=4, luz="#fff0b0", sombra="#a8586e", miolo="#e0806e",
                                   lado_luz=-1, luz_dy=1, forca=0.92), seed=302)
        return ceu
    ceu = ceu_hora([(0, "#03061a"), (34, "#0a1134"), (70, "#17224e"), (98, "#26346a"), (112, "#33437a"), (160, "#33437a")],
                   lua=(238, 22, 6, True),
                   nuvens=dict(yc=64, esp=34, limiar=0.6, ex=50, ey=4, luz="#9aa8dc", sombra="#18204a", miolo="#2a3466",
                               lado_luz=-1, luz_dy=-1, forca=0.8),
                   estrelas=300, seed=303)
    return ceu


def nevoa(m: "Montagem", y0: float, y1: float, cor, forca: float, seed: int, x0: float = 0) -> None:
    """Faixa de névoa no fundo do vale (por cima do que já está montado), mais densa no meio da faixa."""
    yy = _GYS / ESC
    meio, meia = (y0 + y1) / 2, (y1 - y0) / 2
    k = np.clip(1 - np.abs(yy - meio) / meia, 0, 1) ** 1.5
    n = ampliar(ruido(seed, 40, 5)[:, :, None])[:, :, 0]
    k = k * (0.45 + 0.75 * n) * suave_np(x0 - 40, x0 + 40, _GXS / ESC) * forca
    m.img = m.img * (1 - k[:, :, None]) + hexa(cor) * k[:, :, None]


def suave_np(a: float, b: float, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def mapa_sol(cor, forca: float, sombra: np.ndarray, sombra_k: float = 0.8) -> np.ndarray:
    """Luz do sol (ou da lua) por pixel em 3x, apagada onde cai a sombra projetada."""
    s = desfocar(ampliar(sombra[:, :, None]), 2)[:, :, 0]
    return (1 - s * sombra_k)[:, :, None] * hexa(cor) * forca


def montar_torre_hora(ceu, longe, meio_c, e_longe, campo, paralelos, objetos, predios, emiss, emiss_p, emiss_rel,
                      emiss_amp, vagalumes, frente, luzes, amp) -> Image.Image:
    P = PERIODO
    rampas_longe = {"manha": [(0, "#56709e"), (0.6, "#7a92bc"), (1, "#c4d4ea")],
                    "tarde": [(0, "#52284c"), (0.55, "#763a5e"), (1, "#ffa888")],
                    "noite": [(0, "#10162e"), (0.6, "#1c2650"), (1, "#56669e")]}
    rampas_meio = {"manha": [(0, "#304a5c"), (0.45, "#4a6a76"), (0.8, "#7e9aa2"), (1, "#bccabc")],
                   "tarde": [(0, "#1c1226"), (0.5, "#321e3a"), (0.85, "#6a3a54"), (1, "#c86a64")],
                   "noite": [(0, "#080c22"), (0.5, "#121a3a"), (1, "#4a5a92")]}
    remapear(longe, rampas_longe[P], 0.12)
    remapear(meio_c, rampas_meio[P], 0.3)
    # Sombras projetadas no chão: a torre, as casas e a ampulheta. De manhã o sol vem do alto à esquerda (sombra curta
    # para a direita); à tarde está baixo atrás da colina (sombra comprida vindo para a frente); à noite, a lua.
    a = predios.c[:, :, 3]
    comp, cis = {"manha": (0.28, 0.75), "tarde": (0.55, 0.55), "noite": (0.22, 0.35)}[P]
    sombra = np.zeros((H, W), dtype=np.float32)
    for (xa, xb, base) in ((368, 434, 142), (326, 372, 133), (434, W, 140), (amp[0] - 20, amp[0] + 21, amp[1])):
        recorte = np.zeros_like(a)
        recorte[:int(base), xa:xb] = a[:int(base), xa:xb]
        sombra = np.maximum(sombra, sombra_projetada(recorte, base, comp, cis))
    sombra *= (_YS > 120)

    m = Montagem(ceu)
    m.camada(longe, 1.8)
    m.camada(meio_c, 0.9)
    if P == "noite":
        m.emissivo(e_longe, 0.3, halo=1.0)
    elif P == "tarde":
        m.emissivo(e_longe, 0.3, halo=0.3)
    m.camada(campo, 0.3)
    if P == "manha":
        nevoa(m, 99, 115, "#dce6f0", 0.42, 311, x0=120)
    elif P == "tarde":
        nevoa(m, 100, 114, "#ffc89a", 0.35, 312, x0=120)
    else:
        nevoa(m, 100, 116, "#3a4a80", 0.45, 313, x0=120)
    m.camada(paralelos)
    m.camada(objetos)
    m.camada(predios)
    if P == "manha":
        m.camada(apagar(emiss, objetos, aceso=0.0))
        m.camada(apagar(emiss_p, predios, aceso=0.0))
        m.camada(emiss_rel)
        m.iluminar("#aab4d0", [(amp[0], amp[1] - 18, 30, 0.8, "#ffc860", 0.15)],
                   mapa=mapa_sol("#fff0d4", 0.62, sombra, 0.85))
        m.emissivo(emiss_amp, 0, halo=0.12)
        # Raios do sol da manhã atravessando as nuvens.
        ceu_claro = np.clip((m.img.mean(2) - 0.8) * 3, 0, 1) * (1 - m.solido)
        raios = raios_radiais(ceu_claro, (168, 22), alcance=0.7)
        m.somar(desfocar(raios[:, :, None], 6)[:, :, 0], "#fff4d8", 0.2)
        m.camada(frente, 6, escurecer=0.62)
        return m.acabar("#fff0d4", "#24366a", esquerda=0.42, centro_v=(0.62, 0.5), contraste=1.1, bloom=0.3)
    if P == "tarde":
        m.camada(apagar(emiss, objetos, vidro=("#3a2430", "#a8605a", "#ffd8a0")))
        m.camada(apagar(emiss_p, predios, vidro=("#3a2430", "#a8605a", "#ffd8a0"), aceso=0.3))
        m.camada(emiss_rel)
        poente = [(252, 92, 230, 0.4, "#ff9a5a", 0.3)]
        janelas = [l[:5] + (l[5] * 0.25,) for l in luzes]
        m.iluminar("#8a6e8e", janelas + poente, mapa=mapa_sol("#ffb470", 0.62, sombra, 0.9))
        m.emissivo(emiss_amp, 0, halo=0.25)
        ceu_claro = np.clip((m.img.mean(2) - 0.6) * 2, 0, 1) * (1 - m.solido) * (_GYS < 108 * ESC)
        raios = raios_radiais(ceu_claro, (252, 89), alcance=0.75)
        m.somar(desfocar(raios[:, :, None], 6)[:, :, 0], "#ffb070", 0.75)
        m.camada(frente, 6, escurecer=0.42)
        return m.acabar("#ffcf8a", "#3a1e4e", esquerda=0.42, centro_v=(0.62, 0.55), bloom=0.55)
    lua_mapa = mapa_sol("#7a8ad0", 0.2, sombra, 0.9)
    fortes = [l[:5] + (l[5] * 1.2,) for l in luzes]
    m.iluminar("#2e3468", fortes + [(238, 22, 260, 0.6, "#6a7ac8", 0.12)], mapa=lua_mapa)
    m.emissivo(emiss, 0, halo=1.1)
    m.emissivo(emiss_p, 0, halo=0.8)
    m.emissivo(emiss_rel, 0, halo=0.18)
    m.emissivo(emiss_amp, 0, halo=0.4)
    m.emissivo(vagalumes, 0, halo=1.4)
    m.camada(frente, 6, escurecer=0.3)
    return m.acabar("#ffd8a8", "#121848", esquerda=0.42, centro_v=(0.66, 0.55))


def cena_torre() -> Image.Image:
    luzes: list = []
    if PERIODO is None:
        ceu = gradiente([(0, "#090c26"), (28, "#1a1d4c"), (58, "#43306a"), (80, "#9a4c70"), (94, "#e07c64"),
                         (104, "#ffb070"), (116, "#ffd49a"), (160, "#ffd49a")])
        # Brilho do poente atrás das colinas.
        d = np.hypot((_XS - 268) / 150, (_YS - 108) / 40)
        ceu += np.exp(-d * d * 1.5)[:, :, None] * hexa("#ff9a6a") * 0.35
        # Nuvens finas em faixas, acesas por baixo.
        nv = ruido(11, 46, 4) * 0.7 + ruido(12, 12, 2) * 0.3
        for y in range(40, 98):
            for x in range(W):
                v = nv[y, x] - 0.56 - abs(y - 74) / 90
                if v > 0:
                    k = min(1, v * 7) * 0.85
                    t = (y - 40) / 58
                    cor = mistura("#4a3070", "#e88a80", t)
                    if nv[min(H - 1, y + 2), x] - 0.56 - abs(y + 2 - 74) / 90 < 0:
                        cor = mistura("#d8708a", "#ffd0a0", t)
                    ceu[y, x] = ceu[y, x] * (1 - k) + cor * k
        # Estrelas (mais no alto) e a lua crescente perto da divisa do texto.
        g = np.random.default_rng(5)
        for _ in range(170):
            x, y = int(g.random() * W), int(g.random() ** 1.7 * 70)
            b = (0.3 + g.random() * 0.7) * (1 - y / 80)
            ceu[y, x] = np.minimum(1, ceu[y, x] + b)
            if b > 0.8:
                for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= x + dx < W and 0 <= y + dy < H:
                        ceu[y + dy, x + dx] = np.minimum(1, ceu[y + dy, x + dx] + b * 0.35)
        # Aura dourada atrás do castelo da prova (o destino da estrada).
        ceu += np.exp(-(((_XS - 286) / 26) ** 2 + ((_YS - 66) / 22) ** 2))[:, :, None] * hexa("#ffcf80") * 0.22
        mx, my = 246, 22
        ceu += np.exp(-((_XS - mx) ** 2 + (_YS - my) ** 2) / 140)[:, :, None] * hexa("#b8a8ff") * 0.25
        for y in range(my - 8, my + 9):
            for x in range(mx - 8, mx + 9):
                if math.hypot(x - mx, y - my) < 6.5 and math.hypot(x - mx - 3, y - my + 2) > 5.2:
                    ceu[y, x] = hexa("#fff4d8") if math.hypot(x - mx, y - my) < 5.5 else hexa("#e8d8c0")
    else:
        ceu = ceu_torre_hora()

    # ── Montanhas ao longe (enevoadas).
    longe = Camada()
    xs = np.arange(W)
    crista = 86 + 6 * np.sin(xs / 37) + 4 * np.sin(xs / 13 + 1) + ruido(14, 6)[0] * 4 - 10 * np.exp(-((xs - 150) / 60) ** 2)
    for x in range(W):
        for y in range(int(crista[x]), H):
            t = min(1, (y - crista[x]) / 30)
            cor = mistura("#9a6a96", "#5e4a7a", t)
            if y - crista[x] < 1.5 and (crista[max(0, x - 1)] > crista[x]):
                cor = hexa("#e0a0a8")
            longe.p(x, y, cor)
    # ── A colina do castelo e as colinas do meio, com aldeias e bosques.
    meio_c = Camada()
    colina = 102 + 3 * np.sin(xs / 23) + 2 * np.sin(xs / 7) - 30 * np.exp(-((xs - 286) / 30) ** 2) - 8 * np.exp(-((xs - 90) / 50) ** 2)
    n = ruido(15, 5)
    for x in range(W):
        for y in range(int(colina[x]), H):
            t = min(1, (y - colina[x]) / 20)
            base_c = mistura("#5a4a7a", "#3a3058", t)
            if n[y, x] > 0.62:
                base_c = base_c * 0.85
            if y - colina[x] < 1:
                base_c = mistura("#c08aa0", "#5a4a7a", 0.3 if x < 290 else 0.8)
            meio_c.p(x, y, base_c)
    # Pinheirinhos na crista.
    g = np.random.default_rng(16)
    for _ in range(90):
        x = int(g.random() * W)
        if 262 < x < 312:
            continue
        y0 = colina[x] + 2 + g.random() * 6
        alt = 3 + int(g.random() * 5)
        for j in range(alt):
            meia = j // 2
            for dx in range(-meia, meia + 1):
                meio_c.p(x + dx, y0 - alt + j, "#2e2648" if dx >= 0 else "#46386a")
    # O castelo da prova no alto da colina.
    kx, kb = 286, int(colina[286]) + 3
    # Muralha com ameias, torres de telhado cônico, a torre de menagem e janelinhas acesas.
    meio_c.ret(kx - 15, kb - 8, 31, 9, "#5a4a72")
    meio_c.ret(kx - 15, kb - 8, 2, 9, "#a87a98")
    meio_c.ret(kx + 10, kb - 8, 6, 9, "#3e3258")
    for k in range(kx - 15, kx + 16, 2):
        meio_c.p(k, kb - 9, "#5a4a72")
    for (tx, larg, alt) in ((kx - 14, 5, 15), (kx - 4, 8, 24), (kx + 7, 5, 13), (kx + 13, 4, 10)):
        meio_c.ret(tx, kb - alt, larg, alt, "#544470")
        meio_c.ret(tx + larg - 2, kb - alt, 2, alt, "#3a2e56")
        meio_c.ret(tx, kb - alt, 1, alt, "#d89aa8")
        for k in range(larg // 2 + 2):  # telhado cônico: largo embaixo, ponta em cima
            yk = kb - alt - 1 - k * 2
            meio_c.ret(tx - 1 + k, yk - 1, larg + 2 - 2 * k, 2, "#3a3060")
            meio_c.ret(tx + larg // 2, yk - 1, larg // 2 + 1 - k, 2, "#2a2448")
            meio_c.p(tx - 1 + k, yk - 1, "#b07a90")
        meio_c.p(tx + larg // 2, kb - alt - 3 - (larg // 2 + 2) * 2, "#3a3060")
    meio_c.ret(kx - 1, kb - 5, 3, 5, "#1e1830")
    meio_c.ret(kx, kb - 37, 1, 7, "#2a2238")
    meio_c.ret(kx + 1, kb - 37, 5, 2, "#e04a3a")
    meio_c.ret(kx + 1, kb - 35, 3, 1, "#a02a2a")
    e_longe = Camada()
    for (wx, wy) in ((kx - 1, kb - 19), (kx + 1, kb - 19), (kx, kb - 13), (kx - 12, kb - 11), (kx + 9, kb - 9), (kx - 7, kb - 4),
                     (kx + 5, kb - 4), (kx + 14, kb - 6)):
        e_longe.ret(wx, wy, 1, 2, "#ffd070")
        e_longe.p(wx, wy, "#fff0b0")
    e_longe.ret(kx - 1, kb - 4, 3, 4, "#ffb050", 0.9)
    luzes.append((kx, kb - 10, 14, 1.0, "#ffb060", 0.4))
    # Caminho em zigue-zague subindo a colina até o portão.
    for (a, b) in (((270, 104), (291, 96)), ((291, 96), (276, 90)), ((276, 90), (287, kb - 1))):
        meio_c.linha(a[0], a[1], b[0], b[1], "#9a7a8a")
    # Luzinhas de sítios nas colinas (à direita da área do texto).
    for (wx, wy) in ((214, 104), (232, 108), (330, 103), (352, 106), (186, 106)):
        e_longe.p(wx, wy, "#ffc060", 0.85)

    # ── Campo: lavouras em retalhos, a estrada sinuosa e o gramado da praça.
    campo = Camada()
    n1, n2 = ruido(21, 9), ruido(22, 3)
    for y in range(100, H):
        prof = (y - 100) / 60
        for x in range(W):
            linha_campo = colina[x] + 4
            if y < linha_campo:
                continue
            cel = (int((x + y * 2.1) / (16 + prof * 40)), int(y / (4 + prof * 12)))
            k = hash01(cel[0], cel[1], 9)
            tons = [("#5e7a4c", "#4a6640"), ("#7a7a46", "#646436"), ("#4a6e50", "#3a5a42"), ("#6a8a52", "#567446")][int(k * 4)]
            v = n1[y, x] * 0.7 + n2[y, x] * 0.3
            cor = hexa(tons[0] if v > 0.5 else tons[1])
            if prof > 0.45:  # perto: grama da praça
                cor = hexa("#5e8a48" if v > 0.6 else "#4c7a3e" if v > 0.42 else "#3e6834")
            elif (x + int(y * 2.1)) % int(16 + prof * 40) == 0:  # cercas vivas entre os retalhos
                cor = hexa("#2e4430")
            campo.p(x, y, cor)
    # Árvores redondas espalhadas pelos campos.
    g = np.random.default_rng(23)
    for _ in range(46):
        x = g.random() * W
        y = 104 + g.random() * 16
        if 300 < x < 480 and y > 110:
            continue
        r = 1.5 + (y - 100) * 0.12
        campo.disco(x, y - r, r, ("#5e7a50", "#3e5a40", "#283c30"))
    # Estrada sinuosa: do primeiro plano até o pé da colina do castelo.
    estrada = curva([(268, 104), (282, 108), (246, 116), (296, 126), (256, 141), (280, 163)], 120)
    for i, (x, y) in enumerate(estrada[::-1]):
        larg = 1.0 + (y - 100) * 0.42
        for dx in range(int(-larg - 1), int(larg + 2)):
            for dy in (0, 1):
                px, py = x + dx, y + dy
                u = abs(dx) / max(larg, 0.5)
                if u > 1:
                    continue
                k = hash01(int(px), int(py), 31)
                cor = mistura("#c8a070", "#9a7650", k * 0.8 + u * 0.5)
                if larg > 6 and 0.28 < u < 0.42:
                    cor = mistura("#8a6644", "#6e5034", k)
                if u > 0.86:
                    cor = mistura("#7a6040", "#506038", k)
                campo.p(px, py, cor)
    g = np.random.default_rng(32)
    for (x, y) in estrada[200::7]:  # pedrinhas na terra
        larg = 1.0 + (y - 100) * 0.42
        if larg > 4:
            px = x + (g.random() - 0.5) * larg * 1.6
            campo.p(px, y + g.random() * 2, "#e0c8a0")
            campo.p(px + 1, y + 1 + g.random() * 2, "#6a5038")
    # Lampiões ao longo da estrada, alternando os lados.
    objetos = Camada()
    emiss = Camada()
    for i, frac in enumerate((0.1, 0.24, 0.4, 0.58, 0.77)):
        j = int(frac * (len(estrada) - 1))
        x, y = estrada[j]
        larg = 1.0 + (y - 100) * 0.42
        lado = -1 if i % 2 else 1
        s = (y - 98) / 62
        lampiao(objetos, emiss, x + lado * (larg + 2 + 3 * s), y + 1, s, luzes)

    # ── A praça de paralelepípedos na frente da torre.
    praca = ((_XS - 410) / 130) ** 2 + ((_YS - 168) / 30) ** 2 < 1
    paralelos = Camada()
    for y in range(126, H):
        prof = (y - 120) / 40
        alt = 2 + int(prof * 3)
        fi = (y - 126) // alt
        larg = 4 + int(prof * 5)
        for x in range(280, W):
            if not praca[y, x]:
                continue
            off = (fi % 2) * (larg // 2)
            emx, emy = (x + off) % larg, (y - 126) % alt
            k = hash01((x + off) // larg, fi, 41)
            if emx == larg - 1 or emy == alt - 1:
                cor = "#3a3040"
            elif emy == 0 or emx == 0:
                cor = "#c0aeb0" if k > 0.3 else "#a8969c"
            else:
                cor = ["#8a7a84", "#9a8890", "#7a6c78", "#a69498"][int(k * 4)]
            paralelos.p(x, y, cor)
    borda_praca = praca & ~(np.roll(praca, 2, 0) & np.roll(praca, -2, 1) & np.roll(praca, 2, 1))
    paralelos.mascara(borda_praca.astype(np.float32) * (_YS > 126), "#5a4a50")

    # ── Casas, torre, ampulheta e canteiros.
    predios = Camada()
    emiss_p = Camada()
    emiss_rel = Camada()
    emiss_amp = Camada()
    casa(predios, emiss_p, 434, 492, 140, 104, 80, luzes, 51)
    casa(predios, emiss_p, 326, 370, 133, 108, 92, luzes, 52, chamine=True, tons_telhado=("#7a5a6e", "#5a4058", "#3e2a40"), janelas=(0.5, 0.76))
    luzes += torre(predios, emiss_p, 398, emiss_rel)
    amp_x, amp_b = (322, 152) if PERIODO is None else (307, 150)  # nas páginas, o chão de x 330-380 fica livre
    luzes += ampulheta(predios, emiss_amp, amp_x, amp_b)
    # Canteiros de flores na borda da praça e vasos junto à torre.
    g = np.random.default_rng(61)
    flores = ["#f4a7c4", "#ffe07a", "#c8a8f8", "#ffffff", "#f07a6a", "#ff9ac0"]
    for _ in range(520):
        ang = g.random() * math.pi
        x = 410 - math.cos(ang) * 132 * (1 + g.random() * 0.12)
        y = 168 - math.sin(ang) * 31 * (1 + g.random() * 0.14)
        if y > H or x < 270:
            continue
        predios.p(x, y + 1, "#3e6a34")
        predios.p(x, y + 2, "#2e5228")
        if g.random() < 0.55:
            predios.p(x, y, flores[int(g.random() * len(flores))])
        else:
            predios.p(x, y, "#5a8a44")
    for (vx, vy) in ((374, 141), (424, 141), (350, 146), (456, 148)) if PERIODO is None else ((424, 141), (456, 148)):
        predios.ret(vx - 3, vy - 4, 7, 5, "#a8583a")
        predios.ret(vx - 3, vy - 4, 7, 1, "#d08060")
        predios.ret(vx + 2, vy - 3, 1, 4, "#6a3020")
        predios.disco(vx, vy - 7, 4, ("#7aa85a", "#4e8040", "#2e5a2e"))
        for k in range(6):
            predios.p(vx - 3 + hash01(vx, k) * 7, vy - 10 + hash01(k, vy) * 6, flores[k % 6])

    # Varais de luzinhas entre a torre e as casas.
    for (p0, p1) in (((427, 92), (466, 100)), ((371, 94), (336, 106))):
        n = 18
        for i in range(n + 1):
            t = i / n
            x = p0[0] + (p1[0] - p0[0]) * t
            y = p0[1] + (p1[1] - p0[1]) * t + math.sin(t * math.pi) * 6
            predios.p(x, y, "#2a2030")
            if i % 3 == 1:
                emiss_p.p(x, y + 1, ["#ffd070", "#ff9a70", "#fff0b0", "#a8e0ff"][i % 4])
                luzes.append((x, y + 1, 7, 1.0, "#ffc070", 0.18))
    # Cerca de madeira acompanhando a estrada, do lado de fora da curva.
    for i in range(140, len(estrada) - 20, 26):
        x, y = estrada[i]
        larg = 1.0 + (y - 100) * 0.42
        s_ = (y - 98) / 62
        fx_ = x - larg - 5 - 6 * s_
        alt = 3 + 9 * s_
        predios.ret(fx_, y - alt, max(1, round(2 * s_)), alt, "#5a3a26")
        predios.p(fx_, y - alt, "#a07850")
        if i + 26 < len(estrada) - 20:
            x2, y2 = estrada[i + 26]
            larg2 = 1.0 + (y2 - 100) * 0.42
            s2 = (y2 - 98) / 62
            for frac in (0.3, 0.7):
                predios.linha(fx_, y - alt * frac, x2 - larg2 - 5 - 6 * s2, y2 - (3 + 9 * s2) * frac, "#7a5234")
    # Lampiões da praça.
    lampiao(predios, emiss_p, 462, 152, 0.95, luzes)
    lampiao(predios, emiss_p, 298 if PERIODO is None else 240, 158, 1.0, luzes)
    # Passarinhos voltando para a torre.
    for (bx, by) in ((440, 30), (452, 24), (433, 21), (300, 40)):
        for (dx, dy) in ((-2, -1), (-1, 0), (0, 1), (1, 0), (2, -1)):
            predios.p(bx + dx, by + dy, "#1a1428")

    # ── Primeiro plano: capim e flores bem perto da câmera (desfocados), vaga-lumes.
    frente = Camada()
    g = np.random.default_rng(71)
    for _ in range(260):
        x = g.random() * W
        if 150 < x < 420 and g.random() < 0.85:
            continue
        alt = 6 + g.random() * 16
        inc = (g.random() - 0.5) * 0.6
        for j in range(int(alt)):
            frente.p(x + inc * j, H - 1 - j, "#4a7a3a" if j > alt * 0.5 else "#2e4e2a")
    for (cx_, cy_, r) in ((-4, 168, 26), (40, 172, 18), (470, 170, 20)):
        frente.disco(cx_, cy_, r, ("#5a8a48", "#3e6a36", "#26462a"))
    for _ in range(40):
        x = 420 + g.random() * 60
        y = H - g.random() * 14
        frente.ret(x, y, 2, 2, flores[int(g.random() * 6)])
    vagalumes = Camada()
    for _ in range(26):
        x = 230 + g.random() * 250
        y = 96 + g.random() * 58
        vagalumes.p(x, y, "#f0ff9a", 0.6 + g.random() * 0.4)

    if PERIODO is not None:
        return montar_torre_hora(ceu, longe, meio_c, e_longe, campo, paralelos, objetos, predios, emiss, emiss_p,
                                 emiss_rel, emiss_amp, vagalumes, frente, luzes, (amp_x, amp_b))
    # ── Montagem.
    m = Montagem(ceu)
    m.camada(longe, 1.8)
    m.camada(meio_c, 0.9)
    m.emissivo(e_longe, 0.3, halo=0.8)
    m.camada(campo, 0.3)
    m.camada(paralelos)
    m.camada(objetos)
    m.camada(predios)
    # Ambiente do anoitecer (frio) e a luz do poente vindo do horizonte, à esquerda da torre.
    luzes_poente = [(268, 96, 220, 0.4, "#ff8a6a", 0.28)]
    m.iluminar("#50508e", luzes + luzes_poente)
    m.emissivo(emiss, 0, halo=0.9)
    m.emissivo(emiss_p, 0, halo=0.6)
    m.emissivo(emiss_rel, 0, halo=0.12)
    m.emissivo(emiss_amp, 0, halo=0.3)
    # Feixes do poente subindo atrás das colinas.
    ceu_claro = np.clip((m.img.mean(2) - 0.55) * 2, 0, 1) * (1 - m.solido) * (_GYS < 108 * ESC)
    raios = raios_radiais(ceu_claro, (270, 112), alcance=0.6)
    m.somar(desfocar(raios[:, :, None], 6)[:, :, 0], "#ffb080", 0.5)
    m.emissivo(vagalumes, 0, halo=1.2)
    m.camada(frente, 6, escurecer=0.35)
    return m.acabar("#ffd8a8", "#1e1a48", esquerda=0.42, centro_v=(0.66, 0.55))


# ═══════════════════════════════ 2. O baú do tesouro ═══════════════════════════════
def relevo(seed: int, n: int = 160, esticar: float = 1.0, fino: float = 0.18, y0: float = 0, y1: float = H,
           torcer: float = 0.0) -> np.ndarray:
    """Mapa de altura de rocha em blocos: células de Voronoi abauladas (cada uma uma pedra), fendas entre elas e
    um ruído fino por cima."""
    g = np.random.default_rng(seed)
    px = g.random(n) * (W + 40) - 20
    py = y0 + g.random(n) * (y1 - y0 + 20) - 10
    f1 = np.full((H, W), 1e9, dtype=np.float32)
    f2 = np.full((H, W), 1e9, dtype=np.float32)
    alt = np.zeros((H, W), dtype=np.float32)
    alturas = g.random(n).astype(np.float32)
    # Coordenadas torcidas por ruído: as bordas das pedras ficam orgânicas, não poligonais.
    xs = _XS + (ruido(seed + 3, 9) - 0.5) * torcer * 2 + (ruido(seed + 4, 3) - 0.5) * torcer * 0.25
    ys = _YS + (ruido(seed + 5, 9) - 0.5) * torcer * 2 + (ruido(seed + 6, 3) - 0.5) * torcer * 0.25
    for i in range(n):
        d = np.sqrt(((xs - px[i]) / esticar) ** 2 + (ys - py[i]) ** 2)
        menor = d < f1
        f2 = np.where(menor, f1, np.minimum(f2, d))
        alt = np.where(menor, alturas[i], alt)
        f1 = np.where(menor, d, f1)
    borda = np.clip((f2 - f1) / 3.2, 0, 1)
    h = np.sqrt(borda) * (0.6 + 0.4 * alt) + ruido(seed + 1, 3) * fino + ruido(seed + 2, 11) * 0.25
    return h


def rocha_iluminada(h: np.ndarray, luzes, rampa, forca: float = 7.0, base: float = 0.0) -> np.ndarray:
    """Pinta a rocha em tons de pixel art a partir das normais do relevo, virada para as luzes (luz rasante)."""
    gy, gx = np.gradient(h)
    nx, ny, nz = -gx * forca, -gy * forca, np.ones_like(h)
    n = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / n, ny / n, nz / n
    difusa = np.zeros_like(h) + base
    for (lx, ly, lz, peso) in luzes:
        vx, vy, vz = lx - _XS, ly - _YS, np.full_like(h, lz)
        d = np.sqrt(vx * vx + vy * vy + vz * vz)
        difusa += np.clip((nx * vx + ny * vy + nz * vz) / d, 0, 1) * peso
    # Pontilhado ordenado (Bayer 4x4) entre os tons, como na pixel art.
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16 - 0.5
    d = np.tile(bayer, (H // 4 + 1, W // 4 + 1))[:H, :W]
    nivel = np.clip(difusa * (len(rampa) - 1) + d * 0.9, 0, len(rampa) - 1)
    idx = np.round(nivel).astype(int)
    cores = np.array([hexa(c) for c in rampa])
    return cores[idx]


def moeda(c: Camada, x: float, y: float, k: float) -> None:
    """Uma moeda deitada (3 x 2) com brilho e borda escura; k varia o tom."""
    x, y = int(round(x)), int(round(y))
    c.p(x - 1, y, "#e8b23a" if k > 0.5 else "#d89a2a")
    c.p(x, y, "#ffe27a" if k > 0.3 else "#f4c64a")
    c.p(x + 1, y, "#c8861e")
    c.p(x - 1, y + 1, "#a8661a")
    c.p(x, y + 1, "#b8761c")
    c.p(x + 1, y + 1, "#7a4612")
    if k > 0.85:
        c.p(x - 1, y, "#fff6c0")


def joia(c: Camada, x: float, y: float, tipo: int, tam: int = 2) -> None:
    """Pedra lapidada: losango com faceta clara em cima à esquerda e contorno escuro."""
    cores = [("#ffd0d8", "#e8304a", "#8a1028", "#4a0818"), ("#d0ffe0", "#2ec86a", "#0e7a3a", "#04401c"),
             ("#d8e8ff", "#3a7aff", "#1a3aa8", "#0a1a5a"), ("#f0d8ff", "#a858e8", "#5a2a9a", "#2a104a"),
             ("#ffffff", "#c8f0ff", "#7ab8d8", "#3a6a8a")][tipo % 5]
    x, y = int(round(x)), int(round(y))
    for dy in range(-tam - 1, tam + 2):
        meia = tam + 1 - abs(dy)
        for dx in range(-meia, meia + 1):
            borda = abs(dx) == meia or abs(dy) == tam + 1
            if borda:
                c.p(x + dx, y + dy, cores[3])
            elif dx + dy < -tam * 0.5:
                c.p(x + dx, y + dy, cores[0])
            elif dx + dy < tam * 0.6:
                c.p(x + dx, y + dy, cores[1])
            else:
                c.p(x + dx, y + dy, cores[2])
    c.p(x - max(1, tam // 2), y - max(1, tam // 2), "#ffffff")


def monte_de_moedas(c: Camada, cx: float, base: float, rx: float, alt: float, n: int, seed: int) -> None:
    """Monte em domo de moedas empilhadas (de trás para a frente), com algumas em pé."""
    g = np.random.default_rng(seed)
    pts = []
    for _ in range(n):
        u = g.random() * 2 - 1
        topo = base - alt * (1 - u * u) ** 0.8
        y = topo + g.random() ** 1.6 * (base - topo)
        pts.append((cx + u * rx, y, g.random()))
    pts.sort(key=lambda t: t[1])
    # fundo do monte (sombra entre as moedas)
    for x in range(int(cx - rx), int(cx + rx) + 1):
        u = (x - cx) / rx
        if abs(u) > 1:
            continue
        topo = base - alt * (1 - u * u) ** 0.8 + 1.5
        for y in range(int(topo), int(base) + 1):
            c.p(x, y, "#8a5214" if (x + y) % 3 else "#6a3a10")
    for (x, y, k) in pts:
        moeda(c, x, y, k)
        if k > 0.97:
            c.ret(x, y - 3, 1, 3, "#ffe27a")
            c.p(x + 1, y - 2, "#a8661a")


# ── O baú nas três horas do dia (páginas internas: Planos e Assinatura). A caverna não tem janela: a hora entra por
# uma fenda no teto, com um pedaço de céu, raízes penduradas e o feixe de luz que pousa no chão livre do mascote.
FENDA = (300, 4)


def fenda_bau() -> tuple[Camada, Camada]:
    """Devolve (céu visto pela fenda, que não recebe luz; borda de rocha com raízes e folhas, que recebe)."""
    ceu_f, borda = Camada(), Camada()
    cores = {"manha": ("#8cc4f0", "#e8f4ff"), "tarde": ("#ff9a50", "#ffe0a0"), "noite": ("#1a2a5a", "#4a5a9a")}[PERIODO]
    fx, fy = FENDA
    for x in range(fx - 19, fx + 20):
        u = (x - fx) / 19
        meia = 5.5 * (1 - u * u) ** 0.8 + 0.7 * math.sin(x * 1.3)
        y0 = 3 + 1.5 * math.sin(x * 0.4)
        for y in range(int(y0 - meia), int(y0 + meia) + 1):
            if 0 <= y < H:
                k = abs(y - y0) / max(meia, 0.5)
                ceu_f.p(x, y, mistura(cores[1], cores[0], k))
        borda.p(x, int(y0 + meia) + 1, "#5a6a7a")
        borda.p(x, int(y0 + meia) + 2, "#2a3446")
    if PERIODO == "noite":
        for (sx, sy) in ((fx - 8, 2), (fx + 4, 4), (fx + 11, 1), (fx - 2, 0)):
            ceu_f.p(sx, sy, "#ffffff")
        ceu_f.disco(fx + 7, 4, 2.2, ("#fffaf0", "#e8e8f4", "#c8c8dc"))  # a lua espiando
    elif PERIODO == "manha":
        for (cx_, cy_) in ((fx - 9, 4), (fx - 5, 3), (fx + 6, 6)):
            ceu_f.disco(cx_, cy_, 2.2, ("#ffffff", "#f4f8ff", "#d0e0f4"))
    else:
        ceu_f.disco(fx - 6, 6, 3, ("#fffbe0", "#fff0b0", "#ffd080"))  # o sol baixo, quase de lado
    # raízes e trepadeiras caindo pela fenda, com folhinhas
    g = np.random.default_rng(181)
    for k in range(7):
        x = fx - 12 + k * 4 + g.random() * 2
        comp = 6 + g.random() * 16
        for j in range(int(comp)):
            xx = x + math.sin(j * 0.45 + k) * 1.2
            borda.p(xx, 6 + j, "#4a3a2a" if j % 3 else "#6a5238")
            if j % 4 == 2 and k % 2 == 0:
                borda.p(xx + 1, 6 + j, "#4e8a3a")
                borda.p(xx - 1, 7 + j, "#6aa84a")
    return ceu_f, borda


def tochas_bau(arco: Camada, bx: int) -> tuple[Camada, list]:
    """Duas tochas de ferro nas pilastras do arco: à noite acesas, à tarde com a chama baixa, de manhã apagadas
    (pavio preto com um fio de fumaça)."""
    fogo = Camada()
    luzes = []
    for x in (bx - 46, bx + 50):
        y = 100
        arco.ret(x - 1, y, 3, 9, "#2a2228")
        arco.ret(x - 1, y, 1, 9, "#5a4a50")
        arco.ret(x - 2, y - 2, 5, 2, "#3a2a2a")
        arco.ret(x + 2, y + 5, 3, 1, "#2a2228")
        if PERIODO == "manha":
            arco.ret(x - 1, y - 4, 3, 2, "#1a1414")
            for j in range(10):
                fogo.p(x + math.sin(j * 0.8) * 1.3, y - 6 - j * 1.4, "#c8c8d8", 0.25 - j * 0.02)
            continue
        alto = 10 if PERIODO == "noite" else 6
        for j in range(alto):
            meia = (alto - j) / alto * (2.8 if PERIODO == "noite" else 2.0)
            for dx in range(int(-meia), int(meia) + 1):
                cor = "#fff4c0" if abs(dx) < meia * 0.4 and j < alto * 0.6 else "#ffb040" if j < alto * 0.8 else "#ff6a20"
                fogo.p(x + dx + (j > alto * 0.6) * 0.5, y - 3 - j, cor)
        forca = 1.0 if PERIODO == "noite" else 0.45
        luzes += [(x, y - 5, 56, 0.9, "#ff9a40", forca), (x, y - 5, 14, 1.0, "#ffd080", forca * 0.7)]
    return fogo, luzes


def montar_bau_hora(fundo, teto, arco, chao, estal, cristais, chao_ouro, bau, em, emis_cr, brilhos, poeira, cogumelos,
                    frente, luzes, bx, bb, fonte) -> Image.Image:
    P = PERIODO
    ceu_f, borda_f = fenda_bau()
    # a fenda abre a faixa de rocha do teto
    buraco = ceu_f.c[:, :, 3] > 0
    teto.c[buraco] = 0
    fogo, luzes_tocha = tochas_bau(arco, bx)
    fx, fy = FENDA
    # onde o feixe pousa no chão: de manhã inclinado, à tarde bem deitado (sol baixo), à noite quase a pino (lua alta)
    pouso, larg_ar, cor_f, forca_f = {"manha": ((368, 150), (5, 22), "#fff0c8", 0.95),
                                      "tarde": ((420, 152), (5, 26), "#ffa850", 0.9),
                                      "noite": ((350, 150), (4, 16), "#9ab0ff", 0.6)}[P]
    m = Montagem(np.zeros((H, W, 3), dtype=np.float32))
    m.camada(fundo, 1.6)
    m.camada(ceu_f, 0, solida=False)
    m.camada(teto, 0.8)
    m.camada(borda_f, 0.4)
    m.camada(arco, 0.7)
    m.camada(chao, 0.3)
    m.camada(estal, 0.5)
    m.camada(cristais)
    m.camada(chao_ouro, luz_k=0.75)
    m.camada(bau, luz_k=0.62)
    # A mancha de luz que o feixe deixa no chão (e na rocha atrás, de leve), como luz que ilumina o que toca.
    yy, xx = _GYS / ESC, _GXS / ESC
    t = np.clip((yy - fy) / (pouso[1] - fy), 0, 1.2)
    centro = fx + (pouso[0] - fx) * t
    larg = larg_ar[0] + (larg_ar[1] - larg_ar[0]) * t
    feixe = np.exp(-((xx - centro) / larg) ** 4 * 1.5)
    mancha = np.exp(-(((xx - pouso[0]) / (larg_ar[1] * 1.1)) ** 2 + ((yy - pouso[1] + 2) / 7) ** 2) * 1.6)
    mapa = (mancha * 1.6 + feixe * 0.3 * (yy > 118))[:, :, None] * hexa(cor_f) * forca_f
    amb = {"manha": "#6e82b8", "tarde": "#5e4a6a", "noite": "#2e3a6e"}[P]
    # a luz do dia que entra rebate no chão claro e acende de leve a rocha em volta do pouso
    rebate = luz_pontual(pouso[0], pouso[1] - 10, 90, 0.6)[:, :, None] * hexa(cor_f) * {"manha": 0.35, "tarde": 0.3, "noite": 0.12}[P]
    tochas = luzes_tocha if P != "manha" else []
    m.iluminar(amb, luzes + tochas + [(142, 140, 60, 0.35, "#5a7ac8", 0.45)], mapa=mapa + rebate)
    # O feixe no ar: volumétrico, com faixas (as raízes recortam a luz) e a poeira dançando.
    faixas = 0.6 + 0.4 * np.sin((xx - centro) * 1.1 + 2) ** 2
    ar = feixe * faixas * np.clip(1.15 - t * 0.55, 0, 1) * (yy > fy)
    m.somar(desfocar(ar[:, :, None], 4)[:, :, 0], cor_f, 0.38 * forca_f)
    m.somar(desfocar(ar[:, :, None], 14)[:, :, 0], cor_f, 0.18 * forca_f)
    g = np.random.default_rng(191)
    for _ in range(900):
        px_, py_ = g.random() * W * ESC, g.random() * H * ESC
        X, Y = int(px_), int(py_)
        k = ar[Y, X] * (0.4 + g.random() * 0.9)
        if k > 0.08 and X < W * ESC - 3 and Y < H * ESC - 3:
            m.img[Y:Y + 2, X:X + 2] += hexa(cor_f) * k * 0.9
    # Raios de luz dourada saindo do baú, em leque (o ouro brilha sozinho a qualquer hora).
    ang = np.arctan2(_GYS - fonte[1] * ESC, _GXS - fonte[0] * ESC)
    r = np.hypot(_GXS - fonte[0] * ESC, (_GYS - fonte[1] * ESC) * 1.2) / ESC
    leque = np.zeros_like(r)
    g = np.random.default_rng(171)
    for _ in range(11):
        a0 = -math.pi / 2 + g.normal(0, 0.5)
        largura = 0.03 + g.random() * 0.07
        leque += np.exp(-((ang - a0) / largura) ** 2) * (0.5 + g.random() * 0.7)
    leque *= np.exp(-r / 85) * np.clip((r - 4) / 12, 0, 1) * (_GYS < (fonte[1] + 6) * ESC)
    m.somar(desfocar(leque[:, :, None], 3)[:, :, 0], "#ffc860", {"manha": 0.35, "tarde": 0.45, "noite": 0.55}[P])
    m.somar(luz_pontual(bx + 2, 108, 34, 0.45), "#ffc858", 0.55)
    m.somar(luz_pontual(bx + 2, 112, 16, 0.6), "#fff0b0", 0.35)
    m.emissivo(em, 0, halo=0.6)
    m.emissivo(emis_cr, 0, halo=0.5)
    m.emissivo(brilhos, 0, halo=0.8)
    m.emissivo(poeira, 0.3, halo=0.6)
    m.emissivo(cogumelos, 0.3, halo={"manha": 0.2, "tarde": 0.5, "noite": 1.0}[P])
    m.emissivo(fogo, 0.3, halo=0.0 if P == "manha" else 1.4)
    m.camada(frente, 5, escurecer=0.6)
    quente = {"manha": "#fff0d0", "tarde": "#ffcf90", "noite": "#ffd8a0"}[P]
    fria = {"manha": "#1e2c58", "tarde": "#2a1a44", "noite": "#0c1434"}[P]
    return m.acabar(quente, fria, esquerda=0.36, centro_v=(0.56, 0.6), contraste=1.08)


def cena_bau() -> Image.Image:
    luzes: list = []
    # centro e base do baú; nas páginas o baú vai para o miolo, à esquerda do chão livre do mascote (x 330-380)
    bx, bb = (336, 140) if PERIODO is None else (262, 140)
    fonte = (bx + 2, 104)
    cristal = (458, 82)
    # ── Paredes da caverna, com relevo virado para o ouro e para os cristais.
    h_parede = relevo(101, 150, esticar=1.4, torcer=9)
    rampa_parede = ["#0a0e1a", "#121a2c", "#1c283e", "#283850", "#384a62", "#4e6078", "#6e7c92"]
    parede = rocha_iluminada(h_parede, [(fonte[0], fonte[1], 26, 1.15), (cristal[0], cristal[1], 22, 0.55), (150, -30, 60, 0.25)],
                             rampa_parede, forca=2.3, base=0.12)
    # Fundo mais escuro longe do baú e no alto (a caverna some no escuro).
    dist = np.hypot((_XS - fonte[0]) / 260, (_YS - fonte[1]) / 140)
    parede *= np.clip(1.2 - dist * 0.6, 0.5, 1)[:, :, None]
    parede *= np.clip(0.55 + _YS / 90, 0, 1)[:, :, None]  # o teto se perde no escuro
    parede *= (0.72 + 0.4 * ruido(105, 34, 10))[:, :, None]  # dobras grandes da rocha
    fundo = Camada()
    fundo.mascara(np.ones((H, W), dtype=np.float32), parede)

    # ── Estalactites do teto (camada do meio).
    teto = Camada()
    g = np.random.default_rng(103)
    x = -6
    while x < W + 6:
        larg = 3 + g.random() * 9
        comp = 8 + g.random() * 30 * (0.5 if 180 < x < 300 else 1)
        topo0 = -2 + g.random() * 6
        for y in range(int(topo0), int(topo0 + comp)):
            t = (y - topo0) / comp
            meia = larg * (1 - t) ** 1.3
            for dx in range(int(-meia), int(meia) + 1):
                lado = dx / max(meia, 0.5)
                para_luz = 1 if x < fonte[0] else -1
                k = lado * para_luz
                cor = "#6a7690" if k > 0.45 else "#3a4660" if k > -0.2 else "#1c2436"
                if hash01(int(x + dx), y, 5) > 0.92:
                    cor = "#5a6a82"
                teto.p(x + dx, y, cor)
        if g.random() < 0.3:  # gota d'água na ponta
            teto.p(x, topo0 + comp + 1, "#9ad8ff")
        x += larg * 1.4 + g.random() * 10
    # faixa de rocha do teto
    for xx in range(W):
        alt = 6 + 5 * math.sin(xx / 17) + 3 * math.sin(xx / 5.3)
        teto.ret(xx, 0, 1, alt, "#1a2232")
        teto.p(xx, alt, "#3a4660")

    # Arco antigo de pedra lavrada no fundo, atrás do baú (a câmara do tesouro), com o nicho escuro por dentro.
    arco = Camada()
    ax, ay, r_in, r_out = bx + 2, 84, 40, 51
    nicho = (elipse_m(ax, ay, r_in, r_in) * (_YS <= ay)) + ((np.abs(_XS - ax) <= r_in) & (_YS > ay) & (_YS < 124))
    arco.mascara(np.clip(nicho, 0, 1), "#070a12", 0.75)
    n_ad = 15
    for y in range(int(ay - r_out - 1), int(ay) + 1):
        for x in range(int(ax - r_out - 1), int(ax + r_out) + 2):
            d = math.hypot(x - ax, y - ay)
            if r_in <= d < r_out:
                ang = math.atan2(ay - y, x - ax)  # 0..pi
                seg = ang / math.pi * n_ad
                junta = abs(seg - round(seg)) < 0.09 * (r_out / max(d, 1))
                fr = (d - r_in) / (r_out - r_in)
                chave = abs(ang - math.pi / 2) < math.pi / n_ad / 2
                if junta:
                    cor = "#141a28"
                elif fr < 0.18:
                    cor = "#8a8aa0"  # face de dentro, virada para o ouro
                elif fr > 0.85:
                    cor = "#242c40"
                else:
                    k = hash01(int(seg), 3)
                    cor = mistura("#5a6680", "#3a4660", k)
                if chave and not junta:
                    cor = mistura(cor, "#a8a0a8", 0.4)
                arco.p(x, y, cor)
    for lado in (-1, 1):  # pilastras
        x0p = ax + lado * r_in if lado > 0 else ax - r_out
        for y in range(int(ay), 124):
            for x in range(int(x0p), int(x0p + (r_out - r_in))):
                fr = (x - x0p) / (r_out - r_in)
                fr = fr if lado > 0 else 1 - fr
                cor = "#8a8aa0" if fr < 0.18 else "#242c40" if fr > 0.85 else ("#4a5670" if (y // 6) % 2 else "#525e78")
                if (y - int(ay)) % 6 == 0:
                    cor = "#141a28"
                arco.p(x, y, cor)
        cap_x = ax + lado * (r_in + (r_out - r_in) / 2)
        arco.ret(cap_x - 7, ay - 1, 14, 3, "#6a7088")
        arco.ret(cap_x - 7, ay - 1, 14, 1, "#a8a8b8")
    # Emblema na pedra-chave: uma estrela de oito pontas gravada.
    for (dx, dy) in ((0, -3), (0, 3), (-3, 0), (3, 0), (-2, -2), (2, 2), (-2, 2), (2, -2), (0, -1), (0, 1), (-1, 0), (1, 0), (0, 0)):
        arco.p(ax + dx, ay - r_in - 5 + dy, "#d8b050" if (dx, dy) != (0, 0) else "#fff0a0")
    # Estalagmites pelo chão.
    estal = Camada()
    estalagmites = ((404, 6, 26), (414, 4, 15), (250, 5, 20), (241, 3, 11), (120, 7, 30), (134, 4, 16), (452, 5, 18))
    if PERIODO is not None:
        estalagmites = ((404, 6, 26), (414, 4, 15), (120, 7, 30), (134, 4, 16), (452, 5, 18), (176, 4, 14))
    for (sx0, larg_s, alt_s) in estalagmites:
        base_y = 126 + (sx0 % 7)
        for y in range(base_y - alt_s, base_y + 2):
            t = (y - (base_y - alt_s)) / alt_s
            meia = larg_s * min(1, t) ** 0.8
            for x in range(int(sx0 - meia), int(sx0 + meia) + 1):
                u = (x - sx0) / max(meia, 0.5) * (1 if sx0 < bx else -1)
                cor = "#8a92aa" if u > 0.4 else "#56607a" if u > -0.3 else "#2a3246"
                if (y + x // 3) % 7 == 0:
                    cor = "#2a3448"
                estal.p(x, y, cor)
    # Cogumelos que brilham fraquinho no canto esquerdo (calmo, só para ter vida).
    cogumelos = Camada()
    g = np.random.default_rng(141)
    for _ in range(9):
        x, y = 70 + g.random() * 110, 132 + g.random() * 16
        estal.ret(x, y - 2, 1, 3, "#8aa0a8")
        cogumelos.ret(x - 1, y - 3, 3, 1, "#5af0d0", 0.8)
        cogumelos.p(x, y - 4, "#b8fff0", 0.8)

    # ── Chão de pedra com relevo, poça d'água à esquerda do baú.
    chao = Camada()
    h_chao = relevo(111, 260, esticar=3.0, y0=115, torcer=5)
    rampa_chao = ["#0c0e16", "#141722", "#1e2230", "#2a2e3c", "#3c3e4c", "#54525e", "#76707a"]
    pedra = rocha_iluminada(h_chao, [(fonte[0], fonte[1] + 10, 18, 1.3), (cristal[0], cristal[1] + 30, 20, 0.4)], rampa_chao, forca=3.0, base=0.22)
    borda_chao = 120 + 3 * np.sin(_XS / 23) + 2 * np.sin(_XS / 7)
    chao.mascara((_YS >= borda_chao).astype(np.float32), pedra)
    chao.mascara(((_YS >= borda_chao) & (_YS < borda_chao + 1.5)).astype(np.float32), "#3a4656", 0.8)
    # pedras soltas
    g = np.random.default_rng(113)
    for _ in range(70):
        x, y = g.random() * W, 124 + g.random() * 36
        r = 1 + g.random() * 2.5
        chao.disco(x, y, r, ("#5a5662", "#33323e", "#1a1a24"), luz=(1 if x < bx else -1, -0.6))
    # Poça: espelho escuro com o reflexo do ouro em estrias.
    pcx, pcy, est_x = (252, 147, 300) if PERIODO is None else (368, 148, 330)
    poca = elipse_m(pcx, pcy, 30, 5.5)
    reflexo = np.zeros((H, W, 3), dtype=np.float32) + hexa("#0a1424")
    estria = (np.sin(_XS * 1.7) * 0.5 + 0.5) * np.exp(-((_XS - est_x) / 40) ** 2)
    reflexo += (estria * (np.sin(_YS * 2.3) > 0))[:, :, None] * hexa("#c08a3a") * 0.9
    chao.mascara(poca, reflexo)
    chao.mascara((poca > 0) & (elipse_m(pcx, pcy + 0.5, 30, 5.5) > 0) & ~(elipse_m(pcx, pcy + 1.5, 29, 5) > 0), "#6a7a90", 0.7)

    # Estrado de pedra em dois degraus sob o baú.
    for (dy, rx, ry, alt_d) in ((8, 60, 8, 5), (0, 48, 6, 5)):
        cyd = bb + dy
        topo_d = elipse_m(bx + 2, cyd, rx, ry)
        frente_d = ((np.abs(_XS - bx - 2) <= rx) & (_YS > cyd) & (_YS <= cyd + alt_d)) | (elipse_m(bx + 2, cyd + alt_d, rx, ry) > 0)
        frente_d = frente_d & ~(topo_d > 0) & (_YS >= cyd)
        juntas = ((_XS.astype(int) - bx) % 11 == 0)
        chao.mascara(frente_d.astype(np.float32), "#3e4458")
        chao.mascara((frente_d & juntas).astype(np.float32), "#141824")
        chao.mascara(topo_d, "#6e6c7e")
        chao.mascara(topo_d * (elipse_m(bx + 2, cyd, rx - 2, ry - 1.2) == 0), "#a8a2b0")
        chao.mascara(topo_d * (ruido(150 + dy, 3) > 0.62), "#4a4a5a", 0.6)

    # ── Cristais azuis crescendo da parede à direita (luz fria que contrasta com o ouro).
    cristais = Camada()
    emis_cr = Camada()

    def prisma(cam, em, x0, y0, ang, comp, larg, tons):
        ca, sa = math.cos(ang), math.sin(ang)
        px, py = -sa, ca
        pts = [(x0 + px * larg, y0 + py * larg), (x0 + ca * comp * 0.85 + px * larg, y0 + sa * comp * 0.85 + py * larg),
               (x0 + ca * comp, y0 + sa * comp), (x0 + ca * comp * 0.85 - px * larg, y0 + sa * comp * 0.85 - py * larg),
               (x0 - px * larg, y0 - py * larg)]
        m = poligono_m(pts)
        lado = (_XS - x0) * px + (_YS - y0) * py
        cor = np.where((lado < -larg * 0.25)[:, :, None], hexa(tons[0]), np.where((lado < larg * 0.35)[:, :, None], hexa(tons[1]), hexa(tons[2])))
        cam.mascara(m, cor)
        borda = (desfocar(m[:, :, None], 0.7)[:, :, 0] > 0.04) & (m == 0)
        cam.mascara(borda.astype(np.float32), tons[3], 0.8)
        em.mascara(m * (np.abs(lado) < larg * 0.2) * 0.7, "#e8ffff")
    tons_cr = ("#c8faff", "#52c8ec", "#1e6aa8", "#08203e")
    # Saliência de rocha de onde nascem os cristais.
    cristais.disco(486, 96, 22, ("#3a4a62", "#26324a", "#141c2c"), luz=(-0.8, -0.3))
    for (x0, y0, ang, comp, larg) in ((482, 66, 3.25, 22, 3.5), (478, 80, 3.5, 34, 6), (486, 92, 3.2, 40, 7.5), (474, 104, 3.75, 30, 6),
                                      (484, 112, 3.0, 22, 4.5), (470, 116, 4.1, 20, 4), (480, 124, 3.55, 16, 3.5), (476, 92, 3.95, 18, 3.5)):
        prisma(cristais, emis_cr, x0, y0, ang, comp, larg, tons_cr)
    for (x0, y0, ang, comp, larg) in ((430, 142, 4.55, 15, 3.4), (437, 143, 5.0, 11, 2.6), (424, 143, 4.15, 9, 2.2), (441, 144, 5.3, 6, 1.8)):
        prisma(cristais, emis_cr, x0, y0, ang, comp, larg, tons_cr)
    luzes += [(cristal[0], cristal[1], 70, 1.0, "#3ab8ff", 0.55), (430, 134, 20, 0.8, "#5ad0ff", 0.3)]

    # ── O baú: tampa aberta (por dentro), monte de ouro, frente com ferragens douradas.
    bau = Camada()
    em = Camada()
    x0, x1 = bx - 31, bx + 31
    yt, yb = 116, bb  # frente
    # Tampa aberta (vista por dentro), abaulada no alto, inclinada para trás.
    tampa_m = poligono_m([(x0 + 4, 109), (x0 + 6, 84), (x1 + 6, 84), (x1 + 4, 109)])
    tampa_m = np.maximum(tampa_m, elipse_m(bx + 6, 84, 31, 9) * (_YS < 84))
    luz_tampa = np.clip((_YS - 74) / 36, 0, 1)
    madeira_dentro = np.zeros((H, W, 3), dtype=np.float32) + hexa("#3a1a12")
    madeira_dentro += luz_tampa[:, :, None] * hexa("#7a3a1e")
    madeira_dentro *= (0.85 + 0.15 * ((_XS.astype(int) // 1 % 7) != 0))[:, :, None]
    bau.mascara(tampa_m, madeira_dentro)
    contorno_tampa = (desfocar(tampa_m[:, :, None], 0.8)[:, :, 0] > 0.04) & (tampa_m == 0)
    bau.mascara(contorno_tampa.astype(np.float32), "#2a1008")
    friso = tampa_m * (1 - (desfocar(tampa_m[:, :, None], 1.6)[:, :, 0] > 0.97))
    bau.mascara(friso, "#e8b040")
    bau.mascara(friso * (_XS < bx), "#ffe08a", 0.6)
    for k in range(x0 + 10, x1 + 4, 10):
        bau.ret(k, 80, 2, 29, "#c8902e")
        bau.ret(k, 80, 1, 29, "#ffe08a", 0.7)
    # Brasão no forro da tampa: um escudo com uma estrela.
    sx, sy = bx + 5, 93
    escudo = poligono_m([(sx - 6, sy - 6), (sx + 6, sy - 6), (sx + 6, sy + 1), (sx, sy + 7), (sx - 6, sy + 1)])
    bau.mascara(escudo, "#7a1a2a")
    bau.mascara(((desfocar(escudo[:, :, None], 0.8)[:, :, 0] > 0.04) & (escudo == 0)).astype(np.float32), "#f0c050")
    brilho(bau, sx, sy - 1, 2, "#ffe08a")
    # Borda de trás da abertura e o monte de ouro transbordando.
    bau.ret(x0 + 2, 108, x1 - x0 + 4, 3, "#5a2a16")
    bau.ret(x0 + 2, 108, x1 - x0 + 4, 1, "#f0c050")
    monte_de_moedas(bau, bx + 1, 117, 31, 17, 900, 121)
    # Taça dourada e o cristal rosa em cima do ouro.
    tx, ty = bx - 17, 101
    for j, m_ in enumerate([5, 5, 4, 4, 3, 2, 1, 1, 1, 3, 4]):
        for dx in range(-m_, m_ + 1):
            t = (dx + m_) / (2 * m_ + 0.01)
            bau.p(tx + dx, ty - 10 + j, "#fff0a0" if t < 0.25 else "#e8b040" if t < 0.6 else "#9a6418")
    bau.ret(tx - 4, ty - 10, 9, 1, "#fff6c8")
    joia(bau, tx, ty - 7, 0, 1)
    cx_, cy_ = bx + 15, 99
    prisma(bau, em, cx_, cy_ + 4, -1.35, 13, 2.6, ("#ffd8f4", "#f070c8", "#a02a80", "#4a0a3a"))
    prisma(bau, em, cx_ + 3, cy_ + 5, -0.9, 8, 1.8, ("#ffd8f4", "#f070c8", "#a02a80", "#4a0a3a"))
    luzes.append((cx_ + 1, cy_ - 2, 18, 1.0, "#ff70d0", 0.4))
    # Frente do baú: tábuas, faixas douradas, cantoneiras com filigrana, fechadura.
    for y in range(yt, yb):
        for x in range(x0, x1):
            tab = (y - yt) // 8
            k = hash01(x // 3, y, tab) * 0.25 + (0.12 if (x + tab * 5) % 11 == 0 else 0)
            t = (x - x0) / (x1 - x0)
            cor = mistura("#9a4a26", "#4a2012", min(1, t * 0.7 + k))
            if (y - yt) % 8 == 7:
                cor = hexa("#2a0e08")
            bau.p(x, y, cor)
    # Lateral direita (em perspectiva, na sombra).
    bau.poligono([(x1, yt), (x1 + 7, yt - 6), (x1 + 7, yb - 5), (x1, yb)], "#3a160c")
    bau.linha(x1, yt, x1 + 7, yt - 6, "#c8902e")
    bau.linha(x1 + 7, yt - 6, x1 + 7, yb - 5, "#8a5a1a")
    for (yy, alt) in ((yt, 3), (yb - 3, 3)):
        bau.ret(x0 - 1, yy, x1 - x0 + 2, alt, "#d89a30")
        bau.ret(x0 - 1, yy, x1 - x0 + 2, 1, "#fff0a0")
        bau.ret(x0 - 1, yy + alt - 1, x1 - x0 + 2, 1, "#8a5414")
        for k in range(x0 + 2, x1, 5):
            bau.p(k, yy + 1, "#fff6c8")
    for k in (x0 + 9, x1 - 10):
        bau.ret(k, yt, 3, yb - yt, "#d89a30")
        bau.ret(k, yt, 1, yb - yt, "#fff0a0")
        bau.ret(k + 2, yt, 1, yb - yt, "#8a5414")
        for yy in range(yt + 5, yb - 3, 4):
            bau.p(k + 1, yy, "#fff6c8")
    for (ccx, sxn) in ((x0, 1), (x1 - 1, -1)):  # cantoneiras
        for j in range(9):
            bau.p(ccx + sxn * j, yt + 3, "#f0c050")
            bau.p(ccx, yt + 3 + j, "#f0c050")
            bau.p(ccx + sxn * j, yb - 4, "#f0c050")
            bau.p(ccx, yb - 4 - j, "#f0c050")
        for (dx, dy) in ((2, 6), (3, 5), (5, 3), (6, 2), (4, 4)):
            bau.p(ccx + sxn * dx, yt + 2 + dy, "#ffe08a")
            bau.p(ccx + sxn * dx, yb - 3 - dy, "#ffe08a")
    # Fechadura.
    fx, fy = bx, yt + 2
    espelho = poligono_m([(fx - 6, fy), (fx + 6, fy), (fx + 6, fy + 9), (fx, fy + 14), (fx - 6, fy + 9)])
    bau.mascara(espelho, "#e0a838")
    bau.mascara(espelho * (_XS < fx - 2), "#fff0a0", 0.7)
    bau.mascara(espelho * (_XS > fx + 2), "#9a6418", 0.7)
    bau.mascara(((desfocar(espelho[:, :, None], 0.8)[:, :, 0] > 0.04) & (espelho == 0)).astype(np.float32), "#5a3010")
    bau.disco(fx, fy + 5, 1.6, ("#1a0a04", "#1a0a04", "#1a0a04"))
    bau.ret(fx, fy + 6, 1, 4, "#1a0a04")
    # Moedas escorrendo pela frente até o chão e um colar de pérolas pendurado.
    g = np.random.default_rng(131)
    for _ in range(70):
        t = g.random()
        x = x0 + 3 + g.normal(0, 3) + t * 3
        moeda(bau, x, yt + 2 + t * (yb - yt), g.random())
    for i in range(16):
        t = i / 15
        x = bx + 9 + t * 12
        y = yt + 1 + math.sin(t * math.pi) * 10
        bau.p(x, y, "#fffaf0")
        bau.p(x + 1, y + 1, "#b8b0c0")
    joia(bau, bx + 15, yt + 10, 2, 1)

    # ── Montes de ouro no chão, joias espalhadas e os objetos: livro, pergaminhos, bússola.
    chao_ouro = Camada()
    monte_de_moedas(chao_ouro, x0 - 6, bb + 3, 20, 9, 340, 141)
    monte_de_moedas(chao_ouro, x1 + 14, bb + 4, 17, 7, 260, 142)
    monte_de_moedas(chao_ouro, bx + 4, bb + 9, 26, 4, 200, 143)
    g = np.random.default_rng(151)
    for _ in range(90):  # moedas soltas, rareando para a esquerda
        x = bx + g.normal(0, 52)
        if x < 225 and g.random() < 0.8:
            continue
        y = bb - 2 + g.random() * 20
        moeda(chao_ouro, x, y, g.random())
    for i in range(16):
        x = bx + g.normal(0, 40)
        y = bb - 4 + g.random() * 18
        joia(chao_ouro, x, y, i, 1 + int(g.random() * 2))
    for (jx, jy, tp) in ((x0 + 2, 106, 1), (bx - 6, 101, 0), (bx + 22, 105, 2), (bx - 26, 108, 3), (bx + 4, 107, 4)):
        joia(bau, jx, jy, tp, 2)
    # Livro grosso de capa azul com cantos de ouro e um medalhão (deitado, em perspectiva).
    lx, ly = (278, 149) if PERIODO is None else (198, 150)
    capa = poligono_m([(lx - 15, ly - 2), (lx + 7, ly - 9), (lx + 17, ly - 3), (lx - 5, ly + 4)])
    pag_a = poligono_m([(lx - 15, ly - 2), (lx - 5, ly + 4), (lx - 5, ly + 9), (lx - 15, ly + 3)])
    pag_b = poligono_m([(lx - 5, ly + 4), (lx + 17, ly - 3), (lx + 17, ly + 2), (lx - 5, ly + 9)])
    chao_ouro.mascara(pag_a, "#2a3a7a")  # lombada
    chao_ouro.mascara(pag_a * (_YS > ly + 1), "#1a2650", 0.6)
    chao_ouro.mascara(pag_b, "#efe2c2")
    chao_ouro.mascara(pag_b * ((_YS.astype(int) + (_XS.astype(int) // 3)) % 2 == 0), "#c8b896", 0.7)
    chao_ouro.mascara(capa, "#2e4ea8")
    chao_ouro.mascara(capa * (poligono_m([(lx - 15, ly - 2), (lx + 7, ly - 9), (lx + 9, ly - 7), (lx - 12, ly + 0)])), "#5a80dc")
    borda_capa = (desfocar(capa[:, :, None], 0.8)[:, :, 0] > 0.04) & (capa == 0) & (pag_b == 0) & (pag_a == 0)
    chao_ouro.mascara(borda_capa.astype(np.float32), "#101a3a")
    chao_ouro.mascara(((desfocar(capa[:, :, None], 1.1)[:, :, 0] < 0.97) & (capa > 0)).astype(np.float32), "#d8a838", 0.85)
    for (qx, qy) in ((lx - 13, ly - 2), (lx + 7, ly - 8), (lx + 15, ly - 3), (lx - 5, ly + 3)):
        chao_ouro.disco(qx, qy, 1.4, ("#fff0a0", "#e0a838", "#8a5414"))
    chao_ouro.elipse(lx + 1, ly - 2.5, 3.2, 2, "#e0a838")
    chao_ouro.elipse(lx + 1, ly - 2.5, 1.8, 1, "#c02a3a")
    chao_ouro.p(lx, ly - 3, "#ffffff")
    chao_ouro.ret(lx + 10, ly + 2, 2, 5, "#c02a2a")  # fitinha marcadora
    # Pergaminhos enrolados com fita vermelha e lacre, encostados no baú.
    for (px0, py0, comp, ang) in ((x1 + 9, bb - 5, 18, -0.5), (x1 + 13, bb - 2, 15, -0.25)):
        ca, sa = math.cos(ang), math.sin(ang)
        for t in range(comp):
            for r in range(-2, 3):
                x = px0 + ca * t - sa * r
                y = py0 + sa * t + ca * r
                cor = "#fff4d8" if r == -2 else "#e8d4a8" if r < 1 else "#b89a6a" if r < 2 else "#7a6040"
                chao_ouro.p(x, y, cor)
        ex, ey = px0 + ca * comp, py0 + sa * comp
        chao_ouro.disco(ex, ey, 2.4, ("#f4e6c4", "#c8ae80", "#8a7050"))
        chao_ouro.p(ex, ey, "#7a6040")
        mx_, my_ = px0 + ca * comp * 0.5, py0 + sa * comp * 0.5
        for r in range(-2, 3):
            chao_ouro.p(mx_ - sa * r, my_ + ca * r, "#c02a2a")
            chao_ouro.p(mx_ + ca - sa * r, my_ + sa + ca * r, "#8a1a1a")
        chao_ouro.disco(mx_ + 1, my_ + 3, 1.6, ("#e04040", "#a01a1a", "#600a0a"))
    # Bússola de latão aberta: tampa em pé atrás, aro dourado grosso, rosa dos ventos e agulha vermelha.
    cx2, cy2 = 408, 151
    chao_ouro.elipse(cx2, cy2 - 9, 8, 6, "#c8902e")
    chao_ouro.elipse(cx2, cy2 - 9, 6.5, 4.6, "#6a4014")
    chao_ouro.elipse(cx2 - 1, cy2 - 10, 4.5, 3, "#8a5a1e")
    chao_ouro.p(cx2 - 3, cy2 - 12, "#fff0a0")
    for y in range(int(cy2 - 6), int(cy2 + 7)):
        for x in range(int(cx2 - 9), int(cx2 + 10)):
            d = math.hypot((x - cx2) / 8.5, (y - cy2) / 5.2)
            if d <= 1:
                if d > 0.66:
                    luz_ = (x - cx2) * -0.6 + (y - cy2) * -1
                    chao_ouro.p(x, y, "#fff0a0" if luz_ > 2.5 else "#e0a838" if luz_ > -1.5 else "#a86a1c" if luz_ > -4 else "#6a4014")
                else:
                    chao_ouro.p(x, y, "#d8ccb0" if d < 0.5 else "#b8a888")
    for (dx, dy) in ((0, -3), (0, 3), (-4, 0), (4, 0)):
        chao_ouro.p(cx2 + dx, cy2 + dy, "#3a2a20")
    chao_ouro.linha(cx2 - 3, cy2 + 2, cx2, cy2, "#f4f4ff", grossura=1)
    chao_ouro.linha(cx2 - 2, cy2 + 2, cx2, cy2 + 1, "#c8c8d8")
    chao_ouro.linha(cx2, cy2, cx2 + 3, cy2 - 2, "#e02a2a")
    chao_ouro.linha(cx2 + 1, cy2, cx2 + 3, cy2 - 1, "#a01a1a")
    chao_ouro.p(cx2, cy2, "#ffe08a")
    chao_ouro.p(cx2 - 4, cy2 - 3, "#ffffff", 0.8)
    chao_ouro.ret(cx2 + 9, cy2 - 1, 3, 2, "#c8902e")  # argola
    chao_ouro.p(cx2 + 11, cy2 - 1, "#fff0a0")

    # ── Brilhos sobre o ouro (emissivos) e o interior aceso do baú.
    brilhos = Camada()
    g = np.random.default_rng(161)
    for _ in range(18):
        x = bx + g.normal(0, 30)
        y = 100 + abs(g.normal(0, 18))
        if y > 158:
            continue
        brilho(brilhos, x, y, 1 + int(g.random() * 1.6), "#fff2b0")
    for (x, y, t) in ((bx - 4, 98, 3), (x0 + 1, yt + 1, 2), (bx + 25, 103, 2), (cx_ + 1, cy_ - 8, 2), (cx2 - 3, cy2 - 2, 1), (tx - 3, ty - 9, 2)):
        brilho(brilhos, x, y, t, "#fff6d0")
    poeira = Camada()
    for _ in range(90):
        ang = -math.pi / 2 + g.normal(0, 0.55)
        r = 6 + g.random() ** 0.7 * 90
        x, y = fonte[0] + math.cos(ang) * r * 1.3, fonte[1] + math.sin(ang) * r
        poeira.p(x, y, "#ffe8a8", 0.3 + g.random() * 0.6)
    for _ in range(30):
        x, y = 430 + g.normal(0, 20), 80 + g.normal(0, 25)
        poeira.p(x, y, "#a8f0ff", 0.4 + g.random() * 0.5)
    luzes += [(fonte[0], fonte[1] - 6, 160, 0.62, "#ffa030", 0.85), (fonte[0], fonte[1] - 14, 40, 0.8, "#ffd070", 0.25),
              (bx, bb + 6, 120, 0.25, "#ffa040", 0.75)]
    # Primeiro plano: rochas e estalagmites bem perto, desfocadas.
    frente = Camada()
    for (cx3, cy3, r) in ((-10, 172, 34), (30, 182, 22), (476, 176, 24), (448, 186, 18)):
        frente.disco(cx3, cy3, r, ("#1e2638", "#141a28", "#0a0e18"))
    for (sx_, larg, alt) in ((462, 9, 44), (18, 8, 30)):
        for y in range(H - alt, H):
            t = (y - (H - alt)) / alt
            meia = larg * t ** 0.7
            frente.ret(sx_ - meia, y, meia * 2 + 1, 1, "#121826")
            frente.ret(sx_ - meia, y, max(1, meia * 0.6), 1, "#2a3448")
    for _ in range(14):
        moeda(frente, 380 + g.random() * 80, 150 + g.random() * 10, g.random())

    if PERIODO is not None:
        return montar_bau_hora(fundo, teto, arco, chao, estal, cristais, chao_ouro, bau, em, emis_cr, brilhos, poeira,
                               cogumelos, frente, luzes, bx, bb, fonte)
    # ── Montagem.
    m = Montagem(np.zeros((H, W, 3), dtype=np.float32))
    m.camada(fundo, 1.6)
    m.camada(teto, 0.8)
    m.camada(arco, 0.7)
    m.camada(chao, 0.3)
    m.camada(estal, 0.5)
    m.camada(cristais)
    m.camada(chao_ouro, luz_k=0.75)
    m.camada(bau, luz_k=0.62)
    m.iluminar("#48568a", luzes + [(142, 140, 60, 0.35, "#5a7ac8", 0.45)])
    # Facho de luar entrando por uma fenda do teto, à esquerda (frio e calmo).
    t = _GYS / (H * ESC)
    centro = (176 + (140 - 176) * t) * ESC
    facho = np.exp(-((_GXS - centro) / (16 * ESC * (0.7 + t * 0.6))) ** 2 * 2) * np.clip(1.1 - t * 0.6, 0, 1)
    m.somar(desfocar(facho[:, :, None], 8)[:, :, 0], "#6a8ad0", 0.22)
    # Raios de luz dourada saindo do baú, em leque.
    ang = np.arctan2(_GYS - fonte[1] * ESC, _GXS - fonte[0] * ESC)
    r = np.hypot(_GXS - fonte[0] * ESC, (_GYS - fonte[1] * ESC) * 1.2) / ESC
    leque = np.zeros_like(r)
    g = np.random.default_rng(171)
    for _ in range(11):
        a0 = -math.pi / 2 + g.normal(0, 0.5)
        largura = 0.03 + g.random() * 0.07
        leque += np.exp(-((ang - a0) / largura) ** 2) * (0.5 + g.random() * 0.7)
    leque *= np.exp(-r / 85) * np.clip((r - 4) / 12, 0, 1) * (_GYS < (fonte[1] + 6) * ESC)
    m.somar(desfocar(leque[:, :, None], 3)[:, :, 0], "#ffc860", 0.5)
    # O ouro brilha de dentro do baú: um clarão quente sobre o monte (como se a luz morasse ali).
    m.somar(luz_pontual(bx + 2, 108, 34, 0.45), "#ffc858", 0.55)
    m.somar(luz_pontual(bx + 2, 112, 16, 0.6), "#fff0b0", 0.35)
    m.emissivo(em, 0, halo=0.6)
    m.emissivo(emis_cr, 0, halo=0.5)
    m.emissivo(brilhos, 0, halo=0.8)
    m.emissivo(poeira, 0.3, halo=0.6)
    m.emissivo(cogumelos, 0.3, halo=0.8)
    m.camada(frente, 5, escurecer=0.6)
    return m.acabar("#ffd8a0", "#0e1838", esquerda=0.36, centro_v=(0.6, 0.6), contraste=1.08)


# ═══════════════════════════════ 3. O correio da vila ═══════════════════════════════
LETRAS = {
    "C": ["XXX", "X..", "X..", "X..", "XXX"], "O": ["XXX", "X.X", "X.X", "X.X", "XXX"],
    "R": ["XX.", "X.X", "XX.", "X.X", "X.X"], "E": ["XXX", "X..", "XX.", "X..", "XXX"], "I": ["XXX", ".X.", ".X.", ".X.", "XXX"],
}


def letreiro(c: Camada, texto: str, x: int, y: int, cor: str, sombra: str) -> None:
    for ch in texto:
        for j, linha in enumerate(LETRAS[ch]):
            for i, v in enumerate(linha):
                if v == "X":
                    c.p(x + i + 1, y + j + 1, sombra)
                    c.p(x + i, y + j, cor)
        x += 4


def pombo(c: Camada, x: float, y: float, pose: str = "sentado", virado: int = 1) -> None:
    """Pombo simples e original: corpo cinza-azulado, pescoço furta-cor, duas faixas escuras na asa."""
    x, y = int(round(x)), int(round(y))
    v = virado

    def q(dx, dy, cor):
        c.p(x + dx * v, y + dy, cor)
    if pose == "espiando":
        for (dx, dy, cor) in ((0, 0, "#9aa2b4"), (1, 0, "#b8c0d0"), (-1, 0, "#7a8294"), (0, -1, "#b8c0d0"), (1, -1, "#c8d0de"),
                              (-1, -1, "#9aa2b4"), (0, 1, "#5aa08a"), (1, 1, "#8a6aa8"), (-1, 1, "#4a8a7a"), (2, 0, "#e8c8a0")):
            q(dx, dy, cor)
        q(1, -1, "#1a1018")
        return
    if pose == "voando":
        corpo = [(-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1)]
        for (dx, dy) in corpo:
            q(dx, dy, "#8a92a4" if dy == 0 else "#6a7284")
        for k in range(1, 5):  # asas para cima em V
            q(-k // 2, -k, "#b0b8c8" if k < 4 else "#4a5060")
            q(-k // 2 + 1, -k, "#9aa2b4")
            q(k // 3 + 1, -k + 1, "#c0c8d6")
        q(3, -1, "#a8b0c0")
        q(4, -1, "#a8b0c0")
        q(5, -1, "#e8c8a0")
        q(3, 0, "#5aa08a")
        q(-3, 0, "#4a5060")
        q(-4, 1, "#4a5060")
        return
    # sentado
    for dy in range(-2, 3):
        for dx in range(-4, 4):
            if (dx / 4.2) ** 2 + (dy / 2.6) ** 2 <= 1:
                cor = "#b8c0d0" if dy <= -1 and dx < 1 else "#8a92a4" if dy <= 1 else "#6a7284"
                q(dx, dy, cor)
    q(-5, 0, "#4a5060")
    q(-6, 1, "#3a4050")
    q(-5, 1, "#4a5060")
    for dx in (-2, 0):  # faixas da asa
        q(dx, -1, "#3a3e4a")
        q(dx, 0, "#3a3e4a")
    q(3, -2, "#5aa08a")
    q(3, -3, "#8a6aa8")
    q(4, -3, "#5aa08a")
    for (dx, dy, cor) in ((3, -4, "#a8b0c0"), (4, -4, "#c8d0de"), (4, -5, "#b8c0d0"), (3, -5, "#9aa2b4"), (5, -4, "#e8c8a0")):
        q(dx, dy, cor)
    q(4, -5, "#1a1018")
    q(4, -4, "#ff8a3a")
    q(-1, 3, "#e07a8a")
    q(1, 3, "#e07a8a")


def envelope(c: Camada, x: int, y: int, w: int, h: int, cor: str = "#f4ead4", aba: str = "#c8b898", selo: bool = False) -> None:
    c.ret(x, y, w, h, cor)
    c.ret(x, y + h - 1, w, 1, aba)
    for i in range(w // 2 + 1):  # o V da aba
        yy = y + min(h - 2, int(i * (h - 1) / max(1, w / 2)))
        c.p(x + i, yy, aba)
        c.p(x + w - 1 - i, yy, aba)
    if selo:
        c.ret(x + w - 3, y + 1, 2, 2, "#c84a3a")


# ── O correio nas três horas do dia (páginas internas: Indique e ganhe, Contato).
def ceu_correio_hora() -> np.ndarray:
    if PERIODO == "manha":
        return ceu_hora([(0, "#2e62b6"), (36, "#4c8ad4"), (70, "#8cbce8"), (94, "#c8def0"), (108, "#f0eee2"), (160, "#f4ecdc")],
                        sol=(96, 26, 4, "#fff0c8", 0.28, 90),
                        nuvens=dict(yc=52, esp=40, limiar=0.55, ex=36, ey=8, luz="#ffffff", sombra="#a2b6d6", miolo="#dae4f2",
                                    lado_luz=-1, luz_dy=-1, forca=0.95), seed=401)
    if PERIODO == "tarde":
        return ceu_hora([(0, "#3a3e86"), (26, "#6e5a98"), (56, "#d27e7c"), (80, "#ffa868"), (98, "#ffd088"), (112, "#fff0c4"),
                         (160, "#ffe4ac")],
                        sol=(192, 103, 7, "#ffb050", 0.85, 160),
                        nuvens=dict(yc=66, esp=36, limiar=0.55, ex=50, ey=4, luz="#fff0b0", sombra="#a8586e", miolo="#e0806e",
                                    lado_luz=-1, luz_dy=1, forca=0.9), seed=402)
    return ceu_hora([(0, "#03061a"), (30, "#0a1134"), (66, "#16214c"), (96, "#253468"), (112, "#30407a"), (160, "#30407a")],
                    lua=(176, 30, 6, True),
                    nuvens=dict(yc=70, esp=30, limiar=0.6, ex=50, ey=4, luz="#9aa8dc", sombra="#18204a", miolo="#2a3466",
                                lado_luz=-1, luz_dy=-1, forca=0.8),
                    estrelas=240, seed=403)


def montar_correio_hora(ceu, longe, e_longe, meio_c, e_meio, rua, pr, fundo_int, pr2, pb, vasos, pr_frente, em, vaga, frente,
                        luzes) -> Image.Image:
    P = PERIODO
    rampas_longe = {"manha": [(0, "#5a6e9a"), (0.6, "#7c90b8"), (1, "#d4dcee")],
                    "tarde": [(0, "#3a2244"), (0.6, "#5a3256"), (1, "#ff9a7a")],
                    "noite": [(0, "#0c1128"), (0.6, "#162042"), (1, "#4a5a90")]}
    rampas_meio = {"manha": [(0, "#3c4c6c"), (0.5, "#56688a"), (1, "#b8c6dc")],
                   "tarde": [(0, "#1e1428"), (0.5, "#2e1e38"), (1, "#c86a6a")],
                   "noite": [(0, "#070a1c"), (0.5, "#0e1430"), (1, "#3a4a80")]}
    remapear(longe, rampas_longe[P], 0.15, faixa=(0.17, 0.52))
    remapear(meio_c, rampas_meio[P], 0.15, faixa=(0.1, 0.45))
    # Sombras: a caixa de correio, o saco, o caixote e a bicicleta no chão; o toldo na parede, embaixo dele.
    a = pr_frente.c[:, :, 3]
    comp, cis = {"manha": (0.3, 0.8), "tarde": (0.45, 1.5), "noite": (0.2, 0.3)}[P]
    sombra = np.zeros((H, W), dtype=np.float32)
    for (xa, xb, base) in ((240, 266, 136), (400, 424, 131), (268, 290, 131), (288, 334, 131)):
        recorte = np.zeros_like(a)
        recorte[:base, xa:xb] = a[:base, xa:xb]
        sombra = np.maximum(sombra, sombra_projetada(recorte, base, comp, cis))
    alt_toldo = {"manha": 9, "tarde": 4, "noite": 3}[P]
    toldo = ((_XS > 284 + 3) & (_XS < 369 + 3) & (_YS > 79) & (_YS < 79 + alt_toldo)).astype(np.float32)
    sombra = np.maximum(sombra, desfocar(toldo[:, :, None], 1.2)[:, :, 0] * 0.8)

    m = Montagem(ceu)
    m.camada(longe, 1.6)
    if P != "manha":
        m.emissivo(e_longe, 1.0, halo=0.5 if P == "tarde" else 0.8)
    m.camada(meio_c, 0.8)
    if P != "manha":
        m.emissivo(e_meio, 0.5, halo=0.4 if P == "tarde" else 0.7)
    m.camada(rua, 0.2)
    m.camada(pr)
    if P == "noite":
        m.camada(fundo_int, solida=False)
    else:  # de dia o interior fica na penumbra de dentro, mais escuro e frio que a rua, com o lampião aceso lá no fundo
        dentro = Camada()
        dentro.c = fundo_int.c.copy()
        k = {"manha": (0.62, "#8aa0c8"), "tarde": (0.75, "#ffb070")}[P]
        dentro.c[:, :, :3] = dentro.c[:, :, :3] * k[0] * (0.7 + 0.3 * hexa(k[1]))
        m.camada(dentro, solida=False)
    m.camada(pr2)
    m.camada(pb)
    m.camada(vasos)
    m.camada(pr_frente)
    if P == "manha":
        m.camada(apagar(em, pr2))
        m.iluminar("#a8b2d0", [(325, 100, 40, 0.75, "#ffaa50", 0.2)], mapa=mapa_sol("#fff0d4", 0.6, sombra, 0.85))
        pocas = ((ruido(291, 30, 6) > 0.58) & (_YS > 137) & (_XS > 236)).astype(np.float32)
        m.reflexo(133.5, pocas, 0.5, 1.2)
        ceu_claro = np.clip((m.img.mean(2) - 0.8) * 3, 0, 1) * (1 - m.solido)
        raios = raios_radiais(ceu_claro, (96, 26), alcance=0.7)
        m.somar(desfocar(raios[:, :, None], 6)[:, :, 0], "#fff4d8", 0.2)
        m.camada(frente, 6, escurecer=0.6)
        return m.acabar("#fff0d4", "#24366a", esquerda=0.4, centro_v=(0.66, 0.55), contraste=1.1, bloom=0.3)
    if P == "tarde":
        m.camada(apagar(em, pr2, vidro=("#3a2430", "#a8605a", "#ffd8a0"), aceso=0.45))
        acesas = [l[:5] + (l[5] * 0.35,) for l in luzes]
        poente = [(192, 108, 230, 0.5, "#ff9060", 0.3), (268, 60, 40, 1.2, "#ffa070", 0.3)]
        m.iluminar("#7e6a90", acesas + poente, mapa=mapa_sol("#ffb070", 0.6, sombra, 0.9))
        pocas = ((ruido(291, 30, 6) > 0.52) & (_YS > 136) & (_XS > 236)).astype(np.float32)
        pocas = np.maximum(pocas, ((ruido(292, 18, 4) > 0.7) & (_YS > 140) & (_XS > 120)).astype(np.float32) * 0.7)
        m.reflexo(133.5, pocas, 0.7, 1.2)
        ceu_claro = np.clip((m.img.mean(2) - 0.62) * 2, 0, 1) * (1 - m.solido) * (_GYS < 112 * ESC)
        raios = raios_radiais(ceu_claro, (192, 103), alcance=0.75)
        m.somar(desfocar(raios[:, :, None], 6)[:, :, 0], "#ffb070", 0.7)
        m.camada(frente, 6, escurecer=0.45)
        return m.acabar("#ffcf8a", "#3a1e4e", esquerda=0.4, centro_v=(0.66, 0.55), bloom=0.6)
    fortes = [l[:5] + (l[5] * 1.15,) for l in luzes]
    m.iluminar("#2c3266", fortes + [(325, 124, 70, 0.3, "#ffa050", 0.4)], mapa=mapa_sol("#7a8ad0", 0.16, sombra, 0.9))
    m.emissivo(em, 0, halo=0.5)
    pocas = ((ruido(291, 30, 6) > 0.52) & (_YS > 136) & (_XS > 236)).astype(np.float32)
    pocas = np.maximum(pocas, ((ruido(292, 18, 4) > 0.7) & (_YS > 140) & (_XS > 120)).astype(np.float32) * 0.7)
    m.reflexo(133.5, pocas, 0.75, 1.2)
    m.emissivo(vaga, 0, halo=1.0)
    m.camada(frente, 6, escurecer=0.35)
    return m.acabar("#ffd8a8", "#121848", esquerda=0.4, centro_v=(0.66, 0.55))


def cena_correio() -> Image.Image:
    luzes: list = []
    if PERIODO is None:
        ceu = gradiente([(0, "#121838"), (26, "#262a5c"), (56, "#523c76"), (80, "#a65a78"), (96, "#e88a6e"), (110, "#ffc08a"), (160, "#ffc890")])
        d = np.hypot((_XS - 190) / 170, (_YS - 112) / 46)
        ceu += np.exp(-d * d * 1.4)[:, :, None] * hexa("#ff9a70") * 0.3
        g = np.random.default_rng(201)
        for _ in range(120):
            x, y = int(g.random() * W), int(g.random() ** 1.8 * 60)
            b = (0.25 + g.random() * 0.6) * (1 - y / 70)
            ceu[y, x] = np.minimum(1, ceu[y, x] + b)
        nv = ruido(202, 50, 5) * 0.7 + ruido(203, 12, 2) * 0.3
        for y in range(44, 100):
            for x in range(W):
                v = nv[y, x] - 0.57 - abs(y - 76) / 80
                if v > 0:
                    k = min(1, v * 7) * 0.8
                    t = (y - 44) / 56
                    cor = mistura("#4a3470", "#f0907a", t)
                    if nv[min(H - 1, y + 2), x] - 0.57 - abs(y + 2 - 76) / 80 < 0:
                        cor = mistura("#e07a8a", "#ffd8a8", t)
                    ceu[y, x] = ceu[y, x] * (1 - k) + cor * k
    else:
        ceu = ceu_correio_hora()

    # ── Telhados da vila ao longe (silhuetas), com a torre da igrejinha e janelas acesas.
    longe = Camada()
    e_longe = Camada()
    longe.mascara((_YS > 108 + 3 * np.sin(_XS / 30)).astype(np.float32), "#3e3462")
    g = np.random.default_rng(211)
    x = -4
    while x < 300:
        larg = 14 + g.random() * 16
        alt = 10 + g.random() * 14
        base = 112
        topo = base - alt
        cumeeira = topo - larg * 0.45
        tom = mistura("#4a3a6a", "#3a3058", g.random())
        longe.poligono([(x, base), (x, topo), (x + larg / 2, cumeeira), (x + larg, topo), (x + larg, base)], tom)
        longe.linha(x, topo, x + larg / 2, cumeeira, "#a86a8a")
        if g.random() < 0.6:
            longe.ret(x + larg * 0.7, cumeeira + 1, 2, 5, tom)
        for _ in range(int(g.random() * 3)):
            e_longe.p(x + 3 + g.random() * (larg - 6), topo + 3 + g.random() * (alt - 6), "#ffc060", 0.85)
        x += larg + g.random() * 3
    # torre da igreja
    longe.ret(150, 64, 9, 48, "#3a3058")
    longe.poligono([(149, 64), (154.5, 44), (160, 64)], "#2e2650")
    longe.linha(149, 64, 154.5, 44, "#b07090")
    longe.ret(154, 40, 1, 5, "#2e2650")
    longe.ret(152, 41, 5, 1, "#2e2650")
    e_longe.ret(153, 72, 3, 4, "#ffc060", 0.8)
    # Casas do meio (mais perto, mais escuras), na ponta da rua.
    meio_c = Camada()
    e_meio = Camada()
    for (x0, larg, alt, tom) in ((118, 34, 34, "#2e2848"), (150, 28, 44, "#282240"), (176, 40, 30, "#2e2848"), (214, 30, 40, "#262040")):
        base = 126
        topo = base - alt
        meio_c.poligono([(x0, base), (x0, topo), (x0 + larg / 2, topo - larg * 0.4), (x0 + larg, topo), (x0 + larg, base)], tom)
        meio_c.linha(x0 - 1, topo + 1, x0 + larg / 2, topo - larg * 0.4, "#8a5a7a")
        meio_c.linha(x0 + larg / 2, topo - larg * 0.4, x0 + larg + 1, topo + 1, "#1a1630")
        for jx in range(int(x0 + 5), int(x0 + larg - 6), 11):
            e_meio.ret(jx, topo + 8, 4, 5, "#ffb860", 0.8)
            meio_c.ret(jx + 1, topo + 8, 1, 5, "#3a2a2a")
            luzes.append((jx + 2, topo + 10, 10, 1.0, "#ffa850", 0.25))
        meio_c.ret(x0 + larg * 0.25, topo - larg * 0.4 + 2, 3, 8, tom)

    # ── A rua: calçada de lajes junto ao prédio e paralelepípedos, sumindo no fundo.
    rua = Camada()
    for y in range(118, H):
        prof = (y - 112) / 48
        alt = 2 + int(prof * 3)
        fi = (y - 118) // alt
        larg = 4 + int(prof * 6)
        for x in range(W):
            calcada = y < 132 and x > 236
            if calcada:
                lx_ = (x + (fi % 2) * 7) % 14
                cor = "#8a8090" if lx_ and (y - 118) % 7 else "#4a4258"
                if lx_ == 1 or (y - 118) % 7 == 1:
                    cor = "#a89aa8"
            else:
                off = (fi % 2) * (larg // 2)
                emx, emy = (x + off) % larg, (y - 118) % alt
                k = hash01((x + off) // larg, fi, 221)
                if emx == larg - 1 or emy == alt - 1:
                    cor = "#2a2436"
                elif emy == 0:
                    cor = "#9a8c9c" if k > 0.3 else "#7a6e80"
                else:
                    cor = ["#6a6074", "#5e5468", "#74687e", "#665c70"][int(k * 4)]
            rua.p(x, y, cor)
    rua.ret(236, 132, W - 236, 2, "#c8b8c0")  # meio-fio
    rua.ret(236, 134, W - 236, 1, "#2a2436")
    rua.mascara(((_XS < 236) & (_YS >= 118) & (_YS < 121)).astype(np.float32), "#2a2436", 0.6)

    # ── O prédio do correio.
    pr = Camada()      # paredes e molduras
    fundo_int = Camada()  # o que se vê aceso por dentro das janelas (não recebe a luz de fora)
    pr2 = Camada()     # caixilhos e tudo o que fica na frente das janelas (balcão, cartas, pacotes)
    em = Camada()
    x0, x1 = 268, W
    chao_t, sobrado = 118, 54
    # Sobrado em enxaimel.
    for y in range(4, sobrado):
        for x in range(x0, x1):
            k = hash01(x // 2, y // 2, 231) * 0.1
            pr.p(x, y, mistura("#bca88a", "#7a6c7a", min(1, (x - x0) / 240 + k)) * (0.72 + 0.28 * y / sobrado))
    for x in range(x0 + 2, x1, 22):
        pr.ret(x, 4, 3, sobrado - 4, "#4a2e1e")
        pr.ret(x, 4, 1, sobrado - 4, "#7a5236")
    pr.ret(x0, 28, x1 - x0, 2, "#4a2e1e")
    for x in range(x0 + 5, x1 - 20, 44):
        pr.linha(x, 28, x + 17, 6, "#4a2e1e", grossura=2)
        pr.linha(x + 22, 6, x + 39, 28, "#4a2e1e", grossura=2)
    # Beiral do telhado no alto, com cachorros.
    pr.ret(x0 - 4, 0, x1 - x0 + 4, 5, "#3a2430")
    for x in range(x0 - 4, x1, 3):
        pr.p(x, 4, "#6a3a40")
        pr.p(x + 1, 3, "#5a3038")
    for x in range(x0, x1, 8):
        pr.ret(x, 5, 2, 2, "#2a1a14")
    # Viga do sobrado com mísulas.
    pr.ret(x0 - 2, sobrado, x1 - x0 + 2, 3, "#5a3a26")
    pr.ret(x0 - 2, sobrado, x1 - x0 + 2, 1, "#9a6a40")
    for x in range(x0 + 4, x1, 14):
        pr.ret(x, sobrado + 3, 3, 2, "#3a2418")
        pr.p(x + 1, sobrado + 5, "#3a2418")
    # Janela do sobrado acesa, com floreira, e outra com cortina.
    jx, jy = 298, 13
    pr.ret(jx - 2, jy - 2, 22, 22, "#e8dcc4")
    fundo_int.ret(jx, jy, 18, 17, "#ffbf70")
    fundo_int.ret(jx + 1, jy + 1, 6, 6, "#fff0c8")
    fundo_int.ret(jx + 11, jy + 3, 4, 6, "#d88a48")  # um vaso na sala, contra a luz
    pr2.ret(jx + 8, jy, 2, 17, "#4a2c1c")
    pr2.ret(jx, jy + 8, 18, 2, "#4a2c1c")
    pr2.ret(jx - 2, jy + 19, 22, 3, "#7a4a2a")
    for k in range(22):
        pr2.p(jx - 2 + k, jy + 18 - (k % 2), ["#f4a7c4", "#ffe07a", "#f07a6a", "#ffffff", "#c8a8f8"][k % 5])
        pr2.p(jx - 2 + k, jy + 19 - ((k + 1) % 2), "#4a7a3a")
    luzes.append((jx + 9, jy + 9, 26, 1.0, "#ffaa50", 0.5))
    jx2 = 340
    pr.ret(jx2 - 2, jy - 2, 18, 22, "#e8dcc4")
    fundo_int.ret(jx2, jy, 14, 17, "#c87a48")
    fundo_int.ret(jx2 + 5, jy, 4, 17, "#ffb868")
    pr2.ret(jx2 + 4, jy, 1, 17, "#6a3a24", 0.6)
    pr2.ret(jx2 + 9, jy, 1, 17, "#6a3a24", 0.6)
    pr2.ret(jx2 + 6, jy + 8, 2, 9, "#7a4028", 0.5)
    pr.ret(jx2 - 2, jy + 19, 18, 2, "#7a4a2a")
    luzes.append((jx2 + 7, jy + 9, 16, 1.0, "#ff9a50", 0.2))

    # Térreo de madeira pintada (tábuas verticais).
    for y in range(sobrado + 3, chao_t):
        for x in range(x0, x1):
            tab = (x - x0) % 5
            k = hash01((x - x0) // 5, y // 9, 241) * 0.12
            cor = mistura("#3e7280", "#24485a", min(1, (x - x0) / 240 + k))
            if tab == 4:
                cor = cor * 0.7
            elif tab == 0:
                cor = cor * 1.1
            pr.p(x, y, cor)
    # Quina de pedra (cunhais) iluminada pelo poente.
    for y in range(4, chao_t):
        fi = y // 6
        larg = 7 if fi % 2 else 5
        for x in range(x0, x0 + larg):
            cor = "#d0a8a8" if x == x0 else "#9a8494" if x < x0 + 3 else "#76687c"
            if y % 6 == 5:
                cor = "#3a3040"
            pr.p(x, y, cor)
    # Embasamento de pedra.
    parede_de_pedra(pr, x0, x1, chao_t - 6, chao_t, seed=251, tons=("#a89aa8", "#857890", "#625a76", "#433e5a"), alt=3, larg=7)

    # Letreiro "CORREIO" em madeira, com letras douradas.
    lx0, ly0 = 305, 58
    pr.ret(lx0 - 3, ly0 - 2, 35, 10, "#5a3420")
    pr.ret(lx0 - 3, ly0 - 2, 35, 1, "#9a6a3c")
    pr.ret(lx0 - 3, ly0 + 7, 35, 1, "#2e1a10")
    for (px_, py_) in ((lx0 - 2, ly0 - 1), (lx0 + 30, ly0 - 1), (lx0 - 2, ly0 + 5), (lx0 + 30, ly0 + 5)):
        pr.p(px_, py_, "#e8c060")
    letreiro(pr, "CORREIO", lx0 + 1, ly0, "#f4c858", "#2a160c")
    # Toldo listrado com borda recortada.
    tx0, tx1, ty0, ty1 = 284, 366, 69, 78
    for y in range(ty0, ty1):
        t = (y - ty0) / (ty1 - ty0)
        for x in range(tx0 - int(t * 3), tx1 + int(t * 3)):
            faixa = ((x - tx0) // 6) % 2
            cor = mistura("#d84a3a" if faixa else "#f0e2c8", "#000000", 0.25 * t if faixa else 0.15 * t)
            if y == ty0:
                cor = hexa("#6a2a20")
            pr.p(x, y, cor)
    for x in range(tx0 - 3, tx1 + 3):
        faixa = ((x - tx0) // 6) % 2
        if (x - tx0) % 6 in (1, 2, 3, 4):
            pr.p(x, ty1, "#b83a2e" if faixa else "#d8c8ac")
            if (x - tx0) % 6 in (2, 3):
                pr.p(x, ty1 + 1, "#a8322a" if faixa else "#c8b89c")
    pr.ret(tx0 - 3, ty1 + 2, tx1 - tx0 + 6, 1, "#1a1020", 0.35)

    # Guichê: abertura com o interior aceso (escaninhos cheios de cartas e um lampião lá dentro).
    gx0, gx1, gy0, gy1 = 290, 360, 81, 112
    pr.ret(gx0 - 3, gy0 - 2, gx1 - gx0 + 6, gy1 - gy0 + 2, "#e8dcc0")
    pr.ret(gx0 - 3, gy0 - 2, 1, gy1 - gy0 + 2, "#fff4e0")
    interior = np.zeros((H, W, 3), dtype=np.float32) + hexa("#a86a3c")
    luz_int = np.exp(-(((_XS - 325) / 40) ** 2 + ((_YS - 86) / 22) ** 2))
    interior = interior * (0.55 + 0.6 * luz_int)[:, :, None]
    caixa = np.zeros((H, W), dtype=np.float32)
    caixa[gy0:gy1, gx0:gx1] = 1
    fundo_int.mascara(caixa, interior)
    # escaninhos
    for cy0 in range(gy0 + 4, gy0 + 22, 5):
        for cx0 in range(gx0 + 4, gx1 - 4, 6):
            fundo_int.ret(cx0, cy0, 5, 4, "#4a2814")
            fundo_int.ret(cx0, cy0, 5, 1, "#c88a50")
            k = hash01(cx0, cy0, 261)
            if k > 0.25:
                cor = ["#f4ead4", "#fff6e0", "#f0c8c8", "#d8e4f4", "#f4e0a8"][int(k * 5) % 5]
                fundo_int.ret(cx0 + 1, cy0 + 1 + (k > 0.6), 3 if k > 0.5 else 2, 2, cor)
            if k > 0.8:
                fundo_int.ret(cx0 + 3, cy0, 1, 3, "#e8d8b8")
    fundo_int.ret(gx0 + 2, gy0 + 3, gx1 - gx0 - 4, 1, "#5a3018")
    fundo_int.ret(gx0 + 2, gy0 + 23, gx1 - gx0 - 4, 2, "#5a3018")
    # lampião pendurado lá dentro
    fundo_int.ret(324, gy0, 1, 3, "#3a2010")
    fundo_int.ret(322, gy0 + 3, 5, 5, "#fff2c0")
    fundo_int.ret(323, gy0 + 4, 3, 3, "#ffffff")
    luzes.append((325, 100, 54, 0.75, "#ffaa50", 0.55))
    # pacotes nas prateleiras de baixo
    for (px_, w_, h_) in ((gx0 + 4, 9, 5), (gx0 + 14, 7, 4), (gx1 - 18, 11, 6)):
        fundo_int.ret(px_, gy1 - 3 - h_, w_, h_, "#b07a48")
        fundo_int.ret(px_ + w_ // 2, gy1 - 3 - h_, 1, h_, "#e8d0a0")
        fundo_int.ret(px_, gy1 - 3 - h_ // 2 - 1, w_, 1, "#e8d0a0")

    # Balcão de madeira com mísulas.
    bx0, bx1, by = 286, 364, 112
    pr2.ret(bx0, by, bx1 - bx0, 5, "#7a4a2a")
    pr2.ret(bx0, by, bx1 - bx0, 1, "#d8a46a")
    pr2.ret(bx0, by + 1, bx1 - bx0, 1, "#a8703e")
    pr2.ret(bx0, by + 4, bx1 - bx0, 1, "#3a2010")
    for kx in (bx0 + 6, bx1 - 9):
        for j in range(5):
            pr2.ret(kx + j // 2, by + 5 + j, 4 - j // 2, 1, "#5a3420")
    it = Camada()
    # Em cima do balcão: maço de cartas amarrado, pacotes com barbante, a carta lacrada, sineta, tinteiro e pena.
    for i in range(6):
        envelope(pr, bx0 + 3 + (i % 2), by - 2 - i * 2, 13, 4, ["#f4ead4", "#e8dcc4", "#f8e8d8", "#e0e8f4"][i % 4], "#b8a888")
    it.ret(bx0 + 9, by - 13, 1, 13, "#8a6a44")
    it.ret(bx0 + 3, by - 7, 14, 1, "#8a6a44")
    it.p(bx0 + 9, by - 7, "#c8a070")
    for (px_, py_, w_, h_) in ((bx0 + 20, by - 9, 14, 9), (bx0 + 22, by - 16, 10, 7)):
        it.ret(px_, py_, w_, h_, "#b8845a")
        it.ret(px_, py_, w_, 1, "#e0b080")
        it.ret(px_ + w_ - 2, py_, 2, h_, "#8a5a36")
        it.ret(px_ + w_ // 2, py_, 1, h_, "#f0e0c0")
        it.ret(px_, py_ + h_ // 2, w_, 1, "#f0e0c0")
        it.ret(px_ + 2, py_ + 2, 4, 2, "#f4f0e4")  # etiqueta
        it.p(px_ + 3, py_ + 2, "#6a6a8a")
    # A carta lacrada em destaque, inclinada sobre o balcão.
    ex_, ey_ = 328, by - 9
    it.poligono([(ex_, ey_ + 3), (ex_ + 19, ey_), (ex_ + 20, ey_ + 9), (ex_ + 1, ey_ + 12)], "#fbf2dc")
    it.poligono([(ex_, ey_ + 3), (ex_ + 19, ey_), (ex_ + 10, ey_ + 7)], "#efe2c4")
    it.linha(ex_, ey_ + 3, ex_ + 10, ey_ + 7, "#b8a682")
    it.linha(ex_ + 10, ey_ + 7, ex_ + 19, ey_, "#b8a682")
    it.linha(ex_ + 1, ey_ + 12, ex_ + 20, ey_ + 9, "#a89672")
    it.disco(ex_ + 10, ey_ + 7, 3.2, ("#ff6a5a", "#c8262a", "#7a1018"))
    it.disco(ex_ + 10, ey_ + 7, 1.6, ("#a01a20", "#a01a20", "#7a1018"))
    it.p(ex_ + 9, ey_ + 5, "#ffc0b0")
    it.ret(ex_ + 9, ey_ + 10, 1, 4, "#c8262a")
    it.ret(ex_ + 11, ey_ + 10, 1, 3, "#a01a20")
    # sineta de balcão
    it.ret(349, by - 1, 7, 1, "#5a3a20")
    for j, m_ in enumerate((1, 2, 3, 3)):
        for dx in range(-m_, m_ + 1):
            it.p(352 + dx, by - 5 + j, "#fff0a0" if dx < 0 else "#d8a040" if dx < 2 else "#8a5a1a")
    it.p(352, by - 6, "#d8a040")
    # tinteiro e pena
    it.ret(357, by - 4, 4, 4, "#1a2440")
    it.ret(357, by - 4, 1, 4, "#4a5a8a")
    it.ret(357, by - 5, 4, 1, "#c8a050")
    for j in range(9):
        xq = 359 + j * 0.35
        it.p(xq, by - 6 - j, "#f4f0ea")
        if 2 < j < 8:
            it.p(xq + 1, by - 6 - j, "#d8d4ce")
            it.p(xq - 1, by - 6 - j + 1, "#ffffff", 0.7)
    colar(pr2, it, "#2a1610", 0.75)
    brilho(em, 344, by - 9, 2, "#fff0d0")
    # Lanternas penduradas nas mãos-francesas.
    for (lx_, lado) in ((280, -1), (370, 1)):
        pr2.ret(lx_ - lado * 4, 66, 6, 1, "#2a2030")
        pr2.linha(lx_ - lado * 4, 66, lx_ - lado * 4, 70, "#2a2030")
        pr2.ret(lx_, 67, 1, 4, "#2a2030")
        pr2.ret(lx_ - 3, 71, 7, 1, "#2a2030")
        pr2.ret(lx_ - 2, 70, 5, 1, "#2a2030")
        em.ret(lx_ - 2, 72, 5, 7, "#ffcf70")
        em.ret(lx_ - 1, 73, 3, 5, "#fff2c8")
        pr2.ret(lx_, 72, 1, 7, "#3a2a2a", 0.5)
        pr2.ret(lx_ - 3, 79, 7, 1, "#2a2030")
        pr2.p(lx_, 80, "#2a2030")
        luzes.append((lx_, 76, 30, 0.9, "#ffb058", 0.55))

    # Porta com bandeira acesa e a corneta do correio em cima.
    dx0, dx1, dy0 = 374, 398, 74
    pr.ret(dx0 - 2, dy0 - 2, dx1 - dx0 + 4, chao_t - dy0 + 2, "#e8dcc0")
    for x in range(dx0, dx1):
        for y in range(dy0, chao_t):
            pr.p(x, y, "#6a3a22" if (x - dx0) % 6 else "#4a2614")
    fundo_int.ret(dx0 + 3, dy0 + 3, dx1 - dx0 - 6, 9, "#ffbf6a")
    fundo_int.ret(dx0 + 4, dy0 + 4, 5, 3, "#fff0c8")
    pr2.ret(dx0 + 3 + (dx1 - dx0 - 6) // 2, dy0 + 3, 1, 9, "#4a2614")
    pr2.ret(dx0 + 2, dy0 + 17, dx1 - dx0 - 4, 1, "#3a2010")
    pr2.ret(dx0 + 2, dy0 + 30, dx1 - dx0 - 4, 1, "#3a2010")
    pr2.disco(dx1 - 5, 98, 1.3, ("#fff0a0", "#d8a040", "#8a5a1a"))
    luzes.append((386, 82, 16, 1.0, "#ffaa50", 0.3))
    pr2.ret(dx0 - 4, chao_t, dx1 - dx0 + 8, 2, "#b8a8b0")
    pr2.ret(dx0 - 4, chao_t, dx1 - dx0 + 8, 1, "#e0d0d0")
    # Corneta postal (enrolada) em latão sobre a porta.
    hx, hy = 386, 66
    for k in range(40):
        a = k / 40 * math.tau
        pr2.p(hx + math.cos(a) * 3.2, hy + math.sin(a) * 2.6, "#f0c050" if math.sin(a) < 0 else "#a87020")
    pr2.linha(hx + 3, hy, hx + 9, hy - 1, "#e0b040")
    pr2.poligono([(hx + 8, hy - 3), (hx + 12, hy - 4), (hx + 12, hy + 2), (hx + 8, hy + 1)], "#e8b848")
    pr2.p(hx + 11, hy - 3, "#fff0a0")
    pr2.linha(hx - 3, hy, hx - 7, hy + 1, "#c89030")

    # Quadro de avisos com papéis pregados.
    qx0, qx1, qy0, qy1 = 404, 442, 74, 106
    pr2.ret(qx0 - 2, qy0 - 2, qx1 - qx0 + 4, qy1 - qy0 + 4, "#5a3420")
    pr2.ret(qx0 - 2, qy0 - 2, qx1 - qx0 + 4, 1, "#9a6a3c")
    for y in range(qy0, qy1):
        for x in range(qx0, qx1):
            pr2.p(x, y, "#b08050" if hash01(x, y, 271) > 0.3 else "#946a40")
    pr2.ret(qx0 + 2, qy0 - 6, qx1 - qx0 - 4, 3, "#4a2a18")  # telhadinho do quadro
    pr2.ret(qx0 + 2, qy0 - 6, qx1 - qx0 - 4, 1, "#7a4a2a")
    papeis = ((qx0 + 2, qy0 + 2, 10, 12, "#f4ecd8"), (qx0 + 14, qy0 + 1, 9, 8, "#fff4b0"), (qx0 + 25, qy0 + 3, 10, 11, "#f8f4ec"),
              (qx0 + 13, qy0 + 11, 11, 10, "#d8e8f8"), (qx0 + 3, qy0 + 17, 9, 11, "#f8d8e0"), (qx0 + 26, qy0 + 17, 9, 12, "#f4ecd8"),
              (qx0 + 15, qy0 + 23, 8, 7, "#e0f0d0"))
    for i, (px_, py_, w_, h_, cor) in enumerate(papeis):
        pr2.ret(px_ + 1, py_ + 1, w_, h_, "#3a2414", 0.5)
        pr2.ret(px_, py_, w_, h_, cor)
        for ly in range(py_ + 3, py_ + h_ - 1, 2):
            pr2.ret(px_ + 1, ly, w_ - 2 - (ly * 7 + i) % 4, 1, "#8a7a6a", 0.75)
        pr2.ret(px_ + 1, py_ + 1, w_ - 4, 1, "#3a3040")
        pr2.p(px_ + w_ // 2, py_, ["#e03a3a", "#3a6ae0", "#e0c03a", "#3ab05a"][i % 4])
    # um papel com um desenho de ampulheta (o simulado da semana)
    for (dx, dy) in ((2, 4), (3, 4), (4, 4), (5, 4), (6, 4), (3, 5), (5, 5), (4, 6), (3, 7), (5, 7), (2, 8), (3, 8), (4, 8), (5, 8), (6, 8)):
        pr2.p(qx0 + 25 + dx, qy0 + 3 + dy, "#c8902e")
    # Vitrine à direita com pacotes lá dentro.
    vx0, vy0, vy1 = 448, 74, 112
    pr.ret(vx0 - 2, vy0 - 2, W - vx0 + 2, vy1 - vy0 + 4, "#e8dcc0")
    vit = np.zeros((H, W), dtype=np.float32)
    vit[vy0:vy1, vx0:W] = 1
    fundo_int.mascara(vit, interior * 1.05)
    for (px_, py_, w_, h_) in ((vx0 + 3, vy1 - 9, 12, 9), (vx0 + 6, vy1 - 16, 8, 7), (vx0 + 18, vy1 - 12, 10, 12), (vx0 + 20, vy1 - 18, 7, 6)):
        fundo_int.ret(px_, py_, w_, h_, "#8a5a34")
        fundo_int.ret(px_, py_, w_, 1, "#d8a46a")
        fundo_int.ret(px_ + w_ // 2, py_, 1, h_, "#e8d0a0")
    for xx in range(vx0, W, 11):
        pr2.ret(xx, vy0, 1, vy1 - vy0, "#e8dcc0")
    pr2.ret(vx0, vy0 + 18, W - vx0, 1, "#e8dcc0")
    em.ret(vx0 + 2, vy0 + 2, 2, 12, "#fff6dc", 0.6)
    luzes.append((462, 96, 40, 0.8, "#ffaa50", 0.5))

    # ── O pombal na parede do sobrado, com os pombos.
    pb = Camada()
    px0, px1, py0, py1 = 404, 452, 18, 46
    pb.ret(px0, py0, px1 - px0, py1 - py0, "#c8a478")
    pb.ret(px1 - 4, py0, 4, py1 - py0, "#8a6a48")
    pb.ret(px0, py0, 1, py1 - py0, "#f0d0a0")
    pb.ret(px0, (py0 + py1) // 2, px1 - px0, 1, "#8a7a6a")
    for x in range(px0 + 1, px1 - 4, 6):
        pb.ret(x, py0, 1, py1 - py0, "#a88458")
    pb.poligono([(px0 - 4, py0 + 1), ((px0 + px1) / 2, py0 - 10), (px1 + 4, py0 + 1)], "#3e5a8a")
    pb.linha(px0 - 4, py0 + 1, (px0 + px1) / 2, py0 - 10, "#7aa0d0")
    pb.ret(px0 - 4, py0 + 1, px1 - px0 + 8, 1, "#24385a")
    for yy in (py0 + 6, py0 + 20):
        for k, xx in enumerate((px0 + 8, px0 + 22, px0 + 36)):
            pb.elipse(xx, yy, 2.8, 3.2, "#3a2414")
            pb.elipse(xx - 0.5, yy + 0.5, 2.0, 2.4, "#1a0e08")
            pb.ret(xx - 4, yy + 5, 9, 1, "#7a5a3a")
            pb.ret(xx - 4, yy + 5, 9, 1, "#a07a50", 0.6)
    pb.ret(px0 + 8, py1, 3, 8, "#5a3a26")  # mão-francesa
    pb.linha(px0 + 8, py1 + 8, px0 + 18, py1, "#5a3a26")
    pb.ret(px1 - 10, py1, 3, 8, "#5a3a26")
    for (xx, yy, pose, v) in ((px0 + 22, py0 + 20, "espiando", 1), (px0 + 8, py0 + 24, "sentado", -1), (px0 + 36, py0 + 10, "sentado", 1),
                              ((px0 + px1) / 2 + 2, py0 - 9, "sentado", 1)):
        ave = Camada()
        pombo(ave, xx, yy, pose, v)
        colar(pb, ave, "#1e1a26", 0.85)

    # ── Caixa de correio vermelha na calçada, com um pombo em cima; saco de cartas e caixote de pacotes.
    cx_, base_c = 252, 136
    pr_frente = Camada()
    pr_frente.ret(cx_ - 2, base_c - 10, 5, 10, "#2a2030")
    pr_frente.ret(cx_ - 5, base_c - 2, 11, 2, "#2a2030")
    for y in range(base_c - 40, base_c - 10):
        for x in range(cx_ - 8, cx_ + 9):
            dx = x - cx_
            topo_arco = base_c - 40 + (dx / 8) ** 2 * 5
            if y < topo_arco:
                continue
            u = dx / 8
            cor = "#ff8a7a" if u < -0.6 else "#e03a36" if u < 0.1 else "#a8222a" if u < 0.65 else "#6e1420"
            pr_frente.p(x, y, cor)
    pr_frente.ret(cx_ - 8, base_c - 12, 17, 2, "#5a1018")
    pr_frente.ret(cx_ - 5, base_c - 31, 11, 2, "#2a0a10")
    pr_frente.ret(cx_ - 5, base_c - 32, 11, 1, "#f0c050")
    pr_frente.ret(cx_ - 4, base_c - 24, 9, 6, "#f0c050")  # envelope dourado em relevo
    pr_frente.ret(cx_ - 3, base_c - 23, 7, 4, "#c8902e")
    for i in range(4):
        pr_frente.p(cx_ - 3 + i, base_c - 23 + i, "#fff0a0")
        pr_frente.p(cx_ + 3 - i, base_c - 23 + i, "#fff0a0")
    pr_frente.p(cx_ - 6, base_c - 36, "#ffd0c8")
    pr_frente.ret(cx_ - 7, base_c - 30, 1, 14, "#ffb0a0", 0.7)
    ave = Camada()
    pombo(ave, cx_ + 1, base_c - 43, "sentado", 1)
    colar(pr_frente, ave, "#1e1a26", 0.85)
    # Saco de cartas de estopa, amarrado, com cartas aparecendo na boca.
    saco = Camada()
    sx_, sy_ = 412, 131
    for y in range(sy_ - 14, sy_):
        t = (y - sy_ + 14) / 14
        meia = 3 + 6 * math.sin(min(1, t * 1.25) * math.pi / 2) if t > 0.18 else 4 - t * 6
        for x in range(int(sx_ - meia), int(sx_ + meia) + 1):
            u = (x - sx_) / max(meia, 1)
            cor = "#d8bc8a" if u < -0.35 else "#b8966a" if u < 0.35 else "#86683e"
            if (x + y) % 4 == 0:
                cor = mistura(cor, "#5a4428", 0.3)
            saco.p(x, y, cor)
    saco.ret(sx_ - 3, sy_ - 12, 7, 1, "#6a3a20")
    saco.ret(sx_ + 2, sy_ - 11, 1, 3, "#6a3a20")
    envelope(saco, sx_ - 6, sy_ - 19, 7, 5, "#fff6e4", "#c8b898", selo=True)
    envelope(saco, sx_ - 1, sy_ - 20, 7, 5, "#e0e8f8", "#a8b0c8")
    envelope(saco, sx_ + 2, sy_ - 17, 6, 4, "#f8e0e4", "#c8a8b0")
    colar(pr_frente, saco, "#2a1a10", 0.8)
    # caixote com pacotes sob a lanterna da esquerda
    kx, ky = 272, 131
    pr_frente.ret(kx, ky - 9, 14, 9, "#8a5a32")
    pr_frente.ret(kx, ky - 9, 14, 1, "#c08a50")
    for k in (0, 6, 13):
        pr_frente.ret(kx + k, ky - 9, 1, 9, "#5a3a1a")
    pr_frente.ret(kx, ky - 5, 14, 1, "#5a3a1a")
    pr_frente.ret(kx + 2, ky - 14, 8, 5, "#c89a68")
    pr_frente.ret(kx + 5, ky - 14, 1, 5, "#f0e0c0")
    pr_frente.ret(kx + 2, ky - 12, 8, 1, "#f0e0c0")
    # A bicicleta do carteiro encostada sob o balcão, com a cesta cheia de cartas.
    bici = Camada()
    for (rx_, ry_) in ((298, 125), (324, 125)):
        for k in range(64):
            a_ = k / 64 * math.tau
            bici.p(rx_ + math.cos(a_) * 6.5, ry_ + math.sin(a_) * 6.5, "#1e1a26")
            bici.p(rx_ + math.cos(a_) * 5.6, ry_ + math.sin(a_) * 5.6, "#3a3646", 0.7)
        for k in range(0, 8):
            a_ = k / 8 * math.pi
            bici.linha(rx_ - math.cos(a_) * 5, ry_ - math.sin(a_) * 5, rx_ + math.cos(a_) * 5, ry_ + math.sin(a_) * 5, "#8a8aa0", 0.5)
        bici.p(rx_, ry_, "#c8c8d8")
    for (a_, b_) in (((298, 125), (308, 125)), ((308, 125), (304, 115)), ((304, 115), (319, 115)), ((319, 115), (308, 125)),
                     ((319, 115), (324, 125)), ((304, 115), (303, 112)), ((319, 115), (320, 110))):
        bici.linha(a_[0], a_[1], b_[0], b_[1], "#2e6a8a", grossura=1)
    bici.ret(300, 111, 6, 1, "#3a2418")
    bici.ret(318, 109, 6, 1, "#2a2030")
    bici.ret(321, 104, 9, 6, "#a87a48")  # cesta
    for k in range(321, 330, 2):
        bici.ret(k, 104, 1, 6, "#7a5230")
    envelope(bici, 322, 101, 5, 4, "#fff6e4", "#c8b898")
    envelope(bici, 325, 100, 5, 4, "#f8e0e4", "#c8a8b0", selo=True)
    colar(pr_frente, bici, "#141018", 0.5)
    # Pombo voando e duas cartas levadas pelo vento (rumo ao texto, à esquerda).
    pombo(pr_frente, 236, 40, "voando", -1)
    pombo(pr_frente, 384, 28, "voando", 1)
    for (ex2, ey2) in ((226, 58), (214, 76)):
        envelope(pr_frente, ex2, ey2, 7, 5, "#fbf2dc", "#cdbb98", selo=True)

    # ── Vasos de flores na calçada e primeiro plano desfocado.
    vasos = Camada()
    flores = ["#f4a7c4", "#ffe07a", "#c8a8f8", "#ffffff", "#f07a6a"]
    for (vx, vy) in ((364, 131), (440, 131)) if PERIODO is None else ((440, 131),):
        vasos.ret(vx - 4, vy - 6, 9, 6, "#a8583a")
        vasos.ret(vx - 4, vy - 6, 9, 1, "#d08060")
        vasos.ret(vx + 3, vy - 5, 1, 5, "#6a3020")
        vasos.disco(vx, vy - 9, 5, ("#7aa85a", "#4e8040", "#2e5a2e"))
        for k in range(8):
            vasos.p(vx - 4 + hash01(vx, k) * 9, vy - 13 + hash01(k, vy) * 7, flores[k % 5])
    frente = Camada()
    frente.disco(478, 168, 26, ("#4a6a3a", "#2e4a2a", "#1a2e1a"))
    for k in range(10):
        frente.ret(462 + hash01(k, 1) * 18, 146 + hash01(k, 2) * 10, 3, 3, flores[k % 5])
    frente.disco(-6, 170, 24, ("#3a3a4a", "#2a2a38", "#1a1a26"))
    vaga = Camada()
    g = np.random.default_rng(281)
    for _ in range(16):
        vaga.p(250 + g.random() * 230, 60 + g.random() * 80, "#fff0b0", 0.35 + g.random() * 0.4)

    if PERIODO is not None:
        return montar_correio_hora(ceu, longe, e_longe, meio_c, e_meio, rua, pr, fundo_int, pr2, pb, vasos, pr_frente,
                                   em, vaga, frente, luzes)
    # ── Montagem.
    m = Montagem(ceu)
    m.camada(longe, 1.6)
    m.emissivo(e_longe, 1.0, halo=0.5)
    m.camada(meio_c, 0.8)
    m.emissivo(e_meio, 0.5, halo=0.5)
    m.camada(rua, 0.2)
    m.camada(pr)
    m.camada(fundo_int, solida=False)
    m.camada(pr2)
    m.camada(pb)
    m.camada(vasos)
    m.camada(pr_frente)
    poente = [(190, 108, 220, 0.5, "#ff9070", 0.32), (268, 60, 40, 1.2, "#ffa080", 0.25),
              (325, 124, 70, 0.3, "#ffa050", 0.45), (255, 112, 30, 0.8, "#ffb070", 0.2)]
    m.iluminar("#545890", luzes + poente)
    m.emissivo(em, 0, halo=0.35)
    # Poças na rua depois da chuva da tarde, refletindo o correio aceso.
    pocas = ((ruido(291, 30, 6) > 0.52) & (_YS > 136) & (_XS > 236)).astype(np.float32)
    pocas = np.maximum(pocas, ((ruido(292, 18, 4) > 0.7) & (_YS > 140) & (_XS > 120)).astype(np.float32) * 0.7)
    m.reflexo(133.5, pocas, 0.72, 1.2)
    m.emissivo(vaga, 0, halo=1.0)
    m.camada(frente, 6, escurecer=0.45)
    return m.acabar("#ffd8a8", "#1a1a48", esquerda=0.4, centro_v=(0.66, 0.55))


CENAS = {"torre": cena_torre, "bau": cena_bau, "correio": cena_correio}


def salvar_pagina(img: Image.Image, nome: str) -> None:
    PASTA_PAGINAS.mkdir(parents=True, exist_ok=True)
    destino = PASTA_PAGINAS / f"{nome}.webp"
    img.save(destino, quality=84, method=6)
    img.resize((960, 320), Image.LANCZOS).save(PASTA_PAGINAS / f"{nome}-960.webp", quality=84, method=6)
    print(nome, destino.stat().st_size // 1024, "KB,", (PASTA_PAGINAS / f"{nome}-960.webp").stat().st_size // 1024, "KB (960)")


def main() -> None:
    """Sem argumentos: as três seções da página inicial (public/pixel/inicio/secao-*).
    Com --paginas: as versões das páginas internas em public/pixel/paginas/<cena>-<manha|tarde|noite>(-960).webp;
    dá para pedir só algumas cenas e/ou horas (ex.: --paginas torre noite)."""
    global PERIODO
    args = sys.argv[1:]
    if "--paginas" in args:
        resto = [a for a in args if a != "--paginas"]
        cenas = [a for a in resto if a in CENAS] or list(CENAS)
        horas = [a for a in resto if a in PERIODOS] or list(PERIODOS)
        for nome in cenas:
            for p in horas:
                PERIODO = p
                salvar_pagina(CENAS[nome](), f"{nome}-{p}")
        PERIODO = None
        return
    PASTA.mkdir(parents=True, exist_ok=True)
    pedidas = args or list(CENAS)
    for nome in pedidas:
        img = CENAS[nome]()
        destino = PASTA / f"secao-{nome}.webp"
        img.save(destino, quality=82, method=6)
        img.resize((960, 320), Image.LANCZOS).save(PASTA / f"secao-{nome}-960.webp", quality=82, method=6)
        print(nome, destino.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
