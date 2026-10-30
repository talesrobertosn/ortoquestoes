#!/usr/bin/env python3
"""
Gera as páginas de destino públicas (uma pasta por página, com index.html) e
os arquivos para assistentes de IA (llms.txt e llms-full.txt) em public/.

Por que existem. O aplicativo roda por hash (#/treinar), e o Google descarta o
fragmento: para ele o site inteiro é a raiz. As páginas por assunto e por
questão (gerar_paginas_seo.py) cobrem quem procura um tema específico; estas
cobrem quem procura o site pelo que ele é: "banco de questões de ortopedia",
"TEOT", "questões do TARO", "curso de ortopedia para R1", "simulado TEOT",
"flashcards de ortopedia", "curso preparatório para o TEOT". Cada uma responde
a pergunta de quem busca com informação verdadeira e útil, e só depois convida
para o aplicativo. A página /sobre/ diz quem faz o site, para pessoas, para o
Google e para os assistentes de IA.

Regras (as mesmas das outras páginas públicas):
- Nada inventado: os números (provas, anos, edições, questões por prova e por
  assunto) saem do acervo a cada deploy; datas de prova, nunca (cada edital
  da SBOT define as suas).
- Sem o número total de questões do acervo (regra da marca em
  docs/marketing/orientacoes.md). Para mudar, troque MOSTRAR_TOTAL.
- Sem preço e sem benefício que o site não afirme: os planos ficam em #/assinatura.
- Cirurgia da mão é outra especialidade; Fellowship de Quadril, nunca "SBQ";
  "Flashcards", nunca "Cripta".
- Nenhum nome de outra marca, curso preparatório ou concorrente, em lugar
  nenhum: texto, título, metadados, JSON-LD e llms.txt (regra do dono).
- Sem JavaScript: as páginas funcionam e são lidas por qualquer rastreador.

Rode depois de gerar_paginas_seo.py (os exemplos de questão apontam para as
páginas que ele cria) e antes de gerar_sitemap.py:

    python3 scripts/gerar_paginas_seo.py && python3 scripts/gerar_guias_seo.py \
      && python3 scripts/gerar_paginas_destino.py && python3 scripts/gerar_provas_anteriores.py && python3 scripts/gerar_sitemap.py
"""

from __future__ import annotations

import datetime as dt
import html
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parent))

from comum import CAMINHO_INDICE, DIR_ACERVO, DIR_PUBLICO, DIR_TEMAS, RAIZ, carregar_taxonomia, ler_json  # noqa: E402

SITE = "https://ortoquestoes.com.br/"
MOSTRAR_TOTAL = False
INSTAGRAM = "https://www.instagram.com/ortoquestoes"


def _contato() -> str:
    """O e-mail de contato é o de src/config.ts (SITE.contato), lido de lá para
    não existir em dois lugares. É o mesmo que a página de contato já mostra."""
    try:
        texto = (RAIZ / "src" / "config.ts").read_text(encoding="utf-8")
        achado = re.search(r"contato:\s*'([^']+@[^']+)'", texto)
        return achado.group(1) if achado else ""
    except OSError:
        return ""


CONTATO = _contato()

# As formas do nome. "orto questões" (separado, minúsculo) é como muita gente
# digita; o Google só liga essa busca à marca quando vê as formas juntas.
NOMES_ALTERNATIVOS = ["OrtoQuestões", "Orto Questoes", "OrtoQuestoes", "ortoquestoes", "ortoquestoes.com.br"]

ORGANIZACAO = {
    "@type": "Organization",
    "@id": f"{SITE}#organization",
    "name": "Orto Questões",
    "alternateName": NOMES_ALTERNATIVOS,
    "url": SITE,
    "logo": {"@type": "ImageObject", "url": f"{SITE}icone-512.png", "width": 512, "height": 512},
    "sameAs": [INSTAGRAM],
}
SITE_LD = {
    "@type": "WebSite",
    "@id": f"{SITE}#website",
    "name": "Orto Questões",
    "alternateName": NOMES_ALTERNATIVOS,
    "url": SITE,
    "inLanguage": "pt-BR",
    "publisher": {"@id": f"{SITE}#organization"},
}

# Páginas: (pasta, rótulo curto do menu). A ordem é a do menu.
PAGINAS = [
    ("banco-de-questoes-ortopedia", "Banco de questões"),
    ("teot", "TEOT"),
    ("curso-preparatorio-teot", "Curso preparatório"),
    ("provas-anteriores", "Provas anteriores"),
    ("questoes-teot-taro", "TEOT e TARO"),
    ("curso-ortopedia-r1", "R1"),
    ("simulado-teot", "Simulados"),
    ("flashcards-ortopedia", "Flashcards"),
    ("cirurgia-da-mao", "Cirurgia da mão"),
]
# Fora do menu do topo, mas com página própria (rodapé e sitemap).
PAGINAS_EXTRAS = [("sobre", "Sobre o Orto Questões"),
                  # Atlas 3D (25/10/2026): páginas próprias em paginas_atlas_seo.py, para quem busca "atlas 3D" e "anatomia 3D"
                  ("atlas-3d", "Atlas 3D"), ("esqueleto-humano-3d", "Esqueleto humano 3D"), ("musculos-do-corpo-humano-3d", "Músculos em 3D")]

CRIAR_CONTA = "../#/conta?modo=criar&amp;voltar=%2Ftreinar"

# Grupos de provas, na ordem de exibição. Prova que não estiver aqui cai em "Outras provas".
GRUPOS = [
    ("Ortopedia e traumatologia: título e residência", "base", ["TEOT", "TARO", "Ortopedia", "SBOT-SP", "CET-PR"]),
    ("Títulos de subespecialidade", "base", ["TECOC/SBCOC Ombro e Cotovelo", "TEPOP"]),
    ("Seleções de R4", None, ["ENARE R4 Ortopedia", "R4 Coluna SES-DF", "R4 Coluna Joinville"]),
    ("Cirurgia da mão (outra especialidade, com categoria própria)", "mao",
     ["USP-SP", "ENARE Cirurgia da Mão", "PUC-SP", "UFG", "INTO", "FMRP-USP", "Einstein", "IAUPE", "UERJ"]),
]
NOMES_PROVA = {
    "TEOT": "TEOT (SBOT): Título de Especialista em Ortopedia e Traumatologia",
    "TARO": "TARO (SBOT): avaliação anual dos residentes",
    "Ortopedia": "Ortopedia: questões sem edição identificada",
    "TECOC/SBCOC Ombro e Cotovelo": "TECOC (SBCOC): título em cirurgia do ombro e cotovelo",
    "TEPOP": "TEPOP (SBOP): título em ortopedia pediátrica",
    "ENARE R4 Ortopedia": "ENARE: R4 de ortopedia",
    "R4 Coluna SES-DF": "R4 de cirurgia da coluna: SES-DF",
    "R4 Coluna Joinville": "R4 de cirurgia da coluna: Hospital São José (Joinville)",
    "UERJ": "UERJ (prova discursiva)",
}
# Categoria do treino no aplicativo (parâmetro areas= de #/treinar).
AREA_DA_PROVA = {"ENARE R4 Ortopedia": "enare", "R4 Coluna SES-DF": "coluna", "R4 Coluna Joinville": "coluna"}


def slug_edicao(prova: str, ano: int) -> str:
    """Pasta da página de uma edição em /provas-anteriores/ (gerar_provas_anteriores.py)."""
    base = re.sub(r"[^a-z0-9]+", "-", prova.lower().replace("ã", "a").replace("ç", "c")).strip("-")
    return f"{base}-{ano}"


def link_edicao(prova: str, ano: int) -> str:
    return f"../provas-anteriores/{slug_edicao(prova, ano)}/"


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
    tt = Counter(q["tema_nome"] for q in oficiais if q.get("prova") in ("TEOT", "TARO", "Ortopedia"))

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
        # "Ortopedia" (antes "TEOT/TARO") reúne questões sem edição identificada: não é outra prova.
        "n_provas": len([p for p in por_prova if p != "Ortopedia"]),
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
@media (max-width:44rem){.topo nav{margin-left:0;width:100%}}@media (min-width:44.01rem){.topo nav{flex-wrap:wrap;justify-content:flex-end;overflow:visible}}
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


