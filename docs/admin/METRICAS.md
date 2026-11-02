# Dicionário de métricas do painel administrativo (Painel 3.0)

O que cada número do painel quer dizer, de onde vem e o que ele **não** diz. A fonte única é
`src/admin/dados/metricas.ts`; a seção "Métricas" abaixo é gerada a partir dela e o teste
`fixtures/testar_admin_metricas.mjs` (dentro do `npm test`) falha se os dois discordarem.
Depois de mudar uma definição no código, rode:

```bash
node fixtures/testar_admin_metricas.mjs --gerar
```

## Regras que valem para todo número

- **Dia** é o dia do relógio de São Paulo (`America/Sao_Paulo`), o dia do evento, nunca o do processamento.
- **Período** é sempre comparado com o período imediatamente anterior do mesmo tamanho (7, 30 ou 90 dias).
  Se a série não cobre os dois períodos inteiros, não há comparação: nunca um "anterior" parcial.
- **Hoje** entra no período atual mesmo incompleto, e a tela avisa.
- **Contas de teste do dono** (`src/componentes/admin/contasTeste.ts`) ficam fora de todo número de receita;
  aparecem só nas listas, com o selo "Teste".
- **Falha não vira zero.** Quando uma consulta falha ou não existe no banco, o número aparece como
  "Indisponível" e a falha entra na fila de "Pede ação agora" do Comando.
- **Previsão nunca soma ao recebido.** Os números de Receita › Previsão ficam em outra tela, com a hipótese à vista.

## Selos de qualidade

| Selo | Quer dizer |
| --- | --- |
| Confirmado | Registro gravado com fonte verificável (evento, cobrança gravada). |
| Derivado | Calculado de registros observados por uma fórmula explícita. |
| Reconstruído | Inferido por falta de registro histórico (renovação antiga do cartão, assinatura paga sem a cobrança gravada). Aparece hachurado nos gráficos e nunca vira um número só com o confirmado. |
| Previsão | Futuro, com hipótese declarada (cartão se ninguém cancelar; Pix com a taxa de recompra escolhida). |
| Incompleto | Veio, mas cobre só parte do período ou da base. |
| Indisponível | A consulta falhou, falta permissão ou o dado é parcial. |

## Receita: como as contas são feitas

- **Cobranças** saem de `cobrancas_admin` (gravadas) mais `listar_assinaturas_admin`, pela função
  `cobrancas()` de `src/componentes/admin/receita.ts`. Pix entra pelo valor pago; cartão, pelo valor contratado.
  O banco guarda só a última cobrança de cada cartão: as renovações anteriores são reconstruídas a cada período do plano.
  Reembolsos são descontados e aparecem riscados em Cobranças.
- **Nova, renovação ou volta** é decidido por pessoa: a primeira compra paga é a nova; pagar de novo com o acesso
  valendo (ou até 30 dias depois do fim) é renovação; depois disso, "voltou a assinar".
- **Receita recorrente por mês (MRR)**: soma dos cartões que renovam sozinhos, cada um dividido pelos meses do plano.
- **Churn do mês**: cancelamentos do mês sobre os cartões que renovavam no fim do mês anterior. Pix não entra
  (termina sem renovar, o que é normal).
- **Receita do mês contra o mês passado**: comparada até o mesmo dia do mês, para não punir o mês em andamento.
- **Previsão de fechamento**: recebido no mês + renovações do cartão até o fim do mês (se ninguém cancelar) +
  recompra do Pix que vence no mês (com a taxa escolhida). A taxa observada só é sugerida com amostra suficiente;
  antes disso a hipótese começa em 60%.
- **Valores brutos.** A taxa do Mercado Pago não é gravada no banco; o líquido está no extrato dele.

## Limitações conhecidas

- "Pessoas estudando por dia" é contagem única **por dia**, não usuários únicos do período.
- O funil de ativação mostra a taxa de cada etapa sobre a etapa de que ela realmente depende
  (por exemplo, "assinaram" sobre quem respondeu a primeira questão), e não sobre a etapa imediatamente anterior
  quando a anterior não é pré-requisito.
