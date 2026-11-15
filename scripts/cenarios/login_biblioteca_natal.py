"""Biblioteca natalina — estudo local, NÃO publicar. Pixel art original.
Madeira por veio, livros individuais do pincel original do Portal, luz por material,
camadas separadas para fogo e personagens. Composição 720x1040, topo 340.
"""
from pathlib import Path
import sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import gerar_cena_portal as portal
OUT=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[2]/'output/login-biblioteca';OUT.mkdir(parents=True,exist_ok=True)
W,H,S=720,1200,3
rng=np.random.default_rng(43119)
im=Image.new('RGB',(W,H),(45,35,30));d=ImageDraw.Draw(im)
normal=Image.new('L',(W,H),155); nd=ImageDraw.Draw(normal)
metal=Image.new('L',(W,H));md=ImageDraw.Draw(metal)
em=Image.new('RGB',(W,H));ed=ImageDraw.Draw(em)
lights=[]
def col(c,k=1):return tuple(int(np.clip(v*k,0,255)) for v in c)
def rect(b,c):d.rectangle(tuple(map(int,b)),fill=c)
def line(p,c,w=1):d.line(p,fill=c,width=w)
def ellipse(b,c):d.ellipse(b,fill=c)
def wood(b,base=(87,54,32),vertical=False):
 x0,y0,x1,y1=map(int,b);ww=x1-x0+1;hh=y1-y0+1
 yy,xx=np.mgrid[:hh,:ww];a=yy if not vertical else xx;t=xx if not vertical else yy
 grain=np.sin(a*1.9+np.sin(t/22)*.7+np.sin(t/7+a/15)*.2)*.065
 grain+=np.sin(a*.37+np.sin(t/41)*1.2)*.08+rng.normal(0,.017,(hh,ww))
 rgb=np.clip(np.array(base)[None,None,:]*(1+grain[:,:,None]),0,255).astype('uint8')
 im.paste(Image.fromarray(rgb),(x0,y0))
 line([(x0,y0),(x1,y0)],col(base,1.45));line([(x0,y1),(x1,y1)],col(base,.45))
 line([(x0,y0),(x0,y1)],col(base,1.15));line([(x1,y0),(x1,y1)],col(base,.5))
 for _ in range(max(1,ww*hh//280)):
  x=int(rng.integers(x0,x1+1));y=int(rng.integers(y0,y1+1));ln=int(rng.integers(2,13))
  line([(x,y),(x,min(y1,y+ln))] if vertical else [(x,y),(min(x1,x+ln),y)],col(base,float(rng.uniform(.7,1.22))))
def carved(b):
 x0,y0,x1,y1=b;wood(b)
 for off,c in [(2,(37,23,19)),(3,(147,99,53)),(5,(57,34,25)),(6,(109,68,37))]:
  if x1-x0>=2*off and y1-y0>=2*off:d.rectangle((x0+off,y0+off,x1-off,y1-off),outline=c)
def bookrow(x,y,w,h,seed):
 c=portal.Camada();portal.fileira(c,0,w,h,h-2,seed)
 a=(c.c[:h+1,:w]*255).astype('uint8');im.paste(Image.fromarray(a,'RGBA'),(x,y-h),Image.fromarray(a,'RGBA'))
def shelf(x0,x1,ys):
 wood((x0,25,x1,285),(45,29,24),True)
 for j,y in enumerate(ys):
  bookrow(x0+9,y-3,x1-x0-18,min(ys[j]-ys[j-1]-12 if j else 31,36),x0+j*73)
  wood((x0+3,y,x1-3,y+5),(114,73,42));rect((x0+6,y+6,x1-6,y+10),(30,22,22))
 for x in (x0,x1-7):
  wood((x,23,x+7,289),(105,65,37),True)
  line([(x+2,28),(x+2,280)],(158,108,59))
  for y in (24,33,269,280):wood((x-3,y,x+10,y+5),(116,76,43))
 for x in range(x0+11,x1-23,38):carved((x,232,min(x+32,x1-9),279));ellipse((x+24,251,x+26,253),(205,158,78))
 wood((x0-2,281,x1+2,288),(93,53,29))
def garland(x0,x1,y,drop=12):
 for x in range(x0,x1):
  yy=y+math.sin((x-x0)/(x1-x0)*math.pi)*drop
  for _ in range(5):
   dx=int(rng.integers(-3,4));dy=int(rng.integers(-4,5));cc=[(31,52,35),(43,69,39),(63,84,44),(88,96,49)][int(rng.integers(4))]
   line([(x,yy),(x+dx,yy+dy)],cc)
  if (x-x0)%19==0:
   ellipse((x-1,yy+3,x+1,yy+5),(226,168,71));ed.ellipse((x-1,yy+3,x+1,yy+5),fill=(255,200,100))
  if (x-x0)%47==9:
   ellipse((x,yy-1,x+3,yy+2),(148,43,33));d.point((x,yy-1),fill=(230,102,57))
def lamp(x,y,size=1):
 ellipse((x-6,y+23,x+6,y+26),(37,25,22));line([(x,y+1),(x,y+23)],(168,116,48),2)
 d.polygon([(x-8,y-7),(x+8,y-7),(x+12,y+3),(x-12,y+3)],fill=(47,84,56))
 line([(x-10,y+3),(x+10,y+3)],(232,178,81),2);ed.line([(x-8,y+4),(x+8,y+4)],fill=(255,214,135),width=2)
 md.line([(x,y),(x,y+24)],fill=180,width=2);lights.append((x,y+5,68,.85))
def openbook(x,y,w=37):
 d.polygon([(x-w//2-2,y-9),(x-2,y-6),(x+3,y-7),(x+w//2+3,y-10),(x+w//2+5,y+7),(x,y+11),(x-w//2-4,y+6)],fill=(58,33,24))
 for off in range(3):
  d.polygon([(x-w//2,y-11-off),(x,y-7-off),(x+w//2,y-12-off),(x+w//2+3,y+4-off),(x,y+8-off),(x-w//2-2,y+3-off)],fill=(184+off*19,154+off*17,105+off*17))
 for j in range(5):
  line([(x-w//2+3,y-9+j*2),(x-3,y-6+j*2)],(157,124,79));line([(x+4,y-7+j*2),(x+w//2-2,y-10+j*2)],(163,126,77))
 line([(x,y-10),(x,y+6)],(125,86,49));line([(x+4,y+5),(x+7,y+14),(x+5,y+17)],(147,37,30),2)
def parcel(x,y,w,h,base):
 rect((x,y,x+w,y+h),col(base,.75));d.polygon([(x,y),(x+5,y-4),(x+w+5,y-4),(x+w,y)],fill=col(base,1.2));d.polygon([(x+w,y),(x+w+5,y-4),(x+w+5,y+h-4),(x+w,y+h)],fill=col(base,.5))
 rect((x+w//2-1,y,x+w//2+1,y+h),(200,162,89));line([(x,y+h//2),(x+w,y+h//2)],(200,162,89),2)
 d.arc((x+w//2-8,y-8,x+w//2+1,y),0,330,fill=(223,180,96));d.arc((x+w//2-1,y-8,x+w//2+8,y),180,520,fill=(223,180,96))
# Plastered wall with broad tonal variation, not a repeating brick grid.
yy,xx=np.mgrid[:H,:W];plaster=.97+.027*np.sin(xx/28)*np.sin(yy/14)+rng.normal(0,.013,(H,W))
im.paste(Image.fromarray(np.uint8(np.clip(np.array([103,86,66])*plaster[:,:,None],0,255))))
# floor in perspective; irregular seams, pore detail and reflected material variation
for y in range(289,H):
 t=(y-289)/(H-289);row=int(11*math.log1p(t*8));k=.8+.08*math.sin(row*2.4)
 line([(0,y),(W,y)],col((105,69,43),k))
for i,x in enumerate(range(-920,1660,100)):
 bx=int(360+(x-360)*.2);d.polygon([(bx,289),(bx+15,289),(x+90,H),(x,H)],fill=col((94,61,40),float(rng.uniform(.8,1.1))))
 line([(bx,289),(x,H)],(42,29,24));line([(bx+1,290),(x+2,H)],(125,85,48))
 for y in range(310+i%3*43,H,120):
  fac=(y-289)/(H-289);sx=int(bx+(x-bx)*fac);sw=int(15+75*fac)
  line([(sx,y),(sx+sw,y)],(48,32,26));d.point((sx+3,y+2),fill=(36,29,26))
for _ in range(12000):
 x=int(rng.integers(W));y=int(rng.integers(292,H));l=int(rng.integers(1,8));line([(x,y),(min(W-1,x+l),y)],col((104,70,44),float(rng.uniform(.66,1.2))))
# Main architecture
for a,b in [(0,95),(104,206),(214,309),(467,571),(581,719)]:shelf(a,b,[64,111,157,204,229])
for x in (94,204,310,460,574):
 wood((x,10,x+7,291),(91,59,37),True)
 for y in (14,21,278,286):wood((x-4,y,x+11,y+4),(122,80,46))
wood((0,9,719,19),(111,70,39));wood((0,22,719,27),(69,41,27))
# Arched leaded window, a glimpse of the quiet village beyond the library.
wm=Image.new('L',(W,H));wd=ImageDraw.Draw(wm)
wd.rectangle((227,91,301,199),fill=255);wd.pieslice((227,54,301,128),180,360,fill=255)
win=Image.new('RGB',(W,H),(28,40,61));wdraw=ImageDraw.Draw(win)
for y in range(54,201):wdraw.line([(226,y),(302,y)],fill=(24+int((y-54)*.08),34+int((y-54)*.08),60+int((y-54)*.06)))
wdraw.ellipse((278,72,287,81),fill=(169,186,186));wdraw.ellipse((276,70,284,79),fill=(30,41,67))
for x,y in [(235,70),(251,84),(274,99),(291,129),(243,112),(282,61)]:wdraw.point((x,y),fill=(123,148,163))
for x,y,h in [(228,172,19),(247,166,26),(270,178,22),(288,159,37)]:
 wdraw.rectangle((x,y,x+18,200),fill=(29,37,44));wdraw.polygon([(x-3,y),(x+9,y-h//2),(x+22,y)],fill=(54,59,65))
 wdraw.line([(x-2,y),(x+9,y-h//2),(x+20,y)],fill=(108,120,122))
 for wy in range(y+5,198,11):wdraw.rectangle((x+5,wy,x+7,wy+3),fill=(194,139,66))
for x in range(226,304,13):wdraw.line([(x,56),(x+50,201)],fill=(49,57,58));wdraw.line([(x,56),(x-50,201)],fill=(49,57,58))
im.paste(win,(0,0),wm)
# Stone surround and deep wooden frame.
d.arc((221,48,307,134),180,360,fill=(48,37,31),width=6);d.arc((225,52,303,130),180,360,fill=(128,105,71),width=2)
for x in (223,302):wood((x,91,x+3,201),(93,72,48),True)
line([(264,55),(264,200)],(48,39,32),3);line([(228,135),(300,135)],(53,43,34),3)
wood((218,200,310,205),(137,106,66));rect((222,206,308,208),(44,34,28))
# Brass lantern seated on the window sill, with glass, a raised handle and warm wick.
ellipse((271,199,292,203),(60,40,25));rect((275,184,288,198),(98,65,31))
rect((278,185,285,196),(238,170,74));rect((280,187,283,195),(255,224,150))
line([(276,184),(276,198)],(179,130,62));line([(287,184),(287,198)],(71,47,27))
line([(279,186),(279,195)],(255,227,159));d.polygon([(273,184),(277,180),(286,180),(290,184)],fill=(154,106,45))
d.arc((278,174,285,182),180,360,fill=(164,116,51),width=1)
rect((274,198,289,200),(168,117,51));md.rectangle((275,180,288,183),fill=180)
ed.rectangle((279,186,284,196),fill=(255,201,106));lights.append((282,191,116,1.05))
# Small trailing ivy on the sill, organically spaced leaves.
for branch in range(4):
 pts=[]
 for t in range(25):
  x=300+math.sin(t/4+branch)*3+branch;y=198+t;pts.append((x,y))
  if t%4==0:ellipse((x-3,y,x+1,y+2),[(49,76,51),(76,96,56)][t%2])
 line(pts,(63,70,38))
# Stone chimney: individually bevelled limestone with irregular joins and dark recess.
for row,y in enumerate(range(29,232,12)):
 x=321-(row%2)*17
 while x<456:
  width=int(rng.integers(19,35));left=max(x,321);right=min(x+width-2,456)
  if right>left:
   base=col((129,114,94),float(rng.uniform(.84,1.13)));rect((left,y,right,y+10),base)
   line([(left+1,y),(right-1,y)],col(base,1.22));line([(left,y+1),(left,y+8)],col(base,1.1));line([(left+1,y+10),(right,y+10)],col(base,.55))
   for _ in range(8):d.point((int(rng.integers(left,right+1)),y+int(rng.integers(2,10))),fill=col(base,float(rng.uniform(.75,1.05))))
  x+=width
# Arched firebox + voussoirs.
cx=390;cy=168;rx=36
rect((cx-rx,cy,cx+rx,231),(33,25,27));d.pieslice((cx-rx,cy-rx,cx+rx,cy+rx),180,360,fill=(33,25,27))
for i in range(11):
 a=math.pi+i*math.pi/11;b=a+math.pi/11-.025
 pts=[(cx+math.cos(a)*r,cy+math.sin(a)*r) for r in (37,47)]+[(cx+math.cos(b)*r,cy+math.sin(b)*r) for r in (47,37)]
 d.polygon(pts,fill=col((168,142,105),.85+i*.025));line([pts[1],pts[2]],(205,175,125))
for x in (343,429):
 for y in range(166,231,13):carved((x,y,x+10,y+12))
wood((328,116,449,122),(110,65,34));wood((324,111,454,115),(153,101,51));garland(329,450,121,7)
# wreath, berries, red ribbon on masonry over mantle
for i in range(160):
 a=float(rng.uniform(0,math.tau));rr=float(rng.uniform(14,21));x=389+math.cos(a)*rr;y=76+math.sin(a)*rr
 line([(x,y),(x+math.cos(a)*3,y+math.sin(a)*3)],[(32,61,40),(56,80,46),(87,100,55)][i%3],2)
for a in np.linspace(0,math.tau,13):ellipse((388+math.cos(a)*18,75+math.sin(a)*18,391+math.cos(a)*18,78+math.sin(a)*18),(166,51,34))
d.polygon([(389,91),(378,85),(379,97),(389,93),(400,86),(400,98)],fill=(153,37,31));line([(388,94),(384,106)],(180,48,36),3);line([(392,94),(397,104)],(105,29,28),3)
# Firebrick interior, grate, textured split logs.
for y in range(174,230,9):
 for x in range(355,425,18):
  xx0=x+((y//9)%2)*7;rect((xx0,y,min(xx0+15,425),y+6),(63+(y-174)//3,37,28))
for x,y,x2,y2 in [(360,222,416,227),(367,229,414,215),(370,216,410,228)]:
 line([(x,y),(x2,y2)],(37,24,21),7);line([(x,y-2),(x2,y2-2)],(105,55,29),2)
 for k in range(8):
  t=k/8;px=x+(x2-x)*t;py=y+(y2-y)*t;line([(px,py),(px+2,py+3)],(228,105,34))
for x in range(357,429,9):line([(x,232),(x-2,219)],(28,27,27),2);d.point((x-2,219),fill=(164,110,63))
line([(354,230),(430,230)],(49,38,31),3)
# hearth slab, tools and log basket
for y in range(233,243):line([(330-(y-233),y),(448+(y-233),y)],col((124,107,85),1-(y-233)*.035))
line([(320,243),(458,243)],(38,29,25),3)
for x in (440,446,452):line([(x,184),(x,228)],(42,34,28),2);d.arc((x-3,179,x+3,186),180,500,fill=(159,114,60))
for i in range(9):ellipse((317+i%3*8,209+i//3*8,325+i%3*8,217+i//3*8),(75,49,31));d.arc((319+i%3*8,211+i//3*8,324+i%3*8,216+i//3*8),0,330,fill=(143,104,58))
# Cat cushion on the warm hearth, safely outside the firebox.
d.rounded_rectangle((410,237,444,245),radius=4,fill=(73,39,29));d.rounded_rectangle((411,236,443,241),radius=4,fill=(147,77,44))
line([(415,240),(438,240)],(192,122,67))
# A fixed brass-footed perch on the mantel for the librarian owl.
wood((333,109,361,112),(123,79,40));line([(337,112),(337,116)],(74,47,29),2)
# Upper lamps and garlands
for a,b in [(12,298),(474,708)]:garland(a,b,24,13)
for x in (71,265,517,685):
 line([(x,29),(x,44)],(55,41,26));rect((x-4,45,x+4,58),(115,78,39));rect((x-2,47,x+2,55),(255,201,102));ed.rectangle((x-2,47,x+2,55),fill=(255,205,111));lights.append((x,51,55,.7))
# rug with woven border and floral motifs, perspectival shape
rug=Image.new('RGB',(380,560),(42,68,58));rd=ImageDraw.Draw(rug)
for off,c in [(2,(29,39,35)),(5,(158,109,58)),(8,(89,46,36)),(15,(168,126,73)),(18,(55,78,61)),(24,(123,85,49))]:rd.rectangle((off,off,379-off,559-off),outline=c,width=2)
for y in range(34,530,26):
 for x in range(32,350,30):
  xx=x+(13 if y//26%2 else 0)
  rd.polygon([(xx,y-4),(xx+5,y),(xx,y+5),(xx-4,y)],fill=(74,94,66));rd.line([(xx,y),(xx+7,y+7),(xx+11,y+7)],fill=(145,114,66))
ra=np.array(rug).astype(float);ra*=rng.uniform(.91,1.07,ra.shape[:2])[:,:,None];rug=Image.fromarray(np.uint8(ra))
# continuous rug, widening toward viewer. Floor seam is hidden by natural wall base only.
rug=rug.resize((380,720),Image.Resampling.NEAREST)
for j in range(720):
 y=302+j;wid=int(235+j*.28);im.paste(rug.crop((0,j,380,j+1)).resize((wid,1),Image.Resampling.NEAREST),(int(366-wid/2),y))
# Writing desk in actual visible central gap; curved legs, drawers and worn writing leather.
for x in (287,411):
 d.polygon([(x,283),(x+8,283),(x+5,317),(x+8,326),(x-1,326),(x+1,315)],fill=(58,36,26));line([(x+2,287),(x+2,317)],(133,85,44),2)
wood((278,273,427,285),(100,56,30));carved((314,276,389,284));ellipse((349,279,353,281),(197,145,63))
d.polygon([(278,271),(291,251),(418,251),(431,271)],fill=(139,86,45));wood((277,271,431,275),(154,98,49))
for i in range(30):
 x=int(rng.integers(293,411));y=int(rng.integers(253,270));line([(x,y),(min(x+int(rng.integers(4,19)),420),y)],(110,66,35))
d.polygon([(316,253),(383,253),(389,269),(307,269)],fill=(45,72,57));line([(314,255),(382,255),(385,267)],(127,114,66))
openbook(351,260,38);lamp(405,237)
for i,c in enumerate([(89,39,31),(47,68,61),(98,67,41)]):
 rect((283-i%2*2,265-i*4,307,268-i*4),c);line([(285,266-i*4),(305,266-i*4)],(197,170,116))
ellipse((389,258,395,263),(18,38,38));rect((390,254,394,260),(35,64,61));line([(392,254),(397,239)],(206,186,134));line([(397,239),(402,236)],(232,214,171),2)
ellipse((370,251,379,259),(119,75,37));ellipse((370,249,379,256),(222,194,144));ellipse((372,250,377,254),(81,47,30));d.arc((377,250,383,256),260,100,fill=(208,180,132),width=2)
# tiny candle on mantle and paper bundles
for x in (340,437):
 rect((x,99,x+3,110),(210,187,134));ed.ellipse((x,94,x+3,100),fill=(255,214,134));lights.append((x+1,99,26,.35))
bookrow(410,109,21,15,732)
# Lower margins: bookcase side returns, ornate footings and ladder.
for x0,x1 in [(0,23),(697,719)]:
 wood((x0,293,x1,881),(65,39,26),True)
 for y in (314,419,538,662,792,880):wood((x0,y,x1,y+7),(102,64,35))
 for y in range(330,866,41):
  carved((x0+3,y,x1-3,y+31))
# Ladder visible along outside left, many carefully shaped rungs.
for a,b in [((20,335),(40,645)),((36,335),(63,645))]:line([a,b],(35,25,22),6);line([a,b],(122,81,44),3)
for i in range(12):
 t=i/11;y=int(344+t*292);x=int(21+t*19);wood((x,y,x+18+int(t*5),y+3),(122,79,40))
# Cozy reading nook at bottom, visible after UI ends.
lower_back=im.copy();lower_em=em.copy()
# chair silhouette and cushioned velvet surfaces, rolled arms and carved feet
ellipse((424,937,568,973),(45,31,25))
for x in (443,540):line([(x,937),(x-4,973)],(66,39,25),6);ellipse((x-7,969,x,973),(99,58,30))
d.rounded_rectangle((436,842,550,941),radius=26,fill=(42,29,25));d.rounded_rectangle((442,847,544,934),radius=22,fill=(113,55,36));d.rounded_rectangle((450,852,536,918),radius=17,fill=(130,65,40))
for y in range(858,915):
 for x in range(455,532):
  if rng.random()<.16:d.point((x,y),fill=(139,74,45))
for x in (468,493,519):
 for y in (870,895):ellipse((x-2,y-2,x+2,y+2),(85,41,30));d.point((x,y+2),fill=(174,97,56))
for x in (431,535):
 d.rounded_rectangle((x,903,x+22,945),radius=9,fill=(83,43,31));d.rounded_rectangle((x+2,902,x+19,913),radius=7,fill=(154,79,43))
d.rounded_rectangle((451,916,533,941),radius=8,fill=(143,72,43));line([(456,938),(528,938)],(192,109,60))
# draped wool blanket with folds and tartan weave
pts=[(505,891),(530,895),(535,922),(530,954),(519,957),(512,937)];d.polygon(pts,fill=(48,76,63))
for y in range(899,952,5):line([(516,y),(531,y+3)],(104,118,80))
for x in (518,524,529):line([(x-7,898),(x,949)],(145,120,71))
for x in range(519,531,2):line([(x,952),(x-1,959)],(177,151,101))
# side table, brass reading lamp and open book
ellipse((295,943,396,967),(40,29,24));wood((341,912,349,959),(93,54,31),True);ellipse((321,956,369,962),(93,54,31));ellipse((302,895,390,923),(71,40,27));ellipse((302,890,390,916),(142,88,44));openbook(339,901,33);lamp(374,868)
# presents nestled below, ribbon texture and smaller envelopes
parcel(262,945,28,24,(126,42,33));parcel(289,956,22,15,(45,81,63));parcel(273,925,20,16,(179,139,80))
# footstool / place for cat
ellipse((574,967,655,985),(43,30,24));wood((587,956,593,979),(93,57,32));wood((637,956,643,979),(93,57,32));d.rounded_rectangle((578,941,652,961),radius=9,fill=(112,59,38));d.rounded_rectangle((580,939,650,954),radius=8,fill=(155,86,49))
for x in range(586,646,7):line([(x,944),(x+2,948)],(189,118,63))
# Near foreground stacked books with page edges and worn corners.
for j,(x,y,w,c) in enumerate([(29,995,107,(63,84,68)),(42,978,97,(109,50,37)),(27,965,92,(118,89,48))]):
 wood((x,y,x+w,y+12),c);rect((x+7,y+3,x+w-8,y+9),(179,158,112))
 for yy0 in (y+4,y+7):line([(x+10,yy0),(x+w-9,yy0)],(127,108,76))
 line([(x+4,y),(x+w-2,y)],col(c,1.6));rect((x+2,y+2,x+6,y+10),col(c,.6))
# Move the entire lower nook beneath the actual interface, with a transparent delta.
new=np.asarray(im);old=np.asarray(lower_back);delta=np.any(new!=old,axis=2).astype('uint8')*255
delta[:835]=0
patch=im.convert('RGBA');patch.putalpha(Image.fromarray(delta));im=lower_back;im.paste(patch,(0,130),patch);d=ImageDraw.Draw(im)
newem=em.crop((0,835,W,H));em.paste(lower_em.crop((0,835,W,H)),(0,835));em.paste(newem,(0,965));ed=ImageDraw.Draw(em)
lights=[(x,y+130 if y>800 else y,r,p) for x,y,r,p in lights]
# Render fire separately, maintaining blank stage beneath animation.
fire=Image.new('RGBA',(W,H));fd=ImageDraw.Draw(fire)
for x,h in [(368,18),(378,32),(391,46),(403,27),(414,20)]:
 y=226;fd.polygon([(x-6,y),(x-5,y-10),(x-1,y-h),(x+2,y-h+9),(x+8,y-12),(x+6,y)],fill=(239,104,26,245));fd.polygon([(x-3,y),(x,y-h*.6),(x+4,y-8),(x+3,y)],fill=(255,213,96,255))
lights.append((390,216,177,1.15));lights.append((374,1004,220,1.15))
# Lighting: warm falloff, material brightness, cool shadows, local floor reflections.
a=np.asarray(im).astype(float)/255;Y,X=np.mgrid[:H,:W];illum=np.zeros((H,W,3))+np.array([.48,.49,.54]);bloom=np.asarray(em).astype(float)/255
for lx,ly,r,power in lights:
 dist=np.sqrt((X-lx)**2+(Y-ly)**2);fall=np.maximum(0,1-dist/r)**2
 # layered falloff in painted bands, softened enough to preserve the pixel surfaces
 fall=.8*fall+.2*np.floor(fall*9)/9
 illum+=fall[:,:,None]*np.array([1.75,1.12,.52])*power
 bloom+=np.exp(-((X-lx)**2+(Y-ly)**2)/(r*.085)**2)[:,:,None]*np.array([1,.56,.18])*.5*power
# floor bounce spreads horizontally away from hearth, falls off with distance
bounce=np.exp(-((X-390)/132)**2-((Y-288)/78)**2)*(Y>243)
illum+=bounce[:,:,None]*np.array([.65,.34,.12])
# chair and desk cast shadows onto floor, separate from emissive lights
shadow=Image.new('L',(W,H));sd=ImageDraw.Draw(shadow)
for pts in [[(285,282),(294,282),(241,355),(226,355)],[(411,282),(419,282),(440,349),(423,349)],[(438,1070),(550,1070),(588,1124),(402,1121)]]:sd.polygon(pts,fill=75)
s=np.asarray(shadow.filter(ImageFilter.GaussianBlur(2)))/255;illum*=1-s[:,:,None]
cool=np.exp(-((X-270)/54)**2-((Y-150)/100)**2)
illum+=cool[:,:,None]*np.array([.04,.12,.24])
# Ambient occlusion follows actual joins, recessed shelves and grounded objects.
ao=np.zeros((H,W),dtype=float)
for x0,x1 in [(0,95),(104,206),(214,309),(467,571),(581,719)]:
 for sy in (64,111,157,204,229):
  # The arched opening replaces these shelves; do not darken the glass.
  mask=(X>x0+6)&(X<x1-6)&(Y>sy+4)&(Y<sy+15)
  if x0==214:mask &= np.asarray(wm)==0
  ao+=mask*np.exp(-np.maximum(0,Y-sy-4)/3.4)*.27
 for edge in (x0+7,x1-8):
  mask=(Y>29)&(Y<281)
  if x0==214:mask &= np.asarray(wm)==0
  ao+=np.exp(-((X-edge)/2.4)**2)*mask*.16
# Chimney-to-bookcase crevices and the deep stone sill.
for edge in (319,459):ao+=np.exp(-((X-edge)/3.6)**2)*((Y>29)&(Y<244))*.25
ao+=np.exp(-((Y-245)/2.0)**2)*((X>320)&(X<460))*.22
ao+=np.exp(-((Y-289)/3.5)**2)*.22
# Desk apron, feet, chair feet and books resting on the floor.
ao+=np.exp(-((Y-280)/4)**2)*((X>282)&(X<425))*.18
for x,y,rx,ry in [(287,326,9,2),(416,326,9,2),(438,1102,12,3),(537,1102,12,3),(345,1091,29,3),(616,1109,35,3),(95,1137,68,3)]:
 ao+=np.exp(-((X-x)/rx)**2-((Y-y)/ry)**2)*.3
ao=np.clip(ao,0,.55)
# Occlusion reduces ambient/bounced light; emissive flame and lantern cores remain luminous.
a*=illum*(1-ao[:,:,None])
# Warm reflected strips on polished boards, broken by wood grain, originating at the hearth.
reflection=np.exp(-((X-(390+(Y-290)*.08))/(30+(Y-290)*.1).clip(10))**2)*np.exp(-np.maximum(0,Y-290)/115)*((Y>289)&(Y<540))
reflection*=.55+.45*np.maximum(0,np.sin(Y*1.9+X*.075))
a+=reflection[:,:,None]*np.array([.12,.064,.018])*(1-ao[:,:,None])
# Lantern spill catches the stone reveal and the horizontal sill, keeping the night glass blue.
reveal=np.exp(-((X-282)/30)**2-((Y-203)/8)**2)*(1-np.asarray(wm)/255)
a+=reveal[:,:,None]*np.array([.16,.08,.023])
# selective warm speculars on brass, glossy page cuts, and floor strips
spec=np.asarray(metal)/255;a+=spec[:,:,None]*np.array([.26,.17,.06])
a+=bloom*.75
# linear HDR compressed rather than clipping highlights
k=.78;a=np.where(a<k,a,k+(1-k)*(1-np.exp(-(a-k)/(1-k))))
vig=1-.23*((X/W-.53)**2+(Y/H-.35)**2);a*=vig[:,:,None]
base=Image.fromarray(np.uint8(np.clip(a,0,1)*255)).resize((W*S,H*S),Image.Resampling.NEAREST)
# Bloom is applied at full output resolution; source pixels remain clear.
b=Image.fromarray(np.uint8(np.clip(bloom,0,1)*255)).resize(base.size,Image.Resampling.NEAREST).filter(ImageFilter.GaussianBlur(12))
ba=np.asarray(base).astype(float)+np.asarray(b).astype(float)*.35;base=Image.fromarray(np.uint8(np.clip(ba,0,255)))
np.savez_compressed(OUT/'materiais-bonfire.npz',albedo=np.asarray(im)[:340].astype(float)/255,ao=ao[:340],shadow=s[:340],window=np.asarray(wm)[:340]/255,metal=np.asarray(metal)[:340]/255)
base.save(OUT/'biblioteca-cenario.png');base.save(OUT/'biblioteca-cenario.webp',quality=90,method=6)
fire=fire.resize(base.size,Image.Resampling.NEAREST);fire.save(OUT/'biblioteca-fogo.png')
preview=base.convert('RGBA');preview.alpha_composite(fire);preview.save(OUT/'biblioteca-acesa.png');preview.crop((0,0,W*S,340*S)).save(OUT/'biblioteca-topo.png')
print(OUT)
