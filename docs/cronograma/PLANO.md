# Plano do cronograma (desde 14/10/2026)

Caderno de trabalho da reforma do cronograma (`#/cronograma`). Serve ao Tales e a qualquer agente.
Marque `[x]` no que ficar pronto e diga em que PR entrou; ideia nova vai no fim da seção, com número novo.

Código atual: `src/paginas/PlanoEstudo.tsx` (página e formulário), `src/paginas/CronogramaHub.tsx`
(peças do painel), `src/dados/planoEstudo.ts` (cálculo), `src/dados/hubCronograma.ts` (constância,
risco, esquecimento, reta final), `src/componentes/CaixasAssinante.tsx` (cartão da página inicial).

Protótipo aprovado como direção: [prototipo/hoje-e-depois.html](prototipo/hoje-e-depois.html)
(gerar as imagens com `node marketing/instagram/gerar.mjs docs/cronograma/prototipo/hoje-e-depois.html`).

## O que motivou (diagnóstico de 14/10/2026)

- Montar o cronograma ocupa umas 5 telas no celular; o texto dos Simulados toma meia tela.
- A meta diz "60 questões novas, ≈ 1h30", mas revisões, flashcards e resumão vêm à parte: a carga real fica escondida.
- Uma área inteira por semana (240 de Trauma, depois 360 de Pediatria): cansa e a primeira área fica semanas sem voltar.
- A página do assinante empilha 12 blocos sem hierarquia; "o que eu faço agora" disputa espaço com tudo.
- Intensidade em % do acervo é abstrata; o residente pensa em tempo.

## Princípios de apresentação (a pessoa sempre sabe o que está fazendo)

A tela responde sempre, nesta ordem e com estas palavras, sem sinônimos:

1. **Onde você está:** dias até a prova, semana X de N, fase e passada, num trilho com o marcador "você".
   Uma frase diz o que a fase significa e quando começa a próxima.
2. **Hoje:** um cartão só, com a área, o "por que hoje", os assuntos do dia em chips e a lista do dia
   (resumão, questões novas, revisões, flashcards), cada item com tempo, estado (feito, agora, a fazer)
   e o total do dia. Um único botão principal, que diz exatamente o que faz ("Continuar: faltam 37").
3. **Amanhã:** uma linha com a área, os assuntos e o número. Dá continuidade e tira a ansiedade.
4. **Esta semana:** 7 colunas (seg a dom) com a cor da área, o número, feito, hoje e folga hachurada,
   e uma frase quando a área muda ("na quinta entra Joelho").
5. **Depois:** linha do tempo por semana, com faixas na cor das áreas e os marcos (mini-simulados,
   reta final, prova) em dourado tracejado. Recolhida em 4 ou 5 itens, com "ver todas".
6. **Como você está indo:** constância e projeção. O resto (desempenho, mapa de risco, Simulados,
   como funciona) vai para abas ou blocos recolhidos.

Linguagem visual fixa:
- **A cor diz a área**, em todo lugar: cronograma, semana, sessão, desempenho.
- **Estados iguais em todo lugar:** feito (verde com ✓), agora (contorno dourado), a fazer (cinza),
  folga (hachurado), atrasado (laranja), marco (dourado tracejado).
- **Todo número tem unidade e tempo** ("60 questões · ~1h30").
- **Todo "por quê" em uma linha**, perto da tarefa; explicação longa só no "?".
- **Continuidade fora da página:** na sessão, barra no topo com a meta de hoje na cor da área; ao terminar,
  tela "Meta de hoje feita" com o que falta hoje e o que vem amanhã.

## Etapas

### 1. Apresentação "hoje e depois"
1. [ ] Trilho "onde você está" no topo (fase, passada, semana X de N, frase da fase).
2. [ ] Cartão Hoje com checklist do dia, tempo de cada item, total do dia e botão único.
3. [ ] Linha "Amanhã".
4. [ ] "Esta semana" em 7 colunas, com cor da área e estados.
5. [ ] "Depois": linha do tempo recolhida com marcos.
6. [ ] Abas ou blocos recolhidos para desempenho, mapa de risco, Simulados e como funciona.
7. [ ] Paleta fixa de cores por área, compartilhada pelo site.
8. [ ] Barra da meta de hoje dentro da sessão do cronograma.
9. [ ] Tela de fim de sessão: meta feita, o que falta hoje, amanhã.
10. [ ] Tour de 3 passos na primeira visita (trilho, hoje, semana).

### 2. Montagem
11. [ ] Uma pergunta por tela no celular, com o resumo ao vivo fixo no rodapé.
12. [ ] Intensidade em tempo por dia (30 min, 1h, 1h30, 2h+), mostrando a cobertura resultante.
13. [ ] Dia leve (plantão) além da folga.
14. [ ] Atalhos com as datas oficiais das provas; duas provas no mesmo plano (TARO e TEOT).
15. [ ] Diagnóstico de 20 questões opcional dentro da montagem.
16. [ ] "Já domino esta área" e "começar por".
17. [ ] Texto dos Simulados em uma linha com "saiba mais".
18. [ ] Simulador "e se": efeito da mudança na hora.

### 3. Distribuição dos temas
19. [ ] Passadas por incidência: 1ª o que mais cai em todas as áreas, 2ª prioridade média, 3ª o resto.
20. [ ] Intercalar: cerca de 70% da área do dia e 30% de mistura das áreas já vistas.
21. [ ] Blocos de 2 a 3 dias por grupo de assuntos, em vez de uma área por semana.
22. [ ] Mini-simulado cronometrado a cada 2 ou 3 semanas.
23. [ ] Resumão do tema no começo do dia.
24. [ ] Revisões e flashcards dos erros dentro da meta do dia (uma meta, um tempo).

### 4. Frequência e constância
25. [ ] Dia mínimo (10 questões) que mantém a sequência.
26. [ ] Teto para o atraso (no máximo +25%), espalhando o resto pela semana.
27. [ ] Botão "semana difícil".
28. [ ] Lembrete no horário escolhido (7h, almoço, 19h).
29. [ ] Exportar para o calendário (.ics).
30. [ ] Resumo de domingo.
31. [ ] Conquistas do cronograma.
32. [ ] Cronograma em grupo na Liga da residência (constância, não volume).

### 5. Inteligência
33. [ ] Tempo por questão da própria pessoa, no lugar do fixo de 1,5 min.
34. [ ] Prontidão por área (cobertura × acerto × incidência).
35. [ ] "Por que hoje" em todo dia.
36. [ ] Assunto dominado (acerto acima de 85% em 15 ou mais) sai da fila.
37. [ ] Projeção "nesse ritmo você chega com X% do acervo e Y% do que mais cai".

### 6. Quem não assina
38. [ ] Prévia guardada no aparelho.
39. [ ] Trilho e semanas completos desfocados na prévia.
40. [ ] Trilha em pixel art até a prova (mapa com fases e o castelo da prova), também para o Instagram.

## Regras que continuam valendo

- Não mudar preço, limites nem o que é do assinante sem o Tales pedir.
- Não mexer em questões, gabaritos e comentários.
- Mudança visual: capturas reais em celular e computador durante o trabalho.
