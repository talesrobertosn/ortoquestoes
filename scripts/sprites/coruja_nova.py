"""A coruja bibliotecária nova (31/10/2026): desenho do Tales no PixelLab, livre de direitos, para usar igual.

A fonte (scripts/sprites/coruja/coruja-fonte.png, 256 x 256) é a folha dele reduzida à grade original (cada pixel da
arte ocupava 4 x 4 na imagem enviada, sem perda nenhuma). Ela tem 8 linhas de 5 quadros, com o nome da linha escrito à
esquerda: IDLE, WALK, FLY, LAND, READ, SLEEP, WAVE, LOOK. Este script só recorta os quadros (44 x 32, na grade em que
ele desenhou), tira o fundo e monta public/pixel/mascote/coruja-nova.png na ordem de LINHAS (a mesma de
src/biblioteca/sala/CorujaPixel.tsx).
Uso: python3 scripts/sprites/coruja_nova.py [--previa PASTA]
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
FONTE = RAIZ / "scripts/sprites/coruja/coruja-fonte.png"
SAIDA = RAIZ / "public/pixel/mascote/coruja-nova.png"
QW, QH, NQ = 44, 32, 5
X0, PASSO = 24, 43.75          # onde começa a 1ª coluna de quadros (depois do nome da linha) e a distância entre elas
LINHAS = ["parada", "andando", "voando", "pousando", "lendo", "dormindo", "acenando", "olhando"]


def main() -> None:
    g = np.asarray(Image.open(FONTE).convert("RGB")).astype(int)
    fundo = g[0, 0]
    folha = np.zeros((QH * len(LINHAS), QW * NQ, 4), np.uint8)
    for li in range(len(LINHAS)):
        for k in range(NQ):
            x = round(X0 + PASSO * k)
            q = g[li * QH:(li + 1) * QH, x:x + QW]
            a = (np.abs(q - fundo).sum(2) > 0)
            # O fim do nome da linha (texto) às vezes entra na 1ª coluna: some o que vem antes da 1ª coluna vazia.
            if k == 0:
                vazias = np.where(~a[:, :8].any(0))[0]
                if a[:, 0].any() and vazias.size:
                    a[:, :vazias[0]] = False
            folha[li * QH:(li + 1) * QH, k * QW:(k + 1) * QW, :3] = q
            folha[li * QH:(li + 1) * QH, k * QW:(k + 1) * QW, 3] = a * 255
    img = Image.fromarray(folha, "RGBA")
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    img.quantize(256, method=Image.FASTOCTREE, dither=Image.NONE).save(SAIDA, optimize=True)
    print(SAIDA.relative_to(RAIZ), img.size, SAIDA.stat().st_size, "bytes")
    if "--previa" in sys.argv:
        destino = Path(sys.argv[sys.argv.index("--previa") + 1]); destino.mkdir(parents=True, exist_ok=True)
        f = Image.new("RGBA", img.size, (246, 247, 243, 255)); f.alpha_composite(img)
        f.resize((img.width * 4, img.height * 4), Image.NEAREST).save(destino / "coruja-nova-4x.png")


if __name__ == "__main__":
    main()
