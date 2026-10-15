# Plano de SEO: os R1 de março de 2027

Pedido do Tales (15/10/2026): em março de 2027 entra uma turma nova de R1 procurando "curso ortopedia R1",
"curso TEOT", "banco de questões de ortopedia". O objetivo é que essas pessoas encontrem o Orto Questões no
Google e que assistentes de IA (Google AI Overviews, ChatGPT, Perplexity) o recomendem. Também: "orto
questões" (separado) ainda não acha o site; "ortoquestoes" (junto) acha.

Segundo pedido do Tales (15/10/2026): "Otimiza bastante o SEO do Google para a gente aparecer top 1. Quando
pesquisarem 'orto questões', ou por cursos preparatórios comuns, quero que o Orto Questões apareça." Regra do
dono: **nenhum nome de outra marca, curso preparatório ou concorrente em lugar nenhum** (páginas, títulos,
metadados, JSON-LD, llms.txt, documentos, nem atrás de flag). A seção 0 registra essa segunda rodada; as
seções 1 a 8 são a primeira, atualizadas onde mudou.

## 0. Segunda rodada (15/10/2026)

### 0.1 Diagnóstico técnico (medido no `dist/` depois de rodar os geradores)

| Item | Antes | Depois |
|---|---|---|
| Títulos repetidos entre páginas de questão | 350 títulos repetidos, em 1.094 páginas | nenhum |
| Descrições repetidas | 48 | nenhuma |
| Tamanho do título das páginas de questão | ~95 caracteres, com " \| Questão comentada \| Orto Questões" (o Google corta perto de 60 e o começo era só o assunto) | ~75: assunto, prova e ano ("TEOT 2024") e o começo do enunciado; só onde dois coincidiam o título fica mais longo e, em último caso, leva o identificador |
| Descrições das páginas de destino | 6 com mais de 170 caracteres (cortadas na busca) | todas abaixo de 160 |
| `lang="pt-BR"`, `canonical`, `viewport`, `og:image`, favicon | presentes em todas | mantidos |
| Ícone do iPhone, manifesto e texto alternativo da prévia nas páginas de questão, assunto e guia | ausentes | presentes |
| BreadcrumbList das páginas de questão | começava em "Assuntos", sem a raiz | Orto Questões › Questões por assunto › assunto › questão |
| Páginas de assunto | FAQPage com enunciado de prova como "pergunta" (não é pergunta frequente escrita pelo site; desde 2023 o Google só mostra FAQ para sites de governo e saúde) | CollectionPage com a lista das questões + BreadcrumbList |
| Índices `/questoes/` e `/guias/` | sem dados estruturados; `/questoes/` com o mesmo título da página do banco de questões (as duas disputavam a mesma busca) | CollectionPage + BreadcrumbList; `/questoes/` virou "Questões de ortopedia comentadas por assunto" |
| Guias | Article sem imagem, sem logo, sem migalhas | Article com imagem, Organization completa e BreadcrumbList; data de atualização visível |
| Organization | só na raiz, sem `alternateName` nas outras páginas | na raiz (com fundador e logo em ImageObject), em cada página de destino (com `alternateName` e `sameAs` do Instagram) e completa em `/sobre/` (AboutPage) |
| WebSite com `alternateName` | só na raiz | também em cada página de destino |
| Figuras das questões | sem largura e altura (o texto pulava quando a imagem chegava) | `width`/`height` lidos do arquivo e `decoding="async"` |
| Página "Sobre" | só `#/sobre`, atrás do hash e do JavaScript (invisível para o Google) | `/sobre/` em HTML puro |
| Links quebrados e páginas órfãs | nenhum | nenhum (todas as URLs do sitemap recebem link interno) |
| JSON-LD inválido | nenhum | nenhum (13 tipos, todos validados como JSON) |
| Velocidade | páginas estáticas sem JavaScript, CSS embutido, sem fontes externas | mantido; as páginas novas têm de 15 a 28 KB de HTML |

