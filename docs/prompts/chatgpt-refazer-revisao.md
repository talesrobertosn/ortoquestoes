# Prompt: refazer a página de Revisão (para o ChatGPT/Codex)

Copie tudo o que está abaixo da linha e cole no ChatGPT/Codex com acesso ao repositório `talesrobertosn/ortoquestoes`.

---

Você vai refazer **a página de Revisão** do site Orto Questões (rota `#/revisao`), **inteira, do zero**, no mesmo
padrão visual da página de Desempenho que já foi refeita. Leia este prompt inteiro antes de começar. Siga cada passo
na ordem. Não pule a conferência no fim.

## 0. Contexto em uma frase

O Orto Questões é um site de questões de ortopedia para residentes. A página de Revisão mostra quantas questões vencem
hoje para revisar (revisão espaçada), deixa começar a sessão, mostra o calendário dos próximos dias, o ritmo (teto por
dia e folgas), as conquistas de revisão e a regra de quando cada questão volta. O dono do site é o Tales. Ele quer que
a página nova fique **no mesmo design da página de Desempenho**, que ele aprovou como padrão.

## 1. Leia antes de escrever qualquer código (obrigatório)

Leia estes arquivos inteiros, nesta ordem:

1. `CLAUDE.md` (regras do projeto). Procure o parágrafo **"Padrão para atualizar qualquer página"**: ele é a regra
   principal deste trabalho.
2. `AGENTS.md` (regras de commits, PRs e testes).
3. `DESIGN.md`, em especial a parte **"Desempenho (14/11/2026)"**, e `PRODUCT.md`.
4. **A referência que você vai copiar:**
   - `src/paginas/Desempenho.tsx`: a estrutura da página (topo com arte e painel, menu lateral, seções, botões).
   - `src/estilos/paginas/Desempenho.css`: o CSS inteiro. É daqui que saem as cores, os botões, os cartões, o menu
     lateral e o comportamento no celular.
   - `src/componentes/desempenho/*.tsx`: como cada bloco usa botões de verdade.
5. **A página que você vai refazer:**
   - `src/paginas/Revisao.tsx` (a página atual, 320 linhas)
   - `src/paginas/RevisaoCalendario.tsx` (o calendário dos próximos dias)
   - `src/estilos/paginas/Revisao.css` (o CSS atual, que será substituído)
   - `src/componentes/vila/TopoVila.tsx` e `src/componentes/vila/cenas.ts` (o topo atual com a arte da estufa)

## 2. O que NÃO pode sumir (lista completa; confira item por item no final)

A página nova precisa ter **todas** estas funções, com os mesmos cálculos. **Não mexa nos arquivos de cálculo**
(`src/estado/planoRevisao.ts`, `src/estado/revisao.ts`, `src/estado/metasRevisao.ts`, `src/estado/conquistas.ts`,
`src/estado/preferencias.ts`). Mude só a apresentação.

1. **Filtro por área**: os botões "Todas" + uma área por tema (com a contagem de cada uma). Vale para a página inteira.
   Fica guardado no aparelho (`usarArmazenado('revisao:area')`) e `#/revisao?area=coluna` abre direto na área.
2. **O número de hoje**: "X para hoje · ~N min" (com o nome da área, se houver filtro). Os três outros estados do
   título: "Revisão de hoje zerada" (com a recompensa), "Hoje é dia de folga" e "Tudo em dia por aqui".
3. **O texto de apoio** (`textoApoio`) com as quatro variantes (excedente diluído, atrasadas de dias anteriores, folga,
   zerada, nada vence).
4. **Botões de ação de hoje**, com a mesma lógica:
   - "Começar revisão" (todas as de hoje) e "Só 5 minutos" (as primeiras `REVISOES_CINCO_MINUTOS`).
   - Zerada: "Adiantar N" (de amanhã) e "Treinar questões novas".
   - Nada vence: "Treinar questões novas" e "Adiantar N".
   - Todas usam `iniciarIds(ids)`, que já existe. Não troque por link.
