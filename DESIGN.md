---
name: Orto Questões
description: Questões oficiais de ortopedia comentadas como uma aula, com a arte em pixel HD-2D como assinatura.
colors:
  verdete: "#14655e"
  verdete-tinta: "#0f4f49"
  verdete-veu: "#e6efee"
  verdete-noite: "#0b3a35"
  porcelana: "#f1f3f2"
  superficie: "#ffffff"
  superficie-2: "#f7f9f8"
  traco: "#dce2e0"
  traco-forte: "#c3ccc9"
  grafite: "#12181a"
  ardosia: "#5b686c"
  ouro-marca: "#f4cf7c"
  ouro-texto: "#7a5710"
  ouro-hd: "#f0c46a"
  tinta-pixel: "#1b1208"
  pergaminho: "#fbf3df"
  acerto: "#1f7a4d"
  erro: "#b3423a"
  aviso: "#9a6b12"
  escuro-porcelana: "#0f1413"
  escuro-superficie: "#171e1d"
  escuro-verdete: "#4fb3a5"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.2rem + 3vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.1rem + 1.6vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 650
    lineHeight: 1.35
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    letterSpacing: "0.08em"
  numeral-pixel:
    fontFamily: "Jersey 10, Pixelify Sans, monospace"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1
  reading-serif:
    fontFamily: "Iowan Old Style, Charter, Georgia, serif"
    fontSize: "1.125rem"
    lineHeight: 1.7
rounded:
  sm: "4px"
  controle: "10px"
  cartao: "16px"
  pixel: "6px"
  pill: "999px"
spacing:
  e-1: "4px"
  e-2: "8px"
  e-3: "12px"
  e-4: "16px"
  e-5: "24px"
  e-6: "32px"
  e-7: "40px"
  e-8: "48px"
components:
  button-primary:
    backgroundColor: "{colors.verdete}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.controle}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.verdete-tinta}"
  button-secondary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.grafite}"
    rounded: "{rounded.controle}"
    height: "44px"
  button-gold:
    backgroundColor: "{colors.ouro-marca}"
    textColor: "{colors.tinta-pixel}"
    rounded: "{rounded.controle}"
  card:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.grafite}"
    rounded: "{rounded.cartao}"
    padding: "24px"
  card-pixel:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.pixel}"
    padding: "20px"
  chip:
    backgroundColor: "{colors.verdete-veu}"
    textColor: "{colors.verdete-tinta}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  hero:
    backgroundColor: "{colors.verdete-noite}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.cartao}"
  speech-bubble:
    backgroundColor: "{colors.pergaminho}"
    textColor: "{colors.tinta-pixel}"
    rounded: "{rounded.controle}"
---

# DESIGN.md — Orto Questões

> Fonte da verdade visual do site e dos posts. Leia antes de qualquer trabalho visual (tela, componente, post, banner).
> Tokens reais em `src/estilos/tokens.css` (e `temporada.css`, `paginas/InicioHd.css`); este arquivo descreve como
> usá-los. Produto e público: `PRODUCT.md`. Ferramentas e fluxo: `docs/design/FERRAMENTAS.md` e `docs/design/WORKFLOW.md`.

## Overview

**Estrela-guia: "Atlas de estudo iluminado".** Uma publicação médica sóbria (o texto, a questão, o porquê) emoldurando
uma arte de jogo pintada à mão por código. Duas camadas, cada uma no seu papel:

1. **A página (editorial e calma):** porcelana e branco, verdete como cor de ação, grafite no texto, um dourado de
   assinatura usado com parcimônia. Tipografia de sistema no corpo, Plus Jakarta Sans nos títulos de destaque.
   Hierarquia por tamanho e peso, não por caixas.
2. **A arte (HD-2D):** cenários em pixel art com luz calculada, o mascote esqueleto (modelo E), o fogo da sequência,
   emblemas. É a única fonte de cor intensa e de ilustração. Fica dentro de molduras (topo de página, janela, miniatura),
   nunca espalhada como decoração.

Hoje o site tem três dialetos que este documento organiza: a **base** (porcelana e verdete), a **temporada pixel**
(cartões de borda firme e sombra de degrau, números na Jersey 10, em Treinar, Cronograma, Desempenho e Admin) e o
**mundo HD-2D** (vidro escuro com filete dourado e losangos, na página inicial e nos topos pintados). Trabalho novo
usa a base; a temporada pixel e o HD-2D entram só onde já moram ou onde a arte é o assunto.

Ideia em estudo (não aplicada): interface monocromática estilo shadcn com a arte como única cor —
`docs/design/ideias/2026-10-31-shadcn-hd2d/`.

## Colors

- **Verdete `#14655e`** (escuro: `#4fb3a5`): a cor de ação. Botão principal, link, item ativo, foco. Uma área de
  verdete cheio por tela, no máximo; o véu `#e6efee` é para seleção.
- **Verde-noite `#0b3a35`**: faixas de destaque (heróis, fundo dos posts escuros). Texto claro por cima.
- **Porcelana `#f1f3f2` / Superfície `#ffffff` / Superfície-2 `#f7f9f8`**: o papel. Fundo, cartão, área recuada.
- **Grafite `#12181a` / Ardósia `#5b686c`**: texto principal e secundário (ardósia passa 4,5:1 no branco).
- **Ouro de marca `#f4cf7c`**: a "alternativa certa" do símbolo. Selos, numerais, destaque raro. Em texto sobre fundo
  claro use **`#7a5710`** (ouro-texto). No mundo HD-2D o ouro é `#f0c46a` e a tinta é `#1b1208`.
