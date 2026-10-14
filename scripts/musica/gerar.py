#!/usr/bin/env python3
"""Renderiza a trilha em public/flashcards/musica/<tema>.mp3 e o índice com as durações.

    python3 scripts/musica/gerar.py                # todos os temas
    python3 scripts/musica/gerar.py chefe dragao   # só alguns

Use --opus para gerar OGG da síntese, ou --opus-existentes para converter as faixas atuais sem mudar a trilha. Precisa do ffmpeg (com libmp3lame e libopus) no PATH.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
import wave
from pathlib import Path

import numpy as np

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from sintese import SR, finalizar, fechar_laco  # noqa: E402
from temas import TEMAS  # noqa: E402

DESTINO = AQUI.parents[1] / 'public' / 'flashcards' / 'musica'


def gravar_wav(caminho: Path, est: np.ndarray):
    dados = (np.clip(est, -1, 1) * 32767).astype('<i2')
    with wave.open(str(caminho), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(dados.tobytes())


def principal() -> int:
    if '--opus-existentes' in sys.argv:
        DESTINO.mkdir(parents=True, exist_ok=True)
        indice_arq = DESTINO / 'indice.json'
        indice = json.loads(indice_arq.read_text())
        for nome, meta in indice.items():
            mp3, ogg = DESTINO / meta['arquivo'], DESTINO / f'{nome}.ogg'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp3), '-codec:a', 'libopus', '-b:a', '64k', '-vbr', 'on', '-application', 'audio', str(ogg)], check=True)
            meta['arquivo_opus'] = ogg.name
            print(f'{nome}: {mp3.stat().st_size} → {ogg.stat().st_size} bytes')
        indice_arq.write_text(json.dumps(indice, ensure_ascii=False, indent=1))
        return 0
    somente_opus = '--opus' in sys.argv
    nomes = [a for a in sys.argv[1:] if a != '--opus'] or list(TEMAS)
    DESTINO.mkdir(parents=True, exist_ok=True)
    indice_arq = DESTINO / 'indice.json'
    indice = json.loads(indice_arq.read_text()) if indice_arq.exists() else {}
    for nome in nomes:
        t0 = time.time()
        T, laco = TEMAS[nome]()
        est = finalizar(T.mix, molhado=0.3 if laco else 0.34, laço=T.dur if laco else None)
        if nome == 'sala':
            est = fechar_laco(est)
        wav = DESTINO / f'{nome}.wav'
        gravar_wav(wav, est)
        mp3 = DESTINO / f'{nome}.mp3'
        if not somente_opus:
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '112k', str(mp3)], check=True)
        ogg = DESTINO / f'{nome}.ogg'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-codec:a', 'libopus', '-b:a', '64k', '-vbr', 'on', '-application', 'audio', str(ogg)], check=True)
        wav.unlink()
        indice[nome] = {'arquivo': f'{nome}.mp3', 'arquivo_opus': f'{nome}.ogg', 'laco': laco, 'duracao': round(len(est) / SR, 3), 'bpm': T.bpm}
        print(f'{nome}: {len(est) / SR:.1f}s em {time.time() - t0:.1f}s, {mp3.stat().st_size // 1024} KB')
    indice_arq.write_text(json.dumps(indice, ensure_ascii=False, indent=1))
    return 0


if __name__ == '__main__':
    raise SystemExit(principal())
