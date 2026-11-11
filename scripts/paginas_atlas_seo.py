"""
Páginas públicas do Atlas 3D (pedido do Tales, 25/10/2026): para quem procura no Google
"atlas 3D", "anatomia 3D", "esqueleto humano 3D" ou "músculos do corpo humano em 3D", sem
saber do Orto Questões. Chamadas por gerar_paginas_destino.py (mesmo cabeçalho, estilo e
rodapé); entram no sitemap pela lista PAGINAS_EXTRAS de lá.

Regras: só o que o atlas faz de verdade (camadas, busca, cortes, fichas ortopédicas, questões),
nenhum nome de outra marca, nenhuma quantidade do acervo. A anatomia citada é a clássica dos
livros-texto (206 ossos no adulto, grupos musculares), sem número inventado.
"""

from __future__ import annotations

from gerar_paginas_destino import cabeca, chamada, esc, faq_html, heroi, ld_faq, ld_pagina, ld_recurso, rodape

ATLAS = "../#/atlas"
ESTILO_ATLAS = """
.atl-vitrine{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:1.4rem;align-items:center;background:#0f2a22;
background-image:radial-gradient(rgba(159,227,212,.16) 1px,transparent 1.4px);background-size:22px 22px;color:#f3ecd6;border-radius:22px;padding:1.6rem 1.8rem;margin-block:1.6rem}
.atl-vitrine h2{color:#fff;margin-top:0}.atl-vitrine p{color:#dedfcc}.atl-vitrine figure{margin:0;text-align:center}
.atl-vitrine img{max-height:22rem;width:auto;max-width:100%;filter:drop-shadow(0 14px 14px rgba(0,0,0,.35))}
.atl-vitrine figcaption{font-size:.85rem;color:#9fe3d4}
.atl-frases{display:flex;flex-wrap:wrap;gap:.45rem;padding:0;list-style:none}
.atl-frases li{background:var(--veu);color:var(--marca);border-radius:999px;padding:.3rem .75rem;font-size:.9rem;font-weight:600}
@media (max-width:44rem){.atl-vitrine{grid-template-columns:1fr}.atl-vitrine img{max-height:16rem}}
"""
PAGINAS_ATLAS = [
    ("atlas-3d-online", "Atlas 3D online"),
    ("atlas-3d", "Atlas 3D"),
    ("esqueleto-humano-3d", "Esqueleto humano 3D"),
    ("musculos-do-corpo-humano-3d", "Músculos em 3D"),
]
DESCRICOES = {
    "atlas-3d-online": "O corpo humano completo em 3D: dos ossos aos órgãos, dentes e encéfalo.",
    "atlas-3d": "Atlas de anatomia 3D online e grátis, no navegador.",
    "esqueleto-humano-3d": "Os ossos do corpo humano em 3D, região por região.",
    "musculos-do-corpo-humano-3d": "Os músculos em 3D, por cima do esqueleto.",
}


def _vitrine(titulo: str, texto: str, botao: str, destino: str, legenda: str) -> str:
    return f"""<section class="atl-vitrine"><div><h2>{esc(titulo)}</h2><p>{esc(texto)}</p>
<div class="acoes"><a class="botao principal" href="{destino}">{esc(botao)}</a></div></div>
<figure><img src="../atlas3d/capa-esqueleto.png" width="316" height="740" alt="Esqueleto humano em 3D no Atlas 3D do Orto Questões, com o fêmur proximal destacado" loading="lazy">
<figcaption>{esc(legenda)}</figcaption></figure></section>"""


def _frases(lista: list[str]) -> str:
    return '<ul class="atl-frases">' + "".join(f"<li>{esc(f)}</li>" for f in lista) + "</ul>"


def _outras(pasta: str) -> str:
    itens = [(f"../{p}/", r, DESCRICOES[p]) for p, r in PAGINAS_ATLAS if p != pasta]
    itens += [("../flashcards-ortopedia/", "Flashcards de ortopedia", "Classificações e epônimos em cartões rápidos."),
              ("../banco-de-questoes-ortopedia/", "Banco de questões", "Provas de ortopedia comentadas, por assunto."),
              ("../resumos/", "Resumos de capítulos", "Os temas que mais caem, com as classificações.")]
    corpo = "".join(f'<li><a href="{h}"><b>{esc(t)}</b><span>{esc(d)}</span></a></li>' for h, t, d in itens)
    return f'<section><h2>Continue por aqui</h2><ul class="relacionados">{corpo}</ul></section>'


# ---------------------------------------------------------------------------------------------------------
# Imagens reais do atlas (11/11/2026, pedido do Tales): capturas feitas no próprio atlas por
# scripts/atlas3d/capturas_seo.mjs e guardadas em public/atlas3d/telas/. Cada uma entra na página como <img>
# com alt e legenda descritivos, no ImageObject da página e no sitemap de imagens (gerar_sitemap.py lê as
# páginas). Nome do arquivo, alt e legenda carregam as palavras que as pessoas buscam.
# ---------------------------------------------------------------------------------------------------------
from gerar_paginas_destino import SITE

