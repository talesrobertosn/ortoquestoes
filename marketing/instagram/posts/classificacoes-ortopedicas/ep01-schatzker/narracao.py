"""Narração do ep. 1 de Classificações Ortopédicas (Schatzker): voz D envelhecida, ritmo animado.

Mesmo motor do vídeo Salter-Harris (Chatterbox Multilingual, MIT, imitando um locutor brasileiro do Common Voice, CC0):
reaproveita as funções de lá. A referência é `../voz-referencia.wav` (o falante b5f326f328e8, 2 semitons mais grave),
escolhida pelo Tales em 28/11/2026. Pronúncia: "Xátsquer" (opção 2, aprovada); o site é dito "no site do Orto
Questões", porque "ponto com ponto bê érre" travava, e o endereço aparece escrito.

    python3 narracao.py   -> audio/cena-NN.wav e audio/tempos.json
"""
import hashlib
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "../../2026-11-27-video-salter-harris"))
from narracao import aparar, encurtar_silencios, locucao, pausa_depois, wer  # noqa: E402

REF = os.path.join(AQUI, "..", "voz-referencia.wav")
SAIDA = os.path.join(AQUI, "audio")
EXAGERO, CFG, TEMPERATURA = 0.85, 0.3, 0.8
TEMPO = 1.28  # mais rápido e dinâmico (Tales, 28/11/2026)

# (cena, [(fala, legenda)]); "[respira]" no começo da fala põe uma respiração antes
CENAS = [
    ("gancho", [
        ("Seis tipos de fratura do platô tibial.", "*6 tipos* de fratura do platô tibial"),
        ("Bora decorar em quarenta segundos!", "Decora em *40 segundos*!"),
    ]),
    ("macete", [
        ("[respira]O segredo do Xátsquer é olhar o lado.", "O segredo do *Schatzker*: olhar o *lado*."),
        ("Lado de fora: um, dois e três.", "Lado de fora: *I, II e III*."),
        ("Lado de dentro: quatro.", "Lado de dentro: *IV*."),
        ("Os dois lados: cinco.", "Os dois lados: *V*."),
        ("E se soltou da diáfise: seis!", "Soltou da diáfise: *VI*!"),
    ]),
    ("i", [
        ("Tipo um: o platô lateral racha, sem afundar.", "*I*: o platô lateral *racha*, sem afundar."),
        ("Paciente jovem, osso bom.", "Paciente *jovem*, osso bom."),
    ]),
    ("ii", [
        ("Tipo dois: racha e afunda.", "*II*: *racha e afunda*."),
        ("É o mais comum!", "É o *mais comum*!"),
    ]),
    ("iii", [
        ("Tipo três: só afunda.", "*III*: *só afunda*."),
        ("Depressão pura, do idoso com osteopenia.", "Depressão pura, do *idoso osteopênico*."),
    ]),
    ("iv", [
        ("Tipo quatro: agora é o platô medial.", "*IV*: agora é o platô *medial*."),
        ("Trauma em varo, alta energia.", "Trauma em *varo*, alta energia."),
        ("E atenção: é variante de luxação, com o maior risco vascular!", "Variante de *luxação*: maior *risco vascular*!"),
    ]),
    ("v", [
        ("Tipo cinco: pega os dois platôs,", "*V*: pega *os dois* platôs,"),
        ("mas a metáfise continua presa na diáfise.", "mas a metáfise segue *presa* na diáfise."),
    ]),
    ("vi", [
        ("Tipo seis: a metáfise se solta da diáfise.", "*VI*: a metáfise *se solta* da diáfise."),
        ("É o mais instável!", "É o *mais instável*!"),
    ]),
    ("pergunta", [
        ("[respira]Pergunta de prova: qual tipo tem o maior risco de lesão vascular?", "Qual tipo tem o *maior risco vascular*?"),
        ("Responde aqui nos comentários!", "Responde nos *comentários*!"),
    ]),
    ("chamada", [
        ("Quer ir além?", "Quer ir *além*?"),
        ("No site tem o resumo completo do Róquiud Adultos sobre platô tibial,", "Resumo completo do *Rockwood Adultos*"),
        ("e quarenta e oito questões de prova pra você treinar!", "e *48 questões* pra treinar!"),
    ]),
    ("fim", [
        ("Classificações Ortopédicas, no site do Orto Questões!", "*www.ortoquestoes.com.br*"),
    ]),
]


