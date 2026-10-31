"""Cenas da espera, parte A (O Gato Aventureiro, 31/10/2026): descanso, soneca, espreguiçar, novelo, estudo, banho e
a luzinha. Cada linha é uma função f(t, k) (k = 0..7) que pinta um quadro de 96 x 56 com o gato fofo de
scripts/gerar_gato_fofo.py (G) e as poses de descanso de base.py (B).

Regras de emenda (conferidas com diferença de pixels): linha que começa sentada tem o quadro 0 igual a
B.repouso_sentado; linha que termina sentada tem o quadro 7 igual a ele; o mesmo vale para deitado com
B.repouso_deitado. Linhas em laço (idle-*, dormir-respira, estudo-deita, banho-rosto) voltam do quadro 7 para o 0 sem
salto. Dentro de uma cena, o quadro 0 de uma linha repete o quadro 7 da anterior.

Os objetos (novelo, livro, luzinha, "z", "?") seguem o estilo do gato: contorno marrom-escuro de 1 px, rampas de 3 a 6
tons e luz de cima à esquerda; todos leem no fundo escuro (#2a1d14) e no claro (#fbfaf6).
SEM_OBJETOS = True desenha só o gato (para a conferência de emendas).
"""
from __future__ import annotations

import math

import numpy as np

from . import base as B

G = B.G
TAU = math.tau
XS, XP, XD = B.X_SENTA, B.X_PE, B.X_DEITA
SEM_OBJETOS = False


# ═══════════════════════════════ utilidades ═══════════════════════════════
def _sn(k, d=0.0):
    return math.sin((k / 8 + d) * TAU)


def _cs(k, d=0.0):
    return math.cos((k / 8 + d) * TAU)


def _mix(a, b, u):
    """Interpola números ou tuplas (aninhadas)."""
    if isinstance(a, (tuple, list)):
        return tuple(_mix(x, y, u) for x, y in zip(a, b))
    return a + (b - a) * u


