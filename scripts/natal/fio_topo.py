"""O fio de lâmpadas da borda de cima do topo da página inicial (modo Natal), no lugar do festão pesado.

Pedido do Tales (21/11/2026): menos coisa em cima. Um fio só, fino, de cobre trançado, preso em ganchinhos na borda,
com lâmpadas clássicas grandes (soquete verde, vidro facetado, núcleo quente) em barrigas leves. A luz de cada uma cai
na pintura do cenário embaixo (camada para mix-blend-mode: screen), e duas turmas piscam alternadas.

Peça que repete na horizontal sem emenda: pinto três cópias lado a lado e recorto a do meio.
Saídas: fio-topo.png, fio-topo-luz-a.png, fio-topo-luz-b.png (480 de largura; 3 px por pixel da arte).
Uso: python3 scripts/natal/fio_topo.py
"""
from __future__ import annotations

import math

import numpy as np

from hd2d import ESC, H, W, Camada, ampliar, desfocar, hexa, h01, iluminar, luz_pontual, pal, salvar_rgba, tom

TW = 160            # largura da peça (pixels da arte); duas barrigas por peça
ALTO = 20           # altura da peça com fio e lâmpadas
ALTO_LUZ = 56       # altura da camada de luz (cai sobre o cenário)
COBRE = pal("#1a0e08", "#3a1e10", "#62341a", "#8a5028", "#b07038", "#d8985a")
SOQUETE = pal("#06120c", "#0c2216", "#163a24", "#24543a", "#3a7450")
VIDROS = [  # vidro (escuro, meio, claro, núcleo) e a cor da luz
    (("#6a0c10", "#c8262c", "#ff6a56", "#ffd2c0"), "#ff6a50"),
    (("#7a4a08", "#e0a020", "#ffd060", "#fff4c8"), "#ffc050"),
    (("#0c4a34", "#1ea070", "#6af0b8", "#e0fff0"), "#60f0b0"),
    (("#122c7a", "#2e6ae0", "#80b8ff", "#e6f0ff"), "#70a8ff"),
    (("#6a4a1a", "#e8c890", "#fff0c8", "#ffffff"), "#ffe0a0"),
]


def curva(x: float) -> float:
    """O fio: ganchos em x = 0, 80, 160 (y = 1) e barrigas de 7 px no meio."""
    t = (x % 80) / 80
    return 1.2 + 7.2 * math.sin(math.pi * t) ** 1.15


def pintar(c: Camada, e: Camada, ox: int) -> list:
    pts = []
    # o fio de cobre trançado (dois fios torcidos: um pixel claro a cada 3)
    for s in range(TW * 4):
        x = s / 4
        y = curva(x)
        c.p(ox + x, y, tom(COBRE, 0.55 if int(x) % 3 == 0 else 0.25))
        c.p(ox + x, y + 1, tom(COBRE, 0.12), 0.7)
    # os ganchos na borda
    for gx in (0, 80):
        c.p(ox + gx, 0, tom(COBRE, 0.8)); c.p(ox + gx, 1, tom(COBRE, 0.5)); c.p(ox + gx - 1, 1, tom(COBRE, 0.3)); c.p(ox + gx + 1, 1, tom(COBRE, 0.3))
    # as lâmpadas: cinco por barriga, penduradas num cabinho curto
    n = 0
    for barriga in range(2):
        for k in range(5):
            x = barriga * 80 + 8 + k * 16
            y = int(curva(x)) + 1
            vidro, luz = VIDROS[(barriga * 5 + k) % len(VIDROS)]
            # cabinho e soquete serrilhado
            c.p(ox + x, y, tom(COBRE, 0.2))
            for dy, linha in enumerate(("#S#", "SSS", "#S#")):
                for dx, ch in enumerate(linha):
                    c.p(ox + x - 1 + dx, y + 1 + dy, tom(SOQUETE, 0.75 - dx * 0.25 - (dy == 1) * 0.1) if ch == "S" else tom(SOQUETE, 0.35 - dx * 0.1))
            # vidro facetado em gota (5 x 6), metade da luz mais clara, o núcleo incandescente
            forma = (".###.", "#####", "#####", "#####", ".###.", "..#..")
            for dy, linha in enumerate(forma):
                for dx, ch in enumerate(linha):
                    if ch != "#":
                        continue
                    u = dx - 2
                    v = 1 if u < 0 else 2 if u == 0 else 0
                    if dy in (1, 2) and abs(u) <= 1:
                        v = 3 if u <= 0 else 2
                    if dy == 5:
                        v = 1
                    cor = vidro[v]
                    c.p(ox + x - 2 + dx, y + 4 + dy, cor)
                    e.p(ox + x - 2 + dx, y + 4 + dy, cor, 0.55 if v < 2 else 1.0)
            c.p(ox + x - 1, y + 5, "#ffffff"); e.p(ox + x - 1, y + 5, "#ffffff")
            pts.append((ox + x, y + 6.5, luz, n % 2))
            n += 1
    return pts


def main() -> None:
    c, e = Camada(), Camada()
    pts = []
    for ox in (0, TW, 2 * TW):
        pts += pintar(c, e, ox)
    rgb, alfa, emi = iluminar(c, e, [(x, y, cor) for x, y, cor, _ in pts], amb="#c8ccd8", amb_k=0.95, raio_lamp=3.2)
    x0, x1 = TW * ESC, 2 * TW * ESC
    salvar_rgba("fio-topo.png", rgb[:ALTO * ESC, x0:x1], alfa[:ALTO * ESC, x0:x1])
    # A luz de cada turma: o halo da lâmpada e a luz que desce no cenário (um cone curto, mais largo embaixo).
    for turma, nome in ((0, "a"), (1, "b")):
        luz = np.zeros((H * ESC, W * ESC, 3), np.float32)
        for (x, y, cor, t) in pts:
            if t != turma:
                continue
            luz += luz_pontual(x, y, 4.0)[:, :, None] * hexa(cor) * 1.0
            luz += luz_pontual(x, y + 10, 16, 1.4)[:, :, None] * hexa(cor) * 0.22
        pequeno = Camada()
        for (x, y, cor, t) in pts:
            if t == turma:
                pequeno.p(x, y, cor); pequeno.p(x, y - 1, cor)
        pe = ampliar(pequeno.c)
        pe = pe[:, :, :3] * pe[:, :, 3:4]
        luz += pe * 1.2 + desfocar(pe, 3) * 1.3
        luz = luz[:ALTO_LUZ * ESC, x0:x1]
        hh = luz.shape[0]
        fade = np.clip((hh - 1 - np.arange(hh)) / (hh * 0.45), 0, 1)[:, None] ** 1.6
        luz = luz * fade[:, :, None]
        lum = luz.max(2)
        cor = np.where(lum[:, :, None] > 1e-4, luz / np.maximum(lum[:, :, None], 1e-4), 0)
        salvar_rgba(f"fio-topo-luz-{nome}.png", cor, np.clip(lum * 1.2, 0, 0.92))


if __name__ == "__main__":
    main()
