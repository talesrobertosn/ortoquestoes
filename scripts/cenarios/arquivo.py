#!/usr/bin/env python3
"""Arquivo dos Mapas: estantes, plantas geométricas, mesa e janela em luz dourada.
Pixel art autoral, sem anatomia ou texto médico nos adereços.
"""
import numpy as np
from pintor import F, Tela, fbm, hexrgb
from acabamento import PEDRA, MADEIRA, OURO, ret, material, lajes, vaso, luz, executar

def pintar(W,H,saida,nome):
    s=W/(250 if H>W else 520);piso=H*.65;x,y=Tela(W,H).x,Tela(W,H).y
    f=Tela(W,H);material(f,np.ones((H,W),bool),MADEIRA,.31+.12*np.exp(-((x-W*.5)/(W*.3))**2),1)
    # Janela alta com montantes e vidro âmbar; arcos em pedra clara.
    cx=W*.5;cy=H*.27;rx=W*.13;ry=H*.19
    vao=(np.abs(x-cx)<rx)&(y>cy-ry)&(y<piso-H*.08)
    vao &= (y>cy)|(np.hypot((x-cx)/rx,(y-cy)/ry)<1)
    f.cor(vao,'#f4c978');f.cor(vao&(y<cy),'#edac66')
    f.cor(vao & ((np.abs(x-cx)<2*s)|(np.abs(y-cy)<2*s)),'#6a4736')
    for side in (0,1):
        sx=W*(.02 if side==0 else .7);sw=W*.28
        material(f,ret(f,sx,H*.07,sx+sw,piso),MADEIRA,.47,3)
        for fila in range(4):
            fy=H*.13+fila*H*.115
            f.cor(ret(f,sx+3*s,fy,sx+sw-3*s,fy+H*.084),'#251e25')
            for i in range(11 if W>H else 6):
                bw=sw/(11 if W>H else 6);bx=sx+4*s+i*bw;altura=H*(.044+(i*13%5)*.005)
                book=ret(f,bx,fy+H*.08-altura,bx+bw*.75,fy+H*.08)
                f.cor(book,('#647c69','#9b6955','#d1ad77','#5c7893','#a97d8e')[i%5])
                f.cor(book&(np.abs(y-(fy+H*.065))<.7),'#e5cfa1')
            material(f,ret(f,sx,fy+H*.08,sx+sw,fy+H*.087),MADEIRA,.75,4)
    f.velar(np.clip(y/piso,0,1)*.06,'#dab083');f.salvar(saida/f'{nome}-fundo.png')
    m=Tela(W,H);lajes(m,piso)
    # Mesa ao fundo, deixando a arena central aberta.
    tx=W*.5;ty=piso+H*.035
    material(m,ret(m,tx-W*.17,ty,tx+W*.17,ty+7*s),MADEIRA,.72,9)
    for lado in (-1,1):material(m,ret(m,tx+lado*W*.135-2*s,ty,tx+lado*W*.135+2*s,ty+H*.075),MADEIRA,.4,10)
    # Pergaminho com planta de um pátio: só linhas arquitetônicas.
    papel=ret(m,tx-W*.09,ty-6*s,tx+W*.07,ty)
    m.cor(papel,'#eee1b6');m.cor(papel & (((x%13)<1)|((y%4)<.7)),'#83968e')
    for lado in (-1,1):
        bx=W*.5+lado*W*.36;by=piso+H*.12
        material(m,ret(m,bx-11*s,by-16*s,bx+11*s,by),MADEIRA,.6,11)
        vaso(m,bx,by-16*s,7*s)
        # Tubos de mapas enrolados apoiados no caixote.
        for i in range(3):
            mapa=ret(m,bx+(i-1)*5*s,by-30*s,bx+(i-1)*5*s+3*s,by-16*s)
            m.cor(mapa,'#d6c9a3');m.cor(mapa&(np.abs(y-(by-23*s))<s),'#b17f58')
    m.salvar(saida/f'{nome}-meio.png')
    fr=Tela(W,H)
    # Correntes e lanternas no primeiro plano, com cantos reservados.
    pontos=[(cx,cy,W*.2,'#ffda97',.24)]
    for lado in (-1,1):
        lx=W*(.045 if lado<0 else .955);ly=H*.18
        fr.cor((np.abs(x-lx)<s*.7)&(y<ly),'#6b5941')
        lanterna=ret(fr,lx-5*s,ly,lx+5*s,ly+14*s)
        material(fr,lanterna,OURO,.43,15)
        fr.cor(ret(fr,lx-3*s,ly+3*s,lx+3*s,ly+11*s),'#ffe8b1')
        pontos.append((lx,ly+7*s,30*s,'#ffb65b',.32))
    rng=np.random.default_rng(19)
    for i in range(35):
        px=rng.uniform(W*.15,W*.85);py=rng.uniform(H*.13,H*.9)
        fr.cor(np.hypot(x-px,y-py)<.8,'#f7d899',.7)
    fr.salvar(saida/f'{nome}-frente.png');luz(saida,nome,W,H,pontos)

if __name__=='__main__':executar(pintar,'arquivo')
