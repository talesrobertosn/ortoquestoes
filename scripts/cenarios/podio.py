"""Pódio do ranking em pixel art (refeito do zero em 14/10/2026).

Duas cenas, com o cavaleiro chibi (o mascote) nos três degraus:
  - festa: dia de festival no estilo do Stardew Valley (céu, morros, árvores
    redondas, bandeirinhas, gramado florido e cerca). É o ranking das questões.
  - cripta: salão de pedra à noite, com arcos, tochas, estandartes e cristais.
    É o ranking dos Flashcards (no site o nome continua "Flashcards").

Os nomes e os números entram por cima, em HTML (Ranking.css); a cena tem as
placas vazias no lugar certo. Nada baixado ou gerado por IA.

    python3 scripts/cenarios/podio.py      # grava public/ranking/podio-{festa,cripta}.png
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa, ruido  # noqa: E402
from promo import colar, quadro  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]
SAI = RAIZ / 'public' / 'ranking'
W, H = 480, 220
CHAO = 196
# degraus: (posição, x0, x1, topo); a ordem visual é 2º, 1º, 3º
DEGRAUS = {2: (112, 194, 152), 1: (199, 281, 130), 3: (286, 368, 164)}
HEROI = {1: ('heroi-6', 'vitoria', 2), 2: ('heroi-4', 'vitoria', 1), 3: ('heroi-2', 'vitoria', 0)}
METAL = {1: ['#7a4a0a', '#c28a2a', '#f2c45a', '#fff1b0'], 2: ['#4a5468', '#8a96aa', '#c8d2e0', '#f4f8ff'], 3: ['#5a2a12', '#9a5226', '#d08a4a', '#f4c08a']}

DIGITOS = {  # 5×7
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
}


def digito(t: Tela, d: str, x: int, y: int, cores, esc=2):
    for j, linha in enumerate(DIGITOS[d]):
        for i, c in enumerate(linha):
            if c == '1':
                for a in range(esc):
                    for b in range(esc):
                        X, Y = x + i * esc + a, y + j * esc + b
                        t.rgb[Y, X] = hexrgb(cores[3] if (j < 2 or i == 0) else cores[2]); t.a[Y, X] = 1
                # sombra à direita e embaixo (letra entalhada)
                for (dx, dy) in ((esc, 0), (0, esc)):
                    X, Y = x + i * esc + dx, y + j * esc + dy
                    if t.a[Y, X] == 1 and tuple(t.rgb[Y, X].astype(int)) in (hexrgb(cores[2]), hexrgb(cores[3])):
                        continue
                    t.rgb[Y, X] = hexrgb(cores[0])


def degrau(t: Tela, pos: int, pedra, madeira, noite=False):
    x0, x1, topo = DEGRAUS[pos]
    m = (t.x >= x0) & (t.x < x1) & (t.y >= topo + 6) & (t.y < CHAO + 2)
    # blocos de pedra em fiadas, luz da esquerda
    fiada = ((t.y - topo) // 9).astype(int)
    tijolo = ((t.x + (fiada % 2) * 8 - x0) // 16).astype(int)
    junta = (((t.y - topo - 6) % 9) < 1) | (((t.x + (fiada % 2) * 8 - x0) % 16) < 1)
    luz = 0.62 - (t.x - x0) / (x1 - x0) * 0.35 + (ruido(tijolo * 3.1, fiada * 1.7, 5) - 0.5) * 0.3
    t.tingir(m & ~junta, luz, pedra, 0.4)
    t.tingir(m & junta, luz * 0.4, pedra, 0)
    # tampo de madeira com borda de metal (ouro, prata, bronze)
    tampo = (t.x >= x0 - 3) & (t.x < x1 + 3) & (t.y >= topo) & (t.y < topo + 6)
    t.tingir(tampo, 0.75 - (t.y - topo) / 6 * 0.5 + (ruido(t.x * 0.7, t.y * 3, 9) - 0.5) * 0.2, madeira, 0.5)
    met = rampa(METAL[pos])
    friso = (t.x >= x0 - 3) & (t.x < x1 + 3) & (t.y >= topo + 5) & (t.y < topo + 7)
    t.tingir(friso, 0.85 - (t.x - x0) / (x1 - x0) * 0.4, met, 0.3)
    # número grande entalhado no meio da frente, com moldura de metal
    cx = (x0 + x1) // 2
    alto = CHAO - topo - 7
    esc = 3 if alto >= 34 else 2
    ny = topo + 7 + (alto - 7 * esc) // 2
    moldura = (np.abs(t.x - cx) <= 5 * esc // 2 + 5) & (t.y >= ny - 4) & (t.y < ny + 7 * esc + 4)
    t.tingir(moldura, 0.6 + (ny - t.y) / 60, met, 0.3)
    fundo = (np.abs(t.x - cx) <= 5 * esc // 2 + 3) & (t.y >= ny - 2) & (t.y < ny + 7 * esc + 2)
    t.cor(fundo, '#2a1f18' if not noite else '#14101c')
    digito(t, str(pos), cx - (5 * esc) // 2, ny, METAL[pos], esc)
    # sombra no chão à direita
    sombra = (t.x >= x1) & (t.x < x1 + 10 - (t.y - topo) * 0) & (t.y >= CHAO - 2) & (t.y < CHAO + 3)
    t.rgb[sombra] *= 0.7


def festa() -> Image.Image:
    t = Tela(W, H)
    # céu de verão
    ceu = rampa(['#5aa8e0', '#6ab4e6', '#7fc2ea', '#96cfee', '#b2dcf0', '#cfe8ee'])
    t.tingir(np.ones((H, W)), t.y / 120, ceu, 0.8)
    # nuvens fofas
    n = fbm(t.x / 46, t.y / 18, 4, 3)
    nuvem = (n > 0.6) & (t.y < 70)
    t.tingir(nuvem, 0.6 + (n - 0.6) * 2 - (t.y % 70) / 300, rampa(['#c8dcec', '#e4eef6', '#ffffff']), 0.6)
    # morros ao longe (dois planos)
    for k, (base, amp, cores) in enumerate(((124, 16, ['#6aa86a', '#7cba76', '#94cc88']), (142, 12, ['#4e9a4e', '#5eae58', '#76c268']))):
        topo = base - amp * (0.5 + 0.5 * np.sin(t.x / (38 + k * 9) + k * 2)) - 6 * fbm(t.x / 30, k, 3, 11 + k)
        m = t.y >= topo
        t.tingir(m, 0.7 - (t.y - topo) / 60, rampa(cores), 0.5)
    # árvores redondas ao fundo (copas em bolhas com luz no alto)
    rng = np.random.default_rng(4)
    for i in range(17):
        cx = 6 + i * 29 + rng.integers(-6, 6)
        if 100 < cx < 380 and i % 3:  # abre espaço para o pódio
            continue
        cy, r = 152 + rng.integers(-6, 4), 13 + rng.integers(0, 6)
        tronco = (np.abs(t.x - cx) <= 2) & (t.y >= cy) & (t.y < cy + 18)
        t.tingir(tronco, 0.5 - (t.x - cx) / 8, rampa(['#3a2414', '#5a3820', '#7a5030']), 0)
        copa = np.zeros((H, W), bool); luzc = np.full((H, W), 9.0, F)
        for (dx, dy, rr) in ((0, 0, r), (-r * 0.6, 4, r * 0.7), (r * 0.6, 4, r * 0.7), (0, -r * 0.5, r * 0.75)):
            d = np.hypot(t.x - cx - dx, t.y - cy - dy)
            copa |= d <= rr
            luzc = np.minimum(luzc, np.hypot(t.x - cx - dx + rr * 0.4, t.y - cy - dy + rr * 0.5) / rr)
        t.tingir(copa, 1 - luzc * 0.65, rampa(['#2a6a3a', '#3a8444', '#4e9e4e', '#6ab45a', '#8ccc6a']), 0.5)
    # gramado com faixas e flores
    chao = t.y >= CHAO - 18
    t.tingir(chao, 0.75 - (t.y - CHAO + 18) / 50 + (ruido(t.x / 3, t.y / 2, 2) - 0.5) * 0.25, rampa(['#3e8a3a', '#4e9e44', '#62b250', '#7cc45c']), 0.6)
    for i in range(70):
        fx, fy = rng.integers(0, W), rng.integers(CHAO - 14, H - 2)
        cor_f = ['#ffffff', '#ffe46a', '#ff8ab0', '#8ab8ff', '#ff6a5a'][i % 5]
        t.rgb[fy, fx] = hexrgb(cor_f)
        if i % 3 == 0 and fx + 1 < W:
            t.rgb[fy, fx + 1] = hexrgb(cor_f); t.rgb[fy + 1, fx] = hexrgb('#2e6a2e')
    # cerca de madeira atrás do pódio
    cerca = (((t.x % 18) < 3) & (t.y >= CHAO - 30) & (t.y < CHAO - 12)) | (((t.y - (CHAO - 26)) % 9 < 2) & (t.y >= CHAO - 26) & (t.y < CHAO - 14))
    t.tingir(cerca, 0.6 - ((t.x % 18) / 18) * 0.3, rampa(['#6a4024', '#8a5a32', '#b07a44', '#d09a5a']), 0)
    # bandeirinhas em dois varais
    for (y0, flecha, fase) in ((14, 26, 0), (30, 20, 1)):
        for xv in range(0, W):
            yv = int(y0 + flecha * (1 - ((xv - W / 2) / (W / 2)) ** 2))
            t.rgb[yv, xv] = hexrgb('#5a3a28'); t.a[yv, xv] = 1
        for i in range(fase * 6, W, 13):
            yv = int(y0 + flecha * (1 - ((i - W / 2) / (W / 2)) ** 2))
            cor_b = ['#e04a3a', '#ffcf4a', '#4a8ae0', '#5ab85a', '#f08ac0'][(i // 13 + fase) % 5]
            band = (t.y > yv) & (t.y <= yv + 9) & (np.abs(t.x - i - 4) <= (yv + 9 - t.y) * 0.5)
            t.cor(band, cor_b)
            t.cor(band & (t.x < i + 3), tuple(min(255, c + 40) for c in hexrgb(cor_b)))
    pedra = rampa(['#4a4a52', '#62626c', '#7c7c86', '#9a98a2', '#b8b6bc'])
    madeira = rampa(['#5a3418', '#7a4a22', '#9a6430', '#ba8040', '#d49a54'])
    for pos in (2, 1, 3):
        degrau(t, pos, pedra, madeira)
    img = Image.fromarray(np.dstack([np.clip(t.rgb, 0, 255), t.a * 255]).astype(np.uint8), 'RGBA')
    herois(img, noite=False)
    confete(img, rng)
    return img


def cripta() -> Image.Image:
    t = Tela(W, H)
    rng = np.random.default_rng(9)
    # parede de pedra com arcos
    parede = rampa(['#12101a', '#1a1726', '#231f32', '#2e2940', '#3a344e'])
    fiada = (t.y // 10).astype(int)
    junta = ((t.y % 10) < 1) | (((t.x + (fiada % 2) * 12) % 24) < 1)
    t.tingir(np.ones((H, W)), 0.55 + (ruido(t.x / 12, fiada, 3) - 0.5) * 0.4 - t.y / 600, parede, 0.5)
    t.cor(junta & (t.y < CHAO), '#0c0a12')
    for cx in (52, 240, 428):
        arco = (np.abs(t.x - cx) < 34) & (t.y > 40) & ((t.y > 74) | (np.hypot(t.x - cx, t.y - 74) < 34))
        t.tingir(arco, 0.2 + (t.y - 40) / 300, rampa(['#07060c', '#0d0b16', '#151222']), 0.3)
        borda = (np.abs(np.hypot(t.x - cx, t.y - 74) - 36) < 2.5) & (t.y <= 74) | ((np.abs(np.abs(t.x - cx) - 36) < 2.5) & (t.y > 74) & (t.y < CHAO))
        t.tingir(borda, 0.75 - (t.x - cx + 36) / 160, rampa(['#3a344e', '#4e4766', '#665e82', '#7e76a0']), 0.3)
    # estandartes roxos com friso dourado
    for cx in (150, 330):
        est = (np.abs(t.x - cx) <= 9) & (t.y >= 26) & (t.y < 88 - np.abs(t.x - cx) * 0.9)
        t.tingir(est, 0.7 - (t.x - cx + 9) / 40, rampa(['#3a1a5a', '#56287e', '#7038a0', '#8a4ac0']), 0.4)
        t.cor((np.abs(np.abs(t.x - cx) - 8) < 1) & est, '#e8b03a')
        emb = np.hypot(t.x - cx, t.y - 48) <= 4
        t.cor(emb, '#f2c45a'); t.cor(np.hypot(t.x - cx, t.y - 48) <= 2, '#fff1b0')
        t.cor((t.y >= 24) & (t.y < 27) & (np.abs(t.x - cx) <= 12), '#6a4a24')
    # tochas nas colunas, com halo quente
    for cx in (100, 380):
        t.velar(np.clip(1 - np.hypot(t.x - cx, (t.y - 62) * 1.2) / 70, 0, 1) * 0.35, '#ff9a3c')
        haste = (np.abs(t.x - cx) <= 1) & (t.y >= 64) & (t.y < 80)
        t.cor(haste, '#5a3a20')
        t.cor((np.abs(t.x - cx) <= 3) & (t.y >= 62) & (t.y < 65), '#8a6a3a')
        fogo = np.hypot(t.x - cx, (t.y - 56) * 0.7) <= 4.5 - (56 - t.y).clip(0) * 0.2
        t.tingir(fogo, 1 - np.hypot(t.x - cx, t.y - 58) / 7, rampa(['#c83a1e', '#f07a2a', '#ffc24a', '#fff1b0']), 0.3)
    # chão de lajes
    chao = t.y >= CHAO - 14
    laje = (((t.x + (t.y // 7) * 9) % 26) < 1) | ((t.y % 7) < 1)
    t.tingir(chao, 0.45 - (t.y - CHAO) / 80 + (ruido(t.x / 5, t.y / 3, 7) - 0.5) * 0.2, rampa(['#16131e', '#211c2c', '#2c263a', '#38314a']), 0.5)
    t.cor(chao & laje, '#0e0c14')
    # círculo mágico sob o 1º lugar
    cx1 = (DEGRAUS[1][0] + DEGRAUS[1][1]) / 2
    anel = np.abs(np.hypot((t.x - cx1) / 3.2, (t.y - (CHAO + 6))) - 7) < 0.8
    t.cor(anel & chao, '#b98aff')
    # cristais roxos e azuis no chão
    for i in range(9):
        cx, base = int(rng.integers(8, W - 8)), int(rng.integers(CHAO, H - 4))
        if 100 < cx < 380 and base < CHAO + 10:
            continue
        alt = int(rng.integers(6, 12))
        cr = (np.abs(t.x - cx) <= (base - t.y) * 0.0 + 2.5 - (base - t.y) / alt * 2) & (t.y <= base) & (t.y > base - alt)
        cores = rampa(['#3a2a8a', '#5a4ac8', '#8a7aff', '#d0c8ff']) if i % 2 else rampa(['#1a5a7a', '#2a8ab0', '#5ac8e8', '#c8f4ff'])
        t.tingir(cr, 0.4 + (cx - t.x) / 10 + (base - t.y) / alt * 0.4, cores, 0)
        t.velar(np.clip(1 - np.hypot(t.x - cx, t.y - base + alt / 2) / 18, 0, 1) * 0.18, '#8a7aff')
    pedra = rampa(['#1e1a28', '#2a2536', '#383146', '#484058', '#5c536e'])
    madeira = rampa(['#2a160c', '#3e2414', '#56341c', '#6e4626', '#8a5a32'])
    for pos in (2, 1, 3):
        degrau(t, pos, pedra, madeira, noite=True)
    # luz de cima sobre o 1º lugar
    t.velar(np.clip(1 - np.abs(t.x - cx1) / 40, 0, 1) * np.clip(1 - t.y / 160, 0, 1) * 0.22, '#fff1b0')
    img = Image.fromarray(np.dstack([np.clip(t.rgb, 0, 255), t.a * 255]).astype(np.uint8), 'RGBA')
    herois(img, noite=True)
    return img


def herois(img: Image.Image, noite: bool):
    for pos in (2, 3, 1):
        x0, x1, topo = DEGRAUS[pos]
        nome, anim, k = HEROI[pos]
        q = quadro(nome, anim, k)
        if pos != 1:
            q = q.transpose(Image.FLIP_LEFT_RIGHT) if pos == 3 else q
        colar(img, q, (x0 + x1) // 2, topo + 1, 1, sombra=True)


def confete(img: Image.Image, rng):
    a = np.array(img)
    for i in range(46):
        x, y = int(rng.integers(90, 390)), int(rng.integers(40, 128))
        c = hexrgb(['#ffcf4a', '#e04a3a', '#4a8ae0', '#5ab85a', '#f08ac0', '#ffffff'][i % 6])
        a[y, x, :3] = c
        if i % 2:
            a[y, x + 1, :3] = c
        else:
            a[y + 1, x, :3] = c
    img.paste(Image.fromarray(a, 'RGBA'))


if __name__ == '__main__':
    SAI.mkdir(parents=True, exist_ok=True)
    for nome, f in (('festa', festa), ('cripta', cripta)):
        im = f()
        im.save(SAI / f'podio-{nome}.png', optimize=True)
        if '--previa' in sys.argv:
            im.resize((W * 3, H * 3), Image.NEAREST).save(f'/tmp/claude-0/-home-user-ortoquestoes/f5610743-f629-5049-9ae3-7beb6cde016a/scratchpad/podio-{nome}.png')
    print('pódios gravados em', SAI.relative_to(RAIZ))
