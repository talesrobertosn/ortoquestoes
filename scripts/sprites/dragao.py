"""Dragão de Ossos: esqueleto de fantasia (não anatômico), crânio com chifres e
órbitas acesas, pescoço e cauda de vértebras, costelas com núcleo de fogo-fátuo,
asas de osso com membrana rasgada, garras. Chefe: sprite grande, presença."""
from __future__ import annotations

import math

import numpy as np

from motor import (Camera, Cena, Material, Osso, comp, fbm3, rampa, rot_z, sd_arco, sd_caixa, sd_cone_redondo, sd_elipsoide,
                   sd_esfera, suave_min)

NOME = 'dragao'
CAM = Camera(264, 216, (150, 206), inclinacao=0.24, escala=1.0)
TEMPOS = {'parado': 230, 'preparo': 110, 'golpe': 85, 'dano': 90, 'derrota': 150, 'vitoria': 150}
V = lambda *a: np.array(a, np.float32)  # noqa: E731


def tex_osso(p, n):
    poros = (fbm3(p / 1.3) > 0.7).astype(np.float32)
    return (fbm3(p / 4.0) - 0.5) * 0.9 - 0.9 * poros


def tex_membrana(p, n):
    # nervuras finas que irradiam do pulso, sem manchas
    ang = np.arctan2(p[:, 1] - 54, p[:, 0] + 2)
    nerv = (np.abs(np.sin(ang * 9 + 0.6 * fbm3(p / 8))) < 0.1).astype(np.float32)
    return (fbm3(p / 6.0) - 0.5) * 0.5 + 1.1 * nerv


MATS = {
    'osso': Material(rampa('#d9cdb0', 7, escuro=0.22, claro=1.18, giro=0.2), textura=tex_osso),
    'osso_velho': Material(rampa('#a8977a', 6, escuro=0.22, claro=1.15, giro=0.2), textura=tex_osso),
    'chifre': Material(rampa('#4a3a4a', 5, escuro=0.3, claro=1.6), brilho=0.3),
    'membrana': Material(rampa('#5a3f86', 6, escuro=0.25, claro=1.35, giro=0.1), textura=tex_membrana, borda_luz=1.6),
    'fogo': Material([(20, 120, 140), (60, 220, 210), (170, 255, 235), (240, 255, 250)], emissivo=True),
    'dente': Material(rampa('#efe6cf', 4, escuro=0.5, claro=1.1)),
}


