#!/usr/bin/env python3
"""
Gera as páginas públicas dos resumos da Biblioteca em public/resumos/.

Por que existem. Desde 16/10/2026 os resumos de capítulos são abertos e
grátis, também para o Google (decisão do Tales). O leitor do aplicativo fica
em #/resumos/<id>, e o buscador descarta o fragmento: para ele o resumo não
existe. Estas páginas publicam o texto INTEIRO de cada resumo em HTML puro,
sem JavaScript, com endereço próprio (/resumos/<id>/), e convidam para o
leitor do aplicativo, que tem marcações, notas e as questões no meio do texto.

De onde vem cada coisa (nada é escrito aqui):
- public/biblioteca/indice.json e capitulos/<id>.json: o resumo, gerado de
  conteudo/biblioteca/*.md por scripts/biblioteca/gerar.mjs (formato em
  src/biblioteca/tipos.ts e docs/biblioteca/README.md).
- public/acervo/indice.json: prova e ano de cada questão citada. O resumo só
  guarda os ids; questão que não estiver no acervo fica de fora, com aviso.
- src/dados/taxonomia.json: o nome de cada especialidade.

Regras (as mesmas das outras páginas públicas): sem total do acervo, sem
preço, sem nome de outra marca ou curso, sem JavaScript, mesmo estilo das
páginas de questão (ESTILO e topo/rodapé de gerar_paginas_seo.py). A figura do
livro não é reproduzida (sem licença de reprodução digital): fica o número e a
legenda. O campo `fonte` (arquivo enviado) é interno e não é publicado.

Rode depois de gerar_paginas_seo.py (os cartões apontam para as páginas de
questão que ele cria, quando existem) e antes de gerar_sitemap.py.
"""

from __future__ import annotations

import html
import re
import shutil
from collections import Counter
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import CAMINHO_INDICE, DIR_PUBLICO, carregar_taxonomia, ler_json  # noqa: E402
from gerar_paginas_seo import SITE, esc, ld, migalhas_ld, resumir, rodape, topo  # noqa: E402

DIR_BIBLIOTECA = DIR_PUBLICO / "biblioteca"
DIR_SAIDA = DIR_PUBLICO / "resumos"
DIR_QUESTOES = DIR_PUBLICO / "questoes"

RADAR = {
    "confirmado": ("Cobrança confirmada", "Há questões de prova real no acervo sobre esta seção."),
    "fundamento": ("Fundamento", "Base necessária para resolver as questões relacionadas."),
    "clinico": ("Relevância clínica", "Conteúdo importante na prática; nenhuma questão encontrada no conjunto analisado."),
    "oportunidade": ("Possível cobrança", "Tema com potencial de cobrança. É uma possibilidade, não uma previsão."),
}

