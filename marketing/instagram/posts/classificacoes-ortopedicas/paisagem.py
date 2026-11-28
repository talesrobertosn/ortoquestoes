"""Paisagem da série Classificações Ortopédicas (28/11/2026, segunda versão da arte): planaltos ao pôr do sol.

Trocadilho visual do ep. 1 ("platô" = planalto): mesas de pedra em camadas, céu do roxo ao laranja, sol baixo com
halo, nuvens iluminadas por baixo (camada à parte, que desliza devagar no vídeo), poeira dourada, e uma rocha em
primeiro plano à esquerda onde o mascote (de mago) fica. Pixel art 360 x 640 ampliada 3x, com luz calculada.

    python3 paisagem.py -> arte/ceu.npy (fundo fixo), arte/nuvens.npy (RGBA, desliza), arte/frente.npy (RGBA),
                           arte/previa-paisagem.png
"""
from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "../2026-11-27-video-salter-harris"))
from cena import ESC, H, W, XX, YY, Camada, ampliar, desfocar, hash01, hexa, quantizar, rampa, ruido, sobre  # noqa: E402

HORIZONTE = 300
SOL = (262, 268, 20)
CEU = ["#1d1240", "#2f1b57", "#4a2368", "#6e2c72", "#9a3a6e", "#c9566a", "#ec7a5c", "#ffa25a", "#ffc879"]


def ceu() -> Camada:
    c = Camada()
    t = np.clip(YY / HORIZONTE, 0, 1) ** 1.15
    # o lado do sol é mais quente
    calor = np.exp(-((XX - SOL[0]) / 160) ** 2) * np.clip(YY / HORIZONTE, 0, 1) * 0.18
    v = np.clip(t + calor + (hash01(XX, YY, 3) - 0.5) * 0.03, 0, 1)
    c.pintar(YY < HORIZONTE + 80, rampa(CEU, quantizar(v, len(CEU), 0.9)))
    est = (YY < 120) & (hash01(XX, YY, 9) > 0.995)
    c.pintar(est, "#fff6e0", 0.85)
    est2 = (YY < 110) & (hash01(XX, YY, 11) > 0.997)
    for y, x in zip(*np.where(est2)):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            c.p(x + dx, y + dy, "#ffe9b8", 0.5)
    # sol: disco com faixas de cor (pixel art) e meia-lua de luz
    sx, sy, r = SOL
    d = np.hypot(XX - sx, YY - sy)
    c.pintar(d <= r, "#fff4c9")
    c.pintar((d <= r) & (d > r - 4), "#ffe08a")
    c.pintar((d <= r) & ((YY - sy) % 5 == 0) & (YY > sy + 4), "#ffb35a", 0.7)  # faixas do sol baixo
    return c


def nuvens() -> Camada:
    """Nuvens em fiapos, iluminadas por baixo (laranja) e escuras por cima (violeta)."""
    c = Camada()
    rng = np.random.default_rng(4)
    for k in range(9):
        cx = rng.uniform(-20, W + 20)
        cy = rng.uniform(70, HORIZONTE - 40)
        larg = rng.uniform(40, 110)
        alt = rng.uniform(5, 11)
        for j in range(7):
            ox = rng.uniform(-larg / 2, larg / 2)
            oy = rng.uniform(-alt / 2, alt / 3)
            rx = rng.uniform(larg * 0.2, larg * 0.45)
            ry = rng.uniform(alt * 0.5, alt)
            m = ((XX - cx - ox) / rx) ** 2 + ((YY - cy - oy) / ry) ** 2 <= 1
            base = (YY - (cy + oy)) / ry
            luz = np.clip(base * 0.5 + 0.5, 0, 1)
            calor = np.exp(-((XX - SOL[0]) / 120) ** 2)
            cor = rampa(["#3c2460", "#6a3277", "#b04d72", "#f08a66", "#ffd08a"], quantizar(np.clip(luz * (0.7 + 0.3 * calor), 0, 1), 5, 0.6))
            c.pintar(m, cor, 0.95)
    return c


