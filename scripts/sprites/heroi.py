"""Cavaleiro do Torneio, em volume. Mantém a identidade do herói original aprovado
pelo Tales (capacete com pluma azul, escudo, espada, proporção chibi) e muda o
EQUIPAMENTO de verdade em cada estágio, não só a cor:

  1 Aprendiz do Torneio      gibão de couro, gorro de ferro, escudo redondo de madeira, espada curta
  2 Escudeiro Clínico        cota de malha, escudo em gota com cruz, espada longa
  3 Guardião dos Fundamentos peitoral de placas, ombreiras, capa curta
  4 Cavaleiro da Reconstrução armadura completa, elmo com crista, capa longa vermelha
  5 Mestre da Ortopedia      armadura com filetes de ouro, escudo heráldico, espada grande, pluma dupla
  6 Lenda da Masmorra        armadura radiante, asas de luz, auréola, espada de luz

Progressão corporal (direção criativa, 13/10/2026): o mesmo herói cresce. O
aprendiz é chibi (cabeça grande, pernas curtas); a cada estágio as pernas e o
tronco alongam, os ombros alargam e a cabeça fica menor em relação ao corpo,
até a lenda adulta. Rosto, capacete branco, pluma azul e cores continuam os
mesmos: é a mesma pessoa, mais velha e mais forte.
"""
from __future__ import annotations

import math

import numpy as np

from motor import (Camera, Cena, Material, Osso, fbm3, rampa, sd_caixa, sd_cone_redondo, sd_elipsoide, sd_esfera, sd_toro)

ESTAGIO = 1
NOME = 'heroi-1'
# quadro maior que o original (96×96) para caber a lenda adulta com asas e auréola
CAM = Camera(112, 120, (54, 114), inclinacao=0.16, escala=1.55)

# proporções por estágio: pernas, tronco (altura), ombros (largura), cabeça, braços, grossura dos membros, escudo
PROP = {
    1: dict(perna=1.00, tronco=1.00, ombro=1.00, cab=1.00, braco=1.00, gr=1.00, escudo=1.00),
    2: dict(perna=1.12, tronco=1.05, ombro=1.04, cab=0.96, braco=1.07, gr=1.03, escudo=1.04),
    3: dict(perna=1.28, tronco=1.12, ombro=1.10, cab=0.91, braco=1.16, gr=1.07, escudo=1.08),
    4: dict(perna=1.46, tronco=1.20, ombro=1.17, cab=0.85, braco=1.26, gr=1.11, escudo=1.12),
    5: dict(perna=1.60, tronco=1.26, ombro=1.23, cab=0.80, braco=1.34, gr=1.14, escudo=1.15),
    6: dict(perna=1.72, tronco=1.31, ombro=1.27, cab=0.76, braco=1.40, gr=1.16, escudo=1.17),
}
TEMPOS = {'parado': 240, 'preparo': 90, 'golpe': 70, 'dano': 90, 'derrota': 140, 'vitoria': 150}

V = lambda *a: np.array(a, np.float32)  # noqa: E731


def tex_couro(p, n):
    return (fbm3(p / 1.4) - 0.5) * 0.9


def tex_malha(p, n):
    return np.where(((np.floor(p[:, 0] / 1.5) + np.floor(p[:, 1] / 1.5)) % 2) == 0, 0.5, -0.5)


def tex_madeira(p, n):
    return np.sin(p[:, 0] * 1.4 + 2 * fbm3(p / 3)) * 0.6


