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
PALETTES = {
    "manha": {"wall": (56, 45, 39), "floor": (98, 75, 56), "sky": (125, 171, 205), "warm": (247, 169, 91), "blue": (137, 187, 222), "fire": .75, "day": 1.00},
    "tarde": {"wall": (56, 41, 39), "floor": (104, 67, 50), "sky": (185, 119, 151), "warm": (255, 165, 98), "blue": (179, 126, 167), "fire": 1.0, "day": .77},
    "noite": {"wall": (36, 33, 39), "floor": (75, 52, 43), "sky": (56, 77, 120), "warm": (255, 155, 70), "blue": (87, 125, 188), "fire": 1.50, "day": .42},
}


def h(*values: int) -> float:
    n = 2166136261
    for value in values:
        n = (n ^ int(value)) * 16777619 & 0xffffffff
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
        for col, x in enumerate(range(-13 if row%2 else 0, 490, 40)):
            board(d, x, y, x+39, y+7, wall, 100+row*37+col)
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
    # Vinheta e grão de um pixel; bloom muito discreto só nas fontes.
    vignette=1-.19*np.clip(((xx-240)/260)**2+((yy-100)/140)**2,0,1)
    result*=vignette[...,None]
    noise=np.random.default_rng(621).normal(0,.008,(H,W,1)).astype(np.float32)
    result=np.clip(result+noise,0,1)
    native=Image.fromarray(np.uint8(result*255))
    big=native.resize((1440,600),Image.Resampling.NEAREST)
    bloom=big.filter(ImageFilter.GaussianBlur(8))
    # O bloom incide apenas no terço direito e é fraco para não apagar o pixel.
    mixed=Image.blend(big,bloom,.035)
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
    tree(img)
    gifts(img)
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
        "gato":[[382,151],[363,170],[427,170]],"coruja":[[315,77],[244,124],[346,77]],
        "janela":[193,35,289,119],"lareira":[276,97,322,151]
    },ensure_ascii=False,indent=2)+"\n")


if __name__=="__main__": main()
