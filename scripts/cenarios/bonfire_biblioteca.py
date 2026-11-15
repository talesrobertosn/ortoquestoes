"""Bonfire contínua da biblioteca: combustível, espada, labaredas e resposta dos materiais.
24 quadros periódicos. Luz indireta na pedra, reflexão na madeira, oclusão da mesa.
Somente código original/Pillow/numpy; nenhuma imagem externa. Prévia antes de publicar.
"""
from pathlib import Path
import math,sys,json
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'output/bonfire-integrada'
OUT.mkdir(parents=True,exist_ok=True)
N=24;W,H=116,128;S=3;X0,Y0=332,116
Y,X=np.mgrid[:H,:W].astype(float);v=116-Y
rng=np.random.default_rng(7201)
# Fixed fuel with charred bark, split ends, fissures and ember veins; no detached base ellipse.
fuel=Image.new('RGBA',(W,H));d=ImageDraw.Draw(fuel)
for x,y,x2,y2,r in [(29,117,82,112,4),(35,110,78,119,4),(27,119,86,119,3),(37,119,69,109,3)]:
 d.line([(x,y),(x2,y2)],fill=(43,24,21,255),width=r*2+1)
 d.line([(x,y-2),(x2,y2-2)],fill=(105,54,29,255),width=2)
 for j in range(10):
  t=j/10;px=x+(x2-x)*t;py=y+(y2-y)*t
  d.line([(px,py-2),(px+2,py+1)],fill=(176,73,30,255))
for i in range(45):
 px=float(rng.uniform(28,86));py=float(rng.uniform(113,122))
 if ((px-57)/32)**2+((py-117)/6)**2<1:
  d.ellipse((px,py,px+float(rng.uniform(1,3)),py+1),fill=[(116,41,22,255),(205,73,22,255),(245,137,41,255)][i%3])
