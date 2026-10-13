# Direção de arte do Torneio de Flashcards (HD-2D)

Pedido do Tales em 13/10/2026: trocar a arte "vetorial" por **pixel art HD-2D**, no espírito de Octopath Traveler II, sem copiar nada de lá (nem personagens, nem assets, nem logos). Pixel art de verdade, desenhada pixel a pixel, e luz moderna por cima.

## O que mudou

| Antes | Agora |
|---|---|
| Jogo ocupava a página | **Modal premium**: ~84vw × 88dvh no computador, fundo escurecido, X no canto (clicar fora não fecha, para não perder a partida), foco preso no modal; no celular ocupa a tela inteira |
| Personagens pintados em vetor | **Sprites em pixel art nativa** (`src/flashcards/efeitos/personagens.ts`): herói chibi, Golem de Gesso com rachaduras que brilham, Serpente do Ciático, Guardião do Acetábulo maior e com aura; 2 quadros de animação |
| Cenário de fundo plano | **Diorama em planos** (`pintura.ts` + `Cenario.tsx`): fundo desfocado, meio nítido, tilt-shift no alto e embaixo, bloom, feixes de luz, poeira/bokeh, primeiro plano desfocado, névoa e vinheta; paralaxe leve com o mouse |
| Tabuleiro solto | **Estrado de pedra** em pixel art integrado ao chão do cenário (`pintarMesa`) |
| Sons simples | Sons em camadas com reverb e compressor; **som ligado por padrão** (pedido do Tales), com volumes separados de efeitos e ambiente nos Ajustes |
| Tamanhos com unidades de container (quebravam no celular) | Layout em grid sem `cqw/cqh`; mão em leque no computador e 2×2 no celular; imagem do flashcard abre ampliada em pop-up |

## Versão 3 (13/10/2026)

- **Sprites novos**, no mesmo esqueleto articulado com 6 poses: Dragão de Ossos (asas de membrana
  rasgada em arcos, costelas com fogo-fátuo no peito, crânio de dragão com chifres e órbita em chama),
  Raptor do Menisco, Gosma de Cimento (parafusos e bolhas presos na massa), Mímico do Arsenal (caixa
  de instrumentais com dentes de lâmina), o Velho Preceptor e a Caixeira do Arsenal.
- **Variantes de paleta:** dragão escarlate e ancestral (ossos negros, asas de ouro, fogo roxo),
  raptor sombrio e alfa, gosma ácida e rainha (com coroa).
- **O Dragão de Ossos foi pedido pelo Tales** (13/10/2026). É um esqueleto de fantasia (de dragão),
  estilizado; a regra continua: nada de anatomia humana nos enfeites.
- **Herói:** o cavaleirinho original continua igual por baixo (o Tales não quis outro); os estágios
  só acrescentam peças: ombreira (2), capa longa (3), asas de ouro no elmo e lâmina que brilha (4),
  asas de luz, coroa e auréola (5). O canvas cresceu para caber as peças; a caixa do corpo é a mesma.
- **Cenários:** covil do dragão (lava, estalactites, montes de moedas) e o terraço da Torre (céu do
  entardecer, mar de nuvens, ameias, estandartes e braseiros).
- **Ícones novos (20×20):** ampulheta, cartas, alvo, nuvem, muralha, espadas, folha, fênix, moeda,
  bolsa, lanterna e porta.

## Versão 5 (13/10/2026): personagens em volume e trilha em arquivos

**Como fazer um personagem novo** (`scripts/sprites/`):

1. Crie `scripts/sprites/<nome>.py` com `NOME`, `CAM` (tamanho do quadro e âncora dos pés), `TEMPOS`, `MATS` (materiais: rampa de cor, brilho, textura) e duas funções:
   - `montar(pose)`: monta a cena com `Osso` (esqueleto) e formas (`sd_esfera`, `sd_elipsoide`, `sd_cone_redondo`, `sd_caixa`, `sd_toro`, `sd_arco`);
   - `poses()`: devolve as animações `parado`, `preparo`, `golpe`, `dano`, `derrota` e `vitoria`, cada uma uma lista de poses.
2. Prévia: `python3 scripts/sprites/assar.py <nome> --previa /tmp/x.png --escala 3`.
3. Folha final: `python3 scripts/sprites/assar.py <nome>` e depois `python3 scripts/sprites/indice.py`.
4. O jogo usa a folha automaticamente quando existe uma com o nome do sprite. Sem ela, usa o desenho antigo.

Herói: `python3 scripts/sprites/assar.py heroi --estagio N` (de 1 a 6).

**Trilha** (`scripts/musica/`): `temas.py` tem as partituras, `sintese.py` os instrumentos. `python3 scripts/musica/gerar.py [tema...]` grava os mp3 em `public/flashcards/musica/`, e `python3 scripts/musica/conferir.py` confere volume, picos e emendas. Não usamos nenhuma amostra de terceiros.

## Versão 4 (13/10/2026): bestiário e biomas

**Arquétipos novos** (`src/flashcards/efeitos/bestas.ts`): corvo, morcego, aranha,
escaravelho, goblin, esqueleto (variante mago), cavaleiro (tala, fíbula com lança,
artrodese com escudo-torre), espectro (nervo, necromante, arquiteto), quimera
(quimera, escafoide alada, basilisco), mão, leviatã, rei (carpo, consolidação),
arconte, ent e harpia. São criaturas de fantasia estilizadas, sem anatomia
desenhada; o nome do inimigo faz a ponte com a ortopedia.

