# Orientação permanente para Claude

**Autonomia total para publicar (Tales, 04/11/2026):** toda alteração pode ser publicada sem pedir autorização: rodar os checks, abrir o PR, marcar como pronto e juntar (merge) assim que o CI ficar verde. Só parar para perguntar se o Tales disser o contrário naquele pedido. Não esperar nem depender da revisão do Codex (bot `chatgpt-codex-connector`): os comentários dele não bloqueiam a publicação.

Leia [AGENTS.md](AGENTS.md).

**Prioridade (Tales, 30/10/2026):** refazer os resumos e comentários curtos dos ciclos 3 a 20, conforme [docs/biblioteca/REFAZER-RESUMOS-E-COMENTARIOS.md](docs/biblioteca/REFAZER-RESUMOS-E-COMENTARIOS.md). Resumo com no mínimo 45 KB; comentário em miniaula com tamanho proporcional à questão, sem molde fixo e sem parágrafos copiados entre questões (Tales, 31/10/2026: "seja humano, seja flexível"; regras na seção "Professor humano, não molde" do padrão editorial). "Por que esta questão foi criada" só nos OrtoQuestões Simulados; "Na prova" só quando fizer sentido. Meça com `scripts/biblioteca/medir_profundidade.py` antes de publicar. Todo trabalho de comentários segue
[docs/padrao-editorial-comentarios.md](docs/padrao-editorial-comentarios.md):
aula independente, fundamentos e mecanismos explicados, e análise rica de todas
as alternativas, inclusive a correta. Essa diretriz do dono do projeto substitui
regras antigas de brevidade, limites de caracteres e proibição de tabelas/listas.

Referência aprovada: [docs/exemplos/mao-0853.json](docs/exemplos/mao-0853.json).

**Padrão do site desde 22/10/2026: comentário em formato de miniaula**, com tamanho flexível e citação moderada
(na mão, Green com página, só no computador com os livros). Prompt: [docs/prompts/comentarios-miniaula.md](docs/prompts/comentarios-miniaula.md);
referência: [docs/exemplos/mao-2164.json](docs/exemplos/mao-2164.json).

**Padrão a atingir nas miniaulas (Tales, 10/11/2026: "esse é o padrão que nós queremos"):** [docs/exemplos/pe-tornozelo-0107.json](docs/exemplos/pe-tornozelo-0107.json), com a figura do livro colocada onde o texto precisa dela (fonte na legenda, passo a passo acompanhando a figura), página em cada fato e o que mais de um livro diz do mesmo ponto. Comparar livros quando eles divergem ou se completam, sem virar molde. Figuras de livro com fonte são permitidas no leitor (resumo só quando necessário; comentário com mais liberdade); gráfico se recria como tabela.

**Prompt mestre dos 284 temas (Tales, 31/10/2026: nunca parar, nunca perguntar, resolver sozinho):** [docs/prompts/PROMPT-MESTRE-284-TEMAS.md](docs/prompts/PROMPT-MESTRE-284-TEMAS.md).

**Fluxo mestre (Tales, 31/10/2026):** antes de qualquer tema, leia [docs/biblioteca/FLUXO-MESTRE.md](docs/biblioteca/FLUXO-MESTRE.md): a meta dos 284 temas, o ciclo de dez etapas por tema, o padrão dos simulados no estilo da prova, os portões automáticos e as regras contra o decaimento.

**Capítulo enviado pelo Tales ("faça resumo disso", "questões e resumo", PDF sem comentário):** siga sozinho, sem pedir
confirmação, o roteiro [docs/biblioteca/PILOTO-AUTOMATICO.md](docs/biblioteca/PILOTO-AUTOMATICO.md): o que cada pedido curto
quer dizer, OrtoQuestões Simulados primeiro, resumo no mesmo jeito de escrever dos anteriores, conferir e publicar.
Ligar o resumo a todas as questões do tema (convite "Leia o resumo" no fim de cada questão) conforme [docs/biblioteca/CAPITULO-RESUMO-E-QUESTOES.md](docs/biblioteca/CAPITULO-RESUMO-E-QUESTOES.md).
Consultar o acervo atual, usar os scripts de aplicação/validação, preservar o
gabarito e salvar em branches e PRs revisáveis conforme o pedido.

