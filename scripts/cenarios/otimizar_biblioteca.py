"""Exporta os mesmos 24 quadros aprovados com menos pixels redundantes.
Executar após exportar_bonfire_biblioteca.py. Preserva os arquivos v3 para clientes antigos.
O fogo mantém dois pixels por pixel original; os mapas suaves de luz usam metade da resolução.
"""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[2]
PASTA = ROOT / 'public/pixel/acesso/biblioteca'
relatorio = []
for nome, escala in [('bonfire-integrada', 2/3), ('bonfire-luz', .5), ('bonfire-luz-movel', .5)]:
    origem = PASTA / f'{nome}-v3.webp'
    destino = PASTA / f'{nome}-v4.webp'
    with Image.open(origem) as atlas:
        w, h = atlas.width // 24, atlas.height
        novo_w, novo_h = round(w * escala), round(h * escala)
        saida = Image.new('RGBA', (novo_w * 24, novo_h))
        # Redimensionar separadamente impede que cores vazem de um quadro para o vizinho.
        for i in range(24):
            filtro = Image.Resampling.NEAREST if nome == 'bonfire-integrada' else Image.Resampling.LANCZOS
            quadro = atlas.crop((i*w, 0, (i+1)*w, h)).resize((novo_w, novo_h), filtro)
            saida.paste(quadro, (i * novo_w, 0))
        saida.save(destino, method=6, **({'lossless': True} if nome == 'bonfire-integrada' else {'quality': 85}))
        saida.crop((0, 0, novo_w, novo_h)).save(PASTA / f'{nome}-parado-v4.webp', lossless=True, method=6)
        relatorio.append(dict(arquivo=destino.name, antes=origem.stat().st_size, depois=destino.stat().st_size,
                              pixelsAntes=atlas.width*atlas.height, pixelsDepois=saida.width*saida.height))
print(json.dumps(relatorio, indent=2))
