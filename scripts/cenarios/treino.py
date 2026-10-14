#!/usr/bin/env python3
"""Pátio dos Estandartes: alvo de palha, galeria de madeira e jardim ensolarado.
Quatro camadas autorais em paisagem e retrato; nenhum adereço anatômico.
"""
import numpy as np
from pintor import F, Tela, fbm, hexrgb
from acabamento import PEDRA, MADEIRA, OURO, VERDE, ret, material, lajes, vaso, luz, executar

def pintar(W,H,saida,nome):
    s=W/(250 if H>W else 520); piso=H*.62; x,y=Tela(W,H).x,Tela(W,H).y
    f=Tela(W,H)
    k=np.clip(y/(H*.65),0,1)[...,None]
    f.rgb[:]=np.array(hexrgb('#69b8d1'),F)*(1-k)+np.array(hexrgb('#fff0cb'),F)*k;f.a[:]=1
    nuvens=(fbm(x/35,y/12,3,17)>.67)&(y<H*.35)
    f.cor(nuvens,'#fff6d8',.9)
    for i,cor in enumerate(('#90b6a0','#618973','#436956')):
        linha=H*(.32+i*.045)+np.sin(x/(W*.12)+i)*H*.05
        f.cor((y>linha)&(y<piso),cor)
    # Galeria: muro baixo, pilares, teto de telhas e portal com treliça.
    parede=ret(f,0,H*.38,W,piso)
    material(f,parede,PEDRA,.7-((y%7)<1)*.16,2)
    f.velar(parede*.08,'#ffe3a3')
    for cx in [W*.09,W*.29,W*.71,W*.91]:
        material(f,ret(f,cx-4*s,H*.25,cx+4*s,piso),MADEIRA,.55-(x-cx)/(25*s),3)
        material(f,ret(f,cx-7*s,H*.31,cx+7*s,H*.34),MADEIRA,.7,4)
    telhado=(y>H*.25+np.abs(x-W*.5)*.015)&(y<H*.34)
    material(f,telhado,MADEIRA,.57-((y%4)<1)*.15,5)
    f.cor(telhado&((x%7)<1),'#5b392c',.5)
    vao=ret(f,W*.43,H*.34,W*.57,piso)
    f.cor(vao,'#31594b');f.cor(vao & (((x%6)<1)|((y%8)<1)),'#9bae73')
    f.salvar(saida/f'{nome}-fundo.png')
    m=Tela(W,H);lajes(m,piso)
    # Alvo sem manequim: círculos de palha, aro e pé de madeira.
    cx,cy=W*.18,H*.5;raio=18*s
    material(m,ret(m,cx-2*s,cy,cx+2*s,piso+H*.09),MADEIRA,.55,6)
    d=np.hypot(x-cx,(y-cy)*.94)
    material(m,d<raio,OURO,.65+(cy-y)/(raio*4),7)
    m.cor((d<raio)&((d%(5*s))<1),'#936845')
    m.cor(d<raio*.5,'#b75348');m.cor(d<raio*.19,'#ffe7b0')
    # Canteiros laterais, flores e banco. Centro reservado à pergunta.
    for lado in (1,-1):
        vx=W*.5+lado*W*.4
        material(m,ret(m,vx-16*s,piso+H*.02,vx+16*s,piso+H*.09),MADEIRA,.58,8)
        vaso(m,vx,piso+H*.02,8*s)
    bx=W*.78;by=piso+H*.07
    material(m,ret(m,bx-23*s,by,bx+23*s,by+4*s),MADEIRA,.7,9)
    for ox in (-17,17):material(m,ret(m,bx+ox*s,by,bx+(ox+3)*s,by+14*s),MADEIRA,.38,10)
    for i in range(22):
        px=W*(.04+((i*37)%100)/100*.92);py=piso+H*.3+np.sin(i)*H*.05
        m.cor(np.hypot(x-px,y-py)<1.2*s,('#ecc47b','#f3c2b2','#a9bd71')[i%3])
    m.salvar(saida/f'{nome}-meio.png')
    fr=Tela(W,H)
    corda=H*.06+np.sin(x/W*np.pi)*H*.035
    fr.cor(np.abs(y-corda)<.8,'#614d36')
    for i in range(7 if W>H else 4):
        cx=(i+.5)*W/(7 if W>H else 4);cy=H*.06+np.sin(cx/W*np.pi)*H*.035
        flag=(y>cy)&(y<cy+12*s)&(np.abs(x-cx)<(cy+12*s-y)*.38)
        fr.cor(flag,('#ce7350','#e6bb6a','#5e9290')[i%3])
    for cx in (0,W):
        folha=np.hypot((x-cx)/(W*.12),(y-H)/(H*.12))<1
        material(fr,folha,VERDE,.35+.25*fbm(x/4,y/4,2,16),16)
    fr.salvar(saida/f'{nome}-frente.png')
    luz(saida,nome,W,H,[(W*.63,H*.1,W*.38,'#ffe8ab',.2),(W*.5,piso,W*.25,'#ffdf98',.12)])

if __name__=='__main__':executar(pintar,'treino')
