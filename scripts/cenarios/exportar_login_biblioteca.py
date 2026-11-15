"""Exporta a biblioteca aprovada. Primeiro gere o cenário e os sprites em output/login-biblioteca."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'output/login-biblioteca';o=ROOT/'public/pixel/acesso/biblioteca';o.mkdir(parents=True,exist_ok=True)
base=Image.open(p/'biblioteca-cenario.png')
recortes={'movel-topo':(540,0,1620,1020),'movel-base':(540,2850,1980,3600),'miolo':(0,1380,2160,2340)}
base.save(o/'cenario.webp',quality=90,method=6)
for name,box in recortes.items():base.crop(box).save(o/(name+'.webp'),quality=90,method=6)
for src,dst in [('mascote-chocolate','mascote'),('bonfire-site','bonfire-v2')]:Image.open(p/(src+'.png')).save(o/(dst+'.webp'),lossless=True,method=6)
