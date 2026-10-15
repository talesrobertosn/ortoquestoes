#!/usr/bin/env python3
"""
Gera páginas públicas de conteúdo, uma por assunto, em public/questoes/.

Por que elas existem. O site é uma aplicação com roteamento por hash, e para o
buscador isso significa UMA URL só — a raiz. Todo o acervo fica atrás de
JavaScript e de um fragmento que o Google descarta. Estas páginas resolvem
isso do único jeito honesto: publicando conteúdo real, em HTML de verdade, com
endereço próprio. Cada página traz questões completas com o comentário
escrito, que é exatamente o que a pessoa procurava ao digitar "questão de
ortopedia sobre coalizão tarsal" — não uma lista de palavras-chave.

O que NÃO fazer aqui, e a razão. Página feita só para conter termos de busca é
doorway page, prática listada como spam pelo próprio Google: não ranqueia e
ainda derruba a confiança no domínio inteiro. Se um dia a tentação voltar, o
critério é este: a página tem de ser útil para quem a lê mesmo que nenhum
buscador existisse.
"""

from __future__ import annotations

import html
import json
import re
import shutil
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import (  # noqa: E402
    DIR_ACERVO,
    DIR_PUBLICO,
    DIR_TEMAS,
    carregar_taxonomia,
    ler_json,
)
from textos_seo import TEXTOS  # noqa: E402

SITE = "https://ortoquestoes.com.br/"
DIR_SAIDA = DIR_PUBLICO / "questoes"
DIR_COMENTARIOS = DIR_ACERVO / "comentarios"

# Quantas questões entram em cada página. Acima disso a página fica pesada para
# celular sem ganhar nada: o buscador já entendeu do que ela trata.
POR_PAGINA = 25

# Uma página pública por questão comentada, para o Google indexar e para quem
# chega pela busca ler a questão e o comentário sem conta. Com False, as
# páginas de assunto ficam só com os subtemas e o convite para criar a conta.
PAGINAS_DE_QUESTAO = True

