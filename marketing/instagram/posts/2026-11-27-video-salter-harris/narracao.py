"""Narração do vídeo Salter-Harris com voz de professor (Tales, 27/11/2026: "faça uma voz boa").

Motor: Chatterbox Multilingual (Resemble AI, licença MIT, uso comercial permitido), que fala português imitando uma
voz de referência. A referência é um locutor brasileiro adulto do Common Voice da Mozilla (domínio público, CC0),
escolhido por medida (ruído de fundo, faixa do microfone e tom grave com boa variação de entonação): falante
c13a453087ed, mineiro, 30 e poucos anos. As vozes anteriores (Kokoro, Piper edresson e cadu) foram recusadas.

Cada frase é gerada à parte e conferida por um reconhecedor de fala (Whisper small): se sair embolada, é refeita (até
4 tentativas, fica a melhor). Pausas naturais entre as frases; leve tratamento de locução.

    python3 narracao.py [referencia.wav]
Grava audio/cena-NN.wav e audio/tempos.json (início de cada frase e a legenda correspondente).
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "audio")
REF = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/cv/ref-c13a453087ed.wav"

# (cena, [(fala, legenda na tela; *palavra* = destaque em ouro)]). Na fala, palavras em inglês vão escritas como se
# pronunciam em português, para o modelo acertar.
CENAS = [
    ("gancho", [
        ("Olha isso: mesma queda, mesmo punho.", "Mesma queda, mesmo punho."),
        ("No adulto, quebra o osso.", "No *adulto*, quebra o osso."),
        ("Na criança... quem paga é a fise.", "Na *criança*, quem paga é a *fise*."),
    ]),
    ("fise", [
        ("A fise é cartilagem: o ponto fraco do osso da criança.", "A fise é *cartilagem*: o ponto fraco do osso."),
        ("Sálter e Rárris dividiram essas lesões em cinco tipos.", "Salter e Harris: *cinco tipos*."),
        ("E dá pra decorar com uma palavra só: sálter.", "Decora uma palavra: *SALTR*."),
    ]),
    ("s", [
        ("Ésse, de strêit: passa reto pela fise.", "*S*traight: passa *reto* pela fise."),
        ("E o raio-x pode vir quase normal.", "O raio-x pode vir *quase normal*."),
    ]),
    ("a", [
        ("A, de abâv: sobe pela metáfise", "*A*bove: sobe pela *metáfise*"),
        ("e leva junto o fragmento de Térston Rólan.", "e leva o *Thurston-Holland*."),
        ("É o tipo mais comum.", "É o tipo *mais comum*."),
    ]),
    ("l", [
        ("Éle, de lôuer: desce pela epífise", "*L*ower: desce pela *epífise*"),
        ("e entra na articulação.", "e entra na *articulação*."),
    ]),
    ("t", [
        ("Tê, de thrú: atravessa tudo.", "*T*hrough: atravessa *tudo*."),
        ("Os tipos três e quatro são articulares:", "III e IV são *articulares*:"),
        ("pedem redução anatômica.", "*redução anatômica*."),
    ]),
    ("r", [
        ("Érre, de crâsh: a fise é esmagada", "c*R*ush: a fise é *esmagada*"),
        ("e nenhum traço aparece.", "e *nenhum traço* aparece."),
    ]),
    ("virada", [
        ("Por isso, o tipo cinco quase nunca aparece no dia.", "O *tipo V* quase nunca aparece no dia."),
        ("Só meses depois,", "Só *meses depois*,"),
        ("quando o osso para de crescer.", "quando o osso *para de crescer*."),
    ]),
    ("fim", [
        ("Salva pra revisar no próximo plantão.", "Salva para o próximo *plantão*."),
        ("E treina pro Teót, pro Táro e pra Cirurgia da Mão, no ortoquestões ponto com ponto bê érre.",
         "Treine em *ortoquestoes.com.br*"),
    ]),
]
TEMPO = 1.04  # leve aceleração final, sem mudar o tom


def pausa_depois(txt: str) -> float:
    t = txt.rstrip()
    if t.endswith("...") or t.endswith("!"):
        return 0.30
    if t.endswith(".") or t.endswith(":"):
        return 0.20
    if t.endswith(","):
        return 0.08
    return 0.04


def aparar(a: np.ndarray, sr: int, limiar: float = 0.02, folga: float = 0.04) -> np.ndarray:
    env = np.convolve(np.abs(a), np.ones(int(0.01 * sr)) / int(0.01 * sr), "same")
    idx = np.where(env > limiar * max(np.abs(a).max(), 1e-6))[0]
    if not len(idx):
        return a
    return a[max(0, idx[0] - int(folga * sr)):min(len(a), idx[-1] + int(folga * 3 * sr))]


def locucao(a: np.ndarray, sr: int) -> np.ndarray:
    """Passa-alta, um pouco de presença e compressão suave (sem sala: a referência já tem ambiente)."""
    b, c = butter(2, 75 / (sr / 2), "high")
    a = lfilter(b, c, a)
    b, c = butter(2, [2500 / (sr / 2), 5000 / (sr / 2)], "band")
    a = a + 0.12 * lfilter(b, c, a)
    env = np.convolve(np.abs(a), np.ones(int(0.01 * sr)) / int(0.01 * sr), "same")
    a = a / (1 + np.maximum(0, env / (env.max() + 1e-9) - 0.35) * 1.5)
    return (a / (np.abs(a).max() + 1e-9) * 0.9).astype(np.float32)


def normalizar(s: str) -> list:
    return re.sub(r"[^a-zà-ú ]", " ", s.lower()).split()


def wer(ref: str, hip: str) -> float:
    a, b = normalizar(ref), normalizar(hip)
    d = np.zeros((len(a) + 1, len(b) + 1))
    d[:, 0] = range(len(a) + 1)
    d[0, :] = range(len(b) + 1)
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (a[i - 1] != b[j - 1]))
    return d[-1, -1] / max(len(a), 1)


def main() -> None:
    import torch
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    from transformers import pipeline

    torch.set_num_threads(os.cpu_count() or 4)
    torch.manual_seed(7)
    tts = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    asr = pipeline("automatic-speech-recognition", model="openai/whisper-small", device="cpu")
    sr = tts.sr
    os.makedirs(SAIDA, exist_ok=True)
    tempos = []
    for i, (cid, frases) in enumerate(CENAS):
        partes, inicios, t = [], [], 0.0
        for j, (fala, _leg) in enumerate(frases):
            melhor = None
            for tentativa in range(4):
                w = tts.generate(fala, language_id="pt", audio_prompt_path=REF, exaggeration=0.55, cfg_weight=0.5,
                                 temperature=0.75).squeeze().numpy().astype(np.float32)
                w = aparar(w, sr)
                txt = asr({"raw": w, "sampling_rate": sr},
                          generate_kwargs={"language": "portuguese", "task": "transcribe"})["text"]
                # palavras técnicas e em inglês escritas "à brasileira" erram no reconhecedor; vale o conjunto
                e = wer(fala, txt)
                dur_ok = 0.045 * len(fala) < len(w) / sr < 0.13 * len(fala) + 0.8  # sem cortes nem arrasto
                nota = e + (0 if dur_ok else 1)
                print(f"  {cid}/{j} tentativa {tentativa}: erro {e:.2f} dur {len(w)/sr:.1f}s | {txt.strip()}", flush=True)
                if melhor is None or nota < melhor[0]:
                    melhor = (nota, w)
                if nota <= 0.25:
                    break
            w = melhor[1]
            inicios.append(round(t, 3))
            p = pausa_depois(fala) if j < len(frases) - 1 else 0.0
            partes += [w, np.zeros(int(p * sr), np.float32)]
            t += len(w) / sr + p
        audio = locucao(np.concatenate(partes), sr)
        caminho = f"{SAIDA}/cena-{i:02d}.wav"
        tmp = f"{SAIDA}/tmp.wav"
        sf.write(tmp, audio, sr)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", f"atempo={TEMPO}", caminho], check=True)
        os.remove(tmp)
        audio, _ = sf.read(caminho, dtype="float32")
        inicios = [round(x / TEMPO, 3) for x in inicios]
        tempos.append({"cena": cid, "seg": round(len(audio) / sr, 3), "inicios": inicios,
                       "legendas": [leg for _f, leg in frases]})
        print(cid, round(len(audio) / sr, 2), flush=True)
    json.dump({"sr": sr, "voz": "chatterbox multilingual + referência Common Voice c13a453087ed", "cenas": tempos},
              open(f"{SAIDA}/tempos.json", "w"), ensure_ascii=False, indent=1)
    print("total", round(sum(t["seg"] for t in tempos), 2))


if __name__ == "__main__":
    main()
