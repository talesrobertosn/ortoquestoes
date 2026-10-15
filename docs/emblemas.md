# Emblemas: princípios e banco de ideias

## Princípio (decisão do dono do projeto, 07/10/2026)

Emblema não é o que qualquer um consegue. Tem que ser **difícil e desafiador**, no espírito de um
souls-like: a pessoa precisa brigar pelo emblema. Ao criar um emblema novo:

- o primeiro nível já exige esforço real (nada de "responda 10 questões");
- os níveis altos (esmeralda e lendário) são para pouquíssimas pessoas;
- sempre que der, medir **qualidade** (acerto, constância, domínio) e não só volume;
- exceção aceita: emblemas limitados pelo acervo (imagem: 608 questões com imagem) podem ter
  metas menores;
- não tirar emblema de quem já conquistou: endurecer é criar níveis novos acima.

## Estilo da arte (decisão do dono do projeto, 07/10/2026)

**Sempre pixel art, com pegada de RPG medieval.** Os motivos vêm do mundo de fantasia medieval:
armas e armaduras (espada, elmo, escudo), castelos e estandartes, grimórios e pergaminhos,
poções e elixires, runas, dados, velas, forja e bigorna, coroas e gemas. Nada de anatomia
desenhada. O metal e o brilho seguem o nível (bronze, prata, ouro, esmeralda e lendário com aura
roxa), e dentro da família cada degrau acrescenta um detalhe (pluma, asas, mais torres, runas).

Arte gerada por `python3 scripts/gerar_emblemas_provisorios.py` (grade 32×32 ampliada para
128×128, sem suavização); a arte feita à mão entra em `ARTE_PROPRIA` e nunca é sobrescrita.

| Família | Arte |
|---|---|
| Pseudartrose | Espada partida e reforjada com cintas de metal (runas no lendário) |
| Olho de radiologista | Espelho de vidência com o olho, gemas na moldura |
| Certeza cirúrgica | Elmo de cavaleiro; pluma, depois asas |
| Provas vencidas | Torre, castelo, fortaleza com bandeira dourada |
| Generalista | Grimório com gema e runas |
| Hora de ouro | Elixir dourado; mais frascos a cada nível |
| Secretas | Dado (chute), triângulo rúnico de três gemas (tríade), vela da vigília (véspera), bigorna e martelo (Wolff) |

O código está em `src/estado/conquistas.ts`; os dados do índice que os emblemas usam são montados
em `src/estado/usarConquistas.ts`; o teste é `node fixtures/testar_conquistas.mjs`. A arte em pixel
art, quando existir, vai em `public/emblemas/<id>.png` e o id entra em `src/dados/imagensEmblemas.ts`;
até lá aparece a medalha desenhada.

## Feitos em 07/10/2026

| Família | Níveis | Regra |
|---|---|---|
| Pseudartrose | 10 ouro, 50 esmeralda, 150 lendário | Questões erradas 3 vezes ou mais e hoje **dominadas** (acertadas em todas as revisões). |
| Olho de radiologista | 50 prata, 200 ouro, 500 lendário | Acertos em questões com imagem. |
| Certeza cirúrgica | 30 ouro, 60 esmeralda, 120 lendário | Acertos seguidos marcados com "tenho certeza"; qualquer erro zera; acerto com dúvida ou chute não soma. |
| Provas vencidas | 1 ouro, 8 esmeralda, 20 lendário | TEOT ou TARO de um ano com todas as questões respondidas e 70% delas certas. |
| Generalista | 30 ouro, 100 esmeralda, 200 lendário | Assuntos com pelo menos 5 questões respondidas e 80% de acerto. |
| Hora de ouro | 30 ouro, 50 esmeralda, 70 lendário | Acertos dentro de uma mesma janela de 60 minutos. |
| Secreta: Chute de mestre | esmeralda | 5 chutes certos seguidos. |
| Secreta: Tríade terrível | lendário | 3 sessões perfeitas de 20+ questões no mesmo dia. |
| Secreta: Véspera | esmeralda | No dia anterior à prova teórica do TEOT, sessão de 100 questões com 70%. Atualizar `DATAS_PROVA` todo ano. |
| Secreta: Lei de Wolff | esmeralda | 6 semanas seguidas, cada uma com mais questões que a anterior, começando com 50. |

## Feitos em 07/10/2026, segundo lote (todas as ideias do brainstorm)

