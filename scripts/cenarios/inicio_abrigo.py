"""Abrigo das Águas, aprovado por Tales em 09/11/2026.

Pixel art original 480x200 + luz em float 3x. Os mascotes, espada e chama
ficam em camadas interativas no site, nunca duplicados na pintura.
Uso: python3 scripts/cenarios/inicio_abrigo.py [manha|tarde|noite]
A prévia aprovada está documentada em docs/design/ABRIGO-DAS-AGUAS.md.
"""
from pathlib import Path
import sys, math, json
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'scripts/cenarios')]
import gerar_cena_inicio as a
import inicio_cais as lake
OUT=ROOT/'public/pixel/inicio';OUT.mkdir(parents=True,exist_ok=True)
W,H,S=480,200,3
Y,X=np.mgrid[:H,:W]; YY,XX=np.mgrid[:H*S,:W*S]/S
rng=np.random.default_rng(20261109)
F=(274,151)
STONE=a.pal('#172227','#263335','#3b4541','#50584c','#69715d','#889078','#abb294')
MOSS=a.pal('#132f26','#1d4230','#31583a','#4c7042','#6a8b4c')

def brick_layer():
 c=a.Camada();e=a.Camada()
 # Galeria aberta: o arco inteiro enquadra a vista, sem fechar o cenário.
 cx,cy,rx,ry=294,99,96,77
 d=((X-cx)/rx)**2+((Y-cy)/ry)**2
 inner=((X-cx)/75)**2+((Y-cy)/58)**2
 arch=(Y<=cy)&(d<=1)&(inner>=1)
 pillars=((X>=198)&(X<=215)|(X>=373)&(X<=390))&(Y>=95)&(Y<=146)
 wall=arch|pillars
 tex=a.fbm(171,(8,3,1),(0.4,0.4,0.2))
 # Blocos radiais, juntas profundas e faces chanfradas.
 angle=np.arctan2((Y-cy)/ry,(X-cx)/rx)
 radial=(angle+np.pi)/np.pi*19
 joints=(np.mod(radial,1)<.065)&arch
 n=np.floor(radial).astype(int)
 v=3.7+(tex-.5)*4.2+((X-cx)/rx)*.8
 mortar=((Y-95)%11==0)|((X+((Y-95)//11%2)*8)%17==0)
 joints|=pillars&mortar
 v[joints]=0
 cols=STONE[np.clip(v.astype(int),0,6)]
 c.mascara(wall,cols)
 # Lábio esculpido nas duas bordas da curva.
 edge=arch&((d>.95)|(inner<1.055))&~joints
 c.mascara(edge,STONE[4])
 # Pedras laterais vistas em perspectiva, capitéis e bases.
 for px in [197,373]:
  for base,ww in [(98,21),(104,19),(144,23),(148,26)]:
   c.ret(px-2,base,ww,3,STONE[2]);c.ret(px-2,base,ww,1,STONE[4])
 for k in range(250):
  xx=int(rng.integers(195,393)); yy=int(rng.integers(20,150))
  if wall[yy,xx] and rng.random()<.6:
   c.ret(xx,yy,int(rng.integers(1,4)),1,MOSS[int(rng.integers(0,4))])
 # Heras em pendentes com folhinhas assimétricas.
 for x0,y0,ln in [(210,69,32),(231,43,19),(343,39,27),(369,63,44),(388,101,30),(196,113,22)]:
  for t in range(ln):
   xx=int(x0+math.sin(t*.24)*2);yy=y0+t
   c.p(xx,yy,MOSS[1])
   if t%3==0:
    side=1 if t%6==0 else -1
    c.ret(xx+side,yy,2,2,MOSS[2+t%3]);c.p(xx+side*2,yy-1,MOSS[3])
 # Deux lanternes et consoles de fer forgé, sans symboles.
 for px,py in [(208,111),(382,113)]:
  c.linha(px-1,py-23,px+8,py-23,'#242b29');c.linha(px+8,py-23,px+8,py-17,'#242b29')
  a.lampiao(c,e,px+8,py,(-.6,-.8))
 return c,e,wall

def ground():
 c=a.Camada(); tex=a.fbm(117,(16,4,1),(0.3,0.4,0.3))
 ground=Y>126+np.sin(X/67)*2
 # Dallage à perspective: joints convergent et rangs se rapprochent du fond.
 rows=[128,134,142,153,167,184,200]
 joints=np.zeros((H,W),bool)
 for i in range(len(rows)-1):
  ya,yb=rows[i:i+2]; band=(Y>=ya)&(Y<yb)
  width=18+i*7; u=(X-294)/(1+(Y-128)/105).clip(.2)
  j=(np.mod(u+((i%2)*width*.5),width)<1.1)|((Y==ya))
  joints|=band&j
 v=2.6+(tex-.5)*2.7+((Y-128)/90)*.6
 v[joints]-=2
 c.mascara(ground,STONE[np.clip(v.astype(int),0,6)])
 # Chaque joint garde une lèvre lumineuse, plus de mousses près des marches.
 for y in rows[1:]:c.ret(0,y+1,W,1,STONE[3],.3)
 for k in range(600):
  xx=int(rng.integers(0,W));yy=int(rng.integers(128,H))
  if joints[yy,xx] and rng.random()<.58:c.ret(xx,yy,int(rng.integers(1,4)),1,MOSS[int(rng.integers(1,4))],.7)
 # Bord de la terrasse: trois marches puis l'eau à gauche.
 for y,x0,x1 in [(123,168,430),(126,154,438),(130,147,443)]:
  c.ret(x0,y,x1-x0,2,STONE[1]);c.ret(x0,y,x1-x0,1,STONE[4])
 return c,ground

def bonfire(c,em):
 fx,fy=F
 # Cendres, pierres et bûches; épée originale plantée légèrement de biais.
 c.mascara(a.elipse(fx,fy+2,17,6),'#121c1e')
 for k in range(12):
  t=k/12*2*math.pi
  a.pedra(c,fx+math.cos(t)*15,fy+math.sin(t)*4,3.5,2.7,(-.7,-.8),500+k,musgo=.2,paleta=STONE)
 for dx in [-7,2,6]:
  c.linha(fx+dx-6,fy-1,fx+dx+5,fy+2,'#281e19');c.linha(fx+dx-5,fy-2,fx+dx+5,fy+1,'#6a4730')
 # Flammes en langues de pixels, décalées; centres ivoire et oranges.
 for j,(dx,ht,wi) in enumerate([(-8,10,4),(-3,19,5),(2,25,4),(7,16,4),(11,9,3)]):
  pts=[(fx+dx-wi,fy),(fx+dx-wi+1,fy-5),(fx+dx-1,fy-ht+5),(fx+dx+2,fy-ht),(fx+dx+1,fy-ht+8),(fx+dx+wi,fy-5),(fx+dx+wi-1,fy)]
  em.mascara(a.poli(pts),'#ef6f27');
  core=[(fx+dx-wi+2,fy),(fx+dx,fy-ht+5),(fx+dx+2,fy-ht+3),(fx+dx+wi-1,fy)]
  em.mascara(a.poli(core),'#ffcb5e')
 em.mascara(a.elipse(fx,fy-2,7,4),'#ffe48c')
 for k in range(15):
  xx=int(fx+rng.normal(0,7));yy=int(fy-8-rng.random()*33)
  em.p(xx,yy,'#ffbd56',.65)

def props():
 c=a.Camada(); e=a.Camada()
 # Banc de voyage, sac et livres: peu d'accessoires, silhouette claire.
 for xx in [319,348]:
  c.ret(xx,153,3,15,'#3d352a');c.ret(xx+1,153,1,13,'#85704d')
 c.ret(315,151,42,4,'#463b2b');c.ret(315,150,42,1,'#b1935b')
 for xx in range(317,354,5):c.ret(xx,151,1,2,'#6c5c3a')
 a.livros(c,340,150)
 a.mochila(c,331,168,(-.5,-.8))
 # Lit de laine pour le chat.
 c.mascara(a.elipse(242,170,20,6),'#584238');c.mascara(a.elipse(242,169,18,4),'#987353')
 # Borne cassée / perchoir de la chouette.
 c.ret(361,104,18,34,STONE[2]);c.ret(375,104,4,34,STONE[0]);c.ret(361,104,18,1,STONE[5])
 c.ret(358,100,24,4,STONE[2]);c.ret(358,100,24,1,STONE[5])
 for yy in [114,125,136]:
  c.ret(361,yy,18,1,STONE[0]);c.ret(362,yy+1,12,1,STONE[3]);c.ret(367+(yy%2)*4,yy-9,1,9,STONE[1])
 # Vieilles pierres et herbe qui reprennent les bords du dallage.
 for k in range(1100):
  xx=int(rng.integers(0,W));yy=int(rng.integers(134,200))
  if xx<185 or xx>406:
   h=int(rng.integers(1,5));c.linha(xx,yy,xx+int(rng.integers(-2,3)),yy-h,MOSS[int(rng.integers(1,4))],.6)
 # Jardin de rive, fougères et pierres hors de la zone des personnages.
 for xx,yy,sz in [(177,148,7),(421,149,9),(411,180,12),(77,171,8),(148,186,11)]:
  a.pedra(c,xx,yy,sz,sz*.5,(-.5,-.8),int(xx),musgo=.7,paleta=STONE)
 for xx,yy in [(174,146),(420,143),(444,161),(145,178),(394,182)]:
  for k in range(7):
   dx=(k-3)*2;ht=9-abs(k-3)
   c.linha(xx,yy,xx+dx,yy-ht,'#31593c')
   for t in range(1,4):
    tx=xx+int(dx*t/4);ty=yy-int(ht*t/4)
    c.linha(tx-2,ty-1,tx+2,ty-2,'#56734b')
 return c,e

def montar(nome):
 global rng
 rng=np.random.default_rng(20261109)
 p=dict(lake.PERIODOS[nome]);p['ceu']={'manha':('#375965','#8fa8a0','#edd6a3'),'tarde':('#183942','#557374','#e1b475'),'noite':('#060e1c','#142b39','#2a444b')}[nome];p['luz']=(-.6,-.75)
 sky=lake.pintar_ceu(nome,p)
 far,near=lake.pintar_montes(nome,p)
 img=a.ampliar(sky)*.75
 for cam,fog,weight in [(far,.45,.68),(near,.18,.64)]:
  cc=a.ampliar(cam.c.copy());cc[:,:,:3]=cc[:,:,:3]*weight*(1-fog)+a.hexa('#7b9690')*fog
  img=a.sobre(img,a.desfocar_rgba(cc,1.7))
 # Bas versant boisé: raccord naturel entre les monts et la rive.
 ridge=85+2*np.sin(a.XA/19)+3*np.sin(a.XA/47)
 bank=a.Camada();bank.mascara((a.YA>=ridge)&(a.YA<103),a.hexa('#1c3a35')*(.8+(a.YA[:,:,None]/130)*.2))
 img=a.sobre(img,a.desfocar_rgba(a.ampliar(bank.c),1.1))
 # Rive boisée derrière le lac: aucun ruban de ciel sous l'horizon.
 shore,_=lake.pintar_mata_longe(nome,p)
 sh=np.zeros_like(shore.c);sh[19:]=shore.c[:-19]
 sh[:,:,:3]*=np.array([.58,.85,.72])
 img=a.sobre(img,a.desfocar_rgba(a.ampliar(sh),.9))
 # Château en arrière-plan, petit et adouci, appartient au même monde.
 castle=a.Camada();windows=a.castelo(castle,316,88,(-.6,-.8),nome=='noite')
 ca=a.ampliar(castle.c);ca[:,:,:3]=ca[:,:,:3]*.40+np.array([.10,.16,.16])*({'manha':1.1,'tarde':1,'noite':.30}[nome])
 img=a.sobre(img,a.desfocar_rgba(ca,1.5))
 # Lac: reflet du ciel et château, étiré en traits horizontaux.
 source=img.copy()
 for row in range(103*S,139*S):
  yy=row/S;src=int(np.clip((103-(yy-103)*1.5)*S,0,H*S-1))
  shift=int(1.2*math.sin(yy*3)+.7*math.sin(yy*.6))
  reflected=np.roll(source[src],shift,axis=0)*.55+np.array([.018,.045,.044])
  img[row]=reflected
 for k in range(340):
  yy=int(rng.integers(104,138));xx=int(rng.integers(0,W));ww=int(rng.integers(1,9))
  img[yy*S:yy*S+1,xx*S:min(W*S,(xx+ww)*S)]+=a.hexa('#99b4a3')*rng.uniform(.025,.12)
 c,groundmask=ground(); arch,em,wall=brick_layer();obj,oe=props();em.juntar(oe)
 flame=a.Camada();bonfire(obj,flame)
 fg=a.Camada()
 # Arbres aux marges, feuillage en avant: ne masquent pas les mascottes.
 for cx,cy,r in [(7,26,39),(40,6,30),(460,11,27),(487,54,34)]:
  a.copa(fg,cx,cy,r,a.FOLHA_DOSSEL,(-.6,-.8),seed=180+cx,dens=.72)
 for cx,cy,r in [(18,192,24),(72,205,23),(461,199,25)]:
  a.copa(fg,cx,cy,r,a.FOLHA_PERTO,(-.6,-.8),seed=110+cx,dens=.75)
 # Sol rasant venant de l'ouverture, feu + lanternes sur toutes les matières.
 fire=a.luz_pontual(F[0],F[1]-8,80,.75)
 for cam,base,weight in [(c,.60,1),(arch,.62,.85),(obj,.68,1)]:
  cc=a.ampliar(cam.c);col=cc[:,:,:3]
  col*=np.array([.59,.73,.76])*base*{'manha':1.65,'tarde':1.32,'noite':.80}[nome]
  bounce=fire*(.65 if cam is arch else .95)
  col+=a.ampliar(cam.c)[:,:,:3]*bounce[:,:,None]*np.array([1.25,.69,.20])
  for lx,ly in [(216,105),(390,107)]:
   glow=a.luz_pontual(lx,ly,34,1)
   col+=a.ampliar(cam.c)[:,:,:3]*glow[:,:,None]*np.array([.95,.50,.13])
  if cam is c:
   # Longues ombres projetées des piliers depuis le feu.
   shadow=np.zeros((H*S,W*S),np.float32)
   for px in [205,382]:
    xend=px+(px-F[0])*1.1
    mask=Image.new('L',(W*S,H*S));dr=ImageDraw.Draw(mask)
    dr.polygon([(int((px-8)*S),146*S),(int((px+8)*S),146*S),(int((xend+16)*S),200*S),(int((xend-16)*S),200*S)],fill=140)
    shadow=np.maximum(shadow,np.asarray(mask)/255)
   col*=1-shadow[:,:,None]*.62
  cc[:,:,:3]=col
  if cam is arch:
   depth=np.roll(np.roll(cc,7*S,axis=1),4*S,axis=0);depth[:,:,:3]*=.48
   img=a.sobre(img,depth)
  img=a.sobre(img,cc)
 # Flaques disjointes, spéculaire discontinu et reflet étiré de la flamme.
 wet=a.ampliar((groundmask&(a.fbm(415,(13,5,2),(.4,.4,.2))>.57)).astype(np.float32))
 spec=np.exp(-((XX-F[0])/(5+(YY-F[1])*.16).clip(3,20))**2)*np.exp(-abs(YY-(F[1]+18))/40)*(YY>F[1]+4)
 grain=a.ampliar((a.ruido_ret(90,12,.9)>.49).astype(np.float32))
 img+=spec[:,:,None]*wet[:,:,None]*grain[:,:,None]*np.array([.14,.065,.015])
 # Halos directionnels dans la brume, percée dans l'arche.
 beam=a.facho(296,52,237,178,4,32,1.1)*{'manha':.65,'tarde':1,'noite':.15}[nome]
 air=a.ampliar((~wall).astype(np.float32))
 img+=beam[:,:,None]*air[:,:,None]*np.array([.30,.22,.105])
 # Sources émissives gardées nettes et petit bloom float, jamais du flou sur les pixels.
 emission=a.ampliar(em.c[:,:,:3]*em.c[:,:,3:4])*1.5
 img+=emission*.55+a.desfocar(emission,7)*.30+a.desfocar(emission,22)*.22
 # Reflets fragmentés des lampes sur la pierre humide.
 for lx in [216,390]:
  for yy in range(149,192,3):
   spread=(yy-140)*.12
   xx=int(lx+math.sin(yy*3.7)*spread)
   strength=.20*math.exp(-(yy-149)/28)
   img[yy*S:yy*S+1,(xx-2)*S:(xx+3)*S]+=np.array([1,.60,.18])*strength
 # Vapeur chaude fine au-dessus du feu, poussière dans le rayon.
 for k in range(95):
  xx=float(rng.uniform(220,365));yy=float(rng.uniform(39,135))
  strength=float(beam[int(yy*S),int(xx*S)])
  if strength>.22:img[int(yy*S):int(yy*S)+2,int(xx*S):int(xx*S)+2]+=[.27,.20,.09]
 img=a.sobre(img,a.desfocar_rgba(a.ampliar(fg.c)*np.array([.36,.43,.4,1]),3))
 # Volume atmosphérique: noir bleuté à gauche et réchauffement du foyer à droite.
 calm=(1-a.suave(110,230,XX))*.34
 img*=1-calm[:,:,None]
 vig=np.clip(((XX-278)/380)**2+((YY-115)/225)**2-.14,0,.6)
 img*=1-vig[:,:,None]*.6
 # Courbe de ton avec réserve dans les hautes lumières.
 knee=.76
 img=np.where(img<knee,img,knee+(1-knee)*(1-np.exp(-(img-knee)/(1-knee))))
 img=np.clip(img,0,1)
 image=Image.fromarray((img*255).astype('uint8'))
 return image

PONTOS={"fogo":[274,151],"mascote":{"x":293,"y":103,"w":42,"h":60},
 "gato":[{"x":222,"y":149,"pose":"fogueira"},{"x":285,"y":170,"pose":"sentado"},{"x":342,"y":169,"pose":"repouso"}],
 "coruja":[{"x":370,"y":101},{"x":207,"y":98},{"x":348,"y":132}],"particulas":"faiscas"}
if __name__=='__main__':
 nomes=[n for n in sys.argv[1:] if n in ('manha','tarde','noite')] or ['manha','tarde','noite']
 for nome in nomes:
  im=montar(nome)
  for largura in [1440,960]:
   saida=OUT/f"cena-abrigo-{nome}{'-960' if largura==960 else ''}.webp"
   im.resize((largura,int(largura*200/480)),Image.Resampling.LANCZOS).save(saida,quality=84 if largura==1440 else 82,method=6)
   print(nome,largura,saida.stat().st_size//1024,'KB')
 (Path(__file__).parent/'cena-abrigo.json').write_text(json.dumps(PONTOS,ensure_ascii=False)+'\n')
