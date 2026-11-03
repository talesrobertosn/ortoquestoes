"""Mapas de luz dos bichos (01/11/2026): o "ray tracing" dos mascotes.

Cada folha de sprite ganha quatro mapas do mesmo tamanho, `<folha>-luz-{q,f}{e,d}.png`: quanto cada pixel recebe de
uma luz vinda da esquerda (e) ou da direita (d), já na cor da luz quente (q, para clarear) e da sombra fria (f, para
escurecer). No site (componentes/mascote/luz.ts e Luz.css), duas camadas
por cima do sprite herdam o quadro da animação e usam esses mapas; a força vem da distância até a fogueira, a chama, o
sol ou a lua daquela cena. Assim o lado do esqueleto virado para o fogo esquenta, o outro esfria e a borda pega um
contorno de luz, como nos cenários pintados.

Como a luz é calculada, por pixel:
- o relevo sai da distância até o contorno do desenho (o crânio vira uma cúpula, a asa e a armadura ficam mais planas),
  com um pouco do brilho do próprio pixel (o que já é claro sobressai);
- a normal de cada pixel vem do gradiente desse relevo;
- a luz lateral é a parte da iluminação que sobra além da luz de frente (só os lados virados para a fonte acendem);
- a borda do lado da luz ganha um contorno extra (rim light);
- tudo é quantizado em quatro faixas, para continuar pixel art.

Uso: python scripts/sprites/luz_bichos.py  (precisa de numpy e Pillow)
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


def distancia(mascara: np.ndarray, ate: int) -> np.ndarray:
    """Distância (em pixels, até `ate`) de cada pixel do desenho até o fundo: erosões sucessivas em cruz."""
    dist = np.zeros(mascara.shape, float)
    atual = mascara.copy()
    for k in range(1, ate + 2):
        dist[atual] = k
        p = np.pad(atual, 1)
        atual = atual & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
        if not atual.any():
            break
    return dist


def desfocar(img: np.ndarray, sigma: float) -> np.ndarray:
    """Desfoque gaussiano separável (só numpy)."""
    r = max(1, int(round(sigma * 3)))
    x = np.arange(-r, r + 1)
    k = np.exp(-(x ** 2) / (2 * sigma ** 2))
    k /= k.sum()
    alto, largo = img.shape
    p = np.pad(img, ((0, 0), (r, r)), mode="edge")
    h = sum(k[i] * p[:, i:i + largo] for i in range(2 * r + 1))
    p = np.pad(h, ((r, r), (0, 0)), mode="edge")
    return sum(k[i] * p[i:i + alto] for i in range(2 * r + 1))


PASTA = Path(__file__).resolve().parents[2] / "public" / "pixel" / "mascote"

# Folha e raio do relevo (em pixels da arte): quanto maior, mais "redondo" o volume.
FOLHAS = [
    ("esqueleto.png", 11.0),
    ("esqueleto-poses.png", 11.0),
    ("esqueleto-poses2.png", 11.0),
    ("esqueleto-acesso.png", 11.0),
    ("esqueleto-poses3.png", 11.0),
    ("gato-fofo.png", 8.0),
    ("coruja-nova.png", 5.0),
]
FAIXAS = np.array([0.0, 0.34, 0.67, 1.0])


def mapa(rgba: np.ndarray, raio: float, lado: int) -> np.ndarray:
    """Intensidade (0 a 1) da luz vinda do lado `lado` (-1 esquerda, +1 direita) em cada pixel."""
    alfa = rgba[..., 3] > 24
    dist = distancia(alfa, int(np.ceil(raio)))
    cupula = np.sqrt(np.clip(dist / raio, 0, 1))
    lum = (rgba[..., :3].astype(float) @ np.array([0.299, 0.587, 0.114])) / 255.0
    altura = desfocar(cupula + 0.05 * lum * alfa, 1.4)
    gy, gx = np.gradient(altura)
    k = 3.4
    nx, ny, nz = -gx * k, -gy * k, np.ones_like(gx)
    norma = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    nx, ny, nz = nx / norma, ny / norma, nz / norma
    # A luz vem do lado e um pouco de cima, rasante (como uma fogueira ao lado ou um sol baixo).
    lx, ly, lz = 0.82 * lado, -0.42, 0.38
    ln = (lx ** 2 + ly ** 2 + lz ** 2) ** 0.5
    lx, ly, lz = lx / ln, ly / ln, lz / ln
    ndl = nx * lx + ny * ly + nz * lz
    frente = lz * 0.72
    lateral = np.clip((ndl - frente) / (1 - frente), 0, 1)
    # Contorno de luz: a borda (1 a 2 px para dentro) que olha para a fonte.
    borda = (dist > 0) & (dist <= 1.6)
    olha = (nx * lado) > 0.08
    lateral = np.where(borda & olha, np.maximum(lateral, 0.75), lateral)
    # Só dentro do desenho, e sem acender pixel quase transparente.
    lateral = lateral * alfa
    # Quatro faixas (pixel art): o valor mais próximo de cada pixel.
    idx = np.abs(lateral[..., None] - FAIXAS[None, None, :]).argmin(-1)
    return FAIXAS[idx] * alfa


# As faixas viram cor: a luz quente (fogo, poente) clareia em "tela"; a sombra fria (céu, noite) escurece em
# "multiplicar". Cada faixa tem a sua cor e opacidade, como as bordas em degrau da luz das cenas.
RAMPA_QUENTE = [(150, 70, 25, 0.55), (255, 140, 60, 0.82), (255, 214, 150, 1.0)]
RAMPA_FRIA = [(132, 142, 196, 0.5), (86, 100, 166, 0.75), (52, 62, 124, 0.95)]


def colorir(m: np.ndarray, rampa) -> np.ndarray:
    saida = np.zeros(m.shape + (4,), np.uint8)
    for faixa, (r, g, b, a) in zip(FAIXAS[1:], rampa):
        sel = np.isclose(m, faixa)
        saida[sel] = (r, g, b, round(a * 255))
    return saida


def main() -> None:
    for nome, raio in FOLHAS:
        caminho = PASTA / nome
        rgba = np.array(Image.open(caminho).convert("RGBA"))
        for lado, sufixo in ((-1, "e"), (1, "d")):
            m = mapa(rgba, raio, lado)
            for tipo, rampa in (("q", RAMPA_QUENTE), ("f", RAMPA_FRIA)):
                destino = PASTA / nome.replace(".png", f"-luz-{tipo}{sufixo}.png")
                Image.fromarray(colorir(m, rampa)).save(destino, optimize=True)
                print(destino.name, destino.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
