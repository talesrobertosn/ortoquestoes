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
1. [x] Trilho "onde você está" no topo (fase, passada, semana X de N, frase da fase). (PR da reforma, 14/10/2026)
2. [x] Cartão Hoje com checklist do dia, tempo de cada item, total do dia e botão único. (PR da reforma, 14/10/2026)
3. [x] Linha "Amanhã". (PR da reforma, 14/10/2026)
4. [x] "Esta semana" em 7 colunas, com cor da área e estados. (PR da reforma, 14/10/2026)
5. [x] "Depois": linha do tempo recolhida com marcos. (PR da reforma, 14/10/2026)
6. [x] Abas ou blocos recolhidos para desempenho, mapa de risco, Simulados e como funciona. (PR da reforma, 14/10/2026)
7. [x] Paleta fixa de cores por área, compartilhada pelo site. (PR da reforma, 14/10/2026)
8. [x] Barra da meta de hoje dentro da sessão do cronograma. (PR da reforma, 14/10/2026)
9. [x] Tela de fim de sessão: meta feita, o que falta hoje, amanhã. (PR da reforma, 14/10/2026)
10. [x] Tour de 3 passos na primeira visita (trilho, hoje, semana). (PR da reforma, 14/10/2026)

### 2. Montagem
11. [x] Uma pergunta por tela no celular, com o resumo ao vivo fixo no rodapé. (PR da reforma, 14/10/2026)
12. [x] Intensidade em tempo por dia (30 min, 1h, 1h30, 2h+), mostrando a cobertura resultante. (PR da reforma, 14/10/2026)
13. [x] Dia leve (plantão) além da folga. (PR da reforma, 14/10/2026)
14. [~] Atalhos com as datas oficiais das provas; duas provas no mesmo plano (TARO e TEOT). Feito em parte: atalho do TEOT (única data oficial no repositório) e a segunda prova como marco no caminho.
15. [x] Diagnóstico de 30 questões opcional dentro da montagem (o tamanho é `TAMANHO_DIAGNOSTICO`, em `hubCronograma.ts`). (PR da reforma, 14/10/2026)
16. [x] "Já domino esta área" e "começar por". (PR da reforma, 14/10/2026)
17. [x] Texto dos Simulados em uma linha com "saiba mais". (PR da reforma, 14/10/2026)
18. [x] Simulador "e se": efeito da mudança na hora. (PR da reforma, 14/10/2026)

### 3. Distribuição dos temas
19. [x] Passadas por incidência: 1ª o que mais cai em todas as áreas, 2ª prioridade média, 3ª o resto. (PR da reforma, 14/10/2026)
20. [x] Intercalar: cerca de 70% da área do dia e 30% de mistura das áreas já vistas. (PR da reforma, 14/10/2026)
21. [x] Blocos de 2 a 3 dias por grupo de assuntos, em vez de uma área por semana. (PR da reforma, 14/10/2026)
22. [x] Mini-simulado cronometrado a cada 2 ou 3 semanas. (PR da reforma, 14/10/2026)
23. [x] Resumão do tema no começo do dia. O item "Resumão do tema" abre `#/resumao?tema=<área>` já na área do dia (aberta e rolada até ela) e só fica feito quando a pessoa lê: toca em "Li esta área" ou fica um minuto com a área aberta e a aba à vista (`src/estado/resumaoLido.ts`). (branch claude/cronograma-ajustes, 15/10/2026)
24. [x] Revisões e flashcards dos erros dentro da meta do dia (uma meta, um tempo). (PR da reforma, 14/10/2026)

