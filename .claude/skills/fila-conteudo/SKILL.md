---
name: fila-conteudo
description: Fluxo enxuto da fila de conteúdo do Orto Questões (miniaulas, resumos, simulados, figuras, lotes da Cirurgia da Mão, acabamento, pendências do REVISAR-TALES). Use sempre que o pedido for continuar a fila, fazer ou publicar um lote, escrever ou corrigir comentários e resumos, ou retomar o trabalho numa conversa nova.
---

# Fila de conteúdo: o caminho curto

Criada em 23/11/2026 para entregar o mesmo padrão gastando menos: leia só estas três páginas, nada mais por rotina.

1. `~/OrtoQuestoes-Biblioteca/CHECKPOINT-GERAL.md`: onde parei e o próximo passo (curto).
2. `~/oq-pub/docs/REGRAS-CONTEUDO.md`: todas as regras de escrita numa página (explicar para um R1, fontes,
   figuras, o que nunca fazer, exemplos aprovados).
3. `~/OrtoQuestoes-Biblioteca/ferramentas/LEIA-ME.md`: qual prompt de agente para cada trabalho, qual modelo,
   e os scripts.

## Como trabalhar

- **A conversa principal orquestra.** Leitura de livro, mapeamento e escrita vão para agentes em segundo plano
  (até 5), com o prompt do LEIA-ME e o modelo da tabela (Opus médio escreve; Sonnet mapeia; Haiku confere). Cada
  agente roda `checar_estilo.py` no próprio arquivo e entrega com 0 erro; o orquestrador não relê o texto inteiro,
  só a saída curta do agente e da conferência (e uma amostra quando o padrão é novo).
- **Um comando por lote**: `bash ~/OrtoQuestoes-Biblioteca/ferramentas/bin/lote.sh NNN "Título" corpo.md <k...>`
  em segundo plano. Vários lotes num PR só com `CONT=1` (Actions caro). Publicar sempre de `~/oq-pub`, nunca de
  `~/ortoquestoes`.
- **Saídas curtas**: redirecionar logs para arquivo e mostrar só o `tail`; nunca imprimir JSON ou resumo inteiro no
  chat. Para contar ou procurar no acervo, um script de poucas linhas que imprime só o número.
- **A cada lote publicado**: print PNG de uma questão com figura (amostra_html.py e Chrome sem janela) e relatório
  curto em português com % feito e % falta; reescrever "Onde parei" e "Próximo" no CHECKPOINT-GERAL.md.
- **Decidir sozinho** (gabarito, imagem, fonte, modelo) e registrar como RESOLVIDO em
  `~/OrtoQuestoes-Biblioteca/REVISAR-TALES.md`.
- **Conversa longa**: fechar a tarefa em curso, atualizar o CHECKPOINT e abrir a sessão seguinte sozinho com
  `~/OrtoQuestoes-Biblioteca/PROMPT-NOVA-CONVERSA.md`.

## Quando abrir os documentos longos

Só para uma dúvida que as três páginas não resolvem: `docs/padrao-editorial-comentarios.md` (histórico do padrão),
`docs/mao/PROTOCOLO.md` (provas da mão), `docs/biblioteca/FLUXO-MESTRE.md` (ciclo dos temas),
`~/OrtoQuestoes-Biblioteca/arquivo/2026-11-23/` (checkpoint e pendências antigos). Leia a seção, não o arquivo.