Os de servidor dependem da migração `202610070500_emblemas_dificeis.sql` (parte 11 do painel):
ela cria `feitos_diarios` (Questão do Dia, fila zerada, meta do Cronograma), `conquistas_usuario`
(trava: emblema conquistado não se perde, nem quando o histórico de 50 sessões ou o ranking de 30
dias esquecem) e a RPC `meus_feitos()`. Sem o SQL aplicado, esses emblemas ficam em zero.
O cliente está em `src/conta/feitos.ts`.

| Família | Níveis | Regra | Arte |
|---|---|---|---|
| Calibragem | 90%, 95%, 98% | Acerto entre as respostas com "tenho certeza" (300 no mínimo) | Balança |
| Contra a corrente | 50, 150, 300 | Acertos de primeira onde a turma acerta menos da metade (servidor) | Escudo do cavaleiro errante |
| Ortopedista completo | 4, 8, 11 temas | 80% de primeira com 100+ respostas no tema | Távola Redonda |
| Nota de corte | 3, 10, 25 | Sessões de 100+ com 70% | Edital com lacre |
| Curva de aprendizado | +10, +15, +20 | Primeiras 500 contra últimas 500 questões novas | Escadaria até a torre |
| Run sem dano | 7, 30, 60 dias | Meta diária e 70% em cada dia seguido | Amuleto de proteção |
| Chefões | 1 cada | Sem morrer (simulado cronometrado de 100 com 85%); TEOT inteiro (um ano, simulado só, 2,4 min por questão, 75%); New Game+ (tema inteiro dominado); Platina (todos os não secretos) | Frasco de Estus, espada na pedra, anel rúnico, cálice |
| Questão do Dia | 30, 100, 365 dias seguidos | Registrada ao abrir o cartão depois de responder | Sino da torre |
| Fila zerada | 7, 30, 90 dias seguidos | Revisar hoje vazio e meta diária cumprida | Portão da masmorra aberto |
| Cronograma | 28, 84 dias; Do início ao fim | Meta do dia cumprida (folgas não quebram); lendário: todos os dias até a reta final | Relógio de sol |
| Simulado Nacional | 3, 6, 12 seguidas; elite (10%); campeão | Entregue no tempo; elite e campeão em edições com 20+ classificados | Estandarte, brasão, coroa de louros |
| Arena semanal | 1º uma semana; 4 seguidas no pódio; 4 seguidas em 1º | Última posição de cada semana encerrada no ranking semanal | Lança de justa, escudo de torneio, trono |
| Indicação | 1, 3, 10 assinantes; 5 com 30 dias | Indicados que assinaram; indicados com 30 dias de estudo | Chaves do castelo, tenda |
| Revisor de banca | 3, 10, 25 | Relatos de erro marcados como resolvidos | Lupa sobre o pergaminho |
| Conselho editorial | 100, 300, 1.000 | Comentários avaliados (útil ou não) | Livro aberto com pena |

Adaptação: a ideia "Professor" (comentários seus marcados como úteis) virou **Conselho editorial**,
porque o site não tem comentários escritos por usuários; a avaliação dos comentários é o que existe
e ajuda a melhorar o acervo.

## Feitos em 15/10/2026: revisão e Flashcards

Pedido do Tales: mais conquistas para quem revisa e emblemas de Flashcards que apareçam no ranking
geral e no ranking de Flashcards. Arte pelo mesmo script (`scripts/gerar_emblemas_provisorios.py`,
lote 3). As contas de revisão estão em `src/estado/metasRevisao.ts`; as de Flashcards, em
`src/flashcards/conquistas.ts` e `src/flashcards/emblemas.ts`. Teste: `node fixtures/testar_conquistas.mjs`.

**Revisão** (entram na Platina)

| Família | Níveis | Regra | Arte |
|---|---|---|---|
| Revisões feitas | 250 prata, 1.000 ouro, 3.000 esmeralda, 8.000 lendário | Respostas a questões já respondidas antes (tentativas além da primeira) | Pilha de pergaminhos |
| Constância na revisão | 7 prata, 21 ouro, 60 esmeralda, 120 lendário | Dias seguidos com 10 revisões ou com a fila de Revisar hoje zerada; folgas do ritmo não quebram | Tábua de pedra com dias riscados |
| Resgate de atrasadas | 50 ouro, 200 esmeralda, 500 lendário | Revisões feitas 3+ dias depois do vencimento (a escada é refeita pelo histórico de cada questão) | Trompa |
| Secreta: Muralha derrubada | esmeralda | 100 revisões num mesmo dia | Muralha com rombo |

