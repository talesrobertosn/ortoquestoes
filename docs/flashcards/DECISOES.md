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

## Pendentes (perguntar ao Tales quando chegar a hora)

1. **Batalha para não assinante:** só assinante, uma partida curta por dia, ou uma partida que gasta os 10 flashcards grátis?
2. **Os 10 grátis por dia** contam novos e revisões juntos? A proposta atual é que sim.
3. **Estética final:** depois de ver o protótipo, mais pixel art, mais "pintado" (Hearthstone, Gwent) ou mistura?
4. **Sons:** opcionais e desligados por padrão (proposta). Confirmar.
5. **Ranking da Batalha** (Desafio do dia) junto da Arena dos Residentes ou separado?
