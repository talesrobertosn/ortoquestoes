"""O mascote do Orto Questões: um esqueletinho chibi (refeito do zero em 30/10/2026, a pedido do Tales).

Feito do zero por este script (nada baixado nem de IA). É um esqueleto ARTICULADO em proporção chibi: crânio
enorme e redondo, olhos grandes com luz e brilho, bochechas rosadas, sorriso de dentinhos, caixa torácica pequena
e fofa, ossos curtos com as pontas arredondadas e mãos de três dedos. Cada peça tem volume (luz de cima à esquerda),
contorno grosso e limpo e um tom de oclusão por dentro. Cada comportamento é uma função de pose (com cinemática
inversa nos braços) mais os objetos da cena.

Gera public/pixel/mascote/esqueleto.webp (uma linha por comportamento, QUADROS quadros) e
src/componentes/mascote/comportamentos.ts (a lista, para o componente Mascote, reaproveitável em qualquer página).
Uso: python3 scripts/gerar_mascote.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]
L, A, QUADROS = 120, 136, 12
# Resolução: cada unidade das poses vira ESC pixels (o desenho é feito em 2x para caber muito mais detalhe).
ESC = 2
LP, AP = L * ESC, A * ESC
LUZ = np.array([-0.55, -0.62, 0.56])
LUZ /= np.linalg.norm(LUZ)

OSSO = ["#8a7258", "#c4ad86", "#e6d6b2", "#f8eed6", "#fffdf6"]
CONTORNO = "#3a2414"


def rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


class Quadro:
    """Uma tela com pintura por camadas: cada peça é rasterizada numa máscara, sombreada e contornada sozinha."""

    def __init__(self) -> None:
        self.c = np.zeros((AP, LP, 4), dtype=np.uint8)

    def peca(self, mascara: np.ndarray, tons: np.ndarray | None, paleta: list[str], contorno: str | None = CONTORNO, cor_unica: str | None = None) -> None:
        if not mascara.any():
            return
        if cor_unica:
            self.c[mascara] = (*rgb(cor_unica), 255)
        else:
            idx = np.clip(tons, 0, len(paleta) - 1).astype(int)
            cores = np.array([rgb(p) for p in paleta], dtype=np.uint8)
            self.c[mascara, :3] = cores[idx[mascara]]
            self.c[mascara, 3] = 255
        if contorno:
            er = lambda m: m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)
            d1 = er(mascara)
            d2 = er(d1)
            borda = mascara & ~d2  # contorno de 2 pixels: traço limpo de desenho
            anel = d2 & ~er(er(d2))
            if not cor_unica and tons is not None:
                cores = np.array([rgb(p) for p in paleta], dtype=np.uint8)
                idx = np.clip(np.clip(tons, 0, len(paleta) - 1).astype(int) - 1, 0, len(paleta) - 1)
                self.c[anel, :3] = cores[idx[anel]]
            self.c[borda] = (*rgb(contorno), 255)

    def px(self, x: float, y: float, cor: str, a: int = 255, fino: bool = False) -> None:
        """Um pixel das poses (bloco ESC x ESC) ou, com fino=True, um pixel de verdade da tela em alta resolução."""
        n = 1 if fino else ESC
        xi, yi = int(round(x * ESC)), int(round(y * ESC))
        for dy in range(n):
            for dx in range(n):
                if 0 <= xi + dx < LP and 0 <= yi + dy < AP:
                    self.c[yi + dy, xi + dx] = (*rgb(cor), a)


YI, XI = np.mgrid[0:AP, 0:LP]
YS, XS = (YI.astype(np.float32) + 0.5) / ESC, (XI.astype(np.float32) + 0.5) / ESC


def tom_de(nx: np.ndarray, ny: np.ndarray, nz: np.ndarray, n: int = 5) -> np.ndarray:
    i = nx * LUZ[0] + ny * LUZ[1] + nz * LUZ[2]
    return np.clip((i * 0.5 + 0.5) * n * 1.15 - 0.35, 0, n - 1)


def capsula(a, b, ra: float, rb: float | None = None):
    """Máscara e tons de um osso longo de a até b (raio de ra a rb), com volume cilíndrico."""
    rb = ra if rb is None else rb
    ax, ay = a
    bx, by = b
    vx, vy = bx - ax, by - ay
    comp2 = vx * vx + vy * vy or 1e-6
    t = np.clip(((XS - ax) * vx + (YS - ay) * vy) / comp2, 0, 1)
    px, py = ax + t * vx, ay + t * vy
    dx, dy = XS - px, YS - py
    r = ra + (rb - ra) * t
    d = np.sqrt(dx * dx + dy * dy)
    m = d <= r
    s = np.where(r > 0, d / np.maximum(r, 1e-3), 0)
    nz = np.sqrt(np.clip(1 - s * s, 0, 1))
    nx = np.where(d > 0, dx / np.maximum(d, 1e-3), 0) * s
    ny = np.where(d > 0, dy / np.maximum(d, 1e-3), 0) * s
    return m, tom_de(nx, ny, nz)


def elipse(c, rx: float, ry: float, ang: float = 0.0):
    cx, cy = c
    ca, sa = math.cos(ang), math.sin(ang)
    x, y = (XS - cx) * ca + (YS - cy) * sa, -(XS - cx) * sa + (YS - cy) * ca
    u, v = x / rx, y / ry
    d2 = u * u + v * v
    m = d2 <= 1
    nz = np.sqrt(np.clip(1 - d2, 0, 1))
    nx, ny = u * ca - v * sa, u * sa + v * ca
    return m, tom_de(nx, ny, nz)


def uniao(*partes):
    m = np.zeros((AP, LP), bool)
    t = np.zeros((AP, LP), np.float32)
    for pm, pt in partes:
        t = np.where(pm & ~m, pt, t)
        m |= pm
    return m, t


def osso_longo(q: Quadro, a, b, r: float, cabeca: float = 1.5) -> None:
    """Diáfise mais fina e epífises arredondadas nas pontas (fêmur, úmero, tíbia)."""
    q.peca(*uniao(capsula(a, b, r * 0.72), elipse(a, r * cabeca * 0.9, r * cabeca * 0.8), elipse(b, r * cabeca, r * cabeca * 0.85)), OSSO)


def ik(ombro, alvo, l1: float, l2: float, lado: float):
    """Cinemática inversa de dois ossos: devolve o cotovelo (ou joelho) dobrando para `lado`."""
    ox, oy = ombro
    tx, ty = alvo
    dx, dy = tx - ox, ty - oy
    d = min(math.hypot(dx, dy), l1 + l2 - 0.01)
    base = math.atan2(dy, dx)
    cos_a = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
    a = math.acos(max(-1, min(1, cos_a)))
    ang = base + a * lado
    cot = (ox + l1 * math.cos(ang), oy + l1 * math.sin(ang))
    fim = (cot[0] + l2 * math.cos(math.atan2(ty - cot[1], tx - cot[0])), cot[1] + l2 * math.sin(math.atan2(ty - cot[1], tx - cot[0])))
    return cot, fim


# ─────────────────────────────── As peças do corpo (chibi) ───────────────────────────────
def osso_fofo(q: Quadro, a, b, r: float) -> None:
    """Osso curto com as duas pontas em bolinha (o osso de desenho animado)."""
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    px_, py_ = -math.sin(ang) * r * 0.75, math.cos(ang) * r * 0.75
    q.peca(*uniao(capsula(a, b, r * 0.78), elipse((a[0] + px_, a[1] + py_), r * 0.85, r * 0.85), elipse((a[0] - px_, a[1] - py_), r * 0.85, r * 0.85),
                  elipse((b[0] + px_, b[1] + py_), r * 0.85, r * 0.85), elipse((b[0] - px_, b[1] - py_), r * 0.85, r * 0.85)), OSSO)


def desenhar_pernas(q: Quadro, p: dict) -> None:
    px_, py_ = p["pelve"]
    # pelve pequena em forma de borboleta
    q.peca(*uniao(elipse((px_ - 6, py_ - 1), 6.5, 4.6, 0.4), elipse((px_ + 6, py_ - 1), 6.5, 4.6, -0.4), elipse((px_, py_ + 1.5), 4, 3.6)), OSSO)
    for lado in (-1, 1):
        q.peca(elipse((px_ + lado * 5.5, py_ + 1), 1.8, 1.4)[0], None, OSSO, contorno=None, cor_unica="#5a4030")
    for lado in (-1, 1):
        quadril = (px_ + lado * 6, py_ + 3)
        joelho, tornozelo = p[f"joelho{lado}"], p[f"tornozelo{lado}"]
        osso_fofo(q, joelho, tornozelo, 2.8)
        osso_fofo(q, quadril, joelho, 3.1)
        # pezinho redondo apontando para a frente e para fora
        q.peca(*elipse((tornozelo[0] + lado * 2.5, tornozelo[1] + 3), 6, 3.4, lado * 0.15), OSSO)
        for k in range(3):
            q.px(tornozelo[0] + lado * (4 + k * 1.8), tornozelo[1] + 4.6, "#8a7258")


def desenhar_tronco(q: Quadro, p: dict) -> None:
    cx_, cy_ = p["peito"]
    # coluna curtinha entre a pelve e o tórax
    for k in range(2):
        q.peca(*elipse((cx_, cy_ + 12 + k * 3.4), 3.6, 1.8), OSSO)
    # caixa torácica fofa: a forma clara com três frestas escuras de cada lado e o esterno no meio
    q.peca(*elipse((cx_, cy_), 13, 11.5), OSSO)
    for k in range(3):
        for lado in (-1, 1):
            m, _ = elipse((cx_ + lado * 6.8, cy_ - 4.5 + k * 4.4), 4.6 - k * 0.5, 1.2, lado * 0.25)
            q.peca(m, None, OSSO, contorno=None, cor_unica="#4a3428")
    q.peca(*capsula((cx_, cy_ - 8), (cx_, cy_ + 6), 1.6), OSSO, contorno="#8a7258")
    # clavículas
    for lado in (-1, 1):
        q.peca(*capsula((cx_ + lado * 2, cy_ - 10), (cx_ + lado * 11, cy_ - 9), 1.4), OSSO)


def desenhar_cranio(q: Quadro, p: dict) -> None:
    cx, cy = p["cabeca"]
    inc = p.get("inclina", 0.0)
    boca = p.get("boca", 0.0)
    olhos = p.get("olhos", 1.0)
    olhar = p.get("olhar", (0.0, 0.0))
    ca, sa = math.cos(inc), math.sin(inc)
    rot = lambda dx, dy: (cx + dx * ca - dy * sa, cy + dx * sa + dy * ca)
    # pescoço
    q.peca(*uniao(elipse(rot(0, 25), 3.2, 2.6, inc), elipse(rot(0, 28.5), 3.4, 2.4, inc)), OSSO)
    # mandíbula (desce ao abrir a boca)
    q.peca(*elipse(rot(0, 17.5 + boca * 5), 14, 6.6, inc), OSSO)
    # crânio grande e redondo, com as maçãs do rosto
    q.peca(*uniao(elipse(rot(0, -2), 26, 22.5, inc), elipse(rot(-15, 9), 8.5, 7.5, inc), elipse(rot(15, 9), 8.5, 7.5, inc), elipse(rot(0, 11), 16, 8, inc)), OSSO)
    # brilho da calota (luz de cima à esquerda)
    for k in range(14):
        a_ = math.pi * (1.08 + k * 0.026)
        x, y = rot(math.cos(a_) * 19, -4 + math.sin(a_) * 16)
        q.px(x, y, "#ffffff"); q.px(x + 0.5, y + 0.5, "#fffdf6", fino=True)
    # boca: sorriso de dentinhos, ou aberta (falando, bocejando, mastigando)
    if boca > 0.12:
        q.peca(elipse(rot(0, 15 + boca * 2.6), 7 + boca * 1.5, 1.2 + boca * 3.4, inc)[0], None, OSSO, contorno="#3a2414", cor_unica="#4a1e24")
        q.peca(elipse(rot(0, 16 + boca * 4.5), 3.5, 1.2 + boca, inc)[0], None, OSSO, contorno=None, cor_unica="#d86a7a")
    for k in range(-2, 3):
        x, y = rot(k * 2.6, 13.6)
        q.peca(elipse((x, y), 1.1, 1.5, inc)[0], None, OSSO, contorno=None, cor_unica="#fffdf6")
        q.px(x + 1.3, y, "#8a7258", fino=True); q.px(x + 1.3, y + 0.5, "#8a7258", fino=True)
    # bochechas rosadas
    for lado in (-1, 1):
        x, y = rot(lado * 17, 8.5)
        q.peca(elipse((x, y), 3.4, 1.8, inc)[0], None, OSSO, contorno=None, cor_unica="#f2b0a6")
    # nariz em coraçãozinho de cabeça para baixo
    nx, ny = rot(0, 8.6)
    for (dx, dy) in ((-1, 0), (0, 0), (1, 0), (-0.5, 1), (0.5, 1), (0, 1.8)):
        q.px(nx + dx * 0.9, ny + dy * 0.9, "#3a2414")
    # olhos: órbitas grandes, a luz azul com brilho, piscando
    for lado in (-1, 1):
        ox, oy = rot(lado * 10.5, 1.5)
        q.peca(elipse((ox, oy), 7.6, 8.4, inc)[0], None, OSSO, contorno="#3a2414", cor_unica="#1c1426")
        if olhos > 0.5:
            gx, gy = ox + olhar[0] * 2.2, oy + 0.6 + olhar[1] * 2
            q.peca(*elipse((gx, gy), 3.9, 4.3), ["#127a90", "#1aa0b8", "#3cc8dc", "#7ff0ff", "#d8ffff"], contorno=None)
            q.peca(elipse((gx - 1.3, gy - 1.6), 1.3, 1.3)[0], None, OSSO, contorno=None, cor_unica="#ffffff")
            q.px(gx + 1.6, gy + 1.6, "#ffffff", fino=True); q.px(gx + 1.6, gy + 2.1, "#e8ffff", fino=True)
        else:
            for k in range(9):
                u = k / 8
                q.px(ox - 4 + u * 8, oy + 1.5 + math.sin(u * math.pi) * 1.8, "#7ff0ff" if olhos > 0.2 else "#3a8a9a")


def desenhar_braco(q: Quadro, ombro, mao, lado: int, pegada: str = "aberta", cotovelo_lado: float | None = None) -> tuple:
    cot, fim = ik(ombro, mao, 10, 9.5, cotovelo_lado if cotovelo_lado is not None else lado)
    osso_fofo(q, ombro, cot, 2.2)
    osso_fofo(q, cot, fim, 2.0)
    ang = math.atan2(fim[1] - cot[1], fim[0] - cot[0])
    desenhar_mao(q, fim, ang, pegada, lado)
    return cot, fim


def desenhar_mao(q: Quadro, punho, ang: float, pegada: str, lado: int) -> None:
    """Mãozinha redonda de três dedos (e o polegar)."""
    px_, py_ = punho
    c = (px_ + math.cos(ang) * 2.5, py_ + math.sin(ang) * 2.5)
    abre = {"aberta": 0.55, "pega": 0.3, "punho": 0.12, "aceno": 0.65}[pegada]
    comp = {"aberta": 3.6, "pega": 2.6, "punho": 1.6, "aceno": 3.9}[pegada]
    for k in range(3):
        a_ = ang + (k - 1) * abre
        q.peca(*capsula(c, (c[0] + math.cos(a_) * (3 + comp), c[1] + math.sin(a_) * (3 + comp)), 1.2), OSSO)
    a_ = ang - lado * 1.3
    q.peca(*capsula(c, (c[0] + math.cos(a_) * 4, c[1] + math.sin(a_) * 4), 1.15), OSSO)
    q.peca(*elipse(c, 3.6, 3.3, ang), OSSO)


def desenhar_estetoscopio(q: Quadro, p: dict, peito=None) -> None:
    cx_, cy_ = p["peito"]
    tubo = ["#1a1a22", "#2a2a36", "#3a3a4a", "#55556a", "#7a7a90"]
    pts = [(cx_ - 9 + 18 * u, cy_ - 11 + 5 * math.sin(u * math.pi)) for u in np.linspace(0, 1, 9)]
    for a_, b_ in zip(pts, pts[1:]):
        q.peca(*capsula(a_, b_, 0.9), tubo, contorno=None)
    fim = peito or (cx_ + 5, cy_ + 3)
    meio = pts[6]
    for a_, b_ in ((meio, ((meio[0] + fim[0]) / 2 + 1.5, (meio[1] + fim[1]) / 2)), (((meio[0] + fim[0]) / 2 + 1.5, (meio[1] + fim[1]) / 2), fim)):
        q.peca(*capsula(a_, b_, 0.85), tubo, contorno=None)
    q.peca(*elipse(fim, 2.4, 2.4), ["#5a6070", "#8a90a0", "#b8c0cc", "#dfe6ee", "#ffffff"])


# ─────────────────────────────── Objetos ───────────────────────────────
def livro(q: Quadro, c, virando: float) -> None:
    cx, cy = c
    q.peca(*elipse((cx, cy + 1), 17, 10), ["#5a1a12", "#7a2a1a", "#9a3a24", "#b8452f", "#d86a4a"])
    q.peca(*uniao(elipse((cx - 8, cy), 8.5, 8), elipse((cx + 8, cy), 8.5, 8)), ["#c8b890", "#e0d2ac", "#f0e6cc", "#fbf3df", "#ffffff"])
    for k in range(5):
        for lado in (-1, 1):
            for x in range(5):
                q.px(cx + lado * (3 + x * 1.4), cy - 4 + k * 2, "#8a7a5a" if (x + k) % 4 else "#b8452f")
    q.px(cx, cy - 4, "#5a1a12"); q.px(cx, cy + 4, "#5a1a12")
    if 0 < virando < 1:
        w = 8.5 * math.cos(virando * math.pi)
        q.peca(*elipse((cx + w / 2, cy - 1 - math.sin(virando * math.pi) * 3), abs(w) / 2 + 0.8, 7.5), ["#c8b890", "#e0d2ac", "#f0e6cc", "#fbf3df", "#ffffff"])


def caneca(q: Quadro, c, t: float, vapor: bool = True) -> None:
    cx, cy = c
    q.peca(*uniao(capsula((cx, cy - 4), (cx, cy + 4), 5.5), elipse((cx + 6.5, cy), 3, 3.6)), ["#5a1f1a", "#8a2e24", "#b8452f", "#d86a4a", "#f09070"])
    q.peca(elipse((cx, cy - 6), 4.4, 1.4)[0], None, [], contorno=None, cor_unica="#4a2a18")
    q.px(cx - 2, cy - 1, "#ffffff"); q.px(cx - 2, cy, "#f8d0c0")
    if vapor:
        for k in range(3):
            fase = (t + k / 3) % 1
            x = cx - 2 + k * 2 + math.sin(fase * 6 + k) * 1.5
            y = cy - 7 - fase * 12
            q.px(x, y, "#ffffff", int(200 * (1 - fase))); q.px(x, y - 1, "#ffffff", int(140 * (1 - fase)))


def espeto_marshmallow(q: Quadro, mao, ponta, tostado: float) -> None:
    q.peca(*capsula(mao, ponta, 0.7), ["#4a2a14", "#6a3a1e", "#8a5a30", "#a8743e", "#c8945a"], contorno=None)
    cores = ["#fff8f0", "#f8e6c8", "#e8c088", "#c88a48", "#8a5a2a"]
    k = min(4, int(tostado * 4.99))
    q.peca(elipse(ponta, 4.2, 3.4)[0], np.full((AP, LP), 3.0), [cores[max(0, k - 1)], cores[k], cores[k], cores[k], cores[min(4, k + 1)]])
    q.px(ponta[0] - 1, ponta[1] - 1, "#ffffff")


def cartao(q: Quadro, c, giro: float, frente: bool) -> None:
    cx, cy = c
    w = max(0.6, 7.5 * abs(math.cos(giro * math.pi)))
    q.peca(elipse((cx, cy), w, 9.5)[0], np.full((AP, LP), 3.0), ["#2f6aa8", "#3f7ab8", "#f6efe0" if frente else "#4f8ac8", "#ffffff", "#ffffff"])
    if w > 3:
        for k in range(3):
            for x in range(int(w * 1.2)):
                q.px(cx - w * 0.6 + x, cy - 3 + k * 2.5, "#2f6aa8" if frente else "#cfe4ff")


def raiox(q: Quadro, c, brilho: float) -> None:
    cx, cy = c
    q.peca(elipse((cx, cy), 12, 15)[0], np.full((AP, LP), 2.0), ["#0e1622", "#16243a", "#1c2e4a" if brilho < 0.5 else "#2a4466", "#3a5a80", "#5a7aa0"])
    # o fêmur na chapa, com a cabeça e o colo
    branco = "#cfe6ff" if brilho > 0.5 else "#a8c4e0"
    for k in range(18):
        q.px(cx + 1 + k * 0.12, cy - 7 + k, branco); q.px(cx + 2 + k * 0.12, cy - 7 + k, branco)
    for (dx, dy) in ((-3, -10), (-2, -11), (-1, -11), (0, -10), (-2, -9), (-1, -9), (0, -9), (-1, -8), (0, -8), (1, -8)):
        q.px(cx + dx, cy + dy, branco)
    for dy in range(-6, 8, 3):
        q.px(cx + 4, cy + dy, "#5a7aa0")


def caderno(q: Quadro, c, linhas: float) -> None:
    cx, cy = c
    q.peca(elipse((cx, cy), 16, 7.5)[0], np.full((AP, LP), 3.0), ["#3a5a2a", "#4f7a38", "#f4ead2", "#fbf3df", "#ffffff"])
    for k in range(3):
        fim = min(1, max(0, linhas * 3 - k))
        for x in range(int(14 * fim)):
            q.px(cx - 7 + x, cy - 2 + k * 2, "#2f6aa8" if (x + k) % 5 else "#3a4a6a")


def caneta(q: Quadro, ponta, ang: float) -> None:
    fim = (ponta[0] + math.cos(ang) * 9, ponta[1] + math.sin(ang) * 9)
    q.peca(*capsula(ponta, fim, 1.0), ["#1a2a5a", "#2a3a7a", "#3a4a9a", "#5a6aba", "#8a9ad0"], contorno=None)
    q.px(ponta[0], ponta[1], "#1b1208")


def violao(q: Quadro, c, ang: float) -> None:
    cx, cy = c
    q.peca(*uniao(elipse((cx, cy), 8, 6.5, ang), elipse((cx + math.cos(ang) * 6, cy + math.sin(ang) * 6), 5.5, 5, ang)), ["#6a3a14", "#8a5020", "#b8742e", "#d8984a", "#f0bc70"])
    q.peca(elipse((cx + math.cos(ang) * 2, cy + math.sin(ang) * 2), 2, 2)[0], None, [], contorno=None, cor_unica="#2a1608")
    braco_fim = (cx - math.cos(ang) * 22, cy - math.sin(ang) * 22)
    q.peca(*capsula((cx - math.cos(ang) * 6, cy - math.sin(ang) * 6), braco_fim, 1.3), ["#3a2010", "#5a3418", "#7a4a26", "#9a6236", "#b8804a"])
    for k in range(4):
        q.px(braco_fim[0] + k * 0.6, braco_fim[1] - 1 + k * 0.4, "#e8e0d0")


def nota_musical(q: Quadro, x: float, y: float, a: int) -> None:
    for dy in range(4):
        q.px(x + 2, y - dy, "#1b1208", a)
    q.px(x, y, "#1b1208", a); q.px(x + 1, y, "#1b1208", a); q.px(x + 1, y + 1, "#1b1208", a); q.px(x, y + 1, "#1b1208", a)
    q.px(x + 3, y - 3, "#1b1208", a)


def ossinho(q: Quadro, c, ang: float) -> None:
    cx, cy = c
    a = (cx - math.cos(ang) * 3, cy - math.sin(ang) * 3)
    b = (cx + math.cos(ang) * 3, cy + math.sin(ang) * 3)
    q.peca(*uniao(capsula(a, b, 0.9), elipse(a, 1.6, 1.6), elipse(b, 1.6, 1.6)), OSSO)


def martelo(q: Quadro, mao, ang: float) -> tuple:
    cabeca = (mao[0] + math.cos(ang) * 10, mao[1] + math.sin(ang) * 10)
    q.peca(*capsula(mao, cabeca, 0.8), ["#5a6070", "#8a90a0", "#b8c0cc", "#dfe6ee", "#ffffff"], contorno=None)
    q.peca(*elipse(cabeca, 3.6, 2, ang + math.pi / 2), ["#7a1a1a", "#a82a2a", "#c83a3a", "#e05a5a", "#f08a8a"])
    return cabeca


def maca(q: Quadro, c, mordidas: int) -> None:
    cx, cy = c
    m, t = elipse((cx, cy), 5.6, 5.4)
    for k in range(mordidas):
        mm, _ = elipse((cx + 5, cy - 3 + k * 3.2), 2.4, 2)
        m &= ~mm
    q.peca(m, t, ["#6a1010", "#9a1a1a", "#c82a2a", "#e84a3a", "#ff8a6a"])
    q.px(cx, cy - 6, "#5a3418"); q.px(cx, cy - 7, "#5a3418"); q.px(cx + 1, cy - 7, "#3f8a3a"); q.px(cx + 2, cy - 8, "#5fae4a"); q.px(cx + 3, cy - 8, "#5fae4a")


# ─────────────────────────────── Comportamentos ───────────────────────────────
def pose_base(t: float, respira: float = 1.0) -> dict:
    bob = math.sin(t * math.tau) * 0.7 * respira
    return {
        "cabeca": (60, 50 + bob), "peito": (60, 88 + bob * 0.6), "pelve": (60, 104), "inclina": 0.0, "boca": 0.0, "olhos": 1.0, "olhar": (0, 0),
        "joelho-1": (50, 112), "joelho1": (70, 112), "tornozelo-1": (48, 124), "tornozelo1": (72, 124),
    }


def ombros(p):
    cx_, cy_ = p["peito"]
    return (cx_ - 12, cy_ - 8), (cx_ + 12, cy_ - 8)


def piscar(p: dict, t: float, quando: float = 0.42) -> None:
    if abs(t - quando) < 0.05:
        p["olhos"] = 0.0


def corpo(q: Quadro, p: dict, esteto=None) -> None:
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p, esteto); desenhar_cranio(q, p)


def cena_ler(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = 0.06; p["olhar"] = (0.35 * math.sin(t * math.tau * 2), 0.9)
    piscar(p, t)
    corpo(q, p)
    oe, od = ombros(p)
    c = (60, 96 + p["peito"][1] - 88)
    livro(q, c, (t - 0.68) / 0.22 if 0.68 < t < 0.9 else 0)
    desenhar_braco(q, oe, (c[0] - 13, c[1] + 1), -1, "pega"); desenhar_braco(q, od, (c[0] + 13, c[1] + 1), 1, "pega")


def cena_cafe(q: Quadro, t: float) -> None:
    p = pose_base(t)
    gole = max(0, math.sin(t * math.pi)) ** 1.5
    p["inclina"] = -0.1 * gole; p["olhos"] = 0.3 if 0.4 < t < 0.6 else 1.0; p["boca"] = 0.25 * gole
    corpo(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (51, 104), -1, "aberta")
    mao = (80 - 10 * gole, 100 - 30 * gole)
    caneca(q, (mao[0] - 1, mao[1] - 3), t, vapor=gole < 0.5)
    desenhar_braco(q, od, mao, 1, "pega")


def cena_marshmallow(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["olhar"] = (-1, 0.4); p["inclina"] = -0.06; p["boca"] = 0.15
    corpo(q, p)
    oe, od = ombros(p)
    gira = math.sin(t * math.tau * 2) * 1.2
    mao_e, mao_d = (40, 92 + gira), (47, 94 + gira)
    espeto_marshmallow(q, mao_e, (4, 82 + gira * 1.5), t)
    desenhar_braco(q, oe, mao_e, -1, "punho"); desenhar_braco(q, od, mao_d, 1, "punho", cotovelo_lado=1)


def cena_dormir(q: Quadro, t: float) -> None:
    p = pose_base(t, 2.0)
    p["cabeca"] = (58, 54 + p["peito"][1] - 88); p["inclina"] = -0.3 + math.sin(t * math.tau) * 0.04; p["olhos"] = 0.0; p["boca"] = 0.3 + 0.2 * math.sin(t * math.tau)
    corpo(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (50, 106), -1, "aberta"); desenhar_braco(q, od, (70, 106), 1, "aberta")


def cena_alongar(q: Quadro, t: float) -> None:
    p = pose_base(t)
    s_ = math.sin(t * math.pi) ** 2
    p["boca"] = s_; p["olhos"] = 0.3 if s_ > 0.6 else 1.0; p["inclina"] = math.sin(t * math.tau) * 0.08
    corpo(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (48 - 8 * s_, 104 - 34 * s_), -1, "aberta", cotovelo_lado=1)
    desenhar_braco(q, od, (72 + 8 * s_, 104 - 34 * s_), 1, "aberta", cotovelo_lado=-1)


def cena_acenar(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["boca"] = 0.3; p["inclina"] = 0.1; p["olhar"] = (0.4, 0)
    piscar(p, t, 0.8)
    corpo(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (51, 104), -1, "aberta")
    vai = math.sin(t * math.tau * 2)
    desenhar_braco(q, od, (86 + vai * 3, 66 - abs(vai) * 2), 1, "aceno", cotovelo_lado=1)


def cena_flashcards(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["olhar"] = (0.7, 0.6); p["inclina"] = 0.05
    if 0.45 < t < 0.6:
        p["boca"] = 0.35
    corpo(q, p)
    oe, od = ombros(p)
    cartao(q, (42, 94), 0, False)
    desenhar_braco(q, oe, (44, 98), -1, "pega")
    giro = min(1, max(0, (t - 0.2) / 0.4))
    cartao(q, (80, 84), giro, giro > 0.5)
    desenhar_braco(q, od, (78, 90), 1, "pega")


def cena_raiox(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = -0.12; p["olhar"] = (-0.8, -0.7)
    if 0.55 < t < 0.75:
        p["boca"] = 0.5
    corpo(q, p)
    oe, od = ombros(p)
    c = (24 + math.sin(t * math.tau) * 1.5, 58)
    raiox(q, c, 1.0 if (t * 4) % 1 < 0.5 else 0.3)
    desenhar_braco(q, oe, (c[0] + 6, c[1] + 14), -1, "pega", cotovelo_lado=1)
    desenhar_braco(q, od, (c[0] + 12, c[1] + 6), 1, "pega", cotovelo_lado=-1)


def cena_anotar(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = 0.16; p["olhar"] = (0.2, 1)
    corpo(q, p)
    oe, od = ombros(p)
    c = (60, 106)
    caderno(q, c, t)
    desenhar_braco(q, oe, (48, 106), -1, "aberta")
    linha = int(t * 3)
    x = 53 + ((t * 3) % 1) * 14
    ponta = (x, 104 + linha * 2 + math.sin(t * 60) * 0.6)
    caneta(q, ponta, -0.9)
    desenhar_braco(q, od, (ponta[0] + 3, ponta[1] - 3), 1, "pega")


def cena_violao(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = math.sin(t * math.tau * 2) * 0.1; p["boca"] = 0.3 + 0.3 * abs(math.sin(t * math.tau * 2)); p["olhos"] = 0.3
    corpo(q, p)
    oe, od = ombros(p)
    violao(q, (66, 98), -0.35)
    desenhar_braco(q, oe, (42, 88), -1, "pega", cotovelo_lado=-1)
    desenhar_braco(q, od, (68, 96 + math.sin(t * math.tau * 4) * 2.5), 1, "aberta")
    for k in range(2):
        fase = (t + k * 0.5) % 1
        nota_musical(q, 88 + k * 9 + math.sin(fase * 6) * 2, 74 - fase * 34, int(255 * (1 - fase)))


def cena_malabares(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = -0.06; p["boca"] = 0.2
    p["olhar"] = (math.cos(t * math.tau) * 0.8, -0.9)
    corpo(q, p)
    for k in range(3):
        fase = (t + k / 3) % 1
        x = 60 + math.cos(fase * math.tau) * 26
        y = 30 - math.sin(fase * math.pi) * 22
        ossinho(q, (x, y + 26), fase * 9)
    oe, od = ombros(p)
    sobe = math.sin(t * math.tau * 3)
    desenhar_braco(q, oe, (40, 82 - sobe * 4), -1, "aberta", cotovelo_lado=1); desenhar_braco(q, od, (80, 82 + sobe * 4), 1, "aberta", cotovelo_lado=-1)


def cena_reflexo(q: Quadro, t: float) -> None:
    p = pose_base(t)
    bate = 0.4 < t < 0.55
    chute = max(0, math.sin((t - 0.45) / 0.35 * math.pi)) if 0.45 < t < 0.8 else 0
    p["tornozelo-1"] = (48 - chute * 6, 124 - chute * 12)
    p["olhar"] = (-0.5, 1); p["inclina"] = 0.12
    if chute > 0.3:
        p["boca"] = 0.7; p["olhar"] = (-0.2, -0.3)
    corpo(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (54, 104), -1, "aberta")
    ang = -2.4 + (0.9 if bate else 0)
    mao = (64, 104)
    martelo(q, mao, ang)
    desenhar_braco(q, od, mao, 1, "punho")
    if bate:
        for k in range(3):
            q.px(46 + k * 3, 107, "#fff2a0")


def cena_comer(q: Quadro, t: float) -> None:
    p = pose_base(t)
    leva = max(0, math.sin(min(t, 0.5) * math.pi * 2)) if t < 0.5 else 0
    mordidas = 1 + int(t * 3)
    p["boca"] = 0.7 if 0.15 < t < 0.3 else (0.3 * abs(math.sin(t * 40)) if 0.3 < t < 0.6 else 0)
    corpo(q, p)
    # o pedaço mordido cai pelas costelas e para no colo
    if t > 0.32:
        queda = min(1, (t - 0.32) / 0.45)
        q.peca(*elipse((61, 68 + queda * 34), 1.8, 1.5), ["#a8a060", "#d8d090", "#f0e8b8", "#fff8d8", "#ffffff"])
    oe, od = ombros(p)
    desenhar_braco(q, oe, (51, 104), -1, "aberta")
    mao = (78 - 8 * leva, 100 - 30 * leva)
    maca(q, (mao[0] - 2, mao[1] - 5), min(3, mordidas))
    desenhar_braco(q, od, mao, 1, "pega")


def cena_estetoscopio(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = 0.2; p["olhar"] = (0.6, 1)
    if t > 0.6:
        p["boca"] = 0.35
    peito = (63 + math.sin(t * math.tau) * 3, 90 + math.cos(t * math.tau) * 2)
    corpo(q, p, peito)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (51, 104), -1, "aberta")
    desenhar_braco(q, od, (peito[0] + 2, peito[1] + 2), 1, "pega")
    if t > 0.6:
        for (dx, dy) in ((0, 0), (1, -1), (2, -1), (3, 0), (3, 1), (2, 2), (1, 3), (1, 5)):
            q.px(92 + dx, 18 + dy, "#fffaf0")


COMPORTAMENTOS = [
    ("ler", "lendo", 4.2, cena_ler), ("cafe", "tomando café", 3.6, cena_cafe), ("marshmallow", "assando marshmallow", 3.2, cena_marshmallow),
    ("dormir", "cochilando", 3.8, cena_dormir), ("alongar", "se espreguiçando", 3.0, cena_alongar), ("acenar", "acenando", 2.2, cena_acenar),
    ("flashcards", "revisando flashcards", 3.0, cena_flashcards), ("raiox", "olhando um raio X", 3.4, cena_raiox), ("anotar", "fazendo anotações", 3.6, cena_anotar),
    ("violao", "tocando cavaquinho", 2.4, cena_violao), ("malabares", "fazendo malabares com ossos", 2.0, cena_malabares),
    ("reflexo", "testando o próprio reflexo patelar", 2.6, cena_reflexo), ("comer", "comendo uma maçã", 3.4, cena_comer),
    ("estetoscopio", "auscultando o próprio peito", 3.2, cena_estetoscopio),
]


def main() -> None:
    pasta = RAIZ / "public" / "pixel" / "mascote"
    pasta.mkdir(parents=True, exist_ok=True)
    folha = Image.new("RGBA", (LP * QUADROS, AP * len(COMPORTAMENTOS)), (0, 0, 0, 0))
    for i, (_, _, _, cena) in enumerate(COMPORTAMENTOS):
        for f in range(QUADROS):
            q = Quadro()
            cena(q, f / QUADROS)
            folha.alpha_composite(Image.fromarray(q.c, "RGBA"), (f * LP, i * AP))
    folha.save(pasta / "esqueleto.webp", lossless=True, quality=100, method=6)
    lista = [{"id": c[0], "nome": c[1], "duracao": c[2]} for c in COMPORTAMENTOS]
    ts = (
        "// Gerado por scripts/gerar_mascote.py: não edite à mão.\n"
        "/** Os comportamentos do mascote, na ordem das linhas de public/pixel/mascote/esqueleto.webp. */\n"
        f"export const QUADRO = {{ largura: {LP}, altura: {AP}, quadros: {QUADROS} }} as const\n"
        f"export const COMPORTAMENTOS = {json.dumps(lista, ensure_ascii=False, indent=2)} as const\n"
        "export type IdComportamento = (typeof COMPORTAMENTOS)[number]['id']\n"
    )
    destino = RAIZ / "src" / "componentes" / "mascote" / "comportamentos.ts"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(ts, encoding="utf-8")
    print(folha.size, (pasta / "esqueleto.webp").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
