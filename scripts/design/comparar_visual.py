#!/usr/bin/env python3
"""Compara duas capturas (antes e depois) e mostra quanto mudou.

Uso: python3 scripts/design/comparar_visual.py antes.png depois.png [--saida diff.png] [--tolerancia 16] [--limite 0.5]
- Pixels com diferença acima da tolerância (0-255, por canal) contam como alterados.
- Sai com código 1 se a porcentagem alterada passar do limite (%), útil em refatoração que não deve mudar o visual.
- --saida grava a imagem "depois" esmaecida com as áreas alteradas em vermelho.
"""
from __future__ import annotations

import sys

from PIL import Image, ImageChops


def opcao(nome: str, padrao: str | None = None) -> str | None:
    return sys.argv[sys.argv.index(nome) + 1] if nome in sys.argv else padrao


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    a = Image.open(sys.argv[1]).convert("RGB")
    b = Image.open(sys.argv[2]).convert("RGB")
    if a.size != b.size:
        print(f"Tamanhos diferentes: {a.size} e {b.size}; a comparação usa a área comum.")
        w, h = min(a.width, b.width), min(a.height, b.height)
        a, b = a.crop((0, 0, w, h)), b.crop((0, 0, w, h))
    tol = int(opcao("--tolerancia", "16"))
    dif = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > tol else 0)
    total = a.width * a.height
    mudou = dif.histogram()[255]
    pct = mudou / total * 100
    print(f"Pixels alterados: {mudou} de {total} ({pct:.3f}%)")
    caixa = dif.getbbox()
    if caixa:
        print(f"Área com mudanças: x {caixa[0]}-{caixa[2]}, y {caixa[1]}-{caixa[3]}")
    saida = opcao("--saida")
    if saida:
        fundo = Image.blend(b, Image.new("RGB", b.size, "white"), 0.6)
        vermelho = Image.new("RGB", b.size, (230, 0, 11))
        fundo.paste(vermelho, mask=dif)
        fundo.save(saida)
        print(f"Diferenças salvas em {saida}")
    limite = float(opcao("--limite", "100"))
    return 1 if pct > limite else 0


if __name__ == "__main__":
    sys.exit(main())
