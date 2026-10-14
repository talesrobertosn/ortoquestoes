#!/usr/bin/env python3
"""Livro em pixel art autoral para a estante da sessão, sem anatomia."""
from pathlib import Path
import numpy as np
from pintor import Tela, rampa, fbm

if __name__ == '__main__':
    t = Tela(24, 28)
    x, y = t.x, t.y
    corpo = (x >= 4) & (x <= 19) & (y >= 3) & (y <= 25)
    t.cor(corpo, '#20352f')
    t.tingir(corpo & (x > 5) & (x < 19) & (y > 3) & (y < 25), np.clip(.35 + .4*(1-x/24) + .1*fbm(x/4, y/4, 2, 9), 0, .99), rampa(['#255344','#427765','#6ca98a','#9bc2a1']))
    t.cor((x == 6) & (y > 4) & (y < 23), '#c4a463')
    t.cor((x > 6) & (x < 18) & ((y == 6) | (y == 22)), '#d3b978')
    t.cor((x > 7) & (x < 18) & (y > 23) & (y < 26), '#e6d5a1')
    t.cor((abs(x-12)+abs(y-14) <= 3), '#d5b463')
    t.cor((x == 12) & (y == 13), '#fff0b1')
    p = Path(__file__).resolve().parents[2]/'public/flashcards/interface/livro-sessao.png'
    t.salvar(p)
