# Expansão dos flashcards e ligação com os resumos (27/10/2026)

## Prioridade: o que escrever primeiro

`python3 scripts/flashcards/prioridade.py` recalcula a fila e grava `scripts/flashcards/prioridade.json`.
A conta usa só dados do repositório:

- **n**: quantas questões de prova o assunto tem em `src/dados/incidencia.json` (os "Temas que mais caem").
- **cartas**: flashcards já publicados no assunto.
- **alvo** = o maior entre 10 e 3 × n; **déficit** = quanto falta para o alvo, de 0 a 1.
- **lacuna** = parte das questões comentadas do assunto que ainda não tem nenhum flashcard.
- **pontos** = n × (0,2 + 0,55 × déficit + 0,25 × lacuna), com peso 0,6 para os assuntos "Outros…".

Assunto com lote feito aparece com "(lote feito)" e continua na fila, porque o alvo pode ainda não ter sido atingido.

## Escrever um lote

1. `python3 scripts/flashcards/lacunas.py <área> "<assunto>"` mostra os flashcards que já existem no assunto e as
   questões comentadas sem flashcard (enunciado, alternativas, alerta, conceito, correta).
2. O lote vai em `scripts/flashcards/lotes/AAAA-MM-DD-<tema>-<n>.json`, no formato
   `{"temas": [{"area", "assunto"}], "flashcards": [...]}`. Cada flashcard tem `questao`, `assunto` (um subtema da
   questão), `tipo`, `frente`, `resposta`, `explicacao`, `trecho` copiado literalmente do comentário e, quando o
   comentário tiver, o mesmo `alerta`. Nada de inventar questão, gabarito ou referência: tudo sai do comentário.
3. `python3 scripts/flashcards/autorais.py incluir <lote> --conferir` confere sem gravar.
4. `python3 scripts/flashcards/autorais.py incluir <lote>` grava em `scripts/flashcards/autorais/`, publica em
   `public/flashcards/` e anota o lote em `scripts/flashcards/expansao.json` (novos, repetidos evitados, reprovados).

## Sem repetidos, sem mexer no que existe

Antes de validar, cada flashcard novo é comparado com **todos** os publicados (fábrica e autorais, todas as áreas).
É repetido quando a frente normalizada é igual, ou quando a resposta é a mesma e as palavras de conteúdo da frente
se sobrepõem (Jaccard 0,4; 0,55 para respostas de até 4 letras), ou quando a sobreposição passa de 0,7 e a resposta
já está no flashcard antigo. O repetido é pulado e contado; nenhum flashcard existente é apagado ou renumerado.
Os ids novos seguem `fc-<questão>-<tipo><n>` com o próximo número livre, então rodar o mesmo lote de novo não cria
nada (teste: `fixtures/testar_expansao_flashcards.py`, no `npm test`).

## Resumo ↔ flashcards ↔ questão

A ligação é pelo nome exato do assunto da taxonomia (`subtemas` do resumo, `assunto` do flashcard), em
`src/biblioteca/ligacoes.ts`. Nunca por palavras parecidas.

- **Resumo → flashcards:** no leitor, "Estudar flashcards deste tema" (capa e fim do resumo) aparece só se algum
  subtema do resumo tem flashcard publicado. Abre `#/flashcards/biblioteca?categoria=todos&n=20&area=…&assunto=…&tema=…`:
  a sessão sai na hora, só com o recorte, e a Biblioteca guarda o recorte para a volta.
- **Flashcards → resumo:** com um assunto ou grupo escolhido no filtro da Biblioteca, aparece
  "Consultar resumo: <título>" (até dois), só para resumos publicados que ensinam aqueles assuntos, do que ensina
  mais deles para o que ensina menos; no empate, o da mesma área.
- **Questão → flashcards:** embaixo do convite do resumo no fim da questão, "Revisar em flashcards".

Testes: `fixtures/testar_ligacoes_resumos.mjs` (no `npm test`) e `fixtures/e2e_ligacoes_resumos.mjs` (navegador,
computador e celular).
