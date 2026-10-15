# Auditoria geral do site Orto Questões (15/10/2026)

Documento de trabalho para o Tales e para qualquer agente de IA (Claude Code, Codex, ChatGPT ou outro)
que for mexer no site. Ele responde a três perguntas: **o que está como está**, **o que está errado ou
inconsistente** e **o que fazer, em que ordem, e o que pode ser feito em paralelo**.

Pedido que originou este documento (Tales, 15/10/2026): analisar o site por completo (início, treinar,
sessão de questões com as alternativas, cronograma, desempenho, planos, conta, ranking, flashcards e o
painel do administrador), botões, direção de arte, funcionalidade e experiência; o site cresceu aos
poucos e "virou um Frankenstein de pequenas mudanças"; o objetivo é **consistência**, design fluido,
código mais leve e mais fácil de manter, com liberdade para refazer o que for preciso, inclusive do zero,
desde que a funcionalidade continue. O site tem "pegada" pixel art, mas é um site sério, não um jogo.

## 0. Como usar este documento

- **Seção 1**: resumo executivo (as 12 coisas que mais importam).
- **Seção 2**: regras que valem para qualquer agente que trabalhar nestas tarefas.
- **Seção 3**: o que foi visto na tela (capturas reais, 390 / 820 / 1440 px, claro e escuro).
- **Seção 4**: diagnóstico transversal (design system, arquitetura, qualidade de código).
- **Seção 5**: direção de arte: onde a pixel art entra e onde não entra (proposta a decidir pelo Tales).
- **Seção 6**: **backlog priorizado**, organizado em trilhas paralelas, com dependências e tamanho.
- **Seção 7**: brainstorm por página (ideias além do conserto).
- **Anexos A a G**: os relatórios completos de cada área, com caminho:linha de cada achado. São longos
  de propósito: um agente que pegar uma tarefa da seção 6 deve ler o anexo da área antes de começar.

Legenda de tamanho: **P** (até meio dia de um agente), **M** (1 a 2 dias), **G** (3 dias ou mais).
Marcas: **[T]** precisa de decisão do Tales; **[SQL]** precisa de migração/RPC no Supabase (colar em
`supabase/colar-no-painel/` e mandar o SQL como texto na conversa, regra do AGENTS.md); **[arte]**
precisa de arte autoral nova.

## Método

- Leitura integral do código das áreas (sete auditorias em paralelo, uma por área, somente leitura), com
  `caminho:linha` em cada achado. O código tem 41.414 linhas em `src/` (30 páginas, 63 componentes,
  26 CSS de página, 2.001 linhas em `base.css`, 2.555 em `Flashcards.css`).
- Build de produção (`npm run build`, ok em 6,2 s; `tsc --noEmit` ok) e `vite preview`.
- 93 capturas de página inteira com Playwright (Chromium), em 390×844 (celular, toque), 820×1180
  (tablet) e 1440×900 (computador), com conta de exemplo (assinante anual, administrador, 1.261
  respostas sintéticas e cronograma) e sem conta; tema claro e escuro. Zero erros de console, zero
  rolagem horizontal, zero exceções de página.
- Medições: tamanho dos chunks de `dist/`, dos JSON do acervo, das imagens e das fontes.
- Testes do repositório (`npm test`, 17 scripts) rodados: todos passam. Nenhum foi alterado.
- Uma seleção de 22 capturas está em `docs/auditoria/capturas-2026-10-15/` e o script que as gera (com a conta
  de exemplo simulada) em `docs/auditoria/capturar-paginas.mjs`, para qualquer agente repetir a medição.

## 1. Resumo executivo

1. **O site funciona e não quebra.** Em 93 capturas, nenhum erro. Os problemas são de hierarquia,
   repetição, consistência visual e dívida de código, mais alguns bugs lógicos de fluxo.
2. **Página inicial com 14 blocos e 8.927 px no celular.** O estudo ("o que faço agora") aparece na 6ª
   tela, depois de perfil incompleto, ranking, assinatura e indique. A meta de hoje é repetida 3 vezes.
3. **Três linguagens visuais convivem na mesma página** (cartão branco plano, cartão escuro pixel/ouro
   com sombra dura, herói verde com borda pixelada), e na central de flashcards entra uma quarta (serif).
   A página de pagamento usa fonte pixel nos títulos. Falta uma regra de **onde** a pixel art entra.
4. **Design system existe pela metade**: tokens em `tokens.css`, mas ~60 cores hex literais nos CSS de
   página, 11 classes de "chip", 6 implementações de controle segmentado, 4 implementações de diálogo,
   12 `window.confirm`, 7 breakpoints diferentes, CSS morto em quase todo arquivo (estimativa: 15 a 20%).
5. **Bugs de fluxo na sessão de questões**: sessão concluída continua respondível pelo botão Voltar;
   seis páginas iniciam uma sessão nova por cima da atual sem avisar; "ordem da prova" é ignorada ao
   montar; dissertativa registra a letra "A"; alternativa sem comentário some em silêncio; o selo
   `conferido` (revisão médica) prometido nos tipos não aparece em lugar nenhum.
6. **Performance no celular**: cada tecla na busca do Treinar re-renderiza o App e roda ~500 mil
   comparações; o cartão de questão faz dois `JSON.parse` do histórico inteiro por render (por segundo
   no simulado); a sincronização lê **todas** as linhas do progresso a cada 5 segundos.
7. **Sincronização com risco de perda silenciosa**: o fallback de `upsert` direto anula a detecção de
   conflito por versão; cota do localStorage estourada cai em memória sem aviso.
8. **Comentário médico no celular**: tabelas de 3+ colunas são cortadas (2.578 comentários usam tabela);
   itálico aparece com asteriscos (171 comentários). O conteúdo é o produto; a renderização precisa
   fazer jus a ele.
9. **Painel do administrador**: funciona, mas 10 abas sobrepostas, `.adm-alerta` usada 25 vezes e
   inexistente no CSS (erros aparecem como texto comum), erro e sucesso com a mesma cor verde, 19
   diálogos nativos, lista de usuários sem paginação com polling de 30 s da RPC mais pesada, receita
   reconstruída a partir dos preços atuais (não dos pagamentos reais). Vale reestruturar em 5 seções.
10. **Página de planos vende para quem já assinou**, e o fluxo "criar conta → assinar" perde o destino
    (`voltar`) depois do cadastro; o cadastro pede 11 campos obrigatórios.
11. **Flashcards** (ver Anexo F): o jogo está rico, mas há peças inacabadas visíveis na central
    (cartões "Torneio" e "Meu desempenho" sem imagem), o CSS de 2.555 linhas e o nome "Cripta" precisam
    de cerca para não vazar para o site.
12. **Ferramental**: sem ESLint/Prettier/stylelint, sem teste de componente, Playwright de verificação
    existe mas não roda no CI, testes de fixtures dependem de `esbuild` transitivo. Fácil de ligar e é o
    que permite vários agentes trabalharem ao mesmo tempo sem se atropelar.

## 2. Regras para qualquer agente que pegar uma tarefa daqui

1. Ler `AGENTS.md`, `CLAUDE.md` e este documento (a seção da área + o anexo correspondente).
2. **Nunca** alterar questões, gabaritos, comentários, preços, limites, benefícios de plano nem dados de
   usuários. Textos comerciais só com o Tales.
3. Uma tarefa = um branch = um PR pequeno e revisável, com o número da tarefa deste documento no título
   (ex.: `T2.3 Debounce da busca do Treinar`). Não misturar trilhas.
4. Antes de abrir o PR: `npm run typecheck`, `npm test`, `npm run build`, e **capturas reais** em 390,
   820 e 1440 px (claro e escuro) de toda página tocada, com `docs/auditoria/capturar-paginas.mjs`.
5. Mudança visual segue a seção 5 (direção de arte) e usa só tokens de `src/estilos/tokens.css`. Cor nova
   vira token antes de ser usada.
6. Ao apagar código/CSS, provar que está morto (`grep` do nome em `src/`), e listar no PR o que foi apagado.
7. Nada de dependência nova sem justificar no PR (peso no bundle, licença).
8. Ao terminar, marcar `[x]` na tarefa na seção 6 deste documento, com o número do PR.
9. Nome do produto: "Orto Questões". Sem emoji na interface. "Flashcards" fora do jogo, nunca "Cripta".
10. Se a tarefa pedir SQL, o arquivo vai em `supabase/colar-no-painel/` e o SQL inteiro vai como texto no
    PR e na conversa.

## 3. O que se vê na tela (inspeção visual, 390 / 820 / 1440 px, claro e escuro)

Método: build de produção (`npm run build`, `vite preview`), Playwright com Chromium, conta de exemplo (assinante anual, administrador, 1.261 respostas sintéticas, cronograma montado) e visitante sem conta; tema claro e escuro; página inteira capturada. Alturas medidas da página inteira no celular (390 px), que é o indicador mais direto de "quanto o residente precisa rolar":

| Página | Altura em 390 px | Leitura |
|---|---|---|
| Início (logado) | 8.927 px | 14 blocos; ~23 telas de celular |
| Início (visitante) | ~8.500 px | igual, com blocos que exigem conta |
| Treinar | 4.748 px | 4 passos + simulados + 400 px de folga para a barra fixa |
| Questão respondida | 4.178 px | enunciado + comentário completo + 6 blocos de ação |
| Revisão | 3.234 px | ok |
| Caderno de erros | 7.682 px | lista inteira sem paginação |
| Seu desempenho | 7.238 px | 11 cartões |
| Cronograma | 8.052 px | "Como funciona" aberto com 9 blocos no fim |
| Ranking | 4.630 px | 3 blocos dizem "você está em #4" |
| Conquistas | 18.052 px | 168 emblemas, ~46 telas |
| Planos (assinante) | 5.968 px | vende para quem já comprou |
| Conta | 4.459 px | perfil inteiro de novo |
| Temas que mais caem | 9.065 px | lista inteira |
| Resumão | 20.105 px | lista inteira |
| Termos | 45.912 px | sem índice |
| Flashcards (central) | 4.382 px | ok |
| Painel do admin (visão geral) | 2.009 px | ok; abas rolam |

Nenhum erro de console, nenhuma rolagem horizontal, nenhum erro de página em 93 capturas. O que aparece é problema de **hierarquia, repetição e consistência**, não de quebra.

### 3.1 Transversal
- **Faixa de cookies do Meta cobre a ação principal no celular.** Em 390 px ela fica logo acima da barra inferior e tapa: o botão "Responder N questões" do Treinar (barra fixa), o "Criar conta grátis" do `ExigeConta`, a alternativa C da questão e o "Entendi" do tour. Até a pessoa decidir, a primeira ação de cada página está escondida. Mover para o topo ou para um cartão no fluxo, ou reduzir a um "chip" de uma linha.
- **Barra inferior com 7 itens** (Início, Treinar, Flashcards, Cronograma, Ranking, Desempen…, Menu): "Desempenho" é truncado em 390 px; a barra aparece até para visitante, levando a 5 páginas que pedem conta.
- **Três linguagens visuais na mesma página**: (a) cartões brancos planos arredondados (atalhos, estudo de hoje, por tema); (b) cartões escuros "verde-noite + ouro + fonte pixel + sombra dura" (Cronograma, Ranking, Indique, Siga no Instagram); (c) herói verde com borda inferior "pixelada". Na página de planos, (b) domina (títulos em Jersey 10 "Três coisas que economizam meses de estudo", "Perguntas frequentes") e o checkout volta para (a). Na central de flashcards entra uma quarta voz: serif (Alegreya) nos títulos dos cartões. Decisão a tomar: **onde a pixel art pode aparecer** (sugestão na seção 5: ranking, conquistas, flashcards, detalhes de microinteração; nunca em preço, pagamento, conta, termos, admin, comentário médico).
- **Mesmo número, três definições**: "Sequência 28 dias" no herói da capa, "Constância 0 dias seguidos com 10+ questões" no cronograma, "28 dias seguidos" nas conquistas. O residente vê 28 e 0 na mesma sessão.
- **Meta de hoje aparece 3 vezes na capa** (herói "Meta de hoje: 0 de 47", cartão Cronograma "0 de 47", botão "Seguir o cronograma") e de novo no Treinar.
- **"Complete seu perfil" ocupa a primeira tela inteira** da capa (e do tema escuro) antes do herói, toda vez, para quem ainda não preencheu: é a primeira coisa que um assinante vê ao abrir o site. Também reaparece integral na Conta.
- **Botões de ícone sem rótulo visível** na questão (olho, estrela, bandeira, link, livro); têm `aria-label`? conferir; no celular ninguém sabe o que é o olho.
- **Tema escuro** está bem resolvido no geral (contraste bom nos cartões da questão); o cartão "Complete seu perfil" fica com borda dourada sobre fundo quase preto, ok.

### 3.2 Início
- Ordem para o logado: perfil incompleto → herói → cronograma → ranking → assinatura → indique → 4 atalhos → estudo de hoje → onde erra → o que a prova cobra → 4 "recursos de assinante" (cartões que parecem botões e são só descrição) → 7 dias → últimas sessões → por tema → Instagram → rodapé de 25 links. Conteúdo de estudo só na 6ª tela.
- Frase do herói sorteada ("Estude como quem opera", "Que tal um simulado hoje", "Treino é treino, prova é jogo", "Mão, coluna, quadril: escolha a sua linha") muda a cada carregamento e, para o visitante, não diz o que é o site.
- "Seus recursos de assinante": 4 cartões brancos com ícone pixel e texto, sem ação clara (parecem clicáveis).
- Rodapé: 25 links em 3 colunas no celular; "Indique e ganhe" na coluna "Assinante".
- 1440 px: a grade funciona, mas a página continua com ~5.000 px.

### 3.3 Treinar
- Bom: "Sessão rápida" e atalhos de 10 no topo, passos numerados, resumo fixo com "Responder N questões".
- Provas como 6 cartões altos empilhados no celular (uma tela só para escolher a prova); poderiam ser chips.
- A trilha de passos (1, 2, 3…) no celular é uma fita horizontal cortada ("3" aparece pela metade).
- 11 temas com "N subtemas" cada: funciona, mas o seletor em árvore no celular ocupa 2 telas.
- Bloco "OrtoQuestões Simulados" repetido (no passo 1 como prova e no fim como cartão dourado).
- ~400 px vazios antes do rodapé (reserva da barra fixa) aparecem como buraco quando a barra some.

### 3.4 Sessão e questão
- Cabeçalho "Questão" com 4-5 ícones; chips TEOT · 2025 / Joelho / Lesões meniscais; imagem; alternativas A-D (a prova tem 4; o código precisa tratar 5); "Escolha uma alternativa" desabilitado.
- Depois de responder: faixa vermelha "Você errou. Gabarito: A…", comentário em cartão verde-claro com "Conceito-chave", **tabela de 3 colunas cortada no celular** (coluna "Consequência" some; não há rolagem horizontal visível), "Na prova" em caixa amarela, "Alternativa por alternativa" (bom), "Sobre este comentário", "Este comentário te ajudou?", "Comentários da comunidade" (texto longo para um estado vazio), "Minhas anotações", "Histórico", "Relatar erro", "Editar questão" (admin), "Treinar este tema" / "Montar outra sessão". São **11 blocos abaixo do gabarito**; o que importa (por que errei) está no meio.
- Sem sessão: estado vazio correto, mas a página inteira é um cartão e 600 px de nada.
- Sticky header do site aparece no meio da captura (é só artefato da captura inteira); no uso real o cabeçalho fixo rouba 56 px da questão no celular. Vale um modo foco que esconda o cabeçalho ao rolar para baixo.

### 3.5 Revisão, favoritas, caderno de erros
- Revisão: herói claro ("30 questões esperam por você", "Começar com 10", "Fazer as 30"), calendário de carga por cor, dia selecionado, ritmo. Boa página; "Acerto histórico: 0%" no dia de hoje é confuso (as 30 são atrasadas trazidas).
- Caderno de erros: 7.682 px, lista inteira de erros com comentário resumido; falta paginação/agrupamento por tema e ação em lote.

### 3.6 Seu desempenho
- Herói com anel 74%, "Sincronizando…" permanente na captura (estado de sync no meio do herói); 4 KPIs; período; mapa de 4 semanas; pontos de atenção; números (7 cartões); semana a semana (tabela boa); por prova; **dia da semana com 7 barras iguais** (72-77% viram barras cheias: gráfico sem informação); sensação × resultado; por tema; backup; nota "722.9 kB neste perfil".
- Ordem razoável, mas 11 cartões; "Seus números" poderia ser um só cartão com 2 colunas.

### 3.7 Cronograma
- Segue o PLANO.md: tour, "Onde você está" (trilho), Hoje (lista do dia, Continuar, Adiantar, Se sobrar tempo), Amanhã, Esta semana, Depois, Como você está indo, blocos recolhidos. Esta é hoje a página mais consistente do site.
- "Como o seu cronograma funciona" vem **aberto** com 9 blocos de texto (3 telas) no fim; deveria estar recolhido como os outros.
- "Constância 0 dias" × "28 dias" (ver transversal). "Progresso 0 de 2.790 (100% previsto até a reta final)" confunde.
- Tour "Seu cronograma em 3 partes" ocupa a primeira tela; bom na primeira visita, precisa sumir de vez depois do "Entendi" (conferir persistência).

### 3.8 Ranking e conquistas
- Ranking: herói pixel "Arena dos residentes", 3 KPIs, "Sua posição #4" (1), abas Questões/Flashcards/Conquistas, cartão "Suas conquistas", Geral/7 dias, Liga, "Escadaria do salão", pódio em pixel art com vitral (bonito), lista top 3 (2), lista 4-10 com "você" (3), "Como funciona". A posição aparece três vezes; a página tem 3 heróis.
- Conquistas: 18.052 px, 168 emblemas em grade 3×N com descrição e barra em cada um; os bloqueados em cinza tracejado. Precisa de abas por família, filtro "em andamento", e emblemas bloqueados compactos.
- Ligas: funciona como esboço (1 tela).

### 3.9 Planos
- Visitante: preço claro (R$ 19,99/mês no anual, R$ 239,90/ano, "de R$ 478,80"), "Menos que um almoço", CTA "Criar conta e assinar", garantia, Pix ou cartão. Bom.
- Assinante: faixa "Seu plano anual está ativo" e, abaixo, **toda a página de venda** (três coisas, simulador, FAQ). Para assinante deveria virar "Minha assinatura" (renovação, recibo, cancelar) e nada mais.
- Simulador: "Data da prova 01/10/2027" (input nativo, formato depende do navegador) ao lado de "até 10 de jan de 2027": o input mostra mm/dd em navegador inglês. Escrever a data por extenso ao lado.
- Títulos em fonte pixel numa página de pagamento (ver transversal).

### 3.10 Conta
- Herói escuro com avatar, e-mail, "Sincronizando seu progresso… 1275 pendentes", 3 botões; "Termos de uso atualizados" como cartão; 6 abas; perfil com 12 campos (o mesmo bloco do "Complete seu perfil"). "Data de nascimento mm/dd/yyyy" (input nativo).

### 3.11 Flashcards (central)
- Hero com arte pixel (montanha) e título serif; abas Central/Meu desempenho/Meu cronograma; "Meu cronograma" (montar); "Revisões de hoje" com 4 contadores; "Por assunto" select + "Estudar 20"; "Como funciona" (3 passos); "Por onde seguir" com 3 cartões: **Torneio e Meu desempenho têm a área da imagem vazia (retângulo verde-escuro)**, só a Biblioteca tem imagem; ranking; opinião. Beta visível e honesto.

### 3.12 Painel do administrador
- 10 abas em duas linhas (1440) ou fita rolante (390); KPIs com "—" e "rode a migração nova" (mensagem técnica para o dono); 4 listas. Sóbrio, mas o cabeçalho usa fonte pixel e borda "pixelada" (é ferramenta).

### 3.13 Páginas longas de conteúdo
- Temas que mais caem (9.065 px) e Resumão (20.105 px): listas inteiras sem índice/abas por área; Termos (45.912 px) sem sumário. Precisam de navegação interna (índice fixo, abas por área, "voltar ao topo").

## 4. Diagnóstico transversal

### 4.1 Design system: existe pela metade

Números medidos (Anexo E tem a tabela por arquivo):

| Métrica | Valor |
|---|---|
| Linhas de CSS | 12.056 em 37 arquivos (base 2.001, Flashcards 2.555, premium 972) |
| CSS global baixado em toda visita | 157 KB (deveria ser ≤ 60 KB) |
| `!important` | 297 (208 no Flashcards, 18 em temporada.css) |
| Cores hex literais fora de `tokens.css` | 2.312 (1.257 no Flashcards; 215 Ranking; 103 recursos; 95 premium; 49 Início) |
| `style={{` inline nos TSX | 164 em 40 arquivos |
| Valores distintos de `z-index` | 36 (de -2 a 1000) |
| Larguras de `@media` distintas | 38 (rem e px misturados) |
| Valores distintos de `box-shadow` | 427 |
| Valores distintos de `font-size` | 231 (52 abaixo de 12 px) |
| Famílias de botão | ≈ 35 (`.botao`, `fc-botao`, `vd-botao-ouro`, `cp-botao`, `tr-heroi__rapida`…) |
| Famílias de cartão | 13 (`.cartao`, `adm-cartao`, `tema-cartao`, `ct-cartao`, `pe-cartao`…) |
| Classes de chip/selo | ≈ 20; o "selo pixel" copiado à mão em 6 lugares |
| Mecanismos de modal | 8 (`.painel`, `.jc`, `.modal-central`, `.janela-imagem`, `.cf-email__veu`, `.cd`, `.fc-modal-veu`, `.convite`) |
| Controles segmentados | 6 implementações, 4 formas de marcar o ativo (`aria-pressed`, `aria-checked`, `aria-selected`, classe `ativo`) |
| `window.confirm/prompt/alert` | 12 nas páginas + 19 no painel |
| Classes CSS sem uso | ≈ 536 de 2.929 (18%) |
| Fontes | 6 famílias, 8 woff2 (153 KB), sem preload; Pixelify importada em 12 arquivos |

O que isso significa na prática: `tokens.css` é bom (paleta, tema escuro, herói com horizonte pixel), mas
o resto do CSS o ignora. `temporada.css` é uma **camada de override com `!important`** sobre componentes
que não foram desenhados para ela: é daí que vem a sensação de Frankenstein. Não há tokens de espaço, raio
(na prática), sombra, duração nem z-index; a altura da barra inferior do celular está escrita de 7 formas
diferentes em `calc()`.

Contraste (WCAG) com falha real: letra branca sobre `--acerto`/`--erro` no tema escuro (2,3:1 e 2,9:1,
na alternativa certa/errada da questão), `--ouro` como texto no claro (3,8:1), bordas de campo no escuro
(1,3:1), anel de foco invisível sobre o botão principal no escuro. "Tema do sistema" não funciona: não há
`@media (prefers-color-scheme: dark)` nos tokens.

Veredito: **não adotar Tailwind** (seria uma segunda linguagem sobre 12 mil linhas legadas); adotar
**stylelint** com baseline, criar `src/componentes/ui/` com 8 componentes base (Botão, Cartão, Chip,
Campo, Janela, Toast, Tabela, Estado) que reproduzem o visual atual, migrar página a página e só então
apagar o CSS morto. CSS Modules só para páginas novas e para o jogo. Plano detalhado no Anexo E §6.

### 4.2 Arquitetura e dados (Anexo G)

- **Fluxo**: JSON estático do acervo (índice 1,57 MB bruto; questão e comentário fatiados por id no
  build) → respostas em localStorage por conta → fila de sincronização → Supabase (RPC com versão e
  advisory lock). Limite diário decidido no servidor (não é burlável no cliente; confirmado). Roteador
  por hash: manter (GitHub Pages, dois domínios, links já divulgados).
- **Riscos de dados**: (1) o fallback de `upsert` direto quando a RPC de sync falha anula a detecção de
  conflito por versão (`sincronizacao.ts:255-260`); (2) a sincronização lê **todas** as linhas do
  progresso a cada 5 s com a aba visível, em todas as abas (cursor calculado e nunca usado);
  (3) cota do localStorage estourada cai em memória sem aviso; (4) duas abas podem apagar pendentes uma
  da outra; (5) `decodeURIComponent` sem `try` no roteador derruba a página com um hash malformado;
  (6) `VERSAO_TERMOS` existe duas vezes com valores diferentes.
- **Bundle**: caminho crítico da capa ≈ 250 KB gzip (bom), mas `supabase` (30 KB) entra para visitante
  e `premium.css`/`temporada.css` entram em toda visita. `FlashcardsJogo` 413 KB + 239 KB de CSS, lazy.
  `dist/` tem 261 MB (14 mil arquivos fatiados + 138 MB de imagens sem WebP; 47 imagens > 500 KB).
- **Qualidade**: `strict` ligado, 0 `any` (bom). Sem ESLint, Prettier ou stylelint; 19 comentários
  `eslint-disable` sem ESLint instalado; 68 `catch` silenciosos; 50 `let` de módulo com 6 implementações
  diferentes de "cache por conta"; `esbuild` usado pelos testes sem estar declarado; Playwright de
  verificação existe (`fixtures/verificacao.mjs`) mas não roda no CI; nenhum teste de componente nem de
  `sincronizacao.ts`, `armazenamento.ts`, `rotas.ts`, `acervo.ts`.
- **Arquivos gigantes**: `Arena.tsx` 1.701 linhas, `regras.ts` 1.336, `CartaoQuestao.tsx` 884,
  `conquistas.ts` 908, `PlanoEstudo.tsx` 766, `Treinar.tsx` 662, `Conta.tsx` 572, `Assinatura.tsx` 564,
  `Apoio.tsx` 545 (três páginas num arquivo).

### 4.3 Padrões repetidos que viram tarefas únicas

Vários achados são o mesmo problema em lugares diferentes. Cada um é uma tarefa só:

| Padrão | Onde | Solução única |
|---|---|---|
| `iniciar(sessão)` por cima de sessão em andamento, com ou sem `confirm` | 7 páginas | `iniciarSessaoComAviso()` em `estado/sessao.ts` com `JanelaCentral` |
| Portão de conta + limite diário ao responder | `Sessao.tsx`, `QuestaoDireta.tsx` | hook `usarResponderComLimite()` |
| Texto do limite gratuito (com/sem `LIMITES_HABILITADOS`) | 8 componentes com textos diferentes | `fraseGratis()` em `config.ts` |
| Preço "R$ 19,99/mês" digitado | `CartaoPlanos`, `MenuGeral` ×2 | derivar de `planos.ts` |
| `chaveDia`/`inicioDia` com fusos diferentes | `planoRevisao.ts` × `limiteDiario.ts` | renomear `chaveDiaLocal` / `chaveDiaBrasilia` |
| "Respondidas / acerto" calculado de 3 jeitos | Início, Conta, Desempenho | `usarResumoDesempenho()` |
| Cache por conta (`let` de módulo) | `plano`, `premium`, `administrador`, `feitos`, `indicacao`, `google` | `usarRpcPorConta(nome, chave)` |
| Catálogo de navegação | Cabeçalho, Menu, Rodapé, Vitrine | `catalogoNavegacao.ts` |
| Copiar texto com `window.prompt` de reserva | 5 componentes | `copiarTexto()` |
| Ritmos e `proximaProva` | `Assinatura.tsx` × `AteAProva.tsx` (valores divergentes) | `dados/ritmos.ts` |
| Fechar com Esc + clique fora | `SeletorArvore`, `SeletorMultiplo`, `Painel` | hook `usarFecharFora()` |
| Negrito/destaque em markdown | `TextoEditorial`, `Resumao.comNegrito` | só `TextoEditorial` |

## 5. Direção de arte: onde a pixel art entra (proposta para o Tales decidir)

Hoje há **três famílias** convivendo: (1) "temporada pixel" (Jersey 10 + Pixelify, ouro `#f4cf7c` sobre
tinta `#1b1208`, sombra em degrau), aplicada por override; (2) o jogo de flashcards em HD-2D (Cinzel +
Alegreya, molduras douradas, 112 animações), que vaza para a capa, os planos e a central; (3) o Salão
dos Campeões no ranking (Cinzel 900, confete). Mais dois sistemas de ícone (traço e PNG pixel) lado a lado.

Proposta de regra, simples o bastante para caber numa linha do AGENTS.md:

> **A pixel art é assinatura, não tema.** Ela aparece nos **números** (dias até a prova, posição no
> ranking, contador de questões, % de acerto, em Jersey 10), no **horizonte** dos heróis e do rodapé, nos
> **emblemas e no ranking**, e dentro do **jogo de flashcards**. Nunca em título de página, botão de
> pagamento, formulário, termos, comentário médico, cartão de questão ou painel do administrador.

Consequências concretas:
- Títulos (h1/h2) voltam para Plus Jakarta Sans em todo o site, com uma escala só; Jersey fica para os
  algarismos de destaque ("Faltam **87** dias").
- Um único botão dourado (`.botao--ouro`), um único "cartão pixel" opt-in (`.cartao--pixel`, borda 2 px
  e sombra em degrau) usado só em ranking/conquistas/convite; `temporada.css` desaparece como override.
- O mascote (mensageiro) aparece em três momentos fixos (vazio, 404, e-mail enviado), em 48 px, sem pulo.
  O guerreiro, só em ranking e flashcards. `EsperaPixel` ("Afiando o fêmur…") sai do fluxo de conta e
  pagamento.
- Planos e capa apresentam os Flashcards com uma captura real do jogo dentro de um cartão normal, com chip
  "Beta"; Cinzel e Alegreya deixam de ser carregadas fora do jogo.
- Ícones: `Icone.tsx` (traço) em navegação e ações; `IconePixel` só em emblemas e cenas.
- Microinterações com `steps(2)` em 120 a 200 ms (hover sobe 1 px em dois passos, barra enche em blocos
  de 8 px): o pixel sentido no movimento, não na forma.
- Tema escuro como "sala de estudo": superfícies planas, ouro só em números e no anel de foco.

Alternativa, se o Tales preferir manter a temporada RPG forte: então ela precisa ser desenhada **como
componentes** (não como override), com os mesmos 8 componentes base em versão `--pixel`, e a regra passa
a ser "pixel em tudo, menos pagamento, conta, termos, comentário médico e admin".

## 6. Backlog priorizado, em trilhas paralelas

Como ler: **P0** = fazer primeiro (bugs que perdem dados ou enganam o usuário, e as fundações que
destravam o resto); **P1** = consistência e os problemas de experiência mais sentidos; **P2** = refatoração
estrutural; **P3** = ideias novas. Cada trilha pode ser tocada por um agente diferente ao mesmo tempo;
dentro da trilha, a ordem importa. "Depende de" aponta a tarefa que precisa estar mesclada antes.
Marcar `[x]` com o número do PR ao concluir.

### Fase 0 · Fundações (1 agente, antes das outras trilhas; 2 a 3 dias)

- [ ] **F0.1** Ferramental: ESLint flat config (`typescript-eslint` recommended, `react-hooks`, `jsx-a11y`) em modo `warn` + Prettier (ou Biome); `stylelint` com baseline (hex fora de tokens, `!important`, px em `@media`, `no-duplicate-selectors`); scripts `lint`, `lint:css`; `esbuild` declarado em devDependencies. Sem corrigir nada ainda, só medir. **P** — Anexo G §4-5, Anexo E §6.4.
- [ ] **F0.2** `vitest` + `@testing-library/react` + `happy-dom`; portar as fixtures `.mjs` existentes; primeiros testes de `rotas.ts`, `armazenamento.ts`, `modeloSync.ts`, `acervo.ts` (filtrar/contar/montarSessao). **M** — Anexo G §4.
- [ ] **F0.3** Playwright no CI (`verificar-pr.yml`): converter `fixtures/verificacao.mjs` em specs; capturas de regressão em 390/820/1440 × claro/escuro nas 8 rotas principais, com Supabase desligado. **M** — Anexo G §5.
- [ ] **F0.4** Tokens novos em `tokens.css` sem remover os antigos: espaço (`--e-1..8`), raio (`--raio-sm/md/lg/pill`), sombra (`--sombra-1/2/pixel`), duração/curva, z-index (`--z-sticky..--z-jogo`), `--altura-barra-movel`, `--altura-cabecalho`, `--pixel-tinta/-ouro/-ouro-sombra/-selo-fundo/-selo-texto`, `--acerto-texto/--erro-texto/--aviso-texto`, `--foco`; `@media (prefers-color-scheme: dark)` para "sistema" funcionar; `theme-color` e pré-carga do `index.html` com valores dos tokens. **P** — Anexo E §6.1 e tarefas 1, 2, 4.
- [ ] **F0.5** `src/componentes/ui/` com Botão, Cartão, Chip, Campo, Janela (absorvendo `JanelaCentral`), Toast, Tabela, Estado, reproduzindo o visual atual com os mesmos nomes de classe (sem diff visual). **M** — Anexo E §6.2. Depende de F0.4.
- [ ] **F0.6** `knip` para código morto; apagar o que já está provado morto: `SeletorMultiplo.tsx`, `CartaoStreak.tsx`, `CartaoQuestaoDoDia.tsx`, `FasesCronograma`, `exportarDados/importarDados/lerVisitante`, `ParComCripta`, `possuiVisitante/importar/obrig` em `Conta.tsx`, `dica:teclado`, `VITE_SUPABASE_ANON_KEY` do workflow, `FAMILIAS[].unidade`, `PodioPixel cena="festa"`, `podio-festa.png`; unificar `VERSAO_TERMOS` duplicada. **P** — Anexos A, B, C, G.

### Trilha 1 · Dados, sincronização e segurança (1 agente)

- [ ] **T1.1** Remover/condicionar o fallback de `upsert` direto em `sincronizacao.ts:255-260` e `:331-335` (só quando a RPC não existe, 404), preservando a checagem de versão. **P** — Anexo G §2.1.
- [ ] **T1.2** Leitura incremental por cursor (`gt('versao', cursor)`), reconciliação completa só no primeiro sync e ao voltar do offline; intervalo de 5 s → 30-60 s; eleger uma aba líder com `navigator.locks`. **M** — Anexo G §2.1. Depende de F0.2.
- [ ] **T1.3** `QuotaExceededError` em `armazenamento.ts:73` com aviso visível ("progresso só na nuvem") e `navigator.storage.persist()` ao entrar. **P**.
- [ ] **T1.4** `try/catch` em `rotas.ts:23` (`decodeURIComponent`) → `NaoEncontrada`; `split('?')` → `indexOf('?')` (busca com "?"). **P**.
- [ ] **T1.5** Centralizar as 40 chamadas diretas a `localStorage` em `infra/chaves.ts` (nome, prefixo, versão por chave). **M**.
- [ ] **T1.6** Validar forma das respostas das RPCs críticas (`autorizar_resposta`, `sincronizar_progresso`, `obter_acesso_premium`) com `valibot`/`zod` mini. **M**.
- [ ] **T1.7** Hook único `usarRpcPorConta(nome, chave)` substituindo os 6 caches de módulo (`plano`, `premium`, `administrador`, `feitos`, `indicacao`, `google`); um só contexto "assinatura/premium" (uma RPC) e `AvisoBloqueioDiario` sem RPC por rota. **M** — Anexos A §0, G §4.
- [ ] **T1.8** Telemetria mínima de erros: `window.onerror`/`unhandledrejection` → RPC `registrar_erro` com rate limit; lista no painel. **M [SQL] [T]**.

### Trilha 2 · Sessão de questões e cartão (1 agente; é o coração do produto)

- [ ] **T2.1** Sessão concluída não continua interativa: `/sessao` com `concluidaEm` redireciona para `/resumo`; `Resumo.tsx:384` não `encerrar()` antes de navegar. **P** — Anexo B §2.
- [ ] **T2.2** `iniciarSessaoComAviso()` único em `estado/sessao.ts` (confirma com `Janela`, finaliza a anterior), usado por Treinar, Favoritas, CadernoErros, Revisao, Resumo, TemasQueMaisCaem, SimuladoNacional. **M** — Anexo B §2, §6. Depende de F0.5.
- [ ] **T2.3** Respeitar `embaralhar=false` ("ordem da prova") em `montarSessao` (`acervo.ts:429-444`). **P**.
- [ ] **T2.4** Tirar `lerRespondidas()` do render do cartão (`CartaoQuestao.tsx:267, 501`); `memo` no cartão e callbacks estáveis em `Sessao`; `setInterval` do cronômetro com dependência estável; `useEffect` dos atalhos com deps. **P**.
- [ ] **T2.5** Mostrar `conferido` ("Revisado por médico" / "Ainda sem revisão médica") no cabeçalho do comentário; alinhar `Progresso.tsx:166-168`. **P [T texto]**.
- [ ] **T2.6** Alternativa sem análise no comentário aparece como "Sem análise desta alternativa" (`CartaoQuestao.tsx:703-705`); script em `scripts/validar_acervo.py` apontando comentários incompletos em questões de 5 alternativas. **P**.
- [ ] **T2.7** Dissertativa não registra a letra "A" (`CartaoQuestao.tsx:130`, `sessao.ts`, `CadernoErros.tsx:257`). **M**.
- [ ] **T2.8** Falha de rede ao autorizar resposta mostra erro junto ao botão (não o painel de limite) (`Sessao.tsx:418`). **P**.
- [ ] **T2.9** `TextoEditorial`: itálico `*x*`, `\|` escapado, `##`; tabela responsiva abaixo de 40 rem (cartão por linha ou sombra de rolagem com "deslize"); snapshot dos 10 comentários mais complexos do acervo. **M** — Anexo B §4.
- [ ] **T2.10** Acessibilidade do cartão: `role="radiogroup"/"radio"`, `aria-disabled` em vez de `disabled` após responder (permite selecionar texto), alvos de 44 px (`.riscar`, `.qz-ferramenta`, `.tema-cartao__sub`), rótulos nos ícones do cabeçalho, contraste do escuro (`#fff` sobre `--acerto/--erro`). **M** — Anexos B, E.
- [ ] **T2.11** Confiança sempre visível antes de "Responder" + barra fixa no celular sem salto de layout; dica de confiança também no celular. **M**. Depende de T2.4.
- [ ] **T2.12** Reduzir ações da sessão: fundir "Pular" em "Próxima", mover "Próxima não respondida"/"Encerrar" para "…", regra única de "Concluir"; `fimMostrado` em `sessionStorage`; `touchmove` passivo (`usarDeslizar.ts:95`) com `touch-action: pan-y`. **P/M**.
- [ ] **T2.13** Rolar para a análise da letra marcada ao errar; pré-carregar a próxima questão (texto e imagem) ao responder; `loading="eager"` e `onError` na figura principal. **P**.
- [ ] **T2.14** Grifo: persistir por offsets de texto ou remover (hoje quebra em qualquer reflow). **M [T]**.
- [ ] **T2.15** Dividir `CartaoQuestao.tsx` em `Alternativas`, `AcaoResponder`, `Resultado`, `ComentarioDaIA`, `Comunidade`, `Grifo`, `Dissertativa`; `Sessao.tsx` em `BarraSessao`, `NavSessao`, `usarDicasSessao`, `usarResponderComLimite` (compartilhado com `QuestaoDireta`). **G**. Depois de T2.1-T2.13.

### Trilha 3 · Treinar, revisão, caderno, desempenho (1 agente)

- [ ] **T3.1** Debounce de 200 ms na busca; `useDeferredValue` nas contagens; atualizar a URL em `requestIdleCallback`; `favoritos` como `Set`; reaproveitar `porId` em `carregarQuestoes`. **M** — Anexo B §3.
- [ ] **T3.2** Campo numérico clampa no `blur`, não a cada tecla; validar temas/subtemas/provas da URL contra o índice; `telaLarga` reagindo a resize; um só "Começar" (tirar o da trilha). **P**.
- [ ] **T3.3** Pílulas de situação em posição fixa; passo 2 aberto no celular; provas como chips. **P/M**.
- [ ] **T3.4** Caderno de erros: `useMemo` nos filtros, paginação/agrupamento por tema, `type="button"`, `duplicataDe` tratado como no Progresso. **M**.
- [ ] **T3.5** Desempenho: gráfico "dia da semana" com eixo real; "Sincronizando…" fora do herói; fuso único (`chaveDiaLocal` vs `chaveDiaBrasilia` renomeados e usados certo); `usarResumoDesempenho()` compartilhado com Início e Conta. **M** — Anexos A §4, B §5.
- [ ] **T3.6** Dividir `Apoio.tsx` em `Sobre`, `Contato`, `Desempenho`; renomear "DadosLocais" para "Desempenho" em rota, título, conta e termos; modo exemplo completo com "Tela ilustrativa". **M**.
- [ ] **T3.7** Bandeira "marcar para revisão" com destino (lista "Marcadas" + bloco no Resumo) ou remoção. **M [T]**.
- [ ] **T3.8** Temas que mais caem, Resumão e Termos com índice/abas por área e "voltar ao topo"; Resumão aceita `?tema=`. **M**.

### Trilha 4 · Início, planos, conta, navegação (1 agente)

- [ ] **T4.1** Reordenar a página inicial por estado (logado × visitante), cortar de 14 para ~8 blocos, "Complete seu perfil" vira uma linha dispensável, H1 fixa para visitante, meta de hoje uma vez só, esconder para visitante os blocos que exigem conta. **M [T ordem]** — Anexo A §2, seção 3.2.
- [ ] **T4.2** Flash do `AteAProva` (expor "carregando" em `usarCronogramaHoje`); links `areas=` sem `quadril`; `semana` com dependência de data. **P**.
- [ ] **T4.3** Barra inferior com 5 itens (visitante: 4) e `catalogoNavegacao.ts` único para Cabeçalho, Menu, Rodapé e Vitrine; faixa de cookies de uma linha que não cobre ações. **M [T itens]**.
- [ ] **T4.4** `fraseGratis(LIMITES_HABILITADOS)` única; preço derivado de `planos.ts` em `CartaoPlanos` e `MenuGeral`; "metade do preço" derivado. **P** — Anexo A §0.
- [ ] **T4.5** Honrar `voltar` depois do cadastro (e-mail e Google) e passar `voltar` no `PortaoConta`; "Esqueceu a senha" leva o e-mail digitado. **M** — Anexo A §5.
- [ ] **T4.6** Página de planos para assinante vira "Minha assinatura"; estado "pagamentos desligados" coerente; barra fixa com `aria-hidden` correto; extrair `PreviaCronograma` e `Checkout`; ritmos/`proximaProva` em `dados/ritmos.ts` compartilhado com `AteAProva`; data por extenso ao lado do input. **M**.
- [ ] **T4.7** Conta: seções e `modo` na URL (`/conta/perfil`…), `role="group"` + `aria-pressed`, um canal de mensagem só; dividir `Conta.tsx` em Acesso + 5 seções. **G**.
- [ ] **T4.8** Cadastro em 2 passos (e-mail, senha, prova; o resto em "Complete seu perfil"). **M [T]**.
- [ ] **T4.9** Atualizar "Como funciona hoje" na página do projeto; decidir sobre o total do acervo na interface; claim "um dos mais baratos" em `LimiteRespostas.tsx:181`. **P [T]**.
- [ ] **T4.10** Unificar os 4 diálogos (`ModalEntrar`, `ModalConfirmarEmail`, `Painel`, confirms) sobre `Janela`; `ConviteDiario` sem sondar o DOM por classe. **M**. Depende de F0.5.
- [ ] **T4.11** Reduzir as 5 superfícies de indicar/compartilhar a 2; `copiarTexto()` único. **P**.

### Trilha 5 · Cronograma, ranking, conquistas (1 agente)

- [ ] **T5.1** `metaPlanejada` com o calendário de tipos (leve/difícil/folga): teto não dispara em plano novo (`planoEstudo.ts:362-368`) + caso na fixture. **P** — Anexo C §1.
- [ ] **T5.2** Preservar `adiantados`/`semanasDificeis` ao salvar ajustes (`PlanoEstudo.tsx:567-571`); gravar local de verdade quando o servidor falha; registro de hoje não reescrito por mudança de meta. **P/M** — Anexo C §3.
- [ ] **T5.3** `calculo` revalidado à meia-noite e no `visibilitychange`; um só "faltam N dias". **P**.
- [ ] **T5.4** "Depois" recolhido sempre mostra Reta final e Prova; estados visuais iguais ao PLANO (atrasado laranja, parcial, marco dourado tracejado); `HojeRetaFinal` no visual novo; `corDaArea` em desempenho/risco/home/fim de sessão; trocar a cor de `mao` (colide com o dourado). **M**.
- [ ] **T5.5** "Como o seu cronograma funciona" recolhido por padrão; "Ajustar" no topo; tour some após "Entendi" (inclusive na vitrine só quando assinar). **P**.
- [ ] **T5.6** Vitrine do não assinante sem números e com um CTA só (orientação de 14/10). **M**.
- [ ] **T5.7** Critério único de sequência/constância e nomes distintos (fogueira × constância × chama) em `streak.ts`, `hubCronograma.ts`, ranking e capa; "cumprido" na semana = meta do plano. **M [T]**.
- [ ] **T5.8** Performance do motor: tirar `focosQueFaltam` de `calcularPlano`, indexar `idsDoFoco`; debounce das 3 simulações na montagem; `montarHub` em `useMemo`. **M**.
- [ ] **T5.9** Hook único `usarCronograma()` para PlanoEstudo, CaixasAssinante e Resumo; `TrilhaJornada` com semana real. **G**. Depois de T5.1-T5.3.
- [ ] **T5.10** Ranking com um herói só (posição uma vez), "Como funciona" com o critério do número na dobra, `meuTotal` igual ao do servidor, menos animações simultâneas (sem `pixel-flutua` global em emblemas), tipografia de jogo única na página. **M**.
- [ ] **T5.11** Conquistas: abas por família, filtro "Quase lá / Conquistadas / Todas", secretas num baú, explicar "99/100" dos Mestres, bloqueados compactos; separar `conquistas.ts` em dados/métricas/famílias. **G**.
- [ ] **T5.12** Ligas: `prompt`/`confirm` → `Janela`, `aria-live` ao copiar, visual alinhado ao ranking; constância em grupo. **M [SQL] [T]**.
- [ ] **T5.13** Fuso único nas conquistas (`feitos.ts`, `streak.ts`, `metricasDoServidor`). **P**.

### Trilha 6 · Painel do administrador (1 agente; pode começar junto com a Fase 0)

- [ ] **T6.1** Criar `.adm-alerta`; variante erro de `.adm-mensagem`; separar sucesso/erro em Ficha, Ajustes, RecursosPagos; `erroDoPainel` usando `ErroRpc.codigo/status`; mensagens de migração em "parte N (colar-no-painel)". **P** — Anexo D §1, §9.
- [ ] **T6.2** Shell não substitui o painel por alerta em erro de refresh; "Atualizando…" e bloqueio de duplo clique. **P**.
- [ ] **T6.3** Camada `usarRpc` com cache, dedupe, abort, polling só na seção visível; um só dono de `listar_usuarios_admin`; RPC leve `contadores_admin` e desmontar `AdminConteudo` escondido. **M [SQL]**.
- [ ] **T6.4** Lista de usuários paginada/virtualizada, busca com debounce, `ativoHoje` memoizado. **M**. Depende de T6.3.
- [ ] **T6.5** Roteamento completo por hash (`pushState`, estado de filtros/id na URL). **M**.
- [ ] **T6.6** Reorganizar em 5 seções (Hoje, Pessoas, Receita, Conteúdo, Operações) com navegação lateral/barra inferior; tirar Lembretes de Crescimento e Simulados de Ajustes; sem pixel art no painel. **G**. Depende de T6.5.
- [ ] **T6.7** `Dialogo` acessível + `Toasts`; substituir os 19 `window.confirm/prompt/alert`; focus trap na ficha. **M**.
- [ ] **T6.8** Ficha do usuário com aba "Assinatura e pagamentos" (RPC `assinatura_usuario_admin`) e reprocessar ali; Pagamentos liga evento a usuário, aguarda após reprocessar, mostra código de erro real, link para o Mercado Pago. **G [SQL]**.
- [ ] **T6.9** Receita: corrigir `somarMeses` (dia 31), `pagaSemCobranca`, fuso; testes de `receita.ts`; depois RPC `cobrancas_admin` com valores reais. **M→G [SQL]**.
- [ ] **T6.10** Editor de questões: salvar diff por campo (ou hash do acervo + aviso "acervo mudou"), aviso de não salvo, id na URL. **M**.
- [ ] **T6.11** `Tabela<T>` genérica com modo cartão no celular (Perfis, Mensal, Indicações, Lembretes). **M**. Depende de F0.5.
- [ ] **T6.12** CSS do painel: 2 breakpoints, tokens (`--online`), sem classes mortas/`!important`; log de auditoria de ajustes comerciais; contas de teste como flag no banco. **M [SQL]**.

### Trilha 7 · Design system e migração visual (1 a 2 agentes; depois de F0.4-F0.5)

- [ ] **T7.1** Contraste: `#fff` → `--sobre-acerto/--sobre-erro`; texto sobre véu com `--*-texto`; bordas de campo no escuro com `--traco-forte`; anel `--foco` visível sobre `--verdete`. **P** — Anexo E §1.2.
- [ ] **T7.2** Fontes: preload de Jakarta e Jersey; Jersey só onde há herói; Pixelify num único módulo; Cinzel/Alegreya fora da capa, planos e central de flashcards. **P**.
- [ ] **T7.3** Substituir os 7 `calc(4.xrem…)` e os z-index 1000/200/100/90 pelos tokens; breakpoints para {30, 40, 56, 75} rem; consolidar as 7 regras do cabeçalho. **M**.
- [ ] **T7.4** `<Chip>` único (substitui os 6 selos pixel copiados e `rk-voce/qz-origem/cm-selo/ti-nivel/pg-selo`…); `<Botao>` substitui `vd-botao-ouro`, `cp-botao`, `tr-heroi__rapida`, `concluir-flutuante`, `aviso-bloqueio-topo__cta`; `Segmentado` único substitui as 6 implementações. **M**.
- [ ] **T7.5** `temporada.css` reduzido a modificadores opt-in (`.cartao--pixel`, `.numero--pixel`) sem `!important`; títulos Jersey só nos números (`--display` único); pixel fora do admin, do pagamento e da sessão. **M [T, seção 5]**.
- [ ] **T7.6** Migração página a página (Início → Treinar → Sessão → Resumo → Ranking → Conta → Planos → Revisão/Erros → Cronograma → Admin): hex → tokens, componentes base, utilitários `.mt-*` no lugar de `style`, breakpoints oficiais, sem `!important`. **G** (paralelizável por página, uma por PR).
- [ ] **T7.7** Apagar CSS morto (~536 classes), fundir `premium.css`/`recursos.css`/`temporada.css` no que sobrar; `impressao.css` só na Sessão; mover para CSS de página o que é de uma rota; meta: global ≤ 60 KB. **M**. Depois de T7.6.
- [ ] **T7.8** Animações só com `transform/opacity` fora do jogo; `backdrop-filter` do cabeçalho só em ≥ 56 rem; densidade/tamanho de fonte com efeito real (px → rem; `.pagina--compacta` com margin). **P**.
- [ ] **T7.9** Imagens: converter as 47 > 500 KB para WebP ≤ 1600 px (script Python), `srcset` em `FiguraAmpliavel`; `premium.css`/`temporada.css` e `supabase` fora do chunk inicial. **M**.

### Trilha 8 · Flashcards (1 agente; ver Anexo F)

Estado real: nada do beta está desligado por trava; o que está "desligado" é código morto. Dos itens
marcados feitos no PLANO-DE-IDEIAS, três não batem com o código (contador da rota, tutorial "jogável",
golpe por vilão). Só 26 das 44 aparências do bestiário têm folha de sprite assada.

- [ ] **T8.1** "Jogar a Cripta" → "Jogar o Torneio" (`CentralFlashcards.tsx:102`); texto da jornada no ranking do site (`RankingCripta.tsx:33`) conforme JORNADA-UNICA; cartões "Torneio" e "Meu desempenho" da central com imagem. **P**.
- [ ] **T8.2** `Arena.tsx:966` usar `novaChave()` com fallback (Safari antigo trava sem mensagem); `aplicar/responder` em try/catch com mensagem. **P**.
- [ ] **T8.3** Trava em voo no "Virar" do Estudo (`Estudo.tsx:228`): duplo toque gasta 2 flashcards grátis. **P**.
- [ ] **T8.4** Não criar partida/corrida no servidor ao abrir só a Biblioteca (`FlashcardsJogo.tsx:20`, `Arena.tsx:225`). **M**.
- [ ] **T8.5** Memória de áudio: LRU de 3-4 faixas em `sons.ts:610` e pré-carga reduzida no celular; jingles no canal "Efeitos"; `AudioContext` suspenso fora do jogo. **M**.
- [ ] **T8.6** Motor: roubo do Mímico só quando o golpe acerta (`regras.ts:841`), poção com carga > 1 (`:832, :847`), rótulo da sinergia "Pronto-socorro", `comprar` com baralho vazio; testes. **P**.
- [ ] **T8.7** Acervo: não cachear falha, avisar "modo demonstração" e botão tentar de novo (`dados/acervo.ts:19-37`). **P**.
- [ ] **T8.8** Recarregar em `fase:'resposta'` restaura `marcadas/resultado`; sincronizar progresso ao sair pelo X; `recordes.partidas` na partida automática. **P**.
- [ ] **T8.9** Contador da rota ("faltam N de 10"), superpoderes sempre visíveis na placa, "seu golpe causa X" na intenção. **P/M**.
- [ ] **T8.10** Tutorial jogável da Batalha (1 golem, 3 cartas, intenção, 1 poder, 1 porta) com baralho demo. **M**. Depende de T8.4.
- [ ] **T8.11** Assar as 18 aparências sem folha (raptor ×3, dragões escarlate/ancestral, gosma sinovial, corvo, morcego, cavaleiro ×3, espectro ×3, quimera ×3, mão, leviatã, rei ×2, arconte, harpia, escaravelho) com `scripts/sprites`. **G [T estilo] [arte]**.
- [ ] **T8.12** Limpeza: Torre, `NIVEIS`/`pesoDoFlashcard`, componente `RankingCripta` morto, ranking por nível, `floresta.*` órfão, `pintarCena` procedural (cenas já pintadas), classes `--celular/--deitado`; atualizar `config.ts:55`, ROTEIRO.md, PLANO 13/80. **M**. Depois de T8.2-T8.8.
- [ ] **T8.13** `Flashcards.css`: consolidar as "eras", reduzir os 208 `!important`, faixa própria de z-index; Central sem Cinzel/Alegreya. **G**. Sozinho (toca tudo).
- [ ] **T8.14** Política da vida grátis × curva (com 60% de acerto o residente joga 17 flashcards e acaba o dia). **M [T] [SQL se mudar a janela]**.
- [ ] **T8.15** Medição em aparelho real (FPS no crítico, memória, som) e Playwright de interface no `npm test`. **M [T aparelho]**.
- [ ] **T8.16** Conquistas do jogo ligadas ao sistema do site; estágio/título no ranking. **M [SQL]**.

### Ordem sugerida para 6 agentes em paralelo

| Semana | Agente A | Agente B | Agente C | Agente D | Agente E | Agente F |
|---|---|---|---|---|---|---|
| 1 | F0.1-F0.6 | T6.1-T6.3 | T2.1-T2.4 | T5.1-T5.3 | T1.1, T1.3, T1.4 | T8 (flashcards: inacabados) |
| 2 | F0.4-F0.5 → T7.1-T7.3 | T6.4-T6.7 | T2.5-T2.10 | T5.4-T5.8 | T1.2, T1.5-T1.7 | T3.1-T3.4 |
| 3 | T7.4-T7.5 | T6.8-T6.10 | T2.11-T2.13 | T5.9-T5.11 | T4.1-T4.5 | T3.5-T3.8 |
| 4+ | T7.6 (por página) | T6.11-T6.12 | T2.14-T2.15 | T5.12-T5.13 | T4.6-T4.11 | T7.6 (por página) |

Decisões que só o Tales pode tomar e que destravam tarefas: (1) regra da pixel art (seção 5);
(2) itens da barra inferior; (3) ordem dos blocos da capa; (4) cadastro em 2 passos; (5) critério único de
sequência; (6) texto do selo de revisão médica; (7) total do acervo na interface; (8) datas oficiais do
TARO/ENARE; (9) manter ou tirar a bandeira "marcar para revisão" e o grifo.

## 7. Brainstorm por página (ideias além do conserto)

Ideias próprias desta auditoria somadas às dos anexos. [T] decisão do Tales · [SQL] servidor · [arte] arte nova.

### 7.1 Página inicial
1. **Duas capas, não uma.** Visitante: H1 fixa ("Questões das provas oficiais de ortopedia, comentadas alternativa por alternativa"), uma questão de amostra **respondível** sem gravar (demonstra o produto) [T], o que a conta grátis dá, planos, prova social ("X residentes estudaram esta semana" [SQL]). Logado: herói com "o que fazer agora" (uma ação), estudo de hoje + onde erra, semana, por tema; promoções (ranking, planos, indique) só no fim.
2. **Cortar de 14 para 8 blocos.** Fundir "4 atalhos" com "Seu estudo de hoje" (mesmos destinos); fundir CartaoPlanos + VitrineAssinante + CaixasAssinante num bloco "Assinante"; "Seus recursos de assinante" vira lista de links reais, não cartões-descrição.
3. **"Complete seu perfil" vira uma linha** ("Faltam 3 dados · 20 s · Completar") abaixo do herói, nunca a primeira tela; some por 7 dias ao dispensar.
4. **Limite do dia visível** ("14 de 20 grátis hoje") no herói do gratuito: a pessoa percebe o valor do plano antes de bater no muro.
5. **Retomar sessão** ("Você parou na 7 de 20 · Joelho · Continuar") no topo, quando houver.
6. **Uma frase motivacional por dia**, não por carregamento (seed pela data), e só para logado.
7. Barra inferior com 5 itens (Início · Treinar · Flashcards · Desempenho · Menu) [T]; Cronograma e Ranking no Menu; visitante vê barra reduzida (Início · Treinar · Planos · Entrar).
8. Rodapé de 25 links vira 3 grupos recolhíveis no celular.
9. "Suas últimas sessões" com link "ver todas" para Desempenho; "Por tema" com um clique monta a sessão (já faz) mas mostra "N para revisar" por tema.
10. Faixa de cookies no topo, de uma linha, que não cobre ação nenhuma.

### 7.2 Treinar
1. **Montar em 3 toques** no celular: folha "O que · Quais · Quantas" com padrões (Ortopedia · Não respondidas · 20) e um botão; "Ajustar mais" abre a página completa.
2. **Presets salvos** ("Joelho não respondidas 20") no herói; o URL já é a chave [SQL se sincronizar].
3. Provas como **chips** numa linha rolável, não 6 cartões altos.
4. Passo 2 (situação) sempre aberto no celular; 3 e 4 fechados; pílulas de situação em posição fixa (nunca somem, só ficam cinza com 0).
5. Botão fixo mostra a escolha: "Responder 20 · Joelho · não respondidas".
6. Busca com debounce e contagem em Web Worker (ou índices pré-calculados por tema/situação).
7. Estimativa de tempo pelo ritmo real da pessoa (o Resumo já calcula), não 0,8 min fixo.
8. Um só "Começar": tirar o da trilha de passos (há três na mesma tela).

### 7.3 Sessão e cartão de questão
1. **Barra única de resposta no celular**: confiança (3 segmentos, último valor lembrado) + "Responder B" fixos no rodapé; ao responder vira "Por que errei ↓ · Próxima →". Sem salto de layout.
2. **Riscar por gesto** (deslizar a alternativa para a esquerda) no celular; X de 44 px no desktop.
3. **"Por que errei" em um toque**: ao errar, rolar para a análise da letra marcada, não para o topo.
4. **Acordeão por alternativa** no comentário: a sua e a correta abertas, as outras recolhidas; cabeçalho mostra "% da turma marcou" para assinante.
5. **Selo "Revisado por médico" / "Ainda sem revisão médica"** lendo `conferido` (prometido nos tipos e no Progresso, hoje invisível) [T texto].
6. **Modo prova real** opcional: sem combo/XP/pixel, cronômetro recolhido até 5 min do fim, sem comentário até entregar, folha de respostas; respeitar "ordem da prova".
7. Tabela do comentário em **cartões por linha** abaixo de 40 rem (cabeçalho repetido em cada célula) ou com sombra de rolagem; itálico suportado.
8. A-/A+ no cabeçalho do cartão (tamanho da fonte da questão); modo leitura em tela cheia.
9. Marcar para revisar com destino: lista "Marcadas" + filtro de situação + bloco no Resumo (hoje a bandeira é um beco).
10. Cronômetro por questão opcional, pausado ao sair da aba; comparação "você 48 s · turma 1 min 10 s" [SQL].
11. Pré-carregar a próxima questão (texto e imagem) ao responder a atual.
12. Avaliação do comentário com um gesto (Ajudou / Não ajudou) e motivo opcional depois.
13. Reduzir a tela de responder: 3 ações na barra inferior (Anterior · Próxima/Concluir · "…"); setas laterais só no desktop; dicas uma vez só.
14. Cabeçalho do site some ao rolar para baixo na sessão (modo foco de verdade).

### 7.4 Revisão, favoritas, caderno de erros
1. Caderno de erros agrupado por tema com contagem, paginado (20 por vez), com "Treinar só estes" por grupo e "Marcar como entendido" em lote.
2. Revisão: "Começar com 10" como primário e "Fazer as 30" secundário (já é); calendário mostra a carga futura prevista com o ritmo atual (projeção) e "o que vence se eu pular hoje".
3. Favoritas com etiquetas (as etiquetas já existem no cartão) e filtro por etiqueta.
4. Explicar "Acerto histórico 0%" (são atrasadas trazidas) ou esconder quando não há histórico.

### 7.5 Seu desempenho
1. Gráfico "Dia da semana" com eixo real (as barras hoje são todas iguais): mostrar respostas por dia como altura e acerto como cor.
2. Comparação com a turma por tema ("seu acerto em Joelho vs média") como recurso do assinante [SQL].
3. Exportar imagem do desempenho para Instagram (já há `imagemStreak`).
4. "Seus números" em um cartão só, 2 colunas; "Sincronizando…" sai do herói e vira ícone discreto no cabeçalho.
5. Modo exemplo completo ("Tela ilustrativa") para visitante, ou nenhum.
6. Renomear a rota/página para "Desempenho" em todo lugar (hoje: Seu desempenho, DadosLocais, Dados e backup, dados locais).

### 7.6 Cronograma
1. "Como o seu cronograma funciona" recolhido por padrão (como os blocos vizinhos); tour some de vez depois do "Entendi".
2. Uma só definição de sequência/constância em todo o site (ou dois nomes claramente diferentes, nunca "28" e "0" na mesma sessão).
3. Lembrete no horário escolhido por notificação do site (PWA push) [SQL/servidor]; hoje só .ics.
4. Resumão do tema abrindo na área certa (item 23 do PLANO.md, meio feito).
5. Duas provas no mesmo plano (TARO + TEOT) com datas oficiais [T, item 14 do PLANO.md].
6. Cronograma em grupo na Liga (constância da turma) [SQL].
7. Trilha ilustrada até a prova em pixel art (mapa com fases e o castelo) também para o Instagram [arte].
8. Vitrine para quem não assina com exemplo real do histórico da pessoa (orientação de 14/10) — conferir se está completa.

### 7.7 Ranking, conquistas, ligas
1. Ranking com **um** herói: posição, movimento e "faltam N para passar X" uma vez só; pódio e lista abaixo; "Como funciona" recolhido.
2. Conquistas em **abas por família** + filtro "em andamento" + emblemas bloqueados compactos (ícone cinza e barra), não 168 cartões de 240 px.
3. Mostrar estágio/título do herói ao lado do nome (ideia 60 do PLANO-DE-IDEIAS).
4. Ligas: convite com link + código, placar semanal, "quem está estudando agora" [SQL].
5. Ranking semanal com reset e temporada mensal (já há "7 dias"): deixar claro o que é "geral".

### 7.8 Planos e pagamento
1. **Assinante vê "Minha assinatura"**, não a página de venda: plano, renovação, recibo, cancelar, trocar de plano.
2. Fluxo "criar conta → checkout" contínuo (honrar `voltar` após cadastro e Google).
3. Checkout em página própria (`/assinatura/pagar`) em vez de modal: no celular é apertado e permite voltar do Mercado Pago.
4. Modo "sem limite" (quando `LIMITES_HABILITADOS=false`): vender cronograma e simulado, não "sem limite".
5. Prova social e depoimentos [T]; "custo por questão respondida" pessoal em vez de comparações.
6. FAQ: trocar de plano, recibo/nota, compartilhar com colega.
7. Simulador de cronograma escreve a data por extenso ao lado do input (o navegador mostra mm/dd em alguns aparelhos).
8. Títulos em Jakarta (não pixel) na página de pagamento; selo de pagamento seguro.

### 7.9 Conta
1. **Cadastro em 2 passos** [T]: e-mail + senha + prova; o resto em "Complete seu perfil" depois.
2. Seções da conta na URL (`/conta/perfil`…) e reagindo a links externos (hoje `?secao=` é ignorado se a página já está aberta).
3. "Plano: Gratuito · 14/20 hoje" no herói da conta com CTA.
4. Sessões ativas ("Chrome no Android, há 2 dias") e "sair dos outros aparelhos" [SQL].
5. Exclusão de conta por botão com confirmação [SQL].
6. Avisar claramente "um aparelho por vez" na hora de entrar (fonte de suporte).

### 7.10 Indicar
1. Prévia da mensagem do WhatsApp; QR code do link para o plantão.
2. Faixa "Convite de X aplicado: responda 20 questões" na capa depois do cadastro por convite.
3. Placar com iniciais e status dos convidados [SQL].
4. Reduzir as 5 superfícies de "indique/compartilhe" para 2 (página + um cartão na capa).

### 7.11 Projeto, contato, termos
1. Reescrever "Como funciona hoje" na página do projeto (fala de uso livre e cobrança futura; hoje há planos e limite).
2. Termos com índice lateral, âncoras por cláusula e resumo em lista; teste que confere os preços de `planos.ts` nos dois textos.
3. Contato por formulário no servidor (mailto falha no celular) [SQL/função].
4. Temas que mais caem e Resumão com abas por área e índice fixo; "voltar ao topo".

### 7.12 Flashcards
1. **Plantão de 10**: rota diária curta com chefe garantido no fim, feita para a conta grátis; conta no ranking semanal [SQL].
2. **Revanche**: ao cair, recomeçar o andar com os 3 flashcards errados como primeiros do baralho, sem gastar vida [SQL].
3. **Mapa da descida** na tela de fim: andares, chefes vencidos e onde cada flashcard foi errado.
4. Ranking semanal por área ("Mestres da Mão desta semana") [SQL].
5. Dueto/turma: semente compartilhada por link, mesma masmorra, placar entre colegas [SQL].
6. "Você errou esta questão em 03/10" no verso do flashcard (liga `respondidas` ao flashcard).
7. Skins do herói por conquista, sem vantagem [arte].
8. Monstro da semana com bônus e arte em destaque na central [arte].
9. Modo "Preceptor": segunda chance com pergunta de lacuna gerada do comentário, dano pela metade se acertar.
10. Biblioteca com paleta e trilha por área e selo "100 flashcards de Mão" [arte/música].
11. Fora do jogo, apresentar os Flashcards como recurso sério: captura real do jogo num cartão normal, chip "Beta", sem fontes do jogo na central nem na capa.



---

# Anexo A · Páginas públicas, início, planos, conta (relatório completo)

## Auditoria (somente leitura) — páginas públicas e de venda do Orto Questões

Escopo lido integralmente: `src/App.tsx`, `src/util/rotas.ts`, `src/config.ts`, `src/dados/planos.ts`, `src/paginas/{Inicio,Assinatura,Apoio,Termos,CondicoesAssinatura,Conta,DetalhesAssinatura,Indicar}.tsx`, os 23 componentes pedidos, `src/estilos/paginas/{Inicio,Assinatura}.css`, `src/estilos/tokens.css`, mais consultas pontuais a `conta/plano.ts`, `conta/premium.ts`, `conta/google.ts`, `estado/limiteDiario.ts`, `componentes/{AmostraQuestao,PodioPrevia,BotaoGoogle,Estados}.tsx` e `.github/workflows/publicar.yml`.

Contexto que condiciona várias conclusões: `VITE_LIMITES_HABILITADOS` e `VITE_PAGAMENTOS_HABILITADOS` vêm de *vars* do GitHub (`publicar.yml:57-58`), então o site tem dois "modos" (com e sem limite diário / com e sem pagamento) e boa parte dos textos só trata um deles.

---

### 0. Achados transversais (afetam várias páginas)

#### Problemas
- **ALTA · Mensagem do "limite diário" inconsistente entre páginas.** `Assinatura.tsx:245,258,282,337`, `AteAProva.tsx:469`, `Termos.tsx:124`, `CondicoesAssinatura.tsx:24` condicionam o texto a `LIMITES_HABILITADOS`. Já `ExigeConta.tsx:94`, `config.ts:495` (`FRASE_GRATIS`, usada em `PortaoConta.tsx:126`), `Apoio.tsx:432` (DadosLocais), `Conta.tsx:345` (vitrine do login), `ConviteCompartilhar.tsx:25` (mensagem do WhatsApp), `CartaoPlanos.tsx:19` ("questões sem limite"), `LimiteRespostas.tsx:187` prometem/avisam limite **sempre**. Se a var estiver desligada, o site diz ao visitante que há limite enquanto a página de planos diz "sem limite nesta fase". Centralizar numa única função de texto (`fraseGratis(LIMITES_HABILITADOS)`).
- **ALTA · Preço "R$ 19,99/mês" digitado à mão** em `CartaoPlanos.tsx:18`, `MenuGeral.tsx:410` e `MenuGeral.tsx:427`. `planos.ts` é a fonte; `LimiteRespostas.tsx:156` já deriva (`POR_MES_ANUAL`). Mudar o preço quebra 3 lugares silenciosamente.
- **MÉDIA · Quatro implementações de diálogo**: `JanelaCentral` (`.jc`), `Painel` (`.painel` + `.veu`), `ModalEntrar` (`.modal-central` + `.veu`, CSS em `Inicio.css:18-51`), `ModalConfirmarEmail` (`.cf-email__veu`, CSS próprio). Cada uma reimplementa focus trap/Escape (`ModalEntrar.tsx:164-186`, `ModalConfirmarEmail.tsx:298-318`). Consolidar em `JanelaCentral`.
- **MÉDIA · Cores fora dos tokens repetidas em vários arquivos**: o "ouro pixel" `#f4cf7c` aparece em `Inicio.css:421,423,425,540,541,549`, `Assinatura.css:7`, `Rodape.tsx:516-517`; `#ffe3a3` em `Apoio.tsx:395` (SVG), `CartaoStreak.tsx:426`, `Inicio.css:318`, `Assinatura.css:367`; `#1b1208`/`#6b4a0c` em `Assinatura.css:8-9`, `Inicio.css:443`; `#7ee0c8/#7fe0cf` em `Inicio.tsx:55-56`, `Inicio.css:121,244,499`, `Assinatura.css:61,374`; verde WhatsApp `#1fa855` em `Inicio.css:350-357`. `tokens.css` só tem `--marca-certa: #f4cf7c`. Criar `--pixel-ouro`, `--pixel-ouro-sombra`, `--pixel-tinta`, `--menta`, `--whatsapp`.
- **MÉDIA · Pixel art em etapas críticas**: página de venda inteira em Jersey 10 com sombras duras (`Assinatura.css:15-43`), confirmação de e-mail como "Missão: confirmar o e-mail / Sua carta está a caminho!" (`ModalConfirmarEmail.tsx:342-343`), indicação como "Missão: recrute seus amigos" (`SecaoIndique.tsx:534`), rodapé "Missão bônus" (`Rodape.tsx:535`), convite diário com "Mensageiro" e fala letra a letra (`ConviteDiario.tsx:36,114-121`). Dentro da **mesma** página de venda, o checkout (`.ck`, `Assinatura.css:360-422`) volta ao estilo arredondado normal. Decisão do Tales: onde a estética de jogo entra (ranking, flashcards, conquistas) e onde não (pagamento, auth, termos, suporte).
- **MÉDIA · Regra da marca "não citar número total de questões"** é violada na interface: `Apoio.tsx:52` (`indice.total` em "Questões"), `Assinatura.tsx:50` ("Contamos {BASE_CONTAGEM} questões das provas oficiais"), `Assinatura.tsx:429-433,505` (totais da prévia). A regra está escrita para divulgação; confirmar com Tales se vale para o site.
- **MÉDIA · Excesso de pedidos de compartilhar/indicar**: `SecaoIndique` (home), `ConviteDiario` (pop-up após 5 min, `ConviteDiario.tsx:20`), `ConviteCompartilhar` (resumo), `MenuGeral.tsx:432` (Indique), `Rodape.tsx:532` (Instagram "Missão bônus"), `Rodape.tsx:503` (Indique na coluna "Assinante"). Cinco superfícies para a mesma ação.
- **BAIXA · `@fontsource/pixelify-sans` importado em 14 arquivos** (`Inicio.tsx:21`, `AteAProva.tsx:7`, `ConviteDiario.tsx:6`, `ModalConfirmarEmail.tsx:2`, `Indicar.tsx:12`...). O bundler deduplica, mas é ruído; importar uma vez em `main.tsx` como já se faz com Jersey 10 (`main.tsx:9`).
- **BAIXA · `'Alegreya'` referenciada em `Inicio.css:587` sem ser carregada** (só o jogo de flashcards a carrega). Na capa cai em Georgia: único serif do site, aparece "do nada" no quadro de flashcards.

---

### 1. `App.tsx` e `rotas.ts`

#### Como está
Roteamento por hash, lazy por página, títulos em tabela, `ExigeConta` envolvendo rotas de questões, pop-up do jogo por cima do site. Bem organizado.

#### Problemas
- **BAIXA** `App.tsx:53-91` `TITULOS` cobre `/dados` como "Seu desempenho", mas o componente se chama `DadosLocais`, a seção da conta chama "Dados e backup" (`Conta.tsx:558`), o botão "Desempenho e backup" (`Conta.tsx:560`) e os Termos linkam "dados locais" (`Termos.tsx:156`). Quatro nomes para a mesma página.
- **BAIXA** `App.tsx:149` usa `rota.consulta?.get` (opcional) embora `consulta` nunca seja undefined; `App.tsx:146` idem sem `?`. Inconsistente.
- **BAIXA** Rota `/entrar` (`App.tsx:167`) existe mas nenhum link do escopo a usa (todos vão para `/conta?modo=...`); só o título. Manter como redirecionamento ou remover da tabela.
- **BAIXA** `rotas.ts:302` `bruto.split('?')` quebra se o valor de `busca` contiver `?` (ex.: busca "fratura?"): o resto vira segunda parte e se perde. Usar `indexOf('?')`.

#### Brainstorm
1. Rolagem para o topo (`App.tsx:248-254`) ignora `prefers-reduced-motion`; já é `auto`, ok. Mas poderia restaurar a posição ao voltar (history) nas páginas longas (Início).
2. `TITULOS` poderia incluir `description` por rota para o `<meta>` (SEO das páginas públicas).
3. Mover `ehJogo` e `PAGINAS_DO_SITE_FLASHCARDS` para `flashcards/` (App não deveria saber quais seções são jogo).

---

### 2. Página inicial — `src/paginas/Inicio.tsx` (+ `Inicio.css`)

#### Como está
512 linhas num só componente. Ordem dos blocos (logado): aviso de sessão → CompletarPerfil → herói (frase do dia, provas, CTA, KPIs ou quadro de flashcards) → faixa flashcards → `CartaoCronograma` → `AteAProva` (se sem cronograma) → ranking → `CartaoPlanos` → `SecaoIndique` → 4 atalhos → grade "Seu estudo de hoje" + "Onde você mais erra" → `ConviteLimiteDoDia` → `CaixasAssinante` (temas que mais caem) → `VitrineAssinante` → grade "7 dias" + "últimas sessões" → "Por tema" → bloco SEO (só visitante). São 14 blocos.

**O que um visitante novo entende em 5 s:** a H1 é uma frase motivacional aleatória ("Carga progressiva, todos os dias." — `frasesInicio.ts`), não o produto. O que diz o que é o site são os chips "Provas oficiais comentadas" (pequenos, `Inicio.css:457-462`, 0.78rem) e a `AmostraQuestao` à direita (boa). A promessa "banco de questões das provas oficiais, comentadas, grátis todo dia" não está em nenhuma frase do herói para visitante; o `incentivo` da frase (`Inicio.tsx:202`) é outro slogan.

#### Problemas
- **ALTA · Hierarquia**: para quem está logado e quer estudar, "Seu estudo de hoje" (`Inicio.tsx:345`) vem **depois** de ranking (`:300`), planos (`:317`), indique (`:319`) e atalhos (`:321`). Três blocos promocionais antes do conteúdo de estudo. Para o visitante, atalhos (`:321-342`), "Seu estudo de hoje" (`:345-369`) e "Por tema" (`:438-462`) linkam para `/treinar`, que cai no `ExigeConta`: a página convida a clicar em coisas que vão pedir conta, e mostra contadores "0" de revisões.
- **ALTA · Flash de layout**: `Inicio.tsx:297` mostra `AteAProva` quando `!cronograma.calculo`; em `CaixasAssinante.tsx:26` `plano` começa `undefined` e `calculo` só existe depois de `obterPlano()` resolver. Assinante com cronograma vê `AteAProva` aparecer e sumir a cada carregamento (layout shift de ~400 px). Esperar `plano !== undefined` (há o estado tri-valorado justamente para isso, mas o hook não o expõe como "carregando").
- **MÉDIA · Áreas hardcoded**: `Inicio.tsx:352,357,362,387,452` repetem `areas=base,enare,coluna,mao` cinco vezes, e **omitem `quadril`**, que está em `AREAS_TREINO` (`tipos.ts:226`). As contagens do bloco usam `AREAS_TREINO` (`Inicio.tsx:76`), então o número mostrado ("Revisar hoje: 12") pode não bater com a sessão aberta (sem quadril). Usar `filtrosParaConsulta`.
- **MÉDIA · `semana` memoizado só por `respondidas`** (`Inicio.tsx:113-137`) mas depende de `Date.now()`: aba aberta além da meia-noite mantém "Hoje" errado. Mesmo em `quandoFoi` (`:38`). Baixo impacto, mas é bug.
- **MÉDIA · `ParComCripta`** (`Inicio.tsx:510-512`) é um wrapper que só devolve `children` com comentário desatualizado; `Inicio.tsx:350` tem `{( <div/> )}` sem motivo. Código morto.
- **MÉDIA · Componentes mortos**: `CartaoStreak.tsx` e `CartaoQuestaoDoDia.tsx` não são importados por ninguém (grep em todo `src`). Idem CSS: `.cartao-streak__chama`, `.cartao-streak--marco` (definido 2× em `Inicio.css:71` e `:288`), `.acao-rapida*` (só `__contador` usado), `.inicio-compartilhar*` (`Inicio.css:350-369,408-409,440-443`), `.inicio-planos__*` antigos (`:204-216`), `.cx-meta/.cx-exemplo/.cx-semanas/.cx-passos` (`:390-405`), `.pg-recurso-linha*` (`:445-453`), `.inicio-heroi__painel--visitante/__convite/__selo` (`:106-120,157-166`), `.inicio-heroi::before/::after` desenhados em `:87-105` e apagados em `:545`. Estimo ~150 linhas mortas em 607.
- **MÉDIA · `Inicio.css` tem 28 blocos `@media`**, dez deles `(max-width: 52rem)` separados (`:167,171,179,215,216,247,250,255,258,261,265,268,273,276`). Consolidar.
- **MÉDIA · `.inicio-flash` definido duas vezes** com regras contraditórias (`Inicio.css:552-578` e `:581-607`, "Capa integrada" sobrescreve a anterior inclusive o `min-height`, `grid-template-columns` e a `@media 24rem` que esconde/mostra `__desc`). Deixar só a versão vigente.
- **MÉDIA · `--cor-linha` dos chips de prova** (`Inicio.tsx:55-61`): TEOT e TARO com a mesma cor, hex fora dos tokens, estilo inline por `li`. E o rótulo "Fellowship de quadril" está certo pela regra da marca, mas "R4 ENARE" e "R4 Coluna" ao lado de "Cirurgia da mão" sem "R4" está correto (regra de 08/10).
- **BAIXA · a11y**: `Inicio.tsx:246` `aria-label="Seu dia"` num `<div>` sem role (ignorado por leitores); `:380` barra com `role="img"` ok; `:404-412` gráfico semanal com `title` nos `li` (não acessível por teclado) mas tem `__sr`, ok; `:301` imagem decorativa com `alt=""` ok. `h2` em `:304` com `<em>` em fonte pixel 1.3em: contraste do `#f4cf7c` sobre o céu `--heroi-ceu` precisa conferir (≈ 8:1, ok).
- **BAIXA · estilo inline** `Inicio.tsx:440` (`marginTop`), `:194`, `:380`, `:407`, `:455` (largura dinâmica — aceitável, mas poderiam ser `--pct`).
- **BAIXA** `Inicio.tsx:142` `window.confirm` para substituir sessão: fora do padrão visual; usar `JanelaCentral`.
- **BAIXA** `Inicio.tsx:222` botão desabilitado quando `contagens.total < 10` sem explicação.
- **BAIXA · perf**: `temaFragil` (`:90-110`) percorre `indice.questoes` inteiro + `planoRevisao` de 7 dias (`:85-89`) só para um número "Revisões" no cartão. `respondidasPorTema` (`:160-169`) percorre o índice de novo. Três passagens pelo acervo a cada mudança de `respondidas`. Juntar numa só.
- **BAIXA · imagens**: `flashcards/promo/capa-larga.png` 180 kB e `capa-retrato.png` 104 kB carregados mesmo para quem não vai clicar (lazy, ok). São os dois maiores assets da capa; comprimir/WebP.

#### Brainstorm
1. **Reordenar por estado** (P/M): logado → herói, cronograma/hoje, estudo de hoje + onde erra, atalhos, semana/sessões, por tema, e só então ranking, planos, indique, vitrine. Visitante → herói com proposta de valor clara + amostra, "o que você ganha com a conta", AteAProva, ranking (prova social), planos, SEO; **esconder** atalhos/hoje/por tema que exigem conta ou torná-los "prévia".
2. **H1 fixa para visitante** ("Questões das provas oficiais de ortopedia, comentadas alternativa por alternativa") e frases motivacionais só para quem já tem conta.
3. **Reduzir para ~8 blocos**: fundir "Atalhos" com "Seu estudo de hoje" (são os mesmos destinos), fundir `CartaoPlanos` + `VitrineAssinante` + `CaixasAssinante` em um só bloco "Assinante" (hoje são 3 blocos separados com 3 estilos).
4. "Onde você mais erra" + "Ponto forte" lado a lado (hoje só o fraco; DadosLocais tem os dois).
5. Mostrar o **limite do dia** (ex.: "14 de 20 grátis hoje") no herói do logado em vez de só o pop-up de bloqueio — aumenta a percepção de valor do plano antes de bater no muro (depende de `saldoGratuitoHoje`, já existe).
6. Prova social no herói do visitante: "X residentes estudaram esta semana" (servidor/SQL: contagem agregada).
7. Sessão rápida com escolha de quantidade (5/10/20) no herói em vez de fixo 10.
8. `AmostraQuestao` interativa: deixar o visitante **responder** a questão na capa (sem gravar) e ver o comentário abrir — demonstra o produto. (decisão Tales: libera 1 questão sem conta)
9. Tela 390 px: barra inferior tem 7 itens (`Cabecalho.tsx:304-312`); ver seção Cabeçalho.
10. "Suas últimas sessões" só 3 — link "ver todas" para `/dados`.

---

### 3. Página de venda — `src/paginas/Assinatura.tsx` (+ `Assinatura.css`, `CartaoPlanos`, `Premium`, `VitrineAssinante`, `CaixasAssinante`, `NovidadeSimulados`, `AtalhoFlashcards`, `CartaoQuestaoDoDia`, `CartaoStreak`, `AteAProva`, `SecaoIndique`, `ConviteCompartilhar`)

#### Como está
564 linhas: herói com preço e abas de plano, estado "plano ativo", 3 ganhos, cartão de flashcards (lazy), prévia interativa do cronograma, tabela grátis × assinante, 3 cartões de plano, condições (Pix/cartão/garantia), FAQ, fecho, barra fixa, checkout em `JanelaCentral`. A página é honesta e clara no preço. O preço-âncora riscado, o "menos que um almoço", a garantia explicada 4 vezes e o Pix sem renovação estão bem.

#### Problemas
- **ALTA · Prévia do cronograma duplica lógica de `AteAProva`**: `proximaProva`, `diasAte`, `numero` são copiados byte a byte (`Assinatura.tsx:437-441,44` vs `AteAProva.tsx:450-456`); `RITMOS` divergem (15/25/40/60 em `Assinatura.tsx:418` vs 10/20/30/50 em `AteAProva.tsx:448`). Extrair para `src/dados/ritmos.ts`.
- **ALTA · Claim comparativo**: `LimiteRespostas.tsx:181` "Um dos bancos de questões de ortopedia mais baratos do Brasil". Não verificável e as orientações pedem para não citar concorrentes/cursos. Decisão do Tales.
- **MÉDIA · Barra fixa**: `Assinatura.tsx:350` `aria-hidden={!barraVisivel}` mas a classe de visibilidade exige também `!planoEscolhido`; com o checkout aberto a barra fica fora da tela, **não** `aria-hidden`, e o botão com `tabIndex=0` (`:353`) — focável e invisível. Também sobrepõe a barra inferior do celular (`Assinatura.css:353` compensa com `bottom: 4.4rem`, frágil).
- **MÉDIA · `comprar()` usa `location.assign(href(...))`** (`Assinatura.tsx:122`) em vez de `navegar` (`rotas.ts:325`): recarrega a página? Não (é hash), mas foge do padrão e não dispara `substituir`.
- **MÉDIA · Estado "pagamentos desligados" meia-boca**: com `!pagamentosHabilitados` e logado, o botão do herói mostra "Em breve" (`:166`) mas **não** está desabilitado (só `ativa` desabilita, `:196`) e o clique rola para `#planos` (`:123`), onde os botões dos cartões estão desabilitados (`:302`) e um aviso diz "abrem em breve" (`:307`). Fluxo confuso. Ou esconde o CTA ou vira "Avise-me".
- **MÉDIA · Tabela de comparação diz que o acervo é de todos** (`:245-246` "Questões, comentários e ferramentas continuam abertos") enquanto `EXIGIR_CONTA_PARA_QUESTOES` força conta e `ExigeConta` bloqueia. Para o visitante lendo a página de planos: "abertos" ≠ "só com conta".
- **MÉDIA · `MetricasConta` e a RPC `obter_estado_conta`** são chamadas aqui (`:72`), em `plano.ts:35` (`usarAssinante`), em `LimiteRespostas.tsx:73` (a cada minuto) e `premium.ts` chama `obter_acesso_premium`. Quatro consultas para "a pessoa paga?". Um contexto só.
- **MÉDIA · CSS morto na página de venda**: `.vd-alt*`, `.vd-demo*`, `.vd-estatistica*`, `.vd-barras*`, `.vd-exclusivo*`, `.vd-todos/.vd-todo`, `.vd-meios/.vd-meio*`, `.vd-garantia*`, `.vd-passos`, `.vd-facil__grade`, `.vd-faq__grupos`, `.vd-plano__itens`, `.vd-selo--claro`, `.vd-fase--resto` (`Assinatura.css:156-211,250-287,290,239-243,450-451`) ≈ 130 linhas de versões anteriores.
- **MÉDIA · Cores hardcoded**: `--vd-ouro/--vd-tinta/--vd-ouro-sombra` locais (`:7-9`), `#7fe0cf` (`:61,374`), `#e6f7f3/#0f6b5a/#32bcad` (`:255,387,405,444`), `#2a2414` (`:327-328,438`), `#ffdf95` (`:41`), `#0d2623` (`:423`), `#000` (`:322`). Pix tem 3 cores diferentes (`#0f6b5a`, `#32bcad`, `#7fe0cf`).
- **MÉDIA · Ícones de Pix e cartão inline** (`Assinatura.tsx:556-562`) em vez de entrarem em `Icone.tsx`; `IconeWhatsapp` mora em `ConviteCompartilhar.tsx:39` e é importado por `SecaoIndique`, `Indicar`, `ConviteDiario` — ícone num componente de convite.
- **BAIXA · a11y**: `role="table"` com `role="row"/"cell"` em `div`s (`:248-272`) funciona, mas `<table>` real seria mais simples; `columnheader` vazio (`:250`) deveria ter texto `so-leitor` ("Recurso"). Abas do preço (`:187-189`) são `aria-pressed` sem `role="radiogroup"`, ok. `vd-preco__abas i` com "-50%" posicionado sobre o botão (`Assinatura.css:74`) pode cortar em 320 px.
- **BAIXA** `Assinatura.tsx:35` `MetricasConta` repete a interface `EstadoAssinaturaConta` de `plano.ts:14`.
- **BAIXA** Texto do FAQ `:335` com ~130 palavras numa `<p>`; quebrar em lista.
- **BAIXA** `CartaoPlanos.tsx:8` comentário diz "sem preço, sem urgência" mas o componente mostra preço (`:18`).
- **BAIXA** `VitrineAssinante.tsx:123` "Relatório do mês" leva não assinante a `/conta?secao=estudo` (onde o interruptor fica oculto, `Conta.tsx:511`), enquanto `MenuGeral.tsx:453` leva para `/assinatura`. Mesmo item, destinos diferentes.
- **BAIXA** `CaixasAssinante.tsx:81` "Os outros 18 assuntos e as 12 áreas" hardcoded; `incidencia.json` tem 11 áreas e `TOP_ASSUNTOS` tem N. Derivar.
- **BAIXA** `CaixasAssinante.tsx:28` `pendente` recalculado a cada render sem memo (barato), `useEffect` em `:41-46` com `eslint-disable` de deps.
- **BAIXA** `Premium.tsx:98` `{...{ inert: "" }}` hack para React 18; anotar para remover ao migrar.
- **BAIXA** `AtalhoFlashcards.tsx:207` `useMemo([], ...)` lê `localStorage` uma vez; se a pessoa revisar flashcards e voltar, o contador fica velho até remontar.
- **BAIXA** `AteAProva.tsx:480` "chega mais municiado" — tom bélico, fora da voz "sério e próximo".
- **BAIXA** `SecaoIndique.tsx:527` e `Indicar.tsx:113`, `ConviteDiario.tsx:101`, `ConviteCompartilhar.tsx:95` repetem a mesma função "copiar ou `window.prompt`". Util `copiarTexto()`.
- **BAIXA** `ConviteCompartilhar.tsx:103` estilo inline de arraste (aceitável), `:122` `animationDuration` inline.
- **BAIXA · perf** `Assinatura.tsx:67` `lerRespondidas()` lê e parseia todo o `localStorage` só para `respondidasConta` como fallback do `metricas`.

#### UX de venda (objeções e CTA)
- Preço claro (bom). O que o plano dá: as 3 "coisas" (`GANHOS`) são boas, mas a tabela repete tudo em 10 linhas; redundante.
- Objeção não tratada: "eu já faço de graça, por que pagar?" quando `LIMITES_HABILITADOS=false` a resposta oficial é "garante se o limite for ligado" (`:282`) — argumento fraco; nesse modo a página deveria vender cronograma/simulado, não "sem limite".
- Falta prova social (nenhum número de assinantes, nenhum depoimento) e falta "para quem é" (R1 vs R3 vs título).
- CTA do herói para visitante "Criar conta e assinar" leva a `/conta?modo=criar&voltar=/assinatura` (`:122`) — depois do cadastro por e-mail, `Conta.tsx:252-254` navega para `/` ou abre o modal de confirmar e-mail; **o `voltar` só é honrado no `entrar`** (`Conta.tsx:240-242`). O visitante que clicou "assinar" volta à capa. Ver Conta.
- "Mexa nos botões" da prévia (`:483`) é bom, mas o resultado principal "Questões feitas até X" é o mesmo cálculo que `AteAProva` já mostrou na capa.

#### Brainstorm
1. **Modo sem limite** (P): quando `!LIMITES_HABILITADOS`, trocar herói e tabela para vender cronograma + simulado; esconder a linha "Questões por dia".
2. **Depoimentos/prova social** (decisão Tales + SQL: contagem de assinantes, "X residentes no Simulado de outubro").
3. **Fluxo "criar conta → checkout" contínuo** (M): honrar `voltar` após cadastro (inclusive Google, `google.ts:46` zera o voltar quando a rota é `/conta`).
4. Checkout em **página** (`/assinatura/pagar`) em vez de modal: no celular o modal com CPF + aceite + 2 radios é apertado; permite link direto e volta do Mercado Pago.
5. Mostrar o **"você já respondeu N"** (`:324`) no topo do herói para logados: é o argumento mais pessoal e está no fim.
6. FAQ: adicionar "Posso trocar de plano?", "Nota fiscal/recibo?", "Compartilhar com colega?".
7. Selo de "pagamento seguro Mercado Pago" com logo (verificar licença de marca).
8. Separar `PreviaCronograma` em arquivo próprio (`componentes/PreviaCronograma.tsx`) e `Checkout` em outro; `Assinatura.tsx` cai para ~250 linhas.
9. Comparativo "o que custa um curso preparatório" é tentador mas proibido pelas orientações; em vez disso "custo por questão respondida" pessoal (usa `respondidasConta`).
10. Unificar os 4 convites (`ConvitePremium`, `Degustacao`, `OfertaLimite`, `CartaoPlanos`) num só componente com variantes.

---

### 4. `Apoio.tsx` — Sobre, Contato, DadosLocais ("Seu desempenho"), NaoEncontrada (+ `DesempenhoDetalhado.tsx`)

#### Como está
Três páginas num arquivo de 545 linhas. `Sobre` é bem escrita e transparente sobre IA. `Contato` monta um e-mail com modelos por assunto. `DadosLocais` é um painel denso (herói com anel, período, 4 semanas, pontos de atenção, `DesempenhoDetalhado`, confiança, por tema, backup, zona de risco).

#### Problemas
- **ALTA · Texto desatualizado em `Sobre`**: `Apoio.tsx:125-131` "Como funciona hoje: O acervo inteiro está disponível para responder... No futuro pretendo cobrar uma taxa pequena... preservando um uso diário livre." Hoje há planos pagos, limite diário e exigência de conta. Página pública que contradiz a de planos.
- **ALTA · `Sobre` exibe o total do acervo** (`Apoio.tsx:52`): "Questões: 4.xxx". Regra da marca (ver §0). Decisão do Tales.
- **MÉDIA · DadosLocais em "modo exemplo" é meio exemplo**: `Apoio.tsx:367-368` só o herói usa números fictícios (72 %, 1.240, 58, 347, 23); abaixo, o seletor de período, "Últimas 4 semanas: 0 respostas em 0 dias", "Pontos de atenção" vazio e "Por tema: Ainda não há questões respondidas **nesta conta**" (`:503`) aparecem com zeros reais para um visitante sem conta. Ou tudo é exemplo (com a nota "Tela ilustrativa") ou nada.
- **MÉDIA · "Zona de risco · Em breve"** (`:528-537`): seção com botão desabilitado "Zerar meu progresso · em breve" só aparece se houver `reinicio:pendente`. Funcionalidade inacabada visível; `Conta.tsx:558` ainda diz "Exporte seu progresso ou comece do zero".
- **MÉDIA · Fuso horário misto**: `DadosLocais` usa `chaveDia/inicioDia` de `planoRevisao` (`:17`) enquanto `Inicio` usa os de `limiteDiario` (`FUSO_DIA = America/Sao_Paulo`); `DesempenhoDetalhado.tsx:63-64,68,72,82` usa hora local (`setHours(0)`, `getDay()`, `toDateString()`). "Dias ativos" da capa e do desempenho podem divergir para quem viaja/usa UTC.
- **MÉDIA · `aria-label` do anel diz "72% de acerto no total"** no modo exemplo (`:392`) sem avisar que é fictício.
- **MÉDIA · Duplicação de contas**: `Inicio.tsx:154-159` (acerto geral), `Conta.tsx:315-321` (métricas) e `DadosLocais:297-320` calculam "respondidas/acerto" de 3 jeitos (um por `tentativas/acertos`, outro por eventos do histórico). Os números podem diferir entre capa, conta e desempenho. Um `usarResumoDesempenho()`.
- **BAIXA · a11y**: `:445` gráfico `role="img"` com `aria-label` ok, mas cada dia só tem `title`; `:402-403` números-link sem indicar que são links (só `title`). `DesempenhoDetalhado.tsx:126` barra `aria-hidden` dentro de `td` numérico ok.
- **BAIXA** `Apoio.tsx:385` "alteração(ões)" — plural com parênteses; o resto do site faz plural certo.
- **BAIXA** `Apoio.tsx:17` importa `chaveDia, inicioDia` de `planoRevisao` e `DesempenhoDetalhado` reimplementa `faixa()` (`DesempenhoDetalhado.tsx:14` = `Apoio.tsx:370`).
- **BAIXA** `Contato`: `Apoio.tsx:216` botão "Escrever para o suporte" abre `mailto` vazio **antes** do fluxo de montar a mensagem (passo 1 e 2); redundante com `AcoesDeEmail`. A ordem convida a pular o formulário.
- **BAIXA** `Contato` pede "não envie números de cartão" duas vezes (`:229,232`).
- **BAIXA** `DesempenhoDetalhado.tsx:111` `diaMaisAtivo?.total > 0` — comparação com possível `undefined`; TS aceita por `strict` folgado, mas é frágil.
- **BAIXA** `DesempenhoDetalhado.tsx:90` deps do `useMemo` com `interesse.join(',')` (string derivada) — ok, mas `interesse` recalculado a cada render via `lerProvas`.
- **BAIXA** `NaoEncontrada` é só `MapaPerdido` (`:543-545`) — ok, mas o título da aba cai no nome do site (`App.tsx:227`), sem "Página não encontrada".

#### Brainstorm
1. Reescrever "Como funciona hoje" (P, texto) e tirar o total do acervo (decisão Tales).
2. **Dividir `Apoio.tsx`** em `Sobre.tsx`, `Contato.tsx`, `Desempenho.tsx` (M). Renomear `DadosLocais` → `Desempenho` e a rota continuar `/dados` com alias `/desempenho`.
3. Modo exemplo completo com dataset fictício e selo "Tela ilustrativa" em todos os cartões (P/M).
4. Comparação com a turma no desempenho ("seu acerto em Joelho vs média") — servidor/SQL, recurso do assinante.
5. Exportar PDF/imagem do desempenho para Instagram (já há `imagemStreak`).
6. "Pontos de atenção" com link direto para `treinar?temas=X&situacao=erradas` já existe — adicionar "revisar comentários" (caderno de erros filtrado por tema).
7. Meta semanal configurável (hoje só `ritmo.limite` para revisões).
8. Contato: formulário que envia pelo servidor (SQL/função) em vez de `mailto` — no celular, `mailto` falha com frequência.

---

### 5. `Conta.tsx` (+ `ModalEntrar`, `ModalConfirmarEmail`, `ExigeConta`, `PortaoConta`, `DetalhesAssinatura`)

#### Como está
572 linhas num componente: login/cadastro/recuperação **e** a área da conta com 6 seções. Cadastro pede 11 campos (e-mail, nome, sobrenome, nascimento, etapa, ano, provas, serviço, cidade, UF, senha ×2, aceite). Validação por campo com rolagem até o erro está bem feita.

#### Problemas
- **ALTA · `voltar` perdido no cadastro**: `Conta.tsx:240-242` só usa `voltar` no modo `entrar`. Em `criar`, `:252` navega para `/` se houver sessão imediata, e com confirmação por e-mail o link de retorno (`retornoConta`, `supabase.ts:69-73`) não carrega o `voltar`. Google: `google.ts:46` **descarta** o destino quando a rota atual começa com `/conta`. Resultado: `ExigeConta` (`/treinar`), `Assinatura` (`/assinatura`), `AteAProva` (`/cronograma`), DadosLocais (`/dados`) prometem "voltar para cá" e o novo usuário cai na capa.
- **ALTA · Atrito do cadastro**: 11 campos obrigatórios (`faltasCadastro`, `:182-200`), incluindo cidade, UF e data de nascimento ≥ 18 anos, para um "cadastro grátis em menos de um minuto" (`:333`). Pelo Google são opcionais (`Termos.tsx:153` admite). Maior barreira de conversão do funil. Decisão do Tales: o que é realmente necessário no primeiro passo (nome, e-mail, senha, prova) e o que pode vir em `CompletarPerfil`.
- **MÉDIA · `secao` e `modo` não reagem à URL**: `Conta.tsx:49-55` lêem `consulta` só no `useState` inicial; `App.tsx:128` reusa a instância. Links `/conta?secao=estudo` (`VitrineAssinante.tsx:123`), `/conta?secao=perfil` (`DesempenhoDetalhado.tsx:135`), `/conta?modo=entrar` (`MenuGeral.tsx:406`) **não** trocam a seção/modo se a pessoa já está em `/conta`. E a navegação interna (`:486`) faz `preventDefault` sem atualizar a URL: voltar do navegador não funciona entre seções, e recarregar perde a seção.
- **MÉDIA · Código morto**: `possuiVisitante = false` (`:314`) torna `importar()` (`:303-313`) e o bloco `:565` inalcançáveis; `obrig = null` (`:330`) aparece em 10 JSX. `UFS` duplicado? (só aqui).
- **MÉDIA · Duplicação de validação**: `perfilCompleto()` (`:168-180`) e `faltasCadastro()` (`:182-200`) validam as mesmas regras com mensagens diferentes; `enviar()` chama ambas (`:217,245`). Idade calculada 2× (`:173,184`).
- **MÉDIA · `role="tablist"` sem painéis** (`:348`): botões `role="tab"` sem `aria-controls`/`tabpanel` nem navegação por setas. Melhor `role="group"` + `aria-pressed`.
- **MÉDIA · Mensagens em canais diferentes**: `mensagem` (topo, `:354,458`), `erroForm` (destaque junto ao botão), `erroDe()` por campo, `aviso-formulario` em `salvarApelido`. Em "Ranking" o "Apelido salvo" aparece no topo da página, longe do botão.
- **MÉDIA · "Esqueceu a senha?" do `ModalEntrar`** (`ModalEntrar.tsx:240`) navega para `/conta?modo=recuperar` e o e-mail digitado no modal se perde; `Conta` começa com `ultimoEmail` (`:56`), que pode ser outro.
- **MÉDIA · `PortaoConta.tsx`** comentário (`:114-120`) descreve o comportamento antigo ("montar sessão continua livre"); links `/conta?modo=criar` e `/conta` **sem `voltar`** (`:128,131`): quem veio do Google numa questão avulsa perde a questão. Também é um 5º texto de "crie sua conta" diferente de `ExigeConta`.
- **BAIXA · `ModalConfirmarEmail.tsx:337`** botão de fechar com texto literal "X" em vez de `Icone fechar`; contador de 60 s começa travado na primeira exibição (`:287`) — intencional, mas sem explicar por quê.
- **BAIXA** `ModalEntrar.tsx:227` `autoFocus` + foco manual em `:167`; `fechar` capturado no efeito com `eslint-disable` (`:185`).
- **BAIXA** `Conta.tsx:210` early-return **depois** de hooks mas **antes** de `enviar`... ok; porém `:210` renderiza sem `Cabecalho`-friendly h1 "Sua conta" + texto "As contas estão em preparação" — estado que só ocorre sem Supabase.
- **BAIXA** `:451` "A conta fica aberta em um aparelho por vez" — informação importante para quem usa celular + computador (promessa do herói da capa, `Inicio.tsx:211`): está num `<p>` pequeno. Potencial fonte de suporte ("fui deslogado").
- **BAIXA** `:555` "Solicitar exclusão da conta" via e-mail; LGPD ok, mas sem autoatendimento.
- **BAIXA** `DetalhesAssinatura.tsx:76` seta "←" como texto; `conta-assinatura__voltar` existe em CSS, ok.
- **BAIXA** `ExigeConta.tsx:88` `h1` "Crie sua conta para ver as questões" em páginas cujo `document.title` é "Montar sessão" — ok, mas o texto `:90` "ficam disponíveis para quem tem conta" + `:94` "libera um número limitado" (ver §0).

#### Brainstorm
1. **Dividir `Conta.tsx`** (G): `Acesso.tsx` (entrar/criar/recuperar), `conta/Perfil.tsx`, `Estudo.tsx`, `RankingConta.tsx`, `Seguranca.tsx`, `Dados.tsx`; hooks `usarPreferenciasEmail()`.
2. **Cadastro em 2 passos** (M, decisão Tales): passo 1 e-mail+senha+prova; passo 2 (depois de confirmar/entrar) `CompletarPerfil` já existente.
3. **Guardar `voltar`** em `sessionStorage` no início do cadastro e honrá-lo no retorno do e-mail e do Google (M).
4. Seções da conta na URL (`/conta/perfil`...) com `aria-current` real (P/M).
5. Mostrar "Plano: Gratuito · 14/20 hoje" no herói da conta com CTA (hoje a aba Assinatura só aparece ao clicar).
6. Sessões ativas/aparelho: "Você entrou em Chrome no Android há 2 dias" (já existe `descreverAparelho`); botão "sair dos outros aparelhos" (servidor).
7. Exclusão de conta por botão com confirmação (servidor/SQL + função).
8. Trocar `window.confirm` (`:412,477,533`) por `JanelaCentral`.

---

### 6. `Termos.tsx` e `CondicoesAssinatura.tsx`

#### Como está
Documentos longos e cuidadosos; condicionam o texto do limite a `LIMITES_HABILITADOS`. Preços escritos por extenso de propósito (`planos.ts:499-500`).

#### Problemas
- **MÉDIA** `Termos.tsx:11` título "Termos de Uso e Privacidade — Orto Questões" com travessão; `:236-254` o "Resumo em linguagem direta" é um parágrafo único de ~300 palavras: ilegível no celular. Virar lista.
- **MÉDIA** `Termos.tsx:156` link "dados locais" → `/dados` que se chama "Seu desempenho". `:83` (5.6) menciona registro de "página do site em uso e a questão exibida por até 30 dias" — ok juridicamente, mas nenhuma outra página avisa isso (transparência: `Conta` poderia mostrar).
- **BAIXA** `Termos.tsx:13` `new Date(VERSAO_TERMOS + 'T12:00:00')` ok. Sem sumário/índice para 31 cláusulas; sem `id` nas `h2` para link direto (Condições linka "Cláusula 31" por texto).
- **BAIXA** `CondicoesAssinatura.tsx:11` "texto revisado em 06/10/2026" hardcoded ao lado de `VERSAO_CONDICOES_ASSINATURA` dinâmico.
- **BAIXA** Preços por extenso em `Termos.tsx:125` e `CondicoesAssinatura.tsx:19` — decisão consciente, mas sem teste que compare com `planos.ts` (um `test` simples evitaria divergência).

#### Brainstorm
1. Índice lateral/âncoras nas cláusulas (P).
2. Resumo em lista com 8-10 itens (P).
3. Teste unitário que confere que os valores de `planos.ts` aparecem nos dois textos (P).
4. "Última atualização" + changelog curto das versões (decisão Tales).

---

### 7. `Indicar.tsx` (+ `SecaoIndique.tsx`)

#### Como está
Página clara, com link, WhatsApp, placar e regras. `Regras` compartilhado entre `Indicar` e `ConviteRecebido`.

#### Problemas
- **MÉDIA** `Indicar.tsx:122,183` usam `className="conteudo empilha ind"` **dentro** de `.conteudo` do `App.tsx:267` — padding/largura duplicados (as outras páginas usam `empilha-2`).
- **MÉDIA** `Indicar.tsx:151` `'share' in navigator` lido no render (ok), mas `compartilhar()` ignora falhas silenciosamente; sem fallback para "copiar".
- **BAIXA** Texto das regras duplica `SecaoIndique.tsx:548-552` (3 passos com as mesmas imagens, textos diferentes) e `MenuGeral.tsx:434`. Um `PassosIndicacao`.
- **BAIXA** `Indicar.tsx:165` "Os dias entram depois de uma assinatura paga que esteja ativa" — frase ambígua (parece que precisa assinar para ganhar). Reformular: "Se você já é assinante, os dias somam depois do período pago".
- **BAIXA** Sem conta, `ConviteRecebido` grava o código (`:176`) e manda para `/conta?modo=criar` sem `voltar`; depois do cadastro cai na capa sem confirmação de que o convite valeu.

#### Brainstorm
1. Prévia da mensagem do WhatsApp antes de enviar (P).
2. Placar com nomes/iniciais dos convidados e status (servidor).
3. Após cadastro via convite, faixa "Convite de X aplicado: responda 20 questões" na capa (P/M).
4. QR code do link para mostrar no plantão (P, lib pequena ou SVG próprio).

---

### 8. `Cabecalho.tsx`, `MenuGeral.tsx`, `Rodape.tsx`

#### Problemas
- **MÉDIA · Barra inferior com 7 itens** (`Cabecalho.tsx:304-312`): Início, Treinar, Flashcards, Cronograma, Ranking, Desempenho, Menu. Em 360-390 px os rótulos ficam ≤ 10 px ou cortam. Padrão é 4-5.
- **MÉDIA · `AvisoBloqueioDiario` montado 2×** (`Cabecalho.tsx:278,302`): dois `setInterval` de 1 s, dois listeners de `storage`; o efeito de `:68-85` tem `caminho` nas deps → **nova RPC `obter_estado_conta` a cada troca de rota** enquanto bloqueado, além do poll de 60 s.
- **MÉDIA** `TemaIcone` (`Cabecalho.tsx:318-325`) lê o DOM no render; só atualiza porque `usarTema` tem estado — acoplamento implícito. Expor `tema` do hook e usar.
- **BAIXA** `Cabecalho.tsx:268` `aria-current` para `/conta` só exato (`:283`): `/conta/assinatura` não marca.
- **BAIXA** `MenuGeral.tsx:379` "Relatório do mês" com `destino: '/conta'` genérico; `:453` redireciona para planos quando bloqueado — item que não é uma página. `:410,427` preço hardcoded (§0).
- **BAIXA** `MenuGeral` reimplementa a lista de recursos que já está em `Rodape` (`ESTUDAR/ASSINANTE/PROJETO`) e `VitrineAssinante.RECURSOS`. Três catálogos de navegação.
- **BAIXA** `Rodape.tsx:503` "Indique e ganhe" na coluna "Assinante" (não é recurso do assinante). `:514-524` `CameraPixel` com 4 hex hardcoded; o ícone `instagram` já existe em `Icone`. `:568` `new Date().getFullYear()` ok.
- **BAIXA** `Rodape.tsx:545` descrição repete a do `inicio-seo`; `:546` "também escrito OrtoQuestões" aparece aqui e em `Sobre` (SEO defensivo, ok).

#### Brainstorm
1. Barra inferior: Início · Treinar · Flashcards · Desempenho · Menu; Cronograma e Ranking dentro do Menu (decisão Tales).
2. Um só `catalogoNavegacao.ts` consumido por Cabeçalho, Menu, Rodapé e Vitrine.
3. Indicador de limite diário no avatar (anel) em vez de chip separado.

---

### 9. `AvisoSite`, `AvisoCookies`, `ConviteDiario`, `LimiteRespostas`

#### Problemas
- **MÉDIA** `ConviteDiario.tsx:87` decide se pode abrir sondando o DOM (`document.querySelector('.jc, .cd')`) — acoplado a nomes de classe de outros componentes; se `ModalEntrar` (`.modal-central`) ou `Painel` estiverem abertos, o convite abre por cima.
- **MÉDIA** `ConviteDiario.tsx:137` `<p onClick>` para pular a animação sem teclado; `aria-label` em `<p>` é ignorado por leitores (sem role).
- **BAIXA** `LimiteRespostas.tsx:25-29` `AvisoLimite` "Rodada grátis completa. Bom trabalho!" — com limite = 0 restantes, mas `permitido` true? Lógica ok, mas duplica `DiaCumprido`.
- **BAIXA** `LimiteRespostas.tsx:242` constrói `EstadoLimite` manualmente com `paywallAtivo: true, sequencia: 0` — o `OfertaLimite` então nunca mostra a sequência nesse caminho.
- **BAIXA** `AvisoCookies.tsx:58` "Usamos cookies do Meta para medir nossos anúncios" — correto e honesto; falta link para "Cookies" do rodapé no próprio texto (reabrir). Sem `aria-live`.
- **BAIXA** `AvisoSite.tsx:26` `role="status"` em faixa persistente com link e botão — melhor `role="region" aria-label`.

---

### 10. `config.ts` e `planos.ts`

- **BAIXA** `config.ts:492` `LIMITE_GRATIS_ATUAL = 20` com comentário "ao mudar no painel, mude aqui também" e `publicar.yml:60` comenta "limite grátis de 10 por 24 h" — já divergem na documentação.
- **BAIXA** `config.ts:475-484` `FLASHCARDS_NO_MENU` não é usado no escopo (Cabeçalho/Menu mostram Flashcards sem checar a trava).
- **BAIXA** `planos.ts:505` `chamada` do anual "pela metade do preço" depende de `MENSAL` ser exatamente 2× — se mudar um, o texto mente. Derivar.

---

### Top 15 tarefas desta área (prioridade; tamanho P/M/G; paralelizável)

| # | Tarefa | Tam. | Paralelo | Arquivos |
|---|---|---|---|---|
| 1 | Unificar o texto do limite diário em uma função condicionada a `LIMITES_HABILITADOS` e usá-la em ExigeConta, PortaoConta, DadosLocais, Conta, ConviteCompartilhar, CartaoPlanos, OfertaLimite | P | sim | `config.ts`, 7 componentes |
| 2 | Honrar `voltar` após cadastro (e-mail e Google) e passar `voltar` no PortaoConta | M | sim | `Conta.tsx`, `google.ts`, `retornoAuth.ts`, `PortaoConta.tsx` |
| 3 | Reordenar a página inicial por estado (logado × visitante) e cortar blocos que exigem conta para visitantes | M | não (depende de decisão de ordem) | `Inicio.tsx` |
| 4 | Corrigir flash do `AteAProva` (expor "carregando" em `usarCronogramaHoje`) e `areas=` sem quadril nos links | P | sim | `Inicio.tsx`, `CaixasAssinante.tsx` |
| 5 | Derivar "R$ 19,99/mês" de `planos.ts` em CartaoPlanos e MenuGeral; derivar "metade do preço" | P | sim | `CartaoPlanos.tsx`, `MenuGeral.tsx`, `planos.ts` |
| 6 | Atualizar `Sobre` ("Como funciona hoje") e decidir sobre o total do acervo (Tales) | P | sim | `Apoio.tsx`, `Assinatura.tsx:50` |
| 7 | Remover código/CSS morto: `CartaoStreak`, `CartaoQuestaoDoDia`, `ParComCripta`, `possuiVisitante/importar`, `obrig`, ~150 linhas de `Inicio.css`, ~130 de `Assinatura.css`, `.inicio-flash` duplicado | M | sim | vários |
| 8 | Tokens para o ouro/tinta pixel, menta e WhatsApp; substituir hex repetidos | M | sim | `tokens.css`, `Inicio.css`, `Assinatura.css`, `Rodape.tsx`, `Apoio.tsx`, `CartaoStreak` |
| 9 | Seções da conta e `modo` reagindo à URL (ou `key` em `App`) | P | sim | `Conta.tsx`, `App.tsx:128` |
| 10 | Cadastro em 2 passos (decisão Tales) | M/G | não | `Conta.tsx`, `CompletarPerfil.tsx` |
| 11 | Extrair `PreviaCronograma`, `Checkout`, ritmos/`proximaProva` compartilhados com `AteAProva`; ícones Pix/Cartão/WhatsApp para `Icone.tsx` | M | sim | `Assinatura.tsx`, `AteAProva.tsx`, `ConviteCompartilhar.tsx` |
| 12 | Um só contexto "assinatura/premium" (uma RPC) e `AvisoBloqueioDiario` sem RPC por rota | M | sim | `plano.ts`, `premium.ts`, `LimiteRespostas.tsx`, `Assinatura.tsx` |
| 13 | Dividir `Apoio.tsx` em 3 páginas e `Conta.tsx` em 6; renomear DadosLocais → Desempenho; modo exemplo completo com "Tela ilustrativa" | G | sim (após 9) | `Apoio.tsx`, `Conta.tsx` |
| 14 | Unificar diálogos em `JanelaCentral` (ModalEntrar, ModalConfirmarEmail, confirms) e barra fixa da venda com `aria-hidden` correto | M | sim | 4 componentes, `Assinatura.tsx:350` |
| 15 | Barra inferior do celular com 5 itens e catálogo único de navegação (Tales decide os 5) | P/M | sim | `Cabecalho.tsx`, `MenuGeral.tsx`, `Rodape.tsx`, `VitrineAssinante.tsx` |

Observação sobre o claim "um dos bancos mais baratos do Brasil" (`LimiteRespostas.tsx:181`) e sobre a pegada pixel na página de pagamento e no e-mail de confirmação: ambos pedem decisão do Tales antes de qualquer mudança.


---

# Anexo B · Treinar, sessão e cartão de questão (relatório completo)

## Auditoria (somente leitura) · fluxo de treino e de questão · OrtoQuestões

Escopo lido por inteiro: `Treinar.tsx`, `Sessao.tsx`, `CartaoQuestao.tsx`, `SeletorArvore.tsx`, `SeletorMultiplo.tsx`, `MapaQuestoes.tsx`, `FiguraAmpliavel.tsx`, `NotasQuestao.tsx`, `AvaliarComentario.tsx`, `ContribuirComentario.tsx`, `RelatarErro.tsx`, `ComoATurma.tsx`, `Atalhos.tsx`, `ModalFimSessao.tsx`, `NivelCobranca.tsx`, `Resumo.tsx`, `QuestaoDireta.tsx`, `Revisao.tsx`, `Favoritas.tsx`, `CadernoErros.tsx`, `SimuladoNacional.tsx`, `Progresso.tsx`, `TemasQueMaisCaem.tsx`, `Resumao.tsx`, `estado/sessao.ts`, `revisao.ts`, `planoRevisao.ts`, `limiteDiario.ts`, `questaoDoDia.ts`, `dados/acervo.ts`, `tipos.ts`, `comentarios.ts`, `usarIndice.ts`, `edicoes.ts` (início), `turma.ts`, `util/imagemQuestao.ts`, `usarDeslizar.ts`, `rotas.ts`, `TextoEditorial.tsx`, CSS de `CartaoQuestao`, `Treinar`, `Sessao`, `TextoEditorial`, `tokens.css`, trechos de `base.css`, `Painel.tsx`, `LimiteRespostas.tsx`, `armazenamento.ts`, `usarArmazenado.ts`, `vite.config.ts`, `publicar.yml`, `docs/padrao-editorial-comentarios.md`, `public/acervo/temas/joelho.json` e `comentarios/joelho.json`.

Dados do acervo que importam para a avaliação: `temas/joelho.json` tem 376 questões, **335 com 4 alternativas e 10 com 5**; `comentarios/joelho.json` tem 887 KB (não comprimido). Em todo o acervo (6.933 comentários): 2.578 usam tabela markdown, 134 linhas de tabela com 5+ colunas, 3.350 células com mais de 60 caracteres, 171 comentários usam itálico `*x*` (não suportado pelo renderizador), 20 usam `==destaque==`, 94 usam quadro `> `, 0 usam `## `, 0 travessão (3 exceções). Os arquivos `acervo/q/<id>.json` e `acervo/c/<id>.json` **não existem no repositório**: são gerados no build por `vite.config.ts:16-44` (plugin `fatiarAcervo`), então em `vite dev` toda sessão cai no arquivo do tema inteiro.

---

### 1. `src/componentes/CartaoQuestao.tsx` (884 linhas) + `CartaoQuestao.css` (423 linhas)

#### Como está
Um componente único faz: cabeçalho (número, origem, chips), barra de 5 ferramentas (etiquetas, favorito, bandeira de revisão, copiar link, modo leitura), enunciado com grifo por seleção de texto, figuras, lista de alternativas (botão + botão "riscar"), bloco de confiança (3 segmentos, só depois de escolher) + "Responder X", resultado, resumo da turma, comentário do autor, `ComentarioDaIA` (conceito, alternativa por alternativa, referências, avaliação), convite da turma, comentários da comunidade + `ContribuirComentario`, referências, notas, histórico, nota de simulado, rodapé (relatar erro, editar admin, desfazer, id), menu flutuante "Grifar", botão "Desfazer último grifo", mais o fluxo de dissertativa (`Dissertativa`, rascunho em localStorage). Atalhos 1–5, Enter, F, R, E, Shift+n.

A ordem vertical (enunciado → imagem → alternativas → confiança/responder → resultado → comentário → avaliação → comunidade → notas/histórico → relatar) é correta. O feedback certo/errado é claro (`Resultado`, `alternativa--certa/--errada`, marcas "Gabarito"/"Sua resposta"). 4 ou 5 alternativas funcionam igual: `letrasDisponiveis` (L99) deriva das alternativas da questão, teclas e Shift+n respeitam `letrasDisponiveis.length` (L170), e `Atalhos.tsx:2` diz "1 … 5" genericamente.

#### Problemas
**Alta**
- `CartaoQuestao.tsx:267` e `:501`: `lerRespondidas()` é chamado **a cada render** (dois JSON.parse do mapa inteiro de respondidas, que cresce com o histórico de 8 itens por questão). Em simulado, `Sessao.tsx:146` re-renderiza a cada segundo e o cartão (sem `memo`, com lambdas novas em `Sessao.tsx:405-426`) re-renderiza junto: um parse de centenas de KB por segundo no celular.
- `CartaoQuestao.tsx:130` (dissertativa): `aoResponder('A', …)` registra a letra `A` como escolhida. Isso vira `m: 'A'` e `p: 'A'` em `revisao.ts:49-50`, polui "como a turma respondeu" (primeira letra) e faz `CadernoErros.tsx:257-258` mostrar "Você marcou A" com texto vazio para dissertativas erradas (gabarito é null, então `marcada !== gabarito` é verdadeiro).
- `CartaoQuestao.tsx:703-705`: `erradas` só inclui letras que têm texto em `comentario.incorretas`. Se o comentário omitir uma alternativa (comum em questões de 5 alternativas com comentário escrito para 4), ela **desaparece em silêncio** da seção "Alternativa por alternativa", em vez de aparecer com "sem análise". Contraria o padrão editorial (`docs/padrao-editorial-comentarios.md`, "cada alternativa merece explicação").
- `tipos.ts:50-51` e `:77` prometem que, enquanto `conferido` for falso, "a interface diz em letras claras que ninguém revisou aquilo"; `Progresso.tsx:166-168` repete essa promessa ao público. **`conferido` não é lido em lugar nenhum de `CartaoQuestao.tsx`** (grep vazio); a única pista fica dentro de `<details>` em `TextoEditorial.tsx:85-92`. Risco editorial/legal.
- `CartaoQuestao.tsx:410` `disabled={travada}` nas alternativas: depois de responder, os botões ficam `disabled`. No Chrome, elementos `disabled` não disparam eventos de mouse, então **não dá para selecionar texto (e grifar) nas alternativas depois de responder**, justamente quando se estuda. Também saem da ordem de tabulação. Preferível `aria-disabled` + `pointer-events` controlado, ou `<div role="radio">`.

**Média**
- `CartaoQuestao.tsx:162-200`: `useEffect` **sem array de dependências**: remove e recoloca o `keydown` do `document` em todo render (inclusive os de 1 s do cronômetro). Funciona, mas é custo gratuito e dificulta raciocinar sobre closures.
- `CartaoQuestao.tsx:471-473`: a confiança ("Tenho certeza / dúvida / chute") só aparece **depois** de escolher a alternativa, com padrão silencioso `seguro` (L64). Isso empurra o botão "Responder" para baixo no momento do clique (salto de layout, pior no celular com `position: sticky` em `CartaoQuestao.css:67` e `:81`) e a maioria responde sem trocar, então a revisão espaçada recebe quase só "certeza". A própria mensagem de L484 ("Acerto com dúvida ou chute volta antes") é escondida no celular (`CartaoQuestao.css:116`).
- `CartaoQuestao.tsx:274` grifos são retângulos absolutos em px calculados no momento do grifo (L237-250). Ao responder, a lista ganha marcas, somem os botões "riscar" (L433) e aparece o resultado; qualquer reflow (modo leitura L335, redimensionar, abrir "Minhas anotações") deixa os grifos fora do lugar. "Só visual" (L213) não justifica ficar errado na tela.
- `CartaoQuestao.tsx:273` `onMouseUp={atualizarSelecao}` no `<article>` inteiro: seleção dentro do `textarea` de notas (L566) ou do relato (L591) também pode abrir o menu "Grifar" (o `contains(anchorNode)` é verdadeiro para descendentes).
- Alvos de toque abaixo de 44 px: `.riscar` 2,25 rem (36 px) e 1,875 rem (30 px) em ≤30 rem (`base.css:863-872`, `:1447-1449`); `.qz-ferramenta` 34 px em ≤40 rem (`CartaoQuestao.css:288`); `.opcao-segmento` 38 px (`:103`); `.alternativa__turma small` 0,68 rem (~11 px); `.qz-chip` 0,72 rem no celular (`:293`); `.cm-selo` 0,7 rem (`:334`). O token `--toque: 44px` existe em `tokens.css:71` e quase não é usado.
- Contraste no tema escuro: `.alternativa--certa .alternativa__letra { color: #fff }` sobre `--acerto: #4fbe85` (`base.css:836-840`, `tokens.css:118`) ≈ 2,2:1; o mesmo em `.cm-selo--certa`, `.cm-alt--certa .cm-alt__letra` (`CartaoQuestao.css:330-336`) e `.av__motivos button.ativo { color: #fff }` sobre `--verdete` escuro `#4fb3a5` (`:374`). `.qz-rodape__id` com `opacity: .7` sobre `--texto-2` fica abaixo de 4,5:1 no claro (`:235`).
- Semântica das alternativas: `<ul><li><button aria-pressed>` (L371-448) para escolha única. O padrão é `role="radiogroup"` + `role="radio"`/`aria-checked` (como já é feito em `Treinar.tsx:545-556` para o modo). Leitor de tela anuncia 4-5 "botões alternáveis" independentes.
- `CartaoQuestao.tsx:70, 96, 110`: o tempo (`segundos`) começa em `Date.now()` ao trocar de `questao.id`. Voltar para uma questão não respondida zera o relógio; aba em segundo plano continua contando. A métrica "por questão" do `Resumo` é frágil.
- `semEco` (L674-682) remove a primeira linha em negrito quando ela "ecoa" a alternativa; o critério `b.includes(a)` com `a` curto (ex.: "**Correta.**", "**Lateral.**") pode apagar uma frase que não é eco quando a alternativa contém a palavra. Sem teste unitário.
- `ComentarioDaIA` mostra 3 selos diferentes para "qual é a sua" (`cm-selo`, `alternativa__marca`, `Resultado`) e repete a letra/texto da alternativa já exibida acima: redundância vertical grande no celular antes de chegar na explicação.
- `AvaliarComentario.tsx:76, 87, 95-96, 106-107`: botões sem `type="button"` (dentro de formulários futuros disparariam submit) e `.av__motivos button` com classe `ativo` em vez do `aria-pressed` que o resto do site usa.
- `FiguraAmpliavel.tsx:30`: `loading="lazy"` na **figura da questão atual** (acima da dobra) atrasa a imagem principal; não há `onError` (imagem que faltou no deploy mostra o ícone quebrado do navegador, sem texto). `figuraPendente` (L353-361) só cobre o caso conhecido no JSON.
- `NotasQuestao.tsx:10`: a cada tecla grava o mapa inteiro de notas (`usarArmazenado('notas')` → `gravar` → `JSON.stringify` de todas as notas + `EVENTO_DADOS` → o próprio hook relê e define de novo). Texto diz "sincronizadas com sua conta" (L11) sem o componente garantir isso.

**Baixa**
- Estilos inline: L354, L356, L522, L527, L549, L560, L601 (ok, posição), L609 (`position:absolute; right:1rem; bottom:1rem; zIndex:3` deveria ser classe).
- `CartaoQuestao.css` tem `.bloco-comentario` definido 3 vezes (L56, L62, L74) e `.contribuicao` 3 vezes (L47, L65, L76); `.acao-responder--pronta` duas vezes com `bottom` diferente (L67 para ≤40 rem e L81 para ≤48 rem). ~25 blocos `@media (max-width: 40rem)` de uma regra cada (L88-117, L236-294). Classes mortas: `.origem-questao` (L79), `.bloco-comentario--ia/--comunidade` (L63-64), `.questao__topo` (L86), `.referencias-comentario` (`TextoEditorial.css:6-8`).
- Cores fora de `tokens.css`: `#f5df72 #c9a900 #241f00 #ffe878` (grifo, L71-73), `#ffe3a3 #5c3f06` (selo simulado, L380-381), `#fff` em vários pontos.
- Histórico (L567-578) e notas duplicam o padrão `<details>` com CSS próprio em vez de um componente `Recolhivel`.
- `copiarLink` (L202-211) usa `window.prompt` como fallback.

#### Brainstorm (cartão)
1. Confiança sempre visível como 3 segmentos **antes** de "Responder", com o último valor lembrado por sessão (sem salto de layout).
2. Botão "Responder" vira "Responder B · certeza" e Enter confirma; no celular, confiança + responder numa única barra fixa.
3. Riscar com toque longo/deslize para a esquerda na alternativa (mantendo o X no desktop) e X com 44 px.
4. Renderizar `conferido`: selo "Revisado por médico" ou "Ainda sem revisão médica" no cabeçalho do comentário.
5. "Alternativa por alternativa" em acordeão por letra, com a sua e a correta abertas por padrão; as outras recolhidas (reduz a rolagem no celular pela metade).
6. Grifo persistente por questão (localStorage/`notas`) usando offsets de texto em vez de px (`Range` serializado por índice de caractere), ou abandonar o grifo e manter só "Minhas anotações".
7. Cronômetro discreto por questão (opt-in em "Mais opções"), pausado quando a aba perde o foco (`visibilitychange`).
8. Tamanho da fonte do enunciado/alternativas por botão A-/A+ dentro da sessão (hoje só em `Conta.tsx:506`).

---

### 2. `src/paginas/Sessao.tsx` (510 linhas) + `Sessao.css`

#### Como está
Carrega o índice e as questões (`carregarQuestoes`), controla posição, cronômetro de simulado, limite diário (RPC `autorizar_resposta` com chave de idempotência por `sessao.id:questao.id`), portão de conta, dicas de deslizar/teclado, pré-carga do comentário atual e do próximo, modal de fim, barra sticky com blocos de XP em pixel art, setas laterais no desktop, nav inferior com 5 ações, mapa e atalhos em `Painel`.

#### Problemas
**Alta**
- **Sessão concluída continua interativa.** `Sessao.tsx:257` só trata `!sessao || total === 0`. Depois de "Encerrar e ver resumo" (`finalizar()` + `navegar('/resumo')`), o botão Voltar do navegador reabre `#/sessao` com a mesma sessão (`concluidaEm` preenchido) e tudo funciona: responder, "Encerrar" de novo. `finalizar` (`sessao.ts:131`) não regrava o histórico (`!salvo.concluidaEm`), então respostas dadas depois entram em `respondidas` mas não no histórico/resumo. Deve redirecionar para `/resumo` ou mostrar "Sessão encerrada".
- **Montar sessão a partir de Favoritas, Caderno de erros, Revisão e Resumo substitui uma sessão em andamento sem aviso** e sem `finalizar()`: `Favoritas.tsx:51`, `CadernoErros.tsx:106`, `Revisao.tsx:177`, `Resumo.tsx:232` chamam `iniciar(...)` direto, enquanto `Treinar.tsx:199/220`, `TemasQueMaisCaem.tsx:58` e `SimuladoNacional.tsx:73` fazem `window.confirm`. A sessão perdida nunca entra no histórico.
- `Sessao.tsx:388-394` e `limiteDiario.ts`: quando `autorizar` falha por rede (`falhaValidacao`), `Sessao.tsx:418` abre `PainelLimite` mesmo assim (há tratamento em `LimiteRespostas.tsx:125-129`, ok), mas a resposta marcada não é registrada e `escolhida` continua: o usuário vê um painel de "limite" numa falha de rede. Mensagem correta, lugar errado; melhor um `aviso-formulario--erro` embaixo do botão, como já existe em `CartaoQuestao.tsx:483`.

**Média**
- `Sessao.tsx:449-453` "Pular por agora" e `:463-472` "Próxima" fazem a mesma coisa (`irPara(posicao + 1)`) quando a questão não foi respondida: dois botões, uma ação. `:467` desabilita "Concluir" se `respondidas === 0` na última, mas "Encerrar e ver resumo" (`:459`) fica habilitado sempre: regra inconsistente.
- Excesso de ações simultâneas na tela de responder: barra superior (contagem pixel, combo, cronômetro, blocos de XP, Mapa, Atalhos), setas laterais, 5 ferramentas no cartão, X por alternativa, 3 confianças, Responder, nav inferior com até 5 botões, dica flutuante, botão flutuante de concluir, mais rodapé do cartão (notas, histórico, relatar, editar, desfazer, id). No celular (≤40 rem), a nav vira 2 linhas (`Sessao.css:121-135`) com 3 botões "fantasma" pequenos (38 px, `--meta`), e `.barra-sessao__teclado` some: nada aponta para "?".
- `Sessao.tsx:120-125`: `fimMostrado` é `useRef` → após F5 na última questão (lendo o comentário) o modal "Missão cumprida" **reabre**. Guardar em `sessionStorage`/na própria sessão.
- `Sessao.tsx:143-148`: o `setInterval` do cronômetro é recriado a cada mudança de `sessao` (cada resposta/irPara) porque a dependência é o objeto inteiro; use `sessao.criadaEm`/`limiteSegundos`.
- `Sessao.tsx:119` e `:213`: `sessao.ids.join(',')` calculado em todo render (duas vezes) para gerar chaves; em sessões de 100-200 ids é string de 2-3 KB por render (e por segundo no simulado).
- `Sessao.tsx:371` `style={{ minHeight: 36 }}` inline no botão Mapa versus `Sessao.css:112` `min-height: 34px !important`: CSS e inline brigando.
- `Sessao.tsx:172` grava `dica:teclado` = 3 e **ninguém lê** essa chave (grep: só esta linha). Código morto.
- `usarDeslizar.ts:95` registra `touchmove` com `passive: false` na área inteira da sessão: todo scroll vertical espera o JS (o handler só chama `preventDefault` quando horizontal, mas o navegador não sabe). Em celulares fracos, scroll com atraso perceptível. Alternativa: `touch-action: pan-y` no palco + listener passivo com decisão por `pointer events`, ou registrar o listener não passivo só no cartão.
- `Sessao.tsx:195-201` pré-carrega o comentário da questão atual **antes** de responder (em não-simulado). Com `acervo/c` ausente (dev) baixa o arquivo do tema inteiro (887 KB em joelho). Em produção ok.
- Mistura de linguagem visual: contador "x de y" em Pixelify (`Sessao.css:186`), combo com `chama.png` (`Sessao.tsx:338`), blocos de XP com hex fixos (`Sessao.css:191-194`: `#3fa66b #d9605a #f4cf7c #c9952f`), dica de deslizar em "pergaminho" (`Sessao.css:195-211`: `#3a2913 #22170b #ffe08a #1b1208 #f4cf7c`), modal de fim com guerreiro (`ModalFimSessao.tsx:36`) e selo "Missão cumprida": tudo em cima de um cartão editorial sóbrio. Decisão do Tales se a temporada RPG deve entrar na tela de responder ou ficar só em ranking/resumo.

**Baixa**
- Dicas (L210-247): duas máquinas de temporizador quase idênticas (deslizar e teclado) com refs e `useEffect` separados; extrair `usarDicaUmaVez(chave, condicao)`.
- `Sessao.tsx:88` `useMemo(() => saldoGratuitoHoje(), [sessao?.id])` com dependência não usada no corpo (lint).
- `Sessao.css:72-98` `.atalhos-sessao*` e `.atalhos-estudo*` não têm uso em TSX (mortas).
- `CSS .seta-lateral` só ≥75 rem, ok; `.pagina--foco .seta-lateral` escondida entre 75-87 rem (`Sessao.css:30-32`) com lógica frágil.

#### Brainstorm (sessão)
1. Nav inferior com 3 ações no máximo: Anterior · Próxima (ou Concluir) · menu "…" (pular para não respondida, encerrar, mapa, atalhos).
2. Guardar a sessão concluída e redirecionar `/sessao` → `/resumo` quando `concluidaEm`.
3. Um único helper `iniciarSessaoComAviso(filtros, ids, opcoes)` em `estado/sessao.ts` que confirma (com `JanelaCentral`, não `window.confirm`) e finaliza a anterior, usado por todas as 7 páginas.
4. "Modo prova" realista opcional: esconder cronômetro até 5 min do fim, bloquear comentário, sem combo/XP.
5. Retomar sessão a partir da página inicial/Treinar ("Você tem 7 de 20 em andamento · Continuar").
6. Barra superior adaptável: no celular só "7/20 · 00:34 · Mapa".

---

### 3. `src/paginas/Treinar.tsx` (662 linhas) + `SeletorArvore.tsx` + `Treinar.css`

#### Como está
Herói com "Sessão rápida" (10 de todo o acervo) e 4 atalhos de 10 (revisar hoje, novas, erradas, favoritas), trilha de 4 passos + "Começar", passo 1 (categorias de prova A, árvore de temas B, busca C), passo 2 situação (8 pílulas + 2 da turma), passo 3 opcional (prova, ano, dificuldade), passo 4 (quantidade 6 pílulas + Todas + número, modo estudo/prova, tempo, "Mais opções" com 5 caixas), bloco OrtoQuestões Simulados, barra fixa com resumo + cronograma + Limpar + "Responder N questões". Filtros vão para a URL (`filtrosParaConsulta`).

"Montar sessão" é óbvio: a barra fixa com "Responder N questões" e o botão de sessão rápida resolvem o tempo-até-responder em 1 toque. O problema é o que vem entre eles.

#### Problemas
**Alta**
- **Performance ao digitar na busca e ao trocar qualquer filtro.** Cada mudança de `filtros` dispara: `navegar(destino, true)` (`Treinar.tsx:90-95`) → `replaceState` + `HashChangeEvent` sintético (`rotas.ts:46-47`) → `usarRota` em `App` re-renderiza a árvore inteira → `Treinar` recalcula `contagens` (L106: `contar` = ~8 passes de `aplicaUm` por item), `gerais` (L122), `porArea` (L125-130: 5× `contar`), `simuladosNoRecorte` (L156-161: até 2× `contar`), `provasDoFoco` (L132-135: `filtrar`). Com ~7 mil itens no índice, são ~500 mil chamadas de `aplicaUm` por tecla, sem debounce, no celular. `contexto.favoritos.includes` (`acervo.ts:291, 368`) é O(n) por item.
- `acervo.ts:429-444` (`montarSessao`): o intercalamento "uma revisão, uma nova, uma acertada" roda sempre que `situacao === 'todas'` e não há busca, **ignorando `embaralhar === false`** ("ordem da prova", `Treinar.tsx:591-594`, `rotas.ts:90`). Quem desmarca "Embaralhar" para fazer a prova na ordem original recebe a ordem reagrupada. Bug de promessa do filtro.

**Média**
- Número de filtros: 5 categorias + simulados, ~30 temas × subtemas, busca, 10 situações, provas (até ~8), anos (~20), 3 dificuldades, 7 quantidades + campo, 2 modos, 4 tempos, 5 caixas. São 14 grupos. Para o uso principal ("quero 20 de joelho, não respondidas") o caminho é: rolar o herói, marcar tema, abrir passo 2, marcar situação, (passo 4 já tem 10) e tocar na barra. O passo 2 e o 4 começam **fechados no celular** (`Treinar.tsx:192-194`), então quem não percebe os `<details>` responde "Todas · 10" sem saber.
- Trilha (`Treinar.tsx:279-293`) tem um "▶ Começar" **antes** de qualquer escolha, duplicando a barra fixa e o herói; três "começar" na mesma tela.
- `Treinar.tsx:252` `situacoesVisiveis` esconde pílulas com contagem zero (menos "todas" e a atual): as pílulas **mudam de lugar** conforme o recorte (ex.: "Dominadas" aparece/some), o que desorienta e esconde que a situação existe.
- `SeletorArvore.tsx:196-209` `.tema-cartao__sub` (texto "N subtemas" com padding 0,2 rem, `Treinar.css:114-118`) é o único jeito de abrir subtemas: alvo de ~20 px de altura no celular. Marcar o tema inteiro e desmarcar 1 subtema (L102-106) vira "todos os outros" sem feedback explícito além do título do painel.
- `Treinar.tsx:541` campo numérico clampa `Math.min(total, …)` **a cada tecla**: com total 50, digitar "100" vira 10 → 50; digitar "7" quando quer "75" vira 7 e trava; frustrante. Clampar no `blur`.
- `Treinar.tsx:74`, `rotas.ts:108-140`: `temas`/`subtemas`/`provas` da URL não são validados contra o índice; link antigo com slug renomeado mostra "1 assunto" na trilha e 0 questões, sem explicar.
- `Treinar.tsx:199, 220` `window.confirm` (12 usos no site) em vez de `JanelaCentral`.
- `Treinar.tsx:192` `telaLarga` lido uma vez (`useState`), não reage a rotação/redimensionamento.
- `Treinar.css:4-8` (`.treinar-filtros`, `.treinar-intencoes`, `.treinar-contexto`, `.filtros-destaque`), `:127-134` (`.chip-subtema*`), `:126` (`.subtemas-painel__chips`), `:203-214` (`.tr-heroi__cronograma`), `:240-244` (`.tr-foco__qtd`) são **CSS morto** (nenhum uso em TSX). `SeletorMultiplo.tsx` inteiro **não é importado por ninguém**.
- Cores fora dos tokens em `Treinar.css`: `#0b3a35 #ffe3a3` (L29), `#fdf0e3 #f4d3b2 #c05f14 #37241a #5a3a22 #ffb67a` (L195-200), `#ffe3a3 #5c3f06` (L178).

**Baixa**
- `Treinar.tsx:172` estimativa 0,8 min/questão fixa, não usa o tempo médio real do histórico que `Resumo` já calcula.
- `Treinar.tsx:286` links da trilha com `href="#etapa-1"` e `preventDefault`: se o JS falhar o hash router leria `#etapa-1` como rota.
- `DESCRICAO_AREA` (L37-43) e `DESCRICAO_SITUACAO` (L49-60) ficam no componente; pertencem a `tipos.ts` junto de `ROTULO_*`.

#### Brainstorm (montagem)
1. Debounce de 200 ms na busca e `useDeferredValue` para `contagens`; URL atualizada em `requestIdleCallback`; `favoritos` como `Set` no `ContextoLocal`.
2. Pré-calcular `noFoco`/`dup` por item uma vez por (índice, áreas) e reaproveitar nos 8 passes de `contar`.
3. "Presets salvos": gravar o filtro atual com nome ("Joelho não respondidas 20") e listar no herói; o URL já é a chave.
4. Modo "Montar em 3 toques" no celular: uma folha com tema → situação → quantidade e botão fixo; o resto em "Ajustar mais".
5. Passo 2 sempre aberto no celular (são 8 pílulas), passo 3 e 4 fechados.
6. Mostrar no botão da barra o que foi escolhido: "Responder 20 · Joelho · não respondidas".
7. "Continuar de onde parei": sessão em andamento no topo do Treinar, acima do herói.

---

### 4. `TextoEditorial.tsx` (renderização do comentário)

#### Como está
Divide por linha em branco, agrupa linhas consecutivas em lista (`- `), numerada (`1. `), nota (`> `), título (`### `), tabela (`|…|`), parágrafo. Em linha: `**negrito**` e `==destaque==`. Tabela: `<div class="te-tabela" overflow-x:auto>`, primeira linha cabeçalho, separador `|---|` ignorado, `td:first-child` em negrito, 0,86 em no celular com `overflow-wrap: normal; word-break: normal` (`TextoEditorial.css:41-48`). `usarDeslizar.ignorar` (`usarDeslizar.ts:43`) detecta ancestral com scroll horizontal e não rouba o gesto da tabela: correto.

#### Problemas
**Média**
- Itálico `*texto*` não é suportado e aparece com asteriscos crus em **171 comentários**.
- Tabelas largas no celular: 134 linhas com 5+ colunas e 3.350 células com mais de 60 caracteres. Com `word-break: normal` a tabela extrapola a largura e exige rolagem horizontal **sem affordance** (sem sombra nas bordas, sem "deslize para ver"). Na primeira coluna em negrito e 0,86 em, o texto compete com a coluna vizinha. Opção: `min-width` por coluna + sombra de rolagem via `background-attachment`, ou layout "cartão por linha" abaixo de 40 rem (cada linha vira um bloco "Cabeçalho: valor").
- Parágrafo com quebra manual de linha vira **vários `<p>`** com margem de 1 rem (`agruparLinhas` não agrupa `texto`; `TextoEditorial.tsx:39`), e `white-space: pre-line` em `p` (`CSS:10`) nunca tem efeito porque cada `p` é uma linha. Hoje os comentários são escritos em linha única por parágrafo, então passa, mas é frágil.
- `###` é o único título; `##` não é tratado (0 ocorrências hoje). Célula com `|` literal quebra a tabela (não escapa `\|`).
- `Referencias` com `notaIA` (L85-92) é a única menção à origem por IA e fica recolhida: ver item sobre `conferido` acima.
- `TextoEditorial.css` é redefinido (L3-5 e L9-12 repetem `.texto-editorial`, `p`, `strong`).

**Baixa**
- `formatarLinha` (L5-11) usa chaves por índice em fragmentos (ok, estático). Regex `\*\*[^*]+\*\*` não aceita `*` dentro do negrito.
- `.te-destaque` com `#f5df72`/`#e0b862` fixos (`CSS:30-31`) fora dos tokens (repetem o amarelo do grifo em `CartaoQuestao.css:71`).

#### Brainstorm
1. Itálico, `\|` escapado e `##`→`h3`; testes de snapshot em `fixtures/` com os 10 comentários mais complexos do acervo.
2. Tabela responsiva: abaixo de 40 rem, `display: grid` com `data-label` por célula (cabeçalho repetido), ou `.te-tabela--larga` com indicador de rolagem.
3. "Modo leitura" do cartão virar leitura em tela cheia (`Painel`) com fonte maior e tabela em largura total.

---

### 5. `acervo.ts`, `comentarios.ts`, `sessao.ts`, `revisao.ts`, `planoRevisao.ts`, `limiteDiario.ts`

#### Como está
Índice único (1,6 MB bruto) carregado em toda página via `__indiceOrtoQuestoes` no `index.html:84`; temas por arquivo (400-900 KB) com cache por `Promise`; questão avulsa `acervo/q/<id>` até 30 por tema, senão o tema inteiro (`acervo.ts:81-103`); comentário avulso `acervo/c/<id>` com fallback para o arquivo do tema. Filtro/contagem em memória. Edições do painel (Supabase) aplicadas por cima, com `Promise.race` de 3 s (`edicoes.ts:35-51`).

#### Problemas
**Média**
- `carregarQuestoes` (`acervo.ts:107-109`) reconstrói `temaPorId` sobre o índice inteiro a cada chamada; já existe cache `porId` em `WeakMap` (`:233-241`) que poderia servir.
- `comentarios.ts:70-72` `slugDoTema` acha o tema por **nome** (`t.nome === questao.tema`): renomear um tema no índice sem renomear no JSON das questões silencia todos os comentários daquele tema (sem erro).
- Dois `chaveDia`/`inicioDia` com o mesmo nome e semânticas diferentes: `planoRevisao.ts:27-32` (fuso do aparelho) e `limiteDiario.ts:56-71` (São Paulo). `questaoDoDia.ts:4` importa o de `limiteDiario`; `Revisao.tsx:5` o de `planoRevisao`. Um import errado troca o dia silenciosamente. Renomear (`chaveDiaLocal` / `chaveDiaBrasilia`).
- `limiteDiario.ts:97-100` `Promise.race` com `setTimeout` de 12 s sem `clearTimeout`: o temporizador fica vivo após a resposta (sem efeito prático, mas é um timer solto por resposta).
- `sessao.ts:81-82` `registrarRespondida` só na primeira resposta de cada id na sessão; em simulado o usuário pode **trocar** a letra (`CartaoQuestao.tsx:151`) e o registro pessoal (`m`, `p`, `c`) fica com a **primeira** letra, não a entregue. Decisão: ou registra na entrega (`finalizar`) em simulado, ou documenta.
- `revisao.ts:28-31` `dominada` compara `sequencia > intervalos.length` com os intervalos da **última** confiança; mudar de "chute" para "seguro" em revisões sucessivas muda a régua no meio do caminho (comportamento provavelmente aceito, mas não documentado em `Revisao.tsx:144-161`).
- Duplicadas (`dup`): `acervo.ts:253-256` exclui do treino quando a original está no foco; `CadernoErros.tsx:34-46` e `Progresso.tsx:47` tratam diferente (`Progresso` exclui `dup`, `CadernoErros` não), então a mesma questão pode aparecer duas vezes no caderno se foi respondida pelos dois ids.

**Baixa**
- `acervo.ts:192-206` cache global mutável de termos de busca (`ultimaBusca`), funciona, mas é estado de módulo escondido.
- `usarIndice` (`usarIndice.ts:5-20`) é chamado em cada página e componente (`CartaoQuestao.tsx:155`, `FaixaCronograma`, `Treinar`, `Sessao`): cada um tem seu `useState` e `useEffect`; a promessa é compartilhada, mas são N assinaturas. Um contexto único evitaria os renders em cascata.

---

### 6. Páginas satélites

#### `QuestaoDireta.tsx`
- **Média** L75 e L94: `marcadaRevisao={false}` e `aoRevisar={() => undefined}`: a bandeira e a tecla R aparecem e **não fazem nada**. Esconder (prop opcional) ou gravar numa lista global de "marcadas".
- Média: duplica ~20 linhas do portão/limite de `Sessao.tsx:405-422` (L76-87). Extrair `usarResponderComLimite()`.
- Baixa: ao recarregar, a resposta dada some da tela (registrada em `respondidas`, mas o cartão volta a "não respondida"); `historico` mostra que já foi feita, confuso. Não há "próxima do mesmo tema".

#### `Revisao.tsx`
- Média L126: um JSX de uma linha com ~900 caracteres (seção "revisao-detalhe"); ilegível e sem key issues, mas impossível de revisar.
- Baixa L46: `eslint-disable` para `useMemo` com `chaveRitmo`; mesma receita repetida em `usarContextoLocal.ts:46-50`.
- O teto diário padrão 30 (`planoRevisao.ts:22`) e as folgas afetam "Revisar hoje" em todo o site via `idsRevisaoHoje`, mas `CartaoQuestao.tsx:501` diz "Incluída em Revisar hoje" ao errar, o que pode ser falso se o teto já estourou (vai para outro dia).

#### `Favoritas.tsx`, `CadernoErros.tsx`
- Alta (já citada): `iniciar` sem confirmar nem finalizar a sessão em andamento (`Favoritas.tsx:51`, `CadernoErros.tsx:106`).
- Média `CadernoErros.tsx:257-258`: dissertativa mostra "Você marcou A" vazio (ver cartão).
- Média `CadernoErros.tsx:70-75, 85`: filtros e ordenação recalculados a cada render (sem `useMemo`), `focos` com `eslint-disable` dependendo de `respondidas` mas usando `abertos`.
- Baixa `CadernoErros.tsx:179, 193-195, 216, 282`: botões sem `type="button"`; abas com `role="tab"` sem `tabpanel`/setas.
- `Favoritas.tsx:101` estilo inline; `distribuicao__item` reaproveita classe de outra página.

#### `SimuladoNacional.tsx`, `Resumo.tsx`, `Progresso.tsx`, `TemasQueMaisCaem.tsx`, `Resumao.tsx`
- `Resumo.tsx:230-233` refaz com `iniciar` sem `finalizar`/confirm (a sessão já está concluída, então aceitável), mas `:384` "Nova sessão" chama `encerrar()` **antes** de navegar e apaga a sessão concluída que `/sessao` ainda mostraria.
- `Resumo.tsx:106-158` `dados` recalculado com `useMemo` correto; `exportar` (L235-268) gera CSV com `;` sem BOM (Excel pt-BR abre, mas acentos podem quebrar sem `﻿`).
- `Resumo.tsx:278-349` seção "batalha" pixel (tochas, guerreiro, grito) acima dos dados: a leitura do resultado (anel de %) fica abaixo da pirotecnia.
- `SimuladoNacional.tsx:205, 301` `as React.CSSProperties` sem importar `React` (compila pelo namespace global de `@types/react`; `ComoATurma.tsx:1` faz certo com `import type { CSSProperties }`).
- `Progresso.tsx:72, 103, 116, 119, 138, 164, 173` estilos inline em quase todo parágrafo; `GraficoEvolucao` sem `prefers-reduced-motion`/sem leitura por teclado dos pontos (só `onMouseEnter`).
- `TemasQueMaisCaem.tsx:54-62` sétima cópia do padrão `iniciar + navegar`.
- `Resumao.tsx:22-25` `comNegrito` reimplementa um subconjunto de `formatarLinha` de `TextoEditorial` (não suporta `==destaque==`).

---

### 7. Consistência de design (transversal)

- **Controles segmentados**: 6 implementações: `.grupo-opcoes/.opcao-segmento` (cartão), `.tr-modos/.tr-modo` (Treinar), `.ct-seg` (Resumo L494, Conta), `.ce-abas` (Caderno), `.relato__tipos/.relato__tipo` (RelatarErro), `.av__motivos button` (Avaliar). Dois marcam com `aria-pressed`, um com `aria-checked`, dois com classe `ativo`, um com `aria-selected`.
- **Chips**: `.qz-chip`, `.tr-pilula`, `.rs-chip`, `.ce-selo`, `.cm-selo`, `.seletor__etiqueta`, `.tr-opcional`, `.tr-mais__ativas`, `.qz-contador`, `.sn-tema__selo`, `.ti-nivel`: 11 classes para "cápsula com texto curto".
- **Botões**: além de `.botao*`, há `.tr-rapida`, `.tr-foco__opcao`, `.qz-ferramenta`, `.qz-rodape__link`, `.av__botao`, `.av__mudar`, `.av__erro`, `.ti-botao`, `.rs-acao`, `.seta-lateral`, `.concluir-flutuante`, `.menu-grifo`, `.cf-email__acao` (modal de fim reaproveita classes do modal de e-mail: `ModalFimSessao.tsx:33-45`).
- **Cores fora de `tokens.css`**: 60 ocorrências de hex nos CSS de página auditados (grifo, XP, pergaminho, simulados, incidência, dark-mode do `tr-incidencia`). Vários são "pixel art" (`#f4cf7c`, `#1b1208`, `#3a2913`) sem token `--pixel-*`.
- **Pixel art fora de lugar**: `Sessao.tsx:335-338, 350-366` (contador e XP na barra de responder), `Sessao.css:195-211` (dica), `ModalFimSessao.tsx:36`, `Resumo.tsx:279-282`, `CadernoErros.tsx:123, 205` (`MensageiroDormindo`), `Resumao.tsx:79`, `TemasQueMaisCaem.tsx:222, 227`. Em contraste, `Treinar` e o cartão são editoriais/sóbrios. Precisa de decisão do Tales: temporada RPG só em ranking/conquistas/resumo, ou em tudo.
- **Inline styles**: `CartaoQuestao.tsx` 9, `Sessao.tsx` 5, `Resumo.tsx` 4, `Favoritas.tsx` 2, `Progresso.tsx` 7+, `ContribuirComentario.tsx` 8.
- **`window.confirm`**: 12 usos nas páginas; `JanelaCentral` existe.
- **Raio**: `--raio`, `--raio-controle`, `--raio-cartao`, `--raio-grande`, `--raio-pequeno`, mais `10px`, `6px`, `999px`, `0.3em`, `2px` literais.

---

### 8. Código (transversal)

- Tamanho: `CartaoQuestao.tsx` 884 (deveria virar `CartaoQuestao` + `Alternativas` + `AcaoResponder` + `Resultado` + `ComentarioDaIA` + `ComunidadeComentarios` + `Grifo` + `Dissertativa` em arquivos próprios); `Treinar.tsx` 662 (extrair `EtapaFormato`, `EtapaSituacao`, `EtapaFiltros`, `BarraComecar`, `HeroiTreinar`); `Sessao.tsx` 510 (extrair `BarraSessao`, `NavSessao`, `usarDicasSessao`, `usarResponderComLimite`).
- Lógica duplicada: 7 pontos de `iniciar(...)+navegar('/sessao')` (`Treinar.tsx:197-224`, `Favoritas.tsx:48-53`, `CadernoErros.tsx:104-108`, `Revisao.tsx:177`, `TemasQueMaisCaem.tsx:54-62`, `SimuladoNacional.tsx:70-86`, `Resumo.tsx:230-233`); 2 cópias do portão/limite (`Sessao.tsx:405-422`, `QuestaoDireta.tsx:76-87`); 2 cópias de `chaveDia`; 2 renderizadores de negrito (`TextoEditorial.formatarLinha`, `Resumao.comNegrito`); 3 "painéis fecham com Esc + clique fora" (`SeletorArvore.tsx:47-61`, `SeletorMultiplo.tsx:25-39`, `Painel.tsx`).
- `any`: nenhum nos arquivos auditados (bom). `as` perigosos: `Treinar.tsx:358, 421, 521` `e.currentTarget as HTMLDetailsElement` (desnecessário, o tipo já é `HTMLDetailsElement`); `CadernoErros.tsx:228` `erro.registro.m as Letra`.
- Imports/código morto: `SeletorMultiplo.tsx` não importado; `Sessao.tsx:172` grava chave nunca lida; CSS morto listado nas seções 1-3; `sessao.revisar` (bandeira "R") só é consumido por `MapaQuestoes` (contorno tracejado), não existe filtro, lista nem passo no `Resumo`: a ação leva a um beco (`Sessao.tsx:404`, `tipos.ts:286`).
- Efeitos: `CartaoQuestao.tsx:162-200` sem deps; `AvaliarComentario.tsx:54-67`, `CadernoErros.tsx:78-85, 89-100`, `Favoritas.tsx:29-41`, `Revisao.tsx:46`, `usarContextoLocal.ts:46-50`, `usarArmazenado.ts:20-35` com `eslint-disable react-hooks/exhaustive-deps` (7 supressões no escopo). Todos têm cleanup `vivo`; não encontrei vazamento real.
- Listas sem key: nenhuma; keys por índice em grifos (`CartaoQuestao.tsx:274`), comentários da comunidade (`:524`), histórico (`:571`), referências (`TextoEditorial.tsx:94`): aceitável por serem estáticas.
- Estado derivado guardado em estado: `Treinar.tsx:186-194` (abertura dos `<details>`, ok), `CartaoQuestao.tsx:78` `revelada` em dissertativa (ok). `Sessao.tsx:140-142` `restante` é derivado do relógio (necessário para re-render).

---

### 9. Performance (resumo)

- Carga por sessão: `indice.json` 1,6 MB bruto (toda página), `edicoes_questoes` RPC (toda carga de acervo, com 3 s de teto), depois `q/<id>` (até 30 por tema) ou o tema inteiro (`temas/joelho.json` 427 KB), e `c/<id>` por questão revelada (fallback para `comentarios/joelho.json` 887 KB). Em `vite dev` e em qualquer hospedagem que não rode o plugin, cai sempre no fallback grande.
- `busca.json` 2,1 MB na primeira tecla da busca, sem aviso prévio (`usarContextoLocal.ts:35-42`), e só `carregandoBusca` como feedback.
- Re-renders: cada tecla no Treinar re-renderiza o App (hashchange sintético) e roda ~9 `contar`; cada segundo de simulado re-renderiza `Sessao` + `CartaoQuestao` com `lerRespondidas()` ×2.
- `touchmove` não passivo na área inteira da sessão (`usarDeslizar.ts:95`).
- Imagens: `loading="lazy"` na figura principal; sem `srcset`; sem placeholder de proporção quando `largura/altura` faltam (pulo de layout).
- `usarTurmaQuestao` (`turma.ts:20-39`): 1 RPC por questão revelada (cache 10 min); `ComoATurma` e `usarTurmaNasAlternativas` são chamados ao mesmo tempo com condições complementares (`premium`/`!premium`), ok.

---

### 10. BRAINSTORM geral (10-15 ideias; marcação: [SQL] exige servidor/Supabase, [Tales] exige decisão do dono)

1. **Barra única de resposta no celular**: confiança (3 segmentos) + "Responder B" fixos no rodapé, sempre visíveis; some ao responder e vira "Próxima →". Sem salto de layout.
2. **Eliminar alternativa por gesto**: deslizar a alternativa para a esquerda (ou toque longo) risca; no desktop o X com 44 px. Risco persiste na sessão (já persiste).
3. **Acordeão por alternativa no comentário**, com a sua e a correta abertas; cada cabeçalho mostra "% da turma marcou" para assinante.
4. **Selo "Revisado por médico / Sem revisão médica"** no cabeçalho do comentário, lendo `conferido`. [Tales: texto do aviso]
5. **Modo prova real**: sem combo/XP/pixel, cronômetro recolhido, sem comentário até entregar, folha de respostas só com letras; opção de "ordem da prova" respeitada. [Tales]
6. **Retomar sessão**: cartão "Você parou na 7 de 20 · Joelho" no Início e no Treinar; `/sessao` concluída redireciona para `/resumo`.
7. **Presets de filtro** nomeados e compartilháveis (o URL já é o preset): "Minhas sessões" no herói do Treinar. [SQL se for sincronizar entre aparelhos]
8. **Montar em 3 toques (celular)**: folha "O que · Quais · Quantas" com valores padrão e um botão; "ajustar mais" abre a página completa.
9. **Marcar para revisar com destino**: a bandeira cria uma lista "Marcadas" (filtro de situação + seção no Resumo "Você marcou 3 para rever"). Hoje é beco.
10. **Cronômetro por questão opcional** com pausa automática ao sair da aba e comparação "você levou 48 s · turma 1 min 10 s". [SQL para a mediana da turma]
11. **Tabela responsiva** no comentário (cartão por linha abaixo de 40 rem) + itálico; teste de snapshot com os 10 comentários mais complexos.
12. **Tamanho de fonte na sessão** (A-/A+ no cabeçalho do cartão), gravando em `tamanho-fonte` já existente.
13. **"Por que errei" em um toque**: ao errar, rolar automaticamente para a análise da letra marcada (hoje rola para o topo em `Sessao.tsx:189-191` só ao trocar de questão).
14. **Pré-carga da próxima questão** (texto e imagem) quando a atual é respondida, e `preload` das figuras da sessão em `requestIdleCallback`.
15. **Avaliação do comentário com um gesto** (👍/👎 no fim do bloco, sem motivo obrigatório; motivo opcional em seguida) e envio em lote. [SQL: já existe tabela]
16. **Debounce + Web Worker para `contar`** (ou pré-índices por tema/situação) para a busca no Treinar fluir no celular.

---

### Top 15 tarefas desta área (prioridade; tamanho P/M/G; paralelizável)

1. **Impedir sessão concluída de continuar interativa** (`Sessao.tsx:257`: redirecionar para `/resumo` se `concluidaEm`; `Resumo.tsx:384` não `encerrar` antes de navegar). P · paralela.
2. **Um único `iniciarSessao` com confirmação e `finalizar` da anterior**, usado pelas 7 páginas (`Favoritas`, `CadernoErros`, `Revisao`, `Resumo`, `Treinar`, `TemasQueMaisCaem`, `SimuladoNacional`), com `JanelaCentral` em vez de `window.confirm`. M · paralela com 1.
3. **Respeitar `embaralhar=false` em `montarSessao`** (`acervo.ts:429-444`: não intercalar quando "ordem da prova"). P · paralela.
4. **Debounce/`useDeferredValue` na busca e nos filtros do Treinar + `favoritos` como Set + reaproveitar `porId`** (`Treinar.tsx:90-95, 106-161`, `acervo.ts:291, 368, 107-109`). M · paralela.
5. **Tirar `lerRespondidas()` do render do cartão** (passar `registro` por prop ou `useMemo` por `questao.id`) e memoizar `CartaoQuestao`/callbacks em `Sessao` para o cronômetro não re-renderizar o cartão. P · paralela.
6. **Mostrar `conferido`** ("Revisado por médico" / "Ainda sem revisão médica") no cabeçalho do `ComentarioDaIA` e alinhar o texto de `Progresso.tsx:166-168`. P · depende de decisão de texto (Tales) · paralela.
7. **Alternativas sem comentário aparecem com "Sem análise desta alternativa"** em `ComentarioDaIA` (`CartaoQuestao.tsx:703-705`), e script de validação que aponte comentários com `incorretas` incompletas para questões de 5 alternativas. P (UI) + P (script) · paralela.
8. **Dissertativa não registrar letra 'A'** (`CartaoQuestao.tsx:130`; aceitar `escolhida` opcional em `Resposta`/`registrarRespondida`; `CadernoErros.tsx:257` ignorar `m` quando `tipo === 'dissertativa'`). M · paralela.
9. **Confiança sempre visível antes de "Responder" + barra fixa no celular sem salto**, e mostrar a dica de confiança também no celular. M · depende de 5 para não piorar renders · pode começar em paralelo.
10. **Acessibilidade do cartão**: `role="radiogroup"/"radio"`, não usar `disabled` após responder (`aria-disabled`), alvos de 44 px (`.riscar`, `.qz-ferramenta`, `.tema-cartao__sub`), contraste do tema escuro (`#fff` sobre `--acerto`/`--verdete`). M · paralela.
11. **`TextoEditorial`: itálico, `\|`, tabela responsiva no celular com affordance de rolagem** + fixture de snapshot com comentários reais (`joelho-0016` tem tabela). M · paralela.
12. **Reduzir ações da sessão**: fundir "Pular por agora" em "Próxima", mover "Próxima não respondida"/"Encerrar" para um menu, regra única de habilitação do "Concluir" (`Sessao.tsx:437-473`). P · paralela.
13. **Dar destino à bandeira "marcar para revisão"** (lista/filtro "Marcadas" + bloco no Resumo) ou retirá-la do `QuestaoDireta` (`QuestaoDireta.tsx:75, 94`) e do cartão. M · decisão do Tales sobre manter.
14. **Dividir `CartaoQuestao.tsx` em 6-7 arquivos e `Treinar.tsx`/`Sessao.tsx` em subcomponentes/hooks**; `useEffect` dos atalhos com deps; remover CSS/código morto (`SeletorMultiplo.tsx`, classes listadas, `dica:teclado`). G · fazer depois de 1-12 para não conflitar.
15. **Decisão de design sobre pixel art na tela de responder** (barra XP, Pixelify no contador, dica-pergaminho, modal de fim) e tokens `--pixel-*` para as cores fixas; unificar controles segmentados em um componente `Segmentos` e as 11 classes de chip em `.chip` com variantes. G · [Tales] · depois de 9-12.

Observação final: `acervo/q` e `acervo/c` só existem no `dist` (plugin em `vite.config.ts:16-44`). Qualquer teste manual em `vite dev` mede o pior caso (tema inteiro + comentários inteiros por questão); vale deixar isso explícito em `docs/` para quem for medir desempenho.


---

# Anexo C · Cronograma, ranking, conquistas e ligas (relatório completo)

## Auditoria (só leitura): cronograma, ranking, conquistas e ligas

Base: `/home/user/ortoquestoes`, 15/10/2026. Li `AGENTS.md`, `docs/cronograma/PLANO.md`, todos os arquivos do escopo e as 4 fixtures do cronograma; rodei as fixtures (as 3 passam) e um script de sondagem do motor com o `indice.json` real (6.947 questões, 11 temas). Linhas citadas são do estado atual dos arquivos.

---

### 1. Motor: `src/dados/planoEstudo.ts` (704 linhas)

**Como está.** Simulação dia a dia (`calcularPlano`), passadas por incidência, blocos de ~3 dias com 30% de mistura, dia leve, semana difícil, mini-simulado a cada 14 dias, teto de 25%, adiantar com `opcoes.adiantados`. Bem documentado, testado (`fixtures/testar_cronograma_{reforma,adiantar,simulados}.mjs`). Custo medido em Node: **43 ms por `calcularPlano`** (plano firme do zero).

**Problemas**

- **ALTA — Teto do atraso dispara num plano recém-criado quando há 2+ dias leves (ou folgas + leves).** `metaPlanejada` (`planoEstudo.ts:362`) = `alvo / diasDeEstudoCriacao.length`, e `diasDeEstudoCriacao` (L338-339) conta dias leves e difíceis como dias normais. `normalCom` (L364-368) compara `precisa` (que já descontou `fixos` e divide só por `pesoNormal`) com `metaPlanejada × 1.25`. Sondagem com plano criado hoje, prova 10/01/2027, folga domingo:
  - sem dia leve: meta 63, teto não, cortadas 0;
  - leve [qua] 15: meta 73, teto não;
  - **leve [ter, qui] 15: meta 77, `tetoAtivo = true`, `cortadas = 428`, `alvoPct = 89%`**;
  - **leve [seg, qua, sex] 10: `cortadas = 1196`, `alvoPct = 69%`**;
  - folgas [dom, sáb] + leve [ter, qui]: `cortadas = 827`, `alvoPct = 78%`.
  Efeitos: o aviso "A meta subiu o máximo (25% acima da planejada)…" (`CronogramaPainel.tsx:144`) aparece no primeiro dia de um plano novo; o plano descarta 11-31% do alvo em silêncio (a montagem só mostra "Cobre X% da prioridade máxima", não o corte total). Correção: calcular `metaPlanejada` com o mesmo calendário de tipos (fixos/pesoNormal) desde `criado` até `inicioRetaFinal`, ou gravar a meta planejada na criação. Acrescentar caso na fixture (`tetoAtivo === false` para plano novo com leves).
- **MÉDIA — `calculo` fica preso ao dia em que foi calculado.** `calcularPlano(indice, respondidas, plano)` usa `agora = new Date()` capturado e é memoizado por `[indice, plano, respondidas]` (`PlanoEstudo.tsx:99`, `CaixasAssinante.tsx:37`). Aba/PWA aberta passando da meia-noite: `metaDiaria`, `hoje`, `dias[0]` são de ontem, enquanto `OndeVoceEsta` (L34), `CartaoHoje` (L118), `EstaSemana` (L264) e `diferencaDias` (L259) usam `new Date()` próprio → "Hoje: quinta" com a lista de quarta, `cp-dia--hoje` num dia e `dias[0]` em outro. Correção: dependência `chaveData(new Date())` atualizada por timer na meia-noite + `visibilitychange`.
- **MÉDIA — `focosQueFaltam` custa 24 dos 43 ms e o resultado quase não é usado.** Chamado em todo cálculo (L253) só para `SemanaPlano.temas[].focos`; `SemanaASemana` não usa `t.focos` e `calculo.hoje.focos` vem de `principalHoje.assuntos`. `idsDoFoco` (`incidencia.ts:116`) varre as 6.947 questões por foco, sem cache (também em `mapaDeRisco` 34 ms e `pontosCegos` 14 ms). Um índice `Map<slug, Map<subtema, ids>>` por `indice` resolve os três.
- **BAIXA — Teto de 100 por item.** `hoje.n = min(faltaHoje + adiantarFalta, 100)` (L519) e `Math.min(i.n, 100)` por item (`PlanoEstudo.tsx:154`): "2 dias" de adiantamento (até 120-150) promete no botão mais do que a sessão leva.
- **BAIXA — Quatro formatos de chave de dia e três cópias de "segunda da semana".** `chaveData` (L89, `AAAA-MM-DD`), `chaveSegunda` (L336) ≡ L483 ≡ `EstaSemana` L265-267 ≡ `semanaDificil` `PlanoEstudo.tsx:213-214`; `chaveHoje` (`PlanoEstudo.tsx:278`, sem zero à esquerda); `chave` do hub (`hubCronograma.ts:25`, mês 0-indexado). Extrair `segundaDe(d)` e usar `chaveData` em tudo.
- **BAIXA — `ordemTemas` ignora `comecarPor` inexistente** (slug de tema sem questões livres): sem erro, só não começa por ele. Avisar no formulário.
- DST/fuso: datas sempre via `new Date(y, m, d)` local e `diasEntre` com `Math.round` → ok. Prova no passado é bloqueada no cliente (`dataValida`, `PlanoEstudo.tsx:563`) e no SQL (parte 20 L33); se chegar via banco, `fase = 'passou'`, `dias = []`, sem divisão por zero (`Math.max(1, …)` em L275, L362; `pesoNormal > 0 ?` em L365). Folgas limitadas a 5 no formulário (L675). Plano sem respostas: ok (sondado).

**Brainstorm (motor)**
1. Gravar `metaPlanejada` e `alvo` na criação (em `opcoes`), em vez de recalcular: estabiliza o teto e permite "você planejou 60/dia, está fazendo 48". (sem SQL)
2. "Modo prova" na véspera já existe; falta "dia de recuperação" automático após 3 dias perdidos: meta = mínimo + catch-up suave. (sem SQL)

---

### 2. `src/dados/hubCronograma.ts` (401 linhas)

**Como está.** Constância, elogio, esquecimento, mapa de risco, pontos cegos, diagnóstico, reta final, mini-simulado, tempo por questão, prontidão. Puro, testado por `testar_hub_cronograma.mjs`.

**Problemas**
- **MÉDIA — "Cumprido" tem dois significados.** Constância = ≥10 respostas quaisquer no dia (`respostasPorDia` L50 não filtra `entraNoPlano`, conta revisões e áreas à parte); meta do cronograma = questões novas do plano. `EstaSemana` pinta ✓ "feito" num dia passado em que a pessoa só revisou (`CronogramaPainel.tsx:278`), enquanto `conferirMetaCronograma` (`feitos.ts:100-104`) e o emblema `cronograma-28` usam a meta real. A semana diz "feito", o emblema diz "não".
- **BAIXA** — `_calculo` não usado (L59); peso por `AREAS.findIndex` (L145) duplica `pesoIncidenciaDoTema`; `prontidaoPorArea` e `desempenhoPorArea` repetem o cálculo de `posicao`.
- **BAIXA** — `minutosPorQuestao(lerHistorico())` é chamado em todo render de `PlanoEstudo` (`montarHub`, L252): `JSON.parse` do localStorage por render.

---

### 3. `src/conta/cronograma.ts` (96 linhas) + SQL parte 20

**Problemas**
- **MÉDIA — "Salvar ajustes" apaga os adiantamentos.** `FormularioPlano.opcoes()` (`PlanoEstudo.tsx:567-571`) remonta `opcoes` sem `adiantados`; o SQL faz `opcoes = coalesce(p_opcoes, p.opcoes)` (parte 20, L44) → substitui tudo. Quem adiantou ontem e hoje muda a data/folga perde o crédito (a meta de hoje volta ao cheio e o extra se dilui). Mesmo caminho descarta `provaExtra` se o nome ficou vazio (talvez intencional).
- **MÉDIA — "Ficou só neste aparelho" é falso.** Ao falhar o servidor, `semanaDificil` (`PlanoEstudo.tsx:221`) não grava nada local, e `guardarAdiantamento` (L95) grava `CHAVE_OPCOES`, que `obterPlano` (L25) só lê quando o servidor **não tem** a coluna (ela existe desde 14/10). No reload o ajuste some.
- **MÉDIA — Registro de hoje reescrito por mudança de meta no mesmo dia.** `opcoesComAdiantamento` guarda `meta: calculo.metaDiaria` (L88). Se depois de fazer 40 a pessoa ativa "semana difícil" (meta vira 10), o efeito de `extraHoje` regrava `{meta: 10}` e `extra = 30` → amanhã desconta 30 que não eram adiantamento. Combinação semana difícil + adiantar não tem teste.
- **BAIXA — Mesmo salvamento disparado de 3 lugares** (`PlanoEstudo.tsx:103-108`, `CaixasAssinante.tsx:41-46`, `adiantar()` L182-192), cada um fazendo `salvar_plano_estudo` completo + `obter_plano_estudo`. Com `plano` de closure antiga (eslint-disable), dois saves podem se cruzar; o `null` de `opcoesComAdiantamento` mitiga mas não elimina.
- **BAIXA — Código de fallback obsoleto:** as 3 tentativas por 404 em `salvarPlano` (L41-50), `ETAPA_SIMULADOS_EM`/`mostrarNovidadeSimulados` (L55-58) e `NovidadeSimulados` renderizado em 2 páginas; a parte 20 está aplicada.

---

### 4. `src/paginas/PlanoEstudo.tsx` (766 linhas) + `PlanoEstudo.css` (330)

**Como está.** Um arquivo com 5 coisas: página do assinante (estado, efeitos, RPC), `VisaoCronograma` (composição dos blocos + lista de hoje + botão), `PreviaCronograma` (vitrine), `FormularioPlano` (4 passos) e `ResultadoAoVivo`, mais `SemanaASemana` (detalhe antigo) e `resumoDaSemana`. Segue a ordem do PLANO (onde você está → hoje → amanhã → semana → depois → como está indo → recolhidos) no celular via `order` (`CronogramaPainel.css:226-232`).

**Problemas**
- **ALTA (UX) — "Ajustar o cronograma" só no rodapé** (L454-457), depois de 6 blocos recolhidos. Para trocar data/folga a pessoa rola a página inteira. Deveria estar em "Onde você está" (lápis ao lado do selo) e no cartão Hoje em dia de folga.
- **MÉDIA — Vitrine do não assinante contradiz a orientação do Tales (PLANO, "Quem não assina": "sem os números").** `PreviaCronograma` → `VisaoCronograma aberto={false}` monta a mesma lista de hoje com "63 questões novas", "~1h30", "Seu dia", chips de assuntos (L363-370, L420). O que está desfocado é só o "Depois" (L440-449). Além disso há **3 CTAs iguais** ("Criar meu cronograma": aviso L412, botão do cartão L389, Degustação L447) e nada sobre o que custa/inclui. Convence pouco: mostra o produto quase inteiro grátis e repete o pedido 3 vezes.
- **MÉDIA — Montagem no celular trava a cada toque.** `simulacoes` (L573-584) roda `calcularPlano` 3× (~130 ms em Node; estimativa 300-600 ms num celular médio) a cada toque em folga/dia leve/dominada e a cada tecla da data. `useMemo` não ajuda (deps mudam). Debounce de ~150 ms, ou só a intensidade escolhida em sincronia e as outras duas em `requestIdleCallback`. Fora isso a montagem em passos funciona: 1 pergunta por tela, barra fixa `pe-ao-vivo` (`CronogramaPainel.css:272-284`), diferença "+5 por dia" animada.
- **MÉDIA — Dois "faltam N dias" diferentes.** Formulário: `Math.ceil((dataLocal(data) - Date.now()) / DIA)` (L644, L737) → 88; painel: `diasEntre` → 87. Mesma prova, dois números na mesma jornada.
- **MÉDIA (PLANO 23 [~]) — Resumão não abre na área.** Item "Resumão do tema" aponta para `href('/resumao')` (L363); `Resumao.tsx` não lê consulta. E é marcado "feito" no clique, antes de ler.
- **MÉDIA (PLANO 14 [~]) — Só o TEOT tem data** (`DATA_TEOT`, L32); `PROVAS` oferece TARO e ENARE R4 sem atalho. Decisão do Tales: datas oficiais do TARO/ENARE (T).
- **MÉDIA — `montarHub()` roda em todo render** (L224-257): recria 12 closures, lê localStorage; `VisaoCronograma` re-renderiza tudo a cada tecla do estado. Envolver em `useMemo`/`useCallback`.
- **BAIXA** — `useState(primeiraVisita)` (L347, L510-516) grava `cronograma-visto` **também na vitrine**; quando assinar, "Como funciona" nunca abre sozinho. `apagar()` recarrega a página (L607). `adiantar()` com meta feita navega e deixa o `await guardarAdiantamento` órfão: se a RPC falhar, o pedido fica só em memória (L188-191). `DEMO` lido do hash na carga (L49).
- **BAIXA (a11y)** — `role="radio"` com `aria-pressed` junto (`CronogramaPainel.tsx:510`); radios sem navegação por setas (L661, L700); ações da lista `.cp-lista__acao` com ~26 px de altura (`CronogramaPainel.css:67`) — alvo < 44 px; detalhe do dia só em `title` (`CronogramaPainel.tsx:304`), invisível no toque.
- **CSS morto em `PlanoEstudo.css`:** `.pe-ritmo`, `.pe-meta`, `.pe-progresso`, `.pe-fracos`, `.pe-dados`, `.pe-incidencia`, `.pe-retomar`, `.pe-adiantar`, `.pe-hoje__revisao`, `.pe-semana__foco/__resumo/__porque/__legenda`, `.pe-heroi__fatos`, `.pe-form__passo`, `.pe-fases*` (0 usos em TSX) ≈ 110 linhas. `.pe-assunto` definido 2× (L106 e L142) e media queries contraditórias (L121 `small {display:none}` vs L159 `display:block`).

**Brainstorm (página)**
3. Vitrine "sem números" de verdade: mostrar o cartão Hoje com a área, o "por que hoje" e chips, e a lista com itens sem quantidade ("questões novas", "~1h"), um só CTA, e um "exemplo de amanhã" borrado. (sem SQL)
4. Mover "Ajustar" para o topo e transformar o rodapé em "Semana a semana" (o detalhe antigo), que hoje só aparece dentro de "Ver as N semanas".

---

### 5. `src/paginas/CronogramaPainel.tsx` (516) + `CronogramaPainel.css` (287)

**Como está.** Peças da reforma: `OndeVoceEsta` (trilho), `CartaoHoje` + `ItemDaLista`, `PainelAdiantar`, `LinhaAmanha`, `EstaSemana`, `Depois`, `ComoEstouIndo`, `Prontidao`, `Recolhido`, `TourCronograma`, `ResumoSemana`, `gerarIcs`/`ExportarCalendario`. Boa aderência aos princípios 1-6 do PLANO; textos com unidade e tempo.

**Problemas**
- **MÉDIA — "Depois" recolhido esconde Reta final e Prova.** Os dois marcos só entram quando `tudo || semanas.length <= maximo` (L375-378). Em planos com > 5 semanas (o caso normal) a linha do tempo recolhida termina numa semana qualquer, sem o castelo da prova; contraria o PLANO ("marcos em dourado tracejado… recolhida em 4 ou 5 itens").
- **MÉDIA — Estados fora do dicionário do PLANO.** PLANO: feito, agora, a fazer, folga, atrasado (laranja), marco (dourado tracejado). Código: `'perdido'` em **vermelho** `--erro` com rótulo "não feito" (`CronogramaPainel.css:142`), `'parcial'` na cor **de "agora"** (L143), `'antes'`; mini-simulado na semana é um ★ no nome (L149), não marco dourado tracejado; `cp-dia--adiantado` em verde. Não existe "atrasado" como estado visual.
- **MÉDIA — Marcador "você" desalinhado.** `pos` (L51) é linear sobre `fim − inicio`, mas as faixas têm `Math.max(0.6, dias)fr` por trecho + `0.5fr` fixo da prova (L71) → em planos curtos o ponto cai fora da fase destacada. Também `left: calc(pos% * 0.96)` é um ajuste manual.
- **MÉDIA — `HojeRetaFinal` (CronogramaHub) usa a linguagem antiga** (`pe-hoje`, sem cor de área, sem lista com tempo/estado, sem "Seu dia"), então ao entrar na reta final a página troca de visual. O PLANO pede "estados iguais em todo lugar".
- **BAIXA** — `passadaNova` (L344) pode anunciar "Começa a 2ª passada" num dia em que só um item secundário é da passada seguinte (o motor completa o dia pela fila, `planoEstudo.ts:466`). `provaExtra` dentro da semana atual nunca aparece em "Depois" (L354). ICS sem `TZID` e sem dobra de linha a 75 octetos (L474-480); `DTEND` = hora + 1 fixo. `Recolhido` com `open={aberto}` controlado: se `aberto` mudar depois, fecha o que a pessoa abriu. Tour (L437-450) é um cartão estático de 3 linhas, não aponta/rola para os blocos.
- `CronogramaHub.FasesCronograma` (L24-52) é **código morto** (nenhum import) junto com `.pe-fases*`.
- `CartaoDesempenho` (barras verde/vermelho) e `MapaRisco` não usam `corDaArea`, mas `Prontidao` logo acima usa → o mesmo bloco recolhido tem duas linguagens.
- `AvisoDiagnostico` diz **30** questões (`TAMANHO_DIAGNOSTICO`); PLANO item 15 diz "Diagnóstico de 20 questões". Alinhar texto ou código.

---

### 6. `src/dados/coresAreas.ts`

- 11 cores fixas, usadas em: Hoje, Amanhã, Esta semana, Depois, Prontidão, chips de `SemanaASemana`, faixa da sessão (`Sessao.tsx:59`). **Não usadas em:** `CartaoDesempenho`, `MapaRisco`, `CartaoCronograma` da página inicial (`TrilhaJornada` sem área), `FimCronograma` (Resumo), página `/dados`. PLANO 7 diz "compartilhada pelo site" — está em ~60%.
- **MÉDIA — `mao: '#c9952f'` é o dourado da marca** (mesmo hex de `.cp-botao--ouro`, `.inv__total`, `--px-ouro-sombra` próximo). "Mão e punho" fica igual ao estado "agora/marco". Trocar.
- Sem variante para tema escuro (chips usam `color-mix` com `--texto`, aceitável; faixas de 6 px em `#2e64a8` sobre fundo escuro perdem contraste).

---

### 7. `src/componentes/CaixasAssinante.tsx` (página inicial)

- **MÉDIA — `TrilhaJornada` sempre mostra "Semana 1 de N".** `calculo.semanas` começa em hoje, então `atual = 0` sempre (L102), nenhuma casa fica "feita", N = semanas restantes; o painel diz "semana 5 de 13" (`semanaNumero/semanasTotal`). Dois contadores diferentes para a mesma semana.
- **MÉDIA — Lógica duplicada em 3 telas.** `usarCronogramaHoje` (L22-48) repete `PlanoEstudo` (obterPlano → calcularPlano → conferirMeta → guardarAdiantamento) e alimenta `FimCronograma` (`Resumo.tsx:582`). `pendente` é calculado de dois jeitos (`CaixasAssinante.tsx:28` vs `PlanoEstudo.tsx:281`). Um hook `usarCronograma()` com cache por sessão (plano + cálculo + ações) resolveria.
- `CaixasAssinante` agora só tem `CaixaTemas` (L52-58): o invólucro `cx-bloco` sobrou. CSS morto: `.cx--crono`, `.cx-meta`, `.cx-exemplo`, `.cx-semanas`, `.cx-passos`, `.cx-duas` (`Inicio.css:382-405`, `recursos.css:133`).

---

### 8. Ranking: `src/paginas/Ranking.tsx` (418) + `Ranking.css` (688) + `premium.css` (ranking L330-375) + `temporada.css` (L193-209)

**Como está.** Herói pixel (Jersey) com tochas; abas Questões / Flashcards (Beta) / Conquistas; "baú" com vitrine; aviso de visitante; abas Geral / 7 dias + link da liga; Escadaria "Subindo rápido" (`EmAlta`); Top 3 no `SalaoCampeoes` (HD-2D, Cinzel); lista top 50 → 100; regras recolhidas. Dados por RPC com fallback para RPC antiga. Empate: `row_number() over (total desc, created_at)` → sem posições repetidas (bom; mas quem empata perde para o mais antigo sem explicação).

**Problemas**
- **MÉDIA (UX) — O que é o número e o que é "fogo" não está claro na dobra.** O total (questões diferentes) só é explicado no `<details>` fechado do fim (L384-392). Na mesma tela há **três fogos**: `rk-chama` (subiu 3+ posições, L44-53), `Fogueira` (sequência ≥ 3 dias com 5+/dia, `Inventario.tsx:56`) e, no cronograma, `pe-constancia__fogo` (10+/dia). A legenda (L349-355) só aparece quando há `referencia_em`; `Movimento` pode mostrar chama sem número (L60-63). O herói diz "cada dia acende a fogueira" sem dizer o critério.
- **MÉDIA — Duas "sequências" com regras diferentes na mesma conta.** `streak.ts` (5/dia, dia corrido, folga zera) vs `hubCronograma.calcularConstancia` (10/dia, folga não quebra) vs emblema `cronograma-28` (meta do dia). Ranking: "12 dias"; cronograma: "3 dias seguidos". Decisão do Tales: unificar o critério ou nomear diferente ("fogueira" vs "constância").
- **MÉDIA — Peso visual/animações.** Salão: 6 PNG em camadas + 34 poeiras + 12 brasas + 5 raios com `blur`/`filter` animados; Escadaria: fundo + 16 brasas + 9 frames de chama; tochas; 50 linhas × até 3 `Medalha` + `Fogueira` + `Dica`; e a regra global `pixel-flutua` em **toda** `img[src*="emblemas/"]` (`recursos.css:383-389`) → centenas de animações simultâneas no celular. `prefers-reduced-motion` está coberto (`Ranking.css:586, 688`), mas o padrão é pesado. Tipografia: três famílias "de jogo" na mesma página (Jersey no herói, Cinzel no Salão, Pixelify nas placas/dicas) = pixel art poluída.
- **MÉDIA — `meuTotal` local** (L175: `Object.keys(contexto.respondidas).length`, inclui cópias/anuladas) alimenta "Faltam N para entrar" e `conquistaAtual`; o servidor conta diferente → mensagens divergem.
- **BAIXA** — `import` no meio do arquivo (L18-29 depois de `AbasRanking`). `DEMO` com `as unknown as`. `AbasRanking` reimplementado em `RankingCripta.tsx:20-24` sem contador nem selo Beta. `rk-fora` compara posição com `visiveis.length` (L379).
- **CSS morto:** `.rk-arena*`, `.rk-podio*` (`Ranking.css:73-140, 254-300`, ~120 linhas; 0 usos em TSX), `public/ranking/podio-festa.png` e `PodioPixel cena="festa"` (só `cripta` é usada).
- **Conflitos de camadas:** `base.css .cartao { border-radius: var(--raio) }` → `premium.css:325 .cartao { border-radius: var(--raio-cartao) }` → `temporada.css:20-28 .pe .cartao { border: 2px; border-radius: 6px; box-shadow: 5px 5px 0 !important }`. No cronograma, os cartões `CartaoConstancia`/`CartaoDesempenho`/`MapaRisco` (classe `cartao`) dentro de `.cp-recolhido` (1 px, `--raio-cartao`, `CronogramaPainel.css:185`) ganham borda pixel e sombra deslocada; `.cp-recolhido__corpo > .cartao { box-shadow: none }` (L195) **perde** para o `!important`. Mesma página, dois sistemas (pixel da temporada × limpo da reforma), e `.cp-onde h1` em Jersey enquanto o resto é Inter.

**Brainstorm (ranking)**
5. Painel "Como você se compara" no herói do logado: posição, questões/dia da semana vs. o top 50, próxima pessoa acima e quanto falta — a "missão" já existe (L146-151), falta o contexto. (sem SQL)
6. Ranking semanal com "fechamento" aos domingos e cartão compartilhável (já há `gerarImagemStreak`). Depende de `ranking_semana` já no servidor (`meus_feitos`), então quase sem SQL.
7. Arena por serviço: filtro do top 50 por `servico` para quem ligou a opção. (SQL: índice/RPC com filtro) (T)

---

### 9. Conquistas: `src/estado/conquistas.ts` (908) + `usarConquistas.ts` + `streak.ts` + `Inventario.tsx` + `Medalha.tsx` + `feitos.ts`

**Como está.** 168 emblemas em 39 famílias (13 secretas de 1 emblema cada; `chefes` 4, `arena` 3, `nacional` 3). Dados (L149-439, 290 linhas) e lógica (`calcularMetricas`, L674-885, 210 linhas num laço só) no mesmo arquivo; `Metricas` com ~60 campos. Travamento no servidor (`registrar_conquistas`), sequência não trava (de propósito). `fixtures/testar_conquistas.mjs` existe. 173 PNGs em `public/emblemas` (764 KB) com `loading="lazy"`.

**Problemas**
- **MÉDIA — Inventário é um muro.** 168 cartões renderizados de uma vez (`Inventario.tsx:182-192`), sem filtro ("perto de ganhar", "conquistadas", "por família"), maioria com "0 / 300". Famílias de 1 emblema geram 20 títulos de seção para 20 cartões. `FAMILIAS[].unidade` (L52-92) nunca é usada (0 referências) — 40 linhas mortas.
- **MÉDIA — Progresso enganoso em "Mestre de tema".** `valorDe` (L888-894) trava em `minimo − 1` até ter 10 acertos seguidos no tema: a barra mostra "99 / 100" para sempre sem dizer por quê.
- **MÉDIA — Fuso e chaves de dia misturados.** `registrarFeito` usa `limiteDiario.chaveDia` (America/Sao_Paulo, `feitos.ts:62`); `streak.ts`/`conquistas.ts` usam `planoRevisao.chaveDia` (local); `metricasDoServidor` lê `criado_em.slice(0,10)` (UTC, L605) enquanto o cronograma usa `meiaNoite(new Date(criado_em))` local. Plano criado às 22h de Brasília: "Do início ao fim" (L604-609) exige um dia a mais. Para quem estuda fora do Brasil, dias diferentes para o mesmo evento.
- **MÉDIA — `conferirMetaCronograma` e `maiorSequencia(metas, folgas)`** (L634) reinterpretam o histórico com as **folgas atuais**: mudou a folga, a sequência passada muda; dia leve/difícil contam como normais (ok), mas um dia de folga em que a pessoa estudou não registra feito e é pulado — coerente.
- **BAIXA — Conquista "duas vezes" / "nunca":** `arena-campeao` usa `seguidas(p => p === 1) ? 1 : 0` (L639) → ok; `nacionalElite` só com `classificados ≥ 20` → antes disso **nunca** se cumpre mesmo em 1º; `secreta-3h14` depende do minuto exato do `em` local — alcançável, mas fica impossível para quem muda de fuso. `platina` exige todos os não-secretos incluindo `indicacao-10`, `editorial-1000`, `especialista-taro` (1.000 questões TARO) → na prática inalcançável (talvez intencional pelo `docs/emblemas.md`).
- **BAIXA — `usarConquistas`** roda `calcularMetricas` sobre todas as respostas em `Inicio` **e** `Ranking` a cada mudança de `respondidas`; `registrarConquistas` por efeito em cada tela. Centralizar num contexto.
- **BAIXA** — `Dica` abre portal `role="dialog"` sem mover o foco (`Inventario.tsx:43-51`) e fecha ao rolar (L29); `inv-slot` assume quadrado mas a `Medalha` SVG tem 48×56.
- **`CartaoStreak.tsx` (114 linhas) é código morto** (0 imports) com `.cartao-streak`/`.anel-sequencia` no CSS e `gerarImagemStreak` só usado por ele.
- Estrutura sugerida: `estado/conquistas/emblemas.ts` (dados), `metricas.ts` (cálculo, quebrado em funções por família: tempo, precisão, provas, servidor), `familias.ts`, `index.ts` (API atual). `FamiliaId` literal com 39 membros vira `keyof typeof FAMILIAS`.

**Brainstorm (conquistas)**
8. Filtro padrão "Quase lá" (≥ 60% do mínimo) + "Conquistadas" + "Todas"; secretas agrupadas num baú único "13 secretas" em vez de 13 cartões "?". (sem SQL)
9. Emblemas do cronograma com arte e níveis intermediários (7 e 14 dias) — PLANO 31 [~]; precisa de arte (T).
10. "Conquista da semana" no herói do ranking: a próxima mais perto para aquela pessoa. (sem SQL)

---

### 10. `src/paginas/Ligas.tsx` (274) + `Ligas.css` (33)

**Como está.** Funciona, não é esboço: criar (limite 5), convite por link/WhatsApp, prévia pública do convite, entrar (limite 20 ligas / 300 membros), detalhe com geral/7 dias, remover membro, renomear, sair/encerrar, degustação para não assinante. Reaproveita `.rk-lista`.

**Problemas**
- **MÉDIA — Só volume.** Mesma métrica do ranking geral; PLANO 32 [ ] pede "constância, não volume" (precisa de servidor: `meta_cronograma`/dias por membro) (T).
- **BAIXA** — `window.prompt` para renomear (L217) e `confirm` em tudo; `nova` lido do hash em render (L187); `DetalheLiga` baixa `minhas_ligas` inteiro só para achar a liga (L191); sem validação do formato do `codigo`; visual sem a "temporada" (herói limpo ao lado do ranking pixel) → inconsistência entre vizinhas; sem `aria-live` após copiar o link.

**Brainstorm (ligas)**
11. Liga com "meta coletiva da semana" (soma de dias com ≥10 questões / membros) e barra única — constância em grupo (SQL: RPC `ranking_liga` com `dias_cumpridos`) (T).
12. "Desafio de 7 dias" dentro da liga: quem cumprir a meta do cronograma 7 dias ganha o selo da liga (depende de `meta_cronograma` por membro) (T).

---

### 11. `RankingCripta.tsx`, `PodioPixel`, `PodioPrevia`, `SalaoCampeoes`, `ServicoRanking`, `Emails.tsx`, `AcoesDeEmail.tsx`, `emailsMarco.ts`

- `RankingCripta.tsx:17, 27-29` está "minificado à mão" (sem espaços, ternários encadeados em uma linha). Textos "Os que desceram mais fundo"/"andar N" fora do jogo: a regra do Tales (13/10) restringe "Cripta/masmorra" ao jogo; "andar" e `cena="cripta"` ficam na borda. (T decide)
- `SalaoCampeoes`: coordenadas em `%` da arte 320×240 (bom), `prefers-reduced-motion` coberto. `PodioPrevia`: RPC `obter_ranking_visitante` em toda montagem da home de visitante, sem cache.
- `perfilRanking.ts:80-89`: `salvarMostrarServico` faz upsert com `apelido`/`participa_ranking` do estado local antes de `carregado` → pode zerar o apelido se clicado cedo (o `salvarVitrine` é protegido por `podeEscolher`).
- `emailsMarco.ts`: só marcos da família `questoes`; não há e-mail de resumo de domingo nem de marco do cronograma (PLANO 28/30/31 [~]) → servidor (T). `Emails.tsx`/`AcoesDeEmail.tsx`: ok; `window.prompt` como fallback de clipboard.

---

### 12. Consistência de design (resumo)

- **Paleta por área:** ~60% coberto (ver §6). Falta em desempenho, risco, home, fim de sessão, `/dados`. `mao` colide com o dourado.
- **Estados:** divergem do PLANO (§5). "Feito" tem dois significados (§2).
- **premium.css × temporada.css × base.css:** três raios de cartão e `!important` da temporada entrando no cronograma reformado (§8). `.pe` recebe a temporada (pixel), `.cp` é limpo; a página `#/cronograma` tem as duas classes (`PlanoEstudo.tsx:268`).
- **Pixel art fora do jogo:** título do cronograma (`cp-onde h1`), número da montagem, herói do ranking, trilha da home com herói animado, toda `img[src*="emblemas/"]` flutuando no site inteiro (`recursos.css:383`). Na página inicial e no cronograma isso briga com o resto (Inter, cartões arredondados).

---

### 13. Código (resumo)

- Componentes gigantes: `PlanoEstudo.tsx` 766 (5 responsabilidades), `CronogramaPainel.tsx` 516, `Ranking.tsx` 418 (+ `Conquistas`), `conquistas.ts` 908.
- Duplicação: plano/cálculo em `PlanoEstudo`, `CaixasAssinante`, `Resumo.FimCronograma`; `iniciais()` em `Ranking.tsx:122` e `Ligas.tsx:15`; `AbasRanking` ×2; "segunda da semana" ×4; `semanaDe` ×2 em `conquistas.ts` (L614, L650).
- Cálculo no render: `montarHub()`, `minutosPorQuestao(lerHistorico())`, `Depois` remonta semanas, `EstaSemana` 7 `find` em `calculo.dias`.
- `any`: nenhum explícito; há `as unknown as` (`PlanoEstudo.tsx:68`, `Ranking.tsx:163`) e 5 `eslint-disable react-hooks/exhaustive-deps`.
- Mortos: `FasesCronograma`, `CartaoStreak`, `FAMILIAS[].unidade`, `PodioPixel cena="festa"`, CSS listado em §4, §7, §8.
- Estado derivado guardado em estado: `comMovimento`/`visitanteDisponivel` (ok como flags de capacidade); `tourVisto`/`cronograma:dia` em localStorage, ok.

---

### 14. Performance

- `calcularPlano` 43 ms (Node) por mudança de `respondidas`, em até 3 telas; na montagem 3× por toque. Celular: estimar 3-5×. Ganho fácil: remover `focosQueFaltam` do cálculo (−55%) e indexar `idsDoFoco`.
- `dadosHub` (constância + risco 34 ms + cegos 14 ms + esquecidos + simulados + prontidão) recalcula a cada resposta enquanto a página estiver montada.
- Ranking: ~200 `<img>` lazy + animações globais (§8). Emblemas: 173 PNG de 128 px (764 KB) sem sprite; ok com lazy.
- `conferirMetaCronograma` → `registrarFeito` em todo `calculo` novo; deduplicado por dia em localStorage (`feitos.ts:63-65`), ok.

---

### 15. BRAINSTORM geral (além dos itens 1-12 acima)

13. **Barra "hoje" persistente no rodapé do site** (fora do cronograma): área, "faltam 37 · ~55 min", botão continuar — leva o princípio "continuidade fora da página" para Treinar/Revisão. (sem SQL)
14. **"Esta semana" tocável:** tocar num dia abre a lista daquele dia (assuntos, quantidades) e um botão "trazer para hoje" (adiantar aquele dia). (sem SQL)
15. **Notificação do próprio site** (Web Push) para o lembrete 7h/12h/19h e o resumo de domingo — PLANO 28/30 [~]; exige função no servidor e tabela de assinaturas push (SQL) (T).
16. **Mapa em pixel art até a prova** (PLANO 40 [~]): um `canvas`/SVG com uma casa por semana na cor da área dominante e o castelo da prova, reaproveitável no Instagram via `gerar.mjs`; exige arte (T).
17. **Modo "só o essencial"** no cronograma: oculta tudo abaixo de "Esta semana" com um toggle lembrado — para quem acha a página longa. (sem SQL)
18. **Projeção honesta na montagem:** mostrar "este plano cobre X% do alvo e corta Y questões" (hoje só a prioridade máxima) — expõe o bug do teto e ajuda a escolher intensidade. (sem SQL)
19. **Ranking de constância** (dias com meta cumprida nos últimos 30) como terceira aba, usando `feitos.dias.meta_cronograma` já gravados → SQL: RPC de agregação (T).

---

### Top 15 tarefas desta área, em ordem de prioridade

| # | Tarefa | Tam. | Paralelo? |
|---|---|---|---|
| 1 | Corrigir `metaPlanejada` para usar o calendário de tipos (leve/difícil/folga) e acrescentar caso na fixture: teto não dispara em plano novo (`planoEstudo.ts:362-368`) | P | sim |
| 2 | Preservar `adiantados` (e `semanasDificeis`) em `FormularioPlano.opcoes()` ao salvar ajustes (`PlanoEstudo.tsx:567-571`) | P | sim |
| 3 | Vitrine do não assinante sem números e com um CTA só (`PlanoEstudo.tsx:363-370, 389, 412, 440-449`) — conforme orientação do Tales | M | sim |
| 4 | "Depois" recolhido sempre mostra Reta final e Prova; estados "atrasado" laranja / "parcial" / "marco" conforme o PLANO (`CronogramaPainel.tsx:375`, `.css:142-149`) | P | sim |
| 5 | Unificar "cumprido": semana usa a meta do plano (não ≥10 respostas); ou rotular como "estudou" (`CronogramaPainel.tsx:278`, `hubCronograma.ts:50-72`) | M | depende da decisão em 11 |
| 6 | `calculo` revalidado à meia-noite/`visibilitychange` (dependência `chaveData(hoje)`) em `PlanoEstudo`, `CaixasAssinante` | P | sim |
| 7 | Hook único `usarCronograma()` (plano, cálculo, adiantar, meta) usado por PlanoEstudo, CaixasAssinante e Resumo; `montarHub` em `useMemo`; `pendente` único | G | depois de 1-2 |
| 8 | Performance do motor: tirar `focosQueFaltam` de `calcularPlano`, indexar `idsDoFoco`; debounce das 3 simulações na montagem | M | sim |
| 9 | Botão "Ajustar o cronograma" no topo (Onde você está) e "faltam N dias" único (`diasEntre`) no formulário | P | sim |
| 10 | Resumão abre na área do dia (`?tema=` em `Resumao.tsx` + `PlanoEstudo.tsx:363`) e só marca "feito" ao voltar | P | sim |
| 11 | Decisão do Tales: um critério de sequência (5/dia vs 10/dia; folga quebra ou não) e nomes distintos para fogueira/chama/constância; aplicar em `streak.ts`, `hubCronograma.ts`, textos do ranking | M | T antes |
| 12 | Limpeza: remover `FasesCronograma`, `CartaoStreak`, `FAMILIAS.unidade`, `rk-arena/rk-podio`, `pe-*` e `cx-*` mortos, `podio-festa`, fallbacks 404 de `salvarPlano`, `NovidadeSimulados` duplicado; `import` fora de ordem em `Ranking.tsx` | M | sim |
| 13 | Resolver o conflito `temporada.css` × `CronogramaPainel.css` (cartões dentro de `Recolhido`), unificar raio de cartão, e `HojeRetaFinal` no visual `cp-hoje`; `corDaArea` em Desempenho/Risco/home/fim de sessão; trocar a cor de `mao` | M | sim |
| 14 | Inventário de conquistas: filtro "Quase lá/Conquistadas/Todas", secretas agrupadas, explicar o "99/100" dos Mestres; separar `conquistas.ts` em dados/métricas | G | sim |
| 15 | `TrilhaJornada` da home com `semanaNumero/semanasTotal` reais e casas feitas; `PainelAdiantar`/sessão sem o teto implícito de 100 por item | P | sim |

Itens que dependem de servidor/decisão (T): datas oficiais do TARO/ENARE (PLANO 14), lembrete/resumo por e-mail ou push (28/30), arte de emblemas do cronograma (31), liga por constância (32), mapa pixel (40), diagnóstico 20 vs 30 questões, textos "andar/cripta" no ranking de flashcards.


---

# Anexo D · Painel do administrador (relatório completo)

## Auditoria do painel do administrador (somente leitura)

Escopo lido integralmente: `src/paginas/AdminAssinaturas.tsx`, `src/estilos/paginas/AdminAssinaturas.css`, os 23 arquivos de `src/componentes/admin/`, `EditarQuestaoAdmin.tsx`, `CampoServico.tsx`, `CamposEtapa.tsx`, `ResumoAssinatura.tsx`, `BackupProgresso.tsx`, `conta/administrador.ts`, `conta/plano.ts`, `conta/premium.ts`, `servicos/supabase.ts`, `conta/supabase.ts`, mais `dados/edicoes.ts`, `dados/planos.ts`, `docs/ativacao-e-rollback-assinaturas.md`, SQL em `supabase/migrations` e `supabase/colar-no-painel`, e a Edge Function `webhook-mercado-pago`.

### 0. RPCs e funções que o painel chama

40 RPCs: `atividade_usuario_admin, atualizar_relato_admin, definir_config_comercial_admin, definir_config_emails_admin, definir_config_premium_admin, definir_cortesia_admin, desconectar_usuario_admin, detalhe_usuario_admin, eh_administrador, encerrar_aviso_admin, estatisticas_questoes_admin, funil_admin, listar_assinaturas_admin, listar_avaliacoes_comentario_admin, listar_avisos_admin, listar_destinatarios_lembrete_admin, listar_emails_admin, listar_eventos_pagamento_admin, listar_indicacoes_admin, listar_lidos_admin, listar_opinioes_flashcards_admin, listar_relatos_admin, listar_simulados_admin, listar_usuarios_admin, marcar_lidos_admin, obter_acesso_premium, obter_config_comercial_admin, obter_config_emails_admin, obter_config_premium_admin, obter_estado_conta, ocultar_ranking_admin, publicar_simulado_admin, remover_edicao_questao, resumo_admin, resumo_indicacoes_admin, resumo_lembretes_admin, resumo_quinzenal_admin, resumo_relatorio_admin, retencao_admin, salvar_aviso_admin, salvar_edicao_questao, serie_diaria_admin` + a pública `edicoes_questoes`.

**Resultado: todas existem em `supabase/migrations/*.sql`** (verificado por `create [or replace] function public.<nome>(`). Nenhuma falta. Edge Functions: `enviar-email` (todas as 9 ações usadas pelo painel existem no `index.ts`), `gerenciar-plano`, `webhook-mercado-pago?acao=reprocessar` (handler `reprocessarComoAdmin`, linha 153).

Observação: as mensagens "rode a migração X" nos componentes citam nomes de `supabase/migrations/`, mas o Tales cola SQL de `supabase/colar-no-painel/sql-...-parteN.sql` (AGENTS.md). Só `AdminOpinioesFlashcards.tsx:14` e `AdminPerfis.tsx:180` traduzem para "parte N". Para o dono, as outras 12 mensagens apontam para um arquivo que ele não usa.

---

### 1. `AdminAssinaturas.tsx` (shell + Visão geral + Assinaturas + Pagamentos)

**Como está.** Um componente de 368 linhas que faz quatro papéis: shell (abas, URL, cabeçalho), carregador (4 RPCs em `Promise.allSettled`), Visão geral, aba Assinaturas e aba Pagamentos. Estado todo local (`useState` ×12). Dez abas em `role="tablist"` horizontal rolável. Aba Conteúdo fica **sempre montada** escondida (`<div hidden>` L171) só para alimentar o contador.

**Problemas.**
- **ALTA** `.adm-alerta` é usada em ~25 lugares (L152, L159; AdminConteudo:126; AdminFichaUsuario:175; AdminQuestoes:194,362; AdminConfiguracoes:66; etc.) e **não existe em nenhum CSS do projeto** (`grep -rn adm-alerta src --include=*.css` → vazio). Todo erro do painel renderiza como parágrafo comum, sem cor nem destaque. Um dos motivos de "deu erro? não sei".
- **ALTA** L152: `erroAcesso ? <alerta> : assinaturas === null ? ... : <painel>`. Se um clique em "Atualizar" falhar (rede, 8 s de prazo em `supabase.ts:35`), `erroAcesso` é preenchido e **o painel inteiro some**, substituído por "Não foi possível carregar agora", mesmo com dados já na tela.
- **ALTA** L100-118: botão "Atualizar" não tem estado ocupado; nada acontece visualmente até a resposta (até 8 s). Clique duplo dispara 8 RPCs.
- **ALTA** (custo) L108 + `AdminUsuarios.tsx:109`: `listar_usuarios_admin` (SQL em `202610080100_monitor_usuarios.sql`) varre `progresso_usuario` inteira com `jsonb_array_elements` por linha, sem `LIMIT`, e é chamada no mount, no Atualizar **e a cada 30 s** pelo filho. Com crescimento de base vai estourar o prazo de 8 s de `chamarRpc` e cair no caso acima.
- **MÉDIA** L171: `AdminConteudo` montado escondido dispara no mount `estatisticas_questoes_admin`, `listar_relatos_admin`, `listar_avaliacoes_comentario_admin` (500 linhas), `listar_lidos_admin` e **baixa arquivos do acervo** (`carregarQuestoes`, AdminConteudo:55 e AdminAvaliacoes:56) só para um número no badge. Precisa de uma RPC leve `contadores_admin`.
- **MÉDIA** L82, L127-131: URL lida uma vez (`useState(lerUrl)`), `trocarAba` usa `replaceState` → botão Voltar não navega entre abas; filtro de usuários, vista de Conteúdo e id da questão abertos por clique não entram na URL (F5 perde). `hashchange` externo é ignorado.
- **MÉDIA** `erroDoPainel` (formatos.ts:87-92) decide por `String(falha).includes('(404)')` e ignora `ErroRpc.codigo`/`status`; qualquer outra coisa vira "Não foi possível carregar agora", sem o motivo real.
- **MÉDIA** Pagamentos L318-328: `reprocessar` recebe 202 (processamento em `EdgeRuntime.waitUntil`) e recarrega **imediatamente**; a lista volta mostrando "Na fila" e a mensagem diz "A lista foi atualizada". Erros 409/400 (`evento_ja_reprocessado`, `evento_nao_reprocessavel`) chegam em `Error.message` e são descartados pelo `catch {}` genérico.
- **MÉDIA** Pagamentos não liga evento a usuário/assinatura (só `id_recurso`); "conferir pagamento PIX" exige cruzar número com o Mercado Pago na mão. Não há link para o MP.
- **MÉDIA** A11y: `role="tablist"` sem navegação por setas, tabs sem `aria-controls`/`id`, painel sem `role="tabpanel"`. Chips em AdminConteudo:122 e AdminAvaliacoes:118 têm `role="tab"` **e** `aria-pressed` ao mesmo tempo (inválido).
- **BAIXA** L136-140 `contadores`, L180-184 (sorts da Visão geral) e L263 (5 `filter` por chip) recalculados a cada render.
- **BAIXA** L162 `key={filtroUsuarios}` remonta `AdminUsuarios` para forçar o filtro → perde busca, reinicia polling. Gambiarra em vez de prop controlada.
- **BAIXA** `Resumo` só vem com `r.value[0]`; `errosPagamento` depende de `lidos` que carrega assíncrono → badge "pisca" (mostra N, depois N-lidos).
- Fluxo de ativação/rollback: coerente com `docs/ativacao-e-rollback-assinaturas.md` (nada no painel marca `reembolsada` ou altera status sem o provedor; só reprocessa eventos já recebidos com HMAC válido). Mas **não há ação para o caso real "Pix pago e assinatura não ativada"** além de reprocessar o evento; e não há auditoria de quem ligou/desligou `paywall_ativo`/`pagamentos_ativos` (só `atualizado_em`).

### 2. `AdminUsuarios.tsx`

**Como está.** Recebe lista do pai, mantém cópia viva com `setInterval` 30 s, 8 filtros, 6 ordens, busca, KPIs, bloco "Ao vivo", lista completa de cartões densos, ficha em portal.

**Problemas.**
- **ALTA** L195-233: renderiza **todas** as contas sem paginação/virtualização; cada cartão tem avatar, 3 placares, barra, `dl` com 3 itens, selos. Com centenas de usuários no celular é a principal fonte do "travado".
- **ALTA** L105-112: polling a cada 30 s da RPC mais pesada, sem cancelar pedido em voo, sem pausar quando a ficha está aberta, sem backoff em erro, e **duas fontes de verdade** (pai e filho) para a mesma lista: L104 sobrescreve a cópia viva sempre que o pai recarrega.
- **MÉDIA** `ativoHoje` (L63-64) faz 2 `toLocaleDateString` com `timeZone` por chamada; `contagem` (L118) aplica 8 filtros × N usuários; `totais` repete. Milhares de chamadas `Intl` por render, a cada tique de 30 s (L103 força rerender).
- **MÉDIA** Busca sem debounce (L179) → refiltra, reordena e rerenderiza toda a lista por tecla.
- **MÉDIA** A11y: `<li role="button" tabIndex={0}>` (L199) contendo `<a>` (OQueVe L94) = controle interativo aninhado; `aria-label` genérico.
- **BAIXA** `style={{ background: corDe(...) }}` e `width` inline (L168, L202, L224) são dinâmicos e aceitáveis; `hsl(... 45% 42%)` com texto branco não garante 4,5:1.
- **BAIXA** Rótulos: "Ranking privado" no cabeçalho, mas a aba se chama "Usuários" e a Visão geral chama de "nomes".

### 3. `AdminFichaUsuario.tsx`

**Como está.** Drawer lateral em `createPortal`, 2 RPCs (`detalhe_usuario_admin`, `atividade_usuario_admin`) + polling 20 s, gráficos, carta por e-mail com modelos (localStorage), ações (desconectar, ranking, cortesia).

**Problemas.**
- **ALTA** A11y do diálogo: não move o foco para dentro ao abrir, não devolve ao fechar, sem focus trap; Tab sai para a página atrás (L92-100 só trata Escape).
- **ALTA** UX do dia a dia: a ficha **não mostra assinatura, cobranças, eventos de pagamento nem botão "ver na aba Assinaturas"** — só o selo `plano_vigente` (L166). Para "ativar/conferir pagamento de fulano" o admin precisa sair da ficha, ir em Assinaturas, buscar o e-mail, depois em Pagamentos e adivinhar o evento.
- **MÉDIA** L124-128 `acao()`: erro e sucesso vão para o mesmo `aviso` com a mesma classe verde `adm-mensagem` (L176). Erro aparece como sucesso.
- **MÉDIA** `carregar` (L85-89) sem guarda `vivo`; fechar a ficha antes da resposta faz `setState` em componente desmontado. `porTema` depende de `usarIndice()` → a ficha puxa o índice do acervo inteiro.
- **MÉDIA** L263, L269, L286, L298: `window.prompt/confirm` nativos (4 no arquivo; 19 em todo o painel) — bloqueantes, sem estilo, péssimos no celular.
- **BAIXA** iframe de prévia com `height: 620px` fixo (CSS L200); `sandbox=""` correto.
- **BAIXA** Modelos salvos só neste navegador (`modelosEmail.ts:105`), diferente dos "lidos" que sobem ao servidor — inconsistente.

### 4. `AdminConteudo.tsx` + `AdminAvaliacoes.tsx`

**Como está.** Cinco vistas (suspeitas, fáceis, temas, relatos, avaliações). Relatos com resolver/descartar/reabrir/avisar por e-mail. Avaliações com lidos/não lidos.

**Problemas.**
- **MÉDIA** L26: um único `erro` cobre stats **e** relatos; se `estatisticas_questoes_admin` falhar, a vista Relatos também desaparece (`vista === 'relatos' && !erro`, L145).
- **MÉDIA** L85-89 `mudarRelato`: sem estado "salvando" (duplo clique duplica), `window.prompt` para a nota, `window.alert` para erro.
- **MÉDIA** L103-114: `Nome` e `Linha` são componentes **definidos dentro do render** → remontados a cada render do pai.
- **MÉDIA** AdminAvaliacoes L44: `useCallback(..., [aoCarregar])` — dependência errada; L56 baixa todas as questões citadas nas 500 avaliações (potencialmente dezenas de arquivos de tema) mesmo oculto.
- **BAIXA** AdminAvaliacoes L110 `<p role="alert">` sem classe; L142 `key` pode colidir (mesmo usuário, mesmo instante).
- **BAIXA** Sem paginação em relatos/avaliações; sem filtro por status nos relatos (abertos misturados com fechados, só a cor muda).

### 5. `AdminQuestoes.tsx` (editor)

**Como está.** Abre por tema+número ou chips; formulário completo; salva via `salvar_edicao_questao` na tabela `questoes_edicoes`; `dados/edicoes.ts` aplica a edição **por cima** do JSON estático em tempo de carga (`aplicarEdicao`, `aplicarEdicoesNoIndice`). **Não sobrescreve o acervo estático**; é um overlay reversível (`remover_edicao_questao`). Upload de imagem redimensiona para WebP no cliente e sobe ao bucket `questoes`.

**Problemas.**
- **ALTA** (conceitual) `paraEdicao` (L58-86) grava **a questão inteira** (prova, ano, enunciado, alternativas, gabarito, comentário, comentarioIA), não um diff. Qualquer edição congela todos os campos naquela versão: se depois o acervo receber o comentário enriquecido do padrão editorial (`docs/padrao-editorial-comentarios.md`) ou um gabarito corrigido no JSON, a edição antiga **esconde a melhoria** para sempre, sem aviso. Precisa de diff por campo ou de aviso "acervo mudou depois da edição".
- **MÉDIA** `edicoes.ts:36-56`: `Promise.race` com prazo 3 s; se a RPC pública demorar, `promessa` fica resolvida com `Map` vazio até reload → no site, "vale na hora" falha silenciosamente em rede lenta.
- **MÉDIA** Sem aviso de alterações não salvas ao trocar de questão/aba/fechar (L229-251 zera `form` ao mudar `id`).
- **MÉDIA** Ao abrir pela aba Conteúdo ("Editar questão") a URL não recebe `?aba=questoes&id=` → F5 perde a questão; o deep link só funciona vindo do site (`EditarQuestaoAdmin.tsx:11`).
- **BAIXA** L282-294 `desfazer`: `definirId(null); setTimeout(() => definirId(atual), 0)` para forçar recarga. L217 + L203 duplicam a inicialização de `id`. "Remover" imagem não apaga do Storage (órfãos).
- **BAIXA** Cada abertura chama `esquecerEdicoes()` + `carregarEdicoes()` + `recarregarAcervo()` (L234-236) → recarrega o índice inteiro por questão aberta.
- Pontos bons para reaproveitar: `prepararImagem`, `CampoTexto`, `ListaImagens`, validações em `salvar`.

### 6. `AdminFinanceiro.tsx` + `receita.ts` + `AdminMensal.tsx`

**Como está.** Receita **reconstruída** a partir das assinaturas (`cobrancas()`): uma cobrança por período do plano, da última paga para trás até `criada_em`, com preço atual de `dados/planos.ts`. Previsão, MRR, mês a mês, churn do cartão.

**Problemas.**
- **ALTA** (fidelidade) Receita é derivada, não fato. `cobrancas` (L96-117) inventa renovações retroativas e as marca `estimada: false`; o CSV (AdminFinanceiro L109) rotula como "cobrança gravada". Mudar o preço em `planos.ts` **reescreve o histórico**. Os valores reais estão em `eventos_pagamento`/webhook e não são usados. Precisa de tabela/RPC de cobranças reais (SQL).
- **MÉDIA** `somarMeses` (receita.ts:35) usa `setMonth` sem travar o dia: 31/01 − 1 mês = 03/03 → cobranças de dias 29-31 deslocam de mês na série.
- **MÉDIA** `pagaSemCobranca` (L80-88) considera `vencida` sem `ultima_cobranca_em` como paga → assinatura que nunca pagou pode entrar na receita.
- **MÉDIA** `MES` (L32) usa fuso do navegador; resto do painel usa `America/Sao_Paulo`.
- **BAIXA** AdminFinanceiro L99-100: compara mês corrente parcial com mês passado completo e chama de variação; `conversao` divide pagantes (sem testes) por `resumo.usuarios` (com testes).
- **BAIXA** `previsao()` (receita.ts:195) não é usada em lugar nenhum; `aReceberNoCartao` a substitui.
- **BAIXA** `React.CSSProperties` (AdminMensal:40, AdminCrescimento:89, AdminIndicacoes:79, AdminPerfis:122,153) depende do namespace global `React` sem import; funciona mas é frágil.
- Pontos bons: separação Pix/cartão, `meioDe` com fallback heurístico, tabela mensal com churn explicado.

### 7. `AdminCrescimento.tsx` + `AdminRitmo` + `AdminPerfis` + `AdminIndicacoes` + `AdminLembretes`

**Como está.** Aba Crescimento = Lembretes (ação de e-mail!) + Dia a dia + Ritmo + Funil + Retenção + Indicações + Perfis. Ao abrir dispara ~12 RPCs (`serie_diaria`, `funil`, `retencao`, `resumo_lembretes`, 5× `listar_destinatarios_lembrete`, `resumo_quinzenal`, `resumo_indicacoes`, `listar_indicacoes`).

**Problemas.**
- **MÉDIA** `if (erro) return` (L46) derruba a aba inteira se qualquer uma das 3 RPCs principais falhar.
- **MÉDIA** Lembretes dentro de Crescimento é confuso: é operação, não métrica. A seção tem 5 campanhas + resumo quinzenal + prévia em iframe; o botão de envio roda até 40 lotes sem botão cancelar (L67-72).
- **MÉDIA** Perfis: tabelas de 10 colunas (L120) só com rolagem horizontal no celular; sem `th sticky`.
- **BAIXA** Trocar 30/90 dias zera `serie` (L29) → gráficos somem e voltam (flash).
- **BAIXA** Duplicações: `AdminLembretes.haQuanto` (L117) ≈ `formatos.haQuantoTempo`; `AdminLembretes.PLANO` (L114) = `formatos.PLANOS`; `AdminRitmo.nomeMes` (L34) ≈ `receita.NOME_MES`; `AdminLembretes.DATA` ≈ `formatos.data`.
- **BAIXA** Pixel art: `pixel/treinar.png`, `ranking/chama.png`, `image-rendering: pixelated` (AdminLembretes L90, CSS L274) num painel que o próprio CSS declara "ferramenta, sem faixa de destaque" (CSS L4).
- `ResumoQuinzenal` L184 `useEffect` depende de `enviando` (string que muda por lote) → refaz a RPC a cada lote.

### 8. `AdminConfiguracoes.tsx` + `AdminRecursosPagos.tsx`

**Como está.** "Ajustes" agrupa 7 coisas: recursos pagos (interruptor), Simulado Nacional, Simulado de véspera, Relatório mensal, limite gratuito/pagamentos, aviso do site, e-mails automáticos + últimos envios.

**Problemas.**
- **MÉDIA** Uma `mensagem` só para sucesso e erro, sempre verde (`adm-mensagem`, L72; RecursosPagos L154). `salvarEmails` (L61-64) é otimista mas o erro só aparece como texto.
- **MÉDIA** `if (erro) return` (L66) e `if (!rascunho || !avisos || !emails) return Carregando` (L67): quatro RPCs em `Promise.all`; uma falha esconde tudo.
- **MÉDIA** Interruptores de `paywall_ativo`/`pagamentos_ativos` sem registro de quem/quando mudou (doc de rollback pede "registrar o estado confirmado"). Precisa de log de auditoria (SQL).
- **BAIXA** `JSON.stringify(rascunho) === JSON.stringify(comercial)` duas vezes por render (L82-83).
- **BAIXA** RecursosPagos: `montarProxima` (L84-97) duplica `candidatasDeProva` (L100-105); `publicar` catch adivinha "(edição já tem participantes?)" (L145); `useEffect [mes, enviando]` (L52) refaz RPC por lote; reduce com spread O(n²) (L151, L186).
- **BAIXA** RecursosPagos baixa o acervo inteiro de TEOT/TARO no cliente para sortear (L88-90) — aceitável, mas sem indicador além do texto do botão.

### 9. Utilitários (`formatos.ts`, `lidos.ts`, `contasTeste.ts`, `modelosEmail.ts`, `recado.ts`, `servicosConhecidos.ts`)

- **MÉDIA** `contasTeste.ts:11,23`: qualquer usuário cujo primeiro nome seja "Tales" é excluído de todas as estatísticas e da receita. Hoje improvável, com crescimento é bug certo. Deveria ser flag no banco (`contas_teste` já existe para checkout, segundo a doc).
- **MÉDIA** `formatos.erroDoPainel` ignora `ErroRpc.codigo`; `haQuanto`/`data`/`dataHora` sem fuso (o resto usa SP).
- **BAIXA** `formatos.normalizar` L19 usa caracteres combinantes literais na regex (`[̀-ͯ]`) em vez de `̀-ͯ` — funciona, mas qualquer editor pode corromper.
- **BAIXA** `somarAcertos` L127-128: `null as unknown as number` para caber em `Required<>`.
- **BAIXA** `lidos.ts:38-47`: `marcar` antes do `listar_lidos_admin` responder não sobe ao servidor (fica só local, perde entre aparelhos).
- **BAIXA** `modelosEmail.ts:23`: data da prova `2027-01-10` fixa no código (decisão do Tales: campo em Ajustes?).

### 10. Fora do admin mas no escopo

- `EditarQuestaoAdmin.tsx`: ok; ícone `filtro` para "editar" é estranho (existe `lapis`).
- `CampoServico.tsx`/`CamposEtapa.tsx`: componentes do perfil, não do painel. `CamposEtapa:24` `const tag = null` morto; `CampoServico:25-26` `id="campo-servico"` fixo (duplica se renderizar duas vezes).
- `ResumoAssinatura.tsx:40-45`: chama a Edge `gerenciar-plano sincronizar_cobranca` **a cada mount** da página de conta (custo e latência); mensagens coerentes com a política de "atendimento manual" da doc de rollback.
- `administrador.ts`, `plano.ts`, `premium.ts`: três caches de módulo com três padrões diferentes (objeto, string `consultado`, promise `pendente`); `atualizarPremium()` só zera, não reconsulta (precisa remount). Unificar num `usarEstadoConta`.
- `BackupProgresso.tsx`: botão sem `type="button"` (L20); fora do painel.
- `supabase.ts:35` prazo 8 s para RPC é curto para `listar_usuarios_admin`/`estatisticas_questoes_admin`; não há cancelamento por `AbortSignal` externo (polling não cancela).

### 11. CSS (`AdminAssinaturas.css`, 448 linhas)

- **ALTA** `.adm-alerta` inexistente (ver §1).
- **MÉDIA** Definições duplicadas e conflitantes: `.adm-subtitulo` L43 e L178; `.adm-usuario` grid L65 e L407; `.adm-usuario__numeros` em 3 media queries (L126, L433, L436).
- **MÉDIA** Oito blocos `@media` separados para dois breakpoints (L119-145) + `760px`, `560px`, `480px`, `46rem`, `56rem` → 7 breakpoints distintos no mesmo arquivo.
- **MÉDIA** Cores fora dos tokens: `#22b573` (10×), `#179a60`, `#f6d77a`, `#dfe4ea`, `#efc39c`, `#b42318`, `#eef2f1`, `#5b6866`, `#e3f1ec`; variáveis inexistentes `--primaria-suave`, `--texto-suave`, `--raio` com fallback (L442-448). Tema escuro: `#22b573` com `color-mix` não acompanha `--acerto` escuro.
- **BAIXA** Classes mortas: `.adm-cartao__erro`, `.adm-tecnico`, `.adm-usuario__total`, `.adm-financeiro__previsto`, `.adm-kpis--3`, `.adm-serie-mensal`. `@keyframes adm-pulso` mora em `premium.css:820` (arquivo global) e é usado só aqui. `.adm-abas { top: 66px/76px }` acoplado à altura do cabeçalho do site.
- **BAIXA** `!important` em `.adm-chip__alerta` e `.adm-pix-lista__selo`.
- Dependências do CSS global que funcionam: `.tabela` (base.css:1324), `.ct-interruptor` (premium.css:562), `.so-leitor`, `.campo--checkbox`, `.botao--perigo`, `.aviso-site`.

### 12. Código: visão transversal

- Sem `any` explícito (bom). Tipagem das RPCs é por `interface` local em cada componente (`LinhaUsuario`, `LinhaAssinatura`, `Detalhe`, `Atividade`...) sem relação com o SQL; campos "da migração X em diante" são opcionais e cada componente trata `undefined` do seu jeito. Conversões `Number(x)` espalhadas (bigint chega como string).
- 19 `window.confirm/prompt/alert`.
- Padrão repetido 14× sem abstração: `useState(null) + useState('') + useEffect(() => chamarRpc().then().catch(erroDoPainel))`.
- Arquivos grandes: `AdminQuestoes` 474, `AdminAssinaturas` 368, `AdminFichaUsuario` 326, `AdminUsuarios` 236.
- Nenhum teste cobre `receita.ts`, `formatos.ts`, `contasTeste.ts`, `servicosConhecidos.ts` (`npm test` só roda fixtures de cronograma/flashcards).

---

### 13. UX: o que o administrador faz todo dia e quantos cliques leva

| Tarefa | Hoje | Cliques |
|---|---|---|
| Ver cadastros novos e quem parou | Visão geral → KPI "Usuários cadastrados" ou "Quem parou" | 1-2, bom |
| Conferir pagamento Pix de X | Assinaturas → buscar → ver status; se "pendente", Pagamentos → procurar evento por número do MP (não há nome) → MP | 5+, sem ligação entre telas |
| "Ativar" assinatura paga | Não existe; só "Reprocessar" evento com erro; resultado não aparece na hora | — |
| Responder relato/avaliação | Conteúdo → Relatos → Marcar resolvido → prompt → confirm e-mail | 4, com 2 diálogos nativos |
| Mandar carta a um usuário | Usuários → cartão → ficha → modelo → prévia → confirm → enviar | 6 |
| Ligar paywall | Ajustes → rolar 4 seções → interruptor → Salvar → confirm | 4, sem registro |

Confusões: 10 abas na barra, 3 delas (Crescimento, Financeiro, Assinaturas) com conteúdo sobreposto (assinantes novos aparecem nas três); "Ajustes" com Simulado Nacional dentro; Lembretes dentro de Crescimento; "Opiniões dos flashcards" como aba de primeiro nível; dois ícones `livro` e dois `grafico` na barra. Densidade alta: KPIs + 4 seções + listas na Visão geral; cartões de usuário com 12 dados cada. Feedback: sucesso e erro com a mesma cor; sem toast; alerts nativos.

---

### 14. Proposta de reestruturação (plano por etapas)

**O que vale reaproveitar (lógica pura, já boa):** `AdminGraficos.tsx` inteiro; `receita.ts` (corrigindo `somarMeses` e `pagaSemCobranca`, e passando a aceitar cobranças reais); `formatos.ts` (menos `erroDoPainel`); `servicosConhecidos.ts`, `recado.ts`, `modelosEmail.ts`; `prepararImagem`/`CampoTexto`/`ListaImagens`/`paraFormulario`/`paraEdicao` do editor; `AdminRitmo.analisar`; `AdminPerfis.agrupar`; `escolherEdicao` do simulado; `usarLidos`; SQL todo.

**O que vale reescrever:** o shell (`AdminAssinaturas.tsx`), a camada de dados (um fetch por componente → hooks com cache), `AdminUsuarios` (lista), `AdminFichaUsuario` (diálogo), a estrutura de abas, e o CSS (consolidar tokens/breakpoints).

**Etapa 0 (1 dia, correções imediatas sem reestruturar):** criar `.adm-alerta`; estado "atualizando" no botão; não derrubar o painel em erro de refresh; `aviso` com variante erro/sucesso; `reprocessar` com espera/poll e mensagem honesta; `useCallback` dep errada; mensagens de migração em "parte N".

**Etapa 1 — Shell e navegação.** `src/paginas/admin/` com `AdminShell` (layout: navegação lateral no desktop ≥ 56rem, barra inferior/menu no celular), roteamento por hash `#/admin/<secao>/<sub>?<estado>` com `pushState` e leitura reativa de `hashchange`. Seções agrupadas em 5: **Hoje** (visão geral + pendências), **Pessoas** (usuários, ficha, assinaturas do usuário), **Receita** (assinaturas, pagamentos, financeiro), **Conteúdo** (relatos, avaliações, suspeitas, editor, opiniões flashcards), **Operações** (lembretes, relatório, simulados, aviso, ajustes). Badges vêm de uma RPC `contadores_admin` (SQL novo, leve).

**Etapa 2 — Camada de dados.** `src/paginas/admin/dados/`: `usarRpc<T>(nome, args, {prazo, atualizarCada, chave})` com cache em memória por chave (Map módulo), dedupe de pedidos em voo, `AbortController`, `stale-while-revalidate`, estado `{dados, erro, carregando, atualizadoEm, recarregar}`; `ErroRpc` exposto com `codigo`/`status`; `mensagemDeErro(erro)` central. Tipos das RPCs num único `tipos.ts` gerados/mantidos junto do SQL. Polling só na seção visível (`document.visibilityState` + seção ativa).

**Etapa 3 — Componentes base.** `Tabela<T>` genérica (colunas declarativas, ordenação, filtro, paginação 25/50, `th sticky`, modo cartão abaixo de 40rem, export CSV embutido), `Chips`, `Busca` com debounce 200 ms, `Dialogo` acessível (focus trap, `inert` no fundo, retorno de foco) substituindo `window.confirm/prompt`, `Toasts` (`aria-live`), `Estado` (carregando/vazio/erro com retry), `Kpi`. Formulários com validação inline e `dirty` tracking (aviso ao sair).

**Etapa 4 — Reescrever Pessoas.** Lista paginada/virtualizada; ficha como rota (`#/admin/pessoas/<id>`) com abas internas: Resumo, Atividade, **Assinatura e pagamentos** (SQL novo `assinatura_usuario_admin`: assinaturas + eventos + cobranças do usuário, botão reprocessar ali), E-mails, Ações.

**Etapa 5 — Receita com fatos.** SQL `cobrancas_admin` lendo `eventos_pagamento` processados (valor, data, meio, id MP); `receita.ts` passa a usar cobranças reais e cai para estimativa só onde faltar, marcando `estimada`. Link direto para o pagamento no MP.

**Etapa 6 — Conteúdo e editor.** Editor salva **diff** por campo (ou guarda hash do acervo e avisa "acervo mudou"); URL com id; aviso de não salvo; relatos com filtro de status e nota em diálogo.

**Etapa 7 — CSS.** `admin.css` único com tokens só de `tokens.css` (criar `--online` em claro/escuro), 2 breakpoints (40rem, 56rem), sem pixel art, remover classes mortas.

---

### 15. Brainstorm (S = exige SQL/servidor; T = decisão do Tales)

1. **Fila "Pendências de hoje"** na seção Hoje: relatos abertos, avaliações não lidas, pagamentos com erro, Pix terminando em 3 dias, assinaturas `pendente` há > 1 h, e-mails falhados — uma lista única com ação em 1 clique (S: `contadores_admin`).
2. **Assinatura dentro da ficha** com eventos e botão "reprocessar"/"abrir no Mercado Pago" (S).
3. **Log de auditoria** de ações administrativas (paywall, pagamentos, cortesia, edição de questão, aviso): quem, quando, antes/depois (S).
4. **Receita real** a partir dos eventos processados + conciliação "o que o MP diz vs o que o banco tem" (S).
5. **Alertas por e-mail/WhatsApp** quando: pagamento com erro, assinatura pendente > 2 h, relato de gabarito, 0 cadastros em 48 h (S; já existe `alertas_admin` para 2 casos).
6. **Métrica de tempo até primeira questão** e **tempo até assinar** por coorte de origem (utm) (S parcial: dados já em `origem`).
7. **Risco de churn**: assinantes de cartão com `respondidas_7d = 0` há 14 dias; lista com botão de carta (só front).
8. **Questões mais relatadas/avaliadas negativamente × editadas**: cruzar relatos com `questoes_edicoes` para ver o que já foi corrigido (front).
9. **Diff visual da edição** (acervo × edição) e histórico de versões da edição (S: coluna de versões).
10. **Exportação completa** (usuários, assinaturas, cobranças, relatos) em um ZIP/CSV mensal automático (S para agendamento) — hoje são 6 botões espalhados.
11. **Modo celular do painel**: barra inferior com Hoje/Pessoas/Receita/Conteúdo/Mais; cartões em vez de tabelas; busca global de usuário no topo (atalho `/`).
12. **Busca global** (nome, e-mail, id de questão, número MP) que leva à ficha/questão/evento (front + S para número MP).
13. **Contas de teste como flag no banco** em vez de nomes hardcoded (S; T: quem marca).
14. **Datas da prova** (TEOT/TARO) em Ajustes em vez de `2027-01-10` no código, usadas por modelos de e-mail, cronograma e simulado de véspera (S, T).
15. **Painel de saúde técnica**: última execução do agendador de lembretes/relatórios, falhas da Edge, tamanho de `progresso_usuario`, duração das RPCs pesadas (S).
16. **Permissões por papel** (admin pleno × revisor de conteúdo que só edita questões) (S, T).

---

### 16. Top 15 tarefas desta área, por prioridade

| # | Tarefa | Tam. | Paralelo? |
|---|---|---|---|
| 1 | Criar `.adm-alerta` e variante erro de `.adm-mensagem`; separar sucesso/erro em Ficha, Ajustes, RecursosPagos | P | sim |
| 2 | Shell: não substituir o painel por alerta em erro de refresh; estado "Atualizando…" e bloqueio de duplo clique | P | sim |
| 3 | `erroDoPainel` usando `ErroRpc.codigo/status`; mensagens de migração em "parte N (colar-no-painel)" | P | sim |
| 4 | Camada `usarRpc` com cache, dedupe, abort, polling só na seção visível; migrar `listar_usuarios_admin` para um dono só (remover polling duplicado) | M | não (base das demais) |
| 5 | RPC leve `contadores_admin` e desmontar `AdminConteudo` escondido | M (SQL) | sim |
| 6 | Lista de usuários paginada/virtualizada + busca com debounce + memo de `ativoHoje` | M | sim, após 4 |
| 7 | Ficha: focus trap/retorno de foco; aba "Assinatura e pagamentos" com RPC `assinatura_usuario_admin` + reprocessar | G (SQL) | sim, após 4 |
| 8 | Pagamentos: ligar evento a usuário (SQL), aguardar/pollar após reprocessar, mostrar código de erro real, link MP | M (SQL) | sim |
| 9 | Roteamento por hash completo (`pushState`, `hashchange`, estado de filtros/id na URL) | M | sim |
| 10 | Reorganizar seções em 5 grupos com navegação lateral/barra inferior; tirar Lembretes de Crescimento e Simulados de Ajustes | G | após 9 |
| 11 | `Dialogo` acessível + `Toasts`; substituir os 19 `window.confirm/prompt/alert` | M | sim |
| 12 | Editor: salvar diff por campo (ou hash do acervo + aviso), aviso de não salvo, id na URL | M | sim |
| 13 | Receita: corrigir `somarMeses` (dia 31), `pagaSemCobranca` para `vencida`, fuso em `MES`; testes unitários de `receita.ts`; depois RPC `cobrancas_admin` com valores reais | M→G (SQL) | sim |
| 14 | `Tabela<T>` genérica com modo cartão no celular; aplicar em Perfis, Mensal, Indicações, Lembretes, Recorrentes | M | sim, após 3 |
| 15 | CSS: consolidar breakpoints, tokens (`--online` claro/escuro), remover classes mortas, pixel art e `!important`; log de auditoria de ajustes comerciais (SQL) | M | sim |


---

# Anexo E · Design system e CSS (relatório completo)

## Auditoria de design system e CSS · OrtoQuestões (somente leitura)

Repositório: `/home/user/ortoquestoes`. Nenhum arquivo foi editado. Números medidos com grep/awk/python sobre `src/estilos/**`, `src/**/*.tsx`, `index.html`, `dist/`.

### 0. Números gerais

| Métrica | Valor |
|---|---|
| Arquivos CSS | 37 (6 globais + 5 componentes + 26 páginas) |
| Linhas de CSS | 12.056 (base 2001, Flashcards 2555, premium 972, Ranking 688, Inicio 607) |
| Bytes de CSS fonte | 878.765 (≈ 858 KB) |
| CSS global no `dist` (toda rota) | `dist/assets/index-*.css` = **157 KB** (tokens+base+premium+recursos+temporada+impressao+Jersey) |
| CSS por rota no `dist` | 28 pedaços; FlashcardsJogo 239 KB, PlanoEstudo 51 KB, Ranking 47 KB, Inicio 38 KB, Admin 34 KB, Assinatura 33 KB, PortaoConta 24 KB |
| `!important` | **297** (Flashcards 208, temporada 18, base 9, PlanoEstudo 8, CronogramaPainel 8, recursos 6, outros 40) |
| Hex literais fora de `tokens.css` | **2.312 ocorrências**; Flashcards 1257, Ranking 215, recursos 103, premium 95, Inicio 49, temporada 42, PlanoEstudo 41, ModalConfirmarEmail 39, Assinatura 37, base 36, CronogramaPainel 34, CentralFlashcards 32, TemasQueMaisCaem 29, Admin 27, Resumo 22, impressao 20, AteAProva 20, Sessao 18, CadernoErros 17, CartaoQuestao 16, RelogioPixel 14, Treinar 10 |
| `rgba()/hsl()` literais | Flashcards 393, Ranking 87, premium 34, recursos 24, Inicio 23, base 20 |
| `style={{` em TSX | **164** em 40 arquivos (Progresso 12, CronogramaPainel 11, Arena 10, Hud 9, ContribuirComentario 9, CartaoQuestao 9, SimuladoNacional 6, Simbolo 6) |
| Valores distintos de `z-index` | **36** (de -2 a 1000) |
| `@media` distintas | **76** combinações; 20+ breakpoints de largura, mistura rem/px |
| `@keyframes` | 180 (Flashcards 112, Ranking 23, premium 12) |
| Valores distintos de `font-size` | **231** |
| Valores distintos de `box-shadow` | **427** |
| Valores distintos de `border-radius` | 40 |
| `font-weight` distintos | 13 (400, 500, 550, 600, 650, 700, 750, 800, 850, 900 …) |
| Classes CSS definidas | 2.929; **≈536 (18 %) sem nenhuma ocorrência literal em TS/TSX** |
| Classes usadas em `className="…"` sem CSS | 50 (quase todas ganchos de wrapper: `lg`, `pj`, `rs`, `rz`, `sn`, `ti`, `ct`, `fim-sessao`, `sessao-palco`…) |
| Variáveis CSS usadas e nunca definidas | `--linha` (base.css:1790, 1794), `--titulo-3`, `--primaria-suave`, `--texto-suave`, `--foco`, `--turma-cor` (algumas com fallback) |
| Tokens nunca usados | `--bronze-veu`, `--prata-veu` |
| Ferramentas | sem stylelint, sem CSS Modules, sem Tailwind, sem PostCSS extra |

---

### 1. Inventário do design system atual

#### 1.1 Tokens (`src/estilos/tokens.css`, 152 linhas, 96 variáveis)
- **Cor**: paleta base (porcelana, superficie, superficie-2, traco, traco-forte, grafite, ardosia, verdete, verdete-tinta, verdete-veu), semânticos (acerto/erro/aviso + véu), papéis (fundo, texto, texto-2, sobre-destaque), herói (`--heroi-ceu` degradê em faixas + `--heroi-horizonte` SVG pixel em data-URI de ~2,6 KB, duplicado para o escuro), metais (ouro/prata/bronze + véu, `--ouro-texto`), marca (`--marca-*`). Boa base; o problema é que o resto do CSS a ignora (2.312 hex fora dela).
- **Tipografia**: `--fonte-texto` (system-ui), `--fonte-marca` (Plus Jakarta Sans variável 200–800, self-hosted 27 KB), `--fonte-pixel` (Pixelify Sans 700), `--fonte-pixel-titulo` (Jersey 10 400), `--fonte-dados` (monospace). Tamanhos: só `--corpo` 17px, `--corpo-menor` 15px, `--meta` 13px. **Não há escala de títulos** nem de display.
- **Espaçamento**: **nenhum token**. 621 usos de `0`, depois 1rem (138), .5rem (127), .4rem (104), .6rem (101), .75rem (89), .35rem (74), .3rem (63), .45rem (54), 8px (52), 10px (49)… ou seja, sem escala.
- **Raio**: `--raio-controle` 10px, `--raio-cartao` 16px, `--raio-pequeno` 4px, aliases `--raio`, `--raio-grande`. Na prática: 999px (200 usos), `--raio-cartao` (161), `--raio-controle` (149), 50% (110), `--raio-grande` (56), `--raio` (46) e **mais 30 valores literais** (6px ×23, 12px ×23, 14px ×21, 4px ×20, 10px ×20, 16px, 20px, 8px, 18px, 22px, 9px, 24px, 99px…). `temporada.css` força 6px/0/4px com `!important`.
- **Sombra**: `--sombra` (6 usos) e `--sombra-media` (74 usos), mas 427 valores distintos de box-shadow; só da família `rgba(18,24,26,x)` há 11 opacidades diferentes (0.04 a 0.35).
- **Movimento**: nenhum token de duração/curva. Durações soltas: .12s, .15s, .18s, .2s, .22s, .35s… Flashcards define `--fc-rapido`/`--fc-medio` só para si.
- **Z-index**: nenhum token. Camadas reais: cabeçalho 20 (base.css:176), painel seletor 30 (554), véu 40 / painel 41 (1121/1130), navegação móvel 40 (1648), cookies 45 (1630), concluir-flutuante 45 (EsperaPixel.css:29), `.pular-para-conteudo` 100, `.janela-imagem` 200 (base.css:745), `.jc` 1000 (premium.css:848), `.cd` 1000 (premium.css:895), Ranking.css:293 1000, `.cf-email__veu` 90, `.fc-modal-veu` 70, `.espera-jogo` 70; dentro do Flashcards escada 58→68 toda com `!important` (Flashcards.css:410–454).

#### 1.2 Temas claro/escuro
- Aplicação: `index.html` sorteia (`sessionStorage ortoquestoes:tema-sorteado`) e grava `data-tema` antes da pintura; `src/estado/tema.ts` persiste a escolha. `tokens.css` redefine 50 variáveis em `:root[data-tema="escuro"]` e troca `color-scheme`.
- **Bug lógico**: `tema.ts` aceita `'sistema'` (remove `data-tema`), mas **não existe nenhum bloco `@media (prefers-color-scheme: dark)` nos tokens** (há 1 ocorrência em todo o CSS, fora dos tokens). "Sistema" = claro sempre; `alternar()` consulta `matchMedia` para um estado que o CSS não representa.
- Cobertura: 32 blocos `[data-tema="escuro"]` em 12 arquivos (Assinatura 9, premium 6, CartaoQuestao 5, PlanoEstudo 3…). O resto depende de tokens ou de cor fixa.
- `meta theme-color` escuro `#101615` (index.html e tema.ts) não é `--porcelana` escuro `#0f1413`; pré-carga em `index.html` usa `#5b6664/#1d2826/#9aa6a3/#e6ecea`, nenhum deles token.
- **Contraste medido (WCAG, python)** — pares problemáticos:

| Par | Razão | Onde |
|---|---|---|
| `#fff` sobre `--acerto` escuro `#4fbe85` (letra da alternativa certa) | **2,32** | base.css:836-840, CartaoQuestao.css:330, 335, 417 (`color: #fff` fixo) |
| `#fff` sobre `--erro` escuro `#e8776c` | **2,88** | base.css:849-853, CartaoQuestao.css:331, 336; `.botao--perigo:hover` base.css:347 |
| `#fff` sobre `--verdete` escuro `#4fb3a5` | ≈2,3 | NivelCobranca.css:3 `.ti-nivel--4`, temporada.css `.tr-sub`, `.tr-trilha__passo b` |
| `--ouro` `#a87a1f` sobre `#fff` (claro) | **3,84** | `.qd__rotulo` premium.css ~672 (texto 13px), `.rk-legenda` etc. |
| `--ouro` sobre `--ouro-veu` (claro) | 3,35 | motivo da existência de `--ouro-texto`, mas `.pg-selo`, `.inicio-planos__a-partir` usam `#b27a12`/`#4a3508` à mão |
| `--prata` sobre `--prata-veu` (claro) | 3,75 | medalhas |
| `--aviso` sobre `--aviso-veu` (claro) | 3,99 | `.calendario__dia--alto small` (13px) |
| `rgba(255,255,255,.65)` sobre `#145a52` | 3,67 | `.aviso-bloqueio-topo__bloco small` (.62rem!) base.css:1543 |
| Bordas: `--traco` sobre `--superficie` escuro | **1,32** | todo `.entrada`, `.cartao`, `.alternativa` no escuro: campos quase sem contorno (meta 3:1 para UI) |
| `--traco-forte` sobre branco (claro) | 1,64 | idem |

- Placas pixel de cor fixa (`#1b1208`/`#f4cf7c`) aparecem iguais nos dois temas por decisão (`RelogioPixel.css:1`, `ModalConfirmarEmail.css:2`): no tema claro são um bloco marrom-escuro no meio da porcelana (rodapé de **todas** as páginas: `.rodape-insta` premium.css:586-608).

#### 1.3 Tipografia
- Fontes carregadas: **6 famílias, 8 arquivos woff2 (~153 KB)**: Plus Jakarta Sans (27 KB, tokens.css:2, `@font-face` próprio), Jersey 10 400 (13 KB, **global** em main.tsx:9), Pixelify Sans 700 (8 KB, importada em **12 arquivos TSX** diferentes), Cinzel 700/900 (15+15 KB; FlashcardsJogo, CentralFlashcards, SalaoCampeoes), Alegreya 400/700/800 (23+24+25 KB; FlashcardsJogo, CentralFlashcards). Todas `@fontsource` (`font-display: swap`); **sem `<link rel=preload>`** de fonte no `dist/index.html`. `public/fonts` não existe.
- Fora dos tokens: `'Cinzel', serif` literal 12× em Ranking.css (`.sc__*`, `.sb__*`), `'Alegreya'` em Inicio.css:587, `ui-monospace` literal em Admin ×3.
- Pesos: 700 (170), 800 (135), 600 (85), **650 (69), 750 (51), 850 (11), 550 (3)** — pesos intermediários só existem na Jakarta variável; em `system-ui` arredondam. 
- Títulos: base define h1/h2/h3 com clamp (base.css:38-46), mas **84 regras em páginas redefinem `font-size` de h1/h2**, com 15 `clamp()` diferentes para h1 (de `clamp(1.4rem,3.4vw,1.8rem)` a `clamp(3.4rem,9vw,5.4rem)`).
- 231 valores de `font-size`; **52 ocorrências abaixo de 12px** (.55rem, .58rem, .6rem, .62rem, .66rem, .68rem, 11px…): base.css:1535/1539/1543, recursos.css:455-459, Ranking.css:42/47/464/616/669/680, CronogramaPainel.css:10/30/82/101.
- Tamanho de fonte do usuário (`App.tsx:260` `style={{fontSize: `${fonte}%`}}`) não alcança os 14×`13px`, 12×`14px`, 9×`11px`, nem os `font: 700 16px …` do Flashcards.

#### 1.4 Ícones — 5 sistemas convivendo
1. `Icone.tsx` (traço 24×24, 46 caminhos, 391 usos em 63 arquivos) — o sistema principal.
2. `IconePixel.tsx` (PNG 40px de `public/pixel`, 9 nomes, 18 usos em 10 arquivos) — convive com o anterior na mesma Home/nav.
3. SVG inline (25 em 18 arquivos: Simbolo, Medalha, RelogioPixel ampulheta, CenasPixel mapa, admin gráficos…).
4. Sprites PNG via `recurso('ranking/…')` usados como mascote/ícone (mensageiro ×9, tocha ×5, chama ×5, carta ×5, guerreiro ×4).
5. `Medalha.tsx`: disco SVG gerado **ou** PNG de `public/emblemas` (dois estilos de medalha).
- Sem emoji (0 ocorrências). `.icone-pixel` não tem regra própria.

#### 1.5 Botões
- Base (`base.css:283-399`): `.botao`, `--principal`, `--fantasma`, `--largo`, `--perigo`, `--grande`, `--vinculo`, `.botao-icone`, `.botao__contador`; `--pequeno` só existe **escopado** em `.aviso-cookies .botao--pequeno` (base.css:1637) mas é usado solto 2×.
- premium.css: `--claro`, `--vidro` (sobre herói), `.botao-google`.
- recursos.css: `--ouro`.
- Famílias paralelas (não herdam de `.botao`): `fc-botao` (+`--secundario`, `--lendario`, `--epico`, `--arcano`, `--perigo`), `fc-botao-pequeno(--ouro)`, `fc-botao-aval(--sabia/--hesitei/--errei/--sugerido)`, `fc-topo-botao`, `vd-botao-ouro`, `cp-botao(--ouro)`, `cd__botao(--whatsapp/--largo)`, `ti-botao`, `av__botao(--sim/--nao)`, `rodape-insta__botao`, `rodape-coluna__botao`, `inicio-flash__botao`, `adm-kpi--botao`, `cx__botao`, `mn-retomar`, `aviso-bloqueio-topo__cta`, `pw-oferta__cta`, `inicio-planos-atalho__acao`, `convite__whatsapp/copiar`, `tr-heroi__rapida`, `tr-trilha__passo`, `acesso__aba`, `rk-aba`, `ct-seg button`, `tr-pilula`, `relato__tipo`, `opcao-segmento`, `calendario__dia`, `intencao`, `ap__ritmo`, `acesso__link/voltar`, `qd__carrossel`… **≈ 35 famílias de botão**. 61 de 451 `<button>` nos TSX não têm `className`.
- Três botões "dourados" diferentes: `.botao--ouro` (degradê #e7be63→#c9962f), `.vd-botao-ouro`, `.cp-botao--ouro`, `.fc-botao-pequeno--ouro`, `.tr-heroi__rapida` (placa pixel #f4cf7c), `.aviso-bloqueio-topo__cta` (#ffe7a8→#e0a93a), `.inicio-planos-atalho__acao`.

#### 1.6 Cartões
`.cartao` (base.css:409; raio trocado em premium.css:325) + 12 famílias prefixadas: `cripta-cartao`, `adm-cartao`, `tema-cartao`, `ct-cartao`, `lg-cartao`, `dp-cartao`, `rs-cartao`, `pj-cartao`, `pe-cartao`, `vd-cartao`, `ind-cartao`, `px-cartao`, mais `tr-etapa`, `qd`, `pg-convite`, `painel-diario`, `acao-rapida`, `treino-rapido`, `dia-cumprido`, `escada__linha`… Cada uma com padding/raio/sombra próprios. `temporada.css:20-29` transforma `.pe .cartao`, `.dp .cartao`, `.adm-secao`, `.treinar-pagina .tr-etapa` em "cartão de jogo" com `!important`.

#### 1.7 Chips / etiquetas / selos
`.etiqueta(--dado/--alerta)`, `.selo(--conferido)`, `.selo-beta`, `.chip-limite`, `.chip-subtema`, `.tr-pilula`, `.pg-selo`, `.rk-voce`, `.rk-movimento`, `.rk-legenda`, `.qz-origem`, `.qz-chip`, `.cm-selo`, `.ti-nivel`, `.plano__selo`, `.inicio-heroi__selo`, `.rv-heroi__sobrelinha`, `.sobretitulo`, `.paywall__selo`, `.pw-lado__selo`, `.dia-cumprido__selo`… O "selo pixel" (`background:#0b2b27; color:#9fe3d4; font-family: var(--fonte-pixel); uppercase`) está copiado à mão em ≥6 lugares: temporada.css:40 (`.tr-heroi__selo`), :107 (`.pe-ao-vivo__selo`), :156 (`.adm-heroi__sobre`), :190 (`.rk-heroi__selo`), AteAProva.css:3 (`.ap__selo`), Inicio.css:443 (`.inicio-compartilhar__selo`, com `!important`), ModalConfirmarEmail/`.cd__selo` (variante #c99a3b).

#### 1.8 Inputs
`.entrada`/`.selecao` (base.css:487), `.campo`, `.campo__rotulo` (redefinido premium.css:948), `.campo__auxilio`, `.campo__erro`, `.campo__obrigatorio`, `.caixa`, `.campo--checkbox` (base.css:1839 duplica `.caixa`), `.ct-interruptor` (toggle), `.ct-faixa` (range, sem estilo real), `.ct-seg` (segmentado) vs `.opcao-segmento/.grupo-opcoes` (outro segmentado) vs `.acesso__abas` vs `.rk-abas` (quatro controles segmentados), `.seletor` (árvore), `.campos-etapa`, `textarea` sem classe em 4+ lugares, `.limite-personalizado input`. Regra iOS `font-size:16px !important` (base.css:1864).

#### 1.9 Modais — 8 mecanismos
`.veu + .painel` (Painel.tsx, z40/41, folha no celular), `.jc` (JanelaCentral, z1000, portal), `.modal-central` (ModalEntrar; **definida em `paginas/Inicio.css:18`, mas `@keyframes modal-entrar` está em base.css:1180** e o componente é global — verificar se o modal de login fica sem estilo quando o pedaço de Inicio não foi baixado), `.janela-imagem` (base.css:741, z200), `.cf-email__veu` (ModalConfirmarEmail, z90, pixel), `.fc-modal-veu` (z70), `.cd` (convite diário, z1000, pixel), `.convite` (z30), `.espera-jogo` (z70). Fechamento com Esc/foco implementado só em Painel e JanelaCentral.

#### 1.10 Toasts/avisos
Não há toast/snackbar. Avisos: `.aviso-formulario(--erro/--destaque)`, `.aviso-ia(--gabarito)`, `.aviso-site(--alerta/--info)`, `.aviso-cookies`, `.aviso-bloqueio-topo` (duas versões: grande base.css:1529-1557 e "discreta" base.css:1920-1926 que sobrescreve a primeira com `!important`), `.aviso-limite`, `.aviso-sessao`, `.aviso-saldo`, `.resultado(--acerto/--erro/--neutro)`, `.estado`.

#### 1.11 Tabelas
`.tabela` (base.css:1314, `th` fundo superficie-2), `.te-tabela` (10 regras), `.cf-tabela`, `.dp-tabela`, `.adm-tabela-rolagem`, `.tabela--progresso`; 11 TSX com `<table>`; `.rolagem-x` usada em Progresso.

#### 1.12 Estados
- `Estados.tsx`: `Carregando` = esqueleto (`.esqueleto` em Estados.css, `@keyframes brilho` em base.css:1249 — split de arquivo), `Estado` = caixa tracejada.
- `EsperaPixel.tsx`: guerreiro pixel + frase medieval ("Afiando o fêmur…") — usado em conta/página abrindo.
- `CenasPixel.tsx`: `MensageiroDormindo` (vazio/erro), `MapaPerdido` (404).
- `ErroDePagina.tsx`. Resultado: **3 linguagens de carregamento** (esqueleto neutro, guerreiro pixel, véu `.espera-jogo`) e 2 de vazio (caixa tracejada vs cena pixel).

---

### 2. Inconsistências concretas (caminho:linha)

**Mesma coisa, dois nomes / regras duplicadas**
- `.navegacao-mobile` (base.css:1644-1660, usada) e `.nav-mobile` (base.css:1809-1820, **morta**): duas barras de navegação móvel.
- `.comentario` definida 3× em base.css (929, 1615, 1796) com valores contraditórios (`max-width: var(--coluna-leitura)` → `72ch` → `none`; `border-top` ligado e desligado). Idem `.comentario__titulo` (935, 1617, 1797), `.ia__conceito` (987, 1620, 1799), `.ia__item` (991, 1622, 1801), `.ia__letra` (1002, 1804), `.painel-diario` (1501 e 1746: degradê + raio `calc(var(--raio)*2)` vs. superficie + `--raio-cartao`; e premium.css:326).
- CartaoQuestao.css: `.bloco-comentario` 3× (56, 74 + `+` em 37/62/75), `.contribuicao` 3× (47, 65, 76) — camadas de "pequenas mudanças" uma sobre a outra.
- `.aviso-bloqueio-topo__*` versão grande (base.css:1529-1557, ~30 linhas) é anulada pela versão discreta (1920-1926) com `display:flex !important`.
- `.caixa` (base.css:500) ≡ `.campo--checkbox` (base.css:1839) ≡ `.acesso__form .campo--checkbox` (premium.css:220) ≡ `.ct-cartao .campo--checkbox` (premium.css:568).
- Seletores redefinidos entre arquivos: `.cartao` (base:409 / premium:325), `.cabecalho` (base:171 / premium:276), `.rodape` (base:259 / premium:584), `.alternativa` (base / premium:502-520), `.campo__rotulo` (base:466 / premium:948), `.seletor__rodape` (base:597 / premium:421), `.nav-link` (base:208 / recursos:196), `.tr-etapa__numero` (premium:393 / temporada:33 com `!important`), `.pergunta-etapa` (base:1887 / temporada:183 `!important`), `.adm-secao` (Admin.css / temporada:20), `.sn-heroi` (SimuladoNacional.css / recursos.css), `.ct-cartao` (Conta.css / premium:553).
- 4 controles segmentados (`.ct-seg`, `.opcao-segmento`, `.acesso__abas`, `.rk-abas`) e 3 toggles de aba.

**Valores mágicos / fora de escala**
- Espaçamentos: ≥40 valores diferentes (.1, .12, .15, .2, .22, .25, .3, .35, .4, .45, .5, .55, .6, .65, .7, .75, .8, .85, .9, .95 rem + px 2/3/4/6/8/10/12).
- `bottom: calc(4.25rem - 0.35rem + max(0.35rem, env(safe-area-inset-bottom)))` (base.css:1646), `calc(4.4rem + …)` (1640), `calc(4.6rem - 0.35rem …)` (1670), `calc(4.2rem - 0.35rem …)` (CartaoQuestao.css:67), `calc(4rem + …)` (CartaoQuestao.css:81), `calc(4.75rem - 0.35rem …)` (premium.css:762), `6.2rem` (EsperaPixel.css:29): **a altura da barra móvel está hardcoded de 7 formas**.
- Raios literais: 6px ×23, 12px ×23, 14px ×21, 22px ×7 (Flashcards.css:41, Inicio.css:581), 99px ×4, `0.75rem` (premium.css:536), `.35rem` (AteAProva.css:22).

**Cores fora dos tokens (exemplos fora do Flashcards)**
- base.css: `#fff` em letras de alternativa (836-853), `.janela-imagem` `#f2f4f3/#bfe7dd` (745-760), `.aviso-bloqueio-topo` degradê `#0c3b36/#145a52/#1d6b5f`, `#ffe3a3`, `#3d2903`, `#f3c65a`, `#e0a93a` (1520-1550), `::highlight` `#f5df72/#241f00` (1769), `.botao-google` (1870-1874, justificado), `.aviso-bloqueio-topo__interno > svg { color:#ffe3a3 }` (1921).
- premium.css: `.botao--claro { color:#0b3a35 }` (13), `.rv-heroi__acao` (72), `.convite__topo` `#0c3b36→#1d6b5f` (714), `#1fa855/#178c46` WhatsApp ×6 (premium 740, 775; Inicio.css:356; recursos.css:415), `.rodape-coluna__insta { color:#a3276f !important }` (613), `.cd` paleta azul-marinho `#13214a/#0b1630/#23345f` (891-940) que não existe em nenhum outro lugar do site.
- Dourado pixel `#f4cf7c` **78×**, `#1b1208` 63×, `#6b4a0c` 10×, `#c99a3b` 20×, `#072320` 13×, `#9fe3d4` 9×, `#0b2b27` 5× — a "temporada pixel" tem paleta própria mas só 5 tokens em temporada.css:7-13 (`--px-*`), e nem ela se usa (RelogioPixel.css, AteAProva.css, Inicio.css:421-549, recursos.css:411-419 repetem os hex).
- Ranking.css define paletas de medalhas 3× (`--metal*` :214-219, `--m1/--m2` :449-453, `--m` :603-663) e Medalha.tsx tem a quarta (`METAIS`).

**Breakpoints**
- rem: 22, 22.5, 24, 26, 27, 30, 34, 40, 40.01, 44, 46, 47.99, 48, 52, 56, 60, 64, 68, 75, 80, 87; px: 340, 360, 380, 420, 480, 520, 560, 600, 640, 641, 700, 760, 860, 899, 900, 901, 1600. **38 larguras diferentes.** O cabeçalho sozinho usa 34rem (base:239), 22.5rem, 27rem, 40rem, 40.01–56rem, 56rem, 75rem (premium:277-320, 779-795), 64–80rem (base:1916). A barra móvel aparece em `max-width: 40rem` (base:1646) mas `.nav-mobile` morta usa 48rem (base:1812) e `CartaoQuestao.css:80` usa 48rem para o botão fixo.

**Z-index caótico**
- `.jc` e `.cd` em 1000; `.janela-imagem` 200; `.pular-para-conteudo` 100; `.cf-email__veu` 90; `.fc-modal-veu` 70 mas `.fc-*` internos 58–68 com `!important` (Flashcards.css:410, 411, 418, 421, 424, 439, 454) e `z-index:90` (2444); 35 usos de `-1` para pseudo-elementos (dependem de `isolation:isolate`, nem sempre presente).

**`!important`**
- temporada.css:20-36: 14 em borda/raio/sombra/fonte dos cartões e números — toda a "temporada" é uma camada de override.
- base.css:1920-1926 (aviso discreto), 1864 (iOS 16px, justificado), 1994-2001 (`main section[class$="-heroi"] { padding … !important }` e `section[class$="-heroi"]::before/::after { display:none !important }`): **seletor por sufixo de classe** apaga pseudo-elementos de 22 heróis diferentes (`inicio-heroi`, `rk-heroi`, `pe-heroi`, `adm-fin-heroi`…) — frágil e invisível para quem lê a página.
- CartaoQuestao.css:227-228 (`.qz-linha-tempo--*`), Inicio.css:370/443, recursos.css:73/76/325/411-419 (`color … !important`), premium.css:613-614, 833.

**Estilos inline (164)**
- Legítimos (valor calculado): larguras de barra (`Progresso.tsx:146/201`, `Inicio.tsx:380/407/455`), cores de área (`CronogramaPainel.tsx:122/249/307/312/414/415`), grifo (`CartaoQuestao.tsx:274/601`).
- Deveriam ser classe utilitária: `marginTop: '0.75rem'` ×8 em Progresso.tsx (72,103,116,119,164,173,237,240,305), CartaoQuestao.tsx:354/356/522/527/549/560, ContribuirComentario.tsx:88-120 (`fieldset` estilizado inline), Painel.tsx:85 (`borderTop`), Estados.tsx:14.

**CSS morto (amostra verificada)**
- base.css (80/275 sem uso literal): `.treino-rapido*`, `.termos*` (7 classes), `.escada*` (8), `.numeros*`/`.numeros-apoio` (6), `.plano*`/`.grade-planos`/`.cta-planos`, `.cartao-instagram*`, `.intencoes`, `.filtros-destaque`, `.modo-explicacao` (usam `--linha` indefinida), `.opcoes-avancadas*`, `.limite-personalizado`, `.liberacao-limite`, `.provas-selecao`, `.nav-mobile`, `.acao-calendario`, `.calendario*` (plano de revisão), `.aviso-bloqueio-topo__selo/__bloco/__relogio/__rotulo`, `.etiqueta--alerta/--dado`, `.selo--conferido`, `.sobretitulo`, `.painel-diario__*`, `.rodape__interno/__social/__creditos`, `.grifo-temporario`. (`.pagina--compacta/--foco` são falsos positivos: montadas dinamicamente.)
- premium.css: 17 classes `.paywall__*` (paywall antigo; o atual é `.pw-*`), `.aviso-site--alerta/--info`, `.dp-faixa--*`/`.dp-texto--*`, `.liberacao-limite`, `.provas-selecao__simulados`.
- recursos.css: `.cx--crono`, `.cx__botao`, `.cx__icone--verde`, `.cx__texto`, `.dg--baixa`, `.pe-duas`, `.pg-convite--faixa`, `.ti-teaser`, `.vp-recurso`, `.cr-trilha__casa--*`.
- temporada.css: `.pe-adiantar`, `.pe-como`, `.pe-form__num`, `.pe-form__passo`, `.pe-incidencia`, `.pe-meta`, `.pe-retomar`, `.px-cartao`, `.px-numero`.
- Flashcards.css: 148/620 classes sem ocorrência (parte é montada dinamicamente; estimar 60–80 mortas).
- Amostra aleatória de 40 classes de base.css: 7 aparecem em 1 arquivo, 13 em 2, só 6 em ≥10 — a base é pouco "base".

**CSS de uma página afetando outras / cascata frágil**
- Componentes compartilhados estilizados em CSS de página: `.modal-central` (ModalEntrar) em Inicio.css:18; `.cartao-streak*` em Inicio.css:66-72; `.acao-rapida` em Inicio.css; `.estado` em base mas `.esqueleto` em Estados.css com keyframe em base; `.inicio-par`/`.inicio-ranking` em componentes/CartaoCripta.css:23-26.
- Ordem de import (`main.tsx:10-15`) é contrato implícito: premium "refina" base, recursos refina os dois, temporada refina tudo com `!important`; páginas carregam depois e por isso ganham, exceto onde temporada usa `!important`. `impressao.css` global em toda visita (94 linhas) só para `@media print`.
- Seletores genéricos de elemento em base: `h1-h4` com `--fonte-marca` (base.css:30-36) são anulados por 84 regras de página; `kbd` (base.css:1352); `.termos section > p`.
- `body.fc-modal-aberto header.cabecalho, footer { visibility:hidden }` (Flashcards.css:1273) — aceitável, escopado.
- Flashcards.css: 100 % das regras começam por `.fc-`; não vaza. Mas usa nomes de estado genéricos (`.seguir`, `.atual`, `.feito`, `.pronto`, `.sabia`, `.errei`, `.hesitei`, `.aceso`) só seguros porque sempre compostos com `.fc-*`.
- Ranking.css contém o Salão dos Campeões (`.sc__*`, `.sb__*`, Cinzel, `cqw`) e inventário (`.inv*`), `.dica*`, `.fogueira`: 3 subsistemas num arquivo.

**Densidade/preferências com efeito parcial**
- `.pagina--compacta .empilha { gap:.7rem }` (base.css:1848) não faz nada: `.empilha` usa `> * + * { margin-top }` (base.css:1375), não `gap`. "Compacta" só muda `cartao__corpo` padding; "foco" só muda largura e `questao__enunciado` (CartaoQuestao.css:88-89). As duas opções em Conta.tsx:506 prometem mais do que entregam.

---

### 3. Pixel art

**Onde está**
- Fontes: Jersey 10 (54 usos de `--fonte-pixel-titulo`) e Pixelify (42 usos de `--fonte-pixel`) em 18 arquivos CSS: heróis de Treinar, Cronograma, Desempenho, Admin, Ranking (temporada.css), RelogioPixel, EsperaPixel, ModalConfirmarEmail, AteAProva, CartaoCripta, convite `.cd`, rodapé `.rodape-insta`, Inicio (`inicio-ranking`, `podio-previa`, `inicio-compartilhar__selo`), Resumo, Sessao (ModalFimSessao), Indicar, TemasQueMaisCaem, Apoio, Assinatura.
- Imagens: `public/pixel` (9 ícones, 40 KB), `public/ranking` (260 KB: mensageiro, tocha, chama, carta, guerreiro, pódios, salão), `public/emblemas`, `public/flashcards` (**26 MB**). `image-rendering: pixelated` 67× no CSS.
- Assinaturas: horizonte em pixels no rodapé dos heróis (`--heroi-horizonte`), sombra deslocada `5px 5px 0`, borda 2px, raio 6px/0, placa `#1b1208` com moldura `#f4cf7c`, selo `#0b2b27/#9fe3d4`.

**Quantas famílias? Três, não uma.**
1. **"Temporada pixel estilo B"** (aprovada 11/10): Jersey + Pixelify, ouro `#f4cf7c` sobre tinta `#1b1208`, sombras em degrau. Coerente entre si, mas aplicada como *override* (`temporada.css` com 18 `!important`) sobre componentes que não foram desenhados para ela.
2. **Flashcards / "Cripta" HD-2D** (Flashcards.css:1-30): Cinzel + Alegreya, molduras douradas de 6 anéis (`box-shadow` com 8 camadas, :43-46), gemas, 112 animações com `filter`/`box-shadow`. É fantasia serifada, não pixel: outra identidade. Legítimo dentro do jogo; o problema é vazar para fora: `CartaoCripta.css` (home e planos: degradê roxo/laranja `#1d1016`, `#ffb070`), `inicio-flash` (Inicio.css:552-607, paleta verde-oliva `#12241c/#728b69/#edd69f`, fonte Alegreya), `CentralFlashcards` (Cinzel + Alegreya na página normal do site).
3. **Salão dos Campeões** (Ranking.css:490-688): Cinzel 900, `#e8b440`, confete `pdx-confete`, brilho `text-shadow` — terceira linguagem de "prestígio", dentro do Ranking comum.

Mais dois idiomas de ícone (traço vs PNG pixel) lado a lado na Home e no menu.

**Onde pesa demais para um site sério**
- Admin (`temporada.css:148-175`): título Jersey de 2.6rem, abas douradas, KPI em pixel — ferramenta interna.
- Cronograma: `.pe .pe-heroi__nome` Jersey `clamp(3.2rem, 9vw, 5rem) !important` (temporada.css:113); Ranking `clamp(3.4rem, 9vw, 5.4rem)` (:191) — títulos maiores que o próprio conteúdo.
- Convite diário `.cd` (premium.css:887-985): placa azul-marinho com mensageiro pulando, `z-index:1000`, cursor piscando — intrusivo, paleta estranha ao site.
- `ModalConfirmarEmail`: "cartão de missão" para confirmar e-mail (passo sério de conta).
- `.rodape-insta` em **todo** rodapé: bloco marrom escuro de 3 molduras no tema claro.
- `EsperaPixel` com "Afiando o fêmur…" em qualquer espera de conta (inclusive para quem veio pagar).
- Botões sem raio + sombra em degrau no Treinar (`tr-heroi__rapida`, `tr-barra .botao--principal`) ao lado de botões arredondados `.botao` padrão — dois sistemas de botão na mesma tela.

**Onde falta / está inconsistente**
- Estados: 404 e vazio têm cena pixel, mas erro genérico (`.estado`) é caixa tracejada; carregamento é esqueleto neutro em uns lugares e guerreiro em outros.
- Ícones de navegação: traço no cabeçalho, PNG pixel nos atalhos da Home.
- Cartão da questão, Sessão, Resumo (o coração do produto) não têm nenhum detalhe da assinatura — razoável, mas então o pixel vira "tema de ranking", não identidade.

---

### 4. Acessibilidade e movimento

- **`prefers-reduced-motion`**: regra global forte em base.css:1219-1227 (`animation-duration:0.001ms !important` para tudo) + 49 blocos locais. Cobertura boa. Gaps: `Estados.css` (`.esqueleto` infinito, coberto só pelo global), Flashcards tem 17 blocos mas 112 keyframes; `transition` em `.convite--saindo` ok. `animation-iteration-count:1 !important` global quebra sprites `steps()` que dependem de loop (ficam no quadro 0) — aceitável.
- **Foco**: `:focus-visible` global (base.css:81-85) com `outline 2px var(--verdete)`; 45 regras locais; `outline:none` só em `.fc-modal` (Flashcards.css:41, justificado por ser container). No escuro o anel `--verdete` `#4fb3a5` sobre `--verdete` do botão principal (mesma cor) tem contraste ~1:1 → foco invisível no botão principal e nas pílulas selecionadas (`tr-pilula[aria-pressed]`, `rk-aba[aria-selected]`).
- **Contraste**: ver tabela 1.2. Falhas AA reais: letras brancas sobre acerto/erro no escuro (2,3–2,9), `--ouro` como texto no claro (3,8), `--aviso` sobre véu (4,0), `--prata` (3,75), textos `rgba(255,255,255,.65-.7)` sobre verdete nas faixas (3,7), bordas de campo no escuro (1,3).
- **Toque**: `--toque: 44px` usado 13×; mas há `min-height` 32/34/36/38px em botões (`.nav-link` 38, `.rk-aba` 40, `.chip-limite` 32 base.css:1913, `.relato__tipo` 38, `.ct-seg button` 38, `.arvore__linha` 38, `.aviso-bloqueio-topo__fechar` 1.8rem≈29px base.css:1925, `.navegacao-mobile a` sem min-height, `.qz-ferramenta` 38). `touch-action: manipulation` só em alguns (premium.css:531).
- **Fonte mínima**: 52 ocorrências < 12px; `.aviso-bloqueio-topo__selo small` **.55rem (8,8px)**, `.rk-legenda` .68rem, `.navegacao-mobile a` .68rem (base.css:1654), `.rk-movimento--novo` .66rem.
- **Densidade/tamanho de fonte**: aplicados em `App.tsx:260`, mas (a) `font-size:%` não afeta os ~40 tamanhos em px nem o Flashcards, (b) densidade só altera 4 regras (2.x acima), (c) "foco" não esconde nada. Funcionam "em todas as páginas" tecnicamente, mas quase sem efeito perceptível fora da Sessão.
- **Zoom iOS**: tratado (base.css:1864).
- **Tema sorteado**: quem tem `prefers-color-scheme` configurado recebe tema aleatório contrário à preferência do sistema metade das vezes; não há opção "seguir sistema" funcional (ver 1.2).

---

### 5. Performance de CSS

- **Divisão por rota**: sim, Vite gera 28 CSS por página lazy e `vite.config.ts:88-96` injeta `preload` do CSS/JS da rota inicial. Mas o **global de 157 KB** (toda visita) inclui: paywall antigo, admin (`adm-pulso`), convite, `.cd`, ranking abas, treinar etapas, desempenho, suporte, conta-assinatura, termos, calendário de revisão, escada, gráfico, Google button, `impressao.css`, Jersey 10. A página inicial usa talvez 25 % dele (o comentário em main.tsx:6-8 já reconhecia isso).
- **Flashcards**: 239 KB de CSS (2555 linhas, 1257 hex, 112 keyframes) + 26 MB em `public/flashcards` — fora do escopo do site, mas `CartaoCripta.css`, `inicio-flash` e `CentralFlashcards.css` trazem Cinzel/Alegreya (≈75 KB de fonte) para a Home e Planos.
- **Fontes**: 8 woff2 (~153 KB) sem preload; `swap` → FOUT visível nos títulos Jersey dos heróis (texto cai em system-ui e muda de largura). Pixelify importada em 12 arquivos (dedup pelo Vite, mas acoplamento). Jersey global mesmo onde não aparece.
- **Animações não-compositáveis**: ≈45 keyframes animam `box-shadow`, `filter`, `background-position`, `width`, `top`: base.css:1254 (`brilho`, background-position no esqueleto, roda infinito), premium.css:338 (`rk-brasa` box-shadow infinito), 820 (`adm-pulso`), CronogramaPainel.css:29 (`cp-pulso`), CartaoQuestao.css:394 (`turma-enche` width), Ranking.css:210/443/445/498/524 (`filter: drop-shadow` infinito, `top`), EsperaPixel.css:12, Flashcards (30+ com `filter`/`box-shadow`). 44 `transition` incluem box-shadow/filter/width/height.
- **`backdrop-filter`**: 28 usos; o cabeçalho sticky tem `blur(14px)` em toda página (premium.css:277-279) — custo contínuo ao rolar em Android fraco.
- **SVG inline**: `--heroi-horizonte` data-URI ~2,6 KB ×2 em tokens (toda página); 16 SVGs em `src/estilos/ui` (64 KB) para o jogo. `Simbolo.tsx` com `style` inline por vértebra (6 estilos).
- `will-change` 19× (ok), `contain` 1×.

---

### 6. Proposta: design system mínimo e consistente

#### 6.1 Tokens finais (um arquivo, `tokens.css`, nada mais define `--cor-*`)
- **Cor** (manter nomes atuais, remover usos literais): `--fundo`, `--superficie`, `--superficie-2`, `--traco`, `--traco-forte`, `--texto`, `--texto-2`, `--texto-3` (novo, para legendas ≥4,5:1), `--marca` (=verdete), `--marca-tinta`, `--marca-veu`, `--sobre-marca`, `--acerto/--erro/--aviso` + `-veu` + **`-texto`** (novo: tom escuro o bastante para texto sobre véu nos dois temas), `--ouro/--ouro-veu/--ouro-texto`, `--foco` (anel de foco com contraste ≥3:1 sobre marca em ambos os temas, ex. `#ffd166`-ish no escuro). Adicionar `--pixel-tinta #1b1208`, `--pixel-ouro #f4cf7c`, `--pixel-ouro-sombra #6b4a0c`, `--pixel-selo-fundo #0b2b27`, `--pixel-selo-texto #9fe3d4` e **retirar os 200+ hex repetidos**. Tema escuro via `[data-tema="escuro"]` **e** `@media (prefers-color-scheme: dark) { :root:not([data-tema="claro"]) }` para "sistema" funcionar.
- **Tipografia**: `--texto-xs 0.8125rem (13)`, `--texto-sm 0.9375rem (15)`, `--texto-md 1.0625rem (17)`, `--texto-lg 1.25rem`, `--titulo-sm 1.25–1.5rem`, `--titulo-md clamp(1.5rem,…,2rem)`, `--titulo-lg clamp(2rem,…,2.75rem)`, `--display clamp(2.5rem,…,3.5rem)` (único tamanho para Jersey nos heróis). Pesos: 400, 600, 700 (+800 só na Jakarta). Mínimo 12px (`--texto-xs` como piso; o que hoje é .55–.68rem sobe para 13px ou vira `uppercase 12px`).
- **Espaço**: `--e-1 .25rem`, `--e-2 .5rem`, `--e-3 .75rem`, `--e-4 1rem`, `--e-5 1.5rem`, `--e-6 2rem`, `--e-8 3rem` (+ `--gutter` responsivo). `--altura-barra-movel` e `--altura-cabecalho` como tokens para acabar com os 7 `calc(4.xrem…)`.
- **Raio**: `--raio-sm 4px`, `--raio-md 10px` (controle), `--raio-lg 16px` (cartão), `--raio-pill 999px`, `--raio-pixel 0` (modo pixel). Nada de 6/12/14/22px.
- **Sombra**: `--sombra-1`, `--sombra-2`, `--sombra-pixel` (`4px 4px 0 var(--pixel-sombra)`). Fim dos 427 valores.
- **Movimento**: `--dur-1 120ms`, `--dur-2 200ms`, `--dur-3 350ms`, `--curva-saida ease-out`, `--curva-mola cubic-bezier(.2,.8,.3,1.15)`, `--passos steps(2,end)`.
- **Camadas**: `--z-sticky 20`, `--z-dropdown 30`, `--z-barra 40`, `--z-veu 50`, `--z-modal 60`, `--z-toast 70`, `--z-jogo 80`. Flashcards recebe sua faixa interna 80–89.
- **Breakpoints** (comentados em tokens, usados por convenção já que CSS não tem variável em `@media`): `30rem` (celular grande), `40rem` (tablet/menu móvel), `56rem` (computador), `75rem` (largo). Tudo em rem; apagar os em px.

#### 6.2 Componentes base (`src/componentes/ui/`, 1 arquivo CSS cada, prefixo `ui-` ou manter nomes atuais sem prefixo de página)
- **Botão** (3 variantes + 3 tamanhos): `.botao` (secundário/contorno, padrão), `.botao--principal`, `.botao--fantasma`; tamanhos `--pequeno 36px`, padrão 44px, `--grande 52px`; modificadores ortogonais `--largo`, `--perigo` (cor), `--ouro` (cor, substitui vd-/cp-/fc-pequeno--ouro), `--pixel` (raio 0 + sombra em degrau, substitui tr-heroi__rapida/concluir-flutuante/rodape-insta__botao/cd__botao). `.botao-icone` continua. `<Botao>` em TSX tipando `variante`, `tamanho`, `tom`, `pixel`.
- **Cartão** (2): `.cartao` (superfície, borda, `--raio-lg`, `--sombra-1`) e `.cartao--heroi` (fundo `--heroi`, texto `--sobre-heroi`, horizonte pixel). Modificador `--pixel` (borda 2px, raio 6px→`--raio-sm`, sombra em degrau) substitui `temporada.css:20-29`. Todos os `xx-cartao` viram `.cartao` + classe de layout própria sem cor/raio/sombra.
- **Chip/Selo** (1 componente, 4 tons): `.chip` (neutro), `--marca`, `--acerto`, `--erro`, `--aviso`, `--ouro`; variante `--pixel` (uppercase Pixelify, `--pixel-selo-*`) substitui os 6 selos copiados.
- **Inputs**: `.campo` (wrapper) + `.campo__rotulo/__auxilio/__erro`; `.entrada`, `.selecao`, `textarea.entrada`; `.caixa` (checkbox/radio; apagar `.campo--checkbox`); `.interruptor`; `.segmentado` (único, substitui ct-seg/opcao-segmento/acesso__abas/rk-abas). Borda de campo com `--traco-forte` no escuro (≥3:1).
- **Modal** (1 componente, 2 apresentações): `<Janela>` = `.jc` atual (centro no computador, folha no celular) absorve `.modal-central`, `.painel`, `.cf-email`, `.cd`; o Flashcards continua com o seu. Esc/foco já existem em JanelaCentral.
- **Toast**: criar `<Avisos>` único (fila, `role=status`, `--z-toast`, posição acima da barra móvel) substituindo `.aviso-saldo`, `.convite`, parte do `.aviso-cookies`.
- **Tabela**: `.tabela` + `--compacta` + `.tabela-rolagem` wrapper; apagar te-/cf-/dp-tabela quando migrarem.
- **Estados**: `<Estado tipo="vazio|erro|carregando" pixel?>`: carregando = esqueleto (padrão) **ou** guerreiro (só em telas de jogo/ranking); vazio/erro = caixa com ilustração opcional (`MensageiroDormindo`). Um só lugar.
- **Tipografia**: `.titulo-display` (Jersey, único tamanho) para heróis; `h1-h3` só via tokens; proibir `font-size` em h1 nos CSS de página (stylelint).

#### 6.3 Plano de migração sem quebrar
1. **Congelar tokens (P, 1 dia)**: acrescentar os tokens novos em `tokens.css` sem remover os antigos; criar aliases (`--raio: var(--raio-md)`). Adicionar `prefers-color-scheme`. Corrigir os 6 pares de contraste (só valores). Adicionar `stylelint` com regras `declaration-property-value-disallowed-list` (hex fora de tokens), `declaration-no-important` (warning), `unit-allowed-list` (sem px em media), `selector-max-specificity`. Rodar como `npm run lint:css` em modo "não aumentar" (baseline).
2. **Componentes base (M, 1 semana)**: `src/componentes/ui/{Botao,Cartao,Chip,Campo,Janela,Toast,Tabela,Estado}.tsx` + `src/estilos/ui.css` (único global novo). Cada um reproduz **exatamente** o visual atual de `.botao`, `.cartao` etc. (mesmos nomes de classe), para poder trocar sem diff visual. Capturas Playwright de 390/820/1440 nas 6 rotas principais como regressão (já existe infra para Flashcards).
3. **Migrar por tráfego (G, 3–4 semanas, paralelizável por página)**: ordem sugerida Inicio → Treinar → Sessao/CartaoQuestao → Resumo → Ranking → Conta/PortaoConta → Assinatura → Revisao/CadernoErros/Favoritas → Cronograma → Admin. Em cada página: trocar hex por token, botões/cartões/chips pelos componentes, `style={{marginTop}}` por utilitários (`.mt-3`…), breakpoints para os 4 oficiais, remover `!important`, mover regras de componentes compartilhados (`.modal-central`, `.cartao-streak`) para `ui.css`. Ao terminar uma página, `temporada.css` perde o bloco dela (o modo pixel passa a ser `--pixel` opt-in no componente).
4. **Apagar CSS morto (M)**: depois de 3, rodar o cruzamento classe×TSX (script já esboçado nesta auditoria) + PurgeCSS em modo relatório; apagar as ~500 classes; fundir `premium.css`/`recursos.css`/`temporada.css` no que sobrar de `base.css` + `ui.css`; `impressao.css` só na Sessão (import na página). Meta: global ≤ 60 KB.
5. **Fase 5 (opcional)**: Flashcards fica como "pacote de jogo" isolado (`color-scheme: dark`, seus tokens `--fc-*` derivados dos globais), importando só `tokens.css`.

#### 6.4 Ferramentas
- **Stylelint: sim** (barato, pega hex/`!important`/px em media/duplicatas de seletor com `no-duplicate-selectors`). É o que impede o Frankenstein de voltar.
- **CSS Modules: parcialmente**. Para `src/estilos/paginas/*.css` resolveria colisão e CSS morto (classes não referenciadas somem no tree-shaking do TS), mas o custo é renomear 2.000 `className` strings. Recomendo só para **páginas novas** e para o Flashcards; a base compartilhada fica em CSS global com nomes estáveis.
- **Tipagem de classes**: um `type Variante = 'principal' | 'fantasma' | …` dentro de `<Botao>`/`<Chip>` já dá o ganho; não vale gerar `.d.ts` de CSS.
- **Tailwind: não.** O projeto tem tokens próprios, tema sorteado por `data-tema`, pixel art com sombras compostas e 12 k linhas de CSS legado; Tailwind adicionaria uma segunda linguagem sem resolver duplicação de componentes. O que falta é disciplina de tokens e componentes, não utilitários. Um conjunto de ~15 utilitários próprios (`.mt-1..6`, `.texto-2`, `.menor`, `.so-leitor`, já existem alguns) basta.
- **PurgeCSS/`@fullhuman` em modo relatório** só na etapa 4.
- **Playwright de regressão visual** (já usado nos flashcards) em 3 larguras × 8 rotas × 2 temas.

---

### 7. Brainstorm: 10 direções de arte

1. **"Um pixel por tela"**: regra editorial — cada página tem exatamente um elemento pixel (o horizonte do herói, ou o número Jersey, ou a ampulheta), nunca dois. O resto é tipografia limpa. Transforma o pixel em assinatura, não em tema.
2. **Horizonte como fio condutor**: a faixa `--heroi-horizonte` (já aprovada) vira o único ornamento transversal: rodapé do herói, rodapé do site (substituindo a placa `.rodape-insta`), separador de seções em 8px de altura, favicon animado ao carregar.
3. **Números em Jersey, texto em Jakarta/system**: só algarismos (posição no ranking, dias até a prova, % de acerto, contador de questões) usam `--fonte-pixel-titulo`; títulos voltam para a Jakarta. Coerente com "site sério com pegada".
4. **Tema escuro premium "sala de estudo"**: no escuro, heróis sem degradê em faixas, só `--superficie` com o horizonte em `#0a2f2b`; ouro `#e0b862` só em números e no anel de foco; sombras viram linhas de 1px. Vender o escuro como modo de leitura noturna, não como inversão.
5. **Microinterações em `steps()`**: toda transição do site usa `steps(2)` ou `steps(3)` em 120–200ms (hover de botão sobe 1px em dois passos, chip selecionado "encaixa", barra de progresso enche em blocos de 8px). Pixel sentido no movimento, não na forma.
6. **Mascote com cargo**: o mensageiro aparece só em três momentos (vazio, 404, e-mail enviado), sempre em 48px, canto inferior direito do cartão, sem animação de pulo. Guerreiro só dentro de Ranking/Flashcards. Lista fechada em `docs/`.
7. **Medalhas como sistema único**: fundir os 4 paletas de metal (Medalha.tsx, Ranking.css ×3) em tokens `--metal-ouro/-prata/-bronze/-esmeralda/-lendario` (3 tons cada) e desenhar as medalhas PNG e SVG na mesma grade de 16px.
8. **Barra de progresso "de vida"**: a `repeating-linear-gradient` em blocos de 8px (temporada.css:131) vira o único estilo de barra do site (progresso da sessão, cobertura por tema, cronograma), nas cores semânticas.
9. **Cartão da questão com assinatura discreta**: a letra da alternativa (A, B, C…) em `--fonte-dados` ganha canto cortado (clip-path 2px) e a alternativa certa revela um horizonte de 4px no rodapé do cartão. Pixel no produto central, invisível até acertar.
10. **Página de planos como "vitrine séria"**: tirar `inicio-flash` verde-oliva e `cripta-cartao` roxo/laranja; apresentar Flashcards com uma captura real do jogo dentro de um `.cartao--heroi` normal, com um chip `--pixel` "Beta". O jogo fica fantasia por dentro; por fora é um recurso do site.

---

### Top 15 tarefas desta área (prioridade decrescente)

| # | Tarefa | Tam. | Paralela? |
|---|---|---|---|
| 1 | Corrigir contraste: `color:#fff` → `var(--sobre-acerto/--sobre-erro)` em base.css:836-853, CartaoQuestao.css:330-336/374/417, NivelCobranca.css:3, `.botao--perigo:hover`; criar `--acerto-texto/--erro-texto/--aviso-texto/--ouro-texto` para texto sobre véu; `--traco-forte` nas bordas de campo no escuro; anel de foco `--foco` visível sobre `--verdete` | P | sim |
| 2 | Fazer "sistema" funcionar: bloco `@media (prefers-color-scheme: dark)` em tokens.css; `theme-color` e pré-carga em `index.html` com os valores dos tokens | P | sim |
| 3 | Instalar stylelint com baseline (hex fora de tokens, `!important`, px em `@media`, `no-duplicate-selectors`) e script `lint:css` | P | sim |
| 4 | Tokens de espaçamento, raio, sombra, duração, z-index, `--altura-barra-movel`; substituir os 7 `calc(4.xrem…)` e os z-index 1000/200/100/90 pelos tokens | M | sim (após 3) |
| 5 | Apagar CSS morto já identificado: `.nav-mobile`, `.termos*`, `.escada*`, `.numeros*`, `.plano*`, `.treino-rapido*`, `.cartao-instagram*`, `.calendario*`, `.filtros-destaque/.modo-explicacao`, `.paywall__*`, `.aviso-bloqueio-topo` versão grande (base.css:1529-1557), duplicatas de `.comentario/.ia__*` (manter só a última), `.bloco-comentario/.contribuicao` repetidos em CartaoQuestao.css | M | sim |
| 6 | `<Botao>` em `src/componentes/ui/` com 3 variantes × 3 tamanhos + tons `perigo/ouro` + `pixel`; migrar `vd-botao-ouro`, `cp-botao`, `tr-heroi__rapida`, `concluir-flutuante`, `aviso-bloqueio-topo__cta`, `inicio-planos-atalho__acao`, `.botao--pequeno` solto | M | sim (após 4) |
| 7 | `<Chip>` único com tom e `--pixel`; substituir os 6 selos pixel copiados (temporada.css:40/107/156/190, AteAProva.css:3, Inicio.css:443) e `rk-voce/rk-legenda/qz-origem/cm-selo/ti-nivel/pg-selo` | M | sim (após 4) |
| 8 | Unificar modais: `.modal-central` (Inicio.css:18) e `@keyframes modal-entrar` (base.css:1180) para `ui.css`/JanelaCentral; `.cf-email` e `.cd` sobre o mesmo `<Janela>`; mover `.cartao-streak`, `.acao-rapida` para onde o componente mora | M | sim |
| 9 | Reduzir `temporada.css` a modificadores opt-in (`.cartao--pixel`, `.numero--pixel`) sem `!important`; retirar o estilo pixel do Admin e reduzir o tamanho dos títulos Jersey de Cronograma/Ranking para um único `--display` | M | sim (após 6-7) |
| 10 | Breakpoints: converter os 17 valores em px e os rem fora da escala para {30, 40, 56, 75}rem; consolidar as 7 regras do cabeçalho (base.css:239, premium.css:277-320/779-795, base.css:1916) num só bloco | M | sim |
| 11 | Fontes: preload da Jakarta e da Jersey no `index.html`; importar Jersey só onde há herói (não em main.tsx); importar Pixelify num único módulo `estilos/fontes-pixel.ts`; tirar Cinzel/Alegreya da Home/Planos (`inicio-flash`, `cripta-cartao`, `CentralFlashcards`) | P | sim |
| 12 | Densidade e tamanho de fonte reais: corrigir `.pagina--compacta .empilha` (margin, não gap), converter os ~40 `font-size` em px para rem, definir o que "foco" esconde (barra lateral, etiquetas, rodapé) | P | sim |
| 13 | Inline `style` → utilitários: criar `.mt-1..6`, `.mb-0`, `.lista-limpa`; trocar em Progresso.tsx, CartaoQuestao.tsx, ContribuirComentario.tsx, Painel.tsx, Estados.tsx (deixar só os valores calculados) | P | sim |
| 14 | Mover de `base.css`/`premium.css`/`recursos.css` para CSS de página o que é de uma rota só (paywall, convite, `.cd`, admin, suporte, conta-assinatura, termos, calendário, gráfico, Google) e `impressao.css` para a Sessão; meta global ≤ 60 KB | G | não (depois de 5-8) |
| 15 | Animações: trocar keyframes de `box-shadow/filter/width/top` fora do jogo por `transform/opacity` (base.css:1254 esqueleto, premium.css:338/820, CronogramaPainel.css:29, CartaoQuestao.css:394, Ranking.css:210/443/445/498/524); limitar `backdrop-filter` do cabeçalho a `(min-width:56rem)` | P | sim |

**Observações de medição**: "classe sem uso" = sem ocorrência literal do nome em qualquer `.ts/.tsx` (classes montadas por template string, como `pagina--${densidade}` ou `rk-movimento--${x}`, aparecem como falso positivo; a lista acima foi filtrada manualmente para base/premium/recursos/temporada). Contrastes calculados pela fórmula WCAG 2.x sobre os hex dos tokens; `rgba` convertidos por composição aproximada.


---

# Anexo F · Flashcards (relatório completo)

## Auditoria dos Flashcards (somente leitura) — 15/10/2026

Base lida: AGENTS.md, PLANO-DE-IDEIAS.md, CONTINUAR.md, LANCAMENTO-BETA.md, JORNADA-UNICA.md, PENDENCIAS-14-10.md, RESUMO-14-10.md, DECISOES.md, ROTEIRO.md, RANKING.md, CONQUISTAS.md. Código lido inteiro: Arena.tsx, regras.ts, Estudo.tsx, CentralFlashcards.tsx, Flashcards.tsx, FlashcardsJogo.tsx, fundo.ts, Entrada.tsx, ModalJogo.tsx, sons.ts, selecao.ts, servidor.ts, aprendizagem.ts, progresso.ts, bestiario.ts, Cartao.tsx, Hud.tsx, Cenario.tsx, ClimaEstudo.tsx, Volume.tsx, Visualizador.tsx, Tutorial.tsx, páginas de ranking/atalho/admin; efeitos por amostragem (palco, pintura, assados, personagens, bestas, pixel, ataques, tabuleiros, cenariosPintados, deslizar, fauna etc.). Testes de motor/aprendizagem/progressão/desempenho/diário rodados: todos passam (`node fixtures/testar_*.mjs`).

---

### Estado real

**Travas (src/config.ts:50-60 e .github/workflows/publicar.yml:62-66):** `FLASHCARDS_LIBERADO=true`; `FLASHCARDS_NO_MENU`, `FLASHCARDS_RANKING`, `FLASHCARDS_NA_CAPA`, `FLASHCARDS_NA_VENDA` e `VITE_FLASHCARDS_LIMITE` todas ligadas no deploy. Nada do beta está desligado por trava; o que está desligado é por **código morto**, não por flag.

**Conferência dos `[x]` do PLANO-DE-IDEIAS.md contra o código:**

| Ideia | Doc | Real | Evidência |
|---|---|---|---|
| 3 "cada vilão com golpe próprio" | [x] | Parcial: 11 estilos cobrem 23 sprites por família (`efeitos/ataques.ts:28-33`), não um golpe por vilão. | ataques.ts:28 |
| 13 "efeito de bloqueio do escudo" | [x] | Feito, mas o texto da ideia ainda diz "hoje ainda usa o projétil antigo" (doc desatualizado). | Arena.tsx:575-590 |
| 23 Hipnose | [x] | Feita e só visual (`motor/hipnose.ts`), mas o `aria-label`/teclas usam a ordem visual: correto. | regras.ts:808, Arena.tsx:1068 |
| 25 superpoder na placa | [x] | Feito, porém a placa mostra só 2 selos + "+N" (Arena.tsx:1205-1230): Grude/Tremor frequentemente ficam escondidos no "+N". | Arena.tsx:1229 |
| 51 cenários pintados | [x] | Feito: `CENAS_PINTADAS` cobre as 22 cenas (`cenariosPintados.ts:57`). Consequência: ~900 linhas de `pintarCena` procedural em `pintura.ts` (90-1010) viraram fallback morto. | pintura.ts:953 |
| 53 raptor em volume | [ ] | Correto. Mas o buraco é maior: só 26 folhas assadas em `assados.ts` para 44 aparências do bestiário. Sem folha nova: raptor (3), corvo, morcego, cavaleiro (3), espectro (3), quimera (3), mão, leviatã, rei (2), arconte, harpia, escaravelho, **dragão escarlate/ancestral**, **gosma sinovial**. Agravante: `assadoDe` (Hud.tsx:34) procura `dragao-escarlate`; como não existe, cai no desenho antigo em código, nem sequer na folha base `dragao`. | Hud.tsx:34-39 |
| 58/59 ranking temático | [x] | Página do site `src/paginas/RankingCripta.tsx` existe. O componente `src/flashcards/componentes/RankingCripta.tsx` (74 linhas, abas Cripta/Torre) **não é importado em lugar nenhum**: morto. | grep sem importadores |
| 63 tutorial "jogável" | [x] | É um diálogo de 5 etapas com botões de exemplo (`Tutorial.tsx:25-32`); não entra na arena, não ensina vida/intenção/poderes/portas. "Jogável" é exagero. | Tutorial.tsx:19-33 |
| 65 acessibilidade | [x] | Feito: 17 regras `--texto-maior`, 7 `--contraste`, 1 `--sem-tremor`, 17 `prefers-reduced-motion`, 21 `focus-visible` em Flashcards.css. Alto contraste é raso (7 regras). | Flashcards.css |
| 68 vfx por andar | [x] | Feito (`vfxPorAndar.ts`). | Arena.tsx:284 |
| 69 Opus com fallback | [x] | Feito (`audioArquivo.ts`), mas `floresta.mp3/.ogg` (780 KB) não é referenciado em `ARQUIVO_MUSICA` (sons.ts:602): asset órfão. | sons.ts:602-607 |
| 70 FPS no celular | [~] | Só benchmark sintético. Nenhuma medição em aparelho. | TUTORIAL-DESEMPENHO-14-10.md |
| 80 contador da rota | [x] | **Não encontrado**: `Partida.rota.restam` existe (regras.ts:175) mas nenhuma tela mostra "faltam N de 10". RESUMO-14-10.md:57 diz que falta; PENDENCIAS diz que "já existia" confundindo com o contador do Estudo. | Arena.tsx (sem uso de `rota.restam`) |
| 81 áreas do baralho demo | [ ] | `BARALHO_DEMO` continua sempre no acervo (`acervo.ts:33`), com áreas fora do padrão. | acervo.ts:33 |
| F 60 estágio no ranking | [ ] | Correto, não feito. | — |
| I 71-74 skins/desafios/sementes | [ ] | Não feitos. `HEROIS` (herois.ts) tem 8 heróis descritos, 7 `liberado:false`, sem tela de escolha. | herois.ts:21-30 |
| 36 selos da Biblioteca | [ ] | Não feito. `conquistas.ts` (19 emblemas) segue desligado do sistema do site. | conquistas.ts:1-15 |

**Outras discrepâncias doc × código**
- `docs/flashcards/ROTEIRO.md` está obsoleto: itens marcados `[ ]` já feitos (aba no menu, limite no servidor, "De onde veio"/"Fazer a questão", migrations aplicadas, testes).
- `src/config.ts:55` ainda descreve "ranking da Cripta (Normal e Difícil)"; a jornada única eliminou níveis. `NIVEIS` (regras.ts:47-52) e `pesoFlashcard` só sobrevivem para compatibilidade; `pesoDoFlashcard` (selecao.ts:45) não é chamado por ninguém (código morto). `CHAVE_NIVEL` (progresso.ts) sem uso.
- `lerRankingCripta`, `minhaPosicaoCripta` (servidor.ts:117,131), `estadoDoSom`, `somDisponivel` (sons.ts), `AVISO_LIMITE_FLASHCARDS`, `GRUPOS_DA_JORNADA`, `metricasCripta`/`EMBLEMAS_CRIPTA`: exportados e nunca usados.
- Torre: removida da entrada, mas vive em Arena (`patamarSalvo`, `voltarAoPatamar`, `CHAVE_PARTIDA_TORRE`, `TORRE`), em `Fim`, no `TITULOS['/flashcards/torre']` (App.tsx:89) e em `conquistas.ts`. Ninguém chega lá (Flashcards.tsx:25 redireciona). Peso morto que confunde quem lê.
- Texto da jornada no ranking do site está errado: `src/paginas/RankingCripta.tsx:33` diz "começa pelos flashcards com maior acerto da turma. Depois vêm as que você acertou…"; a ordem vigente (JORNADA-UNICA, 14/10) é acertadas por você → turma → erradas → novas (`selecao.ts:1-12,78-83`).

---

### Bugs

#### Motor (regras.ts)
1. **Roubo do Mímico ignora o escudo** — `regras.ts:841`: `if (i.rouba && e.encaixes.length)` rouba carga mesmo quando `def.bloqueado` (Tremor em :827 e Veneno em :813 exigem golpe que acerta). A intenção mostra "escudo pronto" e mesmo assim perde carga. Provável bug de consistência.
2. **Tremor/Roubo da poção com carga > 1** — `regras.ts:832` e `:847`: `pocao: poder === 'pocao' ? 0 : e.pocao` zera o desafio da poção, mas `gastar()` só remove o encaixe se `carga === 1`; com `cargas` > 1 o encaixe fica e o desafio morre (estado inconsistente). Baixa frequência.
3. **Sinergia "Pronto-socorro" rotulada como INSÍGNIA** — `regras.ts:1109` usa motivo `'insignia'`; a tela mostra "+6 INSÍGNIA" em vez de sinergia (Arena.tsx:64 `ROTULO_CURA`).
4. **"Temperar a armadura" não registra cura** — `regras.ts:1270` soma `vida + 10` direto, sem `curaTotal` nem evento `cura` (não anima nem respeita `vidaMax` recém-aumentada… ok, mas inconsistente com o texto "cura 10").
5. **`comprar` com baralho vazio** — `regras.ts:491-493`: se `repor` devolver `[]` e o descarte estiver vazio, `baralho[0]` é `undefined` e `carta(undefined)` lança (`Flashcard undefined fora do baralho`). Só acontece com acervo minúsculo/rota impossível, mas derruba a Arena (sem try/catch no `aplicar`).
6. Veneno/Chamas: lógica correta e testada (nunca derruba, `Math.max(0, e.vida-1)` em :861/:873). Grude correto (:401 teto). Hipnose correta e só visual. OK.

#### Salvamento / progressão / ranking
7. **Abrir a Biblioteca cria uma partida da Cripta e abre corrida no servidor** — `FlashcardsJogo.tsx:20` monta `<Arena modo="masmorra" abrirEstudo>`; `Arena.tsx:225` faz `partidaSalva ?? comCorrida(motor.novaPartida(...))` e `:293` grava em `flashcards:partida`. Efeitos: (a) `iniciar_corrida_flashcards` é chamado toda vez que alguém entra só na Biblioteca sem partida viva (lixo em `flashcards_corridas`); (b) a Entrada passa a mostrar "Continuar no andar 1" + "Começar do zero" (`Entrada.tsx:45,107`) para quem nunca lutou. A vida grátis não é gasta (parte 19 só consome em `autorizar_flashcard_cripta`), mas é confuso.
8. **`crypto.randomUUID()` sem fallback** — `Arena.tsx:966`: `chaves.current.get(p.rodada) ?? crypto.randomUUID()`. Em Safari < 15.4/WebView antigo lança TypeError dentro de `responder` e a resposta nunca é aplicada (`validando.current` fica `true` → jogo trava sem mensagem). `servidor.ts:29` tem `novaChave()` com fallback, mas a Arena não a usa.
9. **Recarregar no meio da partida**: a partida é salva a cada mudança (`Arena.tsx:293`), então reabre na fase certa. Porém `mostrado` nasce com `marcadas: null, resultado: null` (`Arena.tsx:229`): ao recarregar em `fase:'resposta'` o verso aparece sem marcar certa/errada e sem veredito. Recarregar em `recompensa/portas/loja` funciona.
10. **Acervo em cache mesmo em falha** — `dados/acervo.ts:19,35`: a promessa é guardada para sempre; se o fetch do índice falhar uma vez (rede ruim ao abrir), a sessão inteira joga com `BARALHO_DEMO` enquanto a tela de carga promete "Milhares de flashcards das provas reais" (`Arena.tsx:188`). Nenhum aviso ao usuário, nenhuma nova tentativa.
11. **Sincronização de progresso é last-write-wins por flashcard, mas só roda na abertura e no fim da partida/sessão** (`Arena.tsx:184,948`; `Estudo.tsx:287`). Fechar o jogo pelo X no meio não sincroniza. `recordes.partidas` não é incrementado na partida criada automaticamente na montagem (só em `novaPartida`, Arena.tsx:1013).
12. **Ranking por nível é código morto**: a página usa `lerRanking('masmorra')` (`ranking_flashcards`); `ranking_cripta`/`minha_posicao_cripta` da parte 18 não são chamados.

#### Áudio
13. **Buffers de música nunca são liberados** — `sons.ts:610 buffers = new Map` guarda cada faixa decodificada. Durações medidas (ffprobe): biblioteca 65 s, passeio 63 s, cripta 53 s, sala 46 s, masmorra 40 s… Decodificado a 48 kHz estéreo float32 ≈ 0,38 MB/s → biblioteca ≈ 25 MB; `preCarregarTrilha` (sons.ts:632) já puxa 5 faixas (~38 MB) e uma sessão longa pode passar de 150 MB só de áudio. Risco real de o Safari matar a aba no iPhone.
14. **Jingles ignoram o controle "Efeitos"** — `tocarJingle` (sons.ts:655) conecta em `saida`, não em `efeitos`; só o volume geral os afeta.
15. **`falhaSom='carregamento'` nunca volta a `null`** (sons.ts:625) — `estadoDoSom` fica "carregamento" para sempre após uma faixa falhar (hoje sem uso, mas é armadilha).
16. **Listeners globais de destrave nunca são removidos** (`instalarDestrave`, sons.ts:204-218): `pointerup/touchend/click/keydown` em captura na janela para o resto da vida do site, mesmo fora do jogo. Inofensivo em custo, mas o `AudioContext` permanece vivo (não suspenso) fora do jogo, consumindo bateria até a aba ser escondida.
17. iPhone: destrave por gesto, `audioSession='playback'` (sons.ts:175) e retomada em `visibilitychange/pageshow` estão corretos. Música para ao sair (Flashcards.tsx:22-23). OK.

#### Canvas / memória
18. `Palco.limpar()` (palco.ts:129) cancela o rAF, mas `linhas()` e `cacos()` agendam `setTimeout` (palco.ts:516, 592) que podem repovoar o canvas **depois** do `limpar`/unmount e religar o rAF num canvas desmontado (vive até as partículas morrerem). Falta um flag `destruido`.
19. `Cenario` repinta o diorama inteiro (3 desfoques + tilt + bloom + feixes) a cada mudança de `clima` (`Cenario.tsx:161` deps `[pedido, cena, clima]`): no Jardim o ciclo de céu (`INTERVALO_CEU` 120 s) força repintura periódica; aceitável, mas pesado em celular antigo.
20. `folhaDe` (Hud.tsx:9-27) gera `toDataURL` por personagem/variante e guarda num Map de módulo: nunca liberado, mas é pequeno. OK.

#### Acessibilidade / celular
21. `fc-arena--celular`/`fc-arena--deitado` são classes aplicadas (Arena.tsx:1131) com **zero regras** no CSS; o layout usa media queries. Classes mortas.
22. Alto contraste: só 7 regras; selos de superpoder (Arena.tsx:1215-1226) e `fc-intencao` não têm variante de contraste.
23. `Painel` do herói diz "Acerto fácil, moderado e difícil causam 10, 20 e 30" (Arena.tsx:1538) sem citar bônus de estágio/combo: ok como simplificação, mas o número real sai diferente.
24. Teclado: cobertura boa (1-4, Enter, P, Esc, foco preso em `ModalJogo`). `Recompensas` escuta teclas 1-3 sem checar modais abertos (Arena.tsx:1582-1586).

---

### UX

- **Entrada/tutorial.** Tutorial (Entrada.tsx:30) abre na primeira visita, mas ensina só o fluxo lembrar→conferir→avaliar da Biblioteca; a Batalha ganha uma frase ("observe a intenção do inimigo"). Ninguém explica vida, intenção, poderes/encaixes, portas, loja, Altar, veneno/chamas/grude antes de levar o primeiro golpe. A apresentação do adversário fecha sozinha em 2,6 s (Arena.tsx:1101).
- **Clareza das regras.** A intenção (Arena.tsx:1233-1238) é excelente. O que falta é a leitura inversa: "quanto EU vou causar se acertar" (10/20/30 + bônus). A placa esconde superpoderes no "+N" (:1229).
- **Tempo por flashcard.** Não há relógio nem pressão de tempo na Batalha nem no Estudo (só a névoa aos 30 s no Estudo, ClimaEstudo.tsx:27). Coerente com a filosofia; vale deixar explícito nos textos.
- **Curva de dificuldade × vida grátis.** A simulação do próprio teste (testar_flashcards.mjs) dá: 50 % de acerto → andar 2,1 e 13 flashcards; 60 % → 2,6 e 17; 70 % → 3,7 e 26; só com 90 % passa de 20 andares. Com a regra "uma vida por 24 h" (parte 19), um residente mediano joga 13-26 flashcards e acaba o dia. É a maior fonte de frustração que o Tales quer reduzir; a reordenação da jornada ajuda na escolha das perguntas, não na vida.
- **Perder.** Tela `Fim` (Arena.tsx:1650-1700) é boa: lista "os que te derrubaram", abre revisão no Estudo, link para a questão. Falta: dizer que a vida grátis acabou (o aviso só vem no próximo clique, :1403) e mostrar o recorde anterior × atual.
- **Sair.** X/Esc/clique fora → confirmação (:1418-1427) com texto certo ("fica salva neste aparelho"). Menu → "Voltar ao menu inicial" (:1445). OK. Porém a saída não sincroniza progresso (item 11).
- **Central (site).** Sóbria, clara, abas Central/Desempenho/Cronograma. Problemas: botão **"Jogar a Cripta"** (CentralFlashcards.tsx:102) viola a regra de nome fora do jogo; "Como funciona" fala só do Estudo; não há texto do que é o jogo nem da regra de vida grátis (decisão do Tales de não escrever, ok). O convite de opinião após 3 sessões está bem feito.
- **Desempenho (site).** Honesto ("nada é estimado para trás"), tabela por área, barras por dia. Falta: evolução do acerto no tempo e cruzamento com as questões (por decisão, separados).
- **Cronograma.** Só local (`flashcards:plano`), sem sincronizar com a conta; a meta de hoje ignora o limite grátis de 10 (pode propor 30 e o servidor cortar em 10).
- **Biblioteca (estudo passivo).** Rica (clima, gato, velas, estante, diário, estações). Pontos: (a) a sessão não é retomável (estado React; recarregar perde a sessão); (b) o rótulo "volta em 3 dias / 10 dias" (Estudo.tsx:386-388) é fixo e vale só para a 1ª revisão (escada 3→7→21 / 10→30→90 em `estado/revisao.ts:23-26`); (c) "Sabia" após "Hesitei" salta para `seguro[1]=30 dias` porque a sequência é compartilhada entre escadas; (d) nome inconsistente: "Biblioteca do Torneio" (Arena.tsx:1169), "Biblioteca de Flashcards" (Entrada.tsx:117), "Biblioteca de flashcards" (Estudo.tsx:150), "Biblioteca Ancestral" nos docs.
- **Duplo toque no "Virar"** (Estudo.tsx:228-237): `virar` é assíncrono e não tem trava em voo; dois toques rápidos chamam `autorizarFlashcard` duas vezes com chaves distintas → gasta 2 dos 10 flashcards grátis.

---

### Consistência com o site

- **Pop-up (App.tsx:229-240 + fundo.ts).** Funciona: a página de fundo continua renderizada, `lembrarFundo` guarda em `sessionStorage`, `sairDoJogo` usa `navegar(…, true)` para não deixar o jogo no histórico. Falhas: (a) sem conta, `barrado` mostra o `ExigeConta` inline, correto; (b) o fundo é a última página do site, mas se a pessoa entrar direto por link (`#/flashcards/cripta`) o fundo vira `/flashcards` (ok); (c) enquanto o chunk `FlashcardsJogo` carrega, mostra `EsperaPixel` sobre o site (App.tsx:273), mas o CSS do jogo chega junto do chunk → há um quadro sem estilo possível no primeiro paint (Flashcards.css importado em FlashcardsJogo.tsx:6).
- **Vazamento de CSS.** Escopo é bom: todos os seletores com prefixo `.fc-`; única regra global é `body.fc-modal-aberto …{visibility:hidden}` (Flashcards.css:1273-1275), intencional. Nenhum `:root`, `html`, `body` solto, nenhum `@font-face`. Mas: **208 `!important`**, 112 `@keyframes`, 82 `@media`, e o arquivo é uma sobreposição de "eras" (seções "Cripta do Residente 13/10", "Acabamento premium v4", "Movimento suave" etc., :827/:1038/:2383) que reescrevem as anteriores — daí os `!important`. `.fc-palco-efeitos` é `position:fixed !important; z-index:60` na janela toda (:410).
- **Nome "Cripta" fora do jogo**: `CentralFlashcards.tsx:102` ("Jogar a Cripta"); comentários/funções (`ParComCripta` em Inicio.tsx:510, `CartaoCripta`, `RankingCripta`, `AdminOpinioesFlashcards` ok). O título da aba e menus estão certos ("Torneio de Flashcards"). `formatos.ts:153` (admin) usa "batalha na Cripta" — aceitável (painel interno).
- Fontes: o jogo importa Cinzel/Alegreya em FlashcardsJogo.tsx:1-5 e a Central importa Cinzel 700 + Alegreya 400 de novo (CentralFlashcards.tsx:1-2) — a Central, página sóbria do site, usa tipografia do jogo (`cf-selo`, `cf-cabeca`): borra a fronteira "site sério / jogo".

---

### Código e performance

- **Arena.tsx (1701 linhas)** mistura: estado da partida, diretor de efeitos (`encenar`, :438-910, ~470 linhas de `switch` com 45 casos), coreografia de DOM (`animar`, `posar`, `investir`), teclado, salvamento, servidor, 6 modais inline (Painel, EscolherRota, Recompensas, Fim, Menu, Limite). Candidatos a extração: `encenar` → `efeitos/diretor.ts`; `Painel`/`EscolherRota`/`Recompensas`/`Fim` → arquivos próprios; persistência/corrida → `motor/sessao.ts`.
- **regras.ts (1336 linhas)**: puro e testado (153 asserts), boa separação motor/visual. Carrega `NIVEIS` e Torre só por compatibilidade. `montarSala` (:1180-1250) é conteúdo (textos) misturado a regra.
- **Pixel art em tempo de execução**: `personagens.ts` (825) + `bestas.ts` (503) + `pixel.ts` (230) desenham ~20 adversários por código a cada `folhaDe` (Hud.tsx:9); `pintura.ts` (1285) desenha cenas procedurais que não são mais usadas (todas pintadas offline). Custo real hoje: só o primeiro `toDataURL` por personagem (cache). Recomendação: assar o resto dos monstros (scripts/sprites já tem 21 geradores) e apagar `pintarCena`, deixando `pintura.ts` só com `criarAmbiente`/`climaDoAndar`/`pintarMesa`.
- **Assets** (`public/flashcards`, 26 MB): música 13 MB (33 arquivos, mp3+ogg; `floresta.*` órfão 780 KB), cenários 5,8 MB (176 PNG), sprites 1,6 MB (78), JSON do acervo ~4,3 MB (11 áreas, 4.312 flashcards, 3.865 de batalha; carregados **todos** na entrada, `acervo.ts:28`). `public/imagens` tem 138 MB (compartilhado com questões).
- **Lazy loading**: bom — `Flashcards` lazy no App, `FlashcardsJogo` lazy na Central (Flashcards.tsx:8).
- **`any`**: nenhum. **TODO/FIXME**: nenhum. Listeners add/remove balanceados exceto os globais intencionais de `sons.ts`.
- **Estilo de código**: arquivos recentes (hipnose.ts, vfxPorAndar.ts, audioArquivo.ts, numerosPixel.ts, AparenciaFlashcards.tsx, CortinaPixels.tsx, RankingCripta.tsx da página) estão "minificados à mão" (sem espaços, uma linha), destoando do resto. `selecao.ts:66-72` ignora `ctx.turma` (a Arena nunca passa `turma`, só `faixas`, Arena.tsx:97-107) — metade da lógica do grupo 2 é inalcançável.
- **Testes**: motor forte; zero testes para Arena/Estudo (interface) além do script Playwright manual `testar_flashcards_interface.mjs` fora do `npm test`.

---

### O que falta para acabar (ordem)

1. Corrigir nome "Jogar a Cripta" na Central e o texto da jornada no ranking do site (regra do Tales + doc vigente).
2. Fechar os bugs de risco: `randomUUID` sem fallback; duplo toque no Virar; partida/corrida criada ao abrir a Biblioteca; roubo do Mímico com escudo; acervo em cache após falha (aviso + retry).
3. Memória de áudio: limitar `buffers` (LRU de 3-4 faixas) e não pré-carregar 5 faixas no celular.
4. Arte que falta para o bestiário parecer um jogo acabado: raptor (3), dragão escarlate/ancestral, gosma sinovial, corvo, morcego, cavaleiro, espectro, quimera, mão, leviatã, rei, arconte, harpia, escaravelho (T decide estilo; pipeline existe).
5. Tutorial de verdade da Batalha (1 golem, 3 cartas, intenção, 1 poder, 1 porta), reaproveitando `motor` com baralho demo.
6. Contador da rota (ideia 80 real), selos de superpoder sempre visíveis, "quanto vou causar" na intenção.
7. Reload consistente (restaurar `marcadas` em `fase:'resposta'`) e sincronizar progresso ao sair pelo X.
8. Limpeza: remover Torre, NIVEIS/pesoDoFlashcard, RankingCripta componente, ranking por nível, floresta.*, `pintarCena`; corrigir docs (ROTEIRO, config.ts, PLANO 13/80).
9. Flashcards.css: consolidar eras, reduzir `!important`, remover classes `--celular/--deitado` mortas; Central sem fontes do jogo.
10. Medir FPS em iPhone/Android reais (ideia 70) e som (confirmado só pelo Tales, 78).
11. Decisão de produto sobre a vida grátis × curva (ex.: 2 vidas, ou vida só termina ao cair, ou Fácil não ranqueado para grátis).
12. Conquistas (36 e `conquistas.ts`) ligadas ao sistema do site com recordes do servidor.
13. Estágio/título no ranking (60).

---

### Brainstorm (10 ideias novas)

1. **Rota diária curta ("Plantão de 10")**: partida de 10 flashcards com chefe garantido no fim, pensada para a conta grátis; conta para o ranking semanal. (SQL: tipo de corrida.)
2. **Revanche do que te derrubou**: ao cair, botão "Revanche" que recomeça o andar com os mesmos 3 flashcards errados como primeiros do baralho (sem gastar vida: reaproveita a corrida). (SQL: regra na janela.)
3. **Mapa da descida**: tela de fim com a trilha de andares, chefes vencidos e onde cada flashcard foi errado (usa `derrubaram` + `vencidos`). Sem servidor.
4. **Ranking semanal por área** ("Mestres da Mão desta semana"): RPC com período + área da corrida. (SQL.)
5. **Modo Dueto/Turma**: semente compartilhada por link; a mesma masmorra, placar entre colegas (ideia 74 ampliada). (SQL: tabela de salas.)
6. **Cartão de "eu já vi isso"**: no verso, mostrar a sua resposta anterior à questão de origem ("você errou esta questão em 03/10") — liga `respondidas` ao flashcard. Sem servidor.
7. **Skins do herói por conquista** (Arcanista ao vencer 3 dragões etc.), sem vantagem (71). (T: arte.)
8. **Monstro da semana**: um adversário com bônus de cristais, com arte em destaque na Central. (T: arte; SQL opcional.)
9. **Modo "Preceptor"**: depois de errar, uma pergunta de segunda chance gerada do comentário (lacuna) antes de levar o dano cheio (dano ×0,5 se acertar). Só motor + fábrica de flashcards.
10. **Biblioteca sonora/clima por área**: cada área com paleta e trilha própria na Biblioteca, e selo "100 flashcards de Mão" (ideia 36 concreta). (T: música/arte.)

---

### Top 15 tarefas desta área (prioridade; tamanho P/M/G; paralelo?)

1. Trocar "Jogar a Cripta" por "Jogar o Torneio" (CentralFlashcards.tsx:102) e corrigir texto do ranking (RankingCripta.tsx:33) — **P**, paralelo.
2. `Arena.tsx:966`: usar `novaChave()` com fallback; e envolver `aplicar/responder` em try/catch com mensagem — **P**, paralelo.
3. Trava em voo no `virar` do Estudo (Estudo.tsx:228) — **P**, paralelo.
4. Não criar partida/corrida ao abrir só a Biblioteca (FlashcardsJogo.tsx:20 / Arena.tsx:225): criar sob demanda ao entrar em Batalha — **M**, paralelo.
5. LRU de buffers de música + pré-carga reduzida no celular (sons.ts:610,632) — **M**, paralelo.
6. Roubo do Mímico só quando o golpe acerta (regras.ts:841) + teste; poção com carga>1 (:832,:847) — **P**, paralelo.
7. Acervo: não cachear falha, mostrar "modo demonstração" e botão tentar de novo (acervo.ts:19-37, Arena.tsx:184) — **P**, paralelo.
8. Assar os monstros sem folha (raptor×3, dragões variantes, gosma sinovial, corvo, morcego, cavaleiro×3, espectro×3, quimera×3, mão, leviatã, rei×2, arconte, harpia, escaravelho) com `scripts/sprites` — **G**, (T) estilo, paralelo por família.
9. Tutorial jogável da Batalha com baralho demo (novo componente, reutiliza motor) — **M**, depende de 4 (não criar corrida).
10. Contador da rota (`rota.restam`) na placa/encaixe + superpoderes sempre visíveis + "seu golpe causa X" — **P/M**, paralelo.
11. Restaurar `marcadas/resultado` ao recarregar em `fase:'resposta'`; `sincronizarProgresso` no `fechar` — **P**, paralelo.
12. Remover Torre/NIVEIS/pesoDoFlashcard/RankingCripta componente/ranking por nível/`floresta.*`/`pintarCena`; atualizar config.ts:55, ROTEIRO.md, PLANO 13/80 — **M**, depois de 2-7 (evita conflitos).
13. Decidir e implementar política da vida grátis × curva (simulação já existe no teste) — **M**, (SQL se mudar a janela), depende de decisão do Tales.
14. Consolidar Flashcards.css (eras, 208 `!important`, classes mortas) e tirar fontes do jogo da Central — **G**, sozinho (toca tudo).
15. Medição em aparelho real (FPS no crítico, memória, som) e Playwright de interface no `npm test` — **M**, (T) aparelho, paralelo.


---

# Anexo G · Arquitetura, conta, sincronização e performance (relatório completo)

## Auditoria de arquitetura front-end · OrtoQuestões (somente leitura)

Repositório: `/home/user/ortoquestoes`. Build existente em `dist/` (gerado 15/10/2026 09:32), medido diretamente. Nenhum arquivo foi editado.

---

### 1. Mapa da arquitetura

#### 1.1 Fluxo de dados

```
[Python: scripts/importar_pdf.py → public/acervo/temas/<tema>.json  (8,0 MB, 11 temas)]
[Python: scripts/aplicar_comentarios.py → public/acervo/comentarios/<tema>.json (18 MB)]
[Python: scripts/gerar_indice.py → public/acervo/indice.json (1,57 MB bruto / 47–55 KB gz) + busca.json (2,16 MB / 531 KB gz)]
[scripts/validar_acervo.py: falha o CI se índice ≠ temas, gabarito inválido, imagem ausente, comentário contradiz gabarito]
                       │ npm run build
                       ▼
vite.config.ts:17-46 fatiarAcervo() → dist/acervo/q/<id>.json (6.947) e dist/acervo/c/<id>.json (6.933), 1–3 KB cada
vite.config.ts:55-110 preCargaPorRota() → <script> inline no index.html com mapa rota→chunks (modulepreload)
                       │
index.html:109 ─ fetch adiantado de acervo/indice.json (window.__indiceOrtoQuestoes), antes do JS
                       ▼
src/dados/acervo.ts:38-49 carregarIndice() [singleton `promessaIndice`] → aplicarEdicoesNoIndice (edições do painel via RPC pública edicoes_questoes)
src/dados/acervo.ts:106-129 carregarQuestoes(indice, ids): até 30 ids/tema → acervo/q/<id>.json; senão acervo/temas/<slug>.json (fallback)
src/dados/comentarios.ts:47-60 carregarComentario(slug,id): acervo/c/<id>.json → fallback comentarios/<slug>.json
src/dados/acervo.ts:313-447 filtrar/contar/montarSessao sobre ItemIndice (campos curtos t,s,p,a,d,img,an,c,…)
                       ▼
Páginas (src/paginas/*, 30 arquivos, todas lazy em src/App.tsx:74-104) ─ roteador hash src/util/rotas.ts:32-40
                       ▼ resposta
src/paginas/Sessao.tsx:405-423 aoResponder → usarLimiteDiario().autorizar (RPC autorizar_resposta) → só então responder()
src/estado/sessao.ts:152-160 registrarResposta → gravar('respondidas') em src/estado/armazenamento.ts:64-75
   chave = 'ortoquestoes:' + 'conta:<uid>:' + 'respondidas' (visitante: só memória / sessionStorage para 'sessao:atual')
   gravar() dispara CustomEvent 'ortoquestoes:dados' (EVENTO_DADOS)
                       ▼
src/conta/sincronizacao.ts:396-403 aoGravar → modeloSync.registrarAlteracoes (diff por item → fila `pendentes` com base/operacao UUID) → salvar em 'sincronia:v1'
src/conta/sincronizacao.ts:313-395 sincronizar(): (1) lê TODAS as linhas de progresso_usuario paginadas de 500; (2) aplicar(); (3) semearLocais(); (4) envia até 100 pendentes via RPC sincronizar_progresso; fallback upsert direto
                       ▼
Supabase: tabela progresso_usuario (supabase/migrations/202609120001_contas_e_progresso.sql:3-24) com RLS por auth.uid(); RPC com advisory lock por usuário e checagem de versão (linhas 40-78)
```

**Premium / limite diário**
- `src/estado/limiteDiario.ts:351-388`: `autorizar()` chama RPC `autorizar_resposta` com UUID de idempotência; prazo 12 s; falha técnica → `permitido:false, falhaValidacao:true` (fail-closed). Travado por `VITE_LIMITES_HABILITADOS` (linha 7). O cliente só guarda `limite:saldo`/`limite:bloqueio` para UI.
- Servidor decide: `supabase/migrations/202610110100_limite_janela_24h.sql:33-108` — `for update` na janela (linha 82), idempotência (linha 92), consome só após checar (linhas 97-106). `grant execute … to authenticated` (linha 110). **Confirmado: não é burlável no cliente**; o pior que um cliente adulterado faz é gravar respostas localmente sem contar no servidor, e elas nem sobem (o progresso não vale nada para o limite).
- `src/conta/premium.ts:324-331` e `src/conta/plano.ts:291-302`: cache por conta em localStorage, só para UI; cada RPC paga reconfere.

**Sessão de login**
- `src/conta/supabase.ts:191-217`: cliente "enxuto" (AuthClient + PostgrestClient), PKCE, `autoRefreshToken`, `storageKey: 'sb-ortoquestoes-auth'`, fetch com prazo 20 s.
- `src/conta/ContextoConta.tsx:38-106`: um único `onAuthStateChange`; troca de usuário para o sync anterior (linha 75) e redefine `usuario` do armazenamento (77). `<div key={uid}>` (linha 147) remonta a árvore inteira ao trocar de conta.
- `src/servicos/supabase.ts:14-32`: token espelhado em `tokenConta` (evita a trava do `getSession()`), 401 → relê sessão uma vez (linha 67).
- `src/conta/aparelho.ts:91-152`: "um aparelho por vez" via RPC `sinal_aparelho` a cada 60 s; perde → `signOut({scope:'local'})` (ContextoConta.tsx:132).

#### 1.2 Pontos únicos de falha
1. **`public/acervo/indice.json`**: se falhar, `carregarIndice()` devolve `INDICE_VAZIO` silenciosamente (acervo.ts:42-46) — site "sem questões" sem aviso em produção.
2. **`src/estado/armazenamento.ts`**: tudo (respostas, fila de sync, premium, feitos) passa por um Map + localStorage; cota estourada cai em memória sem avisar (linha 73).
3. **RPC `sincronizar_progresso`**: fila inteira depende dela; o fallback (sincronizacao.ts:257-259) troca segurança por disponibilidade (ver 2.1).
4. **GitHub Pages + base `./`**: `dist/` de 261 MB (acervo fatiado + imagens); um deploy falho deixa chunks antigos 404 → `ErroDePagina` recarrega uma vez (ErroDePagina.tsx:12-21).
5. **Chave publicável e URL do projeto hard-coded** (supabase.ts:9-10) como fallback: troca de projeto Supabase exige deploy.
6. **`sw.js` `VERSAO='oq-v1'` fixa**: nunca invalida entradas de `acervo/` e `imagens/` antigas exceto por rede-primeiro; ok, mas não há limite de tamanho do cache.

---

### 2. Bugs e riscos (com caminho:linha)

#### 2.1 Sincronização
- **[ALTO] Fallback de upsert direto anula a detecção de conflito.** `src/conta/sincronizacao.ts:255-260`: se a RPC falhar (qualquer erro, inclusive "Versão inicial inválida"/conflito lógico lançado pela própria RPC em `202609120001:64`), o cliente faz `from('progresso_usuario').upsert(...)` sem `base`/versão. A RLS permite update das próprias linhas (`202609120001:33-37`), logo o fallback faz last-write-wins silencioso — exatamente o que o modelo de versões queria impedir. O mesmo em `sincronizacao.ts:331-335` (marcador de reinício).
- **[ALTO] Leitura completa do progresso a cada 5 segundos.** `sincronizacao.ts:416` `setInterval(aoVoltar, 5000)` → `sincronizar()` → `while` em `:352-362` lê **todas** as linhas da conta (`range(pagina, pagina+499)`, sem `.gt('versao', cursor)`). `estado.cursor` é calculado (`:358`) e salvo, mas nunca usado numa consulta. Um usuário com 3.000 respostas puxa ~6 páginas (~400–500 KB JSON) a cada 5 s com a aba visível, em todas as abas abertas. Custo de egress Supabase e bateria. O comentário em `:344-347` justifica (versão global entre tipos), mas isso se resolve com cursor por tipo ou um `gt(cursor - margem)`.
- **[MÉDIO] Duas abas com estado em memória distinto.** Cada aba tem sua cópia de `estado` (`:237`) e grava `sincronia:v1` inteira em `salvar()` (`:242`). A aba B recarrega no evento `storage` (`:405-408`), mas se A e B registrarem alterações no mesmo intervalo de 1,2 s (`agendar`, `:311`), a última `salvar()` apaga pendentes da outra. O `usarArmazenado` sincroniza *valores* entre abas, mas não a fila.
- **[MÉDIO] Troca de conta no mesmo aparelho.** `ContextoConta.tsx:74-78` troca `usuario` e para o sync; `definirUsuarioLocal(null)` (armazenamento.ts:20-34) apaga chaves de visitante mas preserva `conta:<id>:*` de outras contas — correto. Porém `semearLocais()` (`sincronizacao.ts:295-307`) enfileira qualquer item local sem versão: se um backup de outra conta foi importado (`restaurarBackup`), ele é enviado para a conta logada. Comportamento esperado para "restaurar", mas sem confirmação de "esta é a mesma pessoa".
- **[MÉDIO] Reinício do progresso em dois aparelhos.** `aplicar()` (`:265-270`) limpa tudo se o marcador remoto > `estado.reinicio`. Um aparelho offline que respondeu depois do reinício perde respostas com prefixo da geração antiga (`:284`, itens sem `r<N>:` são ignorados). Documentado no comentário, mas a pessoa não é avisada.
- **[BAIXO] `resolverConflito` para 'respondidas' usa `q` (timestamp local)** (`modeloSync.ts:536-542`): relógio errado num aparelho decide o conflito.
- **[BAIXO] `deItens('historico')` corta em 50** (`modeloSync.ts:490`): sessões além das 50 mais recentes ficam no servidor mas são descartadas localmente a cada `aplicar`; o diff seguinte pode gerar `valor:null` (tombstone) para elas? Não: `registrarAlteracoes` só roda em `origem:'local'`. OK, mas o corte local cria divergência permanente entre aparelhos sem explicação.

#### 2.2 localStorage
- **[MÉDIO] Cota estourada é silenciosa.** `armazenamento.ts:73` `catch { memoria.set(...) }`: a resposta "existe" até o F5 e some. Nenhum aviso ao usuário, nenhum `QuotaExceededError` distinguido. Com `respondidas` como um único JSON (6.947 questões × ~200 B ≈ 1,4 MB) + `sincronia:v1` com `versoes` para cada item, o iOS Safari (≈5 MB) está ao alcance.
- **[MÉDIO] JSON corrompido = padrão silencioso.** `lerCompleta` (`:48-57`) devolve `padrao` em qualquer erro; um `respondidas` corrompido vira `{}` e, na próxima resposta, `gravar` sobrescreve o bruto — e `registrarAlteracoes` só vê a diferença do novo item (antes = `{}`), então nada é apagado no servidor. Recuperação boa, mas o usuário vê "zero respondidas" até o sync baixar tudo.
- **[BAIXO] `exportarDados`/`importarDados` (`armazenamento.ts:104-124`) são código morto** (só `tamanhoArmazenado`/`lerVisitante` são usados fora do módulo) e, se usados, `exportarDados` faz `JSON.parse` sem try (`:111`) e exporta chaves `conta:<outro-uid>:*` que `importarDados` regrava como `conta:<eu>:conta:<outro>:...`. `lerVisitante` (`:63`) sempre devolve `padrao` (placeholder).
- **Chaves sem prefixo/versão**: fora do prefixo `ortoquestoes:` há `oq-aparelho`, `oq-aparelho-conta`, `oq-ultimo-email` (aparelho.ts:15-17,157), `oq-cookies` (consentimento.ts:14), `oq-origem` (origem.ts:16), `oq-recarregou-versao` (ErroDePagina.tsx:3), `sb-ortoquestoes-auth` (supabase.ts:45), e com prefixo mas fora do helper: `ortoquestoes:google-pedido` (google.ts:20), `ortoquestoes:convite-recebido/usado` (indicacao.ts:59-60). 40 chamadas diretas a `localStorage.*Item` fora de `armazenamento.ts` em 15 arquivos. Só `sincronia:v1`, `confirmacao-pendente:v1`, `oq-cookies.versao` e o backup (`versao:1`) têm versão. Não há módulo de migração de formato; compatibilidade é feita ad hoc (`limiteDiario.ts:17-19`, `revisao.ts:1`).
- **iOS**: dados do site não visitado em 7 dias podem ser apagados (ITP); mitigado só pela nuvem para quem tem conta. Visitante: só memória, por design (`armazenamento.ts:9-17`).

#### 2.3 Sessão e token
- **Refresh**: `autoRefreshToken:true` (supabase.ts:43) sem `lock` — a nota em `:40-42` explica. `servicos/supabase.ts:29-32` usa token em cache com margem de 30 s e tenta uma vez após 401 (`:67`). Correto.
- **[MÉDIO] `getSession()` travado → erro enganoso.** `servicos/supabase.ts:22-27`: se o `getSession` passar de 4 s, devolve `null` e `chamarRpc` lança "Entre na sua conta para continuar." (`:58`) para alguém logado. Aparece como mensagem de limite na tela de resposta (`limiteDiario.ts:383` usa `erro.message` como `motivo`).
- **Sessão expirada no meio da resposta**: `aoResponder` (Sessao.tsx:405-423) aguarda `autorizar`; `falhaValidacao` mantém a resposta não registrada e abre o painel (`:418`). Não há perda; a pessoa precisa clicar de novo. Com `LIMITES_HABILITADOS=false` nada disso roda (`limiteDiario.ts:356`).

#### 2.4 Segredos, CORS
- Bundle só carrega `sb_publishable_…` e URL (`src/conta/supabase.ts:9-12`, validado em `:12`). `VITE_SUPABASE_ANON_KEY` é passada no workflow (`publicar.yml:60`) mas não é lida em código — variável morta. Pixel do Meta hard-coded (`consentimento.ts:18`), público por natureza.
- 177 funções `security definer`, 0 `security invoker`; 160 com `search_path = ''`, **17 com `search_path = public, pg_temp`** (inclusive `autorizar_resposta`, `202610110100:35`). Aceitável, mas inconsistente.
- 9 RPCs com `grant … to anon` (ranking público, prévia de convite, aviso do site, `edicoes_questoes`, `obter_acesso_premium`, `obter_simulado_nacional`, `previa_liga`): revisar se `obter_acesso_premium` precisa mesmo de `anon`.
- CORS das Edge Functions (`supabase/functions/_shared/http.ts:4-14`): origem fixa `APP_ORIGIN`, localhost só em ambiente de teste. Não responde `Access-Control-Allow-Methods`; funciona porque o navegador aceita o default para POST simples com preflight? Não — preflight com `authorization` exige resposta ao OPTIONS; está nos handlers individuais (fora do escopo, não conferido).

#### 2.5 Erros silenciosos, efeitos, listeners, tipos
- **68 catches silenciosos** (`.catch(() => undefined)`, `catch { /* … */ }`) no `src`. Os críticos: `armazenamento.ts:73` (cota), `acervo.ts:42-46` (índice vazio), `comentarios.ts:36` (arquivo ausente vira `{}`), `feitos.ts:523`, `premium.ts:329`, `administrador.ts:375`. Nenhum relato centralizado — sem telemetria (grep `sentry|onerror|unhandledrejection|web-vitals` = 0 ocorrências; só 4 `console.error/warn`).
- **Listeners sem cleanup (intencionais, módulo)**: `instalacao.ts:21-27`, `consentimento.ts:464` (um `hashchange` por `iniciarPixel`, protegido por `iniciado`), `servicos/supabase.ts:17` (`onAuthStateChange` nunca desinscrito). Dentro de hooks, todos os efeitos lidos têm cleanup (`rotas.ts:34-38`, `usarArmazenado.ts:190-205`, `usarDeslizar.ts:359-364`, `aparelho.ts:144-151`, `sincronizacao.ts:446-450`). OK.
- **`useState` lazy com `ler()` + efeito re-lendo**: `usarArmazenado.ts:176,193,198` faz `JSON.parse` do `respondidas` inteiro (até ~1,4 MB) em cada `EVENTO_DADOS` daquela chave e em cada componente inscrito — em uma sessão com `vigiarFilaZerada` (App.tsx:273 → feitos.ts:589-604, percorre todas as respondidas a cada resposta) isso é O(n) por resposta por assinante do hook.
- Tipos: **0 `any`**, 4 `!` não-nulos (Arena.tsx:545,554; CronogramaPainel.tsx:57; CartaoQuestao.tsx:787), 10 `as unknown as` (listados; os de `componentes/admin/formatos.ts:127-128` `null as unknown as number` são mentira de tipo), `as Documento[]`/`as Record<…>` em `sincronizacao.ts:256,259,326` sem validação de forma do que vem do servidor. 19 `eslint-disable-next-line react-hooks/exhaustive-deps` sem ESLint instalado (ficam como documentação).
- `ContextoConta.tsx:66` `retorno.tokens!` — garantido pela condição da linha 55, ok.
- `rotas.ts:23` `decodeURIComponent` sem try: `#/questao/%E0` lança `URIError` fora de qualquer boundary (em `useState(lerHash)`) → tela branca. Único ponto de pânico encontrado no roteador.

---

### 3. Performance (medido em `dist/`)

#### 3.1 Chunks (bruto / gzip)
| Chunk | bruto | gzip |
|---|---|---|
| FlashcardsJogo.js | 413 KB | 132 KB |
| FlashcardsJogo.css | 239 KB | 46 KB |
| AdminAssinaturas.js | 196 KB | 56 KB |
| **index.js (entrada)** | 191 KB | **63 KB** |
| **react.js** | 142 KB | **45 KB** |
| **supabase.js** | 122 KB | **30 KB** |
| **index.css** | 157 KB | **29 KB** |
| PlanoEstudo.js | 88 KB | 27 KB |
| Termos.js | 71 KB | 21 KB |
| Flashcards.js | 70 KB | 23 KB |
| Inicio.js + css | 43+38 KB | 14+7 KB |
Total `dist/assets`: 1,8 MB JS + 804 KB CSS + 160 KB fontes (15 arquivos woff/woff2).

**Caminho crítico da capa (gzip)**: index.html 15 KB + index.js 63 + react 45 + supabase 30 (modulepreload no HTML) + index.css 29 + Inicio 14 + 7 + indice.json 47–55 ≈ **250 KB**. Bom para o tipo de app. O README (`README.md:21`) diz "~63 kB" — é só o `index.js`; o real é ~167 KB de JS inicial.
- `supabase` entra no chunk inicial porque `ContextoConta` é importado em `main.tsx:1`; para visitante é peso morto de 30 KB gz.
- `index.css` de 29 KB gz é `base.css`(64 KB)+`premium.css`(64 KB)+`recursos.css`(39 KB)+`temporada.css`(17 KB)+`tokens.css` — `premium.css` e `temporada.css` entram em toda visita (`main.tsx:10-15`), contrariando o comentário da linha 6-8.
- `Termos.js` 71 KB bruto é texto em JSX; poderia ser Markdown/JSON carregado como asset.

#### 3.2 Lazy / pré-carga
- Todas as páginas são `lazy` (`App.tsx:74-104`). Pré-carga por rota injetada no HTML (`vite.config.ts:55-110`), 10 rotas mapeadas; pré-busca ociosa de Treinar/Sessao/Resumo (`main.tsx:40-53`), respeitando `saveData`. Bom.
- `manualChunks` só separa react e supabase (`vite.config.ts:139-142`); o resto é automático e gerou ~13 chunks pequenos compartilhados (ver mapa no `dist/index.html`).

#### 3.3 Acervo
- Fatiado em build (6.947 `q/` + 6.933 `c/`), `dist/` = **261 MB**, upload de ~14 k arquivos por deploy. Funciona, mas o `upload-pages-artifact` cresce com o acervo.
- `indice.json` 1,57 MB bruto → `JSON.parse` de 1,5 MB no celular (~15–40 ms) a cada visita (cache `no-cache`, revalidação). `busca.json` 531 KB gz só sob demanda (`acervo.ts:490-497`). `resumao.json` 134 KB.
- 11 temas em `temas/` (8 MB) ainda baixados inteiros quando >30 ids do mesmo tema (`acervo.ts:81`) — uma sessão de 40 questões de Trauma puxa o tema inteiro.

#### 3.4 Imagens
- `public/imagens`: **138 MB, 885 arquivos: 666 JPEG, 218 PNG, 0 WebP/AVIF**. 47 arquivos > 500 KB; os 10 maiores são PNG de 1,3–3,0 MB (`public/imagens/mao/usp-sp-2025-*.png`). Dimensões amostradas de 304×273 até 1629×966. 852/884 imagens têm `largura/altura` no JSON (evita CLS); `FiguraAmpliavel.tsx:30` usa `loading="lazy"` + width/height, sem `srcset`/`decoding="async"`. 0 imagens órfãs. Além disso `public/flashcards` 26 MB, `amostras` 3,8 MB, `arquivos` 3,9 MB.

#### 3.5 Fontes
- `@fontsource` importado por **peso/subset** (`latin-400.css` etc., 20 imports listados), não o pacote inteiro. `jersey-10` entra no inicial (`main.tsx:9`). Plus Jakarta Sans local (`tokens.css:3`). Sem Google Fonts. Bom. Sem `font-display` conferido (fontsource usa `swap`).

#### 3.6 PWA / SW
- `manifest.webmanifest` completo (ícones maskable, shortcuts). `public/sw.js`: rede-primeiro para navegação/acervo/imagens, cache-primeiro para `assets/` — **offline real parcial**: só o que já foi visitado. Sem pré-cache do shell, sem limite/expiração de cache, `VERSAO` fixa. Registrado só em PROD (`instalacao.ts:63-68`).

#### 3.7 Core Web Vitals (estimativa)
- **LCP**: texto da `.pre-carga` (index.html:155-182) aparece antes do JS; depois hidrata. Bom em 4G (~1,5–2,5 s). 
- **CLS**: baixo (dimensões nas imagens; fallback de tema antes da pintura, index.html:92-108).
- **INP**: risco nos filtros do Treinar (`contar()` roda `aplicaUm` até 7× por item × 6.947 itens a cada tecla, `acervo.ts:353-401`) e no `usarArmazenado` com `respondidas` grande. Mitigado por `termosDeBusca` com cache (acervo.ts:200-206).

---

### 4. Qualidade de código e ferramental

- **tsconfig** (`tsconfig.json`): `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` — bom. Faltam `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. `include: ["src"]` — `vite.config.ts`, `fixtures/*.mjs`, `supabase/functions/*.ts` ficam fora do typecheck.
- **Sem ESLint, Prettier, stylelint** (nenhum arquivo de config; 19 comentários `eslint-disable` órfãos).
- **Testes**: `npm test` = 17 scripts ad hoc (Python + Node com `esbuild` **transitivo**, não declarado em devDependencies — `node_modules/esbuild@0.21.5` vem do vite; se o vite subir para esbuild 0.2x os fixtures quebram sem aviso). Cobrem lógica pura: motor de flashcards (619 linhas), cronograma, revisão espaçada (`testar_revisao.mjs`), reinício do progresso (`testar_reinicio.mjs` — testa `modeloSync`), detecção de figura, "paywall" (`testar_paywall.py` = **288 linhas de asserts textuais sobre o conteúdo dos arquivos**, ex.: `SQL = read_text()` + `assert 'x' in SQL` — frágil, não executa nada). **Não há teste de componente nem de `sincronizacao.ts`, `armazenamento.ts`, `rotas.ts`, `acervo.ts` (filtrar/contar/montarSessao)**. `fixtures/verificacao.mjs` (Playwright, 72 asserts em 20 cenários, inclusive 320 px, tema escuro, sem localStorage) e `testar_flashcards_interface.mjs` **não rodam no CI**. `testar_conquistas.mjs` e `testar_importacao_anuladas.py` também não estão em `npm test`. `supabase/tests/paywall.sql` e `ranking.sql` exigem banco e não rodam.
- **CI**: `verificar-pr.yml` roda typecheck + test + validar + build + `git diff --check`; `publicar.yml` roda test + 3 fixtures + validar + gera incidência/resumão/SEO + build (`tsc -b` cobre typecheck). Publica também da branch `claude/pdfs-questoes-tp64dr` (`publicar.yml:8`). Sem lint, sem e2e, sem Lighthouse, sem dependabot (`.github/` só tem `workflows`).
- **Convenções**: português consistente, nomes claros. Pastas por tipo técnico (`paginas/`, `componentes/` com 63 arquivos planos, `conta/`, `estado/`, `dados/`, `util/`, `servicos/`) + um domínio (`flashcards/`). `conta/` mistura infraestrutura (supabase.ts) com regras (indicacao, premium).
- **Arquivos gigantes**: `flashcards/componentes/Arena.tsx` 118 KB, `flashcards/efeitos/pintura.ts` 86 KB, `flashcards/motor/regras.ts` 77 KB, `paginas/Termos.tsx` 69 KB, `paginas/PlanoEstudo.tsx` 58 KB, `estado/conquistas.ts` 55 KB, `paginas/Conta.tsx` 52 KB, `componentes/CartaoQuestao.tsx` 43 KB; `estilos/paginas/Flashcards.css` 256 KB. Total `src`: 41.414 linhas.
- **Estado global mutável**: 50 `let` de módulo (lista completa obtida), padrão "cache por conta" repetido em `plano.ts:27`, `premium.ts:19-20`, `administrador.ts:4`, `feitos.ts:37,80`, `indicacao.ts:27`, `google.ts:22` — mesma ideia implementada 6 vezes de forma ligeiramente diferente (duplicação).
- **Código morto (amostra de 400 exports)**: `exportarDados`, `importarDados` (armazenamento.ts:104,118), `AVISO_BETA`, `AVISO_LIMITE_FLASHCARDS`, `CHAVE_NIVEL`, `CartaoQuestaoDoDia`, `CartaoStreak`, `FasesCronograma`, `GRUPOS_DA_JORNADA`, `MarcaEmpilhada`, `PortaoPremium`, `SeletorMultiplo` (componentes inteiros sem uso). `VITE_SUPABASE_ANON_KEY` no workflow sem leitura no código.
- **Duplicação**: dois `buscarComPrazo` (conta/supabase.ts:19-26 e servicos/supabase.ts:35-43); dois formatos de backup (`armazenamento.ts:104-124` vs `estado/backup.ts`); `VERSAO_TERMOS` em `estado/termos.ts:4` ('2026-09-15') **e** `conta/termos.ts:6` ('2026-10-06') — dois valores diferentes com o mesmo nome. README desatualizado (`README.md:35` URL `/ortoquestoes/`, `README.md:41-48` BASE padrão).

---

### 5. Proposta de modernização (sem reescrever)

**Adotar**
1. ESLint flat config + `typescript-eslint` (recommended-type-checked) + `react-hooks` + `jsx-a11y`; começar em modo `warn`, promover a `error` por regra. Resolve os 19 disables órfãos de verdade.
2. Prettier (ou `@biomejs/biome` para lint+format num binário só — menos ferramental, mais rápido; decisão de gosto).
3. `vitest` + `@testing-library/react` + `happy-dom`: migrar os fixtures `.mjs` (já são `assert` puro) para `*.test.ts` com `vi.mock` — elimina a dependência oculta em esbuild. Primeiros alvos: `modeloSync.ts`, `sincronizacao.ts` (com Supabase falso), `armazenamento.ts` (cota, JSON corrompido, troca de usuário), `rotas.ts`, `acervo.ts` (filtrar/contar/montarSessao), `CartaoQuestao`, `ExigeConta`, `ErroDePagina`.
4. Playwright como projeto (`playwright.config.ts`), `fixtures/verificacao.mjs` convertido em specs, rodando em `verificar-pr.yml` contra `vite preview` com Supabase desligado (`VITE_SUPABASE_URL=sem` já é suportado).
5. `knip` para exports/arquivos/dependências mortas; `rollup-plugin-visualizer` em `npm run build -- --analyze`; `stylelint` com `stylelint-config-standard` (CSS de 800 KB sem lint).
6. `@lhci/cli` (Lighthouse CI) com orçamento: JS inicial ≤ 180 KB gz, LCP ≤ 2,5 s em "mobile slow 4G".

**Estrutura**
- Não migrar para `features/` de uma vez. Criar `src/infra/` (supabase cliente, armazenamento, rotas, rpc) e mover `conta/supabase.ts`, `servicos/supabase.ts`, `estado/armazenamento.ts`, `util/rotas.ts` para lá; depois agrupar `conta/{indicacao,premium,plano,feitos}` como `features/conta`. `flashcards/` já é o modelo. `componentes/` (63) dividir em `ui/` (Icone, JanelaCentral, Estados…) e por domínio.
- Hook único `usarRpcPorConta(nome, chave)` substitui os 6 caches de módulo repetidos.
- `Termos.tsx`: texto para `public/termos.md` ou JSON.

**Estado**: manter Contexto + `usarArmazenado`. Zustand/jotai só se o custo do `usarArmazenado` com `respondidas` grande ficar visível; antes disso, basta memorizar o parse (um Map de valores já parseados em `armazenamento.ts`, invalidado em `gravar`).

**Roteador**: **manter hash**. Justificativa real: GitHub Pages sem 404 rewrite, base `./` funcionando em dois domínios (vite.config.ts:116-128), SEO já resolvido por páginas estáticas (`gerar_paginas_seo.py`). Trocar para history exigiria servidor ou `404.html` com redirect e quebraria todos os links já divulgados (`#/questao/<id>`, `#/convite/<código>`). Pequena melhoria: `try/catch` no `decodeURIComponent` (rotas.ts:23).

**Plano por etapas (risco)**
1. Semana 1 — lint/format/knip/analyzer + `esbuild` em devDependencies + `try` em rotas.ts:23 (risco baixo, sem mudança funcional).
2. Semana 2 — vitest; portar fixtures; testes de `modeloSync`/`sincronizacao` com cliente falso; corrigir **fallback upsert** (remover ou condicionar a `status 404` da RPC) e **cursor na leitura** (risco médio: toca na sincronização; cobrir com testes antes).
3. Semana 3 — Playwright no CI; Lighthouse CI com orçamento (risco baixo).
4. Semana 4 — imagens: WebP + redimensionamento máx. 1600 px via script Python (há `otimizar_png.py`), `srcset` em `FiguraAmpliavel`; `premium.css`/`temporada.css` saem do inicial (risco baixo, visual).
5. Semana 5+ — reorganização `infra/` e hook único de cache (risco médio, só movimentação).

---

### 6. Brainstorm técnico (10 ideias)

1. **Offline real**: pré-cachear shell + `indice.json` + `q/` e `c/` da fila "Revisar hoje" no SW (Workbox ou manual), com versão do cache = hash do build. *Cliente apenas.*
2. **Pré-busca da próxima questão**: em `Sessao.tsx`, `carregarQuestoes(indice,[ids[pos+1]])` + `carregarComentario` ao renderizar a atual; `<link rel=prefetch>` da imagem. *Cliente.*
3. **Imagens responsivas**: pipeline Python gera `-640.webp`/`-1280.webp`; `srcset`+`sizes` em `FiguraAmpliavel`; manter original para zoom. *Cliente + script; decisão do Tales sobre qualidade.*
4. **Sync incremental por cursor** + canal `storage` para eleger uma aba líder (Web Locks `navigator.locks.request('sync')`) — uma aba sincroniza, as outras só leem. *Cliente.*
5. **Telemetria de erros** mínima: `window.onerror`/`unhandledrejection` → RPC `registrar_erro(mensagem, rota, versao)` com rate limit; painel admin lista. *Exige SQL (tabela + RPC + RLS) e decisão do Tales (privacidade/Termos).*
6. **Web Vitals no admin**: `web-vitals` lib → RPC `registrar_vital(nome, valor, rota)` amostrado 10 %; gráfico no painel. *Exige SQL + decisão (coleta).*
7. **Feature flags no servidor**: tabela `flags` lida pela RPC pública `obter_aviso_site` já existente (estender) — substitui `VITE_FLASHCARDS_*` e evita deploy para ligar/desligar. *Exige SQL; decisão do Tales.*
8. **Aviso de cota/armazenamento**: detectar `QuotaExceededError` em `gravar`, mostrar faixa "progresso só na nuvem", e `navigator.storage.persist()` ao logar. *Cliente.*
9. **Índice fatiado por área**: `indice-base.json`/`indice-mao.json` (hoje 1,57 MB bruto para todo mundo); ou formato colunar (arrays paralelos) para cortar o parse pela metade. *Script Python + cliente.*
10. **Validação de forma em runtime** nas respostas de RPC críticas (`autorizar_resposta`, `sincronizar_progresso`, `obter_acesso_premium`) com `valibot`/`zod` mini (≈3 KB) — hoje são `as T` cegos. *Cliente.*
Extra: **`npm run build` com `--sourcemap` oculto** publicado só para o admin (facilita ler stack de erro da ideia 5).

---

### Top 15 tarefas desta área (prioridade decrescente)

| # | Tarefa | Tam. | Paralelo? |
|---|---|---|---|
| 1 | Remover/condicionar o fallback de upsert direto em `sincronizacao.ts:257-260,332` (só quando a RPC não existe: 404), preservando a checagem de versão | P | sim |
| 2 | Leitura incremental com cursor (`gt('versao', cursor)` + reconciliação completa só no primeiro sync/ao voltar do offline) em `sincronizacao.ts:352-362`; reduzir intervalo de 5 s para 30–60 s | M | depende de 6 |
| 3 | Aviso de cota e `QuotaExceededError` em `armazenamento.ts:73`; `navigator.storage.persist()` | P | sim |
| 4 | `try/catch` em `rotas.ts:23` (`decodeURIComponent`) → rota `NaoEncontrada` | P | sim |
| 5 | Declarar `esbuild` em devDependencies (ou migrar fixtures para vitest) | P | sim |
| 6 | vitest + testes de `modeloSync`, `sincronizacao` (cliente falso: conflito, duas abas, reinício), `armazenamento` (cota, JSON ruim, troca de conta), `rotas`, `acervo` | G | sim |
| 7 | ESLint flat (ts-eslint + react-hooks + jsx-a11y) + Prettier/Biome; corrigir os 19 `exhaustive-deps` reais | M | sim |
| 8 | Playwright (`verificacao.mjs` → specs) rodando em `verificar-pr.yml` com Supabase desligado | M | sim |
| 9 | Imagens: converter 47 arquivos >500 KB para WebP ≤1600 px (script), `srcset` em `FiguraAmpliavel.tsx:30` | M | sim (decisão de qualidade) |
| 10 | Tirar `premium.css` e `temporada.css` do chunk inicial (`main.tsx:12,14`); mover `supabase` para fora do inicial via import dinâmico em `ContextoConta` quando `contasDisponiveis` | M | sim |
| 11 | knip: apagar `exportarDados/importarDados/lerVisitante`, 10 componentes/consts mortos listados, `VITE_SUPABASE_ANON_KEY` do workflow; unificar `VERSAO_TERMOS` duplicada (`estado/termos.ts:4` vs `conta/termos.ts:6`) | P | sim |
| 12 | Hook único de cache por conta substituindo `plano/premium/administrador/feitos/indicacao/google` | M | depois de 6 |
| 13 | Validar forma das respostas de RPC críticas (zod/valibot) em `limiteDiario.ts:362-371`, `sincronizacao.ts:256,259` | M | sim |
| 14 | Centralizar as 40 chamadas diretas a `localStorage` num módulo `infra/chaves.ts` com nome, prefixo e versão por chave | M | sim |
| 15 | SW com pré-cache do shell + fila de revisão + versão por build; Lighthouse CI com orçamento | G | sim (depois de 10) |
