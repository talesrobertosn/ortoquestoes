#!/usr/bin/env python3
"""Otimiza os PNGs do jogo sem perda (14/10/2026, pedido do Tales: "deixar mais liso, mais leve").

Imagem com até 256 cores (RGBA) vira PNG de paleta, que é igual pixel a pixel e bem menor;
as outras são regravadas com compressão máxima. Só troca o arquivo se ficar menor.

    python3 scripts/otimizar_png.py public/flashcards/sprites public/flashcards/cenarios public/flashcards/promo public/mascote
"""
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def otimizar(p: Path) -> int:
    im = Image.open(p)
    im.load()
    rgba = im.convert('RGBA')
    arr = np.asarray(rgba)
    cores = np.unique(arr.reshape(-1, 4), axis=0)
    buf = io.BytesIO()
    if len(cores) <= 256:
        pal = Image.new('P', rgba.size)
        idx = {tuple(c): i for i, c in enumerate(cores)}
        flat = arr.reshape(-1, 4)
        chave = (flat[:, 0].astype(np.uint32) << 24) | (flat[:, 1].astype(np.uint32) << 16) | (flat[:, 2].astype(np.uint32) << 8) | flat[:, 3]
        ck = (cores[:, 0].astype(np.uint32) << 24) | (cores[:, 1].astype(np.uint32) << 16) | (cores[:, 2].astype(np.uint32) << 8) | cores[:, 3]
        ordem = np.argsort(ck)
        pos = ordem[np.searchsorted(ck[ordem], chave)]
        pal.putdata(pos.astype(np.uint8).tolist())
        pal.putpalette(cores[:, :3].flatten().tolist())
        pal.info['transparency'] = bytes(cores[:, 3].tolist())
        pal.save(buf, 'PNG', optimize=True, transparency=bytes(cores[:, 3].tolist()))
        # conferência: idêntico pixel a pixel
        volta = np.asarray(Image.open(io.BytesIO(buf.getvalue())).convert('RGBA'))
        if not np.array_equal(volta, arr):
            buf = io.BytesIO(); rgba.save(buf, 'PNG', optimize=True)
    else:
        rgba.save(buf, 'PNG', optimize=True)
    antes = p.stat().st_size
    if len(buf.getvalue()) < antes:
        p.write_bytes(buf.getvalue())
        return antes - len(buf.getvalue())
    return 0


if __name__ == '__main__':
    total = 0
    for pasta in sys.argv[1:]:
        for p in sorted(Path(pasta).rglob('*.png')):
            total += otimizar(p)
    print(f'economia: {total / 1024:.0f} KB')
