#!/usr/bin/env python3
"""Gera src/flashcards/efeitos/assados.ts a partir das folhas em public/flashcards/sprites/
e cria a silhueta branca de cada folha (o clarão do golpe).

    python3 scripts/sprites/indice.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
DIR = RAIZ / 'public' / 'flashcards' / 'sprites'
SAIDA = RAIZ / 'src' / 'flashcards' / 'efeitos' / 'assados.ts'


def principal() -> int:
    metas = {}
    for js in sorted(DIR.glob('*.json')):
        nome = js.stem
        meta = json.loads(js.read_text())
        png = DIR / f'{nome}.png'
        im = np.array(Image.open(png).convert('RGBA'))
        branco = np.zeros_like(im)
        branco[..., :3] = 255
        branco[..., 3] = im[..., 3]
        Image.fromarray(branco, 'RGBA').save(DIR / f'{nome}-branco.png', optimize=True)
        metas[nome] = {k: meta[k] for k in ('largura', 'altura', 'colunas', 'ancora', 'caixa', 'animacoes')}
    linhas = [
        '/**',
        ' * Folhas de animação assadas pelo motor de volume (scripts/sprites/).',
        ' * Gerado por scripts/sprites/indice.py: não edite à mão.',
        ' */',
        'export interface AnimAssada { linha: number; quadros: number; ms: number }',
        'export interface MetaAssada { largura: number; altura: number; colunas: number; ancora: [number, number]; caixa: [number, number, number, number]; animacoes: Record<string, AnimAssada> }',
        f'export const ASSADOS: Record<string, MetaAssada> = {json.dumps(metas, ensure_ascii=False, indent=1)}',
        '',
    ]
    SAIDA.write_text('\n'.join(linhas), encoding='utf-8')
    print(f'{len(metas)} folhas: {", ".join(metas)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(principal())
