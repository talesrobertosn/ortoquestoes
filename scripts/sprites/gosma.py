"""Gosma de Cimento: massa de cimento ósseo viva, com parafusos e bolhas presos
dentro, olhos acesos e escorridos na base. Estica e achata como gelatina nas
animações. Variantes: ácida (verde) e rainha (pálida, com coroa).
Fantasia, sem anatomia."""
from __future__ import annotations

import math

import numpy as np

from motor import Camera, Cena, Material, Osso, fbm3, rampa, sd_caixa, sd_cone_redondo, sd_elipsoide, sd_esfera, suave_min

NOME = 'gosma'
CAM = Camera(112, 104, (54, 96), inclinacao=0.3, escala=1.0)
TEMPOS = {'parado': 220, 'preparo': 100, 'golpe': 75, 'dano': 85, 'derrota': 130, 'vitoria': 150}
V = lambda *a: np.array(a, np.float32)  # noqa: E731
COROA = False  # a variante rainha liga a coroa


def tex_massa(p, n):
    # massa lisa com veios mais claros e grumos
    veio = np.abs(np.sin(p[:, 0] * 0.35 + p[:, 1] * 0.22 + 3 * fbm3(p / 9))) < 0.07
    return (fbm3(p / 6.0) - 0.5) * 0.5 + 0.5 * veio.astype(np.float32)


MATS = {
    'massa': Material(rampa('#d8dde2', 7, escuro=0.25, claro=1.12, giro=0.15), textura=tex_massa, brilho=0.9, borda_luz=1.6),
    'bolha': Material(rampa('#f4f8fb', 4, escuro=0.6, claro=1.08), brilho=1.0),
    'metal': Material(rampa('#8e98aa', 6, escuro=0.25, claro=1.2), brilho=0.9),
    'olho': Material([(230, 120, 20), (255, 200, 80), (255, 245, 200)], emissivo=True),
    'boca': Material(rampa('#3a3e48', 4, escuro=0.4, claro=1.2)),
    'coroa': Material(rampa('#e3b04b', 6, escuro=0.3, claro=1.3), brilho=0.9),
}


def montar(t: dict) -> Cena:
    k = t.get
    c = Cena()
    est = k('estica', 0.0)          # >0 estica para cima; <0 achata
    raiz = Osso((k('x', 0), k('y', 0), 0)).filho(ry=0.3 + k('giro', 0))
    larg = 1 - 0.35 * est
    alt = 1 + 0.5 * est
    corpo = raiz.filho((0, 0, 0), rz=k('inclina', 0))

    def massa(p):
        q = p / V(larg, alt, larg)
        d = sd_elipsoide(q - V(0, 20, 0), (24, 19, 21))
        d = suave_min(d, sd_elipsoide(q - V(-3, 34, 1), (15, 12, 14)), 6)       # domo de cima
        d = suave_min(d, sd_elipsoide(q - V(0, 5, 0), (29, 6, 25)), 5)          # base que se espalha
        # escorridos: três gotas grossas que descem pela frente e pelos lados
        for ang, comp_ in ((0.4, 9), (2.0, 7), (-1.2, 8)):
            cx, cz = math.cos(ang) * 22, math.sin(ang) * 20
            d = suave_min(d, sd_cone_redondo(q, V(cx, 14, cz), V(cx * 1.08, 14 - comp_, cz * 1.08), 4.2, 2.6), 3)
        # ondulação da superfície (respira)
        d = d + 0.8 * np.sin(q[:, 0] * 0.25 + q[:, 1] * 0.18 + k('fase', 0)) * np.clip(q[:, 1] / 30, 0, 1)
        return d * min(larg, alt)
    c.add('massa', massa, corpo, grupo=0)
    # bolhas presas na massa (aflorando na superfície)
    for i, (x, y, z, r) in enumerate(((-12, 18, 17, 3.0), (9, 28, 15, 2.3), (16, 12, 15, 1.8), (-4, 36, 11, 2.0), (19, 24, 8, 1.6))):
        c.add('bolha', lambda p, x=x, y=y, z=z, r=r: sd_esfera(p / V(larg, alt, larg) - V(x, y, z), r) * min(larg, alt), corpo, grupo=1)
    # parafusos presos: cabeça sextavada para fora, haste enterrada
    for i, (x, y, z, ax, ay) in enumerate(((14, 30, 13, 0.5, 0.3), (-17, 26, 12, -0.6, 0.2), (2, 10, 22, 0.1, -0.2))):
        dirv = V(ax, ay, 1.0); dirv = dirv / np.linalg.norm(dirv)
        base = V(x, y, z)
        def parafuso(p, base=base, dirv=dirv):
            q = p / V(larg, alt, larg)
            cabeca = sd_cone_redondo(q, base + dirv * 1.0, base + dirv * 3.2, 3.2, 3.2)
            haste = sd_cone_redondo(q, base - dirv * 4, base + dirv * 1.0, 1.2, 1.2)
            return np.minimum(cabeca, haste) * min(larg, alt)
        c.add('metal', parafuso, corpo, grupo=2 + i)
    # olhos acesos e boca torta
    olhar = k('olhos', 0)
    for lx in (-7.5, 6.5):
        c.add('olho', lambda p, lx=lx: sd_elipsoide(p / V(larg, alt, larg) - V(lx, 26 + olhar * 0.5, 19.5), (3.0, 3.6 + olhar, 1.6)) * min(larg, alt), corpo, grupo=10)
    boca = k('boca', 0.2)
    c.add('boca', lambda p: sd_elipsoide(p / V(larg, alt, larg) - V(-0.5, 17, 21.5), (7.5, 1.0 + boca * 4.5, 1.6)) * min(larg, alt), corpo, grupo=11)
    if k('coroa', COROA):
        for i in range(5):
            a = i / 5 * 2 * math.pi
            c.add('coroa', lambda p, a=a: sd_cone_redondo(p / V(larg, alt, larg), V(math.cos(a) * 7, 44, math.sin(a) * 6), V(math.cos(a) * 7.6, 50, math.sin(a) * 6.4), 1.8, 0.6) * min(larg, alt), corpo, grupo=12)
        c.add('coroa', lambda p: sd_caixa((p / V(larg, alt, larg) - V(0, 44, 0)) * V(1, 1, 1.15), (8.5, 1.6, 7.5), 1.2) * min(larg, alt), corpo, grupo=12)
    return c


