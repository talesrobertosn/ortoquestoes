# Modo Batalha: desenho de jogo

Objetivo: transformar a revisão em uma partida curta, tensa e divertida, sem perder o valor de estudo.
Toda partida termina mandando os flashcards errados para a fila de revisão.

## Versão no site (12/10/2026, noite)

A Batalha já roda dentro do app (`src/flashcards/`, rota `#/flashcards`, ainda fora da produção). O que vale agora, por cima do desenho original abaixo:

### Andar = um adversário com vida (antes: 5 flashcards)

| | 5 flashcards por andar (antes) | Adversário com vida (agora) |
|---|---|---|
| Sensação de combate | fraca, é uma contagem | forte: o monstro perde vida a cada acerto |
| Dificuldade por monstro | difícil de expressar | natural: vida, força e regras próprias |
| "Mais fácil morrer que matar" | não se aplica | o dano do monstro cresce com a força dele |
| Ritmo da revisão | previsível | a **Fúria** limita a demora: passada a paciência, o monstro bate ×1,5 |

### Números

- **Você:** 100 de vida.
- **Seu ataque ao acertar:** fácil 10, moderada 20, difícil 30.
  - **Combo:** a partir de 3 acertos seguidos, +5 por acerto.
  - **Golpe duplo:** o próximo acerto vale o dobro.
  - **Crítico:** é o acerto difícil. É só visual (impacto reforçado) e não depende de sorte.
- **Dano do monstro quando você erra:** o dano-base aprovado (fácil 2, moderada 5, difícil 10) × a força do monstro, mais o veneno ou a pressão e a Fúria.
- **Intenção:** a tela mostra antes quanto você leva se errar ("Se errar: -15").
- **Cura:**
  - 3 acertos seguidos: +5;
  - flashcard lendário: +3;
  - Poção do desafio cumprida: +20.

| Andar | Monstro | Vida | Força | Regra própria |
|---|---|---|---|---|
| 1 | Golem de Gesso (Campo) | 80 | ×3 | nenhuma: bate pouco, aguenta muito |
| 2 | Serpente do Ciático (Masmorra) | 100 | ×3,5 | veneno: +3 por erro seguido |
| 3 | Guardião do Acetábulo, **chefe** (Salão) | 190 | ×4 | armadura 5; joga só moderados e difíceis; com metade da vida entra na fase **Teto rachado** (força ×5, sem armadura); pressão de +2 por erro seguido |
| 4 em diante | o ciclo recomeça | +25% por ciclo | +25% por ciclo | |

### Balanceamento (simulação em `fixtures/testar_flashcards.mjs`)

Partidas simuladas por quem acerta X% dos flashcards, escolhendo sempre a primeira recompensa:

| Acerto | Vence o chefe |
|---|---|
| 50% | 2% |
| 60% | 10% |
| 70% | 36% |
| 80% | 74% |
| 90% | 97% |

O teste falha se o chefe ficar fácil demais para quem acerta 60% ou 70%, ou impossível para quem acerta 90%.

### Poderes e relíquias

- Depois de cada monstro, escolha **1 de 3**. Depois do chefe vêm relíquias raras.
- **Poderes** ocupam os **3 encaixes** e se gastam. O mesmo poder empilha; com os encaixes cheios, o novo toma o lugar do mais antigo (a tela avisa).
  - **Escudo:** bloqueia o próximo golpe, com animação de absorção e cacos.
  - **Imortal:** uma vez, não morre e fica com 1 de vida.
  - **Poção do desafio:** acerte os próximos 3 e ganhe +20 de vida.
  - **Pergaminho da pista:** use quando quiser para eliminar uma alternativa errada. O acerto conta como **assistido**: entra na revisão como dúvida, nunca como domínio, e aparece no fim da partida.
  - **Golpe duplo:** o próximo acerto vale o dobro.
- **Relíquias** valem a partida toda:
  - **Bisturi afiado:** +5 nos acertos difíceis.
  - **Tala reforçada:** -2 em todo golpe recebido.
  - **Amuleto da incidência** (rara): lendário cura +6.
  - **Lupa do preceptor** (rara): 1 pergaminho por monstro.
- Depois do chefe, dá para **encerrar com a vitória** ou seguir para o ciclo seguinte, mais forte.

### Foco (proposta, ainda fora do jogo)

- **Como seria:** +1 de foco por acerto sem ajuda, até 5. Com 3 de foco, a pessoa ativa uma habilidade escolhida no começo da partida:
  - **Concentração:** o próximo erro causa metade do dano;
  - **Releitura:** vira o flashcard de novo depois de errar, sem dano extra, para reforço;
  - **Golpe preciso:** +10 no próximo acerto.