def bezier(a, b, c, n):
    a, b, c = (np.asarray(x, np.float32) for x in (a, b, c))
    return [(1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * c for t in np.linspace(0, 1, n)]


def vertebras(cena, osso_raiz, pts, r0, r1, grupo, espinho=0.0):
    """Cadeia de vértebras: discos com processo espinhoso, ligados por um fio fino."""
    n = len(pts)
    for i, pt in enumerate(pts):
        r = r0 + (r1 - r0) * i / max(1, n - 1)
        cena.add('osso', lambda p, pt=pt, r=r: sd_elipsoide(p - pt, (r * 0.85, r, r)), osso_raiz, grupo=grupo, suave=0.6)
        if espinho > 0 and i % 1 == 0:
            cena.add('osso_velho', lambda p, pt=pt, r=r: sd_cone_redondo(p, pt, pt + V(-r * 0.4, r * espinho, 0), r * 0.35, 0.3), osso_raiz, grupo=grupo + 1)
        if i:
            a = pts[i - 1]
            cena.add('osso_velho', lambda p, a=a, b=pt, r=r: sd_cone_redondo(p, a, b, r * 0.35, r * 0.35), osso_raiz, grupo=grupo, suave=0.6)


def sd_poligono_plano(p, verts, espessura=0.7):
    """Polígono (no plano xy local) com espessura em z: membrana da asa."""
    x, y = p[:, 0], p[:, 1]
    vs = np.asarray(verts, np.float32)
    d = np.full(len(p), 1e9, np.float32)
    s = np.ones(len(p), np.float32)
    for i in range(len(vs)):
        a, b = vs[i], vs[i - 1]
        e = b - a
        wx, wy = x - a[0], y - a[1]
        h = np.clip((wx * e[0] + wy * e[1]) / (e @ e), 0, 1)
        dx, dy = wx - e[0] * h, wy - e[1] * h
        d = np.minimum(d, dx * dx + dy * dy)
        c1 = y >= a[1]
        c2 = y < b[1]
        c3 = e[0] * wy > e[1] * wx
        troca = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
        s = np.where(troca, -s, s)
    d2 = s * np.sqrt(d)
    return np.maximum(d2, np.abs(p[:, 2]) - espessura)


def montar(t: dict) -> Cena:
    c = Cena()
    k = t.get
    raiz = Osso((k('x', 0), k('y', 0), 0)).filho(ry=-0.22 + k('giro', 0))
    corpo = raiz.filho((0, k('agacha', 0), 0), rz=k('empina', 0))
    resp = k('resp', 0)
    # coluna: da bacia aos ombros
    coluna = bezier((-42, 62, 0), (-12, 72 + resp, 0), (20, 72 + resp, 0), 9)
    vertebras(c, corpo, coluna, 4.6, 5.4, 0, espinho=1.6)
    # pescoço: dos ombros até a base do crânio
    alto = k('pescoco', 0)
    cab_pos = V(60 + k('estica', 0), 104 + alto, 0)
    pesc = bezier((24, 74 + resp, 0), (46, 82 + alto * 0.3, 0), cab_pos - V(8, 4, 0), 8)
    vertebras(c, corpo, pesc, 4.6, 3.4, 10, espinho=1.2)
    # cauda: cai da bacia e sobe na ponta
    onda = k('cauda', 0)
    cauda = bezier((-46, 60, 0), (-92, 22 + onda * 6, 8), (-128, 36 + onda * 10, -6), 15)
    vertebras(c, corpo, cauda, 4.2, 1.4, 20, espinho=1.0)
    c.add('osso_velho', lambda p: sd_cone_redondo(p, cauda[-1], cauda[-1] + V(-10, 8, 0), 2.6, 0.2), corpo, grupo=22)
    # costelas: arcos que pendem da coluna, menores para trás
    for i, x in enumerate(np.linspace(14, -30, 6)):
        R = 15 - i * 1.2
        y = 68 + resp - R * 0.15
        for lado in (-1, 1):
            arco = corpo.filho((x, y, 0), rx=lado * 1.5708, rz=-1.5708 + 0.25)
            c.add('osso', lambda p, R=R: sd_arco(p, R, 1.5, 1.25), arco, grupo=30 + i % 2)
    # esterno e núcleo de fogo-fátuo dentro do peito
    c.add('osso_velho', lambda p: sd_cone_redondo(p, V(14, 52 + resp, 0), V(-22, 54 + resp, 0), 2.4, 1.6), corpo, grupo=33)
    brilho = 6.5 + k('nucleo', 0)
    c.add('fogo', lambda p: sd_esfera(p - V(-2, 64 + resp, 0), brilho), corpo, grupo=34)
    # bacia
    c.add('osso', lambda p: sd_elipsoide(p - V(-44, 58, 0), (10, 7, 10)), corpo, grupo=35)
    # pernas: dianteiras e traseiras, ossos com nós e garras
    for lado in (-1, 1):
        z = lado * 13
        for (ombro, cot, pulso, pe, avanço) in (((16, 60), (6, 34), (18, 12), (26, 2), k('pata_frente', 0)), ((-42, 56), (-28, 34), (-44, 16), (-36, 2), k('pata_tras', 0))):
            o = V(ombro[0], ombro[1], z)
            m = V(cot[0] + avanço * lado, cot[1], z * 1.05)
            w = V(pulso[0] + avanço * lado * 1.4, pulso[1], z * 1.1)
            f = V(pe[0] + avanço * lado * 1.6, pe[1], z * 1.1)
            g = 40 + (lado > 0) * 5 + (ombro[0] < 0) * 2
            c.add('osso', lambda p, o=o, m=m: sd_cone_redondo(p, o, m, 4.2, 3.0), corpo, grupo=g, suave=1)
            c.add('osso', lambda p, m=m: sd_esfera(p - m, 3.6), corpo, grupo=g, suave=1)
            c.add('osso', lambda p, m=m, w=w: sd_cone_redondo(p, m, w, 3.0, 2.2), corpo, grupo=g, suave=1)
            c.add('osso', lambda p, w=w, f=f: sd_cone_redondo(p, w, f, 2.4, 2.2), corpo, grupo=g, suave=1)
            for dz in (-3.2, 0, 3.2):  # garras
                c.add('chifre', lambda p, f=f, dz=dz: sd_cone_redondo(p, f + V(0, 0, dz), f + V(9, -1.5, dz * 1.3), 1.6, 0.25), corpo, grupo=g + 1)
    # asas: úmero, antebraço e dedos longos, com membrana recortada em arcos entre os dedos
    abre = k('asas', 0)
    for lado in (-1, 1):
        asa = corpo.filho((10 - (lado < 0) * 4, 78 + resp, lado * 9), ry=lado * 0.18, rz=abre * 0.25 + (lado < 0) * 0.18, rx=-0.15 * lado)
        # o braço sobe e o leque de dedos abre PARA TRÁS, sobre as costas e a cauda
        cot = V(-12, 26 + abre * 6, 0)
        pul = V(-2, 54 + abre * 12, 0)
        dedos = [pul + V(16, 22 + abre * 6, 0), pul + V(-22, 22 + abre * 8, 0), pul + V(-52, 6 + abre * 6, 0), pul + V(-70, -22, 0), pul + V(-62, -46, 0)]
        g = 60 + (lado > 0) * 10
        c.add('osso', lambda p: sd_cone_redondo(p, V(0, 0, 0), cot, 4.4, 3.2), asa, grupo=g, suave=1)
        c.add('osso', lambda p: sd_cone_redondo(p, cot, pul, 3.2, 2.6), asa, grupo=g, suave=1)
        c.add('osso', lambda p: sd_esfera(p - pul, 3.4), asa, grupo=g, suave=1)
        c.add('chifre', lambda p: sd_cone_redondo(p, pul, pul + V(4, 6, 0), 1.6, 0.3), asa, grupo=g + 3)  # garra do polegar
        for d in dedos:
            c.add('osso_velho', lambda p, d=d: sd_cone_redondo(p, pul, d, 2.0, 0.8), asa, grupo=g + 1)
        # contorno da membrana: entre duas pontas de dedo, a borda afunda em direção ao pulso (arco)
        contorno = [V(0, -4, 0), cot, pul, dedos[0]]
        for a_, b_ in zip(dedos, dedos[1:]):
            meio = (a_ + b_) / 2
            contorno += [meio + (pul - meio) * 0.42, b_]
        contorno += [V(-40, -10, 0)]
        def membrana(p, vs=[v[:2] for v in contorno], pul=pul):
            # a membrana enfuna entre os dedos: deslocamento em z que segue o ângulo a partir do pulso
            dx, dy = p[:, 0] - pul[0], p[:, 1] - pul[1]
            ang = np.arctan2(dy, dx)
            r = np.sqrt(dx * dx + dy * dy)
            q = p.copy()
            q[:, 2] = q[:, 2] + 0.8 + 2.4 * np.abs(np.sin(ang * 3.2)) * np.clip(r / 30, 0, 1)
            return sd_poligono_plano(q, vs, 0.55)
        c.add('membrana', membrana, asa, grupo=g + 2)
    # crânio
    cab = corpo.filho(tuple(cab_pos), rz=k('cabeca', -0.25))
    def cranio(p):
        d = sd_elipsoide(p - V(0, 2, 0), (13, 9.5, 8.5))
        d = suave_min(d, sd_cone_redondo(p, V(4, 0, 0), V(26, -4, 0), 6.4, 3.4), 3)
        d = suave_min(d, sd_elipsoide(p - V(6, 6.5, 0), (8, 2.6, 7.5)), 2)  # arcada
        orbitas = np.minimum(sd_esfera(p - V(7, 3.0, 5.4), 3.4), sd_esfera(p - V(7, 3.0, -5.4), 3.4))
        narina = np.minimum(sd_esfera(p - V(24, -1.5, 2.0), 1.3), sd_esfera(p - V(24, -1.5, -2.0), 1.3))
        return np.maximum(np.maximum(d, -orbitas), -narina)
    c.add('osso', cranio, cab, grupo=80)
    for lz in (-5.0, 5.0):
        c.add('fogo', lambda p, lz=lz: sd_esfera(p - V(6.4, 2.6, lz * 0.92), 1.9 + k('olhos', 0)), cab, grupo=81)
    # chifres: curvam para trás e para cima
    for lz in (-1, 1):
        pts = [V(-4, 8, lz * 5), V(-14, 14, lz * 7), V(-25, 14, lz * 8), V(-33, 8, lz * 8.5)]
        for i in range(3):
            r0, r1 = 3.0 - i * 0.9, 2.1 - i * 0.8
            c.add('chifre', lambda p, a=pts[i], b=pts[i + 1], r0=r0, r1=max(0.3, r1): sd_cone_redondo(p, a, b, r0, r1), cab, grupo=82 + (lz > 0), suave=0.8)
    # dentes de cima
    for i, x in enumerate((12, 16, 20, 23)):
        for lz in (-2.6, 2.6):
            c.add('dente', lambda p, x=x, lz=lz: sd_cone_redondo(p, V(x, -3.6, lz), V(x + 0.6, -7.4, lz), 1.1, 0.2), cab, grupo=84)
    # mandíbula: abre no sopro
    mand = cab.filho((-2, -5, 0), rz=-k('boca', 0.05))
    c.add('osso', lambda p: sd_cone_redondo(p, V(0, 0, 0), V(24, -1.5, 0), 4.0, 2.4), mand, grupo=85)
    for x in (10, 14, 18, 21):
        for lz in (-2.2, 2.2):
            c.add('dente', lambda p, x=x, lz=lz: sd_cone_redondo(p, V(x, 1.2, lz), V(x + 0.5, 4.6, lz), 1.0, 0.2), mand, grupo=86)
    if k('boca', 0.05) > 0.35:  # fogo na garganta
        c.add('fogo', lambda p: sd_esfera(p - V(14, -3.5, 0), 3.0 + k('boca', 0) * 2), cab, grupo=87)
    return c


def suave(a, b, x):
    x = max(0.0, min(1.0, x))
    x = x * x * (3 - 2 * x)
    return a + (b - a) * x


def poses():
    a = {}
    a['parado'] = [{'resp': 1.6 * math.sin(i / 4 * 2 * math.pi), 'cauda': math.sin(i / 4 * 2 * math.pi), 'nucleo': 0.8 * (i % 2), 'asas': 0.05 * math.sin(i / 4 * 2 * math.pi), 'pescoco': math.sin(i / 4 * 2 * math.pi + 1)} for i in range(4)]
    a['preparo'] = [{'pescoco': 8 * f, 'estica': -8 * f, 'cabeca': suave(-0.25, 0.35, f), 'boca': 0.5 * f, 'asas': 0.4 * f, 'nucleo': 2 * f, 'empina': 0.06 * f} for f in (0.35, 0.7, 1.0)]
    g = []
    for f in (0.0, 0.5, 1.0, 1.0, 0.7, 0.3):
        g.append({'pescoco': suave(8, -6, f), 'estica': suave(-8, 10, f), 'cabeca': suave(0.35, -0.55, f), 'boca': 0.9 if f > 0.4 else 0.5, 'asas': suave(0.4, 0.15, f),
                  'nucleo': 3 * (1 - abs(f - 0.8)), 'empina': suave(0.06, -0.04, f), 'olhos': 0.8})
    a['golpe'] = g
    a['dano'] = [{'empina': 0.08 * f, 'cabeca': 0.4 * f, 'pescoco': 4 * f, 'estica': -6 * f, 'x': -5 * f, 'boca': 0.4 * f, 'cauda': -f} for f in (1.0, 0.65, 0.3)]
    a['derrota'] = [{'agacha': -10 * f, 'empina': -0.12 * f, 'cabeca': -0.2 - 0.8 * f, 'pescoco': -24 * f, 'estica': -4 * f, 'asas': -0.5 * f, 'pata_frente': 3 * f, 'pata_tras': 2 * f, 'nucleo': -5 * f} for f in (0.25, 0.5, 0.75, 0.95, 1.0)]
    a['vitoria'] = [{'empina': 0.1 * f, 'asas': 0.8 * f, 'pescoco': 10 * f, 'cabeca': suave(-0.25, 0.6, f), 'boca': 0.8 * f, 'nucleo': 2 * f, 'olhos': f} for f in (0.4, 0.8, 1.0, 0.9)]
    return a
