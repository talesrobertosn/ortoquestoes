#!/usr/bin/env python3
"""Gera guias editoriais estáticos, úteis fora do aplicativo por hash.

Não são páginas de palavras-chave: cada guia responde uma etapa concreta da
preparação e leva, por links reais, às questões e ao treino correspondente.
"""

from __future__ import annotations

import json

from gerar_paginas_seo import DIR_PUBLICO, SITE, editorial, rodape, topo


DIR_GUIAS = DIR_PUBLICO / "guias"

GUIAS = [
    {
        "slug": "como-estudar-para-o-teot",
        "title": "Como estudar para o TEOT com questões comentadas | OrtoQuestões",
        "description": "Um roteiro para usar questões comentadas na preparação para o TEOT: diagnóstico, treino por assunto, revisão e acompanhamento de erros.",
        "headline": "Como estudar para o TEOT com questões comentadas",
        "content": """
Preparar-se para o TEOT pede repetição com intenção: responder, entender o motivo de cada alternativa e voltar ao assunto quando ele ainda está fresco. Um banco de questões funciona melhor quando não vira apenas uma contagem de acertos.

### 1. Faça um diagnóstico curto
Comece por blocos pequenos e misturados. O objetivo inicial não é acertar tudo: é descobrir quais assuntos exigem revisão. Registre se o erro veio de desconhecimento, confusão entre classificações ou leitura apressada.

### 2. Treine por assunto quando houver um padrão de erro
Depois do diagnóstico, escolha um tema por vez. Leia a questão, compare cada alternativa com o gabarito e use o comentário para localizar o conceito que faltou.

### 3. Transforme erros em revisão
Volte às questões erradas em outro momento e tente recuperar a ideia antes de abrir o comentário. Se o erro persistir, reduza o tema: por exemplo, de coluna para trauma raquimedular.

### 4. Volte ao modo misto
Quando o assunto ficar mais confortável, misture-o a outros temas. Provas exigem reconhecer rapidamente qual conhecimento usar; alternar contextos treina essa decisão.

### 5. Ajuste o próximo bloco com base no desempenho
Percentual de acerto é um sinal, não um diagnóstico sozinho. Observe também volume de questões, recorrência do erro e segurança ao justificar a alternativa correta.
""",
        "links": [
            ("Explorar todas as questões por assunto", "../questoes/"),
            ("Treinar no OrtoQuestões", "../#/treinar"),
            ("Questões de trauma e fraturas", "../questoes/trauma.html"),
            ("Questões de coluna", "../questoes/coluna.html"),
        ],
    },
    {
        "slug": "questoes-de-ortopedia-comentadas",
        "title": "Questões de ortopedia comentadas: como usar | OrtoQuestões",
        "description": "Entenda como aproveitar questões de ortopedia comentadas: enunciado, alternativas, gabarito, conceito-chave e revisão de erros.",
        "headline": "Como aproveitar questões de ortopedia comentadas",
        "content": """
Uma questão comentada é mais útil quando revela a lógica da decisão, não apenas a letra certa. O objetivo é sair da questão sabendo reconhecer o mesmo conceito em um enunciado diferente.

### Leia o enunciado antes do comentário
Defina uma resposta e, se possível, uma justificativa curta. Isso separa um acerto por certeza de um acerto por eliminação ou sorte.

### Compare todas as alternativas
Em provas de ortopedia, alternativas erradas costumam ser versões quase corretas de uma indicação, uma classificação ou um detalhe de técnica. Entender por que cada uma não serve costuma render mais do que memorizar a alternativa certa.

### Guarde o conceito, não a frase
Ao terminar, formule em suas palavras qual pista do caso levou à resposta. Essa frase curta é o que você quer recuperar na revisão.

### Faça revisões espaçadas
Questões que causaram dúvida merecem reencontro em outro dia. O intervalo ajuda a testar recuperação, em vez de reconhecimento imediato.

### Consulte a fonte original quando necessário
As páginas públicas informam quando a questão vem de prova anterior ou de simulado do OrtoQuestões. Quando houver dúvida relevante sobre enunciado ou gabarito, confirme na prova ou no material de referência aplicável.
""",
        "links": [
            ("Banco de questões por assunto", "../questoes/"),
            ("Questões de mão e punho", "../questoes/mao.html"),
            ("Questões de joelho", "../questoes/joelho.html"),
            ("Questões de ombro e cotovelo", "../questoes/ombro-cotovelo.html"),
        ],
    },
    {
        "slug": "provas-de-ortopedia-por-assunto",
        "title": "Provas e questões de ortopedia por assunto | OrtoQuestões",
        "description": "Encontre questões de ortopedia organizadas por assunto para revisar mão, ombro, quadril, joelho, coluna, trauma, pé e tornozelo e mais.",
        "headline": "Questões de ortopedia organizadas por assunto",
        "content": """
Organizar o treino por assunto ajuda a estudar com uma pergunta clara: qual competência preciso consolidar agora? O OrtoQuestões reúne questões de provas de ortopedia e traumatologia e permite sair do tema amplo para blocos mais específicos.

### Use o assunto como ponto de partida
Quadril, joelho, coluna, trauma, mão e punho, ombro e cotovelo, pé e tornozelo, pediatria, tumores e doenças osteometabólicas têm páginas próprias. Elas trazem questões, gabarito e caminhos para o treino no aplicativo.

### Procure padrões entre provas
A banca e o ano são contexto, mas o ganho maior vem de identificar conceitos que reaparecem: classificação, exame, indicação, complicação e princípio de tratamento.

### Misture temas após a revisão dirigida
Depois de trabalhar um assunto, misture-o a outros no treino. Isso reduz a dependência de pistas óbvias do tema e aproxima o estudo da tomada de decisão exigida em prova.
""",
        "links": [
            ("Ver todos os assuntos", "../questoes/"),
            ("Questões de quadril", "../questoes/quadril.html"),
            ("Questões de pé e tornozelo", "../questoes/pe-tornozelo.html"),
            ("Questões de ortopedia pediátrica", "../questoes/pediatria.html"),
        ],
    },
]