- **Balanceamento:** gastar 3 de foco equivale a mais ou menos um Escudo a cada 4 ou 5 acertos. Isso tiraria do chefe 10 a 15 pontos percentuais de dificuldade para quem acerta 70%.
- Fica fora até o Tales aprovar, para não deixar a Batalha fácil.

### Fim da partida

- Pontos, acertos, assistidos, melhor sequência e monstros vencidos.
- **Os flashcards que te derrubaram**, cada um com "Fazer a questão" e o botão **Revisar no Estudo**, que abre o Estudo começando por eles.

## Regra-chave: resposta conferida pelo jogo

No modo Estudo, a pessoa se autoavalia (Errei, Hesitei, Sabia). Na Batalha, se ela mesma dissesse se acertou, o jogo perderia o sentido. Por isso todo flashcard de Batalha é um **duelo**: 2 a 4 alternativas tiradas da questão de origem, com correção automática.

## Vida e dano

- Começa com **100 de vida**.
- **Dano ao errar** (proposta do Tales):

  | Dificuldade | Dano |
  |---|---|
  | difícil | 10 |
  | moderada | 5 |
  | fácil | 2 |

- **Cura:**
  - 3 acertos seguidos: +5;
  - acertar um flashcard lendário: +3;
  - Poção do desafio cumprida: +20.
- **Pontos por acerto:**

  | Dificuldade | Pontos |
  |---|---|
  | fácil | 10 |
  | moderada | 20 |
  | difícil | 30 |

  O Golpe duplo dobra os pontos do próximo acerto.

## Poderes (augments)

A cada 5 flashcards, a pessoa sobe um andar e escolhe **1 de 3 poderes** sorteados:

| Poder | Efeito | Ícone (pixel) |
|---|---|---|
| Escudo | anula o próximo dano | escudo azul |
| Imortal | uma vez, não morre: fica com 1 de vida | coroa (não usar caveira) |
| Poção do desafio | +20 de vida se acertar os próximos 3; perde se errar | frasco |
| Pergaminho da pista | elimina uma alternativa errada no próximo | pergaminho |
| Golpe duplo | o próximo acerto vale o dobro | espada |

Ideias para depois:
- **Segunda chance:** refaz o último errado.
- **Foco:** 3 flashcards só da sua área mais forte.
- **Relíquias permanentes por partida:** "+1 de cura por acerto lendário".
- **Maldições escolhidas em troca de mais pontos:** "sem pista nesta partida, pontos ×1,5".

## Masmorra, andares e chefes

- **Andar:** 5 flashcards. A dificuldade média sobe com o andar.
- **Chefe:**
  - a cada 3 andares, com nome temático da área: "Guardião do Acetábulo", "Senhor do Anel Pélvico", "Dragão do Escafoide";
  - joga só flashcards difíceis do assunto;
  - vencer dá um poder raro.
- **Cenários por masmorra:**
  - Salão das velas: estudo calmo;
  - Masmorra: tochas;
  - Campo: bandeiras ao pôr do sol;
  - ideias: Biblioteca, Muralha, Torre.
- **Fim da partida:**
  - mostra o andar alcançado, os pontos e **os flashcards que te derrubaram**, que entram na fila de revisão de flashcards;
  - botões "Nova partida" e "Revisar agora".

## Desafio do dia (etapa posterior)

- O mesmo baralho para todos, sorteado pela data (semente).
- Ranking do dia e emblema para quem vence o chefe.
- Ligado à Arena dos Residentes, ou separado (decisão pendente).

## Sensação de jogo (experiência)

- **Comprar o flashcard:** sai do baralho com animação curta (cerca de 0,5 s).
- **Responder:** o flashcard vira em 3D e mostra a resposta.
- **Errar:**
  - a mesa treme, a tela fica vermelha nas bordas;
  - aparece "-10" subindo;
  - vibração no celular.
- **Curar:** borda verde e "+5 vida".
- **Escolher poder:** as opções aparecem como flashcards roxos na tela, e um toque escolhe.
- **Lendário:** borda dourada com brilho passando.
- **Controles:**
  - celular: tudo com uma mão (alternativas em grade 2×2 embaixo);
  - computador: teclas 1 a 4.
- **Acessibilidade:** com "reduzir movimento", troca sem girar e sem tremer.
- **Sons:** opcionais, desligados por padrão.

## Limite do plano grátis na Batalha

Decisão pendente (veja [DECISOES.md](DECISOES.md)). Enquanto não houver resposta, a proposta é que a Batalha conte flashcards no mesmo limite de 10 por dia do modo Estudo.
