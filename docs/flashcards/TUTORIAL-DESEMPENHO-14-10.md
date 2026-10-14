# Tutorial e medição de desempenho — 14/10/2026

## Tutorial (ideia 63)

O Preceptor convida para uma demonstração curta após a escolha inicial de som. Pode pular, fechar por Escape e reabrir em **Como jogar**. As etapas são lembrar, conferir o verso e avaliar a confiança. Os cartões são instruções de interface, não questões médicas. O componente não importa acervo, motor, revisão, servidor nem ranking; não consome flashcards nem cria partida.

Ao concluir ou pular, salva apenas `tutorialVisto` nos Ajustes existentes, por ação explícita da pessoa. Mantém os outros campos. Isso segue o armazenamento existente: visitantes conservam a preferência na sessão; contas seguem a política já implementada. Não há migração SQL nem alteração em limites.

O foco acompanha cada etapa, fica no diálogo e retorna ao botão Como jogar. Arte: ícone e moldura existentes, sem imagem externa ou gerada.

## Desempenho (ideia 70, parcial)

O comando `node scripts/flashcards/medir_desempenho.mjs` usa exclusivamente localhost com o jogo em modo de desenvolvimento. Execute com `VITE_SUPABASE_URL=sem npx vite --port 5199`. Requer Chromium (`CHROMIUM_BIN` pode apontar para o executável). Bloqueia requisições Supabase no navegador e usa o gancho de teste do jogo.

Mede quatro segundos com um golpe crítico de golem, viewport 390×844 e CPU 4×. São amostras de requestAnimationFrame e tarefas longas no Chromium headless. **Não é um celular físico, nem mede tempo de GPU de cada quadro.**

Nesta execução, ambos os perfis tiveram mediana 59,9 FPS; P95 de intervalo de quadro: 33,3 ms com efeitos completos e 16,8 ms com movimento reduzido. Maior tarefa longa: 75 e 84 ms. O JSON completo está em `capturas/tutorial-14-10/benchmark.json`. A meta de 50 FPS em aparelho físico permanece por verificar; a caixa 70 está `[~]`.

## Validação e continuidade

- `npx tsc -b`, `npm test`, build.
- `node scripts/flashcards/testar_tutorial.mjs`: três tamanhos, erro/acerto, verso, avaliação, foco, pular, reabrir, nenhuma instância do motor de batalha e nenhuma largura excedente.
- Capturas: `capturas/tutorial-14-10/`.
- Releitura dos prints antigos: o código publicado já tem capa chibi e formulário **O que podemos melhorar?**, com espaçamento e grupos redesenhados. Opiniões vão para o painel administrativo pela RPC existente; nenhum envio de opinião de teste foi feito.
- Base atualizada até #254 (volume e reinício); nenhuma dessas mudanças foi desfeita.

Próxima fila permanece em PENDENCIAS-14-10.md: Biblioteca decorativa/música, cenários e personalização sem vantagem. Monstros novos continuam em pausa, e conteúdo médico/planos/dados existentes ficam fora do trabalho.
