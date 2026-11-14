from pathlib import Path
from PIL import Image
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
out=Image.new('RGBA',(80*16,66))
for i in range(16):
 f=Image.new('RGBA',(80,66));fire=source.crop(((i%6)*fw,3*fh,(i%6+1)*fw,4*fh))
 f.alpha_composite(fire.resize((62,66),Image.Resampling.NEAREST),(9,0))
 f.alpha_composite(sword.resize((18,60),Image.Resampling.NEAREST),(31,1))
 front=fire.resize((54,60),Image.Resampling.NEAREST);front.putalpha(front.getchannel('A').point(lambda v:v))
 front=front.crop((0,40,54,60));f.alpha_composite(front,(13,44))
 out.alpha_composite(f,(i*80,0))
out.save(P/'bonfire-site.png')