**Questões novas ou resumos novos → corrigir os comentários pelos resumos:** siga [docs/comentarios-resumos/FLUXO.md](docs/comentarios-resumos/FLUXO.md)
(fila do capítulo com `--com-lacunas`, triagem, miniaula com o primeiro bloco na seção exata, lacunas anotadas, print de conferência e publicação).

**Provas de Cirurgia da Mão (SIMÃO e título da SBCM) com os livros locais (Green):** siga [docs/mao/PROTOCOLO.md](docs/mao/PROTOCOLO.md)
e o andamento em [docs/mao/PROGRESSO.md](docs/mao/PROGRESSO.md). Comando para colar na outra conta:
[docs/prompts/claude-mao-provas.md](docs/prompts/claude-mao-provas.md). Livros, resumos enviados e provas originais nunca vão para o git. Só SBCM e SIMÃO viram OrtoQuestões Simulados; as outras bancas (ABC, Unesp etc.) entram com o nome real, conferindo antes se já estão no site.

## Arsenal de marketing aprovado
**Padrão oficial de posts de questão (Tales, 09/11/2026):** antes de qualquer post, leia [marketing/instagram/estilos/PADRAO-AULA.md](marketing/instagram/estilos/PADRAO-AULA.md): aula que ensina do zero (sem citar R1), texto na medida e nunca slide só de palavras, imagens da questão e do comentário, livro e página em cada explicação, temática que ajuda a entender, de 4 a 6 stories. Referências: `marketing/instagram/posts/2026-11-09-reimers-var/` e, como régua de qualidade da arte (Tales, 10/11/2026: "que tudo seja extremamente bom assim e criativo"), a [Oficina do encaixe](marketing/instagram/estilos/OFICINA-DO-ENCAIXE.md) (`posts/2026-11-10-oficina-encaixe/`: pixel art pintada por código com luz, metáfora que explica o termo, radiografias comparadas). Os estilos abaixo viram moldura dessa aula.

**Marca oficial (Tales, 11/11/2026):** o **ladrilho das alternativas** é o símbolo do site e dos posts; o selo, o brasão em pixel art e as versões do kit são variações aprovadas que entram **em rodízio** nos posts do Instagram, nas cores da paleta padrão (`--paleta-marca-*`). Veja [marketing/instagram/marca/README.md](marketing/instagram/marca/README.md). O "O que vira Q" foi descartado.

Para posts, leia [docs/marketing/orientacoes.md](docs/marketing/orientacoes.md). Tales aprovou em 11/10/2026 os modelos **Cofre de duas chaves** (feed) e **Mecânica fina / Relojoaria anatômica** (stories, versão final de mão). Veja [o guia de reutilização](marketing/instagram/estilos/COFRE-E-MECANICA-FINA.md): quando escolher cada um, roteiro, acabamento, HTMLs executáveis e revisão. São opções criativas do arsenal; adapte à questão, sem repetir mecanicamente ou substituir os outros estilos.

Em 12/10/2026, Tales também aprovou a **Tabela de Snellen** (feed de questão em que a linha miúda decide) e o **Cupom fiscal** (stories: primeiro uma questão com a resposta, depois uma propaganda leve e sem preço; a variante com preço só a pedido). Veja [o guia](marketing/instagram/estilos/SNELLEN-E-CUPOM.md).

Também em 12/10/2026, Tales aprovou o **VAR da questão** (feed e stories: cada alternativa revisada como um lance de futebol). Veja [o guia](marketing/instagram/estilos/VAR-DA-QUESTAO.md).

Também em 12/10/2026, Tales aprovou o **Treine grátis** (story de propaganda com MacBook e iPhone, botão "Treine grátis" e espaço para a figurinha de link com utm, que abre direto em criar conta). Veja [o guia](marketing/instagram/estilos/TREINE-GRATIS.md).

Kit de posts (15/10/2026): [marketing/kit/README.md](marketing/kit/README.md) traz os modelos aprovados parametrizados por JSON, a fila das próximas 30 postagens e o ciclo em um comando (`node marketing/kit/renderizar.mjs <NN>`). Prompt para o Codex: [docs/prompts/codex-post-rapido.md](docs/prompts/codex-post-rapido.md).

