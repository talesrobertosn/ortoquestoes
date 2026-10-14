# Como continuar a Cripta (para qualquer agente: Claude Code, Codex ou outro)

**Último ajuste visual e de áudio (13/10/2026):** [Polimento do beta](POLIMENTO-AUDIO-OPINIAO.md): opinião redesenhada, controle vertical com início em 20%, camadas do cenário alinhadas, capa integrada e proposta documentada de herói adulto.

**Orientação mais recente:** [Jornada única](JORNADA-UNICA.md), 13/10/2026: ranking sem níveis, progressão por turma e histórico pessoal, entrada com Cripta/Biblioteca e cronograma dentro de Flashcards. As seções antigas abaixo são histórico quando conflitarem.

Atualizado em 13/10/2026, 21h. Tudo o que foi feito está mesclado na base e publicado; não há PR aberto.

## PAROU AQUI (14/10/2026): leia isto primeiro

Branch de trabalho: `claude/eloquent-brahmagupta-u85fiy`, com o PR #227 aberto para a base `claude/pdfs-questoes-tp64dr`. O merge está autorizado pelo Tales quando o CI "verificar" ficar verde.

**Já feito no PR #227:**
- ordem da Cripta em 4 grupos;
- poderes Mapa do especialista e Desvio de área, mais o talento "Rota de estudo";
- 3 tentativas grátis na Cripta (SQL parte 19, que **o Tales precisa colar no Supabase**);
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
- **Próximos passos:**
  1. Iterar: `python3 scripts/sprites/cavaleiro2d.py --previa /tmp/x.png --estagios 4 --escala 5`. Depois ver todos os estágios (`--estagios 1,2,3,4,5,6`) e as animações (`--anim golpe|dano|derrota|vitoria|preparo`).
  2. Assar: `python3 scripts/sprites/cavaleiro2d.py`, depois `python3 scripts/sprites/indice.py`.
  3. Conferir a escala e a âncora no `Hud.tsx`. O quadro agora é 120×132, com âncora (56,126); `escalaAssada` usa `CRESCE.heroi`.
  4. Gerar o mascote (`--mascote`) e a arte da capa (`python3 scripts/cenarios/promo.py`).
  5. Capturas com Playwright em 1400×860, 390×844 e 844×390. Mostrar ao Tales antes de mesclar.
  6. Atualizar a linha "Arte" em RESUMO-14-10.md.

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

1. **Folhas em volume** para raptor, mímico e esqueleto, que estreiam cedo. Use o modelo de `scripts/sprites/gosma.py` e `python3 scripts/sprites/assar.py <nome>`.
2. **Pintar Torre e Salão** com `scripts/cenarios/` (veja "Como fazer um cenário novo" em ARTE.md) e ligar em `CENAS_PINTADAS`.
3. **Variantes escarlate e ancestral do Dragão**: acrescente `VARIANTES` em `scripts/sprites/dragao.py`.
4. **Escudo do herói no estágio 6**: reduzir (`PROP[6]['escudo']` em `scripts/sprites/heroi.py`).
5. **Emenda da faixa "sala"**: revisar com `python3 scripts/musica/conferir.py`.

## Ainda não feito do pedido de direção criativa

- **Cenários pintados:** faltam deserto dos ossos, pântano da necrose, observatório, jardim dos curandeiros, fortaleza das placas e trono do dragão.
  - Já pintados: floresta, masmorra, covil e biblioteca.
- **Personagens jogáveis:** aparências alternativas (Arcanista, Caçadora, Paladino etc.), sem vantagem no ranking.
- **Equipamentos visíveis:** capacete, armadura, escudo e arma que mudem o sprite do herói.
- **Torre do Título:** marcos nos andares 10, 25, 50, 75 e 100, mapa da subida e histórico.
- **Sons:** revisão completa dos efeitos (acerto, erro, crítico, entrada de chefe, sala secreta) e transição suave entre músicas.
- **Ranking da Torre:** só depois de validado (roteiro do beta).

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
