"""Pequenas ferramentas de pintura compartilhadas pelos pátios e interiores autorais."""
from pathlib import Path
import numpy as np
from pintor import F, Tela, fbm, hexrgb, rampa

PEDRA = rampa(['#283947', '#40505a', '#5c6970', '#809092', '#a7b8ad', '#d6d6b8'])
MADEIRA = rampa(['#2d1d20', '#49302a', '#704535', '#995f3d', '#c18b54', '#e4bc77'])
OURO = rampa(['#533921', '#94642d', '#c69345', '#e9c16d', '#fff0b0'])
VERDE = rampa(['#233d35', '#375b3e', '#537d49', '#80a85b', '#b7cb77'])

def ret(t, x0, y0, x1, y1):
    return (t.x >= x0) & (t.x < x1) & (t.y >= y0) & (t.y < y1)

def material(t, mask, paleta, luz=.55, semente=1):
    t.tingir(mask, np.clip(luz + .09 * (fbm(t.x / 5, t.y / 4, 2, semente) - .5), 0, .999), paleta, .45)

def lajes(t, inicio):
    z = np.clip((t.y-inicio)/(t.y.shape[0]-inicio),0,1)
    largura = 12 + z * 24
    juntas = (((t.x / largura + np.floor(t.y/12)%2*.5)%1)<.035) | ((t.y%12)<1)
    material(t,t.y>=inicio,PEDRA,.47 + z*.19 - juntas*.17,29)

def vaso(t, cx, cy, s):
    x,y=t.x,t.y
    mask=(np.abs(x-cx)<s*(1.2-(cy-y)/s*.18))&(y>cy-s*1.5)&(y<cy)
    material(t,mask,MADEIRA,.6-(x-cx)/s*.12,38)
    for i in range(5):
        px=cx+np.sin(i*2.4)*s; py=cy-s*(1.7+i%3*.35)
        folha=np.hypot((x-px)/(s*.8),(y-py)/(s*.48))<1
        material(t,folha,VERDE,.65-(x-px)/s*.15,39+i)
    flor=np.hypot((x-cx-s*.3)/(s*.4),(y-cy+s*2.4)/(s*.3))<1
    t.cor(flor,'#e8a0a0');t.cor(flor & (np.abs(x-cx-s*.3)<1),'#ffeaa0')

def luz(saida, nome, W,H, pontos):
    t=Tela(W,H); rgb=np.zeros((H,W,3),F)
    for cx,cy,r,cor,forca in pontos:
        g=np.exp(-((t.x-cx)**2+(t.y-cy)**2)/(r*r))*forca
        rgb+=g[...,None]*np.array(hexrgb(cor),F)
    t.a=np.clip(rgb.max(-1)/255,0,1)
    t.rgb=rgb/np.maximum(t.a[...,None],.001)
    t.salvar(saida/f'{nome}-luz.png')

def executar(pintar,nome):
    import sys
    saida=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[2]/'public/flashcards/cenarios'
    saida.mkdir(parents=True,exist_ok=True)
    for formato,W,H in [('paisagem',520,330),('retrato',250,470)]:
        pintar(W,H,saida,f'{nome}-{formato}')
    print(nome,': oito camadas gravadas')
