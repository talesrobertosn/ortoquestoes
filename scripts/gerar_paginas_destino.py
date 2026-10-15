#!/usr/bin/env python3
"""
Gera as páginas de destino públicas (uma pasta por página, com index.html) e
os arquivos para assistentes de IA (llms.txt e llms-full.txt) em public/.

Por que existem. O aplicativo roda por hash (#/treinar), e o Google descarta o
fragmento: para ele o site inteiro é a raiz. As páginas por assunto e por
questão (gerar_paginas_seo.py) cobrem quem procura um tema específico; estas
cobrem quem procura o site pelo que ele é: "banco de questões de ortopedia",
"TEOT", "questões do TARO", "curso de ortopedia para R1", "simulado TEOT",
"flashcards de ortopedia". Cada uma responde a pergunta de quem busca com
informação verdadeira e útil, e só depois convida para o aplicativo.

Regras (as mesmas das outras páginas públicas):
- Nada inventado: os números (provas, anos, edições, questões por prova e por
  assunto) saem do acervo a cada deploy; datas de prova, nunca (cada edital
  da SBOT define as suas).
- Sem o número total de questões do acervo (regra da marca em
  docs/marketing/orientacoes.md). Para mudar, troque MOSTRAR_TOTAL.
- Sem preço e sem benefício que o site não afirme: os planos ficam em #/assinatura.
- Cirurgia da mão é outra especialidade; Fellowship de Quadril, nunca "SBQ";
  nenhum nome de curso preparatório; "Flashcards", nunca "Cripta".
- Sem JavaScript: as páginas funcionam e são lidas por qualquer rastreador.

Rode depois de gerar_paginas_seo.py (os exemplos de questão apontam para as
páginas que ele cria) e antes de gerar_sitemap.py:

    python3 scripts/gerar_paginas_seo.py && python3 scripts/gerar_guias_seo.py \
      && python3 scripts/gerar_paginas_destino.py && python3 scripts/gerar_sitemap.py
"""

from __future__ import annotations

import datetime as dt
import html
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import CAMINHO_INDICE, DIR_ACERVO, DIR_PUBLICO, DIR_TEMAS, RAIZ, carregar_taxonomia, ler_json  # noqa: E402

SITE = "https://ortoquestoes.com.br/"
MOSTRAR_TOTAL = False

# Páginas: (pasta, rótulo curto do menu). A ordem é a do menu.
PAGINAS = [
    ("banco-de-questoes-ortopedia", "Banco de questões"),
    ("teot", "TEOT"),
    ("questoes-teot-taro", "Provas anteriores"),
    ("curso-ortopedia-r1", "R1"),
    ("simulado-teot", "Simulados"),
    ("flashcards-ortopedia", "Flashcards"),
]

CRIAR_CONTA = "../#/conta?modo=criar&amp;voltar=%2Ftreinar"

# Grupos de provas, na ordem de exibição. Prova que não estiver aqui cai em "Outras provas".
GRUPOS = [
    ("Ortopedia e traumatologia: título e residência", "base", ["TEOT", "TARO", "TEOT/TARO", "SBOT-SP", "CET-PR"]),
    ("Títulos de subespecialidade", "base", ["TECOC/SBCOC Ombro e Cotovelo", "TEPOP"]),
    ("Seleções de R4", None, ["ENARE R4 Ortopedia", "R4 Coluna SES-DF", "R4 Coluna Joinville"]),
    ("Cirurgia da mão (outra especialidade, com categoria própria)", "mao",
     ["USP-SP", "PUC-SP", "UFG", "INTO", "FMRP-USP", "Einstein", "IAUPE", "UERJ"]),
]
NOMES_PROVA = {
    "TEOT": "TEOT (SBOT): Título de Especialista em Ortopedia e Traumatologia",
    "TARO": "TARO (SBOT): avaliação anual dos residentes",
    "TEOT/TARO": "TEOT/TARO: questões sem edição identificada",
    "TECOC/SBCOC Ombro e Cotovelo": "TECOC (SBCOC): título em cirurgia do ombro e cotovelo",
    "TEPOP": "TEPOP (SBOP): título em ortopedia pediátrica",
    "ENARE R4 Ortopedia": "ENARE: R4 de ortopedia",
    "R4 Coluna SES-DF": "R4 de cirurgia da coluna: SES-DF",
    "R4 Coluna Joinville": "R4 de cirurgia da coluna: Hospital São José (Joinville)",
    "UERJ": "UERJ (prova discursiva)",
}
# Categoria do treino no aplicativo (parâmetro areas= de #/treinar).
AREA_DA_PROVA = {"ENARE R4 Ortopedia": "enare", "R4 Coluna SES-DF": "coluna", "R4 Coluna Joinville": "coluna"}


def esc(texto) -> str:
    return html.escape(str(texto if texto is not None else ""), quote=True)