def poses():
    a = {}
    a['parado'] = [{'estica': 0.06 * math.sin(i / 4 * 2 * math.pi), 'fase': i * 1.6} for i in range(4)]
    a['preparo'] = [{'estica': -0.28 * f, 'olhos': 0.6 * f, 'boca': 0.2 + 0.4 * f, 'x': -2 * f} for f in (0.35, 0.7, 1.0)]
    a['golpe'] = [{'estica': e, 'x': x, 'boca': b, 'olhos': 0.8, 'inclina': inc} for e, x, b, inc in
                  ((-0.28, -2, 0.6, 0), (0.25, 3, 0.9, -0.12), (0.38, 8, 1.0, -0.2), (0.1, 10, 0.8, -0.15), (-0.12, 6, 0.5, -0.05), (0.0, 2, 0.3, 0))]
    a['dano'] = [{'estica': -0.32 * f, 'x': -4 * f, 'olhos': -0.6 * f, 'boca': 0.1, 'inclina': 0.12 * f} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'estica': -0.15 - 0.15 * f, 'y': 0, 'olhos': -1.2 * f, 'boca': 0.05, 'inclina': 0.1 * f, 'x': -2 * f} for f in (0.25, 0.5, 0.75, 0.95, 1.0)]
    a['vitoria'] = [{'estica': 0.3 * f, 'boca': 0.8 * f, 'olhos': 0.5 * f} for f in (0.4, 0.8, 1.0, 0.7)]
    return a


VARIANTES = {
    'acida': lambda: {
        'massa': Material(rampa('#a8e070', 7, escuro=0.25, claro=1.15, giro=0.15), textura=tex_massa, brilho=0.9, borda_luz=1.6),
        'bolha': Material(rampa('#f0ffd0', 4, escuro=0.6, claro=1.08), brilho=1.0),
        'olho': Material([(200, 40, 120), (255, 120, 200), (255, 230, 250)], emissivo=True),
    },
    'rainha': lambda: _rainha(),
}


def _rainha():
    global COROA
    COROA = True
    return {'massa': Material(rampa('#f0dcc8', 7, escuro=0.25, claro=1.1, giro=0.15), textura=tex_massa, brilho=0.95, borda_luz=1.6)}
