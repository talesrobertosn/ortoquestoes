#!/usr/bin/env python3
"""
Importação de um PDF de questões para o acervo do OrtoQuestões.

Regra central: em caso de dúvida, sinalizar e não adivinhar. Nada de enunciado,
gabarito, ano ou tipo de prova é inventado — o que não está no PDF fica nulo e
vai para o relatório.

Uso:
    python3 scripts/importar_pdf.py pdfs/pediatria.pdf --tema pediatria \\
        --gabarito pdfs/pediatria-gabarito.pdf

    python3 scripts/importar_pdf.py pdfs/mao.pdf --tema mao --colunas 2
    python3 scripts/importar_pdf.py pdfs/mao.pdf --tema mao --faixa 1-202

Idempotente: reprocessar o mesmo PDF gera o mesmo resultado, e reprocessar um
tema não toca nos outros. Campos preenchidos por humano (comentário,
referências, dificuldade) e questões marcadas como revisadas são preservados.
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from difflib import SequenceMatcher
from dataclasses import dataclass, field
from pathlib import Path

try:
    import pymupdf
except ImportError:  # pragma: no cover
    try:
        import fitz as pymupdf  # type: ignore
    except ImportError:
        print("PyMuPDF não está instalado. Rode:  pip install pymupdf", file=sys.stderr)
        raise SystemExit(2)

sys.path.insert(0, str(Path(__file__).resolve().parent))

import gabarito as mod_gabarito  # noqa: E402
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
from texto_pdf import (  # noqa: E402
    LinhaVisual as Linha,
    construir_mapas_de_glifo,
    extrair_linhas_visuais,
    precisa_de_glifos,
)

# --------------------------------------------------------------------------
# Padrões
# --------------------------------------------------------------------------

PADRAO_PROVA = re.compile(r"\b(TEOT|TARO|SBOT)\b", re.IGNORECASE)
PADRAO_ANO = re.compile(r"\b(19[89]\d|20[0-4]\d)\b")

# "Questão 203" sozinho na linha, com as etiquetas ao lado na mesma linha visual.
PADRAO_CABECALHO = re.compile(r"^\s*Quest[ãa]o\s*(?:n?[º°.]?\s*)?(\d{1,4})\s*[).:\-–—]?\s*$", re.IGNORECASE)
# "12. Enunciado começa aqui" — numeração embutida na própria linha.
PADRAO_NUMERO_EMBUTIDO = re.compile(r"^\s*(?:Quest[ãa]o\s*)?(\d{1,4})\s*[\).\-–—:]\s+(?=\S)", re.IGNORECASE)

# Uma alternativa exige delimitador depois da letra: "A)", "(A)", "A -", "A=", "a.".
# Sem essa exigência, um enunciado que começa com "A radiografia..." seria lido
# como alternativa A — erro comum e silencioso em português.
PADRAO_ALTERNATIVA = re.compile(
    r"^\s*\(?([A-Ea-e])\)\s*(?=\S)|^\s*\(?([A-Ea-e])\s*[\.\-–—:=]\s*(?=\S)"
)
PADRAO_ALTERNATIVA_FROUXO = re.compile(r"^\s*\(?([A-Ea-e])\)?\s*[\).\-–—:=]?\s+(?=\S)")

# Crédito de figura. Não é enunciado: vai para as referências e para a legenda
# da imagem. Nada é descartado — só colocado no campo certo.
PADRAO_FONTE = re.compile(
    r"^\s*(fonte|adaptado de|adaptada de|dispon[íi]vel em|refer[êe]ncia)\s*[:.\-–—]",
    re.IGNORECASE,
)

# Citar "radiografia" não quer dizer que a questão traga uma. Só conta como
# figura ausente quando há também linguagem que aponta para algo mostrado —
# "a imagem a seguir", "a linha assinalada". Sem esse rigor o relatório pede
# dezenas de imagens que a questão nunca teve.
PADRAO_VISUAL = re.compile(
    r"\b(figura|figuras|imagem|imagens|radiografi\w*|tomografi\w*|resson\w*|"
    r"foto\w*|esquema|gr[áa]fico|exame de imagem)\b",
    re.IGNORECASE,
)
PADRAO_DEITICO = re.compile(
    r"\b(abaixo|a seguir|acima|ao lado|em anexo|apresentad\w+|assinalad\w+|indicad\w+|"
    r"demonstrad\w+|ilustrad\w+|representad\w+|tra[çc]ad\w+|mostrad\w+|deste caso|do caso)\b",
    re.IGNORECASE,
)


def cita_figura(enunciado: str) -> bool:
    return bool(PADRAO_VISUAL.search(enunciado) and PADRAO_DEITICO.search(enunciado))
PADRAO_CABECALHO_GABARITO = re.compile(
    r"^\s*(gabarito|respostas|chave de respostas|gabarito oficial|folha de respostas)\b",
    re.IGNORECASE,
)


def letra_de_alternativa(texto: str, frouxo: bool = False):
    padrao = PADRAO_ALTERNATIVA_FROUXO if frouxo else PADRAO_ALTERNATIVA
    achado = padrao.match(texto)
    if not achado:
        return None, None
    letra = next((g for g in achado.groups() if g), None)
    if letra is None:
        return None, None
    return letra.upper(), achado


# --------------------------------------------------------------------------
# Estruturas
# --------------------------------------------------------------------------


@dataclass
class Figura:
    pagina: int
    y0: float
    y1: float
    x0: float
    x1: float
    xref: int | None


@dataclass
class QuestaoBruta:
    numero: int
    pagina: int
    y_cabecalho: float = 0.0
    etiquetas: list[str] = field(default_factory=list)
    corpo: list[Linha] = field(default_factory=list)
    fontes: list[str] = field(default_factory=list)
    prova: str | None = None
    ano: int | None = None
    enunciado: str = ""
    alternativas: list[dict] = field(default_factory=list)
    imagens: list[dict] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)
    confianca: float = 1.0


# --------------------------------------------------------------------------
# Extração
# --------------------------------------------------------------------------


def tem_camada_de_texto(documento) -> bool:
    amostra = min(len(documento), 5)
    caracteres = sum(len(documento[i].get_text("text").strip()) for i in range(amostra))
    return caracteres > 200 * amostra / 5


def extrair_linhas(documento, colunas: int, ocr: bool) -> list[Linha]:
    """
    Linhas visuais do documento. Fora do OCR, a extração vem dos identificadores
    de glifo (ver texto_pdf), porque a via comum do extrator troca por espaço ou
    por U+FFFD todo glifo que não consegue mapear — perda silenciosa que só
    aparece quando alguém compara o texto com a página renderizada.
    """
    if not ocr:
        return extrair_linhas_visuais(documento, colunas=colunas)

    from texto_pdf import Bloco

    linhas: list[Linha] = []
    for numero in range(len(documento)):
        pagina = documento[numero]
        try:
            pagina_texto = pagina.get_textpage_ocr(language="por", dpi=300, full=True)
            dados = pagina.get_text("dict", textpage=pagina_texto)
        except Exception as erro:
            raise SystemExit(
                f"Reconhecimento óptico indisponível neste ambiente ({erro}). Instale o "
                "Tesseract com o idioma português (tesseract-ocr, tesseract-ocr-por) ou "
                "use um PDF com camada de texto."
            )
        cruas = []
        for bloco in dados.get("blocks", []):
            if bloco.get("type") != 0:
                continue
            for linha in bloco.get("lines", []):
                texto = "".join(s.get("text", "") for s in linha.get("spans", []))
                if texto.strip():
                    x0, y0, x1, y1 = linha["bbox"]
                    cruas.append((y0, x0, x1, y1, texto.strip()))
        if not cruas:
            continue
        alturas = [c[3] - c[0] for c in cruas]
        tolerancia = max(2.0, (sum(alturas) / len(alturas)) * 0.5)
        for y0, x0, x1, y1, texto in sorted(cruas):
            if linhas and linhas[-1].pagina == numero and abs(linhas[-1].y0 - y0) <= tolerancia:
                linhas[-1].blocos.append(Bloco(x0, x1, texto))
                linhas[-1].y1 = max(linhas[-1].y1, y1)
            else:
                linhas.append(Linha(numero, y0, y1, [Bloco(x0, x1, texto)]))
    for linha in linhas:
        linha.blocos.sort(key=lambda b: b.x0)
    return linhas


def extrair_figuras(documento, area_minima: float) -> list[Figura]:
    figuras: list[Figura] = []
    for numero in range(len(documento)):
        pagina = documento[numero]
        try:
            informacoes = pagina.get_image_info(xrefs=True)
        except Exception:
            continue
        area_pagina = max(1.0, pagina.rect.width * pagina.rect.height)
        for informacao in informacoes:
            x0, y0, x1, y1 = informacao["bbox"]
            if x1 - x0 < 40 or y1 - y0 < 40:
                continue
            if ((x1 - x0) * (y1 - y0)) / area_pagina < area_minima:
                continue
            figuras.append(Figura(numero, y0, y1, x0, x1, informacao.get("xref") or None))
    return figuras


# --------------------------------------------------------------------------
# Segmentação
# --------------------------------------------------------------------------


def maior_sequencia_crescente(candidatos: list[tuple[int, int]]) -> list[int]:
    """
    Entre as marcas de número candidatas, escolhe a maior subsequência crescente.
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


