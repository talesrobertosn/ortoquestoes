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
    # As linhas da folha não caem a cada 32 px certinhos (01/11/2026, Tales: "a coruja está cortada"): a grade fixa
    # cortava os pés e trazia a ponta da linha de cima. Cada linha é achada pela faixa de pixels desenhados (fora o
    # nome à esquerda) e recortada com a base dos pés 2 px acima do fim do quadro, igual em todas as linhas.
    desenho = (np.abs(g - fundo).sum(2) > 0)
    desenho[:, :X0 + 6] = False
    tem = desenho.any(1)
    faixas, y = [], 0
    while y < g.shape[0]:
        if tem[y]:
            ini = y
            while y < g.shape[0] and tem[y]:
                y += 1
            faixas.append((ini, y))
        else:
            y += 1
    assert len(faixas) == len(LINHAS), f"esperava {len(LINHAS)} faixas, achei {faixas}"
    for li in range(len(LINHAS)):
        ini, fim = faixas[li]
        assert fim - ini <= QH - 2, f"linha {LINHAS[li]} alta demais: {fim - ini}"
        topo = fim + 2 - QH
        for k in range(NQ):
            x = round(X0 + PASSO * k)
            q = np.full((QH, QW, 3), fundo)
            pedaco = g[max(0, topo):fim + 2, x:x + QW]
            q[QH - pedaco.shape[0]:] = pedaco
            # Só o que pertence a esta faixa (nada da linha de cima ou de baixo).
            fora = np.ones(QH, bool)
            fora[QH - (fim + 2 - ini):QH] = False
            q[fora] = fundo
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
