from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import textwrap
P=Path(__file__).resolve().parent
OUT=P/'saida'; OUT.mkdir(exist_ok=True)
IMG=Image.open(P/'assets/radiografia.png').convert('RGB')
SANS='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SERIF='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
SERIFB='/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
DARK='#153632'; DARK2='#102c29'; CREAM='#f3f0e6'; PALE='#fffdf7'; GOLD='#d2bf7d'; OLIVE='#a88f50'; MUTED='#8a978e'; INK='#203c35'; GRAY='#53685e'; LIGHT='#e8e5da'
def font(size,bold=False,serif=False): return ImageFont.truetype(SERIFB if serif and bold else SERIF if serif else BOLD if bold else SANS,size)
def rr(d,box,r,fill,outline=None,width=1): d.rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=width)
def txt(d,xy,s,size,color,font0=None,anchor=None,spacing=8): d.multiline_text(xy,s,font=font0 or font(size),fill=color,anchor=anchor,spacing=spacing)
def fit_lines(d,s,f,maxw):
  out=[]
  for para in s.split('\n'):
    words=para.split(); line=''
    for word in words:
      trial=(line+' '+word).strip()
      if d.textbbox((0,0),trial,font=f)[2]<=maxw: line=trial
      else:
        if line: out.append(line)
        line=word
    out.append(line)
  return '\n'.join(out)
def header(d,W,tag,dark=False):
  fg='#f1eddf' if dark else INK; accent='#c5b77d' if dark else OLIVE
  txt(d,(76,54),'ortoquestões',23,fg,font(23,True)); txt(d,(W-76,61),tag.upper(),15,accent,font(15,True),anchor='ra')
def footer(d,W,H,left,right,dark=False):
  fg='#bdc9b7' if dark else MUTED
  d.line((76,H-75,W-76,H-75),fill='#526d60' if dark else '#d6d2c5',width=2)
  txt(d,(76,H-55),left.upper(),14,fg,font(14,True)); txt(d,(W-76,H-55),right,16,fg,font(16,True),anchor='ra')
def label(d,x,y,s,dark=False):
  txt(d,(x,y),s.upper(),16,GOLD if dark else OLIVE,font(16,True),spacing=5)
def wrap(d,xy,s,size,color,maxw,serif=False,bold=False,spacing=10):
  f=font(size,bold,serif); txt(d,xy,fit_lines(d,s,f,maxw),size,color,f,spacing=spacing)
def rounded_image(im,size,r):
  im=im.copy(); im.thumbnail(size,Image.Resampling.LANCZOS)
  canvas=Image.new('RGB',size,(13,27,25)); x=(size[0]-im.width)//2; y=(size[1]-im.height)//2; canvas.paste(im,(x,y))
  m=Image.new('L',size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,size[0]-1,size[1]-1),r,fill=255)
  canvas.putalpha(m); return canvas
# Feed 1: cover
W,H=1080,1350
im=Image.new('RGB',(W,H),DARK); d=ImageDraw.Draw(im); header(d,W,'Radiologia · oncologia ortopédica',True)
label(d,78,186,'Risco que merece atenção',True)
wrap(d,(74,252),'Antes da fratura,\no osso já dá\num sinal.',67,'#f4f0e4',650,True,True,11)
wrap(d,(80,540),'Uma questão sobre metástase no fêmur — e a decisão que muda a sequência do tratamento.',26,'#d4ddd1',475,spacing=10)
rr(d,(80,706,379,762),28,None,outline=GOLD,width=2); txt(d,(104,724),'DESLIZE PARA INVESTIGAR',15,GOLD,font(15,True))
hero=rounded_image(IMG,(450,625),190); im.paste(hero,(560,645),hero)
d=ImageDraw.Draw(im); d.ellipse((548,633,1022,1282),outline='#9d9067',width=2); footer(d,W,H,'Questão comentada','01 / 05',True); im.save(OUT/'feed-01.png')
# Feed 2 exact question
im=Image.new('RGB',(W,H),CREAM); d=ImageDraw.Draw(im); header(d,W,'TEOT / TARO · questão do banco'); label(d,78,142,'O caso')
question='Paciente com 57 anos refere dor moderada no quadril esquerdo e diagnóstico de neoplasia renal com metástase para o fêmur. O escore de MIRELS e a conduta mais adequada são, respectivamente:'
wrap(d,(78,190),question,27,INK,570,True,spacing=9)
# xray at right in tall rounded window
photo=rounded_image(IMG,(300,520),140); im.paste(photo,(700,204),photo); d=ImageDraw.Draw(im); d.rounded_rectangle((699,203,1001,727),radius=150,outline='#c9c1a9',width=2)
options=[('A','8 e radioterapia.'),('B','8 e fixação cirúrgica.'),('C','11 e radioterapia.'),('D','11 e fixação cirúrgica.')]
y=515
for letter,statement in options:
  rr(d,(78,y,654,y+66),23,'#e9e6dc'); txt(d,(100,y+19),letter,21,OLIVE,font(21,True)); txt(d,(145,y+17),statement,20,GRAY,font(20,True)); y+=80
