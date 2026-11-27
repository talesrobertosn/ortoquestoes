"""Radiografias em pixel art para o vídeo Salter-Harris: o osso é um campo de densidade pintado pixel a pixel.

Coordenadas do filme: FW x FH pixels da arte pequena (cada um vira 3 x 3 no vídeo). A ponta distal do osso aponta para
baixo (epífise embaixo, metáfise em cima), como no mnemônico SALTR: Above = metáfise, Lower = epífise.
"""
from __future__ import annotations

import numpy as np

from cena import hash01, quantizar, rampa, ruido

FW, FH = 264, 210
YY, XX = np.mgrid[0:FH, 0:FW].astype(np.float32)

FILME_CORES = ["#05090d", "#0a131a", "#122029", "#1d2f39", "#2d434d", "#445c65", "#62797f", "#879ea1", "#b2c5c6",
               "#d9e6e5", "#f2f8f6"]


class Osso:
    """Geometria de uma ponta distal de osso longo infantil (rádio ou tíbia distal, genérico)."""

    def __init__(self, cx: float = 132, s: float = 1.0, topo: float = 0.0, encurtar: float = 0.0,
                 fise_aberta: bool = True, adulto: bool = False, desliz: float = 0.0) -> None:
        self.cx, self.s, self.topo, self.enc = cx, s, topo, encurtar
        self.fise_aberta, self.adulto, self.desliz = fise_aberta, adulto, desliz

    # tudo em coordenadas locais (u: horizontal a partir do eixo, v: vertical a partir do topo), escala 1
    def hw(self, v):
        t = np.clip((v - 60) / 58, 0, 1)
        return 26 + 30 * t ** 1.6

    def yp(self, u):
        return 121 + 2.4 * np.sin(u * 0.11) + 1.2 * np.sin(u * 0.31 + 1)

    def ya(self, u):
        """Superfície articular (côncava)."""
        k = np.clip(u / 52, -1, 1)
        return 158 - 4 * (1 - k * k)

    def local(self, x, y):
        u = (x - self.cx) / self.s
        v = (y - self.topo) / self.s + self.enc * (y - self.topo > 60 * self.s)
        return u, v

    def campo(self) -> np.ndarray:
        """Densidade 0..1 (0 = filme preto, 1 = osso cortical)."""
        u, v = self.local(XX, YY)
        # a parte distal (da metáfise para baixo) pode estar "encurtada": desloca v
        dens = np.zeros_like(XX)
        # partes moles
        hw = self.hw(np.minimum(v, 118))
        partes = np.abs(u) < hw + 28 - 6 * np.clip((v - 150) / 40, 0, 1)
        borda = np.clip((hw + 28 - np.abs(u)) / 8, 0, 1)
        dens += 0.17 * borda * partes
        # pele: linha um pouco mais clara
        dens += 0.04 * (np.abs(np.abs(u) - (hw + 27)) < 1.2)

        yp = self.yp(u)
        ya = self.ya(u)
        # diáfise + metáfise
        dentro_met = (np.abs(u) <= hw) & (v < yp - 2)
        dist_borda = hw - np.abs(u)
        cort_esp = np.where(v < 60, 6.5, 6.5 - 4 * np.clip((v - 60) / 50, 0, 1))
        cortical = dentro_met & (dist_borda < cort_esp)
        trab = ruido(81, 2.2, FW, FH) * 0.55 + ruido(82, 5, FW, FH) * 0.45
        estrias = 0.5 + 0.5 * np.sin(u * 1.3 + trab * 4.0)
        canal = 0.36 + 0.06 * trab
        espon = 0.48 + 0.18 * trab + 0.08 * estrias
        miolo = np.where(v < 70, canal + (espon - canal) * np.clip((v - 40) / 30, 0, 1), espon)
        dens = np.where(dentro_met, np.maximum(dens, miolo), dens)
        dens = np.where(cortical, 0.86 + 0.08 * (dist_borda / np.maximum(cort_esp, 1)) - 0.06 * trab, dens)

        if self.adulto:
            # sem fise: metáfise e epífise contínuas; só a cicatriz fisária, uma linha um pouco mais densa
            corpo = (np.abs(u) <= np.minimum(hw, 56)) & (v >= yp - 2) & (v < ya)
            dens = np.where(corpo, np.maximum(dens, espon + 0.02), dens)
            cicatriz = corpo & (np.abs(v - yp) < 0.9)
            dens = np.where(cicatriz, dens + 0.12, dens)
        else:
            # fise: faixa radiotransparente, com a zona de calcificação provisória (linha densa) do lado metafisário
            fise = (np.abs(u) <= 56) & (np.abs(v - yp) <= 2)
            if self.fise_aberta:
                dens = np.where(fise, 0.2 + 0.03 * trab, dens)
                zcp = (np.abs(u) <= 55) & (np.abs(v - (yp - 3)) < 1)
                dens = np.where(zcp, 0.82, dens)
            else:
                # fise fechada precocemente: ponte óssea densa e irregular
                ponte = fise
                dens = np.where(ponte, 0.74 + 0.1 * trab, dens)
            # epífise: núcleo de ossificação com cantos arredondados
            ue = u - self.desliz
            ype = self.yp(ue)
            yae = self.ya(ue)
            larg = 55 - 5 * np.clip((v - ype) / 36, 0, 1) ** 2
            epi = (np.abs(ue) <= larg) & (v > ype + 2) & (v < yae)
            # arredonda os cantos de baixo
            canto = (np.abs(ue) > larg - 7) & (v > yae - 7)
            dc = np.hypot(np.abs(ue) - (larg - 7), v - (yae - 7))
            epi &= ~(canto & (dc > 7))
            dens = np.where(epi, np.maximum(dens, espon - 0.03), dens)
            # contorno cortical fino da epífise e osso subcondral
            casca = epi & ((larg - np.abs(ue) < 2) | (yae - v < 2.2) | (v - (ype + 2) < 1.2))
            dens = np.where(casca, 0.84, dens)
        # osso subcondral do adulto
        if self.adulto:
            sub = (np.abs(u) <= 52) & (np.abs(v - (ya - 1)) < 1.1)
            dens = np.where(sub, 0.86, dens)
        # osso oposto (tálus/carpo genérico): cúpula convexa abaixo do espaço articular
        yt = ya + 9 - 1.5
        larg_t = 52 - 9 * np.clip(1 - (v - yt) / 16, 0, 1) ** 2  # cúpula: estreita em cima, alarga para baixo
        opo = (np.abs(u) <= larg_t) & (v > yt + 3 * (u / 52) ** 2)
        dens = np.where(opo, np.maximum(dens, 0.46 + 0.16 * trab), dens)
        casca_t = opo & (v - yt - 3 * (u / 52) ** 2 < 2)
        dens = np.where(casca_t, 0.8, dens)
        borda_t = opo & (larg_t - np.abs(u) < 2.5)
        dens = np.where(borda_t, 0.74, dens)
        return dens

    def pt(self, u, v):
        """Ponto local -> filme."""
        return self.cx + u * self.s, self.topo + (v - self.enc * (v > 60)) * self.s