**Inimigos novos** (`motor/bestiario.ts`): 9 comuns, 6 elites e 8 chefes, cada um
com nível, andar de estreia, cenário, habilidade (crítico, rajada, carga,
barreira, regeneração, veneno, roubo, divisão, segunda fase) e recompensa. A
Cripta passa a ter um chefe novo em cada ato até o andar 42; a Torre usa os
novos chefes nos andares 10 a 90.

**Biomas** (`efeitos/pintura.ts`): Forja da Osteossíntese, Coliseu do Acetábulo,
Jardim das Fises, Laboratório Biomecânico, Caverna da Pseudoartrose, Templo do
Escafoide, Passarela Suspensa, Cripta Óssea (catacumba), Ala de Treino e
Biblioteca Ancestral (arquivo). Cada um tem fundo, meio, luzes (bloom), mesa com
paleta própria e partícula ambiente (faíscas, pólen, esporos, poeira, vento, runas).
O Salão do Dragão é o covil; a Torre dos Nervos é a torre.

**Som** (`efeitos/sons.ts`): trilha e ambiente próprios por bioma, trilha de elite
e famílias sonoras dos golpes (alado, osso, espectral, inseto, além das antigas).

## Versão 6 (13/10/2026): cenários pintados offline

Floresta das Fises Antigas (cena `campo`) e Biblioteca Ancestral (Estudo) são
pintadas uma vez, fora do jogo, e salvas em camadas PNG pequenas.

**Como fazer um cenário novo:**

1. Crie `scripts/cenarios/<nome>.py` usando `scripts/cenarios/pintor.py`. Ele oferece:
   - `Tela`, com `tingir`, que escolhe o degrau da rampa pela luz e pontilha só a transição;
   - `velar`, para névoa e perspectiva;
   - `fbm`, `ruido` e `voronoi`.
2. O script precisa gerar 4 camadas por formato, sempre `<nome>-<formato>-<camada>.png`:
   - camadas: `fundo`, `meio`, `frente` e `luz`;
   - formatos: paisagem 520×330 e retrato 250×470.
3. Gere: `python3 scripts/cenarios/<nome>.py` (por padrão grava em `public/flashcards/cenarios/`). Para prévia: `python3 scripts/cenarios/<nome>.py /tmp/pasta`.
4. Ligue no jogo: acrescente a cena em `CENAS_PINTADAS` (`src/flashcards/efeitos/cenariosPintados.ts`).
   - Cada camada é recortada no centro, em escala inteira (no mínimo 2×).
   - A `luz` entra em screen e no bloom.
   - Se a imagem não carregar, o jogo usa a cena antiga.

**Regras de arte:**
- valores: bordas escuras e frias, centro claro e quente, atrás do flashcard;
- contorno de 1 px nos objetos;
- nada de anatomia nos enfeites;
- só pintura nossa, sem imagem baixada nem gerada por IA.

## Motor de pixel art

`src/flashcards/efeitos/pixel.ts`: classe `Grade` desenha formas numa grade pequena com rampas de 4 tons por material (gesso, pedra, aço, ouro, couro, escama…), pontilhado Bayer só na faixa de transição, contorno seletivo (selout) e contorno interno pela ordem das formas. O canvas é ampliado com `image-rendering: pixelated` em escala inteira (2× ou 3×), então cada pixel do sprite é um bloco nítido, sem filtro "pixelizante".

## Assets: provisórios × definitivos

Todos os gráficos são gerados por código (nenhuma imagem baixada, nenhuma imagem gerada por IA). Nenhum desenho de anatomia nos enfeites.

| Asset | Situação |
|---|---|
| Modal, HUD, flashcard em pergaminho, botões, tipografia (Cinzel + Alegreya) | Definitivo para a fatia vertical |
| Herói e Golem (Campo) | Definitivos para a fatia vertical; podem ganhar mais quadros de animação |
| Floresta das Fises (Campo, Batalha) e Biblioteca Ancestral (Estudo) | Pintadas offline (v6); definitivas para a fatia vertical |
| Serpente, Guardião, Masmorra e Salão das velas | **Provisórios**: funcionam, mas ainda precisam de polimento (o muro do Salão tem hera demais e o mármore está carregado) |
| Ícones de poderes e relíquias (`dados/sprites.ts`) | Provisórios (16×16, simples) |
| Sons sintetizados (`efeitos/sons.ts`) | Provisórios bons; podem ser trocados por gravações próprias depois |
| Imagens dos flashcards | Reais, das questões do acervo (`public/imagens`), com a fonte |

## Como conferir

Servidor local (`VITE_SUPABASE_URL=sem npm run dev -- --port 5199`) e prints com Playwright nos tamanhos 1709×864, 1440×900, 1280×720, 390×844 e 360×780, cobrindo: alternativa selecionada, golpe, verso certo e errado, crítico, vitória, recompensas, troca de andar, chefe, pista, escudo, derrota e Estudo (frente e verso). Em 13/10/2026 nenhum tamanho teve erro de console nem rolagem horizontal da arena.