PASTA_TELAS = "atlas3d/telas/"
IMAGENS = {
    "esqueleto": ("atlas-3d-esqueleto-humano-regioes", "Esqueleto humano em 3D no Atlas 3D online, com as regiões ortopédicas para escolher",
                  "O esqueleto inteiro em 3D, com as regiões para escolher (ombro, cotovelo, punho e mão, coluna, pelve e quadril, joelho, tornozelo e pé)."),
    "musculos": ("atlas-3d-musculos-do-corpo-humano", "Músculos do corpo humano em 3D sobre o esqueleto, vista anterior, no atlas de anatomia online",
                 "Músculos do corpo humano em 3D, por cima do esqueleto: cada músculo abre a ficha com origem, inserção, inervação e ação."),
    "musculo-ficha": ("atlas-3d-musculo-origem-insercao-inervacao", "Ficha do bíceps femoral em 3D com origem no túber isquiático, inserção na cabeça da fíbula e inervação pelo nervo tibial",
                      "Bíceps femoral (cabeça longa) em 3D: origem, inserção, inervação, ação e importância ortopédica, com a origem e a inserção acesas no osso."),
    "femur-areas": ("atlas-3d-femur-origem-e-insercao-muscular", "Fêmur em 3D com as áreas de origem e inserção dos músculos pintadas no osso, vista posterior",
                    "Áreas de origem (vermelho) e de inserção (azul) dos músculos desenhadas sobre o fêmur, na vista posterior."),
    "femur-ficha": ("atlas-3d-femur-proximal-ficha-ortopedica", "Fêmur proximal destacado no esqueleto 3D com a ficha ortopédica: classificações de fratura e questões de prova",
                    "Fêmur proximal em 3D com a ficha ortopédica: classificações das fraturas (Garden, Pauwels…), questões de anatomia e de fraturas."),
    "plexo": ("atlas-3d-plexo-braquial", "Plexo braquial em 3D com raízes, troncos, fascículo posterior e os nervos axilar, radial, musculocutâneo, mediano e ulnar",
              "Plexo braquial em 3D: raízes C5–T1, troncos superior, médio e inferior, fascículo posterior e os nervos terminais, com o nome sobre cada um."),
    "manguito": ("atlas-3d-manguito-rotador", "Manguito rotador em 3D: supraespinal, infraespinal, redondo menor e subescapular em volta da cabeça do úmero",
                 "Manguito rotador em 3D, vista posterior: supraespinal, infraespinal, redondo menor e subescapular, com os nervos supraescapular e axilar."),
    "joelho": ("atlas-3d-joelho-lca-lcp-meniscos", "Ligamentos do joelho em 3D: ligamento cruzado anterior (LCA), cruzado posterior (LCP) e meniscos medial e lateral",
               "Pivô central do joelho em 3D: LCA, LCP e os meniscos medial e lateral, cada um com a sua cor e o nome no modelo."),
    "ligamentos-pe": ("atlas-3d-ligamentos-do-tornozelo-e-pe", "Ligamentos do tornozelo e do pé em 3D, vista lateral: talofibulares, calcaneofibular e ligamentos do mediopé",
                      "Ligamentos do tornozelo e do pé em 3D, sobre os ossos: complexo lateral, sindesmose e os ligamentos do mediopé."),
    "coluna": ("atlas-3d-coluna-disco-ligamentos-raizes", "Coluna vertebral em 3D com discos intervertebrais, ligamentos, medula espinal, raízes nervosas e cauda equina",
               "Coluna vertebral em 3D: discos intervertebrais, ligamentos longitudinais e amarelos, medula espinal, raízes e cauda equina."),
    "nervos": ("atlas-3d-nervos-e-ossos-do-corpo-humano", "Nervos do corpo humano em 3D sobre o esqueleto: plexos, nervos dos membros e nervos cranianos",
               "Nervos e ossos do corpo humano em 3D: do plexo braquial ao nervo isquiático, com o trajeto de cada nervo sobre o esqueleto."),
    "vasos": ("atlas-3d-arterias-e-veias-do-corpo-humano", "Artérias e veias do corpo humano em 3D sobre o esqueleto, sistema circulatório completo",
              "Artérias (vermelho) e veias (azul) do corpo humano em 3D: da aorta e das cavas às artérias e veias dos dedos."),
    "coracao": ("atlas-3d-coracao-e-vasos", "Coração e vasos sanguíneos em 3D: sistema cardiovascular com artérias, veias e o coração no tórax",
                "Sistema cardiovascular em 3D: o coração, as artérias e as veias em destaque, com o resto do corpo translúcido."),
    "coracao-dentro": ("atlas-3d-coracao-camaras-e-valvas", "Anatomia do coração em 3D: átrios, ventrículos, valvas e músculos papilares com o nome de cada parte",
                       "Coração em 3D por partes: átrios, ventrículos, valvas tricúspide, mitral, aórtica e pulmonar e os músculos papilares."),
    "orgaos": ("atlas-3d-orgaos-do-torax-e-abdome", "Órgãos do corpo humano em 3D: pulmões, coração, fígado, estômago e intestinos no tórax e no abdome",
               "Órgãos do tórax e do abdome em 3D: pulmões, coração, fígado, estômago, intestinos, rins e baço no lugar."),
    "digestorio": ("atlas-3d-orgaos-sistema-digestorio", "Sistema digestório em 3D: esôfago, estômago, fígado, vesícula, pâncreas e intestinos",
                   "Sistema digestório em 3D, do esôfago ao colo, com o fígado e seus segmentos, a vesícula e o pâncreas."),
    "respiratorio": ("atlas-3d-sistema-respiratorio-pulmoes", "Sistema respiratório em 3D: pulmões, lobos, brônquios segmentares, traqueia, laringe e cavidade nasal",
                     "Sistema respiratório em 3D: traqueia, árvore brônquica, lobos pulmonares, laringe e cavidade nasal."),
    "encefalo": ("atlas-3d-encefalo-e-medula", "Encéfalo e medula espinal em 3D, vista lateral: lobos cerebrais, cerebelo, tronco encefálico e medula",
                 "Encéfalo e medula em 3D: lobos frontal, parietal, temporal e occipital, cerebelo, tronco encefálico e medula espinal."),
    "dentes": ("atlas-3d-dentes-e-boca-odontologia", "Dentes e boca em 3D para odontologia: arcadas dentárias com incisivos, caninos, pré-molares e molares",
               "Dentes em 3D para odontologia: incisivos, caninos, pré-molares e molares das arcadas superior e inferior, com a mandíbula e a maxila."),
    "teste": ("atlas-3d-teste-se-anatomia", "Teste de anatomia no Atlas 3D: estrutura acesa em dourado e quatro opções para escolher o nome",
              "Teste-se: o atlas acende uma estrutura e você escolhe o nome entre quatro opções, com placar e sequência de acertos."),
}


def imagem_existe(chave: str) -> bool:
    from gerar_paginas_destino import DIR_PUBLICO
    return (DIR_PUBLICO / PASTA_TELAS / f"{IMAGENS[chave][0]}.jpg").exists()