# Acrescentado ao ESTILO comum, só nas páginas de resumo.
ESTILO_RESUMO = """<style>
.resumo-texto p { margin: 0 0 1rem; }
.resumo-texto ul { margin: 0 0 1rem; padding-left: 1.3rem; }
.resumo-texto li { margin: 0 0 0.45rem; }
.resumo-texto h2 { scroll-margin-top: 1rem; }
.radar { margin: -0.35rem 0 1rem; }
.radar span { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; background: var(--veu); color: var(--destaque); font-size: 0.78rem; font-weight: 700; }
.radar.fundamento span, .radar.clinico span, .radar.oportunidade span { background: var(--superficie-2); color: var(--texto-2); border: 1px solid var(--traco); }
.na-prova { margin: 0.4rem 0 1rem; padding: 0.8rem 1rem; border-radius: 12px; background: var(--ouro-veu); border-left: 4px solid var(--ouro); }
.na-prova p { margin: 0; }
.na-prova .selo { color: var(--ouro); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem; font-weight: 800; margin-right: 0.35rem; }
.cobranca { background: var(--superficie); border: 1px solid var(--traco); border-left: 4px solid var(--destaque); border-radius: 14px; padding: 1rem 1.1rem; margin: 0.5rem 0 1.25rem; }
.cobranca.treino { border-left-color: var(--traco); }
.cobranca .rotulo { color: var(--destaque); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem; }
.cobranca p { margin: 0 0 0.6rem; }
.cobranca .conceito-q { font-weight: 700; }
.cobranca .sub { margin: 0.8rem 0 0.3rem; font-weight: 800; font-size: 0.9rem; }
.cobranca ul { margin: 0 0 0.6rem; padding-left: 1.2rem; }
.cobranca ul.questoes-citadas { list-style: none; padding: 0; margin: 0.4rem 0 0.6rem; }
.cobranca ul.questoes-citadas li { border-top: 1px solid var(--traco); padding: 0.55rem 0; display: flex; flex-wrap: wrap; gap: 0.25rem 0.75rem; align-items: baseline; }
.cobranca ul.questoes-citadas strong { min-width: 7.5rem; }
.cobranca .alerta { padding: 0.7rem 0.9rem; border-radius: 10px; background: var(--ouro-veu); }
.figura-original { margin: 0.5rem 0 1.25rem; padding: 0.9rem 1rem; border-radius: 12px; border: 1px dashed var(--traco); background: var(--superficie-2); }
.figura-original .pendente { margin: 0 0 0.4rem; font-size: 0.85rem; color: var(--texto-2); }
.tabela { overflow-x: auto; margin: 0.5rem 0 1.25rem; }
.tabela caption { text-align: left; font-weight: 700; padding: 0 0 0.4rem; }
.fonte { background: var(--superficie); border: 1px solid var(--traco); border-radius: 14px; padding: 1rem 1.1rem; margin: 0 0 1.25rem; }
.fonte p { margin: 0 0 0.4rem; }
.fonte p:last-child { margin: 0; }
nav.sumario ol { margin: 0; padding-left: 1.3rem; }
nav.sumario li { margin: 0 0 0.25rem; }
.acao.clara { background: var(--superficie); color: var(--destaque); border: 1px solid var(--destaque); margin-left: 0.5rem; }
@media (max-width: 30rem) { .acao.clara { margin-left: 0; } }
</style>"""


def inline(texto: str) -> str:
    """Escapa e transforma **negrito** em <strong> (único destaque do formato)."""
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", esc(texto))


def puro(texto: str) -> str:
    return " ".join((texto or "").replace("**", "").split())


def formatar_data(iso: str) -> str:
    ano, mes, dia = iso[:10].split("-")
    return f"{dia}/{mes}/{ano}"


def pessoas(autores: str) -> list[dict]:
    nomes = [n.strip() for n in re.split(r",\s*|\s+e\s+", autores or "") if n.strip()]
    return [{"@type": "Person", "name": n} for n in nomes]


class Acervo:
    """Prova e ano das questões citadas, do índice do acervo (nunca inventados)."""

    def __init__(self) -> None:
        indice = ler_json(CAMINHO_INDICE, {}) or {}
        self.provas = indice.get("provas") or []
        self.temas = indice.get("temas") or []
        self.por_id = {q["id"]: q for q in indice.get("questoes") or []}
        self.ausentes: set[str] = set()

    def existe(self, qid: str) -> bool:
        if qid in self.por_id:
            return True
        self.ausentes.add(qid)
        return False

    def rotulo(self, qid: str) -> str:
        q = self.por_id[qid]
        if q.get("sim") and q.get("p") is None:
            return "OrtoQuestões Simulados"
        prova = self.provas[q["p"]] if q.get("p") is not None and q["p"] < len(self.provas) else ""
        return " ".join(filter(None, [prova, str(q.get("a") or "")])) or qid

    def pagina_publica(self, qid: str) -> str | None:
        """Caminho da página estática da questão (gerar_paginas_seo.py), se existir."""
        q = self.por_id[qid]
        t = q.get("t")
        if t is None or t >= len(self.temas):
            return None
        caminho = f"questoes/{self.temas[t]['slug']}/{qid}.html"
        return caminho if (DIR_PUBLICO / caminho).exists() else None