wrap(d,(80,877),'Observe: sítio · dor · padrão radiográfico · tamanho',18,MUTED,570,bold=True,spacing=4)
footer(d,W,H,'Radiografia original da questão','02 / 05'); im.save(OUT/'feed-02.png')
# Feed 3 score cards
im=Image.new('RGB',(W,H),CREAM); d=ImageDraw.Draw(im); header(d,W,'Leitura do escore'); label(d,78,145,'Quatro variáveis. Uma soma.')
wrap(d,(76,194),'O Mirels transforma pistas em pontos.',66,INK,850,True,True,12)
items=[('3','Região peritrocantérica','Área de alta carga mecânica'),('2','Dor moderada','Componente clínico'),('3','Lesão lítica','Padrão radiográfico'),('3','Mais de ⅔ do diâmetro','Extensão da lesão')]
coords=[(78,415),(542,415),(78,668),(542,668)]
for (n,title,desc),(x,y) in zip(items,coords):
  rr(d,(x,y,x+430,y+212),31,PALE); txt(d,(x+28,y+22),n,61,OLIVE,font(61,False,True)); wrap(d,(x+30,y+101),title,19,INK,370,bold=True,spacing=4); wrap(d,(x+30,y+157),desc,15,MUTED,370,spacing=3)
rr(d,(330,944,750,1165),110,DARK); txt(d,(540,982),'11',111,GOLD,font(111,False,True),anchor='ma'); txt(d,(540,1100),'PONTOS',17,'#e3decf',font(17,True),anchor='ma')
footer(d,W,H,'Localização + dor + natureza + tamanho','03 / 05'); im.save(OUT/'feed-03.png')
# Feed 4 answer reveal
im=Image.new('RGB',(W,H),DARK); d=ImageDraw.Draw(im); header(d,W,'Interpretação',True); label(d,80,178,'A resposta é',True)
wrap(d,(76,236),'11 pontos.\nEstabilizar antes.',72,'#f4f0e4',680,True,True,12)
# D medallion
rr(d,(818,290,1006,478),94,None,outline=GOLD,width=2); txt(d,(912,316),'D',112,GOLD,font(112,False,True),anchor='ma')
wrap(d,(80,468),'No caso da questão, o escore indica alto risco de fratura no fêmur.',25,'#d3ddd2',850,spacing=8)
rows=[('Peritrocantérico','3'),('Dor moderada','2'),('Lesão lítica','3'),('> ⅔ do diâmetro','3')]
y=625
for name,n in rows:
  d.line((80,y+45,1000,y+45),fill='#597166',width=2); txt(d,(82,y),name,22,'#e7e3d8',font(22)); txt(d,(990,y),n,22,GOLD,font(22,True),anchor='ra'); y+=70