def _galeria(chaves: list[str], titulo: str, texto: str = "") -> str:
    """Galeria de capturas reais: cada figura com alt e legenda (as duas coisas que o Google Imagens lê)."""
    figuras = []
    for c in chaves:
        if not imagem_existe(c):
            continue
        arquivo, alt, legenda = IMAGENS[c]
        figuras.append(f'<figure><a href="../{PASTA_TELAS}{arquivo}.jpg"><img src="../{PASTA_TELAS}{arquivo}.jpg" width="1440" height="900" '
                       f'alt="{esc(alt)}" loading="lazy" decoding="async"></a><figcaption>{esc(legenda)}</figcaption></figure>')
    if not figuras:
        return ""
    intro = f"<p>{texto}</p>" if texto else ""
    return f'<section class="atl-galeria-sec"><h2>{esc(titulo)}</h2>{intro}<div class="atl-galeria">{"".join(figuras)}</div></section>'


def ld_imagens(chaves: list[str]) -> list[dict]:
    """ImageObject de cada captura (licença e página de licença como pede o Search Console)."""
    saida = []
    for c in chaves:
        if not imagem_existe(c):
            continue
        arquivo, alt, legenda = IMAGENS[c]
        url = f"{SITE}{PASTA_TELAS}{arquivo}.jpg"
        saida.append({
            "@context": "https://schema.org", "@type": "ImageObject", "contentUrl": url, "url": url, "name": alt, "caption": legenda,
            "width": 1440, "height": 900, "encodingFormat": "image/jpeg", "inLanguage": "pt-BR",
            "creditText": "Orto Questões · Atlas 3D", "creator": {"@type": "Organization", "name": "Orto Questões"},
            "copyrightNotice": "Orto Questões", "license": f"{SITE}licenca-de-imagens/", "acquireLicensePage": f"{SITE}licenca-de-imagens/",
        })
    return saida


def _com_previa(html: str, chave: str) -> str:
    """Troca a imagem de prévia (Open Graph) pela captura do atlas que representa a página."""
    if not imagem_existe(chave):
        return html
    arquivo, alt, _ = IMAGENS[chave]
    html = html.replace(f'<meta property="og:image" content="{SITE}previa-orto-questoes-coluna.jpg">', f'<meta property="og:image" content="{SITE}{PASTA_TELAS}{arquivo}.jpg">')
    html = html.replace('<meta property="og:image:width" content="1200">', '<meta property="og:image:width" content="1440">')
    html = html.replace('<meta property="og:image:height" content="630">', '<meta property="og:image:height" content="900">')
    return html.replace('<meta property="og:image:alt" content="Orto Questões: questões de ortopedia comentadas para TEOT, TARO e R4">', f'<meta property="og:image:alt" content="{esc(alt)}">')


ESTILO_GALERIA = """
.atl-galeria{display:grid;grid-template-columns:repeat(auto-fit,minmax(20rem,1fr));gap:1rem}
.atl-galeria figure{margin:0;background:var(--sup);border:1px solid var(--traco);border-radius:16px;overflow:hidden}
.atl-galeria img{display:block;width:100%;height:auto;aspect-ratio:16/10;object-fit:cover}
.atl-galeria figcaption{padding:.7rem .9rem .85rem;font-size:.92rem;line-height:1.45;color:var(--texto2)}
.atl-indice{display:flex;flex-wrap:wrap;gap:.4rem;padding:0;list-style:none}
.atl-indice a{display:inline-block;padding:.35rem .8rem;border-radius:999px;background:var(--sup);border:1px solid var(--traco);text-decoration:none;font-weight:600;font-size:.92rem}
.atl-publicos{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.9rem}
.atl-publicos div{padding:1rem 1.1rem;border-radius:16px;background:var(--sup);border:1px solid var(--traco)}
.atl-publicos h3{margin:.1rem 0 .35rem}
"""


