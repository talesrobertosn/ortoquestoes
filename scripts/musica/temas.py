"""Composições originais da Cripta do Residente.

Melodias escritas à mão em notação compacta: "nota:duração" em tempos (beats),
com "r" para pausa e "|" separando compassos (só para leitura). Cada tema define
o andamento, a progressão de acordes e a orquestração por seção.
"""
from __future__ import annotations

import re

from sintese import (Mix, caixa, coro, cordas, cordas_staccato, crescendo_prato, finalizar, flauta, harpa, metais, piano,
                     prato, sino, taiko, timpano)

NOTAS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def m(nome: str) -> int:
    """'C#4' -> 61."""
    g = re.match(r'([A-G])([#b]?)(-?\d)', nome)
    base = NOTAS[g.group(1)] + (1 if g.group(2) == '#' else -1 if g.group(2) == 'b' else 0)
    return base + 12 * (int(g.group(3)) + 1)


def frase(texto: str):
    """Lista (tempo_inicial, duração, midi ou None) a partir da notação compacta."""
    t = 0.0
    out = []
    for tok in texto.replace('|', ' ').split():
        nota, dur = tok.split(':')
        d = float(dur)
        out.append((t, d, None if nota == 'r' else m(nota)))
        t += d
    return out


def acorde(nome: str, oit=3):
    """'Em', 'C', 'D', 'B', 'G/B'... devolve as três notas a partir da oitava dada."""
    raiz = nome[0] + (nome[1] if len(nome) > 1 and nome[1] in '#b' else '')
    resto = nome[len(raiz):]
    r = m(raiz + str(oit))
    if resto.startswith('m') and not resto.startswith('maj'):
        return [r, r + 3, r + 7]
    if resto == 'sus':
        return [r, r + 5, r + 7]
    if resto == 'dim':
        return [r, r + 3, r + 6]
    return [r, r + 4, r + 7]


class Tema:
    def __init__(self, bpm: float, compassos: int, tempos_por=4, cauda=3.0):
        self.bpm = bpm
        self.b = 60.0 / bpm
        self.dur = compassos * tempos_por * self.b
        self.mix = Mix(self.dur + cauda)

    def s(self, tempo: float) -> float:
        return tempo * self.b

    def nota(self, fn, inicio_tempo, dur_tempo=None, pan=0.0, ganho=1.0, **kw):
        sinal = fn(**kw) if dur_tempo is None else fn(dur=self.s(dur_tempo), **kw)
        self.mix.add(sinal, self.s(inicio_tempo), pan, ganho)

    def melodia(self, fn, texto, inicio=0.0, pan=0.0, ganho=1.0, transp=0, **kw):
        for t, d, n in frase(texto):
            if n is not None:
                self.mix.add(fn(n + transp, self.s(d) * 0.96, **kw), self.s(inicio + t), pan, ganho)


# ------------------------------------------------------------------ 1. Cripta (exploração)

def cripta():
    T = Tema(72, 16)
    prog = ['Dm', 'Dm', 'C', 'C', 'G', 'G', 'Am', 'Am', 'Dm', 'Dm', 'C', 'C', 'Bb', 'Bb', 'Asus', 'A']
    for i, a in enumerate(prog):
        notas = acorde(a, 2)
        if i % 2 == 0:
            for k, n in enumerate([notas[0], notas[2], notas[0] + 12]):
                T.mix.add(cordas(n, T.s(8) * 0.98, vel=0.32, brilho=1400, ataque=0.9), T.s(i * 4), [-0.4, 0.3, 0][k], 0.9)
        arp = [notas[0] + 12, notas[1] + 12, notas[2] + 12, notas[0] + 24, notas[2] + 12, notas[1] + 12, notas[2] + 12, notas[1] + 24]
        for k, n in enumerate(arp):
            T.mix.add(harpa(n, 2.2, 0.38 if k % 4 else 0.5), T.s(i * 4 + k * 0.5), 0.35, 0.8)
    T.melodia(flauta, 'D5:1.5 F5:.5 E5:1 D5:1 | C5:2 A4:2 | C5:1.5 E5:.5 D5:1 C5:1 | B4:2 G4:2 | '
                      'B4:1.5 D5:.5 C5:1 B4:1 | A4:1 G4:1 E4:2 | A4:1 C5:1 E5:1.5 D5:.5 | C5:2 A4:2', 0, -0.2, 0.9, vel=0.55)
    T.melodia(flauta, 'A5:1.5 G5:.5 F5:1 E5:1 | D5:2 F5:2 | E5:1.5 D5:.5 C5:1 E5:1 | G5:4 | '
                      'F5:1.5 E5:.5 D5:1 F5:1 | E5:1 D5:1 C5:2 | D5:1 E5:1 F5:1 G5:1 | E5:4', 32, -0.2, 0.9, vel=0.6)
    for i in range(8, 16, 2):
        for n in acorde(prog[i], 4):
            T.mix.add(coro(n, T.s(8) * 0.95, vel=0.22, vogal='o'), T.s(i * 4), 0.1, 0.8)
    for i in (0, 4, 8, 12):
        T.mix.add(sino(m('D6') if i % 8 == 0 else m('A5'), 4, 0.35, celesta=False), T.s(i * 4), 0.5, 0.6)
    return T, True


