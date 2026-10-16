> **16/10/2026 — Easter eggs e encontros:** [PR #326](https://github.com/talesrobertosn/ortoquestoes/pull/326), implementação em `codex/easter-eggs-eventos-20261016`, base atualizada `b1521885`. Ver [gatilhos, decisões, testes e passagem](../EASTER-EGGS-E-EVENTOS.md). Publicação autorizada por Tales; nenhuma mudança médica ou SQL. Questões comuns podem receber visitas; provas continuam bloqueadas.

# Como continuar a Cripta (para qualquer agente: Claude Code, Codex ou outro)

**Último ajuste visual e de áudio (13/10/2026):** [Polimento do beta](POLIMENTO-AUDIO-OPINIAO.md): opinião redesenhada, controle vertical com início em 20%, camadas do cenário alinhadas, capa integrada e proposta documentada de herói adulto.

**Orientação mais recente:** [Jornada única](JORNADA-UNICA.md), 13/10/2026: ranking sem níveis, progressão por turma e histórico pessoal, entrada com Cripta/Biblioteca e cronograma dentro de Flashcards. As seções antigas abaixo são histórico quando conflitarem.

Atualizado em 14/10/2026, à tarde. Veja "PAROU AQUI" logo abaixo.

## Acabamento — 16/10/2026

Retomada de dois agentes interrompidos (trabalho trazido arquivo a arquivo para a base com continuidade e arte nova) e
fechamento das pendências de 15/10. Sem SQL; não mexe em questões, gabaritos, comentários, preços, limites nem dados.

- **Biblioteca, céu à vista:** a aura de fogo sobe menos (`AuraDeFogo.tsx`, `subir` 2,1–3 → 1,5–2,1), o brilho somado em
  `screen` baixou e o alto da tela tem máscara (`.fc-clima > .fc-aura`, `--clima-mascara`); no celular em pé a máscara
  esmaece a faixa do meio, onde fica o janelão. A Glória mantém raios e ouro, mais fracos no céu.
- **Entrada no computador:** cartões em faixa e botões do cronograma lado a lado; cabe sem rolar em 1400×860 e
  1280×720 (no 1280×720 o palco encolhe e desce 16 px para o penacho não encostar no subtítulo).
- **Ideia 81:** o baralho de demonstração usa `Trauma adulto`/`trauma` e `Quadril`/`quadril`; Meu desempenho só lista
  áreas do índice (`aprendizagem.ts`). Teste em `testar_aprendizagem.mjs`.
- **Central sem disputar a rede:** aberta por trás do jogo, a Central guarda o lugar das capas e só as baixa quando o
  jogo fecha, uma vez (`usarArtesLiberadas`). Abertura do jogo: 0 capas (antes 4, ~400 kB).
- **Ranking:** `--fundo-cripta` com endereço absoluto (mesmo erro da cortina).
- **Pintura à parte:** `efeitos/ambiente.ts` (ambiente, tipos, luzes, tabuleiro) fica no jogo; `pintura.ts` +
  `tabuleiros.ts` vão para `pintorCenas` (51 kB) por `import()` em `Cenario.tsx`, pedido junto com o acervo.
  FlashcardsJogo 322,5 → 273,2 kB.
- **Texto da Biblioteca:** o número sai do acervo carregado: "5.571 flashcards das questões comentadas: 4.533 das provas
  reais e 1.038 dos OrtoQuestões Simulados" (o "4.324 das provas reais" era antigo e contava simulados).
- **Seguir cronograma sem plano salvo:** o cartão aparece com o plano sugerido (o mesmo da central) e agora diz
  "Plano sugerido: ... 20 novos por dia" com o atalho "Ajustar o plano".
- **Contador da rota** (`rotaNaTela.ts`): selo "Joelho 7 faltam" na borda de cima da mesa, à direita (no celular em pé,
  no pé da mesa). O flashcard da mesa conta enquanto está à vista. Teste em `testar_cronograma_sequencia_flashcards.mjs`.
- **1024×640:** pop-up quase em tela cheia, painel do herói e botão mais estreitos, alternativas longas em 12,5 px.
- **Bug do painel do chefe no celular:** coluna da batalha em `minmax(0, 1fr)`, placa com consulta de contêiner,
  vida curta (`numeroCompacto`: até 9.999 inteiro, depois "12,4 mil"; sem "/máximo" quando a placa é estreita), selos
  com reticências e um só quando a placa é estreita, asa do dragão por baixo da placa, chefes 20% menores até 374 px.
  Conferido de 320 a 1400 px com Dragão Rubro 1472 e 2280, Dragão de Ossos, Rainha do Cimento e adversários pequenos.
- **Fluidez (robô):** `scripts/flashcards/testar_percurso.mjs` joga 8 andares em 1400×860, 1280×720, 390×844 e
  844×390 (acerta quase sempre, escolhe portas, loja, salas) e acusa exceção, trava, clique morto, alvo coberto,
  texto cortado, coluna maior que a tela e CLS visível > 0,1 (o que muda sob portas, loja, apresentação e cortina é
  contado à parte). Achados e correções: a mesa subia 10 px a cada resposta no celular (a intenção do adversário
  sumia; agora fica oculta guardando o lugar, e o rótulo tem sempre duas linhas); faixa do adversário com altura
  mínima no celular em pé; exceção `arc` com raio negativo nos efeitos (`palco.ts`). Resultado final: 8 andares nos
  quatro formatos, CLS visível 0,001–0,035, nenhuma imagem acima de 1,5 s, nenhum clique morto.
- **Primeira pergunta jogável** (390×844, CPU 4×, build de produção, mediana de 7): 2,26 s → 2,19 s; maior tarefa
  456 → 421 ms; tarefas longas somadas 1,56 → 1,42 s; bytes na abertura 2,34 → 1,54 MB.
- **Testes:** `npm test`, `npx tsc --noEmit`, `npm run build`, `testar_fluidez.mjs`, `testar_continuidade.mjs` (agora
  acha o Chromium em `/opt/pw-browsers/chromium` sozinho) e `testar_percurso.mjs`. Capturas em
  `/tmp/claude-0/capturas-acabamento/`.
- **Pendências:** 1400×860 ainda tem um pulo pequeno (CLS 0,012) do rodapé do herói ao entrar a recompensa; o selo
  "Fúria · dano ×1,5" fica com reticências no celular quando o chefe tem nome longo.

## Continuidade entre aparelhos — 15/10/2026, noite

Bug do Tales: "A continuidade do modo Cripta não é igual entre um computador e outro. No notebook eu estava no
Golem; no computador, no Senhor do Anel Pélvico." Causa: partida em andamento, Bestiário, Altar e patamar da Torre
ficavam só no localStorage de cada aparelho (e a leitura da partida acontecia sem baixar nada da conta).

- **SQL novo: parte 28** (`supabase/colar-no-painel/sql-202610152200-parte28.sql`, mesma da migração
  `202610152200_flashcards_continuidade.sql`). Idempotente, não apaga dados, cada conta só lê e grava a própria
  linha. **Precisa ser colada** para a continuidade valer; antes disso o site segue só local, sem erro.
- **Cliente:** `src/flashcards/continuidade.ts` (mescla pura e chaves locais) e, em `servidor.ts`,
  `sincronizarJogo`/`agendarEnvioJogo`/`enviarJogoAoSair`/`instalarContinuidade`. A Arena baixa o jogo da conta
  **antes** de montar a partida (até 4 s); vale a mais recente; partida encerrada vira lápide e não ressuscita;
  Bestiário e Altar por união/máximo. Envio: importante na hora, o resto em até 5 s, e ao esconder a aba/fechar
  (`keepalive`). Aba velha aberta: ao voltar, adota a partida mais nova do outro aparelho, com o aviso
  "Continuando a partida do seu outro aparelho (andar X)". Detalhes em [ARQUITETURA.md](ARQUITETURA.md).
- **Não muda:** regras, dificuldade, ranking, limites (a vida a cada 24 h segue no servidor).
- **Testes:** `node fixtures/testar_continuidade_flashcards.mjs` (no `npm test`) e o Playwright
  `scripts/flashcards/testar_continuidade.mjs` (dois navegadores, Supabase simulado; o cabeçalho do arquivo
  diz como subir o servidor). Capturas em `/tmp/ortoquestoes-continuidade/`.
- **Limites conhecidos:** duas partidas jogadas ao mesmo tempo em dois aparelhos não se juntam: vale a que mexeu
  por último (só existe uma partida por modo). Uma partida antiga, sem carimbo, nos dois aparelhos: fica a mais
  funda. O envio ao fechar é melhor esforço; o que não chegou sobe na próxima vez que esse aparelho abrir o jogo.

## Biblioteca e cronograma — 15/10/2026

Pedido do Tales: cronograma "palpável, não aleatório", meta flexível, botão "Seguir cronograma", atalhos diretos para estudar ou jogar, fundos que mudam com os acertos, Biblioteca mais fluida no celular e desempenho mais visual. Sem SQL; não mexe em limites, preços, questões ou no cronograma geral (`#/cronograma`).

- **Cronograma dos flashcards** (`src/flashcards/cronograma.ts`, página `src/paginas/CronogramaFlashcards.tsx`): virou uma **fila concreta**. Os assuntos entram pela incidência na prova (`src/dados/incidencia.json`, a mesma da fábrica; os assuntos de resto "Outr..." vão para o fim) e, dentro de cada um, do flashcard mais fácil ao mais difícil. Cada dia de estudo sugere `ritmo` novos; as **revisões vencidas vêm antes** (errados primeiro, teto de 60 por sessão). Fazer mais adianta a fila; fazer menos só faz amanhã continuar de onde parou. A data é **opcional** e nunca vira erro: a tela mostra a previsão realista de término e, se a data for apertada, o ritmo que chegaria nela, com "Ajustar o ritmo". A página segue `docs/cronograma/PLANO.md` (onde você está, hoje, amanhã, esta semana, depois) e o ajuste tem simulador ao vivo. Sem plano salvo, vale o **plano sugerido** (tudo, 20 por dia, seg. a sáb.).
- **Dados salvos:** `flashcards:plano` continua o mesmo; `migrarPlano` abre o formato antigo sem perder campos (o `ritmo` antigo vira a sugestão de novos). `calcularPlano` e as situações "acima do ritmo" saíram.
- **Seguir cronograma:** central (cartão "Meu cronograma" e botão no topo), Biblioteca (cartão no alto), fim da sessão (o que falta, amanhã, "Adiantar mais N"), capa (`#/flashcards/biblioteca?categoria=plano`) e Entrada do jogo ("Seguir cronograma" sob a Biblioteca; "Jogar o assunto de hoje" sob a Cripta). Na Cripta usa a rota do Mapa do especialista (`src/flashcards/rotaCronograma.ts`, uso único na aba); em `Arena.tsx` só envolve o estado inicial com `aplicarRotaDoCronograma`. `&extra=N` adianta.
- **Atalhos diretos:** "Estudar flashcards" (`#/flashcards/biblioteca`) e "Jogar o Torneio" (`#/flashcards/cripta`) no menu geral, na central, no quadro da capa e na página Treinar. Fora do jogo, nunca "Cripta".
- **Horas da Biblioteca:** a sessão começa no amanhecer e a luz anda com os acertos (dia, tarde dourada, pôr do sol, noite estrelada), cerca de um quinto da sessão por hora (`src/flashcards/biblioteca/horas.ts`). Pinturas em `public/flashcards/cenarios/biblioteca-{amanhecer,tarde,entardecer,noite}-*`, geradas por `python3 scripts/cenarios/biblioteca_horas.py` a partir da Biblioteca original (céu do janelão repintado, estrelas e lua, velas mais fortes no escuro). `FundoBiblioteca.tsx` esmaece a hora nova só depois de carregada e pré-carrega a próxima; com movimento reduzido a troca é imediata. `Cenario` ganhou a prop opcional `pintura`.
- **Fluxo do Estudo:** quem o servidor já disse que não tem limite vira na hora (a contagem segue em segundo plano, mesma chave); conta grátis continua esperando a validação, agora com estado "validando". Imagem dos dois próximos flashcards pré-carregada, Enter aceita a avaliação sugerida, toques sem atraso, botões maiores no celular. CSS próprio em `src/estilos/paginas/BibliotecaEstudo.css`.
- **Meu desempenho:** evolução por dia empilhada (Sabia, Hesitei, Errei, Torneio), áreas com a cor da área, barra de progresso e acerto por faixa, e **pontos fracos** por assunto com botão "Treinar" (`?assunto=` na Biblioteca).
- **Testes:** `fixtures/testar_cronograma_sequencia_flashcards.mjs` (ordem, meta flexível, revisões antes, data apertada sem erro, migração, rota da Cripta) e `testar_aprendizagem.mjs` atualizado. Capturas em `/tmp/claude-0/capturas-biblioteca/` (1400×860, 390×844, 844×390).
- **Pendências:** o clima de sequência (fogo azul, chama arcana) cobre parte do céu nas sequências longas; se o Tales quiser a hora mais evidente, suavizar esse clima na Biblioteca. A Entrada no computador deixa os botões novos abaixo da dobra do pop-up.

## Fluidez e correções da Cripta — 15/10/2026

Pedido do Tales: mapas do Golem "bugados", botões que às vezes não vão para frente, dicas dos poderes estranhas, carregamento lento e celular. Sem mudança em questões, gabaritos, preços, regras do motor ou SQL. Estilos novos ficam em `src/estilos/paginas/FlashcardsCripta.css` (carregado depois de `Flashcards.css`, para não disputar linhas com a Biblioteca).

- **Botões travados (causas):** (1) no celular em pé, ao responder, a mão sumia e o herói e o botão desciam ~130 px deslizando: o toque em Seguir caía na mesa; (2) no celular deitado, o deslize medido errado jogava o botão para fora da tela a cada flashcard novo, e depois de uma parada (portas/loja) o herói e o botão podiam continuar invisíveis (visibilidade herdada por `display: contents` com animação ativa), sem jeito de seguir; (3) a arena rolava 11 px ao responder; (4) uma exceção no meio da encenação deixava `animando` preso e escondia recompensa/portas/fim. Correções: herói e botão parados no rodapé (sem `useDeslizar` neles), regra de parada em cada filho, arena com `overflow: clip`, encenação com `try/catch` + vigia de 12 s, botão principal vira "Seguir · pular animação" durante animações, recompensa/portas liberam de novo se a escolha não passar.
- **Golem de Gesso:** enquanto a floresta pintada carregava aparecia a cena antiga em código (uma parede de masmorra) e depois trocava de repente; agora fica um degradê nas cores da cena e a pintura entra com esmaecer. O sprite cortava na borda esquerda no celular e entrava sob o cabeçalho no computador: `Ator` ganhou `contido` (margens do transbordo da folha assada).
- **Dicas dos poderes e relíquias:** `componentes/Dica.tsx`, balão do jogo com nome, tipo/raridade, efeito, detalhe, cargas e situação ("pronto para usar", "sua vida está cheia"...). Mouse: passa e mostra, clique usa. Toque: o primeiro toque mostra, com botão "Usar agora". Fica dentro da moldura. No celular as relíquias viram um selo com a lista.
- **Carta, vida e botões:** figura com espera, entrada suave e "Tentar de novo" se falhar; selo de raridade fora do enfeite do canto; barras de vida com moldura, brilho e pulso de perigo; janelas por cima da arena rolam em vez de cortar o topo; recompensa compacta no celular deitado; notebook 1280×720 com a pergunta visível (antes o flashcard ficava com 130 px).
- **Desempenho** (celular 390×844, CPU 4×, build de produção): pergunta jogável em 5,26 s → 3,67 s; maior tarefa longa 1,5 s → 0,5 s; tarefas longas somadas 3,3 s → 1,8 s. FlashcardsJogo 403,7 → 382,0 kB (Estudo, clima e enfeites da Biblioteca em pedaços à parte). Áudio no primeiro toque 1,1 MB (5 faixas) → só a faixa que toca; fanfarras quando o navegador folga. Cenários: só o formato da tela (4 PNGs em vez de 8). Pré-carrega sprites, cena do próximo andar e figuras dos dois próximos flashcards. Acervo começa junto com o código do jogo; a sincronia do progresso não segura a entrada por mais de 2,5 s. Textura da cortina corrigida (baixava o index.html a cada troca de cena).
- **Teste:** `scripts/flashcards/testar_fluidez.mjs` (botão parado, volta da parada, dica e Golem na tela, nos três formatos).
- **Pendente:** a página de fundo (Central) baixa ~400 kB de capas durante a abertura do jogo (`CentralFlashcards.tsx`, fora desta frente); `RankingCripta.tsx` tem a mesma url relativa em variável CSS da cortina; 1024×640 ainda fica apertado com alternativas longas; `pintura.ts` (86 kB) poderia sair do pedaço principal se o fundo em código e o ambiente forem separados.

## Leitores — continuidade de 14/10/2026

Início familiar #262 publicado: merge 174b16ee, deploy 38655191938 concluído. **Acertos pessoais vêm antes da turma nas novas partidas.** Paisagens #261 publicadas (38654687687). O bloco atual conclui 39, com leitores decorativos depois de quinze minutos visíveis; [relatório](LEITORES-14-10.md), testes e capturas nos três formatos. Sem SQL. Precisa de seu próprio PR/deploy. Monstros seguem em pausa; próximos itens estão na auditoria.


## Início mais familiar — diretriz de 14/10/2026

Tales pediu priorizar os acertos pessoais para diminuir frustração: **acertadas por você → maior acerto da turma → erradas por você → novas → mistura**. Até oito por grupo, grupos vazios pulados. Novas partidas; partidas salvas intactas. Testes de seleção, motor e interface nos três formatos. [Relatório](INICIO-FAMILIAR-14-10.md). Sem SQL. Paisagens #261 mescladas, deploy 38654687687 a conferir; não afirmar publicação do início antes de seu próprio deploy.

## Paisagens — continuidade de 14/10/2026

Música #258 e estações #259 publicadas. Ambiente vivo #260 publicado: deploy 38653549325 concluído com sucesso. O bloco atual conclui 43–48, com seis pinturas integradas às paradas existentes e sem mudar o motor. [Relatório](PAISAGENS-14-10.md). Precisa do próprio PR e deploy. Sem SQL. Próximo: aparência e auditoria dos dados existentes.

## Ambiente vivo — continuidade de 14/10/2026

Música #258 publicada (deploy 38651984359). Estações #259 publicadas: deploy 38652550484 concluído com sucesso. O bloco atual conclui 49 e 50: ciclo de dia/noite no Jardim e fauna decorativa, sem alterar o motor ou criar monstros. [Relatório](AMBIENTE-VIVO-14-10.md). Sem SQL. Próximo: paisagens e aparência.

## Estações — continuidade de 14/10/2026

Música #258 publicada: merge `c173b491`, deploy `38651984359` concluído com sucesso. O bloco seguinte conclui a ideia 40, com ornamentos sazonais nas margens da Biblioteca; relatório em [ESTACOES-14-10.md](ESTACOES-14-10.md). Calendário do hemisfério sul, neve de fantasia em julho, partículas estáticas com movimento reduzido. Sem mudança em clima de acerto, revisão, áudio ou SQL. Conferir o PR e deploy próprios antes de afirmar publicação deste bloco.
## Música e clima — continuidade de 14/10/2026

O reparo #257 foi mesclado e o deploy `38648064258` terminou com sucesso, restabelecendo a publicação após #256. O tutorial já integra o novo Menu e não tem condição de escolha de som.

O bloco seguinte é música (38, 75, 82), registrado em [MUSICA-CLIMA-14-10.md](MUSICA-CLIMA-14-10.md): mix por clima, coral sob demanda e sincronizado, trilha acústica Passeio ao Sol e emenda da faixa sala. Preserve a escala 2 de volume, mestre no fim da cadeia e controles do Menu. Não há SQL.

## Integração com o Menu do jogo — 14/10/2026

A atualização #256 retirou a escolha de som da Entrada. O tutorial ainda referenciava `escolherSom`, removido nessa atualização, e o deploy falhou com TS2304. A correção remove apenas essa condição e atualiza os scripts de tutorial/benchmark para os controles atuais.

Estado novo do produto: ☰ abre o **Menu do jogo** (partida, som, movimento e leitura), sem engrenagem separada e sem pergunta inicial de som. Música usa ganho 0,3 no barramento; efeitos padrão 70%; mestre preserva a escala 2 e o início em 30%. Não ressuscitar os controles antigos. O tutorial é opcional e não exige uma escolha de áudio.

## Contexto atualizado da publicação — 14/10/2026

- PRs #247–#250 e #252 publicados: cenários restantes, combate, desempenho, acessibilidade e Biblioteca.
- PR #254 publicado: volume no fim da cadeia de áudio, curva v², padrão de **30% na escala 2**, botões +/− e silenciar; Começar do zero no Menu confirma antes e mantém recorde, cristais, talentos e bestiário. Não voltar ao padrão antigo de 20% nem desfazer essa implementação.
- PR #255 mesclado: tutorial opcional e benchmark sintético. Seu primeiro deploy foi cancelado pelo de #256; a correção de integração precisa de deploy concluído antes de afirmar publicação. O tutorial usa diálogo fora do contêiner rolável da Entrada, para seu título não sumir ao clicar.
- Capas e formulário atual conferidos no domínio público: PNGs iguais aos arquivos do repositório; o bundle Flashcards contém **O que podemos melhorar?** e os grupos `cf-opiniao__notas`. Os prints com mago azul e caixa sem espaçamento são da aparência anterior.
- Tales autoriza continuar e publicar após os testes, com relatórios por bloco. Monstros novos continuam em pausa. Questões médicas, planos e dados existentes não fazem parte deste trabalho. Não há SQL novo nesses blocos.

## Tutorial e benchmark — continuidade de 14/10/2026

O PR #252 da Biblioteca foi mesclado. O bloco seguinte acrescenta tutorial opcional e medição local de FPS, documentados em [TUTORIAL-DESEMPENHO-14-10.md](TUTORIAL-DESEMPENHO-14-10.md). A base foi atualizada incluindo os controles de volume e o reinício de partida do PR #254. Preserve essas mudanças.

## Continuidade autorizada — Biblioteca (14/10/2026)

Tales pediu continuar a lista de pendências e publicar os blocos concluídos, mantendo relatórios no GitHub. A auditoria e a fila de trabalho estão em [PENDENCIAS-14-10.md](PENDENCIAS-14-10.md). Não retomar monstros novos nem modificar conteúdo médico, planos ou dados existentes de usuários. O bloco atual acrescenta diário por sessão, estante por “Sabia” e leitura tranquila com chuva. Não há SQL.

## Integração dos quatro blocos — 14/10/2026

Tales autorizou mesclar e publicar os PRs #247, #248, #249 e #250. Esta revisão integra cenários, combate, desempenho e acessibilidade. Os registros abaixo que mencionam rascunho ou "não publicado" descrevem a etapa anterior à integração. A confirmação de publicação fica no workflow **Publicar no GitHub Pages** da branch do site. Não há SQL novo.

Na versão integrada passaram `npx tsc -b`, `npm test`, build e Playwright em computador, celular em pé e deitado: áudio Opus/MP3, carregamento por andar, foco, leitura ampliada, sem tremor e cortina com movimento reduzido. As questões médicas e as regras de acesso permanecem fora deste bloco.

## PAROU AQUI (14/10/2026, tarde): leia isto primeiro

### Para o ChatGPT, o Codex ou outro agente continuar

Leia nesta ordem:
1. `AGENTS.md`, com as regras do projeto.
2. Este arquivo.
3. [../PLANO-DE-IDEIAS.md](../PLANO-DE-IDEIAS.md): as 84 ideias com checklist. Marque `[x]` no que fizer.
4. [MONSTROS-NOVOS.md](MONSTROS-NOVOS.md): consulte as restrições; monstros novos estão em pausa. Lá estão as referências de monstros que o Tales mandou, descritas, o estilo de cada família, o que já tem arte e a receita para fazer um monstro.

**Mensagem pronta para colar no agente:**

> Repositório `talesrobertosn/ortoquestoes`, base `claude/pdfs-questoes-tp64dr` (o merge nela publica o site). Leia `AGENTS.md`, `docs/flashcards/CONTINUAR.md`, `docs/PLANO-DE-IDEIAS.md` e `docs/flashcards/MONSTROS-NOVOS.md`. Continue pela fila de PENDENCIAS-14-10.md; mantenha monstros novos em pausa. Arte somente por scripts, nunca imagem externa ou gerada. Trabalhe numa branch nova a partir da base e abra um PR para ela. Antes do PR, rode `npm test`, `npx tsc --noEmit`, `npm run build` e capturas com Playwright em 1400×860, 390×844 e 844×390. Ao terminar, marque o item no plano e atualize o topo de CONTINUAR.md.

### Estado de agora

- **Movimento suave (14/10/2026, noite):** pedido do Tales, o flashcard "sambava" ao virar e os movimentos estavam duros.
  - O flashcard desliza até a posição nova em vez de pular (`efeitos/deslizar.ts`, `useDeslizar`, usado no `Cartao` e no herói e botão da Batalha no celular).
  - No celular, o flashcard fica preso pelo topo, e o verso do Estudo não troca mais as linhas do grid (o painel caía cerca de 140 px).
  - Giro, compra, golpes, tremores, bote do adversário (parte da pose de preparo) e botão principal com curvas suaves; alternativas e botões entram em cascata.
  - Giro duplo corrigido: a chegada do baralho agora é a classe `fc-carta--chega`, só no flashcard novo (antes repetia depois de cada virada). Na Batalha, a chave do flashcard não muda ao responder (`chaveDaMesa`), e o giro cancela o pedido anterior.
  - Ao seguir, uma cópia do flashcard anterior desliza para o descarte enquanto o novo chega (`descartar` em `Cartao.tsx`).
  - Tudo desligado em "Reduzir movimento". Fim do bloco "Movimento suave" em `Flashcards.css`.
- **Na base e publicado:**
  - #228 e #229: golpes em pixel art; os superpoderes Envenenado, Em chamas, Grude e Tremor; o humor da Biblioteca com gato e velas; o Jardim Suspenso.
  - #235: top 3 do ranking com largura cheia.
- **PR #237**, no branch `claude/eloquent-brahmagupta-u85fiy`:
  - o jogo abre como pop-up sobre o site;
  - botão Menu na partida;
  - correção do topo no celular;
  - a escolha "entrar com ou sem som" agora é perguntada uma vez só por aparelho. Fica guardada em `flashcards:som-escolhido`, nas chaves globais de `estado/armazenamento.ts`.
- **O Tales confirmou:** o som funciona no celular e a parte 19 do SQL já foi colada no Supabase.
- **Próximo:** monstros novos e bestiário com arte nova (MONSTROS-NOVOS.md). O goblin, o esqueleto, o ent (Guardião da Fise), o mímico, a aranha e o Cogumelo da Necrose (monstro novo) já estão prontos (`scripts/sprites/goblin.py`, `esqueleto.py`, `ent.py`, `mimico.py`, `aranha.py` e `cogumelo.py`). **Os monstros estão em pausa por pedido do Tales** ("vamos continuar com mais monstrinhos futuramente"); só retome quando ele pedir. Depois, pela ordem do plano:
  - ~~sons próprios dos golpes novos (ideia 17)~~: feitos;
  - ~~revisão dos botões (ideia 61)~~: feita;
  - cenários pintados que faltam (ideia 51): o Salão, a Caverna, o Laboratório, a Catacumba, o Templo, a Passarela, a Forja e o Coliseu já foram pintados (`scripts/cenarios/salao.py`, `caverna.py`, `laboratorio.py`, `catacumba.py`, `templo.py`, `passarela.py`, `forja.py` e `coliseu.py`); treino, torre e arquivo foram concluídos no PR draft #247, com capturas e geradores em [CENARIOS-PENDENTES-14-10.md](CENARIOS-PENDENTES-14-10.md). Não publicados. **Nenhum enfeite de cenário pode ter osso, caveira ou outra anatomia** (regra de `docs/flashcards/README.md`).

## Antes (14/10/2026, madrugada)


**Lista de ideias com checklist (o plano):** [../PLANO-DE-IDEIAS.md](../PLANO-DE-IDEIAS.md). Marque o que fizer. Resumo da madrugada para o Tales: [RELATORIO-MANHA-14-10.md](RELATORIO-MANHA-14-10.md).

Branch de trabalho: `claude/eloquent-brahmagupta-u85fiy`, com PR para a base `claude/pdfs-questoes-tp64dr`. O PR #227 já foi mesclado.

**Feito depois do #227:**
- **Golpes em pixel art:**
  - `scripts/sprites/vfx.py` gera `public/flashcards/vfx/*.png` e `src/flashcards/efeitos/vfxIndice.ts`.
  - O `Palco` (`efeitos/palco.ts`) ganhou `efeito`, `voar`, `rasgo` e `espadaGigante`.
  - O ataque de cada vilão (comum e crítico) está em `efeitos/ataques.ts`; a investida (CSS `fc-investida--*`) e o terremoto (`fc-terremoto`), na `Arena.tsx`.
  - Para conferir: `python3 scripts/sprites/vfx.py` (gera e salva a prévia) e `node scripts/tmp-tela/golpes.mjs` (capturas; fica fora do git).
- **Combate (14/10, em PR draft):** ideias 16, 18, 23, 24 e 64 concluídas no PR draft #248, sem merge. Hipnose após o primeiro Olhar que atinge o herói; mímico mantém roubo de carga. [COMBATE-14-10.md](COMBATE-14-10.md) traz testes, capturas e compatibilidade.
- **Envenenado:**
  - campo `envenena` no bestiário;
  - `Partida.veneno`, `VENENO` e os eventos `envenenado`, `veneno` e `veneno-curado` em `regras.ts`;
  - testes em `fixtures/testar_flashcards.mjs`;
  - na tela: selo sob a vida, bolhas e brilho verde no herói.

**Feito: humor da Biblioteca** (ideias 26 a 31 do plano; `componentes/ClimaEstudo.tsx`, ligado em `Estudo.tsx` e `Arena.tsx`):
- chamas no nome com 3, 6 e 9 acertos seguidos;
- glória com 20;
- chuva com 3 erros seguidos e tempestade com 5;
- névoa na hesitação;
- arco-íris depois da chuva.

**Próximo:** rankings temáticos (ideias 58 a 60). Depois: andar a céu aberto estilo Stardew (ideia 42).

## Estado anterior (14/10/2026, antes do #227 ser mesclado)

Branch de trabalho: `claude/eloquent-brahmagupta-u85fiy`, com o PR #227 aberto para a base `claude/pdfs-questoes-tp64dr`. O merge está autorizado pelo Tales quando o CI "verificar" ficar verde.

**Já feito no PR #227:**
- ordem da Cripta em 4 grupos;
- poderes Mapa do especialista e Desvio de área, mais o talento "Rota de estudo";
- conta grátis: a cada 24 horas, 10 flashcards na Biblioteca e uma vida na Cripta, limites independentes e **sem texto explicando a regra no site** (SQL parte 19, `sql-202610140900-parte19.sql`, que **o Tales precisa colar no Supabase**);
- opiniões no painel do admin;
- página de Flashcards reorganizada, com o cronograma em destaque;
- volume inicial de 20%;
- mapa do Golem consertado;
- resumão em [RESUMO-14-10.md](RESUMO-14-10.md), que traz também o texto do aviso no topo e a proposta de conquistas.

**Em andamento: herói refeito do zero (prioridade máxima).**
- **Pedido do Tales:** abandonar toda a direção de arte anterior. Nada de rosto redondo, fofinho ou infantil. Seguir o conceito `docs/flashcards/conceitos/heroi-adulto-proposta.png`: cavaleiro adulto, elmo aberto de aço com pluma azul e friso dourado, cachecol azul, ombreiras e peitoral, cota de malha, tabardo azul com borda dourada, cintos de couro, capa vermelha, escudo azul em gota com cruz dourada, espada longa, grevas e botas marrons.
- O herói também será o **mascote do site**. Ele pode ter poucos movimentos, desde que fique bonito.
- **O que já existe:**
  - O renderizador novo é `scripts/sprites/cavaleiro2d.py`: pixel art 2D em recortes, com ossos, sombreamento por normal, brilho de metal, paleta e contorno.
  - Ele substitui o herói SDF de `scripts/sprites/heroi.py`, que foi rejeitado. As folhas `heroi-1..6` que estão no repositório ainda são as do SDF.
- **Primeira prévia:** `docs/flashcards/conceitos/cavaleiro2d-previa-1.png` (estágio 4, parado). A leitura geral está certa, mas ainda está aquém do conceito. Falta:
  - rosto e queixo maiores e mais adultos, com olho legível;
  - elmo mais alto, com protetor de face;
  - pluma mais cheia, em penas;
  - postura mais aberta e heroica, com pernas afastadas;
  - calça azul aparecendo entre o tabardo e as grevas;
  - joelheiras douradas e grevas que leiam como aço;
  - pés de aço em vez das botas brancas;
  - braço da espada com manopla e couro;
  - menos ruído no tabardo.
- **Veredito do Tales sobre a prévia 1: "Tá feio".** Não basta ajustar detalhes. O boneco está rígido, de frente, com proporções de brinquedo e superfícies chapadas.
  - Repense a figura inteira a partir da silhueta do conceito: três quartos, pernas abertas, peito largo, ombreiras grandes em camadas e cabeça pequena em relação ao corpo.
  - Se os polígonos não chegarem lá, troque de método: desenhe à mão uma matriz de pixels por paleta, um quadro-chave grande (uns 96 px de altura do corpo), e derive dele poucas poses.
  - **Não mescle o PR #227 com o herói de agora**: ele ainda tem o herói SDF rejeitado.
- **Rodada 2 (14/10, mais tarde):** `cavaleiro2d.py` foi reescrito do zero.
  - **Base:** as medidas vêm do conceito, com 1 px para cerca de 10 px dele. O quadro tem 136×170, com âncora (68,164).
  - **Como desenha:** peças presas a ossos 2D, IK nas pernas para agachar e dar passos, e retoques do rosto pixel a pixel.
  - **Prévia:** `docs/flashcards/conceitos/cavaleiro2d-previa-2.png` (estágio 4, parado). As proporções de herói já funcionam: pernas longas, ombreiras grandes, escudo, tabardo e capa.
  - **Falta corrigir:**
    1. **Elmo achatado.** O domo está baixo e a faixa dourada muito grossa. Deixar o domo mais alto e redondo, com a aba fina.
    2. **Protetores de face.** O da esquerda ficou escuro e ilegível.
    3. **Rosto pequeno e borrado.** Retocar os pixels: olhos, nariz e queixo.
    4. **Pluma.** Parece um gancho; deve ser um tufo de penas mais cheio.
    5. **Lâmina da espada quase preta.** Usar o aço claro, com um fio de luz.
    6. **Biqueiras dos pés brancas demais.** Escurecer o aço, deixando o brilho só na borda.
    7. **Metal em geral.** A ombreira direita está estourada de branco e o peitoral escuro demais. Ajustar a fórmula do metal em `tons()`.
    8. **Capa.** Aparece só como uma bandeira embaixo do escudo; deve sair do ombro.
    9. **Animações.** Conferir com `--anim preparo|golpe|dano|derrota|vitoria`. As poses usam ângulos absolutos `be_b`, `be_a` e `esp`.
  - **Para ver um quadro:** `--so 0 --estagios 4 --escala 6`.
- **Próximos passos:**
  1. Iterar: `python3 scripts/sprites/cavaleiro2d.py --previa /tmp/x.png --estagios 4 --escala 5`. Depois ver todos os estágios (`--estagios 1,2,3,4,5,6`) e as animações (`--anim golpe|dano|derrota|vitoria|preparo`).
  2. Assar: `python3 scripts/sprites/cavaleiro2d.py`, depois `python3 scripts/sprites/indice.py`.
  3. Conferir a escala e a âncora no `Hud.tsx`. O quadro agora é 120×132, com âncora (56,126); `escalaAssada` usa `CRESCE.heroi`.
  4. Gerar o mascote (`--mascote`) e a arte da capa (`python3 scripts/cenarios/promo.py`).
  5. Capturas com Playwright em 1400×860, 390×844 e 844×390. Mostrar ao Tales antes de mesclar.
  6. Atualizar a linha "Arte" em RESUMO-14-10.md.

- **Rodada 3 (14/10, noite): mudança de direção pedida pelo Tales.** Ele mandou referências de cavaleiros em pixel art e escolheu **"Chibi como a 3ª"**: elmo grande, redondo e fechado com viseira, pluma vermelha curta, capa vermelha, aço em poucos tons e contorno escuro. Isso substitui o pedido anterior de "nada fofinho".
  - Gerador novo: `scripts/sprites/cavaleiro_chibi.py`, em pixel art nativa. As peças são formas simples com tons em faixas (luz de cima e da esquerda), cada uma com contorno, empilhadas. O quadro tem 80×64, com âncora (39,60), e o cavaleiro tem cerca de 57 px de altura.
  - Estágios: 1 escudo de madeira e pluma curta; 2 escudo de aço com cruz vermelha; 3 capa curta; 4 frisos de ouro, capa longa e cruz dourada; 5 ombreiras e joelheiras douradas; 6 lenda em pérola, com aura.
  - Animações: parado, preparo, golpe, dano, derrota (tomba para trás girando sobre os pés) e vitória.
  - Prancha para aprovação: `docs/flashcards/conceitos/heroi-chibi-previa-1.png`. **Versão rica (pedido "mais detalhe, mais efeitos, carismático"):** `heroi-chibi-previa-2.png`. O quadro passa a 136×108 com âncora (60,101); traz rampas com desvio de matiz, especular, contorno seletivo, luz de recorte, olhos acesos na viseira (piscam no parado e ficam alaranjados no dano), pluma em penas, tabardo azul com cruz dourada, escudo com brasão e gema, rastro de golpe, faíscas, cintilações e aura com partículas na lenda. **Ainda não assado no jogo; esperando a aprovação do Tales.** Depois de aprovado: `python3 scripts/sprites/cavaleiro_chibi.py`, `python3 scripts/sprites/indice.py`, a escala do herói no `Hud.tsx` (o herói novo é menor no quadro: subir `CRESCE.heroi`) e `--mascote`.
  - `cavaleiro2d.py` (adulto) ganhou cabeça desenhada à mão (carimbos), lâmina clara, biqueiras escuras e capa saindo do ombro, mas foi deixado de lado com a troca para o chibi.

- **Ideias de cenário do Tales (14/10, referências na conversa):**
  - clareira com cavaleiro de costas, montanha nevada ao fundo e mata em camadas azuladas;
  - vilarejo com casa de pedra e madeira, trilha de terra, árvore grande e cerca;
  - ruínas de templo na floresta, com ponte de madeira e água;
  - vila vista de cima, com hortas, caminhos de pedra e rio.

  Servem como estilo para os próximos cenários pintados: pixel art de camadas com perspectiva atmosférica.

**Entregar ao Tales no chat** (o texto está em RESUMO-14-10.md):
- o texto do aviso no topo;
- a avaliação das conquistas;
- o que falta:
  - bestiário antigo;
  - Torre e Salão;
  - variantes do dragão;
  - contador da rota;
  - áreas do baralho de demonstração;
  - emenda da faixa "sala";
  - som no celular;
  - parte 19 no Supabase.

## Mensagem para colar no agente

> Leia AGENTS.md, docs/flashcards/CONTINUAR.md e docs/flashcards/PASSAGEM-ETAPA1.md no repositório
> talesrobertosn/ortoquestoes (base claude/pdfs-questoes-tp64dr) e continue a Cripta do Residente a partir
> de "Próximos passos sugeridos". Trabalhe numa branch nova a partir da base e abra um PR para
> claude/pdfs-questoes-tp64dr. Antes do PR, rode npm test, npx tsc --noEmit, npm run build e Playwright no
> computador (1400×860), no celular em pé (390×844) e deitado (844×390). Respeite todas as restrições
> listadas em CONTINUAR.md.

Quem orienta o trabalho é o Tales, com o ChatGPT organizando os pedidos. Ao terminar uma etapa,
escreva um resumo curto para o ChatGPT: o que foi feito, os testes, o que ficou fraco e o que falta. Use
o modelo de [RESUMO-CHATGPT.md](RESUMO-CHATGPT.md).

## Onde as coisas estão

| O quê | Onde |
|---|---|
| Base (publica no GitHub Pages ao receber merge) | `claude/pdfs-questoes-tp64dr` |
| Branch usada pelo Claude Code | `claude/sharp-goodall-pl7kp7` (recomeçada a partir da base depois de cada merge) |
| Etapa 1 da direção criativa | PR #219 (mesclado) |
| Etapas 2 a 8 e dificuldades | PR #220 (mesclado) |
| Este guia atualizado | PR #221 (mesclado) |
| Relatório da Etapa 1 | https://claude.ai/artifact/USHFDMekPZmT5ptqcsVd1y |
| Relatório das Etapas 2 a 8 | https://claude.ai/artifact/FZJtaBEu91gh6qbxLs5T9M |
| Último resumo para o ChatGPT | [RESUMO-CHATGPT.md](RESUMO-CHATGPT.md) |
| Passagem detalhada (etapa por etapa) | [PASSAGEM-ETAPA1.md](PASSAGEM-ETAPA1.md) |
| Arte: como fazer cenário e personagem | [ARTE.md](ARTE.md) |
| Histórico das auditorias de arte | [AUDITORIA-ARTE.md](AUDITORIA-ARTE.md) |

**Os relatórios em claude.ai são privados:** só o Tales abre. Os detalhes técnicos estão todos nestes arquivos do repositório.

## O que já foi feito (resumo)

1. **Floresta das Fises Antigas** (andar 1), pintada offline, com a clareira de pedras, vaga-lumes, folhas e borboletas.
2. **Alternativas 1 a 4** forjadas: pergaminho, moldura de bronze, medalhão e 8 estados.
3. **Modo Estudo** com o mesmo acabamento:
   - Biblioteca Ancestral;
   - alternativas antes de virar;
   - placas Errei, Hesitei e Sabia;
   - painéis forjados.
4. **Celular deitado** com layout próprio, em três colunas.
5. **Herói em 6 estágios**, crescendo de verdade do aprendiz à lenda.
6. **Chefes:** Dragão de Ossos redesenhado e Guardião com acabamento.
7. **Interface mais leve:**
   - dois selos e um "+N" na placa do adversário;
   - topo acima dos personagens;
   - "Ver imagem" sempre visível.
8. **Covil e Masmorra** pintados offline; sem chuva nas cenas internas.
9. **Salas de evento:**
   - ferreiro;
   - curandeira;
   - baú;
   - sala secreta;
   - encontros.
   - Com elas, as sinergias de relíquias.
10. **Trilha:** floresta, masmorra, covil e sala.
11. **Bestiário:** variantes em volume (golem, guardião, serpente, gosma) e a Gosma de Cimento modelada.
12. **Revisão do PR #219** (Codex): o cenário pintado não repinta mais com a cena antiga quando se troca Batalha/Estudo antes de as camadas carregarem; o corte do celular deitado é o mesmo no CSS e no `usarFaixa` (paisagem, altura ≤ 520 px, largura ≥ 480 px), com o flashcard preso à coluna do meio e o painel do Estudo em coluna de 480 a 700 px.
13. **Celular em pé, Estudo:** os botões Errei, Hesitei e Sabia ficavam espremidos ao lado do veredito; agora o veredito ocupa a linha de cima e os três botões dividem a de baixo.

14. **Dificuldades da Batalha (Fácil, Normal e Difícil),** escolhidas na entrada e guardadas em `flashcards:nivel`. Cada partida guarda o próprio `nivel`; as partidas antigas abrem como Normal.
   - O nível muda a vida do herói (×1,3, ×1 ou ×0,85), a do adversário (×0,8, ×1 ou ×1,25), o dano recebido (×0,65, ×1 ou ×1,35) e os pontos (×0,5, ×1 ou ×1,5).
   - Muda também o peso de cada dificuldade de flashcard no sorteio (`NIVEIS` em `motor/regras.ts`, `pesoDoFlashcard` em `motor/selecao.ts`). O conteúdo não muda, só a mistura.
   - **Ranking:** o Fácil não abre corrida no servidor nem conta para os recordes de andar. Só Normal e Difícil contam.
   - Simulação com 75% de acerto, andar médio: Fácil 11,5, Normal 4,8 e Difícil 2,9.

## Beta público (13/10/2026, à noite)

O Tales autorizou o beta público (roteiro em [LANCAMENTO-BETA.md](LANCAMENTO-BETA.md)). O que existe:

- **Rotas.** `#/flashcards` virou a **central** (página do site, com cabeçalho e rodapé). A entrada
  temática do jogo foi para `#/flashcards/entrada`; `cripta`, `torre` e `biblioteca` continuam iguais.
  `#/flashcards/desempenho` e `#/flashcards/cronograma` são páginas do site. `#/flashcards/ranking`
  leva a `#/ranking?aba=cripta`. Só as rotas do jogo exigem conta (`PAGINAS_DO_SITE_FLASHCARDS` em `App.tsx`).
- **Pop-up (pedido do Tales).** As rotas do jogo abrem por cima da última página do site
  (`src/flashcards/fundo.ts` + `paginaDaRota` em `App.tsx`). No computador o site fica translúcido
  atrás; X, Esc, clique fora e "Voltar ao site" voltam para ela; o botão "Menu" leva à entrada.
- **Nome (regra do Tales).** Fora do jogo é sempre "Flashcards" ou "Torneio de Flashcards" (menu,
  capa, central, ranking, planos, títulos de aba). "Cripta" só dentro do jogo. O ranking do site é
  `#/ranking?aba=flashcards` (`aba=cripta` continua funcionando por link antigo).
- **Página inicial.** Com conta, no computador, o quadro "Seu próximo desafio começa com um flashcard."
  ocupa a coluna da direita do herói, no lugar dos números (pedido do Tales com print). No celular, e
  para visitantes, vira uma faixa logo abaixo do herói. Trava `VITE_FLASHCARDS_CAPA` (ligada no publicar.yml).
- **Arte de divulgação** (`public/flashcards/promo/`, feita por `scripts/cenarios/promo.py` só com as
  camadas e sprites do jogo, mais a entrada da masmorra e o baú pintados no mesmo motor): `capa-larga`,
  `capa-retrato` e os três cartões (biblioteca, cripta, progresso).
- **Menu.** "Flashcards" com selo Beta no topo, na barra de baixo do celular (7 itens) e no Menu.
- **Aprendizagem** (`src/flashcards/aprendizagem.ts`): `registrarEstudo` com chave única por evento
  (`sessão:posição:id` no Estudo, `cripta:semente:modo:rodada:id` na Cripta), diário por dia local
  (`flashcards:diario`), primeira resposta objetiva (`po`), última autoavaliação (`av`).
  `calcularEstatisticas` e `calcularPlano`. Testes em `fixtures/testar_aprendizagem.mjs`.
- **Revisão.** Atalhos Revisões de hoje, Errei, Hesitei, Nunca estudados e Por assunto, por link
  direto `#/flashcards/biblioteca?categoria=…&area=…&n=…` (`categoria=plano` usa o cronograma).
  Na Cripta não se presume confiança: acerto = certeza, acerto com pista = dúvida, erro volta hoje.
- **Desempenho e cronograma de flashcards:** separados dos de questões; o cronograma fica no aparelho
  (`flashcards:plano`). Atalhos discretos em `#/dados`, `#/revisao` e `#/cronograma` (`AtalhoFlashcards`).
- **Ranking.** Aba Cripta no ranking do site (`src/paginas/RankingCripta.tsx`), Normal e Difícil
  separados, pela RPC `ranking_cripta` (SQL parte 18, já rodado pelo Tales). Torre sem ranking.
- **Opinião.** `enviar_opiniao_flashcards` (SQL parte 18), na central, no fim da sessão de estudo e no
  fim da partida (`#/flashcards?opiniao=fim_sessao`), e um convite discreto depois de 3 sessões.
- **Desempenho (14/10, em PR draft):** ideias 68 e 69 concluídas no PR draft #249: tiras por andar e Opus com fallback MP3. [DESEMPENHO-14-10.md](DESEMPENHO-14-10.md) traz medidas e comandos. Não publicado.
- **Som no celular** (`efeitos/sons.ts`): destrave no `pointerup/touchend/click`, buffer mudo,
  `audioSession = playback`, retomada ao voltar para a aba e escolha "com som / sem som" na primeira
  entrada. **Ainda não confirmado num celular de verdade**: pedir ao Tales para testar.
- **Limite.** Servidor ligado (`VITE_FLASHCARDS_LIMITE=true`): o mesmo interruptor das questões
  (`paywall_ativo`) decide; grátis 10 a cada 24 h, assinante sem limite.

## Parou aqui antes do beta (13/10/2026, 20:52)

- O PR #220 foi mesclado na base `claude/pdfs-questoes-tp64dr`, com as Etapas 2 a 8, as correções da revisão do Codex e as dificuldades Fácil, Normal e Difícil. O merge publica o jogo na rota escondida.
- Os comentários do Codex nos PRs #219 e #220 foram respondidos e resolvidos.
- A branch `claude/sharp-goodall-pl7kp7` foi recomeçada a partir da base. Para trabalho novo, abra um PR novo.
- Testado: `npm test`, `npx tsc --noEmit`, `npm run build` e Playwright em 1400×860, 390×844, 844×390, 600×360 e 568×320.
- **Ranking por dificuldade no servidor:** feito no beta (parte 18: `iniciar_corrida_flashcards` com `p_nivel`, `ranking_cripta`).

## Próximos passos sugeridos (em ordem)

1. **Pintar Torre e Salão** com `scripts/cenarios/` (veja "Como fazer um cenário novo" em ARTE.md) e ligar em `CENAS_PINTADAS`.
2. **Adversários que ainda usam o desenho antigo** (na ordem em que aparecem): Mão dos Tendões (elite, andar 6), espectro (Espectro do Mediano, andar 7; Arquiteto e Necromante são variantes), Harpia do Manguito (7), quimera (Quimera da Pseudoartrose, 8; Basilisco e Escafoide são variantes) e os chefes rei, leviatã e arconte. Use `scripts/sprites/cavaleiro.py` (humanoide com três variantes) ou `raptor.py` (bicho com variantes) como modelo.
3. **Celular (390×844), para quem mexe no layout da Arena:** com o Dragão Rubro (1472/1472) e o Dragão Ancestral (2280/2280), a placa do chefe com vida de quatro dígitos empurra a coluna e corta as alternativas e o botão Atacar na borda direita. O Dragão de Ossos (570/570) quase cabe. Não é da folha: a placa e a coluna do sprite precisam encolher (Arena.tsx/CSS, fora do escopo de arte).

### Feito em 15/10/2026 (arte e música, pendências liberadas pelo Tales)

- **Ideia 53, raptor:** `scripts/sprites/raptor.py` grava `raptor`, `raptor-sombrio` e `raptor-alfa`. Foi feito com as ferramentas do `cavaleiro_chibi.py` (como goblin, esqueleto e aranha), e não com o motor de volume do `assar.py`, para combinar com as folhas mais novas.
- **Ideia 54, dragão:** `VARIANTES` em `dragao.py`; `python3 scripts/sprites/assar.py dragao --variante escarlate|ancestral` (uns 12 minutos cada). Gancho já existia (`assadoDe` no Hud e a cor do sopro em `ataques.ts`).
- **Escudo do herói no estágio 6:** menor (`escala_escudo=0.84` em `cavaleiro_chibi.py`, que é o gerador do herói em jogo; `PROP[6]['escudo']` de `heroi.py` também caiu para 0,90). Só `heroi-6` mudou.
- **Faixa "sala":** o fim do laço era G, G e pausa, e a volta entrava 5,5 dB mais alta. Agora o último compasso vira na dominante e a melodia desce até a nota do começo; degrau de 2,4 dB. `conferir.py` ganhou a coluna "degrau dB" (acima de uns 4 dB a emenda se ouve; masmorra e covil ainda passam de 10 dB).
- **Folhas novas:** corvo, morcego, escaravelho, Slime Sinovial (`gosma.py`, variante `sinovial`) e os cavaleiros (`cavaleiro.py`: base = Cavaleiro da Tala, `fibula`, `artrodese`).
- As folhas novas foram gravadas em PNG de paleta sem perda (cerca de 40% do tamanho).

## Ainda não feito do pedido de direção criativa

- **Cenários pintados:** faltam deserto dos ossos, pântano da necrose, observatório, jardim dos curandeiros, fortaleza das placas e trono do dragão.
  - Já pintados: floresta, masmorra, covil e biblioteca.
- **Personagens jogáveis:** aparências alternativas (Arcanista, Caçadora, Paladino etc.), sem vantagem no ranking.
- **Equipamentos visíveis:** capacete, armadura, escudo e arma que mudem o sprite do herói.
- **Torre do Título:** marcos nos andares 10, 25, 50, 75 e 100, mapa da subida e histórico.
- **Sons:** revisão completa dos efeitos (acerto, erro, crítico, entrada de chefe, sala secreta) e transição suave entre músicas.
- **Ranking da Torre:** só depois de validado (roteiro do beta).

## Interface e acessibilidade (14/10, PR #250 draft)

Ideias 62 e 65 concluídas para revisão, sem merge: três preferências de leitura, foco nos diálogos e cortina de pixels. [ACESSIBILIDADE-14-10.md](ACESSIBILIDADE-14-10.md) traz capturas e verificações.

## Como trabalhar

- **Instalar:** `npm install`.
- **Servidor local:** `VITE_SUPABASE_URL=sem npx vite --port 5199`.
- **Gancho de teste** (só no modo de desenvolvimento): `window.__torneio`.
  - `ir(andar, semente)` leva a partida a um andar.
  - `definir(partida)` troca o estado.
  - `cena(nome)` troca o cenário.
- **Capturas com Playwright:**
  - usar `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`;
  - semente fixa em `Math.random`;
  - tamanhos 1400×860, 390×844 e 844×390 (deitado).
  - Os roteiros antigos ficavam em `.capturas/` (fora do git) e precisam ser recriados.
- **Antes de cada PR:**
  - `npm test`;
  - `npx tsc --noEmit`;
  - `npm run build`;
  - Playwright nos três tamanhos.
- **Ao enviar:** sempre `git push -u origin claude/sharp-goodall-pl7kp7`. Depois de um merge, a branch local pode ficar ligada à base, e aí um `git push` simples não envia.
- **Depois do merge de um PR:** recomeçar a branch a partir da base.

## Restrições (não mudam)

- **Publicar:** ~~só na rota escondida `#/flashcards`, sem banner, menu, ranking público, divulgação
  ou página de vendas~~ (regra até 13/10/2026). Desde o beta público, divulgar dentro do site é
  permitido (veja LANCAMENTO-BETA.md); fora do site (e-mail, mensagem, rede social), não.
- **Não mexer:**
  - assinaturas e limites;
  - questões, gabaritos e comentários;
  - dados de usuários.
- **Preservar:** as feature flags e o progresso salvo. Partidas antigas precisam continuar abrindo.
- **Arte:**
  - só pintura nossa, sem imagem baixada nem gerada por IA;
  - sem anatomia nos enfeites;
  - nada copiado de outros jogos.
- **Commits e PRs:** sem identificador de modelo.
