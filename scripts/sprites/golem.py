"""Golem de Gesso: blocos de gesso moldado, costuras de molde, rachaduras azuis
de energia, musgo nos ombros e punhos pesados."""
from __future__ import annotations

import math

import numpy as np

from motor import (Camera, Cena, Material, Osso, fbm3, rampa, sd_caixa, sd_cone_redondo, sd_elipsoide, sd_esfera,
                   voronoi3)

NOME = 'golem'
CAM = Camera(128, 128, (62, 120), inclinacao=0.32)
TEMPOS = {'parado': 260, 'preparo': 110, 'golpe': 80, 'dano': 90, 'derrota': 140, 'vitoria': 160}


def tex_peito(p, n):
    # rachaduras: bordas de células grandes, só onde o ruído deixa (poucas e longas)
    borda, cid = voronoi3(p / 22.0)
    onde = fbm3(p / 14.0 + 3) > 0.6
    trinca = ((borda < 0.03) & onde).astype(np.float32)
    beira = ((borda < 0.07) & onde).astype(np.float32)
    # placas do molde: tom levemente diferente por célula
    grao0 = (cid - 0.5) * 0.35
    grao = (fbm3(p / 3.0) - 0.5) * 0.5
    # rachaduras desenhadas: dois veios sinuosos que descem pelo bloco (intencionais, não ruído)
    veio1 = np.abs(p[:, 0] - 4 - 3.0 * np.sin(p[:, 1] / 4.5) - 1.5 * np.sin(p[:, 1] / 1.7)) < 0.75
    veio2 = np.abs(p[:, 0] + 7 - 2.5 * np.sin(p[:, 1] / 3.8 + 1.3)) < 0.6
    alcance1 = (p[:, 1] > -2) & (p[:, 1] < 14) & (p[:, 2] > 0)
    alcance2 = (p[:, 1] > -14) & (p[:, 1] < -2) & (p[:, 2] > 0)
    veios = ((veio1 & alcance1) | (veio2 & alcance2)).astype(np.float32)
    halo = (((np.abs(p[:, 0] - 4 - 3.0 * np.sin(p[:, 1] / 4.5) - 1.5 * np.sin(p[:, 1] / 1.7)) < 1.8) & alcance1)
            | ((np.abs(p[:, 0] + 7 - 2.5 * np.sin(p[:, 1] / 3.8 + 1.3)) < 1.6) & alcance2)).astype(np.float32)
    return grao + grao0 - 1.3 * beira - 1.4 * halo, np.maximum(trinca, veios)


def tex_gesso(p, n):
    borda, cid = voronoi3(p / 16.0)
    onde = fbm3(p / 12.0 + 3) > 0.5
    trinca = ((borda < 0.05) & onde).astype(np.float32)
    beira = ((borda < 0.11) & onde).astype(np.float32)
    return (fbm3(p / 3.0) - 0.5) * 0.5 + (cid - 0.5) * 0.35 - 1.6 * beira, trinca


def tex_musgo(p, n):
    return (fbm3(p / 1.6) - 0.5) * 2.4


MATS = {
    'peito': Material(rampa('#cdc5b2', 7, escuro=0.22, claro=1.25), textura=tex_peito,
                      cores_textura=[(60, 150, 235), (120, 220, 255), (220, 250, 255)]),
    'gesso': Material(rampa('#cdc5b2', 7, escuro=0.22, claro=1.25, giro=0.12), textura=tex_gesso,
                      cores_textura=[(60, 150, 235), (120, 220, 255), (220, 250, 255)]),
    'gesso_escuro': Material(rampa('#8a8070', 6, escuro=0.2, claro=1.15, giro=0.12), textura=tex_gesso,
                             cores_textura=[(60, 150, 235), (120, 220, 255), (220, 250, 255)]),
    'musgo': Material(rampa('#5d8a3a', 5, escuro=0.3, claro=1.3, giro=0.12), textura=tex_musgo),
    'olho': Material([(40, 140, 220), (120, 220, 255), (230, 252, 255)], emissivo=True),
    'nucleo': Material([(30, 110, 200), (90, 200, 255), (220, 250, 255)], emissivo=True),
}