ESTILO = """
:root {
  --fundo: #f1f3f2; --superficie: #fff; --superficie-2: #f7f9f8; --texto: #12181a; --texto-2: #5b686c;
  --traco: #dce2e0; --destaque: #14655e; --veu: #e6efee; --acerto: #1f7a4d; --acerto-veu: #e8f3ec;
  --ouro: #a87a1f; --ouro-veu: #f8efd9; color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --fundo: #0f1413; --superficie: #171e1d; --superficie-2: #1e2726; --texto: #e7ecea; --texto-2: #9aa8a4;
    --traco: #2a3432; --destaque: #4fb3a5; --veu: #17302e; --acerto: #5cc08a; --acerto-veu: #14291f;
    --ouro: #e0b862; --ouro-veu: #33291a; color-scheme: dark;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--fundo); color: var(--texto); font: 1.0625rem/1.65 system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
.envoltorio { max-width: 48rem; margin: 0 auto; padding: 1.5rem 1.1rem 4rem; }
a { color: var(--destaque); }
header.topo { background: var(--superficie); border-bottom: 1px solid var(--traco); }
header.topo .envoltorio { padding-block: 0.9rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
.marca { color: var(--texto); text-decoration: none; font-size: 1.1rem; }
.marca span { font-weight: 800; }
header.topo nav { margin-left: auto; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.45rem 1rem; font-size: 0.9375rem; }
@media (max-width: 30rem) { header.topo nav { width: 100%; justify-content: flex-start; } }
h1 { font-size: 1.7rem; line-height: 1.2; margin: 1.1rem 0 0.75rem; letter-spacing: -0.01em; }
h2 { font-size: 1.2rem; margin: 2.5rem 0 0.75rem; }
h3 { font-size: 1.05rem; margin: 1.5rem 0 0.5rem; }
h4 { font-size: 1rem; margin: 1rem 0 0.4rem; color: var(--destaque); }
.meta { font-size: 0.8125rem; color: var(--texto-2); }
.migalhas { margin-top: 0.5rem; }
.etiquetas { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 1rem; }
.etiquetas span { padding: 0.2rem 0.65rem; border-radius: 999px; background: var(--veu); color: var(--destaque); font-size: 0.8rem; font-weight: 600; }
.acao { display: inline-block; margin: 1rem 0; padding: 0.75rem 1.2rem; border-radius: 12px; background: var(--destaque); color: #fff; text-decoration: none; font-weight: 700; }
.questao { background: var(--superficie); border: 1px solid var(--traco); border-radius: 18px; padding: 1.25rem; margin: 0 0 1.25rem; }
.enunciado { font-size: 1.08rem; margin: 0 0 1rem; }
.questao ol[type="A"] { margin: 0 0 1rem; padding-left: 1.5rem; display: grid; gap: 0.4rem; }
.questao li.certa { color: var(--acerto); font-weight: 700; }
figure { margin: 0 0 1rem; }
figure img { max-width: 100%; height: auto; max-height: 26rem; border-radius: 10px; border: 1px solid var(--traco); }
figcaption { font-size: 0.85rem; color: var(--texto-2); }
.comentario { border-top: 1px solid var(--traco); padding-top: 1rem; display: grid; gap: 0.75rem; }
.conceito { padding: 1rem 1.1rem; border-radius: 14px; background: var(--veu); }
.alt { padding: 0.9rem 1rem; border-radius: 14px; border: 1px solid var(--traco); }
.alt.certa { background: var(--acerto-veu); border-color: transparent; }
.rotulo { margin: 0 0 0.5rem; font-weight: 800; font-size: 0.9rem; }
.conceito .rotulo { color: var(--destaque); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem; }
.conceito p, .alt p { margin: 0 0 0.6rem; }
.conceito ul, .alt ul, .conceito ol, .alt ol { margin: 0 0 0.7rem; padding-left: 1.2rem; }
mark { background: #f5df72; color: inherit; padding: 0 0.2em; border-radius: 0.2em; }
.nota { margin: 0.4rem 0 0.8rem; padding: 0.8rem 1rem; border-radius: 12px; background: var(--ouro-veu); border-left: 4px solid var(--ouro); }
.nota p { margin: 0; }
table { width: 100%; border-collapse: collapse; margin: 0.3rem 0 1rem; font-size: 0.92em; }
th, td { padding: 0.45rem 0.6rem; text-align: left; vertical-align: top; border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent); }
th { font-weight: 700; }
details.resposta { margin-top: 0.5rem; border-top: 1px solid var(--traco); padding-top: 0.75rem; }
details.resposta summary { cursor: pointer; font-weight: 700; color: var(--destaque); }
.gabarito { font-size: 1.05rem; }
.convite { margin-top: 1rem; padding: 1rem 1.1rem; border-radius: 14px; background: var(--superficie-2); border: 1px dashed var(--traco); }
.paginacao { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; margin: 1.5rem 0; font-weight: 600; }
.aviso { background: var(--veu); border-radius: 14px; padding: 0.9rem 1rem; margin: 1.5rem 0; }
ul.temas, ul.lista-questoes { list-style: none; padding: 0; margin: 0; }
ul.temas li, ul.lista-questoes li { border-bottom: 1px solid var(--traco); padding: 0.7rem 0; }
ul.lista-questoes a { text-decoration: none; }
ul.lista-questoes a:hover { text-decoration: underline; }
footer { border-top: 1px solid var(--traco); margin-top: 3rem; padding-top: 1rem; }
""".strip()


def esc(texto: str) -> str:
    return html.escape(texto or "", quote=False)


def _inline(texto: str) -> str:
    """Negrito (**x**) e destaque (==x==) sobre texto já escapado."""
    saida = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", esc(texto))
    return re.sub(r"==([^=]+)==", r"<mark>\1</mark>", saida)


def editorial(texto: str) -> str:
    """Mesmo formato do site (TextoEditorial.tsx): parágrafos, ### subtítulo,
    listas com "- " e "1. ", tabela com "| a | b |", nota com "> ", negrito e destaque. Sem HTML cru."""
    partes: list[str] = []
    for bloco in re.split(r"\n\s*\n", texto or ""):
        linhas = [l.strip() for l in bloco.split("\n") if l.strip()]
        grupo: list[str] = []
        tipo_atual = ""

        def fechar() -> None:
            nonlocal grupo, tipo_atual
            if not grupo:
                return
            if tipo_atual == "lista":
                partes.append("<ul>" + "".join(f"<li>{_inline(l[2:])}</li>" for l in grupo) + "</ul>")
            elif tipo_atual == "numerada":
                partes.append("<ol>" + "".join(f"<li>{_inline(re.sub(r'^[0-9]+[.][ ]', '', l))}</li>" for l in grupo) + "</ol>")
            elif tipo_atual == "tabela":
                linhas_t = [[c.strip() for c in l[1:-1].split("|")] for l in grupo if not re.match(r"^[|][\s:|-]+[|]$", l)]
                if linhas_t:
                    cab = "".join(f"<th>{_inline(c)}</th>" for c in linhas_t[0])
                    corpo = "".join("<tr>" + "".join(f"<td>{_inline(c)}</td>" for c in l) + "</tr>" for l in linhas_t[1:])
                    partes.append(f"<table><thead><tr>{cab}</tr></thead><tbody>{corpo}</tbody></table>")
            elif tipo_atual == "nota":
                partes.append('<aside class="nota">' + "".join(f"<p>{_inline(l[2:])}</p>" for l in grupo) + "</aside>")
            grupo, tipo_atual = [], ""

        for linha in linhas:
            if linha.startswith("- "):
                tipo = "lista"
            elif re.match(r"^[0-9]+[.][ ]", linha):
                tipo = "numerada"
            elif linha.startswith("> "):
                tipo = "nota"
            elif linha.startswith("|") and linha.endswith("|"):
                tipo = "tabela"
            elif linha.startswith("### "):
                fechar()
                partes.append(f"<h4>{_inline(linha[4:])}</h4>")
                continue
            else:
                fechar()
                partes.append(f"<p>{_inline(linha)}</p>")
                continue
            if tipo != tipo_atual:
                fechar()
                tipo_atual = tipo
            grupo.append(linha)
        fechar()
    return "\n".join(partes)