def num(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def link_treino(prova: str | None = None, anos: list[int] | None = None, area: str | None = None, extra: str = "") -> str:
    partes = []
    if area and area != "base":
        partes.append(f"areas={area}")
    if prova:
        partes.append("provas=" + quote(prova, safe=""))
    if anos:
        partes.append("anos=" + ",".join(str(a) for a in anos))
    if extra:
        partes.append(extra)
    return "../#/treinar" + ("?" + "&amp;".join(partes) if partes else "")


# ---------------------------------------------------------------- dados

def carregar_dados() -> dict:
    taxonomia = carregar_taxonomia()
    questoes: list[dict] = []
    for tema in taxonomia["temas"]:
        dados = ler_json(DIR_TEMAS / f"{tema['slug']}.json", None)
        if not dados:
            continue
        for q in dados["questoes"] if isinstance(dados, dict) else dados:
            questoes.append(dict(q, tema_slug=tema["slug"], tema_nome=tema["nome"]))
    unicas = [q for q in questoes if not q.get("duplicataDe")]
    oficiais = [q for q in unicas if not q.get("simulado")]
    simulados = [q for q in unicas if q.get("simulado")]

    por_prova: dict[str, Counter] = defaultdict(Counter)
    for q in oficiais:
        if q.get("prova"):
            por_prova[q["prova"]][q.get("ano")] += 1

    anos = sorted({q["ano"] for q in oficiais if q.get("ano")})
    edicoes = {(q["prova"], q["ano"]) for q in oficiais if q.get("prova") and q.get("ano")}

    # Assuntos que mais aparecem no TEOT e no TARO, por tema.
    tt = Counter(q["tema_nome"] for q in oficiais if q.get("prova") in ("TEOT", "TARO", "TEOT/TARO"))

    # Exemplos de questão com página própria (gerada por gerar_paginas_seo.py).
    exemplos = []
    for prova, ano in (("TEOT", max(por_prova["TEOT"] or {0: 0}, key=lambda a: a or 0)),
                       ("TARO", max(por_prova["TARO"] or {0: 0}, key=lambda a: a or 0))):
        vistos_temas = set()
        for q in oficiais:
            if q.get("prova") != prova or q.get("ano") != ano or q.get("anulada") or q.get("imagens"):
                continue
            if q["tema_slug"] in vistos_temas:
                continue
            pagina = DIR_PUBLICO / "questoes" / q["tema_slug"] / f"{q['id']}.html"
            if not pagina.exists():
                continue
            vistos_temas.add(q["tema_slug"])
            exemplos.append(q)
            if len(vistos_temas) >= 4:
                break

    temas_paginas = [t for t in taxonomia["temas"] if (DIR_PUBLICO / "questoes" / f"{t['slug']}.html").exists()]
    temas_com_questoes = [t for t in taxonomia["temas"] if any(q["tema_slug"] == t["slug"] for q in unicas)]

    incidencia = ler_json(RAIZ / "src" / "dados" / "incidencia.json", {}) or {}
    flashcards = ler_json(DIR_PUBLICO / "flashcards" / "indice.json", {}) or {}

    try:
        gerado = json.loads(CAMINHO_INDICE.read_text(encoding="utf-8")).get("geradoEm", "")
        data = dt.datetime.fromisoformat(gerado).date().isoformat()
    except (OSError, ValueError, AttributeError):
        data = dt.date.today().isoformat()

    return {
        "total": len(unicas),
        "comentadas": sum(1 for q in unicas if q["id"] in comentados()),
        "oficiais": oficiais,
        "simulados": simulados,
        "por_prova": por_prova,
        "anos": anos,
        "edicoes": len(edicoes),
        "provas": sorted(por_prova),
        # "TEOT/TARO" reúne questões sem edição identificada: não é outra prova.
        "n_provas": len([p for p in por_prova if p != "TEOT/TARO"]),
        "tt": tt,
        "exemplos": exemplos,
        "temas_paginas": temas_paginas,
        "temas_com_questoes": temas_com_questoes,
        "incidencia": incidencia,
        "flashcards": flashcards,
        "data": data,
    }


_COMENTADOS: set[str] | None = None


def comentados() -> set[str]:
    global _COMENTADOS
    if _COMENTADOS is None:
        _COMENTADOS = set()
        for arquivo in (DIR_ACERVO / "comentarios").glob("*.json"):
            _COMENTADOS |= set((ler_json(arquivo, {}) or {}).keys())
    return _COMENTADOS


def faixa(anos) -> str:
    anos = sorted(a for a in anos if a)
    if not anos:
        return "edição não identificada"
    return str(anos[0]) if anos[0] == anos[-1] else f"{anos[0]} a {anos[-1]}"


# ---------------------------------------------------------------- moldura

ESTILO = """
:root{--fundo:#f1f3f2;--sup:#fff;--sup2:#f7f9f8;--texto:#12181a;--texto2:#55625f;--traco:#dce2e0;
--marca:#14655e;--marca-escura:#0b3a35;--veu:#e3efed;--ouro:#f4cf7c;--ouro-escuro:#8a6416;--ouro-veu:#fbf1d9;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--fundo:#0f1413;--sup:#171e1d;--sup2:#1d2625;--texto:#e7ecea;--texto2:#9eaba7;
--traco:#2a3432;--marca:#4fb3a5;--marca-escura:#0b2e2a;--veu:#17302e;--ouro-escuro:#f4cf7c;--ouro-veu:#30281a;color-scheme:dark}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--fundo);color:var(--texto);font:1.0625rem/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
a{color:var(--marca)}img{max-width:100%}
.env{max-width:62rem;margin:0 auto;padding:0 1rem}
.topo{background:var(--sup);border-bottom:1px solid var(--traco)}
.topo .env{display:flex;align-items:center;gap:.75rem 1.25rem;flex-wrap:wrap;padding-block:.7rem}
.marca{display:flex;align-items:center;gap:.55rem;color:var(--texto);text-decoration:none;font-size:1.12rem;letter-spacing:-.01em}
.marca img{width:30px;height:30px;border-radius:8px}.marca b{font-weight:800}
.topo nav{display:flex;gap:.35rem;overflow-x:auto;max-width:100%;margin-left:auto;scrollbar-width:none;font-size:.92rem}
.topo nav::-webkit-scrollbar{display:none}
.topo nav a{white-space:nowrap;text-decoration:none;color:var(--texto2);padding:.35rem .65rem;border-radius:999px}
.topo nav a[aria-current]{background:var(--veu);color:var(--marca);font-weight:700}
.topo nav a.app{background:var(--marca);color:#fff;font-weight:700}
@media (max-width:44rem){.topo nav{margin-left:0;width:100%}}
.heroi{background:radial-gradient(120% 140% at 100% 0%,#1c7d73 0%,#14655e 38%,#0b3a35 100%);color:#fff}
.heroi .env{padding-block:2.6rem 2.8rem}
.selo{display:inline-block;margin:0 0 .9rem;padding:.25rem .7rem;border-radius:999px;background:rgba(244,207,124,.16);color:var(--ouro);font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.heroi h1{font-size:clamp(1.85rem,5.4vw,2.9rem);line-height:1.12;letter-spacing:-.02em;margin:0 0 1rem;max-width:22em}
.heroi h1 em{font-style:normal;color:var(--ouro)}
.lide{font-size:1.12rem;max-width:40em;margin:0 0 1.5rem;color:#e4f1ee}
.acoes{display:flex;flex-wrap:wrap;gap:.7rem}
.botao{display:inline-block;padding:.8rem 1.25rem;border-radius:12px;font-weight:700;text-decoration:none;line-height:1.3}
.botao.principal{background:var(--ouro);color:#2b2105}
.botao.claro{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35)}
.botao.cheio{background:var(--marca);color:#fff}
.garantias{display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;margin:1.4rem 0 0;padding:0;list-style:none;font-size:.9rem;color:#cfe5e0}
.garantias li::before{content:"✓ ";color:var(--ouro);font-weight:800}
main section{padding-block:2.4rem 0}
h2{font-size:clamp(1.35rem,3.6vw,1.75rem);line-height:1.2;letter-spacing:-.01em;margin:0 0 .8rem}
h3{font-size:1.08rem;margin:0 0 .4rem}
p{margin:0 0 .9rem}
.sub{color:var(--texto2);max-width:44em}
.numeros{display:grid;grid-template-columns:repeat(auto-fit,minmax(10.5rem,1fr));gap:.8rem;margin:0;padding:0;list-style:none}
.numeros li{background:var(--sup);border:1px solid var(--traco);border-radius:16px;padding:1rem 1.1rem}
.numeros b{display:block;font-size:1.7rem;line-height:1.1;color:var(--marca);letter-spacing:-.02em}
.numeros span{font-size:.9rem;color:var(--texto2)}
.cartoes{display:grid;grid-template-columns:repeat(auto-fit,minmax(15.5rem,1fr));gap:.9rem}
.cartao{background:var(--sup);border:1px solid var(--traco);border-radius:18px;padding:1.15rem 1.2rem}
.cartao p{margin:0;color:var(--texto2);font-size:.98rem}
.cartao .n{display:inline-grid;place-items:center;width:1.9rem;height:1.9rem;border-radius:50%;background:var(--veu);color:var(--marca);font-weight:800;margin-bottom:.5rem}
.tabela{overflow-x:auto;background:var(--sup);border:1px solid var(--traco);border-radius:16px}
table{width:100%;border-collapse:collapse;font-size:.95rem}
caption{text-align:left;padding:.9rem 1rem .2rem;font-weight:800}
th,td{padding:.6rem 1rem;text-align:left;vertical-align:top;border-bottom:1px solid var(--traco)}
tr:last-child td{border-bottom:0}th{font-size:.82rem;text-transform:uppercase;letter-spacing:.04em;color:var(--texto2)}
td.num{white-space:nowrap;font-variant-numeric:tabular-nums}
.anos{display:flex;flex-wrap:wrap;gap:.45rem;margin:0;padding:0;list-style:none}
.anos a{display:block;padding:.45rem .75rem;border-radius:12px;background:var(--sup);border:1px solid var(--traco);text-decoration:none;color:var(--texto);font-variant-numeric:tabular-nums}
.anos a small{display:block;color:var(--texto2);font-size:.75rem}
.barras{margin:0;padding:0;list-style:none;display:grid;gap:.55rem}
.barras li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.15rem .75rem;font-size:.95rem}
.barras .trilho{grid-column:1/-1;height:.55rem;border-radius:999px;background:var(--veu);overflow:hidden}
.barras .trilho i{display:block;height:100%;border-radius:inherit;background:var(--marca)}
.barras small{color:var(--texto2);font-variant-numeric:tabular-nums}
.aviso{background:var(--ouro-veu);border-left:4px solid var(--ouro-escuro);border-radius:12px;padding:.9rem 1rem;font-size:.97rem}
.aviso p:last-child{margin:0}
.lista{margin:0;padding-left:1.2rem}.lista li{margin-bottom:.45rem}
.faq details{background:var(--sup);border:1px solid var(--traco);border-radius:14px;padding:.85rem 1.1rem;margin-bottom:.6rem}
.faq summary{cursor:pointer;font-weight:700}
.faq details p{margin:.6rem 0 0;color:var(--texto2)}
.relacionados{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.7rem;margin:0;padding:0;list-style:none}
.relacionados a{display:block;height:100%;padding:.9rem 1rem;border-radius:14px;background:var(--sup);border:1px solid var(--traco);text-decoration:none;color:var(--texto)}
.relacionados a b{display:block;color:var(--marca)}.relacionados a span{font-size:.9rem;color:var(--texto2)}
.chamada{margin-top:2.6rem;border-radius:22px;padding:1.6rem 1.4rem;background:var(--marca-escura);color:#fff}
.chamada h2{color:#fff}.chamada p{color:#d5e8e4}
.migalhas{font-size:.85rem;color:#cfe5e0;margin:0 0 .8rem}.migalhas a{color:#fff}
footer{margin-top:3rem;border-top:1px solid var(--traco);background:var(--sup)}
footer .env{padding-block:1.4rem 2rem;font-size:.88rem;color:var(--texto2)}
footer nav{display:flex;flex-wrap:wrap;gap:.3rem 1rem;margin-bottom:.8rem}
""".replace("\n", "")


def cabeca(pasta: str, titulo: str, descricao: str, dados_estruturados: list[dict]) -> str:
    url = f"{SITE}{pasta}/"
    ld = "\n".join(
        '<script type="application/ld+json">' + json.dumps(bloco, ensure_ascii=False) + "</script>"
        for bloco in dados_estruturados
    )
    atual = ' aria-current="page"'
    menu = "".join(
        f'<a href="../{p}/"{atual if p == pasta else ""}>{esc(rotulo)}</a>'
        for p, rotulo in PAGINAS
    )
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(titulo)}</title>
<meta name="description" content="{esc(descricao)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#14655e">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Orto Questões">
<meta property="og:title" content="{esc(titulo)}">
<meta property="og:description" content="{esc(descricao)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}previa-orto-questoes-coluna.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Orto Questões: questões de ortopedia comentadas para TEOT, TARO e R4">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../favicon.svg?v=3" type="image/svg+xml">
<link rel="icon" href="../favicon-32.png?v=3" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="../apple-touch-icon.png?v=3" sizes="180x180">
<style>{ESTILO}</style>
{ld}
</head>
<body>
<header class="topo"><div class="env">
  <a class="marca" href="../"><img src="../marca/simbolo.svg" alt="" width="30" height="30"><span><b>Orto</b> Questões</span></a>
  <nav aria-label="Páginas do Orto Questões">{menu}<a class="app" href="../#/">Abrir o site</a></nav>
