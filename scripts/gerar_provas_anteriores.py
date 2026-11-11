#!/usr/bin/env python3
"""
Gera as páginas públicas de provas anteriores: /provas-anteriores/ e uma página
por edição (/provas-anteriores/teot-2024/, /provas-anteriores/taro-2019/,
/provas-anteriores/usp-sp-2025/ ...).

Por que existem. Muita gente procura "TEOT anos anteriores", "provas anteriores
do TARO", "TARO 2019", "provas anteriores de cirurgia da mão". As páginas de
destino respondem pelo conjunto; nenhuma tinha endereço próprio para UMA edição.
Cada página de edição é útil sem buscador nenhum: mostra o que aquela edição
cobrou por assunto e até 20 questões completas, com o gabarito e o comentário
de cada alternativa (Tales, 11/11/2026: só uma amostra, senão a assinatura perde
o sentido), e leva direto para fazer a prova inteira no site. Nada de página feita só de palavra-chave (ver gerar_paginas_seo.py).

Regras (as mesmas de gerar_paginas_destino.py, de onde vem a moldura):
- Números saem do acervo a cada deploy; datas de prova, nunca.
- Sem o total do acervo e sem preço.
- SBCM e SIMÃO não têm prova oficial publicada no acervo: são OrtoQuestões
  Simulados no padrão das provas, e a página diz isso.
- Nenhum nome de outra marca ou curso.

Rode depois de gerar_paginas_destino.py e antes de gerar_sitemap.py.
"""

from __future__ import annotations

import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import gerar_paginas_destino as d  # noqa: E402
import gerar_paginas_seo as seo  # noqa: E402
from comum import DIR_ACERVO, DIR_PUBLICO, ler_json  # noqa: E402

PASTA = "provas-anteriores"
FAMILIAS = [
    ("teot", "TEOT", ["TEOT"], "base"),
    ("taro", "TARO", ["TARO"], "base"),
    ("mao", "Cirurgia da mão", d.PROVAS_MAO, "mao"),
]
NOME_LONGO = {
    "TEOT": "TEOT, prova teórica do título de especialista da SBOT",
    "TARO": "TARO, avaliação anual dos residentes da SBOT",
}
FEMININAS = {"USP-SP", "UFG", "PUC-SP", "FMRP-USP", "UERJ"}
NOME_CURTO = {"ENARE Cirurgia da Mão": "ENARE Cirurgia da Mão", "UERJ": "UERJ"}


slug = d.slug_edicao


def nome_prova(prova: str) -> str:
    if prova in ("TEOT", "TARO"):
        return prova
    return NOME_CURTO.get(prova, prova)


def familia_de(prova: str) -> tuple[str, str, list[str], str]:
    return next(f for f in FAMILIAS if prova in f[2])


def numero(q: dict) -> int:
    return (q.get("origem") or {}).get("numeroOriginal") or 10_000


def pagina_questao(q: dict) -> str | None:
    if (DIR_PUBLICO / "questoes" / q["tema_slug"] / f"{q['id']}.html").exists():
        return f"../questoes/{q['tema_slug']}/{q['id']}.html"
    return None


# Até 20 questões completas por edição (Tales, 11/11/2026): a página mostra uma amostra da prova com o
# comentário inteiro, e não mais a prova toda com o gabarito; o resto fica no site, para quem treina.
# A escolha é fixa, em seo_questoes_completas.json (scripts/selecionar_completas.py).
ABERTAS: dict[str, list[str]] = (ler_json(seo.ARQUIVO_COMPLETAS, {}) or {}).get("por_edicao", {})
_COMENTARIOS: dict[str, dict] = {}


def comentario(qid: str) -> dict:
    if not _COMENTARIOS:
        for arquivo in (DIR_ACERVO / "comentarios").glob("*.json"):
            _COMENTARIOS.update(ler_json(arquivo, {}) or {})
    return _COMENTARIOS.get(qid) or {}