O que **não** mudou e por quê: `robots.txt` (já liberava tudo e apontava o sitemap); o título da raiz (já tinha
"Orto Questões (OrtoQuestões)" e está igual ao do `src/App.tsx`); a meta keywords (o Google ignora).

### 0.2 O que foi feito

| O quê | Onde |
|---|---|
| Página editorial **/curso-preparatorio-teot/** ("Curso preparatório para o TEOT: como escolher e como combinar curso e banco de questões"): tipos de preparação (aulas, bibliografia, banco de questões, simulados, flashcards, revisão espaçada, cronograma), perguntas para escolher qualquer curso, como combinar curso e questões, onde o Orto Questões entra (complemento, provas reais comentadas, cronograma, temas que mais caem), o que mais cai com números, FAQ ("Posso usar junto com o meu curso?", "Banco de questões substitui curso?", "Qual é o melhor curso?"). Nenhum curso citado, comparado ou ranqueado | `scripts/gerar_paginas_destino.py` (`pagina_curso_preparatorio`) |
| Página **/sobre/**: quem faz (Tales, residente de ortopedia), missão, o que o site tem, como os comentários são feitos (inclusive o apoio de IA, como já diz `#/sobre`), o que o site não é, as formas do nome e contato | `pagina_sobre` no mesmo script |
| 5 guias novos, cada um com uma parte calculada do acervo a cada deploy: **como estudar para o TEOT no R1, R2 e R3**; **cronograma de estudo para o TEOT** (tempo por área proporcional ao que cai); **provas do TEOT ano a ano** (assuntos de cada edição lado a lado e exemplos); **temas que mais caem no TEOT e no TARO** (de `src/dados/incidencia.json` e do acervo); **TARO: como usar as provas anteriores** | `scripts/gerar_guias_seo.py` (`GUIAS_NOVOS`) |
| Links entre tudo: menu e rodapé das páginas de destino, topo e rodapé das ~6.500 páginas de questão e assunto (Curso preparatório, Sobre, Temas que mais caem), guias antigos apontando para os novos, raiz e `noscript` | geradores e `index.html` |
| Marca: `alternateName` (OrtoQuestões, Orto Questoes, OrtoQuestoes, ortoquestoes, ortoquestoes.com.br) em Organization e WebSite de todas as páginas de destino; seção "O nome" em `/sobre/`; títulos com "Orto Questões"; llms.txt dizendo que quem busca "orto questões" procura este site | geradores, `index.html` |
| `llms.txt` e `llms-full.txt`: quem faz, contato, Instagram, "não é curso preparatório; pode ser complemento", recursos grátis × planos corrigidos (temas que mais caem e resumão são dos planos), lista dos guias, os 20 assuntos que mais caem | `gerar_paginas_destino.py` (`llms`) |
| Sitemap com `/curso-preparatorio-teot/`, `/sobre/` e os guias novos | `gerar_sitemap.py` (`PAGINAS + PAGINAS_EXTRAS`) e manifesto dos guias |

### 0.3 URLs novas para o Search Console (Inspeção de URL → Solicitar indexação)

1. https://ortoquestoes.com.br/curso-preparatorio-teot/
2. https://ortoquestoes.com.br/sobre/
3. https://ortoquestoes.com.br/guias/como-estudar-para-o-teot-r1-r2-r3.html
4. https://ortoquestoes.com.br/guias/cronograma-de-estudo-para-o-teot.html
5. https://ortoquestoes.com.br/guias/questoes-teot-por-ano.html
6. https://ortoquestoes.com.br/guias/temas-que-mais-caem-no-teot.html
7. https://ortoquestoes.com.br/guias/provas-anteriores-do-taro.html
8. Pedir de novo: https://ortoquestoes.com.br/ , https://ortoquestoes.com.br/questoes/ e https://ortoquestoes.com.br/guias/ (títulos e dados estruturados mudaram)

Depois, reenviar `https://ortoquestoes.com.br/sitemap.xml`. As ~6.500 páginas de questão mudaram de título;
não precisa pedir uma a uma: o sitemap e os links internos levam o Google até elas.

### 0.4 "Top 1": o que é realista

- **"orto questões", "ortoquestoes", "orto questoes":** é a busca que dá para ganhar. O site é a única entidade
  com esse nome; faltava o Google ligar a forma separada ao domínio. Agora todas as páginas repetem as formas
  juntas, há `alternateName` em todo lugar e uma página `/sobre/` lida sem JavaScript. O que fecha o ciclo são
  as menções externas com o nome por extenso (0.5) e as buscas pela marca vindas do Instagram.
- **"curso preparatório TEOT", "curso TEOT", "preparatório ortopedia":** a página nova responde a essa busca
  com honestidade (o Orto Questões não é curso; é o complemento). Os cursos grandes têm anos de links; chegar
  à primeira página leva meses e depende de menções externas. Anúncio (0.6) é o atalho.
- **Busca pelo nome de um curso específico:** pela regra do dono, nenhum nome de outra marca entra em página,
  metadado ou anúncio. Então o site não vai aparecer para essas buscas pelo conteúdo, e isso é escolha, não falha
  técnica. O caminho é aparecer nas buscas genéricas vizinhas e ser lembrado pelo nome.

### 0.5 Links e menções éticos (o que só o Tales pode fazer)

Sempre com o nome por extenso, **Orto Questões**, e o endereço `ortoquestoes.com.br`. Nada de comprar links,
trocar links em massa ou criar perfis falsos.

| Onde | O que fazer | Texto-âncora sugerido | Página de destino |
|---|---|---|---|
| Bio do Instagram (@ortoquestoes) | Nome do perfil "Orto Questões" e o site na bio | Orto Questões · questões de ortopedia comentadas | https://ortoquestoes.com.br/ |
| Linktree ou página de links | Um link por intenção | "Banco de questões de ortopedia", "Provas do TEOT e do TARO", "Curso preparatório? Veja como combinar com questões", "Sobre o Orto Questões" | `/banco-de-questoes-ortopedia/`, `/questoes-teot-taro/`, `/curso-preparatorio-teot/`, `/sobre/` |
| Ligas acadêmicas de ortopedia (sites e perfis) | Oferecer o site como material de treino da liga; pedir um link na página de materiais | Orto Questões: provas anteriores do TEOT e do TARO comentadas | `/questoes-teot-taro/` |
| Residências e preceptores | Pedir citação no material de boas-vindas dos R1 de 2027 | Orto Questões: roteiro de estudo para o R1 | `/curso-ortopedia-r1/` |
| Grupos de residentes (WhatsApp, Telegram) | Mensagem com o nome por extenso; não gera link para o Google, mas gera busca pela marca | "procura Orto Questões no Google" | raiz |
| Diretórios e perfis gratuitos | Perfil da empresa no Google (só se fizer sentido, sem endereço físico inventado) e diretórios de educação médica que aceitem cadastro gratuito | Orto Questões | raiz e `/sobre/` |
| YouTube | Vídeo curto resolvendo uma questão real do acervo, com o link na descrição | Orto Questões: questão do TEOT comentada | página da questão em `/questoes/...` |
| Podcast ou live de liga | Participar falando de como estudar para o TEOT; pedir o link nas notas do episódio | Orto Questões: como estudar para o TEOT no R1, R2 e R3 | `/guias/como-estudar-para-o-teot-r1-r2-r3.html` |
| Fóruns e perguntas ("como estudar para o TEOT") | Resposta útil e assinada, com um link só | guia de temas que mais caem do Orto Questões | `/guias/temas-que-mais-caem-no-teot.html` |

Variar o texto-âncora (nome da marca, endereço, frase descritiva) é mais natural do que repetir a mesma frase.

### 0.6 Anúncios do Google nas buscas de curso preparatório

Só palavras genéricas, sem nome de marca (regra do dono: nem como palavra-chave nem no texto do anúncio).

- **Página de destino:** `/curso-preparatorio-teot/` (responde exatamente a quem buscou curso) e, num segundo
  grupo, `/teot/` e `/questoes-teot-taro/`. Usar utm, por exemplo
  `?utm_source=google&utm_medium=cpc&utm_campaign=curso-preparatorio-teot`.
- **Grupo 1, curso preparatório (frase e exata):** "curso preparatório teot", "preparatório teot",
  "curso para o teot", "curso teot online", "curso de ortopedia teot", "preparatório ortopedia",
  "curso preparatório ortopedia", "revisão para o teot".
- **Grupo 2, questões e provas:** "questões teot", "provas anteriores teot", "prova teot 2025", "questões taro",
  "simulado teot", "banco de questões ortopedia".
- **Grupo 3, R1:** "curso ortopedia r1", "como estudar residência ortopedia", "taro r1".
- **Negativas:** "grátis pdf" (se não quiser quem procura só arquivo), "técnico", "enfermagem", "fisioterapia",
  "concurso", "veterinária", "emprego", "salário".
- **Texto do anúncio (exemplo, sem promessa e sem preço):** título "Questões do TEOT comentadas" · "Complemento
  ao seu curso" · "Orto Questões"; descrição "Provas anteriores do TEOT e do TARO com gabarito da banca e
  comentário de cada alternativa. Crie a conta grátis."
- **Orçamento:** começar pequeno, só no Brasil, em celular e computador, e medir cadastros (o Admin mostra a
  origem pela utm). Cortar palavras com clique e sem cadastro depois de duas semanas.
- O Google pode recusar ou limitar anúncios de temas de saúde; como o anúncio é de material de estudo para
  médicos, sem promessa de resultado, costuma ser aprovado.

## 1. Diagnóstico (primeira rodada)

- **O aplicativo é uma página só para o Google.** O roteamento é por hash (`#/treinar`), e o buscador
  descarta tudo depois do `#`. Treinar, planos, flashcards e o resto contam como a raiz, e o conteúdo só
  aparece depois do JavaScript.
- **Já havia páginas estáticas boas**, geradas a cada deploy: uma por assunto e uma por questão
  (`/questoes/`, `scripts/gerar_paginas_seo.py`) e os guias (`/guias/`, `scripts/gerar_guias_seo.py`).
  Elas cobrem quem procura um tema ("questão de coalizão tarsal"), mas **nenhuma página respondia às buscas
  de quem procura o produto**: "banco de questões de ortopedia", "TEOT", "simulado TEOT", "questões do TARO",
  "flashcards de ortopedia", "curso de ortopedia R1".
- **"orto questões" separado.** O domínio e a marca se escrevem juntos (ortoquestoes), e o nome tem duas
  palavras comuns. "Orto" e "questões" separados competem com milhares de páginas; o Google só liga as duas
  formas à marca quando vê muitas vezes "Orto Questões" e "OrtoQuestões" no mesmo contexto do domínio e
  quando outras páginas citam a marca. O site já usava as duas formas; agora todas as páginas novas repetem
  "Orto Questões (também escrito OrtoQuestões, ortoquestoes.com.br)". O resto depende de menções externas
  (seção 5) e do tempo.
- **IA não recomenda o que não consegue ler nem confirmar.** Os assistentes juntam o que está em páginas
  indexadas e em outras fontes. Faltava uma página clara dizendo o que o site é, para quem, quais provas
  tem e o que é grátis, e faltava gente de fora falando do site.

## 2. O que foi feito na primeira rodada

| O quê | Onde |
|---|---|
| 6 páginas de destino em HTML puro, sem JavaScript, mobile first, com as cores da marca | `scripts/gerar_paginas_destino.py` gera `public/<pasta>/index.html` a cada deploy |
| `llms.txt` (resumo) e `llms-full.txt` (provas, assuntos e perguntas frequentes) para assistentes de IA | gerados pelo mesmo script em `public/` |
| Sitemap com as 6 páginas novas (prioridade 0,9) | `scripts/gerar_sitemap.py` |
| `robots.txt` apontando para o sitemap | já existia; mantido pelo `gerar_sitemap.py` |
| Título, descrição, Open Graph e texto inicial da raiz com "Orto Questões" e "OrtoQuestões"; links para as páginas novas no conteúdo inicial e no `noscript` | `index.html`, `src/App.tsx` (título da rota `/`) |
| Organization com descrição e `knowsAbout` | `index.html` |
| Links para as páginas novas no topo e no rodapé das ~6.500 páginas de questão e assunto (link interno é o principal sinal de importância dentro do site) | `scripts/gerar_paginas_seo.py` |
| Passo de geração no deploy | `.github/workflows/publicar.yml` |

As páginas:

| URL | Busca principal | Conteúdo |
|---|---|---|
| https://ortoquestoes.com.br/banco-de-questoes-ortopedia/ | banco de questões de ortopedia; questões de ortopedia comentadas | o que é o site, números do acervo, tabela de provas (anos, edições, questões, link para treinar cada uma), como o treino funciona, assuntos, para quem é, FAQ |
| https://ortoquestoes.com.br/teot/ | TEOT; prova TEOT; curso TEOT | o que é o TEOT (sem datas: sempre "confira o edital da SBOT"), provas do TEOT por ano, o que mais cai por área e os assuntos campeões, plano do R1 ao R3, "curso ou banco de questões?", FAQ |
| https://ortoquestoes.com.br/questoes-teot-taro/ | questões TEOT; provas anteriores TARO | cada ano do TEOT e do TARO com link para treinar só aquele ano, assuntos com mais questões, exemplos de questões recentes com página própria, FAQ |
| https://ortoquestoes.com.br/curso-ortopedia-r1/ | curso de ortopedia R1; como estudar no R1 | o que o R1 precisa primeiro, tabela honesta curso × livro × questões × cronograma, semana possível no R1, por onde começar, erros comuns, FAQ |
| https://ortoquestoes.com.br/simulado-teot/ | simulado TEOT; simulado de ortopedia | prova anterior no modo prova, OrtoQuestões Simulados (com o aviso de não oficial), Simulado Nacional (planos), como corrigir um simulado, FAQ |
| https://ortoquestoes.com.br/flashcards-ortopedia/ | flashcards de ortopedia | flashcards por área, modo Estudo e Torneio de Flashcards (beta), quando usar flashcards e quando usar questões, FAQ |

Dados estruturados (JSON-LD, validados como JSON): WebPage, BreadcrumbList e FAQPage em todas;
LearningResource no banco, nas provas, nos simulados e nos flashcards; WebSite e Organization na raiz.
Não usamos `Course`: o Orto Questões não é curso, e marcar como curso seria enganoso (e o Google pede
dados de curso que não temos).

Regras seguidas: números tirados do acervo a cada deploy (provas, anos, edições, questões por prova e por
assunto); **sem o total de questões do acervo** (regra da marca em `docs/marketing/orientacoes.md`; para
mostrar, trocar `MOSTRAR_TOTAL = True` no script); sem preço (as páginas mandam para `#/assinatura`);
sem datas de prova; nenhum nome de curso preparatório; cirurgia da mão como outra especialidade; Fellowship
de Quadril; "Flashcards" e "Torneio de Flashcards", nunca "Cripta"; sem depoimentos nem parcerias.

## 3. Palavras-chave alvo

| Prioridade | Busca | Página |
|---|---|---|
| Marca | orto questões; ortoquestoes; orto questoes | raiz |
| Alta | banco de questões de ortopedia; questões de ortopedia comentadas | /banco-de-questoes-ortopedia/ |
| Alta | TEOT; prova TEOT; como estudar para o TEOT; curso TEOT; curso de ortopedia TEOT | /teot/ e /guias/como-estudar-para-o-teot.html |
| Alta | questões TEOT; provas anteriores TEOT; questões TARO; prova TARO 2025 | /questoes-teot-taro/ |
| Alta (março) | curso ortopedia R1; residência ortopedia R1 como estudar | /curso-ortopedia-r1/ |
| Média | simulado TEOT; simulado ortopedia | /simulado-teot/ |
| Média | flashcards ortopedia | /flashcards-ortopedia/ |
| Longa | curso de ortopedia | /guias/curso-de-ortopedia.html e /curso-ortopedia-r1/ |
| Cauda longa | "questão de [assunto]" | /questoes/<assunto>/<id>.html (já existiam) |

## 4. O que o Tales faz no Google Search Console

Depois que este trabalho for publicado (o deploy gera as páginas):

1. **Sitemaps** → enviar `https://ortoquestoes.com.br/sitemap.xml` (se já estiver lá, clicar nele e
   reenviar). Conferir em alguns dias se o status é "Sucesso" e quantas URLs foram descobertas.
2. **Inspeção de URL** → colar cada uma das 6 URLs da primeira rodada (e as da seção 0.3), uma por vez, e clicar em **Solicitar
   indexação**. Fazer o mesmo com a raiz `https://ortoquestoes.com.br/` (o título mudou). Há um limite
   diário de pedidos; se acabar, continuar no dia seguinte.
3. Na própria inspeção, clicar em **Testar URL publicada → Ver página testada** e conferir que o HTML
   aparece com o texto (deve aparecer: as páginas não dependem de JavaScript).
4. **Desempenho → Resultados da pesquisa** → filtro **Consulta** contendo `orto` e depois `teot`, `taro`,
   `banco de questões`, `curso`. Anotar impressões, cliques e posição média uma vez por mês (tabela da seção 7).
5. **Melhorias → Perguntas frequentes / Caminhos de navegação**: conferir se os dados estruturados não têm
   erro. (O Google mostra o resultado com FAQ só para poucos sites; o ganho principal é ele entender a página.)
6. **Indexação → Páginas**: acompanhar se as páginas novas saem de "Descoberta, mas não indexada". Se
   ficarem lá por mais de 4 semanas, avisar: costuma ser falta de links externos.
7. Opcional e grátis: **Bing Webmaster Tools** (importa direto do Search Console). O Bing alimenta o
   ChatGPT com busca e o Copilot; vale 5 minutos.

## 5. Menções e links (o que mais pesa e o que só o Tales pode fazer)

Para o Google e para as IAs, o que transforma um site em "recomendável" é **outros falarem dele**.

- **Instagram (@ortoquestoes):** na bio, o link principal pode apontar para
  `https://ortoquestoes.com.br/` (ou para `/teot/` numa campanha). Escrever "Orto Questões" por extenso
  na bio e nos posts, como já é regra.
- **Linktree ou similar**, se usar: incluir as páginas `/teot/` e `/questoes-teot-taro/`.
- **Ligas acadêmicas de ortopedia e grupos de residentes:** oferecer o site como material de treino
  (por exemplo, um link fixo na página ou no grupo da liga). Um link de site de liga ou de faculdade
  (.edu.br, .org.br) vale muito mais do que vários posts. A página `#/ligas` (Liga da residência) pode
  ser o argumento.
- **Preceptores e coordenadores de residência:** pedir para citarem o site em material de boas-vindas
  dos R1 de 2027 (fevereiro e março).
- **Grupos de WhatsApp/Telegram de residentes:** não geram link para o Google, mas geram buscas pela
  marca ("orto questões"), que é exatamente o sinal que falta para a busca separada.
- **Reddit, fóruns, Quora, YouTube:** uma resposta honesta a "como estudar para o TEOT" com o link
  ajuda as IAs, que leem muito esses sites. Sem spam e sem conta falsa.
- Nada de comprar links nem trocar links em massa: o Google pune.

## 6. Cronograma até março de 2027

| Quando | O quê |
|---|---|
| Out/2026 (agora) | Publicar este trabalho; Search Console (seção 4); Bing Webmaster Tools |
| Nov/2026 | ~~Novo guia: "Como estudar para o TEOT no R1, R2 e R3"~~ feito em 15/10/2026. Conferir indexação das páginas de destino e dos guias novos |
| Nov/2026 | Contato com 3 a 5 ligas acadêmicas e preceptores (seção 5) |
| Dez/2026 | ~~Novo guia: "Os temas que mais caem no TEOT"~~ feito em 15/10/2026 (também o cronograma e as provas do TEOT ano a ano). Ver no Search Console as consultas com "curso preparatório" e ajustar o título de /curso-preparatorio-teot/ |
| Jan/2027 | Novo guia: "Primeiro plantão de ortopedia: o que revisar" (fraturas e condutas mais cobradas, com questões reais) |
| Jan/2027 | Revisar títulos e descrições das páginas com mais impressões e pouco clique no Search Console |
| Fev/2027 | ~~Novo guia: "TARO: como usar as provas anteriores"~~ feito em 15/10/2026. Material de boas-vindas para os R1 (post fixo no Instagram com a página /curso-ortopedia-r1/) |
| Mar/2027 | Campanha dos R1: posts levando ao perfil, pedidos de menção às ligas, acompanhar semanalmente as consultas "R1", "TEOT", "curso" |
| Abr/2027 em diante | Um guia por mês, sempre útil por si só e com links internos; repetir a medição |

Cada guia novo entra em `scripts/gerar_guias_seo.py` (lista `GUIAS`, com `atualizado_em`), que já o põe
no sitemap; se tiver números, use o campo `extra` (calculado do acervo a cada deploy). Conteúdo sempre verdadeiro,
sem datas de edital inventadas e sem nome de nenhuma outra marca, curso preparatório ou concorrente.

## 7. Como medir

| Mês | Impressões "orto questões" | Posição "orto questões" | Impressões com "teot" | Cliques nas 6 páginas | Cadastros vindos de busca |
|---|---|---|---|---|---|
| Out/2026 (base) | | | | | |
| Nov/2026 | | | | | |
| … | | | | | |

- Search Console: impressões, cliques e posição por consulta e por página (filtro de página contendo
  `/teot/` etc.).
- Admin do site: origem dos cadastros (o Admin já mostra utm; tráfego orgânico chega sem utm).
- Para as IAs: uma vez por mês, perguntar no ChatGPT (com busca), no Google (AI Overviews) e no
  Perplexity "qual banco de questões de ortopedia para o TEOT?" e "curso de ortopedia TEOT" e anotar se o
  Orto Questões aparece. Não há painel oficial para isso.

## 8. Expectativa honesta

- **Busca pela marca ("orto questões"):** é a mais provável de melhorar em semanas, com as páginas novas,
  a repetição do nome e as buscas vindas do Instagram e dos grupos.
- **Buscas específicas** ("questões TEOT", "simulado TEOT", "provas anteriores TARO", "flashcards de
  ortopedia"): têm pouca concorrência; dá para chegar à primeira página em alguns meses, se as páginas
  forem indexadas e ganharem alguns links.
- **"curso de ortopedia" e "curso TEOT":** são buscas dominadas por cursos grandes, com anos de domínio e
  muitos links. Aparecer entre os primeiros depende de autoridade (menções e links de fora) e de tempo,
  provavelmente mais de um ciclo de R1. Além disso, o Orto Questões não é curso de aulas, e as páginas dizem
  isso; o caminho realista é aparecer como "a alternativa/complemento em questões" nessas buscas e ganhar
  as buscas vizinhas.
- **IAs recomendando:** passam a citar quando encontram a mesma informação clara em vários lugares (as
  páginas do site, o llms.txt e menções de terceiros). O llms.txt ajuda, mas não é garantia: nenhum
  assistente promete usá-lo.
