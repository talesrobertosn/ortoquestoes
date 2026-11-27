"""Trilha de fundo original e animada (chiptune leve, 120 BPM), sintetizada por código para o vídeo.

Progressão I-V-vi-IV em dó maior, com bumbo, caixa, chimbal, baixo pulsante, acordes curtos no contratempo e um arpejo
de 8 bits. Sai em volume baixo; video.py ainda abaixa a música sempre que a voz fala (sidechain).

    python3 musica.py   -> audio/musica-teste.wav (30 s, para ouvir sozinha)
"""
from __future__ import annotations

import numpy as np

BPM = 120
SR = 48000

# acordes (fundamental do baixo, notas do acorde em Hz) — C, G, Am, F
def nota(m: int) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


ACORDES = [
    (48, [60, 64, 67]),  # C
    (43, [59, 62, 67]),  # G (inversão perto do C)
    (45, [57, 60, 64]),  # Am
    (41, [57, 60, 65]),  # F
]


def _env(n: int, ataque: float, decai: float) -> np.ndarray:
    t = np.arange(n) / SR
    return np.minimum(1, t / max(ataque, 1e-4)) * np.exp(-t * decai)


def _passa_baixa(x: np.ndarray, corte: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * corte / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def _onda_quadrada(f: float, n: int, ciclo: float = 0.5) -> np.ndarray:
    fase = (np.arange(n) * f / SR) % 1.0
    return np.where(fase < ciclo, 1.0, -1.0)


def _serra(f: float, n: int) -> np.ndarray:
    fase = (np.arange(n) * f / SR) % 1.0
    return 2 * fase - 1


def musica(duracao: float, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n_total = int(duracao * SR) + SR
    out = np.zeros(n_total, np.float32)
    batida = 60 / BPM
    semi = batida / 4  # semicolcheia
    n_semi = int(semi * SR)

    # sons prontos
    nk = int(0.22 * SR)
    tk = np.arange(nk) / SR
    freq_k = 45 + 95 * np.exp(-tk * 28)
    bumbo = np.sin(2 * np.pi * np.cumsum(freq_k) / SR) * _env(nk, 0.001, 14)
    ns = int(0.16 * SR)
    ruido = rng.normal(0, 1, ns)
    caixa = (np.diff(np.r_[0, ruido]) * 0.5 * _env(ns, 0.001, 24) + np.sin(2 * np.pi * 190 * np.arange(ns) / SR) * _env(ns, 0.001, 30) * 0.6)
    nh = int(0.05 * SR)
    hr = rng.normal(0, 1, nh)
    chimbal = np.diff(np.r_[0, np.diff(np.r_[0, hr])]) * 0.25 * _env(nh, 0.0005, 70)

    def por(som, t, vol):
        i0 = int(t * SR)
        if i0 < n_total:
            k = min(len(som), n_total - i0)
            out[i0:i0 + k] += (som[:k] * vol).astype(np.float32)

    # cache de notas
    baixo_cache, acorde_cache, arp_cache = {}, {}, {}
    n_compassos = int(duracao / (4 * batida)) + 2
    for comp in range(n_compassos):
        raiz, notas = ACORDES[comp % 4]
        t0 = comp * 4 * batida
        intro = comp == 0  # primeiro compasso só com baixo e chimbal (entra suave)
        for s in range(16):
            t = t0 + s * semi
            # bateria
            if not intro:
                if s in (0, 8) or (s == 14 and comp % 2 == 1):
                    por(bumbo, t, 0.9)
                if s in (4, 12):
                    por(caixa, t, 0.42)
            if s % 2 == 0:
                por(chimbal, t, 0.22 if s % 4 == 2 else 0.12)
            # baixo pulsante em colcheias (raiz, raiz, oitava...)
            if s % 2 == 0:
                m = raiz + (12 if s in (6, 14) else 0)
                if m not in baixo_cache:
                    nb = int(semi * 1.8 * SR)
                    onda = _onda_quadrada(nota(m), nb, 0.5) * 0.5 + np.sin(2 * np.pi * nota(m) * np.arange(nb) / SR)
                    baixo_cache[m] = _passa_baixa(onda * _env(nb, 0.004, 7), 700)
                por(baixo_cache[m], t, 0.28)
            # acordes curtos no contratempo (o "balanço")
            if s in (2, 6, 10, 14) and not intro:
                chave = tuple(notas)
                if chave not in acorde_cache:
                    na = int(0.2 * SR)
                    onda = sum(_serra(nota(x), na) for x in notas) / 3
                    acorde_cache[chave] = _passa_baixa(onda * _env(na, 0.003, 16), 2600)
                por(acorde_cache[chave], t, 0.22)
            # arpejo de 8 bits em semicolcheias, a partir do 3º compasso, em compassos alternados com pausa no fim
            if comp >= 2 and s < 14:
                m = notas[s % 3] + 12 + (12 if s % 6 == 5 else 0)
                if m not in arp_cache:
                    nn = int(semi * 0.9 * SR)
                    arp_cache[m] = _onda_quadrada(nota(m), nn, 0.25) * _env(nn, 0.002, 18)
                por(arp_cache[m], t, 0.07 if comp % 2 == 0 else 0.05)
    out = out[: int(duracao * SR)]
    # fade de entrada e saída
    t = np.arange(len(out)) / SR
    out *= np.minimum(1, t / 0.6) * np.minimum(1, np.clip(duracao - t, 0, None) / 1.2)
    out /= np.abs(out).max() + 1e-9
    return out.astype(np.float32)


if __name__ == "__main__":
    import os

    import soundfile as sf

    aqui = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(os.path.join(aqui, "audio"), exist_ok=True)
    sf.write(os.path.join(aqui, "audio", "musica-teste.wav"), musica(30.0) * 0.8, SR)
    print("ok")