### 4. Frequência e constância
25. [x] Dia mínimo (10 questões) que mantém a sequência. (PR da reforma, 14/10/2026)
26. [x] Teto para o atraso (no máximo +25%), espalhando o resto pela semana. (PR da reforma, 14/10/2026)
27. [x] Botão "semana difícil". (PR da reforma, 14/10/2026)
28. [~] Lembrete no horário escolhido (7h, almoço, 19h). Feito em parte: lembrete pelo calendário do celular (.ics com alarme às 7h, 12h ou 19h); notificação do próprio site precisa de servidor (T).
29. [x] Exportar para o calendário (.ics). (PR da reforma, 14/10/2026)
30. [~] Resumo de domingo. Feito em parte: no site, aos domingos e segundas; por e-mail depende do Tales (T).
31. [~] Conquistas do cronograma. Feito em parte: já existem as do cronograma (28 e 84 dias, do início ao fim); novas pedem arte (T).
32. [ ] Cronograma em grupo na Liga da residência (constância, não volume). (T) Precisa de servidor.

### 5. Inteligência
33. [x] Tempo por questão da própria pessoa, no lugar do fixo de 1,5 min. (PR da reforma, 14/10/2026)
34. [x] Prontidão por área (cobertura × acerto × incidência). (PR da reforma, 14/10/2026)
35. [x] "Por que hoje" em todo dia. (PR da reforma, 14/10/2026)
36. [x] Assunto dominado (acerto acima de 85% em 15 ou mais) sai da fila. (PR da reforma, 14/10/2026)
37. [x] Projeção "nesse ritmo você chega com X% do acervo e Y% do que mais cai". (PR da reforma, 14/10/2026)

### 6. Quem não assina
38. [x] Prévia guardada no aparelho. (PR da reforma, 14/10/2026)
39. [x] Trilho e semanas completos desfocados na prévia. (PR da reforma, 14/10/2026)
40. [~] Trilha em pixel art até a prova (mapa com fases e o castelo da prova), também para o Instagram. Feito em parte: o "Onde você está" usa o trilho em pixel com a fonte e o horizonte da marca; o mapa ilustrado pede arte (T).

### 7. Adiantar e extras sem cobrança (pedido do Tales, 14/10/2026)
41. [x] Revisões e flashcards não são obrigatórios: saem da conta do "Seu dia" e do "Dia completo" e ficam num bloco "Se sobrar tempo", sem número na lista. O botão principal não manda mais para as revisões depois da meta.
42. [x] Adiantar de verdade: o que a pessoa faz além da meta de hoje sai dos próximos dias, começando por amanhã (até zerar a meta dele; o resto vai para o dia seguinte). Antes, o extra se diluía pelo plano inteiro (amanhã caía de 60 para 59).
43. [x] Painel "Adiantar" sempre à vista no cartão Hoje: +10, +20, +30, "amanhã inteiro" e "2 dias", cada um com o efeito ("amanhã fica com 40") e o tempo; "Cancelar o que falta". Com a meta pendente, o pedido entra na mesma sessão; com a meta feita, o painel vira o destaque dourado e abre a sessão na hora.
44. [x] Amanhã, a semana e o fim da sessão mostram o adiantado ("eram 60", "livre, você já adiantou"). Dia todo adiantado conta como meta cumprida.
45. [x] Conserto: o cartão dos OrtoQuestões Simulados dentro do bloco recolhido ficava espremido numa coluna fina no computador.
46. [x] "Ajustar" no topo, no "Onde você está", e no cartão Hoje em dia de folga (antes só no rodapé). "Como o seu cronograma funciona" começa recolhido; o tour de 3 partes some após "Entendi" e só é lido/gravado no cronograma do assinante, então a vitrine não o consome e ele aparece sozinho quando a pessoa assina. (T5.5, branch claude/cronograma-ajustes, 15/10/2026)
47. [x] Um número só de "faltam N dias": a montagem e o painel contam de meia-noite a meia-noite (`diasAte` em `planoEstudo.ts`), sem o `Math.ceil` que dava um dia a mais. (branch claude/cronograma-ajustes, 15/10/2026)

