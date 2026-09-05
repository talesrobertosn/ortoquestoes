#!/usr/bin/env python3
"""
Importação de um PDF de questões para o acervo do OrtoQuestões.

Regra central: em caso de dúvida, sinalizar e não adivinhar. Nada de enunciado,
gabarito, ano ou tipo de prova é inventado — o que não está no PDF fica nulo e
vai para o relatório.

Uso:
    python3 scripts/importar_pdf.py pdfs/mao.pdf --tema mao
    python3 scripts/importar_pdf.py pdfs/mao.pdf --tema mao --colunas 2
    python3 scripts/importar_pdf.py pdfs/mao.pdf --tema mao --prova TEOT --ano 2019

O script é idempotente: reprocessar o mesmo PDF gera o mesmo resultado, e
reprocessar um tema não toca nos outros. Campos preenchidos por humano
(comentário, referências, dificuldade) e questões já marcadas como revisadas
são preservados na reimportação.
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

try:
    import pymupdf  # type: ignore
except ImportError:  # pragma: no cover
    try:
        import fitz as pymupdf  # type: ignore
    except ImportError:
        print(
            "PyMuPDF não está instalado. Rode:  pip install pymupdf",
            file=sys.stderr,
        )
        raise SystemExit(2)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import (  # noqa: E402
    DIR_IMAGENS,
    DIR_RELATORIOS,
    DIR_TEMAS,
    LETRAS,
    PALAVRAS_VAZIAS,
    carregar_sinonimos,
    gravar_json,
    juntar_linhas,
    ler_json,
    normalizar,
    tema_por_slug,
)

# --------------------------------------------------------------------------
# Estruturas
# --------------------------------------------------------------------------


@dataclass
class Linha:
    texto: str
    pagina: int
    x0: float
    y0: float
    x1: float
    y1: float


@dataclass
class Figura:
    pagina: int
    y0: float
    y1: float
    x0: float
    x1: float
    xref: int | None
    renderizada: bool = False


@dataclass
class QuestaoBruta:
    numero: int
    linhas: list[Linha]
    pagina: int
    prova: str | None = None
    ano: int | None = None
    enunciado: str = ""
    alternativas: list[dict] = field(default_factory=list)
    imagens: list[dict] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)
    confianca: float = 1.0


PADRAO_PROVA = re.compile(r"\b(TEOT|TARO|SBOT)\b", re.IGNORECASE)
PADRAO_ANO = re.compile(r"\b(19[89]\d|20[0-4]\d)\b")
PADRAO_QUESTAO = re.compile(r"^\s*(?:QUEST[AÃ]O\s*)?(\d{1,3})\s*[\).\-–—:]?\s+(?=\S)", re.IGNORECASE)
# Uma alternativa exige delimitador depois da letra ("A)", "(A)", "A -", "a.").
# Sem essa exigência, um enunciado que começa com "A radiografia..." seria lido
# como alternativa A — erro comum e silencioso em português.
PADRAO_ALTERNATIVA = re.compile(r"^\s*\(?([A-Ea-e])\)\s*(?=\S)|^\s*\(?([A-Ea-e])\s*[\.\-–—:]\s+(?=\S)")
# Usado só como segunda tentativa, quando o padrão acima não acha nada, e sempre
# com aviso no relatório.
PADRAO_ALTERNATIVA_FROUXO = re.compile(r"^\s*\(?([A-Ea-e])\)?\s*[\).\-–—:]?\s+(?=\S)")


def letra_de_alternativa(texto: str, frouxo: bool = False) -> tuple[str, re.Match] | tuple[None, None]:
    padrao = PADRAO_ALTERNATIVA_FROUXO if frouxo else PADRAO_ALTERNATIVA
    correspondencia = padrao.match(texto)
    if not correspondencia:
        return None, None
    letra = next((g for g in correspondencia.groups() if g), None)
    if letra is None:
        return None, None
    return letra.upper(), correspondencia
PADRAO_CITA_FIGURA = re.compile(
    r"\b(figura|figuras|imagem|imagens|radiografi\w*|tomografi\w*|resson\w*|foto\w*|"
    r"esquema|gr[áa]fico|abaixo\s+(?:ilustra|demonstra|apresenta)|a\s+seguir)\b",
    re.IGNORECASE,
)
PADRAO_CABECALHO_GABARITO = re.compile(
    r"^\s*(gabarito|respostas|chave de respostas|gabarito oficial|folha de respostas)\b",
    re.IGNORECASE,
)
PADRAO_PAR_GABARITO = re.compile(
    r"(?<![\dA-Za-z])(\d{1,3})\s*[\.\)\-–—:]?\s*([A-Ea-e])(?![A-Za-zÀ-ÿ0-9])"
)
PADRAO_ANULADA = re.compile(
    r"(?<![\dA-Za-z])(\d{1,3})\s*[\.\)\-–—:]?\s*(anulad[ao]|anul\.?|nula)\b", re.IGNORECASE
)


# --------------------------------------------------------------------------
# Extração do PDF
# --------------------------------------------------------------------------


def tem_camada_de_texto(documento) -> bool:
    amostra = min(len(documento), 5)
    caracteres = sum(len(documento[i].get_text("text").strip()) for i in range(amostra))
    return caracteres > 200 * amostra / 5


def extrair_linhas_da_pagina(pagina, numero: int, colunas: int) -> list[Linha]:
    dados = pagina.get_text("dict")
    linhas: list[Linha] = []
    for bloco in dados.get("blocks", []):
        if bloco.get("type") != 0:
            continue
        for linha in bloco.get("lines", []):
            texto = "".join(trecho.get("text", "") for trecho in linha.get("spans", []))
            if not texto.strip():
                continue
            x0, y0, x1, y1 = linha["bbox"]
            linhas.append(Linha(texto, numero, x0, y0, x1, y1))

    if colunas == 2:
        meio = pagina.rect.width / 2
        esquerda = [l for l in linhas if (l.x0 + l.x1) / 2 < meio]
        direita = [l for l in linhas if (l.x0 + l.x1) / 2 >= meio]
        ordenar = lambda ls: sorted(ls, key=lambda l: (round(l.y0, 1), l.x0))  # noqa: E731
        return ordenar(esquerda) + ordenar(direita)

    return sorted(linhas, key=lambda l: (round(l.y0, 1), l.x0))


def extrair_figuras_da_pagina(pagina, numero: int, area_minima: float) -> list[Figura]:
    figuras: list[Figura] = []
    try:
        informacoes = pagina.get_image_info(xrefs=True)
    except Exception:
        informacoes = []
    area_pagina = max(1.0, pagina.rect.width * pagina.rect.height)
    for informacao in informacoes:
        x0, y0, x1, y1 = informacao["bbox"]
        largura, altura = x1 - x0, y1 - y0
        if largura < 40 or altura < 40:
            continue
        if (largura * altura) / area_pagina < area_minima:
            continue
        figuras.append(
            Figura(numero, y0, y1, x0, x1, informacao.get("xref") or None)
        )
    return figuras


# --------------------------------------------------------------------------
# Segmentação
# --------------------------------------------------------------------------


def maior_sequencia_crescente(candidatos: list[tuple[int, int]]) -> list[int]:
    """
    Escolhe, entre marcas de número candidatas, a maior subsequência crescente.
    É o que separa "12." de início de questão de um "12" citado no enunciado.
    """
    if not candidatos:
        return []
    n = len(candidatos)
    melhor = [1] * n
    anterior = [-1] * n
    for i in range(n):
        for j in range(i):
            if candidatos[j][1] < candidatos[i][1] and melhor[j] + 1 > melhor[i]:
                melhor[i] = melhor[j] + 1
                anterior[i] = j
    fim = max(range(n), key=lambda i: melhor[i])
    caminho: list[int] = []
    while fim != -1:
        caminho.append(fim)
        fim = anterior[fim]
    return list(reversed(caminho))


def localizar_gabarito(linhas: list[Linha], total_paginas: int) -> tuple[int, str]:
    """Devolve (índice da linha onde o gabarito começa, motivo). -1 se não achou."""
    limite_pagina = max(0, int(total_paginas * 0.5))
    for i in range(len(linhas) - 1, -1, -1):
        linha = linhas[i]
        if linha.pagina < limite_pagina:
            break
        if PADRAO_CABECALHO_GABARITO.match(linha.texto.strip()):
            return i, f"cabeçalho '{linha.texto.strip()[:40]}' na página {linha.pagina + 1}"

    # Sem cabeçalho: procura uma página cujo conteúdo seja majoritariamente
    # pares "número letra".
    por_pagina: dict[int, list[Linha]] = {}
    for linha in linhas:
        por_pagina.setdefault(linha.pagina, []).append(linha)
    for pagina in sorted(por_pagina, reverse=True):
        if pagina < limite_pagina:
            break
        texto = " ".join(l.texto for l in por_pagina[pagina])
        pares = PADRAO_PAR_GABARITO.findall(texto)
        palavras = len(texto.split())
        if len(pares) >= 10 and palavras and len(pares) * 2 / palavras > 0.5:
            primeira = min(linhas.index(l) for l in por_pagina[pagina])
            return primeira, f"página {pagina + 1} com {len(pares)} pares número-letra"

    return -1, "nenhuma página de gabarito reconhecida"


def interpretar_gabarito(texto: str) -> tuple[dict[int, str], set[int]]:
    respostas: dict[int, str] = {}
    anuladas: set[int] = set()

    for correspondencia in PADRAO_ANULADA.finditer(texto):
        anuladas.add(int(correspondencia.group(1)))

    for correspondencia in PADRAO_PAR_GABARITO.finditer(texto):
        numero = int(correspondencia.group(1))
        letra = correspondencia.group(2).upper()
        if numero in respostas and respostas[numero] != letra:
            # Conflito: prevalece a primeira leitura e o número é sinalizado.
            respostas[numero] = respostas[numero]
        else:
            respostas.setdefault(numero, letra)

    for numero in anuladas:
        respostas.pop(numero, None)

    return respostas, anuladas


def segmentar_questoes(linhas: list[Linha]) -> list[QuestaoBruta]:
    candidatos: list[tuple[int, int]] = []
    for i, linha in enumerate(linhas):
        correspondencia = PADRAO_QUESTAO.match(linha.texto)
        if not correspondencia:
            continue
        numero = int(correspondencia.group(1))
        if numero == 0 or numero > 500:
            continue
        # Uma linha de alternativa nunca começa uma questão.
        if letra_de_alternativa(linha.texto)[0]:
            continue
        candidatos.append((i, numero))

    escolhidos = maior_sequencia_crescente(candidatos)
    inicios = [candidatos[i] for i in escolhidos]

    questoes: list[QuestaoBruta] = []
    for posicao, (indice, numero) in enumerate(inicios):
        fim = inicios[posicao + 1][0] if posicao + 1 < len(inicios) else len(linhas)
        bloco = linhas[indice:fim]
        questoes.append(QuestaoBruta(numero=numero, linhas=bloco, pagina=bloco[0].pagina))
    return questoes


def separar_enunciado_e_alternativas(questao: QuestaoBruta) -> None:
    linhas = list(questao.linhas)
    if not linhas:
        return

    # Tira o marcador do número da primeira linha, preservando o resto.
    primeira = linhas[0]
    linhas[0] = Linha(
        PADRAO_QUESTAO.sub("", primeira.texto, count=1),
        primeira.pagina,
        primeira.x0,
        primeira.y0,
        primeira.x1,
        primeira.y1,
    )

    def achar_inicios(frouxo: bool) -> list[tuple[int, str]]:
        encontrados: list[tuple[int, str]] = []
        esperada = 0
        for i, linha in enumerate(linhas):
            letra, _ = letra_de_alternativa(linha.texto, frouxo)
            if letra is None:
                continue
            if esperada < len(LETRAS) and letra == LETRAS[esperada]:
                encontrados.append((i, letra))
                esperada += 1
        return encontrados

    inicio_alternativas = achar_inicios(False)
    frouxo = False
    if len(inicio_alternativas) < 2:
        candidatas = achar_inicios(True)
        if len(candidatas) > len(inicio_alternativas):
            inicio_alternativas = candidatas
            frouxo = True
            questao.avisos.append(
                "alternativas identificadas sem delimitador (A, B, C sem parêntese) — conferir"
            )
            questao.confianca -= 0.2

    if not inicio_alternativas:
        questao.enunciado = juntar_linhas([l.texto for l in linhas])
        questao.avisos.append("nenhuma alternativa reconhecida")
        questao.confianca -= 0.6
        return

    corte = inicio_alternativas[0][0]
    questao.enunciado = juntar_linhas([l.texto for l in linhas[:corte]])

    for posicao, (indice, letra) in enumerate(inicio_alternativas):
        fim = (
            inicio_alternativas[posicao + 1][0]
            if posicao + 1 < len(inicio_alternativas)
            else len(linhas)
        )
        trecho = list(linhas[indice:fim])
        _, correspondencia = letra_de_alternativa(trecho[0].texto, frouxo)
        prefixo = correspondencia.end() if correspondencia else 0
        trecho[0] = Linha(
            trecho[0].texto[prefixo:],
            trecho[0].pagina,
            trecho[0].x0,
            trecho[0].y0,
            trecho[0].x1,
            trecho[0].y1,
        )
        texto = juntar_linhas([l.texto for l in trecho])
        questao.alternativas.append({"letra": letra, "texto": texto})

    # Sinais de extração duvidosa.
    if len(questao.alternativas) not in (4, 5):
        questao.avisos.append(f"{len(questao.alternativas)} alternativas")
        questao.confianca -= 0.4
    if len(questao.enunciado) < 25:
        questao.avisos.append("enunciado muito curto")
        questao.confianca -= 0.4
    for alternativa in questao.alternativas:
        if len(alternativa["texto"]) < 1:
            questao.avisos.append(f"alternativa {alternativa['letra']} vazia")
            questao.confianca -= 0.3


# --------------------------------------------------------------------------
# Contexto: prova e ano
# --------------------------------------------------------------------------


def detectar_contexto(
    linhas: list[Linha], padrao_prova: str | None, padrao_ano: int | None
) -> dict[int, tuple[str | None, int | None]]:
    """
    Percorre as linhas e memoriza o último cabeçalho curto que informe prova
    e/ou ano. Devolve, por índice de linha, o contexto vigente ali.
    """
    contexto: dict[int, tuple[str | None, int | None]] = {}
    prova_atual, ano_atual = padrao_prova, padrao_ano
    for i, linha in enumerate(linhas):
        texto = linha.texto.strip()
        if len(texto) <= 80:
            achou_prova = PADRAO_PROVA.search(texto)
            achou_ano = PADRAO_ANO.search(texto)
            if achou_prova or (achou_ano and achou_prova):
                if achou_prova:
                    prova_atual = achou_prova.group(1).upper()
                if achou_ano:
                    ano_atual = int(achou_ano.group(1))
            elif achou_ano and len(texto) <= 30 and not PADRAO_QUESTAO.match(texto):
                ano_atual = int(achou_ano.group(1))
        contexto[i] = (prova_atual, ano_atual)
    return contexto


# --------------------------------------------------------------------------
# Classificação por subtema
# --------------------------------------------------------------------------


def propor_subtemas(enunciado: str, subtemas: list[str], sinonimos: dict) -> list[str]:
    texto = normalizar(enunciado)
    melhores: list[tuple[float, str]] = []

    for subtema in subtemas:
        pontos = 0.0
        for chave in sinonimos.get(subtema, []):
            if normalizar(chave) in texto:
                pontos += 2.0
        palavras = [
            p
            for p in re.split(r"[^a-z0-9]+", normalizar(subtema))
            if len(p) >= 4 and p not in PALAVRAS_VAZIAS
        ]
        if palavras:
            acertos = sum(1 for p in palavras if p in texto)
            pontos += acertos / len(palavras)
            if acertos == len(palavras):
                pontos += 0.5
        if pontos >= 1.0:
            melhores.append((pontos, subtema))

    melhores.sort(key=lambda x: (-x[0], x[1]))
    return [subtema for _, subtema in melhores[:2]]


# --------------------------------------------------------------------------
# Figuras
# --------------------------------------------------------------------------


def salvar_figura_raster(documento, figura: Figura, destino: Path) -> tuple[int, int] | None:
    if figura.xref is None:
        return None
    try:
        base = documento.extract_image(figura.xref)
    except Exception:
        return None
    dados = base.get("image")
    if not dados:
        return None
    extensao = base.get("ext", "png")
    caminho = destino.with_suffix("." + extensao)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(dados)
    return base.get("width"), base.get("height"), caminho.name  # type: ignore[return-value]


def renderizar_area(documento, pagina: int, retangulo, destino: Path, dpi: int = 200):
    pagina_pdf = documento[pagina]
    matriz = pymupdf.Matrix(dpi / 72, dpi / 72)
    pixmap = pagina_pdf.get_pixmap(matrix=matriz, clip=retangulo)
    destino.parent.mkdir(parents=True, exist_ok=True)
    caminho = destino.with_suffix(".png")
    pixmap.save(caminho)
    return pixmap.width, pixmap.height, caminho.name


# --------------------------------------------------------------------------
# Programa
# --------------------------------------------------------------------------


def principal() -> int:
    analisador = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    analisador.add_argument("pdf", type=Path, help="caminho do PDF de questões")
    analisador.add_argument("--tema", required=True, help="slug do tema (ver src/dados/taxonomia.json)")
    analisador.add_argument("--prova", default=None, help="tipo de prova, quando o PDF não informa")
    analisador.add_argument("--ano", type=int, default=None, help="ano, quando o PDF não informa")
    analisador.add_argument("--colunas", type=int, default=1, choices=(1, 2), help="layout do PDF")
    analisador.add_argument(
        "--area-minima-figura",
        type=float,
        default=0.02,
        help="fração da página abaixo da qual uma imagem é considerada enfeite",
    )
    analisador.add_argument(
        "--sem-render-lacunas",
        action="store_true",
        help="não renderizar figuras vetoriais a partir das lacunas do texto",
    )
    analisador.add_argument(
        "--sobrescrever-revisadas",
        action="store_true",
        help="reimporta também as questões já marcadas como revisadas (perde a revisão)",
    )
    analisador.add_argument("--seco", action="store_true", help="só relatório, não grava nada")
    argumentos = analisador.parse_args()

    if not argumentos.pdf.exists():
        print(f"PDF não encontrado: {argumentos.pdf}", file=sys.stderr)
        return 2

    tema = tema_por_slug(argumentos.tema)
    if tema is None:
        print(
            f"Tema '{argumentos.tema}' não existe na taxonomia. "
            f"Acrescente-o em src/dados/taxonomia.json antes de importar.",
            file=sys.stderr,
        )
        return 2

    documento = pymupdf.open(argumentos.pdf)
    relatorio: list[str] = []
    alertas: list[str] = []

    ocr_usado = False
    if not tem_camada_de_texto(documento):
        alertas.append(
            "PDF SEM CAMADA DE TEXTO: a extração dependeu de reconhecimento óptico. "
            "Este arquivo exige conferência humana mais atenta, questão por questão."
        )
        ocr_usado = True

    linhas: list[Linha] = []
    figuras: list[Figura] = []
    for numero in range(len(documento)):
        pagina = documento[numero]
        if ocr_usado:
            try:
                pagina_texto = pagina.get_textpage_ocr(language="por", dpi=300, full=True)
                dados = pagina.get_text("dict", textpage=pagina_texto)
                for bloco in dados.get("blocks", []):
                    if bloco.get("type") != 0:
                        continue
                    for linha in bloco.get("lines", []):
                        texto = "".join(t.get("text", "") for t in linha.get("spans", []))
                        if texto.strip():
                            x0, y0, x1, y1 = linha["bbox"]
                            linhas.append(Linha(texto, numero, x0, y0, x1, y1))
            except Exception as erro:
                print(
                    "Reconhecimento óptico indisponível neste ambiente "
                    f"({erro}). Instale o Tesseract com o idioma português "
                    "(tesseract-ocr, tesseract-ocr-por) ou passe um PDF com camada de texto.",
                    file=sys.stderr,
                )
                return 2
        else:
            linhas.extend(extrair_linhas_da_pagina(pagina, numero, argumentos.colunas))
        figuras.extend(
            extrair_figuras_da_pagina(pagina, numero, argumentos.area_minima_figura)
        )

    if not linhas:
        print("Nenhum texto extraído do PDF.", file=sys.stderr)
        return 1

    indice_gabarito, motivo_gabarito = localizar_gabarito(linhas, len(documento))
    if indice_gabarito >= 0:
        linhas_corpo = linhas[:indice_gabarito]
        texto_gabarito = "\n".join(l.texto for l in linhas[indice_gabarito:])
    else:
        linhas_corpo = linhas
        texto_gabarito = ""
        alertas.append(
            "Nenhuma página de gabarito foi reconhecida. Todas as questões ficam sem "
            "gabarito até que o mapeamento seja informado."
        )

    respostas, anuladas = interpretar_gabarito(texto_gabarito)
    contexto = detectar_contexto(linhas_corpo, argumentos.prova, argumentos.ano)
    questoes = segmentar_questoes(linhas_corpo)

    if not questoes:
        print(
            "Nenhuma questão reconhecida. Confira se o PDF é de duas colunas "
            "(--colunas 2) ou se a numeração usa outro formato.",
            file=sys.stderr,
        )
        return 1

    sinonimos = carregar_sinonimos()
    indice_por_linha = {id(l): i for i, l in enumerate(linhas_corpo)}

    for questao in questoes:
        separar_enunciado_e_alternativas(questao)
        posicao = indice_por_linha.get(id(questao.linhas[0]), 0)
        questao.prova, questao.ano = contexto.get(posicao, (argumentos.prova, argumentos.ano))

    # Figuras: cada uma pertence à questão cujo intervalo de linhas a contém.
    dir_imagens_tema = DIR_IMAGENS / argumentos.tema
    figuras_usadas = 0
    for figura in figuras:
        dona: QuestaoBruta | None = None
        for questao in questoes:
            linhas_na_pagina = [l for l in questao.linhas if l.pagina == figura.pagina]
            if not linhas_na_pagina:
                continue
            topo = min(l.y0 for l in linhas_na_pagina)
            base = max(l.y1 for l in linhas_na_pagina)
            if topo - 12 <= figura.y0 <= base + 12:
                dona = questao
                break
        if dona is None:
            continue
        indice_figura = len(dona.imagens) + 1
        nome_base = dir_imagens_tema / f"{argumentos.tema}-{dona.numero:04d}-{indice_figura}"
        if argumentos.seco:
            dona.imagens.append(
                {"arquivo": f"{argumentos.tema}/{nome_base.name}.png", "legenda": None}
            )
            figuras_usadas += 1
            continue
        salvo = salvar_figura_raster(documento, figura, nome_base)
        if salvo is None:
            continue
        largura, altura, nome = salvo
        dona.imagens.append(
            {
                "arquivo": f"{argumentos.tema}/{nome}",
                "legenda": None,
                "largura": largura,
                "altura": altura,
            }
        )
        figuras_usadas += 1

    # Figuras vetoriais: renderiza a lacuna vertical dentro da questão.
    renderizadas = 0
    if not argumentos.sem_render_lacunas and not argumentos.seco:
        for questao in questoes:
            if questao.imagens or not PADRAO_CITA_FIGURA.search(questao.enunciado):
                continue
            for pagina_numero in sorted({l.pagina for l in questao.linhas}):
                linhas_pagina = sorted(
                    [l for l in questao.linhas if l.pagina == pagina_numero],
                    key=lambda l: l.y0,
                )
                for anterior, seguinte in zip(linhas_pagina, linhas_pagina[1:]):
                    lacuna = seguinte.y0 - anterior.y1
                    if lacuna < 60:
                        continue
                    largura_pagina = documento[pagina_numero].rect.width
                    retangulo = pymupdf.Rect(
                        18, anterior.y1 + 2, largura_pagina - 18, seguinte.y0 - 2
                    )
                    nome_base = (
                        dir_imagens_tema
                        / f"{argumentos.tema}-{questao.numero:04d}-r{len(questao.imagens) + 1}"
                    )
                    largura, altura, nome = renderizar_area(
                        documento, pagina_numero, retangulo, nome_base
                    )
                    questao.imagens.append(
                        {
                            "arquivo": f"{argumentos.tema}/{nome}",
                            "legenda": None,
                            "largura": largura,
                            "altura": altura,
                        }
                    )
                    questao.avisos.append("figura renderizada da página, conferir recorte")
                    questao.confianca -= 0.15
                    renderizadas += 1

    # ----------------------------------------------------------------------
    # Montagem dos registros
    # ----------------------------------------------------------------------

    caminho_tema = DIR_TEMAS / f"{argumentos.tema}.json"
    existente = ler_json(caminho_tema, {"questoes": []}) or {"questoes": []}
    anteriores = {q["id"]: q for q in existente.get("questoes", [])}
    por_origem = {
        (q.get("origem", {}).get("arquivo"), q.get("origem", {}).get("numeroOriginal")): q
        for q in existente.get("questoes", [])
    }
    nome_pdf = argumentos.pdf.name

    # Identificadores já atribuídos nunca são reciclados: um link compartilhado
    # continua apontando para a mesma questão depois de qualquer reimportação.
    usados = set(anteriores)
    proximo = 1

    def novo_id() -> str:
        nonlocal proximo
        while True:
            candidato = f"{argumentos.tema}-{proximo:04d}"
            proximo += 1
            if candidato not in usados:
                usados.add(candidato)
                return candidato

    registros: list[dict] = []
    preservadas = 0
    sem_gabarito: list[int] = []
    alternativas_fora: list[int] = []
    figura_sem_imagem: list[int] = []
    sem_prova: list[int] = []
    sem_ano: list[int] = []

    for questao in questoes:
        anterior = por_origem.get((nome_pdf, questao.numero))
        identificador = anterior["id"] if anterior else novo_id()

        gabarito = respostas.get(questao.numero)
        anulada = questao.numero in anuladas
        if gabarito is None and not anulada:
            sem_gabarito.append(questao.numero)
            questao.confianca -= 0.3
        elif gabarito and questao.alternativas:
            letras = {a["letra"] for a in questao.alternativas}
            if gabarito not in letras:
                questao.avisos.append(f"gabarito {gabarito} não existe entre as alternativas")
                questao.confianca -= 0.5
                gabarito = None

        if len(questao.alternativas) not in (4, 5):
            alternativas_fora.append(questao.numero)
        if PADRAO_CITA_FIGURA.search(questao.enunciado) and not questao.imagens:
            figura_sem_imagem.append(questao.numero)
            questao.avisos.append("enunciado cita figura, nenhuma imagem associada")
            questao.confianca -= 0.2
        if not questao.prova:
            sem_prova.append(questao.numero)
        if not questao.ano:
            sem_ano.append(questao.numero)

        propostos = propor_subtemas(questao.enunciado, tema["subtemas"], sinonimos)

        registro = {
            "id": identificador,
            "tema": tema["nome"],
            "subtemas": propostos,
            "prova": questao.prova,
            "ano": questao.ano,
            "dificuldade": None,
            "enunciado": questao.enunciado,
            "imagens": questao.imagens,
            "alternativas": questao.alternativas,
            "gabarito": gabarito,
            "comentario": None,
            "referencias": [],
            "anulada": anulada,
            "revisado": False,
            "subtemasPendentes": bool(propostos),
            "origem": {
                "arquivo": nome_pdf,
                "pagina": questao.pagina + 1,
                "numeroOriginal": questao.numero,
            },
        }

        if anterior:
            # O trabalho humano nunca é sobrescrito pela reimportação.
            for campo in ("comentario", "referencias", "dificuldade"):
                if anterior.get(campo) not in (None, [], ""):
                    registro[campo] = anterior[campo]
            if anterior.get("revisado") and not argumentos.sobrescrever_revisadas:
                registro = {**anterior}
                preservadas += 1

        registros.append(registro)

    # Questões de outros PDFs já presentes neste tema continuam onde estavam.
    de_outros_arquivos = [
        q for q in existente.get("questoes", []) if q.get("origem", {}).get("arquivo") != nome_pdf
    ]
    todas = de_outros_arquivos + registros
    todas.sort(key=lambda q: (q.get("origem", {}).get("arquivo") or "", q.get("origem", {}).get("numeroOriginal") or 0))

    saida = {
        "tema": tema["nome"],
        "slug": tema["slug"],
        "geradoEm": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "questoes": todas,
    }

    if not argumentos.seco:
        gravar_json(caminho_tema, saida)

    # ----------------------------------------------------------------------
    # Relatório
    # ----------------------------------------------------------------------

    piores = sorted(questoes, key=lambda q: q.confianca)[:20]
    piores = [q for q in piores if q.confianca < 1.0]

    relatorio.append(f"# Relatório de importação — {tema['nome']}")
    relatorio.append("")
    relatorio.append(f"- Arquivo: `{nome_pdf}` ({len(documento)} páginas)")
    relatorio.append(f"- Gerado em: {saida['geradoEm']}")
    relatorio.append(f"- Camada de texto: {'não (OCR aplicado)' if ocr_usado else 'sim'}")
    relatorio.append(f"- Gabarito localizado por: {motivo_gabarito}")
    relatorio.append("")
    relatorio.append("## Números")
    relatorio.append("")
    relatorio.append(f"- Questões encontradas: **{len(questoes)}**")
    relatorio.append(f"- Gabaritos casados: **{len(questoes) - len(sem_gabarito)}**")
    relatorio.append(f"- Questões anuladas: **{len([q for q in questoes if q.numero in anuladas])}**")
    relatorio.append(f"- Questões sem gabarito: **{len(sem_gabarito)}**")
    relatorio.append(f"- Questões com nº de alternativas fora de 4 ou 5: **{len(alternativas_fora)}**")
    relatorio.append(f"- Imagens extraídas do PDF: **{figuras_usadas}**")
    relatorio.append(f"- Figuras renderizadas de área vetorial: **{renderizadas}**")
    relatorio.append(f"- Questões que citam figura sem imagem associada: **{len(figura_sem_imagem)}**")
    relatorio.append(f"- Questões sem tipo de prova identificado: **{len(sem_prova)}**")
    relatorio.append(f"- Questões sem ano identificado: **{len(sem_ano)}**")
    relatorio.append(f"- Questões já revisadas, preservadas nesta importação: **{preservadas}**")
    relatorio.append("")

    if alertas:
        relatorio.append("## Alertas")
        relatorio.append("")
        for alerta in alertas:
            relatorio.append(f"- {alerta}")
        relatorio.append("")

    def lista_numeros(numeros: list[int]) -> str:
        if not numeros:
            return "nenhuma"
        mostra = ", ".join(str(n) for n in numeros[:40])
        return mostra + (f" … (+{len(numeros) - 40})" if len(numeros) > 40 else "")

    relatorio.append("## Listas para conferência")
    relatorio.append("")
    relatorio.append(f"- Sem gabarito: {lista_numeros(sem_gabarito)}")
    relatorio.append(f"- Alternativas fora do esperado: {lista_numeros(alternativas_fora)}")
    relatorio.append(f"- Citam figura sem imagem: {lista_numeros(figura_sem_imagem)}")
    relatorio.append(f"- Sem tipo de prova: {lista_numeros(sem_prova)}")
    relatorio.append(f"- Sem ano: {lista_numeros(sem_ano)}")
    relatorio.append("")

    relatorio.append("## As 20 extrações de menor confiança")
    relatorio.append("")
    if not piores:
        relatorio.append("Nenhuma questão apresentou sinal de extração duvidosa.")
    else:
        for questao in piores:
            trecho = questao.enunciado[:160].replace("\n", " ")
            relatorio.append(
                f"### Questão {questao.numero} (página {questao.pagina + 1}, confiança "
                f"{max(0.0, questao.confianca):.2f})"
            )
            relatorio.append("")
            relatorio.append(f"- Avisos: {'; '.join(questao.avisos) or 'nenhum'}")
            relatorio.append(f"- Trecho: `{trecho}`")
            relatorio.append(
                f"- Alternativas: {', '.join(a['letra'] for a in questao.alternativas) or 'nenhuma'}"
            )
            relatorio.append("")

    relatorio.append("## Próximo passo")
    relatorio.append("")
    relatorio.append(
        "Confira no PDF original as questões listadas acima. Depois de conferir uma questão, "
        "marque `\"revisado\": true` no JSON do tema — a reimportação passa a preservá-la."
    )
    relatorio.append("")

    texto_relatorio = "\n".join(relatorio)
    if not argumentos.seco:
        DIR_RELATORIOS.mkdir(parents=True, exist_ok=True)
        (DIR_RELATORIOS / f"{argumentos.tema}.md").write_text(texto_relatorio, encoding="utf-8")

    print(texto_relatorio)

    if not argumentos.seco:
        print(f"\nAcervo gravado em {caminho_tema.relative_to(Path.cwd()) if caminho_tema.is_relative_to(Path.cwd()) else caminho_tema}")
        print("Rode agora:  python3 scripts/gerar_indice.py && python3 scripts/validar_acervo.py")

    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