</div></header>
"""


def heroi(selo: str, h1: str, lide: str, nome_migalha: str, acoes: list[tuple[str, str, str]], garantias: list[str]) -> str:
    botoes = "".join(f'<a class="botao {classe}" href="{href}">{esc(texto)}</a>' for texto, href, classe in acoes)
    itens = "".join(f"<li>{esc(g)}</li>" for g in garantias)
    return f"""<div class="heroi"><div class="env">
<nav class="migalhas" aria-label="Você está em"><a href="../">Orto Questões</a> › {esc(nome_migalha)}</nav>
<p class="selo">{esc(selo)}</p>
<h1>{h1}</h1>
<p class="lide">{lide}</p>
<div class="acoes">{botoes}</div>
<ul class="garantias">{itens}</ul>
</div></div>
<main class="env">"""


def faq_html(faq: list[tuple[str, str]]) -> str:
    itens = "".join(f"<details><summary>{esc(p)}</summary><p>{esc(r)}</p></details>" for p, r in faq)
    return f'<section class="faq" id="perguntas"><h2>Perguntas frequentes</h2>{itens}</section>'


def relacionados(pasta: str, extras: list[tuple[str, str, str]] | None = None) -> str:
    descricoes = {
        "banco-de-questoes-ortopedia": "Provas, assuntos e como o treino funciona.",
        "teot": "O que é o título, como se preparar e o que mais cai.",
        "questoes-teot-taro": "Provas anteriores do TEOT e do TARO, ano a ano.",
        "curso-ortopedia-r1": "Roteiro para o primeiro ano de residência.",
        "simulado-teot": "Provas no tempo, simulados autorais e Simulado Nacional.",
        "flashcards-ortopedia": "Revisão rápida por assunto, entre plantões.",
    }
    itens = [(f"../{p}/", rotulo if p != "curso-ortopedia-r1" else "Estudo no R1", descricoes[p]) for p, rotulo in PAGINAS if p != pasta]
    itens += extras or []
    corpo = "".join(f'<li><a href="{h}"><b>{esc(t)}</b><span>{esc(d)}</span></a></li>' for h, t, d in itens)
    return f'<section><h2>Continue por aqui</h2><ul class="relacionados">{corpo}</ul></section>'


def chamada(titulo: str, texto: str) -> str:
    return f"""<section class="chamada"><h2>{esc(titulo)}</h2><p>{esc(texto)}</p>
<div class="acoes"><a class="botao principal" href="{CRIAR_CONTA}">Criar conta grátis</a><a class="botao claro" href="../#/assinatura">Ver os planos</a></div></section>"""


def rodape() -> str:
    links = "".join(f'<a href="../{p}/">{esc(r)}</a>' for p, r in PAGINAS)
    return f"""</main>
<footer><div class="env">
<nav aria-label="Mais páginas">{links}<a href="../questoes/">Questões por assunto</a><a href="../guias/">Guias de estudo</a><a href="../#/sobre">O projeto</a><a href="../#/contato">Contato</a></nav>
<p><strong>Orto Questões</strong> (também escrito OrtoQuestões, ortoquestoes.com.br) é um banco de questões comentadas de ortopedia e traumatologia
criado por um residente de ortopedia. As questões de prova são transcritas dos cadernos originais e o gabarito é o da banca; as
marcadas como OrtoQuestões Simulados são autorais, elaboradas a partir da bibliografia de referência, sem caráter oficial nem
vínculo com a SBOT ou com as instituições organizadoras. <a href="https://www.instagram.com/ortoquestoes/">@ortoquestoes</a></p>
</div></footer>
</body>
</html>
"""


def ld_pagina(pasta: str, titulo: str, descricao: str, nome: str, data: str, sobre: list[str]) -> list[dict]:
    url = f"{SITE}{pasta}/"
    return [
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": url + "#pagina",
            "url": url,
            "name": titulo,
            "description": descricao,
            "inLanguage": "pt-BR",
            "dateModified": data,
            "isPartOf": {"@type": "WebSite", "@id": f"{SITE}#website", "name": "Orto Questões", "url": SITE},
            "publisher": {"@type": "Organization", "@id": f"{SITE}#organization", "name": "Orto Questões", "url": SITE},
            "about": sobre,
            "audience": {"@type": "EducationalAudience", "educationalRole": "Residentes e médicos em ortopedia e traumatologia"},
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Orto Questões", "item": SITE},
                {"@type": "ListItem", "position": 2, "name": nome, "item": url},
            ],
        },
    ]


def ld_faq(faq: list[tuple[str, str]]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": p, "acceptedAnswer": {"@type": "Answer", "text": r}} for p, r in faq
        ],
    }


def ld_recurso(pasta: str, nome: str, descricao: str, tipo: str, ensina: list[str]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "@id": f"{SITE}{pasta}/#recurso",
        "name": nome,
        "description": descricao,
        "url": f"{SITE}{pasta}/",
        "inLanguage": "pt-BR",
        "learningResourceType": tipo,
        "educationalLevel": "Residência médica e título de especialista",
        "teaches": ensina,
        "isAccessibleForFree": True,
        "provider": {"@type": "Organization", "@id": f"{SITE}#organization", "name": "Orto Questões", "url": SITE},
    }


# ---------------------------------------------------------------- blocos com dados

def tabela_provas(d: dict) -> str:
    por_prova = d["por_prova"]
    usados = set()
    blocos = []
    grupos = list(GRUPOS)
    resto = [p for p in d["provas"] if not any(p in g[2] for g in GRUPOS)]
    if resto:
        grupos.append(("Outras provas", None, resto))
    for titulo, area_grupo, provas in grupos:
        linhas = []
        for prova in provas:
            if prova not in por_prova:
                continue
            usados.add(prova)
            anos = por_prova[prova]
            n = sum(anos.values())
            com_ano = sorted(a for a in anos if a)
            area = AREA_DA_PROVA.get(prova, area_grupo or "base")
            linhas.append(
                f"<tr><td><a href=\"{link_treino(prova, area=area)}\">{esc(NOMES_PROVA.get(prova, prova))}</a></td>"
                f"<td>{esc(faixa(com_ano))}</td><td class=\"num\">{len(com_ano) or '–'}</td><td class=\"num\">{num(n)}</td></tr>"
            )
        if linhas:
            blocos.append(
                f'<div class="tabela"><table><caption>{esc(titulo)}</caption>'
                "<thead><tr><th>Prova</th><th>Anos</th><th>Edições</th><th>Questões</th></tr></thead>"
                f"<tbody>{''.join(linhas)}</tbody></table></div>"
            )
    return '<div style="display:grid;gap:.9rem">' + "".join(blocos) + "</div>"


def barras(itens: list[tuple[str, int, str]], unidade: str = "questões") -> str:
    if not itens:
        return ""
    maximo = max(n for _, n, _ in itens) or 1
    def rotulo(nome: str, h: str) -> str:
        return f'<a href="{h}">{esc(nome)}</a>' if h else esc(nome)

    linhas = "".join(
        f'<li><span>{rotulo(nome, h)}</span><small>{num(n)} {unidade}</small>'
        f'<span class="trilho" aria-hidden="true"><i style="width:{max(3, round(n * 100 / maximo))}%"></i></span></li>'
        for nome, n, h in itens
    )
    return f'<ol class="barras">{linhas}</ol>'


def numeros(d: dict, extra_simulados: bool = True) -> str:
    oficiais_provas = d["n_provas"]
    itens = []
    if MOSTRAR_TOTAL:
        itens.append((num(d["total"]), "questões no acervo"))
    itens += [
        (str(oficiais_provas), "provas e seleções diferentes"),
        (num(d["edicoes"]), "edições de prova identificadas por ano"),
        (f"{d['anos'][0]}–{d['anos'][-1]}" if d["anos"] else "–", "anos de provas cobertos"),
        (str(len(d["temas_com_questoes"])), "grandes assuntos da ortopedia"),
    ]
    return '<ul class="numeros">' + "".join(f"<li><b>{esc(a)}</b><span>{esc(b)}</span></li>" for a, b in itens) + "</ul>"


def temas_links(d: dict) -> str:
    itens = [(f"../questoes/{t['slug']}.html", t["nome"], "Questões comentadas do assunto, com página própria.") for t in d["temas_paginas"]]
    corpo = "".join(f'<li><a href="{h}"><b>{esc(t)}</b><span>{esc(x)}</span></a></li>' for h, t, x in itens)
    return f'<ul class="relacionados">{corpo}</ul>'


def resumir(texto: str, limite: int) -> str:
    texto = " ".join((texto or "").split())
    return texto if len(texto) <= limite else texto[: limite - 1].rsplit(" ", 1)[0].rstrip(",;:") + "…"


# ---------------------------------------------------------------- páginas

def pagina_banco(d: dict) -> tuple[str, dict]:
    pasta = "banco-de-questoes-ortopedia"
    titulo = "Banco de questões de ortopedia comentadas: TEOT, TARO e R4 | Orto Questões"
    descricao = ("Orto Questões (OrtoQuestões) é um banco de questões de ortopedia e traumatologia com provas anteriores do "
                 "TEOT, TARO, ENARE R4 e outras, gabarito da banca e comentário de cada alternativa. Conta grátis.")
    pct = round(100 * d["comentadas"] / max(1, d["total"]))
    faq = [
        ("O que é o Orto Questões?",
         "O Orto Questões (também escrito OrtoQuestões, no endereço ortoquestoes.com.br) é um banco de questões comentadas de ortopedia e "
         "traumatologia, criado por um residente de ortopedia. Reúne provas anteriores do TEOT, do TARO, do R4 do ENARE, de títulos de "
         "subespecialidade e de seleções, organizadas por assunto, prova e ano."),
        ("O Orto Questões é gratuito?",
         "Criar a conta é grátis e dá acesso às questões, aos comentários e às ferramentas de estudo. Os planos pagos acrescentam o "
         "cronograma até a prova e o Simulado Nacional. Os limites atuais do acesso gratuito e o que cada plano inclui estão na página de planos do site."),
        ("As questões são das provas oficiais?",
         "Sim. As questões de prova são transcritas dos cadernos originais, sem reescrever o enunciado, e o gabarito é o da banca. Quando a banca "
         "não publica gabarito oficial, a resposta vem justificada e sinalizada. Há também questões autorais, marcadas como OrtoQuestões "
         "Simulados, que não são oficiais."),
        ("Como são os comentários?",
         f"Cada comentário explica o conceito por trás da questão, por que a alternativa correta está certa e por que cada uma das outras está "
         f"errada, com base na bibliografia de referência da especialidade. Hoje, {pct}% das questões do acervo têm comentário."),
        ("Orto Questões e OrtoQuestões são o mesmo site?",
         "Sim. O nome se escreve Orto Questões, mas também aparece junto, OrtoQuestões, e o endereço é ortoquestoes.com.br."),
        ("Tem questões de cirurgia da mão?",
         "Sim. Cirurgia da mão é outra especialidade, com prova própria, e tem uma categoria própria no treino, com provas de seleção de "
         "vários serviços. Ela não se mistura com as questões de R4 de ortopedia."),
        ("Funciona no celular?",
         "Sim. O site foi feito para estudar no celular entre plantões e pode ser instalado na tela inicial como aplicativo."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Banco de questões de ortopedia", d["data"], ["Ortopedia e traumatologia", "TEOT", "TARO", "Banco de questões"])
    ld += [ld_recurso(pasta, "Banco de questões de ortopedia comentadas do Orto Questões", descricao, "Banco de questões",
                      ["Ortopedia e traumatologia", "Preparação para o TEOT", "Preparação para o TARO", "Seleções de R4"]), ld_faq(faq)]
    corpo = [cabeca(pasta, titulo, descricao, ld)]
    corpo.append(heroi(
        "Orto Questões · OrtoQuestões",
        "Banco de questões de ortopedia <em>comentadas, alternativa por alternativa</em>",
        "Provas anteriores do TEOT, do TARO, do R4 do ENARE e de títulos de subespecialidade, organizadas por assunto, prova e ano. "
        "Você responde, entende por que cada alternativa está certa ou errada e revisa o que errou no momento certo.",
        "Banco de questões de ortopedia",
        [("Criar conta grátis", CRIAR_CONTA, "principal"), ("Ver questões por assunto", "../questoes/", "claro")],
        ["Gabarito da banca", "Comentário em cada alternativa", "Origem de cada questão identificada", "Feito para o celular"],
    ))
    corpo.append(f"""<section><h2>O que tem no acervo</h2>