- Coortes de retenção dependem de `retencao_admin`; semanas sem gente suficiente aparecem vazias, não como 0%.
- Online agora usa o sinal do aparelho dos últimos 5 minutos; o painel atualiza a cada 5 minutos (ou no botão Atualizar).

## Métricas

<!-- gerado: metricas -->

### Online agora `online`

| Campo | Definição |
| --- | --- |
| Pergunta | Quantas pessoas estão com o site aberto neste momento? |
| Unidade | pessoas |
| Numerador | Contas com sinal do aparelho (visto_em) nos últimos 5 minutos |
| Janela e fuso | Últimos 5 minutos, refeito no painel a cada 10 s |
| Fonte (RPC) | listar_usuarios_admin (visto_em); resumo_admin.online_agora quando a lista não veio |
| Qualidade | Confirmado |
| Contas de teste | Incluídas (é presença, não estatística) |
| Deduplicação | Uma por conta |
| Atraso | Até 5 min + a atualização do painel (5 min) |
| Comparação | Não: é um instante |
| Subir é | bom |

### Pessoas estudando por dia `estudaramDia`

| Campo | Definição |
| --- | --- |
| Pergunta | Quantas pessoas respondem questões num dia típico do período? |
| Unidade | pessoas |
| Numerador | Soma, dia a dia, das contas que responderam ao menos 1 questão |
| Denominador | Dias do período |
| Janela e fuso | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte (RPC) | serie_diaria_admin.ativos |
| Qualidade | Derivado |
| Contas de teste | Incluídas (a série é do servidor; poucas contas) |
| Deduplicação | Única por dia; a mesma pessoa conta uma vez em cada dia em que estudou (não é usuário único do período) |
| Atraso | Cache do servidor de até 5 min |
| Comparação | Sim, com os N dias anteriores |
| Subir é | bom |

### Questões respondidas `questoes`

| Campo | Definição |
| --- | --- |
| Pergunta | Quanto se estudou de questões no período? |
| Unidade | eventos |
| Numerador | Respostas registradas (tentativas válidas) |
| Janela e fuso | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte (RPC) | serie_diaria_admin.respostas |
| Qualidade | Confirmado |
| Contas de teste | Incluídas |
| Deduplicação | Cada resposta é um evento |
| Atraso | Cache do servidor de até 5 min |
| Comparação | Sim, com os N dias anteriores |
| Subir é | bom |

### Cadastros `cadastros`

| Campo | Definição |
| --- | --- |
| Pergunta | Quantas contas novas chegaram? |
| Unidade | contas |
| Numerador | Contas criadas (auth.users.created_at) |
| Janela e fuso | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte (RPC) | serie_diaria_admin.cadastros |
| Qualidade | Confirmado |
| Contas de teste | Incluídas (o servidor não separa) |
| Deduplicação | Uma por conta |
| Atraso | Cache do servidor de até 5 min |
| Comparação | Sim, com os N dias anteriores |
| Subir é | bom |

### Receita confirmada `receitaConfirmada`

| Campo | Definição |
| --- | --- |
| Pergunta | Quanto entrou de fato no período? |
| Unidade | brl |
| Numerador | Cobranças pagas gravadas no banco (Pix pelo valor confirmado; a última cobrança do cartão pelo valor contratado) |
| Janela e fuso | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte (RPC) | cobrancas_admin + listar_assinaturas_admin (receita.ts › cobrancas, estimada = false) |
| Qualidade | Confirmado |
| Contas de teste | Excluídas (contasTeste.ts) |
| Deduplicação | Por cobrança; reembolsadas fora |
| Atraso | Até o webhook do Mercado Pago chegar |
| Comparação | Sim, com os N dias anteriores |
| Subir é | bom |

### Receita reconstruída `receitaReconstruida`

