# Ranking da Cripta (pronto, desligado)

Pedido do Tales (13/10/2026): tudo na mesma página. Em cima, **quem foi mais fundo na Cripta**;
embaixo, **quantos flashcards únicos** cada um já fez (repetição não conta). A **Torre do Título**
tem o ranking dela, separado, na outra aba.

## Peças

| Peça | Onde |
|---|---|
| Página | `src/flashcards/componentes/RankingCripta.tsx` (rota `#/flashcards/ranking`) |
| Chamadas | `src/flashcards/servidor.ts`: `iniciarCorrida`, `vincularFlashcard`, `registrarAndar`, `lerRanking` |
| Banco | `supabase/migrations/202610130200_flashcards_ranking.sql` (não destrutiva) |
| Recordes locais | `flashcards:recordes` (`andarMaximo` da Cripta, `torreMaximo` e `torreConcluida` da Torre) |

## Como o servidor valida (o cliente nunca decide o recorde)

1. Cada partida abre uma **corrida** (`iniciar_corrida_flashcards`).
2. Cada flashcard autorizado pelo limite diário é ligado à corrida (`vincular_flashcard_corrida`).
3. `registrar_andar_flashcards` só aceita o andar se a corrida tiver **2 flashcards autorizados por
   andar vencido** (ninguém vence um adversário com menos), nunca anda para trás e a Torre para em 100.
4. `ranking_flashcards('masmorra' | 'torre' | 'unicos')` devolve os 50 primeiros com o apelido
   público e respeita quem saiu do ranking (mesmas regras do ranking geral).

## Para ligar

1. Aplicar `202610130100_flashcards_limite_e_progresso.sql` e `202610130200_flashcards_ranking.sql`.
2. Build com `VITE_LIMITES_HABILITADOS=true`, `VITE_FLASHCARDS_LIMITE=true` e `VITE_FLASHCARDS_RANKING=1`.
3. O botão "Ranking" aparece na Entrada. Antes disso, a página mostra só os recordes do aparelho.

Pendências conhecidas: a validação é por contagem (bom contra edição de recorde, não contra quem
responde de verdade com ajuda externa); um ranking semanal precisaria de período na função.

## Emblemas e números (15/10/2026)

- As linhas e o pódio mostram o melhor emblema de Flashcards da pessoa e a vitrine
  (`ranking_flashcards_emblemas`, parte 26 do SQL).
- Posição, andar e pontos usam a fonte de texto com algarismos tabulares: na fonte pixel o 6 parecia 2
  e o 2 parecia 8. O clima do jogo fica nos títulos.
