#!/usr/bin/env python3
"""Coliseu da Consolidação: onde lutam o Guardião da Artrodese e o Rei da Consolidação (14/10/2026).

Arena de pedra ao entardecer: arquibancadas em arcos sobrepostos curvando ao fundo, toldos listrados
e flâmulas ao vento, um portão de grade levantado no centro com tochas dos lados, a areia dourada do
chão com marcas de passos e sombras compridas, um suporte de lanças e escudos e o céu laranja e
roxo do fim da tarde. Sem anatomia nos enfeites (regra de docs/flashcards/README.md). Camadas:
  fundo   céu do entardecer, sol baixo, arquibancadas em arcos com o público em pontinhos de cor
  meio    muro da arena, portão com grade, tochas, areia, suporte de lanças e escudos
  frente  flâmulas penduradas nas bordas e poeira dourada no ar
  luz     sol baixo, tochas e o brilho quente sobre a areia

    python3 scripts/cenarios/coliseu.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from pintor import F, Tela, fbm, hexrgb, rampa  # noqa: E402

PEDRA = rampa(['#3a2418', '#52341f', '#6a4628', '#845a34', '#9e7042', '#b88a56', '#d0a46c', '#e6c48c'])
AREIA = rampa(['#7a5428', '#966a32', '#b2843e', '#c89a4e', '#dab262', '#ecca7e'])
FERRO = rampa(['#0e0c10', '#1c1a20', '#2c2a32', '#3e3c46', '#5a5866'])
MADEIRA = rampa(['#2a180c', '#3e2614', '#56361e', '#704a2a'])
FOGO = rampa(['#7a1a06', '#d0480e', '#ff8a1a', '#ffc24a', '#fff2b0'])
VERMELHO = rampa(['#4a0e0e', '#741a16', '#a0281e', '#c8402a', '#e0623a'])
OURO = rampa(['#5a3a0a', '#8a5c14', '#b8841e', '#e0ac34', '#f6d060', '#fff0a8'])


def ret(x, y, x0, y0, x1, y1):
    return (x >= x0) & (x < x1) & (y >= y0) & (y < y1)


def pintar(W: int, H: int, saida: Path, nome: str):
    retrato = H > W
    t0 = Tela(W, H); x, y = t0.x, t0.y
    cx = W / 2
    s = (W / 520) * 1.4 if not retrato else (W / 250) * 1.0
    muro_y = H * (0.6 if retrato else 0.58)          # topo do muro da arena
    areia_y = H * (0.68 if retrato else 0.7)         # onde começa a areia
    luzes = []

    # ================================================================ fundo
    f = Tela(W, H)
    k = np.clip(y / muro_y, 0, 1)
    c0, c1, c2 = (np.array(hexrgb(c), F) for c in ('#3a2a6a', '#c0567a', '#ffb060'))
    kk = k[..., None]
    f.rgb[:] = np.where(kk < 0.5, c0 * (1 - kk * 2) + c1 * kk * 2, c1 * (2 - kk * 2) + c2 * (kk * 2 - 1)); f.a[:] = 1
    sol = np.array([cx + W * (0.24 if not retrato else 0.2), H * (0.13 if not retrato else 0.1)])
    f.cor(np.hypot(x - sol[0], y - sol[1]) < 16 * s, '#ffe6a0')
    f.cor(np.hypot(x - sol[0], y - sol[1]) < 13 * s, '#fff6d0')
    luzes.append((sol[0], sol[1], 80 * s, '#ffa860', 0.55))
    nuv = fbm(x / 40, y / 8, 4, 51)
    f.cor((nuv > 0.66) & (y < muro_y * 0.75), '#f08a7a', 0.8)
    f.cor((nuv > 0.72) & (y < muro_y * 0.75), '#ffc8a0', 0.8)
    # arquibancada: anel elíptico de arcos em três andares, curvando para longe
    topo_arq = H * 0.2
    curva = topo_arq + H * 0.06 * ((x - cx) / (W / 2)) ** 2 * -1 + H * 0.06
    arq = (y > curva) & (y < muro_y)
    lp = 0.35 + 0.12 * fbm(x / 6, y / 6, 3, 52)
    f.tingir(arq, np.clip(lp, 0, 0.999), PEDRA, 0.5)
    altura = muro_y - curva
    for i in range(3):
        a0 = curva + altura * (i / 3); a1 = curva + altura * ((i + 1) / 3)
        f.tingir(arq & (np.abs(y - a0) < 1.2 * s), np.full((H, W), 0.7, F), PEDRA, 0.3)      # cornija
        larg = (14 - i * 2) * s
        u = ((x - cx) / larg) % 1
        alto_arco = (a1 - a0) * 0.62
        topo_arco = a0 + (a1 - a0) * 0.22
        dentro = (np.abs(u - 0.5) < 0.3) & (y > topo_arco + alto_arco * 0.35) & (y < topo_arco + alto_arco)
        dentro |= (np.hypot((u - 0.5) * larg, (y - (topo_arco + alto_arco * 0.35)) * 1.0) < 0.3 * larg) & (y <= topo_arco + alto_arco * 0.35)
        f.cor(arq & dentro, '#2a1a22')
        # o público: pontinhos de cor nos arcos (bandeirinhas, chapéus), sem desenhar gente
        pub = arq & dentro & (fbm(x / 1.3, y / 1.3, 1, 60 + i) > 0.55)
        tons = np.floor(fbm(x / 2, y / 2, 1, 70 + i) * 5).astype(int) % 5
        for j, c in enumerate(('#e0623a', '#f6d060', '#5a9ad0', '#e8e0d0', '#9a5ac0')):
            f.cor(pub & (tons == j) & (y > topo_arco + alto_arco * 0.55), c, 0.85)
    # toldos listrados no alto da arquibancada
    told = (y > curva - 6 * s) & (y < curva + 1) & (np.abs(x - cx) < W * 0.48)
    faixa = ((x / (6 * s)) % 2) < 1
    f.cor(told & faixa, '#c8402a'); f.cor(told & ~faixa, '#ecdcbc')
    f.cor(told & (y > curva - 1.5 * s) & (((x / (3 * s)) % 2) < 1), '#7a1a14')
    f.velar(arq * np.clip(1 - (y - curva) / np.maximum(altura, 1), 0, 1) * 0.2, '#ff9a60')
    f.salvar(saida / f'{nome}-fundo.png')

    # ================================================================ meio
    m = Tela(W, H)
    # muro da arena com blocos grandes e uma faixa de mármore
    my = np.floor(y / (6 * s)).astype(np.int64)
    junta = ((y % (6 * s)) < 0.9) | (((x + (my % 2) * 8 * s) % (16 * s)) < 0.9)
    muro = (y >= muro_y) & (y < areia_y)
    m.tingir(muro, np.clip(0.5 + 0.08 * fbm(x / 5, y / 5, 2, 80) - 0.18 * junta, 0, 0.999), PEDRA, 0.5)
    m.tingir(muro & (y < muro_y + 2 * s), np.full((H, W), 0.85, F), PEDRA, 0.3)
    # escudos de bronze pregados no muro
    for i in range(-3, 4):
        if i == 0:
            continue
        ex = cx + i * W * (0.13 if not retrato else 0.16)
        ey = muro_y + (areia_y - muro_y) * 0.5
        esc = np.hypot(x - ex, y - ey) < 4.5 * s
        m.tingir(esc, np.clip(0.55 - (x - ex + y - ey) / (14 * s), 0, 0.999), OURO, 0.3)
        m.cor(np.hypot(x - ex, y - ey) < 1.3 * s, '#5a3a0a')
    # portão central: arco escuro com grade levantada pela metade
    pw, ph = 22 * s, 34 * s
    base = areia_y + 2
    vao = (np.abs(x - cx) < pw) & (y < base) & ((y > base - ph + pw) | (np.hypot(x - cx, y - (base - ph + pw)) < pw))
    m.tingir(vao, np.clip(0.1 + 0.15 * (y - (base - ph)) / ph, 0, 0.999), FERRO, 0.3)
    moldura = (np.abs(x - cx) < pw + 4 * s) & (y < base) & ((y > base - ph + pw) | (np.hypot(x - cx, y - (base - ph + pw)) < pw + 4 * s)) & ~vao
    m.tingir(moldura, np.clip(0.6 + 0.1 * fbm(x / 3, y / 3, 2, 81) - 0.2 * ((((np.arctan2(y - (base - ph + pw), x - cx) * 6) % 1) < 0.08) & (y < base - ph + pw)), 0, 0.999), PEDRA, 0.4)
    m.tingir(moldura & (np.hypot(x - cx, y - (base - ph)) < 4 * s), np.full((H, W), 0.7, F), OURO, 0.2)  # pedra-chave dourada
    grade_y = base - ph * 0.55
    grade = vao & (y < grade_y) & ((((x - cx) % (5 * s)) < 1.2 * s) | (((y - base) % (6 * s)) < 1.0 * s))
    m.tingir(grade, np.full((H, W), 0.55, F), FERRO, 0.2)
    m.tingir(vao & (np.abs(y - grade_y) < 1.5 * s), np.full((H, W), 0.5, F), FERRO, 0.2)
    # tochas dos dois lados do portão
    for d in (-1, 1):
        tx, ty = cx + d * (pw + 12 * s), base - ph * 0.7
        m.tingir(ret(x, y, tx - 1.2 * s, ty, tx + 1.2 * s, ty + 9 * s), np.full((H, W), 0.4, F), FERRO, 0.2)
        m.tingir(ret(x, y, tx - 2.5 * s, ty - 1.5 * s, tx + 2.5 * s, ty + 1 * s), np.full((H, W), 0.5, F), FERRO, 0.2)
        cham = (np.hypot((x - tx) / (2.6 * s), (y - ty + 3 * s) / (4.5 * s)) < 1) & (fbm(x / 1.5, y / 1.5, 2, 90 + d) > 0.3)
        m.tingir(cham, np.clip(0.95 - (ty - y) / (8 * s) * 0.6, 0, 0.999), FOGO, 0.2)
        luzes.append((tx, ty - 3 * s, 28 * s, '#ff9a3a', 0.6))
    # areia com marcas de passos, círculos de luta e sombras compridas
    areia = y >= areia_y
    zz = np.clip((y - areia_y) / (H - areia_y), 0, 1)
    marcas = fbm(x / 3, y / 1.5, 3, 95)
    circulo = np.abs(np.hypot((x - cx) / (W * 0.4), (y - (areia_y + (H - areia_y) * 0.5)) / ((H - areia_y) * 0.4)) - 1) < 0.02
    luzareia = 0.2 * np.exp(-((x - sol[0]) / (W * 0.5)) ** 2)
    m.tingir(areia, np.clip(0.45 + 0.2 * zz + luzareia + 0.12 * (marcas - 0.5) - 0.2 * circulo, 0, 0.999), AREIA, 0.6)
    m.cor(areia & (fbm(x / 0.9, y / 0.9, 1, 96) > 0.8), '#f6dc9a', 0.6)
    m.cor(areia & (y < areia_y + 5 * s) & (np.abs(x - cx) > pw + 6 * s), '#5a3a1e', 0.35)   # sombra do muro
    # suporte de lanças e um escudo redondo apoiado, à esquerda
    sx0 = W * (0.12 if not retrato else 0.1); sy = areia_y + (H - areia_y) * 0.32
    m.tingir(ret(x, y, sx0, sy - 3 * s, sx0 + 26 * s, sy - 1 * s), np.full((H, W), 0.5, F), MADEIRA, 0.3)
    m.tingir(ret(x, y, sx0 + 1 * s, sy - 3 * s, sx0 + 3 * s, sy + 6 * s) | ret(x, y, sx0 + 23 * s, sy - 3 * s, sx0 + 25 * s, sy + 6 * s), np.full((H, W), 0.4, F), MADEIRA, 0.3)
    for i in range(4):
        lx = sx0 + (5 + i * 5) * s
        m.tingir(ret(x, y, lx, sy - 30 * s, lx + 1.2 * s, sy + 6 * s), np.full((H, W), 0.6, F), MADEIRA, 0.2)
        ponta = (np.abs(x - lx - 0.6 * s) < (y - (sy - 36 * s)) * 0.3) & (y > sy - 36 * s) & (y < sy - 30 * s)
        m.tingir(ponta, np.full((H, W), 0.75, F), PEDRA, 0.2)
    ec = np.array([sx0 + 30 * s, sy + 1 * s])
    esc = np.hypot(x - ec[0], (y - ec[1]) * 0.9) < 7 * s
    m.tingir(esc, np.clip(0.5 + 0.2 * np.cos(np.arctan2(y - ec[1], x - ec[0]) * 8) * (np.hypot(x - ec[0], y - ec[1]) > 3 * s), 0, 0.999), VERMELHO, 0.3)
    m.tingir(np.hypot(x - ec[0], y - ec[1]) < 2.2 * s, np.full((H, W), 0.75, F), OURO, 0.2)
    m.cor(np.abs(np.hypot(x - ec[0], (y - ec[1]) * 0.9) - 7 * s) < 0.7 * s, '#e0ac34')
    # pilha de caixotes à direita
    bx = W * (0.82 if not retrato else 0.78); by = areia_y + (H - areia_y) * 0.4
    for ox, oy, l in ((0, 0, 12), (12, 0, 12), (6, -12, 12)):
        cx_ = ret(x, y, bx + ox * s, by + oy * s - l * s, bx + (ox + l) * s, by + oy * s)
        m.tingir(cx_, np.clip(0.45 + 0.1 * fbm(x / 2, y / 6, 2, 97) - 0.2 * ((np.abs(x - (bx + (ox + l / 2) * s)) < 0.6 * s) | ((np.abs((x - bx - ox * s) - (by + oy * s - y)) < 0.8 * s))), 0, 0.999), MADEIRA, 0.3)
        m.cor(cx_ & ~ret(x, y, bx + ox * s + 1, by + oy * s - l * s + 1, bx + (ox + l) * s - 1, by + oy * s - 1), '#1e120a')
    m.salvar(saida / f'{nome}-meio.png')

    # ================================================================ frente
    fr = Tela(W, H)
    # flâmulas penduradas de uma corda no alto
    corda = H * 0.04 + H * 0.05 * ((x - cx) / (W / 2)) ** 2
    fr.cor(np.abs(y - corda) < 0.7, '#3a2418')
    n = 9 if not retrato else 5
    for i in range(n):
        fx_ = (i + 0.5) * W / n
        fy_ = H * 0.04 + H * 0.05 * ((fx_ - cx) / (W / 2)) ** 2
        tri = (y > fy_) & (y < fy_ + 11 * s) & (np.abs(x - fx_) < (fy_ + 11 * s - y) * 0.4)
        cor = ('#c8402a', '#f6d060', '#ecdcbc')[i % 3]
        fr.cor(tri, cor)
        fr.cor(tri & (x > fx_ + 0.5), '#000000', 0.18)
    # poeira dourada no ar
    rng = np.random.default_rng(9)
    for _ in range(30):
        px_, py_ = rng.uniform(0, W), rng.uniform(H * 0.3, H)
        fr.cor(np.hypot(x - px_, y - py_) < rng.uniform(0.5, 1.0), '#ffe6a0', 0.7)
    fr.salvar(saida / f'{nome}-frente.png')

    # ================================================================ luz
    lz = Tela(W, H)
    brilho = np.zeros((H, W, 3), F)
    for bx_, by_, r, cor, kk_ in luzes:
        g = np.exp(-((x - bx_) ** 2 + ((y - by_) * 1.1) ** 2) / (r ** 2)) * kk_
        brilho += g[..., None] * np.array(hexrgb(cor), F)
    a = np.clip(brilho.max(-1) / 255, 0, 1)
    lz.rgb = np.where(a[..., None] > 0, brilho / np.maximum(a[..., None], 1e-3), 0); lz.a = a
    lz.salvar(saida / f'{nome}-luz.png')


if __name__ == '__main__':
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'cenarios'
    saida.mkdir(parents=True, exist_ok=True)
    so = sys.argv[2] if len(sys.argv) > 2 else 'ambos'
    if so in ('ambos', 'paisagem'):
        pintar(520, 330, saida, 'coliseu-paisagem')
    if so in ('ambos', 'retrato'):
        pintar(250, 470, saida, 'coliseu-retrato')
    print('ok', saida)