5. **Os três números**: Hoje (o anel com feitas/total), Sequência (dias, com "revise hoje para não perder" / "hoje já
   conta" e a chama apagada quando é zero) e Pela frente (pendentes e "próximas em ...").
6. **Plano de resgate** (quando há excedente ou mais de 30 vencidas sem teto): o texto e os botões de teto
   (`TETOS`: 15, 20, 30, 50, sem teto).
7. **Flashcards de hoje** (`FlashcardsDeHoje`), com o botão de esconder.
8. **O calendário** (`CalendarioRevisao`), com `aoRevisar={iniciarIds}` e o rótulo da área.
9. **Conquistas de revisão**: as quatro famílias (`FAMILIAS_REVISAO`) com a medalha, o progresso, "Família completa",
   o link "Ver todas" e a frase "Seus números: X revisões feitas...".
10. **Seu ritmo**: o teto por dia (TETOS) e os dias sem revisão (DIAS_SEMANA), com as duas notas explicativas.
11. **Quando cada questão volta**: as escadas (`ESCADAS`), o "Errou? Ela volta hoje", o link para refazer as incertas
    (`#/treinar?situacao=incertas`) e o link do caderno de erros.
12. Estado de carregamento: "Preparando sua revisão…".

Faça uma lista com esses 12 itens num comentário no topo do arquivo e marque cada um quando ele estiver pronto na
página nova.

## 3. As regras de design (copie do Desempenho, não invente)

- **Uma linguagem só, do topo ao rodapé.** Não deixe nenhum pedaço com o visual antigo (sem `vl-`, sem `cristal`,
  sem `vl-vidro`, sem `tr-pilula` com sombra de degrau, sem cartão `cartao cartao__corpo` antigo, sem `<details>`
  escondendo o ritmo e a regra).
- **Cores**: as mesmas variáveis do Desempenho. Verde-azulado `#00806f` (ações e dados), azul-ardósia `#243b47`
  (títulos e números), papel branco do site. No escuro, os valores de `:root[data-tema="escuro"] .dpg` do
  Desempenho.css. Vermelho só para erro/atraso, nunca decoração. **Sem dourado nem preto de fundo.**
- **Fontes**: títulos e números grandes em `var(--fonte-marca)` (Plus Jakarta Sans). **Nunca** use fonte pixel
  (`--fonte-pixel-titulo`, Jersey 10, Pixelify) para número ou texto. O Tales disse: "letra em pixel mal dá para ler".
- **Botões**: toda ação é um botão de verdade, com fundo verde (principal) ou borda verde (contorno), altura mínima
  de 44 px (38 px no pequeno). **Nunca** uma ação só como link de texto.
- **Sem abas e sem `<details>` fechados**: tudo por extenso, em seções. Cada seção tem: um rótulo pequeno em caixa
  alta com ícone, um título que é uma pergunta e uma linha de apoio (veja o componente `Secao` no Desempenho.tsx).
- **Menu lateral fixo** (copie o `NavegacaoSecoes` do Desempenho): no computador, uma coluna à esquerda com as seções
  e a seção atual marcada; no celular, uma barra de atalhos que gruda embaixo do cabeçalho.
- **Arte**: o topo usa a arte da **estufa** (`public/pixel/paginas/estufa-{manha,tarde,noite}.webp`, versões `-960` e
  `-movel` para o celular). A arte fica numa moldura no topo, com o título por cima do lado esquerdo, que é mais calmo.
  No celular, a arte fica inteira em cima e o título desce para o papel, igual ao Desempenho. Não desenhe arte em
  CSS/SVG nem use imagem gerada por IA.
- **Nada de emoji.**

## 4. A estrutura da página nova (faça exatamente assim)

Crie as seções nesta ordem, cada uma com `id="rvp-<nome>"`:

1. **Topo** (`rvp-topo`), uma peça só, como o topo do Desempenho:
   - em cima, a cena da estufa com o rótulo "Revisão", o título de hoje ("38 para hoje · ~25 min") e a data;
   - embaixo, no mesmo cartão, o painel com: o texto de apoio **em destaque** (fonte maior, números em negrito verde),
     os botões de hoje (Começar revisão = principal grande; Só 5 minutos = contorno) e os três números (Hoje com o
     anel, Sequência, Pela frente) numa faixa com linhas finas entre eles (copie `.dp-numeros` do Desempenho);
   - o filtro por área fica logo abaixo do painel, como uma fileira de chips com a contagem (chip ativo em verde).
2. **Plano de resgate** (`rvp-resgate`), só quando aparece hoje: um cartão com borda vermelha suave, o texto e os
   botões de teto como um seletor de segmentos (copie `.ds-seg` do Desempenho).
3. **Calendário** (`rvp-calendario`): seção "Calendário", com a pergunta "O que vem pela frente?". Refaça o visual do
   `RevisaoCalendario.tsx` no mesmo estilo (cartões brancos, números em Plus Jakarta, botão "Revisar" verde em cada
   dia que tem questões), mantendo todas as funções dele.
4. **Flashcards de hoje** (`rvp-flashcards`), dentro da mesma linguagem, com o botão de esconder.
5. **Conquistas** (`rvp-conquistas`): "Cada revisão conta". Quatro cartões, um por família, com a medalha, o título,
   a barra de progresso verde e o número; "Ver todas" como botão de contorno.
6. **Seu ritmo** (`rvp-ritmo`): aberto, sem `<details>`. Dois grupos de segmentos (teto por dia; dias sem revisão),
   com as notas.
7. **Quando cada questão volta** (`rvp-regra`): aberto. As escadas como linhas do tempo horizontais (um ponto por
   intervalo, com o rótulo embaixo), o aviso "Errou? Ela volta hoje" e dois botões de contorno (Refazer as incertas,
   Abrir o caderno de erros).

O menu lateral lista essas seções (o resgate só quando ele aparece).

## 5. Como implementar (passo a passo)

1. Crie uma branch nova a partir de `claude/pdfs-questoes-tp64dr`.
2. **Use um prefixo novo e único nas classes: `rvp-`** (de "revisão página"). **Não reaproveite `rv-`, `rvx-`,
   `vl-`, `tr-`, `dp-` nem `dpg`**: o arquivo `src/estilos/temporada.css` e o `src/estilos/premium.css` têm regras
   antigas que miram classes com esses nomes e estragam o visual (no Desempenho isso aconteceu com `.dp`). Antes de
   escolher, rode `grep -rn "rvp-" src/estilos` e confirme que não há nada.
3. Para os botões, crie `.rvp-botao`, `.rvp-botao--principal`, `.rvp-botao--contorno`, `.rvp-botao--pequeno` e
   `.rvp-botao--grande` **copiando** as regras de `.dp-botao` do Desempenho.css. Não use `.botao--principal` do
   site: a temporada pixel muda a aparência dele em algumas páginas.
4. Copie as variáveis de cor do bloco `.dpg { ... }` e do `:root[data-tema="escuro"] .dpg { ... }` para um bloco
   `.rvp { ... }` no novo `Revisao.css`.
5. Escreva o novo `Revisao.css` **do zero** (apague o conteúdo antigo). Mantenha os cálculos em `Revisao.tsx` (as
   linhas de `useMemo`, `iniciarIds`, `textoApoio` etc.) e reescreva **só o `return`** e os componentes visuais.
6. **Não use `TopoVila`** neste topo: monte o topo como o `dp-topo` do Desempenho (cena + painel), com a arte da
   estufa num `<picture>` (fonte `-movel` para `max-width: 40rem`, `srcSet` com `-960` e a de 1440). Pode reaproveitar
   as peças animadas da estufa (chamas, gato, coruja) lendo as posições de `CENA_ESTUFA` em `cenas.ts`, ou deixar só a
   pintura; o que não pode é texto por cima da parte movimentada da arte.
7. O título e os números grandes usam `var(--fonte-marca)`, peso 800, `letter-spacing` negativo, e
   `font-variant-numeric: tabular-nums`.
8. Todo cartão: fundo `var(--superficie)`, borda 1 px na cor de linha, raio 16 px, sombra suave (a `--dp-sombra` do
   Desempenho). Seções separadas por 40 a 60 px.

## 6. Armadilhas que já aconteceram (leia, elas vão acontecer de novo)

- **Rolagem lateral no celular**: um gráfico ou SVG com largura fixa alarga a coluna inteira e corta a página. Use
  `grid-template-columns: minmax(0, 1fr)` no contêiner principal e `min-width: 0` nos filhos de grid. Confira com
  `document.documentElement.scrollWidth === innerWidth` em 390 px de largura.
- **Menu grudado**: use `position: sticky; top: calc(var(--altura-cabecalho) + 1rem)` e
  `scroll-margin-top: calc(var(--altura-cabecalho) + 1rem)` em cada seção (no celular, `+ 4rem`, por causa da
  barra de atalhos).
- **Tabela/linha com botões que saem do cartão**: as colunas precisam caber. Teste em 1280 e 1440 de largura.
- **`node_modules` é um atalho versionado**: para testar, rode `rm -f node_modules && npm ci`. Antes de commitar,
  rode `rm -rf node_modules && git checkout -- node_modules`. Nunca commite a pasta nem a remoção do atalho.
- **Imagem com `loading="lazy"`** não aparece em print de página inteira: role a página antes do print.
- **Não mude nenhuma regra de revisão** (intervalos, teto, ordem, sequência). Só a aparência.

## 7. Conferência (obrigatória, antes de abrir o PR)

1. `npx tsc -b --noEmit` sem erro.
2. `npm test` passando (inclui o orçamento de tamanho dos arquivos).
3. Prints com Playwright (Chromium em `/opt/pw-browsers/chromium`): computador 1440×900 no claro **e** no escuro, e
   celular 390×844, a página inteira. Para ter dados, use `fixtures/painel_admin_falso.mjs` (`iniciar()` sobe o site
   com um Supabase falso e uma conta logada) e grave respostas de exemplo em
   `localStorage['ortoquestoes:conta:<CONTA>:respondidas']` antes de abrir `#/revisao`, com várias vencendo hoje,
   algumas atrasadas e outras nos próximos dias.
4. Olhe os prints e responda, item por item:
   - Algum pedaço ficou com o visual antigo (dourado, pixel, vidro escuro, sombra de degrau)?
   - Algum número ou texto está em fonte pixel?
   - Alguma ação ficou só como link de texto?
   - Algo sai da tela ou cria rolagem lateral no celular?
   - O escuro está legível em todos os blocos?
   - Os 12 itens da seção 2 estão todos na página?
   Se alguma resposta for ruim, corrija e tire os prints de novo.
5. Mande os prints para o Tales junto com o PR.

## 8. Entrega

- Commits em português, explicando o que mudou.
- PR para `claude/pdfs-questoes-tp64dr` com: o que mudou, a lista dos 12 itens conferidos e os prints.
- Siga o `AGENTS.md` para o resto (validação e publicação).
