# Treinar: "mesa de estudo leve" (01/11/2026)

Pedido do Tales em 01/11/2026: o Halloween acabou; Treinar deixa de ter cena ilustrada no topo e vira a ferramenta
clara e rápida do mundo OrtoQuestões. A ligação com a página inicial vem da paleta, da tipografia, do ritmo e do tom.

> **Decisão em uma frase:** Treinar é uma mesa de trabalho clara e rápida dentro do mundo OrtoQuestões; a arte grande
> fica para as páginas que contam a jornada.

## O que mudou

- **Topo:** sai o acampamento da página inicial que o PR #776 tinha posto (HeroiJornada, fogueira, esqueleto, gato,
  ícones de inventário nos passos e o gato na beira do bilhete). Entra um cabeçalho compacto: "Estudar / Montar
  sessão", o título, uma frase curta com os dados da pessoa e os links do cronograma e dos flashcards.
- **Começar agora:** uma superfície com a ação principal ("Sessão rápida de 10", com a prova que ela usa) e a nota
  honesta do que fica de fora; ao lado, os quatro atalhos de 10 (Revisar hoje, Novas, Que errei, Favoritas) com
  contagem e uma explicação de duas ou três palavras. Zero fica desabilitado, tracejado, com "nenhuma agora".
- **Montar do seu jeito:** os quatro passos numa superfície só, divididos por linhas finas, com o número do passo
  discreto (Jersey 10 em verdete-véu). Títulos que dizem o efeito: Prova, Assunto, Situação das questões, Mais filtros.
  As provas deixaram de ter uma cor por exame: o cartão escolhido fica em verdete com o sinal de certo.
- **Mais filtros:** abre sozinho quando chega um filtro avançado (link, filtro salvo, desfazer); o rótulo mostra
  quantos estão ativos e o resumo (provas de origem, anos, dificuldade, opções).
- **Resumo da sessão:** cartão claro (sai o bilhete escuro com brilho de lamparina). Total escolhido de quantos
  disponíveis, prova, origem, assunto, situação, duração (no modo Prova, o tempo escolhido), seu acerto; os filtros
  avulsos aparecem uma vez, cada um com o seu "tirar"; quantidade em grade 4 por linha; modo; e o botão de começar,
  o cristal da página inicial, como a sessão rápida. Fica fixo ao rolar só quando cabe inteiro na janela.
- **Celular:** a barra de baixo continua (quantas + modo, abre a gaveta "Sua sessão"; o botão começa). A gaveta traz
  quantas e o modo primeiro, depois o resumo, salvar e limpar.
- **Estados:** erro ao carregar o índice ganhou tela própria com "Tentar de novo" (antes a página ficava vazia);
  zero resultados sugere as duas menores mudanças que trazem questões, com quantas cada uma traz, mais "Voltar ao
  padrão"; recorte da turma explica o premium sem bloquear as outras pílulas.
- **Endereço sem filtro** (tocar em Treinar estando no Treinar) volta ao padrão (não respondidas, 20), não mais a
  "todas, sem limite".
- O segredo "osso" do #776 saiu junto com a cena: sem o acampamento não havia quem comemorasse.

## Regra de cor: a paleta da página inicial (Tales, 01/11/2026)

"O site tem centenas de identidades visuais diferentes e isso causa agonia visual; as paletas precisam seguir a página
inicial." As cores da inicial agora são tokens globais em `tokens.css` (`--mundo-*`, `--cristal`, `--cristal-sombra`),
a inicial passou a lê-los (sem mudar nada na tela dela) e o botão de cristal virou `componentes/Cristal.css` para as
outras páginas. Em Treinar:

| Elemento da inicial | Onde aparece em Treinar |
|---|---|
| Painel escuro quente (`--mundo-painel`), tinta marfim, selo dourado (`--mundo-ouro`) | "Começar agora", com os atalhos em vidro e os números dourados como a sequência |
| Botão de cristal (`.cristal`) | Toda ação de começar: sessão rápida, "Responder"/"Iniciar prova" no resumo, na barra e na gaveta do celular |
| Superfícies brancas de 20 px (`--mundo-raio`) com sombra média | Montagem e resumo |
| Item em fundo recuado; escolhido em verdete-véu com filete à esquerda (`.jn-item`) | Cartões de prova |
| Números em Jersey 10 verdete (`.jn-numeros`) | Total da sessão e números dos passos |
| Botão de contorno verdete (`.jn-botao`) | Secundários: sugestões do estado vazio, "Montar a prova", "10 simulados" |
| Ouro-véu (`.jn-ranking`) | Assinante: "Veja os temas que mais caem" |

Regra para as próximas páginas: usar esses tokens e o `.cristal`, sem hex soltos nem botão de outra cor para começar.

## Inventário funcional (preservado)

