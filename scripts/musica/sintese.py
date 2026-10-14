"""
Sintetizador offline da trilha da Cripta do Residente (fantasia orquestral).

Cada instrumento é modelado de forma simples, mas com o que dá caráter:
  cordas   naipe de 6 vozes desafinadas, vibrato que entra devagar, ataque suave
  metais   dente de serra com brilho que abre no ataque (crescendo de filtro)
  trompas  metais mais escuros e redondos
  coro     dente de serra passado por formantes de vogal ("a", "o")
  harpa    corda pinçada (Karplus-Strong)
  piano    parciais com leve inarmonicidade e queda por parcial
  flauta   senoide com sopro
  sinos    parciais inarmônicas longas (celesta / sino)
  tímpano, taiko, caixa, prato
Tudo é misturado em estéreo, com reverberação de sala por convolução e um
limitador suave no fim. Sem amostras de terceiros: nada de licença envolvida.
"""
from __future__ import annotations

import math

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def tempo(n: int) -> np.ndarray:
    return np.arange(n) / SR


def envelope(n: int, a: float, d: float, s: float, r: float, dur_nota: float) -> np.ndarray:
    """ADSR em segundos; a nota soa dur_nota e depois solta em r."""
    t = tempo(n)
    env = np.empty(n)
    a = max(a, 1e-3)
    env = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-3)))
    solta = t > dur_nota
    nivel_solta = s + (1 - s) * math.exp(-max(dur_nota - a, 0) / max(d, 1e-3)) if dur_nota > a else dur_nota / a
    env = np.where(solta, nivel_solta * np.exp(-(t - dur_nota) / max(r, 1e-3)), env)
    return env


def filtrar(x: np.ndarray, corte: float, ordem: float = 2.0, formantes=None) -> np.ndarray:
    """Passa-baixa suave no domínio da frequência (e formantes, se houver)."""
    n = len(x)
    N = 1 << (n - 1).bit_length()
    X = np.fft.rfft(x, N)
    f = np.fft.rfftfreq(N, 1 / SR)
    H = 1 / np.sqrt(1 + (f / max(corte, 20)) ** (2 * ordem))
    if formantes:
        F = np.zeros_like(f)
        for fc, bw, g in formantes:
            F += g * np.exp(-0.5 * ((f - fc) / bw) ** 2)
        H = H * (0.08 + F)
    return np.fft.irfft(X * H, N)[:n]


def serra(f: float, n: int, desafina: float = 0.0, vibrato=(0.0, 5.5, 0.0), fase: float | None = None) -> np.ndarray:
    """Dente de serra com banda limitada (soma de harmônicos)."""
    t = tempo(n)
    prof, taxa, atraso = vibrato
    vib = prof * np.clip((t - atraso) / 0.4, 0, 1) * np.sin(2 * np.pi * taxa * t + rng.uniform(0, 6))
    inst = f * (1 + desafina) * (1 + vib)
    fase_ac = 2 * np.pi * np.cumsum(inst) / SR + (rng.uniform(0, 6) if fase is None else fase)
    K = max(1, min(40, int(15000 / max(f, 1))))
    y = np.zeros(n)
    for k in range(1, K + 1):
        y += np.sin(k * fase_ac) / k
    return y * 0.6


# ------------------------------------------------------------------ instrumentos


def cordas(midi, dur, vel=0.7, brilho=2600, ataque=0.14, legato=False):
    f = hz(midi)
    n = int((dur + 0.6) * SR)
    y = np.zeros(n)
    for d in (-0.007, -0.004, -0.0015, 0.0015, 0.004, 0.007):
        y += serra(f, n, d, vibrato=(0.0045, 5.2 + rng.uniform(-0.4, 0.4), 0.18))
    y = filtrar(y / 6, brilho * (0.6 + 0.6 * vel))
    return y * envelope(n, ataque if not legato else 0.06, 0.6, 0.85, 0.45, dur) * vel


def cordas_staccato(midi, dur, vel=0.8):
    f = hz(midi)
    n = int((dur + 0.25) * SR)
    y = np.zeros(n)
    for d in (-0.006, -0.002, 0.002, 0.006):
        y += serra(f, n, d)
    y = filtrar(y / 4, 3200)
    return y * envelope(n, 0.006, 0.09, 0.25, 0.08, dur * 0.7) * vel


def metais(midi, dur, vel=0.8, escuro=False):
    f = hz(midi)
    n = int((dur + 0.4) * SR)
    base = sum(serra(f, n, d, vibrato=(0.002, 5, 0.25)) for d in (-0.003, 0, 0.003)) / 3
    claro = filtrar(base, 900 if escuro else 1500 + 1800 * vel)
    fosco = filtrar(base, 420 if escuro else 600)
    # o brilho abre no ataque e assenta: "sopro" de metal
    t = tempo(n)
    abre = np.clip(t / 0.08, 0, 1) * (0.55 + 0.45 * np.exp(-t / 0.35))
    y = fosco * (1 - abre) + claro * abre
    return y * envelope(n, 0.03, 0.4, 0.8, 0.25, dur) * vel


