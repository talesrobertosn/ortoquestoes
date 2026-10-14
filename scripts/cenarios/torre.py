#!/usr/bin/env python3
"""Terraço do Horizonte: torre acima das nuvens, estandartes e lanternas ao pôr do sol.
Quatro camadas pintadas por script em dois formatos; sem anatomia decorativa.
"""
import numpy as np
from pintor import F, Tela, fbm, hexrgb
from acabamento import PEDRA, OURO, VERDE, ret, material, lajes, vaso, luz, executar

def pintar(W,H,saida,nome):
    s=W/(250 if H>W else 520);piso=H*.62;x,y=Tela(W,H).x,Tela(W,H).y
    f=Tela(W,H);k=np.clip(y/piso,0,1)[...,None]
    f.rgb[:]=np.array(hexrgb('#6166a3'),F)*(1-k)+np.array(hexrgb('#ffd5a0'),F)*k;f.a[:]=1
    sol=np.hypot(x-W*.7,y-H*.25)<18*s;f.cor(sol,'#ffe8b6')
    for i,cor in enumerate(('#aab4b8','#8b9eb0','#71879d')):
        linha=H*(.4+i*.04)+np.sin(x/(W*.16)+i*2)*H*.08
        mont=(y>linha)&(y<piso);f.cor(mont,cor)
        neve=mont&(y<linha+3*s)&(np.cos(x/W*13+i)>.1);f.cor(neve,'#dddcd2',.85)
    nuvem=(y>H*.48+H*.05*np.sin(x/W*11))&(y<piso+H*.04)
    f.cor(nuvem,'#efe1d4',.65);f.velar(nuvem*.12,'#fff0c8')
    # Silhuetas distantes de torres, livres de figuras decorativas.
    for tx,hh in [(W*.08,H*.17),(W*.88,H*.24)]:
        body=ret(f,tx-8*s,piso-hh,tx+8*s,piso)
        material(f,body,PEDRA,.48,12)
        telhado=(np.abs(x-tx)<(y-(piso-hh-9*s))*.85)&(y>piso-hh-9*s)&(y<piso-hh)
        f.cor(telhado,'#697088')
    f.salvar(saida/f'{nome}-fundo.png')
    m=Tela(W,H);lajes(m,piso)
    # Parapeito e merlões de pedra clara, reforçados por frisos quentes.
    material(m,ret(m,0,piso-15*s,W,piso+4*s),PEDRA,.65-((y%6)<1)*.18,20)
    material(m,ret(m,0,piso-17*s,W,piso-14*s),OURO,.6,21)
    for i in range(13 if W>H else 7):
        cx=(i+.5)*W/(13 if W>H else 7)
        material(m,ret(m,cx-8*s,piso-30*s,cx+8*s,piso-16*s),PEDRA,.75-(x-cx)/(45*s),22)
    # Mastros e bandeiras azuis nas laterais, sem cobrir o centro.
    for lado in (-1,1):
        bx=W*(.09 if lado<0 else .91);by=piso-H*.37
        material(m,ret(m,bx-s,by,bx+s,piso+H*.035),OURO,.7,24)
        flag=ret(m,bx+2*s,by+3*s,bx+21*s,by+39*s)
        flag &= y<by+39*s-np.abs(x-bx-11*s)*.7
        m.cor(flag,'#416a8a');m.cor(flag&(x>bx+16*s),'#2e4965')
        m.cor(flag & ((np.abs(x-bx-11*s)<s)|(np.abs(y-by-15*s)<s)),'#e8c979')
        vaso(m,bx,piso+H*.15,8*s)
    m.salvar(saida/f'{nome}-meio.png')
    fr=Tela(W,H);pontos=[(W*.7,H*.25,W*.23,'#ffc38b',.22)]
    for lado in (-1,1):
        bx=W*(.04 if lado<0 else .96);by=H*.9
        material(fr,ret(fr,bx-4*s,by-18*s,bx+4*s,H),PEDRA,.39,28)
        material(fr,ret(fr,bx-7*s,by-23*s,bx+7*s,by-18*s),OURO,.64,29)
        fogo=np.hypot((x-bx)/(4*s),(y-by+28*s)/(7*s))<1
        fr.cor(fogo,'#ef9a48');fr.cor(fogo & (np.abs(x-bx)<2*s),'#ffe6a0')
        pontos.append((bx,by-27*s,35*s,'#ffb76a',.4))
    rng=np.random.default_rng(32)
    for _ in range(24):
        px=rng.uniform(0,W);py=rng.uniform(H*.4,H)
        fr.cor(np.hypot(x-px,y-py)<.8,'#ffe5ad',.65)
    fr.salvar(saida/f'{nome}-frente.png');luz(saida,nome,W,H,pontos)

if __name__=='__main__':executar(pintar,'torre')