def questao_aberta(q: dict, n: int, assunto: str) -> str:
    """Uma questão inteira: enunciado, figura, alternativas, gabarito e o comentário de cada alternativa."""
    c = comentario(q["id"])
    gabarito = q.get("gabarito")
    textos = {a["letra"]: a["texto"] for a in q.get("alternativas") or []}
    partes = [f'<article class="aberta" id="{d.esc(q["id"])}"><p class="aberta__rotulo">Questão {n} · {d.esc(assunto)}</p>',
              f'<p class="aberta__enunciado">{d.esc(q.get("enunciado") or "")}</p>',
              seo.figuras(q, "../", assunto, f"{q.get('prova')} {q.get('ano')}"),
              '<ol type="A" class="aberta__alts">' + "".join(
                  f'<li{" class=certa" if a["letra"] == gabarito else ""}>{d.esc(a["texto"])}</li>' for a in q.get("alternativas") or []) + "</ol>",
              f'<details class="aberta__resposta"><summary>Gabarito: <strong>{d.esc(gabarito or "–")}</strong> · ver o comentário</summary>']
    if c.get("conceito"):
        partes.append('<div class="conceito"><p class="rotulo">A ideia da questão</p>' + seo.editorial(c["conceito"]) + "</div>")
    if c.get("correta"):
        partes.append(f'<div class="alt certa"><p class="rotulo">{d.esc(gabarito or "")} · {d.esc(textos.get(gabarito or "", "correta"))}</p>{seo.editorial(c["correta"])}</div>')
    for letra, texto in sorted((c.get("incorretas") or {}).items()):
        partes.append(f'<div class="alt"><p class="rotulo">{d.esc(letra)} · {d.esc(textos.get(letra, ""))}</p>{seo.editorial(texto)}</div>')
    if c.get("referencias"):
        partes.append('<p class="aberta__refs"><strong>Bibliografia:</strong> ' + d.esc("; ".join(c["referencias"])) + "</p>")
    partes.append("</details></article>")
    return "\n".join(partes)


def subir(texto: str) -> str:
    """As páginas de edição ficam um nível abaixo: todo link relativo à raiz
    (escrito como "../x") passa a "../../x"."""
    return re.sub(r'(href|src)="\.\./', r'\1="../../', texto)


def migalha(nome: str, extra: tuple[str, str] | None = None) -> str:
    meio = f' › <a href="../{PASTA}/">Provas anteriores</a>' if extra else ""
    return (f'<nav class="migalhas" aria-label="Você está em"><a href="../">Orto Questões</a>{meio} › {d.esc(nome)}</nav>')


def heroi(selo: str, h1: str, lide: str, nome: str, acoes, garantias, nivel2: bool = False) -> str:
    html = d.heroi(selo, h1, lide, nome, acoes, garantias)
    if nivel2:
        html = re.sub(r'<nav class="migalhas".*?</nav>', migalha(nome, ("", "")), html, count=1, flags=re.S)
    return html


def ld_migalhas(itens: list[tuple[str, str]]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(itens)],
    }