def cartao_questoes(bloco: dict, acervo: Acervo, raiz: str) -> str:
    reais = [q for q in dict.fromkeys(bloco.get("central", []) + bloco.get("relacionadas", [])) if acervo.existe(q)]
    treino = [q for q in bloco.get("treino", []) if acervo.existe(q)]
    classe = "cobranca" if reais else "cobranca treino"
    if reais:
        selo = f"Já caiu: {acervo.rotulo(reais[0])}" if len(reais) == 1 else f"{len(reais)} questões de prova sobre isto"
    else:
        selo = "Treine este ponto"
    partes = [f'<aside class="{classe}" aria-label="{"Já caiu na prova" if reais else "Treino"}">',
              f'<p class="rotulo">{esc(selo)}</p>']
    if bloco.get("conceito"):
        partes.append(f'<p class="conceito-q">{inline(bloco["conceito"])}</p>')
    if bloco.get("como"):
        partes.append(f'<p class="sub">Como isso cai na prova</p><p>{inline(bloco["como"])}</p>')
    if bloco.get("armadilhas"):
        partes.append('<p class="sub">Armadilhas</p><ul>' + "".join(f"<li>{inline(a)}</li>" for a in bloco["armadilhas"]) + "</ul>")
    if bloco.get("alerta"):
        partes.append(f'<p class="alerta"><strong>Alerta:</strong> {inline(bloco["alerta"])}</p>')
    if reais:
        partes.append('<p class="sub">Questões de prova citadas</p><ul class="questoes-citadas">')
        for qid in reais:
            papel = "conceito central" if qid in bloco.get("central", []) else "relacionada"
            extra = ""
            publica = acervo.pagina_publica(qid)
            if publica:
                extra = f' <a class="meta" href="{raiz}{publica}">ver o enunciado</a>'
            partes.append(
                f'<li><strong>{esc(acervo.rotulo(qid))}</strong><span class="meta">{papel}</span>'
                f'<a href="{raiz}#/questao/{esc(qid)}">Fazer esta questão no OrtoQuestões</a>{extra}</li>'
            )
        partes.append("</ul>")
    if treino:
        links = " · ".join(
            f'<a href="{raiz}#/questao/{esc(qid)}">{"Resolver" if len(treino) == 1 else f"Treino {i}"}</a>'
            for i, qid in enumerate(treino, start=1)
        )
        partes.append(
            f'<p class="meta"><strong>{"Questão" if len(treino) == 1 else "Questões"} de treino</strong> '
            f"(OrtoQuestões Simulados: autorais, sem caráter oficial): {links}</p>"
        )
    partes.append('<p class="meta">A resolução, o gabarito e o comentário de cada questão ficam na plataforma.</p>')
    partes.append("</aside>")
    return "\n".join(partes)


def figura(bloco: dict, capitulo: dict) -> str:
    return (
        '<figure class="figura-original">'
        '<p class="pendente">Figura do original não reproduzida (sem licença de reprodução digital). '
        "Consulte a figura no livro.</p>"
        f'<figcaption><strong>Figura {esc(bloco["numero"])}.</strong> {inline(bloco.get("legenda", ""))} '
        f'<cite>{esc(capitulo["livro"])}, {esc(capitulo["edicao"])}.</cite></figcaption></figure>'
    )


def tabela(bloco: dict) -> str:
    cab = "".join(f'<th scope="col">{inline(c)}</th>' for c in bloco.get("cab") or [])
    linhas = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in linha) + "</tr>" for linha in bloco.get("linhas") or [])
    legenda = f"<caption>{inline(bloco['titulo'])}</caption>" if bloco.get("titulo") else ""
    return f'<div class="tabela"><table>{legenda}<thead><tr>{cab}</tr></thead><tbody>{linhas}</tbody></table></div>'


def blocos_html(blocos: list[dict], capitulo: dict, acervo: Acervo, raiz: str) -> str:
    saida: list[str] = []
    lista: list[str] = []

    def fechar_lista() -> None:
        if lista:
            saida.append("<ul>" + "".join(lista) + "</ul>")
            lista.clear()

    for b in blocos:
        tipo = b.get("tipo")
        if tipo == "li":
            lista.append(f"<li>{inline(b['t'])}</li>")
            continue
        fechar_lista()
        if tipo == "p":
            saida.append(f"<p>{inline(b['t'])}</p>")
        elif tipo == "h3":
            saida.append(f"<h3>{inline(b['t'])}</h3>")
        elif tipo == "prova":
            saida.append(f'<aside class="na-prova"><p><span class="selo">Na prova</span>{inline(b["t"])}</p></aside>')
        elif tipo == "questoes":
            saida.append(cartao_questoes(b, acervo, raiz))
        elif tipo == "figura":
            saida.append(figura(b, capitulo))
        elif tipo == "tabela":
            saida.append(tabela(b))
    fechar_lista()
    return "\n".join(saida)


