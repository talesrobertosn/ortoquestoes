# Decisões do dono do projeto

Registro em ordem de data. Cada linha é uma decisão do Tales; não mude sem nova orientação dele.

## 12/10/2026 (conversa de criação)

**Lugar e nome**
- Os flashcards ficam dentro do Orto Questões, numa aba **Flashcards** em **Treinar**. Ficam separados do treino de questões, mas no mesmo site.
- Para o usuário, o nome é **"flashcards"**, nunca "cartas": o público médio da ortopedia entende "flashcards". O Tales gosta de "cartas", mas a clareza vence.
- O espaço se chama **Torneio de Flashcards**. "Grimório" foi descartado (o público não reconhece a palavra). A ideia de um **livro de flashcards** como coleção agrada.

**Modos**
- **Estudo:** calmo. Vira o flashcard, vê a resposta, diz como foi.
- **Batalha:** com pontos de vida, dano por dificuldade, poderes (augments), masmorra com andares e chefes. É um **foco importante**: tem que ser fluido como jogo de celular e de computador.
- Os dois modos têm estética de jogo: **giro 3D do flashcard**, animações e **cenários diferentes** (um à luz de velas, outro num campo). Pode ser 3D mais fluido, pixel art ou uma mistura.

**Dano na Batalha (proposta do Tales)**
- Errar um flashcard difícil tira 10 de vida, um moderado 5 e um fácil 2.
- Acertar recupera vida em certas condições.
- Há prêmios, por exemplo "ganhe 20 de vida se acertar os próximos 3".
- Há poderes como **imune à morte** e **escudo**.

**Acesso**
- **Não assinante:** 10 flashcards por dia.
- **Assinante:** ilimitado.

**Revisão**
- **Duas filas separadas** na página Revisão: a de questões (já existe) e a de flashcards. Nem todo mundo quer flashcards, e quem não quiser não é cobrado por eles.
- O sistema de revisão pode ser complexo, desde que o uso seja simples.

**Conteúdo**
- Gerar flashcards **de todas as questões** e dos **comentários**, por comando, para poder repetir sempre que entrarem questões novas.
- **Ordem:** dos temas que mais caem para os que menos caem.
- Fazer flashcards de **todas as questões de anatomia** dos OrtoQuestões Simulados.
- Pesquisar o que já existe popularmente (Anki, Orthobullets Cards, regras de boa formulação) para fazer flashcards **realmente úteis e impactantes**, em **vários formatos**.
- **Raridade pela incidência:** aprovada. Lendária = o que mais cai.
- **Vínculo com a questão:** "de onde veio" e "fazer a questão" em todo flashcard.

**Imagens**
- Figuras reais das questões. Enfeites em pixel art podem ("desenhozinhos" para ficar bonito).

**Forma de trabalho**
- Projeto de vários dias, feito às vezes com Claude e às vezes com ChatGPT. **Tudo documentado no repositório** para qualquer um continuar.
- Primeiro passo: um protótipo visual. Feito em `prototipos/flashcards/torneio.html`.

## 12/10/2026, noite (depois de ver o protótipo 2)

**O projeto sai do rascunho**
- "Do ponto de vista inicial tá bem bom": seguir, oficializar e colocar no site **o quanto antes**.
- Nada vai para produção sem aprovação do Tales.
- **Depois, ainda em 12/10:** "pode subir no site, com o link; como só eu vou saber o link, só eu vou usar". A rota `#/flashcards` foi publicada sem aparecer em nenhum menu.

**Batalha primeiro**
- A **Batalha é o modo de entrada**. O Estudo fica numa aba ao lado, para quem quiser.

**Dificuldade**
- **Mais fácil morrer do que matar o monstro**, e a dificuldade depende do monstro.
- Monstros temáticos (como o Golem de Gesso) agradaram. Estatísticas entram depois.

**Arte**
- Tudo mais bonito: tabuleiro, mesa, cartas, cenários, golpes e efeitos.
- Estilo: **Hearthstone e Legends of Runeterra**, com **toques de pixel art**. O cenário pode deixar de ser pixel art e virar fantasia lisa, com luz e profundidade.
- No celular, o texto dos flashcards precisa ser legível (no protótipo estava minúsculo).
- "Quanto mais efeitos visuais melhor."

**Briefing completo**
- O Tales mandou o briefing "Evolução visual e mecânica do Torneio de Flashcards": direção de arte, efeitos de acerto e erro, combos, intenção do inimigo, foco, críticos, relíquias, escudo, pergaminho da pista, recompensas, chefes e arquitetura separada.
- O resumo do que entrou está em [BATALHA.md](BATALHA.md) e [ARQUITETURA.md](ARQUITETURA.md).
- Deu **liberdade criativa total** para decidir e organizar ("pode começar a produzir").

**Decisões tomadas por Claude com essa liberdade (o Tales pode reverter qualquer uma)**
- **Adversário com vida, e não mais 5 flashcards por andar.** A comparação está em BATALHA.md. Motivo: dá sensação de combate e deixa cada monstro ter dificuldade própria.
- **Balanceamento por simulação:** quem acerta 60% raramente vence o chefe; quem acerta 90% quase sempre vence (tabela em BATALHA.md).
- **Sem sorte no dano:** o crítico é o acerto difícil, sempre igual. Nada aleatório muda o placar, para não estragar rankings futuros.
- **Acerto com o Pergaminho da pista conta como "assistido":** entra na revisão como dúvida e nunca como domínio.
- **Foco (energia) ainda não entra:** está descrito como proposta, com balanceamento, esperando aprovação.
- **Sons sintetizados, desligados por padrão**, com volume. **Efeitos reduzidos** seguem a preferência do aparelho e podem ser ligados nos Ajustes.

