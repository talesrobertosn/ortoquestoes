#!/usr/bin/env python3
"""Tira do acervo a cauda da folha de respostas que entrou como conteúdo.

A última questão de cada PDF vinha engolindo tudo o que sobrava do arquivo:
a chave de respostas em texto puro ("101 126 151 176 …") era emendada na
última alternativa e as páginas finais — capa, folha de bolhas, logotipo —
viravam figuras da questão. O leitor via uma alternativa com meio milhar de
números no fim e uma questão de anatomia ilustrada por uma folha de gabarito.

Pior: a alternativa contaminada é sempre a última, e em várias delas é
justamente a que o gabarito aponta. Quem estuda pela busca de texto encontrava
essas questões por qualquer número.

A causa está em importar_pdf.py e foi corrigida lá (o corpo do arquivo agora
termina antes da chave, e as figuras não passam da última página de texto).
Este script limpa o que já está gravado, sem reimportar PDF nenhum.

Uso:
    python3 scripts/limpar_cauda.py --seco
    python3 scripts/limpar_cauda.py
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import DIR_TEMAS  # noqa: E402
from deteccao import cita_figura  # noqa: E402

DIR_IMAGENS = Path(__file__).resolve().parent.parent / "public" / "imagens"

# Oito ou mais fichas seguidas, cada uma um número de questão ou uma letra de
# resposta. Nenhuma alternativa de prova termina assim; a chave de respostas
# sempre termina.
CAUDA = re.compile(r"(?:(?:\d{1,4}|[A-E])(?:\s+|$)){8,}$")

# As páginas finais do e-book saem sempre nestes tamanhos: a folha de bolhas,
# a página inteira digitalizada e o logotipo quadrado. Conferi que nenhuma
# figura legítima do acervo tem qualquer um deles.
TAMANHOS_DE_FOLHA = {(631, 895), (1728, 2464), (1241, 1754), (256, 256)}


def cortar(texto: str) -> str:
    limpo = CAUDA.sub("", texto).strip()
    return limpo or texto


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--seco", action="store_true", help="mostra e não grava")
    ap.add_argument(
        "--apagar-arquivos",
        action="store_true",
        help="apaga também os .png/.jpeg das figuras descartadas",
    )
    args = ap.parse_args()

    textos, figuras, pendentes, arquivos = [], [], [], []
    for caminho in sorted(DIR_TEMAS.glob("*.json")):
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        mudou = False
        for questao in dados["questoes"]:
            for alternativa in questao["alternativas"]:
                limpo = cortar(alternativa["texto"])
                if limpo != alternativa["texto"]:
                    sobra = len(alternativa["texto"]) - len(limpo)
                    textos.append(f"{questao['id']} {alternativa['letra']}: −{sobra} caracteres")
                    alternativa["texto"] = limpo
                    mudou = True

            restantes = [
                img
                for img in questao["imagens"]
                if (img["largura"], img["altura"]) not in TAMANHOS_DE_FOLHA
            ]
            if len(restantes) != len(questao["imagens"]):
                descartadas = [
                    img for img in questao["imagens"] if img not in restantes
                ]
                figuras.append(
                    f"{questao['id']}: {len(descartadas)} figura(s) de folha de respostas"
                )
                arquivos.extend(DIR_IMAGENS / img["arquivo"] for img in descartadas)
                questao["imagens"] = restantes
                mudou = True

            # Sem as figuras falsas, uma questão que pede figura volta a ser
            # uma questão sem figura — e precisa avisar quem for respondê-la.
            pendente = cita_figura(questao["enunciado"]) and not questao["imagens"]
            if pendente != questao["figuraPendente"]:
                pendentes.append(f"{questao['id']}: figuraPendente {pendente}")
                questao["figuraPendente"] = pendente
                mudou = True

        if mudou and not args.seco:
            caminho.write_text(
                json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )

    for linha in textos + figuras + pendentes:
        print(linha)
    print(
        f"\n{len(textos)} alternativa(s) cortada(s), {len(figuras)} questão(ões) com figura "
        f"falsa, {len(pendentes)} marca(s) de figura pendente ajustada(s)."
    )

    if args.apagar_arquivos and not args.seco:
        apagados = 0
        for arquivo in arquivos:
            if arquivo.exists():
                arquivo.unlink()
                apagados += 1
        print(f"{apagados} arquivo(s) de imagem apagado(s).")
    elif arquivos:
        print(f"{len(arquivos)} arquivo(s) de imagem continuam no disco (use --apagar-arquivos).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
