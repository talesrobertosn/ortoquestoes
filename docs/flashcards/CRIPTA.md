# Cripta do Residente (versão 3, 13/10/2026)

O Torneio de Flashcards ganhou nome próprio: **Cripta do Residente**, a masmorra dos flashcards.
Pedido do Tales em 13/10/2026: entrada própria, Torre de 0 a 100 que salva a posição, mais
mecânicas e poderes (Hades), efeitos e cartas no estilo de Legends of Runeterra e Hearthstone,
NPCs, inimigos novos (dragões, dinossauros) e o herói crescendo. Pode subir tudo o que for do jogo
(só ele tem o link); **não** pode aparecer no menu, na capa, no ranking nem na página de vendas.

## Rotas

| Rota | O quê |
|---|---|
| `#/flashcards` | Entrada: portão da Cripta, os três modos, Altar do Saber e Bestiário |
| `#/flashcards/cripta` | A Cripta sem fim (atos de 3 andares, chefe no 3º) |
| `#/flashcards/torre` | Torre do Título: 100 andares, chefe a cada 10, patamar a cada 5 |
| `#/flashcards/biblioteca` | O Estudo calmo (a Biblioteca por área) |
| `#/flashcards/ranking` | Ranking (só com a trava `VITE_FLASHCARDS_RANKING=1`; no `npm run dev` aparece) |

O X do jogo volta para a Entrada; o X da Entrada volta para Treinar.

## Travas (config.ts), todas desligadas na publicação

| Trava | Liga |
|---|---|
| `VITE_FLASHCARDS_CAPA=1` | Cartão da Cripta na página inicial, ao lado do banner do ranking ([CAPA-E-VENDAS.md](CAPA-E-VENDAS.md)) |
| `VITE_FLASHCARDS_VENDA=1` | Seção da Cripta na página de planos ([CAPA-E-VENDAS.md](CAPA-E-VENDAS.md)) |
| `VITE_FLASHCARDS_RANKING=1` | Ranking no jogo; com `VITE_FLASHCARDS_LIMITE=true`, também as corridas no servidor ([RANKING.md](RANKING.md)) |

## O que tem de novo

- **Dois modos**: a Cripta (sem fim) e a Torre do Título (100 andares, com patamar a cada 5:
  se cair, volta do patamar com o herói, os poderes e as relíquias de lá; no topo, o Dragão Ancestral).
- **Portas entre os andares** (Hades): cada porta mostra a recompensa depois da luta (poder,
  relíquia, cura, tesouro, bênção de um patrono) ou leva a uma sala: a **Caixeira do Arsenal** (loja)
  ou o **Velho Preceptor** (três ajudas). Antes do chefe, só a porta do chefe e a da loja.
- **Moedas**: cada adversário vencido dá moedas (o Mímico guarda mais); a loja vende poderes,
  relíquias e poção.
- **Bênçãos de cinco patronos** (os deuses do Hades): Mestre da Fratura (brasas), Mestra da Mira
  (críticos), Guardiã da Placa (defesa e reflexo), Senhora do Calo Ósseo (cura), Mestre do Raio
  (raios). Com dois patronos, aparecem as **bênçãos em dupla** (lendárias).
- **Raridades** comum, incomum, rara, **épica** e **lendária**, com moldura e brilho próprios.
- **Flashcards brilhantes** (5%): moldura holográfica; valem o dobro de cristais e +10 moedas. O
  conteúdo médico é o mesmo, o brilho é só do jogo.
- **Altar do Saber** (o Espelho do Hades): cristais de conhecimento ganhos acertando (o difícil vale
  o dobro) compram talentos permanentes e pequenos.
- **Velho Preceptor no meio da luta**: com a vida abaixo de 25%, a partir do andar 4, às vezes ele
  aparece (uma vez por partida), cura 20% e dá um Escudo arcano.
- **Desgaste**: na Cripta funda e no alto da Torre, as curas rendem menos (até 35%). É o que impede a
  partida infinita de quem acerta quase tudo.
- **Adversários novos**: Gosma de Cimento (se divide e ganha barreira), Raptor do Menisco
  (duas mordidas, passa pela barreira), Mímico do Arsenal (rouba carga), Dragão de Ossos (Sopro a cada
  3 rodadas, avisado na intenção), Rainha do Cimento, Dragão Rubro da Artrose e Dragão Ancestral do
  Título (só no andar 100 da Torre). Cenários novos: covil do dragão e o terraço da Torre.
- **Bestiário**: quem você já viu e venceu, com silhueta dos que faltam.
- **Herói que cresce**: o cavaleirinho original continua por baixo e ganha peças por estágio
  (ombreira, capa longa, asas de ouro no elmo e lâmina que brilha, asas de luz com coroa e auréola).
- **Efeitos**: pausa de impacto e clarão no sprite, linhas de velocidade no crítico de sorte, raios
  em zigue-zague, chuva de moedas, sopro de fogo-fátuo, cartaz do chefe com o nome enorme.
- **Música**: temas novos (Entrada, covil, Torre, loja, Preceptor, dragões) com melodia procedural, e
  fanfarras de vitória, chefe, derrota, tesouro, patamar e topo.

Regras e números: [BATALHA.md](BATALHA.md#versão-3-13102026-cripta-do-residente). Arte: [ARTE.md](ARTE.md).
