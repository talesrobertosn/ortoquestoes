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
  - arquivo de comentários que não abre, ou que carrega marca de truncamento
  - comentário que contradiz o gabarito, ou que deixa alternativa sem explicação

Avisos (não falham):
  - questão sem gabarito, sem ano, sem tipo de prova
  - classificação de subtema ainda pendente de conferência
  - questão ainda não revisada por humano
  - comentário sem referências
  - comentário com campo que a interface não exibe
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import (  # noqa: E402
    CAMINHO_INDICE,
    DIR_COMENTARIOS,
    DIR_IMAGENS,
    DIR_TEMAS,
    LETRAS,
    carregar_taxonomia,
    ler_json,
)

OBRIGATORIOS = ("id", "tema", "enunciado", "alternativas")

# Campos que o cartão da questão realmente renderiza (src/dados/tipos.ts).
# Um campo fora desta lista é texto que ninguém lê: foi escrito, ocupa o
# arquivo e nunca chega à tela.
CAMPOS_COMENTARIO = {
    "alerta", "conceito", "correta", "incorretas",
    "referencias", "geradoEm", "conferido",
}

# Ferramentas de leitura elidem o meio de arquivos grandes. Quando essa
# elisão é gravada de volta, o arquivo perde conteúdo de forma silenciosa —
# foi o que destruiu 352 KB de comentários de trauma em setembro de 2026.
MARCAS_TRUNCAMENTO = ("bytes omitted", "chars omitted", "characters omitted", "lines omitted")


def conferir_comentarios(
    gabaritos: dict[str, str | None],
    letras: dict[str, set[str]],
) -> tuple[list[str], list[str], int]:
    """Valida os arquivos de comentário contra as questões do acervo."""
    erros: list[str] = []
    avisos: list[str] = []
    total = 0

    for arquivo in sorted(DIR_COMENTARIOS.glob("*.json")):
        bruto = arquivo.read_text(encoding="utf-8")
        for marca in MARCAS_TRUNCAMENTO:
            if marca in bruto:
                erros.append(
                    f"{arquivo.name}: contém a marca de truncamento "
                    f"{marca!r} — o arquivo foi gravado a partir de uma "
                    f"leitura incompleta e perdeu conteúdo"
                )
        try:
            comentarios = json.loads(bruto)
        except json.JSONDecodeError as erro:
            erros.append(f"{arquivo.name}: não é JSON válido ({erro})")
            continue
        if not isinstance(comentarios, dict):
            erros.append(f"{arquivo.name}: deveria ser um objeto de id para comentário")
            continue

        for qid, comentario in comentarios.items():
            onde = f"{arquivo.name}:{qid}"
            total += 1
            if not isinstance(comentario, dict):
                erros.append(f"{onde}: comentário não é um objeto")
                continue
            if qid not in letras:
                erros.append(f"{onde}: comenta uma questão que não existe no acervo")
                continue
            if not str(comentario.get("correta") or "").strip():
                erros.append(f"{onde}: sem explicação da alternativa correta")

            incorretas = comentario.get("incorretas") or {}
            if not isinstance(incorretas, dict):
                erros.append(f"{onde}: 'incorretas' deveria ser um objeto por letra")
                continue
            gabarito = gabaritos.get(qid)
            if gabarito and gabarito in incorretas:
                erros.append(
                    f"{onde}: a letra {gabarito} é o gabarito e está entre as incorretas"
                )
            inexistentes = sorted(set(incorretas) - letras[qid])
            if inexistentes:
                erros.append(f"{onde}: explica letra inexistente {inexistentes}")
            faltando = sorted(
                letras[qid] - set(incorretas) - ({gabarito} if gabarito else set())
            )
            if faltando:
                erros.append(f"{onde}: sem explicação para {faltando}")
            vazias = sorted(
                letra for letra, texto in incorretas.items()
                if not str(texto or "").strip()
            )
            if vazias:
                erros.append(f"{onde}: explicação vazia para {vazias}")

            if not comentario.get("referencias"):
                avisos.append(f"{onde}: comentário sem referências")
            desconhecidos = sorted(set(comentario) - CAMPOS_COMENTARIO)
            if desconhecidos:
                avisos.append(
                    f"{onde}: campo que a interface não exibe: {', '.join(desconhecidos)}"
                )

    return erros, avisos, total


