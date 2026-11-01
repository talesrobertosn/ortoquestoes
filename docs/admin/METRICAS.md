# Métricas do painel do administrador (Mesa de Comando)

Fonte única: [src/componentes/admin/metricas.ts](../../src/componentes/admin/metricas.ts) (`METRICAS`). Cada indicador do painel abre esta mesma definição no botão "?". O teste `fixtures/testar_admin_metricas.mjs` falha se uma métrica do código não estiver aqui. Ao mudar uma conta, mude os dois.

## Estados de qualidade

| Estado | Rótulo na tela | Quer dizer |
| --- | --- | --- |
| `confirmado` | Confirmado | Registro do próprio site (cobrança gravada, resposta, cadastro). |
| `derivado` | Derivado | Calculado a partir de registros confirmados (média, contagem por pessoa). |
| `estimado` | Reconstruído | Inferido por falta de registro histórico (renovação antiga do cartão). Nunca soma ao confirmado. |
| `previsao` | Previsão | Futuro, com hipótese. Nunca soma ao recebido. |
| `indisponivel` | Indisponível | A consulta falhou ou o dado é parcial. Nunca vira zero. |

Período: 7, 30 ou 90 dias (padrão 30), sempre comparado com os N dias imediatamente anteriores, dia de São Paulo. Hoje entra no período atual ainda incompleto.

## Dicionário

### Online agora (`online`)

| Campo | Definição |
| --- | --- |
| Pergunta | Quantas pessoas estão com o site aberto neste momento? |
| Unidade | pessoas |
| Numerador | Contas com sinal do aparelho (visto_em) nos últimos 5 minutos |
| Denominador | — |
| Janela | Últimos 5 minutos, refeito no painel a cada 10 s |
| Fonte | listar_usuarios_admin (visto_em); resumo_admin.online_agora quando a lista não veio |
| Qualidade | Confirmado (`confirmado`) |
| Contas de teste | Incluídas (é presença, não estatística) |
| Deduplicação | Uma por conta |
| Atraso | Até 5 min + a atualização do painel (5 min) |
| Comparável | Não: é um instante |
| Bom quando | sobe |

### Pessoas estudando por dia (`estudaramDia`)

| Campo | Definição |
| --- | --- |
| Pergunta | Quantas pessoas respondem questões num dia típico do período? |
| Unidade | pessoas |
| Numerador | Soma, dia a dia, das contas que responderam ao menos 1 questão |
| Denominador | Dias do período |
| Janela | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte | serie_diaria_admin.ativos |
| Qualidade | Derivado (`derivado`) |
| Contas de teste | Incluídas (a série é do servidor; poucas contas) |
| Deduplicação | Única por dia; a mesma pessoa conta uma vez em cada dia em que estudou (não é usuário único do período) |
| Atraso | Cache do servidor de até 5 min |
| Comparável | Sim, com os N dias anteriores |
| Bom quando | sobe |

### Questões respondidas (`questoes`)

| Campo | Definição |
| --- | --- |
| Pergunta | Quanto se estudou de questões no período? |
| Unidade | eventos |
| Numerador | Respostas registradas (tentativas válidas) |
| Denominador | — |
| Janela | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte | serie_diaria_admin.respostas |
| Qualidade | Confirmado (`confirmado`) |
| Contas de teste | Incluídas |
| Deduplicação | Cada resposta é um evento |
| Atraso | Cache do servidor de até 5 min |
| Comparável | Sim, com os N dias anteriores |
| Bom quando | sobe |

### Cadastros (`cadastros`)

| Campo | Definição |
| --- | --- |
| Pergunta | Quantas contas novas chegaram? |
| Unidade | contas |
| Numerador | Contas criadas (auth.users.created_at) |
| Denominador | — |
| Janela | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte | serie_diaria_admin.cadastros |
| Qualidade | Confirmado (`confirmado`) |
| Contas de teste | Incluídas (o servidor não separa) |
| Deduplicação | Uma por conta |
| Atraso | Cache do servidor de até 5 min |
| Comparável | Sim, com os N dias anteriores |
| Bom quando | sobe |

### Receita confirmada (`receitaConfirmada`)

| Campo | Definição |
| --- | --- |
| Pergunta | Quanto entrou de fato no período? |
| Unidade | R$ |
| Numerador | Cobranças pagas gravadas no banco (Pix pelo valor confirmado; a última cobrança do cartão pelo valor contratado) |
| Denominador | — |
| Janela | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte | cobrancas_admin + listar_assinaturas_admin (receita.ts › cobrancas, estimada = false) |
| Qualidade | Confirmado (`confirmado`) |
| Contas de teste | Excluídas (contasTeste.ts) |
| Deduplicação | Por cobrança; reembolsadas fora |
| Atraso | Até o webhook do Mercado Pago chegar |
| Comparável | Sim, com os N dias anteriores |
| Bom quando | sobe |

