# Auditoria artística da Cripta do Residente (13/10/2026)

Pedido do Tales: comparar o que as PRs #216 e #217 realmente mudaram na tela,
com capturas reais e reproduzíveis, antes de produzir qualquer coisa nova.

## Como as capturas foram feitas

- Playwright, Chromium sem GPU (rasterização por software, SwiftShader).
- `Math.random` com semente fixa e `localStorage` limpo em todas as capturas.
- Gancho de desenvolvimento `__torneio.ir(andar, semente)`: leva a partida ao
  mesmo adversário, preparado pelo motor (vida real, sem valores inventados).
- Resoluções: 1400×860 (computador) e 390×844 a 2× (celular).
- Versão anterior às duas PRs: commit `e0de966`, servido numa cópia à parte.

**Sobre as capturas de 12/10 que mostravam `999/999`:** aquela vida foi um
valor de teste que eu mesmo coloquei no roteiro de captura para o inimigo não
cair durante a foto. Não acontece no jogo. As capturas novas usam a vida que o
motor dá ao adversário.

**Sobre as alternativas que apareciam como letras soltas (A, B, C, D):** são
de um flashcard real do acervo ("Genuvaro, genuvalgo e torções": "No defeito
femoral focal proximal, segundo Aitken, a pseudoartrose do colo é do tipo"),
cujas respostas são os tipos A a D de Aitken. O conteúdo está certo e não foi
alterado. Na tela, a letra sozinha fica pequena dentro de um botão largo; isso
é um problema de apresentação, tratado na Fase D.

## O que cada mudança foi de fato

| Componente | Antes (`e0de966`) | Depois (#216 + #217) | Natureza real da mudança | Problema restante | Próxima intervenção |
|---|---|---|---|---|---|
| Herói | Cavaleiro chibi 56×52 | Mesmo cavaleiro + 5 estágios | Estágios 2–3: troca de escudo e capa (detalhe pequeno). 4–6: armadura dourada, asas e auréola (redesenho parcial, a mesma base). | No tamanho real (84 px no celular), os estágios mal se distinguem; corpo sem volume | Herói com volume, silhueta e animações próprias (Fase B) |
| Inimigos | 7 arquétipos | 22 arquétipos, 46 inimigos | 15 arquétipos novos desenhados em código com retângulos, elipses e linhas; vários inimigos são o mesmo desenho com outra paleta (variantes) | Aparência geométrica, pouco detalhe, mesma lógica de desenho para todos | Pipeline novo de sprites com volume e luz; fatia vertical de 5 (Fase B) |
| Animação | 6 poses fixas | 6 poses fixas | Nenhuma mudança estrutural: o golpe é a mesma imagem deslocada | Sem quadros intermediários; braço, arma e cabeça não se movem | Folhas de animação com 4–6 quadros por ação (Fase B) |
| Cenários | 6 cenas | 16 cenas | Fundos e adereços novos, mas a mesa central (que ocupa ~60% da tela) é a mesma em todas, só muda a paleta | No jogo, os biomas parecem o mesmo lugar recolorido | Três arquiteturas de tabuleiro (mesa, chão integrado, plataforma) (Fase C) |
| Tabuleiro | Laje de pedra com elipse | Laje de pedra com elipse | Recolor por bioma | Igual em todos os combates | Fase C |
| Botões | Pílulas escuras | Pílulas com gradiente, borda dourada, selo no Atacar | Ajuste de gradiente, borda e sombra | Ainda parecem botões HTML | Design system com moldura desenhada, material e estados (Fase D) |
| Cartas | Moldura por raridade | Gema, cantoneiras e fitas de família | Pequenos detalhes | A lendária não parece lendária | Fase D |
| Efeitos | Projéteis e números | + raios, moedas, sopro, pausa de impacto | Efeitos novos reais (sopro e raio) | Todos os inimigos atacam com o mesmo tipo de projétil | Ataque próprio por arquétipo (Fase E) |
| Música | Síntese procedural | 11 temas novos + elite | Mesmo sintetizador e o mesmo gerador de melodia, com outros acordes, ritmo e timbre | Soam parecidas entre si | Trilha renderizada em arquivos, com instrumentação real (Fase E) |
| Desempenho | — | Cenário num canvas só, folha única por sprite | Ganho real e medido (11 → 55–60 quadros/s no celular parado) | No computador sem GPU, 20 quadros/s | Ver abaixo |

Classificação das mudanças visuais das duas PRs:

- **Recolor:** variantes de inimigos (acida, rainha, sombrio, alfa, escarlate,
  ancestral, mago, fíbula/tala/artrodese, nervo/necromante/arquiteto), mesa e
  partículas por bioma.
- **Troca de texto:** nomes de inimigos novos sobre arquétipos já existentes.
- **Mudança de fundo:** os 10 biomas novos (o fundo muda; a mesa, não).
- **Reaproveitamento de desenho:** estágios 2–6 do herói sobre a mesma base;
  quimera/escafoide/basilisco e espectro/necromante/arquiteto como variações.
- **Pequenos detalhes:** gema, cantoneiras e fitas das cartas; borda dos botões.
- **Redesenho estrutural verdadeiro:** composição única do cenário (desempenho),
  folha única de sprites, o Dragão de Ossos e o sopro de fogo.

## Métricas de partida

Medidas em 13/10/2026 com o roteiro `.medir-tmp.mjs` (FPS mediano pelo
intervalo entre quadros; p95 é a duração do quadro que só 5% superam).

| Situação | FPS mediano | p95 do quadro | Pior quadro | Memória JS | Canvases (visíveis) | Carregamento |
|---|---|---|---|---|---|---|
| Computador 1400×860, repouso | 20 | 117 ms | 117 ms | 30 MB | 11 (9) | 4,4 s |
| Computador, golpe | 20 | 83 ms | 117 ms | 28 MB | 11 (9) | — |
| Celular 390×844, CPU ÷4, repouso | 60 | 33 ms | 67 ms | 24 MB | 11 (7) | 3,2 s |
| Celular, CPU ÷4, golpe | 60 | 50 ms | 433 ms | 25 MB | 11 (7) | — |
| Celular, CPU ÷4, golpe inimigo | 60 | 33 ms | 333 ms | 26 MB | 11 (7) | — |

Leitura honesta:

- **Computador, 20 quadros/s:** a thread principal fica ocupada só 415 ms a
  cada 3 s (14%). O teto vem da composição por software deste ambiente (sem
  GPU), que paga por pixel cada camada grande. Uma página vazia no mesmo
  ambiente roda a 60. Desligar todas as animações CSS sobe para 60, e tirar o
  canvas de ambiente ou a mesa sobe para 30. Ou seja: há camadas grandes sendo
  recompostas a cada quadro. Numa GPU real isso custa muito menos, mas é
  desperdício e vou reduzir.
- **Celular com CPU ÷4:** 60 quadros/s em repouso, mas a thread principal fica
  ocupada 62% do tempo (1,9 s a cada 3 s). Há picos de 333–433 ms no começo do
  golpe: trava perceptível, a corrigir.
- O carregamento (3–4 s) é do servidor de desenvolvimento; o do site
  publicado ainda não foi medido.

## Primeira rodada de redesenho (13/10/2026)

Relatório visual com antes e depois, notas de 0 a 5 e as faixas para ouvir:
artefato "Revisão de Arte da Cripta" (link no PR).

| Componente | O que mudou | Arquivos |
|---|---|---|
| Personagens | Motor em volume: modelo 3D por esqueleto, luz, sombra, oclusão, paleta e contorno; folhas com 6 animações | `scripts/sprites/`, `public/flashcards/sprites/`, `src/flashcards/efeitos/assados.ts`, `Hud.tsx` |
| Herói | 6 estágios com equipamento diferente; estágio 1 fiel ao original aprovado | `scripts/sprites/heroi.py` |
| Tabuleiros | Mesa física com espessura, chão integrado e plataforma suspensa, por bioma | `src/flashcards/efeitos/tabuleiros.ts` |
| Controles | Placas forjadas em 9 partes e medalhões em SVG, estados por material | `src/estilos/ui/`, `Flashcards.css` |
| Cartas | Cantoneiras por raridade, luz na moldura, faíscas e entrada da lendária | `Cartao.tsx`, `Flashcards.css` |
| Golpes | Dez estilos de ataque por arquétipo | `src/flashcards/efeitos/ataques.ts` |
| Trilha | Dez faixas orquestrais originais renderizadas em mp3 | `scripts/musica/`, `public/flashcards/musica/`, `sons.ts` |

Métricas depois (mesmo roteiro): celular com CPU ÷4 mantém 60 quadros/s; o pior
quadro no golpe do herói caiu de 433 para 117 ms e, no golpe do adversário, de
333 para 167 ms. O computador segue em 20 quadros/s neste ambiente sem GPU
(thread principal ocupada 14%).

## Segunda rodada (13/10/2026)

Os pontos pendentes da primeira rodada, menos a expansão para os outros
inimigos (espera aprovação do padrão).

| Componente | O que mudou | Arquivos |
|---|---|---|
| Herói | Olhos azuis com brilho, sobrancelhas, cabelo emoldurando o rosto; o resto igual | `scripts/sprites/heroi.py` |
| Golem | Gesso mais claro, trincas luminosas mais largas (contraste no celular) | `scripts/sprites/golem.py` |
| Dragão de Ossos | Membrana com borda rasgada, nervuras e dobras pintadas | `scripts/sprites/dragao.py` |
| Mesa (tipo A) | Tábuas no Salão e no Arquivo; facetas de cristal no Laboratório | `src/flashcards/efeitos/pintura.ts` |
| Alternativas | Respostas de até 4 caracteres (tipos de Aitken, números) em destaque grande | `Arena.tsx`, `Flashcards.css` |
| Recompensas | Fita dentro da carta (antes era cortada), cantoneiras por raridade, título numa linha no celular | `Arena.tsx`, `Flashcards.css` |
| Painéis | Moldura forjada em SVG: bronze (adversário), ouro (chefe), aço (herói) | `src/estilos/ui/painel-*.svg`, `Flashcards.css` |

Defeitos antigos corrigidos de passagem: barra de vida e sequência saindo do
painel do herói no celular; mandíbula do Dragão sobre o selo de Chefe; parte
de baixo da plataforma suspensa sobre o painel do herói.

## Etapa 1 da direção criativa (13/10/2026)

Relatório visual com antes e depois na mesma resolução, estados das alternativas
e os cenários pintados: artefato "Cripta: Etapa 1" (link no PR).

| Componente | Natureza | O que mudou | Arquivos |
|---|---|---|---|
| Floresta das Fises Antigas (andar 1, cena `campo`) | Redesenho | Cena pintada offline: raízes em leque radial, pé dos troncos sem linha reta, musgo em listras, copa com cachos, horizonte irregular | `scripts/cenarios/floresta.py`, `public/flashcards/cenarios/` |
| Tabuleiro da clareira | Redesenho | Anel de pedras com musgo, raízes e cogumelos | `efeitos/tabuleiros.ts` |
| Partículas da floresta | Novo | Vaga-lumes, folhas caindo, borboletas | `efeitos/pintura.ts` |
| Alternativas 1 a 4 | Redesenho | Pergaminho em moldura de bronze rebitada, medalhão cunhado, 8 estados; grade 2×2 no computador; nada de partir palavra | `Flashcards.css` (bloco "Alternativas forjadas") |
| Biblioteca Ancestral (Estudo) | Redesenho | Cena pintada offline: estantes em perspectiva, janelão, tapete, candelabros | `scripts/cenarios/biblioteca.py` |
| Estudo | Redesenho e novo | Alternativas antes de virar (com interruptor), placas Errei/Hesitei/Sabia, painéis e filtros forjados | `Estudo.tsx`, `Flashcards.css` (bloco "Estudo forjado") |
| Celular deitado | Novo | Layout em três colunas no lugar do aviso "Gire o celular" | `Arena.tsx` (faixa `deitado`), `Flashcards.css` |

Testes: `npm test`, `npx tsc --noEmit`, `npm run build` e Playwright em 1400×860,
390×844 e 844×390, sem erro de console nem rolagem horizontal.

Desempenho (mesmo roteiro, Chromium sem GPU; celular com CPU ÷4):

| Situação | Antes | Depois |
|---|---|---|
| Computador, Batalha | 30 qps, p95 67 ms | 30 qps, p95 50 ms |
| Computador, Estudo | 30 qps, p95 50 ms | 30 qps, p95 50 ms |
| Celular, Batalha | 60 qps, p95 17 ms | 60 qps, p95 17 ms |
| Celular, Estudo | 60 qps, pior 50 ms | 60 qps, pior 17 ms |
| Memória JS (computador / celular) | 27 / 27 MB | 33 / 25 MB |

Ainda fraco:
- pontas das raízes parecidas entre si, e copa cortada no computador largo;
- pedras da clareira grandes demais em 3×;
- candelabros da biblioteca pequenos no retrato;
- barra de vida do herói curta no celular deitado;
- personagens ainda não mexidos (etapas 2 e 3).
