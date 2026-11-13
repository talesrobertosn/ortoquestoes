#!/usr/bin/env python3
"""Sala de Natal do chalé, pintada em 480×200 para o palco da página inicial.

Cada objeto é construído em pixels. A vista pela janela reaproveita a pintura
original de Natal no Vale, para que interior e exterior pertençam ao mesmo mundo.
O fogo, a espada, o esqueleto, o gato e a coruja continuam em camadas animadas.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/pixel/inicio"
W, H = 480, 200
FIRE = (298, 146)
TREE_LIGHTS=[]
PALETTES = {
    "manha": {"wall": (56, 45, 39), "floor": (98, 75, 56), "sky": (125, 171, 205), "warm": (247, 169, 91), "blue": (137, 187, 222), "fire": .75, "day": 1.00},
    "tarde": {"wall": (56, 41, 39), "floor": (104, 67, 50), "sky": (185, 119, 151), "warm": (255, 165, 98), "blue": (179, 126, 167), "fire": 1.0, "day": .77},
    "noite": {"wall": (36, 33, 39), "floor": (75, 52, 43), "sky": (56, 77, 120), "warm": (255, 155, 70), "blue": (87, 125, 188), "fire": 1.50, "day": .42},
}


def h(*values: int) -> float:
    n = 2166136261
    for value in values:
        n = (n ^ int(value)) * 16777619 & 0xffffffff
    n ^= n >> 16
    n = n * 0x7feb352d & 0xffffffff
    n ^= n >> 15
    n = n * 0x846ca68b & 0xffffffff
    n ^= n >> 16
    return n / 0xffffffff


def shade(rgb, k):
    return tuple(max(0, min(255, int(v * k))) for v in rgb)


def rect(d, box, color):
    d.rectangle(tuple(map(int, box)), fill=color)


def line(d, points, color, width=1):
    d.line(points, fill=color, width=width)


def board(d, x0, y0, x1, y1, base, seed):
    rect(d, (x0, y0, x1, y1), shade(base, .57))
    rect(d, (x0+1, y0+1, x1-1, y1-1), shade(base, .86 + .17*h(seed, 1)))
    line(d, (x0+1, y0+1, x1-2, y0+1), shade(base, 1.20))
    for k in range(3):
        yy = y0+2+int(h(seed, k+2)*max(1, y1-y0-3))
        xa = x0+2+int(h(seed, k+8)*max(1, (x1-x0)//4))
        xb = min(x1-2, xa+8+int(h(seed, k+12)*18))
        line(d, (xa, yy, xb, yy), shade(base, .64 if k%2 else 1.11))


def wall_and_floor(img, p):
    d = ImageDraw.Draw(img)
    wall = p["wall"]
    floor = p["floor"]
    rect(d, (0, 0, W, 126), wall)
    # Tábuas da parede, com veios e juntas de 1 px.
    for row, y in enumerate(range(1, 126, 8)):
        for col, x in enumerate(range(-33 if row%2 else 0, 490, 75)):
            board(d, x, y, x+74, y+7, wall, 100+row*37+col)
    # Painel escuro na área de leitura.
    rect(d, (0, 112, 479, 130), (18, 17, 22))
    for y in (114, 117, 128):
        line(d, (0, y, 479, y), shade(wall, 1.36))
    # Piso de pinho antigo: fiadas crescentes em perspectiva, juntas alternadas,
    # veios e nós, sem os quadrados de pedra da oficina.
    rows=[(130,135),(136,142),(143,150),(151,159),(160,169),(170,180),(181,192),(193,200)]
    for row,(y0,y1) in enumerate(rows):
        x=-32 if row%2 else -8
        while x<480:
            width=39+int(h(row,x,31)*32)+row*3
            tone=.76+.055*row+(h(row,x,32)-.5)*.17
            col=shade(floor,tone)
            rect(d,(x,y0,x+width-2,y1-1),col)
            line(d,(x+1,y0+1,x+width-3,y0+1),shade(col,1.34))
            line(d,(x+1,y1-2,x+width-3,y1-2),shade(col,.64))
            for k in range(5):
                yy=y0+2+int(h(row,x,k+11)*max(2,y1-y0-4))
                xa=x+2+int(h(row,x,k+17)*max(3,width//3))
                xb=min(x+width-4,xa+9+int(h(row,x,k+21)*width*.45))
                line(d,(xa,yy,xb,yy),shade(col,.72 if k%2 else 1.15))
            if h(row,x,33)>.70:
                kx=x+9+int(h(row,x,34)*(width-18))
                ky=y0+2+int(h(row,x,35)*max(2,y1-y0-4))
                d.ellipse((kx-2,ky-1,kx+2,ky+1),outline=shade(col,.52))
                d.point((kx,ky),fill=shade(col,.40))
            x+=width
        line(d,(0,y1,479,y1),shade(floor,.36))
    # Riscas finas de uso e pregos de ferro junto às emendas.
    for y in range(135,200,11):
        for x in range(15,480,69):
            if h(x,y,48)>.35:
                d.point((x,y+2),fill=shade(floor,.35))
                d.point((x+2,y+2),fill=shade(floor,.35))
    # Vigas do teto e beiral, escalonados, com lado iluminado.
    for x in (0, 72, 145, 220, 373, 465):
        poly = [(x-11,0),(x+13,0),(x+43,25),(x+28,30)]
        d.polygon(poly, fill=(17,12,12))
        line(d, (x+12,0,x+42,25), (107,68,44), 2)
        line(d, (x-8,2,x+28,28), (49,31,25), 3)
        for i in range(12):
            a=x+int(h(x,i)*25)
            yy=int(h(i,x)*16)
            line(d,(a,yy,a+12,yy+7),(75,47,31))
    rect(d,(0,26,479,30),(26,18,18))
    line(d,(0,27,479,27),(82,48,31),2)


def mountains_in_window(img, name):
    """A mesma vila e cordilheira do cenário do terraço, numa janela em perspectiva."""
    source = Image.open(OUT / f"cena-vale-{name}.webp").convert("RGB")
    source = source.resize((W,H), Image.Resampling.NEAREST)
    # Janela de quatro vidraças, com a prefeitura e montanhas ao fundo.
    view = source.crop((170, 18, 285, 123)).resize((96, 85), Image.Resampling.NEAREST)
    img.paste(view, (193, 35))
    d=ImageDraw.Draw(img)
    # Friso de pedra: silhueta pesada, peitoril e reflexão fria.
    rect(d,(187,29,295,126),(12,12,19))
    img.paste(view,(193,35))
    d=ImageDraw.Draw(img)
    for x in (188,190,192,289,291,293):
        line(d,(x,29,x,120),(47,31,25) if x%2 else (92,62,39))
    for y in (29,31,33,119,122,125):
        line(d,(187,y,295,y),(40,28,25) if y%2 else (112,75,45))
    rect(d,(239,34,243,119),(22,19,22))
    line(d,(240,35,240,118),(126,83,45))
    rect(d,(193,75,289,78),(23,22,27))
    line(d,(193,76,289,76),(121,82,48))
    rect(d,(185,124,297,128),(22,16,18))
    rect(d,(183,125,298,126),(137,96,57))
    rect(d,(187,128,295,130),(65,43,33))
    # Pedaços de gelo e reflexos em cada vidro.
    for x,y in ((197,40),(251,39),(202,85),(249,84)):
        line(d,(x,y,x+10,y+1),(163,201,219))
        line(d,(x+2,y+2,x+4,y+9),(109,153,194))
    # Cortinas de veludo presas por cordões: dobras por banda de cor.
    for side in (-1,1):
        edge=192 if side<0 else 288
        for y in range(31,112):
            taper=(y-31)/81
            width=max(2,int(12*(1-taper*.72)))
            xa=edge if side<0 else edge-width
            for dx in range(width):
                xx=xa+dx
                fold=(dx//3)%3
                color=((31,53,43),(39,72,52),(57,91,64))[fold]
                if dx==0:color=(16,34,31)
                if dx==width-1:color=(79,116,76)
                d.point((xx,y),fill=color)
        band_y=94
        line(d,(edge-1 if side<0 else edge-7,band_y,edge+7 if side<0 else edge+1,band_y+2),(179,91,52),2)
        d.point((edge+3 if side<0 else edge-4,band_y+4),fill=(233,178,89))
    return (193,35,289,119)


def fireplace(img):
    d=ImageDraw.Draw(img)
    # Chaminé de pedra lavrada: blocos desenhados um a um.
    for row,y in enumerate(range(0,151,8)):
        x=263-(row%2)*6
        while x<356:
            width=11+int(h(row,x,71)*9)
            tone=88+int(h(row,x,72)*40)
            stone=(tone, int(tone*.82), int(tone*.73))
            rect(d,(x,y,x+width-2,y+7),(29,27,30))
            rect(d,(x+1,y+1,x+width-3,y+6),stone)
            line(d,(x+1,y+1,x+width-3,y+1),shade(stone,1.35))
            line(d,(x+1,y+6,x+width-3,y+6),shade(stone,.52))
            for k in range(8):
                xx=x+2+int(h(row,x,k)*max(2,width-5))
                yy=y+2+int(h(x,row,k+5)*4)
                d.point((xx,yy),fill=shade(stone,.58 if k%2 else 1.25))
                if k<3 and xx+2<x+width-2:
                    line(d,(xx,yy,xx+2,yy),(52,44,42) if k%2 else shade(stone,1.16))
            x+=width
    # Arco e boca, carvão em brasa; as chamas do site entram por cima.
    rect(d,(271,98,326,151),(33,22,20))
    d.ellipse((272,85,325,122),fill=(29,23,21))
    rect(d,(276,111,321,149),(38,22,21))
    d.ellipse((277,94,320,123),fill=(35,23,22))
    for row,y in enumerate(range(111,149,5)):
        for x in range(278+(row%2)*3,322,7):
            rect(d,(x,y,x+6,y+4),(67+int(12*h(x,y)),38,32))
            line(d,(x,y,x+5,y),(101,57,40))
    # Aduelas do arco: pedras trapezoidais e junta escura.
    for i in range(11):
        a=math.pi+(math.pi*i/11)
        b=math.pi+(math.pi*(i+1)/11)
        cx,cy=299,117
        pts=[]
        for radius,ang in ((28,a),(28,b),(22,b),(22,a)):
            pts.append((cx+math.cos(ang)*radius,cy+math.sin(ang)*radius*.86))
        tone=122+int(h(i,12)*38)
        d.polygon(pts,fill=(tone,int(tone*.82),int(tone*.68)))
        line(d,(pts[0],pts[3]),(34,29,29))
    for x in (269,326):
        for y in range(115,151,7):
            rect(d,(x,y,x+5,y+6),(106,84,69))
            line(d,(x,y,x+5,y),(158,126,96))
            line(d,(x,y+6,x+5,y+6),(38,31,31))
    # Soleira de pedra em três planos.
    rect(d,(262,151,337,157),(34,28,27))
    rect(d,(264,151,335,152),(169,136,107))
    rect(d,(266,153,333,155),(91,75,69))
    for x in range(266,335,10):
        line(d,(x,153,x-1,156),(39,32,32))
    # Carvão e brasas ficam atrás do fogo animado.
    for k in range(160):
        x=280+int(h(k,3)*39); y=143+int(h(k,4)*7)
        c=(20,18,20) if h(k,5)<.46 else (134,42,25) if h(k,6)<.72 else (241,105,32)
        d.point((x,y),fill=c)
        if h(k,8)>.93:d.point((x,y-1),fill=(255,203,91))
    # Grande prateleira de carvalho; laterais e veios.
    rect(d,(256,77,354,84),(25,17,17))
    board(d,259,78,351,82,(122,72,39),85)
    rect(d,(255,84,356,86),(24,17,18))
    line(d,(258,77,351,77),(193,123,63))
    for x in (266,345):
        rect(d,(x,85,x+5,94),(54,37,30))
        line(d,(x,85,x+5,85),(148,97,58))


def log_rack(img):
    d=ImageDraw.Draw(img)
    rect(d,(235,126,257,153),(20,17,19))
    for y in (132,139,146):
        for x in (237,243,249):
            xx=x+(y%3)
            d.ellipse((xx,y,xx+7,y+6),fill=(90,59,39),outline=(22,19,20))
            d.ellipse((xx+2,y+1,xx+5,y+4),fill=(168,116,69),outline=(75,50,36))
            d.point((xx+3,y+2),fill=(95,66,48))
    for x in (233,258):
        rect(d,(x,124,x+2,156),(29,28,30))
        line(d,(x,124,x,156),(123,102,71))
    line(d,(233,124,260,124),(164,124,76))


def garland(d, x0,y0,x1,seed):
    # Guirlanda pendente em camadas de folhagem, laços e luzes pontuais.
    for x in range(x0,x1):
        dy=int(3*math.sin((x-x0)/(x1-x0)*math.pi))
        yy=y0+dy
        for k in range(4):
            dx=int(h(x,k,seed)*5)-2
            d.point((x+dx,yy+k//2),fill=((18,64,37),(31,81,41),(50,111,53),(101,132,68))[k])
        if x%9==seed%9:
            d.point((x,yy+1),fill=(255,219,119))
            d.point((x,yy+2),fill=(183,94,43))
    for x in (x0+12,(x0+x1)//2,x1-10):
        y=y0+2
        d.polygon([(x,y),(x-6,y-2),(x-4,y+3),(x,y+1)],fill=(158,38,42))
        d.polygon([(x,y),(x+6,y-2),(x+4,y+3),(x,y+1)],fill=(188,50,48))
        rect(d,(x-1,y,x+1,y+2),(243,105,78))
        line(d,(x,y+2,x-2,y+6),(101,24,29))


def hearth_details(img):
    d=ImageDraw.Draw(img)
    garland(d,260,68,353,4)
    # Livros, castiçais e chaleira de cobre — cada volume tem sua face e reflexo.
    for x,w,c in ((272,4,(97,44,35)),(277,3,(42,87,65)),(281,5,(90,65,40)),(287,3,(132,48,45))):
        rect(d,(x,60,x+w,76),(28,23,25))
        rect(d,(x+1,61,x+w-1,74),c)
        line(d,(x+1,62,x+1,73),shade(c,1.5))
        d.point((x+w-1,66),fill=(220,176,98))
    d.ellipse((322,63,338,77),fill=(144,76,39),outline=(38,26,25))
    d.arc((335,64,344,75),270,100,fill=(199,126,56),width=2)
    rect(d,(325,61,335,64),(52,37,31))
    rect(d,(328,58,332,61),(181,113,50))
    line(d,(325,69,330,65),(238,171,83))
    d.ellipse((310,66,318,76),fill=(52,41,31),outline=(24,22,25))
    rect(d,(312,68,316,74),(245,195,104))
    line(d,(313,70,313,73),(255,239,178))
    rect(d,(313,63,315,65),(142,101,57))
    # Meias vazias junto ao batente, prontas para receber os presentes.
    for x,color in ((337,(156,43,45)),(345,(43,91,71))):
        line(d,(x,85,x,88),(201,165,102))
        rect(d,(x-2,87,x+2,89),(225,205,154))
        d.polygon([(x-2,90),(x+2,90),(x+2,98),(x+5,99),(x+4,102),(x-1,102),(x-3,100)],fill=color)
        line(d,(x-2,91,x-2,99),shade(color,1.5))
        d.point((x+1,96),fill=(238,194,113))
    # Pequeno lampião de metal junto ao lado direito do fogão.
    rect(d,(365,99,370,116),(35,31,30))
    rect(d,(366,102,369,113),(248,194,99))
    line(d,(367,104,367,111),(255,238,175))
    rect(d,(364,99,371,101),(113,95,70))
    rect(d,(365,115,370,117),(98,83,65))
    d.arc((365,95,371,101),180,360,fill=(156,130,90))


def holiday_wall(img):
    d=ImageDraw.Draw(img)
    # Festão no alto da parede da direita; agulhas individuais e luzinhas.
    garland(d,354,34,479,7)
    for x in range(359,478,8):
        y=35+int(3*math.sin((x-354)/125*math.pi))
        line(d,(x,y,x-2,y+3),(62,105,53))
        if x%3==0:
            d.point((x,y+2),fill=(255,219,128))
    # Lambris: menos superfícies vazias, mesmo padrão das outras salas do site.
    for x in (376,407,465):
        rect(d,(x,92,x+2,126),(26,20,21))
        line(d,(x,93,x,124),(99,64,43))
    rect(d,(355,122,479,126),(26,19,20))
    line(d,(355,122,479,122),(111,71,44))
    # Rodelas de lenha e uma vassoura junto à lareira, atrás do mascote.
    for k in range(5):
        x=356+k*3
        line(d,(x,139,x+3,127-k%3),(61,39,28),2)
        line(d,(x+1,136,x+3,127-k%3),(145,98,57))
    line(d,(372,116,377,151),(83,55,35),2)
    for dx in range(-4,5):
        line(d,(377+dx,150,375+dx,159),(145,109,66))


def tree(img):
    d=ImageDraw.Draw(img)
    cx=435
    # Tronco, 7 camadas de ramos irregulares e pontas claras.
    rect(d,(432,62,438,171),(48,35,28))
    for level in range(8):
        y0=42+level*13
        width=3+level*3.6
        for side in (-1,1):
            for k in range(4):
                bx=cx+side*int(width*(.28+k*.25))
                by=y0+3+k*2
                tip=bx+side*(3+level//3)
                poly=[(cx, y0),(tip,by+4),(bx,by+7),(cx,by+4)]
                d.polygon(poly,fill=((19,54,34),(27,71,38),(38,88,42),(50,108,49))[k])
                line(d,(cx+side*2,y0+2,tip,by+3),(82+level*3,125+level*2,70))
        for q in range(92):
            x=cx+int((h(level,q,3)-0.5)*width*2)
            y=y0+2+int(h(level,q,4)*10)
            if abs(x-cx)<width*(y-y0)/13+.5:
                tone=h(level,q,5)
                d.point((x,y),fill=(19,49,29) if tone<.28 else (77,127,60) if tone>.76 else (42,91,42))
                if tone>.88:
                    d.point((x+1,y+1),fill=(94,148,72))
    # Cordão de pequenas luzes e ornamentos, sem neve dentro da sala.
    for level in range(1,8):
        y=46+level*13
        width=4+level*3.6
        for k in range(5):
            x=int(cx-width+2*width*k/4)
            yy=y+int(2*math.sin(k*1.8+level))
            color=((244,211,113),(198,53,54),(97,153,209),(232,169,84))[k%4]
            d.point((x,yy),fill=color)
            if (level+k)%3==0:
                rect(d,(x-1,yy+1,x+1,yy+3),(164,40,44))
                d.point((x,yy+2),fill=(245,110,95))
    # Árvore em tina de madeira, sem estrela/símbolo no topo.
    rect(d,(425,167,445,176),(45,31,27))
    board(d,427,168,443,174,(107,70,43),321)
    rect(d,(425,167,445,168),(150,103,62))


def gifts(img):
    d=ImageDraw.Draw(img)
    boxes=[(389,170,400,183,(82,111,81),(193,52,50)),(401,164,417,183,(142,57,55),(222,184,108)),
           (448,164,461,181,(112,70,112),(222,181,104)),(460,171,478,190,(69,104,111),(202,71,66)),
           (419,180,436,194,(143,101,61),(208,54,54)),(437,176,449,188,(116,56,54),(203,167,100))]
    for index,(x0,y0,x1,y1,base,ribbon) in enumerate(boxes):
        rect(d,(x0+1,y1,x1+2,y1+2),(22,20,25))
        rect(d,(x0,y0,x1,y1),(34,27,27))
        rect(d,(x0+1,y0+1,x1-1,y1-1),base)
        line(d,(x0+1,y0+1,x1-2,y0+1),shade(base,1.42))
        line(d,(x1-2,y0+2,x1-2,y1-1),shade(base,.63))
        for yy in range(y0+3,y1-1,4):
            for xx in range(x0+3,x1-2,5):
                if index%2:
                    d.point((xx,yy),fill=shade(base,1.58))
                else:
                    line(d,(xx,yy,xx+1,yy+1),shade(base,1.48))
        mid=(x0+x1)//2
        rect(d,(mid-1,y0+1,mid+1,y1-1),ribbon)
        rect(d,(x0+1,y0+4,x1-1,y0+5),ribbon)
        d.polygon([(mid,y0),(mid-4,y0-3),(mid-5,y0),(mid,y0+1)],fill=shade(ribbon,.8))
        d.polygon([(mid,y0),(mid+4,y0-3),(mid+5,y0),(mid,y0+1)],fill=shade(ribbon,1.15))


def rug(img):
    d=ImageDraw.Draw(img)
    poly=[(316,170),(387,170),(418,199),(286,199)]
    d.polygon(poly,fill=(34,29,30))
    d.polygon([(319,172),(384,172),(411,197),(293,197)],fill=(128,74,49))
    d.polygon([(321,174),(382,174),(406,195),(298,195)],fill=(30,68,49))
    for edge in range(2):
        y=177+edge*14
        line(d,(313-edge*11,y,390+edge*11,y),(200,134,70))
        for x in range(320-edge*8,390+edge*8,7):
            if h(x,edge,71)>.28:
                d.point((x,y+1),fill=(207,173,99))
    for x,y in ((348,184),(367,184),(337,191),(377,191)):
        for dx,dy in ((0,0),(-2,0),(2,0),(0,-2),(0,2)):
            d.point((x+dx,y+dy),fill=(178,100,65))
        d.point((x,y),fill=(225,177,96))
    for x in range(293,413,3):
        if h(x,19)>.4:d.point((x,198),fill=(192,151,91))


def basket(img):
    d=ImageDraw.Draw(img)
    # Cesto do gato em piso firme, com trama e almofada xadrez.
    d.ellipse((380,159,405,171),fill=(44,28,25),outline=(150,95,52))
    d.ellipse((382,161,403,166),fill=(130,52,49),outline=(209,159,95))
    for x in range(384,402,4):
        line(d,(x,162,x+2,166),(204,151,102))
    for y in range(164,172,2):
        line(d,(382,y,404,y),(177,117,67))
    for x in range(383,405,3):
        line(d,(x,165,x+2,171),(88,55,36))


def foreground(img):
    d=ImageDraw.Draw(img)
    # Molde de pinho fora de foco, nas bordas, deixando o texto legível.
    for cx,cy in ((-8,175),(484,185)):
        for k in range(34):
            x=cx+int((h(k,cx,1)-.5)*33)
            y=cy+int((h(k,cx,2)-.5)*55)
            radius=2+int(h(k,cx,3)*4)
            d.ellipse((x-radius,y-radius,x+radius,y+radius),fill=(12,33,29) if cx<0 else (17,41,30))


def fine_details(img):
    """Acabamento material, pequenos objetos e pontos de apoio do palco."""
    d=ImageDraw.Draw(img)
    # Veios longitudinais e lascas do carvalho: grupos de pixels, não ruído solto.
    for k in range(510):
        x=int(h(k,102)*W); y=int(h(k,103)*126)
        if 183<x<357: continue
        length=2+int(h(k,104)*9)
        col=img.getpixel((x,y))
        line(d,(x,y,min(479,x+length),y),shade(col,.71 if k%3 else 1.23))
        if k%7==0 and y<110:
            line(d,(x+2,y+1,min(479,x+length-1),y+1),shade(col,1.12))
    # Relevo de pedra: fissuras curtas, granulação e pequenas lascas no corpo.
    for k in range(850):
        x=264+int(h(k,120)*90); y=int(h(k,121)*151)
        if (y>87 and 272<x<328) or 66<y<94: continue
        col=img.getpixel((x,y))
        if max(col)<42: continue
        d.point((x,y),fill=shade(col,.68 if k%3 else 1.18))
        if k%13==0:
            line(d,(x,y,x+2,y+1),shade(col,.58))
    # Tijolos refratários escurecidos no alto, laterais do nicho em perspectiva.
    d.polygon([(276,114),(281,118),(281,142),(276,149)],fill=(51,29,25))
    d.polygon([(321,114),(316,118),(316,142),(321,149)],fill=(66,32,23))
    for yy in range(118,145,5):
        line(d,(276,yy,281,yy+2),(112,58,35))
        line(d,(316,yy+2,321,yy),(128,64,34))
    for y in range(98,116):
        for x in range(282,316):
            if ((x-299)/21)**2+((y-117)/20)**2<1:
                c=img.getpixel((x,y)); d.point((x,y),fill=shade(c,.48+.4*(y-98)/18))
    # Toras cruzadas dentro do nicho. Contorno carbonizado e casca em escamas.
    for x0,y0,x1,y1 in ((281,146,313,142),(285,141,316,147)):
        line(d,(x0,y0,x1,y1),(21,16,18),5)
        line(d,(x0,y0-1,x1,y1-1),(89,46,28),3)
        line(d,(x0+2,y0-1,x1-2,y1-1),(147,64,29))
    for k in range(90):
        x=280+int(h(k,139)*39); y=141+int(h(k,140)*9)
        col=((68,28,22),(192,58,24),(244,127,35),(255,211,105))[int(h(k,141)*4)]
        d.point((x,y),fill=col)
    # O tapete tem borda tecida e desenho simétrico na perspectiva do chão.
    mask=Image.new('1',(W,H)); md=ImageDraw.Draw(mask)
    md.polygon([(319,174),(382,174),(406,195),(298,195)],fill=1)
    for y in range(174,196):
        width=63+(y-174)*2.1
        left=350-width/2
        for x in range(max(0,int(left)),min(W,int(left+width)+1)):
            if not mask.getpixel((x,y)):continue
            u=(x-350)/(width/2); v=(y-184.5)/10.5
            diamond=abs(u)*.85+abs(v)*.75
            if .52<diamond<.62 or .80<diamond<.88:
                d.point((x,y),fill=(182,139,74) if (x+y)%3 else (111,66,44))
            elif abs(math.sin(u*19)*math.cos(v*9))>.81:
                d.point((x,y),fill=(143,75,49))
            elif (x+y)%4==0:
                c=img.getpixel((x,y)); d.point((x,y),fill=shade(c,1.22))
    for x in range(292,414,2):
        line(d,(x,198,x-1,199),(157,115,68))
    # Cachepô: aduelas, aros metálicos e folhagem cobrindo a borda.
    for x in range(426,445,3):
        line(d,(x,169,x,175),(49,30,24))
        line(d,(x+1,169,x+1,174),(151,100,52))
    for y in (169,174):line(d,(426,y,444,y),(80,81,69))
    # Poleiro dedicado: prateleira firme com mão-francesa, livre de adornos.
    board(d,360,78,383,81,(112,75,43),150)
    for x in (363,379):
        line(d,(x,82,x,87),(77,52,34))
        line(d,(x,87,x+4,82),(125,84,47))
    # Livros de leitura e caixinha de chá ao pé da janela, fora do caminho.
    for i,(x,y,w,c) in enumerate(((205,130,18,(83,56,41)),(207,128,16,(52,83,64)),(204,126,19,(120,46,40)))):
        rect(d,(x,y,x+w,y+2),(25,23,25))
        rect(d,(x+1,y,x+w-1,y+1),c)
        line(d,(x+3,y+1,x+w-2,y+1),(194,171,120))
    # Cobre com halo de metal, arco da alça, bico e reflexo recortado.
    d.arc((322,57,337,72),185,355,fill=(227,159,76),width=2)
    d.polygon([(325,66),(321,61),(320,61),(322,70),(326,72)],fill=(154,83,36))
    line(d,(326,68,326,73),(246,184,96))
    d.point((328,66),fill=(255,222,150))
    # Laços em tecido e folhagem irregular no consolo.
    for x in range(260,353):
        y=70+int(2*math.sin((x-260)/93*math.pi))
        for dy in (0,1,2):
            if h(x,dy,169)>.25:
                d.point((x,y+dy),fill=((23,58,34),(49,94,44),(84,124,60))[int(h(x,dy,170)*3)])
    # Poeira de neve só do outro lado do vidro; gelo se prende às quinas.
    for k in range(45):
        x=201+int(h(k,180)*59); y=38+int(h(k,181)*80)
        if x not in range(239,244) and y not in range(75,79):
            d.point((x,y),fill=(142,174,193))
    # Relógio de nogueira e latão, com caixa espessa e doze marcas de um pixel.
    d.ellipse((294,37,313,57),fill=(24,21,24),outline=(133,86,45))
    d.ellipse((296,39,311,55),fill=(177,135,77),outline=(69,43,30))
    d.ellipse((298,41,309,53),fill=(197,176,130))
    for k in range(12):
        a=k*math.pi/6
        d.point((round(303.5+math.sin(a)*5),round(47-math.cos(a)*5)),fill=(62,44,32))
    line(d,(303,47,302,43),(42,36,32))
    line(d,(303,47,307,48),(42,36,32))
    d.point((303,47),fill=(221,171,86))
    # Pequena estante: livros encadernados, lombadas e papel enrolado.
    board(d,364,45,398,48,(100,65,37),213)
    for i,x in enumerate(range(366,394,4)):
        ht=9+int(h(i,200)*6)
        col=((126,57,45),(48,82,62),(87,62,49),(107,85,49))[i%4]
        rect(d,(x,44-ht,x+2,44),col)
        line(d,(x,45-ht,x,43),shade(col,1.45))
        for y in (46-ht,42):line(d,(x,y,x+2,y),(174,134,70))
    # Meias em malha: nervuras, dobra do punho e padrões bordados.
    for x in (337,345):
        for yy in range(91,101,2):
            d.point((x-1,yy),fill=(185,119,75))
            d.point((x+1,yy+1),fill=(98,47,36))
        for dx,dy in ((0,0),(-1,1),(1,1),(0,2)):
            d.point((x+dx,94+dy),fill=(224,204,151))
    # Esteio de primeiro plano e ferragens de junção, com veio vertical.
    for x in range(473,480):
        for y in range(27,200):
            tone=(.58,.74,.91,1.12,.81,.62,.45)[x-473]
            col=shade((81,51,33),tone*(.85+.2*h(x,y//6,207)))
            d.point((x,y),fill=col)
    for y in (35,117,179):
        rect(d,(473,y,479,y+3),(31,32,33))
        line(d,(473,y,479,y),(91,88,72))
        for x in (474,478):d.point((x,y+1),fill=(151,128,82))
    # Entalhe contínuo em losangos na frente do consolo e cravos de bronze.
    for x in range(262,350,6):
        line(d,[(x,80),(x+2,78),(x+4,80),(x+2,82),(x,80)],(83,43,26))
        d.point((x+2,79),fill=(185,126,67))
    for x in (260,350):
        for y in (79,82):d.point((x,y),fill=(213,171,98))
    # Cordão trançado da cortina, borla e bainha bordada.
    for y in range(96,117):
        x=195+(y-96)//10
        d.point((x,y),fill=(179,122,61) if y%2 else (107,64,38))
    for x in range(194,200):
        line(d,(197,114,x,120),(157,96,46))
    for y in range(42,91,6):
        d.point((195,y),fill=(124,143,84))
        d.point((196,y+1),fill=(79,110,65))
    # Trançado do vime, com as fibras passando alternadamente por cima.
    for y in range(164,171):
        for x in range(383,403):
            if ((x//2)+(y//2))%2==0:
                d.point((x,y),fill=(173,111,58) if y%2 else (113,67,36))
    # Pinha e nozes junto à tina: cada escama recebe uma quina de luz.
    for cx,cy in ((414,177),(451,185)):
        d.ellipse((cx-2,cy-3,cx+2,cy+2),fill=(45,29,24))
        for dy in range(-2,3):
            for dx in range(-1,2):
                if (dx+dy)%2==0:d.point((cx+dx,cy+dy),fill=(163,105,52))
    # Papel dobrado, etiqueta sem texto e pequenas estampas nos presentes.
    for x,y in ((405,167),(462,174),(421,183),(450,167)):
        line(d,(x,y,x+5,y+4),(76,43,34))
        rect(d,(x+3,y+1,x+5,y+3),(219,193,139))
        d.point((x+4,y+1),fill=(109,76,47))
    # Pinças de ferro e pá ao lado do fogo, com rebites e reflexos.
    for x in (362,365):
        line(d,(x,130,x+2,149),(28,28,31),2)
        line(d,(x,130,x+2,148),(160,116,68))
        d.ellipse((x-1,127,x+1,130),outline=(181,134,77))
    d.polygon([(365,147),(370,147),(370,152),(366,153)],fill=(62,61,58))
    line(d,(366,148,369,148),(193,141,80))


def room_life(img):
    """Objetos de uso, construídos em planos, com acabamento na grade nativa."""
    d=ImageDraw.Draw(img)
    # Mesa baixa de chá sob a janela, com pés torneados e tampo octogonal.
    d.ellipse((193,162,230,168),fill=(24,21,24))
    for x in (198,223):
        line(d,(x,148,x-1 if x<210 else x+1,163),(45,29,24),3)
        for y in (151,156,161):
            rect(d,(x-1,y,x+1,y+1),(132,87,47))
        line(d,(x,149,x,162),(174,116,59))
    d.polygon([(195,143),(201,140),(222,140),(229,144),(229,148),(223,151),(199,151),(194,148)],fill=(43,26,22))
    d.polygon([(195,143),(202,140),(222,140),(228,144),(223,147),(200,147)],fill=(131,83,43))
    line(d,(198,147,223,147),(197,136,73))
    for y in (142,144,146):line(d,(201,y,222,y),(91,53,30))
    # Toalhinha rendada e bandeja de latão.
    d.ellipse((200,141,224,147),fill=(190,159,108),outline=(228,203,147))
    for x in range(201,224,2):d.point((x,147),fill=(230,199,138))
    d.ellipse((203,141,220,145),fill=(114,78,39),outline=(218,170,82))
    # Bule de cerâmica verde: barriga, tampa, bico, alça e esmalte.
    d.ellipse((206,134,215,143),fill=(34,75,62),outline=(20,35,32))
    d.arc((213,134,220,141),265,100,fill=(127,151,107),width=1)
    d.polygon([(207,138),(202,134),(203,139),(207,141)],fill=(67,113,86))
    rect(d,(208,133,213,134),(148,162,109))
    d.point((211,132),fill=(211,183,115))
    line(d,(208,136,208,140),(161,187,137))
    # Xícara e biscoitos, com borda de porcelana e miolo de chocolate.
    d.ellipse((218,142,225,145),fill=(217,188,129))
    rect(d,(219,138,222,142),(230,211,163))
    line(d,(219,138,222,138),(108,64,37))
    d.arc((222,138,225,141),260,100,fill=(214,179,119))
    for x,y in ((202,143),(205,144),(217,144)):
        d.point((x,y),fill=(210,149,70)); d.point((x+1,y),fill=(106,61,32))
    # Um livro aberto apoiado na travessa debaixo da mesa.
    d.polygon([(202,155),(210,156),(218,154),(218,158),(210,160),(202,158)],fill=(157,112,61))
    d.polygon([(203,154),(210,155),(217,153),(217,157),(210,159),(203,157)],fill=(212,189,135))
    line(d,(210,155,210,159),(91,64,40))
    for x in (204,213):line(d,(x,156,x+3,156),(153,130,88))
    # Cesto de tricô no primeiro plano, sem ocupar o tapete do esqueleto.
    d.ellipse((251,180,277,191),fill=(37,26,23),outline=(123,79,43))
    for y in range(183,191):
        for x in range(253,276):
            if ((x//2)+(y//2))%2==0:
                d.point((x,y),fill=(160,105,55) if y%2 else (98,61,34))
    d.ellipse((252,179,276,185),fill=(50,31,25),outline=(197,137,72))
    for x,y,c in ((258,181,(153,47,48)),(266,181,(57,105,76)),(271,183,(194,153,89))):
        d.ellipse((x-3,y-3,x+3,y+2),fill=c,outline=shade(c,.60))
        for off in (-1,1):d.arc((x-2+off,y-2,x+2+off,y+2),50,250,fill=shade(c,1.45))
    for x in (267,270):
        line(d,(x,183,x+5,171),(180,151,99))
        d.point((x+5,171),fill=(240,216,157))
    line(d,[(256,184),(251,188),(248,189),(246,187),(248,185)],(165,63,56))
    # Cachecol em progresso, franjas individuais e padrão xadrez.
    for y in range(184,194):
        for x in range(267,274):
            d.point((x,y),fill=(151,49,45) if ((x//2+y//3)%2) else (85,31,32))
    for x in range(267,274,2):line(d,(x,193,x,195),(193,107,71))
    # Guirlanda artesanal na parede, à direita do poleiro.
    for k in range(48):
        a=k*math.tau/48
        x=393+round(math.cos(a)*8); y=91+round(math.sin(a)*10)
        d.ellipse((x-1,y-1,x+1,y+1),fill=((32,70,41),(61,99,49),(89,120,60))[k%3])
        if k%7==0:d.point((x,y),fill=(189,54,43))
    for dx in (-1,1):
        d.polygon([(393,101),(393+dx*6,99),(393+dx*4,104)],fill=(169,48,42))
        line(d,(393,103,393+dx*3,109),(125,35,34))
    d.point((393,102),fill=(241,142,83))
    # Pequeno trenó de madeira com manta dobrada ao pé da árvore.
    for y in (191,195):line(d,(434,y,465,y),(156,104,58))
    for x in (438,460):line(d,(x,186,x,195),(87,53,32),2)
    for x in range(435,463,4):board(d,x,185,x+2,190,(113,71,38),x)
    for y in range(181,187):
        for x in range(442,458):
            d.point((x,y),fill=(140,47,43) if ((x//3+y//2)%2) else (73,33,33))
    line(d,(442,181,457,181),(207,142,89))
    # Pacote de cartas fechado com barbante; nenhum texto rasterizado.
    d.polygon([(282,175),(291,174),(294,179),(284,181)],fill=(169,130,78))
    d.polygon([(283,174),(290,173),(293,177),(285,179)],fill=(216,190,134))
    line(d,(286,174,289,179),(103,67,37))
    line(d,(283,177,292,175),(115,75,41))
    d.point((288,176),fill=(164,49,37))


def preview_complete(image, mascots=False, frame=2):
    """Montagem local para avaliação; a pintura de produção preserva camadas separadas."""
    out=image.convert('RGBA')
    fire=Image.open(OUT/'fogo.png').convert('RGBA').crop((frame*40,144,(frame+1)*40,192)).resize((120,144),Image.Resampling.NEAREST)
    out.alpha_composite(fire,(278*3,104*3))
    sword=Image.open(OUT/'espada.png').convert('RGBA').resize((36,120),Image.Resampling.NEAREST)
    out.alpha_composite(sword,(292*3,109*3))
    if mascots:
        shadow=Image.new('RGBA',out.size)
        sd=ImageDraw.Draw(shadow)
        sd.ellipse((332*3,161*3,379*3,170*3),fill=(7,9,16,145))
        shadow=shadow.filter(ImageFilter.GaussianBlur(3))
        out.alpha_composite(shadow)
        sheet=Image.open(ROOT/'public/pixel/mascote/esqueleto-poses4.png').convert('RGBA')
        sw,sh=sheet.size; frame=sheet.crop((0,0,sw//8,sh//5)).resize((138,201),Image.Resampling.NEAREST)
        out.alpha_composite(frame,(333*3,100*3))
        cat=Image.open(ROOT/'public/pixel/mascote/gato-fofo.png').convert('RGBA').crop((0,0,64,48)).resize((96,72),Image.Resampling.NEAREST)
        out.alpha_composite(cat,(378*3,145*3))
        owl=Image.open(ROOT/'public/pixel/mascote/coruja-nova.png').convert('RGBA').crop((0,0,44,32)).resize((99,72),Image.Resampling.NEAREST)
        out.alpha_composite(owl,(356*3,54*3))
    return out.convert('RGB')


def tree_refined(img):
    # O mesmo pincel de agulhas usado na Praça do Pinheiro, com escala e chão
    # ajustados ao interior; mantém a família visual dos cenários do site.
    import inicio_praca as praca
    praca.PINHEIRO=(435,169)
    layer,emission=praca.Camada(),praca.Camada()
    global TREE_LIGHTS
    TREE_LIGHTS=praca.pinheiro_praca(layer,emission,{"luzes_k":1.0})
    rgba=Image.fromarray(np.uint8(np.clip(layer.c,0,1)*255))
    img.paste(rgba,(0,0),rgba)
    d=ImageDraw.Draw(img)
    board(d,425,168,445,176,(107,70,43),321)
    for y in (169,175):line(d,(425,y,445,y),(114,105,78))


def light(img, name, p):
    arr=np.asarray(img,dtype=np.float32)/255
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    # Ambiente com sombra azul e duas fontes rebatidas: janela e braseiro.
    fire=np.exp(-(((xx-298)/79)**2+((yy-140)/61)**2)*1.35)*p["fire"]
    win=np.exp(-(((xx-237)/101)**2+((yy-96)/98)**2)*1.4)*p["day"]
    # Faixas discretas: mantenha a queda pixelada, sem aspecto de airbrush.
    fire=(np.floor(fire*8)/8)*.64+fire*.36
    win=(np.floor(win*7)/7)*.72+win*.28
    # Luz que atravessa os caixilhos e projeta sombras longas no assoalho.
    floor=yy>129
    beam=np.zeros((H,W),np.float32)
    for origin in (203,224,260,280):
        center=origin+(yy-127)*(-1.05 if name=="manha" else -.55)
        beam=np.maximum(beam,np.clip(1-np.abs(xx-center)/np.maximum(2,4+(yy-127)*.1),0,1)*floor)
    beam*=({"manha":.48,"tarde":.38,"noite":.13}[name])
    blue=np.array(p["blue"],np.float32)/255
    warm=np.array(p["warm"],np.float32)/255
    # Piso reflexivo: madeira capta a brasa em traços entre as tábuas.
    reflection=np.exp(-((xx-300)/24)**2)*np.clip((yy-155)/50,0,1)*floor*(np.sin(xx*1.1+yy*.3)>.4)
    ambient=({"manha":.74,"tarde":.66,"noite":.53}[name])
    result=arr*(ambient+win[...,None]*blue*.90+fire[...,None]*warm*1.75+beam[...,None]*blue*.65)
    # Oclusão nas junções e sombras a partir da lareira: árvore, lenheiro,
    # soleira e cesto projetam silhuetas na direção oposta à fonte quente.
    contact=np.exp(-((yy-130)/2.5)**2)*.17
    contact+=np.exp(-(((xx-435)/24)**2+((yy-177)/3.2)**2))*.50
    contact+=np.exp(-(((xx-391)/16)**2+((yy-170)/2)**2))*.35
    contact+=np.exp(-(((xx-244)/14)**2+((yy-154)/2)**2))*.32
    trunk_shadow=(yy>172)&(np.abs(xx-(435+(yy-172)*1.6))<4+(yy-172)*.10)
    contact+=trunk_shadow*.36
    result*=np.clip(1-contact,.25,1)[...,None]
    # Luz indireta: as pedras e o piso recebem energia mesmo quando a textura é escura.
    result+=fire[...,None]*warm*.19
    result+=win[...,None]*blue*.045
    core=np.exp(-(((xx-298)/31)**2+((yy-147)/22)**2)*1.6)
    result+=core[...,None]*warm*.22*p["fire"]
    # Reflexos longos da boca sobre as tábuas, interrompidos pelas juntas.
    stripe=np.exp(-((xx-299)/38)**2)*np.clip((yy-153)/45,0,1)*floor
    stripe*=.5+.5*(np.sin(xx*.78+yy*.32)>.15)
    result+=stripe[...,None]*warm*.095*p["fire"]
    # As barras da janela cortam o feixe e marcam o chão em azul.
    result+=beam[...,None]*blue*.13
    result+=reflection[...,None]*warm*.25*p["fire"]
    niche=((xx>=277)&(xx<=321)&(yy>=113)&(yy<=149))|((((xx-299)/21)**2+((yy-117)/19)**2<1)&(yy<117))
    result*=np.where(niche,.20+.80*np.clip((yy-103)/45,0,1)**1.4,1)[...,None]
    for tx,ty,cor in TREE_LIGHTS:
        color=np.array([int(cor[i:i+2],16)/255 for i in (1,3,5)],np.float32)
        glow=np.exp(-(((xx-tx)/9)**2+((yy-ty)/8)**2)*1.5)
        result+=glow[...,None]*(arr*.34+.025)*color
    # A área sob o título precisa permanecer calma e escura.
    left=np.clip((xx-105)/120,0,1)
    result*=((.73+.27*left)[...,None])
    # Emissão nas brasas, lanternas e luzinhas preserva pontos brilhantes.
    emit=np.zeros((H,W,3),np.float32)
    hot=((xx>=280)&(xx<=320)&(yy>=143)&(yy<=150))
    emit[hot]=arr[hot]*.72*p["fire"]
    for cx,cy in ((314,71),(435,58),(444,91),(415,104),(450,127)):
        glow=np.exp(-(((xx-cx)/7)**2+((yy-cy)/7)**2)*2.1)
        emit+=glow[...,None]*warm*.14
    for level in range(1,8):
        ty=46+level*13
        width=4+level*3.6
        for k in range(5):
            tx=int(435-width+2*width*k/4)
            sy=ty+int(2*math.sin(k*1.8+level))
            glow=np.exp(-(((xx-tx)/4)**2+((yy-sy)/4)**2)*2.2)
            emit+=glow[...,None]*warm*.20
            emit[sy,tx]=np.maximum(emit[sy,tx],np.array((.9,.72,.36),np.float32))
    for tx in range(260,353,9):
        sy=68+int(3*math.sin((tx-260)/93*math.pi))+1
        glow=np.exp(-(((xx-tx)/3)**2+((yy-sy)/3)**2)*2.2)
        emit+=glow[...,None]*warm*.10
    result+=emit
    # Segundo rebote quente: o piso devolve luz ao rodapé e à mobília.
    bounce=np.exp(-(((xx-322)/111)**2+((yy-159)/37)**2)*1.6)
    result+=bounce[...,None]*np.array((1.0,.48,.16))*arr*.43
    # A lamparina da direita ilumina a madeira e os objetos próximos.
    lamp=np.exp(-(((xx-367)/23)**2+((yy-108)/32)**2)*1.7)
    result+=lamp[...,None]*np.array((1.0,.66,.25))*(arr*.8+.045)
    # Reflexos interrompidos pelo relevo das tábuas, com queda por distância.
    reflection2=np.exp(-((xx-299)/30)**2)*np.exp(-np.maximum(yy-154,0)/38)*(yy>154)
    reflection2*=.24+.76*(np.sin(yy*2.3+np.sin(xx*.5))>.55)
    result+=reflection2[...,None]*np.array((1,.52,.16))*.12*p['fire']
    # Sombras projetadas por lenheiro e presentes na direção oposta ao fogo.
    sm=Image.new('L',(W,H)); sd=ImageDraw.Draw(sm)
    sd.polygon([(233,153),(258,153),(232,166),(210,162)],fill=85)
    sd.polygon([(401,183),(417,183),(445,197),(423,194)],fill=90)
    shadow=np.asarray(sm.filter(ImageFilter.GaussianBlur(.65)),dtype=np.float32)/255
    result*=1-shadow[...,None]
    for tx,ty,cor in TREE_LIGHTS:
        ix,iy=int(tx),int(ty)
        if 0<=ix<W and 0<=iy<H:
            result[iy,ix]=np.array([int(cor[i:i+2],16)/255 for i in (1,3,5)])
    # Vinheta e grão de um pixel; bloom muito discreto só nas fontes.
    vignette=1-.19*np.clip(((xx-240)/260)**2+((yy-100)/140)**2,0,1)
    result*=vignette[...,None]
    noise=np.random.default_rng(621).normal(0,.008,(H,W,1)).astype(np.float32)
    result=result+noise
    # Compressão suave das altas luzes preserva cerâmica, papel e fios da lã.
    result=np.where(result>.78,.78+.22*(1-np.exp(-np.maximum(result-.78,0)/.34)),result)
    result=np.clip(result,0,1)
    native=Image.fromarray(np.uint8(result*255))
    big=native.resize((1440,600),Image.Resampling.NEAREST)
    bloom=big.filter(ImageFilter.GaussianBlur(8))
    # O bloom incide apenas no terço direito e é fraco para não apagar o pixel.
    mixed=Image.blend(big,bloom,.025)
    # Bloom calculado só a partir das fontes; preserva as quinas dos materiais.
    source=np.zeros((H,W,3),np.float32)
    for tx,ty,cor in TREE_LIGHTS:
        ix,iy=int(tx),int(ty)
        if 0<=ix<W and 0<=iy<H:source[iy,ix]=(1,.68,.24)
    source[103:113,367]=(1,.62,.20)
    source[145:150,282:317]=(1,.36,.06)
    source[69:73,313:316]=(1,.70,.28)
    src=Image.fromarray(np.uint8(np.clip(source,0,1)*255)).resize((1440,600),Image.Resampling.NEAREST)
    near=np.asarray(src.filter(ImageFilter.GaussianBlur(4)),dtype=np.float32)/255
    far=np.asarray(src.filter(ImageFilter.GaussianBlur(23)),dtype=np.float32)/255
    final=np.asarray(mixed,dtype=np.float32)/255
    final=1-(1-final)*np.exp(-(near*.42+far*1.7))
    mixed=Image.fromarray(np.uint8(np.clip(final,0,1)*255))
    return mixed


def render(name):
    p=PALETTES[name]
    img=Image.new("RGB",(W,H),p["wall"])
    wall_and_floor(img,p)
    mountains_in_window(img,name)
    fireplace(img)
    log_rack(img)
    hearth_details(img)
    holiday_wall(img)
    rug(img)
    basket(img)
    tree_refined(img)
    gifts(img)
    fine_details(img)
    room_life(img)
    foreground(img)
    return light(img,name,p)


def main():
    names=sys.argv[1:] or list(PALETTES)
    for name in names:
        if name not in PALETTES: raise SystemExit(f"Período desconhecido: {name}")
        image=render(name)
        image.save(OUT/f"cena-sala-natal-{name}.webp","WEBP",quality=84,method=6)
        image.resize((960,400),Image.Resampling.NEAREST).save(OUT/f"cena-sala-natal-{name}-960.webp","WEBP",quality=82,method=6)
        print(name,(OUT/f"cena-sala-natal-{name}.webp").stat().st_size)
    (ROOT/"scripts/cenarios/cena-sala-natal.json").write_text(json.dumps({
        "dimensoes":[480,200],"area_texto":[0,0,190,200],"fogo":[298,146],
        "mascote":{"x":333,"y":100,"w":46,"h":67},
        "gato":[[378,149],[363,170],[427,170]],"coruja":[[372,78],[244,124],[346,77]],
        "janela":[193,35,289,119],"lareira":[276,97,322,151]
    },ensure_ascii=False,indent=2)+"\n")


if __name__=="__main__": main()
