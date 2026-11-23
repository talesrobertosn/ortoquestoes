# Orientação permanente para Claude (índice)

Este arquivo é lido em toda mensagem, por isso é curto de propósito (reorganizado em 23/11/2026 para gastar menos).
O texto integral e datado de todas as orientações do Tales está em
[docs/ORIENTACOES-TALES.md](docs/ORIENTACOES-TALES.md): leia só a seção do pedido em curso, nunca o arquivo inteiro
por rotina. Orientação nova vai para o documento do assunto e, se mudar o caminho, para a tabela abaixo.

## Sempre valem

- **Autonomia total** (Tales, 04 e 21/11/2026): fazer, rodar os checks, abrir o PR e juntar com o CI verde, sem
  perguntar. A revisão do Codex (`chatgpt-codex-connector`) não bloqueia. Exceções: enfeites de Natal (prints e OK
  antes) e ações irreversíveis fora do site (dados de usuários, pagamento, mensagem em nome do Tales).
- **Brainstorm interno** antes de qualquer pedido; decidir e fazer, sem devolver lista de opções (a não ser que a
  escolha mude o pedido).
- **SQL e Edge Functions**: o código inteiro na própria resposta, em passo a passo numerado, uma caixa de copiar por
  SQL (detalhes em ORIENTACOES-TALES, seção "Desenvolvimento e publicações"). Sem SQL, dizer isso.
- **GitHub Actions**: 3.000 minutos por mês; poucos PRs grandes; validar tudo local antes. Regras em
  [AGENTS.md](AGENTS.md), seção "Eficiência de desenvolvimento e GitHub Actions".
- **Português** em respostas, relatórios e mensagens de andamento.
- **Conversa longa**: fechar a tarefa em curso, atualizar o estado em `~/OrtoQuestoes-Biblioteca/CHECKPOINT-GERAL.md`
  e abrir a sessão seguinte sozinho, sem perguntar.

## Leia só o que o pedido pede

| Pedido | Ler primeiro |
|---|---|
| Comentário, miniaula, resumo ou simulado, de qualquer tema | [docs/REGRAS-CONTEUDO.md](docs/REGRAS-CONTEUDO.md) (uma página; os documentos longos só em dúvida) |
| Continuar a fila de conteúdo (mão, lotes, acabamento) | `~/OrtoQuestoes-Biblioteca/CHECKPOINT-GERAL.md` (estado curto) e `~/OrtoQuestoes-Biblioteca/ferramentas/LEIA-ME.md` (ferramentas e prompts) |
| Capítulo enviado ("faça resumo disso", "questões e resumo") | [docs/biblioteca/PILOTO-AUTOMATICO.md](docs/biblioteca/PILOTO-AUTOMATICO.md) e [docs/biblioteca/CAPITULO-RESUMO-E-QUESTOES.md](docs/biblioteca/CAPITULO-RESUMO-E-QUESTOES.md) |
| Questões ou resumos novos que pedem corrigir comentários | [docs/comentarios-resumos/FLUXO.md](docs/comentarios-resumos/FLUXO.md) |
| Provas de Cirurgia da Mão com os livros locais | [docs/mao/PROTOCOLO.md](docs/mao/PROTOCOLO.md) e [docs/mao/PROGRESSO.md](docs/mao/PROGRESSO.md) |
| Os 284 temas, refazer resumos dos ciclos 3 a 20 | [docs/biblioteca/FLUXO-MESTRE.md](docs/biblioteca/FLUXO-MESTRE.md), [docs/biblioteca/REFAZER-RESUMOS-E-COMENTARIOS.md](docs/biblioteca/REFAZER-RESUMOS-E-COMENTARIOS.md), [docs/prompts/PROMPT-MESTRE-284-TEMAS.md](docs/prompts/PROMPT-MESTRE-284-TEMAS.md) |
| Post de Instagram | [marketing/instagram/estilos/PADRAO-AULA.md](marketing/instagram/estilos/PADRAO-AULA.md), `node marketing/instagram/estilos/ordem.mjs` e a lista de estilos aprovados em ORIENTACOES-TALES, seção "Arsenal de marketing aprovado"; marca em [marketing/instagram/marca/README.md](marketing/instagram/marca/README.md) |
| Tela do site, design | [DESIGN.md](DESIGN.md), [PRODUCT.md](PRODUCT.md), [docs/design/WORKFLOW.md](docs/design/WORKFLOW.md), [docs/design/FERRAMENTAS.md](docs/design/FERRAMENTAS.md) e ORIENTACOES-TALES, seção "Telas do site" (padrão: a página de Desempenho refeita) |
| Arte, cenário, mascote | skill `arte-hd2d` e [docs/design/DIRECAO-ARTISTICA.md](docs/design/DIRECAO-ARTISTICA.md) |
| E-mail automático, suporte, mensagem em nome do Tales | ORIENTACOES-TALES, seção "Tom dos e-mails" (gentil, fofo e formal; o cliente sempre tem razão) |
| Conquistas e avisos | [docs/conquistas/AVISOS.md](docs/conquistas/AVISOS.md) |
| Publicar, commits, Actions | [AGENTS.md](AGENTS.md), seção "Eficiência de desenvolvimento e GitHub Actions"; [docs/OPERACAO-ACTIONS.md](docs/OPERACAO-ACTIONS.md) |
| Qualquer outra coisa | ORIENTACOES-TALES pelo índice de seções; AGENTS.md pela seção do assunto |