48. [x] Adiantar de ponta a ponta (pedido do Tales, 16/10/2026): quem puxou questões dos próximos dias tem, no dia seguinte,
    exatamente essas questões a menos. **O que estava errado:** o registro do dia (`opcoes.adiantados`) só era gravado se a
    pessoa, depois de passar da meta, abrisse o cronograma ou a página inicial com o aparelho sincronizado. Quem terminava a
    sessão e fechava o site (ou estudava no Treinar, ou num aparelho que não chegou a gravar) não tinha registro, e no dia
    seguinte o extra voltava a se diluir pelo plano inteiro (meta de 62 em vez de 42 depois de 20 a mais). Agora o motor
    refaz a meta dos últimos 7 dias sem registro (`inferirAdiantados` em `planoEstudo.ts`, com as respostas que existiam até
    o fim de cada dia, em cache) e trata o que passou dela como adiantado; o registro gravado continua valendo primeiro.
    A interface diz a regra com os números: "Você adiantou 30 questões; amanhã sua meta é 32 (era 62)" (painel Adiantar e
    fim de sessão) e "Você adiantou 30 questões de hoje; hoje sua meta é 32 (era 62)" no dia seguinte (`dados/frasesAdiantar.ts`).
    Teste: `fixtures/testar_adiantar_ponta_a_ponta.mjs` (botão, extra sem botão e sem registro, vários dias na ordem pulando a
    folga, virada do dia às 23h50/0h10 de São Paulo com o aparelho em 4 fusos, dois aparelhos). A meta normal de D+1 pode
    ficar 1 questão abaixo da mostrada em D (arredondamento da divisão pelos dias que faltam), nunca acima.
49. [x] Calendário do mês (pedido do Tales, 16/10/2026): botão "Ver calendário" em "Esta semana" e "Ver no calendário" em
    "Depois" (ou `#/cronograma?calendario=1`). Pop-up grande no computador, tela cheia no celular; grade seg–dom, navegação
    do mês da criação até o da prova. Cada dia: áreas com a cor (nomes no computador, pontos no celular), questões, dia leve,
    folga hachurada, feito (✓ e quantas), hoje, mini-simulado e início de passada (dourado tracejado), reta final (véu dourado)
    e a prova. Tocar num dia abre o detalhe: resumão, questões por área com os assuntos, mini-simulado, extras e o tempo do
    dia; hoje tem "Começar/Continuar"; os 3 próximos dias de estudo têm "Adiantar este dia" / "Adiantar até este dia" (o
    mesmo pedido do painel Adiantar, que desconta na ordem). Código: `src/paginas/CronogramaCalendario.tsx` e
    `src/estilos/paginas/CronogramaCalendario.css`. Capturas: `node fixtures/capturar_calendario.mjs` com o Vite aberto.

Como funciona por dentro: `opcoes.adiantados` (no `planos_estudo.opcoes`, sem SQL novo) guarda, por dia, a meta daquele dia e
o que a pessoa pediu para adiantar. No dia seguinte, o motor conta as primeiras respostas daquele dia, tira a meta e
desconta o resto dos dias seguintes; a meta normal é recalculada devolvendo essas questões, então o plano continua
agendando exatamente o que falta. O registro é gravado sozinho quando a pessoa passa da meta (página do cronograma,
página inicial e fim de sessão leem o mesmo cálculo); se faltar (item 48), o motor refaz a meta do dia e chega ao mesmo
número. Os dias são os de São Paulo (`src/util/dia.ts`), seja qual for o fuso do aparelho. Teste: `fixtures/testar_cronograma_adiantar.mjs`.
Modo demonstração: `#/cronograma?demo=1&pendente` e `#/cronograma?demo=1&feita`.

## Como ficou (14/10/2026)

- Motor: `src/dados/planoEstudo.ts` simula o plano dia a dia (`calculo.dias`), com passadas por prioridade
  (máxima, alta, resto), blocos de ~3 dias por área, 30% de mistura revezando entre as outras áreas da passada
  (tirada do fim da fila delas), dia leve, semana difícil (dia mínimo de 10), mini-simulado a cada 14 dias,
  teto de 25% para o atraso e projeção. Teste: `fixtures/testar_cronograma_reforma.mjs`.
- Página: `src/paginas/CronogramaPainel.tsx` (onde você está, Hoje, Amanhã, Esta semana, Depois, Como você está
  indo, blocos recolhidos, tour, resumo da semana, calendário .ics). Cores por área em `src/dados/coresAreas.ts`.