ESTILO = """
.questoes{margin:0;padding:0;list-style:none;display:grid;gap:.5rem}
.questoes li a,.questoes li>div{display:grid;gap:.1rem;padding:.75rem 1rem;border-radius:14px;
background:var(--sup);border:1px solid var(--traco);text-decoration:none;color:var(--texto)}
.questoes b{font-size:.86rem;color:var(--texto2);font-weight:700}
.questoes span{font-size:.97rem}
.aberta{padding:1.1rem 1.15rem;border-radius:16px;background:var(--sup);border:1px solid var(--traco);margin:0 0 1rem}
.aberta__rotulo{margin:0 0 .4rem;font-size:.82rem;font-weight:800;color:var(--marca);text-transform:uppercase;letter-spacing:.04em}
.aberta__enunciado{margin:0 0 .8rem;font-size:1.02rem;line-height:1.6}
.aberta figure{margin:0 0 .8rem}.aberta figure img{max-width:100%;height:auto;max-height:24rem;border-radius:10px;border:1px solid var(--traco)}
.aberta figcaption{font-size:.85rem;color:var(--texto2)}
.aberta__alts{margin:0 0 .6rem;padding-left:1.4rem;display:grid;gap:.3rem}
.aberta__resposta summary{cursor:pointer;font-weight:700;color:var(--marca);padding:.5rem 0}
.aberta__resposta[open] .aberta__alts li.certa{font-weight:700}
.aberta .conceito{padding:.9rem 1rem;border-radius:14px;background:var(--veu);margin:.4rem 0 .8rem}
.aberta .alt{padding:.85rem 1rem;border-radius:14px;border:1px solid var(--traco);margin:0 0 .7rem}
.aberta .alt.certa{background:var(--veu);border-color:transparent}
.aberta .rotulo{margin:0 0 .35rem;font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--marca)}
.aberta .alt p,.aberta .conceito p{margin:0 0 .55rem}
.aberta table{width:100%;border-collapse:collapse;font-size:.9em}.aberta th,.aberta td{border:1px solid var(--traco);padding:.35rem .5rem;text-align:left;vertical-align:top}
.aberta .tabela{overflow-x:auto;margin:.3rem 0 .9rem}.aberta .tabela table{min-width:28rem}
.aberta .nota{border-left:3px solid var(--marca);padding:.2rem .8rem;margin:0 0 .7rem}
.aberta__refs{font-size:.88rem;color:var(--texto2)}
.questoes .anulada{color:var(--ouro-escuro);font-weight:700}
.questoes .letra{font-style:normal;font-size:.86rem;font-weight:800;color:var(--marca,#14655e);justify-self:start;padding:.1rem .55rem;border-radius:999px;background:var(--veu,#e6efee);margin-top:.25rem}
.vizinhas{display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;margin-top:1.4rem}
.anos a[aria-current]{background:var(--veu);border-color:var(--marca);color:var(--marca);font-weight:800}
.familia{display:grid;gap:.6rem;margin-top:.4rem}
.familia h3{margin:.8rem 0 .2rem}
""".replace("\n", "")


# ---------------------------------------------------------------- edições

def edicoes(dados: dict) -> dict[tuple[str, int], list[dict]]:
    grupos: dict[tuple[str, int], list[dict]] = defaultdict(list)
    provas = {p for _, _, ps, _ in FAMILIAS for p in ps}
    for q in dados["oficiais"]:
        if q.get("prova") in provas and q.get("ano"):
            grupos[(q["prova"], q["ano"])].append(q)
    for qs in grupos.values():
        qs.sort(key=lambda q: (numero(q), q["id"]))
    return grupos


def anos_links(prova: str, anos: list[int], atual: int | None, cont: dict) -> str:
    itens = []
    for a in anos:
        marca = ' aria-current="page"' if a == atual else ""
        itens.append(f'<li><a href="../{PASTA}/{slug(prova, a)}/"{marca}>{a}<small>{d.num(cont[a])} questões</small></a></li>')
    return f'<ul class="anos">{"".join(itens)}</ul>'


