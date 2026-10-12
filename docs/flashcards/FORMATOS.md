# Como escrever bons flashcards

## O que a pesquisa diz (12/10/2026)

- **Princípio da informação mínima** (Wozniak, *Twenty rules of formulating knowledge*, SuperMemo):
  - uma pergunta simples, de recordação ativa, é lembrada melhor que uma complexa, mesmo quando a complexa "vale" várias simples;
  - o primeiro passo é não decorar o que não entendeu.
  - Por isso **todo flashcard tem o vínculo com a questão e o comentário**: quem não entendeu volta à aula.
- **Lacuna (cloze):** frase com uma parte removida para completar. É o formato recomendado para quem começa e a forma mais fácil de transformar texto em flashcard.
- **Orthobullets Cards:** o plano de 90 dias para o OITE, a prova de residência dos EUA, combina tópicos, flashcards e questões (cerca de 5.500 cards). É a referência de mercado na ortopedia e mostra que o formato "card + questão do mesmo tema" funciona.
- **Questões de provas anteriores** foram o recurso mais bem avaliado pelos residentes numa pesquisa do OITE (60% deram nota máxima). Os flashcards devem **apontar para a questão**, e não substituí-la.

Fontes: [SuperMemo, 20 rules](https://www.supermemo.com/en/archives1990-2015/articles/20rules), [Minimum information principle](https://supermemo.guru/wiki/Minimum_information_principle), [Orthobullets OITE 90-day plan](https://www.orthobullets.com/products/12771/oite-90-day-study-plan), [OITE resources (UTMB)](https://researchexperts.utmb.edu/en/publications/orthopaedic-in-training-examination-resources-and-residency-train/).

## Regras da casa

1. **Uma ideia por flashcard.** Se a resposta tem mais de 3 itens, divida em vários flashcards.
2. **A frente pergunta, o verso responde em uma linha.** Abaixo vem uma explicação curta (até cerca de 3 linhas), com os termos-chave em negrito.
3. **A lacuna esconde o termo que a prova cobra,** não uma palavra qualquer. Bons alvos: epônimo, número de corte, estrutura em risco, conduta.
4. **Número sozinho não vira flashcard.** Ele vem com o contexto ("Denis zona III: déficit em até ___", e não "60%?").
5. **Sem "todas as alternativas", sem negação dupla, sem pegadinha.** O flashcard ensina; quem testa é a questão.
6. **Fonte sempre:** o id da questão e, quando houver figura, a legenda de origem.
7. **Divergência:** se o comentário diverge do gabarito oficial, o flashcard segue o comentário e marca `alerta`.
8. **Linguagem:** português claro, sem travessão nem meia-risca (o validador do acervo também barra).

## Tipos de flashcard

| Tipo | Frente | Verso | De onde sai |
|---|---|---|---|
| **Na prova** (lacuna) | a frase "Na prova" com o termo em negrito apagado | a frase inteira e a explicação | a linha `> **Na prova:**` de cada comentário |
| **Tabela** | uma linha da tabela, com uma célula apagada | a linha completa | tabelas markdown dos comentários (classificações, frequências, critérios) |
| **Classificação** | "FFP III de ROMMENS?" | "Posterior unilateral desviada" e os outros tipos | comentários com classificação |
| **Par confundível** | duas coisas que a prova troca, com uma delas dada | a outra e a diferença | alternativas incorretas que são "o vizinho" da certa (Destot e Grey Turner) |
| **Armadilha** | um mito ou sinal abandonado em forma de pergunta | "Não" e o porquê | análises de alternativas incorretas ("sinal antigo e não confiável") |
| **Imagem** | a figura real da questão e a pergunta | o nome do achado e o significado | questões com imagem |
| **Anatomia** | a figura com a seta: "Que estrutura é esta?" | o nome; origem, inserção, inervação ou relação, conforme a questão | OrtoQuestões Simulados de anatomia (quadril, mão, ombro, pé) |
| **Duelo** (só na Batalha) | a pergunta | 2 a 4 alternativas, com correção automática | o próprio flashcard, com as alternativas da questão de origem como opções |

Exemplos reais (todos estão no protótipo):

- **Imagem** (`trauma-1519`): figura do esporão. "O achado da seta, na oblíqua obturatriz, é patognomônico de qual fratura?" → **Fratura de ambas as colunas**.
- **Tabela** (`trauma-1499`): "Denis zona III: déficit neurológico em até ___" → **60%**.
- **Na prova** (`trauma-1526`): "Arcos de teto de VRAHAS: medial > __, anterior > __, posterior > __ graus" → **45, 25 e 70**.
- **Par confundível** (`trauma-1493`): "Hematoma no períneo é DESTOT. E a equimose no flanco?" → **Grey Turner**.
- **Armadilha** (`trauma-1491`): "Próstata alta ainda indica lesão uretral?" → **Não; uretrografia retrógrada**.
- **Anatomia** (`quadril-0668`): figura do Netter com a seta → **Ligamento sacroespinal**.

## Raridade e dificuldade

- **Raridade = incidência do assunto na prova:**

  | Prioridade do assunto | Raridade | Borda |
  |---|---|---|
  | máxima | Lendária | dourada |
  | alta | Épica | roxa |
  | média | Rara | azul |
  | baixa | Comum | cinza |

  A fonte é a mesma ordem da página Temas que mais caem.
- **Dificuldade (fácil, moderada, difícil):**
  - começa pelo índice de acerto da questão de origem ("como a turma respondeu");
  - depois passa a usar o índice de acerto do próprio flashcard, quando houver respostas suficientes.

## Quando NÃO fazer flashcard

- A questão depende de raciocínio clínico longo (caso com várias etapas). O flashcard aponta para a questão.
- A informação é número de série isolada, sem uso para a prova (por exemplo, "n = 57 pacientes").
- A linha "Na prova" é longa demais para uma lacuna limpa. Divida em dois flashcards ou marque para revisão manual.
