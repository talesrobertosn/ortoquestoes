"""Faixa "HD-2D" do painel do administrador: o observatório da vila, de manhã (Mesa de Comando, 01/11/2026).

O Comando › Visão geral abre com uma faixa de cena acima dos indicadores. Em vez de pintar uma sala nova, o painel
usa o mesmo observatório já aprovado da página Desempenho (scripts/gerar_cena_observatorio.py: cúpula de madeira,
fenda aberta, luneta de latão, esfera armilar, mesa com a lamparina), na luz da manhã: é o lugar de onde se observa
a vila inteira, que é o que o painel faz. Nenhuma pintura nova, nenhum texto, cruz, igreja ou personagem de terceiros.

Diferença para a página Desempenho: a faixa do painel fica sempre na manhã (o painel é ferramenta, não muda com a
hora) e a esquerda sai ainda mais calma, porque o título, a frase do estado e o seletor de período vão em cima dela.

Gera em public/pixel/admin/: observatorio.webp (1440 x 480), observatorio-960.webp (960 x 320) e
observatorio-movel.webp (888 x 480, da esfera armilar à lamparina, para o celular).
Uso: python3 scripts/gerar_cena_admin.py   (precisa de numpy e Pillow)
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar_cena_observatorio as ob  # noqa: E402

PASTA = Path(__file__).resolve().parents[1] / "public" / "pixel" / "admin"


def esquerda_calma(img: Image.Image, ate: float = 0.40, forca: float = 0.18) -> Image.Image:
    """Escurece e achata um pouco mais o terço esquerdo, em degraus (sem degradê liso, para não perder o pixel)."""
    a = np.asarray(img).astype(np.float32) / 255
    w = a.shape[1]
    x = np.arange(w, dtype=np.float32) / w
    t = np.clip((ate - x) / ate, 0, 1)
    t = np.round(t * 6) / 6  # seis degraus, como a luz das outras cenas
    media = a.mean(2, keepdims=True)
    a = a + (media - a) * (0.35 * t)[None, :, None]
    a = a * (1 - forca * t)[None, :, None]
    return Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    img = esquerda_calma(ob.montar("manha"))
    grande = PASTA / "observatorio.webp"
    img.save(grande, quality=86, method=6)
    menor = PASTA / "observatorio-960.webp"
    img.resize((960, 320), Image.LANCZOS).save(menor, quality=86, method=6)
    movel = PASTA / "observatorio-movel.webp"
    ob.montar("manha").crop((ob.MOVEL_X0 * ob.ESC, 0, ob.W * ob.ESC, ob.H * ob.ESC)).save(movel, quality=82, method=6)
    for p in (grande, menor, movel):
        print(p.name, p.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
