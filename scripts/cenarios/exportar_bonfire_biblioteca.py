from pathlib import Path
from PIL import Image
import math,shutil
R=Path(__file__).resolve().parents[2];P=R/'output/bonfire-integrada';O=R/'public/pixel/acesso/biblioteca';O.mkdir(exist_ok=True,parents=True)
base=Image.open(P/'biblioteca-cenario.png')
base.save(O/'cenario-v3.webp',quality=90,method=6)
base.crop((540,0,1620,1020)).save(O/'movel-topo-v3.webp',quality=88,method=6)
for name in ['bonfire-integrada-v3','bonfire-luz-v3','bonfire-luz-movel-v3']:shutil.copyfile(P/(name+'.webp'),O/(name+'.webp'))
energies=[.68+.15*math.sin(math.tau*i/24*2+.8)+.08*math.sin(math.tau*i/24*3+1.7)+.035*math.sin(math.tau*i/24*7) for i in range(24)]
css='/* Gerado por exportar_bonfire_biblioteca.py: mesmo relógio dos 24 quadros de fogo e luz. */\n@keyframes pc-bonfire-resposta {\n'
for i,e in enumerate(energies):css+=f'  {i/24*100:.5f}% {{ --bonfire-forca: {e:.4f}; }}\n'
css+=f'  100% {{ --bonfire-forca: {energies[0]:.4f}; }}\n}}\n'
(R/'src/estilos/paginas/BonfireResposta.css').write_text(css)
