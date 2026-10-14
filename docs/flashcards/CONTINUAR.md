# Como continuar a Cripta (para qualquer agente: Claude Code, Codex ou outro)

**Último ajuste visual e de áudio (13/10/2026):** [Polimento do beta](POLIMENTO-AUDIO-OPINIAO.md): opinião redesenhada, controle vertical com início em 20%, camadas do cenário alinhadas, capa integrada e proposta documentada de herói adulto.

**Orientação mais recente:** [Jornada única](JORNADA-UNICA.md), 13/10/2026: ranking sem níveis, progressão por turma e histórico pessoal, entrada com Cripta/Biblioteca e cronograma dentro de Flashcards. As seções antigas abaixo são histórico quando conflitarem.

Atualizado em 14/10/2026, à tarde. Veja "PAROU AQUI" logo abaixo.

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

1. **Folha em volume** para o raptor, que estreia cedo (o esqueleto, o goblin, o ent, o mímico e o Cogumelo da Necrose já têm arte nova, de 14/10). Use o modelo de `scripts/sprites/gosma.py` e `python3 scripts/sprites/assar.py <nome>`.
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
