"""Artes originais de expectativa: objetos fechados, sem antecipar as medalhas.

Uso: python3 scripts/conquistas/gerar_expectativas.py
"""
from PIL import Image, ImageDraw
from pathlib import Path
PASTA = Path(__file__).resolve().parents[2] / "public/conquistas/expectativa"
PASTA.mkdir(parents=True, exist_ok=True)
im = Image.new('RGBA', (48, 48)); d = ImageDraw.Draw(im)
# Silhueta, tampa curva e lado em perspectiva.
d.polygon([(7,23),(10,17),(15,13),(35,13),(41,19),(41,35),(36,40),(8,37)], fill='#081b19')
d.polygon([(9,23),(12,18),(17,15),(33,15),(38,20),(35,24)], fill='#b8864d')
d.polygon([(9,25),(35,26),(35,38),(9,35)], fill='#684529')
d.polygon([(36,24),(40,20),(40,34),(36,38)], fill='#3c3326')
# Pranchas e luz vinda do alto à esquerda.
for y, color in [(25,'#9b6d3d'),(26,'#ae7a44'),(27,'#83582f'),(30,'#a0703b'),(31,'#4c3626'),(33,'#986434'),(35,'#523b29')]:
    d.line([(10,y),(34,y+2)], fill=color)
d.line([(12,19),(35,20)], fill='#d3a364'); d.line([(15,16),(33,17)], fill='#e2ba79')
d.line([(10,22),(35,23)], fill='#76502f'); d.line([(9,24),(35,26)],fill='#d3aa6a')
d.line([(36,26),(39,23)],fill='#a17c47'); d.line([(36,29),(39,26)],fill='#5d4930')
# Cintas em verdete e ferro; rebites e fecho dourado ainda trancado.
for x in (14,29):
    d.polygon([(x,16),(x+3,16),(x+2,24),(x+2,37),(x-1,36),(x-1,24)],fill='#143f39')
    d.line([(x,17),(x-1,23),(x-1,35)],fill='#57917b')
    for y in (19,27,33): d.point((x,y),fill='#d3b477')
d.rounded_rectangle((20,24,26,32), radius=1, fill='#231f19')
d.rectangle((21,25,25,30), fill='#c7a05f'); d.line([(21,25),(24,25)],fill='#f0d18b')
d.rectangle((22,27,23,28), fill='#302d24'); d.point((23,29),fill='#302d24')
d.line([(10,36),(34,39)],fill='#a77c49'); d.line([(11,37),(34,40)],fill='#18251e')
# Fio contido de luz na fresta, sem revelar a recompensa.
d.line([(17,23),(27,24)],fill='#d8cf93'); d.point((18,22),fill='#eee1a5')
d.point((8,22),fill='#f5e5a1'); d.point((8,21),fill='#dac17d')
im.resize((144,144),Image.Resampling.NEAREST).save(PASTA / 'bau.png')
im.resize((144,144),Image.Resampling.NEAREST).save(PASTA / 'relicario.png')


def salvar(nome, desenhar):
    tela = Image.new('RGBA', (48, 48))
    pincel = ImageDraw.Draw(tela)
    desenhar(pincel)
    tela.resize((144, 144), Image.Resampling.NEAREST).save(PASTA / (nome + '.png'))


def livro(d):
    d.polygon([(12,8),(32,8),(38,12),(38,38),(15,40),(9,36),(9,12)], fill='#091e1a')
    d.polygon([(13,10),(32,10),(35,13),(35,37),(14,38),(11,35),(11,13)], fill='#176052')
    d.rectangle((13,12,16,35), fill='#0d382f'); d.line([(17,12),(17,36)], fill='#579677')
    d.rectangle((19,13,32,34),outline='#a28a51'); d.rectangle((21,15,30,32),outline='#335f43')
    d.polygon([(14,38),(35,37),(35,39),(15,41),(12,38)],fill='#d9c18b')
    for x in (18,23,28,32): d.point((x,39),fill='#a18a5a')
    d.rectangle((27,22,37,26),fill='#563e26'); d.rectangle((29,21,34,27),fill='#d1aa59')
    d.rectangle((31,23,32,25),fill='#322c1f'); d.point((29,21),fill='#f4d692')
    d.point((13,10),fill='#8cb393')


