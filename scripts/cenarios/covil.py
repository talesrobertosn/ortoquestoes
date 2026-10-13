"""Covil do Dragão: caverna vulcânica onde mora o Dragão de Ossos.

Vista um pouco de cima. O foco quente fica no meio, atrás da mesa: um rio de
lava ao fundo que ilumina o salão de baixo para cima; as bordas são basalto
frio e escuro, com estalactites que emolduram o alto. Montes de moedas de
ouro brilham perto da lava. Camadas:
  fundo   paredes distantes, rio de lava com brilho, arcos de rocha
  meio    chão de basalto rachado com veios acesos, montes de moedas, colunas
          quebradas, estalagmites
  frente  estalactites e rochas escuras nos cantos
  luz     brilho da lava, das rachaduras e das moedas, brasas
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa, ruido, voronoi  # noqa: E402

BASALTO = rampa(['#07050a', '#0e0a10', '#171117', '#21181d', '#2e2125', '#3d2b2c', '#523834'])
ROCHA_QUENTE = rampa(['#1a0c08', '#2e140c', '#4a1e10', '#6e2c12', '#9a4014', '#c86018'])
LAVA = rampa(['#5a0e04', '#9a2008', '#d84810', '#ff8a1a', '#ffc040', '#fff0a0'])
OURO = rampa(['#3a2006', '#6a4210', '#a8721e', '#d8a838', '#f6d27a', '#fff4c0'])


def suave(a, b, v):
    t = np.clip((v - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    hz = 0.42 if retrato else 0.46          # onde o chão encontra a parede do fundo
    cx = W / 2
    x, y = Tela(W, H).x, Tela(W, H).y

    # ---------------------------------------------------- fundo
    f = Tela(W, H)
    # parede da caverna: basalto em placas (voronoi), mais claro de baixo (luz da lava)
    d, idc = voronoi(x / 14, y / 10, 3)
    luz_lava = suave(0.0, 1.0, (y / (H * hz))) ** 1.6 * np.exp(-((x - cx) / (W * 0.45)) ** 2)
    lp = 0.1 + 0.18 * fbm(x / 9, y / 9, 3, 1) + 0.5 * luz_lava + 0.06 * ((idc * 37 % 11) / 11) - 0.16 * (d < 0.06)
    f.tingir(np.ones((H, W), bool), np.clip(lp, 0, 0.999), BASALTO, 0.6)
    quente = luz_lava > 0.35
    f.tingir(quente & (d > 0.06), np.clip(lp * 0.9, 0, 0.999), ROCHA_QUENTE, 0.6)
    # arco natural da caverna ao fundo (abertura escura com o rio de lava embaixo)
    ax, aw, atopo = cx, W * (0.24 if not retrato else 0.36), H * 0.12
    borda_irr = 1 + 0.16 * (fbm(x / 6, y / 6, 3, 21) - 0.5)
    abertura = (np.abs(x - ax) < aw * borda_irr * np.sqrt(np.clip(1 - ((y - H * hz) / (H * hz - atopo)) ** 2, 0, 1))) & (y < H * hz) & (y > atopo)
    prof = np.clip((y - atopo) / (H * hz - atopo), 0, 1)
    f.rgb[abertura] = (np.array(hexrgb('#1a0806'), F) * (1 - prof[..., None] * 0.2) + np.array(hexrgb('#a83a10'), F) * (prof[..., None] ** 2.2) * 0.9)[abertura]
    # dentro da boca: duas cristas de rocha distantes, recortadas contra o brilho
    for i, (alt_, esc_, cor_) in enumerate(((0.62, 9, '#3a1408'), (0.8, 6, '#260c06'))):
        crista = abertura & (y > H * hz - (H * hz - atopo) * (1 - alt_) * (0.6 + 0.8 * fbm(x / esc_ / 3, i, 3, 40 + i)))
        f.rgb[crista] = f.rgb[crista] * 0.35 + np.array(hexrgb(cor_), F) * 0.65
    # rio de lava ao fundo, correndo de um lado ao outro, com ondas de brilho
    rio_y = H * hz - 3 + 2 * np.sin(x / 13)
    rio = np.abs(y - rio_y) < 2.6 + 1.2 * fbm(x / 8, 1, 2, 4)
    onda = fbm(x / 6 - y / 3, y / 2, 2, 6)
    f.tingir(rio, np.clip(0.55 + 0.45 * onda, 0, 0.999), LAVA, 0.5)
    # véu de calor e fumaça
    f.velar(0.25 * suave(0.3, 1.0, y / (H * hz)) * (y < H * hz) * (0.6 + 0.4 * fbm(x / 20, y / 10, 3, 8)), '#c85a20')
    f.salvar(saida / f'{nome}-fundo.png')

    # ---------------------------------------------------- meio
    m = Tela(W, H)
    chao = y >= H * hz + 2 * (fbm(x / 7, 0.4, 2, 9) - 0.5)
    profc = np.clip((y - H * hz) / (H * (1 - hz)), 0, 1)
    esc = 0.35 + 0.65 * profc
    X, Y = (x - cx) / esc, (y - H * hz) / esc
    dv, idv = voronoi(X / 16, Y / 9, 12)
    centro = np.exp(-(((x - cx) / (W * 0.36)) ** 2 + ((y - H * 0.66) / (H * 0.3)) ** 2))
    lc = 0.1 + 0.2 * fbm(X / 10, Y / 6, 3, 13) + 0.32 * centro + 0.08 * ((idv * 13 % 7) / 7) + 0.25 * (1 - profc) * np.exp(-((x - cx) / (W * 0.5)) ** 2)
    m.tingir(chao & (dv > 0.07), np.clip(lc, 0, 0.999), BASALTO[1:], 0.6)
    # veios de lava nas juntas das placas, mais acesos perto do fundo e do centro
    veio = chao & (dv <= 0.07) & (fbm(X / 6, Y / 6, 2, 15) > 0.55 - 0.12 * centro) & (profc > 0.3)
    m.tingir(veio, np.clip(0.35 + 0.5 * (1 - profc) + 0.2 * centro, 0, 0.999), LAVA[:5], 0.4)
    junta = chao & (dv <= 0.07) & ~veio & (profc > 0.15)
    m.tingir(junta, np.full((H, W), 0.05, F), BASALTO, 0.2)
    # névoa de calor sobre o chão distante (lá as placas são miúdas demais para ler)
    m.velar(np.clip(1 - profc / 0.45, 0, 1) * 0.55 * chao, '#6a2a14')
    luzes = []
    # montes de moedas de ouro perto da lava (laterais do fundo)
    for fx, fy, r, s in (((0.2, 0.56, 22, 1), (0.8, 0.55, 24, 2), (0.12, 0.8, 18, 3)) if not retrato else ((0.16, 0.5, 18, 1), (0.84, 0.49, 18, 2))):
        bx, by = W * fx, H * fy
        dd = np.hypot((x - bx) / r, (y - by) / (r * 0.42))
        monte = dd < 1 - 0.12 * fbm(x / 3, y / 3, 2, s)
        alt = np.sqrt(np.clip(1 - dd ** 2, 0, 1))
        dm, _ = voronoi(x / 2.2, y / 1.5, s + 20)
        moeda = ruido(x * 0.9, y * 1.3, s + 20)
        lm = 0.08 + 0.42 * alt + 0.18 * (x < bx) - 0.22 * (dm < 0.12)
        m.tingir(monte, np.clip(lm + 0.1, 0, 0.999), OURO[:5], 0.15)
        borda_m = monte & (dd > 0.86 - 0.12 * fbm(x / 3, y / 3, 2, s))
        m.rgb[borda_m] *= 0.55
        brilho_ = monte & (moeda > 0.95) & (alt > 0.4)
        m.rgb[brilho_] = np.array(hexrgb('#fffbe0'), F)
        luzes.append(('ouro', bx, by - r * 0.15, r * 0.9))
    # colunas quebradas de pedra antiga, com marcas de garra
    for fx, base_, alt, w_, s in (((0.07, 0.86, 0.52, 18, 4), (0.93, 0.84, 0.46, 16, 5)) if not retrato else ((0.06, 0.74, 0.4, 16, 4), (0.94, 0.72, 0.36, 14, 5))):
        bx, by, ht = W * fx, H * base_, H * alt
        topo = by - ht + 6 * fbm(x / 3, 2, 2, s)
        u = (x - bx) / w_
        col = (np.abs(u) < 1) & (y > topo) & (y < by)
        nz = np.sqrt(np.clip(1 - u * u, 0, 1))
        estria = np.cos(u * 9) * 0.08
        lcol = 0.04 + 0.34 * nz + 0.25 * np.clip(-u * np.sign(bx - cx), 0, 1) + estria - 0.2 * (fbm(x / 2.5, y / 2.5, 2, s) < 0.35)
        m.tingir(col, np.clip(lcol, 0, 0.999), BASALTO[2:], 0.6)
        garra = col & (np.abs(((x - bx) * 0.8 + (y - by) * 0.3) % 6 - 3) < 0.5) & (np.abs(y - (by - ht * 0.5)) < ht * 0.12) & (np.abs(u) < 0.6)
        m.rgb[garra] *= 0.45
        sombra = np.hypot((x - bx) / (w_ * 1.5), (y - by) / 4) < 1
        m.rgb[sombra & chao & ~col] *= 0.55
    # estalagmites no chão, perto das bordas
    for fx, fy, h_, s in ((0.28, 0.52, 18, 6), (0.73, 0.5, 16, 7), (0.04, 0.6, 26, 8), (0.97, 0.62, 24, 9), (0.36, 0.49, 9, 10), (0.64, 0.49, 10, 11)):
        bx, by = W * fx, H * fy
        k = np.clip((by - y) / h_, 0, 1)
        larg = (1 - k) * h_ * 0.32
        mm = (np.abs(x - bx) < larg) & (y <= by) & (y > by - h_)
        m.tingir(mm, np.clip(0.15 + 0.4 * (x < bx) + 0.25 * (1 - k) * (y > by - 3), 0, 0.999), BASALTO[1:], 0.6)
    m.salvar(saida / f'{nome}-meio.png')

    # ---------------------------------------------------- frente: estalactites que emolduram o alto
    fr = Tela(W, H)
    rng = np.random.default_rng(3)
    n = int(W / 26)
    for i in range(n):
        lado_ = -1 if i % 2 == 0 else 1
        dist = rng.uniform(0, 0.42) ** 1.6  # mais perto das bordas
        bx = cx + lado_ * (0.5 - dist) * W + rng.uniform(-4, 4)
        perto_meio = np.exp(-((bx - cx) / (W * 0.25)) ** 2)
        comp = H * rng.uniform(0.1, 0.3) * (1 - 0.7 * perto_meio)
        larg = rng.uniform(7, 15) * (1 - 0.5 * perto_meio)
        k = np.clip(y / comp, 0, 1)
        mm = (np.abs(x - bx) < larg * (1 - k) ** 0.9) & (y < comp)
        fr.tingir(mm, np.clip(0.1 + 0.3 * (x < bx) + 0.25 * k, 0, 0.999), BASALTO, 0.5)
        ponta = mm & (k > 0.82)
        fr.tingir(ponta, np.full((H, W), 0.6, F), ROCHA_QUENTE[2:], 0.4)
    teto = y < 6 + 5 * fbm(x / 9, 0.2, 3, 30)
    fr.tingir(teto, np.clip(0.08 + 0.15 * fbm(x / 4, y / 4, 2, 31), 0, 0.999), BASALTO, 0.5)
    for cx_, cy_ in ((-6, H + 4), (W + 6, H + 4)):
        rocha = np.hypot((x - cx_) / (W * 0.16), (y - cy_) / (H * 0.2)) < 1 - 0.18 * fbm(x / 5, y / 5, 2, 33)
        fr.tingir(rocha, np.clip(0.05 + 0.15 * fbm(x / 3, y / 3, 2, 34), 0, 0.999), BASALTO, 0.5)
    fr.rgb *= 0.75
    fr.salvar(saida / f'{nome}-frente.png')

    # ---------------------------------------------------- luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    # lava do fundo: faixa larga e quente
    faixa = np.exp(-((y - H * hz) / (H * 0.07)) ** 2) * (0.55 + 0.25 * np.exp(-((x - cx) / (W * 0.3)) ** 2))
    brilho += faixa[..., None] * np.array(hexrgb('#ff7a20'), F)
    # luz que sobe da lava pelas paredes
    sobe = np.exp(-((x - cx) / (W * 0.28)) ** 2) * suave(0.15, 1.0, y / (H * hz)) * (y < H * hz) * 0.35
    brilho += sobe[..., None] * np.array(hexrgb('#ff9a40'), F)
    for tipo, bx, by, r in luzes:
        g = np.exp(-((x - bx) ** 2 + ((y - by) * 1.4) ** 2) / (r ** 2)) * 0.16
        brilho += g[..., None] * np.array(hexrgb('#ffd060'), F)
    a = np.clip(brilho.max(-1) / 255, 0, 1)
    lz.rgb = np.where(a[..., None] > 0, brilho / np.maximum(a[..., None], 1e-3), 0); lz.a = a
    lz.salvar(saida / f'{nome}-luz.png')


if __name__ == '__main__':
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'cenarios'
    saida.mkdir(parents=True, exist_ok=True)
    so = sys.argv[2] if len(sys.argv) > 2 else 'ambos'
    if so in ('ambos', 'paisagem'):
        pintar(520, 330, saida, 'covil-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'covil-retrato')
    print('ok', saida)