def questoes_reais_da_secao(secao: dict, acervo: Acervo) -> set[str]:
    ids: set[str] = set()
    for b in secao["blocos"]:
        if b.get("tipo") == "questoes":
            ids.update(q for q in b.get("central", []) + b.get("relacionadas", []) if q in acervo.por_id)
    return ids


def radar_html(secao: dict, acervo: Acervo) -> str:
    radar = secao.get("radar") or "fundamento"
    rotulo, explicacao = RADAR.get(radar, RADAR["fundamento"])
    if radar == "confirmado":
        n = len(questoes_reais_da_secao(secao, acervo))
        rotulo = f"{rotulo} · {n} {'questão' if n == 1 else 'questões'}" if n else "Nenhuma questão encontrada no conjunto analisado"
    return f'<p class="radar {esc(radar)}" title="{html.escape(explicacao, quote=True)}"><span>{esc(rotulo)}</span></p>'


def link_app(capitulo_id: str, raiz: str) -> str:
    return f"{raiz}#/resumos/{esc(capitulo_id)}"


def criar_conta(capitulo_id: str | None, raiz: str) -> str:
    voltar = f"%2Fresumos%2F{capitulo_id}" if capitulo_id else "%2Fresumos"
    return f"{raiz}#/conta?modo=criar&amp;voltar={voltar}"


def livro_curto(capitulo: dict) -> str:
    """Nome do livro como o residente procura no Google (Tales, 27/10/2026: "resumo ortopedia rockwood")."""
    livro = capitulo.get("livro", "")
    if "Rockwood" in livro and "Children" in livro:
        return "Rockwood infantil"
    if "Rockwood" in livro:
        return "Rockwood adulto"
    if "Netter" in livro:
        return "Netter"
    if "Tachdjian" in livro:
        return "Tachdjian"
    if "Campbell" in livro:
        return "Campbell"
    if "Green" in livro:
        return "Green"
    return livro


def numero_capitulo(capitulo: dict) -> str:
    m = re.search(r"\d+", capitulo.get("capitulo", ""))
    return m.group(0) if m else ""


def titulo_pagina(capitulo: dict) -> str:
    n = numero_capitulo(capitulo)
    return f"{capitulo['titulo']}: resumo do {livro_curto(capitulo)}{f', cap. {n}' if n else ''} | Orto Questões"


def descricao_pagina(capitulo: dict) -> str:
    edicao = re.sub(r"\s*\(.*\)", "", capitulo.get("edicao", ""))
    return resumir(f"Resumo de ortopedia grátis, {livro_curto(capitulo)} ({edicao}), para residência, TEOT e TARO: "
                   f"{puro(capitulo['resumo'])}", 155)


def palavras_chave(capitulo: dict, nome_area: str) -> list[str]:
    curto = livro_curto(capitulo)
    return [capitulo["titulo"], f"resumo {curto}", f"resumo {capitulo.get('livro', '')}", "resumo de ortopedia",
            f"resumo de {nome_area.lower()}", "residência em ortopedia", "estudo para residência médica em ortopedia",
            "TEOT", "TARO", "R4 ortopedia", "questões de ortopedia comentadas"]


def dados_estruturados(capitulo: dict, data: str, nome_area: str) -> str:
    caminho = f"resumos/{capitulo['id']}/"
    organizacao = {
        "@type": "Organization", "@id": f"{SITE}#organization", "name": "Orto Questões",
        "alternateName": ["OrtoQuestões", "ortoquestoes"], "url": SITE,
        "logo": {"@type": "ImageObject", "url": f"{SITE}icone-512.png", "width": 512, "height": 512},
        "sameAs": ["https://www.instagram.com/ortoquestoes"],
    }
    fonte = {"@type": "Chapter", "name": capitulo["capitulo"],
             "isPartOf": {"@type": "Book", "name": capitulo["livro"], "bookEdition": capitulo["edicao"]}}
    if pessoas(capitulo.get("autores", "")):
        fonte["author"] = pessoas(capitulo["autores"])
    artigo = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": f"{capitulo['titulo']}: resumo do capítulo",
        "description": descricao_pagina(capitulo),
        "inLanguage": "pt-BR",
        "dateModified": data,
        "mainEntityOfPage": f"{SITE}{caminho}",
        "image": f"{SITE}previa-orto-questoes-coluna.jpg",
        "author": organizacao,
        "publisher": organizacao,
        "isAccessibleForFree": True,
        "timeRequired": f"PT{int(capitulo.get('minutos') or 0)}M",
        "about": [nome_area, capitulo["titulo"]],
        "keywords": ", ".join(palavras_chave(capitulo, nome_area)),
        "isBasedOn": fonte,
        "isPartOf": {"@type": "WebSite", "@id": f"{SITE}#website", "name": "Orto Questões", "url": SITE},
    }
    return ld(artigo) + "\n" + ld(migalhas_ld(("Resumos", "resumos/"), (capitulo["titulo"], caminho))) + "\n" + ESTILO_RESUMO


