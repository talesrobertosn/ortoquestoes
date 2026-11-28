"""Radiografia de joelho (frente) em pixel art para os tipos de Schatzker sem imagem real, e para o esquema do macete.

Coordenadas do filme como em filme.py do Salter-Harris (FW x FH, cada pixel vira 3 x 3). O lado lateral fica à direita
(onde está a fíbula), como nas radiografias reais do Tales.
"""
from __future__ import annotations

import os
import sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "../../2026-11-27-video-salter-harris"))
from cena import hash01, quantizar, rampa, ruido  # noqa: E402
from filme import FH, FILME_CORES, FW  # noqa: E402

YY, XX = np.mgrid[0:FH, 0:FW].astype(np.float32)
CX = 132.0
YT0 = 92.0  # altura média do platô


def topo_tibia(u: np.ndarray) -> np.ndarray:
    """Superfície articular da tíbia: dois platôs levemente côncavos e as espinhas no meio."""
    base = YT0 + 1.6 * np.cos(np.clip((np.abs(u) - 32) / 30, -1, 1) * np.pi / 2) * 0 + 1.2 * ((np.abs(u) - 32) / 30) ** 2
    espinhas = 9 * np.exp(-((np.abs(u) - 6) / 3.2) ** 2)
    lateral_mais_alto = np.where(u > 0, -1.5, 0.0)
    return base - espinhas + lateral_mais_alto


def largura_tibia(v: np.ndarray) -> np.ndarray:
    t = np.clip((v - YT0) / 70, 0, 1)
    return 66 - 28 * (t ** 0.8)


def campo(depressao: tuple | None = None, tracos: list | None = None, solto: float = 0.0) -> np.ndarray:
    """Densidade 0..1. depressao = (u0, u1, profundidade); tracos = listas de pontos (u, v) do traço;
    solto = deslocamento (px) da diáfise em relação à metáfise (tipo VI)."""
    u = XX - CX
    v = YY.copy()
    trab = ruido(91, 2.2, FW, FH) * 0.55 + ruido(92, 5, FW, FH) * 0.45
    dens = np.zeros_like(XX)
    # partes moles
    dens += 0.16 * (np.abs(u) < 112) * np.clip((112 - np.abs(u)) / 10, 0, 1)

    # fêmur distal: côndilos arredondados e o intercôndilo
    hwf = 30 + 34 * np.clip((v - 10) / 45, 0, 1) ** 1.3
    fundo_f = np.where(np.abs(u) < 11, 66 + 0.15 * np.abs(u), 82 - 9 * ((np.abs(u) - 34) / 30) ** 2)
    femur = (np.abs(u) <= hwf) & (v < fundo_f)
    canto = (np.abs(u) > hwf - 9) & (v > 60)
    femur &= ~(canto & (np.hypot(np.abs(u) - (hwf - 9), v - 60) > 9 + 0 * v) & (v > fundo_f - 20))
    dist = hwf - np.abs(u)
    dens = np.where(femur, 0.48 + 0.16 * trab, dens)
    dens = np.where(femur & ((dist < 3) | (fundo_f - v < 2.2)), 0.84, dens)

    # tíbia proximal
    yt = topo_tibia(u)
    if depressao:
        u0, u1, prof = depressao
        dentro = (u >= u0) & (u <= u1)
        yt = np.where(dentro, yt + prof, yt)
    hwt = largura_tibia(v)
    tibia = (np.abs(u) <= hwt) & (v >= yt)
    # diáfise solta (tipo VI): abaixo do traço transverso tudo desloca para o lado
    if solto:
        abaixo = v > 150 + 4 * np.sin(u * 0.2)
        u2 = u - solto
        tibia = np.where(abaixo, (np.abs(u2) <= largura_tibia(v)) & (v >= yt), tibia)
        dist_t = np.where(abaixo, largura_tibia(v) - np.abs(u2), hwt - np.abs(u))
    else:
        dist_t = hwt - np.abs(u)
    dens = np.where(tibia, np.maximum(dens, 0.5 + 0.17 * trab), dens)
    dens = np.where(tibia & (dist_t < np.where(v > 140, 6, 3)), 0.86, dens)
    dens = np.where(tibia & (v - yt < 2.2), 0.9, dens)  # osso subcondral
    if depressao:
        u0, u1, prof = depressao
        compacto = (u >= u0) & (u <= u1) & (v >= yt) & (v < yt + 7)
        dens = np.where(compacto & tibia, 0.95, dens)  # fragmento impactado, mais denso
    # cicatriz da fise
    dens = np.where(tibia & (np.abs(v - (YT0 + 22 + 3 * np.sin(u * 0.08))) < 0.8), dens + 0.08, dens)

    # cabeça e colo da fíbula (lateral, à direita)
    fu, fv = u - 64, v - 132
    cabeca = (fu / 12) ** 2 + (fv / 14) ** 2 <= 1
    colo = (np.abs(fu - 2) <= 7) & (v > 132) & (v < FH)
    fibula = cabeca | colo
    dens = np.where(fibula, np.maximum(dens, 0.55 + 0.12 * trab), dens)
    dens = np.where(fibula & (np.abs(fu - 2) > 5) & colo, 0.82, dens)

    # traços: faixa radiotransparente
    for pts in tracos or []:
        for (a, b), (c, d) in zip(pts[:-1], pts[1:]):
            n = int(max(abs(c - a), abs(d - b)) * 2) + 1
            for k in range(n + 1):
                q = k / max(n, 1)
                x = CX + a + (c - a) * q
                y = b + (d - b) * q
                m = (np.abs(XX - x) < 1.3) & (np.abs(YY - y) < 1.3)
                dens = np.where(m & (dens > 0.3), 0.18, dens)
    return np.clip(dens, 0, 1)


