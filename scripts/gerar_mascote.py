"""O mascote do Orto Questões: um esqueleto de touca cirúrgica e estetoscópio (30/10/2026, pedido do Tales).

Feito do zero por este script (nada baixado nem de IA). Não é desenhado quadro a quadro: é um esqueleto ARTICULADO.
Cada osso é uma peça com volume (sombreamento por normal, luz de cima à esquerda, 5 tons e contorno próprio):
crânio com sutura e rachadura, órbitas com a luz dos olhos (que pisca), cavidade nasal, maxila e mandíbula com
dentes (a mandíbula abre para falar, bocejar e mastigar), vértebras cervicais e lombares, esterno, 7 pares de costelas,
clavículas, escápulas, pelve com sacro e forames obturados, úmero, rádio e ulna, mãos com carpo e falanges, fêmur,
patela, tíbia e fíbula, tarso e metatarsos. Cada comportamento é uma função de pose (posição de cada articulação ao
longo do tempo, com cinemática inversa nos braços e nas pernas) mais os objetos daquela cena.

Gera public/pixel/mascote/esqueleto.webp (uma linha por comportamento, QUADROS quadros de LxA) e
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

OSSO = ["#7e6a4e", "#b09a74", "#d9c8a2", "#f1e6cc", "#fffaf0"]
CONTORNO = "#2a1a10"


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
            dentro = np.roll(mascara, 1, 0) & np.roll(mascara, -1, 0) & np.roll(mascara, 1, 1) & np.roll(mascara, -1, 1)
            borda = mascara & ~dentro
            # Oclusão: o anel logo dentro do contorno fica um tom mais escuro (dá volume e separa as peças).
            anel = dentro & ~(np.roll(dentro, 1, 0) & np.roll(dentro, -1, 0) & np.roll(dentro, 1, 1) & np.roll(dentro, -1, 1))
            if not cor_unica and tons is not None:
                cores = np.array([rgb(p) for p in paleta], dtype=np.uint8)
                idx = np.clip(np.clip(tons, 0, len(paleta) - 1).astype(int) - 1, 0, len(paleta) - 1)
                self.c[anel, :3] = cores[idx[anel]]
                # Poros do osso: pontinhos escuros espalhados (textura de osso esponjoso).
                if paleta is OSSO:
                    poros = mascara & dentro & (((XI * 73856093) ^ (YI * 19349663)) % 61 == 0)
                    self.c[poros, :3] = rgb(OSSO[1])
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


# ─────────────────────────────── As peças do corpo ───────────────────────────────
def desenhar_pernas(q: Quadro, p: dict) -> None:
    bx, by = p["tronco_x"], p["tronco_y"]
    # pelve (atrás dos fêmures): asas do ilíaco com a crista, sacro com forames e os forames obturados
    for lado in (-1, 1):
        q.peca(*elipse((bx + lado * 8.5, by + 84), 7.5, 5, lado * 0.45), OSSO)
        q.peca(elipse((bx + lado * 8.5, by + 85), 3.2, 1.8, lado * 0.45)[0], None, OSSO, contorno=None, cor_unica="#b09a74")
    q.peca(*elipse((bx, by + 87), 4.6, 5.6), OSSO)
    for k in range(3):
        q.px(bx - 1.5, by + 85 + k * 2, "#5a4630"); q.px(bx + 1.5, by + 85 + k * 2, "#5a4630")
    for lado in (-1, 1):
        q.peca(*elipse((bx + lado * 6.5, by + 91), 3.6, 2.6), OSSO)
        q.peca(elipse((bx + lado * 6.5, by + 91), 1.6, 1.1)[0], None, OSSO, contorno=None, cor_unica="#3a2a1a")
    for lado in (-1, 1):
        quadril = (60 + lado * 9, 89 + by)
        joelho = p[f"joelho{lado}"]
        tornozelo = p[f"tornozelo{lado}"]
        # tíbia e fíbula (a fíbula fina, por fora)
        q.peca(*capsula((joelho[0] + lado * 3, joelho[1] + 2), (tornozelo[0] + lado * 3, tornozelo[1] - 1), 1.1), OSSO)
        osso_longo(q, joelho, tornozelo, 2.6, 1.35)
        # pé: tarso e metatarsos abrindo para a frente
        px, py = tornozelo
        q.peca(*elipse((px + lado * 2, py + 2), 4.5, 2.6), OSSO)
        for k in range(4):
            q.peca(*capsula((px + lado * (1 + k * 1.6), py + 3), (px + lado * (3 + k * 2.2), py + 6.5), 0.9), OSSO)
        osso_longo(q, quadril, joelho, 3.4, 1.3)
        # patela
        q.peca(*elipse((joelho[0], joelho[1] - 0.5), 3, 3.4), OSSO)


def desenhar_tronco(q: Quadro, p: dict) -> None:
    bx = p["tronco_x"]
    by = p["tronco_y"]
    # coluna lombar: 5 vértebras
    for k in range(5):
        y = by + 84 - k * 3.2
        q.peca(*uniao(elipse((bx, y), 3.4, 1.5), elipse((bx - 3.6, y), 1.4, 0.9), elipse((bx + 3.6, y), 1.4, 0.9)), OSSO)
    # escápulas atrás das costelas
    for lado in (-1, 1):
        q.peca(*elipse((bx + lado * 11, by + 58), 5, 8, lado * 0.25), OSSO[:-1])
    # costelas: 7 pares de arcos do esterno para fora e para baixo
    for k in range(7):
        y0 = by + 53 + k * 3.4
        abre = 14 - abs(k - 2.5) * 0.9
        for lado in (-1, 1):
            pts = [(bx + lado * (1.5 + abre * math.sin(u * math.pi * 0.62)), y0 + abre * 0.38 * (1 - math.cos(u * math.pi * 0.9))) for u in np.linspace(0, 1, 7)]
            m = np.zeros((AP, LP), bool)
            t = np.zeros((AP, LP), np.float32)
            for a_, b_ in zip(pts, pts[1:]):
                pm, pt = capsula(a_, b_, 1.5)
                t = np.where(pm & ~m, pt, t)
                m |= pm
            q.peca(m, t, OSSO, contorno="#4a3a28")
    # esterno
    q.peca(*uniao(capsula((bx, by + 52), (bx, by + 72), 2.0), elipse((bx, by + 51), 3.2, 2.2)), OSSO)
    # coluna cervical
    for k in range(4):
        q.peca(*elipse((bx, by + 46 - k * 2.6), 2.4, 1.3), OSSO)
    # clavículas
    for lado in (-1, 1):
        q.peca(*capsula((bx + lado * 2, by + 50), (bx + lado * 15, by + 49 + 1.5), 1.4), OSSO)


def desenhar_cranio(q: Quadro, p: dict) -> None:
    cx, cy = p["cabeca"]
    inc = p.get("inclina", 0.0)
    boca = p.get("boca", 0.0)
    olhos = p.get("olhos", 1.0)
    olhar = p.get("olhar", (0.0, 0.0))
    ca, sa = math.cos(inc), math.sin(inc)
    rot = lambda dx, dy: (cx + dx * ca - dy * sa, cy + dx * sa + dy * ca)
    # mandíbula (atrás da maxila quando fechada; desce ao abrir)
    jx, jy = rot(0, 12 + boca * 5)
    q.peca(*uniao(elipse((jx, jy), 10.5, 5.5, inc), elipse(rot(-8.5, 8 + boca * 2), 2.4, 4.5, inc), elipse(rot(8.5, 8 + boca * 2), 2.4, 4.5, inc)), OSSO)
    if boca > 0.15:
        m, _ = elipse(rot(0, 10 + boca * 2.5), 7.5, 1 + boca * 2.6, inc)
        q.peca(m, None, OSSO, contorno=None, cor_unica="#2a1410")
    # dentes de baixo
    for k in range(-6, 7):
        x, y = rot(k * 1.05, 10.2 + boca * 5)
        q.px(x, y, "#fffaf0", fino=True); q.px(x, y + 0.5, "#e8dcc0", fino=True)
        q.px(x + 0.5, y, "#8a7a5a", fino=True)
    # crânio: calota grande, maçãs do rosto e maxila
    cranio = uniao(elipse(rot(0, -3), 17, 15.5, inc), elipse(rot(-10, 5), 5.5, 5, inc), elipse(rot(10, 5), 5.5, 5, inc), elipse(rot(0, 6), 11, 6.5, inc))
    q.peca(*cranio, OSSO)
    # dentes de cima
    for k in range(-7, 8):
        x, y = rot(k * 1.05, 9.4)
        q.px(x, y, "#fffaf0", fino=True); q.px(x, y + 0.5, "#efe6cc", fino=True); q.px(x, y - 0.5, "#fffaf0", fino=True)
        if k % 1 == 0:
            q.px(x + 0.5, y, "#8a7a5a", fino=True); q.px(x + 0.5, y + 0.5, "#8a7a5a", fino=True)
    # rachadura na calota e sutura
    for (dx, dy) in ((9, -11), (10, -10), (10, -9), (11, -8), (11, -7), (12, -7)):
        x, y = rot(dx, dy)
        q.px(x, y, "#7e6a4e")
    for k in range(26):
        u = k / 25
        x, y = rot(-12 + u * 24, -13 + math.sin(u * math.pi * 6) * 0.5 + (u - 0.5) ** 2 * 6)
        q.px(x, y, "#b09a74", fino=True)
    # órbitas e a luz dos olhos
    for lado in (-1, 1):
        ox, oy = rot(lado * 6.4, 0)
        m, _ = elipse((ox, oy), 4.6, 4.9, inc + lado * 0.15)
        q.peca(m, None, OSSO, contorno=None, cor_unica="#1b1008")
        if olhos > 0.5:
            gx, gy = ox + olhar[0] * 1.6, oy + 0.4 + olhar[1] * 1.4
            for dx_ in (-1, 0, 1):
                for dy_ in (-1, 0, 1):
                    q.px(gx + dx_, gy + dy_, "#2a7a8a" if abs(dx_) + abs(dy_) == 2 else "#5fd8e8")
            q.px(gx, gy, "#e8ffff"); q.px(gx - 0.6, gy - 0.6, "#ffffff")
        else:
            for dx_ in (-2, -1, 0, 1, 2):
                q.px(ox + dx_, oy + 1, "#5fd8e8" if olhos > 0.2 else "#2a5a64")
    # cavidade nasal (coração invertido)
    nx, ny = rot(0, 5.4)
    for (dx, dy) in ((-1, 0), (0, 0), (1, 0), (-1, 1), (0, 1), (1, 1), (0, 2), (-1, -1), (1, -1)):
        q.px(nx + dx, ny + dy, "#1b1008")
    # touca cirúrgica (bouffant) com estampa e as tiras
    m_touca, t_touca = elipse(rot(0, -9), 18.2, 9.5, inc)
    corte = (YS - cy) * ca - (XS - cx) * sa > -6.5
    m_touca &= ~corte
    q.peca(m_touca, t_touca, ["#1e6a5c", "#2a8a76", "#3aa48c", "#5cc4a8", "#8ee0c4"])
    for k in range(-3, 4):
        x, y = rot(k * 4.4, -12 + abs(k) * 0.9)
        q.px(x, y, "#e8fff6"); q.px(x + 1, y + 1, "#e8fff6")
    for (dx, dy) in ((-17, -6), (-18, -5), (-19, -4), (-19, -3), (-20, -2), (-20, -1)):
        x, y = rot(dx, dy)
        q.px(x, y, "#2a8a76")


def desenhar_braco(q: Quadro, ombro, mao, lado: int, pegada: str = "aberta", cotovelo_lado: float | None = None) -> tuple:
    cot, fim = ik(ombro, mao, 17.5, 16.5, cotovelo_lado if cotovelo_lado is not None else lado)
    osso_longo(q, ombro, cot, 2.7, 1.35)
    # rádio e ulna lado a lado
    ang = math.atan2(fim[1] - cot[1], fim[0] - cot[0])
    perp = (-math.sin(ang) * 1.6, math.cos(ang) * 1.6)
    q.peca(*capsula((cot[0] - perp[0], cot[1] - perp[1]), (fim[0] - perp[0], fim[1] - perp[1]), 1.4, 1.6), OSSO)
    q.peca(*capsula((cot[0] + perp[0], cot[1] + perp[1]), (fim[0] + perp[0], fim[1] + perp[1]), 1.5, 1.3), OSSO)
    q.peca(*elipse(cot, 2.4, 2.2), OSSO)
    desenhar_mao(q, fim, ang, pegada, lado)
    return cot, fim


def desenhar_mao(q: Quadro, punho, ang: float, pegada: str, lado: int) -> None:
    px, py = punho
    q.peca(*elipse((px + math.cos(ang) * 1.8, py + math.sin(ang) * 1.8), 3.2, 2.7, ang), OSSO)
    comp = {"aberta": 7, "pega": 4.2, "punho": 2.8, "aceno": 7.5}[pegada]
    abertura = {"aberta": 0.32, "pega": 0.18, "punho": 0.1, "aceno": 0.4}[pegada]
    base = (px + math.cos(ang) * 3.5, py + math.sin(ang) * 3.5)
    for k in range(4):
        a = ang + (k - 1.5) * abertura
        meio = (base[0] + math.cos(a) * comp * 0.55, base[1] + math.sin(a) * comp * 0.55)
        dobra = a + (0.9 if pegada in ("pega", "punho") else 0.15) * lado
        fim = (meio[0] + math.cos(dobra) * comp * 0.5, meio[1] + math.sin(dobra) * comp * 0.5)
        q.peca(*capsula(base, meio, 0.95), OSSO, contorno="#5a4630")
        q.peca(*capsula(meio, fim, 0.85), OSSO, contorno="#5a4630")
        q.px(meio[0], meio[1], "#7e6a4e")
    # polegar
    a = ang - lado * 1.1
    q.peca(*capsula(base, (base[0] + math.cos(a) * 3.5, base[1] + math.sin(a) * 3.5), 0.8), OSSO, contorno=None)


def desenhar_estetoscopio(q: Quadro, p: dict, peito=None) -> None:
    bx, by = p["tronco_x"], p["tronco_y"]
    pts = [(bx - 10 + 20 * u, by + 50 + 9 * math.sin(u * math.pi)) for u in np.linspace(0, 1, 10)]
    for a_, b_ in zip(pts, pts[1:]):
        q.peca(*capsula(a_, b_, 0.9), ["#1a1a22", "#2a2a36", "#3a3a4a", "#55556a", "#7a7a90"], contorno=None)
    fim = peito or (bx + 6, by + 64)
    meio = pts[6]
    for a_, b_ in ((meio, ((meio[0] + fim[0]) / 2 + 2, (meio[1] + fim[1]) / 2)), (((meio[0] + fim[0]) / 2 + 2, (meio[1] + fim[1]) / 2), fim)):
        q.peca(*capsula(a_, b_, 0.85), ["#1a1a22", "#2a2a36", "#3a3a4a", "#55556a", "#7a7a90"], contorno=None)
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
    bob = math.sin(t * math.tau) * 0.6 * respira
    return {
        "tronco_x": 60, "tronco_y": bob, "cabeca": (60, 27 + bob), "inclina": 0.0, "boca": 0.0, "olhos": 1.0, "olhar": (0, 0),
        "joelho-1": (44, 100), "joelho1": (76, 100), "tornozelo-1": (41, 124), "tornozelo1": (79, 124),
    }


def ombros(p):
    return (p["tronco_x"] - 15, p["tronco_y"] + 51), (p["tronco_x"] + 15, p["tronco_y"] + 51)


def piscar(p: dict, t: float, quando: float = 0.42) -> None:
    if abs(t - quando) < 0.05:
        p["olhos"] = 0.0


def cena_ler(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = 0.06; p["cabeca"] = (60, 28.5 + p["tronco_y"]); p["olhar"] = (0.3 * math.sin(t * math.tau * 2), 0.8)
    piscar(p, t)
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p); desenhar_cranio(q, p)
    oe, od = ombros(p)
    c = (60, 77 + p["tronco_y"])
    livro(q, c, (t - 0.68) / 0.22 if 0.68 < t < 0.9 else 0)
    desenhar_braco(q, oe, (c[0] - 12, c[1] + 1), -1, "pega"); desenhar_braco(q, od, (c[0] + 12, c[1] + 1), 1, "pega")


def cena_cafe(q: Quadro, t: float) -> None:
    p = pose_base(t)
    gole = max(0, math.sin(t * math.pi)) ** 1.5
    p["inclina"] = -0.12 * gole; p["olhos"] = 0.3 if 0.4 < t < 0.6 else 1.0
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p); desenhar_cranio(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (50, 102), -1, "aberta")
    mao = (80 - 12 * gole, 92 - 50 * gole)
    caneca(q, (mao[0] - 1, mao[1] - 2), t, vapor=gole < 0.5)
    desenhar_braco(q, od, mao, 1, "pega")


def cena_marshmallow(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["olhar"] = (-1, 0.3); p["inclina"] = -0.05
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p); desenhar_cranio(q, p)
    oe, od = ombros(p)
    gira = math.sin(t * math.tau * 2) * 1.2
    mao_e, mao_d = (44, 82 + gira), (52, 80 + gira)
    espeto_marshmallow(q, mao_e, (6, 74 + gira * 1.5), t)
    desenhar_braco(q, oe, mao_e, -1, "punho"); desenhar_braco(q, od, mao_d, 1, "punho", cotovelo_lado=1)


def cena_dormir(q: Quadro, t: float) -> None:
    p = pose_base(t, 2.2)
    p["cabeca"] = (58, 32 + p["tronco_y"]); p["inclina"] = -0.32 + math.sin(t * math.tau) * 0.04; p["olhos"] = 0.0; p["boca"] = 0.35 + 0.25 * math.sin(t * math.tau)
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p); desenhar_cranio(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (48, 96), -1, "aberta"); desenhar_braco(q, od, (72, 96), 1, "aberta")


def cena_alongar(q: Quadro, t: float) -> None:
    p = pose_base(t)
    s = math.sin(t * math.pi) ** 2
    p["boca"] = s * 1.0; p["olhos"] = 0.3 if s > 0.6 else 1.0; p["inclina"] = math.sin(t * math.tau) * 0.08
    p["cabeca"] = (60, 27 - s * 1.5 + p["tronco_y"])
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p); desenhar_cranio(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (48 - 4 * s, 96 - 82 * s), -1, "aberta", cotovelo_lado=1)
    desenhar_braco(q, od, (72 + 4 * s, 96 - 82 * s), 1, "aberta", cotovelo_lado=-1)


def cena_acenar(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["boca"] = 0.25; p["inclina"] = 0.1; p["olhar"] = (0.4, 0)
    piscar(p, t, 0.8)
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p); desenhar_cranio(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (50, 100), -1, "aberta")
    vai = math.sin(t * math.tau * 2)
    desenhar_braco(q, od, (88 + vai * 4, 28 - abs(vai) * 2), 1, "aceno", cotovelo_lado=1)


def cena_flashcards(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["olhar"] = (0.6, 0.6); p["inclina"] = 0.05
    if 0.45 < t < 0.6:
        p["boca"] = 0.3
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p); desenhar_cranio(q, p)
    oe, od = ombros(p)
    cartao(q, (46, 80), 0, False)
    desenhar_braco(q, oe, (47, 84), -1, "pega")
    giro = min(1, max(0, (t - 0.2) / 0.4))
    cartao(q, (74, 70), giro, giro > 0.5)
    desenhar_braco(q, od, (74, 76), 1, "pega")


def cena_raiox(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = -0.14; p["olhar"] = (-0.7, -0.8); p["cabeca"] = (58, 27 + p["tronco_y"])
    if 0.55 < t < 0.75:
        p["boca"] = 0.45
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p); desenhar_cranio(q, p)
    oe, od = ombros(p)
    c = (32 + math.sin(t * math.tau) * 1.5, 22)
    raiox(q, c, 1.0 if (t * 4) % 1 < 0.5 else 0.3)
    desenhar_braco(q, oe, (c[0] - 4, c[1] + 12), -1, "pega", cotovelo_lado=1)
    desenhar_braco(q, od, (c[0] + 10, c[1] + 10), 1, "pega", cotovelo_lado=-1)


def cena_anotar(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = 0.18; p["cabeca"] = (60, 30 + p["tronco_y"]); p["olhar"] = (0.2, 1)
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p); desenhar_cranio(q, p)
    oe, od = ombros(p)
    c = (60, 96)
    caderno(q, c, t)
    desenhar_braco(q, oe, (48, 96), -1, "aberta")
    linha = int(t * 3)
    x = 53 + ((t * 3) % 1) * 14
    ponta = (x, 94 + linha * 2 + math.sin(t * 60) * 0.6)
    caneta(q, ponta, -0.9)
    desenhar_braco(q, od, (ponta[0] + 3, ponta[1] - 3), 1, "pega")


def cena_violao(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = math.sin(t * math.tau * 2) * 0.1; p["boca"] = 0.3 + 0.3 * abs(math.sin(t * math.tau * 2)); p["olhos"] = 0.3
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p); desenhar_cranio(q, p)
    oe, od = ombros(p)
    violao(q, (68, 82), -0.35)
    desenhar_braco(q, oe, (40, 72), -1, "pega", cotovelo_lado=-1)
    desenhar_braco(q, od, (70, 80 + math.sin(t * math.tau * 4) * 3), 1, "aberta")
    for k in range(2):
        fase = (t + k * 0.5) % 1
        nota_musical(q, 86 + k * 8 + math.sin(fase * 6) * 2, 60 - fase * 34, int(255 * (1 - fase)))


def cena_malabares(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = -0.08; p["boca"] = 0.2
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p)
    for k in range(3):
        fase = (t + k / 3) % 1
        x = 60 + math.cos(fase * math.tau) * 16
        y = 40 - math.sin(fase * math.pi) * 26 + (1 - fase) * 0
        ossinho(q, (x, y + 18), fase * 9)
    p["olhar"] = (math.cos(t * math.tau) * 0.8, -0.8)
    desenhar_cranio(q, p)
    oe, od = ombros(p)
    sobe = math.sin(t * math.tau * 3)
    desenhar_braco(q, oe, (45, 76 - sobe * 4), -1, "aberta"); desenhar_braco(q, od, (75, 76 + sobe * 4), 1, "aberta")


def cena_reflexo(q: Quadro, t: float) -> None:
    p = pose_base(t)
    bate = 0.4 < t < 0.55
    chute = max(0, math.sin((t - 0.45) / 0.35 * math.pi)) if 0.45 < t < 0.8 else 0
    p["tornozelo-1"] = (41 - chute * 6, 124 - chute * 15)
    p["olhar"] = (-0.5, 1); p["inclina"] = 0.12
    if chute > 0.3:
        p["boca"] = 0.6; p["olhar"] = (-0.2, -0.3)
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p); desenhar_cranio(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (52, 98), -1, "aberta")
    ang = -2.2 + (0.9 if bate else 0)
    mao = (66, 90)
    martelo(q, mao, ang)
    desenhar_braco(q, od, mao, 1, "punho")
    if bate:
        for k in range(3):
            q.px(44 - 3 + k * 3, 95, "#fff2a0")


def cena_comer(q: Quadro, t: float) -> None:
    p = pose_base(t)
    leva = max(0, math.sin(min(t, 0.5) * math.pi * 2)) if t < 0.5 else 0
    mordidas = 1 + int(t * 3)
    p["boca"] = 0.6 if 0.15 < t < 0.3 else (0.25 * abs(math.sin(t * 40)) if 0.3 < t < 0.6 else 0)
    desenhar_pernas(q, p); desenhar_tronco(q, p); desenhar_estetoscopio(q, p)
    # o pedaço mordido cai pelo meio das costelas e para na pelve
    if t > 0.32:
        queda = min(1, (t - 0.32) / 0.45)
        y = 40 + queda * 50
        q.peca(*elipse((61, y), 1.6, 1.3), ["#a8a060", "#d8d090", "#f0e8b8", "#fff8d8", "#ffffff"])
    desenhar_cranio(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (50, 100), -1, "aberta")
    mao = (78 - 10 * leva, 90 - 48 * leva)
    maca(q, (mao[0] - 2, mao[1] - 4), min(3, mordidas))
    desenhar_braco(q, od, mao, 1, "pega")


def cena_estetoscopio(q: Quadro, t: float) -> None:
    p = pose_base(t)
    p["inclina"] = 0.22; p["olhar"] = (0.6, 0.9)
    if t > 0.6:
        p["boca"] = 0.35
    desenhar_pernas(q, p); desenhar_tronco(q, p)
    peito = (64 + math.sin(t * math.tau) * 3, 64 + math.cos(t * math.tau) * 2)
    desenhar_estetoscopio(q, p, peito)
    desenhar_cranio(q, p)
    oe, od = ombros(p)
    desenhar_braco(q, oe, (50, 100), -1, "aberta")
    desenhar_braco(q, od, (peito[0] + 2, peito[1] + 2), 1, "pega")
    if t > 0.6:
        for (dx, dy) in ((0, 0), (1, -1), (2, -1), (3, 0), (3, 1), (2, 2), (1, 3), (1, 5)):
            q.px(84 + dx, 14 + dy, "#fffaf0")


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