Em 16/10/2026, Tales aprovou como modelo o trio **Embarque** (feed: cartão de embarque), **Exame de DNA** (stories de questão: "quem é o pai?") e **Créditos finais** (stories de propaganda com tudo o que o site tem e "Treine grátis"). Veja [o guia](marketing/instagram/estilos/EMBARQUE-DNA-CREDITOS.md).

Em 16/10/2026, Tales definiu o **modelo padrão** de posts (stories e feed): o lançamento da Biblioteca de Resumos, com telas reais do site editadas (MacBook e iPhone, lupas com moldura dourada e pinos numerados), cor dominante verde ou branca. Quando ele pedir "no modelo padrão", use este. Veja [o guia](marketing/instagram/estilos/MODELO-PADRAO.md).

Em 18/10/2026, Tales aprovou para o arsenal o **Laboratório de patologia** (feed: lâmina na ocular, laudo com pinos) e a **Raspadinha da prova** (stories). Veja [o guia](marketing/instagram/estilos/LABORATORIO-E-RASPADINHA.md).

Em 19/10/2026, Tales aprovou a **Caderneta de topografia** (feed) e o **Bingo da prova** (stories). Veja [o guia](marketing/instagram/estilos/CADERNETA-E-BINGO.md). Também pediu que os estilos sigam uma **ordem fixa de rodízio**, sem sortear nem repetir: rode `node marketing/instagram/estilos/ordem.mjs` antes de cada post ([regras](marketing/instagram/estilos/ORDEM.md)). Stories nunca levam figurinha de link (tira o alcance da página).

Em 13/11/2026, Tales aprovou a **Errata** (stories de aula no gabinete de revisão, para questões em que a edição do livro decide) e a variante de propaganda **Como escrevemos o comentário** (o comentário real num iPhone, do aviso em vermelho até as alternativas). Veja [o guia](marketing/instagram/estilos/ERRATA.md).

Em 18/11/2026, Tales aprovou os **Stories com alternativas** (a pedido, fora do rodízio): a questão com as alternativas escritas e uma área livre, sem caixa, para a enquete A, B, C, D; depois a resposta com um trecho do comentário e o livro, e o convite ao site gratuito. A temática se adapta a cada vez (o modelo é a tela do celular). Veja [o guia](marketing/instagram/estilos/STORIES-COM-ALTERNATIVAS.md).

Em 22/10/2026, Tales aprovou a **Busca** (feed e stories: o sintoma digitado num buscador com a marca Orto Questões, a questão como resultado e a resposta no trecho em destaque). Veja [o guia](marketing/instagram/estilos/BUSCA.md).

## Telas do site
**Antes de qualquer tarefa visual, leia [DESIGN.md](DESIGN.md) e [PRODUCT.md](PRODUCT.md)** e siga [docs/design/WORKFLOW.md](docs/design/WORKFLOW.md). Ferramentas de design (Tales, 31/10/2026: "usar sempre que possível, a ideia é você ficar especialista em design"): em todo pedido de design, use as skills de [docs/design/FERRAMENTAS.md](docs/design/FERRAMENTAS.md) (Refero para pesquisar, UI UX Pro Max para decidir, ui-styling e design-system para construir, Impeccable para revisar e polir, arte-hd2d para a arte pixel).

**Padrão para atualizar qualquer página (Tales, 14/11/2026: "ficou bom, defina esse como o padrão"):** a página de Desempenho refeita (`src/paginas/Desempenho.tsx`, `src/estilos/paginas/Desempenho.css`, seção "Desempenho" do DESIGN.md). Ao atualizar uma página, refazer **a página inteira**, do topo ao rodapé, numa linguagem só (nunca remendo com parte nova ao lado de parte antiga): cores do site e da SBOT (verde-azulado `#00806f` e azul-ardósia `#243b47` sobre o papel branco), títulos e números em Plus Jakarta (nada de fonte pixel para ler), topo com a arte HD-2D em moldura e as informações principais no mesmo painel, frases-chave em destaque com os números em negrito, conteúdo por extenso em seções (rótulo, pergunta e uma linha de apoio) em vez de abas escondidas, menu lateral fixo com a seção atual (barra de atalhos no celular), toda ação como botão de verdade (principal verde ou contorno, nunca só link de texto), arte própria onde a página pede um respiro, e o fim da página no mesmo design. Conferir no computador (claro e escuro) e no celular, sem rolagem lateral.