# ------------------------------------------------------------------ 2. Batalha comum

def batalha():
    T = Tema(132, 16)
    prog = ['Em', 'Em', 'C', 'C', 'D', 'D', 'B', 'B', 'Em', 'Em', 'C', 'C', 'Am', 'Am', 'B', 'B']
    for i, a in enumerate(prog):
        r, ter, qui = acorde(a, 2)
        padrao = [r, r, qui, r, r + 12, r, qui, r, r, r, qui, r, r + 12, qui, r + 12, qui]
        for k, n in enumerate(padrao):
            T.mix.add(cordas_staccato(n + 12, T.s(0.25), vel=0.55 if k % 4 else 0.75), T.s(i * 4 + k * 0.25), -0.25, 0.8)
        # metais graves marcando o compasso
        for n in (r, qui):
            T.mix.add(metais(n, T.s(1.2), vel=0.7, escuro=True), T.s(i * 4), 0.15, 0.7)
        T.mix.add(metais(r, T.s(0.5), vel=0.55, escuro=True), T.s(i * 4 + 2.5), 0.15, 0.6)
        # percussão
        T.mix.add(taiko(0.9), T.s(i * 4), 0, 0.9)
        T.mix.add(taiko(0.65), T.s(i * 4 + 2), 0, 0.8)
        T.mix.add(caixa(0.35), T.s(i * 4 + 1), 0.2, 0.6)
        T.mix.add(caixa(0.45), T.s(i * 4 + 3), 0.2, 0.6)
        if i % 4 == 3:
            for k in range(4):
                T.mix.add(taiko(0.5 + k * 0.1), T.s(i * 4 + 3 + k * 0.25), 0, 0.7)
        if i >= 8:  # pad de cordas na segunda metade
            for n in (r + 12, ter + 12, qui + 12):
                T.mix.add(cordas(n, T.s(4) * 0.97, vel=0.28, brilho=2000, ataque=0.3), T.s(i * 4), 0.3, 0.7)
    tema = ('B4:2 A4:1 G4:1 | B4:3 r:1 | G4:1.5 E4:.5 G4:1 A4:1 | C5:3 r:1 | '
            'A4:1.5 F#4:.5 A4:1 B4:1 | D5:2 C5:1 B4:1 | B4:1 A4:1 F#4:1 D#4:1 | F#4:3 r:1')
    T.melodia(metais, tema, 0, -0.1, 0.65, vel=0.75)
    T.melodia(metais, tema.replace('D#4', 'E4'), 32, -0.1, 0.75, vel=0.85)
    T.melodia(cordas, tema, 32, 0.3, 0.45, transp=12, vel=0.5, legato=True)
    T.mix.add(prato(0.5), 0, 0.4, 0.6)
    T.mix.add(crescendo_prato(T.s(4)), T.s(28), -0.3, 0.7)
    return T, True


# ------------------------------------------------------------------ 3. Elite