def cabeca(pasta: str, titulo: str, descricao: str, dados_estruturados: list[dict], estilo: str = "", classe: str = "") -> str:
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
<style>{ESTILO}{estilo}</style>
{ld}
</head>
<body{f' class="{classe}"' if classe else ""}>
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
        "provas-anteriores": "Uma página por edição: TEOT, TARO e cirurgia da mão.",
        "questoes-teot-taro": "Questões do TEOT e do TARO comentadas, por ano e assunto.",
        "curso-ortopedia-r1": "Roteiro para o primeiro ano de residência.",
        "simulado-teot": "Provas no tempo, simulados autorais e Simulado Nacional.",
        "flashcards-ortopedia": "Revisão rápida por assunto, entre plantões.",
        "curso-preparatorio-teot": "Como escolher e como combinar curso e questões.",
        "cirurgia-da-mao": "Título da SBCM, SIMÃO e provas de residência em cirurgia da mão.",
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
<nav aria-label="Mais páginas">{links}<a href="../questoes/">Questões por assunto</a><a href="../guias/">Guias de estudo</a><a href="../resumos/">Resumos de capítulos</a><a href="../guias/temas-que-mais-caem-no-teot.html">Temas que mais caem</a><a href="../guias/cronograma-de-estudo-para-o-teot.html">Cronograma para o TEOT</a><a href="../atlas-3d/">Atlas 3D de anatomia</a><a href="../sobre/">Sobre o Orto Questões</a><a href="../#/contato">Contato</a></nav>
<p><strong>Orto Questões</strong> (também escrito OrtoQuestões, ortoquestoes.com.br) é um banco de questões comentadas de ortopedia e traumatologia
feito para quem se prepara para as provas da especialidade. As questões de prova são transcritas dos cadernos originais e o gabarito é o da banca; as
marcadas como OrtoQuestões Simulados são autorais, elaboradas a partir da bibliografia de referência, sem caráter oficial nem
vínculo com a SBOT ou com as instituições organizadoras. <a href="https://www.instagram.com/ortoquestoes/">@ortoquestoes</a></p>
</div></footer>
</body>
</html>
"""


def ld_pagina(pasta: str, titulo: str, descricao: str, nome: str, data: str, sobre: list[str], tipo: str = "WebPage") -> list[dict]:
    url = f"{SITE}{pasta}/"
    return [
        {
            "@context": "https://schema.org",
            "@type": tipo,
            "@id": url + "#pagina",
            "url": url,
            "name": titulo,
            "description": descricao,
            "inLanguage": "pt-BR",
            "dateModified": data,
            "isPartOf": dict(SITE_LD),
            "publisher": dict(ORGANIZACAO),
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
    descricao = ("Orto Questões (OrtoQuestões): banco de questões de ortopedia para a residência, com provas do TEOT, TARO e R4, "
                 "gabarito da banca e comentário de cada alternativa. Conta grátis.")
    pct = round(100 * d["comentadas"] / max(1, d["total"]))
    faq = [
        ("O que é o Orto Questões?",
         "O Orto Questões (também escrito OrtoQuestões, no endereço ortoquestoes.com.br) é um banco de questões comentadas de ortopedia e "
         "traumatologia, para quem estuda para as provas da especialidade. Reúne provas anteriores do TEOT, do TARO, do R4 do ENARE, de títulos de "
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
    descricao = ("TEOT, o título de especialista da SBOT: como a prova se organiza e como se preparar com provas anteriores "
                 "comentadas, cronograma e simulados.")
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
         f"Hoje, {len(anos_teot)} edições identificadas por ano ({faixa(anos_teot)}), além de questões de ortopedia sem edição identificada "
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
<p style="margin-top:1rem">Também há questões de ortopedia sem edição identificada e as provas do TARO de {esc(faixa(anos_taro))}.
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
temas que mais caem, resumão da reta final e simulados. Pode ser usado sozinho, com a bibliografia ou junto de um curso.
<a href="../curso-preparatorio-teot/">Veja como escolher um curso preparatório e como combiná-lo com questões</a>.</p>
<ul class="lista">
<li><strong>Cronograma até a prova</strong> (planos): a data da prova e o seu tempo por dia viram uma lista do que fazer hoje, começando pelo que mais cai.</li>
<li><strong>Simulado Nacional</strong> (planos): um simulado por mês, com a sua posição entre quem fez.</li>
<li><strong>Conta grátis</strong>: questões, comentários, revisão e desempenho.</li>
</ul></section>""")
    corpo.append(faq_html(faq))
    corpo.append(chamada("Faça uma prova anterior do TEOT hoje", "Crie a conta grátis, escolha o ano e responda no modo estudo ou no modo prova."))
    corpo.append(relacionados(pasta, [
        ("../guias/como-estudar-para-o-teot-r1-r2-r3.html", "Como estudar para o TEOT no R1, R2 e R3", "O que fazer em cada ano da residência."),
        ("../guias/cronograma-de-estudo-para-o-teot.html", "Cronograma de estudo para o TEOT", "Como dividir o tempo pelo que mais cai."),
        ("../guias/temas-que-mais-caem-no-teot.html", "Temas que mais caem no TEOT", "Áreas e assuntos campeões, com os números."),
        ("../guias/questoes-teot-por-ano.html", "Provas do TEOT ano a ano", "O que cada edição cobrou."),
    ]))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_provas(d: dict) -> tuple[str, dict]:
    pasta = "questoes-teot-taro"
    teot = d["por_prova"].get("TEOT", Counter())
    taro = d["por_prova"].get("TARO", Counter())
    anos_teot = sorted(a for a in teot if a)
    anos_taro = sorted(a for a in taro if a)
    titulo = "Questões do TEOT e do TARO comentadas, por ano | Orto Questões"
    descricao = (f"Provas anteriores do TEOT ({faixa(anos_teot)}) e do TARO ({faixa(anos_taro)}) com gabarito da banca e comentário de "
                 "cada alternativa. Treine por ano e assunto.")
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
    lista_teot = "".join(f'<li><a href="{link_edicao("TEOT", a)}">{a}<small>{num(teot[a])} questões</small></a></li>' for a in anos_teot)
    lista_taro = "".join(f'<li><a href="{link_edicao("TARO", a)}">{a}<small>{num(taro[a])} questões</small></a></li>' for a in anos_taro)
    sem_ano = sum(d["por_prova"].get("Ortopedia", Counter()).values())
    corpo.append(f"""<section><h2>TEOT, prova teórica</h2>
<p class="sub">Título de Especialista em Ortopedia e Traumatologia (SBOT). Toque no ano para ver as questões daquela prova e o que caiu.</p>
<ul class="anos">{lista_teot}</ul></section>
<section><h2>TARO</h2>
<p class="sub">Avaliação anual da SBOT para os residentes. Os cadernos são divulgados pela
<a href="https://sbot.org.br/comissoes/sobre-a-sbot-comissao-ensino-treinamento/taro/" rel="noopener">Comissão de Ensino e Treinamento da SBOT</a>.</p>
<ul class="anos">{lista_taro}</ul>
{f'<p style="margin-top:1rem">Há ainda <strong>{num(sem_ano)}</strong> questões de ortopedia sem edição identificada. <a href="{link_treino("Ortopedia")}">Treinar essas questões</a>.</p>' if sem_ano else ''}
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
    corpo.append(relacionados(pasta, [
        ("../guias/questoes-teot-por-ano.html", "Provas do TEOT ano a ano", "Os assuntos que cada edição cobrou."),
        ("../guias/provas-anteriores-do-taro.html", "TARO: como usar as provas anteriores", "Uma prova por mês, desde o R1."),
        ("../guias/como-estudar-para-o-taro.html", "Como estudar para o TARO", "Roteiro durante a residência."),
    ]))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_r1(d: dict) -> tuple[str, dict]:
    pasta = "curso-ortopedia-r1"
    titulo = "Curso de ortopedia para R1: como estudar no primeiro ano | Orto Questões"
    descricao = ("Começando a residência de ortopedia? Como o R1 pode estudar entre plantões, aproveitar o TARO e chegar ao TEOT "
                 "com questões comentadas e revisão.")
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
    corpo.append(relacionados(pasta, [
        ("../guias/como-estudar-para-o-teot-r1-r2-r3.html", "Como estudar para o TEOT no R1, R2 e R3", "O plano de cada ano."),
        ("../guias/provas-anteriores-do-taro.html", "TARO: como usar as provas anteriores", "Uma prova por mês, desde o R1."),
        ("../guias/curso-de-ortopedia.html", "Curso de ortopedia: como escolher", "Como avaliar aulas, questões e revisão."),
    ]))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_simulado(d: dict) -> tuple[str, dict]:
    pasta = "simulado-teot"
    titulo = "Simulado TEOT e TARO: provas no tempo e simulados de ortopedia | Orto Questões"
    descricao = ("Simulado para o TEOT e o TARO: provas anteriores no modo prova, com tempo, questões autorais no padrão da banca "
                 "e o Simulado Nacional mensal.")
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
<p><a href="../teot/">Entenda o TEOT e o que mais cai</a> · <a href="../questoes-teot-taro/">Ver as provas anteriores, ano a ano</a>
· <a href="../guias/cronograma-de-estudo-para-o-teot.html">Como montar um cronograma para o TEOT</a></p></section>""")
    corpo.append(faq_html(faq))
    corpo.append(chamada("Marque o seu primeiro simulado", "Crie a conta grátis e faça uma prova anterior do TEOT ou do TARO no modo prova."))
    corpo.append(relacionados(pasta))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_flashcards(d: dict) -> tuple[str, dict]:
    pasta = "flashcards-ortopedia"
    titulo = "Flashcards de ortopedia para revisar TEOT e TARO | Orto Questões"
    descricao = ("Flashcards de ortopedia por assunto, feitos das questões e dos comentários do Orto Questões: modo Estudo e "
                 "Torneio de Flashcards (beta), com revisão.")
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