def mesa_pedra(seed: int, base_y: float, alt_med: float, cores: list, densidade: float = 1.0) -> Camada:
    """Uma fileira de mesas (planaltos) orgânicas: topo plano mas recortado, paredão que se inclina para dentro no
    alto, encosta de pedra solta que alarga na base, bordas serrilhadas, estratos e luz do sol no topo e na face."""
    c = Camada()
    rng = np.random.default_rng(seed)
    corpo = np.zeros((H, W), bool)
    topo_map = np.full((H, W), 9999.0, np.float32)
    x = rng.uniform(-40, 10)
    while x < W + 30:
        larg = rng.uniform(34, 90) * densidade
        h = rng.uniform(alt_med * 0.55, alt_med * 1.25)
        cx = x + larg / 2
        ty = base_y - h
        # topo recortado: pequenas quebras e degraus
        topo = ty + 2.5 * np.sin((XX - cx) * 0.35 + seed) * (hash01(XX // 5, seed, 2) > 0.5) + 3 * (hash01(XX // 9, seed, 4) > 0.82)
        prof = np.clip((YY - topo) / max(h, 1), 0, 1)
        meia = larg / 2 * (0.92 + 0.08 * prof) + (larg * 0.55) * np.clip((prof - 0.55) / 0.45, 0, 1) ** 1.6
        serrilha = (hash01(YY // 2, seed, 7) - 0.5) * 3.5 + 2 * np.sin(YY * 0.4 + seed)
        m = (YY >= topo) & (YY <= base_y + 200) & (np.abs(XX - cx) <= meia + serrilha)
        corpo |= m
        topo_map = np.where(m, np.minimum(topo_map, topo), topo_map)
        x += larg * rng.uniform(0.8, 1.4) + rng.uniform(-10, 30)
    ty = topo_map
    estrato = ((YY - ty) // 4 + (hash01(XX // 6, ((YY - ty) // 4).astype(int), seed) > 0.8)) % 3
    face_sol = np.clip((XX - SOL[0] + 200) / 400, 0, 1)
    v = np.clip(0.38 + 0.12 * (estrato == 0) - 0.22 * np.clip((YY - ty) / 90, 0, 1) + 0.12 * face_sol
                + (hash01(XX, YY, seed) - 0.5) * 0.06, 0, 1)
    c.pintar(corpo, rampa(cores, quantizar(v, len(cores), 0.7)))
    # borda do topo e quinas voltadas ao sol acesas
    borda = corpo & (YY - ty < 1.5)
    c.pintar(borda, cores[-1])
    quina = corpo & ~np.roll(corpo, -1, axis=1) & (XX < SOL[0]) & (YY - ty < 40)
    c.pintar(quina, cores[-1], 0.7)
    return c


def primeiro_plano() -> Camada:
    """Rocha à esquerda (o palco do mascote), rochas menores à direita e a beira do precipício embaixo."""
    c = Camada()
    pedra = ["#1a1026", "#2a1734", "#3d2140", "#583049", "#7c4450", "#a65f57", "#d98d63"]
    # rocha do mascote: topo em y ~ 413 (pés do mascote), à esquerda
    topo = 413 + 4 * np.sin(XX * 0.12) + 2 * np.sin(XX * 0.37)
    borda_dir = 96 + 6 * np.sin(YY * 0.15)
    rocha = (YY >= topo) & (XX < borda_dir + (YY - 413) * 0.35)
    tex = ruido(301, 2.5) * 0.5 + ruido(302, 8) * 0.5
    luz = np.clip((XX - 20) / 90, 0, 1) * 0.35 + np.clip(1 - (YY - topo) / 60, 0, 1) * 0.35
    c.pintar(rocha, rampa(pedra, quantizar(np.clip(0.15 + luz + (tex - 0.5) * 0.3, 0, 1), len(pedra), 0.7)))
    c.pintar(rocha & (YY - topo < 1.5), "#f2b27a")
    # tufos de grama seca
    for gx in range(4, 90, 7):
        gy = int(413 + 4 * np.sin(gx * 0.12))
        for k in range(3):
            c.linha(gx + k, gy, gx + k - 1 + k, gy - 3 - (k % 2) * 2, ["#6d6a3a", "#9c8f4a", "#c9b260"][k])
    # beira do precipício embaixo, de ponta a ponta
    chao = YY >= 560 + 8 * np.sin(XX * 0.05)
    c.pintar(chao, rampa(pedra[:4], quantizar(np.clip(0.3 + (tex - 0.5) * 0.4, 0, 1), 4, 0.7)))
    c.pintar(chao & (YY < 560 + 8 * np.sin(XX * 0.05) + 1.5), "#c97a5a")
    # rochinha flutuante à direita (detalhe de fantasia)
    m = ((XX - 330) / 22) ** 2 + ((YY - 470) / 7) ** 2 <= 1
    c.pintar(m & (YY < 470), "#a65f57")
    c.pintar(m & (YY >= 470), "#3d2140")
    cone = (YY >= 470) & (YY < 492) & (np.abs(XX - 330) < 18 - (YY - 470) * 0.8)
    c.pintar(cone, "#2a1734")
    c.pintar(m & (YY < 465), "#f2b27a")
    return c


def main() -> None:
    os.makedirs(os.path.join(AQUI, "arte"), exist_ok=True)
    fundo = np.zeros((H, W, 3), np.float32)
    fundo = sobre(fundo, ceu().c)
    longe = mesa_pedra(11, HORIZONTE + 10, 40, ["#5a2c6a", "#6e3572", "#84406f", "#a25670", "#d07a6e"], 1.3)
    meio = mesa_pedra(12, HORIZONTE + 70, 70, ["#3a1f50", "#4b2658", "#5f2f5c", "#7d3e5e", "#c06a62"], 1.0)
    perto = mesa_pedra(13, HORIZONTE + 160, 95, ["#22142f", "#2d1a3a", "#3b2142", "#55304a", "#a65a56"], 0.8)
    grande = ampliar(fundo)
    # névoa entre as camadas: desfoque e cor do horizonte
    for cam, des, nevoa in ((longe, 1.6, 0.35), (meio, 0.9, 0.18), (perto, 0.0, 0.05)):
        g = ampliar(cam.c)
        if des:
            g = desfocar(g, des)
        g[..., :3] = g[..., :3] * (1 - nevoa) + hexa("#ff9f73") * nevoa
        grande = sobre(grande, g)
    # halo do sol (luz calculada) e raios
    hh, ww = H * ESC, W * ESC
    gy, gx = np.mgrid[0:hh, 0:ww].astype(np.float32)
    sx, sy, r = [v * ESC for v in SOL]
    d = np.hypot(gx - sx, gy - sy)
    halo = np.exp(-(d / (r * 3.2)) ** 2) * 0.55 + np.exp(-(d / (r * 9)) ** 2) * 0.25
    ang = np.arctan2(gy - sy, gx - sx)
    raios = (np.sin(ang * 14) > 0.6) * np.exp(-(d / (r * 14)) ** 2) * 0.12 * (gy < sy + 40 * ESC)
    grande[..., :3] += (halo + raios)[..., None] * hexa("#ffcf8a")
    np.save(os.path.join(AQUI, "arte", "ceu.npy"), grande.astype(np.float16))
    np.save(os.path.join(AQUI, "arte", "nuvens.npy"), ampliar(nuvens().c).astype(np.float16))
    np.save(os.path.join(AQUI, "arte", "frente.npy"), ampliar(primeiro_plano().c).astype(np.float16))
    prev = sobre(sobre(grande, ampliar(nuvens().c)), ampliar(primeiro_plano().c))
    Image.fromarray((np.clip(prev / (1 + prev * 0.15), 0, 1) * 255).astype(np.uint8)).save(
        os.path.join(AQUI, "arte", "previa-paisagem.png"))
    print("ok")


if __name__ == "__main__":
    main()