def materiais(est: int):
    ouro = rampa('#e3b04b', 6, escuro=0.3, claro=1.3)
    m = {
        'pele': Material(rampa('#f4bc92', 5, escuro=0.55, claro=1.16, giro=0.08), borda_luz=0.3),
        'olho': Material([(22, 26, 60), (40, 70, 140)], emissivo=True),
        'brilho_olho': Material([(255, 255, 255), (255, 255, 255)], emissivo=True),
        'bochecha': Material([(236, 128, 120), (246, 150, 136)], emissivo=True),
        'boca': Material([(120, 50, 40), (150, 66, 52)], emissivo=True),
        'esmalte': Material(rampa('#e4ecf6', 6, escuro=0.42, claro=1.08, giro=0.25), brilho=0.7),
        'cabelo': Material(rampa('#7a4626', 4, escuro=0.45, claro=1.3)),
        'pluma': Material(rampa('#3f8ae0', 6, escuro=0.3, claro=1.35)),
        'pluma2': Material(rampa('#e8f0ff', 5, escuro=0.55, claro=1.1)),
        'ferro': Material(rampa('#8e9aae', 6, escuro=0.25, claro=1.12), brilho=0.45),
        'aco': Material(rampa('#aab6c8', 6, escuro=0.25, claro=1.12), brilho=0.8),
        'couro': Material(rampa('#8a5530', 5, escuro=0.35, claro=1.2), textura=tex_couro),
        'tunica': Material(rampa('#3f6ac8', 6, escuro=0.3, claro=1.25)),
        'peitoral': Material(rampa('#dfe6f0', 6, escuro=0.4, claro=1.1, giro=0.25), brilho=0.6),
        'malha': Material(rampa('#8a96a8', 5, escuro=0.3, claro=1.2), textura=tex_malha, brilho=0.3),
        'madeira': Material(rampa('#a8743c', 5, escuro=0.35, claro=1.2), textura=tex_madeira),
        'ouro': Material(ouro, brilho=0.8),
        'capa': Material(rampa('#b02c1e', 6, escuro=0.3, claro=1.2)),
        'brasao': Material(rampa('#2f5ad0', 5, escuro=0.35, claro=1.2)),
        'luz': Material([(255, 210, 120), (255, 240, 190), (255, 255, 240)], emissivo=True),
        'bota': Material(rampa('#5a3a22', 4, escuro=0.35, claro=1.2)),
    }
    if est >= 5:  # armadura dourada e capa branca
        m['tunica'] = Material(rampa('#2a3a8a', 6, escuro=0.3, claro=1.25))
        m['aco'] = Material(rampa('#dcae48', 6, escuro=0.32, claro=1.22), brilho=1.0)
        m['capa'] = Material(rampa('#e8e8f0', 6, escuro=0.45, claro=1.08, giro=0.3))
    if est >= 6:  # armadura de pérola com filetes de ouro (o ouro todo misturava corpo, escudo e asas), capa roxa
        m['aco'] = Material(rampa('#ece4d4', 6, escuro=0.42, claro=1.1, giro=0.2), brilho=1.0)
        m['lamina'] = Material([(120, 200, 255), (190, 235, 255), (240, 252, 255), (255, 255, 255)], emissivo=True)
        m['capa'] = Material(rampa('#7a3ac8', 6, escuro=0.3, claro=1.25))
        m['tunica'] = Material(rampa('#5a3aa8', 6, escuro=0.3, claro=1.25))
    return m


