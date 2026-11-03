"""Os estandartes do Salão dos Cem (ranking): desenho do Tales no PixelLab (31/10/2026), livre de direitos.

A fonte (scripts/sprites/cem/estandarte-fonte.png, 256 x 256) é a folha dele reduzida à grade original (cada pixel
ocupava 4 x 4, sem perda): o estandarte verde com o ramo dourado em 6 poses (2 linhas de 3), balançando. Aqui os
quadros são recortados com a haste sempre no mesmo lugar e pintados nas três cores do pódio:
1º verde e ouro (o original), 2º azul e prata, 3º vinho e bronze.
Gera public/ranking/cem/estandartes.png (3 linhas, 6 quadros de 66 x 94) e estandartes.json.
Uso: python3 scripts/sprites/cem_estandartes.py [--previa PASTA]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
FONTE = RAIZ / "scripts/sprites/cem/estandarte-fonte.png"
SAIDA = RAIZ / "public/ranking/cem"
QW, QH = 66, 94
# Canto de cada quadro na fonte (x, y): a haste começa 3 px abaixo do topo do recorte em todos.
CANTOS = [(8, 22), (95, 22), (182, 22), (8, 143), (95, 143), (182, 143)]


def recolorir(q: np.ndarray, pano, enfeite) -> np.ndarray:
    """Troca o verde do pano e o dourado do ramo mantendo a luz de cada pixel (a madeira da haste fica)."""
    q = q.astype(float).copy()
    r, g, b = q[..., 0], q[..., 1], q[..., 2]
    a = q[..., 3] > 0
    verde = a & (g > r * 1.25) & (g > b * 1.25)
    ouro = a & (r > b * 1.4) & (g > b * 1.2) & (r > 120)
    lum = (0.3 * r + 0.59 * g + 0.11 * b)[..., None]
    for m, cor, ref in ((verde, pano, 60.0), (ouro, enfeite, 175.0)):
        q[..., :3] = np.where(m[..., None], np.clip(np.array(cor, float) * lum / ref, 0, 255), q[..., :3])
    return q.astype(np.uint8)


def main() -> None:
    g = np.asarray(Image.open(FONTE).convert("RGB")).astype(int)
    fundo = g[0, 0]
    quadros = []
    for x, y in CANTOS:
        q = g[y:y + QH, x:x + QW]
        a = (np.abs(q - fundo).sum(2) > 0)
        quadros.append(np.dstack([q, a * 255]).astype(np.uint8))
    versoes = [
        quadros,
        [recolorir(q, (46, 86, 148), (198, 210, 224)) for q in quadros],
        [recolorir(q, (120, 36, 54), (214, 146, 92)) for q in quadros],
    ]
    folha = Image.new("RGBA", (QW * 6, QH * 3), (0, 0, 0, 0))
    for li, linha in enumerate(versoes):
        for k, q in enumerate(linha):
            folha.paste(Image.fromarray(q, "RGBA"), (k * QW, li * QH))
    SAIDA.mkdir(parents=True, exist_ok=True)
    folha.quantize(256, method=Image.FASTOCTREE, dither=Image.NONE).save(SAIDA / "estandartes.png", optimize=True)
    (SAIDA / "estandartes.json").write_text(json.dumps({"largura": QW, "altura": QH, "quadros": 6, "ms": 180,
        "linhas": {"1": 0, "2": 1, "3": 2}, "haste": [33, 3], "nota": "centro da haste (px do quadro)"}, indent=1))
    print("estandartes.png", folha.size, (SAIDA / "estandartes.png").stat().st_size, "bytes")
    if "--previa" in sys.argv:
        destino = Path(sys.argv[sys.argv.index("--previa") + 1]); destino.mkdir(parents=True, exist_ok=True)
        f = Image.new("RGBA", folha.size, (23, 28, 48, 255)); f.alpha_composite(folha)
        f.resize((folha.width * 3, folha.height * 3), Image.NEAREST).save(destino / "estandartes-3x.png")


if __name__ == "__main__":
    main()
