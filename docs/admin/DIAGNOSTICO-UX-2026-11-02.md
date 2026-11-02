# Diagnóstico do painel do administrador (02/11/2026)

Pedido do Tales: "a parte dos pagamentos segue super confusa, não dá para retirar notificação que já viu, não reconhece as
causas da falha; a experiência do painel inteiro está perdida e confusa. Leia a página inteira, detalhe cada ponto confuso,
busque problemas e faça um brainstorm de como resolver."

Base: leitura do código de `src/admin/` (todas as telas), do webhook do Mercado Pago
(`supabase/functions/webhook-mercado-pago`), das consultas do banco, das quatro capturas do celular enviadas pelo Tales e de
capturas de todas as 17 telas em 390 px e 1440 px com dados de teste.

---

## 1. As sete causas de fundo

Os problemas abaixo não são 60 defeitos soltos. Quase todos vêm de sete causas:

| # | Causa | Onde aparece mais |
|---|---|---|
| A | O motivo da recusa do cartão **nunca é gravado**. O Mercado Pago manda (`status_detail`), o servidor joga fora. | Assinaturas, Ficha, Avisos |
| B | Alerta **sem fim**: uma falha antiga fica acesa para sempre, e não existe "resolvido" nem "dispensar" para assinaturas. | Bolinha vermelha, Pede ação, Assinaturas |
| C | Duas coisas diferentes com o **mesmo nome**: "falha no pagamento" junta "o cartão foi recusado no checkout e a pessoa nunca pagou" com "a renovação foi recusada e a pessoa perdeu o acesso". | Hian e Arthur |
| D | Nomes que **não dizem o que é**: "Pagamentos" é o extrato, "Avisos de pagamento" são mensagens técnicas do Mercado Pago, "Ganhos" é o resumo. No código até os ids estão trocados (`pagamentos` abre os Avisos). | Financeiro inteiro |
| E | **Camadas demais** de navegação: menu de baixo, pílulas de item, sub-abas dentro do item, botões de período e filtros. Cinco andares antes do primeiro dado. | Ganhos, Ajustes, Assinaturas |
| F | **Linguagem de bastidor** na tela: códigos técnicos, nomes de função do banco, "processado/ignorado/na fila", "estimado/confirmado", "parte 31", "sem SQL". | Avisos, Ganhos, Todas as cartas |
| G | Telas **longas sem hierarquia**: tudo com o mesmo peso, sem dizer o que importa primeiro. | Ganhos (cerca de 4.000 px no celular), Agora (cerca de 4.600 px) |

---

## 2. Financeiro, ponto a ponto

### 2.1 Os dois "Falha no pagamento" (Hian Campos e Arthur Junqueira)

O que o banco diz, lido nas capturas e no código:

- Hian: assinatura Anual no cartão criada em 30/09, **nenhuma cobrança paga** ("Última cobrança paga: —"), status
  `falha_pagamento`, hoje "Plano grátis". Arthur: Mensal no cartão, 27/09, mesmo quadro.
- Ou seja: os dois **tentaram assinar e o cartão foi recusado no checkout**. Nunca foram assinantes, nunca perderam acesso.
  Não é bug do site nem dinheiro perdido: é uma venda que não fechou.

O que a tela faz de errado com isso:

1. Mostra "Falha no pagamento" em vermelho, igual a um assinante que perdeu o acesso, e põe na fila "Pede ação" como
   severidade **alta**, para sempre (a regra em `filaDeAtencao` conta toda assinatura com esse status, sem limite de data).
2. Não há botão para dizer "já vi" ou "resolvido". A bolinha vermelha do Financeiro e o item em Pede ação nunca apagam.
3. Não diz **por que** recusou (causa A). Sem isso não dá para agir: saldo? CVV errado? banco bloqueou?
4. A ficha diz "Acesso terminou em 30/09/2026", o que sugere que a pessoa tinha acesso. Ela nunca teve.
5. A ficha manda "Veja Financeiro › Avisos de pagamento", mas logo abaixo mostra "Avisos do Mercado Pago · 0" para essa
   pessoa. É um beco sem saída.
