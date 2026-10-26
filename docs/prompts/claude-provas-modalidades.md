# Prompt: provas, rankings e cronogramas por modalidade (versão geral)

Cole numa sessão do Claude Code no repositório do Orto Questões.

---

Trabalhe no OrtoQuestões seguindo CLAUDE.md, AGENTS.md e docs/provas/MODALIDADES.md (leia antes). O sistema já
separa as modalidades TEOT, TARO, Ingresso em Cirurgia da Mão e Título da Mão (SBCM e SIMÃO), com ranking calculado
do acervo (src/dados/modalidades.ts) e cronograma da mão adaptativo (src/dados/cronogramaMao.ts). Sua tarefa:

1. Leia o que já existe e não refaça o que funciona. Rode `node fixtures/testar_modalidades.mjs` e
   `node fixtures/testar_cronograma_mao.mjs` antes de mexer.
2. Qualquer modalidade nova (por exemplo, uma subespecialidade com prova própria) entra como mais um item em
   `MODALIDADES`, com a regra `entra(q, prova)` baseada nos metadados do índice (prova, área, simulado), nunca em
   número escrito à mão. Questões autorais nunca entram em ranking de prova oficial; ingresso e título nunca se misturam.
3. A contagem segue as regras do documento: cópias e anuladas fora, assunto principal, fatia média por prova, tendência
   só com dados suficientes, "incidência observada no acervo", sem prometer o que vai cair.
4. Cronograma: recalculado a partir da configuração, das respostas e do dia; nunca congela o plano, nunca joga todo o
   atraso no dia seguinte, preserva o histórico. Prontidão é estimativa pedagógica, nunca "chance de passar".
5. Celular primeiro: abrir, ver a meta e começar em poucos toques; nada de tabela larga nem rolagem lateral.
6. Teste de verdade: testes de domínio no npm test, `node fixtures/e2e_mao.mjs` no navegador (celular e computador),
   `npx tsc -b`, `npm run build`. Não diga que testou o que não rodou.
7. Publique numa entrega só (commits organizados, PR para o branch do site, merge) e confira o site no ar.
8. Divulgação, se pedida: siga docs/marketing/orientacoes.md (sem emoji, sem número total do acervo, stories sem
   figurinha, o caminho está no perfil) e só anuncie o que já está no ar.
