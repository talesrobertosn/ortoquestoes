# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Residentes de ortopedia (R1 a R3) que se preparam para as provas teóricas da especialidade (TEOT e TARO) e
candidatos às provas de subespecialidade (Cirurgia da Mão, SBCM e SIMÃO). Estudam em rotina de hospital, com tempo
curto e cansaço no fim do dia: no celular entre um plantão e outro, no computador à noite. O trabalho deles é
responder questões de prova, entender o porquê de cada alternativa e voltar ao que erraram até acertar.

## Product Purpose

O Orto Questões reúne as questões oficiais das provas, comentadas como uma aula (a correta e cada alternativa errada),
e organiza o estudo em volta delas: treino por tema, revisão espaçada, caderno de erros, cronograma até a prova,
resumos dos capítulos que mais caem, flashcards, Atlas 3D e simulados. Sucesso é o residente chegar à prova tendo
visto e entendido o que cai, no ritmo que a rotina permite.

## Positioning

As questões são as das provas oficiais, cada uma com comentário completo e referência; os resumos foram feitos por
engenharia reversa (primeiro o que caiu, ano a ano, depois o texto na ordem da cobrança). O site é feito por uma pessoa
só (Tales), para a comunidade de ortopedia.

## Operating Context

- Sessões curtas no celular (barra inferior de navegação) e longas no computador.
- Tema claro e escuro; a parte pintada do site segue a hora do dia (manhã, pôr do sol, noite).
- Instagram (@ortoquestoes): feed e stories com uma questão real comentada; o perfil leva ao site.
- E-mails escritos como carta do Tales: só texto, gentis e formais.

## Capabilities and Constraints

- React + Vite + TypeScript; rotas por hash; cada página carregada sob demanda; precisa ser leve no celular.
- Todas as funções de uma tela continuam quando o visual muda; nomes de botões e títulos são os nomes reais do site
  (Treinar, Revisão, Resumos...); fantasia só na arte.
- Conteúdo médico vem sempre do acervo (questão e comentário reais, com id); nada inventado.
- Publicação só com o OK do Tales, depois de prints no celular e no computador, claro e escuro.

## Brand Commitments

- Nome por extenso: **Orto Questões**. Símbolo: ladrilho verde com três alternativas e a certa em dourado
  (`src/marca/Simbolo.tsx`, `public/marca/`).
- Sem emoji; não mencionar IA nos posts; não citar o número total de questões; não citar cursos preparatórios.
- Arte própria feita por código (pixel art HD-2D: cenários e o mascote esqueleto, modelo E); nada de imagem gerada
  por IA nem personagens de terceiros; sem desenho de anatomia em CSS/SVG (usar a imagem real da questão).
- Sem símbolos religiosos na decoração.
- Detalhes em `docs/marketing/orientacoes.md`, `.claude/skills/arte-hd2d/SKILL.md` e `CLAUDE.md`.

## Evidence on Hand

- Acervo de questões e comentários: `public/acervo/` (imagens em `public/imagens/`).
- Arte: `public/pixel/` (cenários HD-2D, mascote, fogo), emblemas em `public/emblemas/`.
- Modelos de post aprovados: `marketing/instagram/estilos/` e o kit `marketing/kit/`.
- Não há depoimentos, números de usuários nem resultados de aprovação documentados: não inventar.

## Product Principles

1. A questão real e o porquê vêm primeiro; o resto serve a elas.
2. Clareza para quem está cansado: nome real das coisas, um próximo passo óbvio.
3. A arte é o ponto forte e o que diferencia; a interface em volta dela é calma.
4. Nada se perde num redesenho: funções, números e regras ficam.
5. Gentileza no tom, sem pressão nem promessa vazia.

## Accessibility & Inclusion

Contraste mínimo de 4,5:1 no texto; foco visível; teclado; respeitar "menos animação"; arte com `aria-hidden` e texto
real ao lado; alvos de toque de 44 px.