def pagina_curso_preparatorio(d: dict) -> tuple[str, dict]:
    """Para quem procura "curso preparatório para o TEOT". Página editorial e
    honesta: o Orto Questões não é curso de aulas, e a página diz isso logo no
    começo. Nenhum curso é citado, comparado ou ranqueado (regra do dono)."""
    pasta = "curso-preparatorio-teot"
    titulo = "Curso preparatório para o TEOT: como escolher e combinar | Orto Questões"
    descricao = ("Curso preparatório para o TEOT: os tipos de preparação, o que perguntar antes de escolher e como combinar "
                 "o curso com um banco de questões comentadas.")
    teot = d["por_prova"].get("TEOT", Counter())
    taro = d["por_prova"].get("TARO", Counter())
    anos_teot = sorted(a for a in teot if a)
    anos_taro = sorted(a for a in taro if a)
    faq = [
        ("Posso usar o Orto Questões junto com o meu curso preparatório?",
         "Pode, e foi pensado para isso. Depois de cada aula, filtre as questões pelo mesmo assunto, leia o comentário de todas as "
         "alternativas e deixe a revisão espaçada trazer de volta o que você errou. As provas anteriores do TEOT e do TARO servem "
         "também para treinar no tempo de prova, sem tirar o lugar das aulas."),
        ("Banco de questões substitui curso preparatório?",
         "Depende de como você aprende. Um banco de questões não ensina um tema do zero sem leitura: ele mostra se você consegue usar o "
         "conteúdo numa decisão de prova, aponta lacunas e traz de volta o que você errou. Há quem se prepare com a bibliografia, provas "
         "anteriores e um cronograma; há quem precise de aulas para organizar a teoria. Nos dois casos, treinar com questões faz parte."),
        ("O Orto Questões é um curso preparatório?",
         "Não. O Orto Questões não tem videoaulas. É um banco de questões comentadas de ortopedia e traumatologia, com provas anteriores, "
         "revisão espaçada, desempenho por tema, simulados, flashcards e, nos planos, cronograma até a prova."),
        ("Qual é o melhor curso preparatório para o TEOT?",
         "Não existe uma resposta que sirva para todo mundo, e o Orto Questões não compara nem recomenda cursos. Um bom critério é "
         "escolher o que segue o edital e a bibliografia do ano, cabe na sua escala e deixa tempo para treinar com questões e revisar. "
         "As perguntas desta página ajudam a comparar."),
        ("Quando começar a preparação para o TEOT?",
         "O hábito pode começar já no R1, com blocos curtos de questões por assunto e as provas anteriores do TARO. A preparação mais "
         "intensa costuma ficar para o último ano de residência. Requisitos, datas e etapas estão no edital da SBOT de cada ano."),
        ("O Orto Questões é gratuito?",
         "Criar a conta é grátis e dá acesso às questões, aos comentários, à revisão espaçada e ao desempenho. Os planos acrescentam o "
         "cronograma até a prova, os temas que mais caem área por área, o resumão e o Simulado Nacional. Os limites atuais e o que cada "
         "plano inclui estão na página de planos do site."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Curso preparatório para o TEOT", d["data"],
                   ["Curso preparatório para o TEOT", "TEOT", "Banco de questões", "Residência em ortopedia"])
    ld.append(ld_faq(faq))
    corpo = [cabeca(pasta, titulo, descricao, ld)]
    corpo.append(heroi(
        "Curso preparatório · TEOT",
        "Curso preparatório para o TEOT: <em>como escolher e como combinar curso e banco de questões</em>",
        "Um guia para quem procura um curso preparatório para o TEOT: os tipos de preparação, o que perguntar antes de escolher e "
        "como usar questões junto com as aulas. O Orto Questões não é curso de aulas: é o banco de questões comentadas que entra "
        "ao lado do curso que você já faz, ou da bibliografia, se você estuda por conta própria.",
        "Curso preparatório para o TEOT",
        [("Treinar com provas do TEOT", link_treino("TEOT"), "principal"), ("Criar conta grátis", CRIAR_CONTA, "claro")],
        ["Complemento ao seu curso", "Provas reais comentadas", "Sem videoaulas"],
    ))
    corpo.append("""<section><h2>Os tipos de preparação</h2>
<p class="sub">Quem procura um curso preparatório costuma precisar de várias coisas ao mesmo tempo. Cada recurso resolve uma parte;
nenhum resolve tudo sozinho.</p>
<div class="tabela"><table><thead><tr><th>Recurso</th><th>O que resolve</th><th>Quando rende mais</th><th>O que não resolve sozinho</th></tr></thead><tbody>
<tr><td><strong>Aulas</strong> (o que o curso preparatório costuma oferecer)</td><td>Organizam a teoria, dão sequência e um calendário.</td><td>Quando o tema é novo ou ficou mal-entendido.</td><td>Mostrar se você consegue decidir numa questão de prova.</td></tr>
<tr><td><strong>Bibliografia</strong></td><td>É a fonte: classificações, indicações e técnicas.</td><td>Para fechar dúvidas e aprofundar o que caiu.</td><td>Dizer o que priorizar quando falta tempo.</td></tr>
<tr><td><strong>Banco de questões comentadas</strong></td><td>Treina a decisão de prova e mostra as lacunas.</td><td>Logo depois de estudar um tema e ao longo de toda a preparação.</td><td>Ensinar um tema do zero sem leitura.</td></tr>
<tr><td><strong>Simulados</strong></td><td>Treinam tempo, ritmo e resistência.</td><td>A cada poucas semanas e na reta final.</td><td>Um simulado isolado não é diagnóstico.</td></tr>
<tr><td><strong>Flashcards</strong></td><td>Guardam o que precisa estar na ponta da língua: classificações, epônimos, sinais de imagem.</td><td>Em minutos soltos, entre plantões.</td><td>Treinar o raciocínio do caso clínico.</td></tr>
<tr><td><strong>Revisão espaçada</strong></td><td>Traz de volta o que você errou ou acertou com dúvida, antes de esquecer.</td><td>Todos os dias, em pouco tempo.</td><td>Funcionar se os erros e as dúvidas não forem registrados.</td></tr>
<tr><td><strong>Cronograma</strong></td><td>Transforma a data da prova e o tempo disponível na lista do dia.</td><td>Quando a rotina de plantões é instável.</td><td>Funcionar sem constância.</td></tr>
</tbody></table></div></section>""")
    corpo.append("""<section><h2>Antes de escolher um curso preparatório</h2>
<p class="sub">Perguntas que ajudam a comparar qualquer curso, sem depender de propaganda.</p>
<ul class="lista">
<li><strong>Para quem o curso foi feito?</strong> Preparação para o TEOT é diferente de atualização geral em ortopedia ou de seleção de R4.</li>
<li><strong>O programa segue o edital e a bibliografia do ano?</strong> Compare o conteúdo com o edital vigente da SBOT, que muda de uma edição para outra.</li>
<li><strong>Qual é o formato e por quanto tempo vale o acesso?</strong> Aulas gravadas ou ao vivo, material escrito, período de acesso e o que acontece se a prova mudar de data.</li>
<li><strong>Cabe na sua escala?</strong> Some as horas de aula por semana e veja o que sobra para questões e revisão. Um plano que não sobrevive à semana de plantão não serve.</li>
<li><strong>As questões são de provas reais?</strong> Confira se a origem (prova e ano) está identificada, se o gabarito é o da banca e se o comentário explica todas as alternativas, não só a correta.</li>
<li><strong>Dá para ver uma amostra?</strong> Assista a uma aula e, depois, tente resolver questões daquele tema sem consulta. É o teste mais honesto do material.</li>
<li><strong>Como você tira dúvidas e quais são as condições?</strong> Leia as regras de contratação, cancelamento e reembolso antes de pagar.</li>
<li><strong>Promessa de aprovação não é critério.</strong> Nenhum material garante resultado; o que conta é o quanto você treina e revisa.</li>
</ul></section>""")
    corpo.append("""<section><h2>Como combinar curso e banco de questões</h2>
<p class="sub">Um ciclo simples, que cabe numa semana comum de residência.</p>
<div class="cartoes">
<div class="cartao"><span class="n">1</span><h3>Antes da aula</h3><p>Um bloco curto de questões do tema, sem consulta. Você chega à aula sabendo o que perguntar.</p></div>
<div class="cartao"><span class="n">2</span><h3>Aula ou capítulo</h3><p>Assista à aula do curso ou leia o capítulo da bibliografia.</p></div>
<div class="cartao"><span class="n">3</span><h3>Questões do mesmo tema</h3><p>No mesmo dia ou no seguinte, responda e leia o comentário de todas as alternativas, inclusive as que acertou.</p></div>
<div class="cartao"><span class="n">4</span><h3>Erros para a revisão</h3><p>O que errou e o que acertou com dúvida volta na revisão espaçada, em outro dia.</p></div>
<div class="cartao"><span class="n">5</span><h3>Bloco misturado</h3><p>Uma vez por semana, misture temas já vistos. A prova não avisa o assunto antes da questão.</p></div>
<div class="cartao"><span class="n">6</span><h3>Prova no tempo</h3><p>A cada poucas semanas, uma prova anterior no modo prova, com tempo marcado.</p></div>
</div>
<p style="margin-top:.9rem">Se o seu curso já traz questões, use as provas anteriores para os temas que o curso ainda não cobriu e para
treinar no formato e no tempo da prova. Se você estuda sem curso, troque a aula pela leitura do capítulo: o resto do ciclo é igual.</p></section>""")
    cronograma = ("<strong>Cronograma até a prova</strong> (planos): você informa a data da prova e quanto tempo tem por dia; o site monta a "
                  "lista de cada dia começando pelo que mais cai, com dia leve de plantão, mini-simulados e reta final.")
    corpo.append(f"""<section><h2>Onde o Orto Questões entra</h2><div class="cartoes">
<div class="cartao"><h3>Complemento ao seu curso</h3><p>Não substitui as aulas: entra nos dias de treinar e revisar, filtrando pelo tema que você acabou de estudar.</p></div>
<div class="cartao"><h3>Provas reais comentadas</h3><p>TEOT {esc(faixa(anos_teot))} e TARO {esc(faixa(anos_taro))}, transcritos dos cadernos, com o gabarito da banca e o comentário de cada alternativa.</p></div>
<div class="cartao"><h3>Cronograma</h3><p>{cronograma}</p></div>
<div class="cartao"><h3>Temas que mais caem</h3><p>Contagem das provas oficiais do acervo, área por área e assunto por assunto. <a href="../guias/temas-que-mais-caem-no-teot.html">Ver o resumo público</a>.</p></div>
<div class="cartao"><h3>Revisão e caderno de erros</h3><p>O que você errou ou marcou como dúvida volta no momento certo. Vem na conta grátis.</p></div>
<div class="cartao"><h3>Simulados e flashcards</h3><p>Provas no tempo, questões autorais no padrão da banca e flashcards por assunto para os minutos soltos.</p></div>
</div></section>""")
    inc = d["incidencia"]
    if inc.get("areas"):
        areas = sorted(inc["areas"], key=lambda a: -a["n"])[:6]
        corpo.append(f"""<section><h2>Por onde começar: o que mais cai</h2>
<p class="sub">As áreas com mais questões nas provas oficiais do acervo (TEOT, TARO, CET-PR, TECOC e ENARE), sem cópias, sem anuladas e
sem questões autorais. Use para decidir a ordem de estudo, no curso ou fora dele.</p>
{barras([(a["nome"], a["n"], f"../questoes/{a['slug']}.html" if (DIR_PUBLICO / "questoes" / f"{a['slug']}.html").exists() else "") for a in areas])}
<p style="margin-top:.9rem"><a href="../guias/temas-que-mais-caem-no-teot.html">Os temas que mais caem no TEOT, com os assuntos campeões</a> ·
<a href="../guias/cronograma-de-estudo-para-o-teot.html">Como montar o cronograma</a></p></section>""")
    corpo.append("""<section><h2>Se você ainda não faz curso</h2>
<p>Dá para se preparar com a bibliografia indicada no edital, as provas anteriores e um cronograma que caiba na sua rotina. Muita gente
prefere aulas para organizar a teoria, e tudo bem: nesse caso, escolha o curso pelas perguntas acima e use o banco de questões para medir
o que ficou de cada aula. O que não muda em nenhum caminho é a necessidade de treinar com questões e de revisar os erros.</p>
<p><a href="../guias/como-estudar-para-o-teot-r1-r2-r3.html">Como estudar para o TEOT no R1, no R2 e no R3</a> ·
<a href="../guias/curso-de-ortopedia.html">Curso de ortopedia: como escolher para o seu objetivo</a></p></section>""")
    corpo.append(faq_html(faq))
    corpo.append(chamada("Teste com a prova mais recente do TEOT", "Crie a conta grátis e responda uma prova anterior. Em uma sessão você descobre quais temas pedem mais atenção."))
    corpo.append(relacionados(pasta, [("../guias/preparacao-teot-taro.html", "Preparação para TEOT e TARO", "Como combinar estudo teórico, questões e revisão.")]))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


# Provas de seleção para a residência em cirurgia da mão, na ordem da página (nome real de cada banca).
PROVAS_MAO = ["USP-SP", "ENARE Cirurgia da Mão", "INTO", "UFG", "PUC-SP", "FMRP-USP", "Einstein", "IAUPE", "UERJ"]
NOMES_MAO = {"ENARE Cirurgia da Mão": "ENARE: cirurgia da mão", "UERJ": "UERJ (prova discursiva)"}


def eh_mao(q: dict) -> bool:
    return q.get("area") == "cirurgia-mao" or "cirurgia-mao" in (q.get("areasAdicionais") or [])


# Página de cirurgia da mão: identidade própria (vinho e ouro, como os posts da mão), em HTML e CSS puros.
# A questão do topo é respondida sem JavaScript (rádios e :checked); o movimento é só CSS e some com
# prefers-reduced-motion.
ESTILO_MAO = """
body.mao{--chao:#f3f1ef;--campo:#e9e4e0;--tinta:#1c1114;--tinta2:#4a3a3e;--vinho:#5c1828;--vinho2:#3a0d18;--ouro:#ecc46a;
--ouro2:#8a5f12;--certo:#1f6b4a;background:var(--chao);color:var(--tinta)}
@media (prefers-color-scheme:dark){body.mao{--chao:#130b0d;--campo:#211518;--tinta:#f4ece6;--tinta2:#cbbcb6;--ouro2:#ecc46a;--certo:#7fd3a6}}
.mao .topo{background:var(--chao);border:0}.mao .topo nav a[aria-current]{background:var(--vinho);color:#fff}
.mao .topo nav a.app{background:var(--ouro);color:#2b1d05}.mao a{color:var(--vinho)}
@media (prefers-color-scheme:dark){.mao a{color:var(--ouro)}}
.mao-heroi{background:var(--vinho2);color:#fff}
.mao-heroi__grade{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 clamp(2rem,5vw,5rem);align-items:start;padding-block:clamp(2rem,5vw,4.5rem) clamp(2.5rem,6vw,5.5rem)}.mao-heroi__topo{grid-column:1/-1}
.mao-heroi .migalhas{color:#e6cfd3}.mao-heroi .migalhas a{color:#fff}
.mao-heroi h1{font-size:clamp(2.6rem,7vw,6.6rem);line-height:.98;letter-spacing:-.04em;margin:0 0 1.5rem;font-weight:800}
.mao .mao-lide{font-size:clamp(1.12rem,1.6vw,1.3rem);line-height:1.5;max-width:34em;margin:0 0 2rem;color:#fff}
.mao-acoes{display:flex;flex-wrap:wrap;align-items:center;gap:1rem 1.6rem}
.mao-botao{display:inline-block;padding:1rem 1.6rem;border-radius:999px;background:var(--ouro);color:#2b1d05!important;font-weight:800;text-decoration:none;font-size:1.06rem;transition:transform .18s,background-color .18s}
.mao-botao:hover{transform:translateY(-2px);background:#f5d27f}.mao-botao:active{transform:translateY(0) scale(.98)}
.mao-link{color:#fff!important;font-weight:700;text-underline-offset:4px}
.mao-link:hover{color:var(--ouro)!important}
.mao-fatos{display:flex;flex-wrap:wrap;gap:.6rem 2rem;margin:2.4rem 0 0;padding:0;list-style:none;font-size:1rem}.mao .mao-fatos li{color:#f1dfe2}
.mao-fatos b{color:var(--ouro)}
.mao-quiz{background:#fbfaf9;color:#1c1114;border-radius:22px;padding:clamp(1.2rem,2.6vw,2rem)}
.mao-quiz fieldset{border:0;margin:0;padding:0;min-width:0}
.mao-quiz__origem{margin:0 0 .6rem;font-size:.95rem;color:#5b464b}
.mao-quiz legend{font-size:clamp(1.2rem,1.9vw,1.5rem);font-weight:800;line-height:1.3;letter-spacing:-.01em;margin:0 0 1rem;padding:0}
.mao-quiz input{position:absolute;opacity:0;pointer-events:none}
.mao-quiz__alts{display:grid;gap:.55rem}
.mao-quiz__alts label{display:flex;gap:.8rem;align-items:center;padding:.8rem 1rem;border-radius:14px;background:#eeeae7;cursor:pointer;font-size:1.05rem;transition:background-color .15s,transform .15s}
.mao-quiz__alts label:hover{background:#e4dedb;transform:translateX(3px)}
.mao-quiz__alts label b{flex:none;display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:#fff;color:var(--vinho);font-weight:800}
.mao-quiz__resp{display:none;margin-top:1rem;padding:1rem 1.1rem;border-radius:14px;background:#f1eeec;font-size:.98rem;line-height:1.55;animation:mao-surge .35s ease both}
.mao-quiz__resp p{margin:0 0 .6rem}.mao-quiz__resp p:last-child{margin:0}
.mao-quiz__resp .mao-quiz__veredito{font-weight:800;font-size:1.05rem}
.mao-quiz__dica{margin:.9rem 0 0;font-size:.95rem;color:#5b464b}
""" + "".join(
    f".mao-quiz #mq-{l}:checked~.mao-quiz__alts label[for=mq-{l}]{{background:{'#dcefe3' if l == 'D' else '#f3d9dd'};}}"
    f".mao-quiz #mq-{l}:checked~.mao-quiz__resp--{l}{{display:block}}"
    f".mao-quiz #mq-{l}:checked~.mao-quiz__dica{{display:none}}"
    f".mao-quiz #mq-{l}:focus-visible~.mao-quiz__alts label[for=mq-{l}]{{outline:3px solid #8a5f12;outline-offset:2px}}"
    for l in "ABCD"
) + ".mao-quiz input:checked~.mao-quiz__alts label[for=mq-D] b{background:#1f6b4a;color:#fff}" + """
.mao-corpo>section{padding-block:clamp(4.5rem,10vw,9rem) 0}
.mao h2{font-size:clamp(1.9rem,3.8vw,3.1rem);line-height:1.02;letter-spacing:-.035em;margin:0 0 1.2rem;font-weight:800;max-width:16em}
.mao h3{font-size:1.35rem;letter-spacing:-.01em;margin:0 0 .6rem}
.mao-corpo p,.mao-corpo li{color:var(--tinta);max-width:64ch}
.mao-sub{font-size:1.12rem;max-width:42em;color:var(--tinta)}
.mao-quem__grade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(1.5rem,4vw,3.5rem);margin-top:2.4rem}
.mao-quem__grade h3{font-size:clamp(1.5rem,2.4vw,2rem);color:var(--vinho)}
@media (prefers-color-scheme:dark){.mao-quem__grade h3{color:var(--ouro)}}
.mao-quem__grade p{font-size:1.06rem}
.mao-titulo__grade{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:2.2rem}
.mao-campo{display:flex;flex-direction:column;gap:.7rem;min-height:21rem;padding:clamp(1.6rem,3vw,2.6rem);border-radius:24px;text-decoration:none;transition:transform .2s}
.mao-campo:hover{transform:translateY(-4px)}
.mao-campo--vinho{background:var(--vinho);color:#fff!important}.mao-campo--ouro{background:var(--ouro);color:#2b1d05!important}
.mao-campo__nome{font-size:clamp(3.4rem,8vw,6.6rem);font-weight:800;letter-spacing:-.05em;line-height:.9}
.mao-campo__texto{font-size:1.2rem;font-weight:600;max-width:20em}
.mao-campo__pe{margin-top:auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4rem 1rem;font-size:1rem}.mao-campo__ir{font-weight:800}
.mao-provas__cabeca{margin-bottom:1.6rem}
.mao-tabela{width:100%;border-collapse:separate;border-spacing:0 .45rem;font-size:1.02rem}
.mao-tabela thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.mao-tabela tr{background:var(--campo)}
.mao-tabela th,.mao-tabela td{border:0;padding:.95rem 1rem;text-align:left;vertical-align:middle}
.mao-tabela tbody th{font-size:clamp(1.15rem,1.8vw,1.45rem);font-weight:800;letter-spacing:-.01em;border-radius:14px 0 0 14px;text-transform:none;color:inherit}
.mao-tabela tbody th a{text-decoration:none}.mao-tabela tbody th a:hover{text-decoration:underline}
.mao-tabela td:last-child{border-radius:0 14px 14px 0;text-align:right;font-weight:700}
.mao-tabela td{color:var(--tinta);white-space:nowrap}
.so-leitor{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.mao-tela{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(2rem,5vw,4.5rem);align-items:center}
.mao figure{margin:0}.mao figure img{display:block;width:100%;height:auto;border-radius:18px;background:var(--campo)}
.mao figcaption{margin-top:.7rem;font-size:.95rem;color:var(--tinta2)}
.mao-lista{margin:0;padding-left:1.1rem;font-size:1.08rem}.mao-lista li{margin-bottom:.7rem}
.mao-assuntos{margin-top:clamp(4.5rem,10vw,9rem);padding:clamp(3rem,7vw,6rem) clamp(1.2rem,5vw,4.5rem)!important;background:var(--vinho2);border-radius:28px;color:#fff}
.mao-assuntos h2,.mao-assuntos .mao-sub{color:#fff}
.mao-rank{display:grid;grid-template-columns:1fr 1fr;gap:.9rem 3rem;margin:2.4rem 0 0;padding:0;list-style:none;counter-reset:r}
.mao-rank li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.35rem 1rem;color:#fff;font-size:1.1rem}
.mao-rank__n{color:var(--ouro);font-weight:800;font-variant-numeric:tabular-nums}
.mao-rank__barra{grid-column:1/-1;height:.6rem;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
.mao-rank__barra i{display:block;height:100%;border-radius:inherit;background:var(--ouro);transform-origin:left}
.mao-estudo{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:clamp(2rem,6vw,5rem);align-items:center}
.mao-estudo__texto>p{font-size:1.1rem;max-width:38em}
.mao-passos{margin:1.6rem 0 0;padding-left:1.4rem;font-size:1.08rem}.mao-passos li{margin-bottom:.8rem;padding-left:.3rem}
.mao-passos li::marker{color:var(--vinho);font-weight:800}
.mao-estudo__fig{max-width:25rem;width:100%;justify-self:center}
.mao-frase{font-size:clamp(1.3rem,2.4vw,1.9rem);line-height:1.35;letter-spacing:-.015em;font-weight:700;max-width:30em}
.mao-curso__grade{display:grid;grid-template-columns:1fr 1fr;gap:clamp(1.5rem,4vw,3.5rem);margin-top:1.4rem}
.mao-curso__grade p{font-size:1.08rem}
.mao-faq__lista{display:grid;gap:.6rem;margin-top:1.6rem}
.mao-faq details{background:var(--campo);border:0;border-radius:16px;padding:1.1rem 1.3rem}
.mao-faq summary{cursor:pointer;font-weight:800;font-size:1.12rem}
.mao-faq details p{margin:.7rem 0 0;font-size:1.04rem;color:var(--tinta)}
.mao-fim{margin-top:clamp(4.5rem,10vw,9rem);background:var(--vinho);color:#fff;padding-block:clamp(3.5rem,8vw,7rem)}
.mao .mao-fim__nome{font-size:clamp(2.4rem,7vw,6rem);font-weight:800;letter-spacing:-.045em;line-height:.95;margin:0 0 1.4rem;color:#fff!important;max-width:12em}
.mao-fim__texto{font-size:1.15rem;max-width:38em;color:#fff!important;margin-bottom:2rem}
.mao .relacionados a{border:0;background:var(--campo)}.mao .relacionados a b{color:var(--vinho)}
@media (prefers-color-scheme:dark){.mao .relacionados a b{color:var(--ouro)}.mao-passos li::marker{color:var(--ouro)}}
.mao footer{border:0;background:var(--campo)}.mao main section.chamada{display:none}
@media (max-width:60rem){.mao-heroi__grade,.mao-tela,.mao-estudo{grid-template-columns:1fr}
.mao-quem__grade{grid-template-columns:1fr}.mao-rank{grid-template-columns:1fr}.mao-curso__grade{grid-template-columns:1fr}}
@media (max-width:40rem){.mao-titulo__grade{grid-template-columns:1fr}.mao-campo{min-height:15rem}
.mao-tabela td:nth-child(3){display:none}.mao-tabela th,.mao-tabela td{padding:.8rem .7rem}.mao-tabela td{font-size:.95rem}.mao-tabela .q{display:none}}
@keyframes mao-surge{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes mao-barra{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media (prefers-reduced-motion:no-preference){
.mao-heroi h1{animation:mao-surge .7s cubic-bezier(.2,.7,.2,1) both}
.mao-lide{animation:mao-surge .7s .08s cubic-bezier(.2,.7,.2,1) both}
.mao-acoes{animation:mao-surge .7s .16s cubic-bezier(.2,.7,.2,1) both}
.mao-fatos{animation:mao-surge .7s .24s cubic-bezier(.2,.7,.2,1) both}
.mao-quiz{animation:mao-surge .8s .3s cubic-bezier(.2,.7,.2,1) both}
.mao-rank__barra i{animation:mao-barra 1.1s .2s cubic-bezier(.2,.7,.2,1) both}}
"""


def _md_negrito(texto: str) -> str:
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", esc(texto))


def quiz_html(d: dict) -> str:
    """A questão mao-1971 (OrtoQuestões Simulado no padrão do SIMÃO) respondida na própria página, sem
    JavaScript: cada alternativa abre o comentário dela, com o livro e a página. Sem a questão ou o
    comentário no acervo, o bloco some."""
    q = next((x for x in d["simulados"] if x["id"] == "mao-1971"), None)
    com = (ler_json(DIR_ACERVO / "comentarios" / "mao.json", {}) or {}).get("mao-1971")
    if not q or not isinstance(com, dict) or not com.get("correta"):
        return ""
    gab = q.get("gabarito")
    entradas = "".join(f'<input type="radio" name="mq" id="mq-{a["letra"]}" value="{a["letra"]}">' for a in q["alternativas"])
    alts = "".join(f'<label for="mq-{a["letra"]}"><b>{a["letra"]}</b><span>{esc(a["texto"])}</span></label>' for a in q["alternativas"])
    resp = []
    for a in q["alternativas"]:
        l = a["letra"]
        if l == gab:
            texto, veredito = com["correta"], f"Certo: {l}."
        else:
            texto, veredito = (com.get("incorretas") or {}).get(l, ""), f"Não é a {l}. A resposta é {gab}."
        resp.append(f'<div class="mao-quiz__resp mao-quiz__resp--{l}" role="status"><p class="mao-quiz__veredito">{esc(veredito)}</p>'
                    f'<p>{_md_negrito(texto)}</p><p><a href="{link_treino("SIMÃO", area="mao")}">Treinar mais questões no padrão do SIMÃO →</a></p></div>')
    return f"""<div class="mao-quiz" data-ui>
<p class="mao-quiz__origem">OrtoQuestões Simulado no padrão do SIMÃO</p>
<fieldset><legend>{esc(q["enunciado"])}</legend>{entradas}
<div class="mao-quiz__alts">{alts}</div>
{"".join(resp)}
<p class="mao-quiz__dica">Toque numa alternativa para ver o comentário.</p>
</fieldset></div>"""


def pagina_cirurgia_mao(d: dict) -> tuple[str, dict]:
    """Para quem procura no Google "banco de questões de cirurgia da mão", "curso
    preparatório para a prova de cirurgia da mão", "questões do título da SBCM",
    "SIMÃO" ou "onde estudar para a residência de cirurgia da mão" (pedido do
    Tales, 21/10/2026). Cirurgia da mão é outra especialidade, com categoria
    própria. SBCM e SIMÃO no acervo são OrtoQuestões Simulados (autorais, no
    padrão da prova); as seleções de residência são provas reais, com o nome da
    banca. Sem total de questões do acervo e sem citar curso ou concorrente."""
    pasta = "cirurgia-da-mao"
    titulo = "Questões de Cirurgia da Mão: título SBCM, SIMÃO e residência | Orto Questões"
    descricao = ("Banco de questões de cirurgia da mão para a prova de título da SBCM, o SIMÃO e as provas de residência "
                 "(USP-SP, ENARE, INTO, UFG e outras), com comentário de cada alternativa pela bibliografia.")
    oficiais = [q for q in d["oficiais"] if eh_mao(q)]
    simulados = [q for q in d["simulados"] if eh_mao(q)]
    por_prova: dict[str, Counter] = defaultdict(Counter)
    for q in oficiais:
        if q.get("prova"):
            por_prova[q["prova"]][q.get("ano")] += 1
    n_sim = Counter(q.get("prova") for q in simulados)
    provas = [p for p in PROVAS_MAO if p in por_prova] + sorted(p for p in por_prova if p not in PROVAS_MAO)
    nomes_provas = ", ".join(provas[:-1]) + " e " + provas[-1] if len(provas) > 1 else "".join(provas)
    # Temas que mais caem (27/10/2026): ingresso e título separados, cada questão pelo assunto principal,
    # a mesma regra do ranking do site (src/dados/modalidades.ts). Recontado a cada publicação.
    def principais(lista: list[dict]) -> Counter:
        return Counter((q.get("subtemas") or [""])[0] for q in lista
                       if not q.get("anulada") and not q.get("duplicataDe") and (q.get("subtemas") or [""])[0]
                       and not (q.get("subtemas") or [""])[0].startswith("Outr"))
    sub_ingresso = principais([q for q in oficiais if q.get("prova") not in ("SBCM", "SIMÃO")])
    sub_titulo = principais([q for q in simulados if q.get("prova") in ("SBCM", "SIMÃO")])
    subtemas = sub_ingresso
    treino = link_treino(area="mao")

    faq = [
        ("Onde estudar para a prova de título de cirurgia da mão?",
         "A base é a bibliografia indicada no edital da SBCM de cada ano. Para transformar a leitura em acerto de prova, treine com "
         "questões do mesmo assunto logo depois de estudar, leia o comentário de todas as alternativas e revise os erros em outro dia. "
         "No Orto Questões há OrtoQuestões Simulados no padrão da prova de título da SBCM e do SIMÃO, além das provas de seleção "
         "para a residência, com comentários apoiados na bibliografia de referência da especialidade."),
        ("Existe banco de questões de cirurgia da mão?",
         "Sim. O Orto Questões tem uma categoria própria de cirurgia da mão, separada da ortopedia, com provas de seleção para a "
         f"residência ({nomes_provas}) e OrtoQuestões Simulados no padrão do título da SBCM e do SIMÃO. Dá para treinar por prova, "
         "por ano e por assunto."),
        ("Tem curso preparatório para a prova de cirurgia da mão?",
         "O Orto Questões não é curso de videoaulas: é um banco de questões comentadas, com revisão espaçada, desempenho por assunto, "
         "simulados e cronograma. Ele serve como preparação por questões para quem estuda pela bibliografia e como complemento para "
         "quem já faz um curso."),
        ("O que é o SIMÃO?",
         "É o simulado do exame de título de especialista em cirurgia da mão. No Orto Questões, as questões no padrão do SIMÃO são "
         "OrtoQuestões Simulados: questões autorais, elaboradas a partir da bibliografia de referência, sem caráter oficial e sem "
         "vínculo com a SBCM."),
        ("As questões da SBCM são as da prova oficial?",
         "Não. As questões marcadas como SBCM e SIMÃO são OrtoQuestões Simulados, escritas no padrão dessas provas a partir da "
         "bibliografia, para treinar o formato e os assuntos. As provas de seleção para a residência (como USP-SP, ENARE, INTO e UFG) "
         "são reais, transcritas dos cadernos, com o nome da banca, o ano e o gabarito oficial."),
        ("Quem pode usar?",
         "Residentes de cirurgia da mão que vão prestar o título da SBCM, ortopedistas e cirurgiões que vão prestar a seleção para a "
         "residência em cirurgia da mão e cirurgiões da mão que querem revisar. Os pré-requisitos de cada seleção estão no edital "
         "de cada serviço."),
        ("Quais assuntos mais caem na prova de cirurgia da mão?",
         "Depende da prova. Nas seleções para a residência, os assuntos com mais questões no acervo são "
         + ", ".join(n.lower() if i else n for i, (n, _) in enumerate(sub_ingresso.most_common(5)))
         + ". No padrão do título (SBCM e SIMÃO), são "
         + ", ".join(n.lower() for n, _ in sub_titulo.most_common(5))
         + ". As duas listas, com a contagem, estão nesta página, e o site tem o ranking completo de cada prova."),
        ("O Orto Questões é gratuito?",
         "Criar a conta é grátis e já permite treinar, ver os comentários e usar a revisão dos erros. Os planos acrescentam recursos "
         "como o cronograma até a prova. Os limites atuais e o que cada plano inclui estão na página de planos do site."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Cirurgia da mão", d["data"],
                   ["Cirurgia da mão", "Título de especialista em cirurgia da mão", "SBCM", "SIMÃO",
                    "Residência médica em cirurgia da mão", "Banco de questões"])
    ld[0]["audience"] = {"@type": "EducationalAudience",
                         "educationalRole": "Residentes de cirurgia da mão, ortopedistas e cirurgiões que vão prestar o título ou a residência"}
    ld.append(ld_recurso(pasta, "Banco de questões de cirurgia da mão", descricao, "Banco de questões",
                         ["Cirurgia da mão", "Microcirurgia", "Punho", "Nervos periféricos", "Tendões da mão"]))
    ld.append(ld_faq(faq))

    corpo = [cabeca(pasta, titulo, descricao, ld, estilo=ESTILO_MAO, classe="mao")]
    corpo.append(f"""<div class="mao-heroi"><div class="env mao-heroi__grade">
<div class="mao-heroi__topo">
<nav class="migalhas" aria-label="Você está em"><a href="../">Orto Questões</a> › Cirurgia da mão</nav>
<h1>Questões de cirurgia da mão</h1></div>
<div class="mao-heroi__texto">
<p class="mao-lide">Para a prova de título da SBCM, o SIMÃO e as provas de residência em cirurgia da mão. Cada alternativa
comentada pela bibliografia, com o livro e a página.</p>
<div class="mao-acoes"><a class="mao-botao" href="{treino}">Treinar cirurgia da mão</a><a class="mao-link" href="{CRIAR_CONTA}">Criar conta grátis</a></div>
<ul class="mao-fatos"><li><b>{len(provas)}</b> provas de seleção para a residência</li><li><b>SBCM e SIMÃO</b> no padrão do título</li><li><b>Grátis</b> para começar, sem cartão</li></ul>
</div>
{quiz_html(d)}
</div></div>
<main class="env mao-corpo">""")
    corpo.append("""<section class="mao-quem"><h2>Feito para três momentos da carreira</h2>
<div class="mao-quem__grade">
<div><h3>Vai fazer o título</h3><p>Residentes de cirurgia da mão que se preparam para a prova de título de especialista da SBCM e para o SIMÃO, com questões no padrão das duas provas.</p></div>
<div><h3>Vai entrar na residência</h3><p>Ortopedistas e cirurgiões que vão prestar a seleção para a residência em cirurgia da mão, com as provas anteriores de cada serviço, com o nome real da banca.</p></div>
<div><h3>Já opera mão</h3><p>Cirurgiões da mão que querem revisar por assunto, em blocos curtos, com o comentário de cada alternativa e a referência do livro.</p></div>
</div></section>""")
    sim = {p: n_sim[p] for p in ("SBCM", "SIMÃO")}
    corpo.append(f"""<section class="mao-titulo"><h2>O título: SBCM e SIMÃO</h2>
<p class="mao-sub">Questões autorais, escritas a partir da bibliografia de referência, para treinar o formato e os assuntos das duas provas.
Não são as provas oficiais e não têm vínculo com a SBCM.</p>
<div class="mao-titulo__grade">
<a class="mao-campo mao-campo--vinho" href="{link_treino("SBCM", area="mao")}"><span class="mao-campo__nome">SBCM</span>
<span class="mao-campo__texto">Prova de título de especialista da Sociedade Brasileira de Cirurgia da Mão.</span>
<span class="mao-campo__pe"><span>{num(sim["SBCM"])} questões no padrão da prova</span><span class="mao-campo__ir">Treinar SBCM →</span></span></a>
<a class="mao-campo mao-campo--ouro" href="{link_treino("SIMÃO", area="mao")}"><span class="mao-campo__nome">SIMÃO</span>
<span class="mao-campo__texto">O simulado do exame de título de especialista em cirurgia da mão.</span>
<span class="mao-campo__pe"><span>{num(sim["SIMÃO"])} questões no padrão da prova</span><span class="mao-campo__ir">Treinar SIMÃO →</span></span></a>
</div></section>""")
    linhas = []
    for prova in provas:
        anos = por_prova[prova]
        com_ano = sorted(a for a in anos if a)
        linhas.append(
            f'<tr><th scope="row"><a href="{link_treino(prova, area="mao")}">{esc(NOMES_MAO.get(prova, prova))}</a></th>'
            f'<td>{", ".join(f"<a href=\"{link_edicao(prova, a)}\">{a}</a>" for a in com_ano) or "–"}</td><td class="num">{len(com_ano) or "–"} {"edição" if len(com_ano) == 1 else "edições"}</td>'
            f'<td class="num">{num(sum(anos.values()))}<span class="q"> questões</span></td></tr>'
        )
    corpo.append(f"""<section class="mao-provas"><div class="mao-provas__cabeca"><h2>Provas de residência em cirurgia da mão</h2>
<p class="mao-sub">Provas reais, transcritas dos cadernos, com o nome da banca, o ano e o gabarito oficial. Toque numa prova para treinar
só com ela, ou num ano para ver as questões daquela edição e o que caiu.</p></div>
<table class="mao-tabela"><caption class="so-leitor">Provas de seleção para a residência em cirurgia da mão no acervo</caption>
<thead><tr><th scope="col">Prova</th><th scope="col">Anos</th><th scope="col">Edições</th><th scope="col">Questões</th></tr></thead>
<tbody>{"".join(linhas)}</tbody></table></section>""")
    corpo.append("""<section class="mao-tela"><figure class="mao-tela__fig">
<img src="../imagens/seo/mao-questao-computador.jpg" width="1560" height="1170" loading="lazy"
alt="Questão de cirurgia da mão no Orto Questões: compressão do nervo ulnar na zona III do canal de Guyon, com as quatro alternativas">
<figcaption>Uma questão no padrão do SIMÃO, como aparece no site.</figcaption></figure>
<div class="mao-tela__texto"><h2>Como é treinar no site</h2>
<ul class="mao-lista">
<li><strong>Escolha a categoria Cirurgia da mão</strong> e filtre por prova, ano ou assunto.</li>
<li><strong>Responda e marque a confiança:</strong> certeza, dúvida ou chute.</li>
<li><strong>Leia o comentário de cada alternativa,</strong> inclusive da correta, com o livro e a página.</li>
<li><strong>O que errou volta sozinho</strong> na revisão espaçada, em outro dia.</li>
<li><strong>Veja o desempenho por assunto</strong> e o que a turma marcou em cada alternativa.</li>
</ul></div></section>""")
    def lista_rank(contagem: Counter) -> str:
        top = contagem.most_common(10)
        maximo = (top[0][1] if top else 1) or 1
        return "".join(
            f'<li><span class="mao-rank__nome">{esc(n)}</span><span class="mao-rank__n">{num(c)}</span>'
            f'<span class="mao-rank__barra" aria-hidden="true"><i style="width:{max(4, round(c * 100 / maximo))}%"></i></span></li>'
            for n, c in top
        )
    if sub_ingresso or sub_titulo:
        corpo.append(f"""<section class="mao-assuntos"><div class="env-interno"><h2>Os assuntos que mais caem</h2>
<p class="mao-sub">Ingresso e título têm rankings próprios: cada questão conta uma vez, pelo assunto principal, sem as anuladas.
No site, cada ranking se atualiza sozinho quando entram questões novas e vira um cronograma até a data da sua prova.</p>
<div class="mao-titulo__grade">
<div><h3>Provas de ingresso (residência)</h3><ol class="mao-rank">{lista_rank(sub_ingresso)}</ol>
<p><a class="mao-link" href="../#/temas-que-mais-caem?prova=mao-ingresso">Ranking completo do ingresso</a></p></div>
<div><h3>Título: SBCM e SIMÃO</h3><ol class="mao-rank">{lista_rank(sub_titulo)}</ol>
<p class="mao-sub">Contados nas questões no padrão da prova, escritas a partir de cada questão da SBCM e do SIMÃO.</p>
<p><a class="mao-link" href="../#/temas-que-mais-caem?prova=mao-titulo">Ranking completo do título</a></p></div>
</div>
<p><a class="mao-botao" href="../#/cronograma-mao">Montar o cronograma de cirurgia da mão</a></p></div></section>""")
    corpo.append("""<section class="mao-estudo"><div class="mao-estudo__texto"><h2>Onde estudar para a prova</h2>
<p>A base de qualquer preparação é a bibliografia indicada no edital da SBCM do ano, com os grandes tratados de cirurgia da mão e
microcirurgia. O que separa ler de acertar é treinar a decisão de prova: classificação, indicação, técnica e complicação, no formato das
questões.</p>
<ol class="mao-passos">
<li><strong>Escolha o assunto.</strong> Comece pelos que mais caem: anatomia, fraturas dos metacarpos e falanges, tendões, nervos, retalhos e microcirurgia.</li>
<li><strong>Leia o capítulo</strong> na bibliografia de referência.</li>
<li><strong>Responda questões do mesmo assunto</strong> e leia o comentário de todas as alternativas.</li>
<li><strong>Revise os erros</strong> em outro dia, na revisão espaçada.</li>
<li><strong>Faça uma prova no tempo</strong> a cada poucas semanas: uma seleção inteira ou um simulado no padrão do título.</li>
</ol></div>
<figure class="mao-estudo__fig"><img src="../imagens/seo/mao-questao-celular.jpg" width="780" height="1688" loading="lazy"
alt="A mesma questão de cirurgia da mão no celular, com a alternativa D marcada e o botão Responder D"></figure></section>""")
    corpo.append("""<section class="mao-curso"><h2>Curso preparatório ou banco de questões?</h2>
<p class="mao-frase">Quem procura um curso preparatório para a prova de cirurgia da mão precisa de três coisas: organizar a teoria,
treinar no formato da prova e não esquecer o que já estudou.</p>
<div class="mao-curso__grade">
<p>Aulas ajudam na primeira. Questões comentadas e revisão resolvem as outras duas. O Orto Questões não tem videoaulas: é a parte das
questões, com cronograma até a prova, desempenho por assunto e revisão dos erros.</p>
<p>Funciona sozinho, com a bibliografia, ou junto de um curso. As datas, os pré-requisitos e a bibliografia de cada prova estão no
edital da SBCM e de cada serviço: confira sempre a versão do ano.</p>
</div></section>""")
    itens_faq = "".join(f"<details><summary>{esc(p)}</summary><p>{esc(r)}</p></details>" for p, r in faq)
    corpo.append(f'<section class="mao-faq" id="perguntas"><h2>Perguntas frequentes</h2><div class="mao-faq__lista">{itens_faq}</div></section>')
    corpo.append(f"""</main><section class="mao-fim"><div class="env">
<h2 class="mao-fim__nome">Cirurgia da mão no Orto Questões</h2>
<p class="mao-fim__texto">Crie a conta grátis, escolha a categoria Cirurgia da mão e responda uma prova de seleção ou um simulado no padrão
do título. Em uma sessão você vê quais assuntos pedem mais atenção.</p>
<div class="mao-acoes"><a class="mao-botao" href="{CRIAR_CONTA}">Criar conta grátis</a><a class="mao-link" href="{treino}">Ver as questões</a></div>
</div></section><main class="env">""")
    corpo.append(relacionados(pasta))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_sobre(d: dict) -> tuple[str, dict]:
    """Quem faz, missão e contato, em HTML puro. A página "O projeto" do
    aplicativo (#/sobre) diz o mesmo, mas fica atrás do hash e do JavaScript."""
    pasta = "sobre"
    titulo = "Sobre o Orto Questões (OrtoQuestões): quem faz, missão e contato"
    descricao = ("O Orto Questões (OrtoQuestões, ortoquestoes.com.br) é um banco de questões comentadas de ortopedia e "
                 "traumatologia. Quem faz, missão e contato.")
    teot = d["por_prova"].get("TEOT", Counter())
    taro = d["por_prova"].get("TARO", Counter())
    organizacao = dict(
        ORGANIZACAO,
        description=("Banco de questões comentadas de ortopedia e traumatologia para residentes: provas anteriores do TEOT, do TARO "
                     "e de seleções de R4, com revisão espaçada, cronograma, simulados e flashcards."),
        founder={"@type": "Person", "name": "Tales"},
        knowsAbout=["Ortopedia e traumatologia", "TEOT", "TARO", "Residência médica em ortopedia", "Cirurgia da mão"],
        areaServed={"@type": "Country", "name": "Brasil"},
    )
    if CONTATO:
        organizacao["email"] = CONTATO
        organizacao["contactPoint"] = {"@type": "ContactPoint", "contactType": "Suporte", "email": CONTATO,
                                       "availableLanguage": "Portuguese"}
    ld = ld_pagina(pasta, titulo, descricao, "Sobre", d["data"], ["Orto Questões"], tipo="AboutPage")
    ld[0]["mainEntity"] = {"@id": f"{SITE}#organization"}
    ld.append(dict({"@context": "https://schema.org"}, **organizacao))
    corpo = [cabeca(pasta, titulo, descricao, ld)]
    contato_email = (f'<li>E-mail: <a href="mailto:{esc(CONTATO)}">{esc(CONTATO)}</a></li>' if CONTATO else "")
    corpo.append(heroi(
        "Sobre",
        "Sobre o Orto Questões: <em>quem faz e por quê</em>",
        "O Orto Questões (também escrito OrtoQuestões, no endereço ortoquestoes.com.br) é um banco de questões comentadas de "
        "ortopedia e traumatologia, criado e mantido por Tales para que o estudo caiba entre plantões e cirurgias.",
        "Sobre",
        [("Conhecer o banco de questões", "../banco-de-questoes-ortopedia/", "principal"), ("Falar com o autor", "../#/contato", "claro")],
        ["Feito para caber na rotina", "Gabarito da banca", "Sem vínculo com bancas"],
    ))
    corpo.append("""<section><h2>Quem faz</h2>
<p>O Orto Questões é um projeto independente, criado e mantido por <strong>Tales</strong>.
A ideia nasceu da rotina de quem se prepara: pouco tempo, muitos plantões e provas que cobram a ortopedia inteira. O site foi desenhado para
caber nesse dia a dia: da página inicial à primeira questão, no máximo dois cliques.</p>
<p>Quem estuda no site também ajuda a fazê-lo: toda questão tem um botão para enviar um comentário (o macete que ficou, a
divergência entre serviços, a referência que a banca costuma seguir), que é conferido e publicado com o crédito de quem enviou.</p></section>""")
    corpo.append("""<section><h2>Missão</h2>
<p>Que o residente de ortopedia consiga treinar com as questões das provas oficiais, entender por que cada alternativa está certa ou
errada e chegar ao TARO e ao TEOT sabendo o que estudar, mesmo com uma rotina de hospital.</p></section>""")
    corpo.append(f"""<section><h2>O que o site tem</h2><ul class="lista">
<li><strong>Provas anteriores</strong> do TEOT ({esc(faixa(sorted(a for a in teot if a)))}), do TARO ({esc(faixa(sorted(a for a in taro if a)))}),
do R4 do ENARE, de títulos de subespecialidade e de seleções, transcritas dos cadernos originais, com o gabarito da banca.</li>
<li><strong>Comentário</strong> com o conceito-chave e a análise de cada alternativa, inclusive a correta.</li>
<li><strong>Ferramentas de estudo</strong>: treino com filtros, modo prova com tempo, revisão espaçada, caderno de erros e desempenho por tema.</li>
<li><strong>Nos planos</strong>: cronograma até a prova, temas que mais caem área por área, resumão e Simulado Nacional mensal.</li>
<li><strong>Flashcards</strong> por assunto (beta) e questões autorais marcadas como OrtoQuestões Simulados.</li>
</ul></section>""")
    corpo.append("""<section><h2>Como os comentários são feitos</h2><div class="cartoes">
<div class="cartao"><h3>Bibliografia de referência</h3><p>A base é o que as bancas cobram: os tratados clássicos da especialidade, as classificações oficiais e os guias das sociedades.</p></div>
<div class="cartao"><h3>Redação com apoio de IA</h3><p>A inteligência artificial ajuda a organizar e redigir a explicação a partir dessas fontes. É ferramenta de escrita, não fonte, e pode errar um detalhe: confira na bibliografia indicada.</p></div>
<div class="cartao"><h3>Correção contínua</h3><p>Gabarito da banca que parece errado vem com aviso, e erro relatado é corrigido. Comentário é material de estudo: não substitui o livro nem a conduta do seu serviço.</p></div>
</div></section>""")
    corpo.append("""<section><h2>O que o Orto Questões não é</h2><ul class="lista">
<li>Não é curso de videoaulas: é um banco de questões, que pode ser usado sozinho, com a bibliografia ou junto de um curso.</li>
<li>Não tem vínculo com a SBOT nem com as instituições que organizam as provas. As questões marcadas como OrtoQuestões Simulados são autorais e não são oficiais.</li>
<li>Não divulga datas de prova: elas estão nos editais de cada ano.</li>
<li>Cirurgia da mão é tratada como outra especialidade, com categoria própria, e não como R4 de ortopedia.</li>
</ul></section>""")
    corpo.append("""<section><h2>O nome</h2>
<p>O nome é <strong>Orto Questões</strong>, com espaço. Ele também aparece junto, <strong>OrtoQuestões</strong>, e sem acento,
<strong>ortoquestoes</strong>, que é o endereço do site (ortoquestoes.com.br) e o perfil no Instagram (@ortoquestoes). Todas as
formas são o mesmo projeto.</p></section>""")
    corpo.append(f"""<section><h2>Contato</h2><ul class="lista">
{contato_email}
<li>Formulário de suporte e relato de erro: <a href="../#/contato">página de contato</a></li>
<li>Instagram: <a href="{INSTAGRAM}/" rel="me">@ortoquestoes</a></li>
</ul></section>""")
    corpo.append(chamada("Conheça por dentro", "A conta é grátis. Escolha uma prova ou um assunto e responda as primeiras questões em menos de um minuto."))
    corpo.append(relacionados(pasta))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": []}


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
        "desempenho por tema; flashcards (beta). Nos planos pagos: cronograma até a prova, temas que mais caem área por área, resumão e Simulado Nacional mensal.",
        "- Conta grátis. Preços, limites do acesso gratuito e condições estão em https://ortoquestoes.com.br/#/assinatura.",
        "- Não é um curso de videoaulas nem um curso preparatório: é um banco de questões com cronograma e simulados, que pode ser usado "
        "sozinho, com a bibliografia ou como complemento de um curso preparatório.",
        "- Criado e mantido por Tales; projeto independente, sem vínculo com a SBOT ou com as bancas.",
        f"- Instagram: @ortoquestoes ({INSTAGRAM}).",
        f"- Contato: {CONTATO} e {SITE}#/contato." if CONTATO else f"- Contato: {SITE}#/contato.",
        "",
        "## Páginas principais",
        "",
    ]
    for p in paginas:
        linhas.append(f"- [{p['titulo'].split(' | ')[0]}]({SITE}{p['pasta']}/): {p['descricao']}")
    linhas += [
        f"- [Questões comentadas por assunto]({SITE}questoes/): páginas públicas com questões, gabarito e conceito-chave, uma por assunto e uma por questão.",
        "",
        "## Guias de estudo",
        "",
    ]
    try:
        from gerar_guias_seo import GUIAS  # importado aqui: os guias importam este módulo
    except ImportError:
        GUIAS = []
    for guia in GUIAS:
        linhas.append(f"- [{guia['headline']}]({SITE}guias/{guia['slug']}.html): {guia['description']}")
    resumos = (ler_json(DIR_PUBLICO / "biblioteca" / "indice.json", {}) or {}).get("capitulos") or []
    if resumos:
        # Páginas de gerar_resumos_seo.py: o texto inteiro de cada resumo, aberto e grátis.
        linhas += [
            "",
            "## Resumos de capítulos (leitura aberta)",
            "",
            f"- [Todos os resumos]({SITE}resumos/): resumos autorais de capítulos da bibliografia de ortopedia, com as questões reais "
            "de prova que cobraram cada conceito. Não reproduzem o livro: cada um indica capítulo, edição e autores.",
        ]
        for r in resumos:
            linhas.append(f"- [{r['titulo']}]({SITE}resumos/{r['id']}/): {r['livro']}, {r['edicao']}, {r['capitulo']}. {r['resumo']}")
    linhas += [
        "",
        "## Como descrever o site",
        "",
        "- Nome: \"Orto Questões\" (com espaço). Formas aceitas: OrtoQuestões, Orto Questoes, ortoquestoes; quem busca \"orto questões\" procura este site.",
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
        inc = d["incidencia"]
        if inc.get("top"):
            nomes_area = {a["id"]: a["nome"] for a in inc.get("areas", [])}
            linhas += ["", "## Assuntos que mais aparecem nas provas oficiais do acervo", "",
                       "Contagem das questões de TEOT, TARO, CET-PR, TECOC e ENARE, sem cópias, anuladas ou questões autorais.", ""]
            for t in inc["top"][:20]:
                linhas.append(f"- {t['nome']} ({nomes_area.get(t['area'], t['area'])}): {num(t['n'])} questões")
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
    geradores = [pagina_banco, pagina_teot, pagina_curso_preparatorio, pagina_provas, pagina_r1, pagina_simulado,
                 pagina_flashcards, pagina_cirurgia_mao, pagina_sobre]
    from paginas_atlas_seo import GERADORES_ATLAS  # importa este módulo; por isso fica aqui dentro
    geradores += GERADORES_ATLAS
    paginas = []
    for gerar in geradores:
        texto, meta = gerar(d)
        pasta = DIR_PUBLICO / meta["pasta"]
        pasta.mkdir(parents=True, exist_ok=True)
        (pasta / "index.html").write_text(texto, encoding="utf-8")
        paginas.append(meta)
    (DIR_PUBLICO / "llms.txt").write_text(llms(d, paginas, False), encoding="utf-8")
    (DIR_PUBLICO / "llms-full.txt").write_text(llms(d, paginas, True), encoding="utf-8")
    print(f"{len(paginas)} páginas de destino (com /sobre/) e llms.txt em public/ (acervo de {d['data']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
