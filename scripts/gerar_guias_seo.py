#!/usr/bin/env python3
"""Gera guias editoriais estáticos, úteis fora do aplicativo por hash.

Não são páginas de palavras-chave: cada guia responde uma etapa concreta da
preparação e leva, por links reais, às questões e ao treino correspondente.
Alguns guias têm uma parte calculada do acervo a cada deploy (campo "extra"):
provas por ano, peso de cada área, assuntos que mais caem. Nenhum guia cita
outra marca, curso preparatório ou concorrente (regra do dono).
"""

from __future__ import annotations

import html
import json
from urllib.parse import quote

from gerar_paginas_seo import DIR_PUBLICO, SITE, editorial, ld, migalhas_ld, rodape, topo


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
            ("Como estudar para o TEOT no R1, no R2 e no R3", "./como-estudar-para-o-teot-r1-r2-r3.html"),
            ("Cronograma de estudo para o TEOT", "./cronograma-de-estudo-para-o-teot.html"),
            ("Os temas que mais caem no TEOT", "./temas-que-mais-caem-no-teot.html"),
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
            ("TARO: como usar as provas anteriores desde o R1", "./provas-anteriores-do-taro.html"),
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
            ("Conhecer o projeto", "../sobre/"),
            ("Curso preparatório para o TEOT: como escolher e combinar com questões", "../curso-preparatorio-teot/"),
            ("Consultar os planos", "../#/assinatura"),
            ("Curso de ortopedia: como escolher", "./curso-de-ortopedia.html"),
        ],
    },
    {
        "slug": "questoes-cirurgia-da-mao",
        "title": "Questões de cirurgia da mão e título de especialista (SIMÃO) | Orto Questões",
        "description": "Questões comentadas de cirurgia da mão para a seleção e para o título de especialista em cirurgia da mão, com OrtoQuestões Simulados no padrão do SIMÃO e revisão por assunto.",
        "headline": "Questões comentadas para a prova e o título de especialista em cirurgia da mão",
        "atualizado_em": "2026-10-18",
        "content": """
A prova de cirurgia da mão pertence a outra especialidade e tem uma categoria própria no Orto Questões. Ela não é uma prova de R4 de ortopedia. Essa distinção importa ao escolher questões: uma questão de mão cobrada no TEOT não tem necessariamente o mesmo contexto de uma prova específica de cirurgia da mão.

### Questões para o título de especialista em cirurgia da mão (SIMÃO)
Para quem se prepara para o título de especialista em cirurgia da mão, o Orto Questões tem OrtoQuestões Simulados escritos no padrão do SIMÃO, o Simulado do Exame para Obtenção do Título de Especialista em Cirurgia da Mão. São questões autorais do site, feitas por engenharia reversa do que esse simulado cobra (anatomia aplicada, nervos e transferências, congênitas, carpo, tendões, retalhos e microcirurgia) e comentadas a partir da bibliografia de referência, como o Green's Operative Hand Surgery. Não são questões oficiais nem foram elaboradas ou endossadas pelos organizadores do SIMÃO ou da prova de título. Novas questões entram com frequência.

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
            ("Treinar só os simulados no padrão do SIMÃO", "../#/treinar?areas=mao&provas=SIM%C3%83O"),
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
            ("Curso preparatório para o TEOT: como escolher e combinar com questões", "../curso-preparatorio-teot/"),
            ("Conhecer o Orto Questões e seus planos", "../#/assinatura"),
        ],
    },
]


# ---------------------------------------------------------------- guias com dados do acervo
#
# Os guias abaixo têm uma parte escrita (content) e uma parte calculada do acervo
# a cada deploy (extra): contagens por prova, ano e assunto, nunca digitadas à mão.
# Sem o total de questões do acervo (regra da marca) e sem datas de prova.

_DADOS: dict | None = None


def dados_do_acervo() -> dict:
    global _DADOS
    if _DADOS is None:
        from gerar_paginas_destino import carregar_dados  # importado aqui: o módulo também importa este

        _DADOS = carregar_dados()
    return _DADOS


def _esc(texto) -> str:
    return html.escape(str(texto if texto is not None else ""), quote=True)


def _num(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def _pct(parte: int, total: int) -> str:
    return f"{round(100 * parte / total)}%" if total else "–"


def _treino(prova: str | None = None, anos: list[int] | None = None, temas: str | None = None) -> str:
    partes = []
    if prova:
        partes.append("provas=" + quote(prova, safe=""))
    if anos:
        partes.append("anos=" + ",".join(str(a) for a in anos))
    if temas:
        partes.append(f"temas={temas}")
    return "../#/treinar" + ("?" + "&amp;".join(partes) if partes else "")


def _pagina_tema(slug: str) -> bool:
    return (DIR_PUBLICO / "questoes" / f"{slug}.html").exists()


def _link_tema(nome: str, slug: str) -> str:
    return f'<a href="../questoes/{slug}.html">{_esc(nome)}</a>' if _pagina_tema(slug) else _esc(nome)


def _tabela(cabecalho: list[str], linhas: list[list[str]], legenda: str = "") -> str:
    cab = "".join(f"<th>{c}</th>" for c in cabecalho)
    corpo = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in linha) + "</tr>" for linha in linhas)
    leg = f'<caption class="meta" style="text-align:left">{legenda}</caption>' if legenda else ""
    return f'<div style="overflow-x:auto"><table>{leg}<thead><tr>{cab}</tr></thead><tbody>{corpo}</tbody></table></div>'


def _slug_por_nome(d: dict) -> dict[str, str]:
    return {t["nome"]: t["slug"] for t in d["temas_com_questoes"]}


def _exemplos(d: dict, prova: str, ano: int, quantos: int = 3) -> list[dict]:
    """Questões do ano com página pública, de assuntos diferentes, sem figura."""
    vistos, saida = set(), []
    for q in d["oficiais"]:
        if q.get("prova") != prova or q.get("ano") != ano or q.get("anulada") or q.get("imagens"):
            continue
        if q["tema_slug"] in vistos or not (DIR_PUBLICO / "questoes" / q["tema_slug"] / f"{q['id']}.html").exists():
            continue
        vistos.add(q["tema_slug"])
        saida.append(q)
        if len(saida) >= quantos:
            break
    return saida


def _resumir(texto: str, limite: int) -> str:
    texto = " ".join((texto or "").split())
    return texto if len(texto) <= limite else texto[: limite - 1].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def extra_teot_por_ano(d: dict) -> str:
    from collections import Counter

    teot = [q for q in d["oficiais"] if q.get("prova") == "TEOT" and q.get("ano")]
    anos = sorted({q["ano"] for q in teot})
    if not anos:
        return ""
    por_ano_area: dict[int, Counter] = {a: Counter() for a in anos}
    for q in teot:
        por_ano_area[q["ano"]][q["tema_nome"]] += 1
    total_area = Counter(q["tema_nome"] for q in teot)
    slugs = _slug_por_nome(d)
    linhas = []
    for nome, total in total_area.most_common():
        linhas.append([_link_tema(nome, slugs.get(nome, ""))] + [_num(por_ano_area[a][nome]) for a in anos] + [f"<strong>{_num(total)}</strong>"])
    linhas.append(["<strong>Questões no acervo</strong>"] + [f"<strong>{_num(sum(por_ano_area[a].values()))}</strong>" for a in anos]
                  + [f"<strong>{_num(len(teot))}</strong>"])
    partes = ["<h2>Os assuntos de cada edição, lado a lado</h2>",
              "<p>Questões de cada prova do TEOT no acervo, por grande assunto. Questões repetidas entre provas contam uma vez; "
              "a tabela é recalculada a cada publicação do site.</p>",
              _tabela(["Assunto"] + [f'<a href="{_treino("TEOT", [a])}">{a}</a>' for a in anos] + ["Total"], linhas)]
    for ano in reversed(anos):
        contagem = por_ano_area[ano]
        n = sum(contagem.values())
        principais = ", ".join(f"{_esc(nome.lower())} ({_pct(k, n)})"
                               for nome, k in contagem.most_common(3))
        partes.append(f"<h3>TEOT {ano}</h3>")
        partes.append(f"<p>{_num(n)} questões no acervo. Os assuntos com mais questões: {principais}. "
                      f'<a href="{_treino("TEOT", [ano])}">Treinar só o TEOT {ano}</a>.</p>')
        exemplos = _exemplos(d, "TEOT", ano)
        if exemplos:
            partes.append('<ul class="lista-questoes">' + "".join(
                f'<li><a href="../questoes/{q["tema_slug"]}/{_esc(q["id"])}.html"><strong>{_esc(q["tema_nome"])}</strong>: '
                f'{_esc(_resumir(q["enunciado"], 120))}</a></li>' for q in exemplos) + "</ul>")
    sem_ano = sum(d["por_prova"].get("TEOT/TARO", {}).values())
    if sem_ano:
        partes.append(f'<p>Há ainda {_num(sem_ano)} questões de TEOT/TARO sem edição identificada no caderno de origem. '
                      f'<a href="{_treino("TEOT/TARO")}">Treinar essas questões</a>.</p>')
    return "\n".join(partes)


def extra_temas_que_mais_caem(d: dict) -> str:
    from collections import Counter

    slugs = _slug_por_nome(d)
    partes = []
    tt = d["tt"]
    n_tt = sum(tt.values())
    teot = Counter(q["tema_nome"] for q in d["oficiais"] if q.get("prova") == "TEOT")
    n_teot = sum(teot.values())
    if tt:
        linhas = [[_link_tema(nome, slugs.get(nome, "")), _pct(teot[nome], n_teot), _pct(n, n_tt)] for nome, n in tt.most_common()]
        partes += ["<h2>As áreas, em porcentagem das provas</h2>",
                   "<p>Quanto cada grande área representa nas questões do TEOT e, para comparar, no TEOT e no TARO somados. "
                   "Porcentagem das questões de cada prova no acervo, sem contar duas vezes uma questão repetida.</p>",
                   _tabela(["Área", "TEOT", "TEOT e TARO"], linhas)]
    inc = d["incidencia"]
    if inc.get("top"):
        nomes_area = {a["id"]: a["nome"] for a in inc.get("areas", [])}
        linhas = [[str(i), _esc(t["nome"]), _link_tema(nomes_area.get(t["area"], ""), t["area"]), _num(t["n"])]
                  for i, t in enumerate(inc["top"][:20], start=1)]
        partes += ["<h2>Os 20 assuntos que mais aparecem</h2>",
                   "<p>Contagem das questões das provas oficiais do acervo (TEOT, TARO, CET-PR, TECOC e ENARE), sem cópias, sem anuladas e "
                   "sem questões autorais. É a mesma contagem que ordena o cronograma do site.</p>",
                   _tabela(["#", "Assunto", "Área", "Questões"], linhas)]
    if inc.get("areas"):
        partes.append("<h2>Área por área: os assuntos que mais caem</h2>")
        for area in sorted(inc["areas"], key=lambda a: -a["n"]):
            focos = [f for f in area.get("focos", []) if not f["nome"].startswith("Outr")][:5]
            if not focos:
                continue
            itens = "".join(f"<li>{_esc(f['nome'])} <span class=\"meta\">· {_num(f['n'])} questões</span></li>" for f in focos)
            partes.append(f"<h3>{_link_tema(area['nome'], area['slug'])} <span class=\"meta\">· {_esc(str(area.get('pct', '')).replace('.', ','))}% das questões</span></h3>"
                          f'<ol>{itens}</ol><p class="meta"><a href="{_treino(temas=area["slug"])}">Treinar {_esc(area["nome"].lower())}</a></p>')
    return "\n".join(partes)


def extra_cronograma(d: dict) -> str:
    inc = d["incidencia"]
    if not inc.get("areas"):
        return ""
    areas = sorted(inc["areas"], key=lambda a: -a["n"])
    total = sum(a["n"] for a in areas)
    linhas = []
    for a in areas:
        fatia = a["n"] / total if total else 0
        reais = [f["nome"] for f in a.get("focos", []) if not f["nome"].startswith("Outr")]
        linhas.append([_link_tema(a["nome"], a["slug"]), f"{round(100 * fatia)}%", f"{round(100 * fatia)} h", _esc(", ".join(reais[:2]))])
    return "\n".join([
        "<h2>Quanto tempo para cada área</h2>",
        "<p>Uma divisão proporcional ao que caiu nas provas oficiais do acervo (TEOT, TARO, CET-PR, TECOC e ENARE). Para cada 100 horas "
        "de estudo, a coluna do meio mostra quantas iriam para cada área. É um ponto de partida: ajuste pelos seus erros.</p>",
        _tabela(["Área", "Peso nas provas", "Em 100 h de estudo", "Comece por"], linhas),
    ])


def extra_taro(d: dict) -> str:
    from collections import Counter

    taro = [q for q in d["oficiais"] if q.get("prova") == "TARO" and q.get("ano")]
    anos = sorted({q["ano"] for q in taro})
    if not anos:
        return ""
    por_ano = Counter(q["ano"] for q in taro)
    recentes = list(reversed(anos))[:5]
    antigos = [a for a in reversed(anos) if a not in recentes]
    def lista(anos_lista: list[int]) -> str:
        return '<ul class="temas">' + "".join(
            f'<li><a href="{_treino("TARO", [a])}"><strong>TARO {a}</strong></a> <span class="meta">· {_num(por_ano[a])} questões</span></li>'
            for a in anos_lista) + "</ul>"
    areas = Counter(q["tema_nome"] for q in taro)
    n = sum(areas.values())
    slugs = _slug_por_nome(d)
    linhas = [[_link_tema(nome, slugs.get(nome, "")), _num(k), _pct(k, n)] for nome, k in areas.most_common()]
    partes = ["<h2>As provas do TARO no acervo</h2>",
              f"<p>{len(anos)} edições identificadas por ano, de {anos[0]} a {anos[-1]}, transcritas dos cadernos divulgados pela "
              '<a href="https://sbot.org.br/comissoes/sobre-a-sbot-comissao-ensino-treinamento/taro/" rel="noopener">Comissão de Ensino '
              "e Treinamento da SBOT</a>, com o gabarito da banca. Toque numa edição para treinar só aquela prova.</p>",
              "<h3>As cinco mais recentes</h3>", lista(recentes)]
    if antigos:
        partes += ["<h3>As anteriores</h3>", lista(antigos)]
    partes += ["<h2>O que o TARO cobra, por área</h2>",
               "<p>Questões de todas as edições do TARO no acervo, por grande área. Questões repetidas entre provas contam uma vez.</p>",
               _tabela(["Área", "Questões", "Parte da prova"], linhas)]
    exemplos = _exemplos(d, "TARO", anos[-1], 4)
    if exemplos:
        partes += [f"<h2>Questões do TARO {anos[-1]} para ler agora</h2>",
                   '<ul class="lista-questoes">' + "".join(
                       f'<li><a href="../questoes/{q["tema_slug"]}/{_esc(q["id"])}.html"><strong>{_esc(q["tema_nome"])}</strong>: '
                       f'{_esc(_resumir(q["enunciado"], 120))}</a></li>' for q in exemplos) + "</ul>"]
    return "\n".join(partes)


GUIAS_NOVOS = [
    {
        "slug": "como-estudar-para-o-teot-r1-r2-r3",
        "title": "Como estudar para o TEOT no R1, no R2 e no R3 | Orto Questões",
        "description": "O que fazer em cada ano da residência de ortopedia para chegar ao TEOT preparado: base no R1, ampliação no R2 e reta final no R3, com questões e revisão.",
        "headline": "Como estudar para o TEOT no R1, no R2 e no R3",
        "atualizado_em": "2026-10-15",
        "content": """
O TEOT cobra a ortopedia e traumatologia inteira, e a residência dura três anos. Quem deixa tudo para o último ano precisa estudar a especialidade inteira de uma vez, com a rotina do R3 por cima. Quem distribui o esforço chega à reta final revisando, e não aprendendo do zero. Este guia mostra um jeito de dividir a preparação pelos três anos. É uma sugestão de organização: ajuste ao seu serviço, aos estágios e ao edital da SBOT do ano da sua prova.

### A ideia em uma tabela

| Ano | Objetivo | Questões | Provas anteriores | Revisão |
|---|---|---|---|---|
| R1 | Criar o hábito e a base | Blocos curtos, por assunto | O TARO do ano, como diagnóstico | Os erros da semana |
| R2 | Ampliar sem perder o que passou | Por assunto e misturadas | TARO anteriores, uma por mês | Revisão espaçada todos os dias |
| R3 | Fechar lacunas e treinar a prova | Misturadas, pelo que mais cai | TEOT no tempo de prova | Caderno de erros e resumo do que mais cai |

### R1: o hábito vale mais que o volume
O primeiro ano é quando a rotina aperta e o jeito de estudar se forma. O objetivo não é acertar muito, e sim criar uma rotina que sobreviva à semana de plantão e montar a base que o pronto-socorro cobra todos os dias.

- Comece por conceitos básicos (consolidação, osteossíntese, infecção) e trauma: aparecem desde o primeiro plantão e pesam nas provas.
- Faça blocos curtos de questões do assunto que você está vendo no serviço e leia o comentário de todas as alternativas.
- Use o TARO do ano como diagnóstico, não como sentença: ele mostra onde estão as lacunas.
- Em dia de plantão, um bloco pequeno só para manter o hábito. Na folga, um bloco maior e misturado.

### R2: ampliar sem esquecer
No segundo ano entram as subespecialidades, no ritmo dos estágios. O risco é estudar só o estágio do mês e esquecer o resto.

- Siga o estágio, mas reserve um bloco por semana de assuntos de outras áreas.
- Faça uma prova anterior do TARO por mês, de preferência no tempo de prova, e corrija pelo comentário.
- Use a revisão espaçada todos os dias: ela traz de volta o que você errou ou acertou com dúvida antes de esquecer.
- Comece a olhar quanto cada área pesa nas provas: pediatria, trauma e mão costumam ocupar uma fatia grande.

### R3: a reta final
No último ano, a preparação para o TEOT ganha prioridade. Confira cedo o edital da SBOT: requisitos de inscrição, etapas, bibliografia e datas mudam de uma edição para outra.

- Monte um cronograma até a prova, dividindo o tempo pelo que mais cai.
- Faça as provas anteriores do TEOT no modo prova, com tempo marcado, e compare os resultados entre provas parecidas.
- Separe erro de conteúdo, erro de leitura e acerto inseguro: cada um pede uma ação diferente.
- Nas últimas semanas, revise o caderno de erros e o resumo dos assuntos que mais caem, em vez de começar temas novos.
- Se o exame tiver outras etapas além da prova teórica, prepare-as com o seu serviço e os seus preceptores.

### Se você começou tarde
Não tente recuperar dois anos em dois meses. Priorize as áreas que mais caem, faça provas anteriores do TEOT para descobrir as lacunas e use a revisão espaçada para não perder o que já estudou. Um plano menor e cumprido rende mais do que um plano grande abandonado.

### Onde entram curso, livro e questões
Aulas organizam a teoria; a bibliografia é a fonte; as questões mostram se você consegue usar o que estudou numa decisão de prova. Nos três anos, o banco de questões é o fio que liga tudo: transforma o estágio, a aula e a leitura em treino e mostra o que revisar.
""",
        "links": [
            ("TEOT: como funciona e como se preparar", "../teot/"),
            ("Estudo no R1: um roteiro para o primeiro ano", "../curso-ortopedia-r1/"),
            ("Cronograma de estudo para o TEOT", "./cronograma-de-estudo-para-o-teot.html"),
            ("Os temas que mais caem no TEOT", "./temas-que-mais-caem-no-teot.html"),
            ("TARO: como usar as provas anteriores desde o R1", "./provas-anteriores-do-taro.html"),
            ("Curso preparatório para o TEOT: como escolher e combinar com questões", "../curso-preparatorio-teot/"),
            ("Treinar no Orto Questões", "../#/treinar"),
        ],
    },
    {
        "slug": "cronograma-de-estudo-para-o-teot",
        "title": "Cronograma de estudo para o TEOT: como montar o seu | Orto Questões",
        "description": "Como montar um cronograma de estudo para o TEOT que caiba na residência: tempo real por dia, peso de cada área nas provas, revisão, simulados e reta final.",
        "headline": "Cronograma de estudo para o TEOT: como montar o seu",
        "atualizado_em": "2026-10-15",
        "content": """
Um cronograma bom não é o mais ambicioso, é o que você consegue cumprir com plantões, centro cirúrgico e ambulatório. Ele responde a uma pergunta por dia: o que eu faço hoje? Este guia mostra os passos para montar o seu e, mais abaixo, quanto cada área pesa nas provas, com os números do acervo.

### 1. Comece pela data e pelo edital
Confira no edital da SBOT a data, as etapas e a bibliografia da sua edição. Conte as semanas até a prova. Tudo o que vem depois depende desse número.

### 2. Use o seu tempo real, não o ideal
Defina quanto tempo você tem num dia comum: 30 minutos, 1 hora, 1 hora e meia, 2 horas ou mais. Marque os dias de plantão como dias leves e as folgas como folgas de verdade. Um plano que pressupõe três horas por dia quebra na primeira semana difícil.

### 3. Divida o tempo pelo peso de cada área
Áreas que caem mais merecem mais tempo. A tabela mais abaixo mostra a divisão proporcional ao que caiu nas provas oficiais do acervo. Ajuste pelos seus erros: uma área que você já domina pode ceder espaço para outra.

### 4. Estude em passadas, não em blocos gigantes
Em vez de uma área inteira por semana, faça passadas pela especialidade:

1. Primeira passada: os assuntos que mais caem, em todas as áreas.
2. Segunda passada: os de prioridade média.
3. Terceira passada: o resto, se o tempo permitir.

Assim nenhuma área fica meses sem aparecer, e o que mais cai é visto mais de uma vez.

### 5. Misture o que já passou
Num dia típico, a maior parte do tempo vai para a área do dia, e uma parte menor para questões misturadas de áreas já vistas. A prova não avisa o assunto antes da questão, e a mistura treina isso.

### 6. Revise todos os dias, simule a cada poucas semanas
A revisão espaçada traz de volta o que você errou ou acertou com dúvida. Ela entra todos os dias, em pouco tempo. A cada duas ou três semanas, um mini-simulado com tempo mostra se o plano está funcionando.

### 7. Proteja a reta final
Nas duas últimas semanas, pare de abrir temas novos. Revise os erros, refaça uma prova anterior no tempo e leia o resumo dos assuntos que mais caem.

### Um modelo de fases

| Fase | O que fazer | Sinal para avançar |
|---|---|---|
| Diagnóstico | Uma prova anterior ou um bloco misturado, sem consulta | Você sabe quais áreas estão mais fracas |
| Primeira passada | O que mais cai em cada área, com questões depois da leitura | Todas as áreas foram vistas uma vez |
| Segunda passada | Prioridade média e retorno às áreas fracas | O acerto nas áreas fracas subiu |
| Simulados | Provas no tempo a cada duas ou três semanas | Os erros passam a ser de detalhe |
| Reta final | Revisão dos erros, resumo do que mais cai, uma prova no tempo | A prova chegou |

### No Orto Questões
Nos planos, o cronograma do site faz essas contas por você: você informa a data da prova e o tempo por dia, marca os dias de plantão como leves e recebe a lista de cada dia, começando pelo que mais cai, com revisões, mini-simulados e reta final. Na conta grátis, você monta as sessões por assunto e usa a revisão espaçada e o caderno de erros.
""",
        "extra": extra_cronograma,
        "links": [
            ("Os temas que mais caem no TEOT", "./temas-que-mais-caem-no-teot.html"),
            ("Como estudar para o TEOT no R1, no R2 e no R3", "./como-estudar-para-o-teot-r1-r2-r3.html"),
            ("Simulados para o TEOT e o TARO", "../simulado-teot/"),
            ("Provas do TEOT ano a ano", "./questoes-teot-por-ano.html"),
            ("Montar o cronograma no site (planos)", "../#/cronograma"),
            ("Conhecer os planos", "../#/assinatura"),
        ],
    },
    {
        "slug": "questoes-teot-por-ano",
        "title": "Provas do TEOT ano a ano: os assuntos de cada edição | Orto Questões",
        "description": "Questões do TEOT por ano: quantas questões de cada edição estão no acervo, os assuntos que cada prova mais cobrou e exemplos para ler sem conta.",
        "headline": "Provas do TEOT ano a ano: os assuntos que cada edição cobrou",
        "atualizado_em": "2026-10-15",
        "content": """
Cada edição do TEOT tem a sua cara. Olhar as provas lado a lado ajuda a perceber o que se repete e onde estão as suas lacunas. Esta página mostra, a partir do acervo do Orto Questões, quantas questões de cada edição estão transcritas e quais assuntos cada prova mais cobrou, com exemplos que você pode ler sem conta.

### Como usar as provas anteriores do TEOT
- Use a prova mais recente como diagnóstico: faça no modo prova, com tempo, sem consulta.
- Use as outras edições como treino por assunto: filtre o ano e o tema que você está estudando.
- Corrija pelo comentário de todas as alternativas, inclusive das que você acertou por eliminação.
- Compare provas parecidas entre si. Trocar de prova muda o significado do percentual de acerto.

### O que esta página não diz
A distribuição de uma edição não prevê a próxima. Os números abaixo são um retrato do que já caiu e servem para decidir a ordem do estudo, não para deixar áreas de fora. As questões são transcritas dos cadernos originais com o gabarito da banca; questões anuladas ficam marcadas no site e não contam no desempenho.
""",
        "extra": extra_teot_por_ano,
        "links": [
            ("Questões do TEOT e do TARO, ano a ano", "../questoes-teot-taro/"),
            ("Os temas que mais caem no TEOT", "./temas-que-mais-caem-no-teot.html"),
            ("Simulado TEOT: provas no tempo", "../simulado-teot/"),
            ("Como estudar para o TEOT com questões comentadas", "./como-estudar-para-o-teot.html"),
            ("Treinar com provas do TEOT", "../#/treinar?provas=TEOT"),
        ],
    },
    {
        "slug": "temas-que-mais-caem-no-teot",
        "title": "Temas que mais caem no TEOT e no TARO, com os números | Orto Questões",
        "description": "Os temas que mais caem no TEOT e no TARO: o peso de cada área e os assuntos campeões, contados nas provas oficiais do acervo do Orto Questões.",
        "headline": "Os temas que mais caem no TEOT e no TARO",
        "atualizado_em": "2026-10-15",
        "content": """
Saber o que mais cai ajuda a decidir por onde começar. As tabelas abaixo não são opinião: são contagens das questões das provas oficiais transcritas no acervo do Orto Questões, refeitas a cada publicação do site.

### Como ler os números
- **Peso da área** é a parte das questões de cada prova que tratou daquela área.
- **Os assuntos campeões** são os subtemas com mais questões, somando as provas oficiais do acervo.
- Nenhuma questão conta duas vezes quando se repete entre provas, e as questões autorais do site ficam de fora. Na lista dos assuntos campeões, as anuladas também ficam de fora.

### Como usar na preparação
Comece pelos assuntos que mais caem em todas as áreas, e não por uma área inteira de cada vez. Depois volte aos de prioridade média. "Cai muito" é prioridade, não exclusividade: a prova cobra a especialidade inteira, e um assunto pouco frequente ainda pode aparecer. Use a lista para decidir a ordem e o tempo de estudo, e os seus erros para ajustar.

### Os números servem para o TARO?
Servem como referência de conteúdo: o TARO e o TEOT cobram a ortopedia e traumatologia geral, e as duas provas estão somadas na primeira tabela. Para o formato e o nível de cada uma, treine também com as provas anteriores da prova que você vai fazer.
""",
        "extra": extra_temas_que_mais_caem,
        "links": [
            ("Cronograma de estudo para o TEOT", "./cronograma-de-estudo-para-o-teot.html"),
            ("Provas do TEOT ano a ano", "./questoes-teot-por-ano.html"),
            ("TEOT: como funciona e como se preparar", "../teot/"),
            ("Questões por assunto", "../questoes/"),
            ("Temas que mais caem no site, com a lista completa (planos)", "../#/temas-que-mais-caem"),
        ],
    },
    {
        "slug": "provas-anteriores-do-taro",
        "title": "TARO: como usar as provas anteriores desde o R1 | Orto Questões",
        "description": "Provas anteriores do TARO, a avaliação anual da SBOT para residentes: edições no acervo, o que cada área pesa e como usar uma prova por mês desde o R1.",
        "headline": "TARO: como usar as provas anteriores desde o R1",
        "atualizado_em": "2026-10-15",
        "content": """
O TARO é a avaliação anual da SBOT aplicada aos residentes de ortopedia e traumatologia. Para quem está no R1, as provas anteriores são o jeito mais direto de entender o que a especialidade cobra e de medir a evolução ao longo da residência. Este guia mostra como usá-las e quais estão no acervo do Orto Questões.

### Por que começar pelas provas anteriores
- Mostram o nível e o formato das questões, sem depender de adivinhação.
- Cobrem a ortopedia inteira, e não só o estágio do mês.
- Servem de treino de conteúdo também para o TEOT, que cobra a mesma ortopedia e traumatologia geral.

### Uma prova por mês
Uma rotina possível ao longo da residência:

1. No começo do mês, faça uma prova anterior do TARO no modo prova, com tempo e sem consulta.
2. Corrija pelo comentário de todas as alternativas e anote os assuntos que trouxeram erro ou dúvida.
3. Nas semanas seguintes, estude esses assuntos e responda questões deles no treino por assunto.
4. Deixe a revisão espaçada trazer de volta as questões erradas em outro dia.
5. No mês seguinte, outra edição. Compare os resultados entre provas parecidas, e não com a nota de outra pessoa.

### Por qual edição começar
As mais recentes mostram melhor o estilo atual da prova; as mais antigas continuam boas para treinar conteúdo por assunto. Um caminho simples é alternar: uma recente no modo prova, uma antiga filtrada pelo tema que você está estudando.

### Antes da prova do ano
Confira as orientações vigentes da avaliação com a sua residência e com a SBOT. O resultado de um treino curto não prevê a nota: use-o para escolher o que estudar.
""",
        "extra": extra_taro,
        "links": [
            ("Como estudar para o TARO durante a residência", "./como-estudar-para-o-taro.html"),
            ("Questões do TEOT e do TARO, ano a ano", "../questoes-teot-taro/"),
            ("Estudo no R1: um roteiro para o primeiro ano", "../curso-ortopedia-r1/"),
            ("Como estudar para o TEOT no R1, no R2 e no R3", "./como-estudar-para-o-teot-r1-r2-r3.html"),
            ("Treinar com provas do TARO", "../#/treinar?provas=TARO"),
        ],
    },
]

# Os guias novos entram logo depois do guia do TEOT, para o índice ficar em ordem de interesse.
GUIAS[1:1] = GUIAS_NOVOS


ORGANIZACAO = {
    "@type": "Organization",
    "@id": f"{SITE}#organization",
    "name": "Orto Questões",
    "alternateName": ["OrtoQuestões", "ortoquestoes"],
    "url": SITE,
    "logo": {"@type": "ImageObject", "url": f"{SITE}icone-512.png", "width": 512, "height": 512},
    "sameAs": ["https://www.instagram.com/ortoquestoes"],
}


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
        "image": f"{SITE}previa-orto-questoes-coluna.jpg",
        "author": ORGANIZACAO,
        "publisher": ORGANIZACAO,
        "isPartOf": {"@type": "WebSite", "@id": f"{SITE}#website", "name": "Orto Questões", "url": SITE},
    }
    return ld(bloco) + "\n" + ld(migalhas_ld(("Guias de estudo", "guias/"), (guia["headline"], caminho)))


def editorial_de_guia(texto: str) -> str:
    """O renderizador compartilhado usa H4 para seções de comentários.

    Nos guias a seção vem logo após H1, portanto ela deve ser H2. Mantemos a
    sintaxe editorial comum, mas corrigimos a semântica do documento final.
    """
    # Tabela larga rola dentro da própria caixa no celular, sem empurrar a página.
    return (editorial(texto).replace("<h4>", "<h2>").replace("</h4>", "</h2>")
            .replace("<table>", '<div style="overflow-x:auto"><table>').replace("</table>", "</table></div>"))


def pagina_guia(guia: dict) -> str:
    caminho = f"guias/{guia['slug']}.html"
    corpo = [topo(guia["title"], guia["description"], caminho, dados_estruturados(guia), "../")]
    corpo.append('<nav class="migalhas meta"><a href="../">Orto Questões</a> › <a href="./">Guias de estudo</a></nav>')
    corpo.append(f"<h1>{guia['headline']}</h1>")
    corpo.append(f'<p class="meta">Atualizado em {formatar_data(guia["atualizado_em"])} · Orto Questões</p>')
    corpo.append(editorial_de_guia(guia["content"]))
    if guia.get("extra"):
        corpo.append(guia["extra"](dados_do_acervo()))
    corpo.append('<h2>Continue estudando</h2><ul class="temas">')
    for texto, url in guia["links"]:
        corpo.append(f'<li><a href="{url}">{texto}</a></li>')
    corpo.append("</ul>")
    corpo.append(rodape("../"))
    return "\n".join(corpo)


def formatar_data(iso: str) -> str:
    ano, mes, dia = iso.split("-")
    return f"{dia}/{mes}/{ano}"


def indice() -> str:
    titulo = "Guias de estudo para o TEOT, o TARO e a residência | Orto Questões"
    descricao = ("Guias do Orto Questões para estudar ortopedia: como se preparar para o TEOT e o TARO, cronograma, temas que mais "
                 "caem e provas anteriores por ano.")
    colecao = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": f"{SITE}guias/#pagina",
        "url": f"{SITE}guias/",
        "name": titulo,
        "description": descricao,
        "inLanguage": "pt-BR",
        "isPartOf": {"@type": "WebSite", "@id": f"{SITE}#website", "name": "Orto Questões", "url": SITE},
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": len(GUIAS),
            "itemListElement": [
                {"@type": "ListItem", "position": i, "url": f"{SITE}guias/{g['slug']}.html", "name": g["headline"]}
                for i, g in enumerate(GUIAS, start=1)
            ],
        },
    }
    corpo = [topo(titulo, descricao, "guias/", ld(colecao) + "\n" + ld(migalhas_ld(("Guias de estudo", "guias/"))), raiz="../")]
    corpo.append('<nav class="migalhas meta"><a href="../">Orto Questões</a> › Guias de estudo</nav>')
    corpo.append("<h1>Guias de estudo para o TEOT, o TARO e a residência</h1>")
    corpo.append("<p>Roteiros do Orto Questões para organizar a preparação, transformar questões comentadas em revisão e decidir o que "
                 "estudar primeiro. Os guias com números usam as provas oficiais do acervo e são atualizados a cada publicação do site.</p>")
    corpo.append('<p class="meta">Procurando curso? Veja <a href="../curso-preparatorio-teot/">como escolher um curso preparatório para o TEOT '
                 'e como combiná-lo com questões</a>.</p>')
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
