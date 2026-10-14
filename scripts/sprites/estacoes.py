#!/usr/bin/env python3
"""Ramos, pétalas e neve autorais, em pixels: ornamentos da Biblioteca."""
from pathlib import Path
import numpy as np
from PIL import Image

DESTINO = Path(__file__).resolve().parents[2] / 'public/flashcards/estacoes'
PALETAS = {
    'verao': ('#315344', '#4e8053', '#89ac65', '#e3c16a'),
    'outono': ('#644031', '#b75f39', '#dd944d', '#f0c678'),
    'inverno': ('#314a55', '#51767c', '#9cbbaf', '#d8dfbf'),
    'inverno-neve': ('#324856', '#59787d', '#bed9d6', '#f2f3db'),
    'primavera': ('#365545', '#689459', '#b3bf78', '#edb8ad'),
}

def rgba(c):
    return tuple(int(c[i:i+2], 16) for i in (1, 3, 5)) + (255,)

def pintar(estacao, paleta):
    # Coordenadas inteiras e máscaras numpy; sem fotografias ou amostras.
    a = np.zeros((64, 48, 4), dtype=np.uint8)
    y, x = np.mgrid[:64, :48]
    haste = 10 + (y * .30).astype(int)
    a[np.abs(x - haste) <= 1] = rgba(paleta[0])
    for i, cy in enumerate(range(10, 61, 10)):
        lado = -1 if i % 2 else 1
        cx = int(10 + cy * .30) + lado * 7
        folha = (x - cx)**2 / 49 + (y - cy)**2 / 12 <= 1
        a[folha] = rgba(paleta[1])
        a[folha & (y <= cy)] = rgba(paleta[2])
        a[folha & (x == cx)] = rgba(paleta[0])
        if estacao == 'primavera':
            flor = ((abs(x-cx) <= 2) & (abs(y-(cy-3)) <= 1)) | ((abs(x-cx) <= 1) & (abs(y-(cy-3)) <= 2))
            a[flor] = rgba(paleta[3])
            a[(x==cx) & (y==cy-3)] = rgba('#f7d483')
        elif estacao == 'inverno-neve':
            a[folha & (y <= cy-1)] = rgba(paleta[3])
        elif estacao == 'verao':
            a[(abs(x-cx)<=1) & (abs(y-cy)<=1)] = rgba(paleta[3])
    p = np.zeros((8, 8, 4), dtype=np.uint8)
    py, px = np.mgrid[:8, :8]
    if estacao == 'inverno-neve':
        m = ((px==3) & (abs(py-3)<=2)) | ((py==3) & (abs(px-3)<=2))
    else:
        m = (px-3)**2/9 + (py-3)**2/4 <= 1
    p[m] = rgba(paleta[3] if estacao == 'primavera' or estacao == 'inverno-neve' else paleta[2])
    p[m & (px==py)] = rgba(paleta[1])
    return a, p

if __name__ == '__main__':
    DESTINO.mkdir(parents=True, exist_ok=True)
    for nome, paleta in PALETAS.items():
        ramo, particula = pintar(nome, paleta)
        Image.fromarray(ramo).save(DESTINO / f'{nome}-ramo.png')
        Image.fromarray(particula).save(DESTINO / f'{nome}-particula.png')
