# Modo Batalha: desenho de jogo

Objetivo: transformar a revisão em uma partida curta, tensa e divertida, sem perder o valor de estudo.
Toda partida termina mandando os flashcards errados para a fila de revisão.

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