def elite():
    T = Tema(140, 16)
    prog = ['Fm', 'Fm', 'Db', 'Db', 'Eb', 'Eb', 'C', 'C', 'Fm', 'Db', 'Bbm', 'C', 'Fm', 'Db', 'Eb', 'C']
    for i, a in enumerate(prog):
        r, ter, qui = acorde(a, 3)
        for k in range(16):
            n = [r, qui, r + 12, qui][k % 4] if k % 8 < 6 else [ter, qui][k % 2]
            T.mix.add(cordas_staccato(n, T.s(0.25), vel=0.6), T.s(i * 4 + k * 0.25), -0.3, 0.75)
        for t, ac in ((0, 0.8), (1.5, 0.6), (2.5, 0.7)):
            for n in (r - 12, qui - 12, r):
                T.mix.add(metais(n, T.s(0.45), vel=ac, escuro=True), T.s(i * 4 + t), 0.2, 0.55)
        T.mix.add(taiko(0.95), T.s(i * 4), 0, 0.9)
        T.mix.add(taiko(0.6), T.s(i * 4 + 1.5), 0, 0.7)
        T.mix.add(taiko(0.8), T.s(i * 4 + 2), 0, 0.8)
        T.mix.add(caixa(0.5), T.s(i * 4 + 3), 0.2, 0.6)
        if i % 4 == 0:
            for n in (r + 12, ter + 12, qui + 12):
                T.mix.add(coro(n, T.s(2), vel=0.32, vogal='a'), T.s(i * 4), 0, 0.8)
    tema = ('C5:1 Ab4:.5 F4:.5 C5:1 Db5:1 | C5:3 r:1 | Bb4:1 G4:.5 Eb4:.5 Bb4:1 C5:1 | G4:3 r:1 | '
            'F5:1.5 Eb5:.5 Db5:1 C5:1 | Bb4:1.5 C5:.5 Db5:2 | Eb5:1 Db5:1 C5:1 Bb4:1 | C5:4')
    T.melodia(metais, tema, 0, -0.1, 0.6, vel=0.8)
    T.melodia(metais, tema, 32, -0.1, 0.7, vel=0.9)
    T.melodia(coro, tema, 32, 0.2, 0.35, transp=0, vel=0.35)
    T.mix.add(crescendo_prato(T.s(4)), T.s(28), 0.3, 0.7)
    return T, True


# ------------------------------------------------------------------ 4. Chefe

def chefe():
    T = Tema(144, 16)
    prog = ['Cm', 'Cm', 'Ab', 'Ab', 'Bb', 'Bb', 'G', 'G', 'Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'Bb', 'G']
    for i, a in enumerate(prog):
        r, ter, qui = acorde(a, 3)
        for k in range(16):
            n = [r - 12, r, qui - 12, r][k % 4]
            T.mix.add(cordas_staccato(n + 12, T.s(0.25), vel=0.62 if k % 4 else 0.85), T.s(i * 4 + k * 0.25), -0.3, 0.75)
        for n in (r, ter, qui, r + 12):
            T.mix.add(coro(n + 12, T.s(4) * 0.96, vel=0.3, vogal='a'), T.s(i * 4), 0.15, 0.75)
        T.mix.add(timpano(r - 12, 0.9), T.s(i * 4), 0, 0.85)
        T.mix.add(timpano(qui - 24, 0.75), T.s(i * 4 + 2), 0, 0.8)
        T.mix.add(taiko(0.8), T.s(i * 4 + 1), 0, 0.7)
        T.mix.add(taiko(0.8), T.s(i * 4 + 3), 0, 0.7)
        T.mix.add(caixa(0.4), T.s(i * 4 + 3.5), 0.2, 0.5)
        if i in (7, 15):
            for k in range(8):
                T.mix.add(timpano(r - 12, 0.4 + k * 0.07, 0.6), T.s(i * 4 + 2 + k * 0.25), 0, 0.7)
    tema = ('G4:1 C5:1 D5:1 Eb5:1 | D5:2 C5:1 G4:1 | Ab4:1 C5:1 Eb5:1 F5:1 | Eb5:2 D5:1 C5:1 | '
            'D5:1 F5:1 G5:1.5 F5:.5 | Eb5:1 D5:1 Bb4:2 | B4:1 D5:1 F5:1 Ab5:1 | G5:4')
    T.melodia(metais, tema, 0, -0.15, 0.7, vel=0.85)
    T.melodia(metais, tema, 32, -0.15, 0.8, vel=0.95)
    T.melodia(metais, tema, 32, 0.25, 0.5, transp=-12, vel=0.8, escuro=True)
    T.mix.add(prato(0.6), 0, 0.4, 0.7)
    T.mix.add(crescendo_prato(T.s(4)), T.s(28), -0.3, 0.8)
    T.mix.add(prato(0.7), T.s(32), 0.4, 0.7)
    return T, True


# ------------------------------------------------------------------ 5. Dragão

def dragao():
    T = Tema(150, 16)
    prog = ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'A', 'A', 'Dm', 'Eb', 'Dm', 'A', 'Dm', 'Eb', 'Gm', 'A']
    for i, a in enumerate(prog):
        r, ter, qui = acorde(a, 2)
        for k in range(16):
            n = [r, r + 12, r, ter + 12][k % 4] if k < 12 else [qui, qui + 12][k % 2]
            T.mix.add(cordas_staccato(n + 12, T.s(0.25), vel=0.6), T.s(i * 4 + k * 0.25), -0.35, 0.75)
        # o trítono do dragão nos metais graves
        T.mix.add(metais(r, T.s(1.5), vel=0.8, escuro=True), T.s(i * 4), 0.2, 0.75)
        T.mix.add(metais(r + 6, T.s(1.0), vel=0.7, escuro=True), T.s(i * 4 + 2), 0.2, 0.6)
        for n in (r + 12, ter + 12, qui + 12):
            T.mix.add(coro(n + 12, T.s(4) * 0.96, vel=0.28, vogal='o'), T.s(i * 4), 0, 0.8)
        T.mix.add(taiko(1.0), T.s(i * 4), 0, 0.95)
        T.mix.add(taiko(0.7), T.s(i * 4 + 0.75), 0, 0.7)
        T.mix.add(taiko(0.9), T.s(i * 4 + 2), 0, 0.85)
        T.mix.add(timpano(r, 0.7), T.s(i * 4 + 3), 0, 0.7)
    tema = ('D5:1 A4:1 Bb4:1 C#5:1 | D5:2 r:1 A4:1 | Bb4:1 F4:1 G4:1 A4:1 | C#5:3 r:1 | '
            'F5:1 E5:1 D5:1 C#5:1 | Eb5:2 D5:2 | G5:1 F5:1 E5:1 C#5:1 | D5:4')
    T.melodia(metais, tema, 0, -0.15, 0.65, vel=0.85)
    T.melodia(metais, tema, 32, -0.15, 0.75, vel=0.95)
    T.melodia(cordas, tema, 32, 0.3, 0.45, transp=12, vel=0.55, legato=True)
    T.mix.add(crescendo_prato(T.s(4)), T.s(28), 0.3, 0.8)
    return T, True