def montar(t: dict) -> Cena:
    """t: parâmetros da pose (respiração, inclinação, braços, pernas)."""
    c = Cena()
    raiz = Osso((t.get('x', 0), t.get('y', 0), 0)).filho(ry=0.38 + t.get('giro', 0))
    quadril = raiz.filho((0, 34 + t.get('agacha', 0), 0), rx=t.get('tronco', 0) * 0.3)
    tronco = quadril.filho((0, 20 + t.get('resp', 0), 0), rx=t.get('tronco', 0), rz=t.get('lado', 0))
    # corpo: pelve e peito como blocos moldados, misturados
    c.add('gesso_escuro', lambda p: sd_caixa(p, (15, 9, 11), 5), quadril, grupo=0)
    c.add('peito', lambda p: sd_caixa(p - np.array([0, 4, 0], np.float32), (25, 17, 15), 9), tronco, suave=5, grupo=0)
    c.add('peito', lambda p: sd_elipsoide(p - np.array([0, 2, 9], np.float32), (17, 12, 8)), tronco, suave=4, grupo=0)
    # placa do peito com núcleo de energia
    c.add('gesso_escuro', lambda p: sd_caixa(p - np.array([0, 3, 15], np.float32), (11, 9, 3), 2), tronco, grupo=1)
    c.add('nucleo', lambda p: sd_esfera(p - np.array([0, 3, 18], np.float32), 3.2 + t.get('brilho', 0)), tronco, grupo=1)
    # cabeça afundada entre os ombros
    cab = tronco.filho((0, 25, 7), rx=t.get('cabeca', 0))
    c.add('gesso', lambda p: sd_caixa(p, (9.5, 8, 8.5), 3.5), cab, grupo=2)
    c.add('gesso_escuro', lambda p: sd_caixa(p - np.array([0, 2.5, 5], np.float32), (8.6, 2, 4), 1), cab, grupo=2)
    for lx in (-3.6, 3.6):
        c.add('olho', lambda p, lx=lx: sd_esfera(p - np.array([lx, 0.2, 8.0], np.float32), 1.7), cab, grupo=3)
    # braços
    for lado in (-1, 1):
        k = 'd' if lado > 0 else 'e'
        ombro = tronco.filho((lado * 27, 13, 0), rz=lado * t.get(f'abre_{k}', 0), rx=t.get(f'ergue_{k}', 0))
        c.add('gesso', lambda p: sd_elipsoide(p, (12, 11, 12)), ombro, grupo=10 + lado)
        c.add('musgo', lambda p: sd_elipsoide(p - np.array([0, 9, -1], np.float32), (8, 3.5, 8)) - 0.8 * (fbm3(p / 2.0) - 0.5), ombro, grupo=20 + lado)
        cotovelo = ombro.filho((lado * 4, -20, 2), rx=t.get(f'dobra_{k}', 0))
        c.add('gesso', lambda p, lado=lado: sd_cone_redondo(p, (0, 20, -2), (0, 0, 0), 8.5, 7.5), cotovelo, grupo=30 + lado)
        punho = cotovelo.filho((0, -18, 2))
        c.add('gesso', lambda p: sd_cone_redondo(p, (0, 18, -2), (0, 2, 0), 7.5, 10), cotovelo.filho((0, -18, 2)), suave=3, grupo=30 + lado)
        c.add('gesso', lambda p: sd_caixa(p - np.array([0, -4, 1], np.float32), (11, 10, 10), 5), punho, suave=3, grupo=30 + lado)
        c.add('gesso_escuro', lambda p: sd_caixa(p - np.array([0, -1, 1], np.float32), (11.6, 1.8, 10.6), 1), punho, grupo=40 + lado)
    # pernas
    for lado in (-1, 1):
        k = 'd' if lado > 0 else 'e'
        coxa = quadril.filho((lado * 10, -2, 0), rx=t.get(f'perna_{k}', 0))
        c.add('gesso', lambda p: sd_cone_redondo(p, (0, 0, 0), (0, -16, 1), 10, 8.5), coxa, grupo=50 + lado)
        pe = coxa.filho((0, -27 - t.get('agacha', 0) * 0.6, 3))
        c.add('gesso_escuro', lambda p: sd_caixa(p - np.array([0, 6, 2], np.float32), (10, 6, 12), 4), pe, suave=2, grupo=50 + lado)
    return c


def suave(a, b, x):
    x = max(0.0, min(1.0, x))
    x = x * x * (3 - 2 * x)
    return a + (b - a) * x


def poses():
    """Quadros de cada animação: idle respira, ataque com preparação e soco de cima, dano, derrota e vitória."""
    anims = {}
    anims['parado'] = [{'resp': math.sin(i / 4 * 2 * math.pi) * 1.2, 'brilho': 0.3 * (i % 2), 'abre_d': 0.05, 'abre_e': -0.05} for i in range(4)]
    anims['preparo'] = [{'resp': 1, 'tronco': -0.12 * f, 'ergue_d': -1.6 * f, 'dobra_d': -0.9 * f, 'abre_d': 0.2 * f, 'agacha': -2 * f, 'brilho': f} for f in (0.35, 0.7, 1.0)]
    golpe = []
    for i, f in enumerate((0.0, 0.5, 1.0, 1.0, 0.6, 0.25)):
        golpe.append({'tronco': suave(-0.12, 0.32, f), 'ergue_d': suave(-1.6, 0.9, f), 'dobra_d': suave(-0.9, -0.1, f), 'abre_d': 0.2 * (1 - f),
                      'agacha': suave(-2, 4, f), 'cabeca': 0.15 * f, 'x': 3 * f, 'brilho': 1.2 if i in (2, 3) else 0.5})
    anims['golpe'] = golpe
    anims['dano'] = [{'tronco': -0.25 * f, 'cabeca': -0.3 * f, 'x': -4 * f, 'abre_d': 0.3 * f, 'abre_e': -0.3 * f, 'ergue_d': 0.4 * f, 'ergue_e': 0.4 * f} for f in (1.0, 0.7, 0.3)]
    anims['derrota'] = [{'agacha': -6 * f, 'tronco': 0.5 * f, 'cabeca': 0.4 * f, 'abre_d': 0.5 * f, 'abre_e': -0.5 * f, 'perna_d': 0.4 * f, 'perna_e': 0.3 * f, 'y': -6 * f} for f in (0.2, 0.45, 0.7, 0.9, 1.0)]
    anims['vitoria'] = [{'ergue_d': -2.6 * f, 'ergue_e': -2.6 * f, 'dobra_d': -0.5, 'dobra_e': -0.5, 'abre_d': 0.4 * f, 'abre_e': -0.4 * f, 'resp': 2 * f, 'cabeca': -0.2 * f, 'brilho': f} for f in (0.4, 0.8, 1.0, 0.85)]
    return anims