def _suave(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


CAUDA_FRENTE = G.cauda_enrolada_frente(0, 0.0)
CAUDA_DEITADO = ((-14.5, -5.0), (-10.0, -3.0), (-2.0, -2.6), (4.5, -2.8), (8.5, -4.6))
CAUDA_PE = ((-12.0, -14.0), (-17.0, -17.0), (-18.5, -24.0), (-15.5, -28.0))
CAUDA_LOAF = ((-14.0, -3.2), (-18.0, -1.8), (-21.5, -2.0), (-23.4, -3.6))


def cauda_frente(dx=0.0, dy=0.0, meio=0.0):
    """Cauda enrolada na frente das patas com a ponta deslocada (abano da ponta)."""
    c = list(CAUDA_FRENTE)
    c[-1] = (c[-1][0] + dx, c[-1][1] + dy)
    c[-2] = (c[-2][0] + meio * 0.4, c[-2][1] + dy * 0.25)
    return tuple(c)


def cauda_atras(w=0.0, alto=0.0):
    """Cauda atrás do gato sentado (w = abano -1..1, alto = ponta mais erguida)."""
    return ((-8.0, -2.0), (-14.6, -2.8 + 0.2 * w), (-18.4 + 0.6 * w, -8.0 - alto * 0.5),
            (-17.0 + 2.6 * w, -14.6 - alto + 0.6 * abs(w)))


def cauda_deitado(dx=0.0, dy=0.0):
    c = list(CAUDA_DEITADO)
    c[-1] = (c[-1][0] + dx, c[-1][1] + dy)
    return tuple(c)


def sentado(t, x=XS, pata_na_frente=False, **mudar):
    """Gato sentado com a pose de descanso de base.py e as mudanças pedidas (em x = XS e sem mudanças, é o
    B.repouso_sentado pixel a pixel)."""
    p = G.Pose(cauda=CAUDA_FRENTE, cauda_frente=True)
    for a, v in mudar.items():
        setattr(p, a, v)
    G.corpo_sentado(t, x, p)
    if pata_na_frente:
        # a pata erguida passa na frente do rosto: desenha de novo a perna de perto por cima da cabeça
        xf = G.Xf(x, B.CHAO - 0.5 + p.dy)
        xc = xf.filho((0, 0), p.inclina)
        G.perna(t, xc((2.4, -10.0)), xf((4.2 + p.pata_perto[0], -1.4 + p.pata_perto[1])), 2.25, luz=0.06,
                pata_rx=2.5, pata_ry=1.5)
    return p


def de_pe(t, x=XP, larg=15.0, **mudar):
    p = G.Pose(cab=(10.5, -22.5), cauda=CAUDA_PE)
    for a, v in mudar.items():
        setattr(p, a, v)
    B.sombra(t, x + 0.5, larg * (1 - min(abs(p.dy), 10) / 22))
    G.corpo_em_pe(t, x, p, sombra=False)
    return p


def deitado_pao(t, x=XD, **mudar):
    """Deitado em 'pão' (corpo baixo, cabeça erguida)."""
    p = G.Pose(cab=(10.4, -16.6), cauda=CAUDA_LOAF)
    for a, v in mudar.items():
        setattr(p, a, v)
    B.sombra(t, x, 17)
    G.corpo_deitado(t, x, p, sombra=False)
    return p


def enrolado(t, x=XD, **mudar):
    """Enroladinho como B.repouso_deitado, com mudanças (na pose padrão é o repouso pixel a pixel)."""
    if x == XD:
        return B.repouso_deitado(t, **mudar)
    p = G.Pose(cab=(9.0, -8.2), cab_ang=12, olhos="fechado", boca="nada", respira=0.5, cauda=CAUDA_DEITADO)
    for a, v in mudar.items():
        setattr(p, a, v)
    G.corpo_enrolado(t, x, p)
    return p


def espelhado(t, desenha):
    """Desenha virado para a esquerda: pinta num quadro à parte, espelha o resultado e cola em t.
    Um gato desenhado em x aparece em 96 - x."""
    t2 = B.tela()
    desenha(t2)
    arr = t2.render()[:, ::-1]
    ys, xs = np.nonzero(arr[..., 3])
    for y, x in zip(ys, xs):
        t.sobre.append((int(x), int(y), arr[y, x, :3].astype(float), arr[y, x, 3] / 255.0))


def _objetos():
    return not SEM_OBJETOS


# ═══════════════════════════════ objetos ═══════════════════════════════
def novelo(t, x, giro=0.0, achata=0.0, fio=True):
    """Novelo de lã (o de G, com squash opcional): x = centro; pousado no chão."""
    if not _objetos():
        return
    r = 3.6
    rx, ry = r * (1 + 0.22 * achata), r * (1 - 0.25 * achata)
    c = (x, B.CHAO - 0.5 - ry - 0.2)
    g = t.grupo(True)
    t.pinta(G.elipse(c, rx, ry), "la", g, luz=0.12)
    for i in range(3):
        a = giro + i * 1.05
        dx, dy = math.cos(a), math.sin(a)
        p0 = (c[0] - dy * rx * 0.9 + dx * rx * 0.2, c[1] + dx * ry * 0.9 + dy * ry * 0.2)
        p1 = (c[0] + dy * rx * 0.9 + dx * rx * 0.2, c[1] - dx * ry * 0.9 + dy * ry * 0.2)
        t.decal(G.capsula(p0, p1, 0.45), desl=-1, so=("la",))
    if fio:
        # fio solto que arrasta atrás do novelo (do lado de onde ele veio: a direita)
        for i, dy in enumerate((0, 0, 0, -1, -1, 0)):
            t.px(x + rx + 0.5 + i, B.CHAO - 1 + dy, "#d24a55")


LIVRO_X = 71.0


def livro(t, folha=0.0, x=LIVRO_X):
    if not _objetos():
        return
    G.livro_aberto(t, (x, B.CHAO - 0.5), folha, s=1.5)


def luzinha(t, x, y, forca=1.0, chao=False, k=0):
    """A luzinha quente (reflexo/vagalume): miolo claro, anel dourado e halo laranja suave; no chão fica achatada.
    Fica atrás do gato (o gato passa na frente quando a alcança)."""
    if not _objetos() or forca <= 0:
        return
    sy = 0.55 if chao else 1.0
    pontos = []
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            d = math.hypot(dx, dy / sy)
            pontos.append((d, dx, dy))
    # halo (de fora para dentro: o de dentro pinta por cima)
    for d, dx, dy in sorted(pontos, reverse=True):
        if d <= 0.5:
            cor, a = "#fffdf2", 1.0
        elif d <= 1.5:
            cor, a = "#ffe27a", 0.95
        elif d <= 2.3:
            cor, a = "#ffb447", 0.7
        elif d <= 3.2:
            cor, a = "#f08a2c", 0.32
        else:
            continue
        t.px(x + dx, y + dy, cor, a * min(1.0, forca), atras=True)
    if forca >= 0.9 and k % 2 == 0:
        # cintilar: quatro pontinhas em cruz
        for dx, dy in ((0, -4), (0, 4), (-4, 0), (4, 0)) if not chao else ((-5, 0), (5, 0)):
            t.px(x + dx, y + dy * sy, "#ffe27a", 0.8, atras=True)


def interrogacao(t, x, y):
    if not _objetos():
        return
    t.molde([".qqq.", "q...q", "...q.", "..q..", ".....", "..q.."], x, y,
            cores={"q": "#fff3d6"}, contorno="#3b1c10")


def estrela(t, x, y, grande=True):
    """Brilhinho de orgulho: cruz dourada com miolo claro (lê no escuro e no claro)."""
    if not _objetos():
        return
    m = ["..c..", "..c..", "ccwcc", "..c..", "..c.."] if grande else [".c.", "cwc", ".c."]
    t.molde(m, x, y, cores={"c": "#f5a623", "w": "#fff6c8"})


def zzz(t, x, y, tam):
    if not _objetos():
        return
    G.zz(t, x, y, tam=tam)


# ═══════════════════════════════ descanso ═══════════════════════════════
def idle_sentado(t, k):
    """Respira devagar, pisca no quadro 5 e abana a ponta da cauda."""
    resp = 0.5 - 0.5 * _cs(k)
    abano = [0, 0, 0.6, 1.4, 1.8, 1.0, 0.3, 0][k]
    sentado(t, respira=0.8 * resp, olhos="fechado" if k == 5 else "aberto",
            orelhas=(0.0, 12.0) if k == 2 else (0.0, 0.0),
            cauda=cauda_frente(0.5 * abano, -1.1 * abano, abano))


def idle_deitado(t, k):
    """Enroladinho respirando; a orelha dá uma tremidinha e a ponta da cauda mexe."""
    ponta = [0, 0, 0, 0, 0.5, 1.0, 0.5, 0][k]
    enrolado(t, respira=0.5 + 0.5 * _sn(k), orelhas=(0.0, -14.0) if k == 3 else (0.0, 0.0),
             cauda=cauda_deitado(0.4 * ponta, -1.2 * ponta))


# ═══════════════════════════════ dormir ═══════════════════════════════
def _andar(t, x, f, amp=1.0, **mudar):
    """Passo diagonal (f = fase 0..1; amp 0 = parado)."""
    dy = round((-0.8 + 0.8 * abs(math.cos(f * TAU))) * amp)

    def pe(base_x, fase, x_par):
        a = (f + fase) * TAU
        return (_mix(x_par, base_x + 3.2 * math.cos(a), amp), -max(0.0, math.sin(a)) * 2.2 * amp)
    pes = (pe(-6.5, 0.0, -6.0), pe(-8.5, 0.5, -9.0), pe(7.0, 0.5, 7.5), pe(5.0, 0.0, 4.5))
    cauda = ((-12.0, -14.0), (-17.0, -17.0 + 0.6 * _sn(f * 8) * amp), (-18.5 + 1.0 * _sn(f * 8, 0.2) * amp, -24.0),
             (-15.5 + 1.6 * _sn(f * 8, 0.35) * amp, -28.0))
    kw = dict(dy=dy, pes=pes, cab_ang=0.8 * math.sin((f + 0.25) * TAU) * amp, cauda=cauda)
    kw.update(mudar)
    de_pe(t, x, **kw)


def dormir_chega(t, k):
    """Entra andando da esquerda e para no centro (termina de pé, parado)."""
    amp = [1, 1, 1, 1, 1, 0.7, 0.3, 0][k]
    xs = [XP]
    for i in range(7, 0, -1):
        xs.insert(0, xs[0] - 1.6 * [1, 1, 1, 1, 1, 0.7, 0.3, 0][i])
    olhos = "fechado" if k == 6 else "aberto"
    _andar(t, xs[k], (k / 8) % 1.0, amp, olhos=olhos, boca="w")


def _parado(t, x=XP, **mudar):
    _andar(t, x, 0.0, 0.0, **mudar)


def dormir_gira(t, k):
    """Dá uma volta no lugar (direita -> esquerda -> direita) e se enrola para dormir."""
    if k == 0:
        _parado(t)
    elif k == 1:
        de_pe(t, XP, quadril=(-5.0, -12.5), ombro=(5.0, -12.8), pes=((-4.5, 0), (-7.0, 0), (6.0, 0), (3.5, 0)),
              cab=(7.0, -23.0), vira=-0.9, olhar=(-1, 0), larg=12,
              cauda=((-9.0, -14.0), (-13.0, -19.0), (-12.0, -25.0), (-8.0, -28.0)))
    elif k in (2, 3):
        def d(t2):
            if k == 2:
                de_pe(t2, 96 - XP, quadril=(-5.0, -12.5), ombro=(5.0, -12.8), pes=((-4.5, 0), (-7.0, 0), (6.0, 0), (3.5, 0)),
                      cab=(7.5, -22.5), vira=0.6, larg=12,
                      cauda=((-9.0, -14.0), (-14.0, -18.0), (-16.0, -24.0), (-13.0, -28.0)))
            else:
                de_pe(t2, 96 - XP, cab=(10.5, -19.5), cab_ang=10, olhar=(0, 1),
                      cauda=((-12.0, -14.0), (-17.5, -16.0), (-19.5, -22.0), (-17.0, -26.5)))
        espelhado(t, d)
    elif k == 4:
        de_pe(t, XP, quadril=(-5.0, -11.5), ombro=(5.0, -12.0), pes=((-4.5, 0), (-7.0, 0), (6.0, 0), (3.5, 0)),
              cab=(7.0, -21.5), vira=0.5, olhos="meio", larg=12,
              cauda=((-9.0, -13.0), (-14.0, -14.0), (-17.0, -19.0), (-15.0, -23.0)))
    elif k == 5:
        de_pe(t, XP, quadril=(-7.5, -9.0), ombro=(6.0, -9.0), pes=((-5.0, 0), (-8.0, 0), (8.0, 0), (5.5, 0)),
              cab=(10.5, -17.5), cab_ang=6, olhos="meio", boca="nada",
              cauda=((-12.0, -9.0), (-17.0, -6.0), (-20.0, -4.0), (-23.0, -4.5)))
    elif k == 6:
        deitado_pao(t, cab=(10.0, -12.5), cab_ang=10, olhos="meio", boca="nada",
                    cauda=((-14.0, -3.2), (-17.0, -1.8), (-17.5, -2.0), (-15.0, -2.0)))
    else:
        enrolado(t)


def dormir_respira(t, k):
    """Sono profundo em laço: a barriga sobe e desce e um 'z' sobe da cabeça."""
    enrolado(t, respira=0.5 + 0.5 * _sn(k))
    zs = {1: (61, 32, 1), 2: (62, 29, 1), 3: (64, 26, 2), 4: (65, 23, 2), 5: (67, 20, 2), 6: (68, 17, 1)}
    if k in zs:
        x, y, tam = zs[k]
        zzz(t, x, y, tam)


# ═══════════════════════════════ espreguiçar ═══════════════════════════════
ACORDA_FIM = dict(cab=(9.6, -12.8), cab_ang=-2.0, olhos="aberto", boca="w", orelhas=(-4.0, -4.0),
                  cauda=CAUDA_DEITADO[:3] + ((4.5, -2.4), (7.5, -2.6)))


def espreguicar_acorda(t, k):
    """Uma orelha treme, os olhos abrem devagar e a cabeça se ergue (ainda enroladinho)."""
    passos = [
        {},
        dict(orelhas=(0.0, -16.0), respira=0.8),
        dict(orelhas=(-12.0, 0.0), respira=0.7),
        dict(cab=(9.1, -9.4), cab_ang=8.0, olhos="meio", respira=0.6),
        dict(cab=(9.3, -10.8), cab_ang=4.0, olhos="meio", boca="w"),
        dict(cab=(9.5, -12.0), cab_ang=0.0, olhos="fechado", boca="w"),
        dict(cab=(9.6, -12.8), cab_ang=-2.0, olhos="aberto", boca="w", olhar=(-1, 0)),
        ACORDA_FIM,
    ]
    kw = dict(passos[k])
    if k >= 3:
        u = min(1.0, (k - 2) / 3)
        kw["cauda"] = CAUDA_DEITADO[:3] + ((4.5, -2.8 + 0.4 * u), (8.5 - 1.0 * u, -4.6 + 2.0 * u))
    enrolado(t, **kw)


def _alonga(t, u, **mudar):
    """Espreguiçada de pé (u = 0 em pé .. 1 patas da frente esticadas e traseiro para cima)."""
    q = (-7.5, -12.5 - 1.5 * u)
    o = (6.0 + 1.0 * u, -12.5 + 6.0 * u)
    pes = ((-6.0, 0.0), (-8.6 - 0.5 * u, 0.0), (7.5 + 9.0 * u, 0.0), (5.0 + 8.5 * u, 0.0))
    kw = dict(quadril=q, ombro=o, pes=pes, cab=(10.5 + 1.5 * u, -22.5 + 9.0 * u), cab_ang=-8 * u,
              orelhas=(14 * u, 14 * u),
              cauda=((-12.0, -14.0 - u), (-17.0, -18.0 - 2 * u), (-17.0 + 2 * u, -25.0 - 2 * u), (-13.0 + 3 * u, -28.5 - 2 * u)))
    kw.update(mudar)
    de_pe(t, XP, **kw)


def espreguicar_estica(t, k):
    """Levanta e se estica todo: patas da frente lá na frente, traseiro para cima, olhos fechados de gosto."""
    if k == 0:
        enrolado(t, **ACORDA_FIM)
    elif k == 1:
        deitado_pao(t, cab=(10.2, -15.6), olhos="aberto", orelhas=(-4.0, -4.0))
    else:
        u = [0, 0, 0.45, 0.9, 1.0, 1.0, 0.5, 0.0][k]
        olhos = ["", "", "meio", "fechado", "fechado", "feliz", "meio", "aberto"][k]
        boca = "aberta" if k == 4 else "w"
        tremo = 0.5 if k == 5 else 0.0
        _alonga(t, u, olhos=olhos, boca=boca, ombro=(6.0 + 1.0 * u + tremo, -12.5 + 6.0 * u))


def espreguicar_boceja(t, k):
    """Senta, boceja grande de olhos fechados e se ajeita na pose de descanso."""
    if k == 0:
        _alonga(t, 0.0, olhos="aberto")
    elif k == 1:
        de_pe(t, XP, quadril=(-7.0, -9.0), ombro=(6.0, -14.0), pes=((-5.5, 0), (-8.5, 0), (7.0, 0), (4.5, 0)),
              cab=(9.0, -24.5), cab_ang=-4, olhos="meio",
              cauda=((-11.0, -10.0), (-16.0, -8.0), (-19.0, -12.0), (-18.0, -17.0)))
    elif k < 7:
        cab_ang = [0, 0, -5, -12, -13, -5, 0][k]
        cab = [None, None, (2.4, -24.8), (2.0, -25.6), (2.0, -25.8), (2.4, -25.0), (2.6, -24.5)][k]
        olhos = [None, None, "meio", "fechado", "fechado", "fechado", "meio"][k]
        boca = [None, None, "aberta", "bocejo", "bocejo", "w", "w"][k]
        orelhas = [None, None, (6, 6), (16, 16), (18, 18), (6, 6), (0, 0)][k]
        resp = [0, 0, 0.5, 1.0, 1.0, 0.4, 0.1][k]
        if k < 6:
            cauda, frente = cauda_atras(0.2 * (k - 3), 1.0 if k in (3, 4) else 0.0), False
        else:
            cauda, frente = cauda_frente(-1.5, 0.6), True
        sentado(t, cab=cab, cab_ang=cab_ang, olhos=olhos, boca=boca, orelhas=orelhas, respira=resp,
                cauda=cauda, cauda_frente=frente)
    else:
        B.repouso_sentado(t)


# ═══════════════════════════════ novelo ═══════════════════════════════
BOLA_PARA = 63.0      # onde o novelo para depois de entrar rolando
PERCEBE_FIM = dict(olhar=(1, 1), vira=0.3, cab_ang=3.0, orelhas=(-8.0, -8.0))


def novelo_percebe(t, k):
    """O novelo entra rolando pela direita; o gato ergue as orelhas e acompanha com os olhos."""
    bx = [None, 99.0, 89.0, 80.0, 72.0, 67.0, 64.0, BOLA_PARA][k]
    if k == 0:
        B.repouso_sentado(t)
    else:
        olhar = [None, (1, 0), (1, 0), (1, 0), (1, 1), (1, 1), (1, 1), (1, 1)][k]
        orelhas = [None, (0, -12), (-6, -10), (-8, -8), (-8, -8), (-8, -8), (-8, -8), (-8, -8)][k]
        vira = [0, 0.1, 0.2, 0.3, 0.3, 0.3, 0.3, 0.3][k]
        ang = [0, 0, 0, 1, 2, 3, 3, 3][k]
        ab = [0, 0, 0, 0, 0.8, 1.6, 0.8, 0][k]
        sentado(t, olhar=olhar, orelhas=orelhas, vira=vira, cab_ang=ang, cauda=cauda_frente(0.5 * ab, -1.0 * ab, ab))
    if bx is not None:
        novelo(t, bx, giro=-bx / 3.6)


def novelo_toca(t, k):
    """Duas patadinhas: o novelo foge um pouco a cada toque; o gato se prepara para o bote."""
    bx = [BOLA_PARA, BOLA_PARA, BOLA_PARA, 65.5, 66.5, 66.5, 68.0, 68.5][k]
    ach = [0, 0, 0.6, 0, 0, 0.5, 0, 0][k]
    if k == 0:
        sentado(t, **PERCEBE_FIM)
    else:
        pata = [None, (2.5, -6.5), (9.0, -4.2), (5.0, -6.0), (4.0, -8.0), (11.5, -3.8), (3.0, -2.0), (0.0, 0.0)][k]
        incl = [0, -2, 5, 2, 0, 7, 5, 6][k]
        boca = "aberta" if k in (2, 5) else "w"
        sentado(t, olhar=(1, 1), vira=0.3, cab_ang=3.0 + incl * 0.3, orelhas=(-8.0, -8.0), pata_perto=pata, inclina=incl,
                boca=boca, cauda=cauda_frente(*[(0, 0), (0.4, -0.8), (0.8, -1.6), (0.4, -0.8), (0, 0), (0.8, -1.6),
                                                  (0.4, -0.8), (0.6, -1.2)][k]))
    novelo(t, bx, giro=-bx / 3.6, achata=ach)


def novelo_salta(t, k):
    """Bote: agacha, pula em arco, cai com as patas no novelo e volta sentadinho para o meio."""
    bx = 68.5 if k < 6 else [67.5, 67.0][k - 6]
    ach = [0, 0, 0, 0, 0.9, 0.4, 0, 0][k]
    if k == 0:
        sentado(t, olhar=(1, 1), vira=0.3, cab_ang=4.8, orelhas=(-8.0, -8.0), inclina=6,
                cauda=cauda_frente(0.6, -1.2))
    elif k == 1:
        de_pe(t, XP, quadril=(-7.5, -10.5), ombro=(6.0, -8.0), pes=((-5.0, 0), (-8.0, 0), (8.0, 0), (5.5, 0)),
              cab=(11.0, -16.0), olhar=(1, 1), orelhas=(-10, -10),
              cauda=((-12.0, -11.0), (-17.0, -12.0), (-20.0, -15.0), (-22.0, -18.0)))
    elif k == 2:
        de_pe(t, 51.0, dy=-4, quadril=(-7.5, -11.0), ombro=(7.0, -15.5), larg=13,
              pes=((-11.0, 0), (-13.0, 0), (12.0, -13.0), (10.0, -11.0)),
              cab=(12.0, -24.0), cab_ang=-6, olhar=(1, 1), boca="aberta", orelhas=(-10, -10),
              cauda=((-12.0, -12.0), (-18.0, -11.0), (-23.0, -10.0), (-27.0, -11.0)))
    elif k == 3:
        de_pe(t, 56.0, dy=-9, quadril=(-7.5, -12.5), ombro=(6.5, -12.0), larg=10,
              pes=((-12.0, -7.0), (-14.0, -6.0), (11.0, -12.0), (9.0, -11.0)),
              cab=(11.5, -20.5), cab_ang=4, olhar=(1, 1), boca="aberta", orelhas=(-10, -10),
              cauda=((-12.0, -14.0), (-18.0, -16.0), (-23.0, -18.0), (-27.0, -21.0)))
    elif k == 4:
        de_pe(t, 57.0, quadril=(-7.5, -10.5), ombro=(6.0, -10.0), pes=((-5.5, 0), (-8.5, 0), (9.5, -6.6), (11.5, -5.8)),
              cab=(11.0, -18.5), cab_ang=6, olhar=(1, 1), olhos="feliz", boca="feliz", orelhas=(-6, -6),
              cauda=((-12.0, -12.0), (-17.0, -16.0), (-18.0, -22.0), (-15.0, -25.0)))
    elif k == 5:
        de_pe(t, 56.5, quadril=(-7.5, -13.0), ombro=(6.0, -11.0), pes=((-6.0, 0), (-9.0, 0), (9.5, -6.2), (11.5, -5.4)),
              cab=(11.0, -20.0), cab_ang=2, olhos="feliz", boca="w",
              cauda=((-12.0, -14.0), (-17.0, -19.0), (-15.0, -25.0), (-11.0, -26.0)))
    elif k == 6:
        sentado(t, 50.0, dy=-2.0, olhos="feliz", cab_ang=-3, cauda=cauda_atras(0.6, 1.0), cauda_frente=False,
                pata_perto=(2.0, -3.0))
    else:
        B.repouso_sentado(t)
    novelo(t, bx, giro=-bx / 3.6 + (0.5 if k >= 6 else 0), achata=ach)


def novelo_senta(t, k):
    """Sentadinho e orgulhoso ao lado do novelo (laço: começa e termina na pose de descanso)."""
    if k in (0, 7):
        B.repouso_sentado(t)
    else:
        u = [0, 0.4, 1, 1, 1, 1, 0.5, 0][k]
        ab = [0, 0, 0.8, 1.6, 0.8, 0, 0, 0][k]
        sentado(t, olhos="feliz" if 2 <= k <= 5 else "aberto", cab_ang=-4 * u, cab=(2.6, -24.5 - 0.6 * u),
                respira=0.8 * u, cauda=cauda_frente(0.5 * ab, -1.1 * ab, ab))
    novelo(t, 67.0, giro=-67.0 / 3.6 + 0.5)
    if _objetos() and k in (3, 4):
        estrela(t, 61 + (k - 3), 30 - 2 * (k - 3), grande=(k == 3))


# ═══════════════════════════════ estudo ═══════════════════════════════
LER = [(-1, 1), (0, 1), (1, 1)]


def _lendo(t, olhar=(0, 1), nod=0.0, **mudar):
    kw = dict(cab_ang=9.0 + nod, cab=(3.2, -24.0), olhar=olhar)
    kw.update(mudar)
    sentado(t, **kw)


def estudo_olha(t, k):
    """Abaixa a cabeça para o livro e lê linha por linha (os olhos vão da esquerda para a direita)."""
    livro(t)
    if k == 0:
        B.repouso_sentado(t)
    elif k == 1:
        sentado(t, cab_ang=4.0, cab=(2.9, -24.3), olhar=(1, 1), orelhas=(-4, -4))
    else:
        olhar = [None, None, (-1, 1), (0, 1), (1, 1), (-1, 1), (0, 1), (1, 1)][k]
        _lendo(t, olhar, nod=1.0 if k >= 5 else 0.0)


def estudo_vira(t, k):
    """Vira a página com a pata, gosta do que leu e se deita ao lado do livro."""
    folha = [0, 0, 0, 0.82, 0.5, 0.18, 0, 0][k]
    livro(t, 1.0 - folha if 0 < folha < 1 else 0.0)
    if k == 0:
        _lendo(t, (1, 1), nod=1.0)
    elif k <= 5:
        pata = [None, (3.0, -7.0), (8.0, -4.4), (9.0, -7.6), (11.0, -10.0), (5.0, -6.0)][k]
        olhar = [None, (0, 1), (0, 1), (0, 1), (1, 1), (1, 1)][k]
        _lendo(t, olhar, pata_perto=pata, inclina=[0, 0, 3, 3, 4, 1][k], boca="w")
    elif k == 6:
        deitado_pao(t, cab=(10.6, -14.0), cab_ang=8, olhos="meio", olhar=(1, 1),
                    cauda=((-14.0, -3.2), (-17.0, -1.8), (-17.5, -2.0), (-15.0, -2.0)))
    else:
        B.repouso_deitado(t)


def estudo_deita(t, k):
    """Cochilando com a cabeça no livro (laço): de vez em quando entreabre o olho para espiar a página."""
    livro(t)
    olhos = ["fechado", "fechado", "meio", "meio", "meio", "fechado", "fechado", "fechado"][k]
    ang = [12, 12, 9, 8, 9, 12, 12, 12][k]
    enrolado(t, respira=0.5 + 0.5 * _sn(k), olhos=olhos, cab_ang=ang,
             orelhas=(0.0, -12.0) if k == 6 else (0.0, 0.0))


# ═══════════════════════════════ banho ═══════════════════════════════
def _rosto(k):
    """Pose da pata limpando o rosto (laço de 8): a pata dá uma volta sobre a bochecha e o olho."""
    a = k / 8 * TAU
    pata = (2.6 + 2.2 * math.cos(a), -15.5 - 3.2 * (0.5 - 0.5 * math.cos(a)) - 1.2 * math.sin(a))
    return dict(pata_perto=pata, cab_ang=9.0 + 4.0 * math.sin(a), cab=(2.8, -24.0), olhos="fechado",
                boca="w", orelhas=(0.0, 8.0 * max(0.0, -math.sin(a))), cauda=CAUDA_FRENTE)


def banho_lambe(t, k):
    """Ergue a patinha e lambe (língua para fora nos quadros ímpares)."""
    if k == 0:
        B.repouso_sentado(t)
    elif k == 7:
        sentado(t, **_rosto(0))
    else:
        pata = [None, (1.0, -7.0), (3.4, -15.0), (3.4, -14.2), (3.4, -15.0), (3.4, -14.2), (4.0, -15.0)][k]
        ang = [0, 4, 12, 14, 12, 14, 10][k]
        boca = [None, "w", "aberta", "w", "aberta", "w", "w"][k]
        olhos = [None, "aberto", "fechado", "fechado", "fechado", "fechado", "fechado"][k]
        sentado(t, pata_perto=pata, cab_ang=ang, cab=(2.8, -24.0), olhos=olhos, boca=boca,
                olhar=(1, 1) if k == 1 else (0, 0))


def banho_rosto(t, k):
    """Passa a pata no rosto em círculos (laço)."""
    sentado(t, **_rosto(k))


def banho_orelha(t, k):
    """Leva a pata por cima da orelha, abaixa e volta à pose de descanso."""
    if k == 0:
        sentado(t, **_rosto(0))
    elif k == 7:
        B.repouso_sentado(t)
    else:
        pata = [None, (3.0, -21.0), (1.5, -25.0), (-0.5, -23.5), (2.5, -14.0), (0.5, -3.0), (0.0, 0.0)][k]
        ang = [0, 16, 20, 18, 8, 0, 0][k]
        orelhas = [None, (0, 20), (6, 30), (4, 24), (0, 10), (0, 0), (0, -6)][k]
        olhos = [None, "fechado", "fechado", "fechado", "fechado", "meio", "aberto"][k]
        vira = [0, 0, 0, 0, 0, 0.2, 0][k]
        sentado(t, pata_perto=pata, cab_ang=ang, cab=(2.8, -24.0), olhos=olhos, orelhas=orelhas, vira=vira)


# ═══════════════════════════════ luzinha ═══════════════════════════════
def luz_ve(t, k):
    """Uma luzinha aparece no chão e passeia; o gato segue com os olhos e fica de orelha em pé."""
    if k == 0:
        B.repouso_sentado(t)
    else:
        olhar = [None, (1, 0), (1, 1), (1, 1), (1, 1), (1, 1), (1, 1), (1, 1)][k]
        orelhas = [None, (0, -12), (-6, -6), (-8, -8), (-8, -8), (-10, -10), (-10, -10), (-10, -10)][k]
        ang = [0, 0, 2, 4, 6, 3, 4, 5][k]
        ab = [0, 0, 0, 0.8, 1.6, 0.8, 1.6, 0.8][k]
        sentado(t, olhar=olhar, orelhas=orelhas, cab_ang=ang, vira=0.3 if k > 1 else 0.1,
                cauda=cauda_frente(0.5 * ab, -1.0 * ab, ab))
    pos = [None, (81, 50, 0.4), (79, 50, 1.0), (74, 50, 1.0), (69, 50, 1.0), (72, 50, 1.0), (76, 50, 1.0), (73, 50, 1.0)][k]
    if pos:
        luzinha(t, pos[0], pos[1], pos[2], chao=True, k=k)


def luz_agacha(t, k):
    """Agacha, mira, e rebola o traseiro antes do pulo."""
    if k == 0:
        sentado(t, olhar=(1, 1), orelhas=(-10, -10), cab_ang=5, vira=0.3, cauda=cauda_frente(0.4, -0.8, 0.8))
    else:
        w = [0, 0, 1, -1, 1, -1, 0.5, 0][k]
        alto = [0, 0, 0.5, 0.5, 1.0, 1.0, 1.5, 3.0][k]
        de_pe(t, XP, quadril=(-7.5 + 0.8 * w, -9.5 - alto), ombro=(6.0, -8.0),
              pes=((-5.0, 0), (-8.0, 0), (8.0, 0), (5.5, 0)), cab=(11.0, -15.5), olhar=(1, 1),
              orelhas=(-10, -10), boca="nada" if k < 7 else "w",
              cauda=((-12.0, -10.0 - alto), (-17.0, -8.0 - alto * 0.5 + w), (-21.0, -7.0 - w),
                     (-24.0, -8.0 + 1.5 * w)))
    x = [73, 72, 71, 72, 72, 71, 72, 72][k]
    luzinha(t, x, 50, 1.0, chao=True, k=k)


SALTA_FIM = dict(cab=(11.0, -23.5), cab_ang=-12, olhar=(1, -1), orelhas=(-4, -4))


def luz_salta(t, k):
    """Pulo atrás da luzinha: ela escapa para cima e o gato cai de pé, olhando para o alto."""
    if k == 0:
        de_pe(t, XP, quadril=(-7.5, -12.5), ombro=(6.0, -8.0), pes=((-5.0, 0), (-8.0, 0), (8.0, 0), (5.5, 0)),
              cab=(11.0, -15.5), olhar=(1, 1), orelhas=(-10, -10),
              cauda=((-12.0, -13.0), (-17.0, -11.5), (-21.0, -10.0), (-24.0, -11.0)))
    elif k == 1:
        de_pe(t, 49.0, dy=-3, quadril=(-7.0, -11.0), ombro=(6.5, -17.0), larg=13,
              pes=((-9.5, 0), (-12.0, 0), (10.0, -13.0), (8.0, -12.0)),
              cab=(11.0, -26.5), cab_ang=-14, olhar=(1, -1), orelhas=(-10, -10),
              cauda=((-12.0, -11.0), (-17.0, -9.0), (-22.0, -8.0), (-26.0, -9.0)))
    elif k == 2:
        de_pe(t, 52.0, dy=-10, quadril=(-6.5, -10.0), ombro=(5.5, -18.5), larg=9,
              pes=((-9.0, -10.0), (-11.0, -9.0), (12.0, -34.0), (10.0, -33.0)),
              cab=(9.5, -28.0), cab_ang=-22, olhar=(1, -1), boca="aberta", orelhas=(-10, -10),
              cauda=((-11.0, -9.0), (-16.0, -6.0), (-21.0, -6.0), (-25.0, -8.0)))
    elif k == 3:
        de_pe(t, 54.0, dy=-11, quadril=(-6.5, -10.5), ombro=(5.5, -18.0), larg=8,
              pes=((-8.0, -13.0), (-10.0, -12.0), (11.0, -35.0), (9.0, -34.0)),
              cab=(9.5, -28.0), cab_ang=-24, olhar=(1, -1), boca="aberta", orelhas=(-10, -10),
              cauda=((-11.0, -9.0), (-15.0, -5.0), (-20.0, -3.0), (-24.0, -4.0)))
    elif k == 4:
        de_pe(t, 55.0, dy=-5, quadril=(-7.5, -12.0), ombro=(6.5, -12.5), larg=11,
              pes=((-7.0, -5.0), (-9.0, -4.5), (9.0, -6.0), (6.5, -5.5)),
              cab=(10.5, -22.0), cab_ang=-10, olhar=(1, -1), boca="w",
              cauda=((-12.0, -15.0), (-16.0, -20.0), (-15.0, -26.0), (-11.0, -28.0)))
    elif k == 5:
        de_pe(t, 55.0, quadril=(-7.5, -9.0), ombro=(6.0, -8.5), pes=((-5.5, 0), (-8.5, 0), (8.0, 0), (5.5, 0)),
              cab=(11.0, -15.0), olhos="fechado", boca="w", orelhas=(8, 8), larg=17,
              cauda=((-12.0, -11.0), (-17.0, -15.0), (-17.0, -21.0), (-13.0, -23.0)))
    else:
        de_pe(t, 54.0 if k == 6 else 53.0, **(SALTA_FIM if k == 7 else dict(cab=(11.0, -22.0), cab_ang=-8, olhar=(1, -1))))
    pos = [(72, 50, True), (71, 40, False), (69, 24, False), (68, 12, False), (70, 6, False), (72, 5, False),
           (73, 6, False), (74, 7, False)][k]
    luzinha(t, pos[0], pos[1], 1.0, chao=pos[2], k=k)


def luz_olha(t, k):
    """Senta olhando para cima, intrigado (a luzinha some no alto), e volta à pose de descanso."""
    if k == 0:
        de_pe(t, 53.0, **SALTA_FIM)
    elif k == 7:
        B.repouso_sentado(t)
    else:
        x = [0, 50.5, 48.5, 47.5, 47.0, 47.0, 47.0][k]
        ang = [0, -12, -10, 4, -8, -2, 0][k]
        cab = [None, (3.0, -24.6), (3.0, -24.6), (2.6, -24.6), (3.0, -24.6), (2.6, -24.5), (2.6, -24.5)][k]
        olhar = [None, (1, -1), (1, -1), (0, -1), (1, -1), (0, 0), (0, 0)][k]
        orelhas = [None, (-4, -4), (6, -6), (-6, 6), (0, 0), (0, 0), (0, 0)][k]
        olhos = "fechado" if k == 5 else "aberto"
        if k <= 4:
            cauda, frente = cauda_atras(0.4 * _sn(k), 0.0), False
        else:
            cauda, frente = cauda_frente(-1.5 if k == 5 else -0.6, 0.6 if k == 5 else 0.2), True
        sentado(t, x, cab=cab, cab_ang=ang, olhar=olhar, orelhas=orelhas, olhos=olhos, cauda=cauda, cauda_frente=frente)
        if k in (2, 3, 4):
            interrogacao(t, 66 + (k == 3), 12 - (k == 3))
    pos = [(74, 7, 1.0), (75, 6, 0.8), (77, 6, 0.55), (79, 5, 0.3), None, None, None, None][k]
    if pos:
        luzinha(t, pos[0], pos[1], pos[2], k=k)


LINHAS = {
    'idle-sentado': idle_sentado,
    'idle-deitado': idle_deitado,
    'dormir-chega': dormir_chega,
    'dormir-gira': dormir_gira,
    'dormir-respira': dormir_respira,
    'espreguicar-acorda': espreguicar_acorda,
    'espreguicar-estica': espreguicar_estica,
    'espreguicar-boceja': espreguicar_boceja,
    'novelo-percebe': novelo_percebe,
    'novelo-toca': novelo_toca,
    'novelo-salta': novelo_salta,
    'novelo-senta': novelo_senta,
    'estudo-olha': estudo_olha,
    'estudo-vira': estudo_vira,
    'estudo-deita': estudo_deita,
    'banho-lambe': banho_lambe,
    'banho-rosto': banho_rosto,
    'banho-orelha': banho_orelha,
    'luz-ve': luz_ve,
    'luz-agacha': luz_agacha,
    'luz-salta': luz_salta,
    'luz-olha': luz_olha,
}