def localizar_gabarito_interno(linhas: list[Linha], total_paginas: int) -> tuple[int, str]:
    limite = max(0, int(total_paginas * 0.5))
    for i in range(len(linhas) - 1, -1, -1):
        if linhas[i].pagina < limite:
            break
        if PADRAO_CABECALHO_GABARITO.match(linhas[i].texto):
            return i, f"cabeçalho '{linhas[i].texto[:40]}' na página {linhas[i].pagina + 1}"
    return -1, "nenhum cabeçalho de gabarito dentro do arquivo de questões"


def segmentar_questoes(linhas: list[Linha], etiquetas_validas: set[str]) -> list[QuestaoBruta]:
    candidatos: list[tuple[int, int, list[str], bool]] = []
    for i, linha in enumerate(linhas):
        achado_cabecalho = PADRAO_CABECALHO.match(linha.primeiro)
        if achado_cabecalho:
            numero = int(achado_cabecalho.group(1))
            etiquetas = [b.texto.strip() for b in linha.blocos[1:] if b.texto.strip()]
            candidatos.append((i, numero, etiquetas, True))
            continue
        if letra_de_alternativa(linha.texto)[0]:
            continue
        achado_embutido = PADRAO_NUMERO_EMBUTIDO.match(linha.texto)
        if achado_embutido:
            numero = int(achado_embutido.group(1))
            if 0 < numero <= 2000:
                candidatos.append((i, numero, [], False))

    escolhidos = maior_sequencia_crescente([(c[0], c[1]) for c in candidatos])
    inicios = [candidatos[i] for i in escolhidos]

    def so_etiquetas(linha: Linha) -> bool:
        """Linha composta apenas de etiquetas conhecidas: é cabeçalho que quebrou."""
        if not linha.blocos:
            return False
        return all(
            normalizar(bloco.texto).strip(" .…") in etiquetas_validas for bloco in linha.blocos
        )

    questoes: list[QuestaoBruta] = []
    for posicao, (indice, numero, etiquetas, isolado) in enumerate(inicios):
        fim = inicios[posicao + 1][0] if posicao + 1 < len(inicios) else len(linhas)
        primeira_do_corpo = indice + 1 if isolado else indice
        if isolado:
            # As etiquetas nem sempre cabem na linha do número: quando sobram,
            # descem para a linha seguinte. Sem consumi-las aqui, elas entram
            # no enunciado e somem da classificação.
            while primeira_do_corpo < fim and so_etiquetas(linhas[primeira_do_corpo]):
                etiquetas.extend(
                    b.texto.strip() for b in linhas[primeira_do_corpo].blocos if b.texto.strip()
                )
                primeira_do_corpo += 1
        corpo = linhas[primeira_do_corpo:fim] if isolado else linhas[indice:fim]
        if not isolado and corpo:
            primeira = corpo[0]
            from texto_pdf import Bloco

            corpo = [
                Linha(
                    primeira.pagina,
                    primeira.y0,
                    primeira.y1,
                    [
                        Bloco(
                            primeira.x0,
                            primeira.blocos[-1].x1,
                            PADRAO_NUMERO_EMBUTIDO.sub("", primeira.texto, count=1),
                        )
                    ],
                )
            ] + corpo[1:]
        questoes.append(
            QuestaoBruta(
                numero=numero,
                pagina=linhas[indice].pagina,
                y_cabecalho=linhas[indice].y0,
                etiquetas=etiquetas,
                corpo=corpo,
            )
        )
    return questoes