def pagina_edicao(dados: dict, prova: str, ano: int, qs: list[dict], anos: list[int], cont: dict) -> tuple[str, dict]:
    chave, nome_familia, _, area = familia_de(prova)
    pasta = f"{PASTA}/{slug(prova, ano)}"
    nome = f"{nome_prova(prova)} {ano}"
    mao = chave == "mao"
    validas = [q for q in qs if not q.get("anulada")]
    anuladas = len(qs) - len(validas)
    comentadas = sum(1 for q in qs if q["id"] in d.comentados())
    com_imagem = sum(1 for q in qs if q.get("imagens"))
    # Na cirurgia da mão tudo é "Mão e punho": o que separa as questões é o subtema.
    def assunto_de(q: dict) -> str:
        return ((q.get("subtemas") or [q["tema_nome"]])[0]) if mao else q["tema_nome"]

    temas = Counter(assunto_de(q) for q in validas)
    subtemas = Counter(s for q in validas for s in (q.get("subtemas") or []))

    fem = prova in FEMININAS
    artigo, art = ("da", "a") if fem else ("do", "o")
    comentado = "comentada" if fem else "comentado"
    anatomia = sum(1 for q in qs if "anatomia" in ((q.get("origem") or {}).get("arquivo") or "").lower())
    if prova == "TEOT":
        titulo = f"TEOT {ano}: gabarito e questões comentadas | Orto Questões"
        tipo = "a prova teórica do título de especialista da SBOT" + (" e a prova de anatomia" if anatomia else "")
    elif prova == "TARO":
        titulo = f"TARO {ano}: gabarito e questões comentadas | Orto Questões"
        tipo = "a avaliação anual dos residentes da SBOT"
    else:
        titulo = f"{nome}: prova de cirurgia da mão com gabarito | Orto Questões"
        tipo = "a prova de seleção para a residência em cirurgia da mão"
    principais = ", ".join(t for t, _ in temas.most_common(3))
    if comentadas == len(qs):
        extra = " e comentário de cada alternativa"
    elif comentadas * 10 >= len(qs) * 9:
        extra = " e comentário"
    else:
        extra = ""
    # "gabarito taro 2026" é a busca que mais traz gente depois do nome do site (Search Console, 11/11/2026).
    n_abertas = len(ABERTAS.get(slug(prova, ano), []))
    descricao = ((f"{nome}: {n_abertas} questões da prova comentadas na íntegra, com o gabarito da banca e a explicação de cada "
                  f"alternativa. O que mais caiu: {principais}.") if n_abertas else
                 (f"{nome}: as questões da prova com o gabarito da banca{extra}. O que mais caiu: {principais}."))
    faq = [
        (f"Onde ver o gabarito {artigo} {nome}?",
         (f"Nesta página há {n_abertas} questões da prova com o gabarito e o comentário completo. " if n_abertas else "")
         + "A prova inteira, com o gabarito da banca de cada questão, está no site: no modo prova, no tempo, ou no modo estudo"
         + (", com o comentário de todas as alternativas depois de cada resposta." if comentadas else ".")),
        (f"Quantas questões tem {art} {nome} no acervo?",
         f"{d.num(len(qs))} questões transcritas do caderno"
         + (f", das quais {d.num(anuladas)} foram anuladas pela banca e ficam marcadas, sem contar no desempenho." if anuladas else ".")),
        (f"Dá para fazer {art} {nome} como simulado?",
         "Sim. No treino, escolha a prova e o ano; no modo prova, a sessão tem tempo marcado e as questões vêm na ordem da prova."),
    ]
    sobre = [prova, f"{nome}", "Provas anteriores" + (" de cirurgia da mão" if mao else " de ortopedia")]
    url = f"{d.SITE}{pasta}/"
    ld = d.ld_pagina(pasta, titulo, descricao, nome, dados["data"], sobre)
    ld[1] = ld_migalhas([("Orto Questões", d.SITE), ("Provas anteriores", f"{d.SITE}{PASTA}/"), (nome, url)])
    ld += [d.ld_recurso(pasta, f"{nome} comentado", descricao, "Prova anterior comentada",
                        [f"Preparação para {prova}" if not mao else "Preparação para a residência em cirurgia da mão"]),
           d.ld_faq(faq)]

    treino = d.link_treino(prova, [ano], area=area)
    corpo = [d.cabeca(pasta, titulo, descricao, ld, estilo=ESTILO)]
    garantias = ([f"{d.num(n_abertas)} comentadas aqui", f"{d.num(len(qs))} questões no site", "Gabarito da banca"] if n_abertas
                 else [f"{d.num(len(qs))} questões no site", "Gabarito da banca"])
    corpo.append(heroi(
        "Prova anterior" + (" · cirurgia da mão" if mao else ""),
        f"{d.esc(nome)}: <em>gabarito e prova {comentado}</em>",
        (f"{d.esc(nome)}, {d.esc(tipo)}: o que a prova cobrou e {n_abertas} questões comentadas na íntegra, com o gabarito da banca. "
         if n_abertas else f"{d.esc(nome)}, {d.esc(tipo)}: o que a prova cobrou, por assunto. ")
        + "A prova inteira fica no site, para fazer no tempo e revisar os erros depois.",
        nome,
        [(f"Fazer {art} {nome} no site", treino, "principal"), ("Criar conta grátis", d.CRIAR_CONTA, "claro")],
        garantias,
        nivel2=True,
    ))

    numeros = [(d.num(len(qs)), "questões no caderno"), (d.num(len(temas)), "assuntos" if mao else "grandes assuntos")]
    if com_imagem:
        numeros.append((d.num(com_imagem), "com imagem"))
    if anuladas:
        numeros.append((d.num(anuladas), "anuladas pela banca"))
    corpo.append('<section><h2>A prova em números</h2><ul class="numeros">'
                 + "".join(f"<li><b>{d.esc(a)}</b><span>{d.esc(b)}</span></li>" for a, b in numeros) + "</ul></section>")

    slug_tema = {t["nome"]: t["slug"] for t in dados["temas_paginas"]}
    corpo.append(f"""<section><h2>O que caiu em {d.esc(nome)}</h2>
<p class="sub">Questões válidas da edição por {"assunto" if mao else "grande assunto"}. Os temas com mais questões são os que a banca mais cobrou neste ano.</p>
{d.barras([(t, n, f"../questoes/{slug_tema[t]}.html" if t in slug_tema else "") for t, n in temas.most_common(12 if mao else None)])}
{'' if mao else '<p style="margin-top:1rem">Assuntos específicos que mais apareceram: ' + d.esc(", ".join(s for s, n in subtemas.most_common(8) if n > 1)) + '.</p>' if any(n > 1 for n in subtemas.values()) else ''}
</section>""")

    # Amostra aberta: as questões escolhidas, na ordem da prova, com o comentário; o resto fica no site.
    abertas_ids = set(ABERTAS.get(slug(prova, ano), []))
    abertas = [q for q in qs if q["id"] in abertas_ids]
    fechadas = len(qs) - len(abertas)
    if abertas:
        itens = "".join(questao_aberta(q, i + 1, (q.get("subtemas") or [assunto_de(q)])[0]) for i, q in enumerate(abertas))
        corpo.append(f"""<section id="questoes"><h2>{d.num(len(abertas))} questões {artigo} {d.esc(nome)} comentadas</h2>
<p class="sub">Uma amostra da prova, de vários assuntos, com o enunciado, as alternativas e o comentário de cada uma. Tente responder antes de abrir o gabarito.</p>
{itens}
<div class="aviso"><p><strong>As outras {d.num(fechadas)} questões {artigo} {d.esc(nome)}</strong> estão no site, com o gabarito da banca e o
comentário de cada alternativa. Faça a prova inteira no tempo ou treine por assunto, e o que errar volta na revisão.</p>
<p style="margin-top:.6rem"><a class="botao principal" href="{treino}">Fazer {art} {d.esc(nome)} completa</a></p></div></section>""")
    else:
        corpo.append(f"""<section id="questoes"><h2>As questões {artigo} {d.esc(nome)}</h2>
<div class="aviso"><p>As {d.num(len(qs))} questões {artigo} {d.esc(nome)} estão no site, com o gabarito da banca.</p>
<p style="margin-top:.6rem"><a class="botao principal" href="{treino}">Fazer {art} {d.esc(nome)} no site</a></p></div></section>""")

    pos = anos.index(ano)
    anterior = anos[pos - 1] if pos > 0 else None
    seguinte = anos[pos + 1] if pos + 1 < len(anos) else None
    viz = ""
    if anterior or seguinte:
        viz = '<div class="vizinhas">' + (
            f'<a class="botao cheio" href="../{PASTA}/{slug(prova, anterior)}/">← {d.esc(nome_prova(prova))} {anterior}</a>' if anterior else "<span></span>"
        ) + (f'<a class="botao cheio" href="../{PASTA}/{slug(prova, seguinte)}/">{d.esc(nome_prova(prova))} {seguinte} →</a>' if seguinte else "") + "</div>"
    corpo.append(f"""<section><h2>Outros anos de {d.esc(nome_prova(prova))}</h2>
{anos_links(prova, anos, ano, cont)}{viz}
<p style="margin-top:1rem"><a href="../{PASTA}/">Todas as provas anteriores: TEOT, TARO e cirurgia da mão</a></p></section>""")
    if mao:
        corpo.append(f"""<section><div class="aviso"><p><strong>E o título da SBCM e o SIMÃO?</strong> As provas de título não estão
no acervo. Para treinar o formato e os assuntos delas, o site tem OrtoQuestões Simulados no padrão da
<a href="{d.link_treino("SBCM", area="mao")}">SBCM</a> e do <a href="{d.link_treino("SIMÃO", area="mao")}">SIMÃO</a>: questões autorais,
escritas a partir da bibliografia, sem caráter oficial e sem vínculo com a SBCM.</p></div></section>""")
    corpo.append(d.faq_html(faq))
    corpo.append(d.chamada(f"Faça {art} {nome} no tempo de prova",
                           "A conta é grátis. No modo estudo, o comentário aparece depois de cada questão; no modo prova, só no fim, como no dia."))
    corpo.append(d.relacionados(PASTA, [] if mao else [
        ("../guias/questoes-teot-por-ano.html", "Provas do TEOT ano a ano", "Os assuntos que cada edição cobrou."),
        ("../guias/provas-anteriores-do-taro.html", "TARO: como usar as provas anteriores", "Uma prova por mês, desde o R1."),
    ]))
    corpo.append(d.rodape())
    return subir("\n".join(corpo)), {"pasta": pasta, "titulo": titulo, "descricao": descricao}


