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
import sys
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

ESTILO = """
:root {
  --fundo: #f1f3f2; --superficie: #fff; --texto: #12181a; --texto-2: #5b686c;
  --traco: #dce2e0; --destaque: #14655e; --veu: #e6efee; --acerto: #1f7a4d;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --fundo: #0f1413; --superficie: #171e1d; --texto: #e7ecea; --texto-2: #9aa8a4;
    --traco: #2a3432; --destaque: #4fb3a5; --veu: #16302c; --acerto: #5cc08a;
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--fundo); color: var(--texto);
  font: 1.0625rem/1.6 system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
}
.envoltorio { max-width: 46rem; margin: 0 auto; padding: 1.5rem 1.25rem 4rem; }
a { color: var(--destaque); }
header.topo { border-bottom: 1px solid var(--traco); }
header.topo .envoltorio { padding-block: 0.9rem; display: flex; gap: 1rem; align-items: baseline; flex-wrap: wrap; }
header.topo strong { font-size: 1.05rem; }
header.topo nav { margin-left: auto; display: flex; gap: 1rem; font-size: 0.9375rem; }
h1 { font-size: 1.6rem; line-height: 1.25; margin: 1.5rem 0 0.75rem; }
h2 { font-size: 1.15rem; margin: 2.5rem 0 0.5rem; }
h3 { font-size: 1rem; margin: 0 0 0.6rem; }
.resumo { color: var(--texto-2); }
.acao {
  display: inline-block; margin: 1.25rem 0; padding: 0.7rem 1.1rem; border-radius: 6px;
  background: var(--destaque); color: #fff; text-decoration: none; font-weight: 600;
}
.questao {
  background: var(--superficie); border: 1px solid var(--traco); border-radius: 6px;
  padding: 1.1rem; margin: 0 0 1.1rem;
}
.questao ol { margin: 0 0 0.9rem; padding-left: 1.4rem; }
.questao li { margin-bottom: 0.3rem; }
.questao li.certa { color: var(--acerto); font-weight: 600; }
.comentario { border-top: 1px solid var(--traco); padding-top: 0.9rem; }
.comentario p { margin: 0 0 0.7rem; }
.comentario dl { margin: 0; }
.comentario dt { font-weight: 600; margin-top: 0.6rem; }
.comentario dd { margin: 0.15rem 0 0; }
.meta { font-size: 0.8125rem; color: var(--texto-2); }
.aviso { background: var(--veu); border-radius: 6px; padding: 0.9rem 1rem; margin: 1.5rem 0; }
ul.temas { list-style: none; padding: 0; }
ul.temas li { border-bottom: 1px solid var(--traco); padding: 0.8rem 0; }
footer { border-top: 1px solid var(--traco); margin-top: 3rem; padding-top: 1rem; }
""".strip()


def esc(texto: str) -> str:
    return html.escape(texto or "", quote=False)


def topo(titulo: str, descricao: str, caminho: str, extra: str = "") -> str:
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(titulo)}</title>
<meta name="description" content="{html.escape(descricao, quote=True)}">
<link rel="canonical" href="{SITE}{caminho}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="article">
<meta property="og:site_name" content="OrtoQuestões">
<meta property="og:title" content="{html.escape(titulo, quote=True)}">
<meta property="og:description" content="{html.escape(descricao, quote=True)}">
<meta property="og:url" content="{SITE}{caminho}">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="icon" href="../favicon-32.png" type="image/png" sizes="32x32">
<style>{ESTILO}</style>
{extra}
</head>
<body>
<header class="topo"><div class="envoltorio">
  <strong><a href="../" style="text-decoration:none;color:inherit">OrtoQuestões</a></strong>
  <nav>
    <a href="./">Assuntos</a>
    <a href="../#/treinar">Treinar</a>
    <a href="../#/sobre">O projeto</a>
  </nav>
</div></header>
<main class="envoltorio">"""


def rodape() -> str:
    return """</main>
<footer class="envoltorio">
  <p class="meta">
    OrtoQuestões — banco de questões de ortopedia e traumatologia.
    As questões são transcritas das provas originais e o gabarito é o da própria banca.
    <a href="../#/contato">Encontrou um erro?</a>
  </p>
