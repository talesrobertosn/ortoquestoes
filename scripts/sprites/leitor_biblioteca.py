#!/usr/bin/env python3
"""Leitor de fantasia: manto e livro, sem figura anatômica ou combate."""
from pathlib import Path
import numpy as np
from PIL import Image

def pintar():
    a=np.zeros((40,24,4),np.uint8);y,x=np.mgrid[:40,:24]
    def cor(m,c,alfa=255):a[m]=tuple(int(c[i:i+2],16) for i in (1,3,5))+(alfa,)
    manto=((x-12)**2/49+(y-16)**2/225<1)&(y>10)
    manto|=(abs(x-12)<8)&(y>=17)&(y<31+np.sin(x*.9)*2)
    cor(manto,'#4d797a',230)
    cor(manto&(x<15),'#abc0b0',235)
    cor(manto&(x<10),'#dee0bd',240)
    cor(manto&((x%5)<1)&(y>21),'#729d94',235)
    capuz=(x-12)**2/36+(y-10)**2/49<1
    cor(capuz,'#bad0bb',240)
    cor(capuz&(x>15),'#749e94',235)
    cor((x-12)**2/16+(y-10)**2/25<1,'#375b63',240)
    # Livro aberto: capa cobre, páginas quentes e pequenas linhas.
    livro=(x>=4)&(x<=20)&(y>=18)&(y<=26)
    cor(livro,'#7d553d')
    cor(livro&(y<25)&(x>4)&(x<20),'#e4d3a1')
    cor(livro&(x==12),'#977251')
    cor(livro&(y%3==1)&(((x>5)&(x<11))|((x>13)&(x<19))),'#b89870')
    cor((y==27)&(x>=5)&(x<=19),'#d0a36a')
    return a

if __name__=='__main__':
    p=Path(__file__).resolve().parents[2]/'public/flashcards/biblioteca/leitor.png'
    p.parent.mkdir(parents=True,exist_ok=True)
    Image.fromarray(pintar()).save(p)