### Receita reconstruída (`receitaReconstruida`)

| Campo | Definição |
| --- | --- |
| Pergunta | Quanto do período é inferido, por falta de registro? |
| Unidade | R$ |
| Numerador | Renovações antigas do cartão e pagamentos sem cobrança gravada, pelo preço do plano |
| Denominador | — |
| Janela | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte | receita.ts › cobrancas (estimada = true) |
| Qualidade | Reconstruído (`estimado`) |
| Contas de teste | Excluídas |
| Deduplicação | Por cobrança reconstruída |
| Atraso | — |
| Comparável | Só como ordem de grandeza; o extrato oficial é o do Mercado Pago |
| Bom quando | sobe |

### Assinantes com acesso (`assinantes`)

| Campo | Definição |
| --- | --- |
| Pergunta | Quantas pessoas têm acesso pago agora? |
| Unidade | pessoas |
| Numerador | Pessoas com assinatura vigente (ativa, ou cancelada que ainda vale até o fim do período) |
| Denominador | — |
| Janela | Agora |
| Fonte | listar_assinaturas_admin › vigentesPorPessoa |
| Qualidade | Derivado (`derivado`) |
| Contas de teste | Excluídas |
| Deduplicação | Uma por pessoa (renovar o Pix antes do fim não conta duas vezes) |
| Atraso | Atualização do painel |
| Comparável | Não: é um retrato de agora |
| Bom quando | sobe |

### Primeiras assinaturas (`novasAssinaturas`)

| Campo | Definição |
| --- | --- |
| Pergunta | Quantas pessoas pagaram pela primeira vez no período? |
| Unidade | pessoas |
| Numerador | Cobranças classificadas como "nova" (primeira compra paga da pessoa) |
| Denominador | — |
| Janela | Dias do relógio de São Paulo (America/Sao_Paulo); o dia do evento, não o do processamento. |
| Fonte | receita.ts › cobrancas + classificarCobrancas |
| Qualidade | Derivado (`derivado`) |
| Contas de teste | Excluídas |
| Deduplicação | Uma por pessoa |
| Atraso | Até o webhook chegar |
| Comparável | Sim, com os N dias anteriores |
| Bom quando | sobe |

### Avisos do processador com falha (`falhasProcessador`)

| Campo | Definição |
| --- | --- |
| Pergunta | Algum aviso do Mercado Pago não foi aplicado? |
| Unidade | eventos |
| Numerador | Avisos com status "erro" ainda não marcados como vistos |
| Denominador | — |
| Janela | Os 200 avisos mais recentes |
| Fonte | listar_eventos_pagamento_admin + lidos (marcados no painel) |
| Qualidade | Confirmado (`confirmado`) |
| Contas de teste | Incluídas |
| Deduplicação | Por aviso |
| Atraso | Imediata |
| Comparável | Não |
| Bom quando | desce |

### Pendências de conteúdo (`pendenciasConteudo`)

| Campo | Definição |
| --- | --- |
| Pergunta | Quantos relatos e "não ajudou" esperam revisão? |
| Unidade | eventos |
| Numerador | Relatos em aberto + avaliações "não ajudou" com texto ainda não lidas |
| Denominador | — |
| Janela | Agora |
| Fonte | contadores_admin (ou as listas de relatos e avaliações) |
| Qualidade | Confirmado (`confirmado`) |
| Contas de teste | Incluídas |
| Deduplicação | Por relato / avaliação |
| Atraso | 1 min |
| Comparável | Não |
| Bom quando | desce |

### Funil de ativação (`funil`)

| Campo | Definição |
| --- | --- |
| Pergunta | Em que etapa as contas deixam de avançar? |
| Unidade | contas |
| Numerador | Contas que alcançaram cada marco |
| Denominador | Contas cadastradas (coorte de todas as contas, desde o começo) |
| Janela | Desde o começo; marcos cumulativos (50 e 500 questões não são do mesmo dia) |
| Fonte | funil_admin |
| Qualidade | Derivado (`derivado`) |
| Contas de teste | Incluídas (o servidor não separa) |
| Deduplicação | Uma por conta em cada etapa |
| Atraso | Cache do servidor de até 5 min |
| Comparável | Não por período (coorte única) |
| Bom quando | sobe |

