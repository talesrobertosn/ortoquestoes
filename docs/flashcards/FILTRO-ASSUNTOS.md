# Estudar por assunto na Biblioteca de flashcards (27/10/2026)

Pedido do Tales: estudar desde uma área inteira até uma patologia ou fratura específica, com poucos
cliques, e uma sessão só com os flashcards daquele recorte.

## Como funciona

Na Biblioteca (`#/flashcards/biblioteca`), o painel **Estudar por assunto** navega em até três níveis:

1. **Área**: o tema do acervo (`areaId` do flashcard), por exemplo Ortopedia pediátrica.
2. **Grupo**: um agrupamento dos assuntos da área, por exemplo "Fraturas e trauma na criança".
3. **Assunto**: o subtema da taxonomia (`src/dados/taxonomia.json`) que o flashcard herdou da questão de
   origem (`assunto` e, quando a questão tinha mais de um, `subtemas`). Dá para marcar mais de um.

- A área com um grupo só (Osteometabólicas) pula o nível do grupo.
- A busca (sem acento) acha área, grupo ou assunto pelo nome.
- As quantidades são reais, já com os filtros de tipo, dificuldade e "só novos".
- Os filtros ativos viram chips removíveis, e "Limpar filtros" desfaz tudo.
- O recorte vale para toda a Biblioteca: revisões pendentes, erros, hesitei e nunca estudados contam e
  abrem só dentro dele.
- O botão **Estudar N** usa a mesma fila de sempre (erros e revisões primeiro), no tamanho escolhido
  (10, 20, 30 ou pendentes).
- O recorte fica salvo na conta (`flashcards:filtro-assunto`) e volta ao sair de uma sessão ou
  reabrir a Biblioteca.
- Link direto: `#/flashcards/biblioteca?area=pediatria&grupo=fraturas&assunto=Lesões%20fisárias`. Sem
  `categoria`, o link só escolhe o recorte; com `categoria`, abre a sessão como antes, sem misturar com o
  recorte salvo.

## Os grupos

`src/dados/gruposAssuntos.ts`. Não é uma classificação clínica nova: cada grupo junta, por nome exato,
assuntos que já existem na taxonomia, e o flashcard entra no grupo do assunto que já tem. Nada é deduzido
do texto do flashcard.

- Assunto fora da tabela (nome novo ou de outra área) cai em "Outros assuntos" da própria área, e nenhum
  flashcard some.
- O teste `fixtures/testar_filtro_flashcards.mjs` (no `npm test`) confere quatro coisas:
  - a tabela cobre a taxonomia inteira, cada assunto em exatamente um grupo;
  - nenhum dos flashcards se perde;
  - as contagens da árvore batem com o filtro;
  - o recorte é exclusivo.
- Assunto novo na taxonomia: inclua-o num grupo de `gruposAssuntos.ts`, senão o teste falha.

## O que não muda

- A revisão espaçada e os registros (`flashcards:registros`).
- O histórico, as estatísticas, o ranking e o Torneio (a Batalha não usa este filtro).
- O cronograma, que tem as próprias sessões e cujo cartão some enquanto há um recorte, para não confundir.
- Os dados: é um filtro no navegador sobre `public/flashcards/*.json`, sem tabela nem migração no Supabase.

## Limites dos dados

A taxonomia real tem dois níveis (área e assunto). Não há um quarto nível ("subassunto", como diafisária
ou distal dentro de fêmur): quando o assunto junta mais de um osso ou segmento, por exemplo "Fraturas do
fêmur e da perna na criança", o recorte mais fino possível é esse assunto. Alguns assuntos da taxonomia
ainda não têm flashcard; eles aparecem com 0 e uma mensagem.

Testes: `node fixtures/testar_filtro_flashcards.mjs` e `node fixtures/e2e_filtro_flashcards.mjs`
(computador e celular; `FOTOS=pasta` guarda as telas).
