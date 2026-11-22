# Metas comerciais e inteligência financeira (05/11/2026)

## Onde fica
Painel › Financeiro › **Metas** (`src/admin/modulos/Metas.tsx`). Faixas resumidas em Início, Crescimento e Financeiro (`metasResumo.tsx`).

## Plano oficial (desde 22/11/2026): o ciclo do TEOT
`META_OFICIAL = PLANO_2026_11_22` (`plano-2026-11-22`), de novembro de 2026 a janeiro de 2028. Pedido do Tales: o TEOT é em
10/01 (depois dele os R3 param de assinar) e os R1 entram em 01/03 (mas na loucura do começo nem todos assinam).
O modelo de `src/admin/dados/projecao.ts` ganhou campos opcionais do ano da residência (`PARAMETROS_PLANO`):

- Público de cerca de 3.000 residentes e turma nova de ~1.000 R1 em março.
- Retenção do Pix mensal medida em 22/11: 10 de 15 Pix de outubro pagaram de novo (67%; o plano usa 68%).
- Metade dos mensais é R3 (24 de 47 em novembro). No mês da prova 80% deles não renovam; em fevereiro, 80% dos que
  sobraram; quem fica passa a contar como os outros (R4, fellowship, título).
- Em março, 35% dos outros mensais viram R3 (os R2 de hoje, a turma do TEOT 2028).
- Vontade de assinar por mês do ano (`sazonalCompra`): 0,5 em janeiro, 0,55 em fevereiro, subindo de março até 1,1 em
  novembro. Cadastros também têm estação (`sazonalCadastros`). Perto da prova (dez e jan), o R3 só compra o mensal.
- Conversão 32%, mix 75/5/20, cartão 90% continuando, 50% dos semestrais e anuais renovando.

Resultado: 97 pagantes em dez/26, o vale de 73 em jan/27, 249 em dez/27 (≈ 8% dos residentes) e 196 em jan/28;
R$ 82 mil recebidos em 2027. **Novembro de 2026 mantém a meta do plano de 11/11**: o mês em andamento não troca de alvo.
A página mostra também o **piso** e a **ousada** (`CENARIOS_PLANO`: marketing, conversão e renovação do Pix piores ou
melhores) e os **marcos do ano da residência** (`MARCOS_RESIDENCIA`). O simulador ganhou os controles "R3 entre os
mensais" e "R3 que saem depois da prova", e o gráfico de pagantes separa os mensais R3.

O plano de 11/11 (`PLANO_2026_11`, parâmetros em `PARAMETROS_PLANO_11_11`) fica guardado para comparação: ele supunha
crescimento contínuo, sem a prova (157 pagantes em jan/27 e 351 em out/27).

## Cenário moderado (05/11/2026, guardado)
`META_MODERADA` em `src/admin/dados/metas.ts`, versão `moderado-2026-11`, registrada em 05/11/2026: 12 meses
(nov/2026 a out/2027), faturamento somado de R$ 36.403. **Esta versão nunca muda.** O SQL grava a mesma tabela em
`metas_comerciais` (versão `moderado-2026-11`, com `on conflict do nothing`).

Edições do administrador vão para a camada `vigente`, **só para meses futuros** (`salvar_meta_comercial_admin` recusa o
mês atual e os passados). A tela mostra sempre a original ao lado da vigente.

## Como cada número é calculado
- **Realizado**: cadastros do mês (contas reais, sem administrador, teste ou fora do público-alvo); novos pagantes = primeira
  compra paga no mês; ativos no fim = pessoas com período pago cobrindo o último instante do mês (períodos encadeados);
  receita equivalente = soma do preço mensal equivalente de cada ativo (semestral ÷ 6, anual ÷ 12); faturamento = cobranças pagas não devolvidas atribuídas ao mês da compra; devoluções são mostradas à parte pelo valor registrado e mês do reembolso. Não representa o fluxo líquido bancário do mês.
- **Projeção do fechamento**: recebido até agora + renovações de cartão previstas até o fim do mês + vencimentos Pix × taxa
  de renovação Pix observada + compras novas esperadas × ticket médio das primeiras compras. As compras novas e os cadastros
  seguem o ritmo diário observado com uma faixa aproximada de sensibilidade (Poisson para contagens). A meta nunca entra na previsão. A faixa financeira combina cenários de recompra e compras novas, sem alegar cobertura estatística de 90%. Com menos de 7 dias ou 5 eventos, a tela avisa "amostra pequena".
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


## Reorganização de 08/11/2026
A página começa com três objetivos de fluxo: cadastros, primeiras assinaturas e recebido. Cada objetivo mostra alvo, realizado, falta e necessidade diária. Um gráfico acumulado separa realizado, caminho linear para o objetivo e projeção. Pagantes ativos e receita equivalente ficam em Saúde da base. Planejamento de 12 meses, tipos de receita e edição futura continuam disponíveis em detalhes.

A previsão do Resumo financeiro é da carteira atual; Metas adiciona aquisições futuras estimadas. Para Pix, a previsão de vários ciclos usa sobrevivência sucessiva (p, p², p³). Cartão agendado não é recebimento garantido. A última cobrança sem valor histórico válido também é marcada estimada.

Metas de base histórica são reconstruídas por períodos pagos, enquanto a carteira vigente usa os períodos atuais das assinaturas. Alterações manuais ou de acesso podem explicar divergências; a ponte de clientes identifica retornos/ajustes e explica essa distinção.
