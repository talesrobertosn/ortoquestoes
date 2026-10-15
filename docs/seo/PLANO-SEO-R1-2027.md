# Plano de SEO: os R1 de março de 2027

Pedido do Tales (15/10/2026): em março de 2027 entra uma turma nova de R1 procurando "curso ortopedia R1",
"curso TEOT", "banco de questões de ortopedia". O objetivo é que essas pessoas encontrem o Orto Questões no
Google e que assistentes de IA (Google AI Overviews, ChatGPT, Perplexity) o recomendem. Também: "orto
questões" (separado) ainda não acha o site; "ortoquestoes" (junto) acha.

## 1. Diagnóstico

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

## 2. O que foi feito (branch deste trabalho)

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
2. **Inspeção de URL** → colar cada uma das 6 URLs novas, uma por vez, e clicar em **Solicitar
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
| Nov/2026 | Novo guia: "Como estudar para o TEOT no R1, R2 e R3" (ligar a /teot/ e /curso-ortopedia-r1/). Conferir indexação das 6 páginas |
| Nov/2026 | Contato com 3 a 5 ligas acadêmicas e preceptores (seção 5) |
| Dez/2026 | Novo guia: "Os temas que mais caem no TEOT" (a partir de `src/dados/incidencia.json`, com links para as páginas de assunto) |
| Jan/2027 | Novo guia: "Primeiro plantão de ortopedia: o que revisar" (fraturas e condutas mais cobradas, com questões reais) |
| Jan/2027 | Revisar títulos e descrições das páginas com mais impressões e pouco clique no Search Console |
| Fev/2027 | Novo guia: "TARO: como usar as provas anteriores no primeiro ano". Material de boas-vindas para os R1 (post fixo no Instagram com a página /curso-ortopedia-r1/) |
| Mar/2027 | Campanha dos R1: posts levando ao perfil, pedidos de menção às ligas, acompanhar semanalmente as consultas "R1", "TEOT", "curso" |
| Abr/2027 em diante | Um guia por mês, sempre útil por si só e com links internos; repetir a medição |

Cada guia novo entra em `scripts/gerar_guias_seo.py` (lista `GUIAS`, com `atualizado_em`), que já o põe
no sitemap. Conteúdo sempre verdadeiro, sem datas de edital inventadas e sem nome de curso preparatório.

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