def texto_puro(texto: str) -> str:
    """Versão sem marcação, para meta description e dados estruturados."""
    t = re.sub(r"^(### |- |> |[0-9]+[.] )", "", texto or "", flags=re.M)
    t = t.replace("**", "").replace("==", "").replace("|", " ")
    return " ".join(t.split())


def resumir(texto: str, limite: int) -> str:
    texto = " ".join((texto or "").split())
    if len(texto) <= limite:
        return texto
    return texto[: limite - 1].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def topo(titulo: str, descricao: str, caminho: str, extra: str = "", raiz: str = "../") -> str:
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(titulo)}</title>
<meta name="description" content="{html.escape(descricao, quote=True)}">
<link rel="canonical" href="{SITE}{caminho}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Orto Questões">
<meta property="og:title" content="{html.escape(titulo, quote=True)}">
<meta property="og:description" content="{html.escape(descricao, quote=True)}">
<meta property="og:url" content="{SITE}{caminho}">
<meta property="og:image" content="{SITE}previa-orto-questoes-coluna.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Orto Questões: questões de ortopedia comentadas para TEOT, TARO e R4">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#14655e">
<link rel="icon" href="{raiz}favicon.svg?v=3" type="image/svg+xml">
<link rel="icon" href="{raiz}favicon-32.png?v=3" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="{raiz}apple-touch-icon.png?v=3" sizes="180x180">
<link rel="manifest" href="{raiz}manifest.webmanifest">
<style>{ESTILO}</style>
{extra}
</head>
<body>
<header class="topo"><div class="envoltorio">
  <a class="marca" href="{raiz}"><span>Orto</span> Questões</a>
  <nav>
    <a href="{raiz}questoes/">Assuntos</a>
    <a href="{raiz}teot/">TEOT</a>
    <a href="{raiz}curso-preparatorio-teot/">Curso preparatório</a>
    <a href="{raiz}guias/">Guias de estudo</a>
    <a href="{raiz}#/treinar">Treinar</a>
    <a href="{raiz}sobre/">Sobre</a>
  </nav>
</div></header>
<main class="envoltorio">"""


def rodape(raiz: str = "../") -> str:
    return f"""</main>
<footer class="envoltorio">
  <p class="meta">
    <strong>Orto Questões</strong> (OrtoQuestões): banco de questões para TEOT, TARO, cirurgia da mão,
    R4 ENARE, quadril e coluna. As questões são transcritas das provas originais e o gabarito é o da própria banca;
    as marcadas como OrtoQuestões Simulados são questões autorais do site, elaboradas a partir da
    bibliografia de referência e inspiradas no padrão da prova indicada, sem caráter oficial nem
    vínculo com as instituições organizadoras.
    Os comentários se baseiam na bibliografia de referência da especialidade.
    <a href="{raiz}#/contato">Encontrou um erro?</a>
    · <a href="{raiz}guias/">Guias de estudo</a>
    · <a href="{raiz}banco-de-questoes-ortopedia/">Banco de questões de ortopedia</a>
    · <a href="{raiz}teot/">TEOT</a>
    · <a href="{raiz}questoes-teot-taro/">Provas do TEOT e do TARO</a>
    · <a href="{raiz}simulado-teot/">Simulados</a>
    · <a href="{raiz}curso-ortopedia-r1/">Estudo no R1</a>
    · <a href="{raiz}flashcards-ortopedia/">Flashcards</a>
    · <a href="{raiz}curso-preparatorio-teot/">Curso preparatório para o TEOT</a>
    · <a href="{raiz}guias/temas-que-mais-caem-no-teot.html">Temas que mais caem</a>
    · <a href="{raiz}sobre/">Sobre o Orto Questões</a>
    · <a href="https://www.instagram.com/ortoquestoes/">@ortoquestoes</a>
  </p>