def separar_enunciado_e_alternativas(questao: QuestaoBruta) -> None:
    linhas = questao.corpo
    if not linhas:
        questao.avisos.append("questão sem corpo")
        questao.confianca -= 0.8
        return

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

    inicios = achar_inicios(False)
    frouxo = False
    if len(inicios) < 2:
        candidatas = achar_inicios(True)
        if len(candidatas) > len(inicios):
            inicios, frouxo = candidatas, True
            questao.avisos.append(
                "alternativas identificadas sem delimitador claro — conferir"
            )
            questao.confianca -= 0.2

    if not inicios:
        questao.enunciado = juntar_linhas([l.texto for l in linhas])
        questao.avisos.append("nenhuma alternativa reconhecida")
        questao.confianca -= 0.6
        return

    corte = inicios[0][0]
    do_enunciado: list[str] = []
    em_fonte = False
    for linha in linhas[:corte]:
        if PADRAO_FONTE.match(linha.texto):
            em_fonte = True
            questao.fontes.append(linha.texto.strip())
            continue
        if em_fonte:
            # Continuação da referência quebrada em duas linhas.
            if questao.fontes and not linha.texto[:1].isupper():
                questao.fontes[-1] += " " + linha.texto.strip()
                continue
            em_fonte = False
        do_enunciado.append(linha.texto)
    questao.enunciado = juntar_linhas(do_enunciado)

    for posicao, (indice, letra) in enumerate(inicios):
        fim = inicios[posicao + 1][0] if posicao + 1 < len(inicios) else len(linhas)
        trecho = [l.texto for l in linhas[indice:fim]]
        _, achado = letra_de_alternativa(trecho[0], frouxo)
        if achado:
            trecho[0] = trecho[0][achado.end() :]
        questao.alternativas.append({"letra": letra, "texto": juntar_linhas(trecho)})

    if len(questao.alternativas) not in (4, 5):
        questao.avisos.append(f"{len(questao.alternativas)} alternativas")
        questao.confianca -= 0.4
    if len(questao.enunciado) < 25:
        questao.avisos.append("enunciado muito curto")
        questao.confianca -= 0.4
    for alternativa in questao.alternativas:
        if not alternativa["texto"].strip():
            questao.avisos.append(f"alternativa {alternativa['letra']} vazia")
            questao.confianca -= 0.3


# --------------------------------------------------------------------------
# Contexto e classificação
# --------------------------------------------------------------------------


