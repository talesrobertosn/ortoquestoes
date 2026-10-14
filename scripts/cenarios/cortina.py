#!/usr/bin/env python3
"""Azulejo autoral de 16×16 para a cortina de pixels da interface."""
from pathlib import Path
import numpy as np
from pintor import Tela, rampa, fbm
if __name__=='__main__':
 t=Tela(16,16);x,y=t.x,t.y
 pal=rampa(['#283d36','#405748','#687756','#9a9b65','#d7bd79'])
 borda=(x<1)|(y<1)|(x>14)|(y>14)
 t.tingir(np.ones((16,16),bool),np.clip(.47+.17*(1-y/16)+.07*(fbm(x/4,y/4,2,21)-.5)-borda*.2,0,.999),pal,.5)
 t.cor((y==1)&(x>1)&(x<14),'#d0b876');t.cor((x==14)&(y>1),'#233930')
 p=Path(__file__).resolve().parents[2]/'public/flashcards/interface/cortina.png';p.parent.mkdir(parents=True,exist_ok=True);t.salvar(p)
 print(p)