- **Semânticos**: acerto `#1f7a4d`, erro `#b3423a`, aviso `#9a6b12`, só para resultado de resposta e estado, nunca
  decoração. Texto sobre eles usa as versões `-texto`.
- **Metais dos emblemas**: ouro `#a87a1f`, prata `#6f7d82`, bronze `#9a5b2e`, só em ranking e conquistas.
- **Escuro** é desenhado à parte (`:root[data-tema="escuro"]`): superfícies com leve viés verde, destaque mais claro.

## Typography

- **Corpo e interface:** fonte do sistema, 17px (1.0625rem), entrelinha 1.6, coluna de leitura até 76ch.
- **Títulos de destaque e marca:** Plus Jakarta Sans 700–800, tracking negativo (-0.02 a -0.04em), `text-wrap: balance`.
- **Rótulos:** 13px, peso 700, caixa alta com tracking +0.08em, em ardósia ou verdete.
- **Números de jogo:** Jersey 10 (selos, sequência, ranking), sempre grandes e curtos. Pixelify Sans só em títulos
  curtos do mundo de jogo. Nunca em parágrafo.
- **Leitura longa (resumos):** serifada de leitura (Iowan Old Style / Charter / Georgia), 18px, entrelinha 1.7.
- **Posts:** Plus Jakarta Sans 800 nos títulos, Inter no texto; Playfair e Caveat só quando o estilo do post pede.
- Escala: 13 / 15 / 17 / 20–24 / 32 / 40–52px. Não criar tamanhos fora dela.

## Layout

- Grade de 4px (`--e-1`…`--e-8`: 4, 8, 12, 16, 24, 32, 40, 48px). Seções separadas por 32–48px.
- Largura de conteúdo até ~72rem; texto corrido até 76ch.
- Celular primeiro: barra de navegação inferior, alvos de 44px, sem rolagem horizontal; testar em 390px.
- Composição editorial: um elemento dominante por tela, alinhamentos fortes à esquerda, respiro generoso. Evitar mosaico
  de cartões iguais; agrupar por espaço e linhas finas antes de criar caixa.
- Topos pintados: proporção 3:1 (paginas) ou 12:5 (inicial), foco da arte do centro para a direita, lado esquerdo calmo
  para o texto.

## Elevation & Depth

- Base: plana. Profundidade por tom (porcelana → branco) e borda de 1px `#dce2e0`; sombra média só em cartões que
  flutuam (`0 1px 2px` + `0 10px 28px` a 4–7%). No escuro, sombra vira contorno.
- Temporada pixel: sombra dura deslocada `5px 5px 0` (estrutural, "de jogo"), borda de 2px.
- HD-2D: vidro escuro com filete dourado interno e dois losangos nos cantos; brilho só na arte.

## Shapes

- Raios: 4px (pequeno), 10px (controle: botão, campo), 16px (cartão), 6px (cartão pixel), cápsula 999px (chips).
  Não inventar raios intermediários.
- Pixel art sempre com `image-rendering: pixelated` e escala inteira quando possível.
- Losango dourado é a marca do mundo HD-2D; não usar fora dele.

## Components

- **Botão principal:** verdete, texto branco, 44px de altura, raio 10px; hover verdete-tinta; desabilitado vira
  neutro legível (nunca texto apagado).
- **Botão secundário:** branco com borda; **botão dourado** só para assinatura e chamadas de plano.
- **Cartão:** branco, raio 16px, borda fina, padding 24px. Use só quando o conteúdo é um objeto (questão, resumo);
  listas e textos ficam soltos na página.
- **Chip:** cápsula em verdete-véu.
- **Herói / faixa:** verde-noite com horizonte em pixels; texto claro.
- **Selo de número (temporada):** quadrado dourado com Jersey 10 e sombra em degrau.
- **Balão do mascote:** pergaminho `#fbf3df`, tinta `#1b1208`, contorno de 2px e ponta.
- **Questão:** enunciado em corpo 17px, alternativas como linhas clicáveis com letra; resultado com cor semântica.
- **Mascote:** `<Mascote />` (pixel, modelo E); só onde tem papel (guia, dica, reação), nunca enfeite.

## Do's and Don'ts

**Faça**
- Comece pelo conteúdo real (questão, comentário, número) e deixe a hierarquia tipográfica fazer o trabalho.
- Use a arte HD-2D como imagem com moldura e papel claro; a interface em volta, calma.
- Mantenha um destaque de cor por bloco; verdete para agir, ouro para celebrar.
- Prints no celular e no computador, claro e escuro, antes de qualquer entrega.

**Não faça**
- Mosaico de cartões iguais, ícone-em-círculo + título + texto repetido, "bento" sem motivo.
- Gradiente decorativo na interface (gradiente só dentro da arte ou para luz da cena).
- Glassmorphism fora do mundo HD-2D; sombras coloridas; brilho em texto.
- Fonte pixel em parágrafo; mais de dois pesos por bloco; tamanhos fora da escala.
- Emoji, imagem gerada por IA, desenho de anatomia em CSS/SVG, símbolos religiosos.
- Trocar nomes reais por fantasia ("Mapa do reino" no lugar de "Treinar por tema").

## Instagram

Padrões de formato, grade e tipografia dos posts: `docs/design/INSTAGRAM.md`.
