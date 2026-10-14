#!/usr/bin/env python3
"""Fauna decorativa original, sem relação com os adversários do jogo."""
from pathlib import Path
import numpy as np
from PIL import Image

DESTINO=Path(__file__).resolve().parents[2]/'public/flashcards/animais'

def quadro(nome, k):
    a=np.zeros((24,32,4),np.uint8)
    y,x=np.mgrid[:24,:32]
    def cor(mask,c):
        a[mask]=tuple(int(c[i:i+2],16) for i in (1,3,5))+(255,)
    if nome=='passaro':
        cor((x-16)**2/25+(y-12)**2/9<=1,'#517f91')
        cor((x-21)**2+(y-10)**2<=9,'#31475a')
        cor((x>=23)&(x<=26)&(abs(y-10)<=1),'#e6b568')
        cor((x>=7)&(x<=13)&(abs(y-13)<=1),'#31475a')
        centro=7 if k%2==0 else 15
        cor((x-15)**2/16+(y-centro)**2/25<=1,'#aac8bd')
        cor((x==22)&(y==9),'#f9ebbd')
    elif nome=='coelho':
        cor((x-15)**2/49+(y-16)**2/16<=1,'#9d958a')
        cor((x-22)**2+(y-12)**2<=16,'#ded6b9')
        for cx in (20,24):
            cor((abs(x-cx)<=1)&(y>=3)&(y<=10),'#ded6b9')
            cor((x==cx)&(y>=4)&(y<=8),'#c48e8a')
        cor((x-8)**2+(y-16)**2<=4,'#efe5c7')
        cor((x>=12+k%2*2)&(x<=17+k%2*2)&(y>=19)&(y<=20),'#ded6b9')
        cor((x==24)&(y==11),'#423a39')
        cor((x==26)&(y==13),'#c48e8a')
    else:
        cor((x-17)**2/49+(y-12)**2/16<=1,'#de9b50')
        cor((x-17)**2/36+(y-11)**2/9<=1,'#f1cb77')
        cor((x>=5)&(x<=11)&(abs(y-12)<(12-x)*.55),'#a46646')
        cor((x==22)&(y==11),'#334e55')
        cor((x>=15)&(x<=19)&(y==7+k%2),'#a46646')
    return a

if __name__=='__main__':
    DESTINO.mkdir(parents=True,exist_ok=True)
    for nome in ('passaro','coelho','peixe'):
        Image.fromarray(np.concatenate([quadro(nome,k) for k in range(2)],axis=1)).save(DESTINO/f'{nome}.png')