Regra do Tales (30/10/2026): **todo pedido, mesmo simples, passa antes por um brainstorm interno** para entregar a melhor experiência possível (design, interação, celular, claro/escuro, textos). Decida e faça; não devolva a lista de opções para ele escolher, a não ser que a escolha mude o pedido.

**Padrão de arte (Tales, 10/11/2026: "a arte é o que nós vendemos; tem que ser sempre perfeita"):** toda arte do site é pensada em todos os detalhes, na página inteira, nunca preguiçosa nem simples. A referência é a página Indique e ganhe; as regras estão na seção "O padrão de riqueza" da skill [arte-hd2d](.claude/skills/arte-hd2d/SKILL.md).

Foco maior em imagens (Tales, 19/10/2026): prefira **objetos pixel animados** (como o livro da Biblioteca embaixo da questão, que flutua, entreabre e abre ao clicar) a caixas só de texto. Regras e referência em [docs/design/OBJETOS-ANIMADOS.md](docs/design/OBJETOS-ANIMADOS.md).

Regra do Tales (19/10/2026): a tela começa **sempre limpa**, só com o essencial. O resto (mapa, Pomodoro, placar, atalhos, dicas) fica como **opção visível** para a pessoa adicionar, como o botão "Personalizar" da sessão; nunca ligado de entrada.

Em 19/10/2026, Tales aprovou para o arsenal a **Conversa do grupo R+** (feed, 6 slides: print de conversa dos residentes no plantão, com enquete, zoom e prévia de link do Cronograma). Veja [o guia](marketing/instagram/estilos/CONVERSA-DO-GRUPO.md).

## Tom dos e-mails
Regra do Tales (21/10/2026), para os e-mails automáticos do site, as respostas de suporte e qualquer outra mensagem
escrita em nome dele: **extremamente gentil, fofo e formal**, como em "Como fazer amigos e influenciar pessoas". O
cliente tem razão 24 horas por dia, mesmo quando não tem: agradecer primeiro, reconhecer o incômodo, pedir desculpas
pelo transtorno, explicar com calma o que foi feito e se colocar à disposição. Nunca culpar a pessoa nem soar seco.

## Desenvolvimento e publicações

**SQL sempre na conversa (Tales, 13/11/2026):** toda vez que houver SQL para rodar no Supabase, mande o código completo na própria resposta, num bloco pronto para copiar e colar (além do arquivo em `supabase/colar-no-painel/`), dizendo o que ele faz e se altera dados. Nunca só o caminho do arquivo. **Sempre em passo a passo (Tales, 14/11/2026):** numere os passos (abrir o SQL Editor do painel, colar, Run, o que deve aparecer), uma caixa de copiar e colar por SQL, na ordem em que roda. O mesmo vale para Edge Functions alteradas: rode `npm run funcoes:colar` e mande o passo a passo de colar cada `supabase/colar-no-painel/<função>.ts` no editor do painel (ou o comando `supabase functions deploy`). Quando não houver SQL, diga isso com clareza.

Seguir a seção **Eficiência de desenvolvimento e GitHub Actions** do
[AGENTS.md](AGENTS.md), fonte única das regras de agrupamento de alterações,
commits, pushes, validação e respeito ao trabalho concorrente. Os detalhes dos
workflows estão em [docs/OPERACAO-ACTIONS.md](docs/OPERACAO-ACTIONS.md).

## Conquistas e notificações (17/11/2026)

Para qualquer novo achievement ou mudança em avisos, seguir [docs/conquistas/AVISOS.md](docs/conquistas/AVISOS.md)
e a seção correspondente de AGENTS.md. A integração por família é automática; não criar listas paralelas de ids
nem reativar as visitas aleatórias. Usar a galeria de prévias e os testes obrigatórios descritos no contrato.
