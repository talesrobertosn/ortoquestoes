"""Cenas da espera, parte B (O Gato Aventureiro, 31/10/2026): pergaminho, livro quase caindo, borboleta mágica,
cochilo interrompido, festa, caminhada e os quatro segredos.

Cada linha é uma função f(t, k) (k = 0..7) num quadro de 96 x 56 (scripts/gato_cenas/base.py). Regras de emenda:
linha que começa sentada tem o quadro 0 igual a B.repouso_sentado (o gato, pixel a pixel); linha que termina sentada
tem o quadro 7 igual; o mesmo para deitado com B.repouso_deitado. Dentro de uma cena, o quadro 7 de um trecho e o 0
do seguinte usam a mesma pose (funções _pose_* compartilhadas). Os objetos (pergaminho, livros, borboleta, coruja)
são desenhados aqui com as mesmas formas e a mesma luz do gato; somem de cena (rolando, voando ou num brilho) antes
do último quadro, para a cena seguinte começar limpa.
"""
from __future__ import annotations

import math

from . import base as B

G = B.G
X0 = B.X_SENTA
CHAO = B.CHAO

# ═══════════════════════════════ materiais dos objetos ═══════════════════════════════
# Acrescentados à paleta do gato (prefixo b_ para não colidir com a parte A). Rampas do escuro ao claro.
_NOVOS = {
    "b_madeira": G.Mat(["#3f2112", "#6b3a1e", "#94582c", "#bd7d42", "#e0a865"], 1, 4),
    "b_perg": G.Mat(["#9a764a", "#c7a06a", "#e4c990", "#f5e4b8", "#fff4d8"], 1, 4),
    "b_verde": G.Mat(["#1d4628", "#2c6a3a", "#3f9150", "#64b468", "#9bd68a"], 1, 4),
    "b_vinho": G.Mat(["#4e1622", "#7a2434", "#a8384a", "#cf5a64", "#ef8c8c"], 1, 4),
    "b_ouro": G.Mat(["#6e3f0c", "#a86f16", "#dca42a", "#ffd25a", "#fff1a6"], 1, 4),
    "b_coruja": G.Mat(["#3a1f0e", "#6b3a1a", "#9a5a26", "#c4823c", "#e6b06a"], 1, 4),
}
for _n, _m in _NOVOS.items():
    if _n not in G.MATS:
        G.MATS[_n] = _m
        G.NOMES_MAT.append(_n)
        G.IDX_MAT[_n] = len(G.NOMES_MAT) - 1
        G._RAMPAS.append(G.np.array([G.hx(c) for c in _m.rampa]))


# ═══════════════════════════════ utilidades ═══════════════════════════════
def _lerp(a, b, u):
    return a + (b - a) * u


def _lerp_pts(A, Bp, u):
    return tuple((_lerp(a[0], b[0], u), _lerp(a[1], b[1], u)) for a, b in zip(A, Bp))


