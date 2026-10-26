# Provas, temas que mais caem e cronogramas por modalidade (27/10/2026)

Pedido do Tales: deixar de tratar todas as provas como uma só. Cada objetivo tem o próprio ranking e,
na Cirurgia da Mão, o próprio cronograma.

## Modalidades

| Modalidade | Questões contadas | Onde aparece |
|---|---|---|
| Ortopedia, todas as provas | provas oficiais da área base (TEOT, TARO, TECOC, ENARE R4 e outras), como antes | `#/temas-que-mais-caem` (visão de sempre) e `#/cronograma` |
| TEOT | só TEOT | `#/temas-que-mais-caem?prova=teot` |
| TARO | só TARO (nunca somado ao TEOT) | `?prova=taro` |
| Ingresso em Cirurgia da Mão | questões oficiais da área `mao` que não são SBCM nem SIMÃO (USP-SP, ENARE Mão, UFG, PUC-SP, INTO, Einstein, FMRP-USP, IAUPE, UERJ e qualquer prova nova da área) | `?prova=mao-ingresso` e `#/cronograma-mao?prova=ingresso` |
| Título da Mão: SBCM e SIMÃO | OrtoQuestões Simulados por engenharia reversa da SBCM e do SIMÃO (uma questão nossa por questão da prova) | `?prova=mao-titulo` e `#/cronograma-mao?prova=titulo` |

O SIMÃO é o simulado do exame; o exame oficial é da SBCM. As questões do título no site **não são as
oficiais**: mostram os assuntos que a prova cobrou. A página diz isso com todas as letras.

## Como o ranking se atualiza sozinho

`src/dados/modalidades.ts` calcula tudo no navegador, a partir de `public/acervo/indice.json` (prova,
ano, área, assunto, anulada, cópia, simulado). Questão nova, prova nova, reclassificação, anulação ou
remoção entram na próxima publicação do acervo, sem número escrito à mão e sem script extra. Uma prova
nova de ingresso da mão entra sozinha se for importada na área `mao` (`scripts/adicionar_prova.py`).

Regras (testadas em `fixtures/testar_modalidades.mjs`):
- cópias e anuladas não contam; questão sem assunto fica fora e aparece como "sem classificação";
- cada questão conta uma vez, pelo assunto principal (o primeiro subtema);
- a ordem usa a fatia média por prova (cada edição pesa igual) e mostra em quantas provas o assunto apareceu;
- "em alta" ou "em queda" só com três anos ou mais e cinco questões do assunto, diferença de 3 pontos;
- grandes áreas da mão vêm de `GRANDES_AREAS_MAO`, sem mudar a classificação das questões;
- é incidência observada no acervo, não previsão.

A página pública `/cirurgia-da-mao/` (gerada a cada publicação por `scripts/gerar_paginas_destino.py`)
usa as mesmas regras, com ingresso e título separados.

## Cronograma da mão

`src/dados/cronogramaMao.ts` (testes em `fixtures/testar_cronograma_mao.mjs`). O plano é recalculado a cada
abertura a partir da configuração (data da prova, dias da semana, minutos por dia, cobertura), das respostas
e do dia. Por isso ele se adapta a erro, atraso e mudança de data sem apagar histórico.
- meta do dia: o que falta dividido pelos dias de estudo até a reta final, no máximo 25% acima do tempo da pessoa;
- prioridade: fatia por prova × (1 + erro) × (1 + o que falta fazer);
- até um quarto do dia é revisão de erros com 3 dias ou mais;
- simulado a cada 14 dias; duas últimas semanas de reta final;
- no título, as questões no padrão SBCM e SIMÃO vêm primeiro e as oficiais de ingresso do mesmo assunto completam
  (só na cobertura completa);
- "Prontidão estimada" é estimativa pedagógica (domínio pesado pelo quanto cai), nunca chance de aprovação.

A configuração fica na conta, no mapa sincronizado da Biblioteca (itens `c.mao-ingresso` e `c.mao-titulo`, tipo
`pref`, vale a mais recente), sem tabela nova no banco. Respostas e histórico continuam onde sempre estiveram.
Acesso: qualquer pessoa monta e vê o plano; começar as sessões do plano é do assinante, como no cronograma de ortopedia.

## Testes de navegador

`node fixtures/e2e_mao.mjs` (celular e computador; `FOTOS=pasta` guarda as telas) e `node fixtures/e2e_atlas.mjs`.