<p class="sub">Os números abaixo saem do próprio acervo e são atualizados a cada publicação do site.</p>
{numeros(d)}</section>""")
    corpo.append(f"""<section><h2>Provas no acervo</h2>
<p class="sub">Clique numa prova para montar um treino só com ela. Questões repetidas entre provas são contadas uma vez.</p>
{tabela_provas(d)}
<div class="aviso" style="margin-top:.9rem"><p>Além das provas, o acervo tem <strong>OrtoQuestões Simulados</strong>: questões
autorais, escritas a partir da bibliografia no padrão da prova indicada, inclusive para o Fellowship de Quadril. Elas trazem aviso
na tela, não são questões oficiais e não têm vínculo com as instituições organizadoras.</p></div></section>""")
    corpo.append("""<section><h2>Como o treino funciona</h2><div class="cartoes">
<div class="cartao"><span class="n">1</span><h3>Monte a sessão</h3><p>Filtre por prova, ano, assunto, subassunto e dificuldade, ou peça uma sessão rápida misturada.</p></div>
<div class="cartao"><span class="n">2</span><h3>Responda e entenda</h3><p>Depois de marcar, leia o conceito-chave e a análise de cada alternativa, inclusive a correta.</p></div>
<div class="cartao"><span class="n">3</span><h3>Revise no tempo certo</h3><p>Erros e respostas inseguras voltam na revisão espaçada e ficam no caderno de erros.</p></div>
<div class="cartao"><span class="n">4</span><h3>Acompanhe o desempenho</h3><p>Veja o acerto por tema e compare com a turma que estuda para a mesma prova.</p></div>
</div></section>""")
    corpo.append(f"""<section><h2>Assuntos</h2>
<p class="sub">Cada assunto tem uma página pública com questões comentadas que você pode ler sem conta.</p>
{temas_links(d)}</section>""")
    corpo.append("""<section><h2>Para quem é</h2><div class="cartoes">
<div class="cartao"><h3>Residentes do R1 ao R3</h3><p>Treino por assunto ao longo da residência e provas anteriores do TARO para medir o ano.</p></div>
<div class="cartao"><h3>Quem vai prestar o TEOT</h3><p>Provas anteriores do TEOT, cronograma pelo que mais cai e simulados no tempo de prova.</p></div>
<div class="cartao"><h3>Seleções de R4 e títulos</h3><p>ENARE R4, R4 de coluna, TECOC de ombro e cotovelo, TEPOP e Fellowship de Quadril, cada um no seu filtro.</p></div>
<div class="cartao"><h3>Cirurgia da mão</h3><p>Outra especialidade, com categoria própria e provas de seleção de vários serviços.</p></div>
</div></section>""")
    corpo.append(faq_html(faq))
    corpo.append(chamada("Comece pelo assunto que mais te preocupa", "A conta é grátis. Escolha uma prova ou um assunto e responda as primeiras questões em menos de um minuto."))
    corpo.append(relacionados(pasta))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_teot(d: dict) -> tuple[str, dict]:
    pasta = "teot"
    titulo = "TEOT: como funciona e como se preparar com provas anteriores | Orto Questões"
    descricao = ("Entenda o TEOT, o Título de Especialista em Ortopedia e Traumatologia da SBOT, e prepare-se com provas anteriores "
                 "comentadas, cronograma pelo que mais cai e simulados no Orto Questões.")
    teot = d["por_prova"].get("TEOT", Counter())
    anos_teot = sorted(a for a in teot if a)
    taro = d["por_prova"].get("TARO", Counter())
    anos_taro = sorted(a for a in taro if a)
    faq = [
        ("O que é o TEOT?",
         "TEOT é o Título de Especialista em Ortopedia e Traumatologia, concedido pela SBOT (Sociedade Brasileira de Ortopedia e "
         "Traumatologia) a quem é aprovado no exame. Os requisitos de inscrição, as etapas, as datas e a bibliografia são definidos "
         "a cada ano no edital da SBOT."),
        ("Quando é a prova do TEOT?",
         "As datas mudam a cada edição e são publicadas pela SBOT no edital do ano. O Orto Questões não divulga datas: confira sempre o edital vigente."),
        ("Qual a diferença entre TEOT e TARO?",
         "O TARO é a avaliação anual da SBOT aplicada aos residentes durante a residência; o TEOT é o exame do título de especialista. "
         "Os dois cobram a ortopedia e traumatologia geral, por isso as provas anteriores do TARO também servem de treino de conteúdo para o TEOT."),
        ("Quantas provas anteriores do TEOT há no Orto Questões?",
         f"Hoje, {len(anos_teot)} edições identificadas por ano ({faixa(anos_teot)}), além de questões de TEOT/TARO sem edição identificada "
         f"e de {len(anos_taro)} edições do TARO ({faixa(anos_taro)}). Os números são atualizados a cada publicação do site."),
        ("O Orto Questões é um curso para o TEOT?",
         "Não é um curso de videoaulas. É um banco de questões comentadas com cronograma de estudo, revisão espaçada e simulados. Pode ser "
         "usado sozinho, junto com a bibliografia ou como complemento de um curso preparatório."),
        ("As questões de simulado são do TEOT?",
         "Não. As questões marcadas como OrtoQuestões Simulados são autorais, escritas a partir da bibliografia no padrão da prova, e não são "
         "questões oficiais. As provas anteriores do TEOT aparecem com a prova e o ano de origem."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "TEOT", d["data"], ["TEOT", "Título de Especialista em Ortopedia e Traumatologia", "SBOT", "TARO"])
    ld.append(ld_faq(faq))
    corpo = [cabeca(pasta, titulo, descricao, ld)]
    corpo.append(heroi(
        "TEOT · Título de especialista",
        "TEOT: o que é e <em>como se preparar</em> com provas anteriores",
        "O TEOT é o exame da SBOT para o Título de Especialista em Ortopedia e Traumatologia. Aqui você entende como ele se organiza "
        "e treina com as provas anteriores comentadas, no ritmo que cabe na residência.",
        "TEOT",
        [("Treinar com provas do TEOT", link_treino("TEOT"), "principal"), ("Criar conta grátis", CRIAR_CONTA, "claro")],
        [f"TEOT {faixa(anos_teot)}" if anos_teot else "Provas do TEOT", f"TARO {faixa(anos_taro)}" if anos_taro else "Provas do TARO", "Gabarito da banca"],
    ))
    corpo.append("""<section><h2>Como o TEOT se organiza</h2>
