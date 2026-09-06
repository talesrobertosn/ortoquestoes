#!/usr/bin/env python3
"""Recalcula figuraPendente no acervo já importado.

A marca diz "esta questão pergunta sobre uma figura que não veio no PDF", e é
ela que faz a interface avisar o leitor em vez de entregar em silêncio uma
questão impossível de responder. Ela é calculada na importação, então toda vez
que a detecção de linguagem melhora, o que já está no acervo fica para trás.

Este script aplica a regra atual — a mesma de importar_pdf.py — ao acervo
inteiro, sem precisar reimportar PDF nenhum.

Uso:
    python3 scripts/remarcar_figuras.py --seco
    python3 scripts/remarcar_figuras.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import DIR_TEMAS  # noqa: E402
from deteccao import cita_figura  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--seco", action="store_true", help="mostra e não grava")
    args = ap.parse_args()

    marcadas, desmarcadas = [], []
    for caminho in sorted(DIR_TEMAS.glob("*.json")):
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        mudou = False
        for questao in dados["questoes"]:
            pendente = cita_figura(questao["enunciado"]) and not questao["imagens"]
            if pendente != bool(questao.get("figuraPendente")):
                (marcadas if pendente else desmarcadas).append(questao["id"])
                questao["figuraPendente"] = pendente
                mudou = True
        if mudou and not args.seco:
            caminho.write_text(
                json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
            )

    print(f"{len(marcadas)} passaram a pendente: {', '.join(marcadas) or '—'}")
    print(f"{len(desmarcadas)} deixaram de ser: {', '.join(desmarcadas) or '—'}")
    if args.seco:
        print("\nEnsaio: nada foi gravado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