def pergaminho(d):
    d.ellipse((8,10,37,17),fill='#33291e'); d.rectangle((12,13,34,35),fill='#b69659')
    d.rectangle((14,14,32,33),fill='#e2c88a'); d.rectangle((16,15,29,32),fill='#f2dfa5')
    d.rectangle((11,11,34,15),fill='#b59861'); d.line([(13,12),(32,12)],fill='#f4dfa3')
    d.ellipse((8,10,15,17),fill='#e8cb88'); d.ellipse((10,12,13,15),fill='#7b5d34')
    d.rectangle((11,32,34,36),fill='#b99a5d'); d.line([(13,33),(32,33)],fill='#f5dea1')
    d.ellipse((31,30,37,37),fill='#8a6a3c'); d.ellipse((32,31,36,36),fill='#d8b977')
    d.line([(24,13),(24,35)],fill='#195a4a',width=3)
    d.polygon([(20,24),(23,20),(28,23),(28,28),(23,31),(19,27)],fill='#772d31')
    d.polygon([(21,24),(24,22),(26,24),(26,27),(23,29),(21,27)],fill='#c36549')
    d.point((22,23),fill='#edb370')


def cartas(d):
    d.polygon([(9,14),(29,8),(36,33),(15,39)],fill='#163a36')
    d.polygon([(13,10),(34,12),(32,39),(11,37)],fill='#e0c995')
    d.rectangle((15,12,37,39),fill='#0a2226'); d.rectangle((17,14,35,37),fill='#22505a')
    d.rectangle((19,16,33,35),outline='#5d9b99')
    d.polygon([(26,20),(31,26),(26,32),(21,26)],fill='#bd9957')
    d.polygon([(26,22),(29,26),(26,29),(23,26)],fill='#f1d488')
    d.rectangle((15,23,37,26),fill='#8a6845'); d.line([(16,23),(36,23)],fill='#d5b572')
    d.rectangle((24,22,29,28),fill='#dfbd72'); d.rectangle((26,24,27,26),fill='#3f3427')


def mapa(d):
    d.polygon([(8,13),(18,10),(28,14),(38,11),(38,35),(28,39),(18,35),(8,38)],fill='#423521')
    d.polygon([(10,14),(18,12),(27,16),(36,13),(36,33),(28,36),(18,33),(10,35)],fill='#d4bd83')
    d.line([(18,13),(18,32)],fill='#8f7a4f'); d.line([(28,16),(28,35)],fill='#f5dfa4')
    d.line([(12,30),(17,25),(23,27),(29,21),(33,22)],fill='#a9784b',width=2)
    d.rectangle((11,19,36,23),fill='#245345'); d.line([(11,19),(35,19)],fill='#638d68')
    d.rectangle((21,18,27,25),fill='#b89755'); d.rectangle((23,20,25,22),fill='#473c25')
    d.point((22,18),fill='#f1d594')


def estandarte(d):
    d.rectangle((11,8,14,39),fill='#785732'); d.line([(11,9),(11,38)],fill='#c19d5f')
    d.polygon([(10,8),(13,5),(16,8),(13,12)],fill='#dec477')
    d.rectangle((14,12,34,32),fill='#0c302a'); d.rectangle((16,13,33,30),fill='#246151')
    d.polygon([(16,30),(24,35),(33,30)],fill='#143f35')
    d.line([(16,14),(31,14)],fill='#a88c52'); d.line([(31,15),(31,29)],fill='#719573')
    d.rectangle((17,21,32,24),fill='#b79658'); d.rectangle((22,19,28,26),fill='#d8b971')
    d.rectangle((24,21,25,24),fill='#4b3824')


def carta(d):
    d.polygon([(7,17),(24,9),(40,17),(40,35),(7,35)],fill='#4b3926')
    d.rectangle((9,18,38,33),fill='#d6c18d')
    d.polygon([(9,18),(24,27),(38,18)],fill='#f3e0ac')
    d.line([(9,32),(19,25)],fill='#b39d6a'); d.line([(38,32),(28,25)],fill='#b39d6a')
    d.line([(9,18),(24,28),(38,18)],fill='#9b8759')
    d.ellipse((20,23,28,31),fill='#1d6351'); d.ellipse((21,24,26,29),fill='#419277')
    d.line([(23,25),(25,27),(23,28)],fill='#c0c591')

for nome, fn in [('livro',livro),('pergaminho',pergaminho),('cartas',cartas),('mapa',mapa),('estandarte',estandarte),('carta',carta)]:
    salvar(nome,fn)
