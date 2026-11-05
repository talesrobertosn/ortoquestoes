# Metas comerciais e inteligência financeira (05/11/2026)

## Onde fica
Painel › Financeiro › **Metas** (`src/admin/modulos/Metas.tsx`). Faixas resumidas em Início, Crescimento e Financeiro (`metasResumo.tsx`).

## Cenário oficial
`META_MODERADA` em `src/admin/dados/metas.ts`, versão `moderado-2026-11`, registrada em 05/11/2026: 12 meses
(nov/2026 a out/2027), faturamento somado de R$ 36.403. **Esta versão nunca muda.** O SQL grava a mesma tabela em
`metas_comerciais` (versão `moderado-2026-11`, com `on conflict do nothing`).

Edições do administrador vão para a camada `vigente`, **só para meses futuros** (`salvar_meta_comercial_admin` recusa o
mês atual e os passados). A tela mostra sempre a original ao lado da vigente.

## Como cada número é calculado
- **Realizado**: cadastros do mês (contas reais, sem administrador, teste ou fora do público-alvo); novos pagantes = primeira
  compra paga no mês; ativos no fim = pessoas com período pago cobrindo o último instante do mês (períodos encadeados);
  receita equivalente = soma do preço mensal equivalente de cada ativo (semestral ÷ 6, anual ÷ 12); faturamento = dinheiro
  recebido no mês menos reembolsos.
- **Projeção do fechamento**: recebido até agora + renovações de cartão previstas até o fim do mês + vencimentos Pix × taxa
  de renovação Pix observada + compras novas esperadas × ticket médio das primeiras compras. As compras novas e os cadastros
  seguem uma taxa diária (Poisson) com **intervalo de 90%**. Nos primeiros 14 dias a taxa observada é misturada com a da meta
  (peso = dias passados ÷ 14), para não extrapolar 3 dias bons. Com menos de 7 dias ou 5 eventos, a tela avisa "amostra pequena".
- **Situação**: projeção ≥ 100% da meta → acima; ≥ 90% → próximo; abaixo disso → abaixo.
- **Ritmo semanal**: semanas 1–7, 8–14, 15–21, 22–fim; quanto falta por semana para fechar a meta.
- **Tipos de receita**: recebido, competência, equivalente mensal, recorrente automática (cartão), primeiras compras,
  renovações, voltas (quem já tinha pago, parou e voltou), por plano e por meio.

## Auditoria de pagamentos
Financeiro › Avisos do Mercado Pago: decisões (conciliado, ignorado com nota, reaberto) gravadas em
`decisoes_eventos_pagamento`, com histórico. A auditoria (`auditoria_pagamentos_admin`) lista: Pix aprovado sem acesso,
cartão renovando duas vezes, assinatura ativa sem cobrança e `consulta_mercado_pago_falhou` sem decisão. Nada é corrigido
sozinho.

## Público-alvo e duplicadas
`contas_fora_publico` tira a conta dos números de crescimento e conversão sem apagar nada; dá para voltar. O relatório de
duplicadas só lista (nome e sobrenome, Gmail normalizado). **Nunca funde contas.**

## Risco de abandono
Assinantes › "Quem pode precisar de uma mão" (`src/admin/dados/risco.ts`). Pontos padrão: 3+ dias sem estudar 1, 7+ 3,
14+ 4; semana abaixo de 60% do ritmo anterior 1, abaixo de 30% 2 (só para quem fazia 20+ por semana); nenhuma questão em
7 dias 1; vence sem renovação automática em até 7 dias 2, em até 3 dias 3. Moderado ≥ 3, alto ≥ 5. Os pesos podem ser
ajustados na tela (salvos no navegador). Não é previsão de cancelamento e **nada é enviado automaticamente**.