Sessão rápida e os quatro atalhos (com o aviso de sessão em andamento e o redirecionamento de `iniciarComAviso`);
categorias e "Todas as provas" (trocar limpa provas incompatíveis); origem (misto, oficiais, simulados); busca no
texto com debounce de 250 ms e a busca de assunto pelo nome, com rótulos distintos; árvore de temas e subtemas
(marcar e abrir separados, marcar/desmarcar todos, ver só marcados, zero desabilitado, alvos de 48 px); dez
situações, incluindo as duas da turma (premium) e os links para Favoritas e Revisão; prova de origem, ano,
dificuldade, com imagem, com comentário, anuladas (não contam no desempenho), embaralhar, esconder etiquetas (com a
explicação); quantidade 5/10/20/30/50/100/Todas/outra (limita ao total ao sair do campo); Estudo/Prova com 1 a 4
horas; "Montar a prova" e "10 simulados"; filtros salvos (criar, aplicar, renomear, apagar, limite de 12, aviso de
escopo sem conta); limpar com desfazer de 8 s; URL compartilhável e links antigos limpos; aviso de conta para
visitante com o texto atual do gratuito (`fraseGratis('treinar')`).

## Matriz de identidade

| Papel da arte | Páginas | Como se ligam ao resto |
|---|---|---|
| **Cena protagonista** (HD-2D grande, narrativa) | Página inicial, Ranking (Salão dos Cem), Biblioteca de resumos, Cronograma (Torre do Tempo), Flashcards (Arquivo da Vila), telas de espera | A cena é o assunto; a interface em volta usa as mesmas superfícies claras. |
| **Arte de apoio, opcional** | Menu (ícones pixel, fogo nas bordas só ao interagir, coruja e gato), Desempenho, Minha conta (crachá), Simulado Nacional | Objeto ou ícone pixel com papel claro, nunca fundo de página. |
| **Interface clara protagonista** | Treinar, Login, Minha conta (seções), sessão de questões, Revisão, Favoritas, Caderno de erros, Admin | Porcelana e branco, verdete para agir, ouro só no destaque de começar ou celebrar; pixel só nos números (Jersey 10). |

Cores semânticas (acerto, erro, aviso) e as dos gráficos não mudam. Tema escuro desenhado à parte, com os mesmos
papéis. Modos de jogo deliberadamente sombrios (torneio, arena dos flashcards) continuam como estão.

## Auditoria das sobras de Halloween (01/11/2026)

- Mascote: `fantasiaDoMes()` (`componentes/mascote/comportamentos.ts`) só veste o manto em outubro; as falas de
  Halloween entram no sorteio só nesse mês. Volta sozinho em novembro, nada a mudar.
- Biblioteca: abóboras e morcegos do salão só de 24 a 31/10 (`biblioteca/salao/segredos.ts`, `epoca`).
- Treinar: o bilhete escuro com brilho laranja de lamparina e o acampamento com a fogueira eram a última pegada quente
  da temporada nesta página; saíram nesta entrega.
- Arena dos flashcards (morcego, esqueleto, espectro): bestiário de jogo, não temporada; continua.

## Menu: feito agora e próxima etapa

Feito: os fogos dos atalhos (`FogoVivo`) e o vaga-lume saíram, com autorização do Tales (auditoria de 01/11/2026):
competiam com os destinos e faziam a grade transbordar no celular (365 px de conteúdo em 347). Medido depois: sem
transbordo em 320, 390 e 1440 px. Fica a chama da sequência no topo, que é informação e igual à da página inicial. O
selo "Novo" do Atlas saiu do azul para o verdete. Foco preso, Escape, retorno de foco, `Ctrl+K`, rotas e paywalls
não foram tocados.

Próxima etapa (proposta): "Continuar" como única ação cheia do topo; Treinar como atalho fixo logo depois dele (hoje
divide a linha com os três cartões de fogo); a busca acima de tudo no celular, com os atalhos em duas colunas de
cartões mais baixos (56 px) para caber "Continuar" + seis atalhos na primeira tela de 390 px.

## Minha conta: proposta (não implementada)

1. **Topo com status e próxima ação:** uma linha só com plano (grátis/assinante, renovação), sincronização e o que
   falta (ex.: "Complete o perfil: falta a etapa"), com um botão para a próxima ação. Hoje o crachá, três selos, o
   botão de sincronizar, três métricas e quatro atalhos disputam o topo.
2. **Menos repetição:** as métricas (respondidas, revisões, acerto) e os atalhos (Treinar, Desempenho, Ranking,
   Planos) já estão no Menu e na página inicial; ficam um link "Ver desempenho" e o atalho de assinatura.
3. **Celular:** a lista de seções vira a tela inicial com o status no topo e um selo por seção que precisa de
   atenção (sincronização com conflito, termos novos, perfil incompleto); cada seção abre por cima com "voltar".
4. **Sem tocar na lógica sensível:** salvar perfil, sincronização, conflitos, privacidade, segurança e backup ficam
   como estão; a mudança é de ordem e hierarquia.

## Como conferir

- `node scripts/capturar_telas.mjs /treinar treinar --com-dados [--escuro] --estreito --pasta DIR` grava 390, 320 e
  1440 px (`--estreito` é novo e acrescenta o celular de 320 px).
- `node scripts/capturar_telas.mjs /treinar treinar-funcional --com-dados --roteiro fixtures/roteiro_treinar.mjs --pasta DIR`
  confere no navegador: atalhos x contagens, URL compartilhada, "Mais filtros" abrindo sozinho, tirar filtro pelo
  resumo, quantidade personalizada, estado vazio com sugestão, limpar e desfazer, filtro salvo e a sessão rápida de 10.
