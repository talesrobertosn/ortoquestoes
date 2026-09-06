#!/usr/bin/env python3
"""Marca como anuladas as questões que a banca anulou no próprio enunciado.

A folha de respostas nem sempre é a única fonte: em vários PDFs a banca
carimba "ANULADA" no começo do enunciado. O pipeline lia só a folha, então
essas questões entravam no acervo como se valessem — contavam no desempenho
de quem estuda e exibiam um gabarito que a própria banca já tinha retirado.

Este script faz no acervo já importado o que importar_pdf.py passou a fazer
na importação: reconhece o carimbo, marca a questão e tira a marca do texto.
Também remove alternativas cujo texto é apenas "Anulada" — anotação da banca
lida como se fosse opção de resposta.

Uso:
    python3 scripts/corrigir_anuladas.py --seco
    python3 scripts/corrigir_anuladas.py
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import DIR_TEMAS, normalizar  # noqa: E402

MARCA = re.compile(r"^\s*ANULAD[AO]\s*[:\-–—.]?\s*", re.IGNORECASE)
# "Gabarito: A" grudado no fim da última alternativa: anotação, não enunciado.
COLA_GABARITO = re.compile(r"\s*Gabarito\s*:\s*[A-E]\s*$", re.IGNORECASE)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--seco", action="store_true", help="mostra e não grava")
    args = ap.parse_args()

    total = 0
    for caminho in sorted(DIR_TEMAS.glob("*.json")):
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        mudou = False
        for questao in dados["questoes"]:
            mudancas = []

            limpo = MARCA.sub("", questao["enunciado"], count=1).strip()
            if limpo != questao["enunciado"]:
                questao["enunciado"] = limpo
                questao["anulada"] = True
                mudancas.append("carimbo no enunciado")

            fantasmas = [
                a for a in questao["alternativas"]
                if normalizar(a.get("texto", "")).strip(" .:") == "anulada"
            ]
            for alternativa in fantasmas:
                questao["alternativas"].remove(alternativa)
                questao["anulada"] = True
                mudancas.append(f"alternativa fantasma {alternativa['letra']}")
            if fantasmas and questao.get("gabarito") not in {
                a["letra"] for a in questao["alternativas"]
            }:
                questao["gabarito"] = None
                mudancas.append("gabarito apontava para a alternativa fantasma")

            for alternativa in questao["alternativas"]:
                sem_cola = COLA_GABARITO.sub("", alternativa["texto"]).strip()
                if sem_cola != alternativa["texto"]:
                    alternativa["texto"] = sem_cola
                    mudancas.append(f"gabarito colado na alternativa {alternativa['letra']}")

            if mudancas:
                mudou = True
                total += 1
                print(f"  {questao['id']}: {'; '.join(mudancas)}")

        if mudou and not args.seco:
            caminho.write_text(
                json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
            )

    print(f"\n{total} questão(ões) corrigida(s).")
    if args.seco:
        print("Ensaio: nada foi gravado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
