"""Pixel art própria: formas e pixels desenhados aqui, sem fontes externas. Python + Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw
RAIZ = Path(__file__).resolve().parents[2] / 'public/eventos'
RAIZ.mkdir(parents=True, exist_ok=True)
ESC = '#193d38'; OURO = '#edc779'; LUZ = '#fff0bd'; VERDE = '#67a18a'; PELE = '#d9a477'

def criar(nome):
    im = Image.new('RGBA', (40, 44)); d = ImageDraw.Draw(im)
    def r(box, cor): d.rectangle(box, fill=cor)
    def l(p, cor, w=1): d.line(p, fill=cor, width=w)
    # Sombra no piso une o conjunto, sem geometria subpixel.
    r((8,39,31,40),'#102e2855')
    if nome == 'cafe':
        r((8,18,28,34),ESC);r((10,20,26,32),OURO);r((12,20,24,23),'#865a3a');r((28,21,33,29),OURO);r((29,23,31,27),ESC);r((6,35,30,37),LUZ)
        l([(13,15),(11,11),(14,7)],LUZ,2);l([(22,15),(20,10),(23,5)],LUZ,2)
    elif nome in ['bilhete','livro']:
        r((7,9,32,36),ESC);r((9,11,30,34),OURO);r((11,13,28,32),LUZ)
        if nome=='bilhete':r((15,6,24,12),VERDE)
        else:r((18,11,20,34),'#a36b40')
        for y in [18,23,28]:r((13,y,25,y), '#907759')
    elif nome in ['mascote','relogio']:
        r((14,5,25,8),ESC);r((12,9,27,18),ESC);r((14,9,25,17),PELE);r((15,12,16,13),ESC);r((23,12,24,13),ESC)
        r((10,19,29,32),ESC);r((12,20,27,30),VERDE);r((19,20,20,30),OURO);r((12,33,17,38),ESC);r((23,33,28,38),ESC)
        r((6,23,10,28),PELE);r((29,23,33,28),PELE)
        if nome=='relogio':r((24,22,35,33),OURO);r((26,24,33,31),LUZ);l([(29,25),(29,28),(31,28)],ESC)
    elif nome=='gato':
        r((10,11,14,19),ESC);r((24,11,28,19),ESC);r((10,17,28,28),ESC);r((12,17,26,26),'#c18a53');r((13,20,15,21),LUZ);r((23,20,25,21),LUZ);r((18,24,20,25),'#e8b0a0')
        r((12,29,27,36),'#c18a53');r((10,35,29,38),ESC);l([(27,34),(34,31),(34,26)],OURO,3)
    elif nome=='estrela':
        d.polygon([(20,6),(24,17),(35,18),(27,25),(29,36),(20,30),(10,36),(12,25),(4,18),(16,17)],fill=ESC)
        d.polygon([(20,10),(23,20),(31,20),(25,25),(26,31),(20,27),(14,31),(15,24),(9,20),(18,20)],fill=OURO);r((19,15,20,21),LUZ)
    elif nome=='martelo':
        l([(13,35),(25,13)],ESC,7);l([(13,35),(25,13)],OURO,3);d.polygon([(17,9),(27,13),(32,5),(21,3)],fill=ESC);l([(20,7),(28,10)],VERDE,5)
    elif nome=='selo':
        d.polygon([(12,27),(10,39),(20,34),(30,39),(28,27)],fill=VERDE);d.ellipse((8,6,32,30),fill=ESC);d.ellipse((10,8,30,28),fill=OURO);l([(14,18),(18,22),(26,14)],ESC,3)
    elif nome=='biscoito':
        d.polygon([(6,21),(11,12),(19,10),(22,15),(30,13),(35,22),(29,31),(22,34),(18,27),(12,31)],fill=ESC)
        d.polygon([(8,21),(13,15),(18,13),(21,20),(29,16),(32,22),(27,28),(22,30),(19,23),(12,27)],fill=OURO);r((22,30,31,36),LUZ)
    elif nome=='bolo':
        r((7,21,32,36),ESC);r((9,23,30,34),'#be877b');r((9,23,30,26),LUZ);r((6,36,33,38),OURO)
        for x in [13,20,27]:r((x,15,x+1,21),VERDE);r((x,10,x+1,13),OURO)
    elif nome=='presente':
        r((8,18,31,36),ESC);r((10,20,29,34),VERDE);r((6,14,33,20),OURO);r((18,15,21,34),LUZ)
        l([(19,14),(12,11),(12,7),(17,8),(20,14),(24,7),(29,7),(29,11),(21,14)],OURO,2)
    im.save(RAIZ / f'{nome}.png', optimize=True)
for nome in ['cafe','bilhete','mascote','estrela','relogio','livro','martelo','selo','biscoito','bolo','gato','presente']:criar(nome)

# Sala secreta: vitral, estantes e mesa, todos os pixels construídos aqui.
import math
import random
rng = random.Random(1610)
im = Image.new('RGBA', (240, 88)); d = ImageDraw.Draw(im)
for y in range(88):
    for x in range(240):
        luz = max(0, 1 - math.hypot((x-119)/135, (y-34)/90))
        ruido = rng.choice([-2,0,0,1,2])
        im.putpixel((x,y), (int(24+18*luz)+ruido,int(48+16*luz)+ruido,int(39+8*luz)+ruido,255))
d = ImageDraw.Draw(im)
for y in range(67,88,5):
    d.line((0,y,240,y),fill='#715a3c')
    for x in range((y%3)*8,240,30): d.line((x,y,x,y+5),fill='#4b4230')
# Janela em arco, luar e feixes discretos.
d.rounded_rectangle((98,5,142,62),radius=20,fill='#a08950')
d.rounded_rectangle((101,8,139,60),radius=17,fill='#203f43')
d.ellipse((113,13,124,24),fill='#eee2ae'); d.ellipse((117,11,126,21),fill='#203f43')
for p in [(108,29),(131,27),(126,36)]: d.point(p,fill='#dccb91')
d.line((120,8,120,60),fill='#a08950',width=2);d.line((101,38,139,38),fill='#a08950',width=2)
paleta=['#718568','#b19a60','#9f7860','#527873','#8d8a71','#c0b58a']
for origem in [9,52,153,196]:
    d.rectangle((origem,9,origem+34,68),fill='#20362b',outline='#8b7247',width=2)
    for y in [24,42,60]:
        x=origem+4
        while x<origem+29:
            largura=rng.randint(2,4); alto=rng.randint(9,14)
            cor=rng.choice(paleta)
            d.rectangle((x,y-alto,x+largura,y),fill=cor)
            d.line((x,y-alto+2,x+largura,y-alto+2),fill='#d2c297')
            x+=largura+2
        d.rectangle((origem+2,y+1,origem+32,y+3),fill='#9b7a48')
# Candeeiros, luz quente e plantas discretas.
for x in [88,148]:
    d.rectangle((x-1,38,x+1,62),fill='#b79d61')
    d.rectangle((x-5,34,x+5,38),fill='#dcc076')
    d.rectangle((x-3,29,x+3,34),fill='#f4d995')
    d.rectangle((x-2,27,x+2,28),fill='#fff2bf')
    d.rectangle((x-4,62,x+4,63),fill='#9e8150')
for x in [3,230]:
    d.rectangle((x,60,x+6,68),fill='#ad7955')
    d.line((x+3,45,x+3,62),fill='#729b6c')
    for dx,dy in [(-3,48),(1,52),(-2,56)]:d.rectangle((x+dx,dy,x+dx+4,dy+2),fill='#8aaf7c')
# Preceptor feito pelo mesmo script, atrás da mesa.
pessoa=Image.open(RAIZ/'mascote.png').crop((6,4,34,39))
im.alpha_composite(pessoa,(107,37));d=ImageDraw.Draw(im)
d.rectangle((94,67,147,71),fill='#c29a5d');d.rectangle((97,72,100,85),fill='#866540');d.rectangle((141,72,144,85),fill='#866540')
d.rectangle((109,64,133,67),fill='#f5dba2');d.line((121,64,121,67),fill='#8b7048')
im.save(RAIZ/'arquivo.png',optimize=True)
