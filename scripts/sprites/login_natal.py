"""Roupas natalinas locais do login; mesmo rig e rosto aprovado, 16 quadros por ação.
Não altera as folhas utilizadas pelas outras páginas. Python + numpy + Pillow.
"""
import sys,math
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts'))
import gerar_mascote as m
OUT=ROOT/'public/pixel/acesso/alpino';OUT.mkdir(parents=True,exist_ok=True)
N=16;m.NQ=N;m.GQ=N
m._sn=lambda k,n=N,desloc=0:math.sin((k+desloc)/n*math.tau)

def roupa(t,r,p):
 m.roupa_social(t,r,p)
 q=r.tronco
 # Colete vermelho por dentro do cardigã verde; costuras e botões de latão.
 colete=q.forma(m.poligono([(-3,-25),(3,-25),(4,-12),(2,2),(-3,2),(-4,-12)]))
 t.pinta(colete,'la',6.22,R=2,pid='colete_natal',uv=q.uv(),semente=13011)
 for yy in [-19,-13,-7,-1]:
  t.pinta(q.forma(m.circulo((.6,yy),.5)),'latao',6.28,R=.6,pid='botao_natal',sem_contorno=True)
 for lado in [-1,1]:
  costura=q.forma(m.capsula((lado*10,-20),(lado*10,3),.3))
  t.pinta(costura,'la_creme',0,sobre='blz_'+str(lado),tom=-.2,normal=False)
  for j in range(8):
   t.pinta(q.forma(m.circulo((lado*9.8,-20+j*2.9),.24)),'la_creme',0,sobre='blz_'+str(lado),normal=False)
 # Broche de estrela preso à lapela, com cinco pontas, sem mudar crânio/rosto.
 pts=[]
 for j in range(10):
  a=-math.pi/2+j*math.pi/5;r0=1.5 if j%2==0 else .65;pts.append((8.6+math.cos(a)*r0,-18.3+math.sin(a)*r0))
 t.pinta(q.forma(m.poligono(pts)),'latao',6.6,R=.5,pid='estrela_natal')

def aceno(k,estado):
 t=k/N
 if estado=='repouso':v=.035*math.sin(t*math.tau);onda=0
 elif estado=='saudar':v=math.sin(math.pi*t)**2;onda=math.sin(t*math.tau*3)*v
 else:v=.75+.2*math.sin(t*math.pi);onda=math.sin(t*math.tau*2)*.8
 return v,(14+90*v,6+144*max(0,v)**.6+12*onda,4+154*max(0,v)**.6+16*onda,'aberta')

folha=Image.new('RGBA',(96*N,128*3))
for linha,estado in enumerate(['repouso','saudar','comemorar']):
 for k in range(N):
  m._aceno=lambda kk,e=estado:aceno(kk,e)
  t=m._q_acesso(k,roupa,'livro_vinho','anel');t.luz(-18,95,30,'#ffb65a',110,.45)
  im=Image.fromarray(t.render());folha.alpha_composite(im,(k*96,linha*128))
folha.save(OUT/'anfitriao-natal.png',optimize=True)
folha.resize((folha.width,folha.height),Image.Resampling.NEAREST).save('/tmp/anfitriao-natal-prancha.png')

folha=Image.new('RGBA',(64*N,40*3))
for linha in range(3):
 for k in range(N):
  t=m.Tela(64,40)
  if linha==0:m.gato_dormindo(t,k)
  else:
   f=k/N*math.tau; salto=max(0,math.sin(f))*2 if linha==2 else 0
   pts=m.bezier((21,34-salto),(9+math.sin(f)*3,29-salto),(13+math.sin(f)*5,17-salto),10)
   m.gato_sentado_v(t,k,pts,dy=-salto,cabeca_inc=-8+math.sin(f)*3,olhar=(-.45,-.5),pisca=k in [10,11],pata1=(1,-salto*1.4) if linha==2 else None)

  # Tecido acompanha a silhueta do corpo, respeitando cabeça, cauda e patas no buffer de profundidade.
  t.pinta(m.elipse((28,29.5),12,8),'blazer',0,sobre='corpo',R=4,semente=82)
  for yy in [24,27,30,33]:t.pinta(m.capsula((18,yy),(36,yy),.3),'la',0,sobre='corpo',normal=False)
  for xx in [21,26,31,36]:t.pinta(m.capsula((xx,22),(xx,35),.3),'la_creme',0,sobre='corpo',normal=False,tom=-.2)
  t.pinta(m.poligono([(35,28),(38,30),(36,34),(32,32)]),'la',3.45,R=1,pid='lenco_natal')
  t.pinta(m.capsula((33,31),(31+math.sin(k/N*math.tau)*.7,36),.9),'la',3.45,R=1,pid='ponta_lenco')
  t.pinta(m.circulo((35,33),.7),'latao',3.6,R=.6,pid='sino_lenco')
  folha.alpha_composite(Image.fromarray(t.render()),(k*64,linha*40))
folha.save(OUT/'gato-natal.png',optimize=True)
print('Anfitrião e gato: três ações, 16 quadros cada, folhas locais geradas.')
