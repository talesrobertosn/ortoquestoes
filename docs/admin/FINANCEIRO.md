# Receita › Financeiro: revisão de 15/10/2026

Pedido do Tales: "Pega todas as ideias da página Financeiro e organiza melhor. Os nomes das
assinaturas, de pagamentos, mais organizado; revisa por completo." Nenhum preço, plano, limite,
dado ou regra de pagamento mudou. As contas são as mesmas: o cálculo saiu de dentro da tela para
`src/componentes/admin/financeiro.ts` (sem alterar fórmula) para a exportação usar exatamente os
mesmos números.

## Onde fica cada coisa agora

Receita tem quatro partes:

| Parte | Endereço | O que mostra |
| --- | --- | --- |
| Financeiro | `?aba=financeiro` | Resumo do mês, previsão, histórico, base de assinantes, mês a mês e ações sensíveis |
| Assinaturas | `?aba=assinaturas` | Uma assinatura por cartão, com situação padronizada, filtros (situação, plano, meio, período) e busca |
| Pagamentos | `?aba=cobrancas` | O dinheiro que entrou, em lista cronológica: data, pessoa, plano, meio, valor, situação, com totais |
| Avisos de pagamento | `?aba=pagamentos` | Os avisos que o processador manda ao site (antes "Pagamentos"); o endereço antigo continua por causa dos e-mails de alerta |

`?aba=avisos` também abre os avisos. Todos os nomes vêm de `src/componentes/admin/rotulos.ts`
(um lugar só; `formatos.ts` reexporta para quem já importava de lá).

## Inventário antes → depois

| Antes (Financeiro e vizinhos) | Depois |
| --- | --- |
| Texto longo de método no topo | Recolhido em "Como estes números são calculados", no fim do resumo |
| "Neste mês" com variação em %, perdido no meio de "O que já entrou" | Resumo do mês no topo: receita do mês com ▲/▼ sobre o mês anterior |
| "Receita recorrente no cartão" como herói | No resumo como "Receita recorrente por mês"; o herói da previsão continua |
| "Com acesso pago" só em "Assinantes agora" | No resumo ("Assinantes com acesso") e também na base de assinantes |
| "Assinaturas novas no mês" e "Cancelamentos no mês" em "Movimento", sem comparação clara | No resumo, cada um com a comparação ao mês anterior (cancelamento subindo fica vermelho) |
| "Pix que terminam em 30 dias" | "Pix que vencem em 30 dias", no resumo, com o valor estimado da recompra |
| Sem lista de pagamentos; só o CSV "Exportar cobranças" | "Últimas cobranças" (5) no resumo + parte nova **Pagamentos** (lista completa, filtros, totais, reembolsados riscados e fora do total, link para a ficha e para o processador) |
| Previsão: herói, 4 horizontes, simulador do Pix e gráfico, tudo junto | Seção "Previsão · O que vai entrar", na mesma ordem, com títulos próprios |
| "O que já entrou": total, neste mês, média, ticket (+ por pagante na mesma caixa) | "Histórico · O que já entrou": total, média, ticket, por pagante (caixas separadas) + gráfico por mês, por meio e por plano |
| "Assinantes agora" | "Agora · Base de assinantes" (mesmos números; "cartão sem renovar" virou "cancelado(s) com acesso") |
| "Movimento" com novas/renovações/cancelamentos/cancelamento acumulado | "Movimento · Mês a mês": renovações, reembolsos e Pix encerrados do mês + cancelamento acumulado + tabela de 12 meses |
| Ações espalhadas: reprocessar em Pagamentos, cortesia na ficha, reembolso só no processador | Seção "Ações sensíveis" no fim, com as três ações reunidas e atalhos; cada uma confirma onde acontece (conceder e remover cortesia ganharam confirmação) |
| Aviso "cole a parte 23" dentro do Financeiro, que buscava as cobranças sozinho | A consulta `cobrancas_admin` agora é do painel (cache compartilhado entre Financeiro e Pagamentos); o aviso aparece nas duas |

## Nomes padronizados

Planos: **Mensal**, **Semestral**, **Anual**. Meios: **Pix**, **Cartão**.

Situação da assinatura (`situacaoAssinatura`, mesmas regras de acesso de `receita.ts`):

| Situação | Quando |
| --- | --- |
| Ativa | Cartão que renova sozinho, ou Pix dentro do período pago |
| Cancelada (acesso até dd/mm) | Renovação desligada, período pago ainda valendo |
| Cancelada | Renovação desligada e período acabado |
| Expirada | Pix que terminou, ou assinatura vencida (antes "Vencida") |
| Aguardando renovação | Cartão ativo com o período vencido e a cobrança nova ainda não chegou |
| Pendente | Aguardando o primeiro pagamento (antes "Aguardando pagamento") |
| Falha no pagamento, Reembolsada, Pausada | Como o banco grava |
| Cortesia | Acesso liberado pelo administrador, sem pagamento; só aparece na ficha (não há consulta que liste as cortesias) |

Antes, "Ativa" aparecia como "Em dia" e a lista mostrava o status cru do banco (um Pix pago e já
encerrado aparecia "Em dia"). Pagamentos: **Paga**, **Estimada** (renovação antiga reconstruída
ou paga sem o registro), **Reembolsada**. Tipo: **Compra no Pix**, **Assinatura nova**,
**Renovação automática**.

## Correções registradas

- **Data no cartão da assinatura** (apresentação, não conta): uma assinatura com falha no
  pagamento ou vencida aparecia com "Próxima cobrança". Agora `proximaData` mostra "Próxima
  cobrança", "Acesso até", "Acesso terminou em" ou "Reembolsada em" conforme a situação.
  Teste: `fixtures/testar_rotulos_financeiro.mjs`.
- Nenhum erro de cálculo encontrado nos totais, previsão e mês a mês; os testes
  `testar_receita.mjs` e `testar_previsao_pix.mjs` continuam passando sem mudança.

## Também nesta revisão

- Hoje: faixa "Estudo de hoje" (estudaram, fizeram questões, questões respondidas e flashcards,
  no dia de São Paulo, com comparação a ontem), de `serie_diaria_admin` e `sinais_usuarios_admin`.
- Pessoas: cartões de tamanho fixo (linhas únicas com reticências) e cores por grupo
  (assinante verde-claro, não assinante branco, viu os planos em 30 dias amarelo-claro,
  administrador azul-claro pelo papel da conta), com legenda; "Ao vivo" com altura fixa.
- Botão "Exportar dados do painel": Markdown, JSON e CSV das pessoas, com "Ocultar e-mails"
  marcado por padrão e "Pseudonimizar nomes"; cada seção falha sozinha
  (`src/componentes/admin/exportacao.ts`, teste `fixtures/testar_exportacao_painel.mjs`).
- Nenhuma RPC ou SQL novo.