def montar(t: dict) -> Cena:
    e = ESTAGIO
    c = Cena()
    P = PROP[e]
    pl, pt_, po, pc, pb, gr = P['perna'], P['tronco'], P['ombro'], P['cab'], P['braco'], P['gr']
    raiz = Osso((t.get('x', 0), t.get('y', 0), 0)).filho(ry=0.35 + t.get('giro', 0))
    quadril = raiz.filho((0, 6 + 9 * pl + t.get('agacha', 0), 0))
    tronco_o = quadril.filho((0, 7 * pt_ + t.get('resp', 0) * 0.4, 0), rx=t.get('tronco', 0), rz=t.get('lado', 0))
    tronco = tronco_o.escalado((po, pt_, (po + 1) / 2))  # as formas do tronco crescem com o estágio
    corpo_mat = 'peitoral' if e == 1 else 'malha' if e == 2 else 'aco'
    # pernas e botas
    for lado in (-1, 1):
        k = 'd' if lado > 0 else 'e'
        coxa = quadril.filho((lado * 4.2 * po, -1, 0), rx=t.get(f'perna_{k}', 0))
        c.add('tunica' if e < 4 else 'aco', lambda p: sd_cone_redondo(p, V(0, 0, 0), V(0, -8 * pl, 0.5), 3.6 * gr, 3.2 * gr), coxa, grupo=60 + lado)
        if e >= 3:  # joelheira
            c.add('aco', lambda p: sd_elipsoide(p - V(0, -7.6 * pl, 1.6), (2.6 * gr, 2.0, 1.6)), coxa, grupo=62 + lado)
        pe = coxa.filho((0, -9 * pl, 0.6)).escalado(gr)
        c.add('bota' if e < 4 else 'aco', lambda p: sd_caixa(p - V(0, -2, 1.4), (3.4, 3.2, 4.6), 1.6), pe, suave=1, grupo=60 + lado)
    # tronco
    c.add('tunica', lambda p: sd_elipsoide(p - V(0, -3, 0), (8.5, 6, 6.5)), tronco, grupo=0)
    c.add(corpo_mat, lambda p: sd_elipsoide(p - V(0, 2, 0.5), (8.2, 7.5, 6.8)), tronco, suave=2, grupo=0)
    c.add('couro' if e < 5 else 'ouro', lambda p: sd_toro(p - V(0, -2.5, 0), 7.6, 1.2), tronco, grupo=1)  # cinto
    if e >= 3:  # ombreiras
        for lado in (-1, 1):
            c.add('aco', lambda p, lado=lado: sd_elipsoide(p - V(lado * 8.2, 6.5, 0), (4.6, 3.4, 4.6)), tronco, grupo=2 + (lado > 0))
            if e >= 5:
                c.add('ouro', lambda p, lado=lado: sd_toro((p - V(lado * 8.2, 6.0, 0)) , 4.3, 0.55), tronco, grupo=4 + (lado > 0))
    if e >= 4:  # peitoral com crista central
        c.add('aco', lambda p: sd_caixa(p - V(0, 3, 6.4), (1.0, 5, 1.2), 0.8), tronco, grupo=6)
    if e >= 5:
        c.add('brasao', lambda p: sd_elipsoide(p - V(0, 3, 6.6), (3.2, 3.6, 0.9)), tronco, grupo=7)
    # capa
    if e >= 1:
        L = 8 if e <= 2 else 11 if e == 3 else 17
        capa = tronco_o.filho((0, 7 * pt_, -5.5 * po), rx=0.18 + t.get('capa', 0)).escalado((po, (pt_ + pl) / 2, 1))
        def pano(p, L=L):
            # trapézio que abre embaixo, com dobras verticais
            larg = 9.5 + np.clip(-p[:, 1] / L, 0, 1) * 4.5
            d = np.maximum(np.maximum(np.abs(p[:, 0]) - larg, np.abs(p[:, 1] + L / 2) - L / 2), np.abs(p[:, 2] + 0.9 * np.sin(p[:, 0] * 0.9)) - 0.9)
            return d - 0.5
        c.add('capa', pano, capa, grupo=8)
    # cabeça
    cab = tronco_o.filho((0, 8 * pt_ + 8.5 * pc - 1.5, 0.5), rx=t.get('cabeca', 0), rz=t.get('cabeca_lado', 0)).escalado(pc)
    c.add('pele', lambda p: sd_esfera(p, 8.5), cab, grupo=10)
    c.add('cabelo', lambda p: sd_elipsoide(p - V(0, 0.5, -2.2), (8.6, 7.4, 7.0)), cab, grupo=10, suave=0.5)
    for lx in (-3.1, 3.1):
        c.add('olho', lambda p, lx=lx: sd_elipsoide(p - V(lx, -0.9, 7.6), (1.35, 2.2, 1.0)), cab, grupo=11)
    c.add('pele', lambda p: sd_esfera(p - V(0, -2.6, 8.0), 0.8), cab, grupo=12)  # nariz
    for lx in (-3.4, 2.8):
        c.add('brilho_olho', lambda p, lx=lx: sd_esfera(p - V(lx, 0.4, 8.35), 0.6), cab, grupo=11)
    for lx in (-5.2, 5.2):
        c.add('bochecha', lambda p, lx=lx: sd_elipsoide(p - V(lx, -3.0, 6.6), (1.6, 0.9, 1.2)), cab, grupo=12)
    c.add('boca', lambda p: sd_elipsoide(p - V(0.4, -4.4, 7.9), (0.8, 0.35, 0.6)), cab, grupo=12)
    # cabelo castanho saindo do capacete dos lados do rosto (como no original)
    for lx in (-1, 1):
        c.add('cabelo', lambda p, lx=lx: sd_elipsoide(p - V(lx * 7.9, -1.6, 2.6), (1.7, 4.4, 3.4)), cab, grupo=10, suave=0.3)
        c.add('cabelo', lambda p, lx=lx: sd_elipsoide(p - V(lx * 3.0, 2.3, 7.8), (1.4, 0.45, 0.6)), cab, grupo=12)  # sobrancelha
    c.add('cabelo', lambda p: sd_elipsoide(p - V(0, 3.6, 7.0), (6.6, 1.1, 1.4)), cab, grupo=10, suave=0.3)  # franja
    # capacete: domo cortado + aba, muda por estágio
    def domo(p, r=9.4, base=2.6):
        return np.maximum(sd_esfera(p, r), base - p[:, 1])
    elmo_mat = 'esmalte'  # o capacete branco é a marca do herói original
    c.add(elmo_mat, lambda p: domo(p - V(0, 0.3, -0.3)), cab, grupo=13)
    c.add('ouro', lambda p: sd_toro(p - V(0, 2.9, -0.2), 9.0, 0.9 + 0.25 * (e >= 5)), cab, grupo=14)
    if e >= 2:  # protetor de nariz
        c.add(elmo_mat, lambda p: sd_caixa(p - V(0, 3.0, 9.0), (0.8, 2.0, 0.7), 0.4), cab, grupo=15)
    if e >= 4:  # crista no topo: base de metal e crina vermelha
        c.add('ouro' if e >= 5 else 'aco', lambda p: sd_caixa(p - V(0, 9.0, -1), (1.0, 1.4, 6.5), 0.7), cab, grupo=16)
        if e == 4:
            c.add('capa', lambda p: sd_elipsoide(p - V(0, 12.5, -2.5), (1.6, 3.6, 8.0)), cab, grupo=16, suave=1)
    if e >= 4:  # asinhas de ouro dos lados do elmo
        for lado in (-1, 1):
            for i in range(3):
                c.add('ouro', lambda p, lado=lado, i=i: sd_cone_redondo(p, V(lado * 8.6, 4 + i * 1.6, -1 - i * 0.6), V(lado * (13 + i * 1.5), 8 + i * 3.4, -3 - i), 1.4 - i * 0.2, 0.4), cab, grupo=19 + (lado > 0), suave=0.6)
    # pluma: cadeia de elipsoides que sai do topo e cai para trás
    ond = t.get('pluma', 0)
    pts = [(0, 9, -1), (0.4, 12, -3.5), (0.8, 13.5, -7), (1.0, 13, -10.5), (1.2, 11, -13)]
    for i, (x, y, z) in enumerate(pts):
        r = 3.0 - i * 0.3
        c.add('pluma', lambda p, x=x, y=y, z=z, r=r, i=i: sd_esfera(p - V(x + ond * i * 0.5, y - ond * i * 0.3, z), r), cab, suave=1.6, grupo=17)
    if e >= 5:
        for i, (x, y, z) in enumerate(pts[:4]):
            c.add('pluma2', lambda p, x=x, y=y, z=z, i=i: sd_esfera(p - V(x - 2.6, y - 1.2, z + 0.5), 2.1 - i * 0.25), cab, suave=1.4, grupo=18)
    if e >= 6:  # auréola
        c.add('luz', lambda p: sd_toro(p - V(0, 16, -1), 6.5, 0.7), cab, grupo=19)
    # braço da espada (direito, do lado da câmera) e do escudo (esquerdo)
    ombro_d = tronco_o.filho((7.5 * po, 5 * pt_, 0.5), rz=t.get('abre_d', 0.25), rx=t.get('ergue_d', 0.2))
    c.add(corpo_mat if e > 1 else 'tunica', lambda p: sd_cone_redondo(p, V(0, 0, 0), V(0, -6 * pb, 0), 2.6 * gr, 2.3 * gr), ombro_d, grupo=20)
    mao_d = ombro_d.filho((0, -6.5 * pb, 0), rx=t.get('dobra_d', -0.6))
    c.add('couro' if e < 4 else 'aco', lambda p: sd_cone_redondo(p, V(0, 0, 0), V(0, -5 * pb, 0.5), 2.3 * gr, 2.4 * gr), mao_d, suave=0.8, grupo=20)
    empunha = mao_d.filho((0, -5.8 * pb, 0.8), rx=t.get('espada', 0.55), rz=t.get('espada_lado', -0.35))
    comp = [13, 17, 18, 19, 22, 24][e - 1]
    larg = [1.3, 1.4, 1.6, 1.7, 2.1, 2.3][e - 1]
    lam = 'lamina' if e >= 6 else 'aco'
    c.add(lam, lambda p: np.maximum(sd_caixa(p - V(0, comp / 2 + 2.5, 0), (larg, comp / 2, 0.5), 0.3), p[:, 1] - comp - 2.5 + np.abs(p[:, 0]) * 1.8), empunha, grupo=21)
    c.add('ouro' if e >= 4 else 'ferro', lambda p: sd_caixa(p - V(0, 2.2, 0), (larg + 2.6, 0.8, 1.0), 0.5), empunha, grupo=22)
    c.add('couro', lambda p: sd_cone_redondo(p, V(0, 1.6, 0), V(0, -2.2, 0), 1.0, 1.0), empunha, grupo=23)
    c.add('ouro' if e >= 3 else 'ferro', lambda p: sd_esfera(p - V(0, -2.8, 0), 1.3), empunha, grupo=24)
    ombro_e = tronco_o.filho((-7.5 * po, 5 * pt_, 0.5), rz=-t.get('abre_e', 0.3), rx=t.get('ergue_e', -0.3))
    c.add(corpo_mat if e > 1 else 'tunica', lambda p: sd_cone_redondo(p, V(0, 0, 0), V(0, -6 * pb, 1.5), 2.6 * gr, 2.3 * gr), ombro_e, grupo=30)
    braco_e = ombro_e.filho((0, -6.5 * pb, 2.0), rx=t.get('dobra_e', -0.9))
    escudo = braco_e.filho((-1.8, -1.5, 3.0), rx=-(t.get('ergue_e', -0.3) + t.get('dobra_e', -0.9)) * 0.92, ry=-0.55 + t.get('escudo_giro', 0)).escalado(P['escudo'])
    if e == 1:  # redondo azul com aro e umbo dourados (como o original)
        c.add('brasao', lambda p: sd_elipsoide(p, (7.5, 7.5, 1.4)), escudo, grupo=31)
        c.add('ouro', lambda p: sd_toro((p - V(0, 0, 0.2))[:, [0, 2, 1]], 7.3, 0.9), escudo, grupo=32)
        c.add('ouro', lambda p: sd_esfera(p - V(0, 0, 1.2), 2.2), escudo, grupo=33)
    else:  # gota (kite) com cruz; heráldico no 5; radiante no 6
        alt = 11 if e < 5 else 12.5
        def gota(p, alt=alt):
            q = p.copy()
            larg = 7.2 - np.clip(-(q[:, 1]) / alt, 0, 1) * 5.6
            d2 = np.sqrt(q[:, 0] ** 2) - larg
            dy = np.abs(q[:, 1] + alt * 0.25) - alt * 0.75
            d = np.maximum(np.maximum(d2, dy), np.abs(q[:, 2]) - 1.1)
            return d - 0.4
        corpo_esc = 'brasao' if e < 6 else 'aco'
        c.add(corpo_esc, gota, escudo, grupo=31)
        c.add('ouro' if e >= 4 else 'ferro', lambda p: np.maximum(gota(p * V(1.0, 1.0, 1.0)) - 0.9, -(gota(p) + 0.1)) + np.where(np.abs(p[:, 2]) < 1.4, 0, 9), escudo, grupo=32)
        cruz_mat = 'ouro' if e >= 3 else 'pluma2'
        c.add(cruz_mat, lambda p: np.minimum(sd_caixa(p - V(0, -1, 1.25), (1.1, 6.5, 0.45), 0.2), sd_caixa(p - V(0, 1.5, 1.25), (4.6, 1.1, 0.45), 0.2)), escudo, grupo=33)
    if e >= 6:  # asas de luz atrás das costas
        for lado in (-1, 1):
            asa = tronco_o.filho((lado * 3 * po, 9 * pt_, -7), rz=lado * (0.15 + t.get('asas', 0)), ry=lado * 0.25)
            # leque de penas: cada pena sai da raiz em um ângulo, mais longas no meio
            for i in range(7):
                ang = 0.1 + i * 0.27
                comp = 13 + (3 - abs(i - 3)) * 3.2
                dx, dy = math.cos(ang) * comp, math.sin(ang) * comp
                c.add('luz', lambda p, dx=dx, dy=dy, lado=lado: sd_cone_redondo(p, V(0, 0, 0), V(lado * dx, dy, -1.5), 2.2, 1.1), asa, grupo=40 + lado, suave=1.0)
    return c


