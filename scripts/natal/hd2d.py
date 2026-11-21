"""Montagem HD-2D das peças de Natal (a mesma das cenas do topo, scripts/gerar_cena_inicio.py e inicio_praca.py).

Cada peça é pintada na grade de 480 x 200 (Camada `c` para a cor, Camada `e` para o que acende), ampliada 3x e
iluminada por pixel: luz ambiente, luzes pontuais de cada lâmpada, o pixel aceso com brilho curto, a estrelinha em
cruz, curva de tom e correção quente/fria. Depois recorta a peça e exporta também a camada da luz que ela joga em volta
(para mix-blend-mode: screen no site), com uma janela suave para a luz morrer antes da borda.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
from gerar_cena_inicio import ESC, H, W, Camada, ampliar, desfocar, hexa, luz_pontual, pal  # noqa: E402,F401

SAIDA = RAIZ / "public" / "pixel" / "natal"


def h01(*v) -> float:
    n = 0
    for i, x in enumerate(v):
        n = (n * 73856093) ^ (int(x) * 19349663 + i * 83492791)
    n = (n ^ (n >> 13)) * 1274126177
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535


def tom(paleta: np.ndarray, v: float) -> np.ndarray:
    return paleta[int(np.clip(v, 0, 0.999) * len(paleta))]


def tonalizar(rgb: np.ndarray) -> np.ndarray:
    joelho = 0.72
    rgb = np.where(rgb < joelho, rgb, joelho + (1 - joelho) * (1 - np.exp(-(rgb - joelho) / (1 - joelho))))
    lum = np.clip(rgb.mean(2, keepdims=True), 0, 1)
    q, f = hexa("#ffcf8a"), hexa("#16204a")
    rgb = rgb * (0.8 + 0.2 * (lum * q + (1 - lum) * (f * 0.5 + 0.5)))
    return np.clip((rgb - 0.48) * 1.1 + 0.48, 0, 1)


def iluminar(c: Camada, e: Camada, pts: list, amb: str = "#8a9ab8", amb_k: float = 0.62, extra=(), raio_lamp: float = 5.5,
             cruz: bool = True) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Devolve (rgb, alfa, emissivo) na escala 3x. `extra`: luzes pontuais (x, y, raio, cor, força, achatar)."""
    a = ampliar(c.c)
    luz = np.zeros((H * ESC, W * ESC, 3), np.float32) + hexa(amb) * amb_k
    for (x, y, r, cor, k, ach) in extra:
        luz += luz_pontual(x, y, r, ach)[:, :, None] * hexa(cor) * k
    for (x, y, cor) in pts:
        luz += luz_pontual(x, y, raio_lamp)[:, :, None] * hexa(cor) * 1.05
    rgb = a[:, :, :3] * luz
    emi = ampliar(e.c)
    emi_rgb = emi[:, :, :3] * emi[:, :, 3:4]
    rgb = rgb + emi_rgb * 1.1 + desfocar(emi_rgb, 2.5) * 0.7 * a[:, :, 3:4]
    if cruz:
        for (x, y, cor) in pts:
            X, Y = int(x * ESC + 1), int(y * ESC + 1)
            for d in range(-4, 5):
                k = (1 - abs(d) / 5) ** 2 * 0.5
                if 0 <= Y + d < H * ESC and 0 <= X + d < W * ESC:
                    rgb[Y + d, X] += hexa(cor) * k
                    rgb[Y, X + d] += hexa(cor) * k
    return tonalizar(rgb), a[:, :, 3], emi_rgb


def salvar_rgba(nome: str, rgb: np.ndarray, alfa: np.ndarray) -> None:
    Image.fromarray((np.dstack([np.clip(rgb, 0, 1), np.clip(alfa, 0, 1)]) * 255).astype(np.uint8)).save(SAIDA / nome, optimize=True)
    print("salvo", nome, rgb.shape[1], "x", rgb.shape[0])


def camada_de_luz(luz: np.ndarray, janela_x: bool = True, janela_y: bool = True, borda: float = 0.25, ganho: float = 1.3,
                  teto: float = 0.9) -> tuple[np.ndarray, np.ndarray]:
    """Luz (rgb aditivo) -> imagem RGBA para screen: cor normalizada e alfa pela intensidade, morrendo antes da borda."""
    hh, ww = luz.shape[:2]
    jy = np.clip(np.minimum(np.arange(hh), hh - 1 - np.arange(hh)) / (hh * borda), 0, 1)[:, None] ** 1.5 if janela_y else np.ones((hh, 1))
    jx = np.clip(np.minimum(np.arange(ww), ww - 1 - np.arange(ww)) / (ww * borda), 0, 1)[None, :] ** 1.5 if janela_x else np.ones((1, ww))
    luz = luz * (jy * jx)[:, :, None]
    lum = luz.max(2)
    cor = np.where(lum[:, :, None] > 1e-4, luz / np.maximum(lum[:, :, None], 1e-4), 0)
    return cor, np.clip(lum * ganho, 0, teto)