# ------------------------------------------------------------------ 6-8. Fanfarras

def vitoria():
    T = Tema(112, 3, cauda=3.5)
    T.melodia(metais, 'A4:.5 A4:.5 A4:.5 D5:1.5 | F#5:1 E5:.5 F#5:.5 A5:4', 0, -0.1, 0.8, vel=0.9)
    T.melodia(metais, 'F#4:.5 F#4:.5 F#4:.5 A4:1.5 | D5:1 C#5:.5 D5:.5 F#5:4', 0, 0.2, 0.6, vel=0.75)
    for n in (m('D3'), m('A3'), m('D4'), m('F#4')):
        T.mix.add(cordas(n, T.s(6), vel=0.45, ataque=0.05), T.s(3), 0.3, 0.8)
    for k in range(8):
        T.mix.add(timpano(m('D2'), 0.4 + k * 0.06, 0.5), T.s(2 + k * 0.125), 0, 0.7)
    T.mix.add(timpano(m('D2'), 1.0), T.s(3), 0, 0.9)
    T.mix.add(prato(0.7, 3), T.s(3), 0.3, 0.7)
    T.mix.add(sino(m('D6'), 3, 0.5), T.s(3), 0.5, 0.6)
    return T, False


def derrota():
    T = Tema(56, 2, cauda=4)
    T.melodia(cordas, 'D4:1 C4:1 Bb3:1 A3:3', 0, -0.1, 0.9, vel=0.55, brilho=1400, legato=True)
    for n in (m('D2'), m('A2')):
        T.mix.add(cordas(n, T.s(6), vel=0.35, brilho=900, ataque=0.5), 0, 0.2, 0.8)
    for k, n in enumerate((m('D4'), m('F4'), m('A4'), m('D5'))):
        T.mix.add(harpa(n, 3, 0.35), T.s(3 + k * 0.33), 0.4, 0.7)
    T.mix.add(piano(m('D2'), 4, 0.6), T.s(3), 0, 0.8)
    return T, False


