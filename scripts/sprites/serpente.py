"""Serpente do Ciático: serpente enorme enrolada no chão, pescoço em S, cabeça em
cunha com presas, escamas douradas e um veio luminoso amarelo correndo pelo
dorso (o "nervo" que dá nome a ela, em versão de fantasia)."""
from __future__ import annotations

import math

import numpy as np

from motor import Camera, Cena, Material, Osso, fbm3, rampa, sd_cone_redondo, sd_elipsoide, sd_esfera, suave_min, voronoi3

NOME = 'serpente'
CAM = Camera(136, 120, (60, 112), inclinacao=0.34, escala=1.0)
TEMPOS = {'parado': 200, 'preparo': 100, 'golpe': 70, 'dano': 90, 'derrota': 140, 'vitoria': 150}
V = lambda *a: np.array(a, np.float32)  # noqa: E731


def tex_escama(p, n):
    borda, cid = voronoi3(p / 2.4)
    losango = (np.sin(p[:, 0] * 0.28 + p[:, 2] * 0.28) * np.sin(p[:, 1] * 0.28 - p[:, 2] * 0.2) > 0.62).astype(np.float32)
    barriga = np.clip(-n[:, 1] * 2 - 0.4, 0, 1)  # parte de baixo, mais clara
    return -0.9 * (borda < 0.1) - 1.8 * losango + 1.3 * barriga


MATS = {
    'escama': Material(rampa('#c99a2e', 7, escuro=0.2, claro=1.25, giro=0.2), textura=tex_escama, brilho=0.35),
    'cabeca': Material(rampa('#b88a28', 7, escuro=0.2, claro=1.25, giro=0.2), textura=tex_escama, brilho=0.4),
    'nervo': Material([(200, 140, 20), (255, 210, 60), (255, 245, 170)], emissivo=True),
    'olho': Material([(200, 60, 20), (255, 140, 40), (255, 230, 150)], emissivo=True),
    'presa': Material(rampa('#f2ead6', 4, escuro=0.5, claro=1.1)),
    'boca': Material(rampa('#8a2a3a', 4, escuro=0.3, claro=1.2)),
    'lingua': Material(rampa('#d0304a', 4, escuro=0.4, claro=1.2)),
}


def caminho(t: dict):
    """Pontos do corpo: espiral enrolada no chão e o pescoço que sobe em S até a cabeça."""
    pts = []
    giros = 1.55
    for i in range(34):
        u = i / 33
        ang = u * giros * 2 * math.pi + t.get('roda', 0)
        R = 24 - u * 8
        pts.append((V(R * math.cos(ang) - 6, 7 + u * 3, R * math.sin(ang) * 0.85), 7.2 - u * 1.3))
    base = pts[-1][0]
    alto = t.get('alto', 0)
    avanço = t.get('bote', 0)
    onda = t.get('onda', 0)
    for i in range(1, 27):
        u = i / 26
        x = base[0] + u * (16 + avanço * 1.2) + math.sin(u * math.pi * 1.6 + onda) * 6 * (1 - u * 0.5)
        y = base[1] + u * (46 + alto) - max(avanço, 0) * 0.35 * u * u
        z = base[2] + u * (10 + avanço * 0.3)
        pts.append((V(x, y, z), 6.4 - u * 1.4))
    return pts