sword=Image.open(ROOT/'public/pixel/inicio/espada.png').convert('RGBA').resize((20,82),Image.Resampling.NEAREST)
frames=[];emissives=[];energies=[]
for i in range(N):
 t=math.tau*i/N
 density=np.zeros((H,W));temp=np.zeros((H,W))
 for j,(bx,h,r) in enumerate([(-23,53,11),(-13,84,12),(0,76,13),(13,94,12),(24,59,10)]):
  height=h+7*math.sin(t*2+j*1.7)+3*math.sin(t*3+j)
  z=np.clip(v/height,0,1)
  center=58+bx*(1-z*.67)+(2+z*5)*np.sin(v/13-t*2+j*.8)+z*2*np.sin(v/5-t*3+j)
  radius=(r*(1-z)**.65+1)*(1+.26*np.sin(v/8-t*3+j)+.14*np.sin(v/3.8-t*5+j*2))
  shape=np.maximum(0,1-((X-center)/radius)**2)*np.clip((height-v)/7,0,1)
  lower=120+2*np.sin(X*.31-t*2)+1.5*np.sin(X*.7+t*3)
  flow=.83+.15*np.sin(X*.43+v*.23-t*3)+.14*np.sin(X*.21-v*.38+t*4)+.10*np.sin(X*.79+v*.33-t*5)
  shape*=((v>=-8)&(v<height))*np.clip((Y-8)/5,0,1)*np.clip((lower-Y)/5,0,1)*flow
  heat=.12+shape*.63*(1-.55*z)+.04*np.sin(X*.7+Y*.44-t*3)
  take=shape>density;temp=np.where(take,heat,temp);density=np.maximum(density,shape)
 # Incandescent roots remain connected to the fuel; irregular taper into the embers.
 roots=np.exp(-((X-58)/25)**4-((Y-114)/6)**4)*.95
 density=np.maximum(density,roots*.78)
 core=np.exp(-((X-(58+2*np.sin(v*.2-t*3)))/10)**2-((Y-104)/16)**2)
 temp=np.maximum(temp,roots*.62)+core*.36
 # The blade itself carries moving ignition channels, not just a fire behind it.
 blade_y=np.clip((Y-54)/5,0,1)*np.clip((117-Y)/5,0,1)
 ribbon_center=58+1.5*np.sin(Y*.22+t*3)
 ribbons=np.exp(-((X-ribbon_center)/(3.5+1.2*np.sin(Y*.2+t*4)))**2)*blade_y
 climbing=.73+.21*np.sin(Y*.32+t*5)+.06*np.sin(Y*.71+t*3)
 density=np.maximum(density,ribbons*.97)
 temp=np.maximum(temp,ribbons*climbing)
 pal=np.array([(169,43,17),(220,65,17),(247,106,23),(255,157,38),(255,205,78),(255,236,150),(255,249,213)],float)
 idx=np.clip(np.floor(temp*7).astype(int),0,6);rgb=pal[idx]
 alpha=np.clip((density-.16)*7,0,1)*np.clip((124-Y)/5,0,1)
 rgba=np.dstack([rgb,np.uint8(alpha*255)]).astype('uint8');flame=Image.fromarray(rgba)
 frame=Image.new('RGBA',(W,H));frame.alpha_composite(fuel);frame.alpha_composite(flame)
 # Heated steel responds to the same emission field, with a cool centre and warm rim.
 sw=np.array(sword).copy();sy,sx=32,48
 sample=temp[sy:sy+82,sx:sx+20];met=sw[:,:,:3].astype(float)
 edge=np.zeros(sample.shape);edge[:,0:5]=1;edge[:,-4:]=.6
 heat=sample*(.35+.65*edge)
 met+=heat[:,:,None]*np.array([155,83,14]);sw[:,:,:3]=np.uint8(np.clip(met,0,255))
 frame.alpha_composite(Image.fromarray(sw),(sx,sy))
 # Wisps wind around the blade: depth varies continuously in space, never a cropped strip.
 front=np.clip((Y-58)/58,0,1)*(.52+.48*np.sin(Y*.145+X*.16-t*2))
 front=np.maximum(front,np.clip((Y-105)/9,0,1))
 blade_wrap=np.exp(-((X-ribbon_center)/5.2)**4)*blade_y*(.78+.20*np.sin(Y*.29+t*5))
 front=np.maximum(front,blade_wrap)
 farr=np.array(flame);farr[:,:,3]=np.uint8(np.array(flame)[:,:,3]*front)
 frame.alpha_composite(Image.fromarray(farr))
 # A few ember trails, all rooted in the hearth, periodic at the loop seam.
 fd=ImageDraw.Draw(frame)
 for j in range(10):
  age=(i/N+j*.127)%1;yy=110-age*95;xx=58+math.sin(age*8+j)*age*19
  if age>.15:fd.line([(xx,yy),(xx-.5,yy+1.5)],fill=(255,176+int(60*(1-age)),75,int(210*(1-age))))
 emissive=rgba[:,:,:3].astype(float)/255*(rgba[:,:,3:4]/255)
 large=frame.resize((W*S,H*S),Image.Resampling.NEAREST)
 glow=Image.fromarray(np.uint8(np.clip(emissive,0,1)*255)).resize(large.size,Image.Resampling.NEAREST)
 ga=np.asarray(glow.filter(ImageFilter.GaussianBlur(6))).astype(float)
 aa=np.uint8(np.clip(ga.max(2)*.55,0,100));halo=np.dstack([np.full_like(aa,255),np.full_like(aa,137),np.full_like(aa,40),aa])
 result=Image.fromarray(halo);result.alpha_composite(large)
 frames.append(result);emissives.append(emissive)
 energies.append(.68+.15*math.sin(t*2+.8)+.08*math.sin(t*3+1.7)+.035*math.sin(t*7))
