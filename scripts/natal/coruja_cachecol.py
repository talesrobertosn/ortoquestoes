"""A coruja de cachecol vermelho (modo Natal, etapa 2, 21/11/2026).

A coruja é o desenho do Tales (scripts/sprites/coruja_nova.py): o traço não muda. O xale marrom-dourado que ela já usa no
peito vira um cachecol de veludo vermelho, pixel a pixel, mantendo a luz e a sombra de cada um (o tom vermelho é
escolhido pela luminância do pixel original). Só o que está abaixo do rosto e tem o matiz do xale muda: o rosto, o
capuz, as asas, a lanterna acesa e as páginas ficam como estão.
Saída: public/pixel/mascote/coruja-nova-natal.png (mesma grade da original). Depois: scripts/sprites/luz_bichos.py.
Uso: python3 scripts/natal/coruja_cachecol.py [--previa ARQUIVO]
"""
from __future__ import annotations

import colorsys
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
FONTE = RAIZ / "public/pixel/mascote/coruja-nova.png"
SAIDA = RAIZ / "public/pixel/mascote/coruja-nova-natal.png"
QW, QH = 44, 32
VERMELHO = np.array([(52, 6, 10), (86, 12, 18), (124, 20, 26), (162, 30, 34), (200, 46, 44), (232, 80, 66), (252, 132, 108)], float)


def maior_bloco(m: np.ndarray) -> np.ndarray:
    """O maior bloco de pixels brancos (o rosto), juntando pedaços separados por 1 pixel (olhos e o contorno do
    coração do rosto); as penas brancas da asa ficam de fora."""
    h, w = m.shape
    grosso = m.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            grosso |= np.roll(np.roll(m, dy, 0), dx, 1)
    rot = np.zeros((h, w), int)
    n, maior, tam = 0, 0, 0
    for y in range(h):
        for x in range(w):
            if grosso[y, x] and not rot[y, x]:
                n += 1
                pilha, cont = [(y, x)], 0
                rot[y, x] = n
                while pilha:
                    cy, cx = pilha.pop()
                    cont += int(m[cy, cx])
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < h and 0 <= nx < w and grosso[ny, nx] and not rot[ny, nx]:
                            rot[ny, nx] = n
                            pilha.append((ny, nx))
                if cont > tam:
                    maior, tam = n, cont
    return m & (rot == maior)


def main() -> None:
    img = np.array(Image.open(FONTE).convert("RGBA")).astype(float)
    h, w = img.shape[:2]
    saida = img.copy()
    mudados = 0
    for fy in range(0, h, QH):
        for fx in range(0, w, QW):
            q = img[fy:fy + QH, fx:fx + QW]
            a = q[..., 3] > 0
            rgb = q[..., :3] / 255
            hsv = np.array([[colorsys.rgb_to_hsv(*p) for p in linha] for linha in rgb])
            # o rosto: os pixels quase brancos; o cachecol começa logo abaixo da parte de baixo dele
            branco = a & (hsv[..., 1] < 0.12) & (hsv[..., 2] > 0.82)
            rosto = maior_bloco(branco)
            ys = np.where(rosto.any(1))[0]
            if not len(ys):
                continue
            base_rosto = ys.max()
            branco = rosto
            Y = np.arange(QH)[:, None]
            matiz = hsv[..., 0] * 360
            xale = a & (matiz > 18) & (matiz < 48) & (hsv[..., 1] > 0.32) & (Y >= base_rosto - 1)
            lanterna = (matiz > 38) & (hsv[..., 2] > 0.85) & (hsv[..., 1] > 0.3)
            xale &= ~lanterna
            # só na largura do corpo (o rosto e 4 px para cada lado): a asa levantada, com penas douradas, fica igual
            xs = np.where(branco.any(0))[0]
            X = np.arange(QW)[None, :]
            xale &= (X >= xs.min() - 4) & (X <= xs.max() + 4)
            # a borda do capuz encosta no rosto: o que toca um pixel branco (vizinhança de 8) fica como está
            perto = np.zeros_like(branco)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    perto |= np.roll(np.roll(branco, dy, 0), dx, 1)
            xale &= ~(perto & (Y < base_rosto + 1))
            lum = rgb @ np.array([0.299, 0.587, 0.114])
            idx = np.clip((lum - 0.12) / 0.62 * (len(VERMELHO) - 1), 0, len(VERMELHO) - 1).round().astype(int)
            novo = VERMELHO[idx]
            bloco = saida[fy:fy + QH, fx:fx + QW]
            bloco[..., :3] = np.where(xale[..., None], novo, bloco[..., :3])
            mudados += int(xale.sum())
    Image.fromarray(saida.astype(np.uint8), "RGBA").save(SAIDA, optimize=True)
    print(SAIDA.relative_to(RAIZ), mudados, "pixels do xale viraram cachecol")
    if "--previa" in sys.argv:
        p = Path(sys.argv[sys.argv.index("--previa") + 1])
        lado = Image.new("RGBA", (w * 2 + 8, h), (60, 50, 45, 255))
        lado.alpha_composite(Image.fromarray(img.astype(np.uint8)), (0, 0))
        lado.alpha_composite(Image.fromarray(saida.astype(np.uint8)), (w + 8, 0))
        lado.resize((lado.width * 4, lado.height * 4), Image.NEAREST).save(p)


if __name__ == "__main__":
    main()
