"""
Páginas públicas para quem procura provas antigas e cursos de subespecialidade (pedido do Tales, 14/11/2026:
"páginas SEO para pescar pessoas escrevendo provas antigas SIMÃO, provas antigas SBCM, provas antigas R4 coluna, curso
cirurgia da mão"). Chamadas por gerar_paginas_destino.py (mesmo cabeçalho, estilo e rodapé); entram no sitemap pela
lista PAGINAS_EXTRAS de lá.

Cada página responde com informação verdadeira, tirada do acervo a cada publicação (nada de página feita só de
palavra-chave, ver gerar_paginas_seo.py):
- /provas-antigas-simao/ e /provas-antigas-sbcm/: o que é a prova, os assuntos que mais caem no padrão dela e como
  treinar. As provas oficiais da SBCM e do SIMÃO NÃO estão no acervo: as questões são OrtoQuestões Simulados,
  autorais, no padrão da prova, e a página diz isso logo no começo (regra de gerar_provas_anteriores.py).
- /provas-antigas-r4-coluna/: as provas reais de seleção para o R4 de cirurgia da coluna que o acervo tem (banca e
  ano), os assuntos que mais caem e a ligação para treinar cada edição.
- /curso-cirurgia-da-mao/: para quem procura curso para a prova de título ou para a residência em cirurgia da mão.
  O site não tem videoaulas e diz isso; mostra o que ele tem de verdade (questões, cronograma, resumos, flashcards).
Regras: sem o total do acervo, sem preço, sem datas de prova e nenhum nome de outra marca ou curso.
"""

from __future__ import annotations

from collections import Counter

from gerar_paginas_destino import (DIR_PUBLICO, PROVAS_MAO, barras, cabeca, chamada, esc, eh_mao, faq_html, heroi, ld_faq,
                                   ld_pagina, ld_recurso, link_edicao, link_treino, num, relacionados, resumir, rodape)

PROVAS_COLUNA = ["R4 Coluna SES-DF", "R4 Coluna Joinville"]
NOMES_COLUNA = {"R4 Coluna SES-DF": "SES-DF (Secretaria de Saúde do Distrito Federal)", "R4 Coluna Joinville": "Hospital São José (Joinville)"}

PAGINAS_PROVAS_ANTIGAS = [
    ("provas-antigas-simao", "Provas antigas do SIMÃO"),
    ("provas-antigas-sbcm", "Provas antigas da SBCM"),
    ("provas-antigas-r4-coluna", "Provas antigas do R4 de coluna"),
    ("curso-cirurgia-da-mao", "Curso de cirurgia da mão"),
]
DESCRICOES = {
    "provas-antigas-simao": "O que cai no SIMÃO e como treinar no padrão da prova.",
    "provas-antigas-sbcm": "A prova de título da SBCM: assuntos e treino no padrão.",
    "provas-antigas-r4-coluna": "Seleções reais para o R4 de cirurgia da coluna, por ano.",
    "curso-cirurgia-da-mao": "Questões, cronograma e resumos para o título e a residência.",
}


def _principal(q: dict) -> str:
    s = (q.get("subtemas") or [""])[0]
    return "" if not s or s.startswith("Outr") else s


def _ranking(lista: list[dict]) -> Counter:
    return Counter(_principal(q) for q in lista if not q.get("anulada") and _principal(q))


def _barras_rank(contagem: Counter, n: int = 10) -> str:
    return barras([(nome, c, "") for nome, c in contagem.most_common(n)])


