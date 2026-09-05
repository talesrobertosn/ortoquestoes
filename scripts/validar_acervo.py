#!/usr/bin/env python3
"""
Validação do acervo. Retorna código de erro quando algo está quebrado, para
poder rodar antes de publicar.

Erros (falham a validação):
  - identificador duplicado
  - gabarito apontando para letra que não existe entre as alternativas
  - campo obrigatório vazio
  - subtema fora da taxonomia
  - imagem referenciada e ausente no disco
  - índice desatualizado em relação aos arquivos de tema

Avisos (não falham):
  - questão sem gabarito, sem ano, sem tipo de prova
  - classificação de subtema ainda pendente de conferência
  - questão ainda não revisada por humano
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import (  # noqa: E402
    CAMINHO_INDICE,
    DIR_IMAGENS,
    DIR_TEMAS,
    LETRAS,
    carregar_taxonomia,
    ler_json,
)

OBRIGATORIOS = ("id", "tema", "enunciado", "alternativas")


def principal() -> int:
    taxonomia = carregar_taxonomia()
    subtemas_validos = {s for t in taxonomia["temas"] for s in t["subtemas"]}
    nomes_validos = {t["nome"] for t in taxonomia["temas"]}

    erros: list[str] = []
    avisos: list[str] = []
    vistos: dict[str, str] = {}
    total = 0

    arquivos = sorted(DIR_TEMAS.glob("*.json"))
    if not arquivos:
        print("Nenhum arquivo de tema em public/acervo/temas/. Acervo vazio.")

    for arquivo in arquivos:
        dados = ler_json(arquivo, {}) or {}
        questoes = dados.get("questoes", [])
        for questao in questoes:
            total += 1
            identificador = questao.get("id") or "(sem id)"
            onde = f"{arquivo.name}:{identificador}"

            for campo in OBRIGATORIOS:
                valor = questao.get(campo)
                if valor in (None, "", []):
                    erros.append(f"{onde}: campo obrigatório vazio: {campo}")

            if identificador in vistos:
                erros.append(f"{onde}: identificador duplicado (já usado em {vistos[identificador]})")
            else:
                vistos[identificador] = arquivo.name

            if questao.get("tema") not in nomes_validos:
                erros.append(f"{onde}: tema '{questao.get('tema')}' fora da taxonomia")

            alternativas = questao.get("alternativas") or []
            letras = [a.get("letra") for a in alternativas]
            if len(set(letras)) != len(letras):
                erros.append(f"{onde}: letras de alternativa repetidas: {letras}")
            if letras and letras != LETRAS[: len(letras)]:
                erros.append(f"{onde}: alternativas fora da sequência esperada: {letras}")
            for alternativa in alternativas:
                if not (alternativa.get("texto") or "").strip():
                    erros.append(f"{onde}: alternativa {alternativa.get('letra')} sem texto")

            gabarito = questao.get("gabarito")
            if gabarito is None:
                if not questao.get("anulada"):
                    avisos.append(f"{onde}: sem gabarito")
            elif gabarito not in letras:
                erros.append(
                    f"{onde}: gabarito '{gabarito}' não existe entre as alternativas {letras}"
                )

            for subtema in questao.get("subtemas") or []:
                if subtema not in subtemas_validos:
                    erros.append(f"{onde}: subtema fora da taxonomia: '{subtema}'")

            for imagem in questao.get("imagens") or []:
                caminho = DIR_IMAGENS / imagem.get("arquivo", "")
                if not caminho.exists():
                    erros.append(f"{onde}: imagem ausente no disco: {imagem.get('arquivo')}")

            if questao.get("ano") is None:
                avisos.append(f"{onde}: sem ano")
            if questao.get("prova") is None:
                avisos.append(f"{onde}: sem tipo de prova")
            if questao.get("subtemasPendentes"):
                avisos.append(f"{onde}: classificação de subtema pendente de conferência")
            if not questao.get("revisado"):
                avisos.append(f"{onde}: ainda não revisada por humano")

    indice = ler_json(CAMINHO_INDICE, None)
    if indice is None:
        erros.append("indice.json não existe. Rode scripts/gerar_indice.py")
    elif indice.get("total") != total:
        erros.append(
            f"indice.json desatualizado: diz {indice.get('total')} questões, "
            f"os temas somam {total}. Rode scripts/gerar_indice.py"
        )

    print(f"Acervo: {total} questões em {len(arquivos)} tema(s).")

    if avisos:
        print(f"\n{len(avisos)} aviso(s):")
        for aviso in avisos[:30]:
            print(f"  · {aviso}")
        if len(avisos) > 30:
            print(f"  … e mais {len(avisos) - 30}")

    if erros:
        print(f"\n{len(erros)} ERRO(S):")
        for erro in erros:
            print(f"  ✗ {erro}")
        return 1

    print("\nValidação passou sem erros.")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
