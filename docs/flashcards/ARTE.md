# Direção de arte do Torneio de Flashcards (HD-2D)

Pedido do Tales em 13/10/2026: trocar a arte "vetorial" por **pixel art HD-2D**, no espírito de Octopath Traveler II, sem copiar nada de lá (nem personagens, nem assets, nem logos). Pixel art de verdade, desenhada pixel a pixel, e luz moderna por cima.

## O que mudou

| Antes | Agora |
|---|---|
| Jogo ocupava a página | **Modal premium**: ~84vw × 88dvh no computador, fundo escurecido, X no canto, Esc fecha, foco preso no modal; no celular ocupa a tela inteira |
| Personagens pintados em vetor | **Sprites em pixel art nativa** (`src/flashcards/efeitos/personagens.ts`): herói chibi, Golem de Gesso com rachaduras que brilham, Serpente do Ciático, Guardião do Acetábulo maior e com aura; 2 quadros de animação |
| Cenário de fundo plano | **Diorama em planos** (`pintura.ts` + `Cenario.tsx`): fundo desfocado, meio nítido, tilt-shift no alto e embaixo, bloom, feixes de luz, poeira/bokeh, primeiro plano desfocado, névoa e vinheta; paralaxe leve com o mouse |
| Tabuleiro solto | **Estrado de pedra** em pixel art integrado ao chão do cenário (`pintarMesa`) |
| Sons simples | Sons em camadas com reverb e compressor; **som ligado por padrão** (pedido do Tales), com volumes separados de efeitos e ambiente nos Ajustes |
| Tamanhos com unidades de container (quebravam no celular) | Layout em grid sem `cqw/cqh`; mão em leque no computador e 2×2 no celular; imagem do flashcard abre ampliada em pop-up |

## Motor de pixel art

`src/flashcards/efeitos/pixel.ts`: classe `Grade` desenha formas numa grade pequena com rampas de 4 tons por material (gesso, pedra, aço, ouro, couro, escama…), pontilhado Bayer só na faixa de transição, contorno seletivo (selout) e contorno interno pela ordem das formas. O canvas é ampliado com `image-rendering: pixelated` em escala inteira (2× ou 3×), então cada pixel do sprite é um bloco nítido, sem filtro "pixelizante".

## Assets: provisórios × definitivos

Todos os gráficos são gerados por código (nenhuma imagem baixada, nenhuma imagem gerada por IA). Nenhum desenho de anatomia nos enfeites.

| Asset | Situação |
|---|---|
| Modal, HUD, flashcard em pergaminho, botões, tipografia (Cinzel + Alegreya) | Definitivo para a fatia vertical |
| Herói e Golem (Campo) | Definitivos para a fatia vertical; podem ganhar mais quadros de animação |
| Cena do Campo (Batalha) e Biblioteca (Estudo) | Definitivas para a fatia vertical |
| Serpente, Guardião, Masmorra e Salão das velas | **Provisórios**: funcionam, mas ainda precisam de polimento (o muro do Salão tem hera demais e o mármore está carregado) |
| Ícones de poderes e relíquias (`dados/sprites.ts`) | Provisórios (16×16, simples) |
| Sons sintetizados (`efeitos/sons.ts`) | Provisórios bons; podem ser trocados por gravações próprias depois |
| Imagens dos flashcards | Reais, das questões do acervo (`public/imagens`), com a fonte |

## Como conferir

Servidor local (`VITE_SUPABASE_URL=sem npm run dev -- --port 5199`) e prints com Playwright nos tamanhos 1709×864, 1440×900, 1280×720, 390×844 e 360×780, cobrindo: alternativa selecionada, golpe, verso certo e errado, crítico, vitória, recompensas, troca de andar, chefe, pista, escudo, derrota e Estudo (frente e verso). Em 13/10/2026 nenhum tamanho teve erro de console nem rolagem horizontal da arena.
