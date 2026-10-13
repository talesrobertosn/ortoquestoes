"""Guardião do Acetábulo: cavaleiro gigante de armadura pesada (chefe do 1º ato).
Escudo redondo côncavo com aro grosso (a "taça"), maça de cabeça esférica com
cravos, elmo fechado com viseira em T acesa, ombreiras sobrepostas e capa
vermelha. Fantasia, não anatomia."""
from __future__ import annotations

import math

import numpy as np

from motor import (Camera, Cena, Material, Osso, fbm3, rampa, sd_caixa, sd_cone_redondo, sd_elipsoide, sd_esfera, sd_toro,
                   suave_min)

NOME = 'guardiao'
CAM = Camera(152, 160, (72, 152), inclinacao=0.24, escala=1.0)
TEMPOS = {'parado': 260, 'preparo': 110, 'golpe': 80, 'dano': 90, 'derrota': 150, 'vitoria': 160}
V = lambda *a: np.array(a, np.float32)  # noqa: E731


def tex_placa(p, n):
    riscos = (np.abs(np.sin(p[:, 0] * 2.1 + p[:, 1] * 0.7 + 4 * fbm3(p / 6))) < 0.05).astype(np.float32)
    return (fbm3(p / 5.0) - 0.5) * 0.6 - 0.9 * riscos


def tex_capa(p, n):
    return (fbm3(p / 2.0) - 0.5) * 0.6


MATS = {
    'placa': Material(rampa('#8d98ae', 7, escuro=0.2, claro=1.2), textura=tex_placa, brilho=0.75),
    'placa_esc': Material(rampa('#5f6880', 6, escuro=0.22, claro=1.2), textura=tex_placa, brilho=0.6),
    'ouro': Material(rampa('#d9a43c', 6, escuro=0.28, claro=1.25), brilho=0.9),
    'capa': Material(rampa('#a8261c', 6, escuro=0.25, claro=1.2), textura=tex_capa),
    'couro': Material(rampa('#6a4228', 5, escuro=0.3, claro=1.2)),
    'visor': Material([(140, 20, 10), (240, 80, 30), (255, 200, 120)], emissivo=True),
    'escudo': Material(rampa('#7a8498', 7, escuro=0.2, claro=1.2), textura=tex_placa, brilho=0.7),
    'gema': Material([(20, 80, 160), (80, 170, 255), (220, 240, 255)], emissivo=True),
}