def pagina_resumo(capitulo: dict, data: str, nomes_area: dict[str, str], acervo: Acervo, outros: list[dict]) -> str:
    raiz = "../../"
    cid = capitulo["id"]
    area = nomes_area.get(capitulo["especialidade"], capitulo["especialidade"])
    corpo = [topo(titulo_pagina(capitulo), descricao_pagina(capitulo), f"resumos/{cid}/",
                  dados_estruturados(capitulo, data, area), raiz)]
    corpo.append(f'<nav class="migalhas meta"><a href="{raiz}">Orto Questões</a> › <a href="../">Resumos</a> › {esc(capitulo["titulo"])}</nav>')
    corpo.append(f"<h1>{esc(capitulo['titulo'])}</h1>")
    corpo.append('<p class="etiquetas">' + "".join(f"<span>{esc(r)}</span>" for r in
                 [area, "Resumo do capítulo", f"{int(capitulo.get('minutos') or 0)} min de leitura"]) + "</p>")
    corpo.append(f"<p>{inline(capitulo.get('resumo', ''))}</p>")
    corpo.append(f'<p class="meta">Atualizado em {formatar_data(data)} · {int(capitulo.get("minutos") or 0)} minutos de leitura · Orto Questões</p>')
    autores = f" Autores do capítulo: {esc(capitulo['autores'])}." if capitulo.get("autores") else ""
    corpo.append(
        '<div class="fonte">'
        f'<p><strong>Fonte:</strong> {esc(capitulo["capitulo"])}, em <cite>{esc(capitulo["livro"])}</cite>, {esc(capitulo["edicao"])}.{autores}</p>'
        "<p>Este é um <strong>resumo autoral</strong> do Orto Questões, escrito em português a partir do capítulo, na ordem em que as provas "
        "costumam cobrar o tema. Não é o livro original, nem tradução ou reprodução dele; as figuras do original não são reproduzidas. "
        "Os números e condutas citados são os do capítulo: para a íntegra, consulte o livro.</p></div>"
    )
    n = numero_capitulo(capitulo)
    corpo.append(
        f"<p><strong>Para quem é.</strong> Para quem estuda para a residência em ortopedia, para o TEOT, o TARO e o R4: um resumo de "
        f"{esc(area.lower())} do {esc(livro_curto(capitulo))}{f', capítulo {n}' if n else ''}, com o que as bancas mais cobram e as "
        "questões comentadas de cada assunto.</p>"
    )
    corpo.append(
        f'<a class="acao" href="{link_app(cid, raiz)}">Ler no leitor do Orto Questões</a>'
        f'<a class="acao clara" href="{criar_conta(cid, raiz)}">Criar conta grátis</a>'
    )
    corpo.append('<p class="meta">No leitor: marcações, notas e as questões no meio do texto, que abrem sem perder o lugar da leitura.</p>')

    corpo.append('<nav class="sumario aviso" aria-label="Seções do resumo"><p style="margin:0 0 0.4rem"><strong>Neste resumo</strong></p><ol>')
    for s in capitulo["secoes"]:
        corpo.append(f'<li><a href="#{esc(s["id"])}">{esc(s["titulo"])}</a></li>')
    corpo.append("</ol></nav>")

    corpo.append('<article class="resumo-texto">')
    for s in capitulo["secoes"]:
        corpo.append(f'<section aria-labelledby="{esc(s["id"])}">')
        corpo.append(f'<h2 id="{esc(s["id"])}">{esc(s["titulo"])}</h2>')
        corpo.append(radar_html(s, acervo))
        corpo.append(blocos_html(s["blocos"], capitulo, acervo, raiz))
        corpo.append("</section>")
    corpo.append("</article>")
    # Texto sem cópia (pedido do Tales, 20/10/2026), como no leitor do aplicativo (src/biblioteca/semCopia.ts):
    # seleciona, mas Ctrl+C, Ctrl+X, "Copiar" do menu e arrastar não levam o texto do resumo.
    corpo.append(
        "<script>(function(){var a=document.querySelector('.resumo-texto');if(!a)return;"
        "function toca(){var s=document.getSelection();if(!s||s.isCollapsed)return false;"
        "for(var i=0;i<s.rangeCount;i++)if(s.getRangeAt(i).intersectsNode(a))return true;return false}"
        "function b(e){if(toca()){e.preventDefault();if(e.clipboardData)e.clipboardData.setData('text/plain','')}}"
        "document.addEventListener('copy',b);document.addEventListener('cut',b);"
        "a.addEventListener('dragstart',function(e){e.preventDefault()})})();</script>"
    )

    corpo.append(
        '<div class="convite"><p><strong>Estude este capítulo com as questões.</strong> As questões citadas acima são de provas reais do '
        "acervo; resolvê-las, ver o gabarito da banca e o comentário de cada alternativa é na plataforma. No leitor do Orto Questões o "
        "mesmo resumo tem marcações, notas e as questões no meio do texto.</p>"
        f'<a class="acao" href="{link_app(cid, raiz)}">Abrir no leitor</a>'
        f'<a class="acao clara" href="{criar_conta(cid, raiz)}">Criar conta grátis</a>'
        # Desde 19/10/2026 o leitor do aplicativo abre só as 6 primeiras partes para quem não tem conta
        # (src/biblioteca/porta.ts); esta página continua com o texto inteiro.
        '<p class="meta">No leitor do aplicativo, quem não tem conta lê as 6 primeiras partes; a leitura completa é grátis com a conta.</p></div>'
    )
    corpo.append("<h2>Continue estudando</h2><ul class=\"temas\">")
    for o in outros:
        corpo.append(f'<li><a href="../{esc(o["id"])}/">{esc(o["titulo"])}</a> <span class="meta">· {esc(o["livro"])}, {esc(o["capitulo"])}</span></li>')
    if (DIR_QUESTOES / f"{capitulo['especialidade']}.html").exists():
        corpo.append(f'<li><a href="{raiz}questoes/{esc(capitulo["especialidade"])}.html">Questões de {esc(area.lower())} comentadas</a></li>')
    corpo.append(f'<li><a href="../">Todos os resumos de capítulos</a></li>')
    corpo.append(f'<li><a href="{raiz}#/treinar?temas={esc(capitulo["especialidade"])}">Treinar {esc(area.lower())} no Orto Questões</a></li>')
    corpo.append("</ul>")
    corpo.append(rodape(raiz))
    return "\n".join(corpo)


