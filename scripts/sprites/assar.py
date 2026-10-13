#!/usr/bin/env python3
"""Assa as folhas de animação dos personagens modelados em volume.

    python3 scripts/sprites/assar.py golem                 # folha completa em public/flashcards/sprites/
    python3 scripts/sprites/assar.py golem --variante cristal   # variante de paleta: golem-cristal.png
    python3 scripts/sprites/assar.py golem --previa saida.png [--escala 4] [--anim parado]
        só uma prévia ampliada (todos os quadros lado a lado), sem gravar no jogo

Saída: public/flashcards/sprites/<nome>.png (uma linha por animação) e
<nome>.json (tamanho do quadro, âncora dos pés, caixa do corpo e tempos).
"""
from __future__ import annotations

import argparse
import importlib
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from motor import gravar_folha, quadro  # noqa: E402

DESTINO = AQUI.parents[1] / 'public' / 'flashcards' / 'sprites'


def principal() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('nome')
    ap.add_argument('--previa')
    ap.add_argument('--escala', type=int, default=3)
    ap.add_argument('--anim')
    ap.add_argument('--fundo', default='#2a2633')
    ap.add_argument('--estagio', type=int)
    ap.add_argument('--variante', help='variante de paleta definida em VARIANTES do módulo (folha <nome>-<variante>)')
    a = ap.parse_args()
    mod = importlib.import_module(a.nome)
    if a.estagio and hasattr(mod, 'configurar'):
        mod.configurar(a.estagio)
    if a.variante:
        # a mesma modelagem com outros materiais (Etapa 8): o adversário variante deixa o desenho antigo
        mod.MATS = {**mod.MATS, **mod.VARIANTES[a.variante]()}
        mod.NOME = f'{mod.NOME}-{a.variante}'
    anims = mod.poses()
    if a.anim:
        anims = {k: v for k, v in anims.items() if k in a.anim.split(',')}
    t0 = time.time()
    quadros = {k: [quadro(mod.montar(p), mod.MATS, mod.CAM) for p in lista] for k, lista in anims.items()}
    print(f'{sum(len(v) for v in quadros.values())} quadros em {time.time() - t0:.1f}s')
    if a.previa:
        W, H = mod.CAM.largura, mod.CAM.altura
        col = max(len(v) for v in quadros.values())
        fundo = tuple(int(a.fundo[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
        img = Image.new('RGBA', (W * col, H * len(quadros)), fundo)
        for li, (k, lista) in enumerate(quadros.items()):
            for ci, q in enumerate(lista):
                im = Image.fromarray(q, 'RGBA')
                img.alpha_composite(im, (ci * W, li * H))
        img = img.resize((img.width * a.escala, img.height * a.escala), Image.NEAREST)
        img.save(a.previa)
        print('prévia:', a.previa)
        return 0
    ancora = mod.CAM.origem
    _, meta = gravar_folha(mod.NOME, quadros, mod.TEMPOS, DESTINO, ancora)
    print('gravado', DESTINO / f'{mod.NOME}.png', meta['caixa'])
    return 0


if __name__ == '__main__':
    sys.exit(principal())