</footer>
</body>
</html>
"""


def nota_simulado(questao: dict) -> str:
    """Aviso das questões com a etiqueta OrtoQuestões Simulados (vazio nas demais)."""
    if not questao.get("simulado"):
        return ""
    prova = f" {esc(questao['prova'])}" if questao.get("prova") else ""
    return (
        '<p class="meta"><strong>OrtoQuestões Simulados</strong>: questão autoral do site, elaborada a '
        f"partir da bibliografia de referência e inspirada no padrão da prova{prova}. Não é questão "
        "oficial da prova nem foi elaborada, revisada ou endossada pela instituição organizadora.</p>"
    )


def origem_da_questao(questao: dict) -> str:
    """Prova e ano; nos simulados, deixa claro que é no padrão da prova."""
    origem = " ".join(filter(None, [questao.get("prova"), str(questao.get("ano") or "")])).strip()
    if questao.get("simulado"):
        return f"OrtoQuestões Simulados, padrão {origem}" if origem else "OrtoQuestões Simulados"
    return origem


def montar_questao(questao: dict, comentario: dict, raiz: str = "../") -> str:
    """Versão completa, usada nas páginas por assunto (vitrine)."""
    gabarito = questao.get("gabarito")
    textos = {a["letra"]: a["texto"] for a in questao.get("alternativas") or []}
    partes = ['<article class="questao">']
    if questao.get("simulado"):
        partes.append(nota_simulado(questao))
    partes.append(f'<p class="enunciado">{esc(questao["enunciado"])}</p>')
    partes.append('<ol type="A">')
    for alternativa in questao.get("alternativas") or []:
        certa = ' class="certa"' if alternativa["letra"] == gabarito else ""
        partes.append(f"<li{certa}>{esc(alternativa['texto'])}</li>")
    partes.append("</ol>")
    partes.append('<div class="comentario">')
    partes.append(f'<p class="meta">Gabarito: <strong>{esc(gabarito or "–")}</strong></p>')
    if comentario.get("conceito"):
        partes.append('<div class="conceito"><p class="rotulo">Conceito-chave</p>' + editorial(comentario["conceito"]) + "</div>")
    if comentario.get("correta"):
        partes.append(f'<div class="alt certa"><p class="rotulo">{esc(gabarito or "")} · {esc(textos.get(gabarito or "", "correta"))}</p>{editorial(comentario["correta"])}</div>')
    for letra, texto in sorted((comentario.get("incorretas") or {}).items()):
        partes.append(f'<div class="alt"><p class="rotulo">{esc(letra)} · {esc(textos.get(letra, ""))}</p>{editorial(texto)}</div>')
    partes.append("</div>")
    partes.append(f'<p class="meta"><a href="{raiz}questoes/{questao["tema_slug"]}/{esc(questao["id"])}.html">Página desta questão</a> · <a href="{raiz}#/questao/{esc(questao["id"])}">Responder no site</a></p>')
    partes.append("</article>")
    return "\n".join(partes)


_DIMENSOES: dict[str, str] = {}


def dimensoes(arquivo: str) -> str:
    """width/height da figura, para o navegador reservar o espaço antes de baixar
    (sem isso o texto pula quando a imagem chega). Sem Pillow, fica sem."""
    if arquivo not in _DIMENSOES:
        try:
            from PIL import Image  # type: ignore

            with Image.open(DIR_PUBLICO / "imagens" / arquivo) as imagem:
                largura, altura = imagem.size
            _DIMENSOES[arquivo] = f' width="{largura}" height="{altura}"'
        except Exception:  # noqa: BLE001 — sem Pillow ou arquivo ausente: segue sem as medidas
            _DIMENSOES[arquivo] = ""
    return _DIMENSOES[arquivo]


def figuras(questao: dict, raiz: str) -> str:
    saida = []
    for imagem in questao.get("imagens") or []:
        legenda = imagem.get("legenda") or f"Figura da questão {questao['id']}"
        saida.append(
            f'<figure><img src="{raiz}imagens/{esc(imagem["arquivo"])}" alt="{html.escape(legenda, quote=True)}"{dimensoes(imagem["arquivo"])} loading="lazy" decoding="async">'
            + (f"<figcaption>{esc(imagem['legenda'])}</figcaption>" if imagem.get("legenda") else "")
            + "</figure>"
        )
    return "\n".join(saida)


SUFIXO_TITULO = " | Orto Questões"


def rotulo_curto(questao: dict) -> str:
    """Origem em poucas palavras, para o título: "TEOT 2024", "simulado padrão TARO"."""
    if questao.get("simulado"):
        return f"simulado padrão {questao['prova']}" if questao.get("prova") else "simulado"
    return " ".join(filter(None, [questao.get("prova"), str(questao.get("ano") or "")])).strip()


def titulo_questao(questao: dict, tema: dict, nivel: int = 0) -> str:
    """Título com o assunto e a origem ("TEOT 2024" é o que muita gente digita).

    Nível 0: curto, porque o Google mostra uns 60 caracteres. Se dois títulos
    coincidirem, o nível 1 mostra mais do enunciado e o nível 2 acrescenta o
    identificador: título repetido divide o clique e confunde o buscador sobre
    qual página mostrar."""
    subtema = (questao.get("subtemas") or [tema["nome"]])[0]
    rotulo = rotulo_curto(questao)
    marca = f" · {questao['id']}" if nivel >= 2 else ""
    cabeca = f"{subtema} ({rotulo})" if rotulo else subtema
    limite = 62 if nivel == 0 else 100
    return resumir(f"{cabeca}: {questao['enunciado']}", limite - len(marca)) + marca + SUFIXO_TITULO


def descricao_questao(questao: dict, tema: dict, desempate: bool = False) -> str:
    """Descrição com a origem e o começo do enunciado; o id só desempata."""
    origem = origem_da_questao(questao)
    fim = f" Questão {questao['id']}." if desempate else ""
    return resumir(
        f"Questão de {tema['nome'].lower()}{' (' + origem + ')' if origem else ''} com gabarito e conceito-chave: {questao['enunciado']}",
        158 - len(fim),
    ) + fim


def pagina_questao(questao: dict, comentario: dict, tema: dict, anterior: dict | None, proxima: dict | None,
                   nivel_titulo: int = 0, desempatar_descricao: bool = False) -> str:
    """Uma página por questão: enunciado, alternativas, gabarito e conceito-chave.
    A explicação alternativa por alternativa fica no site, a um clique."""
    raiz = "../../"
    slug = tema["slug"]
    subtema = (questao.get("subtemas") or [tema["nome"]])[0]
    origem = origem_da_questao(questao)
    titulo = titulo_questao(questao, tema, nivel_titulo)
    descricao = descricao_questao(questao, tema, desempatar_descricao)
    caminho = f"questoes/{slug}/{questao['id']}.html"
    gabarito = questao.get("gabarito")
    textos = {a["letra"]: a["texto"] for a in questao.get("alternativas") or []}
    rotulo = rotulo_curto(questao)
    migalhas = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Orto Questões", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": "Questões por assunto", "item": f"{SITE}questoes/"},
            {"@type": "ListItem", "position": 3, "name": tema["nome"], "item": f"{SITE}questoes/{slug}.html"},
            {"@type": "ListItem", "position": 4, "name": resumir(subtema + (f" ({rotulo})" if rotulo else ""), 70),
             "item": f"{SITE}{caminho}"},
        ],
    }
    extra = '<script type="application/ld+json">' + json.dumps(migalhas, ensure_ascii=False) + "</script>"
    corpo = [topo(titulo, descricao, caminho, extra, raiz)]
    corpo.append(
        f'<nav class="migalhas meta"><a href="{raiz}">Orto Questões</a> › <a href="{raiz}questoes/">Assuntos</a> › '
        f'<a href="{raiz}questoes/{slug}.html">{esc(tema["nome"])}</a> › {esc(subtema)}</nav>'
    )
    nome_h1 = subtema.lower() if subtema.isupper() else subtema
    corpo.append(f"<h1>Questão de {esc(nome_h1)}{' (' + esc(origem) + ')' if origem else ''}</h1>")
    rotulos = [tema["nome"], subtema] + ([origem] if origem else [])
    corpo.append('<p class="etiquetas">' + "".join(f"<span>{esc(r)}</span>" for r in dict.fromkeys(rotulos)) + "</p>")
    corpo.append('<article class="questao">')
    if questao.get("simulado"):
        corpo.append(nota_simulado(questao))
    corpo.append(f'<p class="enunciado">{esc(questao["enunciado"])}</p>')
    corpo.append(figuras(questao, raiz))
    corpo.append('<ol type="A">')
    for alternativa in questao.get("alternativas") or []:
        corpo.append(f"<li>{esc(alternativa['texto'])}</li>")
    corpo.append("</ol>")
    corpo.append(
        f'<a class="acao" href="{raiz}#/questao/{esc(questao["id"])}">Responder no Orto Questões</a>'
    )
    corpo.append("<details class=\"resposta\"><summary>Ver gabarito e conceito-chave</summary>")
    corpo.append(f'<p class="gabarito">Gabarito: <strong>{esc(gabarito or "–")}</strong>{" · " + esc(textos.get(gabarito or "", "")) if gabarito else ""}</p>')
    if comentario.get("conceito"):
        corpo.append('<div class="conceito"><p class="rotulo">Conceito-chave</p>' + editorial(comentario["conceito"]) + "</div>")
    corpo.append(
        '<div class="convite"><p><strong>Por que cada alternativa está certa ou errada?</strong> '
        "O comentário completo, alternativa por alternativa, está no site, junto com revisão "
        "espaçada e desempenho por tema.</p>"
        f'<a class="acao" href="{raiz}#/questao/{esc(questao["id"])}">Ver o comentário completo</a></div>'
    )
    corpo.append("</details>")
    corpo.append("</article>")
    navegacao = []
    if anterior:
        navegacao.append(f'<a href="./{esc(anterior["id"])}.html">‹ Questão anterior</a>')
    navegacao.append(f'<a href="{raiz}questoes/{slug}.html">Todas de {esc(tema["nome"].lower())}</a>')
    if proxima:
        navegacao.append(f'<a href="./{esc(proxima["id"])}.html">Próxima questão ›</a>')
    corpo.append('<nav class="paginacao">' + "".join(navegacao) + "</nav>")
    corpo.append(rodape(raiz))
    return "\n".join(corpo)


def ld(bloco: dict) -> str:
    return '<script type="application/ld+json">' + json.dumps(bloco, ensure_ascii=False) + "</script>"


def migalhas_ld(*itens: tuple[str, str]) -> dict:
    """BreadcrumbList a partir de (nome, caminho relativo ao site)."""
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i, "name": nome, "item": f"{SITE}{caminho}"}
            for i, (nome, caminho) in enumerate((("Orto Questões", ""),) + itens, start=1)
        ],
    }


def dados_estruturados(tema: dict, titulo: str, resumo: str, itens: list[tuple[dict, dict]]) -> str:
    """Página de assunto: CollectionPage com a lista das questões em destaque.

    Antes era FAQPage com o enunciado como pergunta. Questão de prova não é
    pergunta frequente escrita pelo site (é o que a regra do Google pede para
    FAQPage), e desde 2023 o resultado com FAQ só aparece para sites de governo
    e de saúde: a marcação não ajudava e podia ser lida como abuso."""
    caminho = f"questoes/{tema['slug']}.html"
    colecao = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": f"{SITE}{caminho}#pagina",
        "url": f"{SITE}{caminho}",
        "name": titulo,
        "description": resumo,
        "inLanguage": "pt-BR",
        "isPartOf": {"@type": "WebSite", "@id": f"{SITE}#website", "name": "Orto Questões", "url": SITE},
        "about": tema["nome"],
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": len(itens),
            "itemListElement": [
                {"@type": "ListItem", "position": i, "url": f"{SITE}questoes/{tema['slug']}/{q['id']}.html",
                 "name": resumir(q["enunciado"], 110)}
                for i, (q, _) in enumerate(itens, start=1)
            ],
        },
    }
    return ld(colecao) + "\n" + ld(migalhas_ld(("Questões por assunto", "questoes/"), (tema["nome"], caminho)))


def principal() -> int:
    taxonomia = carregar_taxonomia()
    DIR_SAIDA.mkdir(parents=True, exist_ok=True)

    gerados: list[tuple[str, str, int, int]] = []
    total_paginas = 0

    # 1º passo: o que vira página. Uma por questão comentada; fica de fora só o
    # que não se sustenta fora do site: anulada e figura ainda não recuperada.
    preparados = []
    for tema in taxonomia["temas"]:
        dados = ler_json(DIR_TEMAS / f"{tema['slug']}.json", None)
        comentarios = ler_json(DIR_COMENTARIOS / f"{tema['slug']}.json", {}) or {}
        if not dados or not comentarios:
            continue
        publicaveis = [
            dict(q, tema_slug=tema["slug"])
            for q in dados["questoes"]
            if q["id"] in comentarios and not q.get("anulada") and not q.get("figuraPendente")
            # cópia de outra questão: uma página só, a da questão mantida
            and not q.get("duplicataDe")
        ]
        preparados.append((tema, dados, comentarios, publicaveis))

    # Títulos e descrições únicos em todo o acervo (ver titulo_questao).
    todas = [(q, tema) for tema, _, _, publicaveis in preparados for q in publicaveis]
    nivel: dict[str, int] = {q["id"]: 0 for q, _ in todas}
    for _ in range(2):
        contagem = Counter(titulo_questao(q, t, nivel[q["id"]]) for q, t in todas)
        for q, t in todas:
            if contagem[titulo_questao(q, t, nivel[q["id"]])] > 1:
                nivel[q["id"]] += 1
    contagem = Counter(descricao_questao(q, t) for q, t in todas)
    desempatar = {q["id"] for q, t in todas if contagem[descricao_questao(q, t)] > 1}

    for tema, dados, comentarios, publicaveis in preparados:
        slug = tema["slug"]
        titulo_pagina, resumo, abertura = TEXTOS.get(slug, (
            f"Questões de {tema['nome'].lower()}",
            f"Questões de prova de {tema['nome'].lower()}, comentadas alternativa por alternativa.",
            f"Questões de provas anteriores de {tema['nome'].lower()}, com gabarito e comentário.",
        ))
        pasta = DIR_SAIDA / slug
        if pasta.exists():
            shutil.rmtree(pasta)
        pasta.mkdir(parents=True)
        for i, questao in enumerate(publicaveis if PAGINAS_DE_QUESTAO else []):
            anterior = publicaveis[i - 1] if i > 0 else None
            proxima = publicaveis[i + 1] if i + 1 < len(publicaveis) else None
            (pasta / f"{questao['id']}.html").write_text(
                pagina_questao(questao, comentarios[questao["id"]], tema, anterior, proxima,
                               nivel[questao["id"]], questao["id"] in desempatar), encoding="utf-8"
            )
        if PAGINAS_DE_QUESTAO:
            total_paginas += len(publicaveis)

        # Vitrine: as primeiras questões completas, sem figura, na página do assunto.
        vitrine = [q for q in publicaveis if not q.get("imagens")][:POR_PAGINA] if PAGINAS_DE_QUESTAO else []
        itens = [(q, comentarios[q["id"]]) for q in vitrine]
        titulo = f"{titulo_pagina} comentadas | Orto Questões"
        caminho = f"questoes/{slug}.html"

        corpo = [topo(titulo, resumo, caminho, dados_estruturados(tema, titulo, resumo, itens))]
        corpo.append(f'<nav class="migalhas meta"><a href="../">Orto Questões</a> › <a href="./">Assuntos</a> › {esc(tema["nome"])}</nav>')
        corpo.append(f"<h1>{esc(titulo_pagina)} comentadas</h1>")
        corpo.append(f"<p>{esc(abertura)}</p>")
        if PAGINAS_DE_QUESTAO:
            corpo.append(
                f'<p>O acervo tem <strong>{sum(1 for q in dados["questoes"] if not q.get("duplicataDe"))}</strong> questões de '
                f"{esc(tema['nome']).lower()}, e <strong>{len(publicaveis)}</strong> têm página própria "
                "com gabarito e conceito-chave. Abaixo, "
                f"{len(vitrine)} delas com o comentário completo e, no fim, a lista de todas.</p>"
            )
            corpo.append(
                f'<a class="acao" href="../#/treinar?temas={slug}">'
                f"Treinar {esc(tema['nome']).lower()} no site</a>"
            )
        else:
            corpo.append(
                "<p>As questões, com o gabarito da banca e o comentário de cada alternativa, "
                "ficam no site, para quem tem conta. Criar a conta é grátis e leva menos de um minuto.</p>"
            )
            corpo.append(
                f'<a class="acao" href="../#/entrar?modo=criar&amp;voltar=/treinar?temas={slug}">'
                f"Criar conta grátis e treinar {esc(tema['nome']).lower()}</a>"
            )
        corpo.append(
            '<div class="aviso"><p style="margin:0">As questões são transcritas das provas '
            "originais, sem reescrita, e o gabarito é o da própria banca. Os comentários se baseiam "
            "na bibliografia de referência da especialidade. Quando resta dúvida sobre o gabarito, "
            "o comentário registra a "
            "dúvida em vez de escondê-la."
            + (
                " As questões marcadas como <strong>OrtoQuestões Simulados</strong> são autorais do site, "
                "elaboradas a partir da bibliografia de referência e inspiradas no padrão da prova indicada; "
                "não são questões oficiais nem têm vínculo com as instituições organizadoras."
                if any(q.get("simulado") for q in publicaveis)
                else ""
            )
            + "</p></div>"
        )
        por_subtema: dict[str, list[dict]] = {}
        for questao in publicaveis:
            por_subtema.setdefault((questao.get("subtemas") or ["Outros"])[0], []).append(questao)
        if PAGINAS_DE_QUESTAO:
            corpo.append(f"<h2>{len(vitrine)} questões comentadas</h2>")
            for questao, comentario in itens:
                corpo.append(montar_questao(questao, comentario))
            corpo.append(f"<h2>Todas as questões de {esc(tema['nome'].lower())}</h2>")
            for subtema in sorted(por_subtema, key=lambda s: s.lower()):
                corpo.append(f"<h3>{esc(subtema)} <span class=\"meta\">· {len(por_subtema[subtema])}</span></h3>")
                corpo.append('<ul class="lista-questoes">')
                for questao in por_subtema[subtema]:
                    corpo.append(
                        f'<li><a href="./{slug}/{esc(questao["id"])}.html">{esc(resumir(questao["enunciado"], 140))}</a></li>'
                    )
                corpo.append("</ul>")
        else:
            corpo.append(f"<h2>Assuntos de {esc(tema['nome'].lower())} no acervo</h2>")
            corpo.append('<ul class="lista-questoes">')
            for subtema in sorted(por_subtema, key=lambda s: s.lower()):
                corpo.append(f"<li>{esc(subtema)}</li>")
            corpo.append("</ul>")
        corpo.append("<h2>Outros assuntos</h2>")
        corpo.append('<p><a href="./">Todos os assuntos do acervo</a></p>')
        corpo.append(rodape())

        (DIR_SAIDA / f"{slug}.html").write_text("\n".join(corpo), encoding="utf-8")
        gerados.append((slug, tema["nome"], len(publicaveis), len(dados["questoes"])))

    # Índice das páginas por assunto.
    titulo = "Questões de ortopedia comentadas por assunto | Orto Questões"
    resumo = (
        "Questões de ortopedia e traumatologia por assunto: provas anteriores de TEOT, TARO e ENARE R4 "
        "com gabarito da banca e conceito-chave, no Orto Questões (OrtoQuestões)."
    )
    lista_temas = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": f"{SITE}questoes/#pagina",
        "url": f"{SITE}questoes/",
        "name": titulo,
        "description": resumo,
        "inLanguage": "pt-BR",
        "isPartOf": {"@type": "WebSite", "@id": f"{SITE}#website", "name": "Orto Questões", "url": SITE},
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": len(gerados),
            "itemListElement": [
                {"@type": "ListItem", "position": i, "url": f"{SITE}questoes/{slug}.html", "name": nome}
                for i, (slug, nome, _, _) in enumerate(gerados, start=1)
            ],
        },
    }
    corpo = [topo(titulo, resumo, "questoes/", ld(lista_temas) + "\n" + ld(migalhas_ld(("Questões por assunto", "questoes/"))))]
    corpo.append('<nav class="migalhas meta"><a href="../">Orto Questões</a> › Assuntos</nav>')
    corpo.append("<h1>Questões de ortopedia comentadas, por assunto</h1>")
    corpo.append(
        "<p>O Orto Questões (também escrito OrtoQuestões) reúne questões de provas anteriores de ortopedia e traumatologia "
        "(TEOT, TARO, R4 do ENARE e outras), organizadas por assunto. Cada questão traz o "
        "enunciado original, o gabarito da banca e um comentário que explica o conceito e "
        "percorre as alternativas. No site dá para treinar com filtros, revisar no momento "
        "certo e acompanhar o desempenho. Para conhecer as provas do acervo e como o treino funciona, veja a página do "
        '<a href="../banco-de-questoes-ortopedia/">banco de questões de ortopedia</a>.</p>'
    )
    corpo.append(
        '<a class="acao" href="../#/treinar">Começar a treinar</a>' if PAGINAS_DE_QUESTAO
        else '<a class="acao" href="../#/entrar?modo=criar&amp;voltar=/treinar">Criar conta grátis e começar a treinar</a>'
    )
    corpo.append("<h2>Assuntos</h2>")
    corpo.append('<ul class="temas">')
    for slug, nome, publicadas, total in gerados:
        _, resumo_tema, _ = TEXTOS.get(slug, ("", "", ""))
        corpo.append(
            f'<li><a href="./{slug}.html"><strong>{esc(nome)}</strong></a>'
            f'<br><span class="meta">{esc(resumo_tema)} '
            + (f"{total} questões no acervo, {publicadas} com página própria." if PAGINAS_DE_QUESTAO else "")
            + "</span></li>"
        )
    corpo.append("</ul>")
    corpo.append(rodape())
    (DIR_SAIDA / "index.html").write_text("\n".join(corpo), encoding="utf-8")

    print(f"{len(gerados) + 1} páginas de assunto e {total_paginas} páginas de questão em public/questoes/")
    for slug, nome, publicadas, total in gerados:
        print(f"  {slug:<18} {publicadas:>4} páginas de {total} questões")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