def pagina_atlas_online(d: dict) -> tuple[str, dict]:
    """A página principal do atlas para o Google e para as IAs: o corpo humano inteiro em 3D, com as capturas de cada sistema."""
    pasta = "atlas-3d-online"
    titulo = "Atlas 3D online do corpo humano completo: anatomia 3D grátis | Orto Questões"
    descricao = ("Atlas de anatomia 3D online e completo: ossos, músculos, ligamentos, nervos, artérias, veias, órgãos, encéfalo, dentes e "
                 "boca em 3D, com nome em português, fichas conferidas em livro e questões comentadas. Para ortopedia, medicina, odontologia "
                 "e fisioterapia, no navegador e no celular.")
    todas = ["esqueleto", "musculos", "musculo-ficha", "femur-areas", "femur-ficha", "plexo", "manguito", "joelho", "ligamentos-pe", "coluna",
             "nervos", "vasos", "coracao", "coracao-dentro", "orgaos", "digestorio", "respiratorio", "encefalo", "dentes", "teste"]
    faq = [
        ("Qual é o melhor atlas 3D de anatomia online e grátis em português?",
         "O Atlas 3D do Orto Questões abre no navegador, sem instalar nada, com todos os nomes em português (Terminologia Anatômica). "
         "O esqueleto fica aberto para qualquer pessoa, a conta grátis libera os músculos, e a assinatura abre o corpo inteiro: ligamentos, "
         "nervos, vasos, órgãos, encéfalo, dentes e os sistemas."),
        ("O atlas 3D mostra o corpo humano completo?",
         "Mostra. Além do aparelho locomotor (ossos, músculos, ligamentos, cápsulas, bolsas e fáscias), há o modo Corpo inteiro com os "
         "sistemas cardiovascular, respiratório, digestório, urinário, nervoso, linfático, endócrino, os órgãos dos sentidos, os dentes e as "
         "regiões do corpo. São mais de 3 mil estruturas 3D, cada uma clicável."),
        ("As informações do atlas são confiáveis?",
         "As fichas são texto próprio, conferidas página a página em atlas de anatomia de referência, com a fonte citada em cada ficha. "
         "Quando os livros divergem, a ficha avisa. Origem e inserção dos músculos aparecem como áreas desenhadas no próprio osso."),
        ("Serve para odontologia?",
         "Serve. Os dentes (incisivos, caninos, pré-molares e molares), a maxila, a mandíbula, a articulação temporomandibular, os músculos "
         "da mastigação, a língua, as glândulas salivares e os nervos do trigêmeo têm modelo 3D e ficha própria."),
        ("Serve para a faculdade de medicina e para a residência?",
         "Serve para anatomia na graduação (medicina, enfermagem, fisioterapia, educação física, odontologia) e tem um foco a mais em "
         "ortopedia: cada osso mostra as fraturas e as classificações que caem no TEOT, no TARO e nas provas de residência, com as questões "
         "comentadas da estrutura."),
        ("Dá para estudar com o atlas, além de olhar?",
         "Dá. O modo Teste-se acende uma estrutura em dourado e pede o nome entre quatro opções, com placar. Há também visualizações prontas "
         "(manguito rotador, plexo braquial, pivô central do joelho, túnel do carpo e outras), nomes sobre o modelo e questões de cada estrutura."),
        ("O atlas funciona no celular?",
         "Funciona no celular, no tablet e no computador: um dedo gira, dois dedos aproximam e um toque abre a ficha. O modelo fica guardado "
         "no aparelho depois da primeira visita."),
        ("Tem versão masculina e feminina?",
         "Tem. No modo Corpo inteiro, uma chave troca entre a pelve masculina e a feminina (útero, colo, ovários e tubas)."),
    ]
    sobre = ["Atlas de anatomia 3D", "Anatomia humana", "Corpo humano", "Esqueleto humano", "Músculos", "Ligamentos", "Nervos", "Sistema cardiovascular",
             "Órgãos do corpo humano", "Neuroanatomia", "Anatomia dentária", "Ortopedia"]
    ld = ld_pagina(pasta, titulo, descricao, "Atlas 3D online", d["data"], sobre)
    ld += [ld_recurso(pasta, "Atlas 3D online do corpo humano do Orto Questões", descricao, "Atlas anatômico interativo",
                      ["Anatomia humana", "Osteologia", "Miologia", "Artrologia", "Neuroanatomia", "Angiologia", "Esplancnologia", "Anatomia dentária", "Anatomia aplicada à ortopedia"]),
           ld_faq(faq)]
    ld += ld_imagens(todas)
    corpo = [cabeca(pasta, titulo, descricao, ld, ESTILO_ATLAS + ESTILO_GALERIA)]
    corpo.append(heroi(
        "Atlas 3D online · corpo humano completo",
        "Atlas 3D online <em>do corpo humano completo</em>",
        "Ossos, músculos, ligamentos, nervos, vasos, órgãos, encéfalo, dentes e boca em 3D, no navegador. Clique em qualquer estrutura e veja "
        "o nome em português, a ficha conferida em livro e as questões comentadas. Feito para quem estuda ortopedia, medicina e odontologia.",
        "Atlas 3D online",
        [("Abrir o Atlas 3D", ATLAS, "principal"), ("Ver o corpo inteiro", "../#/atlas?m=corpo", "claro")],
        ["Grátis para começar", "Nomes em português", "Celular e computador"],
    ))
    corpo.append("""<section><h2>O que você encontra neste atlas de anatomia 3D</h2>
<ul class="atl-indice"><li><a href="#locomotor">Ossos e músculos</a></li><li><a href="#articulacoes">Ligamentos e articulações</a></li>
<li><a href="#nervos">Nervos</a></li><li><a href="#vasos">Artérias e veias</a></li><li><a href="#orgaos">Órgãos</a></li>
<li><a href="#encefalo">Encéfalo e medula</a></li><li><a href="#odonto">Dentes e boca</a></li><li><a href="#estudar">Estudar com o atlas</a></li>
<li><a href="#perguntas">Perguntas</a></li></ul>
<p>O <strong>Atlas 3D online</strong> do Orto Questões é um atlas de anatomia humana interativo: o corpo inteiro em três dimensões para girar,
aproximar, cortar e clicar. Ele abre na <strong>Ortopedia</strong>, com o aparelho locomotor em primeiro plano, e um toque leva ao
<strong>Corpo inteiro</strong>, com todos os sistemas. Todas as imagens desta página são capturas reais do atlas.</p></section>""")
    corpo.append('<div id="locomotor"></div>' + _galeria(["esqueleto", "musculos", "musculo-ficha", "femur-areas", "femur-ficha"],
        "Ossos e músculos do corpo humano em 3D",
        "O <strong>esqueleto humano 3D</strong> com todos os ossos e os <strong>músculos em 3D</strong> por cima, camada por camada. Cada músculo "
        "mostra origem, inserção, inervação e ação; cada osso mostra as áreas onde os músculos se prendem e, nos ossos longos, as fraturas e as "
        "classificações de cada parte (proximal, diáfise e distal)."))
    corpo.append('<div id="articulacoes"></div>' + _galeria(["joelho", "manguito", "ligamentos-pe", "coluna"],
        "Ligamentos e articulações em 3D",
        "Os <strong>ligamentos do joelho</strong> (LCA, LCP, colaterais e meniscos), do ombro, do punho, do tornozelo e do pé, os discos "
        "intervertebrais e os ligamentos da coluna, com a função de cada um e o que acontece quando lesam."))
    corpo.append('<div id="nervos"></div>' + _galeria(["plexo", "nervos"],
        "Nervos em 3D: plexos, nervos periféricos e cranianos",
        "O <strong>plexo braquial em 3D</strong> com raízes, troncos e fascículos, os nervos dos membros sobre os ossos e os doze pares cranianos, "
        "com o trajeto, as raízes e os músculos que cada nervo inerva."))
    corpo.append('<div id="vasos"></div>' + _galeria(["vasos", "coracao", "coracao-dentro"],
        "Artérias, veias e coração em 3D",
        "O <strong>sistema cardiovascular em 3D</strong>: o coração com átrios, ventrículos e valvas, a aorta e seus ramos, as veias cavas e o "
        "sistema porta, até as artérias e as veias dos dedos."))
    corpo.append('<div id="orgaos"></div>' + _galeria(["orgaos", "digestorio", "respiratorio"],
        "Órgãos do corpo humano em 3D",
        "Os <strong>órgãos em 3D</strong> do tórax e do abdome: pulmões e brônquios, fígado com os segmentos, estômago, intestinos, pâncreas, "
        "rins e suprarrenais, com localização, irrigação, drenagem e inervação na ficha."))
    corpo.append('<div id="encefalo"></div>' + _galeria(["encefalo"],
        "Encéfalo e medula espinal em 3D",
        "<strong>Neuroanatomia 3D</strong>: os lobos e os giros do cérebro, os núcleos da base, o tálamo, o tronco encefálico, o cerebelo, os "
        "ventrículos e a medula espinal com os tratos, as raízes e a cauda equina."))
    corpo.append('<div id="odonto"></div>' + _galeria(["dentes"],
        "Dentes e boca em 3D para a odontologia",
        "<strong>Anatomia dentária 3D</strong>: incisivos, caninos, pré-molares e molares das duas arcadas, a maxila e a mandíbula, a articulação "
        "temporomandibular, os músculos da mastigação, a língua, as glândulas salivares e o nervo trigêmeo com os alveolares."))
    corpo.append('<div id="estudar"></div>' + _galeria(["teste"],
        "Estudar com o atlas, não só olhar",
        "O modo <strong>Teste-se</strong> acende uma estrutura e pede o nome; as visualizações prontas montam os conjuntos que caem nas provas; "
        "cada estrutura tem as questões comentadas daquela anatomia."))
    corpo.append("""<section><h2>Para quem é este atlas 3D</h2><div class="atl-publicos">
<div><h3>Ortopedistas e residentes</h3><p>Anatomia aplicada à ortopedia: fraturas e classificações em cada osso, áreas de inserção, nervos em risco e as questões do TEOT, do TARO e da residência.</p></div>
<div><h3>Estudantes de medicina</h3><p>Osteologia, miologia, artrologia, neuroanatomia e esplancnologia em 3D, com a terminologia em português e o latim.</p></div>
<div><h3>Odontologia</h3><p>Dentes, arcadas, ATM, músculos da mastigação, língua, glândulas salivares e o trigêmeo em 3D.</p></div>
<div><h3>Fisioterapia e educação física</h3><p>Músculos com origem, inserção, ação e inervação, ligamentos e articulações, região por região.</p></div>
</div></section>""")
    corpo.append(f"""<section><h2>Por que estudar anatomia em 3D</h2>
<p>A figura do livro mostra um ângulo; o <strong>atlas anatômico 3D</strong> mostra todos. Girar o modelo deixa claras as relações que mais
caem nas provas: o nervo radial no sulco do úmero, o manguito em volta da cabeça umeral, o LCA cruzando o intercôndilo, o tálus entre os
maléolos, o fígado sob o diafragma, o plexo braquial passando entre os escalenos. Cortes, isolamento e nomes sobre o modelo fazem o resto.</p>
<p>Cada ficha é texto próprio, conferido em atlas de anatomia de referência, com a página citada para auditoria. A ortopedia é a casa do
atlas: ele abre no aparelho locomotor e liga cada osso às classificações e às questões comentadas do site.</p>
{_frases(["atlas 3D", "atlas 3D online", "atlas de anatomia 3D", "anatomia 3D online", "corpo humano 3D", "corpo humano completo 3D", "atlas anatômico online grátis",
          "esqueleto 3D", "músculos 3D", "ligamentos do joelho 3D", "plexo braquial 3D", "nervos 3D", "coração 3D", "órgãos do corpo humano 3D",
          "sistema digestório 3D", "encéfalo 3D", "neuroanatomia 3D", "dentes 3D", "anatomia dentária 3D", "anatomia para odontologia", "anatomia para fisioterapia"])}
</section>""")
    corpo.append("""<section><h2>Grátis, com conta grátis e para assinantes</h2><div class="tabela"><table>
<thead><tr><th>Quem</th><th>O que abre</th></tr></thead><tbody>
<tr><td><strong>Qualquer pessoa, sem cadastro</strong></td><td>O esqueleto inteiro em 3D, a busca, as regiões, as fichas e as questões de cada osso.</td></tr>
<tr><td><strong>Conta grátis</strong></td><td>Ossos e músculos, com as áreas de origem e inserção, e o Teste-se.</td></tr>
<tr><td><strong>Assinantes</strong></td><td>O atlas completo: ligamentos, nervos, artérias, veias, fáscias, órgãos, encéfalo, dentes, regiões e os sistemas do Corpo inteiro.</td></tr>
</tbody></table></div></section>""")
    corpo.append('<div id="perguntas"></div>' + faq_html(faq))
    corpo.append(chamada("Abra o corpo humano em 3D agora", "O esqueleto está aberto para todos. Crie a conta grátis para liberar também os músculos."))
    corpo.append(_outras(pasta))
    corpo.append(rodape())
    html = _com_previa("\n".join(corpo), "plexo")
    return html, {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_atlas(d: dict) -> tuple[str, dict]:
    pasta = "atlas-3d"
    titulo = "Atlas 3D de anatomia humana online e grátis | Orto Questões"
    descricao = ("Atlas de anatomia 3D grátis no navegador: gire o corpo humano, clique em ossos e músculos, veja o nome em português "
                 "e, em cada osso, as fraturas, as classificações e as questões. Funciona no celular, sem instalar nada.")
    faq = [
        ("Existe atlas de anatomia 3D grátis?",
         "Sim. No Atlas 3D do Orto Questões, os ossos ficam abertos para qualquer pessoa, sem cadastro. Com a conta grátis, os músculos "
         "também ficam liberados. As outras camadas (ligamentos, nervos, artérias, veias e fáscias) são para assinantes."),
        ("Precisa baixar aplicativo ou instalar alguma coisa?",
         "Não. O atlas abre direto no navegador, no computador, no tablet ou no celular. Depois da primeira visita, o modelo fica guardado "
         "no aparelho e abre mais rápido."),
        ("Os nomes estão em português?",
         "Sim. Os ossos, os músculos, os nervos e os ligamentos têm o nome em português, escrito à mão, e a busca aceita o nome em português, "
         "em inglês ou em latim."),
        ("Serve para estudar anatomia na faculdade de medicina?",
         "Serve para qualquer pessoa que estuda anatomia: estudantes de medicina, de fisioterapia, de enfermagem e de educação física. "
         "O foco extra é a ortopedia: cada osso mostra as lesões e as classificações que caem nas provas da especialidade."),
        ("Como uso o atlas 3D no celular?",
         "Arraste com um dedo para girar, afaste dois dedos para aproximar e toque num osso para abrir a ficha embaixo da tela. "
         "Um tutorial curto aparece na primeira visita."),
        ("Dá para ver por dentro, como num corte?",
         "Sim. O atlas tem cortes nos três planos (sagital, coronal e axial), além de isolar uma estrutura, esconder o que está "
         "na frente e ver o modelo de frente, de costas, de lado, de cima ou de baixo."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Atlas 3D", d["data"], ["Atlas de anatomia 3D", "Anatomia humana", "Esqueleto humano", "Músculos", "Ortopedia"])
    ld += [ld_recurso(pasta, "Atlas 3D de anatomia do Orto Questões", descricao, "Atlas anatômico interativo",
                      ["Anatomia humana", "Osteologia", "Miologia", "Anatomia aplicada à ortopedia"]), ld_faq(faq)]
    ld += ld_imagens(["esqueleto", "femur-ficha", "plexo", "joelho", "coracao", "teste"])
    corpo = [cabeca(pasta, titulo, descricao, ld, ESTILO_ATLAS + ESTILO_GALERIA)]
    corpo.append(heroi(
        "Atlas 3D · novo e em beta",
        "Atlas de anatomia 3D <em>grátis, no navegador</em>",
        "O corpo humano inteiro em 3D para girar, aproximar e clicar. Cada estrutura mostra o nome em português, e cada osso abre "
        "as fraturas, as classificações e as questões daquela região. Sem instalar nada, no computador ou no celular.",
        "Atlas 3D",
        [("Abrir o Atlas 3D", ATLAS, "principal"), ("Criar conta grátis", "../#/conta?modo=criar&amp;voltar=%2Fatlas", "claro")],
        ["Ossos abertos para todos", "Músculos com a conta grátis", "Nomes em português"],
    ))
    corpo.append(_vitrine(
        "Clique no osso. Veja a fratura.",
        "Escolha uma região (ombro, cotovelo, punho e mão, coluna, pelve e quadril, joelho, tornozelo e pé) e o atlas leva a câmera até ela. "
        "Clique no fêmur proximal, por exemplo, e a ficha abre com as classificações das fraturas dessa região e as questões de anatomia da estrutura.",
        "Começar pelo fêmur proximal", "../#/atlas?e=femur_r&amp;f=proximal", "Fêmur proximal destacado no esqueleto 3D",
    ))
    corpo.append("""<section><h2>O que dá para fazer no atlas 3D</h2><div class="cartoes">
<div class="cartao"><h3>Girar, aproximar e mover</h3><p>Anatomia humana 3D interativa: segure e arraste para girar, use a rodinha ou os dedos para chegar perto de cada osso.</p></div>
<div class="cartao"><h3>Ligar e desligar camadas</h3><p>Ossos, músculos, ligamentos, nervos, artérias, veias e fáscias. Monte só o que você quer ver naquele momento.</p></div>
<div class="cartao"><h3>Buscar pelo nome</h3><p>Digite "nervo radial", "escafoide" ou "supraespinal": a busca entende português, inglês e latim.</p></div>
<div class="cartao"><h3>Cortes e isolamento</h3><p>Corte o modelo nos planos sagital, coronal e axial, isole uma estrutura ou esconda o que está na frente.</p></div>
<div class="cartao"><h3>Fichas de ortopedia</h3><p>Em cada osso, as lesões que mais caem nas provas e as classificações, tiradas dos resumos do site.</p></div>
<div class="cartao"><h3>Questões da estrutura</h3><p>Responda as questões de anatomia daquela estrutura sem sair do atlas, com o comentário de cada alternativa.</p></div>
</div></section>""")
    corpo.append(f"""<section><h2>Anatomia 3D online para quem estuda medicina e ortopedia</h2>
<p>Um atlas anatômico em três dimensões resolve o que a figura do livro não mostra: a relação entre as estruturas. Ver o nervo radial
contornando o úmero, o manguito rotador em volta da cabeça umeral ou o tálus encaixado na pinça do tornozelo, girando o modelo, fixa a
anatomia de um jeito que a página plana não fixa. É por isso que tanta gente procura um <strong>atlas 3D</strong> para estudar.</p>
<p>O Atlas 3D do Orto Questões foi feito para isso, com um foco a mais: a anatomia que cai nas provas de ortopedia e traumatologia.
Quem se prepara para o TEOT, para o TARO ou para a residência encontra, em cada osso, o caminho direto para as classificações e as questões.</p>
{_frases(["atlas 3D", "atlas de anatomia 3D", "anatomia 3D online", "corpo humano 3D", "atlas anatômico online", "anatomia humana 3D grátis", "esqueleto 3D interativo", "músculos 3D"])}
</section>""")
    corpo.append("""<section><h2>Grátis, com conta grátis e para assinantes</h2><div class="tabela"><table>
<thead><tr><th>Quem</th><th>O que abre</th></tr></thead><tbody>
<tr><td><strong>Qualquer pessoa, sem cadastro</strong></td><td>O esqueleto inteiro em 3D, a busca, as regiões, as fichas e as questões de cada osso.</td></tr>
<tr><td><strong>Conta grátis</strong></td><td>Ossos e músculos, com liberdade para ligar e desligar as camadas.</td></tr>
<tr><td><strong>Assinantes</strong></td><td>O atlas completo: ligamentos, nervos, artérias, veias, fáscias e o Corpo inteiro (órgãos, encéfalo, dentes e os sistemas), além do resto do site (cronograma e Simulado Nacional).</td></tr>
</tbody></table></div></section>""")
    corpo.append(_galeria(["esqueleto", "femur-ficha", "plexo", "joelho", "coracao", "teste"], "Imagens do atlas 3D",
        "Capturas reais do atlas: o esqueleto, a ficha ortopédica do fêmur, o plexo braquial, o joelho, o coração e o Teste-se. Para o corpo humano completo, com todos os sistemas, veja o <a href=\"../atlas-3d-online/\">Atlas 3D online</a>."))
    corpo.append(faq_html(faq))
    corpo.append(chamada("Abra o esqueleto agora", "Os ossos estão abertos para todos. Crie a conta grátis para liberar também os músculos."))
    corpo.append(_outras(pasta))
    corpo.append(rodape())
    return _com_previa("\n".join(corpo), "femur-ficha"), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_esqueleto(d: dict) -> tuple[str, dict]:
    pasta = "esqueleto-humano-3d"
    titulo = "Esqueleto humano 3D interativo: os ossos do corpo em 3D | Orto Questões"
    descricao = ("Esqueleto humano em 3D, grátis e sem cadastro: gire, aproxime e clique em cada um dos ossos do corpo humano, com o nome "
                 "em português e, nos ossos longos, as fraturas e as classificações de cada parte.")
    faq = [
        ("Quantos ossos tem o corpo humano?",
         "O esqueleto do adulto tem, em geral, 206 ossos: 80 no esqueleto axial (crânio, coluna, costelas e esterno) e 126 no apendicular "
         "(membros e as cinturas que os prendem). O número pode variar um pouco de pessoa para pessoa, por ossos sesamoides e acessórios."),
        ("Posso ver o esqueleto 3D sem criar conta?",
         "Pode. O esqueleto inteiro fica aberto para qualquer pessoa, no computador e no celular. A conta grátis acrescenta os músculos."),
        ("O atlas mostra cada parte do osso?",
         "Nos ossos longos, sim: ao clicar, o atlas destaca o terço proximal, a diáfise ou o terço distal, porque as fraturas e as "
         "classificações mudam de uma parte para outra. O fêmur proximal, por exemplo, tem classificações diferentes das do fêmur distal."),
        ("Dá para ver só uma região, como a mão ou o pé?",
         "Dá. Escolha a região e o atlas mostra só os ossos dela, de um lado ou dos dois, com a câmera já posicionada."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Esqueleto humano 3D", d["data"], ["Esqueleto humano", "Ossos do corpo humano", "Osteologia", "Anatomia 3D"])
    ld += [ld_recurso(pasta, "Esqueleto humano 3D do Orto Questões", descricao, "Modelo anatômico 3D interativo",
                      ["Osteologia", "Ossos do corpo humano", "Anatomia aplicada à ortopedia"]), ld_faq(faq)]
    ld += ld_imagens(["esqueleto", "femur-ficha", "femur-areas", "coluna", "joelho"])
    corpo = [cabeca(pasta, titulo, descricao, ld, ESTILO_ATLAS + ESTILO_GALERIA)]
    corpo.append(heroi(
        "Atlas 3D · esqueleto",
        "Esqueleto humano 3D <em>para girar e clicar</em>",
        "Todos os ossos do corpo humano em 3D, com o nome em português. Clique num osso e veja onde ele fica, com quem se articula e, "
        "na ortopedia, quais fraturas e classificações caem nas provas.",
        "Esqueleto humano 3D",
        [("Abrir o esqueleto 3D", ATLAS, "principal"), ("Ver o fêmur proximal", "../#/atlas?e=femur_r&amp;f=proximal", "claro")],
        ["Grátis e sem cadastro", "No celular e no computador", "Nomes em português"],
    ))
    corpo.append(_vitrine(
        "Os ossos do corpo humano em 3D",
        "Gire o esqueleto inteiro ou vá direto a uma região. Cada clique destaca o osso e abre a ficha: o nome, o lado e, nos ossos que mais caem "
        "nas provas de ortopedia, as lesões e as classificações.",
        "Abrir o esqueleto", ATLAS, "O esqueleto completo, de frente",
    ))
    corpo.append("""<section><h2>Os ossos, região por região</h2><div class="tabela"><table>
<thead><tr><th>Região</th><th>Ossos</th></tr></thead><tbody>
<tr><td><strong>Crânio e face</strong></td><td>Frontal, parietais, temporais, occipital, esfenoide, etmoide, maxilas, zigomáticos, nasais e mandíbula, entre outros.</td></tr>
<tr><td><strong>Coluna vertebral</strong></td><td>7 vértebras cervicais (com o atlas, C1, e o áxis, C2), 12 torácicas, 5 lombares, sacro e cóccix.</td></tr>
<tr><td><strong>Tórax</strong></td><td>12 pares de costelas e o esterno (manúbrio, corpo e processo xifoide).</td></tr>
<tr><td><strong>Cintura escapular e membro superior</strong></td><td>Clavícula, escápula, úmero, rádio e ulna; no carpo, escafoide, semilunar, piramidal, pisiforme, trapézio, trapezoide, capitato e hamato; 5 metacarpos e 14 falanges.</td></tr>
<tr><td><strong>Pelve e membro inferior</strong></td><td>Osso do quadril (ílio, ísquio e púbis), fêmur, patela, tíbia e fíbula; no tarso, tálus, calcâneo, navicular, cuboide e os três cuneiformes; 5 metatarsos e 14 falanges.</td></tr>
</tbody></table></div></section>""")
    corpo.append(f"""<section><h2>Por que estudar osteologia em 3D</h2>
<p>Nos ossos do carpo e do tarso, na pelve e na coluna, a forma só faz sentido quando você gira a peça. O escafoide ponte entre as fileiras do
carpo, o tálus sem inserção muscular encaixado entre os maléolos, o acetábulo voltado para fora e para a frente: são relações que um
<strong>esqueleto humano 3D interativo</strong> mostra num gesto.</p>
<p>Para quem estuda ortopedia, o atlas vai além do nome: no fêmur, na tíbia, no úmero e nos outros ossos longos, o clique escolhe a parte do osso
(proximal, diáfise ou distal) e abre as classificações daquela fratura.</p>
{_frases(["esqueleto humano 3D", "ossos do corpo humano 3D", "esqueleto 3D online", "osteologia 3D", "ossos da mão 3D", "ossos do pé 3D", "coluna vertebral 3D", "pelve 3D"])}
</section>""")
    corpo.append(_galeria(["esqueleto", "femur-ficha", "femur-areas", "coluna", "joelho"], "O esqueleto humano em 3D, em imagens",
        "Capturas do atlas: o esqueleto inteiro, o fêmur com a ficha e com as áreas de inserção, a coluna com os discos e o joelho."))
    corpo.append(faq_html(faq))
    corpo.append(chamada("Gire o esqueleto agora", "Os ossos estão abertos para todos. Com a conta grátis, os músculos também."))
    corpo.append(_outras(pasta))
    corpo.append(rodape())
    return _com_previa("\n".join(corpo), "esqueleto"), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


def pagina_musculos(d: dict) -> tuple[str, dict]:
    pasta = "musculos-do-corpo-humano-3d"
    titulo = "Músculos do corpo humano em 3D: atlas de anatomia muscular | Orto Questões"
    descricao = ("Músculos do corpo humano em 3D, por cima do esqueleto: gire, esconda camadas e clique em cada músculo para ver o nome em "
                 "português. Grátis com a conta, no navegador, no computador e no celular.")
    faq = [
        ("Os músculos em 3D são grátis?",
         "São, com a conta grátis do Orto Questões: ossos e músculos ficam liberados. Sem cadastro, o atlas mostra os ossos."),
        ("Dá para ver um músculo sozinho?",
         "Dá. Clique no músculo e use \"isolar\" para ver só ele no esqueleto, ou \"esconder\" para tirar o que está na frente e ver a camada de baixo."),
        ("Clicar duas vezes no mesmo lugar faz o quê?",
         "O primeiro clique pega o músculo mais superficial; clicar de novo no mesmo ponto passa para a estrutura que está por baixo."),
        ("Os músculos têm nome em português?",
         "Sim, escritos à mão segundo a terminologia anatômica em português, e a busca também aceita o nome em inglês e em latim."),
    ]
    ld = ld_pagina(pasta, titulo, descricao, "Músculos em 3D", d["data"], ["Músculos do corpo humano", "Miologia", "Anatomia muscular", "Anatomia 3D"])
    ld += [ld_recurso(pasta, "Músculos do corpo humano em 3D do Orto Questões", descricao, "Modelo anatômico 3D interativo",
                      ["Miologia", "Anatomia muscular", "Anatomia aplicada à ortopedia"]), ld_faq(faq)]
    ld += ld_imagens(["musculos", "musculo-ficha", "manguito", "femur-areas"])
    corpo = [cabeca(pasta, titulo, descricao, ld, ESTILO_ATLAS + ESTILO_GALERIA)]
    corpo.append(heroi(
        "Atlas 3D · músculos",
        "Músculos do corpo humano <em>em 3D, camada por camada</em>",
        "Os músculos por cima do esqueleto, com o nome em português. Esconda os superficiais para ver os profundos, isole um músculo "
        "ou busque pelo nome. Grátis com a conta.",
        "Músculos em 3D",
        [("Ver os músculos em 3D", "../#/atlas?c=osso,musculo", "principal"), ("Criar conta grátis", "../#/conta?modo=criar&amp;voltar=%2Fatlas", "claro")],
        ["Grátis com a conta", "Superficiais e profundos", "Busca em português, inglês e latim"],
    ))
    corpo.append(_vitrine(
        "Anatomia muscular em 3D",
        "Ligue a camada de músculos e o esqueleto se cobre. Cada clique mostra o nome; esconda o músculo da frente e o atlas revela o que está embaixo.",
        "Abrir com os músculos", "../#/atlas?c=osso,musculo", "Comece pelo esqueleto e ligue os músculos",
    ))
    corpo.append("""<section><h2>Grupos musculares que mais caem nas provas</h2><div class="cartoes">
<div class="cartao"><h3>Manguito rotador</h3><p>Supraespinal, infraespinal, redondo menor e subescapular, em volta da cabeça do úmero.</p></div>
<div class="cartao"><h3>Quadríceps</h3><p>Reto femoral e os vastos lateral, medial e intermédio, que se juntam no tendão quadricipital.</p></div>
<div class="cartao"><h3>Isquiotibiais</h3><p>Bíceps femoral, semitendíneo e semimembranáceo, na face posterior da coxa.</p></div>
<div class="cartao"><h3>Tríceps sural</h3><p>Gastrocnêmio e sóleo, que formam o tendão do calcâneo.</p></div>
<div class="cartao"><h3>Pata de ganso</h3><p>Sartório, grácil e semitendíneo, inseridos juntos na face medial da tíbia.</p></div>
<div class="cartao"><h3>Tabaqueira anatômica</h3><p>Abdutor longo e extensor curto do polegar de um lado, extensor longo do polegar do outro, com o escafoide no fundo.</p></div>
</div></section>""")
    corpo.append(f"""<section><h2>Por que ver os músculos em 3D</h2>
<p>Origem, inserção e ação ficam mais fáceis quando você vê o músculo cruzando a articulação. Num <strong>atlas de músculos 3D</strong>,
dá para tirar o deltoide e ver o manguito por baixo, ou esconder o gastrocnêmio e encontrar o sóleo. É o tipo de relação que as
provas de anatomia e de ortopedia cobram.</p>
{_frases(["músculos do corpo humano 3D", "anatomia muscular 3D", "músculos 3D online", "miologia 3D", "manguito rotador 3D", "músculos da perna 3D", "músculos do braço 3D"])}
</section>""")
    corpo.append(_galeria(["musculos", "musculo-ficha", "manguito", "femur-areas"], "Os músculos em 3D, em imagens",
        "Capturas do atlas: os músculos do corpo inteiro, a ficha do bíceps femoral com origem e inserção acesas, o manguito rotador e as áreas de inserção no fêmur."))
    corpo.append(faq_html(faq))
    corpo.append(chamada("Veja os músculos agora", "Crie a conta grátis: ossos e músculos ficam liberados no atlas."))
    corpo.append(_outras(pasta))
    corpo.append(rodape())
    return _com_previa("\n".join(corpo), "musculos"), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


GERADORES_ATLAS = [pagina_atlas_online, pagina_atlas, pagina_esqueleto, pagina_musculos]