def coro(midi, dur, vel=0.6, vogal='a'):
    f = hz(midi)
    n = int((dur + 0.8) * SR)
    y = sum(serra(f, n, d, vibrato=(0.006, 5.0 + rng.uniform(-0.6, 0.6), 0.1)) for d in (-0.01, -0.004, 0.003, 0.009)) / 4
    fm = {'a': [(800, 90, 1.0), (1150, 110, 0.6), (2900, 180, 0.25)], 'o': [(450, 70, 1.0), (800, 90, 0.5), (2830, 180, 0.15)]}[vogal]
    y = filtrar(y, 4000, formantes=fm)
    sopro = filtrar(rng.normal(0, 1, n), 3000, formantes=fm) * 0.02
    return (y + sopro) * envelope(n, 0.35, 0.8, 0.9, 0.7, dur) * vel * 1.4


def harpa(midi, dur=2.5, vel=0.7):
    f = hz(midi)
    n = int((dur + 0.5) * SR)
    L = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, L)
    buf = filtrar(np.tile(buf, 3), 6000)[:L]
    y = np.zeros(n)
    i = 0
    perda = 0.996 if f < 400 else 0.993
    while i < n:
        bloco = min(L, n - i)
        y[i:i + bloco] = buf[:bloco]
        nb = perda * 0.5 * (buf + np.roll(buf, -1))
        buf = nb
        i += bloco
    return y * vel * 0.9


def violao(midi, dur=2.5, vel=0.6):
    """Corda de nylon: parciais que decaem e um toque de ruído da palheta."""
    f = hz(midi)
    t = tempo(int((dur + 0.4) * SR))
    y = np.zeros_like(t)
    for h in range(1, 13):
        y += np.sin(2 * np.pi * f * h * t) * np.exp(-t * (1.6 + h * 0.48)) / h ** 1.45
    corpo = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.0) * 0.18
    toque = filtrar(rng.normal(0, 1, len(t)), 3400) * np.exp(-t * 70) * 0.018
    ataque = 1 - np.exp(-t * 700)
    return (y + corpo + toque) * ataque * vel * 0.6


def fechar_laco(est, sr=SR, segundos=0.014):
    """Fecha a última janela suavemente no primeiro valor, sem mudar a duração."""
    out = est.copy()
    n = min(len(out), max(2, int(sr * segundos)))
    peso = (1 - np.cos(np.linspace(0, np.pi, n))) / 2
    out[-n:] = out[-n:] * (1-peso[:, None]) + out[0] * peso[:, None]
    return out


def piano(midi, dur=2.0, vel=0.7):
    f = hz(midi)
    n = int((dur + 1.2) * SR)
    t = tempo(n)
    B = 0.0004
    y = np.zeros(n)
    for k in range(1, 12):
        fk = f * k * math.sqrt(1 + B * k * k)
        if fk > 16000:
            break
        queda = 0.6 + 3.5 / (k * (1 + f / 600))
        y += np.sin(2 * np.pi * fk * t + rng.uniform(0, 6)) * np.exp(-t / queda) / (k ** 1.1)
    martelo = filtrar(rng.normal(0, 1, n), 2500) * np.exp(-t / 0.012) * 0.25
    solta = np.where(t > dur, np.exp(-(t - dur) / 0.25), 1)
    return (y + martelo) * solta * vel * 0.5 * np.clip(t / 0.003, 0, 1)


def flauta(midi, dur, vel=0.6):
    f = hz(midi)
    n = int((dur + 0.3) * SR)
    t = tempo(n)
    vib = 1 + 0.004 * np.clip((t - 0.2) / 0.4, 0, 1) * np.sin(2 * np.pi * 5.4 * t)
    fase = 2 * np.pi * np.cumsum(f * vib) / SR
    y = np.sin(fase) + 0.18 * np.sin(2 * fase) + 0.06 * np.sin(3 * fase)
    sopro = filtrar(rng.normal(0, 1, n), 2500, formantes=[(f * 2, f * 0.4, 1.0)]) * 0.05
    return (y + sopro) * envelope(n, 0.06, 0.3, 0.85, 0.15, dur) * vel * 0.5


def sino(midi, dur=3.0, vel=0.5, celesta=True):
    f = hz(midi)
    n = int((dur + 1) * SR)
    t = tempo(n)
    parciais = [(1, 1.0, 2.2), (2.0, 0.4, 1.2), (3.01, 0.22, 0.8), (4.2, 0.12, 0.5)] if celesta else [(0.5, 0.5, 4), (1, 1, 3), (1.19, 0.5, 2.5), (1.5, 0.4, 2), (2.0, 0.35, 1.6), (2.76, 0.25, 1.1), (5.4, 0.1, 0.5)]
    y = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / q) for m, a, q in parciais)
    return y * vel * 0.35 * np.clip(t / 0.002, 0, 1)