**Flashcards** (ids `fc-…`; ficam fora da Platina porque são outro produto, em beta). Fora do jogo, os
textos dizem sempre "Flashcards", nunca "Cripta".

| Família | Níveis | Regra | Fonte | Arte |
|---|---|---|---|---|
| Profundezas | andar 6, 12, 21, 30, 45 | Andar mais fundo numa partida | **Servidor** (`meus_recordes_flashcards`, corridas validadas); o recorde do aparelho não conta | Poço com escada em espiral |
| Mestre da revisão | 3, 7, 14, 30, 60 dias | Dias seguidos com 15 revisões de flashcards | Registros dos flashcards (sincronizados) | Leque de cartas |
| Especialista | 25 ouro, 100 esmeralda, 250 lendário | Flashcards dominados numa mesma área (todas as voltas da escada) | Registros | Astrolábio |
| Bestiário | 8, 20, 43 (todos) | Adversários diferentes vencidos (o dragão do topo da Torre fica de fora) | Aparelho | Livro com marcas de garra |
| Sem errar | 10, 25, 50 | Acertos seguidos numa partida | Aparelho (recorde `melhorSequencia`) | Corrente sem elo partido |
| Colecionador de lendários | 50, 200, 500 | Flashcards lendários diferentes acertados | Registros + raridade do acervo (carregado só na página de Conquistas) | Carta lendária com coroa |
| Secretas: Caçador de dragões | Dragão de Ossos (ouro); os dois dragões das profundezas (esmeralda) | Ossos e Rubro da Artrose vencidos | Aparelho | Presas no cordão |

A Torre do Título saiu da entrada do jogo, por isso a família dela e a dos "três dragões" (que incluía
o dragão do topo da Torre) não entraram. Bestiário, dragões e sem errar ainda dependem do aparelho: o
servidor não registra adversários nem sequências; quando registrar, trocar a fonte. Uma vez conquistado,
o emblema é travado no servidor (`registrar_conquistas`) como os outros.

**No ranking:** o ranking geral já mostra a vitrine (até 3 emblemas escolhidos, inclusive os de
Flashcards). O ranking de Flashcards (`#/ranking?aba=flashcards`) mostra o melhor emblema de Flashcards
travado da pessoa e, depois, a vitrine, pela RPC `ranking_flashcards_emblemas` (parte 25 do SQL,
`supabase/migrations/202610151800_emblemas_revisao_flashcards.sql`). Sem o SQL, o ranking aparece como
antes, sem emblemas, e os emblemas de andar ficam em zero.

## Banco de ideias (brainstorm, ainda não decidido)

**Aproveitamento**
- *Ortopedista completo*: 80% de acerto de primeira em **todos os 11 temas**, com pelo menos 100 questões em cada.
- *Nota de corte*: 10 sessões de 100 questões com 70% ou mais (simulado de prova inteira).
- *Curva de aprendizado*: aproveitamento das últimas 500 questões 15 pontos acima das primeiras 500.
- *Calibrado*: com 300+ respostas marcadas com certeza, 95% delas certas (saber o que sabe).
- *Contra a corrente*: acertar de primeira 50 questões que a maioria da turma erra (o filtro "a turma erra" já existe).

**Constância e cronograma**
- *Fila zerada*: terminar o dia com a fila de revisão vazia 30 dias seguidos.
- *Run sem dano*: 30 dias seguidos de sequência com pelo menos 70% de acerto em cada dia.

**Chefes (boss fights)**
- *Chefe: TEOT inteiro*: uma prova do TEOT de um ano numa única sessão cronometrada, no tempo da prova, com 75%.
- *Sem morrer*: sessão cronometrada de 100 questões com 85%.
- *New Game+*: dominar todas as questões de um tema.
- *Platina*: todos os emblemas não secretos.

**Comunidade e qualidade do acervo**
- *Professor*: 10 comentários seus na comunidade marcados como úteis.
- *Revisor de banca*: 5 erros reportados por você e corrigidos no acervo.

**Indicação**
- *Turma completa*: 5 amigos indicados que estudaram 30 dias.
