from pathlib import Path
from PIL import Image, ImageDraw
import sys
R=Path(__file__).resolve().parents[2];P=Path(sys.argv[1]) if len(sys.argv)>1 else R/'output/login-biblioteca';P.mkdir(parents=True,exist_ok=True);sys.path.insert(0,str(R/'scripts'))
import gerar_mascote as m
frames=[]
for i in range(16):
 t=m.q_natal_chocolate((i//2)%8);t.luz(45,60,40,'#ffc478',100,.35);frames.append(Image.fromarray(t.render()))
sheet=Image.new('RGBA',(96*16,128))
for i,f in enumerate(frames):sheet.alpha_composite(f,(i*96,0))
sheet.save(P/'mascote-chocolate.png')
# Original flame stage, original sword and original front flame, same layering as InicioHd.
source=Image.open(R/'public/pixel/inicio/fogo.png').convert('RGBA');sword=Image.open(R/'public/pixel/inicio/espada.png').convert('RGBA')
fw,fh=source.width//6,source.height//8
# Six native frames: preserve the site's flame timing without a 16-frame truncation.
# Larger flame and grounded ember bed. Front fire uses identical coordinates to the
# back fire, avoiding the old cut/re-scaled strip at the base of the sword.
out=Image.new('RGBA',(80*6,96))
for i in range(6):
 f=Image.new('RGBA',(80,96));d=ImageDraw.Draw(f)
 d.ellipse((12,85,67,95),fill=(55,33,25,220))
 for x,y,r in [(19,90,4),(29,92,5),(39,90,4),(50,92,5),(60,89,4)]:
  d.ellipse((x-r,y-2,x+r,y+2),fill=(104,47,23,240));d.line([(x-r+1,y),(x+2,y-1)],fill=(216,100,31,245))
 fire=source.crop((i*fw,4*fh,(i+1)*fw,5*fh)).resize((62,88),Image.Resampling.NEAREST)
 f.alpha_composite(fire,(9,3));f.alpha_composite(sword.resize((18,80),Image.Resampling.NEAREST),(31,5))
 # Only the overlapping lower section is in front, without changing its geometry.
 front=fire.crop((0,65,62,88));f.alpha_composite(front,(9,68))
 out.alpha_composite(f,(i*80,0))
out.save(P/'bonfire-site.png')
