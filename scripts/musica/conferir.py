#!/usr/bin/env python3
"""Confere a trilha sem ouvir: volume (RMS), pico, saturação, brilho (centroide),
emenda do laço e espectrograma de cada faixa.

    python3 scripts/musica/conferir.py [saida.png]
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

DIR = Path(__file__).resolve().parents[2] / 'public' / 'flashcards' / 'musica'
SR = 22050


def ler(mp3: Path) -> np.ndarray:
    bruto = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(mp3), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(bruto, '<i2').astype(np.float32) / 32768


def espectro(x: np.ndarray, alt=96, larg=360) -> np.ndarray:
    janela, passo = 2048, max(1, (len(x) - 2048) // larg)
    cols = []
    for i in range(larg):
        seg = x[i * passo:i * passo + janela]
        if len(seg) < janela:
            break
        S = np.abs(np.fft.rfft(seg * np.hanning(janela)))
        f = np.fft.rfftfreq(janela, 1 / SR)
        bandas = np.geomspace(40, 10000, alt + 1)
        col = [S[(f >= a) & (f < b)].mean() if np.any((f >= a) & (f < b)) else 0 for a, b in zip(bandas, bandas[1:])]
        cols.append(col)
    M = 20 * np.log10(np.array(cols).T + 1e-6)
    M = np.clip((M + 70) / 70, 0, 1)[::-1]
    rgb = np.stack([M ** 0.7 * 255, M ** 1.6 * 220, (1 - M) * 80 + M * 40], axis=-1).astype(np.uint8)
    return rgb


def principal() -> int:
    indice = json.loads((DIR / 'indice.json').read_text())
    linhas = []
    print(f"{'faixa':<11} {'dur':>6} {'RMS dB':>7} {'pico':>6} {'satura%':>8} {'centroide Hz':>12} {'emenda':>7}")
    for nome, meta in indice.items():
        x = ler(DIR / meta['arquivo'])
        rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
        pico = float(np.max(np.abs(x)))
        satura = float(np.mean(np.abs(x) > 0.985) * 100)
        S = np.abs(np.fft.rfft(x[: SR * 20]))
        f = np.fft.rfftfreq(len(x[: SR * 20]), 1 / SR)
        centro = float(np.sum(S * f) / np.sum(S))
        emenda = float(abs(x[-1] - x[0])) if meta['laco'] else 0.0
        print(f"{nome:<11} {len(x) / SR:6.1f} {rms:7.1f} {pico:6.2f} {satura:8.3f} {centro:12.0f} {emenda:7.3f}")
        linhas.append((nome, espectro(x)))
    if len(sys.argv) > 1:
        alt = sum(e.shape[0] + 14 for _, e in linhas)
        img = Image.new('RGB', (360 + 90, alt), (16, 12, 20))
        y = 0
        from PIL import ImageDraw
        d = ImageDraw.Draw(img)
        for nome, e in linhas:
            img.paste(Image.fromarray(e), (90, y))
            d.text((4, y + e.shape[0] // 2 - 5), nome, fill=(240, 220, 180))
            y += e.shape[0] + 14
        img.save(sys.argv[1])
    return 0


if __name__ == '__main__':
    raise SystemExit(principal())
