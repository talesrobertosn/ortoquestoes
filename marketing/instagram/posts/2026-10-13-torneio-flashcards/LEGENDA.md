# Treine flashcards, beta público (feed e stories, 13/10)

Propaganda do beta dos flashcards.

## Ordem da mensagem

Pedido do Tales: primeiro o básico, depois o jogo.

1. **Primeiro:** treinar flashcards de Ortopedia por área, com as questões das provas e os comentários.
2. **Depois:** a revisão no tempo certo (Errei, Hesitei, Sabia) e o cronograma de flashcards.
3. **Só no fim:** o modo jogo, com adversários, chefes e o personagem que evolui.

O residente não precisa saber o que é RPG para entender a capa. O feed e os stories têm composições e prints diferentes.

## Como foi feito

Visual HD-2D, como anúncio de RPG, mas sempre com o foco em **treinar flashcards**.

- **Cenários:** os pintados do jogo (biblioteca, floresta, covil e masmorra), com profundidade de campo, raios de luz e partículas.
- **Personagens:** saíram das folhas reais do jogo (`public/flashcards/sprites`).
- **Prints:** reais, do jogo rodando, na pasta `prints/`.

Nada foi gerado por IA nem baixado. Não há desenho de anatomia novo.

## Ordem e horários

| O quê | Arquivos | Quando |
|---|---|---|
| Feed (carrossel) | feed-01 a feed-07 | das 7h às 8h |
| Stories | story-01 a story-06 | das 18h às 19h ou no almoço |

Os stories não têm figurinha. Se quiser o link, use o modelo "Treine grátis".

## Conferência

- **Acesso:** a regra é a real (`src/paginas/CentralFlashcards.tsx`): conta grátis com 10 flashcards a cada 24 horas, assinante sem limite. Preços não aparecem.
- **Números:** não citamos o total de flashcards nem de questões.
- **Revisão:** os intervalos (volta hoje, em 3 dias, em 10 dias) são os mostrados nos botões do modo Estudo.
- **Áreas:** são as da Biblioteca e do cronograma de flashcards.
- **Nomes:** monstros, chefes e estágios vêm de `src/flashcards/motor/bestiario.ts`.

## Como refazer

Rodar `python3 .../gerar_post.py` e depois `node marketing/instagram/gerar.mjs .../post.html`.

## Legenda do feed

Novo no Orto Questões: flashcards de Ortopedia.

Escolha a área (Coluna, Joelho, Mão, Trauma, Pediatria…), responda e vire o flashcard. Cada um vem das questões das provas, com o comentário.

Depois de responder, você diz como foi: Errei, Hesitei ou Sabia. O que você erra volta antes. E dá para montar um cronograma de flashcards até a data da sua prova.

Quer treinar jogando? Os mesmos flashcards também viram um modo jogo: cada acerto é um golpe, e a cada 3 andares tem um chefe.

Está em beta: teste grátis e conte o que achou. O caminho está no nosso perfil, @ortoquestoes.

#ortopedia #residenciamedica #flashcards #teot #ortoquestoes