# ---------------------------------------------------------------- índice

def pagina_indice(dados: dict, grupos: dict) -> tuple[str, dict]:
    por = defaultdict(Counter)
    for (prova, ano), qs in grupos.items():
        por[prova][ano] = len(qs)
    anos_teot, anos_taro = sorted(por["TEOT"]), sorted(por["TARO"])
    provas_mao = [p for p in d.PROVAS_MAO if por.get(p)]
    n_mao = sum(len(por[p]) for p in provas_mao)
    titulo = "Provas anteriores do TEOT e do TARO com gabarito, ano a ano | Orto Questões"
    descricao = (f"Provas anteriores do TEOT ({d.faixa(anos_teot)}) e do TARO ({d.faixa(anos_taro)}) com gabarito e comentário, e {n_mao} provas de "
                 "residência em cirurgia da mão. Cada edição com 20 questões comentadas na íntegra e o que mais caiu.")
    faq = [
        ("Onde encontrar as provas anteriores do TEOT?",
         f"Aqui estão as provas do TEOT de {d.faixa(anos_teot)}, uma página por ano, com as questões separadas por assunto, "
         "o gabarito da banca e o que cada edição cobrou. No site, dá para fazer cada prova no tempo e ler o comentário de todas as alternativas."),
        ("E as provas anteriores do TARO?",
         f"O acervo tem o TARO de {d.faixa(anos_taro)}, um ano por página. Os cadernos são divulgados pela Comissão de Ensino e Treinamento "
         "da SBOT; aqui eles estão transcritos, com gabarito e comentário."),
        ("Tem provas anteriores de cirurgia da mão?",
         "Sim, as provas de seleção para a residência em cirurgia da mão: " + ", ".join(nome_prova(p) for p in provas_mao)
         + ". As provas de título da SBCM e o SIMÃO não estão no acervo; para elas há OrtoQuestões Simulados no padrão das provas, "
         "autorais e sem vínculo com a SBCM."),
        ("O gabarito é o oficial?",
         "Sim, é o da banca. Questões anuladas ficam marcadas e não contam no desempenho."),
        ("Por onde começar?",
         "Pela prova mais recente da sua prova-alvo, no modo prova, para medir onde você está. Depois, uma edição anterior por semana, "
         "revisando os erros em outro dia. Quem está no R1 pode começar pelo TARO."),
    ]
    ld = d.ld_pagina(PASTA, titulo, descricao, "Provas anteriores", dados["data"],
                     ["TEOT", "TARO", "Provas anteriores de ortopedia", "Provas anteriores de cirurgia da mão"], tipo="CollectionPage")
    ld += [d.ld_faq(faq)]
    corpo = [d.cabeca(PASTA, titulo, descricao, ld, estilo=ESTILO)]
    corpo.append(d.heroi(
        "Anos anteriores",
        "Provas anteriores <em>do TEOT, do TARO e de cirurgia da mão</em>",
        "Uma página para cada edição: as questões separadas por assunto, o gabarito da banca e o que aquele ano mais cobrou. "
        "Escolha a prova e o ano, veja o que caiu e faça a prova no site, no tempo.",
        "Provas anteriores",
        [("Provas do TEOT", "#teot", "principal"), ("Provas do TARO", "#taro", "claro"), ("Cirurgia da mão", "#mao", "claro")],
        [f"TEOT: {len(anos_teot)} anos", f"TARO: {len(anos_taro)} anos", f"Cirurgia da mão: {n_mao} edições", "Gabarito da banca"],
    ))
    corpo.append(f"""<section id="teot"><h2>TEOT: provas anteriores</h2>
<p class="sub">{d.esc(NOME_LONGO["TEOT"])}. Toque no ano para ver as questões e o que caiu.</p>
{anos_links("TEOT", anos_teot, None, por["TEOT"])}
<p style="margin-top:1rem"><a href="../teot/">Como o TEOT se organiza e como se preparar</a></p></section>
<section id="taro"><h2>TARO: provas anteriores</h2>
<p class="sub">{d.esc(NOME_LONGO["TARO"])}, do R1 ao R3. Toque no ano.</p>
{anos_links("TARO", anos_taro, None, por["TARO"])}
<p style="margin-top:1rem"><a href="../guias/provas-anteriores-do-taro.html">Como usar as provas anteriores do TARO</a></p></section>""")
    blocos = "".join(
        f"<div><h3>{d.esc(d.NOMES_MAO.get(p, p))}</h3>{anos_links(p, sorted(por[p]), None, por[p])}</div>" for p in provas_mao
    )
    corpo.append(f"""<section id="mao"><h2>Cirurgia da mão: provas anteriores</h2>
<p class="sub">Provas de seleção para a residência em cirurgia da mão, transcritas dos cadernos, com o nome da banca, o ano e o gabarito oficial.</p>
<div class="familia">{blocos}</div>
<div class="aviso" style="margin-top:1.2rem"><p><strong>Título da SBCM e SIMÃO.</strong> As provas de título não estão no acervo. Para treinar
o formato delas, há OrtoQuestões Simulados no padrão da <a href="{d.link_treino("SBCM", area="mao")}">SBCM</a> e do
<a href="{d.link_treino("SIMÃO", area="mao")}">SIMÃO</a>, autorais e sem vínculo com a SBCM. <a href="../cirurgia-da-mao/">Mais sobre cirurgia da mão no site</a>.</p></div>
</section>""")
    corpo.append("""<section><h2>Como estudar com as provas anteriores</h2><div class="cartoes">
<div class="cartao"><span class="n">1</span><h3>Comece pela mais recente</h3><p>Faça a última edição da sua prova no modo prova, no tempo. É o retrato de onde você está.</p></div>
<div class="cartao"><span class="n">2</span><h3>Uma edição por semana</h3><p>Volte um ano por vez. Leia o comentário de todas as alternativas, inclusive das que acertou.</p></div>
<div class="cartao"><span class="n">3</span><h3>Revise em outro dia</h3><p>O que errou volta sozinho na revisão espaçada; no retorno, as alternativas vêm em outra ordem, para você raciocinar e não decorar a letra.</p></div>
</div></section>""")
    corpo.append(d.faq_html(faq))
    corpo.append(d.chamada("Escolha um ano e comece", "A conta é grátis. Faça a prova no modo estudo, com o comentário depois de cada questão, ou no modo prova, com tempo."))
    corpo.append(d.relacionados(PASTA))
    corpo.append(d.rodape())
    return "\n".join(corpo), {"pasta": PASTA, "titulo": titulo, "descricao": descricao}


def principal() -> int:
    dados = d.carregar_dados()
    grupos = edicoes(dados)
    if not grupos:
        print("erro: nenhuma edição encontrada", file=sys.stderr)
        return 1
    por = defaultdict(Counter)
    for (prova, ano), qs in grupos.items():
        por[prova][ano] = len(qs)
    destino = DIR_PUBLICO / PASTA
    if destino.exists():
        import shutil
        shutil.rmtree(destino)
    texto, _ = pagina_indice(dados, grupos)
    destino.mkdir(parents=True)
    (destino / "index.html").write_text(texto, encoding="utf-8")
    for (prova, ano), qs in sorted(grupos.items()):
        texto, meta = pagina_edicao(dados, prova, ano, qs, sorted(por[prova]), por[prova])
        alvo = DIR_PUBLICO / meta["pasta"]
        alvo.mkdir(parents=True, exist_ok=True)
        (alvo / "index.html").write_text(texto, encoding="utf-8")
    print(f"provas anteriores: índice e {len(grupos)} edições em public/{PASTA}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
