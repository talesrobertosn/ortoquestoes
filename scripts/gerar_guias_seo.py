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
        "title": "Como estudar para o TEOT com questões comentadas | Orto Questões",
        "description": "Um roteiro para usar questões comentadas na preparação para o TEOT: diagnóstico, treino por assunto, revisão e acompanhamento de erros.",
        "headline": "Como estudar para o TEOT com questões comentadas",
        "atualizado_em": "2026-10-08",
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
            ("Treinar no Orto Questões", "../#/treinar"),
            ("Questões de trauma e fraturas", "../questoes/trauma.html"),
            ("Questões de coluna", "../questoes/coluna.html"),
            ("Preparação para TEOT e TARO: como combinar recursos", "./preparacao-teot-taro.html"),
        ],
    },
    {
        "slug": "questoes-de-ortopedia-comentadas",
        "title": "Questões de ortopedia comentadas: como usar | Orto Questões",
        "description": "Entenda como aproveitar questões de ortopedia comentadas: enunciado, alternativas, gabarito, conceito-chave e revisão de erros.",
        "headline": "Como aproveitar questões de ortopedia comentadas",
        "atualizado_em": "2026-10-08",
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
As páginas públicas informam quando a questão vem de prova anterior ou de simulado do Orto Questões. Quando houver dúvida relevante sobre enunciado ou gabarito, confirme na prova ou no material de referência aplicável.
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
        "title": "Provas e questões de ortopedia por assunto | Orto Questões",
        "description": "Encontre questões de ortopedia organizadas por assunto para revisar mão, ombro, quadril, joelho, coluna, trauma, pé e tornozelo e mais.",
        "headline": "Questões de ortopedia organizadas por assunto",
        "atualizado_em": "2026-10-08",
        "content": """
Organizar o treino por assunto ajuda a estudar com uma pergunta clara: qual competência preciso consolidar agora? O Orto Questões reúne questões de provas de ortopedia e traumatologia e permite sair do tema amplo para blocos mais específicos.

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
    {
        "slug": "como-estudar-para-o-taro",
        "title": "Como estudar para o TARO com questões comentadas | Orto Questões",
        "description": "Organize o estudo para o TARO durante a residência: provas anteriores, blocos por assunto, revisão de erros e treino misto com questões comentadas.",
        "headline": "Como estudar para o TARO durante a residência",
        "atualizado_em": "2026-10-08",
        "content": """
O estudo para o TARO precisa caber entre plantões, ambulatório e centro cirúrgico. No Orto Questões, o treino com questões comentadas pode ajudar a transformar esse tempo limitado em uma rotina de recuperação do conhecimento. O ponto de partida é identificar o que você sabe explicar, o que acerta com dúvida e o que ainda precisa estudar.

### Comece pelas orientações da prova e por um bloco diagnóstico
Confira as orientações vigentes da avaliação e as referências adotadas no seu serviço. Depois, selecione questões anteriores do TARO no aplicativo e responda um bloco curto sem consultar o comentário. Anote os assuntos que trouxeram dificuldade. Uma sessão isolada tem poucos itens: use-a para orientar a revisão, sem interpretar seu resultado como previsão da nota da prova.

### Relacione o tema à rotina da residência
Escolha um assunto que apareceu no seu estágio e revise questões desse tema. Esse vínculo dá contexto ao estudo. Se o estágio ocupa quase toda a semana, reserve também um bloco misto para continuar encontrando assuntos de outras áreas; estudar apenas o rodízio atual pode deixar lacunas.

### Separe erro de conteúdo, erro de leitura e acerto inseguro
Quando faltar conhecimento, retome o comentário e a referência. Quando o problema for leitura, localize a palavra ou condição que mudou a resposta. Quando acertar sem conseguir justificar, mantenha o tema na revisão. Essas situações pedem ações diferentes, embora o percentual de acertos sozinho não mostre a diferença.

### Use sessões pequenas com um objetivo definido
Em um dia de pouco tempo, faça um bloco por assunto e leia os comentários com atenção. Em um período mais livre, treine com temas misturados e sem interrupções. Se cronometrar uma sessão, escolha o tempo a partir das regras atuais da avaliação; um treino curto não reproduz automaticamente o formato completo do TARO.

### Feche a semana retomando os pontos frágeis
Reveja as questões erradas e as respostas inseguras sem abrir antes o gabarito. Tente explicar a decisão em uma frase. Se a dificuldade se repetir, volte à bibliografia antes de aumentar o volume de questões. Na semana seguinte, preserve espaço para esses temas e para um novo bloco misto.

### Como usar o banco de questões nessa rotina
No aplicativo, escolha a prova e os assuntos para montar sua sessão. As páginas públicas permitem explorar questões por tema; o treino no aplicativo oferece o acompanhamento das respostas. Questões de provas anteriores e questões autorais de simulado têm origens distintas: confira a identificação de cada item ao estudar.
""",
        "links": [
            ("Montar um treino no Orto Questões", "../#/treinar"),
            ("Explorar questões de ortopedia por assunto", "../questoes/"),
            ("Questões de trauma e fraturas", "../questoes/trauma.html"),
            ("Organizar a preparação para TEOT e TARO", "./preparacao-teot-taro.html"),
        ],
    },
    {
        "slug": "preparacao-teot-taro",
        "title": "Preparação para TEOT e TARO: banco de questões | Orto Questões",
        "description": "Saiba como integrar questões comentadas, bibliografia, revisão e simulados à preparação para TEOT e TARO e escolher recursos conforme suas dificuldades.",
        "headline": "Preparação para TEOT e TARO com banco de questões de ortopedia",
        "atualizado_em": "2026-10-08",
        "content": """
Quem procura um preparatório de ortopedia para o TEOT ou o TARO precisa decidir como combinar estudo teórico, questões e revisão. O Orto Questões (também escrito OrtoQuestões) é um banco de questões comentadas de ortopedia e traumatologia: seu papel na preparação é oferecer treino, explicação das alternativas e caminhos para retomar os assuntos em que você teve dificuldade.

### Banco de questões e curso: qual recurso atende sua necessidade?
Um curso preparatório pode oferecer uma sequência de aulas, calendário e orientação docente; confira o que cada programa realmente inclui. Um banco de questões permite praticar a decisão cobrada no enunciado e encontrar lacunas no conhecimento. Se você precisa aprender um tema desde o início, organize a leitura da bibliografia e, quando fizer sentido, aulas. Se já estudou o assunto, questões e revisão ajudam a verificar o que consegue recuperar sem consulta. Os recursos podem ser combinados conforme sua rotina.

### Como avaliar questões comentadas antes de escolher
Abra algumas questões do assunto que você está estudando. Observe se a origem da questão está identificada, se o gabarito é informado e se o comentário explica por que as alternativas servem ou não ao caso. Uma letra certa sem raciocínio não mostra como resolver uma variação do problema. Confira também se você consegue encontrar os temas e voltar aos seus erros.

### O que fazer no Orto Questões
Você pode explorar páginas públicas por assunto e montar sessões no aplicativo. O treino reúne questões de provas anteriores e itens autorais de simulado, identificados conforme sua origem. O aplicativo oferece revisão, caderno de erros e acompanhamento de desempenho. Consulte a página de planos para verificar os limites do acesso gratuito e os recursos da assinatura antes de escolher sua rotina.

### Organize o ciclo de preparação
Comece com um diagnóstico curto. Escolha um tema frágil, revise a referência e responda novas questões sobre ele. Depois retome os erros e volte a blocos misturados. Reserve períodos de treino sem consulta para praticar leitura e organização do tempo. O percentual de acertos deve ser lido junto com o número de tentativas, os temas e a segurança da resposta.

### Ajuste o estudo à avaliação que você vai fazer
TEOT e TARO não devem ser tratados como uma única prova. Consulte as orientações e a bibliografia vigentes de cada avaliação, escolha os filtros correspondentes no treino e planeje as etapas exigidas. Um banco de questões treina a resolução de itens; outras habilidades avaliadas podem exigir preparação específica com o serviço e os preceptores.

### Escolha o próximo passo
Se o problema é começar uma rotina, use um roteiro de estudo e escolha blocos que caibam no seu dia. Se o problema é um tema, abra a página desse assunto. Se o erro volta mesmo depois de ler o comentário, retome a fonte e procure esclarecer a dúvida antes de continuar. A escolha do recurso deve responder à dificuldade que você encontrou.
""",
        "links": [
            ("Como estudar para o TEOT", "./como-estudar-para-o-teot.html"),
            ("Como estudar para o TARO", "./como-estudar-para-o-taro.html"),
            ("Banco de questões comentadas por assunto", "../questoes/"),
            ("Montar uma sessão de treino", "../#/treinar"),
            ("Conhecer o projeto", "../#/sobre"),
            ("Consultar os planos", "../#/assinatura"),
            ("Curso de ortopedia: como escolher", "./curso-de-ortopedia.html"),
        ],
    },
    {
        "slug": "questoes-cirurgia-da-mao",
        "title": "Questões de cirurgia da mão: como preparar a revisão | Orto Questões",
        "description": "Prepare o estudo para a prova de cirurgia da mão com questões comentadas, seleção da categoria correta e revisão por assunto. Cirurgia da mão é outra especialidade.",
        "headline": "Questões comentadas para a prova de cirurgia da mão",
        "atualizado_em": "2026-10-08",
        "content": """
A prova de cirurgia da mão pertence a outra especialidade e tem uma categoria própria no Orto Questões. Ela não é uma prova de R4 de ortopedia. Essa distinção importa ao escolher questões: uma questão de mão cobrada no TEOT não tem necessariamente o mesmo contexto de uma prova específica de cirurgia da mão.

### Escolha a categoria e depois a prova
No aplicativo, selecione Cirurgia da mão para montar o treino. Em seguida, confira os filtros de prova, ano e assunto disponíveis. A página pública de mão e punho reúne questões do tema de diferentes origens; para direcionar a sessão à especialidade, use a categoria correspondente no aplicativo e leia a identificação da prova em cada item.

### Use as provas anteriores para diagnosticar dificuldades
Responda um bloco sem consulta e registre os assuntos que provocaram erro ou dúvida. Compare a dificuldade entre itens de diferentes anos, sem transformar a repetição em garantia de cobrança futura. Antes de definir o programa de estudo, confira as orientações vigentes da avaliação e as referências indicadas.

### Leia além do gabarito
Depois de escolher uma resposta, explique por que ela atende ao enunciado. Use o comentário para comparar também as demais alternativas. Quando faltar base para entender a explicação, retome a bibliografia: memorizar a letra de uma prova anterior não resolve a mesma ideia em outro caso.

### Separe o treino dirigido do treino misto
Use blocos de um assunto para consolidar uma dificuldade específica. Depois misture os temas da categoria para praticar a identificação do problema sem depender do assunto anunciado. Retome as respostas erradas e as corretas por dúvida em outro dia.

### Acompanhe o progresso dentro da especialidade
Compare sessões com recortes semelhantes. Um resultado em questões gerais de ortopedia não deve ser interpretado como resultado equivalente em questões de cirurgia da mão. Ao revisar, confira sempre a origem do item e mantenha o plano alinhado à avaliação que você vai prestar.
""",
        "links": [
            ("Montar treino de Cirurgia da mão", "../#/treinar?areas=mao"),
            ("Explorar questões de mão e punho", "../questoes/mao.html"),
            ("Como aproveitar questões comentadas", "./questoes-de-ortopedia-comentadas.html"),
        ],
    },
    {
        "slug": "questoes-r4-quadril-coluna",
        "title": "Questões para R4 de quadril e coluna | Orto Questões",
        "description": "Organize a preparação para R4 e fellowship de quadril e para R4 de coluna com questões por categoria, comentários e revisão das dificuldades.",
        "headline": "Questões para R4 de quadril e coluna",
        "atualizado_em": "2026-10-08",
        "content": """
A preparação para uma seleção de R4 ou fellowship deve seguir as regras do programa escolhido. No Orto Questões, os recortes de quadril e coluna permitem direcionar o treino para essas áreas, enquanto as páginas públicas por assunto ajudam a explorar o conteúdo. Confira a origem de cada questão e o edital da seleção antes de decidir o que estudar.

### R4 de quadril e fellowship de quadril
O treino de quadril tem uma categoria própria no aplicativo, chamada Fellowship Quadril. Use esse recorte para encontrar as provas disponíveis e montar sessões da área. A página pública de quadril também inclui questões gerais de ortopedia sobre o tema; por isso, a categoria e a prova são importantes para selecionar o contexto desejado. Os requisitos e o formato de cada seleção devem ser verificados diretamente com o programa.

### R4 de coluna
Selecione R4 Coluna no aplicativo para direcionar o treino à categoria. Comece por um bloco curto de provas anteriores, registre os assuntos frágeis e volte à bibliografia para resolver as dúvidas. A página pública de coluna é uma entrada por tema, mas não substitui o filtro da categoria no treino: questões de TEOT, TARO e seleções específicas podem compartilhar o assunto sem ter o mesmo nível ou objetivo.

### Monte um plano a partir do edital e dos seus erros
Liste os conteúdos e as etapas informadas pelo programa. Relacione suas dificuldades a essa lista, reserve tempo para a leitura e use questões para testar a recuperação do conhecimento. Se a seleção incluir outras etapas, organize também a preparação exigida para elas; o treino de questões não reproduz todas as formas de avaliação.

### Alterne foco e abrangência
Uma sessão de um único assunto ajuda a esclarecer uma dificuldade. Um bloco misto da área exige reconhecer qual conhecimento usar em cada enunciado. Use os dois formatos e retome erros em outro dia. Compare resultados entre sessões de recorte semelhante, pois trocar a prova ou o assunto muda o significado do percentual de acertos.

### Outros recortes do acervo
O aplicativo também oferece R4 ENARE e provas de TEOT e TARO. Cirurgia da mão aparece separadamente, como outra especialidade, e não como R4. Para evitar misturar objetivos, confira as categorias marcadas antes de iniciar a sessão.
""",
        "links": [
            ("Montar treino de Fellowship Quadril", "../#/treinar?areas=quadril"),
            ("Montar treino de R4 Coluna", "../#/treinar?areas=coluna"),
            ("Questões por assunto: quadril", "../questoes/quadril.html"),
            ("Questões por assunto: coluna", "../questoes/coluna.html"),
            ("Questões de cirurgia da mão: outra especialidade", "./questoes-cirurgia-da-mao.html"),
        ],
    },
    {
        "slug": "curso-de-ortopedia",
        "title": "Curso de ortopedia: como escolher e estudar | Orto Questões",
        "description": "Procura um curso de ortopedia? Veja como avaliar aulas, questões comentadas e revisão para TEOT, TARO e seleções, conforme seu objetivo e sua rotina.",
        "headline": "Curso de ortopedia: como escolher para o seu objetivo",
        "atualizado_em": "2026-10-08",
        "content": """
A busca por um curso de ortopedia pode ter objetivos diferentes: começar a estudar a área, acompanhar a residência, preparar-se para o TEOT ou revisar para uma seleção de R4. Antes de escolher, defina qual problema você precisa resolver e como vai verificar o que aprendeu. Este guia ajuda a avaliar a proposta de um curso e a organizar o estudo com questões comentadas.

### Primeiro, identifique para quem o curso foi feito
Confira o público e os conhecimentos exigidos. Uma formação voltada à atualização do médico generalista tem uma proposta diferente de um preparatório para o TEOT. Na residência, o estudo para o TARO também precisa acompanhar as orientações da avaliação e do serviço. Para R4 de coluna ou fellowship de quadril, compare o programa de estudo com as exigências da seleção escolhida. Cirurgia da mão é outra especialidade e tem prova própria; não deve ser agrupada como R4 de ortopedia.

### Confira a proposta antes de comparar preços
Procure uma descrição clara dos assuntos, do formato das aulas, do período de acesso e das formas de tirar dúvidas. Se houver cronograma, veja se ele cabe entre plantões e estágios. Confira também o que está incluído na contratação: aulas, materiais, banco de questões e simulados podem ter condições distintas. Uma promessa de aprovação não substitui essas informações.

### Avalie uma amostra do material
Se o curso disponibilizar uma aula ou material de demonstração, observe se você consegue acompanhar o raciocínio e explicar a ideia central depois. Para questões comentadas, confira a origem da prova, o gabarito e a análise das alternativas. Ao terminar uma amostra, tente resolver outra questão do assunto sem consulta: isso ajuda a avaliar se o recurso atende à sua dificuldade.

### Transforme o calendário de aulas em uma rotina de estudo
Antes de uma aula, registre as dúvidas do tema. Depois, responda um bloco de questões e identifique o que ainda não consegue justificar. Use os erros para escolher a próxima leitura e reserve outro dia para retomar o assunto. Se tiver pouco tempo, reduza o tamanho do bloco para conseguir concluir também a correção. O plano precisa prever estudo e revisão, além do tempo de assistir às aulas.

### Como o Orto Questões entra nessa preparação
O Orto Questões é um banco de questões comentadas de ortopedia e cirurgia da mão. Você pode usá-lo junto à bibliografia e às aulas que escolher: explorar os assuntos, montar sessões no aplicativo, ler a explicação das alternativas e acompanhar os erros. O acervo inclui provas anteriores e questões autorais de simulado identificadas pela origem. As páginas públicas apresentam questões por assunto; o aplicativo oferece os filtros e o acompanhamento do treino. Consulte os planos para verificar o acesso gratuito e os recursos da assinatura.

### Escolha um recurso para cada dificuldade
Se você precisa construir a base de um tema, organize a leitura e as aulas. Se a dificuldade aparece ao resolver enunciados, faça treino dirigido e compare as alternativas. Se entende na hora, mas esquece depois, reserve sessões de revisão. Na preparação para uma prova, confira também as etapas e regras vigentes: um bloco de questões não reproduz todas as habilidades que podem ser avaliadas.

### Um roteiro para decidir
Defina a prova ou o objetivo, examine uma amostra, confira as condições de acesso e monte uma semana de estudo que caiba na sua rotina. Depois compare o que conseguiu explicar antes e após o estudo, incluindo os erros que se repetiram. Escolher um curso de ortopedia fica mais claro quando você sabe qual lacuna deseja resolver e como vai acompanhar o progresso.
""",
        "links": [
            ("Conhecer o banco de questões por assunto", "../questoes/"),
            ("Organizar a preparação para TEOT e TARO", "./preparacao-teot-taro.html"),
            ("Estudar para o TARO durante a residência", "./como-estudar-para-o-taro.html"),
            ("Preparação para R4 de quadril e coluna", "./questoes-r4-quadril-coluna.html"),
            ("Questões da especialidade Cirurgia da mão", "./questoes-cirurgia-da-mao.html"),
            ("Conhecer o Orto Questões e seus planos", "../#/assinatura"),
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
        "dateModified": guia["atualizado_em"],
        "mainEntityOfPage": f"{SITE}{caminho}",
        "author": {"@type": "Organization", "@id": f"{SITE}#organization", "name": "Orto Questões", "url": SITE},
        "publisher": {"@type": "Organization", "@id": f"{SITE}#organization", "name": "Orto Questões", "url": SITE},
    }
    return '<script type="application/ld+json">' + json.dumps(bloco, ensure_ascii=False) + "</script>"


def editorial_de_guia(texto: str) -> str:
    """O renderizador compartilhado usa H4 para seções de comentários.

    Nos guias a seção vem logo após H1, portanto ela deve ser H2. Mantemos a
    sintaxe editorial comum, mas corrigimos a semântica do documento final.
    """
    return editorial(texto).replace("<h4>", "<h2>").replace("</h4>", "</h2>")


def pagina_guia(guia: dict) -> str:
    caminho = f"guias/{guia['slug']}.html"
    corpo = [topo(guia["title"], guia["description"], caminho, dados_estruturados(guia), "../")]
    corpo.append('<nav class="migalhas meta"><a href="../">Início</a> › <a href="./">Guias</a></nav>')
    corpo.append(f"<h1>{guia['headline']}</h1>")
    corpo.append(editorial_de_guia(guia["content"]))
    corpo.append('<h2>Continue estudando</h2><ul class="temas">')
    for texto, url in guia["links"]:
        corpo.append(f'<li><a href="{url}">{texto}</a></li>')
    corpo.append("</ul>")
    corpo.append(rodape("../"))
    return "\n".join(corpo)


def indice() -> str:
    titulo = "Guias para estudar ortopedia | Orto Questões"
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
    manifesto = [
        {"arquivo": f"{guia['slug']}.html", "atualizado_em": guia["atualizado_em"]}
        for guia in GUIAS
    ]
    ARQUIVO = DIR_GUIAS / "_seo.json"
    ARQUIVO.write_text(json.dumps(manifesto, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(GUIAS) + 1} guias em public/guias/")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