<p>O TEOT é realizado pela <strong>SBOT</strong> (Sociedade Brasileira de Ortopedia e Traumatologia). Em geral, quem presta o exame está
terminando ou terminou a residência em ortopedia e traumatologia. A <strong>prova teórica</strong>, de questões objetivas sobre toda a
ortopedia e traumatologia, é a etapa que um banco de questões treina diretamente; o exame pode ter outras etapas, de avaliação oral ou
prática, conforme o edital.</p>
<div class="aviso"><p><strong>Confira sempre o edital do ano.</strong> Requisitos de inscrição, datas, locais, etapas e bibliografia
mudam de uma edição para outra e são definidos pela SBOT. Esta página não substitui o edital.</p></div></section>""")
    teot_tabela = "".join(
        f'<li><a href="{link_treino("TEOT", [a])}">TEOT {a}<small>{num(teot[a])} questões</small></a></li>' for a in anos_teot
    )
    corpo.append(f"""<section><h2>Provas anteriores do TEOT no acervo</h2>
<p class="sub">Toque num ano para treinar só aquela prova. No modo prova, o treino tem tempo marcado, como no dia.</p>
<ul class="anos">{teot_tabela}</ul>
<p style="margin-top:1rem">Também há questões de TEOT/TARO sem edição identificada e as provas do TARO de {esc(faixa(anos_taro))}.
<a href="../questoes-teot-taro/">Veja todas as provas do TEOT e do TARO, ano a ano</a>.</p></section>""")
    inc = d["incidencia"]
    if inc.get("areas"):
        areas = sorted(inc["areas"], key=lambda a: -a["n"])
        corpo.append(f"""<section><h2>O que mais cai, área por área</h2>
<p class="sub">Contagem das questões das provas oficiais do acervo (TEOT, TARO, CET-PR, TECOC e ENARE), sem cópias, sem anuladas e
sem questões autorais. É a mesma contagem que ordena o cronograma do site.</p>
{barras([(a["nome"], a["n"], f"../questoes/{a['slug']}.html" if (DIR_PUBLICO / "questoes" / f"{a['slug']}.html").exists() else "") for a in areas])}
</section>""")
        if inc.get("top"):
            nomes_area = {a["id"]: a["nome"] for a in inc["areas"]}
            top = "".join(f"<li>{esc(t['nome'])} <span class='sub'>·{esc(nomes_area.get(t['area'], ''))}, {num(t['n'])} questões</span></li>" for t in inc["top"][:12])
            corpo.append(f'<section><h2>Os assuntos que mais aparecem</h2><ol class="lista">{top}</ol>'
                         '<p style="margin-top:.8rem"><a href="../#/temas-que-mais-caem">Ver a lista completa no site</a></p></section>')
    corpo.append("""<section><h2>Um plano do R1 ao TEOT</h2><div class="cartoes">
<div class="cartao"><span class="n">R1</span><h3>Base e rotina</h3><p>Conceitos básicos, trauma e exame físico. Blocos curtos de questões por assunto e o TARO do ano como diagnóstico.</p></div>
<div class="cartao"><span class="n">R2</span><h3>Ampliar</h3><p>Subespecialidades ao ritmo dos estágios, com provas anteriores por assunto e revisão dos erros.</p></div>
<div class="cartao"><span class="n">R3</span><h3>Reta final</h3><p>Provas do TEOT no tempo, o que mais cai primeiro, simulados e revisão do caderno de erros.</p></div>
</div><p class="sub" style="margin-top:.8rem">É uma sugestão de organização, não uma regra: ajuste ao seu serviço, aos estágios e ao edital.</p></section>""")
    corpo.append("""<section><h2>Curso para o TEOT ou banco de questões?</h2>
<p>Muita gente procura um <strong>curso para o TEOT</strong>. Vale separar o que cada recurso resolve: um curso de aulas organiza a
teoria e o calendário; a bibliografia é a fonte; um banco de questões mostra se você consegue usar o conhecimento numa decisão de prova.
O Orto Questões <strong>não é um curso de videoaulas</strong>: é um banco de questões comentadas com cronograma, revisão espaçada,
temas que mais caem, resumão da reta final e simulados. Pode ser usado sozinho, com a bibliografia ou junto de um curso.</p>
<ul class="lista">
<li><strong>Cronograma até a prova</strong> (planos): a data da prova e o seu tempo por dia viram uma lista do que fazer hoje, começando pelo que mais cai.</li>
<li><strong>Simulado Nacional</strong> (planos): um simulado por mês, com a sua posição entre quem fez.</li>
<li><strong>Conta grátis</strong>: questões, comentários, revisão e desempenho.</li>
</ul></section>""")
    corpo.append(faq_html(faq))
    corpo.append(chamada("Faça uma prova anterior do TEOT hoje", "Crie a conta grátis, escolha o ano e responda no modo estudo ou no modo prova."))
    corpo.append(relacionados(pasta, [("../guias/como-estudar-para-o-teot.html", "Como estudar para o TEOT", "Guia de estudo com questões comentadas.")]))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_provas(d: dict) -> tuple[str, dict]:
    pasta = "questoes-teot-taro"
    teot = d["por_prova"].get("TEOT", Counter())
    taro = d["por_prova"].get("TARO", Counter())
    anos_teot = sorted(a for a in teot if a)
    anos_taro = sorted(a for a in taro if a)
    titulo = "Questões do TEOT e do TARO comentadas, provas anteriores por ano | Orto Questões"
    descricao = (f"Provas anteriores do TEOT ({faixa(anos_teot)}) e do TARO ({faixa(anos_taro)}) com gabarito da banca e comentário de "
                 "cada alternativa. Filtre por ano e assunto e treine no Orto Questões.")
    faq = [
        ("Onde encontrar as provas anteriores do TARO?",
         "Os cadernos do TARO são divulgados pela Comissão de Ensino e Treinamento da SBOT. No Orto Questões, as questões estão transcritas, "
         "com o gabarito da banca e comentário, e podem ser filtradas por ano e assunto."),
        ("O gabarito é o oficial?",
         "Sim: o gabarito é o da banca. Quando a banca não publica gabarito oficial, a resposta vem justificada e sinalizada. Questões anuladas "
         "ficam marcadas e não contam no desempenho."),
        ("Dá para fazer só a prova de um ano?",
         "Sim. Escolha a prova e o ano no treino; no modo prova, a sessão tem tempo marcado e as questões vêm na ordem da prova."),
        ("As questões do TARO servem para estudar para o TEOT?",
         "Servem como treino de conteúdo, porque as duas provas cobram a ortopedia e traumatologia geral. Para o formato e o nível do título, "
         "inclua também as provas anteriores do próprio TEOT."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Questões do TEOT e do TARO", d["data"], ["TEOT", "TARO", "Provas anteriores de ortopedia"])
    ld += [ld_recurso(pasta, "Provas anteriores do TEOT e do TARO comentadas", descricao, "Provas anteriores comentadas",
                      ["Preparação para o TEOT", "Preparação para o TARO"]), ld_faq(faq)]
    corpo = [cabeca(pasta, titulo, descricao, ld)]
    corpo.append(heroi(
        "Provas anteriores",
        "Questões do TEOT e do TARO <em>comentadas, ano a ano</em>",
        "Cada prova transcrita do caderno original, com o gabarito da banca e um comentário que percorre todas as alternativas. "
        "Escolha um ano, faça no tempo de prova e revise os erros depois.",
        "Questões do TEOT e do TARO",
        [("Treinar TEOT", link_treino("TEOT"), "principal"), ("Treinar TARO", link_treino("TARO"), "claro")],
        [f"TEOT: {len(anos_teot)} edições", f"TARO: {len(anos_taro)} edições", "Filtro por ano e assunto"],
    ))
    lista_teot = "".join(f'<li><a href="{link_treino("TEOT", [a])}">{a}<small>{num(teot[a])} questões</small></a></li>' for a in anos_teot)
    lista_taro = "".join(f'<li><a href="{link_treino("TARO", [a])}">{a}<small>{num(taro[a])} questões</small></a></li>' for a in anos_taro)
    sem_ano = sum(d["por_prova"].get("TEOT/TARO", Counter()).values())
    corpo.append(f"""<section><h2>TEOT, prova teórica</h2>
