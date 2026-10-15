# Conquistas dos Flashcards (ligadas ao site em 15/10/2026)

Os emblemas de Flashcards agora fazem parte do sistema de emblemas do site (famílias `fc…` em
`src/estado/conquistas.ts`, ids `fc-…`), aparecem no inventário (`#/conquistas`), podem ir para a
vitrine e aparecem no ranking geral e no ranking de Flashcards.

Regras, níveis, fontes de dados e arte: [docs/emblemas.md](../emblemas.md), seção "Feitos em 15/10/2026".

- Métricas: `src/flashcards/conquistas.ts` (`metricasFlashcards`).
- Leitura no site: `src/flashcards/emblemas.ts` (`usarMetricasFlashcards`), chamada por `usarConquistas`.
- Andar validado pelo servidor: RPC `meus_recordes_flashcards` (parte 25 do SQL).
- Emblemas no ranking de Flashcards: RPC `ranking_flashcards_emblemas` (parte 25), com volta automática
  para `ranking_flashcards` enquanto o SQL não estiver aplicado.
