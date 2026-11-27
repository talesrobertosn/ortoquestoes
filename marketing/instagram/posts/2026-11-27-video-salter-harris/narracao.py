"""Narração do vídeo Salter-Harris: voz masculina brasileira sintética local (Piper, edresson), "humanizada".

Cada cena é uma lista de frases (fala, legenda). Cada frase é gerada à parte, com velocidade levemente variada e pausa
natural depois (vírgula curta, ponto médio, reticências longa); as frases de ênfase saem um pouco mais devagar. A voz é
a edresson do Piper (locutor brasileiro; a do Kokoro soava portuguesa de Portugal, Tales 27/11/2026), e o áudio recebe
um tratamento leve de locução (corta graves embolados, dá presença, compressão suave e uma sala pequena).

Grava audio/cena-NN.wav e audio/tempos.json (duração de cada cena e o início de cada frase, para as legendas).

    python3 narracao.py [pasta_do_modelo]
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter

MODELO = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/piper"
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "audio")

# (cena, [(fala com grafia fonética, legenda na tela; *palavra* = destaque em ouro)])
CENAS = [
    ("gancho", [
        ("Olha isso: mesma queda, mesmo punho.", "Mesma queda, mesmo punho."),
        ("No adulto, quebra o osso.", "No *adulto*, quebra o osso."),
        ("Na criança... quem paga é a fise.", "Na *criança*, quem paga é a *fise*."),
    ]),
    ("fise", [
        ("A placa de crescimento é cartilagem,", "A placa de crescimento é *cartilagem*,"),
        ("mais fraca que o osso e que o ligamento.", "mais fraca que o osso e o ligamento."),
        ("Sálter e Rárris: cinco tipos.", "Salter e Harris: *cinco tipos*."),
        ("Decora numa palavra: sálter!", "Decora: *SALTR*."),
    ]),
    ("s", [
        ("Ésse, de strêit: reto.", "*S* de Straight: *reto*."),
        ("Passa reto pela fise,", "passa *reto* pela fise,"),
        ("e o raio-x pode vir quase normal.", "e o raio-x pode vir *quase normal*."),
    ]),
    ("a", [
        ("A, de abâv: acima.", "*A* de Above: *acima*."),
        ("Sobe pela metáfise", "sobe pela *metáfise*"),
        ("e leva junto o Térston Rólan.", "e leva o *Thurston-Holland*."),
        ("É o mais comum.", "É o *mais comum*."),
    ]),
    ("l", [
        ("Éle, de lôuer: abaixo.", "*L* de Lower: *abaixo*."),
        ("Desce pela epífise", "desce pela *epífise*"),
        ("e entra na articulação.", "e entra na *articulação*."),
    ]),
    ("t", [
        ("Tê, de thrú: através.", "*T* de Through: *através*."),
        ("Atravessa tudo.", "atravessa *tudo*."),
        ("Três e quatro são articulares:", "III e IV são *articulares*:"),
        ("redução anatômica.", "*redução anatômica*."),
    ]),
    ("r", [
        ("Érre, de crâsh: esmagar.", "*R* de cRush: *esmagar*."),
        ("A fise é esmagada,", "a fise é *esmagada*"),
        ("e nenhum traço aparece.", "e *nenhum traço* aparece."),
    ]),
    ("virada", [
        ("Por isso o tipo cinco quase nunca aparece no dia:", "O *tipo V* quase nunca aparece no dia:"),
        ("só meses depois,", "só *meses depois*,"),
        ("quando o osso para de crescer.", "quando o osso *para de crescer*."),
    ]),
    ("fim", [
        ("Salva pro próximo plantão!", "Salva pro próximo *plantão*."),
        ("Treina pro Teót, Táro, e Cirurgia da Mão:", "Treine para o *TEOT*, o *TARO* e a *Cirurgia da Mão*"),
        ("em ortoquestões ponto com ponto bê érre.", "em *ortoquestoes.com.br*"),
    ]),
]

VELOCIDADE = 1.42
TEMPO = 1.17  # aceleração final sem mudar o tom
# frases de ênfase (saem um pouco mais devagar)
ENFASE = {"Na criança... quem paga é a fise.", "só meses depois,", "quando o osso para de crescer.",
          "redução anatômica.", "e nenhum traço aparece."}


def pausa_depois(txt: str) -> float:
    t = txt.rstrip()
    if t.endswith("...") or t.endswith("!"):
        return 0.34
    if t.endswith(".") or t.endswith(":"):
        return 0.22
    if t.endswith(","):
        return 0.10
    return 0.06


def aparar(a: np.ndarray, sr: int, limiar: float = 0.012, folga: float = 0.03) -> np.ndarray:
    """Corta o silêncio das pontas de cada frase (a pausa entre frases é controlada por pausa_depois)."""
    env = np.convolve(np.abs(a), np.ones(int(0.01 * sr)) / int(0.01 * sr), "same")
    idx = np.where(env > limiar)[0]
    if not len(idx):
        return a
    i0 = max(0, idx[0] - int(folga * sr))
    i1 = min(len(a), idx[-1] + int(folga * 2 * sr))
    return a[i0:i1]


def locucao(a: np.ndarray, sr: int) -> np.ndarray:
    """Tratamento de locução: passa-alta, presença, compressão suave e uma sala pequena."""
    b, c = butter(2, 85 / (sr / 2), "high")
    a = lfilter(b, c, a)
    # presença (~3 kHz) e um pouco de corpo (~180 Hz), somando bandas filtradas
    b, c = butter(2, [2200 / (sr / 2), 4500 / (sr / 2)], "band")
    a = a + 0.18 * lfilter(b, c, a)
    b, c = butter(2, [140 / (sr / 2), 260 / (sr / 2)], "band")
    a = a + 0.12 * lfilter(b, c, a)
    # compressão suave (envelope)
    env = np.convolve(np.abs(a), np.ones(int(0.01 * sr)) / int(0.01 * sr), "same")
    ganho = 1 / (1 + np.maximum(0, env - 0.12) * 2.2)
    a = a * ganho
    # sala pequena: resposta de ruído com decaimento rápido, bem baixa
    rng = np.random.default_rng(1)
    n = int(0.18 * sr)
    ir = rng.normal(0, 1, n) * np.exp(-np.arange(n) / (0.04 * sr))
    ir /= np.abs(ir).sum()
    sala = np.convolve(a, ir)[: len(a)]
    a = a * 0.95 + sala * 0.5
    return (a / (np.abs(a).max() + 1e-9) * 0.9).astype(np.float32)


def sintetizador():
    """Voz masculina brasileira do Piper (edresson, treinada com locutor brasileiro; release oficial rhasspy/piper v0.0.2)."""
    import wave
    import io

    from piper import PiperVoice, SynthesisConfig

    voz = PiperVoice.load(os.path.join(MODELO, "pt-br-edresson-low.onnx"))

    def falar(texto: str, vel: float):
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            voz.synthesize_wav(texto, w, syn_config=SynthesisConfig(length_scale=1 / vel, noise_scale=0.6, noise_w_scale=0.75))
        buf.seek(0)
        with wave.open(buf) as w:
            sr = w.getframerate()
            a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        return a, sr

    return falar


def main() -> None:
    falar = sintetizador()
    os.makedirs(SAIDA, exist_ok=True)
    rng = np.random.default_rng(11)
    tempos = []
    sr = 16000
    for i, (cid, frases) in enumerate(CENAS):
        partes, inicios, t = [], [], 0.0
        for j, (fala, _leg) in enumerate(frases):
            vel = VELOCIDADE * (0.92 if fala in ENFASE else 1.0) * (1 + rng.uniform(-0.035, 0.035))
            a, sr = falar(fala, vel)
            a = aparar(a, sr)
            inicios.append(round(t, 3))
            p = pausa_depois(fala) if j < len(frases) - 1 else 0.0
            partes.append(a)
            partes.append(np.zeros(int(p * sr), np.float32))
            t += len(a) / sr + p
        audio = locucao(np.concatenate(partes), sr)
        # acelera sem mudar o tom (atempo do ffmpeg): a voz do Piper é lenta mesmo com length_scale baixo
        tmp = f"{SAIDA}/tmp.wav"
        sf.write(tmp, audio, sr)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", f"atempo={TEMPO}", f"{SAIDA}/cena-{i:02d}.wav"], check=True)
        os.remove(tmp)
        audio, sr = sf.read(f"{SAIDA}/cena-{i:02d}.wav", dtype="float32")
        inicios = [round(x / TEMPO, 3) for x in inicios]
        tempos.append({"cena": cid, "seg": round(len(audio) / sr, 3), "inicios": inicios,
                       "legendas": [leg for _f, leg in frases]})
        print(cid, round(len(audio) / sr, 2))
    json.dump({"sr": sr, "voz": "piper pt-br edresson", "cenas": tempos}, open(f"{SAIDA}/tempos.json", "w"),
              ensure_ascii=False, indent=1)
    print("total", round(sum(t["seg"] for t in tempos), 2))


if __name__ == "__main__":
    main()