def montar(t: dict) -> Cena:
    k = t.get
    c = Cena()
    raiz = Osso((k('x', 0), k('y', 0), 0)).filho(ry=0.42 + k('giro', 0))
    quadril = raiz.filho((0, 52 + k('agacha', 0), 0))
    tronco = quadril.filho((0, 16 + k('resp', 0) * 0.5, 0), rx=k('tronco', 0), rz=k('lado', 0))
    # pernas: coxote, joelheira, greva, sapato de placas
    for lado in (-1, 1):
        kk = 'd' if lado > 0 else 'e'
        coxa = quadril.filho((lado * 10, -2, 0), rx=k(f'perna_{kk}', 0))
        c.add('placa', lambda p: sd_cone_redondo(p, V(0, 0, 0), V(0, -22, 1), 8.5, 7), coxa, grupo=10 + lado)
        c.add('placa_esc', lambda p: sd_esfera(p - V(0, -23, 3), 6.2), coxa, grupo=12 + lado)
        canela = coxa.filho((0, -24, 1), rx=-k(f'perna_{kk}', 0) * 0.7)
        c.add('placa', lambda p: sd_cone_redondo(p, V(0, 0, 0), V(0, -21, 0), 7, 7.5), canela, grupo=14 + lado)
        c.add('placa_esc', lambda p: sd_caixa(p - V(0, -24, 4), (7.5, 4, 11), 3), canela, grupo=14 + lado, suave=2)
    # saia de placas e cinto
    c.add('placa_esc', lambda p: sd_elipsoide(p - V(0, -4, 0), (19, 9, 14)), quadril, grupo=0)
    c.add('ouro', lambda p: sd_toro(p - V(0, 2, 0), 17.5, 2.2), quadril, grupo=1)
    # peitoral com quilha e gema
    def peito(p):
        d = sd_elipsoide(p - V(0, 10, 0), (22, 19, 15))
        return suave_min(d, sd_caixa(p - V(0, 10, 11), (3, 14, 4), 2.5), 3)
    c.add('placa', peito, tronco, grupo=2)
    c.add('ouro', lambda p: sd_toro((p - V(0, 22, 2))[:, [0, 2, 1]] * V(1, 1, 1), 15, 1.6), tronco, grupo=3)
    c.add('gema', lambda p: sd_esfera(p - V(0, 12, 15.5), 3.0 + k('brilho', 0)), tronco, grupo=4)
    # capa nas costas
    capa = tronco.filho((0, 24, -12), rx=0.12 + k('capa', 0))
    def pano(p):
        larg = 18 + np.clip(-p[:, 1] / 50, 0, 1) * 10
        d = np.maximum(np.maximum(np.abs(p[:, 0]) - larg, np.abs(p[:, 1] + 26) - 26), np.abs(p[:, 2] + 1.6 * np.sin(p[:, 0] * 0.45)) - 1.4)
        return d - 0.6
    c.add('capa', pano, capa, grupo=5)
    # cabeça: elmo fechado com viseira em T e chifres curtos
    cab = tronco.filho((0, 32, 2), rx=k('cabeca', 0))
    def elmo(p):
        d = sd_cone_redondo(p, V(0, -4, 0), V(0, 6, 0), 10.5, 9.5)
        return suave_min(d, sd_elipsoide(p - V(0, -6, 4), (9, 5, 7)), 3)
    c.add('placa', elmo, cab, grupo=6)
    c.add('visor', lambda p: np.minimum(sd_caixa(p - V(0, 1, 10.3), (6.5, 1.1, 1.2), 0.4), sd_caixa(p - V(0, -3, 10.3), (1.1, 4.0, 1.2), 0.4)), cab, grupo=7)
    c.add('ouro', lambda p: sd_toro(p - V(0, -9, 0.5), 9.2, 1.2), cab, grupo=8)
    for lado in (-1, 1):
        c.add('ouro', lambda p, lado=lado: sd_cone_redondo(p, V(lado * 8, 6, -1), V(lado * 15, 14, -3), 2.6, 0.6), cab, grupo=9)
    c.add('capa', lambda p: sd_elipsoide(p - V(0, 14, -3), (2.2, 5, 9)), cab, grupo=9)  # crina
    # ombreiras sobrepostas (três lâminas)
    for lado in (-1, 1):
        for i in range(3):
            c.add('placa' if i % 2 == 0 else 'placa_esc', lambda p, lado=lado, i=i: sd_elipsoide(p - V(lado * (23 - i * 1.5), 25 - i * 5, 0), (11 - i, 7 - i * 0.6, 12 - i)), tronco, grupo=20 + (lado > 0) * 3 + i)
    # braço da maça (direito, do lado da câmera)
    ombro_d = tronco.filho((24, 18, 0), rz=k('abre_d', 0.18), rx=k('ergue_d', 0.1))
    c.add('placa', lambda p: sd_cone_redondo(p, V(0, 0, 0), V(0, -17, 0), 6.5, 5.8), ombro_d, grupo=30)
    ante_d = ombro_d.filho((0, -18, 0), rx=k('dobra_d', -0.5))
    c.add('placa', lambda p: sd_cone_redondo(p, V(0, 0, 0), V(0, -15, 0.5), 5.8, 6.4), ante_d, grupo=31)
    c.add('placa_esc', lambda p: sd_caixa(p - V(0, -17, 0.5), (6, 4.5, 6), 2.5), ante_d, grupo=31, suave=1)
    maca = ante_d.filho((0, -17, 1.5), rx=k('maca', 1.2))
    c.add('couro', lambda p: sd_cone_redondo(p, V(0, -6, 0), V(0, 30, 0), 1.8, 1.8), maca, grupo=32)
    c.add('ouro', lambda p: sd_toro(p - V(0, 27, 0), 2.6, 1.0), maca, grupo=33)
    c.add('placa_esc', lambda p: sd_esfera(p - V(0, 36, 0), 8.2), maca, grupo=34)
    for i in range(10):  # cravos em volta da esfera
        u = (i + 0.5) / 10
        th, ph = math.acos(1 - 2 * u), i * 2.39996
        dirv = V(math.sin(th) * math.cos(ph), math.cos(th), math.sin(th) * math.sin(ph))
        base = V(0, 36, 0) + dirv * 7
        c.add('placa', lambda p, b=base, d=dirv: sd_cone_redondo(p, b, b + d * 5.5, 2.0, 0.3), maca, grupo=35)
    # braço do escudo: escudo redondo côncavo (taça) com aro grosso
    ombro_e = tronco.filho((-24, 18, 2), rz=-k('abre_e', 0.2), rx=k('ergue_e', -0.6))
    c.add('placa', lambda p: sd_cone_redondo(p, V(0, 0, 0), V(0, -16, 2), 6.5, 5.8), ombro_e, grupo=40)
    ante_e = ombro_e.filho((0, -17, 2.5), rx=k('dobra_e', -1.0))
    escudo = ante_e.filho((-4, -6, 7), rx=-(k('ergue_e', -0.6) + k('dobra_e', -1.0)) * 0.9, ry=-0.5)
    def taca(p):
        # calota esférica oca: casca de esfera cortada por um plano, aberta para a frente
        R = 30.0
        q = p - V(0, 0, -R + 6)
        casca = np.abs(np.sqrt(np.sum(q * q, axis=-1)) - R) - 1.6
        return np.maximum(casca, -(p[:, 2] - 0.5) * -1 - 0.0) if False else np.maximum(casca, -p[:, 2])
    c.add('escudo', taca, escudo, grupo=41)
    c.add('ouro', lambda p: sd_toro((p - V(0, 0, 0.6))[:, [0, 2, 1]], 18.6, 2.2), escudo, grupo=42)
    c.add('placa_esc', lambda p: sd_esfera(p - V(0, 0, -0.4), 4.5), escudo, grupo=43)
    c.add('gema', lambda p: sd_esfera(p - V(0, 0, 2.6), 2.0), escudo, grupo=44)
    return c