def principal() -> int:
    taxonomia = carregar_taxonomia()
    subtemas_validos = {s for t in taxonomia["temas"] for s in t["subtemas"]}
    nomes_validos = {t["nome"] for t in taxonomia["temas"]}

    erros: list[str] = []
    avisos: list[str] = []
    vistos: dict[str, str] = {}
    total = 0
    # Alimentam a conferência dos comentários, logo adiante.
    gabaritos: dict[str, str | None] = {}
    letras_da_questao: dict[str, set[str]] = {}

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
            if identificador != "(sem id)":
                gabaritos[identificador] = gabarito
                letras_da_questao[identificador] = {l for l in letras if l}
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

            for i, contribuicao in enumerate(questao.get("comentariosComunidade") or []):
                if not (contribuicao.get("texto") or "").strip():
                    erros.append(f"{onde}: comentário da comunidade {i} sem texto")
                if not (contribuicao.get("autor") or "").strip():
                    erros.append(
                        f"{onde}: comentário da comunidade {i} sem autor — contribuição "
                        "publicada precisa de crédito"
                    )
                for imagem in contribuicao.get("imagens") or []:
                    if not (DIR_IMAGENS / imagem.get("arquivo", "")).exists():
                        erros.append(
                            f"{onde}: imagem de comentário ausente no disco: "
                            f"{imagem.get('arquivo')}"
                        )

            for imagem in questao.get("imagens") or []:
                caminho = DIR_IMAGENS / imagem.get("arquivo", "")
                if not caminho.exists():
                    erros.append(f"{onde}: imagem ausente no disco: {imagem.get('arquivo')}")

            if questao.get("ano") is None:
                avisos.append(f"{onde}: sem ano")
            if questao.get("prova") is None:
                avisos.append(f"{onde}: sem tipo de prova")
            if questao.get("figuraPendente"):
                avisos.append(f"{onde}: cita figura que não veio no PDF de origem")
            if questao.get("subtemasPendentes"):
                avisos.append(f"{onde}: classificação de subtema pendente de conferência")
            if not questao.get("revisado"):
                avisos.append(f"{onde}: ainda não revisada por humano")

    erros_ia, avisos_ia, total_comentarios = conferir_comentarios(
        gabaritos, letras_da_questao
    )
    erros.extend(erros_ia)
    avisos.extend(avisos_ia)

    indice = ler_json(CAMINHO_INDICE, None)
    if indice is None:
        erros.append("indice.json não existe. Rode scripts/gerar_indice.py")
    elif indice.get("total") != total:
        erros.append(
            f"indice.json desatualizado: diz {indice.get('total')} questões, "
            f"os temas somam {total}. Rode scripts/gerar_indice.py"
        )
    if indice is not None:
        # O índice é quem diz à interface que a questão tem comentário. Se ele
        # promete mais do que os arquivos entregam, o leitor abre o gabarito e
        # não encontra explicação nenhuma — sem erro visível.
        prometidos = sum(1 for q in indice.get("questoes", []) if q.get("cia"))
        if prometidos != total_comentarios:
            erros.append(
                f"indice.json promete {prometidos} questões com comentário de IA, "
                f"mas os arquivos de comentário somam {total_comentarios}. "
                f"Rode scripts/gerar_indice.py"
            )

    print(
        f"Acervo: {total} questões em {len(arquivos)} tema(s), "
        f"{total_comentarios} com comentário de IA."
    )

    if avisos:
        # Agrupados por tipo: 1500 linhas iguais não ajudam ninguém a decidir.
        import collections

        por_tipo: dict[str, list[str]] = collections.defaultdict(list)
        for aviso in avisos:
            onde, _, motivo = aviso.partition(": ")
            por_tipo[motivo].append(onde)
        print(f"\n{len(avisos)} aviso(s) em {len(por_tipo)} categoria(s):")
        for motivo, onde in sorted(por_tipo.items(), key=lambda x: -len(x[1])):
            exemplos = ", ".join(o.split(":")[-1] for o in onde[:3])
            resto = f" … e mais {len(onde) - 3}" if len(onde) > 3 else ""
            print(f"  · {len(onde):>5}  {motivo}  ({exemplos}{resto})")

    if erros:
        print(f"\n{len(erros)} ERRO(S):")
        for erro in erros:
            print(f"  ✗ {erro}")
        return 1

    print("\nValidação passou sem erros.")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