- Montagem em 4 passos em `PlanoEstudo.tsx`, com o resumo ao vivo (barra fixa no celular) e a diferença de cada escolha.
- Opções novas (dia leve, semana difícil, começar por, dominadas, segunda prova) na coluna `opcoes` de
  `planos_estudo`: parte 20 do SQL (`supabase/colar-no-painel/sql-202610141300-parte20.sql`), **aplicada pelo Tales em 14/10/2026**. Antes disso, ficavam só no aparelho; o código mantém essa reserva para bancos sem a coluna.
- Sessão: faixa da meta de hoje na cor da área; fim de sessão do cronograma com o que falta hoje e amanhã.
- Modo demonstração só em desenvolvimento: `#/cronograma?demo=1`.

## Quem não assina (orientação do Tales, 14/10/2026)

Quem não assina vê só uma **vitrine**: um exemplo do cronograma até o TEOT, montado com o próprio
histórico, com o essencial (onde você está, o dia de hoje e a semana em cores, sem os números).
Amanhã, as semanas seguintes, os ajustes, o desempenho e os blocos de detalhe ficam bloqueados.
**Criar o cronograma é só para assinantes**: o formulário de montar não aparece para quem não assina.
Isso substitui a prévia preenchida pela pessoa (itens 38 e 39).

## Regras que continuam valendo

- Não mudar preço, limites nem o que é do assinante sem o Tales pedir.
- Não mexer em questões, gabaritos e comentários.
- Mudança visual: capturas reais em celular e computador durante o trabalho.

### Revisão de 16/10: atenção especial aos calendários

50. [x] Datas civis e plano encerrado: mês e dia da prova corretos em qualquer fuso; seleção acompanha a navegação e respeita o intervalo do plano.
51. [x] Hoje também em folga/reta final/prova, histórico dos dias já vividos e navegação por teclado dentro do calendário.
52. [x] Flashcards recalcula hoje/semana/previsão na virada do dia, ao voltar para a aba, ao mudar de conta e ao receber plano/registros de outra aba.
53. [x] Exportação .ics com datas civis, marcos, linhas válidas com acentos e testes em quatro fusos. [Relatório e capturas](REVISAO-CALENDARIOS-16-10.md).

Entrega da revisão 50–53: [PR #327](https://github.com/talesrobertosn/ortoquestoes/pull/327).

### Torre do Tempo (31/10/2026)

54. [x] Topo do cronograma de ortopedia com a cena HD-2D original da torre do relógio da vila, na estrada até o castelo
    da prova (`src/componentes/cronograma/CenaTorre.tsx`, `src/estilos/paginas/CronogramaTorre.css`). Manhã, tarde e
    noite com a mesma geometria (segue `estado/aparencia.ts`); só a imagem da hora em uso é carregada. Sino que balança
    raramente, lanternas que tremulam e poeira/vaga-lumes, pausados fora da tela e desligados com "menos animação".
    Título, meta e o botão do dia num vidro escuro do lado calmo da arte (no celular, embaixo da janela da arte); trilho
    e fase no "chão" logo abaixo da cena. O calendário continua logo depois. Tour de 3 partes curto, dentro do topo, com
    o mesmo "Entendi" e o mesmo registro. Troca de cronograma numa linha só (rola de lado no celular). O resto da página
    no formato redondo da página inicial (cartões de raio 20, controles de raio 12, selos em pílula, sombras macias),
    só no cronograma de ortopedia (`.cr--torre`); o da Mão continua como estava. O formulário ganhou a torre numa faixa curta.
    Arte: `<python com numpy e pillow> scripts/gerar_cena_cronograma.py [manha|tarde|noite]` gera
    `public/pixel/cronograma/torre-tempo-<hora>(-960).webp` e `torre-tempo-sino-<hora>.png`. O relógio não tem letras nem
    algarismos e não marca a prova: os dias que faltam são o número do HTML.
