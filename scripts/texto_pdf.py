"""
Extração de texto a partir dos identificadores de glifo.

Muitos PDFs de prova são gerados com fontes Type0/Identity-H sem um ToUnicode
utilizável. Nesses arquivos o extrator de texto comum devolve lixo: o enunciado
sai embaralhado, sem espaços, e — pior — o PyMuPDF substitui os glifos que não
consegue mapear por espaço ou por U+FFFD, o que é uma perda silenciosa.

A saída correta é ler os identificadores de glifo verdadeiros com
`get_texttrace()` e traduzi-los pelo cmap da fonte embutida no próprio PDF.
Funciona para qualquer fonte embutida, não só para a deste arquivo.

O agrupamento é visual: pedaços na mesma altura viram uma linha, e dentro da
linha os pedaços separados por um vão grande viram blocos distintos. É isso que
permite reconhecer um cabeçalho "Questão 288 | Tema | Etiqueta | Etiqueta",
que no fluxo do PDF são quatro operações de texto sem relação nenhuma.
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field

try:
    import pymupdf
except ImportError:  # pragma: no cover
    import fitz as pymupdf  # type: ignore

SUBSTITUICAO = 0xFFFD


@dataclass
class Bloco:
    x0: float
    x1: float
    texto: str


@dataclass
class LinhaVisual:
    pagina: int
    y0: float
    y1: float
    blocos: list[Bloco] = field(default_factory=list)

    @property
    def texto(self) -> str:
        partes: list[str] = []
        for i, bloco in enumerate(self.blocos):
            if i and not partes[-1].endswith(" "):
                partes.append(" ")
            partes.append(bloco.texto)
        return "".join(partes).strip()

    @property
    def primeiro(self) -> str:
        return self.blocos[0].texto.strip() if self.blocos else ""

    @property
    def x0(self) -> float:
        return self.blocos[0].x0 if self.blocos else 0.0


def _sem_prefixo(nome: str) -> str:
    return nome.split("+", 1)[-1]


def construir_mapas_de_glifo(documento) -> dict[str, dict[int, str]]:
    """Mapa glifo → caractere, por fonte embutida com cmap legível."""
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        return {}

    mapas: dict[str, dict[int, str]] = {}
    vistos: set[int] = set()
    for numero in range(len(documento)):
        for fonte in documento[numero].get_fonts(full=True):
            xref, nome = fonte[0], fonte[3]
            curto = _sem_prefixo(nome)
            if xref in vistos or curto in mapas:
                continue
            vistos.add(xref)
            try:
                buffer = documento.extract_font(xref)[3]
                if not buffer:
                    continue
                tipografia = TTFont(io.BytesIO(buffer), fontNumber=0, lazy=True)
                ordem = tipografia.getGlyphOrder()
                cmap = tipografia.getBestCmap()
            except Exception:
                continue
            if not cmap or not ordem:
                continue
            gid_por_glifo = {glifo: i for i, glifo in enumerate(ordem)}
            mapa: dict[int, str] = {}
            for codigo, glifo in sorted(cmap.items()):
                gid = gid_por_glifo.get(glifo)
                if gid is not None and gid not in mapa:
                    mapa[gid] = chr(codigo)
            if mapa:
                mapas[curto] = mapa
    return mapas


def precisa_de_glifos(documento, amostra: int = 5) -> bool:
    """
    Detecta a assinatura de codificação quebrada: caracteres de controle ou
    o caractere de substituição no texto extraído pela via comum.
    """
    for numero in range(min(len(documento), amostra)):
        texto = documento[numero].get_text("text")
        if any(ord(c) < 0x20 and c not in "\t\n\r" for c in texto):
            return True
        if chr(SUBSTITUICAO) in texto:
            return True
    return False


def _texto_do_item(item: dict, mapa: dict[int, str] | None) -> tuple[str, float, float]:
    chars = item.get("chars") or ()
    if not chars:
        return "", 0.0, 0.0
    largura_espaco = item.get("spacewidth") or (item.get("size", 10) * 0.25)
    partes: list[str] = []
    anterior_x1: float | None = None
    for unicode_reportado, gid, _origem, caixa in chars:
        if anterior_x1 is not None and caixa[0] - anterior_x1 > largura_espaco * 0.85:
            if not partes or not partes[-1].endswith(" "):
                partes.append(" ")
        if mapa is not None and gid in mapa:
            partes.append(mapa[gid])
        elif unicode_reportado and unicode_reportado != SUBSTITUICAO:
            partes.append(chr(unicode_reportado))
        anterior_x1 = caixa[2]
    caixa_item = item["bbox"]
    return "".join(partes), caixa_item[0], caixa_item[2]


def extrair_linhas_visuais(
    documento,
    mapas: dict[str, dict[int, str]] | None = None,
    colunas: int = 1,
) -> list[LinhaVisual]:
    if mapas is None:
        mapas = construir_mapas_de_glifo(documento)

    linhas: list[LinhaVisual] = []
    for numero in range(len(documento)):
        pagina = documento[numero]
        itens: list[tuple[float, float, float, float, str, float]] = []
        for item in pagina.get_texttrace():
            if item.get("type") != 0:
                continue
            texto, x0, x1 = _texto_do_item(item, mapas.get(item.get("font", "")))
            if not texto.strip():
                continue
            caixa = item["bbox"]
            largura_espaco = item.get("spacewidth") or (item.get("size", 10) * 0.25)
            itens.append((caixa[1], x0, x1, caixa[3], texto, largura_espaco))

        if not itens:
            continue

        alturas = [y1 - y0 for y0, _, _, y1, _, _ in itens]
        tolerancia = max(2.0, (sum(alturas) / len(alturas)) * 0.5)

        def agrupar(subconjunto):
            for y0, x0, x1, y1, texto, largura_espaco in sorted(subconjunto):
                if linhas and linhas[-1].pagina == numero and abs(linhas[-1].y0 - y0) <= tolerancia:
                    linhas[-1].blocos.append(Bloco(x0, x1, texto))
                    linhas[-1].y1 = max(linhas[-1].y1, y1)
                else:
                    linhas.append(LinhaVisual(numero, y0, y1, [Bloco(x0, x1, texto)]))
                    linhas[-1].largura_espaco = largura_espaco  # type: ignore[attr-defined]

        if colunas == 2:
            meio = pagina.rect.width / 2
            agrupar([i for i in itens if i[1] < meio])
            agrupar([i for i in itens if i[1] >= meio])
        else:
            agrupar(itens)

    # Dentro de cada linha, junta pedaços colados e mantém separados os que têm
    # um vão largo entre si — são rótulos distintos, não continuação de frase.
    for linha in linhas:
        linha.blocos.sort(key=lambda b: b.x0)
        largura_espaco = getattr(linha, "largura_espaco", 3.5)
        limiar = max(6.0, largura_espaco * 3.0)
        fundidos: list[Bloco] = []
        for bloco in linha.blocos:
            if fundidos and bloco.x0 - fundidos[-1].x1 <= limiar:
                juncao = "" if bloco.x0 - fundidos[-1].x1 < largura_espaco * 0.85 else " "
                fundidos[-1] = Bloco(
                    fundidos[-1].x0, bloco.x1, fundidos[-1].texto + juncao + bloco.texto
                )
            else:
                fundidos.append(bloco)
        linha.blocos = fundidos

    return linhas
