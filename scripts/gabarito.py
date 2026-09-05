"""
Leitura de gabarito em arquivo separado.

Dois formatos são reconhecidos:

* **lista** — pares "número letra" em qualquer arranjo (coluna, linha, tabela),
  interpretados pelo texto corrido.
* **grade** — planilha de colunas [número][letra], que é como vem o gabarito
  destes bancos. Aqui a leitura é posicional: agrupa por linha, descobre as
  colunas pelos números e casa cada letra com a coluna à sua esquerda.

Páginas de grade que vêm **sem os números impressos** têm a numeração inferida
pela posição, e toda inferência é devolvida para o relatório. Inferir em
silêncio seria exatamente o erro que este projeto não pode cometer.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

try:
    import pymupdf
except ImportError:  # pragma: no cover
    import fitz as pymupdf  # type: ignore

PADRAO_PAR = re.compile(
    r"(?<![\dA-Za-z])(\d{1,4})\s*[\.\)\-–—:]?\s*([A-Ea-e])(?![A-Za-zÀ-ÿ0-9])"
)
PADRAO_ANULADA = re.compile(
    r"(?<![\dA-Za-z])(\d{1,4})\s*[\.\)\-–—:]?\s*(anulad[ao]|anul\.?|nula)\b", re.IGNORECASE
)


@dataclass
class Gabarito:
    respostas: dict[int, str] = field(default_factory=dict)
    anuladas: set[int] = field(default_factory=set)
    avisos: list[str] = field(default_factory=list)
    formato: str = "desconhecido"


def _agrupar_linhas(palavras, tolerancia: float = 4.0):
    """Agrupa palavras por linha visual, devolvendo listas ordenadas por x."""
    linhas: list[tuple[float, list]] = []
    for palavra in sorted(palavras, key=lambda p: (p[1], p[0])):
        y = palavra[1]
        if linhas and abs(linhas[-1][0] - y) <= tolerancia:
            linhas[-1][1].append(palavra)
        else:
            linhas.append((y, [palavra]))
    return [(y, sorted(itens, key=lambda p: p[0])) for y, itens in linhas]


def _colunas(xs: list[float], tolerancia: float = 25.0) -> list[float]:
    """Agrupa posições x em colunas, devolvendo o x inicial de cada uma."""
    grupos: list[list[float]] = []
    for x in sorted(xs):
        if grupos and x - grupos[-1][-1] <= tolerancia:
            grupos[-1].append(x)
        else:
            grupos.append([x])
    return [min(g) for g in grupos]


def paginas_de_grade(documento, minimo: int = 20) -> list[int]:
    """
    Páginas que parecem folha de respostas: números e letras soltos, quase nada
    de outro texto. Serve para achar o gabarito dentro do próprio arquivo de
    questões quando não há cabeçalho "GABARITO" nenhum — e para não confundir
    as páginas de questão, onde a alternativa é "A)" e não "A".

    Duas exigências que parecem detalhe e não são:

    * **pelo menos uma letra marcada.** Folha de respostas em branco (o modelo
      vazio, que alguns arquivos trazem junto) não é gabarito, e incluí-la
      estraga a inferência de numeração: a página vazia viraria a âncora.
    * **nenhum piso de letras.** A última folha costuma ter poucas marcas — a de
      tumores tem 14 —, e exigir vinte deixaria essas questões sem gabarito.
    """
    encontradas: list[int] = []
    for numero in range(len(documento)):
        palavras = documento[numero].get_text("words")
        letras = sum(1 for p in palavras if re.fullmatch(r"[A-Ea-e]", p[4]))
        numeros = sum(1 for p in palavras if re.fullmatch(r"\d{1,4}", p[4]))
        outras = sum(1 for p in palavras if not re.fullmatch(r"[A-Ea-e]|\d{1,4}", p[4]))
        celulas = letras + numeros
        if letras >= 1 and celulas >= minimo and outras <= celulas * 0.25:
            encontradas.append(numero)
    return encontradas


def ler_grade(documento, paginas: list[int] | None = None) -> Gabarito:
    gabarito = Gabarito(formato="grade")
    alvo = list(range(len(documento))) if paginas is None else list(paginas)
    resultado: list[dict] = []

    xs_numericos: list[float] = []
    for numero in alvo:
        palavras = documento[numero].get_text("words")
        for palavra in palavras:
            if re.fullmatch(r"\d{1,4}", palavra[4]):
                xs_numericos.append(palavra[0])

    if xs_numericos:
        origens = _colunas(xs_numericos)
    else:
        # Folha de uma página só, com os números fora da camada de texto: as
        # colunas saem das próprias letras marcadas. Dentro de uma coluna as
        # bolhas A a E ficam a ~20 pontos uma da outra; entre colunas o vão
        # passa de 70. Uma tolerância no meio disso separa sem ambiguidade.
        xs_letras: list[float] = []
        for numero in alvo:
            for palavra in documento[numero].get_text("words"):
                if re.fullmatch(r"[A-Ea-e]", palavra[4]):
                    xs_letras.append(palavra[0])
        origens = _colunas(xs_letras, tolerancia=40.0) if xs_letras else []
        if origens:
            gabarito.avisos.append(
                f"O gabarito não traz número nenhum na camada de texto. As {len(origens)} "
                "colunas foram descobertas pela posição das letras marcadas."
            )

    if not origens:
        gabarito.avisos.append(
            "Nenhum número nem letra encontrados: as colunas não puderam ser descobertas."
        )
        return gabarito

    for numero in alvo:
        palavras = documento[numero].get_text("words")
        linhas = _agrupar_linhas(palavras)
        celulas: dict[tuple[int, int], dict] = {}
        for indice_linha, (_, itens) in enumerate(linhas):
            for palavra in itens:
                x, texto = palavra[0], palavra[4]
                coluna = 0
                for i, origem in enumerate(origens):
                    if x >= origem - 2:
                        coluna = i
                if re.fullmatch(r"\d{1,4}", texto):
                    celulas.setdefault((indice_linha, coluna), {})["numero"] = int(texto)
                elif re.fullmatch(r"[A-Ea-e]", texto):
                    celulas.setdefault((indice_linha, coluna), {})["letra"] = texto.upper()
                elif re.fullmatch(r"(?i)anulad[ao]|anul\.?|nula", texto):
                    celulas.setdefault((indice_linha, coluna), {})["anulada"] = True
        resultado.append(
            {
                "pagina": numero,
                "linhas": len(linhas),
                "celulas": celulas,
                "tem_numeros": any("numero" in c for c in celulas.values()),
            }
        )

    # Páginas sem números: inferir a partir da primeira página numerada.
    ancora = next((p for p in resultado if p["tem_numeros"]), None)
    for pagina in resultado:
        if pagina["tem_numeros"]:
            continue
        if ancora is None:
            # Nenhuma página numerada no arquivo inteiro. A leitura só faz
            # sentido assumindo que a grade começa em 1 — o que é o normal numa
            # folha de página única. É uma suposição, e vai dita no relatório.
            linhas_por_coluna = pagina["linhas"]
            for (linha, coluna), celula in pagina["celulas"].items():
                celula["numero"] = 1 + coluna * linhas_por_coluna + linha
                celula["inferido"] = True
            maior = max(
                (c["numero"] for c in pagina["celulas"].values() if "numero" in c), default=0
            )
            gabarito.avisos.append(
                f"Página {pagina['pagina'] + 1} do gabarito não traz número nenhum e não há "
                "outra página numerada no arquivo. A numeração 1–"
                f"{maior} foi SUPOSTA: grade lida coluna a coluna, "
                f"{linhas_por_coluna} linhas por coluna. CONFIRA no original as questões 1, "
                f"{linhas_por_coluna}, {linhas_por_coluna + 1} e {maior}."
            )
            continue
        # Quantas respostas cabem numa página completa, medido na página-âncora.
        por_pagina = len(ancora["celulas"])
        indice_pagina = resultado.index(pagina)
        indice_ancora = resultado.index(ancora)
        inicio_ancora = min(
            c["numero"] for c in ancora["celulas"].values() if "numero" in c
        )
        distancia = indice_ancora - indice_pagina
        inicio = inicio_ancora - distancia * por_pagina
        linhas_por_coluna = pagina["linhas"]
        for (linha, coluna), celula in pagina["celulas"].items():
            celula["numero"] = inicio + coluna * linhas_por_coluna + linha
            celula["inferido"] = True
        gabarito.avisos.append(
            f"Página {pagina['pagina'] + 1} do gabarito não traz os números impressos. "
            f"A numeração {inicio}–{inicio + por_pagina - 1} foi INFERIDA pela posição na "
            f"grade ({linhas_por_coluna} linhas por coluna, preenchimento coluna a coluna), "
            f"tomando como âncora a página {ancora['pagina'] + 1}, que começa em "
            f"{inicio_ancora}. CONFIRA no original as questões {inicio}, "
            f"{inicio + linhas_por_coluna - 1}, {inicio + linhas_por_coluna} e "
            f"{inicio + por_pagina - 1}."
        )

    for pagina in resultado:
        for celula in pagina["celulas"].values():
            numero = celula.get("numero")
            if numero is None:
                continue
            if celula.get("anulada"):
                gabarito.anuladas.add(numero)
            elif "letra" in celula:
                if numero in gabarito.respostas and gabarito.respostas[numero] != celula["letra"]:
                    gabarito.avisos.append(
                        f"Questão {numero}: gabarito lido duas vezes com letras diferentes "
                        f"({gabarito.respostas[numero]} e {celula['letra']}). Mantida a primeira."
                    )
                else:
                    gabarito.respostas.setdefault(numero, celula["letra"])

    return gabarito


def ler_lista(texto: str) -> Gabarito:
    gabarito = Gabarito(formato="lista")
    for achado in PADRAO_ANULADA.finditer(texto):
        gabarito.anuladas.add(int(achado.group(1)))
    for achado in PADRAO_PAR.finditer(texto):
        numero, letra = int(achado.group(1)), achado.group(2).upper()
        gabarito.respostas.setdefault(numero, letra)
    for numero in gabarito.anuladas:
        gabarito.respostas.pop(numero, None)
    return gabarito


def ler_arquivo(caminho, formato: str = "auto") -> Gabarito:
    """
    Lê o gabarito de um arquivo. O arquivo pode conter só a folha de respostas
    ou trazer as questões junto — por isso a grade é lida apenas nas páginas
    que parecem folha. Ler a grade sobre o documento inteiro faz as páginas de
    questão entrarem na descoberta das colunas e o casamento número-letra sair
    torto, deixando dezenas de questões sem gabarito.
    """
    documento = pymupdf.open(caminho)
    texto = "\n".join(documento[i].get_text("text") for i in range(len(documento)))
    if formato == "lista":
        return ler_lista(texto)

    paginas = paginas_de_grade(documento)
    if formato == "grade":
        return ler_grade(documento, paginas or None)

    grade = ler_grade(documento, paginas or None) if paginas else Gabarito(formato="grade")
    lista = ler_lista(texto)
    if len(grade.respostas) >= len(lista.respostas):
        return grade
    return lista