<p class="sub">Título de Especialista em Ortopedia e Traumatologia (SBOT). Toque no ano para treinar só aquela prova.</p>
<ul class="anos">{lista_teot}</ul></section>
<section><h2>TARO</h2>
<p class="sub">Avaliação anual da SBOT para os residentes. Os cadernos são divulgados pela
<a href="https://sbot.org.br/comissoes/sobre-a-sbot-comissao-ensino-treinamento/taro/" rel="noopener">Comissão de Ensino e Treinamento da SBOT</a>.</p>
<ul class="anos">{lista_taro}</ul>
{f'<p style="margin-top:1rem">Há ainda <strong>{num(sem_ano)}</strong> questões de TEOT/TARO sem edição identificada. <a href="{link_treino("TEOT/TARO")}">Treinar essas questões</a>.</p>' if sem_ano else ''}
</section>""")
    tt = d["tt"].most_common()
    if tt:
        slug_por_nome = {t["nome"]: t["slug"] for t in d["temas_paginas"]}
        corpo.append(f"""<section><h2>Assuntos com mais questões no TEOT e no TARO</h2>
<p class="sub">Contagem das questões do TEOT e do TARO no acervo, por grande assunto.</p>
{barras([(nome, n, f"../questoes/{slug_por_nome[nome]}.html" if nome in slug_por_nome else "") for nome, n in tt])}</section>""")
    if d["exemplos"]:
        itens = "".join(
            f'<li><a href="../questoes/{q["tema_slug"]}/{esc(q["id"])}.html"><b>{esc(q["prova"])} {esc(q["ano"])} · {esc(q["tema_nome"])}</b>'
            f'<span>{esc(resumir(q["enunciado"], 130))}</span></a></li>'
            for q in d["exemplos"]
        )
        corpo.append(f'<section><h2>Algumas questões das provas mais recentes</h2><p class="sub">Abra para ver o enunciado, '
                     f'as alternativas, o gabarito e o conceito-chave, sem conta.</p><ul class="relacionados">{itens}</ul></section>')
    corpo.append(faq_html(faq))
    corpo.append(chamada("Escolha um ano e comece", "A conta é grátis. Faça a prova no modo estudo, com o comentário depois de cada questão, ou no modo prova, com tempo."))
    corpo.append(relacionados(pasta, [("../guias/como-estudar-para-o-taro.html", "Como estudar para o TARO", "Roteiro durante a residência.")]))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_r1(d: dict) -> tuple[str, dict]:
    pasta = "curso-ortopedia-r1"
    titulo = "Curso de ortopedia para R1: como estudar no primeiro ano de residência | Orto Questões"
    descricao = ("Começando a residência de ortopedia? Um roteiro para o R1 estudar entre plantões, aproveitar o TARO e chegar preparado "
                 "ao TEOT, com questões comentadas, revisão e cronograma.")
    faq = [
        ("O Orto Questões é um curso de ortopedia?",
         "Não é um curso de videoaulas. É um banco de questões comentadas de ortopedia e traumatologia, com revisão espaçada, desempenho por "
         "tema, cronograma e simulados. No R1, ele serve para transformar o que você estuda e vê no serviço em treino de prova."),
        ("Vale começar a fazer questões já no R1?",
         "Vale, em blocos pequenos e por assunto. No começo, o objetivo não é acertar muito, e sim descobrir o que estudar e fixar o que você "
         "viu na semana. O comentário de cada alternativa ajuda a aprender com o erro."),
        ("Quanto tempo por dia dá para estudar no R1?",
         "Depende do serviço e da escala. Um bloco curto em dia de plantão e um bloco maior na folga costumam funcionar melhor do que uma "
         "meta fixa que quebra na primeira semana difícil. O cronograma do site trata dia de plantão como dia leve."),
        ("Por qual assunto começar?",
         "Conceitos básicos (consolidação, osteossíntese, infecção) e trauma costumam aparecer desde o primeiro plantão. Depois, siga o "
         "estágio em que você está e misture outros temas para não deixar lacunas."),
        ("O que é o TARO?",
         "É a avaliação anual da SBOT aplicada aos residentes de ortopedia. As provas anteriores do TARO são um bom treino de conteúdo desde o R1."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Estudo no R1 de ortopedia", d["data"], ["Residência em ortopedia", "R1", "TARO", "TEOT"])
    ld.append(ld_faq(faq))
    corpo = [cabeca(pasta, titulo, descricao, ld)]
    corpo.append(heroi(
        "R1 de ortopedia",
        "Começando o R1? <em>Monte um estudo que sobreviva aos plantões</em>",
        "O primeiro ano de residência é quando a rotina aperta e o hábito de estudo se forma. Este roteiro mostra como usar aulas, "
        "livros e questões no R1, aproveitar o TARO e chegar ao TEOT sem começar do zero no R3.",
        "Estudo no R1",
        [("Criar conta grátis", CRIAR_CONTA, "principal"), ("Ver o banco de questões", "../banco-de-questoes-ortopedia/", "claro")],
        ["Blocos curtos por assunto", "Revisão dos erros", "Dia de plantão é dia leve"],
    ))
    corpo.append("""<section><h2>O que o R1 precisa resolver primeiro</h2><div class="cartoes">
<div class="cartao"><span class="n">1</span><h3>Uma rotina mínima</h3><p>Um horário fixo e curto, que caiba mesmo na semana de plantão, vale mais do que um plano ambicioso que não acontece.</p></div>
<div class="cartao"><span class="n">2</span><h3>A base que o plantão cobra</h3><p>Conceitos básicos, trauma, exame físico e anatomia aplicada aparecem todos os dias no pronto-socorro e nas provas.</p></div>
<div class="cartao"><span class="n">3</span><h3>Um jeito de medir</h3><p>Questões por assunto mostram o que você já sabe usar. O TARO do ano é um diagnóstico, não uma sentença.</p></div>
</div></section>""")
    corpo.append("""<section><h2>Curso, livro ou questões?</h2>
<p class="sub">Quem procura um curso de ortopedia no R1 normalmente precisa de três coisas diferentes. Cada recurso resolve uma.</p>
<div class="tabela"><table><thead><tr><th>Recurso</th><th>Para que serve</th><th>O que não resolve sozinho</th></tr></thead><tbody>
<tr><td><strong>Curso de aulas</strong></td><td>Organizar a teoria e dar um calendário.</td><td>Mostrar se você consegue usar o conteúdo numa questão.</td></tr>
<tr><td><strong>Bibliografia</strong></td><td>A fonte: classificações, indicações e técnicas.</td><td>Dizer o que priorizar quando o tempo é curto.</td></tr>
<tr><td><strong>Banco de questões comentadas</strong></td><td>Treinar a decisão de prova, achar lacunas e revisar erros.</td><td>Ensinar um tema do zero sem leitura.</td></tr>
<tr><td><strong>Cronograma</strong></td><td>Dizer o que fazer hoje, começando pelo que mais cai.</td><td>Funcionar sem constância.</td></tr>
</tbody></table></div>
<p style="margin-top:.9rem">O Orto Questões cobre as duas últimas linhas: é um banco de questões comentadas com cronograma (nos planos).
Não é um curso de videoaulas e pode ser usado junto com o que o seu serviço e a sua bibliografia indicam.</p></section>""")
    corpo.append("""<section><h2>Uma semana possível no R1</h2>
