"""Narração do vídeo Salter-Harris (voz sintética local, Kokoro pt-br). Uma frase por cena; grava cena-NN.wav e tempos.json."""
import json, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

MODELO = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/tts"
VOZ = sys.argv[2] if len(sys.argv) > 2 else "pf_dora"
SAIDA = sys.argv[3] if len(sys.argv) > 3 else "audio"

# (id da cena, texto falado com grafia fonética para as palavras em inglês)
FALAS = [
    ("gancho", "Mesma queda, mesmo punho. No adulto, quebra o osso. Na criança, quem paga é a fise."),
    ("fise", "A placa de crescimento é cartilagem, mais fraca que o osso e o ligamento. Sálter e Rárris dividiram em cinco tipos. Decora: sálter."),
    ("s", "Ésse, de strêit. O traço passa reto pela fise. O raio-x pode vir quase normal."),
    ("a", "A, de abâv. Sobe pela metáfise e leva um pedaço junto: o fragmento de Térston Rólan. É o mais comum."),
    ("l", "Éle, de lôuer. Desce pela epífise e entra na articulação."),
    ("t", "Tê, de thrú. Atravessa tudo: metáfise, fise e epífise. Três e quatro são articulares: redução anatômica."),
    ("r", "Érre, de crâsh. A fise é esmagada, e nenhum traço aparece."),
    ("virada", "Por isso o tipo cinco quase nunca é visto no dia. Ele aparece meses depois, quando o osso para de crescer."),
    ("fim", "Salva pro próximo plantão. Mais questões assim, no Orto Questões."),
]

k = Kokoro(f"{MODELO}/kokoro.onnx", f"{MODELO}/voices.bin")
tempos = []
import os; os.makedirs(SAIDA, exist_ok=True)
for i, (cid, txt) in enumerate(FALAS):
    a, sr = k.create(txt, voice=VOZ, speed=1.3, lang="pt-br")
    sf.write(f"{SAIDA}/cena-{i:02d}.wav", a, sr)
    tempos.append({"cena": cid, "seg": round(len(a) / sr, 3)})
    print(cid, round(len(a) / sr, 2))
json.dump({"sr": sr, "voz": VOZ, "cenas": tempos}, open(f"{SAIDA}/tempos.json", "w"), ensure_ascii=False, indent=1)
print("total", sum(t["seg"] for t in tempos))
