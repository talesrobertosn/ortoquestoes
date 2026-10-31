#!/usr/bin/env python3
"""Confere os PNGs de uma peça de Instagram: tamanho do formato, modo de cor e se não estão vazios.

Uso: python3 scripts/design/conferir_pngs.py <pasta-ou-png...> [--formato quadrado|vertical|story]
Sem --formato, aceita qualquer um dos três tamanhos de docs/design/INSTAGRAM.md.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageStat

TAMANHOS = {"quadrado": (1080, 1080), "vertical": (1080, 1350), "story": (1080, 1920)}


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    formato = sys.argv[sys.argv.index("--formato") + 1] if "--formato" in sys.argv else None
    if formato:
        args = [a for a in args if a != formato]
    aceitos = [TAMANHOS[formato]] if formato else list(TAMANHOS.values())
    arquivos = [p for a in args for p in (sorted(Path(a).glob("*.png")) if Path(a).is_dir() else [Path(a)])]
    if not arquivos:
        print("Nenhum PNG encontrado.")
        return 1
    erros = 0
    for f in arquivos:
        im = Image.open(f)
        problemas = []
        if im.size not in aceitos:
            problemas.append(f"tamanho {im.size[0]}x{im.size[1]} (esperado {' ou '.join(f'{w}x{h}' for w, h in aceitos)})")
        desvio = max(ImageStat.Stat(im.convert("L")).stddev)
        if desvio < 2:
            problemas.append("imagem praticamente lisa (vazia?)")
        estado = "ok" if not problemas else "ERRO: " + "; ".join(problemas)
        erros += bool(problemas)
        print(f"{f.name}: {im.size[0]}x{im.size[1]} {estado}")
    print(f"{len(arquivos)} PNG(s), {erros} com problema.")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())