def pagina_indice(capitulos: list[dict], data: str, nomes_area: dict[str, str], ordem_areas: list[str]) -> str:
    raiz = "../"
    # Os livros saem da própria Biblioteca, na ordem em que mais aparecem (o título envelhecia a cada livro novo).
    livros = [l for l, _ in Counter(livro_curto(c) for c in capitulos).most_common()]
    lista = ", ".join(livros[:-1]) + " e " + livros[-1] if len(livros) > 1 else (livros[0] if livros else "")
    curtos = list(dict.fromkeys(l.split()[0] for l in livros))  # "Rockwood adulto" e "Rockwood infantil" viram "Rockwood"
    titulo = "Resumos de ortopedia grátis: " + (", ".join(curtos[:-1]) + " e " + curtos[-1] if len(curtos) > 1 else "".join(curtos)) + " | Orto Questões"
    descricao = (f"Resumos de ortopedia grátis, capítulo a capítulo ({lista}), para a residência, o TEOT e o TARO, "
                 "com as questões de prova que cobraram cada conceito.")
    colecao = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": f"{SITE}resumos/#pagina",
        "url": f"{SITE}resumos/",
        "name": titulo,
        "description": descricao,
        "inLanguage": "pt-BR",
        "dateModified": data,
        "isPartOf": {"@type": "WebSite", "@id": f"{SITE}#website", "name": "Orto Questões", "url": SITE},
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": len(capitulos),
            "itemListElement": [
                {"@type": "ListItem", "position": i, "url": f"{SITE}resumos/{c['id']}/", "name": c["titulo"]}
                for i, c in enumerate(capitulos, start=1)
            ],
        },
    }
    corpo = [topo(titulo, descricao, "resumos/", ld(colecao) + "\n" + ld(migalhas_ld(("Resumos", "resumos/"))) + "\n" + ESTILO_RESUMO, raiz)]
    corpo.append(f'<nav class="migalhas meta"><a href="{raiz}">Orto Questões</a> › Resumos</nav>')
    corpo.append("<h1>Resumos de capítulos de ortopedia</h1>")
    corpo.append(
        "<p>Resumos autorais do Orto Questões (também escrito OrtoQuestões), cada um escrito a partir de um capítulo da bibliografia "
        "de referência, na ordem em que as provas cobram o tema. A leitura é aberta e grátis. No meio do texto aparecem as questões "
        "reais de prova do acervo que exploraram cada conceito, com o que a banca quis saber e as armadilhas; resolver as questões é "
        "na plataforma.</p>"
    )
    corpo.append(f'<p class="meta">Atualizado em {formatar_data(data)}. Os resumos não substituem o livro: cada página diz de qual '
                 "capítulo, edição e autores veio.</p>")
    corpo.append(
        f'<a class="acao" href="{raiz}#/resumos">Abrir a Biblioteca no aplicativo</a>'
        f'<a class="acao clara" href="{criar_conta(None, raiz)}">Criar conta grátis</a>'
    )
    corpo.append('<p class="meta">No leitor do aplicativo: marcações, notas e as questões no meio do texto. A leitura completa no aplicativo é grátis com a conta.</p>')
    por_area: dict[str, list[dict]] = {}
    for c in capitulos:
        por_area.setdefault(c["especialidade"], []).append(c)
    for slug in sorted(por_area, key=lambda s: ordem_areas.index(s) if s in ordem_areas else len(ordem_areas)):
        corpo.append(f"<h2>{esc(nomes_area.get(slug, slug))}</h2>")
        corpo.append('<ul class="temas">')
        for c in por_area[slug]:
            corpo.append(
                f'<li><a href="./{esc(c["id"])}/"><strong>{esc(c["titulo"])}</strong></a>'
                f'<br><span class="meta">{esc(c["livro"])}, {esc(c["edicao"])} · {esc(c["capitulo"])} · '
                f'{int(c.get("minutos") or 0)} min de leitura</span>'
                f'<br><span>{inline(c.get("resumo", ""))}</span></li>'
            )
        corpo.append("</ul>")
    corpo.append(rodape(raiz))
    return "\n".join(corpo)