def montar(t: dict) -> Cena:
    c = Cena()
    raiz = Osso((t.get('x', 0), t.get('y', 0), 0)).filho(ry=0.2)
    pts = caminho(t)
    for i, (pt, r) in enumerate(pts):
        c.add('escama', lambda p, pt=pt, r=r: sd_esfera(p - pt, r), raiz, grupo=0, suave=3.0)
    # veio luminoso no dorso: segue o corpo, um pouco acima
    for i in range(0, len(pts) - 2, 2):
        a, ra = pts[i]
        b, rb = pts[i + 2]
        c.add('nervo', lambda p, a=a, b=b, ra=ra, rb=rb: sd_cone_redondo(p, a + V(0, ra * 1.02, 0), b + V(0, rb * 1.02, 0), 1.0, 1.0), raiz, grupo=1)
    # cabeça em cunha, no fim do pescoço
    fim, rf = pts[-1]
    prev, _ = pts[-2]
    direcao = fim - prev
    inclina = math.atan2(direcao[1], math.hypot(direcao[0], direcao[2]))
    cab = raiz.filho(tuple(fim + V(1.5, 1.5, 0)), ry=-0.35, rz=-0.9 + inclina * 0.35 + t.get('cabeca', 0))
    cab.rot = cab.rot * 1.0
    def cranio(p):
        d = sd_elipsoide(p - V(3, 0, 0), (9.5, 5.2, 6.8))
        d = suave_min(d, sd_elipsoide(p - V(11, -0.6, 0), (6.4, 3.8, 4.8)), 2.5)
        d = suave_min(d, sd_elipsoide(p - V(2, 3.4, 0), (6, 2.2, 6.2)), 1.5)  # placa da testa
        return d
    S = 1.45
    E = lambda f: (lambda p: f(p / S) * S)  # noqa: E731
    c.add('cabeca', E(cranio), cab, grupo=2)
    for lz in (-4.4, 4.4):
        c.add('olho', E(lambda p, lz=lz: sd_elipsoide(p - V(7.5, 2.0, lz), (2.1, 1.4, 1.2))), cab, grupo=3)
        c.add('cabeca', E(lambda p, lz=lz: sd_elipsoide(p - V(7.0, 3.6, lz * 0.95), (3.2, 1.1, 1.8))), cab, grupo=4)  # sobrancelha
    boca = t.get('boca', 0.0)
    mand = cab.filho((0, -2.5 * S, 0), rz=-boca)
    c.add('cabeca', E(lambda p: sd_elipsoide(p - V(8, -1.2, 0), (8.5, 2.0, 5.0))), mand, grupo=5)
    if boca > 0.15:
        c.add('boca', E(lambda p: sd_elipsoide(p - V(9, 0.3, 0), (7.5, 1.3, 4.0))), mand, grupo=6)
        for lz in (-2.6, 2.6):
            c.add('presa', E(lambda p, lz=lz: sd_cone_redondo(p, V(13.5, -3.2, lz), V(14.5, -8.5, lz), 1.1, 0.15)), cab, grupo=7)
        lin = mand.filho((14 * S, 0.5 * S, 0), rz=0.25)
        c.add('lingua', lambda p: sd_cone_redondo(p, V(0, 0, 0), V(7, 0.5, 0), 0.7, 0.4), lin, grupo=8)
        for lz in (-1.2, 1.2):
            c.add('lingua', lambda p, lz=lz: sd_cone_redondo(p, V(7, 0.5, 0), V(10, 1.5, lz), 0.4, 0.2), lin, grupo=8)
    return c


def suave(a, b, x):
    x = max(0.0, min(1.0, x))
    x = x * x * (3 - 2 * x)
    return a + (b - a) * x


def poses():
    a = {}
    a['parado'] = [{'onda': i / 4 * 2 * math.pi, 'alto': 1.5 * math.sin(i / 4 * 2 * math.pi), 'boca': 0.08} for i in range(4)]
    a['preparo'] = [{'onda': 1.2 * f, 'alto': 10 * f, 'bote': -6 * f, 'boca': 0.5 * f, 'cabeca': 0.25 * f} for f in (0.35, 0.7, 1.0)]
    g = []
    for f in (0.0, 0.55, 1.0, 1.0, 0.6, 0.25):
        g.append({'onda': suave(1.2, -0.4, f), 'alto': suave(10, -2, f), 'bote': suave(-6, 16, f), 'boca': 0.75 if f > 0.3 else 0.5, 'cabeca': suave(0.25, -0.35, f)})
    a['golpe'] = g
    a['dano'] = [{'onda': -0.8 * f, 'alto': -4 * f, 'bote': -5 * f, 'boca': 0.4 * f, 'cabeca': 0.5 * f, 'x': -3 * f} for f in (1.0, 0.65, 0.3)]
    a['derrota'] = [{'alto': -36 * f, 'bote': 4 * f, 'onda': 0.4 * f, 'boca': 0.3, 'cabeca': -0.6 * f, 'y': -2 * f} for f in (0.25, 0.5, 0.75, 0.95, 1.0)]
    a['vitoria'] = [{'alto': 14 * f, 'onda': 0.6 * f, 'boca': 0.7 * f, 'cabeca': 0.45 * f} for f in (0.4, 0.8, 1.0, 0.9)]
    return a


# variante do bestiário: Víbora do Mediano (escamas azuis e nervo elétrico)
VARIANTES = {
    'eletrica': lambda: {
        'escama': Material(rampa('#3a8ac8', 7, escuro=0.2, claro=1.3, giro=0.2), textura=tex_escama, brilho=0.45),
        'cabeca': Material(rampa('#2c76b0', 7, escuro=0.2, claro=1.3, giro=0.2), textura=tex_escama, brilho=0.5),
        'nervo': Material([(120, 200, 255), (200, 240, 255), (255, 255, 230)], emissivo=True),
        'olho': Material([(240, 200, 40), (255, 240, 120), (255, 255, 220)], emissivo=True),
    },
}