def _suave(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


CAUDA_FRENTE = G.cauda_enrolada_frente(0, 0.0)


def cauda_atras(w=0.0, alta=1.0):
    """Cauda atrás do gato sentado, erguida (alta = 1) e com a ponta balançando (w de -1 a 1). 5 pontos, para
    misturar com a cauda enrolada na frente."""
    return ((-8.0, -2.4), (-13.0, -4.0 - 0.5 * alta), (-16.4 + 0.4 * w, -8.0 - 2.0 * alta),
            (-16.8 + 1.8 * w, -12.5 - 3.5 * alta), (-14.2 + 3.2 * w, -15.5 - 5.0 * alta))


def cauda_mix(u, w=0.0, alta=1.0):
    """u = 0: enrolada na frente (a do repouso); u = 1: erguida atrás. Devolve (pontos, cauda_frente)."""
    if u <= 0:
        return CAUDA_FRENTE, True
    return _lerp_pts(CAUDA_FRENTE, cauda_atras(w, alta), _suave(u)), u < 0.3


def sentado(t, cauda_u=0.0, cauda_w=0.0, cauda_alta=1.0, **kw):
    """O gato sentado do repouso com mudanças (cauda misturada entre a da frente e a erguida atrás)."""
    if cauda_u > 0 and "cauda" not in kw:
        kw["cauda"], kw["cauda_frente"] = cauda_mix(cauda_u, cauda_w, cauda_alta)
    return B.repouso_sentado(t, **kw)


def deitado(t, **kw):
    return B.repouso_deitado(t, **kw)


def em_pe(t, x0, p, espelho=False, sombra=True):
    """Cópia de G.corpo_em_pe com espelho (olhando para a esquerda) e a sombra no chão novo."""
    s = 1.0
    est = G.ESTILO
    t.chao = CHAO
    xf = G.Xf(x0, CHAO - 0.5 + p.dy, s, 0.0, espelho)
    xa = G.Xf(x0, CHAO - 0.5, s, 0.0, espelho)
    if sombra:
        B.sombra(t, x0 + (1 if espelho else -1) * 0.5, 14)
    q, o = p.quadril, p.ombro
    G.cauda(t, [xf(c) for c in p.cauda], xf.r(2.4), xf.r(1.8), s=s)
    pe = lambda i: xa((p.pes[i][0], p.pes[i][1] - 1.4))
    jo = lambda i: None if p.joelhos[i] is None else xa(p.joelhos[i])
    G.perna(t, xf((q[0] - 1.0, q[1] + 2.0)), pe(1), xf.r(2.2), luz=-0.24, joelho=jo(1))
    G.perna(t, xf((o[0] - 0.4, o[1] + 2.5)), pe(3), xf.r(2.1), luz=-0.24, joelho=jo(3))
    g = t.grupo(True)
    t.pinta(G.tubo([xf(q), xf(o)], (xf.r(6.3), xf.r(5.9))), "pelo", g)
    t.decal(G.elipse(xf(((q[0] + o[0]) / 2 + 1.0, (q[1] + o[1]) / 2 + 5.8)), xf.r(8.0), xf.r(2.6)), mat="creme")
    t.decal(G.elipse(xf((o[0] + 3.4, o[1] + 1.5)), xf.r(2.8), xf.r(4.2)), mat="creme")
    vx, vy = o[0] - q[0], o[1] - q[1]
    L = math.hypot(vx, vy) or 1
    ux, uy = vx / L, vy / L
    nx_, ny_ = uy, -ux
    for f in (0.12, 0.38, 0.62):
        c = (q[0] + vx * f, q[1] + vy * f)
        a = (c[0] + nx_ * 6.2, c[1] + ny_ * 6.2)
        b = (c[0] + nx_ * 2.2 - ux * 0.8, c[1] + ny_ * 2.2 - uy * 0.8)
        t.decal(G.capsula(xf(a), xf(b), xf.r(0.62), xf.r(0.45)))
    G.perna(t, xf((q[0] + 0.5, q[1] + 2.0)), pe(0), xf.r(2.4), luz=0.02, joelho=jo(0))
    G.perna(t, xf((o[0] + 0.6, o[1] + 2.5)), pe(2), xf.r(2.3), luz=0.02, joelho=jo(2))
    G.cabeca(t, xf.filho(p.cab, p.cab_ang), p.olhos, p.olhar, p.boca, p.orelhas, p.vira, est=est,
             piscar_um=p.piscar_um)


def enrolado(t, x0, p, ang=0.0, pata=None):
    """Cópia de G.corpo_enrolado que pode rolar (ang, graus, em torno do meio do corpo) e esticar uma patinha da
    frente (pata = ponto local do pé). Mesma sombra do repouso deitado."""
    s = 1.0
    est = G.ESTILO
    t.chao = CHAO
    cx, cy = -2.0, -7.8
    base = G.Xf(x0, CHAO - 0.5 + p.dy, s)
    piv = base((cx, cy))
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def gira(q):
        x, y = base(q)
        dx, dy = x - piv[0], y - piv[1]
        return (piv[0] + dx * ca - dy * sa, piv[1] + dx * sa + dy * ca)
    t.sombra(x0, 16 * s)
    g = t.grupo(True)
    r = p.respira * 0.7
    t.pinta(G.elipse(gira((-2.0, -7.8 - r * 0.5)), 13.6 + r * 0.2, 7.8 + r, ang), "pelo", g)
    t.decal(G.elipse(gira((-2.0, -0.6)), 11.0, 1.2, ang), mat="creme")
    for k in range(4):
        a, b = gira((-12.6 + k * 3.8, -14.4 - r)), gira((-13.2 + k * 3.8, -10.0))
        t.decal(G.capsula(a, b, 0.65, 0.42))
    gc = t.grupo(True)
    t.pinta(G.elipse(gira((-8.6, -5.6)), 5.8, 4.8, ang), "pelo", gc, luz=0.02)
    t.decal(G.capsula(gira((-12.0, -6.4)), gira((-9.8, -3.6)), 0.6))
    if pata is not None:   # patinha esticada para a frente, saindo de baixo do queixo
        G.perna(t, gira((6.0, -4.0)), gira(pata), 2.0, luz=0.04, pata_rx=2.4, pata_ry=1.5)
    hx_, hy_ = gira(p.cab)
    xh = G.Xf(hx_, hy_, s, p.cab_ang + ang)
    gp = t.grupo(True)
    t.pinta(G.elipse(gira((p.cab[0] - 1.0, -1.4)), 3.0, 1.6, ang, achata=0.7), "creme", gp, luz=0.04)
    G.cabeca(t, xh, p.olhos, p.olhar, p.boca, p.orelhas, p.vira, est=est, piscar_um=p.piscar_um)
    G.cauda(t, [gira(c) for c in p.cauda], 2.3, 1.9, s=s)


# ═══════════════════════════════ enfeites ═══════════════════════════════
def brilho(t, x, y, cor="#fff3b0", grande=False):
    if grande:
        t.molde(["..c..", "..c..", "ccwcc", "..c..", "..c.."], x, y, cores={"c": cor, "w": "#ffffff"}, contorno="#6e3f0c")
    else:
        t.molde([".c.", "cwc", ".c."], x, y, cores={"c": cor, "w": "#ffffff"}, contorno="#6e3f0c")


def faisca(t, x, y, cor="#ffe9a0", contorno=None):
    """Brilho mínimo (um + de 3 px); com contorno ele lê também no fundo claro."""
    t.molde([".c.", "cwc", ".c."], x, y, cores={"c": cor, "w": "#ffffff"}, contorno=contorno)


def poeira(t, x, y, k=0):
    """Nuvenzinha de poeira/fumaça (para pousos e sumiços)."""
    m = [[".oo.", "oooo", ".oo."], [".o..o.", "oo.ooo", ".o..o."], ["o....o", ".o..o.", "......"]][min(k, 2)]
    t.molde(m, x, y, cores={"o": "#efe2c8"}, contorno="#8a6a50")


def puf(t, x, y, k):
    """Sumiço mágico: anel de brilhos que abre (k = 0, 1, 2)."""
    r = [2.5, 5.0, 7.5][k]
    n = 6
    for i in range(n):
        a = i / n * math.tau + k * 0.4
        if k == 2 and i % 2:
            continue
        faisca(t, x + math.cos(a) * r, y + math.sin(a) * r * 0.8, "#ffe27a" if i % 2 else "#bcd8ff",
               contorno="#a86f16" if i % 2 else "#4a5aa8")
    if k == 0:
        brilho(t, x, y, grande=True)


# ═══════════════════════════════ pergaminho ═══════════════════════════════
PROF = (6.0, -4.6)     # direção da profundidade (o chão visto de cima, em 3/4): para cima e para a direita


def pergaminho(t, x_esq, x_rolo, r=3.4, fita=True, sobe=0.0):
    """Pergaminho no chão visto em 3/4: folha aberta entre a vareta da esquerda (x_esq) e o rolo (x_rolo).
    r = raio do rolo; fita = laço vermelho (fechado); sobe = rolo erguido (salto da mola)."""
    y0 = CHAO - 0.5 - r * 0.55
    px, py = PROF
    # folha aberta (plano no chão)
    if x_rolo - x_esq > 1.5:
        g = t.grupo(True)
        y = CHAO - 1.0
        pts = [(x_esq, y), (x_rolo, y - sobe * 0.4), (x_rolo + px, y + py - sobe * 0.4), (x_esq + px, y + py)]
        t.pinta(G.poligono(pts, 1.2), "b_perg", g, luz=0.18)
        # linhas de "texto" e um selo
        for i in range(3):
            fy = 0.25 + i * 0.25
            a = (x_esq + 2.0 + px * fy, y + py * fy)
            b = (x_rolo - 2.5 + px * fy, y + py * fy - sobe * 0.4)
            if b[0] - a[0] > 1.5:
                t.decal(G.capsula(a, (a[0] + (b[0] - a[0]) * (0.95 - 0.25 * (i == 1)), b[1]), 0.42), desl=-2, so=("b_perg",))
        if x_rolo - x_esq > 14:
            sx = x_esq + (x_rolo - x_esq) * 0.62 + px * 0.5
            t.decal(G.circulo((sx, y + py * 0.5), 1.4), mat="la", so=("b_perg",))
        # vareta de madeira da esquerda
        gv = t.grupo(True)
        t.pinta(G.capsula((x_esq - 0.6, y + 1.6), (x_esq + px * 1.2, y + py * 1.2), 1.2), "b_madeira", gv, luz=0.05)
        for q in ((x_esq - 0.8, y + 2.0), (x_esq + px * 1.25, y + py * 1.25)):
            t.pinta(G.circulo(q, 1.35), "b_madeira", gv, luz=0.15)
    # rolo: cilindro deitado na profundidade; vareta de trás aparece atrás, tampa da frente com a espiral
    a = (x_rolo, y0 - sobe)
    b = (x_rolo + px, y0 + py - sobe)
    n = math.hypot(px, py)
    ux, uy = px / n, py / n
    gb = t.grupo(True)
    t.pinta(G.capsula(b, (b[0] + ux * (r + 1.6), b[1] + uy * (r + 1.6)), 0.9), "b_madeira", gb, luz=0.0)
    t.pinta(G.circulo((b[0] + ux * (r + 1.8), b[1] + uy * (r + 1.8)), 1.3), "b_madeira", gb, luz=0.15)
    g2 = t.grupo(True)
    t.pinta(G.capsula(a, b, r), "b_perg", g2, luz=0.08)
    if fita:
        m = (a[0] + px * 0.5, a[1] + py * 0.5)
        t.decal(G.capsula((m[0] - r - 0.5, m[1] + 0.9), (m[0] + r + 0.5, m[1] - 0.9), 0.75), mat="la", so=("b_perg",))
    # tampa (ponta da frente): elipse um pouco mais escura com a volta do papel
    gt = t.grupo(True, cor=G.hx("#9a764a"))
    t.pinta(G.elipse(a, r * 0.78, r, -28, achata=0.3), "b_perg", gt, luz=-0.12)
    if r > 2.2:
        t.decal(G.elipse((a[0] + 0.3, a[1] + 0.3), r * 0.42, r * 0.55, -28), desl=-1, so=("b_perg",))
    gk = t.grupo(True)
    q = (a[0] - ux * 1.2, a[1] - uy * 1.2)
    t.pinta(G.capsula(a, q, 0.8), "b_madeira", gk, luz=0.1)
    t.pinta(G.circulo((q[0] - ux * 0.4, q[1] - uy * 0.4), 1.35), "b_madeira", gk, luz=0.2)


# ═══════════════════════════════ livros ═══════════════════════════════
def livro_lado(t, x0, y1, larg, alt, capa, ang=0.0, piv=None, luz=0.0):
    """Livro deitado visto de lado: capa colorida (lombada à esquerda) e o corte das páginas à direita.
    (x0, y1) = canto de baixo à esquerda; ang gira em torno de piv (graus, horário)."""
    piv = piv or (x0, y1)
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def R(p):
        dx, dy = p[0] - piv[0], p[1] - piv[1]
        return (piv[0] + dx * ca - dy * sa, piv[1] + dx * sa + dy * ca)
    g = t.grupo(True)
    t.pinta(G.poligono([R(p) for p in ((x0, y1), (x0 + larg, y1), (x0 + larg, y1 - alt), (x0, y1 - alt))], 1.4), capa, g, luz=luz)
    gp = t.grupo(False)
    t.pinta(G.poligono([R(p) for p in ((x0 + 2.0, y1 - 1.0), (x0 + larg + 0.01, y1 - 1.0), (x0 + larg + 0.01, y1 - alt + 1.0),
                                       (x0 + 2.0, y1 - alt + 1.0))], 0.6), "papel", gp, luz=luz + 0.1)
    if alt >= 4.5:
        t.decal(G.capsula(R((x0 + 3.0, y1 - alt / 2)), R((x0 + larg - 0.5, y1 - alt / 2)), 0.3), desl=-1, so=("papel",))
    # faixa dourada na lombada
    t.decal(G.capsula(R((x0 + 0.8, y1 - 0.8)), R((x0 + 0.8, y1 - alt + 0.8)), 0.45), mat="b_ouro", so=(capa,))


PILHA_X = 70.0


def pilha(t, ang=0.0, desliza=0.0, brilha=False):
    """Pilha de três livros à direita do gato; o de cima (verde) passa da borda e balança (ang < 0 = ponta da
    esquerda descendo; desliza = quanto escorregou para a esquerda)."""
    livro_lado(t, PILHA_X, CHAO - 0.5, 21, 6.0, "capa", luz=-0.05)
    livro_lado(t, PILHA_X + 2.0, CHAO - 6.5, 17, 5.0, "b_vinho")
    livro_lado(t, PILHA_X + 0.5, CHAO - 11.5, 18, 4.5, "b_ouro", luz=-0.05)
    x = PILHA_X - 3.5 - desliza
    y = CHAO - 16.0
    livro_lado(t, x, y, 15, 5.0, "b_verde", ang=ang, piv=(PILHA_X + 1.0, y), luz=0.05)


# ═══════════════════════════════ borboleta ═══════════════════════════════
_BORB = {
    "aberta": ["AAA...AAA", "ABBAdABBA", "ABCBdBCBA", ".ABBdBBA.", "..AbdbA..", ".AbbdbbA.", "..AA.AA.."],
    "meia": [".........", ".AA...AA.", ".ABAdABA.", ".ACBdBCA.", "..AbdbA..", "..AbdbA..", "...A.A..."],
    "fechada": ["...AAA...", "...ABA...", "...ACA...", "...ABA...", "...AdA...", "....d....", "........."],
}
_BORB_COR = {"A": "#3d2f8f", "B": "#8fb6ff", "C": "#ffffff", "b": "#c3a3ff", "d": "#ffd25a"}


def borboleta(t, x, y, k, rastro=True):
    # k já vem somado ao deslocamento da linha (fase contínua entre os trechos)
    """Borboleta mágica pequena (azul e violeta, corpo dourado), com um halo leve e um rastro de brilhos."""
    fase = ["aberta", "meia", "fechada", "meia"][k % 4]
    for dx, dy in ((-5, 0), (5, 0), (0, -4), (0, 4), (-4, -3), (4, -3), (-4, 3), (4, 3)):
        t.px(x + dx, y + dy, "#bcd4ff", a=0.3, atras=True)
    t.molde(_BORB[fase], x, y, cores=_BORB_COR)
    if rastro:
        t.px(x - 6, y + 3, "#ffd25a")
        t.px(x - 9, y + 5 - (k % 2), "#8fb6ff")


# ═══════════════════════════════ coruja ═══════════════════════════════
def coruja(t, x, y, k, esc=1.35):
    """Corujinha bibliotecária (original, pequena, de lado voando para a direita): marrom, disco do rosto creme,
    óculos redondos dourados e cachecol verde com a ponta esvoaçando. k = fase da batida de asa (0 em cima,
    2 embaixo)."""
    X = G.Xf(x, y, esc)
    R = X.r
    asa = [(-3.5, -9.0), (-9.0, -3.5), (-4.5, 5.0), (-9.0, -3.5)][k % 4]   # ponta da asa
    # asa de trás, mais escura
    ga = t.grupo(True)
    t.pinta(G.poligono([X((-0.5, -1.8)), X((asa[0] - 1.0, asa[1] + (1.5 if asa[1] < 0 else -1.0))), X((-4.0, 0.0))], R(1.0)),
            "b_coruja", ga, luz=-0.35)
    # ponta do cachecol esvoaçando para trás
    gc = t.grupo(True)
    onda = [0.0, 1.0, 0.0, -1.0][k % 4]
    t.pinta(G.tubo([X((0.5, -0.4)), X((-3.0, -1.0 + onda * 0.5)), X((-6.0, -0.2 - onda))], (R(0.9), R(0.7))), "b_verde", gc, luz=0.05)
    # rabo e corpo, barriga creme com pintinhas
    g = t.grupo(True)
    t.pinta(G.poligono([X((-4.0, 0.8)), X((-8.0, 1.6)), X((-7.2, 3.6)), X((-3.0, 3.2))], R(1.0)), "b_coruja", g, luz=-0.1)
    t.pinta(G.elipse(X((-0.6, 1.0)), R(4.6), R(3.6), -10), "b_coruja", g)
    t.decal(G.elipse(X((1.8, 2.4)), R(2.6), R(2.0)), mat="creme")
    t.decal(G.circulo(X((1.2, 2.6)), 0.6), desl=-1, so=("creme",))
    t.decal(G.circulo(X((2.6, 3.2)), 0.6), desl=-1, so=("creme",))
    # cabeça com disco facial creme e tufos
    gh = t.grupo(True)
    hc = (2.8, -3.8)
    t.pinta(G.circulo(X(hc), R(3.8)), "b_coruja", gh, luz=0.05)
    for lado in (-1, 1):
        t.pinta(G.poligono([X((hc[0] + lado * 1.4 - 0.9, hc[1] - 2.9)), X((hc[0] + lado * 2.6 + 0.2, hc[1] - 5.4)),
                            X((hc[0] + lado * 2.8 + 0.9, hc[1] - 2.4))], R(0.8)), "b_coruja", gh, luz=0.12)
    t.decal(G.elipse(X((hc[0] + 1.1, hc[1] + 0.9)), R(3.0), R(2.6)), mat="creme")
    # cachecol na frente do pescoço
    gn = t.grupo(True)
    t.pinta(G.capsula(X((hc[0] - 2.4, hc[1] + 3.6)), X((hc[0] + 2.2, hc[1] + 3.9)), R(0.85)), "b_verde", gn, luz=0.1)
    # asa da frente, mais clara
    gf = t.grupo(True)
    t.pinta(G.poligono([X((0.0, -1.0)), X(asa), X((-5.5, 0.6)), X((-2.0, 1.6))], R(1.1)), "b_coruja", gf, luz=0.15)
    # óculos (dois aros dourados com a ponte) e bico
    c = X((hc[0] + 1.0, hc[1] + 0.2))
    t.molde(["ggg.ggg", "gPgggPg", "ggg.ggg"], c[0], c[1], cores={"g": "#f2c040", "P": "#24140c"}, contorno="#4a2a10")
    b = X((hc[0] + 1.0, hc[1] + 2.4))
    t.molde(["b"], b[0], b[1], cores={"b": "#e58a2e"})


# ═══════════════════════════════ PERGAMINHO ═══════════════════════════════
ROLO_X = 63.0


def _pose_perg_toca(k):
    """(pose do gato, parâmetros do pergaminho) para pergaminho-toca."""
    if k == 0:
        return {}, dict(x_esq=ROLO_X, x_rolo=ROLO_X)
    olhar = (1, 1)
    gato = [
        None,
        dict(olhar=olhar, cab_ang=4, orelhas=(-6, -6)),
        dict(olhar=olhar, cab_ang=5, orelhas=(-8, -8), pata_perto=(4.0, -8.0), inclina=2),
        dict(olhar=olhar, cab_ang=6, orelhas=(-8, -8), pata_perto=(7.0, -4.2), inclina=4),
        dict(olhar=olhar, cab_ang=5, orelhas=(-8, -8), pata_perto=(4.5, -8.5), inclina=2),
        dict(olhar=olhar, cab_ang=7, orelhas=(-10, -10), pata_perto=(7.5, -4.0), inclina=5, boca="aberta"),
        dict(olhar=olhar, cab_ang=5, orelhas=(-6, -6), pata_perto=(2.0, -1.0), inclina=2),
        dict(olhar=olhar, cab_ang=4, orelhas=(-10, -10), inclina=1),
    ][k]
    rolo = [0, 0, 0, 1.0, 1.0, 2.0, 3.5, 5.5][k]
    perg = dict(x_esq=ROLO_X, x_rolo=ROLO_X + rolo, r=3.4 - 0.9 * min(rolo / 21.6, 1), fita=k < 5)
    return gato, perg


def _pose_perg_abre(k):
    xs = [5.5, 8.0, 11.5, 15.0, 18.0, 20.0, 21.2, 21.6][k]
    r = 3.4 - 0.9 * min(xs / 21.6, 1)
    vira = [0, 0.2, 0.4, 0.5, 0.6, 0.6, 0.6, 0.6][k]
    gato = dict(olhar=(1, 1), cab_ang=4, orelhas=(-10, -10), inclina=1 + 0.5 * (k > 2), vira=vira)
    if k == 0:
        gato = _pose_perg_toca(7)[0]
    return gato, dict(x_esq=ROLO_X, x_rolo=ROLO_X + xs, r=r, fita=False)


def _pose_perg_pula(k):
    alt = [0, 5.5, 7.0, 4.5, 0.0, 1.2, 0.0, 0.0][k]
    sobe = [0, 3.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0][k]
    xr = ROLO_X + [21.6, 22.8, 22.4, 22.0, 22.0, 22.0, 22.0, 22.0][k]
    perg = dict(x_esq=ROLO_X, x_rolo=xr, r=2.5, fita=False, sobe=sobe)
    if k == 0:
        return _pose_perg_abre(7)[0], perg
    gato = [
        None,
        dict(dy=-alt, inclina=-9, orelhas=(28, 28), boca="aberta", olhar=(1, 0), pata_perto=(1.5, -6.0),
             pata_longe=(2.0, -5.0), cauda_u=1.0, cauda_alta=1.4, cab_ang=-6),
        dict(dy=-alt, inclina=-8, orelhas=(30, 30), boca="aberta", olhar=(1, 0), pata_perto=(1.0, -5.0),
             pata_longe=(1.5, -4.0), cauda_u=1.0, cauda_alta=1.5, cab_ang=-6),
        dict(dy=-alt, inclina=-5, orelhas=(24, 24), olhar=(1, 1), pata_perto=(0.5, -2.0), pata_longe=(1.0, -1.5),
             cauda_u=1.0, cauda_alta=1.2, cab_ang=-2),
        dict(inclina=4, orelhas=(20, 20), olhar=(1, 1), cauda_u=1.0, cauda_alta=0.6, cab=(2.8, -23.2), cab_ang=3,
             respira=0.0),
        dict(dy=-alt, inclina=-1, orelhas=(14, 14), olhar=(1, 1), cauda_u=1.0, cauda_alta=0.9, cauda_w=0.6),
        dict(orelhas=(8, 8), olhar=(1, 1), cauda_u=0.9, cauda_alta=0.7, cauda_w=-0.4),
        dict(orelhas=(2, 2), olhar=(1, 1), cauda_u=0.8, cauda_alta=0.6, cauda_w=0.3),
    ][k]
    return gato, perg


def _pose_perg_senta(k):
    if k == 0:
        return _pose_perg_pula(7)
    perg_aberto = dict(x_esq=ROLO_X, x_rolo=ROLO_X + 22.0, r=2.5, fita=False)
    gato = [
        None,
        dict(cab_ang=-7, olhos="feliz", respira=1.0, cauda_u=0.8, cauda_alta=0.9, cauda_w=0.8, orelhas=(-4, -4)),
        dict(cab_ang=-8, olhos="feliz", respira=1.0, cauda_u=0.8, cauda_alta=1.0, cauda_w=-0.6, orelhas=(-4, -4)),
        dict(cab_ang=-3, olhar=(1, 1), respira=0.6, cauda_u=0.6, cauda_alta=0.8, cauda_w=0.5),
        dict(cab_ang=0, olhar=(1, 1), vira=0.4, cauda_u=0.4, cauda_alta=0.6, cauda_w=0.0),
        dict(cab_ang=0, olhar=(1, 0), vira=0.5, cauda_u=0.2),
        dict(olhar=(1, 0), vira=0.3),
        {},
    ][k]
    perg = [None, perg_aberto, perg_aberto, perg_aberto,
            dict(x_esq=ROLO_X + 10, x_rolo=ROLO_X + 22.0, r=2.5, fita=False),
            dict(x_esq=ROLO_X + 23.0, x_rolo=ROLO_X + 23.0, r=3.4, fita=False),
            dict(x_esq=ROLO_X + 31, x_rolo=ROLO_X + 31, r=3.4, fita=False),
            None][k]
    return gato, perg


def _linha_perg(pose):
    def f(t, k):
        gato, perg = pose(k)
        sentado(t, **gato)
        if perg:
            pergaminho(t, **perg)
    return f


# ═══════════════════════════════ LIVRO ═══════════════════════════════
def _pose_livro_ve(k):
    ang = [0, -3, 2, -6, 1, -9, -7, -12][k]
    gato = [
        {},
        dict(orelhas=(0, -14)),
        dict(orelhas=(-6, -6), olhar=(1, 0), vira=0.2),
        dict(orelhas=(-10, -10), olhar=(1, -1), vira=0.4, cab_ang=-4),
        dict(orelhas=(-10, -10), olhar=(1, -1), vira=0.4, cab_ang=-5),
        dict(orelhas=(-12, -12), olhar=(1, -1), vira=0.5, cab_ang=-6, boca="aberta"),
        dict(orelhas=(-12, -12), olhar=(1, -1), vira=0.5, cab_ang=-5, inclina=-3, cab=(2.4, -24.0)),
        dict(orelhas=(-14, -14), olhar=(1, -1), vira=0.5, cab_ang=-6, inclina=-4, cab=(2.2, -23.6), boca="aberta"),
    ][k]
    return gato, dict(ang=ang, desliza=[0, 0, 0, 0.3, 0.3, 0.8, 0.8, 1.5][k])


def _pose_livro_segura(k):
    if k == 0:
        return _pose_livro_ve(7)
    ang = [0, -20, -19, -8, 4, -1, 0, 0][k]
    desl = [0, 2.5, 2.5, 1.2, 0.0, 0.0, 0.0, 0.0][k]
    gato = [
        None,
        dict(orelhas=(-14, -14), olhar=(1, -1), vira=0.5, cab_ang=-8, inclina=9, dy=-1.5, boca="aberta",
             pata_perto=(12.0, -13.0), cauda_u=0.6, cauda_alta=0.4),
        dict(orelhas=(-12, -12), olhos="fechado", vira=0.5, cab_ang=-6, inclina=10, dy=-2.0, boca="aberta",
             pata_perto=(13.0, -13.5), pata_longe=(1.0, 0.0), cauda_u=0.8, cauda_alta=0.8, cauda_w=0.5),
        dict(orelhas=(-12, -12), olhos="fechado", vira=0.5, cab_ang=-6, inclina=11, dy=-2.0, boca="aberta",
             pata_perto=(14.0, -14.0), cauda_u=0.9, cauda_alta=1.0, cauda_w=-0.6),
        dict(orelhas=(-8, -8), olhar=(1, -1), vira=0.4, cab_ang=-4, inclina=8, dy=-1.0,
             pata_perto=(13.5, -14.0), cauda_u=0.9, cauda_alta=0.9, cauda_w=0.6),
        dict(orelhas=(-6, -6), olhar=(1, -1), vira=0.4, cab_ang=-4, inclina=6, dy=-0.5,
             pata_perto=(11.0, -12.0), cauda_u=0.8, cauda_alta=0.7, cauda_w=-0.3),
        dict(orelhas=(-2, -2), olhar=(1, 0), vira=0.3, cab_ang=-2, inclina=3,
             pata_perto=(4.0, -3.5), cauda_u=0.7, cauda_alta=0.6),
        dict(orelhas=(0, 0), olhar=(1, 0), vira=0.3, cab_ang=-1, inclina=1, cauda_u=0.6, cauda_alta=0.5),
    ][k]
    return gato, dict(ang=ang, desliza=desl)


def _pose_livro_descansa(k):
    if k == 0:
        return _pose_livro_segura(7)
    gato = [
        None,
        dict(olhos="fechado", respira=1.0, cab_ang=-4, cauda_u=0.5, cauda_alta=0.4, orelhas=(4, 4)),
        dict(olhos="fechado", respira=0.0, cab_ang=3, dy=0.0, cab=(2.6, -23.6), cauda_u=0.4, cauda_alta=0.3, orelhas=(8, 8)),
        dict(olhos="feliz", cab_ang=2, cauda_u=0.3, cauda_alta=0.3, orelhas=(2, 2)),
        dict(olhos="feliz", cab_ang=2, olhar=(1, 0), cauda_u=0.2, orelhas=(0, 0)),
        dict(olhar=(1, 0), vira=0.3),
        dict(olhar=(1, 0), vira=0.2),
        {},
    ][k]
    livros = dict(ang=0, desliza=0) if k <= 5 else None
    return gato, livros


def _linha_livro(pose):
    def f(t, k):
        gato, livros = pose(k)
        sentado(t, **gato)
        if livros:
            pilha(t, **livros)
        if pose is _pose_livro_descansa:
            if k == 2:
                poeira(t, 61, 30, 0)     # o "ufa": sopro de alívio
            if k == 3:
                poeira(t, 64, 28, 1)
            if k == 5:
                for (x, y) in ((70, 34), (84, 40), (76, 47)):
                    faisca(t, x, y, "#ffe27a", contorno="#a86f16")
            if k == 6:
                puf(t, 76, 45, 1)
    return f


# ═══════════════════════════════ BORBOLETA ═══════════════════════════════
def _borb_ve(k):
    traj = [(88, 12), (82, 9), (77, 13), (73, 10), (69, 15), (72, 19), (75, 17), (72, 23)]
    gato = [
        {},
        dict(olhar=(1, -1), orelhas=(-4, -4)),
        dict(olhar=(1, -1), vira=0.3, cab_ang=-6, orelhas=(-8, -8)),
        dict(olhar=(1, -1), vira=0.4, cab_ang=-8, orelhas=(-10, -10)),
        dict(olhar=(1, -1), vira=0.5, cab_ang=-6, orelhas=(-10, -10)),
        dict(olhar=(1, -1), vira=0.5, cab_ang=-4, orelhas=(-10, -10)),
        dict(olhar=(1, -1), vira=0.5, cab_ang=-5, orelhas=(-12, -12), cauda_u=0.3, cauda_alta=0.5),
        dict(olhar=(1, -1), vira=0.5, cab_ang=-4, orelhas=(-12, -12), cauda_u=0.5, cauda_alta=0.6, cauda_w=0.5),
    ][k]
    return gato, traj[k]


def _borb_pata(k):
    if k == 0:
        return _borb_ve(7)
    traj = [None, (70, 26), (69, 30), (68, 33), (67, 35), (69, 31), (71, 27), (72, 23)]
    gato = [
        None,
        dict(olhar=(1, -1), vira=0.5, cab_ang=-3, orelhas=(-12, -12), cauda_u=0.5, cauda_alta=0.6, cauda_w=-0.5,
             pata_perto=(2.0, -3.0), inclina=1),
        dict(olhar=(1, -1), vira=0.5, cab_ang=-3, orelhas=(-12, -12), cauda_u=0.5, cauda_alta=0.6, cauda_w=0.5,
             pata_perto=(5.0, -7.5), inclina=3),
        dict(olhar=(1, 0), vira=0.5, cab_ang=-2, orelhas=(-12, -12), cauda_u=0.5, cauda_alta=0.7, cauda_w=-0.5,
             pata_perto=(8.0, -11.0), inclina=5),
        dict(olhos="feliz", vira=0.5, cab_ang=-2, orelhas=(-6, -6), cauda_u=0.5, cauda_alta=0.7, cauda_w=0.5,
             pata_perto=(9.0, -12.0), inclina=5, boca="feliz"),
        dict(olhar=(1, -1), vira=0.5, cab_ang=-4, orelhas=(-10, -10), cauda_u=0.5, cauda_alta=0.7, cauda_w=-0.3,
             pata_perto=(7.5, -10.0), inclina=4),
        dict(olhar=(1, -1), vira=0.5, cab_ang=-6, orelhas=(-12, -12), cauda_u=0.5, cauda_alta=0.7, cauda_w=0.3,
             pata_perto=(3.0, -5.0), inclina=2),
        dict(olhar=(1, -1), vira=0.5, cab_ang=-6, orelhas=(-14, -14), cauda_u=0.6, cauda_alta=0.8, cauda_w=-0.3,
             inclina=-2, cab=(2.4, -23.8)),
    ][k]
    return gato, traj[k]


def _borb_salta(k):
    if k == 0:
        return _borb_pata(7)
    traj = [None, (74, 18), (78, 12), (82, 8), (86, 5), (91, 3), (97, 2), None]
    alt = [0, 4.0, 7.0, 5.5, 0.0, 0.8, 0.0, 0.0][k]
    gato = [
        None,
        dict(dy=-alt, olhar=(1, -1), vira=0.5, cab_ang=-8, orelhas=(-14, -14), cauda_u=1.0, cauda_alta=1.2,
             pata_perto=(5.0, -12.0), pata_longe=(4.0, -9.0), inclina=4, boca="aberta"),
        dict(dy=-alt, olhar=(1, -1), vira=0.5, cab_ang=-10, orelhas=(-14, -14), cauda_u=1.0, cauda_alta=1.4,
             pata_perto=(5.5, -13.0), pata_longe=(4.5, -10.0), inclina=5, boca="aberta"),
        dict(dy=-alt, olhar=(1, -1), vira=0.4, cab_ang=-8, orelhas=(-6, -6), cauda_u=1.0, cauda_alta=1.2,
             pata_perto=(3.0, -6.0), pata_longe=(2.5, -4.0), inclina=2),
        dict(olhar=(1, -1), vira=0.3, cab_ang=-4, orelhas=(10, 10), cauda_u=1.0, cauda_alta=0.5, inclina=3,
             cab=(2.8, -23.2), respira=0.0),
        dict(dy=-alt, olhar=(1, -1), vira=0.2, cab_ang=-6, orelhas=(2, 2), cauda_u=0.8, cauda_alta=0.8, cauda_w=0.5),
        dict(olhos="feliz", cab_ang=-2, cauda_u=0.4, cauda_alta=0.6, cauda_w=-0.4),
        {},
    ][k]
    return gato, traj[k]


def _linha_borb(pose, desloc):
    def f(t, k):
        gato, pos = pose(k)
        sentado(t, **gato)
        if pos:
            borboleta(t, pos[0], pos[1], k + desloc)
    return f


# ═══════════════════════════════ COCHILO ═══════════════════════════════
def cochilo_orelha(t, k):
    o = [(0, 0), (0, 0), (0, -16), (0, 4), (0, -12), (0, 0), (-14, 0), (0, 0)][k]
    if k in (0, 7):
        return deitado(t)
    deitado(t, orelhas=o, respira=[0.5, 0.7, 0.8, 0.8, 0.7, 0.6, 0.5, 0.5][k])


def cochilo_olho(t, k):
    if k in (0, 7):
        return deitado(t)
    p = [
        None,
        dict(olhos="meio", piscar_um=-1, orelhas=(0, -6)),
        dict(olhos="aberto", piscar_um=-1, olhar=(-1, 0), cab=(9.0, -8.8), orelhas=(0, -8)),
        dict(olhos="aberto", piscar_um=-1, olhar=(1, 0), cab=(9.0, -8.8), orelhas=(-6, -10)),
        dict(olhos="aberto", piscar_um=-1, olhar=(0, 0), cab=(9.0, -8.6), orelhas=(0, -6)),
        dict(olhos="meio", piscar_um=-1, orelhas=(0, -2)),
        dict(olhos="fechado", boca="w"),
    ][k]
    deitado(t, **p)


def cochilo_ajeita(t, k):
    if k in (0, 7):
        return deitado(t)
    c0 = B.repouso_deitado.__defaults__  # noqa: F841 (só para lembrar: cauda padrão vem do repouso)
    cauda_base = ((-14.5, -5.0), (-10.0, -3.0), (-2.0, -2.6), (4.5, -2.8), (8.5, -4.6))
    cauda_solta = ((-14.5, -5.0), (-10.0, -3.0), (-2.0, -3.0), (5.0, -4.6), (7.0, -9.5))
    u = [0, 0.5, 1.0, 1.0, 0.6, 0.2, 0.0, 0][k]
    p = [
        None,
        dict(dy=-0.5, respira=1.0, cab=(9.6, -9.4), cab_ang=6, orelhas=(6, 6), boca="nada"),
        dict(dy=-1.0, respira=1.0, cab=(10.2, -10.6), cab_ang=0, orelhas=(10, 10), boca="bocejo"),
        dict(dy=-1.0, respira=0.9, cab=(10.0, -10.2), cab_ang=-2, orelhas=(8, 8), boca="aberta"),
        dict(dy=-0.5, respira=0.7, cab=(9.6, -9.2), cab_ang=6, orelhas=(4, 4), boca="w"),
        dict(dy=0.0, respira=0.2, cab=(9.0, -8.0), cab_ang=13, orelhas=(0, 0)),
        dict(dy=0.0, respira=0.4, cab=(9.0, -8.2), cab_ang=12),
    ][k]
    p["cauda"] = _lerp_pts(cauda_base, cauda_solta, u)
    deitado(t, **p)


# ═══════════════════════════════ FESTA ═══════════════════════════════
CONFETE = ["#ff7d8c", "#5fa3d6", "#ffc94a", "#6cb337", "#c4a6ff"]


def confete(t, x, y, cor, k):
    m = [["cc", "cc"], ["ccc"], ["c", "c", "c"], [".c", "cc"]][k % 4]
    t.molde(m, x, y, cores={"c": cor}, contorno="#3b1c10")


def festa_percebe(t, k):
    if k == 0:
        return sentado(t)
    p = [
        None,
        dict(orelhas=(-8, -8), olhos="aberto", cab_ang=-2),
        dict(orelhas=(-14, -14), olhos="aberto", olhar=(0, -1), cab_ang=-4, cauda_u=0.3, cauda_alta=0.6),
        dict(orelhas=(-14, -14), olhos="feliz", boca="feliz", cab_ang=-4, cauda_u=0.6, cauda_alta=0.9),
        dict(orelhas=(-12, -12), olhos="feliz", boca="feliz", cab_ang=2, cauda_u=0.8, cauda_alta=1.1, cauda_w=0.6),
        dict(orelhas=(-12, -12), olhos="feliz", boca="feliz", cab_ang=-3, cauda_u=0.9, cauda_alta=1.2, cauda_w=-0.6),
        dict(orelhas=(-12, -12), olhos="feliz", boca="feliz", cab_ang=1, cauda_u=1.0, cauda_alta=1.3, cauda_w=0.4,
             inclina=-2, cab=(2.6, -24.0), respira=0.0),
        dict(orelhas=(-14, -14), olhos="feliz", boca="feliz", cab_ang=0, cauda_u=1.0, cauda_alta=1.2, cauda_w=0.0,
             inclina=-3, dy=0.0, cab=(2.6, -23.4), respira=0.0, pata_perto=(0.5, 0.0)),
    ][k]
    sentado(t, **p)
    if k >= 3:
        faisca(t, 33 - (k % 2), 14 + (k % 2), "#ffe27a", contorno="#a86f16")
        faisca(t, 64 + (k % 2), 12, "#ffe27a", contorno="#a86f16")


def festa_pula(t, k):
    if k == 0:
        festa_percebe(t, 7)
        return
    alt = [0, 3.5, 7.5, 9.0, 6.0, 0.0, 1.2, 0.0][k]
    p = dict(dy=-alt, olhos="feliz", boca="aberta", orelhas=(-6, -6), cab_ang=3 * math.sin(k * 1.4),
             cauda_u=1.0, cauda_alta=1.4 if alt > 3 else 1.0, cauda_w=math.sin(k * 1.3))
    if 1 <= k <= 4:
        p.update(pata_perto=(3.0, -8.0), pata_longe=(3.5, -9.0))
    if k == 5:
        p.update(inclina=4, cab=(2.8, -23.0), respira=0.0, boca="feliz", orelhas=(6, 6))
    if k >= 6:
        p.update(boca="feliz", orelhas=(-4, -4))
    sentado(t, **p)
    # confetes: saem do alto no quadro 2 e caem
    rnd = [(14, 0.0), (24, 0.8), (30, 0.3), (66, 0.5), (74, 0.1), (82, 0.7), (20, 0.6), (78, 0.35)]
    if k >= 2:
        for i, (x, ph) in enumerate(rnd):
            y = 4 + (k - 2) * 6.5 + ph * 8 + 2 * math.sin(i)
            if y < 50:
                confete(t, x + 2 * math.sin(k + i), y, CONFETE[i % 5], k + i)
    if k in (2, 3, 4):
        brilho(t, 26 - k, 10 + (k % 2), grande=(k == 3))
        brilho(t, 70 + k, 8 + (k % 2) * 2, grande=(k == 3))
    if k == 5:
        poeira(t, 36, 50, 0)
        poeira(t, 60, 50, 0)


def festa_cauda(t, k):
    if k == 0:
        festa_pula(t, 7)
        return
    if k == 7:
        return sentado(t)
    w = [0, 0.8, -0.8, 0.8, -0.6, 0.3, 0][k]
    p = dict(olhos="feliz", boca="feliz" if k < 5 else "w", orelhas=(-4, -4) if k < 5 else (0, 0),
             cab_ang=[0, 3, 0, 3, 1, 0, 0][k], cauda_u=[0, 1.0, 1.0, 0.9, 0.7, 0.4, 0.15][k],
             cauda_alta=[0, 1.2, 1.2, 1.0, 0.8, 0.5, 0.3][k], cauda_w=w, respira=0.8 if k < 4 else 0.0)
    if k == 6:
        p.update(olhos="aberto")
    sentado(t, **p)
    # confetes que sobraram caindo devagar
    if k <= 3:
        for i, (x, y0) in enumerate(((22, 40), (70, 43), (78, 36), (30, 45))):
            y = y0 + k * 3
            if y < 51:
                confete(t, x, y, CONFETE[(i + 2) % 5], k + i)


# ═══════════════════════════════ ANDAR ═══════════════════════════════
def _pose_andar(k, amp=1.0):
    f = k / 8
    dy = -0.8 + 0.8 * abs(math.cos(f * math.tau))
    dy = round(dy * amp)

    def pe(base_x, fase):
        a = (f + fase) * math.tau
        return (base_x + 3.2 * amp * math.cos(a), -max(0.0, math.sin(a)) * 2.2 * amp)
    pes = (pe(-6.5, 0.0), pe(-8.5, 0.5), pe(7.0, 0.5), pe(5.0, 0.0))
    s1, s2, s3 = (math.sin((f + d) * math.tau) for d in (0.0, 0.2, 0.35))
    return G.Pose(dy=dy, pes=pes, cab=(10.5, -22.5), cab_ang=0.8 * math.sin((f + 0.25) * math.tau),
                  cauda=((-12.0, -14.0), (-17.0, -17.0 + 0.6 * s1), (-18.5 + 1.0 * s2, -24.0), (-15.5 + 1.6 * s3, -28.0)))


def andar_direita(t, k):
    em_pe(t, B.X_PE, _pose_andar(k))


def andar_esquerda(t, k):
    em_pe(t, 94 - B.X_PE, _pose_andar(k), espelho=True)


def andar_para(t, k):
    if k == 7:
        return sentado(t)
    if k <= 2:
        amp = [1.0, 0.75, 0.45][k]
        return em_pe(t, B.X_PE, _pose_andar(k, amp))
    if k == 3:
        p = G.Pose(pes=((-6.5, 0.0), (-8.0, 0.0), (6.4, 0.0), (5.0, 0.0)), cab=(10.2, -22.8), cab_ang=-1,
                   cauda=((-12.0, -14.0), (-16.5, -16.0), (-18.5, -22.0), (-16.0, -26.5)))
        return em_pe(t, B.X_PE, p)
    if k == 4:
        # baixa o quadril: começa a sentar
        p = G.Pose(quadril=(-6.0, -8.5), ombro=(5.5, -13.5), pes=((-5.0, 0.0), (-7.0, 0.0), (6.0, 0.0), (4.6, 0.0)),
                   joelhos=((-2.5, -4.0), (-4.5, -4.0), None, None), cab=(8.6, -23.8), cab_ang=-2,
                   cauda=((-10.0, -8.0), (-15.0, -7.0), (-17.5, -11.0), (-16.5, -16.0)))
        return em_pe(t, B.X_PE + 0.5, p)
    if k == 5:
        return sentado(t, inclina=7, cab=(3.2, -24.0), cauda_u=0.9, cauda_alta=0.3, orelhas=(-2, -2))
    return sentado(t, inclina=2, cauda_u=0.45, cauda_alta=0.2)


# ═══════════════════════════════ SEGREDOS ═══════════════════════════════
def _risco(t, pts, cor="#e8a860"):
    for x, y in pts:
        t.px(x, y, cor)


def segredo_cauda(t, k):
    """Persegue a própria cauda: olha para trás, gira (vira de um lado para o outro com riscos de movimento),
    fica tonto e volta a sentar."""
    if k in (0, 7):
        return sentado(t)
    if k == 1:
        return sentado(t, vira=-1.0, olhar=(-1, 0), cab_ang=-3, orelhas=(-10, -10), cauda_u=1.0, cauda_alta=1.0,
                        cauda_w=1.0, inclina=-2)
    if 2 <= k <= 5:
        esp = k % 2 == 0
        cauda = ((-12.0, -12.0), (-16.0, -9.0), (-18.0, -12.0 - 3 * (k % 2)), (-16.0, -16.0))
        p = G.Pose(quadril=(-6.0, -11.0), ombro=(6.0, -12.5), pes=((-5.0, 0.0), (-8.0, -1.0), (6.5, -1.5), (4.0, 0.0)),
                   cab=(9.5, -21.5), cab_ang=6, olhos="aberto", olhar=(1, 0), boca="aberta" if k in (2, 4) else "w",
                   orelhas=(-12, -12), dy=-[0, 0, 1.0, 0.5, 1.0, 0.0][k], cauda=cauda)
        em_pe(t, 47.0 if not esp else 47.0, p, espelho=esp)
        # riscos de giro (arco claro em cima e embaixo)
        lado = -1 if esp else 1
        _risco(t, [(47 + lado * i, 23 - abs(i) // 4) for i in range(-12, 13, 2)])
        _risco(t, [(47 - lado * i, 53) for i in range(-14, 15, 3)], "#c8a27a")
        return
    # 6: tonto (cabeça balançando, olhos fechados, estrelinhas rodando)
    sentado(t, olhos="fechado", boca="w", cab_ang=8, cab=(3.4, -24.0), inclina=-3, orelhas=(14, -6),
            cauda_u=0.4, cauda_alta=0.2)
    for i, a in enumerate((0.3, 2.4, 4.5)):
        brilho(t, 50 + 9 * math.cos(a), 11 + 2.5 * math.sin(a), cor=["#fff3b0", "#cfe4ff", "#ffd0d6"][i])


def segredo_coruja(t, k):
    orelha = {3: (0, -16), 4: (0, 6), 5: (-12, 0)}.get(k)
    if orelha:
        deitado(t, orelhas=orelha)
    else:
        deitado(t)
    x = -12 + k * 17.0
    y = 20 + 2.0 * math.sin(k * 1.4)
    coruja(t, x, y, k)


def _livrinho(t, x, abre, brilha):
    """Livrinho dourado misterioso no chão: fechado (abre = 0) ou aberto em V (abre = 1)."""
    y = CHAO - 0.5
    g = t.grupo(True)
    if abre <= 0:
        t.pinta(G.poligono([(x - 6, y), (x + 6, y), (x + 6, y - 4.2), (x - 6, y - 4.2)], 1.2), "b_ouro", g, luz=0.05)
        t.decal(G.capsula((x - 4.5, y - 2.0), (x + 5.9, y - 2.0), 0.5), mat="papel", so=("b_ouro",))
        t.decal(G.circulo((x - 0.5, y - 3.6), 1.0), mat="b_vinho", so=("b_ouro",))
    else:
        h = 2.0 + 6.0 * abre
        for lado in (-1, 1):
            gp = t.grupo(True)
            t.pinta(G.poligono([(x, y), (x + lado * 7.5, y - h * 0.5), (x + lado * 7.5, y - h * 0.5 - 1.6),
                                (x, y - 1.6)], 0.8), "b_ouro", gp, luz=0.0)
            t.pinta(G.poligono([(x, y - 1.4), (x + lado * 6.6, y - h * 0.5 - 1.2), (x + lado * 6.4, y - h - 1.2),
                                (x, y - h * 0.4 - 1.8)], 1.0), "papel", gp, luz=0.2 if lado < 0 else 0.05)
    if brilha:
        for dx, dy in ((-6, -2), (6, -3), (0, -6), (-3, -5), (3, -5)):
            t.px(x + dx, y + dy, "#ffe9a0", a=0.35, atras=True)


def segredo_livro(t, k):
    LX = 71
    if k == 0:
        sentado(t)
        faisca(t, LX, 47, "#ffe27a", contorno="#a86f16")
        return
    if k == 7:
        return sentado(t)
    gato = [
        None,
        dict(orelhas=(-10, -10), olhar=(1, 1), cab_ang=3),
        dict(orelhas=(-14, -14), olhar=(1, 1), cab_ang=4, vira=0.3, boca="aberta"),
        dict(orelhas=(-14, -14), olhar=(1, 0), cab_ang=6, vira=0.4, inclina=7, cab=(3.6, -24.0), rim=True),
        dict(orelhas=(-12, -12), olhos="feliz", cab_ang=7, vira=0.4, inclina=8, cab=(3.8, -24.0), rim=True, boca="feliz"),
        dict(orelhas=(-8, -8), olhar=(1, 1), cab_ang=5, vira=0.3, inclina=5, boca="w"),
        dict(orelhas=(4, -10), olhar=(1, 1), cab_ang=-8, vira=0.2, inclina=1),
    ][k]
    sentado(t, **gato)
    if k == 1:
        _livrinho(t, LX, 0, True)
    elif k == 2:
        _livrinho(t, LX, 0.5, True)
        faisca(t, LX, 42, "#ffe27a", contorno="#a86f16")
    elif k == 3:
        _livrinho(t, LX, 1.0, True)
        # a luzinha sai do livro: bolinha clara com halo
        t.molde([".ww.", "wWWw", "wWWw", ".ww."], LX, 38, cores={"w": "#fff1a6", "W": "#ffffff"}, contorno="#a86f16")
        for a in range(6):
            faisca(t, LX + 6 * math.cos(a), 38 + 5 * math.sin(a), "#ffe27a", contorno="#a86f16" if a % 2 else None)
    elif k == 4:
        _livrinho(t, LX, 1.0, True)
        t.molde([".w.", "wWw", ".w."], LX + 2, 30, cores={"w": "#fff1a6", "W": "#ffffff"}, contorno="#a86f16")
        for a in (0.5, 2.0, 3.6, 5.0):
            faisca(t, LX + 2 + 8 * math.cos(a), 31 + 6 * math.sin(a), "#ffe27a", contorno="#a86f16")
    elif k == 5:
        _livrinho(t, LX, 0.4, False)
        faisca(t, LX + 4, 22, "#ffe27a", contorno="#a86f16")
    elif k == 6:
        puf(t, LX, 47, 1)


def segredo_desliza(t, k):
    """O gato dormindo rola devagar para a frente, estica uma patinha e volta a se enroscar."""
    if k in (0, 7):
        return deitado(t)
    ang = [0, -5, -11, -17, -18, -10, -3, 0][k]
    dx = [0, -0.5, -1.5, -2.5, -3.0, -1.5, -0.5, 0][k]
    pata = {3: (20.0, -4.5), 4: (23.0, -7.0), 5: (17.0, -3.0)}.get(k)
    p = G.Pose(cab=(9.0, -8.2), cab_ang=12, olhos="fechado", boca="w" if k in (3, 4) else "nada",
               respira=[0.5, 0.6, 0.7, 0.9, 1.0, 0.5, 0.2, 0.5][k],
               cauda=((-14.5, -5.0), (-10.0, -3.0), (-2.0, -2.6), (4.5, -2.8), (8.5 + (k in (3, 4)) * 2, -4.6 - (k == 4) * 2)),
               orelhas=(0, 0) if k != 4 else (6, -10))
    enrolado(t, B.X_DEITA + dx, p, ang=ang, pata=pata)


LINHAS = {
    'pergaminho-toca': _linha_perg(_pose_perg_toca),
    'pergaminho-abre': _linha_perg(_pose_perg_abre),
    'pergaminho-pula': _linha_perg(_pose_perg_pula),
    'pergaminho-senta': _linha_perg(_pose_perg_senta),
    'livro-ve': _linha_livro(_pose_livro_ve),
    'livro-segura': _linha_livro(_pose_livro_segura),
    'livro-descansa': _linha_livro(_pose_livro_descansa),
    'borboleta-ve': _linha_borb(_borb_ve, 0),
    'borboleta-pata': _linha_borb(_borb_pata, 7),
    'borboleta-salta': _linha_borb(_borb_salta, 14),
    'cochilo-orelha': cochilo_orelha,
    'cochilo-olho': cochilo_olho,
    'cochilo-ajeita': cochilo_ajeita,
    'festa-percebe': festa_percebe,
    'festa-pula': festa_pula,
    'festa-cauda': festa_cauda,
    'andar-direita': andar_direita,
    'andar-esquerda': andar_esquerda,
    'andar-para': andar_para,
    'segredo-cauda': segredo_cauda,
    'segredo-coruja': segredo_coruja,
    'segredo-livro': segredo_livro,
    'segredo-desliza': segredo_desliza,
}