rr(d,(80,946,1000,1122),30,'#203f39',outline='#b7a467',width=2); txt(d,(110,975),'CONDUTA INDICADA NA QUESTÃO',15,GOLD,font(15,True)); wrap(d,(110,1015),'Fixação cirúrgica profilática; a radioterapia vem depois da estabilização.',25,'#f4f0e4',820,True,spacing=8)
footer(d,W,H,'Gabarito: D','04 / 05',True); im.save(OUT/'feed-04.png')
# Feed 5 takeaway
im=Image.new('RGB',(W,H),CREAM); d=ImageDraw.Draw(im); header(d,W,'Para levar para a prova'); label(d,78,155,'Ponto de virada')
wrap(d,(76,208),'A decisão começa pela resistência do osso.',70,INK,920,True,True,12)
rr(d,(78,492,1000,790),34,PALE)
txt(d,(112,532),'REGRA DE REVISÃO',17,OLIVE,font(17,True)); wrap(d,(112,580),'O Mirels reúne localização, dor, natureza radiográfica e tamanho. Em lesões femorais com escore elevado, a equipe considera estabilização profilática antes da radioterapia.',23,GRAY,830,spacing=10)
# pills
rr(d,(112,733,370,774),21,'#e9e5d8'); txt(d,(130,745),'FERRAMENTA DE APOIO',13,GRAY,font(13,True)); rr(d,(385,733,810,774),21,'#e9e5d8'); txt(d,(405,745),'DECISÃO CLÍNICA INDIVIDUALIZADA',13,GRAY,font(13,True))
rr(d,(78,840,1000,1118),34,DARK); txt(d,(112,882),'QUESTÃO GRÁTIS TODO DIA',17,GOLD,font(17,True)); wrap(d,(112,930),'Treine com questões de prova comentadas no Orto Questões.',28,'#f4f0e4',770,True,spacing=9); txt(d,(112,1042),'Acesse pelo perfil  @ortoquestoes',19,'#d5ddcd',font(19,True))
footer(d,W,H,'Salve para revisar o Mirels','05 / 05'); im.save(OUT/'feed-05.png')
# Stories
SW,SH=1080,1920
# Story 1
im=Image.new('RGB',(SW,SH),DARK); d=ImageDraw.Draw(im); header(d,SW,'Questão do dia',True); label(d,76,184,'Desafio rápido',True)
wrap(d,(74,255),'O osso ainda\nnão quebrou.\nE agora?',82,'#f4f0e4',900,True,True,12)
wrap(d,(78,612),'Metástase renal no fêmur, dor moderada. Qual é o Mirels e a melhor conduta?',28,'#d5ddd0',900,spacing=10)
photo=rounded_image(IMG,(520,590),205); im.paste(photo,(280,850),photo); d=ImageDraw.Draw(im); d.rounded_rectangle((277,847,803,1443),radius=210,outline='#998b60',width=2)
opts=[('A','8 + radioterapia'),('B','8 + fixação'),('C','11 + radioterapia'),('D','11 + fixação')]
for i,(l,s) in enumerate(opts):
  x=76+(i%2)*470; y=1490+(i//2)*96; rr(d,(x,y,x+440,y+72),25,'#23453e',outline='#80907a',width=1); txt(d,(x+22,y+20),l,20,GOLD,font(20,True)); txt(d,(x+67,y+20),s,19,'#f0ecde',font(19,True))
footer(d,SW,SH,'Responda mentalmente e veja o próximo','1 / 2',True); im.save(OUT/'story-01.png')
# Story 2
im=Image.new('RGB',(SW,SH),DARK); d=ImageDraw.Draw(im); header(d,SW,'Resposta comentada',True); label(d,76,177,'O detalhe que decide',True)
wrap(d,(74,240),'11 pontos.\nFixação.',82,'#f4f0e4',770,True,True,12)
photo=rounded_image(IMG,(350,650),170); im.paste(photo,(670,365),photo); d=ImageDraw.Draw(im); d.rounded_rectangle((667,362,1023,1020),radius=180,outline='#96885d',width=2)
wrap(d,(80,481),'Peritrocantérico (3) + dor moderada (2) + lítica (3) + tamanho > ⅔ (3).',26,'#d6ded1',560,spacing=9)
rows=[('Localização','3'),('Dor','2'),('Natureza','3'),('Tamanho','3')]; y=737
for a,b in rows:
  d.line((80,y+47,590,y+47),fill='#526a5e',width=2); txt(d,(82,y),a,22,'#e7e3d8',font(22)); txt(d,(580,y),b,22,GOLD,font(22,True),anchor='ra'); y+=67
rr(d,(76,1083,1004,1324),32,'#d2bf7d'); txt(d,(109,1117),'GABARITO: D',16,DARK,font(16,True)); wrap(d,(109,1160),'Fixação cirúrgica profilática antes da radioterapia.',27,DARK,840,True,spacing=8)
wrap(d,(79,1395),'Uma questão grátis todo dia.\nMais questões comentadas em @ortoquestoes',22,'#e5e7d9',850,bold=True,spacing=10)
footer(d,SW,SH,'Treine com questões de prova','2 / 2',True); im.save(OUT/'story-02.png')
# Contact sheet
files=list(OUT.glob('*.png')); thumbs=[]
for f in files:
  q=Image.open(f).convert('RGB'); q.thumbnail((270,420)); thumbs.append((f.name,q.copy()))
sheet=Image.new('RGB',(4*290,2*450),(220,220,215)); sd=ImageDraw.Draw(sheet)
for i,(name,q) in enumerate(thumbs):
  x=(i%4)*290+10; y=(i//4)*450+22; sheet.paste(q,(x,y)); sd.text((x,y-18),name,fill='#263a33')
sheet.save(P/'contato.png')
print('Rendered',len(files),'slides')