</footer>
</body>
</html>
"""


def montar_questao(questao: dict, comentario: dict) -> str:
    gabarito = questao.get("gabarito")
    partes = ['<article class="questao">']
    partes.append(f'<h3>{esc(questao["enunciado"])}</h3>')
    partes.append("<ol type=\"A\">")
    for alternativa in questao.get("alternativas") or []:
        certa = " class=\"certa\"" if alternativa["letra"] == gabarito else ""
        partes.append(f'<li{certa}>{esc(alternativa["texto"])}</li>')
    partes.append("</ol>")

    partes.append('<div class="comentario">')
    partes.append(f'<p class="meta">Gabarito: <strong>{esc(gabarito or "—")}</strong></p>')
    if comentario.get("conceito"):
        partes.append(f'<p>{esc(comentario["conceito"])}</p>')
    partes.append("<dl>")
    if comentario.get("correta"):
        partes.append(f'<dt>Por que {esc(gabarito or "a correta")} está certa</dt>')
        partes.append(f'<dd>{esc(comentario["correta"])}</dd>')
    for letra, texto in sorted((comentario.get("incorretas") or {}).items()):
        partes.append(f"<dt>Por que {esc(letra)} está errada</dt>")
        partes.append(f"<dd>{esc(texto)}</dd>")
    partes.append("</dl>")
    partes.append("</div>")

    partes.append(
        f'<p class="meta"><a href="../#/questao/{esc(questao["id"])}">'
        "Responder esta questão no site</a></p>"
    )
    partes.append("</article>")
    return "\n".join(partes)


def dados_estruturados(itens: list[tuple[dict, dict]]) -> str:
    """FAQPage: a forma que o buscador entende para pergunta com resposta."""
    perguntas = []
    for questao, comentario in itens[:10]:
        resposta = " ".join(
            filter(None, [comentario.get("correta"), comentario.get("conceito")])
        )
        perguntas.append(
            {
                "@type": "Question",
                "name": questao["enunciado"][:300],
                "acceptedAnswer": {"@type": "Answer", "text": resposta[:1200]},
            }
        )
    bloco = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": perguntas}
    return (
        '<script type="application/ld+json">'
        + json.dumps(bloco, ensure_ascii=False)
        + "</script>"
    )


def principal() -> int:
    taxonomia = carregar_taxonomia()
    DIR_SAIDA.mkdir(parents=True, exist_ok=True)

    gerados: list[tuple[str, str, int, int]] = []

    for tema in taxonomia["temas"]:
        slug = tema["slug"]
        if slug not in TEXTOS:
            continue
        dados = ler_json(DIR_TEMAS / f"{slug}.json", None)
        comentarios = ler_json(DIR_COMENTARIOS / f"{slug}.json", {}) or {}
        if not dados or not comentarios:
            continue

        # Só entram questões com comentário e sem figura: sem a imagem, a
        # questão fica incompreensível fora do site, e página incompreensível
        # não serve a leitor nenhum.
        candidatas = [
            q
            for q in dados["questoes"]
            if q["id"] in comentarios and not q.get("imagens") and not q.get("anulada")
        ]
        if not candidatas:
            continue
        selecionadas = candidatas[:POR_PAGINA]
        itens = [(q, comentarios[q["id"]]) for q in selecionadas]

        titulo_pagina, resumo, abertura = TEXTOS[slug]
        titulo = f"{titulo_pagina} comentadas — OrtoQuestões"
        caminho = f"questoes/{slug}.html"

        corpo = [topo(titulo, resumo, caminho, dados_estruturados(itens))]
        corpo.append(f"<h1>{esc(titulo_pagina)} comentadas</h1>")
        corpo.append(f"<p>{esc(abertura)}</p>")
        corpo.append(
            f'<p>O acervo tem <strong>{len(dados["questoes"])}</strong> questões de '
            f"{esc(tema['nome']).lower()}, das quais <strong>{len(comentarios)}</strong> já estão "
            "comentadas. Abaixo estão "
            f"{len(selecionadas)} delas, com o comentário completo; o restante fica disponível no "
            "site, onde dá para responder, filtrar por prova e por ano e acompanhar o "
            "desempenho.</p>"
        )
        corpo.append(
            f'<a class="acao" href="../#/treinar?temas={slug}">'
            f"Treinar {esc(tema['nome']).lower()} no site</a>"
        )
        corpo.append(
            '<div class="aviso"><p style="margin:0">As questões abaixo são transcritas das provas '
            "originais, sem reescrita, e o gabarito é o da própria banca. Os comentários são "
            "escritos com apoio de inteligência artificial e conferidos antes de publicar; quando "
            "resta dúvida sobre o gabarito, o comentário registra a dúvida em vez de escondê-la. "
            "A comunidade também comenta — ortopedistas e residentes que já fizeram a prova "
            "podem enviar o comentário deles em cada questão.</p></div>"
        )
        corpo.append(f"<h2>{len(selecionadas)} questões comentadas</h2>")
        for questao, comentario in itens:
            corpo.append(montar_questao(questao, comentario))
        corpo.append(
            f'<a class="acao" href="../#/treinar?temas={slug}">Ver as outras questões de '
            f"{esc(tema['nome']).lower()}</a>"
        )
        corpo.append("<h2>Outros assuntos</h2>")
        corpo.append('<p><a href="./">Todos os assuntos do acervo</a></p>')
        corpo.append(rodape())

        (DIR_SAIDA / f"{slug}.html").write_text("\n".join(corpo), encoding="utf-8")
        gerados.append((slug, tema["nome"], len(selecionadas), len(comentarios)))

    # Índice das páginas por assunto.
    titulo = "Questões de ortopedia comentadas por assunto — OrtoQuestões"
    resumo = (
        "Questões de provas anteriores de ortopedia e traumatologia, comentadas alternativa por "
        "alternativa e organizadas por assunto."
    )
    corpo = [topo(titulo, resumo, "questoes/")]
    corpo.append("<h1>Questões de ortopedia comentadas, por assunto</h1>")
    corpo.append(
        "<p>O OrtoQuestões reúne questões de provas anteriores de ortopedia e traumatologia — "
        "TEOT, TARO e outras — organizadas por assunto. Cada questão traz o enunciado original, "
        "o gabarito da banca e um comentário que explica o conceito e percorre todas as "
        "alternativas, a certa e as erradas.</p>"
    )
    corpo.append(
        '<a class="acao" href="../#/treinar">Montar uma sessão de treino</a>'
    )
    corpo.append("<h2>Assuntos</h2>")
    corpo.append('<ul class="temas">')
    for slug, nome, mostradas, total in gerados:
        _, resumo_tema, _ = TEXTOS[slug]
        corpo.append(
            f'<li><a href="./{slug}.html"><strong>{esc(nome)}</strong></a>'
            f'<br><span class="meta">{esc(resumo_tema)} '
            f"{total} questões comentadas no acervo.</span></li>"
        )
    corpo.append("</ul>")
    corpo.append(rodape())
    (DIR_SAIDA / "index.html").write_text("\n".join(corpo), encoding="utf-8")

    print(f"{len(gerados) + 1} páginas gravadas em public/questoes/")
    for slug, nome, mostradas, total in gerados:
        print(f"  {slug:<18} {mostradas:>3} publicadas de {total} comentadas")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
