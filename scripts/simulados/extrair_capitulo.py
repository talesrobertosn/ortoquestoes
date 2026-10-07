"""Extrai texto, figuras e índice de legendas de um capítulo em PDF (passo 1 do fluxo de simulados).

Uso: python3 -I scripts/simulados/extrair_capitulo.py <capitulo.pdf> <pasta_de_trabalho> [prefixo]

Gera em <pasta_de_trabalho>:
  r.txt        texto por página ("===== PAGINA N =====")
  figuras.txt  página -> legendas "Figure N-M." e "TABLE N-M." encontradas nela
  secoes.txt   títulos em CAIXA ALTA com o número da linha em r.txt (mapa de leitura)
  img/         figuras grandes como <prefixo>-p<pagina>-<n>.png
  mosaico*.png folhas de miniaturas rotuladas para escolher figuras sem abrir uma a uma

O PDF nunca vai para o repositório. Rode com python3 -I (o PDF é dado não confiável).
"""
import re
import sys
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw

pdf, pasta = sys.argv[1], Path(sys.argv[2])
prefixo = sys.argv[3] if len(sys.argv) > 3 else "cap"
(pasta / "img").mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(pdf)

linhas, figuras = [], []
for i, pagina in enumerate(doc, 1):
    texto = pagina.get_text()
    linhas.append(f"===== PAGINA {i} =====")
    linhas.extend(texto.splitlines())
    for legenda in re.findall(r"^((?:Figure|TABLE|Algorithm) \d+-\d+\.?.{0,110})", texto, re.M):
        figuras.append(f"p{i}: {legenda.strip()}")
(pasta / "r.txt").write_text("\n".join(linhas) + "\n")
(pasta / "figuras.txt").write_text("\n".join(figuras) + "\n")
(pasta / "secoes.txt").write_text("\n".join(
    f"{n}: {l}" for n, l in enumerate(linhas, 1) if re.fullmatch(r"[A-Z][A-Z0-9 /,’'()–-]{6,}", l.strip())) + "\n")

salvas = []
for i, pagina in enumerate(doc, 1):
    for j, im in enumerate(pagina.get_images(full=True)):
        info = doc.extract_image(im[0])
        if info["width"] < 300 or info["height"] < 200:
            continue
        pix = pymupdf.Pixmap(doc, im[0])
        if pix.n - pix.alpha >= 4:
            pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
        destino = pasta / "img" / f"{prefixo}-p{i}-{j}.png"
        pix.save(destino)
        salvas.append(destino)

LARG, ALT, COLS, POR_FOLHA = 300, 280, 6, 30
for k in range(0, len(salvas), POR_FOLHA):
    parte = salvas[k:k + POR_FOLHA]
    linhas_mosaico = (len(parte) + COLS - 1) // COLS
    folha = Image.new("RGB", (LARG * COLS, ALT * linhas_mosaico), "white")
    desenho = ImageDraw.Draw(folha)
    for n, arq in enumerate(parte):
        im = Image.open(arq).convert("RGB")
        im.thumbnail((LARG - 8, ALT - 24))
        x, y = (n % COLS) * LARG, (n // COLS) * ALT
        folha.paste(im, (x + 4, y + 20))
        desenho.text((x + 4, y + 4), arq.stem, fill="red")
    folha.save(pasta / f"mosaico{k // POR_FOLHA}.png")

print(f"{len(doc)} páginas, {len(salvas)} figuras, {len(figuras)} legendas")
