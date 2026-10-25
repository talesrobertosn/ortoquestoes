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
    ("atlas-3d", "Atlas 3D"),
    ("esqueleto-humano-3d", "Esqueleto humano 3D"),
    ("musculos-do-corpo-humano-3d", "Músculos em 3D"),
]
DESCRICOES = {
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
    corpo = [cabeca(pasta, titulo, descricao, ld, ESTILO_ATLAS)]
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
<tr><td><strong>Assinantes</strong></td><td>Todas as camadas: ligamentos, nervos, artérias, veias e fáscias, além do resto do site (cronograma e Simulado Nacional).</td></tr>
</tbody></table></div></section>""")
    corpo.append(faq_html(faq))
    corpo.append(chamada("Abra o esqueleto agora", "Os ossos estão abertos para todos. Crie a conta grátis para liberar também os músculos."))
    corpo.append(_outras(pasta))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


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
    corpo = [cabeca(pasta, titulo, descricao, ld, ESTILO_ATLAS)]
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
    corpo.append(faq_html(faq))
    corpo.append(chamada("Gire o esqueleto agora", "Os ossos estão abertos para todos. Com a conta grátis, os músculos também."))
    corpo.append(_outras(pasta))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


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
    corpo = [cabeca(pasta, titulo, descricao, ld, ESTILO_ATLAS)]
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
    corpo.append(faq_html(faq))
    corpo.append(chamada("Veja os músculos agora", "Crie a conta grátis: ossos e músculos ficam liberados no atlas."))
    corpo.append(_outras(pasta))
    corpo.append(rodape())
    return "\n".join(corpo), {"pasta": pasta, "titulo": titulo, "descricao": descricao, "faq": faq}


GERADORES_ATLAS = [pagina_atlas, pagina_esqueleto, pagina_musculos]