# O ano só é aceito junto de um cabeçalho de prova ("TEOT 2019"). Sem esse
# rigor, o "2022" de uma referência bibliográfica no rodapé de uma questão vira
# o ano de todas as questões seguintes — erro silencioso e caro. Quando o PDF
# não diz a prova, o ano fica nulo e vai para o relatório: use --ano se souber.


def detectar_contexto(
    linhas: list[Linha], prova_padrao: str | None, ano_padrao: int | None
) -> tuple[dict[int, tuple[str | None, int | None]], list[str]]:
    contexto: dict[int, tuple[str | None, int | None]] = {}
    cabecalhos: list[str] = []
    prova, ano = prova_padrao, ano_padrao
    for i, linha in enumerate(linhas):
        texto = linha.texto
        if len(texto) <= 80:
            achou_prova = PADRAO_PROVA.search(texto)
            achou_ano = PADRAO_ANO.search(texto)
            if achou_prova:
                prova = achou_prova.group(1).upper()
                if achou_ano:
                    ano = int(achou_ano.group(1))
                cabecalhos.append(f"página {linha.pagina + 1}: {texto!r} → {prova} {ano or ''}".strip())
            # Um ano sozinho numa linha NÃO é aceito: quase sempre é a quebra
            # final de uma referência bibliográfica ("...Elsevier,\n2022."), e
            # aceitá-lo contamina todas as questões seguintes.
        contexto[i] = (prova, ano)
    return contexto, cabecalhos


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
    return [s for _, s in melhores[:2]]


def casar_etiqueta(etiqueta: str, validos: list[str]) -> str | None:
    """Casa a etiqueta do PDF com a taxonomia, tolerando acento e caixa."""
    alvo = normalizar(etiqueta).strip(" .…")
    for valido in validos:
        if normalizar(valido) == alvo:
            return valido
    # Etiqueta cortada na diagramação ("Ombro e cotovel...").
    if etiqueta.endswith(("...", "…")):
        for valido in validos:
            if normalizar(valido).startswith(alvo):
                return valido
    return None


# --------------------------------------------------------------------------
# Figuras
# --------------------------------------------------------------------------


def salvar_figura(documento, figura: Figura, destino: Path):
    if figura.xref is None:
        return None
    try:
        base = documento.extract_image(figura.xref)
    except Exception:
        return None
    dados = base.get("image")
    if not dados:
        return None
    caminho = destino.with_suffix("." + base.get("ext", "png"))
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(dados)
    return base.get("width"), base.get("height"), caminho.name


def renderizar_area(documento, pagina: int, retangulo, destino: Path, dpi: int = 200):
    matriz = pymupdf.Matrix(dpi / 72, dpi / 72)
    pixmap = documento[pagina].get_pixmap(matrix=matriz, clip=retangulo)
    destino.parent.mkdir(parents=True, exist_ok=True)
    caminho = destino.with_suffix(".png")
    pixmap.save(caminho)
    return pixmap.width, pixmap.height, caminho.name


# --------------------------------------------------------------------------
# Programa
# --------------------------------------------------------------------------


def faixa_valida(texto: str) -> tuple[int, int]:
    achado = re.fullmatch(r"(\d+)\s*-\s*(\d+)", texto.strip())
    if not achado:
        raise argparse.ArgumentTypeError("use o formato inicio-fim, por exemplo 1-202")
    inicio, fim = int(achado.group(1)), int(achado.group(2))
    if inicio > fim:
        raise argparse.ArgumentTypeError("o início da faixa é maior que o fim")
    return inicio, fim