def osso_vizinho(cx: float, s: float, topo: float = 0.0) -> np.ndarray:
    """Um osso fino ao lado (ulna/fíbula), mais apagado, para a radiografia não ficar artificial."""
    u = (XX - cx) / s
    v = (YY - topo) / s
    hw = 12 + 6 * np.clip((v - 70) / 50, 0, 1) ** 1.5
    dens = np.zeros_like(XX)
    yp = 128 + 1.5 * np.sin(u * 0.2)
    corpo = (np.abs(u) <= hw) & (v < yp - 1.5)
    dens = np.where(corpo, 0.38, dens)
    dens = np.where(corpo & (hw - np.abs(u) < 3), 0.7, dens)
    epi = (np.abs(u) <= hw - 2) & (v > yp + 1.5) & (v < 150 - 4 * (u / hw) ** 2)
    dens = np.where(epi, 0.5, dens)
    dens = np.where(epi & ((hw - 2 - np.abs(u) < 1.5) | (v > 147 - 4 * (u / hw) ** 2)), 0.72, dens)
    return dens


def pintar_filme(dens: np.ndarray, seed: int = 0) -> np.ndarray:
    """Densidade -> cores do filme (pixel art com pontilhado), retroiluminado pelo negatoscópio."""
    grao = (hash01(XX.astype(int), YY.astype(int), 90 + seed) - 0.5) * 0.05
    # o negatoscópio é mais claro no centro: o filme inteiro ganha um véu leve
    vy = (YY / FH - 0.5)
    vx = (XX / FW - 0.5)
    veu = 0.05 * (1 - (vx * vx + vy * vy) * 2.4)
    v = np.clip(dens + grao + veu, 0, 1)
    return rampa(FILME_CORES, quantizar(v, len(FILME_CORES), 0.9))


def filme_unico(**kw) -> tuple[np.ndarray, Osso]:
    o = Osso(**kw)
    d = np.maximum(o.campo(), osso_vizinho(o.cx + 86 * o.s, o.s, o.topo))
    return d, o


def filme_duplo(esq: dict, dir_: dict) -> tuple[np.ndarray, Osso, Osso]:
    a = Osso(**esq)
    b = Osso(**dir_)
    d = np.maximum(a.campo(), b.campo())
    # divisória: dois filmes lado a lado (a borda escura de cada chassi)
    d = np.where(np.abs(XX - FW / 2) < 1.5, 0.0, d)
    return d, a, b