<div class="tabela"><table><thead><tr><th>Dia</th><th>O que fazer</th></tr></thead><tbody>
<tr><td>Dia de plantão</td><td>Um bloco curto de questões do assunto do estágio, só para manter o hábito.</td></tr>
<tr><td>Dia comum</td><td>Leitura curta do tema e um bloco de questões dele; leia o comentário de todas as alternativas.</td></tr>
<tr><td>Folga</td><td>Bloco maior e misturado, com assuntos fora do estágio, e revisão dos erros da semana.</td></tr>
<tr><td>Fim da semana</td><td>Volte às questões erradas sem olhar o gabarito e tente explicar a resposta em uma frase.</td></tr>
</tbody></table></div>
<p class="sub" style="margin-top:.8rem">É um exemplo, não uma prescrição. O tamanho dos blocos depende da sua escala.</p></section>""")
    corpo.append("""<section><h2>Por onde começar no Orto Questões</h2><div class="cartoes">
<div class="cartao"><span class="n">1</span><h3>Crie a conta</h3><p>É grátis. Seu progresso, os erros e as revisões ficam salvos.</p></div>
<div class="cartao"><span class="n">2</span><h3>Comece pela base</h3><p><a href="../questoes/conceitos-basicos.html">Conceitos básicos</a> e <a href="../questoes/trauma.html">trauma</a> em blocos curtos.</p></div>
<div class="cartao"><span class="n">3</span><h3>Use as provas do TARO</h3><p>Uma prova anterior por mês mostra a evolução. <a href="../questoes-teot-taro/">Ver as provas</a>.</p></div>
<div class="cartao"><span class="n">4</span><h3>Revise o que errou</h3><p>A revisão espaçada traz de volta as questões erradas e inseguras no tempo certo.</p></div>
</div></section>""")
    corpo.append("""<section><h2>Erros comuns no primeiro ano</h2><ul class="lista">
<li>Estudar só o estágio do mês e esquecer o resto da ortopedia até o R3.</li>
<li>Fazer muitas questões e não ler o comentário das alternativas erradas.</li>
<li>Medir o progresso só pelo percentual de acerto, sem olhar o volume e os temas.</li>
<li>Deixar as provas anteriores para o fim, quando já não dá tempo de corrigir o rumo.</li>
</ul></section>""")
    corpo.append(faq_html(faq))
    corpo.append(chamada("Comece o R1 com um hábito, não com uma maratona", "Crie a conta grátis e faça hoje um bloco de conceitos básicos ou de trauma."))
    corpo.append(relacionados(pasta, [("../guias/curso-de-ortopedia.html", "Curso de ortopedia: como escolher", "Como avaliar aulas, questões e revisão.")]))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_simulado(d: dict) -> tuple[str, dict]:
    pasta = "simulado-teot"
    titulo = "Simulado para o TEOT e o TARO: provas no tempo e simulados de ortopedia | Orto Questões"
    descricao = ("Simulados de ortopedia para o TEOT e o TARO: provas anteriores no modo prova, com tempo, OrtoQuestões Simulados "
                 "autorais no padrão da banca e o Simulado Nacional mensal, com a sua posição.")
    faq = [
        ("O simulado do Orto Questões é oficial?",
         "Não. As provas anteriores são oficiais e aparecem com a prova e o ano de origem. Os OrtoQuestões Simulados são questões autorais "
         "escritas a partir da bibliografia no padrão da prova, sem caráter oficial nem vínculo com a SBOT ou com as instituições organizadoras."),
        ("Como faço uma prova anterior como se fosse o dia da prova?",
         "No treino, escolha a prova e o ano e use o modo prova: a sessão tem tempo marcado, as questões vêm na ordem da prova e o comentário aparece no fim."),
        ("O que é o Simulado Nacional?",
         "É um simulado mensal para quem estuda no Orto Questões, com resultado e a sua posição entre os participantes. É exclusivo dos planos pagos."),
        ("Os simulados têm comentário?",
         "Sim. As questões têm comentário com o conceito e a análise de cada alternativa; nos OrtoQuestões Simulados, com a citação do livro de referência."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Simulados para o TEOT e o TARO", d["data"], ["Simulado TEOT", "Simulado TARO", "Ortopedia e traumatologia"])
    ld += [ld_recurso(pasta, "Simulados de ortopedia para o TEOT e o TARO", descricao, "Simulado",
                      ["Preparação para o TEOT", "Preparação para o TARO"]), ld_faq(faq)]
    teot = d["por_prova"].get("TEOT", Counter())
    ultimo = max((a for a in teot if a), default=None)
    corpo = [cabeca(pasta, titulo, descricao, ld)]
    corpo.append(heroi(
        "Simulados",
        "Simulado para o TEOT e o TARO, <em>no tempo da prova</em>",
        "Três jeitos de treinar como no dia: refazer uma prova anterior com tempo, responder questões autorais no padrão da banca e "
        "participar do Simulado Nacional, comparando o seu resultado com o de quem estuda para a mesma prova.",
        "Simulados",
        [(f"Fazer o TEOT {ultimo} no modo prova" if ultimo else "Fazer uma prova anterior", link_treino("TEOT", [ultimo] if ultimo else None, extra="ordem=prova"), "principal"),
         ("Conhecer o Simulado Nacional", "../#/simulado-nacional", "claro")],
        ["Modo prova com tempo", "Comentário depois de entregar", "Resultado por tema"],
    ))
    corpo.append("""<section><h2>Três tipos de simulado</h2><div class="cartoes">
<div class="cartao"><span class="n">1</span><h3>Prova anterior no modo prova</h3><p>Escolha a prova e o ano: as questões vêm na ordem do caderno, com tempo marcado, e o comentário aparece ao entregar.</p></div>
<div class="cartao"><span class="n">2</span><h3>OrtoQuestões Simulados</h3><p>Questões inéditas, escritas a partir da bibliografia no padrão da prova, com comentário e citação do livro. Não são oficiais.</p></div>
<div class="cartao"><span class="n">3</span><h3>Simulado Nacional</h3><p>Um simulado por mês para quem estuda no site, com resultado e a sua posição entre os participantes (planos).</p></div>
</div></section>""")
    corpo.append("""<section><h2>Como tirar mais de um simulado</h2><ul class="lista">
<li><strong>Faça sem consulta e no tempo.</strong> O objetivo é saber como você está, não acertar a qualquer custo.</li>
<li><strong>Corrija pelo comentário de todas as alternativas</strong>, inclusive das que você acertou por eliminação.</li>
<li><strong>Separe erro de conteúdo, de leitura e acerto inseguro.</strong> Cada um pede uma ação diferente.</li>
<li><strong>Volte aos erros em outro dia.</strong> A revisão espaçada do site traz essas questões de volta.</li>
<li><strong>Compare simulados parecidos.</strong> Trocar de prova muda o significado do percentual de acerto.</li>
</ul></section>""")
    corpo.append("""<section><h2>Simulados dentro do cronograma</h2>
<p>Nos planos, o cronograma até a prova inclui um mini-simulado a cada duas semanas e, nas duas últimas semanas, a reta final: revisão
forte e depois o modo prova, com simulado, os erros que importam e o resumão do que mais cai.</p>
<p><a href="../teot/">Entenda o TEOT e o que mais cai</a> · <a href="../questoes-teot-taro/">Ver as provas anteriores, ano a ano</a></p></section>""")
    corpo.append(faq_html(faq))
    corpo.append(chamada("Marque o seu primeiro simulado", "Crie a conta grátis e faça uma prova anterior do TEOT ou do TARO no modo prova."))
    corpo.append(relacionados(pasta))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_flashcards(d: dict) -> tuple[str, dict]:
    pasta = "flashcards-ortopedia"
    titulo = "Flashcards de ortopedia para revisar TEOT e TARO | Orto Questões"
    descricao = ("Flashcards de ortopedia e traumatologia por assunto, feitos a partir das questões e dos comentários do acervo: modo "
                 "Estudo e Torneio de Flashcards (beta), com revisão e desempenho, no Orto Questões.")
    faq = [
        ("De onde vêm os flashcards?",
         "Saem das questões e dos comentários do acervo do Orto Questões, começando pelos temas que mais caem nas provas. Cada flashcard é ligado a um assunto."),
        ("Como funcionam os modos?",
         "No modo Estudo, você vira o flashcard e diz como foi; ele volta na revisão. O Torneio de Flashcards é a versão em jogo, com progressão e ranking. "
         "Os dois estão em beta."),
        ("Os flashcards são gratuitos?",
         "A conta grátis dá acesso aos flashcards com um limite diário; os planos liberam mais. Os limites atuais estão na página de planos do site."),
        ("Flashcards substituem as questões?",
         "Não. Flashcards ajudam a lembrar classificações, epônimos e imagens; as questões treinam a decisão de prova. Os dois se completam."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Flashcards de ortopedia", d["data"], ["Flashcards de ortopedia", "Revisão espaçada", "TEOT", "TARO"])
    ld += [ld_recurso(pasta, "Flashcards de ortopedia do Orto Questões", descricao, "Flashcards",
                      ["Ortopedia e traumatologia", "Classificações e epônimos", "Imagem em ortopedia"]), ld_faq(faq)]
    corpo = [cabeca(pasta, titulo, descricao, ld)]
    corpo.append(heroi(
        "Flashcards · beta",
        "Flashcards de ortopedia <em>para revisar entre plantões</em>",
        "Classificações, epônimos, anatomia e imagem em cartões rápidos, organizados pelos mesmos assuntos das questões. "
        "Estude com calma no modo Estudo ou entre no Torneio de Flashcards.",
        "Flashcards de ortopedia",
        [("Abrir os flashcards", "../#/flashcards", "principal"), ("Criar conta grátis", "../#/conta?modo=criar&amp;voltar=%2Fflashcards", "claro")],
        ["Por assunto", "Revisão do que você errou", "Desempenho por tema"],
    ))
    areas = (d["flashcards"] or {}).get("areas") or {}
    if areas:
        itens = []
        for slug, a in sorted(areas.items(), key=lambda x: -x[1].get("total", 0)):
            principais = ", ".join(list((a.get("assuntos") or {}).keys())[:3])
            itens.append(f"<tr><td><strong>{esc(a['nome'])}</strong></td><td class=\"num\">{num(a.get('total', 0))}</td><td>{esc(principais)}</td></tr>")
        corpo.append(f"""<section><h2>Flashcards por assunto</h2>