## Pendentes (perguntar ao Tales quando chegar a hora)

1. **Batalha para não assinante:** só assinante, uma partida curta por dia, ou uma partida que gasta os 10 flashcards grátis?
2. **Os 10 grátis por dia** contam novos e revisões juntos? A proposta atual é que sim.
3. ~~Estética final~~: respondida em 12/10 (Hearthstone/Runeterra com toques de pixel art).
4. **Sons:** feitos opcionais e desligados por padrão. Confirmar se agradam.
5. **Ranking da Batalha** (Desafio do dia) junto da Arena dos Residentes ou separado?
6. **Foco:** integrar o recurso de energia proposto em BATALHA.md?
7. **Adversário com vida:** confirmar a troca dos 5 flashcards por andar (decidida por Claude com a liberdade dada).

## 13/10/2026, jornada única (pedido direto ao Codex)

- Retirar Fácil/Normal/Difícil da escolha de partida e unificar o ranking.
- Sequência: maior acerto da turma, questões acertadas pelo usuário, questões erradas pelo usuário, mistura aleatória; variar dentro de cada grupo.
- Entrada com Cripta e Biblioteca, sem Torre; Biblioteca identificada como treino de flashcards.
- Melhorar central, entrada, Biblioteca e música, com atmosfera Stardew Valley/Octopath II e conteúdo autoral.
- Cronograma de flashcards somente na área Flashcards, removendo o atalho do cronograma de questões.
- Nas mudanças visuais, enviar ocasionalmente capturas reais de desktop e/ou celular durante o trabalho.
- Implementação e critérios em [JORNADA-UNICA.md](JORNADA-UNICA.md). Esta orientação substitui a escolha de níveis e a divulgação da Torre descritas anteriormente.

## 13/10/2026 — polimento do beta

Opinião com melhor acabamento; som baixo a cada abertura e controle vertical no ícone, em vez de mute imediato. Melhorar fundo do Golem, apresentação e capa. Preparar imagem de proposta de herói menos infantil. Toda mudança fica documentada para o Claude. Implementação e referência em [POLIMENTO-AUDIO-OPINIAO.md](POLIMENTO-AUDIO-OPINIAO.md).

## 14/10/2026, início mais familiar

Tales pediu que o começo priorize questões que a pessoa já acertou, para diminuir a frustração. Essa orientação substitui a ordem de 13/10: acertadas pelo usuário, maior acerto da turma, erradas pelo usuário, novas e mistura. O sorteio continua dentro de cada grupo, com até oito flashcards na abertura de cada grupo e salto dos grupos vazios. As respostas consultadas são das questões de origem; as partidas salvas permanecem intactas. Sem SQL.

## 01/11/2026 — O Arquivo da Vila (central refeita, desempenho e cronograma)

Pedido do Tales ("deixar bonita"; depois "é pra mudar tudo, não só fingir que tá mudando"). A central foi refeita, não
só repintada:
- Topo com a cena HD-2D do Arquivo da Vila (o fichário de fichas ao lado da praça da torre, com a escada da Cripta no
  fundo), manhã, tarde e noite (`scripts/gerar_cena_flashcards.py`), e **uma ação só**, a certa para hoje: "Revisar
  agora" se algo venceu; senão "Seguir cronograma · faltam N" (ou "Começar pelos que mais caem" na primeira vez);
  senão "Estudar flashcards". A Biblioteca e o Torneio (pela Entrada) ficam como caminhos discretos. A descrição vai
  numa faixa logo abaixo da cena.
- **Hoje**: um painel só, dividido por linhas finas como o progresso da página inicial, com as filas para revisar
  (Revisões de hoje, Errei, Hesitei, Nunca estudados: número em fonte pixel), o cronograma do dia e o estudo por assunto.
- **Por onde seguir**: Biblioteca, Torneio e Meu desempenho, cada um com o seu objeto pixel animado (o fichário abre a
  gaveta e as fichas pulam; a escada da Cripta acende; o medidor de latão enche), mais o ranking.
- "Como funciona" recolhido (aberto na primeira visita); um bloco de opinião só.
- Desempenho e Cronograma: a mesma cena numa faixa curta e as caixas redondas.
- Tudo no fundo normal do site, com as caixas brancas e redondas da página inicial (`.cf--arquivo`); o assoalho de
  madeira foi testado e retirado, como a calçada do cronograma. O jogo não muda.
- A coruja ou o gato aparecem de vez em quando sentados num botão, nunca por cima de uma caixa vizinha.
- Correções: os botões Hesitei/Sabia mostram o prazo do degrau de verdade (`prazoDaAvaliacao`, testado); falha de rede
  ao carregar o acervo aparece com "Tentar de novo"; o visitante vê "Crie sua conta para treinar flashcards".
- Ficam para o Tales decidir: os nomes (Torneio/Cripta/Batalha) e uma definição só de "dominado"
  (`docs/prompts/flashcards-hd2d.md`).