def dados_estruturados(guia: dict) -> str:
    caminho = f"guias/{guia['slug']}.html"
    bloco = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": guia["headline"],
        "description": guia["description"],
        "inLanguage": "pt-BR",
        "mainEntityOfPage": f"{SITE}{caminho}",
        "author": {"@type": "Organization", "name": "OrtoQuestões", "url": SITE},
        "publisher": {"@type": "Organization", "name": "OrtoQuestões", "url": SITE},
    }
    return '<script type="application/ld+json">' + json.dumps(bloco, ensure_ascii=False) + "</script>"


def pagina_guia(guia: dict) -> str:
    caminho = f"guias/{guia['slug']}.html"
    corpo = [topo(guia["title"], guia["description"], caminho, dados_estruturados(guia), "../")]
    corpo.append('<nav class="migalhas meta"><a href="../">Início</a> › <a href="./">Guias</a></nav>')
    corpo.append(f"<h1>{guia['headline']}</h1>")
    corpo.append(editorial(guia["content"]))
    corpo.append('<h2>Continue estudando</h2><ul class="temas">')
    for texto, url in guia["links"]:
        corpo.append(f'<li><a href="{url}">{texto}</a></li>')
    corpo.append("</ul>")
    corpo.append(rodape("../"))
    return "\n".join(corpo)


def indice() -> str:
    titulo = "Guias para estudar ortopedia | OrtoQuestões"
    descricao = "Guias práticos para usar questões comentadas e organizar a preparação para provas de ortopedia e traumatologia."
    corpo = [topo(titulo, descricao, "guias/", raiz="../")]
    corpo.append("<h1>Guias para estudar ortopedia</h1>")
    corpo.append("<p>Roteiros de estudo para transformar questões comentadas em revisão, identificar lacunas e organizar o treino por assunto.</p>")
    corpo.append('<ul class="temas">')
    for guia in GUIAS:
        corpo.append(f'<li><a href="./{guia["slug"]}.html"><strong>{guia["headline"]}</strong></a><br><span class="meta">{guia["description"]}</span></li>')
    corpo.append("</ul>")
    corpo.append(rodape("../"))
    return "\n".join(corpo)


def principal() -> int:
    DIR_GUIAS.mkdir(parents=True, exist_ok=True)
    for guia in GUIAS:
        (DIR_GUIAS / f"{guia['slug']}.html").write_text(pagina_guia(guia), encoding="utf-8")
    (DIR_GUIAS / "index.html").write_text(indice(), encoding="utf-8")
    print(f"{len(GUIAS) + 1} guias em public/guias/")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