def principal() -> int:
    indice = ler_json(DIR_BIBLIOTECA / "indice.json", None)
    if not indice or not indice.get("capitulos"):
        print("aviso: public/biblioteca/indice.json sem capítulos — nada a gerar", file=sys.stderr)
        return 0
    data = (indice.get("geradoEm") or "")[:10]
    taxonomia = carregar_taxonomia()
    nomes_area = {t["slug"]: t["nome"] for t in taxonomia["temas"]}
    ordem_areas = [t["slug"] for t in taxonomia["temas"]]
    acervo = Acervo()

    capitulos = []
    for resumo in indice["capitulos"]:
        capitulo = ler_json(DIR_BIBLIOTECA / "capitulos" / f"{resumo['id']}.json", None)
        if not capitulo or not re.fullmatch(r"[a-z0-9-]+", capitulo.get("id", "")):
            print(f"aviso: capítulo {resumo['id']} ausente ou com id inválido — fica de fora", file=sys.stderr)
            continue
        capitulos.append(capitulo)

    if DIR_SAIDA.exists():
        shutil.rmtree(DIR_SAIDA)
    DIR_SAIDA.mkdir(parents=True)
    for capitulo in capitulos:
        mesma_area = [c for c in capitulos if c["id"] != capitulo["id"] and c["especialidade"] == capitulo["especialidade"]]
        pasta = DIR_SAIDA / capitulo["id"]
        pasta.mkdir()
        (pasta / "index.html").write_text(pagina_resumo(capitulo, data, nomes_area, acervo, mesma_area), encoding="utf-8")
    (DIR_SAIDA / "index.html").write_text(pagina_indice(capitulos, data, nomes_area, ordem_areas), encoding="utf-8")

    for qid in sorted(acervo.ausentes):
        print(f"aviso: questão {qid} citada num resumo não está no acervo — fica de fora", file=sys.stderr)
    print(f"{len(capitulos)} resumos e o índice em public/resumos/ (biblioteca de {data})")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