sheet=Image.new('RGBA',(W*S*N,H*S))
for i,f in enumerate(frames):sheet.alpha_composite(f,(i*W*S,0))
sheet.save(OUT/'bonfire-integrada-v3.webp',lossless=True,method=6)
frames[5].save(OUT/'quadro-ampliado.png')
# Frame-locked illumination, calculated from the scene's albedo, AO and shadow maps.
m=np.load(OUT/'materiais-bonfire.npz')
albedo=m['albedo'];ao=m['ao'];shadow=m['shadow'];h,w=ao.shape
YY,XX=np.mgrid[:h,:w].astype(float)
dist=np.sqrt((XX-390)**2+(YY-210)**2+34**2)
response=(65**2/(65**2+dist**2))**1.25
normal=34/dist
# Stone reveals face the fire; front face sees indirect light reflected by floor/hearth.
reveal=((XX>337)&(XX<443)&(YY>122)&(YY<242))
normal=np.where(reveal,np.clip(normal*1.7,.15,1),normal*.65)
# Warm bounce climbs the chimney and reaches the bookcase edges.
bounce=np.exp(-((XX-390)/124)**2-((YY-186)/157)**2)*.24
# Projected table shadow and material-specific reception, with occluded corners held dark.
top=(YY>=251)&(YY<=275)&(XX>277)&(XX<432)
response=np.where(top,response*1.5,response)
under=(YY>280)&(YY<310)&(XX>285)&(XX<417)
normal=np.where(under,normal*.22,normal)
shade=(1-ao)*np.clip(1-shadow*1.5,.1,1)
light=(response*normal+bounce)*shade
# Window glass remains cool. Stone sill and brass still catch bounced amber.
light*=1-m['window']*.88
spec=m['metal']*.10
floor=(YY>289)*np.exp(-((XX-(390+(YY-290)*.12))/47)**2)*np.exp(-np.maximum(YY-289,0)/60)*shade
lf=[];lm=[]
for i,energy in enumerate(energies):
 warmth=np.array([1,.56,.22]);shine=albedo*(light*(.22+energy*4.0))[:,:,None]*warmth
 shine+=floor[:,:,None]*np.array([.22,.11,.025])*energy
 shine+=spec[:,:,None]*warmth*energy
 # Additive response encoded as screen transmission; no uniform filter over the painting.
 strength=np.clip(shine.max(2)*.95,0,.65)
 rgb=np.divide(shine,shine.max(2)[:,:,None]+1e-6)*255
 arr=np.dstack([rgb,strength*255]).astype('uint8');arr[:,:,:3]=(arr[:,:,:3]//8)*8;arr[:,:,3]=(arr[:,:,3]//2)*2;f=Image.fromarray(arr)
 lf.append(f.resize((300,h//2),Image.Resampling.LANCZOS));lm.append(f.crop((180,0,540,h)).resize((180,h//2),Image.Resampling.LANCZOS))
for name,parts in [('bonfire-luz-v3',lf),('bonfire-luz-movel-v3',lm)]:
 atlas=Image.new('RGBA',(parts[0].width*N,parts[0].height))
 for i,f in enumerate(parts):atlas.alpha_composite(f,(i*f.width,0))
 atlas.save(OUT/(name+'.webp'),quality=78,method=6)
# Actual composition crops make the root and ambient response inspectable together.
base=Image.open(OUT/'biblioteca-cenario.png').convert('RGBA')
previews=[]
for i in range(N):
 p=base.copy();l=lf[i].resize((720*S,h*S),Image.Resampling.BILINEAR)
 bg=np.array(p.crop((0,0,720*S,h*S))).astype(float)/255;la=np.array(l).astype(float)/255
 bg[:,:,:3]=1-(1-bg[:,:,:3])*(1-la[:,:,:3]*la[:,:,3:4])
 p.paste(Image.fromarray(np.uint8(bg*255)),(0,0));p.alpha_composite(frames[i],(X0*S,Y0*S))
 previews.append(p.crop((275*S,105*S,458*S,286*S)).convert('RGB').resize((732,724),Image.Resampling.NEAREST))
previews[0].save(OUT/'bonfire-integrada.gif',save_all=True,append_images=previews[1:],duration=100,loop=0)
previews[5].save(OUT/'bonfire-integrada-contexto.png')
(OUT/'ancoras.json').write_text(json.dumps({'frames':N,'duracaoMs':2400,'x':X0,'y':Y0,'w':W,'h':H,'luzW':720,'luzH':h},indent=2))
print(OUT)