def respiracao(sr: int, rng) -> np.ndarray:
    from scipy.signal import butter, lfilter

    n = int(0.36 * sr)
    x = rng.normal(0, 1, n)
    b, a = butter(2, [500 / (sr / 2), 3800 / (sr / 2)], "band")
    x = lfilter(b, a, x) * np.sin(np.pi * np.linspace(0, 1, n) ** 0.7) ** 1.6
    return (x / np.abs(x).max() * 0.035).astype(np.float32)


def main() -> None:
    import torch
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    from transformers import pipeline

    torch.set_num_threads(os.cpu_count() or 4)
    torch.manual_seed(7)
    tts = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    asr = pipeline("automatic-speech-recognition", model="openai/whisper-small", device="cpu")
    sr = tts.sr
    rng = np.random.default_rng(3)
    os.makedirs(os.path.join(SAIDA, "frases"), exist_ok=True)
    tempos = []
    for i, (cid, frases) in enumerate(CENAS):
        partes, inicios, t = [], [], 0.0
        for j, (fala_bruta, _leg) in enumerate(frases):
            respira = fala_bruta.startswith("[respira]")
            fala = fala_bruta.replace("[respira]", "")
            if respira:
                r = respiracao(sr, rng)
                partes += [np.zeros(int(0.05 * sr), np.float32), r, np.zeros(int(0.04 * sr), np.float32)]
                t += (len(r) + int(0.09 * sr)) / sr
            chave = hashlib.md5(f"{fala}|{REF}|{EXAGERO}|{CFG}".encode()).hexdigest()[:12]
            cache = os.path.join(SAIDA, "frases", f"{chave}.wav")
            if os.path.exists(cache):
                w, _ = sf.read(cache, dtype="float32")
            else:
                melhor = None
                for tentativa in range(4):
                    w = tts.generate(fala, language_id="pt", audio_prompt_path=REF, exaggeration=EXAGERO, cfg_weight=CFG,
                                     temperature=TEMPERATURA).squeeze().numpy().astype(np.float32)
                    w = aparar(w, sr)
                    txt = asr({"raw": w, "sampling_rate": sr},
                              generate_kwargs={"language": "portuguese", "task": "transcribe"})["text"]
                    e = wer(fala, txt)
                    dur_ok = 0.045 * len(fala) < len(w) / sr < 0.13 * len(fala) + 0.8
                    nota = e + (0 if dur_ok else 1)
                    print(f"  {cid}/{j} tentativa {tentativa}: erro {e:.2f} dur {len(w)/sr:.1f}s | {txt.strip()}", flush=True)
                    if melhor is None or nota < melhor[0]:
                        melhor = (nota, w)
                    if nota <= 0.25:
                        break
                w = melhor[1]
                sf.write(cache, w, sr)
            w = encurtar_silencios(w, sr)
            inicios.append(round(t, 3))
            p = pausa_depois(fala) * 0.8 if j < len(frases) - 1 else 0.0
            partes += [w, np.zeros(int(p * sr), np.float32)]
            t += len(w) / sr + p
        audio = locucao(np.concatenate(partes), sr)
        tmp, caminho = f"{SAIDA}/tmp.wav", f"{SAIDA}/cena-{i:02d}.wav"
        sf.write(tmp, audio, sr)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", f"atempo={TEMPO}", caminho], check=True)
        os.remove(tmp)
        audio, _ = sf.read(caminho, dtype="float32")
        tempos.append({"cena": cid, "seg": round(len(audio) / sr, 3), "inicios": [round(x / TEMPO, 3) for x in inicios],
                       "legendas": [leg for _f, leg in frases]})
        print(cid, round(len(audio) / sr, 2), flush=True)
    json.dump({"sr": sr, "cenas": tempos}, open(f"{SAIDA}/tempos.json", "w"), ensure_ascii=False, indent=1)
    print("total", round(sum(t["seg"] for t in tempos), 2))


if __name__ == "__main__":
    main()