def _exemplos(lista: list[dict], n: int = 6) -> str:
    """Questões com página pública própria (gerar_paginas_seo.py), uma por assunto."""
    vistos, itens = set(), []
    for q in lista:
        if q.get("anulada") or q.get("imagens") or _principal(q) in vistos:
            continue
        pagina = DIR_PUBLICO / "questoes" / q["tema_slug"] / f"{q['id']}.html"
        if not pagina.exists():
            continue
        vistos.add(_principal(q))
        # Questão autoral no padrão da prova (SBCM, SIMÃO) nunca leva o ano: não é a prova oficial daquele ano.
        rotulo = f"No padrão {'da' if q.get('prova') == 'SBCM' else 'do'} {q.get('prova', '')}" if q.get("simulado") else f"{q.get('prova', '')} {q.get('ano') or ''}".strip()
        itens.append(f'<li><a href="../questoes/{q["tema_slug"]}/{esc(q["id"])}.html"><b>{esc(rotulo)} · {esc(_principal(q) or q["tema_nome"])}</b>'
                     f'<span>{esc(resumir(q.get("enunciado", ""), 130))}</span></a></li>')
        if len(itens) >= n:
            break
    if not itens:
        return ""
    return (f'<section><h2>Algumas questões para ver agora</h2><p class="sub">Abra para ler o enunciado e as alternativas e responda '
            f'no site, com o gabarito e o comentário de cada alternativa.</p><ul class="relacionados">{"".join(itens)}</ul></section>')


def _outras(pasta: str) -> list[tuple[str, str, str]]:
    return [(f"../{p}/", r, DESCRICOES[p]) for p, r in PAGINAS_PROVAS_ANTIGAS if p != pasta]


# ---------------------------------------------------------------- SIMÃO e SBCM

