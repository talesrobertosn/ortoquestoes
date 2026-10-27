"""Expansão dos flashcards (27/10/2026): o detector de repetidos e a inclusão idempotente dos lotes."""
import contextlib
import glob
import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts" / "flashcards"))
import autorais as A  # noqa: E402

base = {"id": "fc-x", "frente": "Na fratura supracondiliana do úmero, qual classificação separa os tipos por desvio posterior?",
        "resposta": "Gartland", "explicacao": "A classificação de **Gartland** divide em I, II e III."}
# a mesma pergunta com outras palavras e a mesma resposta: repetida
assert A.repetido({"frente": "Qual classificação separa as fraturas supracondilianas do úmero pelo desvio posterior?", "resposta": "Gartland"}, [base])
# frente idêntica com outra resposta: repetida
assert A.repetido({"frente": base["frente"], "resposta": "outra"}, [base])
# conceito diferente do mesmo tema: passa
assert A.repetido({"frente": "Na fratura supracondiliana do úmero, qual nervo mais se lesa na extensão?", "resposta": "interósseo anterior"}, [base]) is None
# resposta curta igual com pergunta de outro assunto: passa
assert A.repetido({"frente": "Graus de flexão para testar o colateral medial do cotovelo?", "resposta": "30"},
                  [{"frente": "Percentual de crianças com fratura bilateral?", "resposta": "30", "explicacao": ""}]) is None

# idempotente: os lotes já incluídos não geram nenhum flashcard novo
lotes = sorted(glob.glob(str(Path(__file__).resolve().parent.parent / "scripts/flashcards/lotes/2026-10-27-*.json")))
assert lotes, "sem lotes"
saida = io.StringIO()
with contextlib.redirect_stdout(saida):
    for lote in lotes:
        assert A.cmd_incluir(lote, True) == 0, lote
for linha in saida.getvalue().splitlines():
    if linha.endswith("reprovados"):
        assert " 0 novos" in linha, linha
print(f"expansão dos flashcards: detector de repetidos e {len(lotes)} lotes idempotentes OK")