def pintar(dens: np.ndarray, seed: int = 0) -> np.ndarray:
    grao = (hash01(XX.astype(int), YY.astype(int), 40 + seed) - 0.5) * 0.05
    vy, vx = (YY / FH - 0.5), (XX / FW - 0.5)
    v = np.clip(dens + grao + 0.05 * (1 - (vx * vx + vy * vy) * 2.4), 0, 1)
    return rampa(FILME_CORES, quantizar(v, len(FILME_CORES), 0.9))


# traços de cada tipo em (u, v); lateral = u > 0
TRACO_I = [(26, topo_tibia(np.array(26.0)).item()), (40, 112), (52, 128), (60, 138)]
TRACO_IV = [(-6, 88), (-22, 108), (-40, 126), (-58, 140)]
TRACO_V_LAT = [(4, 86), (20, 106), (40, 124), (60, 136)]
TRACO_V_MED = [(-4, 86), (-20, 106), (-40, 124), (-60, 136)]
TRACO_VI = [(-58, 150), (-30, 146), (-6, 154), (20, 147), (46, 153), (60, 149)]

TIPOS = {
    "normal": dict(),
    "i": dict(tracos=[TRACO_I]),
    "ii": dict(tracos=[TRACO_I], depressao=(8, 26, 7)),
    "iii": dict(depressao=(14, 44, 9)),
    "iv": dict(tracos=[TRACO_IV]),
    "v": dict(tracos=[TRACO_V_LAT, TRACO_V_MED]),
    "vi": dict(tracos=[TRACO_V_LAT, TRACO_V_MED, TRACO_VI], solto=5),
}
# traços para a animação em ouro (coordenadas do filme)
OURO = {
    "i": [TRACO_I], "ii": [TRACO_I], "iv": [TRACO_IV], "v": [TRACO_V_LAT, TRACO_V_MED],
    "vi": [TRACO_V_LAT, TRACO_V_MED, TRACO_VI],
}
DEPRESSAO = {"ii": (8, 26, 7), "iii": (14, 44, 9)}


def filme(tipo: str) -> np.ndarray:
    return pintar(campo(**TIPOS[tipo]))


if __name__ == "__main__":
    from PIL import Image

    linhas = [np.concatenate([filme(t) for t in ("normal", "i", "ii")], axis=1),
              np.concatenate([filme(t) for t in ("iii", "iv", "v")], axis=1)]
    im = np.concatenate(linhas + [np.concatenate([filme("vi"), filme("normal") * 0, filme("normal") * 0], axis=1)], axis=0)
    os.makedirs(os.path.join(AQUI, "previa"), exist_ok=True)
    Image.fromarray((im * 255).astype(np.uint8)).resize((im.shape[1] * 2, im.shape[0] * 2), Image.NEAREST).save(
        os.path.join(AQUI, "previa", "planaltos.png"))
    print("ok")
