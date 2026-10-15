# Banco de assets dos posts

Tudo aqui já está no repositório e é da marca ou da questão. **Nada de imagem gerada por IA, foto de
banco de imagens ou figura baixada de terceiros.** Imagem médica: só a original da questão, inteira e
sem setas novas. Caminhos a partir da raiz do repositório (é assim que entram no JSON).

## Paleta

| Cor | Hex | Onde aparece |
|---|---|---|
| Verde da marca | `#14655E` | símbolo, fundo do ícone |
| Verde-noite | `#123A35`, `#05110F`, `#101D19` | fundos do Cupom, Treine grátis e Cofre |
| Dourado | `#F4CF7C` | a alternativa certa no símbolo, destaques `[[ ]]`, botões |
| Menta | `#7FD1BF`, `#8FD5BF` | etiquetas e rótulos em fundo escuro |
| Creme | `#FBF6EA`, `#FBF8EF` | cartões claros, papel térmico |
| Cinza de apoio | `#A9BBB7`, `#BAC8C2` | textos secundários em fundo escuro |
| Azul-petróleo | `#112D3B`, `#06121E` | Mecânica fina (stories) |
| Parede de consultório | `#E9E6DF` | Snellen |
| VAR | ouro `#FFD23F`, vermelho `#FF4D5A`, verde `#35E08A`, roxo `#5B3DF5`, noite `#0A1226` | VAR da questão |
| Vermelho e verde do teste de vista | `#E0533F`, `#4FAE6A` | Snellen, slide 5 |

Use as cores pelos modelos; não invente outra paleta num estilo aprovado.

## Fontes (`marketing/instagram/fontes/`, licença OFL)

| Fonte | Arquivo | Quando usar |
|---|---|---|
| Plus Jakarta Sans | `plus-jakarta-sans-latin-wght-normal.woff2` | títulos da marca (Cofre, Mecânica, VAR, Treine grátis) |
| Inter | `inter-latin-wght-normal.woff2` | corpo de texto em todos |
| Source Serif 4 | `source-serif-4-latin-opsz-*.woff2` | chamadas do Snellen e do Cupom |
| Playfair Display, Alegreya, Cinzel | `playfair-*`, `alegreya-*`, `cinzel-*` | jornal, museu, cartaz (estilos antigos) |
| Caveat | `caveat-latin-wght-normal.woff2` | anotação à mão (caderno, Cronograma) |
| Pixelify Sans, Jersey 10 | `pixelify-*`, `jersey-*` | pixel art (ranking, jogo de cartas) |
| DejaVu Sans Mono | fonte do sistema | papel térmico do Cupom |

## Marca

| Asset | Caminho | Quando usar |
|---|---|---|
| Símbolo (três alternativas, a certa em dourado) | `public/marca/simbolo.svg` | já embutido em todos os modelos do kit (`modelos/base.js`); não redesenhar |
| Marca horizontal | `public/marca/marca-horizontal.svg` | rodapé ou capa de material novo |
| Marca empilhada | `public/marca/marca-empilhada.svg` | peça quadrada, perfil |
| Ícones do site | `public/icone-512.png`, `public/apple-touch-icon.png`, `public/favicon.svg` | só se precisar do ícone do aplicativo |
| Prévia do link | `public/previa-orto-questoes-coluna.jpg` | referência; não usar em post |

Nome sempre por extenso: **Orto Questões**. Nada de letra dentro de círculo.

## Mascote e pixel art (do site)

| Asset | Caminho | Quando usar |
|---|---|---|
| Herói (mascote) | `public/mascote/heroi-4.png`, `heroi-6.png` | posts de ranking, conquistas, gamificação |
| Ícones pixel das funções (128 px) | `public/pixel/treinar.png`, `revisao.png`, `desempenho.png`, `ranking.png`, `simulado.png`, `planos.png`, `relatorio.png`, `turma.png`, `liga.png` | propaganda de função, objeto simples (com moderação) |
| Emblemas (173) | `public/emblemas/*.png` | posts de conquistas, constância (ex.: `dias-30.png`, `fogueira.png`) |
| Arena do ranking | `public/ranking/arena.png`, `podio-*.png`, `guerreiro.png`, `chama.png`, `tocha.png` | ranking e liga |
| Flashcards (só "Flashcards" fora do jogo) | `public/flashcards/promo/*.png`, `public/flashcards/cenarios/*`, `public/flashcards/sprites/` | divulgação dos Flashcards |

## Ícones e texturas

- Ícones de linha (visto, seta, seta para baixo): `<template>` do modelo `modelos/treine-gratis.html`.
- Ícones do site em React: `src/componentes/Icone.tsx` e `IconePixel.tsx` (copiar o SVG, se precisar).
- Texturas são CSS dos próprios modelos: pontilhado, gramado do VAR, papel térmico com serrilha,
  porta de cofre e mostradores, parede do consultório. **Engrenagens, mostradores e linhas são decoração
  abstrata: nunca imitam osso, músculo, nervo ou vaso.**

## Imagens das questões

- Ficam em `public/imagens/<tema>/`. O caminho certo de cada questão vem no bloco `questao.imagens`
  (`node marketing/kit/questao.mjs <id>`); às vezes o arquivo tem o número de uma questão gêmea, e está certo.
- Imagem pequena (menos de 300 px de largura) fica borrada ampliada: o renderizador avisa. Prefira outra questão.
- Imagem em pé combina com o Cofre (moldura alta); imagem deitada ou quadrada combina com a Mecânica fina.

## Telas do site (para o Treine grátis)

As telas não ficam no git (`marketing/instagram/telas/`, gerada por `telas.mjs` com uma conta de exemplo).

```
npm run build && npx vite preview --port 4175          # num terminal
TEMA=escuro LARGURA=1100 ALTURA=688 ESCALA=2 node marketing/instagram/telas.mjs 'lap-NOME=questao/ID>LETRA@.cartao-questao'   # notebook
ESCONDER='.dp-heroi__sync' TEMA=escuro node marketing/instagram/telas.mjs 'cel-dados=dados@main'                               # celular
```

Cada captura vira `marketing/instagram/telas/t-NOME.png`. Rotas úteis: `dados` (desempenho), `revisao`,
`erros`, `cronograma`, `treinar`, `ranking`, `flashcards`. Toda tela leva "Tela ilustrativa".
Prints reais já no repositório (Flashcards, 13/10): `marketing/instagram/posts/2026-10-13-torneio-flashcards/prints/`
(`pc-*.jpg` para o notebook, `cel-*.jpg` para o celular).

## Modelos de referência

- Kit (parametrizados): `marketing/kit/modelos/*.html`.
- Originais aprovados e guias: `marketing/instagram/estilos/` (`ESTILOS.md`, `COFRE-E-MECANICA-FINA.md`,
  `SNELLEN-E-CUPOM.md`, `VAR-DA-QUESTAO.md`, `TREINE-GRATIS.md`).