def recompensa():
    T = Tema(100, 2, cauda=3)
    for k, n in enumerate([m(x) for x in ('G3', 'B3', 'D4', 'G4', 'B4', 'D5', 'G5', 'B5')]):
        T.mix.add(harpa(n, 2.5, 0.45), T.s(k * 0.16), 0.3, 0.8)
    for k, n in enumerate([m(x) for x in ('G5', 'B5', 'D6', 'G6')]):
        T.mix.add(sino(n, 2.5, 0.45), T.s(1.4 + k * 0.33), -0.3, 0.7)
    for n in (m('G3'), m('D4'), m('B4')):
        T.mix.add(cordas(n, T.s(4), vel=0.35, ataque=0.25), T.s(1.2), 0, 0.7)
    return T, False


# ------------------------------------------------------------------ 9. Biblioteca

def biblioteca():
    """Página ao Sol: melodia original, acústica e leve, para estudo sem combate."""
    T = Tema(88, 24)
    prog = ['G', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D'] * 3
    for i, a in enumerate(prog):
        r, ter, qui = acorde(a, 3)
        T.mix.add(piano(r - 12, T.s(2.8), 0.28), T.s(i * 4), -0.25, 0.55)
        for k, n in enumerate((r, qui, ter + 12, qui, r + 12, ter + 12)):
            T.mix.add(harpa(n, T.s(1.4), 0.30), T.s(i * 4 + k * 0.5), 0.3, 0.55)
        if i >= 8:
            for n in (r,ter,qui):
                T.mix.add(cordas(n+12,T.s(3.9),vel=0.12,brilho=1200,ataque=0.8),T.s(i*4),-0.4,0.35)
    melodia = ('B4:1 D5:.5 E5:.5 D5:1 G4:1 | E5:1.5 D5:.5 C5:1 G4:1 | '
               'B4:.5 A4:.5 G4:1 D5:1 B4:1 | A4:1 F#4:1 G4:1 r:1 | '
               'G4:1 B4:.5 D5:.5 E5:1 B4:1 | G4:1 E5:1 D5:.5 C5:.5 G4:1 | '
               'A4:1 C5:1 B4:.5 A4:.5 G4:1 | F#4:1 A4:1 G4:1 r:1')
    T.melodia(flauta,melodia,0,-0.1,0.50,vel=0.4)
    T.melodia(piano,melodia,32,0.1,0.45,vel=0.35)
    T.melodia(flauta,melodia,64,-0.15,0.55,vel=0.42)
    for i in (1,5,9,13,17,21):
        T.mix.add(sino(m('G5'),T.s(1),0.1),T.s(i*4+3),0.5,0.25)
    return T, True


# ------------------------------------------------------------------ 10. Torre

def torre():
    T = Tema(116, 16)
    prog = ['Eb', 'Eb', 'Bb', 'Bb', 'Cm', 'Cm', 'Ab', 'Ab', 'Eb', 'Bb', 'Ab', 'F', 'Eb', 'Bb', 'Ab', 'Bb']
    for i, a in enumerate(prog):
        r, ter, qui = acorde(a, 3)
        for k in range(8):
            n = [r, qui, r + 12, ter + 12][k % 4]
            T.mix.add(cordas_staccato(n, T.s(0.5), vel=0.5), T.s(i * 4 + k * 0.5), -0.3, 0.75)
        for n in (r - 12, qui - 12):
            T.mix.add(cordas(n, T.s(4) * 0.97, vel=0.32, brilho=1300, ataque=0.2), T.s(i * 4), 0.25, 0.8)
        T.mix.add(taiko(0.7), T.s(i * 4), 0, 0.75)
        T.mix.add(taiko(0.5), T.s(i * 4 + 2.5), 0, 0.6)
        if i >= 8:
            for n in (r + 12, ter + 12, qui + 12):
                T.mix.add(coro(n, T.s(4) * 0.96, vel=0.22, vogal='a'), T.s(i * 4), 0.1, 0.7)
    tema = ('Bb4:1.5 Eb5:.5 F5:1 G5:1 | F5:2 D5:2 | Eb5:1.5 G5:.5 Bb5:1 G5:1 | Ab5:3 r:1 | '
            'G5:1.5 F5:.5 Eb5:1 G5:1 | F5:1 Eb5:1 C5:2 | Eb5:1 F5:1 A5:1 C6:1 | Bb5:4')
    T.melodia(metais, tema, 0, -0.1, 0.6, transp=-12, vel=0.75, escuro=True)
    T.melodia(metais, tema, 32, -0.1, 0.65, transp=-12, vel=0.85)
    T.melodia(cordas, tema, 32, 0.3, 0.45, vel=0.45, legato=True)
    T.mix.add(crescendo_prato(T.s(4)), T.s(28), 0.3, 0.6)
    return T, True


# ------------------------------------------------------------------ 11. Floresta das Fises (andar 1)

def floresta():
    """Pastoral em 3/4, Ré maior: harpa em arpejo, flauta cantando, cordas de fundo e sinos de folha."""
    T = Tema(88, 16, tempos_por=3)
    prog = ['D', 'D', 'Bm', 'Bm', 'G', 'G', 'A', 'A', 'D', 'F#m', 'G', 'D', 'Em', 'G', 'Asus', 'A']
    for i, a in enumerate(prog):
        r, ter, qui = acorde(a, 3)
        for k, n in enumerate((r - 12, qui - 12, ter, qui, r + 12, qui)):
            T.mix.add(harpa(n, 2.4, 0.42 if k else 0.55), T.s(i * 3 + k * 0.5), -0.3, 0.8)
        if i % 2 == 0:
            for n in (r, ter, qui):
                T.mix.add(cordas(n + 12, T.s(6) * 0.97, vel=0.16, brilho=1500, ataque=1.1), T.s(i * 3), 0.3, 0.7)
    tema = ('F#5:1 A5:1 F#5:1 | E5:2 D5:1 | D5:1 F#5:1 E5:1 | C#5:3 | '
            'B4:1 D5:1 G5:1 | F#5:2 E5:1 | E5:1 D5:1 C#5:1 | A4:3 | '
            'F#5:1 A5:1 D6:1 | C#6:2 A5:1 | B5:1 A5:1 G5:1 | F#5:3 | '
            'G5:1 F#5:1 E5:1 | D5:1 E5:1 F#5:1 | E5:2 D5:1 | E5:3')
    T.melodia(flauta, tema, 0, 0.15, 0.85, vel=0.5)
    for i in (0, 4, 8, 12):
        T.mix.add(sino(m('A6') if i % 8 == 0 else m('F#6'), 3, 0.22), T.s(i * 3 + 2), 0.55, 0.5)
    return T, True


# ------------------------------------------------------------------ 12. Masmorra

def masmorra():
    """Lá menor sombrio: cordas graves em ostinato, tímpano espaçado, piano que pinga como goteira e um tema de metais abafados."""
    T = Tema(96, 16)
    prog = ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E', 'Am', 'Am', 'F', 'F', 'Dm', 'E', 'Am', 'E']
    for i, a in enumerate(prog):
        r, ter, qui = acorde(a, 2)
        for k in range(8):
            n = [r, r, qui, r, r + 12, r, qui, ter][k]
            T.mix.add(cordas_staccato(n, T.s(0.5), vel=0.42 if k % 2 else 0.55), T.s(i * 4 + k * 0.5), -0.25, 0.75)
        T.mix.add(cordas(r - 12 + 24, T.s(4) * 0.96, vel=0.22, brilho=900, ataque=0.6), T.s(i * 4), 0.2, 0.7)
        if i % 2 == 0:
            T.mix.add(timpano(r + 12, 0.6), T.s(i * 4), 0, 0.7)
        if i % 4 == 2:  # goteira
            T.mix.add(piano(qui + 36, 1.6, 0.22), T.s(i * 4 + 1.5), 0.5, 0.5)
            T.mix.add(piano(r + 36, 1.6, 0.18), T.s(i * 4 + 3.25), 0.5, 0.45)
    tema = ('E4:1.5 A4:.5 C5:1 B4:1 | A4:2 E4:2 | F4:1.5 A4:.5 D5:1 C5:1 | B4:3 r:1 | '
            'A4:1.5 C5:.5 E5:1 D5:1 | C5:1 B4:1 A4:2 | D5:1 C5:1 B4:1 G#4:1 | A4:3 r:1')
    T.melodia(metais, tema, 0, -0.1, 0.5, vel=0.6, escuro=True)
    T.melodia(cordas, tema, 32, 0.25, 0.42, transp=12, vel=0.42, legato=True)
    for i in range(16):
        T.mix.add(taiko(0.35), T.s(i * 4 + 3), 0, 0.5)
    return T, True


# ------------------------------------------------------------------ 13. Covil do Dragão (adversários do covil, fora o chefe)

def covil():
    """Dó menor pesado: taikos, metais graves em quintas, coro abafado e cromatismo que sobe como calor."""
    T = Tema(108, 16)
    prog = ['Cm', 'Cm', 'Ab', 'Ab', 'Fm', 'Fm', 'G', 'G', 'Cm', 'Cm', 'Db', 'Db', 'Ab', 'Fm', 'G', 'G']
    for i, a in enumerate(prog):
        r, ter, qui = acorde(a, 2)
        for n in (r, qui):
            T.mix.add(metais(n, T.s(1.6), vel=0.72, escuro=True), T.s(i * 4), 0.1, 0.75)
        T.mix.add(metais(r, T.s(0.6), vel=0.6, escuro=True), T.s(i * 4 + 2.5), 0.1, 0.65)
        T.mix.add(taiko(0.95), T.s(i * 4), 0, 0.95)
        T.mix.add(taiko(0.6), T.s(i * 4 + 1.5), 0, 0.7)
        T.mix.add(taiko(0.75), T.s(i * 4 + 2), 0, 0.8)
        for k in range(8):
            T.mix.add(cordas_staccato(r + 12 + (k % 4 == 3), T.s(0.5), vel=0.5), T.s(i * 4 + k * 0.5), -0.3, 0.7)
        if i >= 8:
            for n in (r + 12, ter + 12, qui + 12):
                T.mix.add(coro(n, T.s(4) * 0.96, vel=0.24, vogal='o'), T.s(i * 4), 0.15, 0.75)
    tema = ('G4:1 C5:1 Eb5:1 D5:1 | C5:2 G4:2 | Ab4:1 C5:1 F5:1 Eb5:1 | D5:3 r:1 | '
            'G5:1.5 F5:.5 Eb5:1 D5:1 | Eb5:1 D5:1 C5:2 | Db5:1 C5:1 B4:1 D5:1 | C5:3 r:1')
    T.melodia(metais, tema, 0, -0.1, 0.6, vel=0.78)
    T.melodia(cordas, tema, 32, 0.3, 0.45, transp=12, vel=0.48, legato=True)
    T.mix.add(crescendo_prato(T.s(4)), T.s(28), -0.3, 0.7)
    return T, True


# ------------------------------------------------------------------ 14. Salas (loja, Preceptor, ferreiro, curandeira, baú)

def sala():
    """Taverna calma em Sol maior: harpa como alaúde, piano leve e flauta; descanso entre os andares."""
    T = Tema(84, 16)
    prog = ['G', 'G', 'Em', 'Em', 'C', 'D', 'G', 'D', 'G', 'Bm', 'C', 'G', 'Am', 'D', 'G', 'G']
    for i, a in enumerate(prog):
        r, ter, qui = acorde(a, 3)
        for k, n in enumerate((r - 12, qui - 12, r, ter, qui, ter, r, qui - 12)):
            T.mix.add(harpa(n, 1.6, 0.4 if k % 2 else 0.5), T.s(i * 4 + k * 0.5), -0.25, 0.75)
        T.mix.add(piano(r - 12, 3, 0.3), T.s(i * 4), 0.1, 0.6)
    tema = ('B4:1 D5:1 G5:1.5 F#5:.5 | E5:2 D5:2 | C5:1 E5:1 G5:1 E5:1 | D5:3 r:1 | '
            'B4:1 D5:1 G5:1 B5:1 | A5:2 G5:2 | E5:1 F#5:1 G5:1 A5:1 | G5:3 r:1')
    T.melodia(flauta, tema, 0, 0.15, 0.7, vel=0.48)
    T.melodia(piano, tema, 32, 0.15, 0.5, vel=0.42)
    return T, True


TEMAS = {'cripta': cripta, 'batalha': batalha, 'elite': elite, 'chefe': chefe, 'dragao': dragao,
         'vitoria': vitoria, 'derrota': derrota, 'recompensa': recompensa, 'biblioteca': biblioteca, 'torre': torre,
         'floresta': floresta, 'masmorra': masmorra, 'covil': covil, 'sala': sala}
