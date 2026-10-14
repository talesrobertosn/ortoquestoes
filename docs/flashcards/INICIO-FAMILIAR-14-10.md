# Início mais familiar — 14/10/2026

Tales pediu diminuir a frustração na abertura da partida. A seleção agora prioriza flashcards derivados de questões cuja última resposta pessoal foi correta. A autoavaliação do flashcard não substitui esse histórico de questões.

Ordem para novas partidas: **acertadas por você → maior acerto da turma → erradas por você → novas → mistura**. São até oito flashcards por grupo, sorteados dentro do grupo, sem repetir no lote. Se existem menos de oito questões acertadas elegíveis, usa todas as disponíveis e avança. Se o usuário ainda não tem acertos no acervo elegível, começa pela turma; sem estatísticas confiáveis, pula esse grupo também. Filtros de área/imagem continuam valendo.

A troca está em `motor/selecao.ts`. O motor já compra os flashcards na ordem entregue e foi conferido: não embaralha novamente a abertura. As próximas reposições mantêm a rodada, sem reiniciar os grupos. Partidas salvas não são reordenadas. Não altera conteúdo médico, respostas existentes, dano, vida, dificuldade da questão, ranking, planos ou limites. Não há SQL.

## Validação

- `npx tsc -b`, `npm test`, build.
- Fixture de progressão: oito acertadas antes da turma, grupos curtos, primeira visita sem histórico, amostra mínima da turma, seed reproduzível, exclusão na reposição, filtro de área e histórico intacto. Teste de integração com `criarMotor` confirma os primeiros oito comprados na mesma ordem.
- `scripts/flashcards/testar_inicio_familiar.mjs`, 1400×860, 390×844 e 844×390: histórico sintético somente na memória de uma aba visitante, sem Supabase. Primeiro flashcard e sete seguintes da partida real vieram de questões marcadas como acertadas; os registros continuaram com uma tentativa e não houve erros JavaScript.
- Capturas em `capturas/inicio-familiar-14-10/`; ilustram o jogo com histórico de teste, sem dados de uma conta real.

## Continuidade

Esta regra substitui a ordem de 13/10 em Jornada única e Decisões. Não voltar ao grupo da turma antes do pessoal. As paisagens #261 foram mescladas em `99f4f982`; conferir o deploy `38654687687`. O bloco do início familiar precisa de PR e publicação próprios.