6. A ficha mostra o código da assinatura (`5f6fa0d6...`) em destaque, sem utilidade para quem lê.
7. Na lista, a mensagem do grupo ("O Mercado Pago recusou a cobrança") se mistura com "Mostrando 2 de 58" e com o aviso
   das contas de teste, num parágrafo só.

O lado bom escondido: essas pessoas **quiseram pagar**. São os leads mais quentes do site, e o painel as trata como erro em
vez de oportunidade ("o cartão não passou; quer tentar com Pix?").

### 2.2 Avisos de pagamento (a tela do segundo print)

1. O nome "Avisos de pagamento" ao lado de "Pagamentos" confunde. São coisas diferentes: um é o extrato do dinheiro, o
   outro é o registro das mensagens automáticas que o Mercado Pago manda ao servidor.
2. Item sem pessoa ligada repete o mesmo texto duas vezes ("Cobrança automática do cartão / Cobrança automática do
   cartão"): o título cai no tipo quando não há nome e o subtítulo também é o tipo.
3. "Pessoa: não deu para ligar a uma pessoa" aparece nas cobranças mensais do cartão. O aviso traz o número do pagamento
   autorizado, que não é o número da assinatura, e o servidor não grava de quem é quando processa.
4. Cinco filtros técnicos (Precisa de atenção, Todos, Processado, Ignorados, Na fila). Para o Tales só existem dois
   estados: "precisa de mim" e "tudo certo".
5. "Códigos técnicos" (evento, tipo `subscription_authorized_payment`) com o mesmo peso dos dados úteis.
6. "Marcar como visto" só existe para aviso com erro; "visto" não é "resolvido", e a própria faixa explica que marcar
   visto "não muda nada", o que gera dúvida sobre se o problema foi tratado.
7. No celular, lista e detalhe ficam um embaixo do outro; tocar num item não leva ao detalhe, ele aparece lá embaixo.

### 2.3 Assinaturas (primeiro e terceiro prints)

1. Três filtros (Plano, Meio, Assinou) em caixas tracejadas ocupam três linhas inteiras no celular e parecem campos
   vazios ou desativados.
2. As abas de situação (Com acesso, Pendentes, Falha, Encerradas, Todas) passam da tela; Encerradas e Todas ficam escondidas
   à direita sem sinal de que existem.
3. "Pendentes" junta Pix gerado há 10 minutos com Pix abandonado há um mês.
4. "Renovação" aparece como selo, mas não há como ver só as renovações.

### 2.4 Pagamentos (extrato)

1. Erro visível: "Confirmado Confirmado" e "Estimado Estimado" (o selo e o texto repetem a mesma palavra).
2. "Cartão · Pix" aqui e "Pix · cartão" no Ganhos: mesma informação em ordem trocada, fácil de ler errado.
3. "Estimado" sem explicação perto; a explicação está no rodapé, longe.
4. Período (Este mês, Mês passado...) é diferente do período do Ganhos (7, 30, 90 dias).

### 2.5 Ganhos

1. Sub-aba "Ganhos | Previsão" dentro do item "Ganhos", abaixo das pílulas do Financeiro: dois níveis de abas com o mesmo
   nome.
2. Seis janelas de tempo na mesma tela: novembro, hoje, 7 dias, 2026, desde o começo e "últimos 30 dias" no gráfico. O
   seletor "7 / 30 / 90 dias" só muda uma parte.
3. "+R$ 349,00 contra outubro até o dia 2 · outubro inteiro: R$ 428,80": frase difícil.
4. "Em 2026" e "Desde o começo" mostram o mesmo número (o site começou em 2026).
5. Rodapés "Fonte: cobrancas_admin + listar_assinaturas_admin" são nomes de função do banco.
6. Nove blocos seguidos (receita, gráfico diário, mês a mês, composição, base de assinantes, por plano, movimento do mês,
   atalhos, como calculamos). Nada diz qual importa.
7. "Taxa de renovação do mês: ninguém venceu ainda" e "Cancelamento acumulado no cartão 40% · 2 de 5" sem contexto.

---

## 3. O resto do painel

### 3.1 Estrutura e navegação (vale para todas as telas)

1. O título aparece duas vezes: na barra de cima ("Financeiro / Assinaturas") e logo abaixo, grande ("FINANCEIRO /
   Assinaturas").
2. As pílulas de item ficam cortadas na direita ("Avisos de...", "Simula...", "Relatórios e históric...") sem seta nem
   sombra indicando que rolam.
3. A bolinha vermelha do Financeiro e a do Conteúdo ficam acesas quase sempre (causa B), e o olho para de reparar nelas.
4. Botões de ação principal mudam de lugar e de estilo de tela para tela (CSV no topo, "Montar dezembro" grande,
   "Revisar e salvar" cinza).

### 3.2 Agora

1. O texto do topo explica o mecanismo ("sinal nos últimos 5 min · pessoas atualizam a cada 3 min, o resto a cada 5"). É
   informação de bastidor.
2. A página tem cerca de 4.600 px no celular: online, fora do site, números do dia, pede ação, linha do dia e listas.
3. "Fora do site agora" tem abas cortadas ("Viram os pla...").

### 3.3 Pessoas

1. Nove filtros em chips, vários quase iguais ("Ativas hoje", "Online agora", "Ativas na semana").
2. O selo do plano fica solto embaixo do e-mail.

### 3.4 Crescimento

1. "Conversão esta semana 100%" com a ressalva "correlação no tempo, não a mesma pessoa": um número que precisa de
   aviso para não enganar não deveria ser o destaque.

### 3.5 Conteúdo

1. Relatos e avaliações: a explicação "Acerto de primeira tentativa de 30% ou menos..." ocupa o topo antes da lista.
2. Simulados: o calendário mostra 12 caixas "Montar mensal" iguais; a próxima edição a montar se perde entre elas.

### 3.6 E-mails

1. Quatro itens que se sobrepõem: Lembretes tem botão "Carta pessoal por grupo" que leva a Cartas pessoais; Cartas
   pessoais tem "Campanhas prontas" que volta para Lembretes.
2. Lembretes abre com um parágrafo de 9 linhas sobre a regra contra spam.
3. Todas as cartas mostra rótulos internos: "Novos (17/10, sem SQL)", "Campanhas diárias (parte 31)".

### 3.7 Ajustes

1. "Limite diário gratuito: ligado agora", e logo abaixo: "Desligado, todo mundo responde sem limite". O texto descreve o
   estado oposto ao do botão.
2. "Aviso no topo do site" fica numa sub-aba escondida.

---

## 4. Brainstorm de soluções

### 4.1 Falhas de pagamento (causas A, B e C)

Ideias consideradas:

- **(a) Separar os dois casos sem mexer no servidor.** Se a assinatura nunca teve cobrança paga (`ultima_cobranca_id`
  vazio), é "Cartão recusado ao assinar"; se já teve, é "Renovação recusada". Dá para fazer hoje, só na tela.
- **(b) Recusa no checkout vira oportunidade, não alarme.** Sai da fila vermelha e entra em Pessoas ("Tentaram pagar e o
  cartão não passou") e em Agora, com ação "Enviar carta" (convite para tentar outro cartão ou o Pix). Depois de 14 dias
  sem nova tentativa, sai sozinha.
- **(c) Renovação recusada continua urgente**, com ação clara e prazo.
- **(d) Botão "Resolvido" em todo alerta**, guardado no servidor para valer no celular e no computador. A tabela de
  "lidos" já existe; dá para usar a mesma, sem migração nova.
- **(e) Gravar o motivo da recusa.** O webhook passa a guardar `status_detail` do Mercado Pago e a tela traduz:
  "Saldo ou limite insuficiente", "Código de segurança errado", "O banco pediu para a pessoa autorizar", "Recusado pelo
  antifraude", "Cartão vencido". Precisa de uma coluna nova e de publicar o webhook: mexe no código de pagamento, então
  só com o OK do Tales.
- **(f) Consultar o motivo na hora** (sem gravar), com um botão "Ver motivo no Mercado Pago" que só lê. Funciona também
  para as falhas antigas, como as do Hian e do Arthur.
- **(g) Ligar cada aviso à pessoa** no momento em que o servidor processa (ele já sabe de quem é a assinatura).

Recomendação: (a) + (b) + (c) + (d) já, só na tela e sem risco. Depois (e) + (f) + (g), juntos, com o OK do Tales,
porque mexem no servidor de pagamento.

### 4.2 Financeiro com nomes que dizem o que é (causa D)

Proposta de quatro itens:

| Hoje | Proposta | O que é |
|---|---|---|
| Ganhos (+ sub-aba Previsão) | **Resumo** | Quanto entrou, comparação e previsão, com um seletor de período só |
| Assinaturas | **Assinantes** | Quem paga, até quando |
| Pagamentos | **Extrato** | Cada dinheiro que entrou ou saiu, dia a dia |
| Avisos de pagamento | **Problemas** | Só o que pede o Tales: renovação recusada, aviso com erro, Pix vencendo. Cada item com motivo, ação e "Resolvido". O registro técnico do Mercado Pago fica recolhido no fim, para quem quiser conferir |

Os ids no código passam a bater com os nomes, e os endereços antigos continuam abrindo.

### 4.3 Menos andares (causa E)

1. Um título só por tela: a barra de cima vira o título; o bloco grande repetido sai no celular.
2. Fim das sub-abas: Previsão vira uma seção do Resumo; "Aviso no topo do site" vira item próprio em Ajustes.
3. No celular, os filtros vão para um botão "Filtrar (2)" que abre uma gaveta; na tela fica só o que está ativo.
4. Pílulas com sombra e seta indicando que há mais à direita.

### 4.4 Linguagem (causa F)

1. Passada de glossário em todo o painel: nada de nome de função, código ou jargão na primeira leitura.
2. "Detalhes técnicos" recolhido no fim de cada detalhe (códigos, ids, fonte).
3. "Estimado" explicado onde aparece, numa frase.
4. Corrigir os textos que contradizem o estado (Ajustes) e os rótulos internos (Todas as cartas).

### 4.5 Hierarquia (causa G)

1. Cada tela abre com a resposta à pergunta dela, em uma linha ("Novembro: R$ 349,00, 1 pagamento, nada pendente").
2. O resto em blocos recolhíveis, na ordem do que mais se usa.
3. Bolinha vermelha só para o que pede ação hoje. O que é informação vira número cinza.

### 4.6 E-mails

Juntar Lembretes e Cartas pessoais em **Enviar** (grupos prontos e carta à mão no mesmo lugar), "Relatórios e histórico"
vira **Enviados** e "Todas as cartas" vira **Modelos**.

---

## 5. Ordem sugerida

| Fase | O que entra | Risco |
|---|---|---|
| 1 | Falhas separadas (checkout × renovação), "Resolvido" em todo alerta, ficha do Hian e do Arthur com o texto certo, erros visíveis (Confirmado repetido, aviso repetido, texto do Ajustes), Financeiro com os quatro nomes novos | Só tela; nada muda no banco nem no pagamento |
| 2 | Motivo da recusa gravado e consultável, avisos ligados à pessoa | Servidor de pagamento: só com o OK do Tales |
| 3 | Menos andares, um título por tela, filtros em gaveta, passada de linguagem, E-mails em três itens | Só tela |
