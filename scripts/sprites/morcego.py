#!/usr/bin/env python3
"""Morcego do Túnel do Carpo em pixel art detalhada (15/10/2026).

Estilo detalhado de muitos tons (docs/flashcards/MONSTROS-NOVOS.md, refs. 1 e 4): pelo castanho
felpudo, orelhas enormes, olhos vermelhos acesos, presinhas e asas de membrana roxa esticadas entre
os dedos. O toque ortopédico: no punho de cada asa há uma pulseira dourada apertada, o "túnel do
carpo", que brilha quando ele ataca. Paira no ar (a sombra fica no chão); mergulha no golpe e cai
rodopiando na derrota. Fantasia, sem anatomia.

Usa as ferramentas do cavaleiro chibi (como a aranha e o goblin). Olha para a esquerda (para o herói).

    python3 scripts/sprites/morcego.py                    # grava morcego em public/flashcards/sprites/
    python3 scripts/sprites/morcego.py --previa x.png     # prévia ampliada (--anim golpe, --escala 4)
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import cavaleiro_chibi as cc  # noqa: E402
from motor import gravar_folha  # noqa: E402

NOVAS = {
    'pelo': ['#140a06', '#26140c', '#3c2214', '#56341e', '#74482a', '#946238', '#b8844e', '#dcae74'],
    'pelo_t': ['#100804', '#1e1008', '#301a0e', '#462816', '#5e3820'],
    'membrana_m': ['#140a1c', '#24122e', '#381c46', '#4e2a60', '#68397c', '#86509a', '#a874ba'],
    'dedo': ['#1a0e14', '#301a24', '#4a2a38', '#6a4050', '#8e5c6c'],
    'orelha_m': ['#3a1418', '#5e2228', '#86363a', '#ae5450', '#d07a6c'],
    'pulseira': ['#3a210d', '#663b12', '#9c6119', '#cf9128', '#eebd47', '#fff0a0'],
    'olho_m': ['#3a0204', '#7a0a0a', '#d0201a', '#ff5a3c', '#ffd0b8'],
    'presa_m': ['#8a8070', '#c8c0ac', '#f2ecdc', '#ffffff'],
    'oco': ['#060308', '#120a16', '#1e1224'],
}
for _k, _v in NOVAS.items():
    cc.RAMPAS[_k] = np.array([cc.hx(c) for c in _v], np.uint8)
cc.NOMES = list(cc.RAMPAS)
cc.TOPO = np.array([len(cc.RAMPAS[n]) - 1 for n in cc.NOMES])
cc.CONTORNO = {k: (np.array(v[0], float) * 0.6).astype(np.uint8) for k, v in cc.RAMPAS.items()}

from cavaleiro_chibi import (  # noqa: E402
    Quadro, cheio, estrela, m_capsula, m_elipse, m_poli, mistura, n_capsula, n_esfera, ponto, suave, tons,
)

W, H = 172, 116
X0, PE = 86, 101
ANCORA = (X0, PE)
cc.W, cc.H = W, H
cc.YY, cc.XX = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
cc.DITHER = cc.BAYER[(cc.YY.astype(int)) % 2, (cc.XX.astype(int)) % 2]
XX, YY = cc.XX, cc.YY

DESTINO = cc.DESTINO


def quadro(t: dict) -> np.ndarray:
    k = t.get
    q = Quadro()
    dx, dy = k('x', 0), k('y', 0)
    bate = k('bate', 0.0)             # -1 asas lá em cima, +1 asas lá embaixo
    cai = k('cai', 0.0)               # derrota: despenca até o chão
    c = np.array([X0 + dx, 66 + dy + cai * 18])  # paira mais baixo: a caixa do quadro fica menor e o morcego aparece maior

    # ================= asa (membrana entre os dedos, a partir do punho com a pulseira)
    def asa(lado, z, escuro):
        g = q.novo_grupo()
        omb = c + np.array([lado * 6, -4])
        ang_b = (-0.55 + bate * 0.9 + cai * 0.6) if lado > 0 else (-0.55 + bate * 0.9 + cai * 0.6)
        dirx = lado
        punho = omb + np.array([dirx * 18 * math.cos(ang_b), 18 * math.sin(ang_b)])
        dedos = []
        for i, (a, comp) in enumerate(((-0.95, 24), (-0.2, 28), (0.55, 25), (1.3, 19))):
            aa = ang_b + a * (1 - 0.25 * abs(bate))
            dedos.append(punho + np.array([dirx * comp * math.cos(aa), comp * math.sin(aa)]))
        # membrana com a borda recortada em arcos entre os dedos
        contorno = [omb, punho, dedos[0]]
        for a_, b_ in zip(dedos, dedos[1:]):
            meio = (a_ + b_) / 2
            contorno += [meio + (punho - meio) * 0.28, b_]
        contorno += [c + np.array([lado * 4, 10])]
        mat = 'membrana_m'
        m = m_poli(contorno)
        N = n_esfera(punho + (-3, -4), 30, 26, 0.5)
        q.peca(m, mat, tons(N, mat, base=-0.08 if escuro else 0.0, pano=True), z, g)
        # ossinhos dos dedos e do braço
        q.peca(m_capsula(omb, punho, 2.2, 1.8), 'dedo', tons(n_capsula(omb, punho, 2.2, 1.8), 'dedo'), z + 0.02, g)
        for d in dedos:
            q.peca(m_capsula(punho, d, 1.2, 0.5), 'dedo', cheio(3 - escuro), z + 0.01, g)
        # garrinha do polegar e a pulseira do "túnel do carpo"
        q.peca(m_capsula(punho, punho + np.array([dirx * -1, -4]), 1.0, 0.3), 'presa_m', cheio(1), z + 0.03, g, enfeite=True)
        q.peca(m_elipse(punho, 2.8, 2.8), 'pulseira', tons(n_esfera(punho + (-1, -1), 2.8, 2.8), 'pulseira', metal=True), z + 0.04, g)
        q.peca(m_elipse(punho, 1.1, 1.1), 'dedo', cheio(1), z + 0.05, g, enfeite=True)
        return punho

    punho_t = asa(1, 1.0, 1)

    # ================= corpo felpudo
    gc = q.novo_grupo()
    corpo = m_elipse(c + (1, 4), 11.5, 13.5)
    q.peca(corpo, 'pelo', tons(n_esfera(c + (-3, 0), 12, 14, 0.85), 'pelo', pano=True, base=0.03), 3.0, gc)
    for j in range(7):   # tufos de pelo
        a = j / 7 * 2 * math.pi
        p = c + (1, 4) + np.array([math.cos(a) * 9.5, math.sin(a) * 11.5])
        q.peca(m_poli([p + (-1.6, 0), p + np.array([math.cos(a) * 3.2, math.sin(a) * 3.2]), p + (1.6, 0.4)]), 'pelo', cheio(3 + (j % 2)), 2.99, gc)
    q.peca(m_elipse(c + (-1, 7), 5, 6) & corpo, 'pelo', cheio(6), 3.01, gc, enfeite=True)   # peito claro
    # perninhas penduradas
    for s in (-1, 1):
        a0 = c + (s * 4, 15)
        q.peca(m_capsula(a0, a0 + (s * 1.5 + 2, 6), 1.3, 0.9), 'dedo', cheio(2), 2.9, gc)
        q.peca(m_capsula(a0 + (s * 1.5 + 2, 6), a0 + (s * 1.5, 8), 0.7), 'presa_m', cheio(1), 2.91, gc, enfeite=True)

    # ================= cabeça com orelhas enormes
    gh = q.novo_grupo()
    cab = c + (-3, -11 + cai * 2)
    for s, z in ((1, 3.9), (-1, 4.15)):
        base = cab + (s * 4.5 - 1, -5)
        pon = base + np.array([s * 6 - 2, -14 + k('orelhas', 0) * 2])
        m = m_poli([base + (-3.5, 2), pon, base + (3.5, 2)])
        q.peca(m, 'pelo_t' if s > 0 else 'pelo', tons(n_esfera(base + (-2, -6), 6, 10, 0.7), 'pelo_t' if s > 0 else 'pelo', base=0.05), z, gh)
        q.peca(m_poli([base + (-1.8, 1), pon + (0.3 * s, 3.5), base + (1.8, 1)]) & m, 'orelha_m', tons(n_esfera(base + (0, -4), 4, 8), 'orelha_m'), z + 0.01, gh, enfeite=True)
    q.peca(m_elipse(cab, 8.5, 7.5), 'pelo', tons(n_esfera(cab + (-3, -3), 9, 8, 0.8), 'pelo', base=0.06), 4.0, gh)
    # focinho achatado
    fz = cab + (-6, 2)
    q.peca(m_elipse(fz, 3.6, 2.8), 'orelha_m', tons(n_esfera(fz + (-1, -1), 3.6, 2.8), 'orelha_m', base=0.05), 4.05, gh)
    q.peca(ponto(fz[0] - 2, fz[1] - 0.5) | ponto(fz[0] - 0.5, fz[1] - 0.5), 'oco', cheio(1), 4.06, gh, enfeite=True)
    # boca com presas
    boca = k('boca', 0.15)
    bc = cab + (-3, 5)
    if boca > 0.3:
        q.peca(m_elipse(bc, 3.2, 1.2 + boca * 2), 'oco', cheio(2), 4.07, gh, enfeite=True)
    for s in (-1, 1):
        px = bc[0] + s * 1.6
        q.peca(m_poli([(px - 0.8, bc[1] - 0.6), (px + 0.8, bc[1] - 0.6), (px, bc[1] + 2.4 + boca)]), 'presa_m', cheio(2), 4.08, gh, enfeite=True)
    olhos = []
    for (ox, oy, r) in ((-5.5, -1.8, 1.9), (0.5, -2.2, 2.3)):
        oc = cab + (ox, oy)
        if k('olhos_x'):
            q.peca(m_capsula(oc + (-1.4, -1.4), oc + (1.4, 1.4), 0.5) | m_capsula(oc + (-1.4, 1.4), oc + (1.4, -1.4), 0.5), 'oco', cheio(0), 4.1, gh, enfeite=True)
        elif k('fecha'):
            q.peca(m_capsula(oc + (-1.8, 0.3), oc + (1.8, -0.2), 0.5), 'oco', cheio(0), 4.1, gh, enfeite=True)
        else:
            q.peca(m_elipse(oc, r, r), 'olho_m', np.where(YY < oc[1], 3, 2).astype(np.int16), 4.1, gh, enfeite=True)
            olhos.append((oc, r))

    asa(-1, 6.0, 0)

    rgba = q.final()
    brilho = k('brilho', 1.0)
    for oc, r in olhos:
        mistura(rgba, m_elipse(oc, r + 1.6, r + 1.6) & (rgba[..., 3] > 0) & ~m_elipse(oc, r, r), (255, 70, 50), 0.2 * brilho)
        mistura(rgba, ponto(oc[0] - 0.6, oc[1] - 0.6), (255, 255, 240), 1.0)
    # sombra no chão (some quando ele cai)
    if cai < 0.9:
        mistura(rgba, m_elipse((c[0] + 1, PE - 1), 14 - cai * 4, 2.2) & (rgba[..., 3] == 0), (20, 14, 24), 0.4)
    # ondas de eco no preparo
    if k('eco'):
        for j in range(3):
            rr = np.hypot(XX - (cab[0] - 6), YY - cab[1])
            ang = np.arctan2(YY - cab[1], XX - (cab[0] - 6))
            m = (np.abs(rr - (8 + j * 6 + k('eco') * 3)) < 0.7) & (np.abs(np.abs(ang) - math.pi) < 0.5) & (rgba[..., 3] == 0)
            mistura(rgba, m, (230, 200, 255), 0.6 - j * 0.15)
    if k('brilha_pulso'):
        for p in (punho_t,):
            estrela(rgba, p, 3, (255, 230, 140), 0.9)
    for (fx_, fy_, tm) in (k('cintilas') or []):
        estrela(rgba, (fx_, fy_), tm, (230, 190, 255), 1.0)
    return rgba


def poses():
    a = {}
    # o 1º quadro define a caixa (e a escala no jogo): asas abertas na horizontal, não erguidas
    a['parado'] = [{'bate': b, 'y': y} for b, y in ((0.0, 2), (0.7, 3), (0.0, 1), (-0.6, 0))]
    a['preparo'] = [{'bate': -0.9 * f, 'y': -6 * f, 'x': 4 * f, 'boca': 0.3 + 0.6 * f, 'eco': f if f > 0.5 else 0, 'orelhas': f} for f in (0.35, 0.7, 1.0)]
    g = []
    for i, f in enumerate((0.0, 0.3, 0.6, 1.0, 0.85, 0.55)):
        s = min(1.0, f / 0.6)
        g.append({'x': -24 * s, 'y': suave(-6, 14, s) if i < 4 else 8, 'bate': (-0.9, 0.2, 1.0, 1.0, 0.0, -0.6)[i], 'boca': 1.0 if i in (2, 3) else 0.5,
                  'brilha_pulso': i in (2, 3), 'brilho': 1.4})
    a['golpe'] = g
    a['dano'] = [{'x': 6 * f, 'y': -4 * f, 'bate': -0.8 * f, 'boca': 0.6, 'fecha': f > 0.5, 'brilho': 0.3} for f in (1.0, 0.6, 0.25)]
    a['derrota'] = [{'cai': f, 'bate': (0.9, -0.4, 0.9, 0.3, 0.6)[i], 'olhos_x': f > 0.4, 'boca': 0.4} for i, f in enumerate((0.15, 0.4, 0.7, 0.92, 1.0))]
    v = []
    for f, cint in ((0.5, None), (1.0, [(X0 - 40, 20, 2)]), (0.8, [(X0 - 44, 14, 3), (X0 + 34, 18, 2)]), (0.5, [(X0 + 30, 22, 2)])):
        v.append({'bate': -1.0 * f, 'y': -6 * f, 'boca': 0.4 + 0.6 * f, 'orelhas': f, 'brilha_pulso': f > 0.7, 'cintilas': cint})
    a['vitoria'] = v
    return a


TEMPOS = {'parado': 150, 'preparo': 95, 'golpe': 65, 'dano': 85, 'derrota': 120, 'vitoria': 130}


def principal() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--previa')
    ap.add_argument('--anim', default='parado')
    ap.add_argument('--escala', type=int, default=4)
    ap.add_argument('--fundo', default='#5a6474')
    a = ap.parse_args()
    if a.previa:
        nomes = a.anim.split(',')
        P_ = poses()
        cols = max(len(P_[nm]) for nm in nomes)
        img = Image.new('RGBA', (W * cols, H * len(nomes)), cc.hx(a.fundo) + (255,))
        for nj, nm in enumerate(nomes):
            for ci, pz in enumerate(P_[nm]):
                img.alpha_composite(Image.fromarray(quadro(pz), 'RGBA'), (ci * W, nj * H))
        img.resize((img.width * a.escala, img.height * a.escala), Image.NEAREST).save(a.previa)
        print('prévia:', a.previa)
        return 0
    quadros = {nome: [quadro(p) for p in v] for nome, v in poses().items()}
    _, meta = gravar_folha('morcego', quadros, TEMPOS, DESTINO, ANCORA)
    print('gravado morcego', meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