def _pagina_titulo_mao(d: dict, prova: str) -> tuple[str, dict]:
    simao = prova == "SIMÃO"
    pasta = "provas-antigas-simao" if simao else "provas-antigas-sbcm"
    nome = "SIMÃO" if simao else "prova de título da SBCM"
    titulo = (f"Provas antigas do SIMÃO: o que cai e como treinar | Orto Questões" if simao
              else "Provas antigas da SBCM (título de cirurgia da mão): o que cai e como treinar | Orto Questões")
    descricao = (f"Procurando provas antigas do {'SIMÃO' if simao else 'título da SBCM'}? Veja os assuntos que mais caem e treine com "
                 "questões comentadas no padrão da prova, com o livro e a página de cada alternativa.")
    questoes = [q for q in d["simulados"] if q.get("prova") == prova and eh_mao(q)]
    outras = [q for q in d["simulados"] if q.get("prova") == ("SBCM" if simao else "SIMÃO") and eh_mao(q)]
    rank = _ranking(questoes)
    top = [n for n, _ in rank.most_common(5)]
    treino = link_treino(prova, area="mao")
    faq = [
        (f"Onde encontrar as provas antigas do {'SIMÃO' if simao else 'título da SBCM'}?",
         f"Os cadernos oficiais {'do SIMÃO' if simao else 'da prova de título'} são da Sociedade Brasileira de Cirurgia da Mão e não estão "
         "publicados no Orto Questões. O que o site oferece são OrtoQuestões Simulados: questões autorais, escritas a partir da "
         f"bibliografia de referência, no padrão {'do SIMÃO' if simao else 'da prova de título'}, para treinar o formato e os assuntos que caem."),
        (f"O que é o {'SIMÃO' if simao else 'título da SBCM'}?",
         "É o simulado do exame de título de especialista em cirurgia da mão, feito durante a formação." if simao else
         "É a prova de título de especialista da Sociedade Brasileira de Cirurgia da Mão, feita ao fim da residência na especialidade."),
        ("Quais assuntos mais caem?",
         (f"No padrão {'do SIMÃO' if simao else 'da prova de título'}, os assuntos com mais questões no acervo são "
          + ", ".join(n.lower() if i else n for i, n in enumerate(top)) + ". A lista completa, com a contagem, está nesta página.") if top
         else "A lista com a contagem por assunto está nesta página e no ranking do site."),
        ("As questões têm comentário?",
         "Sim. Cada alternativa, inclusive a correta, é comentada pela bibliografia de referência, com o livro e a página."),
        ("Como estudar com as provas antigas?",
         "Escolha um assunto que cai muito, leia o capítulo na bibliografia do edital, responda as questões do assunto e leia o comentário "
         "de todas as alternativas. Os erros voltam na revisão espaçada; a cada poucas semanas, faça um simulado inteiro no tempo."),
        ("Tem as provas de residência em cirurgia da mão também?",
         "Sim. As seleções para a residência (USP-SP, ENARE, INTO, UFG e outras) estão no acervo como provas reais, com o nome da banca, "
         "o ano e o gabarito oficial."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, f"Provas antigas {'do SIMÃO' if simao else 'da SBCM'}", d["data"],
                   ["Cirurgia da mão", "SBCM", "SIMÃO" if simao else "Título de especialista em cirurgia da mão", "Provas antigas"])
    ld += [ld_recurso(pasta, f"Questões no padrão {'do SIMÃO' if simao else 'da prova de título da SBCM'}", descricao, "Banco de questões",
                      ["Cirurgia da mão", "Microcirurgia", "Nervos periféricos", "Tendões da mão"]), ld_faq(faq)]
    corpo = [cabeca(pasta, titulo, descricao, ld)]
    corpo.append(heroi(
        "Cirurgia da mão",
        f"Provas antigas {'do <em>SIMÃO</em>' if simao else 'da <em>SBCM</em>'}",
        f"Os assuntos que mais caem {'no SIMÃO' if simao else 'na prova de título da SBCM'} e questões comentadas no padrão da prova, "
        "com o livro e a página de cada alternativa. Os cadernos oficiais não estão no site: as questões são autorais, no padrão da prova.",
        f"Provas antigas {'do SIMÃO' if simao else 'da SBCM'}",
        [(f"Treinar no padrão {'do SIMÃO' if simao else 'da SBCM'}", treino, "principal"), ("Criar conta grátis", "../#/conta?modo=criar&amp;voltar=%2Ftreinar", "claro")],
        ["Questões no padrão da prova", "Comentário de cada alternativa", "Grátis para começar"],
    ))
    corpo.append(f"""<section><h2>Por que não estão aqui os cadernos oficiais</h2>
<p>As provas {'do SIMÃO' if simao else 'de título'} são da Sociedade Brasileira de Cirurgia da Mão. O Orto Questões não publica nem
reproduz esses cadernos. No lugar, escrevemos <strong>OrtoQuestões Simulados</strong>: questões autorais a partir da bibliografia de
referência da especialidade, no formato e nos assuntos {'do SIMÃO' if simao else 'da prova de título'}, sem caráter oficial e sem
vínculo com a SBCM. É a forma honesta de treinar o que cai.</p></section>""")
    if rank:
        corpo.append(f"""<section><h2>Os assuntos que mais caem {'no SIMÃO' if simao else 'na prova de título'}</h2>
<p class="sub">Contagem das questões no padrão da prova, pelo assunto principal de cada uma. No site, o ranking se atualiza sozinho e vira
um cronograma até a data da sua prova.</p>
{_barras_rank(rank)}
<p><a href="../#/temas-que-mais-caem?prova=mao-titulo">Ver o ranking completo do título</a></p></section>""")
    corpo.append(f"""<section><h2>Como treinar com as provas antigas</h2>
<ol>
<li><strong>Comece pelo que mais cai</strong>: a lista acima mostra onde a prova concentra as questões.</li>
<li><strong>Leia o capítulo</strong> na bibliografia indicada no edital do ano.</li>
<li><strong>Responda as questões do assunto</strong> e leia o comentário de todas as alternativas, inclusive da certa.</li>
<li><strong>Revise os erros</strong> em outro dia: eles voltam sozinhos na revisão espaçada.</li>
<li><strong>Faça um simulado inteiro no tempo</strong> a cada poucas semanas, misturando {'o SIMÃO e a SBCM' if simao else 'a SBCM e o SIMÃO'},
com as questões no padrão de cada uma.</li>
</ol>
<p><a class="botao principal" href="../#/cronograma-mao?prova=titulo">Montar o cronograma do título</a></p></section>""")
    corpo.append(_exemplos(questoes))
    corpo.append(faq_html(faq))
    corpo.append(chamada("Treine no padrão da prova", "A conta é grátis. Escolha a categoria Cirurgia da mão e a prova "
                         + ("SIMÃO" if simao else "SBCM") + ", e veja em uma sessão quais assuntos pedem mais atenção."))
    corpo.append(relacionados(pasta, _outras(pasta)))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_provas_antigas_simao(d: dict) -> tuple[str, dict]:
    return _pagina_titulo_mao(d, "SIMÃO")


def pagina_provas_antigas_sbcm(d: dict) -> tuple[str, dict]:
    return _pagina_titulo_mao(d, "SBCM")


# ---------------------------------------------------------------- R4 de coluna

def pagina_provas_antigas_r4_coluna(d: dict) -> tuple[str, dict]:
    pasta = "provas-antigas-r4-coluna"
    questoes = [q for q in d["oficiais"] if q.get("prova") in PROVAS_COLUNA]
    por_prova = {p: Counter(q.get("ano") for q in questoes if q.get("prova") == p) for p in PROVAS_COLUNA}
    por_prova = {p: c for p, c in por_prova.items() if c}
    anos = sorted({q["ano"] for q in questoes if q.get("ano")})
    faixa = f"{anos[0]} a {anos[-1]}" if len(anos) > 1 else (str(anos[0]) if anos else "")
    titulo = "Provas antigas do R4 de cirurgia da coluna, comentadas | Orto Questões"
    descricao = (f"Provas antigas de seleção para o R4 de cirurgia da coluna ({', '.join(NOMES_COLUNA[p].split(' (')[0] for p in por_prova)}"
                 f"{', ' + faixa if faixa else ''}) com gabarito da banca e comentário de cada alternativa.")
    rank = _ranking(questoes)
    top = [n for n, _ in rank.most_common(5)]
    faq = [
        ("Onde encontrar as provas antigas do R4 de coluna?",
         "No Orto Questões estão as provas de seleção para o R4 de cirurgia da coluna transcritas dos cadernos, com o nome da banca, o ano "
         "e o gabarito oficial, e um comentário de cada alternativa. As editais e os cadernos originais são de cada instituição."),
        ("Quais provas de R4 de coluna estão no site?",
         "; ".join(f"{NOMES_COLUNA[p]}: {', '.join(str(a) for a in sorted(a for a in c if a)) or 'edição não identificada'}" for p, c in por_prova.items()) + "."),
        ("Quais assuntos mais caem na seleção do R4 de coluna?",
         ("No acervo, os assuntos com mais questões são " + ", ".join(n.lower() if i else n for i, n in enumerate(top)) + ".") if top
         else "A contagem por assunto está nesta página."),
        ("As questões de ortopedia geral ajudam?",
         "Sim. A seleção do R4 cobra a coluna com a base da ortopedia e traumatologia. Para completar, treine também as questões de coluna "
         "do TEOT e do TARO, que estão no mesmo site."),
        ("Dá para fazer a prova de um ano no tempo?",
         "Sim. Escolha a prova e o ano no treino; no modo prova, a sessão tem tempo marcado e as questões vêm na ordem do caderno."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Provas antigas do R4 de coluna", d["data"],
                   ["Cirurgia da coluna", "Residência médica R4", "Provas antigas", "Ortopedia"])
    ld += [ld_recurso(pasta, "Provas de seleção para o R4 de cirurgia da coluna comentadas", descricao, "Provas anteriores comentadas",
                      ["Cirurgia da coluna", "Ortopedia"]), ld_faq(faq)]
    corpo = [cabeca(pasta, titulo, descricao, ld)]
    corpo.append(heroi(
        "R4 de coluna",
        "Provas antigas do <em>R4 de cirurgia da coluna</em>",
        "As seleções reais para o R4 de coluna, transcritas dos cadernos, com o gabarito da banca e um comentário que percorre todas as "
        "alternativas. Escolha a prova e o ano e faça no tempo.",
        "Provas antigas do R4 de coluna",
        [("Treinar R4 de coluna", link_treino(area="coluna"), "principal"), ("Criar conta grátis", "../#/conta?modo=criar&amp;voltar=%2Ftreinar", "claro")],
        [f"{len(por_prova)} {'banca' if len(por_prova) == 1 else 'bancas'}", f"{len(anos)} {'ano' if len(anos) == 1 else 'anos'} de prova", "Gabarito oficial"],
    ))
    linhas = []
    for p, c in por_prova.items():
        com_ano = sorted(a for a in c if a)
        anos_html = ", ".join(f'<a href="{link_treino(p, [a], area="coluna")}">{a}</a>' for a in com_ano) or "–"
        linhas.append(f'<tr><th scope="row"><a href="{link_treino(p, area="coluna")}">{esc(NOMES_COLUNA[p])}</a></th><td>{anos_html}</td>'
                      f'<td class="num">{num(sum(c.values()))} questões</td></tr>')
    corpo.append(f"""<section><h2>As provas no site</h2>
<p class="sub">Toque na banca para treinar só com ela, ou no ano para fazer aquela edição.</p>
<table><caption class="so-leitor">Provas de seleção para o R4 de cirurgia da coluna no acervo</caption>
<thead><tr><th scope="col">Banca</th><th scope="col">Anos</th><th scope="col">Questões</th></tr></thead><tbody>{"".join(linhas)}</tbody></table></section>""")
    if rank:
        corpo.append(f"""<section><h2>Os assuntos que mais caem no R4 de coluna</h2>
<p class="sub">Contagem das questões das seleções do R4 de coluna no acervo, pelo assunto principal de cada uma.</p>
{_barras_rank(rank)}</section>""")
    corpo.append("""<section><h2>Como estudar para o R4 de coluna</h2>
<ol>
<li><strong>Faça uma prova antiga inteira no tempo</strong> logo no começo: ela mostra o formato e onde você está.</li>
<li><strong>Estude os assuntos que mais caem</strong>, um por vez, e responda as questões do assunto logo depois.</li>
<li><strong>Leia o comentário de todas as alternativas</strong>: a banca repete as armadilhas.</li>
<li><strong>Complete com a coluna do TEOT e do TARO</strong> e revise os erros em outro dia.</li>
</ol></section>""")
    corpo.append(_exemplos(questoes))
    corpo.append(faq_html(faq))
    corpo.append(chamada("Escolha uma prova e comece", "A conta é grátis. Faça a prova no modo estudo, com o comentário depois de cada questão, ou no modo prova, com tempo."))
    corpo.append(relacionados(pasta, _outras(pasta)))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


# ---------------------------------------------------------------- Curso de cirurgia da mão

def pagina_curso_cirurgia_mao(d: dict) -> tuple[str, dict]:
    pasta = "curso-cirurgia-da-mao"
    titulo = "Curso de cirurgia da mão para o título e a residência: questões, cronograma e resumos | Orto Questões"
    descricao = ("Preparação para a prova de título da SBCM, o SIMÃO e as provas de residência em cirurgia da mão: questões comentadas, "
                 "cronograma até a prova, resumos dos capítulos e flashcards.")
    oficiais = [q for q in d["oficiais"] if eh_mao(q)]
    titulo_q = [q for q in d["simulados"] if eh_mao(q) and q.get("prova") in ("SBCM", "SIMÃO")]
    provas = [p for p in PROVAS_MAO if any(q.get("prova") == p for q in oficiais)]
    edicoes = sorted({(q["prova"], q["ano"]) for q in oficiais if q.get("prova") and q.get("ano")})
    faq = [
        ("Existe curso preparatório para a prova de cirurgia da mão?",
         "O Orto Questões não é um curso de videoaulas. É a parte da preparação que treina a prova: questões comentadas, cronograma até a "
         "data da prova, resumos dos capítulos e flashcards. Funciona sozinho, com a bibliografia do edital, ou junto de um curso."),
        ("Serve para a prova de título e para a residência?",
         "Sim. Há dois cronogramas de cirurgia da mão: um para o ingresso (as seleções de residência) e outro para a prova de título, "
         "cada um com o seu ranking do que mais cai."),
        ("Quais provas de residência em cirurgia da mão estão no site?",
         (", ".join(provas[:-1]) + " e " + provas[-1] if len(provas) > 1 else "".join(provas)) + ", com o nome da banca, o ano e o gabarito oficial."),
        ("E as provas da SBCM e do SIMÃO?",
         "Os cadernos oficiais não estão no site. Há OrtoQuestões Simulados: questões autorais no padrão das duas provas, escritas a partir "
         "da bibliografia, sem vínculo com a SBCM."),
        ("Como funciona o cronograma?",
         "Você informa a data da prova, os dias e o tempo de estudo. O plano distribui as questões pelos dias, começando pelo que mais cai, "
         "e se ajusta sozinho quando você adianta ou atrasa. Dá para recomeçar do zero quando quiser."),
        ("É grátis?",
         "Criar a conta é grátis e já permite treinar e ver os comentários. Os planos acrescentam recursos como o cronograma completo; "
         "o que cada plano inclui está na página de planos do site."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Curso de cirurgia da mão", d["data"],
                   ["Cirurgia da mão", "Curso preparatório", "SBCM", "SIMÃO", "Residência médica em cirurgia da mão"])
    ld += [ld_recurso(pasta, "Preparação para a prova de cirurgia da mão", descricao, "Curso", ["Cirurgia da mão", "Microcirurgia"]), ld_faq(faq)]
    corpo = [cabeca(pasta, titulo, descricao, ld)]
    corpo.append(heroi(
        "Cirurgia da mão",
        "Curso de cirurgia da mão: <em>treine a prova</em>",
        "Para a prova de título da SBCM, o SIMÃO e as seleções de residência. Questões comentadas pela bibliografia, um cronograma até a "
        "data da sua prova, resumos dos capítulos e flashcards, no mesmo lugar.",
        "Curso de cirurgia da mão",
        [("Montar o cronograma", "../#/cronograma-mao", "principal"), ("Criar conta grátis", "../#/conta?modo=criar&amp;voltar=%2Ftreinar", "claro")],
        [f"{len(provas)} provas de residência", f"{len(edicoes)} edições", "SBCM e SIMÃO no padrão do título"],
    ))
    corpo.append(f"""<section><h2>O que o site tem para a cirurgia da mão</h2>
<ul class="relacionados">
<li><a href="{link_treino(area="mao")}"><b>Questões comentadas</b><span>As seleções de residência reais e
as questões no padrão da SBCM e do SIMÃO, com o comentário de cada alternativa, o livro e a página.</span></a></li>
<li><a href="../#/cronograma-mao"><b>Cronograma até a prova</b><span>Ingresso ou título: a meta do dia, na ordem do que mais cai, com
recomeço e semana difícil.</span></a></li>
<li><a href="../resumos/"><b>Resumos dos capítulos</b><span>Os capítulos de cirurgia da mão na ordem em que a prova cobra, com as
questões que já caíram no meio do texto.</span></a></li>
<li><a href="../#/flashcards"><b>Flashcards</b><span>Classificações, epônimos e números para revisar entre um plantão e outro.</span></a></li>
</ul></section>""")
    corpo.append("""<section><h2>Curso ou questões?</h2>
<p>Quem procura um curso de cirurgia da mão precisa de três coisas: organizar a teoria, treinar no formato da prova e não esquecer o que já
estudou. Aulas ajudam na primeira. Questões comentadas, cronograma e revisão resolvem as outras duas. O Orto Questões é essa segunda parte:
funciona com a bibliografia do edital e combina com qualquer curso.</p>
<p>As datas, os pré-requisitos e a bibliografia de cada prova estão no edital da SBCM e de cada serviço: confira sempre a versão do ano.</p></section>""")
    corpo.append(_exemplos(oficiais))
    corpo.append(faq_html(faq))
    corpo.append(chamada("Comece pela cirurgia da mão", "A conta é grátis. Escolha a categoria Cirurgia da mão e responda uma prova de residência ou um simulado no padrão do título."))
    corpo.append(relacionados(pasta, _outras(pasta) + [("../cirurgia-da-mao/", "Questões de cirurgia da mão", "Título da SBCM, SIMÃO e provas de residência.")]))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


GERADORES_PROVAS_ANTIGAS = [pagina_provas_antigas_simao, pagina_provas_antigas_sbcm, pagina_provas_antigas_r4_coluna, pagina_curso_cirurgia_mao]