<p class="sub">Quantos flashcards há em cada área e os assuntos com mais cartões. A contagem é atualizada a cada publicação.</p>
<div class="tabela"><table><thead><tr><th>Área</th><th>Flashcards</th><th>Assuntos com mais cartões</th></tr></thead><tbody>{''.join(itens)}</tbody></table></div></section>""")
    corpo.append("""<section><h2>Dois jeitos de usar</h2><div class="cartoes">
<div class="cartao"><h3>Modo Estudo</h3><p>Calmo: vire o flashcard, veja a resposta e diga como foi. O que você errou volta na revisão.</p></div>
<div class="cartao"><h3>Torneio de Flashcards</h3><p>O mesmo conteúdo em forma de jogo, com progressão e ranking entre quem estuda no site.</p></div>
<div class="cartao"><h3>Cronograma e desempenho</h3><p>Acompanhe o acerto por tema e encaixe os flashcards no seu dia de estudo.</p></div>
</div></section>""")
    corpo.append("""<section><h2>Flashcards e questões: quando usar cada um</h2>
<p>Use flashcards para o que precisa estar na ponta da língua: classificações, epônimos, valores de referência e sinais de imagem.
Use questões para treinar a decisão: qual conduta, qual exame, qual complicação. Um bom ciclo é responder um bloco de questões,
anotar o que faltou e revisar esse ponto nos flashcards nos dias seguintes.</p>
<p><a href="../banco-de-questoes-ortopedia/">Conheça o banco de questões</a> · <a href="../questoes/">Questões por assunto</a></p></section>""")
    corpo.append(faq_html(faq))
    corpo.append(chamada("Revise um assunto em cinco minutos", "Crie a conta grátis e abra os flashcards do tema que você está estudando."))
    corpo.append(relacionados(pasta))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


# ---------------------------------------------------------------- llms.txt

def llms(d: dict, paginas: list[dict], completo: bool) -> str:
    teot = d["por_prova"].get("TEOT", Counter())
    taro = d["por_prova"].get("TARO", Counter())
    linhas = [
        "# Orto Questões",
        "",
        "> Orto Questões (também escrito OrtoQuestões; endereço ortoquestoes.com.br) é um banco de questões comentadas de ortopedia e "
        "traumatologia, em português, para residentes que se preparam para o TARO e para o TEOT (Título de Especialista em Ortopedia e "
        "Traumatologia da SBOT), para seleções de R4 e títulos de subespecialidade, e para candidatos da prova de cirurgia da mão.",
        "",
        "Fatos verificáveis no site:",
        "",
        f"- Provas anteriores transcritas dos cadernos originais, com o gabarito da banca: TEOT ({faixa(sorted(a for a in teot if a))}), "
        f"TARO ({faixa(sorted(a for a in taro if a))}), ENARE R4 de ortopedia, TECOC (ombro e cotovelo), TEPOP (ortopedia pediátrica), "
        "CET-PR, SBOT-SP, R4 de coluna e provas de seleção de cirurgia da mão.",
        f"- {d['n_provas']} provas e seleções diferentes e {d['edicoes']} edições identificadas por ano, de {d['anos'][0]} a {d['anos'][-1]}."
        if d["anos"] else "",
        "- As questões têm comentário com o conceito-chave e a análise de cada alternativa, inclusive a correta, baseado na bibliografia de referência.",
        "- Questões autorais marcadas como \"OrtoQuestões Simulados\", escritas no padrão da prova; não são oficiais e não têm vínculo com a SBOT ou outras instituições.",
        "- Recursos: treino com filtros por prova, ano, assunto e dificuldade; modo prova com tempo; revisão espaçada; caderno de erros; "
        "desempenho por tema; temas que mais caem; flashcards (beta); cronograma até a prova e Simulado Nacional mensal (planos pagos).",
        "- Conta grátis. Preços, limites do acesso gratuito e condições estão em https://ortoquestoes.com.br/#/assinatura.",
        "- Não é um curso de videoaulas: é um banco de questões com cronograma e simulados, que pode ser usado sozinho ou junto de um curso e da bibliografia.",
        "- Criado por um residente de ortopedia. Instagram: @ortoquestoes.",
        "",
        "## Páginas principais",
        "",
    ]
    for p in paginas:
        linhas.append(f"- [{p['titulo'].split(' | ')[0]}]({SITE}{p['pasta']}/): {p['descricao']}")
    linhas += [
        f"- [Questões comentadas por assunto]({SITE}questoes/): páginas públicas com questões, gabarito e conceito-chave, uma por assunto e uma por questão.",
        f"- [Guias de estudo]({SITE}guias/): como estudar para o TEOT e o TARO, como escolher um curso de ortopedia, como usar questões comentadas.",
        f"- [O projeto]({SITE}#/sobre): quem faz, como os comentários são feitos e as fontes.",
        "",
        "## Como descrever o site",
        "",
        "- Nome: \"Orto Questões\" (com espaço). Formas aceitas: OrtoQuestões, ortoquestoes.",
        "- Categoria: banco de questões e plataforma de estudo para provas de ortopedia e traumatologia no Brasil.",
        "- Cirurgia da mão é outra especialidade, com categoria própria no site; não é R4 de ortopedia.",
        "- Não divulga datas de prova: elas são definidas nos editais (no caso do TEOT e do TARO, pela SBOT).",
    ]
    if completo:
        linhas += ["", "## Provas no acervo", ""]
        for titulo, _, provas in GRUPOS:
            presentes = [p for p in provas if p in d["por_prova"]]
            if not presentes:
                continue
            linhas.append(f"### {titulo}")
            linhas.append("")
            for prova in presentes:
                anos = d["por_prova"][prova]
                linhas.append(f"- {NOMES_PROVA.get(prova, prova)}: {faixa(sorted(a for a in anos if a))}; {num(sum(anos.values()))} questões.")
            linhas.append("")
        linhas += ["## Questões do TEOT e do TARO por assunto", ""]
        for nome, n in d["tt"].most_common():
            linhas.append(f"- {nome}: {num(n)}")
        linhas += ["", "## Perguntas frequentes", ""]
        vistas = set()
        for p in paginas:
            for pergunta, resposta in p["faq"]:
                if pergunta in vistas:
                    continue
                vistas.add(pergunta)
                linhas += [f"### {pergunta}", "", resposta, ""]
    return "\n".join(linhas).rstrip() + "\n"


def principal() -> int:
    d = carregar_dados()
    if not d["oficiais"]:
        print("erro: acervo vazio", file=sys.stderr)
        return 1
    geradores = [pagina_banco, pagina_teot, pagina_provas, pagina_r1, pagina_simulado, pagina_flashcards]
    paginas = []
    for gerar in geradores:
        texto, meta = gerar(d)
        pasta = DIR_PUBLICO / meta["pasta"]
        pasta.mkdir(parents=True, exist_ok=True)
        (pasta / "index.html").write_text(texto, encoding="utf-8")
        paginas.append(meta)
    (DIR_PUBLICO / "llms.txt").write_text(llms(d, paginas, False), encoding="utf-8")
    (DIR_PUBLICO / "llms-full.txt").write_text(llms(d, paginas, True), encoding="utf-8")
    print(f"{len(paginas)} páginas de destino e llms.txt em public/ (acervo de {d['data']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