def suave(a, b, x):
    x = max(0.0, min(1.0, x))
    x = x * x * (3 - 2 * x)
    return a + (b - a) * x


def poses():
    a = {}
    a['parado'] = [{'resp': math.sin(i / 4 * 2 * math.pi), 'pluma': 0.3 * math.sin(i / 4 * 2 * math.pi), 'capa': 0.04 * math.sin(i / 2 * math.pi)} for i in range(4)]
    a['preparo'] = [{'tronco': -0.15 * f, 'ergue_d': suave(0.2, -2.3, f), 'dobra_d': suave(-0.6, -0.9, f), 'espada': suave(0.55, 0.3, f), 'agacha': -1.2 * f, 'pluma': 0.8 * f, 'giro': -0.15 * f} for f in (0.35, 0.7, 1.0)]
    g = []
    for f in (0.0, 0.45, 0.85, 1.0, 0.7, 0.35):
        g.append({'tronco': suave(-0.15, 0.32, f), 'ergue_d': suave(-2.3, 0.6, f), 'dobra_d': suave(-0.9, -0.2, f), 'espada': suave(0.5, 1.9, f),
                  'agacha': suave(-1.2, -2.2, f), 'x': 3 * f, 'giro': suave(-0.15, 0.25, f), 'pluma': suave(0.8, -0.6, f), 'capa': 0.25 * f})
    a['golpe'] = g
    a['dano'] = [{'tronco': -0.28 * f, 'cabeca': -0.25 * f, 'x': -2.5 * f, 'ergue_e': -0.9 * f, 'dobra_e': -1.3, 'pluma': 1.0 * f, 'capa': -0.2 * f} for f in (1.0, 0.65, 0.3)]
    a['derrota'] = [{'agacha': -4 * f, 'tronco': 0.55 * f, 'cabeca': 0.35 * f, 'perna_d': -1.0 * f, 'perna_e': 0.2 * f, 'ergue_d': 0.6 * f, 'espada': 0.55 + 1.2 * f, 'y': -1.5 * f, 'pluma': -0.8 * f} for f in (0.25, 0.5, 0.75, 0.95, 1.0)]
    a['vitoria'] = [{'ergue_d': suave(0.2, -2.9, f), 'dobra_d': suave(-0.6, 0.0, f), 'espada': suave(0.55, -0.2, f), 'cabeca': -0.15 * f, 'resp': f, 'pluma': 0.5 * f, 'asas': 0.2 * f} for f in (0.4, 0.8, 1.0, 0.9)]
    return a


MATS = materiais(ESTAGIO)


def configurar(est: int):
    global ESTAGIO, NOME, MATS
    ESTAGIO, NOME, MATS = est, f'heroi-{est}', materiais(est)
