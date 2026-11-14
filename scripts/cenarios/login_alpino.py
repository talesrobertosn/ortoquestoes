"""Pousada de Natal no Vale: pintura vertical para Entrar/Criar conta.

Mesmo pincel das montanhas do Refúgio da Neve e do Natal no Vale. Arte original por código,
semente fixa, sem texto nem personagens. Uma composição, exportada em faixas contíguas com
bloom calculado com sobreposição. Desktop 480×900; celular recomposto em 296×3300.
Uso: python scripts/cenarios/login_alpino.py [manha|tarde|noite] [pc|movel]
"""
from __future__ import annotations
import sys, math, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts'));sys.path.insert(0,str(ROOT/'scripts/cenarios'))
import inicio_vale as vale
import inicio_neve as neve
OUT=ROOT/'public/pixel/acesso/alpino'
CORES={
 'manha':dict(amb=(.79,.87,.83),sol=(.35,.28,.16),fogo=.50,ceu='#8cb7ca'),
 'tarde':dict(amb=(.66,.65,.68),sol=(.48,.29,.16),fogo=.80,ceu='#cf9d86'),
 'noite':dict(amb=(.25,.32,.43),sol=(.08,.10,.18),fogo=1.2,ceu='#15243b'),
}
def rgb(s):return np.array(tuple(bytes.fromhex(s.lstrip('#'))),dtype=np.float32)/255

def hash(x,y,s=0):
 n=(np.asarray(x,dtype=np.int64)*374761393+np.asarray(y,dtype=np.int64)*668265263+s*2246822519)&0xffffffff
 n=((n^(n>>13))*1274126177)&0xffffffff
 return ((n^(n>>16))&65535)/65535

def mistura(a,b,t):return tuple(np.clip(rgb(a)*(1-t)+rgb(b)*t,0,1)*255)