def principal() -> int:
    analisador = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    analisador.add_argument("pdf", type=Path)
    analisador.add_argument("--tema", required=True, help="slug do tema (src/dados/taxonomia.json)")
    analisador.add_argument("--gabarito", type=Path, default=None, help="PDF de gabarito separado")
    analisador.add_argument(
        "--gabarito-formato", choices=("auto", "grade", "lista"), default="auto"
    )
    analisador.add_argument("--prova", default=None)
    analisador.add_argument("--ano", type=int, default=None)
    analisador.add_argument("--colunas", type=int, default=1, choices=(1, 2))
    analisador.add_argument(
        "--faixa", type=faixa_valida, default=None,
        help="importar só as questões nesta faixa de numeração original, ex.: 1-202",
    )
    analisador.add_argument("--area-minima-figura", type=float, default=0.02)
    analisador.add_argument("--sem-render-lacunas", action="store_true")
    analisador.add_argument("--sobrescrever-revisadas", action="store_true")
    analisador.add_argument("--seco", action="store_true", help="só relatório, não grava nada")
    argumentos = analisador.parse_args()

    if not argumentos.pdf.exists():
        print(f"PDF não encontrado: {argumentos.pdf}", file=sys.stderr)
        return 2

    tema = tema_por_slug(argumentos.tema)
    if tema is None:
        print(
            f"Tema '{argumentos.tema}' não existe na taxonomia. Acrescente-o em "
            "src/dados/taxonomia.json antes de importar.",
            file=sys.stderr,
        )
        return 2

    documento = pymupdf.open(argumentos.pdf)
    alertas: list[str] = []

    ocr = not tem_camada_de_texto(documento)
    if ocr:
        alertas.append(
            "PDF SEM CAMADA DE TEXTO: a extração dependeu de reconhecimento óptico. "
            "Este arquivo exige conferência humana mais atenta, questão por questão."
        )

    mapas = construir_mapas_de_glifo(documento) if (not ocr and precisa_de_glifos(documento)) else {}
    if mapas:
        alertas.append(
            "PDF com fonte Type0/Identity-H sem ToUnicode utilizável: o texto foi decodificado "
            "pelo cmap da fonte embutida (" + ", ".join(sorted(mapas)) + "). "
            "Sem isso o enunciado sairia embaralhado e sem espaços."
        )

    linhas = extrair_linhas(documento, argumentos.colunas, ocr)
    if not linhas:
        print("Nenhum texto extraído do PDF.", file=sys.stderr)
        return 1

    figuras = extrair_figuras(documento, argumentos.area_minima_figura)

    # ---------------- gabarito ----------------
    if argumentos.gabarito:
        if not argumentos.gabarito.exists():
            print(f"Gabarito não encontrado: {argumentos.gabarito}", file=sys.stderr)
            return 2
        chave = mod_gabarito.ler_arquivo(argumentos.gabarito, argumentos.gabarito_formato)
        origem_gabarito = f"arquivo separado {argumentos.gabarito.name} (formato {chave.formato})"
        linhas_corpo = linhas
    else:
        indice, motivo = localizar_gabarito_interno(linhas, len(documento))
        if indice >= 0:
            linhas_corpo = linhas[:indice]
            chave = mod_gabarito.ler_lista("\n".join(l.texto for l in linhas[indice:]))
            origem_gabarito = motivo
        else:
            linhas_corpo = linhas
            chave = mod_gabarito.Gabarito(formato="ausente")
            origem_gabarito = motivo
            alertas.append(
                "Nenhum gabarito localizado. Todas as questões ficam sem gabarito até que um "
                "arquivo seja informado com --gabarito."
            )

    alertas.extend(chave.avisos)

    # ---------------- questões ----------------
    contexto, cabecalhos_contexto = detectar_contexto(
        linhas_corpo, argumentos.prova, argumentos.ano
    )
    etiquetas_validas = {normalizar(t) for t in tema["subtemas"]} | {normalizar(tema["nome"])}
    questoes = segmentar_questoes(linhas_corpo, etiquetas_validas)
    if not questoes:
        print(
            "Nenhuma questão reconhecida. Confira se o PDF é de duas colunas (--colunas 2) "
            "ou se a numeração usa outro formato.",
            file=sys.stderr,
        )
        return 1

    fora_da_faixa = 0
    if argumentos.faixa:
        inicio, fim = argumentos.faixa
        antes = len(questoes)
        questoes = [q for q in questoes if inicio <= q.numero <= fim]
        fora_da_faixa = antes - len(questoes)

    indice_por_linha = {id(l): i for i, l in enumerate(linhas_corpo)}
    for questao in questoes:
        separar_enunciado_e_alternativas(questao)
        posicao = indice_por_linha.get(id(questao.corpo[0]), 0) if questao.corpo else 0
        questao.prova, questao.ano = contexto.get(posicao, (argumentos.prova, argumentos.ano))

    # ---------------- figuras ----------------
    dir_imagens = DIR_IMAGENS / argumentos.tema
    extraidas = renderizadas = 0

    # A figura pertence à última questão iniciada antes dela na ordem de
    # leitura. Casar por intervalo de coordenadas na mesma página não serve:
    # quando a questão atravessa a quebra de página, a figura aparece no topo
    # da página seguinte, acima de todo o texto restante daquela questão.
    ordenadas = sorted(questoes, key=lambda q: (q.pagina, q.y_cabecalho))
    for figura in sorted(figuras, key=lambda f: (f.pagina, f.y0)):
        dona = None
        for questao in ordenadas:
            if (questao.pagina, questao.y_cabecalho) <= (figura.pagina, figura.y0):
                dona = questao
            else:
                break
        if dona is None or argumentos.seco:
            continue
        salvo = salvar_figura(
            documento,
            figura,
            dir_imagens / f"{argumentos.tema}-{dona.numero:04d}-{len(dona.imagens) + 1}",
        )
        if salvo is None:
            continue
        largura, altura, nome = salvo
        dona.imagens.append(
            {"arquivo": f"{argumentos.tema}/{nome}", "legenda": None,
             "largura": largura, "altura": altura}
        )
        extraidas += 1

    if not argumentos.sem_render_lacunas and not argumentos.seco:
        for questao in questoes:
            if questao.imagens or not cita_figura(questao.enunciado):
                continue
            for pagina_numero in sorted({l.pagina for l in questao.corpo}):
                da_pagina = sorted(
                    [l for l in questao.corpo if l.pagina == pagina_numero], key=lambda l: l.y0
                )
                for anterior, seguinte in zip(da_pagina, da_pagina[1:]):
                    if seguinte.y0 - anterior.y1 < 60:
                        continue
                    largura_pagina = documento[pagina_numero].rect.width
                    retangulo = pymupdf.Rect(
                        18, anterior.y1 + 2, largura_pagina - 18, seguinte.y0 - 2
                    )
                    largura, altura, nome = renderizar_area(
                        documento,
                        pagina_numero,
                        retangulo,
                        dir_imagens
                        / f"{argumentos.tema}-{questao.numero:04d}-r{len(questao.imagens) + 1}",
                    )
                    questao.imagens.append(
                        {"arquivo": f"{argumentos.tema}/{nome}", "legenda": None,
                         "largura": largura, "altura": altura}
                    )
                    questao.avisos.append("figura renderizada da página, conferir recorte")
                    questao.confianca -= 0.15
                    renderizadas += 1

    # ---------------- registros ----------------
    caminho_tema = DIR_TEMAS / f"{argumentos.tema}.json"
    existente = ler_json(caminho_tema, {"questoes": []}) or {"questoes": []}
    anteriores = {q["id"]: q for q in existente.get("questoes", [])}
    por_origem = {
        (q.get("origem", {}).get("arquivo"), q.get("origem", {}).get("numeroOriginal")): q
        for q in existente.get("questoes", [])
    }
    nome_pdf = argumentos.pdf.name
    sinonimos = carregar_sinonimos()
    validos = tema["subtemas"]

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
    etiquetas_desconhecidas: dict[str, int] = {}
    com_etiqueta = 0
    normalizacoes: set[str] = set()

    for questao in questoes:
        anterior = por_origem.get((nome_pdf, questao.numero))
        identificador = anterior["id"] if anterior else novo_id()

        resposta = chave.respostas.get(questao.numero)
        anulada = questao.numero in chave.anuladas
        if resposta is None and not anulada:
            sem_gabarito.append(questao.numero)
            questao.confianca -= 0.3
        elif resposta and questao.alternativas:
            letras = {a["letra"] for a in questao.alternativas}
            if resposta not in letras:
                questao.avisos.append(
                    f"gabarito {resposta} não existe entre as alternativas {sorted(letras)}"
                )
                questao.confianca -= 0.5
                resposta = None

        if len(questao.alternativas) not in (4, 5):
            alternativas_fora.append(questao.numero)
        figura_pendente = cita_figura(questao.enunciado) and not questao.imagens
        if figura_pendente:
            figura_sem_imagem.append(questao.numero)
            questao.avisos.append("enunciado cita figura, nenhuma imagem associada")
            questao.confianca -= 0.2
        if not questao.prova:
            sem_prova.append(questao.numero)
        if not questao.ano:
            sem_ano.append(questao.numero)

        # Etiquetas do próprio PDF valem mais do que qualquer proposta automática.
        subtemas: list[str] = []
        for etiqueta in questao.etiquetas:
            # O primeiro segmento costuma repetir o nome do tema: não é subtema.
            if normalizar(etiqueta) == normalizar(tema["nome"]):
                continue
            casada = casar_etiqueta(etiqueta, validos)
            if casada:
                if casada not in subtemas:
                    subtemas.append(casada)
                if normalizar(casada) != normalizar(etiqueta.strip(" .…")):
                    normalizacoes.add(f"{etiqueta!r} → {casada!r}")
            else:
                etiquetas_desconhecidas[etiqueta] = etiquetas_desconhecidas.get(etiqueta, 0) + 1

        do_pdf = bool(subtemas)
        if do_pdf:
            com_etiqueta += 1
        else:
            subtemas = propor_subtemas(questao.enunciado, validos, sinonimos)

        if len(questao.imagens) == 1 and len(questao.fontes) == 1:
            questao.imagens[0]["legenda"] = questao.fontes[0]

        registro = {
            "id": identificador,
            "tema": tema["nome"],
            "subtemas": subtemas,
            "prova": questao.prova,
            "ano": questao.ano,
            "dificuldade": None,
            "enunciado": questao.enunciado,
            "imagens": questao.imagens,
            "alternativas": questao.alternativas,
            "gabarito": resposta,
            "comentario": None,
            "comentariosComunidade": [],
            "referencias": list(questao.fontes),
            "anulada": anulada,
            # A interface avisa o leitor em vez de entregar em silêncio uma
            # questão que pergunta sobre uma figura que não está lá.
            "figuraPendente": figura_pendente,
            "revisado": False,
            # Etiqueta que veio do PDF não é proposta: é dado de origem.
            "subtemasPendentes": (not do_pdf) and bool(subtemas),
            "origem": {
                "arquivo": nome_pdf,
                "pagina": questao.pagina + 1,
                "numeroOriginal": questao.numero,
            },
        }

        if anterior:
            for campo in ("comentario", "dificuldade", "comentariosComunidade"):
                if anterior.get(campo) not in (None, [], ""):
                    registro[campo] = anterior[campo]
            if anterior.get("referencias") and not registro["referencias"]:
                registro["referencias"] = anterior["referencias"]
            # Imagens anexadas à mão (figura que faltava no PDF de origem) não
            # podem ser perdidas quando o PDF é reprocessado.
            manuais = [i for i in (anterior.get("imagens") or []) if i.get("manual")]
            if manuais:
                registro["imagens"] = registro["imagens"] + manuais
            if anterior.get("revisado") and not argumentos.sobrescrever_revisadas:
                registro = {**anterior}
                preservadas += 1

        registros.append(registro)

    de_outros = [
        q for q in existente.get("questoes", []) if q.get("origem", {}).get("arquivo") != nome_pdf
    ]
    todas = de_outros + registros
    todas.sort(
        key=lambda q: (
            q.get("origem", {}).get("arquivo") or "",
            q.get("origem", {}).get("numeroOriginal") or 0,
        )
    )

    # Questões repetidas no mesmo tema. O que interessa não é a letra do
    # gabarito e sim o TEXTO da alternativa correta: duas cópias com listas de
    # alternativas em ordem diferente apontam letras diferentes para a mesma
    # resposta, e isso não é conflito. Conflito é quando o texto diverge.
    def texto_do_gabarito(questao: dict) -> str | None:
        letra = questao.get("gabarito")
        if not letra:
            return None
        for alternativa in questao.get("alternativas", []):
            if alternativa["letra"] == letra:
                return normalizar(alternativa["texto"]).strip(" .")
        return None

    grupos: dict[str, list[dict]] = {}
    for questao in todas:
        grupos.setdefault(normalizar(questao["enunciado"])[:220], []).append(questao)

    repetidas = [g for g in grupos.values() if len(g) > 1]
    duplicadas = [
        (g[0]["id"], outra["id"]) for g in repetidas for outra in g[1:]
    ]
    conflitos: list[list[dict]] = []
    for grupo in repetidas:
        respostas = [texto_do_gabarito(q) for q in grupo]
        base = respostas[0]
        # Diferença de redação ("associado"/"associada") não é conflito de
        # gabarito. Só conta como conflito quando a resposta é outra coisa.
        divergente = any(
            outra is None
            or base is None
            or SequenceMatcher(None, base, outra).ratio() < 0.9
            for outra in respostas[1:]
        )
        if divergente:
            conflitos.append(grupo)

    saida = {
        "tema": tema["nome"],
        "slug": tema["slug"],
        "geradoEm": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "questoes": todas,
    }
    if not argumentos.seco:
        gravar_json(caminho_tema, saida)

    # ---------------- relatório ----------------
    piores = [q for q in sorted(questoes, key=lambda q: q.confianca)[:20] if q.confianca < 1.0]

    def lista(numeros: list[int]) -> str:
        if not numeros:
            return "nenhuma"
        return ", ".join(str(n) for n in numeros[:40]) + (
            f" … (+{len(numeros) - 40})" if len(numeros) > 40 else ""
        )

    r: list[str] = []
    r.append(f"# Relatório de importação — {tema['nome']}")
    r.append("")
    r.append(f"- Arquivo: `{nome_pdf}` ({len(documento)} páginas)")
    r.append(f"- Gerado em: {saida['geradoEm']}")
    r.append(f"- Camada de texto: {'não (OCR aplicado)' if ocr else 'sim'}")
    r.append(f"- Gabarito: {origem_gabarito} — {len(chave.respostas)} respostas lidas")
    if argumentos.faixa:
        r.append(f"- Faixa importada: {argumentos.faixa[0]}–{argumentos.faixa[1]} "
                 f"({fora_da_faixa} questões do arquivo ficaram de fora)")
    r.append("")
    r.append("## Números")
    r.append("")
    r.append(f"- Questões importadas deste arquivo: **{len(questoes)}**")
    r.append(f"- Total do tema depois desta importação: **{len(todas)}**")
    r.append(f"- Gabaritos casados: **{len(questoes) - len(sem_gabarito)}**")
    r.append(f"- Questões anuladas: **{len([q for q in questoes if q.numero in chave.anuladas])}**")
    r.append(f"- Questões sem gabarito: **{len(sem_gabarito)}**")
    r.append(f"- Alternativas fora de 4 ou 5: **{len(alternativas_fora)}**")
    r.append(f"- Etiquetas de assunto lidas do PDF: **{com_etiqueta}** de {len(questoes)}")
    r.append(f"- Imagens extraídas: **{extraidas}** | figuras renderizadas: **{renderizadas}**")
    r.append(
        "- Créditos de figura movidos do enunciado para as referências: "
        f"**{sum(1 for q in questoes if q.fontes)}**"
    )
    r.append(f"- Citam figura sem imagem associada: **{len(figura_sem_imagem)}**")
    r.append(f"- Sem tipo de prova: **{len(sem_prova)}** | sem ano: **{len(sem_ano)}**")
    if cabecalhos_contexto:
        r.append(
            f"- Cabeçalhos de prova/ano reconhecidos: **{len(cabecalhos_contexto)}** "
            "(listados abaixo, para conferência)"
        )
    r.append(f"- Questões revisadas preservadas: **{preservadas}**")
    r.append(
        f"- Questões repetidas no tema: **{len(repetidas)}** grupos "
        f"({sum(len(g) for g in repetidas)} questões)"
    )
    r.append(f"- Repetidas com RESPOSTA DIVERGENTE: **{len(conflitos)}**")
    r.append("")

    if alertas:
        r.append("## Alertas")
        r.append("")
        for alerta in alertas:
            r.append(f"- {alerta}")
        r.append("")

    if etiquetas_desconhecidas:
        r.append("## Etiquetas do PDF fora da taxonomia")
        r.append("")
        r.append(
            "Estas etiquetas apareceram no PDF e não existem em `src/dados/taxonomia.json`. "
            "Elas **não** entraram nas questões. Acrescente-as à taxonomia e reimporte."
        )
        r.append("")
        for etiqueta, quantas in sorted(etiquetas_desconhecidas.items(), key=lambda x: -x[1]):
            r.append(f"- `{etiqueta}` — {quantas} questões")
        r.append("")

    if normalizacoes:
        r.append("## Etiquetas normalizadas")
        r.append("")
        r.append("Etiquetas cortadas na diagramação do PDF, casadas com a taxonomia:")
        r.append("")
        for item in sorted(normalizacoes):
            r.append(f"- {item}")
        r.append("")

    if conflitos:
        r.append("## Repetidas com resposta divergente — decidir")
        r.append("")
        r.append(
            "Mesmo enunciado, mas o gabarito aponta para respostas de conteúdo diferente. "
            "Uma das cópias está errada na fonte. Nenhuma foi alterada: as duas entraram no "
            "acervo como vieram."
        )
        r.append("")
        for grupo in conflitos[:20]:
            r.append(f"- {grupo[0]['enunciado'][:120]}")
            for questao in grupo:
                correta = next(
                    (a["texto"] for a in questao["alternativas"]
                     if a["letra"] == questao.get("gabarito")),
                    "(sem gabarito)",
                )
                origem = questao.get("origem", {})
                r.append(
                    f"    - `{questao['id']}` (nº {origem.get('numeroOriginal')} de "
                    f"{origem.get('arquivo')}, página {origem.get('pagina')}): "
                    f"**{questao.get('gabarito')}) {correta[:70]}**"
                )
        r.append("")

    if repetidas:
        r.append("## Questões repetidas")
        r.append("")
        r.append(
            "Mesmo enunciado em mais de um lugar do banco. Onde a resposta é a mesma, é só "
            "repetição — decida se quer manter as duas ou apagar uma no JSON do tema."
        )
        r.append("")
        for grupo in repetidas[:40]:
            ids = ", ".join(
                f"`{q['id']}` (nº {q.get('origem', {}).get('numeroOriginal')})" for q in grupo
            )
            r.append(f"- {ids}")
        r.append("")

    if cabecalhos_contexto:
        r.append("## Cabeçalhos de prova e ano reconhecidos")
        r.append("")
        r.append(
            "Cada um destes passa a valer para as questões seguintes até o próximo cabeçalho. "
            "Se algum não for um cabeçalho de prova de verdade, o ano vai estar errado nas "
            "questões abaixo dele."
        )
        r.append("")
        for item in cabecalhos_contexto[:40]:
            r.append(f"- {item}")
        r.append("")

    r.append("## Listas para conferência")
    r.append("")
    r.append(f"- Sem gabarito: {lista(sem_gabarito)}")
    r.append(f"- Alternativas fora do esperado: {lista(alternativas_fora)}")
    r.append(f"- Citam figura sem imagem: {lista(figura_sem_imagem)}")
    r.append(f"- Sem tipo de prova: {lista(sem_prova)}")
    r.append(f"- Sem ano: {lista(sem_ano)}")
    r.append("")

    r.append("## As 20 extrações de menor confiança")
    r.append("")
    if not piores:
        r.append("Nenhuma questão apresentou sinal de extração duvidosa.")
        r.append("")
    else:
        for questao in piores:
            r.append(
                f"### Questão {questao.numero} (página {questao.pagina + 1}, "
                f"confiança {max(0.0, questao.confianca):.2f})"
            )
            r.append("")
            r.append(f"- Avisos: {'; '.join(questao.avisos) or 'nenhum'}")
            r.append(f"- Trecho: `{questao.enunciado[:160]}`")
            r.append(
                f"- Alternativas: {', '.join(a['letra'] for a in questao.alternativas) or 'nenhuma'}"
            )
            r.append("")

    r.append("## Próximo passo")
    r.append("")
    r.append(
        'Confira no PDF original as questões listadas acima. Depois de conferir uma questão, '
        'marque `"revisado": true` no JSON do tema — a reimportação passa a preservá-la.'
    )
    r.append("")

    texto = "\n".join(r)
    if not argumentos.seco:
        DIR_RELATORIOS.mkdir(parents=True, exist_ok=True)
        (DIR_RELATORIOS / f"{argumentos.tema}-{argumentos.pdf.stem}.md").write_text(
            texto, encoding="utf-8"
        )
    print(texto)
    if not argumentos.seco:
        print(f"\nAcervo gravado em {caminho_tema}")
        print("Rode agora:  python3 scripts/gerar_indice.py && python3 scripts/validar_acervo.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