| Campo | Definição |
| --- | --- |
| Pergunta | Quanto do período é inferido, por falta de registro? |
| Unidade | brl |
| Numerador | Renovações antigas do cartão e pagamentos sem cobrança gravada, pelo preço do plano |
| Janela e fuso | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte (RPC) | receita.ts › cobrancas (estimada = true) |
| Qualidade | Reconstruído |
| Contas de teste | Excluídas |
| Deduplicação | Por cobrança reconstruída |
| Atraso | — |
| Comparação | Só como ordem de grandeza; o extrato oficial é o do Mercado Pago |
| Subir é | bom |

### Assinantes com acesso `assinantes`

| Campo | Definição |
| --- | --- |
| Pergunta | Quantas pessoas têm acesso pago agora? |
| Unidade | pessoas |
| Numerador | Pessoas com assinatura vigente (ativa, ou cancelada que ainda vale até o fim do período) |
| Janela e fuso | Agora |
| Fonte (RPC) | listar_assinaturas_admin › vigentesPorPessoa |
| Qualidade | Derivado |
| Contas de teste | Excluídas |
| Deduplicação | Uma por pessoa (renovar o Pix antes do fim não conta duas vezes) |
| Atraso | Atualização do painel |
| Comparação | Não: é um retrato de agora |
| Subir é | bom |

### Primeiras assinaturas `novasAssinaturas`

| Campo | Definição |
| --- | --- |
| Pergunta | Quantas pessoas pagaram pela primeira vez no período? |
| Unidade | pessoas |
| Numerador | Cobranças classificadas como "nova" (primeira compra paga da pessoa) |
| Janela e fuso | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte (RPC) | receita.ts › cobrancas + classificarCobrancas |
| Qualidade | Derivado |
| Contas de teste | Excluídas |
| Deduplicação | Uma por pessoa |
| Atraso | Até o webhook chegar |
| Comparação | Sim, com os N dias anteriores |
| Subir é | bom |

### Avisos do processador com falha `falhasProcessador`

| Campo | Definição |
| --- | --- |
| Pergunta | Algum aviso do Mercado Pago não foi aplicado? |
| Unidade | eventos |
| Numerador | Avisos com status "erro" ainda não marcados como vistos |
| Janela e fuso | Os 200 avisos mais recentes |
| Fonte (RPC) | listar_eventos_pagamento_admin + lidos (marcados no painel) |
| Qualidade | Confirmado |
| Contas de teste | Incluídas |
| Deduplicação | Por aviso |
| Atraso | Imediata |
| Comparação | Não |
| Subir é | ruim |

### Pendências de conteúdo `pendenciasConteudo`

| Campo | Definição |
| --- | --- |
| Pergunta | Quantos relatos e "não ajudou" esperam revisão? |
| Unidade | eventos |
| Numerador | Relatos em aberto + avaliações "não ajudou" com texto ainda não lidas |
| Janela e fuso | Agora |
| Fonte (RPC) | contadores_admin (ou as listas de relatos e avaliações) |
| Qualidade | Confirmado |
| Contas de teste | Incluídas |
| Deduplicação | Por relato / avaliação |
| Atraso | 1 min |
| Comparação | Não |
| Subir é | ruim |

### Funil de ativação `funil`

| Campo | Definição |
| --- | --- |
| Pergunta | Em que etapa as contas deixam de avançar? |
| Unidade | contas |
| Numerador | Contas que alcançaram cada marco |
| Denominador | Contas cadastradas (coorte de todas as contas, desde o começo) |
| Janela e fuso | Desde o começo; marcos cumulativos (50 e 500 questões não são do mesmo dia) |
| Fonte (RPC) | funil_admin |
| Qualidade | Derivado |
| Contas de teste | Incluídas (o servidor não separa) |
| Deduplicação | Uma por conta em cada etapa |
| Atraso | Cache do servidor de até 5 min |
| Comparação | Não por período (coorte única) |
| Subir é | bom |

<!-- fim do gerado -->