class Pintor:
 def __init__(self,w,h,hora,seed=13011):
  self.w,self.h,self.hora=w,h,hora;self.g=np.random.default_rng(seed);self.im=Image.new('RGB',(w,h),'#34513a');self.d=ImageDraw.Draw(self.im);self.luzes=[];self.contatos=[];self.em=Image.new('RGB',(w,h));self.e=ImageDraw.Draw(self.em)
 def ret(self,x,y,w,h,c):
  if w>0 and h>0:self.d.rectangle((int(x),int(y),max(int(x),int(x+w-1)),max(int(y),int(y+h-1))),fill=c)
 def linha(self,a,b,c,w=1):self.d.line((tuple(map(int,a)),tuple(map(int,b))),fill=c,width=w)
 def poli(self,p,c):self.d.polygon([(int(x),int(y)) for x,y in p],fill=c)
 def oval(self,x,y,rx,ry,c):self.d.ellipse((int(x-rx),int(y-ry),int(x+rx),int(y+ry)),fill=c)
 def luz(self,x,y,r,k=1):self.luzes.append((x,y,r,k))
 def ponto_luz(self,x,y,c='#ffd184'):
  self.ret(x,y,1,1,c);self.e.point((int(x),int(y)),fill=c)
 def madeira(self,x,y,w,h,vertical=False,seed=0):
  for j in range(int(h)):
   for i in range(int(w)):
    f=(i if vertical else j)%5;v=hash(i//(1 if vertical else 5),j//(5 if vertical else 1),seed)
    col=['#35271e','#745035','#92663f','#815736','#523a28'][f]
    if v>.89:col='#ad8250'
    self.ret(x+i,y+j,1,1,col)
  self.linha((x,y),(x+w-1,y),'#c0945c');self.linha((x+w-1,y),(x+w-1,y+h-1),'#2e241d')
 def pedra(self,x,y,w,h,seed=0,alt=5):
  for yy in range(int(y),int(y+h),alt):
   fila=(yy-int(y))//alt;xx=int(x)-int(hash(fila,1,seed)*12)
   while xx<x+w:
    larg=9+int(hash(xx,yy,seed)*9);co=mistura('#52605b','#bcad8b',hash(xx//3,yy,seed+1))
    xa=max(x,xx);xb=min(x+w,xx+larg-1)
    if xb>xa:
     self.ret(xa,yy,xb-xa,min(alt-1,y+h-yy),tuple(map(int,co)));self.linha((xa,yy),(xb-1,yy),'#b9ac8d')
     if hash(xx,yy,seed+3)>.75:self.ret(xa+1,yy+alt-2,min(3,xb-xa),1,'#4c6944')
    xx+=larg
 def folhas(self,x,y,r=10,seed=0,flores=False):
  g=np.random.default_rng(seed)
  for i in range(int(r*5)):
   xx=x+g.normal(0,r*.55);yy=y+g.normal(0,r*.35)
   self.oval(xx,yy,1+g.integers(2),1,['#213c2b','#375c34','#56753c','#78934b','#a7ab59'][i%5])
   if flores and i%11==0:self.ret(xx,yy,1,1,['#e5ca89','#d88b82','#fff1c3'][i%3])
 def pinheiro(self,x,y,h=24,seed=0,natal=False):
  self.madeira(x-1,y-h*.6,3,h*.6,True,seed)
  for j in range(4):
   yy=y-h+j*h*.22;ww=h*(.15+j*.07)
   self.poli([(x,yy),(x-ww,yy+h*.30),(x+ww,yy+h*.30)],['#213a2c','#365637','#466b3c','#597c43'][j])
   for k in range(15):
    xx=x+(hash(j,k,seed)-.5)*ww*1.8;py=yy+h*.18+hash(k,j,seed)*h*.10
    self.ret(xx,py,2,1,'#83a052' if k%3 else '#263f2c')
   if natal:
    for k in range(4):self.ponto_luz(x+(k/3-.5)*ww*1.4,yy+h*.25+math.sin(k)*2,'#f7d091' if k%2 else '#d9734c')
  if natal:
   self.linha((x-2,y-h),(x+2,y-h),'#ffe5a1');self.linha((x,y-h-3),(x,y-h+2),'#ffe5a1');self.luz(x,y-h*.5,h,.2)
 def guirlanda(self,x0,x1,y):
  for x in range(int(x0),int(x1)):
   yy=y+math.sin((x-x0)%24/24*math.pi)*4
   self.ret(x,yy,1,3,['#294631','#46663b','#76904e'][x%3])
   if x%5==0:self.ponto_luz(x,yy+3);self.luz(x,yy+3,7,.12)
   if x%24==0:
    self.poli([(x-4,yy-2),(x,yy),(x-4,yy+3)],'#a84434');self.poli([(x+4,yy-2),(x,yy),(x+4,yy+3)],'#cf6d45');self.ret(x,yy,1,5,'#da8861')
 def janela(self,x,y,w=10,h=13):
  self.ret(x-2,y-2,w+4,h+4,'#3a2a21');self.ret(x-1,y-1,w+2,h+2,'#bc9e6e');self.ret(x,y,w,h,'#ffc97e')
  for yy in range(h):self.ret(x,y+yy,w,1,tuple(map(int,mistura('#ffb35e','#fff0b9',1-yy/h))))
  self.ret(x+1,y+1,2,h-2,'#fff1c5');self.ret(x+w//2,y,1,h,'#755c3d');self.ret(x,y+h//2,w,1,'#755c3d')
  self.ret(x-2,y+h,w+4,2,'#d1b58a');self.e.rectangle((x,y,x+w,y+h),fill='#eab36d');self.luz(x+w/2,y+h*.7,w*4,.9)
 def casa(self,x,y,w=30,h=21,seed=0,grande=False):
  self.pedra(x,y,w,h,seed,alt=4 if not grande else 6)
  self.madeira(x,y,w,h*.47,False,seed)
  self.poli([(x-4,y+2),(x+w*.47,y-h*.60),(x+w+5,y+2)],'#37291f')
  for k in range(int(h*.58)):
   yy=y-int(h*.58)+k;meia=(k/(h*.58))*(w*.55)
   self.linha((x+w*.47-meia,yy),(x+w*.47+meia,yy),['#72503b','#9c7050','#513d30'][k%3])
  self.linha((x-4,y+2),(x+w*.47,y-h*.60),'#c49b63',2);self.linha((x+w*.47,y-h*.60),(x+w+5,y+2),'#ad8250',2)
  for k in range(3):self.janela(int(x+w*.17+k*w*.27),int(y+h*.55),max(3,int(w*.13)),max(4,int(h*.3)))
  self.ret(x+w*.44,y+h*.52,w*.15,h*.48,'#3f3528')
  self.ret(x+w*.52,y+h*.73,1,1,'#e3bd78')
  self.ret(x-2,y+h,w+4,3,'#5b5140')
  if grande:
   self.madeira(x-3,y+h*.4,w+6,3,False,seed);self.guirlanda(x-3,x+w+3,y+h*.35)
   for k in range(8):self.ret(x+k*w/8,y+h*.26,2,h*.16,'#a37b4e')
   for xx in range(int(x),int(x+w),4):self.ponto_luz(xx,y+4)
 def poste(self,x,y,h=30):
  self.contatos.append((x,y,7,2))
  self.ret(x-1,y-h,3,h,'#433d2b');self.ret(x-1,y-h,1,h,'#c3a36b');self.pedra(x-3,y-2,7,3,44,3)
  self.linha((x-7,y-h),(x+6,y-h),'#66533a',2);self.ret(x-6,y-h,4,8,'#644a2a');self.ret(x-5,y-h+2,2,5,'#ffe5aa');self.ponto_luz(x-5,y-h+4);self.luz(x-4,y-h+4,38,1.25)
 def presente(self,x,y,w=10,h=8,cor='#a9473d'):
  self.ret(x,y,w,h,'#392c24');self.ret(x,y,w-1,h-1,cor);self.ret(x+1,y+1,w-2,1,'#df9e70');self.ret(x+w//2,y,2,h,'#deb66e');self.ret(x,y+h//2,w,1,'#e9c684');self.linha((x+w//2,y),(x+w//2-3,y-3),'#f0ce8c');self.linha((x+w//2,y),(x+w//2+3,y-3),'#d2a566')

def topo(hora):
 p=Pintor(480,180,hora)
 per=vale.periodo(hora)
 p.im=Image.fromarray((np.clip(vale.pintar_ceu(hora,per),0,1)*255).astype('uint8')).crop((0,0,480,180));p.d=ImageDraw.Draw(p.im)
 for pontos,seed,neve_ate,fim,fog in [(vale.PICOS_LONGE,120,14,108,.28),(vale.PICOS_MEIO,140,10,115,.15)]:
  cam,di=neve.cordilheira(hora,per,pontos,seed,neve_ate,fim,1.0)
  a=cam.c[:180];color=a[:,:,:3]*(rgb(per['amb'])*per['amb_k']+rgb(per['sol'])*per['sol_k']*di[:180,:,None]);color=color*(1-fog)+rgb(per['nevoa'])*fog
  layer=Image.fromarray((np.clip(np.dstack((color,a[:,:,3])),0,1)*255).astype('uint8'));p.im.paste(layer,(0,0),layer);p.d=ImageDraw.Draw(p.im)
 # Paredão de calcário: o mesmo desenho das estrias do vale, verão nas plataformas.
 cliff=vale.paredao(hora,per,'e');ca=cliff.c.c[:180].copy();white=(ca[:,:,0]>.65)&(ca[:,:,1]>.65)&(ca[:,:,2]>.65);ca[white,:3]=rgb('#79945b')
 col=ca[:,:,:3]*(rgb(per['amb'])*per['amb_k']+rgb(per['sol'])*per['sol_k']*cliff.d[:180,:,None]);layer=Image.fromarray((np.clip(np.dstack((col,ca[:,:,3])),0,1)*255).astype('uint8'));p.im.paste(layer,(0,0),layer);p.d=ImageDraw.Draw(p.im)
 # Campos e rio no fundo: manchas com escala e caminhos de terra.
 ys,xs=np.mgrid[:180,:480];g=hash(xs//2,ys//2,231);hill=111+np.sin(xs/46)*4
 mask=ys>=hill;arr=np.array(p.im);grass=np.stack((52+g*24,84+g*35,49+g*17),2);arr[mask]=grass[mask];p.im=Image.fromarray(arr.astype('uint8'));p.d=ImageDraw.Draw(p.im)
 for yy in range(112,155):
  cx=229+(yy-112)*1.8+math.sin(yy*.09)*5;wid=2+(yy-112)*.22
  p.linha((cx-wid,yy),(cx+wid,yy),['#6eaaa5','#477f7c','#92bcb0'][yy%3])
 for i in range(24):
  x=204+(i*47)%270;y=111+(i*13)%27
  p.casa(x,y,10+i%5,7+i%4,seed=400+i)
 # Ferrovia horizontal para o trem em camada própria, estação e ponte.
 p.linha((155,111),(479,111),'#514c3a',2)
 for x in range(155,480,3):p.ret(x,110,1,4,'#9d8764')
 p.linha((155,109),(479,109),'#b6b4a1')
 p.casa(289,102,25,16,seed=98)
 for x in range(165,480,37):p.ret(x,97,1,14,'#716f56');p.linha((x,98),(x+37,98),'#686e62')
 # Cachoeira: véus d'água, variação de espessura e névoa na base.
 for y in range(45,113):
  cx=184+(y-45)*.04+math.sin(y*.11)*((y-45)/68)**2;w=1+((y-45)/68)**2*4
  for xx in range(int(cx-w),int(cx+w+1)):
   p.ret(xx,y,1,1,tuple(map(int,rgb(['#beded1','#d7e4d0','#9ec8bd','#e5e8ca'][(xx+y)%4])*255*(.6 if hora=='noite' else 1))))
 for i in range(36):p.oval(187+p.g.normal(0,5),113+p.g.normal(0,2),2,1,'#a3bca8')
 # Terraço e chalé de verão: textura no piso e objetos pousados.
 p.pedra(0,139,480,41,722,alt=7)
 # O chalé usa o mesmo pincel detalhado do Natal no Vale, com cobertura de verão.
 casa_p, casa_e = vale.Plano(), vale.Camada()
 neve_original, esp_original = vale.NEVE, vale.esp_neve
 try:
  vale.NEVE=vale.pal('#3e3128','#614633','#79553b','#936844','#ad8052','#c49d6a','#dfbf87')
  vale.esp_neve=lambda base:0
  janelas, lampioes, _=vale.chale(casa_p,casa_e,per,hora,[])
 finally:
  vale.NEVE, vale.esp_neve=neve_original, esp_original
 ar=casa_p.c.c[:180].copy()
 # Pendentes do beiral viram folhas secas e ramos do verão; mantém a geometria do prédio.
 gelo=(ar[:,:,2]>ar[:,:,0]*1.12)&(ar[:,:,1]>ar[:,:,0]*1.05)&(np.indices(ar.shape[:2])[0]<85)
 ar[gelo,:3]=rgb('#92a06a')
 camada=Image.fromarray((np.clip(ar,0,1)*255).astype('uint8'));p.im.paste(camada,(0,12),camada)
 p.d=ImageDraw.Draw(p.im)
 emissivo=Image.fromarray((np.clip(casa_e.c[:180,:,:3]*casa_e.c[:180,:,3:4],0,1)*255).astype('uint8'))
 p.em.paste(emissivo,(0,12));p.e=ImageDraw.Draw(p.em)
 for a,b,c,d in janelas:p.luz((a+c)/2,d+12,27,.9)
 for x,y in lampioes:p.luz(x,y+12,24,.8)
 p.guirlanda(122,360,127)
 for x in range(126,361,24):p.madeira(x,125,3,21,True,x);p.ret(x-1,124,5,2,'#d1aa6f')
 p.madeira(124,136,237,2,False,67)
 p.pinheiro(342,165,42,17,True)
 p.poste(353,159,33);p.poste(143,161,27)
 p.madeira(241,165,44,4,False,47);p.madeira(241,149,44,4,False,48)
 for x in [245,279]:p.madeira(x,153,3,23,True,x)
 for i in range(5):p.presente(322+i*11,171-i%2*4,9,7,['#a74838','#47634a','#c39b54'][i%3])
 p.oval(302,171,12,4,'#382d21');p.oval(302,169,12,4,'#bb9763');p.oval(302,168,10,2,'#9c4e3c')
 p.oval(222,164,17,6,'#534c3a')
 for i in range(15):
  a=i*math.tau/15;x=222+math.cos(a)*15;y=164+math.sin(a)*5;p.oval(x,y,3,2,['#9d9070','#6e6b54','#c2b18a'][i%3])
 p.luz(222,158,55,1.25)
 # Lugar do esqueleto: pés (262,176); coruja no poste (353,126); gato no cesto (302,169).
 for x in [15,75,120,410,470]:p.folhas(x,174,12,int(x),True)
 return p

def jardim(p,top=180):
 w,h=p.w,p.h;ys,xs=np.mgrid[:h,:w];r=hash(xs,ys,771);r2=hash(xs//4,ys//3,772)
 # Terra contínua, caminhos e rio. A escala cresce suavemente em direção ao primeiro plano.
 t=np.clip((ys-top)/max(1,h-top),0,1)
 base=np.stack((47+r*14+r2*14,72+r*22+r2*24,42+r*12+r2*11),2).astype('uint8')
 arr=np.array(p.im);arr[top:]=base[top:];p.im=Image.fromarray(arr);p.d=ImageDraw.Draw(p.im)
 xrio=w*.86+np.sin((ys-top)/h*math.tau*1.3)*w*.045
 larg=w*(.055+.045*t)
 agua=(abs(xs-xrio)<larg)&(ys>=top)
 arr=np.array(p.im);noise=hash(xs,ys,92);water=np.stack((48+noise*22,91+noise*31,90+noise*30),2)
 arr[agua]=water[agua];p.im=Image.fromarray(arr.astype('uint8'));p.d=ImageDraw.Draw(p.im)
 # Caminho na margem esquerda do rio, com juntas e pedras gastas.
 for y in range(top,h):
  tr=(y-top)/(h-top);cx=w*.51+math.sin(tr*math.pi*2)*w*.10;ww=w*(.22+.05*tr)
  for x in range(max(0,int(cx-ww)),min(w,int(cx+ww))):
   borde=(x-cx)/ww
   if abs(borde)>.9 and hash(x,y,55)>.4:continue
   co=['#74735b','#858168','#969075','#676c55','#a7a081'][int(hash(x//7,y//5,66)*5)%5]
   if y%8==0 or (x+(y//8%2)*7)%16==0:co='#4e5a46'
   p.ret(x,y,1,1,co)
 # Canteiros em camadas, com terra, bordas de pedra e flores.
 period=95 if w>300 else 285
 for y in range(top+38,h-30,period):
  for lado,x in enumerate([w*.055]):
   p.oval(x,y,w*.13,16,'#303e2c');p.oval(x,y-2,w*.125,14,'#64543b')
   for k in range(11):
    xx=x+(k-5)*w*.022;p.oval(xx,y+9,3,2,['#a49b79','#736f55','#b4aa83'][k%3])
   for k in range(10):p.folhas(x+(hash(k,y,7)-.5)*w*.21,y-5+(k%3)*3,5,y+k,True)
  # Pequenos postes e sombras da margem; todos os objetos preservam proporção.
  if y%(period*2)<period:p.poste(w*.10,y+33,27);p.poste(w*.76,y+45,25)
 # Raízes, pedras molhadas, grama e reflexos junto à margem do rio.
 g=np.random.default_rng(923)
 for i in range(int(h*.7)):
  y=int(g.integers(top,h));tr=(y-top)/(h-top);cx=w*.86+math.sin(tr*math.tau*1.3)*w*.045;ww=w*(.055+.045*tr)
  x=cx-ww-g.integers(0,7)
  p.oval(x,y,2+g.integers(3),1+g.integers(2),['#a29d7b','#677765','#516854','#c4b990'][i%4])
  if i%4==0:p.linha((cx-ww+2,y),(cx-ww+7+i%6,y),'#b2c9b2')
 for i in range(int(h*1.2)):
  x=int(g.integers(w));y=int(g.integers(top,h))
  if (x<w*.26 or x>w*.98) and i%3:p.linha((x,y),(x+g.integers(-2,3),y-g.integers(1,4)),['#75904b','#9aa35c','#345f39'][i%3])
 # Degraus na saída do terraço, travessas e nichos laterais.
 for k in range(7):
  y=top+k*5;lo=w*.27-k*.008*w;wi=w*.51+k*.016*w
  p.pedra(lo,y,wi,4,821+k,4);p.ret(lo,y+3,wi,1,'#3f4837')
 # Pontes para atravessar o rio em trechos visíveis entre os blocos.
 for y in [int(top+(h-top)*.30),int(top+(h-top)*.72)]:
  tr=(y-top)/(h-top);x=w*.86+math.sin(tr*math.tau*1.3)*w*.045;bw=w*.21
  p.madeira(x-bw/2,y,bw,16,False,12)
  for dx in np.arange(-bw/2,bw/2,9):p.madeira(x+dx,y-9,2,13,True,23)
  p.madeira(x-bw/2,y-11,bw,2,False,13);p.guirlanda(x-bw/2,x+bw/2,y-11);p.luz(x,y,35,.5)
 # Banco e presentes no jardim inferior.
 y=h-95;p.madeira(w*.24,y,w*.24,5,False,352);p.madeira(w*.24,y-16,w*.24,6,False,353)
 for x in [w*.26,w*.44]:p.madeira(x,y-12,3,26,True,36)
 p.presente(w*.49,y-4,16,12);p.presente(w*.56,y-7,12,14,'#54765b')
 p.poste(w*.14,h-55,45);p.pinheiro(w*.66,h-35,66,127,True)
 # Primeiro plano: bordas próximas, folhas grandes com volume e vinheta natural.
 for i in range(24):p.folhas(hash(i,1,73)*w,h-15+hash(i,2,74)*18,10+hash(i,3,75)*9,100+i,True)

def jardim_final(p):
 """Terceira passagem: o jardim termina numa ponte de pedra sobre o rio, com pérgola e luz própria."""
 w,h=p.w,p.h;s=w/480;y=h-250*s
 # O rio dobra para o primeiro plano, ao pé do jardim.
 for j in range(int(135*s)):
  yy=y+95*s+j;cx=w*.70-(j/max(1,135*s))*w*.20;ww=w*(.18+.12*j/max(1,135*s))
  for xx in range(max(0,int(cx-ww)),min(w,int(cx+ww))):
   k=hash(xx//2,int(yy),453)
   p.ret(xx,yy,1,1,tuple(map(int,mistura('#355b5a','#83a59a',k*.60))))
  if j%4==0:p.linha((cx-ww+3,yy),(cx-ww+12*s,yy),'#b3bca0')
 # O banco coberto: vigas, mão-francesa, telhado, trepadeira e objetos pequenos.
 x=w*.065;yp=y+20*s;pw=150*s
 for px in [x+10*s,x+pw-12*s]:
  p.madeira(px,yp+18*s,6*s,104*s,True,173)
  p.pedra(px-3*s,yp+120*s,12*s,8*s,191,4)
 p.poli([(x-5*s,yp+28*s),(x+pw*.52,yp),(x+pw+6*s,yp+28*s)],'#372e23')
 for j in range(max(1,int(26*s))):
  meia=j/max(1,26*s)*pw*.57
  p.linha((x+pw*.52-meia,yp+j),(x+pw*.52+meia,yp+j),['#946d43','#6e4e32','#b28a54'][j%3])
 p.linha((x-5*s,yp+28*s),(x+pw+6*s,yp+28*s),'#d1aa70',max(1,int(3*s)))
 p.madeira(x+10*s,yp+33*s,pw-22*s,5*s,False,173)
 for px,sgn in [(x+16*s,1),(x+pw-16*s,-1)]:
  p.linha((px,yp+65*s),(px+sgn*25*s,yp+38*s),'#7c5a35',max(1,int(5*s)))
  p.linha((px,yp+65*s),(px+sgn*25*s,yp+38*s),'#be9255',max(1,int(s)))
 for i in range(7):p.folhas(x+i*pw/7,yp+30*s,7*s,991+i)
 p.guirlanda(x,x+pw,yp+32*s)
 p.madeira(x+22*s,yp+95*s,pw-42*s,6*s,False,882);p.madeira(x+22*s,yp+76*s,pw-42*s,7*s,False,883)
 for px in [x+25*s,x+pw-25*s]:p.madeira(px,yp+97*s,4*s,22*s,True,12)
 # Almofada e manta com trama xadrez.
 p.ret(x+35*s,yp+90*s,33*s,6*s,'#a15c48')
 for xx in range(int(x+35*s),int(x+68*s),max(1,int(4*s))):p.ret(xx,yp+90*s,s,6*s,'#d2b076')
 for i in range(3):p.presente(x+(75+i*14)*s,yp+(108-i*3)*s,12*s,10*s,['#9d483c','#4a7051','#c6a567'][i])
 for px in [x+20*s,x+pw-20*s]:p.poste(px,yp+101*s,37*s)
 # Ponte arqueada: pedras individualizadas e arco aberto sobre a água.
 bx=w*.39;by=y+140*s;bw=w*.49;bh=57*s
 rio_antes=p.im.copy()
 p.pedra(bx,by,bw,bh,330,6)
 p.poli([(bx,by),(bx+bw*.5,by-13*s),(bx+bw,by),(bx+bw,by+7*s),(bx+bw*.5,by-5*s),(bx,by+7*s)],'#c0ad83')
 # A abertura termina no pé da ponte; a água segue por dentro do arco.
 mask=Image.new('L',(w,h));md=ImageDraw.Draw(mask)
 md.ellipse((int(bx+bw*.18),int(by+bh*.22),int(bx+bw*.82),int(by+bh*1.54)),fill=255)
 yy,xx=np.mgrid[:h,:w];m=np.array(mask);m[(yy<by)|(yy>by+bh)|(xx<bx)|(xx>bx+bw)]=0
 agua_sombra=Image.fromarray((np.array(rio_antes,dtype=np.float32)*.68).astype('uint8'))
 p.im.paste(agua_sombra,(0,0),Image.fromarray(m));p.d=ImageDraw.Draw(p.im)

 for i in range(14):
  a=math.pi+i*math.pi/13;cx=bx+bw*.5;cy=by+bh*.88
  p0=(cx+math.cos(a)*bw*.32,cy+math.sin(a)*bh*.66)
  p1=(cx+math.cos(a)*bw*.38,cy+math.sin(a)*bh*.85)
  p.linha(p0,p1,['#bfb18a','#9f997a','#817e63'][i%3],max(1,int(6*s)))
 for i in range(12):
  xx=bx+i*bw/11;yy=by-12*s*math.sin(i/11*math.pi)
  p.pedra(xx,yy-16*s,3*s,16*s,35+i,4)
 for i in range(60):
  x0=bx+i*bw/60;x1=bx+(i+1)*bw/60
  y0=by-16*s-12*s*math.sin(i/60*math.pi);y1=by-16*s-12*s*math.sin((i+1)/60*math.pi)
  p.linha((x0,y0),(x1,y1),'#c9b58a',max(1,int(3*s)))
  if i%3==0:p.ponto_luz(x0,y0+3*s);p.luz(x0,y0+3*s,9*s,.12)

 p.poste(bx-5*s,by+9*s,42*s);p.poste(bx+bw+5*s,by+9*s,42*s)
 # Reflexos compridos das lanternas, quebrados pela corrente.
 for i in range(35):
  yy=by+20*s+i*2*s;xx=bx+bw+2*s-math.sin(i*.8)*7*s-i*.55*s
  p.linha((xx-3*s,yy),(xx+4*s,yy),'#b8a26b' if i%3 else '#dbc38c')
 # Pinheiros, grandes folhas e flores próximas à câmera.
 p.pinheiro(w*.93,h-45*s,105*s,413)
 for i in range(22):
  xx=hash(i,2,692)*w;yy=h-12*s+hash(i,3,694)*8*s
  p.folhas(xx,yy,(8+hash(i,4,695)*10)*s,710+i,True)


def finalizar(p):
 arr=np.array(p.im,dtype=np.float32)/255;yy,xx=np.mgrid[:p.h,:p.w];t=np.clip((yy-105)/12,0,1)
 cf=CORES[p.hora];amb=np.array(cf['amb']);sol=np.array(cf['sol'])
 luz=np.broadcast_to(amb+sol*.42,arr.shape).copy()
 for x,y,r,k in p.luzes:
  dist=np.sqrt((xx-x)**2+((yy-y)*1.7)**2);v=np.clip(1-dist/r,0,1)**1.5;v=np.floor(v*7)/7
  luz+=v[:,:,None]*np.array([1,.56,.20])*k*cf['fogo']
 # Oclusão de contato: os postes se apoiam no piso, com sombra fria e borda macia.
 ao=np.zeros((p.h,p.w),dtype=np.float32)
 for x,y,rx,ry in p.contatos:
  ao=np.maximum(ao,np.exp(-((xx-x)/max(1,rx))**2-((yy-y)/max(1,ry))**2)*.3)
 arr*=1-ao[:,:,None]
 # O céu e as montanhas já trazem o tratamento da referência; o jardim recebe luz calculada.
 arr=arr*(1-t[:,:,None])+arr*luz*t[:,:,None]
 emissivo=np.array(p.em,dtype=np.float32)/255;arr=np.maximum(arr,emissivo*.9)
 arr=np.clip(arr,0,1);im=Image.fromarray((arr*255).astype('uint8'))
 return im

def gerar(hora,modo):
 print('Pintando',hora,modo,flush=True)
 cab=topo(hora)
 w,h=(480,900) if modo=='pc' else (296,3300)
 p=Pintor(w,h,hora)
 if modo=='pc':p.im.paste(cab.im,(0,0));p.em.paste(cab.em,(0,0));p.luzes=list(cab.luzes)
 else:
  p.im.paste(cab.im.crop((150,0,446,180)),(0,0));p.em.paste(cab.em.crop((150,0,446,180)),(0,0));p.luzes=[(x-150,y,r,k) for x,y,r,k in cab.luzes if x>120]
 p.d=ImageDraw.Draw(p.im);p.e=ImageDraw.Draw(p.em)
 jardim(p);jardim_final(p);base=finalizar(p)
 OUT.mkdir(parents=True,exist_ok=True)
 limites=[0,180,420,660,900] if modo=='pc' else [0,180,700,1220,1740,2260,2780,3300]
 for i,(a,b) in enumerate(zip(limites,limites[1:])):
  # A sobreposição impede emendas no bloom de uma faixa para a próxima.
  lo,hi=max(0,a-12),min(h,b+12)
  pedaco=base.crop((0,lo,w,hi)).resize((w*3,(hi-lo)*3),Image.Resampling.NEAREST)
  glow=Image.fromarray(np.maximum(np.array(pedaco,dtype=np.int16)-180,0).astype('uint8')).filter(ImageFilter.GaussianBlur(8))
  v=np.array(pedaco,dtype=np.float32)+np.array(glow,dtype=np.float32)*.25
  pedaco=Image.fromarray(np.clip(v,0,255).astype('uint8')).crop((0,(a-lo)*3,w*3,(b-lo)*3))
  nome=f'login-{hora}-{modo}-{i}'
  pedaco.save(OUT/(nome+'.webp'),quality=84,method=6)
  if modo=='pc':pedaco.resize((960,(b-a)*2),Image.Resampling.LANCZOS).save(OUT/(nome+'-960.webp'),quality=84,method=6)
  print(nome,(OUT/(nome+'.webp')).stat().st_size//1024,'KB',flush=True)
 base.resize((w*2,h*2),Image.Resampling.NEAREST).save('/tmp/login-alpino-'+hora+'-'+modo+'.png')
 (OUT/'ancoras.json').write_text(json.dumps({'pc':{'base':[480,900],'cabecalho':180,'faixas':limites if modo=='pc' else [0,180,420,660,900]},'movel':{'base':[296,3300],'recorteX':150,'cabecalho':180,'faixas':[0,180,700,1220,1740,2260,2780,3300]},'mascote':[238,112,48,64],'gato':[286,149,32,20],'coruja':[337,102,33,24],'trem':{'de':[144,105],'ate':[480,105]}},ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':
 horas=[x for x in sys.argv[1:] if x in CORES] or list(CORES)
 modos=[x for x in sys.argv[1:] if x in ['pc','movel']] or ['pc','movel']
 for hora in horas:
  for modo in modos:gerar(hora,modo)