def timpano(midi, vel=0.9, dur=1.6):
    f = hz(midi)
    n = int(dur * SR)
    t = tempo(n)
    queda_f = f * (1 + 0.15 * np.exp(-t / 0.05))
    fase = 2 * np.pi * np.cumsum(queda_f) / SR
    y = np.sin(fase) * np.exp(-t / 0.55) + 0.4 * np.sin(1.5 * fase) * np.exp(-t / 0.3)
    y += filtrar(rng.normal(0, 1, n), 900) * np.exp(-t / 0.04) * 0.5
    return y * vel


def taiko(vel=0.9):
    n = int(1.0 * SR)
    t = tempo(n)
    f = 62 * (1 + 0.6 * np.exp(-t / 0.03))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.35)
    y += filtrar(rng.normal(0, 1, n), 500) * np.exp(-t / 0.06) * 0.7
    return y * vel


def caixa(vel=0.6):
    n = int(0.4 * SR)
    t = tempo(n)
    ruido = filtrar(rng.normal(0, 1, n), 7000) - filtrar(rng.normal(0, 1, n), 900) * 0.5
    y = ruido * np.exp(-t / 0.09) + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.6
    return y * vel * 0.5


def prato(vel=0.5, dur=2.5):
    n = int(dur * SR)
    t = tempo(n)
    y = rng.normal(0, 1, n)
    y = y - filtrar(y, 4000)
    return y * np.exp(-t / (dur * 0.35)) * vel * 0.35


def crescendo_prato(dur=2.0, vel=0.5):
    n = int(dur * SR)
    t = tempo(n)
    y = rng.normal(0, 1, n)
    y = y - filtrar(y, 3500)
    return y * (t / dur) ** 2.5 * vel * 0.4


# ------------------------------------------------------------------ mixagem


class Mix:
    def __init__(self, dur: float):
        self.n = int(dur * SR)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, sinal: np.ndarray, inicio: float, pan: float = 0.0, ganho: float = 1.0):
        i = int(inicio * SR)
        if i >= self.n or i < -len(sinal):
            return
        s = sinal
        if i < 0:
            s, i = s[-i:], 0
        j = min(self.n, i + len(s))
        a = (pan + 1) * math.pi / 4
        self.L[i:j] += s[:j - i] * math.cos(a) * ganho
        self.R[i:j] += s[:j - i] * math.sin(a) * ganho


def resposta_sala(dur=2.4, pre=0.018):
    n = int(dur * SR)
    t = tempo(n)
    ir = []
    for lado in range(2):
        r = rng.normal(0, 1, n) * np.exp(-t / (dur * 0.28))
        r = filtrar(r, 5000) * 0.6 + filtrar(r, 1500) * 0.4
        r[: int(pre * SR)] = 0
        for k, (atraso, g) in enumerate(((0.011, 0.5), (0.017, 0.35), (0.023, 0.3), (0.031, 0.22))):
            r[int((atraso + lado * 0.003) * SR)] += g
        ir.append(r / np.sqrt(np.sum(r * r)))
    return ir


def convolver(x, ir):
    N = 1 << (len(x) + len(ir)).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[: len(x) + len(ir)]


def finalizar(m: Mix, molhado=0.28, laço: float | None = None, sala=2.4):
    """Reverb, laço sem emenda (a cauda volta para o começo) e limitador suave."""
    ir = resposta_sala(sala)
    L = convolver(m.L, ir[0])
    R = convolver(m.R, ir[1])
    seco_L = np.concatenate([m.L, np.zeros(len(L) - m.n)])
    seco_R = np.concatenate([m.R, np.zeros(len(R) - m.n)])
    L = seco_L + molhado * L * 2.2
    R = seco_R + molhado * R * 2.2
    if laço:
        n = int(laço * SR)
        cauda_L, cauda_R = L[n:], R[n:]
        L, R = L[:n].copy(), R[:n].copy()
        k = min(len(cauda_L), n)
        L[:k] += cauda_L[:k]
        R[:k] += cauda_R[:k]
    est = np.stack([L, R], axis=1)
    if not laço:
        # fanfarra: corta o silêncio do fim e nivela pelo volume médio, como as faixas em laço
        vivo = np.where(np.max(np.abs(est), axis=1) > np.max(np.abs(est)) * 0.004)[0]
        est = est[: (vivo[-1] + int(0.25 * SR)) if len(vivo) else len(est)]
        rms = np.sqrt(np.mean(est ** 2)) + 1e-9
        est = est * (0.2 / rms)
        est = np.tanh(est * 1.1) / 1.1 * 0.95
        return est
    pico = np.max(np.abs(est)) + 1e-9
    est = est / pico * 1.25
    est = np.tanh(est) / np.tanh(1.25) * 0.89
    return est
