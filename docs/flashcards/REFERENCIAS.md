# Referências visuais (jogos de cartas)

Em 12/10/2026, depois de ver o primeiro protótipo, o Tales disse que gostou da imagem e do mecanismo e mandou cinco capturas de jogos de cartas conhecidos como inspiração.
As imagens **não ficam no repositório** (são de outros jogos, com direitos); aqui fica só o que cada uma ensina e como entra no Torneio de Flashcards.

## O que foi mandado

| Referência | O que chama a atenção |
|---|---|
| Jogo de tabuleiro roxo e dourado (herói "Ivko", baralho com 44) | tabuleiro como objeto, com moldura de metal dourado e pedra; retrato redondo do herói com **coração e número de vida**; 3 encaixes redondos ao lado do retrato; baralho numa bandeja com o contador; carta ampliada à direita para leitura; linha de energia ligando a carta ao alvo |
| Gwent (botão "PASSAR") | campo de terra escura com **brasas** subindo; mão em leque na base; baralho e descarte nos cantos com número; botão **redondo e grande** à direita; escudos de rodada à esquerda |
| Jogo de mesa de madeira (cartas de arqueiros e brasão de águia) | **mesa de madeira** com casas vazias gravadas (arco, espada) onde as cartas vão cair; gemas numéricas nos cantos da carta; arte ocupando quase toda a carta e o texto numa faixa de pergaminho |
| Hearthstone | tabuleiro emoldurado, cercado por um cenário com objetos (torres, catapulta); retrato do herói **no centro da borda de baixo** e do adversário em cima; botão "fim de turno" que **brilha em verde** quando há o que fazer; cristais de mana |
| Legends of Runeterra | campo de grama e pedra; **linha central** com uma joia separando os lados; efeitos de magia azul ligando as cartas; botão "OK" redondo com marcadores de rodada; gemas de vida e de mana na borda esquerda |

## O que adotamos no protótipo (versão 2 da Batalha)

1. **Tabuleiro emoldurado** sobre o cenário em pixel art, com a moldura e o tampo mudando conforme o cenário: madeira no Salão das velas, pedra na Masmorra, grama e pedra no Campo.
2. **Linha central com joia** dividindo o lado do adversário (em cima) e o seu (embaixo).
3. **Adversário em cima:** retrato redondo em pixel art, nome numa faixa e **coração com a vida**. O adversário "joga" o flashcard da pergunta no centro da mesa.
4. **Você embaixo, à esquerda:** retrato com o coração de vida e **3 encaixes de poderes** ativos (escudo, coroa, poção...).
5. **As alternativas viram a sua mão, em leque.**
   - No celular: um toque levanta e amplia a alternativa para ler, e o segundo toque, ou o botão redondo, joga.
   - No computador: teclas 1 a 4.
6. **Botão redondo grande à direita** ("Jogar", depois "Seguir"), que brilha quando há o que fazer.
7. **Golpe visível:**
   - acertou: uma esfera de luz sai do flashcard e atinge o adversário;
   - errou: o adversário avança e o golpe vermelho atinge o seu retrato.
   - Os números de dano sobem do alvo.
8. **Baralho com contador numérico** na borda, como nos jogos de referência.
9. **Partículas no cenário:**
   - brasas na Masmorra;
   - poeira dourada nas velas;
   - vaga-lumes no Campo.
10. **Gemas nos cantos do flashcard:** dano (dificuldade) no canto de cima, à esquerda, e raridade no canto de cima, à direita.

## Ideias guardadas para depois

- **Casas gravadas na mesa** (como na mesa de madeira): os flashcards do andar ficam expostos como troféus, e os errados do lado do adversário.
- **Carta ampliada ao segurar** (como na referência roxa): segurar um flashcard da mão mostra uma versão grande ao lado.
- **Cristais de energia** (Hearthstone, Runeterra): energia ganha nos acertos para gastar em poderes, em vez de poderes só por andar.
- **Relógio de partida** (referência roxa): variante "contra o relógio" no Desafio do dia.
- **Retrato do herói personalizável:** emblemas da conta viram molduras do retrato.