def suave(a, b, x):
    x = max(0.0, min(1.0, x))
    x = x * x * (3 - 2 * x)
    return a + (b - a) * x


def poses():
    a = {}
    a['parado'] = [{'resp': 1.4 * math.sin(i / 4 * 2 * math.pi), 'capa': 0.04 * math.sin(i / 4 * 2 * math.pi), 'brilho': 0.5 * (i % 2)} for i in range(4)]
    a['preparo'] = [{'tronco': -0.12 * f, 'ergue_d': suave(0.1, -2.5, f), 'dobra_d': suave(-0.5, -1.1, f), 'maca': suave(1.2, 0.2, f), 'agacha': -2 * f, 'giro': -0.12 * f, 'brilho': f} for f in (0.35, 0.7, 1.0)]
    g = []
    for f in (0.0, 0.5, 0.9, 1.0, 0.65, 0.3):
        g.append({'tronco': suave(-0.12, 0.3, f), 'ergue_d': suave(-2.5, 0.7, f), 'dobra_d': suave(-1.1, -0.2, f), 'maca': suave(0.2, 1.6, f), 'agacha': suave(-2, -5, f),
                  'giro': suave(-0.12, 0.22, f), 'x': 3 * f, 'capa': 0.25 * f, 'brilho': 1.0})
    a['golpe'] = g
    a['dano'] = [{'tronco': -0.22 * f, 'cabeca': -0.25 * f, 'x': -4 * f, 'ergue_e': -1.2 * f, 'capa': -0.2 * f} for f in (1.0, 0.65, 0.3)]
    a['derrota'] = [{'agacha': -14 * f, 'tronco': 0.5 * f, 'cabeca': 0.4 * f, 'perna_d': -1.3 * f, 'perna_e': 0.3 * f, 'ergue_d': 0.6 * f, 'maca': 1.2 + 0.4 * f, 'y': -2 * f} for f in (0.25, 0.5, 0.75, 0.95, 1.0)]
    a['vitoria'] = [{'ergue_d': suave(0.1, -2.9, f), 'dobra_d': suave(-0.5, -0.1, f), 'maca': suave(1.2, 0.0, f), 'cabeca': -0.15 * f, 'resp': 2 * f, 'brilho': f} for f in (0.4, 0.8, 1.0, 0.9)]
    return a
